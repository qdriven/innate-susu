# 阶段 4（M4）— DSH 侧 Innate Workbench 工作区插件

> 执行层：本阶段任务清单已迁移至 [docs/sprints/S2-m4-dsh-workbench-plugin.md](../../sprints/S2-m4-dsh-workbench-plugin.md)；本文保留目标、边界与架构上下文，任务以 Sprint 层为准。

状态：待 M3 完成 · 预估 4–6 天。

目标：让真实 DSH Harness 能安装一个 Innate 插件，获得文件树、文本/Markdown 预览和只读 Git status/diff；同一能力继续可在 dogic desktop 使用。此阶段把“DSH 作为宿主”从设想变成真实垂直切片。

## 1. 架构边界

```text
宿主无关能力（按实际复用收益拆分）
workspace 类型、只读契约、UI、Markdown、高亮、测试夹具
        ├─ dogic adapter → Electron WorkspaceService
        └─ DSH adapter   → DSH plugin 官方后端/桥接能力
```

建议模块：

- `plugins/workspace`：保留 dogic 侧装配与 Electron 主进程服务。
- `plugins/dsh-workbench`：由 DSH 加载，贡献工作区页面/Panel；M5 可继续贡献模型设置。
- `packages/workspace-ui`：仅在确有复用收益时承载纯 UI 与类型，不要求为了目录整齐强拆现有代码。

允许两侧采用不同 UI 实现，但功能名称、只读边界、核心场景和错误行为必须一致。

## 2. 任务分解

### T4.1 DSH plugin 能力侦察（0.5–1 天）

以当前安装的 DSH 版本实测并记录：

- 插件 manifest、link/install/uninstall、版本兼容和加载失败行为。
- `InnateUI` 的 toolbar/panels/settings 等真实贡献点与生命周期。
- 是否存在官方 Node/后端入口、文件读取、子进程、Git、目录选择与事件能力。
- 主题 token、明暗模式、通知、路由和状态持久化。
- 多窗口/多 profile、认证与 web 资源加载约束。

产出 `evidence/m4/plugin-capabilities.md` 和最小可加载示例。示例只用于侦察，不计作工作区完成。

决策规则：优先官方能力；若缺少文件或 Git 权限，缩小首片或明确阻塞，不能暴露任意文件系统、任意 shell，也不能假设桌面 IPC 在 DSH 内存在。

### T4.2 工作区能力与宿主解耦（0.5–1 天）

- 明确 `WorkspaceApi`、根目录选择、文档描述和安全快照的宿主无关部分。
- 将纯 UI、Markdown、高亮与 Electron IPC 适配分开；复用收益低的页面允许保留两份。
- dogic 侧现有行为保持不变，快照 schema 做版本兼容。
- 为双宿主定义同一场景：列目录、读文本、Markdown 相对资源、Git 状态与 staged/unstaged diff。

验收：现有 workspace 测试和桌面冒烟通过，不能为等待 DSH 侧而破坏当前功能。

### T4.3 DSH 插件骨架与安装链（0.5 天）

- 新增 `plugins/dsh-workbench`，严格 TypeScript，包含构建、manifest 和卸载清理。
- 使用 DSH 官方贡献点注册“工作区”叶子页面或 Panel，不加载完整 desktop。
- 插件加载失败只禁用自身，不破坏 DSH 对话和原生设置。
- 记录支持的 DSH 版本，不声称未测版本兼容。

### T4.4 文件与 Markdown 垂直切片（1 天）

- 用户明确选择或授权工作区根目录。
- 实现目录懒加载、文本/图片/Markdown 预览、代码高亮和文档切换。
- 保持 canonical root 包含检查、相对链接与图片防逃逸、大小限制和失败回退。
- token、凭据和文件内容不得写入插件布局持久化。

验收：在真实 DSH 内打开本仓，文件与 Markdown 可读，链接和图片行为与 dogic 一致。

### T4.5 只读 Git（0.5–1 天）

- 当前分支、porcelain status、已暂存/未暂存 diff。
- 若经系统 Git，使用参数数组和明确根目录；禁止 shell 字符串拼接。
- 不提供 stage、commit、checkout、reset、discard 等写操作。
- Git 不存在、非仓库、超大 diff 和路径异常都有可理解反馈。

### T4.6 生命周期、卸载与故障隔离（0.5 天）

- deactivate 与 dispose 语义明确；后台监听、计时器和子进程可回收。
- 卸载后贡献点消失、授权状态按文档处理，不修改用户项目文件。
- dogic 已嵌入 Harness 时，DSH 插件仍只显示叶子能力，不形成递归桌面。

### T4.7 双宿主验收（1 天）

- 保留现有 `tools/smoke-desktop.ts`  dogic 回归。
- 新增 DSH 宿主真实驱动与截图，证据放 `evidence/m4/`。
- 同一临时仓库跑双宿主场景，断言核心结果一致；敏感配置使用隔离环境。
- 验证安装、重载、卸载、版本不兼容和 Git 异常路径。

## 3. 出口标准

- 真实 DSH 内可安装、使用、重载和卸载 Innate 工作区插件。
- 文件、Markdown、高亮、Git status/diff 的核心功能在双宿主通过。
- dogic 现有工作区无回退，全部构建、类型检查、测试与便携冒烟通过。
- 若官方 API 无法安全支持某项，文档明确标记未完成和阻塞原因，不用静态演示替代。
