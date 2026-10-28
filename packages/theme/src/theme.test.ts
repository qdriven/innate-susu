import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  PRODUCT_TOKENS,
  SHARED_TOKENS,
  SHARED_TOKEN_VALUES,
} from "./theme"

const here = dirname(fileURLToPath(import.meta.url))
const read = (name: string): string =>
  readFileSync(join(here, name), "utf8")

const tokensCss = read("tokens.css")
const indexCss = read("index.css")
const shellCss = read("shell.css")

/** 取出某个顶层块的内容，例如 `:root { … }` 或 `.dark { … }`。 */
function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)
  expect(start, `找不到 ${selector} 块`).toBeGreaterThan(-1)
  const end = source.indexOf("}", start)
  return source.slice(start, end)
}

/** 收集块里声明的自定义属性名。 */
function declaredTokens(source: string, selector: string): Set<string> {
  const body = block(source, selector)
  const names = new Set<string>()
  for (const match of body.matchAll(/--([a-z0-9-]+)\s*:/g)) {
    names.add(match[1]!)
  }
  return names
}

/** 收集块里「名字 → 值」的映射。 */
function tokenValues(source: string, selector: string): Map<string, string> {
  const body = block(source, selector)
  const values = new Map<string, string>()
  for (const match of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    values.set(match[1]!, match[2]!.trim())
  }
  return values
}

describe("产品 token 层", () => {
  it("先导入 @innate/ui，再声明本层 token", () => {
    const uiImport = tokensCss.indexOf(`@import "@innate/ui/tokens.css";`)
    expect(uiImport).toBeGreaterThan(-1)
    // 基础仓必须是最早的 import：本层随后声明的 :root/.dark 靠源码顺序覆盖它。
    const otherImports = [...tokensCss.matchAll(/@import\s+"([^"]+)"/g)]
    expect(otherImports[0]?.[1]).toBe("@innate/ui/tokens.css")
  })

  it("入口先引 token 层再引壳 chrome 层", () => {
    const tokenAt = indexCss.indexOf(`@import "./tokens.css";`)
    const shellAt = indexCss.indexOf(`@import "./shell.css";`)
    expect(tokenAt).toBeGreaterThan(-1)
    expect(shellAt).toBeGreaterThan(-1)
    expect(tokenAt).toBeLessThan(shellAt)
  })

  it("每个产品扩展 token 在 :root 与 .dark 中都成对声明", () => {
    const root = declaredTokens(tokensCss, ":root")
    const dark = declaredTokens(tokensCss, ".dark")
    const missingInRoot = PRODUCT_TOKENS.filter((t) => !root.has(t))
    const missingInDark = PRODUCT_TOKENS.filter((t) => !dark.has(t))
    expect({ missingInRoot, missingInDark }).toEqual({
      missingInRoot: [],
      missingInDark: [],
    })
  })

  it("共享语义 token 的亮色值与快照一致", () => {
    const root = tokenValues(tokensCss, ":root")
    for (const name of SHARED_TOKENS) {
      expect(root.get(name), `:root --${name}`).toBe(SHARED_TOKEN_VALUES[name])
    }
  })

  it("暗色下共享语义 token 也成对声明", () => {
    const dark = declaredTokens(tokensCss, ".dark")
    const missing = SHARED_TOKENS.filter(
      (name) => name !== "radius" && !dark.has(name),
    )
    expect(missing).toEqual([])
  })

  it("明暗只走 .dark class，不写 prefers-color-scheme 媒体查询", () => {
    for (const source of [tokensCss, shellCss, indexCss]) {
      expect(source).not.toContain("prefers-color-scheme")
    }
  })

  it("壳 chrome 层不写死颜色值", () => {
    const hexInShell = shellCss.match(/#[0-9a-f]{3,8}\b/gi) ?? []
    // 仅允许滚动条颜色回退值（消费方未定义 token 时的兜底），沿用 orca 原值。
    const allowed = new Set(["#737373", "#171717"])
    const unexpected = hexInShell.filter((h) => !allowed.has(h.toLowerCase()))
    expect(unexpected).toEqual([])
  })

  it("壳 chrome 层的固定尺寸与 orca 一致", () => {
    expect(shellCss).toMatch(/\.titlebar\s*\{[^}]*height:\s*36px/)
    expect(shellCss).toMatch(/\.window-controls-btn\s*\{[^}]*width:\s*46px/)
    expect(shellCss).toMatch(
      /\.titlebar-traffic-light-pad\s*\{[^}]*width:\s*calc\(80px/,
    )
  })
})
