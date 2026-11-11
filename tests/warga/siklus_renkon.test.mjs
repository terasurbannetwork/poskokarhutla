/* Siklus Bencana F5 (SK-088, SK-089): rute renkon, asumsi, status, gladi, catatan, pemutaran ulang. UJ-F5-03 (rute), UJ-F5-04 (dibaca), UJ-F5-06 (rute), UJ-F5-07.
   worker.js utuh di Miniflare + D1 + R2 sungguhan. Jalankan: node --test tests/warga/siklus_renkon.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16} from "./_siklus.mjs";

const U = await mulai("uji-sk-renkon");
const {DB, GET, POST, n, kej} = U;
const [PD, KO, PM] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"]), await U.staf("Pm Uji", ["pimpinan"])];
const BP = await U.bp(), BP2 = await U.bp({kab: "Garut"}), BPP = await U.bp({tingkat: "prov", jenis: "pemprov", kab: null}), {SA, MOD, TAMU} = U;
const satu = (sql, ...b) => DB.prepare(sql).bind(...b).first();
const arsip = (tahun, nama, isi) => U.mf.getR2Bucket("MEDIA").then(b => b.put(`siklus/saji/kejadian/arsip/${tahun}/${nama}.json`, JSON.stringify(isi)));
const buat = async (o = {}, a = KO) => { const r = await POST(a, "/renkon", {judul: "Renkon banjir Bogor", bencana: "banjir", prov: "32", kab4: "3201", ...o}); assert.equal(r.s, 201, r.t); return r.j.id; };
const STATUS = async (id, ke, o = {}, a = KO) => POST(a, `/renkon/${id}/status`, {ke, ...o});
const sampaiBerlaku = async (id, tgl = "2026-09-01") => {
  for (const ke of ["pelaksanaan", "finalisasi"]) assert.equal((await STATUS(id, ke)).s, 200);
  const r = await STATUS(id, "ditetapkan", {tgl_sah: tgl, no_penetapan: "SK Kepala BPBD 12/2026"}); assert.equal(r.s, 200, r.t);
  assert.equal((await STATUS(id, "berlaku")).s, 200);
};

uji("UJ-F5-07: renkon dibuat PD dan KO; PM/BP 403; tamu 401; validasi menolak; satu renkon aktif per wilayah dan bencana; jejak satu", async () => {
  for (const a of [PM, BP, BPP]) assert.equal((await POST(a, "/renkon", {judul: "Renkon banjir Bogor", bencana: "banjir", prov: "32"})).s, 403);
  assert.equal((await POST(TAMU, "/renkon", {judul: "Renkon banjir Bogor", bencana: "banjir", prov: "32"})).s, 401);
  const salah = [{}, {judul: "abc"}, {judul: "Renkon sah", bencana: "naga", prov: "32"}, {judul: "Renkon sah", bencana: "banjir", prov: "99"}, {judul: "Renkon sah", bencana: "banjir", prov: "32", kab4: "3301"}, {judul: "Renkon sah", bencana: "banjir", prov: "32", kab4: "9999"},
    {judul: "Renkon sah", bencana: "banjir", prov: "32", skenario: "telp 081234567890"}, {judul: "Renkon sah", bencana: "banjir", prov: "32", meja_id: "a b"}, {judul: "Renkon <b>x</b>", bencana: "banjir", prov: 32}];
  for (const b of salah) { const r = await POST(KO, "/renkon", b); if (!(b.judul === "Renkon <b>x</b>")) assert.equal(r.s, 400, JSON.stringify(b)); }
  assert.equal(await n("sk_renkon"), 0, "yang salah tidak menulis");
  const id = await buat({}, PD); const b = await satu("SELECT * FROM sk_renkon WHERE id = ?", id);
  assert.deepEqual([b.status, b.versi, b.prov, b.kab4, b.dummy, b.induk_id], ["persiapan", 1, "32", "3201", 0, null]); assert.match(b.oleh, /^staf:/);
  assert.equal(await n("sk_jejak", `obyek = 'renkon' AND obyek_id = '${id}' AND aksi = 'buat'`), 1);
  assert.equal((await POST(KO, "/renkon", {judul: "Renkon banjir lagi", bencana: "banjir", prov: "32", kab4: "3201"})).s, 409, "sudah ada yang belum dimutakhirkan");
  assert.equal((await POST(KO, "/renkon", {judul: "Renkon gempa provinsi", bencana: "gempa", prov: "32"})).s, 201, "bencana lain dan tingkat provinsi boleh");
});

uji("UJ-F5-07: baca renkon: staf dan BP wilayahnya; BP lain 404 sama dengan tak ada; prov wajib; BP provinsi melihat renkon tingkat provinsi", async () => {
  const l = await GET(PM, "/renkon?prov=32"); assert.equal(l.s, 200); assert.ok(l.j.baris.length >= 2); assert.ok(l.j.baris.every(r => r.kesegaran.status === "menunggu" && r.kedaluwarsa === undefined || r.kesegaran));
  assert.equal((await GET(PM, "/renkon")).s, 400); assert.equal((await GET(PM, "/renkon?prov=99")).s, 400); assert.equal((await GET(TAMU, "/renkon?prov=32")).s, 401);
  const bp = await GET(BP, "/renkon?prov=32"); assert.equal(bp.s, 200);
  assert.deepEqual(bp.j.baris.map(r => r.kab4), ["3201"], "akun kabupaten Bogor: hanya Bogor, bukan renkon tingkat provinsi");
  assert.ok(bp.j.baris.every(r => !("oleh" in r)), "BP tidak melihat pembuat");
  assert.equal((await GET(BP2, "/renkon?prov=32")).j.baris.length, 0);
  assert.ok((await GET(BPP, "/renkon?prov=32")).j.baris.some(r => r.kab4 === null), "akun provinsi melihat renkon tingkat provinsi");
  const id = (await GET(PM, "/renkon?prov=32&kab4=3201")).j.baris[0].id;
  const luar = await GET(BP2, `/renkon/${id}`), takAda = await GET(BP2, "/renkon/0123456789abcdef"); assert.equal(luar.s, 404); assert.equal(luar.t, takAda.t, "luar wilayah = tak ada, byte demi byte");
  assert.equal((await GET(BP, `/renkon/${id}`)).s, 200); assert.equal((await GET(TAMU, `/renkon/${id}`)).s, 401);
});

uji("UJ-F5-07: isian asumsi PD/KO sebelum ditetapkan; usulan sistem tidak menimpa; validasi aspek, label, telepon; BP/PM 403", async () => {
  const id = (await GET(KO, "/renkon?prov=32&kab4=3201")).j.baris[0].id;
  const asumsi = {lingkungan: {nilai: "banjir luapan Ciliwung", sumber: "Kajian risiko BPBD 2025", waktu: "2026-05-01", yakin: "asumsi-kebijakan"}, kependudukan: {nilai: 4200, sumber: "Dukcapil 2026", yakin: "resmi"}};
  for (const a of [PM, BP]) assert.equal((await POST(a, `/renkon/${id}/asumsi`, {asumsi})).s, 403);
  assert.equal((await POST(TAMU, `/renkon/${id}/asumsi`, {asumsi})).s, 401);
  for (const b of [{}, {asumsi: "x"}, {asumsi: {ekonomi_x: {nilai: 1, sumber: "abc", yakin: "resmi"}}}, {asumsi: {ekonomi: {nilai: 1, sumber: "abc", yakin: "pasti"}}}, {asumsi: {ekonomi: {nilai: 1, sumber: "ab", yakin: "resmi"}}},
    {asumsi: {ekonomi: {nilai: "telp 081234567890", sumber: "abc", yakin: "resmi"}}}, {asumsi: {ekonomi: {nilai: 1, sumber: "abc", yakin: "resmi", waktu: "kemarin"}}}, {kerangka: {jiwa: -1}}, {kerangka: {hari: 0}}, {kesenjangan: {target_personel: 1.5}}, {reviu_terakhir: "x"}])
    assert.equal((await POST(PD, `/renkon/${id}/asumsi`, b)).s, 400, JSON.stringify(b));
  assert.equal((await POST(PD, `/renkon/${id}/asumsi`, {asumsi, kerangka: {jiwa: 1000, hari: 5}, kesenjangan: {target_personel: 50}})).s, 200);
  const d = (await GET(KO, `/renkon/${id}`)).j;
  assert.equal(d.renkon.asumsi.kependudukan.nilai, 4200); assert.equal(d.renkon.asumsi.lingkungan.yakin, "asumsi-kebijakan");
  assert.equal(d.usulan.komponen.beras.nilai, 2000, "usulan dari kerangka tampil di samping"); assert.notEqual(d.renkon.asumsi.kependudukan.nilai, d.usulan.jiwa, "usulan tidak menimpa isian staf");
  assert.equal((await POST(KO, `/renkon/${id}/asumsi`, {reviu_terakhir: "2026-08-01"})).s, 409, "reviu hanya sesudah ditetapkan");
  assert.equal((await POST(KO, "/renkon/0123456789abcdef/asumsi", {kerangka: {jiwa: 1}})).s, 404);
});

uji("UJ-F5-07: status renkon hanya KO, urut maju, ditetapkan wajib no_penetapan dan tgl_sah (berlaku_sampai = +36 bulan); dokumen ditetapkan tidak ditimpa; reviu dicatat", async () => {
  const id = await buat({bencana: "longsor"});
  for (const a of [PD, PM, BP]) assert.equal((await STATUS(id, "pelaksanaan", {}, a)).s, 403);
  assert.equal((await STATUS(id, "pelaksanaan", {}, TAMU)).s, 401);
  assert.equal((await STATUS(id, "berlaku")).s, 409, "lompat"); assert.equal((await STATUS(id, "persiapan")).s, 400); assert.equal((await STATUS(id, "kedaluwarsa")).s, 400, "kedaluwarsa bukan status");
  assert.equal((await STATUS(id, "pelaksanaan")).s, 200); assert.equal((await STATUS(id, "pelaksanaan")).s, 409, "ulang"); assert.equal((await STATUS(id, "finalisasi")).s, 200);
  for (const o of [{}, {tgl_sah: "2024-02-29"}, {no_penetapan: "SK/1"}, {tgl_sah: "2024-02-30", no_penetapan: "SK/1"}, {tgl_sah: "2024-02-29", no_penetapan: "SK 081234567890"}]) assert.equal((await STATUS(id, "ditetapkan", o)).s, 400, JSON.stringify(o));
  const r = await STATUS(id, "ditetapkan", {tgl_sah: "2024-02-29", no_penetapan: "SK Kepala BPBD 5/2024"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.berlaku_sampai, "2027-02-28");
  assert.equal((await POST(PD, `/renkon/${id}/asumsi`, {kerangka: {jiwa: 5}})).s, 409, "dokumen ditetapkan tidak ditimpa");
  const rv = await POST(PD, `/renkon/${id}/asumsi`, {reviu_terakhir: "2026-08-01"}); assert.equal(rv.s, 200, rv.t);
  assert.equal((await satu("SELECT reviu_terakhir r FROM sk_renkon WHERE id = ?", id)).r, "2026-08-01");
  assert.equal((await STATUS(id, "berlaku")).s, 200);
  assert.equal(await n("sk_jejak", `obyek = 'renkon' AND obyek_id = '${id}' AND aksi = 'status'`), 4);
  assert.equal((await POST(KO, "/renkon", {judul: "Renkon longsor baru", bencana: "longsor", prov: "32", kab4: "3201"})).s, 409, "berlaku belum dimutakhirkan");
  assert.equal((await STATUS(id, "dimutakhirkan")).s, 200);
  const v2 = await POST(KO, "/renkon", {judul: "Renkon longsor versi dua", bencana: "longsor", prov: "32", kab4: "3201"}); assert.equal(v2.s, 201, v2.t);
  const b = await satu("SELECT versi, induk_id FROM sk_renkon WHERE id = ?", v2.j.id); assert.deepEqual([b.versi, b.induk_id], [2, id]);
});

uji("UJ-F5-04: kedaluwarsa dan hari tersisa dihitung saat dibaca, tidak disimpan; status tersimpan tetap berlaku", async () => {
  const id = await buat({bencana: "cuaca"}); for (const ke of ["pelaksanaan", "finalisasi"]) await STATUS(id, ke);
  await STATUS(id, "ditetapkan", {tgl_sah: "2026-01-10", no_penetapan: "SK 1/2026"}); await STATUS(id, "berlaku");
  let d = (await GET(KO, `/renkon/${id}`)).j.renkon; assert.equal(d.status, "berlaku"); assert.equal(d.kesegaran.berlaku_sampai, "2029-01-10"); assert.equal(d.kedaluwarsa, false); assert.ok(d.hari_tersisa > 90);
  await DB.prepare("UPDATE sk_renkon SET tgl_sah = '2022-01-10', berlaku_sampai = '2025-01-10' WHERE id = ?").bind(id).run();
  d = (await GET(KO, `/renkon/${id}`)).j.renkon; assert.equal(d.status, "berlaku", "status D1 tidak berubah"); assert.equal(d.kedaluwarsa, true); assert.ok(d.hari_tersisa < 0); assert.equal(d.kesegaran.status, "kedaluwarsa");
  await DB.prepare("UPDATE sk_renkon SET berlaku_sampai = date('now', '+40 days'), tgl_sah = date('now', '-1000 days'), reviu_terakhir = date('now') WHERE id = ?").bind(id).run();
  d = (await GET(KO, `/renkon/${id}`)).j.renkon; assert.equal(d.kesegaran.status, "segera_habis"); assert.ok(d.hari_tersisa >= 38 && d.hari_tersisa <= 41);
  assert.equal((await satu("SELECT status FROM sk_renkon WHERE id = ?", id)).status, "berlaku");
});

uji("UJ-F5-03: kesenjangan dari LogPal dibaca, bukan disalin: beras gap 800 (rusak tidak dihitung), air minum stok belum tercatat bukan 0; personel target dan siap", async () => {
  const id = await buat({bencana: "gempa", kab4: "3202", prov: "32"});   // Sukabumi
  const gid = id16(), t = Date.now(), brg = (barang, satuan, jumlah, baik, rusak, std = "") => DB.prepare("INSERT INTO logpal_barang (id, gudang_id, barang, item_standar, kelompok, satuan, jumlah, baik, rusak, dibuat, diubah) VALUES (?, ?, ?, ?, 'Pangan', ?, ?, ?, ?, ?, ?)").bind(id16(), gid, barang, std, satuan, jumlah, baik, rusak, t, t).run();
  await DB.prepare("INSERT INTO logpal_gudang (id, nama, pemilik, prov, provinsi, kab, dibuat, diubah) VALUES (?, 'Gudang uji Sukabumi', 'BPBD', '32', 'Jawa Barat', 'Kabupaten Sukabumi', ?, ?)").bind(gid, t, t).run();
  await brg("Beras medium", "kg", 1500, 1200, 100); await brg("Tenda keluarga", "unit", 30, 30, 0);
  await POST(KO, `/renkon/${id}/asumsi`, {kerangka: {jiwa: 1000, hari: 5}, kesenjangan: {target_personel: 50}});
  const before = await n("logpal_barang"), d = (await GET(KO, `/renkon/${id}`)).j, B = Object.fromEntries(d.kesenjangan_hitung.barang.map(x => [x.nama, x]));
  assert.deepEqual([B.beras.status, B.beras.kebutuhan, B.beras.stok_baik, B.beras.gap, B.beras.rusak, B.beras.belum_dinilai], ["dihitung", 2000, 1200, 800, 100, 200]);
  assert.equal(B.air_minum.status, "stok belum tercatat"); assert.equal(B.air_minum.gap, null, "bukan 0");
  assert.equal(d.kesenjangan_hitung.personel.target, 50); assert.equal(d.kesenjangan_hitung.personel.cakupan, "provinsi"); assert.equal(d.kesenjangan_hitung.personel.gap, 50 - d.kesenjangan_hitung.personel.siap);
  assert.equal(await n("logpal_barang"), before, "tidak ada stok kedua");
  await brg("Air mineral 600 ml", "dus", 100, 100, 0);
  assert.equal(((await GET(KO, `/renkon/${id}`)).j.kesenjangan_hitung.barang.find(x => x.nama === "air_minum")).status, "satuan beda, menunggu");
  await brg("Air mineral galon", "liter", 20000, 15000, 0, "Air mineral");
  const a = (await GET(KO, `/renkon/${id}`)).j.kesenjangan_hitung.barang.find(x => x.nama === "air_minum"); assert.deepEqual([a.status, a.gap, a.surplus], ["dihitung", 0, 2500]);
  const lain = await buat({bencana: "tsunami", kab4: "3201"}); assert.equal(((await GET(KO, `/renkon/${lain}`)).j.kesenjangan_hitung.barang.find(x => x.nama === "beras")).status, "kebutuhan menunggu", "tanpa kerangka kebutuhan menunggu");
  const bpd = (await GET(BP, `/renkon/${(await GET(BP, "/renkon?prov=32&kab4=3201")).j.baris[0].id}`)).j; assert.equal(bpd.gladi.length, 0, "BP tidak melihat gladi");
});

/* ================================================================ gladi */
let KID, KID25, RK;   // disiapkan malas: renkon gladi tidak boleh ada sebelum uji renkon di atas menghitung barisnya
const sumber = (kid, kode, mulai, dampak) => DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, kejadian_id, status, jenis, kab4, mulai, dampak, diambil, dibuat, diubah) VALUES (?, 'dibi', ?, ?, 'terpasang', 'banjir', '3201', ?, ?, 1, 1, 1)").bind(id16(), kode, kid, mulai, JSON.stringify(dampak)).run();
const siapG = async () => {
  if (RK) return;
  KID = await kej(KO, {nama: "Banjir Bogor gladi", mulai: "2026-03-02"}); KID25 = await kej(KO, {nama: "Banjir Maret 2025", mulai: "2025-03-04", kab4: "3201"});
  await sumber(KID, "g1", "2026-03-02", {meninggal: {n: 5, y: "resmi", t: "2026"}, terdampak: {n: 1200, y: "resmi", t: "2026"}});
  await sumber(KID25, "g2", "2025-03-04", {meninggal: {n: 2, y: "resmi", t: "2025"}});
  RK = await buat({bencana: "kekeringan", kab4: "3201"});
};
const gladiBuat = async (o = {}, a = KO) => { const r = await POST(a, "/gladi", {jenis: "ruang", renkon_id: RK, kejadian_id: KID, ...o}); return r; };

