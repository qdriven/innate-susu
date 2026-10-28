# Sprint 6 — 插件装配与代码健康收尾

> 来源：2026-10-26 中期与架构评审（P2 项）。
> 定位：不阻塞主线，但 S1（M3）之后收益最大——M3 建立了插件契约与组合关系，本 Sprint 把"插件体系名存实亡"的欠账清掉。可与 S2–S3 穿插执行。
> 原则对齐：计划 1.2 节"功能先于代码共享"——本 Sprint 只做"消灭假抽象与平行实现"，不引入新框架。

---

## TC.1 内核死代码处置与插件契约统一

- **做什么**：对 `packages/kernel` 三处未接线设施做明确决断——`Registry`（宣称的 pending/retry 机制实际没有 retry 实现）、`ModuleLoader`（全局安装设施零引用）、`LifecycleManager.globalListeners`（无公开写入方法，事件广播死路）：**有真实需求的接线（补 retry/事件广播 + 测试），没需求的删除**，二选一，不留假抽象。同时统一插件形态：`plugins/model-gateway` 的裸函数 `apply(ctx, options)` 改为标准 `Plugin = { id, apply(ctx) }`（SDK options 走容器注入）；desktop/shell 手工拼的 no-op 事件总线（`on/emit: () => {}`）替换为真实事件通道或显式移除事件能力。
- **功能**：kernel 自称"插件内核"但生产路径零使用；两个插件两种形态。收敛后"三层插件化"才是真的，否则 README/CONTEXT 的承诺是假的。
- **如何验证**：kernel 无未被任何包引用的死代码（依赖图检查 + grep）；两个插件同形态且都过 LifecycleManager 生命周期测试；plugin-registry 事件真实可达（renderer 发事件 → 插件收到）；全量门禁绿。
- **预估 / 依赖**：0.5–1 天 / S1（T3.3/T3.4 落地后做，避免冲突）。

## TC.2 magpie 探测与发现收敛为单一实现

- **做什么**：合并两套互不知晓的 magpie 二进制探测（`apps/desktop` launcher 的 `resolveMagpieBin`：env→resources→repo 相对路径→PATH；`plugins/model-gateway/detect.ts` 的 `detectMagpie`：PATH→常见安装目录）为一个共享入口；明确并文档化 magpie 能力的分工边界（desktop 走 core HTTP 发现 `/api/hello`、`/v1/models`；shell 走插件 CLI 封装），或在成本可接受时收敛为一层适配；`MIN_MAGPIE_VERSION` 形同虚设的版本下限与 T0.2 的 bin/README 清单打通。
- **2026-10-27 实测补充**（shell web UI 排障结论）：① `MagpieCli` 默认超时 10s 小于 magpie CLI 实际延迟（10–13s），已修为 30s；② `parseProviders/parseAgents` 为占位实现，解析不了真实表格输出而返回空数组（shell「模型管理」页因此恒为空）；③ shell 页已加加载/错误/重试反馈（`apps/shell/public/index.html`）。本任务须以真实解析或统一实现替换占位 parser。
- **功能**：同一外部依赖三处平行认知（探测 ×2 + 发现 ×2），行为已经不一致；收敛后版本兼容、降级行为可统一测试。
- **如何验证**：全仓只有一处二进制探测实现与一处网关状态发现入口（grep 验证）；两消费方（desktop/shell）在"无 magpie / 旧版本 magpie"场景行为一致（契约测试）；`pnpm smoke:desktop` 与 shell 集成测试绿。
- **预估 / 依赖**：0.5 天 / S1、T0.2。

## TC.3 renderer 拆分与页面注册表统一

- **做什么**：拆分 `App.tsx`（全仓最大文件，~367 行，内联 Card/SmallBtn/Wizard/ModelsTab/ToolsTab 五个组件）为独立组件文件；统一 `pages.ts` 静态注册表与 `WorkbenchHost.registerPanel()`（两套互不相识的注册表，后者在 desktop 生产路径未被消费）——按 TC.1 的决断结果接线或删除其一；5s 轮询 `readStatus()`（每轮 spawn where/which + 多个 2–4s HTTP 探测）加退避或事件化。
- **功能**：M3 门控改为"按插件贡献计算页面"（T3.4）后，页面注册表必须只有一份；renderer 拆分让后续 M5 设置页、M6 Surface 页有干净的落点。
- **如何验证**：`App.tsx` < 200 行；页面只有一种注册机制（grep 验证）；`pnpm smoke:desktop` 全绿（门控数量断言不变）；状态轮询在空闲时频率可观测下降。
- **预估 / 依赖**：0.5–1 天 / TC.1、S1（T3.4）。

## TC.4 M3 遗留清理

- **做什么**：删除 M3 (T3.4) 暂留的 `innate:harness*` IPC 兼容别名；清理 desktop 内被 services 取代后残留的私有实现碎片；复核 `packages/kernel` 对 `@dogic/sdk` 的死依赖（声明但未使用）等 package.json 卫生问题。
- **功能**：兼容期结束后的正常清账；防止"暂时保留"变成永久第二实现。
- **如何验证**：grep 无 `innate:harness` 通道（preload/renderer/main 同步移除）；renderer 使用新通道的冒烟绿；各包 package.json 依赖与实际 import 一致（可用 depcheck 类工具或人工清单）。
- **预估 / 依赖**：0.25 天 / S1、TC.1。

---

## 出口标准

- kernel 无假抽象：每处设施要么有测试的真实用途，要么已删除。
- 全仓单一插件形态、单一 magpie 探测/发现实现、单一页面注册表。
- 现有功能零回退（全量门禁 + 桌面冒烟）。
