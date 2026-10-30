import { describe, expect, it } from 'vitest'
import {
  mapDownloadItemState,
  MAX_DOWNLOAD_FILENAME,
  normalizeDownloadPercent,
  sanitizeDownloadFilename,
} from './download.js'

/** 构造含控制字符的测试字符串（避免在源码中嵌入字面控制字符）。 */
const ctrl = (codes: number[]): string => codes.map((code) => String.fromCharCode(code)).join('')

describe('sanitizeDownloadFilename（W5.5 恶意文件名净化）', () => {
  it('正常文件名原样保留', () => {
    expect(sanitizeDownloadFilename('report.pdf')).toBe('report.pdf')
    expect(sanitizeDownloadFilename('我的 文件 v2.zip')).toBe('我的 文件 v2.zip')
  })

  it('剥离路径分隔符（防止路径穿越）', () => {
    expect(sanitizeDownloadFilename('../../etc/passwd')).toBe('....etcpasswd')
    expect(sanitizeDownloadFilename('C:\\\\Windows\\\\system32\\\\evil.dll')).toBe('C:Windowssystem32evil.dll')
    expect(sanitizeDownloadFilename('/abs/path/file.txt')).toBe('abspathfile.txt')
  })

  it('剥离控制字符与不可打印字符', () => {
    expect(sanitizeDownloadFilename(`bad${ctrl([0, 1, 31, 127, 129])}name.txt`)).toBe('badname.txt')
  })

  it('Windows 保留设备名加后缀', () => {
    expect(sanitizeDownloadFilename('CON.txt')).toBe('CON_.txt')
    expect(sanitizeDownloadFilename('com1.exe')).toBe('com1_.exe')
    expect(sanitizeDownloadFilename('PRN')).toBe('PRN_')
    expect(sanitizeDownloadFilename('normal.exe')).toBe('normal.exe')
  })

  it('空白折叠、截断超长、空名兜底', () => {
    expect(sanitizeDownloadFilename('a   b')).toBe('a b')
    expect(sanitizeDownloadFilename(`${'x'.repeat(300)}.txt`).length).toBe(MAX_DOWNLOAD_FILENAME)
    expect(sanitizeDownloadFilename('   ')).toBe('download')
    expect(sanitizeDownloadFilename('')).toBe('download')
    expect(sanitizeDownloadFilename(ctrl([0, 7, 14]))).toBe('download')
  })
})

describe('mapDownloadItemState（终态映射）', () => {
  it('completed/cancelled/interrupted → 展示状态；progressing 防御性 failed', () => {
    expect(mapDownloadItemState('completed')).toBe('completed')
    expect(mapDownloadItemState('cancelled')).toBe('cancelled')
    expect(mapDownloadItemState('interrupted')).toBe('failed')
    expect(mapDownloadItemState('progressing')).toBe('failed')
  })
})

describe('normalizeDownloadPercent（进度归一）', () => {
  it('0–100 取整并夹紧', () => {
    expect(normalizeDownloadPercent(0)).toBe(0)
    expect(normalizeDownloadPercent(42.7)).toBe(43)
    expect(normalizeDownloadPercent(99.4)).toBe(99)
    expect(normalizeDownloadPercent(100)).toBe(100)
    expect(normalizeDownloadPercent(120)).toBe(100)
    expect(normalizeDownloadPercent(-5)).toBe(0)
    expect(normalizeDownloadPercent(Number.NaN)).toBe(0)
  })
})
