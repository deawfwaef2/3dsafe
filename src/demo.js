import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createStudioRig, createBackdrop, LIGHT_PRESETS } from './studioLighting.js';
import { upgradeSkinMaterial, setSkinParams } from './skinMaterial.js';
import {
  upgradeEyeMaterial,
  upgradeLashMaterial,
  upgradeBrowMaterial,
  buildHairMaterials,
  applyHairColor,
} from './featureMaterials.js';
import { createPostChain } from './postChain.js';
import { createBeautyPostChain, FILM_LUT_CATALOG } from './beautyPostChain.js';
import {
  VISUAL_STYLE_PRESETS,
  createSkinGradingUniforms,
  injectAestheticSubsurfaceScattering,
} from './photorealLighting.js';
import { createDisplayStand } from './displayStand.js';
import {
  generateStrands,
  createStrandMaterial,
  setStrandParams,
  morphedHeadSoup,
  alphaSamplerFromTexture,
  scalpDistanceAttribute,
} from './strandHair.js';
import { DEFAULT_HAIR_EDIT_STATE, applyHairEditToGeometry } from './hairEditor.js';

const HAIRS = [
  { id: 'hair_user_photo', label: '碎刘海高扎马尾', url: '/models/hair_user_photo.glb' },
  { id: 'hair_bob01', label: '空气刘海内扣短波波', url: '/models/hair_bob01.glb' },
  { id: 'daz_hair_low_chignon', label: '中分温婉低盘发髻', url: '/models/daz_hair_low_chignon.glb' },
  { id: 'hair_long01', label: '八字刘海柔顺黑长直', url: '/models/hair_long01.glb' },
  { id: 'daz_hair_hime', label: '齐刘海姬发式公主切', url: '/models/daz_hair_hime.glb' },
  { id: 'daz_hair_curtain_wave', label: '八字刘海蓬松大波浪', url: '/models/daz_hair_curtain_wave.glb' },
  { id: 'daz_hair_sport_ponytail', label: '高扎活力运动马尾', url: '/models/daz_hair_sport_ponytail.glb' },
  { id: 'daz_hair_twin_buns', label: '高颅顶双丸子头', url: '/models/daz_hair_twin_buns.glb' },
  { id: 'daz_hair_twin_braids', label: '学院风双麻花垂辫', url: '/models/daz_hair_twin_braids.glb' },
  { id: 'hair_braid01', label: '古典侧分盘发', url: '/models/hair_braid01.glb' },
];

const qs = new URLSearchParams(location.search);
const state = {
  mode: qs.get('mode') || 'after',
  postPipeline: qs.get('post') || 'beauty',
  skinPipeline: qs.get('skinpipe') || 'preintegrated',
  visualStyle: qs.get('style') || Object.keys(VISUAL_STYLE_PRESETS)[0],
  filmLut: qs.get('lut') || FILM_LUT_CATALOG[0].id,
  light: qs.get('light') || 'softbox',
  view: qs.get('view') || 'front',
  hair: qs.get('hair') || HAIRS[0].id,
  skin: qs.get('skin') || 'cn_scholar_natural',
  hairColor: 'natural',
  brow: qs.get('brow') || 'eyebrow010',
  hairMode: qs.get('hairmode') || 'strand',
  density: qs.get('density') || 'mid',
};

const hairEditState = { ...DEFAULT_HAIR_EDIT_STATE };

const HAIR_COLORS = {
  natural: { label: '自然黑棕', rgb: [0.025, 0.018, 0.015] },
  black:   { label: '纯正乌黑', rgb: [0.016, 0.013, 0.012] },
  brown:   { label: '温柔栗棕', rgb: [0.085, 0.045, 0.028] },
  tea:     { label: '冷调奶茶棕', rgb: [0.200, 0.120, 0.075] },
};

