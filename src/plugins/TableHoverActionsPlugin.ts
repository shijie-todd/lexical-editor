/**
 * TableHoverActionsPlugin - 表格悬浮操作插件
 * 在表格的最后一行/列显示添加按钮
 */

import {
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $insertTableRowAtSelection,
  $insertTableColumnAtSelection,
  $isTableCellNode,
  $isTableNode,
  getTableElement,
  TableNode,
  type TableCellNode,
  type TableRowNode,
} from '@lexical/table';
import { $findMatchingParent } from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  type LexicalEditor,
} from 'lexical';

const BUTTON_WIDTH_PX = 20;

interface TableHoverActionsState {
  isShownRow: boolean;
  isShownColumn: boolean;
  position: {
    height?: number;
    width?: number;
    left?: number;
    top?: number;
  };
}

function getMouseInfo(
  event: MouseEvent,
  editorElement: HTMLElement,
): {
  tableCellElement: HTMLElement | null;
  isOutside: boolean;
} {
  const target = event.target as HTMLElement;

  if (!target) {
    return { isOutside: true, tableCellElement: null };
  }

  const tableCellElement = target.closest<HTMLElement>('td, th');

  const isOutside = !(
    tableCellElement ||
    target.closest('.table-add-rows') ||
    target.closest('.table-add-columns')
  );

  return { isOutside, tableCellElement };
}

