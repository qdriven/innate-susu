# 04 — 桌面端打包

## 目标

把 `@dogic/desktop`（Electron 宿主）构建并分发为 Windows 产物。这里必须区分三件事：

1. **Bundler**：把 TypeScript、React 和 workspace 源码依赖打成运行时代码。
2. **编译器**：把 TypeScript 转成 JavaScript 和类型声明，不等于单文件 bundle。
3. **分发打包器**：把 Electron、运行时代码和资源组装成目录、安装器或便携程序。

## Monorepo 构建矩阵

| 范围 | 当前工具 | 产物 | 是否为 bundle |
| --- | --- | --- | --- |
| desktop main / preload | electron-vite | `innate-dogic/apps/desktop/out/main/`、`out/preload/` | 是；`@dogic/core`、kernel、workspace 插件主进程代码从 TS 源码打入，Electron 与 Node builtins 保持外部依赖 |
| desktop renderer | electron-vite + Vite + React | `innate-dogic/apps/desktop/out/renderer/` | 是；HTML、JS、CSS、静态资源、workspace UI 插件与 `@dogic/syntax-highlighting`；Shiki 语言 grammar 生成按需加载 chunk |
| 方案网站 | Vite + React | `sites/dsh-desktop-plan/dist/` | 是；`base: './'`，可作为相对路径静态站点部署 |
| `@dogic/service-model-gateway` | `tsc` / NodeNext | `dist/*.js`、`*.d.ts`、`*.map` | **否**；是逐文件转译 |
| `@dogic/harness-runtime` | `tsc -b` / project references | `dist/*.js`、`*.d.ts`、`*.map` | **否**；保留对 model-gateway 的 workspace 依赖 |
| `tools/*.ts` | `tsx` | 仓库内直接执行 | 否；属于开发工具，不是发布产物 |

当前不需要为了“使用 Bundler”再给所有包加一层工具：桌面和网站已经由 Vite 系列完成 bundle；后端是否需要独立 sidecar 单文件，应由分发需求决定，而不是统一强绑。

## 命令与产物

先安装依赖并构建全部 workspace：

```bash
pnpm install
pnpm build
```

`pnpm build` 只生成代码产物，不生成 Electron 安装包。分发命令如下：

```bash
# ① electron-builder 免安装目录：验证标准分发结构
pnpm package:dir
#   → innate-dogic/apps/desktop/dist-package/win-unpacked/

# ② electron-builder 完整分发：NSIS 安装器 + portable 单文件
pnpm package
#   → innate-dogic/apps/desktop/dist-package/*.exe

# ③ 本机安全软件阻止 electron-builder 时的目录型便携版绕行方案
pnpm build
pnpm package:portable
#   → innate-dogic/apps/desktop/dist-package/portable/DSH InnateOS/DSH InnateOS.exe
```

`package:dir` 和 `package` 会先执行 electron-vite，再通过 `apps/desktop/scripts/package.ts` 调用 electron-builder API，不依赖 electron-builder CLI 的参数解析。该 TypeScript 入口在调用构建器前设置 `process.noAsar = true`，用于 Kimi Work 的 Electron-as-Node 宿主下兼容 ASAR 文件访问；它本身不处理 Harness 的系统 Node 选择。

`package:portable` 不是源码 Bundler，也不生成单文件安装器：它复制 Electron 二进制、`out/{main,preload,renderer}` 和 simple overlay，生成可直接运行的目录型便携程序。workspace 插件与 `@dogic/syntax-highlighting` 已经由 electron-vite 打进这些 `out` bundle，无需再复制各自的 `dist`；高亮语言 grammar 保留为 renderer 的按需 chunk，并随 `out/renderer` 一起分发。

## electron-builder 配置

`innate-dogic/apps/desktop/electron-builder.yml`：

- appId `com.innateos.dsh`，输出目录 `dist-package`。
- Windows target：`nsis`（可选择安装目录）+ `portable`。
- 应用内容：`out/**` + `package.json`，排除 sourcemap。
- `extraResources`：把 `resources/innate-simple.patch.yml` 复制到运行时 resources 根目录。

## 后端与外部二进制的分发边界

当前 Electron 分发物不自动包含 `innate-dogic/services` 产物、dsh 或 magpie：

- model-gateway 与 harness-runtime 的 `dist` 不能单独被误认为一个可搬运的 sidecar；独立部署时要同时携带两个包的产物、包元数据及生产依赖布局。
- 若后续需要单文件 sidecar，可单独评估 esbuild / tsup，并明确哪些依赖外置；这不影响当前桌面的 electron-vite 构建。
- 若要把 dsh / magpie 随安装包发布，需要通过 `extraResources` 设计二进制、运行时和 `DSH_HOME` 布局；原生依赖还需单独处理 unpack，不能只复制一个 `magpie.exe` 就声明完成。
- magpie 运行时按显式 `INNATE_MAGPIE_BIN`、打包资源、`INNATE_WORKSPACE_ROOT` 工作区、源码相对路径、PATH 的顺序解析。仓库内便携预览由 smoke 注入工作区根目录；独立分发仍需安装运行时或正式打包，不能依赖该开发回退。

## 本机验证与限制（2026-10-26）

- `pnpm build && pnpm typecheck && pnpm test`：通过；83 项测试包含统一 Surface 生命周期与安全快照、高亮、真实临时 Git 仓库中的 tracked-file status/diff，以及隔离真实用户配置的 magpie 回归测试。
- `pnpm package:dir`：已实际执行；electron-builder 进入 Windows packaging 后，在 `win-unpacked.tmp` 重命名为 `win-unpacked` 时被系统以 `EPERM` 拒绝，**未形成可验收的标准 win-unpacked 产物**。
- `pnpm package:portable`：通过，目录结构包含 `DSH InnateOS.exe`、`resources/app/out/{main,preload,renderer}` 和 `resources/innate-simple.patch.yml`。Windows 占用未变化的 `default_app.asar` 时保留该文件，仅刷新 Electron 其余文件与应用资源，不再强删整个便携目录。
- `pnpm smoke:desktop -- docs/plans/innate-dogic-dsh/evidence/monorepo-consolidation --packaged --with-harness`：通过；目录收敛后的便携程序真实启动，受管 magpie 控制台认证与真实导航通过，工作区 Surface 快照在页面重载后恢复，simple/dev 两种模式的 Harness 均在当前窗口内嵌，代码明暗高亮、文件树、Markdown、Git 面板和 diff 视图均通过。
- `pnpm package`：**尚未验证**，因此不能声称 NSIS 安装器或 portable 单文件已经可发布。

## M7 双宿主分发要求

当前文档只覆盖桌面产物。M4 形成的 `plugins/dsh-workbench` 必须有独立 manifest、构建产物、DSH 兼容版本和安装/升级/卸载验证，不能把 monorepo 源码目录当作 DSH 插件发布包。M7 还要分别验证独立 DSH 与 desktop 内嵌 DSH，确保插件只贡献叶子能力、不递归加载桌面，并明确 DSH、magpie、Node、Git 是前置依赖还是随包分发。

其他已知问题：

1. electron 二进制未下载时，`electron/dist` 为空；可执行 `node innate-dogic/apps/desktop/node_modules/electron/install.js`。
2. 首次执行 electron-builder 可能需要下载 Electron / NSIS 工具链。
3. 打包 smoke 使用独立 `userData`，避免与正在运行的源码预览实例触发单实例锁。
