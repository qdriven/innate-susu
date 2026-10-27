# 模块与目录关系图

日期：2026-10-26  
状态：单一 pnpm monorepo；对应当前目录、`package.json` 与实际运行接线。

## 1. 先明确：这些模块和 DSH 是什么关系

**DSH（DeepSeek Harness）是真正运行 Agent 会话、调用模型并提供 Harness Web UI 的外部运行时；`innate-dogic` 不是 DSH 的源码，也不是另一套 Agent 实现，而是托管 DSH、组合模型配置与工作区能力的桌面工作台。**

三者的职责不能混在一起：

| 对象 | 在产品中的角色 | 当前是否在本仓 |
| --- | --- | --- |
| DSH / `@deepseek-ai/dsh` | Agent runtime、会话与工具执行、Harness Web UI、profile/patch/插件机制 | 否；从本机 npm 全局安装解析，由系统 Node 启动 |
| magpie | 模型控制面与网关；管理 Provider/模型，并把模型路由、凭据和默认模型写入 DSH 配置 | 本仓只保留开发/集成用 `bin/magpie.exe`，不持有其源码 |
| `innate-dogic` | Electron 桌面壳、进程与 Surface 生命周期、模式门控、工作区文件/Git、插件组合 | 是；本仓唯一产品工程 |

### 1.1 当前桌面对话的完整链路

```text
用户点击「开始对话」
  │
  ▼
apps/desktop（Electron 桌面壳）
  │  innate:launchHarness
  ▼
apps/desktop/src/main/harness.ts
  │  解析 @deepseek-ai/dsh，使用系统 Node 启动 dsh web
  │  继承真实 DSH_HOME（默认 ~/.dsh），simple 模式额外注入裁剪 patch
  ▼
DSH Harness 本地 Web 服务 + 带 token 的 URL
  │  innate:harnessShow
  ▼
SurfaceHost / WebContentsView
  │  将 DSH 自己的 Harness UI 嵌入当前桌面「对话」标签，不重写对话 UI
  ▼
用户与 DSH Agent 会话
```

当 DSH 已由 magpie 接线时，模型请求链路是：

```text
DSH Agent runtime
  → DSH profile 中的 magpie/llm-pi-ai 路由
  → magpie 网关
  → 已配置的模型 Provider

magpie 控制台或 CLI
  → 写 DSH 的 cordis.patch.yml、.env 与默认模型配置
  → 新启动的 DSH 会话读取并生效
```

因此，**桌面壳负责“启动和嵌入 DSH”，magpie 负责“给 DSH 接模型”，DSH 负责“真正执行 Agent 对话”**。

### 1.2 各目录与 DSH 的关系

| 模块 | 与 DSH 的关系 | 当前接线状态 |
| --- | --- | --- |
| `apps/desktop` | DSH 的桌面宿主：发现安装、启动/停止 `dsh web`、读取状态、嵌入 Harness UI | **直接使用，当前对话主链路** |
| `services/harness-runtime` | 壳无关的 DSH 进程托管；显式接收 `dshEntry` 和 `DSH_HOME`，可组合首次初始化与接线 | 独立后端入口可用，**desktop 尚未使用** |
| `services/model-gateway` | 通过 `magpie dsh <model>` 和 `magpie dsh default` 接线/恢复 DSH | 被上述独立后端编排使用 |
| `packages/core` | 一部分是 DSH 适配：解析入口、读取 `DSH_HOME`、检查 patch/默认模型；另一部分是通用 mode/Surface | desktop 直接使用 |
| `plugins/model-gateway` | 通用多 Agent 模型配置插件，可把 `dsh` 作为一种 Agent 接线；不是 DSH UI 插件 | 当前只由 shell 使用 |
| `plugins/workspace` | 桌面工作区的文件、Markdown 和只读 Git 能力，与 DSH 会话并行共享项目上下文 | **不依赖、不调用 DSH** |
| `apps/shell` | 提供模型/Agent 配置 HTTP API，不启动或嵌入 DSH | 当前不是 DSH 对话宿主 |
| `packages/kernel` / `sdk` / `syntax-highlighting` | 通用 DI、契约和高亮能力 | 不知道 DSH 的存在 |
| `sites/dsh-desktop-plan` | 方案展示网站 | 不参与 DSH 运行 |
| `tools` | 校验 DSH overlay，并驱动真实桌面与 DSH 冒烟 | 工程验收工具，不是运行时模块 |

