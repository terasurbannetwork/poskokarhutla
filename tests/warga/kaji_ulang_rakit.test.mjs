/* Perakit draf kaji ulang KU-03 (data/kajian-bnpb/kaji-ulang/RENCANA-UJI.md T1, T2, T3, T4, T5, T7, T9) di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya,
   ditambah uji murni rakitKajiUlang. Jalankan: node --test tests/warga/kaji_ulang_rakit.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {siapkan} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor
import {pelakuKuBaca, pelakuSistem, kuMuatDraf, KU_SQL_DRAF, kuSqlTugas, KU_MAKS_KUERI_DRAF, Galat} from "../../src/hak.js";
import {rakitKajiUlang, KU_STATUS_DATA} from "../../src/kaji_ulang_rakit.js";
import {durasiTahap} from "../../src/sla.js";

const {DB} = await siapkan("uji-kaji-rakit"), MENIT = 6e4, JAM = 60 * MENIT, T0 = Date.parse("2026-11-01T00:00:00Z");
const KJ0 = "KJ-2026-0000000A", KJ1 = "KJ-2026-0000000B", KJ2 = "KJ-2026-0000000C";
const id16 = (() => { let i = 0; return () => (++i).toString(16).padStart(16, "0"); })();
const p = pelakuKuBaca;
const hitung = d => { let n = 0; return {n: () => n, DB: new Proxy(d, {get: (o, k) => k === "prepare" ? (...a) => (n++, o.prepare(...a)) : typeof o[k] === "function" ? o[k].bind(o) : o[k]})}; };
const kejadian = (id, o = {}) => DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'karhutla', 'Karhutla uji', '1601', '2026-11-01', ?, ?, 'manual', ?, ?, 'uji')")
  .bind(id, o.fase ?? "tanggap", o.fase_diubah ?? T0, o.dibuat ?? T0, T0).run();
const tugas = async (kj, o = {}) => {
  const id = id16();
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi, konfirmasi_pada, padam_pada, verif_pada, padam_verif, terdeteksi_awal) VALUES (?, '16', 'Kab. OKI', -3, 104, 3, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, o.dibuat ?? T0 + 2 * JAM, T0, o.konf ?? null, o.padam ?? null, o.verif ?? null, o.verif ? "padam_terverifikasi" : null, o.awal ?? null).run();
  if (kj) await DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, kab4, mulai, kejadian_id, diambil, dibuat, diubah) VALUES (?, 'tugas_api', ?, 'terpasang', 'karhutla', '1601', '2026-11-01', ?, 1, 1, 1)").bind(id16(), id, kj).run();
  return id;
};
for (const k of [KJ0, KJ1, KJ2]) await kejadian(k);

uji("T1 kejadian tanpa tugas, Lifeline, 3W: draf terbentuk, bagian kosong 'tidak ada data', tidak ada nol", async () => {
  const d = await kuMuatDraf({DB}, p, KJ0), r = rakitKajiUlang(d);
  assert.deepEqual(r.linimasa.map(e => e.sumber), ["sk_kejadian", "sk_kejadian"]);   // "Kejadian tercatat" dan fase terakhir; tanpa peristiwa tugas
  assert.equal(r.tugas.status, KU_STATUS_DATA.kosong); assert.equal(r.durasi.tugas.status, KU_STATUS_DATA.kosong);
  for (const b of [r.layanan, r.koordinasi, r.catatan_lapangan]) assert.equal(b.status, KU_STATUS_DATA.kosong);
  for (const k of Object.values(r.durasi.kejadian).filter(x => !x.status)) assert.deepEqual(k, {menit: null, ket: KU_STATUS_DATA.kosong});
  assert.ok(!/"(menit|n)":0\b/.test(JSON.stringify(r)), JSON.stringify(r));
  assert.equal(await kuMuatDraf({DB}, p, "KJ-2026-ZZZZZZZZ"), null);
  await assert.rejects(() => kuMuatDraf({DB}, pelakuSistem, KJ0), e => e instanceof Galat && e.status === 403);
});

uji("T2, T3, T4, T7 tugas terhubung: linimasa berurut, durasi = durasiTahap, deteksi perkiraan ditandai, urutan terbalik null, tanpa nama personel", async () => {
  const a = await tugas(KJ1, {dibuat: T0 + 2 * JAM, awal: T0 + JAM, konf: T0 + 3 * JAM, padam: T0 + 9 * JAM, verif: T0 + 20 * JAM});
  const b = await tugas(KJ1, {dibuat: T0 + 4 * JAM, konf: T0 + 6 * JAM, padam: T0 + 5 * JAM});   // padam sebelum konfirmasi; deteksi tanpa jam asli
  await tugas(null);   // tidak bertaut: tidak boleh muncul
  await DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, kab4, mulai, kejadian_id, diambil, dibuat, diubah) VALUES (?, 'tugas_api', 'tak-ada-tugasnya', 'terpasang', 'karhutla', '1601', '2026-11-01', ?, 1, 1, 1)").bind(id16(), KJ1).run();
  await DB.prepare("INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, garam, sandi_sha, dibuat) VALUES ('00000000000000aa', 'akunuji1', 'pemprov', 'prov', 'Sumsel', 'oki', '[\"16\"]', ?, ?, 1)").bind("g".repeat(32), "a".repeat(64)).run();
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, status_api) VALUES (?, ?, '00000000000000aa', 'klien-uji-1', 'tindakan', ?, 'menyala')").bind(id16(), a, T0 + 4 * JAM).run();
  await DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, token_sha, dibuat, kedaluwarsa, tiba_pada) VALUES (?, ?, '00000000000000aa', 'Budi Rahasia', 'driver', ?, 1, 2, ?)").bind(id16(), a, "b".repeat(64), T0 + 5 * JAM).run();
  await DB.prepare("INSERT INTO ops_pelajaran (id, tugas_id, catatan, oleh, dibuat) VALUES (?, ?, 'Sumber air jauh dari lokasi', 'Siti Rahasia', ?)").bind(id16(), a, T0 + 10 * JAM).run();
  await DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber) VALUES (?, ?, 'firms')").bind(a, T0 + 12 * JAM).run();
  const d = await kuMuatDraf({DB}, p, KJ1), r = rakitKajiUlang(d);
  assert.equal(d.tugas.length, 2, "hanya yang bertaut");
  assert.deepEqual([r.tugas.terhubung, r.tugas.dimuat, r.tugas.tanpa_tugas], [3, 2, 1]);
  const w = r.linimasa.map(e => e.waktu); assert.deepEqual(w, [...w].sort((x, y) => x - y), "urut naik");
  for (const t of ["deteksi", "tugas", "konfirmasi", "respons", "padam"]) assert.ok(r.linimasa.some(e => e.tahap === t), t);
  const det = r.linimasa.filter(e => e.tahap === "deteksi" && e.sumber === "tugas_api");
  assert.equal(det.find(e => e.ref === b).perkiraan, true, "T3"); assert.equal(det.find(e => e.ref === a).perkiraan, undefined);
  const tahap = Object.fromEntries(r.durasi.tugas.tahap.map(x => [`${x.dari}_${x.ke}`, x]));
  assert.equal(tahap.deteksi_tugas.n, 1, "T3: deteksi perkiraan tidak masuk median");
  assert.equal(tahap.deteksi_tugas.nilai_menit, durasiTahap(d.tugas.find(t => t.id === a)).deteksi_tugas, "= durasiTahap");
  assert.equal(tahap.tugas_konfirmasi.n, 2); assert.equal(tahap.konfirmasi_kabar.n, 1);
  assert.equal(tahap.konfirmasi_tiba.n, 1);
  assert.equal(durasiTahap(d.tugas.find(t => t.id === b)).tiba_padam, null, "T4 urutan terbalik = null, bukan negatif");
  assert.equal(tahap.padam_terverifikasi.n, 1);
  assert.deepEqual(r.catatan_lapangan.butir.map(x => x.catatan), ["Sumber air jauh dari lokasi"]);
  const teks = JSON.stringify(r); assert.ok(!/Rahasia/.test(teks), "T7"); assert.ok(!/"oleh"/.test(teks));
  assert.ok(r.celah.some(c => c.jenis === "tautan_tanpa_tugas" && c.n === 1));
  assert.ok(r.celah.some(c => c.jenis === "tahap" && c.tahap === "layanan" && c.ket === KU_STATUS_DATA.kosong), "tahap tanpa peristiwa = celah");
});

uji("T9 kueri terlayani indeks dan jumlahnya tetap (1 tugas = 200 tugas), maksimal MAKS_KUERI_DRAF", async () => {
  const plan = async (sql, ...b) => (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...b).all()).results.map(r => r.detail);
  const semua = {...KU_SQL_DRAF, tugas: kuSqlTugas(true, true, true)};
  for (const [k, sql] of Object.entries(semua)) {
    const rencana = await plan(sql, KJ1);
    assert.deepEqual(rencana.filter(d => /^SCAN/.test(d) && !/USING (COVERING )?INDEX/.test(d)), [], `${k}: ${rencana.join(" | ")}`);
  }
  assert.ok((await plan(semua.tugas, KJ1)).some(d => /SEARCH (t|tugas_api).*USING (COVERING )?INDEX sqlite_autoindex_tugas_api_1|SEARCH (t|tugas_api).*PRIMARY KEY/.test(d)), "tugas lewat PK, bukan pindai: " + (await plan(semua.tugas, KJ1)).join(" | "));
  const st = [];
  for (let i = 0; i < 200; i++) { const id = id16(); st.push(DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES (?, '16', 'Kab. OKI', -3, 104, 3, ?, ?)").bind(id, T0 + i, T0),
    DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, kab4, mulai, kejadian_id, diambil, dibuat, diubah) VALUES (?, 'tugas_api', ?, 'terpasang', 'karhutla', '1601', '2026-11-01', ?, 1, 1, 1)").bind(id16(), id, KJ2)); }
  await DB.batch(st);
  const sedikit = hitung(DB), banyak = hitung(DB);
  await kuMuatDraf({DB: sedikit.DB}, p, KJ0); const dB = await kuMuatDraf({DB: banyak.DB}, p, KJ2);
  assert.equal(dB.tugas.length, 200); assert.equal(sedikit.n(), banyak.n(), "jumlah kueri tidak tumbuh dengan jumlah tugas");
  assert.ok(banyak.n() <= KU_MAKS_KUERI_DRAF, `${banyak.n()} kueri`);
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES ('ffffffffffffff01', '16', 'Kab. OKI', -3, 104, 3, 1, 1)").run();
  await DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, kab4, mulai, kejadian_id, diambil, dibuat, diubah) VALUES (?, 'tugas_api', 'ffffffffffffff01', 'terpasang', 'karhutla', '1601', '2026-11-01', ?, 1, 1, 1)").bind(id16(), KJ2).run();
  const r = rakitKajiUlang(await kuMuatDraf({DB}, p, KJ2));
  assert.deepEqual([r.tugas.terhubung, r.tugas.dimuat, r.tugas.tidak_dimuat], [201, 200, 1]);
  assert.ok(r.celah.some(c => c.jenis === "tugas_tidak_dimuat" && c.n === 1), "tidak diam");
});

uji("T5 tabel lf_*, tw_*, tugas_muncul belum ada: 'belum diaktifkan', bukan 0", async () => {
  const lama = await siapkan("uji-kaji-rakit-lama", {sampai: "0141_"});
  await lama.DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', 'Banjir uji', '3201', '2026-11-01', 'tanggap', 1, 'manual', 1, 1, 'uji')").bind(KJ0).run();
  const r = rakitKajiUlang(await kuMuatDraf({DB: lama.DB}, p, KJ0));
  assert.equal(r.layanan.status, KU_STATUS_DATA.belum); assert.equal(r.koordinasi.status, KU_STATUS_DATA.belum);
  assert.equal(r.durasi.kejadian.layanan_merah_ke_hijau.status, KU_STATUS_DATA.belum);
  assert.ok(r.celah.some(c => c.jenis === "sumber_belum_aktif" && c.sumber === "layanan"));
});

uji("Lifeline dan 3W ada: warna terkini, merah ke hijau, hitungan per klaster tanpa nama; celah layanan tanpa riwayat", async () => {
  const kab = 
  await DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, '1601', '2026-11-01', 1)").bind(KJ0).run();
  for (const [ly, w, t] of [["listrik", "merah", 1], ["listrik", "hijau", 5], ["air", "kuning", 2]])
    await DB.prepare("INSERT INTO lf_riwayat (kejadian_id, kab4, layanan, warna, catatan, oleh, dibuat) VALUES (?, '1601', ?, ?, 'catatan staf cukup panjang ya', 'staf:1', ?)").bind(KJ0, ly, w, T0 + t * JAM).run();
  const r = rakitKajiUlang(await kuMuatDraf({DB}, p, KJ0));
  assert.equal(r.layanan.sel.find(s => s.layanan === "listrik").warna, "hijau");
  assert.deepEqual(r.durasi.kejadian.layanan_merah_ke_hijau.sel, [{kab4: "1601", layanan: "listrik", menit: 240}]);
  assert.deepEqual(r.celah.find(c => c.jenis === "layanan_tanpa_riwayat").layanan, ["sinyal", "jalan", "bbm", "faskes", "pangan", "pengungsian"]);
  assert.ok(r.linimasa.some(e => e.tahap === "layanan" && e.sumber === "lf_riwayat"));
});

uji("murni: potret dipangkas dengan penanda; durasi tingkat kejadian dari jejak fase; n = 1 tanpa persentil", () => {
  const kj = {id: KJ0, jenis: "karhutla", nama: "x", fase: "pemulihan", fase_diubah: 9, dibuat: 0}, jejak = [{waktu: 10 * MENIT, dari: "terverifikasi", ke: "tanggap"}, {waktu: 70 * MENIT, dari: "tanggap", ke: "pemulihan"}];
  const dasar = {kejadian: kj, kab: [], jejak, tugas: [], tautan: 0, muncul: null, pelajaran: null, layanan: null, baris3w: null, tawaran: null};
  let r = rakitKajiUlang(dasar);
  assert.deepEqual([r.durasi.kejadian.deteksi_ke_tanggap.menit, r.durasi.kejadian.tanggap_ke_pulih.menit], [10, 60]);
  assert.ok(r.linimasa.some(e => e.tahap === "pulih"));
  r = rakitKajiUlang({...dasar, jejak: [{waktu: 5, dari: "x", ke: "tanggap"}], kejadian: {...kj, dibuat: 100}});
  assert.deepEqual(r.durasi.kejadian.deteksi_ke_tanggap, {menit: null, ket: KU_STATUS_DATA.kosong}, "terbalik = tidak ada data");
  const banyak = Array.from({length: 300}, (_, i) => ({waktu: i, dari: "a", ke: "tanggap"}));
  r = rakitKajiUlang({...dasar, jejak: banyak}, {maksPotret: 5000});
  assert.ok(r.tidak_dimuat > 0 && r.catatan_pangkas === `${r.tidak_dimuat} peristiwa dan 0 catatan lapangan tidak dimuat`); assert.ok(JSON.stringify(r).length <= 5000, "seluruh potret, bukan hanya linimasa");
  assert.equal(r.linimasa.at(-1).waktu, 299, "yang terlama dipangkas");
  const satu = {id: "a", dibuat: 0, konfirmasi_pada: 60 * MENIT, bencana: "karhutla"};
  r = rakitKajiUlang({...dasar, tugas: [satu], tautan: 1});
  const tk = r.durasi.tugas.tahap.find(x => x.ke === "konfirmasi" && x.dari === "tugas");
  assert.deepEqual([tk.n, tk.nilai_menit, tk.p50_menit, tk.p90_menit, tk.dalam_target_pct], [1, 60, null, null, null]);
});

const dasarMurni = () => ({kejadian: {id: KJ0, jenis: "karhutla", nama: "x", fase: "tanggap", fase_diubah: 9, dibuat: 0}, kab: [], jejak: [], tugas: [], tautan: 0, muncul: null, pelajaran: null, layanan: null, baris3w: null, tawaran: null});

uji("T20 potret seluruhnya <= maksPotret: 400 catatan panjang dan linimasa besar dipangkas, penanda ada, urutan pangkas butir lalu peristiwa", () => {
  const pel = Array.from({length: 400}, (_, i) => ({id: String(i).padStart(16, "0"), tugas_id: "t", catatan: "c".repeat(1000), dibuat: i}));
  const jejak = Array.from({length: 50}, (_, i) => ({waktu: i, dari: "a", ke: "tanggap"}));
  const r = rakitKajiUlang({...dasarMurni(), pelajaran: pel, jejak});
  assert.ok(JSON.stringify(r).length <= 100000, String(JSON.stringify(r).length));
  assert.ok(r.catatan_lapangan.tidak_dimuat > 0 && r.catatan_lapangan.butir.length + r.catatan_lapangan.tidak_dimuat === 400);
  assert.equal(r.tidak_dimuat, 0, "linimasa utuh selama catatan cukup dipangkas"); assert.match(r.catatan_pangkas, /catatan lapangan tidak dimuat/);
  assert.ok(JSON.stringify(rakitKajiUlang({...dasarMurni(), pelajaran: pel, jejak}, {maksPotret: 3000})).length <= 3000);
});

uji("sumber terpotong: celah sumber_terpotong; Lifeline terpotong tidak mengeluarkan layanan_tanpa_riwayat", () => {
  const lf = [{kab4: "1601", layanan: "listrik", warna: "hijau", dibuat: 1}];
  const r = rakitKajiUlang({...dasarMurni(), kab: ["1601"], layanan: lf, terpotong: ["layanan", "muncul"]});
  assert.deepEqual(r.celah.filter(c => c.jenis === "sumber_terpotong").map(c => c.sumber), ["layanan", "muncul"]);
  assert.ok(!r.celah.some(c => c.jenis === "layanan_tanpa_riwayat"));
  assert.ok(rakitKajiUlang({...dasarMurni(), kab: ["1601"], layanan: lf}).celah.some(c => c.jenis === "layanan_tanpa_riwayat"));
});

uji("durasi kejadian: tanggap_mulai bila jejak kosong; pulih = yang lebih dulu antara pemulihan dan selesai; < 1 menit = ket, bukan 0", () => {
  const d = dasarMurni(); d.kejadian.dibuat = Date.parse("2026-11-01T00:00:00+07:00") - 60 * MENIT; d.kejadian.tanggap_mulai = "2026-11-01";
  let r = rakitKajiUlang(d);
  assert.deepEqual([r.durasi.kejadian.deteksi_ke_tanggap.menit, r.durasi.kejadian.deteksi_ke_tanggap.dari_tanggal], [60, true]);
  r = rakitKajiUlang({...dasarMurni(), jejak: [{waktu: 0, dari: "a", ke: "tanggap"}, {waktu: 30 * MENIT, dari: "transisi", ke: "selesai"}, {waktu: 90 * MENIT, dari: "selesai", ke: "pemulihan"}]});
  assert.equal(r.durasi.kejadian.tanggap_ke_pulih.menit, 30, "selesai lebih dulu = pulih");
  r = rakitKajiUlang({...dasarMurni(), jejak: [{waktu: 0, dari: "a", ke: "tanggap"}, {waktu: 20000, dari: "a", ke: "pemulihan"}]});
  assert.deepEqual(r.durasi.kejadian.tanggap_ke_pulih, {menit: null, ket: "kurang dari semenit"});
  r = rakitKajiUlang({...dasarMurni(), tugas: [{id: "a", dibuat: 0, konfirmasi_pada: 20000, bencana: "karhutla"}], tautan: 1});
  const tk = r.durasi.tugas.tahap.find(x => x.dari === "tugas" && x.ke === "konfirmasi");
  assert.equal(tk.nilai_menit, 0); assert.match(tk.ket, /kurang dari semenit/);
});

uji("kolom awal/penugasan hilang jadi celah belum diaktifkan; deteksi_perkiraan dengan n; tugas dimuat sebagian diberi penanda 'dari n dari N tugas'", () => {
  const t = Array.from({length: 3}, (_, i) => ({id: "t" + i, dibuat: i, bencana: "karhutla"}));
  let r = rakitKajiUlang({...dasarMurni(), tugas: t, tautan: 250, kolom: {awal: false, penugasan: false}});
  assert.deepEqual(r.celah.filter(c => c.jenis === "sumber_belum_aktif").map(c => c.sumber).sort(), ["catatan_lapangan", "kolom_deteksi_awal", "layanan", "penugasan", "tiga_w", "tugas_muncul"]);
  assert.equal(r.celah.find(c => c.jenis === "deteksi_perkiraan").n, 3);
  assert.equal(r.durasi.tugas.ket, "dari 3 dari 250 tugas");
});

uji("DB: kelebihan sumber pendamping terbaca batas + 1 lalu dipotong dan ditandai; Lifeline terpotong tanpa celah palsu", async () => {
  await DB.prepare("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1001) INSERT INTO lf_riwayat (kejadian_id, kab4, layanan, warna, catatan, oleh, dibuat) SELECT ?1, '1601', 'listrik', 'kuning', 'catatan staf cukup panjang ya', 'staf:1', i FROM n").bind(KJ2).run();
  const d = await kuMuatDraf({DB}, p, KJ2);
  assert.equal(d.layanan.length, 1000); assert.deepEqual(d.terpotong, ["layanan"]);
  const r = rakitKajiUlang(d);
  assert.ok(r.celah.some(c => c.jenis === "sumber_terpotong" && c.sumber === "layanan"));
  assert.ok(!r.celah.some(c => c.jenis === "layanan_tanpa_riwayat"));
  assert.deepEqual(d.kolom, {awal: true, penugasan: true});
});
