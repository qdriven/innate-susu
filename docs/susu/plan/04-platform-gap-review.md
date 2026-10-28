# 平台缺口评估 · 轻应用形态与宿主通信（04）

> 版本：v1.0 · 2026-10-28。来源：用户产品目标陈述（六类）+ 两轮 review 修正。
> 性质：P 系列重启的基准输入；**不改变现行 W/Q 主线**，只约束 Q 系列的实现姿势与后续新协议的诞生时点。
> 关联：[README](./README.md)（执行源）、[03-migration-plan.md](./03-migration-plan.md) §5 后置清单、`docs/original/innate-dogic/CONTEXT.md` §3（轻应用契约原文）、`prototypes/kimi-work-clone`（原型）。

## 1. 产品目标（用户口径，2026-10-28）

1. **文档类 PPT/Office**：通过 browser 或 canvas 展示。
2. **terminal**：命令行执行；可调用多种本地程序与不同终端。
3. **项目/issue 管理**：管理不同工具的开发过程。
4. **简单文档编辑**：类似 orca 的轻编辑。
5. **skill/workflow 绑定与替换**：与功能绑定组装，方便构建不同类型的应用。
6. **周边扩展（云等）**：创建的应用集成进底座，轻量、**热加载、plugin 方式**；应用可以 widget/toolbar 形态存在，**与宿主通信**。

**关键修正（第二轮 review 确立）**：不是底座外扩成桌面级宿主，而是**轻应用的多形态呈现**——widget/toolbar 是轻应用在宿主内的挂载形态，与宿主双向通信。

## 2. 轻应用多形态模型

一个轻应用 = 一份 PluginManifest v1 声明多种呈现形态，宿主按场景取用：

```text
PluginManifest v1（原型已验证）
├─ ui.surface      完整页面形态（中栏 Surface / 侧栏交互页）
├─ widget          小组件形态（画布卡片 / 右栏部件 / toolbar 片段）
├─ skills[]        技能绑定（原型 manifest 已含此段）
├─ tools           能力声明（v0 模板 → v1 MCP 服务）
└─ permissions     执行前必过审批
```

## 3. 宿主 ↔ 轻应用通信协议（本文档核心增量）

原型已验证单向一半；v0 补齐为双向窄消息集，v1 平移 MCP Apps（`@modelcontextprotocol/ext-apps`，zcode UI Plugin 同款——工具与 UI 最终同一标准，不自造 SDK）。

| 方向 | 消息 | 状态 | 诞生时点 |
| --- | --- | --- | --- |
| 宿主→应用 | state 注入 / 快照恢复（widgetState 版本化） | ✅ 原型已验证 | P3-lite 移植 |
| 应用→宿主 | save-state 回存 | ✅ 原型已验证 | P3-lite 移植 |
| 应用→宿主 | 动作请求：打开完整应用 / 请求导航 / 触发本应用执行 | ❌ v0 补 | Q2（首个消费者） |
| 应用→宿主→审批→执行 | 能力调用（process:execute / workspace 读）→ 审批中介 → 结果回投 | ❌ v0 补 | W4.2 能力注册表起步，Q2/Q3 全链 |
| 宿主→应用 | 主题/token 注入（iframe 跟随宿主明暗，消费语义 token） | ❌ v0 补 | Q2（W1a theme 层是基础） |
| 宿主→应用 | 生命周期事件：mount / resize / 显隐 | ❌ v0 补 | Q2（复用 Surface provider 语义） |

## 4. 六类目标 → 载体 → 协议缺口

| 目标 | 实现载体 | 缺的协议 |
| --- | --- | --- |
| 1 文档展示 | W3 中栏 document 槽的文档预览 provider + 轻应用 surface/widget 形态 | **open-with 文件关联**（文件类型→provider 注册表；Office 接转换或转 PDF） |
| 2 terminal/本地程序 | W4 内嵌 PTY + 轻应用声明 process:execute；外部终端/程序调用 | 能力调用链（§3 第 4 行）+ **外部程序注册**（本地 CLI 注册、启动三态：内嵌/外部终端/后台） |
| 3 项目/issue 管理 | **Q1/Q2 做成第一个轻应用**（规划器=page 形态，看板=widget 形态） | 几乎不缺——通信协议的首个消费者 |
| 4 文档编辑 | document surface 的编辑 provider | `filesystem.write` 能力（W3→Q3 路上） |
| 5 skill/workflow 绑定 | manifest `skills[]` 段 + 热加载 | 插件生命周期钩子（P3 加载器扩展：install/enable/disable/uninstall + renderer 隔离） |
| 6 云/周边 + widget/toolbar | 多形态挂载（画布/右栏/toolbar）+ 通信协议 + P7 分发 | §3 的 4 条 ❌；**不需要桌面级宿主协议**（已否决） |

