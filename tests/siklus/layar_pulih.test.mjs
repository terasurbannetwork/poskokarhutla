// Layar Pulih (SK-075..078; UJ-F4-12, UJ-F4-13): Jitupasna berpil asumsi-kebijakan, kosong menunggu bukan nol, draf bukan dokumen resmi, unduhan aman rumus,
// laporan lima bagian, formulir luring idempoten (kirim dua kali, satu baris). Jalan: node --test tests/siklus/layar_pulih.test.mjs   (tanpa Chrome, uji peramban dilewati)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import path from 'node:path';
import {sajikan, bukaPeramban, cariChrome, galatNyata, PUB} from './_layar.mjs';
import {amanSel, csv, tandaDraf, baganDraf, baganLaporan, BAGIAN_LAPORAN, nilaiPeta, rupiah} from '../../public/siklus/pulih.js';
import * as A from '../../public/siklus/antre.js';

runInThisContext(readFileSync(path.join(PUB, 'inti/format.js'), 'utf8') + ';globalThis.fmt = fmt;');

const KJ = 'KJ-2026-9A2WGN3G', JP = 'd1d2d3d4d5d6d7d8', JP2 = 'e1e2e3e4e5e6e7e8', R3 = 'f1f2f3f4f5f6f7f8', NOW = Date.parse('2026-11-10T03:00:00Z');
const HITUNG = {tahun_harga: 2026, dihitung: NOW, yakin: 'asumsi-kebijakan', indeks: 'menunggu', kerusakan: {total: 2600e6, menunggu: false, per: {perumahan: {nilai: 2600e6, menunggu: false, monoton: true, wajar: true}}},
  kerugian: {total: 6e6, per: {perumahan: 6e6}}, peta: {permukiman: 2606e6, infrastruktur: 0, ekonomi: 0, sosial: 0, lintas_sektor: 0, belum_terpeta: 0, total: 2606e6},
  penanda: {hitung_ganda: [], kosong: ['infrastruktur', 'ekonomi', 'sosial', 'lintas_sektor'], tidak_wajar: []}, stimulan: {nilai: 1650e6, yakin: 'asumsi-kebijakan'}, total: 2606e6};
const jp = (id, status, hitung) => ({id, kejadian_id: KJ, kab4: '3301', prov: '33', status, tim_sk: '=CMD|tim', versi: 1, tahun_harga: hitung ? 2026 : null, hitung, dibuat: NOW, diubah: NOW, oleh: 'x', dummy: 0});
const BARIS = [{id: 'b1', jenis: 'rusak', sektor: 'perumahan', tingkat: 'rb', unit: 10, nilai_rp: 1000e6}, {id: 'b2', jenis: 'rusak', sektor: 'pendidikan', tingkat: 'rb', unit: 2, nilai_rp: null}, {id: 'b3', jenis: 'rugi', sektor: 'perumahan', komponen: 'air_minum', arus_rp: 2e6, bulan: 3, nilai_rp: 6e6}];
const R3P = {id: R3, jitupasna_id: JP, kejadian_id: KJ, status: 'diusulkan', versi: 1, tanggap_mulai: '2026-08-01', disetujui_oleh: null, no_keputusan: null, dibuat: NOW, diubah: NOW, oleh: 'x', dummy: 0};
const KEG = [{id: 'k1', r3p_id: R3, sektor: 'permukiman', nama: 'Rumah rusak berat', target: 10, satuan: 'unit', nilai_rp: 1000e6, status: 'berjalan', diubah: NOW}, {id: 'k2', r3p_id: R3, sektor: 'sosial', nama: 'Sekolah', target: null, satuan: null, nilai_rp: null, status: 'rencana', diubah: NOW}];
const KEM = {total: null, yakin: 'asumsi-kebijakan', kegiatan: [{id: 'k1', persen: 40, status: 'terukur', macet: true}, {id: 'k2', persen: null, status: 'menunggu', macet: false}]};

