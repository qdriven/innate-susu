import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

function argument(args: string[], name: string): string | undefined {
  const exact = args.indexOf(`--${name}`)
  if (exact >= 0) return args[exact + 1]
  const inline = args.find((value) => value.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

const args = process.argv.slice(2)
const host = argument(args, 'host') ?? '127.0.0.1'
const port = Number(argument(args, 'port') ?? '7100')
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid port: ${port}`)
const root = resolve(fileURLToPath(new URL('../out/', import.meta.url)))

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end()
    return
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    let path = resolve(root, requested)
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end('Forbidden')
      return
    }
    if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, 'index.html')
    if (!existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found. Run sync or sync:preview first.')
      return
    }
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    if (request.method === 'HEAD') response.end()
    else createReadStream(path).pipe(response)
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request')
  }
})

server.listen(port, host, () => {
  console.log(`Innate Project Canvas: http://${host}:${port}/`)
  if (!existsSync(resolve(root, 'index.html'))) console.log('No generated page yet. Run sync or sync:preview in another terminal.')
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close(() => { process.exit(0) }))
}
