# 计划、构建与模块文档对齐审计

日期：2026-10-27  
范围：`docs/plans/innate-dogic-dsh/`、`docs/sprints/`、`docs/build-path/`、`docs/CONTEXT.md`、`docs/architecture/`、根 README、`tasks/setup-dsh/` 与 `sites/dsh-desktop-plan/`；对照当前 workspace、`package.json` 和实际运行代码。

## 1. 总结论

当前产品方向不需要推翻：**dogic 是长期桌面底座，DSH 是默认 Agent Runtime 与第二宿主，magpie 继续统一模型控制面**。M0–M2 的已有功能与 M3–M7 的双向宿主主线仍然成立。

需要调整的是执行排序和状态表达：**下一步不是直接开始 M3，而是先完成 S0 工程与安全基线，再进入 S1（M3）**。Sprint 层已经成为 41 张待执行任务卡的唯一执行源；阶段文档保留目标和架构上下文，避免两套清单各自改变状态。

本审计不把“文件存在”视为完成。M3 的 `dsh-runtime`、M4 的 `dsh-workbench`、M5 的 `model-settings`、M6 的新 Surface 和 M7 的双宿主分发仍均未实现。

## 2. 已修正的不一致

| 优先级 | 发现 | 代码 / 文档事实 | 处理 |
| --- | --- | --- | --- |
| P0 | 总纲与 Sprint 的下一步冲突 | 总纲写 M3 下一步；S0 明确要求先于 M3 | 总纲、CONTEXT 统一为“S0 → S1（M3）” |
| P0 | S0 安全项仍有真实代码依据 | service 启动参数无 `--host 127.0.0.1`；主窗口 `sandbox:false`；`startMagpie()` 未监听 child `error` | 保留 T0.7，不因做展示而标记完成 |
| P0 | 验证不可追溯、不可独立复现 | 当前无 baseline commit、无 CI、无根 lint/format；真实二进制测试依赖本机网关与账号输出 | 保留 T0.1、T0.4–T0.6，S0 继续作为主线闸门 |
| P1 | 当前与目标双向宿主混写 | 当前 desktop 私有 `main/harness.ts` 与 service 两套实现并存；没有 DSH 侧插件 | 模块图改为明确“目标关系，尚未实现”；网站提供当前/目标视图切换 |
| P1 | 依赖方向概括错误 | 实际 kernel → sdk，workspace → core/kernel/syntax-highlighting，core 并非所有包的共同下游 | CONTEXT 改为与 module-map 一致的真实依赖说明 |
| P1 | Sprint 局部进展未回写 | `magpie.exe.new` 已不存在；`allowBuilds` 已清理；T0.8 的“Roadmap 过期一整个里程碑”已不是当前事实 | 任务卡改为记录剩余工作，不把局部完成当作整卡完成 |
| P1 | 构建索引缺少新执行层和审计入口 | `docs/sprints/` 已存在，但 build-path 索引未链接 | 增加 Sprint、全局 Context 和本审计入口 |
| P2 | 网站仍是静态里程碑，缺少执行任务和模块交互 | Roadmap 只有 M0–M7，看不到 S0、41 张任务卡、阻塞关系与当前/目标接线 | 新增 Sprint 看板、模块交互图和本审计摘要 |
| P2 | 网站说明仍是 Vite 模板 | `sites/dsh-desktop-plan/README.md` 未说明项目用途、命令和内容来源 | 改为方案与执行看板的实际维护说明 |
| P2 | 发布任务依赖表达不准确 | T7.2 需要先有 T4.3 的真实插件骨架，不能只写依赖 T7.1 | 修正 T7.2 依赖 |

## 3. 不需要重写的部分

| 文档 / 计划 | 结论 |
| --- | --- |
| M3 Runtime 插件化 | 方向正确；必须先对齐两套 Harness 行为，再收敛 service 与插件，不可直接替换调用 |
| M4 DSH 侧工作区 | 保留短 spike；真实插件 API 与权限未知，不能提前承诺所有贡献点 |
| M5 双向模型设置 | 保留统一 magpie 接线与 simple 两概念；不重写 magpie 控制台和 per-agent 体系 |
| M6 Surface | terminal/browser/canvas/Agentic UI 独立排期，不要求全部双向复制 |
| M7 发布 | 保留三种桌面包分别验收和 DSH 插件独立分发；目录型便携版成功不等于标准分发通过 |
| build-path 01–04 | 与当前脚本和目录基本一致；继续保留独立 services CLI 待复验、标准 dir 未通过、NSIS/单文件 portable 未验证 |
| 原始 tasks/setup-dsh | 作为历史输入保留；早期双目录决策已由当前单一 `innate-dogic` 产品工程取代，不回改原始记录 |

