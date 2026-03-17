# FHIR Resource Composer — Extension Slicing 设计与实现

**Status**: ✅ Implemented — v1.4  
**Updated**: 2025-03

---

## 1. 概述 / Overview

FHIR Extension 是通过 `extension` 数组实现的扩展机制。US Core Profile 使用 extension slicing 定义必要的扩展，如 Patient 的 race、ethnicity、birthsex 等。

v1.3 中 `slice-engine.ts` 过滤了 `*.extension` 和 `*.modifierExtension` 的 slicing。v1.4 移除了该过滤，使 extension slicing 通过现有的 slicing 基础设施自然处理。

---

## 2. 数据结构 / Data Structure

### 2.1 Extension Slicing 在 StructureDefinition 中

```json
{
  "id": "Patient.extension",
  "path": "Patient.extension",
  "slicing": {
    "discriminator": [{ "type": "value", "path": "url" }],
    "ordered": false,
    "rules": "open"
  },
  "type": [{ "code": "Extension" }]
}
```

每个 extension slice 定义：

```json
{
  "id": "Patient.extension:race",
  "path": "Patient.extension",
  "sliceName": "race",
  "type": [{
    "code": "Extension",
    "profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-race"]
  }],
  "min": 0,
  "max": "1"
}
```

### 2.2 Extension JSON 结构

```json
{
  "extension": [
    {
      "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
      "extension": [
        { "url": "ombCategory", "valueCoding": { "system": "...", "code": "..." } },
        { "url": "text", "valueString": "White" }
      ]
    }
  ]
}
```

### 2.3 Discriminator: `value@url`

Extension slicing 使用 `discriminator: [{ type: "value", path: "url" }]`。
每个 extension 实例通过 `url` 字段匹配到对应的 slice。

---

## 3. 实现变更 / Implementation Changes

### 3.1 slice-engine.ts

**移除的代码**：
```ts
// 旧代码 — v1.3
if (el.path.endsWith('.extension') || el.path.endsWith('.modifierExtension')) continue;
```

**新增字段** (`SliceDefinition`):
```ts
extensionUrl?: string;      // Extension profile URL
extensionProfile?: string;  // Extension profile canonical
```

**逻辑增强**：
- `extractSlicing()`: 不再跳过 extension slicing，并从 `type[0].profile[0]` 提取 `extensionUrl` 和 `extensionProfile`
- 自动将 `url` 添加到 `fixedValues` 中用于 discriminator 匹配
- `generateSliceSkeleton()`: extension slice 生成 `{ url: "..." }` 而非通用 discriminator 值
- `isExtensionSlicing()`: 新增辅助函数判断 slicing 是否为 extension 类型

### 3.2 ComposerTree.tsx

- Extension sliced 元素显示 `🔗 ext` badge（紫色）而非 `🧩 sliced`（蓝色）
- `SliceChildren` 中 extension slice 显示 `🔗` 图标和截断的 URL
- 每个 slice 行显示 `extensionUrl` 的最后一段（如 `us-core-race`）

### 3.3 DynamicForm.tsx

- Extension sliced 元素在表单 header 中显示 `🔗 ext` badge
- Slice info 区域显示 extension URL 信息

---

## 4. UI 渲染 / UI Rendering

### 4.1 Tree 显示

```
extension  🔗 ext   0..*
  ├ 🔗 :race          us-core-race       0..1  [+]
  ├ 🔗 :ethnicity     us-core-ethnicity  0..1  [+]
  ├ 🔗 :birthsex      us-core-birthsex   0..1  [+]
  ├ 🔗 :sex           us-core-sex        0..1  [+]
  └ 🔗 :genderIdentity us-core-genderIdentity 0..*  [+]
```

### 4.2 添加 Extension 实例

点击 `+` 按钮调用 `handleAddSliceItem`，生成：
```json
{ "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race" }
```

---

## 5. CSS 样式 / Styles

| Class | 用途 |
|-------|------|
| `.composer-tree-node__ext-badge` | 紫色 `🔗 ext` 树标签 |
| `.composer-tree-node__ext-url` | extension URL 显示 |
| `.composer-form__ext-badge` | 紫色 `🔗 ext` 表单标签 |

配色：紫色系 (`#ede9fe` bg, `#6d28d9` text)，与 slicing 蓝色系区分。

---

## 6. US Core Patient Extension 示例

| Slice Name | URL | Cardinality |
|-----------|-----|-------------|
| race | us-core-race | 0..1 |
| ethnicity | us-core-ethnicity | 0..1 |
| tribalAffiliation | us-core-tribal-affiliation | 0..* |
| birthsex | us-core-birthsex | 0..1 |
| sex | us-core-sex | 0..1 |
| genderIdentity | us-core-genderIdentity | 0..* |

---

## 7. 未来扩展 / Future Extensions

- **Extension SD 加载**: 加载外部 Extension StructureDefinition 以获取子元素定义
- **Extension value[x] 编辑**: 根据 Extension SD 动态渲染 value[x] 表单
- **Extension 搜索**: 搜索和添加自定义 Extension
- **Complex Extension**: 支持嵌套 extension（如 race 的 ombCategory + text）
