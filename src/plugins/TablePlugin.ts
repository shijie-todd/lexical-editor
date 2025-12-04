/**
 * TablePlugin - 表格插件（基于 Lexical Playground 实现）
 */

import {
  INSERT_TABLE_COMMAND,
  TableNode,
  TableCellNode,
  TableRowNode,
  $createTableNodeWithDimensions,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import type { LexicalEditor } from 'lexical';
import { $insertNodes, $getSelection, $isRangeSelection, $isTextNode } from 'lexical';

export type InsertTableCommandPayload = Readonly<{
  columns: string;
  rows: string;
  includeHeaders?: boolean;
}>;

export function useTablePlugin(editor: LexicalEditor) {
  // 检查节点是否已注册
  if (!editor.hasNodes([TableNode, TableRowNode, TableCellNode])) {
    throw new Error(
      'TablePlugin: TableNode, TableRowNode, or TableCellNode is not registered on editor',
    );
  }

  return mergeRegister(
    editor.registerCommand(
      INSERT_TABLE_COMMAND,
      (payload: InsertTableCommandPayload) => {
        const { rows, columns, includeHeaders } = payload;
        const rowCount = parseInt(rows, 10);
        const colCount = parseInt(columns, 10);
        
        if (isNaN(rowCount) || isNaN(colCount) || rowCount < 1 || colCount < 1) {
          return false;
        }
        
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }
          
          // 获取当前节点和父节点
          const anchorNode = selection.anchor.getNode();
          const parent = anchorNode.getParent();
          
          // 创建表格，includeHeaders 参数控制是否包含表头行
          const tableNode = $createTableNodeWithDimensions(
            rowCount,
            colCount,
            includeHeaders === true, // 默认不包含表头
          );
          
          // 如果当前段落只包含 / 字符或为空（来自 slash command），则替换整个段落
          if (parent && $isTextNode(anchorNode)) {
            const textContent = anchorNode.getTextContent().trim();
            if (textContent === '/' || textContent === '') {
              parent.replace(tableNode);
              tableNode.selectStart();
              return;
            }
          }
          
          // 否则，在当前位置插入
          $insertNodes([tableNode]);
        });
        
        return true;
      },
      1, // COMMAND_PRIORITY_NORMAL
    ),
  );
}

export { INSERT_TABLE_COMMAND, TableNode, TableCellNode, TableRowNode };
