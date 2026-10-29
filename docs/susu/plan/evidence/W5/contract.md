# W5.1 browser provider 与安全策略证据

日期：2026-10-29

## 任务目标

定义 browser provider 与安全策略：协议白名单（http/https）、独立持久分区、
`network:navigate` capability 声明（Q3 消费）、非法 descriptor 拒绝；
安全默认值与公开接口在实现前固定。

## 交付范围

- 新包 `innate-dogic/plugins/browser`（`@dogic/plugin-browser`）：
  - `src/shared/index.ts`：browser 契约——
    - `BROWSER_PROVIDER_ID = 'browser'`（与 terminal/harness 不同 providerId）；
    - `BROWSER_PARTITION = 'persist:innate-browser'`（独立持久分区）；
    - `BROWSER_CAPABILITY = 'network:navigate'`（唯一允许的 capability）；
    - `ALLOWED_BROWSER_PROTOCOLS = ['http:', 'https:']`（协议白名单）；
    - `parseBrowserDescriptor`：复用 core `parseSurfaceDescriptor` 通用白名单
      （kind/capability 全集）后按 browser 语义收紧——providerId 必须是
      browser、kind 必须是 webcontents、capability 只能是 network:navigate
      （browser 不得声明 process:execute 等）；
    - `parseBrowserUrl`：必须是带协议的完整地址，协议命中 http/https，
      不允许内嵌凭据（`user:pass@` 拒绝），返回规范化 URL；
    - `BrowserProvider` 最小接口：open/navigate/back/forward/reload/
      activate/deactivate/close（输入一律 unknown，策略层解析）。
  - `src/main/index.ts`：`BrowserProvider` 策略层实现——会话/历史状态机
    （每次导航含历史目标一律再过白名单）、activate/deactivate 只切换可见态
    不销毁会话、close 只回收本 Surface、并发上限 8、dispose 统一回收；
    实际页面加载由宿主注入的 `BrowserPageLoader` 承担（W5.2 用
    WebContentsView 接线，本任务不接线桌面）。
- `pnpm-lock.yaml`：workspace 新增包链接。

## 契约要点

- `network:navigate` 只表示导航，不自动授予下载、摄像头、麦克风、通知、
  剪贴板或任意 JS 执行（权限策略在 W5.4，下载在 W5.5）。
- 协议白名单仅 http/https；file/data/javascript/chrome/about/blob/ws 等
  默认拒绝，后续开放须另立评审。
- browser 与 Harness/console 使用不同 providerId 与持久 partition，
  认证 URL 不能转普通书签（凭据内嵌 URL 直接拒绝，不进入历史）。
- renderer 不提交 webContents、cookie 或 session 对象；URL 一律经
  `parseBrowserUrl` 白名单与凭据检查。
- Q3 只消费受控 navigate，不开放页面脚本注入。

## 验证结果

- `pnpm --filter @dogic/plugin-browser typecheck` / `build`：通过。
- `pnpm --filter @dogic/plugin-browser test`：**26/26** 通过
  （shared 15：协议白名单 http/https 接受与规范化、file/data/javascript/
  chrome/about/blob/ws 拒绝、无协议/无法解析拒绝、内嵌凭据拒绝、
  descriptor 只复制安全字段、capability 缺省声明与非法 capability 拒绝、
  伪造 providerId/kind 拒绝、非法 id/title 拒绝；
  main 11：open/重复/上限、navigate 白名单与历史记录、非法协议不污染历史、
  back/forward 状态机与 forward 截断、reload、activate/deactivate 不销毁、
  close 隔离、未知会话全拒、非法输入策略层拒绝、loader 未受理不入历史、
  dispose 统一回收）。
- 全量门禁 `pnpm verify`：退出码 0 全绿（含新包递归 typecheck/test）。

## 安全结论

- 协议白名单与凭据检查在策略层强制执行，navigate/back/forward/reload 的
  每个目标 URL（含历史目标）都重新过校验，伪造历史不绕过协议约束。
- browser capability 白名单在解析层拒绝 process:execute 等其他能力，
  browser Surface 无法越权获得终端执行面。
- 无认证 URL/token 进入日志、测试夹具或证据（测试只用 example.com 等
  占位地址，无任何真实凭据）。
