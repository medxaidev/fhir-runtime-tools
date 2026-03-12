#!/usr/bin/env node

/**
 * PrismUI 使用情况分析脚本
 * 
 * 分析项目中对 @prismui/core 和 @prismui/react 的使用情况
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

console.log('='.repeat(80));
console.log('PrismUI v0.2.0 使用情况分析');
console.log('='.repeat(80));
console.log();

// ────────────────────────────────────────────────────────
// 1. 扫描所有源文件
// ────────────────────────────────────────────────────────

function scanDirectory(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath, files);
    } else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

const sourceFiles = scanDirectory(srcDir);
console.log(`【1】源文件扫描`);
console.log('-'.repeat(80));
console.log(`总计源文件: ${sourceFiles.length} 个`);
console.log();

// ────────────────────────────────────────────────────────
// 2. 分析 PrismUI 导入
// ────────────────────────────────────────────────────────

const coreImports = new Map(); // file -> [imports]
const reactImports = new Map(); // file -> [imports]

const coreImportPattern = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]@prismui\/core['"]/g;
const reactImportPattern = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]@prismui\/react['"]/g;

for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf-8');
  const relativePath = file.replace(srcDir, 'src').replace(/\\/g, '/');
  
  // @prismui/core
  let match;
  while ((match = coreImportPattern.exec(content)) !== null) {
    const imports = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
    if (!coreImports.has(relativePath)) {
      coreImports.set(relativePath, []);
    }
    coreImports.get(relativePath).push(...imports);
  }
  
  // @prismui/react
  coreImportPattern.lastIndex = 0;
  while ((match = reactImportPattern.exec(content)) !== null) {
    const imports = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
    if (!reactImports.has(relativePath)) {
      reactImports.set(relativePath, []);
    }
    reactImports.get(relativePath).push(...imports);
  }
}

console.log(`【2】PrismUI 导入分析`);
console.log('-'.repeat(80));
console.log(`使用 @prismui/core 的文件: ${coreImports.size} 个`);
console.log(`使用 @prismui/react 的文件: ${reactImports.size} 个`);
console.log();

// ────────────────────────────────────────────────────────
// 3. @prismui/core 使用详情
// ────────────────────────────────────────────────────────

console.log(`【3】@prismui/core 使用详情`);
console.log('-'.repeat(80));

if (coreImports.size > 0) {
  const allCoreImports = new Map(); // import -> [files]
  
  for (const [file, imports] of coreImports.entries()) {
    for (const imp of imports) {
      if (!allCoreImports.has(imp)) {
        allCoreImports.set(imp, []);
      }
      allCoreImports.get(imp).push(file);
    }
  }
  
  console.log(`导入的符号 (${allCoreImports.size} 个):\n`);
  for (const [imp, files] of Array.from(allCoreImports.entries()).sort()) {
    console.log(`  ${imp} (${files.length} 处使用)`);
    files.forEach(f => console.log(`    - ${f}`));
  }
} else {
  console.log('⚠️ 未使用 @prismui/core');
}
console.log();

// ────────────────────────────────────────────────────────
// 4. @prismui/react 使用详情
// ────────────────────────────────────────────────────────

console.log(`【4】@prismui/react 使用详情`);
console.log('-'.repeat(80));

if (reactImports.size > 0) {
  const allReactImports = new Map(); // import -> [files]
  
  for (const [file, imports] of reactImports.entries()) {
    for (const imp of imports) {
      if (!allReactImports.has(imp)) {
        allReactImports.set(imp, []);
      }
      allReactImports.get(imp).push(file);
    }
  }
  
  console.log(`导入的符号 (${allReactImports.size} 个):\n`);
  for (const [imp, files] of Array.from(allReactImports.entries()).sort()) {
    console.log(`  ${imp} (${files.length} 处使用)`);
    files.forEach(f => console.log(`    - ${f}`));
  }
} else {
  console.log('⚠️ 未使用 @prismui/react');
}
console.log();

// ────────────────────────────────────────────────────────
// 5. 使用频率统计
// ────────────────────────────────────────────────────────

console.log(`【5】使用频率统计`);
console.log('-'.repeat(80));

const totalFiles = sourceFiles.length;
const coreUsageRate = ((coreImports.size / totalFiles) * 100).toFixed(1);
const reactUsageRate = ((reactImports.size / totalFiles) * 100).toFixed(1);

console.log(`@prismui/core  使用率: ${coreUsageRate}% (${coreImports.size}/${totalFiles})`);
console.log(`@prismui/react 使用率: ${reactUsageRate}% (${reactImports.size}/${totalFiles})`);
console.log();

// ────────────────────────────────────────────────────────
// 6. 依赖深度分析
// ────────────────────────────────────────────────────────

console.log(`【6】依赖深度分析`);
console.log('-'.repeat(80));

const criticalFiles = [
  'src/App.tsx',
  'src/setup.ts',
];

const criticalUsage = criticalFiles.filter(f => 
  coreImports.has(f) || reactImports.has(f)
);

console.log(`核心文件依赖 PrismUI: ${criticalUsage.length}/${criticalFiles.length}`);
criticalUsage.forEach(f => {
  const core = coreImports.get(f) || [];
  const react = reactImports.get(f) || [];
  console.log(`  ✓ ${f}`);
  if (core.length > 0) console.log(`    @prismui/core: ${core.join(', ')}`);
  if (react.length > 0) console.log(`    @prismui/react: ${react.join(', ')}`);
});
console.log();

// ────────────────────────────────────────────────────────
// 7. 总结
// ────────────────────────────────────────────────────────

console.log('='.repeat(80));
console.log('【总结】');
console.log('='.repeat(80));
console.log();

const isLightweight = coreImports.size <= 5 && reactImports.size <= 5;
const isCritical = criticalUsage.length > 0;

console.log(`依赖程度: ${isLightweight ? '✅ 轻量' : '⚠️ 重度'}`);
console.log(`核心依赖: ${isCritical ? '⚠️ 是 (App/setup 依赖)' : '✅ 否'}`);
console.log();

if (isCritical) {
  console.log('⚠️ PrismUI 是核心依赖，升级需谨慎测试');
} else {
  console.log('✅ PrismUI 非核心依赖，升级风险较低');
}
console.log();

console.log('建议:');
if (coreImports.size === 0 && reactImports.size === 0) {
  console.log('- 考虑移除 PrismUI 依赖（未使用）');
} else if (isLightweight) {
  console.log('- 使用轻量，升级风险低');
  console.log('- 可以跟随 PrismUI 最新版本');
} else {
  console.log('- 使用较多，升级前需充分测试');
  console.log('- 关注 PrismUI changelog 中的 breaking changes');
}
console.log();
