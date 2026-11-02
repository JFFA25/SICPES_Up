// Escribe dist/version.json después de compilar (se ejecuta solo como "postbuild").
// Funciona igual en Render (Static Site), GitHub Actions y local.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

if (!existsSync('dist')) {
  console.error('No existe la carpeta dist: ejecuta primero el build.')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

let commit = process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || ''
if (!commit) {
  try {
    commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    commit = 'unknown'
  }
}

const info = { version: pkg.version, commit, built_at: new Date().toISOString() }
writeFileSync('dist/version.json', JSON.stringify(info) + '\n')
console.log('version.json generado:', info)
