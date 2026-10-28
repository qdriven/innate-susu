# 02 模块分析

## 1. 目标模块边界

W0 为避免路径和包名重写，保留 `innate-dogic/` 子树。目标仓形态如下；其中 terminal/browser/project-canvas 插件是后续阶段新增，不要求 W0 预建空目录。

```text
innate-desktop/
├─ innate-dogic/
│  ├─ apps/desktop/               Electron 组合宿主
│  ├─ apps/shell/                 保留的 Node/Web 形态
│  ├─ packages/{core,kernel,sdk,syntax-highlighting}/
│  ├─ plugins/{workspace,model-gateway}/
│  ├─ plugins/{terminal,browser,project-canvas}/   后续按需新增
│  ├─ services/{model-gateway,harness-runtime}/
│  └─ bin/magpie.exe
├─ innate-project-canvas/         快照、审计、derive、展示生成器
├─ tools/                         桌面冒烟、overlay、打包与工程检查
└─ docs/susu/plan/               本轮迁移计划与证据
```

依赖方向：

```text
apps → plugins → packages
apps → services → packages（按现有真实依赖，不强求所有服务经过同一链）
renderer → core/surface、kernel/browser、sdk（浏览器安全入口）
main/preload → 完整 Node 入口
轻应用或规划 Agent → 公共 Schema/契约，不接触 Electron 私有对象
```

`@innate/ui` 是外部 UI 基座，不纳入 `@dogic/*` 依赖方向，也不被 `packages/core`、services 或 main 进程依赖。

## 2. 规模与测试基线（2026-10-28 对源仓实测）

| 包名 | 类型 | 职责 | 行数(ts/tsx) | 测试(文件/用例) | workspace 依赖 |
| --- | --- | --- | --- | --- | --- |
| `@dogic/desktop` | app | Electron 桌面宿主：拉起 dsh web + magpie 集成 | 1539 | 0 / 0 | core, kernel, plugin-workspace |
| `@dogic/shell` | app | HTTP workbench 宿主（垂直切片遗产） | 196 | 0 / 0 | kernel, sdk, plugin-model-gateway |
| `@dogic/core` | package | 网关/dsh/mode/verify/Surface 共享逻辑 | 852 | 3 / 16 | 无 |
| `@dogic/kernel` | package | DI 容器/插件生命周期/插槽/注册表 | 1152 | 4 / 28 | sdk |
| `@dogic/sdk` | package | ModelGateway 契约 + mock + 契约测试 | 360 | 1 / 9 | 无 |
| `@dogic/syntax-highlighting` | package | Shiki 高亮（Light+/Dark+ 安全 HTML） | 125 | 1 / 3 | 无 |
| `@dogic/plugin-model-gateway` | plugin | magpie 探测/托管/CLI 封装/直连降级 | 1194 | 2 / 22 | kernel, sdk |
| `@dogic/plugin-workspace` | plugin | 只读 fs/git 服务 + 文件树/预览/Git UI | 874 | 1 / 5 | core, kernel, syntax-highlighting |
| `@dogic/harness-runtime` | service | dsh Harness Node 托管运行时 | 223 | 0 / 0 | service-model-gateway |
| `@dogic/service-model-gateway` | service | magpie sidecar：托管/健康/重启/接线 | 116 | 0 / 0 | 无 |
| `innate-project-canvas` | tool | 快照/审计/derive/看板生成 | ≈1534 | 1 / 4 | 无 |
| `tools/`（5 个脚本） | tool | 门禁/冒烟/overlay/便携打包/一键启动 | — | — | — |
| `bin/magpie.exe` | 二进制 | 开发/集成 magpie | 45MB | — | — |

要点：产品树合计约 6.6k 行；83 用例（2026-10-26）全部在 packages/plugins 层，**apps 与 services 零测试**；`main/harness.ts`（214 行）是零测试且风险最高的文件——W0.2 脱敏修复带首批测试，R1 收敛前补齐关键路径单测（stdout 解析/就绪探针/停止路径，注入 fakeChild）。

## 3. 应用模块

### 2.1 旧 Web 验证应用（已删除）

