"""Populate the W1b Sprint plan through the task-workflow canonical writers."""
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / ".agents/skills/task-workflow/scripts/task.py"
spec = importlib.util.spec_from_file_location("task_workflow", SCRIPT)
tw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tw)

SOURCE_PATH = "docs/susu/plan/phases/W1-shell.md"
SOURCE_REFS = ["docs/CONTEXT.md", "docs/susu/plan/README.md", SOURCE_PATH]
NON_GOALS = [
    "不实现 W1c 多 Surface 标签，不改变 attach/detach 或 destroy 生命周期。",
    "不修改 magpie/DSH 启动、IPC、preload 或 SurfaceHost 协议。",
    "不接 W2 网关 pill，不实现 W3 业务 Panel，不增加 terminal/browser 入口。",
    "不重写 @innate/ui primitive，不新增私有 token，不复制 orca 组件。",
]
CONSTRAINTS = [
    "实施门禁为 W1a 全绿；W0 由另一任务推进，本 Sprint 当前仅拆解，不越过门禁。",
    "只从 @innate/ui 单入口消费 primitive，使用语义 token，明暗由 .dark class 控制。",
    "保持 strict TypeScript、现有页面 ID 与 simple/dev 门控，业务逻辑留在原实现。",
    "不降低 W0 行为与安全断言；认证 URL、token、key 不进入证据。",
]

def context(problem, goal, scope, dependencies, assumptions=None, open_questions=None):
    return {
        "problem": problem,
        "goal": goal,
        "scope": scope,
        "nonGoals": NON_GOALS,
        "dependencies": dependencies,
        "assumptions": assumptions or [],
        "openQuestions": open_questions or [],
    }

def global_context(summary):
    return {
        "summary": summary,
        "sourceRefs": SOURCE_REFS,
        "constraints": CONSTRAINTS,
        "updateRequired": False,
        "updatePlan": "无；W1b 只调整 renderer 内部组合，不改变全局架构、模块职责或协议。",
    }

def design(current, proposed, decisions, risks):
    return {
        "affected": True,
        "currentBehavior": current,
        "proposedBehavior": proposed,
        "decisions": decisions,
        "risks": risks,
        "globalContextImpact": "无；页面门控、进程边界和 Surface 契约保持不变。",
    }

def feature(fid, title, goal, modules, verifications):
    return {
        "id": fid,
        "title": title,
        "goal": goal,
        "moduleRefs": ["M1"],
        "specRefs": ["S1"],
        "verification": [
            {"id": f"{fid}-V{index}", "statement": statement, "method": method, "status": "pending", "evidence": []}
            for index, (statement, method) in enumerate(verifications, 1)
        ],
    }

def module(reason, path, change="modify"):
    return {"id": "M1", "path": path, "change": change, "reason": reason}

def specs():
    return [
        {"id": "S1", "path": SOURCE_PATH, "change": "modify", "updateStatus": "pending", "relevance": "W1b 原始任务卡；实施后补充页面元数据、壳组合与验收证据。"},
        {"id": "S2", "path": "docs/CONTEXT.md", "change": "none", "updateStatus": "not_applicable", "relevance": "全局架构、协议与模块职责不因本次内部组合重构而变化。"},
    ]

sprint_path = ROOT / "docs/sprints/w1b/README.md"
sprint, warnings = tw.load_sprint(sprint_path)
if warnings:
    raise RuntimeError(warnings)
