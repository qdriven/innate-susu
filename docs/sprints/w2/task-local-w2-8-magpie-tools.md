---
schemaVersion: 1.0.0
id: task-local-w2-8-magpie-tools
title: W2.8 magpie 版本钉死与按需获取（tools 层）
createdAt: 2026-10-29T17:13:43.640194Z
updatedAt: 2026-10-29T17:17:28.150987Z
status: done
branch: 
repository: 
sourceKind: local
sourcePath: 
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
prNumber: 
prUrl: 
prState: 
prTitle: 
prUpdatedAt: 
---

## 任务上下文

### 问题

45MB 的 magpie.exe 以二进制 blob 跟踪在 git 里：版本更新即一次 45MB blob 进历史永久膨胀；magpie 自更新器（默认 6h 自查）会原地替换被跟踪文件，制造大 diff 与版本漂移——开发机/并发会话/便携包/隔离集成测试四处版本不一致会让测试结果不可信。

### 目标

版本钉死 + 按需获取（tools 层，electron 模式）： 1. `tools/magpie-version.json` 钉当前已知好版本（0.1.1230 / SHA256 ff061131…14d）。 2. `tools/fetch-magpie.ts`：校验现有 bin（哈希匹配→OK）；缺失→从 INNATE_MAGPIE_SOURCE 指定的本地副本获取；漂移→警告并提示 `magpie update check` 显式重钉。更新渠道信任 magpie 官方 `magpie update`（自带 usemagpie.ai SHA-256 校验），本任务不做下载逻辑。 3. magpie.exe 解除 git 跟踪并 ignore（保留本地文件）；首次装机由 launch 预检指引。 4. launch-desktop.ts 预检接线 fetch-magpie --check（替换现有「就位」检查）。

### 范围

- tools/magpie-version.json、tools/fetch-magpie.ts、.gitignore、tools/launch-desktop.ts 预检项
- w2 sprint 内任务卡与证据

### 非目标

- 不实现下载器（信任官方 update 渠道）
- 不动 launcher.ts 的 resolveMagpieBin 优先级链（env→打包资源→仓内 bin→PATH，已覆盖系统级覆盖）
- 不在 w2 实施门禁前动网关产品代码

### 依赖


### 假设

- 本机现存 magpie.exe 0.1.1230 即当前已知好版本（W0.1 指纹一致）。

### 未决问题

- 无（官方 update 渠道的代理/镜像由 magpie 自身配置承载，不归本仓）。

## 全局上下文

### 摘要

Sprint W2（docs/sprints/w2/README.md）子任务；版本一致性是 W2.2/W2.6 网关收口与集成测试的前提。

### 来源

- docs/sprints/w2/README.md
- docs/susu/plan/phases/W2-runtime.md
- docs/susu/plan/evidence/W0/environment.md（W0.1 指纹）

### 约束

- passed 必须有可核查证据；解跟踪动作必须保留本地可用文件
- 严格 TS；tools 层不引产品代码

### 全局更新

- 需要：否
- 计划：收口时在 plan README 状态板 w2 行提及

## 设计影响

### 是否受影响

否

### 现状行为

magpie.exe 被 git 跟踪；版本无钉死；更新器改文件产生脏 diff。

### 目标行为

git 只存版本/哈希；bin 按需获取+常驻校验；漂移显式可检。

### 决策

- 钉死以 sha256 为准（版本号仅展示）；获取优先本地副本（INNATE_MAGPIE_SOURCE），渠道信任官方 update
- 预检遇到漂移只警告不自动改（更新必须显式确认，防集成测试悄悄失效）

### 风险

- 首次装机无 bin → launch 预检给明确指引（INNATE_MAGPIE_SOURCE 或官方渠道）

### 全局影响

无

## 功能与验证点

### F1 · 版本钉死与校验

目标：bin 存在性/一致性/漂移三态机器可判
模块：M1
Spec：S1

- F1-V1 [passed] --check：哈希匹配时 OK（幂等，无网络）
  - 方法：fetch-magpie --check 在当前机上运行
  - 证据：magpie:check 幂等 OK（sha256 一致，无网络）——2026-10-30 实测 exit 0
- F1-V2 [passed] 缺失态：无 bin 时给出获取指引且退出码区分
  - 方法：临时改名 bin 模拟缺失后恢复
  - 证据：缺失态 exit 2 + 三条获取指引（INNATE_MAGPIE_SOURCE/官方 update/官方渠道）——临时改名实测
- F1-V3 [passed] 漂移态：哈希不符时警告 + update check 提示，不静默
  - 方法：以 --from 提供一份修改副本模拟漂移
  - 证据：漂移态 exit 3：坏副本被拒（哈希不符显式对比）+ 重钉指引；恢复真副本后 check 幂等回归
- F1-V4 [passed] git 不再跟踪 magpie.exe 且本地文件保留可用
  - 方法：git ls-files 为空 + --version 正常
  - 证据：git rm --cached 后 ls-files 为 0；本地 --version 正常（magpie 0.1.1230）；.gitignore 命中

### F2 · launch 预检接线

目标：一键启动自动执行版本校验
模块：M3
Spec：S1

- F2-V1 [passed] launch:check 输出含 magpie 版本校验结果
  - 方法：运行 pnpm launch:check
  - 证据：launch:check 输出 magpie 校验行（预检接线实测）

## 涉及模块

- M1 [add] tools/magpie-version.json — 钉死的版本与 SHA256
- M2 [add] tools/fetch-magpie.ts — 校验/获取/漂移检测
- M3 [modify] tools/launch-desktop.ts — 预检接线
- M4 [modify] .gitignore — innate-dogic/bin/magpie.exe

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W2-runtime.md — W2 域约束来源，验收以本卡为准

## 交付记录

- 2026-10-30 建档（用户指示处理）。
- tools 层任务可独立于 W1c 门禁实施
- 三态自测+fetch 正路径+launch 接线全过

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
