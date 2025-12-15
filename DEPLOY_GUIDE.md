# 部署指南：GitHub + Vercel

## 📋 前置检查清单

- [x] Git 仓库已初始化
- [x] GitHub 远程仓库已配置：`git@github.com:jingyanrong548-del/double-pipe-heat-exchanger.git`
- [x] `vercel.json` 配置文件已存在
- [x] `package.json` 包含构建脚本

---

## 🚀 方法一：一键上传脚本（推荐）

### 步骤 1：提交并推送到 GitHub

运行以下命令：

```bash
# 1. 添加所有更改
git add .

# 2. 提交更改（请根据实际修改内容调整提交信息）
git commit -m "优化传热系数计算和可视化显示"

# 3. 推送到 GitHub
git push origin main
```

或者直接运行一键脚本：

```bash
chmod +x deploy.sh
./deploy.sh
```

### 步骤 2：在 Vercel 部署

#### 方式 A：通过 GitHub 自动部署（推荐）

1. **访问 Vercel**：https://vercel.com
2. **登录/注册**：使用 GitHub 账号登录
3. **导入项目**：
   - 点击 "Add New..." → "Project"
   - 选择 `jingyanrong548-del/double-pipe-heat-exchanger` 仓库
   - 点击 "Import"
4. **配置项目**：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`（默认）
   - **Build Command**: `npm run build`（默认）
   - **Output Directory**: `dist`（默认）
   - **Install Command**: `npm install`（默认）
5. **环境变量**：无需额外配置（本项目不使用环境变量）
6. **部署**：点击 "Deploy"

#### 方式 B：通过 Vercel CLI 部署

```bash
# 1. 安装 Vercel CLI（如果未安装）
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署到生产环境
vercel --prod
```

---

## 🔄 后续更新流程

每次代码更新后，只需：

```bash
# 1. 提交并推送
git add .
git commit -m "你的提交信息"
git push origin main

# 2. Vercel 会自动检测 GitHub 推送并重新部署（如果已连接）
# 或者手动触发：
vercel --prod
```

---

## ✅ 验证部署

### GitHub 验证
- 访问：https://github.com/jingyanrong548-del/double-pipe-heat-exchanger
- 确认最新提交已推送

### Vercel 验证
- 访问 Vercel Dashboard：https://vercel.com/dashboard
- 查看部署状态和访问链接
- 点击 "Visit" 打开部署的应用

---

## 🐛 常见问题

### 1. Git 推送失败
```bash
# 检查远程仓库配置
git remote -v

# 如果未配置，添加远程仓库（SSH 方式）
git remote add origin git@github.com:jingyanrong548-del/double-pipe-heat-exchanger.git

# 或者如果当前是 HTTPS，切换为 SSH
git remote set-url origin git@github.com:jingyanrong548-del/double-pipe-heat-exchanger.git
```

### 2. Vercel 构建失败
- 检查 `package.json` 中的构建脚本是否正确
- 确认 `vite.config.js` 中 `base: '/'` 配置正确
- 查看 Vercel 构建日志中的具体错误信息

### 3. 部署后样式丢失
- 确认 `vite.config.js` 中 `base: '/'` 配置正确
- 检查 `index.html` 中资源路径是否正确

### 4. CoolProp WASM 加载失败
- 确认 `public/coolprop.wasm` 文件存在
- 检查 `vercel.json` 中的 WASM MIME 类型配置
- 确认 `src/js/coolprop_loader.js` 中的路径配置正确

---

## 📝 注意事项

1. **首次部署前**：确保所有依赖已安装（`npm install`）
2. **构建测试**：本地先运行 `npm run build` 确保构建成功
3. **预览测试**：本地运行 `npm run preview` 测试构建结果
4. **环境变量**：如果将来需要环境变量，在 Vercel Dashboard 中配置

---

## 🔗 相关链接

- **GitHub 仓库**：https://github.com/jingyanrong/double-pipe-heat-exchanger
- **Vercel Dashboard**：https://vercel.com/dashboard
- **Vercel 文档**：https://vercel.com/docs

