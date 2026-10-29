# W2 运行链路与行为对照矩阵

> 日期：2026-10-29。来源：[W2-runtime.md](../phases/W2-runtime.md) W2.1。
> 范围：网关侧收口（magpie 生命周期、CLI/模型/接线、控制台、壳状态、隔离链路）。
> 性质：本矩阵是 R1 的直接输入；Harness 差异只记录并定收敛方案，实施在 R1。

## 1. 职责重叠总表（网关侧）

| # | 能力 | desktop `main/launcher.ts` | desktop `main/ipc.ts` + `packages/core` | `plugins/model-gateway` | `services/model-gateway` | 决定 |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | magpie 进程拉起（serve 形态） | `startMagpie()`：spawn detached、fire-and-forget、无健康检查无退避 | — | `MagpieProcess.start()`：spawn `serve` + healthcheck 轮询 + 指数退避重启 | `MagpieGateway.ensureRunning()`：healthy 复用 / spawn `serve` + 健康轮询 + `RESTART_DELAYS_MS` 退避重启 | **收敛（T2 完成）**：desktop 私有 fire-and-forget spawn 已删除，`startMagpie()` 改经 `getGateway()` 单例调 `ensureRunning()`；服务层补齐 `GatewayStatus` 状态机（not-running/not-installed/starting/running/error recoverable）、`onStatusChange` 事件、`form` 注入、可注入时序（测试：T2 契约测试 8 例 reuse/not-installed/timeout/backoff/stop/form/wire/quota） |
| A2 | magpie 桌面形态（desktop 版） | `startMagpie()`：`INNATE_MAGPIE_FORM=desktop` 时不带参 spawn | — | — | — | **保留并参数化**：`MagpieGateway` 增加 `form` 注入（`desktop`/`serve`），复用同一 ensureRunning/健康检查；桌面形态的 healthcheck 语义与 serve 相同（测试：T2 form 参数契约） |
| A3 | 健康检查 | — | `core discoverGatewayPort/probeHello`（HTTP `/api/hello`，运行期发现） | `MagpieCli.healthcheck()`（CLI，启动探测） | `MagpieGateway.healthy()`（CLI `healthcheck`，启动探测） | **保留双实现并明确分工**：CLI `healthcheck` 只用于启动/复用判定（T2）；HTTP `/api/hello` 只用于运行期状态与 UI 目录（T5 事件 + 低频 reconcile）。两者不互相替代（测试：T2/T5 各自断言） |
| A4 | 网关模型目录 | — | `core fetchModels(port)`（HTTP `/v1/models`）→ `innate:models` | `MagpieModelGateway.listProviders()`（CLI `providers`） | — | **保留双路径、UI 走类型化 facade**：桌面 UI 的模型目录经 `innate:models`（HTTP）不变，但通道语义收口到 facade；CLI providers 供插件侧（测试：T3 契约测试 + 解析测试） |
| A5 | 接线操作 | `disconnectDsh()`：`magpie dsh default` 直调 | — | `MagpieModelGateway.wireAgent/unwireAgent`（CLI 参数数组） | `MagpieGateway.wireDsh/unwireDsh`（CLI `dsh <model>`/`dsh default`） | **收敛（T2/T3 完成）**：desktop `innate:disconnectDsh` 改经 `getGateway().unwireDsh()`，launcher 私有直调删除；新增 `innate:wireDsh`/`innate:quota` 类型化通道；`MagpieCli` 对 agent/model 参数做白名单校验（win32 shell 拼接防注入）；断开显式返回恢复结果/失败原因/下一步 hint（测试：T2 契约 + T3 负路径 + 隔离 DSH_HOME） |
| A6 | 配额/用量 | — | — | `MagpieModelGateway.quota()`（CLI `quota`） | `MagpieGateway.quota()`（CLI `usage today`） | **收敛到 facade（T3 完成）**：解析集中 `MagpieCli`（导出 `parseProviders/parseAgents/parseQuota`），`MagpieModelGateway` 惰性 cli 构造 + 可注入；退出码映射修正（status/数值 code 即真实退出码）；桌面新增 `innate:quota` 通道走 `MagpieGateway.quota()`（测试：T3 CLI 解析/超时/非零退出） |
| A7 | 控制台（magpie web） | `MagpieConsole` 类：独立回环端口 + 受管 key（仅 userData `console-key.json`，损坏/过短重生成）+ stdout `magpie web on <url?k=>` 只在 main 解析 + 超时 | `innate:openMagpieWeb`（Surface provider `magpie-console`） | — | — | **收敛（T4 完成）**：接 W1c 通用生命周期（phase 状态机 idle/starting/running/failed/stopped + state/log 事件 + 日志缓冲过脱敏边界）；重复 show 复用同一 URL 不重复 spawn、SurfaceHost 不 reload；缺 key/进程退出/超时显式报错且可重试；stop 只回收自己启动的进程树（win32 `taskkill /T /F`，不终止他人实例）；启动失败只影响控制台（测试：T4 契约 10 例 + key 存储 + 脱敏断言 + gateway 隔离） |
| A8 | 运行状态 | — | `readStatus()`（gateway/webUi/dsh/magpieCli 汇总）+ App.tsx 5s 轮询 | `GatewayStatus`（ModelGateway 契约，`onStatusChange`） | — | **收敛**：网关状态改事件驱动（`innate:gateway-status`），5s 轮询降为低频 reconcile；直连降级状态显式区分（测试：T5 四态 UI 转换 + 断连提示） |

## 2. Harness 差异对照（desktop `main/harness.ts` vs `services/harness-runtime`）

