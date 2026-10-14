================================================================================
3D 唯美亚洲人像与造型沙箱 · 渲染管线整合、性能优化与画质拔高说明 (HANDOFF.txt)
================================================================================

一、项目现状与完整模块清单
--------------------------------------------------------------------------------
这是一个基于 Three.js (WebGL2) 的 **3D 唯美亚洲女生人像写真、发型编辑器、眉睫美妆与电影级后处理滤镜沙箱**。
目前 `src/` 目录下已经放入了项目现有的全部渲染管线、两套后处理系统、30+ 画风与胶片滤镜预设、两套布光与皮肤着色器、以及多套头发生成与发型编辑模块：

【1. 后处理、画风效果与唯美滤镜管线】
  - `src/beautyPostChain.js`  —— 全栈电影光学后处理链（27+ 实时特效：8 款胶片 LUT `FILM_LUT_CATALOG`、17-Tap 黑柔镜柔焦 `uSoftFocus`、85mm 景深 `uDepthBlur`、旋焦散景 `uSwirlyBokeh`、逆光眩光 `uSunFlareVeil`、树影斑驳散景 `uDappledBokeh`、丁达尔体积光 `uTyndall`、变形宽银幕拉丝 `uAnamorphicFlare`、卤化银红晕 `uHalation`、屏幕空间真皮散射扩散 `uSssBlur`、局部微反差 `uMicroContrast`、漏光、水雾、色散、CAS 锐化等）
  - `src/postChain.js`        —— 轻量级 GTAO 环境光遮蔽 + CAS 锐化 + 胶片颗粒后处理链
  - `src/styleModules.js`     —— 摄影布光、克制调色、皮肤光响应、微毛孔与哑光组合模块 (`STYLE_MODULES`)
  - `src/visualRepair.js`     —— 材质与曝光自动校准辅助模块

【2. 渲染管线、真人光影与亚洲皮肤/五官材质】
  - `src/photorealLighting.js`—— 主工程全套光影与画风系统（含 30+ 唯美画风预设 `VISUAL_STYLE_PRESETS`、HDR 环境目录 `HDR_ENVIRONMENT_CATALOG`、百叶窗/树影光斑 `WINDOW_GOBO_CATALOG`、动态流转光影 `DYNAMIC_LIGHT_MODES`、以及 3D 真皮微米毛孔 + 双瓣次表面散射着色器 `injectAestheticSubsurfaceScattering`）
  - `src/studioLighting.js`   —— 虚拟摄影棚柔光箱 PMREM 实时烘焙与 4 套肖像布光预设 (`LIGHT_PRESETS`)
  - `src/skinMaterial.js`     —— Penner 屏幕空间曲率预积分次表面散射（Pre-Integrated SSS）皮肤材质
  - `src/featureMaterials.js` —— 双层眼球（角膜高光不透明度保留 + 暖调巩膜）、眉毛邻域柔化、睫毛与发片材质
  - `src/skinTextureGenerator.js` —— 程序化皮肤微毛孔/法线/粗糙度纹理生成
  - `src/atmosphere.js`       —— 空气微尘与氛围光效
  - `src/eastAsianHeadAndEyeTargets.js` —— 东亚女性面部骨相与眼型 MorphTarget 参数

【3. 真发丝渲染与 3D 发型编辑器系统】
  - `src/strandHair.js`       —— 发片转 3D 真发丝生成管线（Card-to-Strand 双向流场追踪、两级成簇、飞发/胎毛、体素 AO 与 Marschner 三瓣发丝着色器）
  - `src/hairEditor.js`       —— 实时 3D 发型造型编辑器（刘海长短、八字分缝、高颅顶蓬松度、两侧鬓角/公主切、发尾卷度、微风吹拂）
  - `src/hairBuilder.js`      —— 模块化程序发型生成器（刘海、颅顶、后发、鬓角、呆毛、麻花辫、丸子头、马尾）
  - `src/hairGeometry.js`     —— 发束几何生成工具
  - `src/curveGroom.js`       —— 3D 样条曲线毛发梳理系统
  - `src/hairKajiyaKay.js`    —— Kajiya-Kay / Marschner 各向异性发丝高光着色器
  - `src/hairScalpFit.js`     —— 头皮贴合与防穿模包裹算法
  - `src/hairCardSubdivision.js` —— 发片 Catmull-Rom 曲面细分平滑
  - `src/artistHairLighting.js`  —— 艺术家发型轮廓光与补光增强
  - `src/hairStrandTexture.js`   —— 程序化发丝透明通道与法线纹理合成

