# 01 · 项目分析

> 版本：v1.0 · 2026-10-28。盘点 `framework/` 下与 Innate 产品直接相关的仓：现状、角色、已知坏点。
> 模块级细节（每个包的代码/测试/迁移动作）见 [02-module-analysis.md](./02-module-analysis.md)。

## 1. 仓库全景

```text
D:\innate-workspace\framework\
├── innate-desktop      ★ 产品仓（本仓，原 innate-susu）—— plan1 的唯一前向仓
├── innate-labs         实验与基线仓 —— M0–M2 可跑基线，W0 后冻结
├── innate-fe           UI 基础仓 —— @innate/* 私有源发包，只读消费
├── innate-backend      后端仓 —— 已转 Go（go.work / innate-go / Taskfile）
├── inante-desktop      空目录（拼写手误，2026-10-28 创建，建议删除）
└── skills              （与产品工程无关）
```

仓间依赖方向（计划态）：

```text
innate-desktop ──消费──▶ innate-fe（@innate/ui 等，Verdaccio 127.0.0.1:4873 源码包）
innate-desktop ◀──W0 整树拷贝── innate-labs（innate-dogic + tools + innate-project-canvas）
innate-desktop ──HTTP──▶ magpie.exe / dsh CLI（外部运行时，本机全局）
innate-backend（Go）——独立线，W/Q 主线不依赖
```

## 2. innate-desktop（本仓）

### 2.1 现状

- 定位：**Innate 产品 monorepo：共享底座 + 轻应用平台**（README 原文）。当前实体内容很薄：
  - `apps/susu-web/`：Vite 7 + React 19 + Tailwind v4 的最小应用，仅一张卡片页，用于验证 `@innate/ui` 消费链路；**已构建出 dist**。
  - `docs/`：2026-10-27 自 `innate-labs/docs/` 整体迁入的全部设计文档（旧 CONTEXT、P 系列、sprints、architecture、research）。
  - `.agents/skills/susu-overview/`：UI 总控技能（token 纪律、明暗机制、基座来源、审批红线）。
  - `tasks/`：空。`packages/`：尚不存在。
- UI 基座：`@innate/ui@0.1.1` 经 `.npmrc`（`@innate:registry=http://127.0.0.1:4873/`）以**源码包**形态消费，不并入源码。`pnpm ui:sync` 负责基础仓发布→重装。
- git：仅 1 个 commit（`init project`）；remote `https://github.com/qdriven/innate-susu.git`。

### 2.2 已验证的关键模式（W1 直接复用）

`apps/susu-web` 跑通了消费方 Tailwind 所有权模式（susu-overview 硬规则 5）：

```css
/* src/globals.css */
@import "tailwindcss";
@import "@innate/ui/tokens.css";
@source "./";
@source "../../../node_modules/@innate/ui/src";
```

vite 侧挂 `@tailwindcss/vite` 插件，`tailwindcss` / `@tailwindcss/vite` 是 app 的 devDependencies。**没有插件 Tailwind 不参与构建，组件全是裸样式**——desktop renderer 迁移时照搬此模式（W1.1）。

### 2.3 已知坏点（W0 收口）

| 坏点 | 影响 | 修复任务 |
| --- | --- | --- |
| `package.json` 的 `ui:sync` / `ui:sync:bump` 硬编码 `--dir D:/innate-workspace/framework/innate-susu` | 改名后 ui:sync 指向不存在目录，直接失败 | W0.3 |
| package name 仍为 `innate-susu`、README 标题仍为 innate-susu | 与目录名 innate-desktop 不一致，新会话/CI 易混淆 | W0.3 |
| git remote 仍为 `qdriven/innate-susu` | push 目标未变；GitHub 侧改名另行处理 | 后置（外部操作） |
| `docs/` 内旧文档的 `innate-dogic` 计划仍标 P0 为「下一执行项」 | 与 plan1（W/Q 优先）矛盾 | W0.6（状态板加后置标注） |
| `framework/inante-desktop` 空目录 | 拼写手误产生的噪音 | 手动删除（仓库外操作） |

## 3. innate-labs（基线来源仓）

### 3.1 现状

pnpm workspace 根，`packageManager: pnpm@12.15.0`，node >= 20。包含：

