/**
 * Markdown 实时转换插件
 * 基于 Lexical 官方的 registerMarkdownShortcuts 实现
 * 当在普通段落中输入 markdown 格式（如 # 标题）后按空格时，立即转换为对应的节点格式
 */

import { registerMarkdownShortcuts } from '@lexical/markdown';
import type { LexicalEditor } from 'lexical';
import { CUSTOM_TRANSFORMERS } from '../utils/markdownTransformers';

export function useMarkdownShortcutPlugin(editor: LexicalEditor) {
  return registerMarkdownShortcuts(editor, CUSTOM_TRANSFORMERS);
}

