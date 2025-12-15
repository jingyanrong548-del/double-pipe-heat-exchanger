# 部署指南 - GitHub & Vercel

## 部署到 GitHub

### 1. 在 GitHub 上创建新仓库

1. 访问 [GitHub](https://github.com) 并登录
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - Repository name: `double-pipe-heat-exchanger`（或您喜欢的名称）
   - Description: `套管换热器热力计算 Web 应用 - 支持直管和麻花管模式`
   - 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（因为我们已经有了）
4. 点击 "Create repository"

### 2. 推送代码到 GitHub

在终端中执行以下命令（将 `YOUR_USERNAME` 替换为您的 GitHub 用户名）：

```bash
# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/double-pipe-heat-exchanger.git

# 或者使用 SSH（如果您配置了 SSH 密钥）
# git remote add origin git@github.com:YOUR_USERNAME/double-pipe-heat-exchanger.git

# 推送代码
git branch -M main
git push -u origin main
```

如果遇到认证问题，您可能需要：
- 使用 GitHub Personal Access Token（而不是密码）
- 或配置 SSH 密钥

## 部署到 Vercel

### 方法 1：通过 Vercel Dashboard（推荐）

1. **访问 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录（推荐）

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择您刚创建的 GitHub 仓库 `double-pipe-heat-exchanger`
   - 点击 "Import"

3. **配置项目**
   - Framework Preset: **Vite**
   - Root Directory: `./`（默认）
   - Build Command: `npm run build`（默认）
   - Output Directory: `dist`（默认）
   - Install Command: `npm install`（默认）

4. **环境变量**
   - 本项目不需要额外的环境变量

5. **部署**
   - 点击 "Deploy"
   - 等待部署完成（通常 1-2 分钟）

6. **访问应用**
   - 部署完成后，Vercel 会提供一个 URL，例如：
     `https://double-pipe-heat-exchanger.vercel.app`
   - 您也可以自定义域名

### 方法 2：使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目目录中登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

## 重要提示

### CoolProp 文件

确保 `public/coolprop.wasm` 和 `src/js/coolprop.js` 文件已正确提交到 GitHub。

如果文件太大导致推送失败，可以：
1. 使用 Git LFS（Large File Storage）
2. 或者将文件放在 CDN 上，通过 URL 加载

### 自动部署

配置完成后，每次推送到 GitHub 的 `main` 分支，Vercel 会自动重新部署。

### 自定义域名

在 Vercel Dashboard 中：
1. 进入项目设置
2. 选择 "Domains"
3. 添加您的自定义域名

## 验证部署

部署完成后，访问 Vercel 提供的 URL，检查：
- ✅ 页面正常加载
- ✅ CoolProp 成功加载（无错误）
- ✅ 可视化图形正常显示
- ✅ 计算功能正常工作
- ✅ 示例案例按钮可用

## 故障排除

### CoolProp 加载失败

如果部署后 CoolProp 无法加载：
1. 检查 `public/coolprop.wasm` 文件是否存在
2. 检查 `src/js/coolprop.js` 文件是否存在
3. 查看浏览器控制台的错误信息
4. 检查 Vercel 构建日志

### 路径问题

如果出现路径错误：
1. 确保 `vite.config.js` 中 `base: '/'` 设置正确
2. 确保 `vercel.json` 配置正确

### 构建失败

如果构建失败：
1. 检查 `package.json` 中的依赖是否正确
2. 查看 Vercel 构建日志
3. 确保所有文件都已提交到 GitHub

