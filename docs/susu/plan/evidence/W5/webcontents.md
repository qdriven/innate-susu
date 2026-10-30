# W5.2 独立 WebContents 生命周期证据

日期：2026-10-29

## 任务目标

多浏览器标签；切换不重载；关闭回收；崩溃隔离；挂 W1c registry。范围：main provider 实现（`@dogic/plugin-browser` 的 `BrowserSurfaceService` + electron 视图工厂 + SurfaceHost provider 钩子）。

## 交付范围

- `plugins/browser/src/main/index.ts`：会话服务（生命周期 + 历史 + 导航安全策略 + 事件上报 + 并发上限 + dispose 统一回收）
- `plugins/browser/src/main/electron-view.ts`：electron WebContentsView 工厂（独立持久分区、安全 webPreferences、窗口新开拒绝、事件中性上报）
- `plugins/browser/src/shared/index.ts`：契约扩展（`BrowserSessionState` 增字段、`BrowserSurfaceEvent` 事件联合）
- `apps/desktop/src/main/surface-host.ts`：provider 钩子（createView/deferredUrl/onViewAttached/onViewDetached/onViewClosed；多标签按 providerId 匹配）
- `apps/desktop/src/main/ipc.ts`：browser 窄通道（navigate/back/forward/reload/state）+ 事件广播
- renderer：`catalog.ts` + `providers/desktop.ts` 挂 W1c registry（地址栏与导航交互在 W5.3 挂上）
- `plugins/browser/scripts/spike-browser.cjs`：electron 直跑诊断脚本（W4.1 同款模式）

## 契约要点

- 独立持久分区 `persist:innate-browser`（与 Harness/console 默认 session 隔离）；`contextIsolation: true / nodeIntegration: false / sandbox: true`。
- 每次导航（含历史目标、重定向最终地址）一律过协议白名单（http/https）与凭据检查（`file:`、`javascript:`、带凭据 URL 拒绝）。
- 标签切换只 detach/attach（SurfaceHost hide/show），不销毁会话、不重载；`deactivate` 不杀会话，`close` 才终止。
- 视图销毁由 SurfaceHost.close 完成，随后经 `onViewClosed` 回调清理服务会话（订阅移除 + 会话移除）；`service.close` 为直接路径。
- 页面崩溃（`render-process-gone` reason=crashed）、无响应、加载失败只影响当前会话，事件经 `innate:browser-event` 上报 renderer 呈现重试/关闭；会话终态后忽略后续事件。
- 禁止 executeJavaScript：视图抽象不提供任何页面脚本执行通道（含类型层断言）。
- 并发会话上限 8；`dispose` 统一回收（应用退出/窗口关闭路径）。

## 验证结果

### 单元/集成测试

```
pnpm verify                     # EXIT=0
innate-dogic/plugins/browser test:   Test Files 2 passed (2)   Tests 34 passed (34)   （shared 15 + main 19）
innate-dogic/apps/desktop test:      Test Files 13 passed (13) Tests 87 passed (87)
```

覆盖：多标签共存、切换不重载、关闭只回收本会话、崩溃/失败隔离、加载失败保留重试入口、重定向到 file:// 拒绝（errorCode -2）、未知会话全拒、非法输入拒绝、dispose 统一回收、SurfaceHost provider 钩子（createView 挂载/抛错回滚、attached/detached/closed 通知）、窄通道转发、类型层无 executeJavaScript。

### electron 技术 spike（12/12 通过）

```bash
pnpm --filter @dogic/plugin-browser build
innate-dogic/apps/desktop/node_modules/electron/dist/electron.exe \
  innate-dogic/plugins/browser/scripts/spike-browser.cjs
```

本地 HTTP 测试站点 + 隐藏 BrowserWindow 真实链路：

| 步骤 | 结果 |
| --- | --- |
| provider 形态：browser/webcontents/deferredUrl | ✓ |
| resolve 恒就绪（deferredUrl 不要求 URL） | ✓ |
| 多标签：两个视图共存于同一 contentView | ✓ |
| navigate http 接受 | ✓ |
| 页面加载完成并记录最终地址 | ✓ http://127.0.0.1:53283/ |
| 切换不重载：视图对象复用、会话历史保留 | ✓ |
| 加载失败：failed 状态上报 | ✓ ERR_CONNECTION_REFUSED (-102) |
| 失败隔离：browser-1 不受影响 | ✓ |
| 关闭回收：会话移除、视图销毁 | ✓ |
| 关闭隔离：browser-1 会话与视图保留 | ✓ |
| file: 协议导航被拒 | ✓ browser 协议不受支持: file: |
| 窗口关闭统一回收：全部视图销毁 | ✓ |

原始输出：

```
[spike] ✓ provider 形态：browser/webcontents/deferredUrl
[spike] ✓ resolve 恒就绪（deferredUrl 不要求 URL）
[spike] ✓ 多标签：两个视图共存于同一 contentView
[spike] ✓ navigate http 接受
[spike] ✓ 页面加载完成并记录最终地址 — http://127.0.0.1:53283/
[spike] ✓ 切换不重载：视图对象复用、会话历史保留
[spike] ✓ 加载失败：failed 状态上报 — ERR_CONNECTION_REFUSED (-102) loading 'http://127.0.0.1:65065/'
[spike] ✓ 失败隔离：browser-1 不受影响
[spike] ✓ 关闭回收：会话移除、视图销毁
[spike] ✓ 关闭隔离：browser-1 会话与视图保留
[spike] ✓ file: 协议导航被拒 — browser 协议不受支持: file:
[spike] ✓ 窗口关闭统一回收：全部视图销毁
[spike] 12/12 通过
```

## 环境事实（spike 过程中确认）

- `webContents.close()` 销毁是**异步**的（约数百毫秒后 `isDestroyed()` 才为 true；销毁后 `view.webContents` 取值不再可用）。服务与 SurfaceHost 的 close/dispose 路径不依赖同步销毁标志，行为正确。
- electron 43：页面崩溃事件为 `render-process-gone`（`reason === 'crashed'`），webContents 无 `crashed` 事件。

## 安全结论

- 浏览器页面运行在独立持久分区 + 全禁用 Node 的 webPreferences 中，与主应用进程隔离。
- 无任何页面脚本执行通道（无 executeJavaScript；spike 与测试均不注入脚本）。
- 导航白名单 + 凭据检查在服务层强制执行；新窗口请求 http/https 交系统浏览器、其余一律 deny。
- 认证 URL、token、key 不进入日志/快照/测试夹具/证据（spike 仅访问本地 127.0.0.1 测试站点）。

## 遗留（后续任务）

- W5.3：地址栏页面与主导航拦截细化、重定向最终地址拦截、错误页呈现。
- W5.4：默认拒绝敏感权限（session permission handler）。
- W5.5：受控下载（系统保存对话框，不自动执行）。
- W5.7：端到端与便携验收（真实 E2E smoke）。
