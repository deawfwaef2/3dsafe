import { VISUAL_STYLE_PRESETS } from './photorealLighting.js';
import './visualRepair.css';
import { STYLE_MODULES, STYLE_DEFAULTS, composeStyleModules, migratePhotographyRecipe } from './styleModules.js';

// Independent, opt-in correction layer. Never write the original config/store.
export const REPAIR_KEY = 'portrait3d-visual-repair-v1';
export const DEFAULT_REPAIR = Object.freeze({
  ...STYLE_DEFAULTS, enabled: false, neutral: false, neutralAmount: 1,
  shadows: false, shadowAmount: .55, haze: false, hazeAmount: 1,
  clarity: false, clarityAmount: 1, exposureOn: false, exposure: 1,
  stopMotion: false, removeGobo: false, hideShelves: false,
  compactUI: false, hideLabels: false, photoBaseline: false,
});
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function sanitizeRepair(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('方案格式不正确');
  value = migratePhotographyRecipe(value);
  const result = { ...DEFAULT_REPAIR };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'boolean') result[key] = value[key] === true;
    else if (typeof value[key] === 'number' && Number.isFinite(value[key])) result[key] = clamp(value[key], key === 'exposure' ? .5 : 0, key === 'exposure' ? 1.6 : 1);
  }
  return result;
}
const lerp = (a,b,t) => a + (b-a)*t;
function colorMix(a,b,t) {
  if (!/^#[0-9a-f]{6}$/i.test(a || '')) a=b;
  return '#' + [1,3,5].map(i=>Math.round(lerp(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),t)).toString(16).padStart(2,'0')).join('');
}
// Defaults below match existing postchain fallbacks, not new global defaults.
const FX_DEFAULTS = { bloomStrength:.11, halation:.54, tyndall:.36, sunFlareVeil:.76, dappledBokeh:.78, anamorphicFlare:.24, lightLeak:.22, wetLensDrop:0, softFocus:.58, depthBlur:.48, chromatic:.16, sssBlur:.64, swirlyBokeh:.28, lensDistortion:.12, filmGrain:.07 };
export function buildRepairConfig(original, options) {
  const source = { ...(VISUAL_STYLE_PRESETS[original.presetId] || VISUAL_STYLE_PRESETS.cinema_85mm_portrait), ...original };
  const out = { ...original };
  const modules = composeStyleModules(source, options);
  Object.assign(source, modules); Object.assign(out, modules);
  const number = (key, fallback) => Number.isFinite(Number(source[key])) ? Number(source[key]) : fallback;
  if (options.neutral) {
    const t=options.neutralAmount;
    if (t>0) out.hdrMode='softbox_portrait';
    for (const [key,target] of Object.entries({keyColor:'#ffffff',fillColor:'#dae5f0',rimColor:'#e9eff5',hemiSky:'#ffffff',hemiGround:'#282b31'})) out[key]=colorMix(source[key],target,t);
    out.warmth=number('warmth',0)*(1-t);
    out.vintagePhoto=number('vintagePhoto',.46)*(1-t);
    out.filmLutStrength=number('filmLutStrength',.68)*(1-t);
    out.tint=(source.tint || [1,1,1]).map(v=>lerp(v,1,t));
    out.shadowTint=(source.shadowTint || [0,0,0]).map(v=>v*(1-t));
  }
  if (options.shadows) {
    const t=options.shadowAmount;
    for (const [key,target] of Object.entries({chiaroscuro:.30,fillIntensity:.70,hemiIntensity:.40,envIntensity:.38,shadowCrush:0,contrast:1.03})) out[key]=lerp(number(key,target),target,t);
  }
  const reduce=(keys,t)=>keys.forEach(key=>{out[key]=number(key,FX_DEFAULTS[key])*(1-t);});
  if(options.haze) reduce(['bloomStrength','halation','tyndall','sunFlareVeil','dappledBokeh','anamorphicFlare','lightLeak','wetLensDrop'],options.hazeAmount);
  if(options.clarity) reduce(['softFocus','depthBlur','chromatic','sssBlur','swirlyBokeh','lensDistortion','filmGrain'],options.clarityAmount);
  if(options.exposureOn) out.exposure=options.exposure;
  if(options.stopMotion) {out.dynamicLightMode='static_locked';out.dynamicLightSpeed=0;out.dynamicLightAmp=0;out.cursorTorch=0;}
  if(options.removeGobo) {out.windowGobo='none';out.windowGoboStrength=0;}
  return out;
}

