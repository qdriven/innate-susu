#!/usr/bin/env python3
"""Unified local/GitHub task files (docs/sprints/task-*-*.md) and Canvas projection. Standard library only."""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SCHEMA_VERSION = "1.0.0"
STATUSES = {"draft", "analyzed", "in_progress", "blocked", "in_review", "done"}
VERIFICATION_STATUSES = {"pending", "passed", "failed", "not_applicable"}
SECTION_ORDER = ("context", "features", "architecture", "delivery")
TASK_DIR = "docs/sprints"
TASK_GLOB = "task-*.md"
STEM_RE = re.compile(r"task-[a-z0-9]+(-[a-z0-9]+)+")
MODULE_CHANGE = {"add", "modify", "delete", "none"}
SPEC_CHANGE = {"none", "add", "modify"}
SPEC_UPDATE = {"pending", "in_progress", "done", "not_applicable"}


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def dump(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def inline(value: object) -> str:
    """Single-line safe text: no newlines, no leading markdown headers."""
    text = " ".join(str(value if value is not None else "").split())
    return re.sub(r"^#+\s*", "", text).strip()


def save_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
        os.replace(tmp_name, path)
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)


def save_json(path: Path, value: object) -> None:
    save_text(path, dump(value))


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"文件不存在：{path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON 格式错误：{path}:{exc.lineno}:{exc.colno} {exc.msg}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"顶层必须是 JSON object：{path}")
    return value


def task_path(root: Path, ref: str) -> Path:
    candidate = Path(ref)
    if candidate.suffix == ".md" or candidate.suffix == ".json" or candidate.is_absolute() or len(candidate.parts) > 1:
        path = candidate if candidate.is_absolute() else root / candidate
        if path.suffix == ".json":
            path = path.with_suffix(".md")
    else:
        path = root / TASK_DIR / f"{ref}.md"
    path = path.resolve()
    try:
        path.relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError("task 文件必须位于当前项目内") from exc
    return path


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return value[:48] or "local-task"


def ref_number(value: str | None) -> int | None:
    if not value:
        return None
    if value.isdigit():
        return int(value)
    match = re.search(r"/(?:issues|pull)/(\d+)(?:/|$)", value)
    if match:
        return int(match.group(1))
    raise ValueError(f"无法从 {value!r} 解析 Issue/PR 编号")


def github_ref(value: str | None) -> dict | None:
    if not value:
        return None
    return {
        "number": ref_number(value),
        "url": value if value.startswith(("https://", "http://")) else None,
        "title": None,
        "state": "unknown",
        "body": None,
        "updatedAt": None,
    }


def template() -> dict:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "id": "",
        "title": "",
        "createdAt": "",
        "updatedAt": "",
        "source": {"kind": "local", "path": None, "content": None},
        "github": {"repository": None, "issue": None, "pr": None},
        "taskContext": {
            "problem": "",
            "goal": "",
            "scope": [],
            "nonGoals": [],
            "dependencies": [],
            "assumptions": [],
            "openQuestions": [],
        },
        "globalContext": {
            "summary": "",
            "sourceRefs": ["docs/CONTEXT.md", "docs/README.md"],
            "constraints": [],
            "updateRequired": False,
            "updatePlan": "无",
        },
        "designAnalysis": {
            "affected": False,
            "currentBehavior": "",
            "proposedBehavior": "",
            "decisions": [],
            "risks": [],
            "globalContextImpact": "无",
        },
        "features": [],
        "modules": [],
        "specs": [],
        "execution": {"status": "draft", "branch": None, "notes": []},
    }


# ---------------------------------------------------------------- markdown storage

FRONT_FIELDS = (
    "schemaVersion", "id", "title", "createdAt", "updatedAt", "status", "branch", "repository",
    "sourceKind", "sourcePath",
    "issueNumber", "issueUrl", "issueState", "issueTitle", "issueUpdatedAt",
    "prNumber", "prUrl", "prState", "prTitle", "prUpdatedAt",
)


def _write_list(lines: list[str], items: list) -> None:
    for item in items:
        text = inline(item)
        if text:
            lines.append(f"- {text}")


def _write_scalar(lines: list[str], value: object) -> None:
    text = inline(value)
    if text:
        lines.append(text)


