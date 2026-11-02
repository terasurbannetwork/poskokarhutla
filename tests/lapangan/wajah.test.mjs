import test from "node:test";
import assert from "node:assert/strict";
import {KONST_PUBLIK} from "../../src/lapangan_konst.js";
import {vektorDari, kosinus, sudutCocok as sudutCocokServer} from "../../src/lapangan_konst.js";
import {radianKeDerajat, sudutDerajat, sudutCocok, arahDariSudut, cekMutu, pesanMutu, penghitung, pilihTerbaik, rataL2, keBase64, dariBase64, variansLaplacian, langkahKedip,
  buatTantangan, sisaDetik, badanWajah, pesanKamera, TEKS_ARAH} from "../../public/petugas/wajah_murni.js";

const K = KONST_PUBLIK;   // klien memakai konstanta yang sama persis dengan yang disajikan GET /api/petugas/konst
const dengan = (ubah) => ({...K, ...ubah});

test("sudutDerajat: radian Human ke derajat, nilai asing jadi 0", () => {
  assert.equal(radianKeDerajat(Math.PI), 180);
  const s = sudutDerajat({yaw: Math.PI / 2, pitch: -Math.PI / 6, roll: 1});
  assert.ok(Math.abs(s.yaw - 90) < 1e-9 && Math.abs(s.pitch + 30) < 1e-9);
  assert.deepEqual(sudutDerajat(undefined), {yaw: 0, pitch: 0});
  assert.deepEqual(sudutDerajat({yaw: "x", pitch: NaN}), {yaw: 0, pitch: 0});
});

test("sudutCocok: tiap arah, batas, dan sudut di antara arah", () => {
  assert.ok(sudutCocok(K, "depan", 0, 0) && sudutCocok(K, "depan", 8, -8));
  assert.ok(!sudutCocok(K, "depan", 8.1, 0) && !sudutCocok(K, "depan", 0, 9));
  assert.ok(sudutCocok(K, "kiri", -22, 12) && !sudutCocok(K, "kiri", -21.9, 0) && !sudutCocok(K, "kiri", -30, 13));
  assert.ok(sudutCocok(K, "kanan", 40, 0) && !sudutCocok(K, "kanan", 10, 0));
  assert.ok(sudutCocok(K, "atas", 0, -15) && !sudutCocok(K, "atas", 0, -14.9) && !sudutCocok(K, "atas", 13, -20));
  assert.ok(sudutCocok(K, "bawah", 12, 15) && !sudutCocok(K, "bawah", 0, 14));
});

test("sudutCocok: TANDA_YAW dan TANDA_PITCH dari konst membalik arah; sama dengan sudutCocok server", async () => {
  const balik = dengan({tanda_yaw: -1, tanda_pitch: -1});
  assert.ok(sudutCocok(balik, "kiri", 30, 0) && !sudutCocok(balik, "kiri", -30, 0));
  assert.ok(sudutCocok(balik, "atas", 0, 20) && !sudutCocok(balik, "atas", 0, -20));
  assert.ok(sudutCocok(K, "kiri", -30, 0) && !sudutCocok(K, "kiri", 30, 0));
});

test("sudutCocok klien sama dengan sudutCocok server di seluruh kisi sudut", () => {
  for (let y = -60; y <= 60; y += 3) for (let p = -40; p <= 40; p += 3) for (const a of K.arah)
    assert.equal(sudutCocok(K, a, y, p), sudutCocokServer(a, y, p), `${a} ${y} ${p}`);
});

test("sudutCocok: arah asing, __proto__, dan sudut bukan angka ditolak", () => {
  for (const a of ["", "atas ", "__proto__", "constructor", "toString", undefined]) assert.equal(sudutCocok(K, a, 0, 0), false, String(a));
  assert.equal(sudutCocok(K, "depan", NaN, 0), false);
  assert.equal(sudutCocok(K, "depan", 0, Infinity), false);
});

test("arahDariSudut: arah pertama yang cocok, null di antara arah", () => {
  assert.equal(arahDariSudut(K, 0, 0), "depan");
  assert.equal(arahDariSudut(K, 35, 0), "kanan");
  assert.equal(arahDariSudut(K, 15, 0), null);
});

