// GS-11 (RENCANA-UJI T8, T12, T13): kartu Genangan radar di /siklus/kaji/:id untuk model banjir_gfm.
// Bagian 1 uji fungsi murni (public/siklus/genangan.js) tanpa peramban; bagian 2 memakai Chrome nyata dan dilewati bila tidak ada.
// Jalan: node --test tests/siklus/genangan_layar.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import path from 'node:path';
import {sajikan, bukaPeramban, cariChrome, galatNyata, PUB} from './_layar.mjs';
import {fmtAngka, fmtPersen, fmtPersenKelas, rentangTulis, alasanTakSah, barisKab, urutKab, lahanGabung, ringkasKartu, citraKab, kabAwal, polaSel, tglUtc, alasanKab, alasanRentang, rentangDari} from '../../public/siklus/genangan.js';

// kata yang dilarang tampil di kartu ini (DESIGN-SYSTEM 7); sengaja di uji, bukan di public/
const KATA_DILARANG = /\b(aman|surut|terdampak|tidak banjir)\b|·|—/i;
runInThisContext(readFileSync(path.join(PUB, 'inti/format.js'), 'utf8') + ';globalThis.fmt = fmt;');

const SID = 'd1b2c3d4e5f60718', KJ = 'KJ-2026-GFM00001';
const LAHAN = {'40': {ha: 3465.9, nama: 'Pertanian (termasuk sawah)'}, '10': {ha: 698.1, nama: 'Pohon'}, '50': {ha: 2.2, nama: 'Terbangun'}, '60': {ha: 0, nama: 'Lahan terbuka'}};
const CITRA = {radar_pra: {berkas: '1116_radar_pra.png', tanggal: '2025-11-10T23:11:18Z', status: 'ok'}, radar_pasca: {berkas: '1116_radar_pasca.png', tanggal: '2025-11-28T23:12:12Z', status: 'ok'},
  asli_pra: {status: 'tertutup awan', awan_pct: 74, tanggal: '2025-10-27T03:57:11Z'}, asli_pasca: {berkas: '1116_asli_pasca.png', tanggal: '2025-12-01T03:57:05Z', status: 'ok'}};
const KAB = [
  {kab4: '1201', kab: 'Tapanuli Tengah', status: 'ok', sah: false, alasan: 'sinyal lemah', lintasan: '2025-11-28T23:12:37Z', pra: '2025-11-10T23:11:33Z', cakupan_pct: 30},
  {kab4: '1116', kab: 'Aceh Tamiang', status: 'ok', sah: true, cakupan_pct: 18.7, lintasan: '2025-11-28T23:11:47Z', pra: '2025-11-10T23:11:03Z', luas: {baru_ha: 4830.7, persen_teramati: 11.8, teramati_ha: 40852.1}, lahan: LAHAN, citra: CITRA,
    penduduk: {worldpop: {tersedia: true, bawah: 1200, atas: 15400}, dukcapil: {tersedia: false, alasan: 'sumber tidak punya angka untuk kabupaten ini'}, ghsl: {tersedia: false, alasan: 'tidak ada padanan GHSL untuk zona sel'}}},
  {kab4: '1105', kab: 'Aceh Tenggara', status: 'tanpa_lintasan', sah: false, lintasan: null},
  {kab4: '1204', kab: 'Deli Serdang', status: 'ok', sah: true, cakupan_pct: 40, lintasan: '2025-11-29T23:00:00Z', luas: {baru_ha: 80.4, persen_teramati: 1.1}, lahan: LAHAN, penduduk: {worldpop: {tersedia: false, alasan: 'data bangunan belum tersedia'}}},
];

