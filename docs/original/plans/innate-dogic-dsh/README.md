# innate-dogic × DSH 双向宿主实施计划

版本：v2.2 · 2026-10-27  
状态：M0–M2 已完成；下一执行项为 S0 工程与安全基线，完成后进入 S1（M3）。  
方案网站：`sites/dsh-desktop-plan`；本目录是唯一可执行任务总纲，取代原 `dsh-simplification` 的单一“界面简化”范围。

## 1. 产品决策

> **`innate-dogic` 是长期产品底座，DSH 是默认 Agent Runtime，同时也是可以承载 Innate 能力的第二个宿主。**

这两个方向都进入主线：

```text
方向 A：innate-dogic 作为宿主
apps/desktop → DSH Runtime 插件 → dsh web / Harness Surface

方向 B：DSH 作为宿主
DSH Harness → Innate Workbench DSH plugin → 工作区、模型设置等贡献点
```

magpie 继续负责模型 Provider、Agent 接线、协议互译、路由和用量。工作台不重写 Agent 执行内核，也不复制 magpie 的 per-agent 配置体系。

### 1.1 双向适配不等于递归嵌入

- 桌面中的 DSH 集成插件可以提供 Harness 对话 Surface。
- DSH 中的 Innate 插件可以提供文件、Git、Markdown、设置等叶子页面或 Panel。
- 不允许在已嵌入桌面的 Harness 里再次装入整个桌面壳。
- 不要求每项能力都双向提供；只有存在明确用户场景时才增加第二宿主适配器。

### 1.2 复用策略：功能先于代码共享

代码复用有价值，但不是架构是否成立的标准。允许不同宿主使用不同实现，尤其允许借助 AI 按各自 API 重写薄适配层。

必须统一的是：

1. 用户可见功能与术语。
2. 能力边界和安全约束。
3. 版本化数据与接口契约。
4. 双宿主验收用例。
5. 卸载、降级和故障行为。

优先复用宿主无关的类型、纯 UI、文档渲染、高亮与测试夹具；不为了“只保留一份代码”把 Electron、DSH 和 Node 的生命周期硬塞进同一个抽象。

## 2. 当前基线与差距

### 2.1 已完成并真实验证

| 能力 | 当前状态 |
| --- | --- |
| 单一 pnpm monorepo | `innate-dogic/{apps,packages,plugins,services}` 已统一，验证工程与并列 service 工程已移除 |
| DSH 对话内嵌 | desktop 启动真实 `dsh web`，在当前窗口嵌入 Harness；simple/dev 均通过 |
| magpie 控制台 | 受管认证 URL、真实内容、内嵌与浏览器逃生口通过 |
| simple/dev | 页面门控、模式持久化、simple overlay 7/7 验证通过 |
| 原生工作区 | 文件树、文本/Markdown/图片、高亮、只读 Git status/diff 已实现 |
| Surface 生命周期 | Harness、magpie 与工作区共享描述；工作区安全快照可恢复 |
| 工程质量 | 最近全量验证为 83 项测试通过；目录型便携版真实冒烟通过 |

历史任务见 [阶段 1](./01-stage-1-embed-console.md) 与 [阶段 2](./02-stage-2-simple-mode.md)，证据保留在 `evidence/`。

### 2.2 当前不能误认为已经完成

- desktop 仍直接使用自己的 `main/harness.ts`，尚未形成可移除的 DSH Runtime 插件。
- `services/harness-runtime` 与 desktop 存在两套实现，且 `DSH_HOME`、停止行为和启动选项并不完全相同。
- Harness IPC、Surface provider id 和页面仍直接写死 `harness` / DSH。
- 当前 workspace 的主进程服务依赖 Electron，不能直接作为 DSH plugin 安装。
- DSH 当前版本的插件后端、文件/Git 权限、设置贡献点、安装与卸载行为尚未形成实测能力矩阵。
- 尚没有 DSH 侧 Innate 插件、双宿主功能验收或独立插件分发包。
- NSIS 与单文件 portable 仍未验证；桌面便携包也不等于自包含 DSH/magpie 运行时。

