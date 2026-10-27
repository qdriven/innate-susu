# 03 — innate-dogic/services：后端运行时模块

## 目标

`innate-dogic/services/` 承载与壳层无关的服务端能力：magpie 网关 sidecar 与 dsh Harness 托管。它们与 apps、plugins、packages 同属一个 workspace，但不依赖 Electron 或 React。

## 包结构

| 包 | 路径 | 说明 |
| --- | --- | --- |
| `@dogic/service-model-gateway` | `innate-dogic/services/model-gateway` | 指定 binary 的存在性检查、sidecar 进程托管、健康检查、指数退避重启、DSH 接线/恢复与用量查询 |
| `@dogic/harness-runtime` | `innate-dogic/services/harness-runtime` | Node 启动 web profile、端口选择、认证 URL 捕获、`bootBackend()` 编排 |
| （统一资产） | `innate-dogic/bin/magpie.exe` | 开发/集成用 magpie CLI（windows-amd64） |

service-model-gateway 不负责从 PATH 或打包资源自动发现 magpie；调用方必须通过 `binPath` 显式传入路径。

## 构建与运行

```bash
pnpm install
pnpm build
pnpm typecheck

# 无头后端入口（先 build；环境变量提供必需路径）
node innate-dogic/services/harness-runtime/dist/backend-cli.js
# 等价包脚本：pnpm --filter @dogic/harness-runtime start
```

| 环境变量 | 必需性 | 实际用途 |
| --- | --- | --- |
| `INNATE_MAGPIE_BIN` | 必需 | magpie 可执行文件路径 |
| `INNATE_DSH_ENTRY` | 必需 | 交给 Node 执行的 dsh 入口脚本路径 |
| `INNATE_DSH_HOME` | 必需 | 隔离或指定的 DSH 配置目录 |
| `INNATE_UI_PATCH` | 可选 | 一个或多个 patch 路径；多个路径用分号 `;` 分隔 |
| `INNATE_MODEL` | 可选 | 接线模型；未提供时 `bootBackend()` 默认 `zcode/GLM-5.3` |

就绪后 stdout 输出 `INNATE_AUTHED_URL=<url>`，阶段日志写 stderr。独立 CLI 固定用启动它的 `process.execPath` 运行 dsh；它目前**不读取**桌面宿主使用的 `INNATE_NODE_PATH`，因此应直接使用真实 Node ≥20 启动 CLI，不能拿 Electron 可执行文件替代。

`harness-runtime` 使用 TypeScript project reference 引用 `service-model-gateway`，根 `pnpm build` 会按 workspace 拓扑先构建依赖。

## 启动链路

```text
gateway       复用健康网关，或启动 magpie serve sidecar → healthcheck 就绪
harness-init  全新 DSH_HOME 先启动再停止一次，以初始化 web profile
wire          magpie dsh <model> → 写 DSH 配置；DSH_HOME 指向上述隔离/指定目录
harness       真实 Node 运行 dsh --profile web --no-open --port <port>
ready         捕获并探测带 token 的认证 URL → 输出供壳层加载
```

`bootBackend()` 返回 `stop()` 供调用方清理 Harness 与由该实例启动的 gateway。独立 CLI 在 SIGINT、SIGTERM 或 stdin 关闭时调用它。

## 与 desktop 的实际边界

两个 service 包已纳入根构建，但当前 `@dogic/desktop` 尚未直接依赖它们；桌面使用 `apps/desktop/src/main/harness.ts` 与 `launcher.ts`。M3 将先对齐 `DSH_HOME`、Node 解析、patch、日志和 Windows 进程树行为，再让 desktop 经 `plugins/dsh-runtime` 使用唯一的 service 托管实现；不能直接改调用 `bootBackend()` 就算完成，必须重新执行真实 Harness 与便携冒烟。

因此，`INNATE_NODE_PATH` 是当前 desktop Harness 启动器的配置，不是独立 `backend-cli.ts` 的配置，两者不要混用文档。

## 关键约束

1. 使用真实 Node ≥20；dsh 原生加载器可能拒绝 Electron 内置 Node。
2. 全新 DSH_HOME 先初始化 profile，再进行 magpie 接线。
3. `dsh web` 必须捕获带 token 的 URL。
4. `--patch` 是 launcher 级选项，当前实现按 `--profile web --patch <文件>` 逐个注入。
5. 当前便携桌面包不自动包含 service 产物、dsh 或 magpie；独立分发需另做运行时组装。
6. 独立 CLI 会启动进程并执行真实接线；验证时必须使用隔离 `DSH_HOME`，不能指向真实用户 `~/.dsh`。

## 验证边界

- 两个包均已纳入根 `pnpm build` 与 `pnpm typecheck`，但这只证明构建和类型通过。
- 桌面真实 Harness 链路使用 `pnpm smoke:desktop -- <输出目录> --with-harness` 验证；它验证的是 desktop 自有启动器，不等于独立 services CLI 已通过。
- magpie 插件能力由 `@dogic/plugin-model-gateway` 的测试覆盖，也不等于 `@dogic/service-model-gateway` 的进程托管已获得同等覆盖。
- 独立 `backend-cli.js` 的端到端冒烟尚待复验：必须在临时隔离 `DSH_HOME` 下验证 gateway → init → wire → ready → stop，并确认没有残留子进程。
