#!/usr/bin/env python3
import copy
import importlib.util
import json
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("task.py")
SPEC = importlib.util.spec_from_file_location("issue_task_driver", SCRIPT)
task_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(task_module)


def valid_task():
    task = task_module.template()
    task.update({"id": "task-1-demo", "title": "测试任务", "createdAt": "now", "updatedAt": "now"})
    task["github"]["issue"] = {"number": 1, "url": None, "title": "登录", "state": "open", "body": "issue 正文", "updatedAt": None}
    task["github"]["pr"] = {"number": 9, "url": None, "title": "PR", "state": "open", "body": None, "updatedAt": None}
    task["taskContext"].update({"problem": "问题", "goal": "目标", "scope": ["范围"]})
    task["globalContext"]["summary"] = "全局上下文"
    task["designAnalysis"].update({"affected": True, "currentBehavior": "现状", "proposedBehavior": "目标行为", "decisions": ["决策"]})
    task["features"] = [{"id": "F1", "title": "功能", "goal": "功能目标", "moduleRefs": ["M1"], "specRefs": ["S1"], "verification": [{"id": "F1-V1", "statement": "可观察结果", "method": "运行测试", "status": "pending", "evidence": []}]}]
    task["modules"] = [{"id": "M1", "path": "module", "change": "add", "reason": "新增"}]
    task["specs"] = [
        {"id": "S1", "path": "docs/spec.md", "change": "modify", "relevance": "相关设计", "updateStatus": "pending"},
        {"id": "S2", "path": "docs/CONTEXT.md", "change": "none", "relevance": "不改变产品事实", "updateStatus": "not_applicable"},
    ]
    return task