def task_markdown(task: dict) -> str:
    """Canonical Markdown writer; the script is the single writer of this format."""
    github = task.get("github", {})
    source = task.get("source", {})
    issue, pr = github.get("issue") or {}, github.get("pr") or {}
    context, glob = task.get("taskContext", {}), task.get("globalContext", {})
    design = task.get("designAnalysis", {})
    execution = task.get("execution", {})
    fm = {
        "schemaVersion": task.get("schemaVersion", SCHEMA_VERSION),
        "id": task.get("id", ""),
        "title": task.get("title", ""),
        "createdAt": task.get("createdAt", ""),
        "updatedAt": task.get("updatedAt", ""),
        "status": execution.get("status", "draft"),
        "branch": execution.get("branch"),
        "repository": github.get("repository"),
        "sourceKind": source.get("kind", "local"),
        "sourcePath": source.get("path"),
        "issueNumber": issue.get("number"),
        "issueUrl": issue.get("url"),
        "issueState": issue.get("state"),
        "issueTitle": issue.get("title"),
        "issueUpdatedAt": issue.get("updatedAt"),
        "prNumber": pr.get("number"),
        "prUrl": pr.get("url"),
        "prState": pr.get("state"),
        "prTitle": pr.get("title"),
        "prUpdatedAt": pr.get("updatedAt"),
    }
    lines = ["---"]
    for key in FRONT_FIELDS:
        value = fm.get(key)
        lines.append(f"{key}: {inline(value)}" if value is not None else f"{key}: ")
    lines.append("---")
    lines.append("")

    lines += ["## 任务上下文", "", "### 问题", ""]
    _write_scalar(lines, context.get("problem"))
    lines += ["", "### 目标", ""]
    _write_scalar(lines, context.get("goal"))
    for key, label in (("scope", "范围"), ("nonGoals", "非目标"), ("dependencies", "依赖"), ("assumptions", "假设"), ("openQuestions", "未决问题")):
        lines += ["", f"### {label}", ""]
        _write_list(lines, context.get(key, []))

    lines += ["", "## 全局上下文", "", "### 摘要", ""]
    _write_scalar(lines, glob.get("summary"))
    lines += ["", "### 来源", ""]
    _write_list(lines, glob.get("sourceRefs", []))
    lines += ["", "### 约束", ""]
    _write_list(lines, glob.get("constraints", []))
    lines += ["", "### 全局更新", "", f"- 需要：{'是' if glob.get('updateRequired') else '否'}", f"- 计划：{inline(glob.get('updatePlan')) or '无'}"]

    lines += ["", "## 设计影响", "", "### 是否受影响", "", "是" if design.get("affected") else "否", "", "### 现状行为", ""]
    _write_scalar(lines, design.get("currentBehavior"))
    lines += ["", "### 目标行为", ""]
    _write_scalar(lines, design.get("proposedBehavior"))
    lines += ["", "### 决策", ""]
    _write_list(lines, design.get("decisions", []))
    lines += ["", "### 风险", ""]
    _write_list(lines, design.get("risks", []))
    lines += ["", "### 全局影响", ""]
    _write_scalar(lines, design.get("globalContextImpact"))

    lines += ["", "## 功能与验证点", ""]
    for feature in task.get("features", []):
        lines += [f"### {inline(feature.get('id'))} · {inline(feature.get('title'))}", "", f"目标：{inline(feature.get('goal'))}", f"模块：{', '.join(feature.get('moduleRefs', [])) or '—'}", f"Spec：{', '.join(feature.get('specRefs', [])) or '—'}", ""]
        for item in feature.get("verification", []):
            lines.append(f"- {inline(item.get('id'))} [{item.get('status', 'pending')}] {inline(item.get('statement'))}")
            lines.append(f"  - 方法：{inline(item.get('method'))}")
            evidence = item.get("evidence", [])
            lines.append(f"  - 证据：{inline('；'.join(evidence)) if evidence else '-'}")
        lines.append("")

    lines += ["## 涉及模块", ""]
    for module in task.get("modules", []):
        lines.append(f"- {inline(module.get('id'))} [{module.get('change', 'modify')}] {inline(module.get('path'))} — {inline(module.get('reason'))}")
    lines += ["", "## Spec 关联", ""]
    for spec in task.get("specs", []):
        update = spec.get("updateStatus", "pending") if spec.get("change", "none") != "none" else "-"
        lines.append(f"- {inline(spec.get('id'))} [{spec.get('change', 'none')}/{update}] {inline(spec.get('path'))} — {inline(spec.get('relevance'))}")

    lines += ["", "## 交付记录", ""]
    _write_list(lines, execution.get("notes", []))

    lines += ["", "## 来源原文", ""]
    if source.get("path") or source.get("content"):
        lines += [f"### 本地文件：{inline(source.get('path')) or '未命名'}", ""]
        source_body = inline(source.get("content"))
        lines += [f"> {source_body}" if source_body else "> （未读取）", ""]
    for kind, ref, label in (("issue", issue, "Issue"), ("pr", pr, "PR")):
        number = ref.get("number")
        lines.append(f"### {label} #{number}" if number else f"### {label}")
        lines.append("")
        body = inline(ref.get("body"))
        lines += [f"> {body}" if body else "> （未同步）", ""]

    return "\n".join(lines).rstrip() + "\n"


def _split_sections(lines: list[str]) -> dict:
    sections: dict[str, list[tuple[str | None, list[str]]]] = {}
    current_section = None
    current_sub = None
    for line in lines:
        if line.startswith("## ") and not line.startswith("###"):
            current_section = line[3:].strip()
            current_sub = None
            sections.setdefault(current_section, [])
        elif line.startswith("### "):
            current_sub = line[4:].strip()
            if current_section is not None:
                sections[current_section].append((current_sub, []))
        elif current_section is not None:
            blocks = sections[current_section]
            if not blocks or (current_sub is None and blocks and blocks[-1][0] is not None):
                blocks.append((current_sub, []))
            blocks[-1][1].append(line)
    return sections


def _text(block: list[str]) -> str:
    return inline("\n".join(block))


def _items(block: list[str]) -> list[str]:
    return [line[2:].strip() for line in block if line.startswith("- ")]


