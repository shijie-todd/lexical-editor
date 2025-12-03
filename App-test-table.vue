<template>
  <div class="app-container">
    <h1>📊 Lexical 编辑器 - 表格功能测试</h1>
    
    <div class="instructions">
      <h2>🎯 操作指南：</h2>
      <ol>
        <li>在下方编辑器中输入 <code>/表格</code> 或 <code>/table</code></li>
        <li>按回车创建表格</li>
        <li><strong>点击任意单元格</strong>，观察<strong>右上角</strong>是否出现操作按钮 <code>[▼]</code></li>
        <li>点击按钮打开菜单，选择操作（增加/删除 行/列）</li>
      </ol>
      
      <div class="tip">
        💡 <strong>提示：</strong>操作按钮是一个白色的小方块（24×24px），带有向下箭头，位于单元格右上角约 5px 处
      </div>
    </div>

    <div class="editor-wrapper">
      <h3>编辑器：</h3>
      <Editor v-model="content" />
    </div>

    <div class="output">
      <h3>Markdown 输出：</h3>
      <pre>{{ content || '（空）' }}</pre>
    </div>

    <div class="test-buttons">
      <button @click="loadTestTable">加载测试表格</button>
      <button @click="clearContent">清空内容</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Editor from './Editor.vue';

const content = ref('');

const testTableMarkdown = `# 测试表格

| 姓名 | 年龄 | 职业 |
| --- | --- | --- |
| 张三 | 28 | 工程师 |
| 李四 | 32 | 设计师 |
| 王五 | 25 | 产品经理 |

**操作提示：**
1. 点击表格中的任意单元格
2. 查看单元格右上角的操作按钮（白色小方块，带向下箭头）
3. 点击按钮即可增删行列
`;

const loadTestTable = () => {
  content.value = testTableMarkdown;
};

const clearContent = () => {
  content.value = '';
};
</script>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.instructions {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.instructions h2 {
  margin-top: 0;
  color: #495057;
}

.instructions ol {
  line-height: 1.8;
}

.instructions code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #d63384;
}

.tip {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 12px;
  margin-top: 15px;
  color: #856404;
}

.editor-wrapper {
  margin-bottom: 30px;
}

.editor-wrapper h3 {
  color: #495057;
  margin-bottom: 10px;
}

.output {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.output h3 {
  margin-top: 0;
  color: #495057;
}

.output pre {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #212529;
}

.test-buttons {
  display: flex;
  gap: 10px;
}

.test-buttons button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.test-buttons button:hover {
  background: #0056b3;
}

.test-buttons button:active {
  background: #004085;
}
</style>

