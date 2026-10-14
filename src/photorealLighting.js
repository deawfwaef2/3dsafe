import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildStudioEnvironment, LIGHT_PRESETS } from './studioLighting.js';

/**
 * Stage 23 · 大师级实时光影·画风色调·材质微距定制管线
 * (Real-Time Customizable Lighting, Art-Style Color Grading & SSS Material Pipeline)
 */

export const RENDER_QUALITY_LEVELS = ['low', 'medium', 'high', 'ultra', 'rtx2070'];

export const HDR_ENVIRONMENT_CATALOG = [
  { id: 'softbox_portrait', label: '📸 85mm 影棚双柔光箱 + 环形眼神光 HDR (人像推荐)' },
  { id: 'golden_hour', label: '🌅 落日暖金胶片逆光 HDR (夕阳暖肤漫反射)' },
  { id: 'rainy_window', label: '🌧️ 雨夜书房天光漫射 + 暖台灯 HDR (沉浸伴学)' },
  { id: 'museum_velvet', label: '🏛️ 卢浮宫天鹅绒展柜穹顶 HDR (戏剧性明暗)' },
];

export const WINDOW_GOBO_CATALOG = [
  { id: 'hair_sun_slit', modeInt: 5, label: '🌞 盛夏逆光发丝缕缕投影 + 树隙切光斑 (参考图同款·强明暗对比)' },
  { id: 'tree_dappled', modeInt: 4, label: '🌿 窗外梧桐树影摇曳斑驳光 + 发丝微影 (自然呼吸感)' },
  { id: 'venetian_blinds', modeInt: 2, label: '🪟 书房百叶窗条纹切光 (王家卫电影感强明暗切割)' },
  { id: 'rain_mullion', modeInt: 1, label: '🌧️ 雨夜十字窗格 + 流云漫射窗光 (伴学推荐)' },
  { id: 'gothic_lattice', modeInt: 3, label: '🏰 哥特菱格花窗光影 (古典艺术馆)' },
  { id: 'none', modeInt: 0, label: '🔦 纯净影棚柔光箱 (无遮光投影)' },
];

export const DYNAMIC_LIGHT_MODES = [
  { id: 'sunset_cloud_drift', label: '🌅 暮色流云慢移 · 光影角度与冷暖缓慢呼吸 (默认推荐)' },
  { id: 'tree_breeze_dappled', label: '🌿 梧桐树影微风摇曳 · 发丝投影与斑驳光斑缓慢流淌' },
  { id: 'rain_caustics_sway', label: '🌧️ 雨夜窗影水波 · 柔和冷暖交替漫游' },
  { id: 'candle_chiaroscuro', label: '🕯️ 古典烛火摇曳 · 暖金伦勃朗明暗跳动' },
  { id: 'cinema_orbit', label: '🎬 戏剧环绕走马灯 · 140°立体雕塑光巡航' },
  { id: 'static_locked', label: '⏸️ 固定静帧光影 · 锁定当前手动光源角度' },
];

export const GLOBAL_CHIAROSCURO_UNIFORMS = {
  uSssIntensity: { value: 0.92 },
  uChiaroscuro: { value: 0.36 },
  uWindowGoboMode: { value: 0.0 },
  uWindowGoboStrength: { value: 0.18 },
  uWindowGoboPhase: { value: 0.0 },
  uWindowLightDir: { value: new THREE.Vector3(0.52, 0.44, 0.73).normalize() },
  uCursorLightDir: { value: new THREE.Vector3(0.18, 0.28, 0.94).normalize() },
  uCursorTorchIntensity: { value: 0.28 },
};

export function updateInteractiveCursorLight(ndcX = 0, ndcY = 0) {
  const lx = Math.max(-0.85, Math.min(0.85, Number(ndcX) * 0.75));
  const ly = Math.max(-0.65, Math.min(0.85, Number(ndcY) * 0.65 + 0.18));
  GLOBAL_CHIAROSCURO_UNIFORMS.uCursorLightDir.value.set(lx, ly, 0.92).normalize();
}

export const VISUAL_STYLE_PRESETS = {
  dlss5_neural_photoreal: {
    id: 'dlss5_neural_photoreal',
    label: '🧠 DLSS-5 神经渲染微距真皮重构 · 真实毛孔高光遮蔽与3波长次表面散射 (Stage 43 默认首推)',
    desc: '参考 NVIDIA DLSS 5 神经材质重构：分区真实微米毛孔、双瓣皮脂微腔高光遮蔽、红绿蓝三波长真皮透射与零伪影85mm光学人像',
    hdrMode: 'softbox_portrait',
    keyColor: '#fffaf5',
    fillColor: '#d4e2f4',
    rimColor: '#fff2e2',
    hemiSky: '#f7f9fc',
    hemiGround: '#282426',
    keyIntensity: 1.62,
    fillIntensity: 0.76,
    rimIntensity: 0.92,
    hemiIntensity: 0.56,
    upIntensity: 0.22,
    keyAzimuthDeg: -26,
    keyElevationDeg: 24,
    exposure: 1.01,
    envIntensity: 0.48,
    contrast: 1.03,
    saturation: 0.94,
    warmth: 0.0,
    vignette: 0.14,
    sharpen: 0.20,
    casSharpen: 0.68,
    shadowLift: 0.44,
    specularClarity: 0.64,
    eyeClarity: 1.05,
    poreReliefGlobal: 0.52,
    supersample: 1.75,
    softFocus: 0.02,
    depthBlur: 0.0,
    chromatic: 0.02,
    bloomStrength: 0.04,
    filmGrain: 0.02,
    tyndall: 0.14,
    vintagePhoto: 0.0,
    skinGloss: 0.12,
    sssIntensity: 0.58,
    sssBlur: 0.12,
    microContrast: 0.34,
    highlightRoll: 0.54,
    shadowCrush: 0.02,
    sunFlareVeil: 0.02,
    dappledBokeh: 0.0,
    anamorphicFlare: 0.04,
    lightLeak: 0.0,
    swirlyBokeh: 0.0,
    wetLensDrop: 0.0,
    lensDistortion: 0.0,
    filmLutMode: 'portra_160_sun',
    filmLutStrength: 0.14,
    chiaroscuro: 0.22,
    irisSparkle: 0.24,
    halation: 0.08,
    skinLumen: 0.14,
    cursorTorch: 0.14,
    windowGobo: 'none',
    windowGoboStrength: 0.08,
    tint: [1.00, 1.00, 1.00],
    shadowTint: [0.018, 0.019, 0.022],
  },
  ultra_4k_crystal_clear: {
    id: 'ultra_4k_crystal_clear',
    label: '🔪 4K 超清锐利零模糊光学大师 · 纤毫毕现毛孔与全屏清晰多头陈列 (画质党首推)',
    desc: '全屏零景深模糊、AMD CAS自适应锐化、眼白眼睑自然AO、3D真皮毛孔微雕与暗部细节提亮',
    hdrMode: 'softbox_portrait',
    keyColor: '#fff5e8',
    fillColor: '#889bb0',
    rimColor: '#ffe0b5',
    hemiSky: '#fff8ef',
    hemiGround: '#1a1816',
    keyIntensity: 1.88,
    fillIntensity: 0.58,
    rimIntensity: 1.36,
    hemiIntensity: 0.42,
    upIntensity: 0.22,
    keyAzimuthDeg: -30,
    keyElevationDeg: 28,
    exposure: 1.06,
    envIntensity: 0.50,
    contrast: 1.09,
    saturation: 0.98,
    warmth: 0.03,
    vignette: 0.20,
    sharpen: 0.26,
    casSharpen: 0.84,
    shadowLift: 0.36,
    specularClarity: 0.90,
    eyeClarity: 1.05,
    poreReliefGlobal: 1.22,
    supersample: 1.75,
    softFocus: 0.0,
    depthBlur: 0.0,
    chromatic: 0.03,
    bloomStrength: 0.06,
    filmGrain: 0.02,
    tyndall: 0.24,
    vintagePhoto: 0.0,
    skinGloss: 0.22,
    sssIntensity: 0.92,
    sssBlur: 0.10,
    microContrast: 0.46,
    highlightRoll: 0.46,
    shadowCrush: 0.06,
    sunFlareVeil: 0.04,
    dappledBokeh: 0.0,
    anamorphicFlare: 0.08,
    lightLeak: 0.0,
    swirlyBokeh: 0.0,
    wetLensDrop: 0.0,
    lensDistortion: 0.0,
    filmLutMode: 'portra_160_sun',
    filmLutStrength: 0.28,
    chiaroscuro: 0.38,
    irisSparkle: 0.18,
    halation: 0.14,
    skinLumen: 0.12,
    cursorTorch: 0.35,
    windowGobo: 'none',
    windowGoboStrength: 0.16,
    tint: [1.01, 0.998, 0.98],
    shadowTint: [0.022, 0.020, 0.020],
  },
  sunlit_hair_shadow_film: {
    id: 'sunlit_hair_shadow_film',
    label: '🌞 盛夏逆光发丝投影 · 暖金树隙柔光与超清胶片写真',
    desc: '自然树隙斜切暖阳、柔和发丝微影、全屏清晰五官与柯达Portra暖调',
    hdrMode: 'golden_hour',
    keyColor: '#ffe8c4',
    fillColor: '#7c8e9e',
    rimColor: '#ffd699',
    hemiSky: '#fff2dc',
    hemiGround: '#1a1c18',
    keyIntensity: 1.92,
    fillIntensity: 0.52,
    rimIntensity: 1.42,
    hemiIntensity: 0.38,
    upIntensity: 0.18,
    keyAzimuthDeg: -34,
    keyElevationDeg: 26,
    exposure: 1.04,
    envIntensity: 0.46,
    contrast: 1.10,
    saturation: 0.97,
    warmth: 0.05,
    vignette: 0.24,
    sharpen: 0.20,
    casSharpen: 0.72,
    shadowLift: 0.32,
    specularClarity: 0.78,
    eyeClarity: 0.96,
    poreReliefGlobal: 1.15,
    supersample: 1.5,
    softFocus: 0.10,
    depthBlur: 0.0,
    chromatic: 0.06,
    bloomStrength: 0.08,
    filmGrain: 0.04,
    tyndall: 0.38,
    vintagePhoto: 0.04,
    skinGloss: 0.20,
    sssIntensity: 0.92,
    sssBlur: 0.16,
    microContrast: 0.42,
    highlightRoll: 0.45,
    shadowCrush: 0.08,
    sunFlareVeil: 0.14,
    dappledBokeh: 0.0,
    anamorphicFlare: 0.12,
    lightLeak: 0.04,
    swirlyBokeh: 0.0,
    wetLensDrop: 0.0,
    lensDistortion: 0.02,
    filmLutMode: 'portra_160_sun',
    filmLutStrength: 0.36,
    chiaroscuro: 0.46,
    irisSparkle: 0.16,
    halation: 0.20,
    skinLumen: 0.10,
    cursorTorch: 0.28,
    windowGobo: 'tree_dappled',
    windowGoboStrength: 0.28,
    tint: [1.02, 0.995, 0.96],
    shadowTint: [0.022, 0.024, 0.020],
  },
  cinema_85mm_portrait: {
    id: 'cinema_85mm_portrait',
    label: '📸 85mm 影棚光学微单人像 · DLSS-5 神经真皮散射与清透眼神光 (推荐)',
    desc: '85mm f/1.4 定焦微单光学质感、三波长真皮次表面散射、双瓣毛孔微高光与全屏100%锐利五官',
    hdrMode: 'softbox_portrait',
    keyColor: '#fff5eb',
    fillColor: '#92a8c4',
    rimColor: '#ffe4bc',
    hemiSky: '#fff8f0',
    hemiGround: '#1c1917',
    keyIntensity: 1.86,
    fillIntensity: 0.60,
    rimIntensity: 1.34,
    hemiIntensity: 0.44,
    upIntensity: 0.22,
    keyAzimuthDeg: -30,
    keyElevationDeg: 26,
    exposure: 1.05,
    envIntensity: 0.52,
    contrast: 1.08,
    saturation: 0.98,
    warmth: 0.03,
    vignette: 0.20,
    sharpen: 0.22,
    casSharpen: 0.74,
    shadowLift: 0.34,
    specularClarity: 0.84,
    eyeClarity: 1.04,
    poreReliefGlobal: 1.15,
    supersample: 1.65,
    softFocus: 0.06,
    depthBlur: 0.0,
    chromatic: 0.04,
    bloomStrength: 0.07,
    filmGrain: 0.03,
    tyndall: 0.26,
    vintagePhoto: 0.02,
    skinGloss: 0.22,
    sssIntensity: 0.94,
    sssBlur: 0.16,
    microContrast: 0.42,
    highlightRoll: 0.46,
    shadowCrush: 0.06,
    sunFlareVeil: 0.06,
    dappledBokeh: 0.0,
    anamorphicFlare: 0.08,
    lightLeak: 0.0,
    swirlyBokeh: 0.0,
    wetLensDrop: 0.0,
    lensDistortion: 0.0,
    filmLutMode: 'portra_160_sun',
    filmLutStrength: 0.26,
    chiaroscuro: 0.36,
    irisSparkle: 0.22,
    halation: 0.14,
    skinLumen: 0.16,
    cursorTorch: 0.30,
    windowGobo: 'none',
    windowGoboStrength: 0.14,
    tint: [1.01, 0.998, 0.98],
    shadowTint: [0.020, 0.020, 0.022],
  },
  korean_magazine_glow: {
    id: 'korean_magazine_glow',
    label: '✨ 韩系画报清透水光 · 高调柔焦冷白凝脂滤镜',
    hdrMode: 'softbox_portrait',
    keyColor: '#fffaf8',
    fillColor: '#c6daf8',
    rimColor: '#eef4ff',
    hemiSky: '#ffffff',
    hemiGround: '#2c242c',
    keyIntensity: 1.64,
    fillIntensity: 0.72,
    rimIntensity: 1.46,
    hemiIntensity: 0.52,
    upIntensity: 0.32,
    keyAzimuthDeg: 24,
    keyElevationDeg: 25,
    exposure: 0.97,
    envIntensity: 1.02,
    contrast: 1.04,
    saturation: 1.03,
    warmth: 0.0,
    vignette: 0.18,
    sharpen: 0.28,
    softFocus: 0.18,
    depthBlur: 0.10,
    chromatic: 0.06,
    bloomStrength: 0.14,
    filmGrain: 0.03,
    tyndall: 0.30,
    vintagePhoto: 0.04,
    skinGloss: 0.65,
    sssIntensity: 0.95,
    chiaroscuro: 0.25,
    irisSparkle: 0.90,
    halation: 0.52,
    skinLumen: 0.72,
    cursorTorch: 0.85,
    windowGobo: 'none',
    windowGoboStrength: 0.10,
    tint: [1.01, 1.01, 1.03],
    shadowTint: [0.03, 0.025, 0.04],
  },
  wong_kar_wai_film: {
    id: 'wong_kar_wai_film',
    label: '🎞️ 王家卫式电影胶片 · 复古暖金暗调与黑柔镜晕染',
    hdrMode: 'golden_hour',
    keyColor: '#ffd69e',
    fillColor: '#4c7a78',
    rimColor: '#fbbf24',
    hemiSky: '#ffe8c8',
    hemiGround: '#0e1615',
    keyIntensity: 1.68,
    fillIntensity: 0.36,
    rimIntensity: 1.42,
    hemiIntensity: 0.28,
    upIntensity: 0.18,
    keyAzimuthDeg: 38,
    keyElevationDeg: 30,
    exposure: 0.86,
    envIntensity: 0.85,
    contrast: 1.12,
    saturation: 0.95,
    warmth: 0.08,
    vignette: 0.38,
    sharpen: 0.24,
    softFocus: 0.10,
    depthBlur: 0.04,
    chromatic: 0.14,
    bloomStrength: 0.07,
    filmGrain: 0.14,
    tyndall: 0.48,
    vintagePhoto: 0.28,
    skinGloss: 0.38,
    sssIntensity: 0.88,
    chiaroscuro: 0.72,
    windowGobo: 'venetian_blinds',
    windowGoboStrength: 0.32,
    tint: [1.02, 0.99, 0.93],
    shadowTint: [0.015, 0.035, 0.03],
  },
  dreamy_promist_soft: {
    id: 'dreamy_promist_soft',
    label: '☁️ 电影黑柔镜 (1/4 Pro-Mist) · 极致奶油柔焦彻底消除3D硬边',
    hdrMode: 'softbox_portrait',
    keyColor: '#fff4ea',
    fillColor: '#a4b8dc',
    rimColor: '#fde2e4',
    hemiSky: '#fff8f6',
    hemiGround: '#1c1618',
    keyIntensity: 1.56,
    fillIntensity: 0.52,
    rimIntensity: 1.26,
    hemiIntensity: 0.38,
    upIntensity: 0.24,
    keyAzimuthDeg: 28,
    keyElevationDeg: 28,
    exposure: 0.88,
    envIntensity: 0.90,
    contrast: 1.05,
    saturation: 0.97,
    warmth: 0.03,
    vignette: 0.24,
    sharpen: 0.22,
    softFocus: 0.14,
    depthBlur: 0.04,
    chromatic: 0.10,
    bloomStrength: 0.07,
    filmGrain: 0.06,
    tyndall: 0.36,
    vintagePhoto: 0.12,
    skinGloss: 0.38,
    sssIntensity: 0.86,
    chiaroscuro: 0.50,
    windowGobo: 'none',
    windowGoboStrength: 0.15,
    tint: [1.01, 1.00, 0.99],
    shadowTint: [0.025, 0.02, 0.03],
  },
  kodak_portra_400: {
    id: 'kodak_portra_400',
    label: '📷 柯达 Portra 400 人像胶卷 · 真实光学微单暖肤色温',
    hdrMode: 'golden_hour',
    keyColor: '#ffeed9',
    fillColor: '#8ea8c8',
    rimColor: '#ffe2bd',
    hemiSky: '#fff4e8',
    hemiGround: '#1a1412',
    keyIntensity: 1.62,
    fillIntensity: 0.44,
    rimIntensity: 1.28,
    hemiIntensity: 0.34,
    upIntensity: 0.22,
    keyAzimuthDeg: 32,
    keyElevationDeg: 30,
    exposure: 0.87,
    envIntensity: 0.86,
    contrast: 1.08,
    saturation: 0.96,
    warmth: 0.05,
    vignette: 0.28,
    sharpen: 0.26,
    softFocus: 0.06,
    depthBlur: 0.0,
    chromatic: 0.08,
    bloomStrength: 0.05,
    filmGrain: 0.09,
    tyndall: 0.38,
    vintagePhoto: 0.18,
    skinGloss: 0.36,
    sssIntensity: 0.84,
    chiaroscuro: 0.58,
    windowGobo: 'tree_dappled',
    windowGoboStrength: 0.24,
    tint: [1.01, 0.995, 0.97],
    shadowTint: [0.025, 0.02, 0.02],
  },
  fujifilm_eterna_cinema: {
    id: 'fujifilm_eterna_cinema',
    label: '🍃 富士 Eterna 电影空气感 · 日系清透青白柔焦胶片',
    hdrMode: 'rainy_window',
    keyColor: '#f4f8ff',
    fillColor: '#88abc8',
    rimColor: '#cceeff',
    hemiSky: '#f0f7ff',
    hemiGround: '#121820',
    keyIntensity: 1.58,
    fillIntensity: 0.48,
    rimIntensity: 1.32,
    hemiIntensity: 0.36,
    upIntensity: 0.22,
    keyAzimuthDeg: 28,
    keyElevationDeg: 32,
    exposure: 0.88,
    envIntensity: 0.90,
    contrast: 1.07,
    saturation: 0.94,
    warmth: -0.02,
    vignette: 0.26,
    sharpen: 0.28,
    softFocus: 0.06,
    depthBlur: 0.0,
    chromatic: 0.08,
    bloomStrength: 0.05,
    filmGrain: 0.07,
    tyndall: 0.32,
    vintagePhoto: 0.10,
    skinGloss: 0.38,
    sssIntensity: 0.80,
    chiaroscuro: 0.54,
    windowGobo: 'rain_mullion',
    windowGoboStrength: 0.22,
    tint: [0.98, 1.00, 1.02],
    shadowTint: [0.015, 0.025, 0.04],
  },
  sunset_amber_hdr: {
    id: 'sunset_amber_hdr',
    label: '🌅 暮色琥珀夕照 HDR · 逆光发丝金边与暖橘柔焦散射',
    hdrMode: 'golden_hour',
    keyColor: '#ffe0ba',
    fillColor: '#7c8db5',
    rimColor: '#fbbf24',
    hemiSky: '#ffedd5',
    hemiGround: '#18100e',
    keyIntensity: 1.66,
    fillIntensity: 0.42,
    rimIntensity: 1.52,
    hemiIntensity: 0.32,
    upIntensity: 0.20,
    keyAzimuthDeg: 40,
    keyElevationDeg: 26,
    exposure: 0.87,
    envIntensity: 0.92,
    contrast: 1.09,
    saturation: 0.99,
    warmth: 0.09,
    vignette: 0.30,
    sharpen: 0.26,
    softFocus: 0.07,
    depthBlur: 0.0,
    chromatic: 0.10,
    bloomStrength: 0.06,
    filmGrain: 0.08,
    tyndall: 0.52,
    vintagePhoto: 0.18,
    skinGloss: 0.40,
    sssIntensity: 0.88,
    chiaroscuro: 0.62,
    windowGobo: 'tree_dappled',
    windowGoboStrength: 0.28,
    tint: [1.02, 0.99, 0.95],
    shadowTint: [0.03, 0.02, 0.025],
  },
  rainy_study: {
    id: 'rainy_study',
    label: '🌧️ 雨夜伴学书房 · 窗畔冷暖交织与柔和景深虚化',
    hdrMode: 'rainy_window',
    keyColor: '#ffeed6',
    fillColor: '#7f98bd',
    rimColor: '#f7d8b6',
    hemiSky: '#f5ece0',
    hemiGround: '#1a1514',
    keyIntensity: 1.98,
    fillIntensity: 0.50,
    rimIntensity: 1.24,
    hemiIntensity: 0.42,
    upIntensity: 0.30,
    keyAzimuthDeg: 34,
    keyElevationDeg: 30,
    exposure: 0.95,
    envIntensity: 0.46,
    contrast: 1.08,
    saturation: 0.96,
    warmth: 0.06,
    vignette: 0.32,
    sharpen: 0.24,
    softFocus: 0.42,
    depthBlur: 0.30,
    chromatic: 0.18,
    bloomStrength: 0.08,
    filmGrain: 0.12,
    tyndall: 0.56,
    vintagePhoto: 0.28,
    skinGloss: 0.18,
    sssIntensity: 1.45,
    chiaroscuro: 0.62,
    windowGobo: 'rain_mullion',
    windowGoboStrength: 0.32,
    tint: [1.01, 0.99, 0.97],
    shadowTint: [0.045, 0.035, 0.05],
  },
  warm_gallery: {
    id: 'warm_gallery',
    label: '🏛️ 暖金私人藏馆 · 伦勃朗柔化立体光影',
    hdrMode: 'museum_velvet',
    keyColor: '#ffebd6',
    fillColor: '#89a0c4',
    rimColor: '#ffe0c4',
    hemiSky: '#fff5ee',
    hemiGround: '#1a1418',
    keyIntensity: 1.96,
    fillIntensity: 0.48,
    rimIntensity: 1.22,
    hemiIntensity: 0.40,
    upIntensity: 0.28,
    keyAzimuthDeg: 34,
    keyElevationDeg: 32,
    exposure: 0.95,
    envIntensity: 0.46,
    contrast: 1.08,
    saturation: 0.98,
    warmth: 0.07,
    vignette: 0.32,
    sharpen: 0.24,
    softFocus: 0.40,
    depthBlur: 0.28,
    chromatic: 0.16,
    bloomStrength: 0.08,
    filmGrain: 0.10,
    tyndall: 0.52,
    vintagePhoto: 0.24,
    skinGloss: 0.18,
    sssIntensity: 1.42,
    chiaroscuro: 0.64,
    windowGobo: 'venetian_blinds',
    windowGoboStrength: 0.30,
    tint: [1.02, 0.99, 0.96],
    shadowTint: [0.04, 0.03, 0.035],
  },
  cold_studio: {
    id: 'cold_studio',
    label: '❄️ 清冷冰瓷艺术馆 · 无影灯清冷冰瓷滤镜',
    hdrMode: 'rainy_window',
    keyColor: '#eef6ff',
    fillColor: '#82a4cf',
    rimColor: '#bae6fd',
    hemiSky: '#eaf3ff',
    hemiGround: '#121824',
    keyIntensity: 1.95,
    fillIntensity: 0.54,
    rimIntensity: 1.28,
    hemiIntensity: 0.42,
    upIntensity: 0.30,
    keyAzimuthDeg: 28,
    keyElevationDeg: 36,
    exposure: 0.95,
    envIntensity: 0.46,
    contrast: 1.10,
    saturation: 0.93,
    warmth: -0.05,
    vignette: 0.32,
    sharpen: 0.30,
    softFocus: 0.32,
    depthBlur: 0.24,
    chromatic: 0.14,
    bloomStrength: 0.06,
    filmGrain: 0.10,
    tyndall: 0.42,
    vintagePhoto: 0.16,
    skinGloss: 0.20,
    sssIntensity: 1.32,
    chiaroscuro: 0.65,
    windowGobo: 'venetian_blinds',
    windowGoboStrength: 0.28,
    tint: [0.97, 0.99, 1.03],
    shadowTint: [0.02, 0.035, 0.06],
  },
  gothic_velvet: {
    id: 'gothic_velvet',
    label: '🕯️ 暗夜哥特烛光 · 古典油画级柔焦明暗',
    hdrMode: 'museum_velvet',
    keyColor: '#ffdcb3',
    fillColor: '#6676a0',
    rimColor: '#fda4af',
    hemiSky: '#ffe8d6',
    hemiGround: '#140c10',
    keyIntensity: 2.08,
    fillIntensity: 0.38,
    rimIntensity: 1.32,
    hemiIntensity: 0.32,
    upIntensity: 0.24,
    keyAzimuthDeg: 42,
    keyElevationDeg: 28,
    exposure: 0.93,
    envIntensity: 0.38,
    contrast: 1.12,
    saturation: 0.95,
    warmth: 0.12,
    vignette: 0.40,
    sharpen: 0.20,
    softFocus: 0.48,
    depthBlur: 0.36,
    chromatic: 0.22,
    bloomStrength: 0.09,
    filmGrain: 0.16,
    tyndall: 0.64,
    vintagePhoto: 0.44,
    skinGloss: 0.18,
    sssIntensity: 1.48,
    chiaroscuro: 0.78,
    windowGobo: 'gothic_lattice',
    windowGoboStrength: 0.36,
    tint: [1.03, 0.98, 0.93],
    shadowTint: [0.06, 0.03, 0.045],
  },
  luxury_porcelain: {
    id: 'luxury_porcelain',
    label: '🌸 晨光凝脂画报 · 柔光箱无影高通透玉肌',
    hdrMode: 'softbox_portrait',
    keyColor: '#fff5eb',
    fillColor: '#a8c0e2',
    rimColor: '#ffe4e6',
    hemiSky: '#fff8f6',
    hemiGround: '#20181c',
    keyIntensity: 1.88,
    fillIntensity: 0.64,
    rimIntensity: 1.18,
    hemiIntensity: 0.52,
    upIntensity: 0.34,
    keyAzimuthDeg: 28,
    keyElevationDeg: 28,
    exposure: 0.97,
    envIntensity: 0.56,
    contrast: 1.05,
    saturation: 0.98,
    warmth: 0.05,
    vignette: 0.24,
    sharpen: 0.20,
    softFocus: 0.52,
    depthBlur: 0.32,
    chromatic: 0.15,
    bloomStrength: 0.09,
    filmGrain: 0.08,
    tyndall: 0.48,
    vintagePhoto: 0.20,
    skinGloss: 0.20,
    sssIntensity: 1.52,
    chiaroscuro: 0.45,
    windowGobo: 'tree_dappled',
    windowGoboStrength: 0.22,
    tint: [1.02, 0.995, 0.98],
    shadowTint: [0.04, 0.03, 0.035],
  },
  cyber_vitrine: {
    id: 'cyber_vitrine',
    label: '🔮 雨夜霓虹展柜 · 冰蓝绯红冷暖双切割',
    hdrMode: 'rainy_window',
    keyColor: '#f0f7ff',
    fillColor: '#38bdf8',
    rimColor: '#fb7185',
    hemiSky: '#e0f2fe',
    hemiGround: '#140c1e',
    keyIntensity: 1.95,
    fillIntensity: 0.46,
    rimIntensity: 1.65,
    hemiIntensity: 0.38,
    upIntensity: 0.28,
    keyAzimuthDeg: -34,
    keyElevationDeg: 30,
    exposure: 0.94,
    envIntensity: 0.44,
    contrast: 1.10,
    saturation: 1.04,
    warmth: -0.02,
    vignette: 0.36,
    sharpen: 0.24,
    softFocus: 0.40,
    depthBlur: 0.32,
    chromatic: 0.24,
    bloomStrength: 0.10,
    filmGrain: 0.10,
    tyndall: 0.58,
    vintagePhoto: 0.18,
    skinGloss: 0.22,
    sssIntensity: 1.38,
    chiaroscuro: 0.68,
    windowGobo: 'venetian_blinds',
    windowGoboStrength: 0.34,
    tint: [0.99, 0.98, 1.04],
    shadowTint: [0.04, 0.01, 0.06],
  },
  vintage_film: {
    id: 'vintage_film',
    label: '🕰️ 民国银盐老相片 · 怀旧柔焦胶片颗粒与暖金高光',
    hdrMode: 'golden_hour',
    keyColor: '#ffe6c8',
    fillColor: '#94887c',
    rimColor: '#fcd34d',
    hemiSky: '#fff0db',
    hemiGround: '#1c1512',
    keyIntensity: 1.98,
    fillIntensity: 0.44,
    rimIntensity: 1.24,
    hemiIntensity: 0.38,
    upIntensity: 0.26,
    keyAzimuthDeg: 38,
    keyElevationDeg: 32,
    exposure: 0.94,
    envIntensity: 0.42,
    contrast: 1.08,
    saturation: 0.86,
    warmth: 0.14,
    vignette: 0.40,
    sharpen: 0.18,
    softFocus: 0.54,
    depthBlur: 0.38,
    chromatic: 0.24,
    bloomStrength: 0.09,
    filmGrain: 0.22,
    tyndall: 0.68,
    vintagePhoto: 0.58,
    skinGloss: 0.18,
    sssIntensity: 1.42,
    chiaroscuro: 0.65,
    windowGobo: 'rain_mullion',
    windowGoboStrength: 0.32,
    tint: [1.04, 0.98, 0.90],
    shadowTint: [0.07, 0.05, 0.03],
  },
};

