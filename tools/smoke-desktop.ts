#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

interface CdpTarget {
  id: string
  type: string
  url: string
  title?: string
  webSocketDebuggerUrl: string
}
interface CdpMessage {
  id?: number
  result?: unknown
}
interface EvaluateResult {
  result?: { value?: unknown }
}
interface HarnessLaunchResult {
  ok: boolean
  detail?: string
  url?: string
  port?: number
}
interface DesktopWindowBounds {
  left?: number
  top?: number
  width?: number
  height?: number
  windowState?: string
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const withHarness = process.argv.includes('--with-harness')
const packaged = process.argv.includes('--packaged')
const outDir = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  ?? path.join(root, 'docs/susu/plan/evidence/W0/smoke')
mkdirSync(outDir, { recursive: true })
const appDir = path.join(root, 'innate-dogic/apps/desktop')
const electron = packaged
  ? path.join(appDir, 'dist-package/portable/DSH InnateOS/DSH InnateOS.exe')
  : path.join(appDir, 'node_modules/electron/dist/electron.exe')
// 独立 userData 与进程相关调试端口，避免正式预览或上次残留实例造成冲突。
const smokeUserData = path.join(appDir, `dist-package/smoke-user-data-${packaged ? 'packaged' : 'dev'}`)
const debugPort = 20_000 + (process.pid % 30_000)
const launchArgs = packaged ? [`--user-data-dir=${smokeUserData}`] : [appDir, `--user-data-dir=${smokeUserData}`]
const repoName = path.basename(root)
const env: NodeJS.ProcessEnv = { ...process.env, INNATE_WORKSPACE_ROOT: root }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(electron, [...launchArgs, `--remote-debugging-port=${debugPort}`], { env, stdio: 'pipe' })
child.stderr.on('data', (data: Buffer) => process.stderr.write(data))
const watchdog = setTimeout(() => {
  console.error('[smoke] watchdog timeout, forcing exit')
  spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  process.exit(3)
}, withHarness ? 180_000 : 90_000)

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
let ws: WebSocket | undefined
const pending = new Map<number, { resolve: (value: unknown) => void }>()
const execFileAsync = promisify(execFile)
let seq = 0
function cdp<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!ws) return reject(new Error('CDP WebSocket 未连接'))
    const id = ++seq
    pending.set(id, { resolve: resolve as (value: unknown) => void })
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate<T>(expression: string): Promise<T | undefined> {
  const response = await cdp<EvaluateResult>('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  return response.result?.value as T | undefined
}
async function shot(name: string): Promise<void> {
  const response = await cdp<{ data?: string }>('Page.captureScreenshot', { format: 'png' })
  if (!response.data) throw new Error(`截图失败: ${name}`)
  writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(response.data, 'base64'))
  console.log(`[smoke] saved ${name}.png`)
}
const nativeWindowType = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class W1aNativeWindow {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$script:h = (Get-Process -Id ${child.pid}).MainWindowHandle
if ($script:h -eq 0) { throw '未找到 Electron 主窗口句柄' }
`
async function runNativeWindow(script: string): Promise<string> {
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command', `${nativeWindowType}\n${script}`,
  ])
  return stdout.trim()
}
async function getWindowBounds(): Promise<DesktopWindowBounds> {
  const output = await runNativeWindow(`
$r = New-Object W1aNativeWindow+RECT
if (-not [W1aNativeWindow]::GetWindowRect($script:h, [ref]$r)) { throw 'GetWindowRect 失败' }
@{ left=$r.Left; top=$r.Top; width=$r.Right-$r.Left; height=$r.Bottom-$r.Top } | ConvertTo-Json -Compress
`)
  return JSON.parse(output) as DesktopWindowBounds
}
async function setWindowBounds(bounds: DesktopWindowBounds): Promise<void> {
  if ([bounds.left, bounds.top, bounds.width, bounds.height].some((value) => value === undefined)) {
    throw new Error(`窗口 bounds 不完整: ${JSON.stringify(bounds)}`)
  }
  await runNativeWindow(`
if (-not [W1aNativeWindow]::SetWindowPos($script:h, [IntPtr]::Zero, ${bounds.left}, ${bounds.top}, ${bounds.width}, ${bounds.height}, 0x0014)) { throw 'SetWindowPos 失败' }
`)
}
async function saveElementBounds(selector: string, name: string): Promise<void> {
  const bounds = await evaluate(`(() => {
    const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect()
    return r ? { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } : null
  })()`)
  if (!bounds) throw new Error(`未找到 bounds 元素: ${selector}`)
  writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(bounds, null, 2))
  console.log(`[smoke] saved ${name}.json`)
}
async function targets(): Promise<CdpTarget[]> {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json`)
  return await response.json() as CdpTarget[]
}
/** 在指定 target（Harness/控制台 WebContents）内执行表达式，用于验证其独立页面状态。 */
async function evalTarget<T>(target: CdpTarget, expression: string): Promise<T | undefined> {
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise<void>((resolve) => { socket.onopen = () => resolve() })
  const value = await new Promise<T | undefined>((resolve) => {
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage
      if (message.id === 9002) {
        const result = (message.result as { result?: { value?: unknown } } | undefined)?.result?.value
        resolve(result as T | undefined)
      }
    }
    socket.send(JSON.stringify({
      id: 9002,
      method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true },
    }))
  })
  socket.close()
  return value
}
async function shotTarget(target: CdpTarget, name: string): Promise<void> {
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise<void>((resolve) => { socket.onopen = () => resolve() })
  const response = await new Promise<{ data?: string }>((resolve) => {
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage
      if (message.id === 9001) resolve(message.result as { data?: string })
    }
    socket.send(JSON.stringify({ id: 9001, method: 'Page.captureScreenshot', params: { format: 'png' } }))
  })
  if (response.data) {
    writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(response.data, 'base64'))
    console.log(`[smoke] saved ${name}.png`)
  }
  socket.close()
}

