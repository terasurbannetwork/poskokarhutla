/* Log kerja per profil di modul selain RUTE_INSTANSI (profil-bpbd K5, D4): korban, LogPal, laporan karhutla. Satu titik: catatKerja di rute() worker.js.
   Worker + D1 sungguhan (Miniflare). Jalankan: node --test tests/warga/profil_log_modul.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256} from "./_bnpb.mjs";
import {profilAktif, PROFIL_KUNCI} from "./_profil.mjs";
import "../../src/worker.js";

const uji = berantai(), U = await siapkan("uji-profil-log-modul", {r2: true, ikat: {PROFIL_KUNCI}}), {api, DB} = U;
const PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, kini = Date.now();
async function akun(n) {
  const id = "9" + String(n).padStart(15, "0"), garam = "g".repeat(32), tok = (String(n).padStart(2, "0") + "5c").repeat(32).slice(0, 64);
  await DB.batch([DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
      VALUES (?, ?, 'pemprov', 'prov', 'BPBD Uji', ?, '["62"]', '62', ?, ?, 'aktif', 'Petugas', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`).bind(id, "logmodul" + n, "k" + n, garam, sha256(garam + "SandiUji123456"), `m${n}@b.id`, `62812003${String(n).padStart(4, "0")}`, kini),
    DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(tok), id, kini, kini + 36e5)]);
  const p = await profilAktif(DB, id);
  return {id, p, h: {cookie: `sesi_instansi=${tok}; ${p.cookie}`, ...PB}};
}
const kerja = (a) => DB.prepare("SELECT profil_id, rute FROM instansi_profil_log WHERE akun_id = ? AND jenis = 'kerja' ORDER BY id").bind(a.id).all().then(r => r.results);

uji("LogPal: POST oleh profil tercatat satu baris kerja; GET tidak menulis", async () => {
  const a = await akun(1);
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, a.h)).s, 200);
  assert.deepEqual(await kerja(a), [], "GET tidak mencatat");
  const r = await api("POST", "/api/instansi/logpal/gudang", {nama: "Gudang Uji Log", prov: "62", kapasitas_ton: 5}, a.h); assert.equal(r.s, 201, r.t);
  assert.deepEqual(await kerja(a), [{profil_id: a.p.id, rute: "POST /api/instansi/logpal/gudang"}]);
});
uji("Korban: POST lapor oleh profil tercatat, tanpa nama korban", async () => {
  const a = await akun(2), nama = "Siti Rahasia Log";
  const r = await api("POST", "/api/instansi/korban", {waktu_kejadian: kini - 72e5, prov: "62", kab: "Kapuas", bencana: "karhutla", meninggal: 1, luka_berat: 0, hilang: 0, kategori: "warga", penyebab: "terbakar", sumber: "laporan_langsung", kronologi: "Ditemukan di lahan terbakar.", nama_korban: nama}, a.h); assert.equal(r.s, 201, r.t);
  assert.deepEqual(await kerja(a), [{profil_id: a.p.id, rute: "POST /api/instansi/korban"}]);
  assert.ok(!JSON.stringify((await DB.prepare("SELECT * FROM instansi_profil_log").all()).results).includes(nama));
});
uji("Laporan karhutla: POST draf oleh profil tercatat dan satu kali", async () => {
  const a = await akun(3);
  const r = await api("POST", "/api/instansi/laporan/draf", {tanggal: new Date(kini - 864e5).toISOString().slice(0, 10), sumber: "prov:62", isi: {ringkasan: "ok"}, versi_dasar: 0, klien_id: "k" + "a".repeat(15)}, a.h); assert.ok(r.s < 300, r.t);
  assert.deepEqual(await kerja(a), [{profil_id: a.p.id, rute: "POST /api/instansi/laporan/draf"}]);
});
uji("Log kerja gagal (galat selain tabel hilang): tulisan penangan tetap 201, bukan 500", async () => {
  const a = await akun(4);
  await DB.prepare("CREATE TRIGGER uji_log_gagal BEFORE INSERT ON instansi_profil_log WHEN NEW.jenis = 'kerja' BEGIN SELECT RAISE(ABORT, 'disk penuh uji'); END").run();
  try {
    const r = await api("POST", "/api/instansi/logpal/gudang", {nama: "Gudang Uji Gagal Log", prov: "62", kapasitas_ton: 5}, a.h); assert.equal(r.s, 201, r.t);
    assert.deepEqual(await kerja(a), []);
  } finally { await DB.prepare("DROP TRIGGER uji_log_gagal").run(); }
});
