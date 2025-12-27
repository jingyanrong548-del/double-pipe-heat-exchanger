/**
 * CoolProp 加载器和物性查询封装
 * 使用 import.meta.env.BASE_URL 处理路径，确保部署后路径正确
 */

let CoolPropInstance = null;
let isCoolPropLoaded = false;
let loadPromise = null;

/**
 * 加载 CoolProp 库
 * @returns {Promise<Object>} CoolProp 实例
 */
export async function loadCoolProp() {
  // 如果已经加载，直接返回
  if (isCoolPropLoaded && CoolPropInstance) {
    return CoolPropInstance;
  }

  // 如果正在加载，返回现有的 Promise
  if (loadPromise) {
    return loadPromise;
  }

  // 开始加载
  loadPromise = (async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      
      // CoolProp 文件现在在 src/js 目录下，可以直接导入
      const CoolPropModule = await import('./coolprop.js');
      
      // WASM 文件在 public 目录，需要通过绝对 URL 访问
      const wasmPath = `${baseUrl}coolprop.wasm`.replace(/\/+/g, '/');
      
      // 获取默认导出（通常是 Module 构造函数函数）
      let CoolPropConstructor = CoolPropModule.default || CoolPropModule;
      
      // Emscripten 生成的模块通常是一个函数，需要传入配置对象
      // 设置 locateFile 函数来正确加载 WASM 文件
      const CoolProp = await CoolPropConstructor({
        locateFile: (path, prefix) => {
          // 如果是 WASM 文件，返回正确的路径
          if (path.endsWith('.wasm')) {
            return wasmPath;
          }
          // 其他文件使用默认路径
          return prefix + path;
        }
      });
      
      // 设置调试级别（如果支持）
      if (CoolProp && CoolProp.set_debug_level) {
        CoolProp.set_debug_level(0); // 关闭调试信息
      }
      
      // 检查是否有 PropsSI 方法
      if (CoolProp && typeof CoolProp.PropsSI === 'function') {
        CoolPropInstance = CoolProp;
        isCoolPropLoaded = true;
        return CoolPropInstance;
      } else {
        throw new Error('CoolProp 模块已加载，但未找到 PropsSI 方法');
      }
    } catch (error) {
      console.error('CoolProp 加载失败:', error);
      loadPromise = null;
      throw new Error(`CoolProp 加载失败: ${error.message}`);
    }
  })();

  return loadPromise;
}

/**
 * 查询流体物性
 * @param {string} fluid - 工质名称（如 'Water', 'R134a'）
 * @param {string} property - 物性名称（如 'T', 'P', 'D', 'H', 'C', 'L', 'V'）
 * @param {string} input1 - 第一个输入参数（如 'T', 'P'）
 * @param {number} value1 - 第一个输入参数的值
 * @param {string} input2 - 第二个输入参数（如 'T', 'P', 'Q'）
 * @param {number} value2 - 第二个输入参数的值
 * @returns {number} 物性值
 */
export async function getProperty(fluid, property, input1, value1, input2, value2) {
  try {
    const CoolProp = await loadCoolProp();
    
    if (!CoolProp.PropsSI) {
      throw new Error('CoolProp.PropsSI 方法不可用');
    }
    
    // 验证输入参数
    if (typeof fluid !== 'string' || !fluid) {
      throw new Error(`工质名称无效: ${fluid}`);
    }
    if (typeof property !== 'string' || !property) {
      throw new Error(`物性参数无效: ${property}`);
    }
    if (!isFinite(value1) || value1 <= 0) {
      throw new Error(`输入参数1无效: ${input1} = ${value1}`);
    }
    if (!isFinite(value2) || value2 <= 0) {
      throw new Error(`输入参数2无效: ${input2} = ${value2}`);
    }
    
    const result = CoolProp.PropsSI(property, input1, value1, input2, value2, fluid);
    
    // 检查结果有效性
    if (isNaN(result) || !isFinite(result)) {
      throw new Error(`物性查询返回无效值: ${result} (可能的原因：温度/压力超出工质有效范围，或处于两相区/临界点附近)`);
    }
    
    // 对于某些物性，检查是否为负值（密度、粘度、导热系数、比热容等不应为负）
    const nonNegativeProperties = ['D', 'V', 'L', 'C'];
    if (nonNegativeProperties.includes(property) && result < 0) {
      throw new Error(`物性查询返回负值: ${property} = ${result} (工质: ${fluid}, ${input1}=${value1}, ${input2}=${value2})`);
    }
    
    return result;
  } catch (error) {
    // 如果错误信息已经包含详细信息，直接抛出
    if (error.message && error.message.includes('物性查询')) {
      throw error;
    }
    
    // 否则构造详细的错误信息
    const errorDetail = `[工质: ${fluid}, 物性: ${property}, ${input1}=${value1}, ${input2}=${value2}]`;
    console.error(`物性查询失败 ${errorDetail}:`, error);
    
    // 提供更有帮助的错误信息
    let userMessage = `物性查询失败 ${errorDetail}`;
    if (error.message) {
      userMessage += `\n错误详情: ${error.message}`;
    }
    userMessage += `\n提示：请检查工质名称是否正确，温度/压力是否在有效范围内`;
    
    throw new Error(userMessage);
  }
}

