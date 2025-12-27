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
 * 计算梅花截面的面积和湿周（基于Do,max和Do,min）
 * @param {number} doMax - 峰顶外接圆直径Do,max (m)（最大外径）
 * @param {number} doMin - 谷底内切圆直径Do,min (m)（最小外径）
 * @param {number} lobeCount - 头数（瓣数，3-6）
 * @returns {Object} {area: 面积 (m²), perimeter: 湿周 (m), equivalentDiameter: 当量直径 (m), toothHeight: 齿高h (m)}
 */
export function calculateLobeCrossSection(doMax, doMin, lobeCount) {
  const rMax = doMax / 2; // 峰顶半径
  const rMin = doMin / 2; // 谷底半径
  const h = (doMax - doMin) / 2; // 齿高（单边）
  const anglePerLobe = (2 * Math.PI) / lobeCount;
  
  // 梅花截面面积计算（简化模型）
  // 使用星形截面的近似公式
  // 面积 ≈ N * (扇形面积 + 三角形面积)
  // 每个瓣包含：一个外圆弧区域 + 两个三角形区域（从谷到峰）
  
  // 基础圆形面积（使用平均半径）
  const rAvg = (rMax + rMin) / 2;
  const baseCircularArea = Math.PI * rAvg * rAvg;
  
  // 瓣形增加的面积（每个瓣增加的面积）
  // 近似为：每个瓣的额外面积 = 2 * (扇形面积差 + 三角形面积)
  const lobeAreaIncrease = lobeCount * (Math.PI * h * h / lobeCount + rMax * h * Math.sin(anglePerLobe / 2));
  
  // 总流通面积（使用Do,min作为主要参考，因为这是"谷"的位置，决定流通面积）
  // 实际面积应该接近以Do,min为直径的圆面积加上瓣形增加的面积
  const minCircularArea = Math.PI * rMin * rMin;
  const lobeArea = minCircularArea + lobeAreaIncrease * 0.7; // 0.7为修正系数
  
  // 湿周计算（梅花截面的周长）
  // 使用近似公式：周长 ≈ π * Do,min + N * (每个瓣增加的弧长)
  const basePerimeter = Math.PI * doMin;
  const lobeArcLength = lobeCount * (h * anglePerLobe); // 每个瓣增加的弧长
  const lobePerimeter = basePerimeter + lobeArcLength * 1.2; // 1.2为修正系数
  
  // 当量直径：Dh = 4 * A / P
  const equivalentDiameter = (4 * lobeArea) / lobePerimeter;
  
  return {
    area: lobeArea,
    perimeter: lobePerimeter,
    equivalentDiameter: equivalentDiameter,
    toothHeight: h
  };
}

/**
 * 计算麻花管的传热增强系数（基于头数和螺旋节距）
 * @param {number} twistPitch - 螺旋节距 (m)
 * @param {number} innerDiameter - 内管内径 (m)
 * @param {number} lobeCount - 头数（瓣数，3-6）
 * @returns {number} 传热增强系数
 */
export function calculateTwistedTubeEnhancementFactor(twistPitch, innerDiameter, lobeCount = 4) {
  // 麻花管传热增强系数模型
  // 目标范围：E 大致在 1.2 ~ 2.5 之间（取决于头数和节距）
  if (!twistPitch || !innerDiameter) return 1.0;

  const aspectRatio = twistPitch / innerDiameter; // p / Di
  
  // 节距因子：节距越小（更紧），增强越明显
  const pitchFactor = Math.max(0.9, Math.min(1.4, 1.5 / Math.sqrt(aspectRatio)));
  
  // 头数因子：头数越多，接触面积越大，增强越明显
  // 3头: 1.0, 4头: 1.2, 5头: 1.4, 6头: 1.6
  const lobeFactor = 1.0 + (lobeCount - 3) * 0.2;
  
  const E = pitchFactor * lobeFactor;

  // 限制在合理范围内
  return Math.min(2.5, Math.max(1.0, E));
}

/**
 * 计算麻花管的实际传热面积（考虑梅花截面和螺旋接触）
 * @param {number} outerDiameter - 麻花管外径 (m)（等于外管内径）
 * @param {number} innerDiameter - 麻花管内径 (m)
 * @param {number} length - 管长 (m)
 * @param {number} twistPitch - 螺旋节距 (m)
 * @param {number} lobeCount - 头数（瓣数）
 * @returns {number} 实际传热面积 (m²)
 */
