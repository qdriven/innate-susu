import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { highlightCode } from '@dogic/syntax-highlighting'
import type { WorkspaceApi, WorkspaceFile } from '../shared/index.js'

export function resolveWorkspaceRelative(documentPath: string, target: string): string | undefined {
  if (!target || target.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(target)) return undefined
  const segments = documentPath.split('/').slice(0, -1)
  for (const segment of target.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) return undefined
      segments.pop()
    } else segments.push(segment)
  }
  return segments.join('/')
}

interface PreviewProps {
  api: WorkspaceApi
  root: string
  file: WorkspaceFile
  onOpenFile(path: string): void
}

export function FilePreview({ api, root, file, onOpenFile }: PreviewProps): JSX.Element {
  if (file.kind === 'unsupported') {
    return <div className="workspace-empty">暂不支持此二进制文件，大小 {formatSize(file.size)}。</div>
  }
  if (file.kind === 'image') {
    return (
      <div className="workspace-image-preview">
        <img src={`data:${file.mime ?? 'application/octet-stream'};base64,${file.content}`} alt={file.name} />
      </div>
    )
  }
  if (file.kind === 'markdown') {
    return (
      <article className="markdown-preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children, ...props }) => (
              <a
                {...props}
                href={href}
                onClick={(event) => {
                  event.preventDefault()
                  if (!href) return
                  if (/^https?:\/\//i.test(href)) {
                    window.open(href, '_blank', 'noopener,noreferrer')
                    return
                  }
                  const target = resolveWorkspaceRelative(file.path, href.split('#')[0] ?? '')
                  if (target) onOpenFile(target)
                }}
              >
                {children}
              </a>
            ),
            img: ({ src, alt }) => <MarkdownImage api={api} root={root} documentPath={file.path} src={src} alt={alt} />,
          }}
        >
          {file.content}
        </ReactMarkdown>
        {file.truncated && <p className="workspace-message">仅预览前 2 MB。</p>}
      </article>
    )
  }
  return <CodePreview file={file} />
}

function CodePreview({ file }: { file: WorkspaceFile }): JSX.Element {
  const [highlighted, setHighlighted] = useState<{ path: string; html: string }>()

  useEffect(() => {
    let active = true
    setHighlighted(undefined)
    void highlightCode(file.content, file.path).then((html) => {
      if (active && html) setHighlighted({ path: file.path, html })
    })
    return () => { active = false }
  }, [file.path, file.content])

  const html = highlighted?.path === file.path ? highlighted.html : undefined
  return (
    <>
      {html ? (
        <div className="text-preview code-preview" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="text-preview">{file.content}</pre>
      )}
      {file.truncated && <p className="workspace-message">仅预览前 2 MB；超大文件自动保留纯文本。</p>}
    </>
  )
}

function MarkdownImage({ api, root, documentPath, src, alt }: {
  api: WorkspaceApi
  root: string
  documentPath: string
  src?: string
  alt?: string
}): JSX.Element {
  const [resolved, setResolved] = useState(src && /^(https?:|data:)/i.test(src) ? src : '')

  useEffect(() => {
    if (!src || /^(https?:|data:)/i.test(src)) return
    const relative = resolveWorkspaceRelative(documentPath, src)
    if (!relative) return
    let active = true
    void api.workspaceRead(root, relative).then((file) => {
      if (active && file.kind === 'image') setResolved(`data:${file.mime};base64,${file.content}`)
    }).catch(() => {})
    return () => { active = false }
  }, [api, root, documentPath, src])

  return resolved ? <img src={resolved} alt={alt ?? ''} /> : <span className="dim">图片不可用：{alt ?? src}</span>
}

function formatSize(size: number): string {
  return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`
}
