# W5.3 导航与外链规则证据

日期：2026-10-30

## 任务目标

地址栏 + back/forward/reload/stop + 加载进度；非法 URL 显式拒；页面内导航与重定向逐跳守卫拦截；window.open/外链交系统浏览器；返回历史；错误页呈现（凭据净化）。范围：renderer 地址栏面板 + 导航守卫（main 侧 will-frame-navigate/will-redirect 拦截 + 错误消息净化）。

## 交付范围

- `plugins/browser/src/shared/index.ts`：契约扩展（`BrowserProvider` 增 `stop`；新增 `BrowserApi` 窄通道与 `sanitizeBrowserDisplayText` 错误页净化）
- `plugins/browser/src/main/index.ts`：`stop` 实现、导航守卫经工厂第二参数注入（`guardNavigation`）、navigated 事件重定向最终地址优先、失败消息净化
- `plugins/browser/src/main/electron-view.ts`：`will-frame-navigate`/`will-redirect` 主框架逐跳守卫（Electron 43：`will-navigate` 已废弃）、守卫拒绝固定安全文案（errorCode -3）、`webContents.stop()`
- `plugins/browser/src/renderer/BrowserPanel.tsx` + `index.ts`：地址栏面板（前进/后退/刷新/停止、加载进度、崩溃/失败重试/关闭、视图生命周期自管理）
- `plugins/browser/package.json`：`./renderer` exports + `@types/react`
- `apps/desktop`：`providers/browser.tsx`（provider 挂载）、`providers/desktop.ts`（浏览器面板替换通用 webcontents）、`ipc.ts`/`preload/index.ts`/`api.ts`（browser 窄通道）、`styles.css`（面板样式）、`vitest.config.ts`（browser 别名）
- `plugins/browser/scripts/spike-browser.cjs`：spike 扩展（守卫/重定向/window.open 步骤）
- `plugins/terminal/src/main/index.ts`：超时/取消终止的进程退出码归一（见「验证过程发现」）

## 契约要点

- 导航守卫在**视图层**拦截：页面内导航（`will-frame-navigate`）与重定向（`will-redirect`）的主框架目标逐跳过协议白名单与凭据检查，不合法则 `preventDefault` + 固定安全文案（errorCode -3，不携带被拒 URL）；服务层 `navigated` 事件对最终地址兜底复验（errorCode -2）。
- 地址栏提交一律经 main 策略层 `parseBrowserUrl` 校验；`http/https` 白名单，内嵌凭据拒绝。
- window.open：http/https 交系统浏览器（用户明确选择的外链），其余协议 deny。
- 错误页文本经 `sanitizeBrowserDisplayText` 净化（剥离 `//user:pass@` 内嵌凭据），认证信息不进入状态与事件。
- 重定向最终地址以 `navigated` 事件为准（did-navigate 先于 loadURL resolve 到达，goto 不得用初始 URL 覆盖）。
- 标签切换只 detach/attach 不销毁；崩溃/失败/无响应只影响当前标签，提供重试/关闭。

## 验证结果

### 单元/集成测试

```
pnpm verify                     # EXIT=0
innate-dogic/plugins/browser test:   Test Files 2 passed (2)   Tests 43 passed (43)   （shared 18 + main 25）
innate-dogic/apps/desktop test:      Test Files 14 passed (14) Tests 95 passed (95)  （含新增 BrowserPanel 渲染测试 8）
```

覆盖：守卫工厂注入（白名单/凭据/格式拒绝、http/https 放行）、守卫拒绝不产生 loadURL、失败消息净化、-3 事件如实上报、stop 通道、地址栏提交/非法拒/后退前进刷新停止、loading 进度、crashed/failed 重试与关闭标签、事件只作用于本会话、重定向最终地址优先（回归）。

### electron 技术 spike（20/20 通过）

```bash
pnpm --filter @dogic/plugin-browser build
innate-dogic/apps/desktop/node_modules/electron/dist/electron.exe \
  innate-dogic/plugins/browser/scripts/spike-browser.cjs
```

本地 HTTP 测试站点（按路由返回不同页面）+ 隐藏 BrowserWindow 真实链路：

