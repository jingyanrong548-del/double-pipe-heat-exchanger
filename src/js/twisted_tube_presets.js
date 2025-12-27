/**
 * 麻花管预设配置
 * 定义了3种常用的麻花管规格
 */

export const TWISTED_TUBE_PRESETS = {
  '35': {
    name: '外管外径 35mm',
    outerOuterDiameter: 35,      // mm
    outerWallThickness: 2,        // mm
    innerWallThickness: 1,        // mm
    toothHeight: 3,               // mm
    pitch: 6.5,                   // mm
    lobeCount: 6                  // 头数
  },
  '38': {
    name: '外管外径 38mm',
    outerOuterDiameter: 38,      // mm
    outerWallThickness: 2,        // mm
    innerWallThickness: 1,        // mm
    toothHeight: 3,               // mm
    pitch: 6.5,                   // mm
    lobeCount: 6                  // 头数
  },
  '42': {
    name: '外管外径 42mm',
    outerOuterDiameter: 42,      // mm
    outerWallThickness: 2,        // mm
    innerWallThickness: 1,        // mm
    toothHeight: 3,               // mm
    pitch: 6.5,                   // mm
    lobeCount: 6                  // 头数
  }
};

/**
 * 获取指定预设配置
 * @param {string} presetId - 预设ID（'35'、'38'、'42'）
 * @returns {Object|null} 预设配置对象，如果不存在返回null
 */
export function getTwistedTubePreset(presetId) {
  return TWISTED_TUBE_PRESETS[presetId] || null;
}

