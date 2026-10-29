# innate-desktop 全局 Context

> 单一入口文档，回答五个问题：**做什么、架构是什么、模块是什么、插件模式是什么、协议是什么**。
> 细节按第 8 节文档地图跳转；待执行任务在 [docs/sprints/](./sprints/README.md)。
> 更新义务：架构、模块或协议发生变化时同步本文（对应各 Sprint 任务卡中的验证项）。

---

## 1. 做什么

**innate-desktop 工作台 × DeepSeek Harness（DSH）双向宿主。**

DSH 是真正运行 Agent 会话、执行工具、提供 Harness Web UI 的外部运行时；magpie 是模型控制面与网关；`innate-desktop` 是托管它们的桌面工作台。三者分工不可互换：

| 对象 | 角色 | 是否在本仓 |
| --- | --- | --- |
| DSH（`@deepseek-ai/dsh`） | Agent runtime、会话与工具执行、Harness UI、profile/patch/插件机制 | 否；本机 npm 全局解析，系统 Node 启动 |
| magpie | Provider/模型管理、Agent 接线、协议互译、路由与用量 | 只保留开发用 `bin/magpie.exe`，不持有源码 |
| `innate-desktop` | 桌面壳、进程与 Surface 生命周期、模式门控、工作区、插件组合 | 是；唯一产品工程 |

两个方向都进主线（双向宿主，**不递归嵌入**）：

- **方向 A：dogic 托管 DSH** —— `apps/desktop → DSH Runtime 插件 → dsh web / Harness Surface`。
- **方向 B：DSH 承载 Innate 能力** —— `DSH Harness → Innate Workbench DSH 插件 → 工作区、模型设置等叶子贡献点`。

**双模式**：`simple`（小白：对话 + 极简设置，overlay 裁剪 dsh 高级页，安装到首次对话 ≤3 步）与 `dev`（完整：总览/模型/控制台/工作区/工具 + magpie 全部能力）。模式持久化在 `packages/core`，页面门控走 `pages.ts` 注册表。

**明确不做**：不重写 Agent 执行内核；不复制 magpie 的 per-agent 配置体系（provider 池/路由组/订阅池/用量归账）；不在已嵌入桌面的 Harness 里再装整个桌面壳；mini-gateway（替代 magpie 的自研网关）只是决策门后的独立可选项。

## 2. 架构是什么

**单一 pnpm workspace，唯一产品工程 `innate-dogic`，四类同级模块：**

```text
innate-desktop/
├─ innate-dogic/                唯一产品 monorepo
│  ├─ apps/                     可独立启动的应用（desktop = Electron 主产品；shell = Node/Web 壳）
│  ├─ plugins/                  可独立构建/测试/组合的插件（workspace、model-gateway）
│  ├─ packages/                 跨模块共享的契约与能力（core、kernel、sdk、syntax-highlighting）
│  ├─ services/                 壳无关的后端运行时（model-gateway、harness-runtime）
│  └─ bin/magpie.exe            统一开发/集成二进制（版本记录见 bin/README.md）
├─ sites/dsh-desktop-plan/      独立方案网站
├─ tools/                       打包、overlay 验证、真实 Electron 冒烟
├─ docs/                        context / architecture / build-path / plans / sprints / evidence
└─ references/                  外部研究材料（本地保留，不进版本库，不被产品导入）
```

依赖方向保持单向，但不是所有模块都经过同一条链：apps 组合 plugins/packages；kernel → sdk；workspace → core/kernel/syntax-highlighting；harness-runtime → service-model-gateway；core 与 sdk 不反向依赖应用或插件。services 不依赖 Electron/React，由应用显式调用。**“组合”不等于“已接线”**：`services/harness-runtime` 存在但 desktop 尚未使用，完整依赖图见 `docs/architecture/module-map.md`。

**桌面对话主链路（当前真实接线）**：

