<template>
  <Teleport to="body">
    <div
      v-if="show && tableCellNode"
      class="table-action-menu-container"
      :style="{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
      }"
    >
      <button 
        ref="buttonRef"
        class="table-action-button" 
        @click.stop="toggleMenu"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.5 5.5L8 9l3.5-3.5L10 4 8 6 6 4z"/>
        </svg>
      </button>
      
      <div v-if="menuOpen" class="table-action-dropdown" ref="dropdownRef">
        <button class="table-action-item" @click="insertRowAbove">
          <span>在上方插入行</span>
        </button>
        <button class="table-action-item" @click="insertRowBelow">
          <span>在下方插入行</span>
        </button>
        <div class="table-action-divider"></div>
        <button class="table-action-item" @click="insertColumnLeft">
          <span>在左侧插入列</span>
        </button>
        <button class="table-action-item" @click="insertColumnRight">
          <span>在右侧插入列</span>
        </button>
        <div class="table-action-divider"></div>
        <button class="table-action-item" @click="deleteRow">
          <span>删除行</span>
        </button>
        <button class="table-action-item" @click="deleteColumn">
          <span>删除列</span>
        </button>
        <div class="table-action-divider"></div>
        <button class="table-action-item danger" @click="deleteTable">
          <span>删除表格</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { TableCellNode } from '@lexical/table';
import type { LexicalEditor } from 'lexical';
import { tableActions } from '../plugins/TableActionMenuPlugin';

interface Props {
  show: boolean;
  x: number;
  y: number;
  tableCellNode: TableCellNode | null;
  editor: any; // LexicalEditor
}

const props = defineProps<Props>();

const menuOpen = ref(false);
const dropdownRef = ref<HTMLDivElement>();
const buttonRef = ref<HTMLButtonElement>();

const toggleMenu = () => {
  console.log('Toggle menu clicked, current state:', menuOpen.value);
  menuOpen.value = !menuOpen.value;
  console.log('New menu state:', menuOpen.value);
};

const closeMenu = () => {
  menuOpen.value = false;
};

const insertRowAbove = () => {
  tableActions.insertRowAbove(props.editor);
  closeMenu();
};

const insertRowBelow = () => {
  tableActions.insertRowBelow(props.editor);
  closeMenu();
};

const insertColumnLeft = () => {
  tableActions.insertColumnLeft(props.editor);
  closeMenu();
};

const insertColumnRight = () => {
  tableActions.insertColumnRight(props.editor);
  closeMenu();
};

const deleteRow = () => {
  tableActions.deleteRow(props.editor);
  closeMenu();
};

const deleteColumn = () => {
  tableActions.deleteColumn(props.editor);
  closeMenu();
};

const deleteTable = () => {
  if (props.tableCellNode && confirm('确定要删除整个表格吗？')) {
    tableActions.deleteTable(props.editor, props.tableCellNode);
    closeMenu();
  }
};

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  
  // 如果点击的是按钮或下拉菜单内部，不关闭
  if (buttonRef.value?.contains(target)) {
    return;
  }
  
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    closeMenu();
  }
};

watch(() => props.show, (newShow) => {
  if (!newShow) {
    closeMenu();
  }
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.table-action-menu-container {
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  pointer-events: auto;
}

.table-action-button {
  width: 24px;
  height: 24px;
  border: 1px solid #d0d0d0;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  padding: 0;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-action-button:hover {
  background: #f5f5f5;
  border-color: #999;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.table-action-dropdown {
  position: absolute;
  top: 0;
  right: 25px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 4px 0;
  z-index: 1001;
}

.table-action-item {
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background 0.2s;
  display: block;
}

.table-action-item:hover {
  background: #f0f0f0;
}

.table-action-item.danger {
  color: #e74c3c;
}

.table-action-item.danger:hover {
  background: #ffe8e6;
}

.table-action-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}
</style>

