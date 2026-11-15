import { GIFEncoder, applyPalette, quantize } from 'gifenc';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
};

const video = $<HTMLVideoElement>('video');
const drop = $<HTMLButtonElement>('drop');
const file = $<HTMLInputElement>('file');
const editor = $<HTMLDivElement>('editor');
const output = $<HTMLDivElement>('out');
const bar = $<HTMLDivElement>('bar');
const progress = bar.firstElementChild;
const status = $<HTMLElement>('status');
const go = $<HTMLButtonElement>('go');
if (!(progress instanceof HTMLElement)) throw new Error('missing progress');
const barFill = progress;

let srcName = 'video';
let videoUrl = '';
let gifUrl = '';
let job = 0;

class Cancelled extends Error {}

function frameCount(start: number, end: number, fps: number) {
  // 0.1 秒步进在二进制里常比整数略小，直接 floor 会丢掉最后一帧。
  return Math.max(0, Math.ceil((end - start) * fps - 1e-6));
}

const load = (next: File) => {
  job += 1;
  go.disabled = false;
  srcName = next.name.replace(/\.[^.]+$/, '') || 'video';
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  videoUrl = URL.createObjectURL(next);
  video.src = videoUrl;
  editor.classList.remove('gif-hidden');
  output.classList.add('gif-hidden');
  bar.classList.add('gif-hidden');
  barFill.style.width = '0';
  status.textContent = '';
  video.onloadedmetadata = () => {
    $<HTMLInputElement>('start').value = '0';
    $<HTMLInputElement>('end').value = Math.min(video.duration, 3).toFixed(1);
    $<HTMLInputElement>('width').value = String(
      Math.min(video.videoWidth || 480, 480),
    );
    status.textContent = `视频时长 ${video.duration.toFixed(1)} 秒，分辨率 ${video.videoWidth}×${video.videoHeight}`;
  };
};

drop.addEventListener('click', () => file.click());
drop.addEventListener('dragover', (event) => {
  event.preventDefault();
  drop.classList.add('is-over');
});
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
drop.addEventListener('drop', (event) => {
  event.preventDefault();
  drop.classList.remove('is-over');
  const next = event.dataTransfer?.files[0];
  if (next) load(next);
});
file.addEventListener('change', () => {
  if (file.files?.[0]) load(file.files[0]);
});

$<HTMLButtonElement>('setStart').addEventListener('click', () => {
  $<HTMLInputElement>('start').value = video.currentTime.toFixed(1);
});
$<HTMLButtonElement>('setEnd').addEventListener('click', () => {
  $<HTMLInputElement>('end').value = video.currentTime.toFixed(1);
});

const toDataURL = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

type SavePicker = (options: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

async function saveGif(blob: Blob, fname: string) {
  const tip = $<HTMLElement>('dlTip');
  const picker = (window as Window & { showSaveFilePicker?: SavePicker })
    .showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: fname,
        types: [{ description: 'GIF 图片', accept: { 'image/gif': ['.gif'] } }],
      });
      const writer = await handle.createWritable();
      await writer.write(blob);
      await writer.close();
      tip.textContent = '已保存 ✅';
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fname;
  document.body.append(link);
  link.click();
  link.remove();
  tip.textContent =
    '如果还是没开始下载，点“在新窗口打开”，再在图片上右键选“图片另存为”。';
}

const seek = (time: number, token: number) =>
  new Promise<void>((resolve, reject) => {
    if (token !== job) {
      reject(new Cancelled());
      return;
    }
    let settled = false;
    const finish = (done: () => void) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('emptied', onStop);
      window.clearTimeout(timer);
      done();
    };
    const onSeeked = () =>
      finish(() => (token === job ? resolve() : reject(new Cancelled())));
    const onStop = () => finish(() => reject(new Cancelled()));
    const timer = window.setTimeout(
      () => finish(() => reject(new Cancelled())),
      5000,
    );
    if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) {
      finish(() => resolve());
      return;
    }
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('emptied', onStop);
    try {
      video.currentTime = time;
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Cancelled()));
    }
  });

