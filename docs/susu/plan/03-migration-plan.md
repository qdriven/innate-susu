# 03 迁移总计划

## 1. 总策略

采用 strangler 式逐段迁移：先让旧行为在目标仓恢复，再由新壳和新 Surface 逐步接管。每个阶段只引入一类主要变量，并保留上一个可运行便携目录作为回退点。

三条顺序纪律：

1. **W0 不重构**：除目标仓路径适配和必须的安全修复外，不改布局、协议或模块归属。
2. **先契约后删除**：任何旧 IPC、Harness、页面或工具只有在替代路径通过相同验收后才能删除。
3. **真实运行优先**：静态页面、空包、mock 成功不能代替桌面集成验收；mock 只用于契约和负路径测试。

## 2. 阶段依赖与交付

| 阶段 | 主要交付 | 依赖 | 预估人日 | 阶段出口 |
| --- | --- | --- | --- | --- |
| W0 | 源基线、目标 Web、工程门禁均可运行 | — | 2–3 | M0–M2 行为与 labs 基线一致，安全日志不泄 token |
| W1a | Tailwind + `@innate/ui` token + ThemeProvider；只换窗口 titlebar，状态槽留空 | W0 | 1–2 | 明暗可切；titlebar 按规范；字体决策已拍板；simple/dev 不回退 |
| W1b | `@innate/ui` Sidebar / ContentArea、拆 `App.tsx`；`pages.ts` 不动 | W1a | 1–2 | 三栏可运行；空注册表负路径；W0 冒烟全绿 |
| W1c | Surface 标签模型 + Harness/控制台接入统一槽 + 降级 | W1b | 2–3 | 切页不重载；禁用 DSH 壳仍起；overlay 7/7 |
| W2 | magpie sidecar/CLI/console/状态收口（网关侧）+ 网关真实链路 | W1c | 3–4 | 隔离环境 gateway 起动→模型列表→直连调用；断网关有提示 |
| W3 | 右栏只读文件/Git、中央文档、WorkspaceContext | W1c | 3–5 | 选根、预览、diff、恢复快照、安全负路径通过 |
| W4 | PTY terminal 与受控 process capability | W2+W3 | 4–6 | 真命令、resize、cwd、关闭回收、伪造调用拒绝、便携可跑 |
| W5 | browser Surface 与安全导航/下载 | W4 | 3–5 | 独立分区、默认拒权、外链系统浏览器、下载选路径 |
| R1 | 两套 Harness 行为矩阵收敛 + DSH 真实集成链（boot→wire→chat） | W2 | 2–3 | 单一 Harness 实现；隔离环境完成一次真实对话；可与 Q1/Q2 并行 |
| Q1 | 一句话到经 Schema+audit 的本地快照 | W5 | 3–5 | 成功可落盘；坏 JSON/坏依赖/越界路径均不落盘 |
| Q2 | 项目中栏看板与 frontier/证据视图 | Q1 | 3–4 | 快照驱动，重载恢复，草稿不污染正式状态 |
| Q3 | 单任务调度、capability 路由、证据回写 | Q2+R1 | 5–7 | 三类执行各有一条真实链路，失败 fail closed，不并行 |

预估用于排期，不是完成承诺。W2 与 W3 可并行；R1 只依赖 W2，可与 Q1/Q2 并行（不动工作台 UI）；其余阶段严格按门禁推进。

## 3. 每阶段共同工作包

每个阶段任务卡已给出专属任务，以下工作默认包含在阶段内，不另算“可选”：

### 3.1 准备

- 确认前置阶段证据存在且命令全绿。
- 从前置阶段创建迁移分支或工作点，记录源与目标 commit。
- 列出本阶段会改变的公开契约、IPC、快照和打包资源。
- 真实外部运行时测试准备隔离 `DSH_HOME`、userData、magpie 配置与端口。

### 3.2 实施

- 先写会失败的契约/回归测试，再改实现。
- 保留旧路径适配层直到新路径完成对照；同阶段最后才删旧路径。
- 新 IPC 使用类型化窄契约；renderer 不直接 import Electron/Node。
- 新 UI 遵守 `@innate/ui` 和 `.dark` 规则；本阶段不修改基础仓 primitive。
- 错误显式可达，不能静默 skip；高风险操作默认拒绝。

### 3.3 验证

