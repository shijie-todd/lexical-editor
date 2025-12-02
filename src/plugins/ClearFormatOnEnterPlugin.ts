import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';

/**
 * 清除回车时的格式插件
 * 按回车换行时，清除新行的文本格式（加粗、斜体、下划线、删除线、行内代码）
 */
export function useClearFormatOnEnterPlugin(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        // 记录当前的格式状态
        const formats: TextFormatType[] = [];
        if (selection.hasFormat('bold')) formats.push('bold');
        if (selection.hasFormat('italic')) formats.push('italic');
        if (selection.hasFormat('underline')) formats.push('underline');
        if (selection.hasFormat('strikethrough')) formats.push('strikethrough');
        if (selection.hasFormat('code')) formats.push('code');

        if (formats.length === 0) {
          // 没有格式，正常处理
          return false;
        }

        // 有格式，在回车后清除
        // 使用 setTimeout 确保回车操作完成后再清除格式
        setTimeout(() => {
          editor.update(() => {
            const newSelection = $getSelection();
            if ($isRangeSelection(newSelection)) {
              console.log('清除前的格式:', formats);
              console.log('新选区是否有格式:', {
                bold: newSelection.hasFormat('bold'),
                italic: newSelection.hasFormat('italic'),
                underline: newSelection.hasFormat('underline'),
                strikethrough: newSelection.hasFormat('strikethrough'),
                code: newSelection.hasFormat('code'),
              });
              
              // 通过 dispatch 命令来切换（关闭）每个格式
              formats.forEach((format) => {
                if (newSelection.hasFormat(format)) {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
                  console.log('已关闭格式:', format);
                }
              });
            }
          });
        }, 50); // 增加延迟到 50ms

        return false; // 让回车正常执行
      },
      COMMAND_PRIORITY_LOW,
    ),
  );
}

