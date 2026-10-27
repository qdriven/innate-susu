# 架构总览

> 版本：v3.0 草案 · 2026-10-27。分层、核心契约、与逆向证据的映射。硬约束见 [../CONTEXT.md](../CONTEXT.md) §6。

## 1. 分层

```text
┌────────────────────────── 轻应用层（一个目的一个包） ──────────────────────────┐
│ plugins/light-apps/*        manifest v1 + tools + widget + skills + permissions │
│ 用户看到：目的入口 → 匹配 → 审批 → 画布钉卡                                        │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ PluginManifest v1 / 能力契约
┌──────────────────────────────────────┴────────────────────────────────────────┐
│ 框架层（本轮新增）                                                              │
│   innate-fe：tokens(orca 派生) + shell 布局 + Page/Panel/WidgetCard/审批 原语    │
│              + 插件 UI 宿主（v0 iframe / v1 MCP Apps）                           │
│   innate-backend：service-runtime + sidecar + ipc-contract + capabilities       │
│              （能力注册/权限/审批中介）+ storage（版本化快照）                     │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ SDK 契约 / 窄 IPC
┌──────────────────────────────────────┴────────────────────────────────────────┐
│ 底座层（五类共享服务）                                                           │
│ ① AgentRuntime 适配缝 → dsh（services/harness-runtime、packages/core）           │
│ ② 模型网关 → magpie（services/model-gateway、plugins/model-gateway）             │
│ ③ Surface/工作区宿主（apps/desktop、plugins/workspace、core/surface）            │
│ ④ OS 能力（capabilities 注册表 + 审批）   ⑤ 分发组合（加载器 + 目录客户端）        │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ spawn / stdout 契约 / HTTP(127.0.0.1)
┌──────────────────────────────────────┴────────────────────────────────────────┐
│ 外部运行时：系统 Node + dsh CLI + magpie CLI/网关 + Git + 文件系统                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

组合宿主不变：`apps/desktop`（Electron 主产品）与 `apps/shell`（Node/Web 壳）装配框架、插件与服务；双向宿主（方向 B：DSH 侧 workbench 插件）继续有效且不递归嵌入。

## 2. 核心闭环（平台存在的理由）

```text
用户输入目的（PurposeBar）
  → 目的网关按 purposeKeywords（v1：语义）匹配 PluginManifest
  → 声明了 permissions 的轻应用 → ApprovalModal（哪个应用/什么目的/要什么权限）
  → AgentRuntime.execute（v0 模板渲染；v1 dsh 会话/MCP 工具）
  → 结果 Widget 以 sandbox iframe 钉入画布（widgetState 可保存恢复）
```

用户全程不接触工具概念。同一目的的不同实现并列展示效果，用户选实现不学工具。

## 3. 逆向证据 → 架构决策映射

| 证据（rea / zcode 源码） | 决策 |
| --- | --- |
| Kimi：11 BrowserWindow + 每面独立 preload + 193 IPC | Surface 分级 + 窄通道契约（innate-backend/ipc-contract 泛化现有 `innate:*` 模式） |
| Kimi：`plugin-local-loader` + `PluginLocalInstallModal` | 分发双轨：本地侧载先行（P3），市场随后（P7） |
| Kimi：`openclaw/openclaw.json`、gateway 端口、`X-Kimi-Claw-ID` | 壳外挂运行时成立 → `AgentRuntime` 适配缝，dsh 为第一适配器 |
| Kimi：`ApprovalPrompt` + `preload-permission-flow` | 能力/权限/审批为底座服务（innate-backend/capabilities） |
| Kimi：Canvas + `BlueprintWidgetFrame` + `widget-pin` | 画布一等 Surface + WidgetCard 原语（P5） |
| Kimi：`embedpdf/manifest.json`（files[size,sha256]） | 内容寻址清单为分发与加载的完整性基础 |
| zcode：工具=MCP 服务 + 页面=MCP Apps（ext-apps） | 轻应用工具契约 v1 走 MCP，不自造 SDK；`ui.surface` 预留 |
| zcode：`architecture-policy.yaml` | P0 引入同形治理文件，模块边界机器可查 |
| 原型 selfcheck 全绿（`prototypes/kimi-work-clone`） | v0 契约与流程直接移植进底座，不重设计 |

## 4. 协议（继承 + 新增）

**继承**（定义不变，实现逐步收敛到 innate-backend）：ModelGateway 契约（`packages/sdk`）、DSH 进程协议（stdout token 契约、`--patch`、`DSH_HOME`）、magpie 协议、壳层 IPC `innate:*`、Surface 契约（`packages/core/surface`，detach 不销毁、URL 不变不 reload、快照版本化）。

**新增**：

1. **PluginManifest v1**（见 [../CONTEXT.md](../CONTEXT.md) §3）：fail closed；权限位 v0 = `filesystem.read | clipboard.write | network.fetch`，扩位需改 `innate-backend/capabilities` 注册表并补验收。
2. **审批协议**：`approvalRequest{requestId, pluginId, purpose, permissions}` → renderer 弹窗 → `approvalResolve{requestId, approved}`；60s 超时视为拒绝；回执走单向通道。
3. **Widget 协议**：底座向 iframe `postMessage({type:'replica:state', state})` 注入；卡片回存 `postMessage({type:'…:save-state', state})`；widgetState 进版本化快照，重载恢复。
4. **目的网关协议**：`runPurpose(purpose)` 返回 `{pinned[], skipped[{pluginId, reason}]}`；匹配失败/权限拒绝/工具失败都必须有显式 reason，不允许静默。

## 5. 安全模型增量

- 轻应用 **代码不进底座进程**：v0 widget 只以 sandbox iframe 渲染静态 HTML；v1 MCP 工具是独立进程，底座只转发契约。
- 权限是声明+审批双闸：manifest 未声明 → 拒绝执行；声明了 → 每次执行前审批（v1 可加「记住本次会话」粒度，需二次验收）。
- 轻应用卸载/禁用只移除自身贡献（卡片、页面、注册项），不动底座与其他应用。
- 分发完整性：加载器对清单引用文件做 sha256 校验，不符即 fail closed 并报告（原型已实现）。

## 6. 技术栈

不变项：Electron + electron-vite + React（renderer）、strict TS 全仓、pnpm 单 workspace。
新增项：`frameworks/innate-fe`（React 组件/契约库）、`frameworks/innate-backend`（纯 Node 库）。
明确不用：新 UI 框架、新状态库、ORM；Tailwind 是否引入由 P1 用 token 落地效果决策（orca 用 Tailwind `@theme`，但 token 语义先于工具选型）。
