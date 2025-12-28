/**
 * UI 交互模块
 * 处理表单验证、结果显示等界面交互
 */

import { calculateHeatExchanger, calculateLobeCrossSection } from './heat_exchanger.js';
import { updateVisualization, drawTemperatureDistribution } from './visualization.js';
import { getMaterialInfo } from './materials.js';
import { getTwistedTubePreset } from './twisted_tube_presets.js';

/**
 * 获取表单输入值
 * @returns {Object} 表单数据
 */
export function getFormData() {
  // 获取输入模式
  const inputMode = document.querySelector('input[name="input-mode"]:checked')?.value || 'flowrate';
  // 获取热流体位置
  const hotFluidLocation = document.querySelector('input[name="hot-fluid-location"]:checked')?.value || 'inner';
  
  return {
    inputMode: inputMode,  // 'flowrate' 或 'load'
    hotFluidLocation: hotFluidLocation,  // 'inner' 或 'outer' - 热流体在管内或管外
    hotFluid: document.getElementById('hot-fluid').value,
    hotProcessType: document.getElementById('hot-process-type')?.value || 'cooling',
    hotStateIn: (() => {
      const val = document.getElementById('hot-state-in')?.value;
      return val !== undefined && val !== '' ? parseFloat(val) : null;
    })(),
    hotStateOut: (() => {
      const val = document.getElementById('hot-state-out')?.value;
      return val !== undefined && val !== '' ? parseFloat(val) : null;
    })(),
    hotTin: parseFloat(document.getElementById('hot-tin').value),
    hotTout: parseFloat(document.getElementById('hot-tout').value),
    hotFlowRate: inputMode === 'flowrate' ? parseFloat(document.getElementById('hot-flowrate').value) : null,
    hotPressure: (() => {
      const val = document.getElementById('hot-pressure')?.value;
      return val ? parseFloat(val) : null;
    })(),
    
    coldFluid: document.getElementById('cold-fluid').value,
    coldProcessType: document.getElementById('cold-process-type')?.value || 'cooling',
    coldStateIn: (() => {
      const val = document.getElementById('cold-state-in')?.value;
      return val !== undefined && val !== '' ? parseFloat(val) : null;
    })(),
    coldStateOut: (() => {
      const val = document.getElementById('cold-state-out')?.value;
      return val !== undefined && val !== '' ? parseFloat(val) : null;
    })(),
    coldTin: parseFloat(document.getElementById('cold-tin').value),
    coldTout: parseFloat(document.getElementById('cold-tout').value),
    coldFlowRate: inputMode === 'flowrate' ? parseFloat(document.getElementById('cold-flowrate').value) : null,
    coldPressure: (() => {
      const val = document.getElementById('cold-pressure')?.value;
      return val ? parseFloat(val) : null;
    })(),
    
    heatLoad: inputMode === 'load' ? parseFloat(document.getElementById('heat-load').value) : null,  // kW
    
    // 尺寸输入使用 mm，这里统一转换为 m
    // 获取外径和壁厚
    innerOuterDiameter: parseFloat(document.getElementById('inner-outer-diameter').value) / 1000, // 内管外径 (m)
    innerWallThickness: parseFloat(document.getElementById('inner-wall-thickness').value) / 1000, // 内管壁厚 (m)
    innerTubeMaterial: document.getElementById('inner-tube-material').value || 'stainless-steel-304', // 内管材质
    outerOuterDiameter: parseFloat(document.getElementById('outer-outer-diameter').value) / 1000, // 外管外径 (m)
    outerWallThickness: parseFloat(document.getElementById('outer-wall-thickness').value) / 1000, // 外管壁厚 (m)
    // 计算内径（用于流速计算）
    innerInnerDiameter: (parseFloat(document.getElementById('inner-outer-diameter').value) - 2 * parseFloat(document.getElementById('inner-wall-thickness').value)) / 1000, // 内管内径 (m)
    outerInnerDiameter: (parseFloat(document.getElementById('outer-outer-diameter').value) - 2 * parseFloat(document.getElementById('outer-wall-thickness').value)) / 1000, // 外管内径 (m)
    // 保留外径（用于传热面积计算，基于外径）
    innerDiameter: parseFloat(document.getElementById('inner-outer-diameter').value) / 1000, // 内管外径，用于传热面积
    outerDiameter: parseFloat(document.getElementById('outer-outer-diameter').value) / 1000, // 外管外径，用于传热面积
    length: parseFloat(document.getElementById('length').value),
    flowType: document.getElementById('flow-type').value,
    
    givenU: (() => {
      const uInput = document.getElementById('heat-transfer-coefficient').value;
      return uInput ? parseFloat(uInput) : null;
    })(),
    
    // 污垢系数（m²·K/kW，输入值需要转换为 m²·K/W）
    foulingInner: (() => {
      const val = document.getElementById('fouling-inner')?.value;
      return val ? parseFloat(val) / 1000 : 0; // 转换为 m²·K/W (从 m²·K/kW)
    })(),
    foulingOuter: (() => {
      const val = document.getElementById('fouling-outer')?.value;
      return val ? parseFloat(val) / 1000 : 0; // 转换为 m²·K/W (从 m²·K/kW)
    })(),
    
    innerTubeCount: parseInt(document.getElementById('inner-tube-count').value) || 1,
    innerTubeType: document.getElementById('inner-tube-type').value || 'smooth',
    isTwisted: document.getElementById('inner-tube-type').value === 'twisted',
    // 麻花管参数
    twistLobeCount: parseInt(document.getElementById('twist-lobe-count')?.value) || 6,
    twistPitch: (() => {
      const val = document.getElementById('twist-pitch')?.value;
      return val ? parseFloat(val) / 1000 : 0.0065; // 转换为m（默认6.5mm = 0.0065m）
    })(),
    twistToothHeight: (() => {
      const val = document.getElementById('twist-tooth-height')?.value;
      return val ? parseFloat(val) / 1000 : 0.003; // 转换为m（默认3mm = 0.003m）
    })(),
    twistWallThickness: (() => {
      const val = document.getElementById('twist-wall-thickness')?.value;
      return val ? parseFloat(val) / 1000 : null; // 转换为m，null表示使用内管壁厚
    })(),
    passCount: parseInt(document.getElementById('pass-count').value) || 1,
    outerTubeCountPerPass: parseInt(document.getElementById('outer-tube-count-per-pass').value) || 1
  };
}

/**
 * 验证表单数据
 * @param {Object} data - 表单数据
 * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
 */
