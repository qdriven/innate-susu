# 01 — 单一 monorepo 骨架

## 目标

在 innate-labs 根目录维护唯一的 pnpm workspace。所有产品代码统一在 `innate-dogic`，应用、插件、共享包和后端服务均为独立模块。

## 目录划分

```text
innate-labs/
├── package.json                 # 统一 build/test/typecheck/dev/package 入口
├── pnpm-workspace.yaml          # workspace 范围 + electron 构建脚本白名单
├── tsconfig.base.json           # 根 TS 基座（strict）
├── tools/                       # 工程、打包与真实窗口验证
├── sites/                       # 独立方案网站
└── innate-dogic/
    ├── apps/                    # desktop、shell；每个应用独立启动
    ├── packages/                # core、kernel、sdk、syntax-highlighting
    ├── plugins/                 # workspace、model-gateway；由应用组合
    ├── services/                # model-gateway、harness-runtime
    ├── bin/magpie.exe           # 统一开发/集成二进制
    └── tsconfig.base.json       # 产品 TS 基座
```

## 关键决策

| 决策 | 当前选择 | 目的 |
| --- | --- | --- |
| 包管理器 | 根级 pnpm workspaces | 只有一张依赖图和一套门禁 |
| 实现语言 | 全部 strict TypeScript | 产品、服务、网站与工具统一 |
| workspace 范围 | `innate-dogic/{apps,packages,plugins,services}/*` + `sites/*` | 应用、插件与服务独立组合 |
| 包命名 | 产品统一 `@dogic/*` | 避免同名后端/前端工程边界 |
| 插件方式 | plugins 独立 package，apps 显式装配；当前有 workspace、model-gateway 两个插件 | 不把插件源码塞进应用内部；DSH Runtime / Workbench 双向宿主适配插件属于 M3–M4 计划，尚未实现 |
| Node 版本 | >= 20 | 满足 dsh 运行要求 |
| 构建脚本白名单 | `onlyBuiltDependencies: [electron]` | 仅放行 Electron 下载脚本 |

## 执行与验证

```bash
pnpm install
pnpm -r exec node -e "console.log(require('./package.json').name)"
pnpm build
pnpm typecheck
pnpm test
```

当前产品包包括 desktop、shell、core、kernel、sdk、syntax-highlighting、两个插件和两个 service 模块；方案网站独立在同一根 workspace 中。
