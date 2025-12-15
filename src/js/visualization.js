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
    isTwisted = false,
    twistPitch = 0.1,
    twistAngle = 45
  } = params;

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
  
  const centerY = height / 2;
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
  
  // 绘制内管 - 加粗线条
  ctx.strokeStyle = '#ef4444'; // 红色
  ctx.lineWidth = 3;
  
  if (isTwisted) {
    // 绘制螺旋扭曲的内管 - 增加点数使曲线更平滑
    const numTwists = Math.ceil(length / twistPitch);
    const pointsPerTwist = 100; // 增加点数
    const totalPoints = numTwists * pointsPerTwist;
    
    // 绘制中心线（螺旋路径）
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const x = startX + t * drawLength;
      const angle = (t * numTwists * 2 * Math.PI) + (twistAngle * Math.PI / 180);
      const offset = Math.sin(angle) * (outerDiameter - innerDiameter) / 4;
      const y = centerY + offset * scale;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // 绘制上边界（螺旋）
    ctx.strokeStyle = '#dc2626'; // 深红色
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const x = startX + t * drawLength;
      const angle = (t * numTwists * 2 * Math.PI) + (twistAngle * Math.PI / 180);
      const offset = Math.sin(angle) * (outerDiameter - innerDiameter) / 4;
      const y = centerY + offset * scale - (innerDiameter / 2) * scale;
      
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
      const y = centerY + offset * scale + (innerDiameter / 2) * scale;
      
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
      const topY = centerY + offset * scale - (innerDiameter / 2) * scale;
      const bottomY = centerY + offset * scale + (innerDiameter / 2) * scale;
      
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
      const bottomY = centerY + offset * scale + (innerDiameter / 2) * scale;
      ctx.lineTo(x, bottomY);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // 绘制直管
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, centerY - (innerDiameter / 2) * scale);
    ctx.lineTo(endX, centerY - (innerDiameter / 2) * scale);
    ctx.moveTo(startX, centerY + (innerDiameter / 2) * scale);
    ctx.lineTo(endX, centerY + (innerDiameter / 2) * scale);
    ctx.stroke();
    
    // 添加内管填充
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(startX, centerY - (innerDiameter / 2) * scale, drawLength, innerDiameter * scale);
  }
  
  // 添加标签 - 增大字体
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`长度: ${length.toFixed(2)} m`, startX, height - 15);
  ctx.font = '13px sans-serif';
  ctx.fillText(`外管直径: ${(outerDiameter * 1000).toFixed(1)} mm`, startX, height - 35);
  ctx.fillText(`内管直径: ${(innerDiameter * 1000).toFixed(1)} mm`, startX, height - 55);
  
  if (isTwisted) {
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`麻花管模式`, endX - 120, height - 15);
    ctx.font = '12px sans-serif';
    ctx.fillText(`节距: ${twistPitch.toFixed(2)} m`, endX - 120, height - 35);
    ctx.fillText(`角度: ${twistAngle}°`, endX - 120, height - 55);
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
    isTwisted = false,
    twistAngle = 45
  } = params;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 清除画布
  ctx.clearRect(0, 0, width, height);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.4;
  const scale = maxRadius / (outerDiameter / 2);
  
  // 绘制外管（圆形）
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, (outerDiameter / 2) * scale, 0, 2 * Math.PI);
  ctx.stroke();
  
  // 绘制内管
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  
  if (isTwisted) {
    // 绘制椭圆形（扭曲后的横截面）
    const a = (innerDiameter / 2) * scale;
    const b = a * Math.cos(twistAngle * Math.PI / 180);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(twistAngle * Math.PI / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, a, b, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
    
    // 绘制螺旋指示线
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, (outerDiameter / 2) * scale * 0.7, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // 绘制圆形（直管）
    ctx.beginPath();
    ctx.arc(centerX, centerY, (innerDiameter / 2) * scale, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // 添加尺寸标注
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#374151';
  ctx.font = '11px sans-serif';
  
  // 外管直径标注
  const outerRadius = (outerDiameter / 2) * scale;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - outerRadius - 15);
  ctx.lineTo(centerX, centerY - outerRadius);
  ctx.moveTo(centerX - outerRadius - 20, centerY);
  ctx.lineTo(centerX - outerRadius, centerY);
  ctx.stroke();
  ctx.fillText(`Dₒ = ${(outerDiameter * 1000).toFixed(1)} mm`, centerX - outerRadius - 25, centerY + 5);
  
  // 内管直径标注
  const innerRadius = (innerDiameter / 2) * scale;
  ctx.beginPath();
  ctx.moveTo(centerX + innerRadius + 5, centerY);
  ctx.lineTo(centerX + innerRadius + 20, centerY);
  ctx.stroke();
  ctx.fillText(`Dᵢ = ${(innerDiameter * 1000).toFixed(1)} mm`, centerX + innerRadius + 25, centerY + 5);
  
  if (isTwisted) {
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('麻花管', centerX - 30, height - 10);
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.fillText(`角度: ${twistAngle}°`, centerX - 25, height - 25);
  } else {
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText('直管', centerX - 20, height - 10);
  }
}

/**
 * 更新可视化
 * @param {Object} params - 参数对象
 */
export function updateVisualization(params) {
  const sideCanvas = document.getElementById('side-view-canvas');
  const frontCanvas = document.getElementById('front-view-canvas');
  
  if (!sideCanvas || !frontCanvas) return;
  
  // 设置 Canvas 尺寸
  const setCanvasSize = (canvas) => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio || 1;
    canvas.height = rect.height * window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  };
  
  setCanvasSize(sideCanvas);
  setCanvasSize(frontCanvas);
  
  // 绘制
  drawSideView(sideCanvas, params);
  drawFrontView(frontCanvas, params);
}

