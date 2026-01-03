#!/usr/bin/env node

/**
 * 自动版本更新脚本
 * 在 git commit 时自动更新版本号
 * 使用方法：npm run version:update
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// 获取当前 git 信息
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const commitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    return { commitHash, commitDate, branch };
  } catch (error) {
    console.warn('无法获取 git 信息，使用默认值');
    return {
      commitHash: 'unknown',
      commitDate: new Date().toISOString(),
      branch: 'unknown'
    };
  }
}

// 读取 package.json
function readPackageJson() {
  const content = readFileSync('package.json', 'utf-8');
  return JSON.parse(content);
}

// 更新版本号（基于日期和提交次数）
function updateVersion(currentVersion) {
  const gitInfo = getGitInfo();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // 获取提交次数（从项目开始日期或上次版本更新）
  let commitCount = 0;
  try {
    commitCount = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim()) || 0;
  } catch (error) {
    commitCount = 0;
  }
  
  // 版本格式：主版本.次版本.修订版本-构建号
  // 例如：1.0.0-20241225.123
  const buildNumber = `${year}${month}${day}.${commitCount}`;
  const newVersion = `1.0.0-${buildNumber}`;
  
  return {
    version: newVersion,
    buildInfo: {
      commitHash: gitInfo.commitHash,
      commitDate: gitInfo.commitDate,
      branch: gitInfo.branch,
      buildDate: date.toISOString(),
      commitCount: commitCount
    }
  };
}

// 更新 package.json
function updatePackageJson() {
  const packageJson = readPackageJson();
  const { version, buildInfo } = updateVersion(packageJson.version);
  
  packageJson.version = version;
  packageJson.buildInfo = buildInfo;
  packageJson.author = packageJson.author || '荆炎荣';
  
  writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
  
  console.log(`✅ 版本已更新: ${version}`);
  console.log(`📦 构建信息:`, buildInfo);
  
  return { version, buildInfo };
}

// 更新 VERSION 文件
function updateVersionFile(version, buildInfo) {
  const versionContent = `# 版本信息

## 当前版本
${version}

## 构建信息
- **提交哈希**: ${buildInfo.commitHash}
- **提交日期**: ${buildInfo.commitDate}
- **分支**: ${buildInfo.branch}
- **构建日期**: ${buildInfo.buildDate}
- **提交次数**: ${buildInfo.commitCount}

## 作者
荆炎荣

## 更新历史
自动生成于每次 git commit 时
`;
  
  writeFileSync('VERSION', versionContent, 'utf-8');
  console.log('✅ VERSION 文件已更新');
}

// 主函数
function main() {
  try {
    const { version, buildInfo } = updatePackageJson();
    updateVersionFile(version, buildInfo);
    console.log('\n✨ 版本信息更新完成！');
  } catch (error) {
    console.error('❌ 版本更新失败:', error.message);
    process.exit(1);
  }
}

main();

