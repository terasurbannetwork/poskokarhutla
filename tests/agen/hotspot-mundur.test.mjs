// Gerbang: "Hotspot mundur". Tabel Hotspot di centurisk97.id TIDAK BOLEH menulis 0 di semua provinsi saat NASA FIRMS belum menerbitkan data hari ini.
//
// Sebab aturan ini (28 Okt 2026): FIRMS berhenti menerbitkan sejak 27 Okt +-20.25 WIB, sehingga hari ini tidak punya satu titik pun dan tabel menulis "0" di
// setiap provinsi. Pembaca menafsirkan 0 sebagai "tidak ada api", padahal artinya "belum ada data". Akibatnya keputusan lapangan bisa salah arah.
// Aturannya: selama hari ini belum punya satu titik TERHITUNG (lolos S.dihitung: keyakinan >= keyakinan_min, lokasi unik ~375 m), hitung() di public/index.html
//   - mengisi S.hariKosong = {hari, jam} pada rentang APA PUN (Hari ini maupun Kemarin), dibaca pop-up Situasi (sapa.js), bagikan.js, dan grafik 7 hari (cari.js);
//   - pada rentang "Hari ini" juga mengisi S.hotMundur (sama dengan S.hariKosong) dan memindahkan S.hariPilih ke hari terakhir yang berdata, sehingga tabel
//     memakai hari itu, berjudul "Data terakhir, ... s.d. ... WIB", dengan catatan "Belum ada data titik panas NASA FIRMS untuk hari ini.";
//   - kembali sendiri begitu satu titik terhitung bertanggal hari ini masuk (tidak ada yang disimpan).
// Peta.geoTitik() menghitung umur titik (u) dari jam SEKARANG; legenda menyebut tanggal titik saat mundur, dan jendela waktu Himawari-9 ("Api baru") HANYA saat mundur (hari biasa persis "Api baru").
//
// Uji ini MENJALANKAN kode nyata: fungsinya diambil dari public/index.html, sapa.js, bagikan.js, cari.js, dan angka_kawasan.js lewat potong() (tidak disalin),
// lalu diberi data sintetis. Hanya tiga keluaran yang dicocokkan sebagai teks (catatan amber, judul tabel, pembaca properti u) karena renderDaftar() terlalu
// bergantung DOM untuk dijalankan di node.
// Kalau jangkar potong() tidak ditemukan, kode pindah/berganti nama: sesuaikan jangkar di berkas ini ke kode yang baru; JANGAN hapus atau lemahkan ujinya.
//
// Baris titik = [lat, lon, jam_relatif_acuan, sensor, frp, keyakinan(0 rendah, 1 sedang, 2 tinggi), indeks_wilayah, "MM-DD"].
// Uji ini tidak membaca public/data (hidup, ditulis ulang pipeline); semua data sintetis dan tanggalnya tetap, tidak bergantung jam mesin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BERKAS = { index: 'public/index.html', angka: 'public/angka_kawasan.js', sapa: 'public/sapa.js', bagikan: 'public/bagikan.js', cari: 'public/cari.js' };
const AKAR = new URL('../../', import.meta.url);
const T = Object.fromEntries(Object.entries(BERKAS).map(([k, p]) => [k, readFileSync(new URL(p, AKAR), 'utf8')]));

const JAGA = 'Gerbang "Hotspot mundur": tabel Hotspot tidak boleh menulis 0 di semua provinsi saat NASA FIRMS belum menerbitkan data hari ini ' +
  '(0 terbaca "tidak ada api", padahal artinya "belum ada data"; insiden 27-28 Okt 2026). ';
const pesan = (rusak, perbaiki) => `${JAGA}${rusak} Perbaiki: ${perbaiki} Jangan melonggarkan uji ini supaya lolos.`;
const FIX_HITUNG = 'hitung() di public/index.html harus mengisi S.hariKosong (rentang apa pun) dan S.hotMundur (rentang Hari ini) selama hari ini belum punya satu titik pun yang lolos S.dihitung.';

/* dari kemunculan pertama `awal` sampai kemunculan pertama `akhir` sesudahnya (akhir tidak ikut) */
function potong(kunci, awal, akhir) {
  const src = T[kunci], nama = BERKAS[kunci];
  const jangkar = (apa, s) => pesan(`Jangkar ${apa} ${JSON.stringify(s)} tidak ditemukan di ${nama}, sehingga kode yang dijaga tidak bisa diambil dan fiturnya tidak teruji.`,
    'sesuaikan jangkar potong() di tests/agen/hotspot-mundur.test.mjs ke kode yang baru (fungsinya pindah atau berganti nama).');
  const i = src.indexOf(awal); assert.ok(i >= 0, jangkar('awal', awal));
  const j = src.indexOf(akhir, i + awal.length); assert.ok(j >= 0, jangkar('akhir', akhir));
  return src.slice(i, j);
}

(0, eval)(T.angka);   // globalThis.AngkaKawasan nyata (lokasi unik ~375 m per hari WIB)
const WIB = { timeZone: 'Asia/Jakarta' };   // sama dengan public/inti/format.js
const { hariSebelum, tglLain } = new Function('WIB', `${potong('index', 'const hariSebelum =', '\n')}\n${potong('index', 'const tglLain =', '\n')}\nreturn { hariSebelum, tglLain };`)(WIB);

