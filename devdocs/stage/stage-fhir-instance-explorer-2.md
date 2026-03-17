# 一、Instance Explorer 的真正目的

**FHIR Instance Explorer 的核心作用：**

```text
理解一个 FHIR Resource Instance
```

更具体是四件事：

1️⃣ 解析 JSON → 识别 Resource
2️⃣ 按 **FHIR StructureDefinition** 展示结构
3️⃣ 展示 **元素解释（definition）**
4️⃣ 帮助开发者 **调试资源**

---

## 典型使用场景

### 场景1：理解一个FHIR JSON

用户粘贴：

```json
{
  "resourceType": "Observation",
  "status": "final",
  "valueQuantity": {
    "value": 98.6
  }
}
```

Explorer 展示：

```
Observation
 ├ status = final
 └ valueQuantity
     └ value = 98.6
```

同时右侧显示：

```
Path
Observation.valueQuantity.value

Type
decimal

Definition
Numerical value
```

**作用：理解结构**

---

### 场景2：理解复杂Resource

比如：

```
Bundle
Composition
MedicationRequest
```

Explorer可以：

```
展开树结构
定位元素
查看定义
```

---

### 场景3：理解Profile

如果 JSON 使用 profile：

```
meta.profile
```

Explorer 可以显示：

```
US Core Patient
mustSupport
slice
```

---

### 场景4：调试FHIR数据

例如：

```
value[x]
identifier slice
extension
```

Explorer可以解释：

```
为什么这个字段存在
为什么是这个类型
```

---

# 二、Resource识别只是自动步骤

Explorer第一步是：

```
读取 JSON
```

自动识别：

```
resourceType
```

例如：

```
Patient
Observation
Bundle
```

这个过程 **用户不需要关心**。

---

# 三、Explorer 的核心流程

真正流程是：

```
粘贴 JSON
      ↓
识别 resourceType
      ↓
加载 StructureDefinition
      ↓
构建 Instance Tree
      ↓
用户浏览结构
```

所以重点不是：

```
识别 resourceType
```

而是：

```
理解 instance
```

---

# 四、UI布局应该怎么设计？

# 推荐布局

```
FHIR Instance Explorer
```

```
┌───────────────┬───────────────────┬────────────────────┐
│ JSON Editor   │ Instance Tree     │ Element Inspector  │
│               │                   │                    │
│ {             │ Patient           │ Path               │
│ resourceType  │  ├ identifier     │ Patient.name       │
│ name          │  ├ name           │                    │
│ }             │  │  └ name[0]     │ Type               │
│               │  └ gender         │ HumanName          │
│               │                   │                    │
│               │                   │ Definition         │
└───────────────┴───────────────────┴────────────────────┘
```

三部分：

### 1 JSON Editor

作用：

```
粘贴
修改
调试
```

推荐组件：

```
monaco-editor
```

---

### 2 Instance Tree（核心）

这是 Explorer 的 **核心 UI**。

展示：

```
FHIR Instance
```

例如：

```
Observation
 ├ status
 ├ code
 └ valueQuantity
     └ value
```

---

### 3 Inspector

点击 Tree 后显示：

```
FHIR element metadata
```

例如：

```
Path
Observation.valueQuantity

Type
Quantity

Cardinality
0..1

Definition
Actual result
```

---

# 一、为什么 Instance Explorer 必须支持 Profile

FHIR 的真实世界使用几乎都是：

```
Resource + Profile
```

例如：

```
Patient
   +
US Core Patient Profile
```

或者：

```
Observation
   +
Vital Signs Profile
```

真实系统中：

```
90%+ FHIR数据
都是 profile 约束后的 resource
```

所以 Explorer 如果只看 Base Resource：

```
Patient
 ├ identifier
 ├ name
 └ gender
```

是不够的。

必须看到：

```
US Core Patient
 ├ identifier (mustSupport)
 ├ name
 ├ gender
 └ birthDate (mustSupport)
```

---

# 二、支持 Profile 后 Explorer 的核心能力

Explorer 会变成：

```
FHIR Instance
      ↓
Profile Resolver
      ↓
StructureDefinition
      ↓
Instance Tree
```

也就是：

```
Instance + Profile Schema
```

---

# 三、Profile 识别流程

