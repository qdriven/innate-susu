# 研究笔记：cindy × multica 调研 —— gen UI 范式、可借鉴功能与 dsh 结合路径

> 日期：2026-10-29。来源：[innate-susu#4「cindy 调研」](https://github.com/qdriven/innate-susu/issues/4)。
> 方法：`reference/cindy`（qdriven/cindy，上游 makecindy/cindy，shallow clone）与 `reference/multica`（multica-ai/multica，shallow clone）源码勘察。两目录已入 `.gitignore`（本次补上；总计划硬约束 §6.1「references 只读不入库」），只读分析、不改上游代码。
> 关联：[orca-module-review](../architecture/orca-module-review.md)（orca 取舍已定，本文只补增量）、[04-platform-gap-review](../../susu/plan/04-platform-gap-review.md)（协议就绪度与 handler registry）、[kimi-work-zcode-platform-notes](kimi-work-zcode-platform-notes.md)（前一 respondent，结论互证）。

## 0. 结论速览

1. **gen UI 三条已验证通道**：cindy 用「模型生成声明式组件流（cindy-ui）+ MCP Apps 交互视图 + CSP 断网 HTML 预览」三层；multica 用「第三方插件 iframe Surface（MessagePort 桥）+ 结构化任务 transcript/deliverable」。两家的共同安全内核一致：**沙箱 + 桥内无凭证 + 宿主代执行 + 主题 token 下推**。
2. **multica 已经原生支持 dsh**（`server/pkg/agent/dsh.go`：`dsh --profile multica --stdio`，版本化 JSONL 协议 v1，`MULTICA_DSH_PATH/MODEL`，读 `AGENTS.md` 与 `.dsh/skills/`）——这是「dsh 作为一个 handler 被宿主接线」的最直接现存参照，与 04 文档 handler registry 模型完全同构。
3. **两项目均为「连接而非重造智能」**（cindy 核心产品原则 §3；multica daemon 只翻译事件不碰 agent loop），印证 innate 既有判断：dsh 是适配缝上的第一个适配器，平台不自研执行内核、不做 Provider 层。
4. 值得吸收进主线的高价值增量：W1c 标签可参照 **multica tab-store（URL 会话 + scroll/view memento + 单 router 投影）** 与 **cindy 布局树不变量（panelKind 身份 + chat-main 唯一）**；W2 可参照 **multica daemon 生命周期（健康探测/恢复/看门狗/GC）**；Q 系列的 widget/通信协议 v0 可直接对照 **cindy-ui 协议形状** 与 **multica surface-bridge** 设计。

---

## 1. 两项目是什么

| | cindy | multica |
| --- | --- | --- |
| 定位 | 开源、开箱即用的个人 AI Agent（桌面+手机，多设备互联，「伴侣」化） | 人与 Agent 协作的任务管理平台（issue board + 本地 agent daemon，可自托管） |
| 形态 | Electron desktop + Expo mobile + headless；服务端独立闭源仓 | Go server + Next.js web + Electron desktop + Expo mobile |
| Agent 接入 | harness 三家：Claude Code（claude-agent-sdk）、Codex（app-server 协议）、Pi；`BaseAgent` 统一抽象 | daemon 自动探测 26 种 CLI（claude/codex/…/ACP 家族/`dsh`），注册为 runtime |
| 仓库规模 | 单仓 monorepo（apps/desktop + apps/mobile + ~40 packages），AGENTS.md 分层规则体系 | server(Go) + packages/{core,ui,views,plugin-sdk} + apps/{web,desktop,mobile,docs} |
| 与 innate 的关系 | gen UI、多设备、自动化、技能市场的存在性证明 | issue→run→transcript 闭环、daemon 工程、插件 Surface 的存在性证明 |

---

## 2. gen ui 实现方式和范式

### 2.1 cindy：三条渲染通道（模型产出 → 安全呈现）

**通道一：cindy-ui 声明式组件流（模型直接生成 UI，核心创新）**
`packages/maker-shared/src/richAnswer.ts` + `richAnswerGuide.ts` + 渲染 `apps/desktop/src/renderer/components/chat/RichAnswer.tsx`：

- 模型在 Markdown 里写 ` ```cindy-ui ` 围栏块，**每行一个 JSON 操作**：`{"version":1,"seq":1,"op":"create","id":"cost","kind":"stat","props":{...}}`，支持 `op: create/patch`。
- 26 种 `kind`：text/markdown/heading/stack/row/grid/image/audio/video/code/math/diagram/**stat/chart/svg**/range/input/check/select/**button/form**/details/tabs。容器类 kind 的 children 是独立 create 操作。
- **流式优先**：`RichAnswerStream` 按行增量解析，append-only 时 `offset` 前进不重建；中断保留已提交节点，未完成行等待；快照修正才整体重建。`splitRichAnswer` 只切显式 `cindy-ui` 围栏，不误伤正文里的示例。
- **无代码求值**：表达式只有 `{ref:"stateKey"}` 与 `{op:"mul"|"if"|"concat"|…, args:[...]}` 两种（响应式联动、跨节点引用、前向引用），明确"No JavaScript evaluation"。上限 128KB/2048 节点/深度 32；未知或畸形操作渲染本地可读 fallback，绝不执行。
- **交互回流=发消息**：button/form 的 `send` 把用户可见文本拼成一条**普通消息**发回会话（`{"op":"concat","args":["Plan a ",{"ref":"days"},…]}`）——不直接执行工具、不直接触发 agent run。控件的本地视态经 `RichInteractionMemory` 持久化。
- **主题归属宿主**：组件只能给语义色角色（primary/secondary/success/…），Cindy 用 `var(--text-primary)` 等 token 出全部颜色，明暗自动跟随；布局约束写进模型指南（320px 可读、无横向滚动）。
- **投递协议**：`ANSWER_DELIVERY_PROMPT` 作为宿主侧附加 system prompt 注入 harness（"Host addition only: native CLI instructions and execution remain unchanged"）——**gen ui 能力是宿主加的一段提示词，不改 agent 内核**。旧客户端/外部渠道自然降级为显示围栏原文。

**通道二：MCP Apps（工具侧交互视图）**
`apps/desktop/src/main/mcp-apps/`（host.ts/connection.ts/sandboxProtocol.ts/remoteViews.ts 等）+ `renderer/components/chat/McpAppCard.tsx`：

- 用 `@modelcontextprotocol/ext-apps` 的 `AppBridge`——**与 04 文档钦定的 v1 演进目标（"zcode UI Plugin 同款"）同一协议**，cindy 是该路线的已上产参照。
- 渲染在 `cindy-mcp-app://` 自定义 scheme 的 iframe 沙箱文档里：CSP 由宿主生成（`connect-src` 从声明的域名白名单推导），字节预算（`MCP_APPS_MAX_BYTES`）与 256 事件上限的背压（`MCP_APP_BACKPRESSURE`）都由宿主强制。
- 宿主上下文注入 `hostContext()`：theme(dark/light)、locale、timeZone、platform、deviceCapabilities(touch/hover)、containerDimensions、**styles.variables（把宿主 `--surface` 等映射为 `--color-background-primary` 等语义名）**——与 multica 的 theme push 同一思想。
- 工具调用过 `authorizeTool()` 审批；remote（手机端）经 `remoteViews.ts` 的 zod 校验文档 schema 投影到被控端渲染；shared-task peer 只读降级为 fallback 文本。

**通道三：HTML 文件预览（agent 产出的不可信文档）**
`packages/maker-shared/src/htmlPreviewCsp.ts`：保留 JS 的预览文档用 **meta CSP 关掉全部出网口**（子资源/fetch/表单/iframe），因为 Electron 的 `onShouldStartLoadWithRequest` 只管导航、管不住 `new Image().src` 外传；顶层导航只放行 `about:`；注释里诚实标注 **WebRTC ICE 是 CSP 管不到的残留信道**（"不要把本模块说成零出网"）。这种「残留信道写明在注释里」的纪律值得 innate 安全约束直接继承。

### 2.2 multica：插件 Surface + 结构化交付

- **第三方插件 Surface**（`packages/plugin-sdk/` + `packages/views/plugins/`）：一个脚本装进 `sandbox="allow-scripts"`（无 allow-same-origin，origin 为 null）的 iframe。身份靠 **MessagePort 绑定 + 单次性 launch challenge + 期望外框** 三件套，不靠 origin。协议 v2：请求（action REST 路径白名单 `ALLOWED_PATHS`、`ui.resize`）、响应（HTTP 语义 status）、事件（theme token 下推）。**插件持零凭证**：surface 发请求 → 宿主在**当前登录用户自己的会话**上代执行 → 结果回传，权限=min(管理员授予的 scopes, 该用户本来能做的)。发布版本不可变，安装绑定版本。
- **任务 transcript**（`packages/views/common/task-transcript/`）：trace 事件流 → `trace-event-presenter` → build steps/timeline/outcome；`transcript-follow` 做跟随滚动。agent 的过程不是一坨日志而是结构化可回放时间线。
- **deliverable**（`packages/views/issues/components/deliverables/`）：run 的产物是带 kind/缩略图/**版本**的一等实体（"Use the daemon's deliverable, never guess a final answer from progress text"——comment-runs.ts 注释），与本仓「证据链」「HTML 永不成为事实源」同纪律。
- multica **没有**模型生成 UI 组件这层；它的「UI 生成」全部来自插件（人写的）与结构化呈现（宿主写的）。

### 2.3 范式归纳

| 维度 | cindy-ui | MCP Apps（cindy 实现） | multica 插件 Surface | innate 04 文档对应物 |
| --- | --- | --- | --- | --- |
| UI 来源 | 模型每轮生成 | MCP 工具服务方 | 第三方插件作者 | 轻应用 widget/toolbar |
| 载体 | 聊天内联原生组件（无 iframe） | 宿主 scheme iframe + CSP | sandbox iframe（opaque origin） | sandbox iframe（PluginManifest widget） |
| 通道 | 文本流内围栏块（行级 JSON op） | JSONRPC over ViewTransport | MessagePort postMessage 协议 v2 | widgetState 版本化 + 双向窄消息 |
| 身份/安全 | 无代码求值 + 尺寸/深度上限 + fallback | CSP 域白名单 + 字节预算 + 审批钩子 | 端口绑定 + launch challenge + 路径白名单 + 用户会话代执行 | 审批中介 + fail closed |
| 主题 | 只许语义色角色，宿主 token 出色 | hostContext.styles.variables | theme 事件下推 token | 主题/token 注入（Q2） |
| 交互回流 | 拼成普通消息 | 过审批的工具调用 | 白名单 REST（宿主代执行） | 动作请求→宿主→审批→执行 |

**范式结论**：三种「UI 从哪来」（模型生成 / 工具应用 / 第三方插件）在两家都以「宿主出壳、来源出内容、桥上无凭证、动作必过宿主」为共同内核。innate 的 handler registry + 通信协议 v0→v1(MCP Apps) 路线与业界实现一致，无需改向；**cindy 证明 MCP Apps 这条 v1 路线可上产，且证明「模型生成 UI」可以作为 v0 之前的一层先行（只花一段 system prompt + 一个前端渲染器）**。

---

## 3. 两项目值得考虑的功能

### 3.1 cindy（按 innate 语境折算）

| 功能 | 证据 | 对 innate 的意义 |
| --- | --- | --- |
| 布局树不变量 | `docs/dev-rules/architecture-invariants.md`、`apps/desktop/src/shared/layoutTree.ts`：全局递归 split/pane 树；**面板身份只认 panelKind，禁止拿「左栏/右栏」位置当业务身份**；`chat-main` 恰好一个、不可关不可折叠；未知面板保留在存档不渲染、唤醒后原位恢复（位置记忆） | W1c 多 Surface 标签与未来画布/右栏部件的直接设计参照；与「detach 不销毁」语义互证 |
| 多标签会话=memento | `tab-store`（见 §3.2 multica——cindy 的 right-sidebar tabGroups 同思想） | W1c |
| 输入协调器 | `apps/desktop/src/main/maker-ipc/agent-input-coordinator.ts` + `shared/agentInputQueue.ts`：发送/排队/插话/停止后继续统一为**输入事务** | R1/Q3 单任务执行与人工插话（steering）的工程化形状 |
| 中断恢复双轨 | 启动候选判定（`sessionActiveTurn`/`interruptedResumeCandidates`）与运行期自动续跑（`interruptedTurnAutoResume`）**分开建模**，不是同一触发条件 | Q3 断点续跑 |
| gen UI 三通道 | §2.1 | Q2 widget、通信协议 v0/v1 |
| Automations/routines | `docs/product-rules/bot-routines.md`、`apps/desktop/src/main/routines/`（service/store/sessionRestore）+ `maker-scheduler`（routine-engine、事件准入、pre-run hook） | Q 系列之后的定时目的（04 §1 目标 6）；P7 前置体验 |
| Bot/伴侣与群任务 | `docs/product-rules/cindy-bots-runtime.md`（161KB 正本）、botCollaboration/botDelegation（maker-shared）、autonomy（main/bot-autonomy） | 远期「多 agent 分工」；innate 当前无对应排期，记录不动手 |
| SkillHub | 市场（浏览/发布/评审 verdict/diff 面板）+ 本地导入（`runtime-local-skill-import-panel`）+ `plugin-protocol`（manifest/成员上传/secretCheck） | P3-lite 分发与 P7 市场的完整参照（含恶意内容扫描位） |
| 多设备 device-link | `packages/device-link*`（relay/protocol）、remote-desktop、provider-share（跨机共享模型订阅）、sticky session 路由 | 远期方向 B 记录；dsh 会话跨设备接续的想象空间 |
| 上游非退化原则 | `core-product-principles.md` §3.1：原生 harness 能做的，宿主不得做得更保守；宿主分析器失败**退回原生行为**而非阻断 | R1 Harness 收敛的产品级红线，防「壳比裸 dsh 更难用」 |
| 文档/规则组织法 | AGENTS.md 只留索引与全适用规则；dev-rules/product-rules/design-rules 三分；repo-map 按「用户行为→生产入口→测试」导航 | 本仓 docs/ 与任务卡体系的组织参照 |
| 安全注释纪律 | `htmlPreviewCsp.ts`：每个残留信道在注释里自曝 | 安全约束文档化范式 |

### 3.2 multica

| 功能 | 证据 | 对 innate 的意义 |
| --- | --- | --- |
| tab-store | `apps/desktop/src/renderer/src/stores/tab-store.ts`：tab 会话=可序列化 URL + 虚拟历史 + **memento**（scroll 按 `route::container` 键、view 态由视图经适配器写入、上限 100 条 LRU）；协调器把活动会话**投影到单 router**，store 不操作 router | W1c 标签的「detach 不销毁」实现蓝本：状态快照化而非保活 DOM |
| daemon 生命周期 | `apps/desktop/src/main/daemon-manager.ts`（60KB）：5s 状态轮询、`/health` 探测分级（2s UI 探测 → 10s 恢复探测）、启动超时必须大于 CLI 自己的就绪超时（防止「健康但慢」被误报）、恢复策略对象化（`daemon-recovery.ts` 14KB 测试）、退出确认族 | W2 magpie 生命周期收口的工程参照（探活分级/恢复/误报避免） |
| runtime 接入面 | `CLI_AND_DAEMON.md`：探测即注册、WS wake + 30s poll 兜底、心跳 15s、idle/tool 双看门狗（Codex 例外单列）、并发上限、工作区 GC 全家（TTL/orphan/artifact/仓库缓存） | W2 状态机字段级参照；Q3 任务执行资源回收 |
| per-agent 适配的**正确姿势** | `server/pkg/agent/`：每 agent 一个 Go 文件，但只做「事件翻译进统一 Backend contract」；协议族（ACP）共享 `acp_session.go`；能力缺失按协议标准当不支持 | 与 orca 反面教材的差别就在适配层薄不薄；佐证 innate「AgentRuntime 适配缝」设计 |
| **dsh 适配器** | `server/pkg/agent/dsh.go`：JSONL stdio v1、`dsh --profile multica --stdio`、execute/cancel 命令、resume_session_id、MCP 服务器随任务下发、模型三元组 (provider,id,reasoning_effort)；profile 探测按 `DshProtocolVersion` 门进 | §5 详述 |
| 状态管理规则 | AGENTS.md State Rules：TanStack Query 独占服务端数据、WS 事件只 patch/invalidate 缓存、乐观更新四条件+快照回滚、确认流先等服务器 | Q2 看板前端的数据层纪律（防投影状态second source of truth） |
| API 兼容 | zod schema + `parseWithFallback`，禁止 `as T`；未知枚举给默认值 | innate 桌面与 magpie/dsh 版本错配时的解析纪律 |
| comment runs | 评论即派工：run 锚定在最新覆盖输入上、失败以 agent 身份发系统评论、排队输入作废有专门状态 | Q3「一次执行一条任务」的人机交互面参照 |
| autopilots | schedule/webhook/手动三触发 + run history + 订阅者 | Q 系列后定时目的 |
| 测试纪律 | 假可执行路径进默认测试；真 agent 冒烟独立 tag + 双开关（build tag + env） | 本仓「真实二进制测试只读、隔离」的同族做法，可借 gate 形状 |

---

## 4. 和 orca 结合看：待完成功能清单（分阶段、分种类）

orca 取舍已在 `orca-module-review.md` 定案（采纳 token/壳布局、替换 per-agent 配置为 magpie、terminal/browser/画布按 Surface provider 独立实现）。本节只列 **orca 没有做、而 cindy/multica 已验证可行** 的增量，按「落地时机」分阶段、按「性质」分种类。

### 种类划分

- **A 类·主线内实现姿势**：不改 W/Q 范围，只影响对应 sprint 怎么写代码。
- **B 类·Q 系列姿势增强**：写进 Q 系列任务卡的姿势修订（04 §7 已预留此口）。
- **C 类·P 系列重启资产**：记入 backlog，重启时引用本文，不进当前排期。
- **D 类·明确不采纳**：看了、想过了、不做，防止重复评估。

### A 类（主线内）

| # | 待完成 | 源参照 | 落点 |
| --- | --- | --- | --- |
| A1 | W1c 标签状态快照化：Surface detach 时保存 scroll/视图态 memento（键=`surfaceId::container`），reattach 原位恢复；store 只存可序列化状态、不保活 DOM | multica tab-store | W1c 任务卡姿势 |
| A2 | W1c 面板身份=provider/surface kind，位置（左/中/右）不是身份；未知 kind 保留占位不清理 | cindy layoutTree 不变量 | W1c |
| A3 | W2 magpie 探活分级（UI 快探/恢复慢探两档超时）+ 恢复动作对象化 + 「健康但慢」误报防护 | multica daemon-manager/recovery | W2 |
| A4 | W4 terminal：PTY 会话带 shell 解析与偏好持久化；中断任务恢复双轨（启动时盘点 vs 运行时续跑分开建模） | cindy ptyManager/shellResolver、interruptedResume | W4 |
| A5 | R1 适配层薄化红线：dsh 适配只做事件翻译，协议版本号握手门进（对不上版本即拒），「上游非退化」写进验收 | multica dsh.go、cindy 核心原则 §3.1 | R1 |
| A6 | 全线：不可信 HTML/富文本渲染一律宿主 CSP 断网 + 残留信道注释自曝 | cindy htmlPreviewCsp | W5 browser、Q2 |

### B 类（Q 系列姿势）

| # | 待完成 | 源参照 | 落点 |
| --- | --- | --- | --- |
| B1 | Q1 规划器输出层直接用「声明式组件流」姿势：一段 system prompt + 前端渲染器即可先行，不等 MCP Apps | cindy-ui（richAnswer 协议+guide） | Q1 |
| B2 | Q2 看板（widget 形态）按 surface-bridge 三件套设计：端口绑定身份 + 单次 challenge + 路径白名单；theme token 下推做明暗跟随 | multica plugin-sdk/protocol.ts | Q2 |
| B3 | 通信协议 v0 的「动作请求」定义成「拼装用户可见文本发回会话/任务」，**不**直接触发执行；执行类动作单独走能力审批 | cindy RichSubmissionController | Q2/Q3 |
| B4 | Q2 数据层纪律：服务端事实只入查询缓存，投影/派生态明确非事实源；WS 事件 patch 缓存 | multica State Rules | Q2 |
| B5 | Q3 transcript：trace 事件 → 结构化 build steps/timeline/outcome 三视图，deliverable 一等实体带版本 | multica task-transcript/deliverables | Q3 |

### C 类（P 系列重启资产）

| # | 资产 | 源参照 |
| --- | --- | --- |
| C1 | MCP Apps 上产先例（AppBridge 接线、CSP 生成、字节预算/背压、remote 投影、审批钩子）——通信协议 v1 平移时逐件对照 | cindy `main/mcp-apps/` |
| C2 | 插件市场完整形态：发布/评审/版本不可变/安装绑定版本/本地侧载/secret 扫描 | multica plugin README + cindy SkillHub |
| C3 | 自动化：routine 引擎（cron+事件准入+pre-run hook+会话恢复）与 autopilot（schedule/webhook/手动+run history）两参照 | cindy maker-scheduler + multica autopilots |
| C4 | 跨设备：device-link relay、provider 跨机共享、手机遥控桌面 | cindy device-link 族（方向 B） |
| C5 | daemon 大规模 runtime 表：26 CLI 探测注册、ACP 协议族共享会话、MCP 配置随任务走（`mcp_config` canonical envelope + 能力门控） | multica server/pkg/agent |

### D 类（明确不采纳）

| 项 | 理由 |
| --- | --- |
| cindy per-harness 的 auth/账号管理面（maker-cc-manager 的会话注册表等整体照搬） | innate 已裁决：模型/账号面归 magpie，平台不自研（orca-module-review §2） |
| multica 的 server/云端工作区模型（多 workspace、成员、订阅、IM 桥 dingtalk/lark/slack/wecom） | innate 是单机桌面优先，无服务端；IM 桥属远期方向 B |
| multica mobile、cindy mobile 的整端复制 | innate 无手机端排期；只记 C4 概念 |
| cindy 群聊多 bot 协作（botGroupChat 138KB 规则） | 超出单任务执行（Q3）语义，多 agent 编排非当前主线 |
| 两家的全局 layout 持久化树整套引入 | innate 壳是固定三区+中栏标签，复杂度不需要；只取 A1/A2 两条不变量 |

---

## 5. 如何和 dsh 结合使用

**关键事实：multica 已经把这条路走通了**，innate 不需要发明协议形状：

1. **dsh 作为 runtime 被 daemon 接线**（`server/pkg/agent/dsh.go`）：
   - 启动：`dsh --profile multica --stdio`（专用 profile，不动用户默认 DSH_HOME——与本仓「隔离 DSH_HOME」硬约束同思想）。
   - 协议：**版本化 JSONL stdio（v:1）**；execute 命令带 cwd/prompt/resume_session_id/model(provider,id,reasoning_effort)/mcp_servers；cancel 带 3s 优雅+2s 强杀；帧内 `protocol_version` 握手，profile 探测按 `DshProtocolVersion` 门进。
   - 语义边界注释明确：**"DSH owns the agent loop, session store, model catalog, tools, and MCP clients, while this package only translates those events into Multica's Backend contract"** ——适配层零业务。
   - 配置注入：`MULTICA_DSH_PATH`、`MULTICA_DSH_MODEL`；约定文件：读 `AGENTS.md` 与 `.dsh/skills/`（skill 按目录发现，宿主只负责铺目录）。
2. **映射到 innate**（全部落在既有计划内，无新协议）：
   - W2：magpie 管模型面不动；dsh 进程托管参照 A3 探活/恢复 + `dsh --stdio` profile 隔离。
   - R1：两套 harness.ts 收敛成 multica Backend contract 同构的窄接口；版本握手 + 上游非退化写进验收（A5）。
   - W1c/04 handler registry：dsh 是**呈现键**（Surface provider：会话中栏 Surface）+**能力键**（agent:tools handler）双注册——multica 的 runtime 注册表就是「能力键」空间的现成案例。
   - Q3：一次执行一条任务 = multica 的 issue→claim→run→transcript→deliverable 闭环的单机缩影；插话/取消语义抄 `dshCancelCommand` 节奏与 comment-runs 状态机。
   - gen UI：宿主在启动 dsh 会话时注入 `ANSWER_DELIVERY_PROMPT` 式附加指令（cindy 证明这不碰 agent 内核），renderer 先做 cindy-ui 渲染器（B1），MCP Apps 宿主留给 Q2+（C1）。
   - skill：宿主铺 `.dsh/skills/`（multica 现成约定），后续 P3-lite 的 manifest `skills[]` 与该目录机制对齐。

---

## 6. 证据索引

- cindy：`reference/cindy/packages/maker-shared/src/{richAnswer,richAnswerGuide,richAnswerVisual,htmlPreviewCsp}.ts`、`apps/desktop/src/renderer/components/chat/{RichAnswer,McpAppCard,AssistantMessage}.tsx`、`apps/desktop/src/main/mcp-apps/{host,sandboxProtocol,remoteViews}.ts`、`apps/desktop/src/renderer/stores/`（ghostCardStore 等）、`docs/dev-rules/{repo-map,architecture-invariants}.md`、`docs/product-rules/core-product-principles.md`、`packages/maker-core/src/agents/base-agent.ts`
- multica：`packages/plugin-sdk/{index,protocol}.ts`+README、`packages/views/plugins/{surface-bridge,surface-document}.ts`、`packages/views/common/task-transcript/`、`apps/desktop/src/renderer/src/stores/tab-store.ts`、`apps/desktop/src/main/{daemon-manager,daemon-recovery}.ts`、`server/pkg/agent/{dsh,agent,acp_session}.go`、`CLI_AND_DAEMON.md`、`AGENTS.md`
- 本仓关联：`docs/original/architecture/orca-module-review.md`、`docs/susu/plan/04-platform-gap-review.md` §2/§3/§6、`docs/susu/plan/README.md` §5 任务规则