/**
 * 查询温度（给定压力和比焓）
 * @param {string} fluid - 工质名称
 * @param {number} pressure - 压力 (Pa)
 * @param {number} enthalpy - 比焓 (J/kg)
 * @returns {number} 温度 (K)
 */
export async function getTemperatureFromPH(fluid, pressure, enthalpy) {
  return await getProperty(fluid, 'T', 'P', pressure, 'H', enthalpy);
}

/**
 * 查询密度（给定温度和压力）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {number} 密度 (kg/m³)
 */
export async function getDensity(fluid, temperature, pressure) {
  return await getProperty(fluid, 'D', 'T', temperature, 'P', pressure);
}

/**
 * 查询比热容（给定温度和压力）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {number} 比热容 (J/kg/K)
 */
export async function getSpecificHeat(fluid, temperature, pressure) {
  return await getProperty(fluid, 'C', 'T', temperature, 'P', pressure);
}

/**
 * 查询比焓（给定温度和压力）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {number} 比焓 (J/kg)
 */
export async function getEnthalpy(fluid, temperature, pressure) {
  return await getProperty(fluid, 'H', 'T', temperature, 'P', pressure);
}

/**
 * 查询导热系数（给定温度和压力）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {number} 导热系数 (W/m/K)
 */
export async function getThermalConductivity(fluid, temperature, pressure) {
  return await getProperty(fluid, 'L', 'T', temperature, 'P', pressure);
}

/**
 * 查询动力粘度（给定温度和压力）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {number} 动力粘度 (Pa·s)
 */
export async function getViscosity(fluid, temperature, pressure) {
  return await getProperty(fluid, 'V', 'T', temperature, 'P', pressure);
}

/**
 * 查询普朗特数（给定温度和压力）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {number} 普朗特数
 */
export async function getPrandtlNumber(fluid, temperature, pressure) {
  try {
    const CoolProp = await loadCoolProp();
    const cp = await getSpecificHeat(fluid, temperature, pressure);
    const mu = await getViscosity(fluid, temperature, pressure);
    const k = await getThermalConductivity(fluid, temperature, pressure);
    return (cp * mu) / k;
  } catch (error) {
    console.error('普朗特数计算失败:', error);
    throw error;
  }
}

/**
 * 批量查询流体物性（用于换热器计算）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {Object} 包含所有物性的对象
 */
export async function getFluidProperties(fluid, temperature, pressure) {
  try {
    // 验证输入参数
    if (!isFinite(temperature) || temperature <= 0) {
      throw new Error(`温度无效: ${temperature} K (工质: ${fluid})`);
    }
    if (!isFinite(pressure) || pressure <= 0) {
      throw new Error(`压力无效: ${pressure} Pa (工质: ${fluid})`);
    }
    
    const [density, specificHeat, enthalpy, thermalConductivity, viscosity] = await Promise.all([
      getDensity(fluid, temperature, pressure),
      getSpecificHeat(fluid, temperature, pressure),
      getEnthalpy(fluid, temperature, pressure),
      getThermalConductivity(fluid, temperature, pressure),
      getViscosity(fluid, temperature, pressure)
    ]);

    // 验证计算出的物性值
    if (density <= 0) {
      throw new Error(`密度计算错误: ${density} kg/m³ (工质: ${fluid}, T=${temperature}K, P=${pressure}Pa)`);
    }
    if (specificHeat <= 0) {
      throw new Error(`比热容计算错误: ${specificHeat} J/kg/K (工质: ${fluid})`);
    }
    if (thermalConductivity <= 0) {
      throw new Error(`导热系数计算错误: ${thermalConductivity} W/m/K (工质: ${fluid})`);
    }
    if (viscosity <= 0) {
      throw new Error(`动力粘度计算错误: ${viscosity} Pa·s (工质: ${fluid})`);
    }

    const prandtl = (specificHeat * viscosity) / thermalConductivity;
    
    // 验证普朗特数
    if (!isFinite(prandtl) || prandtl <= 0) {
      console.warn(`普朗特数计算结果异常: ${prandtl} (工质: ${fluid}, T=${temperature}K, P=${pressure}Pa)`);
      // 不抛出错误，但记录警告
    }

    return {
      density,           // kg/m³
      specificHeat,     // J/kg/K
      enthalpy,         // J/kg
      thermalConductivity, // W/m/K
      viscosity,        // Pa·s
      prandtl           // 无量纲
    };
  } catch (error) {
    console.error(`批量物性查询失败 (工质: ${fluid}, T=${temperature}K, P=${pressure}Pa):`, error);
    throw error;
  }
}

