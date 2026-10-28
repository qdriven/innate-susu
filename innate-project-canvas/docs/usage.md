# 使用项目画布工具

`innate-project-canvas` 是独立的 strict TypeScript workspace 包，同时也是一个项目级 Skill。它把 Sprint Markdown 和包依赖转换为结构化快照，再生成审计报告和自包含 HTML 看板。

## 快速开始

在仓库根目录执行：

```bash
pnpm install
pnpm --filter @innate-labs/project-canvas audit
pnpm --filter @innate-labs/project-canvas sync
```

`audit` 默认只读。`sync` 仅在审计无错误时写入：

```text
innate-project-canvas/out/
├── project-snapshot.json   # 唯一派生数据快照
├── audit.json              # 错误、警告和语义漂移
├── index.html              # Tabs／Sidebar 工作台
└── classic.html            # 经典长页，用于比较展示效果
```

页面使用同一份快照，没有第二份手工维护的数据。浏览器直接打开 HTML 即可，页面不依赖 CDN 或外部字体。需要本地 HTTP 预览时，在 `innate-project-canvas` 目录运行：

```bash
npm run dev -- --host 127.0.0.1 --port 7100
```

默认使用顶部 Tabs 展示总览、任务、模块与审计；顶栏可切换为 Sidebar，选择会保存在当前浏览器。Sidebar 模式支持折叠（`Ctrl/⌘ B`）。任务搜索（`/`）、状态／Sprint 筛选、模块当前／目标／全部切换和节点详情联动在两种导航布局中相同。

## 任务 Markdown 草稿

展开任务卡后点击“编辑”：标题使用独立输入框，其余内容在同一个 Markdown 正文中编辑。工具栏参考 Orca 的 Issue Composer，按段落、字符格式、列表和引用／链接分组，支持正文、H2／H3、粗体、斜体、删除线、行内代码、代码块、无序／有序／检查列表、引用和链接。按钮直接转换当前选区，并在点击时保留选区；窄屏可横向滚动工具栏。

“分块预览”与保存后的详情都按 `##` 二级标题分块，并支持上述 Markdown 语法。链接仅接受 `http://` 或 `https://`，原始 HTML 和危险 URL 不会执行。编辑器支持 `Ctrl/⌘ B`（粗体）、`Ctrl/⌘ I`（斜体）、`Ctrl/⌘ K`（链接）和 `Ctrl/⌘ Enter`（保存）。

“保存草稿”写入当前浏览器的 localStorage，刷新后仍保留；“恢复原始”删除该任务的本地草稿。“复制 Markdown”复制标题和当前正文，剪贴板 API 不可用时使用传统复制回退。草稿不会改写 `docs/sprints`、快照、任务状态或审计结果；正式修改仍需回到权威来源并重新同步。

## 预览未通过审计的内容

```bash
pnpm --filter @innate-labs/project-canvas sync:preview
```

预览会保留审计错误并返回非零退出码。这用于检查图和定位问题，不用于正式发布。

## 合并目标架构

```bash
pnpm exec tsx innate-project-canvas/src/cli.ts sync \
  --root . \
  --target innate-project-canvas/assets/target-architecture.example.json \
  --allow-unverified
```

目标输入中的每个模块都带来源。当前模块仍从真实 `package.json` 提取，目标模块统一以虚线显示。示例文件演示格式，不代表目标架构已自动从全部 plans 推导。

## 验证与比较

```bash
pnpm exec tsx innate-project-canvas/src/cli.ts validate innate-project-canvas/out/project-snapshot.json --root .
pnpm exec tsx innate-project-canvas/src/cli.ts diff before.json after.json
```

`diff` 比较任务状态、依赖、验收文本、模块、边和来源哈希，不把生成时间变化当成漂移。发现变化时退出码为 1。

## 开发与验证

```bash
pnpm --filter @innate-labs/project-canvas build
pnpm --filter @innate-labs/project-canvas typecheck
pnpm --filter @innate-labs/project-canvas test
```

实现关系与扩展边界见 [architecture.md](architecture.md)。Canvas 发布不是 CLI 的隐式副作用，必须由 Agent 按 `SKILL.md` 的发布流程执行。
