---
name: innate-dsh-playbook
description: innate-desktop 分场景处理手册。当在本仓库做 UI 改动、新增页面插件、改 magpie 接线/网关、调试启动、运行冒烟、打包发布或排障（黑屏/401/未接线/测试失败）时触发，给出对应流程与逃生口，避免每类问题重新排查。
---

# innate-desktop 分场景处理手册

> 2026-10-28 W0.8 自 labs 迁回。W0 已完成：产品树/工具在本仓可跑（六门禁+便携冒烟全绿）。排障场景 E 新增：门禁/冒烟失败先巡检 magpie 孤儿进程（tasklist+taskkill，W0.2 期间 4 例实测）。场景 G 任务编号指向 docs/susu/plan/，证据入 docs/susu/plan/evidence/<阶段>/。

先读 `docs/susu/plan/README.md`（唯一执行源）与 `docs/CONTEXT.md` 获取包地图与硬约束。所有场景出口：`pnpm build && pnpm typecheck && pnpm test` 全绿。

## 场景 A：改桌面 UI（样式/布局/页面）

- 只取 `renderer/src/styles.css` 的 token（颜色/字阶 10/11/12/13px）；明暗跟随系统 `prefers-color-scheme`，不写死主题。
- 布局沿用 titlebar + sidebar + content；页面要可整体摘除（hide/detach 即移除，参考 ConsolePage）。
- 自绘 Orca 顶栏时主窗口设 `titleBarStyle: hidden`，拖拽区与按钮 `no-drag` 分开；
  最小化/最大化/关闭走 main IPC，最大化图标须同时消费启动查询和 `maximize/unmaximize` 推送。
- 验证：`pnpm --filter @dogic/desktop build` 后 `pnpm smoke:desktop`，看截图再交付。

## 场景 B：新增内嵌页面（WebContentsView 类）

- 主进程视图 + IPC（show/hide/bounds）+ preload/api 类型 + 渲染进程占位 div（ResizeObserver）。
- 外部链接一律 `setWindowOpenHandler` deny → `shell.openExternal`。
- 主页面 CDP 截图不合成子视图：验证须对视图 target 单独截图。

## 场景 C：改 magpie 接线 / 网关配置

- 优先复用 `MagpieCli`（providerAdd/providerTest/models/wireAgent/unwireAgent/quota），不要新写 CLI 调用。
- 接线由当前 `MagpieCli` / magpie CLI 实现负责；断开恢复用 `magpie dsh default`（原子），不要再引用已移除的验证项目。
- 集成测试需 `innate-dogic/bin/magpie.exe` 与本机 magpie 环境；缺 binary 会挂 8 个测试。

## 场景 D：启动调试

- 开发：`pnpm dev`；生产冒烟：`pnpm --filter @dogic/desktop build && pnpm smoke:desktop`。
- 状态判读：总览页「集成检查」逐项给出 hint；网关 3425 探活用 `/api/hello`，控制台 3430 用 `/api/agents/`。
- Harness 启动需要 dsh 已安装（`npm i -g @deepseek-ai/dsh`）且已接线。

## 场景 E：排障速查

| 症状 | 处理 |
| --- | --- |
| 内嵌视图黑屏/截图异常 | 主进程 `disable-features=CalculateNativeWinOcclusion`（已内置，勿删） |
| 控制台 401 / 登录页 | URL 须带 `?k=`；走 `ensureMagpieConsole()` 获取，不要手拼裸 URL |
| 接线不生效（baseURL 被忽略） | DSH_HOME 未初始化：先裸 boot 生成 profiles/ 再 wire |
| 壳起不来、import electron 报 SyntaxError | 宿主注入了 ELECTRON_RUN_AS_NODE：启动脚本 unset |
| electron/dist 为空 | `node innate-dogic/apps/desktop/node_modules/electron/install.js` |
| 打包 EBUSY（AV 锁定） | `pnpm package:portable` 手动组装绕行 |
| dsh 报 unknown option --patch | `--patch` 放 launcher 级：`--profile web --patch <file>` |
| dsh 已安装但入口启动失败 | Windows 排除扩展名无关 shim/.cmd，解析 npm 全局包的 `lib/bin.js` |
| dsh 报 unsupported Electron runtime fingerprint | Harness 必须用真实 Node；优先 `INNATE_NODE_PATH` 或系统 node.exe，不要设 ELECTRON_RUN_AS_NODE |

## 场景 F：打包发布

按 `docs/original/build-path/04-desktop-packaging/README.md` checklist：全量门禁 → `package:dir` 冒烟 →
`package`（AV 锁定时 `package:portable`）→ 版本号与文档同步。

## 场景 G：里程碑开发

任务以 `docs/susu/plan/phases/` 的 W/Q/R 编号为准；执行经 task-workflow（docs/sprints/）建 task，完成更新 plan README §4 状态板与投影（audit→sync→board），证据存 `docs/susu/plan/evidence/<阶段>/`，提交信息带任务编号。