- **现状**：旧 `apps/susu-web` 已废弃删除，不再是目标仓模块或迁移依赖。
- **保留约束**：只保留 `@innate/ui` 源码消费、语义 token 和 `.dark` 主题规则，不保留旧应用代码与构建命令。
- **迁移动作**：W0 从根 workspace 和门禁中移除旧 Web 引用；W1 在新桌面 renderer 直接接入 UI 基座。

### 2.2 `innate-dogic/apps/desktop`

- **现状**：真实 Electron 主产品。main 管窗口、DSH/magpie 进程、SurfaceHost、工作区服务；preload 暴露 `window.innate`；renderer 在单个 `App.tsx` 组合全部页面。
- **主要耦合**：Harness 与控制台各有专用 show/hide/bounds IPC；页面、状态轮询和布局集中在 App；工作区通过静态 `plugin-registry.ts` 装配。
- **迁移动作**：W0 原样恢复；W1 拆壳组合与 Surface provider 接口；W2/W3 分域收窄 main 编排。
- **禁止**：在 renderer 开放 Node、任意 shell 或通用 `executeJavaScript`。

### 2.3 `innate-dogic/apps/shell`

- **现状**：独立 Node HTTP 壳，装配 kernel 和 model-gateway，提供 provider/agent/quota/wire API。
- **价值**：验证壳无关模块复用，不是 Electron 的替代品。
- **迁移动作**：W0 保持可构建和测试；本轮不增加新页面，不让它阻塞桌面垂直切片。
- **安全**：继续只监听 `127.0.0.1`；测试中的 wire/unwire 必须 mock 或隔离。

## 4. 共享 packages

### 3.1 `@dogic/core`

包含 DSH 入口解析、状态检查、模式存储、网关发现、共享类型，以及浏览器安全的 `/surface`。

- **直接复用**：类型、模式、检查和 SurfaceRegistry。
- **边界**：`/surface` 不得引入 Node/Electron；Node 能力不从该子入口导出。
- **后续调整**：W1 增加 provider 中立描述时保持 snapshot v1 兼容；新增字段必须可选并验证旧快照恢复。
- **注意**：核心状态读取不等于完整 ModelGateway 生命周期，W2 不用它替代 SDK 契约。

### 3.2 `@dogic/kernel`

包含 Container、LifecycleManager、Registry、WorkbenchHost、SettingsHost 和 `/browser` 入口。

- **直接复用**：DI、资源倒序回收、Panel 注册。
- **现状限制**：desktop 是手工静态组合，事件总线为 no-op；动态 manifest/ModuleLoader 不是当前生产主链。
- **迁移动作**：W0 原样带入；W1/W3 继续使用静态组合；S6 类动态装配决策不在本轮提前实施。
- **禁止**：为了“插件化”新造一套与 kernel 并行的生命周期框架。

### 3.3 `@dogic/sdk`

包含 ModelGateway 接口、mock 和契约测试。

- **直接复用**：W2 的 magpie 与 direct 实现继续共享同一契约。
- **后续扩展**：Q1 引用项目快照 Schema；Q3 只增加任务执行所需的最小 TaskInput/RunResult 类型，不提前实现完整 Agentic UI。
- **边界**：公共契约不能泄露 DSH 私有对象、Electron 类型或模型密钥。

### 3.4 `@dogic/syntax-highlighting`

- **现状**：独立 Shiki 高亮，语言按需加载，失败回退纯文本。
- **迁移动作**：W0 原样带入；W3 将主题输入映射到宿主 `.dark` 状态和语义 token。
- **禁止**：把 React 页面、文件系统或 Git 依赖放进该包。

## 5. 插件模块

### 4.1 `@dogic/plugin-workspace`

由 shared 类型、main WorkspaceService、renderer UI 和 UI plugin 组成。

