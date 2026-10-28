# S6 · W4 主进程 PTY Terminal（源编号 W4.1–W4.7）

## T6.1 W4.1 验证 PTY 与 Electron 打包技术链
- **状态**：todo
- **做什么**：node-pty 最小技术 spike（新 terminal 插件雏形）；开发和便携目录各运行一次只读命令并正常退出；原生模块与 Electron ABI 匹配结论入证据。
- **功能**：打包可行性先行验证，失败不进 UI。
- **如何验证**：两环境各一次真命令通过。
- **预估 / 依赖**：0.5 天 / 需 S4、S5

## T6.2 W4.2 terminal 与 process capability 契约
- **状态**：todo
- **做什么**：terminal shared 类型、surface 必要类型、preload 类型化窄契约；capability 定义（独立高权限，不经 workspaceRead 隐式执行）。
- **功能**：契约先于实现。
- **如何验证**：契约单测：非法 id/尺寸、未知 shell、伪造 capability、重复 close。
- **预估 / 依赖**：0.5 天 / T6.1

## T6.3 W4.3 主进程 TerminalService
- **状态**：todo
- **做什么**：plugins/terminal/src/main 实现 spawn/write/resize/exit/数据流；宿主退出与面板关闭进程树回收；异常退出显式事件；cwd 绑 WorkspaceContext root。
- **功能**：终端进程底座。
- **如何验证**：真命令输出、中文/大数据、resize、退出码、重复 id、无 root/root 替换、孤儿进程检查。
- **预估 / 依赖**：1.5 天 / T6.2

## T6.4 W4.4 renderer Terminal Surface
- **状态**：todo
- **做什么**：terminal renderer 接 W1c SurfaceTabs；输入/输出/复制/resize/退出提示；simple 不可见；等宽字体与语义 token。
- **功能**：可用终端面板。
- **如何验证**：输入输出、中文、复制、标签切换、退出提示、simple 负路径。
- **预估 / 依赖**：1 天 / T6.3

## T6.5 W4.5 接通工作区 root 与变更语义
- **状态**：todo
- **做什么**：terminal main 订阅 WorkspaceContext；两 root 连续创建会话、切换 root、旧会话保持、无 root/失效 root 负路径。
- **功能**：终端与工作区共享 cwd。
- **如何验证**：root 变更语义测试通过。
- **预估 / 依赖**：0.5 天 / T6.4

## T6.6 W4.6 受控 process:execute 首片
- **状态**：todo
- **做什么**：terminal task executor 或独立 capability adapter（Q3 复用）；允许/未注册 profile、cwd 逃逸、超时、取消、非零退出、输出截断与审计脱敏。
- **功能**：Q3 的 process 执行面。
- **如何验证**：正路径真命令 + 全部负路径拒绝。
- **预估 / 依赖**：1 天 / T6.5

## T6.7 W4.7 安全、便携与故障回收验收
- **状态**：todo
- **做什么**：全量门禁、便携包含 PTY 的冒烟、崩溃/关闭两路径进程回收、资源上限。
- **功能**：W4 出口。
- **如何验证**：上述全过，W2/W3 行为不回退。
- **预估 / 依赖**：0.5 天 / T6.6
