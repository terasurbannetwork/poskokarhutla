// Layar Kaji Cepat (SK-057; UJ-F3-09): rentang dua ujung, pil estimasi model, PAGER dan ITB berdampingan, galat kalibrasi dan peringatan faktor 5,341 melebihi pita 4,
// isian petugas meja berdampingan, menunggu data bukan nol, tanpa kata null di layar. Uji balik tanpa ambang lolos (U18).
// Jalan: node --test tests/siklus/layar_kaji.test.mjs   (tanpa Chrome, uji peramban dilewati)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import path from 'node:path';
import {sajikan, bukaPeramban, cariChrome, galatNyata, PUB} from './_layar.mjs';
import {rentangSah, rentangTeks, bandingRentang} from '../../public/siklus/kaji.js';

runInThisContext(readFileSync(path.join(PUB, 'inti/format.js'), 'utf8') + ';globalThis.fmt = fmt;');   // fmt klasik dari /inti/format.js, seperti di peramban

const KJ = {g: 'KJ-2026-9A2WGN3G', b: 'KJ-2026-BANJIR01', w: 'KJ-2026-WAIT0001'}, SID = {g: 'a1b2c3d4e5f60718', b: 'b1b2c3d4e5f60718', w: 'c1b2c3d4e5f60718'};
const NOW = Date.parse('2026-11-10T03:00:00Z');
const GALAT = {kalibrasi: 3.0586, faktor_loo: 5.341, n_gempa: 8, pita: 4, melebihi_pita: true};
const BARIS = {
  g: {id: SID.g, kejadian_id: KJ.g, model: 'gempa', versi: 2, status: 'dihitung', masukan: {sumber: 'usgs-shakemap', id: 'us6000tkt2', waktu_data: '2026-11-10T01:00Z'}, ringkas: {rentang: [22, 354], kelas: 'kuning', model: {pager: [22, 354], itb: [334, 334]}}, galat_kalibrasi: GALAT, yakin: 'estimasi-model', alasan_tarik: null, dihitung: NOW, diubah: NOW, hasil_r2: `siklus/saji/kaji/${KJ.g}.json`, dummy: 0},
  b: {id: SID.b, kejadian_id: KJ.b, model: 'banjir_jam1', versi: 1, status: 'diperiksa', masukan: {sumber: 'poligon'}, ringkas: {rentang: [600, 1400]}, galat_kalibrasi: null, yakin: 'estimasi-model', alasan_tarik: null, dihitung: NOW, diubah: NOW, dummy: 0},
  w: {id: SID.w, kejadian_id: KJ.w, model: 'gempa', versi: 1, status: 'menunggu_data', masukan: {sumber: 'usgs-shakemap', id: 'us6000wait'}, ringkas: {rentang: null}, galat_kalibrasi: null, yakin: 'estimasi-model', alasan_tarik: null, dihitung: NOW, diubah: NOW, hasil_r2: `siklus/saji/kaji/${KJ.w}.json`, dummy: 0},
};
const KEJ = [{id: KJ.g, jenis: 'gempa', kab4: '3301', mulai: '2026-11-10', fase: 'tanggap'}, {id: KJ.b, jenis: 'banjir', kab4: '3301', mulai: '2026-11-09', fase: 'tanggap'}, {id: KJ.w, jenis: 'gempa', kab4: '3301', mulai: '2026-11-10', fase: 'terdeteksi'}];
const RUMAH = {n: null, status: 'menunggu', alasan: 'kurva kerapuhan resmi tidak ditemukan'};
const HASIL = {
  g: {v: 1, model: 'gempa', masukan: BARIS.g.masukan, rumah_rusak: RUMAH},
  b: {bahaya: 'banjir', jiwa_terpapar: {worldpop: 667, dukcapil: 600, ghsl: null}, batas_atas_jam1: 1400, kerusakan: {status: 'kedalaman belum tersedia'}},
  w: {v: 1, model: 'gempa', masukan: BARIS.w.masukan, rumah_rusak: RUMAH, sementara: {rentang: [8, 90], model: {pager: [8, 90], itb: [40, 40]}, y: 'estimasi-model'}},
};
const MEJA = {catatan: 'isian petugas BPBD, bukan hasil model; angka berdampingan, tidak dijumlah', baris: [{id: 'm1', kec: 'Cilacap Selatan', desa: null, status: 'dikirim', tanggal: '2026-11-10', meninggal: 40, hilang: null, luka: 12, mengungsi: 300, rumah_rb: 5, rumah_rs: null, rumah_rr: 7}]};
const api = (peran, rekam = []) => (m, j, q, badan) => {
  if (j === '/api/staf/saya') return peran === 'sa' ? [401, {}] : [200, {staf: {peran: ['koordalops']}}];
  if (j === '/api/akademisi/saya') return peran === 'sa' ? [200, {peran: ['admin'], super: true}] : [401, {}];
  if (j === '/api/siklus/kejadian') return [200, {baris: KEJ, berikut: null}];
  if (j === '/api/siklus/kaji') { const k = Object.keys(KJ).find((x) => KJ[x] === q.get('kejadian_id')); return [200, {kejadian_id: q.get('kejadian_id'), baris: k ? [BARIS[k]] : []}]; }
  const mm = /^\/api\/siklus\/kaji\/([0-9a-f]{16})(\/status)?$/.exec(j);
  if (mm) {
    const k = Object.keys(SID).find((x) => SID[x] === mm[1]); if (!k) return null;
    if (mm[2]) { rekam.push(badan); return [200, {id: mm[1], status: badan.ke}]; }
    return [200, {kaji: BARIS[k], kejadian: KEJ.find((e) => e.id === KJ[k]), hasil: HASIL[k], hasil_status: 'ada', hasil_selaras: true, meja: k === 'g' ? MEJA : {catatan: MEJA.catatan, baris: []}}];
  }
  return null;
};
const SALAH = /\bnull\b|undefined|NaN|\[object/;

test('fungsi murni: rentang selalu dua ujung, menunggu bukan nol, petugas dibanding tanpa dijumlah', () => {
  assert.deepEqual(rentangSah([1, 2]), [1, 2]);
  for (const x of [null, undefined, [1], [1, 2, 3], ['1', 2], [1, NaN], [1, null]]) assert.equal(rentangSah(x), null, String(x));
  assert.match(rentangTeks([22, 354]), /^22 sampai 354$/); assert.equal(rentangTeks(null), null);
  assert.deepEqual(bandingRentang(40, [22, 354]), {arah: 'di dalam', selisih: 0});
  assert.deepEqual(bandingRentang(5, [22, 354]), {arah: 'di bawah', selisih: 17}); assert.deepEqual(bandingRentang(400, [22, 354]), {arah: 'di atas', selisih: 46});
  assert.equal(bandingRentang(null, [22, 354]), null); assert.equal(bandingRentang(10, null), null);
});

test('sumber kaji.js: gaya lewat CSSOM, tanpa markup mentah, tanpa hex, tanpa ambang lolos, tanpa titik tengah', () => {
  const t = readFileSync(path.join(PUB, 'siklus/kaji.js'), 'utf8');
  assert.doesNotMatch(t, /innerHTML|insertAdjacentHTML|outerHTML/); assert.doesNotMatch(t, /#[0-9a-fA-F]{6}\b/); assert.doesNotMatch(t, /lolos\s*[=:<>]|\blolos\(/i, 'tanpa ambang lolos (U18)');
  assert.doesNotMatch(t, /·|—/); assert.doesNotMatch(t, /\.append\([^)]*\?[^)]*:\s*null\)/, '.append(x ? y : null) mencetak "null"');
});

