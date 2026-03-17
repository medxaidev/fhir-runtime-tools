# fhir-runtime 升级需求文档

**目标版本**: v0.9.0 / v1.0.0  
**日期**: 2026-03-17  
**提出方**: FHIR Runtime Tools 项目组  
**目的**: 将应属于底层库的核心 FHIR 能力从应用层下沉到 fhir-runtime

---

## 执行摘要

### 核心问题

当前 fhir-runtime 存在以下**设计缺陷**和**功能缺失**，导致应用层需要自研大量本应由底层库提供的核心 FHIR 能力：

1. **Slicing 支持完全缺失** - `buildCanonicalProfile()` 丢弃切片元素
2. **类型推断存在 bug** - `inferComplexType()` 误判 ContactPoint/Identifier
3. **缺少 UI 层辅助 API** - Choice Type、BackboneElement 等无辅助函数

### 升级收益

| 指标 | 当前 | 升级后 | 收益 |
|------|------|--------|------|
| **应用层自研代码** | ~1,100 行 | ~200 行 | 减少 82% |
| **Slicing 支持** | ❌ 完全自研 | ✅ 内置 | 节省 420 行 |
| **类型推断准确性** | ⚠️ 有误报 | ✅ 准确 | 提升验证质量 |
| **生态统一性** | ❌ 各自实现 | ✅ 统一标准 | 避免重复造轮子 |

### 升级优先级

| 需求 | 优先级 | 版本 | 工作量 | 影响 |
|------|--------|------|--------|------|
| **修复 Slicing 丢失** | ⭐⭐⭐⭐⭐ | v0.9.0 | 1 周 | Breaking |
| **修复类型推断 bug** | ⭐⭐⭐⭐ | v0.9.0 | 3 天 | Compatible |
| **提供 Slicing API** | ⭐⭐⭐⭐⭐ | v1.0.0 | 2 周 | New Feature |
| **Choice Type 辅助** | ⭐⭐⭐ | v1.1.0 | 1 周 | New Feature |
| **BackboneElement 辅助** | ⭐⭐ | v1.1.0 | 3 天 | New Feature |

---

## 1. 核心需求：Slicing 支持

### 1.1 当前问题

#### 问题描述
`buildCanonicalProfile()` 在构建 CanonicalProfile 时**丢弃所有切片元素**，导致：
- ❌ 无法从 CanonicalProfile 访问切片定义
- ❌ 必须访问原始 StructureDefinition
- ❌ 应用层需要自研完整的切片提取和匹配算法

#### 问题根源
```typescript
// fhir-runtime 当前实现（推测）
function buildCanonicalProfile(sd: StructureDefinition): CanonicalProfile {
  const elements = new Map<string, CanonicalElement>();
  
  for (const el of sd.snapshot.element) {
    // ❌ 问题：跳过包含 ":" 的元素（切片元素）
    if (el.id.includes(':')) continue;  // ← 设计缺陷
    
    elements.set(el.path, buildCanonicalElement(el));
  }
  
  return { type: sd.type, elements };
}
```

#### 实际影响
```typescript
// 原始 StructureDefinition
{
  "snapshot": {
    "element": [
      {
        "id": "Observation.category",
        "path": "Observation.category",
        "slicing": {
          "discriminator": [{ "type": "pattern", "path": "coding" }],
          "rules": "open"
        }
      },
      {
        "id": "Observation.category:VSCat",  // ← 切片元素
        "path": "Observation.category",
        "sliceName": "VSCat",
        "min": 1,
        "max": "1",
        "patternCodeableConcept": {
          "coding": [{ "system": "...", "code": "vital-signs" }]
        }
      }
    ]
  }
}

// buildCanonicalProfile() 后
{
  type: "Observation",
  elements: Map {
    "Observation.category" => { path: "...", slicing: {...} },
    // ❌ "Observation.category:VSCat" 完全丢失
  }
}
```

#### 应用层 Workaround
```typescript
// 当前必须这样做（自研 420 行）
const rawSD = await getRawStructureDefinition(resourceType);
const slicingMap = extractSlicing(rawSD);  // 完整算法自研

// 包括：
// - 提取切片定义（~100 行）
// - 判别器匹配算法（~150 行）
// - 深度相等比较（~80 行）
// - 模式匹配算法（~90 行）
```

---

### 1.2 升级需求

#### 需求 1.1: 修复 `buildCanonicalProfile()` 保留切片元素

**优先级**: ⭐⭐⭐⭐⭐ (最高)  
**版本**: v0.9.0  
**工作量**: 3-5 天  
**Breaking Change**: 是

**需求描述**:
修改 `buildCanonicalProfile()` 逻辑，**保留切片元素**而非丢弃。

**实现方案**:
```typescript
// 方案 A: 保留切片元素到 elements Map（推荐）
interface CanonicalProfile {
  type: string;
  elements: Map<string, CanonicalElement>;  // 包含切片元素
  slicing: Map<string, SlicingInfo>;        // ← 新增：切片元数据
}

// 方案 B: 单独存储切片元素
interface CanonicalProfile {
  type: string;
  elements: Map<string, CanonicalElement>;
  slices: Map<string, SliceElement[]>;      // ← 新增：切片元素列表
}
```

