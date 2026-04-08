## Why

当前 speedscope 以火焰图（flamegraph）为主要可视化方式，但对于理解调用层级关系和分析性能瓶颈的根源，使用树状结构展示性能数据更加直观。用户需要一个类似 Chrome DevTools "Top Down" 视图的树形展示，可以清晰看到每个函数的 Total、Self 和 Children 采样数量。

## What Changes

- 在工具栏添加新的 "Top Down" 按钮入口
- 实现树状结构视图，以层级方式展示性能数据
- 显示每个节点的 Total（总采样）、Self（自身采样）、Children（子节点采样）数量
- 使用采样数量而非时间单位，更加通用

## Capabilities

### New Capabilities
- `tree-view`: 树状结构展示性能数据，支持展开/折叠节点，显示 Total/Self/Children 采样统计，支持按列排序、按名称搜索，同时显示数量和百分比

### Modified Capabilities
- （无）

## Impact

- 新增 UI 组件：`src/views/tree-view.tsx` 及相关子组件
- 工具栏：在现有工具栏添加 "Top Down" 按钮
- 数据层：直接复用现有 `CallTreeNode` 数据结构，无需修改
- 状态管理：
  - 扩展 `SortField` 枚举添加 `CHILDREN`
  - 排序/搜索状态可复用现有 atom 或使用本地状态
- 性能：使用虚拟滚动（参考 `ScrollableListView`）处理大量节点
