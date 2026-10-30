#!/usr/bin/env node
/**
 * W5.2+W5.3+W5.4 browser 技术 spike（开发环境）：
 * 在 Electron 主进程内验证独立 WebContentsView 生命周期全链路——
 * 独立持久分区、安全 webPreferences、导航/历史、加载失败、多标签
 * 切换不重载、关闭回收、窗口关闭统一回收；以及 W5.3 导航守卫——
 * 页面内导航（will-frame-navigate）与重定向（will-redirect）逐跳拦截、
 * 合法重定向放行、window.open 外链交系统浏览器、地址栏凭据拒绝；
 * 以及 W5.4 权限策略——页面逐类请求权限全部被拒且事件携带脱敏
 * origin+类型，其他 Surface（默认 session）不受影响。
 *
 * 运行前先构建插件：pnpm --filter @dogic/plugin-browser build
 * 运行：innate-dogic/apps/desktop/node_modules/electron/dist/electron.exe \
 *        innate-dogic/plugins/browser/scripts/spike-browser.cjs
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { app, BrowserWindow } = require('electron')
const http = require('node:http')
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

  // 14. 窗口关闭：dispose 统一回收（webContents.close 销毁为异步，等待确认）
  service.dispose()
  const disposed = await waitFor(() => wc1.isDestroyed() === true)
  record('窗口关闭统一回收：全部视图销毁', disposed)

  site.close()
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
