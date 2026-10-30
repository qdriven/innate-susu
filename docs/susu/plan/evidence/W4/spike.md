# W4.1 PTY 技术 spike 证据

日期：2026-10-29

## 目的

验证 node-pty 1.1.0（N-API 预编译二进制）在 Electron 43.7.11 主进程可加载、可 spawn、可读写、可 resize、退出码可回收、进程树可回收——为 TerminalService 选型定性。仅跑只读命令（echo），不触碰任何写操作。

## 命令

```bash
cd innate-dogic
node apps/desktop/node_modules/electron/install.js   # 下载 Electron 二进制（227MB）
node apps/desktop/node_modules/electron/dist/electron.exe plugins/terminal/scripts/spike-pty.cjs
```

## 结果

**退出码 0**，8 项全部通过：

| 步骤 | 结果 |
| --- | --- |
| load node-pty | ✓ 预编译 N-API 二进制直接加载，无需 rebuild |
| spawn cmd.exe | ✓ pid=38780 |
| echo output | ✓ 回环输出 `spike-ok` |
| utf8 output | ✓ 中文输出正常 |
| resize | ✓ 80x24 → 100x30 |
| exit code 0 | ✓ 退出码 0 可回收 |
| exit code 3 | ✓ 非零退出码 3 可回收 |
| process tree reclaim | ✓ taskkill /T /F 后 pid 消失 |

原始输出（含 ANSI 转义序列，属正常 PTY 渲染字节，非敏感信息）：

```
[spike] ✓ load node-pty
[spike] ✓ spawn cmd.exe — pid=38780
[spike] ✓ echo output
[spike] ✓ utf8 output
[spike] ✓ resize — 100x30
[spike] ✓ exit code 0 — 0
[spike] ✓ exit code 3 — 3
[spike] ✓ process tree reclaim — pid=50632
[spike] ✓ overall
```

## 结论

- node-pty 预编译二进制与 Electron 43.7.11 兼容（N-API ABI 稳定），打包时以 `asarUnpack` 随包分发即可，无需现场编译。
- 进程树回收（Windows `taskkill /T /F`）验证通过，满足 W4.7 便携回收验收前提。
- 便携形态的真实命令验收（打包后运行）在 W4.7 完成（见 `portable.md`）。
