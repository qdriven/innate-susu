# W4 · terminal：pty + process:execute 能力

> 预估 2–3 天 · 依赖：W2 + W3
> 目标：壳自建第一个高权限 Surface——主进程 pty 终端；同时奠定 Q3 的 `process:execute` 通用执行面（白名单 + 独立 capability）。**不发明通用 shell IPC；simple 模式不可见。**

## 任务卡

### W4.0 前置：harness.ts 关键路径单测

- **做什么**：给 `main/harness.ts` 补单测（W0 迁入后它仍是 0 测试的最高风险文件）：stdout `dsh web: <url?token>` 解析（含畸形输出）、就绪探针（<500 就绪/401 算就绪/超时失败）、停止路径（taskkill /T 调用被发出）。进程交互用注入 fakeChild 方式测，不真拉 dsh。
- **如何验证**：新增 ≥5 用例入基线；现有 dsh 冒烟不回归。

### W4.1 pty 服务（main 进程）

- **做什么**：
  - 依赖加 `node-pty`（Windows conpty）；新建 `main/terminal/TerminalService`：spawn（shell 可配置，默认 PowerShell/comspec 探测）、`write/resize/exit`、数据流转发、退出码收集。
  - 生命周期：宿主退出回收全部 pty（`taskkill /T /F` 进程树，与 harness 停止同法）；面板关闭即杀对应 pty；崩溃/异常退出给 renderer 显式 exit 事件（含退出码），不静默重连。
  - env：继承壳环境 + `cwd` 默认绑 W3 的 workspace root（未选根时用用户目录并在 UI 提示）。
- **如何验证**：契约测试：spawn→write→exit 闭环（echo 真命令）、resize 事件、exit 码上报；负路径：pty spawn 失败（伪造坏 shell 路径）显式报错。隔离：单测用真实 node-pty 跑无害命令（echo），不进网络/文件破坏。

### W4.2 terminal Surface（renderer）

- **做什么**：
  - 依赖加 `@xterm/xterm` + `@xterm/addon-fit`；新建 terminal 面板（中栏标签槽的一种容器，React 面板非 WebContentsView）；主题色取 `@innate/ui` 语义 token（等宽字体栈见 style-guide §3：`"Geist Mono", Consolas, monospace`）。
  - 窄通道：`terminal:create/{input,data,exit}/resize` 进通道表 + preload satisfies；**二进制/大流量数据通道不加打包器，裸转发 + 背压上限（scrollback 环形缓冲，如 10k 行）**。
  - 入口：dev 模式中栏「+」新建终端标签；多终端并存（每标签一个 pty id）；simple 模式不渲染入口（门控在注册表）。
- **如何验证**：真命令全链路（`pnpm -v`、`git status`）；resize 跟随窗口；两个终端会话隔离（输出不串）；simple 模式负路径断言无入口。

### W4.3 process:execute 能力（Q3 的执行面）

- **做什么**：
  - 能力位：`process.execute` 独立 capability（v0 单权限位，注册表 + 人话描述；为 P 系列 capabilities 审批中介的最小前置）。dev 默认启用、simple 永久拒绝；后续接审批 UI 时改为逐次审批（本轮不做 UI 审批）。
  - 白名单：可执行文件前缀表（v0：`node`/`npm`/`pnpm`/`git`/`tsx` + 项目脚本），配置文件落 `userData`（可编辑）；cwd 强制在 workspace root 子树内（路径规范化后校验，防 `..` 逃逸）。
  - 通道：`process:execute{cmd,args[],cwd}` → `{exitCode,stdout,stderr,truncated}`；参数数组、禁 shell 拼接（硬约束 4）；超时上限（默认 120s）+ 输出截断上限。
  - **terminal 面板与 process:execute 共用 pty 底座但走不同通道**；execute 不挂交互 tty（一次执行收全量输出）。
- **如何验证**：负路径四件套——非白名单命令被拒、cwd 越界（`..`/绝对路径外）被拒、simple 模式调用被拒、伪造直连 `ipcRenderer`（绕 preload）不可达；正路径：`git status` 在选定根上真实执行。

### W4.4 无孤儿与资源上限

- **做什么**：窗口关闭/宿主崩溃后的进程回收验证（Windows：taskkill /T；崩溃路径用 taskkill 模拟宿主死后检查子进程）；并发 pty 上限（如 8 个，超限显式拒绝）；scrollback 内存上限。
- **如何验证**：自动化脚本：拉起 → 杀宿主 → 枚举子进程树断言无遗留；超限第 9 个 pty 被拒且 UI 有原因。

## 出口标准

1. dev 模式可开多终端真干活（resize/exit/多会话隔离）；simple 完全不可见。
2. `process:execute` 白名单 + cwd 约束 + 负路径四件套全过；测试基线只增（含 W4.0 的 harness 单测）。
3. 无孤儿进程（崩溃/关闭两路径自动化断言）。
4. W1–W3 行为照常（smoke + overlay + 右栏回归）。