## 4. 当前执行板

| Sprint | 任务数 | 当前定位 | 入口 |
| --- | ---: | --- | --- |
| S0 工程与安全基线 | 8 | **下一执行项**；T0.1 首先建立可追溯基线 | `docs/sprints/S0-engineering-baseline.md` |
| S1 / M3 Runtime 插件化 | 6 | S0 后执行 | `docs/sprints/S1-m3-dsh-runtime-plugin.md` |
| S2 / M4 DSH 侧工作区 | 7 | 待 S1；T4.1 实测可改变后续实现方式 | `docs/sprints/S2-m4-dsh-workbench-plugin.md` |
| S3 / M5 双向设置 | 5 | 待 S2 | `docs/sprints/S3-m5-dual-host-settings.md` |
| S4 / M6–M7 Surface 与发布 | 9 | 各 Surface 独立排期；契约 → Agentic UI → 批注反馈；发布依赖前序能力 | `docs/sprints/S4-m6-m7-surfaces-release.md` |
| S5 mini-gateway | 2 | 独立决策门，未触发不占主线 | `docs/sprints/S5-mini-gateway-decision.md` |
| S6 代码健康 | 4 | S1 后收益最大，可与 S2–S3 穿插 | `docs/sprints/S6-code-health.md` |

合计 41 张任务卡。任务状态以各 Sprint 卡与真实验证为准；本审计只更新计划和展示，不替代任何任务的 DoD。

## 5. 模块交互的展示口径

网站与 Canvas 使用两种视图：

- **当前接线**：desktop 使用私有 Harness；shell 使用 model-gateway 插件；workspace 由 desktop 静态装配；两个 service 仅在独立后端链中组合。
- **目标接线**：desktop 经 dsh-runtime 使用唯一 harness-runtime；真实 DSH 加载 dsh-workbench；模型设置经两个薄宿主适配器进入同一 magpie 控制面。

所有目标节点和边必须标为“计划”，不能用视觉样式暗示已经存在。认证 URL、token、key 不属于模块图的可持久化数据；renderer、DSH 插件和画布节点都只获得窄契约能力。

## 6. 下一次复核触发点

1. S0 完成后：核对 baseline、CI、密封测试和三项安全修复证据，再开放 S1。
2. T4.1 完成后：按真实 DSH plugin 能力重新估算 M4/M5，不沿用未验证的 API 假设。
3. 任一 Surface 进入发行组合前：单独审查权限、生命周期、持久化与双宿主是否确有必要。
4. 每次发布前：重新实测标准 dir、NSIS 和单文件 portable，不沿用旧失败或旧成功结论。

## 7. 二次复核：Structured I/O 与 Annotation（2026-10-27）

| 发现 | 调整 |
| --- | --- |
| 原 T6.4 同时隐含 Agent 事件、结构化输出和 UI，缺少先行契约 | 新增 T6.4 Structured I/O + Annotation v1；Agentic UI 顺延为 T6.5，只消费公共契约 |
| 批注若混入 RunResult 或 OutputBlock，会破坏结果不可变性并丢失讨论状态 | 新增独立 AnnotationTarget/Thread/Message/Proposal/Store 设计和 T6.6 垂直切片 |
| canvas 依赖 browser 是假线性依赖，与“按 Surface 独立排期”冲突 | T6.3 改为 S3 后可独立执行；Agentic UI 只依赖 T6.4，不等待 canvas |
| 架构文档落地容易被误读为功能完成 | structured-io 明确“设计已固定、代码与 UI 未实现”；T6.4–T6.6 全部保留待执行状态 |
| M3 的非目标是不设计大而全 Agent 接口 | 保持 S0 → S1 主线不变；结构化内容协议留在 M6.4，不重写现有 ModelGateway/WorkspaceApi |

二次复核后总计 41 张任务卡。新增设计见 `docs/architecture/structured-io.md`；本复核没有提前实现 Agentic UI、批注 Panel、生产 AnnotationStore 或 SDK 子入口。
