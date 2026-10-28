# 02 · 模块分析

> 版本：v1.0 · 2026-10-28。回答三个问题：迁移对象里每个模块长什么样、质量如何、迁过来之后怎么处置。
> 规模数据为 2026-10-28 对 `innate-labs/innate-dogic` 的实测（wc -l 统计 src 下 .ts/.tsx）。

## 1. 总览

| 包名 | 类型 | 职责 | 行数 | 测试（文件/用例） | workspace 依赖 | plan1 处置 |
| --- | --- | --- | --- | --- | --- | --- |
| `@dogic/desktop` | app | Electron 桌面宿主：拉起 dsh web + magpie 集成 | 1539 | 0 / 0 | core, kernel, plugin-workspace | **迁，W1 起的改造主体** |
| `@dogic/shell` | app | HTTP workbench 宿主（垂直切片遗产） | 196 | 0 / 0 | kernel, sdk, plugin-model-gateway | **不迁**（W 系列无消费方） |
| `@dogic/core` | package | 网关/dsh/mode/verify/Surface 共享逻辑 | 852 | 3 / 16 | 无 | **迁** |
| `@dogic/kernel` | package | DI 容器/插件生命周期/插槽/注册表 | 1152 | 4 / 28 | sdk | **迁**（W1 中栏槽依赖） |
| `@dogic/sdk` | package | ModelGateway 契约 + mock + 契约测试 | 360 | 1 / 9 | 无 | **迁** |
| `@dogic/syntax-highlighting` | package | Shiki 高亮（Light+/Dark+ 安全 HTML） | 125 | 1 / 3 | 无（外部 shiki） | **迁** |
| `@dogic/plugin-model-gateway` | plugin | magpie 探测/托管/CLI 封装/直连降级 | 1194 | 2 / 22 | kernel, sdk | **迁**（W2 收口对象） |
| `@dogic/plugin-workspace` | plugin | 只读 fs/git 服务 + 文件树/预览/Git UI | 874 | 1 / 5 | core, kernel, syntax-highlighting | **迁**（W3 Panel 化对象） |
| `@dogic/harness-runtime` | service | dsh Harness Node 托管运行时 | 223 | 0 / 0 | service-model-gateway | **迁**（当前 desktop 未接线，先原样带过） |
| `@dogic/service-model-gateway` | service | magpie sidecar：托管/健康/重启/接线 | 116 | 0 / 0 | 无 | **迁**（harness-runtime 的依赖） |
| `tools/*`（5 个） | 工具 | 门禁/冒烟/overlay 校验/便携打包/一键启动 | — | — | — | **迁 + 适配新根**（W0.4） |
| `innate-project-canvas` | 工具包 | 快照/漂移审计/看板（约 1534 行） | 1534 | 1 / 4 | 无 | **迁**（Q1–Q3 依赖） |
| `bin/magpie.exe` | 二进制 | 统一开发/集成 magpie（45MB） | — | — | — | **随树迁** |
| prototypes/kimi-work-clone | 原型 | 轻应用闭环 v0 | — | — | — | 不迁；P 系列重启时的移植来源 |

合计约 6.6k 行产品 TS + 1.5k 行 project-canvas；**12 个测试文件 83 用例全部在 packages/plugins 层，apps 与 services 层零测试**——这是已知质量缺口（见 §4）。

## 2. 重点模块细读

### 2.1 `@dogic/desktop`（迁移与改造主体）

```text
src/main/
├── index.ts          63 行  Electron 入口：单实例锁、禁 CalculateNativeWinOcclusion（修 Win 黑屏）、
│                           隐藏标题栏窗口（contextIsolation、preload）、registerIpc、退出回收
├── harness.ts       214 行  HarnessRuntime：系统真实 Node spawn `dsh web`、stdout 解析 url?token、
│                           就绪探针（fetch<500 即就绪，401 也算）、60s 超时、日志落盘、taskkill /T、
│                           simple 模式注入 --patch overlay；刻意不隔离 DSH_HOME（继承 ~/.dsh 让 magpie 接线生效）
├── launcher.ts      163 行  magpie 进程管理：startMagpie（desktop/serve 两形态）、disconnectDsh 原子恢复、
│                           resolveMagpieBin 四级探测、consoleKey 每安装稳定 web key、ensureMagpieConsole 独立端口
├── surface-host.ts   76 行  SurfaceHost：SurfaceRegistry → WebContentsView 适配（show/hide/setBounds/dispose，
│                           sandboxed view、外链 shell.openExternal、同一时刻只 attach 一个 view）
└── ipc.ts           149 行  全部 innate:* 通道：status/窗口控制/mode/models/checks/magpie 控制台/harness/
                            workspace（走 plugin-workspace 的 WorkspaceService）/revealDshHome/disconnectDsh
src/preload/index.ts  64 行  contextBridge 暴露 window.innate，类型 satisfies WorkspaceApi
src/renderer/src/     10 文件  pages.ts（页面注册表=门控点）、plugin-registry.ts（kernel/browser 容器装配
                              workspaceUiPlugin）、App.tsx（367 行壳层+overview/Models/Tools 内联）、
                              ModeGate/Titlebar/SimpleHome/HarnessPage/ConsolePage/api.ts
```

