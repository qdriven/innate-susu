# task-workflow（原 issue-task-driver）试验全程记录 · W0.1

> 时间：2026-10-28 下午 · 试验对象：`.agents/skills/task-workflow/`（skill + task.py）· 试验载荷：plan W0.1（真实任务，非演示数据）
> 目的：回答「如果开工 W0.1，issue-driver workflow 会做什么」，并实测验证，全程留痕。

## 1. 该 workflow 对一个任务做的事（机制）

| 阶段 | 动作 | 事实源 |
| --- | --- | --- |
| 建档 | `create`（标题/Issue/PR/需求文件四种输入）生成 frontmatter+分节骨架 | `docs/sprints/task-*-*.md`（唯一任务事实源） |
| 分析 | 模型填写 任务上下文/全局上下文/设计影响/功能与验证点/涉及模块/Spec 关联；`validate --phase analysis` 机器把关（如 sourceRefs 至少一项） | 同上 |
| 实施 | `status in_progress` → 按验证点实施 → 每点 `record passed/failed --evidence`（passed 必须有可核查证据） | 同上 |
| 投影 | `render`（单任务 4 视图 HTML）+ `overview`（跨任务总览）→ `.task-canvas/`（纯派生物） | 派生 |
| 收口 | `validate --phase review` → `--phase done`（全部验证收口+Spec 更新+status=done；Issue 任务还须关联 PR） | 同上 |

边界：脚本不做 Git/GitHub 写操作；Canvas 只是投影；与 plan 投影（`docs/susu/plan/canvas/`，S*/T* 前缀）双体系并行、按文件名前缀区分。

## 2. 实测时间线（每步真实命令与结果）

| # | 步骤 | 命令 | 结果 |
| --- | --- | --- | --- |
| 1 | 建档 | `task.py create --title "W0.1 冻结源基线并建立迁移清单"` | 生成 `docs/sprints/task-local-w0-1.md`（draft 骨架） |
| 2 | 填分析 | 手工填写八节 + 10 个验证点（F1-V1、F2-V1~V6、F3-V1~V3） | — |
| 3 | 校验 | `validate --phase analysis` | ❌ `globalContext.sourceRefs 至少一项`（我的「来源」写成了 prose）→ 改为路径列表后 ✅ |
| 4 | 流转 | `status in_progress` | ✅ |
| 5 | 实测门禁（后台） | labs `pnpm build` → `typecheck` → `test` → `check:typescript` | 全 exit 0；build 3m12s |
| 6 | 采集修正① | 发现 `tail -8` 截掉 core/sdk 汇总 → 补跑 `--filter @dogic/core test`（16）、`--filter @dogic/sdk test`（9） | 实测合计 **83/83**（12 文件） |
| 7 | 环境门禁 | `pnpm verify:overlay` | ❌ exit 2（要求显式传 dsh bin.js）→ 从 `D:/pnpm/bin/dsh` shim 反解真实入口重跑 → ✅ **7/7** |
| 8 | 环境门禁 | `pnpm smoke:desktop` | ✅ 真机全过（控制台认证/simple 门控/dev 导航/工作区快照/Git） |
| 9 | 实体证据 | 写 `evidence/W0/{environment,migration-inventory,commands}.md` | labs 零提交以快照+指纹冻结；magpie v0.1.1230 SHA256 ff061131…；白名单 7 项/排除 7 类互斥 |
| 10 | 记录 | `record` ×10 全部 passed 带证据 | ✅ |
| 11 | 校验 | `validate --phase review` | ✅ 0 错误 |
| 12 | 流转+投影 | `status in_review`；`render`（4 widgets）；`overview`（3 任务） | `.task-canvas/task-local-w0-1/{context,features,architecture,delivery}.html` + `tasks-overview.html` |

## 3. 试验发现（workflow 质量反馈）

**好用的**：
- 验证点-证据强绑定（passed 必须留证据字符串）与 plan 的 DoD 纪律同构，双体系不打架（task-*.md 管单任务过程，plan/canvas 管 71 卡推进面）。
- validate 的机器把关真实有效：第 3 步抓出我格式错误；review 阶段复查证据完整性。
- record/status 只改 frontmatter 与验证点行，手工编辑正文安全。

**待改进（记录在案，不在本任务修）**：
1. `record` 输出是 JSON 块，10 连发时噪声大；可加 `--quiet`。
2. 采集门禁输出时管道 tail 会截汇总（本试验第 6 步踩坑）——W0.5 迁移工具时把「全量输出落文件 + 从文件提取汇总」写成工具约定。
3. `verify:overlay` 依赖手工传 dsh 入口；建议 W0.5 内置 shim 反解（本试验已验证反解路径可行）。
4. labs 仓零提交——建议 W0.2 完成后对 labs 做初始 commit 形成冻结点（已写入 environment.md 建议，待用户确认）。

## 4. 结论

W0.1 六门禁全绿、83 项实测通过、迁移清单复核完成，任务处于 `in_review` 等人工确认；确认后 `status done`，并把 plan 投影 `canvas/docs/sprints/S0` 的 T0.1 置「已完成」+ audit/sync 刷新推进面到 T0.2（W0.2 源仓脱敏修复）。
