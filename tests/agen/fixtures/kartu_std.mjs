/* Pemindai kartu standar .ex-std (AGENTS.md 3.5, pembaruan 11 Nov 2026): kepala kartu = NAMA SEKSI, bukan kalimat temuan.
   Memindai panggilan kartu(ey, judul, isi, sumber, ...) dan hl() di judul, serta kaki sumber.
   ponytail: statis; mengenali panggilan bernama kartu( / .kartu( dengan argumen ke-2 = judul, ke-4 = sumber. Bentuk lain lolos. */
import {berkas, baca, buangKomentarJs} from './ratchet.mjs'

/** Argumen tingkat-atas dari panggilan yang kurung buka-nya di `i` (src[i] === '('); string dan template (bersarang) dilewati. */
export function argumen(src, i) {
  const out = []; let depth = 0, mulai = i + 1
  const lewatStr = (j, q) => { // j di kutip pembuka; kembalikan indeks setelah kutip penutup
    for (j++; j < src.length; j++) {
      if (src[j] === '\\') { j++; continue }
      if (src[j] === q) return j + 1
      if (q === '`' && src[j] === '$' && src[j + 1] === '{') { j = lewatBlok(j + 1) - 1 }
    }
    return j
  }
  const lewatBlok = j => { // j di '{'; kembalikan indeks setelah '}' padanannya
    let d = 0
    for (; j < src.length; j++) {
      const c = src[j]
      if (c === '"' || c === "'" || c === '`') { j = lewatStr(j, c) - 1; continue }
      if (c === '{') d++
      else if (c === '}' && --d === 0) return j + 1
    }
    return j
  }
  for (let j = i; j < src.length; j++) {
    const c = src[j]
    if (c === '"' || c === "'" || c === '`') { j = lewatStr(j, c) - 1; continue }
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') { if (--depth === 0) { out.push(src.slice(mulai, j)); return out } }
    else if (c === ',' && depth === 1) { out.push(src.slice(mulai, j)); mulai = j + 1 }
  }
  return out
}
const KOSONG = /^\s*(?:""|''|``)?\s*$/   // sumber kosong = tanpa kaki

/** Pelanggaran satu berkas: {judulHl: kepala berisi kalimat temuan, sumber: argumen sumber tak kosong, kaki: kaki "Sumber:"}. */
export function pindai(src) {
  const js = buangKomentarJs(src), r = {judulHl: 0, sumber: 0, kaki: 0}
  const HL = /\bhl\(|class=\\?["']hl|class:\s*["']hl/
  for (const m of js.matchAll(/(?<![\w$.])(?:(?:Kartu|this)\.)?kartu\w*\(/g)) {
    const a = argumen(js, m.index + m[0].length - 1)
    if (a.length >= 3 && HL.test(a[1])) r.judulHl++                                  // kartu(ey, judul, isi, ...)
    else if (a.length === 1 && /\bjudul:\s*(?:(?!\b(?:isi|id|ey|aksi|kls|kanan):)[^]){0,300}?\bhl\(/.test(a[0])) r.judulHl++  // kartu({judul: [... hl(...)]})
    if (a.length >= 4 && !KOSONG.test(a[3])) r.sumber++
  }
  r.judulHl += (js.match(/<h3[^>]*>[^<]*?(?:\bhl\(|class="hl")/g) || []).length
  if (!/NAMA_SEKSI/.test(js)) r.judulHl += (js.match(/<h3[^>]*>\$\{judul\}/g) || []).length   // NAMA_SEKSI = kepala dipaksa nama seksi
  r.kaki = (js.match(/Sumber: |class:\s*"ex-ft"|class="ex-ft"/g) || []).length
  return r
}

/** Cakupan: layar laporan (LAYAR di gerbang-kartu-std.test.mjs), kartu() siklus, cuaca, udara, longsor, operasi. */
export const SCOPE = [
  ...['bnpb/dalops', 'bnpb/katalog-dokumen', 'bnpb/silang', 'bnpb/rapor-sumber', 'bnpb/kebutuhan_pasar', 'bnpb/saham', 'operasi_laporan', 'banjir/sungai_induk', 'banjir/longsor', 'prediksi/laporan_layar',
    'siklus/inti', 'siklus/publik', 'siklus/kaji', 'siklus/pulih', 'siklus/renkon', 'siklus/gladi', 'siklus/masadepan', 'siklus/pintu', 'siklus/registri'].map(f => `public/${f}.js`),
  ...berkas('public/cuaca', /\.js$/), ...berkas('public/udara', /\.js$/),
]
/** Sudah dirombak: nol pelanggaran, tak boleh masuk daftar ratchet. */
export const WAJIB_BERSIH = ['public/operasi_laporan.js', 'public/banjir/longsor.js', 'public/bnpb/dalops.js', 'public/bnpb/katalog-dokumen.js']
/** {kunci: jumlah} untuk berkas SCOPE yang melanggar; kunci = "berkas#jenis". */
export function ukurSemua() {
  const u = {}
  for (const f of new Set(SCOPE)) {
    const r = pindai(baca(f))
    for (const [k, n] of Object.entries(r)) if (n) u[`${f}#${k}`] = n
  }
  return u
}
