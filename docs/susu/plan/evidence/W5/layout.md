# W5.6 安全浏览布局状态证据

日期：2026-10-30

## 任务目标

浏览器布局无恢复且敏感 URL 有风险。目标：快照持久化恢复；敏感 URL 不入快照；版本不兼容回退。完成标准（W5-browser.md W5.6）：布局可恢复，但浏览器永不成为凭据快照。

## 交付范围

- `plugins/browser/src/main/layout.ts`（新增）：纯布局策略模块（不依赖 electron，renderer 与 main 均可消费；持久化后端注入）。
  - `BROWSER_LAYOUT_VERSION = 1`、`DEFAULT_BROWSER_LAYOUT_KEY = 'innate.browser-layout:center'`。
  - `isSensitiveBrowserUrl`：内嵌凭据（`//user:pass@host`）、非 http/https 协议、含敏感 query 参数（token/access_token/apikey/api_key/secret/password/passwd/auth/authorization/session/cookie/credential，不区分大小写）→ 敏感。
  - `filterSafeBrowserUrls` / `buildBrowserLayoutSnapshot`：只保留普通 http/https URL + 标签 id + activeId。
  - `parseBrowserLayoutSnapshot`：版本不兼容/结构非法/重复 id → 抛错；解析时兜底再过滤敏感 URL；字段白名单解析，不复制未知字段。
  - `BrowserLayoutStore`：`saveUrl`（敏感 URL 拒绝并删除已有记录）、`consume`（取出并移除，恢复后不重复重导航）、`clear`、`setActive`、`snapshot`、`restore`；构造时 `load` 失败（版本不兼容）即丢弃旧快照安全回退。
- `plugins/browser/src/renderer/BrowserPanel.tsx`：`layout?: BrowserLayoutStore` 可选入参——挂载时 `consume` 恢复 URL 并用户可见地重新导航（提示"正在恢复上次浏览的页面…"）；会话 URL 变化后 `saveUrl` 保存当前普通 URL；卸载/关闭时 `clear` 清理布局记录。
- `plugins/browser/src/renderer/index.ts`：导出 `BrowserLayoutStore`/版本/键/纯函数与类型。
- `apps/desktop/src/renderer/src/surfaces/providers/browser.tsx`：`createBrowserProvider(api, layout?)` 注入布局；`close` 时清理布局。
- `apps/desktop/src/renderer/src/surfaces/providers/desktop.ts`：以 `localStorage` 为后端实例化 `BrowserLayoutStore`（与核心 `SurfaceTabs` 快照分离——核心快照不含 URL）。
- `plugins/browser/src/main/layout.test.ts`（新增 15）：敏感判定、构建/解析快照、版本回退、store 保存/消费/关闭/快照。
- `apps/desktop/src/renderer/src/surfaces/providers/browser.test.tsx`（新增 3）：挂载恢复重导航、敏感 URL 不恢复、导航保存 + 卸载清理。

## 契约要点

- 快照只含普通 http/https URL、标签 id、activeId；不保存 cookie、session、页面 DOM、表单、下载内容或 WebContents 对象（快照仅 URL 字符串与 id，天然不含运行时对象）。
- 敏感 URL 默认拒绝持久化（`saveUrl` 拒绝并删除），绝不静默复用凭据——浏览器不得成为凭据快照。
- 重载恢复需用户可见地重新导航（面板提示 + 实际 `browserNavigate`）。
- 版本不兼容/结构非法安全回退：构造时丢弃坏快照，不抛到渲染链路。
- 失败不影响其它 Surface：布局层按标签 id 隔离，单标签恢复失败只影响本标签。

## 验证结果

```
pnpm --filter @dogic/plugin-browser test:      Test Files 5 passed (5)  Tests 76 passed (76)  （新增 layout 15）
pnpm --filter @dogic/desktop test:             Test Files 14 passed (14) Tests 100 passed (100) （新增 3）
pnpm --filter @dogic/plugin-browser build:     EXIT=0
pnpm --filter @dogic/plugin-browser typecheck: EXIT=0
pnpm --filter @dogic/desktop typecheck:        EXIT=0
pnpm verify（全仓 typecheck + test）:           EXIT=0
```

覆盖（task-local F1-V1：恢复/敏感 URL/版本/隐私扫描）：

- 恢复：挂载消费布局 → 用户可见重导航 → 导航后重新入布局（供下次会话恢复）；恢复只触发一次导航。
- 敏感 URL：内嵌凭据/非 http(s)/token-key-secret-password 等 query 参数一律拒绝入快照（保存即删除已有记录）。
- 版本：`parseBrowserLayoutSnapshot` 版本不兼容抛错；store 构造时丢弃坏快照安全回退。
- 隐私扫描：快照结构白名单解析，只含 URL+id；敏感 URL 构建与解析双过滤；无 cookie/DOM/表单/下载内容/WebContents。

## 设计决策与验证过程发现

1. **布局快照与核心 SurfaceSnapshot 分离**：核心 `@dogic/core/surface` 的 `SurfaceSnapshot` 不含 URL（`SurfaceDescriptor = {id, providerId, kind, title, workspaceId?, capabilities?}`）。浏览器 URL 需独立一层（本模块）承载；标题与 workspace 引用由核心快照（`SurfaceTabs`，localStorage 键 `innate.surface-tabs:center`）持久化，两者按标签 id 对应。
2. **恢复是"消费 + 重导航"，非会话复活**：`consume` 取出即移除，恢复后当前 URL 重新入布局；避免标签切换/重挂载重复重导航。WebContents 本体不持久化——浏览器永不成为凭据/会话快照。
3. **electron spike 范围决策**：spike（`scripts/spike-browser.cjs`）运行于主进程，而布局恢复是 renderer 侧 localStorage 逻辑（面板挂载消费 + 导航）。该链路已由单元测试（76/76）+ renderer 面板测试（新增 3）完整覆盖，故本任务不扩展主进程 spike（不强行把 renderer 逻辑塞进 main harness）。spike 保持 W5.5 的 34/34 状态，布局恢复结论由 renderer 测试承担。
4. **敏感 URL 的导航层前置拒绝**：内嵌凭据 URL 在 W5.1/W5.3 导航守卫层即被拒（`browserNavigate` 返回失败），因此面板 `state.currentUrl` 不会含凭据；布局层 `saveUrl` 再兜底拒绝，双保险。

## 安全结论

- 浏览器永不成为凭据快照：敏感 URL 拒绝持久化，恢复只重导航不复活认证状态。
- 无运行时对象持久化：快照仅 URL 字符串与 id，无 cookie/session/DOM/表单/下载内容/WebContents。
- 用户可见恢复：重载后面板提示"正在恢复上次浏览的页面…"并实际重新导航，失败给出明确提示。
- 版本不兼容安全回退：丢弃坏快照，不抛到渲染链路，不影响其它 Surface。

## 遗留（后续任务）

- W5.7：端到端与便携验收（真实 E2E smoke）。
