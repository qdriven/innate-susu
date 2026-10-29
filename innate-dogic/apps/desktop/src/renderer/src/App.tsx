import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { AppMode, CheckResult, HarnessState, ModelInfo, SmokeResult, StatusSnapshot } from '@dogic/core'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import { api } from './api'
import ConsolePage from './ConsolePage'
import HarnessPage from './HarnessPage'
import ModeGate from './ModeGate'
import { WorkspacePanel } from './plugin-registry'
import Titlebar from './Titlebar'
import { defaultPageId, pagesForMode, resolveActivePage } from './pages'
import ContentArea from './shell/ContentArea'
import RightPanelHost from './shell/RightPanelHost'
import ShellSidebar from './shell/ShellSidebar'
import { SurfaceTabs } from './surfaces/surface-tabs'
import { createDesktopSurfaceProviders } from './surfaces/providers/desktop'
import type { SurfaceProviderRegistry } from './surfaces/provider-registry'
import {
  HARNESS_PROVIDER_ID,
  HARNESS_SURFACE_ID,
  MAGPIE_CONSOLE_PROVIDER_ID,
  MAGPIE_CONSOLE_SURFACE_ID,
  harnessSurface,
  magpieConsoleSurface,
  surfacePageId,
} from './surfaces/catalog'

/** 中栏 Surface 标签快照的持久化键；快照只含安全字段。 */
const SURFACE_TABS_KEY = 'innate.surface-tabs:center'

