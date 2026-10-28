"""Populate W1a/W1c plans with canonical task-workflow writers; no product changes."""
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / ".agents/skills/task-workflow/scripts/task.py"
spec = importlib.util.spec_from_file_location("task_workflow", SCRIPT)
tw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tw)
SOURCE = "docs/susu/plan/phases/W1-shell.md"
REFS = ["docs/CONTEXT.md", "docs/susu/plan/README.md", SOURCE]


def tc(problem, goal, scope, deps, assumptions):
    return {"problem": problem, "goal": goal, "scope": scope, "nonGoals": NON_GOALS,
            "dependencies": deps, "assumptions": assumptions, "openQuestions": []}


def gc(summary):
    return {"summary": summary, "sourceRefs": REFS, "constraints": CONSTRAINTS,
            "updateRequired": False, "updatePlan": "无；按 W1 既定架构实施，完成时只补阶段证据与任务状态。"}


def da(current, proposed, decisions, risks):
    return {"affected": True, "currentBehavior": current, "proposedBehavior": proposed,
            "decisions": decisions, "risks": risks, "globalContextImpact": "无；不超出 W1 已定义的壳组合与 Surface 边界。"}


def ft(fid, title, goal, checks, refs=None):
    return {"id": fid, "title": title, "goal": goal, "moduleRefs": refs or ["M1"], "specRefs": ["S1"],
            "verification": [{"id": f"{fid}-V{i}", "statement": statement, "method": method,
                              "status": "pending", "evidence": []}
                             for i, (statement, method) in enumerate(checks, 1)]}


def md(path, reason, change="modify", mid="M1"):
    return {"id": mid, "path": path, "change": change, "reason": reason}


def specs():
    return [{"id": "S1", "path": SOURCE, "change": "modify", "updateStatus": "pending",
             "relevance": "对应 W1 阶段任务卡；实施完成后登记实际行为与证据。"},
            {"id": "S2", "path": "docs/CONTEXT.md", "change": "none", "updateStatus": "not_applicable",
             "relevance": "全局 Context 已定义模式门控、壳 IPC 与 Surface 安全约束，本任务按既有边界实施。"}]


def source_excerpt(start, end):
    return "\n".join((ROOT / SOURCE).read_text(encoding="utf-8").splitlines()[start:end])


def apply_sprint(sprint_id, data, excerpt):
    path = ROOT / "docs/sprints" / sprint_id / "README.md"
    sprint, warnings = tw.load_sprint(path)
    if warnings:
        raise RuntimeError(warnings)
    sprint["taskContext"] = data["context"]
    sprint["globalContext"] = gc(data["global"])
    sprint["designAnalysis"] = data["design"]
    sprint["specs"] = specs()
    sprint["updatedAt"] = tw.now()
    tw.save_text(path, tw.sprint_markdown(sprint))
    for task_id, task_data in data["tasks"].items():
        task_path = path.parent / f"{task_id}.md"
        task, warnings = tw.load_task(task_path)
        if warnings:
            raise RuntimeError(warnings)
        task["source"] = {"kind": "file", "path": SOURCE, "content": excerpt}
        task["taskContext"] = task_data["context"]
        task["globalContext"] = gc(task_data["global"])
        task["designAnalysis"] = task_data["design"]
        task["features"] = task_data["features"]
        task["modules"] = task_data["modules"]
        task["specs"] = specs()
        task["updatedAt"] = tw.now()
        tw.save_text(task_path, tw.task_markdown(task))


CONSTRAINTS = ["前置阶段未全绿时只允许计划，不实施产品代码。",
               "严格使用 @innate/ui 单入口、产品主题入口和语义 token，明暗只经 .dark。",
               "保持 strict TypeScript、W0 行为基线与进程/安全边界，验证证据必须来自真实执行。"]
NON_GOALS = ["不重写 magpie/DSH 启动协议，不实现 terminal/browser。",
             "不降低 W0 行为与安全断言，不把认证 URL、token、key 写入快照或证据。",
             "不复制 @innate/ui primitive，不在组件中硬编码颜色、字号或像素间距。"]
