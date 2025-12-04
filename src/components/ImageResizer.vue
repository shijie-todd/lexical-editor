<template>
  <div class="image-resizer">
    <!-- 调整大小手柄 -->
    <div
      v-for="direction in resizeDirections"
      :key="direction"
      :class="['image-resizer-handle', `handle-${direction}`]"
      @mousedown="(e) => handleMouseDown(e, direction)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  imageRef: HTMLImageElement | null;
}>();

const emit = defineEmits<{
  'resizing': [width: number, height: number];
  'resize-end': [width: number, height: number];
}>();

type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

const resizeDirections: ResizeDirection[] = ['nw', 'ne', 'sw', 'se'];

let isResizing = false;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let aspectRatio = 1;
let currentDirection: ResizeDirection | null = null;

const handleMouseDown = (event: MouseEvent, direction: ResizeDirection) => {
  event.preventDefault();
  
  if (!props.imageRef) return;
  
  isResizing = true;
  currentDirection = direction;
  startX = event.clientX;
  startY = event.clientY;
  
  const rect = props.imageRef.getBoundingClientRect();
  startWidth = rect.width;
  startHeight = rect.height;
  aspectRatio = startWidth / startHeight;
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // 添加 body 样式，防止文本选择
  document.body.style.userSelect = 'none';
  document.body.style.cursor = getCursorForDirection(direction);
};

let finalWidth = 0;
let finalHeight = 0;

const handleMouseMove = (event: MouseEvent) => {
  if (!isResizing || !currentDirection) return;
  
  const deltaX = event.clientX - startX;
  const deltaY = event.clientY - startY;
  
  let newWidth = startWidth;
  let newHeight = startHeight;
  
  // 根据拖动方向计算新尺寸
  if (currentDirection.includes('e')) {
    newWidth = startWidth + deltaX;
  } else if (currentDirection.includes('w')) {
    newWidth = startWidth - deltaX;
  }
  
  if (currentDirection.includes('s')) {
    newHeight = startHeight + deltaY;
  } else if (currentDirection.includes('n')) {
    newHeight = startHeight - deltaY;
  }
  
  // 保持宽高比
  if (currentDirection.length === 2) {
    // 对角线方向，使用较大的变化值
    const widthChange = Math.abs(newWidth - startWidth);
    const heightChange = Math.abs(newHeight - startHeight);
    
    if (widthChange > heightChange) {
      newHeight = newWidth / aspectRatio;
    } else {
      newWidth = newHeight * aspectRatio;
    }
  } else {
    // 单边方向
    if (currentDirection === 'e' || currentDirection === 'w') {
      newHeight = newWidth / aspectRatio;
    } else {
      newWidth = newHeight * aspectRatio;
    }
  }
  
  // 最小尺寸限制
  newWidth = Math.max(100, newWidth);
  newHeight = Math.max(100, newHeight);
  
  finalWidth = Math.round(newWidth);
  finalHeight = Math.round(newHeight);
  
  // 拖拽过程中只更新显示，不更新节点
  emit('resizing', finalWidth, finalHeight);
};

const handleMouseUp = () => {
  if (!isResizing) return;
  
  isResizing = false;
  currentDirection = null;
  
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  
  // 恢复 body 样式
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  
  // 拖拽结束时才更新节点
  if (finalWidth > 0 && finalHeight > 0) {
    emit('resize-end', finalWidth, finalHeight);
  }
};

const getCursorForDirection = (direction: ResizeDirection): string => {
  const cursorMap: Record<ResizeDirection, string> = {
    'nw': 'nwse-resize',
    'ne': 'nesw-resize',
    'sw': 'nesw-resize',
    'se': 'nwse-resize',
    'n': 'ns-resize',
    's': 'ns-resize',
    'e': 'ew-resize',
    'w': 'ew-resize',
  };
  return cursorMap[direction];
};
</script>

<style scoped>
.image-resizer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.image-resizer-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #1890ff;
  border: 1px solid white;
  border-radius: 50%;
  pointer-events: auto;
  z-index: 10;
}

.handle-nw {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}

.handle-ne {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.handle-sw {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

.handle-se {
  bottom: -5px;
  right: -5px;
  cursor: nwse-resize;
}
</style>

