/**
 * 示例案例数据
 * 提供实际应用中的典型参数，方便调试和测试
 */

import { updateVisualization } from './visualization.js';

/**
 * 直管换热器示例案例
 * 典型的水-水换热器
 */
export const straightTubeExample = {
  // 热流体参数（热水）
  hotFluid: 'Water',
  hotTin: 80,
  hotTout: 60,
  hotFlowRate: 0.5,
  hotPressure: 101.325,
  
  // 冷流体参数（冷水）
  coldFluid: 'Water',
  coldTin: 20,
  coldTout: 40,
  coldFlowRate: 0.5,
  coldPressure: 101.325,
  
  // 换热器参数
  innerDiameter: 0.025,  // 25mm 内管
  outerDiameter: 0.050,   // 50mm 外管
  length: 3.0,            // 3米管长
  flowType: 'counter',    // 逆流
  
  // 内管参数
  innerTubeCount: 1,      // 1根内管
  innerTubeType: 'smooth', // 光管
  isTwisted: false,
  twistPitch: 0.1,
  twistAngle: 45,
  passCount: 1,           // 1个流程
  outerTubeCountPerPass: 1, // 每流程1根外管
  
  // 传热系数（留空自动计算）
  givenU: null
};

/**
 * 麻花管换热器示例案例
 * 增强传热的麻花管水-水换热器
 */
export const twistedTubeExample = {
  // 热流体参数（热水）
  hotFluid: 'Water',
  hotTin: 85,
  hotTout: 55,
  hotFlowRate: 0.6,
  hotPressure: 101.325,
  
  // 冷流体参数（冷水）
  coldFluid: 'Water',
  coldTin: 15,
  coldTout: 45,
  coldFlowRate: 0.6,
  coldPressure: 101.325,
  
  // 换热器参数
  innerDiameter: 0.020,  // 20mm 内管
  outerDiameter: 0.045,   // 45mm 外管
  length: 2.5,            // 2.5米管长（麻花管可以用更短的长度）
  flowType: 'counter',    // 逆流
  
  // 内管参数
  innerTubeCount: 1,      // 1根内管
  innerTubeType: 'twisted', // 麻花管
  isTwisted: true,
  twistPitch: 0.08,       // 8cm 节距（较紧密的螺旋）
  twistAngle: 50,         // 50度角度
  passCount: 1,           // 1个流程
  outerTubeCountPerPass: 1, // 每流程1根外管
  
  // 传热系数（留空自动计算）
  givenU: null
};

/**
 * 工业应用案例：R134a 制冷剂冷却
 */
export const refrigerantExample = {
  // 热流体参数（R134a 制冷剂）
  hotFluid: 'R134a',
  hotTin: 50,
  hotTout: 30,
  hotFlowRate: 0.3,
  hotPressure: 500,       // 500 kPa
  
  // 冷流体参数（冷却水）
  coldFluid: 'Water',
  coldTin: 10,
  coldTout: 25,
  coldFlowRate: 0.8,
  coldPressure: 101.325,
  
  // 换热器参数
  innerDiameter: 0.015,  // 15mm 内管（制冷剂）
  outerDiameter: 0.035,   // 35mm 外管
  length: 4.0,            // 4米管长
  flowType: 'counter',
  
  // 内管参数
  innerTubeCount: 1,      // 1根内管
  innerTubeType: 'smooth', // 光管
  isTwisted: false,
  twistPitch: 0.1,
  twistAngle: 45,
  passCount: 1,           // 1个流程
  outerTubeCountPerPass: 1, // 每流程1根外管
  
  givenU: null
};

/**
 * 加载示例数据到表单
 * @param {Object} exampleData - 示例数据对象
 */
