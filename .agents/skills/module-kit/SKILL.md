---
name: module-kit
description: orca（stablyai/orca 并行 Agent IDE）的模块与组件化通用知识，用于在 Innate 系项目中借鉴/替换其模块。当任务涉及 orca 参考、桌面壳布局、设计 token、多 Agent 配置取舍、插件化架构选型时触发。包含「多 Agent 配置交给 magpie 而非复制 orca per-agent 适配层」的核心判断。
---

# orca 模块通用知识

> 2026-10-28 自 `innate-labs/.agents/skills/orca-module-kit` 迁入本仓，技能名现为 `module-kit`。参考源码留在 `D:\innate-workspace\framework\innate-labs\references\orca`（只读，不在本仓）；完整取舍分析在本仓 `docs/original/architecture/orca-module-review.md`（canonical，改动先改它）。
> 视觉规则以 `susu-overview` 为准。本仓产品的 Surface / 终端 / 文件树归属在 `docs/susu/plan2/`，不在本技能。

## 可直接借鉴

- **设计系统**：token 唯一来源，surface/foreground 成对，sidebar 家族独立；单色安静铬面，颜色只给状态（选中/错误/git）。字阶与字体以 `susu-overview` 的 Style Guide 替换表为准。
- **壳布局**：titlebar strip（品牌 + 状态 pill）+ 左 sidebar（导航 + 底部状态）+ 内容区；壳只做组合，页面各自独立可摘除。
- **工程纪律**：新 UI 只取 token，不写死 hex/字号。**明暗机制以本仓规则为准：`.dark` class 切换（见 susu-overview 硬规则 4），不用 `prefers-color-scheme`**。

## 替换与按需迁移

- **per-agent 适配层**：orca `src/main/{claude,codex,amp,copilot,…}` 每个 Agent 一套账号/启动/用量代码，N Agent × M 关注点重复。多 Agent 模型配置**整体交给 magpie**（统一 Provider 池 + Agents 接线 + 协议互译 + 故障转移 + 用量归账），不要为每个 Agent 自写配置模块。
- **其余通用能力不因功能完整而排除**：SSH、worktree、PR、lint、process-host、ACP、RPC catalog 等均可按产品需要迁移。先划清 SDK、进程与 UI 边界，再作为可移除、可独立测试、可独立打包的模块引入；不要把依赖硬编码进桌面壳。
- **长期工具组合平台**：避免的是不必要耦合，不是完整功能。simple/dev 只控制默认组合与可见性，不删除模块能力。

## 使用方式

做模块选型时先读 `docs/original/architecture/orca-module-review.md` 第 3 节「模块取舍总表」；新模块若表中没有，按「能交给 magpie/dsh 的绝不自写」原则补一行再动手。