try {
  let availableTargets: CdpTarget[] = []
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    try {
      availableTargets = await targets()
      if (availableTargets.some((target) => target.type === 'page' && target.url)) break
    } catch { /* 等待调试端口 */ }
  }
  const page = availableTargets.find((target) => target.type === 'page' && target.url && !target.url.startsWith('devtools'))
  if (!page) throw new Error('未找到渲染进程页面')
  ws = new WebSocket(page.webSocketDebuggerUrl)
  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)?.resolve(message.result ?? message)
      pending.delete(message.id)
    }
  }
  await new Promise<void>((resolve) => {
    if (ws) ws.onopen = () => resolve()
  })
  await sleep(4_000)
  await evaluate('window.innate.setMode(\'dev\')')
  await evaluate('location.reload()')
  await sleep(4_000)

  const initialWindow = await getWindowBounds()
  const resizedBounds = {
    ...initialWindow,
    width: (initialWindow.width ?? 1_200) + 64,
    height: (initialWindow.height ?? 800) + 32,
  }
  await setWindowBounds(resizedBounds)
  await sleep(500)
  const resizedWindow = await getWindowBounds()
  if (resizedWindow.width === initialWindow.width && resizedWindow.height === initialWindow.height) {
    throw new Error('窗口 resize 未生效')
  }
  await setWindowBounds(initialWindow)
  await sleep(500)
  const restoredWindow = await getWindowBounds()
  writeFileSync(path.join(outDir, 'window-bounds.json'), JSON.stringify({
    before: initialWindow, resized: resizedWindow, restored: restoredWindow,
  }, null, 2))
  console.log('[smoke] 窗口尺寸、resize 与恢复证据已保存')

  await shot('overview')
  const windowControls = await evaluate<number>('document.querySelectorAll(\'.window-controls-btn\').length')
  if (windowControls !== 3) throw new Error('Orca 顶栏窗口控制按钮缺失')
  await evaluate('document.querySelector(\'[aria-label="应用菜单"]\')?.click()')
  const menuItems = await evaluate<string[]>('[...document.querySelectorAll(\'.app-menu-popover [role="menuitem"]\')].map(b=>b.textContent)')
  if (!Array.isArray(menuItems) || menuItems.length !== 3) throw new Error('Orca 顶栏应用菜单不可用')
  await shot('app-menu')
  await evaluate('document.dispatchEvent(new KeyboardEvent(\'keydown\', { key: \'Escape\', bubbles: true }))')
  console.log('[smoke] Orca 顶栏菜单与窗口控制通过')
  console.log('[smoke] nav:', await evaluate('[...document.querySelectorAll(\'.nav-item\')].map(b=>b.textContent)'))

  const themeEvidence: Record<string, unknown> = {}
  for (const colorMode of ['light', 'dark'] as const) {
    await evaluate(`localStorage.setItem('color-mode', '${colorMode}'); window.dispatchEvent(new Event('innate-theme-storage'))`)
    await sleep(400)
    const applied = await evaluate<{ colorMode: string; darkClass: boolean; bodyBackground: string; bodyFont: string; card: string }>(`(() => ({
      colorMode: localStorage.getItem('color-mode'),
      darkClass: document.documentElement.classList.contains('dark'),
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      bodyFont: getComputedStyle(document.body).fontFamily,
      card: getComputedStyle(document.documentElement).getPropertyValue('--card').trim()
    }))()`)
    if (!applied || applied.colorMode !== colorMode || applied.darkClass !== (colorMode === 'dark')) {
      throw new Error(`ThemeProvider 未正确应用 ${colorMode}: ${JSON.stringify(applied)}`)
    }
    if (!applied.bodyBackground || applied.bodyBackground === 'rgba(0, 0, 0, 0)' || !applied.card || !applied.bodyFont.includes('Geist')) {
      throw new Error(`产品语义 token 或 Geist 未生效: ${JSON.stringify(applied)}`)
    }
    themeEvidence[colorMode] = applied
    await shot(`theme-${colorMode}`)
  }
  writeFileSync(path.join(outDir, 'theme.json'), JSON.stringify(themeEvidence, null, 2))
  await evaluate("localStorage.setItem('color-mode', 'light'); window.dispatchEvent(new Event('innate-theme-storage'))")
  console.log('[smoke] ThemeProvider .dark、语义 token 与 Geist 明暗证据已保存')

  await evaluate('[...document.querySelectorAll(\'.nav-item\')].find(b=>b.textContent.includes(\'模型配置\'))?.click()')
  const consoleTarget = async (): Promise<CdpTarget | undefined> => (await targets()).find((target) =>
    target.type === 'page' && target.url.startsWith('http://127.0.0.1:'))
  for (let i = 0; i < 6; i++) {
    await sleep(5_000)
    const view = await consoleTarget()
    console.log(`[smoke] t+${(i + 1) * 5}s view target:`, view ? `${view.url} | ${view.title}` : '(none)')
    if (view?.title) break
  }
  const viewTarget = await consoleTarget()
  if (!viewTarget) {
    const fallback = await evaluate("document.querySelector('.console-fallback')?.textContent")
    throw new Error(`未找到受管 magpie 控制台 target；页面状态: ${String(fallback ?? '无错误说明')}`)
  }
  const viewSocket = new WebSocket(viewTarget.webSocketDebuggerUrl)
  await new Promise<void>((resolve) => { viewSocket.onopen = () => resolve() })
  const viewEvalId = ++seq
  const body = await new Promise<unknown>((resolve) => {
    viewSocket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage
      if (message.id === viewEvalId) resolve((message.result as EvaluateResult | undefined)?.result?.value)
    }
    viewSocket.send(JSON.stringify({
      id: viewEvalId,
      method: 'Runtime.evaluate',
      params: { expression: "document.title + ' || ' + (document.body?.innerText ?? '').slice(0, 1000)", returnByValue: true },
    }))
  })
  console.log('[smoke] console view content:', body)
  const bodyText = typeof body === 'string' ? body : ''
  if (/this link's key is not|unauthorized|HTTP 401/i.test(bodyText)) throw new Error('magpie 控制台认证失败')
  if (!/Agents|Providers|Sessions|Library|Settings|Usage|供应商|资源库|设置|用量/i.test(bodyText)) {
    throw new Error('magpie 控制台实际导航未加载')
  }
  const viewShotId = ++seq
  const viewShot = await new Promise<{ data?: string }>((resolve) => {
    viewSocket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage
      if (message.id === viewShotId) resolve(message.result as { data?: string })
    }
    viewSocket.send(JSON.stringify({ id: viewShotId, method: 'Page.captureScreenshot', params: { format: 'png' } }))
  })
  if (!viewShot.data) throw new Error('magpie 控制台截图失败')
  writeFileSync(path.join(outDir, 'console-view.png'), Buffer.from(viewShot.data, 'base64'))
  console.log('[smoke] saved console-view.png')
  viewSocket.close()
  await shot('console')
  await saveElementBounds('.console-area', 'console-bounds')
  const consoleFallback = await evaluate("document.querySelector('.console-fallback')?.textContent")
  if (consoleFallback) throw new Error(`magpie 控制台壳层回退: ${String(consoleFallback)}`)
  console.log('[smoke] 受管 magpie 控制台认证与真实内容通过')
  // W1a 基线：hide/show 后必须复用同一控制台 target（重建会换端口 → URL 必变）
  const consoleUrlBefore = viewTarget.url
  await evaluate('window.innate.consoleHide()')
  await sleep(1_000)
  await evaluate('window.innate.consoleShow({ x: 8, y: 64, width: 900, height: 600 })')
  await sleep(2_000)
  const viewTarget2 = await consoleTarget()
  if (!viewTarget2 || viewTarget2.url !== consoleUrlBefore) {
    throw new Error(`控制台 hide/show 后 target 重建或 URL 变化: ${viewTarget2?.url ?? '(none)'}`)
  }
  await shotTarget(viewTarget2, 'console-view-reshow')
  console.log('[smoke] 控制台 hide/show 复用同一 target（URL 未变）通过')
  const dom = await evaluate<string>("document.querySelector('.app')?.outerHTML")
  writeFileSync(path.join(outDir, 'console.dom.html'), dom ?? '')

  await evaluate("window.innate.setMode('simple')")
  await evaluate('location.reload()')
  await sleep(5_000)
  const simpleNav = await evaluate<string[]>("[...document.querySelectorAll('.nav-item')].map(b=>b.getAttribute('title'))")
  console.log('[smoke] simple nav:', simpleNav)
  const simpleOk = Array.isArray(simpleNav) && simpleNav.length === 2 && simpleNav.includes('对话') && simpleNav.includes('设置')
  if (!simpleOk) throw new Error('simple 模式页面门控不符合预期')
  console.log('[smoke] simple 模式门控通过')
  await shot('simple-home')
  console.log('[smoke] simple hero:', await evaluate("document.querySelector('.simple-hero')?.textContent?.slice(0, 120)"))
  let harnessPort: number | undefined
  let harnessUrlBefore: string | undefined
  if (withHarness) {
    const installed = await evaluate<boolean>('window.innate.getStatus().then(s => s.dsh.installed)')
    if (!installed) throw new Error('桌面端仍未识别 dsh 安装')
    const launched = await evaluate<HarnessLaunchResult>('window.innate.launchHarness()')
    console.log('[smoke] Harness launch:', { ok: launched?.ok, port: launched?.port, detail: launched?.detail })
    if (!launched?.ok) throw new Error(`Harness 启动失败: ${launched?.detail ?? '未知错误'}`)
    await sleep(3_000)
    const embedded = await evaluate<boolean>("Boolean(document.querySelector('.harness-area'))")
    if (!embedded) throw new Error('Harness 未嵌入当前对话标签页')
    const harnessTarget = (await targets()).find((target) => target.url.includes(`:${launched.port}/`))
    if (!harnessTarget) throw new Error('未找到 Harness Surface target')
    // W1a 基线：在 Harness 页面设存活标记，稍后跨 simple 重载与 dev 导航验证「URL 未变不 reload」
    await evalTarget(harnessTarget, 'window.__w1aMarker = Date.now(); "set"')
    harnessPort = launched.port
    harnessUrlBefore = harnessTarget.url
    await shotTarget(harnessTarget, 'harness-view')
    await shot('harness-tab')
    await saveElementBounds('.harness-area', 'harness-bounds')
    console.log('[smoke] Harness 内嵌标签启动通过（保持运行，存活断言见后）')
  }

  await evaluate("window.innate.setMode('dev')")
  await evaluate('location.reload()')
  await sleep(3_000)
  const devNav = await evaluate<string[]>("[...document.querySelectorAll('.nav-item')].map(b=>b.getAttribute('title'))")
  console.log('[smoke] dev nav:', devNav)
  if (!Array.isArray(devNav) || devNav.length !== 6 || !devNav.includes('工作区') || !devNav.includes('对话')) {
    throw new Error('dev 模式页面或工作区插件注册失败')
  }

  await evaluate('[...document.querySelectorAll(\'.nav-item\')].find(b=>b.getAttribute(\'title\')===\'工作区\')?.click()')
  await sleep(2_000)
  const workspaceRoot = await evaluate<string>("document.querySelector('.workspace-root-switch')?.textContent")
  if (!workspaceRoot?.includes(repoName)) throw new Error(`工作区根目录未加载: ${workspaceRoot}`)
  await evaluate("document.querySelector('.file-tree-row[title=\"package.json\"]')?.click()")
  await sleep(800)
  const textPreview = await evaluate<string>("document.querySelector('.text-preview')?.textContent")
  if (!textPreview?.includes(repoName)) throw new Error('文本文件预览失败')
  let syntaxReady = false
  for (let i = 0; i < 10; i++) {
    syntaxReady = await evaluate<boolean>("Boolean(document.querySelector('.code-preview .shiki span[style*=\"--shiki-dark\"]'))") ?? false
    if (syntaxReady) break
    await sleep(300)
  }
  if (!syntaxReady) throw new Error('代码语法高亮未加载')
  await shot('workspace-file')
  await evaluate("localStorage.setItem('color-mode', 'dark'); window.dispatchEvent(new Event('innate-theme-storage'))")
  await sleep(300)
  const darkSyntaxReady = await evaluate<boolean>("document.documentElement.classList.contains('dark') && getComputedStyle(document.querySelector('.code-preview .shiki')).getPropertyValue('--shiki-dark').trim().length > 0")
  if (!darkSyntaxReady) throw new Error('暗色代码语法高亮主题未加载')
  await shot('workspace-file-dark')
  await evaluate("localStorage.setItem('color-mode', 'light'); window.dispatchEvent(new Event('innate-theme-storage'))")
  const surfacePersisted = await evaluate<boolean>(`Object.keys(localStorage).some((key) => {
    if (!key.startsWith('innate.workspace.surfaces:')) return false
    const value = JSON.parse(localStorage.getItem(key) ?? '{}')
    return value.version === 1 && value.activeId === 'file:package.json' &&
      value.surfaces?.some((surface) => surface.id === 'file:package.json' && !surface.url)
  })`)
  if (!surfacePersisted) throw new Error('工作区 Surface 快照未安全持久化')
  await evaluate('location.reload()')
  await sleep(3_000)
  await evaluate('[...document.querySelectorAll(\'.nav-item\')].find(b=>b.getAttribute(\'title\')===\'工作区\')?.click()')
  await sleep(1_000)
  const restoredPreview = await evaluate<string>("document.querySelector('.text-preview')?.textContent")
  if (!restoredPreview?.includes(repoName)) throw new Error('工作区 Surface 重启恢复失败')
  console.log('[smoke] 工作区 Surface 安全快照与重启恢复通过')
  await evaluate("document.querySelector('.file-tree-row[title=\"README.md\"]')?.click()")
  await sleep(800)
  const markdownReady = await evaluate<boolean>("Boolean(document.querySelector('.markdown-preview'))")
  if (!markdownReady) throw new Error('Markdown 预览失败')
  await shot('workspace-markdown')
  await evaluate('[...document.querySelectorAll(\'.workspace-activity button\')].find(b=>b.textContent===\'Git\')?.click()')
  let gitReady = false
  for (let i = 0; i < 20; i++) {
    await sleep(500)
    gitReady = await evaluate<boolean>("Boolean(document.querySelector('.git-panel'))") ?? false
    if (gitReady) break
  }
  if (!gitReady) throw new Error('Git 状态面板未加载')
  await evaluate("document.querySelector('.git-change-row')?.click()")
  let diffReady = false
  for (let i = 0; i < 20; i++) {
    await sleep(300)
    diffReady = await evaluate<boolean>("Boolean(document.querySelector('.diff-preview'))") ?? false
    if (diffReady) break
  }
  if (!diffReady) throw new Error('Git diff 预览失败')
  await shot('workspace-git')
  console.log('[smoke] 文件树、文本/Markdown 预览与只读 Git diff 通过')

  if (harnessPort !== undefined) {
    // W1a 基线：跨 simple 重载与 dev 多页导航后，Harness 仍是同一页面（URL 未变 + 存活标记在 = 未 reload）
    const t2 = (await targets()).find((target) => target.url.includes(`:${harnessPort}/`))
    if (!t2) throw new Error('Harness target 在导航/重载后消失（违反 detach 不销毁）')
    if (t2.url !== harnessUrlBefore) throw new Error(`Harness URL 变化: ${t2.url}`)
    const marker = await evalTarget<number>(t2, 'Number(window.__w1aMarker ?? 0)')
    if (!marker) throw new Error('Harness 页面被 reload（存活标记丢失）')
    await shotTarget(t2, 'harness-view-after-nav')
    await evaluate('[...document.querySelectorAll(\'.nav-item\')].find(b=>b.getAttribute(\'title\')===\'对话\')?.click()')
    await sleep(1_500)
    const embedded = await evaluate<boolean>("Boolean(document.querySelector('.harness-area'))")
    if (!embedded) throw new Error('dev 导航回对话页后 Harness 未重新附着')
    const stopped = await evaluate('window.innate.stopHarness()')
    console.log('[smoke] Harness 跨导航/重载存活（URL 未变、未 reload、重新附着）；显式停止:', JSON.stringify(stopped))
  }
  console.log('[smoke] OK')
} catch (error) {
  console.error('[smoke] FAILED:', error)
  process.exitCode = 1
} finally {
  clearTimeout(watchdog)
  try { ws?.close() } catch { /* ignore */ }
  spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  setTimeout(() => process.exit(process.exitCode ?? 0), 1_000).unref()
}
