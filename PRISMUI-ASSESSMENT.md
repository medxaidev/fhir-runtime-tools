# PrismUI v0.2.0 框架评估报告

**日期**: 2026-03-11  
**当前版本**: @prismui/core@0.2.0, @prismui/react@0.2.0  
**最新版本**: 0.2.0 (已是最新)  
**评估目的**: 确定 PrismUI 框架的使用效果和升级必要性

---

## 执行摘要

**核心结论**: ✅ **当前已使用最新版本 (0.2.0)**，无需升级。框架使用**轻量且高效**，建议**保持现状**。

**关键发现**:
- ✅ 已使用最新版本 0.2.0 (发布于 2026-03-09)
- ✅ 使用轻量：仅 6 个文件使用，占比 12.8%
- ⚠️ 核心依赖：App.tsx 和 setup.ts 依赖 PrismUI
- ✅ 零运行时依赖：@prismui/core 无外部依赖
- ✅ 功能稳定：提供页面路由、通知系统、状态管理

**建议**: 保持当前版本，持续关注 PrismUI 更新。

---

## 1. 版本信息

### 1.1 当前使用版本

| 包名 | 当前版本 | 最新版本 | 状态 |
|------|---------|---------|------|
| `@prismui/core` | 0.2.0 | 0.2.0 | ✅ 最新 |
| `@prismui/react` | 0.2.0 | 0.2.0 | ✅ 最新 |

### 1.2 版本历史

```
@prismui/core
├─ 0.1.0  (2026-03-08)  初始发布
└─ 0.2.0  (2026-03-09)  当前版本

@prismui/react
├─ 0.1.0  (2026-03-08)  初始发布
└─ 0.2.0  (2026-03-09)  当前版本
```

**发布频率**: 2 个版本，间隔 1 天（快速迭代期）

### 1.3 包信息

#### @prismui/core@0.2.0
- **描述**: Core runtime kernel and type system for PrismUI
- **大小**: 610 KB (unpacked)
- **文件数**: 72 个
- **依赖**: 0 个 (零依赖 ✅)
- **Peer 依赖**: 无
- **类型定义**: ✅ 完整 TypeScript 支持

#### @prismui/react@0.2.0
- **描述**: React adapter for PrismUI
- **大小**: 114 KB (unpacked)
- **文件数**: 38 个
- **依赖**: @prismui/core@^0.2.0
- **Peer 依赖**: react >= 18.0.0, react-dom >= 18.0.0
- **类型定义**: ✅ 完整 TypeScript 支持

---

## 2. 使用情况分析

### 2.1 使用统计

| 指标 | 数值 | 占比 |
|------|------|------|
| **总源文件数** | 47 | 100% |
| **使用 @prismui/core** | 1 | 2.1% |
| **使用 @prismui/react** | 5 | 10.6% |
| **总使用文件数** | 6 | 12.8% |

**结论**: ✅ **轻量使用**，仅在必要的核心文件中引入。

### 2.2 @prismui/core 使用详情

**使用文件**: `src/setup.ts` (1 处)

**导入的符号** (4 个):
```typescript
import {
  createInteractionRuntime,  // 创建运行时实例
  createPageModule,           // 页面路由模块
  createNotificationModule,   // 通知系统模块
} from '@prismui/core';
```

**用途**: 初始化 PrismUI 运行时，配置模块系统。

### 2.3 @prismui/react 使用详情

**使用文件** (5 处):
1. `src/App.tsx` - 主应用入口
2. `src/tools/validator/ValidatorWorkspace.tsx` - 验证器工具
3. `src/tools/composer/ComposerWorkspace.tsx` - 编辑器工具
4. `src/tools/explorer/ExplorerWorkspace.tsx` - 浏览器工具
5. `src/tools/fhirpath/index.tsx` - FHIRPath 工具

**导入的符号** (4 个):
```typescript
import {
  PrismUIProvider,      // 运行时 Provider (App.tsx)
  usePage,              // 页面路由 hook (App.tsx)
  useRuntimeState,      // 运行时状态 hook (App.tsx)
  useNotification,      // 通知系统 hook (5 处)
} from '@prismui/react';
```

**使用频率**:
- `useNotification`: 5 处 (所有主要工具页面)
- `PrismUIProvider`: 1 处 (App 根组件)
- `usePage`: 1 处 (路由管理)
- `useRuntimeState`: 1 处 (状态显示)

---

## 3. 功能使用分析

### 3.1 核心功能使用

#### ① 页面路由系统
```typescript
// src/setup.ts
createPageModule()

// src/App.tsx
const { currentPage, mount, transition } = usePage();
```

