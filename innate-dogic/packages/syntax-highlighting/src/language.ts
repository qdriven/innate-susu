const EXTENSION_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.mts': 'typescript', '.cts': 'typescript', '.tsx': 'tsx',
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'jsx',
  '.json': 'json', '.jsonc': 'jsonc', '.jsonl': 'jsonl',
  '.css': 'css', '.scss': 'scss', '.less': 'less', '.html': 'html', '.htm': 'html',
  '.xml': 'xml', '.svg': 'xml', '.py': 'python', '.rs': 'rust', '.go': 'go',
  '.java': 'java', '.kt': 'kotlin', '.kts': 'kotlin', '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp', '.cs': 'csharp',
  '.rb': 'ruby', '.php': 'php', '.swift': 'swift', '.sh': 'shell', '.bash': 'shell',
  '.zsh': 'shell', '.fish': 'fish', '.bat': 'bat', '.cmd': 'bat', '.ps1': 'powershell',
  '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml', '.ini': 'ini', '.cfg': 'ini',
  '.conf': 'ini', '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql',
  '.dockerfile': 'dockerfile', '.proto': 'proto', '.lua': 'lua', '.r': 'r',
  '.scala': 'scala', '.dart': 'dart', '.vue': 'vue', '.svelte': 'svelte',
  '.astro': 'astro', '.tf': 'hcl', '.hcl': 'hcl', '.csv': 'csv', '.tsv': 'tsv',
}

const FILENAME_LANGUAGE: Record<string, string> = {
  dockerfile: 'dockerfile', makefile: 'makefile', 'cmakelists.txt': 'cmake',
  '.gitignore': 'ini', '.gitattributes': 'ini', '.editorconfig': 'ini',
  '.bashrc': 'shell', '.bash_profile': 'shell', '.profile': 'shell', '.zshrc': 'shell',
}

/** 与 Orca 一样优先识别特殊文件名，再识别扩展名；返回值由 Shiki 目录解析别名。 */
export function detectSyntaxLanguage(filePath: string): string {
  const filename = filePath.split(/[\\/]/).at(-1)?.toLowerCase() ?? ''
  const exact = FILENAME_LANGUAGE[filename]
  if (exact) return exact
  if (filename === '.env' || filename.startsWith('.env.')) return 'ini'
  const lastDot = filename.lastIndexOf('.')
  const extension = lastDot > 0 ? filename.slice(lastDot) : ''
  return EXTENSION_LANGUAGE[extension] ?? 'plaintext'
}
