# S6 · Q1 一句话 → project-snapshot 快照

> 详细任务卡：docs/susu/plan1/phases/Q1-plan-snapshot.md。目标：规划产出符合 schema 的本地快照并过 audit 门；不做 GitHub 任务系统；规划模型只经 magpie 网关。

## T6.1 规划入口与网关调用
- **状态**：todo
- **做什么**：Sidebar 顶部一句话输入框；main 侧 planning/PlanService 经 magpie 网关调 LLM（复用 core/gateway 发现与 fetch）；prompt 内嵌 project-snapshot.schema.json 与只输出 JSON 约束 + workspace 摘要（不含文件内容）；网关不可达显式错误态。
- **功能**：一句话目的进入规划链路。
- **如何验证**：mock 网关单测 prompt 组装与解析；真实环境一次人跑留证。
- **预估 / 依赖**：1 天 / 需 S5

## T6.2 schema 校验与落盘
- **状态**：todo
- **做什么**：剥围栏 → JSON.parse → innate-project-canvas validate 模块（进程内 import）校验；失败显式原因且不落盘；成功写 workspace 的 docs/sprints/（目录可配），frontmatter 含 id/来源/audit 状态；同名版本递增不覆盖。
- **功能**：快照合法才存在，失败无副作用。
- **如何验证**：坏 JSON、缺字段、未知依赖三条负路径均不落盘且原因可达；合法快照可被 canvas audit 读取。
- **预估 / 依赖**：0.5 天 / 需 S5

## T6.3 audit 门
- **状态**：todo
- **做什么**：落盘前跑 innate-project-canvas audit（进程内 import）；不通过则快照标 invalid 并展示失败项，不进看板；audit 结论写回 frontmatter。
- **功能**：幻觉依赖被挡在入库前。
- **如何验证**：构造幻觉依赖的固定模型输出被 audit 拦截并标 fail；合法快照 audit pass。
- **预估 / 依赖**：0.5 天 / 需 S5
