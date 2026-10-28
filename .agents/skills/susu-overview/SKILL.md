---
name: susu-overview
description: innate-desktop 产品 monorepo 总控技能:锁 UI 基座来源(@innate/ui 私有源消费)、token 纪律、明暗机制、orca Style Guide 与平台原语边界。本仓任何 UI / 页面 / 样式 / 组件 / toolbar / titlebar 任务,以及接入或升级 UI 基座时触发;组件库本身的增改必须转交基础仓 innate-fe 的 fe-ui 技能。
---

# susu-overview — innate-desktop 总控约束

## 仓库定位与关系

- **innate-desktop** = 产品 monorepo(共享底座 + 轻应用平台),本技能管这里。
- **innate-fe** = UI 基础仓,独立仓、**只读消费**:本仓通过私有 Verdaccio registry 安装 `@innate/*` 包,**不是源码并入**。改组件去基础仓,绝不改本仓 `node_modules`。

## 硬规则(违者 review 一票否决)

1. **primitive 唯一来源 = `@innate/ui`**。缺组件或要改组件 → 去基础仓 `framework/innate-fe`,用它的 `.agents/skills/fe-ui` 技能(`pnpm ui:add` / `pnpm ui:update`),改完回本仓 `pnpm ui:sync -- --bump patch` 重装。禁止在本仓复制、自绘或深引 `@innate/ui` 内部路径。
2. **token 分三层,各层归属固定**(详见 [packages/theme/README.md](../../../packages/theme/README.md)):
   - **primitive 与主题机制 = 基础仓 `@innate/ui`**(`packages/ui/src/tokens.css` + `src/themes/`):语义 token 定义面、`.dark` 机制、`data-theme` 变体、10 个变体样式。改这里要去基础仓。
   - **产品 token 层 = 本仓 `packages/theme/src/tokens.css`**:orca 观感冻结(与 `@innate/ui` 基础 `:root` 逐 token 相等)+ 产品扩展 token(git 装饰、状态色、工作项状态、壳 chrome 尺寸)。**本仓唯一允许出现字面量的文件**;新增 token 必须在 `:root` 与 `.dark` 中**成对**声明(测试会校验)。
   - **壳 chrome 层 = 本仓 `packages/theme/src/shell.css`**:titlebar / 窗口控件 / 图标按钮 / 滚动条的类名。**不写字面量**,只引用 token。
   - 组件代码里不写 hex、不写字号、不写像素间距。组件只用语义 token(`--background` / `--card` / `--muted` / `--destructive` / `--ring` / `--border` / `--sidebar-*` …)与 Tailwind 刻度。
   - 优先级:`[data-theme]` 变体选择器 > 本仓产品层 `:root`/`.dark` > `@innate/ui` 基础 `:root`。默认变体是 `default`(基础仓基础 `:root`,即 shadcn Neutral),它的中性色与 orca 逐 token 相等。
3. **颜色只给状态**(选中 / 错误 / 警告 / git 增删);壳面保持单色安静铬面;surface/foreground **成对使用**(`--card` 配 `--card-foreground`),不跨对混搭;品牌色只允许出现在主按钮、链接与焦点环。
4. **明暗 = `.dark` class 切换**(UI 包内 `@custom-variant dark`),运行时经 `ThemeProvider` / `ThemeSelector` 控制;禁止写 `prefers-color-scheme` 媒体查询(与基础仓/orca 机制对齐)。
5. **Tailwind 所有权在消费方 app**(已验证的最终模式,2026-10-27):
   - vite 配置**必须**挂 `@tailwindcss/vite` 插件,`tailwindcss` / `@tailwindcss/vite` 必须是 app 的 devDependencies——没有插件 Tailwind 不参与构建,组件全部裸样式;
   - app 的 `src/globals.css` 是 Tailwind 入口:`@import "tailwindcss"` + `@import "@innate-desktop/theme/index.css"` + 两条 `@source`(本仓源码 `./` 与 `../../../node_modules/@innate/ui/src`,`@source` 必须写在入口文件、放在所有 `@import` 之后);
   - `@innate/ui/globals.css` 是基础仓内部入口(含对基础仓 domains 的相对扫描),消费方**不得**引用;`@innate/ui` 以**源码形态**发布,消费方 bundler 负责编译。
6. **平台五原语**(PurposeBar / WidgetCard / ApprovalModal / PluginCard / PageDefinition)是建在 `@innate/ui` 之上的 **L2 组合件**,落在本仓 `packages/` 或 `apps/` 内,不回灌基础仓。
7. **审批红线**(继承自平台规范):审批永不自动通过;错误必须显式可达,不允许静默 skip;外部链接一律外跳系统浏览器。

## Style guide

视觉规则的执行副本是本目录 [STYLEGUIDE.md](STYLEGUIDE.md)。它**已经按本仓基座重写**(不再是 orca 原文的复制):token 来源、primitive 来源、控件底座、按钮尺度、快捷键 chip、滚动条、安全表面都改成 `@innate/ui` + `packages/theme` 的实际形态。深文在 `styleguide/`,只在任务碰到该主题时读。

