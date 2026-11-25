/* Pembantu uji Docs: menjalankan bangun.py dengan python yang tersedia (python3 di Linux dan macOS, python atau py di Windows). */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const AKAR = fileURLToPath(new URL('../..', import.meta.url))
export const DOCS = path.join(AKAR, 'public', 'docs')
export const SUMBER = path.join(AKAR, 'docs', 'centurisk97')

const kandidat = [['python3'], ['python'], ['py', '-3']]
let dipilih = null
export function python() {
  if (dipilih) return dipilih
  for (const k of kandidat) {
    const r = spawnSync(k[0], [...k.slice(1), '--version'], { encoding: 'utf8' })
    if (r.status === 0) { dipilih = k; return k }
  }
  throw new Error('python tidak ditemukan (python3, python, atau py)')
}

export function jalankan(args, opsi = {}) {
  const k = python()
  return spawnSync(k[0], [...k.slice(1), '-I', ...args], { cwd: AKAR, encoding: 'utf8', timeout: 120000, ...opsi })
}

export const bangun = (...a) => jalankan(['scripts/docs/bangun.py', ...a])
export const baca = (rel) => fs.readFileSync(path.join(AKAR, rel), 'utf8')
/* semua keluaran .html di public/docs (relatif, posix), tanpa folder gambar */
export const halaman = () => {
  const out = []
  const jalan = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== 'gambar') jalan(path.join(dir, e.name), rel + e.name + '/') } else if (e.name.endsWith('.html')) out.push(rel + e.name)
    }
  }
  jalan(DOCS, '')
  return out.sort()
}
/* jalur kanonik yang diterbitkan, urutan baca (beranda, modul, halaman per bagian) */
export const jalur = () => bangun('--jalur').stdout.split('\n').map((s) => s.trim()).filter(Boolean)
export const petaJson = () => JSON.parse(fs.readFileSync(path.join(SUMBER, 'peta.json'), 'utf8'))
export const bagian = (f) => (f.startsWith('pengembang/') ? 'pengembang' : 'panduan')
/* jenis halaman keluaran: beranda, modul (index.html di dalam folder modul), atau halaman */
export const jenis = (f) => (f === 'index.html' || f === 'pengembang/index.html' ? 'beranda' : f.endsWith('/index.html') ? 'modul' : 'halaman')
