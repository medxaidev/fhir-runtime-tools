# FHIR UI Engine Architecture v1

Version: v1.0
Target: FHIR R4 Runtime UI Engine
Primary Use Case:

- Resource Composer
- Profile-aware Form Builder
- JSON Editor Sync (Monaco)
- FHIR Playground Tools

核心目标：

```text
让任何 FHIR Resource / Profile
自动生成 UI + JSON 双向同步
```

---

# 1 整体架构

FHIR UI Engine 是一个 **Runtime Engine**。

架构：

```text
FHIR UI Engine
│
├── Schema Engine
├── Profile Engine
├── Slice Engine
├── Choice Engine
├── Instance Engine
├── Form Engine
├── Tree Engine
├── JSON Sync Engine
└── Reference Engine
```

逻辑流程：

```text
StructureDefinition
        ↓
   Schema Engine
        ↓
   Profile Engine
        ↓
   Slice Engine
        ↓
   Instance Engine
        ↓
      Tree UI
        ↓
     Form Engine
        ↓
      JSON Sync
```

---

# 2 Schema Engine

作用：

```text
解析 FHIR 基础结构
```

输入：

```text
FHIR package
StructureDefinition
```

例如：

```text
hl7.fhir.r4.core
us.core
```

Schema Engine 输出：

```ts
SchemaDefinition;
```

示例：

```ts
interface SchemaElement {
  path: string;
  min: number;
  max: string;
  type: string[];
  isChoice: boolean;
  isArray: boolean;
}
```

示例：

```text
Observation.value[x]
```

解析为：

```text
isChoice = true
types = Quantity | string | CodeableConcept
```

---

# 3 Profile Engine

作用：

```text
应用 Profile 约束
```

例如：

```text
USCorePatientProfile
```

Profile Engine 处理：

```text
cardinality
mustSupport
fixedValue
binding
slice
```

输入：

```text
StructureDefinition (profile)
```

输出：

```ts
ProfileSchema;
```

示例：

```ts
interface ProfileElement {
  path: string;
  min: number;
  max: number;
  mustSupport: boolean;
  sliceName?: string;
}
```

---

# 4 Slice Engine

作用：

```text
解析 slicing
```

FHIR slicing 结构：

```json
"slicing":{
 "discriminator":[
  {
   "type":"value",
   "path":"system"
  }
 ]
}
```

Slice Engine 输出：

```ts
interface SliceDefinition {
  elementPath: string;
  slices: SliceItem[];
}

interface SliceItem {
  sliceName: string;
  discriminator?: object;
}
```

例：

```text
identifier
 ├ identifier:mrn
 ├ identifier:ssn
 └ identifier:medicaid
```

UI 必须展示 slice。

---

# 5 Choice Engine

处理 `[x]` 类型。

例如：

```text
value[x]
```

Choice Engine 输出：

```ts
interface ChoiceDefinition {
  path: string;
  choices: string[];
}
```

示例：

```text
value
 ├ valueQuantity
 ├ valueString
 └ valueCodeableConcept
```

规则：

```text
choice = mutually exclusive
```

---

# 6 Instance Engine

作用：

```text
管理 Resource 实例
```

例如：

```json
{
  "resourceType": "Patient",
  "name": [{ "family": "Smith" }]
}
```

Instance Engine 构建：

```text
Instance Tree
```

示例：

```text
Patient
 ├ name[0]
 │   └ family
```

数据结构：

```ts
interface InstanceNode {
  path: string;
  value?: any;
  children?: InstanceNode[];
}
```

---

# 7 Tree Engine

负责 UI 的 **Element Tree**。

来源：

```text
Schema + Profile + Instance
```

Tree 示例：

```text
Patient
 ├ identifier
 │   ├ identifier:mrn
 │   └ identifier:ssn
 ├ name
 │   └ name[0]
 │       ├ family
 │       └ given
 └ contact
     └ contact[0]
```

Tree Engine 负责：

```text
expand
collapse
slice view
instance view
```

