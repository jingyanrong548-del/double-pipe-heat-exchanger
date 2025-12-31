/**
 * 麻花管几何计算模块
 * 基于Python版本的优化实现，用于计算麻花管的2D截面和3D属性
 */

/**
 * 麻花管几何类
 * @class TwistedTubeGeometry
 */
export class TwistedTubeGeometry {
  /**
   * 创建麻花管几何实例
   * @param {number} outerDiameter - 外径 (D_out) 单位：米
   * @param {number} numLobes - 头数/瓣数 (n)，3-6
   * @param {number} lobeHeight - 齿高 (h) 单位：米
   * @param {number} spiralPitch - 螺旋节距 (P) 单位：米
   */
  constructor(outerDiameter, numLobes, lobeHeight, spiralPitch) {
    // 输入验证
    this._validateInputs(outerDiameter, numLobes, lobeHeight, spiralPitch);
    
    // 存储参数
    this.outerDiameter = outerDiameter;
    this.numLobes = numLobes;
    this.lobeHeight = lobeHeight;
    this.spiralPitch = spiralPitch;
    
    // 计算派生几何参数
    this.outerRadius = this.outerDiameter / 2.0;
    this.innerDiameter = this.outerDiameter - 2.0 * this.lobeHeight;
    this.innerRadius = this.innerDiameter / 2.0;
    
    // 平均半径和波幅（用于极坐标生成）
    this.avgRadius = (this.outerRadius + this.innerRadius) / 2.0;
    this.waveAmplitude = this.lobeHeight / 2.0;
  }
  
  /**
   * 验证输入参数
   * @private
   */
  _validateInputs(outerDiameter, numLobes, lobeHeight, spiralPitch) {
    // 检查numLobes是否为整数
    if (!Number.isInteger(numLobes)) {
      throw new TypeError(`numLobes必须是整数，得到: ${typeof numLobes}`);
    }
    
    // 检查numLobes范围
    if (numLobes < 3 || numLobes > 6) {
      throw new Error(`numLobes必须在3-6之间（包含），得到: ${numLobes}`);
    }
    
    // 检查正值
    if (outerDiameter <= 0) {
      throw new Error(`outerDiameter必须为正数，得到: ${outerDiameter}`);
    }
    
    if (lobeHeight <= 0) {
      throw new Error(`lobeHeight必须为正数，得到: ${lobeHeight}`);
    }
    
    if (spiralPitch <= 0) {
      throw new Error(`spiralPitch必须为正数，得到: ${spiralPitch}`);
    }
    
    // 检查lobeHeight是否物理可行
    const outerRadius = outerDiameter / 2.0;
    if (lobeHeight >= outerRadius) {
      throw new Error(
        `lobeHeight (${lobeHeight}) 必须小于 outerRadius (${outerRadius})`
      );
    }
  }
  
  /**
   * 生成2D截面轮廓（极坐标）
   * 使用公式: r(θ) = R_avg + a·cos(n·θ)
   * 
   * @param {number} numPoints - 生成点的数量
   * @returns {Object} {theta: 角度数组(弧度), radius: 半径数组(米)}
   */
  generate2DProfile(numPoints = 1000) {
    const theta = [];
    const radius = [];
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const r = this.avgRadius + this.waveAmplitude * Math.cos(
        this.numLobes * angle
      );
      theta.push(angle);
      radius.push(r);
    }
    
