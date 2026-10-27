# Sprint 5 — mini-gateway 决策门（独立可选）

> 来源：[plans/innate-dogic-dsh/appendix-mini-gateway.md](../plans/innate-dogic-dsh/appendix-mini-gateway.md)。
> 定位：不属于双向宿主主线，不占 M3–M7 编号，不因插件化自动触发。**未过决策门不创建任何占位包。**
> 目标：回答"去掉 magpie Go 二进制、用自研 TS mini-gateway 是否值得"。

---

## TG.1 决策门

- **做什么**：产出 `docs/plans/innate-dogic-dsh/decision-mini-gateway.md`，用实测数据回答四问：
  1. 实际接入的 Provider 原生协议有几种？（magpie 配置与模型清单 → **不超过 2 种才可考虑**）
  2. 是否依赖订阅池、用量归账或路由组？（产品需求与设置操作记录 → **任一强依赖则保留 magpie**）
  3. 去掉 Go 二进制的收益是否大于维护成本？（打包体积、内存、维护成本实测 → **无明确收益则不做**）
  4. sealed reasoning 能否完整保留？（真实模型会话 → **不能保证则不做跨协议翻译**）
- **功能**：把"要不要自研网关"从氛围争论变成数据决策；避免为维护方便 fork/重写 magpie 损失协议能力（风险登记 R2）。
- **如何验证**：决策文档四问各有数据来源与结论；做或不做都有结论落档；结论同步到总纲风险表与方案网站。
- **预估 / 依赖**：0.5 天 / 任意时间（建议 S2 之后：此时 M4 实测会给出真实协议与用量数据）。

## TG.2 条件实施（仅当 TG.1 通过）

- **做什么**：新模块 `innate-dogic/services/mini-gateway`（strict TS、纯 ESM、Node HTTP）；与 magpie 路径并存可切换（不一刀切）；HTTP 只监听 `127.0.0.1` 随机端口；只实现确认的原生协议端点（`/v1/models`、`/v1/messages`，确需翻译时单独评审并记录 reasoning 损失）；DSH 接线格式按当前 DSH 版本实测，写前备份、断开原子恢复；`MiniGateway` 与 `MagpieGateway` 对齐 ModelGateway 同形契约（设置页不感知切换）。
- **功能**：若四问全过，提供更轻的分发形态（去掉 47MB Go 二进制）。
- **如何验证**：同一台机器 magpie 与 mini-gateway 分别完成"接入 → 对话 → 断开恢复"；协议转发、真实 DSH 会话、接线/断开恢复、凭据隔离测试全过；决策文档记录默认实现与回滚方式。
- **预估 / 依赖**：按决策 / TG.1。

## 明确不做

- 全量重写 magpie 的路由组、订阅池、用量归账与多协议互译。
- 为维护方便 fork magpie 后随意裁剪。
- 让 mini-gateway 阻塞双向宿主、工作区或模型设置主线。
