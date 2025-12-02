/**
 * ImagesPlugin - 图片插件（Vue 版本）
 */

import {
  $wrapNodeInElement,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  getDOMSelectionFromTarget,
  isHTMLElement,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical';

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

export function useImagesPlugin(editor: LexicalEditor) {
  if (!editor.hasNodes([ImageNode])) {
    throw new Error('ImagesPlugin: ImageNode not registered on editor');
  }

  // 手动挂载 DecoratorNode 的 decorate 返回的元素
  const mountDecorators = () => {
    const decorators = editor.getDecorators<HTMLElement>();
    for (const nodeKey in decorators) {
      const element = editor.getElementByKey(nodeKey);
      const decorator = decorators[nodeKey];
      
      if (element && decorator && element instanceof HTMLElement) {
        // 清空容器
        element.innerHTML = '';
        // 挂载 decorate 返回的元素
        element.appendChild(decorator);
      }
    }
  };

  return mergeRegister(
    // 监听装饰器更新
    editor.registerDecoratorListener<HTMLElement>(() => {
      // 使用 requestAnimationFrame 确保 DOM 更新后再挂载
      requestAnimationFrame(() => {
        mountDecorators();
      });
    }),
    editor.registerCommand<InsertImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        console.log('INSERT_IMAGE_COMMAND payload:', payload);
        const imageNode = $createImageNode(payload);
        console.log('Created ImageNode:', imageNode, 'src:', imageNode.getSrc());
        $insertNodes([imageNode]);
        if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
          $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
        }
        console.log('Image node inserted');
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