```text
用户点击「开始对话」
  → renderer: innate:launchHarness
  → main/harness.ts：解析 @deepseek-ai/dsh，用系统 Node 启动 `dsh web`
    （继承真实 DSH_HOME；simple 模式注入 --profile web --patch 裁剪 overlay）
  → 捕获 stdout 中带 token 的 URL
  → SurfaceHost / WebContentsView 把 DSH 自己的 Harness UI 嵌进「对话」标签
  → DSH Agent 会话；模型请求走 profile 里的 magpie 路由 → magpie 网关 → Provider
```

**Surface 模型**：桌面内容分三类 —— Surface（Harness 级上下文，WebContentsView 承载）、Document（文件/diff 标签）、Panel（文件树等侧栏）。`packages/core/src/surface.ts` 的 `SurfaceRegistry` 管描述与安全快照；`main/surface-host.ts` 管 WebContentsView 生命周期。magpie 控制台与 Harness 共用同一 Surface 宿主与同一中栏标签槽（`renderer/src/surfaces/`：SurfaceTabs + provider 注册表 + SurfaceSlot），切换只 detach、显式关闭才销毁。terminal/browser/canvas/agentic UI 是 M6 按需项，无占位入口。

**进程拓扑**：Electron main 托管全部外部进程（dsh web、magpie CLI/控制台、Git 只读命令），renderer 无任何 Node/shell；services 包可脱离 Electron 单独跑（`backend-cli.js`）。

## 3. 模块是什么

| 模块 | 包名 | 职责 | 当前消费者 |
| --- | --- | --- | --- |
| `apps/desktop` | `@dogic/desktop` | Electron 主产品：窗口/模式/IPC、SurfaceHost、Harness 启动（暂为私有 `main/harness.ts`）、magpie 控制台 | 终端用户 |
| `apps/shell` | `@dogic/shell` | 独立 Node/Web 壳：模型/Agent 配置 HTTP API，不启动 DSH | 独立形态 |
| `packages/core` | `@dogic/core` | dsh 入口解析/状态/检查、模式存取、Surface 契约与安全快照（`/surface` 浏览器安全） | desktop、workspace |
| `packages/kernel` | `@dogic/kernel` | 插件内核：DI Container、LifecycleManager、Registry、ModuleLoader（`/browser` 纯 renderer 入口） | desktop、shell、插件 |
| `packages/sdk` | `@dogic/sdk` | ModelGateway 契约 + mock + 契约测试套件 | kernel、shell、插件 |
| `packages/syntax-highlighting` | `@dogic/syntax-highlighting` | 宿主无关 Shiki 高亮，语言按需加载 | workspace |
| `plugins/workspace` | `@dogic/plugin-workspace` | 文件树/文本/Markdown/图片预览、只读 Git status/diff（主进程服务 + renderer UI） | desktop |
| `plugins/model-gateway` | `@dogic/plugin-model-gateway` | shell 的 magpie CLI 插件：探测、MagpieCli、直连降级 | shell |
| `services/model-gateway` | `@dogic/service-model-gateway` | 壳无关 magpie sidecar：ensureRunning/healthcheck/崩溃重启 | harness-runtime |
| `services/harness-runtime` | `@dogic/harness-runtime` | 壳无关 dsh 编排：bootBackend（gateway → 首次 profile 初始化 → wire → harness） | 独立后端 CLI；**desktop 未接入** |

**修改功能去哪里**：新应用 → `apps/`；新插件 → `plugins/`；共享契约 → `packages/`；壳无关运行时 → `services/`；桌面当前 Harness 行为 → 先改 `apps/desktop/src/main/harness.ts`（M3 收敛后改 `plugins/dsh-runtime`）；打包与验收 → `tools/`。

## 4. 插件模式是什么

**三层插件体系**：

