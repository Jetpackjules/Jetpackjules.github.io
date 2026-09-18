/** Local LSD 1.6 adapter. Runtime and upstream source are AGPL-3.0. */
let loading;
export async function loadLSD(url = new URL('./vendor/lsd-runtime.js', import.meta.url)) {
  if (globalThis.CRUX_LSD) return globalThis.CRUX_LSD;
  if (!loading) loading = (async () => {
    // Legacy asm.js contains non-strict syntax: load as a classic script in browsers.
    if (typeof importScripts === 'function') importScripts(String(url));
    else if (typeof document !== 'undefined') await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = String(url); script.onload = resolve; script.onerror = reject;
      document.head.append(script);
    });
    else await import(String(url));
    if (!globalThis.CRUX_LSD?.lsd) throw new Error('LSD runtime did not initialize');
    return globalThis.CRUX_LSD;
  })();
  return loading;
}

export function detectLines(runtime, gray, width, height, {gain = 1} = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 ||
      gray.length !== width * height) throw new Error('Expected a full grayscale raster');
  // Bounded to the tested native/analysis sizes; the asm.js heap cannot grow.
  if (width * height > 2_100_000) throw new Error('LSD input exceeds the 2.1MP runtime limit');
  if (!(gain > 0 && Number.isFinite(gain))) throw new Error('Invalid grayscale gain');
  const input = gain === 1 ? gray : Float64Array.from(gray, value => value * gain);
  const lines = runtime.lsd(input, width, height);
  if (lines.some(l => ![l.x1, l.y1, l.x2, l.y2].every(Number.isFinite))) {
    throw new Error('LSD returned a nonfinite segment');
  }
  return lines;
}

/** OpenCV is thenable: resolve a container, never resolve/await cv itself. */
export function waitForOpenCV(cv, timeoutMs = 30000) {
  if (cv?.Mat) return Promise.resolve({cv});
  return new Promise((resolve, reject) => {
    if (!cv) return reject(new Error('Load the local OpenCV classic script first'));
    const timer = setTimeout(() => reject(new Error('OpenCV initialization timed out')), timeoutMs);
    const previous = cv.onRuntimeInitialized;
    cv.onRuntimeInitialized = function (...args) {
      try {
        previous?.apply(this, args);
        clearTimeout(timer);
        resolve({cv});
      } catch (error) { clearTimeout(timer); reject(error); }
    };
  });
}
