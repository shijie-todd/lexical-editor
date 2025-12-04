# 自定义列表 Transformers - 最终解决方案

## 🎯 问题根源

官方的列表 transformers（`UNORDERED_LIST`, `ORDERED_LIST`, `CHECK_LIST`）都使用了 `listMarkerState` 来保存列表标记（`-`, `*`, `+`）。当在不同上下文中重复使用这些 transformers 时，会导致：

```
Error: $setState: State key collision "mdListMarker" detected in ListNode
```

## ✅ 最终解决方案

**完全自定义实现列表 transformers，不使用 `listMarkerState`**

### 修改文件：`src/utils/markdownTransformers.ts`

#### 1. 导入必要的依赖

```typescript
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  HEADING,
  QUOTE,
  CODE,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown';

import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
```

**关键**：不导入官方的 `CHECK_LIST`, `ELEMENT_TRANSFORMERS` 等包含列表的集合。

#### 2. 实现自定义列表导出函数

```typescript
// 列表导出函数（简化版，不使用 listMarkerState）
const customListExport = (
  listNode: ListNode,
  exportChildren: (node: any) => string,
  depth: number,
): string => {
  const output = [];
  const children = listNode.getChildren();
  let index = 0;
  
  for (const listItemNode of children) {
    if ($isListItemNode(listItemNode)) {
      // 处理嵌套列表
      if (listItemNode.getChildrenSize() === 1) {
        const firstChild = listItemNode.getFirstChild();
        if ($isListNode(firstChild)) {
          output.push(customListExport(firstChild, exportChildren, depth + 1));
          continue;
        }
      }
      
      const indent = ' '.repeat(depth * LIST_INDENT_SIZE);
      const listType = listNode.getListType();
      
      // 生成前缀（简化版：无序列表固定使用 -）
      const prefix =
        listType === 'number'
          ? `${listNode.getStart() + index}. `
          : listType === 'check'
            ? `- [${listItemNode.getChecked() ? 'x' : ' '}] `
            : '- ';
      
      output.push(indent + prefix + exportChildren(listItemNode));
      index++;
    }
  }
  
  return output.join('\n');
};
```

**关键改动**：
- 不使用 `$getState(listNode, listMarkerState)` 获取列表标记
- 无序列表固定使用 `-` 作为标记
- 保持缩进和嵌套逻辑与官方一致

#### 3. 实现自定义列表替换函数

```typescript
const customListReplace = (listType: ListType): ElementTransformer['replace'] => {
  return (parentNode, children, match, isImport) => {
    const previousNode = parentNode.getPreviousSibling();
    const nextNode = parentNode.getNextSibling();
    const listItem = $createListItemNode(
      listType === 'check' ? match[3] === 'x' : undefined,
    );
    
    if ($isListNode(nextNode) && nextNode.getListType() === listType) {
      const firstChild = nextNode.getFirstChild();
      if (firstChild !== null) {
        firstChild.insertBefore(listItem);
      } else {
        nextNode.append(listItem);
      }
      parentNode.remove();
    } else if (
      $isListNode(previousNode) &&
      previousNode.getListType() === listType
    ) {
      previousNode.append(listItem);
      parentNode.remove();
    } else {
      const list = $createListNode(
        listType,
        listType === 'number' ? Number(match[2]) : undefined,
      );
      list.append(listItem);
      parentNode.replace(list);
    }
    
    listItem.append(...children);
    if (!isImport) {
      listItem.select(0, 0);
    }
    
    // 处理缩进
    const indent = getIndent(match[1] || '');
    if (indent) {
      listItem.setIndent(indent);
    }
  };
};
```

**关键改动**：
- 不使用 `$setState(list, listMarkerState, listMarker)` 保存列表标记
- 保持列表合并和创建逻辑与官方一致
- 保持缩进处理逻辑与官方一致

#### 4. 定义三个自定义列表 transformers

