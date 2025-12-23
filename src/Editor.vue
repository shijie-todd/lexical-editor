<template>
  <div class="editor-container">
    <div ref="editorRef" class="editor-scroller beauty-scroll">
      <!-- Placeholder -->
      <div 
        v-if="isEditorEmpty && !readonly && placeholder" 
        class="editor-placeholder"
      >
        {{ placeholder }}
      </div>
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
import { CodeNode } from '@lexical/code';
import { ParagraphNode, TextNode } from 'lexical';
// import { uploadFileToCos } from "@/utils/upload-helper";
import { fileToBase64 } from './utils/imageUpload';
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
import { useTableHoverActionsPlugin } from './plugins/TableHoverActionsPlugin';
import { useHorizontalRulePlugin } from './plugins/HorizontalRulePlugin';
import { useMarkdownShortcutPlugin } from './plugins/MarkdownShortcutPlugin';
import { useCodeActionMenuPlugin } from './plugins/CodeActionMenuPlugin';
import TableActionMenu from './components/TableActionMenu.vue';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {CUSTOM_TRANSFORMERS} from './utils/markdownTransformers';

const props = withDefaults(defineProps<{
  defaultValue?: string;
  readonly?: boolean;
  placeholder?: string;
  autofocus?: boolean;
  defaultSelection?: 'rootStart' | 'rootEnd';
}>(), {
  defaultValue: '',
  readonly: false,
  placeholder: '输入 / 选择插入内容...',
  autofocus: false,
  defaultSelection: 'rootStart',
});

const emit = defineEmits<{
  'focus': [];
  'blur': [];
  'click-img': [url: string];
  'change': [value: string];
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
let cleanupTableHoverActions: (() => void) | undefined;
let cleanupHorizontalRule: (() => void) | undefined;
let cleanupCodeActionMenu: (() => void) | undefined;
let cleanupMarkdownShortcut: (() => void) | undefined;


// 链接编辑模式状态
const isLinkEditMode = ref(false);

// 表格操作菜单状态
const tableActionMenuState = ref<TableActionMenuState>({
  show: false,
  x: 0,
  y: 0,
  tableCellNode: null,
});

// 编辑器是否为空（用于显示 placeholder）
const isEditorEmpty = ref(true);

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
  hrSelected: 'selected',
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

  // 设置根元素（必须在内容初始化之前设置）
  editor.value.setRootElement(contentEditableRef.value);

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
    
    // 如果提供了 defaultValue（markdown），则从 markdown 转换
    if (props.defaultValue && props.defaultValue.trim()) {
      $convertFromMarkdownString(props.defaultValue, CUSTOM_TRANSFORMERS, undefined, true);
      // 手动更新 isEditorEmpty 状态
      isEditorEmpty.value = false;
    } else {
      // 否则添加一个空段落
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      isEditorEmpty.value = true;
    }
  });

  // 自定义图片上传方法（示例）
  const uploadImage = async (file: File): Promise<string> => {
    // try {
    //   const url = await uploadFileToCos(file)
    //   return url
    // } catch {
      return fileToBase64(file);
    // }
  };
  // 注册插件
  // 图片插件
  cleanupImages = useImagesPlugin(editor.value, props.readonly);

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
    enableTabIndentation: true, // 启用 Tab 键缩进功能（用于有序和无序列表）
    disableChecklistTabIndentation: true, // 仅禁用 checklist 的 Tab 键功能
  });

  // 注册 Checklist 功能
  registerCheckList(editor.value);

  // 回车清除格式插件（按回车时不继承文本格式）
  cleanupClearFormatOnEnter = useClearFormatOnEnterPlugin(editor.value);

  // 代码块退出插件（在代码块空行按回车时退出）
  cleanupCodeBlockExit = useCodeBlockExitPlugin(editor.value);

  // 表格插件（使用官方实现，提供完整的键盘导航和表格完整性转换）
  cleanupTable = useTablePlugin(editor.value, {
    hasCellMerge: true,
    hasCellBackgroundColor: true,
    hasTabHandler: true,
    hasHorizontalScroll: false,
    hasNestedTables: false,
  });

  // 表格操作菜单插件
  if (!props.readonly) {
    cleanupTableActionMenu = useTableActionMenuPlugin(editor.value, {
      onStateChange: (state) => {
        tableActionMenuState.value = state;
      },
    });

    // 表格悬浮操作插件（在表格边缘显示添加行/列按钮）
    if (editorRef.value) {
      cleanupTableHoverActions = useTableHoverActionsPlugin(
        editor.value,
        editorRef.value,
      );
    }
  }

  // 分割线插件（处理选中状态样式）
  cleanupHorizontalRule = useHorizontalRulePlugin(editor.value);

  // 代码块操作菜单插件（语言选择、复制、格式化）
  if (!props.readonly && editorRef.value) {
    cleanupCodeActionMenu = useCodeActionMenuPlugin(editor.value, {
      anchorElem: editorRef.value,
    });
  }

  // Markdown 实时转换插件（仅在非只读模式下启用）
  if (!props.readonly) {
    cleanupMarkdownShortcut = useMarkdownShortcutPlugin(editor.value);
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

  // 自动聚焦功能（仅在非只读模式下启用）
  if (props.autofocus && !props.readonly) {
    // 使用 nextTick 确保 DOM 已经渲染完成
    nextTick(() => {
      editor.value.focus(
        () => {
          // If we try and move selection to the same point with setBaseAndExtent, it won't
          // trigger a re-focus on the element. So in the case this occurs, we'll need to correct it.
          // Normally this is fine, Selection API !== Focus API, but for the intents of the naming
          // of this plugin, which should preserve focus too.
          const activeElement = document.activeElement;
          const rootElement = editor.value.getRootElement() as HTMLDivElement;
          if (
            rootElement !== null &&
            (activeElement === null || !rootElement.contains(activeElement))
          ) {
            // Note: preventScroll won't work in Webkit.
            rootElement.focus({preventScroll: true});
          }
        },
        {defaultSelection: props.defaultSelection},
      );
    });
  }

  // 监听编辑器更新（仅内部内容变化时触发）
  editor.value.registerUpdateListener(({editorState}: {editorState: any}) => {
    editorState.read(() => {
      const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS, undefined, true);
      
      // 判断编辑器是否为空：检查 markdown 内容长度
      isEditorEmpty.value = markdown.trim().length === 0;
      
      // 只读模式下不触发 change 事件
      if (!props.readonly) {
        emit('change', markdown);
      }
    });
  });
};

const handleEditorClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  
  // 检测图片点击
  const img = target.closest('img');
  if (img && img.src) {
    event.preventDefault();
    event.stopPropagation();
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
  cleanupTableHoverActions?.();
  cleanupHorizontalRule?.();
  cleanupMarkdownShortcut?.();
  cleanupCodeActionMenu?.();
  
  // 清理链接观察器
  if (contentEditableRef.value && (contentEditableRef.value as any).__linkObserver) {
    (contentEditableRef.value as any).__linkObserver.disconnect();
  }
  
  editor.value?.setRootElement(null);
});


// 监听 defaultValue 变化（外部内容变化），重置编辑器状态
watch(
  () => props.defaultValue,
  (newValue) => {
    if (!editor.value) return;
    
    const shouldSetSelection = props.autofocus && !props.readonly;
    
    // 直接更新编辑器内容，不需要对比
    editor.value.update(() => {
      const root = $getRoot();
      root.clear();
      
      if (newValue) {
        $convertFromMarkdownString(newValue, CUSTOM_TRANSFORMERS, undefined, true);
      } else {
        const paragraph = $createParagraphNode();
        root.append(paragraph);
      }
      
      // 如果 autofocus 为 true，在更新后设置选择位置
      if (shouldSetSelection && root.getChildrenSize() > 0) {
        if (props.defaultSelection === 'rootStart') {
          root.selectStart();
        } else {
          root.selectEnd();
        }
      }
    });
    
    // 使用 nextTick 确保更新完成后再重置编辑器状态（focus 等）
    nextTick(() => {
      if (!props.readonly) {
        if (props.autofocus) {
          // 如果 autofocus 为 true，确保编辑器获得焦点
          const rootElement = editor.value.getRootElement() as HTMLDivElement;
          if (rootElement !== null) {
            const activeElement = document.activeElement;
            if (activeElement === null || !rootElement.contains(activeElement)) {
              rootElement.focus({preventScroll: true});
            }
          }
        } else {
          // 如果 autofocus 为 false，再次确保编辑器失焦
          const rootElement = editor.value.getRootElement();
          if (rootElement !== null) {
            rootElement.blur();
          }
        }
      }
    });
  },
);

// 监听 readonly 变化，重新初始化编辑器
watch(
  () => props.readonly,
  () => {
    if (editor.value) {
      // 清理现有编辑器和插件
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
      cleanupTableHoverActions?.();
      cleanupHorizontalRule?.();
      cleanupMarkdownShortcut?.();
      cleanupCodeActionMenu?.();
      
      // 重置清理函数引用
      cleanupImages = undefined;
      cleanupPicker = undefined;
      cleanupBlockMenu = undefined;
      cleanupListPlugin = undefined;
      cleanupDragDropPaste = undefined;
      cleanupFloatingToolbar = undefined;
      cleanupLinkEditor = undefined;
      cleanupClearFormatOnEnter = undefined;
      cleanupCodeBlockExit = undefined;
      cleanupTable = undefined;
      cleanupTableActionMenu = undefined;
      cleanupTableHoverActions = undefined;
      cleanupHorizontalRule = undefined;
      cleanupMarkdownShortcut = undefined;
      cleanupCodeActionMenu = undefined;
      
      // 清理链接观察器
      if (contentEditableRef.value && (contentEditableRef.value as any).__linkObserver) {
        (contentEditableRef.value as any).__linkObserver.disconnect();
        delete (contentEditableRef.value as any).__linkObserver;
      }
      
      // 移除根元素
      editor.value.setRootElement(null);
      
      // 重新初始化编辑器
      nextTick(() => {
        initEditor();
      });
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
  // 使用 nextTick 确保 DOM 已经渲染完成
  nextTick(() => {
    initEditor();
  });
});

// 暴露 getMarkdown 方法
const getMarkdown = (): string => {
  if (!editor.value) return '';
  let markdown = '';
  editor.value.getEditorState().read(() => {
    markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS, undefined, true);
  });
  return markdown;
};

defineExpose({
  getMarkdown,
});
</script>

<style scoped>
.editor-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  padding: 12px;
}

.editor-scroller {
  height: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  background: white;
  position: relative;
  overflow-y: auto;
}

.editor-placeholder {
  position: absolute;
  top: 16px;
  left: 48px; /* 16px padding + 32px editor padding-left */
  color: #999;
  pointer-events: none;
  user-select: none;
  font-size: 16px;
  line-height: 1.6;
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