const chrome = cariChrome();
test('layar kaji di Chrome nyata (1440 dan 390)', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('detail gempa: rentang dua ujung, PAGER dan ITB berdampingan, galat 3,0586 dan peringatan 5,341 melebihi pita 4, petugas berdampingan', async () => {
      const rekam = [], s = await sajikan(api('ko', rekam));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/kaji/${SID.g}`, {tunggu: '#kj-model .sk-ber'});
        const d = await T.eval(`(() => ({jd: document.querySelector('#kj-kepala h3').innerText, kep: document.querySelector('#kj-kepala').innerText, rn: document.querySelector('#kj-rentang').innerText, md: document.querySelector('#kj-model').innerText, mj: document.querySelector('#kj-meja').innerText,
          bar: document.querySelectorAll('#kj-model .sk-rentang').length, pil: [...document.querySelectorAll('#kj-kepala .sk-pil')].map((x) => x.dataset.y), ft: !!document.querySelector('.ex-ft'), ex: document.querySelectorAll('.ex.ex-std').length, semua: document.body.innerText,
          lebar: [...document.querySelectorAll('#kj-rentang .sk-rentang > i > u')].map((u) => u.style.width), aksi: [...document.querySelectorAll('#kj-kepala [data-aksi]')].map((x) => x.textContent.trim())}))()`);
        assert.match(d.jd, /22 sampai 354/); assert.match(d.jd, /rumah rusak menunggu/); assert.ok(d.pil.includes('estimasi-model'), 'pil estimasi model di kepala');
        assert.match(d.rn, /22[\s\S]*354/); assert.match(d.rn, /menunggu/); assert.doesNotMatch(d.rn, /\b0 sampai 0\b/);
        assert.equal(d.bar, 2); assert.match(d.md, /PAGER/i); assert.match(d.md, /ITB/i); assert.match(d.md, /22 sampai 354/); assert.match(d.md, /334/);
        assert.match(d.md, /3,0586/); assert.match(d.md, /5,341/); assert.match(d.md, /melebihi pita 4/i); assert.match(d.md, /meleset sampai 5 kali/); assert.match(d.md, /hipotesis/i); assert.doesNotMatch(d.md, /lolos/i);
        assert.match(d.mj, /Cilacap Selatan/); assert.match(d.mj, /40/); assert.match(d.mj, /di dalam rentang model/); assert.match(d.mj, /tidak dijumlah/); assert.match(d.mj, /tidak ada/, 'hilang kosong ditulis tidak ada, bukan 0');
        assert.ok(d.ex >= 4 && !d.ft && d.lebar.every((w) => /%$/.test(w))); assert.doesNotMatch(d.semua, SALAH);
        assert.ok(d.aksi.includes('Diperiksa') && d.aksi.includes('Tarik'), `aksi: ${d.aksi}`);
        // pil status berganti seketika, lalu POST
        await T.eval(`[...document.querySelectorAll('#kj-kepala [data-aksi]')].find((x) => /Diperiksa/.test(x.textContent)).click()`);
        await T.tungguFungsi(`document.querySelector('#kj-kepala .sk-fase')`);
        await T.tungguFungsi(`document.getElementById('toast').textContent.includes('Status kaji diubah')`, 8000);
        assert.deepEqual(rekam, [{ke: 'diperiksa'}]);
        assert.deepEqual(galatNyata(T), []); assert.deepEqual(s.hilang, []);
        await T.ukuran(390, 844); await T.buka(`${s.url}/siklus/kaji/${SID.g}`, {tunggu: '#kj-model .sk-ber'}); const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di 390: ${l.sw} > ${l.iw}`);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('menunggu data: tidak pernah nol, perkiraan sementara berlabel, jam ambil terakhir', async () => {
      const s = await sajikan(api('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/kaji/${SID.w}`, {tunggu: '#kj-rentang'});
        const d = await T.eval(`({jd: document.querySelector('#kj-kepala h3').innerText, kep: document.querySelector('#kj-kepala').innerText, rn: document.querySelector('#kj-rentang').innerText, semua: document.body.innerText})`);
        assert.match(d.jd, /Menunggu grid USGS/); assert.match(d.kep, /jam ambil terakhir/); assert.match(d.rn, /menunggu/i); assert.match(d.rn, /bukan nol/); assert.match(d.rn, /8 sampai 90/); assert.match(d.rn, /bukan angka resmi/i);
        assert.doesNotMatch(d.jd + d.rn, /\b0 sampai 0\b|\b0 jiwa\b/); assert.doesNotMatch(d.semua, SALAH);
        assert.deepEqual(galatNyata(T), []); await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('banjir: rentang jiwa terpapar sampai batas atas jam pertama, kedalaman belum tersedia, tiga sumber berdampingan', async () => {
      const s = await sajikan(api('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/kaji/${SID.b}`, {tunggu: '#kj-model .sk-ber'});
        const d = await T.eval(`({jd: document.querySelector('#kj-kepala h3').innerText, md: document.querySelector('#kj-model').innerText, semua: document.body.innerText})`);
        assert.match(d.jd, /600 sampai 1\.400/); assert.match(d.md, /kedalaman belum tersedia/); assert.match(d.md, /WorldPop[\s\S]*667/i); assert.match(d.md, /GHSL[\s\S]*tidak ada/i); assert.match(d.md, /1\.400 jiwa/); assert.doesNotMatch(d.semua, SALAH);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('daftar: tiga kaji, status menunggu data bukan nol, filter status mengecat dalam satu frame, tanpa gulir mendatar', async () => {
      const s = await sajikan(api('ko'));
      try {
        for (const [w, h] of [[1440, 900], [390, 844]]) {
          const T = await pb.tab(); await T.ukuran(w, h); await T.buka(`${s.url}/siklus/kaji`, {tunggu: '#daftar table'});
          const d = await T.eval(`({jd: document.querySelector('#daftar h3').innerText, n: document.querySelectorAll('#daftar tbody tr').length, t: document.querySelector('#daftar').innerText, ft: !!document.querySelector('.ex-ft'), href: [...document.querySelectorAll('#daftar tbody a')].map((a) => a.getAttribute('href'))})`);
          assert.equal(d.n, 3); assert.match(d.jd, /2 kaji punya perkiraan, 1 menunggu data/); assert.match(d.t, /22 sampai 354/); assert.match(d.t, /600 sampai 1\.400/); assert.match(d.t, /menunggu data/i); assert.doesNotMatch(d.t, SALAH); assert.doesNotMatch(d.t, /\b0 sampai 0\b/);
          assert.ok(!d.ft && d.href.includes(`/siklus/kaji/${SID.g}`));
          const r = await T.eval(`(async () => { const t0 = performance.now(); const b = [...document.querySelectorAll('#daftar .seg.penuh button')].find((x) => /Menunggu data/.test(x.textContent)); b.click(); const p = b.getAttribute('aria-pressed'); await new Promise((r) => requestAnimationFrame(r)); return {ms: performance.now() - t0, p}; })()`);
          assert.equal(r.p, 'true'); assert.ok(r.ms < 200, `${Math.round(r.ms)} ms`);
          await T.tungguFungsi(`document.querySelectorAll('#daftar tbody tr').length === 1`);
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`); assert.deepEqual(galatNyata(T), []); await T.tutup();
        }
      } finally { await s.tutup(); }
    });
  } finally { await pb.tutup(); }
});
