# S0 · W0 基线整树迁入

> 详细任务卡：docs/susu/plan1/phases/W0-baseline-transfer.md。目标：把 labs 的 M0–M2 可跑基线原样搬进本仓，四门禁与 labs 同绿；不改行为、不改布局、不加 Surface。

## T0.1 整树拷贝
- **状态**：todo
- **做什么**：从 innate-labs 拷入 innate-dogic/ 全树（apps/packages/plugins/services、bin/magpie.exe、tsconfig.base.json）、tools/ 五个工程脚本、innate-project-canvas/（含 schema）。排除 node_modules、构建产物、sites、prototypes、references、labs 的 docs 与 .agents。
- **功能**：本仓获得与 labs 相同的产品树与工具链，结构保持不变。
- **如何验证**：目录清单与 labs 一致（排除项除外）；无 node_modules/构建产物混入。
- **预估 / 依赖**：0.5 天 / 无

## T0.2 workspace 接线与依赖安装
- **状态**：todo
- **做什么**：合并根 pnpm-workspace.yaml（apps、packages、innate-dogic 四组、innate-project-canvas）；根 package.json 并入 labs 脚本与 devDeps，保留 ui:sync 与 @innate/ui；合并 vitest/tsconfig/gitignore；.npmrc 保持 @innate 私有源；pnpm install 并补 electron 二进制。
- **功能**：一套 workspace 同时承载 susu-web 与 dogic 产品树。
- **如何验证**：pnpm install 无错；pnpm ls -r 同时列出 @susu/web 与全部 @dogic 包。
- **预估 / 依赖**：0.5 天 / T0.1

## T0.3 改名坏点收口
- **状态**：todo
- **做什么**：根 package.json name 改 innate-desktop；ui:sync 的 --dir 改指 innate-desktop（或改相对定位）；README 更新为双轨说明；docs/README.md 加 plan1 入口行。不改 git remote、不动产品代码。
- **功能**：改名遗留断点一次清零，ui:sync 恢复可用。
- **如何验证**：pnpm ui:sync 幂等成功；仓库内无指向 innate-susu 绝对路径的脚本残留。
- **预估 / 依赖**：0.25 天 / T0.2

## T0.4 门禁对齐与冒烟
- **状态**：todo
- **做什么**：check-typescript 扫描根改为 innate-dogic/tools/apps/packages 并容忍缺失目录；逐项跑 build、typecheck、test（对照 labs 基线 83 项）、smoke:desktop、verify:overlay、package:portable、ui:sync。
- **功能**：迁移动的保险——任何一步不过禁止开 S1。
- **如何验证**：四门禁与 labs 同绿；便携包含对话、magpie、只读工作区三项冒烟；输出留证 docs/susu/evidence/W0/。
- **预估 / 依赖**：0.5 天 / T0.3

## T0.5 文档与执行源切换
- **状态**：todo
- **做什么**：docs/innate-dogic/sprints 与 plans 状态板顶部加「已由 plan1 取代、P 系列后置」标注；labs 仓 README 与 susu-migration.md 加冻结声明；plan1 状态板回写。
- **功能**：新会话直达唯一执行源，旧板无待执行任务残留。
- **如何验证**：按 README 阅读顺序可直达 plan1 状态板；旧 P 状态板无「下一执行项」。
- **预估 / 依赖**：0.25 天 / T0.4
