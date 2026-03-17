# FHIR Instance Explorer

Resource Inspection Engine

Version: v1.0
Target: FHIR R4
Module: fhir-runtime-tools

---

# 1 设计目标

FHIR Instance Explorer 是一个 **Resource Inspection Tool**。

目标：

```text
让开发者能够
理解
浏览
调试
FHIR Resource
```

核心能力：

```
FHIR Resource
     ↓
Instance Tree
     ↓
Element Inspector
     ↓
Profile / Slice / Choice 信息
```

Explorer 不负责编辑（那是 Composer），而是：

```
Inspect
Debug
Explain
```

---

# 2 在 fhir-runtime-tools 中的位置

当前工具链：

```
FHIR Runtime Tools

 ├ Resource Composer
 ├ Resource Explorer
 └ Validator
```

职责：

| 模块      | 作用     |
| --------- | -------- |
| Composer  | 创建资源 |
| Explorer  | 分析资源 |
| Validator | 校验资源 |

工作流：

```
Create → Inspect → Validate
```

---

# 3 核心使用场景

Explorer 主要解决以下问题：

### 1 理解 Resource

例如：

```
Observation
```

开发者希望看到：

```
Observation
 ├ status
 ├ code
 ├ subject
 ├ value[x]
 └ component
```

---

### 2 理解 Profile

例如：

```
USCorePatientProfile
```

Explorer 应显示：

```
mustSupport
slice
binding
```

---

### 3 调试 Resource

例如 JSON：

```json
{
  "resourceType": "Patient",
  "name": [{ "family": "Smith" }]
}
```

Explorer 应展示：

```
name[0]
 └ family
```

---

# 4 Explorer UI 总体结构

推荐布局：

```
FHIR Resource Explorer

┌──────────────────┬─────────────────────────┐
│ Element Tree     │ Element Inspector       │
│                  │                         │
│ Patient          │ Path: Patient.name      │
│  ├ identifier    │ Type: HumanName         │
│  ├ name          │ Cardinality: 0..*       │
│  │  └ name[0]    │ Definition: ...         │
│  └ contact       │                         │
└──────────────────┴─────────────────────────┘

                JSON Viewer
```

三部分：

```
Element Tree
Element Inspector
JSON Viewer
```

---

# 5 Element Tree

Element Tree 是 Explorer 的核心。

来源：

```
Schema
+
Instance
```

树结构：

```
Patient
 ├ identifier
 │   └ identifier[0]
 │       ├ system
 │       └ value
 ├ name
 │   └ name[0]
 │       ├ family
 │       └ given
 └ contact
     └ contact[0]
```

Tree 节点类型：

```
resource
element
array
slice
choice
```

---

# 6 Element Inspector

当用户点击一个节点时，显示详细信息。

例如点击：

```
name.family
```

Inspector 显示：

```
Element Information

Path
Patient.name.family

Type
string

Cardinality
0..1

Definition
Family name (often called 'Surname')

Must Support
false
```

来源：

```
StructureDefinition
```

---

# 7 Profile Inspector

如果 Resource 使用 Profile：

例如：

```
USCorePatientProfile
```

Explorer 应显示：

```
Profile
US Core Patient

Must Support
identifier

Slice
identifier:mrn
identifier:ssn
```

---

# 8 Slice Viewer

当 element 有 slicing：

例如：

```
identifier
```

显示：

```
identifier (sliced)

 ├ identifier:mrn
 ├ identifier:ssn
 └ identifier:medicaid
```

Inspector 显示：

```
Slice Name
mrn

Discriminator
system
```

---

# 9 Choice Viewer

对于 choice element：

```
value[x]
```

Tree 展示：

```
value[x]
 ├ valueString
 ├ valueQuantity
 └ valueCodeableConcept
```

Inspector：

```
Choice Element
Allowed Types

Quantity
string
CodeableConcept
```

---

# 10 Reference Viewer

Reference 类型：

```
Observation.subject
```

Explorer 显示：

```
Reference

Type
Patient

Value
Patient/123
```

未来可支持：

```
Reference Graph
```

---

# 11 JSON Viewer

底部显示 JSON：

推荐组件：

```
monaco-editor
```

能力：

```
syntax highlight
format
collapse
copy
```

JSON 与 Tree 同步：

```
Tree → JSON
JSON → Tree
```

---

# 12 Explorer Engine 架构

Explorer Engine：

```
explorer-engine
```

模块：

```
explorer
 ├ instance-tree-engine
 ├ element-inspector
 ├ slice-viewer
 ├ choice-viewer
 ├ reference-viewer
 └ json-viewer
```

---

# 13 Instance Tree Engine

负责构建实例树。

输入：

```
Resource JSON
Schema
```

输出：

```
Instance Tree
```

数据结构：

```ts
interface InstanceNode {
  path: string;

  elementPath: string;

  value?: any;

  children?: InstanceNode[];
}
```

示例：

```
path
name[0].family
```

---

# 14 Inspector 数据模型

Inspector 数据：

```ts
interface ElementInfo {
  path: string;

  type: string[];

  min: number;

  max: string;

  definition?: string;

  mustSupport?: boolean;

  sliceName?: string;
}
```

来源：

```
StructureDefinition
Profile
```

---

# 15 与 Composer 的关系

Explorer 可以复用 Composer 的：

```
Schema Engine
Slice Engine
Choice Engine
Instance Engine
```

区别：

