#!/usr/bin/env node
import { bootBackend } from './index.js'

const log = (line: string): void => console.error(`${new Date().toISOString()} ${line}`)
const required = ['INNATE_MAGPIE_BIN', 'INNATE_DSH_ENTRY', 'INNATE_DSH_HOME'] as const
for (const key of required) {
  if (!process.env[key]) {
    log(`[backend-cli] missing env ${key}`)
    process.exit(2)
  }
}

const backend = await bootBackend({
  nodePath: process.execPath,
  magpieBin: process.env.INNATE_MAGPIE_BIN!,
  dshEntry: process.env.INNATE_DSH_ENTRY!,
  dshHome: process.env.INNATE_DSH_HOME!,
  patchPaths: (process.env.INNATE_UI_PATCH ?? '').split(';').filter(Boolean),
  desiredModel: process.env.INNATE_MODEL,
  log,
  onPhase: (phase, detail = '') => log(`[phase] ${phase} ${detail}`),
})

console.log(`INNATE_AUTHED_URL=${backend.authedUrl}`)
let stopping = false
async function shutdown(code = 0): Promise<void> {
  if (stopping) return
  stopping = true
  await backend.stop().catch(() => {})
  process.exit(code)
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
process.stdin.on('close', () => void shutdown())
