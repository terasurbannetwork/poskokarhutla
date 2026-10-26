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
