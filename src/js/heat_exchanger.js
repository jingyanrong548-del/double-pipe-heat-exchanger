/**
 * 套管换热器热力计算模块
 * 实现传热量、LMTD、传热系数等计算
 */

import { 
  getFluidProperties, 
  getEnthalpy, 
  getFluidPropertiesTwoPhase,
  getSaturationTemperature,
  getSaturationPressure,
  detectPhase
} from './coolprop_loader.js';
import { getMaterialThermalConductivity } from './materials.js';

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
 * 计算沸腾传热系数（Chen关联式，适用于管内流动沸腾）
 * @param {Object} liquidProps - 饱和液体物性
 * @param {Object} vaporProps - 饱和蒸汽物性
 * @param {number} quality - 干度 (0-1)
 * @param {number} massFlux - 质量通量 (kg/m²/s)
 * @param {number} diameter - 管内径 (m)
 * @param {number} wallTemperature - 壁面温度 (K)
 * @param {number} saturationTemperature - 饱和温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @param {string} fluid - 工质名称
 * @returns {number} 沸腾传热系数 (W/m²/K)
 */
export async function calculateBoilingHeatTransferCoefficient(
  liquidProps,
  vaporProps,
  quality,
  massFlux,
  diameter,
  wallTemperature,
  saturationTemperature,
  pressure,
  fluid
) {
  // Chen关联式参数
  const G = massFlux; // 质量通量 kg/m²/s
  const Di = diameter; // 管内径 m
  const x = quality; // 干度
  const Tsat = saturationTemperature; // 饱和温度 K
  const Tw = wallTemperature; // 壁面温度 K
  const dT = Math.max(Tw - Tsat, 0.1); // 壁面过热度，至少0.1K
  
  // 液体物性
  const rhoL = liquidProps.density;
  const muL = liquidProps.viscosity;
  const kL = liquidProps.thermalConductivity;
  const cpL = liquidProps.specificHeat;
  const PrL = liquidProps.prandtl;
  
  // 蒸汽物性
  const rhoV = vaporProps.density;
  const muV = vaporProps.viscosity;
  
  // 查询表面张力（使用CoolProp）
  // 注意：CoolProp中的表面张力符号是'I'
  // 但需要先加载CoolProp
  const { loadCoolProp } = await import('./coolprop_loader.js');
  const CoolProp = await loadCoolProp();
  let sigma;
  try {
    sigma = CoolProp.PropsSI('I', 'T', Tsat, 'Q', 0, fluid); // 表面张力
    if (!isFinite(sigma) || sigma <= 0) {
      throw new Error('表面张力查询返回无效值');
    }
  } catch (e) {
    // 如果无法查询表面张力，使用估算值（对于常见工质）
    sigma = 0.05; // 默认值 0.05 N/m，接近水的表面张力
    console.warn(`无法查询${fluid}的表面张力，使用默认值: ${sigma} N/m`);
  }
  const hfg = vaporProps.enthalpy - liquidProps.enthalpy; // 汽化潜热 J/kg
  
  // 计算两相雷诺数
  const ReTP = (G * Di) / muL;
  
  // 计算两相因子F（考虑质量通量的影响）
  const Xtt = Math.pow((1 - x) / x, 0.9) * Math.pow(rhoV / rhoL, 0.5) * Math.pow(muL / muV, 0.1);
  const F = Math.pow(2.35 * (1 / Xtt + 0.213), 0.736);
  
  // 计算核态沸腾因子S（考虑过热度的影响）
  const ReL = (G * (1 - x) * Di) / muL;
  const S = 1 / (1 + 2.53e-6 * Math.pow(ReTP, 1.17));
  
  // 计算单相对流传热系数（仅液体）
  const NuL = 0.023 * Math.pow(ReL, 0.8) * Math.pow(PrL, 0.4);
  const hL = NuL * kL / Di;
  
  // 计算核态沸腾传热系数
  const hNB = 0.00122 * Math.pow(kL, 0.79) * Math.pow(cpL, 0.45) * Math.pow(rhoL, 0.49) /
              Math.pow(sigma, 0.5) * Math.pow(muL, 0.29) * Math.pow(hfg * rhoV, 0.24) *
              Math.pow(dT, 0.24) * Math.pow(pressure, 0.75);
  
  // Chen关联式：hTP = F * hL + S * hNB
  const hTP = F * hL + S * hNB;
  
  return Math.max(hTP, hL); // 至少等于单相液体传热系数
}

/**
 * 计算冷凝传热系数（Shah关联式，适用于管内冷凝）
 * @param {Object} liquidProps - 饱和液体物性
 * @param {Object} vaporProps - 饱和蒸汽物性
 * @param {number} quality - 干度 (0-1)
 * @param {number} massFlux - 质量通量 (kg/m²/s)
 * @param {number} diameter - 管内径 (m)
 * @param {number} wallTemperature - 壁面温度 (K)
 * @param {number} saturationTemperature - 饱和温度 (K)
 * @param {number} pressure - 压力 (Pa)
 * @returns {number} 冷凝传热系数 (W/m²/K)
 */
