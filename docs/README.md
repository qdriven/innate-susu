# Innate 平台总体计划(文档归档入口)

> 本目录自 `innate-labs/docs/` 迁入(2026-10-27),是 Innate 体系全部设计文档与执行计划的归档处。
> 计划的唯一执行源是 [`innate-dogic/sprints/`](./innate-dogic/sprints/README.md) 状态板;本文只做总纲摘要。

---

## 1. 一句话定位

**`innate-dogic` = 共享底座 + 轻应用平台:用户说目的,平台匹配轻应用,结果以卡片留在画布上。**

三个角色分工不可互换:

| 对象 | 角色 | 是否在产品仓 |
| --- | --- | --- |
| DSH(`@deepseek-ai/dsh`) | Agent runtime、会话与工具执行、Harness UI | 否;本机全局解析,系统 Node 启动 |
| magpie | Provider/模型管理、Agent 接线、路由与用量 | 只保留 `bin/magpie.exe`,不持有源码 |
| `innate-dogic` | 桌面壳、进程与 Surface 生命周期、插件组合、轻应用生态 | 是;唯一产品工程 |

## 2. 已验证基线(M0–M2,2026-10-26)

以下能力已真实验证完成,是所有后续里程碑「行为不回退」的验收前提:

- DSH 对话内嵌(系统 Node 启动 `dsh web`,Harness UI 嵌入桌面)、magpie 控制台
- simple/dev 双模式门控、simple overlay 裁剪 7/7 断言
- 原生工作区插件(文件/Markdown/图片/只读 Git)、Surface 安全快照
- 便携包真实 Electron 冒烟;全量门禁 **83 项测试(基线只增不减)**

## 3. 平台化重启方向(2026-10-27 起,canonical)

### 底座五类共享服务

1. **Agent 会话运行时** —— `harness-runtime` → `AgentRuntime` 适配缝;dsh 是第一个适配器,不重写执行内核
2. **模型网关** —— magpie 承担 Provider 池/接线/用量,平台不自研
3. **Surface/工作区宿主** —— Surface/Document/Panel 三类内容;画布成为一等 Surface(P5)
4. **OS 能力** —— 新增 `innate-backend/capabilities` 能力注册表 + 显式权限审批(v0 三个权限位)
5. **分发组合** —— manifest 驱动的轻应用加载器 + 目录客户端;本地侧载先行,内容寻址 zip 市场随后

### 轻应用(一个用户目的一个包)

清单契约 `PluginManifest v1`(原型已跑通):`purpose` 目的索引 + 关键词匹配(v1 语义匹配)、`tools`(v0 模板 → v1 MCP 服务)、`widget` sandbox iframe 结果卡片、`permissions` 执行前必过审批中介、`integrity` 内容寻址校验。**同一目的、不同实现并列展示,用户选实现而不是学工具**;飞书式重平台是反面参照。

### 两个开发框架(本轮新增)

- **`innate-fe`**(前端):React + orca 派生设计 token + 壳布局原语(TitlebarStrip/Sidebar/ContentArea)+ 插件 UI 宿主(v0 sandbox iframe,v1 对齐 MCP Apps)
- **`innate-backend`**(后端,壳无关):`service-runtime` 生命周期、`sidecar` 外部进程托管、`ipc-contract` 类型双向锁定、`capabilities` 审批中介、`storage` 版本化 JSON 快照

## 4. 里程碑状态板(唯一执行源:[sprints/](./innate-dogic/sprints/README.md))

| Sprint | 名称 | 预估 | 状态 |
| --- | --- | --- | --- |
| P0 | 平台基线(frameworks 骨架 + policy + 文档树生效) | 1–2 天 | **下一执行项** |
| P1 | innate-fe:token + 壳布局 + 明暗 | 2–3 天 | 排队 |
| P2 | innate-backend:service-runtime + capabilities | 2–3 天 | 排队(可与 P1 并行) |
| P3 | 轻应用契约 v1 + 本地加载器 + light-app-host | 2–3 天 | 待 P2 |
| P4 | 目的网关 + 审批 UI + Widget 钉卡闭环 | 2–3 天 | 待 P1+P3 |
| P5 | 画布 Widget Surface + 快照恢复 | 2 天 | 待 P4 |
| P6 | dsh 适配器(吸收原 M3) | 2–3 天 | 待 P4 |
| P7 | 分发:内容寻址 zip + 目录客户端 | 2–3 天 | 待 P5 |
| M4/M5 | 方向 B:DSH 侧插件 / 双向设置 | 4–6 + 3–4 天 | 待 P6 |
| S5/S6 | mini-gateway 决策门 / 代码健康 | — | 不变,穿插 |