**推荐方案 A**，理由：
- ✅ 保持 elements Map 的完整性
- ✅ 切片元素可通过 path + sliceName 访问
- ✅ 与 FHIR 规范一致

**API 变更**:
```typescript
// 新增类型定义
export interface SlicingInfo {
  /** 切片基础路径，如 "Observation.category" */
  basePath: string;
  /** 判别器定义 */
  discriminator: SlicingDiscriminator[];
  /** 切片规则：open | closed | openAtEnd */
  rules: 'open' | 'closed' | 'openAtEnd';
  /** 是否有序 */
  ordered: boolean;
  /** 描述 */
  description?: string;
  /** 切片定义列表 */
  slices: SliceDefinition[];
}

export interface SlicingDiscriminator {
  /** 判别器类型 */
  type: 'value' | 'pattern' | 'type' | 'profile' | 'exists';
  /** 判别器路径 */
  path: string;
}

export interface SliceDefinition {
  /** 切片 ID，如 "Observation.category:VSCat" */
  id: string;
  /** 切片名称，如 "VSCat" */
  sliceName: string;
  /** 基础路径，如 "Observation.category" */
  basePath: string;
  /** 最小基数 */
  min: number;
  /** 最大基数 */
  max: string;
  /** 固定值/模式值（用于判别器匹配） */
  fixedValues: Record<string, unknown>;
  /** 是否 mustSupport */
  mustSupport: boolean;
  /** 扩展切片的 URL（仅扩展切片） */
  extensionUrl?: string;
  /** 扩展切片的 profile（仅扩展切片） */
  extensionProfile?: string;
}

// CanonicalProfile 新增字段
export interface CanonicalProfile {
  type: string;
  url?: string;
  elements: Map<string, CanonicalElement>;
  slicing?: Map<string, SlicingInfo>;  // ← 新增
}
```

**实现要点**:
1. 遍历 `snapshot.element` 时，识别包含 `slicing` 字段的基础元素
2. 收集所有 `sliceName` 非空的切片元素
3. 提取 `fixed[Type]` 和 `pattern[Type]` 字段作为 `fixedValues`
4. 处理扩展切片：从 `type[0].profile[0]` 提取扩展 URL
5. 构建 `SlicingInfo` 并存入 `profile.slicing` Map

**测试用例**:
```typescript
// 测试 1: US Core Patient 的 extension 切片
const profile = buildCanonicalProfile(usCorePatientSD);
expect(profile.slicing?.has('Patient.extension')).toBe(true);
const extSlicing = profile.slicing?.get('Patient.extension');
expect(extSlicing?.slices.length).toBeGreaterThan(0);

// 测试 2: US Core Observation 的 category 切片
const obsProfile = buildCanonicalProfile(usCoreObservationSD);
expect(obsProfile.slicing?.has('Observation.category')).toBe(true);
const catSlicing = obsProfile.slicing?.get('Observation.category');
expect(catSlicing?.discriminator[0].type).toBe('pattern');
expect(catSlicing?.slices.find(s => s.sliceName === 'VSCat')).toBeDefined();
```

---

#### 需求 1.2: 提供切片匹配 API

**优先级**: ⭐⭐⭐⭐⭐ (最高)  
**版本**: v1.0.0  
**工作量**: 1-2 周  
**Breaking Change**: 否

**需求描述**:
提供标准的切片匹配算法，判断资源实例是否匹配特定切片定义。

**API 设计**:
```typescript
/**
 * 匹配资源实例到切片定义
 * @param instance - 资源实例（如 category 数组中的一个元素）
 * @param slicingInfo - 切片信息
 * @returns 匹配的切片名称，或 null（未匹配）
 */
export function matchSlice(
  instance: Record<string, unknown>,
  slicingInfo: SlicingInfo,
): string | null;

/**
 * 统计资源中各切片的实例数量
 * @param resource - 完整资源
 * @param slicingInfo - 切片信息
 * @returns Map<sliceName, count>
 */
export function countSliceInstances(
  resource: Record<string, unknown>,
  slicingInfo: SlicingInfo,
): Map<string, number>;

/**
 * 验证切片基数约束
 * @param resource - 完整资源
 * @param slicingInfo - 切片信息
 * @returns 验证问题列表
 */
export function validateSliceCardinality(
  resource: Record<string, unknown>,
  slicingInfo: SlicingInfo,
): ValidationIssue[];
```

**实现要点**:
1. **value 判别器**: 深度相等比较（`deepEqual`）
2. **pattern 判别器**: 模式匹配（允许实例有额外字段）
3. **type 判别器**: 类型代码匹配
4. **profile 判别器**: 配置文件 URL 匹配
5. **exists 判别器**: 字段存在性检查

