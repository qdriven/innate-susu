# W0.6 · 行为矩阵对照（labs 源基线 vs innate-desktop 迁入后）

> 实测日：2026-10-28 晚 · 对照基准：labs W0.1/W0.2 六门禁记录（commands.md 前两节）

| # | 行为项 | labs 基线 | desktop 迁入后 | 一致 |
| --- | --- | --- | --- | --- |
| 1 | 单实例锁/窗口创建（隐藏标题栏、contextIsolation、preload） | smoke 通过 | smoke 启动即验证（同一 main 代码，diff=0） | ✅ |
| 2 | simple 模式门控（nav=对话/设置；overlay 注入） | simple nav ['对话','设置'] | smoke simple 门控通过 | ✅ |
| 3 | simple overlay 裁剪 | overlay 7/7 disabled=true | desktop 根 verify:overlay 7/7（无参自解析 dsh） | ✅ |
| 4 | dev 模式导航（对话/总览/工作区/模型/模型配置/工具） | dev nav 六项 | smoke dev nav 六项 | ✅ |
| 5 | magpie 控制台受管认证（?k= + 独立端口） | 控制台认证通过 | smoke「受管 magpie 控制台认证与真实内容通过」 | ✅ |
| 6 | Harness 启动/就绪/嵌入（系统 Node + url?token 捕获） | 就绪+对话可用 | smoke 对话链路通过 | ✅ |
| 7 | Surface 切换不重载（URL 未变不 reload） | M2 验证 | smoke 含 Surface 断言；代码 diff=0 原语义 | ✅ |
| 8 | 工作区：选根/文件树/文本/Markdown/图片预览 | 通过 | smoke 文件树/Markdown/快照恢复通过 | ✅ |
| 9 | 只读 Git status/diff | 通过 | smoke workspace-git 通过 | ✅ |
| 10 | 工作区 Surface 安全快照与重启恢复 | 通过 | smoke「工作区 Surface 安全快照与重启恢复通过」 | ✅ |
| 11 | **日志脱敏（W0.2 新行为，desktop 生效）** | 修复后 labs 全绿 | desktop 源含同一修复（diff=0）；smoke 输出 grep 原始 token 0 处 | ✅ |
| 12 | magpie/DSH 进程退出回收 | 通过 | smoke 结束后 tasklist 无 magpie/electron 残留（见 commands.md 巡检行） | ✅ |

差异清单：**无**。所有差异在本阶段清零；未发现需回退 labs 修复的项。
