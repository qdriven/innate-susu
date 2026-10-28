# Q1 · 一句话 → project-snapshot 快照

> 预估 2 天 · 依赖：W5
> 目标：用户输入一句话目的，规划调用产出**符合 project-snapshot schema 的本地快照**；快照必过 audit 门，失败不落盘。**不做 GitHub 任务系统；规划模型经 magpie 网关，不直连任何 Provider。**

## 任务卡

### Q1.1 规划入口与网关调用

- **做什么**：
  - 壳侧输入面：Sidebar 顶部「一句话」输入框（v0 单行 + 提交；不是 P 系列 PurposeBar 全功能）。
  - main 侧 `planning/PlanService`：经 magpie 网关调 LLM（复用 `@dogic/core/gateway.ts` 的发现与 fetch 基建；模型从 `fetchModels` 结果选，默认第一个可聊天模型，UI 可换）。prompt 内嵌 `project-snapshot.schema.json` + 「只输出 JSON」约束 + 当前 workspace root 摘要（目录名/语言线索，不上传文件内容）。
  - 网关不可达/无模型：显式错误态（复用 W2 pill 状态），不静默。
- **如何验证**：mock 网关单测（prompt 组装含 schema、响应解析）；真实环境一次人跑留证（输入「给这个仓库补 README 的一句话计划」级别任务）。

### Q1.2 schema 校验与落盘

- **做什么**：
  - 解析模型输出：剥 markdown 围栏 → JSON.parse → `innate-project-canvas` 的 **validate** 模块（进程内 import，包已在 workspace）做 schema 校验。
  - 校验失败：显式原因（哪字段、为什么）返回输入框，**不落盘**；成功：写 `docs/sprints/<slug>.md`（或用户在设置里选的快照目录；v0 默认 `<workspace>/docs/sprints/`，目录不存在则创建）。文件含 frontmatter（id/createdAt/sourcePrompt 摘要/audit 状态）。
  - 同名快照：版本号递增，不覆盖历史。
- **如何验证**：负路径单测——非法 JSON、缺字段、未知依赖各一条，全部不落盘且原因可达；正路径落盘文件可被 `canvas audit` 读取。

### Q1.3 audit 门

- **做什么**：
  - 落盘前跑 `innate-project-canvas` **audit**（进程内 import）：依赖存在性/证据门控不通过 → 快照标 `invalid` 并展示失败项，不进看板（Q2 只显示 valid 快照）。
  - audit 结论写回快照 frontmatter（`audit: pass|fail + failures[]`）。
- **如何验证**：构造幻觉依赖的模型输出（mock 固定响应）→ audit 拦截、frontmatter 标 fail；合法快照 audit pass。

## 出口标准

1. 一句话 → 合法快照全链路真实跑通一次（证据：输入、快照文件、audit 输出）。
2. 三条负路径（坏 JSON/缺字段/幻觉依赖）全部不落盘且原因显式。
3. 无网关时显式错误；不直连 Provider；prompt 不携带文件内容。
4. 测试基线只增（校验器、audit 门单测）。
