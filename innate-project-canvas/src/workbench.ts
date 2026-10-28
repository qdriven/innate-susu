export const WORKBENCH_STYLES = `
/* Top tabs are the default; Sidebar is an optional presentation of the same views. */
.sidebar{display:none}.workspace{margin-left:0}.top-tab-bar{position:sticky;top:58px;z-index:19;display:flex;gap:4px;padding:0 24px;height:43px;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);overflow-x:auto}.top-tab{position:relative;flex:0 0 auto;padding:0 14px;border:0;background:transparent;color:var(--muted);font-size:13px;cursor:pointer}.top-tab:hover{color:var(--text)}.top-tab[aria-current=page]{color:var(--text);font-weight:650}.top-tab[aria-current=page]:after{content:"";position:absolute;right:12px;bottom:-1px;left:12px;height:2px;background:var(--accent)}.layout-switch{display:flex;padding:2px;border:1px solid var(--line);border-radius:6px;background:var(--panel)}.layout-switch button{padding:3px 7px;border:0;border-radius:4px;background:transparent;color:var(--muted);font-size:11px;cursor:pointer}.layout-switch button[aria-pressed=true]{background:var(--panel-subtle);color:var(--text);font-weight:600}.sidebar-enabled .sidebar{display:flex}.sidebar-enabled .workspace{margin-left:var(--sidebar-width)}.sidebar-enabled .top-tab-bar{display:none}.sidebar-enabled #sidebar-trigger{display:grid}#sidebar-trigger{display:none}.task-actions{display:flex;gap:6px;padding:12px 0 0}.task-action{padding:4px 8px;border:1px solid var(--line);border-radius:5px;background:var(--panel);color:var(--muted);font-size:11px;cursor:pointer}.task-action:hover{border-color:var(--accent);color:var(--accent)}.badge.edited{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}.task-card-top>code{margin-right:auto}.draft-content{margin-top:12px}.markdown-section{margin-bottom:9px;padding:11px;border:1px solid var(--line);border-radius:7px;background:var(--panel-subtle)}.markdown-section:last-child{margin-bottom:0}.markdown-section h2,.markdown-section h3{margin:0 0 7px;font-size:12px}.markdown-section h2{color:var(--text)}.markdown-section p{margin:0 0 7px;color:var(--muted);font-size:12px;overflow-wrap:anywhere}.markdown-section p:last-child{margin-bottom:0}.markdown-section ul{margin:0;padding-left:17px;color:var(--muted);font-size:12px}.markdown-section li{margin:3px 0;overflow-wrap:anywhere}.markdown-section code{padding:1px 3px;border-radius:3px;background:var(--panel)}.markdown-section pre{margin:0;padding:9px;overflow:auto;border-radius:5px;background:var(--panel)}.markdown-section pre code{padding:0}.markdown-section strong{color:var(--text)}.task-editor{width:min(860px,calc(100vw - 32px));max-height:calc(100vh - 48px);padding:0;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--text);box-shadow:0 24px 80px rgba(0,0,0,.22)}.task-editor::backdrop{background:rgba(15,18,24,.48);backdrop-filter:blur(3px)}.editor-form{display:flex;flex-direction:column;max-height:calc(100vh - 50px)}.editor-header{display:flex;align-items:center;gap:9px;padding:15px 18px;border-bottom:1px solid var(--line)}.editor-header h2{margin:0;font-size:16px}.editor-header code{color:var(--muted)}.editor-close{margin-left:auto;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:var(--muted);font-size:22px;cursor:pointer}.editor-close:hover{background:var(--panel-subtle);color:var(--text)}.editor-body{padding:16px 18px;overflow-y:auto}.editor-field{display:block;margin-bottom:13px}.editor-field>span{display:block;margin-bottom:6px;font-size:12px;font-weight:600}.editor-title{width:100%;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--text);font-size:14px}.editor-tabs{display:flex;gap:3px;margin-bottom:7px;border-bottom:1px solid var(--line)}.editor-tabs button{padding:6px 11px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--muted);font-size:12px;cursor:pointer}.editor-tabs button[aria-pressed=true]{border-bottom-color:var(--accent);color:var(--text);font-weight:600}.editor-markdown{display:block;width:100%;min-height:330px;resize:vertical;padding:12px;border:1px solid var(--line);border-radius:7px;background:var(--bg);color:var(--text);font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;outline:none}.editor-markdown:focus{border-color:var(--accent)}.editor-preview{min-height:330px;padding:1px 0}.editor-preview-empty{padding:24px;border:1px dashed var(--line);border-radius:7px;color:var(--muted);text-align:center}.editor-note{margin:10px 0 0;color:var(--muted);font-size:11px}.editor-error{min-height:18px;margin:7px 0 0;color:var(--bad);font-size:12px}.editor-footer{display:flex;align-items:center;gap:8px;padding:12px 18px;border-top:1px solid var(--line)}.editor-footer .muted{margin-right:auto;font-size:11px}.editor-button{padding:6px 13px;border:1px solid var(--line);border-radius:6px;background:var(--panel);font-size:12px;cursor:pointer}.editor-button.primary{border-color:var(--accent);background:var(--accent);color:var(--panel)}.editor-button:hover{filter:brightness(.97)}.editor-reset{margin-right:4px;color:var(--bad)}.copy-toast{position:fixed;right:20px;bottom:20px;z-index:60;padding:9px 13px;border:1px solid var(--line);border-radius:7px;background:var(--text);color:var(--bg);font-size:12px;box-shadow:var(--shadow)}
.markdown-toolbar{display:flex;gap:7px;margin:0 0 8px;padding:5px;overflow-x:auto;border:1px solid var(--line);border-radius:6px;background:var(--panel-subtle);scrollbar-width:thin}.markdown-toolbar[hidden]{display:none}.markdown-toolbar-group{display:flex;flex:0 0 auto;gap:2px;padding-right:7px;border-right:1px solid var(--line)}.markdown-toolbar-group:last-child{padding-right:0;border-right:0}.markdown-toolbar button{min-width:27px;height:26px;padding:0 6px;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--muted);font-size:12px;line-height:1;white-space:nowrap;cursor:pointer}.markdown-toolbar button:hover,.markdown-toolbar button:focus-visible{border-color:var(--line);background:var(--panel);color:var(--text);outline:none}.markdown-toolbar button:active{background:var(--accent-soft);color:var(--accent)}.markdown-section blockquote{margin:7px 0;padding:6px 10px;border-left:2px solid var(--accent);background:var(--panel);color:var(--muted)}.markdown-section blockquote p{margin:0}.markdown-section a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}.markdown-section li.task-item{list-style:none}.markdown-section li.task-item input{margin:0 6px 0 0;vertical-align:middle}.markdown-section del{color:var(--muted)}
@media(max-width:800px){.top-tab-bar{padding:0 10px;height:41px}.top-tab{padding:0 11px}.sidebar-enabled .workspace{margin-left:0}.layout-switch{display:none}.task-editor{width:calc(100vw - 20px);max-height:calc(100vh - 20px)}.editor-form{max-height:calc(100vh - 22px)}.editor-header,.editor-body,.editor-footer{padding-right:13px;padding-left:13px}.editor-footer{flex-wrap:wrap}.editor-footer .muted{flex-basis:100%}.editor-markdown,.editor-preview{min-height:280px}}
`

