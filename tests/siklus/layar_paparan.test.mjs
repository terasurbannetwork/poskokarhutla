// Layar Peta Paparan (SK-039; UJ-F2-09): keterbatasan tertulis, "tidak terliput", tiga sumber jiwa berdampingan, panel peta bisa ditarik, pilihan penuh lebar.
// Jalan: node --test tests/siklus/layar_paparan.test.mjs   (tanpa Chrome, uji peramban dilewati)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {sajikan, bukaPeramban, cariChrome, galatNyata, PUB} from './_layar.mjs';
import {agregat, kelasDipilih} from '../../public/siklus/paparan.js';

const kelas = (b, l, w, d, g) => ({bangunan: {n: b, y: 'estimasi-model'}, luas_m2: {n: l, y: 'estimasi-model'}, jiwa: {worldpop: {n: w}, dukcapil: {n: d}, ghsl: {n: g}}});
const KAB = {v: 1, jenis: 'paparan_kab', kab4: '3301', bahaya: {banjir: {kelas_batas: [0.33, 0.66], kelas: {rendah: kelas(100, 9000, 400, 420, 380), sedang: kelas(200, 18000, 800, 850, null), tinggi: kelas(50, 4000, 300, 310, 290)}}},
  fasilitas_hitung: {sekolah: 410, kesehatan: {n: 55, y: 'estimasi-model'}}};
const RINGKAS = {v: 1, jenis: 'paparan', prov: '33', terliput: true, kab: {'3301': {bangunan: {n: 350, y: 'estimasi-model'}, jiwa: {dukcapil: {n: 5000}}, desa: {'3301010001': [300, 15000, 1200], '3301010002': [100, 5000, 400]}}, '3302': {bangunan: {n: 90}, jiwa: {dukcapil: {n: null}}, desa: {}}}};
const api = (peran) => (m, j, q) => {
  if (j === '/api/staf/saya') return peran === 'sa' ? [401, {}] : [200, {staf: {peran: ['koordalops']}}];
  if (j === '/api/akademisi/saya') return peran === 'sa' ? [200, {peran: ['admin'], super: true}] : [401, {}];
  if (j === '/api/siklus/paparan/ringkas') return q.get('prov') === '94' ? [200, {v: 1, jenis: 'paparan', prov: '94', terliput: false, kab: {}}] : [200, RINGKAS];
  if (j === '/api/siklus/paparan/kab') return [200, KAB];
  if (j === '/api/siklus/dummy' && m === 'POST') return [201, {dibuat: 3, per_tabel: {}}];
  return null;
};

test('agregat: kelas dijumlah dalam satu sumber, sumber jiwa tidak dijumlah, tidak ada data tetap null', () => {
  const bh = KAB.bahaya.banjir, semua = agregat(bh, 'semua');
  assert.equal(semua.bangunan, 350); assert.equal(semua.luas, 31000);
  assert.deepEqual(semua.jiwa, {worldpop: 1500, dukcapil: 1580, ghsl: 670});   // ghsl: sedang null diabaikan, bukan 0
  assert.equal(agregat(bh, 'sedang').jiwa.ghsl, null, 'satu-satunya kelas tanpa data = null, bukan 0');
  assert.equal(agregat(undefined, 'semua'), null); assert.deepEqual(kelasDipilih('tinggi'), ['tinggi']);
});

