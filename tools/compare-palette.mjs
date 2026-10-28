#!/usr/bin/env node
/**
 * 中性色对照：orca ↔ `@innate/ui`。
 *
 * 回答一个具体问题：产品层把 orca 的中性色冻结在 `packages/theme/src/tokens.css`，
 * 这套值和 `@innate/ui` 基础 `:root` / `.dark` 到底差在哪、差多少。
 *
 * 用法：
 *   node tools/compare-palette.mjs \
 *     --orca <orca 仓路径> \
 *     --fe   <innate-fe 基础仓路径>
 *
 * 默认路径按仓库惯例推断，可用 `--orca` / `--fe` 覆盖。脚本只读，不写盘。
 * 退出码 0 = 没有「结构性差异」（仅有 ≤3/255 的通道级舍入差）；1 = 有结构性差异。
 */
import { readFileSync } from "node:fs"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : fallback
}

/** 找到第一个存在的候选路径。 */
function firstExisting(candidates) {
  for (const c of candidates) if (c && existsSync(c)) return c
  return null
}

const orcaRoot = arg(
  "orca",
  firstExisting([
    "D:/innate-workspace/framework/innate-labs/references/orca",
    join(homedir(), "innate-workspace/framework/innate-labs/references/orca"),
  ]),
)
const feRoot = arg(
  "fe",
  firstExisting([
    "D:/innate-workspace/framework/innate-fe",
    join(homedir(), "innate-workspace/framework/innate-fe"),
  ]),
)

if (!orcaRoot || !feRoot) {
  console.error(
    "找不到 orca 参考仓或 innate-fe 基础仓。用 --orca <路径> --fe <路径> 显式指定。",
  )
  process.exit(2)
}

const orcaCssPath = join(orcaRoot, "src/renderer/src/assets/main.css")
const uiCssPath = join(feRoot, "packages/ui/src/tokens.css")
for (const p of [orcaCssPath, uiCssPath]) {
  if (!existsSync(p)) {
    console.error(`找不到 ${p}`)
    process.exit(2)
  }
}

/* ── CSS 解析 ─────────────────────────────────────────────────────────── */

/** 把 CSS 切成 { selector, body } 列表，跳过 @media / @supports 等 at-rule 块。 */
function parseBlocks(text) {
  const out = []
  const re = /([^{}]+)\{/g
  let m
  while ((m = re.exec(text))) {
    const sel = m[1].trim().replace(/\s+/g, " ")
    const start = re.lastIndex
    let depth = 1
    let i = start
    while (i < text.length && depth > 0) {
      const c = text[i]
      if (c === "{") depth++
      else if (c === "}") depth--
      i++
    }
    if (!sel.startsWith("@")) out.push({ sel, body: text.slice(start, i - 1) })
    re.lastIndex = i
  }
  return out
}

/** 取块内声明的自定义属性。 */
function vars(body) {
  const out = {}
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim()
  }
  return out
}

/* ── 颜色转换 ─────────────────────────────────────────────────────────── */

function hslToHex(value) {
  const m = value.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/)
  if (!m) return null
  const h = +m[1] / 360
  const s = +m[2] / 100
  const l = +m[3] / 100
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const to = (v) =>
    Math.round(Math.min(Math.max(v, 0), 1) * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${to(f(h + 1 / 3))}${to(f(h))}${to(f(h - 1 / 3))}`
}

function oklchToHex(value) {
  const m = value.match(
    /oklch\(\s*([\d.]+)(?:\s+([\d.]+)(?:\s+([\d.]+))?)?\s*(?:\/\s*([\d.]+%?)\s*)?\)/,
  )
  if (!m) return null
  const L = +m[1]
  const C = m[2] ? +m[2] : 0
  const H = m[3] ? +m[3] : 0
  const hr = (H * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const LL = l_ ** 3
  const MM = m_ ** 3
  const SS = s_ ** 3
  const R = 4.0767416621 * LL - 3.3077115913 * MM + 0.2309699292 * SS
  const G = -1.2684380046 * LL + 2.6097574011 * MM - 0.3413193965 * SS
  const B = -0.0041960863 * LL - 0.7034186147 * MM + 1.707614701 * SS
  const gamma = (v) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055
  const to = (v) =>
    Math.round(Math.min(Math.max(gamma(v), 0), 1) * 255)
      .toString(16)
      .padStart(2, "0")
  const hex = `#${to(R)}${to(G)}${to(B)}`
  if (m[4]) {
    const alpha = m[4].endsWith("%") ? +m[4].slice(0, -1) / 100 : +m[4]
    return `rgba(${parseInt(to(R), 16)},${parseInt(to(G), 16)},${parseInt(to(B), 16)}/${alpha})`
  }
  return hex
}

