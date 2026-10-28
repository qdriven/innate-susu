# W1：三栏壳与中栏 Surface 槽（拆为 a/b/c 三门）

> 2026-10-28 review 采纳：多标签是行为变更（detach 不销毁），不与换顶栏绑在同一次验收。W1 拆成三个独立门，各自全绿才进下一门。视觉规则读 `.agents/skills/susu-overview/STYLEGUIDE.md` 副本与替换表，不读本仓过时草案。

总目标：把现有单页 React 组合收敛为 titlebar、左栏、中栏、右栏的桌面壳；中栏支持多 Surface 标签和不同 provider，切换时 detach 而非销毁。只改组合和生命周期，不重写 magpie/DSH 协议，不实现 terminal/browser。

## W1a：UI 基座接入与窗口 titlebar

**前置**：W0 全绿。
**明确不做**：不重写 Sidebar，不拆页面，不改 surface 多标签语义，不接 magpie pill。

### W1a.0 字体决策（决策门，不开工不写码）

> **已拍板（2026-10-28，setup 任务交付时一并落地）**：选 **(c) 产品层接管**——桌面端字体的事实源是本仓产品 token 层，基础仓保持 Inter 默认不动。

- **改动位置**：本仓 `packages/theme/src/tokens.css`（产品 token 层，本仓唯一允许字面量的地方）+ `packages/theme/src/fonts/`（字库随包分发）。基础仓 `innate-fe packages/ui/src/tokens.css` **不改**。
- **实施**：原二选一之外补第三种落法——产品层在 `:root` 声明 `--font-sans: "Geist", …` 与 `--font-mono`，并用 `@font-face` 加载随包分发的 Geist 可变字重（100–900）；产品层先 `@import "@innate/ui/tokens.css"` 再声明同名 token，靠源码顺序覆盖基础层的 Inter 默认。基础仓的 Inter 默认服务其它消费方，不为桌面端单方面改动。**产品代码禁止另写 `font-family`**，一律走 `--font-sans` / `--font-mono`。
- **验证**：决策记录在案；产品层已含字库与 token 声明；桌面 renderer 消费 `@innate-desktop/theme/index.css` 后字体生效。
- **完成标准**：W1a.2 开工前字体有唯一事实源（桌面端 = `packages/theme/src/tokens.css`）。
- **回退**：不适用（纯决策）。

### W1a.1 固定现有页面与 Surface 行为基线

- **改动位置**：desktop renderer/main 测试、tools/smoke-desktop。
- **实施**：
  1. 为 simple/dev 页面集合、默认页、模式切换和 Harness 启动状态补回归断言。
  2. 记录 Harness 与 magpie 控制台 show/hide/bounds/close 的现有行为。
  3. 增加“离开对话再返回，URL 未变不 reload”和“显式停止才 close”的测试。
  4. 保存当前窗口尺寸、resize 与 WebContents bounds 计算证据。
- **验证**：测试在 W0 实现上通过；后续重构使用同一组断言。
- **完成标准**：行为基线覆盖现有公开页面和两个 WebContents Surface。
- **回退**：纯新增测试，无回退。
- **完成记录（2026-10-28）**：新增 2 个测试文件、7 条基线测试；真机记录窗口 resize/恢复、控制台与 Harness bounds、Surface 复用和显式停止。基线发现 renderer reload 后 Harness 状态未恢复，已补初始状态读取并由同一真机脚本复验通过。证据：`docs/susu/plan/evidence/W1a/baseline.md` 与 `baseline-smoke/`。

### W1a.2 接入 Tailwind + token + ThemeProvider

