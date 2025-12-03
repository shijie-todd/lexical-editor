# 表格功能说明

## 功能概述

已成功实现完整的表格功能，参考 Lexical Playground 的实现，支持：

### ✅ 核心功能

1. **创建表格**
   - 通过 slash command (`/表格` 或 `/table`) 创建 3x3 表格
   - 默认包含表头行

2. **行操作**
   - ✅ 在当前行上方插入行
   - ✅ 在当前行下方插入行
   - ✅ 删除当前行

3. **列操作**
   - ✅ 在当前列左侧插入列
   - ✅ 在当前列右侧插入列
   - ✅ 删除当前列

4. **表格操作**
   - ✅ 删除整个表格

5. **Markdown 支持**
   - ✅ 支持 Markdown 格式导入
   - ✅ 支持 Markdown 格式导出

## 使用方法

### 创建表格

1. 在编辑器中输入 `/` 触发 slash command 菜单
2. 输入 `table` 或 `表格` 进行搜索
3. 选择"表格"选项
4. 自动创建一个 3x3 的表格

### 操作表格

1. 点击表格单元格，单元格右上角会出现操作按钮（向下箭头）
2. 点击按钮打开操作菜单
3. 选择需要的操作：
   - **在上方插入行** - 在当前行上方添加新行
   - **在下方插入行** - 在当前行下方添加新行
   - **在左侧插入列** - 在当前列左侧添加新列
   - **在右侧插入列** - 在当前列右侧添加新列
   - **删除行** - 删除当前行
   - **删除列** - 删除当前列
   - **删除表格** - 删除整个表格（需确认）

### Markdown 格式

表格支持标准的 Markdown 表格格式：

```markdown
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

- 第一行为表头
- 第二行为分隔线（`---`）
- 后续行为数据行
- 单元格内容支持所有文本格式（粗体、斜体、代码等）

## 技术实现

### 新增文件

1. **src/plugins/TablePlugin.ts**
   - 表格插件核心
   - 处理 `INSERT_TABLE_COMMAND` 命令
   - 创建表格节点

2. **src/plugins/TableActionMenuPlugin.ts**
   - 表格操作菜单插件
   - 监听选择变化
   - 管理菜单状态
   - 提供表格操作函数

3. **src/components/TableActionMenu.vue**
   - 表格操作菜单 UI 组件
   - 显示操作按钮和下拉菜单
   - 处理用户交互

4. **TABLE_FEATURES.md**
   - 本文档

### 修改文件

1. **src/utils/markdownTransformers.ts**
   - 添加 `TABLE` transformer
   - 支持表格的 Markdown 导入导出
   - 处理表头识别

2. **src/Editor.vue**
   - 注册 `TableActionMenu` 组件
   - 集成 `useTableActionMenuPlugin`
   - 管理表格菜单状态

3. **src/styles/editor.scss**
   - 添加表格样式
   - 表格单元格样式
   - 表头样式

4. **src/plugins/ComponentPickerPlugin.ts**
   - 添加表格选项到 slash command 菜单
   - 导入表格图标
   - 配置表格创建命令

5. **src/assets/table.svg**
   - 表格图标

## 示例

### 创建并编辑表格

1. 输入 `/表格` 创建表格
2. 点击单元格开始编辑
3. 输入内容，支持格式：
   - **粗体**：`**文本**`
   - *斜体*：`*文本*`
   - `代码`：\`文本\`
   - 等等

### 调整表格结构

- 需要更多行？点击操作菜单 → 在下方插入行
- 需要更多列？点击操作菜单 → 在右侧插入列
- 删除不需要的行/列？使用对应的删除选项

### 导出为 Markdown

编辑器会自动将表格转换为 Markdown 格式，例如：

```markdown
| 产品 | 价格 | 库存 |
| --- | --- | --- |
| MacBook Pro | ¥12999 | 50 |
| iPhone 15 | ¥5999 | 100 |
```

## 注意事项

1. 表格操作按钮只在非只读模式下显示
2. 删除表格操作会弹出确认对话框
3. 表格最小为 1x1（删除到最后一行/列时会保留）
4. 表头行（第一行）可以通过 Markdown 分隔线自动识别

## 未来扩展

可以考虑添加的功能：
- [ ] 单元格合并/拆分
- [ ] 调整列宽
- [ ] 表格样式（条纹、边框等）
- [ ] 表格排序
- [ ] 导出为其他格式（CSV、Excel）

## 参考

本实现参考了 [Lexical Playground](https://github.com/facebook/lexical/tree/main/packages/lexical-playground) 的表格功能。