export function calculateTwistedTubeArea(outerDiameter, innerDiameter, length, twistPitch, lobeCount = 4) {
  const outerRadius = outerDiameter / 2;
  const innerRadius = innerDiameter / 2;
  
  // 基础面积（圆形截面）
  const baseAreaPerTube = Math.PI * outerDiameter * length;
  
  // 螺旋增加的面积（考虑螺旋路径）
  const numTwists = length / twistPitch;
  const spiralLength = length * Math.sqrt(1 + Math.pow(Math.PI * outerDiameter / twistPitch, 2));
  const spiralAreaPerTube = Math.PI * outerDiameter * spiralLength;
  
  // 瓣形增加的面积（梅花截面带来的接触面积增加）
  const lobeAreaEnhancement = 1 + 0.15 * (lobeCount - 3); // 头数越多，接触面积越大
  
  // 实际面积 = 基础面积 × 螺旋因子 × 瓣形因子
  const spiralFactor = 1 + (spiralAreaPerTube - baseAreaPerTube) / baseAreaPerTube * 0.5; // 考虑实际效果
  const areaPerTube = baseAreaPerTube * spiralFactor * lobeAreaEnhancement;
  
  return areaPerTube;
}

/**
 * 计算套管换热器的总传热系数（直管基准，不含麻花管增强）
 * @param {Object} hotProps - 热流体的物性（在平均温度下）
 * @param {Object} coldProps - 冷流体的物性（在平均温度下）
 * @param {number} innerOuterDiameter - 内管外径 (m)（用于传热面积计算）
 * @param {number} outerOuterDiameter - 外管外径 (m)（用于传热面积计算）
 * @param {number} innerInnerDiameter - 内管内径 (m)（用于流速计算）
 * @param {number} outerInnerDiameter - 外管内径 (m)（用于环形空间面积计算）
 * @param {number} hotFlowRate - 热流体质量流量 (kg/s)
 * @param {number} coldFlowRate - 冷流体质量流量 (kg/s)
 * @param {number} length - 管长 (m)
 * @param {number} innerTubeCount - 内管数量（默认1）
 * @returns {number} 总传热系数基准值 (W/m²/K)
 */
