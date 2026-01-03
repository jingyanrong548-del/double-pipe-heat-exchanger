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
  
  // 换热器参数（基于真实厂家参数）
  innerDiameter: 0.028,  // 28mm 内管（基于doMin = 34 - 2*3 = 28mm）
  outerDiameter: 0.038,   // 38mm 外管（真实参数）
  innerWallThickness: 0.0015, // 1.5mm 内管壁厚（估算）
  outerWallThickness: 0.002,  // 2mm 外管壁厚（真实参数）
  length: 2.5,            // 2.5米管长
  flowType: 'counter',    // 逆流
  
  // 内管参数
  innerTubeCount: 1,      // 1根内管
  innerTubeType: 'twisted', // 麻花管
  isTwisted: true,
  twistPitch: 0.0065,     // 6.5mm 齿距（真实参数）
  twistLobeCount: 6,      // 6头（真实参数）
  twistToothHeight: 0.003, // 3mm 齿高（真实参数）
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
 * 当前调试案例：R134a冷凝（管外）- 水加热（管内）麻花管换热器
 * 热流体在管外，冷流体在管内
 */
export const currentDebugExample = {
  // 输入模式
  inputMode: 'load',  // 负荷输入法
  
  // 热流体位置
  hotFluidLocation: 'outer',  // 热流体在管外
  
  // 热流体参数（R134a，冷凝，在管外）
  hotFluid: 'R134a',
  hotProcessType: 'condensation',  // 冷凝
  hotStateIn: 1.0,  // 入口状态：气体
  hotStateOut: 0.0,  // 出口状态：液体
  hotTin: 105,
  hotTout: 45,
  hotFlowRate: null,  // 负荷输入法，由系统计算
  hotPressure: 2927.8,  // kPa - 85°C对应的饱和压力（由CoolProp计算）
  
  // 冷流体参数（水，加热，在管内）
  coldFluid: 'Water',
  coldProcessType: 'cooling',  // 加热（对于冷流体，cooling表示被加热）
  coldStateIn: 0.0,  // 入口状态：液体
  coldStateOut: 0.0,  // 出口状态：液体
  coldTin: 40,
  coldTout: 80,
  coldFlowRate: null,  // 负荷输入法，由系统计算
  coldPressure: 400,  // kPa
  
  // 传热量
  heatLoad: 41.8,  // kW
  
  // 换热器参数
  // 外管名义内径 = 38 - 2×2 = 34mm
  // 麻花管外径 = 外管名义内径 = 34mm
  // 外管内径 = 外管名义内径 + 1mm安装间隙 = 35mm
  innerOuterDiameter: 0.034,  // 34mm 麻花管外径（等于外管名义内径）
  innerWallThickness: 0.001,  // 1mm 麻花管壁厚
  outerOuterDiameter: 0.038,  // 38mm 外管外径
  outerWallThickness: 0.002,  // 2mm 外管壁厚
  length: 5.0,  // 5米管长
  flowType: 'counter',  // 逆流
  
  // 内管参数
  innerTubeCount: 1,  // 1根内管
  innerTubeType: 'twisted',  // 麻花管
  isTwisted: true,
  twistPitch: 0.0065,  // 6.5mm 螺旋节距（单位：m）
  twistLobeCount: 6,  // 6头
  twistToothHeight: 0.003,  // 3mm 齿高（单位：m）
  twistWallThickness: 0.001,  // 1mm 麻花管壁厚（单位：m）
  passCount: 1,  // 1个流程
  outerTubeCountPerPass: 1,  // 每流程1根外管
  
  // 传热系数（留空自动计算）
  givenU: null
};

/**
 * 加载示例数据到表单
 * @param {Object} exampleData - 示例数据对象
 */
