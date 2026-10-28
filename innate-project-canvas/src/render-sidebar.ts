import type { AuditReport, DerivedState, ModuleLayer, ModuleNode, ProjectSnapshot, Task } from './types.js'
import { deriveState, taskStateLabel } from './derive.js'
import { compareText, escapeHtml } from './utils.js'
import { LAYOUT_SWITCH, TASK_EDITOR, TOP_TABS, WORKBENCH_SCRIPT, WORKBENCH_STYLES } from './workbench.js'

const LAYER_ORDER: ModuleLayer[] = ['app', 'plugin', 'package', 'service', 'site', 'tool', 'external']
const LAYER_NAMES: Record<ModuleLayer, string> = {
  app: '应用', plugin: '插件', package: '共享包', service: '服务', site: '网站', tool: '工具', external: '外部',
}
const VIEW_TITLES: Record<string, string> = { overview: '项目总览', tasks: 'Sprint 任务', modules: '模块交互', audit: '审计与漂移' }

type TaskFilter = 'action' | 'blocked' | 'done' | 'optional'

interface Position { x: number; y: number; width: number; height: number }

function taskFilter(task: Task, derived: DerivedState): TaskFilter {
  if (task.status === 'done') return 'done'
  if (task.status === 'optional' || task.status === 'debt') return 'optional'
  return derived.taskBlocked.get(task.id) ? 'blocked' : 'action'
}

function renderBadge(task: Task, derived: DerivedState): string {
  const filter = taskFilter(task, derived)
  const next = derived.nextTaskId === task.id
  return `<span class="badge ${next ? 'next' : filter}">${escapeHtml(taskStateLabel(task, derived))}</span>`
}

function renderTaskCard(task: Task, derived: DerivedState): string {
  const filter = taskFilter(task, derived)
  const evidence = task.evidence.length > 0
    ? task.evidence.map((item) => `<li><code>${escapeHtml(item.path)}</code><span class="evidence-${item.status}">${item.status}</span></li>`).join('')
    : '<li class="muted">未登记证据路径</li>'
  const evidenceMarkdown = task.evidence.length > 0
    ? task.evidence.map((item) => `- ${item.path}（${item.status}）`).join('\n')
    : '- 未登记证据路径'
  const originalBody = [
    '## 任务说明', task.summary,
    '## 验收标准', task.verification,
    '## 执行信息', `- 状态：${taskStateLabel(task, derived)}\n- 前置：${task.blockedBy.join(' · ') || '无'}\n- 预估：${task.estimate || '未标注'}`,
    '## 证据', evidenceMarkdown,
    '## 来源', `${task.source.path}:${task.source.line ?? 1}`,
  ].join('\n\n')
  const search = `${task.id} ${task.title} ${task.summary} ${task.verification}`.toLowerCase()
  return `<details class="task-card ${derived.nextTaskId === task.id ? 'next' : ''}" data-task data-filter="${filter}" data-sprint="${escapeHtml(task.sprintId)}" data-search="${escapeHtml(search)}" data-original-title="${escapeHtml(task.title)}" data-original-body="${escapeHtml(originalBody)}" data-summary="${escapeHtml(task.summary)}" id="task-${escapeHtml(task.id)}">
    <summary>
      <span class="task-card-top"><code>${escapeHtml(task.id)}</code><span class="badge edited" data-draft-badge hidden>本地草稿</span>${renderBadge(task, derived)}</span>
      <span class="task-title">${escapeHtml(task.title)}</span>
      <span class="task-summary">${escapeHtml(task.summary)}</span>
      <span class="task-expand">查看验收与证据 <span aria-hidden="true">＋</span></span>
    </summary>
    <div class="task-detail">
      <div class="task-actions"><button class="task-action" type="button" data-edit-task="${escapeHtml(task.id)}">编辑</button><button class="task-action" type="button" data-copy-task="${escapeHtml(task.id)}">复制 Markdown</button></div>
      <article class="draft-content" data-draft-content hidden></article>
      <div data-original-content>
        <dl><dt>前置</dt><dd>${escapeHtml(task.blockedBy.join(' · ') || '无')}</dd><dt>预估</dt><dd>${escapeHtml(task.estimate || '未标注')}</dd></dl>
        <div class="verification"><strong>如何验证</strong><p>${escapeHtml(task.verification)}</p></div>
        <h4>证据</h4><ul class="evidence">${evidence}</ul>
        <p class="source">来源 <code>${escapeHtml(task.source.path)}:${task.source.line ?? 1}</code></p>
      </div>
    </div>
  </details>`
}

function renderSprintTasks(snapshot: ProjectSnapshot, derived: DerivedState): string {
  return snapshot.sprints.map((sprint) => {
    const tasks = snapshot.tasks.filter((task) => task.sprintId === sprint.id)
    const done = tasks.filter((task) => task.status === 'done').length
    return `<section class="sprint-block" data-sprint-block="${escapeHtml(sprint.id)}">
      <header class="sprint-heading"><div><span class="sprint-id">${escapeHtml(sprint.id)}</span><h3>${escapeHtml(sprint.title)}</h3></div><div class="sprint-meta"><span>${done}/${tasks.length} 完成</span><span>${escapeHtml(sprint.estimate)}</span><span>${escapeHtml(sprint.declaredStatus)}</span></div></header>
      <div class="task-grid">${tasks.map((task) => renderTaskCard(task, derived)).join('')}</div>
    </section>`
  }).join('')
}

