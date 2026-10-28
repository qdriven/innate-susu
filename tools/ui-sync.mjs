#!/usr/bin/env node
/**
 * innate-desktop 的 UI 基座接入入口（`pnpm ui:sync` 系列）。
 *
 * 职责：**定位 innate-fe 基础仓**，然后调用 `innate-fe-cli install` 完成
 * 「发布 @innate/* → 写 .npmrc → 改写 workspace: 依赖 → pnpm install」。
 *
 * 为什么需要这一层：`innate-fe-cli` 本身在基础仓内，但它的入口脚本路径
 * 取决于基础仓在哪。把它写死在 package.json 里会让仓库不可移植，所以定位
 * 逻辑放在这里，package.json 只保留一条稳定命令。
 *
 * 基础仓定位优先级（与 innate-fe-cli 内部一致）：
 *   1. 命令行 `--root <dir>`
 *   2. 环境变量 `INNATE_FE_ROOT`
 *   3. 配置文件 `.innate-fe-cli.json`（仓库根或用户 home，内容 {"feRoot":"<路径>"}）
 *   4. 自动发现：从仓库根向上找 `framework/innate-fe`、`base/innate-fe`、`innate-fe`
 *
 * 其余参数原样透传给 `innate-fe-cli install`（--bump patch / --dry-run / --only ui …）。
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SIBLING_SUBDIRS = ["framework/innate-fe", "base/innate-fe", "innate-fe"]
const CONFIG_BASENAME = ".innate-fe-cli.json"

const isFeRoot = (dir) =>
  Boolean(dir) && existsSync(join(dir, "plugins.registry.yaml"))

function readConfig(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch (err) {
    throw new Error(
      `配置文件不是合法 JSON: ${path}（${err instanceof Error ? err.message : String(err)}）`,
    )
  }
}

/** 返回 { root, source }；找不到则抛错并给出可执行的提示。 */
function resolveFeRoot(argv) {
  const flagIndex = argv.indexOf("--root")
  if (flagIndex >= 0) {
    const dir = resolve(argv[flagIndex + 1] ?? "")
    if (isFeRoot(dir)) return { root: dir, source: "--root" }
    throw new Error(`--root 指向的目录不是 innate-fe 基础仓: ${dir}`)
  }

  const fromEnv = process.env.INNATE_FE_ROOT
  if (fromEnv && isFeRoot(resolve(fromEnv))) {
    return { root: resolve(fromEnv), source: "INNATE_FE_ROOT" }
  }

  for (const path of [
    join(repoRoot, CONFIG_BASENAME),
    join(homedir(), CONFIG_BASENAME),
  ]) {
    if (!existsSync(path)) continue
    const { feRoot } = readConfig(path)
    if (feRoot && isFeRoot(resolve(feRoot))) {
      return { root: resolve(feRoot), source: path }
    }
  }

  let current = repoRoot
  while (true) {
    if (isFeRoot(current)) return { root: current, source: "自动发现" }
    for (const sub of SIBLING_SUBDIRS) {
      const candidate = join(current, sub)
      if (isFeRoot(candidate)) return { root: candidate, source: "自动发现" }
    }
    const parent = resolve(current, "..")
    if (parent === current) break
    current = parent
  }

  throw new Error(
    [
      "找不到 innate-fe 基础仓（含 plugins.registry.yaml 的目录）。按优先级尝试：",
      "  1. 命令行：pnpm ui:sync -- --root <基础仓路径>",
      "  2. 环境变量：INNATE_FE_ROOT=<基础仓路径>",
      `  3. 配置文件：在仓库根或 ~ 写 ${CONFIG_BASENAME}，内容 {"feRoot":"<基础仓路径>"}`,
      `  4. 自动发现：仓库向上的 ${SIBLING_SUBDIRS.join(" / ")}`,
    ].join("\n"),
  )
}

/** 优先用 bun 跑 TypeScript 入口；没有 bun 时退回基础仓打好的单文件 binary。 */
function buildCommand(feRoot) {
  const bun = spawnSync("bun", ["--version"], { stdio: "ignore" })
  if (bun.status === 0) {
    return {
      command: "bun",
      args: [join(feRoot, "innate-fe-cli", "src", "index.ts")],
    }
  }
  const binary = join(
    feRoot,
    "bin",
    process.platform === "win32" ? "innate-fe-cli.exe" : "innate-fe-cli",
  )
  if (existsSync(binary)) return { command: binary, args: [] }
  throw new Error(
    "既没有 bun，也没有基础仓打好的 binary（bin/innate-fe-cli）。" +
      "安装 bun，或在基础仓执行 `pnpm run cli:build`。",
  )
}

const argv = process.argv.slice(2)
const fe = resolveFeRoot(argv)
console.log(`innate-fe 基础仓: ${fe.root}（${fe.source}）`)

const { command, args } = buildCommand(fe.root)
const result = spawnSync(
  command,
  [
    ...args,
    "install",
    "--dir",
    repoRoot,
    "--root",
    fe.root,
    ...argv.filter((a, i) => a !== "--root" && argv[i - 1] !== "--root"),
  ],
  { stdio: "inherit", cwd: repoRoot },
)
process.exit(result.status ?? 1)
