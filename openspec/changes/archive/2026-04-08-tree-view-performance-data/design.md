## Context

speedscope 目前支持三种视图模式：
1. Time Order（时序视图）- 火焰图形式
2. Left Heavy（左重视图）- 火焰图形式
3. Sandwich（三明治视图）- 表格 + 火焰图混合

用户需要一个类似 Chrome DevTools "Top Down" 的树状视图，以层级方式展示调用栈，每个节点显示 Total（总采样）、Self（自身采样）、Children（子节点采样）数量。

### 数据格式
性能数据以 `a;b;c 10` 格式表示调用栈路径和采样数量，其中 `a;b;c` 表示从根到叶的调用链。

## Goals / Non-Goals

**Goals:**
- 在工具栏添加 "Top Down" 按钮
- 实现可展开/折叠的树状视图
- 显示每个节点的 Total、Self、Children 采样数量
- 支持采样数量（而非时间单位）
- 支持按 Total、Self、Children 列进行升序/降序排序

**Non-Goals:**
- 不改变现有的数据导入格式
- 不修改火焰图渲染逻辑

## Decisions

### 1. 新增 ViewMode.TREE_VIEW 枚举值

**选择**：在 `ViewMode` 枚举中添加 `TREE_VIEW`。

**原因**：与现有视图模式保持一致的结构，工具栏通过 `viewModeAtom` 控制视图切换。

**替代方案**：
- 将树状视图作为 Sandwich 视图的子视图 → 增加复杂度，不符合单一职责

### 2. 创建 `tree-view.tsx` 组件

**选择**：新建 `src/views/tree-view.tsx` 组件。

**原因**：
- 与 sandwich-view.tsx 结构类似（表格视图）
- 独立文件便于维护和测试

**替代方案**：
- 复用现有 profile-table-view → 树状视图与表格视图差异较大，强行复用会增加复杂度

### 3. 数据聚合计算

**选择**：在 `Profile` 类中添加树状结构数据构建方法。

**原因**：
- 数据聚合逻辑与视图分离，便于复用
- 在 `lib/profile.ts` 中实现，测试更容易

## Risks / Trade-offs

[风险] 树状视图节点过多时性能问题 → **缓解**：使用虚拟滚动（参考 profile-table-view 的 scrollable-list-view）

[风险] 节点展开/折叠状态管理 → **缓解**：使用 Preact hooks 管理本地状态

## Architecture Analysis

### 现有数据结构复用

**重要发现**：数据层已完整实现，树视图只需创建新的可视化层。

```
┌─────────────────────────────────────────────────────────┐
│  CallTreeNode 权重计算公式                               │
├─────────────────────────────────────────────────────────┤
│  Self     = getSelfWeight()                            │
│  Total    = getTotalWeight()                           │
│  Children = Σ child.getTotalWeight() (直接子节点)        │
│                                                         │
│  关系: Total = Self + Children                          │
└─────────────────────────────────────────────────────────┘
```

### 现有可复用组件

| 组件 | 路径 | 可复用部分 |
|------|------|-----------|
| SortIcon | `profile-table-view.tsx` | 排序箭头图标 |
| SortField/SortDirection | `app-state/index.ts` | 需扩展 CHILDREN |
| searchQueryAtom | `app-state/index.ts` | 全局搜索状态 |
| ScrollableListView | `scrollable-list-view.tsx` | 虚拟滚动 |

### 视图层 vs 数据层排序

```
平面列表排序 (Sandwich View):
  - 现有: sortGroupedCallTree() 会原地修改树结构
  - 问题: 对树视图不适合

树视图排序 (推荐方案):
  - 数据保持不变
  - TreeView 组件在渲染时对 children 排序
  - 每次 render 都重新排序（轻量操作）
  - 父子关系保持不变，只排序兄弟节点

示例:
        Root
       /    \
    A(100)  B(50)      ← 只排序兄弟节点
      │      │
    C(25)  D(10)       ← 父子关系保持不变
```

### 扩展点

1. **SortField 枚举**：需添加 `CHILDREN` 字段
2. **排序状态**：可复用 `tableSortMethodAtom` 或创建独立的 `treeSortMethodAtom`
3. **搜索状态**：可复用全局 `searchQueryAtom`
4. **展开状态**：组件本地状态，使用 `useState` 或 `useReducer`

## Open Questions

1. 是否需要显示百分比而非绝对采样数量？
   需要同时显示百分比
2. 排序状态是否需要持久化（保存到 URL 或 localStorage）？
   不用

---

## 布局问题与解决方案

### 问题描述

在实现树状视图时，遇到两个关键布局问题：

1. **Name列推挤问题**：当Name列内容（包括展开缩进）超宽时，会推挤后面的Total/Self/Children列
2. **滚动条位置问题**：需要在整个页面底部显示一个水平滑动条，仅用于滚动Name列内容，不影响其他列

### 需求分析

```
期望布局：

┌─────────────────────────────────────────────────────────────────┐
│  搜索框...                                                        │
├──────────────┬──────────────────────────────────────────────────┤
│              │  [展开][Name列固定宽度][Total][Self][Child] ← Header │
│              │  [展开][Name列固定宽度][Total][Self][Child]        │
│  垂直滚动条  │  [展开][很长的Name…][Total][Self][Child]        │
│              │         ↑                                            │
│              │  这部分Name内容可以通过页面底部的水平滑动条滚动    │
└──────────────┴──────────────────────────────────────────────────┘
   ──────────────────────────────────────────────────────────────
   [  水平滑动条: 只滚动Name列的内容（包括展开缩进）  ]  ← 页面最底部

关键要求：
- Total/Self/Child 列永远固定在右侧，不会被推挤，也不会随水平滚动条移动
- 水平滚动条只滚动 Name 列的内容（包括展开的缩进）
- 垂直滚动条滚动整个列表
```

### 解决方案：左右分离布局

```
结构设计：

treeContainer (flex, column, height: 100%)
├── searchContainer (固定高度)
└── mainContentWrapper (flex: 1, position: relative)
    ├── leftScroller (position: absolute, left: 0, right: [右侧总宽度], overflow-x: auto)
    │   └── leftContent (宽度足够容纳所有Name内容)
    │       ├── headerRow
    │       │   ├── expandHeader
    │       │   └── nameHeader
    │       └── dataRows...
    │           ├── expandCell
    │           └── nameCell
    │
    └── rightFixed (position: absolute, right: 0, width: [右侧总宽度])
        ├── headerRow
        │   ├── totalHeader
        │   ├── selfHeader
        │   └── childrenHeader
        └── dataRows...
            ├── totalCell
            ├── selfCell
            └── childrenCell

关键点：
1. 左右分离：把"展开+Name"和"Total+Self+Children"分成两个独立的DOM树
2. 左侧可滚动：左侧容器有overflow-x: auto，滚动条在底部
3. 右侧固定：右侧容器用position: absolute固定在右边
4. 同步垂直滚动：需要用JS同步左右两侧的垂直滚动位置
```

### 为什么之前的方案失败

```
之前尝试的问题：
1. 每行使用独立的CSS Grid - 无法实现统一的列宽度控制
2. overflow设置在每行上 - 导致每个Name单元格都有自己的滚动条
3. 没有把左右区域分离 - 无法实现只滚动Name列的需求

根本原因：
CSS Grid/Flexbox默认行为是内容驱动宽度，当内容超宽时会推挤其他列，
除非使用左右分离的布局结构。
```
