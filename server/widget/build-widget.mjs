import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const entryFile = path.resolve(__dirname, 'lead-capture-widget.ts')
const outDir = path.resolve(rootDir, 'dist/widget')
const outFile = path.resolve(outDir, 'lead-capture.js')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

console.log(`[build:widget] Bundling ${entryFile} -> ${outFile}...`)

try {
  await esbuild.build({
    entryPoints: [entryFile],
    outfile: outFile,
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    define: {
      __RECAPTCHA_SITE_KEY__: '"__RECAPTCHA_SITE_KEY__"',
    },
  })

  const stats = fs.statSync(outFile)
  console.log(`[build:widget] Widget bundled successfully (${stats.size} bytes) -> ${outFile}`)
} catch (error) {
  console.error('[build:widget] Build failed:', error)
  process.exit(1)
}