export function loadExampleToForm(exampleData) {
  // 热流体参数
  const hotFluidSelect = document.getElementById('hot-fluid');
  const hotTinInput = document.getElementById('hot-tin');
  const hotToutInput = document.getElementById('hot-tout');
  const hotFlowRateInput = document.getElementById('hot-flowrate');
  const hotPressureInput = document.getElementById('hot-pressure');
  
  if (hotFluidSelect) hotFluidSelect.value = exampleData.hotFluid;
  if (hotTinInput) hotTinInput.value = exampleData.hotTin;
  if (hotToutInput) hotToutInput.value = exampleData.hotTout;
  if (hotFlowRateInput) hotFlowRateInput.value = exampleData.hotFlowRate;
  if (hotPressureInput) hotPressureInput.value = exampleData.hotPressure;
  
  // 冷流体参数
  const coldFluidSelect = document.getElementById('cold-fluid');
  const coldTinInput = document.getElementById('cold-tin');
  const coldToutInput = document.getElementById('cold-tout');
  const coldFlowRateInput = document.getElementById('cold-flowrate');
  const coldPressureInput = document.getElementById('cold-pressure');
  
  if (coldFluidSelect) coldFluidSelect.value = exampleData.coldFluid;
  if (coldTinInput) coldTinInput.value = exampleData.coldTin;
  if (coldToutInput) coldToutInput.value = exampleData.coldTout;
  if (coldFlowRateInput) coldFlowRateInput.value = exampleData.coldFlowRate;
  if (coldPressureInput) coldPressureInput.value = exampleData.coldPressure;
  
  // 换热器参数
  const innerOuterDiameterInput = document.getElementById('inner-outer-diameter');
  const innerWallThicknessInput = document.getElementById('inner-wall-thickness');
  const outerOuterDiameterInput = document.getElementById('outer-outer-diameter');
  const outerWallThicknessInput = document.getElementById('outer-wall-thickness');
  const lengthInput = document.getElementById('length');
  const flowTypeSelect = document.getElementById('flow-type');
  const heatTransferCoefficientInput = document.getElementById('heat-transfer-coefficient');
  
  // 如果有示例数据中的壁厚信息，使用它；否则使用默认值（外径的10%）
  const defaultInnerWallThickness = exampleData.innerWallThickness || (exampleData.innerDiameter * 0.1);
  const defaultOuterWallThickness = exampleData.outerWallThickness || (exampleData.outerDiameter * 0.05);
  
  if (innerOuterDiameterInput) innerOuterDiameterInput.value = (exampleData.innerDiameter || exampleData.innerOuterDiameter) * 1000; // 转换为mm
  if (innerWallThicknessInput) innerWallThicknessInput.value = defaultInnerWallThickness * 1000; // 转换为mm
  if (outerOuterDiameterInput) outerOuterDiameterInput.value = (exampleData.outerDiameter || exampleData.outerOuterDiameter) * 1000; // 转换为mm
  if (outerWallThicknessInput) outerWallThicknessInput.value = defaultOuterWallThickness * 1000; // 转换为mm
  if (lengthInput) lengthInput.value = exampleData.length;
  if (flowTypeSelect) flowTypeSelect.value = exampleData.flowType;
  if (heatTransferCoefficientInput) heatTransferCoefficientInput.value = exampleData.givenU || '';
  
  // 内管数量和类型
  const innerTubeCountSelect = document.getElementById('inner-tube-count');
  const innerTubeTypeSelect = document.getElementById('inner-tube-type');
  const passCountSelect = document.getElementById('pass-count');
  const outerTubeCountSelect = document.getElementById('outer-tube-count-per-pass');
  const twistedParamsDiv = document.getElementById('twisted-tube-params');
  const twistPitchInput = document.getElementById('twist-pitch');
  const twistAngleInput = document.getElementById('twist-angle');
  
  if (innerTubeCountSelect) {
    innerTubeCountSelect.value = exampleData.innerTubeCount || 1;
  }
  if (innerTubeTypeSelect) {
    innerTubeTypeSelect.value = exampleData.innerTubeType || (exampleData.isTwisted ? 'twisted' : 'smooth');
    // 更新麻花管参数显示
    if (twistedParamsDiv) {
      if (innerTubeTypeSelect.value === 'twisted') {
        twistedParamsDiv.classList.remove('hidden');
      } else {
        twistedParamsDiv.classList.add('hidden');
      }
    }
  }
  if (passCountSelect) {
    passCountSelect.value = exampleData.passCount || 1;
  }
  if (outerTubeCountSelect) {
    outerTubeCountSelect.value = exampleData.outerTubeCountPerPass || 1;
  }
  if (twistPitchInput) twistPitchInput.value = exampleData.twistPitch || 0.1;
  if (twistAngleInput) twistAngleInput.value = exampleData.twistAngle || 45;
  
  // 触发 change 事件以更新可视化
  if (innerTubeTypeSelect) {
    innerTubeTypeSelect.dispatchEvent(new Event('change'));
  }
  if (innerTubeCountSelect) {
    innerTubeCountSelect.dispatchEvent(new Event('change'));
  }
  if (passCountSelect) {
    passCountSelect.dispatchEvent(new Event('change'));
  }
  if (outerTubeCountSelect) {
    outerTubeCountSelect.dispatchEvent(new Event('change'));
  }
  
  // 触发 input 事件以更新可视化
  [innerOuterDiameterInput, innerWallThicknessInput, outerOuterDiameterInput, outerWallThicknessInput, lengthInput, twistPitchInput, twistAngleInput].forEach(input => {
    if (input) {
      input.dispatchEvent(new Event('input'));
    }
  });
  
  // 更新可视化（使用表单数据）
  const formData = {
    innerOuterDiameter: (exampleData.innerDiameter || exampleData.innerOuterDiameter || 0.02),
    innerWallThickness: defaultInnerWallThickness,
    outerOuterDiameter: (exampleData.outerDiameter || exampleData.outerOuterDiameter || 0.04),
    outerWallThickness: defaultOuterWallThickness,
    innerInnerDiameter: (exampleData.innerDiameter || exampleData.innerOuterDiameter || 0.02) - 2 * defaultInnerWallThickness,
    outerInnerDiameter: (exampleData.outerDiameter || exampleData.outerOuterDiameter || 0.04) - 2 * defaultOuterWallThickness,
    innerDiameter: (exampleData.innerDiameter || exampleData.innerOuterDiameter || 0.02),
    outerDiameter: (exampleData.outerDiameter || exampleData.outerOuterDiameter || 0.04),
    length: exampleData.length,
    innerTubeCount: exampleData.innerTubeCount || 1,
    innerTubeType: exampleData.innerTubeType || (exampleData.isTwisted ? 'twisted' : 'smooth'),
    isTwisted: exampleData.isTwisted || false,
    twistPitch: exampleData.twistPitch || 0.1,
    twistAngle: exampleData.twistAngle || 45,
    passCount: exampleData.passCount || 1,
    outerTubeCountPerPass: exampleData.outerTubeCountPerPass || 1
  };
  
  updateVisualization({
    innerDiameter: formData.innerOuterDiameter,
    outerDiameter: formData.outerOuterDiameter,
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
    twistPitch: formData.twistPitch,
    twistAngle: formData.twistAngle,
    passCount: formData.passCount,
    outerTubeCountPerPass: formData.outerTubeCountPerPass
  });
}

