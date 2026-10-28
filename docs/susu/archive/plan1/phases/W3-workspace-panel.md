# W3 · 文件树变常驻右栏 Panel

> 预估 1–2 天 · 依赖：W1（可与 W2 并行）
> 目标：工作区从「dev 模式下的一页」变成壳右栏常驻 Panel，workspace root 全局化供 W4/Q3 共享；布局状态可恢复。**保持只读，不开放写入/commit。**

## 任务卡

### W3.1 右栏常驻 Panel 化

- **做什么**：
  - `plugin-workspace` 的 renderer（`WorkspacePage/FileTree/FilePreview/GitPanel`）从页面注册表迁到壳右栏插槽：`shell/` 增加右栏容器（宽度可拖拽，`react-resizable-panels` 已是 `@innate/ui` 依赖树内组件，经单入口取用或按纪律加进 app）。
  - dev 模式下 workspace 页面注册项移除（页面 → Panel 的单迁移，不留双入口）；simple 模式右栏默认收起。
  - `main/shared/plugin.ts`（WorkspaceService 与 UI 贡献契约）**零改动**；只动 desktop 侧装配与 renderer 布局。
- **如何验证**：`smoke:desktop` DOM 断言：右栏文件树常驻（simple 收起）；dev 模式页面注册表无 workspace 项；选文件 → 预览/Markdown/图片渲染不回退（对照 W0 截图）。

### W3.2 workspace root 全局化

- **做什么**：
  - root 状态提升为壳级单源：main 侧已是 `WorkspaceService`（`getRoot/pickRoot`），renderer 加 `WorkspaceContext`（选根 → 广播给 FileTree/GitPanel/状态栏显示当前根）。
  - main 暴露 `workspace:rootChanged` 事件；**W4（terminal cwd）与 Q3（任务执行 cwd）将从这一状态取根**，契约一次定稳：`{ rootPath, source: 'picked'|'default' }`。
- **如何验证**：选根后重启前状态一致；FileTree/GitPanel 同步切根；负路径：无效根（不存在/无权限）给显式错误并回退上一根。

### W3.3 布局状态快照

- **做什么**：
  - 右栏布局状态（展开目录、选中文件、当前根、栏宽）持久化到 `userData`，版本化 JSON（仿 M2 Surface 快照的版本字段 + 不兼容安全回退）；启动时恢复。
  - 只存 UI 状态，不存文件内容；路径不做敏感信息过滤说明（本地工具，但不进日志硬约束照旧）。
- **如何验证**：展开若干目录 → 重载 → 展开/选中/根恢复；手工破坏 schema 版本号 → 安全回退到默认布局（负路径测试）。

## 出口标准

1. 右栏常驻（simple 收起）、只读红线不破（无写入/commit 入口）。
2. root 单源契约落地，`workspace:rootChanged` 进通道表并被 W4/Q3 文档引用。
3. 布局快照恢复 + 版本不兼容回退负路径通过；测试基线只增。
4. `plugin-workspace` 包内 main/shared 零改动（diff 审查）。
