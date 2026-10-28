# S3 · W1c 中栏多 Surface 标签（源编号 W1c.1–W1c.4）

## T3.1 W1c.1 provider 中立的 Surface 标签模型
- **状态**：todo
- **做什么**：core/surface 定义 renderer 标签状态（id/kind/providerId/title/workspaceId/capabilities）；provider 注册接口容纳 webcontents 与 renderer document/panel 两类；SurfaceTabs open/activate/deactivate/close，激活项持久化安全 id；snapshot v1 可读、新字段可选、非法版本回退；token/webContents/ChildProcess 不进标签状态。
- **功能**：标签条不感知 Harness/magpie 私有类型。
- **如何验证**：多 Surface 开关/切换/activeId 恢复/重复 id/非法 descriptor/旧快照兼容单测。
- **预估 / 依赖**：1 天 / 需 S2

## T3.2 W1c.2 Harness 与控制台接入统一槽
- **状态**：todo
- **做什么**：provider 中立 surface show/hide/bounds/close 窄 IPC；认证 URL 解析限定在 runtime provider；旧 Harness/console IPC 作临时适配逐一迁移；切换只 detach、URL 未变不 reload、显式 close 才销毁；新路径全绿后删重复状态与无调用旧通道。
- **功能**：两个 WebContents 客人共用同一中栏槽。
- **如何验证**：交替切换不重载（CDP）；resize/maximize bounds 正确；关一个不影响另一个；伪造 providerId 被拒。
- **预估 / 依赖**：1 天 / T3.1

## T3.3 W1c.3 可摘除的运行时降级
- **状态**：todo
- **做什么**：DSH 缺失/启动失败/provider 注册失败时壳与其余页面可用；对话 Surface 显式启动/重试提示不白屏；禁用 console provider 只移除其贡献不停止 Harness；不加 terminal/browser 空入口。
- **功能**：任一客人失败只影响自身。
- **如何验证**：模拟三种失败，壳与其余 Surface 保持可用。
- **预估 / 依赖**：0.5 天 / T3.2

## T3.4 W1c.4 壳与便携回归（W1 出口）
- **状态**：todo
- **做什么**：DOM 断言覆盖三栏/标签/simple/dev/降级；全量门禁+overlay 7/7+开发冒烟；便携目录重复多 Surface 切换/resize/关闭回收；明暗截图与生命周期日志摘要，检查无 token。
- **功能**：W1 整段出口门禁。
- **如何验证**：W0 行为不回退，新断言全绿；证据齐全才开 W2/W3。
- **预估 / 依赖**：0.5 天 / T3.3