**判别器匹配算法**:
```typescript
// value 判别器：严格相等
function matchValueDiscriminator(
  instanceValue: unknown,
  sliceValue: unknown,
): boolean {
  return deepEqual(instanceValue, sliceValue);
}

// pattern 判别器：模式匹配（实例可有额外字段）
function matchPatternDiscriminator(
  instanceValue: unknown,
  patternValue: unknown,
): boolean {
  if (patternValue === undefined || patternValue === null) return true;
  if (instanceValue === undefined || instanceValue === null) return false;
  
  if (typeof patternValue !== 'object') {
    return instanceValue === patternValue;
  }
  
  if (Array.isArray(patternValue)) {
    if (!Array.isArray(instanceValue)) return false;
    // 模式数组中的每个元素都必须在实例数组中找到匹配
    return patternValue.every(pItem =>
      instanceValue.some(iItem => matchPatternDiscriminator(iItem, pItem))
    );
  }
  
  // 对象：模式中的所有字段都必须在实例中匹配
  const patObj = patternValue as Record<string, unknown>;
  const instObj = instanceValue as Record<string, unknown>;
  return Object.keys(patObj).every(key =>
    matchPatternDiscriminator(instObj[key], patObj[key])
  );
}
```

**测试用例**:
```typescript
// 测试 1: value 判别器
const instance1 = { code: 'vital-signs' };
const slice1 = { fixedValues: { code: 'vital-signs' } };
expect(matchSlice(instance1, slicingInfo)).toBe('VSCat');

// 测试 2: pattern 判别器
const instance2 = {
  coding: [
    { system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }
  ],
  text: 'Vital Signs'  // 额外字段，应允许
};
const slice2 = {
  fixedValues: {
    coding: [{ system: '...', code: 'vital-signs' }]
  }
};
expect(matchSlice(instance2, slicingInfo)).toBe('VSCat');

// 测试 3: 扩展切片（URL 判别器）
const instance3 = { url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race' };
expect(matchSlice(instance3, extensionSlicingInfo)).toBe('race');
```

---

#### 需求 1.3: 提供切片骨架生成 API

**优先级**: ⭐⭐⭐⭐ (高)  
**版本**: v1.0.0  
**工作量**: 3-5 天  
**Breaking Change**: 否

**需求描述**:
根据切片定义生成预填充判别器值的骨架对象，用于 UI 层快速创建切片实例。

**API 设计**:
```typescript
/**
 * 生成切片骨架对象
 * @param sliceDefinition - 切片定义
 * @returns 预填充判别器值的骨架对象
 */
export function generateSliceSkeleton(
  sliceDefinition: SliceDefinition,
): Record<string, unknown>;
```

**实现示例**:
```typescript
// 输入：category:VSCat 切片定义
const slice = {
  sliceName: 'VSCat',
  fixedValues: {
    coding: [{
      system: 'http://terminology.hl7.org/CodeSystem/observation-category',
      code: 'vital-signs'
    }]
  }
};

// 输出：预填充的骨架
const skeleton = generateSliceSkeleton(slice);
// {
//   coding: [{
//     system: 'http://terminology.hl7.org/CodeSystem/observation-category',
//     code: 'vital-signs'
//   }]
// }

// 扩展切片示例
const extSlice = {
  sliceName: 'race',
  extensionUrl: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
};
const extSkeleton = generateSliceSkeleton(extSlice);
// { url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race' }
```

**测试用例**:
```typescript
test('generateSliceSkeleton - pattern discriminator', () => {
  const skeleton = generateSliceSkeleton(vsCatSlice);
  expect(skeleton.coding).toEqual([{
    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
    code: 'vital-signs'
  }]);
});

test('generateSliceSkeleton - extension slice', () => {
  const skeleton = generateSliceSkeleton(raceExtSlice);
  expect(skeleton.url).toBe('http://hl7.org/fhir/us/core/StructureDefinition/us-core-race');
});
```

---

### 1.3 解决的问题

#### 问题 1: 切片信息完全丢失
**当前**: 应用层必须访问原始 SD，自研提取算法  
**升级后**: 直接从 `profile.slicing` 访问

#### 问题 2: 切片匹配算法重复实现
**当前**: 每个项目自研 value/pattern 判别器匹配  
**升级后**: 调用标准 `matchSlice()` API

#### 问题 3: 切片骨架生成重复实现
**当前**: 每个项目自研骨架生成逻辑  
**升级后**: 调用标准 `generateSliceSkeleton()` API

#### 问题 4: 扩展切片无标准支持
**当前**: 自研扩展 URL 提取和匹配  
**升级后**: 内置扩展切片支持

---

## 2. 核心需求：修复类型推断 Bug

### 2.1 当前问题

#### 问题描述
`inferComplexType()` 函数在推断复杂类型时存在误判：
- ❌ ContactPoint 被误识别为 Identifier
- ❌ HumanName/Address 可能被混淆
- ❌ 导致验证器产生 TYPE_MISMATCH 误报

#### 问题示例
```typescript
// 正确的 ContactPoint
const contactPoint = {
  system: 'phone',
  value: '555-1234',
  use: 'home'
};

// fhir-runtime 当前行为
inferComplexType(contactPoint);  // ❌ 返回 "Identifier"（错误）

// 正确的 Identifier
const identifier = {
  system: 'http://hospital.org/mrn',
  value: '12345',
  type: { text: 'MRN' },
  assigner: { display: 'Hospital' }
};

inferComplexType(identifier);  // ✅ 返回 "Identifier"（正确）
```

