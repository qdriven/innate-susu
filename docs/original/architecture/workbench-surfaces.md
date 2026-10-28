# Innate 工作台与多 Surface 架构

日期：2026-10-26  
状态：记录当前桌面垂直切片，并定义后续 terminal、browser、画布与 Agentic UI 的演进边界。

## 1. 产品目标与核心判断

Innate 不是把 dsh、magpie 和 Orca 的功能重新抄进一个 Electron 窗口，而是提供稳定的桌面工作台：

- **magpie** 继续统一模型 Provider、Agent 接线、协议互译、路由与用量。
- **dsh Harness** 继续承载对话及其内部能力；在桌面壳中只是一个可启动、可停止、可嵌入的 Surface。
- **Innate 壳**负责窗口、模式门控、Surface 生命周期、工作区面板、权限边界与插件组合。
- **插件**贡献页面、面板和受限服务，不直接获得 Electron 主进程能力。
- **文件、Markdown 与只读 Git**属于壳层工作区能力，用于跨 Harness、terminal、browser 等 Surface 共享同一个项目上下文。

这套结构避免两类重复：不复制 Orca 的 per-agent 配置体系，也不把 Harness 内部的每种 UI 都强制搬出重写。

## 2. 当前已实现范围

| 能力 | 状态 | 当前实现 |
| --- | --- | --- |
| Harness 同窗口嵌入 | 已实现 | `WebContentsView` 附着到当前窗口的“对话”页，不再创建独立 `BrowserWindow` |
| Harness 持久 Surface | 已实现 | 离开页面只 detach；再次显示时 URL 未变则不 reload |
| magpie 控制台内嵌 | 已实现 | 独立受管端口与认证链接；不猜测已有实例 key；与 Harness 共用 `SurfaceHost` |
| 统一 Surface registry | 已实现 | `@dogic/core/surface` 统一描述与 open/activate/deactivate/close；工作区按根目录保存版本化安全快照并恢复文档 |
| 工作区目录选择 | 已实现 | 系统目录选择器；保存根目录；支持测试注入 `INNATE_WORKSPACE_ROOT` |
| 文件树与只读预览 | 已实现 | 目录懒加载；文本、Markdown、图片与不支持类型提示 |
| 代码语法高亮 | 已实现 | 独立 `@dogic/syntax-highlighting` 包；Shiki 按需加载语言，明暗主题跟随系统，失败或超大文件回退纯文本 |
| Markdown | 已实现 | GFM、相对文档链接、相对图片；链接/资源不能逃逸文档根目录 |
| 文件与 Git 标签 | 已实现 | 工作区中央文档标签，支持关闭文件、切换 staged/unstaged diff 视图 |
| 文件树与 Git 面板 | 已实现 | 工作区右侧可切换“文件 / Git”面板 |
| Git status / diff | 已实现 | 当前分支、porcelain status、已暂存与未暂存 diff，全部只读 |
| simple / dev 门控 | 已实现 | simple 为“对话 / 设置”；dev 增加总览、工作区、模型、模型配置与工具 |
| terminal Surface | 未实现 | 仅定义后续 provider 与安全边界 |
| browser Surface | 未实现 | 仅定义后续 provider 与导航权限 |
| 画布 Surface | 未实现 | 仅定义文档型 provider 与持久化契约方向 |
| Structured I/O + Annotation 契约 | 架构设计完成，代码未实现 | v1 类型、Schema、权限与降级要求已记录；T6.4 待实施 |
| Agentic UI | 未实现 | T6.5 消费统一任务、事件与输出契约，不复制 DSH 私有状态 |
| 批注与反馈 | 未实现 | T6.6 实现输出块批注、独立存储、讨论与反馈汇总 |

当前没有为这些未实现形态放置无功能入口或占位页。

## 3. 进程与包边界

```text
┌──────────────────────── Electron 主进程 ────────────────────────┐
│ window / mode / runtime lifecycle                               │
│ SurfaceHost ── WebContentsView 创建、attach、detach、bounds     │
│ WorkspaceService ── 受限文件读取与只读 Git                      │
│ HarnessRuntime ── dsh 进程、URL/token、状态事件                  │
│ dogic/services ── 可显式复用的 sidecar 与 Harness 编排            │
└──────────────────────────────┬─────────────────────────────────┘
                               │ contextBridge / 窄 IPC 契约
┌──────────────────────────────┴─────────────────────────────────┐
│ preload：只暴露类型化 API，不暴露 ipcRenderer、Node 或 shell     │
└──────────────────────────────┬─────────────────────────────────┘
                               │
┌──────────────────────────────┴─────────────────────────────────┐
│ renderer：React 壳、导航、Surface 标签、文档与工作区面板          │
│ @dogic/kernel/browser：DI、WorkbenchHost、SettingsHost           │
│ @dogic/plugin-workspace/plugin：通过 DI 获取 WorkspaceApi        │
└─────────────────────────────────────────────────────────────────┘
```