W1A_NON_GOALS = NON_GOALS + ["W1a 不重写 Sidebar、不拆页面、不接 W2 pill，也不改变 Surface 多标签语义。"]
W1C_NON_GOALS = NON_GOALS + ["不改变 W1b 已定壳组合，不新增无功能 provider 占位入口。"]
NON_GOALS = W1A_NON_GOALS
W0_DEP = "W0 全绿；当前 W0.2–W0.8 仍为 draft，目标产品源码尚未迁入。"
FONT_DEP = "W1a.0 已拍板产品层字体方案，由 packages/theme 提供 Geist 与产品 token。"
W1A_DATA = {
    "context": tc("W0 桌面基线尚未迁入，无法直接接入 UI 基座或替换 titlebar；需要先固定行为，再按既定产品主题层完成 W1a。",
                  "在 W0 全绿后依次建立行为基线、接入 Tailwind/ThemeProvider、只替换 titlebar，并保存真实明暗与行为证据。",
                  ["W1a.1 行为基线", "W1a.2 产品主题接入", "W1a.3 titlebar 替换"],
                  [W0_DEP, FONT_DEP, "T1 → T2 → T3 顺序执行"],
                  ["W0 完成后提供 apps/desktop 与 tools/smoke-desktop；当前缺失路径仅为依赖警告。"]),
    "global": "W1a 属于 apps/desktop renderer 的 UI 基座与窗口铬面改造；字体事实源已固定为本仓 packages/theme，基础仓保持 Inter 默认。",
    "design": da("目标仓尚无桌面实现；W1a.0 已在 packages/theme 落地产品字体与 token 分层。",
                 "W0 行为先由测试固定，renderer 经唯一产品主题入口消费 @innate/ui 与 ThemeProvider，titlebar 三区结构保持窗口控制行为。",
                 ["严格使用 @innate-desktop/theme/index.css 唯一主题入口。", "明暗只经 .dark，Sidebar 与页面在 W1a 保持原样。", "状态槽仅留空节点，不接 W2 数据。"],
                 ["在 W0 前实施会失去行为对照与源码落脚点；主题顺序错误会覆盖产品 token。"]),
    "tasks": {
        "task-local-w1a-behavior-baseline": {
            "context": tc("后续壳重构需要可重复的 simple/dev、Harness、控制台与窗口行为基线。",
                          "在未经 UI 改造的 W0 实现上补齐公开页面与两个 WebContents Surface 的回归断言。",
                          ["renderer/main 行为测试", "窗口尺寸、resize 与 bounds 证据"], [W0_DEP],
                          ["真实 DSH/Electron 环境不可用时记录 failed，不用 mock 结果冒充真机通过。"]),
            "global": "只新增行为测试和证据，固定 apps/desktop 与 tools/smoke-desktop 当前契约。",
            "design": da("W0 行为由真实桌面实现提供，但尚缺 W1 重构专用回归断言。",
                         "simple/dev 页面、默认页、模式切换、Harness 状态与两个 Surface 生命周期均有可重复基线。",
                         ["先测旧行为再改 UI。", "URL 未变不 reload，显式停止才 close。"], ["环境差异可能导致真机验证失败，必须显式收口。"]),
            "features": [ft("F1", "页面与 Harness 基线", "固定导航、模式及对话行为", [
                ("simple/dev 页面集合、默认页、模式切换和 Harness 启动状态与 W0 一致", "运行 renderer/main 基线测试并保存结果"),
                ("离开对话再返回且 URL 未变时不 reload，显式停止才 close", "用 WebContents 生命周期测试记录 reload/close 调用")]),
                         ft("F2", "控制台与窗口基线", "固定 show/hide/bounds/close 和 resize 行为", [
                ("控制台 show/hide/bounds/close 与窗口 resize 行为有真实证据", "运行桌面测试与 smoke，保存窗口尺寸和 bounds 摘要")])],
            "modules": [md("apps/desktop/src/", "新增 W0 行为基线测试"), md("tools/smoke-desktop/", "保存窗口与 Surface 真机基线", mid="M2")],
        },
        "task-local-w1a-theme-foundation": {
            "context": tc("renderer 需要消费统一 UI 基座，同时保持已固定的 simple/dev 行为。",
                          "接入 Tailwind、产品主题入口和 ThemeProvider，完成语义 token 桥接。",
                          ["app 依赖与 renderer 构建配置", "globals.css、ThemeProvider 与旧样式桥接"], [W0_DEP, FONT_DEP, "T1 基线全绿"],
                          ["@innate/ui 经私有 registry 消费，不复制或深引源码。"]),
            "global": "只改变 apps/desktop 的 UI 构建与主题消费；packages/theme 已是产品 token 和 Geist 字体事实源。",
            "design": da("W0 使用旧 CSS，尚无 Tailwind 与宿主 ThemeProvider 的统一接入。",
                         "globals.css 以固定顺序引入 tailwindcss 和 @innate-desktop/theme/index.css，壳样式使用语义 token。",
                         ["@source 位于所有 import 后。", "不引用 @innate/ui/globals.css，不在组件写 font-family。"], ["插件或 import 顺序错误会导致裸样式或 token 覆盖失效。"]),
            "features": [ft("F1", "主题与 Tailwind 接入", "renderer 正确使用唯一产品主题入口", [
                ("renderer 构建挂 @tailwindcss/vite，入口顺序和两条 @source 符合契约", "检查配置并运行 build/typecheck"),
                ("ThemeProvider 通过 .dark 切换明暗，代表页面无裸样式", "运行主题测试并保存明暗截图")]),
                         ft("F2", "旧行为保持", "主题接入不改变公开行为", [
                ("T1 simple/dev、默认页与 Harness 基线全部保持通过", "重跑 T1 同一组断言，不修改旧断言口径")])],
            "modules": [md("apps/desktop/package.json", "声明 UI、产品主题和 Tailwind 依赖"), md("apps/desktop/src/renderer/", "接入入口 CSS、ThemeProvider 与语义 token", mid="M2")],
        },
        "task-local-w1a-titlebar": {
            "context": tc("UI 基座就位后，需要只替换窗口 titlebar，而不带入 W1b/W2 范围。",
                          "实现三区 TitlebarStrip，保留窗口控制、拖拽、双击最大化，并预留空状态槽。",
                          ["Titlebar.tsx 到 shell/TitlebarStrip 的替换", "三区 DOM、窗口行为与明暗验证"], [W0_DEP, "T2 全绿"],
                          ["W1b 的 Sidebar/页面和 W2 的 pill 均不在本任务修改。"]),
            "global": "仅改变 apps/desktop renderer titlebar 组合，沿用现有窗口 IPC 与 @innate/ui Button primitive。",
            "design": da("W0 Titlebar 提供窗口控制和拖拽行为。",
                         "左侧品牌、中间空 tabs 槽、右侧窗口控制/右栏开关位与空状态槽组成唯一新顶栏。",
                         ["toolbar 用 outline Button，图标用 ghost Button。", "状态槽无数据、无假 pill。"], ["顶栏改造可能破坏拖拽区与窗口控制，需 DOM 和真机双重验证。"]),
            "features": [ft("F1", "三区顶栏与空槽", "窗口铬面符合 W1a 边界", [
                ("DOM 包含品牌、#titlebar-tabs、窗口控制、右栏开关位和空状态槽", "运行 TitlebarStrip DOM 断言"),
                ("控件只消费 @innate/ui Button 与语义 token", "静态检查 import、class 和 token 使用")]),
                         ft("F2", "窗口行为与视觉回归", "替换顶栏不改变现有行为", [
                ("拖拽、双击最大化及窗口控制行为不回退", "运行窗口控制测试与真实 Electron 冒烟"),
                ("明暗截图和 T1/T2 行为基线均通过", "保存截图并重跑全部 W1a 基线")])],
            "modules": [md("apps/desktop/src/renderer/shell/TitlebarStrip.tsx", "新增三区顶栏组合", "add"), md("apps/desktop/src/renderer/Titlebar.tsx", "收敛到 TitlebarStrip，保留现有窗口 API", mid="M2")],
        },
    },
}

