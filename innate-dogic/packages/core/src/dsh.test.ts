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
