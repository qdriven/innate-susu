# S3 · W3 文件树变常驻右栏 Panel

> 详细任务卡：docs/susu/plan1/phases/W3-workspace-panel.md。目标：工作区从一页变壳右栏常驻 Panel；保持只读。

## T3.1 右栏常驻 Panel 化
- **状态**：todo
- **做什么**：plugin-workspace 的 renderer 迁到壳右栏插槽（宽度可拖拽）；dev 页面注册项移除；simple 右栏默认收起；plugin-workspace 的 main/shared 契约零改动。
- **功能**：文件树/Git 常驻可见，页面注册表减负。
- **如何验证**：smoke:desktop 断言右栏常驻（simple 收起）；文件预览/Markdown/图片不回退。
- **预估 / 依赖**：1 天 / 需 S1；可与 S2 并行

## T3.2 workspace root 全局化
- **状态**：todo
- **做什么**：root 提升为壳级单源（main 已有 getRoot/pickRoot）；renderer 加 WorkspaceContext；main 暴露 workspace:rootChanged；契约 {rootPath, source} 一次定稳供 W4/Q3 消费。
- **功能**：选定根成为全局事实，后续执行面共享 cwd。
- **如何验证**：选根后各面板同步；无效根显式错误并回退上一根。
- **预估 / 依赖**：0.5 天 / 需 S1；可与 S2 并行

## T3.3 布局状态快照
- **状态**：todo
- **做什么**：右栏布局状态（展开/选中/根/栏宽）版本化 JSON 持久化到 userData，启动恢复；不兼容 schema 安全回退默认布局。
- **功能**：重载后工作区状态原样。
- **如何验证**：展开若干目录重载后恢复；破坏版本号回退默认布局的负路径测试。
- **预估 / 依赖**：0.5 天 / 需 S1；可与 S2 并行