export async function calculateOverallHeatTransferCoefficientBase(
  hotProps,
  coldProps,
  innerOuterDiameter,
  outerOuterDiameter,
  innerInnerDiameter,
  outerInnerDiameter,
  hotFlowRate,
  coldFlowRate,
  length,
  innerTubeCount = 1
) {
  // 计算内管（热流体）的对流传热系数
  // 传热面积使用外径（外表面）
  const singleInnerArea = Math.PI * innerOuterDiameter * length;
  const totalInnerArea = singleInnerArea * innerTubeCount;
  
  // 流速计算使用内径（内表面）
  const flowRatePerTube = hotFlowRate / innerTubeCount;
  const innerCrossSection = Math.PI * Math.pow(innerInnerDiameter / 2, 2);
  const innerVelocity = flowRatePerTube / (hotProps.density * innerCrossSection);
  const innerRe = calculateReynoldsNumber(
    hotProps.density,
    innerVelocity,
    innerInnerDiameter, // 使用内径计算雷诺数
    hotProps.viscosity
  );
  const innerNu = calculateNusseltNumber(innerRe, hotProps.prandtl, false); // 热流体被冷却
  
  const hi = calculateConvectiveHeatTransferCoefficient(
    innerNu,
    hotProps.thermalConductivity,
    innerInnerDiameter // 使用内径计算传热系数
  );

  // 计算环形空间（冷流体）的对流传热系数
  // 多根内管时，环形空间的当量直径需要重新计算
  // 环形空间面积 = 外管内径的圆形面积 - 所有内管外径的圆形面积
  const outerInnerRadius = outerInnerDiameter / 2;
  const innerOuterRadius = innerOuterDiameter / 2;
  const totalInnerCrossSection = innerTubeCount * Math.PI * Math.pow(innerOuterRadius, 2);
  const annulusArea = Math.PI * Math.pow(outerInnerRadius, 2) - totalInnerCrossSection;
  
  // 当量直径：对于多根内管的环形空间，使用简化公式
  // Dh = 4 * 流通面积 / 湿周
  // 湿周 = 外管内周长 + 所有内管外周长
  const outerInnerPerimeter = Math.PI * outerInnerDiameter;
  const innerOuterPerimeter = innerTubeCount * Math.PI * innerOuterDiameter;
  const hydraulicDiameter = (4 * annulusArea) / (outerInnerPerimeter + innerOuterPerimeter);
  
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

  // 计算总传热系数（基于外管外径面积）
  // 1/U = 1/(hi*Ai/Ao) + 1/ho + R_wall (忽略管壁热阻)
  const outerArea = Math.PI * outerOuterDiameter * length;
  const areaRatio = totalInnerArea / outerArea;
  
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
  innerOuterDiameter,
  outerOuterDiameter,
  innerInnerDiameter,
  outerInnerDiameter,
  hotFlowRate,
  coldFlowRate,
  length,
  isTwisted = false,
  twistPitch = 0.1,
  twistLobeCount = 4,
  innerTubeCount = 1
) {
  // 如果是麻花管，需要使用梅花截面的当量直径来计算
  if (isTwisted) {
    // 麻花管几何参数（基于技术文档的定义）
    // Do,max（峰顶外接圆）= 外管内径（贴合状态）
    const doMax = outerInnerDiameter;
    // Do,min（谷底内切圆）= Do,max - 2*h，其中h为齿高
    // 或者：Do,min ≈ innerInnerDiameter（内管内径，用于流通面积计算）
    // 这里使用：Do,min = Do,max - 2*(Do,max - innerInnerDiameter)/2 的简化
    // 实际上，Do,min应该根据壁厚和头数来计算，简化使用内径
    const doMin = innerInnerDiameter; // 简化：使用内管内径作为Do,min
    
    // 计算梅花截面的几何参数
    const lobeSection = calculateLobeCrossSection(doMax, doMin, twistLobeCount);
    
    // 使用梅花截面的当量直径计算内管流速和雷诺数
    const flowRatePerTube = hotFlowRate / innerTubeCount;
    const innerVelocity = flowRatePerTube / (hotProps.density * lobeSection.area);
    const innerRe = calculateReynoldsNumber(
      hotProps.density,
      innerVelocity,
      lobeSection.equivalentDiameter,
      hotProps.viscosity
    );
    const innerNu = calculateNusseltNumber(innerRe, hotProps.prandtl, false);
    
    const hi = calculateConvectiveHeatTransferCoefficient(
      innerNu,
      hotProps.thermalConductivity,
      lobeSection.equivalentDiameter
    );
    
    // 环形空间流通面积（外管内径圆面积 - 麻花管峰顶外接圆面积）
    // 由于贴合状态，Do,max = 外管内径，所以环形空间很小
    const outerInnerRadius = outerInnerDiameter / 2;
    const annulusArea = Math.PI * Math.pow(outerInnerRadius, 2) - Math.PI * Math.pow(doMax / 2, 2);
    // 如果贴合，环形空间面积接近0
    const effectiveAnnulusArea = Math.max(annulusArea, Math.PI * Math.pow(outerInnerRadius, 2) * 0.01); // 至少1%的面积
    
    const outerPerimeter = Math.PI * outerInnerDiameter;
    // 使用Do,max的周长作为接触周长
    const innerContactPerimeter = Math.PI * doMax;
    const hydraulicDiameter = (4 * effectiveAnnulusArea) / (outerPerimeter + innerContactPerimeter);
    
    const annulusVelocity = coldFlowRate / (coldProps.density * annulusArea);
    const annulusRe = calculateReynoldsNumber(
      coldProps.density,
      annulusVelocity,
      hydraulicDiameter,
      coldProps.viscosity
    );
    const annulusNu = calculateNusseltNumber(annulusRe, coldProps.prandtl, true);
    const ho = calculateConvectiveHeatTransferCoefficient(
      annulusNu,
      coldProps.thermalConductivity,
      hydraulicDiameter
    );
    
    // 计算传热面积（使用Do,max的周长，因为这是与外管接触的外表面）
    // 同时考虑螺旋增加的面积
    const baseContactPerimeter = Math.PI * doMax;
    const spiralLength = length * Math.sqrt(1 + Math.pow(Math.PI * doMax / twistPitch, 2));
    const totalInnerArea = baseContactPerimeter * spiralLength;
    const outerArea = Math.PI * outerOuterDiameter * length;
    const areaRatio = totalInnerArea / outerArea;
    
    const U_base = 1 / (1 / (hi * areaRatio) + 1 / ho);
    
    // 应用增强系数
    const E = calculateTwistedTubeEnhancementFactor(twistPitch, innerInnerDiameter, twistLobeCount);
    const limitedE = Math.min(2.5, Math.max(1.0, E));
    
    return U_base * limitedE;
  } else {
    // 普通直管计算
    return await calculateOverallHeatTransferCoefficientBase(
      hotProps,
      coldProps,
      innerOuterDiameter,
      outerOuterDiameter,
      innerInnerDiameter,
      outerInnerDiameter,
      hotFlowRate,
      coldFlowRate,
      length,
      innerTubeCount
    );
  }
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
    innerDiameter, // 内管外径（用于传热面积）
    outerDiameter, // 外管外径（用于传热面积）
    innerInnerDiameter, // 内管内径（用于流速计算）
    outerInnerDiameter, // 外管内径（用于环形空间计算）
    length,
    flowType,
    givenU, // 可选：给定的传热系数
    innerTubeCount = 1, // 内管数量
    innerTubeType = 'smooth', // 内管类型：'smooth' 或 'twisted'
    isTwisted = false, // 是否为麻花管（从innerTubeType推导）
    twistPitch = 0.1, // 螺旋节距
    twistLobeCount = 4, // 麻花管头数（瓣数）
    twistWallThickness = null, // 麻花管壁厚（null表示使用内管壁厚）
    twistOuterDiameter = null, // 麻花管外径（null表示使用外管内径，贴合状态）
    passCount = 1, // 流程数量
    outerTubeCountPerPass = 1 // 每流程外管数量
  } = params;
  
  // 确保isTwisted与innerTubeType一致
  const actualIsTwisted = innerTubeType === 'twisted' || isTwisted;
  
  // 麻花管模式下，确定实际的几何参数
  let actualInnerOuterDiameter = innerDiameter; // 用于传热面积
  let actualInnerInnerDiameter = innerInnerDiameter; // 用于流速计算
  
  if (actualIsTwisted) {
    // 麻花管外径等于外管内径（贴合状态）
    actualInnerOuterDiameter = twistOuterDiameter || outerInnerDiameter;
    // 麻花管内径 = 外径 - 2×壁厚
    const wallThickness = twistWallThickness || (innerDiameter - innerInnerDiameter) / 2;
    actualInnerInnerDiameter = actualInnerOuterDiameter - 2 * wallThickness;
  }

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
        actualInnerOuterDiameter, // 内管外径（麻花管模式下等于外管内径）
        outerDiameter, // 外管外径
        actualInnerInnerDiameter, // 内管内径（麻花管模式下重新计算）
        outerInnerDiameter, // 外管内径
        hotFlowRate,
        coldFlowRate,
        length,
        actualIsTwisted,
        twistPitch,
        twistLobeCount,
        innerTubeCount
      );
    }

    // 4. 计算单管换热面积
    let singleTubeArea;
    if (actualIsTwisted) {
      // 麻花管使用实际面积估算（考虑梅花截面和螺旋）
      singleTubeArea = calculateTwistedTubeArea(
        actualInnerOuterDiameter, // 麻花管外径
        actualInnerInnerDiameter, // 麻花管内径
        length,
        twistPitch,
        twistLobeCount
      );
    } else {
      // 直管：多根内管时，单根外管内的面积为单根内管面积乘以内管数量
      const singleInnerTubeArea = calculateHeatTransferArea(Q, lmtd, U) / (innerTubeCount * passCount * outerTubeCountPerPass);
      singleTubeArea = singleInnerTubeArea * innerTubeCount;
    }
    
    // 总换热面积 = 单管面积 × 流程数量 × 每流程外管数量
    const totalArea = singleTubeArea * passCount * outerTubeCountPerPass;
    
    // 基于 Q 和 LMTD 反算一个 U_check（用于 sanity check）
    let U_check = null;
    if (totalArea > 0 && lmtd > 0) {
      U_check = Q / (totalArea * lmtd);
    }

    // 计算增强系数（如果是麻花管）
    let enhancementFactor = 1.0;
    if (actualIsTwisted) {
      enhancementFactor = calculateTwistedTubeEnhancementFactor(twistPitch, actualInnerInnerDiameter, twistLobeCount);
    }

    return {
      heatTransferRate: Q / 1000, // 转换为 kW
      lmtd: lmtd,
      overallHeatTransferCoefficient: U,
      heatTransferArea: totalArea,
      singleTubeArea: singleTubeArea,
      overallHeatTransferCoefficientCheck: U_check,
      innerTubeCount: innerTubeCount,
      innerTubeType: innerTubeType,
      passCount: passCount,
      outerTubeCountPerPass: outerTubeCountPerPass,
      isTwisted: actualIsTwisted,
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