/**
 * 检查 CoolProp 是否已加载
 * @returns {boolean}
 */
export function isLoaded() {
  return isCoolPropLoaded;
}

/**
 * 查询饱和温度（给定压力）
 * @param {string} fluid - 工质名称
 * @param {number} pressure - 压力 (Pa)
 * @returns {number} 饱和温度 (K)
 */
export async function getSaturationTemperature(fluid, pressure) {
  return await getProperty(fluid, 'T', 'P', pressure, 'Q', 0); // Q=0为饱和液体
}

/**
 * 查询饱和压力（给定温度）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @returns {number} 饱和压力 (Pa)
 */
export async function getSaturationPressure(fluid, temperature) {
  return await getProperty(fluid, 'P', 'T', temperature, 'Q', 0); // Q=0为饱和液体
}

/**
 * 使用温度-压力-干度查询物性（两相流）
 * @param {string} fluid - 工质名称
 * @param {string} property - 物性名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @param {number} quality - 干度 (0-1，0为饱和液体，1为饱和蒸汽)
 * @returns {number} 物性值
 */
export async function getPropertyTPQ(fluid, property, temperature, pressure, quality) {
  try {
    // 验证干度范围
    if (quality < 0 || quality > 1) {
      throw new Error(`干度必须在0-1之间，当前值: ${quality}`);
    }
    
    const CoolProp = await loadCoolProp();
    const result = CoolProp.PropsSI(property, 'T', temperature, 'P', pressure, 'Q', quality, fluid);
    
    // 检查结果有效性
    if (isNaN(result) || !isFinite(result)) {
      throw new Error(`两相流物性查询返回无效值: ${result} (工质: ${fluid}, T=${temperature}K, P=${pressure}Pa, Q=${quality})`);
    }
    
    return result;
  } catch (error) {
    console.error(`两相流物性查询失败 [工质: ${fluid}, 物性: ${property}, T=${temperature}K, P=${pressure}Pa, Q=${quality}]:`, error);
    throw error;
  }
}

/**
 * 检测流体的相态
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {Promise<string>} 相态：'liquid'（液体）、'vapor'（蒸汽）、'twophase'（两相）
 */
export async function detectPhase(fluid, temperature, pressure) {
  try {
    const CoolProp = await loadCoolProp();
    
    // 查询给定温度下的饱和压力
    const satPressure = await getSaturationPressure(fluid, temperature);
    
    // 比较实际压力与饱和压力
    if (Math.abs(pressure - satPressure) < 1) {
      // 压力接近饱和压力，可能是两相
      // 进一步查询干度来判断
      try {
        const quality = CoolProp.PropsSI('Q', 'T', temperature, 'P', pressure, fluid);
        if (quality >= 0 && quality <= 1) {
          if (quality > 0 && quality < 1) {
            return 'twophase';
          } else if (quality === 0) {
            return 'liquid';
          } else {
            return 'vapor';
          }
        }
      } catch (e) {
        // 如果无法查询干度，根据压力判断
        if (pressure >= satPressure) {
          return 'liquid';
        } else {
          return 'vapor';
        }
      }
    }
    
    // 如果实际压力 > 饱和压力，为过冷液体
    if (pressure > satPressure) {
      return 'liquid';
    }
    // 如果实际压力 < 饱和压力，为过热蒸汽
    else {
      return 'vapor';
    }
  } catch (error) {
    console.warn(`相态检测失败 (工质: ${fluid}, T=${temperature}K, P=${pressure}Pa):`, error);
    // 默认返回单相（液体），避免计算中断
    return 'liquid';
  }
}

/**
 * 批量查询两相流物性（使用混合规则）
 * @param {string} fluid - 工质名称
 * @param {number} temperature - 温度 (K)，对于两相流应为饱和温度
 * @param {number} pressure - 压力 (Pa)
 * @param {number} quality - 干度 (0-1)
 * @returns {Promise<Object>} 包含所有物性的对象（使用混合规则计算）
 */
