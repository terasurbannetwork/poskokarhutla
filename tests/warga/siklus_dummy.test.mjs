/* Siklus Bencana: rute dummy (SK-030, SK-041). UJ-KP-13, INV-5. worker.js utuh di Miniflare + D1 + R2 sungguhan.
   Jalankan: node --test tests/warga/siklus_dummy.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";

const U = await mulai("uji-sk-dummy");
const {DB, api, GET, POST, n} = U;
const [PD, KO] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"])];
const BP = await U.bp(), {SA, TAMU} = U;
const R2 = await U.mf.getR2Bucket("MEDIA");
const TABEL = ["sk_kejadian", "sk_kejadian_kab", "sk_kejadian_alias", "sk_kejadian_sumber", "sk_kaji", "sk_harga", "sk_jitupasna", "sk_jitupasna_baris", "sk_r3p", "sk_r3p_kegiatan", "sk_renkon", "sk_gladi", "sk_jejak"];
const dummyN = async () => { let t = 0; for (const x of TABEL) t += await n(x, "dummy = 1"); return t; };
const reset = () => DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'sk.dummy'").run();   // 6 per jam: tiap uji mulai dari nol
const TOK = {authorization: "Bearer token-pipa-uji"};

uji("UJ-KP-13: bukan SA ditolak (tamu 401, PD/KO/BP 403) dan tidak menulis", async () => {
  for (const a of [PD, KO]) assert.equal((await POST(a, "/dummy", {aksi: "isi", halaman: "kejadian"})).s, 403);
  assert.equal((await POST(TAMU, "/dummy", {aksi: "isi", halaman: "kejadian"})).s, 401);
  assert.equal((await POST(BP, "/dummy", {aksi: "isi", halaman: "kejadian"})).s, 403);
  assert.equal(await dummyN(), 0);
});
uji("masukan: aksi dan halaman asing, periode salah, kab4 asing 400", async () => {
  for (const b of [{}, {aksi: "x"}, {aksi: "isi"}, {aksi: "isi", halaman: "lain"}, {aksi: "isi", halaman: "kejadian", periode: "2026-02-30"}, {aksi: "isi", halaman: "kejadian", kab4: "9999"}]) assert.equal((await POST(SA, "/dummy", b)).s, 400, JSON.stringify(b));
});
uji("isi kejadian: 7 fase, sumber ambigu, tanpa_wilayah, dua sumber dengan selisih; periode dari layar; 409 bila sudah ada", async () => {
  const r = await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-03", kab4: "3201"}); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.per_tabel.sk_kejadian, 7); assert.equal(r.j.contoh, false);
  const fase = (await DB.prepare("SELECT fase, mulai FROM sk_kejadian WHERE dummy = 1 ORDER BY mulai").all()).results;
  assert.deepEqual(fase.map(f => f.fase), ["terdeteksi", "terverifikasi", "tanggap", "transisi", "pemulihan", "selesai", "dibatalkan"]);
  assert.equal(fase[0].mulai, "2026-03-01", "periode dari layar, bukan hari ini");
  assert.equal(await n("sk_kejadian_sumber", "status = 'ambigu' AND dummy = 1"), 1); assert.equal(await n("sk_kejadian_sumber", "status = 'tanpa_wilayah' AND dummy = 1 AND kab4 IS NULL"), 1);
  const id = (await DB.prepare("SELECT id FROM sk_kejadian WHERE dummy = 1 AND fase = 'tanggap'").first()).id;
  const d = await GET(SA, `/kejadian/${id}`); assert.equal(d.s, 200); const m = d.j.selisih.find(x => x.metrik === "meninggal"); assert.equal(m.selisih, 3); assert.equal(m.n, 2);
  assert.equal(await n("sk_jejak", "dummy = 0 AND aksi = 'isi_dummy'"), 0, "jejak isi ikut dummy");
  const lagi = await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-03"}); assert.equal(lagi.s, 409); assert.match(lagi.t, /sudah ada 7/);
  assert.equal(await n("sk_kejadian", "dummy = 1"), 7, "409 tidak menulis");
});
uji("staf nyata dan BP tidak melihat dummy; SA melihat; publik 404; ingest menolak mengacunya", async () => {
  assert.equal((await GET(PD, "/kejadian?dari=2026-03-01&sampai=2026-03-31")).j.baris.length, 0);
  assert.equal((await GET(SA, "/kejadian?dari=2026-03-01&sampai=2026-03-31")).j.baris.length, 7);
  const id = (await DB.prepare("SELECT id FROM sk_kejadian WHERE dummy = 1 AND fase = 'tanggap'").first()).id;
  assert.equal((await GET(PD, `/kejadian/${id}`)).s, 404); assert.equal((await GET(BP, `/kejadian/${id}`)).s, 404);
  await DB.prepare("UPDATE sk_kejadian SET publik = 1, ringkasan_publik = 'Ringkasan contoh banjir yang cukup panjang.' WHERE id = ?").bind(id).run();
  assert.equal((await GET(TAMU, `/publik/kejadian/${id}`)).s, 404, "dummy tidak pernah publik");
  const j = await api("GET", "/api/siklus/ingest/jendela?dari=2026-03-01&sampai=2026-03-31", undefined, TOK); assert.equal(j.s, 200); assert.equal(JSON.stringify(j.j).includes(id), false);
  const t = await api("POST", "/api/siklus/ingest/kejadian", {keputusan: [{sumber: "dibi", kode: "z1", aksi: "tambah", kejadian_id: id, jenis: "banjir", mulai: "2026-03-03", diambil: 1_780_000_000_000, dampak: {}}]}, TOK);
  assert.equal(t.s, 400, "INV-5"); assert.match(t.t, /dummy/);
});
uji("hapus: anak sebelum induk dalam satu batch, semua tabel kosong dari dummy, baris nyata utuh, jejak hapus bertahan", async () => {
  await reset();
  const nyata = await U.kej(SA, {nama: "Banjir nyata", mulai: "2026-03-05"});
  const sebelum = await n("sk_kejadian", "dummy = 0");
  assert.equal((await POST(PD, "/dummy", {aksi: "hapus"})).s, 403);
  const r = await POST(SA, "/dummy", {aksi: "hapus"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.per_tabel.sk_kejadian, 7); assert.ok(r.j.per_tabel.sk_kejadian_sumber >= 4);
  assert.equal(await dummyN(), 0);
  assert.equal(await n("sk_kejadian", "dummy = 0"), sebelum); assert.ok(await n("sk_kejadian", `id = '${nyata}'`));
  assert.equal(await n("sk_jejak", "aksi = 'hapus_dummy' AND dummy = 0"), 1);
  assert.equal((await POST(SA, "/dummy", {aksi: "hapus"})).j.dihapus, 0, "hapus kosong = 0, bukan galat");
  assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-03"})).s, 200, "isi ulang sesudah hapus");
  await POST(SA, "/dummy", {aksi: "hapus"});
});
uji("SK-041 paparan tanpa tabel: isi memeriksa berkas _dummy/ ada (404 bila belum), tidak menyemai D1; hapus tetap jalan", async () => {
  await reset();
  const sebelum = await dummyN();
  const a = await POST(SA, "/dummy", {aksi: "isi", halaman: "paparan"}); assert.equal(a.s, 404);
  await R2.put("siklus/saji/_dummy/paparan/3201.json", JSON.stringify({dummy: true}));
  const b = await POST(SA, "/dummy", {aksi: "isi", halaman: "paparan"}); assert.equal(b.s, 200); assert.deepEqual(b.j, {dibuat: 0, dihapus: 0, per_tabel: {}, contoh: true});
  assert.equal(await dummyN(), sebelum);
  assert.equal((await POST(SA, "/dummy", {aksi: "hapus", halaman: "paparan"})).j.contoh, false);
  assert.equal((await POST(PD, "/dummy", {aksi: "isi", halaman: "paparan"})).s, 403);
});
uji("SK-059: isi kaji G2: 5 status pada kejadian gempa dummy, rentang dari PAGER yang sama; staf nyata dan BP tidak melihat; hapus membuangnya; kaji dummy tidak ikut ingest", async () => {
  await reset();
  const r = await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-04", kab4: "3201"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.per_tabel.sk_kaji, 5);
  const kaji = (await DB.prepare("SELECT id, kejadian_id, status, versi, yakin, ringkas, hasil_r2, alasan_tarik FROM sk_kaji WHERE dummy = 1 ORDER BY versi").all()).results;
  assert.deepEqual(kaji.map(k => k.status), ["menunggu_data", "dihitung", "diperiksa", "dipakai", "ditarik"]); assert.deepEqual(kaji.map(k => k.versi), [1, 2, 3, 4, 5]);
  assert.ok(kaji.every(k => k.yakin === "estimasi-model" && k.hasil_r2 === null), "dummy tanpa R2, label terkunci");
  assert.deepEqual(JSON.parse(kaji[1].ringkas).rentang, [22.1, 353.8], "PAGER pada MMI contoh = RU UJ-F3-02"); assert.equal(JSON.parse(kaji[0].ringkas).rentang, null);
  const kj = await DB.prepare("SELECT id, jenis, dummy FROM sk_kejadian WHERE id = ?").bind(kaji[0].kejadian_id).first(); assert.deepEqual([kj.jenis, kj.dummy], ["gempa", 1], "terhubung ke kejadian dummy");
  assert.equal((await GET(SA, `/kaji?kejadian_id=${kj.id}`)).j.baris.length, 5);
  assert.equal((await GET(SA, `/kejadian/${kj.id}`)).j.kaji_ids.length, 5);
  for (const a of [PD, BP]) { assert.equal((await GET(a, `/kaji?kejadian_id=${kj.id}`)).s, 404); assert.equal((await GET(a, `/kaji/${kaji[1].id}`)).s, 404); }
  const t = await api("POST", "/api/siklus/ingest/kaji", {kejadian_id: kj.id, model: "gempa", masukan: {a: 1}, ringkas: {rentang: [1, 2]}}, TOK); assert.equal(t.s, 404, "ingest tidak mengacu kejadian dummy");
  const h = await POST(SA, "/dummy", {aksi: "hapus"}); assert.equal(h.s, 200); assert.equal(h.j.per_tabel.sk_kaji, 5); assert.equal(await n("sk_kaji"), 0);
});
uji("SK-079: isi G3: Jitupasna 5 status, R3P 6, kegiatan 4, harga dummy; hitung dari mesin produksi; rantai kejadian, kaji, Jitupasna, R3P tertaut; nyata tidak melihat; hapus membuang semuanya", async () => {
  await reset();
  const r = await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-05", kab4: "3201"}); assert.equal(r.s, 200, r.t);
  assert.deepEqual([r.j.per_tabel.sk_harga, r.j.per_tabel.sk_jitupasna, r.j.per_tabel.sk_r3p, r.j.per_tabel.sk_r3p_kegiatan], [5, 5, 6, 4]);
  const jp = (await DB.prepare("SELECT id, kejadian_id, kaji_id, status, versi, induk_id, hitung, dummy FROM sk_jitupasna ORDER BY versi").all()).results;
  assert.deepEqual(jp.map(x => x.status), ["dibuka", "pengumpulan", "dihitung", "ditinjau", "final"]); assert.ok(jp.every(x => x.dummy === 1 && x.kejadian_id === jp[0].kejadian_id));
  assert.deepEqual(jp.map(x => x.induk_id), [null, ...jp.slice(0, 4).map(x => x.id)], "versi tertaut berantai");
  const kaji = await DB.prepare("SELECT id, kejadian_id, status FROM sk_kaji WHERE dummy = 1 AND status = 'dipakai'").first(); assert.equal(kaji.kejadian_id, jp[0].kejadian_id, "Jitupasna pada kejadian yang sama dengan kaji"); assert.equal(jp[2].kaji_id, kaji.id, "kaji tertaut");
  assert.equal((await DB.prepare("SELECT fase FROM sk_kejadian WHERE id = ?").bind(jp[0].kejadian_id).first()).fase, "transisi");
  const h = JSON.parse(jp[4].hitung); assert.equal(h.yakin, "asumsi-kebijakan"); assert.equal(h.kerusakan.per.perumahan.nilai, 2600e6, "RB 10 x 100 jt + RS 20 x 50 jt + RR 30 x 20 jt"); assert.equal(h.kerusakan.per.pendidikan.nilai, 300e6); assert.equal(h.stimulan.nilai, 1650e6);
  assert.equal(h.peta.permukiman + h.peta.sosial, h.peta.total, "lima sektor (V_s saja) menutup total peta"); assert.equal(h.peta.belum_terpeta, null, "tanpa angka = null"); assert.equal(h.ragu, false);
  const b = (await DB.prepare("SELECT harga_id, nilai_rp, jenis FROM sk_jitupasna_baris WHERE jitupasna_id = ? ORDER BY id").bind(jp[4].id).all()).results; assert.ok(b.every(x => x.nilai_rp != null)); assert.ok(b.filter(x => x.jenis === "rusak").every(x => x.harga_id));
  assert.equal(await n("sk_jitupasna_baris", `jitupasna_id = '${jp[0].id}'`), 0, "dibuka belum berbaris"); assert.equal(await n("sk_jitupasna_baris", `jitupasna_id = '${jp[1].id}' AND nilai_rp IS NOT NULL`), 0, "pengumpulan belum dihitung");
  const r3p = (await DB.prepare("SELECT id, jitupasna_id, kejadian_id, status, versi, disetujui_oleh, no_keputusan, total_rp FROM sk_r3p ORDER BY versi").all()).results;
  assert.deepEqual(r3p.map(x => x.status), ["draf", "diusulkan", "disetujui_pm", "ditetapkan_resmi", "berjalan", "selesai"]); assert.ok(r3p.every(x => x.jitupasna_id === jp[4].id && x.kejadian_id === jp[0].kejadian_id));
  assert.deepEqual(r3p.map(x => !!x.disetujui_oleh), [false, false, true, true, true, true]); assert.equal(r3p[3].no_keputusan, "Contoh SK/1/2026"); assert.equal(r3p[4].total_rp, 1150e6, "total dari 4 kegiatan");
  const keg = (await DB.prepare("SELECT r3p_id, status FROM sk_r3p_kegiatan ORDER BY status").all()).results; assert.deepEqual(keg.map(k => k.status), ["berjalan", "macet", "rencana", "selesai"]); assert.ok(keg.every(k => k.r3p_id === r3p[4].id));
  assert.equal(await n("sk_harga", "dummy = 1 AND yakin = 'asumsi-kebijakan'"), 5);
  const kej = jp[0].kejadian_id;
  assert.equal((await GET(SA, `/kejadian/${kej}`)).j.pulih_ids.length, 5);
  for (const a of [PD, KO, BP]) { assert.equal((await GET(a, `/pulih?kejadian_id=${kej}`)).s, 404); assert.equal((await GET(a, `/pulih/${jp[4].id}`)).s, 404); assert.equal((await GET(a, `/r3p/${r3p[0].id}`)).s, 404); }
  assert.equal((await GET(SA, `/pulih/${jp[4].id}`)).s, 200); assert.equal((await GET(SA, `/r3p/${r3p[4].id}`)).j.kegiatan.length, 4);
  assert.equal((await GET(KO, "/harga?sektor=perumahan&tahun=2026")).j.baris.length, 0, "harga dummy tidak terlihat staf nyata"); assert.equal((await GET(SA, "/harga?sektor=perumahan&tahun=2026")).j.baris.length, 4);
  const h2 = await POST(SA, "/dummy", {aksi: "hapus"}); assert.equal(h2.s, 200, h2.t);
  for (const t of ["sk_harga", "sk_jitupasna", "sk_jitupasna_baris", "sk_r3p", "sk_r3p_kegiatan"]) assert.equal(await n(t), 0, t);
  assert.equal(h2.j.per_tabel.sk_r3p, 6); assert.equal(h2.j.per_tabel.sk_jitupasna_baris, 20);
});
uji("dummy dibatasi 6 per jam", async () => {
  await reset();
  let s; for (let i = 0; i < 8; i++) s = (await POST(SA, "/dummy", {aksi: "hapus"})).s;
  assert.equal(s, 429);
});
uji("periode objek: {dari, sampai} menentukan rentang; {kab4, prov, bahaya} diterima untuk paparan; periode salah 400", async () => {
  await reset();
  const r = await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: {dari: "2026-09-10", sampai: "2026-09-12"}, kab4: "3202"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.per_tabel.sk_kejadian, 7);
  const m = (await DB.prepare("SELECT min(mulai) a, max(mulai) b, min(kab4) k FROM sk_kejadian WHERE dummy = 1").first()); assert.deepEqual([m.a, m.b, m.k], ["2026-09-10", "2026-09-12", "3202"], "semua dalam rentang layar");
  assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: {dari: "2026-09-10", sampai: "2026-09-12"}, kab4: "3202"})).s, 409);
  await POST(SA, "/dummy", {aksi: "hapus"}); await reset();
  for (const periode of [{dari: "2026-09-12", sampai: "2026-09-10"}, {dari: "x"}, {kab4: "3201", prov: "abc"}]) assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode})).s, 400, JSON.stringify(periode));
  await R2.put("siklus/saji/_dummy/paparan/3201.json", "{}");
  const p = await POST(SA, "/dummy", {aksi: "isi", halaman: "paparan", periode: {kab4: "3201", prov: "32", bahaya: "banjir"}}); assert.equal(p.s, 200, p.t); assert.equal(p.j.contoh, true); assert.deepEqual(p.j.per_tabel, {});
});

/* ---------- G4 (SK-104): renkon 6 status plus satu kedaluwarsa, gladi 5 status x 3 jenis, pintu mengisi semua, masadepan mode contoh ---------- */
uji("SK-104 halaman renkon: butuh kejadian contoh yang sudah ada (409 tanpa itu); lalu 7 renkon (6 status plus satu kedaluwarsa) dan 15 gladi (5 status x 3 jenis), tertaut ke dummy; 409 bila sudah ada", async () => {
  await reset(); await POST(SA, "/dummy", {aksi: "hapus"}); await reset();
  const tanpa = await POST(SA, "/dummy", {aksi: "isi", halaman: "renkon"}); assert.equal(tanpa.s, 409); assert.match(tanpa.t, /kejadian contoh/); assert.equal(await n("sk_renkon"), 0);
  assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-04", kab4: "3201"})).s, 200);
  const r = await POST(SA, "/dummy", {aksi: "isi", halaman: "renkon"}); assert.equal(r.s, 200, r.t); assert.deepEqual([r.j.per_tabel.sk_renkon, r.j.per_tabel.sk_gladi], [7, 15]);
  const st = (await DB.prepare("SELECT status, count(*) c FROM sk_renkon WHERE dummy = 1 GROUP BY status").all()).results; assert.deepEqual(Object.fromEntries(st.map(x => [x.status, x.c])), {persiapan: 1, pelaksanaan: 1, finalisasi: 1, ditetapkan: 1, berlaku: 2, dimutakhirkan: 1});
  const kd = (await GET(SA, "/renkon?prov=32&kab4=3201")).j.baris; assert.equal(kd.length, 7); assert.equal(kd.filter(x => x.kedaluwarsa).length, 1, "satu renkon berstatus berlaku sudah kedaluwarsa (dihitung saat dibaca)");
  assert.equal(kd.find(x => x.kedaluwarsa).status, "berlaku", "kedaluwarsa bukan status tersimpan");
  const g = (await DB.prepare("SELECT jenis, status, count(*) c FROM sk_gladi WHERE dummy = 1 GROUP BY jenis, status").all()).results; assert.equal(g.length, 15); assert.ok(g.every(x => x.c === 1));
  assert.equal(await n("sk_gladi", "dummy = 1 AND status = 'selesai' AND rekomendasi IS NOT NULL"), 3);
  const sk = JSON.parse((await DB.prepare("SELECT skenario FROM sk_gladi WHERE dummy = 1 LIMIT 1").first()).skenario); assert.equal(sk.label, "Model sederhana, bukan prakiraan"); assert.equal(sk.langkah.length, 2);
  for (const a of [PD, KO, BP]) { assert.equal((await GET(a, "/renkon?prov=32&kab4=3201")).j.baris.length, 0, "staf nyata dan BP tidak melihat renkon contoh"); }
  const rid = kd[0].id; assert.equal((await GET(KO, `/renkon/${rid}`)).s, 404); assert.equal((await GET(SA, `/renkon/${rid}`)).s, 200);
  const lagi = await POST(SA, "/dummy", {aksi: "isi", halaman: "renkon"}); assert.equal(lagi.s, 409); assert.match(lagi.t, /sudah ada 7/); assert.equal(await n("sk_renkon", "dummy = 1"), 7, "409 tidak menulis");
  await reset(); const h = await POST(SA, "/dummy", {aksi: "hapus"}); assert.equal(h.s, 200); assert.deepEqual([h.j.per_tabel.sk_gladi, h.j.per_tabel.sk_renkon], [15, 7]);
  assert.equal(await dummyN(), 0, "hapus mengosongkan semua tabel termasuk G4");
});
uji("SK-104 halaman pintu: kejadian, kaji, Jitupasna, R3P, renkon, gladi sekaligus dalam satu batch; hapus mengosongkan; sk_gladi tidak menggantung ke kejadian yang dihapus", async () => {
  await reset(); await POST(SA, "/dummy", {aksi: "hapus"}); await reset();
  const r = await POST(SA, "/dummy", {aksi: "isi", halaman: "pintu", periode: "2026-05", kab4: "3201"}); assert.equal(r.s, 200, r.t);
  assert.deepEqual([r.j.per_tabel.sk_kejadian, r.j.per_tabel.sk_renkon, r.j.per_tabel.sk_gladi, r.j.per_tabel.sk_r3p], [7, 7, 15, 6]);
  const jj = await DB.prepare("SELECT count(*) c FROM sk_gladi g JOIN sk_kejadian k ON k.id = g.kejadian_id AND k.dummy = 1 JOIN sk_renkon r ON r.id = g.renkon_id AND r.dummy = 1 WHERE g.dummy = 1").first(); assert.equal(jj.c, 15, "tertaut ke kejadian dan renkon contoh");
  assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "pintu", periode: "2026-05", kab4: "3201"})).s, 409);
  assert.equal(await n("sk_jejak", "aksi = 'isi_dummy' AND dummy = 0"), 0, "jejak isi ikut dummy");
  await reset(); const h = await POST(SA, "/dummy", {aksi: "hapus"}); assert.equal(h.s, 200, h.t); assert.equal(await dummyN(), 0);
});
uji("SK-104 halaman masadepan: tanpa tabel; memeriksa berkas contoh di R2 (404 bila belum), tidak menulis D1; dummy tidak ikut angka publik (ringkasan, pintu tamu)", async () => {
  await reset(); const m0 = await POST(SA, "/dummy", {aksi: "isi", halaman: "masadepan"}); assert.equal(m0.s, 404); assert.match(m0.t, /dummy_saji\.py/);
  await R2.put("siklus/saji/_dummy/masadepan/99.json", JSON.stringify({dummy: true}));
  const m = await POST(SA, "/dummy", {aksi: "isi", halaman: "masadepan"}); assert.equal(m.s, 200, m.t); assert.deepEqual([m.j.contoh, m.j.per_tabel], [true, {}]); assert.equal(await dummyN(), 0, "tidak menulis D1");
  await reset(); assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-06", kab4: "3201"})).s, 200);
  await DB.prepare("UPDATE sk_kejadian SET publik = 1, ringkasan_publik = 'Ringkasan contoh yang cukup panjang.' WHERE dummy = 1 AND fase = 'tanggap'").run();
  const w = await GET(TAMU, "/pintu"); assert.equal(w.s, 200); assert.ok(!w.j.kartu.some(k => k.kode === "kejadian_publik"), "kejadian contoh tidak jadi kartu publik");
  const mc = await api("POST", "/mcp", {jsonrpc: "2.0", id: 1, method: "tools/call", params: {name: "kejadian_resmi", arguments: {}}}, {"cf-connecting-ip": "198.51.100.7"});
  assert.equal(JSON.parse(mc.j.result.content[0].text).jumlah, 0, "alat MCP tidak memuat dummy");
  await reset(); await POST(SA, "/dummy", {aksi: "hapus"});
});
