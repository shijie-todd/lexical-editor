/**
 * TableHoverActionsPlugin - 表格悬浮操作插件
 * 在表格的最后一行/列显示添加按钮（已禁用）
 */

import type { LexicalEditor } from 'lexical';

export function useTableHoverActionsPlugin(
  _editor: LexicalEditor,
  _anchorElem: HTMLElement,
) {
  // 禁用表格添加行/列按钮功能
  return () => {
    // 空的清理函数
  };
}