export const TOP_TABS = `<nav class="top-tab-bar" aria-label="项目视图"><button class="top-tab" data-view-target="overview" aria-current="page">项目总览</button><button class="top-tab" data-view-target="tasks">Sprint 任务</button><button class="top-tab" data-view-target="modules">模块交互</button><button class="top-tab" data-view-target="audit">审计与漂移</button></nav>`

export const LAYOUT_SWITCH = `<div class="layout-switch" aria-label="导航布局"><button type="button" data-layout="tabs" aria-pressed="true">Tabs</button><button type="button" data-layout="sidebar" aria-pressed="false">Sidebar</button></div>`

const toolbarButton = (action: string, label: string, text: string, shortcut = '') =>
  `<button type="button" data-md-action="${action}" aria-label="${label}" title="${label}${shortcut ? ` (${shortcut})` : ''}">${text}</button>`

export const MARKDOWN_TOOLBAR = `<div class="markdown-toolbar" id="markdown-toolbar" role="toolbar" aria-label="Markdown 格式化工具栏"><div class="markdown-toolbar-group">${toolbarButton('paragraph', '正文', '正文')}${toolbarButton('heading2', '二级标题', 'H2')}${toolbarButton('heading3', '三级标题', 'H3')}</div><div class="markdown-toolbar-group">${toolbarButton('bold', '粗体', '<strong>B</strong>', 'Ctrl/⌘ B')}${toolbarButton('italic', '斜体', '<em>I</em>', 'Ctrl/⌘ I')}${toolbarButton('strike', '删除线', '<s>S</s>')}${toolbarButton('inlineCode', '行内代码', '&lt;/&gt;')}${toolbarButton('codeBlock', '代码块', '{ }')}</div><div class="markdown-toolbar-group">${toolbarButton('bulletList', '无序列表', '• 列表')}${toolbarButton('orderedList', '有序列表', '1. 列表')}${toolbarButton('taskList', '检查列表', '☑ 列表')}</div><div class="markdown-toolbar-group">${toolbarButton('quote', '引用', '❝')}${toolbarButton('link', '链接', '链接', 'Ctrl/⌘ K')}</div></div>`

