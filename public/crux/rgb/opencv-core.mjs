import {detectLines} from './lsd.mjs';
import {proposalsFromPasses, assembleSegments, roundEven} from './core.mjs';

export function prepareRGBA(cv, rgba, width, height, holds, edge = 1280) {
  const w = roundEven(width * edge / Math.max(width, height)), h = roundEven(height * edge / Math.max(width, height));
  const source = cv.matFromArray(height, width, cv.CV_8UC4, rgba);
  const small = new cv.Mat(), rgb = new cv.Mat(), gray = new cv.Mat(), lab = new cv.Mat(), native = new cv.Mat();
  try {
    cv.resize(source, small, new cv.Size(w, h), 0, 0, cv.INTER_AREA);
    cv.cvtColor(small, rgb, cv.COLOR_RGBA2RGB); cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY); cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
    cv.cvtColor(source, native, cv.COLOR_RGBA2GRAY);
    const block = new Uint8Array(w * h), centers = [];
    for (const box of holds) {
      const x = box.x * w, y = box.y * h, bw = box.w * w, bh = box.h * h;
      const left = Math.max(0, roundEven(x - bw * .53)), right = Math.min(w - 1, roundEven(x + bw * .53));
      const top = Math.max(0, roundEven(y - bh * .53)), bottom = Math.min(h - 1, roundEven(y + bh * .53));
      for (let yy = top; yy <= bottom; yy++) block.fill(1, yy * w + left, yy * w + right + 1);
      centers.push([x, y]);
    }
    return {w, h, rgba: small.data.slice(), gray: gray.data.slice(), lab: lab.data.slice(), block, centers,
      nativeGray: native.data.slice(), nativeWidth: width, nativeHeight: height, original_size: [width, height]};
  } finally {source.delete(); small.delete(); rgb.delete(); gray.delete(); lab.delete(); native.delete();}
}

export function detectProposals(cv, runtime, d, {analysisPass = true, retainPasses = false} = {}) {
  const started = performance.now(), enhanced = new cv.Mat(), gray = cv.matFromArray(d.h, d.w, cv.CV_8UC1, d.gray);
  const clahe = new cv.CLAHE(3, new cv.Size(12, 12));
  try {
    clahe.apply(gray, enhanced);
    const passes = [
      ...(analysisPass ? [{name: 'analysis', lines: detectLines(runtime, d.gray, d.w, d.h)}] : []),
      {name: 'native', lines: detectLines(runtime, d.nativeGray, d.nativeWidth, d.nativeHeight), scaleX: d.w / d.nativeWidth, scaleY: d.h / d.nativeHeight},
      // Default LSD quant=2; Float64 gain (without clipping) changes its effective
      // gradient quantization to .8, matching the enhanced Python pass.
      {name: 'clahe-quant-.8', lines: detectLines(runtime, enhanced.data, d.w, d.h, {gain: 2.5})},
    ];
    const result = proposalsFromPasses(d, passes);
    result.meta.detector = runtime.kind || 'LSD 1.6'; result.meta.passes = passes.map(p => ({name: p.name, count: p.lines.length}));
    result.meta.total_seconds = (performance.now() - started) / 1000;
    if (retainPasses) result.passes = passes;
    return result;
  } finally {clahe.delete(); gray.delete(); enhanced.delete();}
}

export function fitMask(cv, mask, w, h, eps = w * .0035) {
  const src = cv.matFromArray(h, w, cv.CV_8UC1, mask), contours = new cv.MatVector(), hierarchy = new cv.Mat();
  const out = cv.Mat.zeros(h, w, cv.CV_8UC1), polygons = [];
  try {
    cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i), poly = new cv.Mat(), list = new cv.MatVector();
      try {
        if (cv.contourArea(contour) < 100) continue;
        cv.approxPolyDP(contour, poly, eps, true); list.push_back(poly); cv.fillPoly(out, list, new cv.Scalar(1));
        const p = []; for (let j = 0; j < poly.data32S.length; j += 2) p.push([poly.data32S[j], poly.data32S[j + 1]]);
        polygons.push(p);
      } finally {contour.delete(); poly.delete(); list.delete();}
    }
    return {mask: out.data.slice(), polygons};
  } finally {src.delete(); contours.delete(); hierarchy.delete(); out.delete();}
}

/** Restore thin seam pixels with exact Euclidean nearest candidates.
 * Equal-distance ties use x then y; SciPy may choose a different tied face.
 */
