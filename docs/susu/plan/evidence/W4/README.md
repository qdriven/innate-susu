# W4 阶段交付证据

日期：2026-10-29 起（随任务推进更新）

## 完成范围

- W4.1 PTY 技术 spike：node-pty 预编译二进制在 Electron 43.7.11 主进程全链路验证（见 `spike.md`）。
- W4.2 terminal 与 process capability 契约：通用 handler registry 首版 + terminal 契约类型与 preload 窄通道（见 `contract.md`）。
- W4.3 主进程 TerminalService：会话生命周期、root 安全注入、shell 受控、env 白名单、环形截断、进程树回收、desktop main 组合（见 `service.md`）。
- W4.4 renderer Terminal Surface：TerminalSessionStore/TerminalPanel（xterm.js + fit、标签切换保留、退出重开、dispose-token 竞态守卫）、desktop TerminalPage + catalog + provider、simple 门控（见 `renderer.md`）。
- W4.5 root 订阅语义：setRoot 切换语义契约验证——活会话保持原 cwd、新会话用新 root、失效/无效 root 负路径、workspaceId 绑定当前 root（见 `root.md`）。
- W4.6 受控 process:execute：profile 白名单（userData 可编辑）+ 结构化请求 + 参数数组禁拼接、cwd 强制 root 子树防 `..` 逃逸、超时/取消（taskkill 进程树回收）、输出环形截断、审计事件脱敏、ack/result 分离窄通道、simple 模式门控（见 `process.md`）。
- W4.7 安全便携与故障回收：node-pty 原生资源纳入便携包（pnpm 符号链接 dereference 跟随拷贝）、PTY resize 通道与标签关闭生命周期冒烟、伪造 capability 拒绝、并发上限 8、崩溃路径（外部 taskkill）收尾不挂起、spawn 失败路径（见 `portable.md`）。

## 门禁结果

- `pnpm --filter @dogic/core test`：handler-registry 10/10 通过（注册/并列/默认/审批挂钩/热插/键空间隔离）。
- `pnpm --filter @dogic/plugin-terminal test`：**44/44** 通过（契约 15 + 服务 12 + W4.5 root 订阅 4 + W4.6 process 契约 10 + W4.7 并发上限/崩溃路径/spawn 失败 3）。
- `pnpm --filter @dogic/plugin-terminal typecheck`/`build`、`pnpm --filter @dogic/desktop typecheck`：通过（plugin dist 重建后 desktop 可见新契约）。
- `pnpm --filter @dogic/desktop test`：**82/82** 通过（13 文件；W4.6 新增 `src/main/ipc.test.ts` 3 项：dev 转发服务端、simple 全拒且不触达服务端、userData 白名单启动加载）。
- `pnpm --filter @dogic/desktop build`：通过，node-pty 在 main bundle 中 externalize（`require("node-pty")`）。
- 真实桌面冒烟（`tools/smoke-desktop.ts`）：退出码 0，`[smoke] OK`；W4.6 冒烟证据见 `smoke-w4-6/`（process profile 注册与白名单、process:execute 正路径受理→结果→stdout、负路径四件套全拒、simple 模式门控全拒；含终端 PTY、工作区、主题等既有回归）。
- W4.7 冒烟（dev）：退出码 0，`[smoke] OK`，证据见 `smoke-w4-7/`（resize 通道、标签关闭生命周期、伪造 capability 拒绝、process 门控无回退）。
- W4.7 全量门禁 `pnpm verify`（递归 typecheck + tools tsc + check:typescript + 全量 test）：退出码 0，全绿；`tools/check-typescript.ts` 增加 `spike-pty.cjs` 白名单豁免（W4.1 诊断脚本由 electron.exe 直接加载，不经构建管线）。
- W4.7 便携冒烟（`tools/smoke-desktop.ts --packaged`）：退出码 0，`[smoke] OK`，证据见 `smoke-w4-7-portable/`（PTY 从便携包 node-pty 解析加载、process 门控全过、标签生命周期与 capability 伪造检查无回退）。

## 安全结论

- renderer 不提交 shell 命令拼接、绝对路径、进程句柄或 Node 对象；契约层白名单校验（未知 shell profile、伪造 providerId/kind、绝对 command 路径）在进入主进程服务前即拒绝。
- 认证 URL/token 不进入日志、快照、测试夹具或证据（spike 只跑只读 echo 命令）。