const pmremEnvCache = new WeakMap();

export function applyBaseRendererSettings(renderer, exposure = 0.90) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  const soft = isSoftwareRenderer(renderer);
  renderer.shadowMap.enabled = !soft;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = !soft;
}

export function requestShadowUpdate(renderer) {
  if (renderer && renderer.shadowMap && renderer.shadowMap.enabled) {
    renderer.shadowMap.needsUpdate = true;
  }
}

export function ensureSceneEnvironment(renderer, scene, intensity = 0.48, hdrMode = 'softbox_portrait') {
  let envMapByMode = pmremEnvCache.get(renderer);
  if (!envMapByMode) {
    envMapByMode = new Map();
    pmremEnvCache.set(renderer, envMapByMode);
  }
  const modeKey = hdrMode || 'softbox_portrait';
  let envTex = envMapByMode.get(modeKey);
  if (!envTex && typeof renderer.compile === 'function' && !isSoftwareRenderer(renderer)) {
    const modeToStudioPreset = {
      softbox_portrait: LIGHT_PRESETS.softbox,
      golden_hour: LIGHT_PRESETS.window,
      rainy_window: LIGHT_PRESETS.overcast,
      museum_velvet: LIGHT_PRESETS.rembrandt,
      softbox: LIGHT_PRESETS.softbox,
      window: LIGHT_PRESETS.window,
      rembrandt: LIGHT_PRESETS.rembrandt,
      overcast: LIGHT_PRESETS.overcast,
    };
    const studioPreset = modeToStudioPreset[modeKey] || LIGHT_PRESETS.softbox;
    envTex = buildStudioEnvironment(renderer, studioPreset);
    envMapByMode.set(modeKey, envTex);
  }
  scene.environment = envTex;
  if ('environmentIntensity' in scene) {
    scene.environmentIntensity = intensity;
  }
  return envTex;
}

let _fallbackWhitePhotoTex = null;
function getFallbackPhotoTex() {
  if (!_fallbackWhitePhotoTex) {
    _fallbackWhitePhotoTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    _fallbackWhitePhotoTex.needsUpdate = true;
  }
  return _fallbackWhitePhotoTex;
}

/**
 * Creates a per-material uniform bundle for Stage 36 True-Dermis Micro-Structure
 * & Real-Time Facial Color, Makeup, Lip Vermilion, Freckle, Beauty-Mark & Reference-Photo Projection.
 */
export function createSkinGradingUniforms(initial = {}) {
  return {
    uSkinToneTint: { value: new THREE.Color(initial.skinToneTint || '#ffffff') },
    uSkinWarmthShift: { value: Number(initial.skinWarmthShift ?? 0.0) },
    uSkinBrightness: { value: Number(initial.skinBrightness ?? 1.0) },
    uSkinRosiness: { value: Number(initial.skinRosiness ?? 0.25) },
    uPoreScale: { value: Number(initial.poreScale ?? 1.0) },
    uPoreRelief: { value: Number(initial.poreRelief ?? 0.26) },
    uTZoneOiliness: { value: Number(initial.tZoneOiliness ?? 0.32) },
    uSpecularLobe: { value: Number(initial.specularLobe ?? 0.45) },
    uCharSssDepth: { value: Number(initial.charSssDepth ?? 0.80) },
    uCharSssColor: { value: new THREE.Color(initial.charSssColor || '#e85a4f') },
    uVascularity: { value: Number(initial.vascularity ?? 0.24) },
    uSkinMicroMottle: { value: Number(initial.skinMicroMottle ?? 0.18) },
    uVellusFuzz: { value: Number(initial.vellusFuzz ?? 0.36) },
    uLipCreaseDepth: { value: Number(initial.lipCreaseDepth ?? 0.36) },
    uEarTipFlush: { value: Number(initial.earTipFlush ?? 0.32) },
    uBlushColor: { value: new THREE.Color(initial.blushColor || '#f07682') },
    uBlushStrength: { value: Number(initial.blushStrength ?? 0.22) },
    uEyeshadowColor: { value: new THREE.Color(initial.eyeshadowColor || '#c88278') },
    uEyeshadowStrength: { value: Number(initial.eyeshadowStrength ?? 0.0) },
    uEyelinerStyle: { value: Number(initial.eyelinerStyle ?? 0.0) },
    uEyelinerStrength: { value: Number(initial.eyelinerStrength ?? 0.0) },
    uEyelinerColor: { value: new THREE.Color(initial.eyelinerColor || '#2d201e') },
    uAegyoSalStrength: { value: Number(initial.aegyoSalStrength ?? 0.18) },
    uDarkCircleStrength: { value: Number(initial.darkCircleStrength ?? 0.0) },
    uLipColor: { value: new THREE.Color(initial.lipColor || '#cb5362') },
    uLipStrength: { value: Number(initial.lipStrength ?? 0.36) },
    uLipGloss: { value: Number(initial.lipGloss ?? 0.48) },
    uFreckleStrength: { value: Number(initial.freckleStrength ?? 0.0) },
    uBeautyMarkMode: { value: Number(initial.beautyMarkMode ?? 0.0) },
    uNeckDewStrength: { value: Number(initial.neckDewStrength ?? 0.85) },
    uHighlightGlowStrength: { value: Number(initial.highlightGlowStrength ?? 0.0) },
    uHighlightGlowMode: { value: Number(initial.highlightGlowMode ?? 0.0) },
    uTearTrackStrength: { value: Number(initial.tearTrackStrength ?? 0.0) },
    uTearType: { value: Number(initial.tearType ?? 0.0) },
    uLipGlossStrength: { value: Number(initial.lipGlossStrength ?? 0.0) },
    uFaceSplatterStrength: { value: Number(initial.faceSplatterStrength ?? 0.0) },
    uCharFluidSeed: { value: Number(initial.charFluidSeed ?? 1.37) },
    uPhotoProjMap: { value: initial.photoProjMap || getFallbackPhotoTex() },
    uPhotoProjEnabled: { value: initial.photoProjMap ? 1.0 : 0.0 },
    uPhotoProjStrength: { value: Number(initial.photoProjStrength ?? 0.0) },
    uPhotoProjScale: { value: Number(initial.photoProjScale ?? 1.0) },
    uPhotoProjOffset: { value: new THREE.Vector2(Number(initial.photoProjOffsetX ?? 0.0), Number(initial.photoProjOffsetY ?? 0.0)) },
  };
}

