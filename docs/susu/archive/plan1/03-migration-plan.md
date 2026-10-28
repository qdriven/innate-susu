# 03 · 迁移计划

> 版本：v1.0 · 2026-10-28。原则、分段总表、双仓纪律、后置清单、硬约束、风险。
> 每段的逐任务卡在 [phases/](./phases/)；本文不重复任务细节。

## 1. 迁移原则

1. **一段一段**：每段只加或收口一件事；上段 `build + typecheck + test` 与 `smoke:desktop` 全绿才开下段。不边搬边重构，不一次重写桌面。
2. **行为不回退是每段的验收前提**：M0–M2 已验证的「对话、magpie、simple/dev 门控、只读工作区、Surface 快照」在任何一段交付前必须复验。
3. **布局抄 orca，实现不换仓**：token/三栏/中栏槽学 orca；UI 原语从 `@innate/ui` 取；**不 fork orca、不复制 `src/main/{claude,codex,…}` 式 per-agent 适配层**（多 Agent 模型配置整体归 magpie）。
4. **壳是 Host，DSH 是客人**：自建 Electron 壳当 Host；DSH / 以后 zcode-cli / ACP 都是中栏适配器，可摘除。卸掉 dsh-runtime 壳还在。
5. **中栏是多种容器，不是一种 plugin 全能跑**：dogic 插件 → React 面板；DSH → 嵌着的 `dsh web`；widget/MCP Apps → iframe；网页 → browser Surface。不做「任意生态一个 install 全跑」的兼容层。
6. **代码只进本仓**；labs 冻结只收 bugfix（修完 cherry-pick）。`references/`、`prototypes/` 只读不进门禁。

## 2. 分段总表

| 段 | 这一段做 | 这一段明确不做 | 出口验收 |
| --- | --- | --- | --- |
| **W0** 基线迁入 | 整树拷 `innate-dogic/`+`tools/`+`innate-project-canvas/`+根配置；改名坏点收口；门禁与冒烟与 labs 同绿 | 不改行为、不改布局、不加 Surface | 四门禁与 labs 同绿；smoke:desktop 过；ui:sync 修复后幂等 |
| **W1** 壳 | Tailwind+token 接入；三段壳（TitlebarStrip/Sidebar/ContentArea）；中栏多标签 Surface 槽 | 不改 magpie/DSH 启动逻辑；不写 terminal | 布局像 orca；禁 DSH 插件壳仍起；切标签不杀未关会话；明暗截图 |
| **W2** magpie | 启动/探活/控制台/接线状态进壳 pill；干净环境接线冒烟 | 不复制 orca per-agent 账号；不做双向设置 | 干净环境 magpie→接线→对话；断网关有显式 hint |
| **W3** 文件树 | 工作区从「一页」变常驻右栏 Panel；root 全局化 | 不开放写入/commit | 选根后 root 可被 W4/Q3 消费；重载恢复布局 |
| **W4** terminal | 主进程 pty；terminal Surface；process:execute 独立能力 + 白名单 | 不发明通用 shell IPC；simple 不可见 | 真命令、resize、无孤儿进程、伪造 IPC 被拒 |
| **W5** browser | 独立分区 WebContentsView；权限默认拒 | 不在 DSH 里再嵌浏览器 | 外链系统浏览器；下载自选路径；权限负路径 |
| **Q1** 一句话→快照 | 规划输入 → 网关模型 → project-snapshot 快照 + audit 门 | 不做 GitHub 任务系统 | audit 挡住坏依赖；失败不落盘 |
| **Q2** 看板 | canvas 产物进中栏；快照是人侧事实源 | 不把 HTML 当数据源；不当 Agent UI | 人能看见 frontier/下一项；草稿≠正式状态 |
| **Q3** 一条 task | 按 capabilities 路由执行器（pty/DSH/browser），证据回写 | 不并行 N 个 Agent | 一条跑完才下一条；失败 fail closed；无 magpie/DSH 纯终端任务可跑 |

## 3. 双仓纪律

```text
innate-labs：冻结。只收关键 bugfix → 在 labs 修、验证 → cherry-pick 到本仓。
innate-desktop：唯一前向仓。所有功能、布局、新模块只落这里。
证据：docs/susu/evidence/<段>/（labs 的 evidence 树留在原地作历史）。
```

禁止：在 labs 直接开发新功能；把 labs 的 `sites/`、`prototypes/`、`references/` 混进产品树；两仓同时改同一模块。

## 4. 每段顺序与并行

