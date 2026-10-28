# 构建路径（平台化重启版）

> 版本：v3.0 草案 · 2026-10-27。构建矩阵、命令、门禁、分发。
> 旧 `docs/build-path/` 的 bundler/编译器/分发打包器三分法仍然有效，此处只写增量和变化。

## 1. 构建矩阵

| 范围 | 工具 | 产物 | 备注 |
| --- | --- | --- | --- |
| `frameworks/innate-fe` | `tsc`（ESM + d.ts）+ token CSS 随包分发 | `dist/*` | React 组件库；renderer 由 electron-vite 从源码/别名打入 |
| `frameworks/innate-backend` | `tsc -b`（NodeNext，逐文件） | `dist/*.js + *.d.ts` | 纯 Node；不进 renderer bundle |
| desktop main / preload / renderer | electron-vite + Vite + React | `apps/desktop/out/*` | 不变；main/preload CJS、renderer ESM 的双模块格式经验来自原型（两套 tsconfig，勿混一个 outDir） |
| plugins / packages / services | 各自 tsc（现状不变） | `dist/*` | desktop 按别名从源码打包，便携包无需逐包 dist |
| 轻应用包（plugins/light-apps 或外部目录） | **不构建**：静态清单 + HTML/MD + （v1）MCP 服务独立构建 | 目录或内容寻址 zip | 加载器 sha256 校验；zip 格式 P7 定稿 |
| `architecture-policy.yaml` | `tools/check-policy.ts`（P0 新增） | 校验报告 | requires 方向 + publicEntrypoints 存在性 |
| 方案网站 / tools | 不变 | — | — |

## 2. 命令（根目录）

```bash
pnpm install && pnpm build && pnpm typecheck && pnpm test   # 全量门禁（语义不变，覆盖 frameworks 后自动包含）
pnpm dev / pnpm dev:shell / pnpm smoke:desktop              # 不变
pnpm verify:overlay / pnpm check:typescript                 # 不变
pnpm check:policy                                           # P0 新增
pnpm package:dir / pnpm package:portable                    # 不变；打包后必跑真实冒烟
```

## 3. workspace 与原型隔离

- `frameworks/*` 加入 `pnpm-workspace.yaml` 的 packages 列表（P0）。
- `prototypes/kimi-work-clone` **不加入** workspace：独立 package.json + `pnpm --ignore-workspace install`；不进门禁、不被产品 import；移植其代码进底座时按 strict TS + 契约测试重写。
- Electron 版本策略：frameworks 不依赖 electron；desktop 与原型同为 43.7.11，升级须同步并跑冒烟。

## 4. 门禁

1. 全量门禁（build/typecheck/test）绿；测试基线只增不减（83 项 @2026-10-26）。
2. `check:policy` 绿（P0 起纳入全量门禁）。
3. `check:typescript` 绿：frameworks 属产品目录，禁 JS 源码。
4. 每个触碰 renderer 的 P 里程碑：`smoke:desktop` 真实冒烟 + 明暗截图，证据入 `docs/innate-dogic/evidence/<里程碑>/`。
5. 轻应用加载器改动：非法清单/哈希不符/权限拒绝三组负路径必须在单测覆盖（fail closed 验收）。

## 5. 分发边界

- 桌面便携包结构不变（`package:portable`；NSIS 仍待验证，沿用旧 M7 要求）。
- 新增：轻应用分发物 = 目录（开发/侧载）或内容寻址 zip（市场）；两者同构——`manifest.json + 引用文件 + integrity.files[]`。分发物**不含**可执行主进程代码（v1 MCP 服务进程除外，届时单独评审签名与沙箱）。
- dsh / magpie 是否随包发布的决策不变：仍需 `extraResources` 专项设计，不因平台化重启而默认打包。
