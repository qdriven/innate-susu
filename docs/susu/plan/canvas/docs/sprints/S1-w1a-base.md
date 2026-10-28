# S1 · W1a UI 基座与 titlebar（源编号 W1a.0–W1a.3）

## T1.0 W1a.0 字体决策（决策门）
- **状态**：已完成
- **做什么**：二选一拍板：(a) innate-fe 的 --font-sans 由 Inter 改 Geist（orca STYLEGUIDE 要求，技能当前记录做法），改完 ui:sync --bump patch；(b) 技能替换表写「桌面例外、沿用 Inter」为正式决定。产品代码禁止另写 font-family。
- **功能**：字体有唯一事实源，W1a.2 才可开工。
- **如何验证**：决策记录入证据；选 (a) 则基础仓发版本仓消费成功。
- **证据**：`docs/susu/plan/evidence/W1a/README.md`
- **预估 / 依赖**：0.25 天 / 需 S0

## T1.1 W1a.1 固定页面与 Surface 行为基线
- **状态**：已完成
- **做什么**：为 simple/dev 页面集、默认页、模式切换、Harness 启动状态补回归断言；记录 Harness 与控制台 show/hide/bounds/close 现行为；加「URL 未变不 reload」「显式停止才 close」测试；保存窗口与 bounds 证据。
- **功能**：后续重构用同一组断言护栏。
- **如何验证**：测试在 W0 实现上通过。
- **证据**：`docs/susu/plan/evidence/W1a/README.md`
- **预估 / 依赖**：0.5 天 / T1.0

## T1.2 W1a.2 接入 Tailwind + token + ThemeProvider
- **状态**：已完成
- **做什么**：renderer 加 @innate/ui、tailwindcss、@tailwindcss/vite（app devDeps，只挂 renderer 配置）；globals.css 按已验证模式（两条 @import + 两条 @source，@source 在 import 后）；ThemeProvider 明暗只走 .dark class；旧 CSS 桥接到语义 token；禁深引内部路径、禁复制 primitive。
- **功能**：renderer 可消费 UI 基座，token 唯一来源。
- **如何验证**：明暗截图各一张；构建与 typecheck 过；代表页无裸样式；simple/dev 不变。
- **证据**：`docs/susu/plan/evidence/W1a/README.md`
- **预估 / 依赖**：0.5 天 / T1.1

## T1.3 W1a.3 只换窗口 titlebar，状态槽留空
- **状态**：已完成
- **做什么**：按 orca 窗口铬面重组顶栏（左品牌、中 titlebar-tabs 空槽、右窗口控制与右栏开关位，背景 --card 系）；控件按规范用 @innate/ui Button outline/ghost，不拷 orca 裸 class、不造 Toolbar 原语；右侧留空状态槽（W2 pill 挂点）；窗口拖拽行为保持。
- **功能**：titlebar 是唯一被替换的壳件。
- **如何验证**：DOM 断言三区+状态槽；窗口控制不回退；明暗视觉截图。
- **证据**：`docs/susu/plan/evidence/W1a/README.md`
- **预估 / 依赖**：0.5 天 / T1.2