- **已有安全能力**：canonical root 包含检查、相对路径校验、文本/图片/diff 上限、只读 Git 参数数组。
- **现状形态**：dev 模式下的“工作区页面”，内部同时有文件树、文档标签和 Git 面板。
- **目标形态**：右栏常驻文件/Git Panel；中栏 Document/Surface 标签；共享 WorkspaceContext 为 W4 提供 cwd。
- **迁移动作**：W3 拆组合而不扩大 API；不为拆 UI 给只读服务增加写方法。
- **验收重点**：路径逃逸、符号链接、大小限制、Git 参数注入、重载恢复全部保留。

### 4.2 `@dogic/plugin-model-gateway`

- **现状**：探测 magpie、封装 CLI、实现 ModelGateway，缺失时 DirectModelGateway 降级。
- **消费者**：当前主要是 apps/shell；desktop 仍有自己的 launcher/core 状态路径。
- **迁移动作**：W2 让桌面以同一契约获取网关能力；console 进程管理可与 ModelGateway 分离，但状态必须进入同一壳状态模型。
- **禁止**：为不同 Agent 复制账号、Provider 或用量模块。

### 4.3 新 terminal/browser/project-canvas 插件

这些是 Plan2 新增消费者，不是从源仓查找后假定的已有模块。

- terminal：W4，主进程 PTY + renderer 终端，不复用 WorkspaceApi。
- browser：W5，独立 WebContents provider，导航/下载/权限分开审核。
- project-canvas：Q2，消费已审计快照，React 展示与 HTML 生成器分离。

## 6. services 与桌面私有运行时

### 5.1 `services/model-gateway`

- **职责**：magpie sidecar 的 ensureRunning、healthcheck、崩溃重启、wire/unwire、quota。
- **优势**：壳无关，已有生命周期和退避。
- **风险**：测试若操作真实配置会越权；desktop launcher 另有进程与控制逻辑。
- **W2 策略**：sidecar 生命周期优先复用该模块；console 认证与 WebContents 仍由桌面适配层负责。

### 5.2 `services/harness-runtime`

- **职责**：`bootBackend` 串联 gateway → 首次 profile 初始化 → wire → harness。
- **优势**：显式 DSH_HOME、首次启动流程、壳无关。
- **现状限制**：desktop 未使用；`desiredModel` 有具体默认值；停止行为与桌面不同；原始 stdout 日志也需脱敏。
- **禁止直接替换**：不能在不验证真实用户 DSH_HOME、simple overlay、Windows 停止和状态事件的情况下替换桌面实现。

### 5.3 `apps/desktop/src/main/harness.ts`

- **职责**：当前真实桌面路径，解析系统 Node、继承用户 DSH_HOME、注入 simple patch、捕获认证 URL、发布 HarnessState。
- **优势**：与现有 UI、模式和 Surface 已接线。
- **问题**：与服务重复；stdout 原行日志可能包含 token；启动/停止行为需与共享实现对照。
- **W2 收敛顺序**：先定义行为矩阵和脱敏 → 抽共享实现并保留桌面适配 → 全量对照 → 最后删除私有重复代码。

## 7. Surface 模块

`SurfaceRegistry` 已支持 open/activate/deactivate/close/list/snapshot/restore；`SurfaceHost` 已用 Map 保存多个 WebContentsView，detach 时不销毁。

尚未统一的是“外部使用方式”：Harness 和控制台各有专用 IPC，renderer 页面切换与 Surface 描述没有完全解耦。

W1 的合理最小抽象：

```text
SurfaceDescriptor（安全、可持久化）
SurfaceProvider（main 或 renderer 的生命周期实现）
SurfaceTabs（只持有 descriptor/id，不持有 URL token 或 webContents）
WorkspaceContext（workspaceId/root 引用，权限由服务端重查）
```

不要抽象“所有内容都是 WebContents”。Document、React Panel、terminal、browser 和 canvas 可以有不同 provider。

## 8. project-canvas 模块

### 7.1 可复用能力

- `buildSnapshot`：从 Sprint 文档和 workspace 依赖图生成快照。
- `validateSnapshot/createAuditReport`：检查 ID、依赖环、证据、模块边与文档漂移。
- `deriveState`：计算 Sprint 完成态、可执行 frontier 和下一任务。
- `renderSidebarHtml` 等：生成独立 HTML 展示。
- localStorage 草稿：只是人侧编辑草稿，不改权威文档。

