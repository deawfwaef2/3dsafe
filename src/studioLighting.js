// 画质提升 · 摄影棚布光（独立模块，不依赖主项目）
// 思路：真实感 = 真实的光源形状 + 柔和但有方向的阴影 + 眼睛/皮肤里能看到的柔光箱反射。
//  1) 用一个只供 PMREM 烘焙的“虚拟摄影棚”场景（发光柔光箱 / 反光板 / 轮廓灯条）生成 IBL 环境贴图，
//     这样皮肤高光与眼神光是“矩形柔光箱”而不是 CG 点光源的小亮点。该场景不会出现在画面里。
//  2) 再放一盏与主柔光箱同方向的方向光，负责投射柔和阴影（头发→额头、鼻影、下巴影）。
import * as THREE from 'three';

export const LIGHT_PRESETS = {
  softbox: {
    label: '摄影棚柔光（参考图3）',
    exposure: 0.85,
    key: { dir: [-0.55, 0.42, 0.72], color: 0xfff4ea, intensity: 2.6, size: 1.35 },
    fill: { dir: [0.85, 0.05, 0.55], color: 0xe9eef7, intensity: 0.08 },
    rim: [{ dir: [0.7, 0.35, -0.65], color: 0xfff1e2, intensity: 1.15 }, { dir: [-0.75, 0.25, -0.6], color: 0xdfe8ff, intensity: 0.65 }],
    top: 0.2, floor: [0.16, 0.13, 0.11],
    envIntensity: 0.38,
    backdrop: ['#8c8580', '#3f3b39'],
  },
  window: {
    label: '窗边自然光（参考图1）',
    exposure: 1.08,
    key: { dir: [0.85, 0.32, 0.42], color: 0xfff1e0, intensity: 2.9, size: 1.9 },
    fill: { dir: [-0.8, 0.1, 0.6], color: 0xf1e6da, intensity: 0.42 },
    rim: [{ dir: [-0.5, 0.4, -0.8], color: 0xffe9d2, intensity: 0.55 }],
    top: 0.42, floor: [0.36, 0.30, 0.25],
    envIntensity: 1.0,
    backdrop: ['#d9cdbf', '#9a8b7c'],
  },
  rembrandt: {
    label: '伦勃朗侧光（强明暗）',
    exposure: 0.95,
    key: { dir: [-0.78, 0.55, 0.32], color: 0xffe8d0, intensity: 3.2, size: 0.9 },
    fill: { dir: [0.9, 0.0, 0.4], color: 0xd6deea, intensity: 0.1 },
    rim: [{ dir: [0.65, 0.4, -0.7], color: 0xfff0e0, intensity: 0.9 }],
    top: 0.1, floor: [0.08, 0.07, 0.06],
    envIntensity: 0.55,
    backdrop: ['#3a3634', '#121111'],
  },
  overcast: {
    label: '阴天自拍光（参考图2）',
    exposure: 1.12,
    key: { dir: [0.15, 0.55, 0.85], color: 0xf4f6ff, intensity: 1.55, size: 2.4 },
    fill: { dir: [-0.6, 0.0, 0.8], color: 0xf2f0ee, intensity: 0.5 },
    rim: [{ dir: [0.6, 0.6, -0.5], color: 0xffffff, intensity: 0.75 }],
    top: 0.55, floor: [0.30, 0.29, 0.28],
    envIntensity: 1.15,
    backdrop: ['#b8b4b0', '#6d6a68'],
  },
};

function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]).normalize(); }