判断：
- **main 进程五件套职责清楚、可整树迁**；W1 动 renderer，W2 动 launcher 的状态外露，W4 加 terminal（main 新模块），W5 加 browser——main 的改动是「加模块 + ipc 注册」，不动 harness/launcher 内核。
- `surface-host.ts`（76 行）是 W1.3 多标签槽的改造点：当前「同一时刻只 attach 一个 view」要扩成「多 view 注册 + detach 不销毁 + attach 切换」，会话存活依赖「URL 不变不 reload」语义（M2 已验证）。
- `harness.ts` 是**最关键的未测文件**（214 行，0 测试，承担进程/令牌/超时/回收全部风险）。W0 原样迁；W4 前补关键路径单测（stdout 解析、超时、taskkill 调用）作为测试基线增量。

### 2.2 `@dogic/kernel`（W1 中栏槽的地基）

DI 容器（借鉴 Cordis：懒加载 + 循环依赖检测）、插件 apply/dispose 链、客户端模块加载器（`__ModuleLoader__.load` + require 白名单）、workbench 面板插槽、设置页插槽、插件注册表（开关唯一权威文件）。`/browser` 入口可在 renderer 用（不含 Node fs 的 Registry）。测试最厚（28 用例）。

判断：W1 的「中栏 = Surface 槽」直接复用 workbench 插槽 + SurfaceRegistry 模型；**不需要为 W 系列扩 kernel**，最多加「多标签状态」的 UI 侧状态（属 shell，不属 kernel）。

### 2.3 `@dogic/plugin-model-gateway`（W2 的收口对象）

magpie binary 探测（PATH/常见路径/注册表 + 版本校验）、spawn magpie serve（随宿主退出回收 + 崩溃指数退避）、`MagpieCli` 类型化封装（输出解析集中地）、`MagpieModelGateway` 实现 + `DirectModelGateway` 直连降级（T-051 验收）。22 用例含降级负路径。

判断：能力齐全，**W2 只做「状态外露」**——把已有探测/健康结果经 ipc 推给壳状态 pill，不改网关内核。orca 的 per-agent 账号体系明确不复制（模型配置归 magpie）。

### 2.4 `@dogic/plugin-workspace`（W3 的 Panel 化对象）

三端结构：`main`（WorkspaceService：只读 fs + 只读 git，参数数组、不暴露任意命令）、`shared`（preload 唯一宿主契约 `WorkspaceApi`）、`plugin.ts`（UI 贡献，DI 注入受限 API，插件不接触 Electron）、`renderer/`（WorkspacePage/FileTree/FilePreview/GitPanel）。

判断：W3 把「一页」变「常驻右栏 Panel」——renderer 层重排（页面注册表 → 壳右栏插槽），main/shared 不动。写入能力**不开**（等 Q3 capabilities 审批再议）。

### 2.5 `@dogic/harness-runtime` + `@dogic/service-model-gateway`（两个 service）

`harness-runtime`（223 行）是壳无关的 dsh 托管（profile 初始化/URL 捕获/就绪检查 + backend-cli），但**当前 desktop 用的是自己的 `main/harness.ts`，两套实现并存**。`service-model-gateway`（116 行）是前者唯一依赖。

判断：W 系列不收敛它们（避免边搬边重构），原样迁、保持现状；收敛（desktop 弃私有 harness.ts）是 P 系列回归后的清理项。

### 2.6 `innate-project-canvas`（Q1–Q3 的引擎）

src 13 个文件（cli/derive/drift/markdown/modules/snapshot/validate/workbench/render-sidebar/dev-server），约 1534 行。能力：项目快照 schema（`schema/project-snapshot.schema.json`）、audit（证据门控 + 坏依赖拦截）、sync（审计通过才写出）、diff（语义漂移对比）、看板 HTML 生成。另有 ZCode 插件包装（留在 labs）。

