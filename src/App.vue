<script setup lang="ts">
import { ref } from 'vue'
import Editor from './Editor.vue'

const content = ref('你好！这是一段测试文本')
</script>

<template>
  {{ content }}
  <Editor v-model="content" />
</template>

<style scoped></style>
