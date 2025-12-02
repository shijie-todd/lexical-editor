/**
 * 自定义 Markdown Transformers
 * 用于支持 ImageNode 和 HorizontalRuleNode
 */

import type {ElementTransformer} from '@lexical/markdown';
import {
  HEADING,
  ORDERED_LIST,
  QUOTE,
  UNORDERED_LIST,
  CHECK_LIST,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  INLINE_CODE,
  STRIKETHROUGH,
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
 */
export const CUSTOM_TRANSFORMERS = [
  HEADING,
  QUOTE,
  ORDERED_LIST,
  UNORDERED_LIST,
  CHECK_LIST,
  HORIZONTAL_RULE,
  IMAGE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  INLINE_CODE,
  STRIKETHROUGH,
];