const DENSITY = {
  low:   { label: '流畅（约 2 万根）', guides: 1500, childrenPerGuide: 10, fuzzPerGuide: 1.0 },
  mid:   { label: '标准（约 5 万根）', guides: 2600, childrenPerGuide: 17, fuzzPerGuide: 1.6 },
  high:  { label: '高精（约 9 万根）', guides: 3200, childrenPerGuide: 26, fuzzPerGuide: 2.2 },
  ultra: { label: '极致（约 15 万根）', guides: 3800, childrenPerGuide: 38, fuzzPerGuide: 3.0 },
};

const VIEWS = {
  front:        { pos: [0, 0.012, 1.05],   target: [0, 0.005, 0],     fov: 15 },
  threequarter: { pos: [-0.62, 0.05, 0.85], target: [0, 0.008, 0.01],  fov: 15 },
  profile:      { pos: [-1.05, 0.02, 0.06], target: [0, 0.005, 0],     fov: 15 },
  closeup:      { pos: [-0.1, 0.03, 0.52],  target: [0, 0.018, 0.05],  fov: 13 },
  hairdetail:   { pos: [-0.62, 0.1, 0.85],  target: [-0.025, 0.02, 0], fov: 8.5 },
  stand:        { pos: [0.55, 0.12, 1.25],  target: [0, -0.06, 0],     fov: 22 },
};

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.05, 30);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 0.25;
controls.maxDistance = 2.4;
controls.maxPolarAngle = Math.PI * 0.65;

let rig = null, backdrop = null, gtaoPost = null, beautyPost = null, basicLights = null;
const head = new THREE.Group();
scene.add(head);
let builtinSkinPre = null, builtinSkinDermis3D = null;
const dermisUniforms = createSkinGradingUniforms();
let parts = {}, hairMeshes = [], hairMats = null, skinMat = null;
const origMats = new Map();
const skinTextures = {};
const browCache = {};
const strandCache = new Map();
let strandMesh = null, strandMat = null, hairCards = null, gltfHead = null;
let strandBasePositions = null, cardBasePositions = null;

const $ = (id) => document.getElementById(id);
const loader = new GLTFLoader();

function loadGlbUrl(url) {
  return new Promise((res, rej) => loader.load(url, res, undefined, rej));
}

function setView(id) {
  const v = VIEWS[id] || VIEWS.front;
  camera.position.set(...v.pos);
  camera.fov = v.fov;
  camera.updateProjectionMatrix();
  controls.target.set(...v.target);
  controls.update();
}

async function loadSkinTexture(name) {
  if (skinTextures[name]) return skinTextures[name];
  const ex = gltfHead.parser.json.extras?.realWebAssets?.skins?.[name];
  if (!ex) return null;
  const bv = await gltfHead.parser.getDependency('bufferView', ex.bufferView);
  const bmp = await createImageBitmap(new Blob([bv], { type: ex.mimeType }));
  const tex = new THREE.Texture(bmp);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  skinTextures[name] = tex;
  return tex;
}

