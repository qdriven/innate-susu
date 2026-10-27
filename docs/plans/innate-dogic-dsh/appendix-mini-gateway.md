# 附录（独立可选）— mini-gateway 决策与实施

> 执行层：决策与实施任务已迁移至 [docs/sprints/S5-mini-gateway-decision.md](../../sprints/S5-mini-gateway-decision.md)；本文保留决策门与约束原文。

本项不属于双向宿主主线，不占用 M3–M7，也不因 DSH 插件化而自动触发。只有实际收益大于维护成本时才执行。

## 1. 决策门

产出 `decision-mini-gateway.md`，回答：

| 问题 | 数据来源 | 结论规则 |
| --- | --- | --- |
| 实际接入的 Provider 原生协议有几种？ | magpie 配置与模型清单 | 不超过 2 种才可考虑；更多则不做 |
| 是否依赖订阅池、用量归账或路由组？ | 产品需求与设置操作记录 | 任一强依赖则保留 magpie |
| 去掉 Go 二进制的收益是否大于维护成本？ | 打包体积、内存与团队维护成本实测 | 没有明确收益则不做 |
| sealed reasoning 是否完整保留？ | 真实模型会话 | 不能保证则不做跨协议翻译 |

## 2. 实施约束

- 新模块候选：`innate-dogic/services/mini-gateway`，strict TypeScript、纯 ESM、Node HTTP。
- 与 magpie 路径并存可切换，不做一刀切替换。
- HTTP 只监听 `127.0.0.1` 随机端口；按决策结果实现 `/v1/models`、`/v1/messages`，必要时再补其他端点。
- 只实现确认的原生协议；如确需翻译，单独评审并记录 reasoning 损失。
- DSH 接线格式以当前 DSH 版本实测为准；写前备份，断开原子恢复。
- `MiniGateway` 与 `MagpieGateway` 对齐同形契约，设置页不感知实现切换。
- 测试包括协议转发、真实 DSH 会话、接线/断开恢复和凭据隔离。

## 3. 出口标准

同一台机器上 magpie 与 mini-gateway 分别完成“接入 → 对话 → 断开恢复”，并记录默认实现和回滚方式。未通过决策门时不创建占位包。

## 4. 明确不做

- 全量重写 magpie 的路由组、订阅池、用量归账与多协议互译。
- 为维护方便 fork magpie 后随意裁剪。
- 让 mini-gateway 阻塞双向宿主、工作区或模型设置主线。
