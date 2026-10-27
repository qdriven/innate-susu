# 阶段 5（M5）— 双向宿主模型设置

> 执行层：本阶段任务清单已迁移至 [docs/sprints/S3-m5-dual-host-settings.md](../../sprints/S3-m5-dual-host-settings.md)；本文保留目标、边界与架构上下文，任务以 Sprint 层为准。

状态：待 M4 完成 · 预估 3–4 天。

目标：simple 用户在 dogic 或 DSH Harness 内都能完成“模型来源 → 默认模型 → 接入”，背后仍由 magpie 负责。dev 模式继续保留完整 magpie 控制台，不重写其高级能力。

## 1. 配置面与边界

用户只需要两个概念：

1. **模型来源**：订阅/API 来源、测试连接、已配置列表。
2. **默认模型**：可选模型、接入状态、保存并接入。

不暴露 provider 池、路由组、patch、协议互译等高级术语。dev 的高级控制台是逃生口，不是 simple 的前置步骤。

安全约束：key 只通过受控设置服务交给 magpie；不写入布局快照、操作日志或 Innate 自有持久化配置。配置只保存 provider 引用、默认模型和模式，不复制凭据。

## 2. 目标结构

```text
model-settings：schema、纯 UI、校验、应用计划与共享场景
   ├─ dogic adapter → plugin-model-gateway / 受限 IPC
   └─ DSH adapter   → dsh-workbench 的受限设置服务

两侧 adapter → MagpieCli → magpie → DSH 接线
```

宿主无关代码按真实复用收益拆分；允许两套薄 UI，但不得出现两套互相漂移的接线逻辑和凭据存储。

## 3. 任务分解

### T5.1 设置 schema 与应用服务（0.5–1 天）

- 定义版本化 `ModelSettingsConfig`：provider 引用、默认模型、目标 Agent；不包含 key。
- `apply` 幂等，按步骤返回 `{step, ok, detail}`；失败停止后续动作并给出恢复方式。
- MagpieCli 继续依赖注入，mock 覆盖空配置、重复应用、失败与免 key 订阅。
- 真实二进制测试只读，或隔离临时 `DSH_HOME`；不得修改真实用户配置。

### T5.2 dogic simple 原生设置页（1 天）

- 设置页实现模型来源和默认模型两个区块，所有操作有进行中态与下一步错误提示。
- 成功后状态灯实时更新；新启动的 DSH 会话读取新接线。
- dev 控制台、浏览器逃生口和断开恢复继续可用。
- 设置操作日志只含时间、动作和结果，不含 key、token 或完整认证 URL。

### T5.3 DSH 内设置贡献（0.5–1 天）

- 扩展 `plugins/dsh-workbench`，通过真实 settings/panel 贡献点提供同一功能。
- 复用 M4 已验证的官方桥接，不引入任意进程执行接口。
- simple/dev 的可见性与 dogic 语义一致；无法确定模式时默认展示最少配置面。
- DSH 插件卸载后原生设置恢复，不留下失效贡献点。

### T5.4 降级与恢复（0.5 天）

- magpie 缺失或网关失败时提供明确提示和安装/重试入口。
- 直连模式只有确实能安全写 DSH 配置时开放，并明确无故障转移和用量能力。
- `magpie dsh default` 恢复路径保留；配置失败不得谎称部分成功。
- 无 DSH、无 magpie、无模型和无效 key 都有双宿主测试。

### T5.5 双宿主 UAT 与文档（0.5 天）

按 [工程规范](./engineering.md) 在干净环境分别执行 dogic 与 DSH 内设置流程。更新模块图、构建文档、方案网站和证据 `evidence/m5/`。

## 4. 出口标准

- dogic 与真实 DSH 内均可完成来源、模型、接线和恢复。
- dogic simple 从安装到首次对话不超过 3 步，全程不需要第二个应用或手工编辑配置。
- 两个宿主的安全约束、核心术语和错误行为一致，dev 高级能力不回退。
- 全量构建、类型检查、测试、桌面冒烟与 DSH 宿主 E2E 通过。
