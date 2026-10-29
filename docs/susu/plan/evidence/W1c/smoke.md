# W1c 真实桌面冒烟证据

## 开发形态（`electron-vite` 产物 + `out/`）

命令：

```bash
node node_modules/tsx/dist/cli.mjs tools/smoke-desktop.ts --with-harness docs/susu/plan/evidence/W1c/smoke
```

结果：**退出码 0**（`[smoke] OK`）。截图、DOM 与 bounds 产物在 `smoke/`（按仓库规则不入库，命令可重建）。

| 断言 | 结果 |
| --- | --- |
| 三栏壳 + Orca 顶栏（3×46 控件、应用菜单、最大化、双击还原） | 通过 |
| 窗口 resize / 恢复（原生 SetWindowPos + GetWindowRect） | 通过 |
| 明暗主题（`.dark`、语义 token、Geist） | 通过 |
| magpie 控制台真实内容与认证 | 通过 |
| **统一中栏槽标签条**（`surface-tabstrip` 渲染 `magpie 控制台`） | 通过 |
| **伪造 providerId 被拒**（`surfaceShow` 返回 `ok:false`，不创建视图） | 通过 |
| **provider 未就绪被拒**（Harness 未运行时 `surfaceShow` 返回 `ok:false`） | 通过 |
| 控制台 hide/show 复用同一 target（URL 未变 = 未 reload） | 通过 |
| simple/dev 门控 | 通过 |
| Harness 启动并嵌入统一中栏槽 | 通过（port 54889，Harness 就绪） |
| **多 Surface 标签并存** | 通过：`magpie 控制台 | DeepSeek Harness` |
| **交替切换不重载**（Harness URL 未变 + 存活标记仍在） | 通过 |
| **关闭一个不影响另一个**（关闭控制台后其 target 消失、Harness 仍在） | 通过 |
| **renderer 状态与 Surface 快照无 token/认证 URL** | 通过 |
| Harness 跨导航/重载存活、显式停止 | 通过 |
| 工作区文件/Markdown/Git diff 与安全快照恢复 | 通过 |

## 便携形态（`pnpm package:portable` 组装目录）

命令：

```bash
pnpm package:portable
node node_modules/tsx/dist/cli.mjs tools/smoke-desktop.ts --packaged --with-harness docs/susu/plan/evidence/W1c/portable-smoke
```

结果：**退出码 0**（`[smoke] OK`）。

| 断言 | 结果 |
| --- | --- |
| 三栏壳、顶栏、resize、明暗主题 | 通过 |
| magpie 控制台真实内容与认证 | 通过 |
| 统一中栏槽标签条 | 通过（`magpie 控制台`） |
| 伪造 providerId / 未就绪 provider 被拒 | 通过 |
| 控制台 hide/show 复用同一 target | 通过 |
| simple/dev 门控 | 通过 |
| Harness 启动并嵌入统一中栏槽 | 通过（port 64976） |
| **多 Surface 标签并存** | 通过：`magpie 控制台 | DeepSeek Harness` |
| **交替切换不重载 / 关闭隔离** | 通过 |
| **renderer 状态与快照无 token/认证 URL** | 通过 |
| Harness 跨导航/重载存活、显式停止回收 | 通过（`stopHarness: true`） |
| 工作区文件/Markdown/Git diff 与安全快照恢复 | 通过 |

## 环境备注

- 本机 magpie 控制台冷启动实测 40–160s（杀软扫描 + bun 冷启），dsh 冷启动 ~25s；
  冒烟用 `INNATE_MAGPIE_CONSOLE_TIMEOUT_MS` / `INNATE_HARNESS_READY_TIMEOUT_MS` 放宽上限，产品默认值不变（15s / 60s）。
- 冒烟结束后会回收本次拉起的 dsh web（detached 进程不在 electron 进程树内）。
- 冒烟脚本的文本预览断言用包名（`innate-desktop`）而不是仓库目录名，工作区副本目录名不同也不会误报。