function layoutModules(modules: ModuleNode[]): { positions: Map<string, Position>; width: number; height: number } {
  const layers = LAYER_ORDER.filter((layer) => modules.some((module) => module.layer === layer))
  const positions = new Map<string, Position>()
  let maxRows = 0
  layers.forEach((layer, column) => {
    const nodes = modules.filter((module) => module.layer === layer).sort((a, b) => compareText(a.name, b.name))
    maxRows = Math.max(maxRows, nodes.length)
    nodes.forEach((node, row) => positions.set(node.id, { x: 40 + column * 230, y: 72 + row * 104, width: 190, height: 70 }))
  })
  return { positions, width: Math.max(900, layers.length * 230 + 40), height: Math.max(360, maxRows * 104 + 110) }
}

function renderModuleDetails(snapshot: ProjectSnapshot): string {
  return snapshot.modules.map((module, index) => {
    const edges = snapshot.moduleEdges.filter((edge) => edge.source === module.id || edge.target === module.id)
    const interactions = edges.length > 0 ? edges.map((edge) => {
      const outgoing = edge.source === module.id
      const other = snapshot.modules.find((item) => item.id === (outgoing ? edge.target : edge.source))
      if (!other) return ''
      return `<button class="interaction" type="button" data-select-module="${escapeHtml(other.id)}"><span>${outgoing ? '出站' : '入站'} · ${escapeHtml(edge.label)}</span><strong>${escapeHtml(other.name)}</strong></button>`
    }).join('') : '<p class="muted">没有已声明的直接依赖。</p>'
    return `<article class="module-detail" data-module-detail="${escapeHtml(module.id)}" ${index === 0 ? '' : 'hidden'}>
      <div class="detail-badges"><span class="badge ${module.presence === 'target' ? 'target' : 'current'}">${module.presence === 'target' ? '目标节点' : '当前节点'}</span><span class="badge neutral">${LAYER_NAMES[module.layer]}</span></div>
      <h3>${escapeHtml(module.name)}</h3><code class="package-name">${escapeHtml(module.packageName)}</code>
      <dl class="module-facts"><dt>目录</dt><dd><code>${escapeHtml(module.path || '尚未创建')}</code></dd><dt>来源</dt><dd><code>${escapeHtml(module.source.path)}</code></dd></dl>
      <div class="interaction-list"><h4>直接交互 · ${edges.length}</h4>${interactions}</div>
    </article>`
  }).join('')
}

function renderModuleMap(snapshot: ProjectSnapshot): string {
  const { positions, width, height } = layoutModules(snapshot.modules)
  const layers = LAYER_ORDER.filter((layer) => snapshot.modules.some((module) => module.layer === layer))
  const labels = layers.map((layer, index) => `<text class="layer-label" x="${40 + index * 230}" y="34">${LAYER_NAMES[layer]}</text>`).join('')
  const edges = snapshot.moduleEdges.flatMap((edge) => {
    const source = positions.get(edge.source)
    const target = positions.get(edge.target)
    if (!source || !target) return []
    const x1 = source.x + source.width / 2
    const y1 = source.y + source.height
    const x2 = target.x + target.width / 2
    const y2 = target.y
    const middle = (y1 + y2) / 2
    const path = source.y === target.y
      ? `M ${source.x + source.width} ${source.y + source.height / 2} C ${x1 + 55} ${y1 - 25}, ${x2 - 55} ${y2 - 25}, ${target.x} ${target.y + target.height / 2}`
      : `M ${x1} ${y1} C ${x1} ${middle}, ${x2} ${middle}, ${x2} ${y2}`
    return [`<path class="edge ${edge.view}" data-module-edge data-view="${edge.view}" data-source="${escapeHtml(edge.source)}" data-target="${escapeHtml(edge.target)}" d="${path}" marker-end="url(#sidebar-arrow-${edge.view})"><title>${escapeHtml(edge.source)} → ${escapeHtml(edge.target)} · ${escapeHtml(edge.label)}</title></path>`]
  }).join('')
  const nodes = snapshot.modules.flatMap((module) => {
    const position = positions.get(module.id)
    if (!position) return []
    return [`<g class="module-node ${module.presence}" data-module-node data-module-id="${escapeHtml(module.id)}" data-presence="${module.presence}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(module.name)} 模块详情">
      <rect x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" rx="8" />
      <text class="module-name" x="${position.x + 12}" y="${position.y + 24}">${escapeHtml(module.name)}</text>
      <text class="module-package" x="${position.x + 12}" y="${position.y + 43}">${escapeHtml(module.packageName)}</text>
      <text class="module-state" x="${position.x + 12}" y="${position.y + 60}">${module.presence === 'target' ? '目标 · 未实现' : '当前'}</text>
    </g>`]
  }).join('')
  return `<div class="module-layout"><div class="map-scroll"><svg class="module-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="可交互的当前与目标模块图">
    <defs><marker id="sidebar-arrow-current" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" class="arrow-current" /></marker><marker id="sidebar-arrow-target" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" class="arrow-target" /></marker><marker id="sidebar-arrow-both" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" class="arrow-both" /></marker></defs>
    ${labels}<g>${edges}</g><g>${nodes}</g></svg></div><aside class="module-inspector">${renderModuleDetails(snapshot)}</aside></div>`
}