const api = (peran, rekam = {baris: []}) => (m, j, q, badan) => {
  if (j === '/api/staf/saya') return [200, {staf: {peran: peran === 'pm' ? ['pimpinan'] : ['koordalops']}}];
  if (j === '/api/akademisi/saya') return [401, {}];
  if (j === '/api/siklus/kejadian') return [200, {baris: [{id: KJ, jenis: 'gempa', kab4: '3301', mulai: '2026-08-01', fase: 'tanggap'}], berikut: null}];
  if (j === '/api/siklus/pulih' && m === 'GET') return [200, {kejadian_id: KJ, baris: [jp(JP, 'dihitung', JSON.stringify(HITUNG)), jp(JP2, 'pengumpulan', null)]}];
  if (j === `/api/siklus/pulih/${JP}`) return [200, {jitupasna: jp(JP, 'dihitung', JSON.stringify(HITUNG)), baris: BARIS, baris_terpotong: false, rekap_rumah_rusak: {dari: '2026-08-01', sampai: '2026-11-29', total: {berat: 12, sedang: 5, ringan: 3, total: 20}, kec: [], catatan: 'hitungan laporan rumah rusak berstatus sah; berdampingan dengan isian Jitupasna, tidak dijumlah', yakin: 'terverifikasi'},
    r3p: [R3P], kegiatan: KEG, kemajuan: KEM}];
  if (j === `/api/siklus/r3p/${R3}`) return [200, {r3p: R3P, label_setuju: null, catatan: 'DRAF, bukan dokumen resmi', hari_tersisa_90: {berlalu: 101, sisa: -11, lewat: true}, kegiatan: KEG, kemajuan: KEM}];
  if (j === '/api/siklus/harga') return [200, {sektor: q.get('sektor'), baris: q.get('sektor') === 'perumahan' ? [{id: 'h1', sektor: 'perumahan', tingkat: 'rb', satuan: 'unit', harga_rp: 100e6, tahun: 2026, dokumen: 'HSBGN 2026', yakin: 'asumsi-kebijakan'}] : []}];
  const mm = new RegExp(`^/api/siklus/pulih/${JP}/baris$`).exec(j);
  if (mm) { let dup = 0; for (const b of badan.baris) { if (rekam.baris.some((x) => x.klien_id === b.klien_id)) dup++; else rekam.baris.push(b); } return [200, {diterima: badan.baris.length - dup, duplikat: dup}]; }
  return null;
};
const SALAH = /\bnull\b|undefined|NaN|\[object/;

test('fungsi murni: sel berawal = + - @ diberi awalan, null jadi kosong, tanda draf sampai ditetapkan resmi', () => {
  for (const v of ['=1+1', '+1', '-1', '@x']) assert.equal(amanSel(v), "'" + v);
  assert.equal(amanSel('aman'), 'aman'); assert.equal(amanSel(null), ''); assert.equal(amanSel(5), '5'); assert.equal(amanSel(undefined), '');
  assert.equal(csv([['a,b', '=x', null]]), '"a,b",\'=x,');
  assert.equal(tandaDraf('draf', 'final'), 'DRAF, bukan dokumen resmi'); assert.equal(tandaDraf('disetujui_pm', 'final'), 'DRAF, bukan dokumen resmi');
  assert.match(tandaDraf('ditetapkan_resmi', 'final'), /^salinan data, dokumen resmi di luar sistem$/); assert.equal(tandaDraf(null, 'dihitung'), 'DRAF, bukan dokumen resmi');
  assert.equal(rupiah(null), null); assert.equal(nilaiPeta(HITUNG, 'infrastruktur'), null, 'sektor tanpa isian menunggu, bukan 0'); assert.equal(nilaiPeta(HITUNG, 'permukiman'), 2606e6);
});

test('unduhan draf R3P: kop DRAF, lima sektor, sektor kosong menunggu, tanpa kata null; sel rumus aman', () => {
  const d = {jitupasna: {...jp(JP, 'dihitung', HITUNG), hitung: HITUNG}, kegiatan: KEG}, b = baganDraf(d, R3P, {sisa: -11}), t = csv(b);
  assert.match(t, /DRAF, bukan dokumen resmi/); assert.match(t, /Permukiman,2606000000,asumsi-kebijakan/); assert.match(t, /Infrastruktur,menunggu,menunggu/); assert.doesNotMatch(t, SALAH); assert.doesNotMatch(t, /·|—/);
  const rumus = baganDraf({...d, kegiatan: [{...KEG[0], nama: '=HYPERLINK("x")'}]}, R3P, null); assert.match(csv(rumus), /"'=HYPERLINK\(""x""\)"/);
  assert.match(csv(baganDraf(d, {...R3P, status: 'ditetapkan_resmi', no_keputusan: '12/2026'}, null)), /salinan data, dokumen resmi di luar sistem/);
});

test('laporan Jitupasna: lima bagian berurutan, tiap rupiah berkeyakinan asumsi-kebijakan, kosong menunggu (UJ-F4-13)', () => {
  const d = {jitupasna: {...jp(JP, 'dihitung', HITUNG), hitung: HITUNG}, kegiatan: KEG, rekap_rumah_rusak: {total: {berat: 12}}}, b = baganLaporan(d, R3P, {sisa: -11});
  const isi = b.filter((r) => BAGIAN_LAPORAN.includes(r[0]));
  assert.deepEqual([...new Set(isi.map((r) => r[0]))], BAGIAN_LAPORAN);
  for (const r of isi.filter((x) => /\(Rp\)/.test(x[1]))) assert.ok(typeof r[2] === 'number' ? r[3] === 'asumsi-kebijakan' : r[2] === 'menunggu' && r[3] === 'menunggu', `${r[1]}: ${r[2]} ${r[3]}`);
  assert.ok(isi.some((r) => r[1] === 'Nilai kerusakan (Rp)' && r[2] === 2600e6)); assert.ok(isi.some((r) => /Sekolah/.test(r[1]) && r[2] === 'menunggu')); assert.doesNotMatch(csv(b), SALAH);
  assert.match(csv(b), /"Rumah rusak berat menurut laporan warga \(berdampingan dengan isian, tidak dijumlah\)",12,terverifikasi/);
});

test('antre.js: kirim dua kali, satu baris; jaringan putus menunda; ditolak tinggal; isian kosong tidak jadi 0', async () => {
  const simpan = new Map(); globalThis.localStorage = {getItem: (k) => simpan.get(k) ?? null, setItem: (k, v) => simpan.set(k, String(v)), removeItem: (k) => simpan.delete(k)};
  const server = []; const kirim = async (_, baris) => { let dup = 0; for (const b of baris) { if (server.some((x) => x.klien_id === b.klien_id)) dup++; else server.push(b); } return {ok: true, status: 200, j: {diterima: baris.length - dup, duplikat: dup}}; };
  assert.equal((await A.tambah(JP, {jenis: 'rusak', sektor: 'perumahan', tingkat: 'rb', unit: ''})).ok, false, 'unit kosong ditolak, bukan 0');
  assert.equal((await A.tambah(JP, {jenis: 'rusak', sektor: 'perumahan', tingkat: 'rb', unit: '10'}, {klien_id: 'klien-0001'})).ok, true);
  assert.deepEqual(await A.jumlah(JP), {menunggu: 1, ditolak: 0, total: 1});
  const putus = await A.kirimSemua(JP, async () => ({ok: false, status: 0, j: null})); assert.equal(putus.berhenti, 'tunda'); assert.equal((await A.jumlah(JP)).menunggu, 1, 'tetap di antrean');
  const satu = await A.kirimSemua(JP, kirim); assert.equal(satu.diterima, 1); assert.equal(server.length, 1);
  await A.tambah(JP, {jenis: 'rusak', sektor: 'perumahan', tingkat: 'rb', unit: '10'}, {klien_id: 'klien-0001'});   // klien_id sama dikirim lagi (HP kirim ulang)
  const dua = await A.kirimSemua(JP, kirim); assert.equal(dua.duplikat, 1); assert.equal(server.length, 1, 'satu baris, bukan dua'); assert.equal((await A.jumlah(JP)).total, 0);
  await A.tambah(JP, {jenis: 'rugi', sektor: 'perumahan', komponen: 'Air Minum', arus_rp: '2000000', bulan: '3'}, {klien_id: 'klien-0002'});
  const tolak = await A.kirimSemua(JP, async () => ({ok: false, status: 409, j: {galat: 'baris hanya diterima saat dibuka atau pengumpulan'}}));
  assert.equal(tolak.ditolak, 1); assert.deepEqual(await A.jumlah(JP), {menunggu: 0, ditolak: 1, total: 1}); assert.equal(server.length, 1);
  assert.equal(server[0].unit, 10); await A.hapus('klien-0002'); delete globalThis.localStorage;
});

test('sumber pulih.js dan antre.js: tanpa markup mentah, tanpa hex, tanpa titik tengah, tanpa .append(x ? y : null)', () => {
  for (const f of ['pulih.js', 'antre.js']) {
    const t = readFileSync(path.join(PUB, 'siklus', f), 'utf8');
    assert.doesNotMatch(t, /innerHTML|insertAdjacentHTML|outerHTML/, f); assert.doesNotMatch(t, /#[0-9a-fA-F]{6}\b/, f); assert.doesNotMatch(t, /·|—/, f);
    assert.doesNotMatch(t, /\.append\([^)]*\?[^)]*:\s*null\)/, `${f}: .append(x ? y : null) mencetak "null"`);
  }
});

