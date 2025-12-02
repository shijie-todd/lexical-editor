<template>
  <div class="editor-container">
    <div ref="editorRef" class="editor-scroller">
      <div 
        ref="contentEditableRef" 
        class="editor" 
        :contenteditable="!readonly" 
        @click="handleEditorClick"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import './styles/editor.scss';
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { createEditor, $getRoot, $createParagraphNode } from 'lexical';
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text';
import { ListNode, ListItemNode, registerCheckList } from '@lexical/list';
import { ParagraphNode, TextNode } from 'lexical';
import { HorizontalRuleNode } from './nodes/HorizontalRuleNode';
import { ImageNode } from './nodes/ImageNode';
import { useImagesPlugin } from './plugins/ImagesPlugin';
import { useComponentPickerPlugin } from './plugins/ComponentPickerPlugin';
import { useBlockMenuPlugin } from './plugins/BlockMenuPlugin';
import { useListPlugin } from './plugins/ListPlugin';
import { useDragDropPastePlugin } from './plugins/DragDropPastePlugin';
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
}>();

const editorRef = ref<HTMLDivElement>();
const contentEditableRef = ref<HTMLDivElement>();
const editor = ref<any>(null);
let cleanupImages: (() => void) | undefined;
let cleanupPicker: (() => void) | undefined;
let cleanupBlockMenu: (() => void) | undefined;
let cleanupListPlugin: (() => void) | undefined;
let cleanupDragDropPaste: (() => void) | undefined;

// 用于防止循环更新的标志
let isUpdatingFromProps = false;

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
    nested: {
      listitem: 'editor-nested-list-item',
    },
    checklist: 'editor-list-check',
  },
  indent: 'editor-indent',
  quote: 'editor-quote',
  hr: 'editor-hr',
  image: 'editor-image',
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
      ParagraphNode,
      TextNode,
      QuoteNode,
      HorizontalRuleNode,
      ImageNode,
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

  // Slash command 插件
  cleanupPicker = useComponentPickerPlugin(editor.value, {
    uploadImage, // 传入自定义上传方法（与 DragDropPastePlugin 使用同一个）
  });

  // 块菜单插件（加号按钮）
  cleanupBlockMenu = useBlockMenuPlugin(
    editor.value,
    editorRef.value,
  );

  // 列表插件（处理列表结构、Tab 键缩进等）
  // 使用官方实现：registerList + registerTabIndentation
  cleanupListPlugin = useListPlugin(editor.value, {
    hasStrictIndent: false,
    maxIndent: 7, // 与 playground 保持一致
  });

  // 注册 Checklist 功能
  registerCheckList(editor.value);

  // 设置只读模式
  if (props.readonly) {
    editor.value.setEditable(false);
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
  // 确保点击时编辑器获得焦点
  if (contentEditableRef.value && event.target === contentEditableRef.value) {
    contentEditableRef.value.focus();
  }
};

// 清理函数
onUnmounted(() => {
  cleanupImages?.();
  cleanupPicker?.();
  cleanupBlockMenu?.();
  cleanupListPlugin?.();
  cleanupDragDropPaste?.();
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
    }
  },
);

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

/* 主题样式已移至 src/styles/editor.scss */
</style>

<style>
/* 全局样式 - Slash Command Menu */
.typeahead-popover.component-picker-menu {
  position: absolute;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 250px;
  overflow-y: auto;
  min-width: 200px;
  color: #333;
}

.typeahead-popover.component-picker-menu ul {
  list-style: none;
  margin: 0;
  padding: 4px;
  color: #333;
}

.component-picker-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  font-size: 14px;
}

.component-picker-item:hover,
.component-picker-item.selected {
  background-color: #f0f0f0;
  color: #1a1a1a;
}

.component-picker-item .text {
  flex: 1;
  color: inherit;
}

/* Block Menu 样式已移至 src/styles/editor.scss */
</style>
