/**
 * 自定义 Markdown Transformers
 * 用于支持 ImageNode、HorizontalRuleNode、Table 和下划线格式
 */

import type {ElementTransformer, TextFormatTransformer, TextMatchTransformer, Transformer} from '@lexical/markdown';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  HEADING,
  QUOTE,
  CODE,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown';
import type {ListType} from '@lexical/list';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {$createImageNode, $isImageNode, ImageNode} from '../nodes/ImageNode';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '../nodes/HorizontalRuleNode';
import type {ElementNode, LexicalNode} from 'lexical';
import {$isParagraphNode, $isTextNode} from 'lexical';

/**
 * Horizontal Rule Transformer
 * 支持 `---` 或 `***` 转换为分割线
 */
export const HORIZONTAL_RULE: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    if ($isHorizontalRuleNode(node)) {
      return '---\n';
    }
    return null;
  },
  regExp: /^(---|\*\*\*)$/,
  replace: (parentNode: ElementNode, _children: Array<LexicalNode>, _match: Array<string>) => {
    const hrNode = $createHorizontalRuleNode();
    parentNode.replace(hrNode);
    hrNode.selectNext();
  },
  type: 'element',
};

/**
 * Underline Transformer
 * 支持 `++text++` 格式转换为下划线
 * 注意：这是自定义语法，不是标准 Markdown
 */
export const UNDERLINE: TextFormatTransformer = {
  format: ['underline'],
  tag: '++',
  type: 'text-format',
};

/**
 * Image Transformer
 * 支持 `![alt text](url)` 格式（行内图片）
 * 扩展格式支持宽度、高度：
 * `![alt](url =widthxheight)`
 * 例如：`![示例图片](https://example.com/image.jpg =500x300)`
 */
export const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node: LexicalNode) => {
    if (!$isImageNode(node)) {
      return null;
    }
    
    const altText = node.getAltText() || '';
    const src = node.getSrc();
    const width = node.__width;
    const height = node.__height;
    
    // 构建 markdown 字符串
    let markdown = `![${altText}](${src}`;
    
    // 如果有尺寸，添加额外信息
    const hasDimensions = width !== 'inherit' && height !== 'inherit';
    
    if (hasDimensions) {
      markdown += ` =${width}x${height}`;
    }
    
    markdown += ')';
    return markdown;
  },
  importRegExp: /!\[([^\]]*)\]\(([^\s)]+)(?:\s*=(\d+)x(\d+))?\)/,
  regExp: /!\[([^\]]*)\]\(([^\s)]+)(?:\s*=(\d+)x(\d+))?\)$/,
  replace: (textNode, match) => {
    const altText = match[1] || '';
    const src = match[2] || '';
    const width = match[3] ? parseInt(match[3], 10) : undefined;
    const height = match[4] ? parseInt(match[4], 10) : undefined;
    
    const imageNode = $createImageNode({
      altText,
      height,
      src,
      width,
    });
    
    textNode.replace(imageNode);
  },
  trigger: ')',
  type: 'text-match',
};

/**
 * 自定义列表 Transformers
 * 完全独立实现，不使用 listMarkerState，避免状态键冲突
 * 参考官方实现但简化了列表标记的保存逻辑
 */

// 列表缩进大小（4个空格 = 1级缩进）
const LIST_INDENT_SIZE = 4;

// 计算缩进级别
function getIndent(whitespaces: string): number {
  const tabs = whitespaces.match(/\t/g);
  const spaces = whitespaces.match(/ /g);
  let indent = 0;
  if (tabs) indent += tabs.length;
  if (spaces) indent += Math.floor(spaces.length / LIST_INDENT_SIZE);
  return indent;
}

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

// 列表替换函数（简化版，不使用 listMarkerState）
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

/**
 * Table Transformer
 * 支持 Markdown 表格格式
 * 格式示例：
 * | Header 1 | Header 2 |
 * | -------- | -------- |
 * | Cell 1   | Cell 2   |
 */

const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-+:? ?)+\|\s?$/;

// 表格单元格专用 transformers（不包含列表和代码块，避免递归冲突）
const TABLE_CELL_TRANSFORMERS: Transformer[] = [
  HEADING,
  QUOTE,
  HORIZONTAL_RULE,
  IMAGE,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
  UNDERLINE,
];

function getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

