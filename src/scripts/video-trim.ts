import { saveBlob } from './save-file';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
};

const drop = $<HTMLButtonElement>('drop');
const file = $<HTMLInputElement>('file');
const editor = $<HTMLDivElement>('editor');
const video = $<HTMLVideoElement>('video');
const output = $<HTMLDivElement>('out');
const bar = $<HTMLDivElement>('bar');
const progress = bar.firstElementChild;
const status = $<HTMLElement>('status');
const go = $<HTMLButtonElement>('go');
if (!(progress instanceof HTMLElement)) throw new Error('missing progress');
const barFill = progress;

class Cancelled extends Error {}

let srcName = 'video';
let videoUrl = '';
let outUrl = '';
let job = 0;

function read(id: string) {
  const value = Number($<HTMLInputElement>(id).value);
  return Number.isFinite(value) ? value : 0;
}

function even(value: number) {
  const next = Math.max(2, Math.round(value));
  return next % 2 === 0 ? next : next - 1;
}

function seekTo(time: number, token: number) {
  return new Promise<void>((resolve, reject) => {
    if (token !== job) {
      reject(new Cancelled());
      return;
    }
    if (Math.abs(video.currentTime - time) < 0.001) {
      resolve();
      return;
    }
    const finish = (fn: () => void) => {
      video.removeEventListener('seeked', onSeek);
      video.removeEventListener('error', onStop);
      window.clearTimeout(timer);
      fn();
    };
    const onSeek = () => finish(resolve);
    const onStop = () =>
      finish(() => reject(token === job ? new Error('seek') : new Cancelled()));
    const timer = window.setTimeout(
      () =>
        finish(() =>
          reject(token === job ? new Error('seek-timeout') : new Cancelled()),
        ),
      5000,
    );
    video.addEventListener('seeked', onSeek);
    video.addEventListener('error', onStop);
    video.currentTime = Math.min(
      Math.max(time, 0),
      Math.max(video.duration - 0.001, 0),
    );
  });
}

function sizeOf(targetWidth: number) {
  const width = even(
    Math.min(1920, Math.max(16, targetWidth || video.videoWidth || 640)),
  );
  const height = even(
    Math.round(
      (video.videoHeight || width) * (width / (video.videoWidth || width)),
    ),
  );
  return { width, height };
}

async function encodeFast(token: number, start: number, end: number) {
  if (!('VideoEncoder' in window)) throw new Error('no-webcodecs');
  const { Muxer, ArrayBufferTarget } = await import('webm-muxer');
  const fps = Math.min(30, Math.max(1, Math.round(read('fps') || 15)));
  const bitrate = Math.min(
    8_000_000,
    Math.max(50_000, Math.round(read('bitrate') * 1000)),
  );
  const { width, height } = sizeOf(read('width'));
  const frames = Math.max(1, Math.ceil((end - start) * fps - 1e-6));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('无法创建画布');
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'V_VP8', width, height, frameRate: fps },
    firstTimestampBehavior: 'offset',
  });
  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encodeError = error;
    },
  });
  const config: VideoEncoderConfig = {
    codec: 'vp8',
    width,
    height,
    bitrate,
    framerate: fps,
    latencyMode: 'quality',
    hardwareAcceleration: 'prefer-software',
  };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) throw new Error('no-vp8');
  encoder.configure(config);
  const duration = Math.round(1_000_000 / fps);
  try {
    for (let i = 0; i < frames; i++) {
      if (token !== job) throw new Cancelled();
      if (encodeError) throw encodeError;
      await seekTo(start + i / fps, token);
      ctx.drawImage(video, 0, 0, width, height);
      const frame = new VideoFrame(canvas, {
        timestamp: i * duration,
        duration,
      });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 8) {
        await new Promise<void>((resolve) =>
          encoder.addEventListener('dequeue', () => resolve(), { once: true }),
        );
      }
      barFill.style.width = Math.round(((i + 1) / frames) * 100) + '%';
      if (i % 4 === 0)
        await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    await encoder.flush();
    if (encodeError) throw encodeError;
    muxer.finalize();
    return new Blob([target.buffer], { type: 'video/webm' });
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}

