# FHIR Resource Composer — Reference Field 设计与实现

**Status**: ✅ Implemented — v1.4  
**Updated**: 2025-03

---

## 1. 概述 / Overview

FHIR Reference 类型用于建立资源间的关联。例如 `Observation.subject` 指向 `Patient`，`Patient.generalPractitioner` 指向 `Organization | Practitioner | PractitionerRole`。

v1.4 实现了结构化的 Reference 编辑器，替代之前的通用 Object 编辑。

---

## 2. 数据结构 / Data Structure

### 2.1 CanonicalElement 中的 Reference 类型

```ts
element.types = [
  {
    code: "Reference",
    targetProfile: [
      "http://hl7.org/fhir/StructureDefinition/Organization",
      "http://hl7.org/fhir/StructureDefinition/Practitioner"
    ]
  }
]
```

### 2.2 Reference JSON 结构

```json
{
  "reference": "Patient/123",
  "display": "John Smith"
}
```

完整的 Reference 还可以包含 `type` 和 `identifier`，但基础版仅支持 `reference` + `display`。

---

## 3. 实现 / Implementation

### 3.1 ReferenceField 组件

**文件**: `src/tools/composer/DynamicForm.tsx`

```tsx
function ReferenceField({
  value,       // { reference: "Patient/123", display: "..." }
  element,     // CanonicalElement with types[0].targetProfile
  onChange,    // (updated: Record<string, unknown>) => void
})
```

**功能**：
1. **Target 类型展示**: 从 `element.types[0].targetProfile[]` 提取目标类型名称，显示为蓝色 chip
2. **reference 输入**: 文本输入框，placeholder 提示 `Patient/...` 格式
3. **display 输入**: 可选的显示名称，为空时自动从 JSON 中移除

### 3.2 类型检测

```ts
const isReference = element.types.some(t => t.code === 'Reference');
```

在 DynamicForm 渲染路由中，`isReference && !isArray` 时使用 `ReferenceField`。

### 3.3 Target Profile 解析

```ts
const targetTypes = element.types
  .filter(t => t.code === 'Reference')
  .flatMap(t => t.targetProfile ?? [])
  .map(url => url.split('/').pop() ?? url);
```

---

## 4. UI 渲染 / UI Rendering

```
┌─────────────────────────────────┐
│ generalPractitioner  Reference  │
│                                 │
│ Target: [Organization] [Practitioner] [PractitionerRole]
│                                 │
│ reference                       │
│ ┌─────────────────────────────┐ │
│ │ Organization/...            │ │
│ └─────────────────────────────┘ │
│ display                         │
│ ┌─────────────────────────────┐ │
│ │ Display name (optional)     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 5. CSS 样式 / Styles

| Class | 用途 |
|-------|------|
| `.composer-form__reference` | Reference 字段容器 |
| `.composer-form__ref-targets` | Target 类型行 |
| `.composer-form__ref-targets-label` | "Target:" 标签 |
| `.composer-form__ref-target-chip` | 蓝色类型 chip |
| `.composer-form__ref-field` | 单个输入字段容器 |

配色：蓝色系 chip (`#dbeafe` bg, `#1e40af` text)。

---

## 6. 适用的 FHIR 类型

| 元素 | 目标类型 |
|------|---------|
| `Patient.generalPractitioner` | Organization, Practitioner, PractitionerRole |
| `Patient.managingOrganization` | Organization |
| `Observation.subject` | Patient, Group, Device, Location |
| `Observation.performer` | Practitioner, Organization, Patient |
| `Condition.subject` | Patient, Group |

---

## 7. 未来扩展 / Future Extensions

- **Reference 搜索**: 从 FHIR server 搜索可用资源
- **Reference 验证**: 验证引用格式 `ResourceType/id`
- **Identifier Reference**: 支持通过 identifier 引用
- **Contained Resource**: 支持内联资源引用
- **Array Reference**: 数组形式的 Reference 字段（如 `generalPractitioner`）
