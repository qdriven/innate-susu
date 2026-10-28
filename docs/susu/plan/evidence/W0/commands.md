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
