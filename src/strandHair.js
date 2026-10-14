// 画质提升 · 发片 → 真发丝（Card-to-Strand）转换与渲染（独立模块，不接入主项目）
//
// 核心思路（与主项目“只在发片上做着色”的根本区别）：
//   主项目发型 = 若干张带 alpha 贴图的发片网格。无论着色多精细，近看都是“一片一片”的。
//   这里把**艺术家发片网格当作发型的形状/流向容器**，在它上面“长”出几万根真正的 3D 发丝：
//     1) 引导发（Guide）：在发片表面按面积×贴图不透明度撒种子，沿发片 UV 的 V 方向（发丝走向，
//        dP/dv）在 3D 曲面上双向追踪，直到贴图 alpha 变透明（发梢）或离开发片（发根）。
//        发根端 = 离头皮更近的一端（物理判断，不依赖 UV 朝向）。形状 100% 来自原发型资产。
//     2) 子发（Child）：每根引导发周围按“发片宽、厚度薄”的椭圆分布生成子发，沿平行移动标架偏移，
//        越到发梢越向引导发收拢（成缕 clumping），加入细微卷曲（frizz）、少量飞翘碎发（flyaway）、
//        发梢长短不齐。这是影视 Groom（XGen/Houdini/Blender 曲线毛发）的标准引导/插值做法。
//     3) 体积 AO：按方位角分箱求外轮廓半径，越深入发量内部越暗 → 真实的发量层次与暗部。
//     4) 渲染：每根发丝是始终朝向相机的细带（像素级最小宽度 + MSAA 覆盖率抗锯齿），
//        着色用 Marschner 三瓣（R 表皮反射 / TT 透射逆光 / TRT 内部二次反射，Karis 2016 近似）
//        + Kajiya 漫反射 + 发量自遮蔽，切线是真实的发丝切线（不再从 UV 导数猜）。
//     5) 原发片保留为内层“发量底衬”（向内收 1.2mm、压暗），并作为阴影代理投射柔和 VSM 阴影
//        （额头上的发丝投影、远光侧的自阴影）。
import * as THREE from 'three';

export const STRAND_DEFAULTS = {
  guides: 2200,
  childrenPerGuide: 14,
  step: 0.0022,
  maxLength: 0.5,
  surfaceSnap: 0.6,
  maxSurfaceDist: 0.0038,
  tipAlpha: 0.1,
  clumpWidth: 0.0062,
  clumpThickness: 0.0034,
  clump: [0.25, 0.65],
  frizz: 0.00028,
  strayRatio: 0.022,
  subClumps: 4,
  fuzzPerGuide: 1.6,
  scalpMargin: 0.0013,
  widthWorld: 0.00007,
  minPixelWidth: 0.8,
  seed: 1337,
};

// ---------- 小工具 ----------
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

class TriGrid {
  constructor(tri, cell) {
    this.tri = tri; this.cell = cell;
    const n = tri.length / 9;
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < tri.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], tri[i + k]); mx[k] = Math.max(mx[k], tri[i + k]); }
    this.min = mn.map((v) => v - cell);
    this.dim = mx.map((v, k) => Math.max(1, Math.ceil((v + cell - this.min[k]) / cell)));
    this.map = new Map();
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      const lo = [0, 1, 2].map((k) => Math.floor((Math.min(tri[o + k], tri[o + 3 + k], tri[o + 6 + k]) - this.min[k]) / cell));
      const hi = [0, 1, 2].map((k) => Math.floor((Math.max(tri[o + k], tri[o + 3 + k], tri[o + 6 + k]) - this.min[k]) / cell));
      for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
        const key = (x * this.dim[1] + y) * this.dim[2] + z;
        let a = this.map.get(key); if (!a) { a = []; this.map.set(key, a); } a.push(t);
      }
    }
    this._stamp = new Uint32Array(n); this._iter = 1;
  }
  // 最近三角形（在 3×3×3 邻域内）；out = {t, d2, x,y,z, u,v,w}
  closest(px, py, pz, out, ring = 1) {
    const c = this.cell, mn = this.min, dim = this.dim;
    const cx = Math.floor((px - mn[0]) / c), cy = Math.floor((py - mn[1]) / c), cz = Math.floor((pz - mn[2]) / c);
    out.t = -1; out.d2 = Infinity;
    const it = ++this._iter; const st = this._stamp;
    for (let x = cx - ring; x <= cx + ring; x++) for (let y = cy - ring; y <= cy + ring; y++) for (let z = cz - ring; z <= cz + ring; z++) {
      if (x < 0 || y < 0 || z < 0 || x >= dim[0] || y >= dim[1] || z >= dim[2]) continue;
      const a = this.map.get((x * dim[1] + y) * dim[2] + z); if (!a) continue;
      for (let i = 0; i < a.length; i++) { const t = a[i]; if (st[t] === it) continue; st[t] = it; closestPtTri(px, py, pz, this.tri, t * 9, out, t); }
    }
    return out.t >= 0;
  }
}