**目标架构是双向宿主，但目前尚未实现双向插件接线**：M3 计划让 `innate-dogic` 通过 **DSH Runtime 插件**托管 Harness；M4 起计划让 DSH 通过自己的 `InnateUI` 等扩展机制加载 **Innate Workbench 插件**，获得工作区、模型设置等叶子能力。当前 desktop 仍直接使用私有 `main/harness.ts`，也没有 DSH 侧 Innate 插件。二者宿主、SDK 和生命周期不同，目标共享功能与契约，不共享 Electron/DSH 私有对象，并禁止递归加载完整桌面。

双向适配允许按宿主重写薄实现，以功能、安全边界和验收一致为目标，不强制为了代码复用引入统一抽象。完整主线见 [双向宿主实施计划](../plans/innate-dogic-dsh/README.md)。

M6.4 另计划在 `packages/sdk` 增加 `agent-io` / `annotation` 浏览器与 Node 安全子入口，统一任务、事件、结果和批注契约；T6.5 的 Agentic UI 与 T6.6 的 feedback 插件才消费这些契约。当前这些子入口和插件均不存在，不改变上述真实依赖图；详见 [Structured I/O 与 Annotation v1](./structured-io.md)。

当前便携包也不包含 DSH 源码或完整 DSH 运行时；没有安装 `@deepseek-ai/dsh` 时，桌面壳可以启动，但不能启动真正的 Harness 对话。

### 1.3 再看 monorepo 本身

**`innate-dogic` 是唯一产品工程：应用、共享包、插件和后端服务都是同级 workspace 模块；应用负责组合，插件负责扩展，共享包负责契约，服务负责外部运行时。**

原来的验证项目和独立 `innate-service` 工程边界已移除，不再维护“验证工程 / 产品工程”两套目录。

## 2. 一张图看全仓

```text
innate-labs/                         根目录：唯一的 pnpm workspace 与统一命令入口
│
├─ innate-dogic/                     唯一产品 monorepo 根
│  │
│  ├─ apps/                          可独立启动的应用，每个应用一个模块
│  │  ├─ desktop/                    @dogic/desktop：当前 Electron 主产品
│  │  └─ shell/                      @dogic/shell：独立 Node/Web 壳
│  │
│  ├─ plugins/                       可独立构建、测试和组合的插件模块
│  │  ├─ workspace/                  文件 / Markdown / 高亮 / 只读 Git
│  │  └─ model-gateway/              shell 使用的 magpie 网关插件与降级
│  │
│  ├─ packages/                      不包含完整产品的共享能力
│  │  ├─ core/                       dsh 状态、检查、模式、Surface 契约
│  │  ├─ kernel/                     DI、插件生命周期、注册表
│  │  ├─ sdk/                        插件与 ModelGateway 公共契约
│  │  └─ syntax-highlighting/        可复用 Shiki 高亮
│  │
│  ├─ services/                      不依赖 UI 的后端运行时模块
│  │  ├─ model-gateway/              magpie sidecar 托管
│  │  └─ harness-runtime/            dsh 初始化、接线和启动编排
│  │
│  └─ bin/magpie.exe                 统一保留的一份开发/集成二进制
│
├─ sites/dsh-desktop-plan/           独立方案网站，不被桌面应用引用
├─ tools/                            构建、打包、overlay 验证与真实窗口冒烟
├─ docs/                             当前架构、构建文档、计划与证据
├─ tasks/                            任务输入
├─ .agents/skills/                   项目上下文与操作手册
└─ references/                       外部研究材料，不是产品运行依赖

外部本机运行时：系统 Node、dsh CLI、magpie CLI/网关、Git、文件系统
```

