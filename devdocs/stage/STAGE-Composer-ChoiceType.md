# FHIR Resource Composer — Choice Type (`[x]`) 设计与实现

**Status**: ✅ Implemented — v1.1  
**Updated**: 2025-03

---

## 1. 概述 / Overview

FHIR choice type（`value[x]`）是 StructureDefinition 中多态元素，在 JSON 中只能出现一个具体变体（如 `valueQuantity`、`valueString`）。

本方案在 Composer 的三个同步视图（Element Tree、Dynamic Form、Monaco JSON Editor）中完整实现了 choice type 的识别、展示、切换和同步。

### 核心原则

- **Tree** 展示 `[x]` 节点，展开后列出所有可选类型，仅一个 active
- **Form** 提供 type selector 下拉 + 动态子表单
- **JSON** 显示具体变体 key（`valueQuantity`），切换时自动删旧增新
- **双向同步**：任一视图变更，其余视图实时响应

---

## 2. FHIR 规范 / FHIR Specification

| Element                    | Choice Types                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Observation.value[x]`     | Quantity, CodeableConcept, string, boolean, integer, Range, Ratio, SampledData, time, dateTime, Period |
| `Observation.effective[x]` | dateTime, Period, Timing, instant                                                                      |
| `Patient.deceased[x]`      | boolean, dateTime                                                                                      |

StructureDefinition 中，`element.path` 以 `[x]` 结尾，`element.types` 含多个 type code。JSON 中只允许存在一个具体变体：

```json
{ "valueQuantity": { "value": 72, "unit": "kg" } }
```

---

## 3. 架构 / Architecture

### 3.1 Choice Type Engine

**文件**: `src/tools/composer/choice-type-engine.ts`

| 函数                                           | 用途                                                          |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `isChoiceType(element)`                        | 判断元素是否为 choice type（path 以 `[x]` 结尾 且 types > 1） |
| `getChoiceBaseName(path)`                      | `"value[x]"` → `"value"`                                      |
| `buildChoiceJsonKey(base, type)`               | `("value", "Quantity")` → `"valueQuantity"`                   |
| `parseChoiceJsonKey(key, base)`                | `"valueQuantity"` → `"Quantity"`                              |
| `resolveChoiceType(element, resource)`         | 返回 `ChoiceTypeInfo`：扫描 JSON 找到 active 变体             |
| `resolveChoiceFromJsonKey(key, elements)`      | JSON key → canonical element + typeCode（用于 cursor sync）   |
| `switchChoiceType(resource, element, newType)` | 删除所有旧变体 → 创建新变体（含默认值骨架）                   |
| `generateChoiceSkeleton(typeCode)`             | 为指定 FHIR 类型生成最小默认值                                |
| `getChoiceElementPaths(elements)`              | 获取所有 choice element canonical path 集合                   |

### 3.2 数据类型

```typescript
interface ChoiceTypeInfo {
  canonicalPath: string; // "Observation.value[x]"
  baseName: string; // "value"
  availableTypes: string[]; // ["Quantity", "string", "boolean", ...]
  activeType: string | null; // "Quantity"
  activeJsonKey: string | null; // "valueQuantity"
}
```

### 3.3 Path Mapping

| Canonical Path         | JSON Key               | 方向                                           |
| ---------------------- | ---------------------- | ---------------------------------------------- |
| `Observation.value[x]` | `valueQuantity`        | canonical → JSON: `buildChoiceJsonKey()`       |
| `valueQuantity`        | `Observation.value[x]` | JSON → canonical: `resolveChoiceFromJsonKey()` |

---

## 4. Element Tree 实现 / Tree Implementation

**文件**: `src/tools/composer/ComposerTree.tsx`

### 4.1 Choice 节点展示

```
▸ value[x]  [x]                   0..1
```

展开后显示所有可选类型子节点：

```
▾ value[x]  [x]                   0..1
    ● valueQuantity    Quantity       ← active (绿色)
    ○ valueString      string         ← inactive (灰色)
    ○ valueBoolean     boolean        ← inactive (灰色)
    ○ valueCodeableConcept  ...
```

### 4.2 实现细节

- `isChoiceType(node.element)` 判断 → 显示 `[x]` badge
- `ChoiceTypeChildren` 组件渲染所有变体子节点
- 点击 inactive 变体 → `onChoiceSwitch(element, typeCode)` 触发切换
- active 变体：`● 绿色 + #f0fdf4 背景`
- inactive 变体：`○ 半透明 opacity: 0.5`
- `hasValueInResource()` 和 `getPreviewValue()` 均已 choice-aware

### 4.3 数据感知

Tree 的 present/absent 检测已改为接受 `CanonicalElement` 而非 string path：

- 普通元素：检查 `key in resource`
- Choice 元素：扫描所有变体 `buildChoiceJsonKey(baseName, t.code) in resource`

---

## 5. Dynamic Form 实现 / Form Implementation

**文件**: `src/tools/composer/DynamicForm.tsx`

### 5.1 ChoiceTypeField 组件

当选中 choice 元素时，Form 显示：

