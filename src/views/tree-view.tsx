import {h} from 'preact'
import {useCallback, useMemo, useState, useRef} from 'preact/hooks'
import {StyleSheet, css} from 'aphrodite'
import {CallTreeNode} from '../lib/profile'
import {commonStyle, FontSize} from './style'
import {useTheme, Theme} from './themes/theme'
import {ActiveProfileState} from '../app-state/active-profile-state'
import {StatelessComponent} from '../lib/preact-helpers'
import {SortField, SortDirection} from '../app-state'
import {sortBy} from '../lib/utils'

// 排序方法接口
interface TreeSortMethod {
  field: SortField
  direction: SortDirection
}

// 列宽配置
interface ColumnWidths {
  name: number
  total: number
  self: number
  children: number
}

const MIN_COLUMN_WIDTH = 60
const EXPAND_COLUMN_WIDTH = 20
const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  name: 300,
  total: 120,
  self: 120,
  children: 120,
}

// 计算 Children 权重
function getChildrenWeight(node: CallTreeNode): number {
  return node.children.reduce((sum, child) => sum + child.getTotalWeight(), 0)
}

// 百分比格式化
function formatPercent(value: number, total: number): string {
  if (total === 0) return '0.0%'
  return ((value / total) * 100).toFixed(1) + '%'
}

// 递归收集所有子节点
function collectAllDescendants(node: CallTreeNode): CallTreeNode[] {
  const result: CallTreeNode[] = []
  const traverse = (n: CallTreeNode) => {
    for (const child of n.children) {
      result.push(child)
      traverse(child)
    }
  }
  traverse(node)
  return result
}

// 获取排序后的子节点
function getSortedChildren(
  node: CallTreeNode,
  sortMethod: TreeSortMethod
): CallTreeNode[] {
  const children = [...node.children]
  switch (sortMethod.field) {
    case SortField.SYMBOL_NAME:
      sortBy(children, c => c.frame.name.toLowerCase())
      break
    case SortField.SELF:
      sortBy(children, c => c.getSelfWeight())
      break
    case SortField.TOTAL:
      sortBy(children, c => c.getTotalWeight())
      break
    case SortField.CHILDREN:
      sortBy(children, c => getChildrenWeight(c))
      break
  }
  if (sortMethod.direction === SortDirection.DESCENDING) {
    children.reverse()
  }
  return children
}

interface TreeNodeLeftProps {
  node: CallTreeNode
  depth: number
  theme: Theme
  expandedNodes: Set<CallTreeNode>
  onToggleExpand: (node: CallTreeNode, withCtrl: boolean) => void
  columnWidths: ColumnWidths
  sortMethod: TreeSortMethod
  visibleNodes: Set<CallTreeNode> | null
}