- **改动位置**：`apps/desktop/package.json`、electron-vite renderer 配置、renderer 入口 CSS。
- **实施**：
  1. 添加 `@innate/ui`、`@innate-desktop/theme`、`tailwindcss`、`@tailwindcss/vite`（app devDependencies；只挂 renderer 配置）；`globals.css` 按已验证模式：`@import "tailwindcss"` + `@import "@innate-desktop/theme/index.css"` + 两条 `@source`（本仓源码与 `@innate/ui/src`，`@source` 写在入口文件、放所有 `@import` 之后）。入口**只引产品层入口**这一个主题入口——`@innate-desktop/theme/index.css` 内部已按「基础 token → 产品 token → 壳 chrome」的顺序串好，不必（也不应）在入口再单独引 `@innate/ui/tokens.css`，否则产品层的覆盖会被顺序打乱。
  2. 引入宿主 ThemeProvider，明暗只经 `.dark` class，禁写 `prefers-color-scheme` 媒体查询。
  3. 建立旧 CSS 到语义 token 的映射，先桥接壳样式，不要求一次重写所有业务页。
  4. 禁止深引 `@innate/ui` 内部路径，不在本仓复制 primitive。
- **验证**：桌面明暗截图各一张；构建与 typecheck 通过；代表页面无裸样式；旧 simple/dev 行为不变。
- **完成标准**：桌面 renderer 可消费 UI 基座，主题和 token 有唯一来源。
- **回退**：摘除 renderer 的 Tailwind 插件与入口 import，恢复 W0 样式。
- **完成记录（2026-10-28）**：私有源同步与依赖安装成功；renderer 仅经产品主题入口消费 Tailwind、token 与 ThemeProvider，旧 CSS 已桥接语义 token，明暗只经 `.dark`。构建、完整 typecheck、7 条基线测试和真机全量冒烟通过，明暗证据见 `docs/susu/plan/evidence/W1a/theme.md` 与 `theme-smoke/`。

### W1a.3 只换窗口 titlebar，状态槽留空

- **改动位置**：renderer `Titlebar.tsx` → `shell/TitlebarStrip`。
- **实施**：
  1. 按 orca 窗口铬面形态重组顶栏：左 = 品牌/应用标识（Windows 形态），中 = 预留 `#titlebar-tabs` 空槽（本门留空），右 = 窗口控制占位（3×46px 语义）与右栏开关位；背景用 `--card` 系。
  2. 顶栏控件按规范取 `@innate/ui` Button（`outline`）与图标按钮（`ghost`），不拷 orca 的裸 `titlebar-icon-button` class；不造 Toolbar 原语。
  3. 右侧留一个空状态槽节点（W2 的网关 pill 挂这里），本门不接数据。
  4. 窗口拖拽区、双击最大化等现行为保持。
- **验证**：DOM 断言三区结构 + 状态槽存在；窗口控制行为不回退；明暗下顶栏视觉截图。
- **完成标准**：titlebar 是唯一被替换的壳件；Sidebar/页面原样。
- **回退**：恢复 W0 `Titlebar.tsx`。
- **完成记录（2026-10-28）**：新增 `shell/TitlebarStrip.tsx`，原 `Titlebar.tsx` 只保留 props 适配；三区、空 tabs/status 槽与 3×46 窗口控件就位，未接 W2 状态。3 个测试文件、10 条测试通过，桌面完整 build/typecheck 通过；真机复验拖拽、双击还原、窗口控制、simple/dev、控制台、Harness 与 resize 全绿。证据：`docs/susu/plan/evidence/W1a/titlebar.md` 与 `titlebar-smoke/`。

## W1b：Sidebar / ContentArea 与 App 拆分

**前置**：W1a 全绿。
**明确不做**：不改 attach/多标签语义（W1c），不动 magpie/DSH 启动。

### W1b.1 壳组合抽取

- **改动位置**：renderer `App.tsx`、pages、新增 `shell/`（Sidebar、ContentArea、RightPanelHost 容器）。
- **实施**：
  1. Sidebar 直接消费 `@innate/ui` 的 Sidebar primitive（不在 `shell/` 重写），只承载导航注册与底部状态位；ContentArea 承载页面；右栏先放可拆卸空容器（W3 填充）。
  2. App 只负责组合与顶层状态；`pages.ts` 注册表扩展 slot/mode 元数据，页面 id 与门控不变。
  3. simple 模式隐藏开发 Panel 和入口，dev 保持现有全部功能。
  4. 新组合只用 `@innate/ui` primitive 与语义 token；业务逻辑保持原实现。
