# W0：基线迁入

## 阶段目标

在不重排 `innate-dogic/` 模块、不改桌面布局和不新增 Surface 的前提下，把 labs 的可运行基线迁入 innate-desktop。旧 `@susu/web` 验证应用已删除，不纳入迁移或门禁；`@innate/ui` 由新桌面 renderer 在 W1 接入。

**前置**：labs 关键 bugfix 已收口，目标仓现有改动已保存；没有另一个 W/Q 阶段同时进行。

**禁止事项**：不扁平化目录、不批量改包名、不换成 `@innate/ui` 页面、不合并两套 Harness、不迁 references/prototypes。

## W0.1 冻结源基线并建立迁移清单

- **改动位置**：`docs/susu/plan/evidence/W0/`；不改产品代码。
- **实施**：
  1. 记录 labs 与 innate-desktop 的 commit、工作区状态和 Node/pnpm 版本。
  2. 在 labs 运行现有 build/typecheck/test/check:typescript/verify:overlay/smoke:desktop，记录实测测试数，而非照抄历史 83。
  3. 列出迁移文件白名单：`innate-dogic/`、`tools/`、`innate-project-canvas/` 和必要根配置。
  4. 列出排除项：`.git`、node_modules、构建产物、references、prototypes、真实用户配置和密钥。
  5. 对 `bin/magpie.exe` 记录版本与哈希，确保后续可核对。
- **验证**：白名单中的每个 workspace 包都能映射到目标路径；排除项不出现在拷贝清单。
- **完成标准**：源基线可复现，实测命令和测试数已保存，迁移清单经复核。

## W0.2 在源基线修复启动日志脱敏

- **改动位置**：labs 的 `apps/desktop/src/main/harness.ts`、`services/harness-runtime/src/index.ts` 及对应测试；修复通过后重新记录源 commit。
- **实施**：
  1. 增加共享或局部最小 `redactLaunchSecrets`，将 DSH/magpie URL 的 token/k/key 等查询参数替换为 `[redacted]`。
  2. 保证运行时可变状态仍持有真实认证 URL，只有日志输出脱敏。
  3. 桌面内存日志、落盘日志和 service log callback 全部经过同一脱敏边界。
  4. 不借本任务调整进程启动参数或 UI。
- **验证**：包含 `dsh web: http://127.0.0.1:<port>/?token=secret` 与 magpie `?k=secret` 的夹具在日志中被脱敏；正常 URL 和非敏感错误仍可读；原始 token 不出现在任何日志断言。
- **完成标准**：安全测试通过，W0.1 基线门禁重新全绿，目标拷贝源包含此修复。
- **回退**：若脱敏影响启动 URL 捕获，停止迁移并只在 labs 修复，不在目标仓临时绕过。

## W0.3 统一目标仓工程身份与 workspace

- **改动位置**：目标根 `package.json`、`pnpm-workspace.yaml`、`.npmrc`、README、UI sync 脚本配置。
- **实施**：
  1. 根工程名统一为 `innate-desktop`，旧 `@susu/web` 应用和专属脚本保持删除，不重新加入 workspace。
  2. workspace 同时包含 `apps/*`、`innate-dogic/apps/*`、`packages/*`、`plugins/*`、`services/*`、`sites` 不适用项不添加，以及 `innate-project-canvas`。
  3. 合并 pnpm onlyBuiltDependencies/allowBuilds 配置，Electron postinstall 与目标现有 esbuild 规则均保留。
  4. `ui:sync` 使用当前目标目录和自动发现 innate-fe；移除写死的 innate-susu 目标路径。
  5. 对齐包管理器与 Node engine；若 labs/root 与新桌面工具链版本不同，先记录兼容矩阵，不批量降级依赖。
- **验证**：`pnpm install` 成功且 lockfile 不含旧 Web importer；`pnpm ui:sync -- --dry-run` 显示正确目标根，不写工作区外路径。
- **完成标准**：目标身份、workspace 和私有 UI 消费路径可重复，不依赖原目录名或废弃应用。

## W0.4 按白名单迁入产品与画布模块

- **改动位置**：目标 `innate-dogic/`、`innate-project-canvas/`。
- **实施**：
  1. 原样复制 W0.1 白名单中的源码、resources、package/tsconfig 和 magpie 二进制。
  2. 保留 `@dogic/*`、`@innate-labs/project-canvas` 包名及 exports，避免本阶段改写 imports。
  3. 不复制 labs 根 README 中的旧相对文档链接，不覆盖目标已有 docs。
  4. 检查所有 workspace 依赖均能由 W0.3 的 patterns 解析。
  5. 检查没有 `.env`、真实 console-key.json、DSH profile 或用户快照进入目标仓。
