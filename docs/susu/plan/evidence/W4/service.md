# W4.3 主进程 TerminalService

日期：2026-10-29

## 交付物

### TerminalService（`plugins/terminal/src/main/index.ts`）

按 terminalId 管理 PTY 会话（node-pty 1.1.0）：

- **生命周期**：create/input/resize/close/dispose；deactivate（标签切换）不杀会话，close 才终止；应用退出统一回收（dispose 等待进程树回收完成）。
- **cwd 安全**：只接受宿主 `setRoot` 注入的当前工作区 root（realpath + stat 双重校验）；spawn 前重新 stat，root 被删除/失效时创建失败并给 hint，不回退到任意系统目录；descriptor.workspaceId 与当前 root id 不匹配拒绝。
- **shell 受控**：renderer 只提交 profile 引用 id，shell 可执行与参数数组由服务端 profile 注册表解析（内置 default = COMSPEC/cmd.exe）；`registerProfile` 重复注册显式失败、空 shell 拒绝。
- **环境变量白名单**：只注入 PATH/HOME/SYSTEMROOT/COMSPEC/TERM 等必要项，secret env（如 SECRET_TOKEN）与自定义 env 一律不进入 PTY 环境。
- **资源上限**：每会话输出环形缓冲（默认 1MB，超出丢弃最旧保留尾部供 scrollback 快照）；事件按 64KB 分片转发；会话数上限 8。
- **终态语义**：exit 事件后忽略后续输出事件；close 幂等（重复关闭显式失败）；关闭后 input 拒绝。
- **Windows 进程树回收**：close/dispose 走 `taskkill /pid <pid> /T /F`（W4.1 spike 验证路径）。

### Desktop main 组合（W4.3 "desktop main 组合"）

- `apps/desktop/src/main/ipc.ts`：TerminalService 实例化 + 事件出口窄包装（`innate:terminal-event`）；`innate:terminalCreate/Input/Resize/Close` 四通道；root 同步（启动时读已保存 root、workspacePickRoot/workspaceGetRoot 环境变量回退时同步 setRoot）。
- `apps/desktop/src/preload/index.ts`：TerminalApi 窄通道（`terminalCreate/terminalInput/terminalResize/terminalClose/terminalOnEvent`），`satisfies WorkspaceApi & TerminalApi`。
- `electron.vite.config.ts`：`@dogic/plugin-terminal`（shared/main）别名 + bundled 列表；node-pty 为 desktop 直接依赖，构建时自动 externalize（已验证 `out/main/index.js` 为 `require("node-pty")`，无内联绑定代码）。

## 验证

- `pnpm --filter @dogic/plugin-terminal test`：**27/27** 通过（契约 15 + 服务 12：真命令输出与退出码、中文输出、大数据环形截断+尾部保留、resize 正负路径、重复 id、无 root、root 替换后旧会话保持、关闭/重复关闭/关闭后输入拒绝、dispose 统一回收、profile 注册表、env 白名单、孤儿进程回收）。
- `pnpm --filter @dogic/plugin-terminal typecheck`：通过。
- `pnpm --filter @dogic/desktop typecheck`（node+web）：通过。
- `pnpm --filter @dogic/desktop test`：53/53 通过（无回退）。
- `pnpm --filter @dogic/desktop build`：通过，node-pty externalize 验证通过。
- 真实桌面冒烟（`tools/smoke-desktop.ts docs/susu/plan/evidence/W4/smoke-w4-3`）：退出码 0，`[smoke] OK`——壳、中栏 Surface 标签、工作区 Surface、simple/dev 门控全部通过，terminal 服务接线无回归。

## 契约修正（W4.2 → W4.3 期间发现并修复）

1. **profile 引用化**：`TerminalDescriptor.profile` 从携带 shell/args 改为只携带 id（`TerminalProfileRef`）；shell 可执行一律由服务端注册表解析。修复了 renderer 可劫持 shell 路径的缺口。
2. **白名单分层**：`parseTerminalProfileRef`/`parseTerminalProfile` 只做结构校验；"未知 profile" 的成员裁决在服务端 create 时执行（为 W4.6 userData 可编辑白名单预留）。
3. **绝对路径 command 拒绝**：`parseProcessProfile` 拒绝绝对路径/UNC command（`C:/...`、`/...`），防根子树逃逸。

## 安全结论

- renderer 无通用 shell/string execute 通道；Node/PTY 对象不进入 renderer；进程句柄不跨 IPC。
- 认证 URL/token 不进入日志、快照、测试夹具或证据。
