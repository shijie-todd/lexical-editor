/**
 * ImagesPlugin - 图片插件（Vue 版本）
 */

import {
  $wrapNodeInElement,
  mergeRegister,
} from '@lexical/utils';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $getNodeByKey,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  getDOMSelectionFromTarget,
  isHTMLElement,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical';
import { createApp, type App } from 'vue';
import ImageComponent from '../components/ImageComponent.vue';

import {
  $createImageNode,
  $isImageNode,
  ImageNode,
  type ImagePayload,
} from '../nodes/ImageNode';

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand('INSERT_IMAGE_COMMAND');

/**
 * 图片上传函数类型
 * @param file - 要上传的文件
 * @returns Promise<string> - 返回上传后的图片 URL
 */
export type ImageUploadHandler = (file: File) => Promise<string>;

export interface ImagesPluginOptions {
  /**
   * 自定义图片上传方法
   * 如果不提供，将使用默认的 base64 方式（readAsDataURL）
   */
  uploadImage?: ImageUploadHandler;
}

export function useImagesPlugin(editor: LexicalEditor, readonly: boolean = false) {
  if (!editor.hasNodes([ImageNode])) {
    throw new Error('ImagesPlugin: ImageNode not registered on editor');
  }

  // 存储 Vue 应用实例和组件实例引用
  const vueApps = new Map<string, { app: App; mounted: boolean; lastData: any }>();
  // 存储选中状态
  let selectedNodeKey: string | null = null;
  let lastSelectedNodeKey: string | null = null;

  // 获取选中的节点 key
  const updateSelectedNodeKey = () => {
    lastSelectedNodeKey = selectedNodeKey;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isNodeSelection(selection)) {
        const nodes = selection.getNodes();
        if (nodes.length === 1 && $isImageNode(nodes[0])) {
          selectedNodeKey = nodes[0].getKey();
          return;
        }
      }
      selectedNodeKey = null;
    });
  };

  // 创建组件 props 的工厂函数
  const createComponentProps = (nodeKey: string, imageNodeData: any, isSelected: boolean) => ({
    ...imageNodeData,
    isSelected,
    isEditable: !readonly,
    'onUpdate:width': (value: number) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setWidthAndHeight(value, node.__height);
        }
      });
    },
    'onUpdate:height': (value: number) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setWidthAndHeight(node.__width, value);
        }
      });
    },
    'onSelect': () => {
      if (!readonly) {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            const selection = $createNodeSelection();
            selection.add(nodeKey);
            $setSelection(selection);
          }
        });
      }
    },
  });

  // 手动挂载 Vue 组件到 DecoratorNode 容器
  const mountDecorators = (forceRemount: boolean = false) => {
    const decorators = editor.getDecorators<HTMLElement>();
    
    // 清理不再存在的节点
    const currentKeys = new Set(Object.keys(decorators));
    for (const [key, { app }] of vueApps.entries()) {
      if (!currentKeys.has(key)) {
        app.unmount();
        vueApps.delete(key);
      }
    }
    
    // 挂载或更新装饰器
    for (const nodeKey in decorators) {
      const element = editor.getElementByKey(nodeKey);
      const decorator = decorators[nodeKey];
      
      if (element && decorator && element instanceof HTMLElement) {
        // 获取图片节点数据
        const imageNodeData = (decorator as any).__imageNodeData;
        if (!imageNodeData) continue;
        
        const isSelected = selectedNodeKey === nodeKey;
        const existingAppData = vueApps.get(nodeKey);
        
        // 判断是否需要重新挂载
        const needsRemount = !existingAppData || 
          forceRemount ||
          imageNodeData.src !== existingAppData.lastData?.src ||
          imageNodeData.width !== existingAppData.lastData?.width;
        
        // 只有选择状态变化时，才需要重新挂载
        const selectionChanged = (lastSelectedNodeKey === nodeKey && !isSelected) || 
                                 (lastSelectedNodeKey !== nodeKey && isSelected);
        
        if (needsRemount || selectionChanged) {
          // 卸载旧组件
          if (existingAppData) {
            existingAppData.app.unmount();
          }
          
          // 创建新的 Vue 应用实例
          const props = createComponentProps(nodeKey, imageNodeData, isSelected);
          const app = createApp(ImageComponent, props);
          
          // 清空容器并挂载
          element.innerHTML = '';
          element.appendChild(decorator);
          app.mount(decorator);
          
          vueApps.set(nodeKey, { 
            app, 
            mounted: true, 
            lastData: { ...imageNodeData, isSelected } 
          });
        }
      }
    }
  };

  // 初始化时立即挂载一次
  setTimeout(() => {
    mountDecorators(true);
  }, 0);

  return mergeRegister(
    // 监听选择变化
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateSelectedNodeKey();
        requestAnimationFrame(() => {
          mountDecorators();
        });
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    // 监听装饰器更新
    editor.registerDecoratorListener<HTMLElement>(() => {
      // 使用 requestAnimationFrame 确保 DOM 更新后再挂载
      requestAnimationFrame(() => {
        mountDecorators();
        // 再次延迟刷新，确保在只读模式切换等场景下也能正确显示
        setTimeout(() => {
          mountDecorators(true);
        }, 100);
      });
    }),
    editor.registerCommand<InsertImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const selection = $getSelection();
        
        if ($isNodeSelection(selection)) {
          // 如果是节点选择，直接替换
          const imageNode = $createImageNode(payload);
          const nodes = selection.getNodes();
          if (nodes[0]) {
            nodes[0].replace(imageNode);
          }
          return true;
        }
        
        if ($isRangeSelection(selection)) {
          // 如果是范围选择，在当前位置插入图片
          const anchorNode = selection.anchor.getNode();
          
          // 获取当前所在的段落
          let targetNode = anchorNode;
          while (targetNode && !$isParagraphNode(targetNode) && !$isRootOrShadowRoot(targetNode)) {
            const parent = targetNode.getParent();
            if (!parent) break;
            targetNode = parent;
          }
          
          if ($isParagraphNode(targetNode)) {
            const textContent = targetNode.getTextContent();
            
            // 如果段落为空或只有空白，直接在该段落插入图片
            if (!textContent || textContent.trim() === '') {
              targetNode.clear();
              const imageNode = $createImageNode(payload);
              targetNode.append(imageNode);
              targetNode.selectEnd();
            } else {
              // 如果段落有内容，在后面插入新段落
              const imageParagraph = $createParagraphNode();
              const imageNode = $createImageNode(payload);
              imageParagraph.append(imageNode);
              targetNode.insertAfter(imageParagraph);
              imageParagraph.selectEnd();
            }
            
            return true;
          }
        }
        
        // 默认行为
        const imageNode = $createImageNode(payload);
        $insertNodes([imageNode]);
        if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
          $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
        }
        
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<DragEvent>(
      DRAGSTART_COMMAND,
      (event) => {
        return $onDragStart(event);
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand<DragEvent>(
      DRAGOVER_COMMAND,
      (event) => {
        return $onDragover(event);
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand<DragEvent>(
      DROP_COMMAND,
      (event) => {
        return $onDrop(event, editor);
      },
      COMMAND_PRIORITY_HIGH,
    ),
    // 清理函数
    () => {
      // 卸载所有 Vue 应用
      for (const { app } of vueApps.values()) {
        app.unmount();
      }
      vueApps.clear();
    },
  );
}

const TRANSPARENT_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const img = document.createElement('img');
img.src = TRANSPARENT_IMAGE;

function $onDragStart(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData('text/plain', '_');
  dataTransfer.setDragImage(img, 0, 0);
  dataTransfer.setData(
    'application/x-lexical-drag',
    JSON.stringify({
      data: {
        altText: node.getAltText(),
        height: node.__height,
        key: node.getKey(),
        maxWidth: node.__maxWidth,
        src: node.getSrc(),
        width: node.__width,
      },
      type: 'image',
    }),
  );
  return true;
}

function $onDragover(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }
  return true;
}

function $onDrop(
  event: DragEvent,
  editor: LexicalEditor,
): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    // 外部文件拖拽由 DragDropPastePlugin 处理
    return false;
  }
  
  const data = getDragImageData(event);
  if (!data) {
    return false;
  }
  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
  }
  return true;
}

function $getImageNodeInSelection(): ImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | InsertImagePayload {
  const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
  if (!dragData) {
    return null;
  }
  const {type, data} = JSON.parse(dragData);
  if (type !== 'image') {
    return null;
  }
  return data;
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    isHTMLElement(target) &&
    !target.closest('code, span.editor-image') &&
    isHTMLElement(target.parentElement) &&
    target.parentElement.closest('div.ContentEditable__root')
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const domSelection = getDOMSelectionFromTarget(event.target);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error(`Cannot get the selection when dragging`);
  }
  return range;
}

