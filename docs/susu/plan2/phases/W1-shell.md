# W1：三栏壳与中栏 Surface 槽

## 阶段目标

把现有单页 React 组合收敛为 titlebar、左栏、中栏、右栏的桌面壳；中栏支持多 Surface 标签和不同 provider，切换时 detach 而非销毁。只改组合和生命周期，不重写 magpie/DSH 协议，不实现 terminal/browser。

**前置**：W0 全绿。

## W1.1 固定现有页面与 Surface 行为基线

- **改动位置**：desktop renderer/main 测试、tools/smoke-desktop。
- **实施**：
  1. 为 simple/dev 页面集合、默认页、模式切换和 Harness 启动状态补回归断言。
  2. 记录 Harness 与 magpie 控制台 show/hide/bounds/close 的现有行为。
  3. 增加“离开对话再返回，URL 未变不 reload”和“显式停止才 close”的测试。
  4. 保存当前窗口尺寸、resize 与 WebContents bounds 计算证据。
- **验证**：测试在 W0 实现上通过；后续重构使用同一组断言。
- **完成标准**：行为基线覆盖现有公开页面和两个 WebContents Surface。

## W1.2 给桌面 renderer 接入目标 UI 基座

- **改动位置**：`apps/desktop/package.json`、electron.vite 配置、renderer 入口 CSS/Theme 组合。
- **实施**：
  1. 添加 `@innate/ui`、Tailwind 与 Vite 插件依赖，按消费方规范配置本仓源码和 UI 包源码扫描，路径以新 desktop 实际位置为准。
  2. 引入 `@innate/ui/tokens.css` 和宿主 ThemeProvider，明暗只经 `.dark` class。
  3. 建立旧 CSS 到新语义 token 的映射，先桥接壳样式，不要求一次重写所有业务页。
  4. 禁止深引 `@innate/ui` 内部路径，不在本仓复制 Button/Card 等 primitive。
- **验证**：桌面明暗截图、桌面构建和 typecheck 通过；代表页面无裸样式；旧 simple/dev 行为不变。
- **完成标准**：桌面 renderer 可消费 UI 基座，主题和 token 有唯一来源。

## W1.3 抽取桌面壳组合

- **改动位置**：renderer `App.tsx`、Titlebar、pages、新增 `shell/` 组合文件。
- **实施**：
  1. 将 titlebar、Sidebar、ContentArea、RightPanelHost 拆成明确组件，App 只负责组合和顶层状态。
  2. 页面注册表扩展 slot/mode 等必要元数据，保持现有页面 id 与门控。
  3. 左栏只负责导航与状态；右栏先承载可拆卸容器，不把工作区逻辑写回 App。
  4. simple 模式隐藏开发 Panel 和入口，dev 模式保持现有全部功能。
  5. 新组合使用 `@innate/ui` primitive 与语义 token；业务逻辑保持原实现。
- **验证**：导航、模式切换、窗口控制、状态轮询与旧行为一致；删除一个可选页面注册时壳仍启动。
- **完成标准**：三栏布局可运行，App 不再直接实现每块壳 UI，W0 冒烟全绿。

## W1.4 建立 provider 中立的 Surface 标签模型

- **改动位置**：`packages/core/src/surface.ts`、renderer `surfaces/`、surface 测试。
- **实施**：
  1. 复用 SurfaceDescriptor/Registry，定义 renderer 标签状态只保存 id/kind/providerId/title/workspaceId/capabilities。
  2. 定义 provider 注册接口，至少容纳 `webcontents` 与 renderer document/panel 两类实现；terminal/browser 只保留现有 kind，不建空实现。
  3. 实现 SurfaceTabs：open/activate/deactivate/close，激活项持久化安全 id。
  4. 保持 snapshot v1 可读；新增元数据必须可选，非法版本安全回退。
  5. URL token、webContents、ChildProcess 不进入 renderer 标签状态。
- **验证**：多 Surface 打开/切换/关闭、activeId 恢复、重复 id、非法 descriptor、旧快照兼容单测。
- **完成标准**：标签条不感知 Harness/magpie 私有类型，生命周期语义与现有 Registry 一致。

## W1.5 将 Harness 与控制台接入统一 Surface 槽

- **改动位置**：main `surface-host.ts`、`ipc.ts`、preload、renderer HarnessPage/ConsolePage。
- **实施**：
  1. 增加 provider 中立的 surface show/hide/bounds/close 窄 IPC，参数为安全 descriptor、provider 句柄和 bounds。
  2. main 内部将认证 URL 解析限制在对应 runtime provider；通用 renderer 不提交任意认证 URL。
  3. 保留旧 Harness/console IPC 作为临时适配，逐一转到新 SurfaceTabs。
  4. 切换标签只 detach；URL 未变不 reload；显式 close 才销毁 view。
  5. 新路径全绿后删除重复 renderer 状态和无调用旧通道，保留 runtime 启动 API。
- **验证**：Harness 与控制台交替切换不重载；resize/maximize bounds 正确；关闭其中一个不影响另一个；伪造 providerId 被拒。
- **完成标准**：两个 WebContents 客人使用同一中栏槽，无专用重复标签逻辑，token 不进快照。

## W1.6 保留可摘除的运行时降级

- **改动位置**：renderer 组合、runtime provider 注册与错误页。
- **实施**：
  1. DSH 未安装、未启动或 provider 注册失败时，壳、导航和其他本地页面仍可用。
  2. 对话 Surface 显示明确启动/重试/查看提示，不白屏、不阻塞整个 App。
  3. 禁用 magpie console provider 时只移除其标签和贡献，不停止 Harness。
  4. 不为 terminal/browser 添加无功能入口。
- **验证**：模拟 DSH 缺失、控制台启动失败、provider dispose；壳与其余 Surface 保持可用。
- **完成标准**：任一客人失败只影响自身，错误和恢复动作显式可见。

## W1.7 完成壳与便携回归

- **改动位置**：tools/smoke-desktop、证据文档。
- **实施**：
  1. 更新 DOM 断言覆盖三栏、标签、simple/dev 与错误降级。
  2. 运行全量门禁、overlay 和开发桌面冒烟。
  3. 构建便携目录，重复多 Surface 切换、resize、关闭回收。
  4. 保存明暗截图和生命周期日志摘要，检查无 token。
- **验证**：W0 所有行为不回退，新生命周期断言全绿。
- **完成标准**：W1.1–W1.7 证据齐全，才允许 W2/W3 并行开始。

## 阶段回退

回退 W1 的 renderer 组合和通用 Surface IPC，恢复 W0 页面与专用适配；保留已经独立通过的日志脱敏。不得为保留新布局而降低“切换不重载”或安全断言。