/** `#fff` → `#ffffff`。 */
function expandHex(hex) {
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex
}

/**
 * 归一化成可比较的形式：
 *   - hex → 6 位小写 hex
 *   - hsl()/oklch() → hex（带 alpha 的转成 rgba 记法）
 *   - rgb(r g b / a) → rgba 记法
 *   - 其余（字体栈、长度、var() 引用）→ 原样返回，调用方按「非颜色」跳过
 */
function normalize(value) {
  if (value.startsWith("#")) return expandHex(value.toLowerCase())
  if (value.startsWith("hsl")) return hslToHex(value)
  if (value.startsWith("oklch")) return oklchToHex(value)
  const m = value.match(
    /^rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/,
  )
  if (m) {
    const alpha = m[4]
      ? m[4].endsWith("%")
        ? +m[4].slice(0, -1) / 100
        : +m[4]
      : 1
    return `rgba(${m[1]},${m[2]},${m[3]}/${alpha})`
  }
  return value
}

/** 判断归一化后的值是不是可比较的颜色。 */
const isColor = (v) => /^#[0-9a-f]{6}$/.test(v) || /^rgba\(/.test(v)

/** 不参与颜色对照的 token（字体栈、长度、图表色等另行处理）。 */
const NON_COLOR = /^(font-|radius$|chart-|app-font-family$)/

/* ── 对照 ─────────────────────────────────────────────────────────────── */

const orca = parseBlocks(readFileSync(orcaCssPath, "utf8"))
const ui = parseBlocks(readFileSync(uiCssPath, "utf8"))

const pick = (blocks, pred) => {
  const hit = blocks.find((b) => pred(b.sel))
  return hit ? vars(hit.body) : {}
}

const orcaLight = pick(orca, (s) => s === ":root")
const orcaDark = pick(orca, (s) => s === ".dark")
const uiLight = pick(ui, (s) => s.endsWith(":root") && !s.includes("data-theme"))
const uiDark = pick(ui, (s) => s === ".dark")

/** 通道级差异 ≤3 视为「同一颜色的不同写法」。 */
const SAME_EPSILON = 3

function hexChannels(hex) {
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

function compare(label, o, u) {
  console.log(`\n===== ${label}：orca ↔ @innate/ui 基础 =====`)
  const structural = []
  const names = Object.keys(o).filter((n) => n in u && !NON_COLOR.test(n))
  for (const name of names) {
    const a = normalize(o[name])
    const b = normalize(u[name])
    if (!isColor(a) || !isColor(b)) {
      console.log(`  SKIP  ${name.padEnd(26)} orca=${o[name]}  ui=${u[name]}`)
      continue
    }
    let verdict
    if (a === b) {
      verdict = "SAME"
    } else {
      const ca = hexChannels(a)
      const cb = hexChannels(b)
      const close =
        ca && cb && ca.every((v, i) => Math.abs(v - cb[i]) <= SAME_EPSILON)
      if (close) {
        verdict = "CLOSE"
      } else {
        verdict = "DIFF"
        structural.push({ name, orca: o[name], ui: u[name], a, b })
      }
    }
    console.log(
      `  ${verdict.padEnd(5)} ${name.padEnd(26)} orca=${o[name].padEnd(24)} ui=${u[name]}`,
    )
  }
  const uiOnly = Object.keys(u).filter((n) => !(n in o))
  console.log(`  @innate/ui 独有：${uiOnly.join(", ") || "（无）"}`)
  return structural
}

const diffs = [
  ...compare("亮色", orcaLight, uiLight),
  ...compare("暗色", orcaDark, uiDark),
]

console.log(`\n===== 结构性差异（通道差 > ${SAME_EPSILON}） =====`)
if (diffs.length === 0) {
  console.log("  （无）")
} else {
  for (const d of diffs) {
    console.log(
      `  ${d.name.padEnd(26)} orca=${d.orca.padEnd(24)} → ${d.a}  ui=${d.ui.padEnd(24)} → ${d.b}`,
    )
  }
  console.log(
    "\n  以上差异是产品层覆写 @innate/ui 基础值的理由，逐条处置见\n  docs/build-path/1-monorepo-init/style-guide-alignment.md",
  )
}
process.exit(diffs.length === 0 ? 0 : 1)
