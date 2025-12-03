/**
 * TableActionMenuPlugin - 表格操作菜单插件（Vue 版本）
 * 基于 Lexical Playground 实现
 */

import {
  $deleteTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumn__EXPERIMENTAL,
  $insertTableRow__EXPERIMENTAL,
  $isTableCellNode,
  $isTableSelection,
  TableCellNode,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  SELECTION_CHANGE_COMMAND,
  type LexicalEditor,
} from 'lexical';

export interface TableActionMenuState {
  show: boolean;
  x: number;
  y: number;
  tableCellNode: TableCellNode | null;
}

export interface TableActionMenuOptions {
  container?: HTMLElement;
  onStateChange?: (state: TableActionMenuState) => void;
}

export function useTableActionMenuPlugin(
  editor: LexicalEditor,
  options: TableActionMenuOptions = {},
): () => void {
  const { onStateChange } = options;
  
  let currentTableCellNode: TableCellNode | null = null;
  let menuElement: HTMLDivElement | null = null;
  let scrollCleanup: (() => void) | null = null;

  const updateMenuPosition = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!selection) {
        hideMenu();
        return;
      }

      let tableCellNode: TableCellNode | null = null;

      if ($isRangeSelection(selection)) {
        tableCellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
      } else if ($isTableSelection(selection)) {
        const anchorNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
        if ($isTableCellNode(anchorNode)) {
          tableCellNode = anchorNode;
        }
      }

      if (!tableCellNode) {
        hideMenu();
        return;
      }

      currentTableCellNode = tableCellNode;
      
      const tableCellDOM = editor.getElementByKey(tableCellNode.getKey());
      if (!tableCellDOM) {
        hideMenu();
        return;
      }

      const rect = tableCellDOM.getBoundingClientRect();
      
      // 使用绝对定位（相对于 viewport）
      const x = rect.right - 30; // 距离右边 30px（按钮宽度 + 一点边距）
      const y = rect.top + window.scrollY + 5; // 加上滚动偏移量

      if (onStateChange) {
        onStateChange({
          show: true,
          x,
          y,
          tableCellNode,
        });
      }

      // 设置滚动监听
      setupScrollListener();
    });
  };

  const setupScrollListener = () => {
    // 清除之前的监听器
    if (scrollCleanup) {
      scrollCleanup();
    }

    // 监听滚动事件，实时更新位置
    const handleScroll = () => {
      if (currentTableCellNode) {
        const tableCellDOM = editor.getElementByKey(currentTableCellNode.getKey());
        if (tableCellDOM) {
          const rect = tableCellDOM.getBoundingClientRect();
          const x = rect.right - 30;
          const y = rect.top + window.scrollY + 5;

          if (onStateChange) {
            onStateChange({
              show: true,
              x,
              y,
              tableCellNode: currentTableCellNode,
            });
          }
        }
      }
    };

    // 监听窗口滚动和编辑器容器滚动
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const editorElement = editor.getRootElement();
    const scrollableParent = editorElement?.closest('.editor-scroller');
    if (scrollableParent) {
      scrollableParent.addEventListener('scroll', handleScroll, { passive: true });
    }

    scrollCleanup = () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollableParent) {
        scrollableParent.removeEventListener('scroll', handleScroll);
      }
      scrollCleanup = null;
    };
  };

  const hideMenu = () => {
    currentTableCellNode = null;
    
    // 清除滚动监听
    if (scrollCleanup) {
      scrollCleanup();
    }
    
    if (onStateChange) {
      onStateChange({
        show: false,
        x: 0,
        y: 0,
        tableCellNode: null,
      });
    }
  };

  const cleanup = mergeRegister(
    editor.registerUpdateListener(() => {
      updateMenuPosition();
    }),
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateMenuPosition();
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    ),
  );

  return () => {
    cleanup();
    hideMenu();
  };
}

// 表格操作函数
export const tableActions = {
  insertRowAbove: (editor: LexicalEditor) => {
    editor.update(() => {
      $insertTableRow__EXPERIMENTAL(false);
    });
  },

  insertRowBelow: (editor: LexicalEditor) => {
    editor.update(() => {
      $insertTableRow__EXPERIMENTAL(true);
    });
  },

  insertColumnLeft: (editor: LexicalEditor) => {
    editor.update(() => {
      $insertTableColumn__EXPERIMENTAL(false);
    });
  },

  insertColumnRight: (editor: LexicalEditor) => {
    editor.update(() => {
      $insertTableColumn__EXPERIMENTAL(true);
    });
  },

  deleteRow: (editor: LexicalEditor) => {
    editor.update(() => {
      $deleteTableRow__EXPERIMENTAL();
    });
  },

  deleteColumn: (editor: LexicalEditor) => {
    editor.update(() => {
      $deleteTableColumn__EXPERIMENTAL();
    });
  },

  deleteTable: (editor: LexicalEditor, tableCellNode: TableCellNode) => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      tableNode.remove();
    });
  },
};

