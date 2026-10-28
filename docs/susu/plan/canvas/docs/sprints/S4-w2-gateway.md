# S4 · W2 网关收口（源编号 W2.1–W2.7）

## T4.1 W2.1 运行链路和行为对照矩阵
- **状态**：todo
- **做什么**：列 launcher/core、plugins/model-gateway、services/model-gateway 职责重叠与独有行为；列两套 Harness 在 DSH_HOME/首启 profile/patch/Node 解析/端口/状态/日志/停止的差异（只记录并定方案，实施在 R1）；固定网关侧目标链；明确 console 与 gateway 是两个认证域。
- **功能**：收敛无未决项；矩阵是 R1 直接输入。
- **如何验证**：每个差异有保留/收敛(R1)/删除决定及对应测试。
- **预估 / 依赖**：0.5 天 / 需 S3

## T4.2 W2.2 统一 magpie sidecar 生命周期
- **状态**：todo
- **做什么**：复用 MagpieGateway ensureRunning/healthcheck/退避并注入配置；区分 desktop/serve/已存在健康实例不重复启动；停止/异常/健康超时映射稳定 GatewayStatus；保留直连降级但 UI 明示；不动 console key 管理。
- **功能**：桌面不再维护第二套 serve 生命周期。
- **如何验证**：复用/未安装/超时/恢复/退避/显式停止不重启契约测试。
- **预估 / 依赖**：1 天 / T4.1

## T4.3 W2.3 收口 CLI、模型与接线操作
- **状态**：todo
- **做什么**：模型目录/provider/agent 状态/quota/wire/unwire 走类型化 gateway facade；execFile 参数数组+超时；写操作仅用户触发，测试用 mock 或隔离 HOME；断开恢复默认模型的结果与 hint 显式；不引入 per-agent 账号体系。
- **功能**：模型与接线功能经契约可运行。
- **如何验证**：契约测试+CLI 解析+超时/非零退出+伪造参数负路径。
- **预估 / 依赖**：1 天 / T4.2

## T4.4 W2.4 保留并适配受管控制台
- **状态**：todo
- **做什么**：独立回环端口+稳定受管 key，stdout 只在 main 解析；key 仅存 userData 且损坏重生成有测试；console 用 W1c 通用生命周期，失败只影响自身；stop 回收自己启动的进程。
- **功能**：控制台行为与基线一致且 key 不泄漏。
- **如何验证**：重复 show 不重复 spawn、URL 不变不 reload、缺失报错、退出可见、关闭无孤儿。
- **预估 / 依赖**：0.5 天 / T4.3

## T4.5 W2.5 运行状态接入壳状态区
- **状态**：todo
- **做什么**：pill 挂入 W1a.3 状态槽；区分 gateway 与 console 不用一个在线掩盖部分失败（Harness 位留 R1）；事件驱动+低频 reconciling；未安装/未接线/断开/无模型/超时给具体下一步；simple 只显示可理解状态。
- **功能**：用户从壳可判断网关阻塞层。
- **如何验证**：状态转换 UI 测试；断网关提示出现恢复可重试；无明文 token。
- **预估 / 依赖**：0.5 天 / T4.2

## T4.6 W2.6 隔离环境网关真实链路
- **状态**：todo
- **做什么**：临时 DSH_HOME/userData/配置/空闲端口；magpie 起动→模型目录→健康检查→直连一次最小 LLM 调用（Q1 网关前提）；wire/unwire 隔离验证并恢复；无 magpie 降级冒烟。DSH boot→wire→chat 归 R1。
- **功能**：网关链路真实可复验。
- **如何验证**：真实与降级链路分别通过；证据无 key/token；临时目录清理。
- **预估 / 依赖**：0.5 天 / T4.5

## T4.7 W2.7 全量回归与交接
- **状态**：todo
- **做什么**：总门禁+overlay+便携冒烟；更新模块图与 IPC 清单；W2.1 矩阵 Harness 差异移交 R1。
- **功能**：与 W3 合流开 W4；R1 可开工。
- **如何验证**：W0/W1 行为不回退；矩阵网关侧每项有结果。
- **预估 / 依赖**：0.25 天 / T4.6