uji("UJ-F5-06: gladi hanya KO; kejadian tak ada 404; kejadian masih di arsip R2 409 'promosikan dulu'; dummy tidak bercampur; skenario dari D1 tanpa nama korban", async () => {
  await siapG();
  for (const a of [PD, PM, BP]) assert.equal((await gladiBuat({}, a)).s, 403);
  assert.equal((await gladiBuat({}, TAMU)).s, 401);
  for (const b of [{jenis: "daring"}, {renkon_id: "x"}, {kejadian_id: "abc"}, {percepatan: 0.5}, {percepatan: "2"}, {tahun: 2019}, {kab4: "3201"}, {tahun: 1999, kab4: "3201"}]) assert.equal((await gladiBuat(b)).s, 400, JSON.stringify(b));
  assert.equal((await gladiBuat({renkon_id: "0123456789abcdef"})).s, 404);
  assert.equal((await gladiBuat({kejadian_id: "KJ-2026-ZZZZZZZZ"})).s, 404, "kejadian tidak ada");
  const idA = "KJ-2019-7K3M9Q2A"; await arsip(2019, "k3201", {v: 1, kolom: ["id", "jenis", "kab4", "mulai"], baris: [[idA, "banjir", "3201", "2019-02-12"]]});
  const m = await gladiBuat({kejadian_id: idA, tahun: 2019, kab4: "3201"}); assert.equal(m.s, 409); assert.match(m.t, /promosikan dulu/);
  assert.equal((await gladiBuat({kejadian_id: "KJ-2019-8K3M9Q2B", tahun: 2019, kab4: "3201"})).s, 404, "tidak ada di berkas arsip juga");
  assert.equal(await n("sk_gladi"), 0, "yang ditolak tidak menulis");
  const r = await gladiBuat({percepatan: 1}); assert.equal(r.s, 201, r.t); const b = await satu("SELECT * FROM sk_gladi WHERE id = ?", r.j.id);
  assert.deepEqual([b.status, b.jenis, b.renkon_id, b.kejadian_id, b.dummy], ["dirancang", "ruang", RK, KID, 0]);
  const sk = JSON.parse(b.skenario); assert.equal(sk.label, "Model sederhana, bukan prakiraan"); assert.equal(sk.tanpa_identitas, true); assert.equal(sk.replay_maret_2025, undefined, "bukan Maret 2025");
  assert.deepEqual(sk.langkah.map(x => [x.metrik, x.nilai, x.t_jam]).sort(), [["meninggal", 5, 0], ["terdampak", 1200, 0]]);
  assert.doesNotMatch(b.skenario, /"(nama|nik|alamat|telepon|pelapor)"/i);
  assert.equal(await n("sk_jejak", `obyek = 'gladi' AND obyek_id = '${r.j.id}'`), 1);
  const d = await DB.prepare("SELECT id FROM sk_kejadian WHERE id = ?").bind(KID).first(); assert.ok(d);
  await DB.prepare("UPDATE sk_kejadian SET dummy = 1 WHERE id = ?").bind(KID25).run();
  try {
    assert.equal((await gladiBuat({kejadian_id: KID25})).s, 404, "staf nyata tidak melihat kejadian contoh");
    assert.equal((await gladiBuat({kejadian_id: KID25}, SA)).s, 409, "SA: renkon nyata dengan kejadian contoh tidak bercampur");
  } finally { await DB.prepare("UPDATE sk_kejadian SET dummy = 0 WHERE id = ?").bind(KID25).run(); }
});

