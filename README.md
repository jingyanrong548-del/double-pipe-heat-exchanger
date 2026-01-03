# Heat Exchanger Calculator - 套管换热器计算器

一个基于 Web 的套管换热器热力计算应用，使用 Vite + Vanilla JavaScript + Tailwind CSS + CoolProp 构建。

## 作者

**荆炎荣**

## 免责声明

⚠️ **重要提示**：本应用仅供教育和研究目的使用。计算结果仅供参考，不能替代专业的工程设计和验证。使用本应用进行任何工程计算或设计决策时，请务必阅读完整的[免责声明](./DISCLAIMER.md)。

**使用本应用即表示您已阅读、理解并同意免责声明的所有条款。**

## 功能特性

- 🔥 **热力计算**：传热量、对数平均温差（LMTD）、传热系数等
- 🌊 **多种流动方式**：支持逆流和并流
- 💧 **多种工质**：支持水、R134a、R410A、空气、乙醇、甲醇等
- 📊 **物性查询**：基于 CoolProp 的精确物性计算
- 🎨 **现代 UI**：iOS 风格设计，响应式布局
- ⚡ **高性能**：使用 Vite 构建，快速加载

## 技术栈

- **构建工具**：Vite 5.x
- **前端框架**：Vanilla JavaScript (ES6+)
- **样式框架**：Tailwind CSS 3.x
- **物性库**：CoolProp (WebAssembly)
- **部署平台**：Vercel

## 快速开始

### 安装依赖

```bash
npm install
```

### 准备 CoolProp 文件

将以下文件放置到 `public/` 目录：

- `coolprop.wasm` - CoolProp WebAssembly 文件
- `coolprop.js` - CoolProp JavaScript 包装器

> **注意**：CoolProp 文件需要从 CoolProp 官方获取或从参考项目中复制。

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
double-pipe-heat-exchanger/
├── index.html              # 主 HTML 文件
├── package.json            # 项目配置和依赖
├── vite.config.js         # Vite 配置
├── vercel.json            # Vercel 部署配置
├── tailwind.config.js     # Tailwind CSS 配置
├── postcss.config.js      # PostCSS 配置
├── public/                # 静态资源目录
│   ├── coolprop.wasm      # CoolProp WASM 文件
│   └── coolprop.js        # CoolProp JS 文件
└── src/
    ├── main.js            # 主入口文件
    ├── style.css          # 全局样式
    └── js/
        ├── coolprop_loader.js    # CoolProp 加载器
        ├── heat_exchanger.js     # 换热器计算模块
        └── ui.js                 # UI 交互模块
```

## 使用说明

1. **输入热流体参数**：
   - 选择工质
   - 输入入口温度、出口温度
   - 输入质量流量和压力

2. **输入冷流体参数**：
   - 选择工质
   - 输入入口温度、出口温度
   - 输入质量流量和压力

3. **输入换热器参数**：
   - 内管直径、外管直径
   - 管长
   - 选择流动方式（逆流/并流）
   - （可选）传热系数（留空则自动计算）

4. **点击计算按钮**查看结果：
   - 传热量 (kW)
   - 对数平均温差 (°C)
   - 传热系数 (W/m²·K)
   - 换热面积 (m²)

## 计算原理

### 对数平均温差 (LMTD)

**逆流**：
```
LMTD = (ΔT1 - ΔT2) / ln(ΔT1 / ΔT2)
其中：
  ΔT1 = T_hot,in - T_cold,out
  ΔT2 = T_hot,out - T_cold,in
```

**并流**：
```
LMTD = (ΔT1 - ΔT2) / ln(ΔT1 / ΔT2)
其中：
  ΔT1 = T_hot,in - T_cold,in
  ΔT2 = T_hot,out - T_cold,out
```

### 传热量

基于能量平衡：
```
Q = m_hot × (h_hot,in - h_hot,out)
```

### 传热系数

基于对流传热关联式（Dittus-Boelter、Gnielinski 等）计算内管和环形空间的对流传热系数，然后计算总传热系数。

## 部署到 GitHub & Vercel

### 快速部署步骤

1. **推送到 GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/double-pipe-heat-exchanger.git
   git branch -M main
   git push -u origin main
   ```

2. **部署到 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录
   - 点击 "Add New..." → "Project"
   - 选择您的仓库并导入
   - Framework Preset 选择 **Vite**
   - 点击 "Deploy"

3. **访问应用**
   - 部署完成后，Vercel 会提供 URL
   - 例如：`https://double-pipe-heat-exchanger.vercel.app`

详细部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 注意事项

- **CoolProp 文件**：必须将 `coolprop.wasm` 和 `coolprop.js` 放置在 `public/` 目录
- **路径配置**：使用 `import.meta.env.BASE_URL` 处理路径，确保部署后路径正确
- **缓存策略**：WASM 文件配置了长期缓存以提高性能
- **单位**：温度使用摄氏度 (°C)，压力使用千帕 (kPa)，流量使用 kg/s

## 常见问题

### CoolProp 加载失败

- 确保 `coolprop.wasm` 和 `coolprop.js` 文件存在于 `public/` 目录
- 检查浏览器控制台的错误信息
- 确保部署时文件路径正确

### 计算结果异常

- 检查输入参数的单位是否正确
- 确保温度范围在工质的有效范围内
- 检查热流体和冷流体的温度关系是否合理

### 样式丢失

- 确保 `vite.config.js` 中 `base: '/'` 配置正确
- 检查 Tailwind CSS 配置中的内容路径

## 版本管理

本项目使用自动版本管理系统。每次提交到 GitHub 时，版本号会自动更新。

### 版本格式

版本号格式：`主版本.次版本.修订版本-构建号`

例如：`1.0.0-20241225.123`
- `1.0.0`：主版本号
- `20241225`：构建日期（YYYYMMDD）
- `123`：提交次数

### 自动更新

版本信息在以下情况自动更新：
- 执行 `git commit` 时（通过 pre-commit hook）
- 推送到 GitHub 时（通过 GitHub Actions）

### 手动更新

```bash
npm run version:update
```

## 许可证

MIT License

## 作者

**荆炎荣**

## 参考项目

- [Oil-injected-Compressor-Calculator-pro](https://github.com/your-username/Oil-injected-Compressor-Calculator-pro)

