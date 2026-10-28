# 1-monorepo-init：monorepo 骨架 + UI 基座接入

> Issue #1「Setup Mono Repo」：*基于 innate-fe-cli 和 innate-fe 构建 mono repo；检查当前是否已经可以满足了。*
>
> 同目录的 [style-guide-alignment.md](./style-guide-alignment.md) 是本任务的另一半（Style Guide 对齐）。

## 目标

把 innate-desktop 从「一个只有文档的仓」变成**可安装、可验证、可接基座**的 pnpm workspace monorepo，并且不把 innate-fe 的源码并进来。

## 交付物

```text
innate-desktop/
├── package.json                 # 统一 build/test/typecheck/lint/ui:sync 入口
├── pnpm-workspace.yaml          # workspace 范围 + 构建脚本白名单 + 发版年龄豁免
├── pnpm-lock.yaml               # 锁文件（含 @innate/ui 0.1.2 的解析结果）
├── tsconfig.base.json           # 根 TS 基座（strict）
├── tools/
│   ├── ui-sync.mjs              # UI 基座接入入口：定位基础仓 → innate-fe-cli install
│   └── compare-palette.mjs      # 中性色对照脚本（orca ↔ @innate/ui，只读）
├── packages/
│   └── theme/                   # @innate-desktop/theme：产品 token 层 + 壳 chrome 层
│       ├── src/tokens.css       # 产品 token（明暗成对声明）
│       ├── src/shell.css        # 壳 chrome 类名（不写字面量）
│       ├── src/index.css        # 入口：tokens.css + shell.css
│       ├── src/theme.ts         # 机器可读契约
│       ├── src/theme.test.ts    # token 纪律测试（8 项）
│       └── src/fonts/Geist-Variable.woff2
├── apps/
│   └── README.md                # 应用槽位说明（W1 才建 @innate-desktop/desktop）
└── .agents/skills/susu-overview/
    ├── STYLEGUIDE.md            # 视觉规则执行副本（已按本仓基座重写）
    └── styleguide/
        ├── color.md             # 颜色角色 + orca ↔ @innate/ui token 对照
        ├── components.md        # primitive 清单 + orca 缺口与方案
        ├── toolbar.md           # 壳 toolbar 规格（orca titlebar ↔ webshell header）
        ├── native-chat.md       # 对话区规格（尚未实现，前瞻）
        ├── ux-rules.md
        └── ux-review-rubric.md
```

## 关键决策

| 决策 | 选择 | 理由 |
| --- | --- | --- |
| 包管理器 | 根级 pnpm workspace（pnpm 12.14.0，`packageManager` 字段锁定） | 一张依赖图、一套门禁 |
| 基础仓接入 | `tools/ui-sync.mjs` 定位基础仓 → 调 `innate-fe-cli install` | `innate-fe-cli` 的入口路径取决于基础仓在哪，写死在 `package.json` 里会让仓库不可移植 |
| 基础仓定位优先级 | `--root` > `INNATE_FE_ROOT` > `.innate-fe-cli.json`（仓库根 / home）> 向上自动发现 | 与 `innate-fe-cli` 内部一致 |
| 基础仓源码 | **不并入**，走私有 Verdaccio 的**源码包**（`main: ./src/index.ts`） | 基础仓独立演进；消费方 bundler 负责编译 |
| TS 基座 | 根 `tsconfig.base.json`，strict + `noUncheckedIndexedAccess` 等 | 全仓一条基线，包只做增量 |
| token 分层 | 基础仓（primitive + 主题机制）/ 本仓产品层（字面量唯一出口）/ 本仓壳 chrome 层 | 见 [style-guide-alignment.md §2](./style-guide-alignment.md#2-中性色对照) |
| 构建脚本白名单 | `allowBuilds: { electron: true, esbuild: true }` | 只放行需要的原生构建 |
| 发版年龄豁免 | `minimumReleaseAgeExclude: ["@innate/ui@0.1.2"]` | 私有源的内部包不等公开发布节奏 |
| 应用槽位 | `apps/*` 先留空，`@innate-desktop/desktop` 留到 W1 | 本次只交付骨架，不写应用代码 |

## 命令

```bash
pnpm install              # 安装 workspace 依赖（@innate/* 走 .npmrc 指向的私有源）
pnpm build                # pnpm -r --if-present build
pnpm typecheck            # pnpm -r --if-present typecheck
pnpm test                 # pnpm -r --if-present test
pnpm verify               # typecheck + test
pnpm ui:sync              # 基础仓 @innate/* → 本地 Verdaccio → 写 .npmrc → 重装
pnpm ui:sync:bump         # 同上，但 bump patch 版本（基础仓源码改过后用）
pnpm ui:sync:dry-run      # 预演，不落盘
node tools/compare-palette.mjs   # 中性色对照复核（只读）
```

`.innate-fe-cli.json` 写基础仓路径（**机器本地，不入库**，已在 `.gitignore`）：

```json
{ "feRoot": "D:/innate-workspace/framework/innate-fe" }
```

## 验证证据

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| workspace 成员 | `pnpm -r list --depth -1` | `innate-desktop@0.1.0` + `@innate-desktop/theme@0.1.0` |
| 类型检查 | `pnpm typecheck` | 通过（根 + `packages/theme`） |
| 测试 | `pnpm test` | `packages/theme` 8 项全通过 |
| 构建 | `pnpm build` | 通过（theme 包为纯 CSS，无构建步骤） |
| 基座接入 | `pnpm ui:sync` | `@innate/ui@0.1.2` 发布到本地 Verdaccio 并重装成功 |
| token 纪律 | `pnpm --filter @innate-desktop/theme test` | 覆盖：import 顺序、产品 token 明暗成对、共享 token 快照、无 `prefers-color-scheme`、壳 chrome 不写字面量、壳 chrome 尺寸与 orca 一致 |
| 中性色对齐 | `node tools/compare-palette.mjs` | 亮色全等；暗色 4 处结构性差异（已在产品层固定） |

## 「检查当前是否已经可以满足了」的结论

**当前状态：骨架层已经满足；应用层尚未开始。**

| Issue 要求 | 状态 | 说明 |
| --- | --- | --- |
| 基于 innate-fe-cli 和 innate-fe 构建 mono repo | ✅ 已满足 | workspace、锁文件、`ui:sync` 接入链路全部可用并验证过 |
| 检查当前是否已经可以满足了 | ✅ 已核对 | 逐项核对结果见上表；剩余项属于 W1 应用实现，不在本任务范围 |
| 应用代码 | ⬜ 未开始 | `apps/` 只放说明；`@innate-desktop/desktop` 留到 W1 |
| 对话区 / 终端 | ⬜ 未开始 | 相关 token 与规格已备好，功能未实现 |

## 后续

1. **W1 桌面壳**：建 `apps/desktop`（`@innate-desktop/desktop`），按 [styleguide/toolbar.md](../../../.agents/skills/susu-overview/styleguide/toolbar.md) 实现 36px titlebar 与窗口控件。
2. **基础仓补件**：安全表面（`DialogContent surface="security"`）、`ShortcutKeyCombo`、多选 combobox——按 [style-guide-alignment.md §6](./style-guide-alignment.md#6-orca-专属能力与本仓缺口) 提 `ui:add`，完成后回本仓 `pnpm ui:sync:bump`。
3. **门禁补强**：oxlint 的 design-system 规则（禁止产品代码出现硬编码色值与深引内部路径），目前只有 `packages/theme` 的 vitest 在执法。
