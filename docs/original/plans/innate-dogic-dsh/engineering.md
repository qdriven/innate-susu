# 跨阶段工程规范（双宿主测试 / 发布 / 回滚 / UAT）

## 1. 每阶段门禁

| 层 | 工具 | 范围 | 要求 |
| --- | --- | --- | --- |
| 单元与契约 | Vitest | core/kernel/sdk、Runtime、workspace、model-settings、适配器 | 当前 83 项为最近基线，只增不减；双宿主共享核心场景 |
| 真实二进制集成 | Vitest + `innate-dogic/bin/magpie.exe` | 只读 CLI、隔离接线/恢复、facade apply | 不修改真实用户配置；wire/default 使用 mock 或临时 `DSH_HOME` |
| 类型与构建 | `pnpm typecheck && pnpm build` | 全部 workspace 与 tools | strict TypeScript；每阶段必过 |
| dogic E2E | `tools/smoke-desktop.ts` | Harness、控制台、模式、工作区、Surface | 真实 Electron/CDP、DOM 断言与截图 |
| DSH 宿主 E2E | M4 新增的官方插件加载与真实窗口驱动 | 安装、贡献点、文件/Git、设置、卸载 | 不接受纯 mock 或静态页面作为完成 |
| 打包冒烟 | 桌面产物与独立 DSH 插件包 | 当前发行组合 | 每次发布必跑 |

证据统一写入 `docs/plans/innate-dogic-dsh/evidence/<milestone>/`。认证 URL、token、key 和真实用户配置不得进入截图说明、日志或持久化测试夹具。

## 2. 双宿主测试矩阵

| 场景 | dogic 宿主 | DSH 宿主 |
| --- | --- | --- |
| Runtime 生命周期 | M3 启动、复用、停止、禁用、异常退出 | DSH 自身对话不得被 Innate 插件破坏 |
| 工作区 | M2 基线与后续回归 | M4 文件、Markdown、Git、重载与卸载 |
| 模型设置 | M5 simple/dev、降级与恢复 | M5 设置贡献、接线、卸载恢复 |
| 安全 | canonical root、窄 IPC、secret 不入快照 | 官方权限边界、无任意 Node/shell、fail closed |
| 新 Surface | 先完成 dogic 真实垂直切片 | 有场景和官方能力时增加，不强制复制 |
| 组合运行 | desktop 内嵌 Harness 时无递归桌面 | 只贡献叶子 Surface/Panel/Settings |

同一个功能允许两种实现，但核心输入、输出、错误与权限用例必须可对照。AI 可以协助重写适配层，不能替代真实验收。

## 3. 安全与配置

1. renderer 不获得任意文件系统、进程或 shell；宿主服务按 capability 暴露窄契约。
2. 文件与 Git 默认只读；根目录由用户明确选择，路径经过 canonical 包含检查。
3. Git 使用参数数组；terminal 是独立高权限能力，不复用只读 WorkspaceApi。
4. DSH/magpie 认证 URL 和 key 不进入布局状态、共享配置或日志。
5. 测试隔离 `DSH_HOME`、userData 和 magpie 配置；禁止对真实环境执行非只读接线。
6. DSH 插件版本不兼容或加载失败时只禁用自身，不能破坏 DSH 原生能力。

## 4. 发布 checklist（Windows）

1. `pnpm install && pnpm build && pnpm typecheck && pnpm test` 全绿。
2. `pnpm package:portable` 后执行目录型便携版真实冒烟。
3. 实测 `pnpm package:dir`、`pnpm package` 的 NSIS 与单文件 portable；分别记录结果，失败不得宣称可发布。
4. 检查 overlay、Runtime 插件、服务和资源是否进入发行组合；明确 DSH/magpie/Node/Git 是前置依赖还是随包分发。
5. 为 DSH 插件构建独立产物，实测安装、升级、重载、卸载与版本不兼容。
6. 跑 dogic simple/dev、独立 DSH、desktop 内嵌 DSH 三组场景。
7. 版本号、兼容矩阵、证据、`docs/build-path/` 和方案网站同步。

## 5. 回滚与逃生口

| 层 | 回滚方式 |
| --- | --- |
| DSH 接线 | `magpie dsh default` 恢复原配置，保留显式断开入口 |
| DSH Runtime 插件 | 禁用后关闭其 Surface 和进程，其他工作台插件继续运行 |
| DSH Workbench 插件 | 卸载后移除贡献点和监听，不修改用户项目，不影响 DSH 对话 |
| simple overlay | simple/dev 切换即摘 patch，不覆盖 magpie 接线文件 |
| magpie 内嵌页 | 浏览器打开逃生口保留 |
| 模型设置 | apply 失败停止并报步骤；不保存 key；恢复与降级路径明确 |
| 快照与配置 | 版本化读取；不兼容时保留原文件并安全回退，不静默删除 |

## 6. UAT

### 6.1 dogic simple（M5 出口）

前提：隔离的全新用户目录，有一个可用订阅/key。

1. 安装并启动 App，选择“简易使用”。
2. 设置页添加模型来源并测试连接。
3. 选择默认模型、保存并接入，开始对话并得到真实回复。

通过标准：不超过 3 步，无第二个应用、无手工配置、无高级术语弹错。另跑无 magpie、无 DSH 和无效 key 变体。

### 6.2 DSH 宿主（M4/M5 出口）

1. 在支持的独立 DSH 版本安装 Innate 插件。
2. 选择临时工作区，打开文本/Markdown 并查看真实 Git diff。
3. 在 Innate 设置贡献中完成模型接入，发起真实对话。
4. 重载后验证状态，再卸载插件并确认 DSH 原生对话与设置仍可用。

### 6.3 组合宿主

在 desktop 内嵌的 Harness 中启用 DSH 插件，确认只出现叶子能力，没有完整 desktop 递归、重复工具栏或第二套凭据状态。

## 7. 文档同步义务

每阶段更新总纲状态、对应实施记录、模块图、工作台架构、构建文档、方案网站和项目技能。计划目录固定为 `docs/plans/innate-dogic-dsh/`；旧名称只可作为历史说明，不得继续出现在命令或链接中。待执行任务统一在 `docs/sprints/` 以 Sprint 任务卡维护（做什么 / 功能 / 如何验证）；本目录保留里程碑、阶段规格与工程规范。
