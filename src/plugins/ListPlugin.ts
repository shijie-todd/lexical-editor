/**
 * ListPlugin - 列表插件（Vue 版本）
 * 参考 @lexical/react/LexicalListPlugin 和 @lexical/react/LexicalTabIndentationPlugin
 * 完全按照官方实现，只调用 registerList 和 registerTabIndentation
 */

import type {LexicalEditor} from 'lexical';
import {registerList, registerListStrictIndentTransform, ListNode, ListItemNode} from '@lexical/list';
import {registerTabIndentation} from '@lexical/extension';

export interface ListPluginOptions {
  /**
   * When `true`, enforces strict indentation rules for list items, ensuring consistent structure.
   * When `false` (default), indentation is more flexible.
   */
  hasStrictIndent?: boolean;
  /**
   * Maximum indentation level for tab indentation
   */
  maxIndent?: number;
}

export function useListPlugin(
  editor: LexicalEditor,
  options: ListPluginOptions = {},
): () => void {
  const {hasStrictIndent = false, maxIndent} = options;

  // 验证节点已注册
  if (!editor.hasNodes([ListNode, ListItemNode])) {
    throw new Error(
      'ListPlugin: ListNode and/or ListItemNode not registered on editor',
    );
  }

  // 注册列表功能（这是核心，处理所有列表相关的命令和逻辑）
  const unregisterList = registerList(editor);

  // 注册严格缩进转换（如果需要）
  let unregisterStrictIndent: (() => void) | undefined;
  if (hasStrictIndent) {
    unregisterStrictIndent = registerListStrictIndentTransform(editor);
  }

  // 注册 Tab 键缩进功能
  const unregisterTabIndent = registerTabIndentation(editor, maxIndent);

  // 返回清理函数
  return () => {
    unregisterList();
    unregisterStrictIndent?.();
    unregisterTabIndent();
  };
}
