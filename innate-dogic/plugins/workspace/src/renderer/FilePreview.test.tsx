import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FilePreview, resolveWorkspaceRelative } from './FilePreview'
import type { WorkspaceApi, WorkspaceFile } from '../shared/index'

const api = {} as WorkspaceApi

function textFile(overrides?: Partial<WorkspaceFile>): WorkspaceFile {
  return { path: '/repo/a.txt', name: 'a.txt', kind: 'text', content: 'hello', size: 5, truncated: false, ...overrides }
}

describe('W3.5 FilePreview（链接/图片安全边界）', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('resolveWorkspaceRelative（相对链接解析）', () => {
    it('相对路径拼接、. 与 .. 归一化', () => {
      expect(resolveWorkspaceRelative('docs/guide/intro.md', 'next.md')).toBe('docs/guide/next.md')
      expect(resolveWorkspaceRelative('docs/guide/intro.md', './x.md')).toBe('docs/guide/x.md')
      expect(resolveWorkspaceRelative('docs/guide/intro.md', '../up.md')).toBe('docs/up.md')
      expect(resolveWorkspaceRelative('docs/guide/intro.md', 'sub/../a.md')).toBe('docs/guide/a.md')
    })

    it('逃逸根目录 / 绝对路径 / 带 scheme / 空 → undefined', () => {
      expect(resolveWorkspaceRelative('a.md', '../../../escape.md')).toBeUndefined()
      expect(resolveWorkspaceRelative('a.md', '/abs.md')).toBeUndefined()
      expect(resolveWorkspaceRelative('a.md', 'http://x')).toBeUndefined()
      expect(resolveWorkspaceRelative('a.md', 'javascript:alert(1)')).toBeUndefined()
      expect(resolveWorkspaceRelative('a.md', '')).toBeUndefined()
    })
  })

  it('Markdown 链接：javascript: 被 schema 层拒绝（href 置空），点击不触发 open/onOpenFile', async () => {
    const onOpenFile = vi.fn()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const md = textFile({
      path: 'docs/intro.md',
      name: 'intro.md',
      kind: 'markdown',
      content: '[bad](javascript:alert(1)) [good](sub/page.md)',
    })
    render(<FilePreview api={api} root="/repo" file={md} onOpenFile={onOpenFile} />)
    const bad = await screen.findByText('bad')
    // 第一层防线：react-markdown 默认 schema 拒绝 javascript: scheme，href 置空
    expect(bad.closest('a')?.getAttribute('href')).toBe('')
    fireEvent.click(bad)
    expect(onOpenFile).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('Markdown 相对链接：点击解析为相对路径并回调 onOpenFile', async () => {
    const onOpenFile = vi.fn()
    const md = textFile({
      path: 'docs/guide/intro.md',
      name: 'intro.md',
      kind: 'markdown',
      content: '[page](sub/page.md)',
    })
    render(<FilePreview api={api} root="/repo" file={md} onOpenFile={onOpenFile} />)
    const page = await screen.findByText('page')
    fireEvent.click(page)
    expect(onOpenFile).toHaveBeenCalledWith('docs/guide/sub/page.md')
  })

  it('Markdown 图片：相对 src 经 workspaceRead 解析为 data: 内联', async () => {
    const workspaceRead = vi.fn(async () => ({
      path: '/repo/docs/pic.png', name: 'pic.png', kind: 'image',
      content: 'AAA', mime: 'image/png', size: 3, truncated: false,
    }))
    const apiWithRead = { ...api, workspaceRead } as unknown as WorkspaceApi
    const md = textFile({
      path: '/repo/docs/intro.md',
      name: 'intro.md',
      kind: 'markdown',
      content: '![pic](pic.png)',
    })
    render(<FilePreview api={apiWithRead} root="/repo" file={md} onOpenFile={() => {}} />)
    const img = await screen.findByAltText('pic')
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAA')
  })

  it('图片文件：直接内联 data: URL', () => {
    const img = textFile({ path: '/repo/a.png', name: 'a.png', kind: 'image', content: 'BB', mime: 'image/gif', size: 2 })
    const { container } = render(<FilePreview api={api} root="/repo" file={img} onOpenFile={() => {}} />)
    const node = container.querySelector('img')
    expect(node?.getAttribute('src')).toBe('data:image/gif;base64,BB')
  })

  it('不支持的二进制：显式提示大小，不渲染内容', () => {
    const bin = textFile({ path: '/repo/a.bin', name: 'a.bin', kind: 'unsupported', content: '', size: 2048 })
    render(<FilePreview api={api} root="/repo" file={bin} onOpenFile={() => {}} />)
    expect(screen.getByText(/暂不支持此二进制文件/)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('截断文本：跳过语法高亮，保留纯文本', async () => {
    const big = textFile({ path: '/repo/big.txt', name: 'big.txt', content: 'partial', size: 3_000_000, truncated: true })
    render(<FilePreview api={api} root="/repo" file={big} onOpenFile={() => {}} />)
    await waitFor(() => expect(screen.getByText('partial')).toBeTruthy())
    expect(screen.getByText(/超大文件自动保留纯文本/)).toBeTruthy()
  })
})
