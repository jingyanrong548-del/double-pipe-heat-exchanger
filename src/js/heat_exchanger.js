/**
 * 套管换热器热力计算模块
 * 实现传热量、LMTD、传热系数等计算
 */

import { getFluidProperties, getEnthalpy } from './coolprop_loader.js';

/**
 * 计算对数平均温差 (LMTD)
 * @param {number} tHotIn - 热流体入口温度 (°C)
 * @param {number} tHotOut - 热流体出口温度 (°C)
 * @param {number} tColdIn - 冷流体入口温度 (°C)
 * @param {number} tColdOut - 冷流体出口温度 (°C)
 * @param {string} flowType - 流动方式: 'counter' (逆流) 或 'parallel' (并流)
 * @returns {number} LMTD (°C)
 */
export function calculateLMTD(tHotIn, tHotOut, tColdIn, tColdOut, flowType = 'counter') {
  // 直接在摄氏度下计算温差（ΔT 在 °C 与 K 中数值相同）
  let deltaT1, deltaT2;

  if (flowType === 'counter') {
    // 逆流：入口端温差 = Th,in - Tc,out，出口端温差 = Th,out - Tc,in
    deltaT1 = tHotIn - tColdOut;
    deltaT2 = tHotOut - tColdIn;
  } else {
    // 并流：入口端温差 = Th,in - Tc,in，出口端温差 = Th,out - Tc,out
    deltaT1 = tHotIn - tColdIn;
    deltaT2 = tHotOut - tColdOut;
  }

  // 检查有效性
  if (deltaT1 <= 0 || deltaT2 <= 0) {
    throw new Error('温差计算无效：确保热流体温度高于冷流体温度');
  }

  // 两端温差几乎相等时，LMTD 退化为算术平均
  if (Math.abs(deltaT1 - deltaT2) < 1e-6) {
    return (deltaT1 + deltaT2) / 2;
  }

  // 标准 LMTD 公式
  const lmtd = (deltaT1 - deltaT2) / Math.log(deltaT1 / deltaT2);
  
  return lmtd; // 单位：°C
}

/**
 * 计算雷诺数
 * @param {number} density - 密度 (kg/m³)
 * @param {number} velocity - 流速 (m/s)
 * @param {number} diameter - 特征直径 (m)
 * @param {number} viscosity - 动力粘度 (Pa·s)
 * @returns {number} 雷诺数
 */
export function calculateReynoldsNumber(density, velocity, diameter, viscosity) {
  return (density * velocity * diameter) / viscosity;
}

/**
 * 计算努塞尔数（Dittus-Boelter 关联式，适用于湍流）
 * @param {number} re - 雷诺数
 * @param {number} pr - 普朗特数
 * @param {boolean} heating - 是否为加热（true: 加热, false: 冷却）
 * @returns {number} 努塞尔数
 */
export function calculateNusseltNumber(re, pr, heating = true) {
  if (re < 2300) {
    // 层流：Nu = 3.66（圆管内层流）
    return 3.66;
  } else if (re < 10000) {
    // 过渡流：使用 Gnielinski 关联式
    const f = Math.pow(0.79 * Math.log(re) - 1.64, -2);
    const nu = (f / 8) * (re - 1000) * pr / (1 + 12.7 * Math.sqrt(f / 8) * (Math.pow(pr, 2/3) - 1));
    return nu;
  } else {
    // 湍流：Dittus-Boelter 关联式
    const n = heating ? 0.4 : 0.3;
    return 0.023 * Math.pow(re, 0.8) * Math.pow(pr, n);
  }
}

/**
 * 计算对流传热系数
 * @param {number} nu - 努塞尔数
 * @param {number} thermalConductivity - 导热系数 (W/m/K)
 * @param {number} diameter - 特征直径 (m)
 * @returns {number} 对流传热系数 (W/m²/K)
 */
export function calculateConvectiveHeatTransferCoefficient(nu, thermalConductivity, diameter) {
  return (nu * thermalConductivity) / diameter;
}

/**
 * 计算麻花管的传热增强系数
 * @param {number} twistPitch - 螺旋节距 (m)
 * @param {number} twistAngle - 螺旋角度 (°)
 * @param {number} innerDiameter - 内管直径 (m)
 * @returns {number} 传热增强系数
 */
export function calculateTwistedTubeEnhancementFactor(twistPitch, twistAngle, innerDiameter) {
  // 保守的麻花管传热增强系数模型
  // 目标范围：E 大致在 1.0 ~ 1.7 之间
  if (!twistPitch || !innerDiameter) return 1.0;

  const aspectRatio = twistPitch / innerDiameter; // p / Di
  const angleRad = (twistAngle * Math.PI) / 180;

  // 节距越小（更紧），增强越明显，但限制在 0.8~1.3
  const pitchFactor = Math.max(0.8, Math.min(1.3, 1.2 / aspectRatio));

  // 角度在 0~90° 范围内映射到 1.0~1.3
  const angleFactor = 1.0 + Math.max(0, Math.min(angleRad, Math.PI / 2)) / (Math.PI / 2) * 0.3;

  const E = pitchFactor * angleFactor;

  // 二次限制，保证不会过大或小于 1
  return Math.min(1.8, Math.max(1.0, E));
}

