---
name: innate-fe-cli
description: >
  用 innate-fe-cli 从私有 registry 消费 @innate/* 前端包（本地 Verdaccio 或 GitHub Packages）。
  本仓加/升级 @innate/ui 等前端依赖、ui:sync、.npmrc、404、版本不更新、workspace: 改写时触发。
  禁止把基础仓当 file:/link:/workspace: 依赖或从 npmjs 安装 @innate/*。
---

# innate-fe-cli — 私有源消费 @innate/*

`@innate/*` **不在 npmjs**。本仓是消费方，包从 innate-fe 发到私有 registry 再安装。CLI 源码在基础仓 `innate-fe/innate-fe-cli`（bun，无全局命令）。视觉与 import 边界见 `susu-overview`。

## 本仓怎么装

仓库根已包装好，优先用脚本，不要自己拼 `pnpm add`：

```bash
pnpm ui:sync          # 发布（同版本跳过）→ 写 .npmrc → pnpm install
pnpm ui:sync:bump     # 基础仓源码改过：patch 升版本再发再装
pnpm ui:sync -- --dry-run
```

等价 CLI（`--dir` = 消费方，`--root` = 含 `plugins.registry.yaml` 的 innate-fe）：

```bash
bun <innate-fe>/innate-fe-cli/src/index.ts install --dir . --root <innate-fe>
bun <innate-fe>/innate-fe-cli/src/index.ts install --dir . --root <innate-fe> --bump patch
```

本机 innate-fe 与本仓同在 `framework/` 下时，不传 `--root` 也能自动发现。定位优先级：`--root` > 环境变量 `INNATE_FE_ROOT` > `.innate-fe-cli.json`（`{"feRoot":"<基础仓路径>"}`，消费方目录或 `~`）> 向上找 `framework/innate-fe`、`base/innate-fe`、`innate-fe`。

`install` 做四件事：把基础仓 `packages/` 里可发布的 `@innate/*` 发到 `http://127.0.0.1:4873`（Verdaccio 没起会自己拉起）→ 写消费方 `.npmrc` 的 `@innate:registry=` → 把 `workspace:*` 改成 `^<发布版本>` → 在 `--dir` 跑 `pnpm install`。已是 semver 范围的条目不动。同版本号再次发布会跳过，所以改了基础仓源码必须 `--bump patch`（即 `pnpm ui:sync:bump`），否则消费方锁文件仍是旧 tarball。

## 给 app 加一个前端依赖

1. 只在**真正 import 的那个** `package.json`（`apps/*` 或 `packages/*`）里写 semver，不要写 `workspace:` / `file:` / `link:`：

```json
"dependencies": { "@innate/ui": "^0.1.2" }
```

版本号读基础仓该包的 `package.json` `version`，用 caret。`^` 盖不住新的 minor/major 时，先改范围再 `pnpm ui:sync`。

2. 仓库根执行 `pnpm ui:sync`。根脚本的 `--dir .` 会在本仓跑 `pnpm install`，workspace 成员一起解析。

3. 提交 `.npmrc` 里的作用域行。本地源没有 token 行：

```
@innate:registry=http://127.0.0.1:4873/
```

可发布 = `packages/` 下 `name` 以 `@innate/` 开头且 `private !== true`。当前只有 `@innate/ui`、`@innate/web-domain`。`agent-ui`、`admin-composites`、`plugin-protocol` 等是 private，`install` 遇到 `workspace:` 引用会直接报「不可安装」。

公网包（`tailwindcss`、`@tailwindcss/vite`、`react`）照常 `pnpm add`，不要塞进私有源。

import 只用 `@innate/ui` 与 `@innate/ui/tokens.css`。不要引 `@innate/ui/globals.css`，不要深引 `components/ui/*`，不要改 `node_modules`。

## 不要这样装

- `pnpm add @innate/ui`（`.npmrc` 还没有作用域行时会打到 npmjs，404）
- `file:../innate-fe/packages/ui`、`link:`、消费方 `package.json` 里的 `workspace:*`
- 把 innate-fe 源码拷进本仓，或改已安装的包
- 在本仓跑 `gen` / `dev` / `prepare` / `shadcn`（那是基础仓壳与插件编排，不是装依赖）

缺组件或要改组件：到 innate-fe 用 `fe-ui`（`pnpm ui:add` / `pnpm ui:update`），回到本仓 `pnpm ui:sync:bump`。

## 故障

| 现象 | 处理 |
| --- | --- |
| 404 / 找不到 `@innate/*` | 看 `.npmrc` 有没有 `@innate:registry=http://127.0.0.1:4873/`。没有就 `pnpm ui:sync` |
| 基础仓改了，本仓还是旧代码 | 同版本发布被跳过。`pnpm ui:sync:bump`，并确认消费方 range 盖得住新版本 |
| `以下依赖不可安装` | 那个包在基础仓是 `private: true`，不能装。换可发布包，或先在基础仓去掉 private 再发布 |
| `registry start` 久不就绪 | 基础仓 `.verdaccio/verdaccio.log`；本机先 `npx --yes verdaccio --version` |
| 远端 401 | 只在用 `--url` 时需要。PowerShell：`$env:NPM_TOKEN="..."`。token 不进仓库，`.npmrc` 只用 `${NPM_TOKEN}` |
| GitHub Packages 404 | scope 必须等于组织。`@innate` 组织不可用时：`install --url https://npm.pkg.github.com --publish-as @<org>`。import 路径也要改成新 scope，CLI 只改 `package.json` 和 `.npmrc` |

本仓默认本地 Verdaccio，不要为了装 `@innate/ui` 改走 GitHub Packages。

拆开用（一般不需要，`install` 已串起来）：

```bash
bun <innate-fe>/innate-fe-cli/src/index.ts registry status
bun <innate-fe>/innate-fe-cli/src/index.ts registry publish --root <innate-fe>
bun <innate-fe>/innate-fe-cli/src/index.ts registry init --root <innate-fe> .
```

`registry publish --only ui` 只发指定包。`--url <url>` 发到远端且不再拉起本机 Verdaccio；token 顺序：`--token` → `NPM_TOKEN` → `NODE_AUTH_TOKEN` → `FE_REGISTRY_TOKEN`。

事实源：`innate-fe/docs/use-cases/05-private-registry-and-github-packages.md`、`innate-fe/innate-fe-cli/README.md` 的 `install` 一节。命令与文档不一致时以 CLI `--help` 为准。
