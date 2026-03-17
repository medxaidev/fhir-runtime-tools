# FHIR Resource Composer — BackboneElement / InnerType 设计与实现

**Status**: ✅ Implemented — v1.2  
**Updated**: 2025-03

---

## 1. 概述 / Overview

FHIR BackboneElement（InnerType）是嵌套复合结构，不是独立 Resource，例如 `Patient.contact`、`Observation.component`。  
核心挑战：**Schema Tree 是静态结构，JSON 是动态实例数组**，Composer 必须在 UI 中桥接两者。

典型结构：

```
Patient
 └ contact 0..*  (BackboneElement)
     ├ relationship
     ├ name (HumanName)
     ├ telecom
     └ address
```

JSON 实例：

```json
{
  "contact": [
    { "name": { "family": "Smith" } },
    { "name": { "family": "Jones" } }
  ]
}
```

---

## 2. 架构 / Architecture

### 2.1 Schema Tree vs Instance Tree

| 层级          | 来源                                              | 示例路径                                             |
| ------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Schema Tree   | StructureDefinition (`CanonicalProfile.elements`) | `Patient.contact.name`                               |
| Instance Tree | Resource JSON + Schema                            | `Patient.contact[0].name`, `Patient.contact[1].name` |

Composer 的 Element Tree 使用 **混合渲染**：

- 非 BackboneArray 元素：直接显示 Schema 节点
- BackboneArray 元素：展开后显示 **实例节点** `contact[0]`, `contact[1]`, `+ Add`

### 2.2 文件结构

```
src/tools/composer/
 ├ instance-tree-engine.ts   ← BackboneElement 核心引擎
 ├ ComposerTree.tsx           ← 树渲染（含 BackboneInstanceChildren）
 ├ DynamicForm.tsx            ← 表单渲染（含 backbone 实例子字段）
 └ ComposerWorkspace.tsx      ← 状态管理 + 实例回调
```

### 2.3 路径映射

```
Element path:   Patient.contact.name.family
Instance path:  Patient.contact[0].name.family
JSON segments:  ["contact", 0, "name", "family"]
```

`JsonPathSegment = string | number` — 数字表示数组索引。

---

## 3. 实例引擎 / Instance Tree Engine

**文件**: `src/tools/composer/instance-tree-engine.ts`

### 3.1 检测函数

```typescript
isBackboneElement(element: CanonicalElement): boolean
// types[0].code === 'BackboneElement' 或 types 为空且有子元素

isArrayElement(element: CanonicalElement): boolean
// max === 'unbounded' 或 max > 1
```

### 3.2 数组操作

```typescript
getArrayLength(resource, jsonKey): number
addArrayItem(resource, jsonKey): Record<string, unknown>     // 追加 {}
removeArrayItem(resource, jsonKey, index): Record<string, unknown>
```

### 3.3 深层路径读写

```typescript
type JsonPathSegment = string | number;

getDeepValue(obj, segments: JsonPathSegment[]): unknown
setDeepValue(obj, segments: JsonPathSegment[], value): Record<string, unknown>
```

用于实例内子字段的读写，如 `["contact", 0, "name"]`。

### 3.4 子元素查询

```typescript
getBackboneChildren(parentPath, elements: Map): CanonicalElement[]
// 返回直接子元素，如 Patient.contact → [relationship, name, telecom, ...]

buildJsonPath(elementPath, instanceIndex?): string
// "Patient.contact" + 0 → "contact[0]"
```

---

## 4. 树渲染 / ComposerTree

**文件**: `src/tools/composer/ComposerTree.tsx`

### 4.1 新增 Props

```typescript
interface ComposerTreeProps {
  // ... existing
  onSelectInstance?: (element: CanonicalElement, arrayIndex: number) => void;
  onAddArrayItem?: (element: CanonicalElement) => void;
  onRemoveArrayItem?: (element: CanonicalElement, index: number) => void;
}
```

### 4.2 TreeNode 逻辑

```
TreeNode 渲染流程:
  1. 检测 isBackboneElement && isArrayElement → isBackboneArray
  2. 如果是 BackboneArray:
     - 显示 ⧉ badge
     - 展开时渲染 BackboneInstanceChildren（而非 schema children）
  3. 否则: 渲染普通 schema children
```

### 4.3 BackboneInstanceChildren 组件

根据 `resource[jsonKey]` 数组长度动态生成实例行：

```
contact ⧉ Array
 ├ contact[0]  { 3 fields }   [×]
 ├ contact[1]  { 2 fields }   [×]
 └ + Add contact
```

每个实例行：

- **点击** → `onSelectInstance(element, index)` → 选中该实例
- **×** → `onRemoveArrayItem(element, index)` → 删除该实例
- **+ Add** → `onAddArrayItem(element)` → 追加空对象

---

## 5. 表单渲染 / DynamicForm

**文件**: `src/tools/composer/DynamicForm.tsx`

### 5.1 新增 Props

```typescript
instanceIndex?: number | null;
```

### 5.2 Backbone Instance Form

