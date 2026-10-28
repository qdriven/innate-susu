# S4 · W4 terminal：pty + process:execute

> 详细任务卡：docs/susu/plan1/phases/W4-terminal.md。目标：壳自建第一个高权限 Surface；不发明通用 shell IPC；simple 不可见。

## T4.0 harness.ts 关键路径单测
- **状态**：todo
- **做什么**：给 main/harness.ts 补单测（stdout 解析含畸形输出、就绪探针含 401/超时、停止路径 taskkill 调用）；进程交互注入 fakeChild，不真拉 dsh。
- **功能**：最关键零测试文件获得护栏，测试基线只增。
- **如何验证**：新增至少 5 用例；现有 dsh 冒烟不回归。
- **预估 / 依赖**：0.5 天 / 需 S2、S3

## T4.1 pty 服务
- **状态**：todo
- **做什么**：加 node-pty；新建 main/terminal/TerminalService（spawn/write/resize/exit、数据流转发）；宿主退出 taskkill 进程树回收；面板关闭即杀；异常退出显式 exit 事件；cwd 默认绑 S3 的 workspace root。
- **功能**：壳自建终端的进程底座。
- **如何验证**：echo 真命令闭环、resize、exit 码上报契约测试；坏 shell 路径显式报错负路径。
- **预估 / 依赖**：1 天 / 需 S2、S3

## T4.2 terminal Surface
- **状态**：todo
- **做什么**：加 @xterm/xterm + addon-fit；中栏标签内 React 终端面板；terminal:* 窄通道进类型化契约；scrollback 环形缓冲；多终端并存；simple 不渲染入口。
- **功能**：dev 模式可开多终端真干活。
- **如何验证**：pnpm -v 与 git status 全链路；resize 跟随窗口；两会话输出隔离；simple 无入口负路径。
- **预估 / 依赖**：1 天 / 需 S2、S3

## T4.3 process:execute 能力
- **状态**：todo
- **做什么**：process.execute 独立能力位（dev 默认开、simple 永久拒）；可执行文件白名单表落 userData；cwd 强制在 workspace root 子树内（防 .. 逃逸）；参数数组、禁 shell 拼接；超时与输出截断上限；与终端面板共用 pty 底座但独立通道。
- **功能**：Q3 任务执行面的能力与安全地基。
- **如何验证**：负路径四件套（非白名单、cwd 越界、simple 调用、绕 preload 直连）全拒；正路径 git status 在选定根真实执行。
- **预估 / 依赖**：1 天 / 需 S2、S3

## T4.4 无孤儿与资源上限
- **状态**：todo
- **做什么**：窗口关闭与宿主崩溃两路径的进程回收验证；并发 pty 上限（如 8）超限显式拒绝；scrollback 内存上限。
- **功能**：不留孤儿进程，资源有界。
- **如何验证**：自动化脚本杀宿主后断言无遗留子进程；第 9 个 pty 被拒且 UI 有原因。
- **预估 / 依赖**：0.5 天 / 需 S2、S3
