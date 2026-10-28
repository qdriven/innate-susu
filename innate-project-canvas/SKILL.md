---
name: innate-project-canvas
description: 为 innate-labs 生成、审计和发布项目画布。用于对比 plans/sprints 与当前实现、检查任务或模块漂移、生成 Sprint HTML 看板、绘制当前/目标模块交互图、同步 Canvas 小组件，或修复这些视图的数据不一致。
---

# Innate Project Canvas

从仓库根目录运行命令。所有生成物来自同一份 `project-snapshot.json`；不要手工修改 `out/`。

## 选择模式

- 只检查，不写文件：运行 `pnpm --filter @innate-labs/project-canvas audit`。
- 更新本地 HTML 和快照：运行 `pnpm --filter @innate-labs/project-canvas sync`。
- 审计未通过但用户需要预览：运行 `pnpm --filter @innate-labs/project-canvas sync:preview`，并明确报告错误。
- 检查已有快照：运行 `pnpm exec tsx innate-project-canvas/src/cli.ts validate <snapshot> --root .`。
- 比较两份快照：运行 `pnpm exec tsx innate-project-canvas/src/cli.ts diff <before> <after>`；有变化时退出码为 1。

`sync` 在审计错误存在时拒绝输出。`sync:preview` 仍返回非零退出码，但会生成带错误标记的预览；它不代表发布通过。

## 读取来源

1. 读取 [references/source-map.md](references/source-map.md)，确认字段权威来源和当前提取范围。
2. 读取 [references/snapshot-contract.md](references/snapshot-contract.md)，需要修改数据结构、依赖语义或证据规则时同步更新 TypeScript、JSON Schema 和测试。
3. 合并目标模块时读取现有目标输入及其指向的架构文档，通过 `--target <file>` 显式合并。目标模块不得变成当前态。
4. 设计或修改页面时读取 [references/visual-grammar.md](references/visual-grammar.md)。

## 发布到 Canvas

只在用户指定 Canvas 或明确要求更新现有 Canvas 时执行。先调用 `canvas` 和 `widget` 技能，再读取 [references/publish.md](references/publish.md)。使用刚通过审计的同一份快照，不为每个小组件重新手写任务数字、状态或依赖。保留指定画布上的无关 placements。

## 完成条件

- `audit` 的结构、依赖和证据错误为 0；预览错误必须单独列出。
- `sync` 后检查 `out/project-snapshot.json`、`out/audit.json`、工作台 `out/index.html` 和经典长页 `out/classic.html` 均存在。
- 页面改动后运行本包 `build`、`typecheck`、`test`，并实际打开生成的 HTML，检查默认 Tabs、可选 Sidebar、任务筛选、模块详情、窄屏、长标题和空审计状态。
- 修改任务编辑器后实际验证工具栏选区转换、Markdown 分块、安全链接、快捷键保存、保存后刷新恢复、复制、恢复原始，以及草稿不修改权威文档；不得把 localStorage 草稿当作审计通过的项目状态。
- Canvas 发布后完成 Widget 校验、Canvas 回读和必要的真实截图检查。
- 修改解析或校验规则后增加有效、非法和边界夹具，不以真实仓库偶然通过代替单元测试。