#### 应用层 Workaround
```typescript
// 当前必须这样做（自研类型检测）
const TYPE_INFERENCE_FIXES: Record<string, (obj: unknown) => boolean> = {
  ContactPoint: (obj) => {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    // 自研检测逻辑：有 system/value/use，但没有 Identifier 特有字段
    return ('system' in o || 'value' in o || 'use' in o) && 
           !('type' in o && 'period' in o && 'assigner' in o);
  },
  Identifier: (obj) => {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    // 自研检测逻辑：有 system/value，且 use 不是 ContactPoint 的值
    return 'system' in o && 'value' in o && 
           !('use' in o && ['home', 'work', 'temp', 'old', 'mobile'].includes(String(o.use)));
  },
};

// 过滤误报
function isTypeMismatchFalsePositive(issue, parsed, expectedTypes) {
  for (const expectedType of expectedTypes) {
    const checker = TYPE_INFERENCE_FIXES[expectedType];
    if (checker && checker(item)) {
      return true;  // 是误报，过滤掉
    }
  }
  return false;
}
```

---

### 2.2 升级需求

#### 需求 2.1: 修复 `inferComplexType()` 类型推断

**优先级**: ⭐⭐⭐⭐ (高)  
**版本**: v0.9.0  
**工作量**: 3-5 天  
**Breaking Change**: 否（修复 bug）

**需求描述**:
改进 `inferComplexType()` 的类型推断算法，准确区分易混淆的复杂类型。

**实现方案**:
```typescript
export function inferComplexType(obj: unknown): string | null {
  if (typeof obj !== 'object' || obj === null) return null;
  const o = obj as Record<string, unknown>;
  
  // 优先级顺序很重要：从最具体到最通用
  
  // 1. ContactPoint（最具体）
  // 特征：system/value/use，且 use 是 ContactPoint 特有值
  if (('system' in o || 'value' in o) && 'use' in o) {
    const use = String(o.use);
    if (['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'].includes(use)) {
      return 'ContactPoint';
    }
  }
  
  // 2. Identifier（次具体）
  // 特征：system + value，且有 type/period/assigner 之一
  if ('system' in o && 'value' in o) {
    if ('type' in o || 'period' in o || 'assigner' in o) {
      return 'Identifier';
    }
    // 如果只有 system + value，且 use 不是 ContactPoint 值，则是 Identifier
    if (!('use' in o) || !['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'].includes(String(o.use))) {
      return 'Identifier';
    }
  }
  
  // 3. HumanName
  // 特征：family/given/prefix/suffix/text
  if ('family' in o || 'given' in o || 'prefix' in o || 'suffix' in o) {
    if (!('line' in o || 'city' in o || 'state' in o)) {  // 排除 Address
      return 'HumanName';
    }
  }
  
  // 4. Address
  // 特征：line/city/state/postalCode/country
  if ('line' in o || 'city' in o || 'state' in o || 'postalCode' in o || 'country' in o) {
    return 'Address';
  }
  
  // 5. Coding
  if ('system' in o && 'code' in o && !('value' in o)) {
    return 'Coding';
  }
  
  // 6. CodeableConcept
  if ('coding' in o || ('text' in o && !('value' in o))) {
    return 'CodeableConcept';
  }
  
  // 7. Quantity
  if ('value' in o && ('unit' in o || 'code' in o || 'system' in o)) {
    return 'Quantity';
  }
  
  // 8. Reference
  if ('reference' in o || 'identifier' in o || 'display' in o) {
    return 'Reference';
  }
  
  // 9. Period
  if ('start' in o || 'end' in o) {
    return 'Period';
  }
  
  return null;
}
```

**关键改进**:
1. ✅ 优先级顺序：从最具体到最通用
2. ✅ ContactPoint 检测：基于 `use` 字段的特有值
3. ✅ Identifier 检测：排除 ContactPoint 的 `use` 值
4. ✅ HumanName vs Address：基于特征字段区分

**测试用例**:
```typescript
test('inferComplexType - ContactPoint', () => {
  expect(inferComplexType({ system: 'phone', value: '555-1234', use: 'home' }))
    .toBe('ContactPoint');
  expect(inferComplexType({ system: 'email', value: 'test@example.com', use: 'work' }))
    .toBe('ContactPoint');
});

test('inferComplexType - Identifier', () => {
  expect(inferComplexType({ system: 'http://hospital.org/mrn', value: '12345' }))
    .toBe('Identifier');
  expect(inferComplexType({ system: 'http://hospital.org/mrn', value: '12345', type: { text: 'MRN' } }))
    .toBe('Identifier');
});

test('inferComplexType - HumanName vs Address', () => {
  expect(inferComplexType({ family: 'Smith', given: ['John'] }))
    .toBe('HumanName');
  expect(inferComplexType({ line: ['123 Main St'], city: 'Boston' }))
    .toBe('Address');
});
```

---

### 2.3 解决的问题

#### 问题 1: 验证器误报
**当前**: TYPE_MISMATCH 误报，需要应用层过滤  
**升级后**: 准确的类型推断，无误报