Explorer 应该自动识别 Profile：

FHIR JSON：

```json
{
  "resourceType": "Patient",
  "meta": {
    "profile": [
      "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
    ]
  }
}
```

Explorer 自动：

```
读取 meta.profile
      ↓
加载 Profile
      ↓
使用 Profile Schema
```

如果没有 profile：

```
fallback
```

使用：

```
Base Resource
```

---

# 四、Explorer 的 Schema 解析层

支持 Profile 时，必须有：

```
Schema Resolver
```

结构：

```
schema-engine
 ├ base-resource-loader
 ├ profile-loader
 ├ differential-merger
 └ snapshot-builder
```

输入：

```
StructureDefinition
```

输出：

```
Resolved Schema
```

---

# 五、Profile Explorer UI

支持 Profile 后 UI 需要增加信息。

推荐布局：

```
FHIR Instance Explorer
```

```
┌───────────────┬───────────────────┬────────────────────┐
│ JSON Editor   │ Instance Tree     │ Element Inspector  │
│               │                   │                    │
│ Patient JSON  │ Patient           │ Path               │
│               │  ├ identifier     │ Patient.identifier │
│               │  ├ name           │                    │
│               │  └ birthDate ★    │ Must Support      │
│               │                   │ true               │
│               │                   │                    │
│               │                   │ Profile            │
│               │                   │ US Core Patient    │
└───────────────┴───────────────────┴────────────────────┘
```

新增信息：

```
mustSupport
slice
binding
```

---

# 六、Slice 可视化

Profile 最重要的是 **Slice**。

例如：

```
identifier
```

被 profile slice：

```
identifier
 ├ identifier:mrn
 ├ identifier:ssn
 └ identifier:medicaid
```

Explorer 应展示：

```
identifier (sliced)
```

Inspector 显示：

```
Slice Name
mrn

Discriminator
system
```

---

# 七、MustSupport 标记

Profile 中非常关键：

```
mustSupport
```

Explorer Tree 应该显示：

```
★
```

例如：

```
Patient
 ├ identifier ★
 ├ name
 ├ gender
 └ birthDate ★
```

---

# 八、ValueSet Binding

例如：

```
Observation.status
```

Explorer Inspector：

```
Binding

ValueSet
ObservationStatus

Strength
required
```

如果资源有值：

```
status = final
```

Explorer 可显示：

```
✔ valid code
```

---

# 九、Choice Element 可视化

例如：

```
value[x]
```

Profile 可能限制为：

```
valueQuantity
```

Explorer 显示：

```
value[x]

Allowed Types
Quantity
```

---

# 十、Extension Explorer

Profile 中大量使用：

```
extension
```

Explorer 应该展开：

```
extension
 ├ race
 ├ ethnicity
 └ birthsex
```

Inspector 显示：

```
URL
http://hl7.org/fhir/us/core/StructureDefinition/us-core-race
```

---

# 十一、Reference 可视化

例如：

```
Observation.subject
```

Explorer 显示：

```
Reference
Patient/123
```

未来可以扩展：

```
Reference Graph
```

---

# 十二、支持 Profile 后的 Engine 架构

Explorer Engine：

```
instance-explorer
```

模块：

```
explorer-engine
 ├ schema-resolver
 ├ profile-resolver
 ├ instance-tree-builder
 ├ element-inspector
 ├ slice-viewer
 ├ binding-viewer
 └ reference-viewer
```

---

# 十三、Instance Node 数据结构

建议设计：

```ts
interface InstanceNode {
  path: string;

  elementPath: string;

  value?: any;

  profileInfo?: {
    mustSupport?: boolean;

    sliceName?: string;

    binding?: string;
  };

  children?: InstanceNode[];
}
```

---

# 十四、Explorer API

建议 API：

```ts
explorer.loadResource(resource);

explorer.resolveProfile();

explorer.buildInstanceTree();

explorer.getElementInfo(path);
```

---

# 十五、Explorer 的真实价值

支持 Profile 后，这个工具会变成：

```
FHIR Debugger
FHIR Learning Tool
FHIR Profile Explorer
```

很多开发者其实 **看不懂 profile**。

而 Explorer 可以解释：

```
为什么这个字段必须存在
为什么这个字段是 slice
为什么必须用这个 code
```
