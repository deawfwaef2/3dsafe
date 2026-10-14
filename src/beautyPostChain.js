import * as THREE from 'three';
import { isSoftwareRenderer } from './photorealLighting.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Stage 40 · 全栈电影光学与胶片后处理自由定制矩阵 (27+ Real-Time Photoreal Post-Processing Controls)
 * 新增并整合以下电影级真实感后处理通道（全程 16-bit HalfFloat HDR + 严格保留 Alpha 透明通道，零黑屏）：
 * 1. uSssBlur         — 屏幕空间真皮红润次表面散射扩散 (Screen-Space Subsurface Scattering RGB Diffusion)
 * 2. uMicroContrast   — 局部微反差与立体骨相清晰度 (Local Clarity & Micro-Contrast Relief)
 * 3. uHighlightRoll   — 胶片高光肩部奶油柔化压缩 (Analog Highlight Shoulder Roll-Off)
 * 4. uShadowCrush     — 暗部趾部压暗与天鹅绒黑位深度 (Shadow Toe Crush & Velvet Black Depth)
 * 5. uSoftFocus       — 17-Tap 电影黑柔镜光学柔焦漫射 (Black Pro-Mist Optical Diffusion)
 * 6. uDepthBlur       — 85mm f/1.2 大光圈椭圆景深模糊 (Portrait Elliptical Bokeh DOF)
 * 7. uSwirlyBokeh     — 经典 Petzval / Helios-44 旋焦散景模糊 (Swirly Tangential Bokeh)
 * 8. uSunFlareVeil    — 逆光镜头暖金眩光雾翳与光圈鬼影环 (Backlit Lens Veiling Glare & Aperture Ring)
 * 9. uDappledBokeh    — 前景树影暗角与翠金散景光斑 (Foreground Dappled Foliage & Emerald-Gold Bokeh)
 * 10. uTyndall        — 窗畔丁达尔斜射体积光束 (Crepuscular Volumetric God-Rays)
 * 11. uAnamorphicFlare— 变形宽银幕水平光斑拉丝 (Panavision Anamorphic Horizontal Streak Flare)
 * 12. uLightLeak      — 胶片暗盒边缘有机暖金红漏光呼吸 (Analog Film Burn & Corner Light Leak)
 * 13. uWetLensDrop    — 窗畔呼吸水雾与微光柔晕 (Rainy Window Condensation Mist & Dew Halo)
 * 14. uFilmLutMode / uFilmLutStrength — 8款大师级电影胶片乳剂曲线 (Kodak 2383 / Portra 160 / Fuji Velvia / CineStill 800T / Ilford HP5 / Bleach Bypass / Agfa Vista / Natural)
 * 15. uHalation       — 胶片卤化银红橙高光边缘晕染 (Silver-Halide Red-Orange Halation)
 * 16. uChromatic      — 光学定焦镜头色散紫边 (Optical Radial Chromatic Dispersion)
 * 17. uLensDistortion — 光学球面镜桶形/枕形微畸变 (Optical Barrel/Pincushion Lens Curvature)
 * 18. uSharpen / uVintagePhoto / uFilmGrain / uVignette / uContrast / uSaturation / uWarmth
 */

export const FILM_LUT_CATALOG = [
  { id: 'portra_160_sun', modeInt: 1, label: '🌞 Kodak Portra 160 盛夏逆光人像 (参考图同款·奶油肤色+强明暗)' },
  { id: 'kodak_2383', modeInt: 0, label: '🎞️ Kodak Vision3 2383 电影印片胶卷 (暖金高光+深邃青绿暗部)' },
  { id: 'fuji_velvia_50', modeInt: 2, label: '🍃 Fujifilm Eterna/Velvia 翠绿森系胶片 (通透树影+自然肤色)' },
  { id: 'cinestill_800t', modeInt: 3, label: '🌃 CineStill 800T 钨丝灯电影卷 (朱红光晕+冷翠暗调)' },
  { id: 'ilford_hp5_bichrome', modeInt: 4, label: '🖤 Ilford HP5 银盐暖铂金黑白 (极致伦勃朗雕塑明暗)' },
  { id: 'bleach_bypass', modeInt: 5, label: '⚔️ Bleach Bypass 银留存冲洗 (高反差低饱和电影硬朗质感)' },
  { id: 'agfa_vista_warm', modeInt: 6, label: '🌅 Agfa Vista 200 琥珀落日胶卷 (浓郁金红高光+复古褐影)' },
  { id: 'natural_linear', modeInt: 7, label: '📷 纯净物理零染调色 (仅保留光学镜头后处理特效)' },
];