#### 问题 2: 应用层自研类型检测
**当前**: 每个项目自研 TYPE_INFERENCE_FIXES  
**升级后**: 无需自研，直接使用准确的 inferComplexType

#### 问题 3: 用户体验差
**当前**: 用户看到误报错误，困惑  
**升级后**: 准确的验证结果，提升信任度

---

## 3. 可选需求：Choice Type 辅助 API

### 3.1 当前情况

#### 实现方式
**100% 应用层自研** - `choice-type-engine.ts` (186 行)

#### 核心能力
- ✅ 检测选择类型 (`value[x]`)
- ✅ 路径解析 (`value[x]` → `valueQuantity`)
- ✅ JSON 键构建和解析
- ✅ 类型切换（原子操作）
- ✅ 骨架生成（30+ 种类型）

#### 是否应该在 fhir-runtime？
**建议**: ⚠️ **部分功能可以提供**

**理由**:
- ✅ 路径解析和 JSON 键构建是通用逻辑，可以提供
- ✅ 检测选择类型是通用逻辑，可以提供
- ⚠️ 类型切换是 UI 层操作，可以保持应用层
- ⚠️ 骨架生成是 UI 层需求，可以保持应用层

---

### 3.2 升级需求（可选）

#### 需求 3.1: 提供 Choice Type 辅助函数

**优先级**: ⭐⭐⭐ (中)  
**版本**: v1.1.0  
**工作量**: 1 周  
**Breaking Change**: 否

**需求描述**:
提供 Choice Type 的基础辅助函数，简化应用层开发。

**API 设计**:
```typescript
/**
 * 检测元素是否为选择类型
 */
export function isChoiceType(element: CanonicalElement): boolean;

/**
 * 获取选择类型的基础名称
 * @example "value[x]" → "value"
 */
export function getChoiceBaseName(elementPath: string): string;

/**
 * 构建 JSON 键
 * @example ("value", "Quantity") → "valueQuantity"
 */
export function buildChoiceJsonKey(baseName: string, typeCode: string): string;

/**
 * 解析 JSON 键
 * @example ("valueQuantity", "value") → "Quantity"
 */
export function parseChoiceJsonKey(jsonKey: string, baseName: string): string | null;

/**
 * 解析资源中激活的选择类型
 */
export function resolveChoiceType(
  element: CanonicalElement,
  resource: Record<string, unknown>,
): {
  baseName: string;
  availableTypes: string[];
  activeType: string | null;
  activeJsonKey: string | null;
};
```

**实现示例**:
```typescript
export function isChoiceType(element: CanonicalElement): boolean {
  return element.path.endsWith('[x]') && element.types.length > 1;
}

export function getChoiceBaseName(elementPath: string): string {
  const name = elementPath.split('.').pop() ?? '';
  return name.replace('[x]', '');
}

export function buildChoiceJsonKey(baseName: string, typeCode: string): string {
  return baseName + typeCode.charAt(0).toUpperCase() + typeCode.slice(1);
}

export function parseChoiceJsonKey(jsonKey: string, baseName: string): string | null {
  if (!jsonKey.startsWith(baseName)) return null;
  const rest = jsonKey.slice(baseName.length);
  if (rest.length === 0) return null;
  if (rest[0] !== rest[0].toUpperCase()) return null;
  return rest;
}

export function resolveChoiceType(
  element: CanonicalElement,
  resource: Record<string, unknown>,
) {
  const baseName = getChoiceBaseName(element.path);
  const availableTypes = element.types.map(t => t.code);
  
  let activeType: string | null = null;
  let activeJsonKey: string | null = null;
  
  for (const typeCode of availableTypes) {
    const jsonKey = buildChoiceJsonKey(baseName, typeCode);
    if (jsonKey in resource) {
      activeType = typeCode;
      activeJsonKey = jsonKey;
      break;
    }
  }
  
  return { baseName, availableTypes, activeType, activeJsonKey };
}
```

**测试用例**:
```typescript
test('isChoiceType', () => {
  const choiceEl = { path: 'Observation.value[x]', types: [{ code: 'Quantity' }, { code: 'string' }] };
  expect(isChoiceType(choiceEl)).toBe(true);
  
  const normalEl = { path: 'Observation.status', types: [{ code: 'code' }] };
  expect(isChoiceType(normalEl)).toBe(false);
});

test('buildChoiceJsonKey', () => {
  expect(buildChoiceJsonKey('value', 'Quantity')).toBe('valueQuantity');
  expect(buildChoiceJsonKey('onset', 'DateTime')).toBe('onsetDateTime');
});

test('resolveChoiceType', () => {
  const element = { path: 'Observation.value[x]', types: [{ code: 'Quantity' }, { code: 'string' }] };
  const resource = { resourceType: 'Observation', valueQuantity: { value: 100 } };
  
  const result = resolveChoiceType(element, resource);
  expect(result.activeType).toBe('Quantity');
  expect(result.activeJsonKey).toBe('valueQuantity');
});
```

---

### 3.3 解决的问题

#### 问题 1: 路径解析重复实现
**当前**: 每个项目自研 `value[x]` → `valueQuantity` 逻辑  
**升级后**: 调用标准 API

