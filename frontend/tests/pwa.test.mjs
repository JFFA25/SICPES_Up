import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const p = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url))
const read = (rel) => readFileSync(p(rel), 'utf8')
const manifest = JSON.parse(read('public/manifest.webmanifest'))

// Ancho y alto de un PNG leyendo su cabecera IHDR
const pngSize = (rel) => {
  const buf = readFileSync(p(rel))
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

describe('PWA SICPES', () => {
  it('el manifest tiene los campos requeridos', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBe('SICPES')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.theme_color).toBe('#2F8A5C')
  })

  it('los íconos declarados existen y tienen el tamaño indicado', () => {
    for (const icon of manifest.icons) {
      const [w, h] = icon.sizes.split('x').map(Number)
      const file = `public${icon.src}`
      expect(existsSync(p(file)), `falta ${file}`).toBe(true)
      expect(pngSize(file)).toEqual({ w, h })
    }
    const sizes = manifest.icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('index.html enlaza el manifest', () => {
    expect(read('index.html')).toContain('rel="manifest"')
  })

  it('el service worker existe y no guarda en caché /api', () => {
    const sw = read('public/sw.js')
    expect(sw).toContain("startsWith('/api/')")
  })
})

describe('Configuración de despliegue', () => {
  it('nginx redirige las rutas de la SPA a index.html', () => {
    expect(read('nginx.conf')).toContain('try_files $uri $uri/ /index.html')
  })

  it('el build registra la versión en dist/version.json (postbuild)', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.scripts.postbuild).toContain('write-version.mjs')
    expect(existsSync(p('scripts/write-version.mjs'))).toBe(true)
    expect(read('scripts/write-version.mjs')).toContain('dist/version.json')
  })
})

describe('Seguridad del repositorio', () => {
  it('no hay llaves privadas, certificados ni .env rastreados por git', () => {
    let tracked = ''
    try {
      tracked = execFileSync(
        'git',
        ['ls-files', '--', '*.pem', '*.key', '*.exe', '.env', '*/.env'],
        { cwd: p('..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      ).trim()
    } catch {
      return // fuera de un repositorio git (por ejemplo, dentro del contenedor)
    }
    expect(tracked, `archivos sensibles en git:\n${tracked}`).toBe('')
  })
})