const KODE_HITUNG = [
  potong('index', 'const masuk = b =>', '\n'), potong('index', 'const hariLama =', '\n'), potong('index', 'const diArsip =', '\n'), potong('index', 'const kunciHari =', '\n'),
  potong('index', 'function hitung() {', 'function klusterDi'),
].join('\n');
const DIHITUNG = T.index.match(/^ {2}S\.dihitung = b => \{.*\};$/m)?.[0];
assert.ok(DIHITUNG, pesan('Baris `S.dihitung = b => {...};` tidak ditemukan di public/index.html, jadi kriteria "titik terhitung" tidak bisa diambil.',
  'sesuaikan regex DIHITUNG di tests/agen/hotspot-mundur.test.mjs ke baris yang baru.'));

let urut = 0;
/* satu baris titik; lat/lon unik tiap baris supaya tidak runtuh jadi satu lokasi */
const brs = (jam, mmdd, yakin = 1, sensor = 'N20', wil = 0) => { urut++; return [-2 + urut * 0.01, 110 + urut * 0.01, jam, sensor, 5, yakin, wil, mmdd]; };
const WIB_ISO = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 16);
const mundur = (hari, jam = '19:21') => ({ hari, jam: Date.parse(`${hari}T${jam}:00+07:00`) });

/* S minimal untuk hitung(); hariWib = meta.hari_wib, rentang = pilihan kontrol Hari ini/Kemarin */
const buatS = ({ titik, acuan, hariWib = '2026-10-28', rentang = 'hari', wilKunci = [['62', '62|A', '62|A|x'], ['64', '64|B', '64|B|y']] }) =>
  ({ titik, rentang, titikPenuh: false, kmin: 1, acuan: new Date(acuan), arsip: new Map(), meta: { hari_wib: hariWib }, hariIni: hariWib.slice(5), kemarin: hariSebelum(hariWib).slice(5), wilKunci });
const hitung = S => new Function('S', 'AngkaKawasan', `${DIHITUNG}\n${KODE_HITUNG}\nhitung();`)(S, globalThis.AngkaKawasan);
function jalan(opsi) { const S = buatS(opsi); hitung(S); return S; }

const wajibMundur = (S, kasus) => { assert.ok(S.hotMundur, pesan(`${kasus}, tetapi S.hotMundur kosong: tabel akan menulis 0 di semua provinsi.`, FIX_HITUNG)); return S.hotMundur; };
const wajibKosong = (S, kasus) => { assert.ok(S.hariKosong, pesan(`${kasus}, tetapi S.hariKosong kosong: pop-up Situasi, bagikan, dan grafik 7 hari menulis "0 titik" untuk hari ini.`, FIX_HITUNG)); return S.hariKosong; };

/* ------------------------------------------------------------------ hitung() di index.html */
test('hari ini tanpa satu baris pun: tabel mundur ke hari terakhir yang berdata (bukan 0)', () => {
  const S = jalan({ titik: [brs(-3, '10-27'), brs(-0.5, '10-27'), brs(-30, '10-26')], acuan: '2026-10-27T12:21:00Z' });
  const m = wajibMundur(S, 'Rentang Hari ini dan tak ada satu titik pun bertanggal hari ini (28 Okt)');
  assert.equal(m.hari, '2026-10-27', pesan('Hari yang dipakai tabel bukan hari terakhir yang berdata (27 Okt).', FIX_HITUNG));
  assert.deepEqual(S.hariKosong, m, pesan('S.hariKosong harus sama dengan S.hotMundur pada rentang Hari ini.', FIX_HITUNG));
  assert.equal(WIB_ISO(m.jam), '2026-10-27T18:51', pesan('Jam "s.d. ... WIB" harus jam deteksi terhitung terbaru (acuan 12:21Z dikurangi 0,5 j = 18.51 WIB).', FIX_HITUNG));
  assert.equal(S.hariPilih, '10-27', pesan('S.hariPilih tidak pindah ke hari terakhir berdata, jadi kolom Titik masih membaca hari ini.', FIX_HITUNG));
  assert.equal(S.rentangHit, 'hari', pesan('Rentang Hari ini tidak boleh diubah oleh mundur (Cluster, Luas terbakar, dan Belum padam tetap membaca hari ini).', FIX_HITUNG));
  assert.equal(S.hit['62'], 2, pesan('Provinsi 62 harus menghitung 2 titik hari terakhir, bukan 0.', FIX_HITUNG));
});

test('hari ini HANYA berisi titik keyakinan rendah: tetap mundur, jam = titik terhitung terakhir (titik rendah tidak dihitung)', () => {
  // acuan 10:00 WIB 28 Okt; dua titik terhitung 22.00 dan 23.00 WIB 27 Okt (-12, -11 j); dua titik rendah 09.00 dan 09.30 WIB 28 Okt
  const S = jalan({ titik: [brs(-12, '10-27'), brs(-11, '10-27'), brs(-1, '10-28', 0), brs(-0.5, '10-28', 0)], acuan: '2026-10-28T03:00:00Z' });
  const m = wajibMundur(S, 'Hari ini hanya punya titik keyakinan rendah (yang tidak dihitung tabel) sehingga hasil hitungannya 0');
  assert.equal(m.hari, '2026-10-27', pesan('Hari mundur harus 27 Okt, hari terakhir yang punya titik terhitung.', FIX_HITUNG));
  assert.equal(WIB_ISO(m.jam), '2026-10-27T23:00', pesan('Jam harus milik titik TERHITUNG terakhir (23.00 WIB 27 Okt), bukan titik rendah 09.30 WIB 28 Okt: itu menipu pembaca bahwa data hari ini ada.', FIX_HITUNG));
  assert.equal(S.hit['62'], 2, pesan('Titik rendah hari ini tidak boleh ikut hitungan; harus 2 titik terhitung 27 Okt.', FIX_HITUNG));
  assert.equal(S.hariPilih, '10-27', pesan('S.hariPilih harus pindah ke 27 Okt.', FIX_HITUNG));
});

