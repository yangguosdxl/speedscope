# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作时提供指导。

## 项目概述

speedscope 是一个快速的、交互式的 Web 性能分析可视化工具。支持从多种语言和工具导入性能数据（JavaScript、Ruby、Python、Go、Java 等），并以火焰图（flamegraph）的形式展示。

## 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器（浏览器自动打开）
npm run serve

# 运行测试
npm run jest

# 运行单个测试文件
npm run jest -- src/import/chrome.test.ts

# 运行带覆盖率的测试
npm run coverage

# 类型检查
npm run typecheck

# 代码格式化和检查
npm run prettier
npm run lint
```

## 架构概览

### 目录结构

- `src/import/` - 各种性能分析格式的导入器（Chrome、Firefox、pprof、JFR 等）
- `src/lib/` - 核心数据结构和工具函数
- `src/views/` - Preact UI 组件
- `src/gl/` - WebGL 火焰图渲染引擎
- `src/app-state/` - 应用程序状态管理

### 文档结构

- `doc/` - 需求文档和其他文档
- `docs/solutions/` - 已文档化的问题解决方案（bug修复、最佳实践），按category组织，带YAML frontmatter（module, tags, problem_type）

### 核心概念

**性能数据模型**：性能数据通过 `src/import/index.ts` 导入，并转换为 `src/lib/profile.ts` 中定义的内部格式。核心类型包括 `Profile`、`ProfileGroup` 和 `Flamechart`。

**三种视图模式**：
1. Time Order（时序视图）- 按时间顺序展示调用栈
2. Left Heavy（左重视图）- 按相同栈分组，重的在左边
3. Sandwich（三明治视图）- 表格视图，显示调用者/被调用者

**渲染层**：使用 WebGL（`src/gl/`）实现高性能火焰图渲染，部分元素降级使用 Canvas 2D。

**导入器**：每种性能分析工具格式都有对应的导入器（如 `chrome.ts`、`pprof.ts`、`java-flight-recorder.ts`）。

### 技术栈

- **UI 框架**：Preact（轻量级 React 替代）
- **渲染引擎**：WebGL + Canvas 2D
- **构建工具**：esbuild
- **测试框架**：Jest + ts-jest
- **语言**：TypeScript
