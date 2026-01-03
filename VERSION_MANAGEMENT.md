# 版本管理说明

## 概述

本项目使用自动版本管理系统，每次提交代码到 GitHub 时会自动更新版本号。

## 版本格式

版本号格式：`主版本.次版本.修订版本-构建号`

**示例**：`1.0.0-20241225.123`

- **主版本号**：重大功能变更
- **次版本号**：新功能添加
- **修订版本号**：bug 修复
- **构建号**：`YYYYMMDD.提交次数`
  - `20241225`：构建日期（年-月-日）
  - `123`：从项目开始到现在的总提交次数

## 自动更新机制

### 1. Git Pre-commit Hook

每次执行 `git commit` 时，会自动运行版本更新脚本：

```bash
git add .
git commit -m "你的提交信息"
# 自动执行: npm run version:update
# 自动更新: package.json 和 VERSION 文件
```

### 2. GitHub Actions

推送到 GitHub 时，GitHub Actions 会自动：
- 更新版本号
- 提交版本变更
- 创建版本标签（可选）

## 手动更新版本

如果需要手动更新版本信息：

```bash
npm run version:update
```

这会：
1. 读取当前 git 信息（提交哈希、日期、分支）
2. 计算提交次数
3. 更新 `package.json` 中的版本号
4. 更新 `VERSION` 文件
5. 添加构建信息到 `package.json`

## 版本信息文件

### package.json

```json
{
  "version": "1.0.0-20241225.123",
  "buildInfo": {
    "commitHash": "abc1234",
    "commitDate": "2024-12-25T10:30:00+08:00",
    "branch": "main",
    "buildDate": "2024-12-25T10:30:00+08:00",
    "commitCount": 123
  }
}
```

### VERSION 文件

纯文本文件，包含：
- 当前版本号
- 构建信息
- 作者信息
- 更新历史

## 在应用中使用版本信息

版本信息会在应用的页脚自动显示。也可以通过以下方式访问：

```javascript
// 从 package.json 读取
import packageJson from '../package.json';
console.log(packageJson.version);
console.log(packageJson.buildInfo);
```

## 禁用自动更新

如果需要临时禁用自动版本更新：

### 方法 1：跳过 pre-commit hook

```bash
git commit --no-verify -m "你的提交信息"
```

### 方法 2：删除或重命名 hook

```bash
mv .git/hooks/pre-commit .git/hooks/pre-commit.bak
```

## 故障排除

### 问题：版本更新失败

**原因**：可能是 git 信息获取失败

**解决**：
1. 确保在 git 仓库中
2. 确保有提交历史
3. 检查 `scripts/version-update.js` 权限

### 问题：GitHub Actions 不工作

**原因**：可能是工作流文件配置问题

**解决**：
1. 检查 `.github/workflows/version-update.yml` 是否存在
2. 确保 GitHub Actions 已启用
3. 检查仓库设置中的 Actions 权限

### 问题：版本号格式错误

**原因**：可能是脚本逻辑问题

**解决**：
1. 手动运行 `npm run version:update` 查看错误
2. 检查 Node.js 版本（需要 Node.js 18+）
3. 查看脚本输出信息

## 最佳实践

1. **提交前检查**：确保版本更新成功
2. **版本标签**：重要版本可以手动创建 git tag
3. **发布说明**：在 CHANGELOG.md 中记录重要变更
4. **版本兼容性**：遵循语义化版本规范

## 相关文件

- `scripts/version-update.js` - 版本更新脚本
- `.git/hooks/pre-commit` - Git pre-commit hook
- `.github/workflows/version-update.yml` - GitHub Actions 工作流
- `package.json` - 包含版本信息
- `VERSION` - 版本信息文件