## 4bis. 统一打开方式模型（handler registry，2026-10-28 补）

用户洞察确立：**dsh 本身就是一种打开方式**——它同时是 Surface provider（呈现侧）与 agent:tools 能力 handler（执行侧）。据此把原三个独立协议收敛为同一注册表的键空间：

```text
统一「打开方式注册表」（handler registry）
├─ 内容键：文件类型/URI → 打开方式（open-with；Markdown→预览器、pptx→转换展示…）
├─ 能力键：capability → 执行器（Q3.2；process:execute→pty、agent:tools→dsh、navigate→browser）
├─ 目的键：purpose → 轻应用（P4 目的网关）
└─ 呈现端：Surface provider（W1c；结果在中栏/画布/右栏打开）
```

共享机制（一次设计、四键共用）：注册、同键多 handler 并列/默认选择、审批挂钩（带 permissions 的 handler 过审批）、热插（轻应用 handler 随插件装卸——即「绑定和替换」的机制底座）。

**与 §6.1 Provider 层决策的关系**：handler 层（用什么打开，宿主可插拔注册）≠ provider 层（模型从哪来，magpie 独占）。dsh 是宿主的一个 handler，其模型侧内部走 magpie；未来 zcode-cli/ACP 接入 = 新增 handler 记录，不动宿主。

**对 §4/§5 的影响**：open-with 从「文件专属协议」改为 handler registry 的内容键空间首案例；Q3.2/W1c/P4 各为一个键空间的首次落地；第三层新增协议从三个收敛为**一个 registry 机制 + 三个键空间首案例**。

## 5. 协议就绪度分层

- **第一层（W/Q 主线内闭环，无需新设计）**：Surface provider（W1c）、IPC 通道表收敛+命名规范+错误形状（W1c.2）、事件推送规范、capability 注册表（W4.2）、网关状态机（W2）、workspace root 单源（W3）、process:execute（W4）。
- **第二层（原型已验证，等重启即 P3-lite）**：PluginManifest v1、widgetState、审批中介、目的网关、本地侧载加载器。
- **第三层（真正缺失，各带首消费者）**：open-with（文档预览带）、外部程序注册（terminal 域带）、热加载生命周期（P3 加载器带）。

**就绪度约 70%**。已否决/明确不做：桌面级扩展宿主协议；Agent Provider 层（见 §6）。

## 6. 决策记录

1. **Agent Provider 层不做，完全交给 magpie**（2026-10-28 用户确认）。多 Provider 池、Agent 接线、协议互译、用量归账 = magpie 独占；平台永不自研 per-agent 适配（对齐 orca-module-kit 核心判断：orca `src/main/{claude,codex,…}` 的 per-agent 层是反面教材）。**概念边界**：R1 的「Harness 进程收敛」不属于 Provider 层（是桌面两套 harness.ts 实现合一），照常执行；未来第二运行时（zcode-cli/ACP）只经 W1c 的 Surface provider 适配缝接入，不经 Provider 层。
2. **Q 系列以轻应用形态实现**：Q1 规划器 = 轻应用 #1（page 形态）；Q2 看板 = 同一应用的 widget 形态。P3-lite（manifest+iframe 宿主+widgetState+审批，原型移植）随 Q 系列开工点亮，通信协议 v0 的 4 条消息以 Q2 为首个消费者落地。
3. **通信协议演进**：v0 自有窄消息集（§3）→ v1 平移 MCP Apps；工具（MCP 服务）与 UI（Apps）同一标准。
4. 每条第三层协议必须带首消费者出现，不做「先建全框架」（继承计划风险表纪律）。

## 7. 执行图（与现行计划的关系）

```text
现在 ──► W1c（Surface provider，进行中）
      ──► W2 ∥ W3（并行窗口）──► W4（能力注册表诞生）──► W5 ──► R1
      ──► Q 系列（轻应用姿势）：
            P3-lite 移植 → Q1 规划器(轻应用#1, page) → Q2 看板(widget 形态, 通信协议 v0 首消费者)
      ──► 通信协议 v1 平移 MCP Apps ──► open-with（文档预览）→ 外部程序注册 → P7 分发
```

主线任务卡（phases/）不因本文档改动；Q 系列任务卡在开工前按 §6.2 姿势修订。

## 8. 更新义务

P3-lite 重启、通信协议 v0 定稿、open-with/外部程序注册立项时更新本文档；与本目录 03 冲突时以本文档为准（平台方向）并以 03 为准（迁移执行）。
