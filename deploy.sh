#!/bin/bash

# 一键部署脚本：GitHub + Vercel
# 使用方法：./deploy.sh "你的提交信息"

set -e  # 遇到错误立即退出

echo "🚀 开始部署流程..."

# 检查是否有未提交的更改
if [ -z "$(git status --porcelain)" ]; then
  echo "⚠️  没有未提交的更改，跳过提交步骤"
else
  # 获取提交信息（如果提供）
  COMMIT_MSG="${1:-更新代码}"
  
  echo "📝 添加更改到暂存区..."
  git add .
  
  echo "💾 提交更改: $COMMIT_MSG"
  git commit -m "$COMMIT_MSG"
fi

# 检查是否有远程仓库
if ! git remote | grep -q "^origin$"; then
  echo "❌ 未找到远程仓库 'origin'"
  echo "请先配置远程仓库："
  echo "  git remote add origin https://github.com/jingyanrong/double-pipe-heat-exchanger.git"
  exit 1
fi

echo "📤 推送到 GitHub..."
git push origin main

echo "✅ GitHub 推送完成！"
echo ""
echo "📋 下一步："
echo "1. 访问 https://vercel.com"
echo "2. 登录并导入项目：jingyanrong/double-pipe-heat-exchanger"
echo "3. 配置 Framework Preset: Vite"
echo "4. 点击 Deploy"
echo ""
echo "或者使用 Vercel CLI："
echo "  vercel --prod"