async function decodeExtraTexture(info) {
  const bv = await gltfHead.parser.getDependency('bufferView', info.bufferView);
  const bmp = await createImageBitmap(new Blob([bv], { type: info.mimeType }));
  const tex = new THREE.Texture(bmp);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

async function applyBrow(id) {
  const info = gltfHead.parser.json.extras?.realWebAssets?.eyebrows?.[id];
  const mesh = parts.brows;
  if (!info || !mesh) return;
  if (!browCache[id]) browCache[id] = await decodeExtraTexture(info);
  const g = mesh.geometry;
  if (info.pos && g.attributes.position.array.length === info.pos.length) {
    const out = g.attributes.position.array;
    for (let i = 0; i < info.pos.length; i += 3) {
      out[i] = info.pos[i];
      out[i + 1] = info.pos[i + 1];
      out[i + 2] = info.pos[i + 2] + 0.00025;
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
  }
  if (info.uv && g.attributes.uv.array.length === info.uv.length) {
    g.attributes.uv.array.set(info.uv);
    g.attributes.uv.needsUpdate = true;
  }
  origMats.get(mesh).map = browCache[id];
  if (mesh.userData.after) {
    mesh.userData.after.map = browCache[id];
    mesh.userData.after.needsUpdate = true;
  }
}

async function loadHead() {
  gltfHead = await loadGlbUrl('/models/daz_asian_head_base.glb');
  const root = gltfHead.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    origMats.set(o, o.material);
    o.castShadow = true;
    o.receiveShadow = true;
    const n = o.name;
    if (n.startsWith('HeadSkin')) parts.skin = o;
    else if (n.startsWith('NeckStandCap')) o.visible = false;
    else if (n.startsWith('Eyebrows')) parts.brows = o;
    else if (n.startsWith('Eyelashes')) parts.lashes = o;
    else if (n.startsWith('Eyes')) (parts.eyes ||= []).push(o);
    else if (n.startsWith('Teeth') || n.startsWith('Tongue')) (parts.mouth ||= []).push(o);
  });
  root.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary) return;
    o.morphTargetInfluences.fill(0);
    const i = o.morphTargetDictionary.mh_head_asian_youth;
    if (i != null) o.morphTargetInfluences[i] = 0.65;
  });
  head.add(root);
  await applyBrow(state.brow);
}

function updateHairEditDeformation() {
  if (hairCards?.geom && cardBasePositions) {
    applyHairEditToGeometry(hairCards.geom, cardBasePositions, hairEditState);
  }
  if (strandMesh?.geometry && strandBasePositions) {
    applyHairEditToGeometry(strandMesh.geometry, strandBasePositions, hairEditState);
  }
}

async function loadHair(id) {
  for (const m of hairMeshes) m.parent?.remove(m);
  hairMeshes = [];
  const h = HAIRS.find((x) => x.id === id) || HAIRS[0];
  const g = await loadGlbUrl(h.url);
  let srcMesh = null;
  g.scene.traverse((o) => { if (o.isMesh && !srcMesh) srcMesh = o; });
  if (!srcMesh) return;
  const geom = srcMesh.geometry;
  cardBasePositions = new Float32Array(geom.attributes.position.array);
  const orig = srcMesh.geometry && srcMesh.material;
  hairMats = buildHairMaterials(orig);
  applyHairColor(hairMats, HAIR_COLORS[state.hairColor].rgb);
  const core = new THREE.Mesh(geom, state.mode === 'after' ? hairMats.core : orig);
  core.castShadow = true;
  core.receiveShadow = true;
  core.userData.orig = orig;
  core.userData.after = hairMats.core;
  const tips = new THREE.Mesh(geom, hairMats.tips);
  tips.renderOrder = 2;
  tips.receiveShadow = true;
  tips.visible = state.mode === 'after';
  tips.userData.afterOnly = true;
  srcMesh.updateWorldMatrix(true, false);
  for (const m of [core, tips]) {
    m.applyMatrix4(srcMesh.matrixWorld);
    head.add(m);
    hairMeshes.push(m);
  }
  hairCards = { core, tips, srcMesh, orig, geom, id: h.id };
  if (strandMesh) {
    strandMesh.parent?.remove(strandMesh);
    strandMesh = null;
  }
  if (state.hairMode === 'strand') await buildStrands();
  updateHairEditDeformation();
}

