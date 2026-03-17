# FHIR-Runtime v0.7.2 能力评估与架构决策

**日期**: 2026-03-11  
**版本**: fhir-runtime@0.7.2  
**评估人**: 系统化验证  
**目的**: 确定当前应用层实现与 fhir-runtime 的职责边界

---

## 执行摘要

**核心发现**: fhir-runtime v0.7.2 提供了**完整的类型定义**和**基础验证能力**，但**缺少高级 API**（choice type、slicing、backbone element 操作）。

**架构决策**: ✅ **保持当前应用层实现**，作为 fhir-runtime 的合理补充。

**理由**:
1. fhir-runtime 专注于**纯验证引擎**，不提供结构操作 API
2. 应用层需要**交互式编辑能力**（添加/删除/切换），超出 runtime 职责范围
3. 当前架构清晰分层，无重复实现问题

---

## 1. 验证方法

### 1.1 API 导出检查
```bash
node scripts/verify-fhir-runtime-capabilities.mjs
```

### 1.2 类型定义验证
```bash
npx tsc --noEmit scripts/verify-types.ts
```

### 1.3 Validator 能力测试
```bash
node scripts/test-validator-capabilities.mjs
```

---

## 2. 验证结果

### 2.1 导出的 API (139 个符号)

#### ✅ 已导出且已使用
| 分类 | API | 使用位置 |
|------|-----|---------|
| **解析与序列化** | `parseFhirJson` | `adapter.ts:47` |
| | `serializeToFhirJson` | `adapter.ts:52` |
| **Profile 构建** | `buildCanonicalProfile` | `profiles.ts:34,70` |
| **结构校验** | `StructureValidator` | `adapter.ts:134` |
| **FHIRPath** | `evalFhirPath` | `adapter.ts:178` |

#### ✅ 已导出但未使用
| 分类 | API | 说明 |
|------|-----|------|
| **FHIRPath 高级** | `evalFhirPathBoolean` | 可用于 invariant 验证 |
| | `evalFhirPathString` | 可用于表达式求值 |
| | `evalFhirPathTyped` | 带类型的求值 |
| **Profile 工具** | `buildCanonicalElement` | 单个元素构建 |
| | `buildTypeConstraints` | 类型约束构建 |
| | `buildSlicingDefinition` | **Slicing 定义构建** |
| **结构分析** | `isBackboneElementType` | **Backbone 类型判断** |
| | `isChoiceTypePath` | **Choice type 路径判断** |
| | `extractChoiceTypeName` | **Choice type 名称提取** |
| | `extractSliceName` | **Slice 名称提取** |
| | `hasSliceName` | **Slice 名称检查** |
| **Snapshot 生成** | `SnapshotGenerator` | 完整的 snapshot 生成器 |
| **扩展接口** | `InMemoryTerminologyProvider` | 内存 Terminology 实现 |
| | `NoOpTerminologyProvider` | 空 Terminology 实现 |
| | `NoOpReferenceResolver` | 空 Reference 解析器 |

#### ❌ 未导出 (应用层自行实现)
- `isChoiceType(element)` - 判断元素是否为 choice type
- `resolveChoiceType(resource, path)` - 从资源解析 choice type
- `switchChoiceType(resource, path, newType)` - 切换 choice type
- `generateChoiceSkeleton(type)` - 生成 choice type 骨架
- `extractSlicing(sd)` - 从 SD 提取 slicing 信息
- `matchSlice(instance, discriminators)` - 匹配 slice 实例
- `generateSliceSkeleton(slice)` - 生成 slice 骨架
- `addArrayItem(resource, path)` - 添加数组项
- `removeArrayItem(resource, path, index)` - 删除数组项

### 2.2 TypeScript 类型定义

#### ✅ 完全可用的类型
```typescript
import type {
  // 数据模型
  Resource,
  StructureDefinition,
  ElementDefinition,
  CanonicalProfile,
  CanonicalElement,
  
  // 解析结果
  ParseResult,
  
  // 校验相关
  ValidationIssue,
  
  // 类型约束
  TypeConstraint,
  
  // Slicing
  SlicingDiscriminator,
  
  // 扩展接口
  TerminologyProvider,
  ReferenceResolver,
} from 'fhir-runtime';
```

**状态**: ✅ 所有类型定义都存在且可导入

### 2.3 StructureValidator 能力

