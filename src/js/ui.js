/**
 * UI 交互模块
 * 处理表单验证、结果显示等界面交互
 */

import { calculateHeatExchanger, calculateLobeCrossSection } from './heat_exchanger.js';
import { updateVisualization } from './visualization.js';
import { loadExampleToForm, straightTubeExample, twistedTubeExample } from './examples.js';

/**
 * 获取表单输入值
 * @returns {Object} 表单数据
 */
export function getFormData() {
  return {
    hotFluid: document.getElementById('hot-fluid').value,
    hotTin: parseFloat(document.getElementById('hot-tin').value),
    hotTout: parseFloat(document.getElementById('hot-tout').value),
    hotFlowRate: parseFloat(document.getElementById('hot-flowrate').value),
    hotPressure: parseFloat(document.getElementById('hot-pressure').value) || 101.325,
    
    coldFluid: document.getElementById('cold-fluid').value,
    coldTin: parseFloat(document.getElementById('cold-tin').value),
    coldTout: parseFloat(document.getElementById('cold-tout').value),
    coldFlowRate: parseFloat(document.getElementById('cold-flowrate').value),
    coldPressure: parseFloat(document.getElementById('cold-pressure').value) || 101.325,
    
    // 尺寸输入使用 mm，这里统一转换为 m
    // 获取外径和壁厚
    innerOuterDiameter: parseFloat(document.getElementById('inner-outer-diameter').value) / 1000, // 内管外径 (m)
    innerWallThickness: parseFloat(document.getElementById('inner-wall-thickness').value) / 1000, // 内管壁厚 (m)
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
    
    innerTubeCount: parseInt(document.getElementById('inner-tube-count').value) || 1,
    innerTubeType: document.getElementById('inner-tube-type').value || 'smooth',
    isTwisted: document.getElementById('inner-tube-type').value === 'twisted',
    // 麻花管参数
    twistLobeCount: parseInt(document.getElementById('twist-lobe-count')?.value) || 4,
    twistPitch: parseFloat(document.getElementById('twist-pitch')?.value) || 0.1,
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

  // 验证热流体参数
  if (!data.hotFluid) errors.push('请选择热流体工质');
  if (isNaN(data.hotTin) || data.hotTin <= 0) errors.push('请输入有效的热流体入口温度');
  if (isNaN(data.hotTout) || data.hotTout <= 0) errors.push('请输入有效的热流体出口温度');
  if (data.hotTin <= data.hotTout) errors.push('热流体入口温度必须大于出口温度');
  if (isNaN(data.hotFlowRate) || data.hotFlowRate <= 0) errors.push('请输入有效的热流体流量');
  if (isNaN(data.hotPressure) || data.hotPressure <= 0) errors.push('请输入有效的热流体压力');

  // 验证冷流体参数
  if (!data.coldFluid) errors.push('请选择冷流体工质');
  if (isNaN(data.coldTin) || data.coldTin <= 0) errors.push('请输入有效的冷流体入口温度');
  if (isNaN(data.coldTout) || data.coldTout <= 0) errors.push('请输入有效的冷流体出口温度');
  if (data.coldTout <= data.coldTin) errors.push('冷流体出口温度必须大于入口温度');
  if (isNaN(data.coldFlowRate) || data.coldFlowRate <= 0) errors.push('请输入有效的冷流体流量');
  if (isNaN(data.coldPressure) || data.coldPressure <= 0) errors.push('请输入有效的冷流体压力');

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
    
    // 验证螺旋节距
    if (isNaN(data.twistPitch) || data.twistPitch <= 0) {
      errors.push('螺旋节距必须为有效正值');
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

  const qElement = document.getElementById('result-q');
  const lmtdElement = document.getElementById('result-lmtd');
  const uElement = document.getElementById('result-u');
  const areaElement = document.getElementById('result-area');

  if (qElement) qElement.textContent = formatNumber(results.heatTransferRate, 3);
  if (lmtdElement) lmtdElement.textContent = formatNumber(results.lmtd, 2);
  if (uElement) uElement.textContent = formatNumber(results.overallHeatTransferCoefficient, 1);
  if (areaElement) areaElement.textContent = formatNumber(results.heatTransferArea, 3);
  
  // 显示麻花管增强系数（如果适用）
  if (results.isTwisted && results.enhancementFactor) {
    const enhancementInfo = document.createElement('div');
    enhancementInfo.className = 'mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl';
    enhancementInfo.innerHTML = `
      <div class="flex items-center mb-2">
        <span class="text-yellow-600 text-lg mr-2">⚡</span>
        <span class="font-semibold text-yellow-800">麻花管传热增强</span>
      </div>
      <div class="text-sm text-yellow-700">
        传热增强系数: <span class="font-bold">${formatNumber(results.enhancementFactor, 2)}</span>
        <span class="text-yellow-600 ml-2">(相比直管提升 ${formatNumber((results.enhancementFactor - 1) * 100, 1)}%)</span>
      </div>
    `;
    
    // 移除旧的增强信息（如果存在）
    const oldInfo = resultsDiv.querySelector('.bg-yellow-50');
    if (oldInfo) oldInfo.remove();
    
    resultsDiv.appendChild(enhancementInfo);
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
      hotFluid: formData.hotFluid,
      hotTin: formData.hotTin,
      hotTout: formData.hotTout,
      hotFlowRate: formData.hotFlowRate,
      hotPressure: formData.hotPressure,
      coldFluid: formData.coldFluid,
      coldTin: formData.coldTin,
      coldTout: formData.coldTout,
      coldFlowRate: formData.coldFlowRate,
      coldPressure: formData.coldPressure,
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
      twistWallThickness: formData.twistWallThickness,
      // 麻花管模式下，外径等于外管内径
      twistOuterDiameter: formData.isTwisted ? formData.outerInnerDiameter : formData.innerOuterDiameter
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
      twistWallThickness: formData.twistWallThickness,
      twistOuterDiameter: formData.isTwisted ? formData.outerInnerDiameter : formData.innerOuterDiameter,
      passCount: formData.passCount,
      outerTubeCountPerPass: formData.outerTubeCountPerPass
    });
    } else {
      showError(results.error || '计算失败，请检查输入参数');
    }
  } catch (error) {
    console.error('计算过程出错:', error);
    setCalculateButtonState(true, '计算');
    showError(`计算失败: ${error.message}`);
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
    twistLobeCount: formData.twistLobeCount || 4,
    twistPitch: formData.twistPitch || 0.1,
    twistWallThickness: formData.twistWallThickness,
    twistOuterDiameter: formData.isTwisted ? formData.outerInnerDiameter : formData.innerOuterDiameter,
    passCount: formData.passCount || 1,
    outerTubeCountPerPass: formData.outerTubeCountPerPass || 1
  };
}