async function buildStrands() {
  if (!hairCards) return;
  const key = hairCards.id + '|' + state.density;
  $('loading').style.display = 'grid';
  $('loading').textContent = '正在生成真发丝（' + DENSITY[state.density].label + '）…';
  await new Promise((r) => setTimeout(r, 25));
  let res = strandCache.get(key);
  if (!res) {
    const alphaAt = alphaSamplerFromTexture(hairCards.orig.map);
    const headSoup = morphedHeadSoup(parts.skin, true);
    hairCards.srcMesh.updateWorldMatrix(true, false);
    res = generateStrands(hairCards.geom, hairCards.srcMesh.matrixWorld, alphaAt, headSoup, DENSITY[state.density]);
    if (!hairCards.geom.attributes.aScalpD) scalpDistanceAttribute(hairCards.geom, hairCards.srcMesh.matrixWorld, headSoup);
    res.basePositions = new Float32Array(res.geometry.attributes.position.array);
    strandCache.set(key, res);
  }
  strandBasePositions = res.basePositions;
  if (!strandMat) strandMat = createStrandMaterial(res.headCenter);
  strandMat.userData.strandUniforms.uHeadCenter.value.set(...res.headCenter);
  setStrandParams(strandMat, { color: HAIR_COLORS[state.hairColor].rgb });
  if (strandMesh) strandMesh.parent?.remove(strandMesh);
  strandMesh = new THREE.Mesh(res.geometry, strandMat);
  strandMesh.castShadow = false;
  strandMesh.receiveShadow = true;
  strandMesh.frustumCulled = false;
  strandMesh.renderOrder = 1;
  head.add(strandMesh);
  updateHairEditDeformation();
  $('loading').style.display = 'none';
}

function applyVisualStylePreset(styleKey) {
  const preset = VISUAL_STYLE_PRESETS[styleKey];
  if (!preset || !beautyPost) return;
  beautyPost.applyGrading({
    contrast: preset.contrast ?? 1.04,
    saturation: preset.saturation ?? 1.02,
    warmth: preset.warmth ?? 0.0,
    vignette: preset.vignette ?? 0.16,
    filmGrain: preset.filmGrain ?? 0.025,
    sharpen: preset.sharpen ?? 0.25,
    bloomStrength: preset.bloomStrength ?? 0.14,
    softFocus: preset.softFocus ?? 0.18,
    depthBlur: preset.depthBlur ?? 0.15,
    dappledBokeh: preset.dappledBokeh ?? 0.0,
    tyndall: preset.tyndall ?? 0.0,
    halation: preset.halation ?? 0.15,
    filmLutMode: preset.filmLutMode ?? 1,
    filmLutStrength: preset.filmLutStrength ?? 0.65,
  });
}