sprint["taskContext"] = context(
    "W1a 交付 titlebar 后，App 仍直接组合各块壳 UI；W1b 需要收敛 Sidebar、ContentArea、RightPanelHost 与页面注册元数据，同时不改变导航、模式门控、窗口控制、状态轮询和 Surface 生命周期。",
    "形成可独立验收的三栏壳组合，App 仅保留组合与顶层状态；将 W1b 拆成四个有明确依赖、模块边界和验证证据的子 task，本阶段不实施。",
    [
        "扩展 renderer 页面注册表的 slot/mode 元数据，保持页面 ID 和 simple/dev 门控不变。",
        "抽取 Sidebar 与 ContentArea，重组 App，并提供可拆卸的 RightPanelHost 空容器。",
        "补齐导航、模式切换、窗口控制、状态轮询、可选页面缺失负路径和 W0 冒烟回归。",
    ],
    ["W0 全绿（由另一任务推进）", "W1a 全绿，包含 UI 基座、ThemeProvider 与 titlebar 行为证据", "T1 → T2 → T3 → T4 顺序执行，避免并发修改 App.tsx"],
    ["W0/W1a 完成后会提供计划中所述 renderer App.tsx、pages.ts 与 smoke 工具；当前路径缺失只记录为依赖警告。"],
)
sprint["globalContext"] = global_context(
    "innate-desktop 的 apps/desktop 负责 Electron 壳与模式门控；W1b 是 W0 → W1a → W1b → W1c 中的纯 renderer 组合重构，既不接运行时协议，也不改变全局模块职责。"
)
sprint["designAnalysis"] = design(
    "目标基线由 App 直接组合壳区域，页面注册主要承担页面与模式门控；本仓当前尚未迁入这些 W0 产品源码，不能把计划文档当成已存在实现。",
    "pages.ts 同时声明 slot/mode；App 组合 Sidebar、ContentArea 与可拆卸 RightPanelHost；simple 隐藏开发入口与 Panel，dev 保持完整功能，三栏布局不改变既有业务行为。",
    [
        "Sidebar 直接消费 @innate/ui primitive，shell 只承担产品组合，不建立第二套 primitive。",
        "页面 ID 与现有门控语义保持不变，只增加 slot/mode 元数据；缺少可选页面时安全省略其贡献。",
        "App.tsx 由单一任务链顺序修改；RightPanelHost 本阶段保持空容器，W3 才接业务。",
    ],
    [
        "壳抽取可能意外改变默认页、模式门控、轮询清理或窗口事件，必须用 W1a 基线与 W0 冒烟双重对照。",
        "W0/W1a 未完成时目标路径不存在；在依赖满足前所有子 task 保持 blocked，不实施。",
    ],
)
sprint["specs"] = specs()
sprint["updatedAt"] = tw.now()
tw.save_text(sprint_path, tw.sprint_markdown(sprint))

