# W1 · 壳：三栏 + token + 中栏多标签槽

> 预估 2–3 天 · 依赖：W0 全绿
> 目标：renderer 换皮不换逻辑——接入 `@innate/ui` token 与 Tailwind，App.tsx 收口为 orca 式三段壳，中栏从「单 view」变「多标签 Surface 槽（detach 不销毁）」。**不改 magpie/DSH 启动逻辑，不写 terminal。**

## 任务卡

### W1.1 token 与 Tailwind 接入（desktop renderer）

- **做什么**：
  - `innate-dogic/apps/desktop` devDependencies 加 `tailwindcss`、`@tailwindcss/vite`；dependencies 加 `@innate/ui`（workspace 外，私有源）。electron-vite 的 **renderer** vite 配置挂 `tailwindcss()` 插件（main/preload 配置不动）。
  - 新建 `src/renderer/src/globals.css`，照搬 susu-web 已验证模式：
    ```css
    @import "tailwindcss";
    @import "@innate/ui/tokens.css";
    @source "./";
    @source "../../../../../node_modules/@innate/ui/src";
    ```
    （`@source` 相对深度按实际目录核；必须写在入口文件、放所有 `@import` 之后——susu-overview 硬规则 5。）
  - 明暗机制：`.dark` class 切换（ThemeSelector 控制），**不写 `prefers-color-scheme` 媒体查询**；与 style-guide v3.0 §2 的旧说法冲突处以 susu-overview 硬规则 4 为准，同步修订 `docs/innate-dogic/architecture/style-guide.md` 该句并留变更记录。
  - 现有 renderer 手写 CSS 中的颜色值逐步换语义 token（本任务只换壳层涉及文件，页面内部样式 W1.2 顺带处理，不追求一次清零）。
- **如何验证**：明暗截图各一张入证据（token 生效：`--background`/`--card`/`--sidebar` 可见差异）；`grep` 壳层文件无硬编码 hex；构建产物含编译后 Tailwind。

### W1.2 三段壳布局收口

- **做什么**：
  - 新建 `apps/desktop/src/renderer/src/shell/`：`TitlebarStrip`（品牌 + 模式 pill + 全局状态位）、`Sidebar`（页面导航，吃 `pages.ts` 注册表；底部状态区留 W2 接网关 pill）、`ContentArea`（页面容器 + 中栏标签条）。
  - L2 组合件落本仓 app 内（susu-overview 规则 6），内部只消费 `@innate/ui` 单入口导出（Button/Card/Tooltip…）；不深引内部路径。
  - 拆 `App.tsx`（367 行）：`Titlebar.tsx`、`ModeGate.tsx` 并入 shell；`overview` Wizard、`ModelsTab`、`ToolsTab` 内联实现拆成 `pages/` 独立文件；**`pages.ts` 注册表与门控语义不动**（simple: chat/settings；dev: overview/workspace/models/console/tools）。
  - 壳只做组合：删除任一页面注册，壳仍可启动（注册表空转渲染 ContentArea 空态）。
- **如何验证**：`pnpm smoke:desktop` 通过（DOM 断言：导航项、模式 pill、窗口控制）；simple/dev 门控行为与 W0 基线一致；负路径单测：空注册表可渲染。

### W1.3 中栏多标签 Surface 槽

- **做什么**：
  - `main/surface-host.ts` 扩展：从「同一时刻只 attach 一个 view」改为**多 Surface 注册 + 单 attach 切换**——`attach(surfaceId)` 时 detach 当前 view（`WebContentsView` 从 contentView 移除但**不 destroy、不重载**），再挂目标 view；bounds 跟随窗口尺寸变化只作用于可见 view。
  - 中栏标签条（React，shell 内）：列出已注册 surface（现状两个：`harness`、`magpie-console`；`browser`/`terminal` 等后续段加入）；活动标签高亮；关闭按钮按 surface 类型决定（harness 关闭=stop 进程，弹确认）。
  - IPC 扩展：`surface:list`（注册快照）、`surface:activate`；进 `preload` 类型化契约（satisfies 模式不变）。
  - 红线语义：**detach 不销毁、URL 不变不 reload**（M2 Surface 契约）；DSH 会话与 magpie 控制台登录态在切换后必须原样。
- **如何验证**：
  - CDP 冒烟：启动 harness → 切到 magpie 控制台 → 切回，断言 harness webContents URL 未变、未触发 reload（`page.frame` 生命周期或导航计数）。
  - 窗口 resize 后可见 view bounds 正确（截图）。
  - 禁用 dsh 插件/无 dsh 环境下壳仍启动（负路径：中栏只有 magpie 标签 + 空态）。

### W1.4 simple overlay 回归

- **做什么**：W1 改动全部跑一遍 `verify:overlay`（7/7 断言）与 simple 模式手测（首启 ModeGate → simple 首页 → chat/settings 可达、dev 页面不可见）。
- **如何验证**：overlay 断言输出 + simple 模式截图入证据。

## 出口标准

1. 三段壳落地，布局对照 orca（左导航 / 中内容 / 右侧留白给 W3）；明暗两张截图。
2. `smoke:desktop` + `verify:overlay` 全绿；测试基线较 W0 只增（空注册表负路径等）。
3. 中栏切换 harness ↔ magpie 控制台，会话/登录态不死（CDP 断言）。
4. magpie/DSH 启动代码零改动（`harness.ts`/`launcher.ts` diff 为空或仅类型 import）。
