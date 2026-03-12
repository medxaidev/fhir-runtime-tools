#!/usr/bin/env node

/**
 * fhir-runtime 能力验证脚本
 * 
 * 目的：系统性验证 fhir-runtime v0.7.2 的实际导出 API 和能力边界
 * 
 * 验证项：
 * 1. 导出的类型定义 (StructureDefinition, ElementDefinition, etc.)
 * 2. Choice type [x] 相关 API
 * 3. Slicing 相关 API
 * 4. BackboneElement 相关 API
 * 5. Primitive _element 处理
 * 6. StructureValidator 的能力边界
 * 7. FHIRPath 高级功能
 * 8. TerminologyProvider / ReferenceResolver 接口
 */

import * as fhirRuntime from 'fhir-runtime';

console.log('='.repeat(80));
console.log('FHIR-Runtime v0.7.2 能力验证报告');
console.log('='.repeat(80));
console.log();

// ────────────────────────────────────────────────────────
// 1. 检查导出的 API
// ────────────────────────────────────────────────────────
console.log('【1】导出的 API 和类型');
console.log('-'.repeat(80));

const exports = Object.keys(fhirRuntime).sort();
console.log(`总计导出: ${exports.length} 个符号\n`);

const categories = {
  '类型 (Type)': [],
  '函数 (Function)': [],
  '类 (Class)': [],
  '常量 (Const)': [],
};

for (const name of exports) {
  const value = fhirRuntime[name];
  const type = typeof value;
  
  if (type === 'function') {
    // 区分 class 和 function
    if (value.prototype && value.prototype.constructor === value) {
      categories['类 (Class)'].push(name);
    } else {
      categories['函数 (Function)'].push(name);
    }
  } else if (type === 'object') {
    categories['常量 (Const)'].push(name);
  } else {
    categories['类型 (Type)'].push(name);
  }
}

for (const [category, items] of Object.entries(categories)) {
  if (items.length > 0) {
    console.log(`${category} (${items.length}):`);
    items.forEach(item => console.log(`  - ${item}`));
    console.log();
  }
}

// ────────────────────────────────────────────────────────
// 2. 关键能力检查
// ────────────────────────────────────────────────────────
console.log('【2】关键能力检查');
console.log('-'.repeat(80));

const capabilities = {
  '数据模型': [
    'Resource',
    'StructureDefinition', 
    'ElementDefinition',
    'CanonicalProfile',
    'CanonicalElement',
  ],
  '解析与序列化': [
    'parseFhirJson',
    'serializeToFhirJson',
  ],
  'Profile 能力': [
    'buildCanonicalProfile',
    'buildSnapshot',
    'resolveInheritance',
  ],
  '结构校验': [
    'StructureValidator',
    'validateResource',
  ],
  'FHIRPath': [
    'evalFhirPath',
    'parseFhirPath',
    'FhirPathEngine',
  ],
  'Choice Type': [
    'isChoiceType',
    'resolveChoiceType',
    'getChoiceTypes',
  ],
  'Slicing': [
    'extractSlicing',
    'matchSlice',
    'SlicingDiscriminator',
  ],
  'BackboneElement': [
    'isBackboneElement',
    'getBackboneElements',
  ],
  '扩展接口': [
    'TerminologyProvider',
    'ReferenceResolver',
  ],
};

const results = {};

for (const [category, items] of Object.entries(capabilities)) {
  results[category] = {};
  for (const item of items) {
    results[category][item] = exports.includes(item);
  }
}

for (const [category, items] of Object.entries(results)) {
  const found = Object.values(items).filter(Boolean).length;
  const total = Object.keys(items).length;
  const status = found === total ? '✅' : found > 0 ? '⚠️' : '❌';
  
  console.log(`${status} ${category} (${found}/${total})`);
  for (const [name, exists] of Object.entries(items)) {
    console.log(`  ${exists ? '✅' : '❌'} ${name}`);
  }
  console.log();
}

// ────────────────────────────────────────────────────────
// 3. StructureValidator 能力测试
// ────────────────────────────────────────────────────────
console.log('【3】StructureValidator 能力测试');
console.log('-'.repeat(80));

if (fhirRuntime.StructureValidator) {
  const validator = new fhirRuntime.StructureValidator();
  console.log('✅ StructureValidator 实例化成功');
  console.log(`   方法: ${Object.getOwnPropertyNames(Object.getPrototypeOf(validator)).filter(m => m !== 'constructor').join(', ')}`);
  console.log();
} else {
  console.log('❌ StructureValidator 不可用');
  console.log();
}

// ────────────────────────────────────────────────────────
// 4. 类型定义检查 (通过 import type 测试)
// ────────────────────────────────────────────────────────
console.log('【4】TypeScript 类型定义可用性');
console.log('-'.repeat(80));
console.log('(需要通过 TypeScript 编译器检查，此处仅列出预期类型)');
console.log();

const expectedTypes = [
  'Resource',
  'StructureDefinition',
  'ElementDefinition', 
  'CanonicalProfile',
  'CanonicalElement',
  'ParseResult',
  'ValidationIssue',
  'FhirPathResult',
  'TypeConstraint',
  'SlicingDiscriminator',
  'TerminologyProvider',
  'ReferenceResolver',
];

expectedTypes.forEach(type => {
  console.log(`  - ${type}`);
});
console.log();

// ────────────────────────────────────────────────────────
// 5. 总结
// ────────────────────────────────────────────────────────
console.log('='.repeat(80));
console.log('【总结】');
console.log('='.repeat(80));
console.log();
console.log('请检查上述输出，确认：');
console.log('1. Choice type / Slicing / BackboneElement 相关 API 是否存在');
console.log('2. 如果不存在，说明这些能力需要在应用层实现（当前架构合理）');
console.log('3. 如果存在，应考虑迁移应用层实现到 runtime');
console.log();
console.log('下一步建议：');
console.log('- 如果缺少高级 API → 保持当前应用层实现，向 fhir-runtime 提 feature request');
console.log('- 如果已有高级 API → 逐步重构，使用 runtime 提供的能力');
console.log();
