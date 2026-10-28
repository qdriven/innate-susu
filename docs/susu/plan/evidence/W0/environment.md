# W0.1 · 环境冻结记录

> 生成：2026-10-28（task-local-w0-1，task-workflow 试验与正式执行合一）

## 源仓 innate-labs（D:\innate-workspace\framework\innate-labs）

- git：branch `main`，**零提交（HEAD 空）**——整个仓库从未初始化提交，全部文件处于未跟踪状态。
- 源基线冻结方式：以本文件 + `migration-inventory.md` 的文件清单为快照依据；`bin/magpie.exe` 以 SHA256 指纹冻结。
- **建议**（未决，需用户确认）：在 W0.2 修完脱敏后，对 labs 做一次初始 commit，形成可引用的冻结点；此前 W0.4 拷贝以本清单为准。

## 目标仓 innate-desktop（D:\innate-workspace\framework\innate-desktop）

- git HEAD：`77305bc375a4` refine docs（2026-10-28 14:52:59 +0800）
- 工作区：6 个未提交变更（并发会话 task-workflow 产物为主：docs/sprints/task-*.md、artifacts/ 等）
- remote：github.com/qdriven/innate-susu.git（改名遗留，GitHub 侧未改）

## 工具链版本（本机实测）

| 工具 | 版本 |
| --- | --- |
| Node | v24.16.0（labs 根实测 2026-10-28） |
| pnpm | 12.15.0（labs 根实测；与 labs package.json 声明的 packageManager 一致） |
| dsh | 本机全局已安装（verify:overlay 实测确认） |
| magpie.exe | v0.1.1230（`innate-dogic/bin/magpie.exe --version`） |

## magpie.exe 指纹

- 路径：`innate-dogic/bin/magpie.exe`
- 大小：46,978,560 字节（≈44.8 MB）
- SHA256：`ff061131531c721f2292c200f49530874900f66f94f7bab28f346f90eb31914d`
- 版本：`magpie 0.1.1230`
