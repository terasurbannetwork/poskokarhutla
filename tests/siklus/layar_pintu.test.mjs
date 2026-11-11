// Layar pintu /siklus dan registri (SK-100, SK-101; UJ-F7-05): empat fase menurut peran, kartu hanya yang diberikan server, registri sumber, ProfilWilayah.buka(kode4) dari kartu wilayah.
// Jalan: node --test tests/siklus/layar_pintu.test.mjs   (tanpa Chrome, uji peramban dilewati)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import path from 'node:path';
import {sajikan, bukaPeramban, cariChrome, galatNyata, PUB} from './_layar.mjs';

runInThisContext(readFileSync(path.join(PUB, 'inti/format.js'), 'utf8') + ';globalThis.fmt = fmt;');
const {fasePintu, faseAwal, hitungStrip, profilTermuat} = await import('../../public/siklus/pintu.js');
const {ukuran, gabung} = await import('../../public/siklus/registri.js');

const KJ = 'KJ-2026-9A2WGN3G', NOW = Date.parse('2026-11-10T03:00:00Z');
const kt = (kelas, kode, layar, nama, href, ekstra = {}) => ({kelas, kode, layar, nama, href, urgensi: null, ...ekstra});
const KARTU = [kt(1, 'kejadian', 'kejadian', 'banjir: Banjir Bogor', `/siklus/kejadian/${KJ}`, {fase: 'tanggap', hari_ke: 4, urgensi: 3}), kt(2, 'pdna', 'kejadian', 'PDNA: banjir: Banjir Bogor', `/siklus/kejadian/${KJ}`, {urgensi: 5}),
  kt(2, 'renkon', 'renkon', 'Renkon kedaluwarsa: Kontingensi Bogor', '/siklus/renkon/a1a2a3a4a5a6a7a8', {urgensi: -2, status: 'kedaluwarsa'}), kt(4, 'gladi', 'gladi', 'Gladi ruang siap', '/siklus/gladi/b1b2b3b4b5b6b7b8'),
  kt(5, 'paparan', 'paparan', 'Peta paparan bangunan', '/siklus/paparan'), kt(5, 'registri', 'registri', 'Registri sumber data', '/siklus/registri'), kt(5, 'masadepan', 'masadepan', 'Risiko masa depan (hipotesis, bukan ramalan kejadian)', '/siklus/masa-depan', {yakin: 'hipotesis'})];