export default function App({ rightPanel = true }: { rightPanel?: boolean }): JSX.Element {
  const [tab, setTab] = useState('overview')
  const [mode, setMode] = useState<AppMode | null>(null)
  const [modeLoaded, setModeLoaded] = useState(false)
  const [status, setStatus] = useState<StatusSnapshot | null>(null)
  const [harness, setHarness] = useState<HarnessState>({ phase: 'idle', message: 'Harness 未运行' })
  const [harnessLoaded, setHarnessLoaded] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchMsg, setLaunchMsg] = useState('')

  // 标签模型与 provider 注册表在整个壳生命周期内唯一；StrictMode 重挂载不影响语义。
  const tabsRef = useRef<SurfaceTabs | null>(null)
  if (!tabsRef.current) tabsRef.current = new SurfaceTabs({ key: SURFACE_TABS_KEY })
  const tabs = tabsRef.current
  const providersRef = useRef<SurfaceProviderRegistry | null>(null)
  if (!providersRef.current) providersRef.current = createDesktopSurfaceProviders()
  const providers = providersRef.current

  useEffect(() => {
    void api.getMode().then((m) => {
      setMode(m)
      setModeLoaded(true)
    })
  }, [])

  const chooseMode = useCallback(async (m: AppMode) => {
    await api.setMode(m)
    setMode(m)
    setTab(defaultPageId(m))
  }, [])

  const refresh = useCallback(async () => {
    setStatus(await api.getStatus())
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 5000)
    return () => clearInterval(t)
  }, [refresh])

  useEffect(() => {
    const unsubscribe = api.onHarnessState((state) => {
      setHarness(state)
      setHarnessLoaded(true)
    })
    void api.getHarnessState().then((state) => {
      setHarness(state)
      setHarnessLoaded(true)
    })
    return unsubscribe
  }, [])

  const launch = async (): Promise<void> => {
    setLaunching(true)
    setLaunchMsg('启动中…')
    const r = await api.launchHarness()
    setLaunchMsg(r.detail)
    setLaunching(false)
    setHarness(await api.getHarnessState())
    if (r.ok) setTab('chat')
  }

  const gwOk = status?.gateway.running === true
  const wired = (status?.dsh.wiredFiles.length ?? 0) > 0
  const canLaunch = gwOk && status?.dsh.installed === true
  const harnessRunning = harness.phase === 'running'
  const resolvedTab = mode ? resolveActivePage(mode, tab)?.id : undefined

  // Harness 生命周期：运行中保留标签（可与控制台并存于同一中栏槽），
  // 停止/失败时摘掉标签；状态未加载前不动，避免重启后误删已恢复的标签。
  useLayoutEffect(() => {
    if (!harnessLoaded) return
    if (harnessRunning) {
      tabs.open(harnessSurface())
      return
    }
    if (tabs.has(HARNESS_SURFACE_ID)) tabs.close(HARNESS_SURFACE_ID)
  }, [harnessLoaded, harnessRunning, tabs])

  // 页面 ↔ Surface：对话/设置(控制台)落在统一中栏槽，其它页面只 detach。
  useLayoutEffect(() => {
    if (resolvedTab === 'chat') {
      if (harnessRunning) {
        tabs.open(harnessSurface())
        tabs.activate(HARNESS_SURFACE_ID)
      } else {
        tabs.deactivate()
      }
      return
    }
    if (resolvedTab === 'console' || resolvedTab === 'settings') {
      if (providers.isDisabled(MAGPIE_CONSOLE_PROVIDER_ID)) {
        tabs.deactivate()
        return
      }
      tabs.open(magpieConsoleSurface())
      tabs.activate(MAGPIE_CONSOLE_SURFACE_ID)
      return
    }
    tabs.deactivate()
  }, [resolvedTab, harnessRunning, tabs, providers])

  const switchSurface = useCallback((surface: SurfaceDescriptor) => {
    const page = surfacePageId(surface.providerId, mode ?? 'dev')
    if (page) setTab(page)
    tabs.activate(surface.id)
  }, [mode, tabs])

  const closeSurface = useCallback((surface: SurfaceDescriptor) => {
    const provider = providers.get(surface.providerId)
    void Promise.resolve(provider?.close?.(surface)).catch(() => undefined)
    tabs.close(surface.id)
    if (surface.providerId === HARNESS_PROVIDER_ID) {
      void api.stopHarness()
      setTab('chat')
      return
    }
    if (surface.providerId === MAGPIE_CONSOLE_PROVIDER_ID &&
        (resolvedTab === 'console' || resolvedTab === 'settings')) {
      setTab(harnessRunning ? 'chat' : defaultPageId(mode ?? 'dev'))
    }
  }, [providers, tabs, resolvedTab, harnessRunning, mode])

  const reconnectConsole = useCallback(() => {
    tabs.open(magpieConsoleSurface())
    tabs.activate(MAGPIE_CONSOLE_SURFACE_ID)
  }, [tabs])

  if (!modeLoaded) return <div className="app" />
  if (mode === null) return <ModeGate onChoose={(m) => void chooseMode(m)} />

  const pages = pagesForMode(mode)
  const activeTab = resolvedTab

  return (
    <div className="app">
      <Titlebar
        mode={mode}
        pageLabel={pages.find((page) => page.id === activeTab)?.label ?? ''}
        status={status}
        onSwitchMode={() => void chooseMode(mode === 'simple' ? 'dev' : 'simple')}
      />

      <div className="shell">
        <ShellSidebar
          pages={pages}
          activeId={activeTab}
          harnessPhase={harness.phase}
          onNavigate={setTab}
          onSwitchMode={() => void chooseMode(mode === 'simple' ? 'dev' : 'simple')}
        />

        <ContentArea>
          {activeTab === 'chat' && (
            <HarnessPage
              status={status}
              harness={harness}
              launching={launching}
              launchMsg={launchMsg}
              onLaunch={() => void launch()}
              onStop={() => void api.stopHarness()}
              onOpenSettings={() => setTab(mode === 'simple' ? 'settings' : 'console')}
              tabs={tabs}
              providers={providers}
              onSwitchSurface={switchSurface}
              onCloseSurface={closeSurface}
            />
          )}
          {activeTab === 'workspace' && <WorkspacePanel />}
          {activeTab === 'settings' && (
            <ConsolePage
              tabs={tabs}
              providers={providers}
              onSwitchSurface={switchSurface}
              onCloseSurface={closeSurface}
              onReconnect={reconnectConsole}
            />
          )}
          {activeTab === 'overview' && (
        <main className="main">
          <section className="hero">
            <div className="hero-text">
              <h1>dsh × magpie 工作台</h1>
              <p>
                模型配置在 magpie 中统一进行；本宿主拉起 dsh Harness（Web UI），
                其模型流量自动经 magpie 网关路由。
              </p>
            </div>
            <div className="hero-actions">
              <button
                className="primary"
                disabled={!canLaunch || launching}
                onClick={() => void launch()}
                title={canLaunch ? '' : '需要：magpie 网关运行 + dsh 已安装'}
              >
                {launching ? '启动中…' : harness.phase === 'running' ? '打开 Harness' : '启动 dsh Harness'}
              </button>
              {harness.phase === 'running' && (
                <button onClick={() => void api.stopHarness()}>停止 Harness</button>
              )}
            </div>
          </section>
          {launchMsg && <p className="launch-msg">{launchMsg}</p>}
          {harness.phase !== 'idle' && (
            <p className={`harness-state ${harness.phase}`}>
              Harness：{harness.message}
            </p>
          )}

          <div className="cards">
            <Card
              title="magpie 网关"
              ok={gwOk}
              lines={
                gwOk
                  ? [
                      `地址 ${status?.gateway.baseUrl}`,
                      `版本 ${status?.gateway.version}`,
                      `模型 ${status?.gateway.modelsCount ?? '?'} 个`,
                      `web 界面 ${status?.webUi.running ? '运行中' : '未运行'}`,
                    ]
                  : [status?.gateway.error ?? '未知']
              }
              actions={
                <>
                  {!gwOk && (
                    <SmallBtn
                      onClick={() => {
                        void api.startMagpie().then((r) => setLaunchMsg(r.detail))
                      }}
                      label="启动 magpie"
                    />
                  )}
                  <SmallBtn onClick={() => void api.openMagpieWeb()} label="打开配置界面" />
                </>
              }
            />
            <Card
              title="dsh 集成"
              ok={wired}
              lines={[
                `安装 ${status?.dsh.installed ? '已安装' : '未安装 (npm i -g @deepseek-ai/dsh)'}`,
                `接线 ${wired ? '已接线 magpie' : '未接线'}`,
                `凭据 ${status?.dsh.hasGatewayKey ? 'MAGPIE_GATEWAY_KEY 已写入' : '未写入'}`,
                `默认模型 ${status?.dsh.defaultModel ?? '未设置'}`,
              ]}
              actions={<SmallBtn onClick={() => void api.revealDshHome()} label="打开 ~/.dsh" />}
            />
            <Wizard />
          </div>
        </main>
      )}

      {activeTab === 'models' && <ModelsTab />}
          {activeTab === 'console' && (
            <ConsolePage
              tabs={tabs}
              providers={providers}
              onSwitchSurface={switchSurface}
              onCloseSurface={closeSurface}
              onReconnect={reconnectConsole}
            />
          )}
          {activeTab === 'tools' && <ToolsTab />}
        </ContentArea>

        {mode === 'dev' && rightPanel && <RightPanelHost />}
      </div>
    </div>
  )
}

