# 阶段 1（M1）— L1：内嵌 magpie 控制台

目标：把 `innate:openMagpieWeb` 的**外跳浏览器**改为 **App 内「模型配置」页**，
用户在 App 内完成配 Provider、选模型、接线 dsh 的全部操作。

## 前置决策（T1.0 结论，2026-10-26 实测）

- 控制台 URL：默认 `http://127.0.0.1:3430`（`MAGPIE_WEB_FALLBACK`），`readWebUi()` 可探测运行态
- **R1 结论：控制台有 key 认证**。`magpie web --no-open` stdout 打印
  `● magpie web on http://127.0.0.1:3430/?k=<key>`；`MAGPIE_WEB_KEY` 固定 key（签名 400 天）。
  未带 key 访问返回 401。对策：托管启动时注入每安装一次的稳定 key
  （`userData/console-key.json`），从 stdout 捕获带认证 URL。
- 嵌入方式：**WebContentsView**（主进程视图，不受 iframe/X-Frame-Options 限制，优先于 `<webview>` 标签）
- sidecar 策略：优先复用已运行实例；未运行时经 `magpie web` 拉起并轮询 stdout 就绪
- 实测坑：Windows 遮挡检测导致内嵌视图黑屏/截图异常 →
  主进程 `disable-features=CalculateNativeWinOcclusion`（与 magpie-dsh 一致）；
  主页面 CDP `captureScreenshot` 不合成子视图，验证截图须对视图 target 单独截取。

## 任务分解

### T1.0 控制台侦察（0.5 天）

- 做什么：本机起 magpie，`curl -I http://127.0.0.1:3430` 与页面请求，确认：
  ① 是否需要 token/登录；② 响应头是否含 `X-Frame-Options`/CSP `frame-ancestors`；
  ③ `readWebUi()` 返回的 url 是否可直接加载。
- 产出：结论写入本文「前置决策」；若需认证，记录 token 获取途径（CLI 输出 / 配置文件）。
- 验收：R1 风险关闭或转为明确处理项。

### T1.1 ConsoleView 主进程模块（0.5 天）

- 实施落点：`innate-dogic/apps/desktop/src/main/surface-host.ts`（规格原设 `console-view.ts`，实施时泛化为多 Surface 宿主，ConsoleView 职责由 SurfaceHost 承担）
- 接口：
  ```ts
  export class ConsoleView {
    async show(url: string, bounds: Rectangle): Promise<void>  // 创建/复用视图并加载
    hide(): void                                               // detach，不销毁（保状态）
    setBounds(bounds: Rectangle): void                         // 跟随渲染进程布局
    dispose(): void                                            // 退出时销毁
  }
  ```
- 要点：`WebContentsView` 加到主窗口；`setWindowOpenHandler` deny → `shell.openExternal`；
  控制台内新窗口一律不外泄；窗口 resize/切页时同步 bounds 或 hide。
- 验收：视图可加载任意测试 URL；切页后无残留遮挡；外链走系统浏览器。

### T1.2 sidecar 确保逻辑（0.5 天）

- 改文件：`src/main/launcher.ts`
- 新增 `ensureMagpie(): Promise<{ok, detail, url}>`：
  ① `readWebUi()` 已在跑 → 直接返回 url；
  ② 否则 `startMagpie()`，每 500ms 轮询 `readWebUi()`，15s 超时；
  ③ 失败返回可操作错误（提示 CLI 不在 PATH / 需手动安装）。
- 复用：`innate-dogic/services/model-gateway` 的 MagpieGateway 可作后续统一（不在本阶段强行合流，避免跨端依赖）。
- 验收：已有实例不重复拉起；冷启动 15s 内就绪；失败有明确文案。

### T1.3 IPC 与 preload 扩展（0.5 天）

- 改文件：`src/main/ipc.ts`、`src/preload/index.ts`、`src/renderer/src/api.ts`
- 新增通道：
  - `innate:consoleShow(bounds)` → ensureMagpie → ConsoleView.show → 返回 `{ok, url|detail}`
  - `innate:consoleHide()` / `innate:consoleBounds(bounds)`
  - 保留 `innate:openMagpieWeb` 作为「在浏览器中打开」的逃生口
- 验收：typecheck 通过；渲染进程类型签名完整。

### T1.4 渲染进程「模型配置」页（0.5 天）

- 改文件：`src/renderer/src/App.tsx`（新增 tab），可加 `src/renderer/src/ConsolePage.tsx`
- 结构：顶部说明条（「此处为 magpie 控制台，改动对新 dsh 会话生效」+「浏览器打开」链接）
  + 占位容器 div；`useEffect` 里 `ResizeObserver` 上报容器 bounds；
  tab 切入 consoleShow、切出 consoleHide。
- 状态：未就绪时显示加载/错误引导（一键启动 magpie 按钮调 `innate:startMagpie`）。
- 验收：页面随窗口缩放不错位；切走再切回控制台状态不丢。

### T1.5 端到端验收（0.5 天）

- 手动脚本（全在 App 内，禁止打开第二个应用）：
  1. 总览页确认网关状态 → 2. 「模型配置」页配一个 Provider key →
  3. Agents 页对 dsh 选模型接线 → 4. 「模型」页看到模型目录 →
  5. 启动 Harness，新会话自报所选模型 → 6. 工具页冒烟通过。
- 留证：截图存 `docs/build-path/02-innate-dogic/` 或 `docs/plans/innate-dogic-dsh/evidence/m1/`。
- 同步更新：`docs/build-path/02-innate-dogic/README.md` 增补内嵌控制台说明。

## 实施记录（2026-10-26，M1 完成）

- 代码：`main/surface-host.ts`（WebContentsView，hide 不销毁；规格中的 ConsoleView 由 SurfaceHost 承担）、`main/launcher.ts`
  （`ensureMagpieConsole` / `resolveMagpieBin` / 稳定 console key / 退出回收）、
  `ipc.ts` + preload + api（`consoleShow/consoleHide/consoleBounds`）、
  `renderer/src/ConsolePage.tsx`（ResizeObserver 同步 bounds）。
- UI：按 orca 规范改造——titlebar + sidebar 布局；单色 token；字阶 10/11/12/13px
  （原 14px 正文降为 12px）；模块取舍见 `docs/architecture/orca-module-review.md`。
- 验证：`tools/smoke-desktop.ts`（CDP 真实窗口驱动）通过：总览截图、控制台内嵌加载
  magpie Agents 页（34 模型、DeepSeek Harness 已接入）、视图 target 内容断言；
  证据 `evidence/m1/{overview,console,console-view}.png`。
- 端到端手动脚本第 2–4 步（在嵌页配 key/选模型/接线）已由嵌页真实内容佐证；
  Harness 启动链未在本次冒烟内（本机 PATH 无 dsh，与 M1 无关）。

## 出口标准

- 手动脚本 6 步全过；`pnpm build / typecheck / test` 全绿；R1 有结论。
- 已知限制记录在案：控制台仍是 magpie 原生 UI（复杂度高）；M2 已完成页面门控，M5 将通过双向宿主原生设置收敛高频操作。
