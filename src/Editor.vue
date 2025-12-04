<template>
  <div class="editor-container">
    <div ref="editorRef" class="editor-scroller">
      <div 
        ref="contentEditableRef" 
        class="editor" 
        :contenteditable="!readonly" 
        @click="handleEditorClick"
        @focus="handleEditorFocus"
        @blur="handleEditorBlur"
      ></div>
      <!-- 表格操作菜单 -->
      <TableActionMenu
        v-if="!readonly"
        :show="tableActionMenuState.show"
        :x="tableActionMenuState.x"
        :y="tableActionMenuState.y"
        :tableCellNode="tableActionMenuState.tableCellNode"
        :editor="editor"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import './styles/editor.scss';
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { createEditor, $getRoot, $createParagraphNode } from 'lexical';
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text';
import { ListNode, ListItemNode, registerCheckList } from '@lexical/list';
import { LinkNode, AutoLinkNode, TOGGLE_LINK_COMMAND, $toggleLink } from '@lexical/link';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { ParagraphNode, TextNode } from 'lexical';
import { HorizontalRuleNode } from './nodes/HorizontalRuleNode';
import { ImageNode } from './nodes/ImageNode';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { useImagesPlugin } from './plugins/ImagesPlugin';
import { useComponentPickerPlugin } from './plugins/ComponentPickerPlugin';
import { useBlockMenuPlugin } from './plugins/BlockMenuPlugin';
import { useListPlugin } from './plugins/ListPlugin';
import { useDragDropPastePlugin } from './plugins/DragDropPastePlugin';
import { useFloatingTextFormatToolbarPlugin } from './plugins/FloatingTextFormatToolbarPlugin';
import { useFloatingLinkEditorPlugin } from './plugins/FloatingLinkEditorPlugin';
import { useClearFormatOnEnterPlugin } from './plugins/ClearFormatOnEnterPlugin';
import { useCodeBlockExitPlugin } from './plugins/CodeBlockExitPlugin';
import { useTablePlugin } from './plugins/TablePlugin';
import { useTableActionMenuPlugin, type TableActionMenuState } from './plugins/TableActionMenuPlugin';
import TableActionMenu from './components/TableActionMenu.vue';
import { fileToBase64 } from './utils/imageUpload';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {CUSTOM_TRANSFORMERS} from './utils/markdownTransformers';

const props = withDefaults(defineProps<{
  modelValue?: string;
  readonly?: boolean;
}>(), {
  modelValue: '',
  readonly: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'focus': [];
  'blur': [];
  'click-img': [url: string];
}>();

const editorRef = ref<HTMLDivElement>();
const contentEditableRef = ref<HTMLDivElement>();
const editor = ref<any>(null);
let cleanupImages: (() => void) | undefined;
let cleanupPicker: (() => void) | undefined;
let cleanupBlockMenu: (() => void) | undefined;
let cleanupListPlugin: (() => void) | undefined;
let cleanupDragDropPaste: (() => void) | undefined;
let cleanupFloatingToolbar: (() => void) | undefined;
let cleanupLinkEditor: (() => void) | undefined;
let cleanupClearFormatOnEnter: (() => void) | undefined;
let cleanupCodeBlockExit: (() => void) | undefined;
let cleanupTable: (() => void) | undefined;
let cleanupTableActionMenu: (() => void) | undefined;

// 用于防止循环更新的标志
let isUpdatingFromProps = false;

// 链接编辑模式状态
const isLinkEditMode = ref(false);

// 表格操作菜单状态
const tableActionMenuState = ref<TableActionMenuState>({
  show: false,
  x: 0,
  y: 0,
  tableCellNode: null,
});

const theme = {
  paragraph: 'editor-paragraph',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  list: {
    ul: 'editor-list-ul',
    olDepth: [
      'editor-list-ol',
      'editor-list-ol2',
      'editor-list-ol3',
      'editor-list-ol4',
      'editor-list-ol5',
    ],
    listitem: 'editor-list-item',
    listitemChecked: 'editor-listitem-checked',
    listitemUnchecked: 'editor-listitem-unchecked',
    nested: {
      listitem: 'editor-nested-list-item',
    },
    checklist: 'editor-list-check',
  },
  indent: 'editor-indent',
  quote: 'editor-quote',
  hr: 'editor-hr',
  image: 'editor-image',
  code: 'editor-code',
  table: 'editor-table',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
};

const getEditorConfig = () => {
  return {
    namespace: 'VueEditor',
    theme,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      CodeNode,
      CodeHighlightNode,
      ParagraphNode,
      TextNode,
      QuoteNode,
      HorizontalRuleNode,
      ImageNode,
      TableNode,
      TableCellNode,
      TableRowNode,
    ],
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
  };
};

