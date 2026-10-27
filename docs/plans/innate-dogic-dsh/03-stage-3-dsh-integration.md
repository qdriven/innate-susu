# 阶段 3（M3）— DSH Runtime 插件化与托管收敛

> 执行层：本阶段任务清单已迁移至 [docs/sprints/S1-m3-dsh-runtime-plugin.md](../../sprints/S1-m3-dsh-runtime-plugin.md)（含评审补充的缺陷修复项）；本文保留目标、边界与架构上下文，任务以 Sprint 层为准。

状态：下一执行项 · 预估 2–3 天。

目标：把“desktop 私有 Harness 启动代码”收敛为可组合的 DSH 集成插件，并让 `services/harness-runtime` 成为唯一的壳无关 DSH 进程托管实现。用户看到的页面和操作流程保持不变。

## 1. 当前与目标

```text
当前
apps/desktop/main/ipc.ts → apps/desktop/main/harness.ts → dsh web
services/harness-runtime → 另一条未被 desktop 使用的启动链

目标
apps/desktop → plugins/dsh-runtime → services/harness-runtime → dsh web
                    └→ Harness Surface / 状态 / 生命周期贡献
```

DSH 仍是外部 Agent Runtime。此阶段不重写对话 UI，不拆 Harness 内部页面，也不实现第二种 Agent。

## 2. 非目标

- 不设计覆盖所有 Agent 的大而全接口。
- 不把 magpie 控制台、工作区和 DSH Runtime 合成一个插件。
- 不改变真实 `~/.dsh` 的默认使用方式，不静默迁移用户配置。
- 不以接口和空目录存在作为完成标准。

## 3. 任务分解

### T3.1 托管行为对齐清单（0.5 天）

逐项比较 desktop 与 service 当前实现，形成必须保持的行为矩阵：

- dsh 入口与真实系统 Node 解析，Windows npm shim 处理。
- `DSH_HOME`：desktop 默认继承真实用户目录；service 支持显式注入，二者不得串用。
- `web` / `--profile web`、simple overlay、host/port/no-open 参数。
- stdout 认证 URL 捕获、就绪探测、超时与日志。
- Windows 进程树停止、异常退出、重复启动与应用退出回收。
- 首次 profile 初始化与 magpie 接线的先后顺序。

验收：每项明确“保留、修正或删除”的理由和对应测试，不直接以其中一个实现覆盖另一个。

### T3.2 收敛 `services/harness-runtime`（0.5–1 天）

- 把 T3.1 确认仍需保留的 desktop 行为迁入 service。
- 配置显式化：`dshEntry`、`nodePath`、`dshHome`、port、patch、log；默认解析放在 DSH 适配层，不散落到 UI。
- 保持真实 Node、token 不进入持久化、Windows 子进程树回收。
- 单测覆盖参数、URL 提取、状态与停止；隔离临时 `DSH_HOME` 做首次初始化测试。

验收：service 可以独立启动真实 DSH，desktop 所需行为均有等价入口。

### T3.3 新增 DSH Runtime 集成插件（0.5 天）

建议位置：`innate-dogic/plugins/dsh-runtime`，包名 `@dogic/plugin-dsh-runtime`。

- 从现有真实能力抽最小 Runtime 契约：发现、启动、状态、显示、隐藏、停止。
- 插件负责 DSH 特异的入口解析、patch 选择与 Harness Surface 描述。
- 复用现有 `SurfaceHost` / `SurfaceRegistry`，不复制 WebContents 管理。
- magpie 接线仍属于 model-gateway 能力，通过受限服务协作，不把 CLI 散进 renderer。

验收：插件独立构建、类型检查和测试；sdk/core 不反向依赖 DSH 插件。

### T3.4 desktop 改为组合插件（0.5 天）

- `apps/desktop` 声明并装配 DSH Runtime 插件。
- 删除 desktop 私有 HarnessRuntime，IPC 只转发到插件契约。
- 可暂时保留 `innate:harness*` 作为兼容别名，但不再另建实现；页面文案无需改变。
- simple/dev 页面门控改为根据插件贡献与 capability 计算，禁用插件时不出现无效对话入口。

验收：应用内只有一条 DSH 启动链；没有平行状态源。

### T3.5 生命周期与故障隔离（0.5 天）

- deactivate 不杀会话，close/stop 才终止 Runtime。
- 禁用/卸载 DSH 插件时关闭其 Surface、停止子进程并注销贡献，不影响 workspace 等插件。
- DSH 未安装、启动超时、token 缺失和异常退出均有可操作错误。
- 禁止递归加载 desktop 或把认证 URL 写入布局快照。

### T3.6 双模式真实回归与文档（0.5 天）

执行全量门禁和：

```bash
pnpm package:portable
pnpm smoke:desktop -- docs/plans/innate-dogic-dsh/evidence/m3 --packaged --with-harness
```

必须覆盖 simple/dev Harness、控制台、工作区恢复、Git diff、插件禁用与进程清理。更新模块图、工作台架构、构建文档和方案网站。

## 4. 出口标准

- desktop 不再包含第二套 DSH 进程托管实现。
- DSH Runtime 插件可以独立测试、禁用和恢复，工作台其他功能不受影响。
- 当前用户流程零回退，83 项最近基线及新增测试全部通过。
- 真实目录型便携版冒烟通过；不以单元测试替代 DSH 启动验收。
