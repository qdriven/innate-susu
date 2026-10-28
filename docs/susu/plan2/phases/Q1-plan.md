# Q1：一句话生成经审计的本地项目快照

## 阶段目标

用户输入一句项目目的，规划 Agent 只能输出符合 project-snapshot Schema 的候选 JSON。宿主完成完整 Schema 校验、语义 audit、路径检查和人工确认后才原子落盘；失败不覆盖已有有效快照。

**前置**：W5 全绿。

**边界**：不做 GitHub 任务系统，不让模型直接写 docs，不把 HTML 当输出契约，不自动执行任务。

## Q1.1 固定项目快照输入与编号映射

- **改动位置**：`innate-project-canvas` schema/types、Plan2 导入配置与夹具。
- **实施**：
  1. 复用 `project-snapshot.schema.json` v1.0.0，不为规划 Agent 创建第二种自由 JSON 格式。
  2. 明确 W/Q 只是 Plan2 展示编号；导入快照时 W0–W5 映射 S10–S15，Q1–Q3 映射 S21–S23。
  3. 任务 id 使用 T10.x–T15.x、T21.x–T23.x，title/summary 可保留 W/Q 别名。
  4. 固定 sources、sprints、tasks、modules、moduleEdges、blockedBy、evidence 的生成责任和禁止字段。
  5. 对未来任务允许预期 evidence 路径；todo 不得伪造 verified evidence。
- **验证**：完整 Plan2 示例可通过映射和 Schema；W0/TW0.1 等非法原生 id 被明确转换或拒绝。
- **完成标准**：规划输入输出契约和编号规则无歧义。

## Q1.2 增加完整 JSON Schema 运行时校验

- **改动位置**：project-canvas snapshot/validate、新 validator 测试。
- **实施**：
  1. 在 `readSnapshot` 的对象/数组预检之外，增加对 Agent 原始输出的完整 Schema 校验。
  2. 拒绝 additionalProperties、非法 schemaVersion、缺字段、错误类型、重复依赖和非法 id。
  3. 校验前限制输入字节数、任务/模块/边数量与文本长度，防止超大结果消耗资源。
  4. 输出可读错误路径和原因，但不把 secret 或整段未知输入写入日志。
  5. 保留 `validateSnapshot` 作为第二层语义 audit，不用其中之一替代另一个。
- **验证**：有效夹具、缺字段、额外字段、非法版本、超长输入、错误 discriminator 等测试。
- **完成标准**：任何未通过完整 Schema 的 Agent 输出都不能进入文件系统或正式 UI 状态。

## Q1.3 建立规划 Agent 的受限适配器

- **改动位置**：新 planning adapter、W2 Agent runtime 接口、desktop main/preload。
- **实施**：
  1. 输入只包含用户目的、选定 workspace 引用、允许的模块摘要和规划指令；不默认发送整个文件树或密钥。
  2. 规划 Agent 只返回 JSON 文本，无 shell、文件写、审批或任务执行工具。
  3. DSH 可作为真实规划运行时，mock 只用于契约测试；无 DSH 时显示不可用，不伪造计划成功。
  4. 从模型回复中提取唯一 JSON 对象，Markdown 多余说明按协议视为失败或显式剥离，不猜测拼接多个片段。
  5. 设置超时、取消和 requestId，终态后忽略重复回复。
- **验证**：有效 JSON、非 JSON、多个 JSON、超时、取消、重复事件、无运行时与敏感上下文检查。
- **完成标准**：模型能力被限制为“生成候选快照”，没有任何隐式执行权限。

## Q1.4 执行语义 audit 与安全路径检查

- **改动位置**：project-canvas validate、planning service。
- **实施**：
  1. 运行 validateSnapshot/createAuditReport，拒绝 unknown dependency、dependency cycle、duplicate id、unknown module edge 等 error。
  2. 检查当前模块 source 存在性与目标模块 current/target 规则，不让模型虚构已存在模块。
  3. 所有 source/evidence 路径必须是受控相对路径，拒绝绝对路径、`..`、NUL 和越界符号链接。
  4. done 任务必须有存在且 verified 的证据；规划新任务默认 todo，不能自行声明 done。
  5. warning 与 error 分开展示；任何 error 均 fail closed。
- **验证**：坏依赖、环、伪造模块、伪造证据、越界路径和不存在文件等负路径。
- **完成标准**：语义错误明确返回，未生成正式快照文件。

## Q1.5 提供计划预览与人工确认

- **改动位置**：desktop planning Surface、PurposeBar/计划预览 UI。
- **实施**：
  1. 用户输入目的后显示生成中、取消、失败原因和重试。
  2. 预览项目、Sprint、任务数、frontier、模块变化和 audit 结果；标明“候选草稿”。
  3. 人工确认前不写正式快照，不把候选加入 Q2 正式列表。
  4. 用户可返回修改目的重新生成；编辑功能若未实现，不提供假保存按钮。
  5. UI 使用 `@innate/ui`，错误显式可达。
- **验证**：生成→预览→确认、拒绝、重新生成、取消和错误显示。
- **完成标准**：人清楚知道将要保存的内容，模型不能直接确认自己的输出。

## Q1.6 原子保存本地快照

- **改动位置**：planning storage、用户数据目录与窄 IPC。
- **实施**：
  1. 仅接收已通过 Schema+audit 且经人确认的候选，服务端重新校验，不信任 renderer 标记。
  2. 保存到应用数据目录的项目存储或用户明确选择的位置；路径由宿主解析。
  3. 使用临时文件+flush+rename 的原子写策略，保留上一有效版本。
  4. 写失败、权限不足或磁盘错误时显示失败，不留下新半成品。
  5. 记录 snapshotHash、生成时间和来源 requestId，不记录模型密钥。
- **验证**：重复保存、写失败、进程中断、旧有效快照保护、路径逃逸和重载读取。
- **完成标准**：本地快照可恢复，失败不落盘且不破坏上一版本。

## Q1.7 完成真实规划与负路径验收

- **改动位置**：tools/smoke-project-plan、证据。
- **实施**：
  1. 用真实规划运行时从一句目的生成一个小型项目快照，完成预览、确认、保存和重载。
  2. 用 mock/故障注入验证非 JSON、坏 Schema、坏依赖、伪造证据、路径越界和写失败均不落盘。
  3. 验证快照可被现有 deriveState 计算下一任务，并被 Q2 的只读 adapter 消费。
  4. 全量门禁、便携冒烟和敏感信息检查。
- **验证**：真实成功链与全部负路径各有结果，未自动执行任何任务。
- **完成标准**：Q1.1–Q1.7 全绿才允许开始 Q2。

## 阶段回退

关闭规划入口并保留 W5 基线；删除无效候选临时文件但不碰上一有效快照。不能通过放宽 Schema 或忽略 audit error 来促成演示成功。
