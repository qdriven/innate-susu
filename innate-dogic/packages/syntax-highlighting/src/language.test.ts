import { describe, expect, it } from 'vitest'
import { detectSyntaxLanguage } from './language.js'
import { highlightCode } from './highlight.js'

describe('detectSyntaxLanguage', () => {
  it('detects extensions, special filenames and dotenv files', () => {
    expect(detectSyntaxLanguage('src/App.tsx')).toBe('tsx')
    expect(detectSyntaxLanguage('Dockerfile')).toBe('dockerfile')
    expect(detectSyntaxLanguage('.env.production')).toBe('ini')
    expect(detectSyntaxLanguage('LICENSE')).toBe('plaintext')
  })
})

describe('highlightCode', () => {
  it('highlights TypeScript and escapes source HTML', async () => {
    const html = await highlightCode('const value = "<tag>"\n', 'example.ts')
    expect(html).toContain('shiki')
    expect(html).toContain('--shiki-dark')
    expect(html).toContain('&#x3C;tag>')
    expect(html).not.toContain('<tag>')
  })

  it('returns plain fallback for unknown or oversized content', async () => {
    expect(await highlightCode('plain text', 'LICENSE')).toBeUndefined()
    expect(await highlightCode('x'.repeat(256 * 1024 + 1), 'large.ts')).toBeUndefined()
  })
})