const _r = { x: 0, y: 0, z: 0, u: 0, v: 0, w: 0 };
// Ericson, Real-Time Collision Detection 5.1.5
function closestPtTri(px, py, pz, T, o, out, tIdx) {
  const ax = T[o], ay = T[o + 1], az = T[o + 2], bx = T[o + 3], by = T[o + 4], bz = T[o + 5], cx = T[o + 6], cy = T[o + 7], cz = T[o + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  let u, v, w;
  if (d1 <= 0 && d2 <= 0) { u = 1; v = 0; w = 0; } else {
    const bpx = px - bx, bpy = py - by, bpz = pz - bz;
    const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) { u = 0; v = 1; w = 0; } else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); u = 1 - t; v = t; w = 0; } else {
        const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
        const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) { u = 0; v = 0; w = 1; } else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); u = 1 - t; v = 0; w = t; } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); u = 0; v = 1 - t; w = t; } else {
              const den = 1 / (va + vb + vc); v = vb * den; w = vc * den; u = 1 - v - w;
            }
          }
        }
      }
    }
  }
  const x = u * ax + v * bx + w * cx, y = u * ay + v * by + w * cy, z = u * az + v * bz + w * cz;
  const dd = (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
  if (dd < out.d2) { out.d2 = dd; out.t = tIdx; out.x = x; out.y = y; out.z = z; out.u = u; out.v = v; out.w = w; }
}

function triSoup(geom, matrix) {
  const pos = geom.attributes.position, uv = geom.attributes.uv;
  const idx = geom.index ? geom.index.array : null;
  const n = idx ? idx.length / 3 : pos.count / 3;
  const P = new Float32Array(n * 9), U = uv ? new Float32Array(n * 6) : null;
  const v = new THREE.Vector3();
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) {
    const i = idx ? idx[t * 3 + k] : t * 3 + k;
    v.fromBufferAttribute(pos, i); if (matrix) v.applyMatrix4(matrix);
    P[t * 9 + k * 3] = v.x; P[t * 9 + k * 3 + 1] = v.y; P[t * 9 + k * 3 + 2] = v.z;
    if (U) { U[t * 6 + k * 2] = uv.getX(i); U[t * 6 + k * 2 + 1] = uv.getY(i); }
  }
  return { P, U, n };
}

/** 读取头部当前（含 morph）形状 → 三角形汤 */
export function morphedHeadSoup(mesh, useLocal = false) {
  const g = mesh.geometry; const base = g.attributes.position;
  const out = new THREE.BufferGeometry();
  const arr = new Float32Array(base.array.length); arr.set(base.array);
  const inf = mesh.morphTargetInfluences || [];
  const ma = g.morphAttributes.position || [];
  for (let m = 0; m < ma.length; m++) {
    const w = inf[m]; if (!w) continue;
    const a = ma[m];
    for (let i = 0; i < base.count; i++) { arr[i * 3] += a.getX(i) * w; arr[i * 3 + 1] += a.getY(i) * w; arr[i * 3 + 2] += a.getZ(i) * w; }
  }
  out.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  if (g.index) out.setIndex(g.index);
  if (useLocal) {
    mesh.updateMatrix();
    return triSoup(out, mesh.matrix);
  }
  mesh.updateWorldMatrix(true, false);
  return triSoup(out, mesh.matrixWorld);
}

export function alphaSamplerFromTexture(tex) {
  const img = tex?.image;
  if (!img || !img.width) return () => 1;
  const W = Math.min(1024, img.width), H = Math.min(1024, img.height);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const flip = tex.flipY;
  return (u, v) => {
    u -= Math.floor(u); v -= Math.floor(v);
    const x = Math.min(W - 1, Math.floor(u * W)); const y = Math.min(H - 1, Math.floor((flip ? 1 - v : v) * H));
    return d[(y * W + x) * 4 + 3] / 255;
  };
}

/**
 * @param hairGeom  发片 BufferGeometry（position/uv/index）
 * @param hairMatrix 发片到头部坐标的矩阵
 * @param alphaAt   (u,v)=>alpha
 * @param headSoup  morphedHeadSoup(headMesh)
 */
