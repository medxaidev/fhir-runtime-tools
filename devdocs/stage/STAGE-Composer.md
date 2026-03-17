# Resource Composer Design v2

_(with Monaco Editor Bidirectional Sync)_

## 1. 目标定位

**Resource Composer** 是一个用于 **可视化创建和编辑 FHIR Resource** 的开发者工具。

核心目标：

- 快速创建 FHIR Resource
- 通过 **Element Tree + Dynamic Form** 进行可视化编辑
- 通过 **JSON Editor (Monaco)** 进行源码级编辑
- 所有视图 **实时同步**

最终体验：

```
FHIR Resource IDE
```

类似：

- VSCode
- Postman
- GraphQL Playground

---

# 2. UI Blueprint

## 整体布局

```
FHIR Resource Composer
──────────────────────────────────────────

Resource Type: [Observation ▼]

Example Template: [Observation Example 1 ▼]

──────────────────────────────────────────

Element Tree          Dynamic Form        JSON Editor
(StructureDefinition) (Field Editor)      (Monaco)

Observation            status              {
 ├ id                  [ final ]            "resourceType": "Observation",
 ├ status              ----------------     "status": "final",
 ├ category            valueQuantity        "valueQuantity": {
 ├ code                value [72]             "value": 72
 ├ subject             unit  [kg]           }
 ├ effective[x]
 ├ value[x]
 └ note

──────────────────────────────────────────

[ Validate ]   [ Format JSON ]   [ Reset ]
```

三大核心区域：

| 区域         | 功能           |
| ------------ | -------------- |
| Element Tree | FHIR 结构导航  |
| Dynamic Form | 属性编辑       |
| JSON Editor  | 原始 JSON 编辑 |

---

# 3. Monaco Editor 集成

使用：

```
monaco-editor
```

作为 JSON 编辑器。

主要能力：

### JSON Syntax Highlight

支持：

```
FHIR JSON
```

语法高亮。

---

### JSON Validation

可以结合：

```
FHIR StructureDefinition
```

提供基础 JSON Schema 校验。

---

### JSON Formatting

支持：

```
Format Document
```

按钮：

```
[ Format JSON ]
```

---

### Cursor Path Detection

Monaco 可以获取：

```
cursor position
```

再解析为：

```
JSON path
```

用于同步 Element Tree。

---

# 4. Single Source of Truth

系统始终维护一个核心对象：

```
FHIR Resource Object
```

例如：

```json
{
  "resourceType": "Observation",
  "status": "final",
  "valueQuantity": {
    "value": 72
  }
}
```

所有 UI 都是该对象的 **不同视图**。

```
Resource Object
     │
 ┌───┼───────────┐
 │   │           │
Tree Form      JSON
```

任何更新流程：

```
UI change
   ↓
update resource object
   ↓
re-render other views
```

---

# 5. Element Tree → JSON 同步

用户点击 Tree：

```
Observation.valueQuantity.value
```

系统执行：

1️⃣ 解析 Element Path

```
Observation.valueQuantity.value
```

2️⃣ 转换为 JSON Path

```
/valueQuantity/value
```

3️⃣ Monaco Editor 定位

执行：

```
scrollToPosition()
highlightRange()
```

效果：

```
"valueQuantity": {
  "value": 72
}
```

value 被高亮。

---

# 6. JSON → Element Tree 同步

当用户在 Monaco 中点击：

```json
"valueQuantity": {
  "value": 72
}
```

系统执行：

1️⃣ 获取 Cursor Position

```
line / column
```

2️⃣ 解析 JSON Path

```
/valueQuantity/value
```

3️⃣ 转换为 Element Path

```
Observation.valueQuantity.value
```

4️⃣ Tree 自动展开

```
Observation
 └ valueQuantity
     └ value  ← selected
```

---

# 7. Form → JSON 同步

Dynamic Form 输入变化：

例如：

```
value
[ 72 → 80 ]
```

系统更新：

