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


if __name__ == "__main__":
    unittest.main(verbosity=2)
