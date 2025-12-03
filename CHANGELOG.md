# 更新日志

## 2024-12-03 - 表格功能完整实现

### ✨ 新功能

#### 表格支持
- ✅ 通过 slash command (`/表格` 或 `/table`) 创建表格
- ✅ 默认创建 3×3 表格，包含表头行
- ✅ 完整的 Markdown 导入导出支持

#### 表格操作
- ✅ **在上方插入行** - 在当前行上面添加新行
- ✅ **在下方插入行** - 在当前行下面添加新行
- ✅ **在左侧插入列** - 在当前列左边添加新列
- ✅ **在右侧插入列** - 在当前列右边添加新列
- ✅ **删除行** - 删除当前行
- ✅ **删除列** - 删除当前列
- ✅ **删除表格** - 删除整个表格（带确认）

#### 用户界面
- ✅ 单元格右上角操作按钮（24×24px，白色，带边框和阴影）
- ✅ 下拉操作菜单，中文界面
- ✅ 悬停效果优化

---

### 🔧 Bug 修复

#### 1. 按钮点击无响应 ✅
**问题：** 点击操作按钮后菜单没有打开

**原因：** `handleClickOutside` 函数误判按钮为外部点击

**修复：**
- 在按钮上添加 `@click.stop` 阻止事件冒泡
- 在 `handleClickOutside` 中排除按钮本身
- 添加调试日志便于排查

```typescript
// 修复前
const handleClickOutside = (event: MouseEvent) => {
  if (!dropdownRef.value.contains(event.target)) {
    closeMenu(); // ❌ 误关闭菜单
  }
};

// 修复后
const handleClickOutside = (event: MouseEvent) => {
  if (buttonRef.value?.contains(event.target)) {
    return; // ✅ 不关闭菜单
  }
  if (!dropdownRef.value?.contains(event.target)) {
    closeMenu();
  }
};
```

---

#### 2. 按钮不跟随滚动 ✅
**问题：** 滚动页面时，操作按钮停留在原位

**原因：** 使用 `position: fixed` 定位，相对于视口固定

**修复：**
- 改用 `position: absolute` + 滚动偏移量
- 添加滚动事件监听器，实时更新按钮位置
- 监听 window 和编辑器容器的滚动

```typescript
// 修复前
const y = rect.top + 5; // ❌ 不考虑滚动

// 修复后
const y = rect.top + window.scrollY + 5; // ✅ 加上滚动偏移

// 添加滚动监听
window.addEventListener('scroll', handleScroll);
scrollableParent?.addEventListener('scroll', handleScroll);
```

---

#### 3. 表格内触发 Slash Command ✅
**问题：** 在表格单元格内输入 `/` 也会触发 slash command 菜单

**原因：** ComponentPickerPlugin 没有检查是否在表格单元格内

**修复：**
- 在显示菜单前检查当前节点是否在表格单元格内
- 如果在表格内，不显示 slash command 菜单

```typescript
// 添加表格检查
const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
if (tableCellNode && $isTableCellNode(tableCellNode)) {
  // 在表格单元格内，不显示菜单
  hideMenu();
  return;
}
```

---

### 📁 新增文件

#### 核心功能
- `src/plugins/TablePlugin.ts` - 表格核心插件
- `src/plugins/TableActionMenuPlugin.ts` - 表格操作菜单插件
- `src/components/TableActionMenu.vue` - 操作菜单 UI 组件
- `src/assets/table.svg` - 表格图标

#### 文档
- `TABLE_FEATURES.md` - 功能说明文档
- `HOW_TO_USE_TABLE.md` - 详细使用指南
- `USAGE_GUIDE.md` - 使用和故障排查
- `QUICK_START.md` - 快速开始指南
- `DEBUG_TABLE_BUTTON.md` - 按钮调试指南
- `CHANGELOG.md` - 本文件

#### 测试文件
- `table-test.md` - Markdown 表格测试示例
- `App-test-table.vue` - 表格测试页面

---

### 🔄 修改文件

#### 1. src/utils/markdownTransformers.ts
- 添加完整的 `TABLE` transformer
- 支持表格 Markdown 导入
- 支持表格 Markdown 导出
- 自动识别表头（通过 `---` 分隔线）
- 处理单元格内的富文本格式

#### 2. src/Editor.vue
- 导入并注册 `TableActionMenu` 组件
- 集成 `useTableActionMenuPlugin`
- 添加表格操作菜单状态管理
- 在 cleanup 中清理表格相关插件

#### 3. src/plugins/ComponentPickerPlugin.ts
- 添加表格选项到 slash command 菜单
- 导入表格图标
- 配置表格创建命令
- **修复：** 添加表格单元格检查，避免在表格内触发

#### 4. src/styles/editor.scss
- 添加完整表格样式
- 表格边框和单元格样式
- 表头样式（灰色背景）
- 单元格聚焦状态
- 表格选中状态

#### 5. src/App.vue
- 更新为表格测试页面
- 添加使用说明
- 预加载测试表格
- 添加 Markdown 输出查看

---

### 📊 Markdown 表格支持

#### 导入格式
```markdown
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

#### 导出格式
- 自动将表格转换为标准 Markdown 格式
- 表头行会添加分隔线
- 单元格内容支持富文本（加粗、斜体、代码等）
- 换行符会被转义为 `\n`

---

### 🎨 样式优化

#### 操作按钮
- 大小：24×24px（原 20×20px）
- 背景：白色（原灰色 #f0f0f0）
- 边框：1px solid #d0d0d0
- 阴影：0 1px 3px rgba(0, 0, 0, 0.1)
- 悬停：边框变深，阴影增强

#### 表格样式
- 边框：1px solid #ddd
- 单元格边距：8px 12px
- 表头背景：#f5f5f5
- 聚焦边框：2px solid #4a90e2

---

### 🚀 性能优化

#### 滚动监听
- 使用 `{ passive: true }` 选项，提高滚动性能
- 在隐藏菜单时立即清理监听器，避免内存泄漏
- 防抖处理，避免频繁更新

#### 事件处理
- 使用 `@click.stop` 阻止不必要的事件传播
- 合理的 z-index 层级管理
- pointer-events 优化

---

### 📝 使用说明

#### 创建表格
```
1. 输入 /表格 或 /table
2. 按回车
3. 表格创建完成
```

#### 操作表格
```
1. 点击表格单元格
2. 观察右上角的操作按钮 [▼]
3. 点击按钮打开菜单
4. 选择操作（增加/删除 行/列）
```

#### Markdown 互转
```
导入：复制 Markdown 表格 → 粘贴到编辑器
导出：编辑器自动转换为 Markdown 格式
```

---

### ⚠️ 已知限制

1. 表格操作按钮仅在非只读模式下显示
2. 删除操作会保留至少一行/一列
3. 暂不支持单元格合并（未来可能添加）
4. 暂不支持调整列宽（未来可能添加）

---

### 🔮 未来计划

- [ ] 单元格合并/拆分
- [ ] 可调整列宽
- [ ] 表格样式选项（边框、条纹、紧凑模式等）
- [ ] 表格排序功能
- [ ] 复制/粘贴表格数据（CSV、Excel）
- [ ] 表格内的快捷键支持（Tab 切换单元格等）

---

### 🙏 参考

本实现参考了 [Lexical Playground](https://github.com/facebook/lexical/tree/main/packages/lexical-playground) 的表格功能。

---

## 版本信息

- **Lexical**: ^0.38.2
- **@lexical/table**: ^0.38.2
- **Vue**: ^3.5.24

---

**最后更新：** 2024-12-03

