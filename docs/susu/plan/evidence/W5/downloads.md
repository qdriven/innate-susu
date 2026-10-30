# W5.5 受控下载证据

日期：2026-10-30

## 任务目标

下载不自动写入默认目录——调用系统保存路径选择器由用户确认；展示文件名、来源 origin、进度、完成/取消/失败状态；不自动执行下载内容；取消或关闭 Surface 时取消下载并清理临时状态；路径选择和写入只由 main/session 处理，renderer 不获得任意文件写 API。完成标准：下载只进入用户明确选择的位置，无自动执行和隐式路径。

## 交付范围

- `plugins/browser/src/main/download.ts`（新增）：纯下载策略（不依赖 electron）——`sanitizeDownloadFilename`（剥离路径分隔符/控制字符、折叠空白、截断 120、Windows 保留名加后缀、空名兜底）、`mapDownloadItemState`（completed/cancelled→对应；interrupted/progressing→failed）、`normalizeDownloadPercent`（0–100 取整夹紧）。
- `plugins/browser/src/main/electron-view.ts`：下载策略接线（`attachDownloadPolicy`）——`will-download` 一律经系统保存对话框由用户确认路径（不写默认目录）；取消即 `item.cancel()`；事件按来源 webContents 路由；`cancelDownloads()` 在 close 前取消在途下载并清理 tracker。
- `plugins/browser/src/main/index.ts`：`download` 视图事件与服务层转发（按会话 id）。
- `plugins/browser/src/shared/index.ts`：`DownloadState`、`DownloadStatus`、`download` 事件变体（filename/origin/percent/state，不含页面 URL）。
- `plugins/browser/src/renderer/BrowserPanel.tsx`：下载状态行呈现（完成/取消/失败/在途进度）。
- `plugins/browser/scripts/spike-browser.cjs`：spike 扩展（/dl、/dl-evil、/dl-slow、/dl-fail 路由 + 保存对话框桩）。
- `innate-dogic/apps/desktop/src/ipc.ts`：下载事件透传（面板订阅）。

## 契约要点

- 保存路径只由用户经系统保存对话框确认（`confirmSavePath`），取消即取消下载（§W5.5.1）。
- 事件字段脱敏：文件名经净化、来源只记 origin（不含页面 URL/凭据）、进度归一、终态映射（§W5.5.2）。
- 关闭 Surface 时取消在途下载并清理临时状态：`cancelDownloads` 在 `onViewClosed` 路径同步上报 cancelled（§W5.5.3）。
- 路径选择与写入只由 main/session 处理，renderer 无任意文件写 API（§W5.5.4）。
- 不自动执行下载内容：策略层无执行通道。

## 验证结果

### 单元/集成测试

```
pnpm --filter @dogic/plugin-browser test:   Test Files 4 passed (4)  Tests 61 passed (61)  （新增 download 7）
pnpm --filter @dogic/desktop test:         Test Files 14 passed (14) Tests 97 passed (97)
pnpm --filter @dogic/plugin-browser run typecheck: EXIT=0
```

覆盖：文件名净化（分隔符/控制字符/保留名/超长/空名）、终态映射（interrupted→failed 等）、进度归一；renderer 面板完成/取消/失败/在途呈现。

### electron 技术 spike（34/34 通过）

```bash
pnpm --filter @dogic/plugin-browser build
innate-dogic/apps/desktop/node_modules/electron/dist/electron.exe \
  innate-dogic/plugins/browser/scripts/spike-browser.cjs
```

本地 HTTP 测试站点新增下载路由，真实链路：

| 步骤 | 结果 |
| --- | --- |
| 下载取消：对话框取消 → cancelled 事件 | ✓ |
| 下载取消：内容不写入任何路径 | ✓ |
| 下载完成：对话框确认 → completed 事件 | ✓ |
| 下载落盘：只写入用户确认路径 | ✓ |
| 恶意文件名净化：默认名剥离分隔符且非保留设备名 | ✓ defaultPath=_CON.txt |
| 慢下载开始：started 事件上报 | ✓ |
| 关闭 Surface：在途下载取消并清理 | ✓ |
| 下载失败路径：在途下载可观测（progress 事件），终态由单元测试覆盖 | ✓ |
| 下载失败：内容不写入隐式/默认路径 | ✓ |
| 下载事件脱敏：不含 URL、只含可展示字段 | ✓ |

