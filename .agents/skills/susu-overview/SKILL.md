---
name: susu-overview
description: innate-desktop 产品 monorepo 总控技能:锁 UI 基座来源(@innate/ui 私有源消费)、前端依赖安装方法(innate-fe-cli / ui:sync / .npmrc)、token 纪律、明暗机制、orca Style Guide 与平台原语边界。本仓任何 UI / 页面 / 样式 / 组件 / toolbar / titlebar 任务,以及接入、添加或升级 @innate/* 依赖时触发;组件库本身的增改必须转交基础仓 innate-fe 的 fe-ui 技能。私有源命令细节见 innate-fe-cli 技能。
---

# susu-overview — innate-desktop 总控约束

## 仓库定位与关系

- **innate-desktop** = 产品 monorepo(共享底座 + 轻应用平台),本技能管这里。
- **innate-fe** = UI 基础仓,独立仓、**只读消费**:本仓通过私有 Verdaccio registry 安装 `@innate/*` 包,**不是源码并入**。改组件去基础仓,绝不改本仓 `node_modules`。

## 硬规则(违者 review 一票否决)

1. **primitive 唯一来源 = `@innate/ui`**。缺组件或要改组件 → 去基础仓 `framework/innate-fe`,用它的 `.agents/skills/fe-ui` 技能(`pnpm ui:add` / `pnpm ui:update`),改完回本仓 `pnpm ui:sync:bump` 重装。禁止在本仓复制、自绘或深引 `@innate/ui` 内部路径。装依赖走下面「前端依赖」,不要 `pnpm add` 打到 npmjs。
2. **token 以 `packages/theme` 的代码为准**(分层表在 [packages/theme/README.md](../../../packages/theme/README.md),不在这里再抄一份):
   - 消费方只 `@import "@innate-desktop/theme/index.css"`。该入口再引入 `@innate/ui/tokens.css`。不要引 `@innate/ui/globals.css`。
   - `default` **没有** `[data-theme="default"]` 规则。`ThemeProvider` 仍把属性写成 `default`,于是落到产品层 `:root` / `.dark`。这是基础仓的 oklch Neutral,**不是**变体 `shadcn-neutral`。
   - 变体选择器只覆盖那个文件里写了的变量。`shadcn-*` 不写 sidebar / chart / font,这些仍是产品层。`linear` / `notion` / `webshell` 写了 sidebar(`linear` 还写 chart)。`marshmallow` / `art-deco` 写了 `--font-sans`,会盖过产品层的 Geist。
   - 亮色共享 token 与基础 `:root` 同值。暗色产品层固定 4 处:`accent` `#404040`、`border` 与 `sidebar-border` 为 `rgb(255 255 255 / 0.07)`、`sidebar-ring` `#525252`。
   - 字面量只进 `packages/theme/src/tokens.css`,`:root` 与 `.dark` 成对。`shell.css` 只引用 token(滚动条两处回退色是测试白名单)。按钮用 `@innate/ui` 的 Button,不进壳层。
   - Geist 的 `@font-face` 与 `--font-sans` / `--font-mono` 写在产品层 `:root`。组件不写 `font-family`。
3. **颜色只给状态**(选中 / 错误 / 警告 / git 增删);壳面保持单色安静铬面;surface/foreground **成对使用**(`--card` 配 `--card-foreground`),不跨对混搭;品牌色只允许出现在主按钮、链接与焦点环。
4. **明暗 = `.dark` class 切换**(UI 包内 `@custom-variant dark`)。CSS 里禁止写 `prefers-color-scheme`。`color-mode=system` 时由基础仓 `ThemeProvider` 用 `matchMedia` 决定是否加上 `.dark`,再写 `data-theme`。
5. **Tailwind 所有权在消费方 app**(已验证的最终模式,2026-10-27):
   - vite 配置**必须**挂 `@tailwindcss/vite` 插件,`tailwindcss` / `@tailwindcss/vite` 必须是 app 的 devDependencies——没有插件 Tailwind 不参与构建,组件全部裸样式;
   - app 的 `src/globals.css` 是 Tailwind 入口:`@import "tailwindcss"` + `@import "@innate-desktop/theme/index.css"` + 两条 `@source`(本仓源码 `./` 与 `../../../node_modules/@innate/ui/src`,`@source` 必须写在入口文件、放在所有 `@import` 之后);
   - `@innate/ui/globals.css` 是基础仓内部入口(含对基础仓 domains 的相对扫描),消费方**不得**引用;`@innate/ui` 以**源码形态**发布,消费方 bundler 负责编译。
6. **平台五原语**(PurposeBar / WidgetCard / ApprovalModal / PluginCard / PageDefinition)是建在 `@innate/ui` 之上的 **L2 组合件**,落在本仓 `packages/` 或 `apps/` 内,不回灌基础仓。
7. **审批红线**(继承自平台规范):审批永不自动通过;错误必须显式可达,不允许静默 skip;外部链接一律外跳系统浏览器。

## Style guide

视觉规则只维护在 [STYLEGUIDE.md](STYLEGUIDE.md)(含「深入阅读」索引和「与 orca 原文的差异」)。token 归属以硬规则 2 为准,不在这里再列一份替换表。

## 前端依赖(私有源)

`@innate/*` 不在 npmjs。唯一装法是 innate-fe-cli 的 `install`:把基础仓可发布包发到本地 Verdaccio → 写 `.npmrc` → `pnpm install`。命令、可发布包名单、故障表在 [innate-fe-cli](../innate-fe-cli/SKILL.md)。

```bash
pnpm ui:sync            # 同版本跳过发布,写 .npmrc,按已有版本安装
pnpm ui:sync:bump       # 基础仓源码改过后:patch 升版本再发再装
pnpm ui:sync -- --dry-run
```

给某个 app / package 加依赖:

1. 在**那个包**的 `package.json` 写 semver(读基础仓对应包的 `version`,用 caret)。不要 `workspace:`、`file:`、`link:`。

```json
"dependencies": { "@innate/ui": "^0.1.2" }
```

2. 仓库根跑 `pnpm ui:sync`。`.npmrc` 由它写入并应提交:

```
@innate:registry=http://127.0.0.1:4873/
```

当前能装的只有基础仓里 `private !== true` 的包:`@innate/ui`、`@innate/web-domain`。`tailwindcss` 与 `@tailwindcss/vite` 是公网 devDependency,正常 `pnpm add`,不要走这条私有源。

基础仓改完源码若本仓代码没变,是同版本被跳过,用 `pnpm ui:sync:bump`,并确认消费方 range 盖得住新版本。

## 路由

| 任务 | 去哪里 |
| --- | --- |
| 加/升级 `@innate/*`、404、版本不更新 | 本文件「前端依赖」;[innate-fe-cli](../innate-fe-cli/SKILL.md) |
| 新增/更新 primitive、采纳主题 | 基础仓 `innate-fe`,fe-ui 技能,改完回本仓 `pnpm ui:sync:bump` |
| 页面、功能、L2 组合件 | 本仓 `apps/*`、`packages/*`,只消费 `@innate/ui` 单入口导出 |
| 视觉规则、壳 chrome、产品 token | [STYLEGUIDE.md](STYLEGUIDE.md);token 与壳在 `packages/theme` |
| 设计原则完整背景 | `docs/README.md`(总纲)。`docs/original/innate-dogic/architecture/style-guide.md` 是过时草案,不执行 |
| orca ↔ innate-fe 对齐结论 | `docs/build-path/1-monorepo-init/style-guide-alignment.md` |

## 执法

门禁走双轨:

- **已有机器执法**:`packages/theme` 的 vitest(`pnpm --filter @innate-desktop/theme test`)校验 token 分层顺序、产品 token 明暗成对、亮色共享 token 快照、暗色 4 处差异、无 `prefers-color-scheme`、壳 chrome 层不写字面量、壳 chrome 尺寸与 orca 一致。仓库级 `pnpm verify` 覆盖 typecheck + test。
- **规划中**:在 oxlint 加 design-system 规则(参照 orca 的 `lint:design-system`),禁止产品代码出现硬编码色值与深引内部路径。