| 包 | 责任 | 不应承担 |
| --- | --- | --- |
| `apps/desktop` | Electron 窗口、IPC、SurfaceHost、React 组合与模式门控 | 在页面里直接操作 Node、Git 或子进程 |
| `packages/core` | 网关发现、dsh 状态、验证与共享类型；`/surface` 为浏览器安全的 Surface 生命周期 | UI 布局、插件安装生命周期、Node API 进入 `/surface` |
| `packages/kernel` | DI、插件生命周期、注册表；`/browser` 为纯 renderer 入口 | 将 Node Registry 打进浏览器 bundle |
| `packages/sdk` | 插件 SDK 与 ModelGateway 契约 | 具体桌面窗口实现 |
| `packages/syntax-highlighting` | Shiki 语言识别、异步高亮、明暗主题与纯文本回退 | 文件树、Git 服务或桌面窗口状态 |
| `plugins/model-gateway` | magpie CLI、binary 探测与降级 | 工作区文件与 Git |
| `plugins/workspace` | 工作区共享契约、主进程只读服务、renderer 面板与文档安全快照 | 任意命令执行、文件写入、Git 变更操作、快照保存文件内容 |
| `innate-dogic/services/model-gateway` | magpie sidecar 托管 | Electron 视图管理 |
| `innate-dogic/services/harness-runtime` | dsh 运行时托管 | React 页面或模型配置 UI |

renderer 使用 `@dogic/kernel/browser` 和 `@dogic/core/surface`，主进程或 Node 工具才使用完整入口。这些分包边界必须保留。

## 4. Surface、Document 与 Panel

### 4.1 三种不同对象

- **Surface**：中央工作区中的一个可激活上下文，例如 Harness 对话、terminal 会话、browser 页面或画布。它拥有生命周期、标题、图标、权限与持久化状态。
- **Document**：Surface 内可切换的内容，例如工作区中的文本、Markdown 或 diff。Document 不一定需要独立进程。
- **Panel**：依附于工作区的辅助视图，例如文件树、Git status、搜索或后续终端管理器。Panel 不抢占中央 Surface 标签身份。

因此，“文件树”不是中央 Surface，“Git diff”是文档型内容，“Harness”才是独立 Surface。后续不能把每种面板都复制成一个 `WebContentsView`。

### 4.2 当前 SurfaceHost 生命周期

当前 `SurfaceHost` 是主进程中的轻量 WebContents provider 宿主，描述与生命周期由共享 `SurfaceRegistry` 管理：

1. `show(descriptor, url, bounds)` 注册并激活 Surface，首次创建带 sandbox 的 `WebContentsView`。
2. id 已存在且 URL 未变化时复用，不重新加载。
3. 当前实现一次只 attach 一个 view；切换时先 detach 旧 view。
4. `hide(id)` 只 deactivate + detach，不销毁会话。
5. `setBounds(id, bounds)` 只调整当前附着 view。
6. `close(id)` 关闭描述并回收 webContents；Harness 的显式停止走此路径。
7. 窗口关闭时统一 detach、关闭所有 webContents 并清空 registry。
8. 新窗口请求一律拒绝；HTTP(S) 目标交给系统浏览器。

Harness 与 magpie 控制台通过各自的窄 IPC 使用这个宿主；工作区文件与 Git diff 标签在 renderer 使用同一个 `SurfaceRegistry` 契约。工作区按根目录保存版本化快照，快照只含安全描述，重载后通过只读 API 重新加载内容。

### 4.3 共享描述与后续 provider 契约

`@dogic/core/surface` 已实现 `SurfaceDescriptor`、`SurfaceRegistry` 和版本化 `SurfaceSnapshot`，浏览器可直接使用。下面的 `SurfaceProvider` 仍是后续 terminal/browser 等 provider 的接入契约，不声称已经统一所有 provider IPC：

```ts
type SurfaceKind = 'webcontents' | 'document' | 'terminal' | 'canvas' | 'agentic'

type SurfaceCapability =
  | 'workspace:read'
  | 'process:execute'
  | 'network:navigate'
  | 'canvas:write'
  | 'agent:tools'

interface SurfaceDescriptor {
  id: string
  providerId: string
  kind: SurfaceKind
  title: string
  workspaceId?: string
  capabilities: SurfaceCapability[]
}

interface SurfaceProvider {
  readonly id: string
  readonly kind: SurfaceKind
  open(input: unknown, context: SurfaceContext): Promise<SurfaceDescriptor>
  activate(id: string, bounds: ViewBounds): Promise<void>
  deactivate(id: string): Promise<void>
  resize(id: string, bounds: ViewBounds): Promise<void>
  serialize(id: string): Promise<unknown>
  restore(state: unknown): Promise<SurfaceDescriptor>
  close(id: string): Promise<void>
}
```