function recordLive(token: number, start: number, end: number, strip: boolean) {
  const fps = Math.min(30, Math.max(1, Math.round(read('fps') || 15)));
  const bitrate = Math.min(
    8_000_000,
    Math.max(50_000, Math.round(read('bitrate') * 1000)),
  );
  const { width, height } = sizeOf(read('width'));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return Promise.reject(new Error('无法创建画布'));
  const canvasStream = canvas.captureStream(fps);
  const media = video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
  };
  const tracks = [...canvasStream.getVideoTracks()];
  if (!strip && media.captureStream) {
    tracks.push(...media.captureStream().getAudioTracks());
  }
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
    ? 'video/webm;codecs=vp8'
    : 'video/webm';
  const recorder = new MediaRecorder(new MediaStream(tracks), {
    mimeType: mime,
    videoBitsPerSecond: bitrate,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      video.pause();
      fn();
    };
    recorder.onstop = () =>
      finish(() => resolve(new Blob(chunks, { type: 'video/webm' })));
    recorder.onerror = () => finish(() => reject(new Error('录制失败')));
    const draw = () => {
      if (settled) return;
      if (token !== job) {
        if (recorder.state !== 'inactive') recorder.stop();
        finish(() => reject(new Cancelled()));
        return;
      }
      ctx.drawImage(video, 0, 0, width, height);
      const span = Math.max(end - start, 0.001);
      barFill.style.width =
        Math.round((Math.min(video.currentTime - start, span) / span) * 100) +
        '%';
      if (video.currentTime >= end || video.ended) {
        if (recorder.state !== 'inactive') recorder.stop();
        return;
      }
      requestAnimationFrame(draw);
    };
    void seekTo(start, token)
      .then(() => {
        video.muted = strip;
        recorder.start(200);
        void video.play();
        draw();
      })
      .catch((error: unknown) => finish(() => reject(error)));
  });
}

function show(blob: Blob) {
  if (outUrl) URL.revokeObjectURL(outUrl);
  outUrl = URL.createObjectURL(blob);
  output.classList.remove('gif-hidden');
  output.replaceChildren();
  const view = document.createElement('video');
  view.controls = true;
  view.playsInline = true;
  view.src = outUrl;
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'gif-primary';
  save.textContent = '下载 WebM';
  const filename = srcName + '.webm';
  save.addEventListener('click', () => {
    void saveBlob(blob, filename, 'WebM 视频', 'video/webm', '.webm').then(
      (result) => {
        if (result === 'saved') status.textContent = '已保存';
        if (result === 'downloaded') status.textContent = '已开始下载';
      },
    );
  });
  output.append(view, save);
}

async function exportClip() {
  const start = Math.max(0, read('start'));
  const end = Math.min(read('end') || video.duration, video.duration);
  if (!(end > start)) {
    status.textContent = '结束时间要晚于开始时间。';
    return;
  }
  const fps = Math.min(30, Math.max(1, Math.round(read('fps') || 15)));
  const frames = Math.ceil((end - start) * fps - 1e-6);
  if (frames > 900 && !window.confirm('大约要编码 ' + frames + ' 帧，继续吗？'))
    return;
  const token = ++job;
  const strip = $<HTMLInputElement>('strip').checked;
  go.disabled = true;
  bar.classList.remove('gif-hidden');
  barFill.style.width = '0';
  output.classList.add('gif-hidden');
  status.textContent = strip ? '正在本地编码，不含音轨…' : '正在按原速录制…';
  try {
    const blob = strip
      ? await encodeFast(token, start, end).catch(async (error: unknown) => {
          if (error instanceof Cancelled || token !== job) throw error;
          status.textContent = '快速编码不可用，改为按原速录制…';
          return recordLive(token, start, end, true);
        })
      : await recordLive(token, start, end, false);
    if (token !== job) return;
    show(blob);
    status.textContent =
      '完成，' +
      Math.round(blob.size / 1024) +
      ' KB。' +
      (strip ? '已去掉音轨。' : '已尝试保留音轨。');
  } catch (error) {
    if (token === job && !(error instanceof Cancelled)) {
      bar.classList.add('gif-hidden');
      status.textContent = '导出中断了，请再试一次';
    }
  } finally {
    if (token === job) {
      go.disabled = false;
      video.muted = true;
    }
  }
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
    $<HTMLInputElement>('end').value = Math.min(video.duration || 0, 3).toFixed(
      1,
    );
    $<HTMLInputElement>('width').value = String(
      Math.min(video.videoWidth || 640, 640),
    );
    status.textContent =
      '视频时长 ' +
      video.duration.toFixed(1) +
      ' 秒，分辨率 ' +
      video.videoWidth +
      '×' +
      video.videoHeight;
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
go.addEventListener('click', () => void exportClip());
