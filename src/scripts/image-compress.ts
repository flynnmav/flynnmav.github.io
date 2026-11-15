import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { downloadBlob, saveBlob } from './save-file';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
};

const drop = $<HTMLButtonElement>('drop');
const file = $<HTMLInputElement>('file');
const format = $<HTMLSelectElement>('format');
const quality = $<HTMLInputElement>('quality');
const qualityOut = $<HTMLOutputElement>('val-quality');
const edge = $<HTMLInputElement>('edge');
const stride = $<HTMLInputElement>('stride');
const go = $<HTMLButtonElement>('go');
const status = $<HTMLElement>('status');
const results = $<HTMLDivElement>('results');
const downloadAll = $<HTMLButtonElement>('download-all');

interface Item {
  name: string;
  before: number;
  blob: Blob;
  filename: string;
  url: string;
}

let items: Item[] = [];
let urls: string[] = [];
let pending: File[] = [];
let job = 0;

const EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function bytes(size: number) {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / 1024 / 1024).toFixed(2) + ' MB';
}

function isGif(next: File) {
  return next.type === 'image/gif' || next.name.toLowerCase().endsWith('.gif');
}

function fit(width: number, height: number) {
  const limit = Math.max(0, Number(edge.value) || 0);
  const cap = limit > 0 ? limit : 8192;
  const longest = Math.max(width, height);
  if (longest <= cap) return { width, height };
  const scale = cap / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建画布');
  return { canvas, ctx };
}

async function blobOf(canvas: HTMLCanvasElement, mime: string, q: number) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, q),
  );
  if (!blob) throw new Error('这个浏览器不能导出该格式');
  return blob;
}

function gifFromRgba(
  frames: {
    rgba: Uint8ClampedArray;
    width: number;
    height: number;
    delay: number;
  }[],
  colors: number,
) {
  const gif = GIFEncoder();
  frames.forEach((frame, index) => {
    const palette = quantize(frame.rgba, colors);
    const indexed = applyPalette(frame.rgba, palette);
    gif.writeFrame(indexed, frame.width, frame.height, {
      palette,
      delay: frame.delay,
      repeat: index === 0 ? 0 : undefined,
    });
  });
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

async function staticImage(next: File, mime: string, q: number) {
  const bitmap = await createImageBitmap(next);
  const size = fit(bitmap.width, bitmap.height);
  const { canvas, ctx } = canvasOf(size.width, size.height);
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size.width, size.height);
  }
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  if (mime !== 'image/gif') return blobOf(canvas, mime, q);
  const rgba = ctx.getImageData(0, 0, size.width, size.height).data;
  const colors = q >= 0.9 ? 256 : q >= 0.6 ? 128 : q >= 0.3 ? 64 : 32;
  return gifFromRgba(
    [{ rgba, width: size.width, height: size.height, delay: 100 }],
    colors,
  );
}

async function gifFrames(next: File, q: number) {
  if (typeof ImageDecoder === 'undefined')
    return staticImage(next, 'image/gif', q);
  const decoder = new ImageDecoder({
    data: await next.arrayBuffer(),
    type: 'image/gif',
  });
  try {
    await decoder.tracks.ready;
    const count = decoder.tracks.selectedTrack?.frameCount ?? 1;
    if (count < 1) throw new Error('GIF 没有帧');
    const keep = Math.max(1, Math.round(Number(stride.value) || 1));
    const colors = q >= 0.9 ? 256 : q >= 0.6 ? 128 : q >= 0.3 ? 64 : 32;
    const frames: {
      rgba: Uint8ClampedArray;
      width: number;
      height: number;
      delay: number;
    }[] = [];
    for (let i = 0; i < count; i += keep) {
      const result = await decoder.decode({ frameIndex: i });
      const frame = result.image;
      const size = fit(frame.displayWidth, frame.displayHeight);
      const { ctx } = canvasOf(size.width, size.height);
      ctx.drawImage(frame, 0, 0, size.width, size.height);
      const delay = Math.max(
        20,
        Math.round((frame.duration ?? 100000) / 1000) * keep,
      );
      frame.close();
      frames.push({
        rgba: ctx.getImageData(0, 0, size.width, size.height).data,
        width: size.width,
        height: size.height,
        delay,
      });
    }
    return gifFromRgba(frames, colors);
  } finally {
    decoder.close();
  }
}

async function convert(next: File) {
  const mime = format.value;
  const q = Math.min(1, Math.max(0.05, Number(quality.value) || 0.8));
  if (mime === 'image/gif' && isGif(next)) {
    try {
      return await gifFrames(next, q);
    } catch {
      return staticImage(next, mime, q);
    }
  }
  return staticImage(next, mime, q);
}

function render() {
  for (const url of urls) URL.revokeObjectURL(url);
  urls = [];
  results.replaceChildren();
  for (const item of items) {
    urls.push(item.url);
    const row = document.createElement('div');
    row.className = 'result-row';
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = '';
    const copy = document.createElement('div');
    copy.className = 'result-copy';
    const title = document.createElement('strong');
    title.textContent = item.name;
    const ratio = item.before
      ? Math.round((item.blob.size / item.before) * 100)
      : 0;
    const meta = document.createElement('div');
    meta.className = 'result-size';
    meta.textContent =
      bytes(item.before) + ' → ' + bytes(item.blob.size) + '（' + ratio + '%）';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gif-primary';
    button.textContent = '下载';
    button.addEventListener('click', () => {
      void saveBlob(
        item.blob,
        item.filename,
        '图片',
        item.blob.type,
        EXT[item.blob.type] ?? '.bin',
      );
    });
    copy.append(title, meta, button);
    row.append(img, copy);
    results.append(row);
  }
  downloadAll.classList.toggle('gif-hidden', items.length === 0);
}

async function run(files: File[]) {
  pending = files;
  const token = ++job;
  go.disabled = true;
  items = [];
  render();
  const mime = format.value;
  const ext = EXT[mime] ?? '.bin';
  try {
    for (let i = 0; i < files.length; i++) {
      if (token !== job) return;
      status.textContent = '正在处理 ' + (i + 1) + '/' + files.length + '…';
      const next = files[i];
      const blob = await convert(next);
      if (token !== job) return;
      const base = next.name.replace(/\.[^.]+$/, '') || 'image';
      items.push({
        name: next.name,
        before: next.size,
        blob,
        filename: base + ext,
        url: URL.createObjectURL(blob),
      });
      render();
    }
    status.textContent =
      '完成 ' + items.length + ' 张。处理都在本地，没有上传。';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : '处理失败';
  } finally {
    if (token === job) go.disabled = false;
  }
}

quality.addEventListener('input', () => {
  qualityOut.textContent = Number(quality.value).toFixed(2);
});
qualityOut.textContent = Number(quality.value).toFixed(2);
drop.addEventListener('click', () => file.click());
drop.addEventListener('dragover', (event) => {
  event.preventDefault();
  drop.classList.add('is-over');
});
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
drop.addEventListener('drop', (event) => {
  event.preventDefault();
  drop.classList.remove('is-over');
  const list = [...(event.dataTransfer?.files ?? [])];
  if (list.length) void run(list);
});
file.addEventListener('change', () => {
  if (file.files?.length) void run([...file.files]);
});
go.addEventListener('click', () => {
  const picked = pending.length ? pending : [...(file.files ?? [])];
  if (picked.length) void run(picked);
  else status.textContent = '先选择图片。';
});
downloadAll.addEventListener('click', () => {
  items.forEach((item, index) => {
    window.setTimeout(
      () => downloadBlob(item.blob, item.filename),
      index * 250,
    );
  });
});
