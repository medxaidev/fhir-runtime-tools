# Roadmap — fhir-runtime-tools v1

> **Project:** `@prismui/fhir-runtime-tools`
> **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
> **Start Date:** 2026-03-10
> **Approach:** Stage-based incremental delivery

---

## Stage 概览

| Stage   | 名称             | 目标                                    | 依赖        |
| ------- | ---------------- | --------------------------------------- | ----------- |
| STAGE-1 | Foundation       | Shell + 基础组件 + Runtime Adapter 骨架 | —           |
| STAGE-2 | Core Tools       | Resource Validator + FHIRPath Lab       | STAGE-1     |
| STAGE-3 | Inspection Tools | Profile Explorer + Resource Lab         | STAGE-1     |
| STAGE-4 | Advanced Tools   | Resource Diff + Resource Generator      | STAGE-1     |
| STAGE-5 | Polish & Deploy  | 优化、示例数据、GitHub Pages 部署       | STAGE-2/3/4 |

---

## STAGE-1 — Foundation

> 搭建项目骨架，实现 Shell 布局、基础 UI 组件、Runtime Adapter。
> 完成后应有一个可运行的空壳应用，能在工具之间导航。

### 交付物

| #   | 任务                   | 文件                                              | 说明                                                                          |
| --- | ---------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1.1 | 项目配置               | `vite.config.ts`, `tsconfig.json`, `package.json` | 调整 base path、alias、确保 fhir-runtime 可引入                               |
| 1.2 | 入口文件               | `src/main.tsx`, `index.html`                      | React 19 渲染入口                                                             |
| 1.3 | PrismUI Runtime 初始化 | `src/setup.ts`                                    | createInteractionRuntime + PageModule + NotificationModule                    |
| 1.4 | App Shell              | `src/App.tsx`                                     | PrismUIProvider + Header + Sidebar + ContentRouter + StatusBar                |
| 1.5 | 全局样式               | `src/styles.css`                                  | CSS Variables + Shell 布局 + BEM 基础类                                       |
| 1.6 | 基础 UI 组件           | `src/components/ui/`                              | Button, Card, Tag, Tree, Textarea, CodeBlock, InfoCard, DataRow, Metric, Grid |
| 1.7 | Runtime Adapter 骨架   | `src/runtime/adapter.ts`                          | parseFhirJson + 基础错误处理，其余函数先返回 stub                             |
| 1.8 | 工具占位页面           | `src/tools/*/index.tsx`                           | 6 个工具页面的占位组件（标题 + 描述 + Coming Soon）                           |

### 验收标准

- `npm run dev` 启动后可看到完整 Shell 布局
- Sidebar 点击可切换 6 个工具页面
- StatusBar 显示 runtime 状态
- 所有基础 UI 组件可在页面中使用
- `src/runtime/adapter.ts` 中 `parseResource()` 可成功调用 fhir-runtime

### Stage 文档

完成后输出 `devdocs/stage/STAGE-1.md`，记录：

- 实际创建的文件清单
- 遇到的技术问题与解决方案
- 与 ARCHITECTURE.md 的偏差（如有）

---

## STAGE-2 — Core Tools

> 实现两个最核心的工具：Resource Validator 和 FHIRPath Lab。
> 这两个工具直接展示 fhir-runtime 的核心能力。

### 交付物

| #   | 任务                      | 文件                     | 说明                                             |
| --- | ------------------------- | ------------------------ | ------------------------------------------------ |
| 2.1 | Adapter: validateResource | `src/runtime/adapter.ts` | parseFhirJson → StructureValidator.validate()    |
| 2.2 | Adapter: evaluateFHIRPath | `src/runtime/adapter.ts` | parseFhirJson → evalFhirPath()                   |
| 2.3 | Resource Validator 页面   | `src/tools/validator/`   | Textarea 输入 → Validate 按钮 → Issue 列表       |
| 2.4 | FHIRPath Lab 页面         | `src/tools/fhirpath/`    | Textarea + Expression 输入 → Evaluate → 结果展示 |
| 2.5 | 内置示例数据              | `src/data/examples.ts`   | Patient, Observation 示例 Resource               |
| 2.6 | Notification 集成         | —                        | 验证成功/失败时显示通知                          |

### 验收标准

- 粘贴 Patient JSON → 点击 Validate → 显示 Issue 列表（error/warning/info 各有样式区分）
- 粘贴 Patient JSON → 输入 `Patient.name.given` → 点击 Evaluate → 显示 `["John"]`
- 点击示例按钮可加载内置 Resource
- 无效 JSON 输入时显示友好错误提示

### Stage 文档

完成后输出 `devdocs/stage/STAGE-2.md`

---

## STAGE-3 — Inspection Tools

> 实现 Profile Explorer 和 Resource Lab。
> 让开发者可以理解 FHIR Profile 结构与 Resource 组成。

### 交付物

| #   | 任务                    | 文件                         | 说明                                                  |
| --- | ----------------------- | ---------------------------- | ----------------------------------------------------- |
| 3.1 | Adapter: inspectProfile | `src/runtime/adapter.ts`     | buildCanonicalProfile → 提取 element tree             |
| 3.2 | Adapter: parseResource  | `src/runtime/adapter.ts`     | parseFhirJson → 结构化展示                            |
| 3.3 | Profile Explorer 页面   | `src/tools/profile/`         | Textarea 输入 SD → Tree 组件展示元素树 → 点击展示详情 |
| 3.4 | Resource Lab 页面       | `src/tools/resource/`        | Textarea 输入 → Format → JSON 视图 + 元素树视图       |
| 3.5 | Tree 组件增强           | `src/components/ui/Tree.tsx` | 支持展开/折叠、点击回调、depth 缩进                   |
| 3.6 | 内置 Profile 数据       | `src/data/profiles.ts`       | Patient, Observation StructureDefinition              |