test('hari ini sudah punya titik terhitung: tabel normal, tidak mundur sama sekali', () => {
  const S = jalan({ titik: [brs(-30, '10-27'), brs(-0.5, '10-28', 1)], acuan: '2026-10-27T18:00:00Z' });
  const salah = 'Hari ini sudah punya titik terhitung, tetapi tabel masih mundur ke kemarin dan menyembunyikan angka hari ini.';
  assert.equal(S.hotMundur, null, pesan(salah, 'jangan isi S.hotMundur bila ada titik terhitung bertanggal hari ini.'));
  assert.equal(S.hariKosong, null, pesan(salah, 'jangan isi S.hariKosong bila ada titik terhitung bertanggal hari ini.'));
  assert.equal(S.hariPilih, '10-28', pesan(salah, 'S.hariPilih harus tetap hari ini.'));
  assert.equal(S.hit['62'], 1, pesan('Titik hari ini harus terhitung 1.', FIX_HITUNG));
});

test('rentang Kemarin dan hari ini kosong: hariKosong terisi, hotMundur null, tabel tetap Kemarin', () => {
  const S = jalan({ titik: [brs(-3, '10-27'), brs(-2, '10-27'), brs(-1, '10-27', 2), brs(-40, '10-26')], acuan: '2026-10-27T12:21:00Z', rentang: 'kemarin' });
  const k = wajibKosong(S, 'Rentang Kemarin dipilih dan hari ini kosong');
  assert.equal(k.hari, '2026-10-27', pesan('S.hariKosong.hari harus hari terakhir berdata (27 Okt).', FIX_HITUNG));
  assert.equal(S.hotMundur, null, pesan('Rentang Kemarin tidak boleh memindahkan tabel (hotMundur hanya untuk Hari ini): pengguna memilih Kemarin dengan sengaja.', 'isi S.hotMundur hanya bila r === "hari".'));
  assert.equal(S.rentangHit, 'kemarin', pesan('Rentang pilihan pengguna harus tetap Kemarin.', FIX_HITUNG));
  assert.equal(S.hariPilih, '10-27', pesan('Tabel harus tetap membaca kemarin (27 Okt).', FIX_HITUNG));
  assert.equal(S.hit['62'], 3, pesan('Kemarin punya 3 titik terhitung di provinsi 62.', FIX_HITUNG));
  assert.equal(S.tinggi['62'], 1, pesan('Kemarin punya 1 titik keyakinan tinggi di provinsi 62.', FIX_HITUNG));
});

test('rentang Kemarin tetapi hari ini TIDAK kosong: hariKosong dan hotMundur sama-sama null', () => {
  const S = jalan({ titik: [brs(-30, '10-27'), brs(-0.5, '10-28')], acuan: '2026-10-27T18:00:00Z', rentang: 'kemarin' });
  assert.equal(S.hotMundur, null, pesan('Hari ini punya titik terhitung; tidak ada alasan mundur.', FIX_HITUNG));
  assert.equal(S.hariKosong, null, pesan('Hari ini punya titik terhitung, tetapi S.hariKosong terisi: pop-up Situasi dan grafik akan menyebut "belum ada data" padahal ada.', FIX_HITUNG));
  assert.equal(S.hariPilih, '10-27', pesan('Rentang Kemarin harus tetap membaca 27 Okt.', FIX_HITUNG));
  assert.equal(S.hit['62'], 1, pesan('Kemarin punya 1 titik terhitung.', FIX_HITUNG));
});

test('jeda lebih dari sehari: hari terakhir berdata = dua hari lalu, bukan "kemarin"', () => {
  const S = jalan({ titik: [brs(-1, '10-26'), brs(-2, '10-26'), brs(-30, '10-25')], acuan: '2026-10-26T14:00:00Z' });
  const m = wajibMundur(S, 'Data berhenti sejak 26 Okt (jeda dua hari sebelum 28 Okt)');
  assert.equal(m.hari, '2026-10-26', pesan('Hari mundur harus 26 Okt, hari terakhir yang berdata.', FIX_HITUNG));
  assert.equal(S.hariPilih, '10-26', pesan('S.hariPilih harus pindah ke 26 Okt.', FIX_HITUNG));
  assert.equal(S.hit['62'], 2, pesan('26 Okt punya 2 titik terhitung.', FIX_HITUNG));
  assert.notEqual(m.hari, hariSebelum('2026-10-28'), pesan('Hari mundur tidak boleh dipaksa menjadi "kemarin": sapa dan bagikan membedakan "kemarin" dari "sejak <tanggal>", dan data ini tidak sehari sebelum hari laporan.', FIX_HITUNG));
});

