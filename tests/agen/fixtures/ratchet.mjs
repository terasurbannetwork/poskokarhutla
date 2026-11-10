/* Pembantu gerbang ratchet: kode lama masuk daftar pengecualian (JSON di fixtures/) berisi plafon per kunci.
   Plafon hanya boleh sama atau turun: kunci baru atau hitungan naik = merah; kunci yang sudah bersih = merah "hapus entri ini". */
import fs from 'node:fs'
import path from 'node:path'

export const AKAR = new URL('../../..', import.meta.url).pathname

/** Semua berkas di bawah `dir` (relatif akar) yang cocok `ext`, tanpa vendor/node_modules dan salinan "* 2.*". */
export function berkas(dir, ext) {
  const abs = path.join(AKAR, dir)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) return /^(vendor|node_modules)$/.test(e.name) ? [] : berkas(rel, ext)
    return ext.test(e.name) && !/ 2\./.test(e.name) ? [rel] : []
  })
}
export const baca = (rel) => fs.readFileSync(path.join(AKAR, rel), 'utf8')
/* Perintisan: hanya bila berkas daftar BELUM ada dan ISI_DAFTAR=1, daftar ditulis dari hasil pindai. Daftar yang ada tidak pernah ditimpa. */
export function muatDaftar(nama, ukur) {
  const u = new URL(`./${nama}`, import.meta.url)
  if (!fs.existsSync(u) && ukur && process.env.ISI_DAFTAR === '1') fs.writeFileSync(u, JSON.stringify(ukur, null, 1) + '\n')
  return JSON.parse(fs.readFileSync(u, 'utf8'))
}
export const buangKomentarJs = (k) => k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1')
export const buangKomentarCss = (k) => k.replace(/\/\*[\s\S]*?\*\//g, '')

/** ukur: {kunci: jumlah>0}; daftar: {kunci: plafon}. Mengembalikan daftar masalah (kosong = lolos). */
export function banding(ukur, daftar) {
  const m = []
  for (const [k, n] of Object.entries(ukur)) {
    if (!(k in daftar)) m.push(`BARU ${k}: ${n} pelanggaran; kode baru tidak boleh melanggar, perbaiki (jangan masukkan ke daftar)`)
    else if (n > daftar[k]) m.push(`NAIK ${k}: ${n} > plafon ${daftar[k]}; kurangi pelanggarannya`)
  }
  for (const k of Object.keys(daftar)) if (!(k in ukur)) m.push(`BASI ${k}: sudah tidak melanggar; hapus entri ini dari daftar pengecualian`)
  return m
}
export const tegas = (assert, masalah, daftar) =>
  assert.deepEqual(masalah, [], `\n${masalah.join('\n')}\n(daftar: tests/agen/fixtures/${daftar}; hanya boleh menyusut, jangan dilonggarkan)`)