const PINTU = {peran: 'KO', fase_aktif: ['tanggap', 'kesiapsiagaan'], kartu: KARTU, peringatan: [{jenis: 'pdna', kejadian_id: KJ, batas_pdna: '2026-11-12', akhir_darurat: '2026-11-19', sisa_hari: 9}], dibuat: '2026-11-10T03:00:00Z'};
const api = (pintu = PINTU, registri = null) => (m, j) => {
  if (j === '/api/staf/saya') return [200, {staf: {peran: ['koordalops']}}];
  if (j === '/api/akademisi/saya') return [401, {}];
  if (j === '/api/siklus/pintu') return [200, pintu];
  if (j === '/api/siklus/kejadian') return [200, {baris: [{id: KJ, jenis: 'banjir', kab4: '3201', mulai: '2026-11-07', fase: 'tanggap'}, {id: 'KJ-2026-AAAAAAAA', jenis: 'gempa', kab4: '3301', mulai: '2026-10-01', fase: 'selesai'}], berikut: null}];
  if (j === '/api/siklus/registri') return registri ? [200, registri] : [404, {galat: 'menunggu: registri sumber belum dibangun'}];
  return null;
};
const SALAH = /\bnull\b|undefined|NaN|\[object/;

test('fungsi murni: kartu ke fase, fase awal, strip angka, profil tidak termuat tanpa skrip', () => {
  assert.equal(fasePintu(KARTU[0]), 'tanggap'); assert.equal(fasePintu(KARTU[1]), 'tanggap'); assert.equal(fasePintu(KARTU[2]), 'siaga'); assert.equal(fasePintu(KARTU[3]), 'siaga');
  assert.equal(fasePintu(KARTU[4]), 'sebelum'); assert.equal(fasePintu(KARTU[6]), 'sebelum'); assert.equal(fasePintu(kt(3, 'pemulihan', 'kejadian', 'x', '/')), 'pulih'); assert.equal(fasePintu(kt(2, 'r3p', 'pulih', 'x', '/')), 'pulih');
  assert.equal(faseAwal(KARTU), 'tanggap'); assert.equal(faseAwal(KARTU.slice(4)), 'sebelum'); assert.equal(faseAwal([]), 'sebelum');
  assert.deepEqual(hitungStrip(PINTU), {aktif: 1, tanggap: 1, pdna: 1, pemulihan: 0, kedaluwarsa: 1}); assert.deepEqual(hitungStrip({}), {aktif: 0, tanggap: 0, pdna: 0, pemulihan: 0, kedaluwarsa: 0});
  assert.equal(profilTermuat(), false, 'tanpa profil_wilayah.js kartu wilayah tidak dibuat');
});
test('registri: gabung dengan atribusi, belum diambil di bawah, byte kosong menunggu bukan 0', () => {
  assert.equal(ukuran(null), null); assert.equal(ukuran(512), '512 byte'); assert.match(ukuran(1048576 * 3), /^3 MB$/); assert.equal(ukuran(-1), null);
  const g = gabung({sumber: [{id: 'x', status_uji: 'hidup', diambil: null, byte: null}, {id: 'gdacs', status_uji: 'hidup', diambil: '2026-11-09', byte: 2048}]}, {sumber: [{id: 'gdacs', nama: 'GDACS', atribusi: 'a', dipakai_di: ['F1']}]});
  assert.deepEqual(g.map((x) => x.id), ['gdacs', 'x']); assert.equal(g[0].nama, 'GDACS'); assert.equal(g[1].nama, 'x'); assert.deepEqual(g[1].dipakai_di, []);
});

const chrome = cariChrome();
test('layar pintu dan registri di Chrome nyata (1440 dan 390)', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('pintu: fase awal Tanggap, ganti fase mengecat kartu fase itu dalam satu frame, kartu yang tidak diberikan tidak tampil, tanpa kata null', async () => {
      const s = await sajikan(api());
      try {
        for (const [w, hh] of [[1440, 900], [390, 844]]) {
          const T = await pb.tab(); await T.ukuran(w, hh); await T.buka(`${s.url}/siklus`, {tunggu: '#pintu .sk-pintu a'});
          const d = await T.eval(`({jd: document.querySelector('#pintu h3').innerText, kartu: [...document.querySelectorAll('#pintu .sk-pintu a')].map((a) => a.dataset.kode), ey: document.querySelector('#pintu .ex-ey').innerText,
            semua: document.body.innerText, ft: !!document.querySelector('.ex-ft'), ex: document.querySelectorAll('.ex.ex-std').length, seg: [...document.querySelectorAll('#pintu .seg.penuh button')].map((b) => b.textContent.trim())})`);
          assert.match(d.jd, /1 kejadian aktif, 1 sedang tanggap, 1 menunggu PDNA/); assert.deepEqual(d.kartu, ['kejadian', 'pdna']); assert.match(d.ey, /Koordalops/i); assert.deepEqual(d.seg, ['Sebelum', 'Siaga', 'Tanggap', 'Pulih']);
          assert.ok(!d.ft && d.ex === 3); assert.doesNotMatch(d.semua, SALAH); assert.doesNotMatch(d.semua, /·|—/);
          assert.match(d.semua, /Batas PDNA[\s\S]*sisa 9 hari/); assert.match(d.semua, /Renkon kedaluwarsa[\s\S]*lewat 2 hari/); assert.doesNotMatch(d.semua, /sisa -/);
          const r = await T.eval(`(async () => { const t0 = performance.now(); const b = [...document.querySelectorAll('#pintu .seg.penuh button')].find((x) => /Sebelum/.test(x.textContent)); b.click(); const p = b.getAttribute('aria-pressed');
            await new Promise((o) => requestAnimationFrame(() => requestAnimationFrame(o))); return {p, ms: performance.now() - t0, kartu: [...document.querySelectorAll('#pintu .sk-pintu a')].map((a) => a.dataset.kode)}; })()`);
          assert.equal(r.p, 'true'); assert.ok(r.ms < 200, `${Math.round(r.ms)} ms`); assert.deepEqual(r.kartu, ['paparan', 'registri', 'masadepan']);
          const p = await T.eval(`(async () => { [...document.querySelectorAll('#pintu .seg.penuh button')].find((x) => /Pulih/.test(x.textContent)).click(); await new Promise((o) => requestAnimationFrame(() => requestAnimationFrame(o))); return document.querySelector('#pintu .sk-kead')?.innerText ?? ''; })()`);
          assert.match(p, /Belum ada layar yang hidup/);
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`); assert.deepEqual(galatNyata(T), []); await T.tutup();
        }
      } finally { await s.tutup(); }
    });
    await t.test('kartu wilayah membuka ProfilWilayah.buka(kode4) dari kepala situs bersama; hanya kejadian aktif (UJ-F7-05)', async () => {
      const s = await sajikan(api());
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus`, {tunggu: '#pintu .sk-pintu a'});
        await T.eval(`new Promise((o) => { const t = setInterval(() => { if (document.querySelector('.ex-std tbody button')) { clearInterval(t); o(); } }, 50); })`);
        const d = await T.eval(`({n: document.querySelectorAll('.ex-std tbody tr').length, termuat: typeof ProfilWilayah !== 'undefined', tombol: document.querySelectorAll('.ex-std tbody button').length, t: document.body.innerText})`);
        assert.equal(d.n, 1, 'kejadian selesai tidak masuk kartu kejadian aktif'); assert.ok(d.termuat); assert.equal(d.tombol, 1); assert.match(d.t, /Kabupaten|Bogor/);
        const buka = await T.eval(`(async () => { const lama = ProfilWilayah.buka; globalThis.__kode = null; ProfilWilayah.buka = (k) => { globalThis.__kode = k; }; document.querySelector('.ex-std tbody button').click();
          await new Promise((o) => requestAnimationFrame(() => requestAnimationFrame(o))); await new Promise((o) => setTimeout(o, 50)); ProfilWilayah.buka = lama; return globalThis.__kode; })()`);
        assert.equal(buka, '3201'); await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('registri: sumber belum diambil menunggu bukan 0 byte; 404 menjadi keadaan kosong', async () => {
      const reg = {sumber: [{id: 'gdacs', status_uji: 'hidup', diambil: '2026-11-09', byte: 2048, lisensi: 'x'}, {id: 'petabencana', status_uji: 'bersyarat', diambil: null, byte: null, lisensi: 'y'}]};
      const s = await sajikan(api(PINTU, reg)), s2 = await sajikan(api());
      try {
        for (const [w, hh] of [[1440, 900], [390, 844]]) {
          const T = await pb.tab(); await T.ukuran(w, hh); await T.buka(`${s.url}/siklus/registri`, {tunggu: '#registri tbody tr'});
          const d = await T.eval(`({jd: document.querySelector('#registri h3').innerText, t: document.querySelector('#registri').innerText, n: document.querySelectorAll('#registri tbody tr').length, semua: document.body.innerText})`);
          assert.equal(d.n, 2); assert.match(d.jd, /1 dari 2 sumber sudah pernah diambil/); assert.match(d.t, /2 KB/); assert.match(d.t, /belum pernah diambil/); assert.match(d.t, /menunggu/i); assert.doesNotMatch(d.t, /\b0 byte\b/); assert.doesNotMatch(d.semua, SALAH);
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`); assert.deepEqual(galatNyata(T), []); await T.tutup();
        }
        const T = await pb.tab(); await T.buka(`${s2.url}/siklus/registri`, {tunggu: '#registri .sk-kead'});
        assert.match(await T.eval(`document.querySelector('#registri .sk-kead').innerText`), /belum dibangun/i); await T.tutup();
      } finally { await s.tutup(); await s2.tutup(); }
    });
  } finally { await pb.tutup(); }
});
