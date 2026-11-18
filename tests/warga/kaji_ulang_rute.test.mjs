/* Kaji ulang KU-04..06 (RENCANA-UJI T5 T7 T9 T10 T11 T12 T13 T14 T16 T17 T18 T20 T21): rute kandidat, draf, tulis, status, sahkan. worker.js utuh di Miniflare + D1 sungguhan.
   Jalankan: node --test tests/warga/kaji_ulang_rute.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, kjAcak} from "./_siklus.mjs";

const U = await mulai("uji-ku-rute");
const {DB, api, GET, POST, n} = U;
const [PD, KO, KO2, PM] = [await U.staf("Pd Ku", ["pusdalops"]), await U.staf("Ko Satu Ku", ["koordalops"]), await U.staf("Ko Dua Ku", ["koordalops"]), await U.staf("Pm Ku", ["pimpinan"])];
const BP = await U.bp(), BP2 = await U.bp({kab: "Garut"}), {SA, MOD, TAMU} = U;
const T0 = Date.parse("2026-03-02T05:00:00+07:00"), hariDepan = d => new Date(Date.now() + 7 * 36e5 + d * 864e5).toISOString().slice(0, 10);
/* kejadian langsung ke D1 (fase bebas; pemicu fase hanya menjaga UPDATE) */
const kj = async (fase = "selesai", {kab = ["3201"], tanggap = [null, null], nama = "Banjir uji kaji"} = {}) => {
  const id = kjAcak();
  await DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase, fase_diubah, tanggap_mulai, tanggap_akhir, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', ?, ?, '2026-03-02', ?, ?, ?, ?, 'manual', ?, ?, 'uji')")
    .bind(id, nama, kab[0], fase, T0, tanggap[0], tanggap[1], T0, T0).run();
  for (const k of kab) await DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, ?, '2026-03-02', ?)").bind(id, k, T0).run();
  return id;
};
const base = id => `/kejadian/${id}/kaji-ulang`;
const PEL = {kategori: "perbaiki", teks: "Koordinasi sinyal pusat dan daerah terlambat"}, REK = (o = {}) => ({teks: "Sepakati satu saluran sinyal awal antara pusat dan daerah", unit: "Direktorat Sistem Penanggulangan Bencana", tenggat: hariDepan(60), ...o});
const mulaiKaji = async (id, a = KO) => { const r = await POST(a, base(id), {}); assert.equal(r.s, 201, r.t); };

uji("T14 hak: BP tidak menulis (403), tamu 401; draf belum dimulai tetap 200 untuk staf, 404 untuk BP", async () => {
  const id = await kj();
  assert.equal((await POST(BP, base(id), {})).s, 403);
  assert.equal((await POST(PM, base(id), {})).s, 403);
  assert.equal((await GET(TAMU, base(id))).s, 401);
  const r = await GET(PD, base(id)); assert.equal(r.s, 200, r.t); assert.equal(r.j.kaji, null); assert.equal(r.j.boleh.tulis, true); assert.equal(r.j.boleh.sahkan, false);
  assert.equal((await GET(BP, base(id))).s, 404);
  assert.equal((await GET(PD, base("KJ-2026-ZZZZZZZZ"))).s, 404);
});

uji("mulai: 201, kedua kali 409, kejadian tak ada 404, kejadian dibatalkan 409; jejak sk_jejak tertulis sekali", async () => {
  const id = await kj("transisi");
  assert.equal((await POST(PD, base("KJ-2026-ZZZZZZZZ"), {})).s, 404);
  assert.equal((await POST(PD, base(await kj("dibatalkan")), {})).s, 409);
  await mulaiKaji(id, PD);
  assert.equal((await POST(KO, base(id), {})).s, 409);
  assert.equal(await n("sk_jejak", `obyek = 'kaji_ulang' AND obyek_id = '${id}'`), 1);
  const g = await GET(KO, base(id)); assert.equal(g.j.kaji.status, "draf"); assert.equal(g.j.kaji.mulai_oleh_nama, "Pd Ku"); assert.ok(!("mulai_oleh" in g.j.kaji)); assert.match((await DB.prepare("SELECT mulai_oleh o FROM ku_kaji WHERE kejadian_id = ?").bind(id).first()).o, /^staf:/);
  assert.ok(g.j.draf.kejadian && Array.isArray(g.j.draf.linimasa), "draf dirakit");
});

