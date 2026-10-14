import * as THREE from 'three';

/**
 * High-Precision Daz-Style East Asian Female Facial Texture & Lustrous Silk Hair Texture Generator
 * Specifically engineered to eliminate UV scatter on neck/chin and deliver expressive East Asian beauty features.
 */

function hexToRgb(hex) {
  const clean = (hex || '#f6d8cb').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16) || 0xf6d8cb;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbStr(r, g, b, a = 1) {
  return `rgba(${Math.round(Math.max(0, Math.min(255, r)))}, ${Math.round(Math.max(0, Math.min(255, g)))}, ${Math.round(Math.max(0, Math.min(255, b)))}, ${a})`;
}

export function createDazSkinTexture(options = {}) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const {
    skinTone = '#f7d9cc',
    blushIntensity = 0.52,
    lipColor = '#d45868',
    irisColor = '#362015',
    eyelinerIntensity = 0.90,
    browColor = '#261b18',
    photoElement = null,
    photoBlend = 0.0
  } = options;

  const base = hexToRgb(skinTone);
  const lip = hexToRgb(lipColor);
  const iris = hexToRgb(irisColor);
  const brow = hexToRgb(browColor);

  // Convert UV (u, v) to Canvas (x, y) with flipY = true
  const uv = (u, v) => [u * size, (1.0 - v) * size];

  // 1. Base Porcelain Subsurface Scattering Skin Tone (Uniform on outer neck/cranium margins!)
  ctx.fillStyle = skinTone;
  ctx.fillRect(0, 0, size, size);

  // Soft warm T-zone & central face glow
  const faceGlow = ctx.createRadialGradient(size * 0.5, size * 0.46, size * 0.03, size * 0.5, size * 0.48, size * 0.36);
  faceGlow.addColorStop(0, rgbStr(base.r + 7, base.g + 5, base.b + 5, 1));
  faceGlow.addColorStop(0.75, skinTone);
  faceGlow.addColorStop(1, skinTone);
  ctx.fillStyle = faceGlow;
  ctx.fillRect(0, 0, size, size);

  // 2. Soft Peach/Rose Apple Cheek Blush (u=0.33/0.67, v=0.48)
  for (const side of [-1, 1]) {
    const [cx, cy] = uv(0.5 + side * 0.165, 0.485);
    const blushGrad = ctx.createRadialGradient(cx, cy, size * 0.008, cx, cy, size * 0.125);
    blushGrad.addColorStop(0, `rgba(238, 118, 126, ${0.30 * blushIntensity})`);
    blushGrad.addColorStop(0.55, `rgba(238, 130, 135, ${0.14 * blushIntensity})`);
    blushGrad.addColorStop(1, 'rgba(238, 130, 135, 0)');
    ctx.fillStyle = blushGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.125, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Delicate Nasal Bridge Contour, Highlight & Petite Nostrils
  const [nbTopX, nbTopY] = uv(0.50, 0.645);
  const [nbTipX, nbTipY] = uv(0.50, 0.456);

  // Subtle side nose shadow lines (柔和鼻影)
  for (const side of [-1, 1]) {
    const sx = nbTopX + side * size * 0.026;
    const sGrad = ctx.createLinearGradient(0, nbTopY, 0, nbTipY);
    sGrad.addColorStop(0, 'rgba(150, 95, 82, 0.16)');
    sGrad.addColorStop(0.5, 'rgba(150, 95, 82, 0.09)');
    sGrad.addColorStop(1, 'rgba(150, 95, 82, 0)');
    ctx.strokeStyle = sGrad;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx, nbTopY);
    ctx.quadraticCurveTo(nbTopX + side * size * 0.018, (nbTopY + nbTipY) * 0.5, nbTopX + side * size * 0.024, nbTipY);
    ctx.stroke();
  }

  // Nasal bridge pearl highlight line
  const bridgeHi = ctx.createLinearGradient(0, nbTopY, 0, nbTipY);
  bridgeHi.addColorStop(0, 'rgba(255, 252, 250, 0.35)');
  bridgeHi.addColorStop(0.7, 'rgba(255, 252, 250, 0.42)');
  bridgeHi.addColorStop(1, 'rgba(255, 252, 250, 0)');
  ctx.strokeStyle = bridgeHi;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(nbTopX, nbTopY + 8);
  ctx.lineTo(nbTipX, nbTipY - 8);
  ctx.stroke();

  // Nose tip blush & pearl dot
  const tipGlow = ctx.createRadialGradient(nbTipX, nbTipY, 1, nbTipX, nbTipY, size * 0.036);
  tipGlow.addColorStop(0, 'rgba(255, 250, 248, 0.48)');
  tipGlow.addColorStop(0.38, `rgba(235, 122, 124, ${0.22 * blushIntensity})`);
  tipGlow.addColorStop(1, 'rgba(235, 122, 124, 0)');
  ctx.fillStyle = tipGlow;
  ctx.beginPath();
  ctx.arc(nbTipX, nbTipY, size * 0.036, 0, Math.PI * 2);
  ctx.fill();

  // Petite Nostrils (u = 0.462 & 0.538, v = 0.415)
  for (const side of [-1, 1]) {
    const [nx, ny] = uv(0.50 + side * 0.038, 0.415);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(side * 0.48);
    const nGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 0.012);
    nGrad.addColorStop(0, 'rgba(68, 28, 25, 0.62)');
    nGrad.addColorStop(0.65, 'rgba(130, 68, 58, 0.25)');
    nGrad.addColorStop(1, 'rgba(130, 68, 58, 0)');
    ctx.fillStyle = nGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.012, size * 0.006, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Petite Gradient Petal / Water-Gloss Lips (花瓣渐层水光唇)
  // Narrower, softer, feathered edges so lips look natural and plump
  ctx.save();
  const [mLeftX, mLeftY] = uv(0.402, 0.308);
  const [mRightX, mRightY] = uv(0.598, 0.308);
  const [cupidLX, cupidLY] = uv(0.474, 0.352);
  const [cupidCX, cupidCY] = uv(0.500, 0.345);
  const [cupidRX, cupidRY] = uv(0.526, 0.352);
  const [lipBotX, lipBotY] = uv(0.500, 0.264);
  const [partCX, partCY] = uv(0.500, 0.307);

  ctx.beginPath();
  ctx.moveTo(mLeftX, mLeftY);
  ctx.quadraticCurveTo((mLeftX + cupidLX) * 0.5, cupidLY + 2, cupidLX, cupidLY);
  ctx.quadraticCurveTo(cupidCX, cupidCY + 3, cupidRX, cupidRY);
  ctx.quadraticCurveTo((cupidRX + mRightX) * 0.5, cupidRY + 2, mRightX, mRightY);
  ctx.quadraticCurveTo(partCX + size * 0.048, lipBotY + 2, lipBotX, lipBotY);
  ctx.quadraticCurveTo(partCX - size * 0.048, lipBotY + 2, mLeftX, mLeftY);
  ctx.closePath();

  const lipGrad = ctx.createRadialGradient(partCX, partCY, size * 0.008, partCX, (cupidCY + lipBotY) * 0.5, size * 0.098);
  lipGrad.addColorStop(0, rgbStr(lip.r - 18, lip.g - 18, lip.b - 12, 0.96));
  lipGrad.addColorStop(0.52, rgbStr(lip.r + 8, lip.g + 4, lip.b + 8, 0.90));
  lipGrad.addColorStop(0.88, rgbStr(lip.r + 28, lip.g + 24, lip.b + 24, 0.52));
  lipGrad.addColorStop(1, rgbStr(base.r, base.g, base.b, 0.0));
  ctx.fillStyle = lipGrad;
  ctx.fill();

  // Water-gloss specular droplets on lower lip
  const [glossX, glossY] = uv(0.50, 0.285);
  ctx.beginPath();
  ctx.ellipse(glossX - 10, glossY, size * 0.022, size * 0.0055, -0.08, 0, Math.PI * 2);
  ctx.ellipse(glossX + 12, glossY, size * 0.016, size * 0.0045, 0.08, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 248, 250, 0.52)';
  ctx.fill();

  // Delicate smiling mouth line (微笑唇线)
  ctx.beginPath();
  ctx.moveTo(mLeftX - 3, mLeftY - 2);
  ctx.quadraticCurveTo(partCX - size * 0.028, partCY + 3, partCX, partCY + 1);
  ctx.quadraticCurveTo(partCX + size * 0.028, partCY + 3, mRightX + 3, mRightY - 2);
  ctx.strokeStyle = 'rgba(82, 22, 30, 0.78)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // 5. Large, Luminous East Asian Female Almond Eyes (星眸杏眼 + 卧蚕 + 双眼皮 + 纤长睫毛)
  const eyeConfigs = [
    { side: -1, outerU: 0.268, innerU: 0.422, centerU: 0.346, centerV: 0.622, topV: 0.654, botV: 0.592 },
    { side: 1, outerU: 0.732, innerU: 0.578, centerU: 0.654, centerV: 0.622, topV: 0.654, botV: 0.592 }
  ];

  for (const eye of eyeConfigs) {
    const [outerX, outerY] = uv(eye.outerU, 0.625);
    const [innerX, innerY] = uv(eye.innerU, 0.612);
    const [topX, topY] = uv(eye.centerU, eye.topV);
    const [botX, botY] = uv(eye.centerU, eye.botV);
    const [irisX, irisY] = uv(eye.centerU, eye.centerV + 0.002);

    // (a) Soft Peach-Rose Eyeshadow Halo
    const shadowGrad = ctx.createRadialGradient(irisX, irisY - 6, size * 0.015, irisX, irisY, size * 0.098);
    shadowGrad.addColorStop(0, 'rgba(182, 102, 95, 0.34)');
    shadowGrad.addColorStop(0.6, 'rgba(205, 128, 120, 0.16)');
    shadowGrad.addColorStop(1, 'rgba(205, 128, 120, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(irisX, irisY, size * 0.098, 0, Math.PI * 2);
    ctx.fill();

    // (b) Aegyo-sal (卧蚕珍珠高光 + 下缘浅影)
    const [aegyoX, aegyoY] = uv(eye.centerU, eye.botV - 0.014);
    ctx.beginPath();
    ctx.moveTo(innerX, innerY + 8);
    ctx.quadraticCurveTo(aegyoX, aegyoY + 8, outerX, outerY + 8);
    ctx.strokeStyle = 'rgba(255, 246, 242, 0.42)';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(innerX + eye.side * 6, innerY + 13);
    ctx.quadraticCurveTo(aegyoX, aegyoY + 14, outerX - eye.side * 6, outerY + 12);
    ctx.strokeStyle = 'rgba(148, 86, 78, 0.24)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // (c) Parallel-Crescent Double Eyelid Fold (扇形双眼皮折痕)
    const [creaseOuterX, creaseOuterY] = uv(eye.outerU + eye.side * 0.005, 0.642);
    const [creaseTopX, creaseTopY] = uv(eye.centerU, 0.669);
    const [creaseInnerX, creaseInnerY] = uv(eye.innerU - eye.side * 0.002, 0.622);
    ctx.beginPath();
    ctx.moveTo(creaseInnerX, creaseInnerY);
    ctx.quadraticCurveTo(creaseTopX, creaseTopY - (innerY - creaseTopY) * 0.42, creaseOuterX, creaseOuterY);
    ctx.strokeStyle = 'rgba(112, 56, 48, 0.58)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // (d) Almond Eye Aperture Clip
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.quadraticCurveTo(topX, topY - (innerY - topY) * 0.85, outerX, outerY);
    ctx.quadraticCurveTo(botX, botY + (botY - innerY) * 0.85, innerX, innerY);
    ctx.closePath();

    const scleraGrad = ctx.createLinearGradient(0, topY, 0, botY);
    scleraGrad.addColorStop(0, '#cbbec0');
    scleraGrad.addColorStop(0.25, '#faf6f5');
    scleraGrad.addColorStop(0.85, '#ffffff');
    scleraGrad.addColorStop(1, '#e6d6d8');
    ctx.fillStyle = scleraGrad;
    ctx.fill();
    ctx.clip();

    // Inner corner pink lacrimal caruncle
    ctx.beginPath();
    ctx.arc(innerX - eye.side * 4, innerY, size * 0.011, 0, Math.PI * 2);
    ctx.fillStyle = '#df828a';
    ctx.fill();

    // Large Expressive Iris (radius 0.039 * size)
    const irisR = size * 0.039;
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
    const irisGrad = ctx.createRadialGradient(irisX, irisY + 4, irisR * 0.15, irisX, irisY, irisR);
    irisGrad.addColorStop(0, rgbStr(iris.r + 52, iris.g + 34, iris.b + 22, 1));
    irisGrad.addColorStop(0.58, rgbStr(iris.r + 14, iris.g + 8, iris.b + 4, 1));
    irisGrad.addColorStop(0.88, rgbStr(iris.r * 0.35, iris.g * 0.35, iris.b * 0.35, 1));
    irisGrad.addColorStop(1, '#0c0706');
    ctx.fillStyle = irisGrad;
    ctx.fill();

    // Radial iris fibers & lower warm amber crescent reflection
    for (let k = 0; k < 120; k++) {
      const a = (k / 120) * Math.PI * 2;
      const rIn = irisR * 0.30;
      const rOut = irisR * 0.86;
      ctx.beginPath();
      ctx.moveTo(irisX + Math.cos(a) * rIn, irisY + Math.sin(a) * rIn);
      ctx.lineTo(irisX + Math.cos(a) * rOut, irisY + Math.sin(a) * rOut);
      ctx.strokeStyle = k % 2 === 0
        ? rgbStr(iris.r + 68, iris.g + 46, iris.b + 30, 0.34)
        : 'rgba(12, 6, 4, 0.36)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Deep pupil
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#060405';
    ctx.fill();

    // Upper lid soft shadow across top of iris
    ctx.fillStyle = 'rgba(15, 7, 9, 0.30)';
    ctx.fillRect(irisX - irisR, topY - 12, irisR * 2, (botY - topY) * 0.36);

    // Crystal Star Catchlights (双眼神光)
    ctx.beginPath();
    ctx.ellipse(irisX - irisR * 0.30, irisY - irisR * 0.25, irisR * 0.21, irisR * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(irisX + irisR * 0.32, irisY + irisR * 0.28, irisR * 0.095, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.fill();
    ctx.restore(); // End eye aperture clip

    // (e) Winged Upper Eyeliner & Lush Clustered Eyelashes (漫画/写真感簇状睫毛)
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.quadraticCurveTo(topX, topY - (innerY - topY) * 0.86, outerX, outerY);
    ctx.lineTo(outerX + eye.side * size * 0.018, outerY - size * 0.005);
    ctx.strokeStyle = `rgba(20, 11, 13, ${eyelinerIntensity})`;
    ctx.lineWidth = 4.6;
    ctx.lineCap = 'round';
    ctx.stroke();

    for (let i = 0; i < 42; i++) {
      const t = i / 41;
      const ctrlY = topY - (innerY - topY) * 0.86;
      const lx = (1 - t) * (1 - t) * innerX + 2 * (1 - t) * t * topX + t * t * outerX;
      const ly = (1 - t) * (1 - t) * innerY + 2 * (1 - t) * t * ctrlY + t * t * outerY;
      const lashLen = size * (0.007 + 0.014 * Math.sin(Math.PI * Math.pow(t, 0.72)));
      const flareAng = -Math.PI * 0.5 + eye.side * (t - 0.32) * 0.92;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(
        lx + Math.cos(flareAng) * lashLen * 0.55,
        ly + Math.sin(flareAng) * lashLen * 0.55,
        lx + Math.cos(flareAng + eye.side * 0.28) * lashLen,
        ly + Math.sin(flareAng + eye.side * 0.28) * lashLen
      );
      ctx.strokeStyle = 'rgba(18, 10, 12, 0.86)';
      ctx.lineWidth = i % 3 === 0 ? 1.7 : 1.15;
      ctx.stroke();
    }
  }

  // 6. Soft Feathered East Asian Arch Eyebrows (柔雾野生眉)
  const browConfigs = [
    { side: -1, p0: uv(0.438, 0.735), p1: uv(0.325, 0.750), p2: uv(0.228, 0.706) },
    { side: 1, p0: uv(0.562, 0.735), p1: uv(0.675, 0.750), p2: uv(0.772, 0.706) }
  ];

  for (const bCfg of browConfigs) {
    const [x0, y0] = bCfg.p0;
    const [x1, y1] = bCfg.p1;
    const [x2, y2] = bCfg.p2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 5);
    ctx.quadraticCurveTo(x1, y1 - 11, x2, y2);
    ctx.quadraticCurveTo(x1, y1 + 8, x0, y0 + 10);
    ctx.closePath();
    ctx.fillStyle = rgbStr(brow.r, brow.g, brow.b, 0.34);
    ctx.fill();

    for (let i = 0; i < 115; i++) {
      const t = i / 114;
      const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2;
      const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
      const spread = (1 - Math.pow(t, 1.5)) * 8.0 + 2.0;
      const oy = ((i % 7) - 3) * (spread * 0.26);
      const hairLen = size * (0.015 * (1 - 0.35 * t));
      const ang = bCfg.side === -1 ? Math.PI + (0.35 - 0.52 * t) : -(0.35 - 0.52 * t);
      ctx.beginPath();
      ctx.moveTo(bx, by + oy);
      ctx.quadraticCurveTo(
        bx + Math.cos(ang) * hairLen * 0.5,
        by + oy - 3.0,
        bx + Math.cos(ang) * hairLen,
        by + oy + Math.sin(ang) * hairLen * 0.32
      );
      ctx.strokeStyle = rgbStr(brow.r, brow.g, brow.b, 0.58 * Math.sin(Math.PI * Math.pow(t, 0.65)));
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. Optional Photo Reference UV Projection Blend
  if (photoElement && photoBlend > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, photoBlend);
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.52, size * 0.28, size * 0.34, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photoElement, size * 0.18, size * 0.14, size * 0.64, size * 0.76);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return { texture: tex, canvas };
}

/**
 * Generates Rich, Deep Ebony Silk Hair Texture with Subtle Realistic Kajiya-Kay Anisotropic Sheen
 * (Fixes the overly bright grey hair strip look from earlier!)
 */
export function createRealisticHairStrandTexture(hairColorHex = '#141116', sheenIntensity = 0.85) {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const base = hexToRgb(hairColorHex);
  // Solid deep base in the upper 86% so overlapping locks never look like sparse comb teeth
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, rgbStr(base.r * 0.7, base.g * 0.7, base.b * 0.7, 0.98));
  bgGrad.addColorStop(0.78, rgbStr(base.r * 0.85, base.g * 0.85, base.b * 0.85, 0.96));
  bgGrad.addColorStop(0.94, rgbStr(base.r * 0.8, base.g * 0.8, base.b * 0.8, 0.45));
  bgGrad.addColorStop(1.0, rgbStr(base.r, base.g, base.b, 0.0));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(14, 0, w - 28, h);

  // Draw 420 fine silk hair fibers with subtle, realistic dark-espresso / blue-black sheen
  for (let i = 0; i < 420; i++) {
    const x = (i / 420) * w;
    const edgeFade = Math.pow(Math.sin((i / 420) * Math.PI), 0.45);
    const toneShift = ((i * 29) % 14) - 7;

    const grad = ctx.createLinearGradient(x, 0, x, h);
    grad.addColorStop(0, rgbStr(base.r * 0.55, base.g * 0.55, base.b * 0.55, 0.98 * edgeFade));
    grad.addColorStop(0.24, rgbStr(base.r + toneShift, base.g + toneShift, base.b + toneShift, 0.98 * edgeFade));
    // Subtle, natural silk highlight band (not washed-out white!)
    grad.addColorStop(0.35, rgbStr(base.r + 28 * sheenIntensity, base.g + 24 * sheenIntensity, base.b + 34 * sheenIntensity, 0.98 * edgeFade));
    grad.addColorStop(0.48, rgbStr(base.r + toneShift, base.g + toneShift, base.b + toneShift, 0.96 * edgeFade));
    grad.addColorStop(0.62, rgbStr(base.r + 16 * sheenIntensity, base.g + 14 * sheenIntensity, base.b + 22 * sheenIntensity, 0.94 * edgeFade));
    grad.addColorStop(0.86, rgbStr(base.r * 0.75, base.g * 0.75, base.b * 0.75, 0.78 * edgeFade));
    grad.addColorStop(1.0, rgbStr(base.r, base.g, base.b, 0.0));

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + Math.sin(i * 1.7) * 2.5, h * 0.33,
      x - Math.sin(i * 2.3) * 2.5, h * 0.66,
      x + Math.sin(i * 3.1) * 1.5, h
    );
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Stage 7 · 皮肤微观细节贴图（程序化生成，全离线）
 * Stage 13c 升级为 1024px 灰度噪声：同时用作皮肤 roughnessMap（粗糙度变化）与 bumpMap（毛孔凹凸），
 * 消除“塑料皮”廉价感。单例缓存，多颗头共用同一张，不占多余显存。
 * 注意：数据贴图必须保持线性色彩空间（不设 SRGB），否则粗糙度会偏亮失真。
 */
let _skinMicroCache = null;
export function createSkinMicroMaps(size = 1024) {
  if (_skinMicroCache) return _skinMicroCache;
  const unit = size / 512;
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d');

  // 1. Matte-velvet human dermal baseline (#dcdcdc ≈ 0.86 multiplier so skin never looks like shiny silicone/plastic!)
  rctx.fillStyle = '#dcdcdc';
  rctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  // Subtle anatomical T-zone vs cheek matte zones
  const zones = [
    [0.50, 0.44, 0.24, 'rgba(165,165,165,0.22)'], // Nasal bridge / forehead T-zone: natural lipid sheen
    [0.24, 0.55, 0.28, 'rgba(248,248,248,0.24)'], // Left cheek: velvety matte dermis
    [0.76, 0.55, 0.28, 'rgba(248,248,248,0.24)'], // Right cheek: velvety matte dermis
  ];
  for (const [zx, zy, zr, col] of zones) {
    const g = rctx.createRadialGradient(size * zx, size * zy, 4, size * zx, size * zy, size * zr);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(220,220,220,0)');
    rctx.fillStyle = g;
    rctx.fillRect(0, 0, size, size);
  }

  // 2. Crisscross Langer's dermal tension micro-grooves (真实人类皮沟/皮嵴菱形微网格，彻底击碎硅胶假皮高光)
  bctx.lineWidth = 0.65 * unit;
  rctx.lineWidth = 0.65 * unit;
  for (let i = 0; i < Math.round(3200 * unit * unit); i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = (Math.random() < 0.5 ? 0.62 : -0.62) + (Math.random() - 0.5) * 0.45;
    const len = (2.5 + Math.random() * 5.5) * unit;
    bctx.strokeStyle = 'rgba(38,38,38,0.22)';
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    bctx.stroke();

    rctx.strokeStyle = 'rgba(250,250,250,0.20)';
    rctx.beginPath();
    rctx.moveTo(x, y);
    rctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    rctx.stroke();
  }

  // 3. High-definition follicular pores & epidermal micro-relief
  for (let i = 0; i < Math.round(16000 * unit * unit); i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const isPore = Math.random() < 0.42;
    const r = (isPore ? 0.65 + Math.random() * 0.95 : 1.1 + Math.random() * 1.4) * unit;
    if (isPore) {
      // Pore crater: dark in bumpMap (indented), high roughness in roughnessMap (no specular inside pore)
      bctx.fillStyle = `rgba(22,22,22,${0.25 + Math.random() * 0.24})`;
      bctx.beginPath();
      bctx.arc(x, y, r, 0, Math.PI * 2);
      bctx.fill();

      rctx.fillStyle = `rgba(252,252,252,${0.24 + Math.random() * 0.20})`;
      rctx.beginPath();
      rctx.arc(x, y, r, 0, Math.PI * 2);
      rctx.fill();
    } else {
      // Micro-ridge peak between pores
      bctx.fillStyle = `rgba(218,218,218,${0.14 + Math.random() * 0.14})`;
      bctx.beginPath();
      bctx.arc(x, y, r, 0, Math.PI * 2);
      bctx.fill();

      rctx.fillStyle = `rgba(175,175,175,${0.12 + Math.random() * 0.12})`;
      rctx.beginPath();
      rctx.arc(x, y, r, 0, Math.PI * 2);
      rctx.fill();
    }
  }

  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.RepeatWrapping;
  // Face UV island occupies ~16% of MakeHuman's body UV; repeat(38, 38) yields ~6x 1024px tiles (~6K pore density) across the face!
  roughTex.repeat.set(38, 38);
  roughTex.anisotropy = 16;
  roughTex.needsUpdate = true;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(38, 38);
  bumpTex.anisotropy = 16;
  bumpTex.needsUpdate = true;

  _skinMicroCache = { roughnessMap: roughTex, bumpMap: bumpTex };
  return _skinMicroCache;
}

export function samplePhotoColors(imgElement) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.drawImage(imgElement, 0, 0, 128, 128);
  const data = ctx.getImageData(0, 0, 128, 128).data;

  // 1. Sample mid-cheek skin tone
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 48; y < 76; y++) {
    for (let x = 42; x < 86; x++) {
      const idx = (y * 128 + x) * 4;
      r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; n++;
    }
  }
  r /= Math.max(1, n); g /= Math.max(1, n); b /= Math.max(1, n);
  const sr = Math.round(Math.min(252, Math.max(210, r * 0.58 + 244 * 0.42)));
  const sg = Math.round(Math.min(234, Math.max(182, g * 0.58 + 218 * 0.42)));
  const sb = Math.round(Math.min(226, Math.max(170, b * 0.58 + 208 * 0.42)));
  const toHex = (rv, gv, bv) => '#' + [rv, gv, bv].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

  // 2. Sample lip vermilion region (lower-middle face)
  let lr = 0, lg = 0, lb = 0, ln = 0;
  for (let y = 78; y < 96; y++) {
    for (let x = 50; x < 78; x++) {
      const idx = (y * 128 + x) * 4;
      const pr = data[idx], pg = data[idx + 1], pb = data[idx + 2];
      // Weight pixels with higher redness (vermilion)
      const redness = Math.max(0.2, (pr - pg * 0.65 - pb * 0.35) / 60);
      lr += pr * redness; lg += pg * redness; lb += pb * redness; ln += redness;
    }
  }
  lr /= Math.max(1, ln); lg /= Math.max(1, ln); lb /= Math.max(1, ln);
  const lipHex = toHex(
    Math.min(228, Math.max(158, lr * 0.65 + 196 * 0.35)),
    Math.min(132, Math.max(68, lg * 0.55 + 88 * 0.45)),
    Math.min(144, Math.max(76, lb * 0.55 + 98 * 0.45))
  );

  // 3. Sample crown hair color
  let hr = 0, hg = 0, hb = 0, hn = 0;
  for (let y = 8; y < 28; y++) {
    for (let x = 36; x < 92; x++) {
      const idx = (y * 128 + x) * 4;
      hr += data[idx]; hg += data[idx + 1]; hb += data[idx + 2]; hn++;
    }
  }
  hr /= Math.max(1, hn); hg /= Math.max(1, hn); hb /= Math.max(1, hn);
  const hairHex = toHex(
    Math.min(72, Math.max(16, hr * 0.35)),
    Math.min(62, Math.max(15, hg * 0.33)),
    Math.min(68, Math.max(18, hb * 0.36))
  );

  return {
    skinTone: toHex(sr, sg, sb),
    lipColor: lipHex,
    hairColor: hairHex,
    irisColor: '#362015'
  };
}