export function loadExampleToForm(exampleData) {
  // 输入模式和热流体位置
  if (exampleData.inputMode) {
    const inputModeRadio = document.querySelector(`input[name="input-mode"][value="${exampleData.inputMode}"]`);
    if (inputModeRadio) inputModeRadio.checked = true;
  }
  if (exampleData.hotFluidLocation) {
    const hotFluidLocationRadio = document.querySelector(`input[name="hot-fluid-location"][value="${exampleData.hotFluidLocation}"]`);
    if (hotFluidLocationRadio) hotFluidLocationRadio.checked = true;
  }
  
  // 热流体参数
  const hotFluidSelect = document.getElementById('hot-fluid');
  const hotProcessTypeSelect = document.getElementById('hot-process-type');
  const hotStateInInput = document.getElementById('hot-state-in');
  const hotStateOutInput = document.getElementById('hot-state-out');
  const hotTinInput = document.getElementById('hot-tin');
  const hotToutInput = document.getElementById('hot-tout');
  const hotFlowRateInput = document.getElementById('hot-flowrate');
  const hotPressureInput = document.getElementById('hot-pressure');
  
  if (hotFluidSelect) hotFluidSelect.value = exampleData.hotFluid;
  if (hotProcessTypeSelect && exampleData.hotProcessType) hotProcessTypeSelect.value = exampleData.hotProcessType;
  if (hotStateInInput && exampleData.hotStateIn !== undefined) hotStateInInput.value = exampleData.hotStateIn;
  if (hotStateOutInput && exampleData.hotStateOut !== undefined) hotStateOutInput.value = exampleData.hotStateOut;
  if (hotTinInput) hotTinInput.value = exampleData.hotTin;
  if (hotToutInput) hotToutInput.value = exampleData.hotTout;
  if (hotFlowRateInput) hotFlowRateInput.value = exampleData.hotFlowRate || '';
  if (hotPressureInput) hotPressureInput.value = exampleData.hotPressure || '';
  
  // 冷流体参数
  const coldFluidSelect = document.getElementById('cold-fluid');
  const coldProcessTypeSelect = document.getElementById('cold-process-type');
  const coldStateInInput = document.getElementById('cold-state-in');
  const coldStateOutInput = document.getElementById('cold-state-out');
  const coldTinInput = document.getElementById('cold-tin');
  const coldToutInput = document.getElementById('cold-tout');
  const coldFlowRateInput = document.getElementById('cold-flowrate');
  const coldPressureInput = document.getElementById('cold-pressure');
  
  if (coldFluidSelect) coldFluidSelect.value = exampleData.coldFluid;
  if (coldProcessTypeSelect && exampleData.coldProcessType) coldProcessTypeSelect.value = exampleData.coldProcessType;
  if (coldStateInInput && exampleData.coldStateIn !== undefined) coldStateInInput.value = exampleData.coldStateIn;
  if (coldStateOutInput && exampleData.coldStateOut !== undefined) coldStateOutInput.value = exampleData.coldStateOut;
  if (coldTinInput) coldTinInput.value = exampleData.coldTin;
  if (coldToutInput) coldToutInput.value = exampleData.coldTout;
  if (coldFlowRateInput) coldFlowRateInput.value = exampleData.coldFlowRate || '';
  if (coldPressureInput) coldPressureInput.value = exampleData.coldPressure;
  
  // 传热量（负荷输入法）
  if (exampleData.heatLoad !== undefined) {
    const heatLoadInput = document.getElementById('heat-load');
    if (heatLoadInput) heatLoadInput.value = exampleData.heatLoad;
  }
  
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
  
  // 使用示例数据中的壁厚，如果提供的话
  const actualInnerWallThickness = exampleData.innerWallThickness || defaultInnerWallThickness;
  const actualOuterWallThickness = exampleData.outerWallThickness || defaultOuterWallThickness;
  
  if (innerOuterDiameterInput) innerOuterDiameterInput.value = (exampleData.innerDiameter || exampleData.innerOuterDiameter) * 1000; // 转换为mm
  if (innerWallThicknessInput) innerWallThicknessInput.value = actualInnerWallThickness * 1000; // 转换为mm
  if (outerOuterDiameterInput) outerOuterDiameterInput.value = (exampleData.outerDiameter || exampleData.outerOuterDiameter) * 1000; // 转换为mm
  if (outerWallThicknessInput) outerWallThicknessInput.value = actualOuterWallThickness * 1000; // 转换为mm
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
  const twistToothHeightInput = document.getElementById('twist-tooth-height');
  const twistLobeCountSelect = document.getElementById('twist-lobe-count');
  
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
  
  // 麻花管参数（注意：twistPitch输入单位为mm，需要转换）
  if (twistPitchInput) {
    // 如果示例数据中twistPitch是以m为单位，转换为mm；如果是以mm为单位，直接使用
    const pitchValue = exampleData.twistPitch || 0.0065;
    // 如果值大于0.1，认为已经是mm单位；否则认为是m单位，转换为mm
    twistPitchInput.value = pitchValue > 0.1 ? pitchValue : pitchValue * 1000;
  }
  if (twistToothHeightInput) {
    const heightValue = exampleData.twistToothHeight || 0.003;
    // 如果值大于0.1，认为已经是mm单位；否则认为是m单位，转换为mm
    twistToothHeightInput.value = heightValue > 0.1 ? heightValue : heightValue * 1000;
  }
  if (twistLobeCountSelect) {
    twistLobeCountSelect.value = exampleData.twistLobeCount || 6;
  }
  if (twistAngleInput) twistAngleInput.value = exampleData.twistAngle || 45;
  
  // 麻花管壁厚（如果提供）
  if (exampleData.twistWallThickness !== undefined) {
    const twistWallThicknessInput = document.getElementById('twist-wall-thickness');
    if (twistWallThicknessInput) {
      // 如果值大于0.1，认为已经是mm单位；否则认为是m单位，转换为mm
      const wallThicknessValue = exampleData.twistWallThickness;
      twistWallThicknessInput.value = wallThicknessValue > 0.1 ? wallThicknessValue : wallThicknessValue * 1000;
    }
  }
  
  // 触发输入模式切换事件，更新UI显示
  if (exampleData.inputMode) {
    const inputModeEvent = new Event('change');
    document.querySelectorAll('input[name="input-mode"]').forEach(radio => {
      if (radio.checked) radio.dispatchEvent(inputModeEvent);
    });
  }
  
  // 触发热流体位置切换事件
  if (exampleData.hotFluidLocation) {
    const hotFluidLocationEvent = new Event('change');
    document.querySelectorAll('input[name="hot-fluid-location"]').forEach(radio => {
      if (radio.checked) radio.dispatchEvent(hotFluidLocationEvent);
    });
  }
  
  // 触发过程类型切换事件，更新UI显示
  if (hotProcessTypeSelect && exampleData.hotProcessType) {
    hotProcessTypeSelect.dispatchEvent(new Event('change'));
  }
  if (coldProcessTypeSelect && exampleData.coldProcessType) {
    coldProcessTypeSelect.dispatchEvent(new Event('change'));
  }
  
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

