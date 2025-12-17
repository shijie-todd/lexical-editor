/**
 * CodeActionMenuPlugin - 代码块操作菜单插件
 * 提供语言选择和复制功能
 */

import {
  $isCodeNode,
  CodeNode,
  getCodeLanguageOptions,
  getLanguageFriendlyName,
  normalizeCodeLang,
} from '@lexical/code';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $setSelection,
  type LexicalEditor,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { isHTMLElement } from 'lexical';

const CODE_PADDING = 8;

interface Position {
  top: string;
  right: string;
}

interface CodeActionMenuState {
  show: boolean;
  position: Position;
  language: string;
  codeDOMNode: HTMLElement | null;
}

// 防抖函数
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
  maxWait?: number,
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let maxTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | null = null;

  const debounced = ((...args: Parameters<T>) => {
    const now = Date.now();
    lastCallTime = now;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);

    if (maxWait && !maxTimeout) {
      maxTimeout = setTimeout(() => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        func(...args);
        maxTimeout = null;
      }, maxWait);
    }
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (maxTimeout) {
      clearTimeout(maxTimeout);
      maxTimeout = null;
    }
  };

  return debounced;
}

export interface CodeActionMenuPluginOptions {
  /**
   * 锚点元素，用于计算菜单位置
   */
  anchorElem?: HTMLElement;
}

