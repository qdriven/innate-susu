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
2. **token 唯一事实源 = 基础仓 `packages/ui/src/tokens.css`(+ `src/themes/`)**(shadcn 语义 token + 仓库扩展 token)。新 UI 只取语义 token(`--background` / `--card` / `--muted` / `--destructive` / `--ring` / `--border` / `--sidebar-*` …);硬编码 hex、字号、像素间距一律禁止。
3. **颜色只给状态**(选中 / 错误 / 警告 / git 增删);壳面保持单色安静铬面;surface/foreground **成对使用**(`--card` 配 `--card-foreground`),不跨对混搭;品牌色只允许出现在主按钮、链接与焦点环。
4. **明暗 = `.dark` class 切换**(UI 包内 `@custom-variant dark`),运行时经 `ThemeProvider` / `ThemeSelector` 控制;禁止写 `prefers-color-scheme` 媒体查询(与基础仓/orca 机制对齐)。
5. **Tailwind 所有权在消费方 app**(已验证的最终模式,2026-10-27):
   - vite 配置**必须**挂 `@tailwindcss/vite` 插件,`tailwindcss` / `@tailwindcss/vite` 必须是 app 的 devDependencies——没有插件 Tailwind 不参与构建,组件全部裸样式;
   - app 的 `src/globals.css` 是 Tailwind 入口:`@import "tailwindcss"` + `@import "@innate/ui/tokens.css"` + 两条 `@source`(本仓源码 `./` 与 `../../../node_modules/@innate/ui/src`,`@source` 必须写在入口文件、放在所有 `@import` 之后);
   - `@innate/ui/globals.css` 是基础仓内部入口(含对基础仓 domains 的相对扫描),消费方**不得**引用;`@innate/ui` 以**源码形态**发布,消费方 bundler 负责编译。
6. **平台五原语**(PurposeBar / WidgetCard / ApprovalModal / PluginCard / PageDefinition)是建在 `@innate/ui` 之上的 **L2 组合件**,落在本仓 `packages/` 或 `apps/` 内,不回灌基础仓。
7. **审批红线**(继承自平台规范):审批永不自动通过;错误必须显式可达,不允许静默 skip;外部链接一律外跳系统浏览器。

## Style guide

视觉规则的执行副本是本目录 [STYLEGUIDE.md](STYLEGUIDE.md),从 `innate-labs/references/orca/docs/STYLEGUIDE.md` 原样复制(2026-10-28)。深文在 `styleguide/`,只在任务碰到该主题时读。副本正文不改;下面的替换表覆盖副本里的 orca 路径。

| 副本里的说法 | 在本仓怎么执行 |
| --- | --- |
| `main.css`、新 token 写进 `:root` 与 `.dark` | 值只进 innate-fe `packages/ui/src/tokens.css`。本仓经 `@innate/ui/tokens.css` 消费,不在产品代码加 token |
| `src/renderer/src/components/ui/` | `@innate/ui` 单入口。缺组件去 innate-fe `pnpm ui:add`,禁止把 orca 的 ui 目录拷进本仓 |
| 相邻组件、`ShortcutKeyCombo`、`SecuritySurface`、三条 scrollbar class、`repo-multi-combobox` | 本仓没有就不现造。先找 `@innate/ui` 里对应 primitive;没有则问用户,或去基础仓补 |
| `styleguide/native-chat.md` | 不执行。对话 UI 是 DSH,不是 orca native-chat |
| 字号 14 / 13 / 12 / 11 / 10 | 用已有 Tailwind 档(`text-sm`、`text-xs`、`text-2xs`、`text-3xs`)。缺档去基础仓补,禁止 `text-[11px]` 这类任意值 |
| 顶栏、`titlebar-traffic-light-pad` | 壳布局对齐 orca titlebar(36px 高、左控件、中槽、窗口控制占位)。控件用 `@innate/ui` 的 Button(`outline` 给 toolbar,`ghost` 给图标)、Tooltip、DropdownMenu。不复制 `.titlebar-icon-button`,不在本仓新做 Toolbar 原语 |
| Sans 只用 Geist、禁止 Inter | 基础仓 `:root` 给出默认栈（当前是 Inter，因为基础仓加载了这套字体）。使用方在自己的 `globals.css` 里、`@import "@innate/ui/tokens.css"` 之后覆盖 `--font-sans` / `--font-mono`，并自行加载字体文件；第一个名字必须和 `@font-face` 的 `font-family` 一致。本仓桌面壳覆盖为 Geist / Geist Mono。组件禁止写 `font-family`。选中带字体的 `data-theme` 时，主题比使用方的 `:root` 更具体 |

角色与交互(单色铬面、surface/foreground 成对、按钮变体、tooltip 只给无名控件、Cancel 用 ghost)以副本为准。组件落在哪、token 写在哪,以硬规则 1–2 为准。

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
| 视觉规则(颜色角色、按钮、tooltip、图标、顶栏、UX) | 本技能 [STYLEGUIDE.md](STYLEGUIDE.md);深文按需打开 `styleguide/`。路径以 Style guide 替换表为准 |
| 设计原则完整背景 | `docs/README.md`(总纲)。`docs/original/innate-dogic/architecture/style-guide.md` 是过时草案,不执行 |

## 执法(规划中)

门禁走双轨:本技能管 AI 行为;机器执法后续在 oxlint 加 design-system 规则(参照 orca 的 `lint:design-system`),禁止产品代码出现硬编码色值与深引内部路径。
