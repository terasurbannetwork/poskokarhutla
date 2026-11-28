// Pengurai laporan WA "OMC posko" (SB-32, K8). Murni: teks -> objek; tanpa LLM, tanpa nama orang, tanpa simpan.
// Penyimpanan milik SB-33 (warga-api). Belum disambung ke alur bot.
const BULAN = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 }
const angka = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'))
const hm = (s) => s.replace('.', ':').replace(/^(\d):/, '0$1:')

export const kenaliOmcPosko = (t) => /operasi\s+modifikasi\s+cuaca/i.test(t) && /sorti/i.test(t) && /engine\s*on\s*\/?\s*off/i.test(t)

export function uraiOmcPosko(teks) {
  const t = String(teks).replace(/\r/g, '')
  const tg = t.match(/(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i)
  const tanggal = tg ? `${tg[3]}-${String(BULAN[tg[2].toLowerCase()]).padStart(2, '0')}-${tg[1].padStart(2, '0')}` : null
  const prov = t.match(/di\s+Provinsi\s+([A-Za-z ]+?)\s+pada\b/i)
  const lok = t.match(/Posko\s+OMC\s+di\s+(.+)/i)
  const posko = lok ? lok[1].split(/\s+dan\s+|,/i).map((s) => s.trim()).filter(Boolean) : []

  const armada = []
  const bagian = t.split(/^\s*\d+\.\s*Armada\s*:/im).slice(1)
  for (let b of bagian) {
    b = b.split(/^\s*[A-Z]\.\s+[A-Z]/m)[0] // berhenti di bagian "E. EVALUASI"
    const kepala = b.split('\n')[0]
    const reg = kepala.match(/\(([^)]+)\)/)
    const pesawat = kepala.replace(/\([^)]*\)/, '').replace(/^\s*\d+\s+/, '').trim()
    const sorti = []
    for (const s of b.split(/^\s*-\s*Sorti\s*\d+/im).slice(1)) {
      const on = s.match(/on\s*\/?\s*off\s*:\s*(\d{1,2}[.:]\d{2})\s*-\s*(\d{1,2}[.:]\d{2})/i)
      const ke = s.match(/Wilayah semai\s*:\s*(.+)/i)
      const tg = s.match(/Ketinggian\s*:\s*([\d.]+)\s*(?:-\s*([\d.]+))?/i)
      const bh = s.match(/Bahan semai\s*:\s*([A-Za-z0-9]+)\s+([\d.,]+)\s*kg/i)
      const min = tg ? angka(tg[1]) : null
      sorti.push({
        ke: sorti.length + 1,
        mesin_hidup: on ? hm(on[1]) : null, mesin_mati: on ? hm(on[2]) : null,
        wilayah_semai: ke ? ke[1].trim() : null,
        ketinggian_ft: tg ? { min, max: tg[2] ? angka(tg[2]) : min } : null,
        bahan: bh ? bh[1] : null, kg: bh ? angka(bh[2]) : null,
      })
    }
    armada.push({ pesawat, registrasi: reg ? reg[1].trim() : null, sorti })
  }

  const kumulatif = []
  for (const m of t.matchAll(/^\s*-\s*Kegiatan OMC di\s+(?:Posko\s+)?(.+?)\s+telah dilaksanakan dengan total\s+(\d+)\s+sorti.*?([\d.]+)\s*kg.*?(?:total jam terbang\s+(\d+)\s*jam(?:\s+(\d+)\s*menit)?)?\s*\.?\s*$/gim)) {
    kumulatif.push({ posko: m[1].trim(), sorti: Number(m[2]), kg: angka(m[3]), jam_terbang_menit: m[4] ? Number(m[4]) * 60 + Number(m[5] || 0) : null })
  }
  return { tanggal, provinsi: prov ? prov[1].trim() : null, posko, armada, kumulatif }
}
