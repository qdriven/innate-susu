# W1b issue-driven workflow 隔离预演记录

> 本记录使用 Issue #900001 夹具；它不是真实 GitHub Issue。未修改正式 task、产品代码、GitHub 或宿主 Canvas。

- 总结：全部预演步骤符合预期
- 触发技能：`task-workflow`；进入 W1b UI 约束分析时追加 `susu-overview`。
- 正式任务：未发现 W1b 对应的 `docs/sprints/task-*-*.md`。
- GitHub：当前环境没有 `gh`，真实 Issue 关联未能核实；`sync` 必须显式降级。
- 开工门禁：W1a 待执行，W0 产品源码未迁入；正式开工应停在 `blocked`。
- 预演脚本修正：首次执行误将项目根目录上溯两级，复制 Spec 时失败；改为正确定位项目根后重跑，以下 10 步全部符合预期。

## 全过程

### 1. 从隔离 Issue 快照创建 task（不访问 GitHub）

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime create --issue 900001 --source-json issue-fixture.json --repository fixture/rehearsal-only --title W1b Sidebar ContentArea App 拆分（隔离预演）
```

退出码：0（预期 0）

```json
{
  "task": "docs/sprints/task-900001-w1b-sidebar-contentarea-app.md",
  "id": "task-900001-w1b-sidebar-contentarea-app",
  "source": "issue",
  "next": "阅读输入与代码，填写分析后运行 validate --phase analysis"
}
```

### 2. 空白分析必须被 analysis 门禁拒绝

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime validate docs/sprints/task-900001-w1b-sidebar-contentarea-app.md --phase analysis
```

退出码：2（预期 2）

```json
{
  "task": "docs/sprints/task-900001-w1b-sidebar-contentarea-app.md",
  "phase": "analysis",
  "ok": false,
  "errors": [
    "taskContext.problem 必须是非空字符串",
    "taskContext.goal 必须是非空字符串",
    "taskContext.scope 至少一项",
    "globalContext.summary 必须是非空字符串",
    "features 至少一项",
    "modules 至少一项",
    "specs 至少一项；无变化也要记录依据"
  ],
  "warnings": []
}
```

### 3. 无 gh 时 sync 显式降级且不回写

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime sync task-900001-w1b-sidebar-contentarea-app
```

退出码：1（预期 1）

```text
{
  "ok": false,
  "error": "未安装 gh；可离线维护 task，或安装并登录 GitHub CLI 后重试"
}
```

### 4. 模型填写 Context、功能验证、模块、设计影响与 Spec

生成隔离任务：`runtime/docs/sprints/task-900001-w1b-sidebar-contentarea-app.md`

### 5. 完整分析通过 analysis 门禁

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime validate docs/sprints/task-900001-w1b-sidebar-contentarea-app.md --phase analysis
```

退出码：0（预期 0）

```json
{
  "task": "docs/sprints/task-900001-w1b-sidebar-contentarea-app.md",
  "phase": "analysis",
  "ok": true,
  "errors": [],
  "warnings": [
    "modules[0].path 当前不存在：innate-dogic/apps/desktop/src/renderer/App.tsx",
    "modules[2].path 当前不存在：innate-dogic/apps/desktop/src/renderer/pages.ts"
  ]
}
```

### 6. passed 无证据必须被 record 拒绝

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime record task-900001-w1b-sidebar-contentarea-app F1-V1 passed
```

退出码：1（预期 1）

```text
{
  "ok": false,
  "error": "passed 必须至少提供一项 --evidence"
}
```

### 7. Issue 任务未完成且未关联 PR 时 done 门禁拒绝

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime validate docs/sprints/task-900001-w1b-sidebar-contentarea-app.md --phase done
```

退出码：2（预期 2）

```json
{
  "task": "docs/sprints/task-900001-w1b-sidebar-contentarea-app.md",
  "phase": "done",
  "ok": false,
  "errors": [
    "specs[0] 要求的 Spec 更新尚未完成",
    "仍有未完成验证：F1-V1, F1-V2, F2-V1, F3-V1",
    "完成门禁要求 execution.status=done",
    "GitHub Issue 任务的完成门禁要求关联 PR；纯本地任务不要求 PR"
  ],
  "warnings": [
    "modules[0].path 当前不存在：innate-dogic/apps/desktop/src/renderer/App.tsx",
    "modules[2].path 当前不存在：innate-dogic/apps/desktop/src/renderer/pages.ts"
  ]
}
```

### 8. 依赖未满足，状态记录为 blocked 而非 in_progress

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime status task-900001-w1b-sidebar-contentarea-app blocked --note 预演：W1a 未全绿且 W0 产品源码尚未迁入，停止在实施前
```

退出码：0（预期 0）

```json
{
  "ok": true,
  "id": "task-900001-w1b-sidebar-contentarea-app",
  "status": "blocked"
}
```

### 9. 生成单任务四个静态 Canvas 视图

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime render task-900001-w1b-sidebar-contentarea-app
```

退出码：0（预期 0）

```json
{
  "ok": true,
  "manifest": ".task-canvas/task-900001-w1b-sidebar-contentarea-app/canvas.json",
  "widgets": 4,
  "warnings": []
}
```

### 10. 生成跨任务总览

```bash
C:\Users\anyda\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe D:\innate-workspace\framework\innate-desktop\.agents\skills\task-workflow\scripts\task.py --root D:\innate-workspace\framework\innate-desktop\artifacts\task-workflow-w1b-rehearsal\runtime overview
```

退出码：0（预期 0）

```json
{
  "ok": true,
  "tasks": 1,
  "overview": ".task-canvas/tasks-overview.html"
}
```

## 产物边界

- 隔离任务：`runtime/docs/sprints/task-900001-w1b-sidebar-contentarea-app.md`
- 四视图 manifest：`runtime/.task-canvas/task-900001-w1b-sidebar-contentarea-app/canvas.json`
- 静态总览：`runtime/.task-canvas/tasks-overview.html`
- 未执行：W1b 实现、真实验证通过记录、Git/GitHub 写操作、Canvas/Widget 宿主写入。
