# innate-dogic 平台化重启 · 全局 Context

> 版本：v3.0 草案 · 2026-10-27。回答四个问题：**做什么、底座是什么、轻应用是什么、框架是什么**。
> 硬约束全部继承自 M0–M2 已验证基线（见 §6），协议继承并新增（见 architecture/overview.md §4）。

---

## 1. 做什么

**把 `innate-dogic` 从「托管 DSH 的桌面工作台」升级为「共享底座 + 轻应用」平台：用户说目的，平台匹配轻应用，结果以卡片留在画布上。**

一句话定位变化：

```text
旧：innate-dogic = 桌面工作台，托管 DSH/Harness 与 magpie 控制台
新：innate-dogic = 共享底座（Agent 会话 / 模型网关 / Surface 宿主 / OS 能力 / 分发组合）+ 其上的轻应用生态
```

依据（详见 `docs/research/kimi-work-zcode-platform-notes.md`）：

- **Kimi Work 逆向证明**该形态成立且是消费级可用的：Electron 壳 + 外挂开源 Agent 运行时（OpenClaw 网关）+ Skills/Plugins/MCP/Widgets + 审批流 + 市场/侧载双轨。
- **ZCode 开源证明**插件契约应走 MCP 标准（工具 = MCP 服务，页面 = MCP Apps），分发走「官方市场（CDN+sha256）+ 个人来源侧载」。
- **飞书式文档平台是反面参照**：重工具学习、轻目的达成；平台按「目的」索引能力，不按「工具」教学。

## 2. 底座是什么（五类共享服务）

| # | 服务 | 承载模块（现状 → 目标） | 说明 |
| --- | --- | --- | --- |
| 1 | Agent 会话运行时 | `services/harness-runtime` + 计划中的 dsh-runtime 插件 → `AgentRuntime` 适配缝 | 壳不重写执行内核；dsh（后接 OpenClaw 可选）是第一个适配器 |
| 2 | 模型网关 | `services/model-gateway` + `plugins/model-gateway`（magpie，不变） | Provider 池/接线/用量仍归 magpie，平台不自研 |
| 3 | Surface/工作区宿主 | `apps/desktop` + `plugins/workspace` + `packages/core/surface`（不变） | 窗口级 Surface、Document、Panel 三类内容；画布成为一等 Surface（P5） |
| 4 | OS 能力 | 新增 `innate-backend/capabilities` + 权限审批 | 能力注册表 + 显式授权；v0 只做 `filesystem.read` 等三个权限位（原型已验证） |
| 5 | 分发组合 | 新增轻应用加载器 + 目录客户端 | manifest 驱动；本地侧载先行，内容寻址 zip 市场随后 |

## 3. 轻应用是什么

**一个用户目的一个包**。清单契约 `PluginManifest v1`（v0 已在 `prototypes/kimi-work-clone` 真实跑通）：

```jsonc
{
  "id": "weekly-report",
  "name": "周报整理",
  "version": "0.1.0",
  "purpose": "把本周工作整理成一份可提交的周报",   // 目的目录条目，平台按此索引
  "purposeKeywords": ["周报", "weekly"],            // v0 关键词匹配；v1 语义匹配
  "tools": { "kind": "mcp", "server": "…" },       // v0: template.render；v1: MCP 服务工具
  "ui": { "surface": "…" },                        // 可选：会话侧栏交互页（v1，对齐 MCP Apps）
  "widget": { "html": "widget.html" },             // 结果卡片，sandbox iframe + widgetState
  "skills": [{ "name": "…", "file": "…" }],
  "permissions": ["filesystem.read"],              // 执行前必须过审批中介
  "integrity": { "files": [{ "path": "…", "sha256": "…" }] }  // 内容寻址，分发校验
}
```

**同一目的、不同实现**是平台的一等公民：同 `purpose` 不同 `tools` 的包并列展示效果，由用户选实现，而不是学工具。
明确不做：文档协作平台；OpenClaw 的 channels/nodes IM 生态照搬；自研 Agent 内核或 Provider 池。

## 4. 框架是什么（本轮新增的两个开发框架）

### `frameworks/innate-fe`（包名 `innate-fe`）—— 前端框架

产品所有 renderer UI 的唯一基座：**React + orca 派生设计 token + 壳布局原语 + 插件 UI 宿主**。

