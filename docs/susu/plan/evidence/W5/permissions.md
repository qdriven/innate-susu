# W5.4 默认拒绝敏感权限证据

日期：2026-10-30

## 任务目标

`setPermissionRequestHandler` 全 deny；拒绝结果可诊断（记录 origin、类型、结果，不记录页面敏感内容）；未来开放权限必须另立任务按 origin+类型独立审批；其他 Surface 不受影响（Harness/console session 不继承 browser handler，反之亦然）。

## 交付范围

- `plugins/browser/src/main/permission.ts`（新增）：纯权限策略（不依赖 electron）——`browserPermissionOrigin`（origin 脱敏提取：仅 http/https、剥除路径/query/内嵌凭据、无法解析记 `unknown`）与 `denyBrowserPermission`（一律拒绝，生成 `{ origin, permission, result: 'denied' }` 记录，不含页面内容）。
- `plugins/browser/src/main/electron-view.ts`：权限策略接线（`attachPermissionPolicy`）——只挂 `persist:innate-browser` 分区 session（`setPermissionRequestHandler` + `setPermissionCheckHandler` 全拒），事件经 `viewEmitByWebContents`（WeakMap 按来源 webContents 路由）上报；每分区 session 只挂一次（WeakSet 防重复）。
- `plugins/browser/src/main/index.ts`：`permission-denied` 视图事件与服务层转发（按会话 id，只作用于本会话）。
- `plugins/browser/src/shared/index.ts`：`BrowserSurfaceEvent` 新增 `permission-denied`（origin+类型）。
- `plugins/browser/src/renderer/BrowserPanel.tsx`：权限拒绝脱敏文案呈现（`已拒绝 <origin> 的 <type> 权限请求`，导航/失败事件后清除）。
- `plugins/browser/scripts/spike-browser.cjs`：spike 扩展（/perm 路由：页面逐类请求权限）。

## 契约要点

- 权限 handler 只挂 browser 独立分区 session：默认 session（Harness/console/terminal）不继承，反之亦然（§W5.4.4）。
- request handler 与 check handler 一律拒绝；事件只记录 origin（脱敏，不含凭据/路径/query）、权限类型与结果，不记录页面内容（§W5.4.2）。
- 不预留自动允许路径：策略模块无放行分支，未来开放权限必须另立任务按 origin+类型独立审批（§W5.4.3）。
- 权限拒绝事件不改变页面状态（不干预导航/历史/加载），只做诊断。

## 验证结果

### 单元/集成测试

```
pnpm verify                     # EXIT=0
innate-dogic/plugins/browser test:   Test Files 3 passed (3)   Tests 49 passed (49)  （新增 permission 5 + 服务层转发/隔离 1）
innate-dogic/apps/desktop test:      Test Files 14 passed (14) Tests 96 passed (96)  （新增面板呈现 1）
```

覆盖：origin 脱敏提取（http/https/内嵌凭据剥离/非 http(s)/无法解析）、拒绝记录键集固定、服务层按会话转发且事件隔离、面板脱敏文案呈现。

### electron 技术 spike（23/23 通过）

```bash
pnpm --filter @dogic/plugin-browser build
innate-dogic/apps/desktop/node_modules/electron/dist/electron.exe \
  innate-dogic/plugins/browser/scripts/spike-browser.cjs
```

本地 HTTP 测试站点新增 `/perm` 路由（页面加载完成后逐类请求权限），真实链路：

| 步骤 | 结果 |
| --- | --- |
| 权限请求页可加载 | ✓ |
| 权限请求全部被拒：事件携带 origin+类型（geolocation/notifications） | ✓ permissions=[geolocation, notifications] origins=[站点 origin] |
| 权限拒绝不改变页面状态 | ✓ |

原始输出（末段）：

```
[spike] ✓ 权限请求页可加载
[spike] ✓ 权限请求全部被拒：事件携带 origin+类型 — permissions=[geolocation, notifications] origins=[http://127.0.0.1:58843]
[spike] ✓ 权限拒绝不改变页面状态
[spike] ✓ 地址栏内嵌凭据导航被拒 — browser url 不允许内嵌凭据
[spike] 23/23 通过
```

## 环境事实（spike 过程中确认）

- `navigator.geolocation.getCurrentPosition` 与 `Notification.requestPermission` 在隐藏窗口中均触发 session 权限请求（handler 被调用，页面 URL 正确）；`navigator.clipboard.writeText` 无用户激活时抛 `NotAllowedError` 不触发权限请求（不作为断言项，页面仍尝试以覆盖该路径）。
- Electron 43：`setPermissionRequestHandler` 签名 `(webContents, permission, callback, details)`；`setPermissionCheckHandler` 签名 `(webContents | null, permission, requestingOrigin, details) => boolean`。
- 多标签共享同一分区 session：handler 每 session 只挂一次，事件按来源 `webContents` 路由到对应视图（避免后建视图覆盖 handler 后事件错配）。

## 验证过程发现

1. **spike 断言快照缺陷（已修复，仅 spike 脚本）**：首轮 spike 权限步骤失败——`denied` 数组在 `waitFor` 之前一次性切片，等待期间新推入的事件永不可见。修复：谓词内每次重新切片。handler/emit/服务转发链路本身正确（debug 探针确认后移除）。
2. **clipboard 无用户激活不触发权限请求**：见环境事实，spike 以 geolocation+notifications 两类权限验证拒绝路径，clipboard 路径不参与断言。

## 安全结论

- browser 分区无任何隐式敏感权限：摄像头/麦克风/通知/地理位置/剪贴板/MIDI/USB 等一律拒绝（策略层无放行分支）。
- 拒绝记录脱敏：只有 origin（URL 解析器统一剥除凭据/路径/query）、类型与结果；认证信息不进入状态、事件与展示。
- 其他 Surface 隔离：handler 仅挂独立持久分区，默认 session 不继承。
- 无 executeJavaScript；spike 页面脚本仅发起权限请求，无权限操作。

## 遗留（后续任务）

- W5.5：受控下载（系统保存对话框，不自动执行）。
- W5.6：安全浏览布局状态（快照、敏感 URL 拒绝/剥离、不持久化 cookie/DOM）。
- W5.7：端到端与便携验收（真实 E2E smoke）。