test('acuan digeser titik_live: jam dihitung dari S.acuan yang berlaku, bukan acuan awal', () => {
  // acuan awal 12:21Z; titik_live menambah titik 27 Okt 21:00 WIB (14:00Z) lalu menggeser kolom jam: acuan baru 14:00Z, baris lama -1,65 j lebih awal
  const asli = jalan({ titik: [brs(-3, '10-27'), brs(-0.5, '10-27')], acuan: '2026-10-27T12:21:00Z' });
  const geser = jalan({ titik: [brs(-3 - 1.65, '10-27'), brs(-0.5 - 1.65, '10-27'), brs(0, '10-27')], acuan: '2026-10-27T14:00:00Z' });
  const sama = jalan({ titik: [brs(-3 - 1.65, '10-27'), brs(-0.5 - 1.65, '10-27')], acuan: '2026-10-27T14:00:00Z' });
  const jam = S => WIB_ISO(wajibMundur(S, 'Hari ini kosong').jam);
  assert.equal(jam(asli), '2026-10-27T18:51', pesan('Jam "s.d. ... WIB" salah untuk acuan awal.', FIX_HITUNG));
  assert.equal(jam(geser), '2026-10-27T21:00', pesan('Setelah titik_live menggeser acuan, jam harus mengikuti titik baru (21.00 WIB). Memakai acuan awal (S.acuan0) membuat jam "s.d." mundur beberapa jam.', 'hitung jam dari +S.acuan, bukan S.acuan0.'));
  assert.equal(sama.hotMundur.jam, asli.hotMundur.jam, pesan('Pergeseran acuan yang setara harus menghasilkan jam absolut yang sama.', 'hitung jam dari +S.acuan + jam_relatif * 36e5.'));
});

test('pergantian tahun: hari terakhir berdata 31 Des, hari ini 1 Jan', () => {
  const S = jalan({ titik: [brs(-0.5, '12-31')], acuan: '2026-12-31T15:00:00Z', hariWib: '2027-01-01' });
  const m = wajibMundur(S, 'Hari ini 1 Jan 2027 kosong, data terakhir 31 Des 2026');
  assert.equal(m.hari, '2026-12-31', pesan('Tahun harus 2026 (tahun titik), bukan 2027 (tahun hari ini): tanggal mundur akan melompat setahun ke depan.', 'turunkan tahun dari jam deteksi, bukan dari meta.hari_wib.'));
  assert.equal(S.hariPilih, '12-31', pesan('S.hariPilih harus 12-31.', FIX_HITUNG));
  assert.equal(S.hit['62'], 1, pesan('31 Des punya 1 titik terhitung.', FIX_HITUNG));
});

test('tak ada titik terhitung sama sekali (kosong, atau semua keyakinan rendah): tidak ada hari untuk mundur, tanggal tidak dikarang', () => {
  for (const [nama, titik] of [['S.titik kosong', []], ['semua keyakinan rendah', [brs(-1, '10-27', 0), brs(-2, '10-28', 0)]]]) {
    const S = jalan({ titik, acuan: '2026-10-27T12:21:00Z' });
    const salah = `${nama}: tidak ada satu pun hari yang punya data terhitung.`;
    assert.equal(S.hotMundur, null, pesan(`${salah} S.hotMundur mengarang hari.`, 'jangan mundur bila tidak ada titik terhitung di mana pun.'));
    assert.equal(S.hariKosong, null, pesan(`${salah} S.hariKosong mengarang hari.`, 'jangan isi hariKosong bila tidak ada titik terhitung di mana pun.'));
    assert.deepEqual(S.hit, {}, pesan(`${salah} Hitungan harus kosong.`, FIX_HITUNG));
  }
});

test('hitung() idempoten, dan kembali sendiri begitu titik terhitung hari ini masuk (titik rendah tidak cukup)', () => {
  const titik = [brs(-3, '10-27')];
  const S = buatS({ titik, acuan: '2026-10-27T12:21:00Z', wilKunci: [['62', '62|A', '62|A|x']] });
  const rekam = () => JSON.stringify([S.hotMundur, S.hariKosong, S.hit, S.hariPilih]);
  hitung(S); const a = rekam(); hitung(S);
  assert.equal(rekam(), a, pesan('Memanggil hitung() dua kali dengan data sama harus menghasilkan keadaan sama; hitung() dipanggil ulang oleh titik_live, ganti rentang, dan lain-lain.', 'reset S.hariKosong/S.hotMundur di awal hitung() dan jangan simpan keadaan dari panggilan sebelumnya.'));
  titik.push(brs(0, '10-28', 0)); hitung(S);
  assert.ok(S.hotMundur, pesan('Satu titik keyakinan rendah bertanggal hari ini tidak boleh mematikan mundur: tabel kembali ke 0.', 'tandai "ada" hanya untuk titik yang lolos S.dihitung (setelah pemeriksaan, bukan sebelum).'));
  titik.push(brs(0.0, '10-28', 1)); hitung(S);
  assert.equal(S.hotMundur, null, pesan('Begitu satu titik terhitung hari ini masuk, tabel harus kembali ke hari ini sendiri.', FIX_HITUNG));
  assert.equal(S.hariKosong, null, pesan('Begitu satu titik terhitung hari ini masuk, S.hariKosong harus kosong lagi.', FIX_HITUNG));
  assert.equal(S.hariPilih, '10-28', pesan('S.hariPilih harus kembali ke hari ini.', FIX_HITUNG));
  assert.equal(S.hit['62'], 1, pesan('Hari ini punya 1 titik terhitung.', FIX_HITUNG));
});