> 只记录 + 定收敛方案；实施归 R1（见 [R1-harness.md](../phases/R1-harness.md)）。

| 维度 | desktop `main/harness.ts`（HarnessRuntime） | `services/harness-runtime`（HarnessRuntime + bootBackend） | 差异 | 收敛方案（R1 执行） |
| --- | --- | --- | --- | --- |
| DSH_HOME | 不隔离：继承用户真实 `~/.dsh`（magpie 写入的 cordis.patch.yml + .env 直接生效） | 注入隔离 `dshHome`（`BootBackendOptions.dshHome`） | 隔离 vs 真实 | R1 统一配置注入；过渡期 desktop 保持真实 ~/.dsh 行为不变 |
| 首次 profile | `web` 子命令 + optional `--patch` overlay（simple 模式裁剪补丁） | `--profile web` + `--patch`；`profileInitialized()` 检查 + 首次 start→stop 初始化 | profile 语义不同 | R1 统一为 `--profile web` 形态；simple overlay 保留为 desktop 特有补丁 |
| Node 解析 | `resolveNodeRuntime()`：系统 node 优先（排除 .cmd/.bat shim），Electron 内置兜底（`ELECTRON_RUN_AS_NODE`） | `nodePath` 外部注入 | 解析责任位置不同 | R1 抽出共享 node 解析工具 |
| 端口 | `freePort()` 每次随机 | `pickPort()` 默认 43129 + 占用回退 | 端口策略不同 | R1 统一端口选择策略 |
| 就绪判定 | 解析 `dsh web: <url>` + fetch 状态 <500 + 60s 超时（`INNATE_HARNESS_READY_TIMEOUT_MS`） | 捕获 `dsh web:` URL + `waitUntilReady` 120s 轮询 | 超时与判定细节不同 | R1 统一就绪判定 |
| 状态 | `HarnessState {phase}` + EventEmitter（idle/starting/running/failed/stopped） | `authedUrl` + log 回调，无 phase 状态机 | 状态模型不同 | R1 复用 desktop phase 状态机 |
| 日志 | `logBuffer` + 落盘 `userData/logs/harness.log` + `redactLaunchSecrets` | log 回调 + `redactLaunchSecrets` | 落盘位置不同 | R1 统一日志边界 |
| 停止 | Windows `taskkill /pid /T /F`；其他 SIGTERM | `child.kill()` + 1s 等待 | 强杀策略不同 | R1 统一停止语义（先优雅后强杀） |
| 组合 | 独立于 gateway（desktop 自己拉 dsh） | `bootBackend`：gateway → 首次初始化 → wire → harness → authedUrl | 编排位置不同 | R1 落地 boot→wire→chat 真实集成链（W2.6 只验证 gateway 侧前置） |

## 3. 网关侧目标链（本段固定）

```text
gateway ensureRunning ──► 模型目录 ──► 接线操作 ──► 状态事件
（MagpieGateway）        （HTTP /v1/models + CLI providers）
                         （wireAgent/unwireAgent/dsh wire，类型化 facade）
                         （GatewayStatus onStatusChange → innate:gateway-status）
```

- DSH 段（boot → wire → chat 完整链路）不在网关侧目标链内，归 R1；W2.6 只验证 gateway 起动 → 模型 → 直连调用这条 Q1 网关前提链。

## 4. console 与 gateway 是两个进程/认证域

| 域 | 进程 | 认证 | 说明 |
| --- | --- | --- | --- |
| gateway | `magpie serve`（3425 默认） | 冒烟/直连 key `APP_KEY=magpie-dsh-innateos`（core 常量） | 模型流量与冒烟调用 |
| console | `magpie web --addr 127.0.0.1:<freePort>` | 每安装稳定 key（`userData/console-key.json`，`MAGPIE_WEB_KEY` 注入） | 管理界面；`?k=` 只在 main 解析 |

- 两域不共享猜测的 key；console 端口独立回环，不占用 gateway 3425/web 3430 默认端口。
- 约束：认证 URL、token、key 不进日志、快照、测试夹具或证据（沿用全局门禁）。

## 5. 差异决定汇总（供 R1 直接使用）

| 差异项 | 决定 | 测试挂钩 |
| --- | --- | --- |
| serve 生命周期双实现 | 收敛至 services `MagpieGateway`，desktop 私有 spawn 删除（T2 完成：`class MagpieGateway` 已打包进 desktop main bundle，launcher 经 `getGateway()` 收口） | T2 契约测试（8 例全过，基线只增不减） |
| 健康检查双实现 | 保留：CLI 启动探测（T2）/ HTTP 运行期发现（T5） | T2 + T5 断言 |
| 接线直调双实现 | 收敛至类型化 facade（T3 完成：`MagpieCli` 白名单守卫 + `MagpieGateway` 单一通道 + 解析集中） | T3 负路径 + 隔离 HOME |
| 配额双实现 | 收敛至 `MagpieCli` 解析集中（T3 完成：`parseProviders/Agents/Quota` 导出 + 退出码修正） | T3 解析/超时测试 |
| Harness 九项差异 | 记录 + R1 收敛方案（本矩阵 §2） | R1 开工时逐项对照 |
| 状态轮询 | 收敛为事件驱动 + 低频 reconcile | T5 UI 状态转换测试 |
| console 生命周期 | 保留 + W1c 通用生命周期适配（T4 完成：`MagpieConsole` 状态机 + 仅停自己进程树 + key 仅 userData + 脱敏日志） | T4 契约测试（10 例全过，基线 53→63） |

## 6. 已知限制

- 本矩阵基于 2026-10-29 仓库代码快照；后续改动若改变 §1/§2 任一单元格需回写本矩阵。
