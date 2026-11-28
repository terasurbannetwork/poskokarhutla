import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { uraiOmcPosko, kenaliOmcPosko } from '../../scripts/wa/urai_omc_posko.mjs'

const teks = fs.readFileSync(new URL('./fixtures/omc_posko_251126.txt', import.meta.url), 'utf8')

test('urai laporan OMC posko 25 Nov 2026', () => {
  assert.ok(kenaliOmcPosko(teks))
  const r = uraiOmcPosko(teks)
  assert.equal(r.tanggal, '2026-11-25')
  assert.equal(r.provinsi, 'Aceh')
  assert.deepEqual(r.posko, ['Bandar Udara Sultan Iskandar Muda', 'Lanud Soewondo'])
  assert.equal(r.armada.length, 2)
  assert.equal(r.armada[0].registrasi, 'PK-SNK')
  assert.equal(r.armada[1].registrasi, 'A-2103')
  const s = r.armada.flatMap((a) => a.sorti)
  assert.equal(s.length, 4)
  assert.equal(s.reduce((a, x) => a + x.kg, 0), 3400)
  assert.deepEqual(s.map((x) => x.kg), [1000, 800, 800, 800])
  assert.deepEqual(r.armada[0].sorti[0], { ke: 1, mesin_hidup: '06:52', mesin_mati: '08:43', wilayah_semai: 'Perairan Utara Provinsi Aceh', ketinggian_ft: { min: 10000, max: 12000 }, bahan: 'NaCl', kg: 1000 })
  assert.deepEqual(r.armada[0].sorti[1].ketinggian_ft, { min: 11000, max: 11000 })
  assert.deepEqual(r.armada[1].sorti[1].ketinggian_ft, { min: 10000, max: 11000 })
  assert.equal(r.armada[1].sorti[1].mesin_hidup, '13:36')
  assert.deepEqual(r.kumulatif, [
    { posko: 'Bandar Udara Sultan Iskandar Muda', sorti: 13, kg: 11800, jam_terbang_menit: 33 * 60 + 14 },
    { posko: 'Lanud Soewondo', sorti: 4, kg: 3200, jam_terbang_menit: 8 * 60 + 40 },
  ])
})

test('toleran variasi: tanpa titik ribuan, "on/off", tanpa evaluasi', () => {
  const r = uraiOmcPosko('OMC Operasi Modifikasi Cuaca di Provinsi Riau pada 3 Maret 2026\n1. Armada : 1 CASA (A-1)\n- Sorti 1\nEngine on / off : 6.05 - 8.00 WIB\nWilayah semai : X\nKetinggian : 9000-10000 ft\nBahan semai : NaCl 1000 kg\n')
  assert.equal(r.tanggal, '2026-03-03')
  assert.deepEqual(r.armada[0].sorti[0], { ke: 1, mesin_hidup: '06:05', mesin_mati: '08:00', wilayah_semai: 'X', ketinggian_ft: { min: 9000, max: 10000 }, bahan: 'NaCl', kg: 1000 })
  assert.deepEqual(r.kumulatif, [])
  assert.ok(!kenaliOmcPosko('halo'))
})