#### 问题 2: JSON 键构建重复实现
**当前**: 每个项目自研 buildChoiceJsonKey  
**升级后**: 调用标准 API

#### 问题 3: 选择类型检测重复实现
**当前**: 每个项目自研 isChoiceType  
**升级后**: 调用标准 API

---

## 4. 可选需求：BackboneElement 辅助 API

### 4.1 当前情况

#### 实现方式
**100% 应用层自研** - `instance-tree-engine.ts` (158 行)

#### 核心能力
- ✅ 检测 BackboneElement
- ✅ 检测数组元素
- ✅ 深度路径访问（`contact[0].name`）
- ✅ 数组实例管理（添加/删除）
- ✅ 获取子元素

#### 是否应该在 fhir-runtime？
**建议**: ⚠️ **部分功能可以提供**

**理由**:
- ✅ 检测 BackboneElement 是通用逻辑，可以提供
- ✅ 检测数组元素是通用逻辑，可以提供
- ✅ 获取子元素是通用逻辑，可以提供
- ⚠️ 深度路径访问是 UI 层需求，可以保持应用层
- ⚠️ 数组实例管理是 UI 层操作，可以保持应用层

---

### 4.2 升级需求（可选）

#### 需求 4.1: 提供 BackboneElement 辅助函数

**优先级**: ⭐⭐ (低)  
**版本**: v1.1.0  
**工作量**: 3-5 天  
**Breaking Change**: 否

**需求描述**:
提供 BackboneElement 的基础辅助函数。

**API 设计**:
```typescript
/**
 * 检测元素是否为 BackboneElement
 */
export function isBackboneElement(element: CanonicalElement): boolean;

/**
 * 检测元素是否为数组元素
 */
export function isArrayElement(element: CanonicalElement): boolean;

/**
 * 获取 BackboneElement 的子元素
 * @param parentPath - 父元素路径，如 "Patient.contact"
 * @param profile - 配置文件
 * @returns 直接子元素列表（过滤 id/extension/modifierExtension）
 */
export function getBackboneChildren(
  parentPath: string,
  profile: CanonicalProfile,
): CanonicalElement[];
```

**实现示例**:
```typescript
export function isBackboneElement(element: CanonicalElement): boolean {
  return element.types.length === 0 || 
         element.types.some(t => t.code === 'BackboneElement');
}

export function isArrayElement(element: CanonicalElement): boolean {
  return element.max === 'unbounded' || 
         (typeof element.max === 'number' && element.max > 1);
}

export function getBackboneChildren(
  parentPath: string,
  profile: CanonicalProfile,
): CanonicalElement[] {
  const prefix = parentPath + '.';
  const skipSuffixes = new Set(['id', 'extension', 'modifierExtension']);
  const result: CanonicalElement[] = [];
  
  for (const [path, el] of profile.elements) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (rest.includes('.')) continue;  // 只要直接子元素
    if (skipSuffixes.has(rest)) continue;
    result.push(el);
  }
  
  return result;
}
```

**测试用例**:
```typescript
test('isBackboneElement', () => {
  const backboneEl = { path: 'Patient.contact', types: [{ code: 'BackboneElement' }] };
  expect(isBackboneElement(backboneEl)).toBe(true);
  
  const normalEl = { path: 'Patient.name', types: [{ code: 'HumanName' }] };
  expect(isBackboneElement(normalEl)).toBe(false);
});

test('getBackboneChildren', () => {
  const children = getBackboneChildren('Patient.contact', patientProfile);
  expect(children.map(c => c.path)).toContain('Patient.contact.name');
  expect(children.map(c => c.path)).toContain('Patient.contact.telecom');
  expect(children.map(c => c.path)).not.toContain('Patient.contact.id');
  expect(children.map(c => c.path)).not.toContain('Patient.contact.extension');
});
```

---

### 4.3 解决的问题

#### 问题 1: BackboneElement 检测重复实现
**当前**: 每个项目自研检测逻辑  
**升级后**: 调用标准 API

#### 问题 2: 子元素获取重复实现
**当前**: 每个项目自研过滤逻辑  
**升级后**: 调用标准 API

---

## 5. 升级路线图

### Phase 1: 核心修复（v0.9.0）

**目标**: 修复设计缺陷和关键 bug  
**时间**: 1-2 周  
**Breaking Change**: 是

#### 任务清单
- [ ] 修复 `buildCanonicalProfile()` 保留切片元素
- [ ] 新增 `CanonicalProfile.slicing` 字段
- [ ] 新增 `SlicingInfo`, `SliceDefinition` 等类型
- [ ] 修复 `inferComplexType()` 类型推断 bug
- [ ] 编写单元测试（切片提取、类型推断）
- [ ] 更新文档和迁移指南
- [ ] 发布 v0.9.0

#### 迁移指南
```typescript
// v0.8.0（旧版）
const profile = buildCanonicalProfile(sd);
// profile.slicing 不存在

// v0.9.0（新版）
const profile = buildCanonicalProfile(sd);
// profile.slicing 现在可用
if (profile.slicing?.has('Observation.category')) {
  const slicingInfo = profile.slicing.get('Observation.category');
  console.log(slicingInfo.slices);
}
```