function renderOverview(snapshot: ProjectSnapshot, report: AuditReport, derived: DerivedState): string {
  const next = snapshot.tasks.find((task) => task.id === derived.nextTaskId)
  const ready = derived.readyTaskIds.slice(0, 6).map((id) => snapshot.tasks.find((task) => task.id === id)).filter((task): task is Task => Boolean(task))
  const sprintCards = snapshot.sprints.map((sprint) => {
    const tasks = snapshot.tasks.filter((task) => task.sprintId === sprint.id)
    const done = tasks.filter((task) => task.status === 'done').length
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0
    return `<button class="sprint-card" type="button" data-sprint-target="${escapeHtml(sprint.id)}"><span class="sprint-card-top"><code>${escapeHtml(sprint.id)}</code><span>${done}/${tasks.length}</span></span><strong>${escapeHtml(sprint.title)}</strong><span class="progress"><span style="width:${percent}%"></span></span><span class="muted">${escapeHtml(sprint.declaredStatus)} · ${escapeHtml(sprint.estimate)}</span></button>`
  }).join('')
  return `<div class="overview-hero"><div><span class="eyebrow">Evidence-gated project workspace</span><h1>${escapeHtml(snapshot.project)}</h1><p>把计划、执行状态和模块关系放进同一个工作界面。所有数字都来自当前快照，目标架构不会被误认为已实现。</p></div><span class="snapshot-pill">快照 ${escapeHtml(report.snapshotHash.slice(0, 12))}</span></div>
    <section class="metrics" aria-label="项目摘要"><div><strong>${snapshot.sprints.length}</strong><span>Sprint</span></div><div><strong>${snapshot.tasks.length}</strong><span>任务卡</span></div><div><strong>${derived.readyTaskIds.length}</strong><span>当前可执行</span></div><div><strong>${snapshot.modules.length}</strong><span>当前 + 目标模块</span></div><div class="${report.summary.errors ? 'has-error' : ''}"><strong>${report.summary.errors}</strong><span>审计错误</span></div></section>
    <div class="overview-grid"><section class="panel next-panel"><div class="section-heading"><div><span class="eyebrow">Execution frontier</span><h2>当前推进面</h2></div><button class="text-button" data-view-target="tasks">全部任务 →</button></div>${next ? `<div class="next-task"><span class="badge next">下一项</span><code>${escapeHtml(next.id)}</code><h3>${escapeHtml(next.title)}</h3><p>${escapeHtml(next.summary)}</p></div>` : '<p class="empty">当前没有下一执行任务。</p>'}<div class="ready-list">${ready.map((task) => `<button data-open-task="${escapeHtml(task.id)}"><code>${escapeHtml(task.id)}</code><span>${escapeHtml(task.title)}</span><span>→</span></button>`).join('')}</div></section>
    <section class="panel audit-summary"><div class="section-heading"><div><span class="eyebrow">Audit</span><h2>发布门禁</h2></div><button class="text-button" data-view-target="audit">查看审计 →</button></div>${report.summary.errors ? `<div class="audit-callout error"><strong>${report.summary.errors} 项错误需要处理</strong><p>预览可以生成，但不能作为审计通过的正式发布。</p></div>` : '<div class="audit-callout clean"><strong>结构、依赖和证据检查通过</strong><p>当前快照满足发布门禁。</p></div>'}<dl class="audit-numbers"><div><dt>警告</dt><dd>${report.summary.warnings}</dd></div><div><dt>语义漂移</dt><dd>${report.summary.driftChanges}</dd></div></dl></section></div>
    <section class="section-block"><div class="section-heading"><div><span class="eyebrow">Sprints</span><h2>按执行阶段查看</h2></div></div><div class="sprint-cards">${sprintCards}</div></section>`
}

function renderAuditView(report: AuditReport): string {
  const issues = report.issues.length ? report.issues.map((item) => `<article class="audit-item ${item.severity}"><div><span class="badge ${item.severity}">${item.severity}</span><code>${escapeHtml(item.code)}</code></div><p>${escapeHtml(item.message)}</p>${item.subject ? `<span class="muted">${escapeHtml(item.subject)}</span>` : ''}</article>`).join('') : '<div class="audit-callout clean"><strong>没有审计问题</strong><p>结构、依赖、证据和来源检查通过。</p></div>'
  const drift = report.drift.length ? `<div class="drift-list">${report.drift.map((item) => `<article><span class="badge neutral">${escapeHtml(item.kind)}</span><code>${escapeHtml(item.subject)}</code><strong>${escapeHtml(item.change)}</strong><p>${escapeHtml(item.before ?? '∅')} → ${escapeHtml(item.after ?? '∅')}</p></article>`).join('')}</div>` : '<p class="empty">没有语义漂移。生成时间变化不计入漂移。</p>'
  return `<section class="panel"><div class="section-heading"><div><span class="eyebrow">Audit findings</span><h2>审计结果</h2></div><span class="badge ${report.summary.errors ? 'error' : 'current'}">${report.summary.errors} 错误 · ${report.summary.warnings} 警告</span></div><div class="audit-list">${issues}</div></section><section class="panel section-block"><div class="section-heading"><div><span class="eyebrow">Semantic diff</span><h2>快照漂移</h2></div><span class="muted">${report.drift.length} 项变化</span></div>${drift}</section>`
}