---

# 8 Form Engine

Form Engine 负责 **动态生成表单**。

规则：

```text
FHIR Type → UI Component
```

示例：

| FHIR            | UI            |
| --------------- | ------------- |
| string          | TextInput     |
| boolean         | Checkbox      |
| CodeableConcept | Code Picker   |
| Quantity        | Quantity Form |

示例：

```text
Quantity
 ├ value
 ├ unit
 └ system
```

组件：

```ts
interface FormComponent {
  elementPath: string;
  componentType: string;
}
```

---

# 9 JSON Sync Engine

这是 Composer 的关键模块。

负责：

```text
Form ↔ JSON Editor
```

JSON Editor：

```text
monaco-editor
```

同步规则：

### Form → JSON

```text
用户修改 form
更新 instance
生成 JSON
更新 Monaco
```

### JSON → Form

```text
用户修改 JSON
解析 JSON
更新 instance tree
刷新 form
```

---

# 10 Reference Engine

处理：

```text
Reference
```

例如：

```text
Observation.subject
```

UI：

```text
Patient/123
```

支持：

```text
search
autocomplete
reference picker
```

---

# 11 Instance Tree 设计

这是 UI Engine 核心。

结构：

```text
Schema Tree
+
Resource JSON
=
Instance Tree
```

示例：

Schema：

```text
name 0..*
```

JSON：

```json
"name":[{"family":"Smith"}]
```

Instance：

```text
name[0]
 └ family
```

---

# 12 Monaco Editor Integration

JSON 编辑器：

```text
monaco-editor
```

支持：

```text
syntax highlight
json validation
auto format
```

同步流程：

```text
JSON change
 ↓
parse
 ↓
instance tree
 ↓
form update
```

---

# 13 Profile Mode

Composer 必须支持：

```text
Base Resource
Profile Resource
```

例如：

```text
Patient
USCorePatientProfile
```

Tree 来源：

```text
StructureDefinition.snapshot
```

而不是：

```text
base resource
```

---

# 14 Engine 数据流

完整数据流：

```text
FHIR Package
     ↓
Schema Engine
     ↓
Profile Engine
     ↓
Slice Engine
     ↓
Choice Engine
     ↓
Instance Engine
     ↓
Tree Engine
     ↓
Form Engine
     ↓
JSON Sync
```

---

# 15 UI Engine API

建议核心 API：

```ts
createEngine(profile);

engine.loadResource(resource);

engine.updateElement(path, value);

engine.toJSON();

engine.fromJSON(json);
```

---

# 16 Resource Composer UI

最终 UI：

```text
FHIR Resource Composer

┌───────────────┬───────────────┬──────────────┐
│ Element Tree  │ Form Editor   │ JSON Editor  │
│               │               │ (Monaco)     │
└───────────────┴───────────────┴──────────────┘
```

三者同步。

---

# 17 推荐模块结构

代码结构建议：

```text
fhir-ui-engine
 ├ schema
 ├ profile
 ├ slice
 ├ choice
 ├ instance
 ├ tree
 ├ form
 ├ json-sync
 └ reference
```

---

# 18 架构优势

这个架构支持：

```text
FHIR R4
FHIR Profile
US Core
Extensions
Dynamic Forms
JSON Editing
```

也可以支持未来：

```text
AI Builder
Smart Composer
FHIR Playground
```

---

# 19 与现有工具对比

类似架构：

| 产品         | 类似模块       |
| ------------ | -------------- |
| Medplum      | Form Engine    |
| Firely Forge | Profile Engine |
| Aidbox       | Runtime Engine |

你的设计更偏向：

```text
FHIR Runtime UI Engine
```

---

# 20 总结

FHIR UI Engine 的核心能力：

```text
Schema Parsing
Profile Constraints
Slice Processing
Choice Handling
Instance Tree
Dynamic Forms
JSON Sync
```

统一目标：

```text
FHIR Definition
 → Runtime UI
 → Editable Resource
```
