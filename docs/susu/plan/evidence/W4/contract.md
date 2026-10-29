# W4.2 terminal 与 process capability 契约

日期：2026-10-29

## 交付物

### 1. 通用 handler registry 首版（04 §4bis）

`innate-dogic/packages/core/src/handler-registry.ts`（不预置任何具体 handler，注册表按通用机制设计，非 terminal 专属）：

- 四个键空间共用同一机制：`content`（open-with）/ `capability`（process:execute → terminal 首案例）/ `purpose`（P4 预留）/ `surface`（呈现端 provider）。
- 注册：descriptor.id 全局唯一，重复注册显式失败；descriptor 校验（key/namespace/id/title/capabilities）。
- 并列与默认：同一 (key, namespace) 允许多 handler 并存，默认取第一个注册者；`unregister` 后默认回落到下一个。
- 审批挂钩：`approve` 缺省为拒绝；execute 前必须经 approve，拒绝或审批器故障 → 显式失败且 execute 不执行。
- 热插：`unregister` 摘除并调用 `dispose`（清理失败不拖垮其它 handler）；`subscribe`/`getRevision` 供插件装卸观察。

### 2. terminal 契约（`plugins/terminal/src/shared/index.ts`）

- `TerminalDescriptor`：terminalId/providerId/kind/title/workspaceId/cols/rows/profile 白名单字段；解析器只复制安全字段。
- 负路径显式拒绝：非法 id（非 `[A-Za-z0-9_-]{1,64}`）、伪造 capability（providerId/kind 不匹配）、非法尺寸（cols/rows 越界或非整数）、未知 shell profile、非对象输入、超长 title。
- 输入通道 `parseTerminalInput`：字符串上限 64KB；尺寸通道 `parseTerminalSize` 复用白名单。
- process:execute 契约（W4.6 前置）：`ProcessProfile`/`ProcessRequest` 白名单校验——args 必须是字符串数组（禁止拼接）、command 禁止 shell 元字符/绝对路径/`..` 逃逸、cwdRelative 必须是工作区相对路径（绝对路径拒绝）、timeoutMs 上限 600s。
- preload 窄通道 `TerminalApi`：terminalCreate/terminalInput/terminalResize/terminalClose/terminalOnEvent——renderer 只提交安全字段，事件（output/exit/error）由主进程主动推送。

## 验证

- `pnpm --filter @dogic/core test`：handler-registry **10/10** 通过（并列+默认、重复注册失败、非法 descriptor、无 approve 直接执行、approve 拒绝不执行、approve 通过执行、approve 抛错显式失败、热插+dispose+默认回落、dispose 失败不拖垮、键空间隔离）。
- `pnpm --filter @dogic/plugin-terminal test`：契约单测 **15/15** 通过。
- `pnpm --filter @dogic/plugin-terminal typecheck`：通过。

## 安全说明

- 实现过程中发现并修复一处硬编码缺口：`parseProcessProfile` 原先只拒绝 shell 元字符与 `..`，未拒绝绝对路径 command（`C:/Windows/.../cmd.exe` 可绕过根子树包含）。现已拒绝一切绝对路径/UNC 形式，并有回归测试。
- 测试基线只增不减；认证信息不进日志/快照/夹具。