约束：

- descriptor 与 provider 状态分离，标签条不保存进程、token 或 webContents 对象。
- provider 决定技术实现，公共壳只管理统一生命周期。
- activate/deactivate 不等于 open/close；切换标签默认不杀掉对话、终端或任务。
- 持久化内容使用版本化 schema；secret、URL token 与未经筛选的终端输出不得写入布局状态。
- provider 失败只影响自己的 Surface，壳保留错误与重试入口，不拖垮整个工作台。

## 5. 各 Surface 的演进方案

### 5.1 Harness：已实现的首个 WebContents provider

Harness 启动与显示分开：`launchHarness` 只负责运行时，`harnessShow` 将当前 URL 嵌入标签。停止 Harness 时先 hide，再停止运行时。

后续把现有 Harness IPC 收敛到通用 provider registry 时，要保持：同窗口、不重复 reload、token 不进入 renderer 持久化、停止由用户显式触发。

### 5.2 terminal：M6 的后续 Surface

- 主进程持有 pty 会话，renderer 只负责终端视图与键盘/显示事件。
- 新建会话必须绑定已选择工作区与明确的可执行配置；不能暴露“renderer 传任意字符串给 shell”的通用 IPC。
- 输入、输出、resize、exit 分通道；输出有背压与缓冲上限，退出自动清理。
- 会话在标签 deactivate 后继续存在，close 才终止；应用退出时统一回收。
- 默认仅 dev 模式开放；simple 模式只在未来有明确受控任务时开放。

### 5.3 browser：导航不是任意权限

- 使用独立 WebContents provider 和持久分区策略，禁止 nodeIntegration，保留 contextIsolation 与 sandbox。
- 导航、弹窗、下载、权限请求分别审核；默认拒绝摄像头、麦克风、通知、剪贴板等权限。
- 外部链接与内部 Surface 导航采用明确规则，不能将 token URL 当成普通可分享地址。
- 下载只进入用户明确选择的位置；不自动执行下载内容。

### 5.4 画布：优先文档型 Surface

- 初期采用 React/Canvas/SVG 文档实现，不因“画布”二字引入额外 WebContents。
- 数据模型、布局视口与渲染层分离；文档持久化独立于 Surface 布局持久化。
- 插件贡献节点/工具时经 SDK 注册，不把任意主进程函数暴露给画布节点。
- 大画布需要虚拟化、增量渲染与自动保存恢复测试。

### 5.5 Agentic UI：受审批的事件驱动 Surface

- 以任务/运行实例为 Surface，工具调用、模型输出和人工审批组成可恢复事件流。
- 工具按 capability 授权；写入、命令执行、网络访问等高影响操作需要独立审批，不能因 UI 自动化而绕过。
- renderer 不持有模型密钥；执行端复用 magpie/dsh 能力，避免另建一套 per-agent 账号体系。
- 每个任务支持暂停、恢复、取消和审计；UI 只是事件流投影，不是执行事实源。
- T6.4 先统一 TaskInput、RunEvent、RunResult 与 OutputBlock，T6.5 才实现本 Surface；详见 [structured-io.md](./structured-io.md)。

### 5.6 Annotation：独立批注与反馈模型

- 批注不是 OutputBlock，也不直接写入 RunResult 或源文件；AnnotationStore 独立保存线程、消息和锚点。
- 支持输出块、文档、artifact 和画布目标；锚点失效标记 orphaned，不静默删除。
- AI 只能提出 AnnotationProposal，宿主复核原文权限且用户接受后入库，不能直接解决或重定位批注。
- T6.6 首片只做 Agent markdown 输出块、回复、解决/重开、本地持久化与反馈汇总，不提前实现多人协作。

## 6. 工作区与 Git 安全边界

当前 `WorkspaceService` 已落实：

- 根目录与现有文件均经过 `realpath`；目标必须仍位于 canonical root 内。
- 相对路径拒绝空路径、绝对路径与 NUL；Git 路径也做包含检查。
- 文本最多读取 2 MB，图片最多 5 MB，diff 最多 500K 字符，Git status 最多返回 500 条。
- Git 使用 `execFile('git', args)`，不拼接 shell 命令。
- renderer 只能调用 `WorkspaceApi` 六个方法，不能获得任意文件系统或进程接口。
- 文件、图片和 Git 都是只读；没有保存文件、stage、commit、checkout、reset 或 discard。

后续若开放写入，必须另立 capability 与审批边界，不能给现有只读 API 隐式增加写参数。

## 7. 长期工具组合与插件分包

Innate 是持续发展的工具组合平台。UI 优化和重组的目标是降低使用复杂度，而不是删减底层能力；应避免的是模块与壳的不必要耦合，而不是完整功能。

