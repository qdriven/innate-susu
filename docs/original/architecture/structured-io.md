# Structured I/O 与 Annotation v1 契约

日期：2026-10-27  
状态：**架构设计已固定，代码与 UI 均未实现**。实施入口为 T6.4；Agentic UI 为 T6.5，批注与反馈垂直切片为 T6.6。

## 1. 目标与边界

本契约为跨进程、跨插件、跨宿主和 AI 生成内容定义稳定的数据边界：

- 用户或插件以 `TaskInput` 描述要执行的能力、输入和上下文。
- 执行端以 `RunEvent` 发布有序、可恢复的运行事实。
- 最终状态以 `RunResult` 保存，展示内容由受白名单约束的 `OutputBlock` 表达。
- 批注、问题和反馈以独立的 Annotation 模型关联任务、输出、文档、artifact 或画布。
- AI 可以提出 `AnnotationProposal`，不能直接解决、删除或篡改讨论。

本契约不试图统一所有内部 TypeScript 函数，也不重写现有 `ModelGateway`、`WorkspaceApi`、`SurfaceRegistry` 或 magpie 协议。M3 仍只负责 DSH Runtime 生命周期，不在此引入大而全的 Agent 框架。

### 1.1 非目标

- 不允许模型返回可执行 HTML、React 组件、JavaScript 或任意 shell。
- 不把 streaming delta 与最终结构化结果混为同一个对象。
- 不把批注写回代码、Markdown 源文件，或隐式扩大当前只读工作区权限。
- 不在 v1 实现多人实时协作、远程账号体系或外部 Issue 自动同步。
- 不要求 terminal/browser/canvas/Agentic UI 使用同一份持久化文档；它们只共享必要的基础引用与版本规则。

## 2. 分层与事实源

```text
TaskInput                  一次能力调用的请求
    ↓
CapabilityDescriptor       宿主注册的能力、Schema 与权限
    ↓
RunEvent                   执行过程中的有序事件流（运行事实源）
    ↓
RunResult                  最终结构化结果（历史与恢复的事实源）
    ↓
OutputBlock Renderer       只读投影为 Markdown、表格、diff、文件卡片等

AnnotationStore            独立保存批注线程、消息与锚点
AnnotationProposal         AI 提出的新批注，经宿主/用户接受后才入库
```

约束：

1. UI 是事件和结果的投影，不是执行事实源。
2. `runId` 由宿主或执行服务生成；`requestId` 用于关联请求，不能替代运行身份。
3. `RunEvent.seq` 在同一 `runId` 内从 1 单调递增；消费者按 `(runId, seq)` 去重和排序。
4. `RunResult` 终态不可被批注就地改写；内容修订产生新版本，旧批注继续指向原版本。
5. secret、认证 URL、token、key 和未经筛选的工具参数不得进入事件、结果、快照或批注。

## 3. 公共类型与版本

```ts
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type JsonSchema =
  | boolean
  | { [key: string]: JsonValue }

export interface ActorRef {
  id: string
  kind: 'user' | 'agent' | 'system'
  displayName?: string
}

export interface ArtifactRef {
  id: string
  kind: 'file' | 'image' | 'report' | 'other'
  name: string
  mimeType?: string
  size?: number
}
```

- 所有跨边界信封使用 `schemaVersion: '1.0'`。
- 向后兼容的可选字段和新的事件 payload 可以进入 1.x；删除字段、改变字段语义或权限语义必须升主版本。
- 接收方必须拒绝不支持的主版本；未知的可选字段可保留或忽略，但不能因此获得新权限。
- artifact 只保存引用，由宿主按权限解析；模型不能通过伪造路径或 URL 读取资源。

## 4. TaskInput：统一任务输入

```ts
export type TaskInputValue =
  | { type: 'text'; text: string }
  | { type: 'form'; values: Record<string, JsonValue> }
  | { type: 'artifact'; artifactId: string }

export interface TaskInput {
  schemaVersion: '1.0'
  requestId: string
  capability: string
  input: TaskInputValue
  context?: {
    workspaceId?: string
    surfaceId?: string
    documentId?: string
    artifactIds?: string[]
    annotationIds?: string[]
  }
  accepts?: Array<OutputBlock['type']>
}
```

示例：

```json
{
  "schemaVersion": "1.0",
  "requestId": "req-001",
  "capability": "workspace.summarize-changes",
  "input": {
    "type": "text",
    "text": "总结当前未提交改动，并列出风险"
  },
  "context": {
    "workspaceId": "innate-labs"
  },
  "accepts": ["markdown", "table", "diff"]
}
```

规则：

