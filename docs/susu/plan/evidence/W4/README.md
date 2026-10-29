# W4 阶段交付证据

日期：2026-10-29 起（随任务推进更新）

## 完成范围

- W4.1 PTY 技术 spike：node-pty 预编译二进制在 Electron 43.7.11 主进程全链路验证（见 `spike.md`）。
- W4.2 terminal 与 process capability 契约：通用 handler registry 首版 + terminal 契约类型与 preload 窄通道（见 `contract.md`）。

## 门禁结果

- `pnpm --filter @dogic/core test`：handler-registry 10/10 通过（注册/并列/默认/审批挂钩/热插/键空间隔离）。
- `pnpm --filter @dogic/plugin-terminal test`：契约单测 15/15 通过（非法 id/尺寸/未知 shell/伪造 capability/绝对路径逃逸/重复输入上限等负路径）。
- `pnpm --filter @dogic/plugin-terminal typecheck`：通过。

## 安全结论

- renderer 不提交 shell 命令拼接、绝对路径、进程句柄或 Node 对象；契约层白名单校验（未知 shell profile、伪造 providerId/kind、绝对 command 路径）在进入主进程服务前即拒绝。
- 认证 URL/token 不进入日志、快照、测试夹具或证据（spike 只跑只读 echo 命令）。
