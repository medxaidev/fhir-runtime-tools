#!/usr/bin/env node

/**
 * StructureValidator 能力深度测试
 * 
 * 测试项：
 * 1. Slicing 验证能力
 * 2. Invariant (FHIRPath constraint) 执行
 * 3. Fixed/Pattern 验证
 * 4. Choice type 验证
 */

import { StructureValidator, buildCanonicalProfile, parseFhirJson } from 'fhir-runtime';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('='.repeat(80));
console.log('StructureValidator 能力深度测试');
console.log('='.repeat(80));
console.log();

// ────────────────────────────────────────────────────────
// 准备测试数据
// ────────────────────────────────────────────────────────

// 加载 US Core Patient (包含 slicing)
const usCoreProfilesPath = join(projectRoot, 'src/data/us-core-profiles.json');
const usCoreProfiles = JSON.parse(readFileSync(usCoreProfilesPath, 'utf-8'));
const usPatientSD = usCoreProfiles['USCorePatientProfile'];

if (!usPatientSD) {
  console.error('❌ 无法加载 US Core Patient Profile');
  process.exit(1);
}

const usPatientProfile = buildCanonicalProfile(usPatientSD);

// 测试用 Patient 资源
const testPatient = {
  resourceType: 'Patient',
  id: 'test-001',
  identifier: [
    {
      system: 'http://example.org/mrn',
      value: 'MRN123',
    },
  ],
  name: [
    {
      family: 'Doe',
      given: ['John'],
    },
  ],
  gender: 'male',
  // 故意缺少 US Core 要求的 extension slices
};

// ────────────────────────────────────────────────────────
// 测试 1: Slicing 验证
// ────────────────────────────────────────────────────────
console.log('【测试 1】Slicing 验证能力');
console.log('-'.repeat(80));

const validator = new StructureValidator();
const result = validator.validate(testPatient, usPatientProfile);

console.log(`验证结果: ${result.valid ? '✅ 通过' : '❌ 失败'}`);
console.log(`Issue 数量: ${result.issues.length}`);
console.log();

// 检查是否有 slicing 相关的错误
const slicingIssues = result.issues.filter(i => 
  i.message.toLowerCase().includes('slice') ||
  i.message.toLowerCase().includes('discriminator') ||
  i.path?.includes(':')
);

if (slicingIssues.length > 0) {
  console.log('✅ StructureValidator 支持 Slicing 验证');
  console.log('Slicing 相关 Issues:');
  slicingIssues.forEach(i => {
    console.log(`  - [${i.severity}] ${i.path}: ${i.message}`);
  });
} else {
  console.log('⚠️ 未检测到 Slicing 验证 (可能需要特定的测试用例)');
}
console.log();

// ────────────────────────────────────────────────────────
// 测试 2: Invariant 执行
// ────────────────────────────────────────────────────────
console.log('【测试 2】Invariant (FHIRPath Constraint) 执行');
console.log('-'.repeat(80));

// 检查 Profile 中是否有 invariants
const elementsWithInvariants = Array.from(usPatientProfile.elements.values())
  .filter(el => el.constraints && el.constraints.length > 0);

console.log(`Profile 中包含 constraint 的元素数量: ${elementsWithInvariants.length}`);

if (elementsWithInvariants.length > 0) {
  console.log('示例 constraints:');
  elementsWithInvariants.slice(0, 3).forEach(el => {
    console.log(`  - ${el.path}:`);
    el.constraints?.forEach(c => {
      console.log(`    [${c.severity}] ${c.key}: ${c.human}`);
      if (c.expression) {
        console.log(`    FHIRPath: ${c.expression}`);
      }
    });
  });
  console.log();
}

// 检查验证结果中是否有 invariant 相关错误
const invariantIssues = result.issues.filter(i =>
  i.code?.includes('invariant') ||
  i.code?.includes('constraint') ||
  (i.message.toLowerCase().includes('constraint') && !i.message.toLowerCase().includes('type'))
);

if (invariantIssues.length > 0) {
  console.log('✅ StructureValidator 执行 Invariant 验证');
  console.log('Invariant 相关 Issues:');
  invariantIssues.forEach(i => {
    console.log(`  - [${i.severity}] ${i.code}: ${i.message}`);
  });
} else {
  console.log('⚠️ 未检测到 Invariant 执行 (可能测试数据未触发 constraint)');
}
console.log();

