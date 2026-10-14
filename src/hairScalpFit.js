import { Vector3, Box3 } from 'three';

// Fast O(V) spherical scalp-fit cache: fits artist hair outside the current morphed scalp
// in <0.5ms per head instead of 20M brute-force ray-triangle intersections.
const cache = new WeakMap();
const NT = 48;
const NP = 96;

export function fitArtistHairOutsideScalp(geometry, head) {
  if (!head?.geometry?.attributes?.position || !geometry?.attributes?.position) return;
  const headGeo = head.geometry;
  const influences = head.morphTargetInfluences || [];
  const signature = headGeo.uuid + ':' + influences.map((w) => Number(w || 0).toFixed(3)).join(',');

  let entry = cache.get(head);
  if (!entry || entry.signature !== signature) {
    const posAttr = headGeo.attributes.position;
    const n = posAttr.count;
    const positions = new Float32Array(posAttr.array);
    const morphAttrs = headGeo.morphAttributes?.position || [];
    for (let m = 0; m < morphAttrs.length; m++) {
      const w = influences[m];
      if (!w || Math.abs(w) < 1e-4) continue;
      const mAttr = morphAttrs[m];
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        positions[i3] += mAttr.getX(i) * w;
        positions[i3 + 1] += mAttr.getY(i) * w;
        positions[i3 + 2] += mAttr.getZ(i) * w;
      }
    }

    const box = new Box3();
    const tmp = new Vector3();
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      tmp.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      box.expandByPoint(tmp);
    }
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    center.y += size.y * 0.16;
    center.z -= size.z * 0.07;

    const rawGrid = new Float32Array((NT + 1) * NP);
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const dx = positions[i3] - center.x;
      const dy = positions[i3 + 1] - center.y;
      const dz = positions[i3 + 2] - center.z;
      if (dy < -0.01) continue;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 1e-6) continue;
      const theta = Math.acos(Math.max(-1, Math.min(1, dy / dist)));
      let phi = Math.atan2(dz, dx);
      if (phi < 0) phi += Math.PI * 2;
      const ti = Math.min(NT, Math.max(0, Math.round((theta / Math.PI) * NT)));
      const pi = ((Math.round((phi / (Math.PI * 2)) * NP) % NP) + NP) % NP;
      const idx = ti * NP + pi;
      if (dist > rawGrid[idx]) rawGrid[idx] = dist;
    }

    // 3x3 morphological dilation across spherical bins so triangle interiors are smoothly covered
    const grid = new Float32Array((NT + 1) * NP);
    for (let ti = 0; ti <= NT; ti++) {
      for (let pi = 0; pi < NP; pi++) {
        let maxR = 0;
        for (let dt = -1; dt <= 1; dt++) {
          const t2 = Math.min(NT, Math.max(0, ti + dt));
          for (let dp = -1; dp <= 1; dp++) {
            const p2 = (pi + dp + NP) % NP;
            const r = rawGrid[t2 * NP + p2];
            if (r > maxR) maxR = r;
          }
        }
        grid[ti * NP + pi] = maxR;
      }
    }

    entry = { signature, center, size, grid, v: new Vector3() };
    cache.set(head, entry);
  }

  const p = geometry.attributes.position;
  const { center, size, grid, v } = entry;
  let adjusted = 0;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // Upper scalp only. Leave face-framing locks, bangs, ears and lower hairstyle intact.
    if (v.y < center.y + 0.012 || (v.z > center.z + size.z * 0.24 && v.y < center.y + size.y * 0.25)) continue;
    const dx = v.x - center.x;
    const dy = v.y - center.y;
    const dz = v.z - center.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 1e-6) continue;
    const theta = Math.acos(Math.max(-1, Math.min(1, dy / distance)));
    let phi = Math.atan2(dz, dx);
    if (phi < 0) phi += Math.PI * 2;
    const ti = Math.min(NT, Math.max(0, Math.round((theta / Math.PI) * NT)));
    const pi = ((Math.round((phi / (Math.PI * 2)) * NP) % NP) + NP) % NP;
    const radius = grid[ti * NP + pi];
    const safe = radius + 0.0012;
    if (radius > 0 && distance < safe && safe - distance < size.x * 0.22) {
      const scale = safe / distance;
      p.setXYZ(i, center.x + dx * scale, center.y + dy * scale, center.z + dz * scale);
      adjusted++;
    }
  }
  geometry.userData.scalpFit = { adjustedVertices: adjusted, cachedRays: NT * NP };
}