uji("pelajaran dan rekomendasi: oleh dari sesi bukan badan; nomor telepon dan tenggat di luar 7..365 hari ditolak; T8 satu batch tindak", async () => {
  const id = await kj(); await mulaiKaji(id);
  const p = await POST(PD, `${base(id)}/pelajaran`, {...PEL, oleh: "staf:palsu", ip_hash: "x"}); assert.equal(p.s, 201, p.t);
  assert.match((await DB.prepare("SELECT oleh FROM ku_pelajaran WHERE id = ?").bind(p.j.id).first()).oleh, /^staf:[0-9a-f]{16}$/);
  assert.equal((await POST(PD, `${base(id)}/pelajaran`, {...PEL, teks: "Hubungi 0812-3456-7890 untuk info lanjut"})).s, 400);
  assert.equal((await POST(PD, `${base(id)}/pelajaran`, {kategori: "salah", teks: PEL.teks})).s, 400);
  assert.equal((await POST(KO, `${base(await kj())}/pelajaran`, PEL)).s, 404, "kaji belum dimulai");
  for (const t of [undefined, "besok", hariDepan(3), hariDepan(400), "2026-02-30"]) assert.equal((await POST(PD, `${base(id)}/rekomendasi`, REK({tenggat: t}))).s, 400, String(t));
  assert.equal(await n("ku_rekomendasi", `kejadian_id = '${id}'`), 0);
  const r = await POST(PD, `${base(id)}/rekomendasi`, REK({pelajaran_id: p.j.id})); assert.equal(r.s, 201, r.t); assert.equal(r.j.nomor, 1);
  assert.equal(await n("dl_tindak", `kunci = 'kaji|${id}|01' AND status = 'belum'`), 1);
  assert.equal(await n("dl_tindak_log", `kunci = 'kaji|${id}|01' AND langkah IS NOT NULL`), 1);
  assert.equal((await POST(PD, `${base(id)}/rekomendasi`, REK({pelajaran_id: "0123456789abcdef"}))).s, 400, "pelajaran bukan milik kejadian");
  const u = await POST(PD, `${base(id)}/pelajaran/${p.j.id}`, {kategori: "baik", teks: "Sinyal pusat dan daerah sudah selaras sejak hari kedua"}); assert.equal(u.s, 200, u.t);
  assert.equal((await POST(PD, `${base(id)}/pelajaran/0123456789abcdef`, PEL)).s, 404, "pelajaran bukan di kejadian ini");
});

