# 列表 Markdown 转换优化总结

## 问题描述

在优化前，列表的嵌套 markdown 数据不正确，主要表现为：
1. 嵌套列表的缩进不正确
2. 列表标记（-, *, +）没有被正确保存和导出
3. 导出的 markdown 无法正确表示嵌套结构

## 根本原因

之前的实现存在以下问题：

### 1. 嵌套结构错误
- **错误做法**：通过创建嵌套的 `ListNode` 来表示嵌套列表
- **正确做法**：通过 `listItem.setIndent(depth)` 来设置缩进级别

### 2. 列表标记丢失
- **错误做法**：没有使用状态系统来存储列表标记
- **正确做法**：使用 `listMarkerState` 和 `$getState`/`$setState` 来保存标记

### 3. 导出逻辑不正确
- **错误做法**：使用 `'    '.repeat(depth)` 或其他不准确的方式
- **正确做法**：使用 `' '.repeat(depth * LIST_INDENT_SIZE)`，其中 `LIST_INDENT_SIZE = 4`

## 优化方案

### 1. 引入必要的 API

```typescript
import {$getState, $setState, createState} from 'lexical';
import type {ListType} from '@lexical/list';
```

### 2. 创建列表标记状态

```typescript
export const listMarkerState = createState('mdListMarker', {
  parse: (v: unknown) => (typeof v === 'string' && /^[-*+]$/.test(v) ? v : '-'),
});
```

这个状态用于存储和检索列表使用的标记符号（`-`、`*` 或 `+`）。

### 3. 改进缩进计算

```typescript
const LIST_INDENT_SIZE = 4;

function getIndent(whitespaces: string): number {
  const tabs = whitespaces.match(/\t/g);
  const spaces = whitespaces.match(/ /g);
  let indent = 0;
  if (tabs) indent += tabs.length;
  if (spaces) indent += Math.floor(spaces.length / LIST_INDENT_SIZE);
  return indent;
}
```

### 4. 优化列表导出函数

参考官方 `$listExport` 的实现：

```typescript
const $listExport = (
  listNode: ListNode,
  exportChildren: (node: ElementNode) => string,
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
          output.push($listExport(firstChild, exportChildren, depth + 1));
          continue;
        }
      }
      
      // 生成缩进和前缀
      const indent = ' '.repeat(depth * LIST_INDENT_SIZE);
      const listType = listNode.getListType();
      const listMarker = $getState(listNode, listMarkerState);
      
      const prefix =
        listType === 'number'
          ? `${listNode.getStart() + index}. `
          : listType === 'check'
            ? `${listMarker} [${listItemNode.getChecked() ? 'x' : ' '}] `
            : listMarker + ' ';
      
      output.push(indent + prefix + exportChildren(listItemNode));
      index++;
    }
  }
  return output.join('\n');
};
```

### 5. 优化列表替换函数

参考官方 `listReplace` 的实现：

```typescript
const listReplace = (listType: ListType): ElementTransformer['replace'] => {
  return (parentNode, children, match, isImport) => {
    // 创建列表项
    const listItem = $createListItemNode(
      listType === 'check' ? match[3] === 'x' : undefined,
    );
    
    // 提取列表标记
    const firstMatchChar = match[0].trim()[0];
    const listMarker =
      (listType === 'bullet' || listType === 'check') &&
      firstMatchChar === listMarkerState.parse(firstMatchChar)
        ? firstMatchChar
        : undefined;
    
    // 合并到现有列表或创建新列表
    // ... (详见完整实现)
    
    // 关键：设置缩进级别
    const indent = getIndent(match[1]);
    if (indent) {
      listItem.setIndent(indent);
    }
  };
};
```

### 6. 更新正则表达式

确保正则表达式能够正确捕获缩进：

```typescript
// 无序列表：捕获前导空格
regExp: /^(\s*)[-*+]\s/

// 有序列表：捕获前导空格和数字
regExp: /^(\s*)(\d{1,})\.\s/

// 任务列表：捕获前导空格和勾选状态
regExp: /^(\s*)(?:[-*+]\s)?\s?(\[(\s|x)?\])\s/i
```

## 优化效果

### 导入 (Markdown → Lexical)
✅ 正确解析缩进级别（4个空格 = 1级）  
✅ 保留列表标记（-, *, +）  
✅ 正确处理任务列表的勾选状态  
✅ 支持嵌套列表的正确转换

### 导出 (Lexical → Markdown)
✅ 每级嵌套增加4个空格  
✅ 保持原始列表标记  
✅ 正确导出任务列表的勾选状态  
✅ 输出的 markdown 可以正确往返转换

## 示例对比

### 优化前的导出（错误）
```markdown
- 一级
- 二级（应该有缩进）
- 三级（应该有更多缩进）
```

### 优化后的导出（正确）
```markdown
- 一级
    - 二级
        - 三级
```

## 关键要点

1. **不要创建嵌套的 ListNode**：Lexical 使用扁平的结构 + indent 来表示嵌套
2. **使用状态系统**：通过 `createState`、`$getState`、`$setState` 来管理额外的元数据
3. **遵循官方标准**：4个空格 = 1级缩进
4. **完全兼容官方**：实现与 `@lexical/markdown` 保持一致

## 相关文件

- `src/utils/markdownTransformers.ts` - Markdown 转换器（已优化）
- `src/plugins/ListPlugin.ts` - 列表插件（已验证正确）
- `src/Editor.vue` - 编辑器组件（配置正确）

## 参考资料

- Lexical 官方文档：https://lexical.dev/
- 官方实现：`@lexical/markdown/src/MarkdownTransformers.ts`
- 官方插件：`@lexical/react/LexicalListPlugin`

## 测试建议

使用 `MARKDOWN_LIST_TEST.md` 文件进行测试：
1. 将文件内容粘贴到编辑器
2. 检查渲染是否正确
3. 切换到 markdown 模式查看导出结果
4. 再次导入 markdown 验证往返转换

