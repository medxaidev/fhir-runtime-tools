# FHIR Resource Composer — Slicing 设计与实现

**Status**: ✅ Implemented — v1.3  
**Updated**: 2025-03

---

## 1. 概述 / Overview

FHIR Slicing 是 Profile 对数组元素的细分约束机制。例如 US Core Patient 对 `extension` 切片为 `race`、`ethnicity`、`birthsex` 等；US Core Blood Pressure 对 `component` 切片为 `systolic`、`diastolic`。

核心挑战：**`buildCanonicalProfile()` 不保留 slice 元素**（id 中含 `:` 的被丢弃），必须从原始 StructureDefinition 的 `snapshot.element` 提取。

---

## 2. 数据源 / Data Source

### 2.1 问题：CanonicalProfile 不含 Slice

`fhir-runtime` 的 `buildCanonicalProfile()` 构建 `CanonicalProfile` 时，**过滤掉了 id 中含 `:` 的元素**（即 slice 元素）。例如 `Patient.extension:race` 不在 `profile.elements` Map 中。

### 2.2 解决方案：Raw StructureDefinition

使用原始 SD 的 `snapshot.element` 数组提取 slicing 数据：

- **Base element**: 有 `slicing.discriminator` 字段的元素（如 `Observation.category`）
- **Slice element**: 有 `sliceName` 字段的元素（如 `Observation.category:VSCat`）
- **Slice children**: id 以 `slicePrefix.` 开头的元素

### 2.3 Raw SD 加载

```
profiles.ts
├ getRawStructureDefinition(name)  → R4 raw SD
└ getRawUSCoreSD(name)             → US Core raw SD (新增)
```

`ComposerWorkspace` 在加载 profile 时同时加载 raw SD，调用 `extractSlicing()` 构建 slicing map。

---

## 3. Slice Engine / 切片引擎

**文件**: `src/tools/composer/slice-engine.ts`

### 3.1 核心类型

```ts
interface SlicingDiscriminator {
  type: 'value' | 'pattern' | 'type' | 'profile' | 'exists';
  path: string;
}

interface SlicingInfo {
  discriminator: SlicingDiscriminator[];
  rules: 'open' | 'closed' | 'openAtEnd';
  ordered: boolean;
}

interface SliceDefinition {
  id: string;           // "Observation.category:VSCat"
  sliceName: string;    // "VSCat"
  basePath: string;     // "Observation.category"
  min: number;
  max: string;          // "1" | "*"
  fixedValues: Record<string, unknown>;  // discriminator match values
  children: RawSliceChild[];
  mustSupport: boolean;
}

interface SlicedElementInfo {
  basePath: string;
  slicing: SlicingInfo;
  slices: SliceDefinition[];
}
```

### 3.2 导出函数

| 函数 | 用途 |
|------|------|
| `extractSlicing(rawSD)` | 从原始 SD 提取所有 slicing → `Map<basePath, SlicedElementInfo>` |
| `isSlicedElement(path, map)` | 判断元素是否被切片 |
| `getSlices(path, map)` | 获取切片定义列表 |
| `getSlicingInfo(path, map)` | 获取 discriminator/rules 信息 |
| `generateSliceSkeleton(slice)` | 生成预填充 discriminator 的骨架对象 |
| `matchSlice(item, slicedInfo)` | 匹配数组项属于哪个 slice |
| `countSliceInstances(resource, slicedInfo)` | 统计每个 slice 的实例数 |
| `getSliceBaseElement(path, profile)` | 获取 slice base 的 CanonicalElement |

### 3.3 Discriminator 匹配

支持两种主要匹配模式：

- **`value`**: 精确匹配 — `deepEqual(itemValue, sliceValue)`
- **`pattern`**: 模式匹配 — `patternMatch(actual, pattern)`（actual 可有额外字段）

```
discriminator: [{ type: "pattern", path: "code" }]
→ 查找 slice child "component:systolic.code"
→ 提取 patternCodeableConcept: { coding: [{ system: "...", code: "8480-6" }] }
→ 匹配 resource 中 component[i].code 是否 pattern match
```

### 3.4 Extension slicing 过滤

`extractSlicing()` 自动跳过 `*.extension` 和 `*.modifierExtension` 的 slicing（由 FHIR 基础设施处理，非 Profile 约束）。

---

## 4. ComposerTree 渲染 / Tree Rendering

### 4.1 Slice 检测

`TreeNode` 新增 `isSliced` 检测：

```ts
const isSliced = slicingMap ? isSlicedElement(node.element.path, slicingMap) : false;
```

当 `isSliced` 为 true 时：
- 显示 `🧩 sliced` badge
- 不显示 backbone `⧉` badge（即使也是 backbone array）
- 展开时渲染 `SliceChildren` 而非 `BackboneInstanceChildren`
- 不显示 +/× 按钮（由 slice 级别控制）

### 4.2 SliceChildren 组件

```
category 🧩 sliced   1..*
  ├ :VSCat ★          1..1   [1]   [+]
  │   └ category[0]        {3 fields}  [×]
  ├ :us-core           0..*   [0]   [+]
  └ category[2]        {1 fields}  [×]   ← unmatched (open slicing)
```

结构：
1. **遍历 slices** — 显示 `:sliceName`、cardinality、instance count、`+` 按钮
2. **匹配实例** — 用 `matchSlice()` 将 resource 数组项分配到对应 slice 下
3. **Unmatched 实例** — open slicing 下，未匹配的项显示在底部