1. **dogic 组合插件**（`plugins/*`）：独立 workspace 模块，由应用装配，贡献页面/Panel/受限服务。现有：workspace（desktop 用）、model-gateway（shell 用）；M3 新增 dsh-runtime（方向 A）。
2. **DSH 侧 Innate 插件**（M4 起，`plugins/dsh-workbench`）：由真实 DSH 通过其官方 `InnateUI` 扩展机制加载，只贡献叶子能力（文件/Markdown/Git/设置），可安装/卸载，fail closed。
3. **宿主无关 packages**（按复用收益决策，不预先强拆）：`workspace-ui`（M4）、`model-settings`（M5）——纯 UI、类型、schema、测试夹具。

**内核设施（`packages/kernel`）**：

- `Container`：懒加载 DI + 循环依赖检测 + 倒序 dispose。
- `LifecycleManager`：插件状态机（pending → activating → active → …），激活失败回滚 effects，倒序清理。
- `Registry` / `ModuleLoader`：动态注册与加载设施——**当前生产路径未接线**（Sprint 6 决定接线或删除）。
- 契约：`Plugin = { id, apply(ctx) }`；manifest 声明在插件包 `package.json` 的 `innate.plugin` 字段（`id/host/client/provides/consumes`）。当前 workspace 插件符合契约；model-gateway 插件仍是裸函数形态（Sprint 6 统一）。

**装配现状与目标**：

```text
现状：desktop 在 plugin-registry.ts 手工 new Container/Context（事件总线为 no-op）静态装配 workspace；
      manifest 已声明但无代码读取；新增一个 UI 插件约需改 7 处。
目标：M3 起新插件（dsh-runtime）按契约贡献页面/状态/生命周期；desktop 改为组合插件，IPC 只转发契约；
      装配机制先沿用静态组合（计划原则：功能先于代码共享），动态装配与内核接线统一放 Sprint 6。
```

**扩展点约束**：插件通过 SDK 契约和窄 IPC 拿能力，不触 Electron 私有 API；插件禁用/卸载只关闭自身贡献（Surface、进程、监听），不影响其他插件与宿主对话。

## 5. 协议是什么

所有跨进程/跨宿主交互都走显式契约；版本化数据与验收用例必须双宿主一致。

### 5.1 ModelGateway 契约（`packages/sdk`）

`ModelGateway` 接口（mock 与真实适配器共用一套契约测试 `runModelGatewayContractTests`）：

```ts
status(); ensureRunning(); listProviders(); listAgents();
wireAgent(agentId, model); unwireAgent(agentId); gatewayUrl(); quota()
```

实现方：MagpieModelGateway（magpie CLI/HTTP）、DirectModelGateway（无 magpie 时直连降级）、sidecar 版 `MagpieGateway`（services）。设置页不感知实现切换（mini-gateway 若做，对齐同形契约）。

### 5.2 DSH 进程协议

- 启动：解析 `@deepseek-ai/dsh` 入口，**真实系统 Node** 启动（清除 `ELECTRON_RUN_AS_NODE`；Windows npm shim 需处理）。
- `dsh web` stdout 契约：`dsh web: <url?token=...>` —— 按行捕获，**token 不得进持久化日志**。
- `--patch` 是 launcher 级选项：`dsh --profile web --patch <file>`（simple overlay 注入点）。
- `DSH_HOME`：desktop 默认继承真实 `~/.dsh`；services 支持显式注入（测试隔离用临时目录）；二者不得串用。
- 全新 DSH_HOME 必须先裸 boot 生成 `profiles/`，再 magpie 接线，否则 baseURL 不生效。
- 停止：Windows 用 `taskkill /T` 进程树回收；进程退出/超时/异常都有状态与日志。

### 5.3 magpie 协议

- 控制台：`magpie web on <url?k=>` stdout；key 由 `MAGPIE_WEB_KEY` env 固定传入，key 文件存 `userData/console-key.json`。
- CLI 子命令（`MagpieCli` 封装）：provider 增删/测试、models、wireAgent/unwireAgent、quota、`magpie dsh <model>` 接线、`magpie dsh default` 恢复。
- 网关 HTTP：只监听 `127.0.0.1`（默认 3425）；desktop 用 `/api/hello` 探活、`/v1/models` 拉模型目录。
- 接线写入：DSH 的 `cordis.patch.yml`、`.env` 与默认模型配置；新启动的 DSH 会话读取生效。
- simple overlay：`apps/desktop/resources/innate-simple.patch.yml`，7 个条目 `disabled=true`；`pnpm verify:overlay` 用 `dump-config` 逐条断言（条目缺失即报警）。

