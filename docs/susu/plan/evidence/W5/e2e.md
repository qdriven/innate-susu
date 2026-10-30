# W5.7 端到端与便携验收证据

日期：2026-10-30

## 任务目标

W5 收口。用本地受控 HTTP 测试站验证导航、外链、权限、下载和恢复，避免依赖公网不稳定页面；与 Harness、console、terminal、文档交替切换，验证 bounds 和生命周期；运行便携目录，检查独立 partition、无孤儿 view/进程和敏感信息；全量门禁、W4 回归与证据归档；无 executeJavaScript 进访客 view（红线断言）。完成标准（W5-browser.md W5.7）：全部通过 + 红线断言。

## 交付范围

- `tools/smoke-browser.ts`（新增）：CDP 驱动的 browser 端到端冒烟。拉起真实 Electron 宿主（dev 构建 + 独立 `smoke-user-data-browser` user-data + `--remote-debugging-port`），经本地受控 HTTP 测试站（`/evil` `/open` `/perm` `/dl` 路由，绑定 `127.0.0.1`，不依赖公网）驱动浏览器 Surface 全链路；23 条断言全过。
- `apps/desktop/src/renderer/src/BrowserPage.tsx`（新增）：渲染壳浏览器页——此前 browser Surface 的 provider 与面板（W5.1–W5.6）已建，但渲染壳无入口页（`browserSurface()` 从未被调用、PAGES 无 browser 项、`surfacePageId` 对 browser 返回 undefined），无法打开浏览器 Surface。本页镜像 `TerminalPage`：工具栏「新建浏览器」按序派生 `browser-N` id，`SurfaceSlot` 渲染 `BrowserPanel`。
- `apps/desktop/src/renderer/src/pages.ts`：dev 导航新增 `browser` 页（图标 ◍），dev 页数 7 → 8。
- `apps/desktop/src/renderer/src/surfaces/catalog.ts`：`surfacePageId` 增加 browser → `dev` 模式返回 `browser` 页。
- `apps/desktop/src/renderer/src/App.tsx`：渲染 `BrowserPage`（传入 tabs/providers/onSwitchSurface/onCloseSurface）。
- `tools/smoke-desktop.ts`：dev 导航计数 7 → 8，断言含「浏览器」。
- `apps/desktop/src/renderer/src/pages.test.ts` / `pages.slot.test.ts`：W1a/W1b 基线升级为 8 dev 页（含 browser，基线只增不减）。

## 契约要点

- 红线：渲染壳 `window.innate` 不暴露 `executeJavaScript` 通道；通道集合无脚本执行入口（`executeJavaScript`/`executeScript`/`injectScript`/`webContents.execute*`）——访客视图（browser WebContentsView）不可被注入执行。全程不经任何方式向访客视图注入脚本（`evalTarget` 仅读取页面标题/正文用于断言，非注入）。
- 红线判定不按 `/exec|script/` 匹配通道名：`processExecute` 是 W4 受 profile 门控的窄通道（指定命令、非通用 shell），非红线；红线特指访客视图脚本执行。
- 导航守卫：页面内导航（`will-frame-navigate`）与重定向（`will-redirect`）逐跳校验，内嵌凭据地址 `preventDefault` + 安全文案「导航被安全策略拒绝」，凭据不回显地址栏。
- 外链：`window.open` 的 http/https 交系统浏览器（`shell.openExternal`），应用内不新建 webContents；非 http/https 拒绝。
- 权限：`persist:innate-browser` 分区 session 全拒，只记 origin+类型，面板脱敏文案。
- 受控下载：`will-download` 经系统保存对话框确认路径（不写默认目录、无隐式路径）；事件脱敏（文件名/origin/进度/终态）；关闭 Surface 取消在途下载。
- 布局恢复：快照只含普通 URL 与标签 id（敏感 URL 拒绝入快照）；挂载消费恢复 URL 用户可见地重新导航；版本不兼容安全回退。
- 生命周期：标签切换不销毁会话（detach），close 只销毁本 Surface 视图与监听器；崩溃/无响应/加载失败只影响当前 browser Surface。
- 便携：浏览器视图为独立 CDP 目标（独立 partition），attach 状态存活；无孤儿 view/进程（关闭/退出统一回收）。

## 验证结果