uji("T10 status: selesai wajib catatan 20 karakter; tidak dilanjutkan wajib selesai; riwayat; Pimpinan tanpa kolom oleh", async () => {
  const id = await kj(); await mulaiKaji(id);
  assert.equal((await POST(PD, `${base(id)}/rekomendasi`, REK())).s, 201);
  const S = b => POST(PD, `${base(id)}/rekomendasi/status`, b);
  assert.equal((await S({nomor: 1, status: "selesai"})).s, 400);
  assert.equal((await S({nomor: 1, status: "selesai", catatan: "pendek"})).s, 400);
  assert.equal((await S({nomor: 1, status: "proses", tidak_dilanjutkan: true})).s, 400);
  assert.equal((await S({nomor: 1, status: "ngawur"})).s, 400);
  assert.equal((await S({nomor: 7, status: "proses"})).s, 404);
  assert.equal((await S({nomor: 1, status: "proses", catatan: "Sedang dibahas"})).s, 201);
  const ok = await S({nomor: 1, status: "selesai", catatan: "Saluran sinyal disepakati dan sudah dipakai di kejadian berikutnya", tidak_dilanjutkan: true}); assert.equal(ok.s, 201, ok.t);
  assert.equal(await n("ku_rekomendasi", "tidak_dilanjutkan = 1"), 1);
  assert.equal(await n("dl_tindak_log", `kunci = 'kaji|${id}|01'`), 3);
  const rw = await GET(PD, `${base(id)}/rekomendasi/riwayat?nomor=1`); assert.equal(rw.s, 200); assert.equal(rw.j.length, 3); assert.equal(rw.j[0].oleh_nama, "Pd Ku");
  assert.equal((await GET(PD, `${base(id)}/rekomendasi/riwayat?nomor=9`)).s, 404);
  assert.equal((await GET(PD, `${base(id)}/rekomendasi/riwayat`)).s, 400);
  for (const j of [base(id), `${base(id)}/rekomendasi/riwayat?nomor=1`, "/kaji-ulang/rekomendasi", "/kaji-ulang/kandidat"]) {
    const t = (await GET(PM, j)).t; assert.doesNotMatch(t, /"(mulai_|disahkan_)?oleh|staf:|Pd Ku/, `Pimpinan ${j}`);
  }
});

uji("T11 pengecualian Dalops: POST Dalops menolak kunci kaji|; GET Dalops tidak memuat kaji| walau lebih dari 2000 baris baru; baris banjir tetap muncul", async () => {
  const kunci = "kaji|KJ-2026-0000000A|01", r = await api("POST", "/api/dalops/tindak", {kunci, status: "proses"}, PD.hp); assert.equal(r.s, 400, r.t);
  const kb = "banjir|32|Bogor|posko";
  await DB.prepare("INSERT INTO dl_tindak (kunci, status, catatan, oleh, waktu) VALUES (?, 'proses', NULL, 'admin:x', ?)").bind(kb, Date.now() - 1000).run();
  await DB.prepare("WITH RECURSIVE s(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM s WHERE i < 2100) INSERT INTO dl_tindak (kunci, status, catatan, oleh, waktu) SELECT 'kaji|KJ-2026-0000000A|' || printf('%05d', i), 'belum', NULL, 'admin:x', ? + i FROM s").bind(Date.now()).run();
  const g = await api("GET", "/api/dalops/tindak", undefined, PD.h); assert.equal(g.s, 200, g.t);
  assert.ok(g.j.butir.some(b => b.kunci === kb), "baris banjir tetap terlihat"); assert.ok(!g.t.includes("kaji|"), "tanpa kunci kaji|");
  assert.equal((await api("GET", "/api/dalops/tindak/riwayat?kunci=" + encodeURIComponent(kunci), undefined, PD.h)).s, 400);
  await DB.prepare("DELETE FROM dl_tindak WHERE kunci LIKE 'kaji|KJ-2026-0000000A|%'").run();
});

uji("T18 laju: 120 perubahan per 10 menit dari dl_tindak_log memberi 429 (rekomendasi dan status)", async () => {
  const id = await kj(); await mulaiKaji(id, KO2);
  const oleh = (await DB.prepare("SELECT mulai_oleh o FROM ku_kaji WHERE kejadian_id = ?").bind(id).first()).o;
  await DB.prepare("WITH RECURSIVE s(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM s WHERE i < 120) INSERT INTO dl_tindak_log (kunci, status, catatan, langkah, oleh, waktu) SELECT 'banjir|32|Bogor|posko', 'proses', NULL, NULL, ?, ? FROM s").bind(oleh, Date.now()).run();
  assert.equal((await POST(KO2, `${base(id)}/rekomendasi`, REK())).s, 429);
  assert.equal((await POST(KO2, `${base(id)}/rekomendasi/status`, {nomor: 1, status: "proses"})).s, 429);
  assert.equal(await n("ku_rekomendasi", `kejadian_id = '${id}'`), 0);
});

uji("T17 kandidat Q1: 3 kab masuk; 2 kab tanpa kriteria lain tidak; dibatalkan, tanggap dan terdeteksi tidak; tanggap > 7 hari, Lifeline merah, ditandai staf masuk; tanggap tanpa tanggal dilewati", async () => {
  const [tiga, dua, batal, lama, pendek, merah, tandai, awal] = [await kj("selesai", {kab: ["3201", "3202", "3203"]}), await kj("selesai", {kab: ["3201", "3202"]}), await kj("dibatalkan", {kab: ["3201", "3202", "3203"]}),
    await kj("pemulihan", {tanggap: ["2026-03-02", "2026-03-12"]}), await kj("selesai", {tanggap: ["2026-03-02", "2026-03-09"]}), await kj("transisi"), await kj("selesai"), await kj("tanggap", {kab: ["3201", "3202", "3203"]})];
  const lf = await POST(KO, `/kejadian/${merah}/lifeline`, {kab4: "3201", layanan: "listrik", warna: "merah", catatan: "Gardu induk tergenang, pasokan padam di tiga kecamatan"}); assert.equal(lf.s, 201, lf.t);
  await mulaiKaji(tandai);
  const r = await GET(PD, "/kaji-ulang/kandidat"); assert.equal(r.s, 200, r.t);
  const per = Object.fromEntries(r.j.baris.map(b => [b.id, b]));
  assert.deepEqual(per[tiga].alasan, ["tiga_kab"]); assert.deepEqual(per[lama].alasan, ["tanggap_lebih_7_hari"]); assert.deepEqual(per[merah].alasan, ["lifeline_merah"]); assert.deepEqual(per[tandai].alasan, ["dimulai_staf"]);
  for (const x of [dua, batal, pendek, awal]) assert.ok(!per[x], "bukan kandidat " + x);
  assert.ok(per[tiga].dilewati.includes("tanggap_tanpa_tanggal")); assert.ok(!per[lama].dilewati.includes("tanggap_tanpa_tanggal"));
  assert.deepEqual(per[tandai].kaji, {status: "draf", versi: 0}); assert.deepEqual(per[tiga].kaji, {status: "belum"});
  assert.equal((await GET(BP, "/kaji-ulang/kandidat")).s, 403);
});

uji("T21 belum bertaut: tugas serupa di kab dan tanggal kejadian tanpa tautan memberi penanda; yang sudah bertaut atau beda hari tidak", async () => {
  const id = await kj("selesai"), tugas = async (idT, dibuat) => DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES (?, '32', 'Bogor', -6.5, 106.8, 1, ?, ?)").bind(idT, dibuat, dibuat).run();
  await mulaiKaji(id);
  assert.equal((await GET(KO, base(id))).j.belum_bertaut, null);
  await tugas("a".repeat(16), T0); await tugas("b".repeat(16), T0 + 2 * 864e5); await tugas("c".repeat(16), T0 + 36e5);
  await DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, kejadian_id, status, jenis, kab4, mulai, diambil, dibuat, diubah) VALUES (?, 'tugas_api', ?, ?, 'terpasang', 'karhutla', '3201', '2026-03-02', ?, ?, ?)").bind("1".repeat(16), "c".repeat(16), id, T0, T0, T0).run();
  const g = await GET(KO, base(id)); assert.equal(g.j.belum_bertaut.n, 1, "hanya tugas a: b beda hari, c sudah bertaut");
  const ev = g.j.draf.linimasa.filter(e => e.ref === "a".repeat(16)); assert.equal(ev.length, 0, "tugas belum bertaut tidak masuk linimasa");
});

