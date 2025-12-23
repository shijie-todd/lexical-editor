<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Editor from './Editor.vue'

const STORAGE_KEY = 'lexical-editor-content'

const content = ref(``)
const markdownOutput = ref(``)
const editorRef = ref<InstanceType<typeof Editor> | null>(null)

const load1 = () => {
  content.value = '1'
}

const load2 = () =>{
  content.value = '2'
}

// 从 localStorage 加载内容
const loadFromStorage = () => {
  try {
    const savedContent = localStorage.getItem(STORAGE_KEY)
    if (savedContent !== null) {
      content.value = savedContent
    }
  } catch (error) {
    console.error('加载本地存储失败:', error)
  }
}

// 保存内容到 localStorage
const saveToStorage = () => {
  try {
    const markdown = editorRef.value?.getMarkdown() || ''
    localStorage.setItem(STORAGE_KEY, markdown)
    alert('保存成功！')
  } catch (error) {
    console.error('保存到本地存储失败:', error)
    alert('保存失败，请重试')
  }
}

// 组件挂载时加载本地数据
onMounted(() => {
  loadFromStorage()
})

const handleFocus = () => {
  console.log('编辑器获得焦点')
}

const handleBlur = () => {
  console.log('编辑器失去焦点')
}

const handleClickImg = (_url: string) => {
  // console.log('点击图片:', _url)
}

const handleChange = (value: string) => {
  // 更新显示的 markdown 内容
  markdownOutput.value = value
}

const readonly = ref(false)
const changeReadonly = () => {
  readonly.value = !readonly.value
}
</script>

<template>
  <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
    <div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
      <button 
        @click="load1" 
        style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
      >
        加载1
      </button>
      <button 
        @click="load2" 
        style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
      >
        加载2
      </button>
      <button 
        @click="saveToStorage" 
        style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
      >
        保存
      </button>
      <button 
        @click="changeReadonly" 
        style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
      >
        切换只读状态 readonly:{{ readonly }}
      </button>
    </div>

    <Editor ref="editorRef" :default-value="content" default-selection="rootEnd" :readonly="readonly" @focus="handleFocus" @blur="handleBlur" @click-img="handleClickImg" @change="handleChange" />
    
    <details style="margin-top: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
      <summary style="cursor: pointer; font-weight: bold;">查看 Markdown 输出</summary>
      <pre style="background: white; padding: 15px; border-radius: 4px; overflow-x: auto; margin-top: 10px;">{{ markdownOutput }}</pre>
    </details>
  </div>
</template>

<style scoped>
code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #d63384;
}
</style>
