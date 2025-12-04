/**
 * DragDropPastePlugin - 拖拽和粘贴上传插件（Vue 版本）
 * 参考 @lexical-playground 的实现
 */

import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {isMimeType, mediaFileReader} from '@lexical/utils';
import {
  COMMAND_PRIORITY_LOW,
  type LexicalEditor,
} from 'lexical';

import {INSERT_IMAGE_COMMAND, type ImageUploadHandler} from './ImagesPlugin';
import { loadImageAndCalculateSize } from '../utils/imageUtils';

const ACCEPTABLE_IMAGE_TYPES = [
  'image/',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/webp',
];

export interface DragDropPastePluginOptions {
  /**
   * 自定义图片上传方法
   * 如果不提供，将使用默认的 base64 方式（readAsDataURL）
   */
  uploadImage?: ImageUploadHandler;
}

export function useDragDropPastePlugin(
  editor: LexicalEditor,
  options: DragDropPastePluginOptions = {},
) {
  const {uploadImage} = options;

  return editor.registerCommand(
    DRAG_DROP_PASTE,
      (files: Array<File>) => {
      (async () => {
        try {
          // 使用 mediaFileReader 读取文件（它接受 Array<File>）
          const filesResult = await mediaFileReader(
            files,
            ACCEPTABLE_IMAGE_TYPES.flatMap((x) => x),
          );
          
          for (const {file, result} of filesResult) {
            if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
              let src: string;
              
              if (uploadImage) {
                // 使用自定义上传方法
                src = await uploadImage(file);
              } else {
                // 使用 mediaFileReader 返回的 result（已经是 base64）
                src = result;
              }
              
              // 加载图片并获取尺寸
              const { width, height } = await loadImageAndCalculateSize(src, 500);
              
              editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                altText: file.name,
                src,
                width,
                height,
                maxWidth: 500,
              });
            }
          }
        } catch (error) {
          console.error('Failed to process drag/drop/paste files:', error);
        }
      })();
      return true;
    },
    COMMAND_PRIORITY_LOW,
  );
}

