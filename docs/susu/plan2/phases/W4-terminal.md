# W4：主进程 PTY Terminal

## 阶段目标

新增第一个高权限本地执行 Surface。terminal 由主进程持有 PTY，renderer 只处理终端展示和类型化输入/输出/resize/exit；默认绑定当前工作区 root，simple 模式不可见。

**前置**：W2 与 W3 均全绿。

## W4.1 验证 PTY 与 Electron 打包技术链

- **改动位置**：`plugins/terminal` 新包的最小技术 spike、desktop 打包配置。
- **实施**：
  1. 选择支持当前 Electron/Node 的 PTY 实现，记录原生模块、ABI 和 rebuild 要求。
  2. 用最小 main 进程会话验证 Windows 默认 shell、输入/输出、resize 和退出。
  3. 验证 electron-builder asarUnpack/extraResources 与便携目录加载，不以开发成功代替打包成功。
  4. 若技术链不成立，记录阻塞并保持 terminal 入口隐藏；禁止改成 renderer 任意 child_process IPC。
- **验证**：开发和便携目录各运行一次只读命令并正常退出。
- **完成标准**：技术选型、打包方式和回退条件有真实证据后才继续 UI。

## W4.2 定义 terminal 与 process capability 契约

- **改动位置**：terminal shared、`packages/core/surface` 必要类型、preload 类型。
- **实施**：
  1. 定义 create/input/output/resize/exit/close 的独立通道和会话 id。
  2. create 参数只接受受信 workspaceId、受控 shell/profile、初始尺寸；renderer 不提交拼接后的 shell 命令。
  3. `SurfaceCapability process:execute` 与 `workspace:read` 分离，terminal 不继承文件写权限。
  4. 为 Q3 预留结构化 ProcessRequest/Result，但不把交互 terminal 输入当成任务审批。
  5. 所有事件包含 terminalId/runId 必要关联，终态后忽略后续事件。
- **验证**：TypeScript 契约、非法 id、非法尺寸、未知 shell、伪造 capability、重复 close 测试。
- **完成标准**：renderer 无通用 shell/string execute 通道，任务与交互两种入口边界明确。

## W4.3 实现主进程 TerminalService

- **改动位置**：`plugins/terminal/src/main/`、desktop main 组合。
- **实施**：
  1. 按 terminalId 管理 PTY 会话，cwd 从 W3 main 内部 WorkspaceContext 解析并重新 canonical 校验。
  2. shell 使用显式配置和参数数组；环境变量只注入必要项，不输出 secret env。
  3. 实现 input/write、resize、close、dispose；Windows 关闭回收进程树。
  4. 设置输出缓冲、事件批量与背压上限；限制历史大小，防止长时间输出耗尽内存。
  5. deactivate 不杀会话，close 才终止；应用退出统一回收。
- **验证**：真命令输出、中文/大数据输出、resize、进程退出、重复 id、无 root、root 被替换、关闭与孤儿进程检查。
- **完成标准**：会话生命周期、资源上限和 cwd 安全均有自动测试。

## W4.4 实现 renderer Terminal Surface

- **改动位置**：terminal renderer、W1 SurfaceTabs、桌面底部/中栏组合。
- **实施**：
  1. 使用成熟终端 renderer 与 fit 能力，不在内容区用普通 `<pre>` 冒充交互终端。
  2. 支持键盘输入、滚动、复制、resize、清屏和关闭；快捷键不破坏全局窗口快捷键。
  3. terminal 作为独立 provider 接入 Surface 标签，切换只隐藏视图，进程和 scrollback 按策略保留。
  4. 断开会话显示 exited 状态和重开动作，不自动无限重启。
  5. UI 使用 `@innate/ui` 与语义 token；simple/dev 注册表只在 dev 显示。
- **验证**：输入/输出、中文、复制、resize、标签切换、退出提示和 simple 不可见。
- **完成标准**：真实交互终端可用，未把 Node/PTY 对象带入 renderer。

## W4.5 接通工作区 root 与变更语义

- **改动位置**：terminal main、WorkspaceContext 订阅、UI 状态。
- **实施**：
  1. 新建 terminal 默认 cwd 为当前 root，并显示目标工作区。
  2. 已运行会话在 root 切换时不自动更改 cwd；新会话使用新 root。
  3. 无 root 时要求先选择目录，或明确使用用户批准的受控默认目录。
  4. root 被删除/不可访问时创建失败并给 hint，不回退到任意系统目录。
- **验证**：两个 root 连续创建会话、切换 root、旧会话保持、无 root/失效 root 负路径。
- **完成标准**：W3“共享 root”在真实 terminal 中验证，行为无隐式越界。

## W4.6 实现受控 process:execute 首片

- **改动位置**：terminal task executor 或独立 capability adapter，供 Q3 复用。
- **实施**：
  1. 定义只允许注册 profile/可执行配置的结构化请求，cwd 必须属于已授权 workspace。
  2. 高影响执行需要显式 capability；本阶段先提供受控开发入口和审计结果，不自动运行项目任务。
  3. 收集 exitCode、开始/结束时间、截断后的安全输出摘要；完整输出默认不进快照。
  4. 超时、取消、非零退出和输出超限均返回显式状态。
  5. Q3 前的自动调用保持关闭，避免未经项目审批触发命令。
- **验证**：允许/未注册 profile、cwd 逃逸、超时、取消、非零退出、输出截断与审计脱敏。
- **完成标准**：后续 Q3 可调用受控 executor，而不是重新发明通用 shell IPC。

## W4.7 安全、便携与故障回收验收

- **改动位置**：tools/smoke-desktop、package 配置、证据。
- **实施**：
  1. 运行真实交互命令、受控 process 请求、resize 和标签生命周期。
  2. 伪造 renderer 调用未知 profile/capability，确认 main 拒绝。
  3. 构建便携目录，重复验证 PTY 加载和进程树回收。
  4. 检查 simple 无入口，无 DSH/magpie 时受控 terminal 仍按设计可用。
  5. 全量门禁与证据检查，日志不含环境 secret。
- **验证**：上述全部通过，W2/W3 行为不回退。
- **完成标准**：W4.1–W4.7 全绿才允许开始 W5。

## 阶段回退

terminal provider 默认禁用并恢复 W3 便携基线。若原生模块打包失败，不发布 W4，也不以低权限名义开放更危险的通用执行通道。
