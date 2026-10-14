import * as THREE from 'three';

// Stage 21: Masterpiece Photorealistic Multi-Layer Silk Groom Engine
// - 5-column 3D cambered silk lock ribbons with per-vertex curve tangents (`hairTangent`)
// - Custom Marschner / Kajiya-Kay dual-lobe anisotropic hair shader (`R` cuticle + `TRT` cortex lobes)
// - Solid-core 512x512 22-fiber silk lock textures (`alphaTest: 0.22`, zero MSAA wire erosion)
// - Strict cranial-only root shadow layer (never touches forehead or temples)

const sourceCache = new Map();
let cachedSilkTextures = null;

export const GROOM_STYLES = {
  groom_photo_tied: {
    file: 'photo_tied',
    modifier: 'none',
    label: '照片同款 · 清透碎刘海露耳低束发',
  },
  groom_center_long: {
    file: 'center_long',
    modifier: 'none',
    label: '中式黑长直 · 高颅顶八字中分柔顺发',
  },
  groom_low_chignon: {
    file: 'low_chignon',
    modifier: 'none',
    label: '新中式温婉 · 侧分斜刘海低盘发髻',
  },
  groom_air_bob: {
    file: 'photo_tied',
    modifier: 'air_bob',
    label: '元气初恋 · 空气刘海内扣短波波',
  },
  groom_clavicle_bob: {
    file: 'center_long',
    modifier: 'clavicle_bob',
    label: '都市轻熟 · 八字刘海锁骨内扣发',
  },
  groom_hime_cut: {
    file: 'center_long',
    modifier: 'hime_cut',
    label: '国风清冷 · 姬发式公主切黑长直',
  },
  groom_high_ponytail: {
    file: 'photo_tied',
    modifier: 'high_ponytail',
    label: '飒爽千金 · 高颅顶露耳元气高束发',
  },
  groom_pixie_short: {
    file: 'photo_tied',
    modifier: 'pixie_short',
    label: '智感清冷 · 露耳碎发层次超短发',
  },
};

export function groomStyleFor(style) {
  const aliases = {
    hair_user_photo: 'groom_photo_tied',
    real_hair_user_photo: 'groom_photo_tied',
    hair_long01: 'groom_center_long',
    real_hair_long01: 'groom_center_long',
    hair_short04: 'groom_center_long',
    real_hair_short04: 'groom_center_long',
    hair_bob01: 'groom_air_bob',
    real_hair_bob01: 'groom_air_bob',
    hair_bob02: 'groom_clavicle_bob',
    real_hair_bob02: 'groom_clavicle_bob',
    hair_ponytail01: 'groom_high_ponytail',
    real_hair_ponytail01: 'groom_high_ponytail',
    hair_braid01: 'groom_low_chignon',
    real_hair_braid01: 'groom_low_chignon',
    hair_short02: 'groom_pixie_short',
    real_hair_short02: 'groom_pixie_short',
    real_hair_hime_cut: 'groom_hime_cut',
    real_hair_clavicle_layer: 'groom_clavicle_bob',
    real_hair_butterfly_halfup: 'groom_center_long',
  };
  return GROOM_STYLES[style] ? style : aliases[style] || null;
}