- simple 模式可以只生成 text 输入；dev 模式可以增加表单和上下文，不改变后端契约。
- `context` 只是请求方提供的引用，不代表已经授权；执行端必须重新检查 workspace、document、artifact 和 annotation 的访问权限。
- `accepts` 是展示偏好，不是安全边界，也不能要求执行端返回未注册的块类型。
- 请求大小、数组长度、文本长度和 artifact 数量必须由运行时 Schema 限制。

## 5. CapabilityDescriptor：插件能力声明

```ts
export interface CapabilityDescriptor {
  id: string
  version: '1.0'
  inputSchema: JsonSchema
  resultSchema: JsonSchema
  requiredPermissions: Array<
    | 'workspace:read'
    | 'agent:tools'
    | 'annotations:read'
    | 'annotations:write'
    | 'process:execute'
    | 'network:navigate'
  >
  streaming: boolean
}
```

现有 manifest 的 `provides/consumes` 不在本任务中重写。只有新增的结构化任务能力使用 `CapabilityDescriptor`；旧接口需要迁移时另立任务。

宿主在调用前完成：

1. capability 是否已注册且版本兼容。
2. 输入是否通过 JSON Schema。
3. context 引用是否真实存在且属于当前用户授权范围。
4. 插件声明权限是否已经被宿主授予。
5. 高影响操作是否仍需独立审批；插件或模型声明不能降低宿主策略。

## 6. OutputBlock：受控展示协议

```ts
export type OutputBlock =
  | {
      id: string
      type: 'markdown'
      markdown: string
    }
  | {
      id: string
      type: 'table'
      columns: Array<{ key: string; title: string }>
      rows: Array<Record<string, JsonValue>>
    }
  | {
      id: string
      type: 'key-value'
      items: Array<{ label: string; value: JsonValue }>
    }
  | {
      id: string
      type: 'diff'
      path: string
      patch: string
    }
  | {
      id: string
      type: 'artifact'
      artifactId: string
    }
  | {
      id: string
      type: 'actions'
      actions: Array<{
        id: string
        label: string
        capability: string
        input?: JsonValue
      }>
    }
```

渲染映射：

| type | 宿主渲染器 | 主要限制 |
| --- | --- | --- |
| markdown | MarkdownRenderer | 安全链接、资源根目录和大小限制 |
| table | TableRenderer | 行列上限、单元格只渲染 JsonValue |
| key-value | DescriptionList | 不把 value 当 HTML |
| diff | DiffRenderer | 只读展示，不隐式提供 apply |
| artifact | ArtifactCard | 由宿主解析引用并再次授权 |
| actions | ActionBar | capability 白名单；审批由宿主策略决定 |

`actions` 不包含模型可声明的 `requiresApproval`。是否审批由宿主根据 capability 和实际输入计算，防止模型把高影响操作标成免审批。

收到未知 `type` 时显示“不支持的内容块”并保留原始数据；校验失败的模型输出降级为受控 Markdown/纯文本，同时记录可诊断错误，不能静默丢弃整次结果。

## 7. RunResult：最终结果

```ts
export interface RunError {
  code: string
  message: string
  retryable: boolean
}

export type ResultReference =
  | { type: 'annotation'; id: string }
  | { type: 'artifact'; id: string }
  | { type: 'document'; id: string }

export interface RunResult {
  schemaVersion: '1.0'
  runId: string
  status: 'succeeded' | 'failed' | 'cancelled'
  summary?: string
  blocks: OutputBlock[]
  artifacts?: ArtifactRef[]
  references?: ResultReference[]
  annotationProposals?: AnnotationProposal[]
  error?: RunError
}
```

语义校验：

- `failed` 必须包含不含 secret 的 `error`；`succeeded` 不得包含失败错误。
- `runId` 必须与事件流一致，块 `id` 在一次结果内唯一。
- artifact 和 reference 只能引用执行端有权返回的对象。
- AI 汇总反馈时使用 `references: [{ type: 'annotation', id }]` 标明来源，不接受无法追溯的“已根据全部反馈处理”。
- `annotationProposals` 只是随结果返回的提议，不是已保存批注；宿主校验 target、sourceRunId 和原文权限，用户接受后才写入 AnnotationStore。

示例：

```json
{
  "schemaVersion": "1.0",
  "runId": "run-001",
  "status": "succeeded",
  "summary": "发现 2 项需要确认的改动",
  "blocks": [
    {
      "id": "summary",
      "type": "markdown",
      "markdown": "主要改动集中在任务契约与执行顺序。"
    },
    {
      "id": "risks",
      "type": "table",
      "columns": [
        { "key": "risk", "title": "风险" },
        { "key": "action", "title": "建议" }
      ],
      "rows": [
        { "risk": "接口未经运行时校验", "action": "先完成 T6.4" }
      ]
    }
  ]
}
```

## 8. RunEvent：有序运行事实流