/* ------------------------------------------------------------------ pop-up Situasi (sapa.js) */
function pasangGlobalSapa() {
  const g = globalThis;
  g.document = { getElementById: () => null }; g.location = { search: '', pathname: '/' };
  g.SapaInti = { hariIni: () => '2026-10-28', sudah: () => true, ik: n => `[${n}]`, kartu: () => '', css() {}, dialog() {}, mulai() {} };
  g.esc = s => String(s); g.fmt = n => n == null ? '–' : Number(n).toLocaleString('id-ID'); g.namaProv = k => 'Prov' + k; g.jamWIB = () => 'jam';
  g.aksiLokasi = () => ''; g.muatJSON = async () => null; g.hariSebelum = hariSebelum; g.tglLain = tglLain; g.asapDi = undefined;
}
// hitung() dan html() ada di dalam IIFE sapa.js; dibuka lewat penyisipan satu baris sebelum SapaInti.css()
const SAPA = T.sapa.replace('  SapaInti.css();', '  globalThis.__t = {hitung, html};\n  SapaInti.css();');
assert.ok(SAPA !== T.sapa, pesan('Baris `  SapaInti.css();` tidak ditemukan di public/sapa.js, jadi hitung()/html() pop-up Situasi tidak bisa dibuka.', 'sesuaikan penyisipan SAPA di tests/agen/hotspot-mundur.test.mjs.'));
const kl = (id, prov, ini, kmrn, n = 5, extra = {}) => ({ properties: { id, prov, kab: 'Kab' + id, kec: 'Kec', awal: '2026-10-26T01:00:00+07:00', akhir: '2026-10-27T19:00:00+07:00', jam_sejak: 5, hari: 3, n, ini, kmrn, level: 2, lat: 0, lon: 0, gambut: false, ...extra } });
function sapa(S) {
  pasangGlobalSapa();
  globalThis.S = { meta: { dibuat: '2026-10-28T02:00+07:00', hari_wib: '2026-10-28', data_terakhir: '2026-10-27T19:21+07:00', status: ['a', 'b', 'c', 'd'] }, asap: null,
    kluster: { features: [kl('a', '62', 0, 600), kl('b', '62', 0, 375, 8, { gambut: true }), kl('c', '64', 0, 0)] }, hotMundur: null, hariKosong: null, ...S };
  (0, eval)(SAPA);
  const h = globalThis.__t.hitung(null, null), html = globalThis.__t.html(h);
  return { h, html, judul: html.match(/<h3 id="spJudul">(.*?)<\/h3>/s)[1] };
}

test('pop-up Situasi, data terakhir = kemarin: judul bertanggal dengan angka kemarin, tanpa panah naik/turun (rentang Kemarin: hotMundur null tidak mengubah)', () => {
  const r = sapa({ hariKosong: mundur('2026-10-27'), hotMundur: null });
  assert.match(r.judul, /^Belum ada data titik panas NASA FIRMS untuk hari ini\. Data terakhir Sel 27 Okt: <b>975<\/b> titik panas terdeteksi$/,
    pesan(`Judul pop-up Situasi harus menyatakan belum ada data hari ini lalu angka hari terakhir bertanggal. Judul sekarang: ${r.judul}`, 'sapa.js: bila S.hariKosong ada, pakai hariKosong (bukan hotMundur) untuk judul dan angka.'));
  assert.equal(r.h.ini, 975, pesan('Angka judul harus kolom "kmrn" kluster (hari terakhir), bukan 0.', 'sapa.js: bila hariKosong.kemarin, pakai p.kmrn.'));
  assert.deepEqual(r.h.provAwas.map(o => [o.k, o.ini]), [['62', 975]], pesan('Provinsi bertitik harus memakai angka hari terakhir.', 'sapa.js: provAwas memakai angka hari terakhir saat hariKosong.'));
  assert.match(r.html, /Titik panas Sel 27 Okt/, pesan('Kartu harus menyebut tanggal data (Sel 27 Okt), bukan "hari ini".', 'sapa.js: label kartu bertanggal saat hariKosong.'));
  assert.doesNotMatch(r.judul, /naik|turun|▲|▼/, pesan('Judul tidak boleh membandingkan dengan kemarin (tak ada hari ini untuk dibandingkan).', 'sapa.js: tanpa panah saat hariKosong.'));
});

test('pop-up Situasi, data terakhir lebih lama dari kemarin: "sejak <tanggal jam>", tanpa angka, tanpa provinsi bertitik', () => {
  const r = sapa({ hariKosong: mundur('2026-10-25', '21:00') });
  assert.equal(r.judul, 'Belum ada data titik panas NASA FIRMS sejak Min 25 Okt 21.00 WIB',
    pesan(`Untuk jeda lebih dari sehari, judul harus "sejak <tanggal jam>" tanpa angka. Judul sekarang: ${r.judul}`, 'sapa.js: bandingkan hariKosong.hari dengan hariSebelum(meta.hari_wib).'));
  assert.equal(r.h.provAwas.length, 0, pesan('Tidak boleh ada provinsi bertitik pada jeda panjang.', 'sapa.js: provAwas kosong bila data terakhir bukan kemarin.'));
  assert.equal(r.h.ini, 0, pesan('Angka judul harus 0/tersembunyi pada jeda panjang.', 'sapa.js: ini = 0 bila data terakhir bukan kemarin.'));
});

test('pop-up Situasi tanpa hariKosong: judul lama persis (hotMundur saja tidak memicu catatan "belum ada data")', () => {
  const r = sapa({ hariKosong: null, hotMundur: mundur('2026-10-27') });
  assert.match(r.judul, /^<b>0<\/b> titik panas terdeteksi, <b class="turun">/, pesan(`Tanpa S.hariKosong judul harus kembali normal. Judul sekarang: ${r.judul}`, 'sapa.js: pemicu catatan hanya S.hariKosong.'));
});

/* ------------------------------------------------------------------ gambar/ekspor bagikan (bagikan.js) */
const KODE_HARIINI = potong('bagikan', '  hariIni() {', '  polos(');
function hariIniBagikan(S, en = false) {
  const B = new Function(`return {en: () => ${en}, ${KODE_HARIINI}}`)();
  globalThis.S = { hariIni: '10-28', hotMundur: null, hariKosong: null, dihitung: () => true, wilKunci: [['62', '62|A', '62|A|x'], ['64', '64|B', '64|B|y']],
    titik: [brs(-3, '10-27'), brs(-2, '10-27', 1, 'N20', 1), brs(-30, '10-26')], ...S };
  return B.hariIni();
}

