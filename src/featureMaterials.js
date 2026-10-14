// 画质提升 · 眼睛 / 睫毛 / 眉毛 / 头发材质（独立模块）
import * as THREE from 'three';

/** 眼球：巩膜+虹膜底层（偏哑光、略暖），角膜：高光滑透明层，用于反射柔光箱形成真实眼神光 */
export function upgradeEyeMaterial(src) {
  const name = (src.name || '').toLowerCase();
  if (name.includes('cornea')) {
    const m = new THREE.MeshPhysicalMaterial({
      name: 'PhotorealCornea',
      color: 0xffffff,
      roughness: 0.03,
      metalness: 0,
      ior: 1.376,
      specularIntensity: 1.0,
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
      envMapIntensity: 1.1,
    });
    // 让反射不被 opacity 一起削弱：透明度只作用在漫反射，高光保持
    m.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        '#include <opaque_fragment>',
        `float specL = dot(outgoingLight - totalDiffuse, vec3(0.333));
         diffuseColor.a = clamp(diffuseColor.a + specL * 0.7, 0.0, 1.0);
         #include <opaque_fragment>`,
      );
    };
    m.customProgramCacheKey = () => 'photoreal-cornea-v1';
    return m;
  }
  const m = new THREE.MeshPhysicalMaterial({
    name: 'PhotorealEye',
    map: src.map || null,
    color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1),
    roughness: 0.42,
    metalness: 0,
    sheen: 0.0,
  });
  if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
  // 巩膜不能是纯白：真人眼白在阴影和边缘偏灰、略暖
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
       diffuseColor.rgb *= vec3(0.93, 0.9, 0.87);`,
    );
  };
  m.customProgramCacheKey = () => 'photoreal-eye-v1';
  return m;
}

export function upgradeLashMaterial(src) {
  const m = new THREE.MeshStandardMaterial({
    name: 'PhotorealLash',
    map: src.map || null,
    color: new THREE.Color(0.06, 0.05, 0.05),
    roughness: 0.55,
    transparent: true,
    alphaTest: 0.06,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
  return m;
}

export function upgradeBrowMaterial(src) {
  const m = new THREE.MeshStandardMaterial({
    name: 'PhotorealBrow',
    map: src.map || null,
    color: new THREE.Color(0.55, 0.47, 0.42),
    roughness: 0.85,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
  // 原眉毛贴图 alpha 只有 0/224 两档 → 边缘像贴纸。这里对真实贴图做多点采样羽化，边缘自然过渡
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
         vec4 bt = texture2D(map, vMapUv);
         vec2 px = vec2(2.0 / 512.0);
         float a = 0.0;
         for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) a += texture2D(map, vMapUv + vec2(float(i), float(j)) * px).a;
         a /= 25.0;
         float soft = smoothstep(0.15, 0.95, a) * 0.8 + bt.a * 0.2;
         diffuseColor.rgb *= mix(vec3(0.16, 0.12, 0.105), bt.rgb, 0.35);
         diffuseColor.a *= soft * 0.78;
       #endif`,
    );
  };
  m.customProgramCacheKey = () => 'photoreal-brow-v2';
  m.color.setRGB(1, 1, 1);
  return m;
}

export const HAIR_DEFAULTS = {
  color: [0.032, 0.023, 0.019], // 东亚自然黑发：深棕黑（线性空间），不是纯黑
  roughness: 0.62,
  textureInfluence: 0.6,
  spec1: 0.09, spec1Exp: 220.0,   // 主高光 R：发丝表皮反射，冷白、细
  spec2: 0.07, spec2Exp: 40.0,   // 次高光 TRT：穿过发丝内部，带发色、宽
  shift2: -0.18,
  normalBlend: 0.62,             // 发片法线 → 头部体积法线 混合，消除发片棱角
  headCenter: [0.0, 0.012, -0.005],
  crown: [0.0, 0.135, -0.02],
  scalpRadius: 0.092,
  inset: 0.0,
};

const HAIR_VERT_DECL = /* glsl */ `
uniform vec3 uHeadCenter; uniform vec3 uCrown; uniform float uInset;
attribute float aScalpD; varying float vScalpD;
varying vec3 vHairFlow; varying vec3 vHairRadial; varying float vHairDepth;
`;
const HAIR_VERT_MAIN = /* glsl */ `
transformed -= normalize(transformed - uHeadCenter) * uInset;
vScalpD = aScalpD;
{
  vec3 p = transformed;
  vec3 flow = normalize(p - uCrown);
  vec3 rad = normalize(p - uHeadCenter);
  vHairFlow = normalize(mat3(modelViewMatrix) * flow);
  vHairRadial = normalize(normalMatrix * rad);
  vHairDepth = length(p - uHeadCenter);
}
`;
const HAIR_FRAG_DECL = /* glsl */ `
uniform float uTexInfluence, uSpec1, uSpec1Exp, uSpec2, uSpec2Exp, uShift2, uNormalBlend, uScalpRadius, uScalpFade;
varying float vScalpD;
varying vec3 vHairFlow; varying vec3 vHairRadial; varying float vHairDepth;
vec3 gHairT = vec3(0.0, 1.0, 0.0);
vec3 gHairTint = vec3(1.0);
float gHairAO = 1.0;
`;

