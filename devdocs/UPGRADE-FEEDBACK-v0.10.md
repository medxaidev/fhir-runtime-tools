# fhir-runtime v0.10.0 — Upgrade Feedback for fhir-runtime-tools

**日期**: 2026-03-18
**fhir-runtime 版本**: v0.10.0
**目标**: 为 fhir-runtime-tools 提供升级指引，说明 v0.10.0 中解决了哪些问题，以及 fhir-runtime-tools 应如何调整

---

## 1. 已解决的问题

### 1.1 buildCanonicalProfile 切片丢失 — ✅ 已修复

**问题**: `buildCanonicalProfile()` 中切片元素覆盖基础元素，导致切片信息丢失。

**修复**: 
- 两遍算法：第一遍仅处理非切片元素（id 不含 `:`），第二遍提取切片信息
- `CanonicalProfile` 新增 `slicing?: Map<string, SlicedElement>` 字段
- 基础元素的 `slicing` 定义（判别器、规则）不再被覆盖

**fhir-runtime-tools 迁移指引**:
```typescript
// 旧方式（需要访问原始 SD + 自研 extractSlicing）
const rawSD = await getRawStructureDefinition(resourceType);
const slicingMap = extractSlicing(rawSD);  // 420 行自研代码

// 新方式（直接从 CanonicalProfile 获取）
const profile = await getProfile(resourceType);
const slicingMap = profile.slicing;  // 内置支持
```

**可移除代码**:
- `src/tools/composer/slice-engine.ts` 中的 `extractSlicing()` 函数（~120 行提取逻辑）
- `src/runtime/profiles.ts` 中的 `rawSDCache` 和 `getRawStructureDefinition()` — 不再需要保存原始 SD

### 1.2 inferComplexType 类型推断 — ✅ 已改进

**问题**: ContactPoint/Identifier 在特定场景下误判（`use: 'home'` 重叠值）。

**修复**:
- 新增 Identifier 特有字段检测（`type`、`assigner`）
- `mobile` 仅在 ContactPoint.use 有效时优先判定为 ContactPoint
- 对于重叠的 `use` 值（home/work/temp/old），检查 `system` 是否为 URI 来区分

**fhir-runtime-tools 迁移指引**:
```typescript
// 旧方式（需要 workaround）
const TYPE_INFERENCE_FIXES = { ... };  // ~100 行自研代码
function isTypeMismatchFalsePositive(...) { ... }

// 新方式（移除 workaround）
// 不再需要 TYPE_INFERENCE_FIXES 和 isTypeMismatchFalsePositive
// 直接使用 StructureValidator.validate() 即可
```

**可移除代码**:
- `src/runtime/adapter.ts` 中的 `TYPE_INFERENCE_FIXES` 常量
- `src/runtime/adapter.ts` 中的 `isTypeMismatchFalsePositive()` 函数
- `validateResource()` 中的误报过滤逻辑

---

## 2. 新增 API

### 2.1 Slicing API

| 函数 | 说明 | 替代的自研代码 |
|------|------|---------------|
| `matchSlice(instance, slicedElement)` | 匹配实例到切片 | `slice-engine.ts:matchSlice()` |
| `countSliceInstances(items, slicedElement)` | 统计各切片实例数 | `slice-engine.ts:countSliceInstances()` |
| `generateSliceSkeleton(slice)` | 生成切片骨架 | `slice-engine.ts:generateSliceSkeleton()` |
| `isExtensionSlicing(basePath)` | 检测扩展切片 | `slice-engine.ts:isExtensionSlicing()` |

**类型映射**:

| fhir-runtime-tools 类型 | fhir-runtime v0.10.0 类型 |
|--------------------------|--------------------------|
| `SlicingInfo` | `SlicedElement` |
| `SliceDefinition` | `SliceDefinition` |
| `SlicingDiscriminator` | `SlicingDiscriminatorDef` |
| `SlicedElementInfo` | `SlicedElement` |

### 2.2 Choice Type API

| 函数 | 说明 | 替代的自研代码 |
|------|------|---------------|
| `isChoiceType(element)` | 检测选择类型 | `choice-type-engine.ts:isChoiceType()` |
| `getChoiceBaseName(path)` | 提取基础名称 | `choice-type-engine.ts:getChoiceBaseName()` |
| `buildChoiceJsonKey(base, type)` | 构建 JSON 键 | `choice-type-engine.ts:buildChoiceJsonKey()` |
| `parseChoiceJsonKey(key, base)` | 解析 JSON 键 | `choice-type-engine.ts:parseChoiceJsonKey()` |
| `resolveActiveChoiceType(el, resource)` | 解析活跃类型 | `choice-type-engine.ts:resolveChoiceType()` |
| `resolveChoiceFromJsonKey(key, elements)` | 从 JSON 键反向解析 | `choice-type-engine.ts:resolveChoiceFromJsonKey()` |