test('bagikan.hariIni(): hariKosong (rentang apa pun, hotMundur null) menghitung hari terakhir berdata dengan label bertanggal', () => {
  const h = hariIniBagikan({ hariKosong: mundur('2026-10-27'), hotMundur: null });
  assert.equal(h.kunci, '10-27', pesan('Gambar/ekspor bagikan harus memakai hari terakhir berdata (27 Okt), bukan hari ini kosong.', 'bagikan.js hariIni(): pakai S.hariKosong untuk kunci hari.'));
  assert.equal(h.tot, 2, pesan('Total harus 2 titik hari terakhir, bukan 0.', 'bagikan.js hariIni(): hitung titik hari terakhir.'));
  assert.deepEqual(h.mdr, { tgl: 'Sel 27 Okt', pdk: '27 Okt', jam: '19.21' }, pesan('Label mundur (tanggal, jam) harus ikut, supaya gambar tidak tampil seolah data hari ini.', 'bagikan.js hariIni(): isi mdr dari S.hariKosong.'));
  assert.deepEqual(hariIniBagikan({ hariKosong: mundur('2026-10-27') }, true).mdr, { tgl: 'Tue 27 Oct', pdk: '27 Oct', jam: '19:21' }, pesan('Versi Inggris label mundur harus bertanggal Inggris.', 'bagikan.js hariIni(): locale en-GB bila this.en().'));
});

test('bagikan.hariIni(): tanpa hariKosong selalu hari ini (tidak ikut hotMundur atau pilihan Kemarin)', () => {
  const h = hariIniBagikan({ hariKosong: null, hotMundur: mundur('2026-10-27') });
  assert.equal(h.kunci, '10-28', pesan('Tanpa S.hariKosong gambar harus memakai hari ini; hotMundur (yang hanya mengikuti pilihan Hari ini) tidak boleh menggeser.', 'bagikan.js hariIni(): pemicu hanya S.hariKosong.'));
  assert.equal(h.mdr, null, pesan('Tanpa S.hariKosong tidak boleh ada label mundur.', 'bagikan.js hariIni(): mdr null bila hariKosong null.'));
  assert.equal(h.tot, 0, pesan('Tanpa titik hari ini total = 0 (angka normal).', 'bagikan.js hariIni().'));
});

/* ------------------------------------------------------------------ grafik 7 hari (cari.js) */
const KODE_GRAFIK = potong('cari', '  function apiKawasan(KL, di) {', '\n  }\n') + '\n  }';
const KODE_LIPAT = potong('cari', '  const lipat = ', '\n').trim().replace(/^const lipat = /, '').replace(/;$/, '');
function grafikCari(S) {
  const lipat = new Function(`return ${KODE_LIPAT}`)();
  const buat = new Function('S', 'hariLain', 'hariSebelum', 'fmt', 'lipat', 'esc', 'jamWIB', `${KODE_GRAFIK}\nreturn apiKawasan;`);
  const St = { meta: { hari_wib: '2026-10-28' }, titikPenuh: true, dihitung: () => true, titik: [brs(-3, '10-27', 1, 'N20', 0), brs(-2, '10-26', 1, 'N20', 0)], hotMundur: null, hariKosong: null, ...S };
  globalThis.fmt ||= n => String(n);
  return buat(St, () => ['2026-10-25'], hariSebelum, globalThis.fmt, lipat, s => s, () => '')([], () => true);   // KL kosong = hanya bagian grafik 7 hari
}

test('grafik 7 hari (cari.js): hariKosong menghapus batang hari ini dan memberi keterangan data satelit; tanpa hariKosong keterangan lama', () => {
  const kosong = grafikCari({ hariKosong: mundur('2026-10-27'), hotMundur: null }), biasa = grafikCari({ hariKosong: null });
  assert.match(kosong, /Belum ada data titik panas NASA FIRMS untuk hari ini\./, pesan('Grafik 7 hari harus menjelaskan bahwa data hari ini belum ada.', 'cari.js apiKawasan(): keterangan bergantung S.hariKosong.'));
  assert.doesNotMatch(kosong, /Hari ini belum sehari penuh/, pesan('Keterangan "belum sehari penuh" salah saat data sama sekali belum ada.', 'cari.js apiKawasan(): ganti keterangan saat S.hariKosong.'));
  assert.match(biasa, /Hari ini belum sehari penuh\./, pesan('Tanpa hariKosong keterangan lama harus tetap ada.', 'cari.js apiKawasan(): pertahankan keterangan lama.'));
  assert.doesNotMatch(biasa, /Belum ada data titik panas/, pesan('Tanpa hariKosong tidak boleh ada keterangan "belum ada data".', 'cari.js apiKawasan(): keterangan baru hanya saat S.hariKosong.'));
  const rect = h => (h.match(/<rect /g) || []).length;
  assert.equal(rect(biasa) - rect(kosong), 1, pesan('Tepat satu batang (hari ini) harus hilang saat data hari ini belum ada; batang 0 terbaca "tidak ada api".', 'cari.js apiKawasan(): jangan gambar rect hari ini saat S.hariKosong.'));
  assert.match(kosong, />–<\/text>/, pesan('Nilai hari ini harus ditulis "–", bukan 0.', 'cari.js apiKawasan(): tulis "–" saat S.hariKosong.'));
});