const initEditor = () => {
  if (!editorRef.value || !contentEditableRef.value) return;

  const config = getEditorConfig();
  editor.value = createEditor(config);

  // 注册 RichText 功能
  registerRichText(editor.value);


  // 注册链接命令处理器
  editor.value.registerCommand(
    TOGGLE_LINK_COMMAND,
    (payload: string | { url: string; target?: string; rel?: string; title?: string } | null) => {
      editor.value.update(() => {
        if (payload === null) {
          $toggleLink(null);
        } else if (typeof payload === 'string') {
          $toggleLink(payload);
        } else {
          const { url, target, rel, title } = payload;
          $toggleLink(url, { target, rel, title });
        }
      });
      return true;
    },
    0, // COMMAND_PRIORITY_LOW
  );

  // 初始化编辑器状态
  editor.value.update(() => {
    const root = $getRoot();
    root.clear();
    
    // 如果提供了 modelValue（markdown），则从 markdown 转换
    if (props.modelValue) {
      $convertFromMarkdownString(props.modelValue, CUSTOM_TRANSFORMERS);
    } else {
      // 否则添加一个空段落
      const paragraph = $createParagraphNode();
      root.append(paragraph);
    }
  }, { discrete: true });

  // 设置根元素
  editor.value.setRootElement(contentEditableRef.value);

  // 自定义图片上传方法
  const uploadImage = async (file: File): Promise<string> => {
    // return 'http://localhost:5173/vite.svg'
    return fileToBase64(file);
  };

  // 注册插件
  // 图片插件
  cleanupImages = useImagesPlugin(editor.value);

  // 拖拽和粘贴上传插件（处理拖拽和粘贴的图片文件）
  cleanupDragDropPaste = useDragDropPastePlugin(editor.value, {
    uploadImage, // 传入自定义上传方法
  });

  // Slash command 插件（仅在非只读模式下启用）
  if (!props.readonly) {
    cleanupPicker = useComponentPickerPlugin(editor.value, {
      uploadImage, // 传入自定义上传方法（与 DragDropPastePlugin 使用同一个）
    });

    // 块菜单插件（加号按钮，仅在非只读模式下启用）
    cleanupBlockMenu = useBlockMenuPlugin(
      editor.value,
      editorRef.value,
    );
  }

  // 列表插件（处理列表结构、Tab 键缩进等）
  // 使用官方实现：registerList + registerTabIndentation
  cleanupListPlugin = useListPlugin(editor.value, {
    hasStrictIndent: false,
    maxIndent: 7, // 与 playground 保持一致
  });

  // 注册 Checklist 功能
  registerCheckList(editor.value);

  // 回车清除格式插件（按回车时不继承文本格式）
  cleanupClearFormatOnEnter = useClearFormatOnEnterPlugin(editor.value);

  // 代码块退出插件（在代码块空行按回车时退出）
  cleanupCodeBlockExit = useCodeBlockExitPlugin(editor.value);

  // 表格插件
  cleanupTable = useTablePlugin(editor.value);

  // 表格操作菜单插件
  if (!props.readonly) {
    cleanupTableActionMenu = useTableActionMenuPlugin(editor.value, {
      onStateChange: (state) => {
        tableActionMenuState.value = state;
      },
    });
  }

  // 浮动文本格式工具栏（包含链接按钮）
  if (!props.readonly) {
    cleanupFloatingToolbar = useFloatingTextFormatToolbarPlugin(editor.value, {
      setIsLinkEditMode: (value: boolean) => {
        isLinkEditMode.value = value;
      },
    });

    // 浮动链接编辑器
    cleanupLinkEditor = useFloatingLinkEditorPlugin(editor.value, {
      getIsLinkEditMode: () => isLinkEditMode.value,
      setIsLinkEditMode: (value: boolean) => {
        isLinkEditMode.value = value;
      },
    });
  }

  // 设置只读模式
  if (props.readonly) {
    editor.value.setEditable(false);
    
    // 在只读模式下，让所有链接在新窗口打开
    setupReadonlyLinkBehavior();
  }

  // 监听编辑器更新，同步到 modelValue
  editor.value.registerUpdateListener(({editorState}: {editorState: any}) => {
    if (props.readonly || isUpdatingFromProps) return; // 只读模式或正在从 props 更新时不触发
    
    editorState.read(() => {
      const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
      emit('update:modelValue', markdown);
    });
  });

  // 确保编辑器可以聚焦
  nextTick(() => {
    if (contentEditableRef.value && !props.readonly) {
      contentEditableRef.value.focus();
    }
  });
};

const handleEditorClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  
  // 检测图片点击
  const img = target.closest('img');
  if (img && img.src) {
    emit('click-img', img.src);
    return;
  }
  
  // 在只读模式下，处理链接点击
  if (props.readonly) {
    const link = target.closest('a');
    if (link && link.href) {
      event.preventDefault();
      window.open(link.href, '_blank', 'noopener,noreferrer');
      return;
    }
  }
  
  // 确保点击时编辑器获得焦点
  if (contentEditableRef.value && event.target === contentEditableRef.value) {
    contentEditableRef.value.focus();
  }
};

const handleEditorFocus = () => {
  emit('focus');
};

const handleEditorBlur = () => {
  emit('blur');
};

// 设置只读模式下的链接行为
const setupReadonlyLinkBehavior = () => {
  if (!contentEditableRef.value) return;
  
  // 使用 MutationObserver 监听 DOM 变化，为所有链接添加 target="_blank"
  const observer = new MutationObserver(() => {
    if (!contentEditableRef.value) return;
    
    const links = contentEditableRef.value.querySelectorAll('a');
    links.forEach((link) => {
      if (!link.hasAttribute('data-readonly-processed')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('data-readonly-processed', 'true');
      }
    });
  });
  
  // 初始设置所有现有链接
  const links = contentEditableRef.value.querySelectorAll('a');
  links.forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('data-readonly-processed', 'true');
  });
  
  // 监听 DOM 变化
  observer.observe(contentEditableRef.value, {
    childList: true,
    subtree: true,
  });
  
  // 保存 observer 以便清理
  (contentEditableRef.value as any).__linkObserver = observer;
};

// 清理函数
onUnmounted(() => {
  cleanupImages?.();
  cleanupPicker?.();
  cleanupBlockMenu?.();
  cleanupListPlugin?.();
  cleanupDragDropPaste?.();
  cleanupFloatingToolbar?.();
  cleanupLinkEditor?.();
  cleanupClearFormatOnEnter?.();
  cleanupCodeBlockExit?.();
  cleanupTable?.();
  cleanupTableActionMenu?.();
  
  // 清理链接观察器
  if (contentEditableRef.value && (contentEditableRef.value as any).__linkObserver) {
    (contentEditableRef.value as any).__linkObserver.disconnect();
  }
  
  editor.value?.setRootElement(null);
});


// 监听 modelValue 变化，同步到编辑器
watch(
  () => props.modelValue,
  (newValue) => {
    if (!editor.value) return;
    
    isUpdatingFromProps = true;
    editor.value.update(() => {
      const root = $getRoot();
      const currentMarkdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
      
      // 只有当 markdown 内容不同时才更新，避免循环更新
      if (currentMarkdown !== newValue) {
        root.clear();
        if (newValue) {
          $convertFromMarkdownString(newValue, CUSTOM_TRANSFORMERS);
        } else {
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        }
      }
    }, { discrete: true });
    
    // 使用 nextTick 确保更新完成后再重置标志
    nextTick(() => {
      isUpdatingFromProps = false;
    });
  },
);

// 监听 readonly 变化
watch(
  () => props.readonly,
  (newValue) => {
    if (editor.value) {
      editor.value.setEditable(!newValue);
      
      // 如果切换到只读模式，设置链接行为
      if (newValue) {
        nextTick(() => {
          setupReadonlyLinkBehavior();
        });
      } else {
        // 如果切换到编辑模式，移除链接的 target 属性
        if (contentEditableRef.value) {
          const links = contentEditableRef.value.querySelectorAll('a');
          links.forEach((link) => {
            link.removeAttribute('data-readonly-processed');
            // 保留 target 和 rel，因为用户可能需要它们
          });
          
          // 断开观察器
          if ((contentEditableRef.value as any).__linkObserver) {
            (contentEditableRef.value as any).__linkObserver.disconnect();
            delete (contentEditableRef.value as any).__linkObserver;
          }
        }
      }
    }
  },
);

// 监听 isLinkEditMode 变化，触发编辑器更新
watch(isLinkEditMode, () => {
  if (editor.value) {
    // 触发编辑器状态更新以重新渲染链接编辑器
    editor.value.getEditorState().read(() => {
      // 仅触发更新
    });
  }
});

onMounted(() => {
  initEditor();
});
</script>

<style scoped>
.editor-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.editor-scroller {
  min-height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  background: white;
  position: relative;
}

.editor {
  outline: none;
  min-height: 150px;
  position: relative;
  cursor: text;
  color: #333;
  font-size: 16px;
  line-height: 1.6;
  padding-left: 32px;
}

.editor:focus {
  outline: none;
}

.editor[contenteditable="true"] {
  -webkit-user-select: text;
  user-select: text;
}

/* 全局样式（主题样式、工具栏样式等）已移至 src/styles/editor.scss */
</style>
