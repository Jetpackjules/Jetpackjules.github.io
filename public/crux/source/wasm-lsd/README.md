# LSD 1.6 WebAssembly build

This is an optimized compilation of the unchanged LSD 1.6 C detector already used by the prototype. It replaces the legacy asm.js runtime; it does not change the wall graph or detector parameters.

## Use in a browser worker

Serve `lsd-wasm.mjs` and `lsd.wasm` next to each other. The loader resolves the binary with `new URL('./lsd.wasm', import.meta.url)` and caches its initialization.

```js
import {loadLSDWASM} from './lsd-wasm.mjs';
const runtime = await loadLSDWASM();
const lines = runtime.lsd(gray, width, height);
```

`gray` has one numeric intensity per pixel. Float64 input and values above 255 are supported, including the existing CLAHE gain of 2.5. Results retain `{x1, y1, x2, y2, width, p, minusLogNFA}`. Coordinates use the supplied image resolution. Existing `detectLines(runtime, ...)` can consume this runtime unchanged.

The wrapper limits images to the tested 2.1MP range. WASM starts with 128MiB and can grow to 256MiB; input, output, and detector allocations are freed after each call. The only WASI imports are minimal standard-output/error and exit stubs. No filesystem or network capability is exposed to C. Phones have not been benchmarked.

## Rebuild

The checked binary was built with official portable Zig 0.14.1 for Windows x86_64, using its bundled Clang/WASI libc. The 78.4MiB compiler archive is not redistributed here. Its download URL and verified SHA-256 are in `compiler-provenance.json`.

```powershell
./build.ps1 -ZigPath 'C:/path/to/zig.exe'
```

This writes `lsd.wasm` in this directory. Build flags are `-O3 -ffp-contract=off -fno-fast-math`; no fast-math transformation was enabled. `build.ps1` contains the complete target, memory, stack, and export options. Debug sections remain in this 824,888-byte binary, so rebuilding in another source directory may change its hash without changing the code.

## Compatibility evidence

`parity.json` compares the old asm.js and new WASM using the same four grayscale fixtures and intensity transforms. It matches unordered line segments one-to-one in either endpoint direction within 2 pixels. Across the actual three full-resolution passes, 98.5–99.7% of legacy line segments and 99.4–99.9% of their total length have a match. Nearly all matched endpoints agree within floating-point rounding. Every returned value is finite.

The raw line sets are **not bit-identical**: the WASI math implementation and the older JavaScript math implementation can make different decisions at detector thresholds. This raw-output test does not establish wall accuracy. A separate full-pipeline evaluation freezes predicted faces before comparing annotations; see the enclosing prototype's evaluation results. On the original overhang fixture, the trusted-snap live pipeline produced exactly the same final labels with both runtimes.

An exploratory fixed-support Node comparison measured 4.53s with asm.js versus 1.73s with WASM for the three-pass proposals plus wall graph. It excludes live support generation, image decoding, and browser startup. A separate live pipeline run measured 2.82s in Node. These are measurements on this computer, not a phone or universal under-two-second guarantee. Prefer the enclosing report's browser results when present.

## Source and license

`upstream/lsd.c`, `upstream/lsd.h`, and `upstream/COPYING` are unmodified files from the existing `line-segment-detector@0.0.4` package. The LSD C source is copyright 2007–2011 Rafael Grompone von Gioi and licensed **AGPL-3.0-or-later**, as stated in its header. Preserve its license and source when redistributing this runtime. The adapter and build script are supplied under the same license.

Publication: Rafael Grompone von Gioi et al., [LSD: a Line Segment Detector](https://doi.org/10.5201/ipol.2012.gjmr-lsd), IPOL, 2012. Package source: [biobricks/line-segment-detector](https://github.com/biobricks/line-segment-detector). Compiler: [Zig 0.14.1](https://ziglang.org/download/0.14.1/release-notes.html).

`SHA256SUMS.txt` records the distributed source, adapter, compiler provenance, and tested binary hashes.
