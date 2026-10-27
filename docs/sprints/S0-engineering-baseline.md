# Sprint 0 — 工程与版本库基线

> 来源：2026-10-26 中期与架构评审（P0/P1 快修项）。先于 M3 执行：这些是让后续所有 Sprint 可追溯、可回滚的地基。
> 目标：版本库可追溯、二进制可溯源、门禁自动化、测试可密封、已知安全缺陷清零。
> 预估：1–1.5 天。完成后 S1（M3）才开工。

---

## T0.1 落首笔基线提交

- **做什么**：在 .gitignore 已补全（`references/`、`*.exe`、`*.exe.new`、`.tmp/`，2026-10-26 已完成）的基础上，`git add` 产品代码/文档/工具/网站并完成首笔 baseline commit；此后按 T 编号提交。
- **功能**：当前仓库 0 commit，所有"已验证"不可追溯，T 编号变更控制无法落地；基线提交是回滚与评审的前提。
- **如何验证**：`git log` 有基线提交；`git status` 无 references/、无 *.exe 待提交；`git count-objects -vH` 仓库体积在合理范围（< ~100MB）；`.agents/`、`docs/`、`innate-dogic/` 全部入库。
- **预估 / 依赖**：0.5 天 / 无。

## T0.2 magpie 二进制清单化

- **状态**：部分完成（2026-10-27 复核：`magpie.exe.new` 已不存在，`bin/` 当前只有 `magpie.exe`；清单和版本校验仍未完成）。
- **做什么**：新建 `innate-dogic/bin/README.md` 记录保留版本的版本号、sha256、来源与更新流程；`detect`/`launcher` 启动时校验版本不低于记录版本。孤儿 `.new` 文件已清理，无需重复处置。
- **功能**：二进制是外部依赖却无版本溯源；清单化后“哪个版本测过”有据可查。
- **如何验证**：`bin/` 只有一份 exe + README；`magpie --version` 输出与 README 记录一致；sha256 与记录一致；全仓无 `magpie.exe.new` 引用。
- **预估 / 依赖**：0.25 天 / T0.1（README 入库）。

## T0.3 工程配置清理

- **做什么**：移除 `pnpm-workspace.yaml` 的 `allowBuilds` 占位垃圾（2026-10-26 已完成）；复核 `.npmrc` 与 `verifyDepsBeforeRun` 的重复声明，收敛为一处。
- **功能**：无效配置项掩盖真实意图，干扰后续排查。
- **如何验证**：`pnpm install` 无占位文案残留；配置文件 grep 无 "set this to"。
- **预估 / 依赖**：0.1 天 / 无。（2026-10-26：allowBuilds 已清理，剩余复核项随 T0.1 提交。）

## T0.4 lint 与 format 基建

- **做什么**：引入单一工具链（建议 Biome：单配置覆盖 lint+format），根配置 + `pnpm lint` / `pnpm format` 脚本；首次全量 format 独立成一个纯格式提交。
- **功能**：全仓无 lint/format 配置（唯一 eslint 在方案网站）；多人/多 agent 协作需要统一的机器可执行风格门禁。
- **如何验证**：`pnpm lint` 全绿；format 提交后 `pnpm build && pnpm typecheck && pnpm test` 全绿（纯格式零行为变化）；CI 接入 lint。
- **预估 / 依赖**：0.25 天 / 无。

## T0.5 最小 CI

- **做什么**：新增 GitHub Actions workflow（Windows runner）：install → lint → build → typecheck → test → `check:typescript`；测试中依赖真实 magpie/dsh 环境的用例在 CI 自动跳过（配合 T0.6 的开关）。
- **功能**：当前无任何 CI；门禁只存在于本机，T 编号验收缺独立执行环境。
- **如何验证**：提 PR 触发 workflow 全绿；故意引入类型错误时 CI 变红；CI 时长 < 15 分钟。
- **预估 / 依赖**：0.25 天 / T0.4、T0.6。

## T0.6 测试密封化与 vitest 配置分包

- **做什么**：① 各包独立 vitest 配置（或统一 workspace 配置），修复"根配置超时对包内运行不生效"问题；② `plugins/model-gateway` 测试去环境依赖：去掉对真实账号状态的断言（如 `ls()` 含 'Claude'、"网关应该在运行中"），改 mock `run` 或显式跳过开关；真实二进制用例统一加 `MAGPIE_INTEGRATION=1` 类开关。
- **功能**：当前测试绑定本机二进制与账号状态，换机/CI 必挂；根 vitest 配置实际不生效造成超时错位。
- **如何验证**：断网 + 干净环境（无 magpie、无 dsh）跑 `pnpm test` 全绿；CI 上 test 步骤通过；默认开关下不触网、不依赖本机二进制。
- **预估 / 依赖**：0.5 天 / 无。

## T0.7 安全快修（只修 M3 之后仍存活的代码）

- **做什么**：① `services/harness-runtime` 启动 dsh 时补 `--host 127.0.0.1`（desktop 版已显式绑定，service 版缺失会把带 token 的 Web UI 暴露面交给 dsh 默认值）；② desktop 主窗口 `sandbox: true`（preload 仅用 contextBridge/ipcRenderer，当前 `sandbox:false` 是不必要放宽）；③ `main/launcher.ts` spawn 补 `child.on('error')` 处理（非 Windows 下二进制缺失会以未捕获异常击穿主进程）。
- **功能**：三处已知安全/健壮性缺陷，且都位于 M3 收敛后仍保留的代码路径，先修不返工。
- **如何验证**：① harness-runtime 启动参数含 `--host 127.0.0.1`（单测断言 argv）；② 主窗口 webPreferences 检查 + `pnpm smoke:desktop` 通过（preload 功能不回归）；③ 临时移走 magpie 二进制后启动应用，主进程不崩溃且 UI 有可操作错误。
- **预估 / 依赖**：0.25 天 / 无。注：desktop `harness.ts` 的 token 入日志、stop-during-start 挂起等缺陷在 S1/T3.2 收敛时一并消灭，此处不重复修。

## T0.8 文档数字与方案网站同步

- **状态**：已完成（2026-10-27）。测试数保留带日期的 83 项基线，通用命令以当次输出为准；总纲与 CONTEXT 统一为 S0 优先；新增对齐审计、Sprint 看板和当前/目标模块图；网站 build 与 lint 通过。
- **做什么**：同步 plans、sprints、build-path、CONTEXT、module-map 与方案网站；保留历史里程碑中的旧数字时必须明确标为历史。后续状态变化继续同步 `sites/dsh-desktop-plan/src/data/project.ts`。
- **功能**：消除执行顺序、当前/目标接线和验证状态的冲突；网站现在能展示 41 张任务卡及其依赖、验证方式。
- **如何验证**：过期无上下文数字 grep 无结果；网站构建与 lint 通过；文档本地链接有效；build-path 命令与根 scripts 对应。
- **预估 / 依赖**：0.25 天 / 无。

---

## 出口标准

- 基线提交存在，T 编号可挂；CI 全绿成为每个 PR 的默认门禁。
- 干净机器 + 断网环境 `pnpm test` 全绿（测试不再绑定本机状态）。
- `bin/` 二进制有版本与 sha256 记录；无孤儿二进制文件。
- T0.7 三项安全修复合入并带回归验证。