source_excerpt = "\n".join((ROOT / SOURCE_PATH).read_text(encoding="utf-8").splitlines()[55:71])
common_dependencies = ["W0 与 W1a 全绿后才允许实施；当前仅完成分析。"]
plans = {
    "task-local-w1b-page-registry": {
        "context": context(
            "页面注册表需要同时表达页面归属槽位与模式门控，否则壳组合会继续散落导航与 simple/dev 判断。",
            "在不改页面 ID、默认页与门控结果的前提下扩展 slot/mode 元数据，为后续三栏组合提供单一注册入口。",
            ["扩展 renderer pages.ts 的注册项类型与数据。", "增加注册表、模式过滤和可选页面缺失的单元测试。"],
            common_dependencies,
            ["现有页面 ID、默认页和 simple/dev 页面集合以 W1a 行为基线为准。"],
        ),
        "global": "页面注册表属于 apps/desktop renderer 的组合层；只扩展元数据，不进入 core/kernel，也不改变插件装配与 Surface 契约。",
        "design": design(
            "页面注册承担现有页面和模式门控，但尚无 W1b 所需 slot/mode 壳元数据。",
            "每个注册项显式声明 slot 与 mode；simple/dev 过滤结果与旧行为一致，缺失的可选页面被安全忽略。",
            ["保持既有页面 ID 与默认页，不做顺手重命名。", "把模式过滤集中在注册表选择层，避免 Sidebar/ContentArea 各自复制门控。"],
            ["元数据默认值设计不当可能让 simple 泄露开发入口；需用双模式测试固定页面集合。"],
        ),
        "features": [
            feature("F1", "页面 slot/mode 注册", "用单一注册表描述壳槽位与模式门控", ["M1"], [
                ("每个现有页面保留原 ID，并声明合法 slot/mode；默认页不变", "运行 pages 注册表单测，逐项对照 W1a 页面清单与默认页基线"),
                ("simple 只得到原有公开页面，dev 保留原有完整页面集合", "分别构造 simple/dev 模式，断言过滤后的 ID 集合与 W1a 基线完全一致"),
            ]),
            feature("F2", "可选页面安全解析", "注册项缺失不拖垮壳启动", ["M1"], [
                ("删除一个可选页面注册后，选择器安全省略该项且无未捕获异常", "使用可选页面缺失夹具运行负路径单测，断言其余页面与默认回退可用"),
            ]),
        ],
        "modules": [module("扩展页面注册元数据与模式选择，保持既有 ID 和门控。", "apps/desktop/src/renderer/pages.ts")],
    },
    "task-local-w1b-shell-layout": {
        "context": context(
            "T1 提供页面元数据后，需要把 Sidebar 与 ContentArea 从 App 中抽出，同时保留现有导航和顶层状态行为。",
            "形成直接消费 @innate/ui Sidebar 的左栏和承载页面的中栏，使 App 只保留组合与顶层状态。",
            ["新增 shell 组合并调整 App.tsx。", "覆盖导航、模式切换、窗口控制与状态轮询的组合测试。"],
            common_dependencies + ["T1 task-local-w1b-page-registry 完成并通过验证。"],
            ["W1a 的 titlebar 与 ThemeProvider 保持原样，本任务不重写这些部件。"],
        ),
        "global": "本任务只改变 apps/desktop renderer 壳组合；main/preload/IPC 与 DSH/magpie 生命周期保持不变，页面业务组件继续复用。",
        "design": design(
            "App 直接实现导航与中栏壳 UI，页面切换和顶层状态与壳 markup 耦合。",
            "App 只组合 shell 与维护顶层状态；Sidebar 承载导航及底部状态位，ContentArea 按注册表渲染中栏页面。",
            ["直接导入 @innate/ui Sidebar primitive，不在 shell 内重写 Sidebar。", "保持 W1a titlebar 和现有窗口控制连接；状态轮询的启动/清理时序不变。"],
            ["拆分组件可能改变 effect 生命周期、默认导航或开发入口可见性；需组合测试和 W1a 基线对照。"],
        ),
        "features": [
            feature("F1", "Sidebar 与 ContentArea 抽取", "左栏导航和中栏页面由独立壳组合承担", ["M1"], [
                ("Sidebar 从 @innate/ui 单入口消费 primitive，未在本仓复制 primitive 或硬编码视觉 token", "静态检查 import 与样式，并运行 shell 组件测试"),
                ("点击导航只切换既有页面；simple 隐藏开发入口，dev 显示完整入口", "以 simple/dev 两种模式渲染 App，触发导航并断言活动页面及入口集合"),
            ]),
            feature("F2", "App 顶层行为保持", "壳抽取不改变窗口与状态行为", ["M1"], [
                ("窗口控制仍调用原有 API，状态轮询只启动一次且卸载时清理", "mock window.innate，断言窗口调用、轮询订阅数量及 unmount 清理"),
                ("W1a titlebar 结构及默认页行为不回退", "复用 W1a DOM 与默认页回归断言，对照基线结果"),
            ]),
        ],
        "modules": [module("新增 Sidebar/ContentArea 壳组合并收敛 App 顶层组合。", "apps/desktop/src/renderer/shell/", "add"), {"id": "M2", "path": "apps/desktop/src/renderer/App.tsx", "change": "modify", "reason": "移除逐块壳 UI，只保留组合与顶层状态。"}],
    },
    "task-local-w1b-right-panel-host": {
        "context": context(
            "三栏壳需要稳定的右栏扩展点，但 W1b 不能提前实现 W3 工作区业务 Panel。",
            "提供可拆卸的 RightPanelHost 空容器，接入 App 组合并保持 simple/dev 门控与中栏行为不变。",
            ["新增 RightPanelHost 容器及 App 挂载。", "测试空状态、拆卸和 simple/dev 可见性。"],
            common_dependencies + ["T2 task-local-w1b-shell-layout 完成并通过验证。"],
            ["右栏的具体业务内容与数据契约由 W3 决定，本任务不预设。"],
        ),
        "global": "RightPanelHost 是 apps/desktop 的 L2 壳扩展点，不是新 primitive、插件协议或工作区实现；不改变全局 Surface/Panel 契约。",
        "design": design(
            "当前壳没有独立可拆卸的右栏挂载点。",
            "App 可挂载或移除空 RightPanelHost；容器不加载业务模块，simple 不显示开发 Panel/入口，dev 保留现有功能。",
            ["只建立组合边界和空状态，不创建工作区面板、IPC 或假数据。", "容器移除不得影响 Sidebar、ContentArea 与既有 Surface。"],
            ["过早定义业务 props 会把 W3 设计耦合进 W1b；空容器应保持最小接口。"],
        ),
        "features": [
            feature("F1", "可拆卸右栏空容器", "建立稳定但不带业务语义的右栏挂载点", ["M1"], [
                ("挂载时呈现可访问的空右栏，未加载 W3 业务 Panel 或发起新 IPC", "渲染 App 并断言右栏空状态、业务模块未导入且无新增 API 调用"),
                ("移除 RightPanelHost 后，导航、模式切换和中栏页面仍正常工作", "以有/无右栏两种组合运行同一组壳交互测试"),
                ("simple 不暴露开发 Panel 或入口，dev 既有入口不减少", "对照 T1/W1a 门控基线运行双模式断言"),
            ]),
        ],
        "modules": [module("提供 RightPanelHost 最小空容器。", "apps/desktop/src/renderer/shell/RightPanelHost.tsx", "add"), {"id": "M2", "path": "apps/desktop/src/renderer/App.tsx", "change": "modify", "reason": "以可拆卸方式组合右栏，不接业务。"}],
    },
    "task-local-w1b-shell-regression": {
        "context": context(
            "前三个任务分别改变元数据和壳组合，需要统一证据证明 W1b 没有破坏 W0/W1a 行为。",
            "收口壳行为负路径、真实 Electron 冒烟和 W1b 证据，明确完成或失败，不以单测替代真实桌面验收。",
            ["补齐壳组合与 smoke 断言。", "运行全量门禁、W0 桌面冒烟并保存 W1b 证据。"],
            common_dependencies + ["T2 与 T3 完成并通过各自验证。"],
            ["执行时本机具备 W0 所需 Electron/DSH 冒烟环境；不可用时记录 failed，不降级为通过。"],
        ),
        "global": "本任务是 W1b 出口门禁，验证 apps/desktop 与 tools/smoke-desktop 的行为契约；不修改运行时协议，不替代 W1c 多标签验收。",
        "design": design(
            "分散的组件验证不足以证明真实 Electron 中三栏组合、窗口控制和状态行为一致。",
            "以组件负路径、真实 Electron CDP 冒烟和证据文件共同构成 W1b 出口；任何 W0 回退都阻止进入 W1c。",
            ["保留旧断言并新增三栏断言，不通过删除测试或放宽安全门禁取得通过。", "记录实际命令、退出码、测试数和截图路径，不预写结果。"],
            ["环境缺失或旧行为回退会使验收失败；必须显式记录并修复，不能标记 done。"],
        ),
        "features": [
            feature("F1", "壳行为与负路径回归", "统一覆盖 W1b 公开行为及缺失可选页降级", ["M1"], [
                ("导航、模式切换、窗口控制、状态轮询与 W1a 基线一致", "运行 desktop 组件/集成测试并保存实际结果"),
                ("删除一个可选页面注册时壳仍启动，其余页面可导航", "运行缺失可选注册的负路径单测并保存实际结果"),
                ("simple 不显示开发 Panel/入口，dev 保持全部现有功能", "在真实 Electron simple/dev 两种模式下执行 DOM 与交互断言"),
            ]),
            feature("F2", "W0 冒烟与阶段证据", "W1b 全量门禁和真实桌面验收可复查", ["M1"], [
                ("pnpm build、pnpm typecheck、pnpm test 均通过且记录实际测试数", "在仓库根依次执行三项命令，保存退出码和测试汇总"),
                ("pnpm smoke:desktop 的 W0 基线断言全绿，新增三栏断言通过", "运行真实 Electron CDP 冒烟，保存断言、截图与退出码；环境失败则标 failed"),
                ("W1b 证据完整且不含认证 URL、token 或 key", "核对 docs/susu/plan/evidence/W1b/ 的命令摘要与截图并执行敏感信息检查"),
            ]),
        ],
        "modules": [module("扩展真实 Electron 三栏、双模式和旧行为回归。", "tools/smoke-desktop/"), {"id": "M2", "path": "docs/susu/plan/evidence/W1b/", "change": "add", "reason": "保存 W1b 实际命令、测试数、截图和限制。"}],
    },
}

for task_id, plan in plans.items():
    path = ROOT / "docs/sprints/w1b" / f"{task_id}.md"
    task, warnings = tw.load_task(path)
    if warnings:
        raise RuntimeError(warnings)
    task["source"] = {"kind": "file", "path": SOURCE_PATH, "content": source_excerpt}
    task["taskContext"] = plan["context"]
    task["globalContext"] = global_context(plan["global"])
    task["designAnalysis"] = plan["design"]
    task["features"] = plan["features"]
    task["modules"] = plan["modules"]
    task["specs"] = specs()
    task["updatedAt"] = tw.now()
    tw.save_text(path, tw.task_markdown(task))

print(f"Planned {len(plans)} tasks in {sprint_path.relative_to(ROOT)}")