| Composer         | Explorer          |
| ---------------- | ----------------- |
| 编辑资源         | 查看资源          |
| 表单             | Inspector         |
| Instance editing | Instance browsing |

---

# 16 Explorer API

建议 API：

```ts
createExplorer(schema);

explorer.loadResource(resource);

explorer.getInstanceTree();

explorer.getElementInfo(path);

explorer.toJSON();
```

---

# 17 未来扩展能力

Explorer 可以扩展为：

```
FHIR Debugger
FHIR Playground
FHIR Learning Tool
```

未来模块：

```
Bundle Explorer
Search Explorer
Reference Graph
```

---

# 18 推荐开发顺序

建议实现顺序：

### Step 1

```
Instance Tree Viewer
```

---

### Step 2

```
Element Inspector
```

---

### Step 3

```
Slice / Choice Viewer
```

---

### Step 4

```
JSON Viewer
```

---

# 19 最小可用版本 (MVP)

MVP 功能：

```
Load Resource
Instance Tree
Element Inspector
JSON Viewer
```

就已经非常强。

---

# 20 总结

**FHIR Instance Explorer** 是 **fhir-runtime-tools** 中：

```
最自然的第三个核心模块
```

完整工具链：

```
FHIR Runtime Tools

 ├ Resource Composer
 ├ Resource Explorer
 └ Validator
```

它的核心价值：

```
理解 Resource
调试 Resource
解释 Profile
```

---

# 21 Implementation (v1.0)

Status: **MVP Implemented**

## 文件结构

```
src/tools/explorer/
 ├ instance-tree-builder.ts   — 核心引擎：构建实例树
 ├ ExplorerTree.tsx            — 实例树渲染组件
 ├ ExplorerInspector.tsx       — 元素详情面板
 ├ ExplorerWorkspace.tsx       — 3-column 工作区
 └ index.tsx                   — 页面入口
```

## 复用模块

从 Composer / Validator 复用：

| 模块                      | 来源      | 用途                                                                      |
| ------------------------- | --------- | ------------------------------------------------------------------------- |
| `instance-tree-engine.ts` | Composer  | isBackboneElement, isArrayElement, getDeepValue                           |
| `choice-type-engine.ts`   | Composer  | isChoiceType, getChoiceBaseName, buildChoiceJsonKey, resolveChoiceType    |
| `slice-engine.ts`         | Composer  | extractSlicing, isSlicedElement, matchSlice, isExtensionSlicing           |
| `PackageSelector.tsx`     | Validator | FHIR R4 / US Core 包切换                                                  |
| `profiles.ts`             | Runtime   | getProfile, getResourceTypeNames, getRawStructureDefinition, US Core APIs |
| `adapter.ts`              | Runtime   | validateResource                                                          |
| `example-library.ts`      | Data      | getExamplesForType                                                        |
| `@monaco-editor/react`    | Shared    | JSON Viewer (read/write)                                                  |
| `composer-issues` CSS     | Composer  | 验证错误面板样式                                                          |

## 核心引擎: instance-tree-builder

```ts
interface InstanceNode {
  label: string; // "name", "name[0]", "valueQuantity"
  instancePath: string; // "Patient.name[0].family"
  elementPath: string; // "Patient.name"
  element?: CanonicalElement;
  value?: unknown;
  kind: InstanceNodeKind; // resource | element | array-item | slice-item | choice-resolved
  depth: number;
  children: InstanceNode[];
  arrayIndex?: number;
  choiceType?: string;
  sliceName?: string;
  isBackbone: boolean;
  isRequired: boolean;
  isExtensionSlice?: boolean;
  referenceTargets?: string[];
}
```

构建流程：

```
Resource JSON + CanonicalProfile + SlicingMap
     ↓
buildInstanceTree()
     ↓
Walk top-level schema elements
  → Match JSON keys
  → Detect choice types (value[x] → valueQuantity)
  → Expand backbone arrays (contact → contact[0], contact[1])
  → Match slices (identifier[0] → :mrn)
  → Detect extension slices
  → Extract reference target types
  → Recurse into backbone children
     ↓
InstanceNode[]
```

## 已实现功能 (MVP)

- ✅ Load Resource (JSON editor + paste from clipboard)
- ✅ Instance Tree (schema-aware, recursive)
- ✅ Element Inspector (path, type, cardinality, binding, constraints, value)
- ✅ JSON Viewer (Monaco editor, bidirectional)
- ✅ Choice type display (`[x] Quantity` badge)
- ✅ Slice matching (`🧩` badge, `:sliceName` label)
- ✅ Extension slice display (`🔗 ext` badge)
- ✅ Reference target display (`→ Patient | Organization`)
- ✅ Backbone array expansion (`⧉ N` badge, indexed children)
- ✅ Must Support indicator
- ✅ Validate button + issues panel
- ✅ Package switching (FHIR R4 / US Core)
- ✅ Auto-detect resourceType from JSON
- ✅ Tree ↔ JSON scroll sync

## 架构决策

1. **Read-only tree, editable JSON**: 与 Composer 不同，Explorer 的树是只读的，编辑通过 JSON editor 完成
2. **Instance-first tree**: 树只显示 resource 中实际存在的元素和值，而非全部 schema 元素
3. **Reuse engines, not components**: 复用 Composer 的 engine 层（slice/choice/instance），但 UI 组件是独立的，因为展示逻辑不同
4. **Shared CSS patterns**: 复用 `composer-issues` 和 `composer-control` 等已有 CSS 类
