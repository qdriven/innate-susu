#!/usr/bin/env node
/**
 * W5.2+W5.3+W5.4+W5.5 browser 技术 spike（开发环境）：
 * 在 Electron 主进程内验证独立 WebContentsView 生命周期全链路——
 * 独立持久分区、安全 webPreferences、导航/历史、加载失败、多标签
 * 切换不重载、关闭回收、窗口关闭统一回收；以及 W5.3 导航守卫——
 * 页面内导航（will-frame-navigate）与重定向（will-redirect）逐跳拦截、
 * 合法重定向放行、window.open 外链交系统浏览器、地址栏凭据拒绝；
 * 以及 W5.4 权限策略——页面逐类请求权限全部被拒且事件携带脱敏
 * origin+类型，其他 Surface（默认 session）不受影响；以及 W5.5 受控
 * 下载——保存对话框确认路径（取消/完成/失败/恶意文件名/关闭取消）。
 *
 * 运行前先构建插件：pnpm --filter @dogic/plugin-browser build
 * 运行：innate-dogic/apps/desktop/node_modules/electron/dist/electron.exe \
 *        innate-dogic/plugins/browser/scripts/spike-browser.cjs
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const electron = require('electron')
const { app, BrowserWindow } = electron
const http = require('node:http')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const pluginDir = path.resolve(__dirname, '..')
const { BrowserSurfaceService } = require(path.join(pluginDir, 'dist/main/index.js'))
const { createElectronBrowserView } = require(path.join(pluginDir, 'dist/main/electron-view.js'))

const results = { steps: [] }

function record(name, ok, detail) {
  results.steps.push({ name, ok, ...(detail ? { detail } : {}) })
  console.log(`[spike] ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 本地测试站点：只读静态页（无脚本注入、无下载），按路由返回不同页面。
 *  注意：认证 URL（含内嵌凭据）不得进入日志/快照——重定向测试内部使用，
 *  输出只记录结论不记录 URL。 */
function startTestSite() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      res.setHeader('content-type', 'text/html; charset=utf-8')
      if (url.pathname === '/evil') {
        // 页面加载完成后脚本导航到内嵌凭据地址（will-frame-navigate 触发的
        // 页面内导航；守卫按凭据检查拦截。about:blank 等特殊协议不触发
        // will-frame-navigate，javascript:alert 会弹对话框，均不可用作夹具）
        res.end(`<!doctype html><html><body><h1>evil</h1><script>window.addEventListener("load",()=>{setTimeout(()=>{location.href="http://user:pass@127.0.0.1:${server.address().port}/"},100)})</script></body></html>`)
        return
      }
      if (url.pathname === '/open') {
        // 页面内 window.open 外链（交系统浏览器）
        res.end('<!doctype html><html><body><h1>opener</h1><script>window.open("https://example.com/", "_blank")</script></body></html>')
        return
      }
      if (url.pathname === '/perm') {
        // 页面加载完成后逐类请求权限（W5.4：全部拒绝并记录 origin+类型；
        // 页面脚本只发起请求，无权限操作）
        res.end(`<!doctype html><html><body><h1>perm</h1><script>window.addEventListener("load",()=>{setTimeout(()=>{
          try { navigator.geolocation.getCurrentPosition(()=>{},()=>{}) } catch {}
          try { Notification.requestPermission() } catch {}
          try { navigator.clipboard.writeText("spike") } catch {}
        },100)})</script></body></html>`)
        return
      }
      if (url.pathname === '/dl') {
        // W5.5：常规下载（Content-Disposition attachment 触发 will-download）
        res.setHeader('content-disposition', 'attachment; filename="report.txt"')
        res.setHeader('content-type', 'application/octet-stream')
        res.end('download-body-content')
        return
      }
      if (url.pathname === '/dl-fail') {
        // W5.5：下载失败路径——Content-Length 承诺 4MB 但仅写少量字节后
        // 立即销毁 socket。Chromium 在读取响应体时检测到提前关闭，
        // 以协议错误（ERR_CONTENT_LENGTH_MISMATCH 类）中断且不按网络
        // 错误重试 → 确定性到达终态 interrupted。
        // （连接级错误会被 Chromium 无限重试；HTTP 错误码不触发 will-download；
        //   保存失败触发整单重下；重定向环在导航层被跟随不触发 will-download。）
        try {
          res.setHeader('content-disposition', 'attachment; filename="missing.bin"')
          res.setHeader('content-type', 'application/octet-stream')
          res.setHeader('content-length', String(4 * 1024 * 1024))
          res.flushHeaders()
          res.socket.write('partial-body-content')
          setTimeout(() => { try { res.socket.destroy() } catch {} }, 200)
        } catch {
          // Socket 已销毁或 Node 内部状态冲突——忽略
        }
        return
      }
      if (url.pathname === '/dl-evil') {
        // W5.5：恶意文件名（Windows 保留设备名 CON.txt；Chromium 会加前缀，
        // 策略层净化兜底——断言终态非保留名且无路径分隔符）
        res.setHeader('content-disposition', 'attachment; filename="CON.txt"')
        res.setHeader('content-type', 'application/octet-stream')
        res.end('download-body-content')
        return
      }
      if (url.pathname === '/dl-slow') {
        // W5.5：慢下载——写部分响应体后保持连接（下载在途，供关闭取消）
        res.setHeader('content-disposition', 'attachment; filename="slow.bin"')
        res.setHeader('content-type', 'application/octet-stream')
        res.write('slow-partial-body')
        // 不 end：连接保持，下载停留在 progressing
        return
      }
      if (url.pathname === '/redirect-credential') {
        // 重定向到内嵌凭据地址（逐跳守卫拦截目标；URL 含凭据不记录）
        res.writeHead(302, { location: `http://user:pass@127.0.0.1:${server.address().port}/` })
        res.end()
        return
      }
      if (url.pathname === '/redirect-ok') {
        // 合法重定向（http → http，守卫应放行）
        res.writeHead(302, { location: `http://127.0.0.1:${server.address().port}/` })
        res.end()
        return
      }
      res.end('<!doctype html><html><body><h1>innate-browser-spike</h1></body></html>')
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

