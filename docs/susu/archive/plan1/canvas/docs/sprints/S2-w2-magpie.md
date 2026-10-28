# S2 · W2 magpie 收口进壳状态

> 详细任务卡：docs/susu/plan1/phases/W2-magpie.md。目标：magpie 状态进壳 pill；不复制 orca per-agent 账号；不做双向设置。

## T2.1 网关健康状态 pill
- **状态**：todo
- **做什么**：main 侧复用 core/gateway 探测加轻量轮询（10s 级、退避）；状态机 未配置/探测中/健康/不可达；IPC 加 gateway:status 与事件推送；TitlebarStrip 渲染 pill，点击打开 magpie-console 或显式 hint。
- **功能**：网关状态全局可见，不可达有原因不静默。
- **如何验证**：mock 网关状态机四态单测；真实环境三态截图；断网关 pill 变红且有 hint。
- **预估 / 依赖**：1 天 / 需 S1；可与 S3 并行

## T2.2 launcher 状态外露
- **状态**：todo
- **做什么**：launcher.ts 暴露 magpie 生命周期事件经 ipc 推壳；不动 bin 探测/consoleKey/console 内核；disconnectDsh 状态回显。
- **功能**：启动/退出/失败可见，接线恢复可操作。
- **如何验证**：事件序列断言；disconnectDsh 后 dsh 路由检测回读确认恢复。
- **预估 / 依赖**：0.5 天 / 需 S1；可与 S3 并行

## T2.3 干净环境接线冒烟
- **状态**：todo
- **做什么**：tools 新增 smoke-magpie-wire.ts：隔离临时 DSH_HOME 裸 boot → magpie 接线 → dsh web 探活；只读/隔离命令，不碰真实用户配置；接 pnpm smoke:magpie。
- **功能**：从零到接线的链路可重复验证。
- **如何验证**：全新临时 HOME 一次通过且重复跑幂等；真人对对话一轮属 UAT 留证。
- **预估 / 依赖**：0.5 天 / 需 S1；可与 S3 并行
