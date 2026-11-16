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
let audioCtx: AudioContext | null = null;
let audioTap: {
  dest: MediaStreamAudioDestinationNode;
  preview: GainNode;
} | null = null;

function primeAudio() {
  try {
    if (!('AudioContext' in window)) return Promise.resolve(false);
    if (!audioCtx) audioCtx = new AudioContext();
  } catch {
    return Promise.resolve(false);
  }
  const ctx = audioCtx;
  return ctx
    .resume()
    .then(() => ctx.state === 'running')
    .catch(() => false);
}

function tapAudio() {
  if (audioTap) return audioTap;
  if (!audioCtx || audioCtx.state !== 'running') return null;
  const source = audioCtx.createMediaElementSource(video);
  const preview = audioCtx.createGain();
  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);
  source.connect(preview);
  preview.connect(audioCtx.destination);
  audioTap = { dest, preview };
  return audioTap;
}

function captureOf() {
  const media = video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
  };
  try {
    return media.captureStream?.() ?? null;
  } catch {
    return null;
  }
}

function audioEvidence(stream: MediaStream | null) {
  const media = video as HTMLVideoElement & {
    mozHasAudio?: boolean;
    webkitAudioDecodedByteCount?: number;
    audioTracks?: { length: number };
  };
  if (typeof media.mozHasAudio === 'boolean') return media.mozHasAudio;
  if ((media.webkitAudioDecodedByteCount ?? 0) > 0) return true;
  if (media.audioTracks && media.audioTracks.length > 0) return true;
  if (stream?.getAudioTracks().some((track) => track.readyState !== 'ended'))
    return true;
  return null;
}

function sourceHasAudio(token: number, stopped: () => boolean) {
  const stream = captureOf();
  if (audioEvidence(stream) === true) return Promise.resolve(true);
  const media = video as HTMLVideoElement & { mozHasAudio?: boolean };
  if (media.mozHasAudio === false) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    let saw = false;
    const onAdd = (event: MediaStreamTrackEvent) => {
      if (event.track.kind === 'audio') saw = true;
    };
    stream?.addEventListener('addtrack', onAdd);
    const finish = (value: boolean) => {
      stream?.removeEventListener('addtrack', onAdd);
      video.pause();
      resolve(value);
    };
    video.muted = true;
    void video.play().then(
      () => {
        const deadline = performance.now() + 600;
        const tick = () => {
          if (stopped() || token !== job) {
            finish(false);
            return;
          }
          if (saw || audioEvidence(captureOf()) === true) {
            finish(true);
            return;
          }
          if (performance.now() >= deadline) {
            finish(false);
            return;
          }
          window.setTimeout(tick, 40);
        };
        tick();
      },
      () => finish(audioEvidence(stream) === true),
    );
  });
}