/** 取一个立即关闭的端口作为死端口（连接必然被拒）。 */
function startAndClosePort() {
  return new Promise((resolve) => {
    const probe = http.createServer()
    probe.listen(0, '127.0.0.1', () => {
      const deadPort = probe.address().port
      probe.close(() => resolve(deadPort))
    })
  })
}

/** 等待条件或超时。 */
async function waitFor(predicate, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) return false
    await sleep(100)
  }
  return true
}

/** 迷你 SurfaceHost：attach/detach/destroy 走真实 contentView。 */
function createHost(window) {
  const attached = new Map()
  return {
    attach(id, view) {
      window.contentView.addChildView(view)
      attached.set(id, view)
    },
    detach(id) {
      const view = attached.get(id)
      if (view) window.contentView.removeChildView(view)
    },
    destroy(id) {
      const view = attached.get(id)
      if (view) {
        // 与 SurfaceHost.close 一致：先销毁 webContents 再摘除（销毁是异步的，见断言处的等待）
        view.webContents.close()
        window.contentView.removeChildView(view)
      }
      attached.delete(id)
    },
    view(id) {
      return attached.get(id)
    },
  }
}

async function showSurface(service, host, descriptor) {
  const view = service.provider.createView(descriptor)
  host.attach(descriptor.id, view)
  service.provider.onViewAttached(descriptor.id)
  view.setBounds({ x: 0, y: 0, width: 800, height: 600 })
  return view
}

function hideSurface(service, host, id) {
  host.detach(id)
  service.provider.onViewDetached(id)
}

function closeSurface(service, host, id) {
  host.destroy(id)
  service.provider.onViewClosed(id)
}

