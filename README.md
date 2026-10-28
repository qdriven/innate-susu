# innate-desktop

innate-desktop 产品 monorepo：共享底座 + 轻应用平台。UI 基座来自 [innate-fe](../innate-fe) 基础仓，以私有 npm registry 源码包方式消费，**不做源码并入**。

## 结构

```text
innate-desktop/
├── apps/              桌面应用槽位（W1 建 @innate-desktop/desktop）
├── packages/          共享包：@innate-desktop/theme（产品 token 层 + 壳 chrome 层）
├── tools/             ui-sync.mjs（基座接入入口）、compare-palette.mjs（中性色对照）
├── docs/              总体计划与设计文档（入口：docs/README.md）
├── tsconfig.base.json 全仓 strict TS 基座
└── .agents/skills/    susu-overview 总控技能（UI 纪律与路由）
```

旧 `apps/susu-web` 验证应用已废弃删除，不再作为产品基线。桌面实现与迁移任务见 [plan](docs/susu/plan/README.md)。

## UI 基座分层

| 层 | 位置 | 归属 |
| --- | --- | --- |
| primitive 与主题机制 | `@innate/ui`（`packages/ui/src/tokens.css` + `themes/`） | 基础仓 innate-fe |
| 产品 token 层 | `packages/theme/src/tokens.css` | 本仓（**唯一允许出现字面量的文件**） |
| 壳 chrome 层 | `packages/theme/src/shell.css` | 本仓（只引用 token；**按钮不在这一层**，顶栏按钮取 `@innate/ui` 的 Button） |

明暗统一走 `.dark` class，主题变体统一走 `data-theme`。`@innate/ui` 的基础 `:root`（shadcn Neutral）与 orca 的中性色**逐 token 相等**，产品层把这套值冻结在仓里并固定 4 处刻意差异——对照表见 [style-guide-alignment.md](docs/build-path/1-monorepo-init/style-guide-alignment.md)。

## 常用命令

```bash
pnpm install            # 安装 workspace 依赖（@innate/* 走 .npmrc 指向的私有源）
pnpm verify             # typecheck + test
pnpm ui:sync            # 基础仓 @innate/* 发布到本地 Verdaccio 并重装（未运行自动拉起；同版本幂等）
pnpm ui:sync:bump       # 基础仓源码改过后 bump patch 版本再重装
node tools/compare-palette.mjs   # 中性色对照复核（orca ↔ @innate/ui，只读）
```

`dev`、`build` 等 product 命令随新的桌面应用一起建立，不保留指向废弃 Web 应用的空壳脚本。

## 文档

| 文档 | 内容 |
| --- | --- |
| [docs/README.md](docs/README.md) | 文档地图与总体计划入口 |
| [docs/build-path/1-monorepo-init/](docs/build-path/1-monorepo-init/README.md) | monorepo 骨架与基座接入（本仓现状的 build-path 记录） |
| [style-guide-alignment.md](docs/build-path/1-monorepo-init/style-guide-alignment.md) | orca ↔ innate-fe 的对齐结论与差异处置 |
| [packages/theme/README.md](packages/theme/README.md) | token 分层与消费方式 |

## 纪律

UI 相关任务先读 [.agents/skills/susu-overview/SKILL.md](.agents/skills/susu-overview/SKILL.md)：primitive 只从 `@innate/ui` 取、字面量只进 `packages/theme/src/tokens.css`、明暗走 `.dark` class；改组件去基础仓 fe-ui，不在此处改。