## 3. 新里程碑

| 里程碑 | 内容 | 状态 / 预估 | 出口标准 |
| --- | --- | --- | --- |
| M0 | monorepo、构建与文档基座 | 已完成 | 单一 workspace，应用/插件/共享包/服务边界清晰 |
| M1 | dogic 内嵌 magpie 控制台 | 已完成 | 认证、真实内容、内嵌与外链通过 |
| M2 | DSH 对话、simple/dev 与原生工作区 | 已完成 | 真实 Harness、overlay、文件/Git、恢复与便携冒烟通过 |
| M3 | DSH Runtime 插件化与托管收敛 | S0 完成后执行 · 2–3 天 | desktop 只经 DSH 集成插件启动 Harness；两套托管合一；现有行为不回退 |
| M4 | DSH 侧 Innate Workbench 插件 | 4–6 天 | 在真实 DSH 中安装插件，完成文件/Markdown/Git 垂直切片并可卸载 |
| M5 | 双向宿主模型设置 | 3–4 天 | dogic 与 DSH 内均可完成来源、模型、接线；simple 流程不超过 3 步 |
| M6 | 通用 Surface 按需双向化 | 按 Surface 排期 | terminal/browser/canvas 独立排期；Structured I/O → Agentic UI → 批注反馈；每项真实验收 |
| M7 | 双运行时与双插件分发 | 2–3 天 + 外部工具链 | 桌面安装包、DSH 插件包、版本兼容矩阵和双宿主 UAT 完整 |

详细任务：

- [M3：DSH Runtime 插件化](./03-stage-3-dsh-integration.md)
- [M4：DSH 侧工作区插件](./04-stage-4-dsh-host-workspace.md)
- [M5：双向宿主模型设置](./05-stage-5-dual-host-settings.md)
- [M6–M7：Surface 与发布](./06-stage-6-surfaces-and-release.md)
- [跨阶段工程规范](./engineering.md)
- [独立可选项：mini-gateway](./appendix-mini-gateway.md)，不再占用双向宿主主线编号。

**执行层**：以上里程碑的待执行任务已按 Sprint 重组为独立任务卡（做什么 / 功能 / 如何验证），统一在 [docs/sprints/README.md](../../sprints/README.md) 维护——Sprint 0 工程基线 → Sprint 1（M3）→ … → Sprint 6 代码健康。本文保留里程碑、决策与验收总纲；阶段文档保留目标与架构上下文；任务清单以 Sprint 层为唯一执行源。

预估用于安排依赖，不是交付承诺；M4 的插件能力侦察可能改变实现方式，但不能用静态页面冒充完成。

## 4. 目标模块图

```text
innate-dogic
├─ apps/desktop                       默认桌面组合，不包含全部能力实现
│
├─ packages
│  ├─ core / kernel / sdk             通用生命周期、Surface、DI 与契约
│  │  └─ sdk/agent-io + annotation    M6.4：任务、事件、结果与批注 Schema
│  ├─ syntax-highlighting            已存在的宿主无关能力
│  ├─ workspace-ui                   M4：可复用工作区 UI/类型（按实际收益拆分）
│  └─ model-settings                 M5：设置 schema、纯 UI 与应用逻辑
│
├─ plugins
│  ├─ dsh-runtime                    方向 A：让 dogic 能托管 DSH/Harness
│  ├─ workspace                      dogic 侧工作区适配器
│  ├─ dsh-workbench                  方向 B：由 DSH 加载的 Innate 贡献插件
│  ├─ model-gateway                  magpie 能力与 dogic 适配
│  └─ feedback                       M6.6：批注、反馈 Panel 与宿主存储适配
│
└─ services
   ├─ harness-runtime                唯一壳无关 DSH 进程托管实现
   └─ model-gateway                  magpie sidecar 与 DSH 接线
```