## 3. apps、plugins、packages、services 的区别

| 目录 | 回答的问题 | 独立性 | 典型规则 |
| --- | --- | --- | --- |
| `apps/*` | 用户启动的是哪个产品形态？ | 独立启动、独立组合依赖 | 可以依赖 plugins/packages/services；不被共享包反向依赖 |
| `plugins/*` | 哪个可选能力被应用装配？ | 独立 package、独立测试、独立贡献点 | 通过 SDK/DI/窄 IPC 接入，不把代码塞进某个 app |
| `packages/*` | 哪些契约或基础能力需要跨模块复用？ | 独立 package，但不单独形成产品 | 不包含具体应用窗口，不反向依赖 apps |
| `services/*` | 哪个外部进程或后端运行时值得壳无关复用？ | 独立 Node 模块，可单独启动或嵌入 | 不依赖 Electron/React；由应用显式调用才参与运行 |

因此，“插件模式”不意味着把插件源码放进 `apps/desktop/src`，也不意味着插件必须伪装成可启动应用。**apps 与 plugins 都是独立 workspace 模块，应用通过依赖和注册机制组合插件。**

## 4. 当前真实依赖图

本节箭头统一为：**`A → B` 表示“A 依赖 B”**。

```text
@dogic/shell
   ├─→ @dogic/sdk
   ├─→ @dogic/kernel ─→ @dogic/sdk
   └─→ @dogic/plugin-model-gateway ─→ @dogic/kernel ─→ @dogic/sdk

@dogic/desktop
   ├─→ @dogic/core
   ├─→ @dogic/kernel ─→ @dogic/sdk
   └─→ @dogic/plugin-workspace
          ├─→ @dogic/core
          ├─→ @dogic/kernel ─→ @dogic/sdk
          └─→ @dogic/syntax-highlighting

@dogic/harness-runtime ─→ @dogic/service-model-gateway

@innate-labs/dsh-desktop-plan：独立网站，无内部 workspace 依赖
tools/*.ts：工程工具，不是被产品导入的运行时库
```

| 包 | 模块位置 | 直接内部依赖 | 当前消费者 |
| --- | --- | --- | --- |
| `@dogic/sdk` | `packages/sdk` | 无 | kernel、shell、model-gateway 插件 |
| `@dogic/kernel` | `packages/kernel` | sdk | desktop、shell、两个插件 |
| `@dogic/core` | `packages/core` | 无 | desktop、workspace 插件 |
| `@dogic/syntax-highlighting` | `packages/syntax-highlighting` | 无 | workspace 插件 |
| `@dogic/plugin-model-gateway` | `plugins/model-gateway` | kernel、sdk | shell |
| `@dogic/plugin-workspace` | `plugins/workspace` | core、kernel、syntax-highlighting | desktop |
| `@dogic/desktop` | `apps/desktop` | core、kernel、workspace | 当前桌面主产品 |
| `@dogic/shell` | `apps/shell` | kernel、sdk、model-gateway 插件 | 独立 Node/Web 产品形态 |
| `@dogic/service-model-gateway` | `services/model-gateway` | 无 | harness-runtime |
| `@dogic/harness-runtime` | `services/harness-runtime` | service-model-gateway | 独立后端 CLI；可被应用显式复用 |

## 5. 组合关系不等于所有模块都已接线

当前 desktop 的运行入口仍然是：

```text
apps/desktop/src/main/ipc.ts
   ├─→ main/harness.ts       当前桌面实际使用的 dsh 进程托管
   ├─→ main/launcher.ts      当前桌面实际使用的 magpie 控制台与接线操作
   ├─→ main/surface-host.ts  WebContentsView 生命周期
   └─→ plugin-workspace/main 受限文件与只读 Git 服务
```

