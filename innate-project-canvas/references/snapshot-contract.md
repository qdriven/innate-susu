# 快照契约

权威交换结构同时表达在：

- `schema/project-snapshot.schema.json`：外部消费者使用的 JSON Schema。
- `src/types.ts`：strict TypeScript 类型。
- `src/validate.ts`：语义和文件系统门禁。

修改任一结构时同步三处并增加夹具。

## 关键不变量

1. `schemaVersion` 当前固定为 `1.0.0`。
2. Sprint、任务、模块 ID 各自唯一。
3. `blockedBy` 只包含任务或 Sprint ID；引用必须存在且不能形成依赖环。
4. `done` 必须有 `verified` 证据；未来证据允许为 `missing`。
5. `presence: target` 只表示计划，不得被 `view: current` 的边当作已存在能力。
6. `SourceRef.path` 使用仓库相对 POSIX 路径；`line` 指向任务或定义位置；`sha256` 用于来源漂移比较。
7. 总数、Sprint 完成态、frontier 和下一任务全部派生，不进入源数据。
8. 生成时间不参与语义哈希或 diff。

## 证据状态

- `verified`：文件存在，或目录存在且非空。
- `missing`：登记的路径不存在。
- `unverified`：存在但不能证明是有效证据，例如空目录。

该状态只证明证据容器的可检查性，不替代测试、截图审查或真实用户路径验收。
