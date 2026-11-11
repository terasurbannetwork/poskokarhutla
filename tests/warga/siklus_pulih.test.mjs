/* Siklus Bencana G3: rute Jitupasna, baris, hitung, harga, R3P, kegiatan, tanda setuju, syarat fase (SK-071, SK-072). UJ-F4-09, UJ-KP-07, UJ-F4-10 (rekap). worker.js utuh di Miniflare + D1 sungguhan.
   Jalankan: node --test tests/warga/siklus_pulih.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16} from "./_siklus.mjs";

const U = await mulai("uji-sk-pulih", {r2: false});
const {DB, GET, POST, n, kej} = U;
const [PD, KO, PM, PM2] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"]), await U.staf("Pm Uji", ["pimpinan"]), await U.staf("Pm Dua", ["pimpinan"])];
const KOPM = await U.staf("Ko Pm Uji", ["koordalops", "pimpinan"]);
const BP = await U.bp(), BP2 = await U.bp({kab: "Garut"}), {SA, MOD, TAMU} = U;
const J = 1e6;
const keTanggap = async (id) => {
  assert.equal((await POST(PD, `/kejadian/${id}/fase`, {ke: "terverifikasi"})).s, 200);
  const r = await POST(KO, `/kejadian/${id}/fase`, {ke: "tanggap", tanggap_mulai: "2026-03-02"}); assert.equal(r.s, 200, r.t);
};
const KID = await kej(KO, {nama: "Banjir Bogor pulih", mulai: "2026-03-02"});
const KID2 = await kej(KO, {nama: "Banjir belum tanggap", mulai: "2026-03-02", kab4: "3202"});
await keTanggap(KID);
const klien = (() => { let i = 0; return () => "klien-" + String(++i).padStart(6, "0"); })();
const rusak = (sektor, tingkat, unit, k = klien()) => ({jenis: "rusak", sektor, tingkat, unit, klien_id: k});
const buat = async (kid = KID, kab4 = "3201") => { const r = await POST(KO, "/pulih", {kejadian_id: kid, kab4, tim_sk: "SK Tim PDNA 12/2026"}); assert.equal(r.s, 201, r.t); return r.j.id; };
const harga = async (o = {}) => { const r = await POST(PD, "/harga", {sektor: "perumahan", tingkat: "rb", satuan: "unit", harga_rp: 100 * J, tahun: 2026, dokumen: "HSBGN 2026 contoh", ...o}); assert.equal(r.s, 201, r.t); return r.j; };

uji("UJ-F4-09: Jitupasna hanya dibuka KO saat kejadian tanggap atau transisi; PD/PM/BP/tamu ditolak; kab4 asing 400; kejadian belum tanggap 409", async () => {
  for (const a of [PD, PM, BP]) assert.equal((await POST(a, "/pulih", {kejadian_id: KID, kab4: "3201"})).s, 403);
  assert.equal((await POST(TAMU, "/pulih", {kejadian_id: KID, kab4: "3201"})).s, 401);
  assert.equal((await POST(KO, "/pulih", {kejadian_id: KID, kab4: "3202"})).s, 400, "kab4 bukan kabupaten kejadian");
  assert.equal((await POST(KO, "/pulih", {kejadian_id: KID, kab4: "9999"})).s, 400); assert.equal((await POST(KO, "/pulih", {kejadian_id: "abc", kab4: "3201"})).s, 400);
  assert.equal((await POST(KO, "/pulih", {kejadian_id: KID, kab4: "3201", tim_sk: "hubungi 081234567890"})).s, 400, "tim_sk tanpa nomor telepon");
  { const x = await POST(KO, "/pulih", {kejadian_id: KID2, kab4: "3202"}); assert.equal(x.s, 409, "terdeteksi belum tanggap " + x.t); }
  assert.equal((await POST(KO, "/pulih", {kejadian_id: "KJ-2026-ZZZZZZZZ", kab4: "3201"})).s, 404);
  assert.equal(await n("sk_jitupasna"), 0);
  const id = await buat(); const b = await DB.prepare("SELECT status, versi, prov, dummy, oleh, induk_id FROM sk_jitupasna WHERE id = ?").bind(id).first();
  assert.deepEqual([b.status, b.versi, b.prov, b.dummy, b.induk_id], ["dibuka", 1, "32", 0, null]); assert.match(b.oleh, /^staf:/);
  assert.equal(await n("sk_jejak", `obyek = 'jitupasna' AND obyek_id = '${id}' AND aksi = 'buat'`), 1);
  assert.equal((await POST(KO, "/pulih", {kejadian_id: KID, kab4: "3201"})).s, 409, "yang belum final menolak yang kedua");
});

uji("UJ-F4-09: baris idempoten lewat klien_id (600 per jam), BP menulis wilayahnya, BP luar wilayah 404, PM 403, validasi menolak yang salah", async () => {
  const jp = (await GET(KO, `/pulih?kejadian_id=${KID}`)).j.baris[0].id;
  const b1 = [rusak("perumahan", "rb", 10, "klien-aaaa01"), rusak("perumahan", "rs", 20, "klien-aaaa02"), {jenis: "rugi", sektor: "perumahan", komponen: "air_minum", arus_rp: 2 * J, bulan: 3, klien_id: "klien-aaaa03"}];
  const r = await POST(BP, `/pulih/${jp}/baris`, {baris: b1}, {}); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j, {diterima: 3, duplikat: 0});
  const lagi = await POST(BP, `/pulih/${jp}/baris`, {baris: b1}); assert.deepEqual(lagi.j, {diterima: 0, duplikat: 3}, "kirim dua kali, satu baris");
  assert.equal(await n("sk_jitupasna_baris", `jitupasna_id = '${jp}'`), 3);
  assert.match((await DB.prepare("SELECT oleh FROM sk_jitupasna_baris WHERE klien_id = 'klien-aaaa01'").first()).oleh, /^instansi:/);
  assert.equal((await POST(PD, `/pulih/${jp}/baris`, {baris: [rusak("perumahan", "rr", 30, "klien-aaaa04")]})).j.diterima, 1, "PD menulis");
  assert.equal((await POST(PM, `/pulih/${jp}/baris`, {baris: [rusak("perumahan", "rr", 1)]})).s, 403);
  assert.equal((await POST(TAMU, `/pulih/${jp}/baris`, {baris: [rusak("perumahan", "rr", 1)]})).s, 401);
  const luar = await POST(BP2, `/pulih/${jp}/baris`, {baris: [rusak("perumahan", "rr", 1)]}), takAda = await POST(BP2, "/pulih/0123456789abcdef/baris", {baris: [rusak("perumahan", "rr", 1)]});
  assert.equal(luar.s, 404); assert.equal(luar.t, takAda.t, "luar wilayah = tak ada, byte demi byte");
  const salah = [{}, {baris: []}, {baris: "x"}, {baris: Array(101).fill(rusak("perumahan", "rb", 1))},
    {baris: [{...rusak("perumahan", "rb", 1), klien_id: "pendek"}]}, {baris: [{...rusak("perumahan", "rb", 1), klien_id: undefined}]}, {baris: [rusak("PERUMAHAN", "rb", 1)]}, {baris: [rusak("perumahan", "berat", 1)]}, {baris: [rusak("perumahan", "rb", -1)]},
    {baris: [rusak("perumahan", "rb", "10")]}, {baris: [{...rusak("perumahan", "rb", 1), komponen: "air_minum"}]}, {baris: [{jenis: "rugi", sektor: "perumahan", komponen: "air", arus_rp: 1, bulan: 0, klien_id: "klien-zzzz01"}]},
    {baris: [{jenis: "rugi", sektor: "perumahan", komponen: "air_minum", arus_rp: 1.5, bulan: 1, klien_id: "klien-zzzz02"}]}, {baris: [{jenis: "rugi", sektor: "perumahan", komponen: "air_minum", arus_rp: 1, bulan: 1, unit: 3, klien_id: "klien-zzzz03"}]},
    {baris: [{...rusak("perumahan", "rb", 1), asumsi: "telepon 081234567890"}]}, {baris: [{...rusak("perumahan", "rb", 1), jenis: "lain"}]}, {baris: ["x"]}];
  for (const b of salah) assert.equal((await POST(KO, `/pulih/${jp}/baris`, b)).s, 400, JSON.stringify(b).slice(0, 80));
  assert.equal(await n("sk_jitupasna_baris", `jitupasna_id = '${jp}'`), 4, "yang salah tidak menulis");
});

uji("UJ-F4-09: harga wajib dokumen sumber, selalu asumsi-kebijakan; PM/BP tidak menulis; staf membaca per sektor", async () => {
  for (const o of [{dokumen: ""}, {dokumen: "ab"}, {dokumen: undefined}, {harga_rp: 0}, {harga_rp: 1.5}, {tingkat: "berat"}, {tahun: 1999}, {sektor: "X"}, {satuan: ""}, {kab4: "9999"}, {yakin: "resmi"}]) {
    const r = await POST(PD, "/harga", {sektor: "perumahan", tingkat: "rb", satuan: "unit", harga_rp: 100 * J, tahun: 2026, dokumen: "HSBGN 2026", ...o});
    if (o.yakin) { assert.equal(r.s, 201); assert.equal(r.j.yakin, "asumsi-kebijakan", "yakin tidak bisa dinaikkan lewat badan"); } else assert.equal(r.s, 400, JSON.stringify(o));
  }
  for (const a of [PM, BP]) assert.equal((await POST(a, "/harga", {sektor: "perumahan", tingkat: "rb", satuan: "unit", harga_rp: J, tahun: 2026, dokumen: "HSBGN 2026"})).s, 403);
  await harga({tingkat: "hancur", harga_rp: 300 * J}); await harga({tingkat: "rs", harga_rp: 50 * J}); await harga({tingkat: "rr", harga_rp: 20 * J});
  const l = await GET(PM, "/harga?sektor=perumahan&tahun=2026"); assert.equal(l.s, 200); assert.ok(l.j.baris.length >= 4); assert.ok(l.j.baris.every(x => x.yakin === "asumsi-kebijakan" && x.dokumen));
  assert.equal((await GET(PM, "/harga")).s, 400); assert.equal((await GET(BP, "/harga?sektor=perumahan")).s, 403); assert.equal((await GET(TAMU, "/harga?sektor=perumahan")).s, 401);
});

uji("UJ-F4-09: hitung memakai fungsi siklus_hitung: RB 10 x 100 jt + RS 20 x 50 jt + RR 30 x 20 jt = Rp2.600 juta; baris dibekukan dengan harga_id; sektor tanpa harga menunggu (bukan 0)", async () => {
  const jp = (await GET(KO, `/pulih?kejadian_id=${KID}`)).j.baris[0].id;
  assert.equal((await POST(PD, `/pulih/${jp}/baris`, {baris: [rusak("pendidikan", "rb", 2, "klien-aaaa05")]})).j.diterima, 1);
  assert.equal((await POST(PD, `/pulih/${jp}/hitung`, {tahun_harga: 2026})).s, 409, "dibuka belum bisa dihitung");
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "pengumpulan"})).s, 200);
  for (const b of [{}, {tahun_harga: "2026"}, {tahun_harga: 1999}]) assert.equal((await POST(PD, `/pulih/${jp}/hitung`, b)).s, 400);
  for (const a of [PM, BP, TAMU]) assert.ok([401, 403].includes((await POST(a, `/pulih/${jp}/hitung`, {tahun_harga: 2026})).s));
  await harga({tingkat: "rb", harga_rp: 100 * J, kab4: "3201", dokumen: "Perka kabupaten contoh"});   // acuan kabupaten menang atas nasional
  const dua = (await POST(PD, `/pulih/${jp}/hitung`, {tahun_harga: 2026})); assert.equal(dua.s, 200, dua.t);
  assert.equal(dua.j.hitung.kerusakan.per.perumahan.nilai, 2600 * J); assert.equal(dua.j.hitung.kerusakan.per.pendidikan.menunggu, true); assert.equal(dua.j.hitung.kerusakan.per.pendidikan.nilai, null);
  assert.equal(dua.j.hitung.kerusakan.total, null, "ada sektor menunggu: total null, bukan 0"); assert.equal(dua.j.hitung.total, null);
  assert.equal(dua.j.hitung.yakin, "asumsi-kebijakan"); assert.equal(dua.j.hitung.indeks, "menunggu");
  assert.equal(dua.j.hitung.stimulan.nilai, 1650 * J, "10 RB, 20 RS, 30 RR = Rp1.650 juta"); assert.equal(dua.j.hitung.stimulan.yakin, "asumsi-kebijakan");
  assert.deepEqual(dua.j.hitung.penanda.hitung_ganda, []); assert.ok(dua.j.hitung.penanda.kosong.includes("ekonomi"));
  assert.equal(dua.j.hitung.peta.permukiman, 2600 * J, "peta lima sektor memakai V_s saja: kerugian air_minum 6 jt TIDAK ikut (ALG F4.5)"); assert.equal(dua.j.hitung.peta.belum_terpeta, null, "tanpa angka = null, bukan 0");
  assert.ok(dua.j.hitung.peta.menunggu.includes("ekonomi") && !dua.j.hitung.peta.menunggu.includes("permukiman")); assert.equal(dua.j.hitung.ragu, false);
  const rb = await DB.prepare("SELECT nilai_rp, harga_id FROM sk_jitupasna_baris WHERE klien_id = 'klien-aaaa01'").first(); assert.equal(rb.nilai_rp, 1000 * J); assert.ok(rb.harga_id, "harga dibekukan");
  assert.equal((await DB.prepare("SELECT kab4 FROM sk_harga WHERE id = ?").bind(rb.harga_id).first()).kab4, "3201");
  const rugi = await DB.prepare("SELECT nilai_rp, harga_id FROM sk_jitupasna_baris WHERE klien_id = 'klien-aaaa03'").first(); assert.equal(rugi.nilai_rp, 6 * J); assert.equal(rugi.harga_id, null);
  assert.equal((await DB.prepare("SELECT nilai_rp FROM sk_jitupasna_baris WHERE klien_id = 'klien-aaaa05'").first()).nilai_rp, null, "tanpa harga: null, bukan 0");
  assert.equal((await DB.prepare("SELECT status, tahun_harga FROM sk_jitupasna WHERE id = ?").bind(jp).first()).status, "dihitung");
  assert.equal((await POST(PD, `/pulih/${jp}/baris`, {baris: [rusak("perumahan", "rr", 1)]})).s, 409, "baris tak diterima setelah dihitung");
  assert.equal(await n("sk_jejak", `obyek_id = '${jp}' AND aksi = 'hitung'`), 1);
});

uji("UJ-F4-09: status Jitupasna: dihitung ke ditinjau ke final; lompat 409; mundur butuh alasan; hanya KO; final mengunci dan melahirkan versi baru", async () => {
  const jp = (await GET(KO, `/pulih?kejadian_id=${KID}`)).j.baris[0].id;
  for (const a of [PD, PM, BP]) assert.equal((await POST(a, `/pulih/${jp}/status`, {ke: "ditinjau"})).s, 403);
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "final"})).s, 409, "lompat dari dihitung ke final");
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "dihitung"})).s, 400, "dihitung hanya lewat hitung");
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "ditinjau"})).s, 200);
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "pengumpulan"})).s, 400, "mundur wajib alasan");
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "pengumpulan", alasan: "harga rumah salah"})).s, 200);
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "dibuka"})).s, 400);
  const ulang = await POST(PD, `/pulih/${jp}/hitung`, {tahun_harga: 2026}); assert.equal(ulang.s, 200, ulang.t);
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "ditinjau"})).s, 200); assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "final"})).s, 200);
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "ditinjau"})).s, 409, "dari final ke ditinjau ditolak");
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "pengumpulan", alasan: "mau ubah"})).s, 409, "final tidak mundur");
  assert.equal((await POST(PD, `/pulih/${jp}/hitung`, {tahun_harga: 2026})).s, 409);
  assert.equal((await POST(PD, `/pulih/${jp}/baris`, {baris: [rusak("perumahan", "rr", 1)]})).s, 409);
  await assert.rejects(() => DB.prepare("UPDATE sk_jitupasna_baris SET unit = 99 WHERE jitupasna_id = ?").bind(jp).run(), /sk_jitupasna_final/, "trigger menjaga walau lewat SQL langsung");
  const v2 = await POST(KO, "/pulih", {kejadian_id: KID, kab4: "3201"}); assert.equal(v2.s, 201, v2.t);
  const b2 = await DB.prepare("SELECT versi, induk_id FROM sk_jitupasna WHERE id = ?").bind(v2.j.id).first(); assert.deepEqual([b2.versi, b2.induk_id], [2, jp]);
  assert.equal((await POST(KO, `/pulih/${v2.j.id}/status`, {ke: "pengumpulan"})).s, 200);
  assert.equal(await n("sk_jejak", `obyek = 'jitupasna' AND aksi = 'status' AND obyek_id = '${jp}'`), 5, "pengumpulan, ditinjau, pengumpulan (mundur), ditinjau, final");
});

uji("UJ-F4-09: R3P hanya dari Jitupasna final; KO membuat, versi baru tidak menimpa; PD/PM/BP/tamu ditolak; id asing 404", async () => {
  const final = (await DB.prepare("SELECT id FROM sk_jitupasna WHERE status = 'final'").first()).id, belum = (await DB.prepare("SELECT id FROM sk_jitupasna WHERE status != 'final'").first()).id;
  assert.equal((await POST(KO, "/r3p", {jitupasna_id: belum})).s, 409, "Jitupasna belum final");
  for (const a of [PD, PM, BP]) assert.equal((await POST(a, "/r3p", {jitupasna_id: final})).s, 403);
  assert.equal((await POST(TAMU, "/r3p", {jitupasna_id: final})).s, 401);
  for (const b of [{}, {jitupasna_id: "x"}]) assert.equal((await POST(KO, "/r3p", b)).s, 400);
  assert.equal((await POST(KO, "/r3p", {jitupasna_id: "0123456789abcdef"})).s, 404);
  const r = await POST(KO, "/r3p", {jitupasna_id: final}); assert.equal(r.s, 201, r.t);
  const b = await DB.prepare("SELECT status, versi, tanggap_mulai, kejadian_id FROM sk_r3p WHERE id = ?").bind(r.j.id).first(); assert.deepEqual([b.status, b.versi, b.tanggap_mulai, b.kejadian_id], ["draf", 1, "2026-03-02", KID]);
  assert.equal((await POST(KO, "/r3p", {jitupasna_id: final})).s, 409, "sudah ada draf");
  assert.equal(await n("sk_jejak", `obyek = 'r3p' AND obyek_id = '${r.j.id}' AND aksi = 'buat'`), 1);
});

uji("UJ-F4-09: kegiatan R3P: lima sektor, tautan pemulihan ada atau 404, tautan berpasangan, hanya saat draf, hanya KO", async () => {
  const r3p = (await DB.prepare("SELECT id FROM sk_r3p").first()).id;
  const pem = id16(); await DB.prepare("INSERT INTO pemulihan (id, jenis, prov, kab, target, realisasi, satuan, status, dibuat, diubah, lat, lon, pelaksana) VALUES (?, 'huntara', '32', 'Bogor', 100, 40, 'unit', 'berjalan', 1, ?, -6.5, 106.8, 'PT Rahasia')").bind(pem, Date.now()).run();
  const k = (o = {}) => POST(KO, `/r3p/${r3p}/kegiatan`, {sektor: "permukiman", nama: "Huntara Bogor", target: 100, satuan: "unit", nilai_rp: 800 * J, ...o});
  for (const a of [PD, PM, BP]) assert.equal((await POST(a, `/r3p/${r3p}/kegiatan`, {sektor: "permukiman", nama: "Huntara"})).s, 403);
  for (const o of [{sektor: "perumahan"}, {sektor: "lain"}, {nama: "ab"}, {target: -1}, {nilai_rp: 1.5}, {nilai_rp: -1}, {tautan_jenis: "pemulihan"}, {tautan_id: pem}, {tautan_jenis: "lain", tautan_id: pem}, {tautan_jenis: "pemulihan", tautan_id: "xyz"}]) assert.equal((await k(o)).s, 400, JSON.stringify(o));
  assert.equal((await k({tautan_jenis: "pemulihan", tautan_id: "ffffffffffffffff"})).s, 404, "tautan tidak ada"); assert.equal((await k({tautan_jenis: "meja_rehab", tautan_id: pem})).s, 404, "bukan catatan meja rehab");
  const a = await k({tautan_jenis: "pemulihan", tautan_id: pem}); assert.equal(a.s, 201, a.t);
  const b = await k({sektor: "infrastruktur", nama: "Jembatan gantung", nilai_rp: 200 * J, target: 2}); assert.equal(b.s, 201);
  assert.equal(await n("sk_r3p_kegiatan", `r3p_id = '${r3p}'`), 2);
  const det = await GET(KO, `/r3p/${r3p}`); assert.equal(det.s, 200, det.t);
  assert.equal(det.j.kegiatan.length, 2); assert.equal(det.j.catatan, "DRAF, bukan dokumen resmi"); assert.equal(det.j.hari_tersisa_90.berlalu > 0, true);
  const kem = det.j.kemajuan.kegiatan.find(x => x.id === a.j.id); assert.equal(kem.persen, 40); assert.equal(kem.pemulihan.realisasi, 40); assert.equal("lat" in kem.pemulihan || "pelaksana" in kem.pemulihan, false, "tanpa koordinat dan pelaksana");
  assert.equal(det.j.kemajuan.total, null, "satu kegiatan tanpa target: total menunggu");
});

uji("UJ-F4-09 dan UJ-KP-07: status R3P maju satu langkah; setuju hanya PM dan hanya dari diusulkan; KO dan pembuat sendiri ditolak; nomor keputusan hanya teks; nilai beku sesudah ditetapkan", async () => {
  const r3p = (await DB.prepare("SELECT id FROM sk_r3p").first()).id, st = (a, b) => POST(a, `/r3p/${r3p}/status`, b);
  for (const a of [PD, PM, BP]) assert.equal((await st(a, {ke: "diusulkan"})).s, 403);
  assert.equal((await POST(PM, `/r3p/${r3p}/setuju`, {})).s, 409, "setuju dari draf");
  assert.equal((await st(KO, {ke: "disetujui_pm"})).s, 400, "disetujui_pm tidak lewat status"); assert.equal((await st(KO, {ke: "berjalan"})).s, 409); assert.equal((await st(KO, {ke: "x"})).s, 400);
  assert.equal((await st(KO, {ke: "diusulkan"})).s, 200);
  assert.equal((await DB.prepare("SELECT total_rp FROM sk_r3p WHERE id = ?").bind(r3p).first()).total_rp, 1000 * J, "total dari dua kegiatan bernilai (800 jt + 200 jt)");
  assert.equal((await POST(KO, `/r3p/${r3p}/kegiatan`, {sektor: "sosial", nama: "Sekolah darurat"})).s, 409, "kegiatan hanya saat draf: sesudah diusulkan, total_rp sudah beku");
  assert.equal((await POST(KO, `/r3p/${r3p}/setuju`, {})).s, 403, "KO tak punya hak setuju");
  assert.equal((await POST(PD, `/r3p/${r3p}/setuju`, {})).s, 403); assert.equal((await POST(SA, `/r3p/${r3p}/setuju`, {})).s, 403, "Super Admin bukan pimpinan"); assert.equal((await POST(BP, `/r3p/${r3p}/setuju`, {})).s, 403); assert.equal((await POST(TAMU, `/r3p/${r3p}/setuju`, {})).s, 401);
  assert.equal((await DB.prepare("SELECT status, disetujui_oleh FROM sk_r3p WHERE id = ?").bind(r3p).first()).disetujui_oleh, null);
  const s1 = await POST(PM, `/r3p/${r3p}/setuju`, {}); assert.equal(s1.s, 200, s1.t); assert.equal(s1.j.label, "tanda setuju internal");
  assert.equal((await POST(PM2, `/r3p/${r3p}/setuju`, {})).s, 409, "sudah disetujui");
  const b = await DB.prepare("SELECT status, disetujui_oleh, disetujui_pada FROM sk_r3p WHERE id = ?").bind(r3p).first(); assert.equal(b.status, "disetujui_pm"); assert.match(b.disetujui_oleh, /^staf:/); assert.ok(b.disetujui_pada);
  assert.equal((await GET(KO, `/r3p/${r3p}`)).j.label_setuju, "tanda setuju internal");
  assert.equal((await POST(KO, `/r3p/${r3p}/kegiatan`, {sektor: "sosial", nama: "Terlambat"})).s, 409, "kegiatan baru tidak sesudah disetujui");
  for (const o of [{}, {no_keputusan: "SK Gub 12/2026"}, {no_keputusan: "SK Gub 12/2026", tgl_keputusan: "5-9-2026"}, {tgl_keputusan: "2026-09-05"}, {no_keputusan: "SK Gub 12/2026", tgl_keputusan: "2026-09-31"}]) assert.equal((await st(KO, {ke: "ditetapkan_resmi", ...o})).s, 400, JSON.stringify(o));
  assert.equal((await st(KO, {ke: "ditetapkan_resmi", no_keputusan: "SK Gub 12/2026", tgl_keputusan: "2026-09-05", penandatangan: "Gubernur Jawa Barat"})).s, 200);
  const r = await DB.prepare("SELECT no_keputusan, tgl_keputusan, penandatangan FROM sk_r3p WHERE id = ?").bind(r3p).first(); assert.deepEqual([r.no_keputusan, r.tgl_keputusan, r.penandatangan], ["SK Gub 12/2026", "2026-09-05", "Gubernur Jawa Barat"]);
  assert.equal((await GET(KO, `/r3p/${r3p}`)).j.catatan, "salinan data, dokumen resmi di luar sistem");
  await assert.rejects(() => DB.prepare("UPDATE sk_r3p SET total_rp = 1 WHERE id = ?").bind(r3p).run(), /sk_r3p_beku/); await assert.rejects(() => DB.prepare("UPDATE sk_r3p_kegiatan SET nilai_rp = 1 WHERE r3p_id = ?").bind(r3p).run(), /sk_r3p_beku/);
  assert.equal((await st(KO, {ke: "berjalan"})).s, 200); assert.equal((await st(KO, {ke: "diusulkan"})).s, 409);
  assert.equal(await n("sk_jejak", `obyek = 'r3p' AND obyek_id = '${r3p}' AND aksi IN ('status', 'setuju')`), 4);
});

uji("UJ-KP-07: KO yang punya peran pimpinan tidak bisa menyetujui drafnya sendiri (rute 403, trigger menolak lewat SQL); pemberi harus staf:<id>", async () => {
  const jp = (await DB.prepare("SELECT id FROM sk_jitupasna WHERE status = 'final'").first()).id;
  await DB.prepare("UPDATE sk_r3p SET status = 'selesai' WHERE jitupasna_id = ? AND status = 'berjalan'").bind(jp).run();
  const baru = await POST(KOPM, "/r3p", {jitupasna_id: jp}); assert.equal(baru.s, 201, baru.t);
  assert.equal((await POST(KOPM, `/r3p/${baru.j.id}/status`, {ke: "diusulkan"})).s, 200);
  const sendiri = await POST(KOPM, `/r3p/${baru.j.id}/setuju`, {}); assert.equal(sendiri.s, 403, sendiri.t);
  const oleh = (await DB.prepare("SELECT oleh FROM sk_r3p WHERE id = ?").bind(baru.j.id).first()).oleh;
  await assert.rejects(() => DB.prepare("UPDATE sk_r3p SET status = 'disetujui_pm', disetujui_oleh = ?, disetujui_pada = 1 WHERE id = ?").bind(oleh, baru.j.id).run(), /sk_r3p_setuju/, "SQL langsung: pembuat sendiri");
  await assert.rejects(() => DB.prepare("UPDATE sk_r3p SET status = 'disetujui_pm', disetujui_oleh = 'admin:x', disetujui_pada = 1 WHERE id = ?").bind(baru.j.id).run(), /sk_r3p_setuju/, "SQL langsung: bukan staf");
  assert.equal((await DB.prepare("SELECT status FROM sk_r3p WHERE id = ?").bind(baru.j.id).first()).status, "diusulkan");
  assert.equal((await POST(PM, `/r3p/${baru.j.id}/setuju`, {})).s, 200, "pimpinan lain boleh");
});

uji("UJ-F4-09: syarat fase transisi ke pemulihan ditegakkan: butuh R3P diusulkan atau lebih tertaut; sebelum itu 409", async () => {
  const k = await kej(KO, {nama: "Banjir syarat fase", mulai: "2026-03-09", kab4: "3203"}); await keTanggap(k);
  assert.equal((await POST(KO, `/kejadian/${k}/fase`, {ke: "transisi", tanggap_akhir: "2026-03-20"})).s, 200);
  const tolakFase = await POST(KO, `/kejadian/${k}/fase`, {ke: "pemulihan"}); assert.equal(tolakFase.s, 409, tolakFase.t); assert.match(tolakFase.t, /R3P/);
  const jp = await buat(k, "3203");
  await DB.prepare("UPDATE sk_jitupasna SET status = 'final', hitung = '{}' WHERE id = ?").bind(jp).run();
  const r = await POST(KO, "/r3p", {jitupasna_id: jp}); assert.equal(r.s, 201, r.t);
  assert.equal((await POST(KO, `/kejadian/${k}/fase`, {ke: "pemulihan"})).s, 409, "draf belum cukup");
  assert.equal((await POST(KO, `/r3p/${r.j.id}/status`, {ke: "diusulkan"})).s, 200);
  assert.equal((await POST(KO, `/kejadian/${k}/fase`, {ke: "pemulihan"})).s, 200);
  const d = await GET(KO, `/kejadian/${k}`); assert.deepEqual(d.j.pulih_ids, [jp]);
});

uji("UJ-F4-10: detail memuat rekap rumah rusak hanya hitungan per tingkat (tanpa koordinat, foto, pelapor); daftar dan detail dibatasi wilayah BP dengan 404 seragam", async () => {
  const jp = (await DB.prepare("SELECT id FROM sk_jitupasna WHERE kejadian_id = ? AND status = 'final'").bind(KID).first()).id;
  const rr = (tingkat, kab, tgl = "2026-03-03", status = "sah") => DB.prepare("INSERT INTO rumah_rusak (id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, pelapor, waktu, status, catatan) VALUES (?, 'banjir', ?, -6.5, 106.8, '32', ?, 'Cibinong', ?, 'akun:rahasia123', 1, ?, 'pemilik Pak Rahasia')").bind(id16(), tgl, kab, tingkat, status).run();
  for (const [t, kab, tgl, st] of [["berat", "Bogor"], ["berat", "Bogor"], ["sedang", "Bogor"], ["ringan", "Bogor"], ["berat", "Garut"], ["berat", "Bogor", "2026-03-03", "ditolak"], ["berat", "Bogor", "2025-01-01"]]) await rr(t, kab, tgl, st);
  const d = await GET(KO, `/pulih/${jp}`); assert.equal(d.s, 200, d.t);
  assert.deepEqual(d.j.rekap_rumah_rusak.total, {berat: 2, sedang: 1, ringan: 1, total: 4}, "hanya sah, kabupaten dan jendela tanggal ini"); assert.equal(d.j.rekap_rumah_rusak.kec[0].kec, "Cibinong");
  assert.doesNotMatch(d.t, /rahasia|Rahasia|"lat"|"lon"|"foto"|"pelapor"|"catatan":"pemilik/, "tanpa koordinat, foto, pelapor, catatan");
  assert.ok(d.j.baris.length >= 1); assert.ok(d.j.r3p.length >= 1);
  const bp = await GET(BP, `/pulih/${jp}`); assert.equal(bp.s, 200); assert.equal("oleh" in bp.j.jitupasna, false); assert.ok(bp.j.baris.every(x => !("oleh" in x)));
  const luar = await GET(BP2, `/pulih/${jp}`), takAda = await GET(BP2, "/pulih/0123456789abcdef"); assert.equal(luar.s, 404); assert.equal(luar.t, takAda.t);
  assert.equal((await GET(BP2, `/pulih?kejadian_id=${KID}`)).s, 404); assert.equal((await GET(BP, `/pulih?kejadian_id=${KID}`)).j.baris.length >= 1, true);
  for (const a of [PD, PM, SA, MOD]) assert.equal((await GET(a, `/pulih/${jp}`)).s, 200);
  assert.equal((await GET(TAMU, `/pulih/${jp}`)).s, 401); assert.equal((await GET(KO, "/pulih")).s, 400); assert.equal((await GET(KO, "/pulih?kejadian_id=x")).s, 400);
  assert.equal((await GET(KO, "/r3p/0123456789abcdef")).s, 404); assert.equal((await GET(TAMU, "/r3p/0123456789abcdef")).s, 401);
  const r3p = (await DB.prepare("SELECT id FROM sk_r3p WHERE kejadian_id = ?").bind(KID).first()).id;
  assert.equal((await GET(BP, `/r3p/${r3p}`)).s, 200); assert.equal((await GET(BP2, `/r3p/${r3p}`)).s, 404);
});