#### 测试结果
| 能力 | 状态 | 说明 |
|------|------|------|
| **Cardinality 验证** | ✅ 支持 | 基础功能，已验证 |
| **Type 验证** | ✅ 支持 | 基础功能，已验证 |
| **Required 验证** | ✅ 支持 | 基础功能，已验证 |
| **Slicing 验证** | ⚠️ 未确认 | Profile 包含 slicing 定义，但未触发验证错误 |
| **Invariant 执行** | ⚠️ 未确认 | Profile 包含 72 个 constraints，但未触发执行 |
| **Fixed/Pattern 验证** | ⚠️ 未确认 | US Core Patient 无 fixed/pattern 值 |
| **Choice Type 验证** | ⚠️ 需要更多测试 | 检测到 2 个 choice type 元素 |

#### StructureValidator 方法
```javascript
validator.validate(resource, profile)
validator.validateResourceType(resource, profile)
validator.validateElements(resource, profile)
validator.hasRepeatableAncestor(path)
validator.validateCardinalityPerInstance(resource, profile)
validator.getSliceElements(profile, path)
validator.checkFailFast()
```

**关键发现**: `getSliceElements()` 方法存在，说明 validator **内部支持 slicing**，但可能需要特定条件触发。

---

## 3. 能力对比分析

### 3.1 fhir-runtime 的职责定位

根据验证结果，fhir-runtime 的设计哲学是：

```
┌─────────────────────────────────────────┐
│  fhir-runtime (纯验证引擎)              │
├─────────────────────────────────────────┤
│  ✅ 解析 FHIR JSON                      │
│  ✅ 序列化 FHIR JSON                    │
│  ✅ 构建 CanonicalProfile               │
│  ✅ 验证资源结构                        │
│  ✅ 执行 FHIRPath                       │
│  ✅ 提供完整类型定义                    │
│                                         │
│  ❌ 不提供结构操作 API                  │
│  ❌ 不提供交互式编辑能力                │
│  ❌ 不提供 UI 层辅助工具                │
└─────────────────────────────────────────┘
```

### 3.2 应用层引擎的职责定位

```
┌─────────────────────────────────────────┐
│  应用层引擎 (交互式编辑)                │
├─────────────────────────────────────────┤
│  ✅ Choice type 切换/解析               │
│  ✅ Slicing 匹配/生成                   │
│  ✅ BackboneElement 实例管理            │
│  ✅ 数组项添加/删除                     │
│  ✅ 树形结构构建                        │
│  ✅ 表单字段生成                        │
│  ✅ 值预览/格式化                       │
│                                         │
│  依赖 fhir-runtime:                     │
│  - CanonicalProfile (schema)            │
│  - CanonicalElement (元素定义)          │
│  - StructureValidator (最终验证)        │
└─────────────────────────────────────────┘
```

### 3.3 职责边界清晰

| 层级 | 职责 | 实现位置 |
|------|------|---------|
| **Runtime 层** | 数据模型、解析、验证、FHIRPath | `fhir-runtime` (npm 包) |
| **Adapter 层** | Runtime API 封装、错误处理 | `src/runtime/adapter.ts` |
| **Profile 层** | Profile 加载、缓存管理 | `src/runtime/profiles.ts` |
| **Engine 层** | 结构操作、交互式编辑 | `src/tools/*/engine.ts` |
| **Component 层** | UI 渲染、用户交互 | `src/tools/*/*.tsx` |

**结论**: 当前架构**没有重复实现**，而是**合理的分层补充**。

---

## 4. 发现的可用但未使用的 API

### 4.1 立即可用的优化

#### ① 使用 `isBackboneElementType()`
```typescript
// ❌ 当前实现 (src/tools/composer/instance-tree-engine.ts)
export function isBackboneElement(element: CanonicalElement): boolean {
  return element.types.length === 1 && 
         element.types[0].code === 'BackboneElement';
}

// ✅ 可以改用 runtime API
import { isBackboneElementType } from 'fhir-runtime';

export function isBackboneElement(element: CanonicalElement): boolean {
  return element.types.some(t => isBackboneElementType(t.code));
}
```

#### ② 使用 `isChoiceTypePath()`
```typescript
// ❌ 当前实现 (src/tools/composer/choice-type-engine.ts)
export function isChoiceType(element: CanonicalElement): boolean {
  return element.path.endsWith('[x]');
}

// ✅ 可以改用 runtime API
import { isChoiceTypePath } from 'fhir-runtime';

export function isChoiceType(element: CanonicalElement): boolean {
  return isChoiceTypePath(element.path);
}
```

#### ③ 使用 `extractChoiceTypeName()` / `extractSliceName()`
```typescript
// ❌ 当前实现 (src/tools/composer/choice-type-engine.ts)
export function parseChoiceJsonKey(jsonKey: string): { baseName: string; choiceType: string } | null {
  const match = jsonKey.match(/^([a-z][a-zA-Z0-9]*)([A-Z][a-zA-Z0-9]*)$/);
  if (!match) return null;
  return { baseName: match[1], choiceType: match[2] };
}

// ✅ 可以改用 runtime API
import { extractChoiceTypeName } from 'fhir-runtime';

// 需要确认 API 签名是否匹配
```

