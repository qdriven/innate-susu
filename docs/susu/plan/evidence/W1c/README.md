# W1c 阶段交付证据

日期：2026-10-28 ～ 2026-10-29

## 完成范围

- W1c.1 provider 中立的 Surface 标签模型：core 白名单解析 + renderer `surfaces/`（SurfaceTabs、provider 注册表、SurfaceSlot、webcontents/document provider）。
- W1c.2 统一 Surface IPC：`innate:surfaceShow/surfaceHide/surfaceBounds/surfaceClose` 取代旧的 console/harness 专用通道；认证 URL 只在主进程 runtime provider 内解析。
- W1c.3 可摘除的运行时降级：错误页与恢复动作常驻、provider 错误边界、摘除 provider 只移除自身贡献、DSH 缺失/启动失败不白屏。
- W1c.4 壳与便携回归：冒烟脚本新增多 Surface 标签断言，真实 Electron（开发形态 + 便携形态）跑通（见 `smoke.md`）。

## 门禁结果

- `pnpm build`：通过（desktop 产物 `out/`）。
- `pnpm typecheck`：通过，含 `tools/tsconfig.json` 检查与 `check:typescript`。
- `pnpm test`（排除环境依赖包 `@dogic/plugin-model-gateway`）：全部通过，合计 **146 条**：
  - `apps/desktop` 53 条（本次新增 34 条：surface-tabs 12、provider 注册表 4、SurfaceSlot 4、App 壳层 7、surface-host 负路径 7）
  - `packages/core` 34 条（surface 契约 9 + dsh 入口 realpath 1 为本次新增/加固）
  - `packages/kernel` 28、`packages/theme` 10、`packages/sdk` 9、`plugins/workspace` 5、`packages/syntax-highlighting` 3、`innate-project-canvas` 4。
- `pnpm verify:overlay`：7/7 条目全部 `disabled=true`。
- `pnpm --filter @dogic/plugin-model-gateway test`：5 条失败（`MagpieCli (real binary)` 的 version/providers/ls/models/quota 全部 30s 超时）。该包不在本次改动范围（`git status` 无改动），失败原因是本机从 Node `execFile` 拉起真实 magpie 二进制极慢（同一命令在 bash 下需 40s+），属环境限制，与 W1c 无关。

## 真实桌面结论（开发形态）

`node node_modules/tsx/dist/cli.mjs tools/smoke-desktop.ts --with-harness docs/susu/plan/evidence/W1c/smoke` → **退出码 0**：

- 三栏壳、Orca 顶栏（3×46 控件 / 应用菜单 / 最大化 / 双击还原）、原生 resize 与恢复、明暗主题与 Geist 全部通过。
- magpie 控制台真实内容与认证通过；统一中栏槽标签条渲染 `magpie 控制台`。
- 伪造 providerId 与未就绪 provider 均被主进程拒绝（`ok:false`，不创建 WebContentsView），壳与导航仍可用。
- 控制台 hide/show 复用同一 target（URL 未变 = 未 reload）。
- Harness 启动并嵌入统一中栏槽；标签条同时显示 `magpie 控制台 | DeepSeek Harness`。
- 交替切换标签后 Harness URL 未变且存活标记仍在（未 reload）；关闭控制台标签后其 target 消失而 Harness 仍在（关闭隔离）。
- renderer 可见的 Harness 状态与 Surface 快照均无 token / 认证 URL。
- 工作区文件、Markdown、只读 Git diff 与安全快照恢复通过。

## 便携形态

见 `smoke.md`：便携目录重新组装后运行 `--packaged --with-harness` 真实冒烟。

## 安全结论

- renderer 侧 Surface 状态与快照只含 id/providerId/kind/title/workspaceId/capabilities 与安全 activeId；单测断言 localStorage 与快照 JSON 中不出现 url/token/webContents/pid。
- renderer 可见的 Harness 状态与启动结果已去掉认证 URL（`publicHarnessState` / `publicLaunchResult`），Harness 就绪文案只报端口。
- 伪造 providerId、id/provider 不匹配、kind 不匹配、非法 descriptor/bounds 全部被主进程拒绝，且不创建任何 WebContentsView。

## 顺带修复（阻断真机验收，非 W1c 范围但必须修）

- `packages/core/src/dsh.ts`：`resolveDshEntry` 之前直接返回 pnpm 全局符号链接路径，Windows 下 Node 无法据此加载模块（`Cannot find module`），Harness 永远起不来；现统一 `realpath` 后再 spawn，命令行协议不变，并补了符号链接回归单测。
- `apps/desktop/src/main/harness.ts`：就绪文案曾带认证 URL（token 被脱敏但 URL 仍在），现只报端口。
- 控制台 / Harness 启动上限改为可用 `INNATE_MAGPIE_CONSOLE_TIMEOUT_MS` / `INNATE_HARNESS_READY_TIMEOUT_MS` 覆盖，产品默认值不变（15s / 60s）。
