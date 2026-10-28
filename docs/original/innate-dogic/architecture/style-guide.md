# Style Guide（参考 orca）

> 版本：v3.0 草案 · 2026-10-27。innate-fe 全部 UI 的视觉与交互规范。
> token 语义来源：`references/orca/src/renderer/src/assets/main.css`（只读参考）；
> 取舍依据：`docs/architecture/orca-module-review.md`（canonical，仍有效）。

## 1. 原则（继承 orca）

1. **token 唯一来源**：全部颜色/字号/间距来自 `frameworks/innate-fe/src/tokens/tokens.css` 的 CSS 自定义属性；任何组件不写死 hex/字号/间距。
2. **surface/foreground 成对定义**：每个面与其文字色成对出现（如 `--surface-panel` + `--fg-panel`），禁止跨对混搭。
3. **单色安静铬面**：壳与面板默认无彩色；**颜色只给状态**（选中、错误、警告、git 增删）。品牌色只允许出现在主按钮、链接与焦点环。
4. **sidebar 家族独立**：`--sidebar-*` 一族自成体系，不与 content 面混用。
5. **明暗自适应**：明暗两套 token，跟随 `prefers-color-scheme`；换主题不改组件代码。
6. **壳只做组合**：`TitlebarStrip + Sidebar + ContentArea` 三段；页面自包含、可摘除，删除一个页面不破坏壳。

## 2. token 家族（v1 面）

```css
/* 面与文字（成对） */
--surface-base / --fg-base            /* 窗口底 */
--surface-panel / --fg-panel          /* 卡片、弹层 */
--surface-input / --fg-input          /* 输入面 */
--sidebar / --sidebar-fg              /* 独立家族 */
/* 状态色（唯一允许的彩色） */
--state-selected / --fg-selected      /* 选中 */
--state-error / --fg-error            /* 错误、拒绝 */
--state-warning / --fg-warning        /* 超时、降级 */
--git-added / --git-removed           /* diff */
/* 品牌与焦点 */
--accent / --accent-fg / --focus-ring
/* 边界与弱化 */
--border / --fg-muted
```

明暗两组值各定义一遍（`:root` + `@media (prefers-color-scheme: light)` 或根类切换，与现有 desktop 主题机制对齐后定稿）。

## 3. 字体与字阶

- 字栈：`"Geist", "Segoe UI", "Microsoft YaHei", system-ui, sans-serif`（Geist 本体暂不打包，回退栈先保证 Windows 中文渲染；打包决策放 P1 验收后）。
- 等宽：`"Geist Mono", Consolas, monospace`（哈希、路径、代码）。
- 字阶固定四档：**10 / 11 / 12 / 13px**（10=辅助与哈希、11=元信息、12=正文小、13=正文与控件）；标题用 13px + 加粗，不放大字号。
- 行高 1.5；控件高度 28/32px 两档。

## 4. 布局规范

```text
┌─ TitlebarStrip：品牌 + 模式 pill（simple/dev）+ 全局状态 ─────────────┐
├─ Sidebar ────────┬─ ContentArea ─────────────────────────────────────┤
│ 导航（目的/画布/  │  页面自包含；Document 标签与 Panel 沿用现有         │
│ 插件/技能/系统）  │  Surface 模型；画布是页面不是弹窗                    │
│ 底部：状态 + 网关  │                                                    │
└──────────────────┴────────────────────────────────────────────────────┘
```

- Sidebar 宽 168–200px；底部状态显示 AgentRuntime id 与模型网关健康（沿用原型「系统」页信息面）。
- 内容边距 18/22px；卡片圆角 12px；控件圆角 8–10px。

## 5. 组件原语规范（innate-fe/ui）

| 原语 | 规范要点 |
| --- | --- |
| `PurposeBar` | 一行输入 + 主按钮；placeholder 写「说出你的目的」；运行中态、结果/跳过原因都落在输入框下方同一状态行 |
| `WidgetCard` | 340px 高基线、可关（✕）；头=标题·来源应用；元信息行=日期·目的；体=sandbox iframe 白底（外部内容隔离） |
| `ApprovalModal` | 文案三要素缺一不可：**哪个轻应用、为哪个目的、要什么权限**；权限用人话描述（来自 capabilities 注册表）；拒绝与允许并排，允许为主按钮 |
| `PluginCard` | 名称·版本 / 一句话 purpose / 关键词与权限 tag / 内容寻址哈希（等宽 10px，截断展示） |
| `PageDefinition` | `{ id, title, when?: (mode)=>bool }`；注册进 Sidebar；simple/dev 门控沿用 `pages.ts` 注册表模式 |

交互红线：审批永不自动通过（selfcheck 等无人值守场景除外，且必须在代码里显式声明 auto-approve 路径）；错误必须可达（不允许静默 skip）；外部链接一律外跳系统浏览器。

## 6. 工程纪律

1. 新 UI 只取 token；code review 一票否决项：硬编码颜色/字号。
2. 页面与组件从 `innate-fe` 单入口导入，不深引内部路径（publicEntrypoints 约束）。
3. 视觉验收 = 真实截图 + DOM 断言，进 `smoke:desktop`（明暗各一张）。
4. 组件无业务 IPC：数据全部由 props/契约传入；组件包不含 `window.innate` 直调。

## 7. 与现状的衔接

desktop 现有 renderer（React）在 P1 换 token 与壳布局，页面逻辑不动；`@dogic/syntax-highlighting` 的明暗主题切到本 token 家族（保持包独立，token 只做注入）。