function recorderMime(hasAudio: boolean) {
  const candidates = hasAudio
    ? ['video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

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
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onStop);
      window.clearTimeout(timer);
      fn();
    };
    const onReady = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
        finish(resolve);
    };
    const onStop = () =>
      finish(() => reject(token === job ? new Error('seek') : new Cancelled()));
    const timer = window.setTimeout(
      () =>
        finish(() =>
          reject(token === job ? new Error('seek-timeout') : new Cancelled()),
        ),
      5000,
    );
    video.addEventListener('seeked', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onStop);
    const duration = Number.isFinite(video.duration) ? video.duration : time;
    const target = Math.min(Math.max(time, 0), Math.max(duration - 0.001, 0));
    if (Math.abs(video.currentTime - target) < 0.001) {
      onReady();
      return;
    }
    video.currentTime = target;
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
  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encodeError = error;
    },
  });
  const duration = Math.round(1_000_000 / fps);
  try {
    encoder.configure(config);
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
  // Resume during the click, before seek yields and the gesture expires.
  const audioReady = strip ? Promise.resolve(false) : primeAudio();
  return new Promise<{ blob: Blob; keptAudio: boolean; audible: boolean }>(
    (resolve, reject) => {
      let settled = false;
      let watchdog = 0;
      let recorder: MediaRecorder | null = null;
      let preview: GainNode | null = null;
      const previousVolume = video.volume;
      const chunks: Blob[] = [];
      const stopRecorder = () => {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      };
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(watchdog);
        video.pause();
        video.muted = true;
        video.volume = previousVolume;
        if (preview) preview.gain.value = 1;
        fn();
      };
      watchdog = window.setTimeout(
        () => {
          finish(() => reject(new Error('录制超时')));
          stopRecorder();
        },
        Math.max(8000, (end - start + 5) * 1000),
      );
      const draw = () => {
        if (settled) return;
        if (token !== job) {
          finish(() => reject(new Cancelled()));
          stopRecorder();
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const span = Math.max(end - start, 0.001);
        barFill.style.width =
          Math.round((Math.min(video.currentTime - start, span) / span) * 100) +
          '%';
        if (video.currentTime >= end || video.ended) {
          stopRecorder();
          return;
        }
        requestAnimationFrame(draw);
      };
      void seekTo(start, token)
        .then(async () => {
          if (token !== job) throw new Cancelled();
          const running = await audioReady;
          if (token !== job || settled) throw new Cancelled();
          const audible = strip
            ? false
            : await sourceHasAudio(token, () => settled);
          if (token !== job || settled) throw new Cancelled();
          await seekTo(start, token);
          let tap: ReturnType<typeof tapAudio> = null;
          if (audible && running) {
            try {
              tap = tapAudio();
            } catch {
              tap = null;
            }
          }
          preview = tap?.preview ?? null;
          if (preview) preview.gain.value = 0;
          const tracks = [...canvasStream.getVideoTracks()];
          if (audible && tap) tracks.push(...tap.dest.stream.getAudioTracks());
          else if (audible && media.captureStream) {
            tracks.push(
              ...media
                .captureStream()
                .getAudioTracks()
                .filter((track) => track.readyState === 'live'),
            );
          }
          const keptAudio =
            audible && tracks.length > canvasStream.getVideoTracks().length;
          const mime = recorderMime(keptAudio);
          try {
            recorder = new MediaRecorder(
              new MediaStream(tracks),
              mime
                ? {
                    mimeType: mime,
                    videoBitsPerSecond: bitrate,
                    ...(keptAudio ? { audioBitsPerSecond: 96_000 } : {}),
                  }
                : { videoBitsPerSecond: bitrate },
            );
          } catch (error) {
            finish(() =>
              reject(error instanceof Error ? error : new Error('录制失败')),
            );
            return;
          }
          recorder.ondataavailable = (event) => {
            if (event.data.size) chunks.push(event.data);
          };
          recorder.onstop = () =>
            finish(() =>
              resolve({
                blob: new Blob(chunks, { type: 'video/webm' }),
                keptAudio,
                audible,
              }),
            );
          recorder.onerror = () => finish(() => reject(new Error('录制失败')));
          // Play muted so Chrome still accepts play() after the seek. Unmute
          // once playback has started: a muted element makes captureStream and
          // the audio graph record silence.
          video.muted = true;
          if (keptAudio) video.volume = 1;
          recorder.start(200);
          try {
            await video.play();
          } catch (error) {
            finish(() =>
              reject(
                error instanceof Error ? error : new Error('无法播放视频'),
              ),
            );
            stopRecorder();
            return;
          }
          if (keptAudio) video.muted = false;
          draw();
        })
        .catch((error: unknown) => finish(() => reject(error)));
    },
  );
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
    let keptAudio = false;
    let audible = false;
    const blob = strip
      ? await encodeFast(token, start, end).catch(async (error: unknown) => {
          if (error instanceof Cancelled || token !== job) throw error;
          status.textContent = '快速编码不可用，改为按原速录制…';
          const clip = await recordLive(token, start, end, true);
          return clip.blob;
        })
      : await recordLive(token, start, end, false).then((clip) => {
          keptAudio = clip.keptAudio;
          audible = clip.audible;
          return clip.blob;
        });
    if (token !== job) return;
    show(blob);
    status.textContent =
      '完成，' +
      Math.round(blob.size / 1024) +
      ' KB。' +
      (strip
        ? '已去掉音轨。'
        : keptAudio
          ? '已保留音轨。'
          : audible
            ? '没能保留音轨，只导出了画面。'
            : '原视频没有音轨，只导出了画面。');
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
video.addEventListener('pointerdown', () => {
  if (audioCtx) void audioCtx.resume();
});
go.addEventListener('click', () => void exportClip());
