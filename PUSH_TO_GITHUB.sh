#!/bin/bash

# 推送到 GitHub 的脚本
# 使用方法：bash PUSH_TO_GITHUB.sh YOUR_GITHUB_USERNAME

if [ -z "$1" ]; then
    echo "使用方法: bash PUSH_TO_GITHUB.sh YOUR_GITHUB_USERNAME"
    echo "例如: bash PUSH_TO_GITHUB.sh jingyanrong"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="double-pipe-heat-exchanger"

echo "准备推送到 GitHub..."
echo "仓库: https://github.com/$GITHUB_USERNAME/$REPO_NAME"

# 检查是否已有远程仓库
if git remote get-url origin > /dev/null 2>&1; then
    echo "远程仓库已存在，更新中..."
    git remote set-url origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
else
    echo "添加远程仓库..."
    git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
fi

# 确保在 main 分支
git branch -M main

# 推送代码
echo "推送代码到 GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 代码已成功推送到 GitHub!"
    echo "📦 仓库地址: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "下一步："
    echo "1. 访问 https://vercel.com"
    echo "2. 使用 GitHub 账号登录"
    echo "3. 点击 'Add New...' → 'Project'"
    echo "4. 选择仓库 '$REPO_NAME'"
    echo "5. Framework Preset 选择 'Vite'"
    echo "6. 点击 'Deploy'"
else
    echo ""
    echo "❌ 推送失败，请检查："
    echo "1. GitHub 仓库是否已创建"
    echo "2. 是否有推送权限"
    echo "3. 是否配置了认证（Personal Access Token 或 SSH）"
fi