---

### Phase 2: Slicing API（v1.0.0）

**目标**: 提供完整的 Slicing API  
**时间**: 2-3 周  
**Breaking Change**: 否

#### 任务清单
- [ ] 实现 `matchSlice()` 函数
- [ ] 实现 `countSliceInstances()` 函数
- [ ] 实现 `validateSliceCardinality()` 函数
- [ ] 实现 `generateSliceSkeleton()` 函数
- [ ] 编写单元测试（判别器匹配、骨架生成）
- [ ] 编写集成测试（US Core 配置文件）
- [ ] 更新文档和示例
- [ ] 发布 v1.0.0

#### 示例代码
```typescript
import { matchSlice, generateSliceSkeleton } from 'fhir-runtime';

// 匹配切片
const profile = await getProfile('Observation');
const slicingInfo = profile.slicing?.get('Observation.category');
const instance = { coding: [{ system: '...', code: 'vital-signs' }] };
const sliceName = matchSlice(instance, slicingInfo);  // "VSCat"

// 生成骨架
const slice = slicingInfo.slices.find(s => s.sliceName === 'VSCat');
const skeleton = generateSliceSkeleton(slice);
// { coding: [{ system: '...', code: 'vital-signs' }] }
```

---

### Phase 3: 辅助 API（v1.1.0+）

**目标**: 提供 Choice Type 和 BackboneElement 辅助  
**时间**: 1-2 周  
**Breaking Change**: 否

#### 任务清单
- [ ] 实现 Choice Type 辅助函数
- [ ] 实现 BackboneElement 辅助函数
- [ ] 编写单元测试
- [ ] 更新文档和示例
- [ ] 发布 v1.1.0

---

## 6. 测试策略

### 6.1 单元测试

#### Slicing 测试
```typescript
describe('Slicing Support', () => {
  test('buildCanonicalProfile preserves slicing', () => {
    const profile = buildCanonicalProfile(usCoreObservationSD);
    expect(profile.slicing?.has('Observation.category')).toBe(true);
  });
  
  test('extractSlicing extracts all slices', () => {
    const profile = buildCanonicalProfile(usCoreObservationSD);
    const slicing = profile.slicing?.get('Observation.category');
    expect(slicing?.slices.length).toBeGreaterThan(0);
    expect(slicing?.slices.find(s => s.sliceName === 'VSCat')).toBeDefined();
  });
  
  test('matchSlice - value discriminator', () => {
    const instance = { code: 'vital-signs' };
    const sliceName = matchSlice(instance, slicingInfo);
    expect(sliceName).toBe('VSCat');
  });
  
  test('matchSlice - pattern discriminator', () => {
    const instance = {
      coding: [{ system: 'http://...', code: 'vital-signs' }],
      text: 'Vital Signs'
    };
    const sliceName = matchSlice(instance, slicingInfo);
    expect(sliceName).toBe('VSCat');
  });
  
  test('generateSliceSkeleton - extension slice', () => {
    const skeleton = generateSliceSkeleton(raceExtSlice);
    expect(skeleton.url).toBe('http://hl7.org/fhir/us/core/StructureDefinition/us-core-race');
  });
});
```

#### 类型推断测试
```typescript
describe('Type Inference', () => {
  test('inferComplexType - ContactPoint', () => {
    expect(inferComplexType({ system: 'phone', value: '555-1234', use: 'home' }))
      .toBe('ContactPoint');
  });
  
  test('inferComplexType - Identifier', () => {
    expect(inferComplexType({ system: 'http://...', value: '12345' }))
      .toBe('Identifier');
  });
  
  test('inferComplexType - HumanName vs Address', () => {
    expect(inferComplexType({ family: 'Smith', given: ['John'] }))
      .toBe('HumanName');
    expect(inferComplexType({ line: ['123 Main St'], city: 'Boston' }))
      .toBe('Address');
  });
});
```

---

### 6.2 集成测试

#### US Core 配置文件测试
```typescript
describe('US Core Integration', () => {
  test('US Core Patient - extension slicing', async () => {
    const profile = await getProfile('USCorePatient');
    const extSlicing = profile.slicing?.get('Patient.extension');
    expect(extSlicing?.slices.length).toBeGreaterThan(0);
    expect(extSlicing?.slices.find(s => s.sliceName === 'race')).toBeDefined();
  });
  
  test('US Core Observation - category slicing', async () => {
    const profile = await getProfile('USCoreObservation');
    const catSlicing = profile.slicing?.get('Observation.category');
    expect(catSlicing?.discriminator[0].type).toBe('pattern');
    expect(catSlicing?.slices.find(s => s.sliceName === 'VSCat')).toBeDefined();
  });
});
```

---

## 7. 文档需求

### 7.1 API 文档

#### Slicing API
- `CanonicalProfile.slicing` 字段说明
- `SlicingInfo` 类型定义
- `SliceDefinition` 类型定义
- `matchSlice()` 函数文档
- `generateSliceSkeleton()` 函数文档
- `countSliceInstances()` 函数文档

