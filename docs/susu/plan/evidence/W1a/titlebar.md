# W1a.3 TitlebarStrip 验证证据

日期：2026-10-28

## 自动化

- 顶栏实现：`shell/TitlebarStrip.tsx`；原 `Titlebar.tsx` 只保留 App props 适配，不转发 W2 网关状态。
- 控件从 `@innate/ui` 单入口使用 Button：应用菜单 `outline`，窗口图标 `ghost`；无深引、无新增 primitive。
- `TitlebarStrip.test.tsx` + W1a 基线：3 个测试文件、10 条测试通过。
- 桌面完整 `typecheck` 与 `build` 通过。
- DOM 覆盖品牌、`#titlebar-tabs`、`#titlebar-right-panel-slot`、空 `#titlebar-status-slot`、三个窗口按钮、应用菜单、双击最大化与按钮事件隔离。

## 真机

命令：`node node_modules/tsx/dist/cli.mjs tools/smoke-desktop.ts --with-harness docs/susu/plan/evidence/W1a/titlebar-smoke`

最终结果：通过。

- 顶栏三区、两个空槽、无 magpie pill、3×46 窗口控件通过。
- 点击最大化后显示“还原”，双击标签槽后恢复“最大化”。
- 明暗顶栏截图：`titlebar-smoke/theme-light.png`、`titlebar-smoke/theme-dark.png`。
- 完整 simple/dev、控制台 hide/show、Harness 跨导航不重载/重载状态恢复/显式停止、工作区与窗口 resize 均通过。

首次运行在顶栏断言通过后遇到 magpie 控制台 CDP 截图超时；确认无 Electron 残留进程后，使用同一构建与同一断言完整复跑通过。首次运行不计为通过证据。