当 `isBackboneElement && isArrayElement && instanceIndex != null` 时：

1. 从 `profile.elements` 获取 `getBackboneChildren(element.path, ...)`
2. `value` 为该实例对象 `resource.contact[instanceIndex]`
3. 逐个渲染子字段，每个子字段使用类型匹配：
   - `string` → `StringField`
   - `number` → `NumberField`
   - `boolean` → `BooleanField`
   - `object` → `ObjectField`
   - `array` → `ArrayField`
   - 未设置 → `+ Add {childName}` 按钮

Form Header 显示 `contact[0]` + `⧉ Backbone` badge。

### 5.3 onChange 路径约定

子字段 onChange 路径格式：`{element.path}.{childName}`，如 `Patient.contact.name`。  
ComposerWorkspace 中的 `handleInstanceFormChange` 会将其转换为深层 JSON 路径 `["contact", 0, "name"]`。

---

## 6. 工作区集成 / ComposerWorkspace

**文件**: `src/tools/composer/ComposerWorkspace.tsx`

### 6.1 新增状态

```typescript
const [selectedInstanceIndex, setSelectedInstanceIndex] = useState<
  number | null
>(null);
```

### 6.2 新增回调

| 回调                       | 触发           | 动作                                                             |
| -------------------------- | -------------- | ---------------------------------------------------------------- |
| `handleSelectInstance`     | 点击实例节点   | 设置 selectedElement + instancePath + instanceIndex；滚动 Monaco |
| `handleAddArrayItem`       | 点击 + Add     | `addArrayItem()` → 更新 resource                                 |
| `handleRemoveArrayItem`    | 点击 ×         | `removeArrayItem()` → 更新 resource；清理选中状态                |
| `handleInstanceFormChange` | 表单子字段修改 | 计算深层 JSON 路径 → `setDeepValue()` → 更新 resource            |

### 6.3 selectedValue 增强

```typescript
// 优先级: backbone instance > choice type > normal path
if (selectedInstanceIndex !== null && isBackboneElement && isArrayElement) {
  return getDeepValue(resource, [jsonKey, selectedInstanceIndex]);
}
```

### 6.4 Props 传递

```tsx
<ComposerTree
  onSelectInstance={handleSelectInstance}
  onAddArrayItem={handleAddArrayItem}
  onRemoveArrayItem={handleRemoveArrayItem}
/>

<DynamicForm
  instanceIndex={selectedInstanceIndex}
  onChange={selectedInstanceIndex !== null ? handleInstanceFormChange : handleFormChange}
/>
```

---

## 7. 三视图同步 / Sync

| 操作                   | Tree           | Form           | JSON             |
| ---------------------- | -------------- | -------------- | ---------------- |
| 点击 contact[0]        | 高亮实例行     | 显示子字段表单 | 滚动到 "contact" |
| 修改 contact[0].name   | —              | 即时更新       | JSON 同步更新    |
| JSON 编辑 contact 数组 | 实例行数量更新 | 当前实例值更新 | —                |
| + Add contact          | 新增实例行     | —              | JSON 追加 `{}`   |
| × 删除实例             | 移除实例行     | 清空/切换      | JSON 移除数组项  |

---

## 8. CSS 样式 / Styling

**文件**: `src/styles.css`

| 类名                                     | 用途                      |
| ---------------------------------------- | ------------------------- |
| `.composer-tree-node__backbone-badge`    | ⧉ 标记（amber 底色）      |
| `.composer-tree-node__row--instance`     | 实例行 hover 效果         |
| `.composer-tree-node__row--add-instance` | + Add 行样式              |
| `.composer-form__backbone`               | 表单 backbone 容器        |
| `.composer-form__backbone-field`         | 子字段卡片                |
| `.composer-form__backbone-badge`         | 表单 header backbone 标记 |
| `.composer-form__required-dot`           | 必填子字段红点            |

---

## 9. 典型例子 / Examples

### Patient.contact

```
Tree:
  contact ⧉ Array
   ├ contact[0]  { name, telecom }  [×]
   ├ contact[1]  { name }           [×]
   └ + Add contact

Form (点击 contact[0]):
  contact[0]  ⧉ Backbone
  ┌─────────────────┐
  │ relationship     │  CodeableConcept  + Add
  │ name             │  HumanName        { family: "Smith" }
  │ telecom          │  ContactPoint     [{ system: "phone", value: "123" }]
  │ address          │  Address          + Add
  │ gender           │  code             + Add
  └─────────────────┘

JSON:
  "contact": [
    { "name": { "family": "Smith" }, "telecom": [...] },
    { "name": { "family": "Jones" } }
  ]
```

---

## 10. 未来扩展 / Future

- **嵌套 BackboneElement**: 如 `CarePlan.activity.detail` — 需递归实例渲染
- **Backbone 内 Choice Type**: 如 `Observation.component.value[x]` — 需组合引擎
- **拖拽排序**: 数组实例拖拽重排
- **折叠/展开实例子字段**: 大型 backbone 的 UX 优化
