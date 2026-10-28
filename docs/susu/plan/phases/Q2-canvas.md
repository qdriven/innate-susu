# Q2：给人看的项目看板

## 阶段目标

把 project-canvas 接入中栏 Surface。正式视图只消费经审计的 project-snapshot JSON，展示项目、任务 frontier、模块图和证据；HTML 与 localStorage 草稿都不是正式事实源。

**前置**：Q1 全绿。

## Q2.1 建立只读 ProjectSnapshotStore

- **改动位置**：`plugins/project-canvas` main/shared、innate-project-canvas snapshot/validate。
- **实施**：
  1. 按 projectId 读取 Q1 已保存快照，main 重新解析路径并执行 Schema+audit。
  2. 提供只读 list/get/audit IPC，renderer 不传任意文件路径。
  3. 返回安全快照和派生状态所需数据，过滤本机绝对路径和不应展示的来源信息。
  4. 文件变化采用显式刷新或受控 watch，防止读取半写文件；无效新版本保留上一有效视图并提示。
  5. store 不调用 HTML renderer，也不从 HTML/localStorage 重建任务。
- **验证**：有效读取、无效 JSON、半写、路径伪造、错误版本、刷新失败与上一有效快照保留。
- **完成标准**：中栏只有一条可信快照读取路径。

## Q2.2 实现项目总览 Surface

- **改动位置**：project-canvas renderer、SurfaceTabs、`@innate/ui` 组合。
- **实施**：
  1. 展示项目名、Sprint 状态、任务统计、audit summary 和下一项。
  2. 使用 deriveState 实时计算 readyTaskIds/nextTaskId，不在 UI 另行保存 frontier。
  3. 项目 Surface 使用 document/canvas 类 React provider，不新建 WebContents。
  4. 无项目、无下一项、全部完成和存在 audit error 都有明确状态。
  5. 禁用 project-canvas 插件只移除自身 Surface，不影响其他工作台。
- **验证**：空/进行中/完成/错误快照、依赖变更后 frontier、插件卸载。
- **完成标准**：用户能看到当前真正可执行的下一项，数据完全来自快照和 derive。

## Q2.3 实现任务与依赖视图

- **改动位置**：project-canvas renderer task/board 视图。
- **实施**：
  1. 按 Sprint 和状态展示任务，支持按可执行/阻塞/完成/optional/debt 筛选。
  2. 任务详情展示 summary、purpose、verification、estimate、blockedBy、evidence 和 source。
  3. 阻塞关系以列表或轻量图展示，点击依赖可定位对应任务。
  4. 状态文案使用 deriveState/taskStateLabel，避免 UI 与执行器各自判断。
  5. 本阶段不提供自动运行；Q3 入口可先保持不可用或不显示。
- **验证**：循环依赖被 audit 拦截、跨 Sprint 阻塞、筛选、任务定位和大数据量虚拟化/性能检查。
- **完成标准**：任务状态可追溯到快照和依赖，不由卡片本地状态决定。

## Q2.4 实现模块与审计视图

- **改动位置**：project-canvas renderer module/audit 视图。
- **实施**：
  1. 展示 current/target 模块、层级、路径摘要和 moduleEdges。
  2. 区分 current 与 target，不把规划模块显示为已存在。
  3. 展示 audit errors/warnings/drift，支持定位到相关任务或模块。
  4. evidence 只显示状态和安全引用；打开本地产物需独立受控动作和权限检查。
  5. 不把生成 HTML 内嵌后当作这些视图的实现。
- **验证**：未知边、target-as-current、证据缺失、审计错误定位和源码路径脱敏。
- **完成标准**：人能发现计划漂移和证据问题，而不是只看到美观看板。

## Q2.5 隔离草稿与正式状态

- **改动位置**：project-canvas draft storage、编辑 UI。
- **实施**：
  1. 若保留任务编辑，草稿按 projectId+snapshotHash 存储，显著标记“草稿”。
  2. 草稿只改变本地展示，不写 snapshot、Sprint、任务状态或 evidence。
  3. 正式快照更新后，旧草稿标记过期并要求人工处理，不能自动覆盖新内容。
  4. 正式任务状态只能由 Q3 证据流程或用户明确确认改变；本阶段无隐式勾选完成。
  5. localStorage 不可用时显示未保存，不假报成功。
- **验证**：草稿保存/恢复/重置、快照更新过期、存储失败、正式 JSON 不变。
- **完成标准**：任何草稿操作都不会污染 Q3 的正式任务输入。

## Q2.6 恢复项目 Surface 与安全引用

- **改动位置**：Surface snapshot、project store、workspace 关联。
- **实施**：
  1. 布局只保存 projectId、Surface descriptor、active view 等安全状态。
  2. 重载后重新读取并审计快照，不能直接把旧序列化任务当最新事实。
  3. 项目被删除或快照无效时显示选择/重试，不白屏。
  4. workspaceId 只是上下文引用，读取证据或源文档时服务端重新授权。
- **验证**：正常重载、项目删除、快照变坏、版本升级、跨项目切换和权限变化。
- **完成标准**：看板可恢复且始终重新以当前有效快照为准。

## Q2.7 完成人侧看板端到端验收

- **改动位置**：tools/smoke-project-canvas、证据。
- **实施**：
  1. 从 Q1 快照打开项目，检查总览、frontier、任务、模块、audit 和证据状态。
  2. 修改快照依赖并刷新，确认 frontier 按 derive 更新。
  3. 创建草稿并重载，确认正式快照哈希和内容不变。
  4. 与其他 Surface 切换、便携运行、全量门禁和敏感信息检查。
- **验证**：所有视图由同一快照驱动，HTML 文件缺失不影响 React 正式视图。
- **完成标准**：Q2.1–Q2.7 全绿才允许开始 Q3。

## 阶段回退

禁用 project-canvas Surface，保留 Q1 快照和 W5 基线。不得回退到“解析生成 HTML 获取任务状态”的临时方案。