const chrome = cariChrome();
test('layar pulih di Chrome nyata (1440 dan 390)', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('detail: nilai berpil asumsi-kebijakan, kosong menunggu bukan nol, draf bukan dokumen resmi, hari lewat batas pengingat, kegiatan macet', async () => {
      const rekam = {baris: []}, s = await sajikan(api('ko', rekam));
      try {
        for (const [w, hh] of [[1440, 900], [390, 844]]) {
          const T = await pb.tab(); await T.ukuran(w, hh); await T.buka(`${s.url}/siklus/pulih/${JP}`, {tunggu: '#pl-r3p .sk-baris'});
          const d = await T.eval(`(() => ({kep: document.querySelector('#pl-kepala').innerText, jd: document.querySelector('#pl-kepala h3').innerText, isian: document.querySelector('#pl-isian').innerText, hasil: document.querySelector('#pl-hasil').innerText, r3p: document.querySelector('#pl-r3p').innerText,
            lak: document.querySelector('#pl-lak').innerText, tanda: document.querySelector('#pl-tanda').innerText, semua: document.body.innerText, ft: !!document.querySelector('.ex-ft'), ex: document.querySelectorAll('.ex.ex-std').length,
            asumsi: document.querySelectorAll('#pl-hasil .sk-pil[data-y=asumsi-kebijakan]').length, aksi: [...document.querySelectorAll('#pl-kepala [data-aksi], #pl-r3p [data-aksi]')].map((x) => x.textContent.trim())}))()`);
          assert.match(d.jd, /Rp2\.606\.000\.000/); assert.match(d.jd, /diusulkan/i); assert.ok(d.asumsi >= 3, `pil asumsi-kebijakan di hasil: ${d.asumsi}`);
          assert.match(d.isian, /Berat[\s\S]*12/i); assert.match(d.isian, /tidak dijumlah/); assert.match(d.isian, /Pendidikan[\s\S]*menunggu/i, 'sektor tanpa harga menunggu'); assert.doesNotMatch(d.isian, /Rp0\b/);
          assert.match(d.hasil, /Rp2\.600\.000\.000/); assert.match(d.hasil, /Rp1\.650\.000\.000/); assert.match(d.hasil, /IKK dan IHPB: menunggu/);
          assert.match(d.tanda, /DRAF, bukan dokumen resmi/); assert.match(d.r3p, /Infrastruktur[\s\S]*menunggu/); assert.doesNotMatch(d.r3p, /Rp0\b/); assert.match(d.r3p, /sudah lewat 11 hari/); assert.match(d.r3p, /pengingat, bukan penolakan/);
          assert.match(d.lak, /Macet/); assert.match(d.lak, /menunggu/); assert.ok(d.aksi.includes('Unduh draf') && d.aksi.includes('Unduh laporan') && d.aksi.includes('Tinjau'), `aksi: ${d.aksi}`);
          assert.ok(!d.ft && d.ex >= 5); assert.doesNotMatch(d.semua, SALAH);
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}: ${l.sw} > ${l.iw}`); assert.deepEqual(galatNyata(T), []); await T.tutup();
        }
        assert.deepEqual(s.hilang, []);
      } finally { await s.tutup(); }
    });
    await t.test('unduhan draf dan laporan: berkop DRAF, sel rumus berawalan, lima bagian (UJ-F4-12, UJ-F4-13)', async () => {
      const s = await sajikan(api('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/pulih/${JP}`, {tunggu: '#pl-r3p .sk-baris'});
        const ambil = (nama) => T.eval(`(async () => { const simpan = []; const asli = URL.createObjectURL; URL.createObjectURL = (b) => { simpan.push(b); return asli.call(URL, b); };
          [...document.querySelectorAll('#pl-r3p [data-aksi]')].find((x) => x.textContent.trim() === ${JSON.stringify(nama)}).click(); await new Promise((r) => setTimeout(r, 300)); URL.createObjectURL = asli; return simpan.length ? await simpan[0].text() : null; })()`);
        const draf = await ambil('Unduh draf'), lap = await ambil('Unduh laporan');
        assert.match(draf, /DRAF, bukan dokumen resmi/); assert.match(draf, /Infrastruktur,menunggu,menunggu/); assert.doesNotMatch(draf, SALAH);
        for (const b of BAGIAN_LAPORAN) assert.ok(lap.includes(b), b); assert.match(lap, /'=CMD\|tim/, 'tim berawal = diberi awalan, bila tertulis'); assert.match(lap, /DRAF, bukan dokumen resmi/);
        for (const r of lap.split('\n').filter((x) => /\(Rp\)/.test(x))) assert.match(r, /asumsi-kebijakan$|menunggu,menunggu$/, r);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('formulir luring: kirim dua kali, satu baris di server; pita menyebut antrean', async () => {
      const rekam = {baris: []}, s = await sajikan(api('ko', rekam));
      try {
        const T = await pb.tab(); await T.ukuran(390, 844); await T.buka(`${s.url}/siklus/pulih/${JP}`, {tunggu: '#pl-isian table'});
        const r = await T.eval(`(async () => { const A = await import('/siklus/antre.js'); const b = {jenis: 'rusak', sektor: 'perumahan', tingkat: 'rr', unit: '4'};
          await A.tambah(${JSON.stringify(JP)}, b, {klien_id: 'uji-luring-01'}); await A.tambah(${JSON.stringify(JP)}, b, {klien_id: 'uji-luring-01'});
          const kirim = (id, baris) => fetch('/api/siklus/pulih/' + id + '/baris', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({baris})}).then(async (x) => ({ok: x.ok, status: x.status, j: await x.json()}));
          const a = await A.kirimSemua(${JSON.stringify(JP)}, kirim); await A.tambah(${JSON.stringify(JP)}, b, {klien_id: 'uji-luring-01'}); const c = await A.kirimSemua(${JSON.stringify(JP)}, kirim);
          return {a, c, sisa: await A.jumlah(${JSON.stringify(JP)})}; })()`);
        assert.equal(r.a.diterima, 1); assert.equal(r.c.duplikat, 1); assert.equal(r.sisa.total, 0); assert.equal(rekam.baris.filter((x) => x.klien_id === 'uji-luring-01').length, 1, 'satu baris, bukan dua');
        assert.deepEqual(galatNyata(T), []); await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('daftar: dua Jitupasna, nilai menunggu bukan nol, saring status mengecat dalam satu frame, tanpa gulir mendatar', async () => {
      const s = await sajikan(api('ko'));
      try {
        for (const [w, hh] of [[1440, 900], [390, 844]]) {
          const T = await pb.tab(); await T.ukuran(w, hh); await T.buka(`${s.url}/siklus/pulih`, {tunggu: '#daftar table'});
          const d = await T.eval(`({jd: document.querySelector('#daftar h3').innerText, n: document.querySelectorAll('#daftar tbody tr').length, t: document.querySelector('#daftar').innerText, ft: !!document.querySelector('.ex-ft'), semua: document.body.innerText, aksi: [...document.querySelectorAll('#daftar [data-aksi]')].map((x) => x.textContent.trim())})`);
          assert.equal(d.n, 2); assert.match(d.jd, /2 Jitupasna berjalan/); assert.match(d.t, /Rp2\.600\.000\.000/); assert.match(d.t, /menunggu/i); assert.doesNotMatch(d.semua, SALAH); assert.ok(!d.ft); assert.ok(d.aksi.includes('Buka Jitupasna'));
          const r = await T.eval(`(async () => { const t0 = performance.now(); const b = [...document.querySelectorAll('#daftar .seg.penuh button')].find((x) => /Final/.test(x.textContent)); b.click(); const p = b.getAttribute('aria-pressed'); await new Promise((o) => requestAnimationFrame(() => requestAnimationFrame(o))); return {p, ms: performance.now() - t0}; })()`);
          assert.equal(r.p, 'true'); assert.ok(r.ms < 200, `${Math.round(r.ms)} ms`);
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`); assert.deepEqual(galatNyata(T), []); await T.tutup();
        }
      } finally { await s.tutup(); }
    });
  } finally { await pb.tutup(); }
});