/** 构建只用于 PMREM 的虚拟摄影棚（发光面板），返回 envMap 纹理 */
export function buildStudioEnvironment(renderer, preset) {
  const env = new THREE.Scene();
  // 深灰色棚壁，带一点暖色地面反光
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(20, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { top: { value: preset.top }, floor: { value: new THREE.Vector3(...preset.floor) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: `uniform float top; uniform vec3 floor; varying vec3 vP;
        void main(){ float h = vP.y; vec3 wall = vec3(0.055,0.052,0.05);
          vec3 c = mix(floor, wall, smoothstep(-0.35, 0.05, h));
          c = mix(c, vec3(top), smoothstep(0.55, 0.98, h));
          gl_FragColor = vec4(c,1.0);} `,
    }),
  );
  env.add(room);
  const panel = (dir, color, intensity, w, h, dist = 9) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    const d = v3(dir);
    m.position.copy(d.multiplyScalar(dist));
    m.lookAt(0, 0, 0);
    env.add(m);
    return m;
  };
  const k = preset.key;
  // 主柔光箱：大面积矩形 + 外圈柔边（模拟柔光布衰减）
  panel(k.dir, k.color, 7.5 * (k.intensity / 2.4), 4.2 * k.size, 5.6 * k.size, 9);
  panel(k.dir, k.color, 1.6 * (k.intensity / 2.4), 6.4 * k.size, 7.8 * k.size, 9.4);
  // 补光反光板（大、暗、偏冷）
  panel(preset.fill.dir, preset.fill.color, 3.2 * preset.fill.intensity / 0.33 * 0.33, 6, 7, 9);
  // 轮廓灯条（窄长条）
  for (const r of preset.rim) panel(r.dir, r.color, 9 * r.intensity, 1.0, 7.5, 9);
  // 顶部柔光
  panel([0, 1, 0.15], 0xffffff, 2.2 * preset.top, 6, 6, 9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  env.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  return rt.texture;
}

/** 在主场景中布置直射光（带柔和阴影）。返回 { group, update(preset) } */
export function createStudioRig(scene, renderer, presetId = 'softbox', opts = {}) {
  const group = new THREE.Group();
  group.name = 'PhotorealStudioRig';
  scene.add(group);
  const radius = opts.radius ?? 1.2;

  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.castShadow = true;
  key.shadow.mapSize.set(opts.shadowMapSize ?? 2048, opts.shadowMapSize ?? 2048);
  key.shadow.bias = -0.00012;
  key.shadow.normalBias = 0.0012;
  key.shadow.radius = 6;
  key.shadow.blurSamples = 16;
  const sc = key.shadow.camera;
  sc.left = -0.2; sc.right = 0.2; sc.top = 0.22; sc.bottom = -0.22; sc.near = 0.2; sc.far = 3.0;
  group.add(key, key.target);

  const rims = [new THREE.DirectionalLight(), new THREE.DirectionalLight()];
  rims.forEach((r) => group.add(r, r.target));
  const fill = new THREE.DirectionalLight();
  group.add(fill, fill.target);

  let envTex = null;
  function apply(id) {
    const p = LIGHT_PRESETS[id] || LIGHT_PRESETS.softbox;
    key.position.copy(v3(p.key.dir).multiplyScalar(radius));
    key.color.set(p.key.color);
    key.intensity = p.key.intensity;
    // 柔光箱越大，阴影越软
    key.shadow.radius = 3 + 5 * p.key.size;
    fill.position.copy(v3(p.fill.dir).multiplyScalar(radius));
    fill.color.set(p.fill.color);
    fill.intensity = p.fill.intensity;
    rims.forEach((r, i) => {
      const d = p.rim[i];
      r.visible = !!d;
      if (!d) return;
      r.position.copy(v3(d.dir).multiplyScalar(radius));
      r.color.set(d.color);
      r.intensity = d.intensity;
    });
    if (envTex) envTex.dispose();
    envTex = buildStudioEnvironment(renderer, p);
    scene.environment = envTex;
    scene.environmentIntensity = p.envIntensity;
    renderer.toneMappingExposure = p.exposure;
    return p;
  }
  const preset = apply(presetId);
  return { group, key, fill, rims, apply, get preset() { return preset; } };
}

/** 摄影背景布：柔和渐变 + 中心亮斑（背景灯），不是光线方块，仅作背景 */
export function createBackdrop(scene, colors) {
  const mat = new THREE.ShaderMaterial({
    depthWrite: false,
    side: THREE.BackSide,
    uniforms: { cA: { value: new THREE.Color(colors[0]) }, cB: { value: new THREE.Color(colors[1]) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 cA; uniform vec3 cB; varying vec3 vP;
      void main(){ vec3 d = normalize(vP); float spot = smoothstep(1.15, 0.0, length(vec2(d.x*1.1, d.y*1.35 - 0.05) / max(0.2, -d.z+0.6)));
        vec3 c = mix(cB, cA, spot); gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  m.name = 'PhotoBackdrop';
  scene.add(m);
  return {
    mesh: m,
    set(c) { mat.uniforms.cA.value.set(c[0]); mat.uniforms.cB.value.set(c[1]); },
  };
}