export function useCodeActionMenuPlugin(
  editor: LexicalEditor,
  options: CodeActionMenuPluginOptions = {},
) {
  const { anchorElem = document.body } = options;

  let menuElement: HTMLDivElement | null = null;
  let state: CodeActionMenuState = {
    show: false,
    position: { top: '0', right: '0' },
    language: '',
    codeDOMNode: null,
  };
  const codeSetRef = new Set<string>();
  let shouldListenMouseMove = false;

  function getCodeDOMNode(): HTMLElement | null {
    return state.codeDOMNode;
  }

  function updateMenu() {
    if (!menuElement) return;

    if (state.show) {
      menuElement.style.display = 'flex';
      menuElement.style.top = state.position.top;
      menuElement.style.right = state.position.right;
      updateMenuContent();
    } else {
      menuElement.style.display = 'none';
    }
  }

  function updateMenuContent() {
    if (!menuElement) return;

    const normalizedLang = normalizeCodeLang(state.language);
    const codeFriendlyName = getLanguageFriendlyName(state.language);

    // 更新语言显示
    const langElement = menuElement.querySelector('.code-highlight-language');
    if (langElement) {
      langElement.textContent = codeFriendlyName;
    }

    // 更新语言选择器
    const languageSelect = menuElement.querySelector(
      '.code-language-select',
    ) as HTMLSelectElement;
    if (languageSelect) {
      languageSelect.value = normalizedLang || '';
    }

  }

  function createMenuElement() {
    if (menuElement && menuElement.parentNode) return menuElement;
    
    // 如果菜单元素存在但没有父节点，先清理
    if (menuElement) {
      menuElement.remove();
      menuElement = null;
    }

    menuElement = document.createElement('div');
    menuElement.className = 'code-action-menu-container';
    menuElement.style.display = 'none';
    anchorElem.appendChild(menuElement);

    // 语言显示
    const langDiv = document.createElement('div');
    langDiv.className = 'code-highlight-language';
    menuElement.appendChild(langDiv);

    // 语言选择器
    const languageSelect = document.createElement('select');
    languageSelect.className = 'code-language-select';
    languageSelect.title = '选择语言';
    const languageOptions = getCodeLanguageOptions();
    languageOptions.forEach(([value, name]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = name;
      languageSelect.appendChild(option);
    });
    languageSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      handleLanguageChange(target.value);
    });
    menuElement.appendChild(languageSelect);

    // 复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'menu-item copy-button';
    copyButton.title = '复制代码';
    copyButton.innerHTML = '<i class="format copy"></i>';
    copyButton.addEventListener('click', handleCopy);
    menuElement.appendChild(copyButton);


    return menuElement;
  }

  async function handleCopy() {
    const codeDOMNode = getCodeDOMNode();
    if (!codeDOMNode) return;

    let content = '';

    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
      if ($isCodeNode(codeNode)) {
        content = codeNode.getTextContent();
      }
      const selection = $getSelection();
      $setSelection(selection);
    });

    try {
      await navigator.clipboard.writeText(content);
      // 显示成功提示
      const copyButton = menuElement?.querySelector(
        '.copy-button',
      ) as HTMLButtonElement;
      if (copyButton) {
        const icon = copyButton.querySelector('i');
        if (icon) {
          icon.className = 'format success';
          setTimeout(() => {
            icon.className = 'format copy';
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }


  function handleLanguageChange(language: string) {
    const codeDOMNode = getCodeDOMNode();
    if (!codeDOMNode) return;

    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
      if ($isCodeNode(codeNode)) {
        codeNode.setLanguage(language);
        state.language = language;
      }
    });
  }

  const debouncedOnMouseMove = debounce(
    (event: MouseEvent) => {
      const { codeDOMNode, isOutside } = getMouseInfo(event);
      if (isOutside) {
        state.show = false;
        updateMenu();
        return;
      }

      if (!codeDOMNode) {
        return;
      }

      state.codeDOMNode = codeDOMNode;

      let codeNode: CodeNode | null = null;
      let lang = '';

      editor.update(() => {
        const maybeCodeNode = $getNearestNodeFromDOMNode(codeDOMNode);
        if ($isCodeNode(maybeCodeNode)) {
          codeNode = maybeCodeNode;
          lang = codeNode.getLanguage() || '';
        }
      });

      if (codeNode) {
        const { y: editorElemY, right: editorElemRight } =
          anchorElem.getBoundingClientRect();
        const { y, right } = codeDOMNode.getBoundingClientRect();
        state.language = lang;
        state.show = true;
        state.position = {
          right: `${editorElemRight - right + CODE_PADDING}px`,
          top: `${y - editorElemY}px`,
        };
        updateMenu();
      }
    },
    50,
    1000,
  );

  function getMouseInfo(event: MouseEvent): {
    codeDOMNode: HTMLElement | null;
    isOutside: boolean;
  } {
    const target = event.target;

    if (isHTMLElement(target)) {
      const codeDOMNode = target.closest<HTMLElement>('code.editor-code');
      const isOutside = !(
        codeDOMNode ||
        target.closest<HTMLElement>('div.code-action-menu-container')
      );

      return { codeDOMNode, isOutside };
    } else {
      return { codeDOMNode: null, isOutside: true };
    }
  }

  // 创建菜单元素
  createMenuElement();

  return mergeRegister(
    editor.registerMutationListener(
      CodeNode,
      (mutations) => {
        editor.getEditorState().read(() => {
          for (const [key, type] of mutations) {
            switch (type) {
              case 'created':
                codeSetRef.add(key);
                break;

              case 'destroyed':
                codeSetRef.delete(key);
                break;

              default:
                break;
            }
          }
        });
        const newShouldListen = codeSetRef.size > 0;
        
        // 只在状态改变时添加/移除监听器
        if (newShouldListen && !shouldListenMouseMove) {
          document.addEventListener('mousemove', debouncedOnMouseMove);
          shouldListenMouseMove = true;
        } else if (!newShouldListen && shouldListenMouseMove) {
          debouncedOnMouseMove.cancel();
          document.removeEventListener('mousemove', debouncedOnMouseMove);
          shouldListenMouseMove = false;
          state.show = false;
          updateMenu();
        }
      },
      { skipInitialization: false },
    ),
    () => {
      // 清理函数
      debouncedOnMouseMove.cancel();
      document.removeEventListener('mousemove', debouncedOnMouseMove);
      if (menuElement) {
        menuElement.remove();
        menuElement = null;
      }
    },
  );
}