function getSilkLockTextures() {
  if (cachedSilkTextures) return cachedSilkTextures;
  if (typeof document === 'undefined') return null;

  const w = 512, h = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cctx = colorCanvas.getContext('2d');
  const cImg = cctx.createImageData(w, h);
  const cData = cImg.data;

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = w;
  alphaCanvas.height = h;
  const actx = alphaCanvas.getContext('2d');
  const aImg = actx.createImageData(w, h);
  const aData = aImg.data;

  // 22 high-contrast micro-fiber strands across each silk lock ribbon
  const fiberFreq = 22.0;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1); // 0 at root, 1 at tip
    const rootShadow = 0.58 + 0.42 * Math.min(1.0, v / 0.16);
    const tipFade = v > 0.85 ? Math.max(0.0, 1.0 - Math.pow((v - 0.85) / 0.15, 1.35)) : 1.0;

    for (let x = 0; x < w; x++) {
      const u = x / (w - 1); // 0 at left edge, 1 at right edge
      const edgeDist = Math.min(u, 1.0 - u);
      // Solid ribbon core across u in [0.06, 0.94] so bangs NEVER erode into thin 1px wires!
      const edgeSolid = Math.min(1.0, edgeDist / 0.065);

      const f1 = 0.5 + 0.5 * Math.sin((u * fiberFreq + 0.02 * Math.sin(v * 8.0)) * Math.PI * 2.0);
      const f2 = 0.5 + 0.5 * Math.sin((u * fiberFreq * 2.1 - 0.015 * Math.cos(v * 5.0) + 0.42) * Math.PI * 2.0);
      const f3 = 0.5 + 0.5 * Math.cos((u * 7.0 + 0.15) * Math.PI * 2.0);
      const fiberVal = 0.52 + 0.30 * f1 + 0.12 * f2 + 0.06 * f3;

      // Cylindrical lock arch brightness (brighter along lock spine, shadowed at lock edges for 3D clump depth)
      const lockArch = 0.76 + 0.24 * (1.0 - Math.pow(u * 2.0 - 1.0, 2.0));
      const lum = Math.min(255, Math.round(255 * rootShadow * fiberVal * lockArch));

      // Tapered multi-fiber splits at the strand tips (v > 0.76)
      const tipSplit = v > 0.76 ? (0.45 + 0.55 * f1) : 1.0;
      const alpha = Math.max(0, Math.min(255, Math.round(255 * edgeSolid * tipFade * tipSplit)));

      const idx = (y * w + x) * 4;
      cData[idx] = lum;
      cData[idx + 1] = Math.round(lum * 0.96);
      cData[idx + 2] = Math.round(lum * 0.94);
      cData[idx + 3] = 255;

      aData[idx] = alpha;
      aData[idx + 1] = alpha;
      aData[idx + 2] = alpha;
      aData[idx + 3] = 255;
    }
  }
  cctx.putImageData(cImg, 0, 0);
  actx.putImageData(aImg, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.needsUpdate = true;

  const alphaMap = new THREE.CanvasTexture(alphaCanvas);
  alphaMap.wrapS = THREE.ClampToEdgeWrapping;
  alphaMap.wrapT = THREE.ClampToEdgeWrapping;
  alphaMap.needsUpdate = true;

  cachedSilkTextures = { map, alphaMap };
  return cachedSilkTextures;
}

/**
 * Injects a dual-lobe Marschner / Kajiya-Kay anisotropic hair scattering model
 * into `MeshPhysicalMaterial` so dark hair exhibits rich 3D strand separation,
 * a primary cuticle angel-ring (`R` lobe), and warm espresso secondary glow (`TRT` lobe).
 */
