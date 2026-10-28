# Sprint 执行层（平台化重启）

> 所有待执行任务的唯一执行清单。规则沿用旧树并在此重申；里程碑决策见 [../plans/README.md](../plans/README.md)。
> 任务编号：`T<里程碑>.<序号>`；DoD：全量门禁绿 + 「如何验证」逐条通过 + 证据入 `docs/innate-dogic/evidence/<里程碑>/` + 文档同步。

## 规则

1. 测试基线只增不减（83 项 @2026-10-26）；真实 magpie/dsh 测试只读、隔离 `DSH_HOME`；token/key 不进日志与夹具。
2. **行为不回退**：每个 P 里程碑交付前必跑 `pnpm smoke:desktop`（及其触发的既有验收）。
3. 移植原型代码（`prototypes/kimi-work-clone`）必须 strict 化 + 契约测试 + 负路径覆盖，不接受原样拷贝。
4. 新 UI 只取 token（style-guide §6）；新通道必须进 `ipc-contract` 通道表。
5. 无消费者的框架能力不合并（功能先于代码共享）。

## 状态板

| Sprint | 名称 | 预估 | 状态 |
| --- | --- | --- | --- |
| P0 | 平台基线（frameworks 骨架 + policy + 文档树生效） | 1–2 天 | **下一执行项** |
| P1 | innate-fe：token + 壳布局 + 明暗 | 2–3 天 | 排队 |
| P2 | innate-backend：service-runtime + capabilities | 2–3 天 | 排队（可与 P1 并行，P4 前合流） |
| P3 | 轻应用契约 v1 + 本地加载器 + light-app-host | 2–3 天 | 待 P2 |
| P4 | 目的网关 + 审批 UI + Widget 钉卡闭环 | 2–3 天 | 待 P1+P3 |
| P5 | 画布 Widget Surface + 快照恢复 | 2 天 | 待 P4 |
| P6 | dsh 适配器（吸收原 M3） | 2–3 天 | 待 P4 |
| P7 | 分发：内容寻址 zip + 目录客户端 | 2–3 天 | 待 P5 |
| M4/M5 | 方向 B（DSH 侧插件 / 双向设置） | 4–6 + 3–4 天 | 待 P6，任务卡沿用旧树 |
| S5/S6 | mini-gateway 决策门 / 代码健康 | — | 不变，穿插 |

---

## P0 平台基线

### T0.1 frameworks 骨架
- **做什么**：新建 `frameworks/innate-fe`（React + tokens 空实现 + 单入口 `src/index.ts`）与 `frameworks/innate-backend`（纯 Node + `defineService` 最小实现 + 单入口）；加入 workspace；各自 package.json/tsconfig/build/test 脚本。
- **功能**：innate-fe 导出一个可渲染的 `TokenProvider`（注入 token CSS）；innate-backend 导出 `defineService({id, start, stop, healthcheck})` 且 healthcheck 可真实探测。
- **如何验证**：`pnpm build && pnpm typecheck && pnpm test` 全绿（含两新包至少各 2 项测试）；desktop 现有冒烟不回归；`apps/desktop` 尚未依赖两包（无消费者不接线，规则 5）。

### T0.2 architecture-policy 与 check:policy
- **做什么**：`innate-dogic/architecture-policy.yaml` 登记全部存量模块（`managed: false`）+ frameworks（`managed: true`，requires/publicEntrypoints 见 module-map §4）；`tools/check-policy.ts` 校验依赖方向与入口存在性。
- **功能**：`pnpm check:policy` 通过；人为加一条非法 requires 能让工具报错。
- **如何验证**：负路径单测（非法方向被拒）；门禁纳入 `check:policy`。

### T0.3 文档树切换
- **做什么**：本树标记为 canonical；旧 `docs/sprints/README.md` 状态板顶部加「已由 `docs/innate-dogic/sprints` 取代（M4/M5/S5/S6 任务卡仍有效）」；项目技能 `.agents/skills/innate-labs-context` 补新树入口。
- **如何验证**：新会话按 README 阅读顺序可直达状态板；旧树无待执行新任务残留。

## P1 innate-fe：token 与壳布局

### T1.1 tokens 落地
- **做什么**：`src/tokens/tokens.css` 按 style-guide §2 全家族（明暗两组）；`TokenProvider` 注入；现有 `@dogic/syntax-highlighting` 主题接到 token 家族（保持包独立）。
- **如何验证**：单测断言 token 家族键集完整（surface/fg 成对）；明暗截图各一张入证据。

