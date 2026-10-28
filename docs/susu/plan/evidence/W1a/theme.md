# W1a.2 产品主题接入证据

日期：2026-10-28

## 接入与静态检查

- `npm exec --yes --package=pnpm@12.15.0 -- node tools/ui-sync.mjs`：私有 registry 同步与 workspace 依赖安装成功。
- app 声明 `@innate/ui@^0.1.2`、内部产品 theme、Tailwind 与 `@tailwindcss/vite`；插件只挂 renderer。
- `globals.css` 顺序为 Tailwind → 产品 theme → 两条 `@source`；`main.tsx` 由 `@innate/ui` 单入口引入 ThemeProvider。
- 旧 CSS 变量已桥接到产品语义 token；renderer 无 `prefers-color-scheme`、无 hex 字面量、无 `@innate/ui` 深引。
- 桌面 `build` 与完整 `typecheck` 通过。

## 真机回归

- W1a 两个基线测试文件、7 条测试再次通过。
- `tools/smoke-desktop.ts --with-harness` 完整通过，覆盖 simple/dev、控制台、Harness 跨导航不重载与显式停止、工作区和窗口 resize。
- `theme-smoke/theme.json` 记录：亮色无 `.dark`，暗色有 `.dark`；body 背景分别为 `rgb(255, 255, 255)` / `rgb(10, 10, 10)`，字体均为 Geist。
- 明暗截图：`theme-smoke/theme-light.png`、`theme-smoke/theme-dark.png`。
