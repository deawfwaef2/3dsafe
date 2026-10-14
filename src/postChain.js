// 画质提升 · 摄影后期链（独立模块）
// RenderPass(MSAA 半浮点 HDR) → GTAO 接触阴影 → 柔和高光溢出 → AgX 色调映射 → 镜头/胶片层
// 镜头/胶片层：极轻微的色差、暗角、细颗粒、局部锐化（模拟真实镜头的微对比度），全部可调。
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export const POST_DEFAULTS = {
  ao: true, aoRadius: 0.035, aoIntensity: 0.9,
  bloom: 0.12, bloomThreshold: 0.92, bloomRadius: 0.55,
  grain: 0.035, vignette: 0.32, chroma: 0.0012, sharpen: 0.35,
  warmth: 0.0, contrast: 1.04, saturation: 0.97, lift: 0.012,
};

const LensFilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
    uVignette: { value: 0.32 },
    uChroma: { value: 0.0012 },
    uSharpen: { value: 0.35 },
    uWarmth: { value: 0 },
    uContrast: { value: 1.04 },
    uSaturation: { value: 0.97 },
    uLift: { value: 0.012 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime;
    uniform float uGrain, uVignette, uChroma, uSharpen, uWarmth, uContrast, uSaturation, uLift;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p*vec2(443.897,441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      // 镜头横向色差（只在画面边缘明显）
      vec2 off = c * uChroma * (1.0 + r2 * 4.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      // 局部微对比度锐化（unsharp mask）
      vec2 px = 1.0 / uRes;
      vec3 blur = (texture2D(tDiffuse, uv + vec2(px.x,0.)).rgb + texture2D(tDiffuse, uv - vec2(px.x,0.)).rgb
                 + texture2D(tDiffuse, uv + vec2(0.,px.y)).rgb + texture2D(tDiffuse, uv - vec2(0.,px.y)).rgb) * 0.25;
      col += (col - blur) * uSharpen;
      // 调色：抬黑、对比、饱和、冷暖
      col = col * (1.0 - uLift) + uLift;
      col = (col - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col *= vec3(1.0 + uWarmth * 0.06, 1.0, 1.0 - uWarmth * 0.06);
      // 自然暗角
      col *= mix(1.0, smoothstep(0.85, 0.15, r2 * 1.6), uVignette);
      // 亮度相关胶片颗粒（暗部更明显，像真实传感器）
      float g = hash(uv * uRes + fract(uTime) * 91.7) - 0.5;
      col += g * uGrain * (1.0 - l * 0.6);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export function createPostChain(renderer, scene, camera, opts = {}) {
  const o = { ...POST_DEFAULTS, ...opts };
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
    type: THREE.HalfFloatType,
    samples: opts.samples ?? 4,
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));

  let gtao = null;
  if (o.ao) {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.updateGtaoMaterial({ radius: o.aoRadius, distanceExponent: 1.4, thickness: 1.0, scale: 1.0, samples: 16 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    gtao.blendIntensity = o.aoIntensity;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), o.bloom, o.bloomRadius, o.bloomThreshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(LensFilmShader);
  composer.addPass(film);

  function set(p) {
    if (p.grain != null) film.uniforms.uGrain.value = p.grain;
    if (p.vignette != null) film.uniforms.uVignette.value = p.vignette;
    if (p.chroma != null) film.uniforms.uChroma.value = p.chroma;
    if (p.sharpen != null) film.uniforms.uSharpen.value = p.sharpen;
    if (p.warmth != null) film.uniforms.uWarmth.value = p.warmth;
    if (p.contrast != null) film.uniforms.uContrast.value = p.contrast;
    if (p.saturation != null) film.uniforms.uSaturation.value = p.saturation;
    if (p.lift != null) film.uniforms.uLift.value = p.lift;
    if (p.bloom != null) bloom.strength = p.bloom;
    if (gtao && p.aoIntensity != null) gtao.blendIntensity = p.aoIntensity;
    if (gtao && p.ao != null) gtao.enabled = !!p.ao;
  }
  set(o);
  function setSize(w, h) {
    composer.setSize(w, h);
    film.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }
  setSize(size.x, size.y);
  return {
    composer, gtao, bloom, film, set, setSize,
    render(t) { film.uniforms.uTime.value = t; composer.render(); },
  };
}