```
pnpm exec tsx tools/smoke-browser.ts:            通过 23 / 23  EXIT=0
pnpm exec tsx tools/smoke-desktop.ts:            OK（W4 回归）EXIT=0
pnpm --filter @dogic/plugin-browser test:        Tests 76 passed (76) EXIT=0
pnpm --filter @dogic/apps/desktop test:          Tests 100 passed (100) EXIT=0
pnpm --filter @dogic/plugins/terminal test:      Tests 44 passed (44)（W4 回归）EXIT=0
pnpm exec tsc -p tools/tsconfig.json --noEmit:   EXIT=0
pnpm verify（全仓 typecheck + test）:            EXIT=0
```

### smoke-browser 23 条断言

红线：
1. 渲染壳 `window.innate` 无 `executeJavaScript` 通道
2. 渲染壳通道集合无脚本执行入口（访客视图不可被注入执行）

导航与面板：
3. 浏览器页可打开（工具栏就绪）
4. 新建浏览器：地址栏面板挂载
5. 浏览器 WebContentsView 作为独立 CDP 目标出现（独立分区）
6. 导航：地址栏提交 → 本地站点加载完成
7. 导航：访客视图真实内容加载（本地站点，非公网）

布局恢复（W5.6）：
8. 布局恢复：挂载消费快照 → 用户可见重导航（重新加载本地站点）
9. 布局恢复：普通 URL 持久化、不含敏感字段

导航守卫（W5.3）：
10. 页面内导航到内嵌凭据地址被拦截（安全文案）
11. 凭据地址不回显到地址栏

外链（W5.3）：
12. window.open 交系统浏览器，应用内不新建 WebContents
13. opener 页留在应用内（外链本身交系统浏览器）

权限（W5.4）：
14. 页面权限请求全部拒绝，面板呈现脱敏拒绝文案

受控下载（W5.5）：
15. 下载事件到达面板（状态行）

标签生命周期（W5.2）：
16. 多浏览器标签：两个浏览器标签共存
17. 标签切换：detach 不销毁会话（切换后仍可见）
18. 关闭隔离：关闭后标签移除、另一浏览器保留

bounds（W1c）：
19. 浏览器 Surface 视图区域有正尺寸（{width:785,height:647}）

交替切换（生命周期隔离）：
20. 终端页加载工作区根（与浏览器并存于统一中栏槽）
21. 终端 PTY 面板就绪
22. 切回浏览器后 Surface 会话保留（未销毁）

便携检查：
23. 浏览器视图存活（独立 CDP 目标，attach 状态）

## 截图与产物

`docs/susu/plan/evidence/W5/e2e/`：
- `browser-panel.png`（新建浏览器后地址栏面板）
- `browser-nav.png`（导航本地站点加载）
- `browser-restore.png`（布局恢复重导航）
- `browser-permission.png`（权限脱敏拒绝文案）
- `browser-lifecycle.png`（多浏览器标签生命周期）
- `browser-bounds.json`（视图区域尺寸 {width:785,height:647}）
- `smoke-browser.json`（{passed:23,failed:0}）

## 实现要点（smoke 驱动技术）

- **React 受控输入**：地址栏 `<input>` 为 React 受控组件，CDP `Input.dispatchKeyEvent` char 事件不驱动 `onChange`。改用原生 `HTMLInputElement.prototype.value` setter + 派发 `input` 事件驱动 React 状态，再点击「前往」提交表单（`typeAddress` 辅助函数）。
- **CDP 目标检测**：浏览器 WebContentsView 作为独立 page target 出现在 `/json`；初始为空 URL/`about:blank`，导航后为本地站点 URL。
- **陈旧快照清理**：每次运行前清 `innate.surface-tabs:center` / `innate.browser-layout:center` localStorage 并重载，避免上次运行残留标签（如终端 1）抢占激活项导致浏览器面板不挂载。
- **恢复断言**：恢复提示在导航成功后即清除，故判据为「本地站点目标加载 + 地址栏呈现恢复 URL」，不依赖面板文案竞态。

## 敏感信息

本地测试站为 `127.0.0.1` 回环地址，端口每次随机；无认证 URL/token/key 进入日志、快照、测试夹具或证据截图。`/evil` 路由构造的内嵌凭据地址仅用于守卫拦截验证，凭据不落日志、不回显地址栏。
