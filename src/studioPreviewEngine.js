import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  buildCollectibleHeadNode,
  applyHeadMorphsToGroup,
  updateCollectibleMaterialsLive,
  updateHeadLifeAnimation,
  triggerCollectibleBlink,
  disposeHeadNode,
  updateMasterStrandHairPxScale
} from './portraitHeadAssembler.js';
import {
  applyBaseRendererSettings,
  isSoftwareRenderer,
  ensureSceneEnvironment,
  buildStudioLightRig,
  applyRenderQualityToEngine,
  applyCustomVisualConfigToEngine,
  updateDynamicLightingOnEngine,
  requestShadowUpdate
} from './photorealLighting.js';
import { createBeautyPostChain } from './beautyPostChain.js';
import { createBokehDust, createStudioBackdrop } from './atmosphere.js';

export class StudioPreviewEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.headNode = null;
    this.autoRotate = false;
    this.currentConfig = null;
    this.clock = new THREE.Clock();
    this.pointerNdc = { x: 0, y: 0 };

    this.lastFrameTime = performance.now();
    this.renderWakeUntil = performance.now() + 2500;
    this.needsShadowRefresh = true;

    this.initScene();
    this.bindPointerTracking();
    this.animate = this.animate.bind(this);
    this.animId = requestAnimationFrame(this.animate);
  }

  wakeRender(durationSeconds = 1.6, refreshShadow = false) {
    const dur = this.softwareRenderer ? Math.min(durationSeconds, 0.16) : durationSeconds;
    const until = performance.now() + dur * 1000;
    if (until > this.renderWakeUntil) {
      this.renderWakeUntil = until;
    }
    if (refreshShadow) {
      this.needsShadowRefresh = true;
    }
  }

  isCanvasVisible() {
    if (!this.canvas || document.hidden) return false;
    if (this.canvas.offsetParent === null) return false;
    return this.canvas.clientWidth > 4 && this.canvas.clientHeight > 4;
  }

  initScene() {
    this.scene = new THREE.Scene();

    const w = this.canvas.clientWidth || 540;
    const h = this.canvas.clientHeight || 480;
    this.camera = new THREE.PerspectiveCamera(32, w / h, 1, 300);
    this.camera.position.set(0, 1.0, 62);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'default',
      stencil: false,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.softwareRenderer = isSoftwareRenderer(this.renderer);
    if (this.softwareRenderer) {
      this.renderWakeUntil = performance.now() + 180;
    }
    this.renderer.localClippingEnabled = true;
    // Stage 39 强明暗发丝投影写实管线：ACES + sRGB + 10:1主补光比 + 落日逆光离线 IBL
    applyBaseRendererSettings(this.renderer, 0.88);
    ensureSceneEnvironment(this.renderer, this.scene, 0.16, 'golden_hour');

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 1.0, 0.5);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    // Allow closer macro zoom (11 cm) for pore/iris/base-stand inspection
    this.controls.minDistance = 11;
    this.controls.maxDistance = 95;
    this.controls.update();
    this.controls.addEventListener('change', () => {
      this.wakeRender(1.2);
    });
    this.controls.addEventListener('start', () => {
      this.wakeRender(2.0);
    });

    // Stage 7 写实 5 点灯阵（主光带柔和阴影 + 底部精细检查灯 + 背部轮廓光）
    this.lightRig = buildStudioLightRig(this.scene);
    this.keyLight = this.lightRig.key;

    // Stage 13a 电影级后期链（辉光 + 唯美调色；异常则回退直渲，永不黑屏）
    this.beautyPost = null;
    this.beautyPostUserEnabled = true;
    try {
      this.beautyPost = createBeautyPostChain(this.renderer, this.scene, this.camera, { width: w, height: h });
      this.beautyPost?.setEnabled(true);
    } catch (err) {
      console.warn('后期链初始化失败，已回退直渲:', err);
      this.beautyPost = null;
    }

    this.visualConfig = {
      presetId: 'cinema_85mm_portrait',
      hdrMode: 'golden_hour',
      windowGobo: 'hair_sun_slit',
      windowGoboStrength: 0.78,
      chiaroscuro: 0.94,
    };
    applyCustomVisualConfigToEngine(this, this.visualConfig);

    // Stage 13b 唯美氛围：背幕光晕 + 少量呼吸尘埃（加色混合，永不遮挡头模）
    this.atmosphere = null;
    this.backdropMesh = null;
    try {
      this.backdropMesh = createStudioBackdrop(150, 110);
      this.backdropMesh.position.set(0, -2, -34);
      this.scene.add(this.backdropMesh);
      this.atmosphere = createBokehDust({
        far: 50, mid: 32, near: 14,
        farSize: 0.9, midSize: 1.5, nearSize: 2.4,
        bounds: { x: [-24, 24], y: [-18, 14], z: [-30, 10] },
      });
      this.scene.add(this.atmosphere.group);
    } catch (err) {
      console.warn('氛围初始化失败，已跳过:', err);
      this.atmosphere = null;
      this.backdropMesh = null;
    }

    // Subtle circular portrait studio reference ring below the C4/C5 neck base-stand
    const gridGeo = new THREE.RingGeometry(5.2, 5.38, 64);
    gridGeo.rotateX(-Math.PI / 2);
    gridGeo.translate(0, -12.75, -0.8);
    const gridMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    });
    this.cutPlaneHelper = new THREE.Mesh(gridGeo, gridMat);
    this.scene.add(this.cutPlaneHelper);
  }

  bindPointerTracking() {
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }
      this.wakeRender(1.2);
    });
    this.canvas.addEventListener('pointerdown', () => {
      this.wakeRender(2.0);
      if (this.headNode) triggerCollectibleBlink(this.headNode);
    });
    this.canvas.addEventListener('wheel', () => {
      this.wakeRender(1.5);
    }, { passive: true });
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
      if (this.beautyPost) this.beautyPost.syncSize(w, h, this.renderer.getPixelRatio());
      this.wakeRender(1.5, true);
    }
  }

  /** Stage 7：三档写实画质（low/medium/high），由设置页统一调度 */
  setRenderQuality(level) {
    const lvl = applyRenderQualityToEngine(this, level);
    if (this.beautyPost) {
      // 流畅档强制关闭后期（省显存保帧率），其余档位跟随用户开关
      this.beautyPost.setEnabled(lvl !== 'low' && this.beautyPostUserEnabled !== false);
    }
    this.resize();
    this.wakeRender(1.5, true);
  }

  /** Stage 13a：用户可随时开关辉光后期（设置页持久化） */
  setBeautyPostEnabled(v) {
    this.beautyPostUserEnabled = v !== false;
    if (this.beautyPost) {
      const lvl = this.currentRenderQuality || 'high';
      this.beautyPost.setEnabled(lvl !== 'low' && this.beautyPostUserEnabled);
    }
    this.wakeRender(1.2);
  }

  applyVisualCustomConfig(cfg = {}) {
    this.visualConfig = { ...(this.visualConfig || {}), ...cfg };
    applyCustomVisualConfigToEngine(this, this.visualConfig);
  }

  /** Stage 13b：用户可随时开关氛围（尘埃 + 背幕光晕，设置页持久化） */
  setAtmosphereEnabled(v) {
    const on = v !== false;
    if (this.atmosphere) this.atmosphere.group.visible = on;
    if (this.backdropMesh) this.backdropMesh.visible = on;
    this.wakeRender(1.2);
  }

  async loadOrRebuild(config) {
    const request = (this.loadRequest || 0) + 1;
    this.loadRequest = request;
    const previousGroomId = this.headNode?.userData?.groomStats?.id;
    this.currentConfig = JSON.parse(JSON.stringify(config));
    if (config.photoElement) {
      this.currentConfig.photoElement = config.photoElement;
    }

    // Curved hair has large geometry. Release the previous built-in preview
    // before constructing its replacement; external import still stays atomic.
    if (!config.customModelUrl && this.headNode?.userData?.groomStats) {
      disposeHeadNode(this.headNode); this.headNode = null;
      this.renderer.renderLists.dispose();
      await new Promise(resolve => setTimeout(resolve, 16));
      if (request !== this.loadRequest) return this.headNode;
    }
    const newNode = await buildCollectibleHeadNode({ ...this.currentConfig, groomLod: 'studio', groomSoftware: this.softwareRenderer });
    if (request !== this.loadRequest) { disposeHeadNode(newNode); return this.headNode; }
    disposeHeadNode(this.headNode);
    this.headNode = newNode;
    this.scene.add(this.headNode);
    if (this.visualConfig) {
      applyCustomVisualConfigToEngine(this, this.visualConfig);
    }
    const newGroomId = this.headNode.userData?.groomStats?.id;
    if (newGroomId !== previousGroomId && (newGroomId === 'groom_center_long' || previousGroomId === 'groom_center_long')) this.setCameraPreset('front');
    this.updateCutHelperPosition(config.morphs);
    this.wakeRender(2.0, true);
    return newNode;
  }

  /**
   * Real-time 32-channel morph slider update on the GLB meshes
   */
  updateMorphsFast(morphs = {}) {
    if (!this.headNode) return;
    applyHeadMorphsToGroup(this.headNode, morphs);
    this.updateCutHelperPosition(morphs);
    this.wakeRender(1.4, true);
  }

  /**
   * Stage 36: Zero-latency live GPU material/color/makeup/pore/eye/photo-projection update
   */
  updateMaterialsFast(patch = {}) {
    if (!this.headNode) return;
    updateCollectibleMaterialsLive(this.headNode, patch);
    this.wakeRender(1.4, false);
  }

  updateCutHelperPosition(morphs = {}) {
    if (!this.cutPlaneHelper) return;
    this.cutPlaneHelper.position.y = (morphs.cutHeightOffset || 0) * 0.35;
    this.cutPlaneHelper.rotation.x = ((morphs.cutTiltPitch || 0) * Math.PI) / 180;
    this.cutPlaneHelper.rotation.z = -((morphs.cutTiltRoll || 0) * Math.PI) / 180;
  }

  setCameraPreset(preset) {
    this.autoRotate = false;
    const longHair = this.headNode?.userData?.groomStats?.id === 'groom_center_long';
    if (preset === 'front') {
      this.camera.position.set(0, 1.0, 62);
      this.controls.target.set(0, 1.0, 0.5);
    } else if (preset === 'three_quarter') {
      this.camera.position.set(22, 1.5, 56);
      this.controls.target.set(0, 1.0, 0.5);
    } else if (preset === 'base_view') {
      // Dramatic upward inspection view directly looking at the C4/C5 Medical structural Neck base-stand!
      this.camera.position.set(0, -34, 15);
      this.controls.target.set(0, -12.2, -0.8);
    } else if (preset === 'profile') {
      this.camera.position.set(60, 1.2, 0.5);
      this.controls.target.set(0, 1.0, 0.5);
    } else if (preset === 'turntable') {
      this.camera.position.set(22, 1.5, 58);
      this.controls.target.set(0, 1.0, 0.5);
      this.autoRotate = true;
    }
    if (longHair && preset !== 'base_view') {
      this.camera.position.multiplyScalar(1.35);
      this.camera.position.y = -6;
      this.controls.target.y = -6;
    }
    this.controls.update();
    this.wakeRender(2.0, true);
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate);

    // Stage 22 Zero-Fan-Roar Fix: skip completely when Studio tab or Software window is hidden -> 0% GPU!
    if (!this.isCanvasVisible()) {
      this.lastFrameTime = performance.now();
      return;
    }

    const now = performance.now();
    const dynMode = this._activeVisualState?.dynamicLightMode || 'sunset_cloud_drift';
    const hasDynLight = !this.softwareRenderer && dynMode !== 'static_locked' && Number(this._activeVisualState?.dynamicLightSpeed ?? 1.0) > 0.001;
    const isIdle = !this.autoRotate && now > this.renderWakeUntil;
    const elapsedMs = now - this.lastFrameTime;
    // Cap Studio Preview at ~60 FPS when active, ~28 FPS when in ambient dynamic-light drift
    const minIntervalMs = this.softwareRenderer ? 220.0 : (isIdle && hasDynLight ? 35.0 : 15.5);
    if (elapsedMs < minIntervalMs) return;
    const dt = Math.min(0.05, elapsedMs / 1000);
    this.lastFrameTime = now;

    if (isIdle && !hasDynLight) {
      return;
    }

    const elapsed = this.clock.getElapsedTime();
    updateDynamicLightingOnEngine(this, elapsed);
    if (this.headNode) {
      if (this.autoRotate) {
        this.headNode.rotation.y += dt * 0.65;
        this.needsShadowRefresh = true;
      } else if (Math.abs(this.headNode.rotation.y) > 0.0005) {
        this.headNode.rotation.y *= 0.92;
        this.needsShadowRefresh = true;
      }
      updateHeadLifeAnimation(this.headNode, dt, this.pointerNdc.x * 0.65, this.pointerNdc.y * 0.55);
    }
    this.controls.update();
    if (this.atmosphere && this.atmosphere.group.visible) {
      this.atmosphere.update(dt, elapsed);
    }
    if (this.needsShadowRefresh) {
      requestShadowUpdate(this.renderer);
      this.needsShadowRefresh = false;
    }
    updateMasterStrandHairPxScale(this.scene, this.renderer, this.camera);
    if (this.beautyPost && this.beautyPost.enabled && !this.softwareRenderer) {
      this.beautyPost.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    if (this.softwareRenderer) {
      this.renderWakeUntil = 0;
    }
  }
}
