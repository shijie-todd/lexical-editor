import {
  $getSelection,
  $isRangeSelection,
  $isNodeSelection,
  type BaseSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
  CLICK_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import { getSelectedNode } from '../utils/getSelectedNode';
import { setFloatingElemPositionForLinkEditor } from '../utils/setFloatingElemPositionForLinkEditor';
import { sanitizeUrl } from '../utils/url';

export function useFloatingLinkEditorPlugin(
  editor: LexicalEditor,
  options: {
    getIsLinkEditMode: () => boolean;
    setIsLinkEditMode: (isEditMode: boolean) => void;
  }
) {
  let editorElement: HTMLDivElement | null = null;
  let isLink = false;
  let linkUrl = '';
  let editedLinkUrl = 'https://';
  let lastSelection: BaseSelection | null = null;
  let lastRenderMode: 'edit' | 'view' | 'hidden' = 'hidden'; // 跟踪上次渲染的模式

  const updateLinkEditor = () => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const linkParent = $findMatchingParent(node, $isLinkNode);

      if (linkParent) {
        linkUrl = linkParent.getURL();
      } else if ($isLinkNode(node)) {
        linkUrl = node.getURL();
      } else {
        linkUrl = '';
      }
      if (options.getIsLinkEditMode()) {
        editedLinkUrl = linkUrl;
      }
    } else if ($isNodeSelection(selection)) {
      const nodes = selection.getNodes();
      if (nodes.length > 0) {
        const node = nodes[0];
        const parent = node?.getParent();
        if (parent && $isLinkNode(parent)) {
          linkUrl = parent.getURL();
        } else if ($isLinkNode(node)) {
          linkUrl = node.getURL();
        } else {
          linkUrl = '';
        }
        if (options.getIsLinkEditMode()) {
          editedLinkUrl = linkUrl;
        }
      }
    }

    if (!editorElement) return;

    const rootElement = editor.getRootElement();
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (selection !== null && rootElement !== null && editor.isEditable()) {
      let domRect: DOMRect | undefined;

      if ($isNodeSelection(selection)) {
        const nodes = selection.getNodes();
        if (nodes.length > 0) {
          const node = nodes[0];
          if (node) {
            const element = editor.getElementByKey(node.getKey());
            if (element) {
              domRect = element.getBoundingClientRect();
            }
          }
        }
      } else if (
        nativeSelection !== null &&
        rootElement.contains(nativeSelection.anchorNode)
      ) {
        domRect =
          nativeSelection.focusNode?.parentElement?.getBoundingClientRect();
      }

      if (domRect) {
        domRect = new DOMRect(
          domRect.x,
          domRect.y + 40,
          domRect.width,
          domRect.height
        );
        setFloatingElemPositionForLinkEditor(domRect, editorElement, rootElement);
      }
      lastSelection = selection;
    } else if (!activeElement || activeElement.className !== 'link-input') {
      if (rootElement !== null) {
        setFloatingElemPositionForLinkEditor(null, editorElement, rootElement);
      }
      lastSelection = null;
      options.setIsLinkEditMode(false);
      linkUrl = '';
    }

    return true;
  };

  const updateToolbar = () => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const focusNode = getSelectedNode(selection);
      const focusLinkNode = $findMatchingParent(focusNode, $isLinkNode);
      const focusAutoLinkNode = $findMatchingParent(
        focusNode,
        $isAutoLinkNode,
      );
      if (!(focusLinkNode || focusAutoLinkNode)) {
        isLink = false;
        return;
      }
      const badNode = selection
        .getNodes()
        .find((node) => {
          const linkNode = $findMatchingParent(node, $isLinkNode);
          const autoLinkNode = $findMatchingParent(node, $isAutoLinkNode);
          return (
            (focusLinkNode && !focusLinkNode.is(linkNode)) ||
            (linkNode && !linkNode.is(focusLinkNode)) ||
            (focusAutoLinkNode && !focusAutoLinkNode.is(autoLinkNode)) ||
            (autoLinkNode &&
              (!autoLinkNode.is(focusAutoLinkNode) ||
                autoLinkNode.getIsUnlinked()))
          );
        });
      if (!badNode) {
        isLink = true;
      } else {
        isLink = false;
      }
    } else if ($isNodeSelection(selection)) {
      const nodes = selection.getNodes();
      if (nodes.length === 0) {
        isLink = false;
        return;
      }
      const node = nodes[0];
      const parent = node?.getParent();
      if ((parent && $isLinkNode(parent)) || $isLinkNode(node)) {
        isLink = true;
      } else {
        isLink = false;
      }
    }
  };

  const handleLinkSubmission = () => {
    if (lastSelection !== null) {
      if (linkUrl !== '' || editedLinkUrl !== 'https://') {
        editor.update(() => {
          editor.dispatchCommand(
            TOGGLE_LINK_COMMAND,
            sanitizeUrl(editedLinkUrl),
          );
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const parent = getSelectedNode(selection).getParent();
            if ($isAutoLinkNode(parent)) {
              const linkNode = $createLinkNode(parent.getURL(), {
                rel: parent.__rel,
                target: parent.__target,
                title: parent.__title,
              });
              parent.replace(linkNode, true);
            }
          }
        });
        // 更新 linkUrl 以便查看模式显示
        linkUrl = editedLinkUrl;
      }
      editedLinkUrl = 'https://';
      options.setIsLinkEditMode(false);
      // 延迟渲染，等待编辑器状态更新完成
      setTimeout(() => {
        lastRenderMode = 'hidden'; // 强制重新渲染
        renderLinkEditor();
      }, 0);
    }
  };

  const renderLinkEditor = () => {
    if (!editorElement) return;

    // 确定当前应该渲染的模式
    const currentMode = !isLink ? 'hidden' : (options.getIsLinkEditMode() ? 'edit' : 'view');
    
    // 如果模式没有变化，不需要重新渲染（避免焦点丢失）
    if (currentMode === lastRenderMode && currentMode === 'edit') {
      // 编辑模式下，如果模式没变，不重新渲染，保持焦点
      return;
    }
    
    lastRenderMode = currentMode;
    editorElement.innerHTML = '';

    if (!isLink) return;

    if (options.getIsLinkEditMode()) {
      // 编辑模式
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'link-input';
      input.value = editedLinkUrl;
      input.placeholder = '输入链接地址';
      input.oninput = (e) => {
        editedLinkUrl = (e.target as HTMLInputElement).value;
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleLinkSubmission();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          // 退出编辑模式并隐藏弹窗
          options.setIsLinkEditMode(false);
          isLink = false;
          lastRenderMode = 'hidden'; // 重置渲染模式
          if (editorElement) {
            editorElement.style.opacity = '0';
            editorElement.style.transform = 'translate(-10000px, -10000px)';
          }
          // 恢复编辑器焦点
          editor.focus();
        }
      };
      editorElement.appendChild(input);

      // 按钮容器
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'link-buttons';

      // 取消按钮
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'link-button link-cancel';
      cancelButton.title = '取消';
      cancelButton.innerHTML = '✕';
      cancelButton.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 退出编辑模式并隐藏弹窗
        options.setIsLinkEditMode(false);
        isLink = false;
        lastRenderMode = 'hidden'; // 重置渲染模式
        if (editorElement) {
          editorElement.style.opacity = '0';
          editorElement.style.transform = 'translate(-10000px, -10000px)';
        }
        // 恢复编辑器焦点
        editor.focus();
      };
      buttonsDiv.appendChild(cancelButton);

      // 确认按钮
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'link-button link-confirm';
      confirmButton.title = '确认';
      confirmButton.innerHTML = '✓';
      confirmButton.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleLinkSubmission();
      };
      buttonsDiv.appendChild(confirmButton);

      editorElement.appendChild(buttonsDiv);

      // 自动聚焦输入框 - 使用多重策略确保聚焦成功
      // 立即聚焦
      input.focus();
      input.select();
      
      // 延迟聚焦（防止被其他事件覆盖）
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
      
      // 再次延迟聚焦（确保万无一失）
      setTimeout(() => {
        input.focus();
        input.select();
      }, 50);
    } else {
      // 查看模式
      const viewDiv = document.createElement('div');
      viewDiv.className = 'link-view';

      // 链接文本
      const link = document.createElement('a');
      link.href = sanitizeUrl(linkUrl);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = linkUrl;
      link.className = 'link-text';
      viewDiv.appendChild(link);

      // 编辑按钮
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'link-button link-edit';
      editButton.title = '编辑';
      editButton.innerHTML = '✎';
      editButton.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        editedLinkUrl = linkUrl;
        options.setIsLinkEditMode(true);
        // 强制重新渲染（渲染后会自动聚焦输入框）
        lastRenderMode = 'hidden';
        renderLinkEditor();
      };
      viewDiv.appendChild(editButton);

      // 删除按钮
      const trashButton = document.createElement('button');
      trashButton.type = 'button';
      trashButton.className = 'link-button link-trash';
      trashButton.title = '删除';
      trashButton.innerHTML = '🗑';
      trashButton.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      };
      viewDiv.appendChild(trashButton);

      editorElement.appendChild(viewDiv);
    }
  };

  const init = () => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    // 创建链接编辑器元素
    editorElement = document.createElement('div');
    editorElement.className = 'floating-link-editor';
    editorElement.style.position = 'absolute';
    editorElement.style.top = '0';
    editorElement.style.left = '0';
    editorElement.style.zIndex = '1000';
    editorElement.style.opacity = '0';
    editorElement.style.willChange = 'transform';
    rootElement.parentElement?.appendChild(editorElement);

    // 监听滚动和窗口大小变化
    const scrollerElem = rootElement.parentElement;
    const onUpdate = () => {
      editor.getEditorState().read(() => {
        updateLinkEditor();
      });
    };

    window.addEventListener('resize', onUpdate);
    scrollerElem?.addEventListener('scroll', onUpdate);

    // 监听点击外部以关闭编辑器（focusout 用于编辑模式）
    const handleBlur = (event: FocusEvent) => {
      // 延迟处理，确保按钮的 mousedown 事件能先执行
      setTimeout(() => {
        if (editorElement && !editorElement.contains(event.relatedTarget as Element) && isLink) {
          isLink = false;
          options.setIsLinkEditMode(false);
          lastRenderMode = 'hidden'; // 重置渲染模式
          if (editorElement) {
            editorElement.style.opacity = '0';
            editorElement.style.transform = 'translate(-10000px, -10000px)';
          }
        }
      }, 100);
    };
    editorElement.addEventListener('focusout', handleBlur);

    // 监听全局点击事件以关闭弹窗（用于查看模式和编辑模式点击外部）
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // 如果弹窗显示中，且点击在弹窗外部，则关闭弹窗
      if (editorElement && isLink && !editorElement.contains(target)) {
        isLink = false;
        options.setIsLinkEditMode(false);
        lastRenderMode = 'hidden'; // 重置渲染模式
        if (editorElement) {
          editorElement.style.opacity = '0';
          editorElement.style.transform = 'translate(-10000px, -10000px)';
        }
      }
    };
    // 使用 mousedown 而不是 click，这样可以更快响应
    document.addEventListener('mousedown', handleClickOutside);

    const unregister = mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
          updateLinkEditor();
          renderLinkEditor();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          updateLinkEditor();
          renderLinkEditor();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (isLink || options.getIsLinkEditMode()) {
            isLink = false;
            options.setIsLinkEditMode(false);
            lastRenderMode = 'hidden'; // 重置渲染模式
            if (editorElement) {
              editorElement.style.opacity = '0';
              editorElement.style.transform = 'translate(-10000px, -10000px)';
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const linkNode = $findMatchingParent(node, $isLinkNode);
            if ($isLinkNode(linkNode) && (payload.metaKey || payload.ctrlKey)) {
              window.open(linkNode.getURL(), '_blank');
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    // 初始更新
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });

    return () => {
      window.removeEventListener('resize', onUpdate);
      scrollerElem?.removeEventListener('scroll', onUpdate);
      editorElement?.removeEventListener('focusout', handleBlur);
      document.removeEventListener('mousedown', handleClickOutside);
      editorElement?.remove();
      editorElement = null;
      unregister();
    };
  };

  return init();
}