/**
 * Stage 36 · Anti-Silicone True-Dermis 3D Millimeter-Space Micro-Pore & Real-Time Facial Grading Pipeline:
 * 1. Solves the MakeHuman full-body UV resolution bottleneck (~200px face island) by synthesizing
 *    3-scale 3D millimeter-space cellular sebaceous pores, Langer's rhomboid creases, and vertical
 *    lip-vermilion furrows directly at `vPortraitLocalPos` (infinite sharpness even at 11cm macro zoom!).
 * 2. Adds subtle organic melanin & hemoglobin chromophore micro-mottling (`uSkinMicroMottle`) so skin
 *    never looks like a flat uniform CG color fill.
 * 3. Provides 0ms real-time GPU grading for Skin Tone, Warmth, Brightness, Rosiness, Blush, Eyeshadow,
 *    Aegyo-Sal, Dark Circles, Lip Vermilion Color/Gloss, Freckles, and 6 Beauty-Mark Positions!
 */
export function injectAestheticSubsurfaceScattering(material, initialSss = 0.92, initialGrading = {}) {
  material.userData = material.userData || {};
  material.userData.uSssIntensity = GLOBAL_CHIAROSCURO_UNIFORMS.uSssIntensity;
  const gradingU = material.userData.skinGradingUniforms || createSkinGradingUniforms(initialGrading);
  material.userData.skinGradingUniforms = gradingU;

  if (typeof initialSss === 'number') {
    GLOBAL_CHIAROSCURO_UNIFORMS.uSssIntensity.value = initialSss;
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSssIntensity = GLOBAL_CHIAROSCURO_UNIFORMS.uSssIntensity;
    shader.uniforms.uChiaroscuro = GLOBAL_CHIAROSCURO_UNIFORMS.uChiaroscuro;
    shader.uniforms.uWindowGoboMode = GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboMode;
    shader.uniforms.uWindowGoboStrength = GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboStrength;
    shader.uniforms.uWindowGoboPhase = GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboPhase;
    shader.uniforms.uWindowLightDir = GLOBAL_CHIAROSCURO_UNIFORMS.uWindowLightDir;
    shader.uniforms.uCursorLightDir = GLOBAL_CHIAROSCURO_UNIFORMS.uCursorLightDir;
    shader.uniforms.uCursorTorchIntensity = GLOBAL_CHIAROSCURO_UNIFORMS.uCursorTorchIntensity;
    for (const [k, uObj] of Object.entries(gradingU)) {
      shader.uniforms[k] = uObj;
    }

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vPortraitWorldPos;
      varying vec3 vPortraitLocalPos;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vPortraitLocalPos = position;
      vPortraitWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );

    const preintegratedLightsPars = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
      'reflectedLight.directDiffuse += directLight.color * BRDF_Lambert( material.diffuseColor ) * skinPreintegratedDiffuse( geometryNormal, directLight.direction );'
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_pars_fragment>',
      `
      uniform float uSssIntensity;
      uniform float uChiaroscuro;
      uniform float uWindowGoboMode;
      uniform float uWindowGoboStrength;
      uniform float uWindowGoboPhase;
      uniform vec3 uWindowLightDir;
      uniform vec3 uCursorLightDir;
      uniform float uCursorTorchIntensity;
      uniform vec3 uSkinToneTint;
      uniform float uSkinWarmthShift;
      uniform float uSkinBrightness;
      uniform float uSkinRosiness;
      uniform float uPoreScale;
      uniform float uPoreRelief;
      uniform float uTZoneOiliness;
      uniform float uSpecularLobe;
      uniform float uCharSssDepth;
      uniform vec3 uCharSssColor;
      uniform float uVascularity;
      uniform float uSkinMicroMottle;
      uniform float uVellusFuzz;
      uniform float uLipCreaseDepth;
      uniform float uEarTipFlush;
      uniform vec3 uBlushColor;
      uniform float uBlushStrength;
      uniform vec3 uEyeshadowColor;
      uniform float uEyeshadowStrength;
      uniform float uEyelinerStyle;
      uniform float uEyelinerStrength;
      uniform vec3 uEyelinerColor;
      uniform float uAegyoSalStrength;
      uniform float uDarkCircleStrength;
      uniform vec3 uLipColor;
      uniform float uLipStrength;
      uniform float uLipGloss;
      uniform float uFreckleStrength;
      uniform float uBeautyMarkMode;
      uniform float uNeckDewStrength;
      uniform float uHighlightGlowStrength;
      uniform float uHighlightGlowMode;
      uniform float uTearTrackStrength;
      uniform float uTearType;
      uniform float uLipGlossStrength;
      uniform float uFaceSplatterStrength;
      uniform float uCharFluidSeed;
      uniform sampler2D uPhotoProjMap;
      uniform float uPhotoProjEnabled;
      uniform float uPhotoProjStrength;
      uniform float uPhotoProjScale;
      uniform vec2 uPhotoProjOffset;
      varying vec3 vPortraitWorldPos;
      varying vec3 vPortraitLocalPos;
      float vDermisPoreCavity;
      float vLipVermilionMask;
      float vWetFluidSpecMask;
      float vDewSpecMask;
      float vFluidHeight;
      float gSkinCurv = 0.35;

      // Stage 56 · Master Pre-Integrated Curvature-Adaptive Subsurface Scattering & Penner Split-Channel Normal (画质提升/src/skinMaterial.js)
      vec3 skinPreintegratedDiffuse(vec3 Nd, vec3 L) {
        vec3 Ns = normalize(vNormal);
        float ndlR = dot(normalize(mix(Nd, Ns, 0.8)), L);
        float ndlG = dot(normalize(mix(Nd, Ns, 0.4)), L);
        float ndlB = dot(Nd, L);
        float scatterAmt = clamp(uSssIntensity * clamp(uCharSssDepth, 0.2, 1.4), 0.0, 1.5);
        vec3 w = mix(vec3(0.16, 0.055, 0.03), vec3(0.62, 0.26, 0.15), gSkinCurv) * scatterAmt;
        vec3 nl = clamp((vec3(ndlR, ndlG, ndlB) + w) / ((1.0 + w) * (1.0 + w)), 0.0, 1.0);
        nl = smoothstep(0.0, 1.0, nl) * 0.35 + nl * 0.65;
        float band = exp(-pow((ndlR + 0.05) / max(0.18, 0.36 * gSkinCurv), 2.0)) * (1.0 - smoothstep(0.1, 0.55, ndlB));
        vec3 sssTint = mix(vec3(0.88, 0.26, 0.18), uCharSssColor, 0.35);
        return nl + sssTint * band * 0.07 * scatterAmt;
      }
      ` + preintegratedLightsPars + `

      float dermisHash21(vec2 p) {
        p = fract(p * vec2(234.56, 789.12));
        p += dot(p, p + 34.56);
        return fract(p.x * p.y);
      }

      float dermisNoise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(dermisHash21(i), dermisHash21(i + vec2(1.0, 0.0)), u.x),
          mix(dermisHash21(i + vec2(0.0, 1.0)), dermisHash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      // Stage 44 · DLSS-5-Inspired Anatomical Zone-Specific Cellular Pore & Langer's Rhomboid Micro-Field
      // Supports per-character uPoreScale and phase seed so every head has unique micro-geometry!
      float compute3DPoreField(vec3 localPos) {
        vec2 charSeed = vec2(
          dot(uSkinToneTint, vec3(19.7, 37.3, 53.1)) + uSkinWarmthShift * 41.0,
          dot(uBlushColor, vec3(23.1, 47.9, 13.7)) + uSkinBrightness * 29.0
        );
        float pScale = clamp(uPoreScale, 0.45, 2.5);
        // Ultra-fine sub-millimeter scale (prevents macroscopic 2mm silicone/orange-peel waves!)
        vec2 mm = vec2(atan(localPos.x, max(0.02, localPos.z + 0.02)) * 210.0, localPos.y * 2100.0) * pScale + fract(charSeed) * 14.0;
        float tZonePore = max(
          exp(-pow(localPos.x / 0.024, 2.0)) * exp(-pow((localPos.y + 0.006) / 0.016, 2.0)),
          exp(-pow(localPos.x / 0.038, 2.0)) * smoothstep(0.025, 0.055, localPos.y) * 0.55
        );
        float freqScale = mix(3.4, 4.2, tZonePore);
        vec2 cell = floor(mm * freqScale);
        vec2 fracP = fract(mm * freqScale) - 0.5;
        // Keep jitter <= 0.16 and crater radius <= 0.22 so poreCrater is identically 1.0 at cell borders (zero dFdx spikes!)
        vec2 jitter = vec2(dermisHash21(cell) - 0.5, dermisHash21(cell + 17.3) - 0.5) * 0.32;
        float dPore = length(fracP - jitter);
        float poreCrater = smoothstep(0.06, 0.21, dPore);
        float cristaeA = sin((mm.x + mm.y) * 4.8) * cos((mm.x - mm.y) * 4.8) * 0.5 + 0.5;
        float cristaeB = dermisNoise2D(vec2(mm.x * 3.8 - mm.y * 2.8, mm.y * 3.8 + mm.x * 2.8));
        float zoneWeight = 0.45 + 0.55 * tZonePore;
        return clamp(mix(0.64, poreCrater * 0.62 + (0.55 * cristaeA + 0.45 * cristaeB) * 0.38, zoneWeight), 0.0, 1.0);
      }

      // Exact 3D Lip Vermilion Mask & Vertical Lip Sulci Relief (aligned to daz_asian_head_base.glb y=-0.0358..-0.0516)
      float computeLipVermilionMask(vec3 p, out float lipCrease) {
        float xNorm = p.x / 0.0202;
        float cupidsBow = -0.0358 - 0.0009 * cos(clamp(xNorm, -1.0, 1.0) * 3.14159 * 2.0) - 0.0084 * pow(abs(xNorm), 1.65);
        float lowerBorder = -0.0516 + 0.0062 * pow(abs(xNorm), 1.75);
        float inX = 1.0 - smoothstep(0.80, 1.02, abs(xNorm));
        float inY = smoothstep(lowerBorder - 0.0016, lowerBorder + 0.0016, p.y)
                  * (1.0 - smoothstep(cupidsBow - 0.0014, cupidsBow + 0.0014, p.y));
        float inZ = smoothstep(0.0925, 0.0985, p.z);
        float mask = clamp(inX * inY * inZ, 0.0, 1.0);
        float creaseWave = dermisNoise2D(vec2(p.x * 1600.0, p.y * 280.0));
        lipCrease = mix(0.5, creaseWave, mask * clamp(uLipCreaseDepth * 1.3, 0.0, 1.3));
        return mask;
      }

      // World-Space Architectural Window Gobo (NEVER stamps identical local-space shadow masks onto every head!)
      float computeWindowBeamEnvelope(vec3 worldPos, vec3 localPos, vec3 lightDir) {
        if (uWindowGoboMode < 0.5 || uWindowGoboStrength <= 0.001) return 1.0;
        vec3 L = normalize(lightDir);
        vec3 rightAx = normalize(cross(vec3(0.0, 1.0, 0.0), L) + vec3(1e-4, 0.0, 0.0));
        vec3 upAx = normalize(cross(L, rightAx));
        vec2 wp = vec2(dot(worldPos, rightAx), dot(worldPos, upAx)) * 0.24;
        float ph = uWindowGoboPhase;

        float pattern = 1.0;
        if (uWindowGoboMode < 1.5) {
          float mx = smoothstep(-0.55, 0.35, cos((wp.x + sin(ph * 0.6) * 0.8) * 0.68));
          float my = smoothstep(-0.55, 0.35, cos((wp.y + cos(ph * 0.5) * 0.6) * 0.68));
          pattern = 0.58 + 0.42 * mx * my;
        } else if (uWindowGoboMode < 2.5) {
          float slat = smoothstep(-0.32, 0.36, cos((wp.y * 1.65 + wp.x * 0.35) + sin(ph * 0.6) * 1.1));
          pattern = 0.54 + 0.46 * slat;
        } else if (uWindowGoboMode < 3.5) {
          float d1 = smoothstep(-0.45, 0.38, cos((wp.x + wp.y) * 0.72 + sin(ph * 0.5) * 0.7));
          float d2 = smoothstep(-0.45, 0.38, cos((wp.x - wp.y) * 0.72 - cos(ph * 0.5) * 0.7));
          pattern = 0.56 + 0.44 * d1 * d2;
        } else {
          float leaf1 = sin(wp.x * 0.78 + ph * 0.7) * cos(wp.y * 0.84 - ph * 0.6);
          float leaf2 = sin((wp.x - wp.y) * 0.58 - ph * 0.5) * cos((wp.x + wp.y) * 0.52 + ph * 0.8);
          float dappled = smoothstep(-0.28, 0.36, 0.55 * leaf1 + 0.45 * leaf2);
          pattern = 0.58 + 0.42 * dappled;
        }
        return mix(1.0, pattern, clamp(uWindowGoboStrength * 0.72, 0.0, 0.82));
      }

      // Stage 46 · Energy-Conserving Separable Subsurface Scattering (prevents orange-brick shadow/terminator burn!)
      vec3 computeDualLobeSkinSSS(vec3 fragNormal, vec3 lightDir, vec3 lightColor, vec3 viewDir, vec3 localPos) {
        float ndl = dot(fragNormal, lightDir);
        float sssDepth = clamp(uCharSssDepth, 0.0, 1.4);
        // Subtle physiological wrap across terminator without turning shadows orange
        float wrapR = smoothstep(-0.48 * max(0.5, sssDepth), 0.36, ndl) * (1.0 - smoothstep(0.08, 0.68, ndl));
        float wrapG = smoothstep(-0.34 * max(0.5, sssDepth), 0.30, ndl) * (1.0 - smoothstep(0.06, 0.60, ndl));
        float wrapB = smoothstep(-0.24 * max(0.5, sssDepth), 0.25, ndl) * (1.0 - smoothstep(0.04, 0.54, ndl));
        vec3 sssTint = mix(vec3(1.0, 0.78, 0.74), uCharSssColor, 0.28);
        vec3 triWaveSSS = vec3(wrapR * 0.14, wrapG * 0.10, wrapB * 0.08) * sssTint;

        // Thin-tissue back-translucency across nasal alae & ear helix only under direct backlight
        float thinTissueMask = max(
          smoothstep(0.058, 0.078, abs(localPos.x)) * smoothstep(-0.025, 0.024, localPos.y),
          smoothstep(0.084, 0.098, localPos.z) * smoothstep(-0.020, 0.006, localPos.y)
        );
        float backTrans = pow(clamp(dot(-viewDir, lightDir) + 0.15, 0.0, 1.0), 2.6) * thinTissueMask;
        vec3 rubyTrans = mix(vec3(0.95, 0.52, 0.48), uCharSssColor, 0.35) * backTrans * 0.10 * sssDepth;
        return (triWaveSSS + rubyTrans) * lightColor * uSssIntensity * sssDepth;
      }`
    );

    // Stage 46 · Real-Time Biophysical Facial Chromophore Zones, Supratarsal Fold, Lip Seam AO & Makeup Grading
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      {
        vec3 p = vPortraitLocalPos;
        float lipCreaseVal = 0.5;
        float lipMask = computeLipVermilionMask(p, lipCreaseVal);
        vLipVermilionMask = lipMask;

        // 0. Direct 3D Frontal Portrait Photo Projection (solves 286px MakeHuman UV bottleneck!)
        float eyeHoleMask = smoothstep(0.0040, 0.0068, length((vec2(abs(p.x), p.y) - vec2(0.0288, 0.0162)) * vec2(0.74, 1.45)));
        if (uPhotoProjEnabled > 0.5 && uPhotoProjStrength > 0.005 && p.z > 0.032) {
          float pScale = max(0.45, uPhotoProjScale);
          vec2 projUV = vec2(
            0.5 + (p.x / (0.128 * pScale)) + uPhotoProjOffset.x,
            0.51 + (p.y / (0.148 * pScale)) + uPhotoProjOffset.y
          );
          if (projUV.x > 0.02 && projUV.x < 0.98 && projUV.y > 0.02 && projUV.y < 0.98) {
            vec4 photoSample = texture2D(uPhotoProjMap, projUV);
            vec3 photoLinear = pow(max(photoSample.rgb, vec3(0.001)), vec3(2.2));
            // Normalize photo albedo to match base dermis luminance while transferring authentic facial detail
            float baseLum = max(0.08, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));
            float photoLum = max(0.08, dot(photoLinear, vec3(0.299, 0.587, 0.114)));
            vec3 relitPhoto = mix(photoLinear, photoLinear * clamp(baseLum / photoLum, 0.72, 1.38), 0.55);
            float ovalDist = length((p.xy - vec2(0.0, -0.001)) / vec2(0.054, 0.058));
            float ovalFeather = (1.0 - smoothstep(0.68, 1.04, ovalDist)) * smoothstep(0.035, 0.068, p.z) * eyeHoleMask;
            diffuseColor.rgb = mix(diffuseColor.rgb, relitPhoto, clamp(ovalFeather * uPhotoProjStrength, 0.0, 0.95));
          }
        }

        // 1. Base Skin Tone Tint, Warmth Shift & Brightness (clamped to prevent orange saturation!)
        vec3 skinCol = diffuseColor.rgb * uSkinToneTint * uSkinBrightness;
        float wShift = clamp(uSkinWarmthShift, -0.25, 0.25);
        float rShift = clamp(uSkinRosiness, 0.0, 0.65);
        skinCol.r *= (1.0 + wShift * 0.055 + rShift * 0.032);
        skinCol.g *= (1.0 + wShift * 0.015 - rShift * 0.008);
        skinCol.b *= (1.0 - wShift * 0.055 - rShift * 0.014);

        // 1B. Biophysical 3-Zone Facial Chromophore Distribution (breaks uniform silicone-mask color!)
        float frontFace = smoothstep(0.045, 0.082, p.z) * (1.0 - lipMask);
        float foreheadZone = smoothstep(0.018, 0.048, p.y) * frontFace;
        float midfaceZone = exp(-pow((p.y + 0.002) / 0.016, 2.0)) * frontFace;
        float lowerJawZone = smoothstep(-0.018, -0.048, p.y) * frontFace;
        skinCol *= mix(vec3(1.0), vec3(1.008, 1.003, 0.986), foreheadZone * 0.55);
        skinCol *= mix(vec3(1.0), vec3(1.014, 0.988, 0.984), midfaceZone * 0.50);
        skinCol *= mix(vec3(1.0), vec3(0.980, 0.996, 1.010), lowerJawZone * 0.62);

        // 1C. Anatomical Micro-Shading: Supratarsal Double-Eyelid Fold (双眼皮折痕), Nasal Alar Groove & Philtrum Columns
        if (p.z > 0.072) {
          float ax = abs(p.x);
          // East Asian Supratarsal Double-Eyelid Crease & Tarsal Plate Highlight
          float eyeXRel = (ax - 0.0285) / 0.0128;
          float inEyeSpan = smoothstep(-0.96, -0.58, eyeXRel) * (1.0 - smoothstep(0.76, 1.12, eyeXRel));
          float creaseArchY = 0.0246 - 0.0020 * eyeXRel * eyeXRel - 0.0004 * eyeXRel;
          float creaseGroove = exp(-pow((p.y - creaseArchY) / 0.00048, 2.0)) * inEyeSpan;
          float tarsalHighlight = exp(-pow((p.y - (creaseArchY - 0.00085)) / 0.00065, 2.0)) * inEyeSpan;
          skinCol *= (1.0 - 0.15 * creaseGroove);
          skinCol += vec3(0.016, 0.014, 0.013) * tarsalHighlight;

          // Nasal Alar Crease (鼻翼沟微红与立体暗部) & Nostril Cavity AO (鼻孔深处自然暗影)
          float alarGroove = exp(-pow((ax - 0.0142) / 0.0022, 2.0)) * exp(-pow((p.y + 0.0146) / 0.0042, 2.0)) * smoothstep(0.091, 0.100, p.z);
          float nostrilAO = exp(-pow((ax - 0.0068) / 0.0026, 2.0)) * exp(-pow((p.y + 0.0182) / 0.0020, 2.0)) * smoothstep(0.096, 0.106, p.z);
          skinCol = mix(skinCol, skinCol * vec3(0.88, 0.78, 0.77), alarGroove * 0.52);
          skinCol *= (1.0 - 0.42 * nostrilAO);

          // Philtrum Columns (人中脊微高光与人中沟微影) & Mentolabial Crease (颏唇沟微影)
          float philtrumSpan = smoothstep(-0.0345, -0.0315, p.y) * (1.0 - smoothstep(-0.0215, -0.0192, p.y)) * (1.0 - lipMask);
          float philtrumGroove = exp(-pow(ax / 0.0022, 2.0)) * philtrumSpan;
          float philtrumRidge = exp(-pow((ax - 0.0034) / 0.0014, 2.0)) * philtrumSpan;
          float mentolabialAO = exp(-pow((p.y + 0.0558) / 0.0024, 2.0)) * exp(-pow(ax / 0.012, 2.0));
          skinCol *= (1.0 - 0.06 * philtrumGroove - 0.035 * mentolabialAO);
          skinCol += vec3(0.014, 0.012, 0.011) * philtrumRidge;
        }

        // 2. Per-Portrait Chromophore Melanin, Hemoglobin Mottling & Subcutaneous Vascular Network
        vec2 charOffset = vec2(dot(uSkinToneTint, vec3(41.2, 17.8, 29.4)), uSkinWarmthShift * 83.0 + uSkinRosiness * 57.0);
        vec2 mmCoord = vec2(p.x * 480.0, p.y * 480.0 + p.z * 240.0) + charOffset;
        float hemoNoise = dermisNoise2D(mmCoord * 1.4) - 0.5;
        float melaNoise = dermisNoise2D(mmCoord * 3.1 + 11.7) - 0.5;
        float faceFrontMask = smoothstep(0.02, 0.075, p.z);
        vec3 chromoDelta = (vec3(0.018, -0.008, -0.006) * hemoNoise + vec3(0.012, 0.007, -0.010) * melaNoise)
                         * clamp(uSkinMicroMottle, 0.0, 1.6) * faceFrontMask * (1.0 - lipMask * 0.7);
        skinCol += skinCol * chromoDelta;

        // Subcutaneous Capillary & Infraorbital/Temple Micro-Vein Network (uVascularity)
        if (uVascularity > 0.01) {
          float vascZone = max(
            exp(-pow((abs(p.x) - 0.028) / 0.018, 2.0)) * exp(-pow((p.y - 0.006) / 0.012, 2.0)),
            exp(-pow((abs(p.x) - 0.056) / 0.016, 2.0)) * exp(-pow((p.y - 0.022) / 0.020, 2.0)) * 0.85
          ) * (1.0 - lipMask);
          float veinWave = abs(dermisNoise2D(mmCoord * 3.8) - 0.5) * 2.0;
          float capillaryFilaments = smoothstep(0.18, 0.02, veinWave) * vascZone * clamp(uVascularity, 0.0, 1.5);
          skinCol = mix(skinCol, skinCol * vec3(0.86, 0.78, 0.84), clamp(capillaryFilaments * 0.28, 0.0, 0.28));
        }

        // Ear Helix & Nasal Tip Thin-Cartilage Capillary Flush (uEarTipFlush)
        if (uEarTipFlush > 0.01) {
          float earHelixMask = smoothstep(0.058, 0.078, abs(p.x)) * exp(-pow((p.y - 0.004) / 0.030, 2.0));
          float nasalTipFlush = exp(-pow(p.x / 0.011, 2.0)) * exp(-pow((p.y + 0.0145) / 0.008, 2.0)) * smoothstep(0.095, 0.112, p.z);
          float flushAmt = clamp((earHelixMask * 0.55 + nasalTipFlush * 0.38) * uEarTipFlush, 0.0, 0.45);
          skinCol = mix(skinCol, skinCol * vec3(1.03, 0.88, 0.88), flushAmt);
        }

        // 3. Subtle Apple Cheek & Nasal-Tip Blush Gradient
        float cheekDist = length((vec2(abs(p.x), p.y) - vec2(0.036, -0.003)) / vec2(0.024, 0.018));
        float noseTipDist = length((p.xy - vec2(0.0, -0.0147)) / vec2(0.010, 0.008));
        float blushMask = (exp(-cheekDist * cheekDist * 1.55) + 0.28 * exp(-noseTipDist * noseTipDist * 1.9))
                        * smoothstep(0.058, 0.088, p.z) * (1.0 - lipMask);
        skinCol = mix(skinCol, skinCol * (0.68 + 0.32 * uBlushColor) + uBlushColor * 0.14, clamp(blushMask * uBlushStrength * 0.65, 0.0, 0.55));

        // 4. Bare Eyelid Physiological Equalizer + Optional User-Customizable 3D Eyeliner & Eyeshadow
        float lidRimDist = length((vec2(abs(p.x), p.y) - vec2(0.0295, 0.0174)) / vec2(0.0155, 0.0055));
        float bareLidMask = exp(-lidRimDist * lidRimDist * 1.65) * smoothstep(0.072, 0.086, p.z);
        float bareGuard = clamp(1.0 - max(uEyelinerStrength, uEyeshadowStrength) * 2.0, 0.0, 1.0);
        if (bareGuard > 0.01 && bareLidMask > 0.01) {
          float curLum = dot(skinCol, vec3(0.299, 0.587, 0.114));
          vec3 refLidCol = vec3(0.84, 0.70, 0.66) * uSkinToneTint * uSkinBrightness;
          float refLum = dot(refLidCol, vec3(0.299, 0.587, 0.114));
          if (curLum < refLum * 0.94) {
            skinCol = mix(skinCol, max(skinCol, refLidCol * 0.94), bareLidMask * bareGuard * 0.88);
          }
        }

        if (uEyeshadowStrength > 0.008) {
          float lidDist = length((vec2(abs(p.x), p.y) - vec2(0.030, 0.0205)) / vec2(0.017, 0.0065));
          float shadowMask = exp(-lidDist * lidDist * 1.6) * eyeHoleMask * smoothstep(0.072, 0.088, p.z);
          skinCol = mix(skinCol, skinCol * uEyeshadowColor * 0.92, clamp(shadowMask * uEyeshadowStrength * 0.85, 0.0, 0.72));
        }

        // User-Customizable Per-Character 3D Eyeliner (0=无眼线, 1=隐形内眼线, 2=自然眼尾线, 3=微挑猫眼线, 4=无辜下至线)
        if (uEyelinerStyle >= 0.5 && uEyelinerStrength > 0.01 && p.z > 0.073) {
          float ax = abs(p.x);
          float xRel = (ax - 0.0292) / 0.0125;
          float upperArchY = 0.0230 - 0.0022 * xRel * xRel - 0.0005 * xRel;
          float linerAlpha = 0.0;
          if (uEyelinerStyle < 1.5) {
            float inSpan = smoothstep(-0.92, -0.65, xRel) * (1.0 - smoothstep(0.78, 1.02, xRel));
            float dY = abs(p.y - upperArchY);
            linerAlpha = (1.0 - smoothstep(0.00035, 0.00095, dY)) * inSpan * 0.75;
          } else if (uEyelinerStyle < 2.5) {
            float wingY = upperArchY + max(0.0, xRel - 0.75) * 0.0016;
            float inSpan = smoothstep(-0.88, -0.58, xRel) * (1.0 - smoothstep(0.95, 1.24, xRel));
            float halfW = mix(0.00055, 0.00025, clamp((xRel - 0.75) * 2.2, 0.0, 1.0));
            linerAlpha = (1.0 - smoothstep(halfW * 0.5, halfW * 1.4, abs(p.y - wingY))) * inSpan;
          } else if (uEyelinerStyle < 3.5) {
            float flickY = upperArchY + max(0.0, xRel - 0.65) * 0.0038;
            float inSpan = smoothstep(-0.85, -0.50, xRel) * (1.0 - smoothstep(1.02, 1.34, xRel));
            float halfW = mix(0.00072, 0.00022, clamp((xRel - 0.70) * 1.8, 0.0, 1.0));
            linerAlpha = (1.0 - smoothstep(halfW * 0.5, halfW * 1.4, abs(p.y - flickY))) * inSpan;
          } else {
            float droopY = upperArchY - max(0.0, xRel - 0.65) * 0.0018;
            float inUpper = smoothstep(-0.85, -0.55, xRel) * (1.0 - smoothstep(0.96, 1.24, xRel));
            float uLine = (1.0 - smoothstep(0.00035, 0.00095, abs(p.y - droopY))) * inUpper;
            float lowerArchY = 0.0124 + 0.0014 * xRel * xRel;
            float inLower = smoothstep(0.15, 0.45, xRel) * (1.0 - smoothstep(0.88, 1.12, xRel));
            float lLine = (1.0 - smoothstep(0.00035, 0.00110, abs(p.y - lowerArchY))) * inLower * 0.48;
            linerAlpha = max(uLine, lLine);
          }
          skinCol = mix(skinCol, uEyelinerColor, clamp(linerAlpha * uEyelinerStrength * 0.92, 0.0, 0.92));
        }

        // 5. Under-Eye Aegyo-Sal (卧蚕) Puff Highlight & Subtle Groove Shadow (aligned to lower lid margin y=0.0123)
        if (uAegyoSalStrength > 0.01) {
          float inEyeX = exp(-pow((abs(p.x) - 0.0285) / 0.0125, 2.0)) * smoothstep(0.074, 0.086, p.z);
          float puffBand = exp(-pow((p.y - 0.0102) / 0.0016, 2.0)) * inEyeX;
          float grooveBand = exp(-pow((p.y - 0.0074) / 0.0012, 2.0)) * inEyeX;
          skinCol += vec3(0.026, 0.022, 0.021) * puffBand * uAegyoSalStrength;
          skinCol *= (1.0 - 0.11 * grooveBand * uAegyoSalStrength);
        }

        // 6. Periorbital Dark Circles / Tear Trough Hollow Tint
        if (uDarkCircleStrength > 0.01) {
          float dcDist = length((vec2(abs(p.x), p.y) - vec2(0.027, 0.0068)) / vec2(0.014, 0.0055));
          float dcMask = exp(-dcDist * dcDist * 1.5) * smoothstep(0.072, 0.086, p.z);
          skinCol = mix(skinCol, skinCol * vec3(0.78, 0.72, 0.76), clamp(dcMask * uDarkCircleStrength * 0.58, 0.0, 0.48));
        }

        // 7. Natural Freckles across Nasal Bridge & Upper Cheeks
        if (uFreckleStrength > 0.01) {
          float freckleZone = exp(-pow(p.x / 0.046, 2.0)) * exp(-pow((p.y + 0.003) / 0.015, 2.0)) * smoothstep(0.068, 0.092, p.z) * (1.0 - lipMask);
          vec2 fGrid = p.xy * 1150.0 + charOffset * 0.5;
          vec2 fCell = floor(fGrid);
          vec2 fFrac = fract(fGrid) - 0.5;
          vec2 fJit = vec2(dermisHash21(fCell) - 0.5, dermisHash21(fCell + 9.1) - 0.5) * 0.55;
          float fDot = (1.0 - smoothstep(0.08, 0.24, length(fFrac - fJit))) * step(0.68, dermisHash21(fCell + 31.7));
          skinCol = mix(skinCol, skinCol * vec3(0.72, 0.56, 0.46), clamp(fDot * freckleZone * uFreckleStrength * 0.72, 0.0, 0.60));
        }

        // 8. Switchable Beauty Marks / Moles
        if (uBeautyMarkMode >= 0.5) {
          float moleAlpha = 0.0;
          if (abs(uBeautyMarkMode - 1.0) < 0.4) {
            float m1 = 1.0 - smoothstep(0.0007, 0.0014, length(p.xy - vec2(-0.036, -0.012)));
            float m2 = 1.0 - smoothstep(0.0006, 0.0013, length(p.xy - vec2(-0.041, -0.019)));
            float m3 = 1.0 - smoothstep(0.0006, 0.0013, length(p.xy - vec2(-0.033, -0.025)));
            moleAlpha = max(m1, max(m2, m3)) * step(0.055, p.z);
          } else if (abs(uBeautyMarkMode - 2.0) < 0.4) {
            moleAlpha = (1.0 - smoothstep(0.0006, 0.0013, length(p.xy - vec2(0.039, 0.0095)))) * step(0.070, p.z);
          } else if (abs(uBeautyMarkMode - 3.0) < 0.4) {
            moleAlpha = (1.0 - smoothstep(0.0006, 0.0013, length(p.xy - vec2(-0.028, 0.0055)))) * step(0.075, p.z);
          } else if (abs(uBeautyMarkMode - 4.0) < 0.4) {
            moleAlpha = (1.0 - smoothstep(0.0006, 0.0012, length(p.xy - vec2(0.0015, 0.0045)))) * step(0.095, p.z);
          } else if (abs(uBeautyMarkMode - 5.0) < 0.4) {
            moleAlpha = (1.0 - smoothstep(0.0006, 0.0013, length(p.xy - vec2(0.021, -0.0345)))) * step(0.088, p.z);
          }
          skinCol = mix(skinCol, skinCol * vec3(0.32, 0.22, 0.18), moleAlpha * 0.85);
        }

        // 9. Exact 3D Lip Vermilion Grading, Oral Fissure Contact Seam AO & Mucosal Depth
        if (lipMask > 0.005) {
          float xNormLip = p.x / 0.0202;
          float seamY = -0.0453 + 0.0002 * xNormLip * xNormLip;
          float seamAO = exp(-pow((p.y - seamY) / 0.00065, 2.0)) * (1.0 - smoothstep(0.76, 1.02, abs(xNormLip)));
          float cornerAO = exp(-pow((abs(p.x) - 0.0195) / 0.0022, 2.0)) * exp(-pow((p.y - seamY) / 0.0014, 2.0));
          float innerBite = exp(-pow((p.y - seamY) / 0.0026, 2.0)) * (1.0 - smoothstep(0.45, 0.92, abs(xNormLip)));
          // Lift lower lip cushion (y in [-0.0512, -0.0462]) so downward-facing lower lip vertices never turn grey-brown
          float lowerLipCushion = exp(-pow((p.y - (-0.0488)) / 0.0024, 2.0)) * (1.0 - smoothstep(0.65, 0.96, abs(xNormLip)));
          vec3 naturalMucosal = mix(skinCol * vec3(0.96, 0.74, 0.76), uLipColor, clamp(uLipStrength * 1.15, 0.22, 0.88));
          vec3 targetLip = mix(naturalMucosal * (1.02 + 0.14 * lowerLipCushion), naturalMucosal * 0.86, innerBite * 0.38);
          targetLip *= (0.96 + 0.08 * lipCreaseVal);
          skinCol = mix(skinCol, targetLip, clamp(lipMask * (0.46 + 0.50 * uLipStrength), 0.0, 0.92));
          skinCol *= (1.0 - (0.26 * seamAO + 0.20 * cornerAO) * lipMask);
        }

        // =====================================================================
        // 10. Stage 54 · Biophysical Beer-Lambert & Rayleigh-Plateau Studio Fluid System
        //     - Per-portrait unique seed (uCharFluidSeed) eliminates multi-head repetition
        //     - Rayleigh-Plateau bead-and-thread variable-width pinching & 3D convex droplets
        //     - Sub-millimeter pore & skin-crease capillary wicking
        //     - Beer-Lambert optical absorption (skinCol * exp(-depth * k)) + venous clot core
        // =====================================================================
        vWetFluidSpecMask = 0.0;
        vDewSpecMask = 0.0;
        vFluidHeight = 0.0;

        float fSeed = uCharFluidSeed * 17.31 + dot(uSkinToneTint, vec3(7.1, 13.3, 19.7));
        float poreWickField = compute3DPoreField(p);

        // 10A. 💧 Tear Tracks, Lower-Lid Tear Meniscus, Crying Erythema Flush & dew Tears
        float tearStr = clamp(uTearTrackStrength, 0.0, 1.4);
        if (tearStr > 0.01 && p.z > 0.045) {
          float ax = abs(p.x);
          float sideSign = p.x >= 0.0 ? 1.0 : -1.0;
          float sideHash = fract(sin(fSeed + sideSign * 43.17) * 43758.5453);

          // Physiological crying erythema: warm rosy-crimson capillary flush on lower eyelid rim, medial canthus & nasal tip
          float lidFlush = exp(-pow((ax - 0.0275) / 0.0155, 2.0)) * exp(-pow((p.y - 0.0118) / 0.0046, 2.0));
          float noseTipCry = exp(-pow(p.x / 0.0115, 2.0)) * exp(-pow((p.y + 0.0148) / 0.0075, 2.0)) * smoothstep(0.094, 0.112, p.z);
          float cryFlushAmt = clamp((lidFlush * 0.72 + noseTipCry * 0.65) * tearStr, 0.0, 0.72);
          skinCol = mix(skinCol, skinCol * vec3(1.04, 0.74, 0.76) + vec3(0.04, -0.01, -0.01), cryFlushAmt * 0.58);

          // Glistening lower-eyelid tear meniscus (waterline pooling at y ≈ 0.0124, |x| in [0.0175, 0.0405])
          float inLidSpan = smoothstep(0.0168, 0.0195, ax) * (1.0 - smoothstep(0.0385, 0.0418, ax));
          float lidCurveY = 0.0124 + 0.0016 * pow((ax - 0.0285) / 0.0110, 2.0);
          float lidMeniscus = exp(-pow((p.y - lidCurveY) / 0.00072, 2.0)) * inLidSpan * clamp(tearStr * 1.25, 0.0, 1.0);

          // Stream 1: Inner Canthus Nasojugal Tear Rivulet with Rayleigh-Plateau bead-and-thread pinching
          float yTop1 = 0.0138;
          float asymReach1 = (sideHash - 0.5) * 0.0095;
          float yBot1 = mix(0.0060, -0.0425, clamp(tearStr, 0.0, 1.0)) + asymReach1;
          float tProg1 = clamp((yTop1 - p.y) / max(0.002, yTop1 - yBot1), 0.0, 1.0);
          float inY1 = smoothstep(yBot1 - 0.0018, yBot1 + 0.0008, p.y) * (1.0 - smoothstep(yTop1 - 0.0006, yTop1 + 0.0012, p.y));
          float nWalk1 = (dermisNoise2D(vec2(p.y * 165.0 + fSeed, sideSign * 9.3 + fSeed)) - 0.5) * 0.00135
                       + (dermisNoise2D(vec2(p.y * 420.0 - fSeed, sideSign * 21.7)) - 0.5) * 0.00055;
          // Follow natural anatomical nasojugal groove & curve around the malar cheek mound
          float targetX1 = 0.0184 + (0.0056 + 0.0024 * sideHash) * pow(tProg1, 0.82) + nWalk1;
          // Rayleigh-Plateau surface-tension pinching: stream alternates between thin damp thread and thicker beads
          float rpPinch1 = 0.52 + 0.48 * pow(0.5 + 0.5 * sin(tProg1 * 18.0 + sideHash * 6.28), 2.0);
          float width1 = mix(0.00118, 0.00068, tProg1) * rpPinch1 + (1.0 - poreWickField) * 0.00032;
          float dX1 = abs(ax - targetX1);
          float stream1 = exp(-pow(dX1 / max(0.00025, width1), 2.0)) * inY1;
          // Swollen 3D convex teardrop bulb at the terminal tip of Stream 1
          vec2 dropVec1 = vec2((ax - targetX1) / 0.00175, (p.y - (yBot1 + 0.0014)) / 0.0024);
          float dropR1 = length(dropVec1);
          float dropBulb1 = max(0.0, 1.0 - dropR1 * dropR1) * step(0.14, tearStr);

          // Stream 2: Mid-Lower Eyelid Malar Cheek Tear Rivulet (asymmetric per-head activation)
          float yTop2 = 0.0122;
          float yBot2 = mix(0.0050, -0.0310, clamp(tearStr * (0.78 + 0.32 * (1.0 - sideHash)), 0.0, 1.0));
          float tProg2 = clamp((yTop2 - p.y) / max(0.002, yTop2 - yBot2), 0.0, 1.0);
          float inY2 = smoothstep(yBot2 - 0.0016, yBot2 + 0.0008, p.y) * (1.0 - smoothstep(yTop2 - 0.0006, yTop2 + 0.0010, p.y));
          float nWalk2 = (dermisNoise2D(vec2(p.y * 195.0 - fSeed * 0.7, sideSign * 15.1)) - 0.5) * 0.00115;
          float targetX2 = 0.0302 + 0.0028 * sin(tProg2 * 3.14159) + nWalk2;
          float rpPinch2 = 0.56 + 0.44 * pow(0.5 + 0.5 * cos(tProg2 * 15.0 - sideHash * 5.0), 2.0);
          float width2 = mix(0.00102, 0.00058, tProg2) * rpPinch2 + (1.0 - poreWickField) * 0.00028;
          float stream2 = exp(-pow((ax - targetX2) / max(0.00022, width2), 2.0)) * inY2 * smoothstep(0.24, 0.58, tearStr);
          vec2 dropVec2 = vec2((ax - targetX2) / 0.00150, (p.y - (yBot2 + 0.0012)) / 0.0020);
          float dropBulb2 = max(0.0, 1.0 - dot(dropVec2, dropVec2)) * smoothstep(0.30, 0.65, tearStr);

          float tearFilm = clamp(max(lidMeniscus, max(stream1 * 0.88, stream2 * 0.84)) * clamp(tearStr * 1.15, 0.0, 1.0), 0.0, 1.0);
          float tearBead = clamp(max(dropBulb1 * 1.25, dropBulb2 * 1.15) * clamp(tearStr * 1.15, 0.0, 1.0), 0.0, 1.0);
          float tearDepth = clamp(tearFilm * 0.55 + tearBead * 1.10, 0.0, 1.35);

          if (uTearType > 1.5) {
            // Mode 2: Haunting Crimson dew Tears with Beer-Lambert optical absorption & surface-tension rim
            vec3 beerdew = skinCol * exp(-tearDepth * vec3(2.4, 21.0, 27.0));
            vec3 venousCore = vec3(0.09, 0.002, 0.004);
            float meniscusRim = exp(-pow((tearDepth - 0.24) / 0.12, 2.0)) * 0.35;
            vec3 targetdewTear = mix(beerdew, venousCore, clamp(smoothstep(0.42, 1.05, tearDepth) * 0.78 + meniscusRim, 0.0, 0.92));
            skinCol = mix(skinCol, targetdewTear, smoothstep(0.04, 0.28, tearDepth));
            vDewSpecMask = max(vDewSpecMask, clamp(tearDepth * 1.35, 0.0, 1.0));
            vFluidHeight += tearFilm * 0.26 + sqrt(max(0.0, tearBead)) * 0.58;
          } else if (uTearType > 0.5) {
            // Mode 1: Smudged Mascara / Smoky Eyeliner Tear Tracks (微晕眼妆哭痕)
            float smudgeZone = tearDepth * smoothstep(-0.026, 0.013, p.y);
            skinCol = mix(skinCol, skinCol * vec3(0.44, 0.40, 0.43), clamp(smudgeZone * 0.72, 0.0, 0.74));
            skinCol = mix(skinCol, skinCol * vec3(0.91, 0.84, 0.85), clamp(tearDepth * 0.32, 0.0, 0.36));
            vWetFluidSpecMask = max(vWetFluidSpecMask, clamp(tearDepth * 1.35, 0.0, 1.0));
            vFluidHeight += tearFilm * 0.22 + sqrt(max(0.0, tearBead)) * 0.48;
          } else {
            // Mode 0: Crystal-Clear Wet Tears & Moistened Dermis (清澈泪痕: IOR wetting darkens pores slightly + 3D lens bulb)
            skinCol = mix(skinCol, skinCol * vec3(0.91, 0.83, 0.84), clamp(tearDepth * 0.38, 0.0, 0.42));
            vWetFluidSpecMask = max(vWetFluidSpecMask, clamp(tearDepth * 1.40, 0.0, 1.0));
            vFluidHeight += tearFilm * 0.24 + sqrt(max(0.0, tearBead)) * 0.52;
          }
        }

        // 10B. 🩸 Realistic 3D Nostril-to-Philtrum-to-Lip Nosescatter (高光涓流与涌润)
        float nosescatterStr = clamp(uHighlightGlowStrength, 0.0, 1.4);
        if (nosescatterStr > 0.01 && p.z > 0.082 && p.y < -0.0155 && p.y > -0.0585 && abs(p.x) < 0.0165) {
          float leftEnable = (uHighlightGlowMode < 1.5) ? 1.0 : 0.0;
          float rightEnable = (uHighlightGlowMode < 0.5 || uHighlightGlowMode > 1.5) ? 1.0 : 0.0;
          float nbSeed = fract(sin(fSeed * 1.73 + 11.2) * 43758.5453);

          float nbDepth = 0.0;
          float nbBead = 0.0;

          // Left Nostril Stream (x ≈ -0.0064 at nostril y=-0.0180 -> flows down philtrum ridge to upper lip)
          if (leftEnable > 0.5) {
            float yStartL = -0.0176;
            float yEndL = mix(-0.0240, -0.0448, clamp(nosescatterStr * (0.96 + 0.16 * nbSeed), 0.0, 1.0));
            float tL = clamp((yStartL - p.y) / max(0.0015, yStartL - yEndL), 0.0, 1.0);
            float inYL = smoothstep(yEndL - 0.0015, yEndL + 0.0006, p.y) * (1.0 - smoothstep(yStartL - 0.0006, yStartL + 0.0010, p.y));
            float walkL = (dermisNoise2D(vec2(p.y * 280.0 + fSeed, 4.2)) - 0.5) * 0.00095;
            float pathXL = mix(-0.0064, -0.0034 + (nbSeed - 0.5) * 0.0018, pow(tL, 0.85)) + walkL;
            float rpL = 0.58 + 0.42 * pow(0.5 + 0.5 * sin(tL * 14.0 + nbSeed * 6.0), 2.0);
            float wL = mix(0.00155, 0.00085, tL) * rpL + (1.0 - poreWickField) * 0.00028;
            float sL = exp(-pow((p.x - pathXL) / max(0.00025, wL), 2.0)) * inYL;
            float poolL = exp(-(pow((p.x + 0.0065) / 0.0025, 2.0) + pow((p.y + 0.0182) / 0.0019, 2.0)));
            vec2 bVecL = vec2((p.x - pathXL) / 0.00165, (p.y - (yEndL + 0.0011)) / 0.0021);
            float bulbL = max(0.0, 1.0 - dot(bVecL, bVecL)) * step(0.12, nosescatterStr);
            nbDepth = max(nbDepth, max(sL * 0.85, poolL * 1.15));
            nbBead = max(nbBead, bulbL);
          }

          // Right Nostril Stream
          if (rightEnable > 0.5) {
            float effR = (uHighlightGlowMode < 0.5) ? clamp(nosescatterStr * (0.68 + 0.25 * (1.0 - nbSeed)), 0.0, 1.0) : clamp(nosescatterStr * 1.08, 0.0, 1.0);
            float yStartR = -0.0176;
            float yEndR = mix(-0.0235, -0.0412, effR);
            float tR = clamp((yStartR - p.y) / max(0.0015, yStartR - yEndR), 0.0, 1.0);
            float inYR = smoothstep(yEndR - 0.0014, yEndR + 0.0006, p.y) * (1.0 - smoothstep(yStartR - 0.0006, yStartR + 0.0010, p.y));
            float walkR = (dermisNoise2D(vec2(p.y * 310.0 - fSeed, 9.7)) - 0.5) * 0.00088;
            float pathXR = mix(0.0062, 0.0022, pow(tR, 0.88)) + walkR;
            float rpR = 0.60 + 0.40 * pow(0.5 + 0.5 * cos(tR * 13.0 - nbSeed * 5.0), 2.0);
            float wR = mix(0.00142, 0.00078, tR) * rpR + (1.0 - poreWickField) * 0.00025;
            float sR = exp(-pow((p.x - pathXR) / max(0.00022, wR), 2.0)) * inYR * step(0.05, effR);
            float poolR = exp(-(pow((p.x - 0.0064) / 0.0023, 2.0) + pow((p.y + 0.0182) / 0.0018, 2.0))) * step(0.05, effR);
            vec2 bVecR = vec2((p.x - pathXR) / 0.00145, (p.y - (yEndR + 0.0010)) / 0.0018);
            float bulbR = max(0.0, 1.0 - dot(bVecR, bVecR)) * step(0.15, effR);
            nbDepth = max(nbDepth, max(sR * 0.85, poolR * 1.10));
            nbBead = max(nbBead, bulbR);
          }

          // Capillary wicking along Cupid's bow & vertical lip sulci when dew reaches upper lip
          if (nosescatterStr > 0.52) {
            float bowWick = exp(-pow((p.y + 0.0358 - (1.0 - lipCreaseVal) * 0.0009) / 0.0012, 2.0))
                          * exp(-pow(p.x / 0.0065, 2.0)) * (nosescatterStr - 0.52) * 2.1;
            nbDepth = max(nbDepth, clamp(bowWick, 0.0, 1.05));
          }

          float totalNb = clamp((nbDepth + nbBead * 1.15) * smoothstep(0.088, 0.098, p.z), 0.0, 1.35);
          if (totalNb > 0.02) {
            vec3 beerNb = skinCol * exp(-totalNb * vec3(2.8, 24.0, 30.0));
            vec3 clotNb = vec3(0.08, 0.0015, 0.003);
            float rimNb = exp(-pow((totalNb - 0.28) / 0.14, 2.0)) * 0.38;
            vec3 nbCol = mix(beerNb, clotNb, clamp(smoothstep(0.45, 1.05, totalNb) * 0.82 + rimNb, 0.0, 0.94));
            skinCol = mix(skinCol, nbCol, smoothstep(0.03, 0.25, totalNb));
            vDewSpecMask = max(vDewSpecMask, clamp(totalNb * 1.35, 0.0, 1.0));
            vFluidHeight += clamp(nbDepth * 0.35 + sqrt(max(0.0, nbBead)) * 0.62, 0.0, 0.85);
          }
        }

        // 10C. 🥀 Oral Commissure & Lower-Lip Sulci Mouth dew (嘴角溢润与唇纹漫染)
        float mouthdewStr = clamp(uLipGlossStrength, 0.0, 1.4);
        if (mouthdewStr > 0.01 && p.z > 0.075 && p.y < -0.0405 && p.y > -0.0685 && abs(p.x) < 0.0255) {
          float mbSeed = fract(sin(fSeed * 2.41 + 29.7) * 43758.5453);
          float mbSide = (mbSeed > 0.42) ? -1.0 : 1.0; // Natural per-portrait dominant mouth corner!
          float mbDepth = 0.0;
          float mbBead = 0.0;

          // Dominant oral commissure trickle down marionette fold
          float xDom = 0.0182 * mbSide;
          float yTopM = -0.0432;
          float yBotDom = mix(-0.0475, -0.0648, clamp(mouthdewStr * 1.06, 0.0, 1.0));
          float tDom = clamp((yTopM - p.y) / max(0.0015, yTopM - yBotDom), 0.0, 1.0);
          float inYDom = smoothstep(yBotDom - 0.0015, yBotDom + 0.0006, p.y) * (1.0 - smoothstep(yTopM - 0.0006, yTopM + 0.0012, p.y));
          float walkDom = (dermisNoise2D(vec2(p.y * 270.0 + fSeed, 15.3)) - 0.5) * 0.00105;
          float pathXDom = mix(xDom, xDom * 0.80, pow(tDom, 0.84)) + walkDom;
          float rpDom = 0.56 + 0.44 * pow(0.5 + 0.5 * sin(tDom * 13.0 + mbSeed * 6.28), 2.0);
          float wDom = mix(0.00158, 0.00084, tDom) * rpDom + (1.0 - poreWickField) * 0.00030;
          float sDom = exp(-pow((p.x - pathXDom) / max(0.00024, wDom), 2.0)) * inYDom;
          float poolDom = exp(-(pow((p.x - xDom) / 0.0025, 2.0) + pow((p.y + 0.0436) / 0.0016, 2.0)));
          vec2 bVecDom = vec2((p.x - pathXDom) / 0.00165, (p.y - (yBotDom + 0.0011)) / 0.0021);
          float bulbDom = max(0.0, 1.0 - dot(bVecDom, bVecDom)) * step(0.14, mouthdewStr);
          mbDepth = max(mbDepth, max(sDom * 0.88, poolDom * 1.15));
          mbBead = max(mbBead, bulbDom);

          // Secondary opposite commissure trickle
          float xSub = -xDom * 0.98;
          float yBotSub = mix(-0.0462, -0.0575, clamp(mouthdewStr * 0.78, 0.0, 1.0));
          float tSub = clamp((yTopM - p.y) / max(0.0015, yTopM - yBotSub), 0.0, 1.0);
          float inYSub = smoothstep(yBotSub - 0.0014, yBotSub + 0.0006, p.y) * (1.0 - smoothstep(yTopM - 0.0006, yTopM + 0.0012, p.y));
          float walkSub = (dermisNoise2D(vec2(p.y * 310.0 - fSeed, 31.1)) - 0.5) * 0.00085;
          float pathXSub = mix(xSub, xSub * 0.85, tSub) + walkSub;
          float wSub = mix(0.00130, 0.00072, tSub) + (1.0 - poreWickField) * 0.00024;
          float sSub = exp(-pow((p.x - pathXSub) / max(0.00022, wSub), 2.0)) * inYSub * smoothstep(0.22, 0.52, mouthdewStr);
          float poolSub = exp(-(pow((p.x - xSub) / 0.0022, 2.0) + pow((p.y + 0.0436) / 0.0014, 2.0))) * smoothstep(0.15, 0.40, mouthdewStr);
          mbDepth = max(mbDepth, max(sSub * 0.84, poolSub));

          // Oral seam dew pooling & vertical lip-crease capillary wicking into lower lip vermilion
          float sulciWick = (1.0 - lipCreaseVal) * 0.0016;
          float seamStain = exp(-pow((p.y + 0.0435 + sulciWick) / 0.00125, 2.0)) * exp(-pow(p.x / 0.0168, 2.0)) * clamp(mouthdewStr * 0.92, 0.0, 1.0);
          float totalMb = clamp(max(mbDepth + mbBead * 1.15, seamStain), 0.0, 1.35);

          if (totalMb > 0.02) {
            vec3 beerMb = skinCol * exp(-totalMb * vec3(2.8, 24.0, 30.0));
            vec3 clotMb = vec3(0.075, 0.0015, 0.003);
            float rimMb = exp(-pow((totalMb - 0.26) / 0.13, 2.0)) * 0.36;
            vec3 mbCol = mix(beerMb, clotMb, clamp(smoothstep(0.45, 1.05, totalMb) * 0.84 + rimMb, 0.0, 0.94));
            skinCol = mix(skinCol, mbCol, smoothstep(0.03, 0.24, totalMb));
            vDewSpecMask = max(vDewSpecMask, clamp(totalMb * 1.35, 0.0, 1.0));
            vFluidHeight += clamp(mbDepth * 0.34 + sqrt(max(0.0, mbBead)) * 0.58, 0.0, 0.82);
          }
        }

        // 10D. 💦 Studio Arterial dew Micro-Splatter across Face & Jawline (面部飞溅润点)
        float faceSplatStr = clamp(uFaceSplatterStrength, 0.0, 1.4);
        if (faceSplatStr > 0.01 && p.z > 0.035 && p.y > -0.072 && p.y < 0.042) {
          vec2 seedShift = vec2(fract(fSeed * 0.31) * 19.3, fract(fSeed * 0.67) * 23.7);
          vec2 spUv1 = vec2(p.x * 165.0, p.y * 145.0) + seedShift;
          vec2 cell1 = floor(spUv1);
          vec2 f1 = fract(spUv1) - 0.5;
          float h1 = dermisHash21(cell1);
          float splatDepth = 0.0;
          if (h1 > (1.0 - 0.26 * clamp(faceSplatStr, 0.0, 1.0))) {
            vec2 jit1 = vec2(dermisHash21(cell1 + 7.1) - 0.5, dermisHash21(cell1 + 19.3) - 0.5) * 0.44;
            vec2 d1 = f1 - jit1;
            float angSp = 0.45 + 0.55 * (dermisHash21(cell1 + 53.1) - 0.5);
            float cSp = cos(angSp), sSp = sin(angSp);
            vec2 rotD1 = vec2(d1.x * cSp - d1.y * sSp, (d1.x * sSp + d1.y * cSp) * 0.64);
            // Warp droplet perimeter slightly so it isn't a geometric ellipse
            float warpD = length(rotD1) * (0.88 + 0.24 * dermisNoise2D(spUv1 * 3.5));
            float r1 = (0.09 + 0.16 * dermisHash21(cell1 + 31.7)) * clamp(faceSplatStr * 1.1, 0.4, 1.2);
            splatDepth = max(splatDepth, (1.0 - smoothstep(r1 * 0.45, r1, warpD)) * 1.05);
          }
          // Fine secondary mist micro-specks
          vec2 spUv2 = vec2(p.x * 360.0, p.y * 330.0) - seedShift * 1.7;
          vec2 cell2 = floor(spUv2);
          float h2 = dermisHash21(cell2);
          if (h2 > (1.0 - 0.22 * clamp(faceSplatStr, 0.0, 1.0))) {
            vec2 jit2 = vec2(dermisHash21(cell2 + 11.3) - 0.5, dermisHash21(cell2 + 23.9) - 0.5) * 0.42;
            float r2 = 0.07 + 0.11 * dermisHash21(cell2 + 41.1);
            splatDepth = max(splatDepth, (1.0 - smoothstep(r2 * 0.45, r2, length(fract(spUv2) - 0.5 - jit2))) * 0.78);
          }
          splatDepth *= (1.0 - eyeHoleMask * 0.15);
          if (splatDepth > 0.02) {
            vec3 beerSp = skinCol * exp(-splatDepth * vec3(2.8, 24.0, 30.0));
            vec3 clotSp = vec3(0.09, 0.002, 0.004);
            float spRim = exp(-pow((splatDepth - 0.35) / 0.16, 2.0)) * 0.45;
            vec3 spCol = mix(beerSp, clotSp, clamp(smoothstep(0.55, 1.0, splatDepth) * 0.72 + spRim, 0.0, 0.92));
            skinCol = mix(skinCol, spCol, smoothstep(0.04, 0.28, splatDepth));
            vDewSpecMask = max(vDewSpecMask, splatDepth);
            vFluidHeight += splatDepth * 0.36;
          }
        }

        // 10E. 🔪 Non-Periodic Asymmetric Studio Neck Cut Hemorrhage, Crease Wicking & Droplet Rivulets (p.y < -0.048)
        float neckdewStr = clamp(uNeckDewStrength, 0.0, 1.4);
        if (p.y < -0.0480 && neckdewStr > 0.01) {
          float angCut = atan(p.z + 0.0128, p.x);
          // Per-portrait unique hemorrhage angles (eliminates identical 5/9-spoke crowns across multiple heads!)
          float gushAng1 = (fract(sin(fSeed * 1.13 + 3.7) * 43758.5453) - 0.5) * 6.28318;
          float gushAng2 = gushAng1 + 1.55 + fract(sin(fSeed * 2.71 + 9.2) * 43758.5453) * 1.45;
          float gushAng3 = gushAng1 - 1.85 - fract(sin(fSeed * 3.89 + 17.4) * 43758.5453) * 1.10;

          float dAng1 = atan(sin(angCut - gushAng1), cos(angCut - gushAng1));
          float dAng2 = atan(sin(angCut - gushAng2), cos(angCut - gushAng2));
          float dAng3 = atan(sin(angCut - gushAng3), cos(angCut - gushAng3));

          // Non-periodic asymmetric arterial/venous hemorrhage envelope around the neck circumference
          float sectorEnv = exp(-pow(dAng1 / 0.62, 2.0))
                          + 0.82 * exp(-pow(dAng2 / 0.48, 2.0))
                          + 0.65 * exp(-pow(dAng3 / 0.38, 2.0));

          float nFbm1 = dermisNoise2D(vec2(angCut * 4.2 + fSeed, p.y * 140.0 - fSeed * 0.5));
          float nFbm2 = dermisNoise2D(vec2(angCut * 11.5 - fSeed * 1.3, p.y * 340.0 + fSeed));
          float nFbm3 = dermisNoise2D(vec2(angCut * 29.0 + fSeed * 2.1, p.y * 780.0));
          // Horizontal neck skin-crease capillary wicking (dew wicks sideways along fine horizontal neck lines!)
          float neckCreaseWick = dermisNoise2D(vec2(angCut * 5.5 + fSeed, p.y * 1450.0));

          float dyFromCut = max(0.0, p.y - (-0.1100));

          // Layer 1: Asymmetric Coagulated Incision Rim & Venous dew Film (3mm in quiet sectors, up to 24mm in hemorrhage sectors)
          float crustReach = (0.0032 + 0.0058 * nFbm1 + 0.0145 * sectorEnv * (0.45 + 0.55 * nFbm2))
                           * clamp(neckdewStr * 1.15, 0.20, 1.40);
          float dyWarped = dyFromCut + (nFbm2 - 0.5) * 0.0024 + (neckCreaseWick - 0.5) * 0.0014 + (1.0 - poreWickField) * 0.0008;
          float crustDepth = (1.0 - smoothstep(crustReach * 0.35, crustReach, dyWarped)) * (0.75 + 0.35 * sectorEnv);
          float darkIncisionClot = 1.0 - smoothstep(0.0010, 0.0042 + 0.0035 * sectorEnv, dyFromCut + (nFbm3 - 0.5) * 0.0010);

          // Layer 2: Discrete Asymmetric Rayleigh-Plateau Rivulets with 3D Hanging Droplets (NO periodic cos(5*ang) crown!)
          float rivDepth = 0.0;
          float rivBead = 0.0;
          for (int k = 0; k < 5; k++) {
            float fk = float(k);
            float rSeed = fract(sin(fSeed * (1.37 + fk * 0.73) + fk * 19.1) * 43758.5453);
            // Anchor rivulets preferentially near the asymmetric hemorrhage sectors
            float baseAng = (k == 0) ? gushAng1 : (k == 1) ? gushAng2 : (k == 2) ? gushAng3 : (gushAng1 + (rSeed - 0.5) * 2.4);
            float rLen = (0.016 + 0.028 * fract(rSeed * 3.71)) * clamp(neckdewStr * 1.12, 0.0, 1.35);
            float tRiv = clamp(dyFromCut / max(0.002, rLen), 0.0, 1.0);
            float inRivY = (1.0 - smoothstep(0.94, 1.04, tRiv)) * smoothstep(-0.0005, 0.0010, dyFromCut);
            // Organic meandering angular path along neck skin
            float angWalk = (dermisNoise2D(vec2(dyFromCut * 220.0 + fk * 7.3, fSeed + fk * 13.1)) - 0.5) * 0.075;
            float dAngRiv = abs(atan(sin(angCut - (baseAng + angWalk)), cos(angCut - (baseAng + angWalk))));
            // Rayleigh-Plateau surface-tension pinching along the rivulet
            float rpPinch = 0.48 + 0.52 * pow(0.5 + 0.5 * sin(tRiv * 14.0 + rSeed * 6.28), 2.0);
            float angWidth = mix(0.048, 0.018, tRiv) * rpPinch + (1.0 - neckCreaseWick) * 0.010;
            float sRiv = exp(-pow(dAngRiv / max(0.006, angWidth), 2.0)) * inRivY;
            // Swollen 3D droplet bulb at the upper tip of the rivulet
            vec2 tipVec = vec2(dAngRiv / 0.036, (dyFromCut - rLen * 0.88) / 0.0026);
            float tipBulb = max(0.0, 1.0 - dot(tipVec, tipVec)) * step(0.18, neckdewStr);
            rivDepth = max(rivDepth, sRiv * 0.95);
            rivBead = max(rivBead, tipBulb);
          }

          // Layer 3: Asymmetric Arterial Micro-Splatter Mist above the hemorrhage sectors
          vec2 nkSpUv = vec2(angCut * 24.0 + fSeed * 1.9, p.y * 250.0 - fSeed * 1.3);
          vec2 nkCell = floor(nkSpUv);
          float nkH = dermisHash21(nkCell);
          float nkDrop = 0.0;
          float localSprayProb = (0.12 + 0.28 * clamp(sectorEnv, 0.0, 1.0)) * clamp(neckdewStr, 0.0, 1.0);
          if (nkH > (1.0 - localSprayProb) && dyFromCut < (0.025 + 0.032 * sectorEnv) * neckdewStr) {
            vec2 nkJit = vec2(dermisHash21(nkCell + 5.7) - 0.5, dermisHash21(nkCell + 14.9) - 0.5) * 0.44;
            vec2 nkD = (fract(nkSpUv) - 0.5 - nkJit) * vec2(1.0, 0.62);
            float nkR = 0.10 + 0.16 * dermisHash21(nkCell + 29.1);
            nkDrop = (1.0 - smoothstep(nkR * 0.42, nkR, length(nkD))) * (1.0 - smoothstep(0.024, 0.052, dyFromCut));
          }

          float totalNeckDepth = clamp(max(crustDepth, max(rivDepth + rivBead * 1.15, nkDrop * 0.88)), 0.0, 1.40);
          if (totalNeckDepth > 0.02) {
            // Beer-Lambert optical absorption through translucent crimson hemoglobin film + dark coagulated venous clot core
            vec3 beerNeck = skinCol * exp(-totalNeckDepth * vec3(2.9, 25.0, 32.0));
            vec3 venousClot = vec3(0.065, 0.0012, 0.0025);
            float meniscusRing = exp(-pow((totalNeckDepth - 0.26) / 0.12, 2.0)) * 0.42;
            float clotWeight = clamp(darkIncisionClot * 0.88 + smoothstep(0.48, 1.08, totalNeckDepth) * 0.76 + meniscusRing, 0.0, 0.95);
            vec3 neckdewCol = mix(beerNeck, venousClot, clotWeight);
            skinCol = mix(skinCol, neckdewCol, smoothstep(0.02, 0.22, totalNeckDepth));
            vDewSpecMask = max(vDewSpecMask, clamp(totalNeckDepth * 1.35, 0.0, 1.0));
            vFluidHeight += clamp(crustDepth * 0.32 + rivDepth * 0.30 + sqrt(max(0.0, rivBead)) * 0.58 + darkIncisionClot * 0.25, 0.0, 0.90);
          }
        }

        diffuseColor.rgb = skinCol;
      }`
    );

    // 3D Sub-Millimeter Dermis Micro-Groove + Vertical Lip Sulci + 3D Liquid Meniscus Normal Perturbation
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      {
        vec3 snCurv = normalize(vNormal);
        gSkinCurv = clamp(length(fwidth(snCurv)) / max(length(fwidth(vViewPosition)), 1e-6) * 0.011, 0.0, 1.0);
        float faceRegion = smoothstep(-0.065, -0.025, vPortraitLocalPos.y) * smoothstep(-0.01, 0.055, vPortraitLocalPos.z);
        float poreVal = compute3DPoreField(vPortraitLocalPos);
        float lipCreaseLocal = 0.5;
        float lipMaskN = computeLipVermilionMask(vPortraitLocalPos, lipCreaseLocal);
        float combinedMicroHeight = mix(poreVal, lipCreaseLocal * 1.15, lipMaskN);
        vDermisPoreCavity = poreVal;

        #ifdef USE_ROUGHNESSMAP
          combinedMicroHeight = mix(combinedMicroHeight, roughnessFactor, 0.24);
        #endif

        // Smooth fluid covers skin pores and raises a 3D surface-tension meniscus rim at dew/tear edges
        float fluidCover = clamp(max(vWetFluidSpecMask, vDewSpecMask), 0.0, 1.0);
        combinedMicroHeight = mix(combinedMicroHeight, 0.5 + vFluidHeight * 1.85, fluidCover * 0.88);

        vec3 dPosDx = dFdx( vViewPosition );
        vec3 dPosDy = dFdy( vViewPosition );
        float dHdx = clamp( dFdx( combinedMicroHeight ), -0.22, 0.22 );
        float dHdy = clamp( dFdy( combinedMicroHeight ), -0.22, 0.22 );
        vec3 r1 = cross( dPosDy, normal );
        vec3 r2 = cross( normal, dPosDx );
        float det = dot( dPosDx, r1 );
        if ( abs( det ) > 1e-6 ) {
          float baseAmp = 0.0026 * clamp(uPoreRelief, 0.0, 1.5) * (0.35 + 0.65 * faceRegion);
          float fluidAmp = 0.0052 * fluidCover;
          float reliefAmp = max(baseAmp, fluidAmp);
          vec3 surfGrad = sign( det ) * ( dHdx * r1 + dHdy * r2 );
          normal = normalize( normal - ( reliefAmp / max( abs( det ), 1e-4 ) ) * surfGrad );
        }
      }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      vec3 viewDir = normalize(vViewPosition);
      vec3 viewWinL = normalize((viewMatrix * vec4(normalize(uWindowLightDir), 0.0)).xyz);
      float winEnv = computeWindowBeamEnvelope(vPortraitWorldPos, vPortraitLocalPos, uWindowLightDir);
      float fragNdl = dot(normal, viewWinL);

      // Stage 56 · Photographic Studio Softbox Shading & Neutral-Cool Venous Shadow Balance
      float litNdl = smoothstep(-0.42, 0.54, fragNdl);
      float sunMask = clamp(litNdl * winEnv, 0.0, 1.0);
      float chiaroscuroStrength = clamp(uChiaroscuro, 0.0, 1.0);
      float shadowContrast = clamp(chiaroscuroStrength * 0.24 + uWindowGoboStrength * 0.14, 0.0, 0.44);

      float directScale = mix(1.0, mix(0.76, 1.04, pow(sunMask, 0.85)), shadowContrast);
      float indirectScale = mix(1.0, mix(0.84, 1.02, smoothstep(0.0, 0.85, sunMask)), shadowContrast * 0.48);

      // In shadow zones, real human skin desaturates slightly toward neutral-cool taupe/olive
      vec3 shadowChromaBalance = mix(vec3(0.95, 0.96, 0.99), vec3(1.00, 1.00, 0.99), sunMask);
      reflectedLight.directDiffuse *= directScale * shadowChromaBalance;
      reflectedLight.indirectDiffuse *= indirectScale * shadowChromaBalance;

      // Dual-Lobe Skin Specular + Sebum Clearcoat Preservation (matching 画质提升/src/skinMaterial.js)
      float ndotv = clamp(dot(normal, viewDir), 0.0, 1.0);
      float fresnelSheen = pow(1.0 - ndotv, 3.6);
      float poreSpecMask = clamp(0.55 + 0.50 * pow(vDermisPoreCavity, 1.25), 0.48, 1.05);
      float bonyHighlightZone = max(
        exp(-pow(vPortraitLocalPos.x / 0.011, 2.0)) * smoothstep(0.082, 0.112, vPortraitLocalPos.z),
        exp(-pow((abs(vPortraitLocalPos.x) - 0.032) / 0.015, 2.0)) * exp(-pow((vPortraitLocalPos.y - 0.004) / 0.012, 2.0)) * smoothstep(0.072, 0.092, vPortraitLocalPos.z) * 0.65
      );
      float specLobeScale = clamp(uSpecularLobe * 1.35, 0.35, 1.45);
      float oilBoost = bonyHighlightZone * clamp(uTZoneOiliness * 0.85, 0.0, 1.1);
      float lowerLipWet = vLipVermilionMask * smoothstep(-0.0365, -0.0410, vPortraitLocalPos.y);
      float lipSpecBoost = (vLipVermilionMask * 0.45 + lowerLipWet * 0.65) * clamp(uLipGloss, 0.0, 1.2);
      float fluidSpecTotal = clamp(max(vWetFluidSpecMask * 1.65, vDewSpecMask * 1.85), 0.0, 2.2);
      reflectedLight.directSpecular *= (0.58 + (0.28 + 0.26 * oilBoost) * sunMask * specLobeScale + lipSpecBoost + fluidSpecTotal) * mix(poreSpecMask, 1.0, clamp(fluidSpecTotal, 0.0, 1.0));
      reflectedLight.indirectSpecular *= (0.54 + (0.24 + 0.22 * oilBoost) * sunMask * specLobeScale + 0.10 * fresnelSheen * sunMask + lipSpecBoost * 0.65 + fluidSpecTotal * 0.85) * mix(poreSpecMask, 1.0, clamp(fluidSpecTotal, 0.0, 1.0));

      // Razor-Sharp Liquid Clearcoat Glint on Wet Tears & Fresh dew (ior=1.49 mirror catchlights!)
      if (fluidSpecTotal > 0.02) {
        vec3 winH = normalize(viewWinL + viewDir);
        vec3 topH = normalize(vec3(0.18, 0.82, 0.54) + viewDir);
        float glint1 = pow(max(0.0, dot(normal, winH)), 110.0);
        float glint2 = pow(max(0.0, dot(normal, topH)), 72.0) * 0.55;
        vec3 glintTint = mix(vec3(1.0, 0.98, 0.99), vec3(1.0, 0.82, 0.84), clamp(vDewSpecMask, 0.0, 1.0) * 0.35);
        reflectedLight.directSpecular += glintTint * (glint1 + glint2) * fluidSpecTotal * 0.85;
      }

      // Subtle Interactive Studio Fill Catchlight (softened so it never creates a plastic spotlight on the cheek)
      if (uCursorTorchIntensity > 0.01) {
        vec3 curL = normalize(uCursorLightDir);
        vec3 curH = normalize(curL + viewDir);
        float curNdl = max(0.0, dot(normal, curL));
        float curSpec = pow(max(0.0, dot(normal, curH)), 32.0) * (0.14 + 0.22 * oilBoost + lipSpecBoost * 0.65 + fluidSpecTotal * 0.9) * poreSpecMask;
        reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1.00, 0.99, 0.98) * curNdl * 0.035 * uCursorTorchIntensity;
        reflectedLight.directSpecular += vec3(0.98, 0.99, 1.00) * curSpec * 0.065 * uCursorTorchIntensity;
      }

      // Delicate Vellus Hair (Peach Fuzz) Grazing Rim along outer jawline contour only
      float vellusRim = pow(1.0 - ndotv, 4.2) * smoothstep(-0.15, 0.55, fragNdl) * (1.0 - vLipVermilionMask) * (1.0 - clamp(fluidSpecTotal, 0.0, 1.0));
      reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1.01, 0.99, 0.97) * vellusRim * (0.03 + 0.08 * sunMask) * clamp(uVellusFuzz * 1.2, 0.0, 1.4);

      #if ( NUM_DIR_LIGHTS > 0 )
        vec3 sssAccum = vec3(0.0);
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
          sssAccum += computeDualLobeSkinSSS( normal, directionalLights[ i ].direction, directionalLights[ i ].color, viewDir, vPortraitLocalPos );
        }
        #pragma unroll_loop_end
        reflectedLight.directDiffuse += sssAccum * diffuseColor.rgb * (0.45 + 0.55 * winEnv) * 0.16;
      #endif`
    );
  };
  material.customProgramCacheKey = () => 'portrait3d-true-dermis-v54';
}

