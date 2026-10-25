/* Peta peluang api 7 hari (src/risiko7.js): R2 risiko/terbaru.json dan risiko/prospektif.json, hanya untuk yang masuk (admin atau akun pemirsa).
   Worker utuh di workerd + D1 + R2 sungguhan (TEST.md: tanpa mock). Jalankan: node --test tests/warga/risiko7.test.mjs */
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync, readdirSync, openSync, readSync, closeSync} from "node:fs";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, GERBANG, sha256} from "./_bnpb.mjs";

const U = await siapkan("uji-risiko7", {r2: true}), uji = berantai(), {mf, DB, api} = U;
const T = await siapkan("uji-risiko7-tanpa-r2");   // worker TANPA binding R2 MEDIA: pernah terjadi, wrangler.jsonc produksi terbit tanpa r2_buckets
const R2 = await mf.getR2Bucket("MEDIA");
const MAKS = 8 * 1024 * 1024;   // kontrak: berkas di atas ~8 MB ditolak 500
const AKSES = "/api/risiko7/akses";   // penanda untuk UI: selalu 200 {masuk}, tanpa baca R2
const KUNCI = {"/api/risiko7": "risiko/terbaru.json", "/api/risiko7/prospektif": "risiko/prospektif.json"};
const ISI = {"/api/risiko7": {versi: "P1", status: "eksperimental", minggu: 42, tahun: 2026, sel: [[1, 2, 30, 10]], penanda: "PENANDA-TERBARU-91"},
  "/api/risiko7/prospektif": {minggu: [{tahun: 2026, minggu: 41, n_sel: 5}], lolos: null, penanda: "PENANDA-PROSPEKTIF-17"}};
const simpanSemua = () => Promise.all(Object.entries(KUNCI).map(([j, k]) => R2.put(k, JSON.stringify(ISI[j]))));
const R = Object.keys(KUNCI);