### 7.2 接入限制

- 当前 `readSnapshot` 只做部分结构检查，不能代替对 Agent 输出的完整 JSON Schema 校验。
- `validateSnapshot` 是语义审计，也不会自动证明证据内容真实。
- 当前 Schema 的 Sprint id 只接受 `S<数字>`，task id 只接受特定 `T…<数字>` 形式；W/Q 编号不能直接当作快照 id。
- 本计划的机读投影在 `docs/susu/plan/canvas/`（自包含根，自带 `docs/sprints/README.md`，与旧文档目录互不冲突）：S0=W0、S1–S3=W1a/W1b/W1c、S4=W2、S5=W3、S6=W4、S7=W5、S8=R1、S9–S11=Q1–Q3；任务 id 用 T<段号>.<序号>，展示层保留 W/Q 别名（写在标题里）。

### 7.3 数据归属

- Sprint/模块源文档：权威输入。
- project-snapshot JSON：经审计的交换与运行输入。
- derive 结果：即时派生，不重复保存为第二事实源。
- HTML/localStorage：展示与草稿，不是任务执行事实源。
- Q3 RunResult/证据：运行事实；只有验证通过或人确认后才改变正式任务状态。

## 9. 工具、二进制与不迁移目录

| 对象 | 动作 | 原因 |
| --- | --- | --- |
| `tools/` | W0 迁入并适配根路径 | 保留真实 Electron、overlay、便携包门禁 |
| `bin/magpie.exe` | W0 按原相对位置迁入 | 保持开发与集成二进制解析 |
| `innate-project-canvas/` | W0 迁入，Q1/Q2 接线 | 避免复制第二套项目模型 |
| `references/` | 不迁 | 只读研究材料，不是运行依赖 |
| `prototypes/` | 不迁入本轮产品门禁 | 原型不是 M0–M2 基线；后续轻应用另立移植任务 |
| `sites/dsh-desktop-plan` | 本轮不迁 | 非桌面运行前提 |
| 旧 docs 全树 | 保留目标现有归档，不重复覆盖 | 只把 Plan2 作为本轮执行源 |
| orca 源码 | 不迁 | 只借鉴布局/token/模块边界 |

## 10. 模块到阶段的责任矩阵

| 模块 | W0 | W1a | W1b | W1c | W2 | W3 | W4 | W5 | R1 | Q1 | Q2 | Q3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop 壳 | 迁入 | titlebar/基座 | 壳组合 | 多标签 | 状态接入 | Panel 组合 | Surface 组合 | Surface 组合 | 运行接入 | — | Surface 组合 | 运行状态 |
| core/kernel/sdk | 迁入 | — | — | 契约小改 | 网关契约 | WorkspaceContext | capability 引用 | capability 引用 | Harness 收敛 | Schema 复用 | 快照类型 | 最小任务契约 |
| model-gateway | 迁入 | — | — | — | **主改** | — | 无依赖 | — | — | 可选 Agent | — | Agent 可选 |
| harness-runtime | 迁入 | 不改 | 不改 | 不改 | 不改(矩阵) | — | — | — | **主改(收敛)** | 规划适配 | — | Agent 执行 |
| workspace | 迁入 | 保持可跑 | 保持可跑 | 保持可跑 | — | **主改** | cwd 消费 | — | — | 项目上下文 | — | 证据路径 |
| terminal | 不建 | 不建 | 不建 | 不建 | 不建 | 不建 | 新增 | 复用 Surface | — | — | — | process 执行 |
| browser | 不建 | 不建 | 不建 | 不建 | 不建 | 不建 | 新增 | — | — | — | — | network 执行 |
| project-canvas | 迁入 | — | — | — | — | — | — | — | — | 生成/审计 | 主改 | frontier/证据 |
| tools | 迁入适配 | 基线断言 | 冒烟 | 多标签断言 | 集成验收(网关) | 安全验收 | PTY 打包 | browser 验收 | 集成链冒烟 | 负路径 | 恢复快照 | 端到端 |
