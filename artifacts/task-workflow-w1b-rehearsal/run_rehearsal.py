#!/usr/bin/env python3
"""Isolated W1b issue-driven task-workflow rehearsal; never touches product tasks/code."""
from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
RUNTIME = HERE / "runtime"
TASK_PY = PROJECT / ".agents/skills/task-workflow/scripts/task.py"
TASK_ID = "task-900001-w1b-sidebar-contentarea-app"
TASK_REF = f"docs/sprints/{TASK_ID}.md"


def dump(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


if RUNTIME.exists():
    shutil.rmtree(RUNTIME)
(RUNTIME / "docs/susu/plan/phases").mkdir(parents=True)
(RUNTIME / "docs/sprints").mkdir(parents=True)
shutil.copy2(PROJECT / "docs/susu/plan/phases/W1-shell.md", RUNTIME / "docs/susu/plan/phases/W1-shell.md")
shutil.copy2(PROJECT / "docs/CONTEXT.md", RUNTIME / "docs/CONTEXT.md")

issue_fixture = {
    "number": 900001,
    "title": "W1b Sidebar ContentArea App 拆分（隔离预演）",
    "body": "TEST FIXTURE ONLY，不是真实 GitHub Issue。内容取自 docs/susu/plan/phases/W1-shell.md 的 W1b.1。",
    "url": None,
    "state": "open",
    "updatedAt": None,
}
(RUNTIME / "issue-fixture.json").write_text(dump(issue_fixture), encoding="utf-8")

records: list[dict] = []


def run(name: str, args: list[str], expected: int) -> dict:
    result = subprocess.run(args, cwd=PROJECT, text=True, encoding="utf-8", capture_output=True, check=False)
    record = {
        "step": len(records) + 1,
        "name": name,
        "command": args,
        "expectedExitCode": expected,
        "actualExitCode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "passed": result.returncode == expected,
    }
    records.append(record)
    if result.returncode != expected:
        raise RuntimeError(f"{name}: expected {expected}, got {result.returncode}\n{result.stdout}\n{result.stderr}")
    return record


def cli(*args: str) -> list[str]:
    return [sys.executable, str(TASK_PY), "--root", str(RUNTIME), *args]


run(
    "从隔离 Issue 快照创建 task（不访问 GitHub）",
    cli(
        "create", "--issue", "900001", "--source-json", "issue-fixture.json",
        "--repository", "fixture/rehearsal-only", "--title", issue_fixture["title"],
    ),
    0,
)
run("空白分析必须被 analysis 门禁拒绝", cli("validate", TASK_REF, "--phase", "analysis"), 2)
if shutil.which("gh") is None:
    run("无 gh 时 sync 显式降级且不回写", cli("sync", TASK_ID), 1)
else:
    records.append({"step": len(records) + 1, "name": "sync", "passed": True, "skipped": "gh 存在；避免对夹具 Issue 发起网络请求"})

spec = importlib.util.spec_from_file_location("task_workflow_rehearsal", TASK_PY)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
task_path = RUNTIME / TASK_REF
task, parse_warnings = module.load_task(task_path)
assert not parse_warnings
task["taskContext"] = {
    "problem": "计划要求把桌面壳组合抽取为 Sidebar、ContentArea 与 RightPanelHost；当前仓库尚未迁入 W0 产品源码。",
    "goal": "在不改变 Surface 与 DSH/magpie 协议的前提下形成三栏壳，并保留原有页面门控和行为。",
    "scope": ["抽取壳组合", "扩展 pages slot/mode 元数据", "增加可拆卸右栏空容器", "补行为与负路径验证"],
    "nonGoals": ["不实现 W1c 多标签", "不修改 DSH/magpie 启动协议", "不自绘 Sidebar primitive"],
    "dependencies": ["W1a 全绿；当前状态板仍为待执行，开工门禁未满足"],
    "assumptions": [],
    "openQuestions": ["真实 Issue 关联需在 gh 可用后确认；本任务仅使用隔离夹具"],
}
task["globalContext"] = {
    "summary": "W1b 只改变 desktop renderer 的组合边界，继续使用 @innate/ui primitive 与语义 token，不改变 Surface、DSH 或 magpie 契约。",
    "sourceRefs": ["docs/CONTEXT.md", "docs/susu/plan/phases/W1-shell.md"],
    "constraints": ["primitive 唯一来源为 @innate/ui", "simple/dev 门控不回退", "renderer 不获得 Node/shell", "未经要求不执行 Git/GitHub 写操作"],
    "updateRequired": False,
    "updatePlan": "无；W1b 是既定壳组合计划，不新增全局架构事实",
}
task["designAnalysis"] = {
    "affected": True,
    "currentBehavior": "计划现状为 App 直接组合各块壳 UI；当前仓库尚未迁入 W0 产品源码，需在依赖完成后复核实现。",
    "proposedBehavior": "App 只保留组合与顶层状态，Sidebar、ContentArea、RightPanelHost 分别承担壳区域。",
    "decisions": ["直接消费 @innate/ui Sidebar primitive", "pages 只扩展 slot/mode 元数据，页面 id 与门控不变", "右栏只建可拆卸空容器"],
    "risks": ["W0/W1a 未完成导致源码与行为基线缺失", "导航或 simple/dev 门控回归"],
    "globalContextImpact": "不改变全局架构；完成后按证据同步阶段状态与关联 Spec",
}
task["features"] = [
    {
        "id": "F1", "title": "抽取 Sidebar 与 ContentArea 壳组合", "goal": "三栏可运行且 App 不再直接实现每块壳 UI",
        "moduleRefs": ["M1", "M2"], "specRefs": ["S1"],
        "verification": [
            {"id": "F1-V1", "status": "pending", "statement": "导航、模式切换、窗口控制与状态轮询行为不回退", "method": "复用 W1a 行为断言并运行桌面冒烟", "evidence": []},
            {"id": "F1-V2", "status": "pending", "statement": "删除一个可选页面注册时壳仍启动", "method": "运行可选页面缺失的负路径单测", "evidence": []},
        ],
    },
    {
        "id": "F2", "title": "扩展 pages slot/mode 元数据", "goal": "保持页面 id 和 simple/dev 门控不变",
        "moduleRefs": ["M3"], "specRefs": ["S1"],
        "verification": [{"id": "F2-V1", "status": "pending", "statement": "simple 隐藏开发 Panel 和入口，dev 保留现有功能", "method": "运行注册表与两种模式的页面集合测试", "evidence": []}],
    },
    {
        "id": "F3", "title": "增加可拆卸 RightPanelHost 空容器", "goal": "为 W3 提供右栏挂载点但本门不实现业务 Panel",
        "moduleRefs": ["M2", "M4"], "specRefs": ["S1"],
        "verification": [{"id": "F3-V1", "status": "pending", "statement": "右栏容器可拆卸且 W0 冒烟全绿", "method": "运行容器生命周期测试与 W0 桌面冒烟", "evidence": []}],
    },
]
task["modules"] = [
    {"id": "M1", "change": "modify", "path": "innate-dogic/apps/desktop/src/renderer/App.tsx", "reason": "收敛为壳组合与顶层状态；目标文件需由 W0/W1a 提供"},
    {"id": "M2", "change": "add", "path": "innate-dogic/apps/desktop/src/renderer/shell", "reason": "承载 Sidebar、ContentArea 与 RightPanelHost 组合"},
    {"id": "M3", "change": "modify", "path": "innate-dogic/apps/desktop/src/renderer/pages.ts", "reason": "扩展 slot/mode 元数据；目标文件需由 W0/W1a 提供"},
    {"id": "M4", "change": "add", "path": "innate-dogic/apps/desktop/src/renderer/shell.test.tsx", "reason": "覆盖壳组合、门控和可选页面缺失负路径"},
]
task["specs"] = [
    {"id": "S1", "change": "modify", "updateStatus": "pending", "path": "docs/susu/plan/phases/W1-shell.md", "relevance": "W1b.1 的直接设计与验收 Spec"},
    {"id": "S2", "change": "none", "updateStatus": "not_applicable", "path": "docs/CONTEXT.md", "relevance": "全局架构与协议不变"},
]
task["execution"]["status"] = "analyzed"
task["execution"]["notes"] = ["隔离预演：仅填写分析与验证计划，不实施 W1b"]
module.save_text(task_path, module.task_markdown(task))
records.append({"step": len(records) + 1, "name": "模型填写 Context、功能验证、模块、设计影响与 Spec", "passed": True, "task": TASK_REF})

run("完整分析通过 analysis 门禁", cli("validate", TASK_REF, "--phase", "analysis"), 0)
run("passed 无证据必须被 record 拒绝", cli("record", TASK_ID, "F1-V1", "passed"), 1)
run("Issue 任务未完成且未关联 PR 时 done 门禁拒绝", cli("validate", TASK_REF, "--phase", "done"), 2)
run("依赖未满足，状态记录为 blocked 而非 in_progress", cli("status", TASK_ID, "blocked", "--note", "预演：W1a 未全绿且 W0 产品源码尚未迁入，停止在实施前"), 0)
run("生成单任务四个静态 Canvas 视图", cli("render", TASK_ID), 0)
run("生成跨任务总览", cli("overview"), 0)

manifest_path = RUNTIME / ".task-canvas" / TASK_ID / "canvas.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
expected_files = {"canvas.json", "context.html", "features.html", "architecture.html", "delivery.html"}
actual_files = {path.name for path in manifest_path.parent.iterdir() if path.is_file()}
assert actual_files == expected_files, (actual_files, expected_files)
assert len(manifest["canvas"]["widgets"]) == 4

summary = {
    "schemaVersion": "1.0.0",
    "kind": "isolated-rehearsal",
    "startedBy": "用户要求测试 W1b issue-driven workflow 并记录全过程",
    "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "project": str(PROJECT),
    "runtime": str(RUNTIME),
    "taskId": TASK_ID,
    "issueFixture": 900001,
    "realGithubWrites": False,
    "productCodeChanges": False,
    "formalTaskChanges": False,
    "canvasHostChanges": False,
    "skillsTriggered": ["task-workflow", "susu-overview"],
    "observations": {
        "formalW1bTaskExists": False,
        "ghAvailable": shutil.which("gh") is not None,
        "w1aStatus": "待执行",
        "productSourcePresent": False,
        "recommendedFormalStatus": "blocked",
    },
    "records": records,
    "passed": all(record.get("passed") for record in records),
}
(HERE / "run-log.json").write_text(dump(summary), encoding="utf-8")

lines = [
    "# W1b issue-driven workflow 隔离预演记录", "",
    "> 本记录使用 Issue #900001 夹具；它不是真实 GitHub Issue。未修改正式 task、产品代码、GitHub 或宿主 Canvas。", "",
    f"- 总结：{'全部预演步骤符合预期' if summary['passed'] else '存在失败步骤'}",
    "- 触发技能：`task-workflow`；进入 W1b UI 约束分析时追加 `susu-overview`。",
    "- 正式任务：未发现 W1b 对应的 `docs/sprints/task-*-*.md`。",
    "- GitHub：当前环境没有 `gh`，真实 Issue 关联未能核实；`sync` 必须显式降级。",
    "- 开工门禁：W1a 待执行，W0 产品源码未迁入；正式开工应停在 `blocked`。",
    "- 预演脚本修正：首次执行误将项目根目录上溯两级，复制 Spec 时失败；改为正确定位项目根后重跑，以下 10 步全部符合预期。", "",
    "## 全过程", "",
]
for record in records:
    lines.append(f"### {record['step']}. {record['name']}")
    lines.append("")
    if record.get("skipped"):
        lines.append(f"跳过：{record['skipped']}")
    if record.get("command"):
        lines += ["```bash", " ".join(record["command"]), "```", "", f"退出码：{record['actualExitCode']}（预期 {record['expectedExitCode']}）", ""]
        if record.get("stdout"):
            lines += ["```json", record["stdout"].rstrip(), "```", ""]
        if record.get("stderr"):
            lines += ["```text", record["stderr"].rstrip(), "```", ""]
    if record.get("task"):
        lines.append(f"生成隔离任务：`runtime/{record['task']}`")
        lines.append("")
lines += [
    "## 产物边界", "",
    f"- 隔离任务：`runtime/{TASK_REF}`",
    f"- 四视图 manifest：`runtime/.task-canvas/{TASK_ID}/canvas.json`",
    "- 静态总览：`runtime/.task-canvas/tasks-overview.html`",
    "- 未执行：W1b 实现、真实验证通过记录、Git/GitHub 写操作、Canvas/Widget 宿主写入。", "",
]
(HERE / "run-log.md").write_text("\n".join(lines), encoding="utf-8")
print(dump({"ok": summary["passed"], "steps": len(records), "log": str(HERE / "run-log.md"), "task": str(task_path), "widgets": 4}), end="")