export function generateStrands(hairGeom, hairMatrix, alphaAt, headSoup, opts = {}) {
  const o = { ...STRAND_DEFAULTS, ...opts };
  const rnd = mulberry32(o.seed);
  const t0 = performance.now();
  let P, U, n, triAlphaFn;
  if (Array.isArray(hairGeom)) {
    const soups = hairGeom.map((entry) => ({
      ...triSoup(entry.geom, entry.matrix),
      alphaAt: entry.alphaAt || (() => 1),
    })).filter((s) => s.n > 0 && s.U);
    n = soups.reduce((acc, s) => acc + s.n, 0);
    P = new Float32Array(n * 9);
    U = new Float32Array(n * 6);
    const fns = new Array(n);
    let off = 0;
    for (const s of soups) {
      P.set(s.P, off * 9);
      U.set(s.U, off * 6);
      for (let i = 0; i < s.n; i++) fns[off + i] = s.alphaAt;
      off += s.n;
    }
    triAlphaFn = (t, u, v) => fns[t](u, v);
  } else {
    const single = triSoup(hairGeom, hairMatrix);
    P = single.P; U = single.U; n = single.n;
    triAlphaFn = (_t, u, v) => alphaAt(u, v);
  }
  if (!n || !U) return null;
  // 每个三角形的发丝方向 dP/dv、法线、面积、平均 alpha
  const dir = new Float32Array(n * 3), area = new Float32Array(n), tAlpha = new Float32Array(n);
  for (let t = 0; t < n; t++) {
    const o9 = t * 9, o6 = t * 6;
    const e1x = P[o9 + 3] - P[o9], e1y = P[o9 + 4] - P[o9 + 1], e1z = P[o9 + 5] - P[o9 + 2];
    const e2x = P[o9 + 6] - P[o9], e2y = P[o9 + 7] - P[o9 + 1], e2z = P[o9 + 8] - P[o9 + 2];
    const du1 = U[o6 + 2] - U[o6], dv1 = U[o6 + 3] - U[o6 + 1], du2 = U[o6 + 4] - U[o6], dv2 = U[o6 + 5] - U[o6 + 1];
    const det = du1 * dv2 - du2 * dv1;
    let bx = 0, by = -1, bz = 0;
    if (Math.abs(det) > 1e-12) { bx = (-du2 * e1x + du1 * e2x) / det; by = (-du2 * e1y + du1 * e2y) / det; bz = (-du2 * e1z + du1 * e2z) / det; }
    const l = Math.hypot(bx, by, bz) || 1; dir[t * 3] = bx / l; dir[t * 3 + 1] = by / l; dir[t * 3 + 2] = bz / l;
    const cxp = e1y * e2z - e1z * e2y, cyp = e1z * e2x - e1x * e2z, czp = e1x * e2y - e1y * e2x;
    area[t] = 0.5 * Math.hypot(cxp, cyp, czp);
    tAlpha[t] = triAlphaFn(t, (U[o6] + U[o6 + 2] + U[o6 + 4]) / 3, (U[o6 + 1] + U[o6 + 3] + U[o6 + 5]) / 3);
  }
  const grid = new TriGrid(P, 0.006);
  const head = new TriGrid(headSoup.P, 0.01);
  // 头部中心（用于体积法线 / AO）
  const hc = [0, 0, 0]; { let k = 0; for (let i = 0; i < headSoup.P.length; i += 3) { hc[0] += headSoup.P[i]; hc[1] += headSoup.P[i + 1]; hc[2] += headSoup.P[i + 2]; k++; } hc[0] /= k; hc[1] /= k; hc[2] /= k; }
  const q = { t: -1, d2: 0, x: 0, y: 0, z: 0, u: 0, v: 0, w: 0 };
  const hq = { t: -1, d2: 0, x: 0, y: 0, z: 0, u: 0, v: 0, w: 0 };
  const uvAt = (t, b) => [U[t * 6] * b.u + U[t * 6 + 2] * b.v + U[t * 6 + 4] * b.w, U[t * 6 + 1] * b.u + U[t * 6 + 3] * b.v + U[t * 6 + 5] * b.w];

  // 种子：按 面积 × alpha 加权
  const cdf = new Float64Array(n); let acc = 0;
  for (let t = 0; t < n; t++) { acc += area[t] * (tAlpha[t] > 0.35 ? tAlpha[t] : 0); cdf[t] = acc; }
  if (acc <= 0) return null;
  const pickTri = () => { const r = rnd() * acc; let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m; } return lo; };

  const occ = new Map(); const occCell = o.occCell || 0.0028;
  const occKey = (x, y, z) => `${Math.floor(x / occCell)},${Math.floor(y / occCell)},${Math.floor(z / occCell)}`;

  function traceDir(sx, sy, sz, sign, isTipward) {
    const pts = [];
    let px = sx, py = sy, pz = sz, pdx = 0, pdy = 0, pdz = 0, len = 0;
    for (let s = 0; s < 400 && len < o.maxLength; s++) {
      if (!grid.closest(px, py, pz, q)) break;
      let dx = dir[q.t * 3] * sign, dy = dir[q.t * 3 + 1] * sign, dz = dir[q.t * 3 + 2] * sign;
      if (s > 0) {
        if (dx * pdx + dy * pdy + dz * pdz < 0) { dx = -dx; dy = -dy; dz = -dz; }
        const c = dx * pdx + dy * pdy + dz * pdz; if (c < 0.35) break; // 急转弯 = 进入了另一张发片
        dx = pdx * 0.45 + dx * 0.55; dy = pdy * 0.45 + dy * 0.55; dz = pdz * 0.45 + dz * 0.55;
        const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      }
      let nx = px + dx * o.step, ny = py + dy * o.step, nz = pz + dz * o.step;
      if (!grid.closest(nx, ny, nz, q)) break;
      if (Math.sqrt(q.d2) > o.maxSurfaceDist) break;
      nx += (q.x - nx) * o.surfaceSnap; ny += (q.y - ny) * o.surfaceSnap; nz += (q.z - nz) * o.surfaceSnap;
      const [uu, vv] = uvAt(q.t, q);
      const a = triAlphaFn(q.t, uu, vv);
      if (a < o.tipAlpha) { if (isTipward) pts.push([nx, ny, nz]); break; }
      pts.push([nx, ny, nz]);
      len += Math.hypot(nx - px, ny - py, nz - pz);
      pdx = dx; pdy = dy; pdz = dz; px = nx; py = ny; pz = nz;
    }
    return pts;
  }
  const headDist = (p) => { if (!head.closest(p[0], p[1], p[2], hq, 2)) return 1; return Math.sqrt(hq.d2); };

  const guides = [];
  let attempts = 0;
  while (guides.length < o.guides && attempts < o.guides * 10) {
    attempts++;
    const t = pickTri();
    let a = rnd(), b = rnd(); if (a + b > 1) { a = 1 - a; b = 1 - b; }
    const o9 = t * 9;
    const sx = P[o9] * (1 - a - b) + P[o9 + 3] * a + P[o9 + 6] * b;
    const sy = P[o9 + 1] * (1 - a - b) + P[o9 + 4] * a + P[o9 + 7] * b;
    const sz = P[o9 + 2] * (1 - a - b) + P[o9 + 5] * a + P[o9 + 8] * b;
    const k = occKey(sx, sy, sz); if ((occ.get(k) || 0) >= 2) continue;
    const fwd = traceDir(sx, sy, sz, 1, true);
    const back = traceDir(sx, sy, sz, -1, true);
    let pts = back.reverse().concat([[sx, sy, sz]], fwd);
    if (pts.length < 6) continue;
    // 发根 = 离头皮近的一端
    if (headDist(pts[pts.length - 1]) < headDist(pts[0])) pts.reverse();
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
    if (L < 0.014) continue;
    for (const p of pts) { const kk = occKey(p[0], p[1], p[2]); occ.set(kk, (occ.get(kk) || 0) + 1); }
    guides.push(resample(pts, L));
  }
  // 发丝不穿头皮：推到头皮外 scalpMargin
  for (const g of guides) for (const p of g.p) {
    if (!head.closest(p[0], p[1], p[2], hq, 1)) continue;
    const ht = hq.t * 9, T = headSoup.P;
    const e1 = [T[ht + 3] - T[ht], T[ht + 4] - T[ht + 1], T[ht + 5] - T[ht + 2]], e2 = [T[ht + 6] - T[ht], T[ht + 7] - T[ht + 1], T[ht + 8] - T[ht + 2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    // 确保法线朝外
    if (nx * (hq.x - hc[0]) + ny * (hq.y - hc[1]) + nz * (hq.z - hc[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const sd = (p[0] - hq.x) * nx + (p[1] - hq.y) * ny + (p[2] - hq.z) * nz;
    if (sd < o.scalpMargin) { const k2 = o.scalpMargin - sd; p[0] += nx * k2; p[1] += ny * k2; p[2] += nz * k2; }
  }
  const tGuides = performance.now();
  const strands = buildChildren(guides, hc, o, rnd);
  return { ...strands, guides: guides.length, headCenter: hc, ms: { guides: tGuides - t0, children: performance.now() - tGuides } };
}

function resample(pts, L) {
  const N = Math.max(6, Math.min(30, Math.round(L / 0.009) + 2));
  const out = []; const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = (i / (N - 1)) * L;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const f = Math.min(1, Math.max(0, (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j])));
    out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f, pts[j][2] + (pts[j + 1][2] - pts[j][2]) * f]);
  }
  // 轻微平滑（去掉追踪锯齿）
  for (let it = 0; it < 2; it++) for (let i = 1; i < N - 1; i++) for (let k = 0; k < 3; k++) out[i][k] = out[i][k] * 0.5 + (out[i - 1][k] + out[i + 1][k]) * 0.25;
  return { p: out, L };
}

