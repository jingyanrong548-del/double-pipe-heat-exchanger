#!/bin/bash

# 快速推送脚本
# 在 GitHub 上创建仓库后运行此脚本

GITHUB_USERNAME="jingyanrong"
REPO_NAME="double-pipe-heat-exchanger"

echo "🚀 准备推送到 GitHub..."
echo "📦 仓库: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""

# 检查远程仓库是否已存在
if git remote get-url origin > /dev/null 2>&1; then
    echo "✅ 远程仓库已配置"
    CURRENT_URL=$(git remote get-url origin)
    echo "   当前 URL: $CURRENT_URL"
else
    echo "➕ 添加远程仓库..."
    git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
fi

# 确保在 main 分支
git branch -M main

# 推送代码
echo ""
echo "📤 推送代码到 GitHub..."
echo "   如果提示输入密码，请使用 GitHub Personal Access Token"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ✅ ✅ 代码已成功推送到 GitHub!"
    echo ""
    echo "📦 仓库地址: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "🎯 下一步：部署到 Vercel"
    echo "   1. 访问 https://vercel.com"
    echo "   2. 使用 GitHub 账号登录"
    echo "   3. 点击 'Add New...' → 'Project'"
    echo "   4. 选择仓库 '$REPO_NAME'"
    echo "   5. Framework Preset 选择 'Vite'"
    echo "   6. 点击 'Deploy'"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "可能的原因："
    echo "1. GitHub 仓库尚未创建"
    echo "   请先访问 https://github.com/new 创建仓库"
    echo ""
    echo "2. 认证问题"
    echo "   如果提示输入密码，请使用 GitHub Personal Access Token"
    echo "   创建 Token: https://github.com/settings/tokens"
    echo "   需要 'repo' 权限"
    echo ""
    echo "3. 权限问题"
    echo "   确保您有该仓库的推送权限"
fi

