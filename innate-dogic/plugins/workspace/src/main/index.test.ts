import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { isPathInside, parseGitStatus, WorkspaceService } from './index.js'
import { resolveWorkspaceRelative } from '../renderer/FilePreview.js'
import { WorkspaceSnapshotStore, parseWorkspaceSnapshot } from './snapshot-store.js'

const execFileAsync = promisify(execFile)

async function git(root: string, args: string[]): Promise<void> {
  await execFileAsync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true })
}

describe('workspace path boundaries', () => {
  it('accepts descendants and rejects siblings', () => {
    const root = path.resolve('/workspace/project')
    expect(isPathInside(root, path.resolve(root, 'src/index.ts'))).toBe(true)
    expect(isPathInside(root, path.resolve(root, '../secrets'))).toBe(false)
  })

  it('resolves markdown resources without escaping the document root', () => {
    expect(resolveWorkspaceRelative('docs/guide/readme.md', '../images/a.png')).toBe('docs/images/a.png')
    expect(resolveWorkspaceRelative('readme.md', '../../secrets')).toBeUndefined()
    expect(resolveWorkspaceRelative('docs/readme.md', 'https://example.com/a.png')).toBeUndefined()
  })
})

describe('parseGitStatus', () => {
  it('parses modified and untracked paths with spaces', () => {
    expect(parseGitStatus(' M src/a file.ts\0?? docs/new.md\0')).toEqual([
      { path: 'src/a file.ts', index: ' ', workingTree: 'M' },
      { path: 'docs/new.md', index: '?', workingTree: '?' },
    ])
  })

  it('parses rename previous path', () => {
    expect(parseGitStatus('R  new.ts\0old.ts\0')).toEqual([
      { path: 'new.ts', previousPath: 'old.ts', index: 'R', workingTree: ' ' },
    ])
  })
})

