# W4.7 安全、便携与故障回收验收证据

日期：2026-10-29

## 任务目标

高权限 Surface 的安全与便携收口：全量门禁 + 便携含 PTY 冒烟 + 崩溃/关闭两路径回收 + 并发上限。

## 交付范围

- `tools/package-portable.ts`：node-pty 原生模块（N-API 预编译二进制）纳入便携包——`resources/app/node_modules/node-pty`（pnpm 符号链接 `dereference: true` 跟随拷贝真实内容，含 `prebuilds/win32-x64/*.node` 与 `lib/`；main bundle externalize 的 `require("node-pty")` 从 `out/main/index.js` 向上解析到该目录）。
- `tools/smoke-desktop.ts`：W4.7 冒烟扩展——PTY resize 通道、终端标签关闭生命周期（关闭一个不影响另一个）、伪造 capability 的 Surface descriptor 拒绝。
- `innate-dogic/plugins/terminal/src/main/index.test.ts`：W4.7 契约测试——并发上限 8、崩溃路径（外部 taskkill 杀死进程后正常收尾不挂起）、spawn 失败路径。

## 验收点与结果

### 1. 真实交互命令、受控 process 请求、resize 与标签生命周期（smoke-desktop dev）

- 终端 PTY 交互（echo）、多标签切换保留、退出重开：W4.4 既有检查，W4.7 冒烟无回退。
- 受控 process 请求（profile 注册/白名单、正路径受理→结果→stdout、负路径四件套、simple 门控）：W4.6 既有检查，W4.7 冒烟无回退。
- PTY resize 通道：`terminalResize('terminal-1-s1', {cols:100, rows:30})` 返回 true。
- 标签关闭生命周期：关闭「终端 2」标签后其标签移除、「终端 1」保留且不受影响。

### 2. 伪造 renderer 调用未知 profile/capability，main 拒绝

- 未注册 profile 执行、伪造 workspaceId 的 terminalCreate：W4.6 冒烟负路径。
- 伪造 capability（`capabilities: ['shell:exec']`）的 surfaceShow：解析层（`parseSurfaceDescriptor` 能力白名单）拒绝，detail 含 `capability`。

### 3. 便携目录构建与 PTY 加载/进程树回收（smoke-desktop --packaged）

- 便携包组装：`pnpm exec tsx tools/package-portable.ts`——node-pty 资源纳入（prebuilds + lib）。
- 便携包内 PTY 加载：`DSH InnateOS.exe` 启动后终端 PTY 创建/交互/退出全链路通过（node-pty 从 `resources/app/node_modules` 解析，无需现场编译）。
- 进程树回收：超时/取消/退出路径的 `taskkill /T /F` 回收在便携形态下同样生效（dev 与便携同一 service 代码）。

### 4. simple 无入口；无 DSH/magpie 时受控 terminal 仍可用

- simple 模式导航无「终端」入口，process 通道主进程门控全拒（W4.6 冒烟）。
- 不带 `--with-harness` 的冒烟（无 dsh/magpie 网关）下终端与受控 process 按设计可用——冒烟默认形态即此路径。

### 5. 全量门禁与证据检查

- `pnpm verify`（root typecheck + 全量 test）通过；日志/证据不含环境 secret（冒烟只用本地 echo/node 只读命令，无认证 URL/token）。

## 并发上限与故障回收（契约测试）

- **并发上限 8**：8 个在跑执行全部受理，第 9 个被拒（detail 含 `上限`）；逐一取消后全部以 `cancelled` 收尾——资源受控语义。
- **崩溃路径**：执行中的进程被外部 `taskkill /T /F` 杀死后，`processResult` 正常 resolve（'close' 事件触发 finish），不挂起；终态 `ok:false`、非 cancel/timeout、`durationMs > 0`。
- **spawn 失败路径**：不存在的命令以 `error` 事件收尾，`detail` 含 `spawn`，结果可取回。
- **关闭路径**：dispose 统一回收在跑执行（W4.6 契约测试），应用退出/窗口关闭经 `dispose()` 兜底。

## 门禁结果

- `pnpm --filter @dogic/plugin-terminal test`：**44/44** 通过（W4.7 新增 3：并发上限 / 崩溃路径 / spawn 失败）。
- `pnpm --filter @dogic/plugin-terminal typecheck` / `pnpm --filter @dogic/desktop typecheck` / `tools` typecheck：通过。
- 真实桌面冒烟（dev）：退出码 0，`[smoke] OK`；证据见 `smoke-w4-7/`。
- 真实桌面冒烟（便携 `--packaged`）：退出码 0，`[smoke] OK`；证据见 `smoke-w4-7-portable/`。

## 安全结论

- renderer 无通用 shell/string execute 通道；Surface capability 白名单在解析层拒绝未知能力。
- node-pty 原生模块只随包分发预编译二进制，不现场编译、不下载执行；便携包不含任何认证材料。
- 崩溃/关闭两路径均有回收保证：外部杀死不挂起执行句柄；dispose/超时/取消经 `taskkill /T /F` 进程树回收。
