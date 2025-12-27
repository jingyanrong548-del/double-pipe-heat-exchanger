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
 * 绘制前视图（横截面）
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {Object} params - 参数对象
 */
export function drawFrontView(canvas, params) {
  const {
    innerDiameter = 0.02,
    outerDiameter = 0.04,
    innerTubeCount = 1,
    innerTubeType = 'smooth',
    isTwisted = false,
    twistAngle = 45,
    passCount = 1,
    outerTubeCountPerPass = 1
  } = params;
  
  const actualIsTwisted = innerTubeType === 'twisted' || isTwisted;

  const ctx = canvas.getContext('2d');
  
  // 获取canvas的显示尺寸（CSS尺寸）
  // 因为我们已经通过scale处理了设备像素比，所以绘制时应该使用显示尺寸
  const displayWidth = parseFloat(canvas.style.width) || canvas.clientWidth || 600;
  const displayHeight = parseFloat(canvas.style.height) || canvas.clientHeight || 600;
  const width = displayWidth;
  const height = displayHeight;
  
  // 清除画布（使用像素尺寸清除）
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 图形中心点：放在画布正中央（使用显示尺寸）
  const centerX = width / 2;
  const centerY = height / 2;
  
  // 计算缩放比例，确保整个图形（包括标注和可能的延伸）都能显示
  const outerRadius = outerDiameter / 2;
  
  // 计算安全的最大半径，确保图形完全在可见区域内
  // 考虑标注空间：顶部、底部、左右都需要留出空间
  const topSpace = 60;    // 顶部用于标题和标注
  const bottomSpace = 120; // 底部用于参数标注
  const sideSpace = 100;   // 左右用于尺寸标注
  const safeMargin = 20;   // 额外的安全边距
  
  // 计算可用的绘图区域
  const availableWidth = width - sideSpace * 2 - safeMargin * 2;
  const availableHeight = height - topSpace - bottomSpace - safeMargin * 2;
  const availableSize = Math.min(availableWidth, availableHeight);
  
  // 使用保守的缩放（60%），确保图形完全在可见区域内
  const maxRadius = (availableSize / 2) * 0.60;
  const scale = Math.max(0.1, maxRadius / outerRadius);
  
  // 绘制外管（圆形）- 添加填充以便更好区分
  ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius * scale, 0, 2 * Math.PI);
  ctx.stroke();
  
  // 绘制多根内管（前视图：圆形排列）
  // 计算内管的排列位置（圆形排列）
  // 确保内管不会重叠，根据内管数量调整排列半径
  const innerTubeRadius = (innerDiameter / 2) * scale;
  const outerRadiusScaled = outerRadius * scale;
  
  // 计算合适的排列半径，确保内管不重叠且不超出外管
  let arrangementRadius;
  if (innerTubeCount === 1) {
    // 单根内管居中
    arrangementRadius = 0;
  } else {
    // 多根内管：计算合适的排列半径
    const minRadius = innerTubeRadius * 1.5; // 最小半径，确保不重叠
    const maxRadius = outerRadiusScaled - innerTubeRadius * 1.2; // 最大半径，确保不超出外管
    arrangementRadius = Math.min(maxRadius, Math.max(minRadius, outerRadiusScaled * 0.5));
  }
  
  const angleStep = innerTubeCount > 0 ? (2 * Math.PI) / innerTubeCount : 0;
  
  for (let i = 0; i < innerTubeCount; i++) {
    const angle = i * angleStep - Math.PI / 2; // 从顶部开始排列
    const tubeX = centerX + Math.cos(angle) * arrangementRadius;
    const tubeY = centerY + Math.sin(angle) * arrangementRadius;
    
    // 添加内管填充
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    
    if (actualIsTwisted) {
      // 绘制椭圆形（扭曲后的横截面）
      const a = innerTubeRadius;
      const b = a * Math.cos(twistAngle * Math.PI / 180);
      
      ctx.save();
      ctx.translate(tubeX, tubeY);
      ctx.rotate(twistAngle * Math.PI / 180 + angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    } else {
      // 绘制圆形（直管）
      ctx.beginPath();
      ctx.arc(tubeX, tubeY, innerTubeRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  
  if (actualIsTwisted && innerTubeCount > 0) {
    // 绘制螺旋指示线
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadiusScaled * 0.7, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // 添加尺寸标注
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 12px sans-serif';
  
  // 外管直径标注（上方，居中显示）
  const outerRadiusScaledForLabel = outerRadius * scale;
  const labelY = Math.max(centerY - outerRadiusScaledForLabel - 20, 30); // 确保不超出顶部
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - outerRadiusScaledForLabel);
  ctx.lineTo(centerX, labelY + 5);
  ctx.moveTo(centerX - 30, labelY);
  ctx.lineTo(centerX + 30, labelY);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillText(`Dₒ = ${(outerDiameter * 1000).toFixed(1)} mm`, centerX, labelY - 5);
  ctx.textAlign = 'left';
  
  // 内管直径标注（如果只有一根内管，标注在右侧）
  if (innerTubeCount === 1) {
    const maxLabelX = width - 20; // 确保不超出右边界
    const labelX = Math.min(centerX + innerTubeRadius + 25, maxLabelX - 80);
    ctx.beginPath();
    ctx.moveTo(centerX + innerTubeRadius, centerY);
    ctx.lineTo(labelX, centerY);
    ctx.moveTo(labelX, centerY - 5);
    ctx.lineTo(labelX, centerY + 5);
    ctx.stroke();
    // 确保文字不超出边界
    ctx.fillText(`Dᵢ = ${(innerDiameter * 1000).toFixed(1)} mm`, labelX + 5, centerY + 5);
  }
  
  // 添加主要尺寸和参数标注
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  
  // 标题（顶部居中，确保在可见区域内）
  ctx.fillText('单管截面图', centerX, 20);
  
  // 主要尺寸标注（底部左侧，确保在可见区域内）
  ctx.textAlign = 'left';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#1f2937';
  const bottomStartY = height - 130; // 从底部向上130px开始，确保不超出
  let yPos = bottomStartY;
  ctx.fillText(`外管直径 Dₒ = ${(outerDiameter * 1000).toFixed(1)} mm`, 20, yPos);
  yPos += 18;
  ctx.fillText(`内管直径 Dᵢ = ${(innerDiameter * 1000).toFixed(1)} mm`, 20, yPos);
  yPos += 18;
  ctx.fillText(`内管数量: ${innerTubeCount} 根`, 20, yPos);
  yPos += 18;
  ctx.fillText(`流程数量: ${passCount} 个`, 20, yPos);
  yPos += 18;
  ctx.fillText(`每流程外管数: ${outerTubeCountPerPass} 根`, 20, yPos);
  
  // 内管类型标注（底部右侧，确保在可见区域内）
  ctx.textAlign = 'right';
  yPos = bottomStartY;
  const rightTextX = width - 20; // 确保不超出右边界
  if (actualIsTwisted) {
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('麻花管', rightTextX, yPos);
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    yPos += 18;
    ctx.fillText(`螺旋角度: ${twistAngle}°`, rightTextX, yPos);
  } else {
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
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

  // 设置 Canvas 尺寸
  const setCanvasSize = (canvas) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // 确保canvas有最小尺寸
    const minWidth = 600;
    const minHeight = 600;
    const displayWidth = Math.max(rect.width || minWidth, minWidth);
    const displayHeight = Math.max(rect.height || minHeight, minHeight);
    
    // 设置实际像素尺寸（考虑设备像素比）
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // 设置CSS显示尺寸
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // 缩放上下文以匹配设备像素比
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  };

  setCanvasSize(frontCanvas);

  // 只显示前视图（截面图）
  drawFrontView(frontCanvas, params);
}