const SCRIPT = String.raw`<script>
(() => {
  const body = document.body
  const views = [...document.querySelectorAll('[data-view]')]
  const navButtons = [...document.querySelectorAll('[data-view-target]')]
  const title = document.getElementById('view-title')
  const showView = (name, updateHash = true) => {
    if (!document.getElementById('view-' + name)) name = 'overview'
    views.forEach((view) => { view.hidden = view.id !== 'view-' + name })
    navButtons.forEach((button) => {
      if (button.dataset.viewTarget === name) button.setAttribute('aria-current', 'page')
      else button.removeAttribute('aria-current')
    })
    body.dataset.activeView = name
    title.textContent = ({overview:'项目总览',tasks:'Sprint 任务',modules:'模块交互',audit:'审计与漂移'})[name]
    if (updateHash) history.replaceState(null, '', '#' + name)
    body.classList.remove('sidebar-open')
    window.scrollTo({top: 0, behavior: 'instant'})
  }
  navButtons.forEach((button) => button.addEventListener('click', () => showView(button.dataset.viewTarget)))
  const toggleSidebar = () => {
    if (matchMedia('(max-width: 800px)').matches) body.classList.toggle('sidebar-open')
    else {
      body.classList.toggle('sidebar-collapsed')
      try { localStorage.setItem('ipc-sidebar', body.classList.contains('sidebar-collapsed') ? 'collapsed' : 'expanded') } catch {}
    }
  }
  document.getElementById('sidebar-trigger').addEventListener('click', toggleSidebar)
  document.getElementById('sidebar-overlay').addEventListener('click', () => body.classList.remove('sidebar-open'))
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'b' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); toggleSidebar() }
    if (event.key === 'Escape') body.classList.remove('sidebar-open')
    if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); showView('tasks'); document.getElementById('task-search').focus() }
  })
  try { if (localStorage.getItem('ipc-sidebar') === 'collapsed') body.classList.add('sidebar-collapsed') } catch {}
  const taskCards = [...document.querySelectorAll('[data-task]')]
  const filterButtons = [...document.querySelectorAll('[data-task-filter]')]
  const sprintSelect = document.getElementById('sprint-filter')
  const search = document.getElementById('task-search')
  let activeFilter = 'all'
  const filterTasks = () => {
    const query = search.value.trim().toLowerCase()
    let visible = 0
    taskCards.forEach((card) => {
      const show = (activeFilter === 'all' || card.dataset.filter === activeFilter) && (sprintSelect.value === 'all' || card.dataset.sprint === sprintSelect.value) && card.dataset.search.includes(query)
      card.hidden = !show
      if (show) visible++
    })
    document.querySelectorAll('[data-sprint-block]').forEach((block) => { block.hidden = ![...block.querySelectorAll('[data-task]')].some((card) => !card.hidden) })
    document.getElementById('task-count').textContent = '显示 ' + visible + ' / ' + taskCards.length + ' 张任务卡'
    document.getElementById('task-empty').hidden = visible !== 0
  }
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.taskFilter
    filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
    filterTasks()
  }))
  sprintSelect.addEventListener('change', filterTasks)
  search.addEventListener('input', filterTasks)
  const selectSprint = (id) => { sprintSelect.value = id; showView('tasks'); filterTasks() }
  document.querySelectorAll('[data-sprint-target]').forEach((button) => button.addEventListener('click', () => selectSprint(button.dataset.sprintTarget)))
  document.querySelectorAll('[data-open-task]').forEach((button) => button.addEventListener('click', () => {
    activeFilter = 'all'; sprintSelect.value = 'all'; search.value = ''
    filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.taskFilter === 'all')))
    showView('tasks'); filterTasks()
    const card = document.getElementById('task-' + button.dataset.openTask)
    card.open = true; card.scrollIntoView({block:'center'})
  }))
  let moduleMode = 'all'
  let selectedModule = document.querySelector('[data-module-node]')?.dataset.moduleId
  const moduleNodes = [...document.querySelectorAll('[data-module-node]')]
  const moduleEdges = [...document.querySelectorAll('[data-module-edge]')]
  const selectModule = (id) => {
    selectedModule = id
    const connected = new Set([id])
    moduleEdges.forEach((edge) => {
      if (edge.dataset.source === id) connected.add(edge.dataset.target)
      if (edge.dataset.target === id) connected.add(edge.dataset.source)
      edge.classList.toggle('active', edge.dataset.source === id || edge.dataset.target === id)
    })
    moduleNodes.forEach((node) => {
      node.classList.toggle('is-selected', node.dataset.moduleId === id)
      node.classList.toggle('is-connected', connected.has(node.dataset.moduleId))
    })
    document.querySelectorAll('[data-module-detail]').forEach((detail) => { detail.hidden = detail.dataset.moduleDetail !== id })
  }
  const setModuleMode = (mode) => {
    moduleMode = mode
    document.querySelectorAll('[data-module-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.moduleMode === mode)))
    moduleNodes.forEach((node) => { node.hidden = mode === 'current' && node.dataset.presence === 'target' })
    moduleEdges.forEach((edge) => { edge.hidden = mode !== 'all' && edge.dataset.view !== 'both' && edge.dataset.view !== mode })
    const selected = moduleNodes.find((node) => node.dataset.moduleId === selectedModule)
    if (!selected || selected.hidden) selectModule(moduleNodes.find((node) => !node.hidden)?.dataset.moduleId)
    else selectModule(selectedModule)
  }
  document.querySelectorAll('[data-module-mode]').forEach((button) => button.addEventListener('click', () => setModuleMode(button.dataset.moduleMode)))
  moduleNodes.forEach((node) => {
    node.addEventListener('click', () => selectModule(node.dataset.moduleId))
    node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectModule(node.dataset.moduleId) } })
  })
  document.querySelectorAll('[data-select-module]').forEach((button) => button.addEventListener('click', () => {
    const node = moduleNodes.find((item) => item.dataset.moduleId === button.dataset.selectModule)
    if (node?.hidden) setModuleMode('all')
    selectModule(button.dataset.selectModule)
  }))
  setModuleMode('all')
  showView(location.hash.slice(1), false)
})()
</script>`

