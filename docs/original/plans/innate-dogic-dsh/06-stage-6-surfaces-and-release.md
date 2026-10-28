# 阶段 6–7（M6–M7）— 通用 Surface 与双宿主发布

> 执行层：本阶段任务清单已迁移至 [docs/sprints/S4-m6-m7-surfaces-release.md](../../sprints/S4-m6-m7-surfaces-release.md)；本文保留目标、边界与架构上下文，任务以 Sprint 层为准。

状态：待 M5 完成；按 Surface 独立排期。

原则：双向适配是可选能力，不是所有 Surface 的强制重复劳动。每项先在 dogic 完成真实垂直切片，只有 DSH 内也存在明确使用场景和官方能力时才增加第二适配器。

## 1. M6.1 terminal

- dogic 主进程持有 pty；renderer 只负责视图与输入/显示事件。
- 会话绑定明确工作区和可执行配置，禁止 renderer 传任意 shell 字符串的通用 IPC。
- 输入、输出、resize、exit 分通道，具备背压、缓冲上限和退出清理。
- deactivate 保留会话，close 才终止；默认 dev 模式开放。
- DSH 侧仅在官方插件进程能力和交互场景成立时适配。

验收：真实命令交互、resize、退出清理、simple 不可见、无任意 shell IPC。

## 2. M6.2 browser

- 独立 WebContents provider 与持久分区策略，保留 sandbox/contextIsolation。
- 分别审核导航、弹窗、下载与权限；默认拒绝摄像头、麦克风、通知等权限。
- 认证 URL 不作为普通可分享地址，下载不自动执行。
- DSH 内优先复用其官方浏览器能力，不重复造一个嵌套浏览器。

验收：导航策略、权限拒绝、会话隔离、下载位置与崩溃隔离。

## 3. M6.3 canvas

- 优先文档型 Surface，不因为“画布”增加额外 WebContents。
- 数据模型、视口与渲染分离；文档持久化独立于 Surface 布局。
- 插件节点通过 SDK 注册，不获得任意主进程函数。
- 双宿主共享文档 schema；UI 可按宿主能力分别实现。

验收：重启恢复、大数据性能、自动保存、插件节点无越权。

## 4. M6.4 Structured I/O + Annotation v1 契约

- 统一 TaskInput、CapabilityDescriptor、RunEvent、RunResult 和受控 OutputBlock；streaming 与最终结果分离。
- 定义独立 AnnotationTarget/Thread/Message/Proposal 和 AnnotationStore，不把批注塞进输出块或源文件。
- 所有跨边界数据具有运行时 Schema；AI 不返回可执行 HTML/组件，不能关闭审批或直接解决批注。
- 详细类型、语义、降级和测试矩阵见 [structured-io.md](../../architecture/structured-io.md)。

验收：契约、Schema、有效/非法夹具和浏览器安全测试完整；不交付 Agentic UI 或批注界面。

## 5. M6.5 Agentic UI

- 以任务/运行实例为 Surface，消费 M6.4 契约；模型输出、工具调用与人工审批形成可恢复事件流。
- DSH 是首个执行后端，但 UI 不直接复制其私有状态；通过版本化适配契约投影。
- 写入、命令执行、网络访问等高影响操作独立审批。
- 支持暂停、恢复、取消与审计；renderer 不持有模型密钥。

验收：审批不可绕过、事件流可恢复、真实 DSH adapter 与非法输出降级通过、执行端失败不拖垮工作台。

## 6. M6.6 批注与反馈

- 首片支持 Agent markdown 输出块批注、回复、解决/重开、本地持久化、筛选与反馈汇总。
- AnnotationStore 独立于 RunResult；锚点失效保留数据并支持人工 reanchor。
- AI 只能提出 AnnotationProposal，宿主检查原文权限且用户接受后入库。
- 文档文本、diff、图片区域和画布锚点按后续真实场景扩展；不在首片实现多人协作。

验收：批注重载恢复、权限与状态流转、orphaned 保留、AI 提议审批和来源可追溯全部通过。

## 7. M7.1 桌面分发

- 全量门禁与目录型便携版回归。
- 实测 electron-builder `package:dir`、NSIS 和单文件 portable，不沿用旧失败结论代替新验证。
- 明确 DSH、magpie、系统 Node、Git 是安装前置还是随包分发；若随包，设计 `extraResources`、生产依赖、原生模块 unpack 与运行时路径。
- simple overlay、DSH Runtime 插件和所需服务必须进入组合清单。

## 8. M7.2 DSH 插件分发

- 为 `dsh-workbench` 生成独立可安装产物和 manifest，不把 monorepo 源码路径当作发布包。
- 记录 DSH 兼容版本、安装/升级/卸载命令和权限说明。
- 不兼容时 fail closed：禁用 Innate 贡献，不破坏 DSH 自身。
- 桌面内嵌 DSH 与独立 DSH 两种运行场景均验证。

## 9. M7.3 双宿主发布矩阵

| 场景 | 必测内容 |
| --- | --- |
| dogic simple | 首启、模型来源、默认模型、首次对话 |
| dogic dev | Harness、控制台、工作区、Git、已安装 Surface |
| 独立 DSH + Innate plugin | 安装、工作区、模型设置、重载、卸载 |
| desktop 内嵌 DSH + Innate plugin | 叶子贡献可用，无递归嵌入、无重复状态源 |
| 无 DSH / 无 magpie / 无 Git | 明确降级，不白屏、不卡死、不破坏其他插件 |
| 升级与回滚 | 配置兼容、插件禁用、接线恢复、旧快照可读 |

## 10. 出口标准

- 每个进入发行版的 Surface 都有独立真实验收，未实现能力不出现占位入口。
- Agentic UI 与批注反馈共用经运行时验证的 v1 契约；AI 不能绕过审批、篡改批注或伪造来源。
- 桌面与 DSH 插件均有可重复构建、安装、升级、卸载和回滚路径。
- NSIS/单文件 portable 的实际结果单独记录；未通过就不能声称可发布。
- 双宿主 UAT、权限审查、文档和证据全部同步。
