# W4.4 renderer Terminal Surface

日期：2026-10-29

## 交付物

### 插件 renderer（`plugins/terminal/src/renderer/`）

- **TerminalSessionStore**（`session-store.ts`）：模块级会话存储，按 surfaceId 管理 PTY 生命周期。
  - create：提交安全 descriptor（`terminal-<N>-s<M>` id、default profile 引用、默认 80×24、scrollback 上限）；并发 create 共享同一 Promise（StrictMode 双挂载去重）；已有未 dispose 会话直接复用。
  - attach/detach：首次 attach 执行 xterm.open；detach 只摘 DOM、会话与 scrollback 保留；重挂复用既有 xterm 元素。
  - dispose：terminalClose + xterm.dispose + 移除存储（close 语义）；**dispose-token 竞态守卫**：dispose 递增 token，in-flight create 完成后比对，发现标签已被关闭/重开立即回收新建 PTY，不留孤儿会话。
  - 事件桥：output/error/exit 事件写 xterm 缓冲（面板卸载后输出仍写入）；exit 更新会话终态并通知监听器；已 dispose 会话的迟到事件忽略；会话终态后忽略后续事件。
  - 主题：`applyTheme` 跟随 documentElement `.dark` 状态写回 xterm 主题。
- **TerminalPanel**（`TerminalPanel.tsx`）：React 面板。
  - xterm.js 5.5.0 + @xterm/addon-fit；ResizeObserver + fit 驱动 terminalResize。
  - 键盘输入经 xterm onData → terminalInput；复制（getSelection → clipboard）；清屏（xterm.clear + 向 PTY 发送 Ctrl-L 等价换页符 `\x0c`）。
  - exit 显示「会话已退出（code N）」提示与「重开」动作（不自动重启）；重开 = dispose 旧会话 + create 新会话（派生新 id，如 `terminal-1-s2`）；exit 监听器跨 dispose 存活（dispose 不摘监听器，由面板卸载 effect 摘除）。
  - 创建失败显示浮层与服务端 detail，提供「关闭标签」。

### Desktop renderer（`apps/desktop/src/renderer/src/`）

- **TerminalPage**（`TerminalPage.tsx`）：dev 终端页。无 root 时要求先选择目录（新建终端禁用）；「新建终端」按打开顺序派生 terminal-N 标签；标签切换只通知壳层（onSwitchSurface），会话由 provider 持有；面板关闭交回壳层（onCloseSurface）。
- **catalog**（`surfaces/catalog.ts`）：`terminalSurface` 生成安全 descriptor（terminal kind + `process:execute` capability）；terminal 只映射 dev 终端页（simple 不可见）。
- **provider**（`surfaces/providers/terminal.tsx`）：panel-kind provider，持有 TerminalSessionStore 模块级实例；close 才终止会话，deactivate 不杀会话。
- **pages 注册**：terminal 进入 dev 页面集（W1b 页面注册表，simple 不含）。
- **api.ts / preload**：window.innate 扩展 TerminalApi；renderer 无通用 shell/string execute 通道。

## 验证

- `pnpm --filter @dogic/plugin-terminal test`：**27/27** 通过（无回退）。
- `pnpm --filter @dogic/plugin-terminal typecheck`：通过。
- `pnpm --filter @dogic/desktop test`：**79/79**（12 文件；新增 26 条 W4.4 用例：store 19 + page 7）——交互/中文/标签切换/退出提示/simple 负路径。
- `pnpm --filter @dogic/desktop typecheck`（node+web）：通过。
- `pnpm --filter @dogic/desktop build`：通过（renderer 加 react/react-dom dedupe，插件 renderer TS 直链打包）。
- 真实桌面冒烟（`tools/smoke-desktop.ts docs/susu/plan/evidence/W4/smoke-w4-4`）：退出码 0，`[smoke] OK`——终端 PTY 交互、多标签切换保留、退出重开、伪造 workspaceId 负路径全部通过（证据截图见 `smoke-w4-4/`）。

## 冒烟覆盖（smoke-w4-4）

- dev 导航含终端；simple 导航不含终端（显式断言，门控失效即失败）。
- 终端页加载工作区根；新建终端派生 terminal-1 标签并渲染 xterm 面板。
- 等待 cmd 提示符就绪后 CDP 逐键敲入 `echo smoke-terminal-ok` + Enter → PTY 输出捕获（terminal-output.png）。
- 第二个终端 + 切回第一个：scrollback 保留（detach 语义，terminal-page.png）。
- `exit` → 会话退出提示（terminal-exited.png）→ 点「重开」→ 等待新 PTY 提示符就绪 → 敲入 `echo smoke-reopen-ok` → 输出捕获。
- 伪造 workspaceId 的 terminalCreate 被服务端拒绝（安全负路径）。

## 已知非致命告警

- node-pty 在 Windows 的 conpty 进程跟踪 agent（`conpty_console_list_agent.js`）偶发 `AttachConsole failed` 崩溃输出到应用 stderr——不影响 PTY 读写（冒烟全程交互正常）；进程树回收走 `taskkill /T /F` 独立通道。属 node-pty 在虚拟化/沙箱环境的已知抖动，不阻塞门禁。

## 安全结论

- renderer 不携带 Node/PTY 对象；无通用 shell/string execute 通道；shell 由服务端 profile 注册表解析。
- 认证 URL/token 不进入日志、快照、测试夹具或证据；冒烟只跑只读 echo 命令。