function patchHairShader(s, o, tipsPass, shared) {
  Object.assign(s.uniforms, {
    uTexInfluence: { value: o.textureInfluence },
    uSpec1: { value: o.spec1 }, uSpec1Exp: { value: o.spec1Exp },
    uSpec2: { value: o.spec2 }, uSpec2Exp: { value: o.spec2Exp },
    uShift2: { value: o.shift2 }, uNormalBlend: { value: o.normalBlend },
    uHeadCenter: { value: new THREE.Vector3(...o.headCenter) },
    uCrown: { value: new THREE.Vector3(...o.crown) },
    uScalpRadius: { value: o.scalpRadius },
  });
  s.uniforms.uInset = shared.uInset;
  s.uniforms.uScalpFade = shared.uScalpFade;
  s.vertexShader = s.vertexShader
    .replace('#include <common>', '#include <common>\n' + HAIR_VERT_DECL)
    .replace('#include <project_vertex>', HAIR_VERT_MAIN + '#include <project_vertex>');
  const lights = THREE.ShaderChunk.lights_physical_pars_fragment
    .replace(
      'vec3 irradiance = dotNL * directLight.color;',
      `float hWrap = clamp((dot(geometryNormal, directLight.direction) + 0.45) / 1.45, 0.0, 1.0);
       vec3 irradiance = hWrap * directLight.color;`,
    )
    .replace(
      'reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );',
      `{
         vec3 H = normalize(directLight.direction + geometryViewDir);
         float t1 = dot(gHairT, H);
         float s1 = pow(sqrt(max(0.0, 1.0 - t1 * t1)), uSpec1Exp);
         vec3 T2 = normalize(gHairT + geometryNormal * uShift2);
         float t2 = dot(T2, H);
         float s2 = pow(sqrt(max(0.0, 1.0 - t2 * t2)), uSpec2Exp);
         reflectedLight.directSpecular += irradiance * gHairAO * (uSpec1 * s1 + uSpec2 * s2 * gHairTint);
       }`,
    );
  s.fragmentShader = s.fragmentShader
    .replace('#include <common>', '#include <common>\n' + HAIR_FRAG_DECL)
    .replace('#include <lights_physical_pars_fragment>', lights)
    .replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
         vec4 hTex = texture2D( map, vMapUv );
         float lum = dot(hTex.rgb, vec3(0.299, 0.587, 0.114));
         lum = mix(0.45, min(lum, 0.8), smoothstep(0.2, 0.8, hTex.a));
         vec3 strand = mix(vec3(1.0), vec3(0.6 + lum * 0.8), uTexInfluence);
         diffuseColor.rgb *= strand;
         diffuseColor.a *= hTex.a;
       #endif
       gHairTint = normalize(diffuseColor.rgb + 1e-4) * 1.2;
       // 内层发丝更暗（发量体积感），越靠近头皮越暗
       gHairAO = mix(0.35, 1.0, smoothstep(uScalpRadius, uScalpRadius + 0.022, vHairDepth));
       diffuseColor.rgb *= gHairAO;`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       {
         vec3 rad = normalize(vHairRadial);
         normal = normalize(mix(normal, rad, uNormalBlend));
         vec3 f = normalize(vHairFlow);
         gHairT = normalize(f - normal * dot(f, normal));
       }`,
    );
  // 发丝模式：发片底衬只保留贴近头皮的部分（距头皮 > uScalpFade 的发片抖动剔除），外层与发梢只剩真发丝 → 透光、不成“一坨”
  s.fragmentShader = s.fragmentShader.replace(
    '#include <alphatest_fragment>',
    `#include <alphatest_fragment>
     if (uScalpFade > 0.0) {
       if (vScalpD > uScalpFade) discard;
     }`,
  );
  if (tipsPass) {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <alphatest_fragment>',
      '#include <alphatest_fragment>\n if (diffuseColor.a >= 0.45) discard;',
    );
  }
}

/**
 * 头发：两遍渲染
 *  A. 不透明核心（alphaTest 0.3，写深度，投射阴影）→ 体积、遮挡、发丝投影到额头
 *  B. 半透明发梢（只画 alpha<0.3 的部分，不写深度）→ 发际线与发梢的柔软过渡
 * 着色：Kajiya-Kay 双高光（R 冷白细高光 + TRT 带发色宽高光），切线来自“头顶→发梢”的 3D 连续流场，
 * 不依赖发片 UV 方向；法线与头部体积法线混合，消除发片棱角与三角面闪烁。
 */
export function buildHairMaterials(src, opts = {}) {
  const o = { ...HAIR_DEFAULTS, ...opts };
  const base = {
    map: src.map || null,
    color: new THREE.Color(...o.color),
    roughness: o.roughness,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.3,
  };
  if (base.map) { base.map.colorSpace = THREE.SRGBColorSpace; base.map.anisotropy = 8; }
  const shared = { uInset: { value: o.inset }, uScalpFade: { value: 0 } };
  const core = new THREE.MeshStandardMaterial({ ...base, name: 'PhotorealHairCore', alphaTest: 0.45 });
  core.onBeforeCompile = (s) => patchHairShader(s, o, false, shared);
  core.customProgramCacheKey = () => 'photoreal-hair-core-v3';
  const tips = new THREE.MeshStandardMaterial({ ...base, name: 'PhotorealHairTips', transparent: true, depthWrite: false, alphaTest: 0.04 });
  tips.onBeforeCompile = (s) => patchHairShader(s, o, true, shared);
  tips.customProgramCacheKey = () => 'photoreal-hair-tips-v3';
  return { core, tips, shared };
}

export function applyHairColor(mats, rgb) {
  for (const m of [mats.core, mats.tips]) m.color.setRGB(rgb[0], rgb[1], rgb[2]);
}
