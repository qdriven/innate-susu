# Sprint 1 — M3：DSH Runtime 插件化与托管收敛

> 来源：[plans/innate-dogic-dsh/03-stage-3-dsh-integration.md](../plans/innate-dogic-dsh/03-stage-3-dsh-integration.md)（目标/边界/架构上下文以原文为准）。
> 目标：把 desktop 私有 Harness 启动代码收敛为可组合的 DSH 集成插件，`services/harness-runtime` 成为唯一壳无关 DSH 进程托管实现。用户看到的页面和操作流程保持不变。
> 预估：2–3 天。前置：S0 完成。

```text
当前
apps/desktop/main/ipc.ts → apps/desktop/main/harness.ts → dsh web
services/harness-runtime → 另一条未被 desktop 使用的启动链

目标
apps/desktop → plugins/dsh-runtime → services/harness-runtime → dsh web
                    └→ Harness Surface / 状态 / 生命周期贡献
```

非目标：不设计大而全 Agent 接口；不合并 magpie/工作区/DSH 插件；不改变真实 `~/.dsh` 默认使用方式；不以接口存在为完成标准。

---

## T3.1 托管行为对齐清单

- **做什么**：逐项比较 desktop `main/harness.ts` 与 `services/harness-runtime` 的实现差异，形成行为矩阵，每项标注"保留 / 修正 / 删除"：dsh 入口与系统 Node 解析（Windows npm shim、ELECTRON_RUN_AS_NODE 清理）；`DSH_HOME` 语义（desktop 继承真实目录 vs service 显式注入）；`web/--profile web`、simple overlay、host/port/no-open 参数；stdout 认证 URL 捕获、就绪探测、超时与日志；Windows 进程树停止、异常退出、重复启动、应用退出回收；首次 profile 初始化与 magpie 接线顺序。
- **功能**：两套实现行为已漂移（树杀、重启、--host、token 日志四处不一致）；不先对齐就合并会把 bug 一起合并。
- **如何验证**：矩阵落在本文档附录或 `evidence/m3/behavior-matrix.md`，每行有理由与对应测试名；评审通过后才进入 T3.2。
- **预估 / 依赖**：0.5 天 / S0。

## T3.2 收敛 services/harness-runtime 为唯一实现

- **做什么**：把 T3.1 确认保留的 desktop 行为迁入 service；配置显式化（`dshEntry`/`nodePath`/`dshHome`/port/patch/log，默认解析放 DSH 适配层）；迁移时**顺带修复四个已知缺陷**：① stop-during-start 时 launch Promise 永不 resolve 且监听器泄漏；② 60s 超时置 failed 后就绪循环可能把状态翻回 running（无 phase 前置检查）；③ stdout 按行解析未做跨 chunk 行缓冲，token URL 可能漏检；④ **认证 URL/token 不得写入持久化日志**（当前 desktop 版 `harness.log` 明文记录，service 版已做对，以 service 版为准）。
- **功能**：消灭平行实现是 M3 的核心交付；四个缺陷都位于收敛后唯一存活的实现里，修复一次永久生效。
- **如何验证**：单测覆盖参数拼装、URL 提取（含跨 chunk 行缓冲用例）、状态机（stop-during-start、超时竞态、异常退出）与停止（mock child_process）；隔离临时 `DSH_HOME` 做首次初始化测试；service 独立启动真实 dsh 成功；`grep -rn "token" userData/logs/` 无泄漏。
- **预估 / 依赖**：0.5–1 天 / T3.1。

## T3.3 新增 DSH Runtime 集成插件

- **做什么**：新建 `innate-dogic/plugins/dsh-runtime`（`@dogic/plugin-dsh-runtime`），从现有真实能力抽最小 Runtime 契约：发现、启动、状态、显示、隐藏、停止；插件负责 DSH 特异的入口解析、patch 选择与 Harness Surface 描述；复用现有 `SurfaceHost`/`SurfaceRegistry`，不复制 WebContents 管理；magpie 接线仍属 model-gateway 能力，经受限服务协作，CLI 不散进 renderer。
- **功能**：方向 A（dogic 托管 DSH）的插件化落点——DSH 从"desktop 私有模块"变为"可禁用、可测试、可独立演进"的组合插件。
- **如何验证**：插件独立 build/typecheck/test 全绿；`packages/sdk`、`packages/core` 不反向依赖该插件（依赖方向检查）；契约有 mock 实现与契约测试。
- **预估 / 依赖**：0.5 天 / T3.2。

## T3.4 desktop 改为组合插件

- **做什么**：`apps/desktop` 声明并装配 dsh-runtime 插件；删除 desktop 私有 `HarnessRuntime`，IPC 只转发插件契约；`innate:harness*` 通道可暂留兼容别名但不再有第二实现；simple/dev 页面门控改为根据插件贡献与 capability 计算，插件禁用时无无效对话入口。装配机制沿用现有静态组合（动态装配归 S6）。
- **功能**：应用内只剩一条 DSH 启动链、一个状态源；"DSH 插件可移除"成为验收指标（禁用后工作台和其他插件不受影响）。
- **如何验证**：`grep -rn "spawn\|dsh web" apps/desktop/src/main/` 无进程启动代码残留；禁用插件后 `pnpm smoke:desktop`（无 Harness 变体）通过；启用后全量冒烟通过；应用内无平行状态源（状态只从插件契约读取）。
- **预估 / 依赖**：0.5 天 / T3.3。

## T3.5 生命周期与故障隔离

- **做什么**：deactivate 不杀会话（只隐藏/卸载 Surface），close/stop 才终止 Runtime；禁用/卸载插件时关闭其 Surface、停止子进程并注销贡献，不影响 workspace 等插件；DSH 未安装、启动超时、token 缺失、异常退出都有可操作错误（UI 可见 + 可重试）；禁止递归加载 desktop、禁止认证 URL 进布局快照。
- **功能**：双向宿主计划的统一验收指标"DSH 插件可移除"依赖本项；故障隔离决定插件化是否真的成立。
- **如何验证**：手工 + 自动用例：deactivate 后 dsh 进程仍活着；disable 后进程树被回收且 workspace 功能正常；四类故障各自出现可理解错误文案；`evidence/m3/` 有对应截图。
- **预估 / 依赖**：0.5 天 / T3.4。

## T3.6 双模式真实回归与文档

- **做什么**：全量门禁 + 真实打包冒烟：

```bash
pnpm package:portable
pnpm smoke:desktop -- docs/plans/innate-dogic-dsh/evidence/m3 --packaged --with-harness
```

覆盖 simple/dev Harness、控制台、工作区恢复、Git diff、插件禁用与进程清理；更新 `module-map.md`、`workbench-surfaces.md`、`docs/build-path/`、方案网站与本文状态。
- **功能**：M3 出口标准要求"现有用户流程零回退"——只有打包产物上的真实冒熟能证明。
- **如何验证**：冒烟断言全绿且证据入 `evidence/m3/`；83 基线 + 新增测试全过；任务卡第 3 条规则（提交关联 T 编号）在 git log 可查。
- **预估 / 依赖**：0.5 天 / T3.5。

---

## 出口标准（M3）

- desktop 不再包含第二套 DSH 进程托管实现；`services/harness-runtime` 是唯一实现。
- DSH Runtime 插件可独立测试、禁用和恢复，工作台其他功能不受影响。
- 当前用户流程零回退；83 项基线 + 新增测试全过；目录型便携版真实冒烟通过。
- 四个已知进程管理缺陷（T3.2 列表）在唯一实现中修复并有测试守护。