根目录统一门禁：

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm check:typescript
pnpm verify:overlay
pnpm smoke:desktop
```

涉及打包资源、原生模块、进程回收或 Surface 生命周期的阶段，还必须：

```bash
pnpm package:portable
# 对生成的便携目录运行真实 Electron 冒烟，而不是只验证文件存在
```

说明：W0 负责把这些脚本在目标仓补齐；某命令不适用时必须记录原因，不能静默省略。测试数以 W0 实测为基线，只增不减；旧文档中的 83 项是历史参考，不替代本次实测。

### 3.4 证据

每阶段在 `docs/susu/plan/evidence/<PHASE>/` 保存：

- `environment.md`：OS、Node/pnpm、Electron、magpie/DSH 版本与隔离目录说明。
- `commands.md`：实际执行命令、退出码、测试数量和时间。
- `behavior.md`：任务卡验收项逐条结果与未覆盖限制。
- 必要的截图或日志摘要；敏感信息先脱敏。
- `known-issues.md`：无问题时也明确写“无已知阻塞”。

## 4. 数据与配置迁移

### 4.1 不复制用户真实配置进仓

迁移的是代码和测试夹具，不复制真实 `~/.dsh`、token、key、用户 workspace.json 或项目快照到版本库。

### 4.2 模式与 overlay

- 保持 simple/dev 存储语义和 overlay 资源相对路径。
- 全新隔离 `DSH_HOME` 必须先裸 boot 生成 profiles，再执行 magpie 接线。
- `--patch` 继续使用 launcher 级 `--profile web --patch <file>` 形式。

### 4.3 Surface 与 workspace 快照

- 已存在 snapshot v1 保持可读；新增可选字段必须验证旧快照。
- 快照只保存 descriptor、root 引用和安全 UI 状态，不保存认证 URL、进程对象、完整文件内容或未经筛选终端输出。
- 不兼容版本安全回退并给出可见提示，不启动空白后静默覆盖旧数据。

### 4.4 项目快照

- Q1 草稿保存到受控应用数据目录或用户明确选择的位置。
- Agent 输出先完整 Schema 校验，再语义 audit，最后原子写入。
- 失败时不留下“看似正式”的半成品；已存在有效快照不得被失败输出覆盖。

## 5. 安全门禁

### 5.1 进程

- DSH 使用真实系统 Node，清除 `ELECTRON_RUN_AS_NODE`；不能用 Electron 内置 Node 冒充通过。
- 本地服务只监听 `127.0.0.1`；stdout 认证 URL 仅进入受管运行时状态。
- Windows 关闭必须回收进程树；应用退出、Surface close、provider dispose 分别测试。
- terminal 是独立高权限能力，不能经 `workspaceRead` 或其他旧 IPC 隐式执行。

### 5.2 Renderer 与 WebContents

- 主 renderer 保持 contextIsolation、nodeIntegration: false；guest view 保持 sandbox: true。
- 不暴露 `ipcRenderer`、通用 shell、任意文件路径读取或 `executeJavaScript`。
- 新窗口请求默认拒绝；HTTP(S) 外链交系统浏览器。
- browser 的导航、下载、权限请求分别处理，默认拒绝敏感权限。

### 5.3 文件与 Git

- 文件/Git 默认只读，所有路径在 main/service 重新做 canonical root 包含检查。
- Git 使用参数数组，不拼接 shell 命令；大小和数量限制保持。
- Q3 证据写入走独立受控服务，不给 WorkspaceApi 增加通用写文件方法。

### 5.4 密钥与证据

- DSH/magpie 启动输出在写日志前脱敏。
- 测试夹具使用假 token；截图不得包含真实认证 URL。
- 便携包、日志、快照、project-canvas HTML 都纳入泄漏检查。

## 6. 回退策略

| 失败类型 | 回退方式 |
| --- | --- |
| W0 基线无法跑通 | 不开始 W1；在 labs 修基线后重新记录源 commit 并拷贝 |
| 新壳回归 | 保留 W0 桌面便携目录，回退 W1 组合改动；不连带回退已验证安全修复 |
| 运行时收敛失败 | 恢复上一阶段桌面适配路径；共享服务保留但不得声称桌面已接入 |
| 工作区 UI 拆分失败 | 恢复 W0 工作区页面，只保留已通过的 main 安全修复 |
| PTY 打包失败 | 不发布 W4；terminal 保持不可见，不用 child_process 通用 IPC 替代 |
| browser 安全验证失败 | browser provider 默认禁用，不影响 Harness/terminal |
| Q1 快照无效 | 拒绝落盘并保留上一有效快照 |
| Q3 执行失败/取消 | run 标记 failed/cancelled，任务不自动 done，不写伪证据，不启动下一条 |

## 7. 变更与文档治理

- 每个变更关联 W/Q 任务编号，例如 `W2.3`。
- 阶段完成后更新 [README §4 状态板](./README.md)、对应任务状态、证据链接和已知限制。
- 机读投影纪律：任务卡变更后对 [canvas/](./canvas/) 依次 `canvas_audit → canvas_sync → canvas_board`（root 传 canvas/ 目录），不手改 `out/`；快照是唯一数据源。
- 旧 P 系列只保留 backlog；若重启平台化，应在 W/Q 迁移完成后另做依赖评审。
- 修改公共契约、目录职责或安全规则时，同步本计划的模块分析和相关阶段卡。
- 若实际源码与本文分析不同，先更新事实分析和迁移映射，再执行代码任务。
- UI 纪律双轨：`.agents/skills/susu-overview` 管 AI 行为（含 STYLEGUIDE 副本与替换表）；机器执法（oxlint design-system 规则，禁止硬编码色值与深引内部路径）在 W1b 后穿插排期。
- 2026-10-28 合并记录：采纳 plan1 review 全部修改（W1 拆 a/b/c、视觉规范指向技能副本、组件来源三分法、字体决策门）；W2 瘦身为网关侧收口，Harness 收敛与 DSH 集成链拆至 R1；plan1 归档至 `../archive/plan1/`。

## 8. 最终发布候选门槛

Q3 完成不等于必须立即发布正式安装器。本轮发布候选只要求目录型便携产物满足：

1. 全新隔离环境可启动，无依赖开发仓绝对路径。
2. 无 DSH/magpie 时壳、只读工作区和受控 terminal 行为符合降级设计。
3. 有运行时完成一次对话、一次 terminal、一次 browser 和一次项目任务闭环。
4. 重载恢复安全快照，关闭后无 DSH/magpie/PTY/browser 孤儿进程。
5. 所有证据可复查，无真实 token/key，旧便携目录保留用于回退。
