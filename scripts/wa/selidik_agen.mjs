#!/usr/bin/env node
// Selidik jalan agen bot laporan (20 Nov 2026, P-201126-01 "agen lewat batas waktu"): linimasa langkah agen dari transkrip sesi
// Claude Agent SDK (~/.claude/projects/*/<sesi>.jsonl, disimpan 7 hari) dan ringkasan ~/.wa-bot/agen/jalan.log.
//
//   node scripts/wa/selidik_agen.mjs P-201126-01            # ringkasan + 15 langkah terlama
//   node scripts/wa/selidik_agen.mjs P-201126-01 --semua    # semua langkah
//
// Baca saja, tidak mengubah apa pun. Keluaran tidak memuat isi bahan: perintah dan teks dipotong 70 huruf, angka 8 digit atau lebih disamarkan.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const [id, ...opsi] = process.argv.slice(2)
if (!/^P-\d{6}-\d{2}$/.test(id || '')) { console.error('pakai: node scripts/wa/selidik_agen.mjs P-DDMMYY-NN [--semua]'); process.exit(2) }
const RUMAH = process.env.WA_RUMAH || path.join(os.homedir(), '.wa-bot')
const AGEN = path.join(RUMAH, 'agen')
const bacaJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
const potong = (s, n = 70) => String(s ?? '').replace(/\s+/g, ' ').replace(/\d{8,}/g, '########').slice(0, n)
const det = (ms) => `${(ms / 1000).toFixed(0)} dtk`

// 1. jalan.log: satu baris per jalan agen
const jalan = String((() => { try { return fs.readFileSync(path.join(AGEN, 'jalan.log'), 'utf8') } catch { return '' } })())
  .split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((x) => x?.id === id)
console.log(`== jalan.log ${id}: ${jalan.length} jalan`)
for (const j of jalan) console.log(`  ${j.waktu}  ${j.kegiatan}  ${j.detik} dtk, ${j.giliran} giliran, hasil ${j.hasil}, api ${j.api_detik ?? '-'} dtk, $${j.usd ?? '-'}`)

// 2. sesi proyek (sekarang + lama) -> transkrip
const s = bacaJson(path.join(AGEN, 'sesi.json'), {})[id]
const sid = [s?.sesi, ...(s?.lama || [])].filter((x) => /^[\w-]{8,80}$/.test(String(x || '')))
if (!sid.length) { console.log('sesi tidak tercatat (sudah disapu, atau proyek dibatalkan)'); process.exit(0) }
const proj = path.join(os.homedir(), '.claude', 'projects')
let dirs = []
try { dirs = fs.readdirSync(proj) } catch {}
for (const sesi of sid) {
  const f = dirs.map((d) => path.join(proj, d, `${sesi}.jsonl`)).find((x) => fs.existsSync(x))
  console.log(`\n== sesi ${sesi}: ${f ? path.basename(path.dirname(f)) : 'transkrip tidak ditemukan'}`)
  if (!f) continue
  const baris = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((x) => x?.timestamp)
  const langkah = []
  let sebelum = null, tunggu = 0, alat = 0, keluar = 0, masuk = 0, cache = 0, galat = 0
  const hitAlat = {}
  for (const b of baris) {
    const t = Date.parse(b.timestamp), jeda = sebelum == null ? 0 : t - sebelum
    const isi = Array.isArray(b.message?.content) ? b.message.content : []
    if (b.type === 'assistant') {
      tunggu += jeda // dari hasil alat / prompt sampai jawaban model = waktu model (termasuk router API)
      const u = b.message?.usage || {}
      keluar += u.output_tokens || 0; masuk += u.input_tokens || 0; cache += (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0)
      const kerja = isi.map((c) => c.type === 'tool_use' ? `${c.name}: ${potong(c.input?.command || c.input?.file_path || c.input?.pattern || JSON.stringify(c.input || {}))}`
        : c.type === 'text' ? `teks: ${potong(c.text)}` : c.type === 'thinking' ? 'berpikir' : c.type).join(' | ')
      for (const c of isi) if (c.type === 'tool_use') hitAlat[c.name] = (hitAlat[c.name] || 0) + 1
      if (b.isApiErrorMessage || b.error) galat++
      langkah.push({ t, jeda, jenis: 'model', ket: kerja || '(kosong)', keluar: u.output_tokens || 0 })
    } else if (b.type === 'user') {
      const hasil = isi.filter((c) => c.type === 'tool_result')
      if (hasil.length) {
        alat += jeda // dari panggilan alat sampai hasilnya = waktu alat (python, render, baca berkas)
        const salah = hasil.some((c) => c.is_error)
        langkah.push({ t, jeda, jenis: 'alat', ket: (salah ? 'GALAT ' : '') + potong(hasil.map((c) => typeof c.content === 'string' ? c.content : JSON.stringify(c.content)).join(' '), 70) })
      }
    } else if (b.type === 'system') {
      langkah.push({ t, jeda, jenis: 'sistem', ket: potong(b.subtype + ' ' + (b.content || b.message || ''), 70) })
    }
    sebelum = t
  }
  if (!baris.length) continue
  const total = Date.parse(baris.at(-1).timestamp) - Date.parse(baris[0].timestamp)
  const nModel = langkah.filter((l) => l.jenis === 'model').length
  console.log(`  mulai ${baris[0].timestamp}, akhir ${baris.at(-1).timestamp}, total ${det(total)}`)
  console.log(`  langkah model ${nModel}, rata-rata tunggu model ${det(nModel ? tunggu / nModel : 0)}, total tunggu model ${det(tunggu)}, total alat ${det(alat)}`)
  console.log(`  token keluar ${keluar}, masuk ${masuk}, cache ${cache}; pesan galat API ${galat}`)
  console.log(`  alat dipakai: ${Object.entries(hitAlat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') || '-'}`)
  const tampil = opsi.includes('--semua') ? langkah : [...langkah].sort((a, b) => b.jeda - a.jeda).slice(0, 15).sort((a, b) => a.t - b.t)
  console.log(`  ${opsi.includes('--semua') ? 'semua langkah' : '15 langkah terlama'} (jeda = waktu sejak langkah sebelumnya):`)
  const t0 = Date.parse(baris[0].timestamp)
  for (const l of tampil) console.log(`   +${String(Math.round((l.t - t0) / 1000)).padStart(5)} dtk  jeda ${String(Math.round(l.jeda / 1000)).padStart(4)} dtk  ${l.jenis.padEnd(6)} ${l.ket}${l.keluar ? `  (${l.keluar} token)` : ''}`)
}
