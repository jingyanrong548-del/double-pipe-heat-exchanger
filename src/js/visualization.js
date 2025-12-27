/**
 * 套管换热器可视化模块
 * 绘制换热器的侧视图和前视图
 */

/**
 * 绘制侧视图
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {Object} params - 参数对象
 */
export function drawSideView(canvas, params) {
  const {
    innerDiameter = 0.02,
    outerDiameter = 0.04,
    length = 5.0,
    innerTubeCount = 1,
    innerTubeType = 'smooth',
    isTwisted = false,
    twistPitch = 0.1,
    twistAngle = 45,
    // 温度与计算结果（可选，用于在一张图上展示关键信息）
    hotTin,
    hotTout,
    coldTin,
    coldTout,
    heatTransferRate,              // kW
    lmtd,                          // °C
    overallHeatTransferCoefficient // W/m²·K
  } = params;
  
  const actualIsTwisted = innerTubeType === 'twisted' || isTwisted;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 清除画布
  ctx.clearRect(0, 0, width, height);
  
  // 设置缩放比例 - 优化显示比例
  // 对于侧视图，主要关注长度方向，直径方向适当放大以便看清
  const lengthScale = width / (length * 1.1); // 长度方向缩放
  const diameterScale = height / (outerDiameter * 3); // 直径方向放大3倍以便看清
  const scale = Math.min(lengthScale, diameterScale);
  
  // 将中心线稍微上移，让下方有空间放文字和参数
  const centerY = height * 0.4;
  const startX = width * 0.05;
  const endX = width * 0.95;
  const drawLength = endX - startX;
  
  // 绘制外管 - 加粗线条以便看清
  ctx.strokeStyle = '#3b82f6'; // 蓝色
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(startX, centerY - (outerDiameter / 2) * scale);
  ctx.lineTo(endX, centerY - (outerDiameter / 2) * scale);
  ctx.moveTo(startX, centerY + (outerDiameter / 2) * scale);
  ctx.lineTo(endX, centerY + (outerDiameter / 2) * scale);
  ctx.stroke();
  
  // 添加外管填充（半透明）以便更好区分
  ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  ctx.fillRect(startX, centerY - (outerDiameter / 2) * scale, drawLength, outerDiameter * scale);
  
  // 绘制多根内管
  const tubeSpacing = (outerDiameter - innerDiameter * innerTubeCount) / (innerTubeCount + 1);
  const startOffset = tubeSpacing + innerDiameter / 2;
  
  for (let tubeIndex = 0; tubeIndex < innerTubeCount; tubeIndex++) {
    // 计算每根内管的垂直位置（在侧视图中，多根内管垂直排列）
    const tubeCenterY = centerY - (outerDiameter / 2) + startOffset + tubeIndex * (innerDiameter + tubeSpacing);
    
    ctx.strokeStyle = '#ef4444'; // 红色
    ctx.lineWidth = 3;
    
    if (actualIsTwisted) {
      // 绘制螺旋扭曲的内管 - 增加点数使曲线更平滑
      const numTwists = Math.ceil(length / twistPitch);
      const pointsPerTwist = 100; // 增加点数
      const totalPoints = numTwists * pointsPerTwist;
      
      // 绘制上边界（螺旋）
      ctx.strokeStyle = '#dc2626'; // 深红色
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= totalPoints; i++) {
        const t = i / totalPoints;
        const x = startX + t * drawLength;
        const angle = (t * numTwists * 2 * Math.PI) + (twistAngle * Math.PI / 180);
        const offset = Math.sin(angle) * (outerDiameter - innerDiameter) / 4;
        const y = tubeCenterY + offset * scale - (innerDiameter / 2) * scale;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // 绘制下边界（螺旋）
      ctx.beginPath();
      for (let i = 0; i <= totalPoints; i++) {
        const t = i / totalPoints;
        const x = startX + t * drawLength;
        const angle = (t * numTwists * 2 * Math.PI) + (twistAngle * Math.PI / 180);
        const offset = Math.sin(angle) * (outerDiameter - innerDiameter) / 4;
        const y = tubeCenterY + offset * scale + (innerDiameter / 2) * scale;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // 添加内管填充以便更好看清
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      for (let i = 0; i <= totalPoints; i++) {
        const t = i / totalPoints;
        const x = startX + t * drawLength;
        const angle = (t * numTwists * 2 * Math.PI) + (twistAngle * Math.PI / 180);
        const offset = Math.sin(angle) * (outerDiameter - innerDiameter) / 4;
        const topY = tubeCenterY + offset * scale - (innerDiameter / 2) * scale;
        const bottomY = tubeCenterY + offset * scale + (innerDiameter / 2) * scale;
        
        if (i === 0) {
          ctx.moveTo(x, topY);
        } else {
          ctx.lineTo(x, topY);
        }
      }
      for (let i = totalPoints; i >= 0; i--) {
        const t = i / totalPoints;
        const x = startX + t * drawLength;
        const angle = (t * numTwists * 2 * Math.PI) + (twistAngle * Math.PI / 180);
        const offset = Math.sin(angle) * (outerDiameter - innerDiameter) / 4;
        const bottomY = tubeCenterY + offset * scale + (innerDiameter / 2) * scale;
        ctx.lineTo(x, bottomY);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // 绘制直管
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, tubeCenterY - (innerDiameter / 2) * scale);
      ctx.lineTo(endX, tubeCenterY - (innerDiameter / 2) * scale);
      ctx.moveTo(startX, tubeCenterY + (innerDiameter / 2) * scale);
      ctx.lineTo(endX, tubeCenterY + (innerDiameter / 2) * scale);
      ctx.stroke();
      
      // 添加内管填充
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(startX, tubeCenterY - (innerDiameter / 2) * scale, drawLength, innerDiameter * scale);
    }
  }
  
  // 添加几何标签 - 增大字体
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`长度: ${length.toFixed(2)} m`, startX, height - 15);
  ctx.font = '13px sans-serif';
  ctx.fillText(`外管直径: ${(outerDiameter * 1000).toFixed(1)} mm`, startX, height - 35);
  ctx.fillText(`内管直径: ${(innerDiameter * 1000).toFixed(1)} mm`, startX, height - 55);
  ctx.fillText(`内管数量: ${innerTubeCount} 根`, startX, height - 75);
  
  if (actualIsTwisted) {
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`麻花管模式`, endX - 120, height - 15);
    ctx.font = '12px sans-serif';
    ctx.fillText(`节距: ${twistPitch.toFixed(2)} m`, endX - 120, height - 35);
    ctx.fillText(`角度: ${twistAngle}°`, endX - 120, height - 55);
  } else {
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(`光管模式`, endX - 120, height - 15);
  }

  // 在同一张图上展示进出口温度与关键计算结果
  const hasTemps =
    typeof hotTin === 'number' &&
    typeof hotTout === 'number' &&
    typeof coldTin === 'number' &&
    typeof coldTout === 'number';

  if (hasTemps) {
    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.font = '13px sans-serif';

    // 左端：入口温度
    const leftX = startX + 5;
    const topY = centerY - (outerDiameter / 2) * scale - 40;
    const lineSpacing = 16;

    ctx.fillText(`热流体入口 Th,in = ${hotTin.toFixed(1)} °C`, leftX, topY);
    ctx.fillText(`冷流体入口 Tc,in = ${coldTin.toFixed(1)} °C`, leftX, topY + lineSpacing);

    // 右端：出口温度
    const rightX = endX - 5 - 160;
    ctx.textAlign = 'left';
    ctx.fillText(`热流体出口 Th,out = ${hotTout.toFixed(1)} °C`, rightX, topY);
    ctx.fillText(`冷流体出口 Tc,out = ${coldTout.toFixed(1)} °C`, rightX, topY + lineSpacing);

    ctx.restore();
  }

  // 底部：汇总热工参数
  const hasResults =
    typeof heatTransferRate === 'number' ||
    typeof lmtd === 'number' ||
    typeof overallHeatTransferCoefficient === 'number';

  if (hasResults) {
    ctx.save();
    ctx.fillStyle = '#1f2937';
    ctx.font = '13px sans-serif';

    const infoX = startX;
    const infoY = centerY + (outerDiameter / 2) * scale + 30;
    const lineSpacing = 18;

    if (typeof heatTransferRate === 'number') {
      ctx.fillText(`传热量 Q ≈ ${heatTransferRate.toFixed(2)} kW`, infoX, infoY);
    }
    if (typeof lmtd === 'number') {
      ctx.fillText(`对数平均温差 LMTD ≈ ${lmtd.toFixed(2)} °C`, infoX, infoY + lineSpacing);
    }
    if (typeof overallHeatTransferCoefficient === 'number') {
      ctx.fillText(
        `总传热系数 U ≈ ${overallHeatTransferCoefficient.toFixed(1)} W/m²·K`,
        infoX,
        infoY + lineSpacing * 2
      );
    }

    ctx.restore();
  }
}