const F = (o = {}) => ({jumlah: 1, skor: 0.95, lebarKotak: 300, lebarVideo: 640, tajam: 120, ...o});
test("cekMutu: lolos dan tiap alasan gagal", () => {
  assert.deepEqual(cekMutu(K.mutu, F()), {ok: true, alasan: null});
  assert.equal(cekMutu(K.mutu, F({jumlah: 0})).alasan, "tak_ada");
  assert.equal(cekMutu(K.mutu, null).alasan, "tak_ada");
  assert.equal(cekMutu(K.mutu, F({jumlah: 2})).alasan, "banyak");
  assert.equal(cekMutu(K.mutu, F({skor: 0.79})).alasan, "skor");
  assert.equal(cekMutu(K.mutu, F({lebarKotak: 100})).alasan, "jauh");        // 15,6% < 30%
  assert.equal(cekMutu(K.mutu, F({lebarKotak: 500})).alasan, "dekat");       // 78% > 75%
  assert.equal(cekMutu(K.mutu, F({tajam: 39.9})).alasan, "buram");
  assert.equal(cekMutu(K.mutu, F({skor: NaN})).alasan, "skor");
  assert.equal(cekMutu(K.mutu, F({lebarVideo: 0})).alasan, "jauh");
  assert.ok(cekMutu(K.mutu, F({lebarKotak: 192})).ok, "tepat 30% lolos");
});

test("ambang antispoof dan skor wajah TIDAK ada di klien", () => {
  assert.equal("antispoofMin" in K.mutu, false);
  for (const k of ["ambang_lolos", "ambang_tinjau", "ambang_hidup", "AMBANG_LOLOS", "radius"]) assert.equal(k in K, false);
});

test("pesanMutu: teks baku untuk cahaya, alasan asing jatuh ke teks cahaya", () => {
  assert.equal(pesanMutu("skor"), "Wajah kurang terang. Hadap ke cahaya");
  assert.equal(pesanMutu("__proto__"), pesanMutu("skor"));
  assert.equal(TEKS_ARAH.kiri, "Toleh pelan ke kiri");
  assert.equal(TEKS_ARAH.bawah, "Tunduk sedikit");
});

test("penghitung: n frame berturut, satu gagal mengosongkan", () => {
  const p = penghitung(5);
  assert.deepEqual([1, 2, 3, 4].map(() => p.tambah(true)), [false, false, false, false]);
  assert.equal(p.tambah(false), false); assert.equal(p.jumlah, 0);
  for (let i = 0; i < 4; i++) p.tambah(true);
  assert.equal(p.tambah(true), true);
});

test("pilihTerbaik: n skor tertinggi, stabil bila sama, masukan tidak berubah", () => {
  const a = [{skor: 0.9, id: "a"}, {skor: 0.97, id: "b"}, {skor: 0.9, id: "c"}, {skor: 0.85, id: "d"}, {skor: 0.97, id: "e"}];
  assert.deepEqual(pilihTerbaik(a, 3).map(x => x.id), ["b", "e", "a"]);
  assert.deepEqual(a.map(x => x.id), ["a", "b", "c", "d", "e"]);
  assert.equal(pilihTerbaik([{skor: 1}], 3).length, 1);
  assert.deepEqual(pilihTerbaik([], 3), []);
});

test("rataL2: rata-rata lalu norma 1; arah rata-rata dipertahankan", () => {
  const r = rataL2([Float32Array.of(3, 0, 0), Float32Array.of(3, 4, 0)]);
  const norma = Math.hypot(...r);
  assert.ok(Math.abs(norma - 1) < 1e-6);
  assert.ok(Math.abs(r[0] - 3 / Math.hypot(3, 2)) < 1e-6 && Math.abs(r[1] - 2 / Math.hypot(3, 2)) < 1e-6);
  const asli = Float32Array.of(0.1, 0.2, 0.3), tiga = rataL2([asli, asli, asli]);
  assert.ok(Math.abs(kosinus(tiga, asli) - 1) < 1e-6);
});

test("rataL2: kosong, panjang beda, dan vektor nol ditolak", () => {
  assert.throws(() => rataL2([]), /tidak ada/);
  assert.throws(() => rataL2([Float32Array.of(1, 2), Float32Array.of(1)]), /beda/);
  assert.throws(() => rataL2([new Float32Array(4)]), /nol/);
  assert.throws(() => rataL2([new Float32Array(0)]), /kosong/);
  assert.throws(() => rataL2([Float32Array.of(NaN, 1)]), /nol/);
});

test("base64 Float32: bolak-balik, little-endian, dan terbaca oleh vektorDari server", () => {
  const v = rataL2([Float32Array.from({length: 1024}, (_, i) => Math.sin(i))]);
  const b64 = keBase64(v), balik = dariBase64(b64);
  assert.equal(balik.length, 1024);
  for (let i = 0; i < 1024; i += 97) assert.equal(balik[i], v[i]);
  assert.equal(keBase64(Float32Array.of(1)), "AACAPw==");   // 1.0f little-endian = 00 00 80 3f
  assert.deepEqual([...vektorDari(b64)], [...v]);
  assert.ok(Math.abs(kosinus(b64, b64) - 1) < 1e-6);
  assert.throws(() => dariBase64(""), /kelipatan/);
  assert.throws(() => dariBase64(btoa("abc")), /kelipatan/);
});