function buildChildren(guides, hc, o, rnd) {
  // ---- 体积 AO：发丝密度体素 + 沿“离开头部”方向的射线累积（简化版 Deep Opacity）----
  // 旧做法“方位分箱求外轮廓半径”在马尾/盘发上失效：脑后马尾把整个方位的外轮廓推得很远，侧面头发被误判为“很深”而全黑。
  const VX = 0.004;
  let mnx = 1e9, mny = 1e9, mnz = 1e9, mxx = -1e9, mxy = -1e9, mxz = -1e9;
  for (const g of guides) for (const p of g.p) { mnx = Math.min(mnx, p[0]); mny = Math.min(mny, p[1]); mnz = Math.min(mnz, p[2]); mxx = Math.max(mxx, p[0]); mxy = Math.max(mxy, p[1]); mxz = Math.max(mxz, p[2]); }
  mnx -= 0.03; mny -= 0.03; mnz -= 0.03; mxx += 0.03; mxy += 0.03; mxz += 0.03;
  const GX = Math.ceil((mxx - mnx) / VX), GY = Math.ceil((mxy - mny) / VX), GZ = Math.ceil((mxz - mnz) / VX);
  const dens = new Float32Array(GX * GY * GZ);
  const vidx = (x, y, z) => { const i = Math.floor((x - mnx) / VX), j = Math.floor((y - mny) / VX), k = Math.floor((z - mnz) / VX); return (i < 0 || j < 0 || k < 0 || i >= GX || j >= GY || k >= GZ) ? -1 : (k * GY + j) * GX + i; };
  // 引导发按弧长每 2mm 沉积一次（权重 = 一缕的发量）
  for (const g of guides) for (let i = 1; i < g.p.length; i++) {
    const A = g.p[i - 1], B = g.p[i]; const seg = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]); const n = Math.max(1, Math.ceil(seg / 0.002));
    for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; const id = vidx(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f); if (id >= 0) dens[id] += 1; }
  }
  const aoAt = (px, py, pz) => {
    let dx = px - hc[0], dy = py - hc[1], dz = pz - hc[2]; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    let acc = 0;
    for (let st = 1; st <= 7; st++) { const d = 0.0025 + st * 0.003; const id = vidx(px + dx * d, py + dy * d, pz + dz * d); if (id >= 0) acc += dens[id]; }
    return 0.16 + 0.84 * Math.exp(-acc * 0.055);
  };

  // ---- 容量预估：子发 C×N + 绒毛碎发（固定 FUZZ_N 点）----
  const C = o.childrenPerGuide, FUZZ_N = 9;
  const fuzzPer = o.fuzzPerGuide;
  let cap = 0; for (const g of guides) cap += g.p.length * C + Math.ceil(fuzzPer + 1) * FUZZ_N;
  const pos = new Float32Array(cap * 6), tan = new Float32Array(cap * 6);
  const side = new Float32Array(cap * 2), tt = new Float32Array(cap * 2), rr = new Float32Array(cap * 2), ao = new Float32Array(cap * 2), ww = new Float32Array(cap * 2);
  const index = new Uint32Array(cap * 6);
  let vp = 0, ip = 0, strandCount = 0, fuzzCount = 0, strayCount = 0;

  const emit = (px, py, pz, t, sr, occl, wmul, last, base, i) => {
    for (let sd = 0; sd < 2; sd++) {
      const v = vp + sd;
      pos[v * 3] = px; pos[v * 3 + 1] = py; pos[v * 3 + 2] = pz;
      side[v] = sd ? 1 : -1; tt[v] = t; rr[v] = sr; ao[v] = occl; ww[v] = wmul;
    }
    if (!last) { const a0 = base + i * 2; index[ip++] = a0; index[ip++] = a0 + 1; index[ip++] = a0 + 2; index[ip++] = a0 + 1; index[ip++] = a0 + 3; index[ip++] = a0 + 2; }
    vp += 2;
  };

  const Tn = [], Nn = [], Bn = [];
  for (const g of guides) {
    const N = g.p.length;
    // 平行移动标架（Frenet 在直线段会翻转，不能用）
    for (let i = 0; i < N; i++) {
      const a = g.p[Math.max(0, i - 1)], b = g.p[Math.min(N - 1, i + 1)];
      let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...t) || 1; t = t.map((v) => v / l); Tn[i] = t;
      let nrm;
      if (i === 0) { const p = g.p[0]; nrm = [p[0] - hc[0], p[1] - hc[1], p[2] - hc[2]]; } else nrm = Nn[i - 1].slice();
      const d = nrm[0] * t[0] + nrm[1] * t[1] + nrm[2] * t[2]; nrm = [nrm[0] - t[0] * d, nrm[1] - t[1] * d, nrm[2] - t[2] * d];
      const nl = Math.hypot(...nrm) || 1; nrm = nrm.map((v) => v / nl); Nn[i] = nrm;
      Bn[i] = [t[1] * nrm[2] - t[2] * nrm[1], t[2] * nrm[0] - t[0] * nrm[2], t[0] * nrm[1] - t[1] * nrm[0]];
    }
    // 沿引导发取样（s 可超出 1：沿末端切线外推，用于飞发/长短不齐）
    const frameAt = (s01) => {
      const s = s01 * (N - 1);
      if (s >= N - 1) { const ex = (s - (N - 1)) * (g.L / (N - 1)); const P = g.p[N - 1], T = Tn[N - 1]; return [[P[0] + T[0] * ex, P[1] + T[1] * ex, P[2] + T[2] * ex], T, Nn[N - 1], Bn[N - 1]]; }
      const i0 = Math.max(0, Math.min(N - 2, Math.floor(s))); const f = s - i0;
      const L3 = (A, B) => [A[i0][0] + (B[i0 + 1][0] - A[i0][0]) * f, A[i0][1] + (B[i0 + 1][1] - A[i0][1]) * f, A[i0][2] + (B[i0 + 1][2] - A[i0][2]) * f];
      return [L3(g.p, g.p), L3(Tn, Tn), L3(Nn, Nn), L3(Bn, Bn)];
    };
    // 两级成缕：每根引导发内部再分 subClumps 个小缕，小缕中心在椭圆截面内
    const SC = o.subClumps; const sub = [];
    for (let k = 0; k < SC; k++) sub.push([(rnd() * 1.2 - 0.2) * o.clumpThickness * 0.8, (rnd() * 2 - 1) * o.clumpWidth * 0.8, 0.55 + rnd() * 0.4]);
    for (let c = 0; c < C; c++) {
      let oa = (rnd() * 1.25 - 0.25) * o.clumpThickness, ob = (rnd() * 2 - 1) * o.clumpWidth;
      const sc = sub[c % SC];
      const clumpMain = o.clump[0] + rnd() * (o.clump[1] - o.clump[0]);
      const loose = rnd() < 0.12; // 12% 的发丝不跟随成缕（缕与缕之间的“散发”）
      const stray = rnd() < o.strayRatio; // 飞发：中途离开发束，弧形翘出
      // 发梢长短不齐：幂分布，大多数接近全长，少数明显更短 → 发片原本整齐的“剪切边”被打散
      const tEnd = stray ? 0.8 + rnd() * 0.22 : 1 - Math.pow(rnd(), 1.6) * 0.38;
      const fr = o.frizz * (0.5 + rnd()) * (rnd() < 0.08 ? 3.5 : 1); const fk = 2 + rnd() * 5; const fph = rnd() * 6.283;
      const strayT0 = 0.25 + rnd() * 0.5, strayAmp = 0.003 + rnd() * 0.009, strayB = rnd() * 2 - 1, strayCurl = (rnd() * 2 - 1) * 0.009;
      const sr = rnd();
      const wmul = stray ? 0.55 : (0.75 + rnd() * 0.5);
      const base = vp;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const [gp, gT, gN, gB] = frameAt(t * tEnd);
        // 子发向小缕收拢、小缕向引导发收拢（越到发梢越紧）
        const tp = Math.pow(t, 1.3);
        const kSub = loose ? 0.1 * tp : sc[2] * tp * 0.8;
        const kMain = clumpMain * tp * 0.6;
        let a = oa + (sc[0] - oa) * kSub, b = ob + (sc[1] - ob) * kSub;
        a *= (1 - kMain); b *= (1 - kMain);
        const wave = Math.sin(fph + t * fk * 6.283) * fr * (0.3 + t);
        const wave2 = Math.cos(fph * 1.7 + t * fk * 4.1) * fr * (0.3 + t);
        let flyN = 0, flyL = 0;
        if (stray && t > strayT0) { const u = (t - strayT0) / (1 - strayT0); flyN = strayAmp * u * u; flyL = strayAmp * 0.7 * strayB * u * u + strayCurl * Math.sin(u * 3.0); }
        const dn = a + wave + flyN, db = b + wave2 + flyL;
        const px = gp[0] + gN[0] * dn + gB[0] * db, py = gp[1] + gN[1] * dn + gB[1] * db, pz = gp[2] + gN[2] * dn + gB[2] * db;
        emit(px, py, pz, t, sr, aoAt(px, py, pz) * (loose ? 1.0 : 0.92 + 0.08 * (1 - kSub)), wmul, i === N - 1, base, i);
      }
      strandCount++; if (stray) strayCount++;
    }
    // 绒毛碎发：沿发束表面贴着长出的短细发，起点随机，卷曲、离开表面，带来轮廓上的“毛茸茸”光晕和发际线的柔边
    const nf = Math.floor(fuzzPer) + (rnd() < fuzzPer % 1 ? 1 : 0);
    for (let f = 0; f < nf; f++) {
      const s0 = rnd() * 0.7, len = 0.006 + rnd() * 0.018;
      const ds = len / Math.max(g.L, 1e-4);
      const oa = (rnd() * 1.1) * o.clumpThickness, ob = (rnd() * 2 - 1) * o.clumpWidth * 1.1;
      const lift = 0.0015 + rnd() * 0.004, curl = (rnd() * 2 - 1) * 0.004, ph = rnd() * 6.28, sr = rnd();
      const base = vp;
      for (let i = 0; i < FUZZ_N; i++) {
        const u = i / (FUZZ_N - 1);
        const [gp, , gN, gB] = frameAt(Math.min(1, s0 + ds * u));
        const dn = oa + lift * u * u + Math.sin(ph + u * 5) * 0.0004;
        const db = ob + curl * u * u + Math.cos(ph + u * 4) * 0.0005;
        const px = gp[0] + gN[0] * dn + gB[0] * db, py = gp[1] + gN[1] * dn + gB[1] * db, pz = gp[2] + gN[2] * dn + gB[2] * db;
        emit(px, py, pz, 0.35 + 0.65 * u, sr, aoAt(px, py, pz), 0.45, i === FUZZ_N - 1, base, i);
      }
      fuzzCount++;
    }
  }
  // 用实际位置重算切线（同一根发丝内相邻点：t 递增）
  for (let v = 0; v < vp; v += 2) {
    const tcur = tt[v];
    const hasPrev = v >= 2 && tt[v - 2] < tcur, hasNext = v + 2 < vp && tt[v + 2] > tcur;
    const prev = hasPrev ? v - 2 : v, next = hasNext ? v + 2 : v;
    let dx = pos[next * 3] - pos[prev * 3], dy = pos[next * 3 + 1] - pos[prev * 3 + 1], dz = pos[next * 3 + 2] - pos[prev * 3 + 2];
    const l = Math.hypot(dx, dy, dz); if (l < 1e-9) continue; dx /= l; dy /= l; dz /= l;
    for (let s = 0; s < 2; s++) { tan[(v + s) * 3] = dx; tan[(v + s) * 3 + 1] = dy; tan[(v + s) * 3 + 2] = dz; }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, vp * 3), 3));
  geom.setAttribute('aTan', new THREE.BufferAttribute(tan.subarray(0, vp * 3), 3));
  geom.setAttribute('aSide', new THREE.BufferAttribute(side.subarray(0, vp), 1));
  geom.setAttribute('aT', new THREE.BufferAttribute(tt.subarray(0, vp), 1));
  geom.setAttribute('aRand', new THREE.BufferAttribute(rr.subarray(0, vp), 1));
  geom.setAttribute('aAO', new THREE.BufferAttribute(ao.subarray(0, vp), 1));
  geom.setAttribute('aW', new THREE.BufferAttribute(ww.subarray(0, vp), 1));
  geom.setIndex(new THREE.BufferAttribute(index.subarray(0, ip), 1));
  geom.computeBoundingSphere();
  geom.boundingSphere.radius += 0.02;
  const aoS = Array.from(ao.subarray(0, vp).filter((_, i) => i % 50 === 0)).sort((x, y) => x - y);
  const aoStats = [0.1, 0.5, 0.9].map((q) => +aoS[Math.floor(q * (aoS.length - 1))].toFixed(3));
  return { aoStats, geometry: geom, strandCount: strandCount + fuzzCount, mainStrands: strandCount, fuzz: fuzzCount, strays: strayCount, vertexCount: vp };
}