```typescript
// 无序列表
export const CUSTOM_UNORDERED_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) && node.getListType() === 'bullet'
      ? customListExport(node, exportChildren, 0)
      : null;
  },
  regExp: /^(\s*)[-*+]\s/,
  replace: customListReplace('bullet'),
  type: 'element',
};

// 有序列表
export const CUSTOM_ORDERED_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) && node.getListType() === 'number'
      ? customListExport(node, exportChildren, 0)
      : null;
  },
  regExp: /^(\s*)(\d{1,})\.\s/,
  replace: customListReplace('number'),
  type: 'element',
};

// 任务列表
export const CUSTOM_CHECK_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) && node.getListType() === 'check'
      ? customListExport(node, exportChildren, 0)
      : null;
  },
  regExp: /^(\s*)(?:[-*+]\s)?\s?(\[(\s|x)?\])\s/i,
  replace: customListReplace('check'),
  type: 'element',
};
```

#### 5. 组织 CUSTOM_TRANSFORMERS

```typescript
export const CUSTOM_TRANSFORMERS: Transformer[] = [
  TABLE,                          // 自定义表格
  HORIZONTAL_RULE,                // 自定义分隔线
  IMAGE,                          // 自定义图片
  HEADING,                        // 标题（官方）
  QUOTE,                          // 引用（官方）
  CODE,                           // 代码块（官方）
  CUSTOM_CHECK_LIST,              // 自定义任务列表（优先）
  CUSTOM_ORDERED_LIST,            // 自定义有序列表
  CUSTOM_UNORDERED_LIST,          // 自定义无序列表
  ...TEXT_FORMAT_TRANSFORMERS,    // 粗体、斜体等（官方）
  ...TEXT_MATCH_TRANSFORMERS,     // 链接等（官方）
  UNDERLINE,                      // 自定义下划线
];
```

**关键**：
- 不使用 `ELEMENT_TRANSFORMERS`（包含官方列表 transformers）
- 手动添加 `HEADING`, `QUOTE`, `CODE`
- 使用自定义的列表 transformers

## 📊 对比

### 官方实现（有状态冲突）：
```typescript
export const UNORDERED_LIST: ElementTransformer = {
  // ...
  export: (node, exportChildren) => {
    const listMarker = $getState(listNode, listMarkerState); // ❌ 使用状态
    // ...
  },
  replace: (parentNode, children, match, isImport) => {
    $setState(list, listMarkerState, listMarker); // ❌ 设置状态
    // ...
  },
};
```

### 自定义实现（无状态冲突）：
```typescript
export const CUSTOM_UNORDERED_LIST: ElementTransformer = {
  // ...
  export: (node, exportChildren) => {
    const prefix = '- '; // ✅ 固定标记，不使用状态
    // ...
  },
  replace: (parentNode, children, match, isImport) => {
    // ✅ 不设置状态
    // ...
  },
};
```

## ✨ 功能差异

### 官方版本：
- ✅ 保存列表标记（`-`, `*`, `+`）
- ✅ 导出时使用原始标记
- ❌ 在某些情况下导致状态冲突

### 自定义版本：
- ✅ 完全避免状态冲突
- ✅ 正确处理嵌套列表
- ✅ 支持 4 空格缩进
- ⚠️ 无序列表固定使用 `-` 标记（不影响功能）

## 🧪 测试验证

刷新页面后，你应该看到：
- ✅ 没有任何错误
- ✅ 初始内容正确渲染
- ✅ 有序列表嵌套正常
- ✅ 无序列表嵌套正常
- ✅ 任务列表正常工作
- ✅ 所有其他功能正常

## 📝 注意事项

### 列表标记的差异

**官方版本**：
```markdown
- 使用 - 标记
* 使用 * 标记
+ 使用 + 标记
```

**自定义版本**：
```markdown
- 统一使用 - 标记
- 统一使用 - 标记
- 统一使用 - 标记
```

这个差异**不影响功能**，只是美观性的微小差异。

## 🎓 经验总结

### 为什么状态系统会冲突？

1. **状态键是全局唯一的**：同一个键只能在一个节点上创建一次
2. **递归转换导致重复创建**：表格单元格等上下文中重复使用 transformers
3. **无法访问私有状态**：`listMarkerState` 没有被导出，无法重用

### 最佳实践

1. **独立实现而不是依赖状态**：避免状态冲突
2. **简化实现**：只保留核心功能
3. **隔离上下文**：不同上下文使用不同的 transformers
4. **参考官方实现**：保持逻辑一致性

## 🚀 现在应该完全正常工作了！

这个解决方案：
- ✅ 完全避免状态冲突
- ✅ 保持与官方实现的逻辑一致性
- ✅ 代码清晰易维护
- ✅ 支持所有列表功能

