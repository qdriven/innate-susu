# Sprint 2 — M4：DSH 侧 Innate Workbench 工作区插件

> 来源：[plans/innate-dogic-dsh/04-stage-4-dsh-host-workspace.md](../plans/innate-dogic-dsh/04-stage-4-dsh-host-workspace.md)。
> 目标：真实 DSH Harness 安装一个 Innate 插件，获得文件树、文本/Markdown 预览和只读 Git status/diff；同一能力继续在 dogic desktop 可用。把"DSH 作为宿主"从设想变成真实垂直切片。
> 预估：4–6 天。前置：S1（M3）完成。

```text
宿主无关能力（按实际复用收益拆分）
workspace 类型、只读契约、UI、Markdown、高亮、测试夹具
        ├─ dogic adapter → Electron WorkspaceService
        └─ DSH adapter   → DSH plugin 官方后端/桥接能力
```

决策规则：优先官方能力；缺文件/Git 权限时缩小首片或明确阻塞；不暴露任意文件系统/任意 shell；不假设桌面 IPC 在 DSH 内存在。

---

## T4.1 DSH plugin 能力侦察（短 spike）

- **做什么**：以当前安装的 DSH 版本实测并记录：插件 manifest、link/install/uninstall、版本兼容与加载失败行为；`InnateUI` 的 toolbar/panels/settings 真实贡献点与生命周期；官方 Node/后端入口、文件读取、子进程、Git、目录选择与事件能力；主题 token、明暗模式、通知、路由、状态持久化；多窗口/多 profile、认证与 web 资源加载约束。产出最小可加载示例（只用于侦察）。
- **功能**：方向 B 的全部实现方式取决于 DSH 官方插件能力的真实边界；先花 0.5–1 天实测避免数周的错误设计。
- **如何验证**：`evidence/m4/plugin-capabilities.md` 落档（每项能力标注：可用/受限/缺失 + 实测命令或代码路径）；最小示例在真实 DSH 加载成功并有截图；**不允许用静态页面冒充能力验证**。
- **预估 / 依赖**：0.5–1 天 / S1。

## T4.2 工作区能力与宿主解耦

- **做什么**：明确 `WorkspaceApi`、根目录选择、文档描述、安全快照的宿主无关部分；纯 UI/Markdown/高亮与 Electron IPC 适配分层（复用收益低的页面允许两份）；dogic 现有行为不变，快照 schema 版本兼容；为双宿主定义同一场景清单：列目录、读文本、Markdown 相对资源、Git status、staged/unstaged diff。
- **功能**：这是"允许两套薄实现，但契约与验收必须一致"原则的落地；不做这步，DSH 侧实现会与桌面实现各自漂移。
- **如何验证**：现有 workspace 测试与桌面冒烟全绿（不为等 DSH 侧而破坏现状）；场景清单落档并被两侧共享；快照 schema 有版本字段与兼容读取测试。
- **预估 / 依赖**：0.5–1 天 / T4.1。

## T4.3 DSH 插件骨架与安装链

- **做什么**：新建 `innate-dogic/plugins/dsh-workbench`（strict TS），含构建、manifest、安装/卸载清理；用 DSH 官方贡献点注册"工作区"叶子页面或 Panel（不加载完整 desktop）；插件加载失败只禁用自身，不破坏 DSH 对话与原生设置；记录支持的 DSH 版本。
- **功能**：M7 的独立分发对象从这里开始生长；fail-closed 语义在此建立。
- **如何验证**：真实 DSH 中 link/install 成功、uninstall 后贡献点消失且 DSH 原生功能完好；manifest 缺陷或版本不匹配时插件被禁用并留日志，DSH 不受影响。
- **预估 / 依赖**：0.5 天 / T4.1。

## T4.4 文件与 Markdown 垂直切片

- **做什么**：用户明确选择/授权工作区根目录；实现目录懒加载、文本/图片/Markdown 预览、代码高亮、文档切换；保持 canonical root 包含检查、相对链接与图片防逃逸、大小上限、失败回退；token/凭据/文件内容不进插件布局持久化。
- **功能**：双宿主第一个真实可用的垂直切片；安全边界（只读 + 防逃逸）从桌面原样带到 DSH 侧。
- **如何验证**：真实 DSH 内打开本仓，文件与 Markdown 可读，相对链接与图片行为与 dogic 一致；双宿主跑同一场景清单结果一致；路径逃逸用例（`../`、symlink）两侧都被拒绝；`evidence/m4/` 截图。
- **预估 / 依赖**：1 天 / T4.2、T4.3。

## T4.5 只读 Git

- **做什么**：当前分支、porcelain status、staged/unstaged diff；系统 Git 用参数数组 + 明确根目录（禁 shell 拼接）；不提供 stage/commit/checkout/reset/discard 等写操作；Git 不存在、非仓库、超大 diff、路径异常都有可理解反馈。
- **功能**：工作区场景的最后一块；只读边界是硬约束（工程规范第 3 节）。
- **如何验证**：双宿主同一临时仓库 diff 内容一致；注入用例（`relative` 传 `../..`、伪造 `--upload-pack` 类参数位）被拒绝；无 Git 环境的降级文案可操作。
- **预估 / 依赖**：0.5–1 天 / T4.4。

## T4.6 生命周期、卸载与故障隔离

- **做什么**：deactivate 与 dispose 语义明确；后台监听、计时器、子进程可回收；卸载后贡献点消失、授权状态按 DSH 文档处理、不修改用户项目文件；dogic 已嵌入 Harness 时，DSH 插件仍只显示叶子能力（无递归桌面）。
- **功能**：工程规范回滚表承诺"卸载后移除贡献点和监听，不影响 DSH 对话"；递归嵌入是计划第 1.1 节的红线。
- **如何验证**：安装→重载→卸载循环后 DSH 内存中无残留监听（DSH 调试通道或行为验证）；卸载后用户项目文件 mtime 不变；desktop 内嵌 Harness 中插件只见叶子能力，`evidence/m4/` 截图。
- **预估 / 依赖**：0.5 天 / T4.4。

## T4.7 双宿主验收

- **做什么**：保留 `tools/smoke-desktop.ts` dogic 回归；新增 DSH 宿主真实驱动与截图（`evidence/m4/`）；同一临时仓库跑双宿主场景断言核心结果一致；敏感配置用隔离环境；验证安装、重载、卸载、版本不兼容与 Git 异常路径。
- **功能**：M4 出口标准的直接执行项；"双宿主同一用例可对照"从此成为常规资产。
- **如何验证**：工程规范双宿主矩阵的"工作区"行全部通过；DSH 宿主 E2E 脚本可重复执行（非手工一次性）；全量门禁绿。
- **预估 / 依赖**：1 天 / T4.5、T4.6。

---

## 出口标准（M4）

- 真实 DSH 内可安装、使用、重载、卸载 Innate 工作区插件。
- 文件、Markdown、高亮、Git status/diff 核心功能双宿主通过且结果一致。
- dogic 现有工作区零回退；全量门禁 + 便携冒烟通过。
- 官方 API 无法安全支持的项目明确标记未完成与阻塞原因（不伪造）。
