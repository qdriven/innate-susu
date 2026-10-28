# W3：只读工作区与共享项目上下文

## 阶段目标

将现有工作区从单一 dev 页面拆成右栏常驻文件/Git Panel 与中栏文档标签，保留全部只读安全边界，并提供 WorkspaceContext 供 W4 terminal 使用。

**前置**：W1 全绿。可与 W2 并行，但不得改 Harness/magpie 实现。

## W3.1 固定 WorkspaceService 安全与行为契约

- **改动位置**：`plugins/workspace/src/main/index.test.ts`、shared 类型与集成夹具。
- **实施**：
  1. 为 get/set root、list、read、gitStatus、gitDiff 建立当前行为基线。
  2. 覆盖空路径、绝对路径、`..`、NUL、符号链接逃逸、非文件读取和不存在 root。
  3. 固定文本 2 MB、图片 5 MB、diff 500K 字符、status 500 条等现有限制。
  4. Git 测试覆盖 rename/copy、detached HEAD、非 repo、超时和参数注入尝试。
  5. 本任务只补测试和必要安全修复，不增加写入 API。
- **验证**：所有正/负路径在迁入实现上通过。
- **完成标准**：后续 UI 拆分不能绕过或削弱这些契约。

## W3.2 建立 WorkspaceContext 与窄 IPC

- **改动位置**：workspace shared、desktop main/preload、kernel 服务注册。
- **实施**：
  1. 定义 `WorkspaceContext { workspaceId, root, name }`，root 只代表用户选定上下文，不代表调用方已获任意文件权限。
  2. main 统一持有当前 WorkspaceService，root 变更发布类型化事件。
  3. preload 继续只暴露六个只读方法及必要的 root 变更订阅，不暴露 Node path/fs。
  4. 每次 list/read/Git 仍在 main 做 canonical root 校验，不能因 context 已选而跳过。
  5. 为 W4 提供 main 内部受信 root 解析，不提供 renderer 任意 cwd 执行接口。
- **验证**：root 切换事件、旧 root 请求、跨 root 路径和伪造 workspaceId 均被正确处理。
- **完成标准**：文件树、文档和未来 terminal 可引用同一 root，权限语义没有扩大。

## W3.3 将文件树与 Git 拆为右栏 Panel

- **改动位置**：workspace renderer、desktop RightPanelHost、workspace UI plugin。
- **实施**：
  1. 通过 `workbench.registerPanel` 注册文件/Git Panel，保留 DI 获取 WorkspaceApi。
  2. 文件树支持目录懒加载、展开/收起、选中与刷新；Git Panel 显示分支和变更。
  3. Panel 可在 dev 右栏常驻或收起，不抢占中栏 Surface 身份。
  4. simple 模式不暴露开发工作区 Panel；无 root 时显示选择目录动作。
  5. 使用 `@innate/ui` primitive 和语义 token，业务状态留在 workspace 插件。
- **验证**：注册/卸载 Panel、目录加载、错误提示、模式门控和右栏 resize 测试。
- **完成标准**：右栏不依赖 App.tsx 内工作区实现，禁用插件只移除自身 Panel。

## W3.4 将文件和 diff 接入中栏文档标签

- **改动位置**：workspace renderer FilePreview/GitPanel、W1 SurfaceTabs。
- **实施**：
  1. 文件选中打开 document descriptor，id 由 workspaceId 与规范化相对路径稳定派生。
  2. 重复选择同一文档激活已有标签，不重复读取；关闭标签不关闭文件树或整个工作区。
  3. Git diff 作为只读 document，支持 staged/unstaged 视图，不提供 apply/stage/commit。
  4. 文档标签 deactivate 保留安全 UI 状态，重新激活时按需要刷新内容。
  5. 文件不存在、超出大小、不支持二进制等错误只影响当前文档。
- **验证**：多文档打开/切换/关闭、重复激活、跨 root 同路径 id、错误隔离和 Git 只读测试。
- **完成标准**：文件树是 Panel，文件/diff 是中栏 Document，没有为每文件创建 WebContentsView。

## W3.5 适配 Markdown、高亮与主题

- **改动位置**：FilePreview、Markdown/renderer 样式、`syntax-highlighting` 主题适配。
- **实施**：
  1. 保留 GFM、相对文档链接、相对图片和文档根包含检查。
  2. 外部 HTTP(S) 链接经系统浏览器，其他协议默认拒绝。
  3. Shiki 明暗跟随宿主 `.dark` 状态，语言按需加载，失败/超大文件回退纯文本。
  4. 将旧硬编码颜色替换为语义 token；不为 Markdown 另建主题事实源。
- **验证**：明暗截图、代码高亮、纯文本回退、链接/图片逃逸和恶意协议负路径。
- **完成标准**：预览效果可用且主题统一，安全规则与源基线一致。

## W3.6 恢复 root、展开状态与文档快照

- **改动位置**：WorkspaceService 状态存储、renderer snapshot、版本迁移测试。
- **实施**：
  1. root 继续存用户数据目录，采用原子写入并处理损坏文件。
  2. 保存版本化安全快照：root 引用、展开目录、打开文档 descriptor、activeId；不存文件内容或 diff 全文。
  3. 重载后 root 失效时显示重新选择，不静默访问旧路径。
  4. snapshot 版本不兼容时保留旧文件并安全回退空布局，给出提示。
  5. WorkspaceContext root 与 W4 将要消费的值一致。
- **验证**：正常恢复、部分文件已删除、root 已移动、损坏 JSON、旧版本/未来版本、原子写失败。
- **完成标准**：重载恢复可用工作区，无敏感内容和静默数据覆盖。

## W3.7 完成只读工作区端到端验收

- **改动位置**：tools/smoke-desktop 与证据。
- **实施**：
  1. 选择测试 root，展开目录，打开文本/Markdown/图片和 Git diff。
  2. 切换 Harness/console/document，验证各 Surface 状态不互相销毁。
  3. 重载恢复 root、展开项和文档；切换 root 后旧文档按策略关闭或标记不可用。
  4. 运行路径安全、全量门禁、overlay 和便携冒烟。
  5. 记录 WorkspaceContext 输出，供 W4.1 验证 cwd；本阶段不伪造 terminal 已存在。
- **验证**：上述流程真实 Electron 通过，源基线安全测试不回退。
- **完成标准**：W3.1–W3.7 全绿，与 W2 合流后可开始 W4。

## 阶段回退

若 Panel/Document 拆分造成回归，恢复 W0/W1 的工作区页面组合；保留独立通过的 main 安全修复。不得通过开放写 API或移除路径断言来让新 UI 通过。