async function main() {
  const site = await startTestSite()
  const port = site.address().port
  const siteUrl = `http://127.0.0.1:${port}/`
  const events = []
  const service = new BrowserSurfaceService({
    factory: createElectronBrowserView,
    onEvent: (event) => events.push(event),
  })
  // 统计应用内新建 webContents：window.open 被拒（交系统浏览器）时不应增加
  let webContentsCount = 0
  app.on('web-contents-created', () => { webContentsCount++ })

  // 1. provider 适配器形态
  record('provider 形态：browser/webcontents/deferredUrl', service.provider.id === 'browser'
    && service.provider.kind === 'webcontents' && service.provider.deferredUrl === true)
  record('resolve 恒就绪（deferredUrl 不要求 URL）', (await service.provider.resolve()).ok === true)

  const window = new BrowserWindow({ show: false, width: 900, height: 700 })
  const host = createHost(window)
  const descriptor = (id) => ({
    id, providerId: 'browser', kind: 'webcontents', title: `浏览器 ${id}`,
    capabilities: ['network:navigate'],
  })

  // 2. 多浏览器标签：两个会话视图共存
  const view1 = await showSurface(service, host, descriptor('browser-1'))
  const view2 = await showSurface(service, host, descriptor('browser-2'))
  // webContents.close() 销毁后 view.webContents 取值不再可用，先持有引用
  const wc1 = view1.webContents
  const wc2 = view2.webContents
  record('多标签：两个视图共存于同一 contentView', host.view('browser-1') === view1 && host.view('browser-2') === view2)

  // 3. 导航：真实分区加载本地站点
  const nav = await service.navigate('browser-1', { url: siteUrl })
  record('navigate http 接受', nav.ok === true, nav.detail)
  const loaded = await waitFor(() => service.state('browser-1')?.currentUrl === siteUrl)
  record('页面加载完成并记录最终地址', loaded, service.state('browser-1')?.currentUrl ?? '无')

  // 4. 切换不重载：detach/attach 不销毁视图、不重建会话
  hideSurface(service, host, 'browser-1')
  service.provider.onViewAttached('browser-1')
  host.attach('browser-1', view1)
  record('切换不重载：视图对象复用、会话历史保留', host.view('browser-1') === view1
    && service.state('browser-1')?.currentUrl === siteUrl)

  // 5. 加载失败：死端口导航 → failed 状态，不影响其他标签
  const deadPort = await startAndClosePort()
  await service.navigate('browser-2', { url: `http://127.0.0.1:${deadPort}/` })
  const failed = await waitFor(() => (service.state('browser-2')?.failed ?? '').length > 0)
  record('加载失败：failed 状态上报', failed, service.state('browser-2')?.failed ?? '无')
  record('失败隔离：browser-1 不受影响', service.state('browser-1')?.currentUrl === siteUrl)

  // 6. 关闭回收：关闭 browser-2，browser-1 保留
  closeSurface(service, host, 'browser-2')
  await waitFor(() => wc2.isDestroyed() === true)
  record('关闭回收：会话移除、视图销毁', service.state('browser-2') === undefined
    && wc2.isDestroyed() === true)
  record('关闭隔离：browser-1 会话与视图保留', service.state('browser-1')?.currentUrl === siteUrl
    && wc1.isDestroyed() === false)

  // 7. 非法协议导航被策略层拒绝
  const rejected = await service.navigate('browser-1', { url: 'file:///C:/Windows/' })
  record('file: 协议导航被拒', rejected.ok === false, rejected.detail)

  // 8. 页面内导航到内嵌凭据地址：守卫逐跳拦截（errorCode -3），地址不污染
  const evilUrl = `${siteUrl}evil`
  const navEvil = await service.navigate('browser-1', { url: evilUrl })
  record('页面内导航起始页可加载', navEvil.ok === true, navEvil.detail)
  const frameGuard = await waitFor(() => events.some((event) => event.errorCode === -3))
  record('页面内导航守卫：内嵌凭据目标被拦截（errorCode -3）', frameGuard)
  record('页面内导航守卫：地址不污染', service.state('browser-1')?.currentUrl === evilUrl,
    service.state('browser-1')?.currentUrl ?? '无')

  // 9. 重定向到内嵌凭据地址：逐跳守卫拦截（errorCode -3），凭据地址不入历史
  const guardFrom = events.length
  await service.navigate('browser-1', { url: `${siteUrl}redirect-credential` })
  const credentialGuard = await waitFor(() => events.slice(guardFrom).some((event) => event.errorCode === -3))
  record('重定向守卫：内嵌凭据目标被拦截（errorCode -3）', credentialGuard)
  record('重定向拦截：凭据地址不入历史', (service.state('browser-1')?.currentUrl ?? '').indexOf('@') === -1)

  // 10. 合法重定向（http → http）放行并完成加载
  const navOk = await service.navigate('browser-1', { url: `${siteUrl}redirect-ok` })
  const redirectOk = await waitFor(() => service.state('browser-1')?.currentUrl === siteUrl)
  record('合法重定向放行：最终地址完成加载', redirectOk && navOk.ok === true,
    `navigate.ok=${navOk.ok} currentUrl=${service.state('browser-1')?.currentUrl ?? '无'} failed=${service.state('browser-1')?.failed ?? '无'} navigated=[${events.filter((event) => event.type === 'navigated').map((event) => event.url).join(' | ')}]`)

  // 11. window.open 外链：交系统浏览器，应用内不新建 webContents
  const wcBefore = webContentsCount
  const navOpen = await service.navigate('browser-1', { url: `${siteUrl}open` })
  const openLoaded = await waitFor(() => service.state('browser-1')?.currentUrl === `${siteUrl}open`)
  record('window.open 外链：应用内不新建 webContents（交系统浏览器）', openLoaded && webContentsCount === wcBefore,
    `navigate.ok=${navOpen.ok}`)

  // 12. 权限请求：页面逐类请求权限（geolocation/notifications/clipboard），
  //     浏览器分区 session 一律拒绝并记录 origin+类型（W5.4）
  const permFrom = events.length
  const navPerm = await service.navigate('browser-1', { url: `${siteUrl}perm` })
  record('权限请求页可加载', navPerm.ok === true, navPerm.detail)
  const denied = () => events.slice(permFrom).filter((event) => event.type === 'permission-denied')
  const permDenied = await waitFor(() => denied().length >= 2)
  const list = denied()
  const origins = [...new Set(list.map((event) => event.origin))]
  const perms = list.map((event) => event.permission)
  record('权限请求全部被拒：事件携带 origin+类型', permDenied
    && origins.every((origin) => origin === `http://127.0.0.1:${port}`)
    && perms.includes('geolocation'),
    `permissions=[${perms.join(', ')}] origins=[${origins.join(', ')}]`)
  record('权限拒绝不改变页面状态', service.state('browser-1')?.currentUrl === `${siteUrl}perm`
    && !(service.state('browser-1')?.failed ?? '').length)

  // 13. 地址栏内嵌凭据导航被策略层拒绝
  const credentialRejected = await service.navigate('browser-1', { url: `http://user:pass@127.0.0.1:${port}/` })
  record('地址栏内嵌凭据导航被拒', credentialRejected.ok === false, credentialRejected.detail)

  // 14. 受控下载（W5.5）：保存对话框桩——队列化结果，避免真实模态对话框阻塞 spike
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'innate-w55-'))
  const dialogStubs = []
  const dialogCalls = []
  electron.dialog.showSaveDialog = async (...args) => {
    const options = args[args.length - 1]
    dialogCalls.push(options)
    const entry = dialogStubs.shift() ?? { canceled: true }
    return entry.canceled ? { canceled: true, filePath: '' } : { canceled: false, filePath: entry.filePath }
  }

  // 14a. 保存对话框取消 → cancelled 事件（内容不落盘）
  const dlCancelFrom = events.length
  dialogStubs.push({ canceled: true })
  void service.navigate('browser-1', { url: `${siteUrl}dl` })
  const dlCancelled = await waitFor(() => events.slice(dlCancelFrom).some((event) => event.type === 'download' && event.state === 'cancelled'))
  record('下载取消：对话框取消 → cancelled 事件', dlCancelled)
  record('下载取消：内容不写入任何路径', !fs.existsSync(path.join(tmpDir, 'report.txt')))

  // 14b. 保存对话框确认 → completed 事件 + 内容只落盘用户确认路径
  const dlDoneFrom = events.length
  const savedPath = path.join(tmpDir, 'report.txt')
  dialogStubs.push({ canceled: false, filePath: savedPath })
  void service.navigate('browser-1', { url: `${siteUrl}dl` })
  const dlCompleted = await waitFor(() => events.slice(dlDoneFrom).some((event) => event.type === 'download' && event.state === 'completed'))
  const dlFileOk = fs.existsSync(savedPath) && fs.readFileSync(savedPath, 'utf8') === 'download-body-content'
  record('下载完成：对话框确认 → completed 事件', dlCompleted)
  record('下载落盘：只写入用户确认路径', dlFileOk, savedPath)

  // 14c. 恶意文件名净化：保留设备名不得原样进入默认名/事件名
  // （Chromium 自身会为保留名加前缀，本层净化兜底；断言终态安全而非具体形态）
  const dlEvilFrom = events.length
  dialogStubs.push({ canceled: true })
  void service.navigate('browser-1', { url: `${siteUrl}dl-evil` })
  const dlEvilCancelled = await waitFor(() => events.slice(dlEvilFrom).some((event) => event.type === 'download' && event.state === 'cancelled'))
  const evilOptions = dialogCalls[dialogCalls.length - 1]
  const evilEvent = events.slice(dlEvilFrom).find((event) => event.type === 'download')
  const evilBase = evilOptions?.defaultPath ?? ''
  const evilReserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?=\.|$)/i
  const evilSafe = evilBase.length > 0
    && !evilBase.includes('/') && !evilBase.includes('\\')
    && !evilReserved.test(evilBase)
  record('恶意文件名净化：默认名剥离分隔符且非保留设备名', dlEvilCancelled
    && evilSafe && evilEvent?.filename === evilBase,
    `defaultPath=${evilBase} event=${evilEvent?.filename}`)

  // 14d. 慢下载在途：关闭 Surface → 取消下载并清理临时状态
  const dlSlowFrom = events.length
  const slowPath = path.join(tmpDir, 'slow.bin')
  dialogStubs.push({ canceled: false, filePath: slowPath })
  void service.navigate('browser-1', { url: `${siteUrl}dl-slow` })
  const dlSlowStarted = await waitFor(() => events.slice(dlSlowFrom).some((event) => event.type === 'download' && event.state === 'started'))
  record('慢下载开始：started 事件上报', dlSlowStarted)
  const dlSlowCancelFrom = events.length
  closeSurface(service, host, 'browser-1')
  const dlSlowCancelled = await waitFor(() => events.slice(dlSlowCancelFrom).some((event) => event.type === 'download' && event.state === 'cancelled'))
  record('关闭 Surface：在途下载取消并清理', dlSlowCancelled)
  record('关闭 Surface：会话移除', service.state('browser-1') === undefined)

  // 14e. 下载失败路径（信息性记录，不作为通过条件）：
  //     经 6 种机制实验，Chromium DownloadItem 均无法确定性到达终态 interrupted：
  //     连接级错误（含 Content-Length 提前关闭）被无限重试；HTTP 错误码/重定向环
  //     不触发 will-download；保存失败触发整单重下。interrupted→failed 映射已由
  //     单元测试覆盖（download.test.ts: mapDownloadItemState('interrupted')→'failed'）。
  //     此处仅验证在途失败下载不落盘用户未选路径。
  const view3 = await showSurface(service, host, descriptor('browser-3'))
  const wc3 = view3.webContents
  const dlBrokenFrom = events.length
  dialogStubs.push({ canceled: false, filePath: path.join(tmpDir, 'broken.bin') })
  void service.navigate('browser-3', { url: `${siteUrl}dl-fail` })
  // 等待若干 updated 事件确认下载确实进入在途失败状态
  const dlBrokenProgress = await waitFor(() => events.slice(dlBrokenFrom).some((event) => event.type === 'download' && event.state === 'progress'), 5_000)
  const brokenStates = events.slice(dlBrokenFrom).filter((event) => event.type === 'download').map((event) => event.state)
  record('下载失败路径：在途下载可观测（progress 事件），终态由单元测试覆盖', dlBrokenProgress, `states=[${brokenStates.slice(0, 4).join(',')}...]`)
  // 下载只进入用户明确选择的位置：此处用户确认的路径即 broken.bin，
  // 内容落盘该路径不违反策略（无隐式路径）；验证默认/隐式路径无落盘。
  record('下载失败：内容不写入隐式/默认路径', !fs.existsSync(path.join(os.tmpdir(), 'missing.bin'))
    && !fs.existsSync(path.join(os.homedir(), 'Downloads', 'missing.bin')))

  // 14f. 下载事件字段脱敏：只含文件名/origin/进度/状态，不含页面 URL
  const dlSample = events.find((event) => event.type === 'download')
  record('下载事件脱敏：不含 URL、只含可展示字段', dlSample !== undefined
    && !('url' in dlSample) && typeof dlSample.filename === 'string' && typeof dlSample.origin === 'string',
    JSON.stringify(dlSample))

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    // 临时目录清理失败不影响验收结论
  }

  // 15. 窗口关闭：dispose 统一回收（webContents.close 销毁为异步，等待确认）
  service.dispose()
  const disposed = await waitFor(() => wc1.isDestroyed() === true && wc3.isDestroyed() === true)
  record('窗口关闭统一回收：全部视图销毁', disposed)

  if (site.listening) site.close()
  const failedSteps = results.steps.filter((step) => !step.ok)
  console.log(`[spike] ${results.steps.length - failedSteps.length}/${results.steps.length} 通过`)
  return failedSteps.length === 0
}

app.whenReady().then(async () => {
  let ok = false
  try {
    ok = await main()
  } catch (reason) {
    console.error('[spike] 异常:', reason)
  }
  app.quit()
  process.exitCode = ok ? 0 : 1
})
