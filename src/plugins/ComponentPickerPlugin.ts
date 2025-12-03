/**
 * ComponentPickerPlugin - Slash Command 插件（纯 Vue 版本）
 */

import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
} from '@lexical/list';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $createCodeNode, $isCodeNode } from '@lexical/code';
import { $getTableCellNodeFromLexicalNode, $isTableCellNode } from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  TextNode,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';

import { $createHorizontalRuleNode } from '../nodes/HorizontalRuleNode';
import { INSERT_IMAGE_COMMAND, type ImageUploadHandler } from './ImagesPlugin';
import { INSERT_TABLE_COMMAND } from './TablePlugin';
import { fileToBase64 } from '../utils/imageUpload';

// 导入 SVG 图标
import textIcon from '../assets/text.svg';
import heading1Icon from '../assets/heading1.svg';
import heading2Icon from '../assets/heading2.svg';
import heading3Icon from '../assets/heading3.svg';
import orderListIcon from '../assets/order-list.svg';
import unorderListIcon from '../assets/unorder-list.svg';
import checkListIcon from '../assets/check-list.svg';
import imageIcon from '../assets/image.svg';
import quoteIcon from '../assets/quote.svg';
import codeIcon from '../assets/code.svg';
import dividerIcon from '../assets/divider.svg';
import tableIcon from '../assets/table.svg';

interface ComponentPickerOption {
  title: string;
  keywords: string[];
  icon: string; // SVG 图标路径
  onSelect: (editor: LexicalEditor) => void;
}

const createBaseOptions = (uploadImage?: ImageUploadHandler): ComponentPickerOption[] => [
  {
    title: '文本',
    keywords: ['normal', 'paragraph', 'p', 'text'],
    icon: textIcon,
    onSelect: (editor: LexicalEditor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    },
  },
  {
    title: '一级标题',
    keywords: ['heading', 'header', 'h1'],
    icon: heading1Icon,
    onSelect: (editor: LexicalEditor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h1'));
        }
      });
    },
  },
  {
    title: '二级标题',
    keywords: ['heading', 'header', 'h2'],
    icon: heading2Icon,
    onSelect: (editor: LexicalEditor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h2'));
        }
      });
    },
  },
  {
    title: '三级标题',
    keywords: ['heading', 'header', 'h3'],
    icon: heading3Icon,
    onSelect: (editor: LexicalEditor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h3'));
        }
      });
    },
  },
  {
    title: '有序列表',
    keywords: ['numbered list', 'ordered list', 'ol'],
    icon: orderListIcon,
    onSelect: (editor: LexicalEditor) => {
      // 使用命令来切换或创建列表，命令会自动处理类型转换
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    title: '无序列表',
    keywords: ['bulleted list', 'unordered list', 'ul'],
    icon: unorderListIcon,
    onSelect: (editor: LexicalEditor) => {
      // 使用命令来切换或创建列表，命令会自动处理类型转换
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    title: '待办列表',
    keywords: ['checklist', 'todo', 'task', 'checkbox', '待办', '任务'],
    icon: checkListIcon,
    onSelect: (editor: LexicalEditor) => {
      // 使用命令来切换或创建 checklist，命令会自动处理类型转换
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    },
  },
  {
    title: '图片',
    keywords: ['image', 'photo', 'picture', 'file'],
    icon: imageIcon,
    onSelect: (editor: LexicalEditor) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            let src: string;

            if (uploadImage) {
              // 使用自定义上传方法
              src = await uploadImage(file);
            } else {
              // 默认使用 base64
              src = await fileToBase64(file);
            }

            editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
              altText: file.name,
              src,
            });
          } catch (error) {
            console.error('Failed to upload image:', error);
            // 可以在这里显示错误提示
          }
        }
      };
      input.click();
    },
  },
  {
    title: '引用',
    keywords: ['quote', 'blockquote', '引用'],
    icon: quoteIcon,
    onSelect: (editor: LexicalEditor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    },
  },
  {
    title: '代码块',
    keywords: ['code', 'codeblock', '代码', '代码块'],
    icon: codeIcon,
    onSelect: (editor: LexicalEditor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // 切换为代码块
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
      
      // 延迟执行格式清除，确保块转换已完成
      setTimeout(() => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const anchor = selection.anchor.getNode();
            let parent = anchor.getParent();
            
            // 向上查找代码块节点
            while (parent && !$isCodeNode(parent)) {
              parent = parent.getParent();
            }
            
            if ($isCodeNode(parent)) {
              // 获取代码块内的所有子节点
              const children = parent.getChildren();
              const replacements: Array<{ oldNode: TextNode; newNode: TextNode }> = [];
              
              // 收集需要替换的节点
              children.forEach((child) => {
                if ($isTextNode(child) && child.getFormat() !== 0) {
                  // 创建没有格式的新文本节点
                  const newTextNode = $createTextNode(child.getTextContent());
                  replacements.push({ oldNode: child, newNode: newTextNode });
                }
                // 处理后代节点
                const descendants = child.getDescendants();
                descendants.forEach((descendant) => {
                  if ($isTextNode(descendant) && descendant.getFormat() !== 0) {
                    const newTextNode = $createTextNode(descendant.getTextContent());
                    replacements.push({ oldNode: descendant, newNode: newTextNode });
                  }
                });
              });
              
              // 执行替换
              replacements.forEach(({ oldNode, newNode }) => {
                oldNode.replace(newNode);
              });
            }
          }
        });
      }, 0);
    },
  },
  {
    title: '分割线',
    keywords: ['horizontal rule', 'divider', 'hr'],
    icon: dividerIcon,
    onSelect: (editor: LexicalEditor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const hr = $createHorizontalRuleNode();
          selection.insertNodes([hr]);
          hr.selectNext();
        }
      });
    },
  },
  {
    title: '表格',
    keywords: ['table', 'grid', '表格'],
    icon: tableIcon,
    onSelect: (editor: LexicalEditor) => {
      // 默认创建 3x3 的表格
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        rows: '3',
        columns: '3',
      });
    },
  },
];

