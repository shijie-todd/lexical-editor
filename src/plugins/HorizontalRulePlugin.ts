/**
 * HorizontalRulePlugin - 分割线插件
 * 处理分割线选中状态的样式更新
 */

import {
  $getSelection,
  $isNodeSelection,
  type LexicalEditor,
} from 'lexical';
import { $isHorizontalRuleNode } from '../nodes/HorizontalRuleNode';

export function useHorizontalRulePlugin(editor: LexicalEditor) {
  const isSelectedClassName = editor._config.theme.hrSelected ?? 'selected';

  // 更新选中状态的样式
  const updateSelectedStyle = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      
      // 清除所有 HR 元素的选中状态
      const allHRs = editor.getRootElement()?.querySelectorAll('hr');
      allHRs?.forEach((hr) => {
        hr.classList.remove(isSelectedClassName);
      });

      // 如果是节点选择，添加选中状态
      if ($isNodeSelection(selection)) {
        const nodes = selection.getNodes();
        nodes.forEach((node) => {
          if ($isHorizontalRuleNode(node)) {
            const hrElement = editor.getElementByKey(node.getKey());
            if (hrElement) {
              hrElement.classList.add(isSelectedClassName);
            }
          }
        });
      }
    });
  };

  // 监听编辑器更新，更新选中状态样式
  return editor.registerUpdateListener(() => {
    updateSelectedStyle();
  });
}