export const BeautyGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tSourceAlpha: { value: null },
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uTime: { value: 0.0 },
    uVignette: { value: 0.44 },
    uSaturation: { value: 0.96 },
    uContrast: { value: 1.22 },
    uWarmth: { value: 0.12 },
    uSharpen: { value: 0.06 },
    uSoftFocus: { value: 0.58 },
    uDepthBlur: { value: 0.48 },
    uChromatic: { value: 0.16 },
    uFilmGrain: { value: 0.07 },
    uTyndall: { value: 0.74 },
    uVintagePhoto: { value: 0.08 },
    uIrisSparkle: { value: 0.05 },
    uHalation: { value: 0.32 },
    uSkinLumen: { value: 0.0 },
    uSssBlur: { value: 0.24 },
    uMicroContrast: { value: 0.48 },
    uHighlightRoll: { value: 0.42 },
    uShadowCrush: { value: 0.18 },
    uSunFlareVeil: { value: 0.22 },
    uDappledBokeh: { value: 0.0 },
    uAnamorphicFlare: { value: 0.16 },
    uLightLeak: { value: 0.08 },
    uSwirlyBokeh: { value: 0.0 },
    uWetLensDrop: { value: 0.0 },
    uLensDistortion: { value: 0.04 },
    uFilmLutMode: { value: 1.0 },
    uFilmLutStrength: { value: 0.48 },
    uCasSharpen: { value: 0.68 },
    uExposure: { value: 1.08 },
    uShadowLift: { value: 0.28 },
    uSpecularClarity: { value: 0.75 },
    uTyndallAngle: { value: -0.58 },
    uTyndallColor: { value: new THREE.Vector3(1.0, 0.91, 0.76) },
    uTint: { value: new THREE.Vector3(1.04, 0.99, 0.94) },
    uShadowTint: { value: new THREE.Vector3(0.055, 0.042, 0.028) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tSourceAlpha;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uVignette;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uWarmth;
    uniform float uSharpen;
    uniform float uSoftFocus;
    uniform float uDepthBlur;
    uniform float uChromatic;
    uniform float uFilmGrain;
    uniform float uTyndall;
    uniform float uVintagePhoto;
    uniform float uIrisSparkle;
    uniform float uHalation;
    uniform float uSkinLumen;
    uniform float uSssBlur;
    uniform float uMicroContrast;
    uniform float uHighlightRoll;
    uniform float uShadowCrush;
    uniform float uSunFlareVeil;
    uniform float uDappledBokeh;
    uniform float uAnamorphicFlare;
    uniform float uLightLeak;
    uniform float uSwirlyBokeh;
    uniform float uWetLensDrop;
    uniform float uLensDistortion;
    uniform float uFilmLutMode;
    uniform float uFilmLutStrength;
    uniform float uCasSharpen;
    uniform float uExposure;
    uniform float uShadowLift;
    uniform float uSpecularClarity;
    uniform float uTyndallAngle;
    uniform vec3 uTyndallColor;
    uniform vec3 uTint;
    uniform vec3 uShadowTint;
    varying vec2 vUv;

    // 17-Tap Dual-Ring Optical Portrait Lens Diffusion & Bokeh Kernel
    vec3 sampleRingBlur(vec2 uv, vec2 radiusTexel) {
      vec3 sum = texture2D(tDiffuse, uv).rgb * 0.16;
      // Inner 8-tap Gaussian ring
      sum += texture2D(tDiffuse, clamp(uv + vec2( 1.0,  0.0) * radiusTexel * 0.65, 0.002, 0.998)).rgb * 0.075;
      sum += texture2D(tDiffuse, clamp(uv + vec2(-1.0,  0.0) * radiusTexel * 0.65, 0.002, 0.998)).rgb * 0.075;
      sum += texture2D(tDiffuse, clamp(uv + vec2( 0.0,  1.0) * radiusTexel * 0.65, 0.002, 0.998)).rgb * 0.075;
      sum += texture2D(tDiffuse, clamp(uv + vec2( 0.0, -1.0) * radiusTexel * 0.65, 0.002, 0.998)).rgb * 0.075;
      sum += texture2D(tDiffuse, clamp(uv + vec2( 0.707,  0.707) * radiusTexel * 0.92, 0.002, 0.998)).rgb * 0.06;
      sum += texture2D(tDiffuse, clamp(uv + vec2(-0.707,  0.707) * radiusTexel * 0.92, 0.002, 0.998)).rgb * 0.06;
      sum += texture2D(tDiffuse, clamp(uv + vec2( 0.707, -0.707) * radiusTexel * 0.92, 0.002, 0.998)).rgb * 0.06;
      sum += texture2D(tDiffuse, clamp(uv + vec2(-0.707, -0.707) * radiusTexel * 0.92, 0.002, 0.998)).rgb * 0.06;
      // Outer 8-tap optical bokeh disc ring
      sum += texture2D(tDiffuse, clamp(uv + vec2( 0.924,  0.383) * radiusTexel * 1.48, 0.002, 0.998)).rgb * 0.0375;
      sum += texture2D(tDiffuse, clamp(uv + vec2(-0.924,  0.383) * radiusTexel * 1.48, 0.002, 0.998)).rgb * 0.0375;
      sum += texture2D(tDiffuse, clamp(uv + vec2( 0.924, -0.383) * radiusTexel * 1.48, 0.002, 0.998)).rgb * 0.0375;
      sum += texture2D(tDiffuse, clamp(uv + vec2(-0.924, -0.383) * radiusTexel * 1.48, 0.002, 0.998)).rgb * 0.0375;
      sum += texture2D(tDiffuse, clamp(uv + vec2( 0.383,  0.924) * radiusTexel * 1.48, 0.002, 0.998)).rgb * 0.0375;
      sum += texture2D(tDiffuse, clamp(uv + vec2(-0.383,  0.924) * radiusTexel * 1.48, 0.002, 0.998)).rgb * 0.0375;
      sum += texture2D(tDiffuse, clamp(uv + vec2( 0.383, -0.924) * radiusTexel * 1.48, 0.002, 0.998)).rgb * 0.0375;
      sum += texture2D(tDiffuse, clamp(uv + vec2(-0.383, -0.924) * radiusTexel * 1.48, 0.002, 0.998)).rgb * 0.0375;
      return sum;
    }

    // Petzval / Helios-44 Swirly Tangential Bokeh Sampler
    vec3 sampleSwirlyBokeh(vec2 uv, vec2 centerVec, vec2 texel, float swirlStrength) {
      vec2 tang = normalize(vec2(-centerVec.y, centerVec.x) + vec2(1e-5));
      vec2 rad  = normalize(centerVec + vec2(1e-5));
      vec2 stepT = tang * texel * (6.5 * swirlStrength);
      vec2 stepR = rad  * texel * (2.2 * swirlStrength);
      vec3 acc = texture2D(tDiffuse, uv).rgb * 0.22;
      acc += texture2D(tDiffuse, clamp(uv + stepT * 0.5 + stepR * 0.25, 0.002, 0.998)).rgb * 0.16;
      acc += texture2D(tDiffuse, clamp(uv - stepT * 0.5 + stepR * 0.25, 0.002, 0.998)).rgb * 0.16;
      acc += texture2D(tDiffuse, clamp(uv + stepT * 1.0 - stepR * 0.35, 0.002, 0.998)).rgb * 0.13;
      acc += texture2D(tDiffuse, clamp(uv - stepT * 1.0 - stepR * 0.35, 0.002, 0.998)).rgb * 0.13;
      acc += texture2D(tDiffuse, clamp(uv + stepT * 1.55, 0.002, 0.998)).rgb * 0.10;
      acc += texture2D(tDiffuse, clamp(uv - stepT * 1.55, 0.002, 0.998)).rgb * 0.10;
      return acc;
    }

    // 8 Cinema Film Stock Emulsion LUT Curves
    vec3 applyCinemaFilmStockLUT(vec3 c, float modeVal) {
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float shMask = clamp(1.0 - smoothstep(0.0, 0.42, lum), 0.0, 1.0);
      float hiMask = smoothstep(0.38, 0.95, lum);
      float midMask = clamp(1.0 - shMask - hiMask * 0.65, 0.0, 1.0);

      if (modeVal < 0.5) {
        // 0: Kodak Vision3 2383 Print Film (Rich golden-amber highlights + deep teal-emerald shadows)
        vec3 graded = c * mix(vec3(0.84, 0.96, 1.04), vec3(1.10, 0.99, 0.84), smoothstep(0.12, 0.68, lum));
        graded += vec3(-0.012, 0.014, 0.022) * shMask;
        graded += vec3(0.032, 0.015, -0.016) * hiMask;
        return max(graded, vec3(0.0));
      } else if (modeVal < 1.5) {
        // 1: Kodak Portra 160 Sunlit Portrait (Reference Photo uploads/image-1.png: creamy peach-gold skin + warm olive-espresso shadows)
        vec3 graded = c * mix(vec3(0.92, 0.88, 0.76), vec3(1.08, 0.98, 0.86), smoothstep(0.10, 0.65, lum));
        graded += vec3(0.018, 0.012, -0.006) * midMask;
        graded += vec3(0.036, 0.018, -0.014) * hiMask;
        return max(graded, vec3(0.0));
      } else if (modeVal < 2.5) {
        // 2: Fujifilm Eterna / Velvia 50 Foliage Cinema (Crisp emerald-jade shadows + translucent warm ivory skin)
        vec3 graded = c * mix(vec3(0.82, 0.98, 0.88), vec3(1.04, 1.01, 0.94), smoothstep(0.14, 0.70, lum));
        graded += vec3(-0.010, 0.018, 0.006) * shMask;
        return max(graded, vec3(0.0));
      } else if (modeVal < 3.5) {
        // 3: CineStill 800T Tungsten Halation (Cool cyan-teal shadows + warm ruby-amber halation highlights)
        vec3 graded = c * mix(vec3(0.78, 0.95, 1.12), vec3(1.12, 0.94, 0.82), smoothstep(0.16, 0.66, lum));
        graded += vec3(-0.016, 0.010, 0.030) * shMask;
        graded += vec3(0.048, 0.012, -0.018) * hiMask;
        return max(graded, vec3(0.0));
      } else if (modeVal < 4.5) {
        // 4: Ilford HP5 Warm Platinum-Palladium Silver Monochrome (Sculptural Rembrandt B&W with warm ivory highlights)
        vec3 mono = vec3(lum);
        mono *= mix(vec3(0.88, 0.84, 0.80), vec3(1.08, 1.02, 0.93), smoothstep(0.08, 0.78, lum));
        return max(mono, vec3(0.0));
      } else if (modeVal < 5.5) {
        // 5: Bleach Bypass Silver Retention (Desaturated, high-metallic micro-contrast cinema look)
        vec3 desat = mix(vec3(lum), c, 0.48);
        vec3 silver = pow(max(desat, vec3(0.0001)), vec3(1.18)) * 1.06;
        return max(silver, vec3(0.0));
      } else if (modeVal < 6.5) {
        // 6: Agfa Vista 200 Golden Sunset Film (Warm nostalgic amber-rose midtones + velvety sepia-brown shadows)
        vec3 graded = c * mix(vec3(0.98, 0.84, 0.72), vec3(1.12, 0.97, 0.82), smoothstep(0.08, 0.64, lum));
        graded += vec3(0.025, 0.008, -0.010) * (midMask + hiMask * 0.5);
        return max(graded, vec3(0.0));
      }
      // 7: Natural Linear
      return c;
    }

    void main() {
      vec2 texel = 1.0 / max(uResolution, vec2(256.0));
      vec2 rawCenter = vUv - vec2(0.5);
      float rawR2 = dot(rawCenter, rawCenter);

      // 0A. Subtle Optical Prime Lens Barrel/Pincushion Curvature (uLensDistortion)
      float srcAlphaRaw = texture2D(tSourceAlpha, vUv).r;
      vec2 uv = vUv;
      if (abs(uLensDistortion) > 0.001 && srcAlphaRaw > 0.01) {
        vec2 warped = vec2(0.5) + rawCenter * (1.0 - uLensDistortion * 0.085 * rawR2);
        if (warped.x > 0.002 && warped.x < 0.998 && warped.y > 0.002 && warped.y < 0.998) {
          float warpedAlpha = texture2D(tSourceAlpha, warped).r;
          if (warpedAlpha > 0.01) uv = warped;
        }
      }

      float srcAlpha = texture2D(tSourceAlpha, uv).r;
      vec2 centerVec = uv - vec2(0.5);
      float radialDist = length(centerVec);

      // 0B. Optical Lens Chromatic Dispersion (vintage 85mm f/1.2 lateral color fringing)
      vec2 caOffset = centerVec * radialDist * (uChromatic * 0.0046) * smoothstep(0.05, 0.5, srcAlpha);
      vec3 col;
      col.r = texture2D(tDiffuse, clamp(uv + caOffset, 0.001, 0.999)).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, clamp(uv - caOffset, 0.001, 0.999)).b;
      if (!(col.r >= 0.0 && col.g >= 0.0 && col.b >= 0.0)) col = vec3(0.0);
      col = clamp(col, 0.0, 4.0);

      // 0C. Stage 41 Real-Time Exposure Compensation & Non-Linear Shadow Fill Lift (uExposure + uShadowLift)
      col *= clamp(uExposure, 0.40, 2.20);
      if (uShadowLift > 0.005 && srcAlpha > 0.01) {
        float lumInit = dot(col, vec3(0.2126, 0.7152, 0.0722));
        float liftZone = (1.0 - smoothstep(0.0, 0.46, lumInit)) * smoothstep(0.002, 0.035, lumInit);
        col += (col * 0.92 + vec3(0.022, 0.018, 0.016)) * liftZone * clamp(uShadowLift, 0.0, 1.5);
      }

      // 1. Adjustable Analog Film Highlight Shoulder Roll-Off (uHighlightRoll)
      // Preserves bright sunlit cheek glow while smoothly rolling off harsh digital clipping
      float shoulderKnee = mix(1.05, 0.72, clamp(uHighlightRoll, 0.0, 1.5) * 0.65);
      float shoulderStrength = 0.25 + clamp(uHighlightRoll, 0.0, 1.5) * 0.45;
      col = col / (vec3(1.0) + max(vec3(0.0), col - vec3(shoulderKnee)) * shoulderStrength);

      // Compute foreground skin & fine-edge subject protection mask so multi-head desktop shelves stay razor-sharp!
      vec3 nTap = texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb * clamp(uExposure, 0.40, 2.20);
      vec3 sTap = texture2D(tDiffuse, uv - vec2(0.0, texel.y)).rgb * clamp(uExposure, 0.40, 2.20);
      vec3 eTap = texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb * clamp(uExposure, 0.40, 2.20);
      vec3 wTap = texture2D(tDiffuse, uv - vec2(texel.x, 0.0)).rgb * clamp(uExposure, 0.40, 2.20);
      vec3 blur1 = 0.25 * (nTap + sTap + eTap + wTap);
      float skinWarmMask = smoothstep(-0.015, 0.085, (col.r - col.g) + (col.g - col.b) * 0.65)
                         * smoothstep(0.025, 0.20, dot(col, vec3(0.299, 0.587, 0.114)));
      float fineEdgeMask = smoothstep(0.008, 0.045, length(col - blur1));
      float subjectKeepSharpMask = clamp(max(skinWarmMask * 0.92, fineEdgeMask * 0.88), 0.0, 0.95);

      // 2. Screen-Space Subsurface Scattering (SSSSS) Red-Channel Dermal Diffusion (uSssBlur)
      // Real human dermis scatters red light wider across shadow terminators while keeping blue/luminance pore detail 100% crisp!
      if (uSssBlur > 0.005 && srcAlpha > 0.01 && skinWarmMask > 0.01) {
        vec3 sssNear = sampleRingBlur(uv, texel * (1.2 + uSssBlur * 1.6));
        vec3 sssWide = sampleRingBlur(uv, texel * (2.8 + uSssBlur * 3.0));
        vec3 sssDiff = mix(sssNear, sssWide, 0.45) * clamp(uExposure, 0.40, 2.20);
        float sssAmt = clamp(uSssBlur * skinWarmMask * (1.0 - fineEdgeMask * 0.85), 0.0, 0.75);
        float lumBeforeSss = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col.r = mix(col.r, sssDiff.r * 1.02, sssAmt * 0.46);
        col.g = mix(col.g, sssDiff.g,        sssAmt * 0.18);
        col.b = mix(col.b, sssDiff.b * 0.99, sssAmt * 0.06);
        // Preserve high-frequency pore & eyelash luminance!
        float lumAfterSss = max(0.0001, dot(col, vec3(0.2126, 0.7152, 0.0722)));
        col *= mix(1.0, lumBeforeSss / lumAfterSss, 0.65);
      }

      // 3. Local Micro-Contrast & Screen-Space Sculptural Clarity (uMicroContrast)
      // Enhances 3D depth of hair-strand cast shadows, eyelids, nose bridge & lip vermilion without harsh edge ringing
      if (uMicroContrast > 0.005 && srcAlpha > 0.01) {
        vec3 localMean = sampleRingBlur(uv, texel * 3.6) * clamp(uExposure, 0.40, 2.20);
        float lumCur = dot(col, vec3(0.2126, 0.7152, 0.0722));
        float lumMean = dot(localMean, vec3(0.2126, 0.7152, 0.0722));
        float localDiff = clamp(lumCur - lumMean, -0.16, 0.16);
        float aoWeight = localDiff < 0.0 ? 1.18 : 0.82;
        col = max(vec3(0.0), col + col * (localDiff * aoWeight * uMicroContrast * 1.05));
      }

      // 4A. Stage 41 AMD FidelityFX CAS 5-Tap Contrast-Adaptive Sharpening (uCasSharpen) + Unsharp Mask (uSharpen)
      if ((uCasSharpen > 0.005 || uSharpen > 0.005) && srcAlpha > 0.01) {
        float casStrength = clamp(uCasSharpen + uSharpen * 0.45, 0.0, 1.65);
        vec3 minRGB = min(min(min(nTap, sTap), min(eTap, wTap)), col);
        vec3 maxRGB = max(max(max(nTap, sTap), max(eTap, wTap)), col);
        vec3 amp = sqrt(clamp(min(minRGB, max(vec3(1.0) - maxRGB, vec3(0.0))) / max(maxRGB, vec3(0.0001)), 0.0, 1.0));
        float peak = -1.0 / mix(8.0, 4.6, clamp(casStrength, 0.0, 1.5));
        vec3 wCas = amp * peak;
        vec3 casCol = clamp((col + (nTap + sTap + eTap + wTap) * wCas) / max(vec3(1.0) + 4.0 * wCas, vec3(0.15)), 0.0, 4.0);
        col = mix(col, casCol, clamp(casStrength * 0.88, 0.0, 1.0));
      }

      // 4B. Stage 41 Pinpoint Specular & Catchlight Micro-Clarity (uSpecularClarity)
      if (uSpecularClarity > 0.005 && srcAlpha > 0.01) {
        float lumSpec = dot(col, vec3(0.2126, 0.7152, 0.0722));
        float hiSpec = smoothstep(0.48, 0.94, lumSpec) * clamp(length(col - blur1) * 5.2, 0.0, 1.0);
        col += col * hiSpec * clamp(uSpecularClarity, 0.0, 1.6) * 0.36;
      }

      // 5. True Optical Highlight-Only Black Pro-Mist & Silver-Halide Halation (uSoftFocus + uHalation)
      // NEVER blurs iris, eyelashes, eyebrows, or pores — ONLY blooms bright highlights into a creamy halo!
      if ((uSoftFocus > 0.001 || uHalation > 0.001) && srcAlpha > 0.005) {
        vec3 mistNear = sampleRingBlur(uv, texel * (1.8 + uSoftFocus * 2.0)) * clamp(uExposure, 0.40, 2.20);
        vec3 mistWide = sampleRingBlur(uv, texel * (4.8 + (uSoftFocus + uHalation * 0.5) * 5.2)) * clamp(uExposure, 0.40, 2.20);
        vec3 mistBlend = mix(mistNear, mistWide, 0.48);
        float mistLuma = dot(mistBlend, vec3(0.2126, 0.7152, 0.0722));
        // Only blend soft mist on bright highlight zones (luma > 0.64), keeping midtones & dark details 100% razor-sharp!
        float hiOnlyMask = smoothstep(0.64, 0.96, mistLuma) * (1.0 - fineEdgeMask * 0.75);
        vec3 softCol = mix(col, mistBlend, clamp(uSoftFocus * 0.32 * hiOnlyMask, 0.0, 0.42));
        // Creamy warm golden-peach Pro-Mist highlight bloom
        vec3 hiGlow = max(vec3(0.0), mistWide - vec3(0.56)) * (uSoftFocus * 0.22) * vec3(1.08, 0.95, 0.82);
        // Authentic CineStill / Kodak silver-halide red-orange anti-halation scatter around bright sunlit edges
        vec3 halationEdge = max(vec3(0.0), mistWide - col * 0.86 - vec3(0.42)) * (uHalation * 0.38) * vec3(1.22, 0.50, 0.22);
        col = softCol + (hiGlow + halationEdge) * srcAlpha;
      }

      // 6. Subject-Preserving Peripheral Bokeh DOF + Petzval Swirly Bokeh (uDepthBlur + uSwirlyBokeh)
      // Protects all foreground heads across the entire desktop width (left, center & right shelves stay 100% sharp!)
      if ((uDepthBlur > 0.001 || uSwirlyBokeh > 0.001) && srcAlpha > 0.005) {
        float bgMask = 1.0 - subjectKeepSharpMask;
        float bokehMask = smoothstep(0.42, 0.82, length((uv - vec2(0.50, 0.50)) * vec2(0.88, 1.08))) * bgMask;
        float blurAmt = clamp(bokehMask * uDepthBlur, 0.0, 1.0);
        if (blurAmt > 0.005) {
          vec3 dofNear = sampleRingBlur(uv, texel * (2.4 + blurAmt * 4.2)) * clamp(uExposure, 0.40, 2.20);
          vec3 dofFar  = sampleRingBlur(uv, texel * (4.8 + blurAmt * 7.5)) * clamp(uExposure, 0.40, 2.20);
          vec3 dofSample = mix(dofNear, dofFar, 0.50);
          col = mix(col, dofSample, clamp(blurAmt * 0.72, 0.0, 0.78));
        }
        // Classic Petzval / Helios-44 Swirly Tangential Bokeh on extreme background corners only
        float swirlMask = smoothstep(0.44, 0.84, radialDist) * clamp(uSwirlyBokeh, 0.0, 1.5) * bgMask;
        if (swirlMask > 0.005) {
          vec3 swirled = sampleSwirlyBokeh(uv, centerVec, texel, swirlMask) * clamp(uExposure, 0.40, 2.20);
          col = mix(col, swirled, clamp(swirlMask * 0.65, 0.0, 0.75));
        }
      }

      // 7. Cinema Anamorphic Horizontal Lens Streak Flare (uAnamorphicFlare)
      if (uAnamorphicFlare > 0.005 && srcAlpha > 0.005) {
        vec3 anamSum = vec3(0.0);
        float offsets[6];
        offsets[0] = -18.0; offsets[1] = -10.0; offsets[2] = -4.5;
        offsets[3] =  4.5;  offsets[4] =  10.0; offsets[5] =  18.0;
        for (int i = 0; i < 6; i++) {
          vec2 sUv = clamp(uv + vec2(offsets[i] * texel.x * 2.2, 0.0), 0.002, 0.998);
          vec3 sCol = texture2D(tDiffuse, sUv).rgb;
          float sLum = dot(sCol, vec3(0.2126, 0.7152, 0.0722));
          float hiPass = smoothstep(0.62, 0.98, sLum);
          anamSum += sCol * hiPass * (0.22 - abs(offsets[i]) * 0.007);
        }
        vec3 streakTint = mix(vec3(1.12, 0.88, 0.62), vec3(0.68, 0.88, 1.25), 0.35);
        col += anamSum * streakTint * uAnamorphicFlare * 0.38 * srcAlpha;
      }

      // 8. Reference-Photo Sun-Flare Veil + Crepuscular God-Rays + Upper-Corner Warm Golden Bokeh
      vec2 lightOrigin = uTyndallAngle <= 0.0 ? vec2(0.84, 0.92) : vec2(0.14, 0.90);
      if ((uTyndall > 0.001 || uSunFlareVeil > 0.001) && srcAlpha > 0.005) {
        vec2 delta = (lightOrigin - uv) * 0.30;
        vec2 sampleUv = uv;
        float scatter = 0.0;
        float weight = 0.18;
        for (int i = 0; i < 8; i++) {
          sampleUv += delta * 0.125;
          vec2 clampedUv = clamp(sampleUv, 0.01, 0.99);
          vec3 sc = texture2D(tDiffuse, clampedUv).rgb;
          float sa = texture2D(tSourceAlpha, clampedUv).r;
          float lumS = dot(sc, vec3(0.299, 0.587, 0.114));
          scatter += smoothstep(0.30, 0.85, lumS) * sa * weight;
          weight *= 0.84;
        }
        // Crepuscular Volumetric God-Ray Scatter (uTyndall)
        vec3 tyndallCol = mix(uTyndallColor, vec3(1.06, 0.88, 0.72), 0.45);
        col += tyndallCol * (scatter * 0.20 * uTyndall * srcAlpha);

        // Upper-Corner Warm Peach-Gold Sun-Flare Veiling Glare & Optical Aperture Ghost Ring (uSunFlareVeil)
        if (uSunFlareVeil > 0.001) {
          float flareDist = length((uv - lightOrigin) * vec2(0.85, 0.95));
          float sunVeil = pow(clamp(1.0 - flareDist * 1.15, 0.0, 1.0), 2.4);
          vec2 ghostCenter = mix(lightOrigin, vec2(0.5), 0.68);
          float ghostDist = length((uv - ghostCenter) * vec2(1.05, 0.95));
          float ghostRing = smoothstep(0.22, 0.16, abs(ghostDist - 0.18)) * smoothstep(0.38, 0.05, ghostDist);
          vec3 flareAdd = tyndallCol * (sunVeil * 0.12 + ghostRing * 0.032 * vec3(1.12, 0.95, 0.74));
          col += flareAdd * uSunFlareVeil * srcAlpha;
        }
      }

      // 9. Upper-Canopy Warm Golden Sunlight Bokeh Circles (uDappledBokeh)
      // Fixed in Stage 41: ZERO muddy green blotches over lower-right desktop heads!
      if (uDappledBokeh > 0.001 && srcAlpha > 0.005) {
        vec2 canopyCorner = vec2(1.0 - lightOrigin.x, 0.88);
        float folDist = length((uv - canopyCorner) * vec2(0.92, 1.15));
        float folZone = smoothstep(0.48, 0.08, folDist) * clamp(uDappledBokeh, 0.0, 1.5) * (1.0 - skinWarmMask * 0.92);
        if (folZone > 0.01) {
          float drift = sin(uTime * 0.45) * 0.010;
          float b1 = smoothstep(0.058, 0.012, length(uv - (canopyCorner + vec2(-0.08 + drift, -0.06))));
          float b2 = smoothstep(0.046, 0.010, length(uv - (canopyCorner + vec2(-0.03 - drift, -0.12))));
          float b3 = smoothstep(0.064, 0.014, length(uv - (canopyCorner + vec2(-0.14, -0.04 + drift))));
          float bokehDots = clamp(b1 + b2 * 0.85 + b3 * 0.72, 0.0, 1.25);
          col += vec3(1.08, 0.88, 0.56) * bokehDots * folZone * 0.18 * srcAlpha;
        }
      }

      // 10. Rainy Window Breath Mist & Dew Refraction Halo (uWetLensDrop)
      if (uWetLensDrop > 0.005 && srcAlpha > 0.005) {
        float edgeMist = smoothstep(0.18, 0.65, radialDist) * clamp(uWetLensDrop, 0.0, 1.5);
        vec3 mistSample = sampleRingBlur(uv, texel * (6.0 + edgeMist * 8.0));
        // Micro water-droplet caustic shimmer
        vec2 dropGrid = uv * vec2(26.0, 18.0) + vec2(0.0, uTime * 0.08);
        vec2 dropCell = fract(dropGrid) - vec2(0.5);
        float dropHash = fract(sin(dot(floor(dropGrid), vec2(127.1, 311.7))) * 43758.5453);
        float dropMask = smoothstep(0.28, 0.06, length(dropCell * vec2(1.0, 0.75))) * step(0.62, dropHash);
        col = mix(col, mistSample * vec3(0.96, 1.01, 1.06) + vec3(0.025, 0.032, 0.042), clamp(edgeMist * 0.45, 0.0, 0.65));
        col += mistSample * dropMask * uWetLensDrop * 0.14 * srcAlpha;
      }

      // 11. Analog Camera Film Burn & Corner Light Leak (uLightLeak)
      if (uLightLeak > 0.005 && srcAlpha > 0.005) {
        float tSlow = uTime * 0.32;
        float leakL = pow(clamp(1.0 - length((uv - vec2(0.04, 0.28 + sin(tSlow) * 0.08)) * vec2(1.35, 0.75)), 0.0, 1.0), 2.6);
        float leakR = pow(clamp(1.0 - length((uv - vec2(0.95, 0.74 + cos(tSlow * 0.8) * 0.08)) * vec2(1.45, 0.82)), 0.0, 1.0), 2.8);
        vec3 leakColor = leakL * vec3(1.18, 0.42, 0.14) + leakR * vec3(1.12, 0.68, 0.22);
        col += leakColor * uLightLeak * 0.28 * srcAlpha;
      }

      // 12. Color Temperature Warmth Shift
      col.r += uWarmth * 0.048;
      col.g += uWarmth * 0.016;
      col.b -= uWarmth * 0.045;
      col = max(col, vec3(0.0));

      // 13. Highlight / Midtone Art-Style Tint
      col *= uTint;

      // 14. 8 Cinema Film Stock Emulsion LUT Curves (uFilmLutMode + uFilmLutStrength)
      if (uFilmLutStrength > 0.005 && srcAlpha > 0.005) {
        vec3 lutCol = applyCinemaFilmStockLUT(col, uFilmLutMode);
        col = mix(col, lutCol, clamp(uFilmLutStrength, 0.0, 1.0));
      }

      // 15. High-Contrast Filmic S-Curve & Adjustable Shadow Toe Crush (uContrast + uShadowCrush)
      float lumaPre = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float contrastPower = clamp(uContrast, 0.82, 1.65);
      vec3 filmicS = pow(max(col, vec3(0.0001)), vec3(contrastPower)) * pow(0.34, 1.0 - contrastPower);
      float crushAmt = clamp(uShadowCrush * 0.75 + (contrastPower - 1.0) * 0.85, 0.0, 1.15);
      float deepShadowToe = smoothstep(0.0, 0.44, lumaPre);
      filmicS *= mix(1.0, 0.56 + 0.48 * deepShadowToe, clamp(crushAmt, 0.0, 0.92));
      col = mix(col, filmicS, 0.84);
      col = max(col, vec3(0.0));

      // 16. Creamy Shadow Split-Toning
      float lumaPostC = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float shadowMask = clamp(1.0 - smoothstep(0.06, 0.42, lumaPostC), 0.0, 1.0) * smoothstep(0.018, 0.070, lumaPostC);
      col += uShadowTint * shadowMask * 0.30;

      // 17. Saturation
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // 18. Authentic Silver-Halide Vintage Old-Photo Emulsion (uVintagePhoto)
      if (uVintagePhoto > 0.001 && srcAlpha > 0.005) {
        float vp = clamp(uVintagePhoto, 0.0, 1.0);
        float lumV = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 sepiaTone = vec3(
          lumV * 1.08 + 0.022,
          lumV * 0.96 + 0.014,
          lumV * 0.80 + 0.010
        );
        vec3 analogEmulsion = mix(col, sepiaTone, 0.34);
        analogEmulsion = vec3(0.022, 0.017, 0.015) + analogEmulsion * vec3(0.92, 0.89, 0.84);
        vec3 halBlur = sampleRingBlur(uv, texel * 5.5);
        float hiMask = smoothstep(0.44, 0.86, dot(halBlur, vec3(0.299, 0.587, 0.114)));
        analogEmulsion += vec3(0.058, 0.032, 0.014) * hiMask * srcAlpha;
        col = mix(col, analogEmulsion, vp);
      }

      // 19. Organic 35mm Silver-Halide Dual-Frequency Film Grain (uFilmGrain)
      if (uFilmGrain > 0.001 && srcAlpha > 0.01) {
        vec2 grainUv = floor(uv * uResolution * 0.78);
        float noiseFine = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        vec2 clumpUv = floor(uv * uResolution * 0.38);
        float noiseClump = fract(sin(dot(clumpUv, vec2(39.346, 11.135))) * 28461.328) - 0.5;
        float combinedGrain = noiseFine * 0.72 + noiseClump * 0.28;
        float midWeight = smoothstep(0.02, 0.18, luma) * (1.0 - smoothstep(0.75, 0.98, luma));
        col += combinedGrain * uFilmGrain * (0.048 + 0.048 * midWeight) * srcAlpha;
      }

      // 20. Atmospheric Portrait Vignette
      vec2 d = (uv - vec2(0.5)) * vec2(1.08, 0.96);
      float v = 1.0 - uVignette * smoothstep(0.20, 0.86, length(d) * 1.32);
      col *= v;

      gl_FragColor = vec4(clamp(col, 0.0, 4.0), clamp(srcAlpha, 0.0, 1.0));
    }
  `,
};

export function createBeautyPostChain(renderer, scene, camera, options = {}) {
  const width = Math.max(2, Math.floor(options.width || 512));
  const height = Math.max(2, Math.floor(options.height || 512));
  const software = isSoftwareRenderer(renderer);
  const samplingScale = 1;
  const pixelRatio = (options.pixelRatio || renderer.getPixelRatio()) * samplingScale;

  // True 16-Bit HalfFloat HDR RenderTarget
  const hdrTarget = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples: software ? 0 : Math.min(4, renderer.capabilities.maxSamples || 0),
  });
  const composer = new EffectComposer(renderer, hdrTarget);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);

  const alphaTarget = new THREE.WebGLRenderTarget(2, 2, {
    format: THREE.RedFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
  });
  const alphaMaterial = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: BeautyGradeShader.vertexShader,
    fragmentShader:
      'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tDiffuse,vUv).a,0.0,0.0,1.0); }',
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.NoBlending,
  });
  const alphaQuad = new FullScreenQuad(alphaMaterial);
  const alphaPass = new Pass();
  alphaPass.needsSwap = false;
  alphaPass.render = (r, write, read) => {
    alphaMaterial.uniforms.tDiffuse.value = read.texture;
    r.setRenderTarget(alphaTarget);
    alphaQuad.render(r);
  };
  let sizeW = width;
  let sizeH = height;
  let sizeRatio = pixelRatio;

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    options.bloomStrength ?? 0.11,
    options.bloomRadius ?? 0.54,
    options.bloomThreshold ?? 0.88
  );

  const gradePass = new ShaderPass(BeautyGradeShader);
  gradePass.uniforms.tSourceAlpha.value = alphaTarget.texture;
  gradePass.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);

  const resizeAlpha = () => {
    const rw = Math.max(2, Math.floor(sizeW * sizeRatio));
    const rh = Math.max(2, Math.floor(sizeH * sizeRatio));
    alphaTarget.setSize(rw, rh);
    gradePass.uniforms.uResolution.value.set(rw, rh);
  };
  resizeAlpha();

  const outputPass = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(alphaPass);
  composer.addPass(bloomPass);
  composer.addPass(gradePass);
  composer.addPass(outputPass);

  const startMs = performance.now();

  const chain = {
    composer,
    bloomPass,
    gradePass,
    enabled: true,
    setSize(w, h) {
      const ww = Math.max(2, Math.floor(w));
      const hh = Math.max(2, Math.floor(h));
      sizeW = ww;
      sizeH = hh;
      composer.setSize(ww, hh);
      resizeAlpha();
    },
    setPixelRatio(r) {
      sizeRatio = r * samplingScale;
      composer.setPixelRatio(sizeRatio);
      resizeAlpha();
    },
    syncSize(w, h, r) {
      if (r) chain.setPixelRatio(r);
      chain.setSize(w, h);
    },
    setEnabled(v) {
      chain.enabled = v !== false;
    },
    applyGrading(params = {}) { return chain.setGradeParams(params); },
    resize(w, h) { return chain.setSize(w, h); },
    setGradeParams(params = {}) {
      if (params.bloomStrength !== undefined) bloomPass.strength = Number(params.bloomStrength);
      if (params.bloomRadius !== undefined) bloomPass.radius = Number(params.bloomRadius);
      if (params.bloomThreshold !== undefined) bloomPass.threshold = Number(params.bloomThreshold);
      const u = gradePass.uniforms;
      if (params.vignette !== undefined) u.uVignette.value = Number(params.vignette);
      if (params.saturation !== undefined) u.uSaturation.value = Number(params.saturation);
      if (params.contrast !== undefined) u.uContrast.value = Number(params.contrast);
      if (params.warmth !== undefined) u.uWarmth.value = Number(params.warmth);
      if (params.sharpen !== undefined) u.uSharpen.value = Number(params.sharpen);
      if (params.softFocus !== undefined) u.uSoftFocus.value = Number(params.softFocus);
      if (params.depthBlur !== undefined) u.uDepthBlur.value = Number(params.depthBlur);
      if (params.chromatic !== undefined) u.uChromatic.value = Number(params.chromatic);
      if (params.filmGrain !== undefined) u.uFilmGrain.value = Number(params.filmGrain);
      if (params.tyndall !== undefined) u.uTyndall.value = Number(params.tyndall);
      if (params.vintagePhoto !== undefined) u.uVintagePhoto.value = Number(params.vintagePhoto);
      if (params.irisSparkle !== undefined) u.uIrisSparkle.value = Number(params.irisSparkle);
      if (params.halation !== undefined) u.uHalation.value = Number(params.halation);
      if (params.skinLumen !== undefined) u.uSkinLumen.value = Number(params.skinLumen);
      if (params.sssBlur !== undefined) u.uSssBlur.value = Number(params.sssBlur);
      if (params.microContrast !== undefined) u.uMicroContrast.value = Number(params.microContrast);
      if (params.highlightRoll !== undefined) u.uHighlightRoll.value = Number(params.highlightRoll);
      if (params.shadowCrush !== undefined) u.uShadowCrush.value = Number(params.shadowCrush);
      if (params.sunFlareVeil !== undefined) u.uSunFlareVeil.value = Number(params.sunFlareVeil);
      if (params.dappledBokeh !== undefined) u.uDappledBokeh.value = Number(params.dappledBokeh);
      if (params.anamorphicFlare !== undefined) u.uAnamorphicFlare.value = Number(params.anamorphicFlare);
      if (params.lightLeak !== undefined) u.uLightLeak.value = Number(params.lightLeak);
      if (params.swirlyBokeh !== undefined) u.uSwirlyBokeh.value = Number(params.swirlyBokeh);
      if (params.wetLensDrop !== undefined) u.uWetLensDrop.value = Number(params.wetLensDrop);
      if (params.lensDistortion !== undefined) u.uLensDistortion.value = Number(params.lensDistortion);
      if (params.filmLutMode !== undefined) {
        const lutItem = FILM_LUT_CATALOG.find(l => l.id === params.filmLutMode);
        u.uFilmLutMode.value = lutItem ? lutItem.modeInt : Number(params.filmLutMode) || 1.0;
      }
      if (params.filmLutStrength !== undefined) u.uFilmLutStrength.value = Number(params.filmLutStrength);
      if (params.casSharpen !== undefined && u.uCasSharpen) u.uCasSharpen.value = Number(params.casSharpen);
      if (params.exposure !== undefined && u.uExposure) u.uExposure.value = Number(params.exposure);
      if (params.shadowLift !== undefined && u.uShadowLift) u.uShadowLift.value = Number(params.shadowLift);
      if (params.specularClarity !== undefined && u.uSpecularClarity) u.uSpecularClarity.value = Number(params.specularClarity);
      if (params.tyndallAngle !== undefined) u.uTyndallAngle.value = Number(params.tyndallAngle);
      if (params.tyndallColor) {
        const tc = new THREE.Color(params.tyndallColor);
        u.uTyndallColor.value.set(tc.r, tc.g, tc.b);
      }
      if (Array.isArray(params.tint)) {
        u.uTint.value.set(params.tint[0], params.tint[1], params.tint[2]);
      }
      if (Array.isArray(params.shadowTint)) {
        u.uShadowTint.value.set(params.shadowTint[0], params.shadowTint[1], params.shadowTint[2]);
      }
    },
    render() {
      gradePass.uniforms.uTime.value = (performance.now() - startMs) * 0.001;
      composer.render();
    },
    dispose() {
      alphaTarget.dispose();
      alphaMaterial.dispose();
      alphaQuad.dispose();
      bloomPass.dispose();
      gradePass.dispose();
      outputPass.dispose();
      composer.dispose();
    },
  };
  return chain;
}