function attachMarschnerHairShader(material, sheenColor) {
  material.userData.sheenVec = new THREE.Vector3(sheenColor.r, sheenColor.g, sheenColor.b);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHairSheenColor = { value: material.userData.sheenVec };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 hairTangent;
varying vec3 vHairTangentView;
varying vec2 vHairUV;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
vHairTangentView = normalize(normalMatrix * hairTangent);
vHairUV = uv;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uHairSheenColor;
varying vec3 vHairTangentView;
varying vec2 vHairUV;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `// Marschner / Kajiya-Kay dual-lobe anisotropic strand scattering
vec3 T_hair = normalize(vHairTangentView);
vec3 V_hair = normalize(vViewPosition);
vec3 N_hair = normalize(normal);

// Two studio light directions in view space (key + rim/fill)
vec3 L1_hair = normalize(vec3(0.28, 0.56, 0.78));
vec3 L2_hair = normalize(vec3(-0.46, 0.42, 0.78));
vec3 H1_hair = normalize(L1_hair + V_hair);
vec3 H2_hair = normalize(L2_hair + V_hair);

// High-frequency 22-strand micro-fiber modulation across ribbon width (vHairUV.x)
float fiberPhase = vHairUV.x * 138.23 + sin(vHairUV.y * 9.0) * 0.45;
float microFiber = 0.65 + 0.35 * sin(fiberPhase);
float lockCylinder = 0.72 + 0.28 * (1.0 - pow(vHairUV.x * 2.0 - 1.0, 2.0));
float rootTipEnv = smoothstep(0.02, 0.18, vHairUV.y) * smoothstep(0.99, 0.74, vHairUV.y);

// Primary Cuticle Reflection Lobe (R): shifted toward root
vec3 T_R = normalize(T_hair - 0.14 * N_hair + 0.04 * sin(fiberPhase) * N_hair);
float dotTR1 = clamp(dot(T_R, H1_hair), -1.0, 1.0);
float dotTR2 = clamp(dot(T_R, H2_hair), -1.0, 1.0);
float sinTH_R1 = sqrt(max(0.0, 1.0 - dotTR1 * dotTR1));
float sinTH_R2 = sqrt(max(0.0, 1.0 - dotTR2 * dotTR2));
float specR = (pow(sinTH_R1, 56.0) + 0.45 * pow(sinTH_R2, 48.0)) * rootTipEnv * microFiber;

// Secondary Cortex Transmission-Reflection-Transmission Lobe (TRT): shifted toward tip
vec3 T_TRT = normalize(T_hair + 0.20 * N_hair - 0.05 * cos(fiberPhase) * N_hair);
float dotTTRT1 = clamp(dot(T_TRT, H1_hair), -1.0, 1.0);
float dotTTRT2 = clamp(dot(T_TRT, H2_hair), -1.0, 1.0);
float sinTH_TRT1 = sqrt(max(0.0, 1.0 - dotTTRT1 * dotTTRT1));
float sinTH_TRT2 = sqrt(max(0.0, 1.0 - dotTTRT2 * dotTTRT2));
float specTRT = (pow(sinTH_TRT1, 18.0) + 0.50 * pow(sinTH_TRT2, 16.0)) * rootTipEnv * (0.55 + 0.45 * microFiber);

// Kajiya-Kay diffuse cylindrical strand wrap
float dotTL = clamp(dot(T_hair, L1_hair), -1.0, 1.0);
float kkDiffuse = sqrt(max(0.0, 1.0 - dotTL * dotTL)) * lockCylinder * (0.75 + 0.25 * microFiber);

vec3 hairHighlight =
  diffuseColor.rgb * (kkDiffuse * 0.42) +
  vec3(0.24, 0.21, 0.20) * specR +
  uHairSheenColor * (specTRT * 0.36);

outgoingLight = outgoingLight * lockCylinder + min(hairHighlight, vec3(0.42));
#include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => 'stage21-marschner-hair-v1';
}

async function decodeSource(id) {
  const fileKey = GROOM_STYLES[id]?.file || 'photo_tied';
  if (sourceCache.has(fileKey)) return sourceCache.get(fileKey);
  const promise = (async () => {
    const path = `/grooms/${fileKey}.groom`;
    const embedded = window.__EMBEDDED_GROOMS__?.[path];
    let buffer;
    if (embedded) {
      const binary = atob(embedded.data);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      if (embedded.encoding === 'gzip-base64') {
        if (!globalThis.DecompressionStream) throw new Error('Groom 离线解压需要新版 Chrome/Edge/Safari。');
        buffer = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      } else buffer = bytes.buffer;
    } else {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Groom 曲线数据加载失败 (${response.status})`);
      buffer = await response.arrayBuffer();
    }
    const dv = new DataView(buffer);
    const version = new TextDecoder().decode(new Uint8Array(buffer, 0, 8));
    if (!['H2GRM001', 'H2GRM002'].includes(version)) throw new Error('Groom 数据格式错误');
    const count = dv.getUint32(8, true), samples = dv.getUint32(12, true);
    if (count > 100000 || samples < 4 || samples > 128 || buffer.byteLength !== 40 + count * 8 + count * samples * 6) {
      throw new Error('Groom 数据长度错误');
    }
    const min = [0, 1, 2].map(i => dv.getFloat32(16 + i * 4, true));
    const size = [0, 1, 2].map(i => dv.getFloat32(28 + i * 4, true) - min[i]);
    let points;
    if (version === 'H2GRM002') {
      const packed = new Uint8Array(buffer, 40 + count * 8);
      const plane = count * samples * 3;
      points = new Uint16Array(plane);
      for (let c = 0; c < 3; c++) {
        for (let i = 0; i < count; i++) {
          let value = 0;
          for (let j = 0; j < samples; j++) {
            const k = c * count * samples + i * samples + j;
            const delta = packed[k] | (packed[plane + k] << 8);
            value = j === 0 ? delta : (value + delta) & 65535;
            points[(i * samples + j) * 3 + c] = value;
          }
        }
      }
    } else {
      points = new Uint16Array(buffer, 40 + count * 8);
    }
    const radius = new Float32Array(count), family = new Uint8Array(count), pigment = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      radius[i] = dv.getFloat32(40 + i * 8, true);
      family[i] = dv.getUint8(44 + i * 8);
      pigment[i] = dv.getUint8(45 + i * 8);
    }
    return { count, samples, min, size, points, radius, family, pigment };
  })();
  sourceCache.set(fileKey, promise);
  try {
    return await promise;
  } catch (e) {
    sourceCache.delete(fileKey);
    throw e;
  }
}

