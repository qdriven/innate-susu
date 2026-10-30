# W4.5 接通工作区 root 与变更语义

日期：2026-10-29

## 交付物

### TerminalService root 订阅语义（W4.3 预置入口，W4.5 契约验证）

`setRoot`（W4.3 已实现，注释标注「W4.5 订阅入口」）在 W4.5 完成语义验证：

- **新建会话默认 cwd 为当前 root**：create 时 spawn `cwd: root.path`（canonical 校验后的当前 root）。
- **root 切换不自动更改已运行会话 cwd**：会话在创建时一次性 spawn，root 切换只更新 `currentRoot`，不影响既有 PTY；新会话使用新 root。
- **无 root**：`currentRoot = null` 时 create 失败并给 hint（「未选择工作区目录，请先选择工作区」）。
- **失效 root**：create 前重新 `stat(root.path)`，root 被删除/不可访问时创建失败并给 hint（「工作区目录已失效，请重新选择」），不回退到任意系统目录；已运行会话不受 root 删除影响（PTY 持有 cwd 句柄）。
- **无效 setRoot**：路径不存在/非目录时 `setRoot` 返回 null 且**不改变**当前 root（不丢工作区）。
- **workspaceId 绑定当前 root**：descriptor.workspaceId 只接受服务端派生 id 或映射到当前 root 的路径（`workspaceIdFor`），指向另一 root 的路径被拒绝（防 cwd 劫持）。

### Desktop 接线（W4.3 预置，W4.5 确认语义闭环）

- `ipc.ts`：`workspacePickRoot` / `workspaceGetRoot`（环境变量回退）成功后调用 `terminal.setRoot(root.path)`——workspace 页面与终端页的目录选择都会同步终端 root。
- renderer 侧：TerminalPage / WorkspacePage 经 `workspacePickRoot` 选目录，服务端落盘后同步 `terminal.setRoot`。

## 验证

- `pnpm --filter @dogic/plugin-terminal test`：**31/31** 通过（W4.3 的 27 + W4.5 新增 4 条 root 订阅语义契约测试）：
  1. root 切换：活会话保持原 cwd 且仍可交互，新会话使用新 root（`cd` 输出验证 cwd 归属，切换后旧会话 `echo` 仍回显）。
  2. 失效 root 负路径：root 被删除后创建失败给 hint，列表不变（无 spawn、无回退），活会话保留。
  3. setRoot 无效路径：拒绝且不改变当前 root，原 root 仍可创建会话。
  4. workspaceId 必须映射当前 root：指向另一 root 的路径被拒绝，当前 root 的 canonical 路径被接受。
- `pnpm --filter @dogic/plugin-terminal typecheck`：通过。
- `pnpm --filter @dogic/desktop test`（79/79）与 build：无回退（W4.5 不触碰 renderer/打包）。

## 安全结论

- root 切换不会把既有会话重定向到新目录（cwd 在 spawn 时定型）；renderer 无法通过 workspaceId 把会话 cwd 指向任意目录（映射校验在进入 spawn 前）。
- 认证 URL/token 不进入日志、快照、测试夹具或证据；测试只跑只读 echo/cd 命令。