export function renderSidebarHtml(snapshot: ProjectSnapshot, report: AuditReport): string {
  const derived = deriveState(snapshot)
  const currentModules = snapshot.modules.filter((module) => module.presence === 'current').length
  const targetModules = snapshot.modules.length - currentModules
  const sprintOptions = snapshot.sprints.map((sprint) => `<option value="${escapeHtml(sprint.id)}">${escapeHtml(sprint.id)} · ${escapeHtml(sprint.title)}</option>`).join('')
  const sprintNavigation = snapshot.sprints.map((sprint) => `<button class="sprint-nav" data-sprint-target="${escapeHtml(sprint.id)}"><span>${escapeHtml(sprint.id)}</span><span>${escapeHtml(sprint.title)}</span></button>`).join('')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(snapshot.project)} · 项目工作台</title><style>
body .workspace,body .view,body .panel,body .overview-grid>*{min-width:0}body .next-task p{overflow-wrap:anywhere}body .ready-list button{grid-template-columns:42px minmax(0,1fr) auto}
:root{color-scheme:light dark;--bg:#f4f5f7;--panel:#fff;--panel-subtle:#f8f9fa;--text:#202124;--muted:#71767d;--line:#e1e4e8;--line-strong:#c8cdd4;--accent:#315efb;--accent-soft:#edf1ff;--good:#18794e;--good-soft:#eaf7f0;--warn:#98600a;--bad:#c1353d;--bad-soft:#fff0f1;--target:#7950b8;--sidebar:#fbfbfd;--shadow:0 1px 2px rgba(20,24,30,.04)}
@media(prefers-color-scheme:dark){:root{--bg:#141517;--panel:#1c1e21;--panel-subtle:#202226;--text:#eceef1;--muted:#a2a8b0;--line:#32363c;--line-strong:#4b515a;--accent:#9aafff;--accent-soft:#252d48;--good:#6ed3a0;--good-soft:#1d3329;--warn:#e3b15f;--bad:#ff969b;--bad-soft:#3b2428;--target:#c4a5ef;--sidebar:#18191c;--shadow:none}}
*{box-sizing:border-box}[hidden]{display:none!important}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;--sidebar-width:232px}button,input,select{font:inherit}button{color:inherit}button,a{-webkit-tap-highlight-color:transparent}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,[role=button]:focus-visible{outline:2px solid var(--accent);outline-offset:2px}a{color:inherit}code{font:12.5px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}h1,h2,h3,h4,p{margin-top:0}h1{font-size:32px;line-height:1.25;letter-spacing:-.025em;margin-bottom:12px}h2{font-size:18px;margin:3px 0 0}h3{font-size:16px}h4{font-size:13px}.muted{color:var(--muted)}.eyebrow{display:block;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}.sidebar{position:fixed;inset:0 auto 0 0;z-index:30;width:var(--sidebar-width);display:flex;flex-direction:column;background:var(--sidebar);border-right:1px solid var(--line);transition:width .18s ease,transform .18s ease}.brand{display:flex;align-items:center;gap:10px;height:58px;padding:0 16px;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden}.brand-mark{display:grid;place-items:center;flex:0 0 28px;height:28px;border-radius:8px;background:var(--text);color:var(--bg);font-weight:750;font-size:15px}.brand-text{min-width:0}.brand-text strong,.brand-text span{display:block;white-space:nowrap}.brand-text strong{font-size:14px}.brand-text span{font-size:11px;color:var(--muted)}.sidebar-scroll{flex:1;overflow-y:auto;padding:14px 10px}.nav-label{padding:10px 9px 6px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}.nav-item,.sprint-nav{width:100%;border:0;background:transparent;cursor:pointer;text-align:left}.nav-item{display:flex;align-items:center;gap:10px;padding:8px 9px;margin:2px 0;border-radius:7px;color:var(--muted)}.nav-item:hover,.sprint-nav:hover{background:var(--panel-subtle);color:var(--text)}.nav-item[aria-current=page]{background:var(--accent-soft);color:var(--accent);font-weight:600}.nav-icon{display:grid;place-items:center;flex:0 0 20px;font-size:12px;font-family:ui-monospace,monospace}.nav-text{white-space:nowrap}.nav-count{margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums}.sprint-nav{display:grid;grid-template-columns:28px minmax(0,1fr);gap:5px;padding:6px 9px;color:var(--muted);font-size:12px}.sprint-nav span:first-child{font-family:ui-monospace,monospace;color:var(--text)}.sprint-nav span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-footer{padding:12px 16px;border-top:1px solid var(--line);white-space:nowrap;overflow:hidden}.sidebar-footer code{display:block;color:var(--muted);font-size:11px}.sidebar-footer span{font-size:11px;color:var(--muted)}.workspace{min-height:100vh;margin-left:var(--sidebar-width);transition:margin-left .18s ease}.topbar{position:sticky;top:0;z-index:20;height:58px;display:flex;align-items:center;gap:12px;padding:0 24px;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}.icon-button{display:grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid var(--line);border-radius:7px;background:var(--panel);cursor:pointer}.icon-button:hover{background:var(--panel-subtle)}.breadcrumb{display:flex;align-items:center;gap:8px;min-width:0}.breadcrumb span:first-child{color:var(--muted)}.breadcrumb strong{font-size:13px}.topbar-actions{margin-left:auto;display:flex;align-items:center;gap:10px}.system-badge{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11px}.system-dot{width:6px;height:6px;border-radius:50%;background:var(--good)}.view{max-width:1540px;margin:auto;padding:26px 28px 48px}.overview-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:12px 0 24px}.overview-hero>div{max-width:760px}.overview-hero p{max-width:680px;margin-bottom:0;color:var(--muted);font-size:14px}.snapshot-pill{padding:5px 9px;border:1px solid var(--line);border-radius:20px;background:var(--panel);color:var(--muted);font:11px ui-monospace,monospace;white-space:nowrap}.metrics{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px;margin-bottom:18px}.metrics>div{padding:15px 16px;border:1px solid var(--line);border-radius:9px;background:var(--panel);box-shadow:var(--shadow)}.metrics strong,.metrics span{display:block}.metrics strong{font-size:27px;line-height:1.15;letter-spacing:-.02em}.metrics span{margin-top:5px;color:var(--muted);font-size:12px}.metrics .has-error strong{color:var(--bad)}.overview-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(280px,1fr);gap:14px}.panel,.sprint-card{border:1px solid var(--line);border-radius:10px;background:var(--panel);box-shadow:var(--shadow)}.panel{padding:18px}.section-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}.text-button{padding:0;border:0;background:transparent;color:var(--muted);font-size:12px;cursor:pointer}.text-button:hover{color:var(--accent)}.next-task{padding:15px;border:1px solid var(--line-strong);border-radius:8px;background:var(--panel-subtle)}.next-task code{margin-left:8px;color:var(--muted)}.next-task h3{margin:11px 0 6px;font-size:17px}.next-task p{margin-bottom:0;color:var(--muted);font-size:13px}.ready-list{margin-top:10px}.ready-list button{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:8px;width:100%;padding:8px 5px;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left;cursor:pointer}.ready-list button:last-child{border-bottom:0}.ready-list button:hover{color:var(--accent)}.ready-list code{color:var(--muted)}.badge{display:inline-flex;align-items:center;width:fit-content;padding:2px 6px;border:1px solid var(--line);border-radius:5px;color:var(--muted);background:var(--panel-subtle);font-size:11px;font-weight:600;line-height:1.5;white-space:nowrap}.badge.next,.badge.action{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}.badge.done,.badge.current{border-color:color-mix(in srgb,var(--good) 40%,var(--line));color:var(--good);background:var(--good-soft)}.badge.error{border-color:var(--bad);color:var(--bad);background:var(--bad-soft)}.badge.target{border-style:dashed;color:var(--target)}.badge.neutral{background:transparent}.audit-callout{padding:15px;border:1px solid var(--line);border-radius:8px}.audit-callout strong{font-size:13px}.audit-callout p{margin:5px 0 0;color:var(--muted);font-size:12px}.audit-callout.error{border-color:color-mix(in srgb,var(--bad) 45%,var(--line));background:var(--bad-soft)}.audit-callout.error strong{color:var(--bad)}.audit-callout.clean{border-color:var(--good);background:var(--good-soft)}.audit-callout.clean strong{color:var(--good)}.audit-numbers{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0 0}.audit-numbers>div{padding:10px;border-radius:7px;background:var(--panel-subtle)}.audit-numbers dt{color:var(--muted);font-size:11px}.audit-numbers dd{margin:2px 0 0;font-size:19px;font-weight:650}.section-block{margin-top:18px}.sprint-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.sprint-card{display:flex;flex-direction:column;gap:9px;padding:14px;text-align:left;cursor:pointer}.sprint-card:hover{border-color:var(--line-strong);transform:translateY(-1px)}.sprint-card-top{display:flex;justify-content:space-between;color:var(--muted);font-size:11px}.sprint-card strong{min-height:34px;font-size:13px}.progress{height:3px;overflow:hidden;border-radius:3px;background:var(--line)}.progress>span{display:block;height:100%;background:var(--accent)}.page-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin:4px 0 20px}.page-heading p{max-width:720px;margin:7px 0 0;color:var(--muted);font-size:13px}.segmented{display:flex;padding:3px;border:1px solid var(--line);border-radius:8px;background:var(--panel)}.segmented button{padding:5px 10px;border:0;border-radius:5px;background:transparent;color:var(--muted);font-size:12px;cursor:pointer}.segmented button[aria-pressed=true]{background:var(--text);color:var(--bg)}.filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px;margin-bottom:10px;border:1px solid var(--line);border-radius:9px;background:var(--panel)}.filter-buttons{display:flex;gap:5px;flex-wrap:wrap}.filter-buttons button{padding:5px 8px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--muted);font-size:12px;cursor:pointer}.filter-buttons button[aria-pressed=true]{border-color:var(--line-strong);background:var(--panel-subtle);color:var(--text);font-weight:600}.filter-controls{display:flex;gap:7px;margin-left:auto}.filter-controls select,.filter-controls input{height:30px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--text);padding:0 9px;font-size:12px}.filter-controls input{width:210px}.result-count{margin:0 0 18px;color:var(--muted);font-size:12px}.sprint-block{margin-bottom:24px}.sprint-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--line)}.sprint-heading>div:first-child{display:flex;align-items:center;gap:10px}.sprint-heading h3{margin:0}.sprint-id{font:600 11px ui-monospace,monospace}.sprint-meta{display:flex;gap:10px;color:var(--muted);font-size:11px;flex-wrap:wrap;justify-content:flex-end}.task-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:10px}.task-card{align-self:start;border:1px solid var(--line);border-radius:8px;background:var(--panel);overflow:hidden}.task-card.next{border-color:var(--accent)}.task-card summary{display:flex;flex-direction:column;gap:9px;padding:13px;cursor:pointer;list-style:none}.task-card summary::-webkit-details-marker{display:none}.task-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.task-card-top>code{color:var(--muted)}.task-title{font-size:14px;font-weight:650}.task-summary{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:3;color:var(--muted);font-size:12px}.task-expand{display:flex;justify-content:space-between;color:var(--muted);font-size:11px}.task-card[open] .task-expand span{transform:rotate(45deg)}.task-detail{padding:0 13px 13px;border-top:1px solid var(--line)}.task-detail dl{display:grid;grid-template-columns:40px 1fr;gap:4px;margin:12px 0;font-size:12px}.task-detail dt{color:var(--muted)}.task-detail dd{margin:0}.verification{padding:10px;border-radius:6px;background:var(--panel-subtle)}.verification strong{font-size:11px}.verification p{margin:5px 0 0;color:var(--muted);font-size:12px}.evidence{padding:0;list-style:none;font-size:11px}.evidence li{display:flex;justify-content:space-between;gap:8px;margin:4px 0}.evidence-verified{color:var(--good)}.evidence-missing,.evidence-unverified{color:var(--bad)}.source{margin:10px 0 0;color:var(--muted);font-size:11px}.empty{padding:24px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);text-align:center}.module-layout{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:12px}.map-scroll{min-height:570px;overflow:auto;border:1px solid var(--line);border-radius:10px;background:var(--panel)}.module-map{display:block;width:100%;min-width:1050px;height:auto}.layer-label{fill:var(--muted);font-size:12px;font-weight:600}.edge{fill:none;stroke:var(--line-strong);stroke-width:1.2;opacity:.55}.edge.target{stroke:var(--target);stroke-dasharray:6 5}.edge.active{stroke:var(--accent);stroke-width:2;opacity:1}.arrow-current,.arrow-both{fill:var(--line-strong)}.arrow-target{fill:var(--target)}.module-node{cursor:pointer;outline:none}.module-node rect{fill:var(--panel);stroke:var(--line-strong);stroke-width:1}.module-node.target rect{stroke:var(--target);stroke-dasharray:5 4}.module-node.is-connected rect{stroke:var(--accent)}.module-node.is-selected rect{stroke:var(--accent);stroke-width:2;fill:var(--accent-soft)}.module-name{fill:var(--text);font-size:13px;font-weight:600}.module-package{fill:var(--muted);font-size:10px}.module-state{fill:var(--good);font-size:10px}.module-node.target .module-state{fill:var(--target)}.module-inspector{align-self:start;position:sticky;top:76px;min-height:360px;padding:17px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}.detail-badges{display:flex;gap:6px}.module-detail h3{margin:16px 0 4px;font-size:22px}.package-name{color:var(--muted)}.module-facts{margin:18px 0}.module-facts dt{margin-top:10px;color:var(--muted);font-size:11px}.module-facts dd{margin:3px 0 0}.interaction-list{padding-top:14px;border-top:1px solid var(--line)}.interaction{display:block;width:100%;margin:6px 0;padding:9px;border:1px solid var(--line);border-radius:6px;background:var(--panel-subtle);text-align:left;cursor:pointer}.interaction:hover{border-color:var(--accent)}.interaction span,.interaction strong{display:block}.interaction span{color:var(--muted);font-size:11px}.interaction strong{margin-top:3px;font-size:12px}.audit-list{display:grid;gap:8px}.audit-item{padding:13px;border:1px solid var(--line);border-left:3px solid var(--warn);border-radius:7px;background:var(--panel-subtle)}.audit-item.error{border-left-color:var(--bad)}.audit-item>div{display:flex;align-items:center;gap:8px}.audit-item p{margin:8px 0 0}.drift-list{display:grid;gap:7px}.drift-list article{display:grid;grid-template-columns:auto 100px 130px 1fr;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--line)}.drift-list p{margin:0;color:var(--muted)}.footer{padding:20px 0 0;color:var(--muted);font-size:11px}.sidebar-overlay{display:none}.sidebar-collapsed{--sidebar-width:64px}.sidebar-collapsed .brand{padding:0 18px}.sidebar-collapsed .brand-text,.sidebar-collapsed .nav-text,.sidebar-collapsed .nav-count,.sidebar-collapsed .nav-label,.sidebar-collapsed .sprint-nav span:last-child,.sidebar-collapsed .sidebar-footer{display:none}.sidebar-collapsed .nav-item{justify-content:center;padding:9px}.sidebar-collapsed .sprint-nav{grid-template-columns:1fr;text-align:center;padding:7px 0}.sidebar-collapsed .sidebar-scroll{padding:14px 10px}
@media(max-width:1200px){.task-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sprint-cards{grid-template-columns:repeat(3,minmax(0,1fr))}.module-layout{grid-template-columns:1fr}.module-inspector{position:static;min-height:0}.map-scroll{min-height:0}.overview-grid{grid-template-columns:1fr}}
@media(max-width:800px){body{--sidebar-width:0px}.sidebar{width:240px;transform:translateX(-100%)}.sidebar-open .sidebar{transform:translateX(0)}.sidebar-open .sidebar-overlay{display:block;position:fixed;inset:0;z-index:25;background:rgba(0,0,0,.35)}.workspace{margin-left:0}.topbar{padding:0 14px}.view{padding:20px 14px 36px}.system-badge{display:none}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.metrics>div:last-child{grid-column:span 2}.overview-hero{display:block}.snapshot-pill{display:inline-flex;margin-top:12px}.overview-grid{grid-template-columns:1fr}.sprint-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.task-grid{grid-template-columns:1fr}.filters{align-items:stretch}.filter-controls{width:100%;margin-left:0}.filter-controls select{max-width:45%;flex:1}.filter-controls input{min-width:0;flex:1}.sprint-heading{align-items:flex-start;flex-direction:column}.sprint-meta{justify-content:flex-start}.page-heading{align-items:flex-start;flex-direction:column}.drift-list article{grid-template-columns:auto 1fr}.drift-list p{grid-column:1/-1}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
${WORKBENCH_STYLES}</style></head><body data-active-view="overview" data-project="${escapeHtml(snapshot.project)}"><aside class="sidebar" aria-label="项目导航"><div class="brand"><span class="brand-mark">I</span><div class="brand-text"><strong>Innate Project Canvas</strong><span>项目计划与架构工作台</span></div></div><div class="sidebar-scroll"><div class="nav-label">工作区</div><button class="nav-item" data-view-target="overview" aria-current="page"><span class="nav-icon">01</span><span class="nav-text">项目总览</span></button><button class="nav-item" data-view-target="tasks"><span class="nav-icon">02</span><span class="nav-text">Sprint 任务</span><span class="nav-count">${snapshot.tasks.length}</span></button><button class="nav-item" data-view-target="modules"><span class="nav-icon">03</span><span class="nav-text">模块交互</span><span class="nav-count">${snapshot.modules.length}</span></button><button class="nav-item" data-view-target="audit"><span class="nav-icon">04</span><span class="nav-text">审计与漂移</span>${report.summary.errors ? `<span class="nav-count">${report.summary.errors}</span>` : ''}</button><div class="nav-label">Sprints</div>${sprintNavigation}</div><div class="sidebar-footer"><code>${escapeHtml(report.snapshotHash.slice(0, 16))}</code><span>${escapeHtml(snapshot.generatedAt.slice(0, 10))} · 结构化快照</span></div></aside><button class="sidebar-overlay" id="sidebar-overlay" aria-label="关闭导航"></button><div class="workspace"><header class="topbar"><button class="icon-button" id="sidebar-trigger" aria-label="折叠或展开导航" title="折叠导航 · Ctrl/⌘ B">☰</button><div class="breadcrumb"><span>innate-labs</span><span>/</span><strong id="view-title">项目总览</strong></div><div class="topbar-actions">${LAYOUT_SWITCH}<span class="system-badge"><span class="system-dot"></span>跟随系统</span></div></header>${TOP_TABS}<main><section class="view" id="view-overview" data-view>${renderOverview(snapshot, report, derived)}</section><section class="view" id="view-tasks" data-view hidden><div class="page-heading"><div><span class="eyebrow">Execution board</span><h1>Sprint 任务</h1><p>从依赖图派生可执行状态。筛选只改变视图，不回写任务状态；展开卡片可查看验收、来源和证据，双击卡片可直接编辑。</p></div></div><div class="filters"><div class="filter-buttons" aria-label="任务状态筛选">${[['all','全部'],['action','可推进'],['blocked','被阻塞'],['done','已完成'],['optional','可选与债务']].map(([id,label]) => `<button data-task-filter="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('')}</div><div class="filter-controls"><select id="sprint-filter" aria-label="按 Sprint 筛选"><option value="all">全部 Sprint</option>${sprintOptions}</select><input id="task-search" type="search" placeholder="搜索任务 · /" aria-label="搜索任务"></div></div><p class="result-count" id="task-count" aria-live="polite">显示 ${snapshot.tasks.length} / ${snapshot.tasks.length} 张任务卡</p>${renderSprintTasks(snapshot, derived)}<p class="empty" id="task-empty" hidden>没有符合当前筛选条件的任务。</p></section><section class="view" id="view-modules" data-view hidden><div class="page-heading"><div><span class="eyebrow">Architecture canvas</span><h1>模块交互</h1><p>${currentModules} 个当前模块，${targetModules} 个目标模块。点击节点查看目录、来源和直接依赖；目标状态始终用虚线标识。</p></div><div class="segmented" aria-label="模块视图"><button data-module-mode="current" aria-pressed="false">当前</button><button data-module-mode="target" aria-pressed="false">目标</button><button data-module-mode="all" aria-pressed="true">全部</button></div></div>${renderModuleMap(snapshot)}</section><section class="view" id="view-audit" data-view hidden><div class="page-heading"><div><span class="eyebrow">Evidence gate</span><h1>审计与漂移</h1><p>审计错误不会因为页面成功生成而消失。漂移只比较任务、模块、边和来源的语义变化。</p></div></div>${renderAuditView(report)}</section><footer class="footer view">同一份 project-snapshot.json 驱动全部视图。请修改权威来源后重新同步，不要手工编辑生成文件。</footer></main></div>${TASK_EDITOR}${SCRIPT}${WORKBENCH_SCRIPT}</body></html>`
}
