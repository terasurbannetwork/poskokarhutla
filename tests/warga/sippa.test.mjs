/* SIPPA worker P0 (src/sippa.js; DESAIN-TEKNIS §1.4, §4, §6; RENCANA-UJI §2.4): halaman /pipa, kit, komponen, gerak, tugas, lapangan (kode penugasan), foto, log, CSV, dummy.
   Worker utuh di workerd + D1 + R2 sungguhan, migrasi 0056 apa adanya (TEST.md: tanpa mock). Tiap rute: positif, peran salah DITOLAK, masukan liar DITOLAK, ukuran, laju.
   Jalankan: node --test tests/warga/sippa.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, JPEG_SAH, WEBP_SAH, badanPanjang} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {P_SIPPA_BACA, P_SIPPA_TULIS, LAYAR_SIPPA, ALASAN_TRANSISI, RANTAI_DUMMY, PENGISI} from "../../src/sippa.js";
import {HALAMAN_STAF} from "../../src/admin_halaman.js";
import {FORMULIR_VERSI} from "../../public/pipa/formulir.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1"}, uji = berantai();
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
const U = await siapkan("uji-sippa", {r2: true}), {mf, DB, api} = U;
const R2 = await mf.getR2Bucket("MEDIA");
const ADM = sha256("rahasia-admin").slice(0, 12), MOD = sha256("moderator-dua").slice(0, 12);   // pelaku admin = 12 heks pertama sha256 token
const sip = (m, j, b, h) => api(m, "/api/sippa" + j, b, h);
const man = async (j, h = {}, host = "http://bnpb.lokal") => { const r = await mf.dispatchFetch(host + j, {headers: h, redirect: "manual"}); const t = await r.text(); return {s: r.status, h: r.headers, t}; };
const hitung = async (tabel, where = "1", ...p) => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).bind(...p).first()).n;
const jejak = () => hitung("pantau_jejak", "obyek GLOB 'sippa_*' AND dummy = 0");
const isiLaju = (kunci, aksi, n) => DB.batch(Array.from({length: n}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(kunci, aksi, Date.now())));

let ip = 0;
const bikin = async (peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1981${++ip}0012005`, unit: "Pusdalops BNPB", email: `sp${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie, ...PB}, g: {cookie}, kunci: "staf:" + r.j.staf.id};
};
const pus = await bikin(["pusdalops"]), koor = await bikin(["koordalops"]), pim = await bikin(["pimpinan"]), ver = await bikin(["verifikator"]), pus61 = await bikin(["pusdalops"], ["61"]);
const SB = {"x-kode": "0".repeat(26)};   // kode salah
const cekKepala = (r, ket) => {
  assert.equal(r.h.get("cache-control"), "private, no-store", `${ket}: cache-control`);
  assert.match(r.h.get("vary") || "", /cookie/i, `${ket}: vary`); assert.equal(r.h.get("x-content-type-options"), "nosniff", `${ket}: nosniff`);
};
const T0 = Date.now() - 6 * JAM, uuid = () => crypto.randomUUID();
const logB = (o = {}) => ({id: uuid(), jenis: "karhutla", kelas_medan: "II", petak_id: "PETAK-1", panjang_m: 400, n_orang: 12, t_tiba: T0, t_mulai_gelar: T0 + 60e3, t_air_mengalir: T0 + JAM, t_selesai: T0 + 4 * JAM, waktu_klien: Date.now() - 1000, ...o});
const probeB = (o = {}) => ({id: uuid(), petak_id: "PETAK-1", titik: "T1", tahap: "sebelum", kedalaman_cm: 30, suhu_c: 61.5, waktu: T0 + 5 * 60e3, ...o});
const bbmB = (o = {}) => ({id: uuid(), waktu: T0, jenis: "bensin", aksi: "keluar", liter: 40, ...o});
const gerakB = (o = {}) => ({id: uuid(), dari_status: "gudang", ke_status: "gelar", alasan: "gelar", tiba: T0, waktu: T0, ...o});
const kirim = (kode, b) => sip("POST", "/lapangan/kirim", {jam_kirim: Date.now(), log: [], probe: [], bbm: [], gerak: [], ...b}, {"x-kode": kode});
const badanFoto = async (bytes, h) => { const f = new FormData(); f.append("berkas", new File([bytes], "x.jpg", {type: "image/jpeg"})); return badanPanjang(f, h); };
const foto = async (kode, bytes = JPEG_SAH, h = {}) => {
  const {body, headers} = await badanFoto(bytes, {"x-kode": kode, ...h});
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/lapangan/foto", {method: "POST", body, headers}); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t};
};

/* ---------------------------------------------------------------- konstanta dan skema bersama */
uji("konstanta: peran, 11 layar, alasan transisi = pasangan CHECK 0056, hak halaman staf = P_SIPPA_BACA", () => {
  assert.deepEqual(P_SIPPA_BACA, ["pusdalops", "koordalops", "pimpinan"]); assert.deepEqual(P_SIPPA_TULIS, ["pusdalops", "koordalops"]);
  assert.deepEqual(LAYAR_SIPPA, ["peta", "hitung", "pemicu", "kit", "log", "ab", "studio", "3d", "telemetri", "laporan", "data"]);
  assert.deepEqual(HALAMAN_STAF.pipa, P_SIPPA_BACA, "HALAMAN_STAF.pipa harus sama dengan hak API (satu sumber)");
  const sql = teks("migrations/0056_sippa_inti.sql"), blok = sql.match(/dari_status \|\| '>' \|\| ke_status IN \(([\s\S]*?)\)\),/)[1];
  const check = [...blok.matchAll(/'([a-z]+>[a-z]+)'/g)].map(m => m[1]).sort();
  assert.equal(check.length, 26, "CHECK memuat 26 pasangan");
  const alasanSql = [...sql.match(/alasan TEXT NOT NULL CHECK \(alasan IN \(([^)]*)\)/)[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort();
  assert.deepEqual(Object.keys(ALASAN_TRANSISI).sort(), alasanSql, "tiap alasan CHECK punya himpunan di ALASAN_TRANSISI");
  const gabung = [...new Set(Object.entries(ALASAN_TRANSISI).filter(([a]) => a !== "koreksi").flatMap(([, v]) => v))].sort();
  assert.deepEqual(gabung, check, "gabungan himpunan alasan = daftar pasangan CHECK (selisih berarti rute menerima yang D1 menolak atau sebaliknya)");
  assert.deepEqual([...ALASAN_TRANSISI.koreksi].sort(), check, "koreksi = pasangan sah mana pun");
  for (const a of ["gelar", "bongkar", "kembali"]) assert.ok(ALASAN_TRANSISI[a].length > 0);
  assert.ok(!Object.keys(RANTAI_DUMMY).some(k => ![...LAYAR_SIPPA, "ringkas", "lapangan"].includes(k)), "rantai dummy hanya untuk layar yang sah");
});

/* ---------------------------------------------------------------- halaman */
uji("GET /pipa dan layar: pusdalops 200 berkepala lengkap; tamu 303 ke /admin/pantau?ke=; verifikator 403 polos tanpa Location; layar liar dan id cacat 404", async () => {
  const a = await man("/pipa", pus.g);
  assert.equal(a.s, 200, a.t.slice(0, 200)); assert.equal(a.h.get("cache-control"), "private, no-store"); assert.match(a.h.get("vary") || "", /cookie/i);
  assert.equal(a.h.get("x-robots-tag"), "noindex, nofollow"); assert.equal(a.h.get("referrer-policy"), "same-origin"); assert.match(a.h.get("content-type"), /^text\/html; charset=utf-8/);
  const csp = a.h.get("content-security-policy");
  assert.match(csp, /openfreemap\.org/); assert.doesNotMatch(csp, /unsafe-inline|cdn|unpkg|jsdelivr/i); assert.match(csp, /script-src 'self'(;|$)/); assert.match(csp, /worker-src 'self' blob:/);
  assert.match(a.t, /<html lang="id">/); assert.match(a.t, /<title>SIPPA, Pantau Bencana<\/title>/); assert.match(a.t, /<script type="module" src="\/pipa\/app\.js\?v=\d+"><\/script>/);
  assert.match(a.t, /data-staf="1"/); assert.match(a.t, /data-peran="pusdalops"/); assert.match(a.t, /data-layar="peta"/); assert.match(a.t, /data-tulis="1"/); assert.match(a.t, /data-super="0"/);
  assert.doesNotMatch(a.t, /—|·/, "tanpa em dash atau titik tengah di cangkang");
  for (const l of LAYAR_SIPPA) { const r = await man("/pipa/" + l, pus.g); assert.equal(r.s, 200, `/pipa/${l}`); assert.match(r.t, new RegExp(`data-layar="${l}"`)); }
  const pm = await man("/pipa/log", pim.g); assert.equal(pm.s, 200); assert.match(pm.t, /data-tulis="0"/, "pimpinan hanya baca");
  const ad = await man("/pipa/kit", ADMIN); assert.equal(ad.s, 200); assert.match(ad.t, /data-super="1"/); assert.match(ad.t, /data-tulis="1"/);
  const mo = await man("/pipa/kit", MOD2); assert.match(mo.t, /data-super="0"/);
  const t = await man("/pipa/peta?x=1#a"); assert.equal(t.s, 303); assert.equal(t.h.get("location"), "/admin/pantau?ke=" + encodeURIComponent("/pipa/peta?x=1"), "tamu ke Meja Pantau (bukan /admin/masuk), jalur dan query diteruskan");
  assert.equal(t.h.get("cache-control"), "no-store"); assert.equal((await man("/pipa")).h.get("location"), "/admin/pantau?ke=%2Fpipa");
  const v = await man("/pipa", ver.g); assert.equal(v.s, 403); assert.equal(v.h.get("location"), null, "403 polos tanpa pengalihan (cegah pantulan)"); assert.match(v.t, /tidak punya akses SIPPA/);
  assert.equal((await man("/pipa/kit", {"x-admin-token": "salah"})).s, 303, "token salah = tamu");
  for (const j of ["/pipa/tidakada", "/pipa/x/y", "/pipa/kit/0123456789abcde", "/pipa/kit/0123456789ABCDEF", "/pipa/peta/x"]) assert.equal((await man(j, pus.g)).s, 404, j);
  const k = await man("/pipa/kit/0123456789abcdef", pus.g); assert.equal(k.s, 200); assert.match(k.t, /data-layar="kit"/);
  assert.equal((await man("/pipa/kit/0123456789abcdef")).s, 303);
});
uji("GET /pipa/lapangan: tamu 200 dengan CSP_LAPANGAN dan no-referrer; /admin/pipa 303 ke /pipa; centurisk97.id: /pipa tamu 303, /pipa/lapangan 200", async () => {
  const l = await man("/pipa/lapangan");
  assert.equal(l.s, 200); assert.equal(l.h.get("cache-control"), "no-store"); assert.equal(l.h.get("referrer-policy"), "no-referrer"); assert.equal(l.h.get("x-robots-tag"), "noindex, nofollow");
  const csp = l.h.get("content-security-policy"); assert.match(csp, /form-action 'none'/); assert.match(csp, /worker-src 'self' blob:/); assert.doesNotMatch(csp, /unsafe-inline/);
  assert.match(l.t, /<html lang="id">/); assert.match(l.t, /\/pipa\/lapangan\.js/); assert.doesNotMatch(l.t, /data-staf/, "cangkang lapangan tanpa data staf");
  const a = await man("/admin/pipa"); assert.equal(a.s, 303); assert.equal(a.h.get("location"), "/pipa"); assert.equal((await man("/admin/pipa", pus.g)).h.get("location"), "/pipa");
  const lk = "https://centurisk97.id", h = {"cf-connecting-ip": "198.51.100.77"};
  const p = await man("/pipa", h, lk); assert.equal(p.s, 303); assert.equal(p.h.get("location"), "/admin/pantau?ke=%2Fpipa", "bukan /admin/masuk");
  assert.equal((await man("/pipa/lapangan", h, lk)).s, 200); assert.equal((await man("/pipa", {...h, ...pus.g}, lk)).s, 200, "staf bersesi lolos gerbang host");
  assert.equal((await man("/pipa/tidakada", h, lk)).s, 404, "bukan dialihkan: jatuh ke aset");
  assert.match(teks("src/worker.js"), /\/\^\\\/\(api\|admin\|ews\|ubin\|pipa\)\(\\\/\|\$\)\//, "regex pengecualian halamanTerkunci memuat pipa");
  assert.match(teks("tests/warga/posko.test.mjs"), /\(api\|admin\|ews\|ubin\|pipa\)/, "pemindai posko.test memakai regex yang sama");
});
uji("public/admin/pantau.js: sesudah masuk staf hanya ke yang cocok ^/pipa(/|$) dialihkan; URL luar tidak", () => {
  const src = teks("public/admin/pantau.js"), m = src.match(/const KE_PIPA = (\/\^[^\n;]+\/);/);
  assert.ok(m, "pantau.js mendefinisikan const KE_PIPA = /^.../ (ADR-05)"); const re = eval(m[1]);
  for (const ok of ["/pipa", "/pipa/peta", "/pipa/kit/0123456789abcdef", "/pipa/peta?x=1"]) assert.ok(re.test(ok), ok);
  for (const salah of ["https://jahat.example", "//jahat", "/admin", "/pipaX", "/x/pipa", "/\\jahat", "javascript:alert(1)", ""]) assert.ok(!re.test(salah), salah);
  assert.match(src, /location\.href = ke/, "peralihan lewat location.href jalur sama asal"); assert.doesNotMatch(src, /location\.href = (?!ke\b)[^;]*searchParams/);
});

/* ---------------------------------------------------------------- kit */
let kit1, kit2, kit3, kodeBaris;
uji("POST /api/sippa/kit: M 201 dengan komponen dari templat BOM; pusdalops, pimpinan, akun gerbang 403; tamu 401; masukan liar 400; kode ganda 409", async () => {
  const j0 = await jejak();
  const r = await sip("POST", "/kit", {kode: "SIPPA-101", jenis: "gambut", pemilik_asal: "BMN BNPB", lokasi: "Gudang Palangka Raya", prov: "62", kab: "Kota Palangka Raya", templat: "gambut"}, MOD2);
  assert.equal(r.s, 201, r.t); cekKepala(r, "kit baru"); kit1 = r.j.kit.id; assert.equal(r.j.kit.kode, "SIPPA-101"); assert.equal(r.j.kit.status, "gudang");
  const komp = (await DB.prepare("SELECT kode_bom, kondisi, musim_awal, dummy FROM sippa_komponen WHERE kit_id = ?").bind(kit1).all()).results;
  assert.equal(r.j.komponen, komp.length); assert.ok(komp.length >= 15, `templat gambut memuat ${komp.length} komponen`);
  for (const k of ["P-101", "H-101", "I-101", "T-101", "GWT-101", "Q-101"]) assert.ok(komp.some(x => x.kode_bom === k), `templat gambut tanpa ${k}`);
  assert.ok(komp.every(x => x.kondisi === "baik" && x.musim_awal === 1 && x.dummy === 0));
  assert.equal(await jejak(), j0 + 1, "satu baris jejak untuk pembuatan kit"); assert.equal(await hitung("pantau_jejak", "obyek = ?", "sippa_kit:" + kit1), 1);
  const mn = await sip("POST", "/kit", {kode: "SIPPA-102", jenis: "mineral", templat: "mineral", prov: "62"}, ADMIN); assert.equal(mn.s, 201, mn.t); kit2 = mn.j.kit.id;
  const km = (await DB.prepare("SELECT kode_bom FROM sippa_komponen WHERE kit_id = ?").bind(kit2).all()).results.map(x => x.kode_bom);
  assert.ok(km.includes("P-101") && !km.some(k => ["I-101", "T-101", "GWT-101"].includes(k)), "kit mineral tanpa I-101, T-101, GWT-101 (PRD §6.1)");
  const b = await sip("POST", "/kit", {kode: "SIPPA-103", jenis: "banjir", templat: "banjir", prov: "63"}, ADMIN); assert.equal(b.s, 201, b.t); kit3 = b.j.kit.id;
  const salah = [["pusdalops", pus.h], ["koordalops", koor.h], ["pimpinan", pim.h], ["verifikator", ver.h], ["akun gerbang AKUN_SITUS", GERBANG]];
  for (const [n, h] of salah) { const x = await sip("POST", "/kit", {kode: "SIPPA-110", jenis: "gambut", templat: "gambut"}, h); assert.equal(x.s, 403, `${n}: ${x.t}`); assert.ok(x.j.galat); }
  const t = await sip("POST", "/kit", {kode: "SIPPA-110", jenis: "gambut", templat: "gambut"}); assert.equal(t.s, 401); assert.ok(t.j.galat);
  const B = {kode: "SIPPA-120", jenis: "gambut", templat: "gambut"};
  for (const [ket, o] of [["kode pendek", {kode: "SIPPA-12"}], ["kode panjang", {kode: "SIPPA-0001"}], ["kode khusus dummy", {kode: "SIPPA-901"}], ["huruf kecil", {kode: "sippa-120"}], ["jenis liar", {jenis: "udara"}],
    ["templat liar", {templat: "lain"}], ["pemilik 81 huruf", {pemilik_asal: "x".repeat(81)}], ["pemilik 2 huruf", {pemilik_asal: "ab"}], ["prov 1 digit", {prov: "6"}], ["lokasi 121", {lokasi: "x".repeat(121)}], ["kode bukan teks", {kode: 101}]]) {
    const x = await sip("POST", "/kit", {...B, ...o}, ADMIN); assert.equal(x.s, 400, `${ket}: ${x.t}`); assert.ok(x.j.galat);
  }
  assert.equal(await hitung("sippa_kit", "kode IN ('SIPPA-120', 'SIPPA-901')"), 0, "masukan liar tidak menulis");
  const g = await sip("POST", "/kit", {kode: "SIPPA-101", jenis: "gambut", templat: "gambut"}, ADMIN); assert.equal(g.s, 409, g.t);
  const rus = await sip("POST", "/kit", B, {"x-admin-token": "rahasia-admin", "content-type": "application/json", origin: "https://jahat.example"}); assert.equal(rus.s, 403, "origin lain ditolak CSRF");
  /* batas laju 60 per jam per pelaku (kunci = pelaku): satu panggilan berikutnya 429, pelaku lain tetap lolos */
  await isiLaju(MOD, "sippa.kit_buat", 60);
  const l = await sip("POST", "/kit", B, MOD2); assert.equal(l.s, 429, l.t); assert.ok(l.h.get("retry-after"));
  assert.equal((await sip("POST", "/kit", {...B, kode: "SIPPA-121"}, ADMIN)).s, 201, "kunci laju lain tetap lolos");
});
uji("GET /api/sippa/kit dan /kit/:id: bentuk badan, filter liar 400, tamu 401, staf wilayah 61 tidak melihat kit 62 (404 identik); tanpa kode penugasan; GET tanpa laju", async () => {
  const tamu = await sip("GET", "/kit"); assert.equal(tamu.s, 401); cekKepala(tamu, "tamu");
  const l = await sip("GET", "/kit", undefined, pim.h); assert.equal(l.s, 200, l.t); cekKepala(l, "daftar");
  const k1 = l.j.kit.find(k => k.id === kit1); assert.ok(k1, "kit1 terdaftar");
  for (const f of ["id", "kode", "jenis", "status", "lokasi", "lat", "lon", "prov", "kab", "pemilik_asal", "diubah", "komponen_kurang", "jam_pompa_musim", "banjir_m3_musim", "gerak_buka"]) assert.ok(f in k1, `kolom ${f}`);
  assert.equal(k1.komponen_kurang, 0); assert.equal(k1.gerak_buka, null); assert.ok("musim_pct" in l.j.kehilangan && "per_kit" in l.j.kehilangan);
  assert.equal((await sip("GET", "/kit?status=gudang&jenis=gambut&prov=62", undefined, pim.h)).j.kit.every(k => k.status === "gudang" && k.jenis === "gambut" && k.prov === "62"), true);
  for (const q of ["status=terbang", "jenis=udara", "prov=6", "prov=abc", "prov=62%27"]) assert.equal((await sip("GET", "/kit?" + q, undefined, pim.h)).s, 400, q);
  const d = await sip("GET", "/kit/" + kit1, undefined, pim.h); assert.equal(d.s, 200, d.t); cekKepala(d, "rincian");
  for (const f of ["kit", "komponen", "gerak", "pemakaian", "bbm", "tugas"]) assert.ok(f in d.j, `rincian memuat ${f}`);
  assert.ok(d.j.komponen.length >= 15); assert.doesNotMatch(d.t, /kode_sha/, "rincian kit tanpa kode penugasan");
  assert.equal((await sip("GET", "/kit/0123456789abcdef", undefined, pim.h)).s, 404);
  assert.equal((await sip("GET", "/kit/" + kit1)).s, 401); assert.equal((await sip("GET", "/kit/" + kit1, undefined, ver.h)).s, 403, "verifikator tak berhak");
  const w = await sip("GET", "/kit", undefined, pus61.h); assert.ok(!w.j.kit.some(k => k.id === kit1), "wilayah 61 tidak melihat kit 62");
  const w1 = await sip("GET", "/kit/" + kit1, undefined, pus61.h), w2 = await sip("GET", "/kit/0123456789abcdef", undefined, pus61.h);
  assert.equal(w1.s, 404); assert.equal(w1.t, w2.t, "404 identik: keberadaan kit tidak bocor");
  const n0 = await hitung("laju_bnpb");
  for (let i = 0; i < 700; i++) { const r = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/kit", {headers: pus.h}); await r.text(); assert.equal(r.status, 200, `GET ke-${i + 1}`); }
  assert.equal(await hitung("laju_bnpb"), n0, "GET staf tidak menulis laju_bnpb (ADR-06)");
});
uji("POST /api/sippa/kit/:id: W 200 hanya lokasi dan catatan; status di badan 400; pimpinan 403; tanpa x-pb 401; wilayah 61 404", async () => {
  const j0 = await jejak();
  const r = await sip("POST", "/kit/" + kit1, {lokasi: "Gudang YonTP Kapuas", catatan: "dipindah rak 2"}, pus.h); assert.equal(r.s, 200, r.t); assert.equal(r.j.kit.lokasi, "Gudang YonTP Kapuas"); assert.equal(r.j.kit.status, "gudang");
  assert.equal(await jejak(), j0 + 1);
  assert.equal((await sip("POST", "/kit/" + kit1, {lokasi: "x"}, pim.h)).s, 403); assert.equal((await sip("POST", "/kit/" + kit1, {lokasi: "x"}, ver.h)).s, 403);
  assert.equal((await sip("POST", "/kit/" + kit1, {lokasi: "x"}, {cookie: pus.g.cookie})).s, 401, "sesi staf tanpa x-pb: 401"); assert.equal((await sip("POST", "/kit/" + kit1, {lokasi: "x"})).s, 401);
  for (const b of [{status: "hilang"}, {lokasi: "x", status: "depot"}, {}, {lokasi: "x".repeat(121)}, {catatan: "y".repeat(1001)}, {prov: "62"}, {lokasi: 5}]) { const x = await sip("POST", "/kit/" + kit1, b, pus.h); assert.equal(x.s, 400, JSON.stringify(b).slice(0, 50) + " " + x.t); }
  assert.equal((await DB.prepare("SELECT status FROM sippa_kit WHERE id = ?").bind(kit1).first()).status, "gudang");
  assert.equal((await sip("POST", "/kit/" + kit1, {lokasi: "x"}, pus61.h)).s, 404, "kit di luar wilayah");
  assert.equal((await sip("POST", "/kit/0123456789abcdef", {lokasi: "x"}, pus.h)).s, 404);
  await isiLaju(pus.kunci, "sippa.tulis", 600); assert.equal((await sip("POST", "/kit/" + kit1, {lokasi: "y"}, pus.h)).s, 429); assert.equal((await sip("POST", "/kit/" + kit1, {lokasi: "y"}, koor.h)).s, 200, "pelaku lain lolos");
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pus.kunci).run();
});
let komp1;
uji("POST /api/sippa/komponen/:id: W 200 dengan jejak per baris; 101 perubahan, kode BOM liar, hilang tanpa catatan 400; pimpinan 403", async () => {
  komp1 = (await DB.prepare("SELECT id, kode_bom FROM sippa_komponen WHERE kit_id = ? ORDER BY kode_bom").bind(kit1).all()).results;
  const j0 = await jejak(), [a, b] = komp1;
  const r = await sip("POST", "/komponen/" + kit1, {ubah: [{id: a.id, kondisi: "rusak_ringan", nomor_seri: "SN-1", dicek: true}, {id: b.id, kondisi: "hilang", catatan: "terbawa banjir"}],
    baru: [{kode_bom: "X-901", nama: "Kunci pas", jumlah: 2, satuan: "unit"}]}, pus.h);
  assert.equal(r.s, 200, r.t); assert.deepEqual(r.j, {berubah: 2, baru: 1}); assert.equal(await jejak(), j0 + 3, "satu jejak per baris komponen");
  const ra = await DB.prepare("SELECT kondisi, nomor_seri, dicek FROM sippa_komponen WHERE id = ?").bind(a.id).first(); assert.equal(ra.kondisi, "rusak_ringan"); assert.equal(ra.nomor_seri, "SN-1"); assert.ok(ra.dicek > 0);
  assert.equal((await DB.prepare("SELECT kondisi FROM sippa_komponen WHERE id = ?").bind(b.id).first()).kondisi, "hilang");
  const d = await sip("GET", "/kit", undefined, pus.h); assert.equal(d.j.kit.find(k => k.id === kit1).komponen_kurang, 1); assert.ok(d.j.kehilangan.per_kit[kit1] > 0);
  const kon = [["hilang tanpa catatan", {ubah: [{id: a.id, kondisi: "hilang"}]}], ["kondisi liar", {ubah: [{id: a.id, kondisi: "rusak"}]}], ["kode BOM 'pompa'", {baru: [{kode_bom: "pompa", nama: "Pompa", jumlah: 1, satuan: "unit"}]}],
    ["kode BOM 'P1'", {baru: [{kode_bom: "P1", nama: "Pompa", jumlah: 1, satuan: "unit"}]}], ["satuan liar", {baru: [{kode_bom: "X-902", nama: "Pompa", jumlah: 1, satuan: "kg"}]}], ["jumlah 0", {baru: [{kode_bom: "X-902", nama: "Pompa", jumlah: 0, satuan: "unit"}]}],
    ["komponen kit lain", {ubah: [{id: (await DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? LIMIT 1").bind(kit2).first()).id, kondisi: "baik"}]}], ["ubah kosong", {ubah: [{id: a.id}]}], ["badan kosong", {}],
    ["101 perubahan", {ubah: Array.from({length: 101}, () => ({id: a.id, kondisi: "baik"}))}], ["campuran 100 + 1", {ubah: Array.from({length: 100}, () => ({id: a.id, kondisi: "baik"})), baru: [{kode_bom: "X-903", nama: "Pompa", jumlah: 1, satuan: "unit"}]}]];
  for (const [ket, bd] of kon) { const x = await sip("POST", "/komponen/" + kit1, bd, pus.h); assert.equal(x.s, 400, `${ket}: ${x.t}`); }
  assert.equal(await hitung("sippa_komponen", "kode_bom IN ('pompa', 'P1', 'X-902', 'X-903')"), 0);
  assert.equal((await sip("POST", "/komponen/" + kit1, {ubah: [{id: a.id, kondisi: "baik"}]}, pim.h)).s, 403); assert.equal((await sip("POST", "/komponen/" + kit1, {ubah: [{id: a.id, kondisi: "baik"}]})).s, 401);
  assert.equal((await sip("POST", "/komponen/" + kit1, {ubah: [{id: a.id, kondisi: "baik"}]}, pus61.h)).s, 404);
  assert.equal((await sip("POST", "/komponen/0123456789abcdef", {baru: []}, pus.h)).s, 400, "badan tanpa perubahan");
  await isiLaju(koor.kunci, "sippa.tulis", 600); assert.equal((await sip("POST", "/komponen/" + kit1, {ubah: [{id: a.id, kondisi: "baik"}]}, koor.h)).s, 429);
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(koor.kunci).run();
});

/* ---------------------------------------------------------------- tugas dan kode */
let tg1, kode1, tg2, kode2, tg3, kode3;
const tugasBaru = async (o, h = pus.h) => { const r = await sip("POST", "/tugas", {nama_regu: "Regu Alfa", unsur: "manggala_agni", prov: "62", kab: "Kota Palangka Raya", berlaku_hari: 7, ...o}, h); return r; };
uji("POST /api/sippa/tugas: W 201 dengan kode 26 heks sekali dan tautan; hanya sha256 tersimpan; pimpinan 403; masukan liar 400; laju 60", async () => {
  const j0 = await jejak(), r = await tugasBaru({kit_id: kit1, lengan_dalam: 0});
  assert.equal(r.s, 201, r.t); cekKepala(r, "tugas"); assert.match(r.j.kode, /^[0-9a-f]{26}$/); assert.equal(r.j.tautan, "/pipa/lapangan#k=" + r.j.kode);
  tg1 = r.j.tugas.id; kode1 = r.j.kode; assert.equal(await jejak(), j0 + 1);
  const b = await DB.prepare("SELECT * FROM sippa_tugas WHERE id = ?").bind(tg1).first();
  assert.equal(b.kode_sha, sha256(kode1)); assert.ok(!JSON.stringify(b).includes(kode1), "kode polos tidak tersimpan"); assert.equal(b.kit_id, kit1); assert.equal(b.oleh, pus.kunci);
  assert.ok(Math.abs(b.berakhir - b.mulai - 7 * HARI) < 1000, "berlaku 7 hari persis"); assert.ok(Math.abs(b.mulai - Date.now()) < 60e3);
  const r2 = await tugasBaru({kit_id: kit2, lengan_dalam: 1, kompleks_id: "K12"}); assert.equal(r2.s, 201, r2.t); tg2 = r2.j.tugas.id; kode2 = r2.j.kode;
  const r3 = await tugasBaru({nama_regu: "Regu Tanpa Kit"}); assert.equal(r3.s, 201, r3.t); tg3 = r3.j.tugas.id; kode3 = r3.j.kode;
  assert.equal(await hitung("sippa_tugas", "kode_sha = ?", sha256(r3.j.kode)), 1);
  for (const [n, h] of [["pimpinan", pim.h], ["verifikator", ver.h]]) assert.equal((await tugasBaru({}, h)).s, 403, n);
  assert.equal((await tugasBaru({}, {})).s, 401);
  for (const [ket, o] of [["berlaku_hari 31", {berlaku_hari: 31}], ["berlaku_hari 0", {berlaku_hari: 0}], ["nama regu 1 huruf", {nama_regu: "A"}], ["unsur liar", {unsur: "swasta"}], ["prov liar", {prov: "6"}], ["kab 1 huruf", {kab: "X"}],
    ["kompleks liar", {kompleks_id: "Z1"}], ["lengan_dalam 2", {lengan_dalam: 2}], ["kit tidak ada", {kit_id: "0123456789abcdef"}], ["kit_id cacat", {kit_id: "xyz"}], ["hari pecahan", {berlaku_hari: 1.5}]]) {
    const x = await tugasBaru(o); assert.equal(x.s, 400, `${ket}: ${x.t}`);
  }
  assert.equal((await tugasBaru({prov: "61"}, pus61.h)).s, 201, "staf 61 menugaskan di provinsinya"); assert.equal((await tugasBaru({prov: "62"}, pus61.h)).s, 404, "di luar wilayah");
  await isiLaju(koor.kunci, "sippa.tugas", 60); assert.equal((await tugasBaru({}, koor.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(koor.kunci).run();
});
uji("GET /api/sippa/lapangan/saya: kode sah 200 tugas sendiri; kode salah/25 heks/dicabut/kedaluwarsa 403 dan tercatat; > 300 tebakan salah per IP 429; kode sah tetap lolos", async () => {
  const r = await sip("GET", "/lapangan/saya", undefined, {"x-kode": kode1}); assert.equal(r.s, 200, r.t); cekKepala(r, "saya");
  assert.equal(r.j.tugas.id, tg1); assert.equal(r.j.tugas.nama_regu, "Regu Alfa"); assert.equal(r.j.tugas.lengan_dalam, 0); assert.equal(r.j.tugas.prov, "62"); assert.ok(r.j.tugas.berakhir > Date.now());
  assert.equal(r.j.kit.kode, "SIPPA-101"); assert.equal(r.j.kit.status, "gudang"); assert.equal(r.j.kit.jenis, "gambut"); assert.ok(r.j.kit.komponen_ringkas); assert.deepEqual(r.j.petak, []); assert.equal(r.j.formulir_versi, FORMULIR_VERSI);
  assert.doesNotMatch(r.t, new RegExp(kode1 + "|kode_sha"), "jawaban tidak memuat kode"); assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": kode3})).j.kit, null, "tugas tanpa kit");
  const ipx = {"cf-connecting-ip": "203.0.113.7"}, kunci = sha256("garam-uji|203.0.113.7"), n0 = await hitung("laju_bnpb", "aksi = 'sippa.kode_gagal'");
  for (const k of [SB, {"x-kode": "0".repeat(25)}, {"x-kode": "g".repeat(26)}, {}, {"x-kode": kode1 + "0"}]) { const x = await sip("GET", "/lapangan/saya", undefined, {...k, ...ipx}); assert.equal(x.s, 403, JSON.stringify(k)); assert.ok(x.j.galat); }
  assert.equal(await hitung("laju_bnpb", "aksi = 'sippa.kode_gagal' AND kunci = ?", kunci), 5, "tiap tebakan salah dihitung"); assert.ok(await hitung("laju_bnpb", "aksi = 'sippa.kode_gagal'") >= n0 + 5);
  await isiLaju(kunci, "sippa.kode_gagal", 300);
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {...SB, ...ipx})).s, 429, "lewat 300 tebakan salah per jam per IP");
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": kode1, ...ipx})).s, 200, "kode sah tidak ikut terkunci");
  /* dicabut dan kedaluwarsa: 403 sama dengan kode salah */
  const c = await tugasBaru({nama_regu: "Regu Cabut"}), k = await tugasBaru({nama_regu: "Regu Lawas"}); assert.equal(c.s, 201); assert.equal(k.s, 201);
  const j0 = await jejak(), cb = await sip("POST", "/tugas-cabut/" + c.j.tugas.id, {}, pus.h); assert.equal(cb.s, 200, cb.t); assert.equal(await jejak(), j0 + 1);
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": c.j.kode})).s, 403, "dicabut");
  await DB.prepare("UPDATE sippa_tugas SET mulai = ?, berakhir = ? WHERE id = ?").bind(Date.now() - 2 * JAM, Date.now() - JAM, k.j.tugas.id).run();
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": k.j.kode})).s, 403, "kedaluwarsa");
  assert.equal((await sip("POST", "/tugas-cabut/" + c.j.tugas.id, {}, pus.h)).s, 200, "cabut ulang idempoten");
  for (const [n, h] of [["pimpinan", pim.h], ["tamu", {}]]) assert.equal((await sip("POST", "/tugas-cabut/" + tg3, {}, h)).s, n === "tamu" ? 401 : 403, n);
  assert.equal((await sip("POST", "/tugas-cabut/0123456789abcdef", {}, pus.h)).s, 404); assert.equal((await sip("POST", "/tugas-cabut/" + c.j.tugas.id, {}, pus61.h)).s, 404, "di luar wilayah");
  const kt = await sip("GET", "/kit/" + kit1, undefined, pus.h); assert.ok(kt.j.tugas.some(t => t.id === tg1)); assert.doesNotMatch(kt.t, new RegExp(kode1), "rincian kit tanpa kode");
});

/* ---------------------------------------------------------------- gerak dan tiba */
const gerak = (kit, b, h = pus.h) => sip("POST", "/gerak/" + kit, b, h);
const statusKit = async id => (await DB.prepare("SELECT status FROM sippa_kit WHERE id = ?").bind(id).first()).status;
let gRencana;
uji("POST /api/sippa/gerak/:id: W 201 menerapkan status; transisi tidak sah, eta 721, koordinat liar 400; hilang/pensiun/ditemukan/koreksi hanya M; K hanya kit tugasnya dan alasan gelar/bongkar/kembali", async () => {
  const j0 = await jejak();
  const r = await gerak(kit1, {alasan: "pra_posisi", ke_status: "depot", ke_lokasi: "Depot Kapuas", lat: -2.2, lon: 113.9, prov: "62", kab: "Pulang Pisau"}); assert.equal(r.s, 201, r.t); cekKepala(r, "gerak");
  assert.equal(r.j.gerak.dari_status, "gudang", "dari_status diisi server"); assert.equal(r.j.gerak.ke_status, "depot"); assert.equal(r.j.kit.status, "depot"); assert.equal(r.j.kit.lokasi, "Depot Kapuas"); assert.equal(r.j.gerak.oleh, pus.kunci);
  assert.equal(await statusKit(kit1), "depot"); assert.equal(await jejak(), j0 + 1);
  for (const [ket, b] of [["transisi tak sah depot>pensiun", {alasan: "servis", ke_status: "pensiun"}], ["alasan tak cocok transisi", {alasan: "gelar", ke_status: "gudang"}], ["eta 721", {alasan: "gelar", ke_status: "gelar", eta_jam: 721}],
    ["lat 99", {alasan: "gelar", ke_status: "gelar", lat: 99}], ["lon di luar Indonesia", {alasan: "gelar", ke_status: "gelar", lon: 10}], ["status liar", {alasan: "gelar", ke_status: "terbang"}], ["alasan liar", {alasan: "iseng", ke_status: "gelar"}],
    ["medan liar", {alasan: "gelar", ke_status: "gelar", sakti: 1}], ["pindah_banjir tanpa pengangkut", {alasan: "pindah_banjir", ke_status: "banjir", permintaan_dari: "BPBD"}], ["pindah_banjir tanpa permintaan", {alasan: "pindah_banjir", ke_status: "banjir", pengangkut: "yontp"}],
    ["rencana untuk alasan gelar", {alasan: "gelar", ke_status: "gelar", rencana: 1}], ["pengangkut liar", {alasan: "pindah_banjir", ke_status: "banjir", pengangkut: "ojek", permintaan_dari: "x"}], ["catatan 501", {alasan: "servis", ke_status: "servis", catatan: "c".repeat(501)}]]) {
    const x = await gerak(kit1, b); assert.equal(x.s, 400, `${ket}: ${x.t}`); assert.ok(x.j.galat);
  }
  assert.equal(await statusKit(kit1), "depot", "penolakan tidak mengubah status");
  /* hak: W alasan khusus M ditolak, M lolos */
  for (const a of [{alasan: "hilang", ke_status: "hilang", catatan: "tak ketemu"}, {alasan: "pensiun", ke_status: "pensiun"}, {alasan: "koreksi", ke_status: "gelar", catatan: "salah catat"}]) {
    assert.equal((await gerak(kit1, a)).s, 403, `W ${a.alasan}`); assert.equal((await gerak(kit1, a, koor.h)).s, 403, `W koordalops ${a.alasan}`); assert.equal((await gerak(kit1, a, GERBANG)).s, 403, `akun gerbang ${a.alasan}`);
  }
  assert.equal((await gerak(kit1, {alasan: "gelar", ke_status: "gelar"}, pim.h)).s, 403); assert.equal((await gerak(kit1, {alasan: "gelar", ke_status: "gelar"}, {})).s, 401); assert.equal((await gerak(kit1, {alasan: "gelar", ke_status: "gelar"}, ver.h)).s, 403);
  assert.equal((await gerak(kit1, {alasan: "gelar", ke_status: "gelar"}, pus61.h)).s, 404, "kit di luar wilayah");
  assert.equal((await gerak("0123456789abcdef", {alasan: "gelar", ke_status: "gelar"})).s, 404);
  assert.equal((await gerak(kit1, {alasan: "hilang", ke_status: "hilang"}, MOD2)).s, 400, "hilang wajib catatan"); assert.equal((await gerak(kit1, {alasan: "koreksi", ke_status: "gelar"}, MOD2)).s, 400, "koreksi wajib catatan");
  const h = await gerak(kit1, {alasan: "hilang", ke_status: "hilang", catatan: "hilang di jalan"}, MOD2); assert.equal(h.s, 201, h.t); assert.equal(await statusKit(kit1), "hilang"); assert.equal(h.j.gerak.oleh, MOD);
  assert.equal((await gerak(kit1, {alasan: "kembali", ke_status: "gudang"})).s, 400, "hilang>gudang hanya alasan ditemukan");
  const f = await gerak(kit1, {alasan: "ditemukan", ke_status: "gudang"}, MOD2); assert.equal(f.s, 201, f.t); assert.equal(await statusKit(kit1), "gudang");
  const kr = await gerak(kit1, {alasan: "koreksi", ke_status: "depot", catatan: "kembali ke depot"}, ADMIN); assert.equal(kr.s, 201, kr.t); assert.equal(await statusKit(kit1), "depot");
  assert.equal((await gerak(kit2, {alasan: "servis", ke_status: "servis"})).s, 201); assert.equal((await gerak(kit2, {alasan: "pensiun", ke_status: "pensiun"}, MOD2)).s, 201); assert.equal(await statusKit(kit2), "pensiun");
  assert.equal((await gerak(kit2, {alasan: "koreksi", ke_status: "gudang", catatan: "tidak sah dari pensiun"}, ADMIN)).s, 400, "pensiun terminal: tak ada transisi keluar");
  /* K: kode tugas tg1 terikat kit1 */
  const K = {"x-kode": kode1}, j1 = await jejak();
  const k1 = await gerak(kit1, {alasan: "gelar", ke_status: "gelar", lat: -2.3, lon: 113.8}, K); assert.equal(k1.s, 201, k1.t); assert.equal(k1.j.gerak.oleh, "tugas:" + tg1); assert.equal(k1.j.gerak.tugas_id, tg1); assert.equal(await statusKit(kit1), "gelar");
  assert.equal(await jejak(), j1 + 1, "gerak operator juga berjejak");
  for (const [ket, kit, b, h] of [["alasan pindah_banjir", kit1, {alasan: "pindah_banjir", ke_status: "banjir", pengangkut: "yontp", permintaan_dari: "x"}, K], ["alasan pra_posisi", kit1, {alasan: "pra_posisi", ke_status: "depot"}, K], ["alasan servis", kit1, {alasan: "servis", ke_status: "servis"}, K],
    ["alasan hilang", kit1, {alasan: "hilang", ke_status: "hilang", catatan: "x"}, K], ["kit lain", kit3, {alasan: "gelar", ke_status: "gelar"}, K], ["tugas tanpa kit", kit1, {alasan: "kembali", ke_status: "gudang"}, {"x-kode": kode3}], ["kode salah", kit1, {alasan: "kembali", ke_status: "gudang"}, SB]]) {
    const x = await gerak(kit, b, h); assert.equal(x.s, 403, `K ${ket}: ${x.t}`); assert.ok(x.j.galat);
  }
  assert.equal(await statusKit(kit1), "gelar"); assert.equal(await statusKit(kit3), "gudang");
  const bk = await gerak(kit1, {alasan: "bongkar", ke_status: "depot"}, K); assert.equal(bk.s, 201, bk.t); const kb = await gerak(kit1, {alasan: "kembali", ke_status: "gudang"}, K); assert.equal(kb.s, 201, kb.t); assert.equal(await statusKit(kit1), "gudang");
  assert.equal((await gerak(kit1, {alasan: "gelar", ke_status: "depot"}, K)).s, 400, "transisi tak sah untuk K juga 400");
  await isiLaju("tugas:" + tg1, "sippa.lapangan", 120); assert.equal((await gerak(kit1, {alasan: "gelar", ke_status: "gelar"}, K)).s, 429, "K 120 per jam per tugas"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind("tugas:" + tg1).run();
  await isiLaju(pus.kunci, "sippa.tulis", 600); assert.equal((await gerak(kit1, {alasan: "gelar", ke_status: "gelar"})).s, 429, "W 600 per jam"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pus.kunci).run();
});
uji("gerak terencana: kit tetap di status lama, gerak lain 409, kit terlihat provinsi tujuan, POST /tiba/:id sekali (W atau K kit tugasnya); dua staf serentak = satu 201 satu 409", async () => {
  const j0 = await jejak();
  const r = await gerak(kit1, {alasan: "pindah_banjir", ke_status: "banjir", rencana: 1, pengangkut: "yontp", permintaan_dari: "BPBD Kalsel", eta_jam: 48, prov: "61", kab: "Banjar"}); assert.equal(r.s, 201, r.t);
  gRencana = r.j.gerak.id; assert.equal(r.j.gerak.rencana, 1); assert.equal(r.j.gerak.tiba, null); assert.equal(r.j.kit.status, "gudang", "rencana: status belum berubah"); assert.equal(r.j.kit.prov, "62"); assert.equal(await jejak(), j0 + 1);
  for (const b of [{alasan: "gelar", ke_status: "gelar"}, {alasan: "servis", ke_status: "servis"}]) { const x = await gerak(kit1, b); assert.equal(x.s, 409, x.t); assert.ok(x.j.galat); }
  assert.equal((await gerak(kit1, {alasan: "gelar", ke_status: "gelar"}, {"x-kode": kode1})).s, 409, "operator juga 409 selama rencana terbuka");
  const l = await sip("GET", "/kit", undefined, pus61.h), k = l.j.kit.find(x => x.id === kit1); assert.ok(k, "provinsi tujuan 61 melihat kit selama gerak terbuka"); assert.equal(k.gerak_buka.ke_status, "banjir"); assert.equal(k.gerak_buka.eta_jam, 48);
  assert.equal((await sip("GET", "/kit/" + kit1, undefined, pus61.h)).s, 200, "rincian juga terlihat provinsi tujuan");
  /* tiba */
  const g2 = await gerak(kit3, {alasan: "gelar", ke_status: "gelar"}); assert.equal(g2.s, 201);   // gerak langsung rencana 0 untuk uji "bukan rencana"
  assert.equal((await sip("POST", "/tiba/" + g2.j.gerak.id, {}, pus.h)).s, 400, "gerak langsung bukan rencana");
  for (const [n, h, kodeS] of [["pimpinan", pim.h, 403], ["tamu", {}, 401], ["K kit lain", {"x-kode": kode2}, 403], ["kode salah", SB, 403], ["verifikator", ver.h, 403]]) assert.equal((await sip("POST", "/tiba/" + gRencana, {}, h)).s, kodeS, n);
  const t = await sip("POST", "/tiba/" + gRencana, {}, {"x-kode": kode1}); assert.equal(t.s, 200, t.t); assert.equal(t.j.kit.status, "banjir"); assert.equal(t.j.kit.prov, "61"); assert.ok(t.j.gerak.tiba > 0); assert.equal(await jejak(), j0 + 3, "tiba juga berjejak");
  assert.equal((await sip("POST", "/tiba/" + gRencana, {}, pus.h)).s, 409, "tiba sudah terisi"); assert.equal((await sip("POST", "/tiba/0123456789abcdef", {}, pus.h)).s, 404);
  assert.equal(await statusKit(kit1), "banjir");
  await isiLaju(pus.kunci, "sippa.tiba", 120); assert.equal((await sip("POST", "/tiba/" + gRencana, {}, pus.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pus.kunci).run();
  /* tiba W: rencana kedua pada kit lain, lalu status kit diubah oleh jalur lain = 409 */
  const r2 = await gerak(kit3, {alasan: "pindah_banjir", ke_status: "banjir", rencana: 1, pengangkut: "bpbd", permintaan_dari: "BPBD Kalsel", eta_jam: 5}); assert.equal(r2.s, 201, r2.t); const w = await sip("POST", "/tiba/" + r2.j.gerak.id, {}, koor.h); assert.equal(w.s, 200, w.t); assert.equal(await statusKit(kit3), "banjir");
  /* kendali konkurensi: dua staf serentak dari status yang sama */
  const ser = await Promise.all([gerak(kit3, {alasan: "gelar", ke_status: "gelar"}), gerak(kit3, {alasan: "kembali", ke_status: "gudang"}, koor.h)]);
  /* workerd dan D1 lokal melayani berurutan, jadi balapan sungguhan tidak bisa dipaksa; yang dijamin: tidak pernah dua gerak dari status yang sama (201 atau 409, rantai dari_status tak putus) */
  assert.ok(ser.every(x => x.s === 201 || x.s === 409), ser.map(x => x.s + " " + x.t).join(" | ")); assert.ok(ser.some(x => x.s === 201), "paling sedikit satu menang");
  const rantai = (await DB.prepare("SELECT dari_status, ke_status FROM sippa_gerak WHERE kit_id = ? ORDER BY rowid").bind(kit3).all()).results;
  assert.equal(rantai.length, 2 + ser.filter(x => x.s === 201).length, "tiap 201 satu baris, tiap 409 nol baris");
  rantai.slice(1).forEach((g, i) => assert.equal(g.dari_status, rantai[i].ke_status, `rantai gerak putus di langkah ${i + 2}: ${JSON.stringify(rantai)}`)); assert.equal(await statusKit(kit3), rantai.at(-1).ke_status);
});

/* ---------------------------------------------------------------- lapangan: kirim */
uji("POST /api/sippa/lapangan/kirim: butir sah diterima; kirim ulang = ganda dan satu baris; butir salah ditolak per butir; id bukan UUID v4; probe 150+ cm hanya lengan_dalam; jam meleset ditandai", async () => {
  const K = kode1, j0 = await jejak(), id = {log: uuid(), p1: uuid(), p2: uuid(), b1: uuid()};
  const sah = {log: [logB({id: id.log})], probe: [probeB({id: id.p1, log_id: id.log, tahap: "sebelum"}), probeB({id: id.p2, log_id: id.log, tahap: "sesudah", kedalaman_cm: 50, suhu_c: 38})], bbm: [bbmB({id: id.b1, log_id: id.log})]};
  const r = await kirim(K, sah); assert.equal(r.s, 200, r.t); cekKepala(r, "kirim"); assert.deepEqual(r.j.diterima.sort(), [id.log, id.p1, id.p2, id.b1].sort()); assert.deepEqual(r.j.ganda, []); assert.deepEqual(r.j.ditolak, []);
  assert.ok(Math.abs(r.j.jam_server - Date.now()) < 60e3); assert.equal(await jejak(), j0 + 1, "satu baris jejak ringkas per kiriman");
  const lg = await DB.prepare("SELECT * FROM sippa_log_gelar WHERE id = ?").bind(id.log).first();
  assert.equal(lg.tugas_id, tg1); assert.equal(lg.kit_id, kit1); assert.equal(lg.prov, "62"); assert.equal(lg.oleh, "tugas:" + tg1); assert.equal(lg.dummy, 0); assert.equal(lg.jam_klien_meleset, 0); assert.ok(Math.abs(lg.diterima - Date.now()) < 60e3);
  assert.equal((await DB.prepare("SELECT tugas_id, oleh FROM sippa_probe WHERE id = ?").bind(id.p1).first()).tugas_id, tg1); assert.equal((await DB.prepare("SELECT kit_id, oleh FROM sippa_bbm WHERE id = ?").bind(id.b1).first()).kit_id, kit1);
  const lagi = await kirim(K, sah); assert.equal(lagi.s, 200); assert.deepEqual(lagi.j.diterima, []); assert.deepEqual(lagi.j.ganda.sort(), [id.log, id.p1, id.p2, id.b1].sort(), "kirim ulang = ganda");
  assert.equal(await hitung("sippa_log_gelar", "id = ?", id.log), 1); assert.equal(await hitung("sippa_probe", "log_id = ?", id.log), 2); assert.equal(await hitung("sippa_bbm", "log_id = ?", id.log), 1);
  /* butir salah: ditolak per butir, yang sah dalam badan yang sama tetap diterima */
  const lanjut = logB(), x = {log: [lanjut, logB({id: "bukan-uuid"}), logB({id: "3f1c2a9e-4b6d-3e2a-9f10-6c2b8d7e1a55"}), logB({t_selesai: T0 - 1}), logB({jenis: "liar"}), logB({banjir_m3: 5}), logB({sakti: 1})],
    probe: [probeB({kedalaman_cm: 600}), probeB({kedalaman_cm: 300}), probeB({suhu_c: 901}), probeB({tahap: "besok"})], bbm: [bbmB({liter: 0}), bbmB({jenis: "avtur"})]};
  const s = await kirim(K, x); assert.equal(s.s, 200, s.t); assert.deepEqual(s.j.diterima, [lanjut.id]); assert.equal(s.j.ditolak.length, x.log.length - 1 + x.probe.length + x.bbm.length, JSON.stringify(s.j.ditolak));
  const alasan = new Map(s.j.ditolak.map(d => [d.id, d.alasan])); assert.match(alasan.get("bukan-uuid"), /UUID/i); assert.match(alasan.get("3f1c2a9e-4b6d-3e2a-9f10-6c2b8d7e1a55"), /UUID/i, "versi 3 bukan v4");
  assert.match(alasan.get(x.probe[0].id), /kedalaman_cm/); assert.match(alasan.get(x.probe[1].id), /lengan|kedalaman/i, "probe 300 cm dari tugas tanpa lengan dalam"); assert.ok(s.j.ditolak.every(d => d.alasan && d.alasan.length > 5));
  assert.equal(await hitung("sippa_probe", "kedalaman_cm IN (300, 600)"), 0);
  const kur = await kirim(K, {log: Array.from({length: 201}, () => logB())}); assert.equal(kur.s, 400, "201 butir"); assert.ok(kur.j.galat);
  assert.equal((await kirim(K, {log: "x"})).s, 400); assert.equal((await kirim(K, {probe: {}})).s, 400); assert.equal((await sip("POST", "/lapangan/kirim", "bukan json", {"x-kode": K})).s, 400);
  const mel = logB({id: uuid()}), m = await kirim(K, {jam_kirim: Date.now() + 11 * 60e3, log: [mel]}); assert.equal(m.s, 200); assert.deepEqual(m.j.diterima, [mel.id]); assert.equal((await DB.prepare("SELECT jam_klien_meleset j FROM sippa_log_gelar WHERE id = ?").bind(mel.id).first()).j, 1, "jam perangkat 11 menit di depan = meleset, tetap diterima");
  const dep = logB({waktu_klien: Date.now() + 11 * 60e3}), d = await kirim(K, {log: [dep]}); assert.deepEqual(d.j.diterima, [dep.id]); assert.equal((await DB.prepare("SELECT jam_klien_meleset j FROM sippa_log_gelar WHERE id = ?").bind(dep.id).first()).j, 1, "waktu_klien di depan = meleset");
  const lama = logB({waktu_klien: Date.now() - 20 * HARI, t_tiba: T0 - 20 * HARI}), lm = await kirim(K, {log: [lama]}); assert.deepEqual(lm.j.diterima, [lama.id]); assert.equal((await DB.prepare("SELECT jam_klien_meleset j FROM sippa_log_gelar WHERE id = ?").bind(lama.id).first()).j, 0, "antrean luring berjam-jam bukan meleset");
  const nj = logB(), tn = await sip("POST", "/lapangan/kirim", {log: [nj]}, {"x-kode": K}); assert.deepEqual(tn.j.diterima, [nj.id]); assert.equal((await DB.prepare("SELECT jam_klien_meleset j FROM sippa_log_gelar WHERE id = ?").bind(nj.id).first()).j, 1, "tanpa jam_kirim = meleset");
  /* lengan dalam: tugas tg2 (kit mineral sudah pensiun; kirim log dan probe tetap sah) */
  const lp = probeB({kedalaman_cm: 300}), ld = await kirim(kode2, {probe: [lp, probeB({kedalaman_cm: 500, titik: "T2"}), probeB({kedalaman_cm: 600, titik: "T3"})]}); assert.equal(ld.s, 200, ld.t); assert.equal(ld.j.diterima.length, 2, "300 dan 500 cm sah untuk lengan_dalam"); assert.equal(ld.j.ditolak.length, 1);
  /* kode salah dan tanpa kode */
  assert.equal((await kirim("0".repeat(26), {log: [logB()]})).s, 403); assert.equal((await sip("POST", "/lapangan/kirim", {log: []}, {})).s, 403);
});
uji("kirim: gerak operator hanya untuk kit tugasnya; gerak yang ditolak trigger memisah dari butir sah; kit dipindah staf lebih dulu = ditolak dengan pesan; batas 413 dan laju 120 per tugas", async () => {
  assert.equal(await statusKit(kit1), "banjir", "kit1 sedang di banjir (uji terencana)");
  const k1 = await gerak(kit1, {alasan: "kembali", ke_status: "gudang"}); assert.equal(k1.s, 201);
  const g1 = gerakB({alasan: "gelar", ke_status: "gelar"}), g2 = gerakB({alasan: "kembali", ke_status: "gudang"}), lg = logB();
  const r = await kirim(kode1, {log: [lg], gerak: [g1, g2]}); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.diterima.sort(), [lg.id, g1.id, g2.id].sort(), JSON.stringify(r.j)); assert.equal(await statusKit(kit1), "gudang", "dua gerak berurutan: gelar lalu kembali");
  const rows = (await DB.prepare("SELECT dari_status, ke_status, oleh FROM sippa_gerak WHERE id IN (?, ?) ORDER BY waktu, rowid").bind(g1.id, g2.id).all()).results; assert.ok(rows.every(x => x.oleh === "tugas:" + tg1));
  assert.equal(await hitung("sippa_gerak", "id IN (?, ?) AND kit_id = ?", g1.id, g2.id, kit1), 2, "hanya kit tugas");
  const ulang = await kirim(kode1, {gerak: [g1, g2]}); assert.deepEqual(ulang.j.ganda.sort(), [g1.id, g2.id].sort(), "kirim ulang gerak = ganda, bukan ditolak trigger"); assert.equal(await statusKit(kit1), "gudang");
  /* alasan terlarang, tugas tanpa kit */
  const bad = gerakB({alasan: "pindah_banjir", ke_status: "banjir", pengangkut: "yontp", permintaan_dari: "x"}), pb = await kirim(kode1, {gerak: [bad]}); assert.deepEqual(pb.j.ditolak.map(d => d.id), [bad.id]); assert.match(pb.j.ditolak[0].alasan, /gelar|bongkar|kembali/);
  const nk = gerakB(), tk = await kirim(kode3, {gerak: [nk]}); assert.deepEqual(tk.j.ditolak.map(d => d.id), [nk.id]); assert.equal(await hitung("sippa_gerak", "id = ?", nk.id), 0);
  /* staf memindah kit lebih dulu (gerak rencana terbuka): gerak operator ditolak trigger, log di badan yang sama tetap masuk */
  const open = await gerak(kit1, {alasan: "pra_posisi", ke_status: "depot", rencana: 1, eta_jam: 3}); assert.equal(open.s, 201);
  const g3 = gerakB({alasan: "gelar", ke_status: "gelar"}), l3 = logB(), m = await kirim(kode1, {log: [l3], gerak: [g3]}); assert.equal(m.s, 200, m.t); assert.deepEqual(m.j.diterima, [l3.id]); assert.deepEqual(m.j.ditolak.map(d => d.id), [g3.id]);
  assert.match(m.j.ditolak[0].alasan, /sippa_gerak_cek|status kit|dipindah/i, m.j.ditolak[0].alasan); assert.equal(await hitung("sippa_log_gelar", "id = ?", l3.id), 1, "butir sah tidak ikut batal");
  assert.equal((await sip("POST", "/tiba/" + open.j.gerak.id, {}, pus.h)).s, 200); assert.equal(await statusKit(kit1), "depot");
  /* ukuran: 262.144 byte masih lolos, 262.145 = 413 */
  const awal = '{"jam_kirim":1,"pad":"', akhir = '"}', pad = n => awal + "a".repeat(n - awal.length - akhir.length) + akhir;
  const ok = await sip("POST", "/lapangan/kirim", pad(262144), {"x-kode": kode1}); assert.equal(ok.s, 200, ok.t.slice(0, 120));
  const besar = await sip("POST", "/lapangan/kirim", pad(262145), {"x-kode": kode1}); assert.equal(besar.s, 413, besar.t.slice(0, 120)); assert.ok(besar.j.galat);
  /* laju 120 per tugas; tugas lain tetap lolos */
  await isiLaju("tugas:" + tg1, "sippa.lapangan", 120); const l = await kirim(kode1, {log: [logB()]}); assert.equal(l.s, 429, l.t);
  assert.equal((await kirim(kode2, {log: []})).s, 200, "tugas lain tetap lolos"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind("tugas:" + tg1).run();
});

/* ---------------------------------------------------------------- foto */
let fotoId;
uji("POST /api/sippa/lapangan/foto: JPEG sah 201 tanpa EXIF, kunci R2 dari server; PNG, GIF, HTML ber-nama .jpg 400; tanpa kode 403; 8.388.609 byte 413; laju 60", async () => {
  const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi], te = t => [...new TextEncoder().encode(t)];
  const jpg = new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...te("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...seg(0xe1, [...te("Exif"), 0, 0, ...te("GPS-LOKASI-RAHASIA")]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(300).fill(7), 0xff, 0xd9]);
  const j0 = await jejak(), r = await foto(kode1, jpg); assert.equal(r.s, 201, r.t); assert.match(r.j.foto_id, /^[0-9a-f]{16}$/); fotoId = r.j.foto_id;
  const o = await R2.get("sippa-foto/" + fotoId); assert.ok(o, "kunci R2 sippa-foto/<id> dari server"); const b = new Uint8Array(await o.arrayBuffer());
  assert.ok(b.length > 0 && !new TextDecoder("latin1").decode(b).includes("GPS-LOKASI-RAHASIA"), "EXIF dibuang"); assert.equal(o.httpMetadata.contentType, "image/jpeg");
  const br = await DB.prepare("SELECT * FROM sippa_foto WHERE id = ?").bind(fotoId).first(); assert.equal(br.tugas_id, tg1); assert.equal(br.prov, "62"); assert.equal(br.mime, "image/jpeg"); assert.equal(br.ukuran, b.length); assert.equal(br.oleh, "tugas:" + tg1); assert.equal(await jejak(), j0 + 1);
  const w = await foto(kode1, WEBP_SAH); assert.equal(w.s, 201, w.t); assert.equal((await R2.get("sippa-foto/" + w.j.foto_id)).httpMetadata.contentType, "image/webp");
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(100).fill(0)]), gif = new Uint8Array([...te("GIF89a"), ...Array(100).fill(0)]), htm = new TextEncoder().encode("<html><script>alert(1)</script></html>");
  for (const [n, d] of [["PNG", png], ["GIF", gif], ["HTML .jpg", htm], ["kosong", new Uint8Array(0)]]) { const x = await foto(kode1, d); assert.equal(x.s, 400, `${n}: ${x.t}`); assert.ok(x.j.galat); }
  assert.equal((await foto("0".repeat(26))).s, 403);
  const tanpa = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/lapangan/foto", {method: "POST", body: new Uint8Array(10)}); assert.equal(tanpa.status, 403); await tanpa.text();
  const besar = new Uint8Array(8388609); besar.set(JPEG_SAH); const x = await foto(kode1, besar); assert.equal(x.s, 413, x.t.slice(0, 100));
  const nama = new FormData(); nama.append("berkas", new File([JPEG_SAH], "../../x.jpg")); nama.append("kunci", "foto/curang"); const {body, headers} = await badanPanjang(nama, {"x-kode": kode1});
  const cur = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/lapangan/foto", {method: "POST", body, headers}); const cj = await cur.json(); assert.equal(cur.status, 201); assert.equal(await R2.get("foto/curang"), null, "kunci dari klien diabaikan");
  assert.equal(cj.foto_id.length, 16);
  await isiLaju("tugas:" + tg1, "sippa.foto", 60); assert.equal((await foto(kode1)).s, 429); assert.equal((await foto(kode2)).s, 201, "tugas lain lolos"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind("tugas:" + tg1).run();
});
uji("GET /api/sippa/foto/:id: B 200 dengan content-type dari baris; wilayah 61 untuk foto 62 = 404 identik; tamu 401; verifikator 403", async () => {
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/foto/" + fotoId, {headers: pim.h}); const b = new Uint8Array(await r.arrayBuffer());
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/jpeg"); assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.equal(r.headers.get("content-disposition"), "inline"); assert.equal(r.headers.get("cache-control"), "private, max-age=3600"); assert.ok(b.length > 100);
  const w = await sip("GET", "/foto/" + fotoId, undefined, pus61.h), z = await sip("GET", "/foto/0123456789abcdef", undefined, pus61.h); assert.equal(w.s, 404); assert.equal(w.t, z.t, "404 identik");
  assert.equal((await sip("GET", "/foto/" + fotoId)).s, 401); assert.equal((await sip("GET", "/foto/" + fotoId, undefined, ver.h)).s, 403); assert.equal((await sip("GET", "/foto/0123456789abcdef", undefined, pus.h)).s, 404);
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": kode1})).s, 200);
});

/* ---------------------------------------------------------------- log, CSV */
let logStaf;
uji("POST /api/sippa/log: W 201 dari kertas G3-lite dengan id server; urutan waktu terbalik 400; pimpinan 403; wilayah 61 untuk prov 62 404; laju 600", async () => {
  const j0 = await jejak(), b = {jenis: "latihan", kelas_medan: "I", petak_id: "PETAK-K1", panjang_m: 120, n_orang: 6, t_tiba: T0, t_mulai_gelar: T0 + 60e3, t_air_mengalir: T0 + JAM, t_selesai: T0 + 3 * JAM, jam_pompa: 2, bbm_l: 88, air_m3: 36,
    lat: -2.12345, lon: 113.98765, catatan: "=HYPERLINK(\"http://x\")", prov: "62", kit_id: kit1};
  const r = await sip("POST", "/log", b, pus.h); assert.equal(r.s, 201, r.t); cekKepala(r, "log"); logStaf = r.j.log.id; assert.match(logStaf, /^[0-9a-f]{16}$/, "id 16 heks dari server"); assert.equal(await jejak(), j0 + 1);
  const row = await DB.prepare("SELECT * FROM sippa_log_gelar WHERE id = ?").bind(logStaf).first(); assert.equal(row.oleh, pus.kunci); assert.equal(row.prov, "62"); assert.equal(row.kit_id, kit1); assert.equal(row.jam_klien_meleset, 0); assert.equal(row.dummy, 0); assert.equal(row.tugas_id, null);
  const sendiri = await sip("POST", "/log", {...b, id: "ffffffffffffffff", catatan: null}, pus.h); assert.equal(sendiri.s, 201); assert.notEqual(sendiri.j.log.id, "ffffffffffffffff", "id dari klien diabaikan");
  for (const [ket, o] of [["urutan terbalik", {t_selesai: T0 - 1}], ["jenis liar", {jenis: "udara"}], ["medan liar", {sakti: 1}], ["kelas liar", {kelas_medan: "IV"}], ["panjang 5001", {panjang_m: 5001}], ["banjir_m3 untuk latihan", {banjir_m3: 3}], ["prov cacat", {prov: "6"}], ["kit cacat", {kit_id: "x"}], ["lat 99", {lat: 99}], ["petak 2 huruf", {petak_id: "ab"}]]) {
    const x = await sip("POST", "/log", {...b, ...o}, pus.h); assert.equal(x.s, 400, `${ket}: ${x.t}`); assert.ok(x.j.galat);
  }
  assert.equal((await sip("POST", "/log", b, pim.h)).s, 403); assert.equal((await sip("POST", "/log", b, ver.h)).s, 403); assert.equal((await sip("POST", "/log", b)).s, 401);
  assert.equal((await sip("POST", "/log", b, pus61.h)).s, 404, "staf 61 menulis prov 62"); assert.equal((await sip("POST", "/log", {...b, prov: "61", kit_id: undefined}, pus61.h)).s, 201);
  await isiLaju(koor.kunci, "sippa.tulis", 600); assert.equal((await sip("POST", "/log", b, koor.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(koor.kunci).run();
});
uji("GET /api/sippa/log: B 200 urut, filter, terpotong; filter liar dan sejak > sampai 400; tamu 401; wilayah 61 hanya miliknya", async () => {
  const r = await sip("GET", "/log", undefined, pim.h); assert.equal(r.s, 200, r.t); cekKepala(r, "log"); assert.equal(r.j.n, r.j.log.length); assert.equal(r.j.terpotong, false); assert.ok(r.j.log.length >= 8);
  const t = r.j.log.map(x => x.t_tiba ?? x.waktu_klien); assert.deepEqual(t, [...t].sort((a, b) => a - b), "urut waktu naik"); assert.ok(r.j.log.some(x => x.id === logStaf));
  assert.ok((await sip("GET", "/log?jenis=latihan", undefined, pim.h)).j.log.every(x => x.jenis === "latihan")); assert.ok((await sip("GET", "/log?kelas=II", undefined, pim.h)).j.log.every(x => x.kelas_medan === "II"));
  assert.ok((await sip("GET", "/log?kit=" + kit1, undefined, pim.h)).j.log.every(x => x.kit_id === kit1)); assert.equal((await sip("GET", `/log?sejak=${T0 + 1}&sampai=${T0 + 2}`, undefined, pim.h)).j.n >= 0, true);
  for (const q of ["jenis=udara", "kelas=IV", "sejak=abc", `sejak=${T0 + 5}&sampai=${T0}`, "kit=xyz", "sampai=-"]) assert.equal((await sip("GET", "/log?" + q, undefined, pim.h)).s, 400, q);
  assert.equal((await sip("GET", "/log")).s, 401); assert.equal((await sip("GET", "/log", undefined, ver.h)).s, 403);
  const w = await sip("GET", "/log", undefined, pus61.h); assert.ok(w.j.log.every(x => x.prov === "61") && w.j.log.length >= 1, "wilayah 61 hanya baris provinsi 61");
  assert.ok(!r.t.includes(kode1), "log tidak memuat kode penugasan");
});
uji("GET log.csv dan probe.csv: CSV aman injeksi rumus, koordinat dibulatkan 0,01 kecuali presisi=penuh (hanya W), nama berkas bertanggal, laju 60", async () => {
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/log.csv", {headers: pim.h}); const t = await r.text();
  assert.equal(r.status, 200, t.slice(0, 100)); assert.match(r.headers.get("content-type"), /^text\/csv; charset=utf-8/); assert.match(r.headers.get("content-disposition"), /^attachment; filename="sippa-log-\d{8}\.csv"$/); assert.equal(r.headers.get("cache-control"), "private, no-store");
  const baris = t.trim().split("\r\n"), kepala = baris[0].split(","); assert.ok(kepala.includes("id") && kepala.includes("lat") && kepala.includes("catatan") && kepala.includes("t_tiba")); assert.ok(baris.length >= 9);
  assert.ok(t.includes(`"'=HYPERLINK(""http://x"")"`) || t.includes(`'=HYPERLINK(`), "sel berawalan = diberi apostrof"); assert.doesNotMatch(t, /(^|,)=HYPERLINK/m, "tidak ada sel berawalan = mentah");
  assert.match(t, /(^|,)-2\.12(,|\r|$)/m, "lat -2.12345 dibulatkan 0,01 dan angka negatif tidak diberi apostrof"); assert.match(t, /(^|,)113\.99(,|\r|$)/m); assert.doesNotMatch(t, /-2\.12345|113\.98765/);
  const kecil = await sip("POST", "/log", {jenis: "latihan", catatan: "+62 8123", prov: "62", lat: -2.5, lon: 113.5}, pus.h); assert.equal(kecil.s, 201);
  for (const awal of ["+", "-", "@", "\t", "\r"]) { const x = await sip("POST", "/log", {jenis: "latihan", catatan: awal + "x", prov: "62"}, pus.h); assert.equal(x.s, 201, awal); }
  const t2 = await (await mf.dispatchFetch("http://bnpb.lokal/api/sippa/log.csv", {headers: pus.h})).text(); assert.match(t2, /'\+62 8123/); assert.match(t2, /'-x/); assert.match(t2, /'@x/); assert.match(t2, /'\tx/); assert.match(t2, /"'\rx"/);
  const penuh = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/log.csv?presisi=penuh", {headers: pus.h}); const pt = await penuh.text(); assert.equal(penuh.status, 200); assert.match(pt, /-2\.12345/); assert.match(pt, /113\.98765/);
  const tolak = await sip("GET", "/log.csv?presisi=penuh", undefined, pim.h); assert.equal(tolak.s, 403, "presisi penuh hanya W"); assert.equal((await sip("GET", "/log.csv")).s, 401); assert.equal((await sip("GET", "/log.csv?jenis=udara", undefined, pim.h)).s, 400);
  assert.equal((await sip("GET", "/log.csv?sejak=9&sampai=1", undefined, pim.h)).s, 400);
  const pr = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/probe.csv", {headers: pim.h}); const pc = await pr.text();
  assert.equal(pr.status, 200); assert.match(pr.headers.get("content-disposition"), /^attachment; filename="sippa-probe-\d{8}\.csv"$/); assert.match(pr.headers.get("content-type"), /^text\/csv; charset=utf-8/);
  const pk = pc.trim().split("\r\n"); assert.equal(pk[0], "id,log_id,tugas_id,petak_id,titik,tahap,kedalaman_cm,suhu_c,waktu,oleh"); assert.ok(pk.length >= 3, "probe dari kiriman lapangan"); assert.ok(pk.slice(1).every(b => b.split(",").length >= 10));
  assert.equal((await sip("GET", "/probe.csv?petak=PETAK-1", undefined, pim.h)).s, 200); assert.equal((await sip("GET", "/probe.csv?tugas=xyz", undefined, pim.h)).s, 400); assert.equal((await sip("GET", "/probe.csv?sejak=b", undefined, pim.h)).s, 400); assert.equal((await sip("GET", "/probe.csv")).s, 401);
  const wp = await (await mf.dispatchFetch("http://bnpb.lokal/api/sippa/probe.csv", {headers: pus61.h})).text(); assert.equal(wp.trim().split("\r\n").length, 1, "wilayah 61 tidak melihat probe tugas prov 62");
  /* laju 60 per jam per pelaku; GET lain tidak dihitung */
  await isiLaju(pim.kunci, "sippa.csv", 60); assert.equal((await sip("GET", "/log.csv", undefined, pim.h)).s, 429); assert.equal((await sip("GET", "/probe.csv", undefined, pim.h)).s, 429); assert.equal((await sip("GET", "/log", undefined, pim.h)).s, 200, "JSON tidak dibatasi");
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pim.kunci).run();
});

/* ---------------------------------------------------------------- invarian lintas rute */
uji("invarian: kode penugasan tidak pernah muncul di jawaban GET mana pun; semua galat berbentuk {galat} tanpa jejak tumpukan; tulis sukses menambah jejak", async () => {
  const GET = ["/kit", "/kit/" + kit1, "/kit/" + kit2, "/log", "/log.csv", "/probe.csv", "/lapangan/saya"];
  for (const j of GET) for (const h of [pim.h, ADMIN, {"x-kode": kode1}]) { const x = await mf.dispatchFetch("http://bnpb.lokal/api/sippa" + j, {headers: h}); const t = await x.text(); for (const k of [kode1, kode2, kode3]) assert.ok(!t.includes(k), `${j}: memuat kode penugasan`); assert.doesNotMatch(t, /sha256\(|kode_sha/); }
  const galat = [await sip("GET", "/kit"), await sip("POST", "/kit", {}, pus.h), await sip("GET", "/kit/0123456789abcdef", undefined, pim.h), await sip("POST", "/gerak/" + kit1, {alasan: 5}, pus.h), await sip("POST", "/tugas", "bukan json", pus.h)];
  for (const g of galat) { assert.ok(g.s >= 400 && g.s < 500, `${g.s} ${g.t}`); assert.deepEqual(Object.keys(g.j), ["galat"], g.t); assert.doesNotMatch(g.t, /\bat\s+\S+\(|Error:|SQLITE|D1_ERROR/); }
  const m = await sip("POST", "/gerak/" + kit1, {alasan: "gelar", ke_status: "gelar", lat: "abc"}, pus.h); assert.equal(m.s, 400); assert.doesNotMatch(m.t, /SQLITE|D1_ERROR/);
});

/* ---------------------------------------------------------------- dummy */
uji("dummy: Super Admin mengisi layar log (rantai hulu ke hilir, tiap angka bukan nol), isi kedua periode sama 409, staf nyata tidak melihat dummy, hapus menyisakan baris nyata", async () => {
  const nyata = async () => ({kit: await hitung("sippa_kit", "dummy = 0"), komp: await hitung("sippa_komponen", "dummy = 0"), log: await hitung("sippa_log_gelar", "dummy = 0"), gerak: await hitung("sippa_gerak", "dummy = 0"), tugas: await hitung("sippa_tugas", "dummy = 0"),
    probe: await hitung("sippa_probe", "dummy = 0"), bbm: await hitung("sippa_bbm", "dummy = 0"), foto: await hitung("sippa_foto", "dummy = 0"), jejak: await jejak()});
  const sebelum = await nyata(), sejak = Date.now() - 20 * HARI, sampai = Date.now() - HARI;
  assert.equal((await sip("POST", "/dummy/isi", {layar: "log"}, MOD2)).s, 403, "moderator biasa bukan Super Admin"); assert.equal((await sip("POST", "/dummy/isi", {layar: "log"}, pus.h)).s, 403); assert.equal((await sip("POST", "/dummy/isi", {layar: "log"})).s, 401);
  assert.equal((await sip("POST", "/dummy/hapus", {}, MOD2)).s, 403); assert.equal((await sip("POST", "/dummy/hapus", {}, pus.h)).s, 403);
  for (const l of ["tidakada", "", "Log", 5, null]) assert.equal((await sip("POST", "/dummy/isi", {layar: l}, ADMIN)).s, 400, `layar ${JSON.stringify(l)}`);
  assert.equal((await sip("POST", "/dummy/isi", {layar: "log", sejak: sampai, sampai: sejak}, ADMIN)).s, 400, "sejak > sampai");
  const r = await sip("POST", "/dummy/isi", {layar: "log", sejak, sampai}, ADMIN); assert.equal(r.s, 200, r.t); cekKepala(r, "dummy");
  for (const t of ["sippa_kit", "sippa_komponen", "sippa_tugas", "sippa_log_gelar", "sippa_probe", "sippa_bbm"]) assert.ok(r.j.dibuat[t] > 0, `rantai log mengisi ${t}: ${JSON.stringify(r.j.dibuat)}`);
  const kolom = (await DB.prepare("SELECT * FROM sippa_log_gelar WHERE dummy = 1").all()).results; assert.ok(kolom.length >= 5, `${kolom.length} log dummy`);
  for (const l of kolom) { assert.ok(l.t_tiba >= sejak && l.t_tiba <= sampai, "periode yang terpampang, bukan hari ini"); for (const k of ["jam_pompa", "bbm_l", "air_m3", "panjang_m", "n_orang", "p_ujung_bar"]) assert.ok(l[k] > 0, `log dummy ${k} nol`); assert.equal(l.oleh.startsWith("tugas:"), true); }
  assert.ok(kolom.some(l => l.jenis === "banjir" && l.banjir_m3 > 0) && kolom.some(l => l.jam_klien_meleset === 1) && new Set(kolom.map(l => l.kelas_medan)).size >= 2, "banjir, jam meleset, dan kelas medan bervariasi");
  assert.notEqual(new Set(kolom.map(l => l.jam_pompa)).size, 1, "angka tidak sama rata (KELAS B)");
  for (const l of kolom) assert.ok(Math.abs(l.jam_pompa - (l.t_selesai - l.t_air_mengalir) / JAM) < 0.01, "jam pompa = t_selesai - t_air_mengalir (rantai, bukan konstanta)");
  assert.ok(await hitung("sippa_probe", "dummy = 1 AND tahap = 'sebelum'") > 0 && await hitung("sippa_probe", "dummy = 1 AND tahap = 'sesudah'") > 0 && await hitung("sippa_probe", "dummy = 1 AND tahap = '24j'") > 0);
  const lagi = await sip("POST", "/dummy/isi", {layar: "log", sejak, sampai}, ADMIN); assert.equal(lagi.s, 409, lagi.t); assert.match(lagi.j.galat, /sudah ada untuk periode/);
  /* staf nyata tidak melihat dummy di rute baca mana pun; admin melihat */
  const nyataLog = await sip("GET", "/log", undefined, pim.h); assert.ok(!nyataLog.j.log.some(l => kolom.some(d => d.id === l.id)), "log dummy tersaring untuk staf nyata");
  const kt = await sip("GET", "/kit", undefined, pim.h); assert.ok(kt.j.kit.every(k => !/^SIPPA-9\d\d$/.test(k.kode)), "kit dummy tersaring");
  const dk = (await DB.prepare("SELECT id FROM sippa_kit WHERE dummy = 1 LIMIT 1").first()).id; assert.equal((await sip("GET", "/kit/" + dk, undefined, pim.h)).s, 404, "rincian kit dummy 404 untuk staf nyata"); assert.equal((await sip("GET", "/kit/" + dk, undefined, ADMIN)).s, 200);
  assert.ok((await sip("GET", "/kit", undefined, ADMIN)).j.kit.some(k => k.id === dk), "admin melihat dummy"); assert.ok((await sip("GET", "/log", undefined, ADMIN)).j.log.some(l => l.dummy === 1));
  for (const j of ["/log.csv", "/probe.csv"]) { const t = await (await mf.dispatchFetch("http://bnpb.lokal/api/sippa" + j, {headers: pim.h})).text(); for (const d of kolom) assert.ok(!t.includes(d.id), `${j} memuat baris dummy untuk staf nyata`); }
  const pk = (await DB.prepare("SELECT id FROM sippa_probe WHERE dummy = 1 LIMIT 1").first()).id; assert.ok(!(await (await mf.dispatchFetch("http://bnpb.lokal/api/sippa/probe.csv", {headers: pim.h})).text()).includes(pk));
  /* layar kit: status tiap ember terisi dan ada gerak terencana serta antar-provinsi */
  const k2 = await sip("POST", "/dummy/isi", {layar: "kit", sejak, sampai}, ADMIN); assert.equal(k2.s, 200, k2.t); assert.ok(k2.j.dibuat.sippa_gerak > 0);
  const st = new Set((await DB.prepare("SELECT status FROM sippa_kit WHERE dummy = 1").all()).results.map(x => x.status)); for (const s of ["gudang", "depot", "gelar", "banjir", "servis", "hilang", "pensiun"]) assert.ok(st.has(s), `ember ${s} kosong`);
  assert.ok(await hitung("sippa_gerak", "dummy = 1 AND rencana = 1 AND tiba IS NULL") >= 1, "satu gerak terencana belum tiba"); assert.ok(await hitung("sippa_komponen", "dummy = 1 AND kondisi = 'hilang'") >= 1, "satu komponen hilang");
  assert.ok(await hitung("sippa_gerak", "dummy = 1 AND prov IS NOT NULL AND prov != '62'") >= 1, "satu gerak antar-provinsi");
  assert.equal(await hitung("sippa_komponen", "dummy = 1 AND kit_id IN (SELECT id FROM sippa_kit WHERE dummy = 0)"), 0);
  /* lapangan memakai rantai yang sama; isi lagi tanpa dummy baru = 409 */
  assert.equal((await sip("POST", "/dummy/isi", {layar: "lapangan", sejak, sampai}, ADMIN)).s, 409); assert.equal((await sip("POST", "/dummy/isi", {layar: "ringkas", sejak, sampai}, ADMIN)).s, 409);
  assert.equal((await sip("POST", "/dummy/isi", {layar: "peta"}, ADMIN)).s, 200, "layar yang pengisinya belum ada: 200 tanpa baris");
  /* hapus: nol dummy, baris nyata utuh */
  const h = await sip("POST", "/dummy/hapus", {}, ADMIN); assert.equal(h.s, 200, h.t); assert.ok(h.j.dihapus.sippa_log_gelar > 0 && h.j.dihapus.sippa_kit >= 7, JSON.stringify(h.j));
  for (const t of ["sippa_kit", "sippa_komponen", "sippa_tugas", "sippa_log_gelar", "sippa_probe", "sippa_bbm", "sippa_gerak", "sippa_foto"]) assert.equal(await hitung(t, "dummy = 1"), 0, `${t} masih punya dummy`);
  assert.equal(await hitung("pantau_jejak", "dummy = 1 AND obyek GLOB 'sippa_*'"), 0); assert.deepEqual(await nyata(), sebelum, "baris nyata utuh");
  /* hilir tanpa hulu: pengisi melapor 0 baris dan tidak mencatat apa pun (KELAS C) */
  const env = await mf.getBindings(), c = {kini: Date.now(), sejak, sampai, ada: false};
  for (const nama of ["isiKomponen", "isiTugas", "isiGerak", "isiLog", "isiProbe", "isiBbm"]) { const x = await PENGISI[nama](env, c); assert.deepEqual(Object.values(x).reduce((a, b) => a + b, 0), 0, `${nama} tanpa hulu harus 0 baris: ${JSON.stringify(x)}`); }
  assert.equal(await hitung("sippa_log_gelar", "dummy = 1"), 0);
  assert.equal((await sip("POST", "/dummy/isi", {layar: "log", sejak, sampai}, ADMIN)).s, 200, "sesudah hapus, isi lagi berhasil (gerbang menghitung baris hidup)");
  await isiLaju(ADM, "sippa.dummy", 30); assert.equal((await sip("POST", "/dummy/hapus", {}, ADMIN)).s, 429, "laju 30 per jam"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(ADM).run();
  assert.equal((await sip("POST", "/dummy/hapus", {}, ADMIN)).s, 200);
});

/* ---------------------------------------------------------------- akun gerbang dan kontrak klien public/pipa */
uji("akun gerbang AKUN_SITUS bukan staf BNPB: 403 di halaman /pipa dan semua GET dan POST /api/sippa (keputusan pemilik 32); moderator tetap masuk", async () => {
  for (const j of ["/pipa", "/pipa/kit", "/pipa/kit/0123456789abcdef"]) { const r = await man(j, GERBANG); assert.equal(r.s, 403, `halaman ${j}: ${r.s}`); assert.equal(r.h.get("location"), null); assert.match(r.t, /tidak punya akses SIPPA/); }
  assert.equal((await man("/pipa", {...GERBANG, "cf-connecting-ip": "198.51.100.88"}, "https://centurisk97.id")).s, 403, "di centurisk97.id juga");
  for (const j of ["/kit", "/kit/" + kit1, "/log", "/log.csv", "/probe.csv", "/foto/" + fotoId]) { const r = await sip("GET", j, undefined, GERBANG); assert.equal(r.s, 403, `GET ${j}: ${r.s} ${r.t.slice(0, 80)}`); assert.ok(r.j.galat); }
  assert.equal((await sip("GET", "/log.csv?presisi=penuh", undefined, GERBANG)).s, 403);
  for (const [j, b] of [["/kit/" + kit1, {lokasi: "x"}], ["/komponen/" + kit1, {baru: []}], ["/gerak/" + kit1, {alasan: "gelar", ke_status: "gelar"}], ["/tiba/" + gRencana, {}], ["/tugas", {}], ["/tugas-cabut/" + tg1, {}], ["/log", {jenis: "latihan"}]]) assert.equal((await sip("POST", j, b, GERBANG)).s, 403, `POST ${j}`);
  assert.equal((await man("/pipa/kit", MOD2)).s, 200); assert.equal((await sip("GET", "/kit", undefined, MOD2)).s, 200);
});
uji("kontrak klien: body[data-mod] untuk moderator; musim_pct persen 0 sampai 100; Cek komponen dengan catatan di atas; log memuat kit_kode dan nama_regu; kirim menjawab ditolak dan jam_server", async () => {
  const mod = (await man("/pipa/kit", MOD2)).t, sup = (await man("/pipa/kit", ADMIN)).t, st = (await man("/pipa/kit", pus.g)).t;
  assert.match(mod, /data-mod="1"/); assert.match(sup, /data-mod="1"/); assert.match(sup, /data-super="1"/); assert.match(st, /data-mod="0"/);
  const k = await sip("GET", "/kit", undefined, pim.h), pct = k.j.kehilangan.musim_pct; assert.ok(pct === null || (pct >= 0 && pct <= 100), `musim_pct ${pct}`); assert.ok(Object.values(k.j.kehilangan.per_kit).every(v => v === null || (v >= 0 && v <= 100)));
  assert.ok(pct > 0 && pct < 100, "satu komponen hilang di antara puluhan = persen kecil, bukan pecahan 0 sampai 1");
  const k2 = (await DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? AND kondisi = 'baik' LIMIT 1").bind(kit1).first()).id;
  const c = await sip("POST", "/komponen/" + kit1, {ubah: [{id: k2, kondisi: "hilang", dicek: true}], catatan: "dicek regu gudang"}, pus.h); assert.equal(c.s, 200, c.t);
  assert.equal((await DB.prepare("SELECT kondisi FROM sippa_komponen WHERE id = ?").bind(k2).first()).kondisi, "hilang");
  const k3 = (await DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? AND kondisi = 'baik' LIMIT 1").bind(kit1).first()).id;
  assert.equal((await sip("POST", "/komponen/" + kit1, {ubah: [{id: k3, kondisi: "hilang"}]}, pus.h)).s, 400, "hilang tetap wajib catatan");
  const l = await sip("GET", "/log?kit=" + kit1, undefined, pim.h), lap = l.j.log.find(x => x.tugas_id === tg1);
  assert.equal(lap.kit_kode, "SIPPA-101"); assert.equal(lap.nama_regu, "Regu Alfa"); assert.ok("prov" in lap && lap.oleh.startsWith("tugas:")); assert.equal(l.j.log.find(x => x.id === logStaf).nama_regu, null);
  const r = await kirim(kode1, {log: [logB()]}); assert.ok(Array.isArray(r.j.ditolak) && Number.isFinite(r.j.jam_server));
  assert.match((await man("/pipa/lapangan")).t, /id="app"/, "lapangan.js membutuhkan #lapangan atau #app");
});

uji("akun staf dummy hanya boleh menulis ke baris dummy: POST pada kit, komponen, gerak, tugas, log nyata = 404 dan baris nyata tidak berubah; baris dummy boleh; membaca boleh", async () => {
  const d = await bikin(["pusdalops"]); await DB.prepare("UPDATE staf SET dummy = 1 WHERE id = ?").bind(d.kunci.slice(5)).run();
  const snap = async () => JSON.stringify([await DB.prepare("SELECT * FROM sippa_kit WHERE id = ?").bind(kit1).first(), (await DB.prepare("SELECT * FROM sippa_komponen WHERE kit_id = ? ORDER BY id").bind(kit1).all()).results, await hitung("sippa_gerak", "kit_id = ?", kit1), await hitung("sippa_tugas"), await hitung("sippa_log_gelar"), await hitung("pantau_jejak", "obyek GLOB 'sippa_*'")]);
  const sebelum = await snap(), komp = (await DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? LIMIT 1").bind(kit1).first()).id, st = await statusKit(kit1);
  assert.equal((await sip("GET", "/kit/" + kit1, undefined, d.h)).s, 200, "membaca baris nyata boleh");
  for (const [j, b] of [["/kit/" + kit1, {lokasi: "dummy menimpa"}], ["/komponen/" + kit1, {ubah: [{id: komp, kondisi: "rusak_berat"}]}], ["/gerak/" + kit1, {alasan: "servis", ke_status: "servis"}], ["/tugas", {nama_regu: "Regu", unsur: "mpa", prov: "62", kab: "Kab", berlaku_hari: 2, kit_id: kit1}],
    ["/tugas-cabut/" + tg3, {}], ["/log", {jenis: "latihan", prov: "62", kit_id: kit1}]]) { const r = await sip("POST", j, b, d.h); assert.ok([400, 403, 404].includes(r.s), `POST ${j}: ${r.s} ${r.t.slice(0, 80)}`); }
  const g = (await sip("POST", "/gerak/" + kit1, {alasan: "servis", ke_status: "servis"}, d.h)).s; assert.equal(g, 404);
  assert.equal(await snap(), sebelum, "baris nyata tidak berubah"); assert.equal(await statusKit(kit1), st);
  const kd = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join(""); await DB.prepare("INSERT INTO sippa_kit (id, kode, jenis, status, dibuat, diubah, dummy) VALUES (?, 'SIPPA-950', 'gambut', 'gudang', ?, ?, 1)").bind(kd, Date.now(), Date.now()).run();
  assert.equal((await sip("POST", "/kit/" + kd, {lokasi: "dummy sah"}, d.h)).s, 200, "baris dummy boleh ditulis akun dummy"); assert.equal((await gerak(kd, {alasan: "servis", ke_status: "servis"}, d.h)).s, 201);
  assert.equal((await sip("POST", "/kit/" + kd, {lokasi: "admin ke dummy"}, ADMIN)).s, 200, "admin tetap boleh keduanya");
  await DB.prepare("DELETE FROM sippa_gerak WHERE kit_id = ?").bind(kd).run(); await DB.prepare("DELETE FROM sippa_kit WHERE id = ?").bind(kd).run(); await DB.prepare("DELETE FROM pantau_jejak WHERE dummy = 1 AND obyek GLOB 'sippa_*'").run();
});

uji("wilayah pada log: staf 61 mengirim kit_id kit provinsi 62 dijawab identik dengan kit_id acak dan tidak menulis; agregasi dan log kit hanya menghitung baris provinsi di wilayahnya", async () => {
  const acakKit = "0123456789abcdee", n0 = await hitung("sippa_log_gelar", "kit_id = ?", kit2);
  const a = await sip("POST", "/log", {jenis: "latihan", prov: "61", kit_id: kit2}, pus61.h), b = await sip("POST", "/log", {jenis: "latihan", prov: "61", kit_id: acakKit}, pus61.h);
  assert.equal(a.s, b.s, `${a.t} vs ${b.t}`); assert.equal(a.t, b.t, "jawaban identik: keberadaan kit provinsi lain tidak bocor"); assert.ok(a.s >= 400);
  assert.equal(await hitung("sippa_log_gelar", "kit_id = ?", kit2), n0, "kit provinsi 62 tidak menghitung log itu");
  const hid = uuid(); await DB.prepare("INSERT INTO sippa_log_gelar (id, jenis, kit_id, prov, jam_pompa, banjir_m3, t_tiba, waktu_klien, diterima, oleh, dummy) VALUES (?, 'banjir', ?, '62', 77, 5000, ?, ?, ?, 'staf:uji', 0)").bind(hid, kit1, Date.now() - JAM, Date.now(), Date.now()).run();
  const nas = (await sip("GET", "/kit", undefined, pus.h)).j.kit.find(k => k.id === kit1), reg = (await sip("GET", "/kit", undefined, pus61.h)).j.kit.find(k => k.id === kit1);
  assert.ok(reg, "kit1 (prov 61) terlihat staf 61"); assert.ok(nas.jam_pompa_musim >= 77 && nas.banjir_m3_musim >= 5000, "nasional menghitung semua"); assert.ok(reg.jam_pompa_musim <= nas.jam_pompa_musim - 77 && reg.banjir_m3_musim <= nas.banjir_m3_musim - 5000, `agregat staf 61 memuat baris prov 62: ${reg.jam_pompa_musim} vs ${nas.jam_pompa_musim}`);
  const rin = await sip("GET", "/kit/" + kit1, undefined, pus61.h); assert.equal(rin.s, 200); assert.ok(!rin.j.pemakaian.some(l => l.id === hid) && rin.j.pemakaian.every(l => l.prov === "61" || l.prov === undefined) , "pemakaian kit hanya baris wilayah");
  assert.ok(!(await sip("GET", "/log", undefined, pus61.h)).j.log.some(l => l.id === hid)); assert.ok((await sip("GET", "/log", undefined, pus.h)).j.log.some(l => l.id === hid));
});
uji("badan kirim dihitung dalam byte: 150.000 huruf 2 byte (300 rb byte) = 413 walau di bawah 262.144 huruf; 405 untuk metode lain dengan header allow", async () => {
  const pad = '{"jam_kirim":1,"pad":"' + "é".repeat(150000) + '"}'; assert.ok(pad.length < 262144 && new TextEncoder().encode(pad).length > 262144);
  const r = await sip("POST", "/lapangan/kirim", pad, {"x-kode": kode1}); assert.equal(r.s, 413, r.t.slice(0, 100)); assert.ok(r.j.galat);
  const ok = '{"jam_kirim":1,"pad":"' + "é".repeat(130000) + '"}'; assert.equal((await sip("POST", "/lapangan/kirim", ok, {"x-kode": kode1})).s, 200, "260 rb byte masih lolos");
  for (const [m, j] of [["DELETE", "/kit/" + kit1], ["PUT", "/log"], ["PUT", "/kit"],["GET", "/tiba/" + gRencana], ["GET", "/dummy/hapus"]]) {
    const x = await sip(m, j, undefined, pus.h); assert.equal(x.s, 405, `${m} ${j}: ${x.s}`); assert.ok(x.h.get("allow"), `${m} ${j}: header allow`); assert.ok(x.j.galat);
    if (j === "/log") assert.equal(x.h.get("allow"), "GET, POST"); if (j.startsWith("/kit/")) assert.equal(x.h.get("allow"), "GET, POST");
  }
});

uji("staf dummy tanpa kit_id: POST /tugas dan POST /log menghasilkan baris dummy = 1, jumlah baris nyata tidak berubah", async () => {
  const d = await bikin(["pusdalops"]); await DB.prepare("UPDATE staf SET dummy = 1 WHERE id = ?").bind(d.kunci.slice(5)).run();
  const nyata = async () => [await hitung("sippa_tugas", "dummy = 0"), await hitung("sippa_log_gelar", "dummy = 0"), await hitung("pantau_jejak", "obyek GLOB 'sippa_*' AND dummy = 0")];
  const sebelum = await nyata();
  const t = await tugasBaru({nama_regu: "Regu Dummy Uji"}, d.h); assert.equal(t.s, 201, t.t);
  const l = await sip("POST", "/log", {jenis: "latihan", prov: "62", catatan: "log dummy uji"}, d.h); assert.equal(l.s, 201, l.t);
  assert.equal((await DB.prepare("SELECT dummy FROM sippa_tugas WHERE id = ?").bind(t.j.tugas.id).first()).dummy, 1, "tugas staf dummy harus dummy = 1");
  assert.equal((await DB.prepare("SELECT dummy FROM sippa_log_gelar WHERE id = ?").bind(l.j.log.id).first()).dummy, 1, "log staf dummy harus dummy = 1");
  assert.deepEqual(await nyata(), sebelum, "baris nyata (tugas, log, jejak) tidak bertambah");
  assert.ok(!(await sip("GET", "/log", undefined, pim.h)).j.log.some(x => x.id === l.j.log.id), "staf nyata tidak melihatnya");
  await DB.prepare("DELETE FROM sippa_log_gelar WHERE dummy = 1 AND id = ?").bind(l.j.log.id).run(); await DB.prepare("DELETE FROM sippa_tugas WHERE id = ?").bind(t.j.tugas.id).run();
  await DB.prepare("DELETE FROM pantau_jejak WHERE dummy = 1 AND obyek GLOB 'sippa_*'").run();
});
uji("POST /api/sippa/tugas-cabut/:id: W 200 mencabut dan kode berhenti berlaku; ulang idempoten tanpa jejak kedua; pimpinan 403; tamu 401; wilayah 61 404; id acak 404; laju 120", async () => {
  const t = await tugasBaru({nama_regu: "Regu Cabut Dua"}); assert.equal(t.s, 201); const id = t.j.tugas.id, j0 = await jejak();
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": t.j.kode})).s, 200);
  assert.equal((await sip("POST", "/tugas-cabut/" + id, {}, pim.h)).s, 403); assert.equal((await sip("POST", "/tugas-cabut/" + id)).s, 401); assert.equal((await sip("POST", "/tugas-cabut/" + id, {}, pus61.h)).s, 404); assert.equal((await sip("POST", "/tugas-cabut/0123456789abcdee", {}, pus.h)).s, 404);
  const c = await sip("POST", "/tugas-cabut/" + id, {}, pus.h); assert.equal(c.s, 200, c.t); assert.ok(c.j.dicabut > 0); assert.equal(await jejak(), j0 + 1);
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": t.j.kode})).s, 403, "kode dicabut ditolak"); assert.equal((await sip("POST", "/tugas-cabut/" + id, {}, pus.h)).s, 200); assert.equal(await jejak(), j0 + 1, "cabut ulang tidak menulis jejak");
  await isiLaju(koor.kunci, "sippa.tugas_cabut", 120); assert.equal((await sip("POST", "/tugas-cabut/" + id, {}, koor.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(koor.kunci).run();
});
uji("GET /admin/pipa: selalu 303 ke /pipa untuk tamu, staf, admin, dan akun gerbang; tanpa isi", async () => {
  for (const h of [{}, pus.g, ver.g, ADMIN, GERBANG]) { const r = await man("/admin/pipa", h); assert.equal(r.s, 303); assert.equal(r.h.get("location"), "/pipa"); assert.equal(r.t, ""); }
});

/* ---------------------------------------------------------------- SP-015: temuan keamanan */
uji("SP-015: operator (x-kode) tidak bisa memindah kit ke provinsi lain lewat /gerak maupun /lapangan/kirim; prov dan kab dipaksa dari tugas", async () => {
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'sippa.kit_buat'").run();
  const k = await sip("POST", "/kit", {kode: "SIPPA-160", jenis: "gambut", prov: "62", kab: "Kab Asal"}, MOD2); assert.equal(k.s, 201, k.t);
  const kid = k.j.kit.id, t = await tugasBaru({kit_id: kid, prov: "62", kab: "Kab Tugas"}); assert.equal(t.s, 201, t.t);
  const kodeT = t.j.kode, provKit = async () => (await DB.prepare("SELECT prov, kab FROM sippa_kit WHERE id = ?").bind(kid).first());
  const x = await sip("POST", "/gerak/" + kid, {alasan: "gelar", ke_status: "gelar", prov: "61", kab: "Kab Lain"}, {"x-kode": kodeT});
  assert.equal(x.s, 403, x.t); assert.deepEqual(await provKit(), {prov: "62", kab: "Kab Asal"}, "kit tidak berpindah provinsi"); assert.equal(await statusKit(kid), "gudang");
  const g = gerakB({alasan: "gelar", ke_status: "gelar", prov: "61"}), r = await kirim(kodeT, {gerak: [g]}); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.ditolak.map(d => d.id), [g.id], JSON.stringify(r.j)); assert.deepEqual(await provKit(), {prov: "62", kab: "Kab Asal"}); assert.equal(await statusKit(kid), "gudang");
  const ok = await sip("POST", "/gerak/" + kid, {alasan: "gelar", ke_status: "gelar", kab: "Kab Bebas"}, {"x-kode": kodeT}); assert.equal(ok.s, 201, ok.t);
  assert.deepEqual(await provKit(), {prov: "62", kab: "Kab Asal"}, "tanpa prov, lokasi kit tidak disentuh (kab klien dibuang)");
  const ok2 = await sip("POST", "/gerak/" + kid, {alasan: "bongkar", ke_status: "depot", prov: "62", kab: "Kab Bebas"}, {"x-kode": kodeT}); assert.equal(ok2.s, 201, ok2.t);
  assert.deepEqual(await provKit(), {prov: "62", kab: "Kab Tugas"}, "dengan prov sama, kab dipaksa dari tugas");
  const g2 = gerakB({alasan: "kembali", ke_status: "gudang", prov: "62", kab: "Kab Bebas"}), r2 = await kirim(kodeT, {gerak: [g2]}); assert.deepEqual(r2.j.diterima, [g2.id], JSON.stringify(r2.j));
  assert.deepEqual(await provKit(), {prov: "62", kab: "Kab Tugas"}, "kirim lapangan: kab dari tugas");
});
uji("SP-015: lat/lon pada GET /log, /kit, /kit/:id dibulatkan 0,01 untuk peran baca saja; peran tulis melihat penuh", async () => {
  const kid = (await DB.prepare("SELECT id FROM sippa_kit WHERE kode = 'SIPPA-160'").first()).id;
  const g = await gerak(kid, {alasan: "pra_posisi", ke_status: "depot", lat: -2.12345, lon: 113.98765}); assert.equal(g.s, 201, g.t);
  const lg = await sip("POST", "/log", {jenis: "latihan", prov: "62", lat: -2.12345, lon: 113.98765, kit_id: kid}, pus.h); assert.equal(lg.s, 201, lg.t);
  const semua = (j, f) => { assert.ok(j.length, "ada baris"); return j.every(f); };
  const lp = (await sip("GET", "/log?kit=" + kid, undefined, pim.h)).j.log, lw = (await sip("GET", "/log?kit=" + kid, undefined, pus.h)).j.log;
  assert.ok(semua(lp, l => l.lat === -2.12 && l.lon === 113.99), JSON.stringify(lp.map(l => [l.lat, l.lon]))); assert.ok(semua(lw, l => l.lat === -2.12345 && l.lon === 113.98765));
  const kp = (await sip("GET", "/kit", undefined, pim.h)).j.kit.find(k => k.id === kid), kw = (await sip("GET", "/kit", undefined, pus.h)).j.kit.find(k => k.id === kid);
  assert.deepEqual([kp.lat, kp.lon], [-2.12, 113.99]); assert.deepEqual([kw.lat, kw.lon], [-2.12345, 113.98765]);
  const rp = (await sip("GET", "/kit/" + kid, undefined, pim.h)).j, rw = (await sip("GET", "/kit/" + kid, undefined, pus.h)).j;
  assert.deepEqual([rp.kit.lat, rp.kit.lon], [-2.12, 113.99]); assert.deepEqual([rw.kit.lat, rw.kit.lon], [-2.12345, 113.98765]);
  assert.ok(rp.gerak.every(x => x.lat == null || x.lat === -2.12), "gerak ikut dibulatkan");
});
uji("SP-015: kitBuat memakai dummyStaf, bukan literal 0, pada INSERT kit dan komponen (penjaga teks)", () => {
  const src = teks("src", "sippa.js"), mulai = src.indexOf("async function kitBuat"), isi = src.slice(mulai, src.indexOf("async function kitUbah"));
  for (const t of ["INSERT INTO sippa_kit (", "INSERT INTO sippa_komponen ("]) { const i = isi.indexOf(t); assert.ok(i > 0, t); const s = isi.slice(i, isi.indexOf(")\")", i) + 3); assert.doesNotMatch(s, /, 0\)"\)$/, `${t} menulis dummy 0 literal`); assert.match(s, /dummy\) VALUES/, t); }
  assert.ok((isi.match(/\bdm\b/g) || []).length >= 4, "dm (dummyStaf) dipakai di INSERT kit, komponen, dan jejak");
});

/* ---------------------------------------------------------------- tanpa migrasi, rute lama utuh, tulis/baca peran tanpa penjaga */
uji("tanpa tabel sippa_*: semua rute /api/sippa menjawab 503 sopan; rute lain repo tetap 200", async () => {
  const T = await siapkan("uji-sippa-tanpa-migrasi", {r2: true});
  await T.DB.batch(["sippa_bbm", "sippa_probe", "sippa_log_gelar", "sippa_foto", "sippa_jalan_cek", "sippa_aoi_usul", "sippa_gerak", "sippa_tugas", "sippa_komponen", "sippa_kit"].map(t => T.DB.prepare(`DROP TABLE ${t}`)));
  const pesan = {galat: "Migrasi SIPPA belum diterapkan di basis data", status: "tanpa_migrasi"};
  const kasus = [["GET", "/kit", undefined], ["GET", "/kit/0123456789abcdef", undefined], ["POST", "/kit", {kode: "SIPPA-101", jenis: "gambut", templat: "gambut"}], ["POST", "/kit/0123456789abcdef", {lokasi: "x"}], ["POST", "/komponen/0123456789abcdef", {baru: [{kode_bom: "X-1", nama: "ab", jumlah: 1, satuan: "unit"}]}],
    ["POST", "/gerak/0123456789abcdef", {alasan: "gelar", ke_status: "gelar"}], ["POST", "/tiba/0123456789abcdef", {}], ["POST", "/tugas", {nama_regu: "Regu", unsur: "mpa", prov: "62", kab: "Kab", berlaku_hari: 1}], ["POST", "/tugas-cabut/0123456789abcdef", {}],
    ["GET", "/log", undefined], ["GET", "/log.csv", undefined], ["GET", "/probe.csv", undefined], ["POST", "/log", {jenis: "latihan"}], ["GET", "/foto/0123456789abcdef", undefined], ["POST", "/dummy/isi", {layar: "log"}], ["POST", "/dummy/hapus", {}]];
  for (const [m, j, b] of kasus) { const r = await T.api(m, "/api/sippa" + j, b, ADMIN); assert.equal(r.s, 503, `${m} ${j}: ${r.s} ${r.t.slice(0, 120)}`); assert.deepEqual(r.j, pesan, `${m} ${j}`); }
  const kd = "a".repeat(26); for (const [m, j, b] of [["GET", "/lapangan/saya"], ["POST", "/lapangan/kirim", {}], ["POST", "/gerak/0123456789abcdef", {alasan: "gelar", ke_status: "gelar"}]]) { const r = await T.api(m, "/api/sippa" + j, b, {"x-kode": kd}); assert.equal(r.s, 503, `${m} ${j} (kode): ${r.s} ${r.t}`); }
  const f = await T.api("GET", "/api/warga/konfig"); assert.equal(f.s, 200, "rute lain repo tetap 200 (/api/titik tidak dipakai: 404 sah sebelum cron FIRMS pertama)"); assert.equal((await T.api("GET", "/api/warga")).s, 200); 
  assert.equal((await T.api("GET", "/pipa/lapangan")).s, 200, "halaman tidak menyentuh tabel");
});
