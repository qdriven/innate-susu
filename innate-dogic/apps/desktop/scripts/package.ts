import { build, Platform } from 'electron-builder'

// Kimi Work 以 Electron 模拟 Node；构建器只需复制 ASAR，不能让宿主拦截其文件读写。
;(process as NodeJS.Process & { noAsar: boolean }).noAsar = true

const args = process.argv.slice(2)
const unknownArg = args.find((arg) => arg !== '--dir')

if (unknownArg) {
  console.error(`未知参数: ${unknownArg}；仅支持 --dir`)
  process.exit(1)
}

const dir = args.includes('--dir')
const targets = Platform.WINDOWS.createTarget(dir ? 'dir' : ['nsis', 'portable'])

async function main() {
  try {
    const artifacts = await build({ targets })
    console.log(`✓ Electron 分发产物已生成：${dir ? 'win-unpacked' : 'nsis + portable'}`)
    for (const artifact of artifacts) console.log(`  ${artifact}`)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

void main()