export function createVisualRepair({desktop,studio,notify = ()=>{}}) {
  let options={...DEFAULT_REPAIR}, compare=false, opened=false, session=null, raf=0;
  let stored=null;
  try { const record=JSON.parse(localStorage.getItem(REPAIR_KEY)||'null');if(record?.version===1) stored={name:String(record.name||'我的方案').slice(0,40),options:sanitizeRepair(record.options)}; } catch (error) { console.warn('画风方案读取失败：', error.message); }
  const adapters=[];
  const hidden=new Map();
  const isActive=()=>options.enabled&&!compare;
  const baseConfig=engine=>clone(engine.visualConfig||engine._activeVisualState||{});
  function applyAdapter(adapter) {
    const config=isActive()?buildRepairConfig(adapter.base,options):clone(adapter.base);
    adapter.engine.visualConfig=clone(config); // Avoid stale merged override keys on restore.
    adapter.raw.call(adapter.engine,config);
  }
  for (const engine of [desktop,studio].filter(Boolean)) {
    const adapter={engine,base:baseConfig(engine),raw:engine.applyVisualCustomConfig};
    engine.applyVisualCustomConfig=function(patch={}) {
      // Original controls remain authoritative; the repair is composed afterwards.
      adapter.base={...adapter.base,...clone(patch)};
      applyAdapter(adapter);
    };
    adapters.push(adapter);
  }
  function sceneVisibility() {
    const active=isActive()&&options.hideShelves;
    const current=new Set();
    for(const structure of desktop.structures.values()) {
      if(!structure.isShelfStructure) continue;
      const node=structure.node;current.add(node);
      if(active) {if(!hidden.has(node))hidden.set(node,node.visible);node.visible=false;node.userData.visualRepairHidden=true;}
    }
    for(const [node,visible] of hidden) if(!active||!current.has(node)) {node.visible=visible;delete node.userData.visualRepairHidden;hidden.delete(node);}
    document.body.classList.toggle('vr-compact',isActive()&&options.compactUI);
    document.body.classList.toggle('vr-hide-labels',isActive()&&options.hideLabels);
    desktop.wakeRender(1.3,true);
  }
  const originalStructures=desktop.onStructuresUpdate;
  desktop.onStructuresUpdate=function(...args) {originalStructures.apply(this,args);sceneVisibility();};
  function flush() {if(raf)cancelAnimationFrame(raf);raf=0;for(const a of adapters)applyAdapter(a);sceneVisibility();sync();}
  function request() {if(!raf)raf=requestAnimationFrame(flush);sync();}
  function change(patch) {options=sanitizeRepair({...options,...migratePhotographyRecipe(patch)});compare=false;request();}

  const host=document.createElement('div');host.id='visual-repair-root';
  const slider=(flag,key,title,note,min=0,max=1,step=.05)=>`<section class="vr-option"><label class="vr-option-label"><span><strong>${title}</strong><small>${note}</small></span><input type="checkbox" data-vr="${flag}" aria-label="${title}"><i aria-hidden="true"></i></label><div class="vr-range"><input type="range" data-vr="${key}" aria-label="${title}强度" min="${min}" max="${max}" step="${step}"><output data-output="${key}"></output></div></section>`;
  const moduleControls=tab=>STYLE_MODULES.filter(m=>m.tab===tab).map(m=>slider(m.flag,m.amount,m.title,m.note)).join('');
  const toggle=(key,title,note)=>`<section class="vr-option"><label class="vr-option-label"><span><strong>${title}</strong><small>${note}</small></span><input type="checkbox" data-vr="${key}" aria-label="${title}"><i aria-hidden="true"></i></label></section>`;
  host.innerHTML=`
    <div class="vr-mini" hidden><span class="vr-dot"></span><button data-action="open">画风调制器</button><span class="vr-divider"></span><button data-action="manager">工坊</button><button data-action="expand" title="恢复旧工具条">展开工具</button></div>
    <aside id="vr-panel" class="vr-panel" hidden role="dialog" aria-modal="false" aria-labelledby="vr-title">
      <header class="vr-header"><div><span class="vr-eyebrow">STYLE MODULATOR / 02</span><h2 id="vr-title">画风调制器</h2><p>模块独立开关 · 不覆盖原预设</p></div><div class="vr-header-actions"><button data-action="dock" title="切换左 / 右停靠" aria-label="切换停靠侧">⇄</button><button data-action="cancel" title="取消本次调整并关闭" aria-label="关闭修复器">×</button></div></header>
      <div class="vr-modebar"><label><input type="checkbox" data-vr="enabled">启用调制层</label><button id="vr-compare" data-action="compare" aria-pressed="false">A / 查看原画面</button></div>
      <div class="vr-status" role="status" aria-live="polite"><span class="vr-dot"></span><span id="vr-state-text">原画面 · 未改动</span></div>
      <div class="vr-scroll">
        <div class="vr-section-heading"><h3>从一个方向开始</h3><span>点击预览 · 可撤销</span></div>
        <div class="vr-recipes">
          <button data-recipe="photo"><span class="vr-swatch vr-swatch-clear"></span><strong>自然摄影</strong><small>中性布光 / 减轻油亮</small></button>
          <button data-recipe="clear"><span class="vr-swatch vr-swatch-clear"></span><strong>清晰中性</strong><small>减暖黄 / 减雾光</small></button>
          <button data-recipe="portrait"><span class="vr-swatch vr-swatch-soft"></span><strong>柔和肖像</strong><small>补暗部 / 留柔焦</small></button>
          <button data-recipe="inspect"><span class="vr-swatch vr-swatch-inspect"></span><strong>模型检查</strong><small>静态光 / 无遮挡</small></button>
        </div>
        <nav class="vr-tabs" aria-label="修复分类"><button data-tab="light" aria-pressed="true">光照</button><button data-tab="skin" aria-pressed="false">肤质</button><button data-tab="lens" aria-pressed="false">镜头</button><button data-tab="scene" aria-pressed="false">界面</button></nav>
        <div data-tabpanel="light">
          ${moduleControls('light')}
          ${slider('neutral','neutralAmount','减轻暖黄色偏','中和灯色、胶片染色；不改皮肤贴图')}
          ${slider('shadows','shadowAmount','抬起暗部层次','增加补光，减轻头发与眼窝的死黑')}
          ${slider('exposureOn','exposure','单独调节曝光','保持模型与相机不变',.5,1.6,.02)}
          ${toggle('stopMotion','固定光照','暂停动态灯光和鼠标补光，便于比较')}
          ${toggle('removeGobo','移除图案投影','关闭脸部条纹 / 仿发丝投影，不动真实几何')}
        </div>
        <div data-tabpanel="skin" hidden>
          ${moduleControls('skin')}
          <p class="vr-note">仅调材质响应，不捏脸、不磨皮、不替换贴图。眼睑贴合、眉毛和发片轮廓仍需高质量原始资产。</p>
        </div>
        <div data-tabpanel="lens" hidden>
          ${moduleControls('lens')}
          ${slider('haze','hazeAmount','减轻泛光与眩光','降低辉光、漏光、光晕、雾滴与装饰散景')}
          ${slider('clarity','clarityAmount','减轻模糊','降低柔焦、边缘模糊、色散和颗粒')}
          <p class="vr-note" id="vr-post-note">这些选项调节现有后处理，不会自动打开后处理或提升画质档位。</p>
        </div>
        <div data-tabpanel="scene" hidden>
          ${toggle('hideShelves','暂藏挡脸层架','只隐藏外观，不删除建筑，不改变位置与物理承托')}
          ${toggle('compactUI','收起旧工具条','收起顶部、底部和伴学浮窗；保留简洁入口')}
          ${toggle('hideLabels','暂藏档案标牌','不删除档案，需要时随时恢复')}
          <p class="vr-note">隐藏不是重新排布。拖动、碰撞与保存的建筑位置保持原样。</p>
        </div>
        <details class="vr-library"><summary>我的方案 <span id="vr-saved-name">尚未保存</span></summary><div class="vr-library-body"><label>方案名称<input id="vr-recipe-name" type="text" maxlength="40" value="我的画面修复" autocomplete="off"></label><div class="vr-file-actions"><button data-action="save">保存方案</button><button data-action="load">载入方案</button><button data-action="export">导出 JSON</button><button data-action="import">导入 JSON</button><input id="vr-import" type="file" accept=".json,application/json" hidden></div><p class="vr-note">方案单独保存。下次启动不自动开启；旧画面、藏品与模型不会被覆盖。</p></div></details>
        <p class="vr-footnote">WebGL 实时材质调节，不是 NVIDIA DLSS、神经重建或离线路径追踪。调制不能修复模型轮廓与眼睑拓扑。</p>
      </div>
      <footer class="vr-footer"><button data-action="reset">恢复原画面</button><button data-action="cancel">取消本次</button><button class="vr-primary" data-action="apply">应用并收起</button></footer>
    </aside>`;
  document.body.append(host);
  const launch=document.createElement('button');launch.id='btn-visual-repair';launch.className='overlay-btn';launch.textContent='◐ 画风调制器';launch.title='可选、可撤销；不覆盖原画面';launch.setAttribute('aria-controls','vr-panel');launch.setAttribute('aria-expanded','false');
  document.querySelector('#desktop-overlay-bar .overlay-actions')?.prepend(launch);
  const panel=host.querySelector('#vr-panel');
  const announce=message=>{host.querySelector('#vr-state-text').textContent=message;};
  let previousFocus;
  function open() {if(opened)return;session=clone(options);opened=true;previousFocus=document.activeElement;panel.hidden=false;launch.setAttribute('aria-expanded','true');sync();host.querySelector('[data-vr="enabled"]').focus({preventScroll:true});}
  function close(cancel=false) {if(cancel&&session)options=clone(session);compare=false;opened=false;panel.hidden=true;launch.setAttribute('aria-expanded','false');flush();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  launch.addEventListener('click',()=>opened?close(true):open());
  function sync() {
    const count=Object.keys(DEFAULT_REPAIR).filter(k=>k!=='enabled'&&typeof DEFAULT_REPAIR[k]==='boolean'&&options[k]).length;
    host.querySelector('#vr-state-text').textContent=compare?'A · 正在查看原画面':!options.enabled?'原画面 · 调制层未启用':`B · 调制预览 · ${count} 项调整`;
    panel.dataset.active=String(isActive());
    host.querySelector('#vr-compare').disabled=!options.enabled;
    host.querySelector('#vr-compare').setAttribute('aria-pressed',String(compare));
    host.querySelector('#vr-compare').textContent=compare?'B / 返回调制预览':'A / 查看原画面';
    for(const input of host.querySelectorAll('[data-vr]')) {
      const key=input.dataset.vr;if(input.type==='checkbox')input.checked=options[key];else {input.value=options[key];const flag=STYLE_MODULES.find(m=>m.amount===key)?.flag || {neutralAmount:'neutral',shadowAmount:'shadows',hazeAmount:'haze',clarityAmount:'clarity',exposure:'exposureOn'}[key];input.disabled=!options[flag];host.querySelector(`[data-output="${key}"]`).textContent=key==='exposure'?options[key].toFixed(2):Math.round(options[key]*100)+'%';}
    }
    host.querySelector('.vr-mini').hidden=!(isActive()&&options.compactUI);
    host.querySelector('#vr-saved-name').textContent=stored?stored.name:'尚未保存';
    host.querySelector('[data-action="load"]').disabled=!stored;
    const postReady=[desktop,studio].some(e=>e.beautyPost?.enabled);
    host.querySelector('#vr-post-note').textContent=postReady?'作用于现有后处理。不会更换模型，也不强制提高渲染分辨率。':'当前后处理未开启或不可用：清晰度组暂不影响画面。可在原设置中开启后处理；修复器不会强制开启。';
  }
  function save() {
    const name=host.querySelector('#vr-recipe-name').value.trim()||'我的画面修复';
    const record={version:1,name,options:clone(options)};
    try {localStorage.setItem(REPAIR_KEY,JSON.stringify(record));stored=record;sync();announce('方案已单独保存 · 下次手动载入');}
    catch(_){announce('浏览器无法保存，请导出 JSON 备份');}
  }
  const recipes={
    photo:{photoLighting:true,photoTone:true,skinResponse:true,microDetail:true,skinMatte:true,haze:true,hazeAmount:1,clarity:true,clarityAmount:1,stopMotion:true,removeGobo:true},
    clear:{neutral:true,neutralAmount:1,shadows:true,shadowAmount:.65,haze:true,hazeAmount:1,clarity:true,clarityAmount:.9,stopMotion:true,removeGobo:true},
    portrait:{neutral:true,neutralAmount:.8,shadows:true,shadowAmount:.5,haze:true,hazeAmount:.8,clarity:true,clarityAmount:.6,stopMotion:true,removeGobo:true},
    inspect:{neutral:true,neutralAmount:1,shadows:true,shadowAmount:.7,haze:true,hazeAmount:1,clarity:true,clarityAmount:1,stopMotion:true,removeGobo:true,hideShelves:true,compactUI:true,hideLabels:true},
  };
  host.addEventListener('input',event=>{const key=event.target.dataset.vr;if(!key)return;change({[key]:event.target.type==='checkbox'?event.target.checked:Number(event.target.value)});});
  host.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.tab){host.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));host.querySelectorAll('[data-tabpanel]').forEach(p=>p.hidden=p.dataset.tabpanel!==button.dataset.tab);return;}
    if(button.dataset.recipe){change({...DEFAULT_REPAIR,...recipes[button.dataset.recipe],enabled:true});return;}
    switch(button.dataset.action){
      case 'open':open();break;
      case 'cancel':close(true);break;
      case 'apply':close();notify('画风调制已应用；可随时关闭恢复原设置。');break;
      case 'compare':compare=!compare;request();break;
      case 'dock':panel.classList.toggle('vr-left');break;
      case 'reset':change({...DEFAULT_REPAIR});break;
      case 'save':save();break;
      case 'load':if(stored){change(stored.options);host.querySelector('#vr-recipe-name').value=stored.name;}break;
      case 'manager':document.getElementById('btn-toggle-window')?.click();break;
      case 'expand':change({compactUI:false});break;
      case 'import':host.querySelector('#vr-import').click();break;
      case 'export':{const name=host.querySelector('#vr-recipe-name').value.trim()||'我的方案';const blob=new Blob([JSON.stringify({version:1,name,options},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='画面修复方案.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);break;}
    }
  });
  host.querySelector('#vr-import').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {if(file.size>65536)throw new Error('方案文件过大');const data=JSON.parse(await file.text());if(data.version!==1||!data.options)throw new Error('不支持的方案版本');const imported=sanitizeRepair(data.options);host.querySelector('#vr-recipe-name').value=String(data.name||'导入方案').slice(0,40);change(imported);announce('已导入为预览 · 应用前可取消');}
    catch(error){announce(`导入失败：${error.message}`);}finally{event.target.value='';}
  });
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){close(true);event.stopImmediatePropagation();}},true);
  // Do not apply on mount. No new preset/lighting/body classes until explicit input.
  sync();
  return {open,flush,set:change,get options(){return clone(options);},get comparing(){return compare;},get originals(){return adapters.map(a=>clone(a.base));}};
}
