#!/usr/bin/env node
/**
 * W5.2 browser 技术 spike（开发环境）：
 * 在 Electron 主进程内验证独立 WebContentsView 生命周期全链路——
 * 独立持久分区、安全 webPreferences、导航/历史、加载失败、多标签
 * 切换不重载、关闭回收与窗口关闭统一回收。
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

/** 本地测试站点：只读静态页（无脚本注入、无下载）。 */
function startTestSite() {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.setHeader('content-type', 'text/html; charset=utf-8')
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

  // 8. 窗口关闭：dispose 统一回收（webContents.close 销毁为异步，等待确认）
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
