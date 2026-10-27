# dsh 部分技术栈说明

本文说明当前单一 monorepo 中 dsh（DeepSeek Harness）与 magpie 相关部分的技术和实际接线。

## 1. 核心对象

- `@deepseek-ai/dsh`：DeepSeek Harness CLI，要求 Node ≥20。
- 两种形态：`dsh headless`（CLI 会话）与 `dsh web`（Web UI，需要 token 认证；就绪时 stdout 打印 `dsh web: http://…?token=…`）。
- 配置体系：`$DSH_HOME`（默认 `~/.dsh`）下的 profile，包含 `profiles/<name>/cordis.patch.yml`、`.env` 等；支持 launcher 级 `--patch <文件>` overlay。

## 2. 当前桌面运行技术

| 技术 | 用途 | 约束 |
| --- | --- | --- |
| Node ≥20（可用 `INNATE_NODE_PATH` 指定） | 启动 dsh Harness | 使用真实 Node；原生加载器可能拒绝 Electron 内置 Node |
| Electron BrowserWindow + contextBridge | 窗口、生命周期与窄 IPC | renderer 不直接获得 Node 或任意进程接口 |
| WebContentsView + SurfaceHost | 同窗口嵌入 Harness 和 magpie 控制台 | 切页只 detach；显式 close 才回收 |
| electron-vite + Vite + React | main/preload/renderer 构建与 UI | 共享包和 workspace 插件按进程打包 |
| electron-builder / 手动便携组装 | Windows 分发 | 分发组装不等于运行时全部自包含 |

当前桌面实际 Harness 入口是 `innate-dogic/apps/desktop/src/main/harness.ts`。

## 3. 模型网关集成

| 技术 | 当前模块与用途 |
| --- | --- |
| magpie CLI（统一保留在 `innate-dogic/bin/magpie.exe`） | 统一模型 Provider、协议互译、路由、用量和 Agent 接线 |
| `@dogic/service-model-gateway` | 壳无关 sidecar 进程托管、healthcheck 与指数退避重启 |
| `@dogic/plugin-model-gateway` | shell 插件体系中的 CLI 封装与直连降级；不是 service 包的别名 |
| `@dogic/core` | 网关发现、dsh 状态、模型目录和集成检查 |
| `apps/desktop/src/main/launcher.ts` | 桌面当前使用的受管 magpie Web 控制台与接线操作 |

接线由 magpie 写入 `$DSH_HOME/profiles/*/cordis.patch.yml` 与相应凭据配置。dsh → 网关可经 `/v1/chat/completions`、`/v1/responses`、`/v1/messages`，由 magpie 对接实际 Provider。

## 4. 插件与共享模块

| 技术 | 用途 |
| --- | --- |
| strict TypeScript + NodeNext / bundler | apps、plugins、packages、services、sites 与 tools 统一实现 |
| pnpm workspaces（`workspace:*`） | 唯一依赖图与拓扑构建 |
| Vitest | 单元、契约和真实二进制集成测试 |
| `@dogic/kernel` | DI、生命周期、模块加载与注册表 |
| `@dogic/sdk` | 插件与 ModelGateway 公共契约及 mock |
| `@dogic/plugin-workspace` | 文件、Markdown、高亮与只读 Git 插件 |
| `@dogic/core/surface` | 浏览器安全的 Surface 描述、生命周期与安全快照 |
| `@dogic/syntax-highlighting` | Shiki 按需语言加载、明暗主题与纯文本回退 |

应用和插件都是独立 workspace 模块；应用通过依赖、DI 和窄 IPC 组合插件，不把插件代码复制进应用源码。

## 5. 壳无关后端服务

`@dogic/harness-runtime` 依赖 `@dogic/service-model-gateway`，提供 `bootBackend()` 与无头 CLI：

```text
gateway → 首次 profile 初始化 → wire → harness → authedUrl
```

它位于 `innate-dogic/services`，可被未来应用显式复用，但当前 desktop 尚未接入该实现。不要因为同属一个 monorepo 就默认桌面修改会同步到这条服务链路，或反之。

## 6. 双向宿主与 DSH 插件边界

DSH 自己的 `dsh plugin add` 与 Harness 内 UI 贡献点属于另一层插件机制，与 `innate-dogic/plugins` 的壳层插件并存。新计划包含两个正式方向：

- **dogic 宿主 DSH**：M3 用 `plugins/dsh-runtime` 组合唯一 `services/harness-runtime`，继续内嵌完整 Harness。
- **DSH 宿主 Innate 能力**：M4 起由 `plugins/dsh-workbench` 在真实 Harness 内贡献工作区，M5 增加模型设置。

跨宿主能力优先共享类型、纯 UI、Markdown、高亮和测试场景；允许按宿主 API 重写薄实现，不强制代码完全复用。DSH 插件只贡献叶子 Surface/Panel/Settings，不能递归加载完整 desktop。terminal、browser、canvas 等能力仍先在 dogic 实现，只有存在 DSH 内场景和官方权限时才增加第二适配器。