/* ------------------------------------------------------------------ legenda (index.html renderLegenda) */
const KODE_LEGENDA = potong('index', 'function renderLegenda() {', '\n}\n') + '\n}';
function legenda({ hotMundur = null, hwMeta = null, rentangHit = 'hari' }) {
  const stub = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : stub, apply: () => stub });
  const hasil = { html: '' };
  const el = new Proxy({ style: { setProperty() {} }, classList: { add() {}, contains: () => false }, children: [], appendChild() {} }, { get: (t, k) => k in t ? t[k] : stub, set: (t, k, v) => { t[k] = v; return true; } });
  const wadah = new Proxy({}, { get: (t, k) => k === 'innerHTML' ? hasil.html : stub, set: (t, k, v) => { if (k === 'innerHTML') hasil.html = v; return true; } });
  const dunia = { S: { panel: 'wil', legBuka: true, rentangHit, rentang: 'hari', hotMundur, meta: { status: ['a', 'b', 'c', 'd'] } }, Peta: { lihat: k => k === 'titik' || k === 'himawari', getZoom: () => 6 }, peta: { getZoom: () => 6 },
    Lapis: { cache: { hwMeta } }, Kini: { on: false }, tglLain, WIB, adaPfvi: () => false, bacaLokal: () => null, simpanLokal() {}, innerWidth: 1440, document: { createElement: () => el },
    $: s => s === '#legenda' ? wadah : el };
  const ctx = new Proxy(dunia, { has: (t, k) => typeof k === 'string' && (k in t || !(k in globalThis)), get: (t, k) => k in t ? t[k] : (k === Symbol.unscopables ? undefined : stub) });
  new Function('ctx', `with (ctx) { ${KODE_LEGENDA}; renderLegenda(); }`)(ctx);
  return hasil.html;
}
const HW = { acuan: '2026-10-27T21:40:00Z', jam: 3 };   // 04.40 WIB 28 Okt; jendela 01.40-04.40

test('legenda: saat mundur judulnya bertanggal (data terakhir) tanpa catatan umur; tanpa mundur judul lama', () => {
  const m = legenda({ hotMundur: mundur('2026-10-27') }), b = legenda({});
  assert.match(m, /Titik panas Sel 27 Okt \(data terakhir\)/, pesan('Legenda harus menyebut tanggal data terakhir saat tabel mundur, supaya warna titik tidak terbaca sebagai hari ini.', 'index.html renderLegenda(): judul bertanggal bila S.hotMundur.'));
  assert.doesNotMatch(m, />Umur titik panas</, pesan('Saat mundur, legenda umur titik panas lama tidak berlaku (umur kini dihitung dari jam sekarang).', 'index.html renderLegenda().'));
  assert.doesNotMatch(m, /Umur dihitung/, pesan('Catatan "Umur dihitung" tidak boleh muncul saat mundur.', 'index.html renderLegenda().'));
  assert.match(b, />Umur titik panas</, pesan('Tanpa mundur legenda umur titik panas harus tampil.', 'index.html renderLegenda().'));
  assert.doesNotMatch(b, /data terakhir|Umur dihitung/, pesan('Tanpa mundur legenda tidak boleh menyebut "data terakhir".', 'index.html renderLegenda().'));
});

test('legenda "Api baru" (Himawari-9): hari biasa persis "Api baru"; jendela waktu HANYA saat tabel mundur', () => {
  const HIMAWARI = /Himawari-9/, kecil = 'index.html renderLegenda(): ketHw = !S.hotMundur || acuan belum termuat ? "Api baru" : "Api baru · Himawari-9, <tgl> <jam awal>–<jam acuan> WIB".';
  const biasa = legenda({ hwMeta: HW });
  assert.match(biasa, /<\/i>Api baru<\/span>/, pesan('Hari biasa (tidak mundur) butir Deteksi Api Baru harus persis "Api baru" tanpa embel-embel.', kecil));
  assert.doesNotMatch(biasa, HIMAWARI, pesan('Hari biasa (tidak mundur) legenda tidak boleh menyebut Himawari-9 dan jendelanya: aturan pemilik 28 Okt 2026, jendela hanya disebut saat Hotspot mundur.', kecil));
  assert.match(legenda({ hwMeta: HW, hotMundur: mundur('2026-10-27') }), /<\/i>Api baru · Himawari-9, Rab 28 Okt 01\.40–04\.40 WIB<\/span>/,
    pesan('Saat tabel mundur, "Api baru" (satu-satunya api yang lebih baru dari data FIRMS terakhir) harus menyebut sumber Himawari-9 dan jendela waktunya.', kecil));
  assert.match(legenda({ hwMeta: { acuan: '2026-10-27T18:10:00Z', jam: 3 }, hotMundur: mundur('2026-10-27') }), /Himawari-9, Sel 27 Okt 22\.10–Rab 28 Okt 01\.10 WIB/,
    pesan('Saat mundur, jendela yang melewati tengah malam harus menyebut dua tanggal.', kecil));
  assert.doesNotMatch(legenda({ hwMeta: { acuan: '2026-10-27T18:10:00Z', jam: 3 } }), HIMAWARI, pesan('Hari biasa, jendela dua tanggal pun tidak boleh disebut.', kecil));
  const tanpaAcuan = legenda({ hwMeta: null, hotMundur: mundur('2026-10-27') });
  assert.match(tanpaAcuan, /<\/i>Api baru<\/span>/, pesan('Acuan Himawari belum termuat (juga saat mundur): cukup "Api baru".', kecil));
  assert.doesNotMatch(tanpaAcuan, HIMAWARI, pesan('Acuan Himawari belum termuat: jangan menyebut jendela yang tak diketahui.', kecil));
  assert.doesNotMatch(legenda({ hwMeta: HW, rentangHit: 'kemarin' }), /Deteksi Api Baru/, pesan('Rentang Kemarin tidak menampilkan butir Deteksi Api Baru.', 'index.html renderLegenda(): butir hanya untuk rentang Hari ini.'));
});

