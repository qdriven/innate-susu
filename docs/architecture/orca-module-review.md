# orca 模块与组件化分析 → Innate 完全插件化的取舍

日期：2026-10-26 · 分析对象：`references/orca`（stablyai/orca，并行 Agent IDE，Electron + electron-vite）
目的：为长周期项目确定「哪些模块借鉴、哪些替换、哪些不做」，配合 M1 落地。

## 1. orca 的组件化骨架（值得借鉴的四件事）

| 模块 | 位置 | 做法 | 评价 |
| --- | --- | --- | --- |
| 设计系统 | `src/renderer/src/assets/main.css` + `docs/STYLEGUIDE.md` | token 唯一来源（surface/foreground 成对、sidebar 家族、git 装饰色），shadcn 原语，lint 强制 | ✅ 直接借鉴。单色安静铬面、颜色只给状态；字阶 10/11/12/13px |
| 壳层组合 | `src/renderer/src/app-shell/` | AppWorkspaceShell + AppRootSurfaces + 每个关注点一个 hook（use-app-chrome-layout 等） | ✅ 借鉴「壳只做组合」的思想；不照搬其几十个 hook 的复杂度 |
| 域适配器 | `src/main/{claude,codex,amp,copilot,…}` | 每个 Agent 一个目录，launch/auth/usage 各自实现 | ⚠️ 结构清晰但 N×N 重复——这正是它的弱点（见第 2 节） |
| 进程与协议 | `src/packages/process-host`、RPC params catalog、ACP | 进程隔离 + 协议契约生成/校验 | 🔌 按产品需要拆为独立模块；需要进程隔离或协议互操作时迁移，不与壳强耦合 |

## 2. 关键判断：orca 的多 Agent 配置不如 magpie

orca 为每个 Agent 手写一套账号/启动/用量模块（claude-accounts、codex-accounts、agent-trust-presets、
agent-cli-version-probe…）。问题：

- **N 个 Agent × M 个关注点 = N×M 份适配代码**，新 Agent 接入成本高；
- 模型配置散落在各 Agent 自己的设置里，没有统一的「一处配置、处处生效」；
- 没有跨 Agent 的协议互译、故障转移、用量归账。

magpie 的模型恰好相反：**统一 Provider 池 + 统一 Agents 接线（写各 Agent 原生配置）+
四协议互译 + 路由/故障转移 + 用量归账**。因此：

> **Innate 不复制 orca 的 per-agent 适配层。多 Agent 模型配置整体交给 magpie 承担**
> （M1 内嵌控制台已实现，M5 双向设置 收敛配置面）。我们只为 magpie 不覆盖的能力写插件。

## 3. 模块取舍总表

| orca 模块 | 处置 | 落到 Innate 的位置 |
| --- | --- | --- |
| 设计 token + 字阶 | **采纳**（M1 已落地） | `innate-dogic/apps/desktop/src/renderer/src/styles.css` |
| titlebar + sidebar 壳布局 | **采纳**（M1 已落地） | `App.tsx`（titlebar / sidebar / content） |
| 多 Agent 配置/账号体系 | **替换为 magpie** | M1 内嵌控制台 + `@dogic/plugin-model-gateway` + M5 双向设置 |
| Agent 启动/运行时托管 | **替换为 dsh 专用托管** | `apps/desktop/src/main/harness.ts`、`@dogic/harness-runtime` |
| 工作区文件树 / Markdown / 只读 Git | **采纳为壳层共享插件**，不绑定某个 Agent | `@dogic/plugin-workspace`（已实现） |
| 代码高亮与语言识别 | **迁移为独立共享模块** | `@dogic/syntax-highlighting`（已实现）；供工作区、Markdown 代码块与后续 diff 复用 |
| terminal / browser / 画布 / Agentic UI | **按 Surface provider 独立实现和组合** | 统一生命周期设计已记录；这些 Surface 尚未实现 |
| Harness 自带终端/文件/浏览器 | **继续保留在 Harness 内**，与壳层工作区能力并存 | 不为统一而强拆 Harness 内部 UI |
| skills / automations | **由 dsh 插件机制承载** | 未来 `innate-dogic/plugins/` |
| SSH / worktree / PR / process-host / ACP / RPC catalog | **按产品需要迁移为独立模块** | 明确 SDK、进程和 UI 边界后分别实现、测试与分包，不硬编码进壳 |
| lint 工程（ratchet 系列） | **按质量门禁需要逐项引入** | 当前保留 vitest + typecheck + 设计 token 约定；新增规则作为独立工具模块组合 |

## 4. 完全插件化的目标架构

三层插件点，与既有 `@dogic/kernel`（DI/生命周期/注册表）对齐：

```
┌─ UI 页面 / Surface / Panel 插件（renderer）─────────────┐
│ 贡献：页面、中央 Surface、辅助 Panel、设置分区            │
│ 现状：WorkspacePanel 经 DI 注册；Harness 为首个内嵌 Surface │
│ 现状：共享 SurfaceRegistry；文档与 WebContents 分进程持有   │
│ 演进：terminal/browser 等新 provider 复用同一描述与生命周期  │
├─ 壳服务插件（main / Node）─────────────────────────────┤
│ 贡献：受限 IPC 服务 + sidecar 托管 + 配置 facade          │
│ 现状：@dogic/plugin-model-gateway / plugin-workspace     │
│      @dogic/service-model-gateway / harness-runtime      │
├─ DSH 插件（Harness 内）────────────────────────────────┤
│ 贡献：InnateUI toolbar / panels / settings               │
│ 主线：M4 工作区、M5 模型设置；只贡献叶子能力              │
└───────────────────────────────────────────────────────┘
```

原则：
1. **每个插件可整体移除而不拖垮壳**——Surface deactivate 与 close 必须区分。
2. **能交给 magpie / DSH 的绝不自写**（多 Agent 配置、协议翻译与 Agent 执行内核）。
3. **双向宿主都是主线**——dogic 托管 DSH，DSH 也可加载 Innate 工作区与设置；禁止递归加载完整桌面。
4. **功能一致优先于强制代码复用**——纯 UI/类型可共享，薄实现可按宿主重写；权限与核心验收必须一致。
5. **插件间只经窄契约通信**——ModelGateway 契约已有 mock + 契约测试；WorkspaceApi 为受限只读契约。
6. **持续项目按模块演进**——Orca 通用模块可独立迁移、组合和分包，避免的是硬耦合而非完整能力。
7. UI 字阶/颜色只能取 token（orca 的设计系统纪律，轻量执行）。

统一 Surface、Document、Panel 的边界与后续计划见 `docs/architecture/workbench-surfaces.md`；
可执行里程碑见 `docs/plans/innate-dogic-dsh/`。

## 5. 对 M 系列的回写

- M1：控制台页按「可摘除页面」实现；布局与字阶采用 orca 规范。
- M2：模式门控作用于页面注册表；Harness 与 dogic 工作区垂直切片已落地。
- M3：DSH Runtime 属于可移除集成插件，service 只保留一套进程托管。
- M4：DSH 侧工作区属于 DSH 插件层；宿主无关 UI 按实际收益复用。
- M5：facade 属于壳服务层，设置能力同时进入 dogic 与 DSH。
- M6–M7：terminal 等 Surface 按场景双向化，mini-gateway 仅为独立可选服务替换。
- 当前：Harness、magpie 控制台与工作区文档已使用共享 `SurfaceRegistry`；工作区安全快照可跨重载恢复。