```ts
export interface RunEventPayloadMap {
  'run.started': {
    requestId: string
    capability: string
  }
  'text.delta': {
    blockId: string
    text: string
  }
  'block.upsert': {
    block: OutputBlock
  }
  'tool.started': {
    callId: string
    capability: string
    summary: string
  }
  'tool.completed': {
    callId: string
    status: 'succeeded' | 'failed'
    summary?: string
  }
  'approval.requested': {
    approvalId: string
    capability: string
    summary: string
    risk: 'write' | 'process' | 'network' | 'other'
  }
  'run.paused': { reason?: string }
  'run.resumed': { reason?: string }
  'run.cancelled': { reason?: string }
  'run.completed': { result: RunResult }
  'run.failed': { error: RunError }
}

export type RunEvent = {
  [K in keyof RunEventPayloadMap]: {
    schemaVersion: '1.0'
    runId: string
    seq: number
    timestamp: string
    type: K
    payload: RunEventPayloadMap[K]
  }
}[keyof RunEventPayloadMap]
```

规则：

- `timestamp` 使用 ISO 8601 字符串；排序以 `seq` 为准，不以客户端时钟为准。
- 工具事件只包含经过筛选的摘要，不默认记录完整参数、环境变量或凭据。
- 审批响应是宿主命令，不是模型可以伪造的 RunEvent；宿主必须校验审批身份、状态和高影响操作。
- `run.completed`、`run.failed`、`run.cancelled` 是终态事件；终态之后拒绝同 runId 的后续事件。
- 事件日志需要背压、容量上限和持久化策略；UI 虚拟化不能替代执行端限流。

## 9. Annotation：批注、问题与反馈

### 9.1 三类对象

- `AnnotationThread`：一个锚点、分类和解决状态。
- `AnnotationMessage`：线程内多条回复。
- `AnnotationProposal`：AI 建议新增的批注；不是已入库事实。

### 9.2 锚点

```ts
export interface TextAnchor {
  start: number
  end: number
  exact: string
  prefix?: string
  suffix?: string
}

export interface NormalizedRegion {
  page?: number
  x: number
  y: number
  width: number
  height: number
}

export type AnnotationTarget =
  | {
      type: 'output-block'
      runId: string
      blockId: string
      resultVersion: number
    }
  | {
      type: 'document-text'
      workspaceId: string
      documentId: string
      revision: string
      anchor: TextAnchor
    }
  | {
      type: 'document'
      workspaceId: string
      documentId: string
      revision?: string
    }
  | {
      type: 'artifact'
      artifactId: string
      version: number
      region?: NormalizedRegion
    }
  | {
      type: 'canvas-node'
      documentId: string
      nodeId: string
    }
  | {
      type: 'canvas-point'
      documentId: string
      x: number
      y: number
    }
```

- 文本 offset 使用 JavaScript UTF-16 code unit；重新定位以 revision、exact 和上下文共同判断。
- 画布坐标和图片区域使用 0–1 归一化值；能关联节点时优先使用 nodeId。
- 内容改变后无法可靠重定位时设置 `anchorStatus: 'orphaned'`，保留线程并允许人工 reanchor。
- 锚点片段可能包含敏感代码；持久化、导出和 AI 上下文都必须遵守原文档权限，不能只检查 annotationId。

### 9.3 线程、消息和提议

```ts
export interface AnnotationThread {
  schemaVersion: '1.0'
  id: string
  target: AnnotationTarget
  category: 'comment' | 'question' | 'issue' | 'suggestion' | 'feedback'
  status: 'open' | 'resolved'
  anchorStatus: 'anchored' | 'stale' | 'orphaned'
  severity?: 'low' | 'medium' | 'high'
  tags: string[]
  createdBy: ActorRef
  createdAt: string
  resolvedAt?: string
}

export interface AnnotationMessage {
  id: string
  threadId: string
  author: ActorRef
  body: string
  createdAt: string
  editedAt?: string
}

export interface AnnotationProposal {
  id: string
  target: AnnotationTarget
  category: AnnotationThread['category']
  body: string
  sourceRunId: string
  references?: ResultReference[]
  confidence?: number
}
```

`status` 与 `anchorStatus` 正交：已解决的线程也可能因原文删除而 orphaned；未解决线程也可能需要重新定位。

### 9.4 存储接口

```ts
export interface CreateAnnotationInput {
  schemaVersion: '1.0'
  target: AnnotationTarget
  category: AnnotationThread['category']
  severity?: AnnotationThread['severity']
  tags?: string[]
  body: string
}

export interface CreateReplyInput {
  threadId: string
  body: string
}

export interface AnnotationFilter {
  workspaceId?: string
  runId?: string
  documentId?: string
  status?: AnnotationThread['status']
  anchorStatus?: AnnotationThread['anchorStatus']
  category?: AnnotationThread['category']
  tags?: string[]
}

export interface AnnotationStore {
  list(filter: AnnotationFilter): Promise<AnnotationThread[]>
  messages(threadId: string): Promise<AnnotationMessage[]>
  create(input: CreateAnnotationInput): Promise<AnnotationThread>
  reply(input: CreateReplyInput): Promise<AnnotationMessage>
  resolve(threadId: string): Promise<void>
  reopen(threadId: string): Promise<void>
  reanchor(threadId: string, target: AnnotationTarget): Promise<void>
}
```

