/**
 * ListPlugin - 列表插件（Vue 版本）
 * 参考 @lexical/react/LexicalListPlugin 和 @lexical/react/LexicalTabIndentationPlugin
 * 完全按照官方实现，只调用 registerList 和 registerTabIndentation
 */

import type {LexicalEditor} from 'lexical';
import {registerList, registerListStrictIndentTransform, ListNode, ListItemNode, $isListItemNode} from '@lexical/list';
import {registerTabIndentation} from '@lexical/extension';
import {COMMAND_PRIORITY_LOW, KEY_TAB_COMMAND, $getSelection, $isRangeSelection} from 'lexical';

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
  /**
   * When `false`, disables tab key indentation for lists (including checklists)
   * When `true` (default), tab key indentation is enabled
   */
  enableTabIndentation?: boolean;
}

export function useListPlugin(
  editor: LexicalEditor,
  options: ListPluginOptions = {},
): () => void {
  const {hasStrictIndent = false, maxIndent, enableTabIndentation = true} = options;

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

  // 注册 Tab 键缩进功能（如果启用）
  let unregisterTabIndent: (() => void) | undefined;
  if (enableTabIndentation) {
    unregisterTabIndent = registerTabIndentation(editor, maxIndent);
  } else {
    // 如果禁用了 Tab 键缩进，注册一个命令来阻止默认的 Tab 键行为
    // 防止在列表中按 Tab 键导致编辑器失焦
    unregisterTabIndent = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event: KeyboardEvent) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        // 获取当前节点并向上查找 ListItemNode
        let node = selection.anchor.getNode();
        while (node) {
          if ($isListItemNode(node)) {
            // 如果当前在列表项中，阻止 Tab 键的默认行为
            event.preventDefault();
            return true;
          }
          node = node.getParent();
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }

  // 返回清理函数
  return () => {
    unregisterList();
    unregisterStrictIndent?.();
    unregisterTabIndent?.();
  };
}
