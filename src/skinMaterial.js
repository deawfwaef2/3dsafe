// 画质提升 · 真人皮肤着色（独立模块）
// 关键点（全部是着色/光学层面，不手绘任何五官贴图，不改动网格顶点）：
//  1) 预积分次表面散射（Pre-integrated SSS）近似：按 R/G/B 分通道“包裹”明暗交界线，
//     红光在皮肤里走得更远 → 明暗交界处出现真人那种暖红过渡，而不是 CG 的灰黑硬边。
//     散射宽度随屏幕空间曲率变化（鼻翼、耳朵、嘴唇这些小半径部位更通透）。
//  2) 分通道法线：红通道用更平滑的几何法线、蓝通道用带毛孔的细节法线（Penner 2011 做法），
//     既保留毛孔高光颗粒，又避免“橘皮”。
//  3) 双瓣高光：基础 GGX（粗糙 0.5，大面积柔光）+ 低强度清漆瓣（粗糙 0.3，皮脂微光），
//     皮肤 IOR 1.4（F0≈0.028）。再加少量 sheen 模拟面部绒毛在逆光边缘的柔亮。
//  4) 反照率只做全局色彩校准（对比/饱和/伽马），不涂任何妆容。
import * as THREE from 'three';

export const SKIN_DEFAULTS = {
  roughness: 0.56,
  normalScale: 0.8,
  scatter: 1.0,          // 次表面散射强度
  curvatureScale: 1 / 140, // 曲率→散射映射（场景单位为米时）
  dualLobe: 0.07,        // 第二高光瓣强度
  dualLobeRoughness: 0.32,
  sheen: 0.1,
  albedoContrast: 1.08,
  albedoSaturation: 1.22,
  albedoGamma: 1.12,
  subsurfaceTint: [1.0, 0.36, 0.24],
};

const SKIN_DIRECT_GLSL = /* glsl */ `
uniform float uSkinScatter;
uniform vec3 uSkinTint;
float gSkinCurv = 0.0;
vec3 gSkinSmoothN = vec3(0.0, 0.0, 1.0);
vec3 skinPreintegratedDiffuse(const in vec3 Nd, const in vec3 L) {
  vec3 Ns = gSkinSmoothN;
  float ndlR = dot(normalize(mix(Nd, Ns, 0.8)), L);
  float ndlG = dot(normalize(mix(Nd, Ns, 0.4)), L);
  float ndlB = dot(Nd, L);
  vec3 ndl = vec3(ndlR, ndlG, ndlB);
  // 散射宽度：平坦处窄、曲率大处宽；红 > 绿 > 蓝
  vec3 w = mix(vec3(0.16, 0.055, 0.03), vec3(0.62, 0.26, 0.15), gSkinCurv) * uSkinScatter;
  vec3 d = clamp((ndl + w) / (1.0 + w), 0.0, 1.0);
  // 明暗交界线附近的血色（只在交界带出现，亮面/暗面都不染色）
  float band = clamp(1.0 - abs(ndlB) * 3.2, 0.0, 1.0) * step(-0.25, ndlB);
  d += uSkinTint * band * 0.07 * uSkinScatter;
  return d;
}
`;

export function upgradeSkinMaterial(src, opts = {}) {
  const o = { ...SKIN_DEFAULTS, ...opts };
  const mat = new THREE.MeshPhysicalMaterial({
    name: 'PhotorealSkin',
    map: src.map || null,
    normalMap: src.normalMap || null,
    normalScale: new THREE.Vector2(o.normalScale, o.normalScale),
    roughness: o.roughness,
    metalness: 0,
    ior: 1.4,
    specularIntensity: 0.75,
    specularColor: new THREE.Color(1, 1, 1),
    clearcoat: o.dualLobe,
    clearcoatRoughness: o.dualLobeRoughness,
    sheen: o.sheen,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(1.0, 0.86, 0.8),
  });
  if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 8; }
  if (mat.normalMap) { mat.normalMap.anisotropy = 8; }
  mat.userData.skinUniforms = {
    uSkinScatter: { value: o.scatter },
    uSkinTint: { value: new THREE.Vector3(...o.subsurfaceTint) },
    uCurvScale: { value: o.curvatureScale },
    uAlbedoGrade: { value: new THREE.Vector3(o.albedoContrast, o.albedoSaturation, o.albedoGamma) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mat.userData.skinUniforms);
    let lights = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
      `vec3 skinIrr = skinPreintegratedDiffuse( geometryNormal, directLight.direction ) * directLight.color;
       reflectedLight.directDiffuse += skinIrr * BRDF_Lambert( material.diffuseColor );`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', SKIN_DIRECT_GLSL + lights)
      .replace('#include <common>', '#include <common>\nuniform float uCurvScale;\nuniform vec3 uAlbedoGrade;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, uAlbedoGrade.y);
          c = pow(max(c, 0.0), vec3(uAlbedoGrade.z));
          float mid = 0.38;
          c = max((c - mid) * uAlbedoGrade.x + mid, 0.0);
          diffuseColor.rgb = c;
        }`,
      )
      .replace(
        '#include <lights_fragment_begin>',
        `{
          vec3 sn = normalize(vNormal);
          #ifdef DOUBLE_SIDED
            sn *= faceDirection;
          #endif
          gSkinSmoothN = sn;
          float dn = length(fwidth(sn));
          float dp = length(fwidth(vViewPosition));
          gSkinCurv = clamp(dn / max(dp, 1e-6) * uCurvScale, 0.0, 1.0);
        }
        #include <lights_fragment_begin>`,
      );
  };
  mat.customProgramCacheKey = () => 'photoreal-skin-v1';
  return mat;
}

export function setSkinParams(mat, p) {
  const u = mat.userData.skinUniforms;
  if (!u) return;
  if (p.scatter != null) u.uSkinScatter.value = p.scatter;
  if (p.roughness != null) mat.roughness = p.roughness;
  if (p.normalScale != null) mat.normalScale.set(p.normalScale, p.normalScale);
  if (p.dualLobe != null) mat.clearcoat = p.dualLobe;
  if (p.sheen != null) mat.sheen = p.sheen;
  if (p.albedoContrast != null) u.uAlbedoGrade.value.x = p.albedoContrast;
  if (p.albedoSaturation != null) u.uAlbedoGrade.value.y = p.albedoSaturation;
}
