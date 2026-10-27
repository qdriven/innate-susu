# build-path — 构建路径文档索引

本目录记录单一 innate-labs monorepo 的构建步骤。产品模块统一在 `innate-dogic`，不再区分验证工程与独立后端工程。

| 目录 | 任务 | 状态 |
| --- | --- | --- |
| [01-monorepo-init](./01-monorepo-init/README.md) | 根级 pnpm workspace 与模块划分 | ✅ 构建、类型与测试已验证 |
| [02-innate-dogic](./02-innate-dogic/README.md) | apps / packages / plugins 与 Electron 桌面宿主 | ✅ 构建、类型、测试与桌面冒烟已验证 |
| [03-dogic-services](./03-dogic-services/README.md) | services：magpie sidecar / dsh Harness 运行时托管 | ⚙️ 构建与类型已验证；独立 CLI 端到端待复验 |
| [04-desktop-packaging](./04-desktop-packaging/README.md) | 桌面端打包（electron-builder NSIS / portable / 手动便携版） | ⚠️ 目录型便携版已验证；标准 dir 未通过，NSIS / 单文件 portable 未验证 |

相关文档：

- [全局 Context](../CONTEXT.md) — 产品、架构、模块、插件与协议的统一入口
- [Sprint 执行层](../sprints/README.md) — 当前唯一待执行任务清单；顺序为 S0 → S1（M3）→ S2（M4）→ S3（M5）
- [计划与实现对齐审计](../architecture/plan-alignment-review.md) — 2026-10-27 完整对比结论与修正项
- [模块与目录关系图](../architecture/module-map.md) — 当前单一 monorepo、真实包依赖、应用与插件组合方式
- [多 Surface 工作台](../architecture/workbench-surfaces.md) — Surface、Document、Panel 与后续 provider 的架构边界
- [dsh 技术栈](../dsh-tech-stack.md) — DSH、magpie 与双向宿主的运行技术说明
- [双向宿主实施计划](../plans/innate-dogic-dsh/README.md) — M3 Runtime 插件化、M4 DSH 侧工作区、M5 双向设置、M6–M7 Surface 与发布
- 外部研究材料位于 `references/`，不属于产品 workspace 或运行依赖

## 一条命令跑通

```bash
pnpm install        # 安装全部 workspace 依赖
pnpm build          # 构建全部包（tsc + electron-vite）
pnpm typecheck      # 全量类型检查
pnpm test           # 全部单元测试 + magpie 真实二进制集成测试
```
