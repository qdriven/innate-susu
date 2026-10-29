# W4 阶段交付证据

日期：2026-10-29 起（随任务推进更新）

## 完成范围

- W4.1 PTY 技术 spike：node-pty 预编译二进制在 Electron 43.7.11 主进程全链路验证（见 `spike.md`）。
- W4.2 terminal 与 process capability 契约：通用 handler registry 首版 + terminal 契约类型与 preload 窄通道（见 `contract.md`）。
- W4.3 主进程 TerminalService：会话生命周期、root 安全注入、shell 受控、env 白名单、环形截断、进程树回收、desktop main 组合（见 `service.md`）。
- W4.4 renderer Terminal Surface：TerminalSessionStore/TerminalPanel（xterm.js + fit、标签切换保留、退出重开、dispose-token 竞态守卫）、desktop TerminalPage + catalog + provider、simple 门控（见 `renderer.md`）。

## 门禁结果

- `pnpm --filter @dogic/core test`：handler-registry 10/10 通过（注册/并列/默认/审批挂钩/热插/键空间隔离）。
- `pnpm --filter @dogic/plugin-terminal test`：**27/27** 通过（契约 15 + 服务 12：真命令输出/中文输出/环形截断/resize/重复 id/root 失效/关闭语义/dispose/profile 注册表/env 白名单/孤儿进程回收）。
- `pnpm --filter @dogic/plugin-terminal typecheck`、`pnpm --filter @dogic/desktop typecheck`、`pnpm --filter @dogic/desktop test`（**79/79**，12 文件；W4.4 新增 26：store 19 + page 7）：通过。
- `pnpm --filter @dogic/desktop build`：通过，node-pty 在 main bundle 中 externalize（`require("node-pty")`）。
- 真实桌面冒烟（`tools/smoke-desktop.ts`）：退出码 0，`[smoke] OK`；W4.4 冒烟证据见 `smoke-w4-4/`（终端 PTY 交互、多标签切换保留、退出重开、伪造 workspaceId 负路径）。

## 安全结论

- renderer 不提交 shell 命令拼接、绝对路径、进程句柄或 Node 对象；契约层白名单校验（未知 shell profile、伪造 providerId/kind、绝对 command 路径）在进入主进程服务前即拒绝。
- 认证 URL/token 不进入日志、快照、测试夹具或证据（spike 只跑只读 echo 命令）。