```json
"valueQuantity": {
 "value": 80
}
```

然后触发：

```
update Monaco editor
update Tree highlight
```

---

# 8. JSON → Form 同步

当 JSON 修改：

```json
"valueQuantity": {
 "value": 95
}
```

系统执行：

```
detect path
```

得到：

```
Observation.valueQuantity.value
```

Form 更新：

```
value
[95]
```

---

# 9. Element 自动创建

当用户点击 Tree 中不存在的 Element：

例如：

```
Observation.note
```

系统自动创建 skeleton：

```json
"note": [
 {
  "text": ""
 }
]
```

然后：

```
Form 自动打开
```

---

# 10. Array 结构同步

FHIR 常见结构：

```
0..*
```

JSON：

```json
"note": [
 { "text": "example 1" },
 { "text": "example 2" }
]
```

Tree：

```
note
 ├ note[0]
 └ note[1]
```

点击：

```
note[1]
```

Form：

```
text
[ example 2 ]
```

---

# 11. value[x] 处理

FHIR polymorphism：

```
value[x]
```

JSON：

```json
"valueQuantity": {
 "value": 72
}
```

Tree：

```
value[x]
 └ valueQuantity
```

Form：

```
value type
[ Quantity ▼ ]
```

如果用户修改：

```
Quantity → String
```

JSON 自动转换：

```json
"valueString": "72"
```

---

# 12. JSON Path Mapping（核心机制）

系统维护：

```
JSON Path ↔ Element Path
```

示例：

| JSON Path            | Element Path                    |
| -------------------- | ------------------------------- |
| /status              | Observation.status              |
| /valueQuantity/value | Observation.valueQuantity.value |

这个映射来自：

```
StructureDefinition
```

---

# 13. UI 交互增强

### Highlight 同步

三处高亮：

```
Tree selected
JSON highlight
Form focus
```

---

### Breadcrumb

显示当前路径：

```
Observation > valueQuantity > value
```

---

### Hover Definition

鼠标 hover Tree：

显示：

```
Element definition
cardinality
type
```

---

# 14. 性能优化

避免：

```
full JSON re-render
```

建议：

```
path level patch
```

例如：

```
resource.valueQuantity.value = 80
```

只更新：

```
/valueQuantity/value
```

---

# 15. 技术实现结构

建议模块：

```
composer/
 ├ resource-store
 ├ json-sync-engine
 ├ tree-sync-engine
 ├ form-engine
 ├ monaco-editor
```

核心：

```
sync-engine
```

负责：

```
Tree ↔ JSON
Form ↔ JSON
```

---

# 16. Composer 核心能力总结

Resource Composer 提供：

| 功能                | 说明          |
| ------------------- | ------------- |
| Element Tree        | FHIR 结构导航 |
| Dynamic Form        | 可视化编辑    |
| Monaco JSON         | 源码编辑      |
| Bidirectional Sync  | 实时同步      |
| Skeleton Generation | 自动创建元素  |
| Array Support       | 支持 0..\*    |
| value[x] Support    | polymorphism  |
| JSON Highlight      | 路径定位      |

最终形成：

```
FHIR Resource IDE
```

---

# 17. 在 FHIR Runtime Tools 中的位置

Resource Composer：

```
FHIR Runtime Tools
```

中的核心工具之一：

```
1  Resource Validator
2  Resource Diff
3  Resource Composer
4  Structure Explorer
5  Example Library
6  Profile Inspector
```

其中：

```
Composer
```

是 **最具吸引力的工具**。

---

如果你愿意，我可以再帮你补一个 **非常关键但很多 FHIR 工具没有的能力**：

### 🔥 Resource Skeleton Generator

根据：

```
StructureDefinition
```

自动生成：

```
Minimum Valid Resource
```

用户点击：

```
New Observation
```

系统直接生成：

```json
{
  "resourceType": "Observation",
  "status": "final",
  "code": {}
}
```

这个功能对 **FHIR 开发者会非常有吸引力**。
