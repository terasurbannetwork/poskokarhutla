/* 3W dan tawaran TW-04..TW-07 (data/kajian-bnpb/tiga-w/RENCANA-UJI.md T1, T5, T6, T7, T8, T9, T12, T13): rute /api/siklus/kejadian/:id/tiga-w, tawaran, token, org, /api/bantu
   dan halaman /bantu di worker.js utuh (Miniflare + D1 sungguhan). Jalankan: node --test tests/warga/tiga_w_rute.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, PB} from "./_siklus.mjs";

const U = await mulai("uji-tiga-w-rute");
const {DB, api, GET, POST, n, kej} = U;
const [PD, KO, PM] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"]), await U.staf("Pm Uji", ["pimpinan"])];
const BP = await U.bp(), {SA, TAMU} = U;
const KJ = await kej(SA, {kab4: "3201"});
await DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, '3202', '2026-03-02', 1), (?, '1109', '2026-03-02', 1)").bind(KJ, KJ).run();
const bantu = (metode, j, token, body) => api(metode, "/api/bantu" + j, body, {...(metode === "POST" ? PB : {}), ...(token ? {"x-bantu": token} : {}), "cf-connecting-ip": "198.51.100." + (1 + Math.floor(Math.random() * 200))});
const org = async (nama, jenis = "ngo_nasional", ekstra = {}) => { const r = await POST(PD, "/org", {nama, jenis, ...ekstra}); assert.equal(r.s, 201, r.t); return r.j.id; };
const token = async (orgId, kj = KJ) => { const r = await POST(KO, `/kejadian/${kj}/tiga-w/token`, {org_id: orgId}); assert.equal(r.s, 201, r.t); return r.j.token; };

uji("T1 register organisasi: internasional tanpa negara 400, nomor telepon di nama 400, pencarian, BPBD dan pimpinan tidak membuat", async () => {
  assert.equal((await POST(PD, "/org", {nama: "Lembaga Asing", jenis: "ngo_internasional"})).s, 400);
  assert.equal((await POST(PD, "/org", {nama: "Lembaga Asing", jenis: "ngo_internasional", negara: "NLD"})).s, 400);
  assert.equal((await POST(PD, "/org", {nama: "Yayasan 081234567890", jenis: "ngo_nasional"})).s, 400);
  assert.equal((await POST(PD, "/org", {nama: "Yayasan Aneh", jenis: "aneh"})).s, 400);
  const id = await org("Save Asing", "ngo_internasional", {negara: "nl"});
  assert.equal((await DB.prepare("SELECT negara FROM org WHERE id = ?").bind(id).first()).negara, "NL");
  assert.equal((await GET(PM, "/org?q=save")).j.org.length, 1);
  assert.equal((await POST(PM, "/org", {nama: "X Y", jenis: "kl"})).s, 403);
  assert.equal((await POST(BP, "/org", {nama: "X Y", jenis: "kl"})).s, 403);
  assert.equal((await GET(BP, "/org")).s, 403);
});

uji("3W staf: tulis baris, kab di luar kejadian 400, klaster asing 400, nomor di kegiatan 400, pimpinan baca saja, celah dan tumpang tampil", async () => {
  const o = await org("PMI Uji", "pmi");
  const baris = {org_id: o, kab4: "3201", klaster: "kesehatan", kegiatan: "Posko kesehatan keliling", status: "berjalan"};
  const r = await POST(PD, `/kejadian/${KJ}/tiga-w`, baris); assert.equal(r.s, 201, r.t);
  assert.equal((await POST(PD, `/kejadian/${KJ}/tiga-w`, {...baris, kab4: "3204"})).s, 400);
  assert.equal((await POST(PD, `/kejadian/${KJ}/tiga-w`, {...baris, klaster: "intelijen"})).s, 400);
  assert.equal((await POST(PD, `/kejadian/${KJ}/tiga-w`, {...baris, kegiatan: "Hubungi 081234567890 segera"})).s, 400);
  assert.equal((await POST(PM, `/kejadian/${KJ}/tiga-w`, baris)).s, 403);
  const g = await GET(PM, `/kejadian/${KJ}/tiga-w`); assert.equal(g.s, 200);
  assert.equal(g.j.baris.length, 1); assert.equal(g.j.celah_tumpang.length, 3);
  assert.ok(!g.j.celah_tumpang.find(x => x.kab4 === "3201").celah.includes("kesehatan"));
  const u = await POST(PD, `/kejadian/${KJ}/tiga-w`, {id: r.j.id, kegiatan: "Posko kesehatan selesai", status: "selesai"}); assert.equal(u.s, 200, u.t);
  assert.equal((await DB.prepare("SELECT status FROM tw_baris WHERE id = ?").bind(r.j.id).first()).status, "selesai");
});

uji("T5 token: hanya sha disimpan; organisasi A tidak membaca/mengubah baris B; dicabut 401; kejadian ditutup 401", async () => {
  const [a, b] = [await org("Org A"), await org("Org B")];
  const [ta, tb] = [await token(a), await token(b)];
  const sha = await DB.prepare("SELECT token_sha FROM tw_token WHERE org_id = ? AND cabut IS NULL").bind(a).first();
  assert.match(sha.token_sha, /^[0-9a-f]{64}$/); assert.notEqual(sha.token_sha, ta);
  assert.equal(await n("tw_token", `token_sha = '${ta}'`), 0);
  const ra = await bantu("POST", "/baris", ta, {kab4: "3202", klaster: "logistik", kegiatan: "Distribusi logistik A", status: "berjalan"}); assert.equal(ra.s, 201, ra.t);
  assert.equal((await bantu("POST", "/baris", tb, {kab4: "3202", klaster: "sar", kegiatan: "Pencarian korban B", status: "berjalan"})).s, 201);
  const ga = await bantu("GET", "", ta); assert.equal(ga.s, 200); assert.equal(ga.j.baris.length, 1); assert.equal(ga.j.baris[0].org_id, a);
  assert.equal((await bantu("POST", "/baris", tb, {id: ra.j.id, kegiatan: "Rebut baris A", status: "selesai"})).s, 404, "baris organisasi lain");
  assert.equal((await bantu("POST", "/baris", ta, {id: ra.j.id, kegiatan: "Distribusi logistik A", status: "selesai"})).s, 200);
  assert.equal((await bantu("POST", "/baris", ta, {kab4: "3204", klaster: "logistik", kegiatan: "Di luar kejadian", status: "rencana"})).s, 400);
  assert.equal((await bantu("POST", "/baris", ta, {kab4: "3202", klaster: "logistik", kegiatan: "Telepon 081234567890", status: "rencana"})).s, 400);
  assert.equal((await POST(PD, `/kejadian/${KJ}/tiga-w/token/cabut`, {org_id: a})).s, 200);
  assert.equal((await bantu("GET", "", ta)).s, 401);
  const tb2 = await token(b); assert.equal((await bantu("GET", "", tb)).s, 401, "token baru mencabut yang lama"); assert.equal((await bantu("GET", "", tb2)).s, 200);
  const KJ2 = await kej(SA, {kab4: "3201", nama: "Banjir lain"}), t2 = await token(b, KJ2);
  assert.equal((await bantu("GET", "", t2)).s, 200);
  assert.equal((await POST(PD, `/kejadian/${KJ2}/fase`, {ke: "dibatalkan", alasan: "Salah deteksi sensor"})).s, 200);
  assert.equal((await bantu("GET", "", t2)).s, 401, "kejadian ditutup");
  assert.equal((await POST(PD, `/kejadian/${KJ2}/tiga-w/token`, {org_id: b})).s, 409);
  assert.equal((await POST(PM, `/kejadian/${KJ}/tiga-w/token`, {org_id: b})).s, 403);
});

uji("T6 tawaran: NGO internasional tanpa mitra lokal 400 (staf dan token); dengan mitra diterima; barang asing 400; nomor di syarat 400", async () => {
  const asing = await org("Aid Internasional", "ngo_internasional", {negara: "AU"}), mitra = await org("Yayasan Mitra Lokal");
  const t = {org_id: asing, barang: "tenda", jumlah: 100, satuan: "unit", syarat: "Dikirim sendiri"};
  assert.equal((await POST(PD, `/kejadian/${KJ}/tawaran`, t)).s, 400);
  assert.equal((await POST(PD, `/kejadian/${KJ}/tawaran`, {...t, barang: "emas"})).s, 400);
  assert.equal((await POST(PD, `/kejadian/${KJ}/tawaran`, {...t, mitra_lokal_org_id: mitra, syarat: "Telp 081234567890"})).s, 400);
  assert.equal((await POST(PD, `/kejadian/${KJ}/tawaran`, {...t, mitra_lokal_org_id: mitra, jumlah: 0})).s, 400);
  assert.equal((await POST(PD, `/kejadian/${KJ}/tawaran`, {...t, mitra_lokal_org_id: mitra})).s, 201);
  const ta = await token(asing);
  assert.equal((await bantu("POST", "/tawaran", ta, {barang: "terpal", jumlah: 5, satuan: "roll"})).s, 400);
  const tak = await bantu("POST", "/tawaran", ta, {barang: "terpal", jumlah: 5, satuan: "roll", mitra_lokal: "Tidak Terdaftar"});
  assert.equal(tak.s, 201, "jawaban sama bagi mitra terdaftar atau tidak (register tidak bocor)");
  assert.match((await DB.prepare("SELECT syarat FROM tw_tawaran WHERE id = ?").bind(tak.j.id).first()).syarat, /Tidak Terdaftar/);
  for (const j of [0, 1e8 + 1, 2.5, 1e12]) assert.equal((await bantu("POST", "/tawaran", ta, {barang: "terpal", jumlah: j, satuan: "roll", mitra_lokal: "Tidak Terdaftar"})).s, 400, "jumlah " + j);
  const ok = await bantu("POST", "/tawaran", ta, {barang: "terpal", jumlah: 5, satuan: "roll", mitra_lokal: "yayasan mitra lokal"}); assert.equal(ok.s, 201, ok.t);
  assert.equal((await DB.prepare("SELECT mitra_lokal_org_id m FROM tw_tawaran WHERE id = ?").bind(ok.j.id).first()).m, mitra);
});

uji("T8 pencocokan: tawaran tenda menampilkan meja logistik tenda diminta di kab kejadian, paling lama dulu; barang lain dan kab lain tidak muncul", async () => {
  const o = await org("Donor Tenda", "dunia_usaha");
  let mn = 0;
  const meja = (kab, barang, status, dibuat) => DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, oleh) VALUES (?, 'logistik', ?, ?, ?, ?, ?, ?, 'uji')")
    .bind("mj" + String(++mn).padStart(14, "0"), kab === "Aceh Singkil" ? "11" : "32", kab, JSON.stringify({barang, jumlah_diminta: 50, satuan: "unit", posko: "Posko " + kab}), status, dibuat, dibuat).run();
  const t0 = Date.parse("2026-03-10T00:00:00Z");
  await meja("Bogor", "tenda", "diminta", t0 + 2000); await meja("Sukabumi", "tenda", "disetujui", t0 + 1000); await meja("Bogor", "beras", "diminta", t0); await meja("Bandung", "tenda", "diminta", t0); await meja("Bogor", "tenda", "dikirim", t0 + 3000);
  const c = await POST(PD, `/kejadian/${KJ}/tawaran`, {org_id: o, barang: "tenda", jumlah: 20, satuan: "unit"}); assert.equal(c.s, 201, c.t);
  const g = await GET(PM, `/kejadian/${KJ}/tawaran?id=${c.j.id}`); assert.equal(g.s, 200, g.t);
  assert.deepEqual(g.j.kandidat.map(x => [x.kab4, x.dibuat - t0]), [["3202", 1000], ["3201", 2000]]);
  assert.equal((await GET(PM, `/kejadian/${KJ}/tawaran`)).j.tawaran.length >= 1, true);
  assert.equal((await GET(PM, `/kejadian/${KJ}/tawaran?id=bukan`)).s, 400);
});

uji("T7 + T12 keputusan: dialihkan/ditolak wajib alasan untuk organisasi, riwayat bertambah, organisasi tidak pernah menerima alasan_internal", async () => {
  const o = await org("Org Putus"), tk = await token(o);
  const c = await bantu("POST", "/tawaran", tk, {barang: "masker", jumlah: 1000, satuan: "box"}); assert.equal(c.s, 201, c.t);
  const K = `/kejadian/${KJ}/tawaran/${c.j.id}/keputusan`, riwayat = () => n("tw_tawaran_riwayat", `tawaran_id = '${c.j.id}'`);
  assert.equal(await riwayat(), 1);
  assert.equal((await POST(PD, K, {status: "ditolak", alasan_internal: "kualitas diragukan"})).s, 400);
  assert.equal((await POST(PD, K, {status: "dialihkan", alasan_organisasi: "abc"})).s, 400);
  assert.equal((await POST(PD, K, {status: "masuk"})).s, 400);
  assert.equal((await POST(PD, K, {status: "diterima", alasan_internal: "hubungi 081234567890"})).s, 400);
  assert.equal((await POST(PM, K, {status: "diterima"})).s, 403);
  assert.equal(await riwayat(), 1);
  assert.equal((await POST(KO, K, {status: "dicocokkan", kebutuhan: [{sumber: "meja", id: "m1"}]})).s, 200);
  assert.equal((await POST(KO, K, {status: "ditolak", alasan_internal: "RAHASIA-INTERNAL tidak sesuai standar", alasan_organisasi: "Maaf, tidak sesuai standar"})).s, 200);
  assert.equal(await riwayat(), 3);
  assert.equal((await POST(KO, K, {status: "diterima"})).s, 409, "sudah final");
  const g = await bantu("GET", "", tk); assert.equal(g.s, 200);
  assert.equal(g.j.tawaran[0].status, "ditolak"); assert.equal(g.j.tawaran[0].alasan_organisasi, "Maaf, tidak sesuai standar");
  assert.ok(!g.t.includes("RAHASIA-INTERNAL") && !g.t.includes("alasan_internal") && !g.t.includes("kebutuhan"));
  const s = await GET(PM, `/kejadian/${KJ}/tawaran?id=${c.j.id}`); assert.match(s.t, /RAHASIA-INTERNAL/, "staf melihatnya");
});

uji("T9 tidak publik: tamu 401 di semua rute 3W/tawaran/org; BPBD tidak membaca tawaran", async () => {
  for (const j of [`/kejadian/${KJ}/tiga-w`, `/kejadian/${KJ}/tawaran`, "/org"]) { assert.equal((await GET(TAMU, j)).s, 401, j); }
  assert.equal((await POST(TAMU, `/kejadian/${KJ}/tiga-w/token`, {org_id: "0123456789abcdef"})).s, 401);
  assert.equal((await GET(BP, `/kejadian/${KJ}/tawaran`)).s, 403);
  assert.equal((await POST(BP, `/kejadian/${KJ}/tiga-w`, {})).s, 403);
  assert.equal((await api("GET", `/api/siklus/publik/kejadian/${KJ}`)).t.includes("tw_"), false);
});

uji("T13 /bantu terbuka tanpa sesi, /api/bantu tanpa token sah 401, BPBD hanya kab lingkupnya", async () => {
  const r = await U.mf.dispatchFetch("https://centurisk97.id/bantu"); assert.equal(r.status, 200); assert.match(r.headers.get("content-security-policy"), /script-src 'self'/); await r.text();
  assert.equal((await bantu("GET", "")).s, 401); assert.equal((await bantu("GET", "", "x".repeat(43))).s, 401); assert.equal((await bantu("POST", "/baris", "x".repeat(43), {})).s, 401);
  const g = await GET(BP, `/kejadian/${KJ}/tiga-w`); assert.equal(g.s, 200, g.t);
  assert.deepEqual(g.j.celah_tumpang.map(x => x.kab4), ["3201"], "akun BPBD Kabupaten Bogor: hanya 3201, bukan 3202 atau 1109");
  assert.ok(g.j.baris.every(b => b.kab4 === "3201"));
  assert.equal(g.j.baris.some(b => "oleh" in b), false);
  const lain = await kej(SA, {kab4: "3201", nama: "Banjir tak berbaris"}); await DB.prepare("DELETE FROM sk_kejadian_kab WHERE kejadian_id = ? AND kab4 = '3201'").bind(lain).run();
  await DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, '1109', '2026-03-02', 1)").bind(lain).run();
  assert.equal((await GET(BP, `/kejadian/${lain}/tiga-w`)).s, 404, "tidak ada kab di lingkup = tidak ada");
});

uji("laju: tulis token dibatasi; tanpa migrasi 0143 jawaban 503 jelas", async () => {
  const o = await org("Org Laju"), tk = await token(o); let s = 0;
  for (let i = 0; i < 45; i++) s = (await bantu("POST", "/baris", tk, {kab4: "3202", klaster: "sar", kegiatan: "Kegiatan " + i + " uji", status: "rencana"})).s;
  assert.equal(s, 429);
  const M = await (await import("./_siklus.mjs")).mulai("uji-tiga-w-503");
  const ko = await M.staf("Ko", ["koordalops"]), kj = await M.kej(M.SA);
  for (const t of ["tw_baris", "tw_tawaran_riwayat", "tw_tawaran", "tw_token", "org"]) await M.DB.prepare(`DROP TABLE ${t}`).run();
  const r = await M.GET(ko, `/kejadian/${kj}/tiga-w`); assert.equal(r.s, 503); assert.match(r.t, /0143/);
  const b = await M.api("GET", "/api/bantu", undefined, {"x-bantu": "x".repeat(43)}); assert.equal(b.s, 503); assert.doesNotMatch(b.t, /0143/, "503 publik tanpa nomor migrasi");
});
