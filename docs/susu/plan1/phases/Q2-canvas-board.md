# Q2 · 人看的看板（canvas 进中栏）

> 预估 1–2 天 · 依赖：Q1
> 目标：把 `innate-project-canvas` 生成的看板嵌进中栏，人能看见任务前沿与下一项。**看板给人看进度，不给 Agent 当工作面；HTML 是渲染产物，不是数据源。**

## 任务卡

### Q2.1 看板 Surface

- **做什么**：
  - 产物路线：Q1 快照经 canvas **sync/generate** 产出自包含 HTML（复用其 `workbench/render-sidebar` 生成器，壳内不重写渲染）→ 以只读 Surface 加载（`file://` 产物路径；复用 W5 分区经验但独立分区 `persist:canvas`）。
  - 注册为中栏标签（id `canvas`）；侧栏列出全部 valid 快照（读 `docs/sprints/` 目录 + frontmatter，`invalid` 快照灰显不可开）。
  - 快照变更（Q3 回写/人工编辑）→ 重新生成 HTML → Surface 重载（产物级刷新，不做热更）。
- **如何验证**：Q1 的快照在看板可见且任务卡完整（对照快照 JSON 字段）；invalid 快照灰显负路径；重载后内容更新。

### Q2.2 状态变更门

- **做什么**：
  - 看板**只读**：Surface 内禁输入类交互落地（HTML 产物本身无表单；view 层再加 `setWindowOpenHandler` 全外跳兜底）。
  - 快照状态变更只允许两条路：(a) Q3 执行器跑完 + 证据落盘后回写；(b) 人直接编辑快照源文件 → 重新 audit → 重新生成。壳不提供「点一下改状态」的快捷通道。
  - 草稿与正式区分：frontmatter `status: draft|confirmed`；Q1 产出默认 `draft`，人确认（壳上一个小按钮：draft → confirmed，触发 re-audit）后 Q3 才可取任务。
- **如何验证**：draft 快照下 Q3 取不到任务（负路径）；确认按钮触发 re-audit 且 audit fail 时确认被拒；直接改 HTML 产物不影响快照（数据源是 md/json 的事实源断言）。

## 出口标准

1. 人能在中栏看见 frontier / 下一项 / 每任务证据链接（对照快照内容人工验收 + 截图）。
2. 看板只读、草稿≠正式、HTML≠数据源三条红线各有断言。
3. 测试基线只增（快照目录扫描、状态门单测）。