- simple/dev 继续通过页面注册与 capability 门控调整默认组合和可见性，而不是维护两套壳。
- 当前工作区 UI 插件通过 DI 的 `workbench` 与 `workspace-api` 注册面板，插件不接触 Electron。
- 后续 Surface provider 应同样通过受限服务注册；先抽离当前 Harness/工作区的重复标签状态，再增加新形态。
- Orca 的 SSH、worktree、PR、process-host 等通用模块可以按产品需要迁移。每个模块先明确 SDK、进程、UI 与资源边界，再独立实现、测试和打包；是否进入某个发行版由组合清单决定。
- per-agent 模型配置仍由 magpie 统一，避免重新制造 N×M 适配层。magpie 的完整配置页可嵌入开发模式；simple 模式只暴露经过 facade 收敛的必要设置。
- 共享 UI 能力优先沉淀为独立包，例如 `@dogic/syntax-highlighting` 同时服务工作区、Markdown 代码块和后续 diff，不与某个页面绑定。
- 双向宿主是正式组合方式：dogic 可托管 DSH，DSH 也可通过 `dsh-workbench` 贡献工作区和设置。只复用真正有收益的 UI/类型，薄适配层可按宿主重写；功能、权限与验收必须一致，禁止递归加载完整桌面。

## 8. 构建、Bundler 与分发

### 8.1 构建职责

| 范围 | 工具 | 结果 |
| --- | --- | --- |
| desktop main / preload / renderer | electron-vite（renderer 使用 Vite + React） | 分别生成运行 bundle |
| `@dogic/core` / kernel / workspace 插件 / syntax-highlighting | 由 electron-vite 从 TS 源码打入桌面对应进程 bundle；高亮语言为按需 chunk | 无需在便携包中另放这些包的 `dist` |
| 其他可组合工具模块 | 按运行位置选择 electron-vite、Vite、`tsc` 或独立 sidecar bundler | 每包独立构建，由发行组合清单决定是否随包分发 |
| 方案网站 | Vite | 静态网站 bundle |
| `innate-dogic/services` | `tsc` / `tsc -b` | 逐文件 JS、声明与 sourcemap，不是单文件 bundle |
| Electron 安装器/免安装结构 | electron-builder | 分发组装，不替代源码 Bundler |
| 目录型便携包 | `tools/package-portable.ts` | 复制 Electron 与已构建 `out`，不是源码编译器 |

### 8.2 命令边界

```bash
pnpm build           # 全部 workspace 的代码构建
pnpm package:dir     # electron-builder 标准免安装目录
pnpm package         # electron-builder 的 NSIS + 单文件 portable 目标
pnpm package:portable# 本机目录型便携版绕行方案
```

当前桌面分发物不自动包含 dsh、magpie 或 `innate-dogic/services` 的 sidecar 产物。若后续随包发布这些运行时，需要单独设计 `extraResources`、生产依赖、原生模块 unpack 与 `DSH_HOME`，不能把“UI 已打包”当成“全部运行时已自包含”。

详细实测结果与限制见 `docs/build-path/04-desktop-packaging/README.md`。

## 9. 实施顺序与验收门槛

1. **统一注册表（已完成）**：Harness、magpie 控制台与工作区文档共享描述和生命周期；工作区安全快照跨重载恢复。已验证切换不重载、显式停止可回收、窗口关闭无残留。
2. **DSH Runtime 插件化（M3，下一项）**：收敛两套 Harness 托管，desktop 通过 DSH 集成插件启动与显示 Harness。验收：插件可禁用、进程可回收、现有对话零回退。
3. **DSH 侧工作区（M4）**：实测 DSH plugin 官方贡献点和权限，再实现真实文件/Markdown/Git 垂直切片。验收：安装、使用、重载、卸载及 dogic 回归全部通过。
4. **双向模型设置（M5）**：同一模型来源与默认模型能力进入 dogic 和 DSH。验收：双宿主接线、恢复、无凭据泄漏和 simple UAT。
5. **Structured I/O、Surface 与批注（M6）**：terminal/browser/canvas 独立排期；T6.4 契约 → T6.5 Agentic UI → T6.6 批注反馈。每项先在 dogic 完成真实垂直切片，再按实际场景决定 DSH 适配；不要求所有 Surface 都实现两次。
6. **双宿主分发（M7）**：桌面安装包与 DSH 插件包分别验证安装、升级、卸载、版本兼容和回滚。

双向宿主不意味着递归嵌入：DSH 插件只贡献叶子 Surface/Panel/Settings。代码可以复用，也可以按宿主重写薄适配层；统一的是功能、权限与验收。详细任务见 `docs/plans/innate-dogic-dsh/`。每一步都必须有真实宿主验收，不以静态占位页计为完成。
