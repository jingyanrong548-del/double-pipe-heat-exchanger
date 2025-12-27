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

