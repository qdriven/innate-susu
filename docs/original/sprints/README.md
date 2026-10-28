# Sprint 执行层

> 所有待执行任务的唯一执行清单。里程碑决策与阶段规格见 [plans/innate-dogic-dsh](../plans/innate-dogic-dsh/README.md)；每个 Sprint 文档 = 一批独立任务卡（做什么 / 功能 / 如何验证）。
> 全局上下文见 [docs/CONTEXT.md](../CONTEXT.md)。

## 规则

1. **任务编号**：`T<里程碑>.<序号>`（如 T3.1）或 `T<主题字母><序号>`（工程基线 T0.x、代码健康 TC.x、mini-gateway TG.x）。跨文档引用一律用编号。
2. **完成定义（DoD）**：以真实运行为准，不以代码/接口存在为准 —— 全量门禁（build/typecheck/test）绿 + 该任务"如何验证"逐条通过 + 证据入 `docs/plans/innate-dogic-dsh/evidence/<里程碑>/` + 相关文档与方案网站同步。
3. **每个提交/PR 关联任务编号**（如 `T3.2: converge harness-runtime`）。
4. **测试基线只增不减**：83 项（2026-10-26）。
5. 真实 magpie/dsh 测试只读、隔离 `DSH_HOME`；认证 URL/token/key 不进日志、快照与夹具。

## 状态板

| Sprint | 名称 | 来源 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| [S0](./S0-engineering-baseline.md) | 工程与版本库基线 | 2026-10-26 中期评审（P0/P1 快修） | 1–1.5 天 | **下一执行项（先于 M3）** |
| [S1](./S1-m3-dsh-runtime-plugin.md) | M3：DSH Runtime 插件化与托管收敛 | 计划 M3 | 2–3 天 | 排队（S0 后） |
| [S2](./S2-m4-dsh-workbench-plugin.md) | M4：DSH 侧 Innate 工作区插件 | 计划 M4 | 4–6 天 | 待 S1 |
| [S3](./S3-m5-dual-host-settings.md) | M5：双向宿主模型设置 | 计划 M5 | 3–4 天 | 待 S2 |
| [S4](./S4-m6-m7-surfaces-release.md) | M6–M7：Surface 双向化与双宿主发布 | 计划 M6/M7 | 按 Surface 排期 | 待 S3 |
| [S5](./S5-mini-gateway-decision.md) | mini-gateway 决策门（独立可选） | 计划附录 | 决策 0.5 天 | 决策门未触发，不排期 |
| [S6](./S6-code-health.md) | 插件装配与代码健康收尾 | 2026-10-26 评审（P2） | 1–2 天 | 可与 S2–S3 穿插，不阻塞主线 |

```text
S0 工程基线 ──→ S1 (=M3) ──→ S2 (=M4) ──→ S3 (=M5) ──→ S4 (=M6/M7)
                  │                                   └── S5 mini-gateway（独立决策门，任意时间可做）
                  └──────────── S6 代码健康（穿插进行，S1 后收益最大）
```

## 已完成里程碑（历史，不在 Sprint 层）

| 里程碑 | 出口证据 |
| --- | --- |
| M0 单一 monorepo 基座 | 单一 workspace；`docs/build-path/01` |
| M1 dogic 内嵌 magpie 控制台 | 认证/真实内容/内嵌与外链通过；`evidence/m1/` |
| M2 DSH 对话、simple/dev 与原生工作区 | 真实 Harness、overlay 7/7、文件/Git、便携冒烟；`evidence/m2/` |

规格与实施记录：[01-stage-1](../plans/innate-dogic-dsh/01-stage-1-embed-console.md) · [02-stage-2](../plans/innate-dogic-dsh/02-stage-2-simple-mode.md)。