def parse_task_markdown(text: str, source: Path) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    if not text.startswith("---\n"):
        raise ValueError(f"缺少 frontmatter：{source}")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise ValueError(f"frontmatter 未闭合：{source}")
    front: dict[str, str] = {}
    for line in text[4:end].split("\n"):
        if not line.strip():
            continue
        if ":" not in line:
            warnings.append(f"frontmatter 忽略无法解析的行：{line[:40]}")
            continue
        key, _, value = line.partition(":")
        front[key.strip()] = value.strip()

    task = template()
    task["id"] = front.get("id", "")
    task["title"] = front.get("title", "")
    task["createdAt"] = front.get("createdAt", "")
    task["updatedAt"] = front.get("updatedAt", "")
    task["source"] = {"kind": front.get("sourceKind") or "local", "path": front.get("sourcePath") or None, "content": None}
    github = task["github"]
    github["repository"] = front.get("repository") or None
    if front.get("issueNumber"):
        github["issue"] = {"number": int(front["issueNumber"]), "url": front.get("issueUrl") or None, "title": front.get("issueTitle") or None, "state": front.get("issueState") or "unknown", "body": None, "updatedAt": front.get("issueUpdatedAt") or None}
    if front.get("prNumber"):
        github["pr"] = {"number": int(front["prNumber"]), "url": front.get("prUrl") or None, "title": front.get("prTitle") or None, "state": front.get("prState") or "unknown", "body": None, "updatedAt": front.get("prUpdatedAt") or None}
    execution = task["execution"]
    execution["status"] = front.get("status") or "draft"
    execution["branch"] = front.get("branch") or None

    sections = _split_sections(text[end + 5:].split("\n"))

    def block_of(section: str, sub: str) -> list[str]:
        for name, blocks in sections.items():
            if name != section:
                continue
            for sub_name, block in blocks:
                if sub_name == sub:
                    return block
        return []

    context = task["taskContext"]
    context["problem"] = _text(block_of("任务上下文", "问题"))
    context["goal"] = _text(block_of("任务上下文", "目标"))
    context["scope"] = _items(block_of("任务上下文", "范围"))
    context["nonGoals"] = _items(block_of("任务上下文", "非目标"))
    context["dependencies"] = _items(block_of("任务上下文", "依赖"))
    context["assumptions"] = _items(block_of("任务上下文", "假设"))
    context["openQuestions"] = _items(block_of("任务上下文", "未决问题"))

    glob = task["globalContext"]
    glob["summary"] = _text(block_of("全局上下文", "摘要"))
    glob["sourceRefs"] = _items(block_of("全局上下文", "来源"))
    glob["constraints"] = _items(block_of("全局上下文", "约束"))
    for item in _items(block_of("全局上下文", "全局更新")):
        if item.startswith("需要："):
            glob["updateRequired"] = item[3:].strip() == "是"
        elif item.startswith("计划："):
            glob["updatePlan"] = item[3:].strip() or "无"

    design = task["designAnalysis"]
    design["affected"] = _text(block_of("设计影响", "是否受影响")) == "是"
    design["currentBehavior"] = _text(block_of("设计影响", "现状行为"))
    design["proposedBehavior"] = _text(block_of("设计影响", "目标行为"))
    design["decisions"] = _items(block_of("设计影响", "决策"))
    design["risks"] = _items(block_of("设计影响", "风险"))
    design["globalContextImpact"] = _text(block_of("设计影响", "全局影响"))

    features = []
    for sub_name, block in sections.get("功能与验证点", []):
        if not sub_name or " · " not in sub_name:
            if sub_name:
                warnings.append(f"功能小节缺少「ID · 标题」格式：{sub_name[:40]}")
            continue
        feature_id, title = (part.strip() for part in sub_name.split(" · ", 1))
        feature = {"id": feature_id, "title": title, "goal": "", "moduleRefs": [], "specRefs": [], "verification": []}
        current: dict | None = None
        for line in block:
            if line.startswith("目标："):
                feature["goal"] = line[3:].strip()
            elif line.startswith("模块："):
                feature["moduleRefs"] = [item.strip() for item in line[3:].split(",") if item.strip() and item.strip() != "—"]
            elif line.startswith("Spec："):
                feature["specRefs"] = [item.strip() for item in line[5:].split(",") if item.strip() and item.strip() != "—"]
            elif line.startswith("- "):
                match = re.match(r"(\S+) \[(\w+)\] (.*)$", line[2:])
                if match:
                    current = {"id": match.group(1), "statement": match.group(3), "method": "", "status": match.group(2), "evidence": []}
                    feature["verification"].append(current)
                else:
                    warnings.append(f"验证点行无法解析：{line[:60]}")
            elif line.strip().startswith("- 方法：") and current is not None:
                current["method"] = line.strip()[len("- 方法："):].strip()
            elif line.strip().startswith("- 证据：") and current is not None:
                evidence = line.strip()[len("- 证据："):].strip()
                if evidence and evidence != "-":
                    current["evidence"].append(evidence)
        features.append(feature)
    task["features"] = features

    modules = []
    for item in [line[2:].strip() for name, blocks in sections.items() if name == "涉及模块" for sub, block in blocks if sub is None for line in block if line.startswith("- ")]:
        match = re.match(r"(\S+) \[(add|modify|delete|none)\] (\S+) — (.*)$", item)
        if match:
            modules.append({"id": match.group(1), "change": match.group(2), "path": match.group(3), "reason": match.group(4).strip()})
        else:
            warnings.append(f"模块行无法解析：{item[:60]}")
    task["modules"] = modules

    specs = []
    for item in [line[2:].strip() for name, blocks in sections.items() if name == "Spec 关联" for sub, block in blocks if sub is None for line in block if line.startswith("- ")]:
        match = re.match(r"(\S+) \[(none|add|modify)(?:/([\w-]+))?\] (\S+) — (.*)$", item)
        if match:
            change = match.group(2)
            specs.append({"id": match.group(1), "change": change, "path": match.group(4), "relevance": match.group(5).strip(), "updateStatus": match.group(3) if (match.group(3) and match.group(3) != "-") else ("pending" if change != "none" else "not_applicable")})
        else:
            warnings.append(f"Spec 行无法解析：{item[:60]}")
    task["specs"] = specs

    notes = [line[2:].strip() for name, blocks in sections.items() if name == "交付记录" for sub, block in blocks for line in block if line.startswith("- ")]
    execution["notes"] = notes

    source_blocks = sections.get("来源原文", [])
    for sub_name, block in source_blocks:
        body = "\n".join(line[2:] if line.startswith("> ") else line for line in block).strip()
        if sub_name and sub_name.startswith("本地文件"):
            task["source"]["content"] = body
        elif sub_name and sub_name.startswith("Issue"):
            if github.get("issue"):
                github["issue"]["body"] = body
        elif sub_name == "PR":
            if github.get("pr"):
                github["pr"]["body"] = body

    known = {"任务上下文", "全局上下文", "设计影响", "功能与验证点", "涉及模块", "Spec 关联", "交付记录", "来源原文"}
    for name in sections:
        if name not in known:
            warnings.append(f"未知分节被忽略：{name}")
    return task, warnings


