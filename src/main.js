/**
 * 主入口文件
 * 初始化应用，加载 CoolProp，设置 UI
 */

import './style.css';
import { loadCoolProp } from './js/coolprop_loader.js';
import { initializeUI } from './js/ui.js';

/**
 * 初始化应用
 */
async function initApp() {
  const loadingDiv = document.getElementById('loading');
  const mainAppDiv = document.getElementById('main-app');

  try {
    // 显示加载状态
    if (loadingDiv) {
      loadingDiv.classList.remove('hidden');
    }
    if (mainAppDiv) {
      mainAppDiv.classList.add('hidden');
    }

    // 加载 CoolProp
    console.log('正在加载 CoolProp...');
    await loadCoolProp();
    console.log('CoolProp 加载成功');

    // 隐藏加载状态，显示主应用
    if (loadingDiv) {
      loadingDiv.classList.add('hidden');
    }
    if (mainAppDiv) {
      mainAppDiv.classList.remove('hidden');
    }

    // 初始化 UI
    initializeUI();
    console.log('应用初始化完成');
  } catch (error) {
    console.error('应用初始化失败:', error);
    
    // 显示错误信息
    if (loadingDiv) {
      loadingDiv.innerHTML = `
        <div class="text-center">
          <div class="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">加载失败</h2>
          <p class="text-gray-700 mb-4">${error.message}</p>
          <p class="text-sm text-gray-600">请确保 coolprop.js 和 coolprop.wasm 文件存在于 public 目录中</p>
          <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            重新加载
          </button>
        </div>
      `;
    }
  }
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