const TreeNodeLeftComponent = ({
  node,
  depth,
  theme,
  expandedNodes,
  onToggleExpand,
  columnWidths,
  sortMethod,
  visibleNodes,
}: TreeNodeLeftProps) => {
  const style = getTreeStyles(theme)
  const isExpanded = expandedNodes.has(node)
  const hasChildren = node.children.length > 0

  const handleClick = useCallback((e: MouseEvent) => {
    if (hasChildren) {
      onToggleExpand(node, e.ctrlKey || e.metaKey)
    }
  }, [hasChildren, node, onToggleExpand])

  const indentWidth = depth * 16
  const totalLeftWidth = indentWidth + EXPAND_COLUMN_WIDTH + columnWidths.name

  const sortedChildren = getSortedChildren(node, sortMethod)
  const visibleChildren = visibleNodes
    ? sortedChildren.filter(child => visibleNodes.has(child))
    : sortedChildren

  return (
    <div>
      <div className={css(style.treeRowLeft)} style={{width: `${totalLeftWidth}px`}} onClick={(e: any) => handleClick(e)}>
        <div className={css(style.expandCell)} style={{width: `${indentWidth + EXPAND_COLUMN_WIDTH}px`}}>
          <span className={css(style.expandIcon)}>
            {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
          </span>
        </div>
        <div className={css(style.nameCell)} style={{width: `${columnWidths.name}px`}}>
          <span className={css(style.nodeName)} title={node.frame.name}>
            {node.frame.name}
          </span>
        </div>
      </div>
      {isExpanded && visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map(child => (
            <TreeNodeLeftComponent
              key={`left-${child.frame.key as string}`}
              node={child}
              depth={depth + 1}
              theme={theme}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              columnWidths={columnWidths}
              sortMethod={sortMethod}
              visibleNodes={visibleNodes}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TreeNodeRightProps {
  node: CallTreeNode
  depth: number
  theme: Theme
  expandedNodes: Set<CallTreeNode>
  totalWeight: number
  columnWidths: ColumnWidths
  sortMethod: TreeSortMethod
  visibleNodes: Set<CallTreeNode> | null
}

const TreeNodeRightComponent = ({
  node,
  depth,
  theme,
  expandedNodes,
  totalWeight,
  columnWidths,
  sortMethod,
  visibleNodes,
}: TreeNodeRightProps) => {
  const style = getTreeStyles(theme)
  const isExpanded = expandedNodes.has(node)

  const selfWeight = node.getSelfWeight()
  const totalNodeWeight = node.getTotalWeight()
  const childrenWeight = getChildrenWeight(node)

  const sortedChildren = getSortedChildren(node, sortMethod)
  const visibleChildren = visibleNodes
    ? sortedChildren.filter(child => visibleNodes.has(child))
    : sortedChildren

  return (
    <div>
      <div className={css(style.treeRowRight)}>
        <div className={css(style.weightCell)} style={{width: `${columnWidths.total}px`}}>
          <span className={css(style.weightValue)}>{totalNodeWeight.toLocaleString()}</span>
          <span className={css(style.percent)}>{formatPercent(totalNodeWeight, totalWeight)}</span>
        </div>
        <div className={css(style.weightCell)} style={{width: `${columnWidths.self}px`}}>
          <span className={css(style.weightValue)}>{selfWeight.toLocaleString()}</span>
          <span className={css(style.percent)}>{formatPercent(selfWeight, totalWeight)}</span>
        </div>
        <div className={css(style.weightCell)} style={{width: `${columnWidths.children}px`}}>
          <span className={css(style.weightValue)}>{childrenWeight.toLocaleString()}</span>
          <span className={css(style.percent)}>{formatPercent(childrenWeight, totalWeight)}</span>
        </div>
      </div>
      {isExpanded && visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map(child => (
            <TreeNodeRightComponent
              key={`right-${child.frame.key as string}`}
              node={child}
              depth={depth + 1}
              theme={theme}
              expandedNodes={expandedNodes}
              totalWeight={totalWeight}
              columnWidths={columnWidths}
              sortMethod={sortMethod}
              visibleNodes={visibleNodes}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TreeHeaderProps {
  theme: Theme
  sortMethod: TreeSortMethod
  onSort: (field: SortField) => void
  columnWidths: ColumnWidths
  onColumnResize: (column: keyof ColumnWidths, newWidth: number) => void
}

const TreeHeaderLeftComponent = ({
  theme,
  sortMethod,
  onSort,
  columnWidths,
  onColumnResize,
}: TreeHeaderProps) => {
  const style = getTreeStyles(theme)

  const renderSortIcon = (field: SortField) => {
    if (sortMethod.field !== field) return null
    return sortMethod.direction === SortDirection.ASCENDING ? ' ▲' : ' ▼'
  }

  const createResizeHandler = useCallback((column: keyof ColumnWidths) => {
    return (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startWidth = columnWidths[column]

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + (moveEvent.clientX - startX))
        onColumnResize(column, newWidth)
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }
  }, [columnWidths, onColumnResize])

  const totalLeftWidth = EXPAND_COLUMN_WIDTH + columnWidths.name

  return (
    <div className={css(style.treeHeaderLeft)} style={{width: `${totalLeftWidth}px`}}>
      <div className={css(style.headerCell)} style={{width: `${EXPAND_COLUMN_WIDTH}px`}}></div>
      <div className={css(style.headerCell, style.nameHeader)} style={{width: `${columnWidths.name}px`}}>
        <span onClick={() => onSort(SortField.SYMBOL_NAME)}>
          Name {renderSortIcon(SortField.SYMBOL_NAME)}
        </span>
        <div className={css(style.resizeHandle)} onMouseDown={createResizeHandler('name')} />
      </div>
    </div>
  )
}

const TreeHeaderRightComponent = ({
  theme,
  sortMethod,
  onSort,
  columnWidths,
  onColumnResize,
}: TreeHeaderProps) => {
  const style = getTreeStyles(theme)

  const renderSortIcon = (field: SortField) => {
    if (sortMethod.field !== field) return null
    return sortMethod.direction === SortDirection.ASCENDING ? ' ▲' : ' ▼'
  }

  const createResizeHandler = useCallback((column: keyof ColumnWidths) => {
    return (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startWidth = columnWidths[column]

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + (moveEvent.clientX - startX))
        onColumnResize(column, newWidth)
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }
  }, [columnWidths, onColumnResize])

  const totalRightWidth = columnWidths.total + columnWidths.self + columnWidths.children

  return (
    <div className={css(style.treeHeaderRight)} style={{width: `${totalRightWidth}px`}}>
      <div className={css(style.headerCell, style.weightHeader)} style={{width: `${columnWidths.total}px`}}>
        <span onClick={() => onSort(SortField.TOTAL)}>
          Total {renderSortIcon(SortField.TOTAL)}
        </span>
        <div className={css(style.resizeHandle)} onMouseDown={createResizeHandler('total')} />
      </div>
      <div className={css(style.headerCell, style.weightHeader)} style={{width: `${columnWidths.self}px`}}>
        <span onClick={() => onSort(SortField.SELF)}>
          Self {renderSortIcon(SortField.SELF)}
        </span>
        <div className={css(style.resizeHandle)} onMouseDown={createResizeHandler('self')} />
      </div>
      <div className={css(style.headerCell, style.weightHeader)} style={{width: `${columnWidths.children}px`}}>
        <span onClick={() => onSort(SortField.CHILDREN)}>
          Children {renderSortIcon(SortField.CHILDREN)}
        </span>
        <div className={css(style.resizeHandle)} onMouseDown={createResizeHandler('children')} />
      </div>
    </div>
  )
}

interface TreeViewProps {
  activeProfileState: ActiveProfileState
  theme: Theme
}

class TreeView extends StatelessComponent<TreeViewProps> {
  private initialExpandLevel = 1

  render() {
    const {activeProfileState, theme} = this.props
    const profile = activeProfileState.profile
    const root = profile.getGroupedCalltreeRoot()
    const totalWeight = profile.getTotalWeight()

    const [sortMethod, setSortMethod] = useState<TreeSortMethod>({
      field: SortField.TOTAL,
      direction: SortDirection.DESCENDING,
    })

    const [columnWidths, setColumnWidths] = useState<ColumnWidths>({...DEFAULT_COLUMN_WIDTHS})

    const [expandedNodes, setExpandedNodes] = useState<Set<CallTreeNode>>(() => {
      const initial = new Set<CallTreeNode>()
      root.children.slice(0, this.initialExpandLevel).forEach(child => initial.add(child))
      return initial
    })

    const [searchQuery, setSearchQuery] = useState('')

    const leftScrollRef = useRef<HTMLDivElement>(null)
    const rightScrollRef = useRef<HTMLDivElement>(null)

    // 同步左右滚动
    const handleLeftScroll = useCallback(() => {
      if (leftScrollRef.current && rightScrollRef.current) {
        rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop
      }
    }, [])

    const handleRightScroll = useCallback(() => {
      if (leftScrollRef.current && rightScrollRef.current) {
        leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop
      }
    }, [])

    const handleToggleExpand = useCallback((node: CallTreeNode, withCtrl: boolean) => {
      setExpandedNodes(prev => {
        const next = new Set(prev)
        const isCurrentlyExpanded = next.has(node)

        if (withCtrl) {
          // Ctrl键按下：展开/收起当前节点及其所有子节点
          const allDescendants = collectAllDescendants(node)
          if (isCurrentlyExpanded) {
            // 收起：移除当前节点和所有子节点
            next.delete(node)
            allDescendants.forEach(n => next.delete(n))
          } else {
            // 展开：添加当前节点和所有子节点
            next.add(node)
            allDescendants.forEach(n => next.add(n))
          }
        } else {
          // 普通点击：只切换当前节点
          if (isCurrentlyExpanded) {
            next.delete(node)
          } else {
            next.add(node)
          }
        }
        return next
      })
    }, [])

    const handleSort = useCallback((field: SortField) => {
      setSortMethod(prev => ({
        field,
        direction:
          prev.field === field && prev.direction === SortDirection.DESCENDING
            ? SortDirection.ASCENDING
            : SortDirection.DESCENDING,
      }))
    }, [])

    const handleColumnResize = useCallback((column: keyof ColumnWidths, newWidth: number) => {
      setColumnWidths(prev => ({
        ...prev,
        [column]: Math.max(MIN_COLUMN_WIDTH, newWidth),
      }))
    }, [])

    const visibleNodes = useMemo(() => {
      if (!searchQuery.trim()) {
        return null
      }

      const query = searchQuery.toLowerCase()
      const matches = new Set<CallTreeNode>()
      const parentsToShow = new Set<CallTreeNode>()

      function findMatches(node: CallTreeNode) {
        const nameMatch = node.frame.name.toLowerCase().includes(query)
        let hasMatchingDescendant = false

        for (const child of node.children) {
          if (findMatches(child)) {
            hasMatchingDescendant = true
          }
        }

        if (nameMatch || hasMatchingDescendant) {
          matches.add(node)
          let parent = node.parent
          while (parent && parent !== root) {
            parentsToShow.add(parent)
            parent = parent.parent
          }
        }

        return nameMatch || hasMatchingDescendant
      }

      findMatches(root)
      matches.forEach(node => parentsToShow.add(node))

      return parentsToShow
    }, [searchQuery, root])

    const filteredChildren = useMemo(() => {
      const sorted = getSortedChildren(root, sortMethod)
      if (!visibleNodes) {
        return sorted
      }
      return sorted.filter(child => visibleNodes.has(child))
    }, [root.children, sortMethod, visibleNodes])

    const style = getTreeStyles(theme)
    const totalRightWidth = columnWidths.total + columnWidths.self + columnWidths.children

    return (
      <div className={css(commonStyle.fillY, style.treeContainer)}>
        <div className={css(style.searchContainer)}>
          <input
            type="text"
            className={css(style.searchInput)}
            placeholder="搜索函数名称... (按住Ctrl点击可展开/收起所有子节点)"
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={css(style.mainContentWrapper)}>
          {/* 左侧区域：展开 + Name列（可水平滚动） */}
          <div
            className={css(style.leftScroller)}
            style={{right: `${totalRightWidth}px`}}
            ref={leftScrollRef}
            onScroll={handleLeftScroll}
          >
            <div className={css(style.leftContent)}>
              <TreeHeaderLeftComponent
                theme={theme}
                sortMethod={sortMethod}
                onSort={handleSort}
                columnWidths={columnWidths}
                onColumnResize={handleColumnResize}
              />
              {filteredChildren.length === 0 ? (
                <div className={css(style.emptyState)}>
                  {searchQuery ? '未找到匹配的函数' : '暂无数据'}
                </div>
              ) : (
                filteredChildren.map(child => (
                  <TreeNodeLeftComponent
                    key={`left-${child.frame.key as string}`}
                    node={child}
                    depth={0}
                    theme={theme}
                    expandedNodes={expandedNodes}
                    onToggleExpand={handleToggleExpand}
                    columnWidths={columnWidths}
                    sortMethod={sortMethod}
                    visibleNodes={visibleNodes}
                  />
                ))
              )}
            </div>
          </div>

          {/* 右侧区域：Total/Self/Children列（固定） */}
          <div
            className={css(style.rightFixed)}
            style={{width: `${totalRightWidth}px`}}
            ref={rightScrollRef}
            onScroll={handleRightScroll}
          >
            <TreeHeaderRightComponent
              theme={theme}
              sortMethod={sortMethod}
              onSort={handleSort}
              columnWidths={columnWidths}
              onColumnResize={handleColumnResize}
            />
            {filteredChildren.length === 0 ? (
              <div className={css(style.emptyStateRight)}></div>
            ) : (
              filteredChildren.map(child => (
                <TreeNodeRightComponent
                  key={`right-${child.frame.key as string}`}
                  node={child}
                  depth={0}
                  theme={theme}
                  expandedNodes={expandedNodes}
                  totalWeight={totalWeight}
                  columnWidths={columnWidths}
                  sortMethod={sortMethod}
                  visibleNodes={visibleNodes}
                />
              ))
            )}
          </div>
        </div>
      </div>
    )
  }
}

const getTreeStyles = (theme: Theme) => {
  const t = theme || {
    bgPrimaryColor: '#fff',
    bgSecondaryColor: '#f0f0f0',
    fgPrimaryColor: '#333',
    fgSecondaryColor: '#888',
    selectionPrimaryColor: '#0066cc',
  } as Theme

  return StyleSheet.create({
    treeContainer: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: t.bgPrimaryColor,
      overflow: 'hidden',
    },
    searchContainer: {
      padding: '8px',
      borderBottom: `1px solid ${t.fgSecondaryColor}`,
      flexShrink: 0,
    },
    searchInput: {
      width: '100%',
      padding: '8px 12px',
      fontSize: FontSize.TITLE,
      fontFamily: 'inherit',
      background: t.bgPrimaryColor,
      color: t.fgPrimaryColor,
      border: `1px solid ${t.fgSecondaryColor}`,
      borderRadius: '4px',
      outline: 'none',
      ':focus': {
        borderColor: t.selectionPrimaryColor,
      },
    },
    mainContentWrapper: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    leftScroller: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      overflowX: 'auto',
      overflowY: 'auto',
      background: t.bgPrimaryColor,
    },
    leftContent: {
      display: 'inline-block',
      minWidth: '100%',
    },
    rightFixed: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      background: t.bgPrimaryColor,
      // 隐藏右侧滚动条，用左侧的
      '::-webkit-scrollbar': {
        width: 0,
        height: 0,
      },
    },
    treeHeaderLeft: {
      display: 'flex',
      background: t.bgSecondaryColor,
      borderBottom: `1px solid ${t.fgSecondaryColor}`,
      fontWeight: 'bold',
      fontSize: FontSize.TITLE,
      position: 'sticky',
      top: 0,
      zIndex: 2,
      flexShrink: 0,
    },
    treeHeaderRight: {
      display: 'flex',
      background: t.bgSecondaryColor,
      borderBottom: `1px solid ${t.fgSecondaryColor}`,
      fontWeight: 'bold',
      fontSize: FontSize.TITLE,
      position: 'sticky',
      top: 0,
      zIndex: 2,
      flexShrink: 0,
    },
    headerCell: {
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      padding: '8px',
      position: 'relative',
      boxSizing: 'border-box',
      ':hover': {
        color: t.selectionPrimaryColor,
      },
    },
    nameHeader: {
      justifyContent: 'space-between',
    },
    weightHeader: {
      justifyContent: 'flex-end',
    },
    resizeHandle: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 6,
      cursor: 'col-resize',
      background: 'transparent',
      zIndex: 3,
      ':hover': {
        background: t.selectionPrimaryColor,
      },
    },
    treeRowLeft: {
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      fontSize: FontSize.TITLE,
      fontFamily: 'monospace',
      borderBottom: `1px solid ${t.bgSecondaryColor}`,
      boxSizing: 'border-box',
      ':hover': {
        background: t.bgSecondaryColor,
      },
    },
    treeRowRight: {
      display: 'flex',
      alignItems: 'center',
      fontSize: FontSize.TITLE,
      fontFamily: 'monospace',
      borderBottom: `1px solid ${t.bgSecondaryColor}`,
      boxSizing: 'border-box',
      ':hover': {
        background: t.bgSecondaryColor,
      },
    },
    expandCell: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      boxSizing: 'border-box',
      paddingRight: '4px',
    },
    expandIcon: {
      textAlign: 'center',
      color: t.fgSecondaryColor,
      width: '20px',
    },
    nameCell: {
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px',
      overflow: 'hidden',
      boxSizing: 'border-box',
    },
    nodeName: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: 1,
    },
    weightCell: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '4px 8px',
      overflow: 'hidden',
      boxSizing: 'border-box',
    },
    weightValue: {
      marginRight: '4px',
      flexShrink: 0,
    },
    percent: {
      color: t.fgSecondaryColor,
      fontSize: FontSize.LABEL,
      flexShrink: 0,
    },
    emptyState: {
      padding: 40,
      textAlign: 'center',
      color: t.fgSecondaryColor,
      fontSize: FontSize.TITLE,
    },
    emptyStateRight: {
      padding: 40,
    },
  })
}

interface TreeViewContainerProps {
  activeProfileState: ActiveProfileState
}

export const TreeViewContainer = (props: TreeViewContainerProps) => {
  const theme = useTheme()
  return <TreeView activeProfileState={props.activeProfileState} theme={theme} />
}