uji("T12 sahkan: hanya fase selesai; potret terisi tanpa oleh; sk_jejak; sesudahnya ubah ditolak pemicu, tambah diterima, balik ke draf ditolak; T20 sahkan ulang naik versi", async () => {
  const dini = await kj("transisi"); await mulaiKaji(dini);
  assert.equal((await POST(KO, `${base(dini)}/sahkan`, {})).s, 409);
  const id = await kj(); assert.equal((await POST(KO, `${base(id)}/sahkan`, {})).s, 404, "belum dimulai");
  await mulaiKaji(id, KO);
  const p = await POST(PD, `${base(id)}/pelajaran`, PEL); assert.equal(p.s, 201); assert.equal((await POST(KO, `${base(id)}/rekomendasi`, REK())).s, 201);
  const s = await POST(KO, `${base(id)}/sahkan`, {}); assert.equal(s.s, 201, s.t); assert.equal(s.j.versi, 1);
  const k = await DB.prepare("SELECT * FROM ku_kaji WHERE kejadian_id = ?").bind(id).first();
  assert.equal(k.status, "disahkan"); assert.ok(k.potret.length < 100000); assert.doesNotMatch(k.potret, /"oleh|staf:/);
  const pt = JSON.parse(k.potret); assert.equal(pt.pelajaran.length, 1); assert.equal(pt.rekomendasi.length, 1); assert.ok(Array.isArray(pt.draf.linimasa));
  assert.equal(await n("sk_jejak", `obyek = 'kaji_ulang' AND obyek_id = '${id}' AND aksi = 'sahkan' AND ke = 'disahkan'`), 1);
  assert.equal((await POST(KO, `${base(id)}/pelajaran/${p.j.id}`, {kategori: "baik", teks: "Diubah sesudah disahkan seharusnya ditolak"})).s, 409);
  await assert.rejects(() => DB.prepare("DELETE FROM ku_pelajaran WHERE id = ?").bind(p.j.id).run(), /tidak boleh dihapus/);
  await assert.rejects(() => DB.prepare("UPDATE ku_kaji SET status = 'draf', versi = 0, disahkan_oleh = NULL, disahkan_pada = NULL, potret = NULL WHERE kejadian_id = ?").bind(id).run());
  const baru = await POST(KO, `${base(id)}/pelajaran`, {kategori: "baik", teks: "Posko gabungan berjalan sejak jam pertama"}); assert.equal(baru.s, 201);
  assert.equal((await DB.prepare("SELECT versi_tambah v FROM ku_pelajaran WHERE id = ?").bind(baru.j.id).first()).v, 1, "lampiran setelah versi 1");
  assert.equal((await POST(PD, `${base(id)}/sahkan`, {})).s, 403, "Pusdalops tidak mengesahkan");
  const ulang = await POST(SA, `${base(id)}/sahkan`, {}); assert.equal(ulang.s, 201, ulang.t); assert.equal(ulang.j.versi, 2);
  assert.equal(await n("ku_potret", `kejadian_id = '${id}' AND versi = 1`), 1); assert.equal(JSON.parse((await DB.prepare("SELECT potret FROM ku_kaji WHERE kejadian_id = ?").bind(id).first()).potret).pelajaran.length, 2);
  const v1 = await GET(PM, `${base(id)}?versi=1`); assert.equal(v1.s, 200, v1.t); assert.equal(v1.j.potret.versi, 1); assert.equal(v1.j.potret.potret.pelajaran.length, 1);
  assert.equal((await GET(PM, `${base(id)}?versi=9`)).s, 404);
  assert.equal(await n("sk_jejak", `obyek_id = '${id}' AND aksi = 'sahkan_ulang'`), 1);
});

uji("T13 penulis tunggal tidak mengesahkan sendiri bila ada Koordalops lain; Super Admin dan Koordalops lain bisa; isi campuran boleh", async () => {
  const id = await kj(); await mulaiKaji(id, KO);
  assert.equal((await POST(KO, `${base(id)}/pelajaran`, PEL)).s, 201);
  const tolak = await POST(KO, `${base(id)}/sahkan`, {}); assert.equal(tolak.s, 403, tolak.t); assert.equal(await n("ku_kaji", `kejadian_id = '${id}' AND status = 'disahkan'`), 0);
  assert.equal((await POST(PD, `${base(id)}/pelajaran`, {kategori: "baik", teks: "Isi dari penulis lain membuat pengesahan sah"})).s, 201);
  assert.equal((await POST(KO, `${base(id)}/sahkan`, {})).s, 201, "bukan seluruhnya tulisan sendiri");
  const id2 = await kj(); await mulaiKaji(id2, KO); assert.equal((await POST(KO, `${base(id2)}/pelajaran`, PEL)).s, 201);
  assert.equal((await POST(KO2, `${base(id2)}/sahkan`, {})).s, 201, "Koordalops lain");
  const id3 = await kj(); await mulaiKaji(id3, KO); assert.equal((await POST(KO, `${base(id3)}/pelajaran`, PEL)).s, 201);
  assert.equal((await POST(SA, `${base(id3)}/sahkan`, {})).s, 201, "Super Admin");
  const S = await mulai("uji-ku-satu"), ko = await S.staf("Ko Tunggal", ["koordalops"]), x = await (async () => { const i = kjAcak(); await S.DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', 'Banjir satu', '3201', '2026-03-02', 'selesai', ?, 'manual', ?, ?, 'uji')").bind(i, T0, T0, T0).run(); return i; })();
  assert.equal((await S.POST(ko, `${base(x)}`, {})).s, 201); assert.equal((await S.POST(ko, `${base(x)}/pelajaran`, PEL)).s, 201);
  assert.equal((await S.POST(ko, `${base(x)}/sahkan`, {})).s, 201, "tidak ada Koordalops lain");
});

uji("T14 BP: hanya kab wilayahnya dan hanya yang disahkan, tanpa potret dan tanpa oleh; kab lain 404 sama dengan tidak ada; tidak menulis", async () => {
  const id = await kj(); await mulaiKaji(id, KO);
  assert.equal((await POST(KO, `${base(id)}/pelajaran`, PEL)).s, 201);
  assert.equal((await GET(BP, base(id))).s, 404, "belum disahkan");
  assert.equal((await POST(SA, `${base(id)}/sahkan`, {})).s, 201);
  const ok = await GET(BP, base(id)); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.pelajaran.length, 1); assert.equal(ok.j.boleh.tulis, false); assert.ok(!("potret" in ok.j) && !("draf" in ok.j));
  assert.doesNotMatch(ok.t, /"(mulai_|disahkan_)?oleh|staf:/);
  const luar = await GET(BP2, base(id)), ngawur = await GET(BP2, base("KJ-2026-ZZZZZZZZ"));
  assert.equal(luar.s, 404); assert.equal(luar.t, ngawur.t, "byte sama dengan tidak ada");
  assert.equal((await GET(BP, `${base(id)}/rekomendasi/riwayat?nomor=1`)).s, 403);
  assert.equal((await GET(BP, "/kaji-ulang/rekomendasi")).s, 403);
});

uji("T16 daftar F-7: lewat tenggat dihitung tanpa mengubah status; selesai tertutup", async () => {
  const id = await kj(); await mulaiKaji(id, KO);
  for (const i of [1, 2, 3]) assert.equal((await POST(KO, `${base(id)}/rekomendasi`, REK({teks: `Rekomendasi nomor ${i} untuk uji tenggat`}))).s, 201);
  assert.equal((await POST(KO, `${base(id)}/rekomendasi/status`, {nomor: 3, status: "selesai", catatan: "Sudah dikerjakan dan diperiksa pada rapat evaluasi"})).s, 201);
  await DB.prepare("UPDATE ku_rekomendasi SET tenggat = '2020-01-01' WHERE kejadian_id = ? AND nomor IN (1, 3)").bind(id).run();
  const r = await GET(PM, "/kaji-ulang/rekomendasi"); assert.equal(r.s, 200, r.t);
  const per = Object.fromEntries(r.j.baris.filter(b => b.kejadian_id === id).map(b => [b.nomor, b]));
  assert.deepEqual([per[1].lewat_tenggat, per[2].lewat_tenggat, per[3].lewat_tenggat, per[3].tertutup, per[1].status], [true, false, false, true, "belum"]);
  assert.ok(r.j.ringkas.lewat_tenggat >= 1 && r.j.ringkas.total === r.j.ringkas.terbuka + r.j.ringkas.tertutup);
  assert.equal((await DB.prepare("SELECT status FROM dl_tindak WHERE kunci = ?").bind(`kaji|${id}|01`).first()).status, "belum", "status tidak berubah sendiri");
  assert.doesNotMatch(r.t, /"oleh/);
});

uji("503 jelas bila migrasi kaji ulang belum terapan, bukan 500", async () => {
  const S = await mulai("uji-ku-503"), ko = await S.staf("Ko 503", ["koordalops"]), id = kjAcak();
  await S.DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', 'Banjir 503', '3201', '2026-03-02', 'selesai', ?, 'manual', ?, ?, 'uji')").bind(id, T0, T0, T0).run();
  await S.DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, '3201', '2026-03-02', ?)").bind(id, T0).run();
  for (const t of ["ku_potret", "ku_rekomendasi", "ku_pelajaran", "ku_kaji"]) await S.DB.prepare(`DROP TABLE ${t}`).run();
  for (const j of ["/kaji-ulang/kandidat", `${base(id)}`]) { const g = await S.GET(ko, j); assert.equal(g.s, 503, j + g.t); assert.match(g.t, /Kaji ulang belum diaktifkan/); }
  assert.equal((await S.POST(ko, base(id), {})).s, 503);
});
