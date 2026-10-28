# S7 · Q2 人看的看板进中栏

> 详细任务卡：docs/susu/plan1/phases/Q2-canvas-board.md。目标：canvas 产物进中栏给人看进度；HTML 是渲染产物不是数据源；不当 Agent UI。

## T7.1 看板 Surface
- **状态**：todo
- **做什么**：valid 快照经 canvas sync/generate 产出自包含 HTML（复用其生成器，壳内不重写渲染）；以只读 Surface 独立分区加载；侧栏列全部快照，invalid 灰显；快照变更重新生成产物级刷新。
- **功能**：人在中栏看见 frontier、下一项与任务卡。
- **如何验证**：Q1 快照在看板完整可见（对照 JSON 字段）；invalid 灰显负路径；重载后内容更新。
- **预估 / 依赖**：1 天 / 需 S6

## T7.2 状态变更门
- **状态**：todo
- **做什么**：看板只读；状态变更只允许 Q3 跑完回写或人编辑源文件后重新 audit；frontmatter 增加 status: draft|confirmed，Q1 产出默认 draft，人确认触发 re-audit，confirmed 后 Q3 才可取任务。
- **功能**：草稿与正式分离，杜绝点一下改状态。
- **如何验证**：draft 下 Q3 取不到任务负路径；确认按钮触发 re-audit 且 fail 时拒绝；直接改 HTML 不影响快照事实源。
- **预估 / 依赖**：0.5 天 / 需 S6
