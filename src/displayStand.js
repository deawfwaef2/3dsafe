// 画质提升 · 中性展示底座：一个贴合颈部的车削颈托 + 圆形底台（哑光石材 + 黄铜细线）
// 颈托包住颈部下端，完全遮住颈部截面，演示只呈现“胸像式”收藏头像。
import * as THREE from 'three';

export function createDisplayStand(skinMesh) {
  const pos = skinMesh.geometry.attributes.position;
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  // 测量颈部下端（截面上方 1.2~2.6cm）的最大半径与中心
  const y0 = minY + 0.012, y1 = minY + 0.026;
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > y0 && y < y1) { cx += pos.getX(i); cz += pos.getZ(i); n++; } }
  cx /= Math.max(n, 1); cz /= Math.max(n, 1);
  let r = 0;
  // 半径取顶面以下全部颈部顶点的最大值：颈部最下沿向后外扩，只量中段会让后颈从底座侧面穿出
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < minY + 0.026) r = Math.max(r, Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz)); }
  r += 0.004;
  const top = minY + 0.024;
  const pts = [
    [0.0, minY - 0.16], [r * 2.2, minY - 0.16], [r * 2.2, minY - 0.152], [r * 2.05, minY - 0.146],
    [r * 0.95, minY - 0.12], [r * 0.78, minY - 0.07], [r * 0.86, minY - 0.02], [r * 1.0, top - 0.006],
    [r * 1.04, top], [r * 0.2, top + 0.0005], [0, top],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const lathe = new THREE.LatheGeometry(pts, 96);
  const stone = new THREE.MeshPhysicalMaterial({ color: 0x24211f, roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color(0.25, 0.22, 0.2), side: THREE.DoubleSide });
  const m = new THREE.Mesh(lathe, stone);
  m.castShadow = true; m.receiveShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.04, 0.0012, 12, 128), new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 1, roughness: 0.28 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = top - 0.0008;
  const g = new THREE.Group();
  g.name = 'DisplayStand';
  g.position.set(cx, 0, cz);
  g.add(m, ring);
  return g;
}
