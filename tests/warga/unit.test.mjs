/* Ruang Unit BNPB rute baca (RU-019; kedeputian DESAIN-TEKNIS §1.4, §4.9, §9.4; RENCANA-UJI §7.2, §7.4 S1-S8; KEAMANAN-PRIVASI §2.3).
   Worker utuh di workerd + D1 + R2 sungguhan, migrasi apa adanya (TEST.md: tanpa mock). Host centurisk97.id (gerbang host berlaku) dan pembanding bnpb.lokal.
   Uji kuota dan basi memanggil penangan RUTE_UNIT di Node atas D1/R2 Miniflare yang sama, D1 dibungkus penghitung meta.rows_read.
   Jalankan: node --test tests/warga/unit.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {RUTE_UNIT, MEDAN_KOREKSI, P_UNIT_BACA, P_UNIT_TULIS, KODE_UNIT, DATA_UNIT, DATA_UNIT_TERBATAS} from "../../src/unit.js";
import {stafOK} from "../../src/staf.js";
import {halamanTerkunci} from "../../src/gerbang_halaman.js";
import {HALAMAN} from "../../src/peta_situs.js";

const JAM = 3600e3, PB = {"x-pb": "1"}, uji = berantai(), PROD = "https://centurisk97.id", LOKAL = "http://bnpb.lokal";
/* cangkang RU-020 belum ada: aset /bnpb/unit/*.html diganti penanda; aset lain dari public/ apa adanya */
const STUB = {"/bnpb/unit/index.html": "<!doctype html><p>pintu-unit</p>", "/bnpb/unit/unit.html": "<!doctype html><p>halaman-unit</p>"};
const asetKu = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname); if (STUB[p]) return new Response(STUB[p]);
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const BIND = {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin, moderator-dua", AKUN_SITUS: "gerbang@x:sandi", AKUN_SITUS_DUMMY: "dirga@x:sandi-dummy", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), SESI_KUNCI: "kunci-sesi-uji"};
const U = await siapkan("uji-unit", {r2: true, asetKu}), {mf, DB, api} = U;
const R2 = await mf.getR2Bucket("MEDIA");
const buka = async (host, j, h = {}, metode = "GET") => { const r = await mf.dispatchFetch(host + j, {method: metode, headers: h, redirect: "manual"}); const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {} return {s: r.status, h: r.headers, t, j: x}; };

let ip = 0;
const bikin = async peran => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1982${++ip}0012005`, unit: "Dit. PLP BNPB", email: `un${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB, origin: LOKAL})).s, 200);
  return {cookie};
};
async function pemirsa(tab) {
  const id = "7a01" + "e".repeat(12), tok = sha256("pm-" + id);
  await DB.batch([DB.prepare("INSERT INTO pemirsa (id, username, nama, tab, garam, sandi_sha, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, "lihatunit", "Pemirsa Unit", JSON.stringify(tab), "g".repeat(32), "0".repeat(64), 1),
    DB.prepare("INSERT INTO pemirsa_sesi (token_sha, pemirsa_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 5 * JAM)]);
  return {cookie: "sesi_pemirsa=" + tok};
}
const unit = await bikin(["unit"]), pim = await bikin(["pimpinan"]), occ = await bikin(["operator_cc"]), ver = await bikin(["verifikator"]), pm = await pemirsa(["peta"]);
const STOK = {dibuat: new Date().toISOString(), sumber: ["uji"], label: "uji", basi_jam: 1080, kartu: [], data: {n_kab: 514}};
await R2.put("unit/stok_penyangga.json", JSON.stringify(STOK));
await R2.put("unit/pengadaan.json", JSON.stringify({dibuat: STOK.dibuat, data: {kelas: "T"}}));
await R2.put("unit/rahasia.json", JSON.stringify({bocor: true}));   // ada di R2 tetapi bukan DATA_UNIT
await R2.put("unit/satu_data.json", "");   // 0 byte = unggahan gagal

/* ---------------------------------------------------------------- konstanta */
uji("konstanta persis DT §1.4 dan §4.9; kelas T bagian dari DATA_UNIT; peta situs memakai P_UNIT_BACA", () => {
  assert.deepEqual(P_UNIT_BACA, ["unit", "pimpinan", "koordalops", "pusdalops", "operator_cc"]);
  assert.deepEqual(P_UNIT_TULIS, ["unit", "pimpinan", "koordalops", "pusdalops"]);
  assert.equal(KODE_UNIT.length, 22); assert.equal(new Set(KODE_UNIT).size, 22);
  for (const n of ["stok_penyangga", "pendampingan_ikd", "mitigasi_prioritas", "satu_data", "jdih_daerah"]) assert.ok(DATA_UNIT.includes(n), n);
  assert.ok(DATA_UNIT_TERBATAS.every(n => DATA_UNIT.includes(n)) && DATA_UNIT_TERBATAS.includes("pengadaan"));
  assert.ok(DATA_UNIT.every(n => /^[a-z0-9_]{1,40}$/.test(n)), "nama cocok regex router");
  assert.deepEqual(HALAMAN.find(e => e.rute === "/bnpb/unit")?.peran, P_UNIT_BACA, "menu staf = hak rute (satu daftar)");
  assert.deepEqual(Object.keys(RUTE_UNIT).filter(k => !k.startsWith("GET ")), ["POST /api/unit/ketuk"], "satu-satunya rute tulis sejauh ini: MB-7 (RU-033)");
  assert.equal(halamanTerkunci(new URL(PROD + "/bnpb/unit")), false, "gerbang host tidak memantulkan /bnpb/unit: rute menjaga dirinya sendiri");
  assert.equal(halamanTerkunci(new URL(PROD + "/bnpb/unit/plp")), false);
});

/* ---------------------------------------------------------------- S1, S2 tamu */
for (const host of [PROD, LOKAL]) uji(`S1 tamu ${host}: /bnpb/unit dan /bnpb/unit/plp 303 ke /admin/masuk?ke=; kode liar juga 303 (tamu tidak tahu kode sah)`, async () => {
  for (const j of ["/bnpb/unit", "/bnpb/unit/plp", "/bnpb/unit/zz"]) {
    const r = await buka(host, j);
    assert.equal(r.s, 303, `${j}: ${r.s} ${r.t}`);
    assert.equal(r.h.get("location"), "/admin/masuk?ke=" + encodeURIComponent(j));
    assert.doesNotMatch(r.t, /unit/);
  }
});
uji("S2 tamu: berkas .html dibuka langsung tidak pernah 200", async () => {
  for (const host of [PROD, LOKAL]) for (const j of ["/bnpb/unit/plp.html", "/bnpb/unit/index.html", "/bnpb/unit/unit.html"]) {
    const r = await buka(host, j); assert.ok(r.s === 404 || r.s === 301, `${host}${j}: ${r.s}`); assert.doesNotMatch(r.t, /pintu-unit|halaman-unit/);
  }
});

/* ---------------------------------------------------------------- S3 data tamu */
uji("S3 tamu: data dan indeks 401 tanpa isi; nama di luar DATA_UNIT juga 401", async () => {
  for (const host of [PROD, LOKAL]) for (const j of ["/api/unit/data/stok_penyangga", "/api/unit/data/pengadaan", "/api/unit/data/rahasia", "/api/unit/data/takada", "/api/unit/indeks"]) {
    const r = await buka(host, j); assert.equal(r.s, 401, `${host}${j}: ${r.s}`); assert.doesNotMatch(r.t, /514|bocor|kelas/);
  }
});

/* ---------------------------------------------------------------- S4 staf berperan */
uji("S4 staf unit, pimpinan, operator_cc di centurisk97.id: halaman 200, data sama dengan objek R2, kelas T juga", async () => {
  for (const s of [unit, pim, occ]) {
    const p = await buka(PROD, "/bnpb/unit", s); assert.equal(p.s, 200, p.t); assert.match(p.t, /pintu-unit/);
    assert.equal(p.h.get("cache-control"), "private, no-store"); assert.match(p.h.get("vary") || "", /cookie/i); assert.equal(p.h.get("x-robots-tag"), "noindex, nofollow");
    const k = await buka(PROD, "/bnpb/unit/plp", s); assert.equal(k.s, 200, k.t); assert.match(k.t, /halaman-unit/);
    const d = await buka(PROD, "/api/unit/data/stok_penyangga", s); assert.equal(d.s, 200, d.t); assert.deepEqual(d.j, STOK);
    assert.equal(d.h.get("cache-control"), "private, max-age=300"); assert.match(d.h.get("vary"), /cookie/); assert.equal(d.h.get("x-content-type-options"), "nosniff");
    assert.equal((await buka(PROD, "/api/unit/data/pengadaan", s)).s, 200, "sesi staf berperan lolos modAtauStaf");
  }
  for (const k of KODE_UNIT) assert.equal((await buka(PROD, "/bnpb/unit/" + k, unit)).s, 200, k);
});
uji("staf: kode di luar 22 kode 404; nama di luar DATA_UNIT 404 tanpa isi R2; 0 byte 404 belum_ada", async () => {
  for (const k of ["zz", "abcd", "plpx"]) assert.equal((await buka(PROD, "/bnpb/unit/" + k, unit)).s, 404, k);
  const r = await buka(PROD, "/api/unit/data/rahasia", unit); assert.equal(r.s, 404); assert.equal(r.j.status, "tidak_dikenal"); assert.doesNotMatch(r.t, /bocor/);
  assert.equal((await buka(PROD, "/api/unit/data/indeks", unit)).s, 404, "indeks hanya lewat /api/unit/indeks");
  const b = await buka(PROD, "/api/unit/data/satu_data", unit); assert.equal(b.s, 404); assert.equal(b.j.status, "belum_ada");
  const c = await buka(PROD, "/api/unit/data/jdih_daerah", unit); assert.equal(c.s, 404); assert.equal(c.j.status, "belum_ada");
  assert.equal((await buka(PROD, "/api/unit/data/..%2Frahasia", unit)).s === 200, false);
});
uji("staf tanpa peran Ruang Unit: halaman 403 polos tanpa pengalihan (cegah pantulan), data 401", async () => {
  const r = await buka(PROD, "/bnpb/unit/plp", ver); assert.equal(r.s, 403); assert.equal(r.h.get("location"), null); assert.match(r.t, /tidak punya akses Ruang Unit/);
  assert.equal((await buka(PROD, "/api/unit/data/stok_penyangga", ver)).s, 401);
});

/* ---------------------------------------------------------------- S5 pemirsa */
uji("S5 pemirsa tanpa tab unit: dialihkan ke tab pertamanya, bukan ke /admin/masuk", async () => {
  const r = await buka(PROD, "/bnpb/unit", pm); assert.equal(r.s, 303); assert.equal(r.h.get("location"), "/peta");
  assert.equal((await buka(PROD, "/api/unit/data/stok_penyangga", pm)).s, 401);
});

/* ---------------------------------------------------------------- S6, S7 metode */
uji("S6 staf: POST ke rute baca 405 dengan allow GET; S7 origin lain tidak pernah 2xx", async () => {
  for (const j of ["/bnpb/unit", "/bnpb/unit/plp", "/api/unit/indeks", "/api/unit/data/stok_penyangga"]) {
    const r = await buka(PROD, j, {...unit, ...PB, origin: PROD}, "POST"); assert.equal(r.s, 405, j); assert.equal(r.h.get("allow"), "GET");
    const x = await buka(PROD, j, {...unit, ...PB, origin: "https://jahat.example"}, "POST"); assert.ok(x.s >= 400, `${j} origin lain: ${x.s}`);
  }
});

/* ---------------------------------------------------------------- S8 akun gerbang */
uji("S8 akun gerbang AKUN_SITUS: kelas T 401, kelas S 200 (KEAMANAN-PRIVASI §2.3)", async () => {
  for (const g of [GERBANG, {"x-admin-token": "dirga@x:sandi-dummy"}]) {
    const t = await buka(PROD, "/api/unit/data/pengadaan", g); assert.equal(t.s, 401, t.t); assert.doesNotMatch(t.t, /kelas/);
    const s = await buka(PROD, "/api/unit/data/stok_penyangga", g); assert.equal(s.s, 200); assert.deepEqual(s.j, STOK);
  }
  assert.equal((await buka(PROD, "/api/unit/data/pengadaan", ADMIN)).s, 200, "token admin (modOK) membaca kelas T");
});

/* ---------------------------------------------------------------- indeks dan basi */
uji("indeks: belum ada 404; ada = basi dari MEDIA.head().uploaded, x-diperbarui; nama di luar DATA_UNIT tidak di-head", async () => {
  const a = await buka(PROD, "/api/unit/indeks", unit); assert.equal(a.s, 404); assert.equal(a.j.status, "belum_ada");
  const IDX = {dibuat: new Date().toISOString(), berkas: [{nama: "stok_penyangga", sistem: "PLP-1", dibuat: STOK.dibuat, basi_jam: 1080, ok: true, galat: null},
    {nama: "pendampingan_ikd", sistem: "PERB-1", dibuat: STOK.dibuat, basi_jam: 1080, ok: true, galat: null}, {nama: "PUS-1", sistem: "PUS-1", dibuat: STOK.dibuat, basi_jam: 48, ok: false, galat: "jaringan"}]};
  await R2.put("unit/indeks.json", JSON.stringify(IDX));
  const r = await buka(PROD, "/api/unit/indeks", unit); assert.equal(r.s, 200, r.t);
  assert.ok(!Number.isNaN(Date.parse(r.h.get("x-diperbarui"))));
  const [s, p, g] = r.j.berkas;
  assert.equal(s.basi, false); assert.ok(Date.parse(s.diunggah) > Date.now() - JAM);
  assert.equal(p.basi, null, "berkas belum ada di R2: basi tidak diketahui"); assert.equal(p.diunggah, null);
  assert.deepEqual(g, IDX.berkas[2], "langkah gagal apa adanya");
  /* waktu maju 1.081 jam: berkas sama jadi basi (penangan dipanggil langsung dengan kini) */
  const env = {...BIND, DB, MEDIA: R2}, req = new Request(PROD + "/api/unit/indeks", {headers: unit});
  const nanti = await (await RUTE_UNIT["GET /api/unit/indeks"](env, req, new URL(req.url), Date.now() + 1081 * JAM)).json();
  assert.equal(nanti.berkas[0].basi, true);
  const kini = await (await RUTE_UNIT["GET /api/unit/indeks"](env, new Request(req), new URL(req.url), Date.now() + 1079 * JAM)).json();
  assert.equal(kini.berkas[0].basi, false);
});

/* ---------------------------------------------------------------- kuota D1 dan sentuhan R2 */
function hitungDB(db) {
  const c = {baca: 0, kueri: 0}, bungkus = st => ({
    bind: (...p) => bungkus(st.bind(...p)),
    all: async () => { const r = await st.all(); c.kueri++; c.baca += r.meta.rows_read; return r; },
    run: async () => { const r = await st.run(); c.kueri++; c.baca += r.meta.rows_read; return r; },
    first: async kol => { const r = await st.all(); c.kueri++; c.baca += r.meta.rows_read; const b = r.results[0] ?? null; return kol ? b?.[kol] ?? null : b; },
    raw: async () => { const r = await st.all(); c.kueri++; c.baca += r.meta.rows_read; return r.results.map(x => Object.values(x)); }, st});
  return {c, DB: {prepare: sql => bungkus(db.prepare(sql)), batch: async st => { const r = await db.batch(st.map(s => s.st)); for (const x of r) { c.kueri++; c.baca += x.meta.rows_read; } return r; }}};
}
function hitungR2(r2) { const c = {get: [], head: []}; return {c, MEDIA: {get: k => (c.get.push(k), r2.get(k)), head: k => (c.head.push(k), r2.head(k))}}; }
uji("RU §7.2: meta.rows_read rute data, indeks, dan halaman = hanya pemeriksaan hak (stafOK); nama di luar DATA_UNIT tidak menyentuh R2", async () => {
  const ukur = async (fn, kunci, ...arg) => { const d = hitungDB(DB), m = hitungR2(R2), env = {...BIND, DB: d.DB, MEDIA: m.MEDIA, ASSETS: {fetch: asetKu}}, req = new Request(PROD + kunci, {headers: unit});
    const r = await fn(env, req, new URL(req.url), Date.now(), undefined, ...arg); await r.arrayBuffer(); return {s: r.status, ...d.c, r2: m.c}; };
  const hak = async () => { const d = hitungDB(DB); assert.ok(await stafOK({...BIND, DB: d.DB}, new Request(PROD + "/", {headers: unit}), P_UNIT_BACA)); return d.c.baca; };
  const dasar = await hak(); assert.ok(dasar > 0, "stafOK membaca sesi");
  for (const [k, kunci, arg] of [["GET /api/unit/data/:nama", "/api/unit/data/stok_penyangga", "stok_penyangga"], ["GET /api/unit/indeks", "/api/unit/indeks"], ["GET /bnpb/unit/:kode", "/bnpb/unit/plp", "plp"], ["GET /bnpb/unit", "/bnpb/unit"]]) {
    const u = await ukur(RUTE_UNIT[k], kunci, arg); assert.equal(u.s, 200, k);
    assert.equal(u.baca, dasar, `${k}: ${u.baca} baris dibaca, pemeriksaan hak saja ${dasar}`);
  }
  const t = await ukur(RUTE_UNIT["GET /api/unit/data/:nama"], "/api/unit/data/rahasia", "rahasia"); assert.equal(t.s, 404); assert.deepEqual(t.r2, {get: [], head: []}, "nama di luar DATA_UNIT tidak menyentuh R2");
  const tamu = hitungR2(R2), rq = new Request(PROD + "/api/unit/data/stok_penyangga");
  assert.equal((await RUTE_UNIT["GET /api/unit/data/:nama"]({...BIND, DB, MEDIA: tamu.MEDIA}, rq, new URL(rq.url), Date.now(), undefined, "stok_penyangga")).status, 401);
  assert.deepEqual(tamu.c, {get: [], head: []}, "tamu: hak gagal sebelum R2");
});
uji("PRD K5: halaman unit memanggil catatHTML (waitUntil) untuk staf, tidak untuk tamu", async () => {
  const env = {...BIND, DB, MEDIA: R2, ASSETS: {fetch: asetKu}};
  for (const [h, n] of [[unit, 1], [{}, 0]]) {
    const tunggu = [], req = new Request(PROD + "/bnpb/unit/plp", {headers: h});
    const r = await RUTE_UNIT["GET /bnpb/unit/:kode"](env, req, new URL(req.url), Date.now(), {waitUntil: p => tunggu.push(p)}, "plp"); await r.arrayBuffer();
    await Promise.all(tunggu); assert.equal(tunggu.length, n, JSON.stringify(h));
  }
});

/* ---------------------------------------------------------------- MB-7 ketuk (RU-033; DT §4.9; KEAMANAN-PRIVASI §2.3) */
const ID1 = "9f2c0a1b3d4e5f60", ID2 = "0a1b2c3d4e5f6071";
const kirim = (h, o) => api("POST", "/api/unit/ketuk", o, {...h, ...PB, origin: LOKAL});
const baca = (h, q = "usulan_rpbd") => buka(PROD, "/api/unit/ketuk?berkas=" + q, h);
const nKetuk = async w => (await DB.prepare(`SELECT count(*) n FROM unit_ketuk WHERE ${w}`).first()).n;
uji("MB-7 hak: tamu 401; akun gerbang 401; staf tanpa peran 401; pemirsa dan operator_cc 403; tidak ada baris tersimpan", async () => {
  const o = {berkas: "usulan_rpbd", usulan_id: ID1, keputusan: "terima"};
  for (const [nama, h, s] of [["tamu", {}, 401], ["gerbang", GERBANG, 401], ["gerbang dummy", {"x-admin-token": "dirga@x:sandi-dummy"}, 401], ["verifikator", ver, 401], ["operator_cc", occ, 403], ["pemirsa", pm, 403]]) {
    const r = await kirim(h, o); assert.equal(r.s, s, `${nama}: ${r.s} ${r.t}`);
  }
  assert.equal(await nKetuk("1"), 0);
  assert.equal((await buka(PROD, "/api/unit/ketuk?berkas=usulan_rpbd")).s, 401, "GET tamu");
  assert.equal((await baca(GERBANG)).s, 200, "GET: akun gerbang sama dengan baca data kelas S");
  assert.equal((await baca(ver)).s, 401); assert.equal((await baca(occ)).s, 200, "operator_cc membaca");
});
uji("MB-7 tanpa x-pb ditolak; origin lain ditolak; tak satu pun tersimpan", async () => {
  const o = {berkas: "usulan_rpbd", usulan_id: ID1, keputusan: "terima"};
  const a = await api("POST", "/api/unit/ketuk", o, {...unit, origin: LOKAL}); assert.ok(a.s === 401 || a.s === 403, "x-pb: " + a.s);
  const b = await api("POST", "/api/unit/ketuk", o, {...unit, ...PB, origin: "https://jahat.example"}); assert.equal(b.s, 403);
  assert.equal(await nKetuk("1"), 0);
});
uji("MB-7 validasi: kunci liar, berkas liar, id, keputusan, koreksi, medan di luar daftar, catatan panjang semuanya 400", async () => {
  const dasar = {berkas: "usulan_rpbd", usulan_id: ID1, keputusan: "terima"}, salah = [
    {...dasar, oleh: "x"}, {...dasar, dummy: 1}, {...dasar, berkas: "rahasia"}, {...dasar, berkas: "usulan_x"}, {...dasar, berkas: "stok_penyangga"}, {...dasar, berkas: "../usulan_rpbd"},
    {...dasar, usulan_id: "XYZ"}, {...dasar, usulan_id: ID1.toUpperCase()}, {...dasar, keputusan: "hapus"}, {...dasar, keputusan: undefined},
    {...dasar, koreksi: {status: "berlaku"}},   // koreksi hanya untuk keputusan koreksi
    {...dasar, keputusan: "koreksi"}, {...dasar, keputusan: "koreksi", koreksi: {}}, {...dasar, keputusan: "koreksi", koreksi: []}, {...dasar, keputusan: "koreksi", koreksi: "status"},
    {...dasar, keputusan: "koreksi", koreksi: {status: "berlaku", nip: "1"}}, {...dasar, keputusan: "koreksi", koreksi: {status: 5}}, {...dasar, keputusan: "koreksi", koreksi: {status: ""}},
    {...dasar, keputusan: "koreksi", koreksi: {status: "a".repeat(201)}}, {...dasar, keputusan: "koreksi", koreksi: {url: "javascript:alert(1)"}}, {...dasar, keputusan: "koreksi", koreksi: {url: "data:text/html,x"}}, {...dasar, catatan: "a".repeat(201)}, {...dasar, catatan: 7},
    {...dasar, berkas: "usulan_dokumen_siaga", keputusan: "koreksi", koreksi: {status: "berlaku"}}];
  for (const o of salah) { const r = await kirim(unit, o); assert.equal(r.s, 400, JSON.stringify(o) + " -> " + r.s + " " + r.t); }
  assert.equal((await kirim(unit, "bukan objek")).s, 400);
  assert.equal(await nKetuk("1"), 0, "yang ditolak tidak tersimpan");
  assert.deepEqual(MEDAN_KOREKSI.usulan_rpbd, ["status", "periode", "url"]);
});
uji("MB-7 tulis: unit dan pimpinan 201 (juga token admin); keputusan terbaru per usulan_id berlaku; koreksi hanya medan terdaftar", async () => {
  const a = await kirim(unit, {berkas: "usulan_rpbd", usulan_id: ID1, keputusan: "terima", catatan: "  cocok dengan JDIH  "}); assert.equal(a.s, 201, a.t);
  assert.equal(a.j.catatan, "cocok dengan JDIH"); assert.equal(a.j.koreksi, null); assert.ok(!("oleh" in a.j));
  const b = await kirim(pim, {berkas: "usulan_rpbd", usulan_id: ID2, keputusan: "tolak"}); assert.equal(b.s, 201, b.t);
  const c = await kirim(pim, {berkas: "usulan_rpbd", usulan_id: ID1, keputusan: "koreksi", koreksi: {status: "habis", periode: "2021-2025", url: "https://jdih.example/x"}}); assert.equal(c.s, 201, c.t);
  assert.deepEqual(c.j.koreksi, {status: "habis", periode: "2021-2025", url: "https://jdih.example/x"});
  const d = await kirim(ADMIN, {berkas: "usulan_dokumen_siaga", usulan_id: ID1, keputusan: "terima"}); assert.equal(d.s, 201, d.t);
  const g = await baca(unit); assert.equal(g.s, 200, g.t); assert.equal(g.j.berkas, "usulan_rpbd");
  const per = Object.fromEntries(g.j.keputusan.map(k => [k.usulan_id, k])); assert.equal(g.j.keputusan.length, 2, "satu baris per usulan_id");
  assert.equal(per[ID1].keputusan, "koreksi"); assert.equal(per[ID1].koreksi.status, "habis"); assert.equal(per[ID2].keputusan, "tolak");
  assert.ok(Object.values(per).every(k => /^(staf:|[0-9a-f]{12})/.test(k.oleh)));
  assert.equal(g.h.get("cache-control"), "private, no-store");
  assert.equal((await baca(unit, "usulan_dokumen_siaga")).j.keputusan.length, 1, "per berkas");
  assert.equal((await baca(unit, "satu_data")).s, 400); assert.equal((await baca(unit, "rahasia")).s, 400); assert.equal((await buka(PROD, "/api/unit/ketuk", unit)).s, 400);
  assert.equal(await nKetuk("1"), 4, "riwayat utuh: koreksi menambah baris, tidak menimpa");
});
uji("MB-7 batas laju 300 per jam per pemutus: ke-301 429 dan tidak tersimpan", async () => {
  const x = await bikin(["unit"]), r1 = await kirim(x, {berkas: "usulan_rpbd", usulan_id: "1111111111111111", keputusan: "terima"}); assert.equal(r1.s, 201, r1.t);
  const oleh = (await DB.prepare("SELECT oleh FROM unit_ketuk WHERE usulan_id = '1111111111111111'").first()).oleh, kini = Date.now();
  await DB.batch(Array.from({length: 299}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'unit.ketuk', ?)").bind(oleh, kini)));
  const sebelum = await nKetuk("1"), r2 = await kirim(x, {berkas: "usulan_rpbd", usulan_id: "2222222222222222", keputusan: "terima"});
  assert.equal(r2.s, 429, r2.t); assert.ok(r2.h.get("retry-after")); assert.equal(await nKetuk("1"), sebelum);
  assert.equal((await kirim(unit, {berkas: "usulan_rpbd", usulan_id: "3333333333333333", keputusan: "terima"})).s, 201, "pemutus lain tidak ikut terkunci");
});
