# 目标模块图与迁移映射

> 版本：v3.0 草案 · 2026-10-27。回答两个问题：目标目录长什么样、现有每一块去哪。
> 目录层级定义沿用旧规则：apps=可启动产品、plugins=可组合能力、packages=共享契约、services=壳无关运行时；**新增 frameworks=开发框架层**。

## 1. 目标目录形态（P 系列完成后）

```text
innate-dogic/
├─ apps/
│  ├─ desktop/                     @dogic/desktop：Electron 主产品（组合宿主；目的入口+画布+插件页由轻应用宿主插件贡献）
│  └─ shell/                       @dogic/shell：独立 Node/Web 壳（保留）
├─ frameworks/                     ★ 新增：开发框架层（两个包，先骨架后丰满）
│  ├─ innate-fe/                   前端框架：tokens + shell 布局 + UI 原语 + 插件 UI 宿主（见 CONTEXT §4）
│  └─ innate-backend/              后端框架：service-runtime + sidecar + ipc-contract + capabilities + storage
├─ packages/
│  ├─ core/                        dsh 状态/检查/模式/Surface 契约（不变；画布 Surface 类型在此扩展）
│  ├─ kernel/                      DI/生命周期/注册表（不变；Sprint 6 决议照旧执行）
│  ├─ sdk/                         ModelGateway 契约 + 轻应用契约类型（PluginManifest v1 类型放这）
│  └─ syntax-highlighting/         独立高亮（不变）
├─ plugins/
│  ├─ workspace/                   工作区（不变）
│  ├─ model-gateway/               shell 的 magpie 插件（不变）
│  ├─ dsh-runtime/                 P6：AgentRuntime 的 dsh 适配器（吸收原 M3「DSH Runtime 插件化」）
│  └─ light-app-host/              P3–P5：轻应用宿主（加载器接线、目的页、画布页、插件/技能页）
├─ services/
│  ├─ harness-runtime/             dsh 编排（P6 收敛为唯一实现，desktop 弃用私有 main/harness.ts）
│  └─ model-gateway/               magpie sidecar（不变）
├─ architecture-policy.yaml        ★ P0 引入：模块治理（id/roots/requires/publicEntrypoints/owner，对齐 zcode）
└─ bin/magpie.exe                  不变
```

**不新建**：不恢复并列验证工程；不在 apps 里塞插件源码；frameworks 不依赖 apps/plugins（方向单向：apps → frameworks → packages/services）。

## 2. 现有模块 → 目标归属（迁移映射）

| 现有 | 目标 | 动作 | 里程碑 |
| --- | --- | --- | --- |
| `apps/desktop/src/main/harness.ts` | `plugins/dsh-runtime` + `services/harness-runtime` | 删除私有实现，desktop 只经插件启动 Harness | P6 |
| `apps/desktop` renderer 壳布局/页面 | `innate-fe/shell` + `innate-fe/ui` | 布局与原语上提，desktop 只装配 | P1–P5 |
| `apps/desktop` main 的 IPC/harness/launcher 编排 | `innate-backend`（sidecar/ipc-contract）+ 各插件 | 逐块上提，每块带真实冒烟回归 | P2–P6 |
| `services/harness-runtime`（bootBackend 模式） | `innate-backend/service-runtime` + `sidecar` | 模式泛化，dsh 编排留原地并变薄 | P2 |
| `packages/core/surface` | 不动 + 扩展 `canvas` Surface 类型与快照 | P5 |
| `packages/sdk`（ModelGateway 契约） | 不动 + 新增轻应用契约类型子入口 | P3 |
| `packages/kernel`（DI/生命周期） | 不动；动态装配接线决策照旧归 Sprint 6 | — |
| `plugins/workspace`、`plugins/model-gateway` | 不动 | — |
| `prototypes/kimi-work-clone` 的 plugin-loader/permissions/gateway/审批闭环 | `innate-backend/capabilities` + `plugins/light-app-host` + `packages/sdk` 类型 | 移植 + strict 化 + 契约测试 | P2–P4 |
| `docs/`（旧树） | 只读历史；新任务全部在 `docs/innate-dogic/` | 状态板迁移后旧 sprints 标注「已由新树取代」 | P0 |

## 3. 依赖规则

```text
apps/* ─→ frameworks/* ─→ packages/*；services/* 独立被 apps/plugins 显式调用
plugins/* ─→ frameworks/* + packages/*；packages 不反向依赖任何上层
轻应用（运行时载荷）只见契约（sdk 类型 + 审批/Widget 协议），不见框架内部
```

- `innate-fe` 禁止 import Electron/Node API；`innate-backend` 禁止 import Electron/React（services 同规）。
- 跨进程一律窄契约：新通道必须进 `ipc-contract` 通道表并类型双向锁定，禁止 renderer 直连 `ipcRenderer`。

## 4. 治理：architecture-policy.yaml

P0 在 `innate-dogic/` 引入（格式对齐 `references/zcode/architecture-policy.yaml`）：

```yaml
version: 1
modules:
  - id: innate-fe
    roots: [frameworks/innate-fe/src]
    managed: true          # 新模块 born-managed；存量模块先登记为 managed: false
    requires: [sdk]
    publicEntrypoints: [frameworks/innate-fe/src/index.ts]
    owner: platform
  - id: innate-backend
    roots: [frameworks/innate-backend/src]
    managed: true
    requires: []           # 纯 Node，不依赖 packages 亦可；需要契约时再声明
    publicEntrypoints: [frameworks/innate-backend/src/index.ts]
    owner: platform
  # 存量模块逐一登记（core/kernel/sdk/…），managed: false，迁移时翻 true
```

验收：`pnpm check:policy`（P0 交付的工具）校验 requires 方向、publicEntrypoints 存在性；CI 与 typecheck 同跑。

## 5. 包名与拆分粒度

- 包名：frameworks 用非 scoped 名 `innate-fe`、`innate-backend`（框架层与 `@dogic/*` 产品模块区分层级）。
- 拆分以依赖圈为准，**不允许先建空目录冒充架构完成**；每个框架包首日就要有可运行代码与测试（P0 任务卡定义了最小面）。