go.addEventListener('click', async () => {
  const start = Math.max(0, +$<HTMLInputElement>('start').value);
  const end = Math.min(video.duration || 0, +$<HTMLInputElement>('end').value);
  const fps = Math.max(
    1,
    Math.min(30, +$<HTMLInputElement>('fps').value || 10),
  );
  const speed = Math.max(0.25, +$<HTMLInputElement>('speed').value || 1);
  let width = Math.round(+$<HTMLInputElement>('width').value);
  if (!Number.isFinite(width)) width = 480;
  width = Math.min(1920, Math.max(50, width));
  if (!video.videoWidth || !video.videoHeight) {
    status.textContent = '视频还没准备好，请稍后再试';
    return;
  }
  if (end <= start) {
    status.textContent = '结束时间要大于开始时间';
    return;
  }
  const height = Math.max(
    1,
    Math.round((width * video.videoHeight) / video.videoWidth),
  );
  const total = frameCount(start, end, fps);
  if (total < 1) {
    status.textContent = '选取的时间太短，至少需要一帧';
    return;
  }
  if (
    total > 600 &&
    !confirm(`将生成 ${total} 帧，可能比较慢、文件较大，继续吗？`)
  )
    return;

  const token = ++job;
  go.disabled = true;
  bar.classList.remove('gif-hidden');
  barFill.style.width = '0';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || token !== job) {
    if (token === job) {
      status.textContent = '当前浏览器不能绘制画面';
      go.disabled = false;
    }
    return;
  }
  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps / speed);
  video.pause();

  try {
    for (let i = 0; i < total; i++) {
      await seek(start + i / fps, token);
      if (token !== job) return;
      ctx.drawImage(video, 0, 0, width, height);
      const { data } = ctx.getImageData(0, 0, width, height);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, width, height, { palette, delay });
      barFill.style.width = ((i + 1) / total) * 100 + '%';
      status.textContent = `正在处理第 ${i + 1} / ${total} 帧…`;
    }
    if (token !== job) return;
    gif.finish();
    const blob = new Blob([gif.bytes()], { type: 'image/gif' });
    showResult(blob, `${srcName}.gif`, width, height, total);
    status.textContent = '完成！';
  } catch (error) {
    if (token === job && !(error instanceof Cancelled)) {
      status.textContent = '生成中断了，请再试一次';
    }
  } finally {
    if (token === job) go.disabled = false;
  }
});

function showResult(
  blob: Blob,
  fname: string,
  width: number,
  height: number,
  total: number,
) {
  if (gifUrl) URL.revokeObjectURL(gifUrl);
  gifUrl = URL.createObjectURL(blob);
  output.replaceChildren();
  const img = document.createElement('img');
  img.src = gifUrl;
  img.alt = 'GIF 预览';
  const download = document.createElement('button');
  download.type = 'button';
  download.id = 'dlBtn';
  download.className = 'gif-primary';
  download.textContent = `⬇ 下载 GIF（${(blob.size / 1024 / 1024).toFixed(2)} MB，${width}×${height}，${total} 帧）`;
  const open = document.createElement('button');
  open.type = 'button';
  open.id = 'openBtn';
  open.className = 'gif-secondary';
  open.textContent = '在新窗口打开';
  const tip = document.createElement('p');
  tip.id = 'dlTip';
  tip.className = 'gif-status';
  tip.textContent =
    '如果下载没反应，也可以在上面的图片上右键，选“图片另存为”。';
  output.append(img, download, open, tip);
  output.classList.remove('gif-hidden');
  download.addEventListener('click', () => saveGif(blob, fname));
  open.addEventListener('click', async () => {
    const popup = window.open('', '_blank');
    const dataUrl = await toDataURL(blob);
    if (popup) {
      popup.document.title = fname;
      const image = popup.document.createElement('img');
      image.src = dataUrl;
      image.alt = fname;
      popup.document.body.append(image);
    } else {
      location.href = dataUrl;
    }
  });
}
