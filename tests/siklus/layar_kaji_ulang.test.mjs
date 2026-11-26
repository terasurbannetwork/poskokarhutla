// KU-07..KU-09 (RENCANA-UJI T19): kartu kaji ulang di halaman kejadian, pelajaran dan rekomendasi, laci riwayat, cetak A4, halaman /siklus/kaji-ulang.
// Model murni di Node; layar di Chrome nyata dengan CSP asli dan API palsu (tanpa Chrome uji peramban dilewati).
// Jalan: node --test tests/siklus/layar_kaji_ulang.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {sajikan, bukaPeramban, cariChrome, galatNyata, KJ} from './_layar.mjs';
runInThisContext(readFileSync('public/inti/format.js', 'utf8') + ';globalThis.fmt = fmt;');
const M = await import('../../public/siklus/kaji_ulang.js');
const SUMBER = readFileSync('public/siklus/kaji_ulang.js', 'utf8');

test('menit menjadi kalimat; kosong = tidak ada data, tidak pernah 0', () => {
  assert.equal(M.teksMenit(null), 'tidak ada data');
  assert.equal(M.teksMenit(null, 'kurang dari semenit'), 'kurang dari semenit');
  assert.equal(M.teksMenit(45), '45 menit');
  assert.equal(M.teksMenit(125), '2 jam 5 menit');
  assert.equal(M.teksMenit(60 * 24 * 3 + 120), '3 hari 2 jam');
});
test('durasi tugas: tahap tanpa target tanpa vonis, n = 1 tanpa persentil, n = 0 tidak ada data', () => {
  const b = M.barisDurasi({status: 'ada', tahap: [
    {dari: 'tugas', ke: 'konfirmasi', n: 3, p50_menit: 30, p90_menit: 90, target_menit: 360, dalam_target_pct: 66.7},
    {dari: 'konfirmasi', ke: 'tiba', n: 1, nilai_menit: 40, p50_menit: null, p90_menit: null, target_menit: null, dalam_target_pct: null, ket: 'n = 1'},
    {dari: 'tiba', ke: 'padam', n: 0, p50_menit: null, p90_menit: null, target_menit: null, dalam_target_pct: null, ket: 'tidak ada data'}]});
  assert.deepEqual([b[0].median, b[0].p90, b[0].dalam], ['30 menit', '1 jam 30 menit', '66,7 persen']);
  assert.deepEqual([b[1].median, b[1].p90, b[1].target, b[1].dalam], ['40 menit', 'n = 1', 'tanpa target', 'tanpa target']);
  assert.deepEqual([b[2].n, b[2].median, b[2].p90], ['tidak ada data', 'tidak ada data', 'tidak ada data']);
  assert.deepEqual(M.barisDurasi({status: 'tidak ada data'}), []);
  for (const r of b) for (const v of Object.values(r)) assert.doesNotMatch(String(v), /^0( |$)/);
});
test('status rekomendasi: tertutup hanya selesai bercatatan 20-300; lewat tenggat tidak mengubah status', () => {
  const hari = '2026-11-26';
  assert.deepEqual(M.modelRek({status: {status: 'proses'}, tenggat: '2026-11-01'}, hari), {s: 'proses', label: 'Dikerjakan', tertutup: false, lewat: true});
  assert.equal(M.modelRek({status: {status: 'selesai', catatan: 'pendek'}, tenggat: '2026-11-01'}, hari).tertutup, false);
  assert.equal(M.modelRek({status: {status: 'selesai', catatan: 'x'.repeat(20)}, tenggat: '2026-11-01'}, hari).lewat, false);
  assert.equal(M.modelRek({status: null, tenggat: '2027-01-01'}, hari).s, 'belum');
  assert.equal(M.ringkasRek([], hari), 'tidak ada data', 'tanpa rekomendasi bukan 100 persen');
  assert.equal(M.ringkasRek([{status: {status: 'selesai', catatan: 'x'.repeat(25)}}, {status: {status: 'belum'}}], hari), '1 dari 2 tertutup');
});
test('isian rekomendasi dan status: aturan sama dengan server', () => {
  const hari = '2026-11-26';
  assert.ok(M.badanRek({teks: 'pendek', unit: 'Dit A', tenggat: '2027-01-01'}, hari).galat);
  assert.ok(M.badanRek({teks: 'Perbarui prosedur siaga', unit: 'Dit A', tenggat: ''}, hari).galat, 'tenggat wajib');
  assert.ok(M.badanRek({teks: 'Perbarui prosedur siaga', unit: 'Dit A', tenggat: '2026-11-30'}, hari).galat, 'kurang dari 7 hari');
  assert.ok(M.badanRek({teks: 'Perbarui prosedur siaga', unit: 'Dit A', tenggat: '2028-01-01'}, hari).galat, 'lebih dari 365 hari');
  assert.deepEqual(M.badanRek({teks: ' Perbarui prosedur siaga ', unit: 'Dit A', tenggat: '2027-01-25'}, hari).badan, {teks: 'Perbarui prosedur siaga', unit: 'Dit A', tenggat: '2027-01-25', pelajaran_id: null});
  assert.ok(M.badanStatus({nomor: 1, status: 'selesai', catatan: 'kurang'}).galat);
  assert.ok(M.badanStatus({nomor: 1, status: 'proses', tidak: true}).galat, 'tidak dilanjutkan hanya bersama selesai');
  assert.deepEqual(M.badanStatus({nomor: 1, status: 'selesai', catatan: 'Tidak jadi, sudah dicakup rencana kontinjensi', tidak: true}).badan,
    {nomor: 1, status: 'selesai', catatan: 'Tidak jadi, sudah dicakup rencana kontinjensi', tidak_dilanjutkan: true});
});
test('lampiran: butir sesudah potret beku dipisah; per unit tanpa total gabungan', () => {
  const {inti, lampiran} = M.pisahLampiran([{id: 'a'}, {id: 'b'}], [{id: 'a'}], 'id');
  assert.deepEqual([inti.map(x => x.id), lampiran.map(x => x.id)], [['a'], ['b']]);
  assert.deepEqual(M.pisahLampiran([{nomor: 1}], null, 'nomor').lampiran, []);
  assert.deepEqual(M.pisahLampiran([{id: 'a', dibuat: 5}, {id: 'b', dibuat: 20}], null, 'id', 10).lampiran.map(x => x.id), ['b'], 'layar hidup: dibuat sesudah pengesahan');
  const u = M.perUnit([{unit: 'B', tertutup: false, lewat_tenggat: true}, {unit: 'A', tertutup: true, lewat_tenggat: false}, {unit: 'B', tertutup: false, lewat_tenggat: false}]);
  assert.deepEqual(u, [{unit: 'B', terbuka: 2, lewat: 1, tertutup: 0}, {unit: 'A', terbuka: 0, lewat: 0, tertutup: 1}]);
});
test('sumber: teks tampil tanpa titik tengah, tanpa "aman", tanpa kaki sumber, tanpa kapital penuh; rute sesuai DESAIN-TEKNIS', () => {
  assert.doesNotMatch(SUMBER, /·|\baman\b|Sumber: |innerHTML|toLocaleString\(/);
  for (const t of [...Object.values(M.TAHAP_NAMA), ...Object.values(M.ALASAN), ...Object.values(M.DILEWATI), ...Object.values(M.KATEGORI), ...Object.values(M.STATUS_REK).map(x => x[0])]) assert.doesNotMatch(t, /^[A-Z ]{2,}$/);
  for (const r of ['/kaji-ulang/kandidat', '/kaji-ulang/rekomendasi', '/pelajaran', '/rekomendasi/status', '/rekomendasi/riwayat?nomor=', '/sahkan', '?versi=']) assert.ok(SUMBER.includes(r), r);
  assert.doesNotMatch(SUMBER, /\bnama\b.*penugasan|oleh_nama.*potret/, 'tanpa nama personel lapangan');
});

/* ---------- Chrome ---------- */
const kini = Date.now(), JAM = 36e5;
const DRAF = {kejadian: {id: KJ, jenis: 'banjir', nama: 'Banjir Bogor', fase: 'selesai', kab: ['3201']},
  linimasa: [{waktu: kini - 50 * JAM, tahap: 'deteksi', sumber: 'sk_kejadian', ket: 'Kejadian tercatat', ref: null}, {waktu: kini - 49 * JAM, tahap: 'deteksi', sumber: 'tugas_api', ket: 'Deteksi banjir', ref: 't1', perkiraan: true},
    {waktu: kini - 40 * JAM, tahap: 'layanan', sumber: 'lf_riwayat', ket: 'listrik merah', ref: '3201'}, {waktu: kini - 10 * JAM, tahap: 'pulih', sumber: 'sk_jejak', ket: 'Fase menjadi selesai', ref: null}],
  tidak_dimuat: 0,
  durasi: {tugas: {status: 'ada', n_tugas: 1, tahap: [{dari: 'tugas', ke: 'konfirmasi', n: 0, p50_menit: null, p90_menit: null, target_menit: 360, dalam_target_pct: null, ket: 'tidak ada data'}]},
    kejadian: {deteksi_ke_tanggap: {menit: null, ket: 'tidak ada data'}, tanggap_ke_pulih: {menit: 2400}, layanan_merah_ke_hijau: {status: 'tidak ada data'}}},
  tugas: {status: 'ada', terhubung: 1, dimuat: 1, tidak_dimuat: 0, tanpa_tugas: 0}, layanan: {status: 'belum diaktifkan'}, koordinasi: {status: 'tidak ada data'},
  catatan_lapangan: {status: 'ada', butir: [{id: 'op1', tugas: 't1', catatan: 'Pompa portabel terlambat datang dari gudang provinsi', waktu: kini - 30 * JAM}]},
  celah: [{jenis: 'tahap', tahap: 'konfirmasi', ket: 'tidak ada data'}, {jenis: 'tugas_tanpa_konfirmasi', n: 1, ket: 'tugas tanpa konfirmasi lapangan'}]};
const REK = [{id: 'r1', nomor: 1, teks: 'Tambah stok pompa portabel di gudang kabupaten', unit: 'Direktorat Logistik', tenggat: '2026-01-10', status: {status: 'proses', catatan: null}, tidak_dilanjutkan: 0, dibuat: kini - 8 * JAM},
  {id: 'r2', nomor: 2, teks: 'Perbarui jalur kabar lapangan ke Pusdalops', unit: 'Pusdalops', tenggat: '2027-06-01', status: {status: 'belum'}, tidak_dilanjutkan: 0, dibuat: kini - JAM}];
const PEL = [{id: 'a'.repeat(16), kategori: 'baik', teks: 'Kabar dari BPBD masuk kurang dari satu jam', rujuk: [], versi_tambah: 0, dibuat: kini - 9 * JAM}, {id: 'b'.repeat(16), kategori: 'perbaiki', teks: 'Pompa portabel terlambat datang', rujuk: [], versi_tambah: 1, dibuat: kini - 2 * JAM}];
const KAJI = {status: 'disahkan', versi: 1, disahkan_pada: kini - 5 * JAM};
const POTRET = {versi: 1, disahkan_pada: kini - 5 * JAM, pelajaran: [PEL[0]], rekomendasi: [{nomor: 1}], draf: DRAF};
const DETAIL = {kejadian: {id: KJ, nama: 'Banjir Bogor', jenis: 'banjir', kab4: '3201', mulai: '2026-11-05', fase: 'selesai', publik: 0}, wilayah: 'Bogor, Jawa Barat', kab: ['3201'], sumber: [], jejak: [], kaji_ids: [], pulih_ids: []};
const PERAN = {ko: [200, {staf: {peran: ['koordalops']}}], pm: [200, {staf: {peran: ['pimpinan']}}]};

const buatApi = (peran, {mulai = true} = {}) => (metode, jalur, q) => {
  if (jalur === '/api/staf/saya') return PERAN[peran];
  if (jalur === '/api/akademisi/saya') return [401, {}];
  if (jalur === `/api/siklus/kejadian/${KJ}`) return [200, DETAIL];
  const b = `/api/siklus/kejadian/${KJ}/kaji-ulang`, tulis = peran === 'ko';
  if (jalur === b && metode === 'GET') {
    if (q.get('versi')) return [200, {kejadian_id: KJ, kaji: KAJI, pelajaran: PEL, rekomendasi: REK, potret: {versi: 1, potret: POTRET}}];
    return [200, {kejadian_id: KJ, kaji: mulai ? KAJI : null, pelajaran: mulai ? PEL : [], rekomendasi: mulai ? REK : [], draf: DRAF, belum_bertaut: null, boleh: {tulis, sahkan: tulis}}];
  }
  if (jalur === `${b}/rekomendasi/riwayat`) return [200, [{waktu: kini - JAM, status: 'proses', catatan: 'pengadaan berjalan', langkah: 'x', oleh_nama: 'Staf'}]];
  if (jalur.startsWith(b) && metode === 'POST') return [201, {ok: true}];
  if (jalur === '/api/siklus/kaji-ulang/kandidat') return [200, {baris: [{id: KJ, jenis: 'banjir', nama: 'Banjir Bogor', fase: 'selesai', mulai: '2026-11-05', kab: 3, alasan: ['tiga_kab'], dilewati: ['lifeline_belum_aktif'], kaji: {status: 'disahkan', versi: 1}}], terpotong: false}];
  if (jalur === '/api/siklus/kaji-ulang/rekomendasi') return [200, {hari: '2026-11-26', ringkas: {total: 2, terbuka: 2, lewat_tenggat: 1, tertutup: 0},
    baris: [{kejadian_id: KJ, nomor: 1, teks: REK[0].teks, unit: REK[0].unit, tenggat: REK[0].tenggat, status: 'proses', tidak_dilanjutkan: false, tertutup: false, lewat_tenggat: true}, {kejadian_id: KJ, nomor: 2, teks: REK[1].teks, unit: 'Pusdalops', tenggat: REK[1].tenggat, status: 'belum', tidak_dilanjutkan: false, tertutup: false, lewat_tenggat: false}], terpotong: false}];
  return null;
};

const chrome = cariChrome();
test('layar kaji ulang di Chrome nyata', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('kartu standar, tidak ada data bukan 0, pelajaran dua kolom, rekomendasi lewat tenggat, lampiran setelah versi', async () => {
      const s = await sajikan(buatApi('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900);
        await T.buka(`${s.url}/siklus/kejadian/${KJ}`, {tunggu: '#k-kajiulang .ku-baris'});
        const d = await T.eval(`(() => { const k = document.querySelector('#k-kajiulang'); const kartu = [...k.querySelectorAll('section.ex')];
          return {n: kartu.length, std: kartu.every(x => x.classList.contains('ex-std') && x.querySelector('.ex-ey')), hl: !!k.querySelector('h3 .hl'), ft: !!k.querySelector('.ex-ft'),
            judul: kartu.map(x => x.querySelector('h3').textContent.trim()), teks: k.textContent, baris: k.querySelectorAll('.ku-baris').length, lewat: k.querySelectorAll('.ku-lewat').length,
            lamp: [...k.querySelectorAll('.ku-lamp')].map(x => x.textContent), kol: k.querySelectorAll('.ku-kol').length, tombol: [...k.querySelectorAll('[data-aksi]')].map(x => x.textContent.trim())}; })()`);
        assert.ok(d.std && !d.hl && !d.ft, 'kartu standar, kepala nama seksi tanpa .hl, tanpa kaki');
        assert.deepEqual(d.judul, ['Kaji ulang', 'Linimasa', 'Durasi tahap', 'Celah data', 'Layanan dasar', 'Koordinasi', 'Catatan lapangan', 'Pelajaran', 'Rekomendasi']);
        assert.match(d.teks, /tidak ada data/); assert.match(d.teks, /belum diaktifkan/); assert.match(d.teks, /perkiraan/); assert.match(d.teks, /Listrik lumpuh/);
        assert.match(d.teks, /1 hari 16 jam/, 'tanggap ke pulih 2400 menit');
        assert.doesNotMatch(d.teks, /\b0 menit|\bnull\b|undefined|NaN|·|\baman\b/);
        assert.equal(d.baris, 2); assert.equal(d.lewat, 1, 'hanya rekomendasi 1 lewat tenggat');
        assert.ok(d.lamp.some(x => /Lampiran setelah versi 1/.test(x)), 'butir sesudah potret = lampiran');
        assert.equal(d.kol, 2 * 2, 'dua kolom pelajaran di inti dan lampiran');
        assert.ok(d.tombol.includes('Sahkan ulang') && d.tombol.includes('Cetak'));
        assert.deepEqual(galatNyata(T), []); assert.deepEqual(s.hilang, []);
        // laci membuka seketika (chrome urgent), riwayat menyusul
        const seketika = await T.eval(`(() => { document.querySelector('#k-kajiulang .ku-baris').click(); return !!document.querySelector('dialog.ku-laci[open]'); })()`);
        assert.equal(seketika, true);
        await T.tungguFungsi(`/pengadaan berjalan/.test(document.querySelector('dialog.ku-laci').textContent)`);
        // selesai tanpa catatan penutup ditolak di layar, tanpa kiriman
        await T.eval(`(() => { const d = document.querySelector('dialog.ku-laci'); d.querySelector('select').value = 'selesai'; [...d.querySelectorAll('[data-aksi=utama]')].find(b => /Simpan status/.test(b.textContent)).click(); })()`);
        assert.ok(!s.catat.some(c => c.metode === 'POST' && c.jalur.endsWith('/rekomendasi/status')), 'selesai tanpa catatan 20 karakter tidak dikirim');
        await T.eval(`(() => { const d = document.querySelector('dialog.ku-laci'); d.querySelector('textarea').value = 'Pompa sudah tiba di gudang kabupaten pada pekan ini'; [...d.querySelectorAll('[data-aksi=utama]')].find(b => /Simpan status/.test(b.textContent)).click(); })()`);
        await T.tungguFungsi(`!document.querySelector('dialog.ku-laci')`);
        const k = s.catat.find(c => c.metode === 'POST' && c.jalur.endsWith('/rekomendasi/status'));
        assert.deepEqual(k.badan, {nomor: 1, status: 'selesai', catatan: 'Pompa sudah tiba di gudang kabupaten pada pekan ini', tidak_dilanjutkan: false}); assert.equal(k.xpb, '1');
        // cetak A4: lembar versi beku, tanpa tombol
        await T.eval(`window.print = () => { window.__cetak = document.querySelector('.ku-lembar').textContent + '|' + document.querySelectorAll('.ku-lembar button, .ku-lembar [data-aksi]').length; };`);
        await T.klikTeks('#k-kajiulang [data-aksi]', '^Cetak$');
        await T.tungguFungsi('!!window.__cetak');
        const c = await T.eval('window.__cetak');
        assert.match(c, /versi 1, disahkan/i); assert.match(c, /Lampiran setelah versi 1/); assert.match(c, /\|0$/, 'lembar cetak tanpa tombol');
        assert.ok(s.catat.some(x => x.jalur.endsWith('/kaji-ulang') && x.q.versi === '1'), 'cetak membaca potret beku');
        await T.ukuran(390, 844); await T.buka(`${s.url}/siklus/kejadian/${KJ}`, {tunggu: '#k-kajiulang .ku-baris'});
        const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di 390: ${l.sw} > ${l.iw}`);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('belum dimulai: tombol Mulai untuk penulis, Pimpinan tanpa tombol tulis', async () => {
      for (const [peran, ada] of [['ko', true], ['pm', false]]) {
        const s = await sajikan(buatApi(peran, {mulai: false}));
        try {
          const T = await pb.tab(); await T.ukuran(1440, 900);
          await T.buka(`${s.url}/siklus/kejadian/${KJ}`, {tunggu: '#k-kajiulang .ku-ket'});
          await T.tungguFungsi(`document.querySelectorAll('#k-kajiulang section.ex').length > 1`);
          const tb = await T.eval(`[...document.querySelectorAll('#k-kajiulang [data-aksi]')].map(x => x.textContent.trim())`);
          assert.equal(tb.includes('Mulai kaji ulang'), ada, peran);
          assert.ok(!tb.includes('Tambah') && !tb.includes('Sahkan'), 'pelajaran dan rekomendasi baru tampil sesudah dimulai');
          if (ada) { await T.klikTeks('#k-kajiulang [data-aksi]', '^Mulai kaji ulang$'); for (let i = 0; i < 50 && !s.catat.some(c => c.metode === 'POST'); i++) await new Promise(r => setTimeout(r, 100)); }
          await T.tutup();
          if (ada) assert.ok(s.catat.some(c => c.metode === 'POST' && c.jalur === `/api/siklus/kejadian/${KJ}/kaji-ulang`));
        } finally { await s.tutup(); }
      }
    });
    await t.test('halaman /siklus/kaji-ulang: kandidat beralasan, rekomendasi terbuka, per unit', async () => {
      const s = await sajikan(buatApi('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900);
        await T.buka(`${s.url}/siklus/kaji-ulang`, {tunggu: '#ku-unit table'});
        const d = await T.eval(`({kand: document.querySelector('#ku-kandidat').textContent, rek: document.querySelectorAll('#ku-rekomendasi tbody tr').length, unit: document.querySelectorAll('#ku-unit tbody tr').length, hl: !!document.querySelector('#sk h3 .hl'), teks: document.querySelector('#sk').textContent})`);
        assert.match(d.kand, /menyentuh 3 kab atau lebih/); assert.match(d.kand, /status layanan belum diaktifkan/);
        assert.equal(d.rek, 2); assert.equal(d.unit, 2); assert.ok(!d.hl); assert.doesNotMatch(d.teks, /\bnull\b|undefined|·/);
        const urgent = await T.eval(`(() => { const b = [...document.querySelectorAll('#ku-rekomendasi .seg button')].find(x => /Lewat/.test(x.textContent)); b.click(); return b.getAttribute('aria-pressed'); })()`);
        assert.equal(urgent, 'true');
        await T.tungguFungsi(`document.querySelectorAll('#ku-rekomendasi tbody tr').length === 1`);
        assert.deepEqual(galatNyata(T), []);
        await T.tutup();
      } finally { await s.tutup(); }
    });
  } finally { await pb.tutup(); }
});