### 5.4 壳层 IPC 契约（Electron）

- 通道统一 `innate:*`：status、win*（窗口控制）、get/setMode、models、checks、smoke、startMagpie、openMagpieWeb、surface{Show,Hide,Bounds,Close}、harness{State,Launch,Stop}、disconnectDsh、workspace{GetRoot,PickRoot,List,Read,GitStatus,GitDiff}。
- Surface 走 provider 中立窄接口（W1c）：`surfaceShow(descriptor, bounds)` 只收安全 descriptor 与 bounds，**不接受 URL**；`surfaceHide/surfaceBounds/surfaceClose` 只收 surface id。旧的 `console{Show,Hide,Bounds}` 与 `harness{Show,Hide,Bounds}` 专用通道已删除。
- 认证 URL 只在主进程对应 runtime provider 内解析（`SurfaceHost.registerProvider`）：renderer 既拿不到也提交不了带 token 的链接；伪造 providerId、id/kind 不匹配、非法 bounds 一律拒绝。
- preload 用 `contextBridge` 暴露 `window.innate`，类型双向锁定（renderer `api.ts` 的 `declare global` + preload `satisfies WorkspaceApi`）。
- renderer 不获得任意文件系统/进程/shell；workspace 服务按窄契约暴露，文件只读、canonical root 包含检查、大小上限。
- renderer 可见的 Harness 状态与启动结果不含认证 URL（`publicHarnessState` / `publicLaunchResult` 只回传 phase、port 与脱敏文案）。

### 5.5 Surface 契约（`packages/core/surface`）

`SurfaceKind = webcontents | document | terminal | canvas | agentic`；`SurfaceDescriptor/Record/Snapshot` 描述 id、kind、capabilities、安全快照。规则：detach 不销毁会话；URL 不变不 reload；认证 URL/token 不进布局快照；快照 schema 版本化、不兼容时安全回退。

W1c 落地形态：

- `packages/core/src/surface.ts`：`SurfaceRegistry` 是唯一生命周期语义来源；`parseSurfaceDescriptor` 白名单解析不可信输入（只复制 id/providerId/kind/title/workspaceId/capabilities）。
- renderer `surfaces/`：`SurfaceTabs`（标签状态 + 安全快照持久化，键 `innate.surface-tabs:center`）、`SurfaceProviderRegistry`（provider 注册/摘除/隔离 dispose）、`SurfaceSlot`（标签条 + 统一中栏槽 + 错误边界）。
- provider 契约同一接口容纳两类实现：`webcontents`（视图在主进程 `WebContentsView`）与 renderer `document`/`panel`（视图在 renderer 内）；terminal/browser 只保留 kind，不建空实现。
- 标签状态只含安全字段：URL token、webContents、ChildProcess 一律不进 renderer 状态、快照与证据。


### 5.6 Structured I/O 与 Annotation 契约（M6.4 计划）

[structured-io.md](./architecture/structured-io.md) 已固定 v1 架构，但代码与 UI 均未实现。T6.4 将在 `packages/sdk` 增加独立的 `agent-io` 与 `annotation` 子入口：TaskInput 描述任务，RunEvent 表达有序运行事实，RunResult 保存最终结果，OutputBlock 以白名单驱动展示；AnnotationThread/Message/Proposal 独立管理批注、问题和反馈。streaming 不混入最终结果，AI 不返回可执行 HTML/组件、不能关闭审批或直接解决批注。M3 不承担这套 Agent 内容协议，T6.5 才实现 Agentic UI，T6.6 才实现批注与反馈垂直切片。

### 5.7 安全硬约束

