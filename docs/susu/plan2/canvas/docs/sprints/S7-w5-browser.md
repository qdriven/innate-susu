# S7 · W5 独立 Browser Surface（源编号 W5.1–W5.7）

## T7.1 W5.1 browser provider 与安全策略定义
- **状态**：todo
- **做什么**：plugins/browser shared/main 定义 provider 契约；协议白名单（http/https）、独立分区、capability 声明（network:navigate 预留）。
- **功能**：契约先于实现。
- **如何验证**：协议白名单、provider 隔离、非法 descriptor/capability 单测。
- **预估 / 依赖**：0.5 天 / 需 S6

## T7.2 W5.2 独立 WebContents 生命周期
- **状态**：todo
- **做什么**：browser main provider 接 W1c provider registry；多浏览器标签；切换不重载；关闭回收；崩溃隔离。
- **功能**：browser 作为中栏一等容器。
- **如何验证**：多标签/切换/关闭/加载失败/崩溃隔离/窗口关闭测试。
- **预估 / 依赖**：1 天 / T7.1

## T7.3 W5.3 导航与外链规则
- **状态**：todo
- **做什么**：地址栏+back/forward/reload/stop+进度；非法 URL 显式拒绝；window.open/外链一律系统浏览器；新窗口默认拒；返回历史。
- **功能**：受控导航面。
- **如何验证**：普通 URL、非法协议、重定向、window.open、错误页、历史测试。
- **预估 / 依赖**：0.5 天 / T7.2

## T7.4 W5.4 默认拒绝敏感权限
- **状态**：todo
- **做什么**：setPermissionRequestHandler 全 deny；拒绝日志脱敏落盘；其他 Surface 不受影响。
- **功能**：权限默认拒。
- **如何验证**：测试页逐类权限请求均拒。
- **预估 / 依赖**：0.25 天 / T7.3

## T7.5 W5.5 受控下载
- **状态**：todo
- **做什么**：will-download → 系统保存对话框；用户取消/完成/失败/重复文件名/恶意文件名路径。
- **功能**：不静默落盘。
- **如何验证**：下载各路径测试通过。
- **预估 / 依赖**：0.5 天 / T7.4

## T7.6 W5.6 安全浏览布局状态
- **状态**：todo
- **做什么**：browser snapshot 持久化与恢复；敏感 URL 不入快照；版本不兼容回退。
- **功能**：重载恢复浏览布局。
- **如何验证**：普通恢复、敏感 URL、版本不兼容、失效网站、隐私扫描。
- **预估 / 依赖**：0.5 天 / T7.5

## T7.7 W5.7 端到端与便携验收
- **状态**：todo
- **做什么**：smoke-browser/desktop；每条规则有自动或真实桌面结果；W5.1–W5.6 验收汇总。
- **功能**：W5 出口。
- **如何验证**：全部通过，无 executeJavaScript 进访客 view。
- **预估 / 依赖**：0.25 天 / T7.6