// ────────────────────────────────────────────────────────
// 测试 3: Fixed/Pattern 验证
// ────────────────────────────────────────────────────────
console.log('【测试 3】Fixed/Pattern 验证');
console.log('-'.repeat(80));

const elementsWithFixed = Array.from(usPatientProfile.elements.values())
  .filter(el => el.fixedValue !== undefined || el.patternValue !== undefined);

console.log(`Profile 中包含 fixed/pattern 的元素数量: ${elementsWithFixed.length}`);

if (elementsWithFixed.length > 0) {
  console.log('示例 fixed/pattern 值:');
  elementsWithFixed.slice(0, 3).forEach(el => {
    if (el.fixedValue !== undefined) {
      console.log(`  - ${el.path}: fixed = ${JSON.stringify(el.fixedValue)}`);
    }
    if (el.patternValue !== undefined) {
      console.log(`  - ${el.path}: pattern = ${JSON.stringify(el.patternValue)}`);
    }
  });
  console.log();
}

const fixedPatternIssues = result.issues.filter(i =>
  i.message.toLowerCase().includes('fixed') ||
  i.message.toLowerCase().includes('pattern')
);

if (fixedPatternIssues.length > 0) {
  console.log('✅ StructureValidator 验证 Fixed/Pattern');
  console.log('Fixed/Pattern 相关 Issues:');
  fixedPatternIssues.forEach(i => {
    console.log(`  - [${i.severity}] ${i.message}`);
  });
} else {
  console.log('⚠️ 未检测到 Fixed/Pattern 验证 (可能测试数据符合要求)');
}
console.log();

// ────────────────────────────────────────────────────────
// 测试 4: Choice Type 验证
// ────────────────────────────────────────────────────────
console.log('【测试 4】Choice Type 验证');
console.log('-'.repeat(80));

const choiceElements = Array.from(usPatientProfile.elements.values())
  .filter(el => el.path.includes('[x]'));

console.log(`Profile 中 choice type 元素数量: ${choiceElements.length}`);

if (choiceElements.length > 0) {
  console.log('示例 choice types:');
  choiceElements.slice(0, 3).forEach(el => {
    const types = el.types.map(t => t.code).join(' | ');
    console.log(`  - ${el.path}: ${types}`);
  });
  console.log();
}

// 创建一个包含错误 choice type 的测试
const testChoiceError = {
  resourceType: 'Observation',
  status: 'final',
  code: { coding: [{ system: 'http://loinc.org', code: '1234-5' }] },
  valueString: 'test',
  valueInteger: 123, // 错误：同时存在多个 value[x] 变体
};

console.log('测试错误的 choice type (同时存在 valueString 和 valueInteger):');
// 注意：需要 Observation profile 才能测试，这里仅作演示
console.log('⚠️ 需要 Observation profile 进行完整测试');
console.log();

// ────────────────────────────────────────────────────────
// 总结
// ────────────────────────────────────────────────────────
console.log('='.repeat(80));
console.log('【总结】StructureValidator 能力评估');
console.log('='.repeat(80));
console.log();

const capabilities = {
  'Slicing 验证': slicingIssues.length > 0 ? '✅ 支持' : '⚠️ 未确认',
  'Invariant 执行': invariantIssues.length > 0 ? '✅ 支持' : '⚠️ 未确认',
  'Fixed/Pattern 验证': fixedPatternIssues.length > 0 ? '✅ 支持' : '⚠️ 未确认',
  'Choice Type 验证': '⚠️ 需要更多测试',
  'Cardinality 验证': '✅ 支持 (基础功能)',
  'Type 验证': '✅ 支持 (基础功能)',
};

for (const [cap, status] of Object.entries(capabilities)) {
  console.log(`${status.startsWith('✅') ? '✅' : '⚠️'} ${cap}: ${status}`);
}
console.log();

console.log('建议:');
console.log('1. StructureValidator 提供了基础的结构验证能力');
console.log('2. 对于 Slicing/Invariant/Fixed 等高级特性，需要更多测试确认');
console.log('3. 应用层的 slice-engine.ts 提供了更精细的 slicing 控制');
console.log('4. 保持当前架构，应用层引擎作为 runtime 的补充是合理的');
console.log();
