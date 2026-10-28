# S5 · W5 browser Surface

> 详细任务卡：docs/susu/plan1/phases/W5-browser.md。目标：受控内置浏览器；不在 DSH 里再嵌浏览器。

## T5.1 browser Surface
- **状态**：todo
- **做什么**：新建 main/browser/BrowserHost：WebContentsView + 独立持久分区 persist:browser-surface；setPermissionRequestHandler 全部 deny 并脱敏落日志；window.open 一律 shell.openExternal 外跳；will-download 系统保存对话框；注册为标签槽 Surface，可多标签。
- **功能**：独立分区、权限默认拒、外链外跳、下载可控。
- **如何验证**：公开网页加载截图；geolocation 触发被拒且日志脱敏；window.open 跳系统浏览器；下载弹保存框。
- **预估 / 依赖**：1 天 / 需 S4

## T5.2 最小地址栏 UI
- **状态**：todo
- **做什么**：地址栏 + back/forward/reload/stop + 加载进度；UI 只用 @innate/ui 原语与 token；不提供任意 JS 执行入口，devtools 默认关；不做收藏/历史。
- **功能**：用户可控的最小浏览面。
- **如何验证**：导航/回退/刷新 DOM 断言；非 http(s) 输入被拒并提示；devtools 不可达负路径。
- **预估 / 依赖**：0.5 天 / 需 S4

## T5.3 network:navigate 能力预留
- **状态**：todo
- **做什么**：main 登记 network:navigate 能力声明与白名单域配置占位；browser Surface 暴露受控 navigate/capture/title-url 快照 API；不开放 executeJavaScript。
- **功能**：Q3 浏览类任务的受控执行面。
- **如何验证**：navigate + capture 隔离页面工作且截图入证据；renderer 直连越权不可达。
- **预估 / 依赖**：0.5 天 / 需 S4