// ---------------- 发丝着色器（Marschner 三瓣近似 + Kajiya 漫反射） ----------------
export const STRAND_SHADING_DEFAULTS = {
  color: [0.024, 0.017, 0.014],
  gainR: 1.15, gainTT: 1.0, gainTRT: 1.8, gainDiffuse: 1.0,
  alphaR: -0.07, betaR: 0.085,
  colorVariation: 0.32,
  tipLighten: 0.18,
};

export function createStrandMaterial(headCenter, opts = {}) {
  const o = { ...STRAND_SHADING_DEFAULTS, ...opts };
  const mat = new THREE.MeshStandardMaterial({
    name: 'PhotorealStrandHair', color: new THREE.Color(...o.color), roughness: 0.6, metalness: 0,
    side: THREE.DoubleSide, envMapIntensity: 0.18, alphaToCoverage: true,
  });
  mat.userData.builtInHair = true;
  mat.userData.isMasterStrandHair = true;
  const u = {
    uHeadCenter: { value: new THREE.Vector3(...headCenter) },
    uWidth: { value: STRAND_DEFAULTS.widthWorld },
    uMinPx: { value: STRAND_DEFAULTS.minPixelWidth },
    uPxScale: { value: 0.0003 },
    uGainR: { value: o.gainR }, uGainTT: { value: o.gainTT }, uGainTRT: { value: o.gainTRT }, uGainD: { value: o.gainDiffuse },
    uAlphaR: { value: o.alphaR }, uBetaR: { value: o.betaR },
    uColorVar: { value: o.colorVariation }, uTipLighten: { value: o.tipLighten }, uCovGain: { value: 1.6 }, uMinAlpha: { value: 0.82 },
    uHairOmbreMix: { value: Number(o.hairOmbreMix ?? 0.0) },
    uHairTipColor: { value: new THREE.Color(o.hairTipColor || '#4a3528') },
  };
  mat.userData.strandUniforms = u;
  mat.userData.hairShaderUniforms = u;
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aTan; attribute float aSide; attribute float aT; attribute float aRand; attribute float aAO; attribute float aW;
        uniform vec3 uHeadCenter; uniform float uWidth, uMinPx, uPxScale;
        varying vec3 vHT; varying float vT, vRand, vAO, vCov, vW;`)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(position - uHeadCenter);')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vec3 tV = normalize(mat3(modelViewMatrix) * aTan);
        vHT = tV; vT = aT; vRand = aRand; vAO = aAO; vW = aW;
        vec3 vd = normalize(-mvPosition.xyz);
        vec3 sd = cross(tV, vd); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
        float px = uPxScale * max(-mvPosition.z, 0.01);
        float modelScale = length(modelViewMatrix[0].xyz);
        // 细线覆盖率抗锯齿（phone-wire AA）：真实发径 0.07mm 远小于 1 像素，
        // 画成 >= uMinPx 像素宽、再用 alpha = 真实宽/绘制宽 交给 alpha-to-coverage，避免“毛线粗”或断成虚线
        float rootTaper = mix(0.5, 1.0, smoothstep(0.0, 0.1, aT));
        float tipTaper = 1.0 - 0.8 * smoothstep(0.55, 1.0, aT);
        float trueW = uWidth * modelScale * aW * rootTaper * tipTaper;
        float drawW = max(trueW, uMinPx * px);
        vCov = clamp(trueW / max(drawW, 1e-7), 0.0, 1.0);
        mvPosition.xyz += sd * aSide * 0.5 * drawW;
        gl_Position = projectionMatrix * mvPosition;`);
    const lights = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      /void RE_Direct_Physical\([\s\S]*?\n}\n/,
      `void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
        vec3 T = gHairT; vec3 L = directLight.direction; vec3 V = geometryViewDir; vec3 N = geometryNormal;
        float sI = clamp(dot(T, L), -0.999, 0.999), sR = clamp(dot(T, V), -0.999, 0.999);
        float thI = asin(sI), thR = asin(sR);
        float thH = 0.5 * (thI + thR), thD = 0.5 * (thR - thI);
        float cosD = max(cos(thD), 0.2);
        vec3 Lp = L - T * sI, Vp = V - T * sR;
        float cosPhi = clamp(dot(Lp, Vp) * inversesqrt(max(dot(Lp, Lp) * dot(Vp, Vp), 1e-6)), -1.0, 1.0);
        float cosHalfPhi = sqrt(clamp(0.5 + 0.5 * cosPhi, 0.0, 1.0));
        float bR = uBetaR * (0.8 + 0.4 * fract(vRand * 7.31));
        // 每根发丝表皮鳞片倾角不同 + 沿发长的微小起伏 → 高光碎成一条条闪丝，而不是一整片灰光
        float aR = uAlphaR + (fract(vRand * 13.7) - 0.5) * 0.12 + sin(vT * 23.0 + vRand * 61.0) * 0.035;
        float MR = hairGauss(thH - aR, bR);
        float MTT = hairGauss(thH + aR * 0.5, bR * 0.5);
        float MTRT = hairGauss(thH + aR * 1.5, bR * 2.0);
        float f = 0.0465 + (1.0 - 0.0465) * pow(1.0 - sqrt(clamp(0.5 + 0.5 * dot(L, V), 0.0, 1.0)), 5.0);
        float NR = 0.25 * cosHalfPhi * f;
        vec3 Tabs = pow(max(gHairBase, vec3(1e-4)), vec3(0.5 / cosD));
        vec3 NTT = (1.0 - f) * (1.0 - f) * Tabs * exp(-3.65 * cosPhi - 3.98);
        vec3 NTRT = (1.0 - f) * (1.0 - f) * f * Tabs * Tabs * exp(17.0 * cosPhi - 16.78);
        float sv = 0.25 + 1.5 * fract(vRand * 3.97);
        vec3 spec = sv * vec3(MR * NR * uGainR) + MTT * NTT * uGainTT + MTRT * NTRT * uGainTRT;
        float kd = sqrt(max(0.0, 1.0 - sI * sI));
        float vol = clamp((dot(N, L) + 0.6) / 1.6, 0.0, 1.0);
        vec3 diff = BRDF_Lambert(material.diffuseColor) * kd * mix(0.18, 1.0, vol) * uGainD;
        reflectedLight.directDiffuse += directLight.color * diff;
        reflectedLight.directSpecular += directLight.color * spec * gHairAO * gHairAO * mix(0.35, 1.0, vol);
      }
`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uGainR, uGainTT, uGainTRT, uGainD, uAlphaR, uBetaR, uColorVar, uTipLighten;
        uniform float uHairOmbreMix; uniform vec3 uHairTipColor;
        varying vec3 vHT; varying float vT, vRand, vAO, vCov, vW;
        uniform float uCovGain, uMinAlpha;
        vec3 gHairT = vec3(0.0, 1.0, 0.0); vec3 gHairBase = vec3(0.03); float gHairAO = 1.0;
        float hairGauss(float x, float b) { return exp(-x * x / (2.0 * b * b)) / (2.5066283 * b); }`)
      .replace('#include <lights_physical_pars_fragment>', lights)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, uHairTipColor * 0.18, smoothstep(0.32, 0.92, vT) * clamp(uHairOmbreMix, 0.0, 1.0));
        diffuseColor.rgb *= (1.0 - uColorVar * 0.5 + uColorVar * vRand) * (1.0 + uTipLighten * vT * vT);
        gHairBase = diffuseColor.rgb;
        gHairAO = vAO;
        diffuseColor.rgb *= vAO;
        // 覆盖率 + 随机抖动（MSAA 只有 4 个样本，alpha < 1/8 会直接消失；抖动让期望值正确）
        float hcov = fract(sin(dot(gl_FragCoord.xy + vRand * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
        // 发量主体基本不透明（真实头发是几十层叠在一起的），只有发梢、飞发、绒毛才半透明
        float aBody = max(vCov * uCovGain, uMinAlpha);
        float tipFade = 1.0 - 0.7 * smoothstep(0.7, 1.0, vT);
        float thin = vW < 0.6 ? 0.55 : 1.0;
        diffuseColor.a = clamp(aBody * tipFade * thin + (hcov - 0.5) * 0.12, 0.0, 1.0);`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        normal = normalize(vNormal);
        gHairT = normalize(vHT);`);
  };
  mat.customProgramCacheKey = () => 'photoreal-strand-hair-v2';
  return mat;
}

export function setStrandParams(mat, p) {
  const u = mat.userData.strandUniforms; if (!u) return;
  if (p.color) mat.color.setRGB(...p.color);
  if (p.gainR != null) u.uGainR.value = p.gainR;
  if (p.gainTT != null) u.uGainTT.value = p.gainTT;
  if (p.gainTRT != null) u.uGainTRT.value = p.gainTRT;
  if (p.minPx != null) u.uMinPx.value = p.minPx;
  if (p.pxScale != null) u.uPxScale.value = p.pxScale;
  if (p.covGain != null) u.uCovGain.value = p.covGain;
}

/** 发片每个顶点到头皮的距离（用于发丝模式下只保留贴头皮的发片底衬）。超出搜索范围记为 1。 */
export function scalpDistanceAttribute(geom, matrix, headSoup) {
  const head = new TriGrid(headSoup.P, 0.01);
  const q = { t: -1, d2: 0, x: 0, y: 0, z: 0, u: 0, v: 0, w: 0 };
  const pos = geom.attributes.position; const out = new Float32Array(pos.count); const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    out[i] = head.closest(v.x, v.y, v.z, q, 2) ? Math.sqrt(q.d2) : 1;
  }
  geom.setAttribute('aScalpD', new THREE.BufferAttribute(out, 1));
}