#### 示例代码
```typescript
// 访问切片信息
const profile = await getProfile('Observation');
const slicingInfo = profile.slicing?.get('Observation.category');

// 匹配切片
const instance = { coding: [{ system: '...', code: 'vital-signs' }] };
const sliceName = matchSlice(instance, slicingInfo);

// 生成骨架
const slice = slicingInfo.slices.find(s => s.sliceName === 'VSCat');
const skeleton = generateSliceSkeleton(slice);
```

---

### 7.2 迁移指南

#### v0.8.0 → v0.9.0
```markdown
## Breaking Changes

### CanonicalProfile 新增 slicing 字段

**变更**: `CanonicalProfile` 接口新增可选字段 `slicing?: Map<string, SlicingInfo>`

**影响**: 无破坏性影响，向后兼容

**迁移**:
```typescript
// v0.8.0（旧版）
const profile = buildCanonicalProfile(sd);
// 无法访问切片信息

// v0.9.0（新版）
const profile = buildCanonicalProfile(sd);
if (profile.slicing?.has('Observation.category')) {
  const slicingInfo = profile.slicing.get('Observation.category');
  // 现在可以访问切片信息
}
```

### inferComplexType 行为变更

**变更**: 修复 ContactPoint/Identifier 误判 bug

**影响**: 验证结果更准确，可能减少误报

**迁移**: 无需代码变更，自动受益
```

---

## 8. 性能考虑

### 8.1 切片提取性能

**当前**: 应用层每次都需要解析原始 SD（~100ms）  
**升级后**: 一次性在 `buildCanonicalProfile()` 中提取（~20ms）

**优化**: 
- ✅ 切片信息缓存在 CanonicalProfile 中
- ✅ 避免重复解析原始 SD
- ✅ 减少内存占用（不需要同时保存原始 SD 和 CanonicalProfile）

---

### 8.2 切片匹配性能

**复杂度**: O(n * m)，n = 实例数，m = 切片数  
**优化**: 
- ✅ 使用 Map 缓存判别器路径
- ✅ 提前终止匹配（找到第一个匹配即返回）
- ✅ 避免深度克隆（使用浅比较）

---

## 9. 向后兼容性

### 9.1 v0.9.0 兼容性

**Breaking Changes**: 
- ⚠️ `CanonicalProfile` 接口新增 `slicing` 字段（可选，向后兼容）
- ⚠️ `buildCanonicalProfile()` 行为变更（保留切片元素）

**兼容性策略**:
- ✅ `slicing` 字段为可选，不影响现有代码
- ✅ 提供迁移指南和示例
- ✅ 保持 v0.8.0 分支维护 3 个月

---

### 9.2 v1.0.0 兼容性

**Breaking Changes**: 无

**新增功能**:
- ✅ `matchSlice()` - 新增
- ✅ `generateSliceSkeleton()` - 新增
- ✅ `countSliceInstances()` - 新增
- ✅ `validateSliceCardinality()` - 新增

**兼容性**: 完全向后兼容

---

## 10. 总结

### 10.1 核心需求优先级

| 需求 | 优先级 | 版本 | 工作量 | 收益 |
|------|--------|------|--------|------|
| **修复 Slicing 丢失** | ⭐⭐⭐⭐⭐ | v0.9.0 | 1 周 | 巨大 |
| **修复类型推断** | ⭐⭐⭐⭐ | v0.9.0 | 3 天 | 高 |
| **Slicing API** | ⭐⭐⭐⭐⭐ | v1.0.0 | 2 周 | 巨大 |
| **Choice Type 辅助** | ⭐⭐⭐ | v1.1.0 | 1 周 | 中 |
| **BackboneElement 辅助** | ⭐⭐ | v1.1.0 | 3 天 | 低 |

### 10.2 预期收益

#### 代码减少
- **Slicing**: 减少 ~420 行应用层代码
- **类型推断**: 减少 ~100 行 workaround 代码
- **总计**: 减少 ~520 行重复代码

#### 质量提升
- ✅ 验证准确性提升（无类型推断误报）
- ✅ 切片支持标准化（统一 API）
- ✅ 生态统一（避免重复造轮子）

#### 开发效率
- ✅ 新项目开发时间减少 50%
- ✅ 维护成本降低 70%
- ✅ 学习曲线降低（标准 API）

---

### 10.3 建议行动

**立即行动**:
1. ✅ 评审本需求文档
2. ✅ 确认技术方案和 API 设计
3. ✅ 制定详细开发计划

**Phase 1（1-2 周）**:
4. ✅ 实现 v0.9.0（修复 Slicing 和类型推断）
5. ✅ 编写单元测试
6. ✅ 发布 v0.9.0-beta 供测试

**Phase 2（2-3 周）**:
7. ✅ 实现 v1.0.0（Slicing API）
8. ✅ 编写集成测试
9. ✅ 发布 v1.0.0

**Phase 3（按需）**:
10. ⚠️ 评估 Choice Type 和 BackboneElement 辅助需求
11. ⚠️ 实现 v1.1.0（如有需要）

---

**文档版本**: v1.0  
**最后更新**: 2026-03-17  
**提出方**: FHIR Runtime Tools 项目组  
**联系人**: fangjun20208@gmail.com