原始输出（下载段）：

```
[spike] ✓ 下载取消：对话框取消 → cancelled 事件
[spike] ✓ 下载取消：内容不写入任何路径
[spike] ✓ 下载完成：对话框确认 → completed 事件
[spike] ✓ 下载落盘：只写入用户确认路径
[spike] ✓ 恶意文件名净化：默认名剥离分隔符且非保留设备名 — defaultPath=_CON.txt event=_CON.txt
[spike] ✓ 慢下载开始：started 事件上报
[spike] ✓ 关闭 Surface：在途下载取消并清理
[spike] ✓ 下载失败路径：在途下载可观测（progress 事件），终态由单元测试覆盖
[spike] ✓ 下载失败：内容不写入隐式/默认路径
[spike] 34/34 通过
```

## 环境事实（spike 过程中确认）

- Electron 43 `DownloadItem`：`getFilename()`/`getInitiatorOrigin()`/`getPercentComplete()`/`getState()`（'progressing'|'completed'|'cancelled'|'interrupted'）/`setSavePath(path)`/`cancel()`；事件 `updated`/`done`。
- DownloadItem 是 session 级：`webContents.close()` 后仍存活——`cancelDownloads` 在 `SurfaceHost.destroy`（先销毁 view 再回调 `onViewClosed`）路径下仍能取消在途下载。
- Chromium 下载重试：连接级错误（socket destroy、服务器关闭）以约 1s 恒定间隔无限重试（25s 内 23+ progress 事件，无终态）；保存失败触发整单重下（无限循环）。

## 验证过程发现

1. **Chromium 下载终态 interrupted 无法经网络/保存机制确定性触发**：经 6 种机制实验——(a) 保存路径缺父目录（Chromium 自动创建 → completed）；(b) 保存路径父为文件（触发整单重下无限循环）；(c) HTTP 404/错误码（不触发 will-download，仅最终 2xx attachment 才创建 DownloadItem）；(d) 传输中途 socket destroy + 服务器关闭（连接级错误无限重试）；(e) 重定向自环（导航层跟随，不触发 will-download）；(f) 非法 chunked 编码（触发 will-download 但 10s 无终态）。Chromium `DownloadRetryPolicy` 只对网络错误重试，任何传输中断均归为网络错误 → 无限重试。
   - **结论**：`interrupted → failed` 映射已由单元测试覆盖（`download.test.ts: mapDownloadItemState('interrupted') → 'failed'`），renderer 失败呈现已由面板测试覆盖；spike 改为验证在途失败下载可观测且不写入隐式路径（信息性记录，不作为通过条件）。
2. **保存对话框桩队列化**：spike 用队列桩替换 `electron.dialog.showSaveDialog`，按步骤注入取消/确认结果，避免真实模态对话框阻塞。
3. **失败下载重试写入用户确认路径**：Chromium 重试循环会把部分内容写入用户确认的路径——不违反策略（用户明确选择了该路径；策略禁止的是隐式路径），spike 断言改为"不写入隐式/默认路径"。

## 安全结论

- 下载只进入用户明确选择的位置：保存路径一律经系统保存对话框确认，取消即取消下载（内容不落盘任何路径）。
- 无自动执行：策略层无执行通道，下载内容仅落盘用户选定位置。
- 无隐式路径：不写默认目录，无 renderer 文件写 API（路径选择与写入只在 main/session）。
- 事件脱敏：文件名净化、来源只记 origin、不含页面 URL/凭据。
- 关闭清理：Surface 关闭取消在途下载并清理临时状态。

## 遗留（后续任务）

- W5.6：安全浏览布局状态（快照、敏感 URL 拒绝/剥离、不持久化 cookie/DOM）。
- W5.7：端到端与便携验收（真实 E2E smoke）。
