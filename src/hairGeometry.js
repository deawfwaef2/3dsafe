import * as THREE from 'three';

/** Repair invalid normals and smooth only same-facing, coincident UV seams.
 * Do NOT merge geometry/UVs or average front and back sides of a hair card.
 * Built-in long-hair asset contains 826 near-zero normals from its old compiler.
 */
export function repairHairNormals(geometry) {
  const p = geometry.getAttribute('position');
  const existing = geometry.getAttribute('normal');
  if (!p || !existing) return { repaired: 0, seamVertices: 0 };
  const normal = existing.clone();
  geometry.setAttribute('normal', normal);
  const sums = new Float64Array(p.count * 3);
  const largest = new Float64Array(p.count * 3);
  const area = new Float64Array(p.count);
  const index = geometry.index;
  const count = index?.count || p.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const face = new THREE.Vector3();
  for (let t = 0; t + 2 < count; t += 3) {
    const indices = [0, 1, 2].map(k => index ? index.getX(t + k) : t + k);
    a.fromBufferAttribute(p, indices[0]); b.fromBufferAttribute(p, indices[1]); c.fromBufferAttribute(p, indices[2]);
    face.crossVectors(b.sub(a), c.sub(a));
    const length = face.length();
    if (length < 1e-15) continue;
    for (const i of indices) {
      sums[i * 3] += face.x; sums[i * 3 + 1] += face.y; sums[i * 3 + 2] += face.z;
      if (length > area[i]) {
        area[i] = length;
        largest[i * 3] = face.x; largest[i * 3 + 1] = face.y; largest[i * 3 + 2] = face.z;
      }
    }
  }
  let repaired = 0;
  const groups = new Map();
  for (let i = 0; i < p.count; i++) {
    a.fromBufferAttribute(normal, i);
    if (a.lengthSq() < .25 || !Number.isFinite(a.lengthSq())) {
      a.fromArray(sums, i * 3);
      if (a.lengthSq() < 1e-22) a.fromArray(largest, i * 3);
      if (a.lengthSq() < 1e-22) a.set(p.getX(i), p.getY(i) - .025, p.getZ(i));
      if (a.lengthSq() < 1e-22) a.set(0, 1, 0);
      repaired++;
    }
    a.normalize();
    normal.setXYZ(i, a.x, a.y, a.z);
    const key = `${Math.round(p.getX(i) * 1e6)},${Math.round(p.getY(i) * 1e6)},${Math.round(p.getZ(i) * 1e6)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  const base = normal.clone();
  let seamVertices = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const i of group) {
      a.fromBufferAttribute(base, i); c.copy(a);
      let contributors = 1;
      for (const j of group) {
        if (j === i) continue;
        b.fromBufferAttribute(base, j);
        if (a.dot(b) > .75) { c.add(b); contributors++; }
      }
      if (contributors > 1) { c.normalize(); normal.setXYZ(i, c.x, c.y, c.z); seamVertices++; }
    }
  }
  normal.needsUpdate = true;
  return { repaired, seamVertices };
}