uji("UJ-F5-06: replay Maret 2025 hanya milik kejadian itu, berlisensi NC dan berpil model sederhana; percepatan 2 membagi waktu", async () => {
  await siapG();
  const r = await gladiBuat({kejadian_id: KID25, jenis: "lapang", percepatan: 2}); assert.equal(r.s, 201, r.t);
  const sk = JSON.parse((await satu("SELECT skenario FROM sk_gladi WHERE id = ?", r.j.id)).skenario);
  assert.equal(sk.replay_maret_2025, true); assert.match(sk.lisensi, /NC/); assert.equal(sk.percepatan, 2); assert.equal(sk.label, "Model sederhana, bukan prakiraan");
  const lain = await satu("SELECT skenario FROM sk_gladi WHERE kejadian_id = ? LIMIT 1", KID); assert.doesNotMatch(lain.skenario, /replay_maret_2025/);
  const badan = await POST(KO, "/gladi", {jenis: "ruang", renkon_id: RK, kejadian_id: KID, replay_maret_2025: true, lisensi: "bebas"}); assert.equal(badan.s, 201);
  assert.doesNotMatch((await satu("SELECT skenario FROM sk_gladi WHERE id = ?", badan.j.id)).skenario, /replay_maret_2025|bebas/, "penanda tidak bisa dipasang lewat badan");
});