/**
 * Stage 54 · Histological & Spatially-Varying Wet-Tissue Shader for NeckCrossSectionCap
 * Eliminates uniform plastic-wrap clearcoat across bone/skin! Reads dual-channel Height (R)
 * + Tissue Roughness (G) from bumpMap, perturbs normals with 3D histological micro-relief,
 * and applies mirror-wet specular catchlights strictly to pooled dew clots & moist lumens.
 */

/**
 * Injects Soft Architectural Window Light Envelope onto 3D Desk Floor & Shelf surfaces
 */
export function injectStageWindowGoboShader(material) {
  if (!material) return material;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindowGoboMode = GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboMode;
    shader.uniforms.uWindowGoboStrength = GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboStrength;
    shader.uniforms.uWindowGoboPhase = GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboPhase;
    shader.uniforms.uWindowLightDir = GLOBAL_CHIAROSCURO_UNIFORMS.uWindowLightDir;
    shader.uniforms.uChiaroscuro = GLOBAL_CHIAROSCURO_UNIFORMS.uChiaroscuro;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vStageWorldPos;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vStageWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uWindowGoboMode;
      uniform float uWindowGoboStrength;
      uniform float uWindowGoboPhase;
      uniform vec3 uWindowLightDir;
      uniform float uChiaroscuro;
      varying vec3 vStageWorldPos;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      if (uWindowGoboMode >= 0.5 && uWindowGoboStrength > 0.001) {
        vec3 L = normalize(uWindowLightDir);
        vec3 rightAx = normalize(cross(vec3(0.0, 1.0, 0.0), L) + vec3(1e-4, 0.0, 0.0));
        vec3 upAx = normalize(cross(L, rightAx));
        vec2 p = vec2(dot(vStageWorldPos, rightAx), dot(vStageWorldPos, upAx));
        float gMask = smoothstep(92.0, 18.0, length(p * vec2(0.75, 0.85)));
        float ph = uWindowGoboPhase;
        float pat = 0.52 + 0.48 * sin((p.x + sin(ph * 0.7) * 4.0) * 0.22) * cos((p.y + cos(ph * 0.5) * 3.0) * 0.22);
        float slitBand = smoothstep(-28.0, -4.0, p.x * 0.75 + p.y * 0.65 + sin(ph * 0.35) * 6.0) * smoothstep(34.0, 8.0, p.x * 0.75 + p.y * 0.65);
        float beamVal = uWindowGoboMode > 4.5 ? clamp(slitBand * (0.45 + 0.55 * pat), 0.0, 1.0) : clamp(gMask * pat, 0.0, 1.0);
        float finalGobo = mix(1.0, clamp(0.12 + 1.24 * beamVal, 0.12, 1.32), clamp(uWindowGoboStrength * 0.92, 0.0, 1.0));
        reflectedLight.directDiffuse *= finalGobo;
        reflectedLight.directSpecular *= finalGobo;
        reflectedLight.indirectDiffuse *= mix(1.0, 0.28 + 0.75 * beamVal, clamp(uChiaroscuro * 0.75, 0.0, 0.85));
      }`
    );
  };
  material.customProgramCacheKey = () => 'portrait3d-stage-window-gobo-v37';
  return material;
}

function configureKeyShadow(light, bound, mapSize = 2048, far = 400) {
  light.castShadow = true;
  light.shadow.mapSize.set(mapSize, mapSize);
  const c = light.shadow.camera;
  c.left = -bound;
  c.right = bound;
  c.top = bound;
  c.bottom = -bound;
  c.near = 1;
  c.far = far;
  c.updateProjectionMatrix();
  light.shadow.bias = -0.00012;
  light.shadow.normalBias = 0.018;
}

export function buildStudioLightRig(scene) {
  const hemi = new THREE.HemisphereLight('#f6f8fc', '#2a2628', 0.52);
  const key = new THREE.DirectionalLight('#fffaf5', 1.68);
  key.position.set(34, 26, 48);
  configureKeyShadow(key, 20, 2048, 220);
  const fill = new THREE.DirectionalLight('#d8e4f5', 0.68);
  fill.position.set(-34, 14, 38);
  const up = new THREE.DirectionalLight('#e8dcd8', 0.16);
  up.position.set(0, -48, 26);
  const rim = new THREE.DirectionalLight('#fff2e2', 0.88);
  rim.position.set(-18, 28, -42);
  scene.add(hemi, key, fill, up, rim);
  return { hemi, key, fill, up, rim };
}

export function buildDesktopLightRig(scene) {
  const hemi = new THREE.HemisphereLight('#f6f8fc', '#2a2628', 0.52);
  const key = new THREE.DirectionalLight('#fffaf5', 1.68);
  key.position.set(54, 42, 86);
  configureKeyShadow(key, 54, 2048, 480);
  const fill = new THREE.DirectionalLight('#d8e4f5', 0.68);
  fill.position.set(-55, 18, 72);
  const up = new THREE.DirectionalLight('#e8dcd8', 0.16);
  up.position.set(0, -65, 55);
  const rim = new THREE.DirectionalLight('#fff2e2', 0.88);
  rim.position.set(-28, 42, -80);
  scene.add(hemi, key, fill, up, rim);
  return { hemi, key, fill, up, rim };
}

const HDR_MODE_LIGHT_SIGNATURES = {
  softbox_portrait: {
    keyTint: '#fff7f0', fillTint: '#a6c4f0', rimTint: '#e2eeff', skyTint: '#fff9f5',
    keyScale: 1.0, fillScale: 1.0, rimScale: 1.05,
  },
  golden_hour: {
    keyTint: '#ffbe78', fillTint: '#6888c8', rimTint: '#ffb44c', skyTint: '#ffdfba',
    keyScale: 1.08, fillScale: 0.84, rimScale: 1.32,
  },
  rainy_window: {
    keyTint: '#cfe6ff', fillTint: '#6e96c8', rimTint: '#8ceeff', skyTint: '#d8ecff',
    keyScale: 0.98, fillScale: 1.06, rimScale: 1.24,
  },
  museum_velvet: {
    keyTint: '#ffe0b2', fillTint: '#7a6898', rimTint: '#ffd098', skyTint: '#f5e2cc',
    keyScale: 1.05, fillScale: 0.68, rimScale: 1.18,
  },
};

/**
 * Applies a complete Visual Customizer configuration (preset + user sliders + HDR mode + optical blur)
 * to either DesktopBoxSpaceEngine or StudioPreviewEngine in real time.
 */
export function applyCustomVisualConfigToEngine(engine, cfg = {}) {
  if (!engine || !engine.renderer || !engine.scene) return;
  const basePreset = VISUAL_STYLE_PRESETS[cfg.presetId] || VISUAL_STYLE_PRESETS.cinema_85mm_portrait;
  const m = { ...basePreset, ...cfg };

  const isStudio = Boolean(engine.controls);
  const rig = engine.lightRig || {
    hemi: engine.hemiLight || engine.hemi,
    key: engine.keyLight,
    fill: engine.fillLight,
    up: engine.anatomyUpLight || engine.upLight,
    rim: engine.rimLight,
  };

  const chiaroscuro = Number(m.chiaroscuro ?? basePreset.chiaroscuro ?? 0.58);
  const goboItem = WINDOW_GOBO_CATALOG.find(g => g.id === (m.windowGobo || basePreset.windowGobo || 'none')) || WINDOW_GOBO_CATALOG[0];
  const goboStrength = Number(m.windowGoboStrength ?? basePreset.windowGoboStrength ?? 0.18);
  const hdrMode = m.hdrMode || basePreset.hdrMode || 'softbox_portrait';
  const hdrSig = HDR_MODE_LIGHT_SIGNATURES[hdrMode] || HDR_MODE_LIGHT_SIGNATURES.softbox_portrait;

  GLOBAL_CHIAROSCURO_UNIFORMS.uChiaroscuro.value = chiaroscuro;
  GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboMode.value = goboItem.modeInt;
  GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboStrength.value = goboStrength;

  if (rig.key) {
    const baseKeyCol = new THREE.Color(m.keyColor || basePreset.keyColor);
    baseKeyCol.lerp(new THREE.Color(hdrSig.keyTint), 0.52);
    rig.key.color.copy(baseKeyCol);
    rig.key.intensity = Number(m.keyIntensity ?? basePreset.keyIntensity) * hdrSig.keyScale;
    const radius = isStudio ? 64 : 116;
    const az = THREE.MathUtils.degToRad(Number(m.keyAzimuthDeg ?? basePreset.keyAzimuthDeg));
    const el = THREE.MathUtils.degToRad(Number(m.keyElevationDeg ?? basePreset.keyElevationDeg));
    const cosEl = Math.cos(el);
    rig.key.position.set(
      radius * cosEl * Math.sin(az),
      radius * Math.sin(el),
      radius * cosEl * Math.cos(az)
    );
    GLOBAL_CHIAROSCURO_UNIFORMS.uWindowLightDir.value.copy(rig.key.position).normalize();
  }
  if (rig.fill) {
    const baseFillCol = new THREE.Color(m.fillColor || basePreset.fillColor);
    baseFillCol.lerp(new THREE.Color(hdrSig.fillTint), 0.55);
    rig.fill.color.copy(baseFillCol);
    const baseFill = Number(m.fillIntensity ?? basePreset.fillIntensity) * hdrSig.fillScale;
    rig.fill.intensity = baseFill * Math.max(0.08, 1.05 - chiaroscuro * 0.85);
  }
  if (rig.rim) {
    const baseRimCol = new THREE.Color(m.rimColor || basePreset.rimColor);
    baseRimCol.lerp(new THREE.Color(hdrSig.rimTint), 0.62);
    rig.rim.color.copy(baseRimCol);
    rig.rim.intensity = Number(m.rimIntensity ?? basePreset.rimIntensity) * hdrSig.rimScale;
  }
  if (rig.hemi) {
    const baseSkyCol = new THREE.Color(m.hemiSky || basePreset.hemiSky);
    baseSkyCol.lerp(new THREE.Color(hdrSig.skyTint), 0.50);
    rig.hemi.color.copy(baseSkyCol);
    rig.hemi.groundColor.set(m.hemiGround || basePreset.hemiGround);
    const baseHemi = Number(m.hemiIntensity ?? basePreset.hemiIntensity);
    rig.hemi.intensity = baseHemi * Math.max(0.10, 1.05 - chiaroscuro * 0.80);
  }
  if (rig.up) {
    rig.up.intensity = Number(m.upIntensity ?? basePreset.upIntensity) * Math.max(0.10, 1.0 - chiaroscuro * 0.78);
  }

  engine.renderer.toneMappingExposure = Number(m.exposure ?? basePreset.exposure ?? 1.08);
  const baseEnv = Number(m.envIntensity ?? basePreset.envIntensity ?? 0.36);
  const effectiveEnv = baseEnv * Math.max(0.24, 1.04 - chiaroscuro * 0.56);
  ensureSceneEnvironment(engine.renderer, engine.scene, effectiveEnv, hdrMode);

  // Stage 41 Dynamic Supersampling DSR (1.0x - 2.5x)
  if (m.supersample !== undefined && !engine.softwareRenderer) {
    const targetPR = Math.max(1.0, Math.min(2.5, Number(m.supersample) || 1.5));
    if (Math.abs(engine.renderer.getPixelRatio() - targetPR) > 0.02) {
      engine.renderer.setPixelRatio(targetPR);
      const canvas = engine.renderer.domElement;
      const cw = canvas?.clientWidth || window.innerWidth;
      const ch = canvas?.clientHeight || window.innerHeight;
      if (engine.beautyPost && typeof engine.beautyPost.syncSize === 'function') {
        engine.beautyPost.syncSize(cw, ch, targetPR);
      }
    }
  }

  // Update skin subsurface scattering, global micro-pore relief & eye gobo/chiaroscuro/clarity coupling
  const skinGloss = Number(m.skinGloss ?? basePreset.skinGloss ?? 0.14);
  const sssIntensity = Number(m.sssIntensity ?? basePreset.sssIntensity ?? 0.88);
  const cursorTorch = Number(m.cursorTorch ?? basePreset.cursorTorch ?? 0.55);
  const eyeClarityVal = Number(m.eyeClarity ?? basePreset.eyeClarity ?? 0.90);
  const poreReliefGlobalVal = m.poreReliefGlobal !== undefined ? Number(m.poreReliefGlobal) : undefined;
  GLOBAL_CHIAROSCURO_UNIFORMS.uSssIntensity.value = sssIntensity;
  GLOBAL_CHIAROSCURO_UNIFORMS.uCursorTorchIntensity.value = cursorTorch;

  engine.scene.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    if (obj.name === 'HeadSkinMesh' || obj.material.userData?.uSssIntensity) {
      const userRough = obj.material.userData?.customSkinRoughness;
      const baseRoughness = typeof userRough === 'number'
        ? userRough
        : Math.max(0.42, 0.64 - skinGloss * 0.24);
      // Optional Stage 45 matte module: recompute from the character's base each time.
      // No edits to customSkinRoughness, archives or imported materials; zero/off restores exactly.
      const matteAmount = Math.max(0, Math.min(1, Number(m.repairSkinMatteAmount) || 0));
      obj.material.userData.visualMatteAmount = matteAmount;
      obj.material.roughness = THREE.MathUtils.lerp(baseRoughness, Math.max(baseRoughness, 0.54), matteAmount);
      obj.material.clearcoat = Math.max(0.0, (skinGloss - 0.55) * 0.18);
      obj.material.clearcoatRoughness = 0.45;
      obj.material.specularIntensity = 0.24 + skinGloss * 0.26;
      obj.material.envMapIntensity = 0.34 + skinGloss * 0.28;
      const poreUniform = obj.material.userData?.skinGradingUniforms?.uPoreRelief;
      if (poreUniform) {
        // An optional visual override must not stick after its config is removed,
        // while preserving per-portrait relative pore scale.
        obj.material.userData.baseVisualPoreRelief ??= poreUniform.value;
        const basePore = obj.material.userData.baseVisualPoreRelief;
        obj.material.userData.visualPoreFactor = poreReliefGlobalVal !== undefined ? poreReliefGlobalVal / 0.56 : undefined;
        poreUniform.value = poreReliefGlobalVal !== undefined
          ? Math.min(1.0, basePore * (poreReliefGlobalVal / 0.56))
          : basePore;
      }
    }
    if (obj.material.userData?.eyeUniforms) {
      const eu = obj.material.userData.eyeUniforms;
      if (eu.uWindowGobo) eu.uWindowGobo.value = goboItem.modeInt;
      if (eu.uWindowGoboStrength) eu.uWindowGoboStrength.value = goboStrength;
      if (eu.uChiaroscuro) eu.uChiaroscuro.value = chiaroscuro;
      if (eu.uEyeClarity) eu.uEyeClarity.value = eyeClarityVal;
    }
  });

  const tyndallVal = Number(m.tyndall ?? basePreset.tyndall ?? 0.36);
  const vintagePhotoVal = Number(m.vintagePhoto ?? basePreset.vintagePhoto ?? 0.06);
  const keyAzDeg = Number(m.keyAzimuthDeg ?? basePreset.keyAzimuthDeg ?? 28);
  const tyndallAngleRad = keyAzDeg >= 0 ? -0.58 : 0.58;
  const keyHex = m.keyColor || basePreset.keyColor || '#fff6ee';

  if (engine.atmosphere && typeof engine.atmosphere.setTyndallConfig === 'function') {
    engine.atmosphere.setTyndallConfig({
      intensity: tyndallVal,
      color: keyHex,
      azimuthDeg: keyAzDeg,
    });
  }

  if (engine.beautyPost && typeof engine.beautyPost.setGradeParams === 'function') {
    engine.beautyPost.setGradeParams({
      bloomStrength: Number(m.bloomStrength ?? basePreset.bloomStrength ?? 0.10),
      vignette: Number(m.vignette ?? basePreset.vignette ?? 0.26),
      saturation: Number(m.saturation ?? basePreset.saturation ?? 0.96),
      contrast: Number(m.contrast ?? basePreset.contrast ?? 1.14),
      warmth: Number(m.warmth ?? basePreset.warmth ?? 0.06),
      sharpen: Number(m.sharpen ?? basePreset.sharpen ?? 0.18),
      casSharpen: Number(m.casSharpen ?? basePreset.casSharpen ?? 0.68),
      exposure: Number(m.postExposure ?? m.exposure ?? basePreset.exposure ?? 1.08),
      shadowLift: Number(m.shadowLift ?? basePreset.shadowLift ?? 0.28),
      specularClarity: Number(m.specularClarity ?? basePreset.specularClarity ?? 0.75),
      softFocus: Number(m.softFocus ?? basePreset.softFocus ?? 0.16),
      depthBlur: Number(m.depthBlur ?? basePreset.depthBlur ?? 0.04),
      chromatic: Number(m.chromatic ?? basePreset.chromatic ?? 0.08),
      filmGrain: Number(m.filmGrain ?? basePreset.filmGrain ?? 0.05),
      tyndall: tyndallVal,
      vintagePhoto: vintagePhotoVal,
      irisSparkle: Number(m.irisSparkle ?? basePreset.irisSparkle ?? 0.10),
      halation: Number(m.halation ?? basePreset.halation ?? 0.28),
      skinLumen: Number(m.skinLumen ?? basePreset.skinLumen ?? 0.0),
      sssBlur: Number(m.sssBlur ?? basePreset.sssBlur ?? 0.22),
      microContrast: Number(m.microContrast ?? basePreset.microContrast ?? 0.48),
      highlightRoll: Number(m.highlightRoll ?? basePreset.highlightRoll ?? 0.42),
      shadowCrush: Number(m.shadowCrush ?? basePreset.shadowCrush ?? 0.16),
      sunFlareVeil: Number(m.sunFlareVeil ?? basePreset.sunFlareVeil ?? 0.22),
      dappledBokeh: Number(m.dappledBokeh ?? basePreset.dappledBokeh ?? 0.0),
      anamorphicFlare: Number(m.anamorphicFlare ?? basePreset.anamorphicFlare ?? 0.16),
      lightLeak: Number(m.lightLeak ?? basePreset.lightLeak ?? 0.06),
      swirlyBokeh: Number(m.swirlyBokeh ?? basePreset.swirlyBokeh ?? 0.0),
      wetLensDrop: Number(m.wetLensDrop ?? basePreset.wetLensDrop ?? 0.0),
      lensDistortion: Number(m.lensDistortion ?? basePreset.lensDistortion ?? 0.04),
      filmLutMode: m.filmLutMode ?? basePreset.filmLutMode ?? 'portra_160_sun',
      filmLutStrength: Number(m.filmLutStrength ?? basePreset.filmLutStrength ?? 0.48),
      tyndallAngle: tyndallAngleRad,
      tyndallColor: keyHex,
      tint: m.tint || basePreset.tint,
      shadowTint: m.shadowTint || basePreset.shadowTint,
    });
  }

  engine._activeVisualState = m;

  requestShadowUpdate(engine.renderer);
  if (typeof engine.wakeRender === 'function') {
    engine.wakeRender(1.8, true);
  }
}

/**
 * Stage 37 · Slow Shifting Dynamic Light & Shadow Engine ("设计那种变换光影缓慢")
 * Smoothly evolves window light azimuth/elevation, color temperature breathing, window gobo shadow phase,
 * and Tyndall god-ray angle so the portrait and desk are alive with poetic shifting light and shadow.
 */
export function updateDynamicLightingOnEngine(engine, elapsed = 0) {
  if (!engine || !engine.renderer || !engine.scene) return false;
  const m = engine._activeVisualState || engine.visualConfig || {};
  const mode = m.dynamicLightMode || 'sunset_cloud_drift';
  const speed = Number(m.dynamicLightSpeed ?? 1.0);
  const amp = Number(m.dynamicLightAmp ?? 1.0);

  if (mode === 'static_locked' || speed <= 0.001 || amp <= 0.001) {
    return false;
  }

  const t = elapsed * speed;
  const isStudio = Boolean(engine.controls);
  const rig = engine.lightRig || {
    hemi: engine.hemiLight || engine.hemi,
    key: engine.keyLight,
    fill: engine.fillLight,
    up: engine.anatomyUpLight || engine.upLight,
    rim: engine.rimLight,
  };
  if (!rig.key) return false;

  const basePreset = VISUAL_STYLE_PRESETS[m.presetId] || VISUAL_STYLE_PRESETS.cinema_85mm_portrait;
  const hdrMode = m.hdrMode || basePreset.hdrMode || 'golden_hour';
  const hdrSig = HDR_MODE_LIGHT_SIGNATURES[hdrMode] || HDR_MODE_LIGHT_SIGNATURES.golden_hour;

  const baseAz = Number(m.keyAzimuthDeg ?? basePreset.keyAzimuthDeg ?? 38);
  const baseEl = Number(m.keyElevationDeg ?? basePreset.keyElevationDeg ?? 28);
  const baseKeyInt = Number(m.keyIntensity ?? basePreset.keyIntensity ?? 1.36) * hdrSig.keyScale;
  const baseRimInt = Number(m.rimIntensity ?? basePreset.rimIntensity ?? 0.78) * hdrSig.rimScale;
  const baseTyndall = Number(m.tyndall ?? basePreset.tyndall ?? 0.58);

  let azOffset = 0;
  let elOffset = 0;
  let intFactor = 1.0;
  let warmthShift = 0.0;
  let goboPhase = t * 0.45;

  if (mode === 'sunset_cloud_drift') {
    // Slow sweeping window sun/cloud drift across face (+-24 deg azimuth, +-7 deg elevation)
    azOffset = (Math.sin(t * 0.36) * 20.0 + Math.cos(t * 0.17) * 6.0) * amp;
    elOffset = Math.sin(t * 0.25 + 0.8) * 6.5 * amp;
    intFactor = 1.0 + Math.sin(t * 0.42) * 0.14 * amp;
    warmthShift = Math.sin(t * 0.28) * 0.18 * amp;
    goboPhase = t * 0.42;
  } else if (mode === 'tree_breeze_dappled') {
    // Gentle breeze swaying sycamore tree leaves & dappled sunlight
    azOffset = Math.sin(t * 0.48) * 15.0 * amp;
    elOffset = Math.cos(t * 0.35) * 5.0 * amp;
    intFactor = 1.0 + (Math.sin(t * 0.95) * 0.10 + Math.cos(t * 1.6) * 0.06) * amp;
    warmthShift = Math.sin(t * 0.40) * 0.12 * amp;
    goboPhase = t * 0.85;
  } else if (mode === 'rain_caustics_sway') {
    // Rainy window water-caustic shimmer & cool-warm study lamp breathing
    azOffset = Math.sin(t * 0.30) * 16.0 * amp;
    elOffset = Math.sin(t * 0.44 + 1.2) * 5.5 * amp;
    intFactor = 1.0 + Math.sin(t * 0.65) * 0.12 * amp;
    warmthShift = -0.10 + Math.sin(t * 0.32) * 0.20 * amp;
    goboPhase = t * 0.72;
  } else if (mode === 'candle_chiaroscuro') {
    // Warm organic multi-harmonic candle flame sway & chiaroscuro dance
    const flicker = Math.sin(t * 2.8) * 0.5 + Math.sin(t * 5.3 + 1.4) * 0.3 + Math.cos(t * 1.7) * 0.2;
    azOffset = (Math.sin(t * 0.85) * 14.0 + flicker * 6.0) * amp;
    elOffset = (Math.cos(t * 0.95) * 4.5 + flicker * 3.0) * amp;
    intFactor = 1.0 + flicker * 0.18 * amp;
    warmthShift = 0.16 + flicker * 0.10 * amp;
    goboPhase = t * 0.55;
  } else if (mode === 'cinema_orbit') {
    // Continuous 130-degree sculptural light orbit across nose bridge & both cheeks
    azOffset = Math.sin(t * 0.52) * 62.0 * amp;
    elOffset = Math.cos(t * 0.26) * 10.0 * amp;
    intFactor = 1.0 + Math.cos(t * 0.52) * 0.10 * amp;
    warmthShift = Math.sin(t * 0.52) * 0.16 * amp;
    goboPhase = t * 0.60;
  }

  const curAzDeg = baseAz + azOffset;
  const curElDeg = Math.max(4, Math.min(72, baseEl + elOffset));
  const radius = isStudio ? 64 : 116;
  const azRad = THREE.MathUtils.degToRad(curAzDeg);
  const elRad = THREE.MathUtils.degToRad(curElDeg);
  const cosEl = Math.cos(elRad);

  rig.key.position.set(
    radius * cosEl * Math.sin(azRad),
    radius * Math.sin(elRad),
    radius * cosEl * Math.cos(azRad)
  );
  rig.key.intensity = Math.max(0.35, baseKeyInt * intFactor);

  // Subtle color temperature breathing on key & rim lights
  const baseKeyCol = new THREE.Color(m.keyColor || basePreset.keyColor || '#ffeed6');
  baseKeyCol.lerp(new THREE.Color(hdrSig.keyTint), 0.52);
  if (warmthShift >= 0) {
    baseKeyCol.lerp(new THREE.Color('#ffbe6b'), Math.min(0.45, warmthShift));
  } else {
    baseKeyCol.lerp(new THREE.Color('#b6d4ff'), Math.min(0.45, -warmthShift));
  }
  rig.key.color.copy(baseKeyCol);

  if (rig.rim) {
    rig.rim.intensity = Math.max(0.2, baseRimInt * (1.0 - (intFactor - 1.0) * 0.5));
    const rimAz = azRad + Math.PI * 0.82;
    rig.rim.position.set(
      radius * 0.72 * Math.sin(rimAz),
      radius * 0.42,
      -radius * 0.68 * Math.cos(azRad * 0.5)
    );
  }

  GLOBAL_CHIAROSCURO_UNIFORMS.uWindowLightDir.value.copy(rig.key.position).normalize();
  GLOBAL_CHIAROSCURO_UNIFORMS.uWindowGoboPhase.value = goboPhase;
  engine.scene.traverse((obj) => {
    if (obj.isMesh && obj.material?.userData?.eyeUniforms?.uWindowGoboPhase) {
      obj.material.userData.eyeUniforms.uWindowGoboPhase.value = goboPhase;
    }
  });

  // Update Tyndall ray direction & breathing intensity
  const tyndallAngleRad = -THREE.MathUtils.clamp(curAzDeg / 58.0, -0.82, 0.82);
  const curTyndall = Math.max(0, baseTyndall * (0.90 + 0.22 * intFactor));
  if (engine.atmosphere && typeof engine.atmosphere.setTyndallConfig === 'function') {
    engine.atmosphere.setTyndallConfig({
      intensity: curTyndall,
      color: baseKeyCol.getStyle(),
      azimuthDeg: curAzDeg,
    });
  }
  if (engine.beautyPost && engine.beautyPost.gradePass?.uniforms) {
    const u = engine.beautyPost.gradePass.uniforms;
    if (u.uTyndallAngle) u.uTyndallAngle.value = tyndallAngleRad;
    if (u.uTyndall) u.uTyndall.value = curTyndall;
  }

  // Throttle shadow map rebuilds during slow ambient light drift (every ~120ms is silky smooth & saves GPU!)
  const nowMs = performance.now();
  if (!engine._lastDynShadowMs || nowMs - engine._lastDynShadowMs > 110) {
    engine._lastDynShadowMs = nowMs;
    requestShadowUpdate(engine.renderer);
  }
  return true;
}

const QUALITY_CONFIGS = {
  low: { pixelRatioCap: 1, shadowSize: 0, envIntensity: 0.28, aniso: 4 },
  medium: { pixelRatioCap: 1.5, shadowSize: 1024, envIntensity: 0.46, aniso: 8 },
  high: { pixelRatioCap: 2, shadowSize: 2048, envIntensity: 0.50, aniso: 8 },
  ultra: {
    pixelRatioCap: 2.5,
    studioPixelRatioCap: 3,
    shadowSize: 2048,
    studioShadowSize: 4096,
    envIntensity: 0.54,
    aniso: 16,
  },
  rtx2070: {
    pixelRatioCap: 1.5,
    studioPixelRatioCap: 2,
    shadowSize: 2048,
    studioShadowSize: 2048,
    envIntensity: 0.48,
    aniso: 16,
  },
};

export function applyRenderQualityToEngine(engine, level = 'high') {
  const lvl = RENDER_QUALITY_LEVELS.includes(level) ? level : 'high';
  const cfg = QUALITY_CONFIGS[lvl];
  const { renderer, scene } = engine;
  if (!renderer || !scene) return lvl;

  const isStudio = Boolean(engine.controls);
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  let ratio = dpr;
  if (lvl === 'rtx2070') ratio = isStudio ? Math.max(dpr, 1.75) : Math.max(dpr, 1.25);
  else if (lvl === 'ultra') ratio = isStudio ? Math.max(dpr, 2.5) : Math.max(dpr, 1.75);
  else if (lvl === 'high' && isStudio) ratio = Math.max(dpr, 2);
  const cap = isStudio ? cfg.studioPixelRatioCap || cfg.pixelRatioCap : cfg.pixelRatioCap;
  renderer.setPixelRatio(engine.softwareRenderer ? Math.min(dpr, 1) : Math.min(ratio, cap));

  const maxAniso = Math.min(cfg.aniso || 8, renderer.capabilities?.getMaxAnisotropy?.() || 8);
  scene.traverse?.((obj) => {
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    mats.forEach((m) => {
      ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach((k) => {
        if (m[k]) m[k].anisotropy = maxAniso;
      });
    });
  });

  const shadowSize = engine.softwareRenderer ? 0 : (isStudio ? cfg.studioShadowSize || cfg.shadowSize : cfg.shadowSize);
  if (engine.softwareRenderer) {
    renderer.shadowMap.enabled = false;
    if (engine.beautyPost) engine.beautyPost.setEnabled(false);
  }
  const key = engine.keyLight;
  if (key && key.shadow) {
    key.castShadow = shadowSize > 0;
    if (shadowSize > 0) {
      const sh = key.shadow;
      if (sh.mapSize.x !== shadowSize) {
        sh.mapSize.set(shadowSize, shadowSize);
        if (sh.map) {
          sh.map.dispose();
          sh.map = null;
        }
      }
    }
  }

  if ('environmentIntensity' in scene) {
    const activeEnv = engine._activeVisualState?.envIntensity ?? cfg.envIntensity;
    const activeChiaro = engine._activeVisualState?.chiaroscuro ?? 0.94;
    scene.environmentIntensity = activeEnv * Math.max(0.12, 1.04 - activeChiaro * 0.72);
  }
  requestShadowUpdate(renderer);
  engine.currentRenderQuality = lvl;
  if (typeof engine.wakeRender === 'function') {
    engine.wakeRender(1.5, true);
  }
  return lvl;
}

export function isSoftwareRenderer(renderer) {
  try {
    const gl = renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const name = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return /swiftshader|llvmpipe|softpipe|software raster/i.test(String(name));
  } catch (_) {
    return false;
  }
}