包名和拆分粒度以实施时的依赖圈为准；不允许先建空目录冒充架构完成。若某项 UI 复用成本高于收益，可以各自实现，但契约测试与功能验收仍必须一致。

## 5. 依赖与执行顺序

```text
M0–M2 已完成
   ↓
M3 DSH Runtime 插件化
   ↓
M4 DSH 插件能力侦察 → 工作区双宿主垂直切片
   ↓
M5 模型设置双宿主
   ↓
M6 每个新 Surface 先 dogic，再按场景决定是否增加 DSH 适配
   ↓
M7 桌面 + DSH plugin 分发与双宿主 UAT
```

M4 的侦察只做一次短 spike，确认真实 API 后立即进入垂直切片；不先花数周设计覆盖所有未来能力的插件框架。mini-gateway 与主线解耦，只有触发决策门才实施。

## 6. 统一验收指标

| 指标 | 目标 | 验证方式 |
| --- | --- | --- |
| 当前功能不回退 | DSH 对话、magpie、simple/dev、工作区全部保留 | 现有桌面冒烟每阶段必跑 |
| DSH 插件可移除 | 禁用 DSH Runtime 后工作台和其他插件仍可用 | 插件生命周期与桌面回归 |
| DSH 侧真实可用 | 插件安装进真实 DSH，能读文件、预览 Markdown、查看 Git diff | DSH 宿主 E2E，不接受静态 mock 页面 |
| 功能一致 | 双宿主同一名称、同一安全约束、同一核心用例 | 共享契约测试 + 各宿主适配测试 |
| 权限不扩大 | renderer 无任意 Node/shell；文件只读限定根目录；secret 不入布局快照 | 安全测试与代码审查 |
| 小白流程 | 安装到首次对话 ≤3 步，simple 不暴露高级概念 | 干净环境 UAT |
| 工程质量 | build/typecheck/test 全绿，当前 83 项为最近基线 | 全量门禁 |
| 可回滚 | 桌面插件可禁用，DSH 插件可卸载，DSH 接线可恢复 | 安装/卸载/恢复实测 |

## 7. 风险与决策门

| 风险 | 处理 |
| --- | --- |
| DSH plugin API 不足以提供受限文件/Git 服务 | M4 先实测；优先使用官方后端能力，不能绕出任意文件系统或 shell；不足时记录阻塞并缩小首片，不伪造完成 |
| DSH 与 desktop 生命周期冲突 | M3 统一启动、停止、日志、token、DSH_HOME 与 Windows 进程树行为 |
| 双向适配形成重复实现 | 只沉淀实际复用的能力；允许薄适配器重复，禁止复制核心业务状态 |
| 双侧功能漂移 | 共用场景清单与契约测试；每次发布跑双宿主矩阵 |
| DSH 升级破坏贡献点或 overlay | 记录兼容版本；安装前检查；失败时禁用 Innate 插件而不破坏 DSH 自身 |
| 双向嵌入递归 | 只允许 DSH 插件贡献叶子 Surface/Panel/Settings，不加载完整 desktop |
| magpie 重写损失协议能力 | mini-gateway 仍为独立决策项，不阻塞 M3–M7 |

## 8. 原始任务与变更控制

原始 `tasks/setup-dsh/1-setup-dsh.md` 要求的 monorepo、插件、后端/sidecar、构建文档与 DSH 技术说明已覆盖；本 v2 计划新增双向宿主主线，不恢复旧目录，也不修改原始任务记录。

- 每阶段使用对应 T 编号，完成后更新实施记录、证据和总纲状态。
- 每个里程碑同步 `docs/architecture/`、`docs/build-path/`、方案网站与项目技能索引。
- 功能是否完成以真实运行和验收为准，不以目录、接口或占位页存在为准。
