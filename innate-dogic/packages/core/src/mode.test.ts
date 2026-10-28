import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readMode, writeMode } from './mode'

function tmp(): string {
  return mkdtempSync(path.join(tmpdir(), 'dogic-mode-'))
}

describe('mode 存取', () => {
  it('未设置时返回 null', () => {
    const dir = tmp()
    expect(readMode(dir)).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })

  it('写入后可读回 simple / dev', () => {
    const dir = tmp()
    writeMode(dir, 'simple')
    expect(readMode(dir)).toBe('simple')
    writeMode(dir, 'dev')
    expect(readMode(dir)).toBe('dev')
    rmSync(dir, { recursive: true, force: true })
  })

  it('坏 JSON / 非法值容错为 null', () => {
    const dir = tmp()
    writeFileSync(path.join(dir, 'mode.json'), '{oops')
    expect(readMode(dir)).toBeNull()
    writeFileSync(path.join(dir, 'mode.json'), '{"mode":"admin"}')
    expect(readMode(dir)).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })
})
