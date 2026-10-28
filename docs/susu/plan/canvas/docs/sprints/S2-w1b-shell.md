# S2 · W1b 壳组合（源编号 W1b.1）

## T2.1 W1b.1 Sidebar/ContentArea 抽取与 App 拆分
- **状态**：todo
- **做什么**：Sidebar 直接消费 @innate/ui 的 Sidebar primitive（不重写），承载导航注册与底部状态位；ContentArea 承载页面；右栏放可拆卸空容器（W3 填充）；App 只留组合与顶层状态；pages.ts 注册表扩展 slot/mode 元数据、id 与门控不变；simple 隐藏开发入口；组合只用 @innate/ui primitive 与语义 token。
- **功能**：三栏可运行，App 不再实现每块壳 UI。
- **如何验证**：导航/模式切换/窗口控制/状态轮询与旧行为一致；删一个可选页面注册壳仍启动（负路径）；W0 冒烟全绿。
- **预估 / 依赖**：1–2 天 / 需 S1