判断：Q1 复用其 **schema + validate + audit**；Q2 复用其 **看板 HTML 生成器**（产物自包含 HTML，以 Surface 加载，不在壳里重写渲染）；Q3 复用 **derive**（取一条可执行 task）。产品集成方式：workspace 内 import（它已是 pnpm 包），不 spawn CLI。

## 3. UI 层对照：现状 vs `@innate/ui`

| 维度 | desktop renderer 现状 | @innate/ui（innate-fe 0.1.1） | W1 动作 |
| --- | --- | --- | --- |
| token | 自写 CSS 变量（明暗两套，机制与 orca 不同源） | `tokens.css` 唯一事实源，shadcn 语义 token（`--background`/`--card`/`--sidebar-*`…） | renderer 接 `@innate/ui/tokens.css`，自写 token 退役 |
| 明暗 | 组件内主题机制 | `.dark` class + `@custom-variant dark`（susu-overview 硬规则 4） | 统一到 `.dark`；**style-guide v3.0 里「跟随 prefers-color-scheme」的旧说法以此为准修订** |
| 样式 | 无 Tailwind（手写 CSS） | Tailwind v4（消费方持有插件与入口） | 照搬 susu-web 已验证模式（@tailwindcss/vite + @source 两条） |
| 原语 | 手写 Titlebar/ModeGate/SimpleHome 等 | Button/Card/Popover/Sheet/Dialog 等 shadcn 系 | 三段壳（TitlebarStrip/Sidebar/ContentArea）作为 L2 组合件落 `apps/desktop/src/renderer/shell/`，内部只消费 `@innate/ui` |
| 缺口 | — | 布局三段、状态 pill 等「壳原语」不在基础仓 | 先在本仓 L2 落地；若多处复用再按纪律上提基础仓 |

## 4. 质量与风险缺口

| 缺口 | 现状 | plan1 补法 |
| --- | --- | --- |
| apps/services 零测试 | 83 用例全在 packages/plugins | W0 后基线只增不减；W4.1 给 harness.ts 关键路径补单测；各段负路径测试随任务卡走 |
| `harness.ts` 无测试且是进程风险集中点 | 214 行 | 同上（W4 前完成，作为 W4 的前置小任务） |
| `check-typescript.ts` 硬编码扫描 `innate-dogic/sites/tools` | 本仓无 sites，且新根还有 apps/packages | W0.4：扫描根调整为 `innate-dogic/tools/apps/packages` 并容忍缺失目录；susu-web 纳入 TS-only 约束 |
| smoke:desktop 依赖真实环境 | electron 二进制、本机 dsh/~/.dsh、magpie.exe | W0.4 逐项核对（`electron/install.js`、magpie.exe 随树迁、dsh 本机已有） |
| 中栏多标签是行为增量 | 当前单 view attach | W1.3 以「detach 不销毁、URL 不变不 reload」为验收红线，CDP 断言 |
| terminal / browser / 规划入口不存在 | — | W4/W5/Q1 新建；terminal 是首个高权限能力，审批与白名单独立任务卡（W4.3） |

## 5. 每模块「迁移动作」速查

| 模块 | 动作 | 触发段 |
| --- | --- | --- |
| desktop main 五件套 | 原样迁 → 加 terminal/browser 模块 → ipc 通道表扩容 | W0 → W4/W5 |
| desktop renderer | 原样迁 → Tailwind+token 接入 → 三段壳收口 → 页面注册表不变 | W0 → W1 |
| surface-host.ts | 单 view → 多标签槽（detach 不销毁） | W1.3 |
| launcher.ts | 原样迁 → 状态外露给壳 pill | W0 → W2 |
| plugin-model-gateway | 原样迁 → 只加健康事件，不动内核 | W0 → W2 |
| plugin-workspace | 原样迁 → renderer Panel 化 + root 状态提升 + 布局快照 | W0 → W3 |
| harness.ts / harness-runtime | 原样迁，两套并存；补 harness.ts 单测；收敛后置 | W0 / W4 前 |
| kernel / core / sdk / syntax-highlighting | 原样迁，不动 | W0 |
| tools | 迁 + 扫描根适配 + 门禁接入 | W0.4 |
| innate-project-canvas | 迁 → Q1 validate/audit → Q2 看板 → Q3 derive | W0 → Q1–Q3 |
| @dogic/shell | **不迁**（无消费方；留在 labs 冻结树里） | — |
| prototypes / references / plugins(ZCode) / sites | 不迁 | — |
