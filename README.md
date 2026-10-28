# innate-desktop

innate-desktop 产品 monorepo:共享底座 + 轻应用平台。UI 基座来自 [innate-fe](../innate-fe) 基础仓,以私有 npm registry 源码包方式消费,**不做源码并入**。

## 结构

```text
innate-desktop/
├── apps/              桌面应用(按 Plan2 重新实现)
├── packages/          L2 组合件与平台原语(建在 @innate/ui 之上)
├── docs/              总体计划与设计文档(入口:docs/README.md)
└── .agents/skills/    susu-overview 总控技能(UI 纪律与路由)
```

旧 `apps/susu-web` 验证应用已废弃删除，不再作为产品基线。桌面实现与迁移任务见 [Plan2](docs/susu/plan2/README.md)。

## 常用命令

```bash
pnpm install            # 安装 workspace 依赖(@innate/* 走 .npmrc 指向的私有源)
pnpm ui:sync            # 基础仓 @innate/* 发布到本地 Verdaccio 并重装(未运行自动拉起;同版本幂等)
pnpm ui:sync:bump       # 基础仓源码改过后 bump patch 版本再重装
```

`dev`、`build` 等 product 命令随新的桌面应用一起建立，不保留指向废弃 Web 应用的空壳脚本。

## 纪律

UI 相关任务先读 [.agents/skills/susu-overview/SKILL.md](.agents/skills/susu-overview/SKILL.md):primitive 只从 `@innate/ui` 取、token 只取语义变量、明暗走 `.dark` class;改组件去基础仓 fe-ui,不在此处改。