export function restoreSeams(labels, clean, w, h) {
  const result = labels.slice(); if (!labels.some(v => v > 0)) return result;
  for (let i = 0; i < labels.length; i++) {
    if (!clean[i] || labels[i]) continue;
    const x = i % w, y = Math.floor(i / w); let radius = 3, best = 0, distance = Infinity;
    while (!best || distance > radius * radius) {
      for (let xx = Math.max(0, x - radius); xx <= Math.min(w - 1, x + radius); xx++) for (let yy = Math.max(0, y - radius); yy <= Math.min(h - 1, y + radius); yy++) {
        const label = labels[yy * w + xx]; if (!label) continue;
        const dd = (xx - x) ** 2 + (yy - y) ** 2;
        if (dd < distance) {distance = dd; best = label;}
      }
      if (best && distance <= radius * radius) break;
      radius *= 2;
    }
    result[i] = best;
  }
  return result;
}

export function rasterizeGraph(cv, segments, clean, w, h) {
  const barriers = cv.Mat.zeros(h, w, cv.CV_8UC1), available = cv.matFromArray(h, w, cv.CV_8UC1, clean), labels = new cv.Mat();
  try {
    for (const s of segments) cv.line(barriers, new cv.Point(roundEven(s[0][0]), roundEven(s[0][1])), new cv.Point(roundEven(s[1][0]), roundEven(s[1][1])), new cv.Scalar(1), 2);
    for (let i = 0; i < clean.length; i++) if (barriers.data[i]) available.data[i] = 0;
    cv.connectedComponents(available, labels, 8, cv.CV_32S);
    return restoreSeams(labels.data32S, clean, w, h);
  } finally {barriers.delete(); available.delete(); labels.delete();}
}

export function selectSupportedCells(d, labels, dots = []) {
  const max = labels.reduce((a, b) => Math.max(a, b), 0), areas = new Uint32Array(max + 1), dotCounts = new Uint32Array(max + 1);
  const clampIndex = (x, y, round = Math.floor) => Math.min(d.h - 1, Math.max(0, round(y))) * d.w + Math.min(d.w - 1, Math.max(0, round(x)));
  const seeded = new Set(d.centers.map(([x, y]) => labels[clampIndex(x, y)])); seeded.delete(0);
  for (const label of labels) areas[label]++;
  for (const [x, y] of dots) dotCounts[labels[clampIndex(x, y, roundEven)]]++;
  const densities = [...seeded].filter(a => areas[a] > 100).map(a => dotCounts[a] / areas[a]).sort((a, b) => a - b);
  const n = densities.length, densityReference = n ? (n % 2 ? densities[n >> 1] : (densities[n / 2 - 1] + densities[n / 2]) / 2) : 0;
  // Python's dilated ring counts each neighboring pixel once per region.
  const rings = Array.from({length: max + 1}, () => new Map());
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
    const label = labels[y * d.w + x]; if (!seeded.has(label)) continue;
    const adjacent = new Set();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < d.w && yy >= 0 && yy < d.h) adjacent.add(labels[yy * d.w + xx]);
    }
    for (const r of adjacent) if (r && r !== label) rings[r].set(label, (rings[r].get(label) || 0) + 1);
  }
  const supported = new Set(seeded), diagnostics = [];
  for (let r = 1; r <= max; r++) {
    const adjacent = [...rings[r]].filter(([, count]) => count >= 4).map(([id]) => id);
    const textured = dotCounts[r] >= 3 && dotCounts[r] / Math.max(1, areas[r]) >= densityReference * .35;
    if (areas[r] >= 20 && (adjacent.length >= 2 || textured)) supported.add(r);
    diagnostics.push({id: r, area: areas[r], holds: seeded.has(r), dots: dotCounts[r], adjacent, textured, keep: supported.has(r)});
  }
  const mapping = new Map([...supported].sort((a, b) => a - b).map((label, i) => [label, i + 1]));
  return {labels: Int32Array.from(labels, l => mapping.get(l) || 0), faces: mapping.size, diagnostics, densityReference};
}

export function resizeLabels(labels, width, height, targetWidth, targetHeight) {
  const output = new Int32Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y++) for (let x = 0; x < targetWidth; x++) output[y * targetWidth + x] = labels[Math.floor(y * height / targetHeight) * width + Math.floor(x * width / targetWidth)];
  return output;
}

export function buildGraph(cv, d, lines, mask, dots = [], options = {}) {
  const fitted = fitMask(cv, mask, d.w, d.h), graph = assembleSegments(d, lines, fitted.mask, fitted.polygons, options);
  const rawLabels = rasterizeGraph(cv, graph.segments, fitted.mask, d.w, d.h), selected = selectSupportedCells(d, rawLabels, dots);
  return {...graph, ...selected, rawLabels, mask: fitted.mask, polygons: fitted.polygons};
}