export function validateFormData(data) {
  const errors = [];
  const inputMode = data.inputMode || 'flowrate';

  // 验证热流体参数
  if (!data.hotFluid) errors.push('请选择热流体工质');
  if (isNaN(data.hotTin) || data.hotTin <= 0) errors.push('请输入有效的热流体入口温度');
  if (isNaN(data.hotTout) || data.hotTout <= 0) errors.push('请输入有效的热流体出口温度');
  
  // 验证状态值输入（热流体）
  if (data.hotStateIn === null || isNaN(data.hotStateIn) || data.hotStateIn < 0 || data.hotStateIn > 1) {
    errors.push('热流体入口状态必须在0-1之间（0=液体，1=气体，0-1=两相干度）');
  }
  if (data.hotStateOut === null || isNaN(data.hotStateOut) || data.hotStateOut < 0 || data.hotStateOut > 1) {
    errors.push('热流体出口状态必须在0-1之间（0=液体，1=气体，0-1=两相干度）');
  }
  
  // 验证压力（所有情况都需要输入压力）
  if (!data.hotPressure || data.hotPressure <= 0) {
    errors.push('请输入有效的热流体压力');
  }
  
  if (inputMode === 'flowrate') {
    if (isNaN(data.hotFlowRate) || data.hotFlowRate <= 0) errors.push('请输入有效的热流体流量');
  }

  // 验证冷流体参数
  if (!data.coldFluid) errors.push('请选择冷流体工质');
  if (isNaN(data.coldTin) || data.coldTin <= 0) errors.push('请输入有效的冷流体入口温度');
  if (isNaN(data.coldTout) || data.coldTout <= 0) errors.push('请输入有效的冷流体出口温度');
  
  // 验证状态值输入（冷流体）
  if (data.coldStateIn === null || isNaN(data.coldStateIn) || data.coldStateIn < 0 || data.coldStateIn > 1) {
    errors.push('冷流体入口状态必须在0-1之间（0=液体，1=气体，0-1=两相干度）');
  }
  if (data.coldStateOut === null || isNaN(data.coldStateOut) || data.coldStateOut < 0 || data.coldStateOut > 1) {
    errors.push('冷流体出口状态必须在0-1之间（0=液体，1=气体，0-1=两相干度）');
  }
  
  // 验证压力（所有情况都需要输入压力）
  if (!data.coldPressure || data.coldPressure <= 0) {
    errors.push('请输入有效的冷流体压力');
  }
  
  if (inputMode === 'flowrate') {
    if (isNaN(data.coldFlowRate) || data.coldFlowRate <= 0) errors.push('请输入有效的冷流体流量');
  }
  
  // 验证温度逻辑（单相换热：热流体冷却，冷流体加热）
  const hotHasPhaseChange = (data.hotStateIn === 1 && data.hotStateOut === 0) || (data.hotStateIn === 0 && data.hotStateOut === 1) ||
                            (data.hotStateIn > 0 && data.hotStateIn < 1) || (data.hotStateOut > 0 && data.hotStateOut < 1);
  const hotIsSinglePhase = (data.hotStateIn === 0 || data.hotStateIn === 1) && (data.hotStateOut === 0 || data.hotStateOut === 1);
  if (hotIsSinglePhase && !hotHasPhaseChange) {
    // 热流体在单相换热中是冷却过程，温度应该降低
    if (data.hotTin <= data.hotTout) {
      errors.push('热流体在单相换热中是冷却过程，入口温度必须大于出口温度');
    }
  }
  
  const coldHasPhaseChange = (data.coldStateIn === 1 && data.coldStateOut === 0) || (data.coldStateIn === 0 && data.coldStateOut === 1) ||
                             (data.coldStateIn > 0 && data.coldStateIn < 1) || (data.coldStateOut > 0 && data.coldStateOut < 1);
  const coldIsSinglePhase = (data.coldStateIn === 0 || data.coldStateIn === 1) && (data.coldStateOut === 0 || data.coldStateOut === 1);
  if (coldIsSinglePhase && !coldHasPhaseChange) {
    // 冷流体在单相换热中是加热过程，温度应该升高
    if (data.coldTout <= data.coldTin) {
      errors.push('冷流体在单相换热中是加热过程，出口温度必须大于入口温度');
    }
  }

  // 负荷输入法模式下验证传热量
  if (inputMode === 'load') {
    if (isNaN(data.heatLoad) || data.heatLoad <= 0) errors.push('请输入有效的传热量（kW）');
  }

  // 验证温度逻辑
  if (data.hotTin <= data.coldTout) {
    errors.push('热流体入口温度必须大于冷流体出口温度');
  }
  if (data.hotTout <= data.coldTin) {
    errors.push('热流体出口温度必须大于冷流体入口温度');
  }

  // 验证换热器参数
  // 验证外径
  if (isNaN(data.innerOuterDiameter) || data.innerOuterDiameter <= 0) errors.push('请输入有效的内管外径');
  if (isNaN(data.outerOuterDiameter) || data.outerOuterDiameter <= 0) errors.push('请输入有效的外管外径');
  
  // 验证壁厚
  if (isNaN(data.innerWallThickness) || data.innerWallThickness <= 0) errors.push('请输入有效的内管壁厚');
  if (isNaN(data.outerWallThickness) || data.outerWallThickness <= 0) errors.push('请输入有效的外管壁厚');
  
  // 验证壁厚不能大于外径的一半（否则内径会小于等于0）
  if (data.innerWallThickness >= data.innerOuterDiameter / 2) {
    errors.push('内管壁厚不能大于或等于内管外径的一半');
  }
  if (data.outerWallThickness >= data.outerOuterDiameter / 2) {
    errors.push('外管壁厚不能大于或等于外管外径的一半');
  }
  
  // 验证内径（计算后的）
  if (isNaN(data.innerInnerDiameter) || data.innerInnerDiameter <= 0) {
    errors.push('内管内径无效：内管外径必须大于2倍内管壁厚');
  }
  if (isNaN(data.outerInnerDiameter) || data.outerInnerDiameter <= 0) {
    errors.push('外管内径无效：外管外径必须大于2倍外管壁厚');
  }
  
  // 验证外管内径必须大于内管外径（确保内管能放入外管）
  // 但麻花管模式下，外管内径等于麻花管外径（贴合状态）
  if (!data.isTwisted && data.outerInnerDiameter <= data.innerOuterDiameter) {
    errors.push('外管内径必须大于内管外径，否则内管无法放入外管');
  }
  
  if (isNaN(data.length) || data.length <= 0) errors.push('请输入有效的管长');
  
  // 验证内管数量
  if (data.isTwisted) {
    // 麻花管模式下，内管数量必须为1
    if (data.innerTubeCount !== 1) {
      errors.push('麻花管模式下，内管数量必须为1根');
    }
  } else {
    if (isNaN(data.innerTubeCount) || data.innerTubeCount < 1 || data.innerTubeCount > 10) {
      errors.push('内管数量必须在 1-10 根之间');
    }
    
    // 验证内管是否能放入外管（使用几何排列计算最小所需外管内径）
    const innerDiameter = data.innerOuterDiameter;
    const outerInnerDiameter = data.outerInnerDiameter;
    const innerTubeCount = data.innerTubeCount;
    
    // 计算N根相同直径的管按圆形排列时所需的最小外管内径
    let minRequiredOuterInnerDiameter;
    if (innerTubeCount === 1) {
      minRequiredOuterInnerDiameter = innerDiameter;
    } else if (innerTubeCount === 2) {
      // 两根管并排
      minRequiredOuterInnerDiameter = innerDiameter * 2;
    } else {
      // 3根及以上按圆形排列，计算最小外接圆直径
      // 对于N根管，每根管的中心到外接圆圆心的距离为：r = d / (2 * sin(π/N))
      // 所以最小外接圆直径 = d + 2*r = d * (1 + 1/sin(π/N))
      const angle = Math.PI / innerTubeCount;
      const sinAngle = Math.sin(angle);
      minRequiredOuterInnerDiameter = innerDiameter * (1 + 1 / sinAngle);
    }
    
    // 考虑一些余量（比如5%的间隙）
    const requiredDiameterWithMargin = minRequiredOuterInnerDiameter * 1.05;
    
    if (outerInnerDiameter < requiredDiameterWithMargin) {
      errors.push(`内管数量过多：${innerTubeCount} 根内管（外径${(innerDiameter*1000).toFixed(1)}mm）需要最小外管内径${(requiredDiameterWithMargin*1000).toFixed(1)}mm，但当前外管内径为${(outerInnerDiameter*1000).toFixed(1)}mm`);
    }
  }

  // 验证传热系数（如果提供）
  if (data.givenU !== null && (isNaN(data.givenU) || data.givenU <= 0)) {
    errors.push('如果提供传热系数，必须为有效正值');
  }

  // 验证麻花管参数（如果启用）
  if (data.isTwisted) {
    // 验证头数
    if (isNaN(data.twistLobeCount) || data.twistLobeCount < 3 || data.twistLobeCount > 6) {
      errors.push('麻花管头数必须在 3-6 之间');
    }
    
    // 验证螺旋节距（齿距）
    if (isNaN(data.twistPitch) || data.twistPitch <= 0) {
      errors.push('螺旋节距（齿距）必须为有效正值');
    }
    
    // 验证齿高
    if (isNaN(data.twistToothHeight) || data.twistToothHeight <= 0) {
      errors.push('齿高必须为有效正值');
    }
    
    // 验证齿高合理性（不应超过外管内径）
    if (data.twistToothHeight > 0 && data.outerInnerDiameter > 0) {
      const doMax = data.outerInnerDiameter;
      const doMin = doMax - 2 * data.twistToothHeight;
      if (doMin <= 0) {
        errors.push('齿高过大，导致谷底内切圆直径小于等于0');
      }
    }
    
    // 麻花管外径必须等于外管内径（贴合状态）
    // 这里会在计算时自动处理，但可以添加一个警告
    const twistWallThickness = data.twistWallThickness || data.innerWallThickness;
    if (twistWallThickness > 0) {
      const twistInnerDiameter = data.outerInnerDiameter - 2 * twistWallThickness;
      if (twistInnerDiameter <= 0) {
        errors.push('麻花管壁厚过大，导致内径小于等于0');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 显示错误信息
 * @param {string} message - 错误消息
 */
export function showError(message) {
  const errorDiv = document.getElementById('error-message');
  const resultsDiv = document.getElementById('results');
  
  if (errorDiv && resultsDiv) {
    resultsDiv.classList.remove('hidden');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // 隐藏结果卡片
    document.querySelectorAll('#results > div:not(#error-message)').forEach(el => {
      el.style.display = 'none';
    });
  }
}

/**
 * 显示计算结果
 * @param {Object} results - 计算结果
 */
export function showResults(results) {
  const resultsDiv = document.getElementById('results');
  const errorDiv = document.getElementById('error-message');
  
  if (!resultsDiv) return;

  resultsDiv.classList.remove('hidden');
  
  if (errorDiv) {
    errorDiv.classList.add('hidden');
  }

  // 显示结果卡片
  document.querySelectorAll('#results > div:not(#error-message)').forEach(el => {
    el.style.display = '';
  });

  // 更新结果值
  const formatNumber = (num, decimals = 2) => {
    if (isNaN(num) || !isFinite(num)) return '-';
    return num.toFixed(decimals);
  };

  // 如果是负荷输入法，在输出区显示计算出的流量
  if (results.inputMode === 'load') {
    const calculatedFlowrateContainer = document.getElementById('calculated-flowrate-container');
    const calculatedHotFlowrateEl = document.getElementById('result-calculated-hot-flowrate');
    const calculatedColdFlowrateEl = document.getElementById('result-calculated-cold-flowrate');
    
    if (calculatedFlowrateContainer) {
      if (results.calculatedHotFlowRate !== null && results.calculatedHotFlowRate !== undefined ||
          results.calculatedColdFlowRate !== null && results.calculatedColdFlowRate !== undefined) {
        calculatedFlowrateContainer.classList.remove('hidden');
        if (calculatedHotFlowrateEl && results.calculatedHotFlowRate !== null && results.calculatedHotFlowRate !== undefined) {
          calculatedHotFlowrateEl.textContent = formatNumber(results.calculatedHotFlowRate, 4) + ' kg/s';
        }
        if (calculatedColdFlowrateEl && results.calculatedColdFlowRate !== null && results.calculatedColdFlowRate !== undefined) {
          calculatedColdFlowrateEl.textContent = formatNumber(results.calculatedColdFlowRate, 4) + ' kg/s';
        }
      } else {
        calculatedFlowrateContainer.classList.add('hidden');
      }
    }
  } else {
    // 流量输入法时隐藏计算流量显示
    const calculatedFlowrateContainer = document.getElementById('calculated-flowrate-container');
    if (calculatedFlowrateContainer) {
      calculatedFlowrateContainer.classList.add('hidden');
    }
  }

  const qElement = document.getElementById('result-q');
  const lmtdElement = document.getElementById('result-lmtd');
  const uElement = document.getElementById('result-u');
  const areaElement = document.getElementById('result-area');

  if (qElement) qElement.textContent = formatNumber(results.heatTransferRate, 3);
  if (lmtdElement) lmtdElement.textContent = formatNumber(results.lmtd, 2);
  if (uElement) uElement.textContent = formatNumber(results.overallHeatTransferCoefficient, 1);
  if (areaElement) areaElement.textContent = formatNumber(results.heatTransferArea, 3);
  
  // 显示相态信息（基于状态值）
  const phaseInfoEl = document.getElementById('result-phase-info');
  const hotPhaseEl = document.getElementById('result-hot-phase');
  const coldPhaseEl = document.getElementById('result-cold-phase');
  const formData = getFormData();
  
  if (phaseInfoEl && hotPhaseEl && coldPhaseEl) {
    const hotStateIn = formData.hotStateIn;
    const hotStateOut = formData.hotStateOut;
    const coldStateIn = formData.coldStateIn;
    const coldStateOut = formData.coldStateOut;
    
    // 将状态值转换为相态描述
    const getPhaseText = (stateIn, stateOut, fluidName) => {
      const isInTwoPhase = stateIn > 0 && stateIn < 1;
      const isOutTwoPhase = stateOut > 0 && stateOut < 1;
      const isInLiquid = stateIn === 0;
      const isInGas = stateIn === 1;
      const isOutLiquid = stateOut === 0;
      const isOutGas = stateOut === 1;
      
      if (isInTwoPhase || isOutTwoPhase) {
        if (isInTwoPhase && isOutTwoPhase) {
          return `${fluidName}: 两相 (x=${stateIn.toFixed(2)} → ${stateOut.toFixed(2)})`;
        } else if (isInTwoPhase) {
          const outPhase = isOutLiquid ? '液体' : '气体';
          return `${fluidName}: 两相→${outPhase} (x=${stateIn.toFixed(2)})`;
        } else {
          const inPhase = isInLiquid ? '液体' : '气体';
          return `${fluidName}: ${inPhase}→两相 (x=${stateOut.toFixed(2)})`;
        }
      } else {
        const inPhase = isInLiquid ? '液体' : '气体';
        const outPhase = isOutLiquid ? '液体' : '气体';
        if (inPhase === outPhase) {
          return `${fluidName}: ${inPhase}`;
        } else {
          return `${fluidName}: ${inPhase}→${outPhase}`;
        }
      }
    };
    
    const hotPhaseText = getPhaseText(hotStateIn, hotStateOut, '热流体');
    const coldPhaseText = getPhaseText(coldStateIn, coldStateOut, '冷流体');
    
    const showPhaseInfo = (hotStateIn !== 0 && hotStateIn !== 1) || (hotStateOut !== 0 && hotStateOut !== 1) ||
                         (coldStateIn !== 0 && coldStateIn !== 1) || (coldStateOut !== 0 && coldStateOut !== 1) ||
                         (hotStateIn !== hotStateOut) || (coldStateIn !== coldStateOut);
    
    hotPhaseEl.textContent = hotPhaseText;
    coldPhaseEl.textContent = coldPhaseText;
    
    if (showPhaseInfo) {
      phaseInfoEl.classList.remove('hidden');
    } else {
      phaseInfoEl.classList.add('hidden');
    }
  }
  
  // 显示阻力损失结果
  const innerPressureEl = document.getElementById('result-inner-pressure');
  const annulusPressureEl = document.getElementById('result-annulus-pressure');
  const innerFrictionEl = document.getElementById('result-inner-friction');
  const annulusFrictionEl = document.getElementById('result-annulus-friction');

  if (innerPressureEl && results.innerPressureDrop !== null && results.innerPressureDrop !== undefined) {
    innerPressureEl.textContent = formatNumber(results.innerPressureDrop, 2);
  }
  if (annulusPressureEl && results.annulusPressureDrop !== null && results.annulusPressureDrop !== undefined) {
    annulusPressureEl.textContent = formatNumber(results.annulusPressureDrop, 2);
  }
  if (innerFrictionEl && results.innerFrictionFactor !== null && results.innerFrictionFactor !== undefined) {
    innerFrictionEl.textContent = formatNumber(results.innerFrictionFactor, 4);
  }
  if (annulusFrictionEl && results.annulusFrictionFactor !== null && results.annulusFrictionFactor !== undefined) {
    annulusFrictionEl.textContent = formatNumber(results.annulusFrictionFactor, 4);
  }
  
  // 显示热阻分配比例
  const riPercentageEl = document.getElementById('result-ri-percentage');
  const roPercentageEl = document.getElementById('result-ro-percentage');
  const rwallPercentageEl = document.getElementById('result-rwall-percentage');
  const rfiPercentageEl = document.getElementById('result-rfi-percentage');
  const rfoPercentageEl = document.getElementById('result-rfo-percentage');

  if (riPercentageEl && results.Ri_percentage !== null && results.Ri_percentage !== undefined) {
    riPercentageEl.textContent = formatNumber(results.Ri_percentage, 1) + '%';
  }
  if (roPercentageEl && results.Ro_percentage !== null && results.Ro_percentage !== undefined) {
    roPercentageEl.textContent = formatNumber(results.Ro_percentage, 1) + '%';
  }
  if (rwallPercentageEl && results.Rwall_percentage !== null && results.Rwall_percentage !== undefined) {
    rwallPercentageEl.textContent = formatNumber(results.Rwall_percentage, 1) + '%';
  }
  if (rfiPercentageEl && results.Rfi_percentage !== null && results.Rfi_percentage !== undefined) {
    rfiPercentageEl.textContent = formatNumber(results.Rfi_percentage, 1) + '%';
  }
  if (rfoPercentageEl && results.Rfo_percentage !== null && results.Rfo_percentage !== undefined) {
    rfoPercentageEl.textContent = formatNumber(results.Rfo_percentage, 1) + '%';
  }
  
  // 显示面积余量结果
  const requiredAreaEl = document.getElementById('result-required-area');
  const areaMarginEl = document.getElementById('result-area-margin');
  const areaMarginStatusEl = document.getElementById('result-area-margin-status');

  if (requiredAreaEl && results.requiredArea !== null && results.requiredArea !== undefined) {
    requiredAreaEl.textContent = formatNumber(results.requiredArea, 3);
  }

  if (areaMarginEl && results.areaMargin !== null && results.areaMargin !== undefined) {
    areaMarginEl.textContent = formatNumber(results.areaMargin, 2) + '%';
    
    // 根据余量状态设置颜色
    areaMarginEl.className = 'text-xl font-bold';
    if (results.areaMarginStatus === 'insufficient') {
      areaMarginEl.classList.add('text-red-700');
      areaMarginEl.classList.remove('text-green-700', 'text-yellow-700');
    } else if (results.areaMarginStatus === 'adequate') {
      areaMarginEl.classList.add('text-green-700');
      areaMarginEl.classList.remove('text-red-700', 'text-yellow-700');
    } else if (results.areaMarginStatus === 'excessive') {
      areaMarginEl.classList.add('text-yellow-700');
      areaMarginEl.classList.remove('text-red-700', 'text-green-700');
    }
  }

  // 显示余量状态提示
  if (areaMarginStatusEl && results.areaMarginStatus && results.areaMarginStatus !== 'unknown') {
    let statusText = '';
    let statusClass = '';
    let statusIcon = '';
    
    if (results.areaMarginStatus === 'insufficient') {
      statusText = '余量不足（< 10%），建议增加换热面积或优化传热系数';
      statusClass = 'bg-red-50 border-red-200 text-red-800';
      statusIcon = '⚠️';
    } else if (results.areaMarginStatus === 'adequate') {
      statusText = '设计合理（10% ~ 25%）';
      statusClass = 'bg-green-50 border-green-200 text-green-800';
      statusIcon = '✓';
    } else if (results.areaMarginStatus === 'excessive') {
      statusText = '设计保守（> 25%），可考虑优化以降低成本';
      statusClass = 'bg-yellow-50 border-yellow-200 text-yellow-800';
      statusIcon = 'ℹ️';
    }
    
    areaMarginStatusEl.className = `mt-3 p-3 rounded-lg border ${statusClass}`;
    areaMarginStatusEl.innerHTML = `<span class="mr-2">${statusIcon}</span>${statusText}`;
    areaMarginStatusEl.style.display = 'block';
  } else if (areaMarginStatusEl) {
    areaMarginStatusEl.style.display = 'none';
  }
  
  // 显示麻花管增强系数（如果适用）
  if (results.isTwisted && results.enhancementFactor) {
    const enhancementInfo = document.createElement('div');
    enhancementInfo.className = 'mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl';
    
    // 构建显示内容
    let contentHTML = `
      <div class="flex items-center mb-2">
        <span class="text-yellow-600 text-lg mr-2">⚡</span>
        <span class="font-semibold text-yellow-800">麻花管传热增强</span>
      </div>
      <div class="text-sm text-yellow-700 space-y-1">
        <div>
          传热增强系数: <span class="font-bold">${formatNumber(results.enhancementFactor, 2)}</span>
          <span class="text-yellow-600 ml-2">(相比直管提升 ${formatNumber((results.enhancementFactor - 1) * 100, 1)}%)</span>
        </div>
    `;
    
    // 如果存在翅化系数，显示翅化系数
    if (results.finningRatio !== null && results.finningRatio !== undefined) {
      contentHTML += `
        <div>
          翅化系数: <span class="font-bold">${formatNumber(results.finningRatio, 3)}</span>
          <span class="text-yellow-600 ml-2">(麻花管面积/光管面积 = ${formatNumber(results.singleTubeArea, 3)} m² / ${formatNumber(results.smoothTubeArea, 3)} m²)</span>
        </div>
      `;
    }
    
    contentHTML += `</div>`;
    enhancementInfo.innerHTML = contentHTML;
    
    // 移除旧的增强信息（如果存在）
    const oldInfo = resultsDiv.querySelector('.bg-yellow-50');
    if (oldInfo) oldInfo.remove();
    
    resultsDiv.appendChild(enhancementInfo);
  }

  // 绘制温度分布曲线
  if (results.temperatureDistribution) {
    const canvas = document.getElementById('temperature-distribution-canvas');
    if (canvas) {
      // 获取流动方式和长度（从表单数据）
      const formData = getFormData();
      const flowType = formData.flowType || 'counter';
      const length = formData.length || 5.0;
      
      // 设置Canvas尺寸（高DPI支持）
      const container = canvas.parentElement;
      const containerWidth = container ? container.clientWidth - 32 : 800; // 减去padding
      const containerHeight = 450; // 增加高度以容纳流动方向箭头和标注
      
      // 设置Canvas实际像素尺寸（考虑高DPI）
      const dpr = window.devicePixelRatio || 1;
      const actualWidth = containerWidth * dpr;
      const actualHeight = containerHeight * dpr;
      
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      canvas.style.width = containerWidth + 'px';
      canvas.style.height = containerHeight + 'px';
      
      // 获取温度参数（从表单或结果中）
      const hotTin = formData.hotTin;
      const hotTout = formData.hotTout;
      const coldTin = formData.coldTin;
      const coldTout = formData.coldTout;
      
      // 绘制温度分布曲线（传入端点温度参数）
      drawTemperatureDistribution(canvas, results.temperatureDistribution, flowType, length, {
        hotTin: hotTin,
        hotTout: hotTout,
        coldTin: coldTin,
        coldTout: coldTout
      });
      
      // 更新说明文本
      const flowTypeNote = document.getElementById('flow-type-note');
      const parallelFlowNote = document.getElementById('parallel-flow-note');
      
      if (flowType === 'counter') {
        if (flowTypeNote) {
          flowTypeNote.classList.remove('hidden');
          flowTypeNote.innerHTML = '<span class="font-semibold">逆流流动：</span>热流体和冷流体从相反方向流动，传热效率较高，两流体温度差较为均匀，可以实现更低的出口温度';
        }
        if (parallelFlowNote) {
          parallelFlowNote.classList.add('hidden');
        }
      } else {
        if (flowTypeNote) {
          flowTypeNote.classList.add('hidden');
        }
        if (parallelFlowNote) {
          parallelFlowNote.classList.remove('hidden');
          parallelFlowNote.innerHTML = '<span class="font-semibold">并流流动：</span>热流体和冷流体从同一方向流动，入口端温差大，出口端温差小，传热效率相对较低，但可以避免局部过热';
        }
      }
    }
  }
}

/**
 * 设置计算按钮状态
 * @param {boolean} enabled - 是否启用
 * @param {string} text - 按钮文本
 */
export function setCalculateButtonState(enabled, text = '计算') {
  const btn = document.getElementById('calculate-btn');
  if (btn) {
    btn.disabled = !enabled;
    btn.textContent = text;
  }
}

/**
 * 执行计算
 */
export async function performCalculation() {
  try {
    // 获取表单数据
    const formData = getFormData();

    // 验证数据
    const validation = validateFormData(formData);
    if (!validation.valid) {
      showError(validation.errors.join('；'));
      return;
    }

    // 禁用按钮并显示加载状态
    setCalculateButtonState(false, '计算中...');

    // 执行计算
    const results = await calculateHeatExchanger({
      inputMode: formData.inputMode,
      heatLoad: formData.heatLoad,  // 负荷输入法时的传热量 (kW)
      hotFluid: formData.hotFluid,
      hotTin: formData.hotTin,
      hotTout: formData.hotTout,
      hotFlowRate: formData.hotFlowRate,
      hotPressure: formData.hotPressure,
      hotProcessType: formData.hotProcessType,
      hotStateIn: formData.hotStateIn,
      hotStateOut: formData.hotStateOut,
      coldFluid: formData.coldFluid,
      coldTin: formData.coldTin,
      coldTout: formData.coldTout,
      coldFlowRate: formData.coldFlowRate,
      coldPressure: formData.coldPressure,
      coldProcessType: formData.coldProcessType,
      coldStateIn: formData.coldStateIn,
      coldStateOut: formData.coldStateOut,
      // 传热面积计算使用外径
      innerDiameter: formData.innerDiameter, // 内管外径
      outerDiameter: formData.outerDiameter, // 外管外径
      // 流速计算使用内径
      innerInnerDiameter: formData.innerInnerDiameter, // 内管内径
      outerInnerDiameter: formData.outerInnerDiameter, // 外管内径
      // 壁厚信息（用于可视化）
      innerWallThickness: formData.innerWallThickness,
      outerWallThickness: formData.outerWallThickness,
      innerOuterDiameter: formData.innerOuterDiameter,
      outerOuterDiameter: formData.outerOuterDiameter,
      length: formData.length,
      flowType: formData.flowType,
      givenU: formData.givenU,
      innerTubeCount: formData.innerTubeCount,
      innerTubeType: formData.innerTubeType,
      isTwisted: formData.isTwisted,
      twistLobeCount: formData.twistLobeCount,
      twistPitch: formData.twistPitch,
      twistToothHeight: formData.twistToothHeight,  // 齿高
      twistWallThickness: formData.twistWallThickness,
      // 麻花管模式下，外径等于外管内径
      twistOuterDiameter: formData.isTwisted ? formData.outerInnerDiameter : formData.innerOuterDiameter,
      tubeMaterial: formData.innerTubeMaterial,  // 内管材质
      foulingInner: formData.foulingInner,  // 管内污垢热阻
      foulingOuter: formData.foulingOuter,  // 管外污垢热阻
      hotFluidLocation: formData.hotFluidLocation  // 热流体位置
    });

    // 恢复按钮状态
    setCalculateButtonState(true, '计算');

    // 显示结果
    if (results.success) {
      showResults(results);
      // 更新可视化：显示截面图
      updateVisualization({
      innerDiameter: formData.innerOuterDiameter, // 用于显示
      outerDiameter: formData.outerOuterDiameter, // 用于显示
      innerInnerDiameter: formData.innerInnerDiameter,
      outerInnerDiameter: formData.outerInnerDiameter,
      innerWallThickness: formData.innerWallThickness,
      outerWallThickness: formData.outerWallThickness,
      innerOuterDiameter: formData.innerOuterDiameter,
      outerOuterDiameter: formData.outerOuterDiameter,
      length: formData.length,
      innerTubeCount: formData.innerTubeCount,
      innerTubeType: formData.innerTubeType,
      isTwisted: formData.isTwisted,
      twistLobeCount: formData.twistLobeCount,
      twistPitch: formData.twistPitch,
      twistToothHeight: formData.twistToothHeight,  // 齿高
      twistWallThickness: formData.twistWallThickness,
      twistOuterDiameter: formData.isTwisted ? formData.outerInnerDiameter : formData.innerOuterDiameter,
      passCount: formData.passCount,
      outerTubeCountPerPass: formData.outerTubeCountPerPass
    });
    } else {
      const errorMsg = results.error || '计算失败，请检查输入参数';
      console.error('计算返回错误:', errorMsg, results);
      showError(errorMsg);
    }
  } catch (error) {
    console.error('计算过程出错:', error);
    console.error('错误堆栈:', error.stack);
    setCalculateButtonState(true, '计算');
    const errorMsg = error.message || '未知错误';
    showError(`计算失败: ${errorMsg}`);
  }
}

/**
 * 获取可视化参数
 * @param {Object} formData - 表单数据
 * @returns {Object} 可视化参数
 */
function getVisualizationParams(formData) {
  return {
    innerDiameter: formData.innerOuterDiameter || formData.innerDiameter || 0.02,
    outerDiameter: formData.outerOuterDiameter || formData.outerDiameter || 0.04,
    innerInnerDiameter: formData.innerInnerDiameter,
    outerInnerDiameter: formData.outerInnerDiameter,
    innerWallThickness: formData.innerWallThickness,
    outerWallThickness: formData.outerWallThickness,
    innerOuterDiameter: formData.innerOuterDiameter,
    outerOuterDiameter: formData.outerOuterDiameter,
    length: formData.length || 5.0,
    innerTubeCount: formData.innerTubeCount || 1,
    innerTubeType: formData.innerTubeType || 'smooth',
    isTwisted: formData.isTwisted,
    twistLobeCount: formData.twistLobeCount || 6,
    twistPitch: formData.twistPitch || 0.0065,
    twistToothHeight: formData.twistToothHeight || 0.003,
    twistWallThickness: formData.twistWallThickness,
    twistOuterDiameter: formData.isTwisted ? formData.outerInnerDiameter : formData.innerOuterDiameter,
    passCount: formData.passCount || 1,
    outerTubeCountPerPass: formData.outerTubeCountPerPass || 1
  };
}

/**
 * 更新输入模式UI显示
 */
function updateInputModeUI() {
  const inputMode = document.querySelector('input[name="input-mode"]:checked')?.value || 'flowrate';
  const heatLoadContainer = document.getElementById('heat-load-input-container');
  const hotFlowrateContainer = document.getElementById('hot-flowrate-container');
  const coldFlowrateContainer = document.getElementById('cold-flowrate-container');
  const hotFlowrateInput = document.getElementById('hot-flowrate');
  const coldFlowrateInput = document.getElementById('cold-flowrate');
  const hotFlowrateLabel = document.getElementById('hot-flowrate-label');
  const coldFlowrateLabel = document.getElementById('cold-flowrate-label');
  const hotFlowrateCalculated = document.getElementById('hot-flowrate-calculated');
  const coldFlowrateCalculated = document.getElementById('cold-flowrate-calculated');
  
  if (inputMode === 'load') {
    // 负荷输入法：显示传热量输入，隐藏流量输入
    if (heatLoadContainer) heatLoadContainer.classList.remove('hidden');
    if (hotFlowrateContainer) hotFlowrateContainer.classList.add('hidden');
    if (coldFlowrateContainer) coldFlowrateContainer.classList.add('hidden');
  } else {
    // 流量输入法：隐藏传热量输入，显示流量输入
    if (heatLoadContainer) heatLoadContainer.classList.add('hidden');
    if (hotFlowrateContainer) hotFlowrateContainer.classList.remove('hidden');
    if (coldFlowrateContainer) coldFlowrateContainer.classList.remove('hidden');
  }
}

/**
 * 初始化 UI 事件监听
 */
export function initializeUI() {
  // 加载默认示例（调试用）
  import('./examples.js').then(({ currentDebugExample, loadExampleToForm }) => {
    if (currentDebugExample) {
      loadExampleToForm(currentDebugExample);
      console.log('[初始化] 已加载默认调试案例');
    }
  }).catch(err => {
    console.warn('[初始化] 无法加载默认案例:', err);
  });
  
  // 输入模式切换事件
  const inputModeRadios = document.querySelectorAll('input[name="input-mode"]');
  inputModeRadios.forEach(radio => {
    radio.addEventListener('change', updateInputModeUI);
  });
  // 初始化UI显示状态
  updateInputModeUI();
  
  // 计算按钮点击事件
  const calculateBtn = document.getElementById('calculate-btn');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', performCalculation);
  }

  // 回车键触发计算
  document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      performCalculation();
    }
  });

  // 内管类型切换（显示/隐藏光管和麻花管参数）
  const innerTubeTypeSelect = document.getElementById('inner-tube-type');
  const smoothParamsDiv = document.getElementById('smooth-tube-params');
  const twistedParamsDiv = document.getElementById('twisted-tube-params');
  const innerTubeCountSelect = document.getElementById('inner-tube-count');
  
  // 麻花管预设选择
  const twistedTubePresetSelect = document.getElementById('twisted-tube-preset');
  
  // 当选择麻花管预设时，自动填充参数
  if (twistedTubePresetSelect) {
    twistedTubePresetSelect.addEventListener('change', (e) => {
      const presetId = e.target.value;
      if (presetId) {
        const preset = getTwistedTubePreset(presetId);
        if (preset) {
          // 填充外管参数
          const outerOuterDiameterInput = document.getElementById('outer-outer-diameter');
          const outerWallThicknessInput = document.getElementById('outer-wall-thickness');
          if (outerOuterDiameterInput) outerOuterDiameterInput.value = preset.outerOuterDiameter;
          if (outerWallThicknessInput) outerWallThicknessInput.value = preset.outerWallThickness;
          
          // 填充内管壁厚
          const innerWallThicknessInput = document.getElementById('inner-wall-thickness');
          if (innerWallThicknessInput) innerWallThicknessInput.value = preset.innerWallThickness;
          
          // 填充麻花管参数
          const twistPitchInput = document.getElementById('twist-pitch');
          const twistToothHeightInput = document.getElementById('twist-tooth-height');
          const twistLobeCountSelect = document.getElementById('twist-lobe-count');
          if (twistPitchInput) twistPitchInput.value = preset.pitch;
          if (twistToothHeightInput) twistToothHeightInput.value = preset.toothHeight;
          if (twistLobeCountSelect) twistLobeCountSelect.value = preset.lobeCount;
          
          // 触发change事件以更新显示
          if (outerOuterDiameterInput) outerOuterDiameterInput.dispatchEvent(new Event('change'));
          if (outerWallThicknessInput) outerWallThicknessInput.dispatchEvent(new Event('change'));
          if (innerWallThicknessInput) innerWallThicknessInput.dispatchEvent(new Event('change'));
          if (twistPitchInput) twistPitchInput.dispatchEvent(new Event('change'));
          if (twistToothHeightInput) twistToothHeightInput.dispatchEvent(new Event('change'));
          if (twistLobeCountSelect) twistLobeCountSelect.dispatchEvent(new Event('change'));
          
          // 更新麻花管几何参数显示
          updateTwistedGeometryDisplay();
        }
      }
    });
  }
  
  // 更新麻花管几何参数显示
  const updateTwistedGeometryDisplay = () => {
    const formData = getFormData();
    if (formData.isTwisted) {
      const twistOuterDiameter = formData.outerInnerDiameter; // 麻花管外径 = 外管内径
      const twistWallThickness = formData.twistWallThickness || formData.innerWallThickness;
      // 使用齿高计算doMin，而不是用壁厚
      const doMax = twistOuterDiameter;
      const doMin = doMax - 2 * (formData.twistToothHeight || 0.003);
      
      // 更新显示
      const calcOuterDiameterEl = document.getElementById('calc-twist-outer-diameter');
      const calcInnerDiameterEl = document.getElementById('calc-twist-inner-diameter');
      if (calcOuterDiameterEl) calcOuterDiameterEl.textContent = (doMax * 1000).toFixed(2);
      if (calcInnerDiameterEl) calcInnerDiameterEl.textContent = (doMin * 1000).toFixed(2);
      
      // 计算当量直径和流通面积
      try {
        // 使用齿高计算doMin
        const doMax = twistOuterDiameter;
        const doMin = doMax - 2 * (formData.twistToothHeight || 0.003);
        const lobeSection = calculateLobeCrossSection(doMax, doMin, formData.twistLobeCount || 6);
        
        const calcEquivalentDiameterEl = document.getElementById('calc-twist-equivalent-diameter');
        const calcFlowAreaEl = document.getElementById('calc-twist-flow-area');
        if (calcEquivalentDiameterEl) calcEquivalentDiameterEl.textContent = (lobeSection.equivalentDiameter * 1000).toFixed(2);
        if (calcFlowAreaEl) calcFlowAreaEl.textContent = lobeSection.area.toFixed(6);
      } catch (e) {
        // 如果计算失败，暂时不显示
        console.warn('无法更新麻花管几何参数:', e);
      }
    }
  };
  
  if (innerTubeTypeSelect) {
    const updateTubeTypeParamsVisibility = () => {
      const isTwisted = innerTubeTypeSelect.value === 'twisted';
      
      // 显示/隐藏光管参数
      if (smoothParamsDiv) {
        if (isTwisted) {
          smoothParamsDiv.classList.add('hidden');
        } else {
          smoothParamsDiv.classList.remove('hidden');
        }
      }
      
      // 显示/隐藏麻花管参数
      if (twistedParamsDiv) {
        if (isTwisted) {
          twistedParamsDiv.classList.remove('hidden');
          // 麻花管模式下，内管数量固定为1
          if (innerTubeCountSelect) {
            innerTubeCountSelect.value = '1';
            innerTubeCountSelect.disabled = true;
            innerTubeCountSelect.classList.add('opacity-50', 'cursor-not-allowed');
          }
          updateTwistedGeometryDisplay();
        } else {
          twistedParamsDiv.classList.add('hidden');
          // 恢复内管数量选择
          if (innerTubeCountSelect) {
            innerTubeCountSelect.disabled = false;
            innerTubeCountSelect.classList.remove('opacity-50', 'cursor-not-allowed');
          }
        }
      }
    };
    
    // 初始化显示状态（必须在事件监听器之前调用）
    updateTubeTypeParamsVisibility();
    
    innerTubeTypeSelect.addEventListener('change', () => {
      updateTubeTypeParamsVisibility();
      // 当切换到麻花管模式时，如果预设选择为空，自动选择38mm预设
      if (innerTubeTypeSelect.value === 'twisted' && twistedTubePresetSelect) {
        if (!twistedTubePresetSelect.value) {
          twistedTubePresetSelect.value = '38';
          twistedTubePresetSelect.dispatchEvent(new Event('change'));
        }
      }
      // 更新可视化
      const formData = getFormData();
      updateVisualization(getVisualizationParams(formData));
    });
    
    // 监听相关参数变化，更新几何参数显示
    const twistInputs = ['outer-outer-diameter', 'outer-wall-thickness', 'inner-wall-thickness', 'twist-wall-thickness', 'twist-lobe-count', 'twist-pitch', 'twist-tooth-height'];
    twistInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => {
          // 如果手动修改了参数，清除预设选择（设为"自定义"）
          if (twistedTubePresetSelect && twistedTubePresetSelect.value) {
            twistedTubePresetSelect.value = '';
          }
          if (innerTubeTypeSelect.value === 'twisted') {
            updateTwistedGeometryDisplay();
          }
        });
      }
    });
  }
  
  // 内管数量变化时更新可视化
  if (innerTubeCountSelect) {
    innerTubeCountSelect.addEventListener('change', () => {
      const formData = getFormData();
      updateVisualization(getVisualizationParams(formData));
    });
  }
  
  // 流程数量和外管数量变化时更新可视化
  const passCountSelect = document.getElementById('pass-count');
  const outerTubeCountSelect = document.getElementById('outer-tube-count-per-pass');
  
  const updateVisualizationOnChange = () => {
    const formData = getFormData();
    updateVisualization(getVisualizationParams(formData));
  };
  
  if (passCountSelect) {
    passCountSelect.addEventListener('change', updateVisualizationOnChange);
  }
  if (outerTubeCountSelect) {
    outerTubeCountSelect.addEventListener('change', updateVisualizationOnChange);
  }

  // 参数变化时更新可视化
  const visualizationInputs = ['inner-outer-diameter', 'inner-wall-thickness', 'outer-outer-diameter', 'outer-wall-thickness', 'length', 'twist-pitch', 'twist-lobe-count', 'twist-wall-thickness'];
  visualizationInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        const formData = getFormData();
        if (formData.innerOuterDiameter && formData.outerOuterDiameter && formData.length) {
          updateVisualization(getVisualizationParams(formData));
        }
      });
    }
  });
  
  // 压力输入始终显示（已移除饱和温度相关逻辑）
  // 初始化和绑定事件
  const hotProcessTypeSelect = document.getElementById('hot-process-type');
  const coldProcessTypeSelect = document.getElementById('cold-process-type');
  
  // 根据过程类型显示温度提示（单相换热时显示）
  const hotTinHint = document.getElementById('hot-tin-hint');
  const hotToutHint = document.getElementById('hot-tout-hint');
  const coldTinHint = document.getElementById('cold-tin-hint');
  const coldToutHint = document.getElementById('cold-tout-hint');
  
  const updateTemperatureHints = () => {
    if (hotProcessTypeSelect && hotTinHint && hotToutHint) {
      const processType = hotProcessTypeSelect.value;
      if (processType === 'cooling') {
        // 冷却模式（单相换热）：显示提示
        hotTinHint.classList.remove('hidden');
        hotToutHint.classList.remove('hidden');
      } else {
        // 冷凝模式：隐藏提示
        hotTinHint.classList.add('hidden');
        hotToutHint.classList.add('hidden');
      }
    }
    
    if (coldProcessTypeSelect && coldTinHint && coldToutHint) {
      const processType = coldProcessTypeSelect.value;
      if (processType === 'cooling') {
        // 加热模式（单相换热，冷流体的cooling实际是加热）：显示提示
        coldTinHint.classList.remove('hidden');
        coldToutHint.classList.remove('hidden');
      } else {
        // 蒸发模式：隐藏提示
        coldTinHint.classList.add('hidden');
        coldToutHint.classList.add('hidden');
      }
    }
  };
  
  // 监听过程类型变化
  if (hotProcessTypeSelect) {
    hotProcessTypeSelect.addEventListener('change', () => {
      updateTemperatureHints();
    });
  }
  if (coldProcessTypeSelect) {
    coldProcessTypeSelect.addEventListener('change', () => {
      updateTemperatureHints();
    });
  }
  
  // 初始化温度提示
  updateTemperatureHints();


  // 监听材质选择变化，更新材质描述
  const innerTubeMaterialSelect = document.getElementById('inner-tube-material');
  const materialDescriptionEl = document.getElementById('material-description');
  if (innerTubeMaterialSelect && materialDescriptionEl) {
    // 初始化材质描述
    const initialMaterialId = innerTubeMaterialSelect.value;
    const initialMaterialInfo = getMaterialInfo(initialMaterialId);
    if (initialMaterialInfo) {
      materialDescriptionEl.textContent = initialMaterialInfo.description;
    }
    
    // 监听材质选择变化
    innerTubeMaterialSelect.addEventListener('change', (e) => {
      const materialId = e.target.value;
      const materialInfo = getMaterialInfo(materialId);
      if (materialInfo) {
        materialDescriptionEl.textContent = materialInfo.description;
      }
    });
  }
  
  // 初始可视化
  updateVisualization({
    innerDiameter: 0.02,
    outerDiameter: 0.04,
    innerInnerDiameter: 0.016,
    outerInnerDiameter: 0.036,
    innerWallThickness: 0.002,
    outerWallThickness: 0.002,
    innerOuterDiameter: 0.02,
    outerOuterDiameter: 0.04,
    length: 5.0,
    innerTubeCount: 1,
    innerTubeType: 'smooth',
    isTwisted: false,
    twistLobeCount: 4,
    twistPitch: 0.1,
    twistWallThickness: null,
    passCount: 1,
    outerTubeCountPerPass: 1
  });
}