| 步骤 | 结果 |
| --- | --- |
| provider 形态 / resolve 恒就绪 | ✓ |
| 多标签共存 / navigate http / 加载完成 / 切换不重载 | ✓ |
| 加载失败 + 失败隔离 / 关闭回收 + 关闭隔离 | ✓ |
| file: 协议导航被拒（策略层） | ✓ browser 协议不受支持: file: |
| 页面内导航守卫：内嵌凭据目标被拦截（errorCode -3） | ✓ |
| 页面内导航守卫：地址不污染 | ✓ 仍为原页面地址 |
| 重定向守卫：内嵌凭据目标被拦截（errorCode -3） | ✓ |
| 重定向拦截：凭据地址不入历史 | ✓ |
| 合法重定向放行：最终地址完成加载 | ✓ 最终地址 = 重定向目标 |
| window.open 外链：应用内不新建 webContents（交系统浏览器） | ✓ |
| 地址栏内嵌凭据导航被拒 | ✓ browser url 不允许内嵌凭据 |
| 窗口关闭统一回收 | ✓ |

原始输出（末段）：

```
[spike] ✓ 页面内导航守卫：内嵌凭据目标被拦截（errorCode -3）
[spike] ✓ 页面内导航守卫：地址不污染 — http://127.0.0.1:64225/evil
[spike] ✓ 重定向守卫：内嵌凭据目标被拦截（errorCode -3）
[spike] ✓ 重定向拦截：凭据地址不入历史
[spike] ✓ 合法重定向放行：最终地址完成加载 — navigate.ok=true currentUrl=http://127.0.0.1:64225/
[spike] ✓ window.open 外链：应用内不新建 webContents（交系统浏览器）
[spike] ✓ 地址栏内嵌凭据导航被拒 — browser url 不允许内嵌凭据
[spike] 20/20 通过
```

## 环境事实（spike 过程中确认）

- `will-frame-navigate` 对 `about:blank` 等特殊协议不触发（Chromium 特殊导航路径）；`javascript:alert(1)` 会弹对话框卡住渲染进程——spike 夹具改用「页面加载后延迟脚本导航到内嵌凭据 URL」触发守卫。
- `file:` 等协议的 http→file 顶层导航由 Chromium 自身先行拦截（不触发 will-frame-navigate），守卫为其后的纵深防御层。
- Electron 43：`will-navigate` 已废弃，主框架导航守卫用 `will-frame-navigate`（单参 `Event<Params>`，`preventDefault()` 在其上）。

## 验证过程发现（已修复）

1. **重定向最终地址被初始 URL 覆盖（W5.3 新代码缺陷，已修复）**：`did-navigate`（携带重定向最终地址）先于 `loadURL` resolve 到达，`goto` 随后用初始 URL 覆盖 `displayedUrl`，导致状态栏显示重定向前地址。修复：`goto` 设置 `pendingDisplay`，`navigated` 事件清除之，最终赋值仅在无 navigated 时回落初始 URL；新增回归测试（main 25 项之一）。
2. **W4.6 超时/取消退出码竞态（已修复）**：`taskkill` 杀进程后 Node `close` 事件在 Windows 上常报 code 1，若先于 `taskkill` promise 结算则 `finish` 记录 exitCode=1（原测试契约要求 null）。修复：`finish` 中被超时/取消终止的执行退出码归一为 null（结果与审计事件一致），既有测试基线不变。

## 安全结论

- 页面内导航与重定向逐跳守卫 + 服务层最终地址复验双层拦截；window.open 仅 http/https 交系统浏览器。
- 错误页文本净化兜底：内嵌凭据绝不进入状态、事件与展示。
- 无 executeJavaScript；spike 与测试均不注入脚本（测试站点脚本仅用于触发导航尝试，无任何权限操作）。
- 认证 URL、token、key 不进入日志/快照/测试夹具/证据（spike 凭据为虚构夹具 `user:pass@`，与单元测试一致；证据文档不记录完整 URL）。

## 遗留（后续任务）

- W5.4：默认拒绝敏感权限（session permission handler）。
- W5.5：受控下载（系统保存对话框，不自动执行）。
- W5.6：安全浏览布局状态（快照、敏感 URL 拒绝/剥离、不持久化 cookie/DOM）。
- W5.7：端到端与便携验收（真实 E2E smoke）。
