# 初始化渲染问题修复

## 问题描述

当 `App.vue` 中的 `content` 有初始数据时，页面没有正确渲染内容。

```vue
const content = ref(`# asdad

1. adsada
    1. asdasd

- asdsadad
    - asdsadsad

- [ ] sdadasda`)
```

## 根本原因

在 `Editor.vue` 的 `initEditor` 函数中，**初始化顺序错误**：

### 错误的顺序（修复前）：
```javascript
// 1. 先更新内容
editor.value.update(() => {
  const root = $getRoot();
  root.clear();
  if (props.modelValue) {
    $convertFromMarkdownString(props.modelValue, CUSTOM_TRANSFORMERS);
  }
}, { discrete: true });  // ❌ discrete: true 阻止了渲染

// 2. 后设置根元素
editor.value.setRootElement(contentEditableRef.value);
```

### 问题分析：
1. **顺序错误**：在设置根元素 `setRootElement` 之前就尝试更新内容
2. **discrete: true**：这个选项会阻止编辑器立即渲染更新
3. **时机问题**：Lexical 需要先有根元素才能正确渲染内容

## 修复方案

### 正确的顺序（修复后）：
```javascript
// 1. 先设置根元素（必须在内容初始化之前设置）
editor.value.setRootElement(contentEditableRef.value);

// 2. 再更新内容
editor.value.update(() => {
  const root = $getRoot();
  root.clear();
  if (props.modelValue) {
    $convertFromMarkdownString(props.modelValue, CUSTOM_TRANSFORMERS);
  }
});  // ✅ 移除 discrete: true
```

### 关键改动：
1. ✅ 将 `setRootElement` 移到内容初始化之前
2. ✅ 移除 `{ discrete: true }` 选项，允许立即渲染
3. ✅ 同时优化了 `watch` 中的更新逻辑

## 修改的文件

### `src/Editor.vue`

**第 1 处修改（初始化顺序）：**
```diff
  // 注册 RichText 功能
  registerRichText(editor.value);

+ // 设置根元素（必须在内容初始化之前设置）
+ editor.value.setRootElement(contentEditableRef.value);

  // 注册链接命令处理器
  editor.value.registerCommand(
    TOGGLE_LINK_COMMAND,
    ...
  );

  // 初始化编辑器状态
  editor.value.update(() => {
    const root = $getRoot();
    root.clear();
    
    if (props.modelValue) {
      $convertFromMarkdownString(props.modelValue, CUSTOM_TRANSFORMERS);
    } else {
      const paragraph = $createParagraphNode();
      root.append(paragraph);
    }
- }, { discrete: true });
+ });

- // 设置根元素
- editor.value.setRootElement(contentEditableRef.value);
```

**第 2 处修改（watch 更新）：**
```diff
  watch(
    () => props.modelValue,
    (newValue) => {
      if (!editor.value) return;
      
      isUpdatingFromProps = true;
      editor.value.update(() => {
        const root = $getRoot();
        const currentMarkdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
        
        if (currentMarkdown !== newValue) {
          root.clear();
          if (newValue) {
            $convertFromMarkdownString(newValue, CUSTOM_TRANSFORMERS);
          } else {
            const paragraph = $createParagraphNode();
            root.append(paragraph);
          }
        }
-     }, { discrete: true });
+     });
      
      nextTick(() => {
        isUpdatingFromProps = false;
      });
    },
  );
```

## 验证方法

### 1. 测试初始渲染
在 `App.vue` 中设置初始内容：
```vue
const content = ref(`# 标题

1. 有序列表
    1. 嵌套项

- 无序列表
    - 嵌套项

- [ ] 任务列表`)
```

**期望结果**：页面应该立即显示格式化后的内容

### 2. 测试动态更新
```vue
const updateContent = () => {
  content.value = '# 新内容\n\n这是动态更新的内容'
}
```

**期望结果**：内容应该实时更新

### 3. 测试往返转换
1. 在编辑器中编辑内容
2. 查看 Markdown 输出
3. 修改 Markdown 输出
4. 验证编辑器内容更新

## Lexical 初始化最佳实践

### 正确的初始化顺序：
```javascript
// 1. 创建编辑器
const editor = createEditor(config);

// 2. 设置根元素
editor.setRootElement(rootElement);

// 3. 初始化内容
editor.update(() => {
  // 设置初始内容
});

// 4. 注册插件和监听器
```

### 关键要点：
1. **根元素优先**：必须先设置 `rootElement` 才能渲染
2. **避免 discrete**：初始化时不要使用 `{ discrete: true }`
3. **插件时机**：在内容初始化后再注册插件
4. **焦点处理**：使用 `nextTick` 确保 DOM 更新完成

## 相关资源

- [Lexical 官方文档 - 创建编辑器](https://lexical.dev/docs/getting-started/quick-start)
- [Lexical API - setRootElement](https://lexical.dev/docs/api/classes/lexical.LexicalEditor#setroolement)
- [Lexical API - update](https://lexical.dev/docs/api/classes/lexical.LexicalEditor#update)

## 总结

这个问题的核心是 **Lexical 编辑器必须先有根元素才能渲染内容**。修复方法很简单：
1. 调整初始化顺序，先设置根元素
2. 移除阻止渲染的 `discrete: true` 选项

现在初始数据应该能正确渲染了！🎉

