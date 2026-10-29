import { describe, expect, it } from 'vitest'
import { globalNodeModulesFromCommand, isDirectDshEntry, parseDshDefaultModel } from './dsh'

describe('isDirectDshEntry', () => {
  it('rejects the extensionless npm shell shim on Windows', () => {
    expect(isDirectDshEntry('C:\\npm-global\\dsh', 'win32')).toBe(false)
  })

  it('rejects Windows command shims', () => {
    expect(isDirectDshEntry('C:\\npm-global\\dsh.cmd', 'win32')).toBe(false)
    expect(isDirectDshEntry('C:\\npm-global\\dsh.ps1', 'win32')).toBe(false)
  })

  it('accepts a JavaScript package entry on Windows', () => {
    expect(isDirectDshEntry('C:\\npm-global\\node_modules\\dsh\\lib\\bin.js', 'win32')).toBe(true)
  })

  it('accepts the extensionless executable on Unix', () => {
    expect(isDirectDshEntry('/usr/local/bin/dsh', 'linux')).toBe(true)
  })
})

describe('globalNodeModulesFromCommand', () => {
  it('derives the global package root beside a Windows npm shim', () => {
    expect(globalNodeModulesFromCommand('C:\\npm-global\\dsh.cmd', 'win32')).toBe(
      'C:\\npm-global\\node_modules',
    )
  })

  it('does not infer a global root from a Unix executable', () => {
    expect(globalNodeModulesFromCommand('/usr/local/bin/dsh', 'linux')).toBeUndefined()
  })
})

describe('parseDshDefaultModel', () => {
  it('reads the model from the current magpie profile patch format', () => {
    const raw = [
      '- id: ui-settings-general',
      '  config:',
      '    welcomeNoticeVersion: 1',
      '- id: agent-default-model # magpie',
      '  config:',
      '    provider: magpie-anthropic',
      '    model: "zcode/GLM-5.3"',
      '    reasoningEffort: "high"',
      '- id: llm-pi-ai # magpie',
      '  config: {}',
    ].join('\n')
    expect(parseDshDefaultModel(raw)).toBe('zcode/GLM-5.3')
  })

  it('does not read models belonging to another plugin block', () => {
    expect(parseDshDefaultModel('- id: llm-pi-ai\n  config:\n    model: other/model\n')).toBeUndefined()
  })
})

describe('pnpmGlobalRootFromShim', () => {
  it('derives the pnpm global node_modules root from the embedded cmd-shim-target', async () => {
    const { pnpmGlobalRootFromShim } = await import('./dsh.js')
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'dsh-shim-'))
    const shim = join(dir, 'dsh')
    const target = join(dir, 'global', 'v11', 'abc', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    writeFileSync(shim, `#!/bin/sh\n# cmd-shim-target=${target}\nexec node "$target"\n`)
    expect(await pnpmGlobalRootFromShim(shim)).toBe(join(dir, 'global', 'v11', 'abc', 'node_modules'))
  })

  it('parses real pnpm shims whose embedded target uses forward slashes', async () => {
    const { pnpmGlobalRootFromShim } = await import('./dsh.js')
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'dsh-shim-'))
    const shim = join(dir, 'dsh')
    writeFileSync(shim, '# cmd-shim-target=D:/pnpm/global/v11/abc/node_modules/@deepseek-ai/dsh/lib/bin.js\n')
    expect(await pnpmGlobalRootFromShim(shim)).toBe('D:/pnpm/global/v11/abc/node_modules')
  })

  it('returns undefined when the shim has no target marker', async () => {
    const { pnpmGlobalRootFromShim } = await import('./dsh.js')
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'dsh-shim-'))
    const shim = join(dir, 'dsh')
    writeFileSync(shim, '#!/bin/sh\nexec node something\n')
    expect(await pnpmGlobalRootFromShim(shim)).toBeUndefined()
  })
})

describe('resolveDshEntry env override', () => {
  it('uses INNATE_DSH_ENTRY when it points to a readable file', async () => {
    const { resolveDshEntry } = await import('./dsh.js')
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'dsh-env-'))
    const entry = join(dir, 'bin.js')
    writeFileSync(entry, '// entry')
    process.env.INNATE_DSH_ENTRY = entry
    try {
      const resolved = await resolveDshEntry()
      expect(resolved.entry).toBe(entry)
      expect(resolved.via).toContain('env')
    } finally {
      delete process.env.INNATE_DSH_ENTRY
    }
  })

  it('resolves a symlinked entry to its real path (pnpm 全局符号链接布局)', async () => {
    const { resolveDshEntry } = await import('./dsh.js')
    const { mkdtempSync, writeFileSync, symlinkSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'dsh-link-'))
    const target = join(dir, 'bin.js')
    const link = join(dir, 'entry.js')
    writeFileSync(target, '// entry')
    try {
      symlinkSync(target, link, 'file')
    } catch {
      return // 无符号链接权限的平台跳过
    }
    process.env.INNATE_DSH_ENTRY = link
    try {
      const resolved = await resolveDshEntry()
      expect(resolved.entry).toBe(target)
    } finally {
      delete process.env.INNATE_DSH_ENTRY
    }
  })
})
