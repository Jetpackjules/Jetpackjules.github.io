/** LSD 1.6, compiled unchanged to WASM. Upstream C is AGPL-3.0.
 * Minimal WASI stdio shim only; no filesystem/network access is provided.
 */
export async function createLSDWASM(bytes) {
  let memory, lastError = '';
  const wasi = {
    fd_write(fd, iovs, count, written) {
      const dv = new DataView(memory.buffer), chunks = [];
      let total = 0;
      for (let i = 0; i < count; i++) {
        const ptr = dv.getUint32(iovs + i * 8, true), len = dv.getUint32(iovs + i * 8 + 4, true);
        chunks.push(new TextDecoder().decode(new Uint8Array(memory.buffer, ptr, len))); total += len;
      }
      lastError += chunks.join(''); dv.setUint32(written, total, true); return 0;
    },
    fd_close() { return 0; },
    fd_seek() { return 29; }, // ESPIPE: no seekable files exist.
    proc_exit(code) { throw new Error(`LSD exited (${code}): ${lastError.trim()}`); },
  };
  const {instance, module} = await WebAssembly.instantiate(bytes, {wasi_snapshot_preview1: wasi});
  const e = instance.exports; memory = e.memory;
  e._initialize?.();
  return {
    kind: 'LSD 1.6 WASM O3',
    memory,
    imports: WebAssembly.Module.imports(module),
    lsd(gray, width, height) {
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || gray.length !== width * height) throw new Error('Expected a complete grayscale image');
      if (gray.length > 2_100_000) throw new Error('LSD image exceeds 2.1MP tested limit');
      let ptr = 0, countPtr = 0, outputPtr = 0;
      try {
        countPtr = e.malloc(4); ptr = e.malloc(gray.length * 8);
        if (!ptr || !countPtr) throw new Error('LSD allocation failed');
        new Float64Array(memory.buffer, ptr, gray.length).set(gray);
        outputPtr = e.lsd(countPtr, ptr, width, height);
        const count = new Int32Array(memory.buffer, countPtr, 1)[0];
        if (count < 0 || count > width * height) throw new Error('Invalid LSD output count');
        const output = new Float64Array(memory.buffer, outputPtr, count * 7), lines = [];
        for (let i = 0; i < count; i++) {
          const k = i * 7;
          lines.push({x1: output[k], y1: output[k+1], x2: output[k+2], y2: output[k+3], width: output[k+4], p: output[k+5], minusLogNFA: output[k+6]});
        }
        return lines;
      } finally {
        if (outputPtr) e.free(outputPtr);
        if (ptr) e.free(ptr);
        if (countPtr) e.free(countPtr);
      }
    },
  };
}

let loading;
export async function loadLSDWASM(url = new URL('./lsd.wasm', import.meta.url)) {
  if (!loading) loading = (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`LSD WASM request failed: ${response.status}`);
    return createLSDWASM(await response.arrayBuffer());
  })();
  return loading;
}
