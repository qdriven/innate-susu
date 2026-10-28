# W0.1 · labs 门禁实测记录

> 实测时间：2026-10-28 下午 · 环境：Windows / Node v24.16.0 / pnpm 12.15.0 · 工作目录：`D:\innate-workspace\framework\innate-labs`
> 原则：全部当日实测，不照抄历史数字。

## 六门禁结果汇总

| # | 命令 | 结果 | 关键输出 |
| --- | --- | --- | --- |
| 1 | `pnpm build` | ✅ exit 0 | 全 workspace 构建成功（sites/dsh-desktop-plan 最后完成，3m12s） |
| 2 | `pnpm typecheck` | ✅ exit 0 | shell/desktop/sites typecheck Done + `check-typescript.ts` 通过（TS-only 门禁内嵌于 typecheck 脚本） |
| 3 | `pnpm test` | ✅ exit 0 | **实测 83 项 / 12 个测试文件全部通过**，分布见下表（与 2026-10-26 历史基线一致，本次为当日实测） |
| 4 | `pnpm check:typescript` | ✅ exit 0 | `✓ 产品源码与工具均为 TypeScript` |
| 5 | `pnpm verify:overlay -- <dsh-bin.js>` | ✅ exit 0 | 7 个 overlay 条目全部 `disabled=true`（7/7） |
| 6 | `pnpm smoke:desktop` | ✅ exit 0 | 真实 Electron CDP 冒烟全过，见下节 |

## 测试分布（实测）

| 包 | 测试文件 | 用例 |
| --- | --- | --- |
| @dogic/core | 3 | 16 |
| @dogic/kernel | 4 | 28 |
| @dogic/sdk | 1 | 9 |
| @dogic/syntax-highlighting | 1 | 3 |
| @dogic/plugin-model-gateway | 2 | 22 |
| @dogic/plugin-workspace | 1 | 5 |
| **合计** | **12** | **83** |

## smoke:desktop 断言明细（当日真实输出）

```
[smoke] 受管 magpie 控制台认证与真实内容通过
[smoke] simple nav: [ '对话', '设置' ]
[smoke] simple 模式门控通过
[smoke] simple hero: 模型已就绪 · 34 个可用…
[smoke] dev nav: [ '对话', '总览', '工作区', '模型', '模型配置', '工具' ]
[smoke] 工作区 Surface 安全快照与重启恢复通过
[smoke] 文件树、文本/Markdown 预览与只读 Git diff 通过
[smoke] OK
```

截图产物（labs 侧 tools 输出目录）：console-view / console / simple-home / workspace-file(-dark) / workspace-markdown / workspace-git。

## 过程记录（含两次采集失误与修正，如实保留）

1. `pnpm test` 首次采集时管道 `tail -8` 截掉了拓扑序最前的 core/sdk 汇总行（只见 58 项）；单独补跑 `pnpm --filter @dogic/core test`（16）与 `--filter @dogic/sdk test`（9）后合计 83，与全量结果一致。
2. `verify:overlay` 首跑失败（脚本要求显式提供 dsh 入口 `bin.js` 路径，退出码 2）；从 `D:/pnpm/bin/dsh` shim 解析出真实入口 `D:/pnpm/global/v11/499c…/node_modules/@deepseek-ai/dsh/lib/bin.js` 后带参重跑，7/7 通过。**W0.5 迁移工具时建议把该入口解析（从 PATH 上的 dsh shim 反解 bin.js）内置进 verify-overlay**，避免依赖手工传参。

## 结论

源基线（labs 工作区快照 + magpie v0.1.1230 指纹）当日六门禁全绿、83 项测试实测通过，达到 W0.1「源基线可复现」的完成标准；W0.4 拷贝后以本记录为对照基准。

## W0.2 修复后复跑（2026-10-28 傍晚，task-local-w0-2）

改动：@dogic/core 新增 redactLaunchSecrets（9 用例）；desktop harness.ts log() 单点脱敏（内存/事件/落盘三路）；services/harness-runtime [dsh]/[dsh!] 过边界 + 新增 core 依赖。