/**
 * 初始化 UI 事件监听
 */
export function initializeUI() {
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
  
  // 更新麻花管几何参数显示
  const updateTwistedGeometryDisplay = () => {
    const formData = getFormData();
    if (formData.isTwisted) {
      const twistOuterDiameter = formData.outerInnerDiameter; // 麻花管外径 = 外管内径
      const twistWallThickness = formData.twistWallThickness || formData.outerWallThickness;
      const twistInnerDiameter = twistOuterDiameter - 2 * twistWallThickness;
      
      // 更新显示
      const calcOuterDiameterEl = document.getElementById('calc-twist-outer-diameter');
      const calcInnerDiameterEl = document.getElementById('calc-twist-inner-diameter');
      if (calcOuterDiameterEl) calcOuterDiameterEl.textContent = (twistOuterDiameter * 1000).toFixed(2);
      if (calcInnerDiameterEl) calcInnerDiameterEl.textContent = (twistInnerDiameter * 1000).toFixed(2);
      
      // 计算当量直径和流通面积
      try {
        const lobeSection = calculateLobeCrossSection(twistOuterDiameter, twistInnerDiameter, formData.twistLobeCount || 4);
        
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
      // 更新可视化
      const formData = getFormData();
      updateVisualization(getVisualizationParams(formData));
    });
    
    // 监听相关参数变化，更新几何参数显示
    const twistInputs = ['outer-outer-diameter', 'outer-wall-thickness', 'twist-wall-thickness', 'twist-lobe-count', 'twist-pitch'];
    twistInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => {
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

  // 示例案例按钮
  const loadStraightExampleBtn = document.getElementById('load-example-straight');
  const loadTwistedExampleBtn = document.getElementById('load-example-twisted');
  
  if (loadStraightExampleBtn) {
    loadStraightExampleBtn.addEventListener('click', () => {
      loadExampleToForm(straightTubeExample);
    });
  }
  
  if (loadTwistedExampleBtn) {
    loadTwistedExampleBtn.addEventListener('click', () => {
      loadExampleToForm(twistedTubeExample);
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

