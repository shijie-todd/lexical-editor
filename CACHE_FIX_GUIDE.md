# 缓存清除指南

## 问题
出现 `State key collision "mdListMarker"` 错误，即使代码已经修复。

## 原因
这是**浏览器/Vite 缓存问题**，旧的代码仍在运行。

## 解决步骤

### 方法 1：完全清除缓存（推荐）

#### 1. 停止开发服务器
在终端按 `Ctrl + C`

#### 2. 清除 Vite 缓存
**PowerShell:**
```powershell
cd D:\code\lexical-editor
Remove-Item -Recurse -Force node_modules\.vite
```

**CMD:**
```cmd
cd D:\code\lexical-editor
rmdir /s /q node_modules\.vite
```

**Git Bash:**
```bash
cd D:/code/lexical-editor
rm -rf node_modules/.vite
```

#### 3. 重启开发服务器
```bash
npm run dev
```

#### 4. 浏览器硬刷新
- **Chrome/Edge**: `Ctrl + Shift + R` 或 `Ctrl + F5`
- 或者打开开发者工具 (F12) → 右键刷新按钮 → "清空缓存并硬性重新加载"

### 方法 2：清除浏览器缓存

1. 打开开发者工具 (F12)
2. 进入 **Application** (或 **应用**) 标签
3. 左侧找到 **Storage** (存储)
4. 点击 **Clear site data** (清除网站数据)
5. 刷新页面 (F5)

### 方法 3：禁用缓存（开发时）

1. 打开开发者工具 (F12)
2. 进入 **Network** (网络) 标签
3. 勾选 **Disable cache** (禁用缓存)
4. 保持开发者工具打开状态
5. 刷新页面

### 方法 4：使用隐私/无痕模式测试

- **Chrome/Edge**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`
- 在隐私窗口中打开 `http://localhost:5173`

## 验证修复

清除缓存后，你应该看到：
- ✅ 没有 "State key collision" 错误
- ✅ 控制台干净，无错误
- ✅ 初始内容正确渲染
- ✅ 列表嵌套正常显示

## 如果还是有问题

### 检查 1：确认文件已保存
确保所有文件修改都已保存（VSCode 文件标签没有白点）

### 检查 2：确认 HMR 生效
查看终端输出，应该显示类似：
```
[vite] hmr update /src/utils/markdownTransformers.ts
```

### 检查 3：完全重启
1. 停止开发服务器
2. 关闭所有浏览器标签
3. 重启开发服务器
4. 重新打开浏览器

### 检查 4：查看实际加载的代码
1. 打开开发者工具 (F12)
2. 进入 **Sources** (源代码) 标签
3. 找到 `markdownTransformers.ts`
4. 确认代码是最新的（应该使用 `UNORDERED_LIST`, `ORDERED_LIST`, `CHECK_LIST`）

## 最后手段：完全重新安装

如果以上都不行：
```bash
cd D:\code\lexical-editor
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

## 预防未来的缓存问题

在 `vite.config.ts` 中添加：
```typescript
export default defineConfig({
  server: {
    hmr: {
      overlay: true
    }
  },
  optimizeDeps: {
    force: true  // 强制重新优化依赖
  }
})
```

