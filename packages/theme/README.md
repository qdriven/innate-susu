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

默认变体是 `default`（`DEFAULT_THEME_VARIANT`）——走 `@innate/ui` 的基础 `:root`
（shadcn Neutral）。它的中性色与 orca **逐 token 相等**：亮色全等，暗色只有 4 处
刻意差异（`accent` 更亮一档、`border` / `sidebar-border` 透明度 7% 而非 10%、
`sidebar-ring` 更收敛）。产品层把这套值冻结在仓里，防止基础仓改 Neutral 时桌面端
观感漂移。

`shadcn-zinc` / `shadcn-slate` / `linear` / `notion` 等是基础仓的**变体**，中性色
带 240 色相的淡蓝偏移，与 orca 的纯中性灰**不等值**，因此不是默认值。用户在
`ThemeSelector` 里显式选某个变体时，由基础仓接管中性色（`[data-theme]` 选择器
特异性更高）。

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