【4. 完整人像与发型总装器及预览引擎（主工程实际运行的核心组装管线）】
  - `src/portraitHeadAssembler.js` —— 完整人像头模与 28 款发型总装管线（含 `HIGH_POLY_HAIR_CATALOG`、模块化刘海/颅顶/发尾拼接 `loadModularDonorMeshes`、发型精调变形 `applyArtistHairFineTuning`、实时发型设计更新 `updateHairDesignOnGroup`、发根阴影帽 `buildScalpRootShadowCap`、眉毛/皮肤/眼部切换与实时材质更新 `updateCollectibleMaterialsLive`）
  - `src/studioPreviewEngine.js`   —— 摄影棚 3D 预览引擎（整合 5 点灯阵、动态流转光影、窗影光斑、`beautyPostChain` 后处理、呼吸微尘氛围与眨眼微表情动画）
  - `src/demo.js` & `index.html`   —— 轻量级沙箱交互台（可直接对比测试上述各管线）
  - `public/models/`               —— 亚洲女生头部模型 (`daz_asian_head_base.glb`) 与 10 款代表性发型 `.glb`
  - `src/demo.js` & `index.html` —— 沙箱交互界面（已接入上述两套后处理、两套皮肤管线、画风预设、胶片 LUT 与发型编辑器）
  - `public/models/`          —— 亚洲女生头部模型 (`daz_asian_head_base.glb`) 与 10 款发型 `.glb`


二、当前最迫切的五大核心痛点与升级目标（请帮我全面整合、优化并拔高！）
--------------------------------------------------------------------------------

1. 【痛点一：RTX 2070S 上加载巨慢、运行非常卡顿 —— 请把所有管线整合并做极致性能优化！】
   - 目前两套后处理（`beautyPostChain.js` 的多 Pass 全屏采样 + `postChain.js` 的 GTAO）、两套皮肤/光影管线（`photorealLighting.js` + `studioLighting.js` / `skinMaterial.js`）、以及 `strandHair.js`（CPU 主线程同步追踪上万根发丝 + 暴力三角形最近距离搜索 `nearestOnHead` + 16×12 步体素光线步进 AO）和 `hairEditor.js`（CPU 逐顶点变形）叠在一起，在 **RTX 2070 Super** 上打开网页要卡很久，切换发型或开滤镜也严重掉帧。
   - 升级要求：
     - **整合渲染管线与后处理 Pass**：把 `beautyPostChain.js` 与 `postChain.js` 的精华合并成最高效的单/双 Pass 管线，消除重复的全屏纹理拷贝与冗余采样。
     - **大幅加速真发丝生成与发型编辑**：优化或用空间加速网格/BVH 替代 `strandHair.js` 里的暴力几何查询与耗时 AO 烘焙，支持分帧/异步加载；把 `hairEditor.js` 的发型编辑变形放到 **GPU 顶点着色器**中执行，做到 **RTX 2070S 秒开、拖动滑块 0 卡顿、全程丝滑满帧 60 FPS**！

2. 【痛点二：缺乏真人光影感 —— 打造最真实的亚洲女生唯美光影！】
   - 目前人物缺乏真实摄影棚或自然阳光下的立体光影感，画面偏平。
   - 升级要求：
     - 整合 `photorealLighting.js` 与 `studioLighting.js` / `skinMaterial.js` 的优势，做出**极具真人呼吸感的亚洲女生唯美光影**：
       - 灵动清澈的眼神光（Catchlight）与深邃眼窝/挺拔鼻梁的柔和明暗过渡；
       - 额前刘海与发丝投射在额头、眼周和脸颊上的细腻柔和阴影；
       - 发丝边缘温暖通透的逆光金边轮廓光；
       - 白里透红、通透水润的亚洲水光肌/奶油肌次表面散射与细腻微毛孔（拒绝塑料假人感和死白）。

3. 【痛点三：发型编辑器又卡又假 —— 我要丝滑流畅、极具真实质感的亚洲发型编辑器！】
   - 目前 `hairEditor.js` 和 `strandHair.js` 在编辑刘海、分缝、蓬松度、鬓角、卷度时不仅卡，而且变形像塑料壳拉伸一样假。
   - 升级要求：
     - 重构发型编辑器与发丝渲染，做出**真正符合亚洲女生审美的柔顺丝滑真发丝质感**：
       - 自然的空气刘海、八字刘海、胎毛碎发发际线过渡（Baby Hairs）与真实头皮发缝；
       - 顺滑垂坠的发束层次感、自然的发尾内扣/大波浪弧度与流动的天使环光泽；
       - 所有发型编辑参数实时丝滑响应，绝不穿模进额头或脸颊。

4. 【痛点四：睫毛和眉毛不够真实 —— 升级根根分明的亚洲真睫毛与野生眉/柔雾眉！】
   - 目前 `featureMaterials.js` 中的睫毛和眉毛还是偏贴图卡片感。
   - 升级要求：
     - 升级为**根根分明、发梢自然微翘纤细、根部自然过渡的真实 3D 亚洲睫毛（如太阳花微翘睫毛/自然羽扇睫毛）与立体毛流眉毛（野生眉/柔雾眉）**，并提升双眼虹膜清澈度与下眼睑盈盈泪光感。

5. 【痛点五：整合所有唯美滤镜与画风效果 —— 做到最真实、最唯美、最高效！】
   - 将 `beautyPostChain.js`（27+ 光学特效与 8 款胶片 LUT）、`photorealLighting.js`（30+ `VISUAL_STYLE_PRESETS` 画风预设、百叶窗/树影光斑、动态光影）与 `styleModules.js` 深度整合优化，让每一款唯美滤镜（盛夏逆光、水光奶油肌、日系森系胶片、清冷白皙、港风柔焦、落日余晖等）都既有顶级真人写真质感，又在 RTX 2070S 上极致流畅！
