# W0.1 · 迁移清单（白名单 / 排除项）

> 生成：2026-10-28（task-local-w0-1）。源：`D:\innate-workspace\framework\innate-labs` → 目标：`D:\innate-workspace\framework\innate-desktop`。
> 拷贝执行在 W0.4；本清单是 W0.4 的输入与验收基准。

## 白名单（源路径 → 目标路径）

| # | 源路径（labs 根相对） | 目标路径（desktop 根相对） | 内容 | 说明 |
| --- | --- | --- | --- | --- |
| 1 | `innate-dogic/` | `innate-dogic/` | apps/{desktop,shell}、packages/{core,kernel,sdk,syntax-highlighting}、plugins/{model-gateway,workspace}、services/{model-gateway,harness-runtime}、bin/magpie.exe、tsconfig.base.json | 整树原样，含 45MB magpie.exe；排除项见下表在拷贝时过滤 |
| 2 | `tools/` | `tools/` | check-typescript / smoke-desktop / verify-overlay / package-portable / start-all + tsconfig/package.json | W0.5 适配扫描根与 INNATE_WORKSPACE_ROOT |
| 3 | `innate-project-canvas/` | `innate-project-canvas/` | src 13 文件、schema/project-snapshot.schema.json、package.json、test/ | Q1–Q3 依赖；不含 node_modules/dist |
| 4 | 根 `package.json` | 合并入根 `package.json` | scripts（build/test/typecheck/check:typescript/dev/dev:shell/start/smoke:desktop/verify:overlay/package*）+ devDeps（tsx/typescript/vitest/@types/node）+ engines | 合并而非覆盖：保留 desktop 现有 name/ui:sync/@innate/ui |
| 5 | 根 `pnpm-workspace.yaml` | 合并入根 `pnpm-workspace.yaml` | innate-dogic 四组 glob + innate-project-canvas + onlyBuiltDependencies: electron | 与现有 apps/*、packages/* 共存；allowBuilds esbuild 保留 |
| 6 | 根 `vitest.config.ts` | `vitest.config.ts` | 30s 超时 + passWithNoTests | 原样 |
| 7 | 根 `tsconfig.base.json` | 合并入根（若缺） | strict 基线 | desktop 现无则直接拷 |

## 排除项（不进目标仓）

| 类别 | 具体项 |
| --- | --- |
| VCS/依赖产物 | `.git/`、一切 `node_modules/`、`out/`、`dist/`、`dist-package/`、`release/`、`*.tsbuildinfo` |
| 只读参考 | `references/`（orca/zcode/dsh-desktop/thinkrail，留在 labs） |
| 原型 | `prototypes/`（kimi-work-clone 等，不进门禁） |
| 站点 | `sites/`（dsh-desktop-plan，后搬） |
| ZCode 插件市场 | `plugins/`（labs 根下，开发工具非产品） |
| labs 文档与技能 | `docs/`（已由 2026-10-27 迁移覆盖）、`.agents/`、`tasks/` |
| 用户真实配置 | `.env`、真实 `console-key.json`、DSH profile、用户 workspace.json、项目快照（W0.4 拷贝后扫描确认零命中） |

## 互斥核对

- 白名单 7 项与排除项 7 类无交集（references/prototypes/sites/plugins(labs根)/docs/.agents 均不在白名单 1–7 的路径内；innate-dogic/ 内部的 node_modules/构建产物在拷贝时按排除类别过滤）。
- `@dogic/shell` 随白名单 1 整树带入（plan 02 §3.3：保持可构建，不新增页面）。

## W0.4 后置核对项（引用）

- `pnpm -r list --depth -1` 列出全部预期模块
- 源码 diff 仅含 W0.2 脱敏修复与路径适配
- 敏感文件扫描（排除表最后一行）零命中