/**
 * 计算麻花管的实际传热面积
 * @param {number} innerDiameter - 内管直径 (m)
 * @param {number} length - 管长 (m)
 * @param {number} twistPitch - 螺旋节距 (m)
 * @param {number} twistAngle - 螺旋角度 (°)
 * @returns {number} 实际传热面积 (m²)
 */
export function calculateTwistedTubeArea(innerDiameter, length, twistPitch, twistAngle) {
  // 基础面积（直管）
  const baseArea = Math.PI * innerDiameter * length;
  
  // 螺旋增加的面积
  const numTwists = length / twistPitch;
  const angleRad = twistAngle * Math.PI / 180;
  const spiralLength = length / Math.cos(angleRad);
  const spiralArea = Math.PI * innerDiameter * spiralLength;
  
  // 实际面积介于基础面积和螺旋面积之间
  const areaIncrease = (spiralArea - baseArea) * 0.3; // 考虑实际效果
  
  return baseArea + areaIncrease;
}

/**
 * 计算套管换热器的总传热系数（直管基准，不含麻花管增强）
 * @param {Object} hotProps - 热流体的物性（在平均温度下）
 * @param {Object} coldProps - 冷流体的物性（在平均温度下）
 * @param {number} innerDiameter - 内管直径 (m)
 * @param {number} outerDiameter - 外管直径 (m)
 * @param {number} hotFlowRate - 热流体质量流量 (kg/s)
 * @param {number} coldFlowRate - 冷流体质量流量 (kg/s)
 * @param {number} length - 管长 (m)
 * @returns {number} 总传热系数基准值 (W/m²/K)
 */
export async function calculateOverallHeatTransferCoefficientBase(
  hotProps,
  coldProps,
  innerDiameter,
  outerDiameter,
  hotFlowRate,
  coldFlowRate,
  length
) {
  // 计算内管（热流体）的对流传热系数
  const innerArea = Math.PI * innerDiameter * length;
  const innerVelocity = hotFlowRate / (hotProps.density * Math.PI * Math.pow(innerDiameter / 2, 2));
  const innerRe = calculateReynoldsNumber(
    hotProps.density,
    innerVelocity,
    innerDiameter,
    hotProps.viscosity
  );
  const innerNu = calculateNusseltNumber(innerRe, hotProps.prandtl, false); // 热流体被冷却
  
  const hi = calculateConvectiveHeatTransferCoefficient(
    innerNu,
    hotProps.thermalConductivity,
    innerDiameter
  );

  // 计算环形空间（冷流体）的对流传热系数
  const hydraulicDiameter = outerDiameter - innerDiameter; // 环形空间的当量直径
  const annulusArea = Math.PI * (Math.pow(outerDiameter / 2, 2) - Math.pow(innerDiameter / 2, 2));
  const annulusVelocity = coldFlowRate / (coldProps.density * annulusArea);
  const annulusRe = calculateReynoldsNumber(
    coldProps.density,
    annulusVelocity,
    hydraulicDiameter,
    coldProps.viscosity
  );
  const annulusNu = calculateNusseltNumber(annulusRe, coldProps.prandtl, true); // 冷流体被加热
  const ho = calculateConvectiveHeatTransferCoefficient(
    annulusNu,
    coldProps.thermalConductivity,
    hydraulicDiameter
  );

  // 计算总传热系数（基于外管面积）
  // 1/U = 1/(hi*Ai/Ao) + 1/ho + R_wall (忽略管壁热阻)
  const outerArea = Math.PI * outerDiameter * length;
  const areaRatio = innerArea / outerArea;
  
  // 简化计算：忽略管壁热阻
  const U_base = 1 / (1 / (hi * areaRatio) + 1 / ho);
  
  return U_base;
}

/**
 * 计算套管换热器的总传热系数（含麻花管增强）
 */
export async function calculateOverallHeatTransferCoefficient(
  hotProps,
  coldProps,
  innerDiameter,
  outerDiameter,
  hotFlowRate,
  coldFlowRate,
  length,
  isTwisted = false,
  twistPitch = 0.1,
  twistAngle = 45
) {
  const U_base = await calculateOverallHeatTransferCoefficientBase(
    hotProps,
    coldProps,
    innerDiameter,
    outerDiameter,
    hotFlowRate,
    coldFlowRate,
    length
  );

  if (!isTwisted) {
    return U_base;
  }

  const E = calculateTwistedTubeEnhancementFactor(twistPitch, twistAngle, innerDiameter);

  // 最终增强系数再做一次安全限制
  const limitedE = Math.min(1.8, Math.max(1.0, E));

  return U_base * limitedE;
}

