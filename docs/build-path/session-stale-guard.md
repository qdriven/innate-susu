# 会话重入 stale 门禁修复

## 问题

Kimi Work 的 `SessionRunGateService.begin()` 在每次提交前检查 `wire.jsonl` 是否被外部修改。Skill 等工具会在活动会话中触发重入提交；此时宿主可能已正常追加会话日志，重复执行首次进入检查会把这些追加误判为“另一个客户端修改”，并使 `onDidExecuteTool` 返回 `session.stale`。

该问题发生在会话运行门禁，不是 Canvas Widget 的提交事件或静态 HTML 校验导致。

## 契约

- **首次进入**：当前进程尚未持有会话运行锁时，保留所有 Agent wire 的 `externallyModified()` 检查；发现外部修改仍抛出 `session.stale`。
- **会话内重入**：当前进程已经持有同一会话运行锁时，不重复执行首次进入检查，允许 Skill 等内部提交继续。
- **并发边界**：不全局禁用 stale 检查，不改变 Canvas／Widget 事件、数据或布局契约。

## 最小实现

在 `begin()` 中先读取 `wasHeld = sessionLocks.held(sessionId)`，再持有锁；`wasHeld === true` 时直接返回。只有首次持有锁的路径执行外部修改检查。

## 验证

`tools/session-run-guard/test-session-run-guard.ts` 从实际 bundle 提取 `SessionRunGateService`，覆盖：

1. 首次进入且未修改：允许。
2. 首次进入且外部修改：拒绝。
3. 已持有锁的重入提交且宿主日志长度变化：允许。

原始 bundle 必须通过前两项并在第三项复现失败；补丁后三项全部通过，并通过 `node --check`。