**用途**: 管理 Validator / Composer / Explorer 三个工具页面的切换。

**评价**: ✅ 轻量级路由，无需 react-router，适合单页工具应用。

#### ② 通知系统
```typescript
// src/setup.ts
createNotificationModule({ maxNotifications: 50 })

// 各工具页面
const { notify } = useNotification();
notify({ type: 'success', message: 'Validation passed' });
```

**用途**: 统一的 Toast 通知和通知面板。

**评价**: ✅ 简洁易用，支持 success/error/warning/info 四种类型。

#### ③ 运行时状态管理
```typescript
const state = useRuntimeState();
// state.version - 运行时版本号
```

**用途**: 显示运行时状态信息。

**评价**: ✅ 基础功能，满足需求。

### 3.2 未使用的功能

根据 PrismUI 的设计，可能还有以下功能未使用：
- 自定义模块扩展
- 事件总线 (Event Bus)
- 更多状态管理能力

**建议**: 当前使用的功能已足够，无需引入更多复杂性。

---

## 4. 依赖深度分析

### 4.1 核心依赖关系

```
App.tsx (核心入口)
  ├─ PrismUIProvider      ← 必需
  ├─ usePage              ← 路由管理
  ├─ useRuntimeState      ← 状态显示
  └─ useNotification      ← 通知系统

setup.ts (运行时配置)
  ├─ createInteractionRuntime  ← 必需
  ├─ createPageModule          ← 路由模块
  └─ createNotificationModule  ← 通知模块

各工具页面 (4 个)
  └─ useNotification      ← 统一通知
```

**依赖深度**: ⚠️ **核心依赖**

- App.tsx 和 setup.ts 是应用的基础架构
- PrismUI 提供了路由和通知的核心能力
- 移除 PrismUI 需要重构整个应用架构

**结论**: PrismUI 是**架构级依赖**，但使用**轻量且合理**。

### 4.2 替代方案分析

如果不使用 PrismUI，需要的替代方案：

| PrismUI 功能 | 替代方案 | 复杂度 |
|-------------|---------|--------|
| 页面路由 | react-router | 中等 (更重) |
| 通知系统 | react-toastify / sonner | 低 (类似) |
| 状态管理 | zustand / jotai | 中等 (更复杂) |
| 模块系统 | 自行实现 | 高 |

**对比**:
- PrismUI: 零依赖，轻量级，一体化解决方案
- 替代方案: 需要多个包，总体积可能更大

**结论**: ✅ PrismUI 是**合理选择**，无需替换。

---

## 5. 性能与质量评估

### 5.1 包大小分析

| 包 | Unpacked Size | 文件数 | 依赖数 |
|----|--------------|--------|--------|
| @prismui/core | 610 KB | 72 | 0 |
| @prismui/react | 114 KB | 38 | 1 (@prismui/core) |
| **总计** | **724 KB** | **110** | **0 (外部)** |

**对比**:
- react-router-dom@6: ~800 KB
- zustand: ~50 KB
- react-toastify: ~150 KB

**结论**: ✅ 大小合理，提供了路由+通知+状态管理的一体化方案。

### 5.2 类型安全

```typescript
// ✅ 完整的 TypeScript 类型定义
import type { InteractionRuntime, PageModule, NotificationModule } from '@prismui/core';
import type { UsePageReturn, UseNotificationReturn } from '@prismui/react';
```

**评价**: ✅ 完整的 TypeScript 支持，类型安全有保障。

### 5.3 维护状态

- **作者**: Fangjun (与 fhir-runtime 同一作者)
- **仓库**: https://github.com/medxaidev/prismui
- **最后更新**: 2026-03-09 (2 天前)
- **版本节奏**: 快速迭代中

**评价**: ✅ 活跃维护，与项目作者一致，沟通成本低。

---

## 6. 升级评估

### 6.1 当前版本状态

✅ **已使用最新版本 0.2.0**

- 发布日期: 2026-03-09
- 距今: 2 天
- 状态: 最新稳定版

### 6.2 升级必要性

❌ **无需升级** - 已是最新版本

### 6.3 未来升级建议

当 PrismUI 发布新版本时，建议：

#### 升级前检查清单
- [ ] 查看 CHANGELOG，确认是否有 breaking changes
- [ ] 检查是否影响以下核心功能：
  - `createPageModule()` API
  - `createNotificationModule()` API
  - `useNotification()` hook
  - `usePage()` hook
- [ ] 在开发环境测试所有工具页面
- [ ] 测试通知系统的 4 种类型
- [ ] 测试页面路由切换