function Card(props: { title: string; ok: boolean; lines: string[]; actions?: JSX.Element }): JSX.Element {
  return (
    <div className={`card ${props.ok ? 'ok' : ''}`}>
      <h3>
        <span className={`dot ${props.ok ? 'ok' : 'bad'}`} /> {props.title}
      </h3>
      <ul>
        {props.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {props.actions && <div className="card-actions">{props.actions}</div>}
    </div>
  )
}

function SmallBtn(props: { onClick: () => void; label: string }): JSX.Element {
  return (
    <button className="small" onClick={props.onClick}>
      {props.label}
    </button>
  )
}

function Wizard(): JSX.Element {
  const [checks, setChecks] = useState<CheckResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (): Promise<void> => {
    setBusy(true)
    setChecks(await api.runChecks())
    setBusy(false)
  }
  useEffect(() => {
    void run()
  }, [])
  return (
    <div className="card wizard">
      <h3>
        集成检查
        <SmallBtn onClick={() => void run()} label={busy ? '检查中…' : '重新检查'} />
      </h3>
      {checks === null ? (
        <p className="dim">检查中…</p>
      ) : (
        <ul>
          {checks.map((c) => (
            <li key={c.id} className={c.passed ? 'pass' : 'fail'}>
              <span>{c.passed ? '✓' : '✗'} {c.title}</span>
              <span className="dim">{c.detail}</span>
              {c.hint && <span className="hint">→ {c.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ModelsTab(): JSX.Element {
  const [data, setData] = useState<{ models: ModelInfo[]; detail: string } | null>(null)
  const refresh = useCallback(async () => {
    const r = await api.getModels()
    setData({ models: r.models, detail: r.detail })
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])
  return (
    <main className="main">
      <div className="table-head">
        <h2>模型目录（来自 magpie /v1/models）</h2>
        <SmallBtn onClick={() => void refresh()} label="刷新" />
      </div>
      {data === null ? (
        <p className="dim">加载中…</p>
      ) : data.models.length === 0 ? (
        <p className="dim">{data.detail}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>模型</th>
              <th>归属</th>
              <th>上下文</th>
              <th>推理档位</th>
              <th>原生端点</th>
            </tr>
          </thead>
          <tbody>
            {data.models.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.displayName ?? m.id}
                  <div className="dim mono">{m.id}</div>
                </td>
                <td>{m.ownedBy ?? '-'}</td>
                <td>{m.contextWindow ? `${Math.round(m.contextWindow / 1000)}K` : '-'}</td>
                <td>{m.reasoning ? (m.reasoningLevels ?? []).join('/') || '是' : '否'}</td>
                <td className="mono">{(m.nativeEndpoints ?? []).join(', ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

function ToolsTab(): JSX.Element {
  const [smoke, setSmoke] = useState<SmokeResult | null>(null)
  const [smokeBusy, setSmokeBusy] = useState(false)
  const [disc, setDisc] = useState('')
  return (
    <main className="main">
      <h2>工具</h2>
      <div className="tool-row">
        <div>
          <h3>冒烟测试</h3>
          <p className="dim">
            经网关发起一次 16 token 最小补全（key=magpie-dsh-innateos，用量可在 magpie Usage 页查看）。
          </p>
        </div>
        <button
          className="primary"
          disabled={smokeBusy}
          onClick={async () => {
            setSmokeBusy(true)
            setSmoke(await api.smokeTest())
            setSmokeBusy(false)
          }}
        >
          {smokeBusy ? '测试中…' : '运行'}
        </button>
      </div>
      {smoke && (
        <p className={smoke.ok ? 'launch-msg ok' : 'launch-msg bad'}>
          {smoke.ok ? '✓' : '✗'} [{smoke.model ?? '-'}] {smoke.detail}
        </p>
      )}
      <div className="tool-row">
        <div>
          <h3>断开 dsh 接线</h3>
          <p className="dim">执行 magpie dsh default，原子恢复 dsh 原始模型配置。</p>
        </div>
        <button
          onClick={async () => {
            const r = await api.disconnectDsh()
            setDisc(`${r.ok ? '✓' : '✗'} ${r.detail}`)
          }}
        >
          断开
        </button>
      </div>
      {disc && <p className="launch-msg">{disc}</p>}
      <div className="tool-row">
        <div>
          <h3>日志与配置</h3>
          <p className="dim">Harness 日志目录 / ~/.dsh 配置目录。</p>
        </div>
        <div className="row-btns">
          <button onClick={() => void api.openLogs()}>打开日志</button>
          <button onClick={() => void api.revealDshHome()}>打开 ~/.dsh</button>
        </div>
      </div>
    </main>
  )
}