export function calculateCondensingHeatTransferCoefficient(
  liquidProps,
  vaporProps,
  quality,
  massFlux,
  diameter,
  wallTemperature,
  saturationTemperature,
  pressure
) {
  const G = massFlux; // 质量通量 kg/m²/s
  const Di = diameter; // 管内径 m
  const x = quality; // 干度
  const Tsat = saturationTemperature; // 饱和温度 K
  const Tw = wallTemperature; // 壁面温度 K
  const dT = Math.max(Tsat - Tw, 0.1); // 过冷度，至少0.1K
  
  // 液体物性
  const rhoL = liquidProps.density;
  const muL = liquidProps.viscosity;
  const kL = liquidProps.thermalConductivity;
  const cpL = liquidProps.specificHeat;
  const PrL = liquidProps.prandtl;
  
  // 蒸汽物性
  const rhoV = vaporProps.density;
  const muV = vaporProps.viscosity;
  
  // 计算全部为液体时的雷诺数和努塞尔数
  const ReL0 = (G * Di) / muL;
  const NuL0 = 0.023 * Math.pow(ReL0, 0.8) * Math.pow(PrL, 0.4);
  const hL0 = NuL0 * kL / Di;
  
  // Shah关联式
  // 计算Z参数
  const Z = Math.pow((1 / x - 1), 0.8) * Math.pow(pressure / (pressure - pressure * 0.1), 0.4);
  
  // 计算hTP/hL0比值
  let hRatio;
  if (Z >= 1) {
    hRatio = 1 + 3.8 / Math.pow(Z, 0.95);
  } else {
    hRatio = 0.023 / Math.pow(Z, 0.12);
  }
  
  // 两相流冷凝传热系数
  const hTP = hL0 * hRatio * Math.pow(1 - x, 0.8);
  
  // 对于低干度（接近纯液体），使用液体传热系数
  if (x < 0.01) {
    return hL0;
  }
  
  return Math.max(hTP, hL0 * 0.1); // 至少是单相液体传热系数的10%
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
  innerTubeCount = 1,
  innerWallThickness = null,
  outerWallThickness = null,
  foulingInner = 0,  // 管内污垢热阻 (m²·K/W)
  foulingOuter = 0,  // 管外污垢热阻 (m²·K/W)
  tubeMaterial = 'stainless-steel-304'  // 内管材质ID
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
  // 1/U = 1/(hi*Ai/Ao) + 1/ho + R_wall
  const outerArea = Math.PI * outerOuterDiameter * length;
  const areaRatio = totalInnerArea / outerArea;
  
  // 计算管壁热阻（使用选定材质的导热系数）
  // 如果未提供壁厚，使用简化的管壁热阻估算
  const tubeThermalConductivity = getMaterialThermalConductivity(tubeMaterial); // W/(m·K)
  let R_wall = 0;
  
  if (innerWallThickness && innerWallThickness > 0) {
    // 管壁热阻：R_wall = δ / (k * A_mean)
    // 其中 δ 为壁厚，k 为导热系数，A_mean 为平均面积
    const meanDiameter = (innerOuterDiameter + innerInnerDiameter) / 2;
    const meanArea = Math.PI * meanDiameter * length * innerTubeCount;
    R_wall = innerWallThickness / (tubeThermalConductivity * meanArea);
  }
  
  // 计算各热阻（基于外管外径面积）
  // 管内热阻（折算到外径面积）：Ri = 1/(hi * Ai/Ao)
  const Ri = 1 / (hi * areaRatio);
  // 管外热阻：Ro = 1/ho
  const Ro = 1 / ho;
  // 管壁热阻（折算到外径面积）
  const Rwall_scaled = R_wall * (outerArea / totalInnerArea);
  // 管内污垢热阻（折算到外径面积）：Rfi_scaled = Rfi * (Ai/Ao)
  const Rfi_scaled = foulingInner * areaRatio;
  // 管外污垢热阻：Rfo（已经是基于外径面积的）
  const Rfo = foulingOuter;
  
  // 总热阻（包含污垢）
  const R_total = Ri + Ro + Rwall_scaled + Rfi_scaled + Rfo;
  
  // 总传热系数
  const U_base = 1 / R_total;
  
  // 计算热阻分配比例
  const Ri_percentage = (Ri / R_total) * 100;
  const Ro_percentage = (Ro / R_total) * 100;
  const Rwall_percentage = (Rwall_scaled / R_total) * 100;
  const Rfi_percentage = (Rfi_scaled / R_total) * 100;
  const Rfo_percentage = (Rfo / R_total) * 100;
  
  return {
    U: U_base,
    hi: hi,
    ho: ho,
    Ri: Ri,
    Ro: Ro,
    Rwall: Rwall_scaled,
    Rfi: Rfi_scaled,  // 管内污垢热阻
    Rfo: Rfo,         // 管外污垢热阻
    Rtotal: R_total,
    Ri_percentage: Ri_percentage,
    Ro_percentage: Ro_percentage,
    Rwall_percentage: Rwall_percentage,
    Rfi_percentage: Rfi_percentage,  // 管内污垢热阻占比
    Rfo_percentage: Rfo_percentage   // 管外污垢热阻占比
  };
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
  twistPitch = 0.0065,
  twistLobeCount = 6,
  innerTubeCount = 1,
  innerWallThickness = null,
  foulingInner = 0,  // 管内污垢热阻 (m²·K/W)
  foulingOuter = 0,  // 管外污垢热阻 (m²·K/W)
  tubeMaterial = 'stainless-steel-304',  // 内管材质ID
  twistToothHeight = 0.003  // 齿高 (m)，默认3mm
) {
  // 如果是麻花管，需要使用梅花截面的当量直径来计算
  if (isTwisted) {
    // 麻花管几何参数（基于技术文档的定义）
    // Do,max（峰顶外接圆）= 麻花管内径（管内径）
    // innerInnerDiameter 应该是麻花管内径
    const doMax = innerInnerDiameter; // 使用麻花管内径作为管内梅花截面的峰顶直径
    // Do,min（谷底内切圆）= Do,max - 2*h，其中h为齿高
    // 使用用户输入的齿高准确计算
    const doMin = doMax - 2 * twistToothHeight;
    
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
    
    // 环形通道流通面积应该基于谷底（doMin）计算，而不是峰顶（doMax）
    // 因为螺旋通道是由谷底与外管内壁之间的间隙形成的
    const outerInnerRadius = outerInnerDiameter / 2;
    const rMin = doMin / 2; // 谷底半径
    
    // 螺旋通道的流通面积 = 外管内径圆面积 - 麻花管谷底内切圆面积
    const rawAnnulusArea = Math.PI * Math.pow(outerInnerRadius, 2) - Math.PI * Math.pow(rMin, 2);
    
    // 考虑螺旋通道的实际有效流通面积
    // 由于是螺旋形，实际流通面积可能略小于横截面积
    const spiralChannelFactor = Math.max(0.8, Math.min(0.95, 1 - 0.05 * (0.1 / twistPitch)));
    const annulusArea = rawAnnulusArea * spiralChannelFactor;
    
    // 计算当量直径和湿周
    const outerPerimeter = Math.PI * outerInnerDiameter;
    // 麻花管谷底周长（考虑梅花截面）
    const innerValleyPerimeter = lobeSection.perimeter;
    // 当量直径：Dh = 4 * A / (P_outer + P_inner_valley)
    const hydraulicDiameter = (4 * annulusArea) / (outerPerimeter + innerValleyPerimeter);
    
    // 计算流速
    const annulusVelocity = coldFlowRate / (coldProps.density * annulusArea);
    
    // 计算雷诺数
    const annulusRe = calculateReynoldsNumber(
      coldProps.density,
      annulusVelocity,
      hydraulicDiameter,
      coldProps.viscosity
    );
    
    // 确保计算有效
    let ho;
    if (annulusArea > 0 && hydraulicDiameter > 0 && annulusRe > 0) {
      const annulusNu = calculateNusseltNumber(annulusRe, coldProps.prandtl, true);
      ho = calculateConvectiveHeatTransferCoefficient(
        annulusNu,
        coldProps.thermalConductivity,
        hydraulicDiameter
      );
    } else {
      // 如果环形空间无效，使用一个默认值或抛出错误
      ho = 1000; // 设置一个合理的默认值，避免除零
      console.warn('麻花管环形空间面积无效，使用默认传热系数');
    }
    
    // 计算传热面积（使用Do,max的周长，因为这是与外管接触的外表面）
    // 同时考虑螺旋增加的面积
    const baseContactPerimeter = Math.PI * doMax;
    const spiralLength = length * Math.sqrt(1 + Math.pow(Math.PI * doMax / twistPitch, 2));
    const totalInnerArea = baseContactPerimeter * spiralLength;
    const outerArea = Math.PI * outerOuterDiameter * length;
    const areaRatio = totalInnerArea / outerArea;
    
    // 计算管壁热阻（使用选定材质的导热系数）
    const tubeThermalConductivity = getMaterialThermalConductivity(tubeMaterial); // W/(m·K)
    let R_wall = 0;
    
    if (innerWallThickness && innerWallThickness > 0) {
      // 对于麻花管，使用Do,max计算平均直径
      const meanDiameter = (doMax + innerInnerDiameter) / 2;
      const meanArea = Math.PI * meanDiameter * length * innerTubeCount;
      R_wall = innerWallThickness / (tubeThermalConductivity * meanArea);
    }
    
    // 计算各热阻（基于外管外径面积）
    const Ri = 1 / (hi * areaRatio);
    const Ro = 1 / ho;
    const Rwall_scaled = R_wall * (outerArea / totalInnerArea);
    // 管内污垢热阻（折算到外径面积）：Rfi_scaled = Rfi * (Ai/Ao)
    const Rfi_scaled = foulingInner * areaRatio;
    // 管外污垢热阻：Rfo（已经是基于外径面积的）
    const Rfo = foulingOuter;
    
    const R_total = Ri + Ro + Rwall_scaled + Rfi_scaled + Rfo;
    const U_base = 1 / R_total;
    
    // 应用增强系数
    const E = calculateTwistedTubeEnhancementFactor(twistPitch, innerInnerDiameter, twistLobeCount);
    const limitedE = Math.min(2.5, Math.max(1.0, E));
    
    // 增强系数主要影响对流传热，热阻也会相应减小
    // 污垢热阻不受增强系数影响
    const U_enhanced = U_base * limitedE;
    const R_total_enhanced = 1 / U_enhanced;
    
    // 按比例调整各热阻（增强主要影响对流热阻，污垢热阻不变）
    const Ri_enhanced = Ri / limitedE;
    const Ro_enhanced = Ro / limitedE;
    // 污垢热阻不受增强影响，但需要重新计算总热阻
    const R_total_enhanced_recalc = Ri_enhanced + Ro_enhanced + Rwall_scaled + Rfi_scaled + Rfo;
    
    // 重新计算热阻分配比例
    const Ri_percentage = (Ri_enhanced / R_total_enhanced_recalc) * 100;
    const Ro_percentage = (Ro_enhanced / R_total_enhanced_recalc) * 100;
    const Rwall_percentage = (Rwall_scaled / R_total_enhanced_recalc) * 100;
    const Rfi_percentage = (Rfi_scaled / R_total_enhanced_recalc) * 100;
    const Rfo_percentage = (Rfo / R_total_enhanced_recalc) * 100;
    
    return {
      U: 1 / R_total_enhanced_recalc,  // 使用重新计算的总热阻
      hi: hi * limitedE,  // 增强后的传热系数
      ho: ho * limitedE,  // 增强后的传热系数
      Ri: Ri_enhanced,
      Ro: Ro_enhanced,
      Rwall: Rwall_scaled,
      Rfi: Rfi_scaled,    // 管内污垢热阻
      Rfo: Rfo,           // 管外污垢热阻
      Rtotal: R_total_enhanced_recalc,
      Ri_percentage: Ri_percentage,
      Ro_percentage: Ro_percentage,
      Rwall_percentage: Rwall_percentage,
      Rfi_percentage: Rfi_percentage,  // 管内污垢热阻占比
      Rfo_percentage: Rfo_percentage   // 管外污垢热阻占比
    };
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
      innerTubeCount,
      innerWallThickness,
      null,  // 外管壁厚暂时不使用
      foulingInner,
      foulingOuter,
      tubeMaterial
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
 * @param {string} hotPhaseIn - 入口相态：'single' 或 'twophase'（默认'single'）
 * @param {string} hotPhaseOut - 出口相态：'single' 或 'twophase'（默认'single'）
 * @param {number} hotQualityIn - 入口干度（两相流时必需，0-1）
 * @param {number} hotQualityOut - 出口干度（两相流时必需，0-1）
 * @returns {Promise<number>} 传热量 (W)
 */
export async function calculateHeatTransferRate(
  hotFluid,
  hotTin,
  hotTout,
  hotFlowRate,
  hotPressure,
  hotPhaseIn = 'single',
  hotPhaseOut = 'single',
  hotQualityIn = null,
  hotQualityOut = null
) {
  const hotTinK = hotTin + 273.15;
  const hotToutK = hotTout + 273.15;
  const hotPressurePa = hotPressure * 1000;

  let hIn, hOut;
  
  // 根据相态计算比焓
  if (hotPhaseIn === 'twophase' && hotQualityIn !== null && hotQualityIn !== undefined) {
    // 入口为两相流，使用饱和温度-压力-干度查询
    const satTemp = await getSaturationTemperature(hotFluid, hotPressurePa);
    const twoPhasePropsIn = await getFluidPropertiesTwoPhase(hotFluid, satTemp, hotPressurePa, hotQualityIn);
    hIn = twoPhasePropsIn.enthalpy;
  } else {
    // 入口为单相流，使用温度-压力查询
    hIn = await getEnthalpy(hotFluid, hotTinK, hotPressurePa);
  }
  
  if (hotPhaseOut === 'twophase' && hotQualityOut !== null && hotQualityOut !== undefined) {
    // 出口为两相流，使用饱和温度-压力-干度查询
    const satTemp = await getSaturationTemperature(hotFluid, hotPressurePa);
    const twoPhasePropsOut = await getFluidPropertiesTwoPhase(hotFluid, satTemp, hotPressurePa, hotQualityOut);
    hOut = twoPhasePropsOut.enthalpy;
  } else {
    // 出口为单相流，使用温度-压力查询
    hOut = await getEnthalpy(hotFluid, hotToutK, hotPressurePa);
  }

  // 计算比焓差（对于两相流，这会自动包含潜热）
  const deltaH = hIn - hOut;

  // 传热量 Q = m * Δh
  const Q = hotFlowRate * deltaH;

  return Q; // W
}

/**
 * 根据传热量计算所需流量（负荷输入法）
 * @param {string} fluid - 流体工质名称
 * @param {number} tin - 入口温度 (°C)
 * @param {number} tout - 出口温度 (°C)
 * @param {number} heatLoad - 传热量 (kW)
 * @param {number} pressure - 压力 (kPa)
 * @param {string} phaseIn - 入口相态：'single' 或 'twophase'（默认'single'）
 * @param {string} phaseOut - 出口相态：'single' 或 'twophase'（默认'single'）
 * @param {number} qualityIn - 入口干度（两相流时必需，0-1）
 * @param {number} qualityOut - 出口干度（两相流时必需，0-1）
 * @returns {Promise<number>} 所需质量流量 (kg/s)
 */
export async function calculateFlowRateFromHeatLoad(
  fluid,
  tin,
  tout,
  heatLoad,
  pressure,
  phaseIn = 'single',
  phaseOut = 'single',
  qualityIn = null,
  qualityOut = null
) {
  const tinK = tin + 273.15;
  const toutK = tout + 273.15;
  const pressurePa = pressure * 1000;
  const heatLoadW = heatLoad * 1000; // 转换为 W

  let hIn, hOut;
  
  // 根据相态计算比焓
  if (phaseIn === 'twophase' && qualityIn !== null && qualityIn !== undefined) {
    // 入口为两相流
    const satTemp = await getSaturationTemperature(fluid, pressurePa);
    const twoPhasePropsIn = await getFluidPropertiesTwoPhase(fluid, satTemp, pressurePa, qualityIn);
    hIn = twoPhasePropsIn.enthalpy;
  } else {
    // 入口为单相流
    hIn = await getEnthalpy(fluid, tinK, pressurePa);
  }
  
  if (phaseOut === 'twophase' && qualityOut !== null && qualityOut !== undefined) {
    // 出口为两相流
    const satTemp = await getSaturationTemperature(fluid, pressurePa);
    const twoPhasePropsOut = await getFluidPropertiesTwoPhase(fluid, satTemp, pressurePa, qualityOut);
    hOut = twoPhasePropsOut.enthalpy;
  } else {
    // 出口为单相流
    hOut = await getEnthalpy(fluid, toutK, pressurePa);
  }
  
  const deltaH = hIn - hOut;

  if (Math.abs(deltaH) < 1e-6) {
    throw new Error(`焓差过小，无法计算流量。入口和出口状态的焓几乎相同。`);
  }

  // 流量 m = Q / Δh
  const flowRate = heatLoadW / Math.abs(deltaH);

  return flowRate; // kg/s
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
 * 计算沿换热器长度的温度分布
 * @param {number} hotTin - 热流体入口温度 (°C)
 * @param {number} hotTout - 热流体出口温度 (°C)
 * @param {number} coldTin - 冷流体入口温度 (°C)
 * @param {number} coldTout - 冷流体出口温度 (°C)
 * @param {number} length - 换热器长度 (m)
 * @param {string} flowType - 流动方式: 'counter' (逆流) 或 'parallel' (并流)
 * @param {number} numPoints - 计算点数（默认100）
 * @param {Object} options - 可选参数
 * @param {boolean} options.hotIsCondensation - 热流体是否为冷凝过程
 * @param {number} options.hotSaturationTemp - 热流体饱和温度 (°C)，冷凝过程时必需
 * @param {boolean} options.coldIsEvaporation - 冷流体是否为蒸发过程
 * @param {number} options.coldSaturationTemp - 冷流体饱和温度 (°C)，蒸发过程时必需
 * @returns {Object} {positions: [位置数组 (m)], hotTemperatures: [热流体温度数组 (°C)], coldTemperatures: [冷流体温度数组 (°C)]}
 */
export function calculateTemperatureDistribution(
  hotTin,
  hotTout,
  coldTin,
  coldTout,
  length,
  flowType = 'counter',
  numPoints = 100,
  options = {}
) {
  const positions = [];
  const hotTemperatures = [];
  const coldTemperatures = [];
  
  const {
    hotIsCondensation = false,
    hotSaturationTemp = null,
    coldIsEvaporation = false,
    coldSaturationTemp = null
  } = options;
  
  // 计算温度变化率
  const hotTempChange = hotTout - hotTin; // 负值（降温）
  const coldTempChange = coldTout - coldTin; // 正值（升温）
  
  // 对于冷凝过程，判断是否有过热段、冷凝段、过冷段
  let hotSuperheatStart = null; // 过热段开始位置比例
  let hotSuperheatEnd = null;   // 过热段结束位置比例（冷凝段开始）
  let hotCondensationEnd = null; // 冷凝段结束位置比例（过冷段开始）
  
  if (hotIsCondensation && hotSaturationTemp !== null) {
    // 判断入口是否过热
    const isInletSuperheated = hotTin > hotSaturationTemp;
    // 判断出口是否过冷
    const isOutletSubcooled = hotTout < hotSaturationTemp;
    
    if (isInletSuperheated && isOutletSubcooled) {
      // 三段：过热蒸汽冷却 -> 冷凝 -> 过冷液体冷却
      // 需要计算各段的长度比例（基于焓值或简化假设）
      // 简化：假设过热段和过冷段各占20%，冷凝段占60%
      hotSuperheatStart = 0;
      hotSuperheatEnd = 0.2;
      hotCondensationEnd = 0.8;
    } else if (isInletSuperheated) {
      // 两段：过热蒸汽冷却 -> 冷凝
      hotSuperheatStart = 0;
      hotSuperheatEnd = 0.3; // 假设过热段占30%
      hotCondensationEnd = 1.0;
    } else if (isOutletSubcooled) {
      // 两段：冷凝 -> 过冷液体冷却
      hotSuperheatStart = null;
      hotSuperheatEnd = 0;
      hotCondensationEnd = 0.7; // 假设冷凝段占70%
    } else {
      // 纯冷凝段
      hotSuperheatStart = null;
      hotSuperheatEnd = 0;
      hotCondensationEnd = 1.0;
    }
  }
  
  // 对于蒸发过程，判断是否有过冷段、蒸发段、过热段
  let coldSubcoolStart = null;
  let coldSubcoolEnd = null;
  let coldEvaporationEnd = null;
  
  if (coldIsEvaporation && coldSaturationTemp !== null) {
    const isInletSubcooled = coldTin < coldSaturationTemp;
    const isOutletSuperheated = coldTout > coldSaturationTemp;
    
    if (isInletSubcooled && isOutletSuperheated) {
      // 三段：过冷液体加热 -> 蒸发 -> 过热蒸汽加热
      coldSubcoolStart = 0;
      coldSubcoolEnd = 0.2;
      coldEvaporationEnd = 0.8;
    } else if (isInletSubcooled) {
      // 两段：过冷液体加热 -> 蒸发
      coldSubcoolStart = 0;
      coldSubcoolEnd = 0.3;
      coldEvaporationEnd = 1.0;
    } else if (isOutletSuperheated) {
      // 两段：蒸发 -> 过热蒸汽加热
      coldSubcoolStart = null;
      coldSubcoolEnd = 0;
      coldEvaporationEnd = 0.7;
    } else {
      // 纯蒸发段
      coldSubcoolStart = null;
      coldSubcoolEnd = 0;
      coldEvaporationEnd = 1.0;
    }
  }
  
  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * length; // 沿管长的位置 (m)
    const ratio = i / numPoints; // 位置比例 (0-1)
    positions.push(x);
    
    // 计算热流体温度
    let hotT;
    if (hotIsCondensation && hotSaturationTemp !== null) {
      if (hotSuperheatStart !== null && ratio <= hotSuperheatEnd) {
        // 过热段：从入口温度线性下降到饱和温度
        const superheatRatio = ratio / hotSuperheatEnd;
        hotT = hotTin + (hotSaturationTemp - hotTin) * superheatRatio;
      } else if (ratio <= hotCondensationEnd) {
        // 冷凝段：温度保持在饱和温度
        hotT = hotSaturationTemp;
      } else {
        // 过冷段：从饱和温度线性下降到出口温度
        const subcoolRatio = (ratio - hotCondensationEnd) / (1 - hotCondensationEnd);
        hotT = hotSaturationTemp + (hotTout - hotSaturationTemp) * subcoolRatio;
      }
    } else {
      // 单相流：线性变化
      hotT = hotTin + (hotTempChange * ratio);
    }
    hotTemperatures.push(hotT);
    
    // 计算冷流体温度
    let coldT;
    if (flowType === 'counter') {
      // 逆流：冷流体从出口到入口
      const coldRatio = 1 - ratio; // 逆流时位置相反
      
      if (coldIsEvaporation && coldSaturationTemp !== null) {
        if (coldSubcoolStart !== null && coldRatio <= coldSubcoolEnd) {
          // 过冷段：从入口温度线性上升到饱和温度
          const subcoolRatio = coldRatio / coldSubcoolEnd;
          coldT = coldTin + (coldSaturationTemp - coldTin) * subcoolRatio;
        } else if (coldRatio <= coldEvaporationEnd) {
          // 蒸发段：温度保持在饱和温度
          coldT = coldSaturationTemp;
        } else {
          // 过热段：从饱和温度线性上升到出口温度
          const superheatRatio = (coldRatio - coldEvaporationEnd) / (1 - coldEvaporationEnd);
          coldT = coldSaturationTemp + (coldTout - coldSaturationTemp) * superheatRatio;
        }
      } else {
        // 单相流：线性变化
        coldT = coldTout - (coldTempChange * ratio);
      }
    } else {
      // 并流：冷流体从入口到出口
      if (coldIsEvaporation && coldSaturationTemp !== null) {
        if (coldSubcoolStart !== null && ratio <= coldSubcoolEnd) {
          // 过冷段：从入口温度线性上升到饱和温度
          const subcoolRatio = ratio / coldSubcoolEnd;
          coldT = coldTin + (coldSaturationTemp - coldTin) * subcoolRatio;
        } else if (ratio <= coldEvaporationEnd) {
          // 蒸发段：温度保持在饱和温度
          coldT = coldSaturationTemp;
        } else {
          // 过热段：从饱和温度线性上升到出口温度
          const superheatRatio = (ratio - coldEvaporationEnd) / (1 - coldEvaporationEnd);
          coldT = coldSaturationTemp + (coldTout - coldSaturationTemp) * superheatRatio;
        }
      } else {
        // 单相流：线性变化
        coldT = coldTin + (coldTempChange * ratio);
      }
    }
    coldTemperatures.push(coldT);
  }
  
  return {
    positions: positions,          // 位置数组 (m)
    hotTemperatures: hotTemperatures,    // 热流体温度数组 (°C)
    coldTemperatures: coldTemperatures   // 冷流体温度数组 (°C)
  };
}

/**
 * 计算湍流摩擦系数（Swamee-Jain公式）
 * @param {number} re - 雷诺数
 * @param {number} relativeRoughness - 相对粗糙度（ε/D）
 * @returns {number} 摩擦系数
 */
function calculateTurbulentFrictionFactor(re, relativeRoughness) {
  // Swamee-Jain 公式（显式，适用于 Re > 4000）
  // f = 0.25 / [log10(ε/(3.7D) + 5.74/Re^0.9)]^2
  const term = relativeRoughness / 3.7 + 5.74 / Math.pow(re, 0.9);
  return 0.25 / Math.pow(Math.log10(term), 2);
}

/**
 * 计算摩擦系数（Moody摩擦系数）
 * @param {number} re - 雷诺数
 * @param {number} relativeRoughness - 相对粗糙度（ε/D），光滑管默认0.0001
 * @returns {number} 摩擦系数
 */
export function calculateFrictionFactor(re, relativeRoughness = 0.0001) {
  if (re < 2300) {
    // 层流：f = 64/Re
    return 64 / re;
  } else if (re < 3000) {
    // 过渡流：使用插值
    const laminarF = 64 / 2300;
    const turbulentF = calculateTurbulentFrictionFactor(3000, relativeRoughness);
    const ratio = (re - 2300) / 700;
    return laminarF * (1 - ratio) + turbulentF * ratio;
  } else {
    // 湍流：使用 Swamee-Jain 公式（显式，避免迭代）
    return calculateTurbulentFrictionFactor(re, relativeRoughness);
  }
}

/**
 * 计算管内摩擦阻力损失
 * @param {number} density - 流体密度 (kg/m³)
 * @param {number} velocity - 流速 (m/s)
 * @param {number} length - 管长 (m)
 * @param {number} diameter - 管径 (m) - 对于麻花管使用当量直径
 * @param {number} re - 雷诺数
 * @param {number} relativeRoughness - 相对粗糙度（可选，默认0.0001）
 * @param {number} passCount - 流程数量（用于多流程）
 * @param {number} frictionFactor - 可选的预计算摩擦系数（如果提供，将使用此值而不是重新计算）
 * @returns {Object} {pressureDrop: 压降 (Pa), pressureDrop_kPa: 压降 (kPa), frictionFactor: 摩擦系数}
 */
export function calculateInnerTubePressureDrop(
  density,
  velocity,
  length,
  diameter,
  re,
  relativeRoughness = 0.0001,
  passCount = 1,
  frictionFactor = null
) {
  // 如果提供了摩擦系数，直接使用；否则计算
  const f = frictionFactor !== null && frictionFactor > 0 ? frictionFactor : calculateFrictionFactor(re, relativeRoughness);
  
  // 摩擦压降：Δp = f × (L/D) × (ρv²/2)
  // 对于多流程，总长度 = 单流程长度 × 流程数
  const totalLength = length * passCount;
  const pressureDrop = f * (totalLength / diameter) * (density * velocity * velocity / 2);
  
  return {
    pressureDrop: pressureDrop,              // Pa
    pressureDrop_kPa: pressureDrop / 1000,   // kPa
    frictionFactor: f
  };
}

/**
 * 计算环形空间摩擦阻力损失
 * @param {number} density - 流体密度 (kg/m³)
 * @param {number} velocity - 流速 (m/s)
 * @param {number} length - 管长 (m)
 * @param {number} hydraulicDiameter - 当量直径 (m)
 * @param {number} re - 雷诺数
 * @param {number} relativeRoughness - 相对粗糙度（可选，默认0.0001）
 * @param {number} passCount - 流程数量
 * @returns {Object} {pressureDrop: 压降 (Pa), pressureDrop_kPa: 压降 (kPa), frictionFactor: 摩擦系数}
 */
export function calculateAnnulusPressureDrop(
  density,
  velocity,
  length,
  hydraulicDiameter,
  re,
  relativeRoughness = 0.0001,
  passCount = 1
) {
  // 计算摩擦系数
  const f = calculateFrictionFactor(re, relativeRoughness);
  
  // 摩擦压降：Δp = f × (L/Dh) × (ρv²/2)
  const totalLength = length * passCount;
  const pressureDrop = f * (totalLength / hydraulicDiameter) * (density * velocity * velocity / 2);
  
  return {
    pressureDrop: pressureDrop,              // Pa
    pressureDrop_kPa: pressureDrop / 1000,   // kPa
    frictionFactor: f
  };
}

/**
 * 计算两相流压降（Lockhart-Martinelli方法）
 * @param {Object} liquidProps - 饱和液体物性
 * @param {Object} vaporProps - 饱和蒸汽物性
 * @param {number} quality - 干度 (0-1)
 * @param {number} massFlux - 质量通量 (kg/m²/s)
 * @param {number} diameter - 管内径 (m)
 * @param {number} length - 管长 (m)
 * @param {number} relativeRoughness - 相对粗糙度（默认0.0001）
 * @returns {Object} {pressureDrop: 压降 (Pa), pressureDrop_kPa: 压降 (kPa), frictionFactor: 摩擦系数}
 */
export function calculateTwoPhasePressureDrop(
  liquidProps,
  vaporProps,
  quality,
  massFlux,
  diameter,
  length,
  relativeRoughness = 0.0001
) {
  const G = massFlux; // 质量通量 kg/m²/s
  const Di = diameter; // 管内径 m
  const x = quality; // 干度
  const L = length; // 管长 m
  
  // 液体物性
  const rhoL = liquidProps.density;
  const muL = liquidProps.viscosity;
  
  // 蒸汽物性
  const rhoV = vaporProps.density;
  const muV = vaporProps.viscosity;
  
  // 计算单相流压降（假设全部为液体或全部为蒸汽）
  const ReL = (G * (1 - x) * Di) / muL; // 假设全部为液体
  const ReV = (G * x * Di) / muV;       // 假设全部为蒸汽
  
  const fL = calculateFrictionFactor(ReL, relativeRoughness); // 液体摩擦系数
  const fV = calculateFrictionFactor(ReV, relativeRoughness); // 蒸汽摩擦系数
  
  // 单相流压降
  const deltaPL = fL * (L / Di) * (rhoL * Math.pow(G * (1 - x) / rhoL, 2) / 2);
  const deltaPV = fV * (L / Di) * (rhoV * Math.pow(G * x / rhoV, 2) / 2);
  
  // Lockhart-Martinelli参数
  const X = Math.sqrt(deltaPL / deltaPV);
  
  // Martinelli因子（湍流-湍流）
  // 使用Chisholm关联式：Φ² = 1 + C/X + 1/X²
  // C值根据流型选择：液体湍流-蒸汽湍流，C = 20
  let C = 20; // 默认：液体湍流-蒸汽湍流
  if (ReL < 2300 && ReV < 2300) {
    C = 5; // 液体层流-蒸汽层流
  } else if (ReL < 2300 && ReV >= 2300) {
    C = 12; // 液体层流-蒸汽湍流
  } else if (ReL >= 2300 && ReV < 2300) {
    C = 10; // 液体湍流-蒸汽层流
  }
  
  // 两相流倍增因子
  const phiL2 = 1 + C / X + 1 / (X * X);
  
  // 两相流压降（以液体为基准）
  const deltaPTP = phiL2 * deltaPL;
  
  // 等效摩擦系数（用于显示）
  const equivFrictionFactor = fL * phiL2;
  
  return {
    pressureDrop: deltaPTP,
    pressureDrop_kPa: deltaPTP / 1000,
    frictionFactor: equivFrictionFactor
  };
}

/**
 * 计算麻花管的摩擦系数修正（考虑螺旋和梅花截面）
 * @param {number} baseFrictionFactor - 直管基准摩擦系数
 * @param {number} twistPitch - 螺旋节距 (m)
 * @param {number} innerDiameter - 内径 (m)
 * @param {number} lobeCount - 头数
 * @returns {number} 修正后的摩擦系数
 */
export function calculateTwistedTubeFrictionFactor(
  baseFrictionFactor,
  twistPitch,
  innerDiameter,
  lobeCount = 4
) {
  if (!twistPitch || !innerDiameter) return baseFrictionFactor;
  
  const aspectRatio = twistPitch / innerDiameter;
  
  // 螺旋引起的摩擦系数增加
  // 节距越小，摩擦系数越大
  const spiralFactor = Math.max(1.0, Math.min(2.0, 1.2 / Math.sqrt(aspectRatio)));
  
  // 梅花截面引起的摩擦系数增加
  // 头数越多，摩擦系数越大
  const lobeFactor = 1.0 + (lobeCount - 3) * 0.15;
  
  // 总修正系数（通常在1.5-3.0之间）
  const totalFactor = spiralFactor * lobeFactor;
  
  return baseFrictionFactor * Math.min(3.0, Math.max(1.0, totalFactor));
}

/**
 * 套管换热器完整计算
 * @param {Object} params - 计算参数
 * @returns {Promise<Object>} 计算结果
 */
export async function calculateHeatExchanger(params) {
  const {
    inputMode = 'flowrate', // 'flowrate' 或 'load'
    heatLoad = null,        // 负荷输入法时的传热量 (kW)
    hotFluid,
    hotTin,
    hotTout,
    hotFlowRate,
    hotPressure = null,     // 压力 (kPa) - 必须输入
    hotProcessType = 'cooling',  // 'cooling'（冷却）, 'condensation'（冷凝）
    hotStateIn = null,      // 入口状态：0=液体，1=气体，0-1=两相（干度）
    hotStateOut = null,     // 出口状态：0=液体，1=气体，0-1=两相（干度）
    // 向后兼容的旧参数
    hotPhaseIn = null,      // 已弃用，从hotStateIn推导
    hotPhaseOut = null,     // 已弃用，从hotStateOut推导
    hotQualityIn = null,    // 已弃用，从hotStateIn推导
    hotQualityOut = null,   // 已弃用，从hotStateOut推导
    coldFluid,
    coldTin,
    coldTout,
    coldFlowRate,
    coldPressure = null,    // 压力 (kPa) - 如果为null，将从饱和温度计算
    coldProcessType = 'cooling',  // 'cooling'（加热）, 'evaporation'（蒸发）
    coldStateIn = null,     // 入口状态：0=液体，1=气体，0-1=两相（干度）
    coldStateOut = null,    // 出口状态：0=液体，1=气体，0-1=两相（干度）
    coldSaturationTemp = null, // 饱和温度 (°C) - 用于计算压力
    // 向后兼容的旧参数
    coldPhaseIn = null,     // 已弃用，从coldStateIn推导
    coldPhaseOut = null,    // 已弃用，从coldStateOut推导
    coldQualityIn = null,   // 已弃用，从coldStateIn推导
    coldQualityOut = null,  // 已弃用，从coldStateOut推导
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
    twistPitch = 0.0065, // 螺旋节距/齿距 (m)，默认6.5mm
    twistLobeCount = 6, // 麻花管头数（瓣数），默认6头
    twistToothHeight = 0.003, // 齿高 (m)，默认3mm
    twistWallThickness = null, // 麻花管壁厚（null表示使用内管壁厚）
    twistOuterDiameter = null, // 麻花管外径（null表示使用外管内径，贴合状态）
    innerWallThickness = null, // 内管壁厚 (m)
    tubeMaterial = 'stainless-steel-304',  // 内管材质ID
    foulingInner = 0,  // 管内污垢热阻 (m²·K/W)
    foulingOuter = 0,  // 管外污垢热阻 (m²·K/W)
    passCount = 1, // 流程数量
    outerTubeCountPerPass = 1, // 每流程外管数量
    hotFluidLocation = 'inner'  // 'inner' 或 'outer' - 热流体在管内或管外
  } = params;
  
  // 将状态值转换为相态和干度（如果提供了状态值）
  // 状态值：0=液体，1=气体，0-1=两相（干度值）
  const convertStateToPhase = (state) => {
    if (state === null || state === undefined) return { phase: 'single', quality: null };
    if (state === 0) return { phase: 'single', quality: null }; // 液体
    if (state === 1) return { phase: 'single', quality: null }; // 气体
    if (state > 0 && state < 1) return { phase: 'twophase', quality: state }; // 两相，状态值即为干度
    return { phase: 'single', quality: null };
  };
  
  // 转换热流体状态值（优先使用状态值，否则使用旧的相态参数以保持向后兼容）
  // 注意：对于冷凝/蒸发过程，如果状态值从1→0或0→1，虽然入口和出口都是单相，但过程中有相变，需要按两相流处理
  const hotPhaseInConverted = hotStateIn !== null && hotStateIn !== undefined ? convertStateToPhase(hotStateIn) : 
                              (hotPhaseIn ? { phase: hotPhaseIn, quality: hotQualityIn } : { phase: 'single', quality: null });
  const hotPhaseOutConverted = hotStateOut !== null && hotStateOut !== undefined ? convertStateToPhase(hotStateOut) : 
                               (hotPhaseOut ? { phase: hotPhaseOut, quality: hotQualityOut } : { phase: 'single', quality: null });
  
  // 如果入口和出口状态值都是0或1，但过程类型是冷凝/蒸发，说明有相变
  // 需要将其中一个改为twophase，并设置平均干度
  const hotHasPhaseChange = (hotStateIn === 1 && hotStateOut === 0) || (hotStateIn === 0 && hotStateOut === 1);
  if (hotProcessType === 'condensation' && hotHasPhaseChange) {
    // 冷凝过程：气体→液体，入口为twophase（干度接近1），出口为twophase（干度接近0）
    // 为了压降计算，我们将入口和出口都标记为twophase，并使用平均干度
    hotPhaseInConverted.phase = 'twophase';
    hotPhaseInConverted.quality = hotStateIn === 1 ? 0.95 : (hotStateIn === 0 ? 0.05 : 0.5); // 接近入口状态
    hotPhaseOutConverted.phase = 'twophase';
    hotPhaseOutConverted.quality = hotStateOut === 1 ? 0.95 : (hotStateOut === 0 ? 0.05 : 0.5); // 接近出口状态
  }
  
  // 转换冷流体状态值（优先使用状态值，否则使用旧的相态参数以保持向后兼容）
  // 注意：对于蒸发过程，如果状态值从0→1，虽然入口和出口都是单相，但过程中有相变，需要按两相流处理
  const coldPhaseInConverted = coldStateIn !== null && coldStateIn !== undefined ? convertStateToPhase(coldStateIn) : 
                               (coldPhaseIn ? { phase: coldPhaseIn, quality: coldQualityIn } : { phase: 'single', quality: null });
  const coldPhaseOutConverted = coldStateOut !== null && coldStateOut !== undefined ? convertStateToPhase(coldStateOut) : 
                                (coldPhaseOut ? { phase: coldPhaseOut, quality: coldQualityOut } : { phase: 'single', quality: null });
  
  // 如果入口和出口状态值都是0或1，但过程类型是蒸发，说明有相变
  // 需要将其中一个改为twophase，并设置平均干度
  const coldHasPhaseChange = (coldStateIn === 0 && coldStateOut === 1) || (coldStateIn === 1 && coldStateOut === 0);
  if (coldProcessType === 'evaporation' && coldHasPhaseChange) {
    // 蒸发过程：液体→气体，入口为twophase（干度接近0），出口为twophase（干度接近1）
    // 为了压降计算，我们将入口和出口都标记为twophase，并使用平均干度
    coldPhaseInConverted.phase = 'twophase';
    coldPhaseInConverted.quality = coldStateIn === 1 ? 0.95 : (coldStateIn === 0 ? 0.05 : 0.5); // 接近入口状态
    coldPhaseOutConverted.phase = 'twophase';
    coldPhaseOutConverted.quality = coldStateOut === 1 ? 0.95 : (coldStateOut === 0 ? 0.05 : 0.5); // 接近出口状态
  }
  
  // 直接使用输入的压力（不再从饱和温度计算）
  if (!hotPressure || hotPressure <= 0) {
    throw new Error('热流体压力必须输入且大于0');
  }
  if (!coldPressure || coldPressure <= 0) {
    throw new Error('冷流体压力必须输入且大于0');
  }
  
  const actualHotPressure = hotPressure;
  const actualColdPressure = coldPressure;
  
  // 如果热流体在管外，交换热流体和冷流体的参数（用于内部计算）
  // 但保持原始参数以便最终结果显示
  let calcHotFluid = hotFluid;
  let calcHotTin = hotTin;
  let calcHotTout = hotTout;
  let calcHotFlowRate = hotFlowRate;
  let calcHotPressure = actualHotPressure;
  let calcHotPhaseIn = hotPhaseInConverted.phase;
  let calcHotPhaseOut = hotPhaseOutConverted.phase;
  let calcHotQualityIn = hotPhaseInConverted.quality;
  let calcHotQualityOut = hotPhaseOutConverted.quality;
  let calcColdFluid = coldFluid;
  let calcColdTin = coldTin;
  let calcColdTout = coldTout;
  let calcColdFlowRate = coldFlowRate;
  let calcColdPressure = actualColdPressure;
  let calcColdPhaseIn = coldPhaseInConverted.phase;
  let calcColdPhaseOut = coldPhaseOutConverted.phase;
  let calcColdQualityIn = coldPhaseInConverted.quality;
  let calcColdQualityOut = coldPhaseOutConverted.quality;
  
  // 创建可交换的过程类型变量
  let calcHotProcessType = hotProcessType;
  let calcColdProcessType = coldProcessType;
  
  if (hotFluidLocation === 'outer') {
    // 交换参数：计算时将热流体当作管内流体，冷流体当作管外流体
    [calcHotFluid, calcColdFluid] = [calcColdFluid, calcHotFluid];
    [calcHotTin, calcColdTin] = [calcColdTin, calcHotTin];
    [calcHotTout, calcColdTout] = [calcColdTout, calcHotTout];
    [calcHotFlowRate, calcColdFlowRate] = [calcColdFlowRate, calcHotFlowRate];
    [calcHotPressure, calcColdPressure] = [calcColdPressure, calcHotPressure];
    [calcHotPhaseIn, calcColdPhaseIn] = [calcColdPhaseIn, calcHotPhaseIn];
    [calcHotPhaseOut, calcColdPhaseOut] = [calcColdPhaseOut, calcHotPhaseOut];
    [calcHotQualityIn, calcColdQualityIn] = [calcColdQualityIn, calcHotQualityIn];
    [calcHotQualityOut, calcColdQualityOut] = [calcColdQualityOut, calcHotQualityOut];
    // 交换过程类型
    [calcHotProcessType, calcColdProcessType] = [calcColdProcessType, calcHotProcessType];
  }
  
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
    // 1. 根据输入模式计算传热量和流量
    let Q; // 传热量 (W)
    // 使用计算用的参数（如果热流体在管外，已经交换过）
    let actualHotFlowRate = calcHotFlowRate;
    let actualColdFlowRate = calcColdFlowRate;
    let calculatedHotFlowRate = null;
    let calculatedColdFlowRate = null;

    if (inputMode === 'load') {
      // 负荷输入法：根据传热量计算流量
      if (heatLoad === null || heatLoad === undefined || heatLoad <= 0) {
        throw new Error('负荷输入法模式下，传热量必须大于0');
      }
      
      console.log(`[负荷输入法] 输入传热量: ${heatLoad} kW`);
      Q = heatLoad * 1000; // 转换为 W
      console.log(`[负荷输入法] 转换后传热量: ${Q} W`);
      
      // 计算热流体所需流量（使用计算用的参数）
      try {
        calculatedHotFlowRate = await calculateFlowRateFromHeatLoad(
          calcHotFluid,
          calcHotTin,
          calcHotTout,
          heatLoad,
          calcHotPressure,
          calcHotPhaseIn,
          calcHotPhaseOut,
          calcHotQualityIn,
          calcHotQualityOut
        );
        if (!calculatedHotFlowRate || calculatedHotFlowRate <= 0) {
          throw new Error(`热流体流量计算失败，计算结果无效: ${calculatedHotFlowRate}`);
        }
        actualHotFlowRate = calculatedHotFlowRate;
        console.log(`[负荷输入法] 计算出的热流体流量（计算用）: ${calculatedHotFlowRate} kg/s`);
      } catch (error) {
        throw new Error(`计算热流体流量失败: ${error.message}`);
      }
      
      // 计算冷流体所需流量（使用计算用的参数）
      try {
        calculatedColdFlowRate = await calculateFlowRateFromHeatLoad(
          calcColdFluid,
          calcColdTin,
          calcColdTout,
          heatLoad,
          calcColdPressure,
          calcColdPhaseIn,
          calcColdPhaseOut,
          calcColdQualityIn,
          calcColdQualityOut
        );
        if (!calculatedColdFlowRate || calculatedColdFlowRate <= 0) {
          throw new Error(`冷流体流量计算失败，计算结果无效: ${calculatedColdFlowRate}`);
        }
        actualColdFlowRate = calculatedColdFlowRate;
        console.log(`[负荷输入法] 计算出的冷流体流量（计算用）: ${calculatedColdFlowRate} kg/s`);
      } catch (error) {
        throw new Error(`计算冷流体流量失败: ${error.message}`);
      }
    } else {
      // 流量输入法：根据流量计算传热量
      if (!hotFlowRate || hotFlowRate <= 0) {
        throw new Error('流量输入法模式下，热流体流量必须大于0');
      }
      if (!coldFlowRate || coldFlowRate <= 0) {
        throw new Error('流量输入法模式下，冷流体流量必须大于0');
      }
      Q = await calculateHeatTransferRate(
        calcHotFluid,
        calcHotTin,
        calcHotTout,
        actualHotFlowRate,
        calcHotPressure,
        calcHotPhaseIn,
        calcHotPhaseOut,
        calcHotQualityIn,
        calcHotQualityOut
      );
    }

    // 2. 计算 LMTD
    const lmtd = calculateLMTD(hotTin, hotTout, coldTin, coldTout, flowType);

    // 3. 计算传热系数和阻力损失
    let U;
    let innerPressureDrop = null;
    let annulusPressureDrop = null;
    let innerFrictionFactor = null;
    let annulusFrictionFactor = null;
    let hotProps = null;
    let coldProps = null;
    
    // 热阻相关信息
    let heatTransferResult = null;
    let Ri_percentage = null;
    let Ro_percentage = null;
    let Rwall_percentage = null;
    let Rfi_percentage = null;  // 管内污垢热阻占比
    let Rfo_percentage = null;  // 管外污垢热阻占比
    let hi = null;
    let ho = null;

    if (givenU && givenU > 0) {
      // 使用给定的传热系数，但仍需要计算阻力损失
      U = givenU;
      
      // 获取物性用于阻力损失计算（使用计算用的参数）
      const calcHotTavg = (calcHotTin + calcHotTout) / 2 + 273.15;
      const calcColdTavg = (calcColdTin + calcColdTout) / 2 + 273.15;
      const calcHotPressurePa = calcHotPressure * 1000;
      const calcColdPressurePa = calcColdPressure * 1000;

      // 根据相态查询物性
      // 判断是否为冷凝/蒸发过程（有相变）
      const hotHasPhaseChange = (hotStateIn === 1 && hotStateOut === 0) || (hotStateIn === 0 && hotStateOut === 1);
      const coldHasPhaseChange = (coldStateIn === 1 && coldStateOut === 0) || (coldStateIn === 0 && coldStateOut === 1);
      const hotIsCondensation = calcHotProcessType === 'condensation' && hotHasPhaseChange;
      const coldIsCondensation = calcColdProcessType === 'condensation' && coldHasPhaseChange;
      const hotIsEvaporation = calcHotProcessType === 'evaporation' && hotHasPhaseChange;
      const coldIsEvaporation = calcColdProcessType === 'evaporation' && coldHasPhaseChange;
      
      const hotIsTwoPhase = calcHotPhaseIn === 'twophase' || calcHotPhaseOut === 'twophase' || hotIsCondensation || hotIsEvaporation;
      const coldIsTwoPhase = calcColdPhaseIn === 'twophase' || calcColdPhaseOut === 'twophase' || coldIsCondensation || coldIsEvaporation;
      
      const hotQualityAvg = hotIsTwoPhase && (calcHotQualityIn !== null || calcHotQualityOut !== null) 
        ? ((calcHotQualityIn || 0) + (calcHotQualityOut || 0)) / 2 
        : (hotIsCondensation || hotIsEvaporation ? 0.5 : null);
      const coldQualityAvg = coldIsTwoPhase && (calcColdQualityIn !== null || calcColdQualityOut !== null)
        ? ((calcColdQualityIn || 0) + (calcColdQualityOut || 0)) / 2 
        : (coldIsCondensation || coldIsEvaporation ? 0.5 : null);

      [hotProps, coldProps] = await Promise.all([
        hotIsTwoPhase && hotQualityAvg !== null
          ? getFluidPropertiesTwoPhase(calcHotFluid, calcHotTavg, calcHotPressurePa, hotQualityAvg)
          : getFluidProperties(calcHotFluid, calcHotTavg, calcHotPressurePa),
        coldIsTwoPhase && coldQualityAvg !== null
          ? getFluidPropertiesTwoPhase(calcColdFluid, calcColdTavg, calcColdPressurePa, coldQualityAvg)
          : getFluidProperties(calcColdFluid, calcColdTavg, calcColdPressurePa)
      ]);
    } else {
      // 自动计算传热系数（使用计算用的参数）
      const calcHotTavg = (calcHotTin + calcHotTout) / 2 + 273.15;
      const calcColdTavg = (calcColdTin + calcColdTout) / 2 + 273.15;
      const calcHotPressurePa = calcHotPressure * 1000;
      const calcColdPressurePa = calcColdPressure * 1000;

      // 根据相态查询物性
      // 判断是否为冷凝/蒸发过程（有相变）
      const hotHasPhaseChange = (hotStateIn === 1 && hotStateOut === 0) || (hotStateIn === 0 && hotStateOut === 1);
      const coldHasPhaseChange = (coldStateIn === 1 && coldStateOut === 0) || (coldStateIn === 0 && coldStateOut === 1);
      const hotIsCondensation = calcHotProcessType === 'condensation' && hotHasPhaseChange;
      const coldIsCondensation = calcColdProcessType === 'condensation' && coldHasPhaseChange;
      const hotIsEvaporation = calcHotProcessType === 'evaporation' && hotHasPhaseChange;
      const coldIsEvaporation = calcColdProcessType === 'evaporation' && coldHasPhaseChange;
      
      const hotIsTwoPhase = calcHotPhaseIn === 'twophase' || calcHotPhaseOut === 'twophase' || hotIsCondensation || hotIsEvaporation;
      const coldIsTwoPhase = calcColdPhaseIn === 'twophase' || calcColdPhaseOut === 'twophase' || coldIsCondensation || coldIsEvaporation;
      
      const hotQualityAvg = hotIsTwoPhase && (calcHotQualityIn !== null || calcHotQualityOut !== null) 
        ? ((calcHotQualityIn || 0) + (calcHotQualityOut || 0)) / 2 
        : (hotIsCondensation || hotIsEvaporation ? 0.5 : null);
      const coldQualityAvg = coldIsTwoPhase && (calcColdQualityIn !== null || calcColdQualityOut !== null)
        ? ((calcColdQualityIn || 0) + (calcColdQualityOut || 0)) / 2 
        : (coldIsCondensation || coldIsEvaporation ? 0.5 : null);

      [hotProps, coldProps] = await Promise.all([
        hotIsTwoPhase && hotQualityAvg !== null
          ? getFluidPropertiesTwoPhase(calcHotFluid, calcHotTavg, calcHotPressurePa, hotQualityAvg)
          : getFluidProperties(calcHotFluid, calcHotTavg, calcHotPressurePa),
        coldIsTwoPhase && coldQualityAvg !== null
          ? getFluidPropertiesTwoPhase(calcColdFluid, calcColdTavg, calcColdPressurePa, coldQualityAvg)
          : getFluidProperties(calcColdFluid, calcColdTavg, calcColdPressurePa)
      ]);

      // 确定使用的壁厚（麻花管使用twistWallThickness，否则使用innerWallThickness）
      // 如果参数中未提供innerWallThickness，从几何尺寸计算
      let actualInnerWallThickness = innerWallThickness;
      if (!actualInnerWallThickness || actualInnerWallThickness <= 0) {
        // 从内外径差计算壁厚
        actualInnerWallThickness = (innerDiameter - innerInnerDiameter) / 2;
      }
      
      // 麻花管模式下使用twistWallThickness或计算出的壁厚
      const wallThickness = actualIsTwisted ? (twistWallThickness || actualInnerWallThickness) : actualInnerWallThickness;
      
      heatTransferResult = await calculateOverallHeatTransferCoefficient(
        hotProps,
        coldProps,
        actualInnerOuterDiameter, // 内管外径（麻花管模式下等于外管内径）
        outerDiameter, // 外管外径
        actualInnerInnerDiameter, // 内管内径（麻花管模式下重新计算）
        outerInnerDiameter, // 外管内径
        actualHotFlowRate,  // 使用实际流量（可能是计算值）
        actualColdFlowRate, // 使用实际流量（可能是计算值）
        length,
        actualIsTwisted,
        twistPitch,
        twistLobeCount,
        innerTubeCount,
        wallThickness,
        foulingInner,  // 管内污垢热阻
        foulingOuter,  // 管外污垢热阻
        tubeMaterial,  // 内管材质
        twistToothHeight  // 齿高
      );
      
      // 处理返回的结果对象
      if (typeof heatTransferResult === 'object' && heatTransferResult.U) {
        U = heatTransferResult.U;
        hi = heatTransferResult.hi;
        ho = heatTransferResult.ho;
        Ri_percentage = heatTransferResult.Ri_percentage;
        Ro_percentage = heatTransferResult.Ro_percentage;
        Rwall_percentage = heatTransferResult.Rwall_percentage;
        Rfi_percentage = heatTransferResult.Rfi_percentage;
        Rfo_percentage = heatTransferResult.Rfo_percentage;
      } else {
        // 兼容旧版本（返回单个数值）
        U = heatTransferResult;
      }
    }

    // 计算管内阻力损失
    // 重构：明确区分管内和管外流体，避免参数交换导致的混乱
    // 管内流体 = hotFluidLocation === 'outer' ? 冷流体 : 热流体
    // 管外流体 = hotFluidLocation === 'outer' ? 热流体 : 冷流体
    
    // 确定管内流体的参数（不依赖交换后的参数）
    const innerTubeFluidProps = hotFluidLocation === 'outer' ? coldProps : hotProps;
    const innerTubeFlowRate = hotFluidLocation === 'outer' ? actualColdFlowRate : actualHotFlowRate;
    const innerTubeProcessType = hotFluidLocation === 'outer' ? coldProcessType : hotProcessType;
    const innerTubeStateIn = hotFluidLocation === 'outer' ? coldStateIn : hotStateIn;
    const innerTubeStateOut = hotFluidLocation === 'outer' ? coldStateOut : hotStateOut;
    const innerTubePhaseIn = hotFluidLocation === 'outer' ? calcColdPhaseIn : calcHotPhaseIn;
    const innerTubePhaseOut = hotFluidLocation === 'outer' ? calcColdPhaseOut : calcHotPhaseOut;
    const innerTubeQualityIn = hotFluidLocation === 'outer' ? calcColdQualityIn : calcHotQualityIn;
    const innerTubeQualityOut = hotFluidLocation === 'outer' ? calcColdQualityOut : calcHotQualityOut;
    const innerTubeFluid = hotFluidLocation === 'outer' ? coldFluid : hotFluid;
    const innerTubePressure = hotFluidLocation === 'outer' ? actualColdPressure : actualHotPressure;
    const innerTubeTin = hotFluidLocation === 'outer' ? coldTin : hotTin;
    const innerTubeTout = hotFluidLocation === 'outer' ? coldTout : hotTout;
    
    if (innerTubeFluidProps) {
      console.log('[管内压降计算] 开始计算，管内流体物性存在:', !!innerTubeFluidProps, 'hotFluidLocation:', hotFluidLocation);
      console.log('[管内压降计算] 管内流体参数:', {
        fluid: innerTubeFluid,
        flowRate: innerTubeFlowRate,
        processType: innerTubeProcessType,
        stateIn: innerTubeStateIn,
        stateOut: innerTubeStateOut,
        phaseIn: innerTubePhaseIn,
        phaseOut: innerTubePhaseOut
      });
      
      // 判断管内流体是否为两相流
      const innerTubeIsCondensation = innerTubeProcessType === 'condensation';
      const innerTubeIsEvaporation = innerTubeProcessType === 'evaporation';
      const innerTubeHasStateChange = (innerTubeStateIn === 1 && innerTubeStateOut === 0) || (innerTubeStateIn === 0 && innerTubeStateOut === 1);
      const innerTubeIsTwoPhase = innerTubePhaseIn === 'twophase' || innerTubePhaseOut === 'twophase' || 
                                   (innerTubeIsCondensation && innerTubeHasStateChange) ||
                                   (innerTubeIsEvaporation && innerTubeHasStateChange);
      
      let innerTubeQualityAvg = null;
      if (innerTubeIsTwoPhase) {
        if (innerTubeQualityIn !== null || innerTubeQualityOut !== null) {
          innerTubeQualityAvg = ((innerTubeQualityIn || 0) + (innerTubeQualityOut || 0)) / 2;
        } else if ((innerTubeIsCondensation || innerTubeIsEvaporation) && innerTubeHasStateChange) {
          innerTubeQualityAvg = 0.5;
        }
      }
      
      console.log('[管内压降计算] 相态判断:', {
        innerTubePhaseIn,
        innerTubePhaseOut,
        innerTubeProcessType,
        innerTubeIsCondensation,
        innerTubeIsEvaporation,
        innerTubeHasStateChange,
        innerTubeStateIn,
        innerTubeStateOut,
        innerTubeIsTwoPhase,
        innerTubeQualityAvg,
        hotFluidLocation
      });
      
      const flowRatePerTube = innerTubeFlowRate / innerTubeCount;
      let innerCrossSection, innerVelocity, innerRe, innerDiameter;
      
      // 验证内径是否有效
      if (!actualInnerInnerDiameter || actualInnerInnerDiameter <= 0) {
        console.warn('管内压降计算：内管内径无效，使用默认值', { 
          actualInnerInnerDiameter, 
          innerInnerDiameter, 
          actualIsTwisted,
          actualInnerOuterDiameter 
        });
        // 如果内径无效，尝试使用原始内径
        innerDiameter = innerInnerDiameter || 0.03; // 默认30mm
        innerCrossSection = Math.PI * Math.pow(innerDiameter / 2, 2);
      } else {
        if (actualIsTwisted) {
          // 麻花管：管内流动应使用梅花截面的当量直径和流通面积
          // 计算梅花截面的几何参数
          // Do,max（峰顶外接圆）= 麻花管内径（管内径，不是外管内径）
          // 麻花管内径 = 麻花管外径 - 2×壁厚 = 外管内径 - 2×壁厚
          const twistInnerDiameter = actualInnerInnerDiameter; // 麻花管内径
          const doMax = twistInnerDiameter; // 管内梅花截面的峰顶直径 = 麻花管内径
          // Do,min（谷底内切圆）= Do,max - 2*h，其中h为齿高
          const doMin = doMax - 2 * (twistToothHeight || 0.003);
          
          // 计算梅花截面的几何参数
          const lobeSection = calculateLobeCrossSection(doMax, doMin, twistLobeCount || 6);
          
          // 使用梅花截面的流通面积和当量直径
          innerCrossSection = lobeSection.area;
          innerDiameter = lobeSection.equivalentDiameter;
          
          console.log('[管内压降计算] 麻花管梅花截面参数:', {
            twistInnerDiameter: twistInnerDiameter * 1000, // mm
            doMax: doMax * 1000, // mm
            doMin: doMin * 1000, // mm
            twistToothHeight: (twistToothHeight || 0.003) * 1000, // mm
            lobeCount: twistLobeCount || 6,
            area: innerCrossSection,
            equivalentDiameter: innerDiameter,
            perimeter: lobeSection.perimeter
          });
        } else {
          // 直管：使用圆形截面
          innerCrossSection = Math.PI * Math.pow(actualInnerInnerDiameter / 2, 2);
          innerDiameter = actualInnerInnerDiameter;
        }
      }
      
      // 验证流通面积和物性是否有效
      if (innerCrossSection > 0 && innerTubeFluidProps && innerTubeFluidProps.density > 0 && innerTubeFluidProps.viscosity > 0) {
        innerVelocity = flowRatePerTube / (innerTubeFluidProps.density * innerCrossSection);
        innerRe = calculateReynoldsNumber(
          innerTubeFluidProps.density,
          innerVelocity,
          innerDiameter,
          innerTubeFluidProps.viscosity
        );
        console.log('[管内压降计算] 参数计算完成:', {
          flowRatePerTube,
          innerCrossSection,
          innerDiameter,
          innerVelocity,
          innerRe,
          density: innerTubeFluidProps.density,
          viscosity: innerTubeFluidProps.viscosity,
          flowRate: innerTubeFlowRate,
          innerTubeCount,
          fluid: innerTubeFluid
        });
      } else {
        console.warn('管内压降计算：流通面积或物性无效', {
          innerCrossSection,
          density: innerTubeFluidProps?.density,
          viscosity: innerTubeFluidProps?.viscosity,
          innerTubeFluidProps: !!innerTubeFluidProps
        });
        // 如果参数无效，设置默认值以便继续计算
        innerVelocity = flowRatePerTube > 0 && innerCrossSection > 0 ? flowRatePerTube / (1000 * innerCrossSection) : 0; // 假设密度为1000 kg/m³
        innerRe = innerVelocity > 0 && innerDiameter > 0 ? (1000 * innerVelocity * innerDiameter) / 0.001 : 0; // 假设粘度为0.001 Pa·s
        console.log('[管内压降计算] 使用默认值:', { innerVelocity, innerRe });
      }

      let baseInnerFrictionFactor = calculateFrictionFactor(innerRe, 0.0001);
      if (actualIsTwisted) {
        // 应用麻花管摩擦系数修正
        // 注意：对于麻花管，应该使用当量直径而不是圆形内径
        const diameterForFrictionFactor = innerDiameter; // 已经使用当量直径
        baseInnerFrictionFactor = calculateTwistedTubeFrictionFactor(
          baseInnerFrictionFactor,
          twistPitch,
          diameterForFrictionFactor,
          twistLobeCount
        );
      }
      
      innerFrictionFactor = baseInnerFrictionFactor;
      
      // 管内流动使用直管长度（管内是圆形截面，流动是直的）
      // 注意：螺旋路径长度只用于管外（环形空间）流动，管内流动是直的
      const effectiveLength = length;
      
      // 根据相态选择压降计算方法
      if (innerTubeIsTwoPhase && innerTubeQualityAvg !== null && innerTubeQualityAvg > 0 && innerTubeQualityAvg < 1) {
        // 两相流压降计算
        let liquidProps, vaporProps;
        try {
          if (innerTubeFluidProps.liquidProps && innerTubeFluidProps.vaporProps) {
            // 如果物性已经包含两相流数据
            liquidProps = innerTubeFluidProps.liquidProps;
            vaporProps = innerTubeFluidProps.vaporProps;
          } else {
            // 需要单独查询饱和液体和蒸汽物性
            const satTempK = await getSaturationTemperature(innerTubeFluid, innerTubePressure * 1000);
            const satPressurePa = innerTubePressure * 1000;
            const { getFluidPropertiesTwoPhase } = await import('./coolprop_loader.js');
            const liquidPropsData = await getFluidPropertiesTwoPhase(innerTubeFluid, satTempK, satPressurePa, 0); // 干度0=液体
            const vaporPropsData = await getFluidPropertiesTwoPhase(innerTubeFluid, satTempK, satPressurePa, 1); // 干度1=蒸汽
            liquidProps = liquidPropsData.liquidProps;
            vaporProps = vaporPropsData.vaporProps;
          }
          
          const massFlux = (innerTubeFlowRate / innerTubeCount) / innerCrossSection; // kg/m²/s
          const singlePassLength = effectiveLength; // 单流程长度
          innerPressureDrop = calculateTwoPhasePressureDrop(
            liquidProps,
            vaporProps,
            innerTubeQualityAvg,
            massFlux,
            innerDiameter,
            singlePassLength,
            0.0001
          );
          // 考虑多流程：总压降 = 单流程压降 × 流程数
          innerPressureDrop.pressureDrop = innerPressureDrop.pressureDrop * passCount;
          innerPressureDrop.pressureDrop_kPa = innerPressureDrop.pressureDrop / 1000;
          
          console.log('[管内压降计算] 两相流压降计算结果:', innerPressureDrop);
        } catch (error) {
          console.warn(`两相流压降计算失败，改用单相流计算: ${error.message}`);
          // 如果两相流计算失败，降级为单相流计算
          innerPressureDrop = calculateInnerTubePressureDrop(
            innerTubeFluidProps.density,
            innerVelocity,
            effectiveLength,
            innerDiameter,
            innerRe,
            0.0001,
            passCount,
            baseInnerFrictionFactor
          );
          if (actualIsTwisted) {
            console.log('[管内压降计算] 两相流降级为单相流，麻花管压降（已应用摩擦系数修正）:', innerPressureDrop);
          }
        }
      } else {
        // 单相流压降计算
        console.log('[管内压降计算] 单相流计算，参数检查:', {
          hasInnerTubeFluidProps: !!innerTubeFluidProps,
          density: innerTubeFluidProps?.density,
          innerVelocity,
          innerDiameter,
          innerRe,
          effectiveLength,
          fluid: innerTubeFluid
        });
        // 确保所有参数有效（允许innerRe为0，因为可能是层流）
        if (innerTubeFluidProps && innerTubeFluidProps.density > 0 && innerVelocity >= 0 && innerDiameter > 0 && innerRe >= 0) {
          // 使用已经修正过的摩擦系数（如果是麻花管，baseInnerFrictionFactor已经包含了修正）
          innerPressureDrop = calculateInnerTubePressureDrop(
            innerTubeFluidProps.density,
            innerVelocity,
            effectiveLength,
            innerDiameter,
            innerRe,
            0.0001,
            passCount,
            baseInnerFrictionFactor
          );
          console.log('[管内压降计算] 基础压降计算结果:', innerPressureDrop);
          console.log('[管内压降计算] 详细计算参数:', {
            fluid: innerTubeFluid,
            density: innerTubeFluidProps.density,
            velocity: innerVelocity,
            length: effectiveLength,
            diameter: innerDiameter,
            re: innerRe,
            frictionFactor: innerPressureDrop.frictionFactor,
            baseFrictionFactor: baseInnerFrictionFactor,
            pressureDrop_kPa: innerPressureDrop.pressureDrop_kPa,
            passCount,
            totalLength: effectiveLength * passCount,
            flowRate: innerTubeFlowRate,
            formula: `f * (L/D) * (ρv²/2) = ${innerPressureDrop.frictionFactor} * (${effectiveLength * passCount}/${innerDiameter}) * (${innerTubeFluidProps.density} * ${innerVelocity}² / 2)`
          });
          
          if (actualIsTwisted) {
            console.log('[管内压降计算] 麻花管压降（已应用摩擦系数修正）:', innerPressureDrop);
          }
        } else {
          console.warn('管内压降计算：单相流参数无效，无法计算压降', {
            hasInnerTubeFluidProps: !!innerTubeFluidProps,
            density: innerTubeFluidProps?.density,
            innerVelocity,
            innerDiameter,
            innerRe,
            fluid: innerTubeFluid
          });
          innerPressureDrop = null;
        }
      }
      console.log('[管内压降计算] 最终结果:', { 
        innerPressureDrop, 
        innerFrictionFactor,
        innerPressureDrop_kPa: innerPressureDrop?.pressureDrop_kPa,
        innerPressureDrop_value: innerPressureDrop,
        fluid: innerTubeFluid,
        flowRate: innerTubeFlowRate
      });
    } else {
      console.warn('[管内压降计算] 管内流体物性为null，跳过管内压降计算', {
        innerTubeFluidProps: !!innerTubeFluidProps,
        hotFluidLocation,
        hotProps: !!hotProps,
        coldProps: !!coldProps
      });
      innerPressureDrop = null;
      innerFrictionFactor = null;
    }

    // 计算环形空间阻力损失
    console.log('[环形空间压降计算] 开始计算，coldProps存在:', !!coldProps, 'hotFluidLocation:', hotFluidLocation);
    if (coldProps) {
      // 注意：当热流体在管外时，coldProps实际上是热流体的物性
      // 需要检查原始的热流体过程类型来判断是否为冷凝过程
      // 获取原始状态值（交换前的）
      const originalColdStateIn = hotFluidLocation === 'outer' ? hotStateIn : coldStateIn;
      const originalColdStateOut = hotFluidLocation === 'outer' ? hotStateOut : coldStateOut;
      
      // 判断是否为冷凝过程：状态值从1→0，且过程类型是condensation
      const isCondensation = calcColdProcessType === 'condensation' && 
                             originalColdStateIn === 1 && 
                             originalColdStateOut === 0;
      
      // 判断是否为两相流：
      // 1. 入口或出口相态是twophase
      // 2. 或者是冷凝/蒸发过程（有相变）
      const coldIsTwoPhase = calcColdPhaseIn === 'twophase' || 
                             calcColdPhaseOut === 'twophase' ||
                             isCondensation;
      
      // 对于冷凝过程，计算平均干度
      let coldQualityAvg = null;
      if (coldIsTwoPhase) {
        if (calcColdQualityIn !== null || calcColdQualityOut !== null) {
          // 如果已经有干度值，使用平均值
          coldQualityAvg = ((calcColdQualityIn || 0) + (calcColdQualityOut || 0)) / 2;
        } else if (isCondensation) {
          // 冷凝过程：从气体(1)到液体(0)，平均干度约为0.5
          // 但考虑到入口是过热气体，出口是过冷液体，实际两相流段的平均干度应该更接近0.5
          coldQualityAvg = 0.5;
        }
      }
      
      console.log('[环形空间压降计算] 相态判断:', {
        calcColdProcessType,
        isCondensation,
        coldIsTwoPhase,
        coldQualityAvg,
        calcColdPhaseIn,
        calcColdPhaseOut,
        originalColdStateIn,
        originalColdStateOut,
        calcColdQualityIn,
        calcColdQualityOut
      });
      
      let annulusArea, hydraulicDiameter, annulusVelocity, annulusRe;
      
      if (actualIsTwisted) {
        // 麻花管模式：考虑螺旋通道特性
        // Do,max（峰顶外接圆）= 外管内径（贴合状态）
        const doMax = outerInnerDiameter;
        // Do,min（谷底内切圆）：使用齿高准确计算
        // doMin = doMax - 2 * 齿高
        const doMin = doMax - 2 * (twistToothHeight || 0.003); // 默认3mm
        
        // 计算梅花截面参数（用于确定湿周）
        const lobeSection = calculateLobeCrossSection(doMax, doMin, twistLobeCount);
        
        // 环形通道流通面积计算
        // 麻花管是贴合在外管内壁上的，峰顶接触外管内壁，形成螺旋通道
        // 对于螺旋通道，环形通道流通面积应该基于间隙计算
        // 工程实际：环形通道是在麻花管谷底与外管内壁之间的间隙中形成的螺旋通道
        // 使用"周长 × 间隙"的方法更符合螺旋通道的实际几何
        const gap = (doMax - doMin) / 2; // 平均间隙 = (峰顶 - 谷底) / 2
        const perimeter = Math.PI * outerInnerDiameter; // 外管内径圆周长
        
        // 环形通道流通面积 = 外管内径圆周长 × 平均间隙
        // 这是对螺旋通道流通面积的合理近似
        // 对于贴合状态的麻花管，这是最符合工程实际的计算方法
        const rawAnnulusArea = perimeter * gap;
        
        // 考虑螺旋通道的实际有效流通面积
        // 由于是螺旋形，实际流通面积可能略小于横截面积
        // 使用一个修正系数（通常0.9-1.0，取决于螺旋节距）
        // 节距越小（螺旋越紧），有效面积可能略小
        // 但对于贴合状态的麻花管，修正系数应该接近1.0
        const spiralChannelFactor = Math.max(0.9, Math.min(1.0, 1 - 0.01 * (0.1 / twistPitch)));
        annulusArea = rawAnnulusArea * spiralChannelFactor;
        
        console.log('[环形空间压降计算-麻花管] 流通面积计算（间隙方法）:', {
          outerInnerDiameter: outerInnerDiameter * 1000, // mm
          doMax: doMax * 1000, // mm
          doMin: doMin * 1000, // mm
          gap: gap * 1000, // mm (平均间隙)
          perimeter: perimeter * 1000, // mm (外管内径圆周长)
          rawAnnulusArea: rawAnnulusArea * 1000000, // mm² (周长 × 间隙)
          spiralChannelFactor,
          annulusArea: annulusArea * 1000000 // mm²
        });
        
        // 确保环形通道面积有效
        if (annulusArea <= 0) {
          // 如果计算出的面积无效，设置压降为null
          annulusFrictionFactor = null;
          annulusPressureDrop = null;
        } else {
          // 计算当量直径和湿周
          // 外管内壁周长
          const outerPerimeter = Math.PI * outerInnerDiameter;
          // 麻花管谷底周长（考虑梅花截面）
          const innerValleyPerimeter = lobeSection.perimeter;
          // 当量直径：Dh = 4 * A / (P_outer + P_inner_valley)
          hydraulicDiameter = (4 * annulusArea) / (outerPerimeter + innerValleyPerimeter);
          
          // 计算流速（注意：由于螺旋通道，实际路径长度是螺旋长度，但横截面积不变）
          // 对于冷凝过程，需要使用两相流的混合密度
          let effectiveDensity = coldProps.density;
          if (isCondensation && coldIsTwoPhase && coldQualityAvg !== null) {
            // 两相流混合密度：1/ρ_mix = x/ρ_v + (1-x)/ρ_l
            // 如果coldProps包含两相流物性，使用混合密度
            if (coldProps.liquidProps && coldProps.vaporProps) {
              const rhoL = coldProps.liquidProps.density;
              const rhoV = coldProps.vaporProps.density;
              const x = coldQualityAvg;
              // 混合密度：ρ_mix = 1 / (x/ρ_v + (1-x)/ρ_l)
              effectiveDensity = 1 / (x / rhoV + (1 - x) / rhoL);
              console.log('[环形空间压降计算-麻花管] 使用两相流混合密度:', {
                rhoL,
                rhoV,
                x: coldQualityAvg,
                effectiveDensity,
                originalDensity: coldProps.density
              });
            }
          }
          annulusVelocity = actualColdFlowRate / (effectiveDensity * annulusArea);
          
          // 计算雷诺数（使用有效密度和有效粘度）
          // 对于两相流，需要使用混合粘度
          let effectiveViscosity = coldProps.viscosity;
          if (isCondensation && coldIsTwoPhase && coldQualityAvg !== null && coldProps.liquidProps && coldProps.vaporProps) {
            // 两相流混合粘度（使用McAdams关联式）
            const muL = coldProps.liquidProps.viscosity;
            const muV = coldProps.vaporProps.viscosity;
            const x = coldQualityAvg;
            // McAdams关联式：μ_mix = x*μ_v + (1-x)*μ_l
            effectiveViscosity = x * muV + (1 - x) * muL;
            console.log('[环形空间压降计算-麻花管] 使用两相流混合粘度:', {
              muL,
              muV,
              x: coldQualityAvg,
              effectiveViscosity,
              originalViscosity: coldProps.viscosity
            });
          }
          annulusRe = calculateReynoldsNumber(
            effectiveDensity,
            annulusVelocity,
            hydraulicDiameter,
            effectiveViscosity
          );
          
          // 确保计算结果有效，并检查流速是否合理
          // 对于冷凝过程（两相流），流速限制可以放宽，因为气体密度小，流速会较高
          const maxVelocity = isCondensation ? 1000 : 100; // 冷凝过程允许更高的流速
          console.log('[环形空间压降计算-麻花管] 参数有效性检查:', {
            annulusArea,
            hydraulicDiameter,
            annulusRe,
            annulusVelocity,
            effectiveDensity,
            isCondensation,
            maxVelocity,
            condition_met: annulusArea > 0 && hydraulicDiameter > 0 && annulusRe > 0 && annulusVelocity < maxVelocity
          });
          
          if (annulusArea > 0 && hydraulicDiameter > 0 && annulusRe > 0 && annulusVelocity < maxVelocity) {
            annulusFrictionFactor = calculateFrictionFactor(annulusRe, 0.0001);
            
            // 计算压降时需要考虑螺旋路径长度
            // 实际流动路径长度 = 螺旋长度
            const spiralPathLength = length * Math.sqrt(1 + Math.pow(Math.PI * doMax / twistPitch, 2));
            
            // 根据相态选择压降计算方法
            console.log('[环形空间压降计算-麻花管] 压降计算条件检查:', {
              coldIsTwoPhase,
              coldQualityAvg,
              condition_met: coldIsTwoPhase && coldQualityAvg !== null && coldQualityAvg > 0 && coldQualityAvg < 1
            });
            
            if (coldIsTwoPhase && coldQualityAvg !== null && coldQualityAvg > 0 && coldQualityAvg < 1) {
              // 两相流压降计算
              console.log('[环形空间压降计算-麻花管] 开始两相流压降计算');
              // 需要获取饱和液体和蒸汽物性
              let liquidProps, vaporProps;
              try {
                if (coldProps.liquidProps && coldProps.vaporProps) {
                  // 如果coldProps已经包含两相流物性
                  console.log('[环形空间压降计算-麻花管] 使用coldProps中的两相流物性');
                  liquidProps = coldProps.liquidProps;
                  vaporProps = coldProps.vaporProps;
                } else {
                  // 需要单独查询饱和液体和蒸汽物性
                  console.log('[环形空间压降计算-麻花管] 查询饱和液体和蒸汽物性');
                  const satTempK = await getSaturationTemperature(calcColdFluid, calcColdPressure * 1000);
                  const satPressurePa = calcColdPressure * 1000;
                  const liquidPropsData = await getFluidPropertiesTwoPhase(calcColdFluid, satTempK, satPressurePa, 0); // 干度0=液体
                  const vaporPropsData = await getFluidPropertiesTwoPhase(calcColdFluid, satTempK, satPressurePa, 1); // 干度1=蒸汽
                  liquidProps = liquidPropsData.liquidProps;
                  vaporProps = vaporPropsData.vaporProps;
                }
                
                const massFlux = actualColdFlowRate / annulusArea; // kg/m²/s
                console.log('[环形空间压降计算-麻花管] 两相流压降计算参数:', {
                  massFlux,
                  coldQualityAvg,
                  hydraulicDiameter,
                  spiralPathLength
                });
                annulusPressureDrop = calculateTwoPhasePressureDrop(
                  liquidProps,
                  vaporProps,
                  coldQualityAvg,
                  massFlux,
                  hydraulicDiameter,
                  spiralPathLength,
                  0.0001
                );
                // 考虑多流程
                annulusPressureDrop.pressureDrop = annulusPressureDrop.pressureDrop * passCount;
                annulusPressureDrop.pressureDrop_kPa = annulusPressureDrop.pressureDrop / 1000;
                annulusFrictionFactor = annulusPressureDrop.frictionFactor;
                console.log('[环形空间压降计算-麻花管] 两相流压降计算结果:', {
                  annulusPressureDrop,
                  annulusFrictionFactor
                });
              } catch (error) {
                console.warn(`[环形空间压降计算-麻花管] 两相流压降计算失败，改用单相流计算: ${error.message}`, error);
                // 如果两相流计算失败，降级为单相流计算
                annulusPressureDrop = calculateAnnulusPressureDrop(
                  coldProps.density,
                  annulusVelocity,
                  spiralPathLength,
                  hydraulicDiameter,
                  annulusRe,
                  0.0001,
                  passCount
                );
                annulusFrictionFactor = annulusPressureDrop.frictionFactor;
                console.log('[环形空间压降计算-麻花管] 单相流压降计算结果（降级）:', {
                  annulusPressureDrop,
                  annulusFrictionFactor
                });
              }
            } else {
              // 单相流压降计算
              console.log('[环形空间压降计算-麻花管] 使用单相流压降计算');
              annulusPressureDrop = calculateAnnulusPressureDrop(
                coldProps.density,
                annulusVelocity,
                spiralPathLength, // 使用螺旋路径长度而不是直管长度
                hydraulicDiameter,
                annulusRe,
                0.0001,
                passCount
              );
              annulusFrictionFactor = annulusPressureDrop.frictionFactor;
              console.log('[环形空间压降计算-麻花管] 单相流压降计算结果:', {
                annulusPressureDrop,
                annulusFrictionFactor
              });
            }
          } else {
            // 如果环形空间太小或流速异常，设置压降为null
            console.warn('[环形空间压降计算-麻花管] 参数无效，无法计算压降:', {
              annulusArea,
              hydraulicDiameter,
              annulusRe,
              annulusVelocity,
              reason: annulusArea <= 0 ? '面积无效' : 
                      hydraulicDiameter <= 0 ? '当量直径无效' : 
                      annulusRe <= 0 ? '雷诺数无效' : 
                      annulusVelocity >= (isCondensation ? 1000 : 100) ? `流速过大(${annulusVelocity.toFixed(2)} m/s)` : '未知原因'
            });
            annulusFrictionFactor = null;
            annulusPressureDrop = null;
          }
        }
      } else {
        // 直管模式：使用标准环形空间计算
        const outerInnerRadius = outerInnerDiameter / 2;
        const innerOuterRadius = actualInnerOuterDiameter / 2;
        const totalInnerCrossSection = innerTubeCount * Math.PI * Math.pow(innerOuterRadius, 2);
        annulusArea = Math.PI * Math.pow(outerInnerRadius, 2) - totalInnerCrossSection;
        
        const outerInnerPerimeter = Math.PI * outerInnerDiameter;
        const innerOuterPerimeter = innerTubeCount * Math.PI * actualInnerOuterDiameter;
        hydraulicDiameter = (4 * annulusArea) / (outerInnerPerimeter + innerOuterPerimeter);
        
        annulusVelocity = actualColdFlowRate / (coldProps.density * annulusArea);
        annulusRe = calculateReynoldsNumber(
          coldProps.density,
          annulusVelocity,
          hydraulicDiameter,
          coldProps.viscosity
        );
        
        // 确保面积和当量直径有效
        if (annulusArea > 0 && hydraulicDiameter > 0 && annulusRe > 0) {
          // 根据相态选择压降计算方法
          if (coldIsTwoPhase && coldQualityAvg !== null && coldQualityAvg > 0 && coldQualityAvg < 1 && coldProps.liquidProps && coldProps.vaporProps) {
            // 两相流压降计算
            const massFlux = actualColdFlowRate / annulusArea; // kg/m²/s
            annulusPressureDrop = calculateTwoPhasePressureDrop(
              coldProps.liquidProps,
              coldProps.vaporProps,
              coldQualityAvg,
              massFlux,
              hydraulicDiameter,
              length,
              0.0001
            );
            // 考虑多流程
            annulusPressureDrop.pressureDrop = annulusPressureDrop.pressureDrop * passCount;
            annulusPressureDrop.pressureDrop_kPa = annulusPressureDrop.pressureDrop / 1000;
            annulusFrictionFactor = annulusPressureDrop.frictionFactor;
          } else {
            // 单相流压降计算
            annulusFrictionFactor = calculateFrictionFactor(annulusRe, 0.0001);
            annulusPressureDrop = calculateAnnulusPressureDrop(
              coldProps.density,
              annulusVelocity,
              length,
              hydraulicDiameter,
              annulusRe,
              0.0001,
              passCount
            );
          }
        } else {
          // 如果环形空间太小或无效，设置压降为null
          annulusFrictionFactor = null;
          annulusPressureDrop = null;
        }
      }
    }
    
    console.log('[环形空间压降计算] 最终结果:', {
      annulusPressureDrop,
      annulusFrictionFactor,
      annulusPressureDrop_kPa: annulusPressureDrop?.pressureDrop_kPa
    });
    
    // 注意：重构后的代码已经使用了正确的流体参数
    // 管内压降计算：innerPressureDrop 已经是管内流体的压降（无论热流体在管内还是管外）
    // 管外压降计算：annulusPressureDrop 已经是管外流体的压降（无论热流体在管内还是管外）
    // 因此不需要再交换压降，直接使用计算结果即可
    console.log('[压降结果] 最终压降值（无需交换）:', {
      innerPressureDrop_kPa: innerPressureDrop?.pressureDrop_kPa,
      innerFrictionFactor,
      annulusPressureDrop_kPa: annulusPressureDrop?.pressureDrop_kPa,
      annulusFrictionFactor,
      hotFluidLocation,
      note: '重构后的代码已使用正确的流体参数，无需交换'
    });
    
    console.log('[返回值准备] 压降和摩擦系数:', {
      innerPressureDrop: innerPressureDrop?.pressureDrop_kPa,
      innerFrictionFactor,
      annulusPressureDrop: annulusPressureDrop?.pressureDrop_kPa,
      annulusFrictionFactor,
      innerPressureDrop_object: innerPressureDrop
    });

    // 4. 计算实际换热面积（基于几何尺寸）
    let singleTubeArea;
    let smoothTubeArea = null;  // 对应的光管面积（用于计算翅化系数）
    let finningRatio = null;    // 翅化系数（麻花管面积/光管面积）
    
    if (actualIsTwisted) {
      // 麻花管使用实际面积估算（考虑梅花截面和螺旋）
      singleTubeArea = calculateTwistedTubeArea(
        actualInnerOuterDiameter, // 麻花管外径
        actualInnerInnerDiameter, // 麻花管内径
        length,
        twistPitch,
        twistLobeCount
      );
      
      // 计算相同几何尺寸下的光管面积（用于翅化系数计算）
      // 光管面积 = π × 外径 × 管长
      smoothTubeArea = Math.PI * actualInnerOuterDiameter * length;
      
      // 计算翅化系数：麻花管面积 / 光管面积
      if (smoothTubeArea > 0) {
        finningRatio = singleTubeArea / smoothTubeArea;
      }
    } else {
      // 直管：基于几何尺寸计算实际面积
      // 单根内管的传热面积 = π × 内管外径 × 管长
      const singleInnerTubeArea = Math.PI * actualInnerOuterDiameter * length;
      // 单根外管内的总面积 = 单根内管面积 × 内管数量
      singleTubeArea = singleInnerTubeArea * innerTubeCount;
    }
    
    // 总实际换热面积 = 单管面积 × 流程数量 × 每流程外管数量
    const totalArea = singleTubeArea * passCount * outerTubeCountPerPass;
    
    // 基于 Q 和 LMTD 反算一个 U_check（用于 sanity check）
    let U_check = null;
    if (totalArea > 0 && lmtd > 0) {
      U_check = Q / (totalArea * lmtd);
    }

    // 计算所需换热面积
    const requiredArea = calculateHeatTransferArea(Q, lmtd, U);

    // 计算面积余量（百分比）
    let areaMargin = null;
    let areaMarginStatus = 'unknown'; // 'insufficient', 'adequate', 'excessive'
    if (requiredArea > 0 && totalArea >= 0) {
      areaMargin = ((totalArea - requiredArea) / requiredArea) * 100;
      
      // 判断余量状态
      if (areaMargin < 10) {
        areaMarginStatus = 'insufficient';
      } else if (areaMargin <= 25) {
        areaMarginStatus = 'adequate';
      } else {
        areaMarginStatus = 'excessive';
      }
    }

    // 计算增强系数（如果是麻花管）
    let enhancementFactor = 1.0;
    if (actualIsTwisted) {
      enhancementFactor = calculateTwistedTubeEnhancementFactor(twistPitch, actualInnerInnerDiameter, twistLobeCount);
    }

    const heatTransferRate_kW = Q / 1000; // 转换为 kW
    console.log(`[计算结果] 传热量: ${heatTransferRate_kW} kW (输入模式: ${inputMode})`);

    // 计算温度分布（考虑冷凝/蒸发过程）
    // 判断是否为冷凝/蒸发过程
    const hotHasPhaseChange = (hotStateIn === 1 && hotStateOut === 0) || (hotStateIn === 0 && hotStateOut === 1);
    const coldHasPhaseChange = (coldStateIn === 1 && coldStateOut === 0) || (coldStateIn === 0 && coldStateOut === 1);
    const hotIsCondensation = hotProcessType === 'condensation' && hotHasPhaseChange;
    const coldIsEvaporation = coldProcessType === 'evaporation' && coldHasPhaseChange;
    
    // 计算饱和温度（用于温度分布）
    let hotSaturationTemp = null;
    let coldSaturationTemp = null;
    
    if (hotIsCondensation) {
      try {
        const { getSaturationTemperature } = await import('./coolprop_loader.js');
        const satTempK = await getSaturationTemperature(hotFluid, actualHotPressure * 1000);
        hotSaturationTemp = satTempK - 273.15; // 转换为 °C
      } catch (error) {
        console.warn('无法获取热流体饱和温度，使用线性温度分布:', error);
      }
    }
    
    if (coldIsEvaporation) {
      try {
        const { getSaturationTemperature } = await import('./coolprop_loader.js');
        const satTempK = await getSaturationTemperature(coldFluid, actualColdPressure * 1000);
        coldSaturationTemp = satTempK - 273.15; // 转换为 °C
      } catch (error) {
        console.warn('无法获取冷流体饱和温度，使用线性温度分布:', error);
      }
    }
    
    const temperatureDistribution = calculateTemperatureDistribution(
      hotTin,
      hotTout,
      coldTin,
      coldTout,
      length,
      flowType,
      100, // 100个计算点
      {
        hotIsCondensation: hotIsCondensation,
        hotSaturationTemp: hotSaturationTemp,
        coldIsEvaporation: coldIsEvaporation,
        coldSaturationTemp: coldSaturationTemp
      }
    );

    // 准备返回值中的压降和摩擦系数
    const resultInnerPressureDrop = (innerPressureDrop && typeof innerPressureDrop === 'object' && 'pressureDrop_kPa' in innerPressureDrop) 
      ? innerPressureDrop.pressureDrop_kPa 
      : (typeof innerPressureDrop === 'number' ? innerPressureDrop : null);
    const resultInnerFrictionFactor = (innerFrictionFactor !== null && innerFrictionFactor !== undefined) ? innerFrictionFactor : null;
    const resultAnnulusPressureDrop = (annulusPressureDrop && typeof annulusPressureDrop === 'object' && 'pressureDrop_kPa' in annulusPressureDrop) 
      ? annulusPressureDrop.pressureDrop_kPa 
      : (typeof annulusPressureDrop === 'number' ? annulusPressureDrop : null);
    const resultAnnulusFrictionFactor = (annulusFrictionFactor !== null && annulusFrictionFactor !== undefined) ? annulusFrictionFactor : null;
    
    console.log('[返回值准备] 压降和摩擦系数:', {
      innerPressureDrop_object: innerPressureDrop,
      resultInnerPressureDrop,
      innerFrictionFactor,
      resultInnerFrictionFactor,
      annulusPressureDrop_object: annulusPressureDrop,
      resultAnnulusPressureDrop,
      annulusFrictionFactor,
      resultAnnulusFrictionFactor
    });

    return {
      heatTransferRate: heatTransferRate_kW, // 转换为 kW
      temperatureDistribution: temperatureDistribution, // 温度分布数据
      lmtd: lmtd,
      overallHeatTransferCoefficient: U,
      heatTransferArea: totalArea,
      singleTubeArea: singleTubeArea,
      overallHeatTransferCoefficientCheck: U_check,
      requiredArea: requiredArea,           // 所需换热面积 (m²)
      areaMargin: areaMargin,               // 面积余量 (%)
      areaMarginStatus: areaMarginStatus,   // 余量状态
      innerTubeCount: innerTubeCount,
      innerTubeType: innerTubeType,
      passCount: passCount,
      outerTubeCountPerPass: outerTubeCountPerPass,
      isTwisted: actualIsTwisted,
      enhancementFactor: enhancementFactor,
      finningRatio: finningRatio,           // 翅化系数（麻花管面积/光管面积）
      smoothTubeArea: smoothTubeArea,       // 对应的光管面积（m²）
      // 如果热流体在管外，交换回计算结果（用于显示）
      calculatedHotFlowRate: hotFluidLocation === 'outer' ? calculatedColdFlowRate : calculatedHotFlowRate,    // 计算出的热流体流量 (kg/s) - 负荷输入法
      calculatedColdFlowRate: hotFluidLocation === 'outer' ? calculatedHotFlowRate : calculatedColdFlowRate,  // 计算出的冷流体流量 (kg/s) - 负荷输入法
      inputMode: inputMode,                 // 输入模式
      hi: hi,                               // 管内对流传热系数 (W/m²·K)
      ho: ho,                               // 管外对流传热系数 (W/m²·K)
      Ri_percentage: Ri_percentage,         // 管内热阻占比 (%)
      Ro_percentage: Ro_percentage,         // 管外热阻占比 (%)
      Rwall_percentage: Rwall_percentage,   // 管壁热阻占比 (%)
      Rfi_percentage: Rfi_percentage,       // 管内污垢热阻占比 (%)
      Rfo_percentage: Rfo_percentage,       // 管外污垢热阻占比 (%)
      innerPressureDrop: resultInnerPressureDrop,      // 管内压降 (kPa)
      innerFrictionFactor: resultInnerFrictionFactor,                    // 管内摩擦系数
      annulusPressureDrop: resultAnnulusPressureDrop,  // 环形空间压降 (kPa)
      annulusFrictionFactor: resultAnnulusFrictionFactor,                // 环形空间摩擦系数
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
