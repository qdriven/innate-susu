# S0 · W0 基线迁入（源编号 W0.1–W0.8）

## T0.1 W0.1 冻结源基线并建立迁移清单
- **状态**：已完成
- **做什么**：记录 labs 与本仓 commit/工作区/版本；在 labs 实测 build/typecheck/test/check:typescript/verify:overlay/smoke:desktop 并记录实测测试数；列迁移白名单（innate-dogic、tools、innate-project-canvas、根配置）与排除项；magpie.exe 记录版本与哈希。
- **功能**：迁移源可复现，范围无歧义。
- **如何验证**：白名单每个包映射到目标路径；排除项不进清单。
- **预估 / 依赖**：0.5 天 / 无

## T0.2 W0.2 在源基线修复启动日志脱敏
- **状态**：todo
- **做什么**：labs 侧 harness.ts 与 services/harness-runtime 增加 redactLaunchSecrets，token/k 查询参数替换为 [redacted]；运行态保留真实 URL，仅日志脱敏；内存/落盘/service 回调走同一边界；不带私改进程参数；修复后重记源 commit。
- **功能**：已知 token 泄漏在拷贝前于源头修复。
- **如何验证**：含 dsh ?token= 与 magpie ?k= 的夹具在日志断言中被脱敏；正常 URL 可读；基线门禁重新全绿。
- **预估 / 依赖**：0.5 天 / T0.1

## T0.3 W0.3 统一目标仓工程身份与 workspace
- **状态**：todo
- **做什么**：根工程名 innate-desktop；workspace 登记 apps、innate-dogic 四组、innate-project-canvas；合并 onlyBuiltDependencies/allowBuilds；ui:sync 用当前目录与自动发现 innate-fe；对齐包管理器与 Node engine 并记录兼容矩阵。
- **功能**：目标身份与私有 UI 消费路径可重复。
- **如何验证**：pnpm install 无旧 Web importer；ui:sync --dry-run 指向正确根。
- **预估 / 依赖**：0.5 天 / T0.2

## T0.4 W0.4 按白名单迁入产品与画布模块
- **状态**：todo
- **做什么**：原样复制白名单源码、resources、package/tsconfig 与 magpie.exe；保留 @dogic/* 与 @innate-labs/project-canvas 包名；不复制旧 README 文档链接与用户配置；检查 workspace 依赖可解析、无敏感文件。
- **功能**：计划模块全部落位且来源可追踪。
- **如何验证**：pnpm -r list 列出预期模块；源码 diff 仅含 W0.2 与路径适配；敏感文件扫描无结果。
- **预估 / 依赖**：0.5 天 / T0.3

## T0.5 W0.5 迁入并适配工程工具与根脚本
- **状态**：todo
- **做什么**：迁入 smoke-desktop/verify-overlay/package-portable/check-typescript；适配 INNATE_WORKSPACE_ROOT 与相对路径；根脚本补齐全部门禁命令；新桌面构建纳入总门禁；不保留指向旧 Web 包的脚本。
- **功能**：一套命令验证全部已迁入模块。
- **如何验证**：build/typecheck/test/check:typescript 全绿；测试数不少于 W0.1 实测。
- **预估 / 依赖**：0.5 天 / T0.4

## T0.6 W0.6 恢复桌面开发和基线行为
- **状态**：todo
- **做什么**：隔离 userData/DSH_HOME 验证 magpie 检测、模型状态、Harness 启动、控制台 Surface、工作区选根与预览、Git status/diff、overlay 7/7、Surface 切换不重载；与 labs 逐项对照，差异本阶段消除。
- **功能**：M0–M2 行为在目标仓恢复。
- **如何验证**：verify:overlay 与 smoke:desktop 全绿；行为矩阵全部一致；日志脱敏仍有效。
- **预估 / 依赖**：0.5 天 / T0.5

## T0.7 W0.7 验证便携目录与资源完整性
- **状态**：todo
- **做什么**：构建目录型便携包；从便携目录跑真实 Electron 冒烟；关闭后无孤儿进程；包内无开发仓绝对路径、用户配置与认证信息。
- **功能**：便携产物可复制到干净目录运行。
- **如何验证**：便携冒烟通过；资源清单与进程检查入证据。
- **预估 / 依赖**：0.5 天 / T0.6

## T0.8 W0.8 切换执行源并冻结基线
- **状态**：todo
- **做什么**：标记 plan 为唯一执行源、旧 P 系列为 backlog；保存 W0 全部证据；创建可回退基线工作点；labs 此后只收关键 bugfix。
- **功能**：新会话从 README 唯一定位 W1a，不再被旧 P 系列分流。
- **如何验证**：从目标 README 唯一找到 W1a 任务；W0.1–W0.8 证据齐全。
- **预估 / 依赖**：0.25 天 / T0.7