test('sumber paparan.js: pegangan tarik, lebar diingat, rAF, token warna tanpa hex', () => {
  const t = readFileSync(path.join(PUB, 'siklus/paparan.js'), 'utf8');
  assert.match(t, /sk-panel-lebar/); assert.match(t, /pointermove/); assert.match(t, /requestAnimationFrame/); assert.match(t, /tarik-v/);
  assert.doesNotMatch(t, /#[0-9a-fA-F]{6}\b/);
});

const chrome = cariChrome();
test('layar paparan di Chrome nyata (1440 dan 390)', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('keterbatasan, tiga sumber jiwa berdampingan, pilihan penuh lebar, tanpa kaki sumber', async () => {
      const s = await sajikan(api('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/paparan?kab4=3301`, {tunggu: '#p-utama .sk-ber'});
        const d = await T.eval(`(() => { const k = document.querySelector('#p-utama'); return {t: k.innerText, ex: k.classList.contains('ex-std'), hl: !!k.querySelector('h3 .hl'), ft: !!k.querySelector('.ex-ft'), ber: [...k.querySelectorAll('.sk-ber > div:not(.sk-sel) small')].map(x => x.textContent),
          segPenuh: k.querySelectorAll('.seg.penuh').length, tarik: !!document.querySelector('.panel .tarik'), mapa: !!document.querySelector('#peta')}; })()`);
        assert.match(d.t, /0,70/); assert.match(d.t, /0,8 km/); assert.match(d.t, /bukan klasifikasi resmi/i); assert.match(d.t, /WorldPop 1\.500, Dukcapil 1\.580, GHSL 670, selisih 910/);
        assert.deepEqual(d.ber.map((x) => x.toLowerCase()), ['worldpop', 'dukcapil', 'ghsl']); assert.ok(d.ex && d.hl && !d.ft && d.segPenuh >= 2 && d.tarik && d.mapa);
        assert.match(d.t, /350 bangunan berada di zona banjir/i); assert.match(d.t, /Sekolah/);
        // chrome urgent: segmen berubah di tick klik; bahaya tanpa data menulis menunggu, bukan 0
        assert.equal(await T.eval(`(() => { const b = [...document.querySelectorAll('#p-utama .seg.penuh button')].find(x => /Gempa/.test(x.textContent)); b.click(); return b.getAttribute('aria-pressed'); })()`), 'true');
        await T.tungguFungsi(`/menunggu/i.test(document.querySelector('#p-utama h3').innerText)`);
        assert.deepEqual(galatNyata(T), []); assert.deepEqual(s.hilang, []); await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('provinsi tanpa grid tampil "tidak terliput", bukan nol', async () => {
      const s = await sajikan(api('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/paparan?kab4=9401`, {tunggu: '#p-utama .sk-kead'});
        const teks = await T.eval(`document.querySelector('#p-utama').innerText`); assert.match(teks, /tidak terliput/i); assert.doesNotMatch(teks, /\b0 bangunan/);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('panel bisa ditarik di desktop (lebar diingat) dan menjadi lembar bawah di 390', async () => {
      const s = await sajikan(api('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/paparan?kab4=3301`, {tunggu: '#p-utama .sk-ber'});
        const r = await T.eval(`(() => { const e = document.querySelector('.panel .tarik').getBoundingClientRect(); return {x: e.left + e.width / 2, y: e.top + e.height / 2, w: document.querySelector('.panel').offsetWidth}; })()`);
        for (const [type, x] of [['mousePressed', r.x], ['mouseMoved', r.x + 60], ['mouseMoved', r.x + 120], ['mouseReleased', r.x + 120]]) await T.kirim('Input.dispatchMouseEvent', {type, x, y: r.y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1});
        await T.tungguFungsi(`document.querySelector('.panel').offsetWidth > ${r.w + 60}`);
        const w = await T.eval(`localStorage.getItem('sk-panel-lebar')`); assert.ok(Number(w) > r.w + 60 && Number(w) <= 640, `lebar tersimpan ${w}`);
        await T.buka(`${s.url}/siklus/paparan?kab4=3301`, {tunggu: '#p-utama .sk-ber'}); assert.equal(await T.eval(`document.querySelector('.panel').offsetWidth`), Number(w), 'lebar diingat sesudah muat ulang');
        await T.ukuran(390, 844); await T.buka(`${s.url}/siklus/paparan?kab4=3301`, {tunggu: '#p-utama .sk-ber'});
        const m = await T.eval(`(() => { const p = document.querySelector('.panel').getBoundingClientRect(); return {atas: p.top / innerHeight, v: getComputedStyle(document.querySelector('.tarik-v')).display, h: getComputedStyle(document.querySelector('.tarik')).display}; })()`);
        assert.ok(m.atas > 0.4, `lembar bawah: ${m.atas}`); assert.equal(m.v, 'block'); assert.equal(m.h, 'none');
        const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1); await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('Super Admin di paparan: tidak ada tombol dummy (pemilik 11 Nov 2026)', async () => {
      const s = await sajikan(api('sa'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/paparan?kab4=3301`, {tunggu: '#p-utama .sk-ber'});
        await new Promise((r) => setTimeout(r, 400));
        assert.equal(await T.eval(`document.querySelectorAll('.sk-dummy').length`), 0); await T.tutup();
      } finally { await s.tutup(); }
    });
    // SK-042 sapuan INP: tiap interaksi harus punya piksel berubah pada frame berikutnya (chrome urgent), bukan menunggu isi berat (INP.md)
    const frame = (T, js) => T.eval(`(async () => { const t0 = performance.now(); ${js}; const c = document.querySelector('.seg.penuh button[aria-pressed=true]')?.textContent; await new Promise((r) => requestAnimationFrame(r)); return {ms: performance.now() - t0, c}; })()`);
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      await t.test(`INP ${w}: segmen bahaya mengecat dalam satu frame, bahaya tanpa data menulis menunggu`, async () => {
        const s = await sajikan(api('ko'));
        try {
          const T = await pb.tab(); await T.ukuran(w, h); await T.buka(`${s.url}/siklus/paparan?kab4=3301`, {tunggu: '#p-utama .sk-ber'});
          for (const nama of ['Gempa', 'Banjir']) {
            const r = await frame(T, `[...document.querySelectorAll('#p-utama .seg.penuh button')].find((x) => /${nama}/.test(x.textContent)).click()`);
            assert.ok(r.ms < 200, `${nama}: ${Math.round(r.ms)} ms`); assert.match(r.c, new RegExp(nama));
            await T.tungguFungsi(`document.querySelector('#p-utama h3').innerText.length > 0`);
          }
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`);
          assert.ok(!/\bnull\b/.test(await T.eval('document.body.innerText'))); assert.deepEqual(galatNyata(T), []); await T.tutup();
        } finally { await s.tutup(); }
      });
    }
  } finally { await pb.tutup(); }
});
