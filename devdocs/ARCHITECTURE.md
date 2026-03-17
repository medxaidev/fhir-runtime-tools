# Architecture v1

> **Project:** `@prismui/fhir-runtime-tools`
> **Version:** 0.2.0
> **Tech Stack:** React 19 + TypeScript + Vite + PrismUI v0.2 + fhir-runtime v0.8
> **Runtime:** 100% Browser, No Backend

---

## 1. 总体定位

**fhir-runtime-tools** 是 fhir-runtime 的官方浏览器端开发者工具。

核心目标：

- **Validate** — 验证 FHIR Resource 结构与约束
- **Inspect** — 分析 FHIR Profile 与元素定义
- **Experiment** — 交互式测试 FHIRPath 表达式
- **Debug** — 调试 FHIR 数据结构与差异

---

## 2. 在 MedXAI 技术体系中的位置

```
MedXAI Ecosystem
├─ Layer 1: fhir-runtime        — FHIR R4 execution engine (npm library)
├─ Layer 2: fhir-runtime-tools  — developer toolkit (browser app) ← 本项目
├─ Layer 3: fhir-server         — data infrastructure
└─ Layer 4: medxai-platform     — developer platform
```

fhir-runtime-tools 的角色是 **Runtime Adoption Accelerator** — 降低 fhir-runtime 的学习与使用门槛，加速生态发展。

---

## 3. 技术栈

| 层级             | 技术           | 版本   | 说明                                               |
| ---------------- | -------------- | ------ | -------------------------------------------------- |
| UI Framework     | React          | 19.2.4 | JSX 组件                                           |
| State Management | @prismui/core  | 0.2.0  | Interaction Runtime + Modules                      |
| React Bindings   | @prismui/react | 0.2.0  | Hooks (usePage, useModal, etc.)                    |
| FHIR Engine      | fhir-runtime   | 0.8.0  | Parsing, Validation, FHIRPath, Profile, Definition |
| Build            | Vite           | 7.3.1  | SWC plugin, dev server                             |
| Language         | TypeScript     | 5.x    | Strict mode                                        |
| Styling          | Custom CSS     | —      | BEM 命名, CSS Variables, 无 Tailwind               |
| JSON Editor      | Textarea       | —      | 原生 textarea，不使用 Monaco                       |

---

## 4. 项目结构

```
src/
├─ main.tsx                        # 入口
├─ App.tsx                         # PrismUIProvider + Shell
├─ setup.ts                       # Runtime 初始化
│
├─ components/
│   └─ ui/                        # 基础 UI 组件（自研）
│       ├─ Button.tsx
│       ├─ Card.tsx
│       ├─ Tree.tsx
│       ├─ Tag.tsx
│       ├─ Textarea.tsx           # JSON 编辑区
│       └─ ...
│
├─ tools/                         # 工具页面模块
│   ├─ validator/                 # Resource Validator
│   ├─ fhirpath/                  # FHIRPath Lab
│   ├─ profile/                   # Profile Explorer
│   ├─ resource/                  # Resource Lab
│   ├─ diff/                      # Resource Diff
│   └─ generator/                 # Resource Generator
│
├─ runtime/                       # fhir-runtime 适配层
│   └─ adapter.ts                 # Runtime Adapter
│
└─ styles.css                     # 全局样式（CSS Variables + BEM）
```

---

## 5. UI 架构（PrismUI Shell）

采用 PrismUI Dashboard 的 Shell 布局模式：

```
┌────────────────────────────────────────────────────┐
│ Header                              [version] [meta]│
├─────────────┬──────────────────────────────────────┤
│ Sidebar     │ Main Content                         │
│             │                                      │
│ ◎ Validator │   ┌─ Editor Panel ─────────────────┐ │
│ ⟡ FHIRPath  │   │ textarea (JSON input)          │ │
│ ◈ Profile   │   └───────────────────────────────┘ │
│ ▣ Resource  │   ┌─ Tool Panel ───────────────────┐ │
│ ⊟ Diff      │   │ tool-specific controls         │ │
│ ⊞ Generator │   └───────────────────────────────┘ │
│             │   ┌─ Result Panel ─────────────────┐ │
│             │   │ validation / evaluation result  │ │
│             │   └───────────────────────────────┘ │
├─────────────┴──────────────────────────────────────┤
│ StatusBar                                          │
└────────────────────────────────────────────────────┘
```

### 5.1 Shell 组件