所有公开输入仍需运行时 Schema；id、actor 和时间戳由宿主生成，不能信任 renderer 或模型提交的作者身份。

- 第一版为本地单用户存储，可使用版本化 JSON + 原子写入；出现真实查询、并发或同步需求后再选择 SQLite/服务端。
- 默认存应用数据目录；只有用户明确导出时才写工作区。
- 不在 v1 把批注写回代码或 Markdown，也不提供 AI 直接 resolve/reanchor/delete 的能力。
- renderer 通过窄 IPC 调用；桌面主进程或宿主服务执行权限检查。

## 10. 展示与反馈流程

### 10.1 内容批注

- 选中文本或输出块后显示“批注 / 记录问题 / 问 AI”。
- 输出卡片、diff、文档和画布显示批注计数与锚点状态。
- 点击批注跳回原文；orphaned 内容提供重新定位入口。

### 10.2 反馈 Panel

- 按 open/resolved、anchored/stale/orphaned 筛选。
- 按 category、severity、tags、workspace、document、run 筛选。
- 支持“汇总反馈”和“导出”；导出前重新检查引用内容权限。
- 汇总结果复用 markdown/table/actions；actions 仍需宿主审批。

### 10.3 AI 处理反馈

```text
用户选择 annotationIds
  → 宿主校验批注和原文权限
  → 创建 TaskInput
  → Agent 返回 RunResult + AnnotationProposal[]
  → 用户接受、编辑或忽略 proposal
  → 宿主写入 AnnotationStore
```

AI 新回答不覆盖旧反馈；原文修订产生新版本；AI 不得自行将反馈标为已解决。

## 11. 模块落点

| 内容 | 计划位置 | 当前状态 |
| --- | --- | --- |
| TaskInput、RunEvent、RunResult、OutputBlock | `packages/sdk` 独立 `agent-io` 子入口 | T6.4 待实现 |
| Annotation 类型、Schema 和 Store 接口 | `packages/sdk` 独立 `annotation` 子入口 | T6.4 待实现 |
| JSON Schema 与运行时 validator | 与上述公共契约同包，浏览器/Node 安全 | T6.4 待实现 |
| DSH 原生事件适配 | DSH Agentic adapter | T6.5 待实现 |
| OutputBlock React renderer | 先在 Agentic UI 插件内实现；第二消费者出现后再拆包 | T6.5 待实现 |
| 批注 Panel、存储适配和反馈流程 | 独立 feedback 插件及宿主窄适配 | T6.6 待实现 |
| Surface 生命周期 | 继续使用 `packages/core/surface` | 已有，不吸收 Agent 内容 |

遵循“功能先于代码共享”：没有第二个真实 UI 消费者前，不预先创建 `agent-output-ui` 空包。

## 12. T6.4 验收清单

T6.4 只交付契约，不交付 Agentic UI 或批注界面：

1. 所有公开类型具有运行时 Schema，strict TypeScript 与 JSON Schema 示例一致。
2. 正常 TaskInput、六类 OutputBlock、全部 RunEvent、AnnotationTarget 和 Proposal 有有效夹具。
3. 非法版本、错误 discriminator、重复块 id、事件乱序/重复、终态后事件、伪造 artifact 和越权 annotation 均被拒绝。
4. 未知输出块有明确降级；非法模型 JSON 保留可诊断的纯文本回退。
5. actions 的审批由宿主策略决定，模型输入不能关闭审批。
6. secret/token/key 不进入示例、事件、日志、结果和批注。
7. 浏览器安全入口不引入 Node、Electron、React 或文件系统依赖。
8. T6.5 能使用同一事件夹具完成 mock 投影；T6.6 能使用同一 Annotation 夹具验证存储，不等待真实 DSH。

## 13. 后续复核触发点

- T6.5 接入真实 DSH 时：按实测事件能力收缩或扩展 adapter，不把 DSH 私有对象泄漏进公共契约。
- T6.6 选择存储时：以真实查询量、并发和恢复需求决定 JSON 或 SQLite，不提前引入数据库。
- 增加远程协作时：另立身份、同步冲突、删除与隐私契约，不在本地 v1 中隐式承诺。
- 增加新 OutputBlock 时：必须同时提供 Schema、renderer、未知版本降级和安全测试。