- 严格串行主线：W0 → W1 →（W2 ∥ W3）→ W4 → W5 → Q1 → Q2 → Q3。
- W2 与 W3 可并行（不同模块、无共享文件）；其余按依赖串行。
- 每段内任务卡可拆会话执行，但**动手前重读要改的文件**（多会话并发纪律）。

## 5. 后置清单（不是删除）

| 项 | 去向 |
| --- | --- |
| P3–P7：轻应用契约/加载器/目的网关/钉卡画布/分发市场（Kimi 形态） | `docs/innate-dogic/{plans,sprints}/` 保留；W/Q 收口后重启评估；原型 `prototypes/kimi-work-clone` 是移植来源 |
| P0–P2：frameworks 骨架 / architecture-policy / innate-backend TS 化 | 后置；其中 capabilities 审批思路在 W4.3 以最小面提前落地 |
| M4 DSH 侧 workbench 插件 / M5 双向宿主设置（方向 B） | 保留旧任务卡；锁死 DSH 的发行线，不作 W 系列前提 |
| M6 terminal/browser Surface（旧编号） | 被 W4/W5 提前吸收 |
| S5 mini-gateway 决策门 / S6 代码健康 | 决策门不触发不排期；代码健康穿插 |
| dsh 收敛（desktop 弃私有 harness.ts，只经 service 托管） | W 系列不收敛；P 系列回归时处理 |
| sites/dsh-desktop-plan 搬迁 | W0 后任意时间，非阻塞 |
| NSIS/安装器大包装 | 便携目录冒烟即可，外部工具链后置 |

## 6. 硬约束（每段都遵守）

1. 全部产品代码 strict TypeScript；TS-only 门禁（禁 .js/.jsx/.mjs/.cjs 产品源码）；`references/`、`prototypes/` 只读不入库不被产品导入。
2. DSH 用真实系统 Node 启动（清 `ELECTRON_RUN_AS_NODE`；候选含 `~/.local/opt/node` 等，排除 .cmd shim）；全新 `DSH_HOME` 先裸 boot 再 magpie 接线，否则 baseURL 不生效。
3. magpie 控制台/网关、dsh web、一切本地服务只绑 `127.0.0.1`；认证 URL/token/key 不进日志、快照、夹具。
4. 文件与 Git 默认只读、参数数组禁 shell 拼接；terminal 是独立高权限能力（W4.3 capability + 白名单，simple 不可见）；renderer 无任意 Node/shell。
5. Electron：`contextIsolation: true`、`nodeIntegration: false`、WebContentsView `sandbox: true`；禁 `executeJavaScript` 进访客 view；外链一律 `shell.openExternal` 跳系统浏览器。
6. 审批永不自动通过；错误必须显式可达（拒绝/超时/匹配失败都有 reason），不允许静默 skip。
7. 测试基线只增不减（83 项 @2026-10-26）；真实 magpie/dsh 测试只读、隔离 `DSH_HOME`/userData。

## 7. 风险与对策

| 风险 | 对策 |
| --- | --- |
| 双仓漂移（labs 继续改功能） | 冻结纪律（§3）；labs 只进 bugfix，且 cherry-pick 单向 |
| W0 拷贝体积/环境差异（electron 二进制、magpie.exe 45MB、dsh 本机依赖） | W0.4 逐项核对清单；`electron/install.js` 兜底；冒烟不过禁止开 W1 |
| 一段没绿就开下一段 | 状态板回写制度；README §5 DoD 是硬门 |
| 改名遗留断点（ui:sync 路径、包名、文档指向）造成新会话踩坑 | W0.3 一次收口；01 §2.3 坏点表对账 |
| 多标签改造破坏「会话不杀」语义 | W1.3 验收红线：detach 不销毁、URL 不变不 reload，CDP 断言 |
| terminal 权限失控 | 首个高权限能力：独立 capability + 白名单 + simple 隐藏 + 负路径测试（W4.3） |
| 规划幻觉（一句话生成的任务不可执行） | Q1 快照必过 canvas audit；失败不落盘（Q1.2/Q1.3） |
| 不要把失败默认归到 DSH | Q3 纯终端任务先查 pty/cwd/权限；无 magpie/DSH 也要能跑（Q3.3） |
| UI 纪律漂移（硬编码色、绕过基座） | susu-overview 技能管 AI 行为；机器执法（oxlint design-system 规则）穿插排期 |
| 两套 file/terminal（DSH 内核侧 vs 壳侧） | 本轮只对齐工作区根，不做 API 桥；社区 DSH 插件只活在中栏 Harness 里 |