```tsx
// App.tsx — 遵循 PrismUI Dashboard 模式
<PrismUIProvider runtime={runtime}>
  <div className="shell">
    <Header />
    <Sidebar />
    <main className="shell-main">
      <ContentRouter />
    </main>
    <StatusBar />
  </div>
</PrismUIProvider>
```

### 5.2 Shell 布局（CSS Grid）

```css
.shell {
  display: grid;
  grid-template-columns: var(--nav-width) 1fr;
  grid-template-rows: var(--header-height) 1fr var(--statusbar-height);
  height: 100vh;
}
```

### 5.3 页面导航

使用 PrismUI 的 `usePage` hook 实现页面切换：

```tsx
const NAV_ITEMS = [
  { id: "Validator", label: "Resource Validator", icon: "◎", section: "Tools" },
  { id: "FHIRPath", label: "FHIRPath Lab", icon: "⟡", section: "Tools" },
  { id: "Profile", label: "Profile Explorer", icon: "◈", section: "Tools" },
  { id: "Resource", label: "Resource Lab", icon: "▣", section: "Tools" },
  { id: "Diff", label: "Resource Diff", icon: "⊟", section: "Tools" },
  { id: "Generator", label: "Resource Generator", icon: "⊞", section: "Tools" },
];
```

---

## 6. 基础 UI 组件（src/components/ui）

所有基础组件均为自研，不使用第三方 UI 库。样式遵循 PrismUI Dashboard 的设计体系。

| 组件      | 说明                                    | CSS Class 参考           |
| --------- | --------------------------------------- | ------------------------ |
| Button    | 按钮（primary, danger, success, small） | `.btn`, `.btn--primary`  |
| Card      | 卡片容器（header, body, badge）         | `.card`, `.card__header` |
| Tag       | 状态标签（active, error, idle）         | `.tag`, `.tag--active`   |
| Tree      | 树形展开组件（Profile Element 树）      | `.state-node` 系列       |
| Textarea  | JSON 编辑区域（替代 Monaco）            | `.input` 系列            |
| CodeBlock | 代码/结果展示                           | `.code-block`            |
| InfoCard  | 提示信息卡（blue, green, yellow, red）  | `.info-card` 系列        |
| DataRow   | 键值对数据行                            | `.data-row`              |
| Metric    | 指标卡片                                | `.metric`                |
| Grid      | 网格布局                                | `.grid-2`, `.grid-3`     |

### 6.1 设计变量（CSS Variables）

```css
:root {
  --nav-width: 220px;
  --header-height: 50px;
  --statusbar-height: 28px;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Consolas", monospace;
  --color-bg: #f8f9fa;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-accent: #3b82f6;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

---

## 7. Runtime Adapter

工具模块不直接调用 fhir-runtime，通过 Adapter 层封装：

```ts
// src/runtime/adapter.ts

import {
  parseFhirJson,
  StructureValidator,
  buildCanonicalProfile,
  evalFhirPath,
  SnapshotGenerator,
  FhirContextImpl,
} from 'fhir-runtime';

