<script setup lang="ts">
import { ref } from 'vue'
import Editor from './Editor.vue'

const content = ref(``)

const handleFocus = () => {
  console.log('编辑器获得焦点')
}

const handleBlur = () => {
  console.log('编辑器失去焦点')
}

const handleClickImg = (url: string) => {
  console.log('点击图片:', url)
}

const handleChange = (value: string) => {
  console.log('内容变化:', value)
}
</script>

<template>
  <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
    

    <Editor v-model="content" @focus="handleFocus" @blur="handleBlur" @click-img="handleClickImg" @change="handleChange" />
    
    <details style="margin-top: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
      <summary style="cursor: pointer; font-weight: bold;">查看 Markdown 输出</summary>
      <pre style="background: white; padding: 15px; border-radius: 4px; overflow-x: auto; margin-top: 10px;">{{ content }}</pre>
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