async function applyMode() {
  const after = state.mode === 'after';
  const tex = await loadSkinTexture(state.skin);
  const skinOrig = origMats.get(parts.skin);
  if (tex) skinOrig.map = tex;
  if (after) {
    if (!builtinSkinPre) builtinSkinPre = upgradeSkinMaterial(skinOrig);
    if (!builtinSkinDermis3D) {
      builtinSkinDermis3D = new THREE.MeshPhysicalMaterial({
        map: tex || skinOrig.map,
        roughness: 0.48,
        metalness: 0.0,
        ior: 1.42,
        specularIntensity: 0.72,
        clearcoat: 0.08,
        clearcoatRoughness: 0.3,
        sheen: 0.12,
        sheenColor: new THREE.Color(0xffe4d6),
        sheenRoughness: 0.55,
        morphTargets: true,
        morphNormals: true,
      });
      injectAestheticSubsurfaceScattering(builtinSkinDermis3D, dermisUniforms);
    }
    const activeSkin = state.skinPipeline === 'dermis3d' ? builtinSkinDermis3D : builtinSkinPre;
    activeSkin.map = tex || skinOrig.map;
    activeSkin.needsUpdate = true;
    parts.skin.material = activeSkin;
    skinMat = activeSkin;
  } else {
    skinOrig.needsUpdate = true;
    parts.skin.material = skinOrig;
  }
  for (const e of parts.eyes || []) {
    const o = origMats.get(e);
    e.material = after ? (e.userData.after ||= upgradeEyeMaterial(o)) : o;
    if (after && o.name.toLowerCase().includes('cornea')) e.castShadow = false;
  }
  if (parts.lashes) {
    const o = origMats.get(parts.lashes);
    parts.lashes.material = after ? (parts.lashes.userData.after ||= upgradeLashMaterial(o)) : o;
  }
  if (parts.brows) {
    const o = origMats.get(parts.brows);
    parts.brows.material = after ? (parts.brows.userData.after ||= upgradeBrowMaterial(o)) : o;
    parts.brows.castShadow = false;
  }

  const strandOn = after && state.hairMode === 'strand';
  for (const m of hairMeshes) {
    if (m.userData.afterOnly) m.visible = after && !strandOn;
    else m.material = after ? m.userData.after : m.userData.orig;
  }
  if (strandMesh) strandMesh.visible = strandOn;
  if (hairMats) {
    hairMats.shared.uScalpFade.value = strandOn ? 0.010 : 0.0;
    hairMats.shared.uInset.value = strandOn ? 0.0025 : 0.0;
    hairMats.core.alphaTest = strandOn ? 0.62 : 0.45;
    hairMats.core.color.setRGB(...HAIR_COLORS[state.hairColor].rgb.map((v) => v * (strandOn ? 0.3 : 1)));
  }

  renderer.shadowMap.enabled = after;
  if (after) {
    if (basicLights) basicLights.visible = false;
    if (!rig) rig = createStudioRig(scene, renderer, state.light);
    rig.group.visible = true;
    const p = rig.apply(state.light);
    if (!backdrop) backdrop = createBackdrop(scene, p.backdrop);
    backdrop.set(p.backdrop);
    backdrop.mesh.visible = true;
    scene.background = null;
    renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping;
    if (!gtaoPost) gtaoPost = createPostChain(renderer, scene, camera);
    if (!beautyPost) {
      beautyPost = createBeautyPostChain(renderer, scene, camera, window.innerWidth, window.innerHeight);
      applyVisualStylePreset(state.visualStyle);
    }
  } else {
    if (rig) rig.group.visible = false;
    if (backdrop) backdrop.mesh.visible = false;
    scene.environment = null;
    scene.background = new THREE.Color(0x1b1e24);
    if (!basicLights) {
      basicLights = new THREE.Group();
      basicLights.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
      const d = new THREE.DirectionalLight(0xffffff, 1.8);
      d.position.set(0.4, 0.6, 1);
      basicLights.add(d);
      scene.add(basicLights);
    }
    basicLights.visible = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
  }
  renderer.shadowMap.needsUpdate = true;
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  $('btnMode').textContent = state.mode === 'after' ? '✨ 唯美渲染管线：开启（点击对比原始效果）' : '⬜ 原始渲染（点击开启唯美管线）';
}

