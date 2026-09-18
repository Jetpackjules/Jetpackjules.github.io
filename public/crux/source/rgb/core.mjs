// EXPERIMENT: only strong supported segments or mask outline may attract endpoints.
/** RGB-only geometry port of graph/rgb_lines.py and build_graph.py.
 * Inputs are live image rasters and detector segments, never reference geometry.
 * Fields: {w,h,gray,lab,block,centers,support?}; lab is interleaved uint8 Lab.
 */
const COS3 = Math.cos(Math.PI / 60);
const norm = (v) => Math.hypot(v[0], v[1]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const at = (a, u, t) => [a[0] + u[0] * t, a[1] + u[1] * t];
const ends = s => Array.isArray(s[0]) ? s.map(p => [...p]) : [[s[0], s[1]], [s[2], s[3]]];
const flat = s => s.flat();
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
export function roundEven(x) { const n = Math.floor(x), d = x - n; return d === .5 ? n + (n & 1) : Math.round(x); }
const index = (d, p) => Math.min(d.h - 1, Math.max(0, roundEven(p[1]))) * d.w + Math.min(d.w - 1, Math.max(0, roundEven(p[0])));
const sample = (d, raster, p) => raster[index(d, p)];
const inside = (d, p) => p[0] >= 0 && p[0] < d.w && p[1] >= 0 && p[1] < d.h;
function points(a, b, n) { return Array.from({length: n}, (_, i) => at(a, sub(b, a), i / (n - 1))); }
function median(a) { if (!a.length) return 0; a.sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function axis(s) { const v = sub(s[1], s[0]), length = norm(v), u = v.map(x => x / Math.max(length, 1e-12)); return {length, u, n: [-u[1], u[0]]}; }

export function lineStats(d, segment) {
  const [a, b] = ends(segment), {length, n} = axis([a, b]);
  const p = points(a, b, Math.max(3, Math.floor(length / 2)));
  const clear = mean(p.map(q => +(sample(d, d.block, q) === 0))), delta = [], strip_valid = [];
  for (const offset of [4, 8, 14]) {
    const channels = [[], [], []]; let valid = 0;
    for (const q of p) {
      const l = at(q, n, offset), r = at(q, n, -offset);
      if (!inside(d, l) || !inside(d, r) || sample(d, d.block, l) || sample(d, d.block, r)) continue;
      const li = index(d, l) * 3, ri = index(d, r) * 3;
      for (let c = 0; c < 3; c++) channels[c].push(d.lab[li + c] - d.lab[ri + c]);
      valid++;
    }
    delta.push(valid > 3 ? channels.map(median) : [0, 0, 0]); strip_valid.push(valid / p.length);
  }
  const shift = delta[0].map((x, i) => x * 2 - delta[1][i]);
  return {length, clear, color_jump: Math.hypot(...shift), color_wide: Math.hypot(...delta[2]), luminance_shift: shift[0], strip_valid};
}

export function bridgeEvidence(d, a, b) {
  const {length, n} = axis([a, b]); if (length < 2) return 1;
  const p = points(a, b, Math.max(4, Math.floor(length / 2))); let valid = 0, supported = 0;
  for (const q of p) {
    let good = false, hit = false;
    for (const shift of [-2, 0, 2]) {
      const c = at(q, n, shift), l = at(c, n, -4), r = at(c, n, 4);
      if (sample(d, d.block, c) || sample(d, d.block, l) || sample(d, d.block, r)) continue;
      good = true; const lc = sample(d, d.gray, l), rc = sample(d, d.gray, r), cc = sample(d, d.gray, c);
      hit ||= Math.abs(lc - rc) > 4 || (lc + rc) / 2 - cc > 2.5;
    }
    valid += +good; supported += +hit;
  }
  if (valid < 8) return +(mean(p.map(q => sample(d, d.block, q))) > .65);
  return supported / valid;
}

function fitLine(pts, weights = pts.map(() => 1)) {
  const sw = weights.reduce((a, b) => a + b, 0), mid = [0, 0];
  pts.forEach((p, i) => {mid[0] += p[0] * weights[i] / sw; mid[1] += p[1] * weights[i] / sw;});
  let xx = 0, xy = 0, yy = 0;
  pts.forEach((p, i) => {const [x, y] = sub(p, mid), w = weights[i]; xx += x * x * w; xy += x * y * w; yy += y * y * w;});
  const theta = .5 * Math.atan2(2 * xy, xx - yy), v = [Math.cos(theta), Math.sin(theta)];
  const projections = pts.map(p => dot(sub(p, mid), v));
  // Eigenvector sign is arbitrary. Canonical endpoints keep downstream order stable.
  return [at(mid, v, Math.min(...projections)), at(mid, v, Math.max(...projections))];
}

export function bridgeSupported(d, chains) {
  const active = chains.map(c => ({...c})); let changed = true;
  while (changed) {
    changed = false; active.sort((a, b) => b.length - a.length);
    outer: for (let i = 0; i < active.length; i++) {
      const s = ends(active[i].segment), {length: L, u: v, n} = axis(s);
      for (let j = i + 1; j < active.length; j++) {
        const q = ends(active[j].segment), {u} = axis(q);
        if (Math.abs(dot(u, v)) < COS3 || Math.max(...q.map(p => Math.abs(dot(sub(p, s[0]), n)))) > 5) continue;
        const aa = Math.min(...q.map(p => dot(sub(p, s[0]), v))), bb = Math.max(...q.map(p => dot(sub(p, s[0]), v)));
        if (aa <= L && bb >= 0) continue;
        const [start, end] = aa > L ? [L, aa] : [bb, 0], gap = end - start;
        if (gap > d.w * .30) continue;
        const support = bridgeEvidence(d, at(s[0], v, start), at(s[0], v, end));
        if (gap > d.w * .012 && support < .58) continue;
        const segment = flat(fitLine([...s, ...q]));
        active[i] = {segment, parts: active[i].parts + active[j].parts, bridge_support: support, ...lineStats(d, segment)};
        active.splice(j, 1); changed = true; break outer;
      }
    }
  }
  return active;
}

/** Passes supply detector lines plus x/y factors into analysis coordinates. */
export function proposalsFromPasses(d, passes) {
  const started = performance.now(), raw = [];
  for (const pass of passes) for (const l of pass.lines) {
    let [a, b] = l.x1 === undefined ? ends(l) : [[l.x1, l.y1], [l.x2, l.y2]];
    const sx = pass.scaleX ?? pass.factor ?? 1, sy = pass.scaleY ?? pass.factor ?? 1;
    a = [a[0] * sx, a[1] * sy]; b = [b[0] * sx, b[1] * sy];
    const length = norm(sub(b, a)); if (length < d.w * .006) continue;
    const p = points(a, b, Math.max(3, Math.floor(length / 2)));
    if (mean(p.map(q => +(sample(d, d.block, q) === 0))) < .5) continue;
    if (d.support && mean(p.map(q => sample(d, d.support, q))) < .35) continue;
    if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) [a, b] = [b, a];
    raw.push({s: [a, b], ...axis([a, b])});
  }
  const used = new Uint8Array(raw.length), order = raw.map((_, i) => i).sort((a, b) => raw[b].length - raw[a].length), chains = [];
  for (const k of order) {
    if (used[k]) continue;
    const {s: [a], u, n} = raw[k], candidates = [];
    raw.forEach((r, i) => {
      if (used[i] || Math.abs(dot(r.u, u)) <= COS3 || Math.max(...r.s.map(p => Math.abs(dot(sub(p, a), n)))) >= 5) return;
      const ts = r.s.map(p => dot(sub(p, a), u)).sort((x, y) => x - y); candidates.push({i, lo: ts[0], hi: ts[1]});
    });
    candidates.sort((x, y) => x.lo - y.lo); const groups = []; let group = [], hi = 0;
    for (const r of candidates) {
      let join = false;
      if (group.length) {
        const gap = Math.max(0, r.lo - hi);
        join = gap <= d.w * .012;
        if (!join && gap < d.w * .12) join = mean(points(at(a, u, hi), at(a, u, r.lo), Math.max(3, Math.floor(gap))).map(q => sample(d, d.block, q))) > .72;
      }
      if (!join && group.length) {groups.push(group); group = [];}
      group.push(r.i); hi = Math.max(join ? hi : r.hi, r.hi);
    }
    if (group.length) groups.push(group);
    for (const g of groups) {
      if (!g.includes(k)) continue;
      const pts = g.flatMap(i => raw[i].s), weights = g.flatMap(i => [raw[i].length, raw[i].length]);
      const segment = flat(fitLine(pts, weights));
      if (norm(sub(segment.slice(2), segment.slice(0, 2))) < d.w * .024) continue;
      g.forEach(i => {used[i] = 1;});
      const f = lineStats(d, segment); if (f.clear < .33) continue;
      chains.push({segment, parts: g.length, ...f});
    }
  }
  const lines = bridgeSupported(d, chains).sort((a, b) => b.length * b.clear - a.length * a.clear);
  return {lines, meta: {raw_count: raw.length, chains: lines.length, seconds: (performance.now() - started) / 1000}};
}

export function intersect(first, second) {
  const [a, b] = ends(first), [c, e] = ends(second), u = sub(b, a), v = sub(e, c), x = sub(c, a);
  const den = u[0] * v[1] - u[1] * v[0]; if (Math.abs(den) < 1e-6) return null;
  const p = (x[0] * v[1] - x[1] * v[0]) / den, q = (x[0] * u[1] - x[1] * u[0]) / den;
  return {point: at(a, u, p), p, q};
}

/** Mask and polygon fitting are external; no OpenCV objects escape this function. */
export function assembleSegments(d, lines, clean, polygons, {filterFaint = true, strongStep = 6} = {}) {
  const outline = polygons.flatMap(p => p.map((a, i) => [a, p[(i + 1) % p.length]])), selected = [];
  for (const line of lines) {
    const s = ends(line.segment), {length: L, n} = axis(s), p = points(...s, Math.max(5, Math.floor(L / 3)));
    const left = p.map(q => +(sample(d, clean, at(q, n, 7)) > 0)), right = p.map(q => +(sample(d, clean, at(q, n, -7)) > 0));
    if (Math.max(mean(left), mean(right)) < .78) continue;
    if (L < d.w * .035 && line.color_jump < 2.5) continue;
    selected.push({...line, segment: s, wall_support: mean(left.map((x, i) => x * right[i]))});
  }
  selected.sort((a, b) => b.length - a.length); let keep = [];
  for (const line of selected) {
    const s = line.segment, mid = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2], {length: L, u: v} = axis(s);
    const duplicate = keep.some(old => {
      const q = old.segment, {length: M, u, n} = axis(q); if (Math.abs(dot(u, v)) < .998) return false;
      const [a, b] = s.map(p => dot(sub(p, q[0]), u)).sort((x, y) => x - y), overlap = Math.max(0, Math.min(M, b) - Math.max(0, a));
      return Math.abs(dot(sub(mid, q[0]), n)) < 5 && overlap / L > .7;
    });
    if (!duplicate) keep.push(line);
  }
  let segments = keep.map(k => ends(k.segment)); const targets = [...segments, ...outline];
  for (let i = 0; i < segments.length; i++) for (let e = 0; e < 2; e++) {
    const s = segments[i], origin = [...s[e]]; let best = null;
    for (let j = 0; j < targets.length; j++) {
      if (j === i || (j < keep.length && !(keep[j].color_jump >= strongStep && Math.max(...keep[j].strip_valid.slice(1)) >= .30))) continue; const hit = intersect(s, targets[j]); if (!hit) continue;
      const {point: p, p: a, q: b} = hit;
      if (b < -.035 || b > 1.035 || (e === 0 && (a < -1.5 || a > .12)) || (e === 1 && (a < .88 || a > 2.5))) continue;
      const distance = norm(sub(p, origin)); if (distance > d.w * .15) continue;
      if (distance > d.w * .02 && mean(points(origin, p, Math.max(4, Math.floor(distance))).map(q => sample(d, d.block, q))) < .68 && bridgeEvidence(d, origin, p) < .65) continue;
      if (!best || distance < best.distance) best = {distance, point: p};
    }
    if (best) s[e] = best.point;
  }
  if (filterFaint) {
    const strong = keep.map(k => k.color_jump >= strongStep && Math.max(...k.strip_valid.slice(1)) >= .30);
    const retain = segments.map((s, i) => strong[i] || s.some(p => {
      const incident = segments.flatMap((q, j) => j !== i && strong[j] && Math.min(...q.map(v => norm(sub(v, p)))) <= d.w * .006 ? [axis(q).u] : []);
      return incident.some((u, a) => incident.slice(0, a).some(v => Math.abs(dot(u, v)) < .95));
    }));
    segments = segments.filter((_, i) => retain[i]); keep = keep.filter((_, i) => retain[i]);
  }
  return {segments, lines: keep};
}
