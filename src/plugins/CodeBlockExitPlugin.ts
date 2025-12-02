import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from 'lexical';
import { $isCodeNode } from '@lexical/code';
import { mergeRegister } from '@lexical/utils';

/**
 * 代码块退出插件
 * 在代码块的空行按回车时，退出代码块并创建新段落
 */
export function useCodeBlockExitPlugin(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        
        // 检查是否在代码块中
        const codeNode = anchorNode.getParent();
        if (!$isCodeNode(codeNode)) {
          return false;
        }

        // 检查当前行是否为空
        const isCollapsed = selection.isCollapsed();
        if (!isCollapsed) {
          return false; // 有选区时正常处理
        }

        // 获取当前文本节点
        let textNode = anchorNode;
        if (!$isTextNode(textNode)) {
          textNode = anchorNode.getFirstChild();
          if (!$isTextNode(textNode)) {
            return false;
          }
        }

        // 检查当前行的内容
        const textContent = textNode.getTextContent();
        const offset = selection.anchor.offset;

        // 如果光标在空行上（或者当前文本为空）
        if (textContent === '' || (textContent.trim() === '' && offset === textContent.length)) {
          event?.preventDefault();
          
          // 退出代码块，创建新段落
          editor.update(() => {
            // 删除空的文本节点
            textNode.remove();
            
            // 在代码块后插入新段落
            const paragraph = $createParagraphNode();
            codeNode.insertAfter(paragraph);
            paragraph.select();
          });
          
          return true; // 阻止默认回车行为
        }

        return false; // 正常处理回车
      },
      COMMAND_PRIORITY_LOW,
    ),
  );
}

