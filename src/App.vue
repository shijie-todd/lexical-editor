<script setup lang="ts">
import { ref } from 'vue'
import Editor from './Editor.vue'

const content = ref('# 一级 ## 二级')
</script>

<template>
  <Editor v-model="content" />
</template>

<style scoped></style>
