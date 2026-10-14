// Stage 45: data-only, opt-in modules. No asset mutation, storage or renderer side effects.
// Add a module here to extend the inspector without changing its engine adapter.
export const STYLE_MODULES = Object.freeze([
  {
    flag: 'photoLighting', amount: 'photoLightingAmount', tab: 'light',
    title: '摄影布光', note: '中性柔光箱与适度补光；保留真实明暗体积',
    targets: {
      hdrMode: 'softbox_portrait', keyColor: '#fffaf5', fillColor: '#e0e7ef',
      rimColor: '#f3f5ff', hemiSky: '#ffffff', hemiGround: '#27292d',
      keyIntensity: 1.55, fillIntensity: .72, rimIntensity: 1.10,
      hemiIntensity: .34, upIntensity: .12, envIntensity: .30,
      keyAzimuthDeg: -38, keyElevationDeg: 30, exposure: 1, chiaroscuro: .24,
    },
  },
  {
    flag: 'photoTone', amount: 'photoToneAmount', tab: 'lens',
    title: '克制摄影调色', note: '减轻滤镜染色与过度锐化，不伪造纹理细节',
    targets: {
      contrast: 1.02, saturation: 1, warmth: 0, vignette: .10,
      sharpen: 0, casSharpen: .12, microContrast: 0, shadowCrush: 0,
      shadowLift: .06, specularClarity: 0, filmLutStrength: 0,
      vintagePhoto: 0, highlightRoll: .18, tint: [1,1,1], shadowTint: [0,0,0],
    },
  },
  {
    flag: 'skinResponse', amount: 'skinResponseAmount', tab: 'skin',
    title: '自然皮肤光响应', note: '减弱夸张皮下红光与眼部增亮，不改变五官',
    targets: { skinGloss: .18, sssIntensity: .28, eyeClarity: .85, irisSparkle: 0, skinLumen: 0 },
  },
  {
    flag: 'microDetail', amount: 'microDetailAmount', tab: 'skin',
    title: '克制毛孔起伏', note: '降低浮雕式毛孔；保留各角色原本的纹理差异',
    targets: { poreReliefGlobal: .32 }, fallbacks: { poreReliefGlobal: .56 },
  },
  {
    flag: 'skinMatte', amount: 'skinMatteAmount', tab: 'skin',
    title: '减轻塑料油亮', note: '适度提高内置皮肤粗糙度；不覆盖私有 GLB 材质',
    targets: { repairSkinMatteAmount: 1 }, fallbacks: { repairSkinMatteAmount: 0 },
  },
]);

export const STYLE_DEFAULTS = Object.freeze(Object.fromEntries(
  STYLE_MODULES.flatMap(m => [[m.flag, false], [m.amount, 1]])
));

const mix = (a,b,t) => a + (b-a)*t;
function blend(from,to,t) {
  if (typeof to === 'number') return mix(Number.isFinite(from) ? from : to, to, t);
  if (Array.isArray(to)) return to.map((v,i) => mix(from?.[i] ?? v,v,t));
  if (/^#[\da-f]{6}$/i.test(to)) {
    if (!/^#[\da-f]{6}$/i.test(from || '')) from=to;
    return '#' + [1,3,5].map(i => Math.round(mix(parseInt(from.slice(i,i+2),16),parseInt(to.slice(i,i+2),16),t)).toString(16).padStart(2,'0')).join('');
  }
  // Environment types are discrete; changing at zero strength is forbidden.
  return to;
}
export function composeStyleModules(source,options) {
  const out={};
  for (const module of STYLE_MODULES) {
    const amount=options[module.amount];
    const t=Number.isFinite(amount) ? Math.min(1,Math.max(0,amount)) : 1;
    if (!options[module.flag] || t===0) continue;
    for (const [key,target] of Object.entries(module.targets)) {
      out[key]=blend(out[key] ?? source[key] ?? module.fallbacks?.[key],target,t);
    }
  }
  return out;
}

// Old v1 photography recipes remain importable, now as independently editable modules.
export function migratePhotographyRecipe(value) {
  if (value.photoBaseline !== true) return value;
  const migrated={...value,photoBaseline:false};
  for (const module of STYLE_MODULES.filter(m=>m.flag!=='skinMatte')) {
    if (!(module.flag in value)) migrated[module.flag]=true;
  }
  return migrated;
}
