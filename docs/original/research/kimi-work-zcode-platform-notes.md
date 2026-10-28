# 研究笔记：Kimi Work 逆向勘察 × ZCode 开源架构 → 共享底座轻应用平台

> 日期：2026-10-27。方法：`references/rea`（rea-agents 6.4.0，CLI 模式，无需 MCP 注册）对本地 Kimi Work `app.asar` 做静态分析；`references/zcode`（github.com/zai-org/ZCode，shallow clone）做源码架构研究。
> 产物：`%TEMP%/kimi-evidence.json`（70MB Evidence，evidence_id `ev_78c309f6…`）、`%TEMP%/kimi-files.txt`（asar 全量文件清单）、解包目录 `%TEMP%/kimi-app`。

## 1. Kimi Work（kimi-desktop）拆解结果

Kimi Work 本身就是一个「共享底座 + 轻应用」的存在性证明。逆向证据：

### 底座层

| 层 | 证据 | 说明 |
| --- | --- | --- |
| 多窗口/Surface 宿主 | rea Evidence：11 个 BrowserWindow、6 个 contextBridge API、160 个暴露成员、193 个 IPC 操作 | 每类工作面一个 preload 契约：`preload-kimi-agent`、`preload-launcher`、`preload-permission-flow`、`preload-work-surface-tip`、`preload-claw`、`preload-capture-pin`、`preload-scene-editor` 等 |
| 原生 OS 能力（按需拆分 .node） | `out/native/win32-x64/`：screen-capture、ocr、global-input、keyboard-environment、scroll-input、file-manager-selection、named-pipe、win32 | 计算机操作原语独立成 8 个原生模块；ASAR 完整性声明与解包文件不一致（打包后签名/strip 所致），rea 以 `--integrity-policy record-and-continue` 绕行 |
| Agent 运行时 = 内嵌 OpenClaw 网关 | `openclaw/openclaw.json`、`openclaw/gateway.lock`、`openclawDefaultPort: 18679/18879`、`X-Kimi-Claw-ID`、`openclaw-lark` 渠道、`MigrateOpenClawModal`、`UpgradeClawDesktopModal` | 自研壳 + 开源 Agent 生态（OpenClaw）组合，不自研执行内核 |
| 特色 worker | `plugin-local-loader`、`third-party-apps-catalog-client`、`workbench-browser-search-worker`、`chrome-cookie-import-worker`、`relay-proxy-agent`、`recovery-pipeline` | 插件双轨加载（市场 + 本地侧载）、第三方应用目录、浏览器桥 |

### 轻应用层（用户目的 → 一个能力包）

- **Skills**（SkillsPage/SkillsView）、**Plugins**（PluginsHubPage 市场枢纽 + PluginDetailPage + PluginInstallModal / **PluginLocalInstallModal** 本地侧载）、**MCP**（McpPage）。
- **Widgets**：CanvasView + BlueprintWidgetFrame + widget-pin（含示例 `widget-pin-pet-scale`）——结果可「钉」在画布上复用，这是「目的完成后留下卡片」的交互模型。
- **Cron**（CronJobsPage/CronJobFormModal）——定时目的。
- **Channels/Nodes/Instances/Sessions**（AgentsView 一族）——OpenClaw 的 IM 桥接/多设备概念。
- **Webbridge**（浏览器扩展桥）、**RemoteControl**（远程遥控）、**ApprovalPrompt + permission-flow**（高危操作审批）。
- **内部模块分发范式**：`renderer/embedpdf/manifest.json` = `{schemaVersion, version, sourceCommit, entry, files:[{path,size,sha256}]}`——内容寻址的子应用包。
- **feature flags**：`out/build-manifest.json` 的 `features.thirdPartyApps: true` 等开关控制能力组合。

## 2. ZCode 开源架构要点（references/zcode）

- 单 pnpm workspace：`apps/zcode-cli`（Agent CLI + 运行时源码）+ `packages/{desktop,web,android,ui,shared,rpc,provider,services,zcode-cua,…}`——一套 Agent 运行时，桌面/Web/移动/终端多宿主。
- **插件契约走 MCP 标准**：插件 = MCP 服务（业务工具）+ 可选 UI Plugin 页面（官方 `@modelcontextprotocol/ext-apps`，工具 `_meta.ui.resourceUri` + HTML 资源，manifest `ui.surfaces`，`app.callServerTool()` / `updateModelContext()` / `createSamplingMessage()` / `widgetState`）。Gen UI（模型即兴生成 UI）走另一协议，不与插件页混用。
- **插件商店**（`CONTEXT.md` 是术语裁决表）：官方市场 `zcode-plugins-official` = 内置插件 + CDN 插件（sha256 校验 zip，按需下载）+ 个人来源（git/URL/本地目录/inline）；目录自动刷新节流、公开/社区/个人分段、Featured 远程策展。
- **Skills**：`skills-lock.json` 锁定 GitHub 来源 + computedHash（同 zcode 本体技能机制）。
- **架构治理**：`architecture-policy.yaml` 按 module 声明 `requires`、`publicEntrypoints`、layers(domain/app/adapters)——模块边界机器可查。

## 3. 结论：共享底座轻应用平台怎么做

1. **底座只提供五类共享服务**：Agent 会话运行时（dsh）、模型网关（magpie）、Surface/工作区宿主（dogic）、OS 能力（原生模块按需 + 权限审批）、分发组合（manifest + 市场）。其余全部下沉为轻应用。
2. **轻应用 = 一个用户目的一个包**，manifest 至少四件事：`purpose`（一句话说清目的）、`tools`（MCP/技能实现）、`ui?`（可选 Surface 页）、`permissions[]`（显式授权）。不同实现同一目的 = 同 purpose 不同 tools，平台按效果展示而非按工具教学。
3. **契约不发明，复用 MCP Apps**（zcode 已验证）：工具与页面分离、widgetState 恢复、sampling 留在应用内。dogic 现有 kernel/sdk 向该形状收敛。
4. **分发双轨**：先本地目录侧载（对齐 Kimi 的 PluginLocalInstall 与 zcode 的 Personal Source），后市场（CDN + sha256 + 内容寻址 manifest，参照 embedpdf 范式与 zcode 商店）。
5. **不做什么**：不做文档平台；不照搬 OpenClaw 的 channels/nodes IM 生态；不重写 Agent 内核与 provider 池（magpie 既有结论）。
6. **落地顺序**（接 docs/sprints）：写「用户目的目录」→ M3 dsh-runtime 照旧 → 定义 PluginManifest v1 → 用 2 个同目的不同实现的示例应用验证组合（如「周报生成」：模板技能版 vs Agent+工作区版）→ 本地侧载通道 → 市场化。

## 4. 复刻原型

`prototypes/kimi-work-clone/`（2026-10-27）：按本文 Evidence 复刻的可运行「共享底座 + 轻应用」原型，映射表见其 `docs/blueprint.md`。strict TS 构建零错误，`pnpm selfcheck` 验证加载→目的匹配→权限声明→内容寻址→渲染全链路。原创实现，不含 Kimi 代码/资源/品牌。

## 5. 待办/后续可选

- rea 运行时观察：让 Kimi Work 带 `--remote-debugging-port` 启动后 `rea list-electron-targets` / `inspect-electron-page`，或用 `capture-electron-scenario` 记录 IPC 时序（本次仅静态）。
- 混淆还原：renderer 深度混淆，IPC 通道 190 个为动态表达式未解；如需精确通道契约需动态捕获。
- zcode 侧可深读：`packages/rpc`、`packages/services/src/session`（会话/任务/自动化 repo）、UI Plugin 五个示例。
