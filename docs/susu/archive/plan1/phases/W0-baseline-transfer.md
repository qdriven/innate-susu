# W0 · 基线整树迁入

> 预估 0.5–1 天 · 依赖：无 · 状态：**下一执行项**
> 目标：把 labs 的 M0–M2 可跑基线原样搬进本仓，四门禁与 labs 同绿。**不改行为、不改布局、不加 Surface、不边搬边重构。**

## 任务卡

### W0.1 整树拷贝

- **做什么**：从 `D:\innate-workspace\framework\innate-labs` 拷入本仓（保持相对结构）：
  - `innate-dogic/` 全树：`apps/{desktop,shell}`、`packages/{core,kernel,sdk,syntax-highlighting}`、`plugins/{model-gateway,workspace}`、`services/{harness-runtime,model-gateway}`（后者包名 `@dogic/service-model-gateway`）、`tsconfig.base.json`、`bin/magpie.exe`（45MB，二进制直接拷）
  - `tools/` 全部：`check-typescript.ts`、`smoke-desktop.ts`、`verify-overlay.ts`、`package-portable.ts`、`start-all.ts` + `tsconfig.json` + `package.json`
  - `innate-project-canvas/`（含 `schema/project-snapshot.schema.json`；不含其 `node_modules`/`dist`）
  - **排除**：一切 `node_modules`、`out/`、`dist/`、`dist-package/`、`release/`；labs 的 `sites/`、`prototypes/`、`references/`、`plugins/`（ZCode 市场）、`.agents/`、`docs/`
- **不做什么**：不重命名包、不改目录结构、不删 `@dogic/shell`（虽然不迁它的依赖方，但整树原则下先带过来，避免挑选造成基线漂移；Q 后清理）

> 修正：`@dogic/shell` 若整树带入，`pnpm -r` 会构建它。二选一并记录选择：(a) 整树带入并在其 package.json 加 `private` 保持现状；(b) 不拷 `apps/shell`，在 02 模块分析标注偏差。默认 (a)。

### W0.2 workspace 接线与依赖安装

- **做什么**：
  - 根 `pnpm-workspace.yaml` 合并为：
    ```yaml
    packages:
      - 'apps/*'
      - 'packages/*'
      - 'innate-dogic/apps/*'
      - 'innate-dogic/packages/*'
      - 'innate-dogic/plugins/*'
      - 'innate-dogic/services/*'
      - 'innate-project-canvas'
    onlyBuiltDependencies:
      - electron
    verifyDepsBeforeRun: false
    minimumReleaseAgeExclude:
      - "@innate/ui@0.1.1"
    ```
  - 根 `package.json`：保留本仓现有 `dev/build/ui:sync*` 脚本与 `@innate/ui` 依赖；并入 labs 的 `build/test/typecheck/check:typescript/dev/dev:shell/start/smoke:desktop/verify:overlay/package*` 脚本、devDeps（tsx、typescript、vitest、@types/node）、`packageManager: pnpm@12.15.0`、`engines.node>=20`。`dev` 语义二选一：susu-web 的 vite 或 desktop——**建议** `dev` 保持 `@susu/web`，`dev:desktop` 指向 `@dogic/desktop`（labs 的 `dev` 改名 `dev:desktop`），并在脚本注释注明。
  - 根 `vitest.config.ts`、`tsconfig.base.json`、`.gitignore` 按 labs 版本合入（保留本仓已有忽略项）。
  - `.npmrc` 保持 `@innate:registry=http://127.0.0.1:4873/` 不变（`@dogic/*`、`@innate-labs/*` 全走 workspace/公共源）。
  - `pnpm install`；electron 二进制缺失时跑 `node innate-dogic/apps/desktop/node_modules/electron/install.js`。
- **如何验证**：`pnpm install` 无 workspace 报错；`pnpm ls -r --depth -1` 列出全部包含 `@susu/web` 与 `@dogic/*`。

### W0.3 改名坏点收口（配置层，不动代码行为）

- **做什么**：
  - 根 `package.json`：`name` 改 `innate-desktop`；`ui:sync` / `ui:sync:bump` 的 `--dir` 改为 `D:/innate-workspace/framework/innate-desktop`（或改为基于 `npm_prefix`/相对定位，避免再次硬编码绝对路径）。
  - `README.md`：标题与结构段更新为 innate-desktop，补「双轨」说明：`apps/susu-web`（Web 应用）+ `innate-dogic/`（桌面产品树，W0 迁入）。
  - `docs/README.md` 顶部加一行入口：迁移与产品化执行计划见 [`docs/susu/plan1/README.md`](../plan1/README.md)。
- **不做什么**：不改 git remote（GitHub 侧改名外部操作）；不改任何产品代码。

### W0.4 门禁对齐与冒烟

- **做什么**：
  - `tools/check-typescript.ts`：扫描根 `['innate-dogic','sites','tools']` → `['innate-dogic','tools','apps','packages']`，并对缺失目录跳过（现在 `readdirSync` 遇不存在目录会抛错）；`apps/susu-web`、`innate-project-canvas` 纳入 TS-only 约束。
  - 逐项跑：`pnpm build` → `pnpm typecheck` → `pnpm test`（**对照 labs 基线 83 项**，数量一致；`passWithNoTests` 已开，注意 apps/services 零测试是现状不是目标）。
  - `pnpm smoke:desktop`（需本机 dsh 与 `~/.dsh`；真机依赖核对：系统 Node 可解析、magpie.exe 在 `innate-dogic/bin/`、`resources/innate-simple.patch.yml` 随 desktop 迁入）。
  - `pnpm verify:overlay`（真实 dsh 入口校验 simple patch）。
  - `pnpm package:portable` 便携打包一次并人工启动冒烟（对话、magpie、只读工作区三项）。
  - `pnpm ui:sync`（修复后）跑一次确认幂等不破坏 `@innate/ui` 安装。
- **如何验证**：以上每步输出留存 `docs/susu/evidence/W0/`（测试汇总行、smoke 截图、portable 目录清单）。**任何一步不过，禁止开 W1。**

### W0.5 文档与执行源切换

- **做什么**：
  - `docs/innate-dogic/sprints/README.md` 状态板顶部加标注：「本状态板已由 `docs/susu/plan1/` 取代为执行源；P 系列（P0–P7）后置不删除；M4/M5/S5/S6 任务卡仍有效」。
  - `docs/innate-dogic/plans/README.md` 顶部加同样的后置标注（指向 plan1）。
  - `innate-labs` 仓：README 与 `docs/plans/susu-migration.md` 顶部加「已迁出并冻结」声明（labs 仓内操作，cherry-pick 模式说明见 03 §3）。
  - plan1 状态板回写 W0 状态。
- **如何验证**：新会话按本仓 README → docs/README.md → plan1 能直达状态板；旧 P 状态板无「下一执行项」残留。

## 出口标准（全绿才开 W1）

1. `pnpm build && pnpm typecheck && pnpm test` 与 labs 同绿（83 项）。
2. `pnpm smoke:desktop` + `pnpm verify:overlay` 通过；便携包含三项行为冒烟。
3. `pnpm ui:sync` 幂等成功；`check:typescript` 新扫描根通过。
4. 证据入 `docs/susu/evidence/W0/`；状态板与旧文档标注完成。
