from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
plan2 = root / "docs" / "susu" / "plan2"
output = root / ".project-canvas" / "plan.json"
request = json.loads(output.read_text(encoding="utf-8"))["request"]

phases = [
    ("W0", "W0-baseline.md", "基线迁入", []),
    ("W1", "W1-shell.md", "三栏壳与中栏 Surface 槽", ["W0.8"]),
    ("W2", "W2-runtime.md", "magpie 与 DSH 运行链路收口", ["W1.7"]),
    ("W3", "W3-workspace.md", "只读工作区与共享项目上下文", ["W1.7"]),
    ("W4", "W4-terminal.md", "主进程 PTY Terminal", ["W2.8", "W3.7"]),
    ("W5", "W5-browser.md", "独立 Browser Surface", ["W4.7"]),
    ("Q1", "Q1-plan.md", "一句话生成经审计的本地项目快照", ["W5.7"]),
    ("Q2", "Q2-canvas.md", "给人看的项目看板", ["Q1.7"]),
    ("Q3", "Q3-task.md", "一次执行一条任务", ["Q2.7"]),
]

def clean(value: str) -> str:
    value = re.sub(r"`([^`]+)`", r"\1", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"\1", value)
    return value.strip()

def execution():
    return {"status": "not_started", "automationId": None, "runId": None, "conversationId": None}

tasks = []
previous_leaf = {}
for phase, filename, phase_title, initial_dependencies in phases:
    text = (plan2 / "phases" / filename).read_text(encoding="utf-8")
    goal = clean(re.search(r"## 阶段目标\s+(.+)", text).group(1))
    source = f"docs/susu/plan2/phases/{filename}"
    tasks.append({
        "id": f"E-{phase}",
        "parentId": None,
        "title": f"{phase}：{phase_title}",
        "description": goal,
        "moduleIds": ["innate-desktop"],
        "dependsOn": [],
        "acceptance": [f"{phase} 的全部叶子任务完成且阶段证据齐全", goal],
        "evidence": [f"阶段任务卡：{source}", f"阶段证据目录：docs/susu/plan2/evidence/{phase}/"],
        "execution": execution(),
        "githubIssue": None,
    })
    matches = list(re.finditer(rf"^## ({phase}\.\d+) (.+)$", text, flags=re.MULTILINE))
    for index, match in enumerate(matches):
        task_id = match.group(1)
        title = clean(match.group(2))
        body = text[match.end():matches[index + 1].start() if index + 1 < len(matches) else text.find("## 阶段回退", match.end())]
        location_match = re.search(r"- \*\*改动位置\*\*：(.+)", body)
        verification_match = re.search(r"- \*\*验证\*\*：(.+)", body)
        done_match = re.search(r"- \*\*完成标准\*\*：(.+)", body)
        implementation_match = re.search(r"- \*\*实施\*\*：\s*(.*?)(?=\n- \*\*验证\*\*)", body, flags=re.DOTALL)
        implementation = []
        if implementation_match:
            for line in implementation_match.group(1).splitlines():
                line = line.strip()
                if re.match(r"\d+\. ", line):
                    implementation.append(clean(re.sub(r"^\d+\. ", "", line)))
        description = ("改动位置：" + clean(location_match.group(1)) + "。" if location_match else "")
        description += "实施：" + "；".join(implementation)
        depends = list(initial_dependencies) if index == 0 else [matches[index - 1].group(1)]
        tasks.append({
            "id": task_id,
            "parentId": f"E-{phase}",
            "title": title,
            "description": description,
            "moduleIds": ["innate-desktop"],
            "dependsOn": depends,
            "acceptance": [clean(verification_match.group(1)), clean(done_match.group(1))],
            "evidence": [f"任务来源：{source}（{task_id}）", f"验收记录：docs/susu/plan2/evidence/{phase}/commands.md 与 behavior.md"],
            "execution": execution(),
            "githubIssue": None,
        })
        previous_leaf[phase] = task_id

plan = {
    "schemaVersion": "1.0.0",
    "request": request,
    "spec": {
        "title": "innate-desktop 当前迁移与项目执行画布",
        "goal": "按 Plan2 完成 labs 基线迁移、桌面工作台收口和项目任务闭环，所有任务以真实验收证据为准。",
        "scope": [
            "W0–W5：基线、桌面壳、运行时、工作区、Terminal 与 Browser",
            "Q1–Q3：计划生成、人侧项目看板与单任务执行",
            "每个叶子任务包含实施说明、验收标准和证据要求",
        ],
        "nonGoals": [
            "不创建 GitHub Issue、分支、提交或 PR",
            "不在本展示中执行任何迁移或项目任务",
            "不迁 references/prototypes，不 fork orca，不提前展开旧 P 系列平台 backlog",
            "不恢复已删除的 apps/susu-web 验证应用",
        ],
        "acceptance": [
            "9 个阶段、66 个叶子任务与 docs/susu/plan2 内容一致",
            "依赖顺序为 W0→W1，W2/W3 并行，合流后 W4→W5→Q1→Q2→Q3",
            "计划通过 project-canvas validate，页面数量与 plan.json 一致",
            "所有执行状态均为 not_started，Issue 和运行记录均为空",
        ],
        "assumptions": [
            "旧 apps/susu-web 已删除，当前扫描只发现根项目 innate-desktop；待迁移模块不伪装为已存在模块",
            "叶子任务暂归根项目影响范围，新模块在对应阶段真实建立后再补充扫描",
            "Plan2 全部任务待执行，evidence 字段表示需要产出的证据，不表示证据已经存在",
        ],
        "modulesTouched": ["innate-desktop"],
    },
    "tasks": tasks,
}
output.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"generated {len(tasks)} nodes ({sum(1 for task in tasks if task['parentId'])} leaf tasks)")
