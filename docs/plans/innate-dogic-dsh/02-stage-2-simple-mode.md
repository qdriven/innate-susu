# 阶段 2（M2）— 小白 / 开发双模式 + dsh overlay 裁剪

目标：运行时可选的两种产品形态。simple 模式只保留「对话 + 设置」，
dsh 侧高级入口经 overlay 关闭；dev 模式与现状一致（含 M1 的内嵌控制台）。

## 模式定义

| 能力 | simple | dev |
| --- | --- | --- |
| 壳内页面 | 对话（Harness）+ 设置（M5 前为内嵌控制台简化入口） | 对话 / 总览 / 工作区 / 模型 / 模型配置 / 工具（以 `pages.ts` 注册表为准） |
| dsh overlay | `innate-simple.patch.yml` 注入 | 不注入 |
| 插件市场/高级设置 | 不可见 | 原样 |
| 首次启动 | 模式选择向导，默认 simple | 同左 |
| 切换 | 设置页底部「切换到开发模式」，即时生效（Harness 需重启时提示） | 同左 |

## 任务分解

### T2.1 模式存取（0.5 天）

- 新文件：`innate-dogic/packages/core/src/mode.ts`
  ```ts
  export type AppMode = 'simple' | 'dev'
  export function readMode(userData: string): AppMode | null   // 读 userData/mode.json
  export function writeMode(userData: string, mode: AppMode): void
  ```
- IPC：`innate:getMode` / `innate:setMode(mode)`（main/ipc.ts + preload + api.ts）。
- 验收：core 新增 vitest 单测（读写、缺省返回 null、坏 JSON 容错）；typecheck 绿。

### T2.2 首启向导 + 壳层门控（1 天）

- 改文件：`src/renderer/src/App.tsx`，新增 `ModeGate.tsx`
- 逻辑：`readMode` 为 null → 全屏二选一卡片（「简易使用 / 开发工作台」，各一句话说明）；
  选定后 `writeMode` 再进入主界面。
- 门控：tab 集按 mode 渲染（simple 不注册总览/模型/工具/控制台 tab）；
  设置页底部放模式切换入口。
- 验收：simple 下 DOM 中不存在 dev 页面节点；切换无需重装；mode.json 损坏回退向导。

### T2.3 simple 首页（对话 + 状态灯）（0.5–1 天）

- 改文件：`src/renderer/src/App.tsx` 或新增 `SimpleHome.tsx`
- 组成：
  - 状态灯：复用 `innate:status` + `innate:models`（绿=网关健康且有模型；黄=网关健康无模型；红=网关未运行）
  - 主按钮「开始对话」→ `innate:launchHarness` 启动运行时，再由 `innate:harnessShow` 嵌入当前对话标签页（不新开窗口）
  - 黄/红态给一句人话指引 +「去设置」跳设置页
- 验收：三种状态与真实网关状态一致；首次冷启动（无 profile）有等待提示而非报错。

### T2.4 裁剪 overlay（0.5 天）

- 新文件：`innate-dogic/apps/desktop/resources/innate-simple.patch.yml`
- 当前实现：`innate-dogic/apps/desktop/resources/innate-simple.patch.yml` 的 7 条目
  （deepseek-account / llm-deepseek-account / ui-settings-account / ui-brand-official /
  ui-settings-models / ui-model-selection / agent-default-model）。
- 可选追加（须先核实 id 存在）：`ui-sidebar-terminal`、`ui-sidebar-files`、`ui-sidebar-browser`
  等高级侧栏——simple 默认全关，dev 保留。
- 验证命令：`dsh --profile web --patch <overlay> --dump-config`，逐条断言 `disabled=true`。
- 验收：断言脚本 `tools/verify-overlay.ts`（已实现）可重复执行；缺失 id 即失败（R3 防线）。

### T2.5 Harness 按模式注入 patch（0.5 天）

