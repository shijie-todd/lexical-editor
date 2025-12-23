import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isCodeNode } from '@lexical/code';
import { mergeRegister } from '@lexical/utils';
import { getSelectedNode } from '../utils/getSelectedNode';
import { getDOMRangeRect } from '../utils/getDOMRangeRect';
import { setFloatingElemPosition } from '../utils/setFloatingElemPosition';
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import { $isListNode } from '@lexical/list';
import { $findMatchingParent } from '@lexical/utils';

// 导入 SVG 图标
import boldIcon from '../assets/bold.svg';
import italicIcon from '../assets/italic.svg';
import underlineIcon from '../assets/underline.svg';
import strikethroughIcon from '../assets/strikethrough.svg';
import codeIcon from '../assets/code.svg';
import linkIcon from '../assets/link.svg';

export function useFloatingTextFormatToolbarPlugin(
  editor: LexicalEditor,
  options: {
    setIsLinkEditMode: (isEditMode: boolean) => void;
  }
) {
  let toolbarElement: HTMLDivElement | null = null;
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrikethrough = false;
  let isCode = false;
  let isLink = false;
  let isMouseDown = false; // 跟踪鼠标是否按下（正在选择文本）

  const updateToolbar = () => {
    editor.getEditorState().read(() => {
      // 如果正在使用输入法，不显示工具栏
      if (editor.isComposing()) {
        hideToolbar();
        return;
      }

      // 如果鼠标正在按下（正在选择文本），不显示工具栏
      if (isMouseDown) {
        hideToolbar();
        return;
      }

      const selection = $getSelection();
      const nativeSelection = window.getSelection();
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        hideToolbar();
        return;
      }

      if (!$isRangeSelection(selection)) {
        hideToolbar();
        return;
      }

      const node = getSelectedNode(selection);

      // 检查是否在代码块中
      const codeNode = $findMatchingParent(node, $isCodeNode);
      if (codeNode) {
        // 在代码块中，不显示工具栏
        hideToolbar();
        return;
      }

      // 检查是否在支持的块类型中（文本、标题、列表、引用）
      const parent = node.getParent();
      const isInSupportedBlock =
        $isTextNode(node) ||
        $isHeadingNode(parent) ||
        $isQuoteNode(parent) ||
        $isListNode(parent?.getParent());

      // 更新文本格式状态
      isBold = selection.hasFormat('bold');
      isItalic = selection.hasFormat('italic');
      isUnderline = selection.hasFormat('underline');
      isStrikethrough = selection.hasFormat('strikethrough');
      isCode = selection.hasFormat('code');

      // 更新链接状态
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        isLink = true;
      } else {
        isLink = false;
      }

      // 只有选中了文本且在支持的块类型中才显示工具栏
      const textContent = selection.getTextContent().replace(/\n/g, '');
      if (
        !selection.isCollapsed() &&
        textContent !== '' &&
        isInSupportedBlock
      ) {
        updateToolbarPosition();
        renderToolbar();
      } else {
        hideToolbar();
      }
    });
  };

  const updateToolbarPosition = () => {
    if (!toolbarElement) return;

    const nativeSelection = window.getSelection();
    const rootElement = editor.getRootElement();

    if (nativeSelection && rootElement) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement);
      setFloatingElemPosition(rangeRect, toolbarElement, rootElement, isLink);
    }
  };

  const hideToolbar = () => {
    if (toolbarElement) {
      toolbarElement.style.opacity = '0';
      toolbarElement.style.transform = 'translate(-10000px, -10000px)';
    }
  };

  const insertLink = (event?: Event) => {
    event?.preventDefault();
    if (!isLink) {
      options.setIsLinkEditMode(true);
      // 先设置编辑模式，让 FloatingLinkEditorPlugin 准备好输入框
      // 然后再触发命令，避免编辑器抢夺焦点
      setTimeout(() => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
      }, 0);
    } else {
      options.setIsLinkEditMode(false);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  const renderToolbar = () => {
    if (!toolbarElement) return;

    toolbarElement.innerHTML = '';

    if (!editor.isEditable()) return;

    // 加粗按钮
    const boldButton = document.createElement('button');
    boldButton.type = 'button';
    boldButton.className = `toolbar-item ${isBold ? 'active' : ''}`;
    boldButton.title = '加粗';
    boldButton.innerHTML = `<img src="${boldIcon}" class="icon" alt="bold" />`;
    boldButton.onmousedown = (e) => e.preventDefault();
    boldButton.onclick = () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
    };
    toolbarElement.appendChild(boldButton);

    // 斜体按钮
    const italicButton = document.createElement('button');
    italicButton.type = 'button';
    italicButton.className = `toolbar-item ${isItalic ? 'active' : ''}`;
    italicButton.title = '斜体';
    italicButton.innerHTML = `<img src="${italicIcon}" class="icon" alt="italic" />`;
    italicButton.onmousedown = (e) => e.preventDefault();
    italicButton.onclick = () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
    };
    toolbarElement.appendChild(italicButton);

    // 下划线按钮
    const underlineButton = document.createElement('button');
    underlineButton.type = 'button';
    underlineButton.className = `toolbar-item ${isUnderline ? 'active' : ''}`;
    underlineButton.title = '下划线';
    underlineButton.innerHTML = `<img src="${underlineIcon}" class="icon" alt="underline" />`;
    underlineButton.onmousedown = (e) => e.preventDefault();
    underlineButton.onclick = () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
    };
    toolbarElement.appendChild(underlineButton);

    // 删除线按钮
    const strikethroughButton = document.createElement('button');
    strikethroughButton.type = 'button';
    strikethroughButton.className = `toolbar-item ${isStrikethrough ? 'active' : ''}`;
    strikethroughButton.title = '删除线';
    strikethroughButton.innerHTML = `<img src="${strikethroughIcon}" class="icon" alt="strikethrough" />`;
    strikethroughButton.onmousedown = (e) => e.preventDefault();
    strikethroughButton.onclick = () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
    };
    toolbarElement.appendChild(strikethroughButton);

    // 行内代码按钮
    const codeButton = document.createElement('button');
    codeButton.type = 'button';
    codeButton.className = `toolbar-item ${isCode ? 'active' : ''}`;
    codeButton.title = '行内代码';
    codeButton.innerHTML = `<img src="${codeIcon}" class="icon" alt="code" />`;
    codeButton.onmousedown = (e) => e.preventDefault();
    codeButton.onclick = () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
    };
    toolbarElement.appendChild(codeButton);

    // 链接按钮
    const linkButton = document.createElement('button');
    linkButton.type = 'button';
    linkButton.className = `toolbar-item ${isLink ? 'active' : ''}`;
    linkButton.title = '链接';
    linkButton.innerHTML = `<img src="${linkIcon}" class="icon" alt="link" />`;
    linkButton.onmousedown = (e) => {
      e.preventDefault(); // 防止失去焦点
    };
    linkButton.onclick = (e) => {
      insertLink(e);
    };
    toolbarElement.appendChild(linkButton);
  };

  const init = () => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    // 创建工具栏元素
    toolbarElement = document.createElement('div');
    toolbarElement.className = 'floating-text-format-toolbar';
    toolbarElement.style.position = 'absolute';
    toolbarElement.style.top = '0';
    toolbarElement.style.left = '0';
    toolbarElement.style.zIndex = '9000';
    toolbarElement.style.opacity = '0';
    toolbarElement.style.willChange = 'transform';
    rootElement.parentElement?.appendChild(toolbarElement);

    // 监听鼠标按下事件，标记正在选择文本
    const onMouseDown = () => {
      isMouseDown = true;
    };

    // 监听鼠标松开事件，更新工具栏
    const onMouseUp = () => {
      isMouseDown = false;
      // 延迟一小段时间，确保选择已完成
      setTimeout(() => {
        updateToolbar();
      }, 0);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);

    // 监听选择变化
    document.addEventListener('selectionchange', updateToolbar);

    // 监听编辑器更新和滚动
    const scrollerElem = rootElement.parentElement;
    const onScroll = () => {
      editor.getEditorState().read(() => {
        updateToolbar();
      });
    };

    window.addEventListener('resize', onScroll);
    scrollerElem?.addEventListener('scroll', onScroll);

    const unregister = mergeRegister(
      editor.registerUpdateListener(() => {
        updateToolbar();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('selectionchange', updateToolbar);
      window.removeEventListener('resize', onScroll);
      scrollerElem?.removeEventListener('scroll', onScroll);
      toolbarElement?.remove();
      toolbarElement = null;
      unregister();
    };
  };

  return init();
}