/**
 * 绘制梅花截面（基于Do,max和Do,min）
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {number} centerX - 中心X坐标
 * @param {number} centerY - 中心Y坐标
 * @param {number} rMax - 峰顶半径（Do,max/2，缩放后）
 * @param {number} rMin - 谷底半径（Do,min/2，缩放后）
 * @param {number} lobeCount - 头数（瓣数）
 */
function drawLobeShape(ctx, centerX, centerY, rMax, rMin, lobeCount) {
  const angleStep = (2 * Math.PI) / lobeCount;
  const h = rMax - rMin; // 齿高（缩放后）
  
  ctx.beginPath();
  
  for (let i = 0; i < lobeCount; i++) {
    const startAngle = i * angleStep - Math.PI / 2;
    const endAngle = (i + 1) * angleStep - Math.PI / 2;
    const midAngle = (startAngle + endAngle) / 2;
    
    // 每个瓣的峰点（外接圆上的点，Do,max）
    const peakX = centerX + Math.cos(midAngle) * rMax;
    const peakY = centerY + Math.sin(midAngle) * rMax;
    
    // 谷点（内切圆上的点，Do,min）
    const valley1X = centerX + Math.cos(startAngle) * rMin;
    const valley1Y = centerY + Math.sin(startAngle) * rMin;
    const valley2X = centerX + Math.cos(endAngle) * rMin;
    const valley2Y = centerY + Math.sin(endAngle) * rMin;
    
    // 如果第一次，从第一个谷点开始
    if (i === 0) {
      ctx.moveTo(valley1X, valley1Y);
    }
    
    // 从谷点到峰点（使用二次贝塞尔曲线，模拟圆弧过渡）
    const controlX1 = centerX + Math.cos(startAngle) * rMin + (rMax - rMin) * Math.cos(startAngle) * 0.5;
    const controlY1 = centerY + Math.sin(startAngle) * rMin + (rMax - rMin) * Math.sin(startAngle) * 0.5;
    ctx.quadraticCurveTo(controlX1, controlY1, peakX, peakY);
    
    // 从峰点回到下一个谷点
    const controlX2 = centerX + Math.cos(endAngle) * rMin + (rMax - rMin) * Math.cos(endAngle) * 0.5;
    const controlY2 = centerY + Math.sin(endAngle) * rMin + (rMax - rMin) * Math.sin(endAngle) * 0.5;
    ctx.quadraticCurveTo(controlX2, controlY2, valley2X, valley2Y);
  }
  
  ctx.closePath();
}