function pointAtStyled(source, strand, t, modifier, target) {
  const f = t * (source.samples - 1);
  const k = Math.min(source.samples - 2, Math.floor(f));
  const a = f - k;
  const index = (strand * source.samples + k) * 3;
  let x = source.min[0] + (source.points[index] * (1 - a) + source.points[index + 3] * a) / 65535 * source.size[0];
  let y = source.min[1] + (source.points[index + 1] * (1 - a) + source.points[index + 4] * a) / 65535 * source.size[1];
  let z = source.min[2] + (source.points[index + 2] * (1 - a) + source.points[index + 5] * a) / 65535 * source.size[2];

  const fam = source.family[strand];
  if (modifier === 'air_bob' && fam !== 1) {
    const w = t * t;
    const side = x >= 0 ? 1 : -1;
    x = x * (1 + 0.08 * Math.sin(t * Math.PI)) - side * 0.008 * w;
    y = y + 0.006 * w;
    z = z + 0.022 * Math.sin(t * Math.PI * 0.85) * (z < 0 ? 1 : 0.3);
  } else if (modifier === 'clavicle_bob') {
    const c = Math.pow(t, 1.8);
    const side = x >= 0 ? 1 : -1;
    x -= side * 0.010 * c;
    y += 0.008 * c;
    z += 0.008 * Math.sin(t * Math.PI);
  } else if (modifier === 'hime_cut') {
    if (fam === 2 || (z > 0.005 && Math.abs(x) > 0.042)) {
      const side = x >= 0 ? 1 : -1;
      y = y * (1 - 0.22 * t) + (-0.032) * (0.22 * t);
      x = side * (0.056 + (Math.abs(x) - 0.056) * (1 - 0.45 * t));
      z = z + 0.008 * t;
    }
  } else if (modifier === 'high_ponytail' && fam === 0) {
    const lift = Math.sin(t * Math.PI * 0.85);
    y += 0.018 * lift;
    z -= 0.008 * t;
  } else if (modifier === 'pixie_short' && fam !== 1) {
    y = y * (1 - 0.25 * t) + 0.012 * (0.25 * t);
    x *= 1 - 0.08 * t;
  }

  target.set(x, y, z);
  return target;
}

