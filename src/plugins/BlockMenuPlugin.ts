/**
 * BlockMenuPlugin - 块菜单插件（Vue 版本）
 * 在每个 block 前显示加号按钮
 */

import {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  type LexicalEditor,
} from 'lexical';
import {mergeRegister} from '@lexical/utils';

const BLOCK_MENU_CLASSNAME = 'block-menu';

interface BlockMenu {
  element: HTMLElement;
  menuElement: HTMLDivElement;
  nodeKey: string | null;
}

export function useBlockMenuPlugin(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
) {
  const blockMenus = new Map<HTMLElement, BlockMenu>();

  // 创建菜单元素
  const createMenuElement = (blockElement: HTMLElement): BlockMenu => {
    const menuElement = document.createElement('div');
    menuElement.className = BLOCK_MENU_CLASSNAME;

    // 加号按钮
    const plusButton = document.createElement('button');
    plusButton.className = 'block-menu-plus';
    plusButton.innerHTML = '+';
    plusButton.title = '插入新块';
    plusButton.onclick = (e) => {
      e.stopPropagation();
      showComponentPicker(blockElement, e);
    };

    menuElement.appendChild(plusButton);

    return {
      element: blockElement,
      menuElement,
      nodeKey: null,
    };
  };

  // 显示组件选择器（slash command）
  const showComponentPicker = (blockElement: HTMLElement, event: MouseEvent) => {
    event.stopPropagation();
    // 获取节点
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(blockElement);
      if (!node) return;

      // 在节点后插入新段落并聚焦
      const newParagraph = $createParagraphNode();
      const textNode = $createTextNode('');
      newParagraph.append(textNode);
      node.insertAfter(newParagraph);
      
      // 立即选择新段落（在同一个 update 中完成）
      newParagraph.selectStart();
    });
    
    // 使用 setTimeout 确保 DOM 更新后编辑器获得焦点
    setTimeout(() => {
      editor.focus();
    }, 0);
  };

  // 更新菜单位置
  const updateMenuPositions = () => {
    blockMenus.forEach((menu) => {
      // 检查元素是否还在 DOM 中
      if (!menu.element.isConnected) {
        // 元素已被移除，清理菜单
        if (menu.menuElement.parentNode) {
          menu.menuElement.parentNode.removeChild(menu.menuElement);
        }
        blockMenus.delete(menu.element);
        return;
      }

      const rect = menu.element.getBoundingClientRect();
      const anchorRect = anchorElem.getBoundingClientRect();
      // 菜单位置相对于编辑器容器，确保在容器内
      // left 已在 CSS 中设置，只需要更新 top
      menu.menuElement.style.top = `${rect.top - anchorRect.top}px`;
    });
  };

  // 显示/隐藏菜单
  const showMenu = (blockElement: HTMLElement) => {
    const menu = blockMenus.get(blockElement);
    if (menu && blockElement.isConnected) {
      menu.menuElement.classList.add('block-menu-visible');
    }
  };

  const hideMenu = (blockElement: HTMLElement) => {
    const menu = blockMenus.get(blockElement);
    if (menu && blockElement.isConnected) {
      menu.menuElement.classList.remove('block-menu-visible');
    }
  };

  // 清理已删除的 block 菜单
  const cleanupRemovedMenus = () => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    // 只选择顶级 block，不包括列表项（li）和嵌套列表
    const allBlocks = editorElement.querySelectorAll(
      'p, h1, h2, h3, ul, ol, blockquote, hr, code',
    );
    const topLevelBlocks = Array.from(allBlocks).filter((block) => {
      // 如果 block 是 li，跳过（列表项不应该有 controller）
      if (block.tagName.toLowerCase() === 'li') {
        return false;
      }
      // 如果 block 是 ul 或 ol，检查它是否是顶级列表（不是其他列表的子元素）
      if (block.tagName.toLowerCase() === 'ul' || block.tagName.toLowerCase() === 'ol') {
        // 检查是否有父级列表
        const parent = block.parentElement;
        if (parent && (parent.tagName.toLowerCase() === 'ul' || parent.tagName.toLowerCase() === 'ol' || parent.tagName.toLowerCase() === 'li')) {
          return false; // 这是嵌套列表，不是顶级列表
        }
      }
      return true;
    });
    
    const currentBlocks = new Set(
      topLevelBlocks.map((block) => block as HTMLElement),
    );

    // 找出已删除的 block 并清理其菜单
    const blocksToRemove: HTMLElement[] = [];
    blockMenus.forEach((menu, blockElement) => {
      if (!currentBlocks.has(blockElement)) {
        // Block 已被删除，清理菜单
        if (menu.menuElement.parentNode) {
          menu.menuElement.parentNode.removeChild(menu.menuElement);
        }
        blocksToRemove.push(blockElement);
      }
    });

    // 从 Map 中移除已删除的 block
    blocksToRemove.forEach((blockElement) => {
      blockMenus.delete(blockElement);
    });
  };

  // 初始化菜单
  const initializeMenus = () => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    // 先清理已删除的 block 菜单
    cleanupRemovedMenus();

    // 只选择顶级 block，不包括列表项（li）
    // 列表（ul/ol）作为一个整体 block，列表项（li）不应该有独立的 controller
    const blocks = editorElement.querySelectorAll(
      'p, h1, h2, h3, ul, ol, blockquote, hr, code',
    );
    
    // 过滤掉列表项（li），只保留顶级 block
    const topLevelBlocks = Array.from(blocks).filter((block) => {
      // 如果 block 是 li，跳过（列表项不应该有 controller）
      if (block.tagName.toLowerCase() === 'li') {
        return false;
      }
      // 如果 block 是 ul 或 ol，检查它是否是顶级列表（不是其他列表的子元素）
      if (block.tagName.toLowerCase() === 'ul' || block.tagName.toLowerCase() === 'ol') {
        // 检查是否有父级列表
        const parent = block.parentElement;
        if (parent && (parent.tagName.toLowerCase() === 'ul' || parent.tagName.toLowerCase() === 'ol' || parent.tagName.toLowerCase() === 'li')) {
          return false; // 这是嵌套列表，不是顶级列表
        }
      }
      return true;
    });

    // 为新 block 创建菜单
    topLevelBlocks.forEach((block) => {
      const blockElement = block as HTMLElement;
      if (!blockMenus.has(blockElement)) {
        const menu = createMenuElement(blockElement);
        blockMenus.set(blockElement, menu);
        anchorElem.appendChild(menu.menuElement);

        blockElement.onmouseenter = () => showMenu(blockElement);
        blockElement.onmouseleave = () => hideMenu(blockElement);
        menu.menuElement.onmouseenter = () => showMenu(blockElement);
        menu.menuElement.onmouseleave = () => hideMenu(blockElement);
      }
    });

    // 更新所有菜单的位置
    updateMenuPositions();
  };

  // 使用 requestAnimationFrame 优化性能，避免频繁更新
  let rafId: number | null = null;
  const scheduleUpdate = () => {
    if (rafId !== null) {
      return; // 已经安排了更新，避免重复
    }
    rafId = requestAnimationFrame(() => {
      initializeMenus();
      rafId = null;
    });
  };

  return mergeRegister(
    editor.registerUpdateListener(() => {
      scheduleUpdate();
    }),
    editor.registerCommand(
      'SELECTION_CHANGE_COMMAND' as any,
      () => {
        scheduleUpdate();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    // 监听 DOM 变化，确保菜单同步
    () => {
      const observer = new MutationObserver(() => {
        scheduleUpdate();
      });
      
      const editorElement = editor.getRootElement();
      if (editorElement) {
        observer.observe(editorElement, {
          childList: true,
          subtree: true,
        });
      }

      return () => {
        observer.disconnect();
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
      };
    },
  );
}

