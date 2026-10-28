# 实现架构

## 数据流

```text
docs/sprints/*.md ───────┐
                        ├─→ buildSnapshot → validate → audit.json
package.json 依赖图 ─────┘        │
目标架构输入（显式） ──────────────┤
                                 ├─→ project-snapshot.json
                                 ├─→ renderSidebarHtml → index.html
                                 └─→ renderHtml → classic.html
```

快照是派生交换格式，不是新的权威文档。生成时间不参与语义快照哈希。Tabs／Sidebar 工作台和经典长页是两个展示适配器，不分别保存任务或模块数据。任务编辑只写浏览器 localStorage，不进入快照或权威文档。

## 代码职责

| 文件 | 职责 |
| --- | --- |
| `src/markdown.ts` | 读取 Sprint 索引和任务字段，提取阻塞边与证据路径 |
| `src/modules.ts` | 从 workspace 包的运行时依赖生成当前模块图 |
| `src/snapshot.ts` | 组合当前与显式目标输入，读取和写入快照所需的边界检查 |
| `src/derive.ts` | 派生 Sprint 完成态、可执行 frontier 和下一任务 |
| `src/validate.ts` | 检查 ID、依赖环、证据、当前/目标关系和文档数字 |
| `src/drift.ts` | 比较两个快照的语义变化 |
| `src/render.ts` | 输出经典长页 HTML、CSS 和 SVG |
| `src/render-sidebar.ts` | 输出 Tabs／Sidebar 多视图、任务筛选和交互模块图；无运行时依赖 |
| `src/workbench.ts` | 提供布局切换、Orca 风格选区工具栏、Markdown 快捷键、安全分块渲染、复制与 localStorage 草稿；无 React／TipTap 依赖 |
| `src/dev-server.ts` | 只读预览 `out/`，支持 CLI host/port 参数和路径越界保护 |
| `src/cli.ts` | 提供 audit、sync、validate、diff、render；原子写入页面 |

## 依赖语义

任务可依赖任务或 Sprint。Sprint 只有在其中所有任务完成后才视为完成。`可执行` 由阻塞边计算，`下一项` 是首个可执行的非可选、非技术债任务，不在源文档中重复保存。

“可与……并行”“不依赖”“建议……之后”不是阻塞边。解析器只提取阻塞语段子句；修改自然语言格式时必须增加夹具。

## 证据语义

未来任务可以登记尚不存在的预期证据路径。只有声明 `done` 的任务强制要求证据存在且非空。证据路径存在不等于验收内容自动正确，真实行为验证仍由对应 Sprint 和项目冒烟流程负责。

## 当前范围与扩展点

第一版自动提取 Sprint 和包依赖，不声称自动理解所有 plans、build-path 或自由文本架构图。目标架构通过带 `SourceRef` 的显式 JSON 输入合并。后续可增加 plans/build-path 适配器，但必须保持同一快照契约和审计门禁。

Canvas 是另一个展示适配器。它消费已通过审计的快照，不反向成为数据源，也不在 `sync` 中隐式修改。
