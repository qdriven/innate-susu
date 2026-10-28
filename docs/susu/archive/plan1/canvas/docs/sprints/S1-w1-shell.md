# S1 · W1 壳：三栏 + token + 中栏多标签槽

> 详细任务卡：docs/susu/plan1/phases/W1-shell.md。目标：renderer 换皮不换逻辑；不改 magpie/DSH 启动逻辑，不写 terminal。

## T1.1 token 与 Tailwind 接入
- **状态**：todo
- **做什么**：desktop renderer 加 tailwindcss 与 @tailwindcss/vite、依赖 @innate/ui；renderer vite 配置挂插件；新建 globals.css（@import tailwindcss + @innate/ui/tokens.css + 两条 @source）；明暗走 .dark class；修订 style-guide 的 prefers-color-scheme 旧说法。
- **功能**：壳层接入 @innate/ui token 体系，明暗可切。
- **如何验证**：明暗截图各一张；壳层文件无硬编码 hex；构建产物含编译后 Tailwind。
- **预估 / 依赖**：1 天 / 需 S0

## T1.2 三段壳布局收口
- **状态**：todo
- **做什么**：新建 renderer shell/（TitlebarStrip、Sidebar、ContentArea），L2 组合件只消费 @innate/ui 单入口；拆 367 行 App.tsx，Titlebar/ModeGate 并入 shell，内联页拆 pages/；pages.ts 注册表与门控语义不动。
- **功能**：orca 式三段壳；页面自包含可摘除。
- **如何验证**：smoke:desktop 通过（导航、模式 pill、窗口控制 DOM 断言）；simple/dev 门控与基线一致；空注册表负路径单测。
- **预估 / 依赖**：1–2 天 / 需 S0

## T1.3 中栏多标签 Surface 槽
- **状态**：todo
- **做什么**：surface-host.ts 从单 view attach 扩为多 Surface 注册 + 单 attach 切换（detach 不销毁不重载）；中栏标签条列 harness 与 magpie-console；IPC 加 surface:list 与 surface:activate 进类型化契约。
- **功能**：中栏成为可摘除客人的 Surface 槽。
- **如何验证**：CDP 断言切换后 harness URL 未变、未 reload；resize 后 bounds 正确；无 dsh 环境壳仍启动。
- **预估 / 依赖**：1 天 / 需 S0

## T1.4 simple overlay 回归
- **状态**：todo
- **做什么**：全部改动复跑 verify:overlay 与 simple 模式手测（首启选模式、simple 首页、dev 页面不可见）。
- **功能**：行为不回退红线复验。
- **如何验证**：overlay 7/7 断言输出；simple 模式截图入证据。
- **预估 / 依赖**：0.25 天 / 需 S0