NON_GOALS = W1C_NON_GOALS
W1B_DEP = "W1b 全绿；当前四个 W1b 子 task 均为 blocked。"
W1C_DATA = {
    "context": tc("W1c 要在统一中栏槽承载 Harness、控制台与本地页面，但 W0/W1a/W1b 尚未完成，当前没有可改造的 Surface 实现。",
                  "在前置全绿后实现 provider 中立标签模型、窄 IPC、运行时降级和 W1 出口回归，确保 detach 不销毁且 token 不进状态。",
                  ["W1c.1 标签模型", "W1c.2 统一 Surface IPC", "W1c.3 运行时降级", "W1c.4 便携回归"],
                  [W0_DEP, "W1a 全绿", W1B_DEP, "T1 → T2 → T3 → T4 顺序执行"],
                  ["前置阶段提供 packages/core、desktop main/preload/renderer 与便携工具；当前不伪造实现。"]),
    "global": "W1c 复用 packages/core Surface 契约，在 apps/desktop 增加 provider 中立适配；main 独占运行时私有类型，renderer 只保存安全 descriptor。",
    "design": da("目标实现尚未迁入；W0 文档基线描述 Harness 与控制台由专用 show/hide/bounds/close IPC 管理。",
                 "两类 WebContents 与 renderer document/panel 经统一标签槽组合，切换只 detach，显式 close 才销毁；单个 provider 失败不影响壳。",
                 ["标签状态仅含安全字段，provider 私有句柄留在 main。", "保留旧快照 v1 兼容与非法版本安全回退。", "认证 URL 只在对应 runtime provider 内解析。"],
                 ["伪造 providerId、token 泄露、误销毁 Surface 是核心安全风险，必须设负路径门禁。"]),
    "tasks": {
        "task-local-w1c-surface-model": {
            "context": tc("专用页面状态无法统一承载不同 provider，且可能泄露运行时私有类型。",
                          "实现安全、provider 中立的 Surface 标签状态和注册接口，兼容 snapshot v1。",
                          ["core Surface 契约复用", "renderer surfaces 标签状态与 provider 注册"], [W1B_DEP],
                          ["terminal/browser 只保留 kind，不创建空 provider。"]),
            "global": "安全标签模型位于 packages/core 与 apps/desktop renderer，不引用 Electron WebContents 或 ChildProcess。",
            "design": da("Harness/控制台各自维护页面状态，标签模型与私有 runtime 类型耦合。",
                         "统一标签只保存 id/kind/providerId/title/workspaceId/capabilities，并提供 open/activate/deactivate/close。",
                         ["新增元数据可选，旧 snapshot v1 可读。", "重复 ID、非法 descriptor 与版本均显式处理。"], ["不安全字段进入 renderer 或快照会破坏 token 与进程边界。"]),
            "features": [ft("F1", "安全标签状态机", "统一 Surface 生命周期且保持快照安全", [
                ("open/activate/deactivate/close、activeId 恢复和重复 ID 行为正确", "运行 surface 状态单测覆盖全部转换"),
                ("旧快照可读，非法 descriptor/版本安全回退，token 与私有对象不进入状态", "运行兼容、安全负路径单测并检查快照字段")])],
            "modules": [md("packages/core/src/surface.ts", "复用并扩展安全 Surface 契约"), md("apps/desktop/src/renderer/surfaces/", "实现 provider 中立标签状态和注册接口", "add", "M2")],
        },
        "task-local-w1c-surface-ipc": {
            "context": tc("专用 Harness/console IPC 导致重复状态与生命周期逻辑，需要统一窄接口。",
                          "把 Harness 与控制台迁移到 provider 中立 show/hide/bounds/close，并保留 runtime 启动 API。",
                          ["main surface-host/IPC、preload 与 renderer 适配", "双 Surface 切换、resize、close 与伪造 provider 验证"], [W1B_DEP, "T1 全绿"],
                          ["通用 renderer 不提交认证 URL，私有解析限制在对应 main runtime provider。"]),
            "global": "只调整 apps/desktop 壳层 IPC 与适配；packages/core 安全契约不变，runtime 启动流程不重写。",
            "design": da("Harness 与控制台使用专用 IPC 和 renderer 状态。",
                         "统一 Surface IPC 接收安全 descriptor/provider 句柄/bounds，切换 detach，显式 close 销毁。",
                         ["旧通道仅作临时适配，无调用后删除。", "认证 URL 永不进入通用 renderer 请求。"], ["迁移可能出现重复 listener、误 close 或 provider 越权，需 CDP 与负路径验证。"]),
            "features": [ft("F1", "统一 Surface IPC", "两个 WebContents 客人共用同一中栏槽", [
                ("交替切换不 reload，resize/maximize bounds 正确，关闭一个不影响另一个", "运行真实 Electron CDP 生命周期与 bounds 断言"),
                ("伪造 providerId 被拒绝，通用 renderer 请求不含认证 URL/token", "运行 main/preload 安全负路径测试并检查日志快照")])],
            "modules": [md("apps/desktop/src/main/", "实现统一 Surface host/IPC 并保持 provider 私有解析"), md("apps/desktop/src/preload/", "暴露窄安全 API", mid="M2"), md("apps/desktop/src/renderer/", "迁移 Harness/Console 到统一标签槽", mid="M3")],
        },
        "task-local-w1c-runtime-degradation": {
            "context": tc("外部 DSH 或控制台 provider 失败不能拖垮整个桌面壳。",
                          "实现可摘除 provider 注册与明确错误/重试界面，隔离单个客人的失败。",
                          ["provider 注册失败、DSH 缺失与控制台失败降级", "壳和其他本地页面可用性验证"], [W1B_DEP, "T2 全绿"],
                          ["不新增 terminal/browser 等无功能入口。"]),
            "global": "降级只影响 apps/desktop renderer 组合与 provider dispose，runtime 服务仍由 main 管理。",
            "design": da("专用组合可能让单个运行时失败扩散为 App 白屏或停止其他 Surface。",
                         "DSH 缺失显示启动/重试/提示；控制台禁用只移除自身贡献，Harness 与其他页面继续可用。",
                         ["错误常驻且恢复动作显式可达。", "provider dispose 只清理自身 listener/Surface。"], ["共享 dispose 或全局错误边界可能误停其他 provider。"]),
            "features": [ft("F1", "运行时故障隔离", "单个 provider 失败不破坏壳", [
                ("模拟 DSH 缺失/未启动/注册失败时壳、导航和其他页面仍可用", "运行三类故障注入测试并断言错误与重试动作"),
                ("禁用控制台只移除其标签和贡献，不停止 Harness；dispose 不影响其他 provider", "运行 provider 隔离与 dispose 测试")])],
            "modules": [md("apps/desktop/src/renderer/", "实现 provider 错误页、重试与可摘除组合")],
        },
        "task-local-w1c-shell-regression": {
            "context": tc("W1c 出口必须证明真实桌面与便携形态下行为、安全和旧功能均未回退。",
                          "完成三栏/标签/双模式/降级 DOM 断言、全量门禁、overlay、便携冒烟和证据收口。",
                          ["tools/smoke-desktop 更新", "全量门禁、overlay 7/7、便携与生命周期证据"], [W1B_DEP, "T2 与 T3 全绿"],
                          ["真实环境失败必须记 failed，不能删除旧测试或降低安全断言。"]),
            "global": "这是 W1 出口验证，不改变产品协议；证据写入 docs/susu/plan/evidence/W1c/。",
            "design": da("组件测试无法覆盖便携包内多 Surface、resize 和关闭回收。",
                         "开发与便携形态均验证三栏、多标签、降级及 W0 行为，保存明暗截图与无 token 日志摘要。",
                         ["全量旧断言只增不减。", "便携后必须运行真实 Electron 冒烟。"], ["环境或打包缺失会阻塞 W1 出口，不能标记完成。"]),
            "features": [ft("F1", "全量与真实桌面门禁", "W0 与 W1 全部门禁可复查", [
                ("build/typecheck/test、overlay 7/7 与开发桌面冒烟全部通过", "执行真实命令，保存退出码、测试数与断言"),
                ("三栏、标签、simple/dev、错误降级及多 Surface 生命周期正确", "运行 CDP 场景并保存明暗截图和无 token 生命周期日志")]),
                         ft("F2", "便携与安全出口", "分发形态保持行为与 token 安全", [
                ("便携目录完成多 Surface 切换、resize、关闭回收且 W0 行为不回退", "构建便携目录并运行真实冒烟"),
                ("W1a–W1c 证据齐全，日志/快照/截图无认证 URL、token 或 key", "核对证据目录并执行敏感信息检查")])],
            "modules": [md("tools/smoke-desktop/", "增加 W1 与便携回归断言"), md("docs/susu/plan/evidence/W1c/", "保存 W1 出口真实证据", "add", "M2")],
        },
    },
}

apply_sprint("w1a", W1A_DATA, source_excerpt(6, 56))
apply_sprint("w1c", W1C_DATA, source_excerpt(74, 124))
print("Populated W1a (3 tasks) and W1c (4 tasks); implementation remains gated.")
