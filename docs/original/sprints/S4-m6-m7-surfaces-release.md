# Sprint 4 — M6–M7：通用 Surface 双向化与双宿主发布

> 来源：[plans/innate-dogic-dsh/06-stage-6-surfaces-and-release.md](../plans/innate-dogic-dsh/06-stage-6-surfaces-and-release.md)。
> 原则：双向适配是可选项。每项 Surface 先在 dogic 完成真实垂直切片，只有 DSH 内存在明确场景且官方能力支持时才加第二适配器。每项独立契约、独立真实验收、独立排期。
> 前置：S3（M5）完成（M7 分发部分依赖全部前序）。

---

## T6.1 M6.1 terminal Surface

- **做什么**：dogic 主进程持有 pty；renderer 只做视图与输入/显示事件；会话绑定明确工作区与可执行配置，禁止 renderer 传任意 shell 字符串的通用 IPC；输入/输出/resize/exit 分通道，有背压、缓冲上限与退出清理；deactivate 保留会话、close 才终止；默认 dev 模式开放（simple 不可见）；DSH 侧仅在官方插件进程能力与交互场景成立时适配。
- **功能**：第一个非 webcontents 的 Surface 类型，验证 SurfaceKind 抽象的真实扩展性；也是第一个高权限能力，验证"不复用只读 WorkspaceApi"的权限分层。
- **如何验证**：真实命令交互、resize、退出清理（无孤儿 shell 进程）；simple 模式不可见；伪造任意 shell 字符串的 IPC 调用被拒绝；全量冒烟绿。
- **预估 / 依赖**：按排期 / S3。

## T6.2 M6.2 browser Surface

- **做什么**：独立 WebContents provider 与持久分区策略，保留 sandbox/contextIsolation；导航、弹窗、下载、权限分别审核（默认拒绝摄像头/麦克风/通知）；认证 URL 不作为普通可分享地址；下载不自动执行；DSH 内优先复用其官方浏览器能力，不造嵌套浏览器。
- **功能**：为后续需要嵌网页的场景（文档、控制台类）提供安全基座。
- **如何验证**：导航策略（外跳规则）、权限默认拒绝、会话分区隔离、下载落盘位置可控、provider 崩溃不拖垮工作台；安全审查记录入 evidence。
- **预估 / 依赖**：按排期 / T6.1 可并行。

## T6.3 M6.3 canvas Surface

- **做什么**：优先文档型 Surface（不额外加 WebContents）；数据模型、视口、渲染分离；文档持久化独立于 Surface 布局；插件节点经 SDK 注册、不获得任意主进程函数；双宿主共享文档 schema，UI 可按宿主分别实现。
- **功能**：Document 类型 Surface 的深化；验证"插件贡献节点"这一扩展点。
- **如何验证**：重启恢复、大数据性能基线、自动保存、插件节点无越权（越权调用被拒）；文档 schema 版本化。
- **预估 / 依赖**：按排期 / S3，可与 T6.1、T6.2、T6.4 并行；不等待 browser。

## T6.4 M6.4 Structured I/O + Annotation v1 契约

- **做什么**：按 [structured-io 架构契约](../architecture/structured-io.md) 在 `packages/sdk` 增加浏览器/Node 安全的 `agent-io` 与 `annotation` 子入口：TaskInput、CapabilityDescriptor、六类 OutputBlock、RunResult、RunEvent、AnnotationTarget/Thread/Message/Proposal、AnnotationStore 接口及运行时 JSON Schema；建立有效/非法夹具、版本兼容、事件顺序、权限与降级测试。只交付契约，不实现 Agentic UI、批注 Panel 或生产存储。
- **功能**：先固定跨进程、跨插件、跨宿主和 AI 内容边界，避免 T6.5/T6.6 各自发明事件、结果和批注格式；TypeScript interface 之外必须有运行时校验。
- **如何验证**：严格类型、Schema 与示例一致；六类块和全部事件有夹具；非法版本/discriminator、重复块 id、乱序/重复/终态后事件、伪造引用、未知块降级、actions 审批不可被模型关闭均有测试；浏览器入口无 Node/Electron/React 依赖；全量门禁绿；不创建空 UI 包。
- **预估 / 依赖**：1–2 天 / S3；架构文档已落地不代表本任务完成，可与 T6.1–T6.3 并行。

## T6.5 M6.5 Agentic UI Surface

