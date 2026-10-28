# 01 项目分析

## 1. 分析口径

本分析基于两个目录的当前文件、包配置、关键源码与现有文档。`innate-labs` 的 M0–M2 能力有文档所述真实验证记录，但本次没有重新运行其全量门禁；因此“已实现”指源码中真实存在且有既有验收记录，不表示本次重新验收通过。

目标目录、根包名和 README 已统一为 `innate-desktop`；旧 `@susu/web` 验证应用已删除。后续以重新实现桌面为当前基线，不再把旧包名或旧应用当成另一个产品。

## 2. 两个仓库分别是什么

### 2.1 innate-labs：可运行的桌面实现仓

根级是单一 pnpm workspace，唯一产品工程为 `innate-dogic`。产品模块已分成应用、插件、共享包和壳无关服务：

```text
innate-labs/
├─ innate-dogic/
│  ├─ apps/desktop              Electron 主产品
│  ├─ apps/shell                Node/Web 壳
│  ├─ packages/core             DSH、模式、状态与 Surface 契约
│  ├─ packages/kernel           DI、生命周期、Workbench/Settings Host
│  ├─ packages/sdk              ModelGateway 契约与 mock
│  ├─ packages/syntax-highlighting
│  ├─ plugins/workspace         只读文件、Markdown、图片、Git
│  ├─ plugins/model-gateway     magpie CLI、探测与直连降级
│  ├─ services/model-gateway    magpie sidecar
│  ├─ services/harness-runtime  壳无关 DSH 编排
│  └─ bin/magpie.exe
├─ innate-project-canvas/       快照、审计、frontier 与 HTML 展示
└─ tools/                       打包、overlay、真实 Electron 冒烟
```

真实桌面链路已经存在：React renderer 经类型化 preload 和 `innate:*` IPC 调用 Electron main；main 启动 magpie/DSH，使用 `WebContentsView` 嵌入 Harness 与 magpie 控制台；工作区由受限服务提供只读文件和 Git 能力。

### 2.2 innate-desktop：待重新实现的产品仓

旧 `apps/susu-web` Vite/React 验证应用已废弃删除。当前没有产品应用实现，也没有 DSH、magpie、工作区、terminal、browser 或项目执行能力，需要按 Plan2 重新建立桌面实现。

目标仓已经确定且应保留的约束：

- `@innate/ui` 通过私有 registry 以源码包消费，基础组件不在本仓维护。
- Tailwind 由消费方 app 编译，扫描本仓源码与 `@innate/ui` 源码。
- 明暗通过 `.dark` class 和 ThemeProvider/ThemeSelector 控制。
- 平台 L2 组合件可以落在本仓，但 primitive 必须回到 `innate-fe` 基础仓修改。

因此目标仓不再保留旧 Web 验证页，而是在迁入源仓桌面模块后逐段接线，并在新桌面 renderer 中重新接入 UI 基座。

## 3. 当前能力对照

| 能力 | innate-labs 当前源码 | innate-desktop 当前源码 | Plan2 处置 |
| --- | --- | --- | --- |
| UI 基座 | 桌面自有 CSS，不是 `@innate/ui` | 旧验证应用已删除，UI 消费约束保留 | W1 在新桌面 renderer 接入 |
| Electron 窗口与 preload | 已有 | 无 | W0 原样迁入 |
| simple/dev | 页面注册表与 overlay 已有 | 无 | W0 恢复，W1 保持门控 |
| Harness 对话 | 桌面私有实现已接线 | 无 | W0 恢复，W2 收敛重复实现 |
| magpie 控制台与状态 | 已有 | 无 | W0 恢复，W2 统一状态与错误 |
| Surface 生命周期 | Registry 与 WebContentsView 已有 | 无 | W0 恢复，W1 泛化中栏槽 |
| 工作区 | 主进程服务与 React 插件已有 | 无 | W0 恢复，W3 改为右栏 Panel |
| terminal | 未实现 | 无 | W4 新增 |
| browser | 未实现 | 无 | W5 新增 |
| project-canvas | 独立工具已有 | 无 | W0 迁入，Q1/Q2 接入桌面 |
| 一句话生成快照 | 未实现 | 无 | Q1 新增 |
| 单任务执行 | 未实现 | 无 | Q3 新增 |
| 轻应用市场、MCP Apps | 计划或原型，不是当前桌面基线 | 计划文档 | 后置，不作为迁移门禁 |