/**
 * 绘制前视图（横截面）
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {Object} params - 参数对象
 */
export function drawFrontView(canvas, params) {
  const {
    innerDiameter = 0.02, // 内管外径
    outerDiameter = 0.04, // 外管外径
    innerInnerDiameter, // 内管内径
    outerInnerDiameter, // 外管内径
    innerWallThickness, // 内管壁厚
    outerWallThickness, // 外管壁厚
    innerOuterDiameter, // 内管外径（明确）
    outerOuterDiameter, // 外管外径（明确）
    innerTubeCount = 1,
    innerTubeType = 'smooth',
    isTwisted = false,
    twistLobeCount = 4, // 麻花管头数
    passCount = 1,
    outerTubeCountPerPass = 1
  } = params;
  
  const actualIsTwisted = innerTubeType === 'twisted' || isTwisted;
  
  // 确定实际使用的尺寸值
  const outerOuterRad = (outerOuterDiameter || outerDiameter) / 2;
  const outerInnerRad = outerInnerDiameter ? outerInnerDiameter / 2 : outerOuterRad - (outerWallThickness || 0.002);
  
  // 麻花管模式下，内管外径等于外管内径（贴合状态）
  let innerOuterRad, innerInnerRad;
  if (actualIsTwisted) {
    innerOuterRad = outerInnerRad; // 麻花管外径 = 外管内径
    const twistWallThickness = innerWallThickness || 0.002;
    innerInnerRad = innerOuterRad - twistWallThickness;
  } else {
    innerOuterRad = (innerOuterDiameter || innerDiameter) / 2;
    innerInnerRad = innerInnerDiameter ? innerInnerDiameter / 2 : innerOuterRad - (innerWallThickness || 0.002);
  }
  
  const actualOuterWallThickness = outerWallThickness || (outerOuterRad - outerInnerRad);
  const actualInnerWallThickness = innerWallThickness || (innerOuterRad - innerInnerRad);

  // 获取设备像素比
  const dpr = window.devicePixelRatio || 1;
  
  // 精确获取Canvas显示尺寸
  let displayWidth, displayHeight;
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    // 使用实际渲染尺寸
    displayWidth = rect.width;
    displayHeight = rect.height;
  } else {
    // 回退到样式或默认值
    displayWidth = parseFloat(canvas.style.width) || canvas.clientWidth || 600;
    displayHeight = parseFloat(canvas.style.height) || canvas.clientHeight || 600;
  }
  
  // 确保是正方形（根据aspect-ratio: 1）
  displayWidth = Math.max(displayWidth, displayHeight);
  displayHeight = displayWidth;
  
  // 设置Canvas实际像素尺寸（高DPI支持）
  // 使用Math.floor确保整数像素，避免亚像素渲染
  const actualWidth = Math.floor(displayWidth * dpr);
  const actualHeight = Math.floor(displayHeight * dpr);
  
  canvas.width = actualWidth;
  canvas.height = actualHeight;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  
  // 获取上下文并设置缩放
  const ctx = canvas.getContext('2d');
  
  // 启用高质量图像平滑
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // 重置变换矩阵并应用设备像素比缩放
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  
  // 使用显示尺寸进行绘制（因为上下文已缩放）
  const width = displayWidth;
  const height = displayHeight;
  
  // 清除画布（使用显示尺寸清除，因为上下文已缩放）
  ctx.clearRect(0, 0, width, height);
  
  // 设置默认绘制属性以确保清晰度
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 辅助函数：将坐标对齐到像素边界（避免亚像素渲染导致的模糊）
  const alignToPixel = (value) => Math.round(value);
  
  // 计算缩放比例，确保整个图形（包括标注和可能的延伸）都能显示
  const outerRadius = outerOuterRad;
  
  // 计算安全的最大半径，确保图形完全在可见区域内
  // 考虑标注空间：顶部、底部、左右都需要留出空间
  const topSpace = 50;    // 顶部用于标题和标注
  const bottomSpace = 180; // 底部用于参数标注（增加空间避免重叠）
  const sideSpace = 80;   // 左右用于尺寸标注
  const safeMargin = 15;   // 额外的安全边距
  
  // 计算可用的绘图区域
  const availableWidth = width - sideSpace * 2 - safeMargin * 2;
  const availableHeight = height - topSpace - bottomSpace - safeMargin * 2;
  const availableSize = Math.min(availableWidth, availableHeight);
  
  // 使用合理的缩放（70%），为标注留出更多空间
  const maxRadius = (availableSize / 2) * 0.70;
  const scale = Math.max(0.1, maxRadius / outerRadius);
  
  // 图形中心点：向上偏移，为底部标注留出更多空间
  // 使用整数坐标以确保清晰
  const centerX = alignToPixel(width / 2);
  const centerY = alignToPixel(topSpace + (height - topSpace - bottomSpace) / 2);
  
  // 绘制外管（显示壁厚结构）
  // 外管外圆
  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerOuterRad * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerOuterRad * scale, 0, 2 * Math.PI);
  ctx.stroke();
  
  // 外管内圆（显示壁厚）
  if (outerInnerRad > 0 && actualOuterWallThickness > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerInnerRad * scale, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerInnerRad * scale, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // 绘制多根内管（前视图：圆形排列，显示壁厚结构）
  // 计算内管的排列位置（圆形排列）
  // 确保内管不会重叠，根据内管数量调整排列半径
  const innerTubeOuterRadius = innerOuterRad * scale;
  const innerTubeInnerRadius = innerInnerRad * scale;
  const outerInnerRadiusScaled = outerInnerRad * scale;
  
  // 计算合适的排列半径，确保内管不重叠且不超出外管内径
  let arrangementRadius;
  if (innerTubeCount === 1) {
    // 单根内管居中
    arrangementRadius = 0;
  } else {
    // 多根内管：计算合适的排列半径
    const minRadius = innerTubeOuterRadius * 1.5; // 最小半径，确保不重叠
    const maxRadius = outerInnerRadiusScaled - innerTubeOuterRadius * 1.2; // 最大半径，确保不超出外管内径
    arrangementRadius = Math.min(maxRadius, Math.max(minRadius, outerInnerRadiusScaled * 0.5));
  }
  
  const angleStep = innerTubeCount > 0 ? (2 * Math.PI) / innerTubeCount : 0;
  
  for (let i = 0; i < innerTubeCount; i++) {
    const angle = i * angleStep - Math.PI / 2; // 从顶部开始排列
    const tubeX = centerX + Math.cos(angle) * arrangementRadius;
    const tubeY = centerY + Math.sin(angle) * arrangementRadius;
    
    if (actualIsTwisted) {
      // 绘制梅花截面（基于Do,max和Do,min）
      const actualLobeCount = twistLobeCount || 4;
      
      // Do,max（峰顶外接圆）- 外径，与外管内径贴合
      const rMax = innerTubeOuterRadius; // 等于外管内径的半径
      // Do,min（谷底内切圆）- 用于流通面积计算
      const rMin = innerTubeInnerRadius; // 内径
      
      // 外梅花形状（Do,max外轮廓）
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      drawLobeShape(ctx, tubeX, tubeY, rMax, rMin, actualLobeCount);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // 内梅花形状（内径轮廓，显示壁厚，如果需要显示）
      // 注意：内径的梅花形状应该是Do,min减去壁厚的形状
      if (innerTubeInnerRadius > 0 && actualInnerWallThickness > 0) {
        const innerWallThicknessScaled = actualInnerWallThickness * scale;
        const innerRMin = Math.max(rMin - innerWallThicknessScaled, rMin * 0.5);
        if (innerRMin > 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          drawLobeShape(ctx, tubeX, tubeY, rMin, innerRMin, actualLobeCount);
          ctx.fill();
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    } else {
      // 绘制圆形（直管，显示壁厚）
      // 外圆（外径）
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(tubeX, tubeY, innerTubeOuterRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // 内圆（内径，显示壁厚）
      if (innerTubeInnerRadius > 0 && actualInnerWallThickness > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(tubeX, tubeY, innerTubeInnerRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
  
  if (actualIsTwisted && innerTubeCount > 0) {
    // 绘制螺旋指示线（可选，用于表示螺旋结构）
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerInnerRadiusScaled * 0.7, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // 添加尺寸标注
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.textBaseline = 'middle';
  
  // 外管外径标注（上方，居中显示）
  const outerOuterRadiusScaledForLabel = outerOuterRad * scale;
  const labelY = alignToPixel(Math.max(centerY - outerOuterRadiusScaledForLabel - 20, 30)); // 确保不超出顶部
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - outerOuterRadiusScaledForLabel);
  ctx.lineTo(centerX, labelY + 5);
  ctx.moveTo(centerX - 30, labelY);
  ctx.lineTo(centerX + 30, labelY);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillText(`Dₒ,out = ${(outerOuterRad * 2000).toFixed(1)} mm`, centerX, alignToPixel(labelY - 5));
  ctx.textAlign = 'left';
  
  // 内管外径标注（如果只有一根内管，标注在右侧）
  if (innerTubeCount === 1) {
    const maxLabelX = width - 20; // 确保不超出右边界
    const labelX = alignToPixel(Math.min(centerX + innerTubeOuterRadius + 25, maxLabelX - 80));
    ctx.beginPath();
    ctx.moveTo(centerX + innerTubeOuterRadius, centerY);
    ctx.lineTo(labelX, centerY);
    ctx.moveTo(labelX, centerY - 5);
    ctx.lineTo(labelX, centerY + 5);
    ctx.stroke();
    // 确保文字不超出边界，使用整数坐标
    ctx.fillText(`Dᵢ,out = ${(innerOuterRad * 2000).toFixed(1)} mm`, alignToPixel(labelX + 5), centerY);
  }
  
  // 添加主要尺寸和参数标注
  ctx.fillStyle = '#374151';
  // 使用系统字体栈以确保清晰渲染
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // 标题（顶部居中，确保在可见区域内，使用整数坐标）
  ctx.fillText('单管截面图', centerX, alignToPixel(20));
  
  // 主要尺寸标注（底部左侧，确保在可见区域内）
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#1f2937';
  const bottomStartY = alignToPixel(height - bottomSpace + 20); // 从底部向上，确保不超出且不与图形重叠
  let yPos = bottomStartY;
  ctx.fillText(`外管外径 Dₒ,out = ${(outerOuterRad * 2000).toFixed(1)} mm`, alignToPixel(20), yPos);
  yPos = alignToPixel(yPos + 18);
  if (outerInnerRad > 0) {
    ctx.fillText(`外管内径 Dₒ,in = ${(outerInnerRad * 2000).toFixed(1)} mm`, alignToPixel(20), yPos);
    yPos = alignToPixel(yPos + 18);
  }
  if (actualOuterWallThickness > 0) {
    ctx.fillText(`外管壁厚 tₒ = ${(actualOuterWallThickness * 1000).toFixed(2)} mm`, alignToPixel(20), yPos);
    yPos = alignToPixel(yPos + 18);
  }
  if (actualIsTwisted) {
    ctx.fillText(`麻花管外径 = ${(innerOuterRad * 2000).toFixed(1)} mm (贴合)`, alignToPixel(20), yPos);
  } else {
    ctx.fillText(`内管外径 Dᵢ,out = ${(innerOuterRad * 2000).toFixed(1)} mm`, alignToPixel(20), yPos);
  }
  yPos = alignToPixel(yPos + 18);
  if (innerInnerRad > 0) {
    ctx.fillText(`内管内径 Dᵢ,in = ${(innerInnerRad * 2000).toFixed(1)} mm`, alignToPixel(20), yPos);
    yPos = alignToPixel(yPos + 18);
  }
  if (actualInnerWallThickness > 0) {
    ctx.fillText(`内管壁厚 tᵢ = ${(actualInnerWallThickness * 1000).toFixed(2)} mm`, alignToPixel(20), yPos);
    yPos = alignToPixel(yPos + 18);
  }
  ctx.fillText(`内管数量: ${innerTubeCount} 根`, alignToPixel(20), yPos);
  yPos = alignToPixel(yPos + 18);
  ctx.fillText(`流程数量: ${passCount} 个`, alignToPixel(20), yPos);
  yPos = alignToPixel(yPos + 18);
  ctx.fillText(`每流程外管数: ${outerTubeCountPerPass} 根`, alignToPixel(20), yPos);
  
  // 内管类型标注（底部右侧，确保在可见区域内）
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  yPos = bottomStartY;
  const rightTextX = alignToPixel(width - 20); // 确保不超出右边界
  if (actualIsTwisted) {
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('麻花管', rightTextX, yPos);
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    yPos = alignToPixel(yPos + 18);
    ctx.fillText(`头数: ${twistLobeCount || 4} 头`, rightTextX, yPos);
  } else {
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('光管', rightTextX, yPos);
  }
  ctx.textAlign = 'left';
}

/**
 * 更新可视化
 * @param {Object} params - 参数对象
 */
export function updateVisualization(params) {
  const frontCanvas = document.getElementById('front-view-canvas');
  if (!frontCanvas) return;

  // 确保Canvas有正确的显示尺寸（drawFrontView会处理高DPI）
  const container = frontCanvas.parentElement;
  if (container) {
    const containerWidth = container.clientWidth;
    const displayWidth = Math.max(containerWidth, 300);
    const displayHeight = displayWidth; // 保持正方形
    
    // 设置CSS显示尺寸（drawFrontView会处理实际像素尺寸）
    frontCanvas.style.width = displayWidth + 'px';
    frontCanvas.style.height = displayHeight + 'px';
  }

  // 只显示前视图（截面图）- drawFrontView会处理高DPI设置
  drawFrontView(frontCanvas, params);
}

/**
 * 绘制箭头
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {number} x - 箭头起点x坐标
 * @param {number} y - 箭头起点y坐标
 * @param {number} angle - 箭头角度（弧度）
 * @param {number} length - 箭头长度
 * @param {string} color - 箭头颜色
 */
function drawArrow(ctx, x, y, angle, length, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const arrowHeadLength = 8;
  const arrowHeadAngle = Math.PI / 6;
  
  // 绘制箭头线
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  
  // 绘制箭头头部
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowHeadLength * Math.cos(angle - arrowHeadAngle),
    endY - arrowHeadLength * Math.sin(angle - arrowHeadAngle)
  );
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowHeadLength * Math.cos(angle + arrowHeadAngle),
    endY - arrowHeadLength * Math.sin(angle + arrowHeadAngle)
  );
  ctx.stroke();
  ctx.fill();
  
  ctx.restore();
}

/**
 * 绘制温度分布曲线
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {Object} data - 温度分布数据
 * @param {Array<number>} data.positions - 位置数组 (m)
 * @param {Array<number>} data.hotTemperatures - 热流体温度数组 (°C)
 * @param {Array<number>} data.coldTemperatures - 冷流体温度数组 (°C)
 * @param {string} flowType - 流动方式: 'counter' (逆流) 或 'parallel' (并流)
 * @param {number} length - 换热器长度 (m)
 * @param {Object} params - 额外参数 {hotTin, hotTout, coldTin, coldTout}
 */
export function drawTemperatureDistribution(canvas, data, flowType = 'counter', length = 5.0, params = {}) {
  if (!canvas || !data || !data.positions || !data.hotTemperatures || !data.coldTemperatures) {
    return;
  }

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 清除画布
  ctx.clearRect(0, 0, width, height);
  
  // 设置边距（增加左右边距以容纳温度标注，避免被截断）
  const padding = { top: 50, right: 100, bottom: 100, left: 100 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  
  // 计算温度范围
  const allTemps = [...data.hotTemperatures, ...data.coldTemperatures];
  const minTemp = Math.min(...allTemps);
  const maxTemp = Math.max(...allTemps);
  const tempRange = maxTemp - minTemp;
  const tempPadding = tempRange * 0.1; // 10% 边距
  const tempMin = minTemp - tempPadding;
  const tempMax = maxTemp + tempPadding;
  
  // 坐标转换函数
  const xToCanvas = (x) => padding.left + (x / length) * plotWidth;
  const yToCanvas = (temp) => padding.top + plotHeight - ((temp - tempMin) / (tempMax - tempMin)) * plotHeight;
  
  // 绘制背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // 绘制网格
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  
  // 水平网格线（温度）
  const numTempGridLines = 6;
  for (let i = 0; i <= numTempGridLines; i++) {
    const temp = tempMin + (i / numTempGridLines) * (tempMax - tempMin);
    const y = yToCanvas(temp);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
  }
  
  // 垂直网格线（位置）
  const numPosGridLines = 5;
  for (let i = 0; i <= numPosGridLines; i++) {
    const x = padding.left + (i / numPosGridLines) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
  }
  
  // 绘制坐标轴
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  
  // X轴（位置）
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.stroke();
  
  // Y轴（温度）
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.stroke();
  
  // 绘制坐标轴标签
  ctx.fillStyle = '#374151';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // X轴标签（位置）
  for (let i = 0; i <= numPosGridLines; i++) {
    const pos = (i / numPosGridLines) * length;
    const x = padding.left + (i / numPosGridLines) * plotWidth;
    ctx.fillText(pos.toFixed(1) + ' m', x, padding.top + plotHeight + 10);
  }
  
  // Y轴标签（温度）
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= numTempGridLines; i++) {
    const temp = tempMin + (i / numTempGridLines) * (tempMax - tempMin);
    const y = yToCanvas(temp);
    // 确保标签不会与左侧标注重叠
    ctx.fillText(temp.toFixed(1) + '°C', padding.left - 15, y);
  }
  
  // 绘制坐标轴标题
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('位置 (m)', padding.left + plotWidth / 2, height - 15);
  
  ctx.save();
  ctx.translate(15, padding.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('温度 (°C)', 0, 0);
  ctx.restore();
  
  // 绘制热流体温度曲线
  ctx.strokeStyle = '#ef4444'; // 红色
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < data.positions.length; i++) {
    const x = xToCanvas(data.positions[i]);
    const y = yToCanvas(data.hotTemperatures[i]);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  
  // 绘制冷流体温度曲线
  ctx.strokeStyle = '#3b82f6'; // 蓝色
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < data.positions.length; i++) {
    const x = xToCanvas(data.positions[i]);
    const y = yToCanvas(data.coldTemperatures[i]);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  
  // 计算最小温差（逼近温差）
  let minTempDiff = Infinity;
  let minTempDiffIndex = 0;
  for (let i = 0; i < data.positions.length; i++) {
    const tempDiff = Math.abs(data.hotTemperatures[i] - data.coldTemperatures[i]);
    if (tempDiff < minTempDiff) {
      minTempDiff = tempDiff;
      minTempDiffIndex = i;
    }
  }
  
  // 获取端点温度
  const hotTin = params.hotTin !== undefined ? params.hotTin : data.hotTemperatures[0];
  const hotTout = params.hotTout !== undefined ? params.hotTout : data.hotTemperatures[data.hotTemperatures.length - 1];
  const coldTin = params.coldTin !== undefined ? params.coldTin : (flowType === 'counter' ? data.coldTemperatures[data.coldTemperatures.length - 1] : data.coldTemperatures[0]);
  const coldTout = params.coldTout !== undefined ? params.coldTout : (flowType === 'counter' ? data.coldTemperatures[0] : data.coldTemperatures[data.coldTemperatures.length - 1]);
  
  // 绘制端点温度标注（重新设计布局，避免重叠）
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 计算标注位置（增加偏移量避免重叠和截断）
  const labelOffsetY = 35; // 垂直偏移（增加以避免重叠）
  const labelOffsetX = 50; // 水平偏移（用于侧边标注，确保不被截断）
  
  // 辅助函数：检查并调整标注位置，确保不被截断
  const getSafeTextX = (x, text, align, offsetX) => {
    const textWidth = ctx.measureText(text).width;
    if (align === 'right') {
      // 右对齐：确保文本左边界在canvas内
      return Math.max(5, Math.min(x - offsetX, width - textWidth - 5));
    } else {
      // 左对齐：确保文本右边界在canvas内
      return Math.min(width - textWidth - 5, Math.max(5, x + offsetX));
    }
  };
  
  const getSafeTextY = (y, offsetY) => {
    // 确保文本垂直方向在canvas内（考虑文本高度约15px）
    return Math.max(15, Math.min(height - 15, y + offsetY));
  };
  
  if (flowType === 'counter') {
    // 逆流模式：重新布局标注，分散放置避免重叠
    // 左侧：热流体入口（上方）、冷流体出口（下方）
    const leftX = xToCanvas(0);
    const hotTinY = yToCanvas(hotTin);
    const coldToutY = yToCanvas(coldTout);
    
    // 热流体入口（左侧上方，距离曲线更远）
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(leftX, hotTinY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const hotTinLabelX = getSafeTextX(leftX, `Th,in`, 'right', labelOffsetX);
    const hotTinLabelY1 = getSafeTextY(hotTinY, -labelOffsetY);
    const hotTinLabelY2 = getSafeTextY(hotTinY, -labelOffsetY + 16);
    ctx.fillText(`Th,in`, hotTinLabelX, hotTinLabelY1);
    ctx.fillText(`${hotTin.toFixed(1)}°C`, hotTinLabelX, hotTinLabelY2);
    
    // 冷流体出口（左侧下方，距离曲线更远）
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(leftX, coldToutY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const coldToutLabelX = getSafeTextX(leftX, `Tc,out`, 'right', labelOffsetX);
    const coldToutLabelY1 = getSafeTextY(coldToutY, labelOffsetY);
    const coldToutLabelY2 = getSafeTextY(coldToutY, labelOffsetY + 16);
    ctx.fillText(`Tc,out`, coldToutLabelX, coldToutLabelY1);
    ctx.fillText(`${coldTout.toFixed(1)}°C`, coldToutLabelX, coldToutLabelY2);
    
    // 右侧：热流体出口（上方）、冷流体入口（下方）
    const rightX = xToCanvas(length);
    const hotToutY = yToCanvas(hotTout);
    const coldTinY = yToCanvas(coldTin);
    
    // 热流体出口（右侧上方，距离曲线更远）
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(rightX, hotToutY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const hotToutLabelX = getSafeTextX(rightX, `Th,out`, 'left', labelOffsetX);
    const hotToutLabelY1 = getSafeTextY(hotToutY, -labelOffsetY);
    const hotToutLabelY2 = getSafeTextY(hotToutY, -labelOffsetY + 16);
    ctx.fillText(`Th,out`, hotToutLabelX, hotToutLabelY1);
    ctx.fillText(`${hotTout.toFixed(1)}°C`, hotToutLabelX, hotToutLabelY2);
    
    // 冷流体入口（右侧下方，距离曲线更远）
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(rightX, coldTinY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const coldTinLabelX = getSafeTextX(rightX, `Tc,in`, 'left', labelOffsetX);
    const coldTinLabelY1 = getSafeTextY(coldTinY, labelOffsetY);
    const coldTinLabelY2 = getSafeTextY(coldTinY, labelOffsetY + 16);
    ctx.fillText(`Tc,in`, coldTinLabelX, coldTinLabelY1);
    ctx.fillText(`${coldTin.toFixed(1)}°C`, coldTinLabelX, coldTinLabelY2);
    
  } else {
    // 并流模式：左侧入口，右侧出口
    // 左侧：热流体入口（上方）、冷流体入口（下方）
    const leftX = xToCanvas(0);
    const hotTinY = yToCanvas(hotTin);
    const coldTinY = yToCanvas(coldTin);
    
    // 热流体入口（左侧上方，距离曲线更远）
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(leftX, hotTinY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const hotTinLabelX = getSafeTextX(leftX, `Th,in`, 'right', labelOffsetX);
    const hotTinLabelY1 = getSafeTextY(hotTinY, -labelOffsetY);
    const hotTinLabelY2 = getSafeTextY(hotTinY, -labelOffsetY + 16);
    ctx.fillText(`Th,in`, hotTinLabelX, hotTinLabelY1);
    ctx.fillText(`${hotTin.toFixed(1)}°C`, hotTinLabelX, hotTinLabelY2);
    
    // 冷流体入口（左侧下方，距离曲线更远）
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(leftX, coldTinY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const coldTinLabelX = getSafeTextX(leftX, `Tc,in`, 'right', labelOffsetX);
    const coldTinLabelY1 = getSafeTextY(coldTinY, labelOffsetY);
    const coldTinLabelY2 = getSafeTextY(coldTinY, labelOffsetY + 16);
    ctx.fillText(`Tc,in`, coldTinLabelX, coldTinLabelY1);
    ctx.fillText(`${coldTin.toFixed(1)}°C`, coldTinLabelX, coldTinLabelY2);
    
    // 右侧：热流体出口（上方）、冷流体出口（下方）
    const rightX = xToCanvas(length);
    const hotToutY = yToCanvas(hotTout);
    const coldToutY = yToCanvas(coldTout);
    
    // 热流体出口（右侧上方，距离曲线更远）
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(rightX, hotToutY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const hotToutLabelX = getSafeTextX(rightX, `Th,out`, 'left', labelOffsetX);
    const hotToutLabelY1 = getSafeTextY(hotToutY, -labelOffsetY);
    const hotToutLabelY2 = getSafeTextY(hotToutY, -labelOffsetY + 16);
    ctx.fillText(`Th,out`, hotToutLabelX, hotToutLabelY1);
    ctx.fillText(`${hotTout.toFixed(1)}°C`, hotToutLabelX, hotToutLabelY2);
    
    // 冷流体出口（右侧下方，距离曲线更远）
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(rightX, coldToutY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const coldToutLabelX = getSafeTextX(rightX, `Tc,out`, 'left', labelOffsetX);
    const coldToutLabelY1 = getSafeTextY(coldToutY, labelOffsetY);
    const coldToutLabelY2 = getSafeTextY(coldToutY, labelOffsetY + 16);
    ctx.fillText(`Tc,out`, coldToutLabelX, coldToutLabelY1);
    ctx.fillText(`${coldTout.toFixed(1)}°C`, coldToutLabelX, coldToutLabelY2);
  }
  
  // 绘制最小温差（逼近温差）标注
  const minDiffX = xToCanvas(data.positions[minTempDiffIndex]);
  const minDiffHotY = yToCanvas(data.hotTemperatures[minTempDiffIndex]);
  const minDiffColdY = yToCanvas(data.coldTemperatures[minTempDiffIndex]);
  const minDiffMidY = (minDiffHotY + minDiffColdY) / 2;
  
  // 绘制连接线
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(minDiffX, minDiffHotY);
  ctx.lineTo(minDiffX, minDiffColdY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // 标注最小温差值（放在图表上方，避免与端点标注重叠）
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // 检查最小温差位置，调整标注位置避免与纵坐标和端点标注重叠
  const minDiffPos = data.positions[minTempDiffIndex];
  let minDiffLabelY = minDiffMidY;
  let minDiffLabelX = minDiffX;
  
  // 检查是否与纵坐标重叠（左边缘）
  const minDiffBoxWidth = 100; // 估算框宽度
  const minDiffBoxHalfWidth = minDiffBoxWidth / 2;
  
  // 如果最小温差位置靠近左端（可能与纵坐标重叠），将标注移到右侧
  if (minDiffX - minDiffBoxHalfWidth < padding.left + 50) {
    minDiffLabelX = padding.left + plotWidth * 0.6; // 移到图表中间偏右
    minDiffLabelY = padding.top + plotHeight * 0.5; // 移到图表中间
  } else if (minDiffPos > length * 0.85) {
    // 如果靠近右端，移到中间位置
    minDiffLabelX = padding.left + plotWidth * 0.5;
    minDiffLabelY = padding.top + 25;
  } else if (minDiffPos < length * 0.15) {
    // 如果靠近左端，移到中间位置
    minDiffLabelX = padding.left + plotWidth * 0.5;
    minDiffLabelY = padding.top + 25;
  }
  
  // 绘制背景框使文字更清晰
  const labelText = `ΔT_min = ${minTempDiff.toFixed(1)}°C`;
  const textMetrics = ctx.measureText(labelText);
  const boxWidth = textMetrics.width + 12;
  const boxHeight = 18;
  const boxX = minDiffLabelX - boxWidth / 2;
  const boxY = minDiffLabelY - boxHeight - 3;
  
  // 确保框不会超出图表区域
  const finalBoxX = Math.max(padding.left + 5, Math.min(boxX, padding.left + plotWidth - boxWidth - 5));
  const finalBoxY = Math.max(padding.top + 5, boxY);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillRect(finalBoxX - 2, finalBoxY - 2, boxWidth + 4, boxHeight + 4);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(finalBoxX - 2, finalBoxY - 2, boxWidth + 4, boxHeight + 4);
  
  ctx.fillStyle = '#10b981';
  ctx.fillText(labelText, minDiffLabelX, minDiffLabelY);
  
  // 绘制流动方向箭头（放在曲线内部，但移除文字标注，避免与图例重复）
  const arrowLength = 32;
  const arrowOffsetFromCurve = 12; // 箭头距离曲线的距离
  
  if (flowType === 'counter') {
    // 逆流模式
    // 热流体箭头（从左到右，放在热流体曲线上方）
    const hotArrowPos = 0.35; // 位置比例（稍微调整避免与标注重叠）
    const hotArrowX = xToCanvas(length * hotArrowPos);
    const hotArrowY = yToCanvas(data.hotTemperatures[Math.floor(data.hotTemperatures.length * hotArrowPos)]) - arrowOffsetFromCurve;
    drawArrow(ctx, hotArrowX, hotArrowY, 0, arrowLength, '#ef4444');
    // 移除文字标注，图例已说明
    
    // 冷流体箭头（从右到左，放在冷流体曲线下方）
    const coldArrowPos = 0.65; // 位置比例（稍微调整避免与标注重叠）
    const coldArrowX = xToCanvas(length * coldArrowPos);
    const coldArrowY = yToCanvas(data.coldTemperatures[Math.floor(data.coldTemperatures.length * coldArrowPos)]) + arrowOffsetFromCurve;
    drawArrow(ctx, coldArrowX, coldArrowY, Math.PI, arrowLength, '#3b82f6');
    // 移除文字标注，图例已说明
    
  } else {
    // 并流模式
    // 热流体箭头（从左到右，放在热流体曲线上方）
    const hotArrowPos = 0.35;
    const hotArrowX = xToCanvas(length * hotArrowPos);
    const hotArrowY = yToCanvas(data.hotTemperatures[Math.floor(data.hotTemperatures.length * hotArrowPos)]) - arrowOffsetFromCurve;
    drawArrow(ctx, hotArrowX, hotArrowY, 0, arrowLength, '#ef4444');
    // 移除文字标注，图例已说明
    
    // 冷流体箭头（从左到右，放在冷流体曲线下方）
    const coldArrowPos = 0.35;
    const coldArrowX = xToCanvas(length * coldArrowPos);
    const coldArrowY = yToCanvas(data.coldTemperatures[Math.floor(data.coldTemperatures.length * coldArrowPos)]) + arrowOffsetFromCurve;
    drawArrow(ctx, coldArrowX, coldArrowY, 0, arrowLength, '#3b82f6');
    // 移除文字标注，图例已说明
  }
  
  // 绘制标题（移到最上方，避免与标注冲突）
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('沿换热器长度温度分布', padding.left + plotWidth / 2, 10);
  
  // 图例已移除，箭头颜色已能区分冷热流体
}