test("variansLaplacian: datar 0, papan catur tajam, ukuran terlalu kecil 0", () => {
  const w = 16, datar = new Uint8Array(w * w).fill(120);
  assert.equal(variansLaplacian(datar, w, w), 0);
  const papan = Float32Array.from({length: w * w}, (_, i) => ((i % w) + Math.floor(i / w)) % 2 ? 255 : 0);
  assert.ok(variansLaplacian(papan, w, w) > 40);
  const landai = Float32Array.from({length: w * w}, (_, i) => i % w * 2);
  assert.ok(variansLaplacian(landai, w, w) < 1);
  assert.equal(variansLaplacian(datar, 2, 2), 0);
  assert.equal(variansLaplacian(new Uint8Array(4), 16, 16), 0);
});

test("langkahKedip: naik di atas 0,6 lalu turun di bawah 0,3; tanpa naik tidak selesai", () => {
  let s = {};
  for (const t of [0, 0.2, 0.5]) s = langkahKedip(s, t);
  assert.deepEqual(s, {naik: false, selesai: false});
  s = langkahKedip(s, 0.8); assert.equal(s.naik, true);
  s = langkahKedip(s, 0.4); assert.equal(s.selesai, false);
  s = langkahKedip(s, 0.1); assert.equal(s.selesai, true);
  assert.equal(langkahKedip(s, 1).selesai, true);
  assert.equal(langkahKedip({}, 0.1).selesai, false);
});

test("buatTantangan toleh_kiri: tiga frame kiri lalu tiga frame depan; gangguan mengosongkan hitungan", () => {
  const t = buatTantangan(K, "toleh_kiri"), kiri = {mutuOk: true, yaw: -30, pitch: 0, tutup: 0}, depan = {mutuOk: true, yaw: 0, pitch: 0, tutup: 0};
  assert.equal(t.langkah(kiri), false); assert.equal(t.langkah(kiri), false);
  assert.equal(t.langkah(depan), false, "putus di tengah");
  for (let i = 0; i < 3; i++) t.langkah(kiri);
  assert.equal(t.tahap, 1);
  assert.equal(t.langkah(kiri), false);
  assert.deepEqual([depan, depan, depan].map(f => t.langkah(f)), [false, false, true]);
});

test("buatTantangan toleh_kanan: menoleh ke kiri tidak menghitung; mutu buruk tidak menghitung", () => {
  const t = buatTantangan(K, "toleh_kanan");
  for (let i = 0; i < 5; i++) assert.equal(t.langkah({mutuOk: true, yaw: -30, pitch: 0}), false);
  for (let i = 0; i < 5; i++) t.langkah({mutuOk: false, yaw: 30, pitch: 0});
  assert.equal(t.tahap, 0);
  for (let i = 0; i < 3; i++) t.langkah({mutuOk: true, yaw: 30, pitch: 0});
  assert.equal(t.tahap, 1);
});

test("buatTantangan toleh dengan tanda perangkat terbalik: arah kiri butuh yaw positif", () => {
  const t = buatTantangan(dengan({tanda_yaw: -1}), "toleh_kiri");
  for (let i = 0; i < 3; i++) t.langkah({mutuOk: true, yaw: 30, pitch: 0});
  assert.equal(t.tahap, 1);
});

test("buatTantangan kedip: tidak butuh mutuOk; jenis asing ditolak", () => {
  const t = buatTantangan(K, "kedip");
  assert.equal(t.langkah({mutuOk: false, tutup: 0.9}), false);
  assert.equal(t.langkah({mutuOk: false, tutup: 0.0}), true);
  assert.throws(() => buatTantangan(K, "loncat"), /tidak dikenal/);
  assert.throws(() => buatTantangan(K, "__proto__"), /tidak dikenal/);
});

test("sisaDetik: turun terhadap waktu dan tidak negatif", () => {
  assert.equal(sisaDetik(0, 0, 8), 8);
  assert.equal(sisaDetik(0, 3000, 8), 5);
  assert.equal(sisaDetik(0, 99000, 8), 0);
});


test("badanWajah: lima arah wajib, mutu dibulatkan, semua arah dari konst", () => {
  const hasil = Object.fromEntries(K.arah.map((a, i) => [a, {vektor: "AACAPw==", mutu: 0.912345 + i / 1e6}]));
  const b = badanWajah(K, "human-3.3.6+faceres", hasil);
  assert.deepEqual(Object.keys(b.arah), K.arah);
  assert.equal(b.mutu.depan, 0.912);
  assert.equal(b.versi_model, "human-3.3.6+faceres");
  delete hasil.bawah;
  assert.throws(() => badanWajah(K, "x", hasil), /bawah/);
});

test("pesanKamera: kalimat manusiawi per galat peramban", () => {
  for (const n of ["NotAllowedError", "NotFoundError", "NotReadableError", "Aneh", undefined]) assert.ok(pesanKamera(n).length > 20 && !/[·—]/.test(pesanKamera(n)));
  assert.notEqual(pesanKamera("NotAllowedError"), pesanKamera("NotFoundError"));
});