## 4. 关键差距与冲突

### 4.1 工程身份和脚本漂移

目标目录、根包名和 README 已统一为 `innate-desktop`；旧 `@susu/web` 应用及其 dev/build 脚本已删除，`ui:sync` 改为使用当前目录。

**决策**：W0 保持统一后的工程身份，workspace 只登记真实存在或正在迁入的模块；脚本基于当前目录和自动发现 `innate-fe`，不恢复旧 Web 包。

### 4.2 两套执行计划冲突

旧 `docs/innate-dogic/sprints` 把 P0 列为下一项，源仓 `docs/plans/susu-migration.md` 则要求先走 W0–W5/Q1–Q3。若同时执行，会在桌面尚未迁入时先建框架和轻应用平台。

**决策**：本目录是本次迁移的执行计划。P 系列保留为后续平台 backlog，不作为 W0 前置；只有迁移任务写入状态板，避免双执行源。

### 4.3 目标架构文档不等于现有模块

旧文档描述了 `frameworks/innate-fe`、`frameworks/innate-backend`、light-app-host 等目标结构，但目标仓当前没有这些产品模块。Plan2 不以创建空目录表示架构完成，也不要求先抽象通用后端框架。

**决策**：先迁移有真实消费者的模块；共享抽象只在第二个消费者出现或重复行为已经验证后抽取。

### 4.4 UI 主题规则冲突

旧平台文档曾写“明暗跟随 `prefers-color-scheme`”，当前 `susu-overview` 明确要求 `.dark` class。

**决策**：以当前目标仓规则为准。源仓 Shiki 与 workspace 的明暗适配在 W3 改为消费宿主主题，不新增另一套媒体查询机制。

### 4.5 安全文档与源码存在偏差

源仓文档要求 token 不进日志，但桌面 `main/harness.ts` 会先把 DSH stdout 原行写入内存日志，`services/harness-runtime` 也会记录原始 DSH 输出；其中可能包含带 token 的启动 URL。桌面停止与壳无关服务停止的 Windows 进程树回收行为也不一致。

**决策**：W0 在拷贝前增加日志脱敏基线修复与测试；W2 收敛进程实现时验证 Windows 进程树回收。不能把已知安全问题原样带入目标仓。

## 5. 组件来源与视觉规范（review 采纳，2026-10-28）

**视觉规范执行标准**：`.agents/skills/susu-overview/STYLEGUIDE.md`（orca `docs/STYLEGUIDE.md` 原样副本）+ 技能内替换表；深文按需读 `styleguide/`（color / components / ux-rules / ux-review-rubric）。token 名角色是 `background` / `card` / `sidebar*`，明暗是 `:root` 与 `.dark`。`docs/original/innate-dogic/architecture/style-guide.md`（`--surface-base`、`prefers-color-scheme`）是过时草案，不执行；`styleguide/native-chat.md` 不执行（对话 UI 是 DSH）。

**组件来源三分法**（消除“先在本仓 L2 落地”与“先去基础仓补”的矛盾，以技能硬规则 1 与 orca“先用已有 primitive”为准）：

| 层 | 落点 | 例子 |
| --- | --- | --- |
| primitive | innate-fe `@innate/ui`。缺了去基础仓 `pnpm ui:add`，改完 `pnpm ui:sync` | Button、Tooltip、DropdownMenu、Separator、Badge、**Sidebar**、Tabs、ThemeProvider |
| 壳组合 | 本仓 desktop renderer | 顶栏怎么排、窗口拖拽、模式 pill 行为、页面注册表、右栏容器 |
| 平台五原语 | 本仓，P 系列后置，不回灌 innate-fe | PurposeBar、WidgetCard、ApprovalModal、PluginCard、PageDefinition |

注意：`@innate/ui` 已有 Sidebar，W1b 直接消费，不在 `shell/` 重写一个；`@innate/ui` 与 orca 都没有 Toolbar 原语，不为这个名字去基础仓加组件，也不在本仓自绘一套按钮（顶栏控件按规范用 Button `outline` / 图标 `ghost`，不拷 orca 的裸 class）。