export const TASK_EDITOR = `<dialog class="task-editor" id="task-editor" aria-labelledby="editor-heading"><form class="editor-form" id="editor-form"><header class="editor-header"><h2 id="editor-heading">编辑任务</h2><code id="editor-task-id"></code><button class="editor-close" type="button" id="editor-close" aria-label="关闭">×</button></header><div class="editor-body"><label class="editor-field"><span>标题</span><input class="editor-title" id="editor-title" required maxlength="300"></label><div class="editor-tabs" aria-label="编辑模式"><button type="button" data-editor-mode="edit" aria-pressed="true">Markdown 编辑</button><button type="button" data-editor-mode="preview" aria-pressed="false">分块预览</button></div>${MARKDOWN_TOOLBAR}<textarea class="editor-markdown" id="editor-markdown" aria-label="任务 Markdown 正文" spellcheck="false"></textarea><article class="editor-preview" id="editor-preview" hidden></article><p class="editor-note">标题独立编辑；其余全部内容使用 Markdown。二级标题（##）会在保存后自动分块。快捷键：Ctrl/⌘ B、I、K，Ctrl/⌘ Enter 保存。</p><p class="editor-error" id="editor-error" role="alert"></p></div><footer class="editor-footer"><span class="muted">保存到当前浏览器，不修改权威 Sprint 文档</span><button class="editor-button editor-reset" type="button" id="editor-reset">恢复原始</button><button class="editor-button" type="button" id="editor-cancel">取消</button><button class="editor-button primary" type="submit">保存草稿</button></footer></form></dialog><div class="copy-toast" id="copy-toast" role="status" hidden></div>`

