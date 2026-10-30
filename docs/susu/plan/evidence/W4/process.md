# W4.6 受控 process:execute 交付证据

日期：2026-10-29

## 任务目标

Q3 的 process 执行面缺失：需要 task executor/独立 adapter 提供受控 process 执行——白名单表（userData 可编辑）、cwd 强制工作区 root 子树（防 `..` 逃逸）、超时、取消、非零退出、输出截断、审计脱敏；参数数组禁 shell 拼接。负路径四件套（未注册 profile / cwd 越界 / simple / 绕 preload 垃圾输入）全拒。

## 交付范围

- `innate-dogic/plugins/terminal/src/shared/index.ts`：W4.6 契约类型（`ProcessExecuteAck`、`ProcessResult.signal` 由 `number|null` 收紧为 `string|null`、`ProcessAuditEvent`、`TerminalApi` 新增 5 个 process 窄通道方法）。
- `innate-dogic/plugins/terminal/src/main/index.ts`：受控 process executor（`registerProcessProfile` / `processProfileIds` / `execute` / `processResult` / `cancel`），`MAX_PROCESS_EXECUTIONS = 8`。
- `innate-dogic/plugins/terminal/src/renderer/session-store.ts`：`TerminalEvent` 联合扩展后的会话分发守卫（审计事件无 `terminalId`，直接忽略）。
- `innate-dogic/apps/desktop/src/main/ipc.ts`：process 通道接线 + simple 模式门控 + userData 白名单启动加载。
- `innate-dogic/apps/desktop/src/preload/index.ts`：5 个 process 窄通道暴露（`innate:processProfileRegister` / `innate:processProfiles` / `innate:processExecute` / `innate:processResult` / `innate:processCancel`）。

## 契约要点

- `ProcessProfile`：`{ id, command, args, cwdRelative?, timeoutMs?, env? }`。`parseProcessProfile` 拒绝 command 含 `[<>|&;`$]`、`..`、绝对路径。
- `ProcessRequest`：`{ profileId, args?, cwdRelative?, timeoutMs?, env? }`。`parseProcessRequest` 校验 profileId 白名单、args 必须字符串数组、cwdRelative 非绝对且不含 `\0`、timeoutMs ∈ [1, 600000]。
- `ProcessExecuteAck`：受理即返回 `{ executionId, ok, detail? }`——执行 id 必须在进程结束前可得，供运行中取消。
- `ProcessResult`：完整结果（exitCode/signal/durationMs/stdout/stderr/truncated/timedOut/cancelled/detail），经 `processResult` 通道取回。
- `ProcessAuditEvent`：终态经 `terminal-event` 流式推送；**脱敏——不含 stdout/stderr 与 env**。
- `MAX_PROCESS_OUTPUT_CHARS = 256KB`（RingBuffer 环形截断，保留尾部）、`DEFAULT_PROCESS_TIMEOUT_MS = 60s`。

## 执行器语义

- `node:child_process.spawn` 直接 spawn（参数数组，`shell: false`，无 shell 拼接）；与 node-pty `spawn`（PTY 会话）以 `spawn as spawnProcess` 别名区分。
- cwd 强制 root 子树：`isPathInside(root, cwd)` 判定（`path.relative` 为空或不以 `..` 开头且非绝对）；请求级 `cwdRelative` 相对 profile.cwdRelative 解析后校验；不存在/非目录同样拒绝。
- 超时：`setTimeout(...).unref()`，超时后 `taskkill /T /F` 进程树回收，标记 `timedOut`。
- 取消：`processCancel` 幂等（finished/unknown → false），`taskkill /T /F` + `kill` 双回收。
- `finish()` 幂等（`finished` 守卫）；executions 在 finish 时删除，results 保留供 `processResult` 取回。
- `dispose()` 统一回收：先 cancel 全部在跑 executions（等待 `Promise.all` 完成后）再清空 executions 与 results，保证已捕获的 `processResult` Promise 以 cancelled 结果 resolve。
- env 白名单：base 白名单 + profile.env + request.env 覆盖；测试验证请求 env 注入（SECRET_TOKEN）且审计事件不泄漏。

## IPC 设计

`ipcRenderer.invoke` 无法跨边界传递 Promise/句柄：**ack/result 分离**——`processExecute` 立即返回 `ProcessExecuteAck`（含 executionId），完整结果经 `processResult(executionId)` 取回，运行中可 `processCancel(executionId)`。

## simple 模式门控

门控在 desktop ipc 层（mode 是 desktop 关注点，非 service）：`readMode(app.getPath('userData')) === 'simple'` 时五个 process 通道全拒（processExecute/processProfileRegister 返回 `{ok:false, detail}`，processProfiles 返回 `[]`，processResult 返回完整失败 ProcessResult，processCancel 返回 false），不触达服务端。

## 白名单加载

启动时读取 `userData/process-profiles.json`（可编辑 JSON 数组），逐项 `registerProcessProfile` 注册进服务端；文件缺失/格式非法静默跳过（白名单为空时执行一律拒绝）。显式注册（`innate:processProfileRegister`）为受控开发入口，simple 模式同样拒绝。

## 渲染端会话存储守卫

`TerminalEvent` 联合扩展 `ProcessAuditEvent` 后，session-store 分发处以 `if (!('terminalId' in event)) return` 忽略审计事件——审计事件不属于任何会话。

## 验证结果

- `pnpm --filter @dogic/plugin-terminal test`：**41/41** 通过（W4.6 新增 10 项契约测试：正路径真命令、未注册 profile、绕 preload 垃圾输入全拒、cwd 逃逸（请求级 + profile 级 + 幽灵目录）、超时、取消（含重复/未知）、非零退出、输出截断 + env 脱敏、profile 注册负路径、无 root 拒绝、dispose 统一回收）。
- `pnpm --filter @dogic/plugin-terminal typecheck` / `build`：通过（dist 重建后 desktop 类型检查可见新契约）。
- `pnpm --filter @dogic/desktop typecheck`：通过。
- `pnpm --filter @dogic/desktop test`：**82/82** 通过（13 文件；W4.6 新增 `src/main/ipc.test.ts` 3 项门控测试：dev 转发服务端、simple 全拒且不触达服务端、userData 白名单启动加载）。
- `pnpm --filter @dogic/desktop build`：通过。
- 真实桌面冒烟（`tools/smoke-desktop.ts`）：见 `smoke-w4-6/`（profile 注册与白名单、process:execute 正路径受理→结果→stdout、负路径四件套全拒、simple 模式门控全拒）。

## 安全结论

- renderer 无通用 shell/string execute 通道：只有白名单 profile + 结构化请求，参数数组、无 shell 拼接。
- 认证 URL/token/key 不进入日志、快照、测试夹具或证据截图（审计事件脱敏；冒烟只用本地 echo 命令）。
- simple 模式不可见 process 通道；cwd 强制 root 子树防 `..` 逃逸；超时/取消经 `taskkill /T /F` 进程树回收，无孤儿进程。