**字体决策（W1a.0 拍板，开工前完成）**：orca STYLEGUIDE 规定无衬线只用 Geist；innate-fe `packages/ui/src/tokens.css` 的 `--font-sans` 当前是 Inter（2026-10-28 实测）。产品代码禁止另写 `font-family`。二选一：(a) 在 innate-fe 把正文字体改成 Geist（技能替换表当前记录的做法）；(b) 在技能替换表把「桌面例外、沿用 Inter」写成正式产品决定。默认按 (a) 执行，未拍板不开 W1a.2。

## 6. 产品架构判断

Plan2 维持以下分工，不在迁移中重新争论：

- **Innate Electron 壳是 Host**：拥有窗口、布局、文件、terminal、browser、项目看板与权限边界。
- **DSH 是可选 Agent runtime 和中栏客人**：提供 Harness 会话与工具能力，不拥有整个桌面窗口。
- **magpie 是模型控制面**：Provider、接线、路由和用量继续由它负责，不复制 orca 的 per-agent 体系。
- **project-canvas 是人侧项目事实投影**：快照与审计结果是数据源，生成的 HTML 只是展示适配器。
- **执行归工作台**：纯 terminal 任务不依赖 DSH；只有需要 Agent 工具时才调用 DSH。

中栏不是“万能插件容器”。React Panel、DSH WebContents、terminal、browser、project-canvas 是不同 provider，只共享必要的生命周期与安全描述。

## 7. 迁移策略

采用“基线复制 + 垂直切片收敛”而非 Big Bang 重写：

1. W0 保留 `innate-dogic/` 子树与包名，先把可运行行为带过来。
2. W1 拆 a/b/c 三门推进：先基座与 titlebar（W1a），再壳组合（W1b），最后多标签与降级（W1c）；只改组合与生命周期，不改模型或 DSH 协议。
3. W2（网关侧收口）、W3（工作区）分别收敛，允许并行但不得互相修改对方模块。
4. W4/W5 新增高权限 Surface，各自独立契约、权限和回收测试。
5. R1 在 W2 后收敛两套 Harness 并跑通 DSH 真实集成链，可与 Q1/Q2 并行，Q3 前必须完成。
6. Q1/Q2/Q3 在稳定工作台之上增加项目闭环，不把规划、展示、执行混为一个 Agent UI。

## 8. 主要风险

| 风险 | 影响 | 计划内控制 |
| --- | --- | --- |
| 双仓继续同时开发 | 源码漂移、重复修复 | W0 记录源 commit；此后 labs 只收关键 bugfix，前向改动只进目标仓 |
| 拷贝时顺手重构 | 无法判断回归来自迁移还是重构 | W0 禁止布局/协议调整，后续每阶段只收一类变化 |
| 私有 UI registry 不可用 | 新桌面无法安装或构建 UI 依赖 | W0 验证 `ui:sync` 与依赖解析并记录 UI 版本；W1 验证新桌面 renderer 构建 |
| 两套 Harness 行为不同 | 首次启动、profile、停止方式回归 | W2 用行为矩阵对照，达标后才删除旧路径 |
| token 泄漏 | 凭据进入日志或证据 | W0 脱敏；所有阶段证据检查 |
| PTY 原生模块与 Electron 不匹配 | 开发可跑、打包失败 | W4 先 spike，再做 UI；便携包运行是阶段门禁 |
| WebContents 权限扩大 | 任意导航、下载或敏感权限 | W5 默认拒绝，逐项显式开放 |
| 规划模型生成坏快照 | 坏依赖、幻觉任务进入正式状态 | Q1 JSON Schema + 语义 audit + 原子落盘，失败不保存 |
| 看板草稿被当成事实 | UI 与真实任务状态分叉 | Q2 草稿和正式快照分离，状态只由证据或人确认改变 |
| 多任务并发导致权限失控 | 重复执行、证据错写 | Q3 单运行调度器、runId 去重、终态后拒绝事件 |

## 9. 迁移完成的整体定义

只有同时满足以下条件，才可宣布本轮迁移完成：

- 源仓 M0–M2 行为在目标仓恢复且无安全回退。
- 新三栏壳、terminal、browser、项目快照、人侧看板和单任务执行均通过各自真实验收。
- 新桌面 renderer 已成功接入并构建 `@innate/ui`，不依赖已删除的旧 Web 应用。
- 全量 build/typecheck/test、TypeScript 源检查、overlay、真实 Electron 与便携目录冒烟全绿。
- 证据完整，旧执行文档不再与 Plan2 竞争，本轮之后的平台任务另立计划。
