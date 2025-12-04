/**
 * TablePlugin - 表格插件（使用官方实现）
 */

import {
  INSERT_TABLE_COMMAND,
  TableNode,
  TableCellNode,
  TableRowNode,
  registerTablePlugin,
  registerTableSelectionObserver,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import type { LexicalEditor } from 'lexical';

export type InsertTableCommandPayload = Readonly<{
  columns: string;
  rows: string;
  includeHeaders?: boolean;
}>;

export interface TablePluginOptions {
  /**
   * 当为 false 时（默认为 true），将禁用合并单元格支持（colspan 和 rowspan）
   */
  hasCellMerge?: boolean;
  /**
   * 当为 false 时（默认为 true），将始终移除 TableCellNode 的背景颜色
   */
  hasCellBackgroundColor?: boolean;
  /**
   * 当为 true 时（默认为 true），可以使用 Tab 键导航表格单元格
   */
  hasTabHandler?: boolean;
  /**
   * 当为 true 时（默认为 false），表格将被包裹在 <div> 中以启用水平滚动
   */
  hasHorizontalScroll?: boolean;
  /**
   * 当为 true 时（默认为 false），将允许嵌套表格
   */
  hasNestedTables?: boolean;
}

/**
 * 使用官方的表格插件，提供完整的表格功能，包括：
 * - 键盘导航
 * - 表格完整性转换
 * - Tab 键导航
 * - 单元格合并（可选）
 * - 背景颜色（可选）
 */
export function useTablePlugin(
  editor: LexicalEditor,
  options: TablePluginOptions = {},
) {
  const {
    hasCellMerge = true,
    hasCellBackgroundColor = true,
    hasTabHandler = true,
    hasHorizontalScroll = false,
    hasNestedTables = false,
  } = options;

  // 检查节点是否已注册
  if (!editor.hasNodes([TableNode, TableRowNode, TableCellNode])) {
    throw new Error(
      'TablePlugin: TableNode, TableRowNode, or TableCellNode is not registered on editor',
    );
  }

  return mergeRegister(
    // 注册表格核心功能（包括 INSERT_TABLE_COMMAND 和表格完整性转换）
    registerTablePlugin(editor, { 
      // hasNestedTables 需要是一个 Signal，但我们这里简化处理
      // @ts-ignore
      hasNestedTables: { peek: () => hasNestedTables, value: hasNestedTables } 
    }),
    // 注册表格选择观察器（包括键盘导航和 Tab 处理）
    // 这个已经包含了表格边缘的箭头键处理，会在用户尝试导航出表格时动态插入段落节点
    registerTableSelectionObserver(editor, hasTabHandler),
    // 处理单元格合并
    !hasCellMerge
      ? editor.registerNodeTransform(TableCellNode, (node) => {
          if (node.getColSpan() > 1 || node.getRowSpan() > 1) {
            node.setColSpan(1);
            node.setRowSpan(1);
          }
        })
      : () => {},
    // 处理背景颜色
    !hasCellBackgroundColor
      ? editor.registerNodeTransform(TableCellNode, (node) => {
          if (node.getBackgroundColor() !== null) {
            node.setBackgroundColor(null);
          }
        })
      : () => {},
  );
}

export { INSERT_TABLE_COMMAND, TableNode, TableCellNode, TableRowNode };