uji("UJ-F5-07: status gladi hanya KO, urut maju, selesai wajib rekomendasi 1-20 butir bidang sah; catatan PD hanya siap sampai dievaluasi, optimistik", async () => {
  await siapG();
  const g = (await GET(PM, `/gladi?renkon_id=${RK}`)).j.baris.find(x => x.jenis === "ruang" && x.status === "dirancang").id;
  const S = (ke, o = {}, a = KO) => POST(a, `/gladi/${g}/status`, {ke, ...o});
  for (const a of [PD, PM, BP]) assert.equal((await S("siap", {}, a)).s, 403); assert.equal((await S("siap", {}, TAMU)).s, 401);
  assert.equal((await POST(PD, `/gladi/${g}/catatan`, {teks: "Radio mati di posko"})).s, 409, "dirancang belum menerima catatan");
  assert.equal((await S("berjalan")).s, 409, "lompat"); assert.equal((await S("dirancang")).s, 400); assert.equal((await S("siap")).s, 200);
  for (const a of [PM, BP]) assert.equal((await POST(a, `/gladi/${g}/catatan`, {teks: "Radio mati di posko"})).s, 403);
  assert.equal((await POST(PD, `/gladi/${g}/catatan`, {teks: "ab"})).s, 400); assert.equal((await POST(PD, `/gladi/${g}/catatan`, {teks: "hubungi 081234567890"})).s, 400);
  const c = await POST(PD, `/gladi/${g}/catatan`, {teks: "Radio mati di posko"}); assert.equal(c.s, 201, c.t); assert.equal(c.j.butir, 1);
  assert.equal((await POST(KO, `/gladi/${g}/catatan`, {teks: "Genset kurang bahan bakar"})).j.butir, 2);
  assert.equal((await S("berjalan")).s, 200); assert.equal((await S("dievaluasi")).s, 200);
  for (const rek of [undefined, [], "x", [{bidang: "lain", teks: "Perbaiki sarana"}], [{bidang: "kebijakan", teks: "ab"}], Array(21).fill({bidang: "renkon", teks: "Perbarui renkon"}), [{bidang: "renkon", teks: "tel 081234567890 hubungi"}]])
    assert.equal((await S("selesai", {rekomendasi: rek})).s, 400, JSON.stringify(rek)?.slice(0, 50));
  assert.equal((await S("berjalan", {rekomendasi: [{bidang: "renkon", teks: "Perbarui renkon"}]})).s, 400, "rekomendasi hanya saat selesai");
  const ok = await S("selesai", {rekomendasi: [{bidang: "kebijakan", teks: "Tetapkan SOP radio cadangan", tertaut: true}, {bidang: "sarpras", teks: "Tambah genset satu unit"}]}); assert.equal(ok.s, 200, ok.t);
  const d = (await GET(KO, `/gladi/${g}`)).j; assert.equal(d.gladi.status, "selesai"); assert.deepEqual(d.gladi.rekomendasi.map(x => x.tertaut), [true, false]); assert.equal(d.gladi.masalah.length, 2); assert.equal(d.label, "Model sederhana, bukan prakiraan");
  assert.equal((await POST(PD, `/gladi/${g}/catatan`, {teks: "Catatan terlambat"})).s, 409, "selesai tidak menerima catatan");
  assert.equal((await S("selesai", {rekomendasi: [{bidang: "renkon", teks: "Perbarui renkon"}]})).s, 409, "selesai tidak diulang");
  assert.equal(await n("sk_jejak", `obyek = 'gladi' AND obyek_id = '${g}' AND aksi = 'status'`), 4); assert.equal(await n("sk_jejak", `obyek = 'gladi' AND obyek_id = '${g}' AND aksi = 'catatan'`), 2);
  assert.equal((await DB.prepare("SELECT count(*) n FROM sk_gladi WHERE status = 'selesai' AND rekomendasi IS NULL").first()).n, 0);
});

uji("UJ-F5-07: baca gladi hanya staf; BP 403; skor kesiapan menyertakan rekomendasi tertaut", async () => {
  await siapG();
  assert.equal((await GET(BP, `/gladi?renkon_id=${RK}`)).s, 403); assert.equal((await GET(TAMU, `/gladi?renkon_id=${RK}`)).s, 401);
  assert.equal((await GET(PM, "/gladi")).s, 400); assert.equal((await GET(PM, "/gladi?renkon_id=0123456789abcdef")).s, 404); assert.equal((await GET(PM, "/gladi/0123456789abcdef")).s, 404);
  assert.equal((await GET(MOD, `/gladi?renkon_id=${RK}`)).s, 200); assert.equal((await GET(SA, `/gladi?renkon_id=${RK}`)).s, 200);
  const d = (await GET(KO, `/renkon/${RK}`)).j; assert.equal(d.gladi.length >= 3, true);
  assert.equal(d.skor.komponen.k4, 0.5, "satu dari dua rekomendasi gladi terakhir tertaut ke renkon");
  assert.ok(d.skor.label.endsWith("dari 4 komponen"));
});
