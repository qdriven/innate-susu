# 02 — innate-dogic：前端（插件内核 + 桌面宿主）

## 目标

`innate-dogic/` 是唯一产品工程，承载应用、可复用共享包、插件与后端服务。本页聚焦 apps、packages 和 plugins；后端服务见 `03-dogic-services`。

## 包结构

| 包 | 路径 | 说明 |
| --- | --- | --- |
| `@dogic/core` | `packages/core` | magpie 网关发现、dsh 接线状态、集成检查、模式与共享 Surface 生命周期 |
| `@dogic/kernel` | `packages/kernel` | 插件内核：DI 容器、生命周期管理、模块加载器、注册表、workbench/settings 宿主 |
| `@dogic/sdk` | `packages/sdk` | 插件 SDK：ModelGateway 契约接口 + Mock 实现 + 契约测试 |
| `@dogic/plugin-model-gateway` | `plugins/model-gateway` | shell 的 magpie 模型网关插件：binary 探测、CLI 封装、进程托管、直连降级 |
| `@dogic/plugin-workspace` | `plugins/workspace` | desktop 的工作区插件：文件、Markdown、高亮与只读 Git |
| `@dogic/shell` | `apps/shell` | 独立 Node/Web 壳：装配内核 + model-gateway 插件 |
| `@dogic/desktop` | `apps/desktop` | 当前 Electron 主产品：组合 core、kernel 与 workspace 插件 |

## 构建步骤

```bash
pnpm install                     # 根目录一次安装

# 按 workspace 依赖拓扑构建 apps、packages、plugins、services 与方案网站
pnpm build                       # packages/plugins/services/shell → tsc；desktop/网站 → Vite 系列

# 质量门禁
pnpm typecheck                   # 全部 workspace 类型检查 + tools 类型检查 + TypeScript 源码约束
pnpm test                        # 运行各包已声明的测试；数量以当次输出为准
```

## 开发运行

```bash
# Electron 桌面宿主（electron-vite dev，HMR）
pnpm dev                         # = pnpm --filter @dogic/desktop run dev

# Node/Web shell
pnpm build                       # 干净环境先构建 shell 的内部依赖
pnpm dev:shell                   # 只显式重新构建 @dogic/shell，再运行 dist/index.js
```

`dev:shell` 不会替 shell 重新构建 kernel、sdk 和 model-gateway 插件；仅修改 shell 自身时可单独使用，干净 checkout 或依赖源码变化后先执行根 `pnpm build`。

## 依赖关系

本节箭头统一为：**`A → B` 表示“A 依赖 B”**。

```text
@dogic/shell
   ├─→ @dogic/sdk
   ├─→ @dogic/kernel ─→ @dogic/sdk
   └─→ @dogic/plugin-model-gateway ─→ @dogic/kernel ─→ @dogic/sdk

@dogic/desktop
   ├─→ @dogic/core
   ├─→ @dogic/kernel ─→ @dogic/sdk
   └─→ @dogic/plugin-workspace
          ├─→ @dogic/core
          ├─→ @dogic/kernel ─→ @dogic/sdk
          └─→ @dogic/syntax-highlighting

@dogic/harness-runtime ─→ @dogic/service-model-gateway
```

`@dogic/desktop` 通过 electron-vite alias 直接打包 core、kernel、workspace 插件与 syntax-highlighting 的 **TS 源码**，而不是依赖它们的 `dist` 产物。具体 alias 同时覆盖 `@dogic/core/surface`、`@dogic/kernel/browser`、workspace 的 main/plugin/shared 入口；配置以 `apps/desktop/electron.vite.config.ts` 为准。

## 当前验证基线（2026-10-26）

