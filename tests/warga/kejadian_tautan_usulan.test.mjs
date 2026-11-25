/* LK-10 sisi Worker (data/kajian-bnpb/lapor-kejadian): GET /api/siklus/ingest/modul?sumber=lapor_ai ikut memuat usulan staf lk_usulan (kode LU-) bertanda usulan_staf,
   tiket LA- tidak pernah bertanda; hanya putaran terakhir; mulai = tanggal WIB tiket kejadian laporan; kab tak dikenal dikirim tanpa kab; tanpa WA, desa, catatan, atau `oleh`.
   Cadangan: D1 tanpa lk_usulan (migrasi 0170 belum diterapkan) tetap memuat tiket LA-.
   worker.js utuh di Miniflare + D1 sungguhan; nomor WA rekaan. Jalan: node --test tests/warga/kejadian_tautan_usulan.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";
import {KT_SQL} from "../../src/hak.js";

const U = await mulai("uji-kt-usulan"), {DB, api} = U;
const TOK = {authorization: "Bearer token-pipa-uji"}, ms = t => Date.parse(t + "+07:00");
const T0 = ms("2026-06-09T23:30:00"), T = ms("2026-06-10T10:00:00"), WA = "6281299990077";
const jalan = (sql, ...b) => DB.prepare(sql).bind(...b).run();
const sesi = (nomor, kab = "32.01", t = T, tingkat = "bpbd") => jalan(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, nomor, terkirim, kerja, ringkas, rev, dibuat, diubah)
  VALUES (?, ?, 'terkirim', ?, 'banjir', ?, ?, ?, '{"desa":"DESA-RAHASIA","catatan":"CATATAN-RAHASIA"}', 'RINGKAS-RAHASIA', 0, ?, ?)`, "s" + nomor, WA, tingkat, kab, nomor, t, t, t);
const usulan = (kode, lap, putaran, waktu, kab4 = "3201", jenis = "banjir") => jalan("INSERT INTO lk_usulan (kode, kejadian_laporan, putaran, anggota, jenis, kab4, oleh, waktu) VALUES (?,?,?,?,?,?,?,?)",
  kode, lap, putaran, JSON.stringify([lap]), jenis, kab4, "staf:PELAKU-RAHASIA", waktu);
const modul = (q = "") => api("GET", "/api/siklus/ingest/modul?sumber=lapor_ai&dari=2026-06-01&sampai=2026-06-30" + q, undefined, TOK);

uji("usulan staf keluar bertanda usulan_staf; tiket LA- tidak pernah bertanda; putaran terakhir saja; kab tak dikenal tanpa kab; tanpa data pribadi", async () => {
  await sesi("LA-090626-01", "32.01", T0);   // tiket kejadian laporan: terkirim 9 Jun WIB, diusulkan 10 Jun
  await jalan("INSERT INTO lj_berkas (id, induk, kab, status, isian, dibuat, diubah) VALUES (?, ?, '32.01', 'terbuka', '{}', ?, ?)", "a".repeat(16), "LA-090626-01", T, T);   // tiket bpbd berberkas: ikut sebagai LA-
  await sesi("LA-100626-02", "32.01", T, "warga");
  await usulan("LU-100626-01", "LA-090626-01", 1, T);
  await usulan("LU-100626-02", "LA-100626-02", 1, T + 1);
  await usulan("LU-100626-03", "LA-100626-02", 2, T + 2);   // putaran 2 menggantikan putaran 1 kejadian yang sama
  await usulan("LU-100626-04", "GL-100626-01", 1, T + 3, "3201", "longsor");   // gugus tanpa baris lapor_sesi: mulai jatuh ke waktu usulan
  await usulan("LU-100626-05", "LA-100626-02", 3, T + 4, "9999");   // kab4 sah bentuk tapi tak dikenal: ganti putaran lagi
  const r = await modul(); assert.equal(r.s, 200, r.t);
  const per = Object.fromEntries(r.j.baris.map(b => [b.kode, b]));
  assert.deepEqual(Object.keys(per).sort(), ["LA-090626-01", "LU-100626-01", "LU-100626-04", "LU-100626-05"], "putaran lama (LU-02, LU-03) tidak keluar");
  assert.deepEqual(per["LU-100626-01"], {sumber: "lapor_ai", kode: "LU-100626-01", jenis: "banjir", prov: "32", kab: "Bogor", mulai: "2026-06-09", usulan_staf: true}, "mulai = terkirim tiket, WIB");
  assert.deepEqual(per["LU-100626-04"], {sumber: "lapor_ai", kode: "LU-100626-04", jenis: "longsor", prov: "32", kab: "Bogor", mulai: "2026-06-10", usulan_staf: true});
  assert.deepEqual(per["LU-100626-05"], {sumber: "lapor_ai", kode: "LU-100626-05", jenis: "banjir", prov: "99", mulai: "2026-06-10", usulan_staf: true}, "tanpa kab, lat, lon: pasang.py menjawab tanpa_wilayah");
  for (const b of r.j.baris) assert.equal(b.usulan_staf === true, b.kode.startsWith("LU-"), `${b.kode}: tanda usulan hanya untuk LU-`);
  assert.ok(!("usulan_staf" in per["LA-090626-01"]));
  const BOLEH = new Set(["sumber", "kode", "jenis", "prov", "kab", "mulai", "usulan_staf"]);
  for (const b of r.j.baris) for (const k of Object.keys(b)) assert.ok(BOLEH.has(k), `kolom ${k} tidak boleh keluar`);
  assert.doesNotMatch(r.t, /6281299990077|RAHASIA|anggota|oleh|putaran/);
});

uji("lanjut: tiket dan usulan semilidetik di batas halaman keduanya terkirim, tanpa ganda", async () => {
  const M = await mulai("uji-kt-usulan-hal"), st = [], kode = [];
  for (let i = 0; i < 260; i++) {
    const la = `LA-110626-${String(i + 1).padStart(3, "0")}`, lu = `LU-110626-${String(i + 1).padStart(3, "0")}`, w = T + 864e5 + i;
    st.push(M.DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, nomor, terkirim, kerja, rev, dibuat, diubah) VALUES (?, ?, 'terkirim', 'bpbd', 'banjir', '32.01', ?, ?, '{}', 0, ?, ?)`).bind("s" + la, WA, la, w, w, w),
      M.DB.prepare("INSERT INTO lj_berkas (id, induk, kab, status, isian, dibuat, diubah) VALUES (?, ?, '32.01', 'terbuka', '{}', ?, ?)").bind(String(i).padStart(16, "0"), la, w, w),
      M.DB.prepare("INSERT INTO lk_usulan (kode, kejadian_laporan, putaran, anggota, jenis, kab4, oleh, waktu) VALUES (?, ?, 1, ?, 'banjir', '3201', 'staf:x', ?)").bind(lu, la, JSON.stringify([la]), w));
    kode.push(la, lu);
  }
  await M.DB.batch(st);
  const g = l => M.api("GET", "/api/siklus/ingest/modul?sumber=lapor_ai&dari=2026-06-01&sampai=2026-06-30" + (l ? "&lanjut=" + encodeURIComponent(l) : ""), undefined, TOK);
  const h1 = await g(); assert.equal(h1.s, 200, h1.t); assert.equal(h1.j.baris.length, 500); assert.ok(h1.j.lanjut);
  const h2 = await g(h1.j.lanjut); assert.equal(h2.s, 200, h2.t); assert.equal(h2.j.lanjut, null);
  assert.deepEqual([...h1.j.baris, ...h2.j.baris].map(b => b.kode).sort(), kode.sort());
});

uji("rencana kueri lapor_ai: cabang usulan lewat lk_usulan_waktu, tanpa SCAN lk_usulan", async () => {
  const rencana = (await DB.prepare("EXPLAIN QUERY PLAN " + KT_SQL.lapor_ai[0]).bind(0, 9e12, 0, "", 501).all()).results.map(r => r.detail).join("\n");
  assert.match(rencana, /SEARCH u USING (COVERING )?INDEX lk_usulan_waktu/, rencana);
  assert.match(rencana, /SEARCH v USING (COVERING )?INDEX lk_usulan_kejadian/, rencana);
  assert.doesNotMatch(rencana, /SCAN (u|v|s|lk_usulan|lapor_sesi)\b(?! USING)/, rencana);
});

uji("cadangan: D1 tanpa lk_usulan (0170 belum diterapkan) tetap memuat tiket LA-, bukan kosong", async () => {
  const M = await mulai("uji-kt-usulan-tanpa-0170");
  await M.DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, nomor, terkirim, kerja, rev, dibuat, diubah) VALUES ('sLA-100626-09', ?, 'terkirim', 'bpbd', 'banjir', '32.01', 'LA-100626-09', ?, '{}', 0, ?, ?)`).bind(WA, T, T, T).run();
  await M.DB.prepare("INSERT INTO lj_berkas (id, induk, kab, status, isian, dibuat, diubah) VALUES (?, 'LA-100626-09', '32.01', 'terbuka', '{}', ?, ?)").bind("f".repeat(16), T, T).run();
  await M.DB.prepare("DROP TABLE lk_usulan").run();
  const r = await M.api("GET", "/api/siklus/ingest/modul?sumber=lapor_ai&dari=2026-06-01&sampai=2026-06-30", undefined, TOK); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.baris, [{sumber: "lapor_ai", kode: "LA-100626-09", jenis: "banjir", prov: "32", kab: "Bogor", mulai: "2026-06-10"}]);
});
