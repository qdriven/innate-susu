import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { isPathInside, parseGitStatus, WorkspaceService } from './index.js'
import { resolveWorkspaceRelative } from '../renderer/FilePreview.js'

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
