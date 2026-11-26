/* Prakiraan lawan Kejadian (data/kajian-bnpb/prediksi-kejadian/, PK-4 dan PK-7 sisi Worker): GET /api/dalops/lapor dan label logbook di
   GET /api/prediksi/konfirmasi, worker utuh di workerd + D1 + R2 dengan migrasi apa adanya. Jalankan: node --test tests/warga/dalops_lapor.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";

const uji = berantai();
const U = await siapkan("uji-dalops-lapor", {r2: true, ikat: {PIPA_TOKEN: "token-pipa-uji"}}), {DB, api, mf} = U;
const PIPA = {authorization: "Bearer token-pipa-uji"}, KINI = Date.now(), HARI = 864e5;
const wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
async function tiket(nomor, {jenis = "banjir", tingkat = "warga", kab = "32.71", status = "baru", lat = -6.6, lon = 106.8, waktu = KINI - HARI, wa = "6281200000001"} = {}) {
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES (?, ?, 'terkirim', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind("s" + nomor, wa, tingkat, jenis, kab, lat, lon, nomor, sha256(nomor), waktu, JSON.stringify({rahasia: "ISI-PERCAKAPAN"}), JSON.stringify({teks: "RINGKAS-RAHASIA"}), waktu, waktu),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, ?, ?)").bind(nomor, "s" + nomor, status, waktu)]);
}
const lapor = (q, h = ADMIN) => api("GET", "/api/dalops/lapor" + q, undefined, h);

uji("tamu dan akun gerbang 401; jenis asing atau kosong 400; sejak rusak atau lebih dari 14 hari 400", async () => {
  assert.equal((await lapor("?jenis=banjir", {})).s, 401);
  assert.equal((await lapor("?jenis=banjir", GERBANG)).s, 401);
  for (const q of ["", "?jenis=gempa", "?jenis=__proto__", "?jenis=banjir&sejak=besok", `?jenis=banjir&sejak=${wib(KINI - 15 * HARI)}`]) assert.equal((await lapor(q)).s, 400, q);
  assert.equal((await lapor(`?jenis=banjir&sejak=${wib(KINI - 14 * HARI)}`)).s, 200);
});

uji("isi: hanya kolom titik, tidak_valid dibuang, jenis dipetakan, pemeriksaan terakhir ikut, tanpa WA atau isi percakapan", async () => {
  await tiket("LA-261120-01", {tingkat: "bpbd"}); await tiket("LA-261120-02", {tingkat: "bpbd_klaim", kab: "32.72"});
  await tiket("LA-261120-03", {status: "tidak_valid"}); await tiket("LA-261120-04", {jenis: "longsor"});
  await tiket("LA-261120-05", {jenis: "abrasi"}); await tiket("LA-261120-06", {jenis: "tsunami"}); await tiket("LA-261120-07", {waktu: KINI - 10 * HARI});
  await DB.prepare("INSERT INTO lapor_periksa (nomor, hasil, catatan, perubahan, oleh, waktu) VALUES ('LA-261120-01', 'sebagian', 'catatan uji', '[]', 'x', ?)").bind(KINI).run();
  await DB.prepare("INSERT INTO lapor_periksa (nomor, hasil, catatan, perubahan, oleh, waktu) VALUES ('LA-261120-01', 'valid', 'catatan uji', '[]', 'x', ?)").bind(KINI + 1).run();
  const r = await lapor("?jenis=banjir"); assert.equal(r.s, 200, r.t);
  assert.equal(r.h.get("cache-control"), "private, no-store");
  const t = r.j.laporan.map(x => x.tiket).sort(); assert.deepEqual(t, ["LA-261120-01", "LA-261120-02"]);   // 03 tidak_valid, 04 longsor, 07 di luar jendela 7 hari
  const a = r.j.laporan.find(x => x.tiket === "LA-261120-01"), b = r.j.laporan.find(x => x.tiket === "LA-261120-02");
  assert.deepEqual(Object.keys(a).sort(), ["jenis", "kab", "lat", "lon", "periksa", "status", "tiket", "tingkat", "waktu"]);
  assert.deepEqual([a.tingkat, a.periksa, a.kab, a.status], ["bpbd", "valid", "32.71", "baru"]);
  assert.deepEqual([b.tingkat, b.periksa], ["warga", null]);
  for (const bocor of ["6281200000001", "ISI-PERCAKAPAN", "RINGKAS-RAHASIA"]) assert.ok(!r.t.includes(bocor), bocor);
  assert.equal((await lapor("?jenis=longsor")).j.laporan.length, 1);
  assert.deepEqual((await lapor("?jenis=gelombang")).j.laporan.map(x => x.jenis).sort(), ["abrasi", "tsunami"]);
  assert.equal((await lapor(`?jenis=banjir&sejak=${wib(KINI - 12 * HARI)}`)).j.laporan.length, 3);   // sejak lebih jauh memasukkan 07
});

uji("laju: batas per IP menjawab 429 sesudah 60 permintaan dalam 10 menit", async () => {
  const h = {...ADMIN, "cf-connecting-ip": "198.51.100.77"}; let s;
  for (let i = 0; i < 61; i++) s = (await lapor("?jenis=banjir", h)).s;
  assert.equal(s, 429);
});

uji("PK-7: konfirmasi memuat label logbook positif, hari_logbook dari rekap ok, tanpa nomor kejadian atau catatan", async () => {
  const sejak = wib(KINI - 5 * HARI), kemarin = wib(KINI - HARI), R2 = await mf.getR2Bucket("MEDIA");
  const kej = (id, mulai, kab_kode) => ({id, mulai, kab_kode, kab: ["X"], kondisi: "CATATAN-RAHASIA", petugas: "NAMA-PETUGAS"});
  await R2.put("dalops/banjir.json", JSON.stringify({kejadian: [kej("KJ-1", kemarin, ["11|Pidie Jaya", "11|Aceh Utara"]), kej("KJ-2", kemarin, ["11|Pidie Jaya"]), kej("KJ-3", wib(KINI - 30 * HARI), ["11|Lama"]), kej("KJ-4", kemarin, ["13|(provinsi)"])]}));
  await R2.put("dalops/cuaca.json", JSON.stringify({kejadian: [kej("KJ-5", kemarin, ["32|Bogor"])]}));
  await R2.put("dalops/gelombang.json", JSON.stringify({kejadian: [kej("KJ-6", kemarin, ["53|Kupang"])]}));
  await R2.put("dalops/laporan.json", JSON.stringify({versi: 1, hari: [{tanggal: kemarin, status: "ok"}, {tanggal: wib(KINI - 2 * HARI), status: "gagal"}]}));
  assert.equal((await api("GET", `/api/prediksi/konfirmasi?sejak=${sejak}`, undefined, {})).s, 401);
  const r = await api("GET", `/api/prediksi/konfirmasi?sejak=${sejak}`, undefined, PIPA); assert.equal(r.s, 200, r.t);
  const lb = r.j.konfirmasi.filter(x => x.sumber === "logbook").map(x => `${x.kab}|${x.tanggal}|${x.kode}`).sort();
  assert.deepEqual(lb, [`Aceh Utara|${kemarin}|BNJ`, `Bogor|${kemarin}|CEX`, `Kupang|${kemarin}|GEL`, `Pidie Jaya|${kemarin}|BNJ`]);   // dedupe KJ-1/KJ-2, lama dan provinsi dilewati
  assert.deepEqual(r.j.hari_logbook, [kemarin]);
  assert.ok(r.j.konfirmasi.filter(x => x.sumber === "logbook").every(x => x.terjadi === 1 && x.catatan === null));
  for (const bocor of ["KJ-1", "CATATAN-RAHASIA", "NAMA-PETUGAS"]) assert.ok(!r.t.includes(bocor), bocor);
});
