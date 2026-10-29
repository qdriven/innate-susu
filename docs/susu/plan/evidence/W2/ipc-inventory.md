# W2 IPC 清单（desktop main ↔ renderer）

> 日期：2026-10-29（W2 收口）。来源：`apps/desktop/src/main/ipc.ts` + `src/preload/index.ts` 实测枚举。
> 性质：main `ipcMain.handle` 33 通道 + main→renderer 事件 4 通道；renderer 只经 preload `window.innate` 窄接口触达，不开放 Node。
> 变化记录：W2 新增 `innate:wireDsh`、`innate:quota`（T3）、`innate:gateway-status`、`innate:console-status`（T5，事件通道）；`innate:disconnectDsh`/`innate:startMagpie` 实现收口至 `MagpieGateway` 单例（通道名不变，main 侧私有直调删除）。

## 1. invoke 通道（renderer → main，请求/响应）

| 通道 | 语义 | 实现位置（W2 终态） |
| --- | --- | --- |
| `innate:checks` | DSH/magpie 环境检查汇总 | core `readStatus()` |
| `innate:status` | 运行状态汇总（gateway/webUi/dsh/magpieCli） | core + 网关/控制台状态 |
| `innate:getMode` / `innate:setMode` | 模式读取/存储（simple/dev） | core 模式存储 |
| `innate:models` | 网关模型目录（HTTP `/v1/models`） | `MagpieGateway`/`core fetchModels` |
| `innate:wireDsh` | 接线 `magpie dsh <model>`（隔离/真实 DSH_HOME 由调用方注入） | `MagpieGateway.wireDsh`（T3 新增） |
| `innate:disconnectDsh` | 断开 `magpie dsh default` | `MagpieGateway.unwireDsh`（T2 收敛） |
| `innate:quota` | 用量/配额（`usage today`） | `MagpieGateway.quota`（T3 新增） |
| `innate:startMagpie` | 启动/复用网关（ensureRunning） | `getGateway().ensureRunning()`（T2 收敛） |
| `innate:smoke` | 网关冒烟调用（直连一次最小补全） | core `smokeTest` |
| `innate:openMagpieWeb` | 打开 magpie 控制台（Surface provider `magpie-console`，认证 URL 只在 provider 内解析） | `MagpieConsole`（T4 收敛） |
| `innate:revealDshHome` | 在文件管理器揭示 DSH HOME | main 壳 |
| `innate:openLogs` | 打开日志目录 | main 壳 |
| `innate:launchHarness` / `innate:stopHarness` / `innate:harnessState` | Harness 启停与状态（收敛前桌面私有实现） | desktop `main/harness.ts`（**Harness 差异移交 R1 收敛**，见 behavior-matrix.md §2） |
| `innate:surfaceShow` / `surfaceHide` / `surfaceBounds` / `surfaceClose` | Surface 生命周期（provider 中立窄接口，W1c.2） | `main/surface-host.ts` |
| `innate:winClose` / `winMin` / `winToggleMax` / `winIsMaximized` | 窗口控制 | main 壳 |
| `innate:workspaceList` / `workspaceRead` / `workspaceGitStatus` / `workspaceGitDiff` / `workspaceGetRoot` / `workspacePickRoot` | 工作区只读（W3 主改，通道沿用） | workspace 服务 |

## 2. 事件通道（main → renderer，推送）

| 通道 | 载荷 | 来源 | 引入 |
| --- | --- | --- | --- |
| `innate:win-maximized` | boolean | 窗口最大化状态变化 | W1 |
| `innate:harness-state` | HarnessState（脱敏，无认证 URL） | HarnessRuntime state 事件 | W1（R1 收敛后语义不变） |
| `innate:gateway-status` | GatewayStatusEvent `{state, url?, message?, recoverable?}`（message 过脱敏边界；url 仅 running 下发、不进 pill 文案） | `MagpieGateway.onStatusChange` → main ipc.ts | **T5** |
| `innate:console-status` | ConsoleStatusEvent `{phase, message}`（message 过脱敏边界） | `MagpieConsole` 状态事件 | **T5** |

## 3. 约束

- 认证 URL、token、key 不进通道载荷/日志/证据（main 侧 `publicGatewayStatus`/`publicHarnessState` 已脱敏，renderer 侧 pill 映射再过一次 `redactLaunchSecrets`，双保险）。
- `innate:wireDsh`/`innate:disconnectDsh` 参数经 `MagpieCli` 白名单校验（win32 shell 拼接防注入）。
- 通道新增即在此表登记；删除/改名需回写本表并记录任务号。