def load_task(path: Path) -> tuple[dict, list[str]]:
    return parse_task_markdown(path.read_text(encoding="utf-8"), path)


# ---------------------------------------------------------------- commands

def command_create(args: argparse.Namespace, root: Path) -> dict:
    title = args.title
    source_path = None
    source_content = None
    if getattr(args, "from_file", None):
        source_path = Path(args.from_file)
        source_path = (source_path if source_path.is_absolute() else root / source_path).resolve()
        try:
            source_path.relative_to(root)
        except ValueError as exc:
            raise ValueError("需求文件必须位于当前项目内") from exc
        if source_path.stat().st_size > 200_000:
            raise ValueError("需求文件超过 200 KB；请先提炼为任务输入文件")
        source_content = source_path.read_text(encoding="utf-8")
        if not title:
            heading = re.search(r"^#\s+(.+)$", source_content, flags=re.MULTILINE)
            title = heading.group(1).strip() if heading else source_path.stem
    source_data = None
    if args.source_json:
        source_data = load_json(Path(args.source_json) if Path(args.source_json).is_absolute() else root / args.source_json)
        if not title and source_data.get("title"):
            title = source_data["title"]
    if not title:
        raise ValueError("请提供 --title，或使用包含标题的 --from-file/--source-json")
    number = ref_number(args.issue) or ref_number(args.pr)
    if args.id:
        task_id = args.id if args.id.startswith("task-") else f"task-{args.id}"
    elif args.issue and number:
        task_id = f"task-{number}-{slugify(title)}"
    elif number:
        task_id = f"task-pr-{number}-{slugify(title)}"
    else:
        task_id = f"task-local-{slugify(title)}"
    if not STEM_RE.match(task_id):
        raise ValueError(f"task 文件名需匹配 {TASK_GLOB}（task- 前缀且至少两段短横线）：{task_id}")
    path = root / TASK_DIR / f"{task_id}.md"
    if path.exists() and not args.force:
        raise ValueError(f"task 已存在：{path}；如需覆盖请显式使用 --force")
    task = template()
    task["id"] = task_id
    task["title"] = title
    task["createdAt"] = task["updatedAt"] = now()
    task["source"] = {"kind": "file" if source_path else "pr" if args.pr else "issue" if args.issue else "local", "path": str(source_path.relative_to(root)).replace("\\", "/") if source_path else None, "content": source_content}
    task["github"]["issue"] = github_ref(args.issue)
    task["github"]["pr"] = github_ref(args.pr)
    if args.repository:
        task["github"]["repository"] = args.repository
    if source_data:
        kind = "pr" if args.pr else "issue"
        if not task["github"][kind]:
            task["github"][kind] = {"number": None, "url": None, "state": "unknown", "body": None, "updatedAt": None}
        for key in ("number", "title", "body", "url", "state", "updatedAt"):
            if key in source_data:
                task["github"][kind][key] = source_data[key]
    save_text(path, task_markdown(task))
    return {"task": str(path.relative_to(root)).replace("\\", "/"), "id": task_id, "source": task["source"]["kind"], "next": "阅读输入与代码，填写分析后运行 validate --phase analysis"}


def command_migrate(args: argparse.Namespace, root: Path) -> dict:
    legacy = load_json(Path(args.json) if Path(args.json).is_absolute() else root / args.json)
    task_id = legacy.get("id", "")
    task_id = task_id if task_id.startswith("task-") else f"task-{task_id}"
    if not STEM_RE.match(task_id):
        raise ValueError(f"迁移目标文件名需匹配 {TASK_GLOB}：{task_id}")
    path = root / TASK_DIR / f"{task_id}.md"
    if path.exists() and not args.force:
        raise ValueError(f"task 已存在：{path}；如需覆盖请显式使用 --force")
    task = template()
    task.update({key: legacy[key] for key in ("id", "title", "createdAt", "updatedAt") if key in legacy})
    task["id"] = task_id
    for key in ("github", "taskContext", "globalContext", "designAnalysis", "features", "modules", "specs", "execution"):
        if isinstance(legacy.get(key), dict):
            task[key].update(legacy[key])
        elif isinstance(legacy.get(key), list):
            task[key] = legacy[key]
    task["id"] = task_id
    save_text(path, task_markdown(task))
    errors, warnings = validate_task(task, root, "draft")
    return {"task": str(path.relative_to(root)).replace("\\", "/"), "id": task_id, "ok": not errors, "errors": errors, "warnings": warnings, "next": "validate --phase analysis"}


def require_text(errors: list[str], value: object, path: str) -> None:
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{path} 必须是非空字符串")