| 主题 | 文件 | 什么时候读 |
| --- | --- | --- |
| 角色与规则总纲 | [STYLEGUIDE.md](STYLEGUIDE.md) | 每个 UI 任务都读 |
| 颜色角色、orca ↔ `@innate/ui` token 对照 | [styleguide/color.md](styleguide/color.md) | 选 surface/foreground 配对、给列表行上色时 |
| primitive 清单、按钮、选型、tooltip、图标、快捷键 chip、表单、滚动条 | [styleguide/components.md](styleguide/components.md) | 动某个 primitive 时 |
| 壳 toolbar 规格(orca titlebar ↔ webshell header) | [styleguide/toolbar.md](styleguide/toolbar.md) | 做壳、窗口控件、顶栏时 |
| 原生对话区规格 | [styleguide/native-chat.md](styleguide/native-chat.md) | 对话区落地时(当前尚未实现) |
| UX 规则的推理 | [styleguide/ux-rules.md](styleguide/ux-rules.md) | 规则适用不清楚时 |
| 整屏评审清单 | [styleguide/ux-review-rubric.md](styleguide/ux-review-rubric.md) | 评审或打磨一个页面时 |

仍然生效的几条替换规则:

| orca 的说法 | 在本仓怎么执行 |
| --- | --- |
| `main.css`、新 token 写进 `:root` 与 `.dark` | 字面量只进本仓 `packages/theme/src/tokens.css`(成对声明);语义 token 的定义面归基础仓 |
| `src/renderer/src/components/ui/` | `@innate/ui` 单入口。缺组件去 innate-fe `pnpm ui:add`,禁止把 orca 的 ui 目录拷进本仓 |
| `ShortcutKeyCombo` | 用 `@innate/ui` 的 `Kbd`;平台字形由调用方给。需要分隔符去基础仓补 |
| `SecuritySurface` / `DialogContent surface="security"` | 基础仓尚无。过渡方案用产品层 `--security-*` token 家族 + `DialogContent` 的 `className`;正式方案去基础仓提 `ui:add` |
| 三条 scrollbar class | 已在本仓 `packages/theme/src/shell.css` |
| `repo-multi-combobox` | 用 `Command` + `Popover` 近似;需要现成件去基础仓补 |
| orca 的 `asChild` | `@innate/ui` 是 Base UI,用 `render` prop |
| 字号 14 / 13 / 12 / 11 / 10 | 用已有 Tailwind 档(`text-sm`、`text-xs`、`text-2xs`、`text-3xs`);产品层另补 `text-2xs`(11px)与 `text-3xs`(10px)两档。禁止 `text-[11px]` 这类任意值 |
| Sans 只用 Geist、禁止 Inter | 基础仓 `:root` 的默认栈是 Inter。本仓产品层在 `@import "@innate/ui/tokens.css"` 之后覆盖 `--font-sans` / `--font-mono` 为 Geist / SF Mono 栈,字体文件随 `packages/theme` 分发。组件禁止写 `font-family`。选中带字体的 `data-theme` 时,变体比使用方的 `:root` 更具体 |

组件落在哪、token 写在哪,以硬规则 1–2 为准。

## 基座接入与升级命令

```bash
pnpm ui:sync                    # 发布基础仓 @innate/* → 本地 Verdaccio(127.0.0.1:4873,未运行自动拉起)→ 写 .npmrc → 按版本重装
pnpm ui:sync -- --bump patch    # 基础仓源码改过后用;同版本号幂等跳过
pnpm ui:sync -- --dry-run       # 预演,不落盘
```

基础仓定位自动发现:从本仓向上找 `framework/innate-fe`(含 `plugins.registry.yaml` 的目录);也可 `--root` 显式指定。

## 路由

| 任务 | 去哪里 |
| --- | --- |
| 新增/更新 primitive、采纳主题 | 基础仓 `innate-fe`,fe-ui 技能(唯一入口),改完回本仓 `ui:sync` |
| 页面、功能、L2 组合件 | 本仓 `apps/*`、`packages/*`,只消费 `@innate/ui` 单入口导出 |
| UI 基座接入故障(404/版本不匹配) | 先 `registry status`,再 `ui:sync -- --bump patch`;仍失败查 `.npmrc` 作用域行 |
| 视觉规则(颜色角色、按钮、tooltip、图标、顶栏、UX) | 本技能 [STYLEGUIDE.md](STYLEGUIDE.md);深文按需打开 `styleguide/`。token 归属看硬规则 2 |
| 壳 chrome / 产品 token | 本仓 `packages/theme`(`src/tokens.css` / `src/shell.css` / `src/theme.ts`) |
| 设计原则完整背景 | `docs/README.md`(总纲)。`docs/original/innate-dogic/architecture/style-guide.md` 是过时草案,不执行 |
| orca ↔ innate-fe 对齐结论 | `docs/build-path/1-monorepo-init/style-guide-alignment.md` |

## 执法

门禁走双轨:

- **已有机器执法**:`packages/theme` 的 vitest(`pnpm --filter @innate-desktop/theme test`)校验 token 分层顺序、产品 token 明暗成对、共享 token 快照、无 `prefers-color-scheme`、壳 chrome 层不写字面量、壳 chrome 尺寸与 orca 一致。仓库级 `pnpm verify` 覆盖 typecheck + test。
- **规划中**:在 oxlint 加 design-system 规则(参照 orca 的 `lint:design-system`),禁止产品代码出现硬编码色值与深引内部路径。