- **验证**：`pnpm -r list --depth -1` 能看到预期模块；源码 diff 仅含 W0.2 和明确的路径适配；敏感文件扫描无结果。
- **完成标准**：所有计划模块落位且来源可追踪，无排除目录和真实配置。

## W0.5 迁入并适配工程工具与根脚本

- **改动位置**：目标 `tools/`、根 `package.json`、tsconfig/vitest 配置。
- **实施**：
  1. 迁入 smoke-desktop、verify-overlay、package-portable、check-typescript 等工具。
  2. 把工具中的 `INNATE_WORKSPACE_ROOT` 和相对路径解析适配新根；保留显式环境变量覆盖。
  3. 根脚本补齐 build/typecheck/test/check:typescript/dev/dev:shell/smoke:desktop/verify:overlay/package:portable。
  4. 新桌面应用的 build/typecheck 纳入总门禁；不保留指向旧 Web 包的 filter 或空壳脚本。
  5. CI 或本地门禁脚本记录实际命令顺序，避免递归调用自身。
- **验证**：`pnpm build && pnpm typecheck && pnpm test && pnpm check:typescript` 全绿；测试数不少于 W0.1 源基线，新桌面构建成功。
- **完成标准**：目标根一套命令可验证全部已迁入模块，工具不引用 labs 绝对路径。

## W0.6 恢复桌面开发和基线行为

- **改动位置**：仅在路径适配必要时修改 desktop 配置；资源解析保持原语义。
- **实施**：
  1. 启动 Electron 开发模式，验证单实例、窗口控制、simple/dev 模式选择。
  2. 在隔离临时 userData/DSH_HOME 中验证 magpie 检测、模型状态、Harness 启动与控制台 Surface。
  3. 验证工作区选根、文件/Markdown/图片预览、Git status/diff。
  4. 验证 simple overlay 7/7 与 Surface 切换不重载。
  5. 对照 labs 记录每项相同/差异；行为差异必须在本阶段消除，不能留给 W1。
- **验证**：`pnpm verify:overlay && pnpm smoke:desktop` 全绿；真实 DSH/magpie 集成结果另记，不用 mock 替代。
- **完成标准**：M0–M2 行为矩阵全部与源基线一致，日志脱敏仍有效。

## W0.7 验证便携目录与资源完整性

- **改动位置**：electron-builder 配置、package scripts、tools/package-portable，仅修路径与缺漏。
- **实施**：
  1. 构建目录型便携包，确认 renderer/main/preload、simple patch 和 magpie.exe 位于预期位置。
  2. 从便携目录运行真实 Electron 冒烟，不使用开发服务器代替。
  3. 检查关闭后无本任务启动的 Harness/console 孤儿进程。
  4. 检查包内无开发仓绝对路径、用户配置和认证信息。
- **验证**：便携冒烟通过，资源清单和进程检查入证据。
- **完成标准**：便携目录可复制到另一干净目录运行，行为与开发基线一致。

## W0.8 切换迁移执行源并冻结基线

- **改动位置**：`docs/README.md`、相关 Sprint 索引、Plan2 evidence、目标 README。
- **实施**：
  1. 标记 Plan2 为 labs→innate-desktop 的 W/Q 迁移执行源，旧 P 系列标为后续 backlog。
  2. 保留 M4/M5 等历史文档链接，但明确不是本阶段任务。
  3. 保存 W0 全部命令、截图、测试数、版本和已知限制。
  4. 核对本仓技能组（susu-overview、module-kit、task-workflow）在 W0 后的路径与命令全部有效；把 innate-labs 的 innate-dsh-playbook 排障手册迁回本仓并适配（场景 G 已指向本计划）。
  4. 创建可回退的 W0 基线工作点；此后 labs 只收关键 bugfix，目标仓承担前向开发。
- **验证**：新会话从目标 README 能唯一找到 W1 任务，不会同时被引导执行 P0。
- **完成标准**：W0.1–W0.8 均有证据，W0 便携包保留，才允许开始 W1。

## 阶段回退

任一基线行为未恢复，回到 labs 修复并重新执行受影响的 W0 任务。不得通过开启 W1 新壳来掩盖 W0 回归。