    return { theta, radius };
  }
  
  /**
   * 计算截面几何属性
   * 使用数值积分计算面积和周长
   * 
   * @param {number} numPoints - 数值积分的点数
   * @returns {Object} 几何属性对象
   */
  calculateCrossSectionProperties(numPoints = 1000) {
    const { theta, radius } = this.generate2DProfile(numPoints);
    
    // 计算面积：A = (1/2) ∫ r² dθ
    const dtheta = (2 * Math.PI) / numPoints;
    let area = 0;
    for (let i = 0; i < numPoints; i++) {
      area += radius[i] * radius[i];
    }
    area = 0.5 * area * dtheta;
    
    // 计算周长：P = ∫ sqrt(r² + (dr/dθ)²) dθ
    let perimeter = 0;
    for (let i = 0; i < numPoints; i++) {
      const r = radius[i];
      // 计算 dr/dθ
      const nextIdx = (i + 1) % numPoints;
      const prevIdx = (i - 1 + numPoints) % numPoints;
      const dr_dtheta = (radius[nextIdx] - radius[prevIdx]) / (2 * dtheta);
      
      perimeter += Math.sqrt(r * r + dr_dtheta * dr_dtheta);
    }
    perimeter *= dtheta;
    
    // 当量（水力）直径：D_h = 4A / P
    const equivalentDiameter = perimeter > 0 ? (4.0 * area) / perimeter : 0.0;
    
    return {
      area,                    // 面积 (m²)
      perimeter,               // 周长 (m)
      equivalentDiameter,      // 当量直径 (m)
      innerDiameter: this.innerDiameter,  // 内径 (D_min) (m)
      outerDiameter: this.outerDiameter   // 外径 (D_max) (m)
    };
  }
  
  /**
   * 计算螺旋长度因子
   * 表示峰值处的实际螺旋路径比轴向长度长多少倍
   * 
   * L_helical = L_axial × √(1 + (2πR_outer / P)²)
   * 
   * @returns {number} 螺旋长度因子（无量纲）
   */
  get helicalLengthFactor() {
    if (this.spiralPitch <= 0) {
      return 1.0;
    }
    
    // 外半径处的周长
    const circumference = 2 * Math.PI * this.outerRadius;
    
    // 螺旋路径长度因子
    const factor = Math.sqrt(1.0 + Math.pow(circumference / this.spiralPitch, 2));
    
    return factor;
  }
  
  /**
   * 计算峰值处一个完整旋转的螺旋路径长度
   * @returns {number} 螺旋路径长度 (m)
   */
  get helicalPathLength() {
    return this.spiralPitch * this.helicalLengthFactor;
  }
  
  /**
   * 转换为笛卡尔坐标
   * @param {number} numPoints - 点数
   * @returns {Object} {x: x坐标数组, y: y坐标数组}
   */
  toCartesian(numPoints = 1000) {
    const { theta, radius } = this.generate2DProfile(numPoints);
    const x = [];
    const y = [];
    
    for (let i = 0; i < theta.length; i++) {
      x.push(radius[i] * Math.cos(theta[i]));
      y.push(radius[i] * Math.sin(theta[i]));
    }
    
    return { x, y };
  }
  
  /**
   * 字符串表示
   */
  toString() {
    return (
      `TwistedTubeGeometry(` +
      `outer_diameter=${(this.outerDiameter * 1000).toFixed(1)}mm, ` +
      `num_lobes=${this.numLobes}, ` +
      `lobe_height=${(this.lobeHeight * 1000).toFixed(1)}mm, ` +
      `spiral_pitch=${(this.spiralPitch * 1000).toFixed(1)}mm` +
      `)`
    );
  }
}

/**
 * 在Canvas上绘制麻花管截面
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {TwistedTubeGeometry} tube - 麻花管几何对象
 * @param {Object} options - 绘制选项
 */
export function drawTwistedTubeCrossSection(canvas, tube, options = {}) {
  const {
    showProperties = true,
    numPoints = 1000,
    lineWidth = 2,
    strokeColor = '#3b82f6',
    fillColor = 'rgba(59, 130, 246, 0.1)'
  } = options;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 清除画布
  ctx.clearRect(0, 0, width, height);
  
  // 生成轮廓
  const { x, y } = tube.toCartesian(numPoints);
  
  // 计算缩放和偏移
  const maxRadius = Math.max(...x.map((xi, i) => Math.sqrt(xi * xi + y[i] * y[i])));
  const scale = Math.min(width, height) / (maxRadius * 2.2); // 留出边距
  const centerX = width / 2;
  const centerY = height / 2;
  
  // 绘制填充
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  for (let i = 0; i < x.length; i++) {
    const px = centerX + x[i] * scale;
    const py = centerY + y[i] * scale;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
  
  // 绘制轮廓
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  
  // 显示属性
  if (showProperties) {
    const props = tube.calculateCrossSectionProperties(numPoints);
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const info = [
      `面积: ${(props.area * 1e6).toFixed(2)} mm²`,
      `周长: ${(props.perimeter * 1000).toFixed(2)} mm`,
      `当量直径: ${(props.equivalentDiameter * 1000).toFixed(2)} mm`,
      `内径: ${(props.innerDiameter * 1000).toFixed(2)} mm`,
      `外径: ${(props.outerDiameter * 1000).toFixed(2)} mm`,
      `螺旋长度因子: ${tube.helicalLengthFactor.toFixed(3)}`
    ];
    
    const startY = 20;
    const lineHeight = 18;
    info.forEach((text, i) => {
      ctx.fillText(text, 20, startY + i * lineHeight);
    });
  }
}

