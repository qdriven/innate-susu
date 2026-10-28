# W5：独立 Browser Surface

## 阶段目标

新增普通网页 browser Surface，与 Harness/magpie 的受管 WebContents 区分。使用独立分区和显式导航、下载、权限策略；不在 DSH 内再嵌浏览器，不实现通用自动化。

**前置**：W4 全绿。

## W5.1 定义 browser provider 与安全策略

- **改动位置**：`plugins/browser` shared/main、Surface capability 契约。
- **实施**：
  1. 定义 open/navigate/back/forward/reload/activate/deactivate/close 的最小接口。
  2. `network:navigate` 只表示导航，不自动授予下载、摄像头、麦克风、通知、剪贴板或任意 JS 执行。
  3. 明确允许 http/https；file、data、javascript、chrome 等协议默认拒绝，后续需要另立评审。
  4. browser 与 Harness/console 使用不同 providerId、partition 和快照策略，认证 URL 不能转普通书签。
  5. Q3 只消费受控 navigate，不开放页面脚本注入。
- **验证**：协议白名单、provider 隔离、非法 descriptor/capability 单测。
- **完成标准**：安全默认值和公开接口在实现前固定。

## W5.2 实现独立 WebContents 生命周期

- **改动位置**：browser main provider、W1 SurfaceHost/provider registry。
- **实施**：
  1. 使用独立 WebContentsView 和明确持久 partition，contextIsolation、nodeIntegration: false、sandbox: true。
  2. browser view 复用 W1 attach/detach/bounds/close，不为每页新建 BrowserWindow。
  3. 标签切换不销毁会话，close 清除本 Surface 的 view 与监听器。
  4. 页面崩溃、无响应和加载失败只影响当前 browser Surface，提供重试/关闭。
  5. 禁止宿主持有或调用通用 `executeJavaScript` 通道。
- **验证**：多浏览器标签、切换不重载、关闭回收、加载失败、崩溃隔离和窗口关闭。
- **完成标准**：browser 与既有 WebContents 客人共存且互不替换分区或状态。

## W5.3 实现导航与外链规则

- **改动位置**：browser renderer、main navigation guard、preload。
- **实施**：
  1. 提供地址栏、前进/后退/刷新和加载状态；URL 输入在 main 再次解析和校验。
  2. 当前标签导航与“新窗口打开”分开处理；新窗口请求默认拒绝。
  3. 用户明确选择的外链交系统浏览器，仅允许 http/https。
  4. 重定向后的最终协议与地址同样校验，不只检查初始输入。
  5. 错误页不暴露认证 query 或内部堆栈。
- **验证**：普通 URL、非法协议、重定向、window.open、外链、错误页和返回历史测试。
- **完成标准**：导航可控且用户可理解，未创建任意新窗口或协议绕过。

## W5.4 默认拒绝敏感权限

- **改动位置**：browser main session permission handlers。
- **实施**：
  1. 对摄像头、麦克风、通知、地理位置、剪贴板、MIDI、USB 等请求默认拒绝。
  2. 权限事件记录 origin、类型和结果，不记录页面敏感内容。
  3. 如未来开放某权限，必须按 origin+类型独立审批并新增任务，不在本阶段预留自动允许。
  4. Harness/console 的 session 不继承 browser handler，反之亦然。
- **验证**：测试页面逐类请求权限均为拒绝，其他 Surface 不受影响。
- **完成标准**：browser 无隐式敏感权限，拒绝结果可诊断。

## W5.5 实现受控下载

- **改动位置**：browser main session download handler、renderer 状态提示。
- **实施**：
  1. 下载不自动写入默认目录，调用系统保存路径选择器由用户确认。
  2. 显示文件名、来源 origin、进度、完成/取消/失败状态；不自动执行下载内容。
  3. 取消或关闭 Surface 时按定义取消下载并清理临时状态。
  4. 路径选择和写入只由 main/session 处理，renderer 不获得任意文件写 API。
- **验证**：用户取消、正常完成、下载失败、重复文件名、关闭 Surface、恶意文件名等路径。
- **完成标准**：下载只进入用户明确选择的位置，无自动执行和隐式路径。

## W5.6 保存安全浏览布局状态

- **改动位置**：browser snapshot、Surface snapshot 恢复。
- **实施**：
  1. 快照可保存普通 http/https URL、标题、activeId 和必要 workspace 引用。
  2. 对带 token/key 等敏感参数的 URL 默认拒绝持久化或安全剥离，并明确提示不能恢复认证状态。
  3. 不保存 cookie、session、页面 DOM、表单、下载内容或 WebContents 对象。
  4. 重载恢复需用户可见地重新导航；失败不影响其他 Surface。
- **验证**：普通页面恢复、敏感 URL、版本不兼容、失效网站和隐私扫描。
- **完成标准**：布局可恢复但不把浏览器变成凭据快照。

## W5.7 完成端到端与便携验收

- **改动位置**：tools/smoke-browser/desktop、证据。
- **实施**：
  1. 用本地受控 HTTP 测试站验证导航、外链、权限、下载和恢复，避免依赖公网不稳定页面。
  2. 与 Harness、console、terminal、文档交替切换，验证 bounds 和生命周期。
  3. 运行便携目录，检查独立 partition、无孤儿 view/进程和敏感信息。
  4. 全量门禁、W4 回归与证据归档。
- **验证**：W5.1–W5.6 的每条规则有自动或真实桌面结果。
- **完成标准**：browser 全链路安全可用，才允许开始 Q1。

## 阶段回退

禁用 browser provider 并恢复 W4 便携基线。任何权限或下载问题都通过默认拒绝回退，不影响 Harness、terminal 和工作区。