def validate_task(task: dict, root: Path, phase: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    require_text(errors, task.get("id"), "id")
    require_text(errors, task.get("title"), "title")
    if task.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(f"schemaVersion 必须为 {SCHEMA_VERSION}")
    if not task["id"].startswith("task-") or not STEM_RE.match(task["id"]):
        errors.append(f"task 文件名需匹配 {TASK_GLOB}（task- 前缀且至少两段短横线）")
    if phase == "draft":
        return errors, warnings

    context = task.get("taskContext", {})
    for key in ("problem", "goal"):
        require_text(errors, context.get(key), f"taskContext.{key}")
    if not context.get("scope"):
        errors.append("taskContext.scope 至少一项")
    global_context = task.get("globalContext", {})
    require_text(errors, global_context.get("summary"), "globalContext.summary")
    if not global_context.get("sourceRefs"):
        errors.append("globalContext.sourceRefs 至少一项")

    features = task.get("features", [])
    modules = task.get("modules", [])
    specs = task.get("specs", [])
    if not features:
        errors.append("features 至少一项")
    if not modules:
        errors.append("modules 至少一项")
    if not specs:
        errors.append("specs 至少一项；无变化也要记录依据")

    module_ids = {item.get("id") for item in modules}
    spec_ids = {item.get("id") for item in specs}
    for index, feature in enumerate(features):
        base = f"features[{index}]"
        require_text(errors, feature.get("id"), base + ".id")
        require_text(errors, feature.get("title"), base + ".title")
        require_text(errors, feature.get("goal"), base + ".goal")
        if not feature.get("verification"):
            errors.append(base + ".verification 至少一项")
        for ref in feature.get("moduleRefs", []):
            if ref not in module_ids:
                errors.append(f"{base}.moduleRefs 引用了未知模块 {ref}")
        for ref in feature.get("specRefs", []):
            if ref not in spec_ids:
                errors.append(f"{base}.specRefs 引用了未知 Spec {ref}")
        for v_index, verification in enumerate(feature.get("verification", [])):
            v_base = f"{base}.verification[{v_index}]"
            require_text(errors, verification.get("id"), v_base + ".id")
            require_text(errors, verification.get("statement"), v_base + ".statement")
            require_text(errors, verification.get("method"), v_base + ".method")
            if verification.get("status", "pending") not in VERIFICATION_STATUSES:
                errors.append(v_base + ".status 非法")
            if phase in {"review", "done"} and verification.get("status") == "passed" and not verification.get("evidence"):
                errors.append(v_base + " 标为 passed 时必须记录 evidence")

    for index, module in enumerate(modules):
        base = f"modules[{index}]"
        require_text(errors, module.get("id"), base + ".id")
        require_text(errors, module.get("path"), base + ".path")
        require_text(errors, module.get("reason"), base + ".reason")
        change = module.get("change", "modify")
        path = root / module.get("path", "")
        if change != "add" and not path.exists():
            warnings.append(f"{base}.path 当前不存在：{module.get('path')}")
    for index, spec in enumerate(specs):
        base = f"specs[{index}]"
        require_text(errors, spec.get("id"), base + ".id")
        require_text(errors, spec.get("path"), base + ".path")
        require_text(errors, spec.get("relevance"), base + ".relevance")
        change = spec.get("change", "none")
        if change not in SPEC_CHANGE:
            errors.append(base + ".change 必须为 none/add/modify")
        if change != "add" and not (root / spec.get("path", "")).exists():
            errors.append(f"{base}.path 不存在：{spec.get('path')}")
        if phase == "done" and change != "none" and spec.get("updateStatus") != "done":
            errors.append(base + " 要求的 Spec 更新尚未完成")

    design = task.get("designAnalysis", {})
    if design.get("affected"):
        require_text(errors, design.get("currentBehavior"), "designAnalysis.currentBehavior")
        require_text(errors, design.get("proposedBehavior"), "designAnalysis.proposedBehavior")
        require_text(errors, design.get("globalContextImpact"), "designAnalysis.globalContextImpact")
        if not design.get("decisions"):
            errors.append("设计受影响时 designAnalysis.decisions 至少一项")
        if not any(spec.get("change") != "none" for spec in specs):
            errors.append("设计受影响时必须至少关联一项 add/modify Spec")

    execution = task.get("execution", {})
    if execution.get("status") not in STATUSES:
        errors.append("execution.status 非法")
    if phase == "done":
        pending = [item.get("id") for feature in features for item in feature.get("verification", []) if item.get("status") not in {"passed", "not_applicable"}]
        if pending:
            errors.append("仍有未完成验证：" + ", ".join(str(item) for item in pending))
        if execution.get("status") != "done":
            errors.append("完成门禁要求 execution.status=done")
        github = task.get("github", {})
        if github.get("issue") and not github.get("pr"):
            errors.append("GitHub Issue 任务的完成门禁要求关联 PR；纯本地任务不要求 PR")
    return errors, warnings


def command_validate(args: argparse.Namespace, root: Path) -> dict:
    path = task_path(root, args.task)
    task, parse_warnings = load_task(path)
    errors, warnings = validate_task(task, root, args.phase)
    result = {"task": str(path.relative_to(root)).replace("\\", "/"), "phase": args.phase, "ok": not errors, "errors": errors, "warnings": parse_warnings + warnings}
    if errors:
        raise CommandError(result)
    return result


def esc(value: object) -> str:
    return html.escape(str(value if value is not None else "—"), quote=True)


def list_html(items: list, empty: str = "暂无") -> str:
    if not items:
        return f'<p class="muted">{esc(empty)}</p>'
    return "<ul>" + "".join(f"<li>{esc(item)}</li>" for item in items) + "</ul>"


def page(title: str, subtitle: str, body: str) -> str:
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><style>
*{{box-sizing:border-box}}html,body{{margin:0;min-height:100%;background:transparent}}body{{font-family:var(--kimi-font-sans,sans-serif);color:var(--kimi-color-text-primary);font-size:14px;line-height:1.55}}
main{{padding:48px var(--kimi-space-4,16px) var(--kimi-space-4,16px)}}h1{{font-size:20px;font-weight:500;margin:0 0 4px}}h2{{font-size:15px;font-weight:500;margin:20px 0 8px}}h3{{font-size:14px;font-weight:500;margin:0 0 4px}}p{{margin:4px 0 10px}}ul{{margin:4px 0 12px;padding-left:20px}}li{{margin:4px 0}}.muted{{color:var(--kimi-color-text-secondary)}}.meta{{font-size:12px;color:var(--kimi-color-text-tertiary)}}.card{{border:1px solid var(--kimi-color-border);border-radius:var(--kimi-radius-panel,12px);padding:12px;margin:12px 0}}.check{{border-top:1px solid var(--kimi-color-border);padding:8px 0}}.status{{display:inline-block;border:1px solid var(--kimi-color-border);border-radius:999px;padding:1px 8px;font-size:12px}}code{{font-family:var(--kimi-font-mono,monospace);font-size:12px;overflow-wrap:anywhere}}a{{color:inherit}}table{{border-collapse:collapse;width:100%}}th,td{{text-align:left;padding:6px 8px;border-bottom:1px solid var(--kimi-color-border);font-size:13px}}th{{color:var(--kimi-color-text-secondary);font-weight:500}}
</style></head><body><main><h1>{esc(title)}</h1><div class="meta">{esc(subtitle)}</div>{body}</main></body></html>'''


def render_context(task: dict) -> str:
    ctx, glob, design = task["taskContext"], task["globalContext"], task["designAnalysis"]
    body = f'<div class="card"><span class="status">{esc(task["execution"]["status"])}</span><h2>任务 Context</h2><p>{esc(ctx["problem"])}</p><h3>目标</h3><p>{esc(ctx["goal"])}</p><h3>范围</h3>{list_html(ctx["scope"])}<h3>非目标</h3>{list_html(ctx["nonGoals"], "未记录")}</div>'
    body += f'<div class="card"><h2>全局 Context</h2><p>{esc(glob["summary"])}</p><h3>约束</h3>{list_html(glob["constraints"], "未记录")}<h3>来源</h3>' + "".join(f'<p><code>{esc(ref)}</code></p>' for ref in glob["sourceRefs"]) + '</div>'
    body += f'<div class="card"><h2>设计影响</h2><p>{esc("受影响" if design["affected"] else "不涉及设计变化")}</p><p class="muted">{esc(design.get("proposedBehavior") or design.get("globalContextImpact"))}</p>{list_html(design.get("decisions", []), "无额外决策")}</div>'
    return page(task["title"], task["id"] + " · Context", body)


def render_features(task: dict) -> str:
    parts = []
    for feature in task["features"]:
        checks = "".join(f'<div class="check"><span class="status">{esc(item["status"])}</span><p>{esc(item["statement"])}</p><div class="meta">验证：{esc(item["method"])}</div>' + (f'<div class="meta">证据：{esc("；".join(item.get("evidence", [])))}</div>' if item.get("evidence") else "") + '</div>' for item in feature["verification"])
        parts.append(f'<div class="card"><h2>{esc(feature["id"])} · {esc(feature["title"])}</h2><p class="muted">{esc(feature["goal"])}</p>{checks}</div>')
    return page("功能与验证点", task["id"], "".join(parts))


def render_architecture(task: dict) -> str:
    modules = "".join(f'<div class="card"><h3>{esc(item["id"])} · {esc(item["change"])}</h3><p><code>{esc(item["path"])}</code></p><p class="muted">{esc(item["reason"])}</p></div>' for item in task["modules"])
    specs = "".join(f'<div class="card"><h3>{esc(item["id"])} · {esc(item["change"])} / {esc(item.get("updateStatus", "not_applicable"))}</h3><p><code>{esc(item["path"])}</code></p><p class="muted">{esc(item["relevance"])}</p></div>' for item in task["specs"])
    return page("模块与 Spec", task["id"], "<h2>涉及模块</h2>" + modules + "<h2>设计 Spec</h2>" + specs)


def render_delivery(task: dict) -> str:
    github = task["github"]
    issue, pr = github.get("issue"), github.get("pr")
    execution = task["execution"]
    body = '<div class="card"><h2>GitHub</h2>'
    body += f'<p>Issue：{esc("#" + str(issue["number"]) if issue and issue.get("number") else "未关联")} <span class="status">{esc(issue.get("state") if issue else "offline")}</span></p>'
    if issue and issue.get("url"):
        body += f'<p><a href="{esc(issue["url"])}" target="_blank" rel="noreferrer">{esc(issue["url"])}</a></p>'
    body += f'<p>PR：{esc("#" + str(pr["number"]) if pr and pr.get("number") else "未关联")} <span class="status">{esc(pr.get("state") if pr else "pending")}</span></p></div>'
    body += f'<div class="card"><h2>执行状态</h2><p><span class="status">{esc(execution["status"])}</span></p><p>分支：<code>{esc(execution.get("branch"))}</code></p><h3>记录</h3>{list_html(execution.get("notes", []), "暂无")}</div>'
    body += f'<div class="card"><h2>待确认问题</h2>{list_html(task["taskContext"].get("openQuestions", []), "无")}<h2>假设</h2>{list_html(task["taskContext"].get("assumptions", []), "无")}</div>'
    return page("交付与状态", task["id"], body)


RENDERERS = {"context": render_context, "features": render_features, "architecture": render_architecture, "delivery": render_delivery}


def load_all_tasks(root: Path) -> list[tuple[Path, dict, list[str]]]:
    results = []
    for path in sorted((root / TASK_DIR).glob(TASK_GLOB)):
        try:
            task, warnings = load_task(path)
        except ValueError as exc:
            results.append((path, {"id": path.stem, "title": "（解析失败）", "execution": {"status": "invalid"}, "github": {}, "features": [], "specs": []}, [str(exc)]))
            continue
        results.append((path, task, warnings))
    return results


def command_render(args: argparse.Namespace, root: Path) -> dict:
    path = task_path(root, args.task)
    task, parse_warnings = load_task(path)
    errors, _ = validate_task(task, root, "analysis")
    if errors:
        raise CommandError({"ok": False, "errors": errors, "warnings": parse_warnings})
    output = Path(args.output).resolve() if args.output else root / ".task-canvas" / task["id"]
    try:
        output.relative_to(root)
    except ValueError as exc:
        raise ValueError("Canvas 输出目录必须位于当前项目内") from exc
    output.mkdir(parents=True, exist_ok=True)
    titles = {"context": "任务与全局 Context", "features": "功能与验证点", "architecture": "模块与 Spec", "delivery": "Issue / PR 与交付"}
    layouts = {"context": {"mode": "grid", "x": 0, "y": 0, "w": 6, "h": 13}, "features": {"mode": "grid", "x": 6, "y": 0, "w": 6, "h": 13}, "architecture": {"mode": "grid", "x": 0, "y": 13, "w": 6, "h": 13}, "delivery": {"mode": "grid", "x": 6, "y": 13, "w": 6, "h": 13}}
    widgets = []
    for key in SECTION_ORDER:
        filename = key + ".html"
        save_text(output / filename, RENDERERS[key](task))
        widgets.append({"key": key, "title": f'{task["id"]} · {titles[key]}', "file": filename, "layout": layouts[key]})
    manifest = {"schemaVersion": SCHEMA_VERSION, "generatedAt": now(), "taskId": task["id"], "taskFile": str(path.relative_to(root)).replace("\\", "/"), "canvas": {"title": f'{task["id"]} · {task["title"]}', "purpose": "GitHub Issue/PR 驱动任务的分析、验证与交付看板", "widgets": widgets}}
    save_json(output / "canvas.json", manifest)
    return {"ok": True, "manifest": str((output / "canvas.json").relative_to(root)).replace("\\", "/"), "widgets": len(widgets), "warnings": parse_warnings}


def command_overview(args: argparse.Namespace, root: Path) -> dict:
    rows = []
    for path, task, warnings in load_all_tasks(root):
        verifications = [item for feature in task.get("features", []) for item in feature.get("verification", [])]
        passed = sum(1 for item in verifications if item.get("status") == "passed")
        failed = sum(1 for item in verifications if item.get("status") == "failed")
        github = task.get("github", {})
        issue, pr = github.get("issue") or {}, github.get("pr") or {}
        spec_pending = sum(1 for spec in task.get("specs", []) if spec.get("change", "none") != "none" and spec.get("updateStatus") != "done")
        rows.append({
            "id": task.get("id"), "title": task.get("title"), "status": task.get("execution", {}).get("status"),
            "issue": issue.get("number"), "pr": pr.get("number"),
            "verification": f"{passed}/{len(verifications)}" + (f"（{failed} 失败）" if failed else ""),
            "specPending": spec_pending, "file": str(path.relative_to(root)).replace("\\", "/"), "warnings": warnings,
        })
    body = ['<div class="card"><table><tr><th>Task</th><th>标题</th><th>状态</th><th>Issue</th><th>PR</th><th>验证</th><th>Spec 待更新</th></tr>']
    for row in rows:
        body.append(f'<tr><td><code>{esc(row["id"])}</code></td><td>{esc(row["title"])}</td><td><span class="status">{esc(row["status"])}</span></td><td>{esc("#" + str(row["issue"]) if row["issue"] else "—")}</td><td>{esc("#" + str(row["pr"]) if row["pr"] else "—")}</td><td>{esc(row["verification"])}</td><td>{esc(row["specPending"])}</td></tr>')
    body.append("</table></div>")
    problems = [f'{row["id"]}：{warning}' for row in rows for warning in row["warnings"]]
    if problems:
        body.append('<div class="card"><h2>解析告警</h2>' + list_html(problems, "无") + "</div>")
    output = Path(args.output).resolve() if args.output else root / ".task-canvas"
    try:
        output.relative_to(root)
    except ValueError as exc:
        raise ValueError("Canvas 输出目录必须位于当前项目内") from exc
    output.mkdir(parents=True, exist_ok=True)
    target = output / "tasks-overview.html"
    save_text(target, page("任务开发总览", f'{len(rows)} 个 task · {now()[:10]}', "".join(body)))
    return {"ok": True, "tasks": len(rows), "overview": str(target.relative_to(root)).replace("\\", "/")}


def command_list(args: argparse.Namespace, root: Path) -> dict:
    items = []
    for path, task, warnings in load_all_tasks(root):
        github = task.get("github", {})
        issue, pr = github.get("issue") or {}, github.get("pr") or {}
        items.append({"id": task.get("id"), "title": task.get("title"), "status": task.get("execution", {}).get("status"), "issue": issue.get("number"), "pr": pr.get("number"), "file": str(path.relative_to(root)).replace("\\", "/"), "warnings": warnings})
    return {"tasks": items, "count": len(items)}


def command_status(args: argparse.Namespace, root: Path) -> dict:
    path = task_path(root, args.task)
    task, _ = load_task(path)
    if args.status not in STATUSES:
        raise ValueError(f"状态必须为 {', '.join(sorted(STATUSES))}")
    task["execution"]["status"] = args.status
    if args.note:
        task["execution"].setdefault("notes", []).append(args.note)
    task["updatedAt"] = now()
    save_text(path, task_markdown(task))
    return {"ok": True, "id": task["id"], "status": args.status}


def command_record(args: argparse.Namespace, root: Path) -> dict:
    path = task_path(root, args.task)
    task, _ = load_task(path)
    found = None
    for feature in task.get("features", []):
        for verification in feature.get("verification", []):
            if verification.get("id") == args.verification:
                found = verification
                break
    if not found:
        raise ValueError(f"找不到验证点：{args.verification}")
    if args.status not in VERIFICATION_STATUSES:
        raise ValueError(f"验证状态必须为 {', '.join(sorted(VERIFICATION_STATUSES))}")
    if args.status == "passed" and not args.evidence:
        raise ValueError("passed 必须至少提供一项 --evidence")
    found["status"] = args.status
    found["evidence"] = args.evidence
    found["recordedAt"] = now()
    task["updatedAt"] = now()
    save_text(path, task_markdown(task))
    return {"ok": True, "verification": args.verification, "status": args.status}


def gh_view(kind: str, number: int, repository: str | None) -> dict:
    executable = shutil.which("gh")
    if not executable:
        raise ValueError("未安装 gh；可离线维护 task，或安装并登录 GitHub CLI 后重试")
    command = [executable, kind, "view", str(number), "--json", "number,title,body,url,state,updatedAt"]
    if repository:
        command.extend(["--repo", repository])
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", check=False)
    if result.returncode:
        raise ValueError("GitHub 同步失败：" + result.stderr.strip())
    return json.loads(result.stdout)


def drift_warnings(task: dict) -> list[str]:
    warnings = []
    status = task.get("execution", {}).get("status")
    github = task.get("github", {})
    issue, pr = github.get("issue") or {}, github.get("pr") or {}
    if pr.get("state") in {"merged", "closed"} and status not in {"in_review", "done"}:
        warnings.append(f"PR 已 {pr['state']} 但任务状态仍为 {status}；请复核后运行 status 更新")
    if issue.get("state") == "closed" and status not in {"in_review", "done"}:
        warnings.append(f"Issue 已关闭但任务状态仍为 {status}；请确认是否已完成")
    return warnings


def command_sync(args: argparse.Namespace, root: Path) -> dict:
    path = task_path(root, args.task)
    task, _ = load_task(path)
    synced = []
    for kind in ("issue", "pr"):
        ref = task.get("github", {}).get(kind)
        if not ref or not ref.get("number"):
            continue
        fresh = gh_view(kind, ref["number"], task["github"].get("repository"))
        ref.update({key: fresh.get(key) for key in ("number", "title", "body", "url", "state", "updatedAt")})
        synced.append(f"{kind}#{ref['number']}")
    task["updatedAt"] = now()
    save_text(path, task_markdown(task))
    return {"ok": True, "synced": synced, "warnings": drift_warnings(task), "note": "只更新 GitHub 元数据，不覆盖人工分析"}


class CommandError(Exception):
    def __init__(self, result: dict):
        super().__init__("validation failed")
        self.result = result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="统一 GitHub/本地 task 工作流（docs/sprints/task-*-*.md）与 Canvas 生成器")
    parser.add_argument("--root", default=".", help="项目根目录，默认当前目录")
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create", help="从标题、Issue/PR 或需求文件创建 task；不调用 GitHub 写接口")
    create.add_argument("--title")
    create.add_argument("--id")
    create.add_argument("--issue")
    create.add_argument("--pr")
    create.add_argument("--repository")
    create.add_argument("--from-file", help="可选：从项目内 Markdown/文本需求文件创建本地 task")
    create.add_argument("--source-json", help="可选：项目内 gh view 风格的 JSON 快照")
    create.add_argument("--force", action="store_true")
    create.set_defaults(handler=command_create)
    migrate = sub.add_parser("migrate", help="把旧版 tasks/*.task.json 迁移为 docs/sprints/task-*.md")
    migrate.add_argument("json")
    migrate.add_argument("--force", action="store_true")
    migrate.set_defaults(handler=command_migrate)
    for name, handler in (("validate", command_validate), ("render", command_render)):
        item = sub.add_parser(name)
        item.add_argument("task")
        if name == "validate":
            item.add_argument("--phase", choices=("draft", "analysis", "review", "done"), default="analysis")
        else:
            item.add_argument("--output")
        item.set_defaults(handler=handler)
    list_parser = sub.add_parser("list")
    list_parser.set_defaults(handler=command_list)
    overview = sub.add_parser("overview", help="生成跨任务总览 .task-canvas/tasks-overview.html")
    overview.add_argument("--output")
    overview.set_defaults(handler=command_overview)
    sync = sub.add_parser("sync")
    sync.add_argument("task")
    sync.set_defaults(handler=command_sync)
    status = sub.add_parser("status")
    status.add_argument("task")
    status.add_argument("status")
    status.add_argument("--note")
    status.set_defaults(handler=command_status)
    record = sub.add_parser("record")
    record.add_argument("task")
    record.add_argument("verification")
    record.add_argument("status")
    record.add_argument("--evidence", action="append", default=[])
    record.set_defaults(handler=command_record)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    root = Path(args.root).resolve()
    try:
        result = args.handler(args, root)
        print(dump(result), end="")
        return 0
    except CommandError as exc:
        print(dump(exc.result), end="")
        return 2
    except (ValueError, OSError) as exc:
        print(dump({"ok": False, "error": str(exc)}), end="", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