export const WORKBENCH_SCRIPT = String.raw`<script>
(() => {
  const body = document.body
  const layoutButtons = [...document.querySelectorAll('[data-layout]')]
  const setLayout = (layout, persist = true) => {
    const sidebar = layout === 'sidebar'
    body.classList.toggle('sidebar-enabled', sidebar)
    if (!sidebar) body.classList.remove('sidebar-open', 'sidebar-collapsed')
    layoutButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.layout === layout)))
    if (persist) try { localStorage.setItem('ipc-layout', layout) } catch {}
  }
  layoutButtons.forEach((button) => button.addEventListener('click', () => setLayout(button.dataset.layout)))
  let savedLayout = 'tabs'
  try { savedLayout = localStorage.getItem('ipc-layout') || 'tabs' } catch {}
  setLayout(savedLayout, false)

  const storageKey = 'ipc-task-drafts-v1:' + body.dataset.project
  const readDrafts = () => {
    try { const value = JSON.parse(localStorage.getItem(storageKey) || '{}'); return value && typeof value === 'object' ? value : {} } catch { return {} }
  }
  let drafts = readDrafts()
  let editingId = null
  const dialog = document.getElementById('task-editor')
  const titleInput = document.getElementById('editor-title')
  const markdownInput = document.getElementById('editor-markdown')
  const preview = document.getElementById('editor-preview')
  const error = document.getElementById('editor-error')
  markdownInput.addEventListener('input', () => { error.textContent = '' })
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
  const safeUrl = (value) => {
    try {
      const url = new URL(String(value).replace(/&amp;/g, '&'))
      return url.protocol === 'http:' || url.protocol === 'https:' ? escape(url.href) : null
    } catch { return null }
  }
  const inline = (value) => {
    const code = []
    let output = escape(value).replace(/\x60([^\x60]+)\x60/g, (_, content) => {
      code.push('<code>' + content + '</code>')
      return '\u0000' + (code.length - 1) + '\u0000'
    })
    output = output.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
      const safe = safeUrl(href)
      return safe ? '<a href="' + safe + '" target="_blank" rel="noopener noreferrer">' + label + '</a>' : match
    })
    output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/~~([^~]+)~~/g, '<del>$1</del>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    return output.replace(/\u0000(\d+)\u0000/g, (_, index) => code[Number(index)])
  }
  const markdown = (source) => {
    const lines = String(source).replace(/\r\n/g, '\n').split('\n')
    const sections = []
    let section = { title: '', level: 2, lines: [] }
    const flush = () => { if (section.title || section.lines.some((line) => line.trim())) sections.push(section) }
    for (const line of lines) {
      const heading = /^(##|###)\s+(.+)$/.exec(line)
      if (heading) { flush(); section = { title: heading[2], level: heading[1].length, lines: [] } }
      else section.lines.push(line)
    }
    flush()
    const renderSection = (item) => {
      const output = []
      let inCode = false, code = [], listType = '', paragraph = []
      const flushParagraph = () => { if (paragraph.length) output.push('<p>' + inline(paragraph.join(' ').trim()) + '</p>'); paragraph = [] }
      const flushList = () => { if (listType) output.push('</' + listType + '>'); listType = '' }
      const openList = (type) => { flushParagraph(); if (listType !== type) { flushList(); output.push('<' + type + '>'); listType = type } }
      for (const line of item.lines) {
        const task = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line)
        const bullet = /^\s*[-*]\s+(.+)$/.exec(line)
        const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line)
        const quote = /^\s*>\s?(.*)$/.exec(line)
        if (line.trim().startsWith('\x60\x60\x60')) {
          flushParagraph(); flushList()
          if (inCode) { output.push('<pre><code>' + escape(code.join('\n')) + '</code></pre>'); code = [] }
          inCode = !inCode
        } else if (inCode) code.push(line)
        else if (task) {
          openList('ul')
          output.push('<li class="task-item"><input type="checkbox" disabled' + (task[1].toLowerCase() === 'x' ? ' checked' : '') + '>' + inline(task[2]) + '</li>')
        } else if (bullet) {
          openList('ul'); output.push('<li>' + inline(bullet[1]) + '</li>')
        } else if (ordered) {
          openList('ol'); output.push('<li>' + inline(ordered[1]) + '</li>')
        } else if (quote) {
          flushParagraph(); flushList(); output.push('<blockquote><p>' + inline(quote[1]) + '</p></blockquote>')
        } else if (!line.trim()) { flushParagraph(); flushList() }
        else { flushList(); paragraph.push(line) }
      }
      if (inCode) output.push('<pre><code>' + escape(code.join('\n')) + '</code></pre>')
      flushParagraph(); flushList()
      const heading = item.title ? '<h' + item.level + '>' + inline(item.title) + '</h' + item.level + '>' : ''
      return '<section class="markdown-section">' + heading + output.join('') + '</section>'
    }
    return sections.length ? sections.map(renderSection).join('') : '<p class="editor-preview-empty">输入 Markdown 后在这里查看分块效果。</p>'
  }
  const applyDraft = (id) => {
    const card = document.getElementById('task-' + id)
    if (!card) return
    const draft = drafts[id]
    const title = card.querySelector('.task-title')
    const summary = card.querySelector('.task-summary')
    const original = card.querySelector('[data-original-content]')
    const content = card.querySelector('[data-draft-content]')
    const badge = card.querySelector('[data-draft-badge]')
    title.textContent = draft?.title || card.dataset.originalTitle
    summary.textContent = draft?.body || card.dataset.summary
    original.hidden = Boolean(draft)
    content.hidden = !draft
    badge.hidden = !draft
    if (draft) content.innerHTML = markdown(draft.body)
    else content.innerHTML = ''
    card.dataset.search = (id + ' ' + title.textContent + ' ' + summary.textContent).toLowerCase()
  }
  const applyAll = () => { document.querySelectorAll('[data-task]').forEach((card) => applyDraft(card.id.replace(/^task-/, ''))) }
  applyAll()
  const setEditorMode = (mode) => {
    document.querySelectorAll('[data-editor-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.editorMode === mode)))
    markdownInput.hidden = mode === 'preview'
    preview.hidden = mode !== 'preview'
    document.getElementById('markdown-toolbar').hidden = mode === 'preview'
    if (mode === 'preview') preview.innerHTML = markdown(markdownInput.value)
  }
  document.querySelectorAll('[data-editor-mode]').forEach((button) => button.addEventListener('click', () => setEditorMode(button.dataset.editorMode)))
  const replaceSelection = (replacement, selectionStart, selectionEnd) => {
    const start = markdownInput.selectionStart, end = markdownInput.selectionEnd
    markdownInput.setRangeText(replacement, start, end, 'end')
    markdownInput.focus()
    markdownInput.setSelectionRange(selectionStart ?? start, selectionEnd ?? (start + replacement.length))
    markdownInput.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const toggleWrap = (marker, placeholder) => {
    const value = markdownInput.value, start = markdownInput.selectionStart, end = markdownInput.selectionEnd
    const selected = value.slice(start, end)
    if (start >= marker.length && value.slice(start - marker.length, start) === marker && value.slice(end, end + marker.length) === marker) {
      markdownInput.setRangeText(selected, start - marker.length, end + marker.length, 'end')
      markdownInput.focus(); markdownInput.setSelectionRange(start - marker.length, end - marker.length)
      return
    }
    if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
      const unwrapped = selected.slice(marker.length, -marker.length)
      replaceSelection(unwrapped, start, start + unwrapped.length)
      return
    }
    const content = selected || placeholder
    replaceSelection(marker + content + marker, start + marker.length, start + marker.length + content.length)
  }
  const transformLines = (transform) => {
    const value = markdownInput.value, start = markdownInput.selectionStart, end = markdownInput.selectionEnd
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const nextBreak = value.indexOf('\n', end)
    const lineEnd = nextBreak === -1 ? value.length : nextBreak
    const replacement = value.slice(lineStart, lineEnd).split('\n').map(transform).join('\n')
    markdownInput.setRangeText(replacement, lineStart, lineEnd, 'end')
    markdownInput.focus(); markdownInput.setSelectionRange(lineStart, lineStart + replacement.length)
    markdownInput.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const applyLineAction = (action) => {
    const prefixes = { bulletList: '- ', orderedList: '', taskList: '- [ ] ', quote: '> ' }
    const patterns = { bulletList: /^\s*[-*]\s+(?!\[[ xX]\]\s)/, orderedList: /^\s*\d+[.)]\s+/, taskList: /^\s*[-*]\s+\[[ xX]\]\s+/, quote: /^\s*>\s?/ }
    if (action === 'paragraph' || action === 'heading2' || action === 'heading3') {
      const heading = action === 'heading2' ? '## ' : action === 'heading3' ? '### ' : ''
      transformLines((line) => {
        const content = line.replace(/^\s*#{2,3}\s+/, '')
        if (!content.trim() || !heading) return content
        const alreadyCurrent = action === 'heading2' ? /^\s*##\s+/.test(line) : /^\s*###\s+/.test(line)
        return alreadyCurrent ? content : heading + content
      })
      return
    }
    const pattern = patterns[action]
    const selected = markdownInput.value.slice(markdownInput.selectionStart, markdownInput.selectionEnd)
    const selectedLines = selected.split('\n').filter((line) => line.trim())
    const remove = selectedLines.length > 0 && selectedLines.every((line) => pattern.test(line))
    transformLines((line, index) => {
      if (!line.trim()) return line
      if (remove) return line.replace(pattern, '')
      const content = line.replace(/^\s*(?:[-*]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|>\s?)/, '')
      return action === 'orderedList' ? (index + 1) + '. ' + content : prefixes[action] + content
    })
  }
  const applyMarkdownAction = (action) => {
    error.textContent = ''
    if (action === 'bold') return toggleWrap('**', '粗体文字')
    if (action === 'italic') return toggleWrap('*', '斜体文字')
    if (action === 'strike') return toggleWrap('~~', '删除文字')
    if (action === 'inlineCode') return toggleWrap('\x60', '代码')
    if (action === 'codeBlock') {
      const start = markdownInput.selectionStart
      const selected = markdownInput.value.slice(start, markdownInput.selectionEnd) || '代码'
      const fence = '\x60\x60\x60'
      return replaceSelection(fence + '\n' + selected + '\n' + fence, start + fence.length + 1, start + fence.length + 1 + selected.length)
    }
    if (action === 'link') {
      const href = window.prompt('输入 http:// 或 https:// 链接', 'https://')
      if (href === null) return
      if (!safeUrl(href)) { error.textContent = '链接仅支持有效的 http:// 或 https:// 地址。'; return }
      const start = markdownInput.selectionStart
      const label = markdownInput.value.slice(start, markdownInput.selectionEnd) || '链接文字'
      return replaceSelection('[' + label + '](' + href + ')', start + 1, start + 1 + label.length)
    }
    applyLineAction(action)
  }
  const toolbar = document.getElementById('markdown-toolbar')
  toolbar.addEventListener('mousedown', (event) => { if (event.target.closest('button')) event.preventDefault() })
  toolbar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-md-action]')
    if (button) applyMarkdownAction(button.dataset.mdAction)
  })
  document.getElementById('editor-form').addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.key === 'Enter') { event.preventDefault(); document.getElementById('editor-form').requestSubmit(); return }
    if (document.activeElement !== markdownInput) return
    const action = ({ b: 'bold', i: 'italic', k: 'link' })[event.key.toLowerCase()]
    if (action) { event.preventDefault(); applyMarkdownAction(action) }
  })
  const openEditor = (id) => {
    const card = document.getElementById('task-' + id)
    if (!card) return
    editingId = id
    const draft = drafts[id]
    document.getElementById('editor-task-id').textContent = id
    titleInput.value = draft?.title || card.dataset.originalTitle
    markdownInput.value = draft?.body || card.dataset.originalBody
    error.textContent = ''
    setEditorMode('edit')
    dialog.showModal()
    titleInput.focus()
  }
  const closeEditor = () => { dialog.close(); editingId = null }
  document.querySelectorAll('[data-edit-task]').forEach((button) => button.addEventListener('click', () => openEditor(button.dataset.editTask)))
  document.querySelectorAll('.task-card').forEach((card) => card.addEventListener('dblclick', (event) => {
    if (event.target.closest('.task-detail, button, a, input, select, textarea')) return
    openEditor(card.id.replace(/^task-/, ''))
  }))
  document.getElementById('editor-close').addEventListener('click', closeEditor)
  document.getElementById('editor-cancel').addEventListener('click', closeEditor)
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeEditor() })
  document.getElementById('editor-form').addEventListener('submit', (event) => {
    event.preventDefault()
    if (!editingId || !titleInput.value.trim()) { error.textContent = '标题不能为空。'; return }
    const next = { ...drafts, [editingId]: { title: titleInput.value.trim(), body: markdownInput.value, updatedAt: new Date().toISOString() } }
    try { localStorage.setItem(storageKey, JSON.stringify(next)); drafts = next; applyDraft(editingId); closeEditor() }
    catch { error.textContent = '浏览器存储不可用，草稿尚未保存。请复制 Markdown 备份。' }
  })
  document.getElementById('editor-reset').addEventListener('click', () => {
    if (!editingId) return
    const next = { ...drafts }; delete next[editingId]
    try { localStorage.setItem(storageKey, JSON.stringify(next)); drafts = next; applyDraft(editingId) } catch {}
    const card = document.getElementById('task-' + editingId)
    titleInput.value = card.dataset.originalTitle
    markdownInput.value = card.dataset.originalBody
    setEditorMode('edit')
  })
  const toast = (message) => {
    const element = document.getElementById('copy-toast')
    element.textContent = message; element.hidden = false
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { element.hidden = true }, 1800)
  }
  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return } catch {}
    }
    const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area); area.select()
    const copied = document.execCommand('copy'); area.remove(); if (!copied) throw new Error('copy failed')
  }
  document.querySelectorAll('[data-copy-task]').forEach((button) => button.addEventListener('click', async () => {
    const id = button.dataset.copyTask
    const card = document.getElementById('task-' + id)
    const draft = drafts[id]
    const text = '# ' + (draft?.title || card.dataset.originalTitle) + '\n\n' + (draft?.body || card.dataset.originalBody)
    try { await copyText(text); toast('Markdown 已复制') } catch { toast('复制失败，请使用编辑器全选复制') }
  }))
})()
</script>`
