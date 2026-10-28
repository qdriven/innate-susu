# W2 · magpie 收口进壳状态

> 预估 1–2 天 · 依赖：W1（可与 W3 并行）
> 目标：magpie 的启动/探活/控制台/接线状态从「藏在 ConsolePage」变为壳的全局状态 pill；干净环境从零到对话的链路可复验。**不复制 orca per-agent 账号体系，不做双向设置（M5 后置）。**

## 任务卡

### W2.1 网关健康状态 pill

- **做什么**：
  - main 侧新增轻量网关健康轮询（复用 `@dogic/core/gateway.ts` 的 `discoverGatewayPort` + `fetchModels`；间隔 10s 级，失败退避；不新增端口、只读探测）。状态机：`未配置 → 探测中 → 健康(模型数) → 不可达`。
  - IPC：`gateway:status`（拉取）+ `gateway:statusChanged`（事件推送）；进 preload 类型化契约。
  - `TitlebarStrip` 右侧状态位渲染 pill（绿=健康+模型数、黄=探测中、红=不可达）；点击 pill → 打开/聚焦 magpie-console Surface（复用 W1.3 标签槽）或弹 hint（不可达时给显式原因文案，如「magpie 未启动/端口未发现」，不静默）。
  - `ConsolePage`/`ModelsTab` 保留，改读同一状态源（不再各自 fetch）。
- **如何验证**：mock 网关（现有 `@dogic/sdk` MockModelGateway 思路）单测状态机四态迁移；真实环境截图三态；断网（改端口）后 pill 变红且有 hint。

### W2.2 launcher 状态外露

- **做什么**：
  - `main/launcher.ts` 对外暴露生命周期事件（`magpie:starting/started/failed/exited`），经 ipc 推给壳；**不改** `resolveMagpieBin` 四级探测、`consoleKey`、`ensureMagpieConsole` 内核逻辑。
  - `disconnectDsh`（`magpie dsh default` 原子恢复）入口在壳上可达（现有 `revealDshHome/disconnectDsh` 通道保留，加状态回显）。
- **如何验证**：启动/退出 magpie 时 pill 与事件序列断言；disconnectDsh 后 dsh patch 检测（`@dogic/core/dsh.ts` 路由检测）回读确认恢复。

### W2.3 干净环境接线冒烟（脚本化）

- **做什么**：
  - `tools/` 新增 `smoke-magpie-wire.ts`：隔离临时 `DSH_HOME` → dsh 裸 boot 生成 profiles → magpie wire 接线 → `dsh web` 探活 → 输出接线摘要。**只用只读/隔离命令**，不碰真实 `~/.dsh`（硬约束 7）；wire/unwire 命令在脚本里对临时 HOME 执行。
  - 接入 `pnpm smoke:magpie`（不进默认 `pnpm test` 门禁，人工/发布前跑）。
- **如何验证**：全新临时 HOME 一次通过（接线后 patch 路由检测为 magpie）；脚本重复跑幂等；真人对对话一轮属 UAT（记录在证据说明，不自动化真模型调用）。

## 出口标准

1. 壳顶 pill 反映 magpie 四态；不可达有显式 hint；控制台一键可达。
2. `harness.ts`/`launcher.ts` 内核 diff 仅限事件外露；网关插件（`plugin-model-gateway`）零改动。
3. `smoke:magpie` 脚本入 tools，隔离 HOME 跑通；测试基线只增（状态机单测）。
4. 行为不回退：W1 的 smoke + overlay 照跑全绿。
