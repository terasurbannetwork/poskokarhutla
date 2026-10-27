/* Skema SIPPA inti (migrations/0056_sippa_inti.sql): tiap CHECK dan trigger dibuktikan dengan sisipan yang WAJIB GAGAL, berpasangan dengan kembar yang WAJIB LOLOS
   (CHECK yang terlalu ketat juga ketahuan). Skema = migrasi() apa adanya di node:sqlite memori; tiap uji dibungkus BEGIN ... ROLLBACK oleh runner.
   RENCANA-UJI §3. Jalankan: node --test tests/warga/sippa_skema.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(migrasi());

/* berhenti di galat pertama: sesudah satu uji gagal, sisanya gagal tanpa dijalankan */
let rusak = null;
const uji = (nama, fn) => test(nama, () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  db.exec("BEGIN");
  try { fn(); } catch (e) { rusak = nama; throw e; } finally { db.exec("ROLLBACK"); }
});

let n = 0;
const id16 = () => (++n).toString(16).padStart(16, "0");
const T0 = 1_790_000_000_000;
const heks = k => "a".repeat(k);

function masuk(tabel, baris) {
  const k = Object.keys(baris);
  db.prepare(`INSERT INTO ${tabel} (${k.join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map(x => baris[x]));
  return baris;
}
const ada = (u, k, f) => (k in u ? u[k] : f());
const kit = (status = "gudang", u = {}) => masuk("sippa_kit", {id: id16(), kode: `SIPPA-${String(100 + n % 700).padStart(3, "0")}`, jenis: "gambut", status, dibuat: T0, diubah: T0, ...u}).id;

const DASAR = {
  sippa_kit: () => ({id: id16(), kode: `SIPPA-${String(100 + n % 700).padStart(3, "0")}`, jenis: "gambut", dibuat: T0, diubah: T0}),
  sippa_komponen: u => ({id: id16(), kit_id: ada(u, "kit_id", kit), kode_bom: "P-01", nama: "Pompa", jumlah: 1, satuan: "unit"}),
  sippa_gerak: u => ({id: id16(), kit_id: ada(u, "kit_id", () => kit(u.dari_status ?? "gudang")), dari_status: "gudang", ke_status: "depot", alasan: "pra_posisi", rencana: 0, tiba: T0 + 1, oleh: "tester", waktu: T0}),
  sippa_tugas: () => ({id: id16(), kode_sha: heks(63) + String(n % 10), nama_regu: "Regu A", unsur: "mpa", prov: "62", kab: "Pulang Pisau", mulai: T0, berakhir: T0 + 86400000, oleh: "tester"}),
  sippa_log_gelar: () => ({id: id16(), jenis: "karhutla", waktu_klien: T0, diterima: T0, oleh: "tugas:abc"}),
  sippa_probe: () => ({id: id16(), titik: "P1", tahap: "sebelum", kedalaman_cm: 10, suhu_c: 40, waktu: T0, oleh: "tester"}),
  sippa_bbm: () => ({id: id16(), waktu: T0, jenis: "solar", aksi: "terima", liter: 10, oleh: "tester"}),
  sippa_foto: () => ({id: id16(), mime: "image/jpeg", ukuran: 1000, waktu: T0, oleh: "tester"}),
  sippa_jalan_cek: () => ({id: id16(), kompleks_id: "K1", prov: "62", musim: "kemarau", hasil: "lolos", oleh: "tester", waktu: T0}),
  sippa_aoi_usul: () => ({id: id16(), kompleks_id: "K1", prov: "62", alasan: "gambut tebal", oleh: "tester", waktu: T0}),
  sippa_ab_unggah: () => ({id: id16(), sha: id16().repeat(4), n_baris: 10, oleh: "tester", waktu: T0}),
  sippa_petak: () => ({id: id16(), petak_id: `P${n}-x`, aoi: `A${n}`, lengan: "lance", tanggal_perlakuan: "2026-10-05", luas_m2: 100, sumber: "unggah"}),
  sippa_skenario: () => ({id: id16(), nama: "Skenario uji", state: "{}", versi_mesin: "mesin-1", oleh: "tester", waktu: T0}),
  sippa_laporan: () => ({id: id16(), jenis: "pilot", parameter: "{}", oleh: "tester", waktu: T0}),
};
const sah = (tabel, u = {}) => masuk(tabel, {...DASAR[tabel](u), ...u});
const tolak = (tabel, u, pola) => {
  const k = Object.keys(u)[0], p = pola ?? new RegExp(`CHECK constraint failed: .*${k}`, "s");
  assert.throws(() => sah(tabel, u), p, `${tabel}.${k}=${JSON.stringify(u[k])?.slice(0, 40)} DITERIMA, diharapkan ditolak oleh ${p}`);
};
const lolos = (tabel, u) => assert.doesNotThrow(() => sah(tabel, u), `${tabel} ${JSON.stringify(u).slice(0, 80)} DITOLAK padahal sah (CHECK terlalu ketat)`);
const galat = (sql, pola, pesan) => assert.throws(() => db.exec(sql), pola, pesan);
const status = id => db.prepare("SELECT status FROM sippa_kit WHERE id=?").get(id).status;
const STATUS = ["gudang", "depot", "gelar", "banjir", "servis", "hilang", "pensiun"];
const SAH = ["gudang>depot", "gudang>gelar", "gudang>banjir", "gudang>servis", "gudang>hilang", "gudang>pensiun", "depot>gudang", "depot>gelar", "depot>banjir", "depot>servis", "depot>hilang",
  "gelar>gudang", "gelar>depot", "gelar>banjir", "gelar>servis", "gelar>hilang", "banjir>gudang", "banjir>depot", "banjir>gelar", "banjir>servis", "banjir>hilang",
  "servis>gudang", "servis>hilang", "servis>pensiun", "hilang>gudang", "hilang>pensiun"];

uji("sippa umum: migrasi 0056 idempoten", () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0056_sippa_inti.sql"), "utf8");
  for (let i = 0; i < 2; i++) for (const s of pecah(sql)) db.exec(s);
  const tabel = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sippa\\_%' ESCAPE '\\'").all().map(r => r.name);
  assert.ok(tabel.length >= 10, `hanya ${tabel.length} tabel sippa_* sesudah 0056, diharapkan >= 10 (kit, komponen, gerak, tugas, log_gelar, probe, bbm, foto, jalan_cek, aoi_usul)`);
});

uji("sippa umum: kolom dummy NOT NULL DEFAULT 0 dan CHECK (0,1) di tiap tabel", () => {
  const tabel = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sippa\\_%' ESCAPE '\\'").all().map(r => r.name);
  for (const t of tabel) {
    const c = db.prepare(`SELECT * FROM pragma_table_info('${t}') WHERE name='dummy'`).get();
    assert.ok(c && c.notnull === 1 && String(c.dflt_value) === "0", `${t}.dummy tidak NOT NULL DEFAULT 0: ${JSON.stringify(c)}`);
    if (DASAR[t]) tolak(t, {dummy: 2});
  }
});

uji("sippa_kit: kode, jenis, status, kotak Indonesia, prov, catatan, dummy 900-999", () => {
  for (const kode of ["SIPPA-12", "SIPPA-1234", "sippa-001", "SIPPA-0A1"]) tolak("sippa_kit", {kode});
  lolos("sippa_kit", {kode: "SIPPA-001"});
  assert.throws(() => sah("sippa_kit", {kode: "SIPPA-001"}), /UNIQUE constraint failed: sippa_kit.kode/, "kode kembar DITERIMA");
  lolos("sippa_kit", {kode: "SIPPA-002"});
  tolak("sippa_kit", {jenis: "pipa"}); lolos("sippa_kit", {jenis: "pinjam_pilot"});
  tolak("sippa_kit", {status: "dipinjam"}); for (const s of STATUS) lolos("sippa_kit", {status: s});
  for (const u of [{lat: -12}, {lat: 7}, {lon: 94}, {lon: 142}]) tolak("sippa_kit", u);
  lolos("sippa_kit", {lat: -2.2, lon: 113.9}); lolos("sippa_kit", {lat: null, lon: null});
  tolak("sippa_kit", {prov: "620"}); lolos("sippa_kit", {prov: "62"}); lolos("sippa_kit", {prov: null});
  tolak("sippa_kit", {catatan: heks(1001)}); lolos("sippa_kit", {catatan: heks(1000)});
  tolak("sippa_kit", {dibuat: null}, /NOT NULL constraint failed: sippa_kit.dibuat/); tolak("sippa_kit", {diubah: null}, /NOT NULL constraint failed: sippa_kit.diubah/);
  tolak("sippa_kit", {kode: "SIPPA-901", dummy: 0}, /CHECK constraint failed: .*SIPPA-900/s); lolos("sippa_kit", {kode: "SIPPA-901", dummy: 1}); lolos("sippa_kit", {kode: "SIPPA-899", dummy: 0});
  assert.equal(status(sah("sippa_kit", {}).id), "gudang", "kit baru tanpa status eksplisit tidak berstatus 'gudang' (DEFAULT status)");
});

uji("sippa_komponen: FK kit, kode BOM, jumlah, satuan, kondisi", () => {
  tolak("sippa_komponen", {kit_id: "tidakada"}, /FOREIGN KEY constraint failed/); lolos("sippa_komponen", {});
  tolak("sippa_komponen", {kode_bom: "pompa"}); tolak("sippa_komponen", {kode_bom: "P1"}); lolos("sippa_komponen", {kode_bom: "P-01"});
  tolak("sippa_komponen", {jumlah: 0}); tolak("sippa_komponen", {jumlah: -1}); lolos("sippa_komponen", {jumlah: 0.5});
  tolak("sippa_komponen", {satuan: "kg"}); lolos("sippa_komponen", {satuan: "m"});
  tolak("sippa_komponen", {kondisi: "baru"}); lolos("sippa_komponen", {kondisi: "hilang"});
});

uji("sippa_gerak: kolom, pasangan transisi, tiba, eta, pengangkut", () => {
  assert.throws(() => sah("sippa_gerak", {kit_id: "tidakada"}), /FOREIGN KEY constraint failed|sippa_gerak_cek/, "gerak untuk kit yang tidak ada DITERIMA");
  tolak("sippa_gerak", {ke_status: "dipinjam"}, /CHECK constraint failed/);
  tolak("sippa_gerak", {alasan: "jalan_jalan"});
  for (const a of ["pra_posisi", "gelar", "bongkar", "pindah_banjir", "kembali", "servis", "hilang", "ditemukan", "pensiun", "koreksi"]) lolos("sippa_gerak", {alasan: a});
  const tidakSah = STATUS.flatMap(d => STATUS.map(k => `${d}>${k}`)).filter(p => !SAH.includes(p));
  assert.equal(tidakSah.length, 23, `pasangan tidak sah ${tidakSah.length}, diharapkan 49 - 26 = 23`);
  for (const p of tidakSah) { const [d, k] = p.split(">"); tolak("sippa_gerak", {dari_status: d, ke_status: k}, /CHECK constraint failed/); }
  for (const p of SAH) { const [d, k] = p.split(">"); lolos("sippa_gerak", {dari_status: d, ke_status: k}); }
  tolak("sippa_gerak", {rencana: 0, tiba: null}, /CHECK constraint failed: .*rencana = 1 OR tiba/s); lolos("sippa_gerak", {rencana: 1, tiba: null});
  tolak("sippa_gerak", {rencana: 2});
  tolak("sippa_gerak", {eta_jam: -1}); tolak("sippa_gerak", {eta_jam: 721}); lolos("sippa_gerak", {eta_jam: 720}); lolos("sippa_gerak", {eta_jam: null});
  tolak("sippa_gerak", {pengangkut: "tni"}); lolos("sippa_gerak", {pengangkut: "yontp"}); lolos("sippa_gerak", {pengangkut: null});
});

uji("sippa_gerak_cek: dari_status basi dan gerak saat rencana terbuka ditolak", () => {
  const k = kit("gudang");
  assert.throws(() => sah("sippa_gerak", {kit_id: k, dari_status: "depot", ke_status: "gelar"}), /sippa_gerak_cek/, "dari_status basi (kit di gudang, gerak dari depot) DITERIMA");
  lolos("sippa_gerak", {kit_id: k, rencana: 1, tiba: null});
  assert.throws(() => sah("sippa_gerak", {kit_id: k}), /sippa_gerak_cek/, "gerak baru saat ada gerak rencana terbuka DITERIMA");
  assert.equal(status(k), "gudang", "gerak rencana mengubah status kit sebelum tiba");
});

uji("sippa_gerak_terapkan dan sippa_gerak_tiba: status dan lokasi kit ikut berubah", () => {
  const k = kit("gudang");
  sah("sippa_gerak", {kit_id: k, ke_status: "depot", ke_lokasi: "Gudang Palangka", lat: -2.2, lon: 113.9, prov: "62", waktu: T0 + 5, tiba: T0 + 5});
  const a = db.prepare("SELECT * FROM sippa_kit WHERE id=?").get(k);
  assert.deepEqual([a.status, a.lokasi, a.lat, a.lon, a.prov, a.diubah], ["depot", "Gudang Palangka", -2.2, 113.9, "62", T0 + 5], "gerak langsung tidak menerapkan status+lokasi ke kit");
  const g = sah("sippa_gerak", {kit_id: k, dari_status: "depot", ke_status: "gelar", rencana: 1, tiba: null, ke_lokasi: "Petak 7"}).id;
  assert.equal(status(k), "depot", "rencana belum boleh mengubah kit");
  db.prepare("UPDATE sippa_gerak SET tiba=? WHERE id=?").run(T0 + 9, g);
  const b = db.prepare("SELECT * FROM sippa_kit WHERE id=?").get(k);
  assert.deepEqual([b.status, b.lokasi, b.lat, b.diubah], ["gelar", "Petak 7", -2.2, T0 + 9], "pengisian tiba tidak menerapkan rencana ke kit (lokasi lama tidak boleh hilang bila ke_lokasi kosong)");
});

uji("sippa_gerak_tetap dan sippa_gerak_hapus: hanya tambah, kecuali isi tiba dari kosong dan hapus dummy", () => {
  const g = sah("sippa_gerak", {tiba: 1}).id;
  galat(`UPDATE sippa_gerak SET ke_lokasi='x' WHERE id='${g}'`, /sippa_gerak_tetap/, "UPDATE ke_lokasi DITERIMA");
  galat(`UPDATE sippa_gerak SET tiba=2 WHERE id='${g}'`, /sippa_gerak_tetap/, "UPDATE tiba yang sudah terisi DITERIMA");
  const k = kit("gudang"), r = sah("sippa_gerak", {kit_id: k, rencana: 1, tiba: null}).id;
  galat(`UPDATE sippa_gerak SET tiba=NULL WHERE id='${r}'`, /sippa_gerak_tetap|NOT NULL|CHECK/, "tiba dikosongkan DITERIMA");
  galat(`UPDATE sippa_gerak SET alasan='gelar', tiba=${T0} WHERE id='${r}'`, /sippa_gerak_tetap/, "UPDATE alasan bersama tiba DITERIMA");
  assert.doesNotThrow(() => db.exec(`UPDATE sippa_gerak SET tiba=${T0 + 3} WHERE id='${r}'`), "isi tiba dari kosong DITOLAK");
  const k2 = kit("gudang"), r2 = sah("sippa_gerak", {kit_id: k2, rencana: 1, tiba: null}).id;
  db.exec(`UPDATE sippa_kit SET status='servis' WHERE id='${k2}'`);   // kit sudah pindah dari dari_status ('gudang') sebelum rencana tiba
  galat(`UPDATE sippa_gerak SET tiba=${T0 + 4} WHERE id='${r2}'`, /sippa_gerak_tetap/, "isi tiba saat status kit sudah bukan dari_status DITERIMA");
  assert.equal(status(k2), "servis", "rencana basi mengubah status kit");
  galat(`DELETE FROM sippa_gerak WHERE id='${g}'`, /sippa_gerak_hapus/, "DELETE baris nyata DITERIMA");
  const d = sah("sippa_gerak", {dummy: 1}).id;
  assert.doesNotThrow(() => db.exec(`DELETE FROM sippa_gerak WHERE id='${d}'`), "DELETE baris dummy DITOLAK");
});

uji("sippa_tugas: kode_sha, nama regu, unsur, masa berlaku 30 hari", () => {
  tolak("sippa_tugas", {kode_sha: heks(63)}); lolos("sippa_tugas", {kode_sha: heks(64)});
  assert.throws(() => sah("sippa_tugas", {kode_sha: heks(64)}), /UNIQUE constraint failed: sippa_tugas.kode_sha/, "kode_sha kembar DITERIMA");
  tolak("sippa_tugas", {nama_regu: "x"}); tolak("sippa_tugas", {nama_regu: heks(81)}); lolos("sippa_tugas", {nama_regu: "xy"}); lolos("sippa_tugas", {nama_regu: heks(80)});
  tolak("sippa_tugas", {unsur: "tni_ad"}); lolos("sippa_tugas", {unsur: "mpa"});
  tolak("sippa_tugas", {berakhir: T0}); tolak("sippa_tugas", {berakhir: T0 + 2592000001}); lolos("sippa_tugas", {berakhir: T0 + 2592000000});
});

uji("sippa_log_gelar: jenis, kelas, rentang angka, vonis pilot, jam meleset, oleh", () => {
  const L = "sippa_log_gelar";
  tolak(L, {jenis: "patroli"}); tolak(L, {kelas_medan: "IV"}); lolos(L, {kelas_medan: "III"}); lolos(L, {kelas_medan: null});
  tolak(L, {panjang_m: 5001}); tolak(L, {panjang_m: -1}); lolos(L, {panjang_m: 5000});
  tolak(L, {n_orang: 0}); tolak(L, {n_orang: 301}); lolos(L, {n_orang: 300}); lolos(L, {n_orang: 1});
  tolak(L, {jam_pompa: 721}); lolos(L, {jam_pompa: 720});
  tolak(L, {bbm_l: -0.1}); lolos(L, {bbm_l: 0});
  tolak(L, {catatan: heks(1001)}); lolos(L, {catatan: heks(1000)});
  for (const u of [{air_sampai_lance: 2}, {p_ujung_bar: 26}, {p_ujung_menit: 1441}, {p_ujung_sumber: "tebak"}, {kecelakaan: 2}, {konfigurasi: "{bukan json"}]) tolak(L, u);
  lolos(L, {air_sampai_lance: null, p_ujung_bar: null, p_ujung_menit: null, p_ujung_sumber: null, kecelakaan: null, konfigurasi: null});
  lolos(L, {air_sampai_lance: 1, p_ujung_bar: 2.5, p_ujung_menit: 60, p_ujung_sumber: "gauge", kecelakaan: 0, bocor_henti_menit: 5, konfigurasi: '{"od":160}'});
  tolak(L, {jam_klien_meleset: 2}); tolak(L, {jam_klien_meleset: null}, /NOT NULL constraint failed/); lolos(L, {jam_klien_meleset: 1});
  tolak(L, {oleh: "x"}); lolos(L, {oleh: "tugas:abc"}); lolos(L, {oleh: "staf:abc"}); lolos(L, {oleh: heks(12)});
});

uji("sippa_log_urut: urutan waktu tahap tidak boleh terbalik; banjir_m3 hanya jenis banjir", () => {
  const L = "sippa_log_gelar", pola = /sippa_log_urut/;
  const urut = ["t_tiba", "t_mulai_gelar", "t_air_mengalir", "t_mulai_injeksi", "t_selesai", "t_bongkar_selesai"];
  for (const u of [{t_tiba: 20, t_mulai_gelar: 10}, {t_mulai_gelar: 20, t_air_mengalir: 10}, {t_air_mengalir: 20, t_selesai: 10}, {t_selesai: 20, t_bongkar_selesai: 10},
    {t_air_mengalir: 20, t_mulai_injeksi: 10}, {t_tiba: 10, t_air_mengalir: 5}, {t_tiba: 10, t_selesai: 5}, {t_mulai_gelar: 10, t_bongkar_selesai: 5}, {t_air_mengalir: 10, t_bongkar_selesai: 5}])
    assert.throws(() => sah(L, u), pola, `urutan terbalik ${JSON.stringify(u)} DITERIMA oleh sippa_log_gelar`);
  lolos(L, Object.fromEntries(urut.map((k, i) => [k, 10 + i])));
  lolos(L, {t_tiba: 10, t_mulai_gelar: null, t_air_mengalir: 11, t_mulai_injeksi: null, t_selesai: 12});
  lolos(L, {t_tiba: 10, t_mulai_gelar: 10});
  assert.throws(() => sah(L, {jenis: "karhutla", banjir_m3: 10}), pola, "banjir_m3 pada jenis karhutla DITERIMA");
  lolos(L, {jenis: "banjir", banjir_m3: 10});
});

uji("sippa_log_tetap dan sippa_log_hapus: log hanya ditambah, koreksi = baris baru", () => {
  const a = sah("sippa_log_gelar", {}).id;
  galat(`UPDATE sippa_log_gelar SET catatan='x' WHERE id='${a}'`, /sippa_log_tetap/, "UPDATE log DITERIMA");
  galat(`UPDATE sippa_log_gelar SET dummy=1 WHERE id='${a}'`, /sippa_log_tetap/, "UPDATE dummy pada log DITERIMA");
  galat(`DELETE FROM sippa_log_gelar WHERE id='${a}'`, /sippa_log_hapus/, "DELETE log nyata DITERIMA");
  lolos("sippa_log_gelar", {koreksi_dari: a});
  const d = sah("sippa_log_gelar", {dummy: 1}).id;
  assert.doesNotThrow(() => db.exec(`DELETE FROM sippa_log_gelar WHERE id='${d}'`), "DELETE log dummy DITOLAK");
});

uji("sippa_probe: tahap, kedalaman (keputusan 50), suhu", () => {
  const P = "sippa_probe";
  tolak(P, {tahap: "48j"}); for (const t of ["sebelum", "sesudah", "24j", "72j", "7h", "30h", "90h"]) lolos(P, {tahap: t});
  for (const c of [600, 200, 0]) assert.throws(() => sah(P, {kedalaman_cm: c}), /CHECK constraint failed: .*kedalaman_cm/s, `sippa_probe.kedalaman_cm=${c} DITERIMA, diharapkan ditolak oleh CHECK (kedalaman_cm IN (10,30,50,100,150,300,400,500)); keputusan 50 melarang injeksi > 5 m`);
  for (const c of [10, 30, 50, 100, 150, 300, 400, 500]) lolos(P, {kedalaman_cm: c});
  tolak(P, {suhu_c: 1000}); tolak(P, {suhu_c: -11}); lolos(P, {suhu_c: 900}); lolos(P, {suhu_c: -10});
});

uji("sippa_bbm: jenis, aksi, liter, sippa_bbm_tetap, sippa_bbm_hapus", () => {
  const B = "sippa_bbm";
  tolak(B, {jenis: "pertalite"}); tolak(B, {aksi: "hapus"}); for (const a of ["terima", "keluar", "kembali", "koreksi"]) lolos(B, {aksi: a});
  tolak(B, {liter: 0}); tolak(B, {liter: 20001}); lolos(B, {liter: 20000});
  const a = sah(B, {}).id;
  galat(`UPDATE sippa_bbm SET liter=1 WHERE id='${a}'`, /sippa_bbm_tetap/, "UPDATE buku BBM DITERIMA");
  galat(`DELETE FROM sippa_bbm WHERE id='${a}'`, /sippa_bbm_hapus/, "DELETE BBM nyata DITERIMA");
  const d = sah(B, {dummy: 1}).id;
  assert.doesNotThrow(() => db.exec(`DELETE FROM sippa_bbm WHERE id='${d}'`), "DELETE BBM dummy DITOLAK");
});

uji("sippa_foto: mime dan ukuran", () => {
  tolak("sippa_foto", {mime: "image/png"}); lolos("sippa_foto", {mime: "image/jpeg"}); lolos("sippa_foto", {mime: "image/webp"});
  tolak("sippa_foto", {ukuran: 8388609}); tolak("sippa_foto", {ukuran: 0}); lolos("sippa_foto", {ukuran: 8388608});
});

uji("sippa_jalan_cek: musim, hasil, kendaraan", () => {
  const J = "sippa_jalan_cek";
  tolak(J, {musim: "pancaroba"}); tolak(J, {hasil: "ragu"}); tolak(J, {kendaraan: "heli"}); lolos(J, {kendaraan: null}); lolos(J, {kendaraan: "truk"});
});

uji("sippa_aoi_usul: status dan kompleks atau sel", () => {
  const A = "sippa_aoi_usul";
  tolak(A, {status: "disetujui"}); for (const s of ["usul", "survei", "terpilih", "ditolak"]) lolos(A, {status: s});
  tolak(A, {kompleks_id: null}, /CHECK constraint failed: .*kompleks_id IS NOT NULL OR sel/s); lolos(A, {kompleks_id: null, sel: "s12_34"});
});

uji("sippa 0057: migrasi idempoten, 4 tabel, tanpa INSERT OR IGNORE", () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0057_sippa_ab_skenario.sql"), "utf8");
  for (let i = 0; i < 2; i++) for (const s of pecah(sql)) db.exec(s);
  for (const t of ["sippa_ab_unggah", "sippa_petak", "sippa_skenario", "sippa_laporan"]) {
    const c = db.prepare(`SELECT * FROM pragma_table_info('${t}') WHERE name='dummy'`).get();
    assert.ok(c && c.notnull === 1 && String(c.dflt_value) === "0", `${t}.dummy tidak NOT NULL DEFAULT 0: ${JSON.stringify(c)}`);
  }
  assert.ok(!/INSERT OR IGNORE/i.test(sql), "0057 memakai INSERT OR IGNORE; harus ON CONFLICT(id) DO NOTHING");
});

uji("sippa_ab_unggah: status, sha UNIQUE, n_baris 1-2000", () => {
  const U = "sippa_ab_unggah";
  tolak(U, {status: "final"}); lolos(U, {status: "ditinjau_evaluator"}); lolos(U, {status: "draf"});
  tolak(U, {sha: heks(63)}); lolos(U, {sha: heks(64)});
  assert.throws(() => sah(U, {sha: heks(64)}), /UNIQUE constraint failed: sippa_ab_unggah.sha/, "sha unggahan kembar DITERIMA (rute harus 409)");
  tolak(U, {n_baris: 0}); tolak(U, {n_baris: 2001}); lolos(U, {n_baris: 2000}); lolos(U, {n_baris: 1});
  tolak(U, {nama_berkas: heks(121)}); lolos(U, {nama_berkas: heks(120)});
});

uji("sippa_petak: lengan, tanggal, luas, surfaktan, biaya, biner, sumber, unik (aoi, petak_id)", () => {
  const P = "sippa_petak";
  tolak(P, {lengan: "heli"}); for (const l of ["konvensional", "lance", "lance_surfaktan", "sekat_rewetting", "lance_dalam"]) lolos(P, {lengan: l});
  tolak(P, {tanggal_perlakuan: "2026-1-5"}); tolak(P, {tanggal_perlakuan: "26-10-05"}); lolos(P, {tanggal_perlakuan: "2026-10-05"});
  tolak(P, {luas_m2: 0.5}); tolak(P, {luas_m2: 100001}); lolos(P, {luas_m2: 1}); lolos(P, {luas_m2: 100000});
  tolak(P, {surfaktan_l: -1});
  assert.throws(() => sah(P, {lengan: "lance", surfaktan_l: 2}), /CHECK constraint failed: .*surfaktan_l = 0 OR lengan/s, "surfaktan > 0 di lengan bukan surfaktan DITERIMA");
  lolos(P, {lengan: "lance_surfaktan", surfaktan_l: 2}); lolos(P, {lengan: "lance", surfaktan_l: 0});
  tolak(P, {biaya_rp: -1}); lolos(P, {biaya_rp: null});
  for (const k of ["dingin_24j", "dingin_72j", "nyala_7h", "nyala_30h", "nyala_90h"]) { tolak(P, {[k]: 2}); for (const v of [null, 0, 1]) lolos(P, {[k]: v}); }
  tolak(P, {sumber: "email"}); lolos(P, {sumber: "lapangan"});
  sah(P, {aoi: "AX", petak_id: "P-001"});
  assert.throws(() => sah(P, {aoi: "AX", petak_id: "P-001"}), /UNIQUE constraint failed: sippa_petak.aoi, sippa_petak.petak_id/, "(aoi, petak_id) ganda DITERIMA");
  lolos(P, {aoi: "AY", petak_id: "P-001"});
});

uji("sippa_skenario: nama 3-80, state objek JSON <= 32 KB, ringkas JSON", () => {
  const S = "sippa_skenario", isi = k => `{"a":"${"x".repeat(k - 8)}"}`;
  tolak(S, {nama: "ab"}); tolak(S, {nama: heks(81)}); lolos(S, {nama: "abc"}); lolos(S, {nama: heks(80)});
  tolak(S, {state: "{bukan json"}); tolak(S, {state: "[1]"}); tolak(S, {state: "123"}); tolak(S, {state: isi(32769)}); lolos(S, {state: isi(32768)});
  tolak(S, {ringkas: "x"}); lolos(S, {ringkas: null}); lolos(S, {ringkas: "{}"});
  tolak(S, {versi_mesin: "v1"});
});

uji("sippa_laporan: jenis, parameter JSON, ukuran, ada_berkas wajib sha dan ukuran", () => {
  const L = "sippa_laporan";
  tolak(L, {jenis: "harian"}); for (const j of ["pilot", "kejadian", "mingguan", "musim", "skenario"]) lolos(L, {jenis: j});
  tolak(L, {parameter: "x"});
  tolak(L, {ukuran: 10485761}); lolos(L, {ukuran: 10485760});
  assert.throws(() => sah(L, {ada_berkas: 1, sha: null}), /CHECK constraint failed: .*ada_berkas = 0 OR/s, "ada_berkas = 1 tanpa sha DITERIMA");
  assert.throws(() => sah(L, {ada_berkas: 1, sha: heks(64), ukuran: null}), /CHECK constraint failed/, "ada_berkas = 1 tanpa ukuran DITERIMA");
  lolos(L, {ada_berkas: 1, sha: heks(64), ukuran: 10}); lolos(L, {ada_berkas: 0});
  tolak(L, {ada_berkas: 2});
});

/* ===== 0059_sippa_aset_pelihara.sql (RENCANA-UJI §3.6, keputusan 56) ===== */
const MIG59 = () => readFileSync(path.join(AKAR, "migrations/0059_sippa_aset_pelihara.sql"), "utf8");
const kodeAs = () => `AS-${String(n % 9000).padStart(4, "0")}`;
Object.assign(DASAR, {
  sippa_aset: () => ({id: id16(), kode: kodeAs(), kelas: "sumur_bor", nama: "Sumur A", sumber: "bpbd", pemilik_aset: "BPBD Kalteng", prov: "62", keyakinan: "resmi", dibuat: T0, diubah: T0, oleh: "tester"}),
  sippa_inspeksi: u => ({id: id16(), sasaran_jenis: "aset", sasaran_id: id16(), jenis: "berkala", skor: 0, prov: "62", oleh: "tester", waktu: T0, ...(u.sasaran_jenis === "komponen" ? {kit_id: kit()} : {})}),
  sippa_stok_gerak: () => ({id: id16(), gudang: "Gudang Palangka", kode_bom: "P-01", nama: "Pompa", delta: 1, satuan: "unit", alasan: "terima", oleh: "tester", waktu: T0}),
});
const STOK = (gudang, kode_bom, delta) => sah("sippa_stok_gerak", {gudang, kode_bom, delta, alasan: delta > 0 ? "terima" : "pakai"});

uji("sippa umum: migrasi 0059 idempoten dua kali, tiga tabel, tujuh trigger, kolom dummy", () => {
  for (let i = 0; i < 2; i++) for (const s of pecah(MIG59())) db.exec(s);
  const tabel = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sippa\\_%' ESCAPE '\\'").all().map(r => r.name);
  for (const t of ["sippa_aset", "sippa_inspeksi", "sippa_stok_gerak"]) assert.ok(tabel.includes(t), `${t} tidak ada sesudah 0059; tabel ada: ${tabel.join(",")}`);
  const trg = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'sippa\\_%' ESCAPE '\\'").all().map(r => r.name);
  for (const t of ["sippa_insp_komp_cek", "sippa_insp_komp_terapkan", "sippa_insp_tetap", "sippa_insp_hapus", "sippa_stok_cek", "sippa_stok_tetap", "sippa_stok_hapus"]) assert.ok(trg.includes(t), `trigger ${t} tidak ada`);
  for (const t of ["sippa_aset", "sippa_inspeksi", "sippa_stok_gerak"]) {
    const c = db.prepare(`SELECT * FROM pragma_table_info('${t}') WHERE name='dummy'`).get();
    assert.ok(c && c.notnull === 1 && String(c.dflt_value) === "0", `${t}.dummy tidak NOT NULL DEFAULT 0: ${JSON.stringify(c)}`);
    tolak(t, {dummy: 2});
  }
});

uji("sippa_aset: kelas, kode, pemilik aset, atribut, rehab Q10", () => {
  const A = "sippa_aset";
  tolak(A, {kelas: "sumur"});
  for (const k of ["sumur_bor", "pompa_sumur", "pipa_sementara", "tandon_hidran", "pipa_koridor", "jembatan_darurat", "jembatan_permanen"]) lolos(A, {kelas: k});
  for (const kode of ["AS-1", "AS-12345", "as-0001"]) tolak(A, {kode});
  tolak(A, {kode: "AS-9001", dummy: 0}, /CHECK constraint failed: .*AS-9000/s); lolos(A, {kode: "AS-9001", dummy: 1}); lolos(A, {kode: "AS-0001"});
  assert.throws(() => sah(A, {kode: "AS-0001"}), /UNIQUE constraint failed: sippa_aset.kode/, "kode kembar DITERIMA");
  tolak(A, {pemilik_aset: null}, /NOT NULL constraint failed: sippa_aset.pemilik_aset/); tolak(A, {pemilik_aset: "ab"}); lolos(A, {pemilik_aset: "abc"}); lolos(A, {pemilik_aset: heks(120)}); tolak(A, {pemilik_aset: heks(121)});
  tolak(A, {atribut: "[]"}); tolak(A, {atribut: "x"}); lolos(A, {atribut: "{}"});
  const obj = k => JSON.stringify({x: "a".repeat(k - 8)});
  assert.equal(obj(4097).length, 4097); tolak(A, {atribut: obj(4097)}); lolos(A, {atribut: obj(4096)});
  for (const z of ["kritis", "rusak"]) {
    tolak(A, {atribut: JSON.stringify({zona_konservasi: z})}, /CHECK constraint failed: .*rekomendasi_bg/s);
    lolos(A, {atribut: JSON.stringify({zona_konservasi: z, rekomendasi_bg: "BG-1"})});
    lolos(A, {kelas: "pompa_sumur", atribut: JSON.stringify({zona_konservasi: z})});
  }
  lolos(A, {atribut: JSON.stringify({zona_konservasi: "aman"})});
  tolak(A, {lat: 7}); tolak(A, {lon: 142}); lolos(A, {lat: -2.2, lon: 113.9}); tolak(A, {keyakinan: "estimasi-model"}); tolak(A, {status: "baru"});
});

uji("sippa_inspeksi: skor, sasaran, hasil uji, tambah-saja, trigger kondisi", () => {
  const I = "sippa_inspeksi";
  tolak(I, {skor: 4}); tolak(I, {skor: -1}); for (const s of [0, 1, 2, 3]) lolos(I, {skor: s});
  tolak(I, {sasaran_jenis: "komponen", kit_id: null}, /sippa_insp_komp_cek|CHECK constraint failed: .*kit_id IS NOT NULL/s);   // BEFORE INSERT jalan lebih dulu dari CHECK; salah satu cukup
  const k1 = kit(), k2 = kit();
  const komp = sah("sippa_komponen", {kit_id: k1}).id;
  galat(`INSERT INTO sippa_inspeksi (id,sasaran_jenis,sasaran_id,kit_id,jenis,skor,prov,oleh,waktu) VALUES ('${id16()}','komponen','${komp}','${k2}','berkala',0,'62','tester',${T0})`, /sippa_insp_komp_cek/, "komponen milik kit lain DITERIMA");
  lolos(I, {sasaran_jenis: "komponen", sasaran_id: komp, kit_id: k1, skor: 2, waktu: T0 + 5});
  const kd = db.prepare("SELECT kondisi, dicek FROM sippa_komponen WHERE id=?").get(komp);
  assert.deepEqual({...kd}, {kondisi: "rusak_berat", dicek: T0 + 5}, `skor 2 harus menulis kondisi='rusak_berat' dan dicek=waktu, hasil ${JSON.stringify(kd)}`);
  for (const [s, k] of [[0, "baik"], [1, "rusak_ringan"], [3, "hilang"]]) {
    lolos(I, {sasaran_jenis: "komponen", sasaran_id: komp, kit_id: k1, skor: s, waktu: T0 + 10 + s});
    assert.equal(db.prepare("SELECT kondisi FROM sippa_komponen WHERE id=?").get(komp).kondisi, k, `skor ${s} bukan ${k}`);
  }
  tolak(I, {jenis: "mutu_air"}, /CHECK constraint failed: .*e_coli_cfu/s); lolos(I, {jenis: "mutu_air", hasil: '{"e_coli_cfu":0}'});
  tolak(I, {jenis: "uji_tekanan"}, /CHECK constraint failed: .*tekanan_bar/s); lolos(I, {jenis: "uji_tekanan", hasil: '{"tekanan_bar":6}'});
  const a = sah(I, {}).id;
  galat(`UPDATE sippa_inspeksi SET skor=1 WHERE id='${a}'`, /sippa_insp_tetap/, "UPDATE inspeksi DITERIMA");
  galat(`DELETE FROM sippa_inspeksi WHERE id='${a}'`, /sippa_insp_hapus/, "DELETE inspeksi nyata DITERIMA");
  const d = sah(I, {dummy: 1}).id;
  assert.doesNotThrow(() => db.exec(`DELETE FROM sippa_inspeksi WHERE id='${d}'`), "DELETE inspeksi dummy DITOLAK");
  lolos(I, {id: "a".repeat(36)}); tolak(I, {id: "a".repeat(20)});
});

uji("sippa_stok_gerak: delta, saldo, tambah-saja", () => {
  const S = "sippa_stok_gerak";
  tolak(S, {delta: 0}); lolos(S, {delta: 1}); tolak(S, {delta: 100001}); tolak(S, {satuan: "kg"}); tolak(S, {alasan: "hilang"}); tolak(S, {kode_bom: "p01"});
  galat(`INSERT INTO sippa_stok_gerak (id,gudang,kode_bom,nama,delta,satuan,alasan,oleh,waktu) VALUES ('${id16()}','G-kosong','P-01','Pompa',-1,'unit','pakai','tester',${T0})`, /sippa_stok_cek/, "saldo negatif DITERIMA");
  STOK("G-uji", "P-01", 3); STOK("G-uji", "P-01", -2);
  assert.throws(() => STOK("G-uji", "P-01", -2), /sippa_stok_cek/, "keluar melebihi saldo (1) DITERIMA");
  assert.doesNotThrow(() => STOK("G-uji", "P-01", -1), "saldo tepat 0 DITOLAK");
  assert.throws(() => STOK("G-uji", "P-01", -1), /sippa_stok_cek/, "saldo 0 lalu keluar DITERIMA");
  assert.throws(() => STOK("G-lain", "P-01", -1), /sippa_stok_cek/, "saldo gudang lain tercampur");
  const a = sah(S, {}).id;
  galat(`UPDATE sippa_stok_gerak SET delta=2 WHERE id='${a}'`, /sippa_stok_tetap/, "UPDATE stok DITERIMA");
  galat(`DELETE FROM sippa_stok_gerak WHERE id='${a}'`, /sippa_stok_hapus/, "DELETE stok nyata DITERIMA");
  const d = sah(S, {dummy: 1}).id;
  assert.doesNotThrow(() => db.exec(`DELETE FROM sippa_stok_gerak WHERE id='${d}'`), "DELETE stok dummy DITOLAK");
});

/* ===== 0058_sippa_telemetri.sql (RENCANA-UJI §3.4, keputusan 38): satu baris per pesan ===== */
const MIG58 = () => readFileSync(path.join(AKAR, "migrations/0058_sippa_telemetri.sql"), "utf8");
const tokenSha = () => (++n).toString(16).padStart(64, "0");
const bacaanN = k => JSON.stringify(Array.from({length: k}, (_, i) => ["PT-101", T0 + i, 1.5, 0, null]));
Object.assign(DASAR, {
  sippa_perangkat: u => ({id: id16(), kit_id: ada(u, "kit_id", kit), tag: "PT-101", jenis: "tekanan", satuan: "bar", dibuat: T0}),
  sippa_telemetri: u => ({id: id16() + id16(), pengirim_id: ada(u, "pengirim_id", () => sah("sippa_perangkat", {jenis: "gateway", tag: "U-102", satuan: "-", token_sha: tokenSha()}).id), kit_id: "k", diterima: T0, t_awal: T0, t_akhir: T0, n: 1, bacaan: bacaanN(1)}),
  sippa_telemetri_harian: () => ({perangkat_id: id16(), hari: "2026-10-05", n: 10}),
  sippa_alarm: () => ({id: id16(), perangkat_id: id16(), kit_id: id16(), kode: "diam", mulai: T0}),
});

uji("sippa umum: migrasi 0058 idempoten dua kali, empat tabel, kolom dummy NOT NULL DEFAULT 0 dan CHECK, tanpa INSERT OR IGNORE", () => {
  for (let i = 0; i < 2; i++) for (const s of pecah(MIG58())) db.exec(s);
  const tabel = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sippa\\_%' ESCAPE '\\'").all().map(r => r.name);
  for (const t of ["sippa_perangkat", "sippa_telemetri", "sippa_telemetri_harian", "sippa_alarm"]) {
    assert.ok(tabel.includes(t), `${t} tidak ada sesudah 0058; tabel ada: ${tabel.join(",")}`);
    const c = db.prepare(`SELECT * FROM pragma_table_info('${t}') WHERE name='dummy'`).get();
    assert.ok(c && c.notnull === 1 && String(c.dflt_value) === "0", `${t}.dummy tidak NOT NULL DEFAULT 0: ${JSON.stringify(c)}`);
    tolak(t, {dummy: 2});
  }
  assert.ok(!/INSERT OR IGNORE/i.test(MIG58()), "0058 memakai INSERT OR IGNORE; harus ON CONFLICT DO NOTHING");
});

uji("sippa_perangkat: tag P&ID, jenis, satuan, kedalaman, rentang sah, gateway wajib token, token unik, unik (kit, tag), interval", () => {
  const P = "sippa_perangkat";
  for (const tag of ["pt101", "PT_101", "PT-", "101", "PT-101-extra-x"]) tolak(P, {tag});
  for (const tag of ["PT-101", "T-108", "GPS-101"]) lolos(P, {tag});
  tolak(P, {jenis: "angin"}); for (const j of ["tekanan", "debit", "level", "suhu_gambut", "muka_air_tanah", "co", "pm25", "bbm", "rpm", "posisi"]) lolos(P, {jenis: j});
  lolos(P, {jenis: "gateway", token_sha: tokenSha()}); tolak(P, {jenis: "gateway", token_sha: null}); lolos(P, {jenis: "debit", token_sha: null});
  tolak(P, {satuan: "kg"}); tolak(P, {kedalaman_cm: 20}); lolos(P, {kedalaman_cm: 50}); lolos(P, {kedalaman_cm: 500});
  tolak(P, {min_sah: 5, maks_sah: 5}); tolak(P, {min_sah: 6, maks_sah: 5}); lolos(P, {min_sah: 5, maks_sah: 5.1}); lolos(P, {min_sah: null, maks_sah: 5}); lolos(P, {min_sah: 5, maks_sah: null});
  tolak(P, {interval_s: 9}); tolak(P, {interval_s: 3601}); lolos(P, {interval_s: 10}); lolos(P, {interval_s: 3600}); tolak(P, {aktif: 2});
  tolak(P, {token_sha: heks(63)}); tolak(P, {token_sha: heks(63) + "G"}); tolak(P, {token_sha: heks(63) + "A"}); lolos(P, {token_sha: heks(64)});
  assert.throws(() => sah(P, {token_sha: heks(64)}), /UNIQUE constraint failed: sippa_perangkat.token_sha/, "dua perangkat dengan token_sha sama DITERIMA");
  tolak(P, {tag_datar: heks(21)}); lolos(P, {tag_datar: heks(20)});
  const k1 = kit(), k2 = kit();
  lolos(P, {kit_id: k1, tag: "PT-101"});
  assert.throws(() => sah(P, {kit_id: k1, tag: "PT-101"}), /UNIQUE constraint failed: sippa_perangkat.kit_id, sippa_perangkat.tag/, "dua PT-101 di kit sama DITERIMA");
  lolos(P, {kit_id: k2, tag: "PT-101"});
  assert.throws(() => sah(P, {kit_id: id16()}), /FOREIGN KEY constraint failed/, "perangkat untuk kit yang tidak ada DITERIMA");
});

uji("sippa_telemetri: id 32 heks, id ganda, bacaan larik JSON <= 64 KB, n 1-500, n_mutu2 <= n, t_akhir >= t_awal, FK pengirim", () => {
  const T = "sippa_telemetri";
  tolak(T, {id: heks(31)}); tolak(T, {id: heks(33)}); lolos(T, {id: heks(32)});
  assert.throws(() => sah(T, {id: heks(32)}), /UNIQUE constraint failed: sippa_telemetri.id|PRIMARY KEY/i, "id pesan kembar DITERIMA (rute harus menghitungnya ganda)");
  tolak(T, {bacaan: "{}"}); tolak(T, {bacaan: "x"}); tolak(T, {bacaan: "5"}); lolos(T, {bacaan: "[]", n: 1});
  const besar = '["' + "x".repeat(65535) + '"]';
  assert.equal(besar.length, 65539); tolak(T, {bacaan: besar}); const pas = '["' + "x".repeat(65532) + '"]'; assert.equal(pas.length, 65536); lolos(T, {bacaan: pas});
  tolak(T, {n: 0}); tolak(T, {n: 501}); lolos(T, {n: 500, n_mutu2: 500, bacaan: bacaanN(500)}); lolos(T, {n: 1});
  tolak(T, {n_mutu2: 2}, /CHECK constraint failed: .*n_mutu2/s); tolak(T, {n_mutu2: -1}); lolos(T, {n_mutu2: 1});
  tolak(T, {t_awal: T0, t_akhir: T0 - 1}, /CHECK constraint failed: .*t_akhir >= t_awal/s); lolos(T, {t_awal: T0, t_akhir: T0}); lolos(T, {t_awal: T0, t_akhir: T0 + 1});
  assert.throws(() => sah(T, {pengirim_id: id16()}), /FOREIGN KEY constraint failed/, "pesan dari pengirim yang tidak terdaftar DITERIMA");
});

uji("sippa_telemetri_harian: PK (perangkat, hari), hari YYYY-MM-DD", () => {
  const H = "sippa_telemetri_harian", p = id16();
  lolos(H, {perangkat_id: p, hari: "2026-10-05"}); lolos(H, {perangkat_id: p, hari: "2026-10-06"});
  assert.throws(() => sah(H, {perangkat_id: p, hari: "2026-10-05"}), /UNIQUE constraint failed: sippa_telemetri_harian.perangkat_id, sippa_telemetri_harian.hari/, "dua baris (perangkat, hari) sama DITERIMA");
  for (const hari of ["2026-10-5", "26-10-05", "2026/10/05", "2026-20-05", "x"]) tolak(H, {hari});
  tolak(H, {n: null}, /NOT NULL constraint failed/);
});

uji("sippa_alarm: kode, satu alarm terbuka per (perangkat, kode), ditutup_oleh 3-40", () => {
  const A = "sippa_alarm", p = id16();
  tolak(A, {kode: "gempa"}); for (const k of ["hisap_rendah", "debit_rendah", "dry_run", "tekanan_lebih", "belum_dingin", "co_tinggi", "bbm_rendah", "diam"]) lolos(A, {kode: k});
  lolos(A, {perangkat_id: p, kode: "dry_run"});
  assert.throws(() => sah(A, {perangkat_id: p, kode: "dry_run"}), /UNIQUE constraint failed: sippa_alarm.perangkat_id, sippa_alarm.kode/, "dua alarm terbuka (perangkat, kode) sama DITERIMA");
  lolos(A, {perangkat_id: p, kode: "dry_run", ditutup: T0 + 1, ditutup_oleh: "otomatis"});   // satu terbuka, satu tertutup
  lolos(A, {perangkat_id: p, kode: "dry_run", ditutup: T0 + 2, ditutup_oleh: "otomatis"});   // dua tertutup tidak bentrok
  lolos(A, {perangkat_id: p, kode: "diam"});
  tolak(A, {ditutup_oleh: "ab"}); tolak(A, {ditutup_oleh: heks(41)}); lolos(A, {ditutup_oleh: heks(40), ditutup: T0 + 1}); lolos(A, {ditutup_oleh: "abc", ditutup: T0 + 1});
  tolak(A, {id: heks(15)}); tolak(A, {mulai: null}, /NOT NULL constraint failed/);
});