export interface ComponentPickerPluginOptions {
  /**
   * 自定义图片上传方法
   * 如果不提供，将使用默认的 base64 方式（readAsDataURL）
   */
  uploadImage?: ImageUploadHandler;
}

export function useComponentPickerPlugin(
  editor: LexicalEditor,
  options: ComponentPickerPluginOptions = {},
) {
  const { uploadImage } = options;
  let menuElement: HTMLDivElement | null = null;
  let selectedIndex = 0;
  let queryString = '';

  const baseOptions = createBaseOptions(uploadImage);

  const filterOptions = (query: string): ComponentPickerOption[] => {
    if (!query) {
      return baseOptions;
    }
    const regex = new RegExp(query, 'i');
    return baseOptions.filter(
      (option) =>
        regex.test(option.title) ||
        option.keywords.some((keyword) => regex.test(keyword)),
    );
  };

  const showMenu = (anchorElement: HTMLElement, query: string) => {
    const options = filterOptions(query);
    if (options.length === 0) {
      hideMenu();
      return;
    }

    if (!menuElement) {
      menuElement = document.createElement('div');
      menuElement.className = 'typeahead-popover component-picker-menu';
      menuElement.style.position = 'absolute';
      menuElement.style.zIndex = '1000';
      document.body.appendChild(menuElement);
    }

    const ul = document.createElement('ul');
    options.forEach((option, index) => {
      const li = document.createElement('li');
      li.className = `component-picker-item ${index === selectedIndex ? 'selected' : ''}`;
      
      // 添加图标
      const iconImg = document.createElement('img');
      iconImg.src = option.icon;
      iconImg.className = 'picker-icon';
      iconImg.alt = option.title;
      li.appendChild(iconImg);
      
      // 添加文本
      const textSpan = document.createElement('span');
      textSpan.className = 'text';
      textSpan.textContent = option.title;
      li.appendChild(textSpan);
      
      li.onclick = () => {
        option.onSelect(editor);
        hideMenu();
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            if (anchorNode instanceof TextNode && anchorNode.getTextContent().startsWith('/')) {
              anchorNode.remove();
            }
          }
        });
      };
      li.onmouseenter = () => {
        selectedIndex = index;
        updateMenu();
      };
      ul.appendChild(li);
    });
    menuElement.innerHTML = '';
    menuElement.appendChild(ul);

    const rect = anchorElement.getBoundingClientRect();
    menuElement.style.top = `${rect.bottom + window.scrollY}px`;
    menuElement.style.left = `${rect.left + window.scrollX}px`;
    // todo: 当菜单超出屏幕时，需要调整位置，具体策略是，当菜单的底部超出屏幕时，需要将菜单向上移动，当菜单的顶部超出屏幕时，需要将菜单向下移动
  };

  const updateMenu = () => {
    if (!menuElement) return;
    const items = menuElement.querySelectorAll('li');
    items.forEach((item, index) => {
      const isSelected = index === selectedIndex;
      item.className = `component-picker-item ${isSelected ? 'selected' : ''}`;
      
      // 如果是选中的项，滚动到视野中
      if (isSelected) {
        item.scrollIntoView({
          block: 'nearest', // 只在需要时滚动
          behavior: 'smooth', // 平滑滚动
        });
      }
    });
  };

  const hideMenu = () => {
    if (menuElement) {
      menuElement.remove();
      menuElement = null;
    }
    selectedIndex = 0;
    queryString = '';
  };

  const handleKeyDown = (event: KeyboardEvent | null) => {
    if (!menuElement || !event) return false;

    const options = filterOptions(queryString);
    if (options.length === 0) return false;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % options.length;
      updateMenu();
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = (selectedIndex - 1 + options.length) % options.length;
      updateMenu();
      return true;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selectedOption = options[selectedIndex];
      if (selectedOption) {
        selectedOption.onSelect(editor);
        hideMenu();
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            if (anchorNode instanceof TextNode && anchorNode.getTextContent().startsWith('/')) {
              anchorNode.remove();
            }
          }
        });
      }
      return true;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      hideMenu();
      return true;
    }

    return false;
  };

  return mergeRegister(
    editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          hideMenu();
          return;
        }

        const anchorNode = selection.anchor.getNode();
        if (!(anchorNode instanceof TextNode)) {
          hideMenu();
          return;
        }

        // 检查是否在表格单元格内
        const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
        if (tableCellNode && $isTableCellNode(tableCellNode)) {
          // 在表格单元格内，不显示 slash command 菜单
          hideMenu();
          return;
        }

        // 检查是否在 block 的开头
        const parentNode = anchorNode.getParent();
        if (!parentNode || $isRootOrShadowRoot(parentNode)) {
          hideMenu();
          return;
        }

        // 检查是否是 block 的第一个子节点
        const isFirstChild = parentNode.getFirstChild() === anchorNode;
        if (!isFirstChild) {
          hideMenu();
          return;
        }

        // 检查光标位置和 / 的位置
        const text = anchorNode.getTextContent();
        const anchorOffset = selection.anchor.offset;

        // 只检查光标位置之前的文本
        const textBeforeCursor = text.substring(0, anchorOffset);

        // 查找最后一个 / 的位置
        const slashIndex = textBeforeCursor.lastIndexOf('/');

        if (slashIndex === -1) {
          hideMenu();
          return;
        }

        // 检查 / 是否在文本开头（允许前面有空格）
        const beforeSlash = textBeforeCursor.substring(0, slashIndex);
        if (beforeSlash.trim().length > 0) {
          hideMenu();
          return;
        }

        queryString = textBeforeCursor.substring(slashIndex + 1);
        const options = filterOptions(queryString);

        if (options.length > 0) {
          const domSelection = window.getSelection();
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0);
            const anchorElement = range.startContainer.parentElement;
            if (anchorElement) {
              showMenu(anchorElement as HTMLElement, queryString);
            } else {
              hideMenu();
            }
          } else {
            hideMenu();
          }
        } else {
          hideMenu();
        }
      });
    }),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      handleKeyDown,
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      handleKeyDown,
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      handleKeyDown,
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      handleKeyDown,
      COMMAND_PRIORITY_LOW,
    ),
  );
}

