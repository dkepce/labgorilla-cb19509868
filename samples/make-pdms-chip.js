// Smooth test PDMS chip (mm), features facing up. Same design as before, but the outlines of holes, wells,
// channels and chamber follow real circles/curves: each feature is a distance function, cut cells are clipped
// along the zero line (marching-squares style) and walls are placed exactly there.
const fs = require("fs");
const L = 30, W = 18, T = 5, G = 0.05, NX = Math.round(L / G), NY = Math.round(W / G);
const CH = 0.4, WELL = 1.0, cw = 0.5;
const circ = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
const capsule = (x, y, x0, y0, x1, y1, r) => { const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - x0 - t * dx, y - y0 - t * dy) - r; };
const rrect = (x, y, cx, cy, hx, hy, r) => { const qx = Math.abs(x - cx) - (hx - r), qy = Math.abs(y - cy) - (hy - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const path = [[3, 9], [6, 9], [6, 4], [8, 4], [8, 14], [10, 14], [10, 4], [12, 4], [12, 9], [15.5, 9]];
const wells = []; for (let i = 0; i < 4; i++) wells.push([16.8 + i * 2.8, 7.6]); for (let i = 0; i < 4; i++) wells.push([16.8 + i * 2.8, 10.4]);
const fh = (x, y) => Math.min(circ(x, y, 3, 9, 0.75), circ(x, y, 28, 9, 0.75));          // punched holes
const fw = (x, y) => Math.min(...wells.map(([a, b]) => circ(x, y, a, b, 0.6)));           // microwells
const fc = (x, y) => { let d = Math.min(rrect(x, y, 21, 9, 6, 3, 1), capsule(x, y, 26.5, 9, 28, 9, cw / 2)); for (let i = 0; i < path.length - 1; i++) d = Math.min(d, capsule(x, y, ...path[i], ...path[i + 1], cw / 2)); return d; };
const level = (x, y) => (fh(x, y) < 0 ? 0 : fw(x, y) < 0 ? T - WELL : fc(x, y) < 0 ? T - CH : T);

const tris = [], tri = (a, b, c) => tris.push([a, b, c]);
const fanUp = (p, z) => { for (let i = 1; i < p.length - 1; i++) tri([...p[0], z], [...p[i], z], [...p[i + 1], z]); };
const fanDown = (p, z) => { for (let i = 1; i < p.length - 1; i++) tri([...p[0], z], [...p[i + 1], z], [...p[i], z]); };
/* vertical wall along p-q from lo to hi, facing the side where f gets smaller (the cavity) */
function wall(p, q, lo, hi, f) {
  if (!(hi > lo)) return; const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); if (l < 1e-9) return;
  const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n = [dy / l, -dx / l];
  if (f(m[0] + n[0] * 0.01, m[1] + n[1] * 0.01) > f(m[0], m[1])) [p, q] = [q, p];
  tri([...p, lo], [...q, lo], [...q, hi]); tri([...p, lo], [...q, hi], [...p, hi]);
}
/* Sutherland–Hodgman clip of a convex polygon against f<0 (neg) or f>=0; also returns the cut points */
function clip(poly, f, neg) {
  const out = [], cut = [], v = poly.map(p => f(p[0], p[1])), keep = a => (neg ? a < 0 : a >= 0);
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length, a = poly[i], b = poly[j];
    if (keep(v[i])) out.push(a);
    if (keep(v[i]) !== keep(v[j])) { const t = v[i] / (v[i] - v[j]), p = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; out.push(p); cut.push(p); }
  }
  return { poly: out.length >= 3 ? out : [], cut };
}
const pairs = c => { const s = []; for (let i = 0; i + 1 < c.length; i += 2) s.push([c[i], c[i + 1]]); return s; };
const outside = (seg, f) => { const m = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2], gx = f(m[0] + 0.005, m[1]) - f(m[0] - 0.005, m[1]), gy = f(m[0], m[1] + 0.005) - f(m[0], m[1] - 0.005), gl = Math.hypot(gx, gy) || 1; return [m[0] + gx / gl * 0.02, m[1] + gy / gl * 0.02]; };

/* corner signs, to find cells that a contour passes through */
const S = [fh, fw, fc].map(f => { const a = []; for (let j = 0; j <= NY; j++) { a[j] = []; for (let i = 0; i <= NX; i++) a[j][i] = f(i * G, j * G) < 0; } return a; });
const cutCell = (i, j) => S.some(a => !(a[j][i] === a[j][i + 1] && a[j][i] === a[j + 1][i] && a[j][i] === a[j + 1][i + 1]));
for (let j = 0; j < NY; j++) {
  const y0 = j * G, y1 = (j + 1) * G; let run = null;
  const flush = () => { if (run && run.z > 0) { const p = [[run.x0, y0], [run.x1, y0], [run.x1, y1], [run.x0, y1]]; fanUp(p, run.z); fanDown(p, 0); } run = null; };
  for (let i = 0; i < NX; i++) {
    const x0 = i * G, x1 = (i + 1) * G;
    if (!cutCell(i, j)) {   // whole cell at one level: merge with neighbours in this row
      const z = level(x0 + G / 2, y0 + G / 2);
      if (run && run.z === z && run.x1 === x0) run.x1 = x1; else { flush(); run = { x0, x1, z }; }
      continue;
    }
    flush();
    const sq = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const NH = clip(sq, fh, false);                                   // everything that is not a hole
    if (NH.poly.length) fanDown(NH.poly, 0);
    pairs(NH.cut).forEach(s => { const o = outside(s, fh); wall(s[0], s[1], 0, level(...o), fh); });
    if (!NH.poly.length) continue;
    const WL = clip(NH.poly, fw, true); if (WL.poly.length) fanUp(WL.poly, T - WELL);
    pairs(WL.cut).forEach(s => { const o = outside(s, fw); wall(s[0], s[1], T - WELL, level(...o), fw); });
    const R = clip(NH.poly, fw, false); if (!R.poly.length) continue;
    const C = clip(R.poly, fc, true); if (C.poly.length) fanUp(C.poly, T - CH);
    pairs(C.cut).forEach(s => wall(s[0], s[1], T - CH, T, fc));
    const P = clip(R.poly, fc, false); if (P.poly.length) fanUp(P.poly, T);
  }
  flush();
}
/* outer sides of the slab */
const box = (x, y) => Math.min(x, L - x, y, W - y);    // smaller outside the slab
wall([0, 0], [L, 0], 0, T, box); wall([L, 0], [L, W], 0, T, box); wall([L, W], [0, W], 0, T, box); wall([0, W], [0, 0], 0, T, box);

const b = Buffer.alloc(84 + tris.length * 50); b.write("LabGorilla test PDMS chip, mm", 0); b.writeUInt32LE(tris.length, 80);
tris.forEach((t, k) => { const o = 84 + k * 50, [a, c, d] = t, u = c.map((v, q) => v - a[q]), w = d.map((v, q) => v - a[q]), nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...nn) || 1;
  nn.forEach((v, q) => b.writeFloatLE(v / l, o + q * 4)); t.flat().forEach((v, q) => b.writeFloatLE(v, o + 12 + q * 4)); });
fs.writeFileSync(process.argv[2], b);
console.log(tris.length + " triangles, " + (b.length / 1048576).toFixed(2) + " MB");