**保留在应用层**:
- `switchChoiceType()` — 涉及资源修改，保留在应用层
- `generateChoiceSkeleton()` — 默认值生成，保留在应用层

### 2.3 BackboneElement API

| 函数 | 说明 | 替代的自研代码 |
|------|------|---------------|
| `isBackboneElement(element)` | 检测骨干元素 | `instance-tree-engine.ts:isBackboneElement()` |
| `isArrayElement(element)` | 检测数组元素 | `instance-tree-engine.ts:isArrayElement()` |
| `getBackboneChildren(path, profile)` | 获取子元素 | `instance-tree-engine.ts:getBackboneChildren()` |

**保留在应用层**:
- `getDeepValue()` / `setDeepValue()` — 通用 JSON 操作
- `addArrayItem()` / `removeArrayItem()` — 资源修改操作
- `buildJsonPath()` — UI 路径构建

---

## 3. 迁移清单

### Phase 1: 升级依赖
```json
{
  "dependencies": {
    "fhir-runtime": "^0.10.0"
  }
}
```

### Phase 2: 替换 Slicing 引擎（节省 ~420 行）
- [ ] 将 `extractSlicing(rawSD)` 替换为 `profile.slicing`
- [ ] 将自研 `matchSlice()` 替换为 `import { matchSlice } from 'fhir-runtime'`
- [ ] 将自研 `countSliceInstances()` 替换为 fhir-runtime 版本
- [ ] 将自研 `generateSliceSkeleton()` 替换为 fhir-runtime 版本
- [ ] 调整 `SlicingInfo` → `SlicedElement` 类型引用
- [ ] 移除 `rawSDCache` 和 `getRawStructureDefinition()` （如不再需要原始 SD）
- [ ] 移除或简化 `slice-engine.ts`

### Phase 3: 移除类型推断 Workaround（节省 ~100 行）
- [ ] 移除 `TYPE_INFERENCE_FIXES` 常量
- [ ] 移除 `isTypeMismatchFalsePositive()` 函数
- [ ] 简化 `validateResource()` 中的过滤逻辑

### Phase 4: 替换 Choice Type / BackboneElement（节省 ~100 行）
- [ ] 替换 `isChoiceType()`、`getChoiceBaseName()` 等检测函数
- [ ] 替换 `isBackboneElement()`、`isArrayElement()`、`getBackboneChildren()`
- [ ] 保留 `switchChoiceType()`、`generateChoiceSkeleton()` 等 UI 操作函数

### Phase 5: 测试验证
- [ ] 运行所有测试确保行为一致
- [ ] 特别验证切片匹配在 US Core 场景的行为
- [ ] 验证验证器不再产生 TYPE_MISMATCH 误报

---

## 4. 注意事项

### 4.1 SlicedElement vs SlicingInfo 差异

fhir-runtime 的 `SlicedElement` 与 fhir-runtime-tools 的 `SlicingInfo` 略有不同：

| 字段 | fhir-runtime-tools | fhir-runtime |
|------|-------|------|
| 判别器 | `slicing.discriminator` | `slicedElement.discriminators` |
| 切片列表 | 通过 `SlicedElementInfo.slices` | `slicedElement.slices` |
| 子元素 | `SliceDefinition.children` | 不包含（使用 profile.elements 查询） |
| max 类型 | `string` ("1", "*") | `number \| 'unbounded'` |

### 4.2 不包含的功能

fhir-runtime v0.10.0 的 `SliceDefinition` **不包含** `children` 字段（切片子元素列表）。
如果 Composer 需要切片子元素信息，仍需从原始 SD 获取或自行从 snapshot 构建。

### 4.3 向后兼容

- `CanonicalProfile.slicing` 是**可选字段**，不影响现有代码
- `buildCanonicalProfile()` 行为变更：不再让切片覆盖基础元素
- `inferComplexType()` 修复只减少误报，不影响正确判断

---

_fhir-runtime v0.10.0 升级反馈 — 生成于 2026-03-18_