`@dogic/harness-runtime` 位于同一 monorepo，但 **desktop 尚未声明对它的依赖**。它提供另一条壳无关 `bootBackend()` 编排：gateway → 首次 profile 初始化 → wire → harness。后续若统一两条 Harness 实现，必须修改 desktop 依赖与入口并跑真实冒烟，不能只改目录名称。

同样，`@dogic/plugin-model-gateway` 与 `@dogic/service-model-gateway` 仍是两个不同模块：前者服务 shell 插件体系，后者服务后端进程托管。统一命名不代表已经统一实现。

## 6. 桌面应用内部关系

```text
React renderer
   │  kernel/browser 装配 workspace UI 插件
   │  core/surface 管理文档标签与安全快照
   ▼
preload contextBridge：window.innate 窄 API
   │  类型化 IPC，不暴露 Node、任意文件系统或通用 shell
   ▼
Electron main
   ├─ window / mode / IPC
   ├─ SurfaceHost
   ├─ 当前桌面 HarnessRuntime
   ├─ magpie console launcher
   └─ WorkspaceService
           │
           ▼
系统 Node + dsh CLI / magpie CLI 与网关 / Git / 文件系统
```

桌面页面与插件不直接执行外部程序。外部进程由 main 或 service 模块托管，renderer 只拿到经过限制的契约。

## 7. 构建与分发关系

| 模块 | 构建方式 | 分发边界 |
| --- | --- | --- |
| desktop main / preload / renderer | electron-vite + Vite | 输出到 `apps/desktop/out`；所需共享包和 workspace 插件进入对应 bundle |
| packages 与 plugins | 各自 `tsc`；桌面另按 alias 从源码打包 | 便携包无需逐包复制它们的 `dist` |
| services | `tsc` / `tsc -b` | 逐文件 JS 与声明；当前不自动进入桌面便携包 |
| 方案网站 | Vite | 独立静态站点 |
| 目录型便携包 | `tools/package-portable.ts` | 组装 Electron 与桌面 `out`，不是新的应用模块 |
| electron-builder | `apps/desktop/scripts/package.ts` | 分发组装，不替代源码 bundler |

统一 monorepo 不等于所有代码都打进一个 exe。dsh、magpie 和 services 是否随产品分发，仍由明确的运行时与 `extraResources` 设计决定。

## 8. 修改功能时去哪里

| 需求 | 修改位置 |
| --- | --- |
| 新应用形态或应用组合方式 | `apps/<app>`；每个应用独立 package |
| 桌面窗口、导航、IPC、模式门控 | `apps/desktop` |
| 新可插拔页面、面板或受限能力 | `plugins/<plugin>`，再由目标 app 装配 |
| 文件树、Markdown、只读 Git | `plugins/workspace` |
| shell 的 magpie 插件行为 | `plugins/model-gateway` |
| Surface 描述与共享生命周期 | `packages/core` |
| DI、生命周期、注册表 | `packages/kernel` |
| 插件公共契约 | `packages/sdk` |
| 高亮 | `packages/syntax-highlighting` |
| 壳无关 gateway → wire → harness 编排 | `services/*` |
| 当前桌面实际 Harness 启动行为 | 当前先改 `apps/desktop/src/main/harness.ts`；若切到 service，必须同步修改依赖与入口 |
| 打包与真实窗口验收 | `tools/`、`apps/desktop/scripts/` |

## 9. 长期约束

- 根目录只有一个 workspace 依赖图和一套 `pnpm build / typecheck / test` 门禁。
- 新应用放 `apps`，新插件放 `plugins`，新共享契约放 `packages`，新壳无关运行时放 `services`。
- 不恢复并列产品工程或验证项目副本；历史研究材料只保留在 `references`，不能被产品源码导入。
- 模块迁移必须同步包名、workspace 配置、锁文件、文档与真实运行验证。
- Surface、Document、Panel 的边界见 [workbench-surfaces.md](./workbench-surfaces.md)。