DoD:全量门禁绿 + 任务卡「如何验证」逐条通过 + 证据入 `innate-dogic/evidence/<里程碑>/` + 文档同步。

## 5. 旧主线处置

- S0 工程基线并入 P0;S1(M3 DSH Runtime 插件化)被 P6 吸收;M6 画布部分被 P5 提前;M7 分发被 P7 扩展
- 方向 B(M4 DSH 侧 workbench 插件、M5 双向设置)保留,排在 P6 之后,任务卡沿用旧树
- 旧文档(`CONTEXT.md`、`plans/innate-dogic-dsh/`、`sprints/`、`architecture/`、`build-path/`)保留为 **M0–M2 基线证据与方向 B 依据**,不再新增执行任务

## 6. 硬约束(继承,不重开讨论)

1. 产品代码/后端/网站/工具全部 strict TypeScript;`references/` 只读不入库;`prototypes/` 不进门禁
2. DSH 用真实系统 Node 启动(清 `ELECTRON_RUN_AS_NODE`);全新 `DSH_HOME` 先裸 boot 再 magpie 接线
3. 本地服务一律只绑 `127.0.0.1`;认证 URL/token/key 不进日志、快照、夹具
4. 文件与 Git 默认只读、参数数组禁 shell 拼接;renderer 无任意 Node/shell
5. Electron:`contextIsolation: true`、`nodeIntegration: false`、WebContentsView `sandbox: true`
6. 轻应用 fail closed:清单非法或权限拒绝只禁用自身,不破坏底座
7. 测试基线只增不减;真实二进制测试只读、隔离 `DSH_HOME`/userData

## 7. 文档地图

| 问题 | 去哪里 |
| --- | --- |
| 最新方向:术语、底座、轻应用、框架 | [innate-dogic/CONTEXT.md](./innate-dogic/CONTEXT.md) |
| 新架构总览(分层/契约) | [innate-dogic/architecture/overview.md](./innate-dogic/architecture/overview.md) |
| 目标模块图与迁移映射 | [innate-dogic/architecture/module-map.md](./innate-dogic/architecture/module-map.md) |
| 视觉与交互规范 | [innate-dogic/architecture/style-guide.md](./innate-dogic/architecture/style-guide.md) |
| Sprint 任务卡(唯一执行源) | [innate-dogic/sprints/README.md](./innate-dogic/sprints/README.md) |
| P 系列里程碑与决策总纲 | [innate-dogic/plans/README.md](./innate-dogic/plans/README.md) |
| 构建矩阵、命令、门禁、分发 | [innate-dogic/build-path/README.md](./innate-dogic/build-path/README.md) |
| 旧全局 Context(M0–M2 基线) | [CONTEXT.md](./CONTEXT.md) |
| 旧双向宿主计划(dogic × DSH) | [plans/innate-dogic-dsh/README.md](./plans/innate-dogic-dsh/README.md) |
| 对齐审计与模块图(旧) | [architecture/plan-alignment-review.md](./architecture/plan-alignment-review.md) |
| Structured I/O 与批注契约(未实现) | [architecture/structured-io.md](./architecture/structured-io.md) |
| 技术栈说明 | [dsh-tech-stack.md](./dsh-tech-stack.md) |
| Kimi Work / ZCode 研究笔记 | [research/kimi-work-zcode-platform-notes.md](./research/kimi-work-zcode-platform-notes.md) |

## 8. 阅读顺序

新会话先读 `innate-dogic/CONTEXT.md` → `innate-dogic/architecture/overview.md` → `innate-dogic/sprints/README.md` 状态板;执行任务只看 `sprints/`,做完按 DoD 回写证据。