export async function getFluidPropertiesTwoPhase(fluid, temperature, pressure, quality) {
  try {
    if (quality < 0 || quality > 1) {
      throw new Error(`干度必须在0-1之间，当前值: ${quality}`);
    }
    
    const CoolProp = await loadCoolProp();
    
    // 对于两相流，CoolProp可以使用T-P-Q直接查询某些物性
    // 但有些物性需要分别查询液体和蒸汽后混合
    
    // 查询饱和温度（如果给定的温度不是饱和温度，使用压力对应的饱和温度）
    let satTemp;
    try {
      satTemp = await getSaturationTemperature(fluid, pressure);
    } catch (e) {
      // 如果无法查询饱和温度，使用给定温度
      satTemp = temperature;
    }
    
    // 查询饱和液体物性 (Q=0)
    const liquidDensity = CoolProp.PropsSI('D', 'T', satTemp, 'P', pressure, 'Q', 0, fluid);
    const liquidH = CoolProp.PropsSI('H', 'T', satTemp, 'P', pressure, 'Q', 0, fluid);
    const liquidCp = CoolProp.PropsSI('C', 'T', satTemp, 'P', pressure, 'Q', 0, fluid);
    const liquidK = CoolProp.PropsSI('L', 'T', satTemp, 'P', pressure, 'Q', 0, fluid);
    const liquidMu = CoolProp.PropsSI('V', 'T', satTemp, 'P', pressure, 'Q', 0, fluid);
    const liquidPr = (liquidCp * liquidMu) / liquidK;
    
    // 查询饱和蒸汽物性 (Q=1)
    const vaporDensity = CoolProp.PropsSI('D', 'T', satTemp, 'P', pressure, 'Q', 1, fluid);
    const vaporH = CoolProp.PropsSI('H', 'T', satTemp, 'P', pressure, 'Q', 1, fluid);
    const vaporCp = CoolProp.PropsSI('C', 'T', satTemp, 'P', pressure, 'Q', 1, fluid);
    const vaporK = CoolProp.PropsSI('L', 'T', satTemp, 'P', pressure, 'Q', 1, fluid);
    const vaporMu = CoolProp.PropsSI('V', 'T', satTemp, 'P', pressure, 'Q', 1, fluid);
    const vaporPr = (vaporCp * vaporMu) / vaporK;
    
    const liquidProps = {
      density: liquidDensity,
      specificHeat: liquidCp,
      enthalpy: liquidH,
      thermalConductivity: liquidK,
      viscosity: liquidMu,
      prandtl: liquidPr
    };
    
    const vaporProps = {
      density: vaporDensity,
      specificHeat: vaporCp,
      enthalpy: vaporH,
      thermalConductivity: vaporK,
      viscosity: vaporMu,
      prandtl: vaporPr
    };
    
    // 使用混合规则计算两相流物性
    // 密度使用倒数规则：1/ρ_mix = x/ρ_v + (1-x)/ρ_l
    const mixedDensity = 1 / (quality / vaporDensity + (1 - quality) / liquidDensity);
    
    // 比热容和焓使用线性混合：φ_mix = x*φ_v + (1-x)*φ_l
    const mixedSpecificHeat = quality * vaporCp + (1 - quality) * liquidCp;
    const mixedEnthalpy = quality * vaporH + (1 - quality) * liquidH;
    
    // 导热系数使用线性混合
    const mixedThermalConductivity = quality * vaporK + (1 - quality) * liquidK;
    
    // 粘度使用McAdams混合规则：1/μ_mix = x/μ_v + (1-x)/μ_l
    const mixedViscosity = 1 / (quality / vaporMu + (1 - quality) / liquidMu);
    
    // 计算混合普朗特数
    const mixedPrandtl = (mixedSpecificHeat * mixedViscosity) / mixedThermalConductivity;
    
    return {
      density: mixedDensity,
      specificHeat: mixedSpecificHeat,
      enthalpy: mixedEnthalpy,
      thermalConductivity: mixedThermalConductivity,
      viscosity: mixedViscosity,
      prandtl: mixedPrandtl,
      quality: quality, // 保留干度信息
      liquidProps: liquidProps, // 保留液体物性（用于后续计算）
      vaporProps: vaporProps    // 保留蒸汽物性（用于后续计算）
    };
  } catch (error) {
    console.error(`两相流物性查询失败 (工质: ${fluid}, T=${temperature}K, P=${pressure}Pa, Q=${quality}):`, error);
    throw error;
  }
}

/**
 * 查询饱和状态物性（液体或蒸汽）
 * @param {string} fluid - 工质名称
 * @param {number} pressure - 压力 (Pa)
 * @param {boolean} isVapor - true为饱和蒸汽，false为饱和液体
 * @returns {Promise<Object>} 饱和物性对象
 */
export async function getSaturationProperties(fluid, pressure, isVapor = false) {
  const quality = isVapor ? 1 : 0;
  const satTemp = await getSaturationTemperature(fluid, pressure);
  return await getFluidPropertiesTwoPhase(fluid, satTemp, pressure, quality);
}