/* ------------------------------------------------------------------ umur titik di peta (Peta.geoTitik) */
const KODE_GEOTITIK = potong('index', '  geoTitik() {', '\n  },\n') + '\n  }';
function geoTitik(S, sekarang) {
  const Peta = new Function('S', 'masuk', 'Date', `return {${KODE_GEOTITIK}}`)(S, b => b[7] === S.hariPilih, { now: () => Date.parse(sekarang) });
  return Peta.geoTitik();
}

test('umur titik di peta (geoTitik): u = jam sejak SEKARANG, bukan sebelum S.acuan; setara setelah titik_live menggeser acuan', () => {
  const sekarang = '2026-10-28T03:00:00Z';   // 10.00 WIB
  const umur = (S, kini = sekarang) => geoTitik(S, kini).features.map(f => f.properties.u);
  const a = umur({ acuan: new Date('2026-10-27T12:21:00Z'), hariPilih: '10-27', titik: [brs(-0.5, '10-27'), brs(-3, '10-27'), brs(-40, '10-26')] });
  assert.deepEqual(a, [15.15, 17.65], pesan('Umur harus dihitung dari jam sekarang (03.00Z): 15,15 j dan 17,65 j; hari lain tersaring masuk(). Memakai -b[2] (umur sebelum acuan) membuat titik 27 Okt tampak baru (0,5 j dan 3 j) padahal FIRMS sudah berhenti sehari.', 'Peta.geoTitik() di public/index.html: u = (Date.now() - +S.acuan) / 36e5 - b[2].'));
  const g = umur({ acuan: new Date('2026-10-27T14:00:00Z'), hariPilih: '10-27', titik: [brs(-0.5 - 1.65, '10-27'), brs(-3 - 1.65, '10-27')] });
  assert.deepEqual(g, a, pesan('Pergeseran acuan oleh titik_live harus menghasilkan umur yang sama.', 'Peta.geoTitik(): hitung dari +S.acuan, bukan konstanta.'));
  const tua = umur({ acuan: new Date('2026-10-27T12:21:00Z'), hariPilih: '10-27', titik: [brs(-0.5, '10-27')] }, '2026-10-30T12:21:00Z')[0];
  assert.ok(tua > 72, pesan(`Data tiga hari lalu harus bermakna lebih dari 72 jam supaya berwarna paling tua; u = ${tua}.`, 'Peta.geoTitik(): u dari jam sekarang.'));
});

/* ------------------------------------------------------------------ teks yang tak bisa dijalankan di node */
test('pembaca properti u di lapisan titik index.html: warna step 6/24/72 jam dan popup "Umur deteksi"', () => {
  assert.match(T.index, /"circle-color": \["step", \["get", "u"\], "#fff4a8", 6, "#ecaa4f", 24, "#d4643c", 72, "#93352c"\]/,
    pesan('Warna lapisan titik tidak lagi membaca properti u dengan ambang 6/24/72 jam.', 'index.html: pertahankan "circle-color" step pada ["get", "u"] bila u berubah arti; sesuaikan regex bila warna sengaja diganti.'));
  assert.match(T.index, /kb\("Umur deteksi", \(p\.u < 1 \? "< 1" : fmt\(p\.u\)\) \+ " jam"\)/, pesan('Popup titik tidak lagi menulis "Umur deteksi" dari properti u.', 'index.html: popup titik membaca p.u.'));
  assert.doesNotMatch(T.index, /Sebelum lintasan terakhir/, pesan('Label lama "Sebelum lintasan terakhir" menyesatkan karena u kini dihitung dari jam sekarang.', 'index.html: ganti dengan "Umur deteksi".'));
});

test('tabel Hotspot saat mundur: catatan amber satu kalimat (.tr-cat) dan judul "Data terakhir, ... s.d. ... WIB"', () => {
  assert.match(T.index, /<div class="tr-cat l2">Belum ada data titik panas NASA FIRMS untuk hari ini\.<\/div>/,
    pesan('Catatan amber di atas tabel hilang atau berubah: pembaca melihat angka hari lalu tanpa tahu hari ini kosong.', 'index.html renderDaftar(): tampilkan `<div class="tr-cat l2">Belum ada data titik panas NASA FIRMS untuk hari ini.</div>` saat S.hotMundur.'));
  assert.doesNotMatch(T.index, /Angka di bawah adalah data terakhir/, pesan('Catatan harus tepat satu kalimat; kalimat "Angka di bawah..." sudah dicabut.', 'index.html renderDaftar(): hapus kalimat kedua.'));
  assert.match(T.index, /\.tr-cat\{/, pesan('Aturan CSS .tr-cat hilang sehingga catatan tampil polos.', 'index.html: kembalikan gaya .tr-cat (amber, .l2).'));
  assert.match(T.index, /Data terakhir, \$\{tglLain\(mundur\.hari\)\} s\.d\. /, pesan('Judul tabel "Data terakhir, <tanggal> s.d. <jam> WIB" hilang: pembaca tidak tahu angka itu milik hari mana.', 'index.html renderDaftar(): judul bertanggal saat mundur.'));
});