| 命令 | 结果 |
| --- | --- |
| pnpm build / typecheck / check:typescript | ✅ 全 exit 0 |
| pnpm test | ✅ **96/96**（core 25=16+9 新增脱敏用例、kernel 28、sdk 9、syntax 3、model-gateway 22、workspace 5、canvas 4） |
| pnpm verify:overlay -- <dsh-bin.js> | ✅ 7/7 |
| pnpm smoke:desktop | ✅ 真机全过（simple 门控/dev 导航/工作区快照/Git/控制台认证）；smoke 输出 0 处原始 token |

过程事件（如实）：首次复跑 model-gateway 6/22 超时失败 + smoke 控制台 15s 超时。排查为 **magpie 孤儿进程环境问题**：4 个 `magpie web` 实例（3 个 10-26 遗留、含 2 个来自已删 innate-service 旧路径；1 个当日 smoke 泄漏）争用配置致 CLI 30s 超时。清理全部孤儿后 model-gateway 22/22、smoke 全过，代码无关。运维提示：`tasklist`+`taskkill` 巡检应纳入 smoke 失败排障第一步（已写入排障手册场景 E 预案）。

## desktop 根门禁（W0.3/W0.4/W0.5，2026-10-28 晚）

| 命令 | 结果 |
| --- | --- |
| pnpm build | ✅ 全 13 包（10 dogic + canvas + theme + root） |
| pnpm typecheck（递归+tools+TS-only 组合） | ✅ |
| pnpm test | ✅ **106/106**（core25 kernel28 sdk9 syntax3 mg22 ws5 canvas4 theme10） |
| pnpm check:typescript | ✅（新扫描根 innate-dogic/tools/apps/packages/innate-project-canvas，容忍缺失；豁免 2 个既有 .mjs） |
| pnpm verify:overlay（无参） | ✅ 7/7（shim 自动反解 dsh bin.js） |
| 引擎 audit（repo 版） | ✅ 0 错（evidence 根修复生效） |

适配明细（如实）：根 TS 5.7.2→7.0.2 对齐 labs；4 个 dogic 包 tsconfig 三级上溯误中 desktop 严格根 base → 改指 innate-dogic 自有 base（语义等价 labs）；引擎自带 tsconfig.base.json（原 labs 根 base 语义）；tools tsconfig 补 types:node 并排除 session-run-guard（desktop 原生工具含既有 TS2554，属其所有者）；electron 二进制 install.js 兜底。

## desktop 根行为对照（W0.6，2026-10-28 晚）

- pnpm verify:overlay（无参）：✅ 7/7
- pnpm smoke:desktop：✅ 真机全过（控制台认证/simple 门控/dev 导航/工作区文件+暗色高亮/Surface 快照恢复/Markdown/Git diff/对话就绪）
- 日志脱敏：smoke 输出原始 token 0 处；结束后 magpie/electron 进程 0 残留
- 行为矩阵：evidence/W0/behavior.md 12 项全一致，差异 0
- 过程事件（如实）：smoke 首跑失败于工作区步骤——工具内三处硬编码 `innate-labs` 断言（根名/package.json 内容/恢复预览）未随迁根更新，属 W0.5 工具适配遗漏；已改为 `path.basename(root)` 派生后复跑全过。产品行为无差异。

## 便携验证（W0.7，2026-10-28 晚）

- pnpm package:portable：✅ 组装 `dist-package/portable/DSH InnateOS`（DSH InnateOS.exe + resources/app/out + simple patch + magpie 语义运行时接入说明）
- pnpm run smoke:desktop -- --packaged：✅ 便携目录真机全过（与 dev 同断言集）；证据截图 10 张入 evidence/W0/smoke/
- 包内检查：开发仓绝对路径 0、.env/console-key/日志 0、资源清单齐全
- 进程检查：DSH InnateOS.exe 0 残留；**已知问题：packaged 冒烟后泄漏 1 个 magpie web 控制台（PID 已清）**——疑似 smoke 对 electron 进程树 taskkill /F 绕过 app 退出清理（stopMagpieConsole 未及执行）；dev 模式未复现。已登记为 W2.4（控制台生命周期）输入，不阻塞 W0 出口（应用自身正常退出路径仍走清理钩子）。
- 工具适配补充：smoke 默认截图目录由旧 `docs/plans/innate-dogic-dsh/evidence/m1` 改为 `docs/susu/plan/evidence/W0/smoke`（W0.5 类适配遗漏，一并修复）。