#### 升级风险评估
- **低风险**: 仅修复 bug 或添加新功能
- **中风险**: 修改现有 API 签名
- **高风险**: 重构核心架构或移除功能

**建议策略**: 跟随最新版本，但需充分测试核心功能。

---

## 7. 优缺点分析

### 7.1 优点

✅ **轻量级**
- 零外部依赖 (@prismui/core)
- 总体积 724 KB，合理

✅ **一体化**
- 路由 + 通知 + 状态管理
- 无需引入多个包

✅ **类型安全**
- 完整 TypeScript 支持
- 类型定义完善

✅ **易用性**
- API 简洁直观
- 学习成本低

✅ **维护性**
- 与项目作者一致
- 活跃维护中

### 7.2 缺点

⚠️ **核心依赖**
- App 架构依赖 PrismUI
- 替换成本较高

⚠️ **生态较小**
- 新框架，社区资源少
- 文档可能不完善

⚠️ **版本较新**
- 0.2.0 版本，可能有未发现的 bug
- API 可能不稳定

### 7.3 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| API 变更 | 中 | 中 | 锁定版本，关注 changelog |
| Bug 影响 | 低 | 低 | 使用简单功能，易于调试 |
| 维护停滞 | 低 | 高 | 作者同一人，可直接沟通 |
| 性能问题 | 低 | 低 | 使用轻量，影响有限 |

**总体风险**: ✅ **低风险** - 使用轻量，作者可控。

---

## 8. 决策建议

### 8.1 核心决策

✅ **保持当前版本 (0.2.0)**，无需升级

**理由**:
1. 已使用最新版本
2. 功能稳定，满足需求
3. 使用轻量，风险可控
4. 作者活跃维护

### 8.2 短期行动 (本周)

1. ✅ **无需行动** - 当前版本已是最新
2. 📝 记录 PrismUI 使用模式，便于未来维护
3. 🔍 关注 PrismUI GitHub 仓库，订阅 release 通知

### 8.3 中期行动 (本月)

4. 📚 补充 PrismUI 使用文档
   - 记录路由配置方式
   - 记录通知系统用法
   - 记录模块扩展方式

5. 🧪 添加 PrismUI 相关的测试
   - 测试页面路由切换
   - 测试通知系统功能

### 8.4 长期策略

6. 🔄 **跟随最新版本**
   - 每次 PrismUI 发布新版本时评估升级
   - 优先升级 patch 版本 (0.2.x)
   - 谨慎升级 minor 版本 (0.x.0)
   - 充分测试 major 版本 (x.0.0)

7. 🤝 **与作者保持沟通**
   - 反馈使用体验
   - 提出功能建议
   - 报告发现的 bug

8. 📊 **持续评估**
   - 每季度评估 PrismUI 的适用性
   - 如果出现更好的替代方案，考虑迁移

---

## 9. 对比：PrismUI vs 替代方案

### 9.1 方案对比

| 方案 | 路由 | 通知 | 状态 | 总大小 | 依赖数 | 学习成本 |
|------|------|------|------|--------|--------|---------|
| **PrismUI** | ✅ | ✅ | ✅ | 724 KB | 0 | 低 |
| react-router + zustand + sonner | ✅ | ✅ | ✅ | ~1 MB | 3 | 中 |
| 自行实现 | ✅ | ✅ | ✅ | ~50 KB | 0 | 高 |

### 9.2 推荐理由

✅ **推荐继续使用 PrismUI**

1. **一体化方案** - 无需管理多个包
2. **零依赖** - 减少供应链风险
3. **类型安全** - 完整 TypeScript 支持
4. **作者可控** - 与项目作者一致
5. **轻量使用** - 仅使用核心功能，风险低

---

## 10. 总结

### 10.1 核心结论

✅ **PrismUI v0.2.0 是合适的选择，建议保持现状**

### 10.2 关键数据

- **当前版本**: 0.2.0 (最新)
- **使用范围**: 6 个文件 (12.8%)
- **核心功能**: 路由 + 通知 + 状态管理
- **包大小**: 724 KB (合理)
- **外部依赖**: 0 个 (优秀)
- **维护状态**: 活跃 (2 天前更新)

### 10.3 最终建议

1. ✅ **保持当前版本** - 无需升级
2. 📝 **补充文档** - 记录使用模式
3. 🔍 **关注更新** - 订阅 release 通知
4. 🔄 **跟随最新** - 未来版本谨慎升级
5. 🤝 **保持沟通** - 与作者反馈交流

---

**评估完成日期**: 2026-03-11  
**下次复审**: 2026-06 (或 PrismUI v0.3.0 发布后)  
**评估人**: 系统化验证
