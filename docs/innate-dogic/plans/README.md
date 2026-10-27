# 平台化重启 · 里程碑与决策总纲

> 版本：v3.0 草案 · 2026-10-27。M0–M2 为已验证基线；P 系列为平台化主线；方向 B（M4/M5）顺延。
> 执行任务一律在 [../sprints/README.md](../sprints/README.md)；本文只放里程碑、依赖与决策。

## 1. 产品决策（本轮新增）

1. `innate-dogic` 升级为「共享底座 + 轻应用」平台；底座只提供五类共享服务（CONTEXT §2），其余一切下沉为轻应用。
2. 前端开发框架统一为 `innate-fe`，后端统一为 `innate-backend`；新建 UI/后端能力不得绕开框架层。
3. 轻应用契约走 **MCP 标准**演进（v0 声明式模板 → v1 MCP 服务工具 + MCP Apps 页面）；不自造插件 SDK。
4. 视觉与交互规范以 orca token 体系为唯一参照（style-guide.md）；Kimi Work 的交互形态（目的入口/钉卡/审批）为体验基线。
5. 分发双轨：本地侧载先行，内容寻址 zip 市场随后；市场机制对齐 zcode（官方市场 = 内置 + CDN sha256）。

## 2. 里程碑总表

| 里程碑 | 内容 | 依赖 | 预估 | 出口标准 |
| --- | --- | --- | --- | --- |
| M0–M2 | 单一 monorepo、magpie 控制台、DSH 对话、simple/dev、工作区、Surface 快照 | — | 已完成 | 证据在旧树 `evidence/`；行为不回退是后续一切验收的前提 |
| **P0** | 平台基线：frameworks 两包骨架 + architecture-policy + 新文档树生效 | — | 1–2 天 | 门禁全绿 + check:policy 纳入 + desktop 行为零变化 |
| **P1** | innate-fe：token + 壳布局（TitlebarStrip/Sidebar/Content）+ 明暗 | P0 | 2–3 天 | desktop 换皮不换逻辑，明暗截图 + 冒烟通过 |
| **P2** | innate-backend：service-runtime + capabilities（注册/权限/审批） | P0 | 2–3 天 | 泛化 bootBackend；审批契约测试（含超时/拒绝负路径） |
| **P3** | 轻应用契约 v1 + 本地加载器 + light-app-host 插件骨架 | P2 | 2–3 天 | 加载/校验/侧载/禁用全链路 + 非法清单 fail closed |
| **P4** | 目的网关 + 审批 UI + Widget 钉卡（闭环） | P1+P3 | 2–3 天 | 目的→审批→卡片端到端；拒绝/超时/匹配失败显式原因 |
| **P5** | 画布 Widget Surface + widgetState 快照恢复 | P4 | 2 天 | 重载后卡片恢复（对齐 Surface 快照验收标准） |
| **P6** | dsh 适配器就位（吸收原 M3） | P4 | 2–3 天 | desktop 只经 dsh-runtime 启动 Harness；两套托管合一；目的可触发真实会话 |
| **P7** | 分发：内容寻址 zip + 目录客户端 + 桌面包集成 | P5 | 2–3 天 + 工具链 | 侧载与目录安装双轨 + sha256 校验 + 便携包含示例轻应用 |
| M4 | DSH 侧 Innate Workbench 插件（方向 B） | P6 | 4–6 天 | 真实 DSH 安装/卸载垂直切片（原标准不变） |
| M5 | 双向宿主模型设置 | M4 | 3–4 天 | 原标准不变 |
| M8（原 M7 余量） | NSIS/单文件、双宿主 UAT、兼容矩阵 | P7+M5 | 外部工具链 | 原标准不变 |

```text
M0–M2 基线 ──→ P0 基线 ──→ P1 innate-fe ──┐
              └─→ P2 innate-backend ──→ P3 轻应用契约 ──→ P4 闭环 ──→ P5 画布 ──→ P6 dsh 适配 ──→ P7 分发 ──→ M8
                                                              └─ M4（方向 B）─→ M5 ──────────────┘
S5 mini-gateway 决策门：独立，不触发不排期；S6 代码健康：穿插。
```

## 3. 统一验收指标（在旧指标上增量）

| 指标 | 目标 | 验证 |
| --- | --- | --- |
| 现有功能不回退 | DSH 对话、magpie、simple/dev、工作区、Surface 快照 | 每个P 里程碑必跑现有冒烟 |
| 轻应用闭环 | 目的→匹配→审批→卡片→恢复，全链路真实运行 | P4/P5 端到端验收 |
| fail closed | 非法清单、哈希不符、权限拒绝只影响自身 | P3/P7 负路径测试 |
| 框架收敛 | 新 UI/后端代码只出现在 frameworks 与 plugins，apps 变薄 | check:policy + 评审 |
| 权限不扩大 | renderer 无任意 Node/shell；轻应用代码不进底座进程 | 安全测试 + 评审 |
| 小白流程 | 安装到首次「目的达成」≤3 步；simple 不暴露工具概念 | 干净环境 UAT |
| 工程质量 | 门禁全绿；测试只增不减 | 全量门禁 |

## 4. 风险与决策门

| 风险 | 处理 |
| --- | --- |
| frameworks 层变成「为共享而共享」 | 规则不变：功能先于代码共享；每块上提必须伴随真实消费者（desktop 或插件），无消费者的上提回退 |
| 原型代码移植失真 | 移植 = strict 化 + 契约测试 + 负路径覆盖，不接受直接拷贝 |
| MCP Apps 协议在桌面 WebView 的真实兼容性 | P3 末做一次短 spike（参考 zcode UI Plugin），失败则 v1 页面契约延后，不阻塞工具契约 |
| dsh 插件 API 不足以承载轻应用会话 | P6 先实测（同原 M3 风险处理），不足则记录阻塞、缩小首片，不伪造完成 |
| widget iframe 与 CSP/沙箱冲突 | P4 用真实冒烟验收；冲突时降级为受控 srcdoc + 契约桥 |
| 双向适配重复实现 | 沿用旧规则：薄适配器可重复，核心状态禁止复制 |

## 5. 变更控制

- 每个提交/PR 关联任务编号（`T<里程碑>.<序号>`，如 `T4.2`）。
- 里程碑完成：证据入 `docs/innate-dogic/evidence/<里程碑>/`，更新 sprints 状态板与本表状态。
- 本树与旧树冲突时以本树为准；修改本树需在「变更控制」节留记录。