- `pnpm build`、`pnpm typecheck`、`pnpm test`：已验证通过，共 83 项测试。
- magpie 真实二进制只读集成覆盖 version、providers、目录/模型列表和 quota；wire/default 通过 mock 或隔离 `DSH_HOME` 验证，不对真实用户配置执行接线/断开。
- 目录型便携版的真实 magpie 控制台、Harness、workspace 与 Git 冒烟已通过；标准 electron-builder `dir`、NSIS 和单文件 portable 的状态见 `04-desktop-packaging`。
- 独立 services CLI 的端到端启动不属于上述桌面冒烟，仍需用隔离 `DSH_HOME` 单独复验。

已知坑：插件集成测试用 `innate-dogic/bin/magpie.exe` 真实二进制
（`plugins/model-gateway/src/model-gateway.test.ts` 中 `../../../bin/magpie.exe`），
无该文件时真实二进制集成测试失败。

## M1 实施记录（2026-10-26）：内嵌 magpie 控制台 + orca 风格 UI

- 「模型配置」页内嵌 magpie 控制台（WebContentsView），不再外跳浏览器；
  启动链：`ensureMagpieConsole()`（复用/托管 `magpie web`，稳定 `?k=` 认证 key）。
- 控制台认证、黑屏（CalculateNativeWinOcclusion）、截图验证等结论见
  `docs/plans/innate-dogic-dsh/01-stage-1-embed-console.md`。
- UI 采用 orca 规范：titlebar + sidebar、单色 token、字阶 10/11/12/13px。
- 冒烟工具：`pnpm smoke:desktop`（TS 实现的 CDP 截图 + 视图内容断言）。
- electron 二进制若缺失：`node innate-dogic/apps/desktop/node_modules/electron/install.js`。

## M2 实施记录（2026-10-26）：双模式与 Orca 应用铬面

- `packages/core/src/mode.ts` 持久化 `simple / dev`；`renderer/src/pages.ts` 统一注册页面，
  simple 只显示「对话 / 设置」，dev 显示完整工作台，首启由 `ModeGate` 选择。
- simple 首页复用状态与 Harness IPC；simple Harness 启动参数包含 `innate-simple.patch.yml`，dev 不注入。
  dsh `0.2.1-rc.2` 下 overlay `dump-config` 7/7 断言通过，simple/dev Harness 均真实启动成功。
- Windows 启动器避开 npm 脚本 shim，解析真实 `lib/bin.js`；Harness 优先使用系统 Node，
  可用 `INNATE_NODE_PATH` 显式指定，避免 Electron 内置 Node 与 dsh 原生加载器不兼容。
- UI 默认通过 `prefers-color-scheme` 跟随系统，采用 40px 图标侧栏。
- `renderer/src/Titlebar.tsx` 对齐 Orca：左侧 logo、`···` 应用菜单、当前页；
  右侧 magpie 状态、最小化/最大化/关闭。主窗口使用隐藏原生标题栏，窗口动作与最大化状态走 IPC。
- 当时验证：`pnpm build / typecheck / test` 全绿（68/68，历史数量）；M2 冒烟覆盖双模式、内嵌控制台、
  顶栏与真实 Harness 启动，截图位于 `docs/plans/innate-dogic-dsh/evidence/m2/`。后续测试总数以当前基线为准。

## M3–M7：双向宿主主线（计划，尚未实施）

- M3：desktop 通过 `plugins/dsh-runtime` 使用唯一 `services/harness-runtime`，不再维护私有 Harness 托管。
- M4：`plugins/dsh-workbench` 进入真实 DSH，提供文件、Markdown、高亮与只读 Git；现有 dogic 工作区继续保留。
- M5：模型来源与默认模型设置同时进入 dogic 和 DSH，magpie 仍统一执行接线。
- M6–M7：新 Surface 按场景增加第二宿主适配，桌面与 DSH 插件分别打包验收。
- 复用纯 UI/类型与测试场景，允许按宿主重写薄实现；不允许递归加载完整 desktop。任务以 `docs/sprints/` 为准（规格与上下文见 `docs/plans/innate-dogic-dsh/`）。