export function useTableHoverActionsPlugin(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
) {
  let rowButtonElement: HTMLButtonElement | null = null;
  let columnButtonElement: HTMLButtonElement | null = null;
  let tableCellDOMNodeRef: HTMLElement | null = null;
  let mouseMoveListen= false;
  let currentState: TableHoverActionsState = {
    isShownRow: false,
    isShownColumn: false,
    position: {},
  };

  // 创建按钮元素
  const createButtons = () => {
    // 创建行按钮
    rowButtonElement = document.createElement('button');
    rowButtonElement.className = 'table-add-rows';
    rowButtonElement.innerHTML = '+';
    rowButtonElement.title = '添加行';
    rowButtonElement.style.display = 'none'; // 初始隐藏
    rowButtonElement.onclick = () => insertAction(true);
    
    // 创建列按钮
    columnButtonElement = document.createElement('button');
    columnButtonElement.className = 'table-add-columns';
    columnButtonElement.innerHTML = '+';
    columnButtonElement.title = '添加列';
    columnButtonElement.style.display = 'none'; // 初始隐藏
    columnButtonElement.onclick = () => insertAction(false);

    anchorElem.appendChild(rowButtonElement);
    anchorElem.appendChild(columnButtonElement);
  };

  const insertAction = (insertRow: boolean) => {
    editor.update(() => {
      if (tableCellDOMNodeRef) {
        const maybeTableNode = $getNearestNodeFromDOMNode(tableCellDOMNodeRef);
        maybeTableNode?.selectEnd();
        if (insertRow) {
          $insertTableRowAtSelection();
          hideButtons();
        } else {
          $insertTableColumnAtSelection();
          hideButtons();
        }
      }
    });
  };

  const updatePosition = (state: TableHoverActionsState) => {
    if (state.isShownRow && rowButtonElement) {
      rowButtonElement.style.display = 'flex';
      rowButtonElement.style.height = `${state.position.height || BUTTON_WIDTH_PX}px`;
      rowButtonElement.style.width = `${state.position.width || 0}px`;
      rowButtonElement.style.left = `${state.position.left || 0}px`;
      rowButtonElement.style.top = `${state.position.top || 0}px`;
    } else if (rowButtonElement) {
      rowButtonElement.style.display = 'none';
    }

    if (state.isShownColumn && columnButtonElement) {
      columnButtonElement.style.display = 'flex';
      columnButtonElement.style.height = `${state.position.height || 0}px`;
      columnButtonElement.style.width = `${state.position.width || BUTTON_WIDTH_PX}px`;
      columnButtonElement.style.left = `${state.position.left || 0}px`;
      columnButtonElement.style.top = `${state.position.top || 0}px`;
    } else if (columnButtonElement) {
      columnButtonElement.style.display = 'none';
    }

    currentState = state;
  };

  const hideButtons = () => {
    updatePosition({
      isShownRow: false,
      isShownColumn: false,
      position: {},
    });
  };

  // 防抖处理
  let timeoutId: number | null = null;
  const debouncedOnMouseMove = (event: MouseEvent) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      handleMouseMove(event);
    }, 50);
  };

  const handleMouseMove = (event: MouseEvent) => {
    const { isOutside, tableCellElement } = getMouseInfo(event, anchorElem);

    if (isOutside) {
      hideButtons();
      return;
    }

    if (!tableCellElement) {
      return;
    }

    tableCellDOMNodeRef = tableCellElement;

    let hoveredRowNode: TableCellNode | null = null;
    let hoveredColumnNode: TableCellNode | null = null;
    let tableDOMElement: HTMLElement | null = null;

    editor.getEditorState().read(() => {
      const maybeTableCell = $getNearestNodeFromDOMNode(tableCellElement);

      if ($isTableCellNode(maybeTableCell)) {
        const table = $findMatchingParent(maybeTableCell, (node) =>
          $isTableNode(node),
        );
        if (!$isTableNode(table)) {
          return;
        }

        tableDOMElement = getTableElement(
          table,
          editor.getElementByKey(table.getKey()),
        );

        if (tableDOMElement) {
          const rowCount = table.getChildrenSize();
          const colCount = (
            table.getChildAtIndex(0) as TableRowNode
          )?.getChildrenSize();

          const rowIndex = $getTableRowIndexFromTableCellNode(maybeTableCell);
          const colIndex = $getTableColumnIndexFromTableCellNode(maybeTableCell);

          if (rowIndex === rowCount - 1) {
            hoveredRowNode = maybeTableCell;
          } else if (colIndex === colCount - 1) {
            hoveredColumnNode = maybeTableCell;
          }
        }
      }
    });

    if (tableDOMElement) {
      const {
        width: tableElemWidth,
        y: tableElemY,
        right: tableElemRight,
        left: tableElemLeft,
        bottom: tableElemBottom,
        height: tableElemHeight,
      } = (tableDOMElement as HTMLTableElement).getBoundingClientRect();

      const { y: editorElemY, left: editorElemLeft } =
        anchorElem.getBoundingClientRect();

      if (hoveredRowNode) {
        updatePosition({
          isShownRow: true,
          isShownColumn: false,
          position: {
            height: BUTTON_WIDTH_PX,
            left: tableElemLeft - editorElemLeft,
            top: tableElemBottom - editorElemY + 5,
            width: tableElemWidth,
          },
        });
      } else if (hoveredColumnNode) {
        updatePosition({
          isShownRow: false,
          isShownColumn: true,
          position: {
            height: tableElemHeight,
            left: tableElemRight - editorElemLeft + 5,
            top: tableElemY - editorElemY,
            width: BUTTON_WIDTH_PX,
          },
        });
      }
    }
  };

  const startListening = () => {
    if (!mouseMoveListen) {
      document.addEventListener('mousemove', debouncedOnMouseMove);
      mouseMoveListen = true;
    }
  };

  const stopListening = () => {
    if (mouseMoveListen) {
      document.removeEventListener('mousemove', debouncedOnMouseMove);
      mouseMoveListen = false;
      hideButtons();
    }
  };

  // 初始化
  createButtons();

  // 监听表格节点的变化
  const unregisterMutationListener = editor.registerMutationListener(
    TableNode,
    (mutations) => {
      const hasTable = mutations.size > 0;
      if (hasTable) {
        startListening();
      } else {
        stopListening();
      }
    },
    { skipInitialization: false },
  );

  // 检查是否已有表格
  editor.getEditorState().read(() => {
    const root = editor.getEditorState()._nodeMap;
    let hasTable = false;
    root.forEach((node) => {
      if (node.__type === 'table') {
        hasTable = true;
      }
    });
    if (hasTable) {
      startListening();
    }
  });

  // 返回清理函数
  return () => {
    unregisterMutationListener();
    stopListening();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (rowButtonElement && rowButtonElement.parentNode) {
      rowButtonElement.parentNode.removeChild(rowButtonElement);
    }
    if (columnButtonElement && columnButtonElement.parentNode) {
      columnButtonElement.parentNode.removeChild(columnButtonElement);
    }
  };
}

