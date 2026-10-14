/**
 * Stage 10 · Kajiya-Kay 发丝双重镜面（Unreal/影视级头发高光模型）
 *
 * three.js 的 MeshPhysicalMaterial.anisotropy 是拉丝金属模型，不是头发模型，
 * 发丝真正的"挑染光带"需要沿发丝切向的 Kajiya-Kay 高光：
 *   spec = pow(sqrt(1 - dot(T,H)^2), shininess)
 * 发丝切向 T 从 UV 的 V 向（发丝纹理走向）经屏幕空间导数反推，无需切线属性、
 * 无需逐材质 uniform（染色从 diffuseColor 派生），所有发丝共用一个着色器程序。
 * 注入点：emissivemap_fragment 之后（此时 normal / diffuseColor / vMapUv 均已就绪）。
 */

export const HAIR_KK_CACHE_KEY = 'hairKajiyaKay.v1';

export function injectHairKajiyaKay(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vHairWorldPos;')
    .replace(
      '#include <fog_vertex>',
      '#include <fog_vertex>\nvHairWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
    );

  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vHairWorldPos;')
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
{
  vec2 kkUv = vMapUv;
  float kDvx = dFdx(kkUv.y);
  float kDvy = dFdy(kkUv.y);
  float kDen = kDvx * kDvx + kDvy * kDvy;
  if (kDen > 1e-10) {
    vec3 kT = normalize((dFdx(vHairWorldPos) * kDvx + dFdy(vHairWorldPos) * kDvy) / kDen);
    vec3 kV = normalize(cameraPosition - vHairWorldPos);
    vec3 kL = normalize(vec3(0.38, 0.72, 0.55));
    vec3 kH = normalize(kL + kV);
    float kTH = clamp(dot(kT, kH), -1.0, 1.0);
    float kPrim = pow(sqrt(max(0.0, 1.0 - kTH * kTH)), 110.0);
    vec3 kT2 = normalize(kT + normal * 0.22);
    float kTH2 = clamp(dot(kT2, kH), -1.0, 1.0);
    float kSec = pow(sqrt(max(0.0, 1.0 - kTH2 * kTH2)), 16.0);
    float kStrand = texture2D(map, kkUv).g;
    vec3 kTint = mix(vec3(1.0), diffuseColor.rgb, 0.35);
    totalEmissiveRadiance += kTint * (kPrim * (0.45 + 0.75 * kStrand) + kSec * 0.22 * (0.5 + 0.5 * kStrand));
  }
}`
    );
}
