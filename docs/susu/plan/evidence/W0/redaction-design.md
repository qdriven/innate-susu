# W0.2 · 启动日志脱敏 · 边界设计说明

> 交付物 of task-local-w0-2（Sprint w0 / plan W0.2）。2026-10-28。

## 问题

`apps/desktop/src/main/harness.ts` 把 DSH stdout 原行（含 `?token=` 的认证 URL）写入内存日志缓冲并落盘 `userData/logs/harness.log`；`services/harness-runtime` 的 log callback 以 `[dsh]`/`[dsh!]` 前缀记录原始输出。违反「认证 URL/token/key 不进日志、快照、夹具」硬约束。

## 边界设计

- **单一纯函数** `redactLaunchSecrets(text)`，落在 `@dogic/core/src/redact.ts`（core 已有测试设施，桌面与服务都可直接消费；避免在两个零测试包里各造一份并新开测试基建）。
- 规则：URL 查询串中参数名为 `token` / `k` / `key`（大小写不敏感）且值非空时，值替换为 `[redacted]`；分隔符 `?`/`&`、参数顺序、其余参数与非 URL 文本一律不动。
- **三个日志出口全部过同一函数**：
  1. 桌面 `HarnessRuntime.log()`——内存缓冲、`log` 事件、落盘 `writeFile(logFile, logBuffer.join())` 共用该入口，单点修复覆盖三路；
  2. 服务 `[dsh]` stdout 行；3. 服务 `[dsh!]` stderr 行。
- **运行态持真实值**：`extractLaunchUrl()`（桌面）与 `authedUrl` 捕获（服务）都在脱敏之前的原始行上取值；就绪探针、状态消息、嵌入认证不受影响。

## 不做什么

- 不引入日志库、不改进程参数、不动 magpie launcher（`ensureMagpieConsole` 只解析不落日志，已核实）。
- 参数名白名单固定三个；扩名需改 core 并补测试（对齐 plan capabilities 扩位的纪律）。

## 验证

- 单测：`packages/core/src/redact.test.ts` 9 用例（dsh token / magpie k / key / 多参数保序 / 双出现 / 无秘密 URL 与错误文本原样 / 空值保留 / 大小写）。
- 六门禁复绿 + smoke 真机（URL 捕获不回归）见 `commands.md` 更新。
