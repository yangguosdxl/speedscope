## 1. ViewMode 枚举扩展

- [x] 1.1 在 `src/lib/view-mode.ts` 中添加 `TREE_VIEW` 枚举值

## 2. 状态层 - 扩展现有枚举

- [x] 2.1 扩展 `SortField` 枚举，添加 `CHILDREN` 字段
- [x] 2.2 （可选）创建 `treeSortMethodAtom` 或复用 `tableSortMethodAtom`（使用组件本地状态）

## 3. UI 组件 - 树状视图

**注意**：复用现有 `CallTreeNode` 数据结构，无需构建新的树。排序在视图层实现（只排序兄弟节点）。

- [x] 3.1 创建 `src/views/tree-view.tsx` 组件
  - 从 `activeProfileState.profile.getGroupedCalltreeRoot()` 获取数据
  - 递归渲染树节点
  - 管理展开/折叠状态（本地 useState）
- [x] 3.2 创建 `src/views/tree-node.tsx` 子组件
  - 显示节点名称、Total、Self、Children
  - 处理展开/折叠点击
- [x] 3.3 创建树表头组件，支持点击排序
  - 排序在渲染时对 children 进行（不修改数据）
- [x] 3.4 创建搜索输入框组件
  - 搜索时保留匹配节点的父路径
- [x] 3.5 创建样式文件（使用 aphrodite StyleSheet）

## 4. 工具栏集成

- [x] 4.1 在 `src/views/toolbar.tsx` 中添加 "Top Down" 按钮
- [x] 4.2 绑定 `ViewMode.TREE_VIEW` 切换逻辑

## 5. 视图容器集成

- [x] 5.1 在 `application.tsx` 中添加 TreeView 的渲染逻辑
- [x] 5.2 处理视图切换时的状态管理（键盘快捷键 4）

## 6. 布局修复（关键问题）

- [x] 6.1 重构tree-view.tsx使用左右分离布局
  - 左侧区域：展开图标 + Name列（可水平滚动）
  - 右侧区域：Total/Self/Children列（固定在右侧）
  - 水平滚动条只出现在左侧区域底部（页面底部）
- [x] 6.2 实现左右两侧垂直滚动同步
- [x] 6.3 确保Name列内容超宽时不推挤右侧列

## 7. 增强功能

- [x] 7.1 添加Ctrl键一键展开/收起所有子节点功能
  - 按住Ctrl键点击节点，递归展开/收起该节点下所有子节点
  - 更新搜索框提示文字说明此功能

## 8. 测试

- [ ] 8.1 编写树节点权重计算验证（Children = Σ child.getTotalWeight()）
- [ ] 8.2 编写树视图组件测试
- [ ] 8.3 手动验证功能完整性
