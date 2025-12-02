/**
 * ComponentPickerPlugin - Slash Command 插件（纯 Vue 版本）
 */

import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import {$createHeadingNode} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  TextNode,
} from 'lexical';
import {mergeRegister} from '@lexical/utils';

import {$createHorizontalRuleNode} from '../nodes/HorizontalRuleNode';
import {INSERT_IMAGE_COMMAND, type ImageUploadHandler} from './ImagesPlugin';
import {fileToBase64} from '../utils/imageUpload';

interface ComponentPickerOption {
  title: string;
  keywords: string[];
  onSelect: (editor: LexicalEditor) => void;
}

const createBaseOptions = (uploadImage?: ImageUploadHandler): ComponentPickerOption[] => [
  {
    title: '文本',
    keywords: ['normal', 'paragraph', 'p', 'text'],
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
    onSelect: (editor: LexicalEditor) => {
      // 使用命令来切换或创建列表，命令会自动处理类型转换
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    title: '无序列表',
    keywords: ['bulleted list', 'unordered list', 'ul'],
    onSelect: (editor: LexicalEditor) => {
      // 使用命令来切换或创建列表，命令会自动处理类型转换
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    title: '分割线',
    keywords: ['horizontal rule', 'divider', 'hr'],
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
    title: '图片',
    keywords: ['image', 'photo', 'picture', 'file'],
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
  const {uploadImage} = options;
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
      li.textContent = option.title;
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
  };

  const updateMenu = () => {
    if (!menuElement) return;
    const items = menuElement.querySelectorAll('li');
    items.forEach((item, index) => {
      item.className = `component-picker-item ${index === selectedIndex ? 'selected' : ''}`;
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
    editor.registerUpdateListener(({editorState}) => {
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

