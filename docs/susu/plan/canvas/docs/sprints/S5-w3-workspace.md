# S5 · W3 只读工作区（源编号 W3.1–W3.7）

## T5.1 W3.1 固定 WorkspaceService 安全与行为契约
- **状态**：todo
- **做什么**：为 workspace main 补齐正/负路径测试（canonical root 包含检查、路径校验、大小上限、只读 Git 参数数组、注入负路径），在迁入实现上全部通过。
- **功能**：后续 UI 拆分有安全护栏。
- **如何验证**：全部正/负路径测试通过。
- **预估 / 依赖**：0.5 天 / 需 S3

## T5.2 W3.2 WorkspaceContext 与窄 IPC
- **状态**：todo
- **做什么**：workspace shared 加 root 切换事件契约；desktop main/preload/kernel 注册；契约一次定稳（rootPath+source）供 W4/Q3 消费。
- **功能**：选定根成为全局单源。
- **如何验证**：root 切换事件、旧 root 请求、跨 root 路径、伪造 workspaceId 正确处理。
- **预估 / 依赖**：0.5 天 / T5.1

## T5.3 W3.3 文件树与 Git 拆为右栏 Panel
- **状态**：todo
- **做什么**：workspace renderer 迁入 W1b 右栏容器（RightPanelHost）；注册/卸载 Panel；模式门控（simple 收起）；右栏 resize；dev 页面注册表移除 workspace 页。
- **功能**：文件树/Git 常驻右栏。
- **如何验证**：Panel 注册/卸载、目录加载、错误提示、门控与 resize 测试。
- **预估 / 依赖**：1 天 / T5.2

## T5.4 W3.4 文件与 diff 接入中栏文档标签
- **状态**：todo
- **做什么**：FilePreview/GitPanel 接 W1c SurfaceTabs 作 document 类标签；多文档打开/切换/关闭；跨 root 同路径 id 规则；错误隔离。
- **功能**：中栏承载文档，工作区不再是一页。
- **如何验证**：多文档操作、重复激活、Git 只读测试。
- **预估 / 依赖**：1 天 / T5.3

## T5.5 W3.5 Markdown、高亮与主题适配
- **状态**：todo
- **做什么**：FilePreview 主题消费宿主 .dark 状态与语义 token（不新增媒体查询机制）；syntax-highlighting 主题输入映射；链接/图片逃逸与恶意协议防护。
- **功能**：预览与壳明暗一致。
- **如何验证**：明暗截图、代码高亮、纯文本回退、恶意协议负路径。
- **预估 / 依赖**：0.5 天 / T5.4

## T5.6 W3.6 root、展开状态与文档快照
- **状态**：todo
- **做什么**：WorkspaceService 状态存储 + renderer 快照 + 版本迁移；快照只存 descriptor/root 引用/安全 UI 状态；不兼容版本安全回退。
- **功能**：重载恢复工作区状态。
- **如何验证**：正常恢复、文件已删、root 已移动、损坏 JSON、旧/未来版本、原子写失败。
- **预估 / 依赖**：0.5 天 / T5.5

## T5.7 W3.7 只读工作区端到端验收
- **状态**：todo
- **做什么**：smoke-desktop 断言右栏常驻/文档标签/恢复；真实 Electron 全流程；源基线安全测试不回退。
- **功能**：W3 出口。
- **如何验证**：端到端通过，证据齐全。
- **预估 / 依赖**：0.25 天 / T5.6
