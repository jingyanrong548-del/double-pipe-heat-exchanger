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
    
    const result = CoolProp.PropsSI(property, input1, value1, input2, value2, fluid);
    
    if (isNaN(result) || !isFinite(result)) {
      throw new Error(`物性查询返回无效值: ${result}`);
    }
    
    return result;
  } catch (error) {
    console.error(`物性查询失败 [${fluid}, ${property}, ${input1}=${value1}, ${input2}=${value2}]:`, error);
    throw new Error(`物性查询失败: ${error.message}`);
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
    const [density, specificHeat, enthalpy, thermalConductivity, viscosity] = await Promise.all([
      getDensity(fluid, temperature, pressure),
      getSpecificHeat(fluid, temperature, pressure),
      getEnthalpy(fluid, temperature, pressure),
      getThermalConductivity(fluid, temperature, pressure),
      getViscosity(fluid, temperature, pressure)
    ]);

    const prandtl = (specificHeat * viscosity) / thermalConductivity;

    return {
      density,           // kg/m³
      specificHeat,     // J/kg/K
      enthalpy,         // J/kg
      thermalConductivity, // W/m/K
      viscosity,        // Pa·s
      prandtl           // 无量纲
    };
  } catch (error) {
    console.error('批量物性查询失败:', error);
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