### T1.2 壳布局原语
- **做什么**：`shell/` 实现 `TitlebarStrip`（品牌 + 模式 pill + 全局状态）、`Sidebar`（`PageDefinition` 注册 + 底部状态）、`ContentArea`；desktop renderer 换用三段布局，页面逻辑不动。
- **如何验证**：`smoke:desktop` 通过（DOM 断言导航与状态 pill）；simple/dev 门控行为与现状一致；删除任一页面注册壳仍可启动（单测）。

## P2 innate-backend：service-runtime 与 capabilities

### T2.1 service-runtime + sidecar
- **做什么**：`defineService` 完整生命周期（激活/停止/健康/倒序清理）；`sidecar` 实现外部进程托管（stdout 按行契约捕获、`taskkill /T` 树回收、崩溃重启、退避）；以 magpie CLI 为第一个真实消费者做只读冒烟（隔离配置）。
- **如何验证**：契约测试（正常/异常退出/超时）；真实 magpie 只读命令冒烟（隔离临时 DSH_HOME）。

### T2.2 capabilities：注册表 + 权限 + 审批中介
- **做什么**：移植原型 `permissions.ts`：权限位注册（含人话描述）、审批中介（requestId、60s 超时视为拒绝、显式 auto-approve 通道）；类型进 `packages/sdk` 子入口。
- **如何验证**：契约测试覆盖 批准/拒绝/超时/重复 requestId；auto-approve 仅在显式声明路径可触发（负路径单测）。

## P3 轻应用契约 v1 + 本地加载器

### T3.1 PluginManifest v1 类型与校验
- **做什么**：`packages/sdk` 新增 `light-app` 子入口：manifest 类型（CONTEXT §3）+ 校验器（必填、权限位白名单、entry 合法性）；内容寻址 `integrity.files[]`。
- **如何验证**：校验器单测：缺字段/未知权限/非法 entry/哈希不符 全部 fail closed 并给 reason。

### T3.2 加载器 + light-app-host 骨架
- **做什么**：`plugins/light-app-host`：扫描插件根目录、加载校验、sha256 校验、侧载安装（系统目录选择器）、禁用/卸载只移除自身贡献；desktop 装配本插件并出「插件」页（用 innate-fe 原语）。
- **如何验证**：两个示例包（weekly-report/quick-todo 从原型移植）加载成功且哈希展示；篡改文件后 fail closed；禁用后目的匹配不再命中。

## P4 目的网关 + 审批 UI + 钉卡闭环

### T4.1 目的网关与 AgentRuntime 缝
- **做什么**：`AgentRuntime` 接口（plan/execute）+ MockRuntime（purposeKeywords 匹配，从原型移植）；`runPurpose` IPC 通道进 `ipc-contract`；`PurposeBar` + `ApprovalModal`（style-guide §5 文案三要素）。
- **如何验证**：端到端（冒烟）：输入周报目的 → 审批弹窗（权限人话描述）→ 允许 → 卡片钉入；拒绝与超时显示显式 reason；匹配失败有原因不静默。

### T4.2 WidgetCard 与状态保存
- **做什么**：sandbox iframe 卡片（CSP：`frame-src file:`）+ state 注入/回存协议 + widgetState 暂存（进 innate-backend/storage）。
- **如何验证**：卡片可交互（勾选即存）；存档文件版本化；负路径：非白名单 postMessage 被忽略。

## P5 画布 Widget Surface

### T5.1 画布一等 Surface + 快照恢复
- **做什么**：`packages/core/surface` 扩展 `canvas` 类型；画布页承载卡片网格；widgetState 接入现有版本化快照机制（对齐 workspace 快照标准）。
- **如何验证**：页面重载后卡片与状态恢复；快照 schema 版本不兼容时安全回退；`smoke:desktop` 覆盖。

## P6 dsh 适配器（吸收原 M3）

### T6.1 dsh-runtime 插件收敛
- **做什么**：desktop 弃用私有 `main/harness.ts`，只经 `plugins/dsh-runtime` 启动 Harness；`services/harness-runtime` 成为唯一编排；MockRuntime 旁接入 `DshAgentRuntime`（目的 → dsh 会话 → 结果卡片）。
- **如何验证**：现有全部 DSH 冒烟通过；两套托管合一后 simple/dev、overlay 7/7、magpie 接线不回退；目的可触发真实会话产出卡片（真实验收，不接受 mock 冒充）。

## P7 分发

### T7.1 内容寻址 zip + 目录客户端
- **做什么**：zip 格式定稿（manifest + files + sha256）；目录客户端（官方目录拉取、按需下载、校验安装）；便携包内置示例轻应用。
- **如何验证**：侧载与目录安装双轨；哈希不符拒装；便携冒烟包含一次完整轻应用闭环。
