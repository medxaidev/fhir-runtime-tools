# STAGE-2 — Core Tools

> **Status:** Complete
> **Date:** 2026-03-10
> **Scope:** Resource Validator + FHIRPath Lab + Example Data + Notification Integration

---

## 交付物清单

| # | 任务 | 状态 | 文件 |
|---|------|------|------|
| 2.1 | Adapter: validateResource | ✅ | `src/runtime/adapter.ts` |
| 2.2 | Adapter: evaluateFHIRPath | ✅ | `src/runtime/adapter.ts` |
| 2.3 | Profile Registry | ✅ | `src/runtime/profiles.ts` |
| 2.4 | R4 Profile 数据提取 | ✅ | `src/data/r4-profiles.json` |
| 2.5 | Resource Validator 页面 | ✅ | `src/tools/validator/index.tsx` |
| 2.6 | FHIRPath Lab 页面 | ✅ | `src/tools/fhirpath/index.tsx` |
| 2.7 | 内置示例数据 | ✅ | `src/data/examples.ts` |
| 2.8 | Notification 集成 | ✅ | 验证/评估操作均触发通知 |

---

## 新增文件

`
src/
├─ runtime/
│   ├─ adapter.ts          # validateResource (async, StructureValidator)
│   │                      # evaluateFHIRPath (sync, evalFhirPath)
│   └─ profiles.ts         # Profile Registry — lazy-load r4-profiles.json
│                           # getProfile(), getAvailableProfileTypes()
├─ data/
│   ├─ r4-profiles.json    # 13 StructureDefinitions extracted from spec/fhir/r4/
│   └─ examples.ts         # Patient, Observation, Invalid Patient examples
│                           # + 8 FHIRPath expression examples
└─ tools/
    ├─ validator/index.tsx  # Full page: textarea + examples + validate + issue list
    └─ fhirpath/index.tsx   # Full page: textarea + expression + evaluate + result
`

---

## 核心实现细节

### validateResource()

- **异步** — 需要先加载 Profile（首次触发 lazy import）
- `JSON.parse` → 提取 `resourceType` → `getProfile()` → `StructureValidator.validate()`
- 返回 `{ valid, issues: [{ severity, code, message, path }] }`
- 错误处理: 无效 JSON / 缺少 resourceType / Profile 未找到 / 验证异常

### evaluateFHIRPath()

- **同步** — `JSON.parse` → `evalFhirPath(expression, parsed)`
- 返回 `{ success, result: unknown[] }`
- 支持所有 fhir-runtime v0.7 FHIRPath 功能

### Profile Registry

- 从 `spec/fhir/r4/profiles-resources.json` 提取 13 个常用 StructureDefinition
- 通过 `buildCanonicalProfile()` 转换为 CanonicalProfile
- Lazy-load: 首次 `getProfile()` 调用时触发动态 import
- 支持: Patient, Observation, Encounter, Condition, Procedure, Practitioner, Organization, MedicationRequest, AllergyIntolerance, DiagnosticReport, Bundle, Resource, DomainResource

### Notification 集成

- `useNotification().show()` 在验证/评估操作时触发
- 类型: success (通过), error (失败/异常), warning (无输入)
- `NotificationEntry` 格式: `{ type, message }`

---

## 修改的文件

### vite.config.ts

- 添加 `build.rollupOptions.external` 排除 Node.js 内置模块 (`node:fs`, `node:path`, `node:url`)
- fhir-runtime 的服务端功能（读取本地 spec 文件）在浏览器环境中不可用，但不影响核心功能
- 添加 `resolve.conditions: ['browser', 'default']`

### src/runtime/adapter.ts

- `validateResource()` 从 stub 升级为完整实现
- `evaluateFHIRPath()` 从 stub 升级为完整实现
- 新增 `import { StructureValidator, evalFhirPath }`
- 新增 `import { getProfile }`

---

## 技术问题与解决方案

### 1. fhir-runtime 包含 Node.js 模块引用

**问题:** `fhir-runtime` ESM 入口引用了 `node:fs`, `node:path`, `node:url`（用于服务端加载 spec 文件），导致 `vite build` 失败。

**解决:** 在 `vite.config.ts` 中添加 `build.rollupOptions.external` 将这些模块标记为外部依赖，浏览器环境中不加载。核心的解析、验证、FHIRPath 功能不依赖这些模块。

### 2. profiles-resources.json 过大 (35MB)

**问题:** 完整的 R4 profiles-resources.json 为 35MB，不适合直接 bundle。

**解决:** 使用 Node.js 脚本从中提取 13 个常用 StructureDefinition 到 `src/data/r4-profiles.json` (2.14MB, gzip 271KB)。通过 Vite 的 JSON 动态 import 实现 lazy-load。

### 3. JSON import 类型推断

**问题:** TypeScript 将 JSON 中的 `resourceType: "StructureDefinition"` 推断为 `string`，与 `StructureDefinition` 类型的字面量类型不兼容。

**解决:** 使用 `as Record<string, unknown>` 后再 `as Parameters<typeof buildCanonicalProfile>[0]` 进行类型断言。

---

## 与 ARCHITECTURE.md 的偏差

| 项目 | ARCHITECTURE 描述 | 实际 | 说明 |
|------|-------------------|------|------|
| Profile 来源 | 运行时加载 | 构建时提取 + 运行时 lazy import | 35MB 太大，提取子集 |
| validateResource | 同步 | **异步** | 需要 await profile loading |
| Node.js 模块 | 未提及 | 需 external 排除 | fhir-runtime 包含服务端代码 |

---

## 验收结果

| 验收标准 | 结果 |
|----------|------|
| 粘贴 Patient JSON → Validate → Issue 列表 | ✅ |
| error/warning/info 各有样式区分 | ✅ issue-item--error/warning/information |
| 粘贴 Patient JSON → FHIRPath `Patient.name.given` → Evaluate → 结果 | ✅ |
| 点击示例按钮可加载内置 Resource | ✅ 3 个 Resource + 8 个 FHIRPath 表达式 |
| 无效 JSON 输入时显示友好错误提示 | ✅ notification + error card |
| `tsc --noEmit` 零错误 | ✅ |
| `npm run build` 成功 | ✅ dist/ 产出正常 |