let ipN = 0;
/* permintaan ke alamat terkunci centurisk97.id (tempat sesi peramban dipakai), tanpa mengikuti pengalihan */
const situs = (j, h = {}, init = {}) => mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", ...init, headers: {"cf-connecting-ip": `198.51.100.${++ipN % 250}`, ...h}});
const masuk = (user, sandi) => situs("/admin/masuk", {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id"}, {method: "POST", body: new URLSearchParams({email: user, sandi}).toString()});
const kuki = (r, nama) => r.headers.getSetCookie().find(c => c.startsWith(nama + "="))?.split(";")[0];
/* akun pemirsa dibuat Super Admin lewat API, lalu masuk lewat form login yang sama; tab "berita" saja (tab pembatas tampilan, bukan pengaman data) */
async function pemirsaBaru(nama = "Wartawan Uji") {
  const b = await api("POST", "/api/pemirsa/admin/buat", {nama, tab: ["berita"]}, ADMIN); assert.equal(b.s, 201, b.t);
  const cookie = kuki(await masuk(b.j.username, b.j.sandi), "sesi_pemirsa"); assert.ok(cookie, "login pemirsa memasang cookie sesi_pemirsa");
  return {id: b.j.pemirsa.id, username: b.j.username, sandi: b.j.sandi, cookie};
}
const cekKepala = (r, ket) => {
  assert.equal(r.h.get("cache-control"), "private, no-store", `${ket}: cache-control`);
  assert.match(r.h.get("content-type"), /^application\/json/, `${ket}: content-type`);
};

uji("GET /api/risiko7: tanpa masuk 401 JSON walau berkas ada; isi tidak bocor", async () => {
  await simpanSemua();
  const palsu = `sesi_admin=9999999999999.${sha256("rahasia-admin").slice(0, 12)}.${"0".repeat(64)}`;   // moderator sah, tanda HMAC palsu
  const tamu = [{}, {"x-admin-token": "salah"}, {authorization: "Bearer salah"}, {cookie: "sesi_pemirsa=" + "a".repeat(64)}, {cookie: palsu}];
  for (const j of R) for (const h of tamu) {
    const ket = `${j} ${JSON.stringify(h).slice(0, 40)}`, r = await api("GET", j, undefined, h);
    assert.equal(r.s, 401, `${ket} -> ${r.s}`);
    assert.ok(r.j?.galat, `${ket}: galat berbentuk JSON`); cekKepala(r, ket);
    assert.ok(!r.t.includes("PENANDA") && !r.t.includes("eksperimental"), `${ket}: isi berkas bocor ke tamu`);
    assert.equal((await api("HEAD", j, undefined, h)).s, 401, `${ket}: HEAD`);
  }
});

uji("GET /api/risiko7: admin (token, akun situs, cookie sesi) dan pemirsa -> 200 isi sama persis, private no-store", async () => {
  const sesiAdmin = kuki(await masuk("gerbang@x", "sandi"), "sesi_admin"); assert.ok(sesiAdmin, "login admin memasang cookie sesi_admin");
  const pm = await pemirsaBaru();
  const masukan = [["token admin", ADMIN], ["akun situs", GERBANG], ["cookie sesi admin", {cookie: sesiAdmin}], ["cookie pemirsa", {cookie: pm.cookie}]];
  for (const j of R) for (const [nama, h] of masukan) {
    const ket = `${j} ${nama}`, r = await api("GET", j, undefined, h);
    assert.equal(r.s, 200, `${ket} -> ${r.s} ${r.t.slice(0, 80)}`);
    assert.equal(r.t, JSON.stringify(ISI[j]), `${ket}: isi diteruskan apa adanya`);
    cekKepala(r, ket); assert.equal(r.h.get("x-content-type-options"), "nosniff");
    assert.equal(r.h.get("access-control-allow-origin"), null, `${ket}: tanpa CORS, situs lain tak boleh membaca`);
    assert.match(r.h.get("vary") || "", /cookie/i, `${ket}: vary cookie`);
    const hd = await api("HEAD", j, undefined, h);
    assert.equal(hd.s, 200, `${ket}: HEAD`); assert.equal(hd.t, "", `${ket}: HEAD tanpa isi`); cekKepala(hd, `${ket} HEAD`);
  }
  for (const j of R) {   // di alamat terkunci, tempat peramban pemirsa sungguhan memakainya
    const s = await situs(j, {cookie: pm.cookie}); assert.equal(s.status, 200, j); assert.equal(await s.text(), JSON.stringify(ISI[j]));
    assert.equal(s.headers.get("cache-control"), "private, no-store");
  }
});

uji("GET /api/risiko7/akses: tamu {masuk:false} 200, admin dan pemirsa {masuk:true}; tanpa menyentuh R2", async () => {
  const sesiAdmin = kuki(await masuk("gerbang@x", "sandi"), "sesi_admin"), pm = await pemirsaBaru("Pemirsa Akses");
  const palsu = `sesi_admin=9999999999999.${sha256("rahasia-admin").slice(0, 12)}.${"0".repeat(64)}`;   // moderator sah, tanda HMAC palsu
  const kasus = [["tamu polos", {}, false], ["token salah", {"x-admin-token": "salah"}, false], ["bearer salah", {authorization: "Bearer salah"}, false],
    ["cookie pemirsa palsu", {cookie: "sesi_pemirsa=" + "a".repeat(64)}, false], ["cookie admin bertanda palsu", {cookie: palsu}, false],
    ["token admin", ADMIN, true], ["akun situs", GERBANG, true], ["cookie sesi admin", {cookie: sesiAdmin}, true], ["cookie pemirsa", {cookie: pm.cookie}, true]];
  const periksa = async (klien, [nama, h, nilai], ket) => {
    const r = await klien.api("GET", AKSES, undefined, h), k = `${ket}: ${nama}`;
    assert.equal(r.s, 200, `${k} -> ${r.s} ${r.t.slice(0, 80)}`); assert.deepEqual(r.j, {masuk: nilai}, k);
    cekKepala(r, k); assert.equal(r.h.get("x-content-type-options"), "nosniff", k);
    assert.match(r.h.get("vary") || "", /cookie/i, `${k}: vary cookie`); assert.equal(r.h.get("access-control-allow-origin"), null, `${k}: tanpa CORS`);
    const hd = await klien.api("HEAD", AKSES, undefined, h); assert.equal(hd.s, 200, `${k}: HEAD`); assert.equal(hd.t, "", `${k}: HEAD tanpa isi`); cekKepala(hd, `${k} HEAD`);
  };
  for (const kc of kasus) await periksa(U, kc, "R2 ada");
  /* tidak membaca R2: jawaban sama walau berkasnya belum ada, dan di worker yang tak punya binding MEDIA sama sekali (lewat kasus yang tak bergantung D1 U) */
  await R2.delete(Object.values(KUNCI));
  for (const kc of kasus) await periksa(U, kc, "R2 kosong");
  for (const kc of kasus.filter(([nama]) => nama !== "cookie pemirsa")) await periksa(T, kc, "tanpa binding R2");
  await simpanSemua();   // uji berikutnya membutuhkan berkasnya
  const url = await situs(AKSES, {cookie: pm.cookie}); assert.deepEqual(await url.json(), {masuk: true}, "di alamat terkunci centurisk97.id");
});

uji("GET /api/risiko7: sesi pemirsa kedaluwarsa, keluar, atau akun dicabut -> 401", async () => {
  const pm = await pemirsaBaru("Peneliti Uji"), baca = c => api("GET", "/api/risiko7", undefined, {cookie: c});
  const akses = async c => (await api("GET", AKSES, undefined, {cookie: c})).j;   // penanda UI harus mengikuti keadaan sesi yang sama dengan rute data
  assert.equal((await baca(pm.cookie)).s, 200, "sesi baru sah"); assert.deepEqual(await akses(pm.cookie), {masuk: true});
  await DB.prepare("UPDATE pemirsa_sesi SET dibuat = ?, kedaluwarsa = ?").bind(Date.now() - 2000, Date.now() - 1000).run();   // CHECK kedaluwarsa > dibuat
  assert.equal((await baca(pm.cookie)).s, 401, "sesi kedaluwarsa"); assert.deepEqual(await akses(pm.cookie), {masuk: false}, "kedaluwarsa");

  let c = kuki(await masuk(pm.username, pm.sandi), "sesi_pemirsa"); assert.equal((await baca(c)).s, 200, "masuk lagi"); assert.deepEqual(await akses(c), {masuk: true});
  const k = await situs("/admin/keluar", {cookie: c, origin: "https://centurisk97.id"}, {method: "POST"}); assert.equal(k.status, 303);
  assert.equal((await baca(c)).s, 401, "sesudah keluar cookie lama mati"); assert.deepEqual(await akses(c), {masuk: false}, "sesudah keluar");

  c = kuki(await masuk(pm.username, pm.sandi), "sesi_pemirsa"); assert.equal((await baca(c)).s, 200);
  assert.equal((await api("POST", `/api/pemirsa/admin/${pm.id}`, {aksi: "cabut"}, ADMIN)).s, 200);
  const r = await baca(c); assert.equal(r.s, 401, "akun dicabut"); assert.ok(!r.t.includes("PENANDA")); assert.deepEqual(await akses(c), {masuk: false}, "akun dicabut");
});

uji("GET /api/risiko7: berkas belum ada -> 503 belum_ada; tamu tetap 401, bukan 503", async () => {
  await R2.delete(Object.values(KUNCI));
  const pm = await pemirsaBaru("Pemirsa Tiga");
  for (const j of R) {
    for (const h of [ADMIN, {cookie: pm.cookie}]) {
      const r = await api("GET", j, undefined, h);
      assert.equal(r.s, 503, `${j} -> ${r.s}`); assert.equal(r.j.status, "belum_ada"); assert.ok(r.j.galat); cekKepala(r, j);
      assert.equal((await api("HEAD", j, undefined, h)).s, 503, `${j}: HEAD`);
    }
    assert.equal((await api("GET", j)).s, 401, `${j}: tamu tidak boleh tahu berkas ada atau tidak`);
  }
  for (const [j, k] of Object.entries(KUNCI)) {   // berkas kosong = unggahan gagal: sama dengan belum ada, bukan 200 berbadan kosong
    await R2.put(k, "");
    for (const m of ["GET", "HEAD"]) { const r = await api(m, j, undefined, ADMIN); assert.equal(r.s, 503, `${m} ${j} berkas kosong -> ${r.s}`); if (m === "GET") assert.equal(r.j.status, "belum_ada"); }
  }
  await R2.delete(Object.values(KUNCI));
});

uji("GET /api/risiko7: tanpa binding R2 MEDIA -> 503 tanpa_penyimpanan (bukan 500), tamu tetap 401", async () => {
  for (const j of R) {
    const r = await T.api("GET", j, undefined, ADMIN); assert.equal(r.s, 503, `${j} -> ${r.s} ${r.t.slice(0, 80)}`); assert.equal(r.j.status, "tanpa_penyimpanan"); cekKepala(r, j);
    assert.equal((await T.api("GET", j)).s, 401, `${j}: tamu`);
  }
});

uji("GET /api/risiko7: berkas di atas 8 MB -> 500 terlalu_besar, tepat 8 MB lolos", async () => {
  const pas = '{"x":"' + "a".repeat(MAKS - 8) + '"}'; assert.equal(Buffer.byteLength(pas), MAKS);
  for (const [j, k] of Object.entries(KUNCI)) {
    await R2.put(k, pas);
    const ok = await api("GET", j, undefined, ADMIN); assert.equal(ok.s, 200, `${j} tepat batas -> ${ok.s}`); assert.equal(ok.t.length, MAKS);
    await R2.put(k, pas + " ");   // satu byte lebih
    for (const m of ["GET", "HEAD"]) {
      const r = await api(m, j, undefined, ADMIN); assert.equal(r.s, 500, `${j} ${m} lewat batas -> ${r.s}`);
      if (m === "GET") { assert.equal(r.j.status, "terlalu_besar"); assert.ok(r.t.length < 1000, "isi berkas tidak ikut terkirim"); }
    }
    assert.equal((await api("GET", j)).s, 401, `${j}: tamu tetap 401`);
  }
  await R2.delete(Object.values(KUNCI));
});

uji("GET /api/risiko7: metode selain GET dan HEAD -> 405 (juga untuk /prospektif dan /akses)", async () => {
  await simpanSemua();
  for (const j of [...R, AKSES]) for (const m of ["POST", "PUT", "PATCH", "DELETE"]) for (const h of [{}, ADMIN]) {
    const r = await api(m, j, m === "POST" ? "{}" : undefined, h);
    assert.equal(r.s, 405, `${m} ${j} ${h === ADMIN ? "admin" : "tamu"} -> ${r.s}`); assert.match(r.h.get("allow") || "", /GET/);
    assert.ok(!r.t.includes("PENANDA"));
  }
});

uji("GET /api/risiko7/prospektif: objek sendiri risiko/prospektif.json, tidak tertukar dengan terbaru.json", async () => {
  await R2.delete(Object.values(KUNCI)); await R2.put(KUNCI["/api/risiko7"], JSON.stringify(ISI["/api/risiko7"]));
  assert.equal((await api("GET", "/api/risiko7/prospektif", undefined, ADMIN)).s, 503, "hanya terbaru ada: prospektif belum ada");
  assert.equal((await api("GET", "/api/risiko7", undefined, ADMIN)).s, 200);
  await R2.put(KUNCI["/api/risiko7/prospektif"], JSON.stringify(ISI["/api/risiko7/prospektif"]));
  const p = await api("GET", "/api/risiko7/prospektif", undefined, ADMIN); assert.equal(p.s, 200);
  assert.deepEqual(p.j, ISI["/api/risiko7/prospektif"]); assert.ok(!p.t.includes("PENANDA-TERBARU"));
  const t = await api("GET", "/api/risiko7/", undefined, ADMIN); assert.equal(t.s, 200, "garis miring penutup sama dengan tanpa"); assert.deepEqual(t.j, ISI["/api/risiko7"]);
  assert.equal((await api("GET", "/api/risiko7/lain", undefined, ADMIN)).s, 404, "subjalur lain tidak dikenal");
});

/* berkas JSON di public/ yang kepalanya berbentuk peta P1 (versi P*, status eksperimental) atau bernama seperti objek R2-nya */
function* semuaJson(dir) {
  for (const e of readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* semuaJson(p); else if (e.name.endsWith(".json")) yield p;
  }
}
const kepala = (f, n = 2048) => { const fd = openSync(f, "r"); try { const b = Buffer.alloc(n); return b.toString("utf8", 0, readSync(fd, b, 0, n, 0)); } finally { closeSync(fd); } };

uji("GET /api/risiko7: berkas tak terjangkau dari jalan publik (data/, api/v1, aset) dan public/ tidak memuatnya", async () => {
  await simpanSemua();
  const calon = ["/data/risiko/terbaru.json", "/data/risiko/prospektif.json", "/data/risiko7.json", "/data/risiko7/terbaru.json", "/data/risiko_terbaru.json", "/risiko/terbaru.json",
    "/risiko/prospektif.json", "/risiko7.json", "/api/risiko/terbaru", "/api/risiko", "/api/v1/risiko7", "/api/v1/risiko7/prospektif", "/api/v1/risiko/terbaru", "/api/v1/data/risiko7",
    "/api/v1/data/risiko_terbaru", "/api/v1/data/risiko/terbaru", "/ubin/risiko/terbaru.json", "/ubin/risiko7.pmtiles"];
  const pm = await pemirsaBaru("Pemirsa Empat");
  for (const h of [{}, ADMIN, {cookie: pm.cookie}]) for (const j of calon) {
    const r = await api("GET", j, undefined, h);
    assert.ok(!r.t.includes("PENANDA") && !r.t.includes("eksperimental"), `${j} membocorkan isi berkas R2 (${r.s})`);
    assert.notEqual(r.s, 200, `${j} dijawab 200`);
  }
  const indeks = await api("GET", "/api/v1");
  assert.equal(indeks.s, 200); assert.ok(!/risiko7|risiko\/terbaru|risiko\/prospektif/.test(indeks.t), "indeks /api/v1 tidak boleh mencantumkan peta 7 hari");

  const sarang = [];
  for (const f of semuaJson(path.join(AKAR, "public"))) {
    const rel = path.relative(path.join(AKAR, "public"), f), k = kepala(f);
    if (/(^|\/)risiko\/(terbaru|prospektif)\.json$|risiko7/i.test(rel) || (/"versi"\s*:\s*"P\d+"/.test(k) && /"status"\s*:\s*"eksperimental"/.test(k))) sarang.push(rel);
  }
  assert.deepEqual(sarang, [], `public/ memuat berkas yang seharusnya hanya di R2 (hanya untuk akun login sampai lolos uji prospektif): ${sarang.join(", ")}`);
});

uji("kabel worker.js: RUTE_RISIKO7 digabung ke RUTE", () => {
  const w = readFileSync(path.join(AKAR, "src/worker.js"), "utf8");
  assert.match(w, /import \{RUTE_RISIKO7\} from "\.\/risiko7\.js"/, "import hilang");
  assert.match(w, /\.\.\.RUTE_RISIKO7/, "spread ke RUTE hilang");
});
