import * as THREE from 'three';

// A cache key identifies a particular GLB + material/texture, NOT just a hairstyle.
// Different atlases must never share an alpha mask. External assets are not baked.
const cache = new Map();
const SIZE = 1024;

function hashString(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function randomSequence(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function copyAtlasSettings(canvas, source, colorSpace) {
  const result = new THREE.CanvasTexture(canvas);
  // copy() retains UV channel, rotation, offset, repeat, flipY, transform matrix,
  // wrap and sampling. Replace Source afterwards so we DON'T mutate the GLB map.
  result.copy(source);
  result.source = new THREE.Source(canvas);
  result.colorSpace = colorSpace;
  result.anisotropy = 8;
  result.userData = { ...result.userData, sharedHairAtlas: true };
  result.needsUpdate = true;
  return result;
}

/**
 * Detail enhancement of an existing hair-card atlas, not a new realistic asset.
 * Keep the artist's exact alpha coverage and low-frequency strand flow. Add only
 * low-contrast longitudinal detail; no atlas-wide dark roots or painted light band.
 * glTF flipY=false and every other sampling/UV setting are inherited explicitly.
 */
export function getHairStrandTextures(source, assetKey) {
  if (!source?.image) throw new Error('Hair atlas image is unavailable');
  const key = `${assetKey}|${source.channel}|${source.flipY}|${source.offset.toArray()}|${source.repeat.toArray()}|${source.rotation}|${source.wrapS}|${source.wrapT}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source.image, 0, 0, SIZE, SIZE);
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  const original = image.data;

  const fine = document.createElement('canvas');
  fine.width = fine.height = SIZE;
  const fineCtx = fine.getContext('2d', { willReadFrequently: true });
  fineCtx.fillStyle = '#999999';
  fineCtx.fillRect(0, 0, SIZE, SIZE);
  const random = randomSequence(hashString(assetKey));
  for (let i = 0; i < 760; i++) {
    const x = (i + random() * .8) / 760 * SIZE;
    const value = 80 + Math.floor(random() * 120);
    const curve = (random() - .5) * 3;
    fineCtx.strokeStyle = `rgb(${value},${value},${value})`;
    fineCtx.lineWidth = .5 + random() * .7;
    fineCtx.beginPath();
    fineCtx.moveTo(x, 0);
    fineCtx.bezierCurveTo(x + curve, SIZE / 3, x - curve, SIZE * .7, x, SIZE);
    fineCtx.stroke();
  }
  const detail = fineCtx.getImageData(0, 0, SIZE, SIZE).data;
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = roughCanvas.height = SIZE;
  const roughCtx = roughCanvas.getContext('2d');
  const roughImage = roughCtx.createImageData(SIZE, SIZE);
  const rough = roughImage.data;
  for (let i = 0; i < original.length; i += 4) {
    const authored = (.299 * original[i] + .587 * original[i + 1] + .114 * original[i + 2]) / 255;
    const fiber = detail[i] / 255 - .60;
    // Compress baked-in photographic highlights: real scene lights supply sheen.
    const value = Math.max(.36, Math.min(.86, .48 + authored * .28 + fiber * .18));
    original[i] = value * 255;
    original[i + 1] = value * 251;
    original[i + 2] = value * 246;
    // original[i+3] deliberately unchanged: no threshold remapping/thickening.
    const r = Math.max(.40, Math.min(.66, .57 - fiber * .24));
    rough[i] = rough[i + 1] = rough[i + 2] = r * 255;
    rough[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  roughCtx.putImageData(roughImage, 0, 0);
  const result = {
    map: copyAtlasSettings(canvas, source, THREE.SRGBColorSpace),
    roughnessMap: copyAtlasSettings(roughCanvas, source, THREE.NoColorSpace),
    sourceSize: source.image.width || source.image.naturalWidth || 0,
    generatedSize: SIZE,
  };
  cache.set(key, result);
  return result;
}
