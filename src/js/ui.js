/**
 * UI 交互模块
 * 处理表单验证、结果显示等界面交互
 */

import { calculateHeatExchanger } from './heat_exchanger.js';
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
    innerDiameter: parseFloat(document.getElementById('inner-diameter').value) / 1000,
    outerDiameter: parseFloat(document.getElementById('outer-diameter').value) / 1000,
    length: parseFloat(document.getElementById('length').value),
    flowType: document.getElementById('flow-type').value,
    
    givenU: (() => {
      const uInput = document.getElementById('heat-transfer-coefficient').value;
      return uInput ? parseFloat(uInput) : null;
    })(),
    
    isTwisted: document.getElementById('twisted-tube-mode').checked,
    twistPitch: parseFloat(document.getElementById('twist-pitch').value) || 0.1,
    twistAngle: parseFloat(document.getElementById('twist-angle').value) || 45
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
  if (isNaN(data.innerDiameter) || data.innerDiameter <= 0) errors.push('请输入有效的内管直径');
  if (isNaN(data.outerDiameter) || data.outerDiameter <= 0) errors.push('请输入有效的外管直径');
  if (data.outerDiameter <= data.innerDiameter) errors.push('外管直径必须大于内管直径');
  if (isNaN(data.length) || data.length <= 0) errors.push('请输入有效的管长');

  // 验证传热系数（如果提供）
  if (data.givenU !== null && (isNaN(data.givenU) || data.givenU <= 0)) {
    errors.push('如果提供传热系数，必须为有效正值');
  }

  // 验证麻花管参数（如果启用）
  if (data.isTwisted) {
    if (isNaN(data.twistPitch) || data.twistPitch <= 0) {
      errors.push('螺旋节距必须为有效正值');
    }
    if (isNaN(data.twistAngle) || data.twistAngle <= 0 || data.twistAngle >= 90) {
      errors.push('螺旋角度必须在 0-90° 之间');
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
      innerDiameter: formData.innerDiameter,
      outerDiameter: formData.outerDiameter,
      length: formData.length,
      flowType: formData.flowType,
      givenU: formData.givenU,
      isTwisted: formData.isTwisted,
      twistPitch: formData.twistPitch,
      twistAngle: formData.twistAngle
    });

    // 恢复按钮状态
    setCalculateButtonState(true, '计算');

    // 显示结果
    if (results.success) {
      showResults(results);
    // 更新可视化：在一张图上展示几何 + 温度 + 计算结果
    updateVisualization({
      innerDiameter: formData.innerDiameter,
      outerDiameter: formData.outerDiameter,
      length: formData.length,
      isTwisted: formData.isTwisted,
      twistPitch: formData.twistPitch,
      twistAngle: formData.twistAngle,
      hotTin: formData.hotTin,
      hotTout: formData.hotTout,
      coldTin: formData.coldTin,
      coldTout: formData.coldTout,
      heatTransferRate: results.heatTransferRate,
      lmtd: results.lmtd,
      overallHeatTransferCoefficient: results.overallHeatTransferCoefficient
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

  // 麻花管模式切换
  const twistedModeCheckbox = document.getElementById('twisted-tube-mode');
  const twistedParamsDiv = document.getElementById('twisted-tube-params');
  
  if (twistedModeCheckbox && twistedParamsDiv) {
    twistedModeCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        twistedParamsDiv.classList.remove('hidden');
      } else {
        twistedParamsDiv.classList.add('hidden');
      }
      // 更新可视化（仅几何和麻花管参数）
      const formData = getFormData();
      updateVisualization({
        innerDiameter: formData.innerDiameter || 0.02,
        outerDiameter: formData.outerDiameter || 0.04,
        length: formData.length || 5.0,
        isTwisted: e.target.checked,
        twistPitch: formData.twistPitch || 0.1,
        twistAngle: formData.twistAngle || 45
      });
    });
  }

  // 参数变化时更新可视化
  const visualizationInputs = ['inner-diameter', 'outer-diameter', 'length', 'twist-pitch', 'twist-angle'];
  visualizationInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        const formData = getFormData();
        if (formData.innerDiameter && formData.outerDiameter && formData.length) {
          updateVisualization({
            innerDiameter: formData.innerDiameter,
            outerDiameter: formData.outerDiameter,
            length: formData.length,
            isTwisted: formData.isTwisted,
            twistPitch: formData.twistPitch || 0.1,
            twistAngle: formData.twistAngle || 45
          });
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
    length: 5.0,
    isTwisted: false,
    twistPitch: 0.1,
    twistAngle: 45
  });
}