| 目录 | 内容 | plan1 处置 |
| --- | --- | --- |
| `innate-dogic/` | 唯一产品 monorepo：apps/packages/plugins/services + `bin/magpie.exe`（45MB）+ tsconfig.base.json | **W0 整树拷贝** |
| `tools/` | 5 个工程工具：check-typescript / smoke-desktop / verify-overlay / package-portable / start-all | **W0 拷贝**（门禁依赖） |
| `innate-project-canvas/` | 项目快照/漂移审计/看板工具（约 1.5k 行，含 schema 与 audit/sync/diff CLI） | **W0 拷贝**（Q1–Q3 依赖） |
| 根配置 | package.json 脚本、pnpm-workspace.yaml、vitest.config.ts、tsconfig.base.json | **W0 合并**进本仓根 |
| `plugins/` | ZCode 插件本地市场（project-canvas 插件，供 ZCode 会话用） | 不迁（开发工具，非产品） |
| `sites/dsh-desktop-plan` | 方案网站 | 后搬 |
| `prototypes/kimi-work-clone` | 轻应用闭环 v0 原型（plugin-loader/permissions/gateway/widget，selfcheck 全绿） | **不迁**（原型不进门禁）；P 系列重启时作移植来源 |
| `references/` | zcode / orca / dsh-desktop / thinkrail 只读参考 | 不迁（保留在 labs，只读） |
| `docs/` 残留 | 仅 `architecture/orca-architecture-map.md`、`plans/susu-migration.md` | 已有等价/超集内容迁入本仓 docs；plans 本身被 plan1 取代 |
| `.agents/skills/` | innate-labs-context / innate-dsh-playbook / orca-module-kit | 不迁；其中引用 labs 路径的部分在 labs 内自然失效 |

### 3.2 已验证基线（M0–M2，2026-10-26）——一切验收的前提

- DSH 对话内嵌（系统 Node 启动 `dsh web`，Harness UI 以 WebContentsView 嵌入桌面）+ magpie 控制台嵌入
- simple/dev 双模式门控、simple overlay 裁剪 7/7 断言
- 原生工作区插件（文件树/Markdown/图片/只读 Git）、Surface 安全快照
- 便携包真实 Electron 冒烟；全量门禁 **83 项测试**

### 3.3 冻结纪律

W0 完成后 labs 进入冻结：只收关键 bugfix（在 labs 修、验证、cherry-pick 到本仓），不加功能、不改布局。防止双仓漂移。

## 4. innate-fe（UI 基础仓）

- 独立 pnpm 仓：`packages/ui`（`@innate/ui`，shadcn 风格 + `@base-ui/react` + `tokens.css` + Tailwind v4，**以源码形态发布**）、`agent-ui`、`plugin-protocol`、`scene-catalog/specs/mocks`、`skills-kit`、`web-domain` + `domains/*` 业务域 + `innate-fe-cli`（`ui:add`/`ui:update`/shadcn diff、`ui:sync` 发布到本地 Verdaccio）。
- 消费纪律（susu-overview 硬规则）：primitive 只从 `@innate/ui` 取；token 只取语义变量；明暗走 `.dark` class；改组件去基础仓，绝不改本仓 node_modules。
- 对 plan1 的意义：W1 的 token 与壳布局原语从这里取；**缺的原语（如布局三段）先在基础仓补再 sync，不在本仓自绘**。

## 5. innate-backend（Go 后端仓）

- 已从「计划中的 TS innate-backend 框架」转变为 **Go 仓**（`go.work`、`innate-go`、Taskfile、distributions）。
- 对 plan1 的影响：**W/Q 主线不依赖它**。壳的 main 进程能力（pty、进程托管、快照存储）按原 `innate-backend` 设想直接落在 TS 产品代码内；Go 后端是独立服务线，接入方式与时机另行规划（届时经 127.0.0.1 HTTP + 显式契约）。
- 旧文档里 `frameworks/innate-backend`（service-runtime/sidecar/ipc-contract/capabilities/storage）的 P2 计划随 P 系列一并后置；其中 capabilities 审批中介的思路在 W4（process:execute capability）以最小面提前落地。

## 6. 外部运行时（不持有源码，只管接线）

| 运行时 | 协议要点（硬约束） |
| --- | --- |
| dsh CLI | 系统 Node 启动（排除 .cmd shim；清 `ELECTRON_RUN_AS_NODE`）；`dsh web --no-open --host 127.0.0.1`，stdout 解析 `dsh web: <url?token>`；`--patch` 是 launcher 级选项；全新 DSH_HOME 先裸 boot 再接线 |
| magpie | `bin/magpie.exe`；`magpie web --no-open` stdout `magpie web on <url?k=>`；`MAGPIE_WEB_KEY` 固定；`magpie dsh default` 原子恢复接线；一切只绑 127.0.0.1 |
| Git / Node / pty | 只读 Git 走 `@dogic/plugin-workspace`；W4 引入 node-pty（Windows conpty）+ `taskkill /T` 进程树回收 |

## 7. 结论

1. **可迁的资产已经齐且被验证**：dogic 产品树 + 工具 + project-canvas 三块整体搬，行为基线（83 测试 + smoke）作为迁移动的保险。
2. **本仓缺的是「产品壳」而不是「能力」**：susu-web 只验证了 UI 消费链路；W1 起的壳布局、Surface 槽、pty、浏览器都在迁移中新建，但每一块都有 labs 基线或参考实现托底。
3. **外部依赖边界清楚**：dsh/magpie 是可替换客人，Go 后端独立成线；本仓对它们只做 spawn + stdout 契约 + 127.0.0.1 HTTP。
4. **改名遗留的断点集中在配置层**（ui:sync 路径、包名、文档指向），W0 一次收口，不动代码行为。
