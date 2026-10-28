import { describe, expect, it } from 'vitest'
import { redactLaunchSecrets } from './redact'

describe('redactLaunchSecrets', () => {
  it('redacts dsh launch token', () => {
    expect(redactLaunchSecrets('dsh web: http://127.0.0.1:43129/?token=abc123')).toBe(
      'dsh web: http://127.0.0.1:43129/?token=[redacted]',
    )
  })

  it('redacts magpie web key', () => {
    expect(redactLaunchSecrets('magpie web on http://127.0.0.1:3430/?k=secret')).toBe(
      'magpie web on http://127.0.0.1:3430/?k=[redacted]',
    )
  })

  it('redacts key= parameter in any position', () => {
    expect(redactLaunchSecrets('http://127.0.0.1:1/a?x=1&key=zzz&y=2')).toBe(
      'http://127.0.0.1:1/a?x=1&key=[redacted]&y=2',
    )
  })

  it('keeps non-secret params and order intact', () => {
    expect(redactLaunchSecrets('http://h/p?mode=web&token=t1&port=9&k=k1')).toBe(
      'http://h/p?mode=web&token=[redacted]&port=9&k=[redacted]',
    )
  })

  it('redacts every occurrence in a line', () => {
    expect(redactLaunchSecrets('a ?token=1 b ?token=2')).toBe('a ?token=[redacted] b ?token=[redacted]')
  })

  it('leaves URLs without secrets untouched', () => {
    const line = 'GET http://127.0.0.1:3425/api/hello -> 200 mode=web monkey=1'
    expect(redactLaunchSecrets(line)).toBe(line)
  })

  it('leaves plain error text untouched', () => {
    const line = '[stderr] Error: EBUSY: resource busy D:/x/y.lock'
    expect(redactLaunchSecrets(line)).toBe(line)
  })

  it('keeps empty parameter values as-is', () => {
    expect(redactLaunchSecrets('http://h/p?token=&x=1')).toBe('http://h/p?token=&x=1')
  })

  it('is case-insensitive on parameter names', () => {
    expect(redactLaunchSecrets('http://h/p?Token=AbC')).toBe('http://h/p?Token=[redacted]')
  })
})