/**
 * 计算传热量（基于能量平衡）
 * @param {string} hotFluid - 热流体工质名称
 * @param {number} hotTin - 热流体入口温度 (°C)
 * @param {number} hotTout - 热流体出口温度 (°C)
 * @param {number} hotFlowRate - 热流体质量流量 (kg/s)
 * @param {number} hotPressure - 热流体压力 (kPa)
 * @returns {Promise<number>} 传热量 (W)
 */
export async function calculateHeatTransferRate(
  hotFluid,
  hotTin,
  hotTout,
  hotFlowRate,
  hotPressure
) {
  const hotTinK = hotTin + 273.15;
  const hotToutK = hotTout + 273.15;
  const hotPressurePa = hotPressure * 1000;

  // 计算平均温度
  const hotTavg = (hotTinK + hotToutK) / 2;

  // 查询物性
  const hotProps = await getFluidProperties(hotFluid, hotTavg, hotPressurePa);

  // 计算比焓差
  const hIn = await getEnthalpy(hotFluid, hotTinK, hotPressurePa);
  const hOut = await getEnthalpy(hotFluid, hotToutK, hotPressurePa);
  const deltaH = hIn - hOut;

  // 传热量 Q = m * Δh
  const Q = hotFlowRate * deltaH;

  return Q; // W
}

/**
 * 计算换热面积
 * @param {number} heatTransferRate - 传热量 (W)
 * @param {number} lmtd - 对数平均温差 (°C)
 * @param {number} overallHeatTransferCoefficient - 总传热系数 (W/m²/K)
 * @returns {number} 换热面积 (m²)
 */
export function calculateHeatTransferArea(heatTransferRate, lmtd, overallHeatTransferCoefficient) {
  // LMTD 温差值在 °C 和 K 中数值相同，直接使用
  return heatTransferRate / (overallHeatTransferCoefficient * lmtd);
}

/**
 * 套管换热器完整计算
 * @param {Object} params - 计算参数
 * @returns {Promise<Object>} 计算结果
 */
export async function calculateHeatExchanger(params) {
  const {
    hotFluid,
    hotTin,
    hotTout,
    hotFlowRate,
    hotPressure,
    coldFluid,
    coldTin,
    coldTout,
    coldFlowRate,
    coldPressure,
    innerDiameter,
    outerDiameter,
    length,
    flowType,
    givenU, // 可选：给定的传热系数
    isTwisted = false, // 是否为麻花管
    twistPitch = 0.1, // 螺旋节距
    twistAngle = 45 // 螺旋角度
  } = params;

  try {
    // 1. 计算 LMTD
    const lmtd = calculateLMTD(hotTin, hotTout, coldTin, coldTout, flowType);

    // 2. 计算传热量（基于热流体）
    const Q = await calculateHeatTransferRate(
      hotFluid,
      hotTin,
      hotTout,
      hotFlowRate,
      hotPressure
    );

    // 3. 计算传热系数
    let U;
    if (givenU && givenU > 0) {
      // 使用给定的传热系数
      U = givenU;
    } else {
      // 自动计算传热系数
      const hotTavg = (hotTin + hotTout) / 2 + 273.15;
      const coldTavg = (coldTin + coldTout) / 2 + 273.15;
      const hotPressurePa = hotPressure * 1000;
      const coldPressurePa = coldPressure * 1000;

      const [hotProps, coldProps] = await Promise.all([
        getFluidProperties(hotFluid, hotTavg, hotPressurePa),
        getFluidProperties(coldFluid, coldTavg, coldPressurePa)
      ]);

      U = await calculateOverallHeatTransferCoefficient(
        hotProps,
        coldProps,
        innerDiameter,
        outerDiameter,
        hotFlowRate,
        coldFlowRate,
        length,
        isTwisted,
        twistPitch,
        twistAngle
      );
    }

    // 4. 计算换热面积
    let A;
    if (isTwisted) {
      // 麻花管使用实际面积估算
      A = calculateTwistedTubeArea(innerDiameter, length, twistPitch, twistAngle);
    } else {
      // 直管使用基于 Q、LMTD、U 的面积
      A = calculateHeatTransferArea(Q, lmtd, U);
    }
    
    // 基于 Q 和 LMTD 反算一个 U_check（用于 sanity check）
    let U_check = null;
    if (A > 0 && lmtd > 0) {
      U_check = Q / (A * lmtd);
    }

    // 计算增强系数（如果是麻花管）
    let enhancementFactor = 1.0;
    if (isTwisted) {
      enhancementFactor = calculateTwistedTubeEnhancementFactor(twistPitch, twistAngle, innerDiameter);
    }

    return {
      heatTransferRate: Q / 1000, // 转换为 kW
      lmtd: lmtd,
      overallHeatTransferCoefficient: U,
      heatTransferArea: A,
      overallHeatTransferCoefficientCheck: U_check,
      isTwisted: isTwisted,
      enhancementFactor: enhancementFactor,
      success: true
    };
  } catch (error) {
    console.error('换热器计算失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