### 4.3 Props 传递

```
ComposerTreeProps
├ slicingMap?: Map<string, SlicedElementInfo>
└ onAddSliceItem?: (element, slice) => void

TreeNode (内部)
├ slicingMap → 向下传递到子节点
└ onAddSliceItem → 向下传递
```

---

## 5. ComposerWorkspace 集成 / Workspace Integration

### 5.1 State

```ts
const [slicingMap, setSlicingMap] = useState<Map<string, SlicedElementInfo>>(new Map());
```

### 5.2 Profile 加载

```ts
// 同时加载 canonical profile + raw SD
const loadProfileFn = currentPackage === 'us-core' ? getUSCoreProfile : getProfile;
const loadRawFn = currentPackage === 'us-core' ? getRawUSCoreSD : getRawStructureDefinition;
Promise.all([loadProfileFn(type), loadRawFn(type)]).then(([p, rawSD]) => {
  setProfile(p);
  setSlicingMap(rawSD ? extractSlicing(rawSD) : new Map());
});
```

### 5.3 handleAddSliceItem

```ts
const handleAddSliceItem = useCallback((element, slice) => {
  const jsonKey = element.path.split('.').pop();
  const skeleton = generateSliceSkeleton(slice);  // pre-fill discriminator values
  const clone = JSON.parse(JSON.stringify(resource));
  if (!Array.isArray(clone[jsonKey])) clone[jsonKey] = [];
  clone[jsonKey].push(skeleton);
  updateResourceObject(clone);
}, [resource, updateResourceObject]);
```

---

## 6. DynamicForm 增强 / Form Enhancement

### 6.1 Props

```ts
interface DynamicFormProps {
  slicingMap?: Map<string, SlicedElementInfo>;
  // ...existing props
}
```

### 6.2 Slice 信息显示

当选中 sliced 元素或其实例时，表单显示：

- **`🧩 sliced` badge** — header 中
- **Slice name** — `matchSlice()` 识别当前实例属于哪个 slice（如 `:VSCat`）
- **Slicing info** — discriminator 类型和路径、rules（open/closed）

```
┌─────────────────────────────────┐
│ category[0]  ⧉ Backbone  🧩 sliced │
│                                 │
│ Path: Observation.category[0]   │
│ Cardinality: 1..*               │
│ Slice: :VSCat                   │
│ ┌ Slicing                     ┐ │
│ │ discriminator: pattern@code │ │
│ │ rules: open                 │ │
│ └─────────────────────────────┘ │
│                                 │
│ [sub-fields...]                 │
└─────────────────────────────────┘
```

---

## 7. CSS 样式 / Styles

新增 CSS 类（`src/styles.css`）：

| Class | 用途 |
|-------|------|
| `.composer-tree-node__slice-badge` | 蓝色 `🧩 sliced` 标签 |
| `.composer-tree-node__row--slice` | slice 行样式 |
| `.composer-tree-node__slice-icon` | slice 图标（🧩） |
| `.composer-tree-node__slice-count` | 实例计数 |
| `.composer-form__slice-badge` | 表单中 slice 标签 |
| `.composer-form__slice-info` | slice 详情卡片 |
| `.composer-form__slice-info-label` | 标签文字 |
| `.composer-form__slice-info-value` | 值文字 |

配色：蓝色系 (`#e0f2fe` bg, `#0369a1` text) 与 backbone 黄色系区分。

---

## 8. 文件变更 / Files Modified

| File | Change |
|------|--------|
| `src/tools/composer/slice-engine.ts` | **新建** — 切片引擎（~300行） |
| `src/tools/composer/ComposerTree.tsx` | 新增 `SliceChildren` 组件、`isSliced` 检测、slice badge |
| `src/tools/composer/ComposerWorkspace.tsx` | 新增 `slicingMap` state、`handleAddSliceItem`、raw SD 加载 |
| `src/tools/composer/DynamicForm.tsx` | 新增 `slicingMap` prop、slice info 显示 |
| `src/runtime/profiles.ts` | 新增 `rawUsCoreSDCache`、`getRawUSCoreSD()` |
| `src/styles.css` | 新增 slice UI 样式 |

---

## 9. US Core Slicing 示例 / Examples

### US Core Blood Pressure

```
component  🧩 sliced  2..*
  ├ :systolic ★    1..1   [+]
  │   └ component[0]    {code, valueQuantity}
  └ :diastolic ★   1..1   [+]
      └ component[1]    {code, valueQuantity}
```

discriminator: `pattern@code`
- systolic: `code.coding[0].code = "8480-6"`
- diastolic: `code.coding[0].code = "8462-4"`

### US Core Coverage

```
identifier  🧩 sliced  1..*
  └ :memberid    0..1   [+]
class  🧩 sliced  0..*
  ├ :group       0..1   [+]
  └ :plan        0..1   [+]
```

discriminator: `pattern@type`

---

## 10. 未来扩展 / Future Extensions

- **Slice + Choice 组合**: `component:systolic.value[x]:valueQuantity`
- **Nested slice children 编辑**: 展开 slice instance 后编辑其子元素（如 `coding.system`）
- **Discriminator 自动填充**: 添加 slice 实例时自动设置 discriminator 路径下的值
- **Closed slicing 校验**: 当 `rules: closed` 时，禁止添加不匹配任何 slice 的项
- **Slice cardinality 校验**: 实时检查 `min`/`max` 约束