- 改文件：`innate-dogic/apps/desktop/src/main/harness.ts`
- 参考 `innate-dogic/services/harness-runtime/src/index.ts` 的 `patchPaths` 实现：
  `args = [entry, '--profile', 'web', ...patchPaths.flatMap(p=>['--patch',p]), '--no-open','--port',port]`
  （`--patch` 是 launcher 级选项，位置不能错）。
- simple 模式注入 resources/innate-simple.patch.yml；dev 不注入；打包后路径走 `process.resourcesPath`。
- 同时核对 R5：全新 DSH_HOME 先裸 boot 再 wire 的顺序在 TS 版 harness 是否成立，不成立则补齐。
- 验收：simple 启动后 Harness 内无模型设置/账号入口；dev 启动后原样；模式切换重启 Harness 生效。

### T2.6 双模式 E2E 验收（0.5 天）

- 用真实截图回路（见 [工程规范](./engineering.md)）各跑一次 simple / dev：
  ① simple 首页状态灯正确；② Harness 内 7+ 条目不可见；③ dev 回归 checklist 全过。
- 留证：`docs/plans/innate-dogic-dsh/evidence/m2/`。
- 更新 `docs/build-path/02-innate-dogic/README.md`（模式机制）与方案网站对应段落。

## 出口标准

- 双模式切换全链路可用；overlay 断言脚本通过；测试总数较基线只增不减；
  simple 模式用户可见的高级概念（provider/路由/patch）为零。

## 实施记录（2026-10-26）

- T2.1 已完成：`core/mode.ts` 负责 `userData/mode.json` 读写，坏 JSON 回退未选择；
  IPC、preload、渲染进程类型已贯通，3 个 vitest 用例通过。
- T2.2 已完成：`pages.ts` 是页面注册表；simple 仅注册「对话 / 设置」，dev 保留
  「总览 / 模型 / 模型配置 / 工具」。首启 `ModeGate` 二选一，侧栏与顶栏应用菜单均可切换模式。
- T2.3 已完成：simple 首页显示网关/模型状态灯、启动/停止 Harness、异常时的人话指引与设置入口。
- T2.4 已完成：`resources/innate-simple.patch.yml` 收录 7 个裁剪条目；安装
  `@deepseek-ai/dsh 0.2.1-rc.2` 后，`tools/verify-overlay.ts` 真实 `dump-config` 断言 7/7 通过。
- T2.5 已完成：simple 模式按 launcher 级参数注入 `--profile web --patch <overlay>`，dev 不注入；
  打包资源走 `process.resourcesPath`。simple/dev Harness 均已真实启动并返回就绪 URL。
- Windows 启动链修正：npm 的扩展名无关 shim 不再误当 JS 入口；从 shim 旁推导全局 `node_modules`。
  Harness 优先使用真正的系统 Node（支持 `INNATE_NODE_PATH` 覆盖），避免 dsh 原生加载器拒绝 Electron 运行时；
  同时补充 spawn error 状态与日志。
- T2.6 壳内与真实 Harness E2E 已通过：`pnpm smoke:desktop -- docs/plans/innate-dogic-dsh/evidence/m2 --with-harness`
  验证双模式页面门控、magpie 内嵌控制台、Orca 顶栏、simple/dev Harness 启动与停止；
  证据为 `overview.png`、`app-menu.png`、`simple-home.png`、`console-view.png`。
  首启向导未纳入自动化，需干净 userData 手工走查。
- UI 同步完成：默认主题跟随系统；40px 图标侧栏；独立 `Titlebar.tsx` 对齐 Orca 的
  左簇「logo + ··· 应用菜单 + 当前页」和右簇「状态 + 最小化/最大化/关闭」，
  原生标题栏由 `titleBarStyle: hidden` 替换，窗口状态经 IPC 同步。
- 全量门禁通过：`pnpm build`、`pnpm typecheck`、`pnpm test`（68/68）。
