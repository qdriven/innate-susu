import { createHighlighterCore } from 'shiki/core'
import type { HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { detectSyntaxLanguage } from './language.js'

export const MAX_HIGHLIGHT_CHARS = 256 * 1024

let highlighterPromise: Promise<HighlighterCore> | undefined
const languagePromises = new Map<string, Promise<string | undefined>>()

function loadHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import('shiki/themes/light-plus.mjs'), import('shiki/themes/dark-plus.mjs')],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }).catch((error: unknown) => {
    highlighterPromise = undefined
    throw error
  })
  return highlighterPromise
}

function loadLanguage(filePath: string): Promise<string | undefined> {
  const key = detectSyntaxLanguage(filePath)
  if (key === 'plaintext') return Promise.resolve(undefined)
  const cached = languagePromises.get(key)
  if (cached) return cached

  const promise = (async () => {
    const { bundledLanguagesInfo } = await import('shiki/langs')
    const info = bundledLanguagesInfo.find((language) => language.id === key || language.aliases?.includes(key))
    if (!info) return undefined
    const [highlighter, { default: grammars }] = await Promise.all([loadHighlighter(), info.import()])
    await highlighter.loadLanguage(...grammars)
    return info.id
  })().catch((error: unknown) => {
    languagePromises.delete(key)
    throw error
  })
  languagePromises.set(key, promise)
  return promise
}

/**
 * 生成同时携带 Light+/Dark+ 颜色的安全 HTML；Shiki 会转义源码。
 * 未知语言、超大文件或加载失败由调用方保留纯文本，不影响文件打开。
 */
export async function highlightCode(code: string, filePath: string): Promise<string | undefined> {
  if (!code || code.length > MAX_HIGHLIGHT_CHARS) return undefined
  try {
    const language = await loadLanguage(filePath)
    if (!language) return undefined
    const highlighter = await loadHighlighter()
    return highlighter.codeToHtml(code, {
      lang: language,
      themes: { light: 'light-plus', dark: 'dark-plus' },
      defaultColor: 'light',
    })
  } catch (error) {
    console.warn('[syntax-highlighting] 高亮不可用，保留纯文本预览', error)
    return undefined
  }
}
