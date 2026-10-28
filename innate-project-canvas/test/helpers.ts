import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'innate-project-canvas-'))
  const files: Record<string, string> = {
    'docs/sprints/README.md': `# Sprint\n\n| Sprint | 名称 | 来源 | 预估 | 状态 |\n| --- | --- | --- | --- | --- |\n| [S0](./S0.md) | 基线 | 测试 | 1 天 | 进行中 |\n`,
    'docs/sprints/S0.md': `# S0\n\n## T0.1 建立契约\n\n- **状态**：已完成。\n- **做什么**：建立契约。\n- **功能**：统一输入。\n- **如何验证**：证据位于 \`evidence/m0/proof.txt\`。\n- **预估 / 依赖**：0.1 天 / 无。\n\n## T0.2 生成看板\n\n- **做什么**：生成看板。\n- **功能**：统一输出。\n- **如何验证**：真实渲染。\n- **预估 / 依赖**：0.2 天 / T0.1。\n\n## T0.3 发布画布\n\n- **做什么**：发布画布。\n- **功能**：展示结果。\n- **如何验证**：回读检查。\n- **预估 / 依赖**：0.2 天 / T0.2，可与 T0.1 并行。\n\n## T0.4 记录结果\n\n- **做什么**：记录结果。\n- **功能**：保留证据。\n- **如何验证**：读取证据。\n- **预估 / 依赖**：0.1 天 / 无。注：参考 T0.1，但不形成依赖。\n`,
    'docs/plans/innate-dogic-dsh/evidence/m0/proof.txt': 'verified\n',
    'innate-dogic/apps/app/package.json': JSON.stringify({ name: '@example/app', dependencies: { '@example/lib': 'workspace:*' } }),
    'innate-dogic/packages/lib/package.json': JSON.stringify({ name: '@example/lib' }),
  }
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(root, path)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content, 'utf8')
  }
  return root
}