- **验证**：导航、模式切换、窗口控制、状态轮询与旧行为一致；删除一个可选页面注册时壳仍启动（负路径单测）；W0 冒烟全绿。
- **完成标准**：三栏布局可运行，App 不再直接实现每块壳 UI。
- **回退**：恢复 W1a 末的 App 组合。

## W1c：中栏多 Surface 标签 + 降级

**前置**：W1b 全绿。
**明确不做**：不改 magpie/DSH 启动协议，不加 terminal/browser。

### W1c.1 provider 中立的 Surface 标签模型

- **改动位置**：`packages/core/src/surface.ts`、renderer `surfaces/`、surface 测试。
- **实施**：
  1. 复用 SurfaceDescriptor/Registry，定义 renderer 标签状态只保存 id/kind/providerId/title/workspaceId/capabilities。
  2. 定义 provider 注册接口，至少容纳 `webcontents` 与 renderer document/panel 两类实现；terminal/browser 只保留 kind，不建空实现。
  3. 实现 SurfaceTabs：open/activate/deactivate/close，激活项持久化安全 id。
  4. 保持 snapshot v1 可读；新增元数据必须可选，非法版本安全回退。
  5. URL token、webContents、ChildProcess 不进入 renderer 标签状态。
- **验证**：多 Surface 打开/切换/关闭、activeId 恢复、重复 id、非法 descriptor、旧快照兼容单测。
- **完成标准**：标签条不感知 Harness/magpie 私有类型，生命周期语义与现有 Registry 一致。

### W1c.2 Harness 与控制台接入统一槽

- **改动位置**：main `surface-host.ts`、`ipc.ts`、preload、renderer HarnessPage/ConsolePage。
- **实施**：
  1. 增加 provider 中立的 surface show/hide/bounds/close 窄 IPC，参数为安全 descriptor、provider 句柄和 bounds。
  2. main 内部将认证 URL 解析限制在对应 runtime provider；通用 renderer 不提交任意认证 URL。
  3. 保留旧 Harness/console IPC 作为临时适配，逐一转到新 SurfaceTabs。
  4. 切换标签只 detach；URL 未变不 reload；显式 close 才销毁 view。
  5. 新路径全绿后删除重复 renderer 状态和无调用旧通道，保留 runtime 启动 API。
- **验证**：Harness 与控制台交替切换不重载（CDP 断言）；resize/maximize bounds 正确；关闭其中一个不影响另一个；伪造 providerId 被拒。
- **完成标准**：两个 WebContents 客人使用同一中栏槽，无专用重复标签逻辑，token 不进快照。

### W1c.3 可摘除的运行时降级

- **改动位置**：renderer 组合、runtime provider 注册与错误页。
- **实施**：
  1. DSH 未安装、未启动或 provider 注册失败时，壳、导航和其他本地页面仍可用。
  2. 对话 Surface 显示明确启动/重试/查看提示，不白屏、不阻塞整个 App。
  3. 禁用 magpie console provider 时只移除其标签和贡献，不停止 Harness。
  4. 不为 terminal/browser 添加无功能入口。
- **验证**：模拟 DSH 缺失、控制台启动失败、provider dispose；壳与其余 Surface 保持可用。
- **完成标准**：任一客人失败只影响自身，错误和恢复动作显式可见。

### W1c.4 壳与便携回归（W1 出口）

- **改动位置**：tools/smoke-desktop、证据文档。
- **实施**：
  1. 更新 DOM 断言覆盖三栏、标签、simple/dev 与错误降级。
  2. 运行全量门禁、overlay（7/7）和开发桌面冒烟。
  3. 构建便携目录，重复多 Surface 切换、resize、关闭回收。
  4. 保存明暗截图和生命周期日志摘要，检查无 token。
- **验证**：W0 所有行为不回退，新生命周期断言全绿。
- **完成标准**：W1a–W1c 证据齐全，才允许 W2/W3 并行开始。

## 阶段回退

回退 W1 的 renderer 组合和通用 Surface IPC，恢复 W0 页面与专用适配；保留已经独立通过的日志脱敏。不得为保留新布局而降低“切换不重载”或安全断言。任一门失败只回退该门。
