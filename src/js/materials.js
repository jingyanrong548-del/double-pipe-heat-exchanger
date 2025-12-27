/**
 * 材料属性数据库
 * 提供常用换热器管材的导热系数
 */

/**
 * 常用材料及其导热系数 (W/(m·K))
 * 数据来源：标准工程材料手册，在常温（~20°C）下的典型值
 */
export const MATERIALS = {
  'stainless-steel-304': {
    name: '不锈钢 304',
    thermalConductivity: 16.2,  // W/(m·K)
    description: '奥氏体不锈钢，耐腐蚀性好，适用于一般换热器'
  },
  'stainless-steel-316': {
    name: '不锈钢 316',
    thermalConductivity: 16.3,  // W/(m·K)
    description: '奥氏体不锈钢，含钼，耐腐蚀性优于304'
  },
  'stainless-steel-316l': {
    name: '不锈钢 316L',
    thermalConductivity: 15.0,  // W/(m·K)
    description: '低碳奥氏体不锈钢，耐腐蚀性优异'
  },
  'carbon-steel': {
    name: '碳钢',
    thermalConductivity: 55.0,  // W/(m·K)
    description: '普通碳钢，导热性好，成本低，适用于非腐蚀性介质'
  },
  'copper': {
    name: '铜',
    thermalConductivity: 385.0,  // W/(m·K)
    description: '导热性极好，适用于高效换热，成本较高'
  },
  'aluminum': {
    name: '铝',
    thermalConductivity: 205.0,  // W/(m·K)
    description: '导热性好，重量轻，适用于轻量化设计'
  },
  'titanium': {
    name: '钛',
    thermalConductivity: 22.0,  // W/(m·K)
    description: '耐腐蚀性极佳，适用于海水、酸性介质，成本高'
  },
  'brass': {
    name: '黄铜',
    thermalConductivity: 120.0,  // W/(m·K)
    description: '铜锌合金，导热性好，耐腐蚀性中等'
  },
  'nickel': {
    name: '镍',
    thermalConductivity: 91.0,  // W/(m·K)
    description: '耐腐蚀性好，适用于高温和腐蚀性环境'
  },
  'hastelloy': {
    name: '哈氏合金',
    thermalConductivity: 13.0,  // W/(m·K)
    description: '高性能耐腐蚀合金，适用于强腐蚀性介质'
  },
  'monel': {
    name: '蒙乃尔',
    thermalConductivity: 25.0,  // W/(m·K)
    description: '镍铜合金，耐腐蚀性好，适用于海水环境'
  },
  'duplex-steel': {
    name: '双相不锈钢',
    thermalConductivity: 19.0,  // W/(m·K)
    description: '双相组织，强度和耐腐蚀性兼备'
  }
};

/**
 * 获取材料的导热系数
 * @param {string} materialId - 材料ID
 * @returns {number} 导热系数 (W/(m·K))，如果材料不存在则返回默认值16（不锈钢）
 */
export function getMaterialThermalConductivity(materialId) {
  if (!materialId || !MATERIALS[materialId]) {
    // 默认返回不锈钢304的导热系数
    return MATERIALS['stainless-steel-304'].thermalConductivity;
  }
  return MATERIALS[materialId].thermalConductivity;
}

/**
 * 获取材料信息
 * @param {string} materialId - 材料ID
 * @returns {Object|null} 材料信息对象，包含name, thermalConductivity, description
 */
export function getMaterialInfo(materialId) {
  if (!materialId || !MATERIALS[materialId]) {
    return MATERIALS['stainless-steel-304'];  // 返回默认材料
  }
  return MATERIALS[materialId];
}