export function validateResource(json: string, profileUrl?: string): ValidationResult { ... }
export function evaluateFHIRPath(json: string, expression: string): EvalResult { ... }
export function inspectProfile(sd: unknown): ProfileInfo { ... }
export function diffResources(a: string, b: string): DiffResult { ... }
export function generateResource(type: string): string { ... }
export function parseResource(json: string): ParseResult { ... }
```

### 7.1 fhir-runtime v0.8 可用能力

Adapter 封装以下 fhir-runtime 模块：

| 模块         | 用途                                     | 工具映射                      |
| ------------ | ---------------------------------------- | ----------------------------- |
| `parser`     | parseFhirJson, serializeToFhirJson       | 所有工具的 JSON 解析          |
| `context`    | FhirContextImpl, MemoryLoader            | Profile Explorer              |
| `profile`    | SnapshotGenerator, buildCanonicalProfile | Profile Explorer, Validator   |
| `validator`  | StructureValidator                       | Resource Validator            |
| `fhirpath`   | evalFhirPath, evalFhirPathBoolean        | FHIRPath Lab                  |
| `pipeline`   | ValidationPipeline                       | Resource Validator (进阶)     |
| `model`      | FHIR R4 类型定义                         | 所有工具                      |
| `definition` | DefinitionProvider, createRuntime        | 可选：统一定义管理 (v0.8新增) |

---

## 8. 核心工具模块

v1 共 6 个核心工具，覆盖 90% 的 FHIR 开发调试场景。

### 8.1 Resource Validator

验证 FHIR Resource 是否符合规范或 Profile 约束。

- **输入:** Textarea 输入 FHIR Resource JSON + 可选 Profile URL
- **Runtime 调用:** `parseFhirJson()` → `StructureValidator.validate()` 或 `ValidationPipeline`
- **输出:** Issue 列表 (severity: error / warning / information, path, message)

### 8.2 FHIRPath Lab

交互式测试 FHIRPath 表达式。

- **输入:** Textarea 输入 Resource JSON + Expression 输入框
- **Runtime 调用:** `evalFhirPath(expression, resource)`
- **输出:** 求值结果（JSON 数组）
- **附加:** 表达式历史记录、示例表达式

### 8.3 Profile Explorer

分析 StructureDefinition，展示 Profile 元素树。

- **输入:** Textarea 输入 StructureDefinition JSON 或选择内置 Profile
- **Runtime 调用:** `buildCanonicalProfile()` → 遍历 elements
- **输出:** Tree 组件展示元素树，点击展示 cardinality / type / binding / definition

### 8.4 Resource Lab

Resource 格式化、结构分析。

- **输入:** Textarea 输入 FHIR Resource JSON
- **Runtime 调用:** `parseFhirJson()` → `serializeToFhirJson()` (格式化)
- **输出:** 格式化 JSON 视图 + 元素树视图

### 8.5 Resource Diff

比较两个 FHIR Resource 的差异。

- **输入:** 两个 Textarea 输入 Resource JSON
- **Runtime 调用:** `parseFhirJson()` × 2 → JSON deep diff
- **输出:** 差异列表 (added / removed / changed)

### 8.6 Resource Generator

生成测试用 FHIR Resource。

- **输入:** 选择 Resource 类型 (Patient, Observation, etc.)
- **Runtime 调用:** 内置模板 + 随机数据
- **输出:** 生成的 FHIR Resource JSON

---

## 9. PrismUI Runtime 集成

### 9.1 Runtime 初始化

```ts
// src/setup.ts
import {
  createInteractionRuntime,
  createPageModule,
  createNotificationModule,
} from "@prismui/core";

export const runtime = createInteractionRuntime({
  modules: [
    createPageModule(),
    createNotificationModule({ maxNotifications: 50 }),
  ],
});
```

### 9.2 使用的 PrismUI Modules

| Module             | 用途                           |
| ------------------ | ------------------------------ |
| PageModule         | 工具页面切换 (Sidebar 导航)    |
| NotificationModule | 操作结果通知 (验证成功/失败等) |

### 9.3 使用的 PrismUI Hooks

| Hook              | 用途                   |
| ----------------- | ---------------------- |
| `usePage`         | 获取当前页面、页面切换 |
| `useNotification` | 显示操作通知           |
| `useRuntimeState` | 触发 re-render         |

---

## 10. 部署

| 项目     | 值                                               |
| -------- | ------------------------------------------------ |
| 运行环境 | 100% Browser                                     |
| 后端依赖 | 无                                               |
| 部署方式 | GitHub Pages (static hosting)                    |
| 部署 URL | `https://medxaidev.github.io/fhir-runtime-tools` |
| Build    | `vite build` → `dist/`                           |

---

## 11. 数据来源

所有数据在浏览器端处理，支持三种输入方式：

- **Paste JSON** — 直接粘贴到 Textarea
- **Load File** — `<input type="file">` 读取本地 JSON 文件
- **Built-in Examples** — 内置示例 Resource / Profile

---

## 12. 设计原则

1. **Runtime-first** — 工具围绕 fhir-runtime 能力构建，不重新实现 FHIR 逻辑
2. **Lightweight** — 无 Monaco、无重依赖、Textarea + 自研组件
3. **Stateless** — 无持久化、无用户账号、刷新即重置
4. **PrismUI Pattern** — 遵循 PrismUI Dashboard 的 Shell/Page/Component 模式
5. **Adapter Isolation** — runtime 升级不影响 UI 层

---

## 13. v1 成功标准

- fhir-runtime 开发者可以在浏览器中完成基本的 Resource 验证与 FHIRPath 测试
- 无需安装任何工具，打开即用
- 覆盖 fhir-runtime 核心 API 的交互式演示

---

## 14. 未来扩展（v2）

- Terminology Explorer — ValueSet / CodeSystem 浏览
- Search Tester — SearchParameter 测试
- Bundle Builder — Bundle 组装工具
- Dataset Builder — 批量测试数据生成
- Mapping Lab — StructureMap 可视化