function $createTableCell(textContent: string): TableCellNode {
  const cleanedText = textContent.replace(/\\n/g, '\n');
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  // 使用不包含列表的 transformers，避免状态键冲突
  $convertFromMarkdownString(cleanedText, TABLE_CELL_TRANSFORMERS, cell);
  return cell;
}

function mapToTableCells(textContent: string): Array<TableCellNode> | null {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].split('|').map((text) => $createTableCell(text.trim()));
}

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];

    for (const row of node.getChildren()) {
      const rowOutput = [];
      if (!$isTableRowNode(row)) {
        continue;
      }

      let isHeaderRow = false;
      for (const cell of row.getChildren()) {
        if ($isTableCellNode(cell)) {
          const cellContent = $convertToMarkdownString(TABLE_CELL_TRANSFORMERS, cell)
            .replace(/\n/g, '\\n')
            .trim();
          rowOutput.push(cellContent || ' ');
          if (cell.__headerState === TableCellHeaderStates.ROW) {
            isHeaderRow = true;
          }
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`);
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(() => '---').join(' | ')} |`);
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _children, match) => {
    const matchText = match[0];
    if (!matchText) {
      return;
    }
    
    // 检查是否是表头分隔行
    if (TABLE_ROW_DIVIDER_REG_EXP.test(matchText)) {
      const table = parentNode.getPreviousSibling();
      if (!table || !$isTableNode(table)) {
        return;
      }

      const rows = table.getChildren();
      const lastRow = rows[rows.length - 1];
      if (!lastRow || !$isTableRowNode(lastRow)) {
        return;
      }

      // 将上一行的单元格标记为表头
      lastRow.getChildren().forEach((cell) => {
        if (!$isTableCellNode(cell)) {
          return;
        }
        cell.setHeaderStyles(
          TableCellHeaderStates.ROW,
          TableCellHeaderStates.ROW,
        );
      });

      // 移除分隔行
      parentNode.remove();
      return;
    }

    const matchCells = mapToTableCells(matchText);

    if (matchCells == null) {
      return;
    }

    const rows = [matchCells];
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

    // 向上查找连续的表格行
    while (sibling) {
      if (!$isParagraphNode(sibling)) {
        break;
      }

      if (sibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = sibling.getFirstChild();

      if (!$isTextNode(firstChild)) {
        break;
      }

      const cells = mapToTableCells(firstChild.getTextContent());

      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    const table = $createTableNode();

    for (const cells of rows) {
      const tableRow = $createTableRowNode();
      table.append(tableRow);

      for (let i = 0; i < maxCells; i++) {
        const cell = i < cells.length ? cells[i] : undefined;
        tableRow.append(cell || $createTableCell(''));
      }
    }

    const previousSibling = parentNode.getPreviousSibling();
    if (
      $isTableNode(previousSibling) &&
      getTableColumnsSize(previousSibling) === maxCells
    ) {
      previousSibling.append(...table.getChildren());
      parentNode.remove();
    } else {
      parentNode.replace(table);
    }

    table.selectEnd();
  },
  type: 'element',
};

/**
 * 自定义 Transformers 集合
 * 使用完全自定义的列表 transformers，避免 listMarkerState 状态键冲突
 * 
 * 关键改动：
 * 1. 自定义列表 transformers（不使用 listMarkerState）
 * 2. 不使用官方的 ELEMENT_TRANSFORMERS（包含官方列表 transformers）
 * 3. 手动添加 HEADING, QUOTE, CODE
 * 4. 表格单元格使用独立的 transformers 集合
 */
export const CUSTOM_TRANSFORMERS: Transformer[] = [
  TABLE,                          // 自定义表格
  HORIZONTAL_RULE,                // 自定义分隔线
  IMAGE,                          // 自定义图片（支持尺寸）
  HEADING,                        // 标题
  QUOTE,                          // 引用
  CODE,                           // 代码块
  CUSTOM_CHECK_LIST,              // 自定义任务列表（优先）
  CUSTOM_ORDERED_LIST,            // 自定义有序列表
  CUSTOM_UNORDERED_LIST,          // 自定义无序列表
  ...TEXT_FORMAT_TRANSFORMERS,    // 粗体、斜体、删除线等
  ...TEXT_MATCH_TRANSFORMERS,     // 链接等
  UNDERLINE,                      // 自定义下划线（++text++）
];