test('fmtAngka dan rentangTulis: format Indonesia, ribuan rb, bukan angka = null', () => {
  assert.equal(fmtAngka(4830.7), '4.831'); assert.equal(fmtAngka(80.44), '80,4'); assert.equal(fmtAngka(12345), '12,3 rb'); assert.equal(fmtAngka(0), '0');
  for (const x of [null, undefined, NaN, '12', Infinity]) assert.equal(fmtAngka(x), null, String(x));
  assert.equal(fmtPersen(18.74), '18,7 persen'); assert.equal(rentangTulis([1200, 15400]), '1.200 sampai 15,4 rb'); assert.equal(rentangTulis(null), null); assert.equal(rentangTulis([1]), null);
  assert.equal(fmtPersenKelas(0.03), 'kurang dari 0,1'); assert.equal(fmtPersenKelas(71.66), '71,7'); assert.equal(fmtPersenKelas(0), '0'); assert.equal(fmtPersenKelas(null), null);
  assert.equal(tglUtc('2025-11-28T23:11:47Z'), '28 Nov 2025'); assert.equal(tglUtc(null), null);
});

test('angka kecil tidak jadi 0, rentang terbalik ditolak, alasan teknis jadi kalimat polos', () => {
  assert.equal(fmtAngka(0.04), 'kurang dari 0,1'); assert.equal(fmtPersenKelas(0.04), 'kurang dari 0,1');
  const g = lahanGabung([{sah: true, lahan: {'50': {ha: 0.04, nama: 'Terbangun'}}}]); assert.equal(g.kelas[0].ha, 0.04); assert.equal(fmtAngka(g.kelas[0].ha), 'kurang dari 0,1');
  assert.equal(rentangTulis([400, 100]), null); assert.equal(rentangDari({bawah: 5, atas: 1}), null); assert.equal(rentangDari({bawah: null, atas: 1}), null);
  assert.equal(alasanKab('data bangunan belum tersedia (grid halus provinsi 11 tidak ada di data/terkunci/bangunan)'), 'data bangunan belum tersedia untuk provinsi ini'); assert.doesNotMatch(alasanKab('/data/x.json gagal'), /\//);
  assert.equal(alasanRentang('tidak ada kab sah dengan data bangunan'), 'data bangunan untuk kab sah belum tersedia');
});

test('urutKab: sah menurut tergenang baru, tak sah di bawah menurut nama dan berteks, tanpa angka', () => {
  const u = urutKab(KAB), salinan = JSON.stringify(KAB);
  assert.deepEqual(u.map(x => x.kab4), ['1116', '1204', '1105', '1201']);
  assert.equal(u[0].baru, 4830.7); assert.deepEqual(u[0].pend, [1200, 15400]); assert.equal(u[1].pend, null); assert.match(u[1].pendAlasan, /data bangunan belum tersedia/);
  for (const t of u.slice(2)) { assert.equal(t.sah, false); assert.equal(t.baru, null); assert.equal(t.pend, null); assert.ok(t.teks, 'alasan tertulis'); }
  assert.equal(u[2].teks, 'belum ada lintasan'); assert.equal(u[3].teks, 'sinyal lemah'); assert.equal(JSON.stringify(KAB), salinan, 'masukan tidak diubah');
  assert.deepEqual(urutKab(null), []); assert.equal(barisKab({kab4: '9999', sah: true}).sah, false, 'sah tanpa luas bukan sah');
});

test('alasanTakSah: tiap status punya kalimat sendiri, tidak pernah 0', () => {
  assert.equal(alasanTakSah({status: 'tanpa_pra'}), 'tidak ada citra pembanding sebelum kejadian'); assert.equal(alasanTakSah({status: 'tanpa_cakupan'}), 'tidak teramati cukup');
  assert.equal(alasanTakSah({status: 'ok', cakupan_pct: 9}), 'tidak teramati cukup (cakupan 9 persen)'); assert.equal(alasanTakSah({status: 'ok'}), 'tidak teramati cukup'); assert.equal(alasanTakSah({status: 'ok', alasan: 'Sinyal lemah'}), 'sinyal lemah');
});

test('lahanGabung: hanya kab sah, kelas nol dibuang, urut besar ke kecil, persen dari kelas yang ada, tanpa lahan dihitung terpisah', () => {
  const g = lahanGabung(KAB);
  assert.deepEqual(g.kelas.map(k => k.kode), ['40', '10', '50']); assert.equal(g.kabAda, 2); assert.equal(g.kabTanpa, 0); assert.equal(g.kelas[0].ha, 6931.8);
  assert.ok(Math.abs(g.kelas.reduce((a, k) => a + k.persen, 0) - 100) < 1e-9);
  const kosong = lahanGabung([{sah: true}, {sah: false, lahan: LAHAN}]); assert.equal(kosong.terbaca, false); assert.equal(kosong.kabTanpa, 1); assert.deepEqual(lahanGabung(undefined).kelas, []);
});

test('ringkasKartu: tanpa rentang ada alasan, hipotesis sampai teruji, vonis bawaan menunggu', () => {
  const a = ringkasKartu({rentang: null, alasan_rentang: 'tidak ada kab sah dengan data bangunan', luas_baru_ha: 4830.7, kab_sah: 1, kab_semua: 2, lintasan_terakhir: '2025-11-28', status_model: 'hipotesis', vonis: 'menunggu'});
  assert.equal(a.rentang, null); assert.equal(a.alasanRentang, 'tidak ada kab sah dengan data bangunan'); assert.equal(a.luas, '4.831'); assert.equal(a.kabSah, 1); assert.equal(a.kabSemua, 2); assert.equal(a.lintasan, '28 Nov 2025'); assert.equal(a.hipotesis, true);
  const b = ringkasKartu({rentang: [100, 400], status_model: 'teruji'}); assert.deepEqual(b.rentang, [100, 400]); assert.equal(b.hipotesis, false); assert.equal(b.luas, null);
  assert.equal(ringkasKartu(null).alasanRentang, 'belum dihitung'); assert.equal(ringkasKartu({rentang: [5, 'x']}).rentang, null);
});

test('citraKab: pasangan lengkap, tertutup awan, belum ada citra', () => {
  const k = KAB[1], r = citraKab(k, 'radar', SID);
  assert.equal(r.sebelum.src, `/api/siklus/kaji/${SID}/berkas/1116_radar_pra.png`); assert.equal(r.sesudah.tgl, '28 Nov 2025'); assert.equal(r.sebelum.tgl, '10 Nov 2025');
  assert.deepEqual(citraKab(k, 'asli', SID), {alasan: 'tertutup awan'}); assert.deepEqual(citraKab(k, 'swir', SID), {alasan: 'belum ada citra yang memenuhi syarat'}); assert.deepEqual(citraKab(KAB[0], 'radar', SID), {alasan: 'belum ada citra yang memenuhi syarat'});
});

test('kabAwal dan polaSel: kab sah terbesar dulu; jalur berkas hanya untuk id dan kab4 sah', () => {
  assert.equal(kabAwal(KAB), '1116'); assert.equal(kabAwal([KAB[2]]), '1105'); assert.equal(kabAwal([]), null);
  assert.equal(polaSel(SID, '1116'), `/api/siklus/kaji/${SID}/berkas/1116_sel.geojson`); assert.equal(polaSel(SID, '../1'), null); assert.equal(polaSel('x', '1116'), null);
});

test('semua teks yang dibangun bebas kata terlarang; sumber bebas hex, innerHTML, titik tengah, dan kapital semua', () => {
  const teks = JSON.stringify([urutKab(KAB), lahanGabung(KAB), ringkasKartu({alasan_rentang: 'x'}), citraKab(KAB[1], 'asli', SID)]);
  assert.doesNotMatch(teks, KATA_DILARANG);
  for (const f of ['siklus/genangan.js', 'siklus/kaji.js']) {
    const t = readFileSync(path.join(PUB, f), 'utf8'), bagian = f.endsWith('kaji.js') ? t.slice(t.indexOf('genangan radar (banjir_gfm')) : t.toString();
    assert.doesNotMatch(t, /innerHTML|insertAdjacentHTML|outerHTML/, f); assert.doesNotMatch(t, /#[0-9a-fA-F]{6}\b/, f); assert.doesNotMatch(bagian, /·|—/, f);
    assert.doesNotMatch(bagian.replace(/\/\*[\s\S]*?\*\//g, ''), /["`][^"`\n]*\b(aman|surut|terdampak|tidak banjir)\b[^"`\n]*["`]/i, `${f}: kata terlarang di teks tampil`);
    assert.doesNotMatch(bagian, /"[A-Z][A-Z ]{5,}"/, `${f}: teks kapital semua`);
  }
  const css = readFileSync(path.join(PUB, 'siklus/siklus.css'), 'utf8').slice(readFileSync(path.join(PUB, 'siklus/siklus.css'), 'utf8').indexOf('genangan radar di kaji')); assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(/, 'warna hanya dari token');
});

const BARIS = {id: SID, kejadian_id: KJ, model: 'banjir_gfm', versi: 2, status: 'dihitung', masukan: null, galat_kalibrasi: null, yakin: 'estimasi-model', dihitung: Date.parse('2026-11-24T14:54:00Z'), diubah: Date.parse('2026-11-24T14:54:00Z'),
  ringkas: {rentang: [1200, 15400], sumber_rentang: 'worldpop', satuan: 'jiwa', metrik: 'penduduk di area genangan', luas_baru_ha: 4911.1, kab_sah: 2, kab_semua: 4, lintasan_terakhir: '2025-11-29', vonis: 'menunggu', status_model: 'hipotesis', pil: 'Hipotesis: belum lulus uji balik', sumber: 'Copernicus GFM'}};
const HASIL = {v: 1, versi: 2, model: 'banjir_gfm', kab: KAB, jiwa_kab_sah: {worldpop: {bawah: 1200, atas: 15400, kab_ikut: 1, kab_dikeluarkan: [{kab4: '1204', alasan: 'data bangunan belum tersedia'}]}, dukcapil: {tersedia: false, alasan: 'x'}, ghsl: {tersedia: false, alasan: 'y'}},
  ringkas: BARIS.ringkas, ambang: {cakupan_pct_min: 10, zona_bawah: 0.5}, catatan: 'Penduduk di area genangan, bukan korban atau terdampak. Radar satu lintasan, buta di permukiman padat.', keterbatasan_paparan: 'Bangunan terdeteksi Google Open Buildings v3.', atribusi: ['Copernicus EMS GFM', 'ESA WorldCover 2021']};
const SEL = {type: 'FeatureCollection', sel_m: 110, features: [{type: 'Feature', geometry: {type: 'Point', coordinates: [98.1, 4.3]}, properties: {ha: 1.2}}, {type: 'Feature', geometry: {type: 'Point', coordinates: [98.2, 4.4]}, properties: {ha: 0.9}}]};
const api = (hasil, status = 'ada') => (m, j) => {
  if (j === '/api/staf/saya') return [200, {staf: {peran: ['koordalops']}}];
  if (j === `/api/siklus/kaji/${SID}`) return [200, {kaji: BARIS, kejadian: {id: KJ, jenis: 'banjir', mulai: '2025-11-26', kab4: '1116', fase: 'tanggap'}, hasil, hasil_status: status, hasil_selaras: true, meja: {catatan: 'isian petugas BPBD', baris: []}}];
  if (/\/berkas\/\d{4}_sel\.geojson$/.test(j)) return [200, SEL];
  return null;
};

const chrome = cariChrome();
test('layar genangan di Chrome nyata (1440 dan 390)', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('kartu lengkap: dua ujung, kab teramati n dari m, baris tak sah berteks, lahan, metode, tanpa kata terlarang', async () => {
      const s = await sajikan(api(HASIL));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/kaji/${SID}`, {tunggu: '#kj-kab tbody tr'});
        const d = await T.eval(`(() => ({gf: document.querySelector('#kj-gfm').innerText, pil: [...document.querySelectorAll('#kj-gfm .sk-pil')].map(x => x.dataset.y), baris: [...document.querySelectorAll('#kj-kab tbody tr')].map(r => r.innerText.replace(/\\s+/g, ' ')),
          kep: [...document.querySelectorAll('.ex-ey')].map(x => x.innerText), lh: document.querySelector('#kj-lahan').innerText, mt: document.querySelector('#kj-metode').textContent, semua: document.body.innerText, ft: !!document.querySelector('.ex-ft'), bar: document.querySelectorAll('#kj-lahan .sk-lahan > i').length, jd: document.querySelector('#kj-kepala h3').innerText}))()`);
        assert.match(d.gf, /perkiraan radar/i); assert.ok(d.pil.includes('hipotesis'), 'pil hipotesis'); assert.match(d.gf, /1\.200 sampai 15,4 rb/); assert.match(d.gf, /2 dari 4/); assert.match(d.gf, /4\.911 ha/); assert.match(d.gf, /tidak dijumlah/);
        assert.match(d.baris[0], /Aceh Tamiang/); assert.match(d.baris[0], /4\.831/); assert.match(d.baris[1], /data bangunan belum tersedia untuk provinsi ini/); assert.match(d.baris[2], /belum ada lintasan/); assert.doesNotMatch(d.baris[2], /belum ada lintasan.*belum ada lintasan/); assert.match(d.baris[3], /sinyal lemah/);
        assert.doesNotMatch(d.baris.slice(2).join(' '), /\b0\b/, 'tak sah tidak bernilai 0');
        assert.match(d.lh, /Pertanian/); assert.doesNotMatch(d.lh, /Lahan terbuka/); assert.equal(d.bar, 3); assert.match(d.lh, /radar buta/);
        assert.match(d.mt, /Data/); assert.match(d.mt, /Deteksi/); assert.match(d.mt, /Dampak/); assert.match(d.mt, /Catatan/); assert.match(d.mt, /belum dijalankan/);
        assert.match(d.jd, /Kaji cepat\s+banjir dari radar satelit/); assert.ok(!d.ft); assert.doesNotMatch(d.semua, KATA_DILARANG); assert.doesNotMatch(d.semua, /\bnull\b|undefined|NaN|\[object/);
        // klik baris: sorotan seketika, sel kab terpilih dimuat dari rute berkas
        await T.eval(`document.querySelectorAll('#kj-kab tbody tr')[1].click()`);
        assert.equal(await T.eval(`document.querySelectorAll('#kj-kab tbody tr')[1].getAttribute('aria-current')`), 'true');
        await T.tungguFungsi(`document.querySelector('#kj-peta').innerText.includes('titik genangan baru')`, 1500).catch(() => {});
        // segmen citra: radar punya pasangan, warna asli tertutup awan, tanpa 0
        await T.eval(`document.querySelectorAll('#kj-kab tbody tr')[0].click()`); await T.tungguFungsi(`document.querySelector('#kj-citra .geser, #kj-citra .geser-gagal, #kj-citra .sk-citra-dua')`, 8000);
        await T.eval(`[...document.querySelectorAll('#kj-citra .seg button')].find(b => /Warna asli/.test(b.innerText)).click()`);
        await T.tungguFungsi(`document.querySelector('#kj-citra').innerText.includes('tertutup awan')`, 8000);
        assert.deepEqual(galatNyata(T), []); assert.ok(!s.hilang.some(x => /api/.test(x)));
        await T.ukuran(390, 844); await T.buka(`${s.url}/siklus/kaji/${SID}`, {tunggu: '#kj-kab tbody tr'});
        const o = await T.eval(`[...document.querySelectorAll('.sk-detail section')].map(x => x.id)`); assert.deepEqual(o.slice(0, 2), ['kj-gfm', 'kj-kab'], 'urutan DOM'); const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di 390: ${l.sw} > ${l.iw}`);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('keadaan: berkas hasil rusak tidak mengosongkan halaman; hasil belum ada tertulis belum ada lintasan, bukan nol', async () => {
      for (const [status, cocok] of [['rusak', /Berkas hasil rusak/], ['menunggu', /Belum ada lintasan radar sejak 26 Nov 2025/]]) {
        const s = await sajikan(api(null, status));
        try {
          const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/kaji/${SID}`, {tunggu: '#kj-gfm'});
          const d = await T.eval(`({gf: document.querySelector('#kj-gfm').innerText, kep: !!document.querySelector('#kj-kepala'), meja: !!document.querySelector('#kj-meja'), semua: document.body.innerText})`);
          assert.match(d.gf, cocok); assert.ok(d.kep && d.meja, 'kartu lain tetap'); assert.doesNotMatch(d.semua, KATA_DILARANG); assert.doesNotMatch(d.gf, /\b0 ha\b|\b0 sampai 0\b/); await T.tutup();
        } finally { await s.tutup(); }
      }
    });
  } finally { await pb.tutup(); }
});