// Builds 3-vertex-across 3D cambered silk lock ribbons tangent to the skull surface,
// with per-vertex `hairTangent` for Marschner / Kajiya-Kay anisotropic shading.
function buildStrands(source, indices, steps, modifier, desktop) {
  const cols = 3; // left (-1), raised center spine (0), right (+1) -> 4 triangles per step
  const vertices = indices.length * steps * cols;
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const tangents = new Float32Array(vertices * 3);
  const colors = new Uint8Array(vertices * 3);
  const uvs = new Float32Array(vertices * 2);
  const triangles = new Uint32Array(indices.length * (steps - 1) * (cols - 1) * 6);

  const headCenter = new THREE.Vector3(0, 0.025, -0.012);
  const p = new THREE.Vector3();
  const before = new THREE.Vector3();
  const after = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normalOut = new THREE.Vector3();
  const sideVec = new THREE.Vector3();
  const vNorm = new THREE.Vector3();

  let vi = 0, ti = 0;
  for (const encoded of indices) {
    const strand = encoded % source.count;
    const child = Math.floor(encoded / source.count);
    const start = vi;
    const fam = source.family[strand];
    const pigment = 0.68 + (source.pigment[strand] / 255) * 0.32;

    // Lush overlapping silk lock ribbons (~2.6mm to 4.0mm half-width => 5.2mm to 8.0mm full lock width)
    const rawRad = Math.max(0.0012, Math.min(0.0022, source.radius[strand] || 0.0016));
    const famScale = fam === 0 ? 2.25 : fam === 1 ? 1.95 : fam === 2 ? 2.05 : 1.30;
    const lodScale = desktop ? 1.15 : 1.0;
    const baseHalfW = rawRad * famScale * lodScale;

    for (let j = 0; j < steps; j++) {
      const t = j / (steps - 1);
      pointAtStyled(source, strand, t, modifier, p);
      pointAtStyled(source, strand, Math.max(0, t - 0.018), modifier, before);
      pointAtStyled(source, strand, Math.min(1, t + 0.018), modifier, after);
      tangent.subVectors(after, before).normalize();
      if (tangent.lengthSq() < 0.05) tangent.set(0, -1, 0);

      normalOut.subVectors(p, headCenter);
      if (normalOut.lengthSq() < 1e-6) normalOut.set(0, 1, 0);
      normalOut.normalize();
      normalOut.addScaledVector(tangent, -normalOut.dot(tangent));
      if (normalOut.lengthSq() < 0.01) {
        normalOut.set(0, 0, 1).addScaledVector(tangent, -tangent.z);
      }
      normalOut.normalize();
      sideVec.crossVectors(tangent, normalOut).normalize();

      if (child > 0) {
        const phase = strand * 2.39996 + child * 2.09439;
        const spreadSide = 0.0022 * (0.45 + 0.55 * Math.sin(t * Math.PI * 0.85));
        const spreadOut = 0.00085 * Math.sin(t * Math.PI);
        p.addScaledVector(sideVec, Math.cos(phase) * spreadSide)
          .addScaledVector(normalOut, Math.abs(Math.sin(phase)) * spreadOut);
      }

      const rootEase = Math.min(1.0, 0.65 + 0.35 * Math.sin(Math.min(1.0, t * 5.0) * Math.PI * 0.5));
      const tipTaper = Math.pow(1.0 - t * 0.72, 0.42);
      const halfW = baseHalfW * rootEase * tipTaper;
      const camberH = halfW * 0.42;

      const rootShade = 0.62 + 0.38 * Math.min(1.0, t / 0.20);
      const colR = Math.round(pigment * rootShade * 255);
      const colG = Math.round(pigment * rootShade * 0.96 * 255);
      const colB = Math.round(pigment * rootShade * 0.94 * 255);

      for (let k = 0; k < cols; k++) {
        const uAcross = k / (cols - 1);
        const sAcross = uAcross * 2.0 - 1.0;
        const arch = (1.0 - sAcross * sAcross) * camberH;

        const i3 = vi * 3;
        positions[i3] = p.x + sideVec.x * (sAcross * halfW) + normalOut.x * arch;
        positions[i3 + 1] = p.y + sideVec.y * (sAcross * halfW) + normalOut.y * arch;
        positions[i3 + 2] = p.z + sideVec.z * (sAcross * halfW) + normalOut.z * arch;

        vNorm.copy(normalOut).addScaledVector(sideVec, sAcross * 0.72).normalize();
        normals[i3] = vNorm.x;
        normals[i3 + 1] = vNorm.y;
        normals[i3 + 2] = vNorm.z;

        tangents[i3] = tangent.x;
        tangents[i3 + 1] = tangent.y;
        tangents[i3 + 2] = tangent.z;

        colors[i3] = colR;
        colors[i3 + 1] = colG;
        colors[i3 + 2] = colB;

        uvs[vi * 2] = uAcross;
        uvs[vi * 2 + 1] = t;

        if (j < steps - 1 && k < cols - 1) {
          const a = start + j * cols + k;
          const b = a + 1;
          const c = a + cols;
          const d = c + 1;
          triangles[ti++] = a;
          triangles[ti++] = b;
          triangles[ti++] = c;
          triangles[ti++] = b;
          triangles[ti++] = d;
          triangles[ti++] = c;
        }
        vi++;
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('hairTangent', new THREE.BufferAttribute(tangents, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(new THREE.BufferAttribute(triangles, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

// Strict Cranial-Only Root Layer (+1.15mm offset, NEVER touches forehead y < 0.088m or face)
function makeRootLayer(head, color, style) {
  if (!head?.geometry?.attributes.position) return null;
  const p = head.geometry.attributes.position;
  const n = head.geometry.attributes.normal;
  const index = head.geometry.index;
  if (!n || !index) return null;

  const pos = new Float32Array(p.count * 3);
  const normal = new Float32Array(p.count * 3);
  const colors = new Float32Array(p.count * 4);
  const offsetDist = 0.00115;

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const phi = Math.atan2(x, z + 0.014);
    const front = Math.max(0, Math.cos(phi));
    // Keep front hairline strictly on top cranium (y > 0.090m at front) so bare forehead NEVER gets a black polygon block!
    const hairline = -0.026 + 0.118 * Math.pow(front, 0.82);
    let a = THREE.MathUtils.smoothstep(y, hairline, hairline + 0.024);

    // Explicit forehead & temple keep-out
    if (z > 0.028 && y < 0.088 && Math.abs(x) < 0.058) {
      a = 0.0;
    }

    if (style === 'groom_center_long' || style === 'groom_clavicle_bob' || style === 'groom_hime_cut') {
      if (y > 0.075 && z > -0.01) {
        a *= 1.0 - 0.78 * Math.exp(-Math.pow(x / 0.0030, 2));
      }
    }

    const ear =
      THREE.MathUtils.smoothstep(Math.abs(x), 0.052, 0.068) *
      (1.0 - THREE.MathUtils.smoothstep(y, 0.024, 0.048)) *
      THREE.MathUtils.smoothstep(z, -0.030, 0.020);
    a *= 1.0 - ear;
    a = Math.pow(Math.max(0, Math.min(1, a)), 1.4) * 0.88;

    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    pos[i * 3] = x + nx * offsetDist;
    pos[i * 3 + 1] = y + ny * offsetDist;
    pos[i * 3 + 2] = z + nz * offsetDist;
    normal[i * 3] = nx;
    normal[i * 3 + 1] = ny;
    normal[i * 3 + 2] = nz;
    colors[i * 4] = 0.56;
    colors[i * 4 + 1] = 0.50;
    colors[i * 4 + 2] = 0.50;
    colors[i * 4 + 3] = a;
  }

  const selected = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    // Require ALL 3 vertices of the triangle to be inside the hair-bearing cranium so zero sawtooth triangles poke onto forehead
    if (colors[a * 4 + 3] > 0.18 && colors[b * 4 + 3] > 0.18 && colors[c * 4 + 3] > 0.18) {
      selected.push(a, b, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  g.setIndex(selected);
  g.computeBoundingSphere();

  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.86,
    metalness: 0.0,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  m.userData.builtInHair = true;
  m.userData.curveGroom = true;

  const layer = new THREE.Mesh(g, m);
  layer.name = 'Groom_ScalpRootDensity';
  layer.userData.isGroomRoot = true;
  layer.userData.offsetDist = offsetDist;
  layer.castShadow = false;
  layer.receiveShadow = true;
  layer.renderOrder = 1;
  return layer;
}

export async function buildCurveGroom(style, head, config = {}) {
  const id = groomStyleFor(style);
  if (!id) throw new Error('未知 Groom 发型');
  const styleDef = GROOM_STYLES[id];
  const modifier = styleDef?.modifier || 'none';
  const source = await decodeSource(id);
  const desktop = config.groomLod !== 'studio';

  // High-density overlapping silk lock coverage (3,200 guides + ~2,400 children on desktop; 4,800 + ~3,400 in studio)
  const requested = desktop ? 3200 : Math.min(source.count, Number(config.groomDensity || 4800));
  const budget = config.groomSoftware ? Math.min(requested, desktop ? 1400 : 2200) : requested;
  const count = Math.max(900, Math.min(source.count, budget));

  const families = [[], [], [], []];
  for (let i = 0; i < count; i++) {
    const strand = Math.floor((i * source.count) / count);
    families[Math.min(3, source.family[strand])].push(strand);
  }
  // Interpolated child locks for lush fringe, temple wisps, and crown density
  const fringeParents = families[1].slice();
  for (const strand of fringeParents) families[1].push(strand + source.count);
  const templeParents = families[2].slice();
  for (const strand of templeParents) families[2].push(strand + source.count);
  const flowParents = families[0].slice();
  for (let idx = 0; idx < flowParents.length; idx += 2) {
    families[0].push(flowParents[idx] + source.count);
  }

  const rendered = families.reduce((n, family) => n + family.length, 0);
  const group = new THREE.Group();
  group.name = 'HairGroup';

  const base = new THREE.Color(config.hairColor || config.materials?.hairColorHex || '#1c1618');
  // Rich espresso-ebony base tone so dark hair has depth instead of idle #000000 black
  base.lerp(new THREE.Color('#342420'), 0.22).multiplyScalar(1.16);
  const sheenCol = base.clone().lerp(new THREE.Color('#a47864'), 0.48);

  const silkTex = getSilkLockTextures();
  const names = ['GuideFlow', 'FeatheredFringe', 'TempleWisps', 'Flyaways'];
  const root = makeRootLayer(head, base, id);
  if (root) group.add(root);

  let triangles = 0;
  for (let f = 0; f < families.length; f++) {
    if (!families[f].length) continue;
    const g = buildStrands(source, families[f], desktop ? 14 : 20, modifier, desktop);
    const isOuterWisps = f === 1 || f === 2 || f === 3;
    const material = new THREE.MeshPhysicalMaterial({
      color: base,
      map: silkTex ? silkTex.map : null,
      alphaMap: silkTex ? silkTex.alphaMap : null,
      vertexColors: true,
      roughness: isOuterWisps ? 0.36 : 0.32,
      metalness: 0.0,
      anisotropy: 0.86,
      anisotropyRotation: 1.5708,
      specularIntensity: 0.52,
      specularColor: sheenCol,
      envMapIntensity: 0.36,
      sheen: 0.34,
      sheenRoughness: 0.38,
      sheenColor: sheenCol,
      clearcoat: 0.12,
      clearcoatRoughness: 0.36,
      // Solid-core alphaTest avoids MSAA screen-door wire erosion on forehead bangs
      alphaTest: 0.22,
      transparent: false,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    attachMarschnerHairShader(material, sheenCol);
    material.userData.builtInHair = true;
    material.userData.curveGroom = true;

    const mesh = new THREE.Mesh(g, material);
    mesh.name = `Groom_${names[f]}`;
    mesh.userData.isGroomMesh = true;
    mesh.userData.groomFamily = f;
    mesh.castShadow = !desktop && !config.groomSoftware && f === 0;
    mesh.receiveShadow = true;
    mesh.renderOrder = f === 0 ? 2 : 3;
    group.add(mesh);
    triangles += g.index.count / 3;
  }

  group.userData.groom = {
    id,
    sourceCurves: source.count,
    selectedGuides: count,
    renderedStrands: rendered,
    interpolatedChildren: rendered - count,
    triangles,
    lod: config.groomSoftware ? (desktop ? 'software-desktop' : 'software-portrait') : (desktop ? 'desktop' : 'portrait'),
    softwareFallback: !!config.groomSoftware,
    nativeSource: 'public/grooms/Chinese_Grooms_Source.blend',
  };
  return group;
}

export function applyCurveGroomShape(node, morphs) {
  const volume = Number(morphs?.hairVolume || 0);
  const length = Number(morphs?.hairLength || 0);
  const bangs = Number(morphs?.bangsLength || 0);
  const signature = `${volume}|${length}|${bangs}`;
  node.traverse(mesh => {
    if (!mesh.userData.isGroomMesh || mesh.userData.groomShape === signature) return;
    mesh.userData.groomShape = signature;
    const g = mesh.geometry, p = g.attributes.position, uv = g.attributes.uv;
    if (!g.userData.groomBase && volume === 0 && length === 0 && bangs === 0) return;
    const base = g.userData.groomBase || (g.userData.groomBase = p.array.slice());
    for (let i = 0; i < p.count; i++) {
      const t = uv.getY(i), w = THREE.MathUtils.smoothstep(t, 0.05, 0.7), o = i * 3;
      const x = base[o], y = base[o + 1], z = base[o + 2];
      p.array[o] = x * (1 + volume * 0.12 * w);
      p.array[o + 1] =
        y -
        length * 0.022 * w * Math.max(0, 0.04 - y) / 0.18 -
        (mesh.userData.groomFamily === 1 ? bangs * 0.010 * w : 0);
      p.array[o + 2] = z + (z + 0.014) * volume * 0.11 * w;
    }
    p.needsUpdate = true;
    g.computeBoundingSphere();
  });
}