1. magpie 控制台/网关、dsh web 一律只绑 `127.0.0.1`。
2. 认证 URL、token、key 不进日志、布局快照、共享配置或测试夹具；key 只经受控设置服务交给 magpie。
3. 文件与 Git 默认只读；Git 用参数数组（禁 shell 拼接）；terminal 是独立高权限能力，不复用 WorkspaceApi。
4. Electron：`contextIsolation: true`、`nodeIntegration: false`、WebContentsView `sandbox: true`；新窗口一律外跳系统浏览器。
5. 测试隔离 `DSH_HOME`/userData/magpie 配置；真实二进制只跑只读命令。
6. DSH 插件版本不兼容或加载失败时只禁用自身（fail closed），不破坏 DSH 原生能力。

## 6. 工程门禁与当前状态

```bash
pnpm install && pnpm build && pnpm typecheck && pnpm test   # 全量门禁（83 项测试为 2026-10-26 基线，只增不减）
pnpm dev / pnpm dev:shell                                    # 双形态开发运行
pnpm smoke:desktop                                           # 真实 Electron CDP 冒烟（DOM 断言 + 截图）
pnpm verify:overlay                                          # simple overlay 7/7 断言
pnpm check:typescript                                        # 禁止产品目录出现 JS 源码
pnpm package:dir / pnpm package:portable                     # 分发（portable 后必跑真实冒烟）
```

当前状态（2026-10-27）：M0–M2 已完成并真实验证（DSH 对话内嵌、magpie 控制台、simple/dev 门控、overlay 7/7、原生工作区、Surface 快照、便携冒烟）；**下一执行项是 S0 工程与安全基线，完成后进入 S1（M3 DSH Runtime 插件化）**。证据在 `docs/plans/innate-dogic-dsh/evidence/`，完整对齐审计见 `docs/architecture/plan-alignment-review.md`。

## 7. 历史说明

早期并列的验证工程（原 `dsh-simple/`：dsh-innateos / innate-ws / magpie-dsh）与独立 `innate-service/` 工程已于 2026-10-26 的 v2.0 重构中移除/并入：验证结论沉淀为计划文档与 evidence，后端并入 `innate-dogic/services/`。不恢复旧目录；`references/` 仍是唯一允许的外部研究材料区（只读、不入库）。

## 8. 文档地图

> **2026-10-27 起平台化重启**：architecture / build-path / plan / sprint 的新 canonical 文档在 [`docs/innate-dogic/`](./innate-dogic/README.md)（共享底座 + 轻应用平台，开发框架 innate-fe / innate-backend）。本文与 `docs/plans|sprints|architecture|build-path` 保留为 M0–M2 基线与方向 B 依据，不再新增执行任务；M4/M5/S5/S6 任务卡仍有效。

| 问题 | 去哪里 |
| --- | --- |
| 全局上下文（本文） | `docs/CONTEXT.md` |
| 待执行任务（Sprint 层） | `docs/sprints/README.md` |
| 里程碑与决策总纲 | `docs/plans/innate-dogic-dsh/README.md` |
| 计划/构建/模块对齐审计 | `docs/architecture/plan-alignment-review.md` |
| 模块/目录/依赖细节 | `docs/architecture/module-map.md` |
| Surface/Document/Panel 边界 | `docs/architecture/workbench-surfaces.md` |
| Structured I/O、Agent 输出与批注反馈 | `docs/architecture/structured-io.md` |
| orca 模块取舍 | `docs/architecture/orca-module-review.md` |
| 构建与分发操作 | `docs/build-path/` |
| 阶段任务规格与实施记录 | `docs/plans/innate-dogic-dsh/01..06-*.md` |
| 跨阶段工程规范（测试/发布/回滚/UAT） | `docs/plans/innate-dogic-dsh/engineering.md` |
| mini-gateway 决策门 | `docs/plans/innate-dogic-dsh/appendix-mini-gateway.md` |
| 分场景操作手册 | `innate-dsh-playbook` 技能 |
| 技术栈说明 | `docs/dsh-tech-stack.md` |
