// Surface directions only. RGB seam detection owns the wall boundaries.
const MODEL_BASE = new URL('./models/moge/', import.meta.url);
const RUNTIME_BASE = new URL('./vendor/moge/', import.meta.url);
const CACHE_NAME = 'crux-moge-small-normal-v1';
const TOKENS = 1200;
let runtimePromise, queue = Promise.resolve();
const runtimeListeners=new Set();
let runtimeMessage;
function runtimeProgress(message){runtimeMessage=message;for(const listener of runtimeListeners)announce(listener,message);}
function followRuntime(progress){
 runtimeListeners.add(progress);if(runtimeMessage)announce(progress,runtimeMessage);
 return runtimePromise.finally(()=>runtimeListeners.delete(progress));
}
const frames = new Map();

export const MOGE_NORMAL_CONVENTION = 'opencv-camera-x-right-y-down-z-forward';

export function mogeInputSize(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1)
    throw new Error('Invalid photo dimensions');
  const scale = Math.min(1, 480 / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

// ONNX exports NHWC. This adapter's public frame is CHW, exactly as the facet fitter expects.
// Keep the raw camera axes. The upstream PNG visualization flips Y and Z; that is NOT geometry.
export function normalOutputToFrame(data, dims) {
  if (dims.length !== 4 || dims[0] !== 1 || dims[3] !== 3)
    throw new Error('Unexpected MoGe normal tensor shape');
  const height = dims[1], width = dims[2], n = width * height;
  if (data.length !== n * 3) throw new Error('Incomplete MoGe normal tensor');
  const normals = new Float32Array(n * 3);
  let valid = 0;
  for (let i = 0; i < n; i++) {
    const x = data[3 * i], y = data[3 * i + 1], z = data[3 * i + 2];
    const length = Math.hypot(x, y, z);
    if (!Number.isFinite(length) || length < 1e-6) continue;
    normals[i] = x / length; normals[n + i] = y / length; normals[2 * n + i] = z / length;
    valid++;
  }
  if (valid < n * .95) throw new Error('MoGe returned too few valid surface directions');
  return {status: 'ready', width, height, normals, layout: 'CHW',
    coordinateConvention: MOGE_NORMAL_CONVENTION, normalOrientation: 'camera-facing',
    model: 'MoGe-2 Small normal-only', tokens: TOKENS};
}

function unavailable(code, reason) { return {status: 'unavailable', code, reason}; }
function aborted(signal) { if (signal?.aborted) throw new DOMException('Photo processing cancelled', 'AbortError'); }
function announce(progress, message) { try { progress(message); } catch {} }
async function sha256(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

async function loadModelBytes(progress) {
  const response = await fetch(new URL('manifest.json', MODEL_BASE));
  if (!response.ok) throw new Error('Incline model manifest unavailable');
  const manifest = await response.json();
  if (!Number.isSafeInteger(manifest.bytes) || manifest.bytes < 1 || manifest.bytes > 200e6 || !manifest.chunks?.length)
    throw new Error('Invalid incline model manifest');
  const bytes = new Uint8Array(manifest.bytes);
  let offset = 0, cache;
  try { cache = await caches.open(CACHE_NAME); } catch { /* HTTP cache remains usable. */ }
  for (const chunk of manifest.chunks) {
    const url = new URL(chunk.file, MODEL_BASE), cached = await cache?.match(url).catch(() => undefined);
    let part, source = cached;
    if (source) {
      part = new Uint8Array(await source.arrayBuffer());
      if (part.length !== chunk.bytes || await sha256(part) !== chunk.sha256) {
        await cache?.delete(url).catch(() => {}); part = null;
      }
    }
    if (!part) {
      announce(progress, `Loading incline model (${Math.round(offset / 1e6)} / ${Math.round(manifest.bytes / 1e6)} MB)…`);
      source = await fetch(url, {cache: 'force-cache'});
      if (!source.ok) throw new Error('Incline model download unavailable');
      const reader = source.body?.getReader();
      if (reader) {
        part = new Uint8Array(chunk.bytes); let position = 0, last = -1;
        while (true) {
          const {done, value} = await reader.read(); if (done) break;
          if (position + value.length > part.length) { await reader.cancel(); throw new Error('Invalid incline model size'); }
          part.set(value, position); position += value.length;
          const mb = Math.round((offset + position) / 1e6);
          if (mb !== last) { announce(progress, `Loading incline model (${mb} / ${Math.round(manifest.bytes / 1e6)} MB)…`); last = mb; }
        }
        if (position !== part.length) throw new Error('Incomplete incline model download');
      } else part = new Uint8Array(await source.arrayBuffer());
      if (part.length !== chunk.bytes || await sha256(part) !== chunk.sha256) throw new Error('Incline model checksum mismatch');
      try { await cache?.put(url, new Response(part, {headers: {'Content-Type': 'application/octet-stream'}})); } catch { /* Storage quota must not prevent inference. */ }
    }
    bytes.set(part, offset); offset += part.length;
  }
  if (offset !== manifest.bytes || await sha256(bytes) !== manifest.sha256) throw new Error('Incomplete incline model');
  return bytes;
}

async function getRuntime(progress) {
  if (runtimePromise) return followRuntime(progress);
  runtimeMessage=null;
  runtimePromise = (async () => {
    if (!globalThis.navigator?.gpu) return unavailable('webgpu-unavailable', 'Inclines need WebGPU on this device. Wall boundaries are still available.');
    if (typeof OffscreenCanvas === 'undefined') return unavailable('canvas-unavailable', 'This browser cannot prepare the incline model input. Wall boundaries are still available.');
    const adapter = await navigator.gpu.requestAdapter({powerPreference: 'high-performance'});
    if (!adapter) return unavailable('gpu-adapter-unavailable', 'No compatible GPU was found for incline estimation. Wall boundaries are still available.');
    const ort = await import(new URL('ort.webgpu.min.mjs', RUNTIME_BASE).href);
    ort.env.wasm.wasmPaths = RUNTIME_BASE.href;
    ort.env.wasm.numThreads = 1; // GitHub Pages does not provide COOP/COEP isolation headers.
    ort.env.wasm.proxy = false;
    ort.env.webgpu.powerPreference = 'high-performance';
    const start = performance.now(), bytes = await loadModelBytes(runtimeProgress), downloadMs = performance.now() - start;
    // The cold model download can take minutes on a mobile connection.
    // WebGPU permits an adapter to expire; do not initialize with the old probe.
    const readyAdapter = await navigator.gpu.requestAdapter({powerPreference: 'high-performance'});
    if (!readyAdapter) return unavailable('gpu-adapter-unavailable', 'The GPU became unavailable while loading inclines. Try again.');
    ort.env.webgpu.adapter = readyAdapter;
    runtimeProgress('Starting incline model…');
    const setup = performance.now();
    const session = await ort.InferenceSession.create(bytes, {executionProviders: ['webgpu'], graphOptimizationLevel: 'disabled'});
    return {status: 'ready', ort, session, downloadMs, setupMs: performance.now() - setup};
  })().then(runtime => {
    // Missing/temporarily unavailable devices are not a successful runtime.
    // Recheck capabilities on the next explicit request instead of requiring a reload.
    if (runtime.status !== 'ready') runtimePromise = undefined;
    return runtime;
  }).catch(error => { runtimePromise = undefined; throw error; });
  return followRuntime(progress);
}

// Shares the exact download/session with a later scan; no photo or inference needed.
export async function warmMoGeSurfaceModel(){
 try{const runtime=await getRuntime(()=>{});return {status:runtime.status,code:runtime.code};}
 catch(error){return unavailable('incline-model-failed',String(error.message||error));}
}

async function run({pixels, width, height, signal}, progress) {
  const requestStart = performance.now();
  aborted(signal);
  const [w, h] = mogeInputSize(width, height);
  const rgba = pixels instanceof Uint8ClampedArray ? pixels : new Uint8ClampedArray(pixels);
  if (rgba.length !== width * height * 4) throw new Error('Incomplete photo pixels');
  const key = `${width}x${height}:${await sha256(rgba)}`;
  if (frames.has(key)) {
    const frame = frames.get(key); frames.delete(key); frames.set(key, frame);
    return {...frame, normals: frame.normals.slice(), cacheHit: true,
      timings: {...frame.timings, inferenceMs: 0, processingMs: performance.now() - requestStart}};
  }
  const runtime = await getRuntime(progress);
  aborted(signal);
  if (runtime.status !== 'ready') return runtime;
  const {ort, session} = runtime, start = performance.now();
  const source = new OffscreenCanvas(width, height), canvas = new OffscreenCanvas(w, h);
  source.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
  const context = canvas.getContext('2d', {willReadFrequently: true});
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, w, h);
  const small = context.getImageData(0, 0, w, h).data, n = w * h, input = new Float32Array(n * 3);
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) input[c * n + i] = small[4 * i + c] / 255;
  source.width = source.height = canvas.width = canvas.height = 1;
  const image = new ort.Tensor('float32', input, [1, 3, h, w]);
  const tokens = new ort.Tensor('int64', BigInt64Array.from([BigInt(TOKENS)]), []);
  let output;
  try {
    announce(progress, 'Estimating face inclines…');
    const inferenceStart = performance.now();
    output = await session.run({image, num_tokens: tokens});
    const inferenceMs = performance.now() - inferenceStart;
    aborted(signal);
    const frame = normalOutputToFrame(output.normal.data, output.normal.dims);
    frame.timings = {downloadMs: runtime.downloadMs, setupMs: runtime.setupMs, inferenceMs, processingMs: performance.now() - start};
    frame.execution = 'webgpu-with-cpu-operator-fallback';
    frames.set(key, frame); while (frames.size > 2) frames.delete(frames.keys().next().value);
    return {...frame, normals: frame.normals.slice(), cacheHit: false};
  } catch(error) {
    // A lost GPU/session must not poison subsequent explicit retries.
    if(error.name!=='AbortError'){
      runtimePromise=undefined;
      try{await session.release();}catch{}
    }
    throw error;
  } finally { image.dispose(); tokens.dispose(); if (output) Object.values(output).forEach(t => t.dispose()); }
}

// Serialize session.run calls and keep model failures independent from RGB boundary success.
// Cancellation discards a result; an already-running GPU dispatch cannot be interrupted here.
export function inferMoGeSurfaceFrame(request, progress = () => {}) {
  const task = queue.then(() => run(request, progress)).catch(error => {
    if (error.name === 'AbortError') throw error;
    return unavailable('incline-model-failed', String(error.message || error));
  });
  queue = task.catch(() => {});
  return task;
}

export async function disposeMoGeSurfaceModel() {
  await queue;
  const runtime = await runtimePromise?.catch(() => undefined);
  await runtime?.session?.release(); runtimePromise = undefined; frames.clear();
}
