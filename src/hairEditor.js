import * as THREE from 'three';

/**
 * 3D 发型编辑器模块 (Hair Styler & Groom Editor)
 * ----------------------------------------------------------------------------
 * 当前存在的核心问题（待优化拔高）：
 * 1. 【卡顿问题】：每次拖动滑块（刘海长度、八字分缝、蓬松度、发尾卷度、长度等）都在 CPU 主线程遍历上万个发丝/发片顶点并重新计算法线，在 RTX 2070S 上拖动滑块非常掉帧卡顿；若触发真发丝重建更是会卡顿数秒。
 * 2. 【质感假问题】：简单的数学几何缩放/正弦旋转会让发丝变形僵硬、穿模进额头或脸颊，缺乏真实亚洲女生空气刘海、八字碎发、发根蓬松度与顺滑垂坠的物理层次感。
 */
export const DEFAULT_HAIR_EDIT_STATE = {
  bangsLength: 0.0,     // 刘海长短 (-0.5 短眉上刘海 ~ +0.5 长刘海)
  bangsParting: 0.0,    // 刘海分缝 (0 齐刘海 ~ 1 八字中分)
  crownVolume: 0.0,     // 高颅顶蓬松度 (-0.3 ~ +0.6)
  sideburnsLength: 0.0, // 两侧公主切/龙须鬓角修饰 (-0.4 ~ +0.6)
  tailLength: 0.0,      // 后发/发尾总长度 (-0.4 ~ +0.6)
  curlAmount: 0.0,      // 发尾卷度/大波浪 (0 ~ 1.0)
  wispyFlyaways: 0.35,  // 碎发/胎毛空气感 (0 ~ 1.0)
  windBreeze: 0.0,      // 微风拂动感 (-0.5 ~ +0.5)
  ombreMix: 0.0,        // 发尾挑染/渐变混合度 (0 ~ 1.0)
  ombreColor: '#7a4b3a' // 挑染目标发色
};

export function applyHairEditToGeometry(geometry, basePositions, editState = DEFAULT_HAIR_EDIT_STATE) {
  if (!geometry || !basePositions) return;
  const posAttr = geometry.attributes.position;
  const arr = posAttr.array;
  const n = arr.length;

  const {
    bangsLength = 0,
    bangsParting = 0,
    crownVolume = 0,
    sideburnsLength = 0,
    tailLength = 0,
    curlAmount = 0,
    windBreeze = 0,
  } = editState;

  for (let i = 0; i < n; i += 3) {
    let x = basePositions[i];
    let y = basePositions[i + 1];
    let z = basePositions[i + 2];

    // 额前刘海区域 (z > 0.04, y > -0.02)
    const isFrontBangs = z > 0.04 && y > -0.02 && Math.abs(x) < 0.065;
    // 两侧鬓角/公主切区域
    const isSideburns = z > -0.01 && z <= 0.055 && Math.abs(x) > 0.042 && y < 0.05;
    // 颅顶区域
    const isCrown = y > 0.055;
    // 发尾区域
    const isTail = y < 0.02 && z < 0.04;

    if (isFrontBangs) {
      const tipFactor = THREE.MathUtils.clamp((0.095 - y) / 0.09, 0.0, 1.0);
      y -= bangsLength * 0.032 * tipFactor;
      if (bangsParting !== 0) {
        const sign = x >= 0 ? 1 : -1;
        const centerProx = Math.exp(-Math.pow(x / 0.035, 2));
        x += sign * bangsParting * 0.024 * tipFactor * centerProx;
        z -= Math.abs(bangsParting) * 0.004 * tipFactor * centerProx;
      }
    }

    if (isSideburns) {
      const sideTip = THREE.MathUtils.clamp((0.05 - y) / 0.12, 0.0, 1.0);
      y -= sideburnsLength * 0.045 * sideTip;
    }

    if (isCrown && crownVolume !== 0) {
      const crownFactor = THREE.MathUtils.clamp((y - 0.055) / 0.07, 0.0, 1.0);
      y += crownVolume * 0.022 * crownFactor;
      x *= 1.0 + crownVolume * 0.08 * crownFactor;
      z *= 1.0 + crownVolume * 0.06 * crownFactor;
    }

    if (isTail && tailLength !== 0) {
      const drop = THREE.MathUtils.clamp((0.02 - y) / 0.16, 0.0, 1.0);
      y -= tailLength * 0.065 * drop;
    }

    if (curlAmount > 0 && y < 0.04) {
      const curlT = THREE.MathUtils.clamp((0.04 - y) / 0.15, 0.0, 1.0);
      const phase = y * 55.0 + x * 18.0;
      x += Math.sin(phase) * 0.008 * curlAmount * curlT;
      z += Math.cos(phase) * 0.008 * curlAmount * curlT;
    }

    if (windBreeze !== 0 && y < 0.06) {
      const wT = THREE.MathUtils.clamp((0.06 - y) / 0.16, 0.0, 1.0);
      x += windBreeze * 0.025 * wT * wT;
      z -= Math.abs(windBreeze) * 0.008 * wT;
    }

    arr[i] = x;
    arr[i + 1] = y;
    arr[i + 2] = z;
  }

  posAttr.needsUpdate = true;
}
