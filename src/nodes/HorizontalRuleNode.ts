/**
 * HorizontalRuleNode - 分割线节点
 * 使用 DecoratorNode 防止内部输入内容
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import {
  $applyNodeReplacement,
  DecoratorNode,
} from 'lexical';

export type SerializedHorizontalRuleNode = Spread<
  {
    type: 'horizontalrule';
  },
  SerializedLexicalNode
>;

export class HorizontalRuleNode extends DecoratorNode<null> {
  static getType(): string {
    return 'horizontalrule';
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const hr = document.createElement('hr');
    const className = config.theme.hr;
    if (className !== undefined) {
      hr.className = className;
    }
    return hr;
  }

  updateDOM(): false {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      hr: (node: Node) => ({
        conversion: $convertHorizontalRuleElement,
        priority: 0,
      }),
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('hr');
    return {element};
  }

  static importJSON(
    serializedNode: SerializedHorizontalRuleNode,
  ): HorizontalRuleNode {
    return $createHorizontalRuleNode();
  }

  exportJSON(): SerializedHorizontalRuleNode {
    return {
      ...super.exportJSON(),
      type: 'horizontalrule',
      version: 1,
    };
  }

  getTextContent(): string {
    return '\n';
  }

  isInline(): false {
    return false;
  }

  // DecoratorNode 必须实现 decorate 方法
  decorate(): null {
    return null;
  }

  // 允许通过键盘选择（按 Delete/Backspace 时会先选中）
  isKeyboardSelectable(): true {
    return true;
  }
}

function $convertHorizontalRuleElement(): DOMConversionOutput {
  return {node: $createHorizontalRuleNode()};
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return $applyNodeReplacement(new HorizontalRuleNode());
}

export function $isHorizontalRuleNode(
  node: LexicalNode | null | undefined,
): node is HorizontalRuleNode {
  return node instanceof HorizontalRuleNode;
}