- `tokens/`：CSS 变量唯一来源（surface/foreground 成对、sidebar 家族独立、颜色只给状态），明暗跟随 `prefers-color-scheme`；规范见 [architecture/style-guide.md](./architecture/style-guide.md)。
- `shell/`：`TitlebarStrip`（品牌 + 状态 pill）、`Sidebar`（导航 + 底部状态）、`ContentArea`——壳只做组合，页面可摘除。
- `ui/`：`PageDefinition` / `PanelDefinition` / `WidgetCard` / `ApprovalModal` / `PurposeBar` 原语，v0 以原型已验证形态为基线。
- `host/`：插件 UI 宿主——v0 sandbox iframe + widgetState postMessage（原型已验证），v1 升级 MCP Apps（`@modelcontextprotocol/ext-apps`，对齐 zcode UI Plugin）。
- 依赖：React、`@dogic/syntax-highlighting`（高亮保持独立包）。**不含**业务页面（在 plugins）、**不含** IPC 调用（走 contracts）。

### `frameworks/innate-backend`（包名 `innate-backend`）—— 后端框架

壳无关后端运行时的统一设施，**不依赖 Electron/React**（继承 services 规则）：

- `service-runtime/`：`defineService` + 生命周期 + healthcheck + 优雅停止（泛化 `services/harness-runtime` 的 `bootBackend` 模式）。
- `sidecar/`：外部进程托管——spawn、stdout 契约捕获（`dsh web: <url?token>` 模式）、Windows 进程树回收（`taskkill /T`）、崩溃重启；承载 magpie/dsh。
- `ipc-contract/`：通道表 + 类型双向锁定的 preload bridge（泛化现有 `innate:*` 窄通道模式，preload `satisfies`）。
- `capabilities/`：能力注册表 + 权限存储 + 审批中介（requestId、超时视为拒绝；从原型移植）。
- `storage/`：版本化 JSON 快照安全读写（Surface 快照、widgetState）。

## 5. 与旧主线的关系

| 旧主线 | 处置 |
| --- | --- |
| M0–M2（已验证：DSH 对话内嵌、magpie 控制台、simple/dev、工作区、Surface 快照、便携冒烟） | 全部保留为基线，行为不回退是每个 P 里程碑的验收前提 |
| S0 工程基线 | 并入 P0 |
| S1 = M3 DSH Runtime 插件化 | 被 P6 吸收（desktop 只经 dsh-runtime 插件启动 Harness，两套托管合一） |
| M4 DSH 侧 workbench 插件 / M5 双向设置（方向 B） | 保留，排在 P6 之后执行，编号不变 |
| M6 Surface 双向化 | 画布部分被 P5 提前；terminal/browser 仍按需排期 |
| M7 分发 | 被 P7 扩展（桌面分发 + 轻应用分发） |
| S5 mini-gateway 决策门 / S6 代码健康 | 原样保留，决策门不触发不排期 |

## 6. 硬约束（继承，不重开讨论）

1. 产品代码、后端、网站、工具全部 strict TypeScript；`references/` 只读不入库、不被产品导入；`prototypes/` 不在 workspace 内、不进门禁。
2. DSH 用真实系统 Node 启动（清除 `ELECTRON_RUN_AS_NODE`）；全新 `DSH_HOME` 先裸 boot 再 magpie 接线。
3. magpie 控制台/网关、dsh web、一切本地服务只绑 `127.0.0.1`；认证 URL/token/key 不进日志、快照、夹具。
4. 文件与 Git 默认只读、参数数组禁 shell 拼接；terminal 是独立高权限能力；renderer 无任意 Node/shell。
5. Electron：`contextIsolation: true`、`nodeIntegration: false`、`WebContentsView sandbox: true`。
6. 轻应用 fail closed：清单非法或权限拒绝只禁用自身，不破坏底座与其他应用。
7. 测试基线只增不减（当前 83 项，2026-10-26）；真实二进制测试只读、隔离 `DSH_HOME`/userData。

## 7. 更新义务

架构、模块、契约变化时同步本树；每个 P 里程碑完成回写：证据入 `docs/innate-dogic/evidence/<里程碑>/`、状态板更新、涉及文档同步。