- **做什么**：以任务/运行实例为 Surface，消费 T6.4 的 TaskInput/RunEvent/RunResult/OutputBlock；DSH 是首个执行后端，通过版本化 adapter 投影真实事件，不复制其私有状态；实现 markdown/table/artifact 首批 renderer、可恢复事件流、人工审批、暂停/恢复/取消与审计；写入/命令执行/网络访问独立审批，renderer 不持有模型密钥。
- **功能**：工作台的差异化能力，也是"投影契约而非复制状态"原则的最大考验；UI 不再自定义第二套 Agent 输出协议。
- **如何验证**：T6.4 mock 夹具可投影；真实 DSH 事件适配通过；伪造审批、乱序/重复/终态后事件被拒；重启恢复；非法输出安全降级；执行端失败不拖垮工作台；密钥只存在于 main/service。
- **预估 / 依赖**：按排期 / T6.4；不依赖 canvas。

## T6.6 M6.6 批注与反馈垂直切片

- **做什么**：实现独立 AnnotationStore 宿主适配、窄 IPC 与反馈 Panel；首片支持 Agent markdown 输出块批注、回复、解决/重开、本地原子持久化、筛选与反馈汇总；AI 只能返回 AnnotationProposal，用户接受后入库；文档文本、diff 行、图片区域和画布锚点在首片后按真实场景扩展，不预先做多人协作。
- **功能**：把问题记录和反馈收集变成可追溯的一等能力，同时保持 RunResult 不可变、批注独立存储、原文权限可复核。
- **如何验证**：重载恢复；回复和状态流转正确；orphaned 不丢数据；越权 annotation/原文引用被拒；AI 不能直接 resolve/reanchor/delete；汇总包含 annotation references；存储失败不拖垮 Agentic Surface；全量门禁与真实桌面冒烟通过。
- **预估 / 依赖**：1–2 天 / T6.5；首片不依赖 T6.3 canvas。

## T7.1 M7.1 桌面分发

- **做什么**：全量门禁 + 目录型便携版回归；实测 `package:dir`、NSIS、单文件 portable（不用旧失败结论代替新验证）；明确 DSH、magpie、系统 Node、Git 是安装前置还是随包分发（随包则设计 `extraResources`、生产依赖、原生模块 unpack、运行时路径）；simple overlay、DSH Runtime 插件、所需服务进组合清单。
- **功能**：发布物验收指标（Windows 安装包可启动、可对话）的落地。
- **如何验证**：三种打包形态分别出真实结果记录；组合清单与实际产物一致；干净机器安装→对话走查通过。
- **预估 / 依赖**：2–3 天 + 外部工具链 / S3。

## T7.2 M7.2 DSH 插件分发

- **做什么**：为 `dsh-workbench` 生成独立可安装产物与 manifest（不用 monorepo 源码路径当发布包）；记录 DSH 兼容版本、安装/升级/卸载命令与权限说明；版本不兼容时 fail closed（禁用 Innate 贡献、不破坏 DSH）；desktop 内嵌 DSH 与独立 DSH 两场景都验证。
- **功能**：方向 B 的交付形态——用户拿到的是插件包，不是一个仓库。
- **如何验证**：产物在支持的 DSH 版本安装/升级/卸载/回滚全通过；不兼容版本实测 fail closed；产物可重复构建（CI 出包）。
- **预估 / 依赖**：随 T7.1 / T4.3、T7.1。

## T7.3 M7.3 双宿主发布矩阵

- **做什么**：跑齐并记录六组场景：dogic simple（首启→来源→模型→首对话）；dogic dev（Harness/控制台/工作区/Git/Surface）；独立 DSH + 插件（安装/工作区/设置/重载/卸载）；desktop 内嵌 DSH + 插件（叶子贡献、无递归、无重复状态源）；无 DSH / 无 magpie / 无 Git 降级；升级与回滚（配置兼容、插件禁用、接线恢复、旧快照可读）。
- **功能**：统一验收指标的最终执行表；发布前最后一道门。
- **如何验证**：矩阵逐格有证据链接（evidence 目录 + 截图/日志）；任何一格不通过则不可宣称可发布。
- **预估 / 依赖**：随 T7.1、T7.2。

---

## 出口标准（M6–M7）

- 每个进入发行版的 Surface 有独立真实验收；未实现能力不出现占位入口。
- T6.4 契约通过运行时 Schema、事件顺序、权限和降级测试；T6.5/T6.6 不另建平行协议。
- 桌面与 DSH 插件均有可重复构建、安装、升级、卸载、回滚路径。
- NSIS / 单文件 portable 结果单独记录；未通过不宣称可发布。
- 双宿主 UAT、权限审查、文档与证据全部同步。