describe('WorkspaceService Git integration', () => {
  it('reads a real tracked-file modification and its unstaged diff', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-workspace-git-'))
    try {
      await git(root, ['init'])
      await git(root, ['config', 'user.name', 'Dogic Test'])
      await git(root, ['config', 'user.email', 'dogic-test@example.invalid'])
      await writeFile(path.join(root, 'tracked.md'), 'before\n', 'utf8')
      await git(root, ['add', 'tracked.md'])
      await git(root, ['commit', '-m', 'initial'])
      await writeFile(path.join(root, 'tracked.md'), 'after\n', 'utf8')

      const service = new WorkspaceService(path.join(root, 'workspace-state.json'))
      const status = await service.gitStatus(root)
      const diff = await service.gitDiff(root, 'tracked.md')

      expect(status.isRepo).toBe(true)
      expect(status.changes).toContainEqual({ path: 'tracked.md', index: ' ', workingTree: 'M' })
      expect(diff.staged).toBe('')
      expect(diff.unstaged).toContain('-before')
      expect(diff.unstaged).toContain('+after')
      expect(diff.truncated).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('WorkspaceService context guard (W3.2)', () => {
  it('setRoot then getRoot returns a WorkspaceContext with workspaceId = canonical root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-ctx-'))
    try {
      const service = new WorkspaceService(path.join(root, 'state.json'))
      const ctx = await service.setRoot(root, 'picker')
      expect(ctx.path).toBe(root)
      expect(ctx.workspaceId).toBe(root)
      expect(ctx.name).toBe(path.basename(root))

      const loaded = await service.getRoot()
      expect(loaded).not.toBeNull()
      expect(loaded?.workspaceId).toBe(root)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects list/read/gitStatus on a stale root after setRoot', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-ctx-'))
    const other = await mkdtemp(path.join(tmpdir(), 'dogic-other-'))
    try {
      await writeFile(path.join(root, 'a.md'), 'hello\n', 'utf8')
      await writeFile(path.join(other, 'b.md'), 'world\n', 'utf8')
      const service = new WorkspaceService(path.join(root, 'state.json'))
      await service.setRoot(root, 'picker')

      // 旧 root（未选定）必须被上下文守卫拒绝
      await expect(service.list(other)).rejects.toThrow('上下文不匹配')
      await expect(service.read(other, 'b.md')).rejects.toThrow('上下文不匹配')
      await expect(service.gitStatus(other)).rejects.toThrow('上下文不匹配')

      // 当前 root 仍可正常调用
      const entries = await service.list(root)
      expect(entries.map((e) => e.name)).toContain('a.md')
    } finally {
      await rm(root, { recursive: true, force: true })
      await rm(other, { recursive: true, force: true })
    }
  })

  it('accepts the same canonical root via a non-canonical path form', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-ctx-'))
    try {
      await writeFile(path.join(root, 'a.md'), 'hello\n', 'utf8')
      const service = new WorkspaceService(path.join(root, 'state.json'))
      await service.setRoot(root, 'picker')
      // 经 .. 规范化后仍指向同一 canonical root → 守卫放行
      const viaParent = path.join(root, '..', path.basename(root))
      const entries = await service.list(viaParent)
      expect(entries.map((e) => e.name)).toContain('a.md')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('does not guard when setRoot was never called (direct-service compatibility)', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-ctx-'))
    try {
      await writeFile(path.join(root, 'a.md'), 'hello\n', 'utf8')
      const service = new WorkspaceService(path.join(root, 'state.json'))
      // 未 setRoot → currentRoot 未设 → assertContext no-op，直接调用仍通过
      const entries = await service.list(root)
      expect(entries.map((e) => e.name)).toContain('a.md')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('WorkspaceSnapshotStore (W3.6)', () => {
  it('round-trips a versioned snapshot with atomic write and no leftover tmp file', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-snap-'))
    try {
      const file = path.join(root, 'state.json')
      const store = new WorkspaceSnapshotStore(file)
      await store.save({ version: 1, root: '/some/workspace' })
      const load = await store.load()
      expect(load.ok).toBe(true)
      if (load.ok) expect(load.snapshot).toEqual({ version: 1, root: '/some/workspace' })

      const dirEntries = await readdir(root)
      expect(dirEntries).toEqual(['state.json']) // 无 .tmp 残留
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('returns missing for a nonexistent file', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-snap-'))
    try {
      const store = new WorkspaceSnapshotStore(path.join(root, 'nope.json'))
      const load = await store.load()
      expect(load).toEqual({ ok: false, reason: 'missing' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('returns corrupt for malformed JSON', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-snap-'))
    try {
      const file = path.join(root, 'state.json')
      await writeFile(file, '{not json', 'utf8')
      const store = new WorkspaceSnapshotStore(file)
      const load = await store.load()
      expect(load.ok).toBe(false)
      if (!load.ok) expect(load.reason).toBe('corrupt')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('returns version for a future-version snapshot', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-snap-'))
    try {
      const file = path.join(root, 'state.json')
      await writeFile(file, JSON.stringify({ version: 2, root: '/x' }), 'utf8')
      const store = new WorkspaceSnapshotStore(file)
      const load = await store.load()
      expect(load.ok).toBe(false)
      if (!load.ok) expect(load.reason).toBe('version')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('accepts legacy {root} without a version field', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-snap-'))
    try {
      const file = path.join(root, 'state.json')
      await writeFile(file, JSON.stringify({ root: '/legacy' }), 'utf8')
      const store = new WorkspaceSnapshotStore(file)
      const load = await store.load()
      expect(load.ok).toBe(true)
      if (load.ok) expect(load.snapshot).toEqual({ version: 1, root: '/legacy' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('parseWorkspaceSnapshot rejects non-objects and future versions', () => {
    expect(parseWorkspaceSnapshot(null)).toBeNull()
    expect(parseWorkspaceSnapshot('string')).toBeNull()
    expect(parseWorkspaceSnapshot(42)).toBeNull()
    expect(parseWorkspaceSnapshot({ version: 99, root: '/x' })).toBeNull()
    expect(parseWorkspaceSnapshot({ version: 1 })).toEqual({ version: 1 })
    expect(parseWorkspaceSnapshot({ root: '/legacy' })).toEqual({ version: 1, root: '/legacy' })
  })
})

describe('WorkspaceService path safety', () => {
  it('rejects empty, absolute, NUL and traversal relative paths', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-path-'))
    try {
      await writeFile(path.join(root, 'a.md'), 'hello\n', 'utf8')
      const service = new WorkspaceService(path.join(root, 'state.json'))
      await expect(service.read(root, '')).rejects.toThrow('非空相对路径')
      await expect(service.read(root, path.join(root, 'a.md'))).rejects.toThrow('非空相对路径')
      await expect(service.read(root, '..\0evil')).rejects.toThrow()
      await expect(service.read(root, '..\\..\\secrets\\x')).rejects.toThrow()
      await expect(service.read(root, '../../secrets/x')).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects reading a directory as a file', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-path-'))
    try {
      await mkdir(path.join(root, 'subdir'), { recursive: true })
      const service = new WorkspaceService(path.join(root, 'state.json'))
      await expect(service.read(root, 'subdir')).rejects.toThrow('只能预览普通文件')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects a nonexistent root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-path-'))
    try {
      const missing = path.join(root, 'does-not-exist')
      const service = new WorkspaceService(path.join(root, 'state.json'))
      await expect(service.list(missing)).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects symlink escape outside the workspace when supported', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-path-'))
    const outside = await mkdtemp(path.join(tmpdir(), 'dogic-outside-'))
    try {
      await writeFile(path.join(outside, 'secret.md'), 'top secret\n', 'utf8')
      let linked = false
      try {
        await symlink(outside, path.join(root, 'escape'), 'junction')
        linked = true
      } catch {
        // Windows 可能需要特权；无法创建则跳过本断言（ containment 逻辑由 isPathInside 单元测试覆盖）
      }
      if (!linked) return
      const service = new WorkspaceService(path.join(root, 'state.json'))
      await expect(service.read(root, 'escape/secret.md')).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
      await rm(outside, { recursive: true, force: true })
    }
  })
})

describe('WorkspaceService size limits', () => {
  it('truncates text files over 2 MB and flags truncated', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-size-'))
    try {
      const big = 'x'.repeat(3 * 1024 * 1024)
      await writeFile(path.join(root, 'big.txt'), big, 'utf8')
      const service = new WorkspaceService(path.join(root, 'state.json'))
      const file = await service.read(root, 'big.txt')
      expect(file.truncated).toBe(true)
      expect(file.content.length).toBeLessThanOrEqual(2 * 1024 * 1024)
      expect(file.size).toBe(big.length)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects image files over 5 MB', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-size-'))
    try {
      const big = Buffer.alloc(6 * 1024 * 1024, 0)
      await writeFile(path.join(root, 'big.png'), big)
      const service = new WorkspaceService(path.join(root, 'state.json'))
      await expect(service.read(root, 'big.png')).rejects.toThrow('5 MB')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('truncates a diff over 500K chars and flags truncated', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-size-'))
    try {
      await git(root, ['init'])
      await git(root, ['config', 'user.name', 'Dogic Test'])
      await git(root, ['config', 'user.email', 'dogic-test@example.invalid'])
      const filler = 'a'.repeat(600_000)
      await writeFile(path.join(root, 'big.txt'), filler, 'utf8')
      await git(root, ['add', 'big.txt'])
      await git(root, ['commit', '-m', 'initial'])
      await writeFile(path.join(root, 'big.txt'), 'b'.repeat(600_000), 'utf8')

      const service = new WorkspaceService(path.join(root, 'state.json'))
      const diff = await service.gitDiff(root, 'big.txt')
      expect(diff.truncated).toBe(true)
      expect(diff.unstaged.length).toBeLessThan(600_000)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('WorkspaceService Git edge cases', () => {
  it('reports isRepo false for a non-repository directory', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-git-'))
    try {
      const service = new WorkspaceService(path.join(root, 'state.json'))
      const status = await service.gitStatus(root)
      expect(status.isRepo).toBe(false)
      expect(status.changes).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('reports a detached HEAD branch label', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-git-'))
    try {
      await git(root, ['init'])
      await git(root, ['config', 'user.name', 'Dogic Test'])
      await git(root, ['config', 'user.email', 'dogic-test@example.invalid'])
      await writeFile(path.join(root, 'a.md'), 'x\n', 'utf8')
      await git(root, ['add', 'a.md'])
      await git(root, ['commit', '-m', 'initial'])
      await git(root, ['checkout', '--detach'])
      const service = new WorkspaceService(path.join(root, 'state.json'))
      const status = await service.gitStatus(root)
      expect(status.isRepo).toBe(true)
      expect(status.branch).toMatch(/^detached @ /)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('parses rename and copy status records', () => {
    const rename = parseGitStatus('R  new.ts\0old.ts\0')
    expect(rename).toEqual([{ path: 'new.ts', previousPath: 'old.ts', index: 'R', workingTree: ' ' }])
    const copy = parseGitStatus('C  copied.ts\0original.ts\0')
    expect(copy).toEqual([{ path: 'copied.ts', previousPath: 'original.ts', index: 'C', workingTree: ' ' }])
  })

  it('caps status changes at 500 entries', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-git-'))
    try {
      await git(root, ['init'])
      await git(root, ['config', 'user.name', 'Dogic Test'])
      await git(root, ['config', 'user.email', 'dogic-test@example.invalid'])
      // 510 个未跟踪文件 → status 切片到 500
      for (let i = 0; i < 510; i += 1) {
        await writeFile(path.join(root, `f${i}.txt`), 'x\n', 'utf8')
      }
      const service = new WorkspaceService(path.join(root, 'state.json'))
      const status = await service.gitStatus(root)
      expect(status.isRepo).toBe(true)
      expect(status.changes.length).toBe(500)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('does not treat a leading-dash path as a git flag (param injection)', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dogic-git-'))
    try {
      await git(root, ['init'])
      await git(root, ['config', 'user.name', 'Dogic Test'])
      await git(root, ['config', 'user.email', 'dogic-test@example.invalid'])
      // 文件名以 -- 开头：gitDiff 用 `--` 分隔符 + resolved.relative，不应被当作 flag
      await writeFile(path.join(root, '--weird.md'), 'before\n', 'utf8')
      await git(root, ['add', '-A'])
      await git(root, ['commit', '-m', 'initial'])
      await writeFile(path.join(root, '--weird.md'), 'after\n', 'utf8')
      const service = new WorkspaceService(path.join(root, 'state.json'))
      const diff = await service.gitDiff(root, '--weird.md')
      expect(diff.unstaged).toContain('-before')
      expect(diff.unstaged).toContain('+after')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