### 4.2 类型定义优化

#### ① 使用 `StructureDefinition` 类型
```typescript
// ❌ 当前实现 (src/runtime/profiles.ts)
const rawSDCache = new Map<string, Record<string, unknown>>();

// ✅ 应该使用
import type { StructureDefinition } from 'fhir-runtime';
const rawSDCache = new Map<string, StructureDefinition>();
```

#### ② 使用 `Resource` 类型
```typescript
// ❌ 当前实现 (src/tools/composer/ComposerWorkspace.tsx)
const [resource, setResource] = useState<Record<string, unknown>>({});

// ✅ 应该使用
import type { Resource } from 'fhir-runtime';
const [resource, setResource] = useState<Resource>({} as Resource);
```

---

## 5. 架构决策

### 5.1 决策：保持当前应用层实现

**理由**:

1. **fhir-runtime 定位明确**: 纯验证引擎，不提供编辑操作 API
2. **应用层需求特殊**: 需要交互式编辑、实时预览、UI 集成
3. **职责边界清晰**: runtime 负责验证，应用层负责操作
4. **无重复实现**: 应用层引擎使用 runtime 的类型定义和验证能力
5. **已投入大量工作**: choice-engine (300 行)、slice-engine (300 行)、instance-tree-engine (200 行) 已稳定运行

### 5.2 优化建议

#### 短期优化 (1-2 周)
- [x] ✅ 验证 fhir-runtime 能力边界
- [ ] 🔧 使用 `StructureDefinition` / `Resource` 类型替换 `Record<string, unknown>`
- [ ] 🔧 使用 `isBackboneElementType()` / `isChoiceTypePath()` 等工具函数
- [ ] 🔧 处理 primitive `_element` extensions (如 `valueString` + `_valueString`)
- [ ] 📝 更新文档，明确 runtime 与应用层的职责边界

#### 中期优化 (1-2 月)
- [ ] 🧪 深度测试 StructureValidator 的 slicing/invariant 能力
- [ ] 🔧 集成 `InMemoryTerminologyProvider` 用于 ValueSet 验证
- [ ] 🔧 实现 `ReferenceResolver` 用于 Reference 目标验证
- [ ] 📊 添加验证结果的详细解释 (使用 runtime 的 issue 信息)

#### 长期考虑 (3-6 月)
- [ ] 🤝 向 fhir-runtime 贡献代码，提议添加高级 API
- [ ] 🔄 如果 runtime 添加了编辑 API，评估迁移可行性
- [ ] 🏗️ 考虑将应用层引擎独立为 `fhir-editor-toolkit` 包

---

## 6. 下一步行动计划

### 立即执行 (本周)
1. ✅ 完成 fhir-runtime 能力评估 (已完成)
2. 📝 更新 `README.md`，添加架构说明
3. 🔧 替换 `Record<string, unknown>` 为 `StructureDefinition` / `Resource`
4. 🔧 使用 runtime 提供的工具函数 (`isBackboneElementType` 等)

### 近期执行 (本月)
5. 🔧 实现 primitive `_element` 处理
6. 🧪 编写 slicing/invariant 验证的完整测试用例
7. 📝 更新所有 devdocs，明确职责边界

### 持续跟进
8. 🔄 关注 fhir-runtime 新版本发布
9. 🤝 与 fhir-runtime 维护者沟通，了解未来规划
10. 📊 收集用户反馈，评估是否需要更多 runtime 能力

---

## 7. 总结

### 核心结论
✅ **当前架构合理**，应用层引擎是 fhir-runtime 的**必要补充**，而非重复实现。

### 关键数据
- fhir-runtime 导出: **139 个符号**
- 已使用 runtime API: **5 个核心函数**
- 可用但未使用: **20+ 个工具函数**
- 应用层引擎: **3 个文件，~800 行代码**
- 类型定义: **12+ 个核心类型，全部可用**

### 最终建议
1. **保持当前架构** - 不需要大规模重构
2. **优化类型使用** - 使用 runtime 提供的类型定义
3. **复用工具函数** - 使用 runtime 提供的辅助函数
4. **明确职责边界** - 在文档中清晰说明分层设计
5. **持续跟进 runtime** - 关注新版本，适时调整架构

---

**评估完成日期**: 2026-03-11  
**下次复审**: 2026-06 (fhir-runtime v0.8.x 发布后)