function fillSelect(el, items, val) {
  el.innerHTML = items.map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${l}</option>`).join('');
}

function bindUI() {
  fillSelect($('selVisualStyle'), Object.entries(VISUAL_STYLE_PRESETS).map(([k, v]) => [k, v.label || k]), state.visualStyle);
  fillSelect($('selFilmLut'), FILM_LUT_CATALOG.map((item) => [item.id, item.label]), state.filmLut);
  fillSelect($('selLight'), Object.entries(LIGHT_PRESETS).map(([k, v]) => [k, v.label]), state.light);
  fillSelect($('selHair'), HAIRS.map((h) => [h.id, h.label]), state.hair);
  fillSelect($('selHairColor'), Object.entries(HAIR_COLORS).map(([k, v]) => [k, v.label]), state.hairColor);
  const skins = Object.keys(gltfHead.parser.json.extras?.realWebAssets?.skins || {});
  const SKIN_LABELS = {
    cn_scholar_natural: '自然素颜',
    cn_porcelain_ivory: '瓷白奶油肌',
    kr_dewy_peach: '水光蜜桃',
    kr_firstlove_camellia: '初恋山茶',
    cn_jiangnan_jade: '江南温玉',
    kr_chaebol_cool: '清冷白皙',
    cn_intellectual_olive: '知性暖调',
    eurasian_velvet_rose: '玫瑰丝绒',
  };
  fillSelect($('selSkin'), skins.filter((s) => SKIN_LABELS[s]).map((s) => [s, SKIN_LABELS[s]]), state.skin);
  const BROW_LABELS = {
    eyebrow010: '自然野生毛流眉',
    eyebrow003: '古典柳叶眉',
    eyebrow001: '韩系平直眉',
    eyebrow002: '温柔细弯眉',
    eyebrow004: '标准柔雾眉',
    eyebrow005: '精致细眉',
    eyebrow008: '立体浓眉',
    eyebrow012: '原生绒毛眉',
  };
  fillSelect($('selBrow'), Object.keys(gltfHead.parser.json.extras?.realWebAssets?.eyebrows || {}).map((b) => [b, BROW_LABELS[b] || b]), state.brow);
  fillSelect($('selView'), [
    ['front', '正面肖像写真'],
    ['threequarter', '3/4 唯美侧颜'],
    ['profile', '正侧轮廓'],
    ['closeup', '眼妆与眉睫微距特写'],
    ['hairdetail', '刘海与发丝光泽微距'],
    ['stand', '半身肖像全景'],
  ], state.view);
  fillSelect($('selHairMode'), [['strand', '3D 真发丝模式'], ['card', '传统发片模式 (对比)']], state.hairMode);
  fillSelect($('selDensity'), Object.entries(DENSITY).map(([k, v]) => [k, v.label]), state.density);

  $('selPostPipeline').value = state.postPipeline;
  $('selSkinPipeline').value = state.skinPipeline;

  $('btnMode').onclick = () => { state.mode = state.mode === 'after' ? 'before' : 'after'; applyMode(); };
  $('selPostPipeline').onchange = (e) => { state.postPipeline = e.target.value; };
  $('selSkinPipeline').onchange = async (e) => { state.skinPipeline = e.target.value; await applyMode(); };
  $('selVisualStyle').onchange = (e) => { state.visualStyle = e.target.value; applyVisualStylePreset(state.visualStyle); };
  $('selFilmLut').onchange = (e) => {
    state.filmLut = e.target.value;
    const item = FILM_LUT_CATALOG.find((x) => x.id === state.filmLut);
    if (item && beautyPost) beautyPost.applyGrading({ filmLutMode: item.modeInt, filmLutStrength: 0.78 });
  };
  $('selLight').onchange = (e) => { state.light = e.target.value; if (state.mode === 'after') { const p = rig.apply(state.light); backdrop.set(p.backdrop); } };
  $('selView').onchange = (e) => { state.view = e.target.value; setView(state.view); };
  $('selHair').onchange = async (e) => { state.hair = e.target.value; await loadHair(state.hair); applyMode(); };
  $('selHairMode').onchange = async (e) => { state.hairMode = e.target.value; if (state.hairMode === 'strand' && !strandMesh) await buildStrands(); applyMode(); };
  $('selDensity').onchange = async (e) => { state.density = e.target.value; if (state.hairMode === 'strand') await buildStrands(); applyMode(); };
  $('selHairColor').onchange = (e) => {
    state.hairColor = e.target.value;
    applyHairColor(hairMats, HAIR_COLORS[state.hairColor].rgb);
    if (strandMat) setStrandParams(strandMat, { color: HAIR_COLORS[state.hairColor].rgb });
    applyMode();
  };
  $('selBrow').onchange = async (e) => { state.brow = e.target.value; await applyBrow(state.brow); };
  $('selSkin').onchange = async (e) => { state.skin = e.target.value; await applyMode(); };

  const slider = (id, fn) => {
    const el = $(id), out = $(id + 'O');
    const f = () => { out.textContent = (+el.value).toFixed(2); fn(+el.value); };
    el.oninput = f;
    f();
  };
  slider('sBangsLen', (v) => { hairEditState.bangsLength = v; updateHairEditDeformation(); });
  slider('sBangsPart', (v) => { hairEditState.bangsParting = v; updateHairEditDeformation(); });
  slider('sCrownVol', (v) => { hairEditState.crownVolume = v; updateHairEditDeformation(); });
  slider('sSideburns', (v) => { hairEditState.sideburnsLength = v; updateHairEditDeformation(); });
  slider('sCurl', (v) => { hairEditState.curlAmount = v; updateHairEditDeformation(); });
  slider('sWind', (v) => { hairEditState.windBreeze = v; updateHairEditDeformation(); });

  slider('sScatter', (v) => {
    if (builtinSkinPre) setSkinParams(builtinSkinPre, { scatter: v });
    if (dermisUniforms.uSssIntensity) dermisUniforms.uSssIntensity.value = v * 0.45;
  });
  slider('sRough', (v) => {
    if (builtinSkinPre) setSkinParams(builtinSkinPre, { roughness: v });
    if (builtinSkinDermis3D) builtinSkinDermis3D.roughness = v;
  });
  slider('sPore', (v) => {
    if (builtinSkinPre) setSkinParams(builtinSkinPre, { normalScale: v });
    if (dermisUniforms.uPoreReliefGlobal) dermisUniforms.uPoreReliefGlobal.value = v * 0.65;
  });
  slider('sHairShine', (v) => strandMat && setStrandParams(strandMat, { gainR: 1.15 * v, gainTRT: 1.8 * v }));
  slider('sHairBack', (v) => strandMat && setStrandParams(strandMat, { gainTT: v }));
  slider('sSoftFocus', (v) => beautyPost && beautyPost.applyGrading({ softFocus: v }));
  slider('sDepthBlur', (v) => beautyPost && beautyPost.applyGrading({ depthBlur: v }));
  slider('sDappled', (v) => beautyPost && beautyPost.applyGrading({ dappledBokeh: v }));
  slider('sTyndall', (v) => beautyPost && beautyPost.applyGrading({ tyndall: v }));
  slider('sHalation', (v) => beautyPost && beautyPost.applyGrading({ halation: v }));
  slider('sSharp', (v) => {
    gtaoPost?.set({ sharpen: v });
    beautyPost?.applyGrading({ sharpen: v });
  });
  slider('sGrain', (v) => {
    gtaoPost?.set({ grain: v });
    beautyPost?.applyGrading({ filmGrain: v });
  });
  slider('sExpo', (v) => { renderer.toneMappingExposure = v; });

  $('btnShot').onclick = () => {
    const a = document.createElement('a');
    a.download = `portrait_${state.view}_${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  $('panelToggle').onclick = () => document.body.classList.toggle('hidepanel');
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  gtaoPost?.setSize(window.innerWidth, window.innerHeight);
  beautyPost?.resize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const _dbs = new THREE.Vector2();
function startLoop() {
  renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    controls.update();
    if (strandMat) {
      const hpx = renderer.getDrawingBufferSize(_dbs).y;
      setStrandParams(strandMat, { pxScale: (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, hpx) });
    }
    if (state.mode === 'after') {
      if (state.postPipeline === 'beauty' && beautyPost) {
        if (beautyPost.gradePass?.uniforms?.uTime) beautyPost.gradePass.uniforms.uTime.value = elapsed;
        beautyPost.composer.render();
      } else if (gtaoPost) {
        gtaoPost.render(elapsed);
      } else {
        renderer.render(scene, camera);
      }
    } else {
      renderer.render(scene, camera);
    }
    window.__READY__ = true;
  });
}

async function boot() {
  try {
    await loadHead();
    await loadHair(state.hair);
    head.add(createDisplayStand(parts.skin));
    setView(state.view);
    await applyMode();
    bindUI();
    $('loading').style.display = 'none';
    startLoop();
  } catch (err) {
    console.error(err);
    $('loading').textContent = '加载失败：' + (err?.message || err);
  }
}
boot();
