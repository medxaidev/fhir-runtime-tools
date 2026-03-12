/**
 * TypeScript 类型定义验证
 * 
 * 通过实际的 import type 语句验证 fhir-runtime 导出的类型定义
 */

// 尝试导入所有预期的类型
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

// 如果编译通过，说明这些类型都是可用的
console.log('✅ 所有类型定义验证通过');

// 导出类型以供检查
export type {
  Resource,
  StructureDefinition,
  ElementDefinition,
  CanonicalProfile,
  CanonicalElement,
  ParseResult,
  ValidationIssue,
  TypeConstraint,
  SlicingDiscriminator,
  TerminologyProvider,
  ReferenceResolver,
};