class TaskDriverTests(unittest.TestCase):
    def setUp(self):
        workspace = Path(__file__).resolve().parents[4]
        (workspace / ".tmp").mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=workspace / ".tmp")
        self.root = Path(self.temp.name)
        (self.root / "docs").mkdir()
        (self.root / "docs/spec.md").write_text("spec", encoding="utf-8")
        (self.root / "docs/CONTEXT.md").write_text("context", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def task_file(self) -> Path:
        return self.root / "docs/sprints/task-1-demo.md"

    def write_task(self, task=None) -> dict:
        task = task or valid_task()
        self.task_file().parent.mkdir(parents=True, exist_ok=True)
        self.task_file().write_text(task_module.task_markdown(task), encoding="utf-8")
        return task

    def test_create_uses_sprints_path_and_refuses_overwrite(self):
        args = Namespace(id=None, title="标题", issue="1", pr=None, repository=None, source_json=None, force=False)
        result = task_module.command_create(args, self.root)
        self.assertTrue(result["task"].startswith("docs/sprints/task-1-"))
        created = self.root / result["task"]
        self.assertTrue(created.exists())
        original = created.read_text(encoding="utf-8")
        with self.assertRaises(ValueError):
            task_module.command_create(args, self.root)
        self.assertEqual(original, created.read_text(encoding="utf-8"))

    def test_markdown_roundtrip_preserves_analysis(self):
        task = self.write_task()
        loaded, warnings = task_module.load_task(self.task_file())
        self.assertEqual([], warnings)
        self.assertEqual(task["id"], loaded["id"])
        self.assertEqual(task["github"]["issue"]["number"], loaded["github"]["issue"]["number"])
        self.assertEqual("issue 正文", loaded["github"]["issue"]["body"])
        self.assertEqual(task["taskContext"]["scope"], loaded["taskContext"]["scope"])
        self.assertEqual(task["globalContext"]["sourceRefs"], loaded["globalContext"]["sourceRefs"])
        feature = loaded["features"][0]
        self.assertEqual("F1", feature["id"])
        self.assertEqual(["M1"], feature["moduleRefs"])
        verification = feature["verification"][0]
        self.assertEqual(("F1-V1", "pending", "运行测试"), (verification["id"], verification["status"], verification["method"]))
        self.assertEqual(task["modules"][0], loaded["modules"][0])
        self.assertEqual(task["specs"][0]["updateStatus"], loaded["specs"][0]["updateStatus"])
        self.assertEqual("none", loaded["specs"][1]["change"])
        self.assertEqual("not_applicable", loaded["specs"][1]["updateStatus"])

    def test_analysis_rejects_missing_verification_and_unknown_module(self):
        task = valid_task()
        task["features"][0]["verification"] = []
        task["features"][0]["moduleRefs"] = ["missing"]
        errors, _ = task_module.validate_task(task, self.root, "analysis")
        self.assertTrue(any("verification" in error for error in errors))
        self.assertTrue(any("未知模块" in error for error in errors))

    def test_design_change_requires_spec_update(self):
        task = valid_task()
        task["specs"][0]["change"] = "none"
        errors, _ = task_module.validate_task(task, self.root, "analysis")
        self.assertTrue(any("设计受影响" in error for error in errors))

    def test_render_creates_four_views_and_escapes_html(self):
        task = self.write_task()
        task["features"][0]["title"] = "<img src=x onerror=alert(1)>"
        self.task_file().write_text(task_module.task_markdown(task), encoding="utf-8")
        result = task_module.command_render(Namespace(task="task-1-demo", output=None), self.root)
        self.assertEqual(4, result["widgets"])
        output = self.root / ".task-canvas/task-1-demo"
        self.assertTrue((output / "canvas.json").exists())
        for key in task_module.SECTION_ORDER:
            self.assertTrue((output / f"{key}.html").exists())
        rendered = (output / "features.html").read_text(encoding="utf-8")
        self.assertNotIn("<img src=x", rendered)
        self.assertIn("&lt;img src=x", rendered)

    def test_record_requires_evidence_and_done_requires_pr(self):
        self.write_task()
        with self.assertRaises(ValueError):
            task_module.command_record(Namespace(task="task-1-demo", verification="F1-V1", status="passed", evidence=[]), self.root)
        task = valid_task()
        task["features"][0]["verification"][0].update({"status": "passed", "evidence": ["test ok"]})
        task["execution"]["status"] = "done"
        task["github"]["pr"] = None
        errors, _ = task_module.validate_task(task, self.root, "done")
        self.assertTrue(any("关联 PR" in error for error in errors))

    def test_sync_without_gh_preserves_analysis(self):
        self.write_task()
        before = copy.deepcopy(valid_task()["taskContext"])
        with patch.object(task_module.shutil, "which", return_value=None):
            with self.assertRaises(ValueError):
                task_module.command_sync(Namespace(task="task-1-demo"), self.root)
        loaded, _ = task_module.load_task(self.task_file())
        self.assertEqual(before, loaded["taskContext"])

    def test_sync_reports_drift_when_pr_merged(self):
        self.write_task()
        fresh = {"number": 9, "title": "PR", "body": None, "url": None, "state": "merged", "updatedAt": None}
        with patch.object(task_module, "gh_view", return_value=fresh):
            result = task_module.command_sync(Namespace(task="task-1-demo"), self.root)
        self.assertTrue(any("PR 已 merged" in warning for warning in result["warnings"]))
        loaded, _ = task_module.load_task(self.task_file())
        self.assertEqual(9, loaded["github"]["pr"]["number"])
        self.assertEqual("merged", loaded["github"]["pr"]["state"])

    def test_overview_lists_all_tasks(self):
        self.write_task()
        result = task_module.command_overview(Namespace(output=None), self.root)
        self.assertEqual(1, result["tasks"])
        overview = self.root / ".task-canvas/tasks-overview.html"
        self.assertTrue(overview.exists())
        content = overview.read_text(encoding="utf-8")
        self.assertIn("task-1-demo", content)
        self.assertIn("0/1", content)

    def test_migrate_converts_legacy_json(self):
        legacy = valid_task()
        legacy["id"] = "issue-1"
        (self.root / "tasks").mkdir()
        (self.root / "tasks/issue-1.task.json").write_text(json.dumps(legacy, ensure_ascii=False), encoding="utf-8")
        result = task_module.command_migrate(Namespace(json="tasks/issue-1.task.json", force=False), self.root)
        self.assertTrue(result["task"].startswith("docs/sprints/task-issue-1"))
        loaded, warnings = task_module.load_task(self.root / result["task"])
        self.assertEqual([], warnings)
        self.assertEqual("F1", loaded["features"][0]["id"])
        self.assertTrue((self.root / "tasks/issue-1.task.json").exists())

    def test_create_from_file_without_issue_preserves_source(self):
        request = self.root / "docs/request.md"
        request.write_text("# 本地需求\n\n不经过 Issue，直接执行这个文件。", encoding="utf-8")
        args = Namespace(id=None, title=None, issue=None, pr=None, repository=None, from_file="docs/request.md", source_json=None, force=False)
        result = task_module.command_create(args, self.root)
        self.assertEqual("file", result["source"])
        loaded, warnings = task_module.load_task(self.root / result["task"])
        self.assertEqual([], warnings)
        self.assertEqual("本地需求", loaded["title"])
        self.assertEqual("docs/request.md", loaded["source"]["path"])
        self.assertIn("不经过 Issue", loaded["source"]["content"])
        self.assertIsNone(loaded["github"]["issue"])

    def test_existing_task_file_can_be_validated_directly(self):
        self.write_task()
        result = task_module.command_validate(Namespace(task="docs/sprints/task-1-demo.md", phase="analysis"), self.root)
        self.assertTrue(result["ok"])
        self.assertEqual("docs/sprints/task-1-demo.md", result["task"])

    def test_local_done_does_not_require_pr(self):
        task = valid_task()
        task["github"]["issue"] = None
        task["github"]["pr"] = None
        task["features"][0]["verification"][0].update({"status": "passed", "evidence": ["test ok"]})
        task["specs"][0]["updateStatus"] = "done"
        task["execution"]["status"] = "done"
        errors, _ = task_module.validate_task(task, self.root, "done")
        self.assertEqual([], errors)


    def valid_sprint(self) -> dict:
        sprint = task_module.sprint_template()
        sprint.update({"id": "sprint-w1b", "title": "W1b 壳组合", "createdAt": "now", "updatedAt": "now"})
        sprint["taskContext"].update({"problem": "大任务问题", "goal": "拆解目标", "scope": ["两个子任务"]})
        sprint["globalContext"]["summary"] = "Sprint 全局上下文"
        sprint["designAnalysis"].update({"affected": True, "currentBehavior": "现状", "proposedBehavior": "目标", "decisions": ["先拆解"]})
        sprint["specs"] = [{"id": "S1", "path": "docs/spec.md", "change": "modify", "relevance": "Sprint Spec", "updateStatus": "pending"}]
        return sprint

    def write_sprint(self) -> Path:
        path = self.root / "docs/sprints/w1b/README.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(task_module.sprint_markdown(self.valid_sprint()), encoding="utf-8")
        return path

    def sprint_args(self, **overrides) -> Namespace:
        values = {"id": "w1b", "title": "W1b 壳组合", "issue": None, "repository": None, "from_file": None, "source_json": None}
        values.update(overrides)
        return Namespace(**values)

    def child_args(self, task_id: str, title: str, sprint="w1b") -> Namespace:
        return Namespace(id=task_id, title=title, issue=None, pr=None, repository=None, from_file=None, source_json=None, force=False, sprint=sprint)

    def add_valid_child(self, task_id="local-child-one", title="子任务一") -> dict:
        result = task_module.command_create(self.child_args(task_id, title), self.root)
        path = self.root / result["task"]
        task = valid_task()
        task["id"] = result["id"]
        task["title"] = title
        path.write_text(task_module.task_markdown(task), encoding="utf-8")
        return result

    def test_create_sprint_preserves_source_and_refuses_overwrite(self):
        request = self.root / "docs/w1b.md"
        request.write_text("# W1b 壳组合\n\n先拆成多个子任务。", encoding="utf-8")
        args = self.sprint_args(title=None, from_file="docs/w1b.md")
        result = task_module.command_create_sprint(args, self.root)
        path = self.root / result["sprint"]
        sprint, warnings = task_module.load_sprint(path)
        self.assertEqual([], warnings)
        self.assertEqual("file", sprint["source"]["kind"])
        self.assertIn("先拆成多个子任务", sprint["source"]["content"])
        with self.assertRaises(ValueError):
            task_module.command_create_sprint(args, self.root)

    def test_create_child_registers_index_and_supports_recursive_commands(self):
        self.write_sprint()
        first = self.add_valid_child()
        second = task_module.command_create(self.child_args("local-child-two", "子任务二"), self.root)
        self.assertEqual("T1", first["sprintTaskRef"])
        self.assertEqual("T2", second["sprintTaskRef"])
        sprint, warnings = task_module.load_sprint(self.root / "docs/sprints/w1b/README.md")
        self.assertEqual([], warnings)
        self.assertEqual(["T1", "T2"], [item["ref"] for item in sprint["tasks"]])
        result = task_module.command_validate(Namespace(task=first["id"], phase="analysis"), self.root)
        self.assertTrue(result["ok"])
        overview = task_module.command_overview(Namespace(output=None), self.root)
        self.assertEqual(2, overview["tasks"])

    def test_validate_sprint_checks_context_and_child_analysis(self):
        task_module.command_create_sprint(self.sprint_args(), self.root)
        path = self.root / "docs/sprints/w1b/README.md"
        sprint, _ = task_module.load_sprint(path)
        errors, _ = task_module.validate_sprint(sprint, path, self.root, "analysis")
        self.assertTrue(any("tasks 至少一项" in error for error in errors))
        task_module.command_create(self.child_args("local-child-one", "子任务一"), self.root)
        sprint, _ = task_module.load_sprint(path)
        errors, _ = task_module.validate_sprint(sprint, path, self.root, "analysis")
        self.assertTrue(any("taskContext.problem" in error for error in errors))
        valid_sprint = self.valid_sprint()
        valid_sprint["tasks"] = sprint["tasks"]
        path.write_text(task_module.sprint_markdown(valid_sprint), encoding="utf-8")
        child = valid_task()
        child["id"] = "task-local-child-one"
        (path.parent / "task-local-child-one.md").write_text(task_module.task_markdown(child), encoding="utf-8")
        sprint, _ = task_module.load_sprint(path)
        errors, warnings = task_module.validate_sprint(sprint, path, self.root, "analysis")
        self.assertEqual([], errors)
        self.assertEqual([], warnings)

    def test_render_sprint_creates_four_views_and_escapes_html(self):
        self.write_sprint()
        result = self.add_valid_child(title="<img src=x onerror=alert(1)>")
        self.assertEqual("task-local-child-one", result["id"])
        rendered = task_module.command_render_sprint(Namespace(sprint="w1b", output=None), self.root)
        self.assertEqual(4, rendered["widgets"])
        output = self.root / ".task-canvas/sprint-w1b"
        manifest = json.loads((output / "canvas.json").read_text(encoding="utf-8"))
        self.assertEqual("sprint-w1b", manifest["sprintId"])
        for key in ("context", "tasks", "architecture", "delivery"):
            self.assertTrue((output / f"{key}.html").exists())
        tasks_html = (output / "tasks.html").read_text(encoding="utf-8")
        self.assertNotIn("<img src=x", tasks_html)
        self.assertIn("&lt;img src=x", tasks_html)

    def test_duplicate_nested_task_id_requires_full_path(self):
        for directory in ("w1b", "w1c"):
            path = self.root / f"docs/sprints/{directory}/task-1-demo.md"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(task_module.task_markdown(valid_task()), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "task id 不唯一"):
            task_module.task_path(self.root, "task-1-demo")

    def test_single_task_create_does_not_create_sprint_directory(self):
        args = Namespace(id=None, title="single task", issue=None, pr=None, repository=None, from_file=None, source_json=None, force=False, sprint=None)
        result = task_module.command_create(args, self.root)
        self.assertEqual("docs/sprints/task-local-single-task.md", result["task"])
        entries = list((self.root / "docs/sprints").iterdir())
        self.assertEqual(1, len(entries))
        self.assertTrue(entries[0].is_file())
        self.assertFalse((self.root / "docs/sprints/w1b/README.md").exists())

    def test_skill_defines_sprint_stop_and_explicit_run_all_exception(self):
        skill = (Path(__file__).resolve().parents[1] / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("不创建 Sprint 目录、README 或 Sprint Canvas", skill)
        self.assertIn("默认到此停止", skill)
        self.assertIn("全部任务全部做完", skill)
        self.assertIn("只有用户选择子 task 或明确要求全部完成时才继续", skill)


if __name__ == "__main__":
    unittest.main(verbosity=2)
