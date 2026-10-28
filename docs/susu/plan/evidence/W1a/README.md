# W1a 阶段交付证据

日期：2026-10-28

## 完成范围

- W1a.1：固定 simple/dev、Harness、控制台和窗口行为基线；2 个测试文件、7 条测试通过。详见 `baseline.md` 与 `baseline-smoke/`。
- W1a.2：接入 Tailwind、产品主题入口和 ThemeProvider，完成语义 token 与 Geist 明暗验证。详见 `theme.md` 与 `theme-smoke/`。
- W1a.3：新增三区 `TitlebarStrip`，保留空 tabs/status 槽与窗口行为；3 个测试文件、10 条专项测试通过。详见 `titlebar.md` 与 `titlebar-smoke/`。

## 最终全仓门禁

使用 `npm exec --yes --package=pnpm@12.15.0 -- pnpm <命令>` 执行：

- `pnpm build`：通过。
- `pnpm typecheck`：通过，包含 tools TypeScript 检查。
- `pnpm test`：21 个测试文件、132 条测试全部通过；其中 desktop 6 个文件、22 条测试通过。
- W1a.3 真机命令 `node node_modules/tsx/dist/cli.mjs tools/smoke-desktop.ts --with-harness docs/susu/plan/evidence/W1a/titlebar-smoke`：完整通过，覆盖明暗、3×46 窗口控件、最大化、双击还原、simple/dev、控制台、Harness、工作区和 resize。

## 门禁中修复的既有问题

首次全仓 build 发现 `innate-dogic/packages/core/src/dsh.test.ts` 的 shim 测试字符串包含未转义换行；修正字符串后，测试进一步暴露 `pnpmGlobalRootFromShim` 返回路径多保留一个末尾分隔符。已做最小修复，core 29/29 与最终全仓 132/132 通过；未删除或放宽任何测试。
