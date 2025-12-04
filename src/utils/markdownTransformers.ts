/**
 * 自定义 Markdown Transformers
 * 用于支持 ImageNode、HorizontalRuleNode、Table 和下划线格式
 */

import type {ElementTransformer, TextFormatTransformer} from '@lexical/markdown';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  HEADING,
  ORDERED_LIST,
  QUOTE,
  UNORDERED_LIST,
  CHECK_LIST,
  CODE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  INLINE_CODE,
  STRIKETHROUGH,
  LINK,
} from '@lexical/markdown';
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
import {$createTextNode, $isParagraphNode, $isTextNode} from 'lexical';
import type {Transformer} from '@lexical/markdown';

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
 * 支持 `![alt text](url)` 格式
 * 扩展格式支持宽度、高度：
 * `![alt](url =widthxheight)`
 * 例如：`![示例图片](https://example.com/image.jpg =500x300)`
 */
export const IMAGE: ElementTransformer = {
  dependencies: [ImageNode],
  export: (node: LexicalNode, exportChildren) => {
    // 如果是图片节点，直接导出
    if ($isImageNode(node)) {
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
    }
    
    // 如果是段落节点，检查它的子节点
    if ($isParagraphNode(node)) {
      const children = node.getChildren();
      const childTypes = children.map(c => c.getType());
      
      // 如果段落只包含一个图片节点，导出图片
      if (children.length === 1 && $isImageNode(children[0])) {
        const imageNode = children[0];
        const altText = imageNode.getAltText() || '';
        const src = imageNode.getSrc();
        const width = imageNode.__width;
        const height = imageNode.__height;
        
        let markdown = `![${altText}](${src}`;
        
        const hasDimensions = width !== 'inherit' && height !== 'inherit';
        
        if (hasDimensions) {
          markdown += ` =${width}x${height}`;
        }
        
        markdown += ')';
        return markdown;
      }
      
      // 如果段落包含图片和其他内容，将图片和文本分开导出
      if (childTypes.includes('image')) {
        const parts: string[] = [];
        let currentText = '';
        
        for (const child of children) {
          if ($isImageNode(child)) {
            // 如果之前有文本，先保存
            if (currentText) {
              parts.push(currentText);
              currentText = '';
            }
            
            // 导出图片
            const altText = child.getAltText() || '';
            const src = child.getSrc();
            const width = child.__width;
            const height = child.__height;
            
            let markdown = `![${altText}](${src}`;
            const hasDimensions = width !== 'inherit' && height !== 'inherit';
            
            if (hasDimensions) {
              markdown += ` =${width}x${height}`;
            }
            markdown += ')';
            parts.push(markdown);
          } else if ($isTextNode(child)) {
            // 累积文本（带格式）
            const text = child.getTextContent();
            let formattedText = text;
            
            if (child.hasFormat('bold')) {
              formattedText = `**${formattedText}**`;
            }
            if (child.hasFormat('italic')) {
              formattedText = `*${formattedText}*`;
            }
            if (child.hasFormat('code')) {
              formattedText = `\`${formattedText}\``;
            }
            if (child.hasFormat('strikethrough')) {
              formattedText = `~~${formattedText}~~`;
            }
            if (child.hasFormat('underline')) {
              formattedText = `++${formattedText}++`;
            }
            
            currentText += formattedText;
          } else {
            // 其他类型节点
            currentText += child.getTextContent();
          }
        }
        
        // 保存最后的文本
        if (currentText) {
          parts.push(currentText);
        }
        
        // 用换行连接所有部分
        return parts.join('\n\n');
      }
    }
    
    return null;
  },
  regExp: /^!\[([^\]]*)\]\(([^\s)]+)(?:\s*=(\d+)x(\d+))?\)$/,
  replace: (
    parentNode: ElementNode,
    _children: Array<LexicalNode>,
    match: Array<string>,
    isImport: boolean,
  ) => {
    const altText = match[1] || '';
    const src = match[2] || '';
    const width = match[3] ? parseInt(match[3], 10) : undefined;
    const height = match[4] ? parseInt(match[4], 10) : undefined;
    
    if (src) {
      const imageNode = $createImageNode({
        altText,
        height,
        src,
        width,
      });
      
      parentNode.replace(imageNode);
      
      if (!isImport) {
        imageNode.selectNext();
      }
      return true;
    }
    return false;
  },
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

function getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

function $createTableCell(textContent: string, transformers: Transformer[]): TableCellNode {
  const cleanedText = textContent.replace(/\\n/g, '\n');
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  $convertFromMarkdownString(cleanedText, transformers, cell);
  return cell;
}

function mapToTableCells(textContent: string, transformers: Transformer[]): Array<TableCellNode> | null {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].split('|').map((text) => $createTableCell(text.trim(), transformers));
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
          const cellContent = $convertToMarkdownString(CUSTOM_TRANSFORMERS, cell)
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

    const matchCells = mapToTableCells(matchText, CUSTOM_TRANSFORMERS);

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

      const cells = mapToTableCells(firstChild.getTextContent(), CUSTOM_TRANSFORMERS);

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
        tableRow.append(cell || $createTableCell('', CUSTOM_TRANSFORMERS));
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
 * 包含所有需要的 transformers
 * 
 * 注意：
 * - 文本格式 transformer 的顺序很重要
 * - 行内代码应该放在最前面，因为它会阻止内部的转换
 * - 更长的标签应该在更短的标签之前（如 ** 或 __ 应该在 * 或 _ 之前）
 * - 表格必须放在前面，以便正确解析 Markdown 表格
 */
export const CUSTOM_TRANSFORMERS: Transformer[] = [
  // 块级元素 transformers
  TABLE,              // 表格（优先）
  HEADING,
  QUOTE,
  CODE,               // 代码块（```code```）
  ORDERED_LIST,
  UNORDERED_LIST,
  CHECK_LIST,
  HORIZONTAL_RULE,
  IMAGE,
  LINK,
  // 文本格式 transformers（按优先级排序）
  INLINE_CODE,        // `行内代码` - 优先，避免内部转换
  BOLD_STAR,          // **粗体**
  BOLD_UNDERSCORE,    // __粗体__
  ITALIC_STAR,        // *斜体*
  ITALIC_UNDERSCORE,  // _斜体_
  STRIKETHROUGH,      // ~~删除线~~
  UNDERLINE,          // ++下划线++（自定义）
];


