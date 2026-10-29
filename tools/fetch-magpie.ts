#!/usr/bin/env node
/**
 * magpie 版本钉死与按需获取（W2.8）。
 *
 * 用法：
 *   pnpm magpie:check                 # 校验现有 bin（幂等、无网络）：OK / 漂移警告 / 缺失指引
 *   pnpm magpie:fetch -- --from <路径> # 从本地副本获取（复制 + sha256 校验 + 落位）
 *
 * 设计（见 docs/sprints/w2/task-local-w2-8-magpie-tools.md）：
 * - 更新渠道信任 magpie 官方 `magpie update`（自带 usemagpie.ai SHA-256 校验）；本脚本不做下载。
 * - 漂移只警告不自动改：更新必须显式确认（重钉 magpie-version.json + 全量门禁），防止集成测试悄悄失效。
 * - 系统级覆盖链不受影响：launcher 的 resolveMagpieBin 仍按 env → 打包资源 → 仓内 bin → PATH。
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, renameSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pin = JSON.parse(readFileSync(path.join(root, 'tools', 'magpie-version.json'), 'utf8')) as {
  version: string
  sha256: string
  path: string
}
const binPath = path.join(root, pin.path)

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function hint(): string {
  return [
    '  获取方式（任选其一）：',
    '  1) 设 INNATE_MAGPIE_SOURCE 指向本机已有的 magpie.exe 副本，然后 pnpm magpie:fetch',
    '  2) 用任一现有 magpie 副本跑 `magpie update`（官方渠道，自带校验）后重新获取',
    `  3) 从官方渠道（usemagpie.ai）获取 ${pin.version} 或更新版，放到 ${pin.path}`,
  ].join('\n')
}

const CHECK_ONLY = !process.argv.includes('--from')
const fromIndex = process.argv.indexOf('--from')
const fromPath = fromIndex >= 0 ? path.resolve(process.argv[fromIndex + 1] ?? '') : undefined

// ── 获取模式：从本地副本复制 + 校验 ─────────────────────────────────────
if (!CHECK_ONLY) {
  if (!fromPath || !existsSync(fromPath) || !statSync(fromPath).isFile()) {
    console.error(`✗ --from 无效：${fromPath ?? '(未提供)'}`)
    process.exit(2)
  }
  const actual = sha256(fromPath)
  if (actual !== pin.sha256) {
    console.error(`✗ 副本哈希与钉死版本不符：\n  副本  ${actual}\n  钉死  ${pin.sha256}\n  如确要使用该版本：先重钉 tools/magpie-version.json（version+sha256），再获取。`)
    process.exit(3)
  }
  const tmp = `${binPath}.fetching`
  copyFileSync(fromPath, tmp)
  renameSync(tmp, binPath)
  console.log(`✓ 已落位 ${pin.path}（magpie ${pin.version}，sha256 校验通过）`)
  process.exit(0)
}

// ── 校验模式（幂等、无网络）────────────────────────────────────────────
if (!existsSync(binPath)) {
  console.error(`✗ magpie 未就位：${pin.path} 不存在（钉死版本 ${pin.version}）。\n${hint()}`)
  process.exit(2)
}
const actual = sha256(binPath)
if (actual === pin.sha256) {
  console.log(`✓ magpie ${pin.version} 就位（sha256 与钉死一致）`)
  process.exit(0)
}
console.error(
  `⚠ magpie 版本漂移：bin 哈希与钉死不符。\n  现存  ${actual}\n  钉死  ${pin.sha256}\n  多为自更新器所为（默认 6h 自查）。确认可用后：\n  1) 更新 tools/magpie-version.json（新 version+sha256）\n  2) 跑 \`magpie update check\` 了解最新版本\n  3) 重跑全量门禁（版本变更会影响 W2.6 隔离链路测试结论）`,
)
process.exit(3)