```
┌─────────────────────────────┐
│ value[x]        [x]        │
│ Required                    │
├─────────────────────────────┤
│ Path: Observation.value[x]  │
│ Cardinality: 0..1           │
│ Active Type: Quantity        │
├─────────────────────────────┤
│ Type                         │
│ [ Quantity ▼ ]               │
│                              │
│ ┌ valueQuantity ──────────┐ │
│ │ value  [ 72          ]  │ │
│ │ unit   [ kg          ]  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 5.2 Type Selector

`<select>` 下拉，options 从 `element.types[].code` 自动生成：

- 选择新类型 → `onChoiceSwitch(element, typeCode)` → 触发 `switchChoiceType()`

### 5.3 动态子表单

根据 active 变体的实际 JSON 值类型渲染：

- `string` → `StringField`
- `number` → `NumberField`
- `boolean` → `BooleanField`
- `object` → `ObjectField`（递归子字段）

---

## 6. 切换逻辑 / Switch Logic

**函数**: `switchChoiceType()` in `choice-type-engine.ts`

```
用户选择: Quantity → String
```

**Step 1**: 删除所有旧变体 key

```typescript
for (const t of element.types) {
  delete clone[buildChoiceJsonKey(baseName, t.code)];
}
```

**Step 2**: 创建新变体 key + 默认值

```typescript
clone[newKey] = generateChoiceSkeleton(newTypeCode);
```

**Step 3**: `updateResourceObject(clone)` → 三视图同步刷新

### Skeleton 示例

| Type              | Skeleton                                    |
| ----------------- | ------------------------------------------- |
| `Quantity`        | `{ value: 0, unit: "" }`                    |
| `string`          | `""`                                        |
| `boolean`         | `false`                                     |
| `integer`         | `0`                                         |
| `CodeableConcept` | `{ text: "" }`                              |
| `Period`          | `{ start: "", end: "" }`                    |
| `Range`           | `{ low: { value: 0 }, high: { value: 0 } }` |
| `Reference`       | `{ reference: "" }`                         |

---

## 7. 双向同步 / Bidirectional Sync

### 7.1 Tree/Form → JSON

用户在 Tree 点击变体或 Form 切换类型：

1. `handleChoiceSwitch(element, typeCode)` → `switchChoiceType()`
2. `updateResourceObject(updated)` → `setJsonText(JSON.stringify(...))`

用户在 Form 编辑值：

1. `handleChoiceValueChange(newVal)` → `onChange("Observation.valueQuantity", newVal)`
2. `handleFormChange()` → `setValueAtPath()` → `updateResourceObject()`

### 7.2 JSON → Tree/Form

用户在 Monaco 输入 `"valueQuantity": ...`：

1. `handleCursorKey("valueQuantity")`
2. 先尝试 `profile.elements.get("Observation.valueQuantity")` — 无匹配
3. 回退 `resolveChoiceFromJsonKey("valueQuantity", elements)` → 匹配到 `Observation.value[x]` + `Quantity`
4. `setSelectedElement(choiceElement)` → Tree 高亮 `value[x]`，Form 显示 Quantity 选中状态

### 7.3 selectedValue 计算

```typescript
if (isChoiceType(selectedElement)) {
  const info = resolveChoiceType(selectedElement, resource);
  return resource[info.activeJsonKey]; // e.g. resource["valueQuantity"]
}
```

---

## 8. CSS 样式 / Styling

**文件**: `src/styles.css`（`.composer-*` 命名空间）

| Class                                       | 用途                   |
| ------------------------------------------- | ---------------------- |
| `.composer-tree-node__choice-badge`         | `[x]` 紫色标签         |
| `.composer-tree-node__row--choice-active`   | 绿色底 #f0fdf4         |
| `.composer-tree-node__row--choice-inactive` | 半透明 opacity 0.5     |
| `.composer-tree-node__choice-icon`          | ● 绿色 / ○ 灰色        |
| `.composer-tree-node__name--dimmed`         | 未选中变体文字         |
| `.composer-tree-node__type-badge`           | 类型标签 mono 字体     |
| `.composer-form__choice`                    | Choice form 容器       |
| `.composer-form__choice-selector`           | Type 下拉行            |
| `.composer-form__choice-value`              | 值编辑区域（带边框）   |
| `.composer-form__choice-badge`              | Form header `[x]` 标签 |

---

## 9. 文件索引 / File Index

| File                                       | Purpose                                               |
| ------------------------------------------ | ----------------------------------------------------- |
| `src/tools/composer/choice-type-engine.ts` | Choice type 核心引擎：检测、解析、切换、骨架生成      |
| `src/tools/composer/ComposerTree.tsx`      | Element Tree：`ChoiceTypeChildren` 渲染变体子节点     |
| `src/tools/composer/DynamicForm.tsx`       | Dynamic Form：`ChoiceTypeField` 类型选择 + 子表单     |
| `src/tools/composer/ComposerWorkspace.tsx` | 主 workspace：`handleChoiceSwitch`、choice-aware sync |
| `src/styles.css`                           | Choice type CSS（`.composer-*__choice-*`）            |

---

## 10. 设计优势 / Why This Design

大多数 FHIR 工具的常见错误：

- ❌ 直接展示 `valueQuantity` 作为固定字段名
- ❌ 不提示用户这是多态元素
- ❌ 切换类型时残留旧数据

本方案的优势：

- ✅ Tree 明确展示 `value[x]` + 所有可选类型
- ✅ Form 提供 type selector，自动切换表单
- ✅ 切换时原子操作：删旧 → 建新 → 三视图同步
- ✅ JSON cursor sync 能识别具体变体并反向映射到 canonical path
- ✅ 从 StructureDefinition 自动读取可选类型，无需硬编码
