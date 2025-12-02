/**
 * 自定义 Markdown Transformers
 * 用于支持 ImageNode、HorizontalRuleNode 和下划线格式
 */

import type {ElementTransformer, TextFormatTransformer} from '@lexical/markdown';
import {
  HEADING,
  ORDERED_LIST,
  QUOTE,
  UNORDERED_LIST,
  CHECK_LIST,
  CODE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  INLINE_CODE,
  STRIKETHROUGH,
  LINK,
} from '@lexical/markdown';
import {$createImageNode, $isImageNode, ImageNode} from '../nodes/ImageNode';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '../nodes/HorizontalRuleNode';
import type {ElementNode, LexicalNode} from 'lexical';

/**
 * Horizontal Rule Transformer
 * 支持 `---` 或 `***` 转换为分割线
 */
export const HORIZONTAL_RULE: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    if ($isHorizontalRuleNode(node)) {
      return '---\n';
    }
    return null;
  },
  regExp: /^(---|\*\*\*)$/,
  replace: (parentNode: ElementNode, children: Array<LexicalNode>, match: Array<string>) => {
    const hrNode = $createHorizontalRuleNode();
    parentNode.replace(hrNode);
    hrNode.selectNext();
  },
  type: 'element',
};

/**
 * Underline Transformer
 * 支持 `++text++` 格式转换为下划线
 * 注意：这是自定义语法，不是标准 Markdown
 */
export const UNDERLINE: TextFormatTransformer = {
  format: ['underline'],
  tag: '++',
  type: 'text-format',
};

/**
 * Image Transformer
 * 支持 `![alt text](url)` 格式
 */
export const IMAGE: ElementTransformer = {
  dependencies: [ImageNode],
  export: (node: LexicalNode) => {
    if ($isImageNode(node)) {
      const altText = node.getAltText() || '';
      const src = node.getSrc();
      return `![${altText}](${src})\n`;
    }
    return null;
  },
  regExp: /^!\[([^\]]*)\]\(([^)]+)\)$/,
  replace: (
    parentNode: ElementNode,
    children: Array<LexicalNode>,
    match: Array<string>,
    isImport: boolean,
  ) => {
    const altText = match[1] || '';
    const src = match[2] || '';
    if (src) {
      const imageNode = $createImageNode({
        altText,
        src,
      });
      parentNode.replace(imageNode);
      if (!isImport) {
        imageNode.selectNext();
      }
      return true;
    }
    return false;
  },
  type: 'element',
};

/**
 * 自定义 Transformers 集合
 * 包含所有需要的 transformers
 * 
 * 注意：文本格式 transformer 的顺序很重要：
 * - 行内代码应该放在最前面，因为它会阻止内部的转换
 * - 更长的标签应该在更短的标签之前（如 ** 或 __ 应该在 * 或 _ 之前）
 */
export const CUSTOM_TRANSFORMERS = [
  // 块级元素 transformers
  HEADING,
  QUOTE,
  CODE,               // 代码块（```code```）
  ORDERED_LIST,
  UNORDERED_LIST,
  CHECK_LIST,
  HORIZONTAL_RULE,
  IMAGE,
  LINK,
  // 文本格式 transformers（按优先级排序）
  INLINE_CODE,        // `行内代码` - 优先，避免内部转换
  BOLD_STAR,          // **粗体**
  BOLD_UNDERSCORE,    // __粗体__
  ITALIC_STAR,        // *斜体*
  ITALIC_UNDERSCORE,  // _斜体_
  STRIKETHROUGH,      // ~~删除线~~
  UNDERLINE,          // ++下划线++（自定义）
];

