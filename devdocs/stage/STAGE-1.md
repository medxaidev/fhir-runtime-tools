# STAGE-1 — Foundation

> **Status:** Complete
> **Date:** 2026-03-10
> **Scope:** Shell + 基础组件 + Runtime Adapter 骨架 + 工具占位页面

---

## 交付物清单

| # | 任务 | 状态 | 文件 |
|---|------|------|------|
| 1.1 | 项目配置修正 | ✅ | `vite.config.ts`, `tsconfig.json`, `index.html` |
| 1.2 | 入口文件 | ✅ | `src/main.tsx` |
| 1.3 | PrismUI Runtime 初始化 | ✅ | `src/setup.ts` |
| 1.4 | App Shell | ✅ | `src/App.tsx` |
| 1.5 | 全局样式 | ✅ | `src/styles.css` |
| 1.6 | 基础 UI 组件 | ✅ | `src/components/ui/` (9 组件 + index) |
| 1.7 | Runtime Adapter 骨架 | ✅ | `src/runtime/adapter.ts` |
| 1.8 | 工具占位页面 | ✅ | `src/tools/*/index.tsx` (6 页面) |

---

## 创建的文件

```
src/
├─ main.tsx                           # React 19 入口
├─ App.tsx                            # PrismUIProvider + Shell (Header/Sidebar/Router/StatusBar)
├─ setup.ts                           # createInteractionRuntime + PageModule + NotificationModule
├─ styles.css                         # CSS Variables + BEM + Shell Grid + 全部基础样式
│
├─ components/
│   └─ ui/
│       ├─ index.ts                   # barrel export
│       ├─ Button.tsx                 # variant: default/primary/danger/success/warning
│       ├─ Card.tsx                   # title, badge, compact, scroll
│       ├─ Tag.tsx                    # variant: active/idle/loading/error/info
│       ├─ Textarea.tsx              # error state support
│       ├─ CodeBlock.tsx             # CodeBlock + CodeInline
│       ├─ InfoCard.tsx              # variant: blue/green/yellow/red
│       ├─ DataRow.tsx               # label + value 键值对
│       ├─ Metric.tsx                # value + label 指标卡
│       └─ Tree.tsx                  # 递归展开树，支持 onSelect
│
├─ runtime/
│   └─ adapter.ts                    # parseResource (实现) + 5 个 stub 函数
│
└─ tools/
    ├─ validator/index.tsx           # 占位 — STAGE-2
    ├─ fhirpath/index.tsx            # 占位 — STAGE-2
    ├─ profile/index.tsx             # 占位 — STAGE-3
    ├─ resource/index.tsx            # 占位 — STAGE-3
    ├─ diff/index.tsx                # 占位 — STAGE-4
    └─ generator/index.tsx           # 占位 — STAGE-4
```

---

## 修改的配置文件

### vite.config.ts

- 移除 `base: '/prismui/dashboard/'` → `base: '/'`
- 移除 PrismUI 源码路径 alias（不再指向 `../../packages/`）
- 添加 `resolve.alias` 将 `@prismui/react` 和 `@prismui/core` 指向 `node_modules` 内的 ESM 入口
- 添加 `optimizeDeps.include` 强制预打包 PrismUI 和 fhir-runtime

### tsconfig.json

- 更新 `paths` 指向 `./node_modules/` 内的类型声明（而非不存在的源码路径）

### index.html

- 更新 `<title>` 和 `<meta description>` 为 fhir-runtime-tools

---

## 技术问题与解决方案

### 1. @prismui/react Vite 解析失败

**问题:** Vite 7.3 的 dependency scan 无法解析 `@prismui/react`，报 `Failed to resolve import`。

**原因:** `@prismui/react` 的 `package.json` 中 `sideEffects` 字段为 `[false]`（数组包裹），Vite 的依赖扫描可能对此处理不当。

**解决:** 在 `vite.config.ts` 中添加 explicit alias 直接指向 ESM 入口文件：
```ts
resolve: {
  alias: {
    '@prismui/react': path.resolve(__dirname, 'node_modules/@prismui/react/dist/esm/index.mjs'),
    '@prismui/core': path.resolve(__dirname, 'node_modules/@prismui/core/dist/esm/index.mjs'),
  },
},
```

### 2. PrismUI 源码路径不存在

**问题:** 原始配置的 `@prismui/core` 和 `@prismui/react` alias 指向 `../../packages/core/src/index.ts`，该路径在独立仓库中不存在。

**解决:** 使用 npm 安装的包（`@prismui/core@0.2.0`, `@prismui/react@0.2.0`），移除源码路径引用。

---

## 与 ARCHITECTURE.md 的偏差

| 项目 | ARCHITECTURE 描述 | 实际 | 说明 |
|------|-------------------|------|------|
| vite.config.ts | 简单配置 | 添加了 resolve alias + optimizeDeps | 解决 PrismUI 包解析问题 |
| adapter.ts | 6 个函数 | parseResource 已实现，其余 5 个为 stub | 按 STAGE 计划分步实现 |

无重大偏差。

---

## 验收结果

| 验收标准 | 结果 |
|----------|------|
| `npm run dev` 启动后可看到完整 Shell 布局 | ✅ localhost:3000 正常启动 |
| Sidebar 点击可切换 6 个工具页面 | ✅ 6 个导航项，PrismUI usePage 切换 |
| StatusBar 显示 runtime 状态 | ✅ 显示 Ready + 当前 Tool + state version |
| 所有基础 UI 组件可在页面中使用 | ✅ 9 组件 + barrel export |
| `parseResource()` 可成功调用 fhir-runtime | ✅ parseFhirJson + serializeToFhirJson |
| `tsc --noEmit` 零错误 | ✅ |
