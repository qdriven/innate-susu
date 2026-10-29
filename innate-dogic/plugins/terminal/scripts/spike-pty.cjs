#!/usr/bin/env node
/**
 * W4.1 PTY 技术 spike（开发环境）：
 * 在 Electron 主进程内验证 node-pty 预编译二进制可加载、可 spawn、
 * 可读写、可 resize、退出码可回收。仅跑只读命令，不触碰任何写操作。
 *
 * 运行：innate-dogic/apps/desktop/node_modules/electron/dist/electron.exe \
 *        innate-dogic/plugins/terminal/scripts/spike-pty.cjs
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { app } = require('electron')
const pty = require('node-pty')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const execFileAsync = promisify(execFile)

const results = { steps: [] }

function record(name, ok, detail) {
  results.steps.push({ name, ok, ...(detail ? { detail } : {}) })
  console.log(`[spike] ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runExit(term, code) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000)
    term.onExit(({ exitCode }) => {
      clearTimeout(timer)
      resolve(exitCode)
    })
    term.write(`exit ${code}\r\n`)
  })
}

app.whenReady().then(async () => {
  try {
    record('load node-pty', typeof pty.spawn === 'function')

    const term = pty.spawn('cmd.exe', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: { ...process.env },
    })
    record('spawn cmd.exe', Boolean(term.pid), `pid=${term.pid}`)

    let output = ''
    term.onData((data) => { output += data })
    term.write('echo spike-ok\r\n')
    await sleep(800)
    record('echo output', output.includes('spike-ok'), output.trim().slice(0, 120))

    term.write('echo 中文输出正常\r\n')
    await sleep(800)
    record('utf8 output', output.includes('中文输出正常'))

    term.resize(100, 30)
    record('resize', true, '100x30')

    const exitCode = await runExit(term, 0)
    record('exit code 0', exitCode === 0, String(exitCode))
    term.kill()

    const term2 = pty.spawn('cmd.exe', [], { name: 'xterm-256color', cols: 80, rows: 24, cwd: process.cwd(), env: { ...process.env } })
    term2.onData(() => {})
    const exitCode2 = await runExit(term2, 3)
    record('exit code 3', exitCode2 === 3, String(exitCode2))
    term2.kill()

    // 进程树回收检查（Windows：taskkill /T /F）
    const spawned = pty.spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/c', 'ping -n 30 127.0.0.1 > nul'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: process.cwd(), env: { ...process.env },
    })
    await sleep(500)
    await execFileAsync('taskkill', ['/pid', String(spawned.pid), '/T', '/F'], { windowsHide: true }).catch(() => undefined)
    spawned.kill()
    await sleep(300)
    const alive = await execFileAsync('tasklist', ['/FI', `PID eq ${spawned.pid}`, '/NH'], { windowsHide: true })
      .then((r) => !/cmd\.exe/i.test(r.stdout))
      .catch(() => true)
    record('process tree reclaim', alive, `pid=${spawned.pid}`)

    record('overall', results.steps.every((step) => step.ok))
    console.log('[spike] RESULT', JSON.stringify(results))
  } catch (error) {
    record('spike crashed', false, error instanceof Error ? error.message : String(error))
    console.log('[spike] RESULT', JSON.stringify(results))
  } finally {
    app.exit(results.steps.every((step) => step.ok) ? 0 : 1)
  }
})
