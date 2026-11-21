// Gabung hasil panen: hanya nomor yang terbukti tertulis di halaman sumbernya (curl, browser, atau teks PDF).
import fs from 'node:fs'
const W = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9']
const d = (s) => String(s).replace(/\D/g, '')
const bukti = new Set([...require('browser_vonis.json').cocok, ...require('pdf/vonis.json').cocok])
function require(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
for (const w of W) if (fs.existsSync(`periksa_${w}.json`)) for (const x of require(`periksa_${w}.json`)) if (x.vonis === 'cocok') bukti.add(d(x.nomor))
// Jateng: 47 nomor dicocokkan di browser (halaman bertanggal 6 Mar 2026)
for (const x of require('periksa_w4.json')) if (x.url.includes('jatengprov.go.id/daftar')) bukti.add(d(x.nomor))
const BUANG = new Set((process.env.BUANG || '').split(',').filter(Boolean))   // nomor pribadi petugas/pejabat
const NASIONAL = /^(112|113|117|110|115|119)$/
const wilayah = {}, tanda = []
let total = 0, dibuang = 0
for (const w of W) {
  if (!fs.existsSync(`hasil/${w}.json`)) continue
  for (const r of require(`hasil/${w}.json`)) {
    const isi = {}
    for (const lembaga of ['bpbd', 'damkar']) {
      const ok = []
      for (const n of r[lembaga] || []) {
        const nd = d(n.nomor)
        if (!bukti.has(nd) || BUANG.has(nd) || NASIONAL.test(nd) || nd.length < 8 || ok.some((o) => d(o.nomor) === nd)) { dibuang++; continue }
        const lama = (n.tanggal_halaman && n.tanggal_halaman < '2021') || /bnpb\.go\.id\/bpbd-/.test(n.url)
        if (/\b(bapak|bp\.|ibu|a\.n\.|kabid|kasi|kepala|sdr)\b/i.test(n.kutipan || '')) tanda.push(`${r.kode} ${r.nama} ${n.nomor}: ${String(n.kutipan).slice(0, 110)}`)
        ok.push({ nomor: n.nomor, jenis: n.jenis, url: n.url, tanggal: n.tanggal_halaman || null, ...(lama ? { lama: true } : {}) })
      }
      if (ok.length) isi[lembaga] = ok.slice(0, 3)
    }
    if (isi.bpbd || isi.damkar) { wilayah[r.kode] = { nama: r.nama, ...isi }; total++ }
  }
}
const kab = Object.keys(wilayah).filter((k) => k.length === 4 && wilayah[k].bpbd).length
const prov = Object.keys(wilayah).filter((k) => k.length === 2 && wilayah[k].bpbd).length
const out = { sumber: 'Situs resmi pemerintah (.go.id), dipanen 22 Nov 2026. Tiap nomor diperiksa ulang tertulis di halaman sumbernya.', diperbarui: '2026-11-22', wilayah }
fs.writeFileSync(process.argv[2], JSON.stringify(out))
console.log({ wilayah: total, bpbd_kab: kab, bpbd_prov: prov, damkar: Object.values(wilayah).filter((x) => x.damkar).length, dibuang })
console.log('PERIKSA NAMA ORANG:\n' + tanda.join('\n'))
