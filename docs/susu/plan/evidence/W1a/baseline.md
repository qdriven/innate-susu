# W1a.1 行为基线证据

日期：2026-10-28

## 单元与类型检查

- `node node_modules/vitest/vitest.mjs run innate-dogic/apps/desktop/src/renderer/src/pages.test.ts innate-dogic/apps/desktop/src/main/surface-host.test.ts`
  - 2 个测试文件通过，7 条测试通过。
  - 固定 simple=`chat/settings`、dev 六页面、同 URL 不 reload、切换只 detach、显式 close 才销毁、两个 Surface 互不影响及 bounds 更新。
- 桌面 `tsconfig.node.json`、`tsconfig.web.json` 与 `tools/tsconfig.json` 的 TypeScript 检查通过。

## 真机基线

命令：`node node_modules/tsx/dist/cli.mjs tools/smoke-desktop.ts --with-harness docs/susu/plan/evidence/W1a/baseline-smoke`

最终结果：通过。

- Windows 原生窗口 resize：1134×769 → 1198×801 → 1134×769，见 `baseline-smoke/window-bounds.json`。
- magpie 控制台真实内容加载、认证检查、hide/show 后 URL 不变且复用 target。
- 控制台 DOM bounds 见 `baseline-smoke/console-bounds.json`；Harness DOM bounds 见 `baseline-smoke/harness-bounds.json`。
- simple 两页面、dev 六页面、工作区文件/Markdown/Git diff 和安全快照恢复通过。
- Harness 跨导航与 renderer reload 后 URL 不变、页面存活标记存在、返回对话重新附着，显式停止返回 `true`。
- 截图位于 `baseline-smoke/`，不记录认证 URL 或 token。

## 基线发现与修复

首次完整真机运行发现：renderer reload 后 Harness 进程和 WebContents 仍存活，但 `App` 未读取既有 `HarnessState`，导致返回对话页不重新附着。已在现有 Harness 状态订阅 effect 中补充 `getHarnessState()` 初始恢复；使用同一真机脚本复跑后通过。
