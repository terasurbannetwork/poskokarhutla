// Gerbang siklus_publik (INV-6, INV-8, UJ-G0-11): isi public/siklus/** aman dan tertata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUB = join(ROOT, 'public/siklus');
const MAKS_BERKAS = 40;
const TITIK_TENGAH = '\u00b7';
const EM_DASH = '\u2014';
const TERLARANG = ['pantau bencana', 'mitra strategis'];

const daftar = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => {
  const j = join(d, n);
  return statSync(j).isDirectory() ? daftar(j) : [j];
}) : []);

const AMAN = /^(esc|escUrl|fmt|rb|jamWIB)\(/;

export function periksaIsi(nama, t) {
  const m = [];
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(t.replace(/@(media|import|keyframes|font-face|supports)\b/g, ''))) m.push(`${nama}: surel`);
  if (/(?:\+62|\b0)8\d{8,11}\b/.test(t)) m.push(`${nama}: nomor telepon`);
  if (/-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/.test(t) || /["']?(lat|lon|lng)\w*["']?\s*[:=]\s*-?\d+\.\d{4,}/i.test(t))
    m.push(`${nama}: koordinat lebih dari 3 desimal`);
  if (/\son[a-z]+\s*=\s*["'`]/i.test(t)) m.push(`${nama}: atribut on*`);
  if (/insertAdjacentHTML|document\.write\s*\(/.test(t)) m.push(`${nama}: sisipan HTML mentah`);
  for (const s of t.matchAll(/innerHTML\s*\+?=\s*([^;]*);/g)) {
    const rhs = s[1].trim();
    for (const e of rhs.matchAll(/\$\{([^}]*)\}/g)) if (!AMAN.test(e[1].trim())) m.push(`${nama}: innerHTML berdata mentah \${${e[1].trim()}}`);
    const tanpaTpl = rhs.replace(/`[^`]*`/g, '').replace(/"[^"]*"|'[^']*'/g, '').trim();
    if (tanpaTpl && !/^$/.test(tanpaTpl) && !/^(esc|escUrl|fmt)\(/.test(tanpaTpl)) m.push(`${nama}: innerHTML berdata mentah ${tanpaTpl}`);
  }
  if (t.includes(TITIK_TENGAH)) m.push(`${nama}: titik tengah`);
  if (t.includes(EM_DASH)) m.push(`${nama}: em dash`);
  const rendah = t.toLowerCase();
  for (const k of TERLARANG) if (rendah.includes(k)) m.push(`${nama}: kata terlarang "${k}"`);
  return m;
}

test(`berkas public/siklus paling banyak ${MAKS_BERKAS} (UJ-G0-11, DT 5.3; janji KA 28 paling banyak 200)`, () => {
  const n = daftar(PUB).length;
  assert.ok(n <= MAKS_BERKAS, `${n} berkas di public/siklus, batas ${MAKS_BERKAS}`);
  assert.ok(MAKS_BERKAS <= 200);
});

test('isi public/siklus bersih: tanpa surel, telepon, koordinat rinci, innerHTML mentah, on*, titik tengah, em dash, kata terlarang', () => {
  const m = daftar(PUB).filter((j) => /\.(js|css|html|json)$/.test(j))
    .flatMap((j) => periksaIsi(relative(ROOT, j), readFileSync(j, 'utf8')));
  assert.deepEqual(m, []);
});

test('mode gagal terbukti: pelanggaran buatan tertangkap satu per satu', () => {
  const kasus = [
    ['surel', 'hubungi a.b@contoh.go.id'],
    ['telepon', 'tel 081234567890'],
    ['koordinat', '{"lat": -6.123456, "lon": 106.1}'],
    ['koordinat', 'titik -6.12345, 106.12345'],
    ['on*', '<a onclick="x()">'],
    ['innerHTML berdata mentah', 'el.innerHTML = `<b>${d.nama}</b>`;'],
    ['innerHTML berdata mentah', 'el.innerHTML = teks;'],
    ['titik tengah', `a ${TITIK_TENGAH} b`],
    ['em dash', `a ${EM_DASH} b`],
    ['terlarang', 'Pantau Bencana'],
    ['terlarang', 'mitra strategis BNPB'],
  ];
  for (const [kata, isi] of kasus) assert.ok(periksaIsi('x', isi).some((s) => s.includes(kata)), `${kata}: ${isi}`);
});

test('yang sah lolos: innerHTML lewat esc/fmt, koordinat 3 desimal, @media', () => {
  const sah = 'el.innerHTML = `<b>${esc(d.nama)}</b> ${fmt(d.n)}`;\n@media (max-width:600px){}\n{"lat": -6.123, "lon": 106.123}';
  assert.deepEqual(periksaIsi('x', sah), []);
});

/* ---------- SK-029: halaman publik kejadian dan atribusi.json (UJ-F1-14 bagian layar, UJ-KP-12) ---------- */
const baca = (f) => readFileSync(join(ROOT, f), 'utf8');
const PUBLIK_ASET = [...baca('src/siklus.js').match(/const PUBLIK_ASET = new Set\(\[([^\]]*)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

test('daftar putih publik: berkas yang sudah ada terletak di public/siklus dan tidak ada aset staf di dalamnya', () => {
  for (const a of PUBLIK_ASET) if (existsSync(join(ROOT, 'public', a))) assert.ok(statSync(join(ROOT, 'public', a)).size > 0, a);
  for (const wajib of ['publik.html', 'publik.css', 'publik.js', 'data/atribusi.json', 'data/kamus.json']) assert.ok(existsSync(join(PUB, wajib)), `${wajib} belum ada`);
  assert.ok(!PUBLIK_ASET.some((a) => /inti\.js|siklus\.css|kejadian\.js|paparan\.js|dummy\.js|hitung\.js/.test(a)), 'aset staf masuk daftar putih');
});

test('atribusi.json: tiap sumber punya nama, lisensi, atribusi; lisensi tidak diklaim bila belum diketahui', () => {
  const a = JSON.parse(baca('public/siklus/data/atribusi.json'));
  assert.equal(a.v, 1); assert.ok(a.sumber.length >= 1);
  const id = new Set();
  for (const s of a.sumber) {
    for (const k of ['id', 'nama', 'lisensi', 'atribusi']) assert.ok(typeof s[k] === 'string' && s[k].length > 3, `${s.id}: ${k} kosong`);
    assert.ok(s.url_lisensi === 'menunggu' || /^https:\/\//.test(s.url_lisensi), `${s.id}: url_lisensi`);
    assert.ok(!id.has(s.id), `id ganda ${s.id}`); id.add(s.id);
    assert.ok(Array.isArray(s.dipakai_di) && s.dipakai_di.length, `${s.id}: dipakai_di`);
  }
  assert.ok(a.sumber.some((s) => s.dipakai_di.includes('F1')), 'tampil publik hanya sumber F1');
  assert.doesNotMatch(JSON.stringify(a), /"(total|jumlah_gabungan)"/);
});

test('kamus.json: enam label keyakinan persis KA 8, fase, jenis, kab, provinsi', () => {
  const k = JSON.parse(baca('public/siklus/data/kamus.json'));
  assert.deepEqual(Object.keys(k.label).sort(), ['asumsi-kebijakan', 'estimasi-model', 'hipotesis', 'menunggu', 'resmi', 'terverifikasi']);
  for (const l of Object.values(k.label)) assert.ok(l.kata && l.title && l.ikon);
  for (const f of ['terdeteksi', 'terverifikasi', 'tanggap', 'transisi', 'pemulihan', 'selesai', 'dibatalkan']) assert.ok(k.fase[f], f);
  assert.ok(Object.keys(k.jenis).length === 10 && Object.keys(k.provinsi).length >= 38 && Object.keys(k.kab).length > 500);
});

test('cangkang publik mandiri: tidak memuat inti.js staf dan tidak meminta rute staf', () => {
  const html = baca('public/siklus/publik.html'), js = baca('public/siklus/publik.js');
  const skrip = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]), css = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith('/'));
  for (const u of [...skrip, ...css]) assert.ok(/^\/inti\//.test(u) || u === '/siklus/publik.js' || u === '/siklus/publik.css', `aset non-publik: ${u}`);
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)/); assert.doesNotMatch(html, /\sstyle=/);
  assert.doesNotMatch(js, /\bimport\b|\/api\/staf|\/api\/instansi|\/api\/siklus\/(?!publik)/);
  assert.match(js, /Lisensi dan atribusi/); assert.doesNotMatch(js, /Sumber: |ex-ft/);
});

import { sajikan, bukaPeramban, cariChrome, galatNyata, KJ } from './_layar.mjs';
const chrome = cariChrome();
test('halaman publik di Chrome nyata: ringkasan resmi, panel atribusi, 404 seragam', { skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN' }, async (t) => {
  const pb = await bukaPeramban();
  const ada = (m, j) => (j === `/api/siklus/publik/kejadian/${KJ}` ? [200, { id: KJ, jenis: 'banjir', wilayah: 'Bogor, Jawa Barat', mulai: '2026-11-05', fase: 'tanggap', ringkasan: 'Banjir bandang merendam sebagian kecamatan.', yakin: 'resmi', diperbarui: '2026-11-06T03:00:00.000Z' }] : null);
  try {
    const s = await sajikan(ada, { tamu: true });
    try {
      const T = await pb.tab();
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        await T.ukuran(w, h); await T.buka(`${s.url}/siklus/kejadian/${KJ}`, { tunggu: '#pk .ex-std' });
        const d = await T.eval(`(() => ({t: document.querySelector('#pk').innerText, hl: !!document.querySelector('#pk h3 .hl'), ft: !!document.querySelector('.ex-ft'), lipat: document.querySelector('details.lipat summary').innerText, n: document.querySelectorAll('details.lipat .sk-atr > div').length, dummy: document.querySelectorAll('.sk-dummy').length}))()`);
        assert.match(d.t, /Banjir di Bogor, Jawa Barat, fase Tanggap/); assert.match(d.t, /Banjir bandang merendam/); assert.ok(d.hl && !d.ft); assert.match(d.lipat, /Lisensi dan atribusi/i); assert.ok(d.n >= 1); assert.equal(d.dummy, 0);
        const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`);
      }
      assert.deepEqual(galatNyata(T), []); assert.deepEqual(s.hilang, []);
      assert.ok(s.catat.every((c) => c.jalur.startsWith('/api/siklus/publik/')), 'tamu hanya memanggil rute publik');
      await T.buka(`${s.url}/siklus/kejadian/KJ-2026-ZZZZZZZZ`, { tunggu: '#pk .sk-kead' });
      assert.match(await T.eval(`document.querySelector('#pk').innerText`), /belum dibuka untuk umum/); await T.tutup();
    } finally { await s.tutup(); }
  } finally { await pb.tutup(); }
});
