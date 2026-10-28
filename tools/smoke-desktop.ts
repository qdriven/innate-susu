#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface CdpTarget {
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
async function targets(): Promise<CdpTarget[]> {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json`)
  return await response.json() as CdpTarget[]
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
  const consoleFallback = await evaluate("document.querySelector('.console-fallback')?.textContent")
  if (consoleFallback) throw new Error(`magpie 控制台壳层回退: ${String(consoleFallback)}`)
  console.log('[smoke] 受管 magpie 控制台认证与真实内容通过')
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
  if (withHarness) {
    const installed = await evaluate<boolean>('window.innate.getStatus().then(s => s.dsh.installed)')
    if (!installed) throw new Error('桌面端仍未识别 dsh 安装')
    const launched = await evaluate<HarnessLaunchResult>('window.innate.launchHarness()')
    console.log('[smoke] Harness launch:', launched)
    if (!launched?.ok) throw new Error(`Harness 启动失败: ${launched?.detail ?? '未知错误'}`)
    await sleep(3_000)
    const embedded = await evaluate<boolean>("Boolean(document.querySelector('.harness-area'))")
    if (!embedded) throw new Error('Harness 未嵌入当前对话标签页')
    const harnessTarget = (await targets()).find((target) => target.url.includes(`:${launched.port}/`))
    if (!harnessTarget) throw new Error('未找到 Harness Surface target')
    await shotTarget(harnessTarget, 'harness-view')
    await shot('harness-tab')
    await evaluate('window.innate.stopHarness()')
    console.log('[smoke] Harness 内嵌标签启动通过')
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
  await cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'dark' }],
  })
  await sleep(300)
  const darkSyntaxReady = await evaluate<boolean>("getComputedStyle(document.querySelector('.code-preview .shiki')).getPropertyValue('--shiki-dark').trim().length > 0")
  if (!darkSyntaxReady) throw new Error('暗色代码语法高亮主题未加载')
  await shot('workspace-file-dark')
  await cdp('Emulation.setEmulatedMedia', { features: [] })
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

  if (withHarness) {
    const launched = await evaluate<HarnessLaunchResult>('window.innate.launchHarness()')
    console.log('[smoke] dev Harness launch:', launched)
    if (!launched?.ok) throw new Error(`dev Harness 启动失败: ${launched?.detail ?? '未知错误'}`)
    await evaluate('[...document.querySelectorAll(\'.nav-item\')].find(b=>b.getAttribute(\'title\')===\'对话\')?.click()')
    await sleep(3_000)
    const embedded = await evaluate<boolean>("Boolean(document.querySelector('.harness-area'))")
    if (!embedded) throw new Error('dev Harness 未嵌入对话标签页')
    await evaluate('window.innate.stopHarness()')
    console.log('[smoke] simple/dev 双模式 Harness 启动均通过')
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
