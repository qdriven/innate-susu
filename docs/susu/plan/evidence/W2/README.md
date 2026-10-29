# W2 证据归档（网关侧收口）

> 日期：2026-10-29。Sprint：[docs/sprints/w2/](../../../../sprints/w2/)（T1–T7）。
> 来源卡：[phases/W2-runtime.md](../phases/W2-runtime.md)。

## 交付物索引

| 任务 | 内容 | 证据 |
| --- | --- | --- |
| T1 | 运行链路与行为对照矩阵（网关侧收口，Harness 差异移交 R1） | [behavior-matrix.md](./behavior-matrix.md) |
| T2 | magpie sidecar 统一生命周期（`MagpieGateway` 入 desktop main bundle） | 契约测试 8 例；commit 428b00c |
| T3 | magpie CLI 模型与接线操作收口（`MagpieCli` 白名单 + 解析集中） | 契约/解析测试；commit 23ca6c1 |
| T4 | MagpieConsole 接 W1c 通用生命周期 | 契约测试 10 例；commit 7abb590 |
| T5 | 运行状态接入壳状态区（事件驱动 + 双 pill） | 映射 5 + 组件 8 + TitlebarStrip 2 + App 1 例；基线 63→79；commit afa18c2 |
| T6 | 隔离环境网关真实链路冒烟 | [smoke-magpie/smoke-magpie.json](./smoke-magpie/smoke-magpie.json) 10/10；commit 738ad9b |
| T7 | 全量回归与交接 | 本 README + [ipc-inventory.md](./ipc-inventory.md) |

## 收口门禁（2026-10-29）

- 总门禁：`pnpm -r build` / `pnpm typecheck` / `pnpm -r test` 全绿。
  基线：desktop 79、plugin-model-gateway 39、service-model-gateway 8、core 34、sdk 9、kernel 28、theme 10、workspace 5、syntax-highlighting 3、project-canvas 4。
- overlay：`pnpm verify:overlay` 7/7 条目 disabled=true。
- 桌面冒烟：dev + 便携（packaged）真机全过，截图入 `smoke/` 与 `smoke-packaged/`。
- 网关隔离冒烟：`pnpm smoke:magpie` 10/10（真实链路 + 降级链路 + 清理断言）。

## 已知限制与移交事项

- magpie `serve` 固定绑 `127.0.0.1:3425`（无端口参数、`MAGPIE_PORT` 不生效）——冒烟脚本按"复用或自启"设计，自启时仅回收自启进程树。
- 网关 chat completions 对模型有 plan 特性要求，且上游 volcengine key 当前失效（401）——冒烟脚本对候选模型有界重试兜底（本次成功于 `xiaomi/mimo-v2.6-flash`），属上游凭证问题，非网关侧缺陷。
- Harness 九项差异（DSH_HOME 隔离、profile 语义、端口策略、停止语义等）只记录并定收敛方案，实施在 R1（behavior-matrix.md §2/§5，R1-harness.md 已接移交输入）。
- DSH boot→wire→chat 完整集成链归 R1；W2.6 只验证 gateway 前提链。
- 约束遵守：证据与日志无 key/token/认证 URL（冒烟证据秘密扫描 0 命中）；测试基线只增不减。
