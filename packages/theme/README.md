# @innate-desktop/theme

innate-desktop 的**产品 token 层 + 壳 chrome 层**，建立在 `@innate/ui`（基础仓 innate-fe）之上。

## 分层

| 层 | 位置 | 归属 | 允许字面量 |
| --- | --- | --- | --- |
| primitive 与主题机制 | `@innate/ui`（`packages/ui/src/tokens.css` + `themes/`） | 基础仓 | 是（唯一事实源） |
| 产品 token 层 | `src/tokens.css` | 本仓 | 是（本仓唯一允许出现字面量的地方） |
| 壳 chrome 层 | `src/shell.css` | 本仓 | 否（只引用 token） |

壳 chrome 层只放**不是按钮**的 chrome：titlebar 布局、窗口控件、红绿灯占位、滚动条。
**按钮不在这一层**——顶栏等壳内按钮按 plan W1a.3 取 `@innate/ui` 的 Button（toolbar 用
`outline`、图标按钮用 `ghost`），不拷 orca 的裸 class。

明暗机制统一为 `.dark` class（`@innate/ui` 的 `@custom-variant dark`）；主题变体统一为
`:root[data-theme="…"]`。**不要**写 `prefers-color-scheme` 媒体查询。

优先级：`[data-theme]` 变体选择器（特异性更高）> 本仓产品层 `:root`/`.dark` > `@innate/ui` 基础 `:root`。

## 消费方式

```css
/* app 的 src/globals.css */
@import "tailwindcss";
@import "@innate-desktop/theme/index.css";
@source "./";
@source "../../../node_modules/@innate/ui/src";
```

`@source` 必须写在所有 `@import` 之后。CSS 里不要 `@import "@innate/ui/globals.css"`
——那是基础仓内部入口，消费方只引 `@innate/ui/tokens.css`。

## 主题变体

`default`（`DEFAULT_THEME_VARIANT`）没有 `[data-theme="default"]` 规则。
`ThemeProvider` 仍写入这个属性，因此实际用的是产品层 `:root` / `.dark`，也就是
基础仓 oklch Neutral，不是变体 `shadcn-neutral`。亮色共享 token 与基础 `:root`
同值；暗色固定 4 处（`accent` `#404040`、`border` / `sidebar-border` 为
`rgb(255 255 255 / 0.07)`、`sidebar-ring` `#525252`）。

变体只覆盖它自己声明的变量。`shadcn-*` 不声明 sidebar / chart / font。
`linear` / `notion` / `webshell` 声明 sidebar（`linear` 还声明 chart）。
`marshmallow` / `art-deco` 声明 `--font-sans`，会盖过产品层的 Geist。

逐 token 差异见 [style-guide-alignment.md](../../docs/build-path/1-monorepo-init/style-guide-alignment.md)。

## 门禁

`pnpm --filter @innate-desktop/theme test` 校验：

- `@innate/ui/tokens.css` 是最早一个 import（产品层靠源码顺序覆盖它）；
- 入口先引 token 层再引壳 chrome 层；
- 每个产品扩展 token 在 `:root` 与 `.dark` 中成对声明；
- 共享语义 token 的亮色值与快照一致；
- 全包不出现 `prefers-color-scheme`；
- 壳 chrome 层不写死颜色值，尺寸与 orca 一致；
- 壳 chrome 层不复制 orca 的按钮类（`.titlebar-icon-button` / `.sidebar-toggle`）。
