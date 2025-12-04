<template>
  <div class="image-wrapper" :style="wrapperStyle">
    <img
      ref="imageRef"
      :src="src"
      :alt="altText"
      :class="{ 'focused': isSelected && isEditable, 'draggable': isDraggable }"
      :style="imageStyle"
      draggable="false"
      @click="handleImageClick"
      @error="handleImageError"
    />
    
    <!-- Resizer -->
    <ImageResizer
      v-if="isSelected && isEditable && !imageError"
      :image-ref="imageRef"
      @resizing="handleResizing"
      @resize-end="handleResizeEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ImageResizer from './ImageResizer.vue';

const props = defineProps<{
  src: string;
  altText: string;
  width: number | 'inherit';
  height: number | 'inherit';
  maxWidth: number;
  nodeKey: string;
  isSelected: boolean;
  isEditable: boolean;
}>();

const emit = defineEmits<{
  'update:width': [value: number];
  'update:height': [value: number];
  'select': [];
}>();

const imageRef = ref<HTMLImageElement | null>(null);
const imageError = ref(false);

// 拖拽时的临时尺寸
const resizingWidth = ref<number | null>(null);
const resizingHeight = ref<number | null>(null);

const isDraggable = computed(() => props.isSelected);

// 如果正在调整大小，使用临时尺寸
const currentWidth = computed(() => 
  resizingWidth.value !== null ? resizingWidth.value : props.width
);
const currentHeight = computed(() => 
  resizingHeight.value !== null ? resizingHeight.value : props.height
);

const wrapperStyle = computed(() => {
  const style: Record<string, string> = {
    maxWidth: `${props.maxWidth}px`,
  };
  
  // 如果图片有明确的宽度，设置到 wrapper 上
  if (currentWidth.value !== 'inherit') {
    style.width = `${currentWidth.value}px`;
  }
  
  return style;
});

const imageStyle = computed(() => {
  const style: Record<string, string> = {
    display: 'block',
    width: '100%',
  };
  
  // 设置高度（如果有）
  if (currentHeight.value !== 'inherit') {
    style.height = `${currentHeight.value}px`;
  }
  
  return style;
});

const handleImageClick = (event: MouseEvent) => {
  if (!props.isEditable) return;
  event.preventDefault();
  emit('select');
};

const handleImageError = () => {
  imageError.value = true;
};

// 拖拽过程中更新临时尺寸
const handleResizing = (width: number, height: number) => {
  resizingWidth.value = width;
  resizingHeight.value = height;
};

// 拖拽结束时更新节点
const handleResizeEnd = (width: number, height: number) => {
  resizingWidth.value = null;
  resizingHeight.value = null;
  emit('update:width', width);
  emit('update:height', height);
};
</script>

<style scoped>
.image-wrapper {
  display: inline-block;
  margin: 16px 0;
  position: relative;
  max-width: 100%;
}

img {
  cursor: pointer;
  transition: box-shadow 0.2s;
  display: block;
  height: auto;
}

img.focused {
  box-shadow: 0 0 0 2px #1890ff;
  outline: none;
}

img.draggable {
  cursor: move;
}
</style>