### 验收标准

- 输入 Patient StructureDefinition → 显示完整元素树
- 点击元素 → 展示 cardinality, type, binding 等信息
- Resource Lab 可格式化任意 FHIR JSON
- Resource Lab 可显示 Resource 的元素树视图

### Stage 文档

完成后输出 `devdocs/stage/STAGE-3.md`

---

## STAGE-4 — Advanced Tools

> 实现 Resource Diff 和 Resource Generator。
> 补全工具集，达到 6 个核心工具全覆盖。

### 交付物

| #   | 任务                      | 文件                            | 说明                                            |
| --- | ------------------------- | ------------------------------- | ----------------------------------------------- |
| 4.1 | Adapter: diffResources    | `src/runtime/adapter.ts`        | JSON deep diff 实现                             |
| 4.2 | Adapter: generateResource | `src/runtime/adapter.ts`        | 模板 + 随机数据生成                             |
| 4.3 | Resource Diff 页面        | `src/tools/diff/`               | 左右两个 Textarea → Diff → 差异列表             |
| 4.4 | Resource Generator 页面   | `src/tools/generator/`          | 选择类型 → Generate → 输出 JSON                 |
| 4.5 | Diff 样式组件             | `src/components/ui/DiffRow.tsx` | added / removed / changed 行样式                |
| 4.6 | 内置模板数据              | `src/data/templates.ts`         | Patient, Observation, Encounter, Condition 模板 |

### 验收标准

- 输入两个 Patient JSON → 显示字段级差异（added/removed/changed）
- 选择 Patient → Generate → 输出合法的 FHIR Patient JSON
- 生成的 Resource 可直接在 Validator 中验证通过

### Stage 文档

完成后输出 `devdocs/stage/STAGE-4.md`

---

## STAGE-5 — Polish & Deploy

> 整体优化与部署。完善用户体验、补充示例、GitHub Pages 部署。

### 交付物

| #   | 任务           | 文件                               | 说明                                             |
| --- | -------------- | ---------------------------------- | ------------------------------------------------ |
| 5.1 | Load File 功能 | —                                  | 所有工具支持 `<input type="file">` 加载本地 JSON |
| 5.2 | 示例数据补充   | `src/data/`                        | 更多 Resource 类型示例 + FHIRPath 示例表达式     |
| 5.3 | 错误边界       | `src/components/ErrorBoundary.tsx` | React ErrorBoundary，防止工具崩溃                |
| 5.4 | 响应式优化     | `src/styles.css`                   | 小屏适配（sidebar 折叠等）                       |
| 5.5 | Build & Deploy | `vite.config.ts`, CI               | GitHub Pages 部署配置                            |
| 5.6 | README         | `README.md`                        | 项目说明、截图、使用方式                         |

### 验收标准

- `npm run build` 成功，产出 `dist/`
- 部署到 GitHub Pages 可正常访问
- 6 个工具均可正常使用
- 加载本地文件正常工作
- 无控制台报错

### Stage 文档

完成后输出 `devdocs/stage/STAGE-5.md`

---

## 当前状态

| Stage   | 名称                        | 状态       | 备注                                                     |
| ------- | --------------------------- | ---------- | -------------------------------------------------------- |
| STAGE-1 | Foundation                  | **已完成** | 2026-03-10, 详见 `devdocs/stage/STAGE-1.md`              |
| STAGE-2 | Core Tools                  | **已完成** | 详见 `devdocs/stage/STAGE-2.md`                          |
| —       | Validator v1.1              | **已完成** | Schema tree, US Core, Skeleton Generator, JSON↔Tree sync |
| —       | Composer v1.0–v1.4          | **已完成** | Tree/Form/JSON editor, Choice/Backbone/Slice/Ext/Ref     |
| —       | Explorer v1.0               | **已完成** | Instance tree builder, Inspector, 3-column workspace     |
| —       | Upgrade fhir-runtime v0.8.0 | **已完成** | 2026-03-12, 详见 `devdocs/stage/STAGE-Upgrade-v0.8.0.md` |
| STAGE-3 | Inspection Tools            | 待开始     | 依赖 STAGE-1 ✅                                          |
| STAGE-4 | Advanced Tools              | 待开始     | 依赖 STAGE-1 ✅                                          |
| STAGE-5 | Polish & Deploy             | 待开始     | 依赖 STAGE-2/3/4                                         |

---

## Stage 执行规则

1. **顺序执行** — STAGE-1 必须先完成；STAGE-2/3/4 可按需调整顺序但建议按编号；STAGE-5 最后
2. **Stage 文档** — 每个 Stage 完成后在 `devdocs/stage/` 下输出对应文档
3. **验收驱动** — 每个 Stage 以验收标准为完成条件
4. **增量交付** — 每个 Stage 完成后应用可正常运行，不存在 broken state
5. **偏差记录** — 实现中与 ARCHITECTURE.md 的任何偏差需在 Stage 文档中记录
