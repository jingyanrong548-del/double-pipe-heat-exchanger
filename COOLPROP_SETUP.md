# CoolProp 文件设置说明

## 重要提示

本项目需要 CoolProp 的 WebAssembly 版本才能运行。您需要手动准备以下文件：

## 所需文件

将以下两个文件放置到 `public/` 目录：

1. **coolprop.wasm** - CoolProp WebAssembly 二进制文件
2. **coolprop.js** - CoolProp JavaScript 包装器

## 获取方式

### 方式 1：从参考项目复制

如果您有参考项目 `Oil-injected-Compressor-Calculator-pro`，可以直接从该项目的 `public/` 目录复制这两个文件。

### 方式 2：从 CoolProp 官方获取

1. 访问 CoolProp 官方网站或 GitHub 仓库
2. 查找 WebAssembly 版本的构建文件
3. 下载并重命名为 `coolprop.wasm` 和 `coolprop.js`

### 方式 3：自行构建

如果您需要最新版本，可以：

1. 克隆 CoolProp 仓库
2. 按照官方文档构建 WebAssembly 版本
3. 将生成的文件复制到本项目的 `public/` 目录

## 文件结构

完成设置后，项目结构应该是：

```
double-pipe-heat-exchanger/
├── public/
│   ├── coolprop.wasm    ← 必须存在
│   └── coolprop.js      ← 必须存在
└── ...
```

## 验证

启动开发服务器后，如果 CoolProp 加载成功，您会看到主界面。如果加载失败，浏览器控制台会显示错误信息。

## 注意事项

- 确保文件名称完全匹配（区分大小写）
- 确保文件位于 `public/` 目录，而不是 `src/` 目录
- WASM 文件可能较大（几 MB），首次加载需要一些时间
- 部署到 Vercel 时，这些文件会自动包含在构建产物中

