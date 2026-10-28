# W5 · browser Surface

> 预估 1–2 天 · 依赖：W4（复用其 Surface 槽与能力登记模式；技术上只依赖 W1 的多标签槽，排 W4 后是因为 W4 先验证了「非 WebContentsView 容器」，W5 回到 web 容器但用独立分区）
> 目标：壳内置受控浏览器——独立 session 分区、权限默认拒、外链外跳、下载可控。**不在 DSH 里再嵌浏览器。**

## 任务卡

### W5.1 browser Surface（main 进程）

- **做什么**：
  - 新建 `main/browser/BrowserHost`：`WebContentsView` + **独立持久分区**（`partition: 'persist:browser-surface'`，与壳 renderer、DSH harness、magpie 控制台的 session 完全隔离）。
  - 权限默认拒：`setPermissionRequestHandler` 全部 deny（media/geolocation/notifications/clipboard-read…）；每次拒绝留日志（不含 URL 查询参数里的 token——脱敏后再落盘，硬约束 3）。
  - 外链：`window.open`/`target=_blank`/`setWindowOpenHandler` 一律 `shell.openExternal` 跳系统浏览器；view 内导航只允许用户显式输入的 URL。
  - 下载：`will-download` → 系统保存对话框（用户自选路径）；不静默落盘。
  - 注册为 Surface（id `browser`）进 W1.3 标签槽；多浏览器标签允许（各自 view，上限随 W4.4 的并发约定）。
- **如何验证**：加载公开网页截图；权限请求被拒（构造触发 geolocation 的页面，断言 deny + 日志脱敏）；`window.open` 跳系统浏览器；下载弹保存框。

### W5.2 最小地址栏 UI

- **做什么**：
  - 标签内容：地址栏（输入 URL + 回车导航；非法 URL 显式报错）+ back/forward/reload/stop + 加载进度；不做收藏/历史/多窗口（v0 明确不做）。
  - UI 全部取 `@innate/ui` 原语与 token；URL 输入框是唯一用户输入面，**不提供任意 JS 执行入口**（无 devtools 面向用户入口；开发期用主进程开关打开，默认关）。
- **如何验证**：地址栏导航/回退/刷新闭环 DOM 断言；非法输入（非 http(s)）被拒并提示；devtools 默认不可达（负路径）。

### W5.3 与任务面的契约预留（Q3 用）

- **做什么**：main 侧登记 `network:navigate` 能力描述（v0 仅声明 + 白名单域配置文件占位，实际消费在 Q3）；browser Surface 暴露受控 API：`navigate(url)`、`capture()`（截图给证据用）、`title/url` 只读快照。不开放 DOM 注入/executeJavaScript（硬约束 5）。
- **如何验证**：`navigate` + `capture` 在隔离页面上工作（截图入证据）；越权调用（renderer 直连）不可达。

## 出口标准

1. 独立分区、权限默认拒、外链外跳、下载自选路径四项全部真实跑通。
2. 无 `executeJavaScript` 进访客 view（diff 审查 + 负路径）；认证/token 不落日志。
3. 测试基线只增（权限 deny、URL 校验、导航闭环）；smoke/overlay 照常绿。
