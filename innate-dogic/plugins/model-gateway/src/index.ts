/**
 * model-gateway 插件入口。
 *
 * activate 时探测 magpie 并启动，发布 ModelGateway 服务。
 * deactivate 时回收子进程。
 */
import type { PluginContext } from '@dogic/kernel'
import { MagpieModelGateway } from './magpie-gateway.js'
import { DirectModelGateway } from './direct.js'
import { detectMagpie, MIN_MAGPIE_VERSION } from './detect.js'
import type { ModelGateway } from '@dogic/sdk'

export interface ModelGatewayPluginOptions {
  /** 强制使用直连模式 */
  forceDirect?: boolean
  /** magpie 二进制路径（跳过探测） */
  binaryPath?: string
  /** 环境变量 */
  env?: Record<string, string>
}

/**
 * 插件 apply 函数。
 */
export async function apply(ctx: PluginContext, options: ModelGatewayPluginOptions = {}): Promise<void> {
  let gateway: ModelGateway

  if (options.forceDirect) {
    // 直连模式
    gateway = new DirectModelGateway()
    ctx.service.registerInstance('model-gateway', gateway)
    ctx.effect(() => {})
    return
  }

  // 探测 magpie
  let binaryPath = options.binaryPath
  if (!binaryPath) {
    const detection = await detectMagpie(MIN_MAGPIE_VERSION)
    if (!detection.found || !detection.path) {
      // magpie 未安装，降级为直连模式
      gateway = new DirectModelGateway()
      ctx.service.registerInstance('model-gateway', gateway)
      ctx.emit('model-gateway:mode', 'direct')
      ctx.effect(() => {})
      return
    }
    binaryPath = detection.path
  }

  // 创建 magpie 网关
  const magpieGateway = new MagpieModelGateway({
    binaryPath,
    env: options.env,
  })

  // 注册服务（懒加载，ensureRunning 时才启动进程）
  ctx.service.registerInstance('model-gateway', magpieGateway)

  // 注册资源回收
  ctx.effect(async () => {
    await magpieGateway.stop()
  })

  ctx.emit('model-gateway:mode', 'magpie')
}

export { MagpieModelGateway } from './magpie-gateway.js'
export { DirectModelGateway } from './direct.js'
export { detectMagpie, MIN_MAGPIE_VERSION } from './detect.js'
export { MagpieProcess } from './process.js'
export { MagpieCli } from './magpie-cli.js'
