# apps/

桌面应用位。每个应用是独立的 workspace 包，可单独 `pnpm --filter <name> dev` 启动。

当前状态：**空**。按 [Plan2](../../docs/susu/plan2/README.md) 的 W1 阶段接入第一个应用：

| 包名 | 说明 | 阶段 |
| --- | --- | --- |
| `@innate-desktop/desktop` | Electron 桌面主产品：窗口/模式/IPC、壳组合（titlebar / 侧栏 / 中栏 Surface 槽） | W1 |

接入约定（来自 [docs/susu/plan2/phases/W1-shell.md](../../docs/susu/plan2/phases/W1-shell.md) 的 W1.2）：

- `vite.config` 必须挂 `@tailwindcss/vite`，`tailwindcss` 与 `@tailwindcss/vite` 进 devDependencies；
- renderer 入口 CSS 是 Tailwind 入口：`@import "tailwindcss"` + `@import "@innate-desktop/theme/index.css"` + 两条 `@source`（本仓源码与 `node_modules/@innate/ui/src`），`@source` 必须写在所有 `@import` 之后；
- 明暗只走 `.dark` class（`@innate/ui` 的 `ThemeProvider` / `ThemeSelector`），不写 `prefers-color-scheme` 媒体查询；
- primitive 只从 `@innate/ui` 取，不在本仓复制 `components/ui/*`；
- 壳的 titlebar / 窗口控件按 [styleguide/toolbar.md](../../.agents/skills/susu-overview/styleguide/toolbar.md) 实现（36px 物理壳 + 自绘窗口控件，内容语义对齐 webshell header）。
