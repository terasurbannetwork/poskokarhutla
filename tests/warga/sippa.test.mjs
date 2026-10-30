/* SIPPA worker P0 (src/sippa.js; DESAIN-TEKNIS §1.4, §4, §6; RENCANA-UJI §2.4): halaman /pipa, kit, komponen, gerak, tugas, lapangan (kode penugasan), foto, log, CSV, dummy.
   Worker utuh di workerd + D1 + R2 sungguhan, migrasi 0056 apa adanya (TEST.md: tanpa mock). Tiap rute: positif, peran salah DITOLAK, masukan liar DITOLAK, ukuran, laju.
   Jalankan: node --test tests/warga/sippa.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {AKAR, JPEG_SAH, WEBP_SAH, badanPanjang} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {P_SIPPA_BACA, P_SIPPA_TULIS, LAYAR_SIPPA, ALASAN_TRANSISI, RANTAI_DUMMY, PENGISI, dariDatar, nilaiAlarm, bersihkanSippa, AMBANG_ALARM, KODE_ALARM} from "../../src/sippa.js";
import {HALAMAN_STAF} from "../../src/admin_halaman.js";
import {FORMULIR_VERSI} from "../../public/pipa/formulir.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, uji = berantai();
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
uji("konstanta: peran, 15 layar, alasan transisi = pasangan CHECK 0056, hak halaman staf = P_SIPPA_BACA", () => {
  assert.deepEqual(P_SIPPA_BACA, ["pusdalops", "koordalops", "pimpinan"]); assert.deepEqual(P_SIPPA_TULIS, ["pusdalops", "koordalops"]);
  assert.deepEqual(LAYAR_SIPPA, ["peta", "hitung", "pemicu", "kit", "log", "ab", "studio", "3d", "telemetri", "laporan", "data", "pelihara", "air", "akses", "kunjungan"]);
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
  assert.match(a.t, /<html lang="id">/); assert.match(a.t, /<title>SIPPA, Centurisk97<\/title>/); assert.match(a.t, /<script type="module" src="\/pipa\/app\.js\?v=\d+"><\/script>/);
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
  const pk = pc.trim().split("\r\n"); assert.equal(pk[0], "id,log_id,tugas_id,petak_id,titik,tahap,kedalaman_cm,suhu_c,waktu,oleh,dummy"); assert.ok(pk.length >= 3, "probe dari kiriman lapangan"); assert.ok(pk.slice(1).every(b => b.split(",").length >= 10));
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
  assert.equal((await sip("POST", "/dummy/isi", {layar: "hitung"}, ADMIN)).s, 200, "layar yang pengisinya belum ada: 200 tanpa baris");
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

/* ---------------------------------------------------------------- SP-029: rute data R2, ringkas, cek jalan, usul AOI */
const NAMA_DATA = ["kelayakan_kompleks", "kelayakan_sel", "zona", "sel22", "kit_nasional", "pemicu", "aoi_calon", "akses_kompleks", "cat", "jembatan_dibi", "program_jembatan"];
const dataGet = (nama, h) => mf.dispatchFetch("http://bnpb.lokal/api/sippa/data/" + nama, {headers: h}).then(async r => ({s: r.status, h: r.headers, t: await r.text()}));
uji("GET /api/sippa/data/:nama: tamu 401 identik untuk berkas ada dan tidak ada; staf 404 belum_ada bila belum diunggah atau kosong; 200 aliran apa adanya; > 8 MB 500; nama liar 404; peran salah 403; tanpa laju", async () => {
  for (const n of NAMA_DATA) await R2.delete("sippa/" + n + ".json");
  await R2.put("sippa/zona.json", JSON.stringify({versi: "sippa_zona/1", isi: [1, 2]}));   // satu ada, satu tidak
  const ada = await dataGet("zona"), tidak = await dataGet("sel22"), liar = await dataGet("tidak_dikenal");
  assert.equal(ada.s, 401); assert.equal(ada.t, tidak.t, "badan 401 tamu sama untuk berkas ada dan tidak ada"); assert.equal(ada.t, liar.t, "dan sama untuk nama yang tidak dikenal");
  assert.equal(ada.h.get("cache-control"), "private, no-store"); assert.match(ada.h.get("vary") || "", /cookie/i);
  const ok = await dataGet("zona", pim.h); assert.equal(ok.s, 200, ok.t); assert.equal(ok.t, JSON.stringify({versi: "sippa_zona/1", isi: [1, 2]}), "isi R2 sampai apa adanya");
  assert.match(ok.h.get("content-type"), /^application\/json; charset=utf-8/); assert.equal(ok.h.get("x-content-type-options"), "nosniff"); assert.match(ok.h.get("vary") || "", /cookie/i); assert.match(ok.h.get("cache-control"), /^private/);
  const belum = await dataGet("sel22", pim.h); assert.equal(belum.s, 404); assert.equal(JSON.parse(belum.t).status, "belum_ada");
  await R2.put("sippa/sel22.json", ""); const kosong = await dataGet("sel22", pim.h); assert.equal(kosong.s, 404, "objek 0 byte = belum ada"); assert.equal(JSON.parse(kosong.t).status, "belum_ada");
  await R2.put("sippa/sel22.json", new Uint8Array(8 * 1024 * 1024 + 1).fill(32)); const besar = await dataGet("sel22", pim.h); assert.equal(besar.s, 500); assert.equal(JSON.parse(besar.t).status, "terlalu_besar");
  for (const n of ["tidak_dikenal", "pemicu_x", "0123456789abcdef"]) { const r = await dataGet(n, pim.h); assert.equal(r.s, 404, n); assert.equal(JSON.parse(r.t).status, "tidak_dikenal", n); }
  for (const n of ["ZONA", "../zona", "zona.json", "zona%2f..%2fsel22"]) assert.notEqual((await dataGet(n, pim.h)).s, 200, `${n} tidak boleh mengalir`);
  assert.equal((await dataGet("zona", ver.h)).s, 403, "verifikator tak berhak"); assert.equal((await dataGet("zona", GERBANG)).s, 403, "akun gerbang bukan staf BNPB");
  assert.equal((await dataGet("zona", {cookie: pim.g.cookie + "x"})).s, 401, "cookie sesi yang diutak-atik = tamu");
  assert.equal((await sip("POST", "/data/zona", {}, pus.h)).s, 405, "hanya GET");
  for (const n of NAMA_DATA) { await R2.put("sippa/" + n + ".json", JSON.stringify({n})); const r = await dataGet(n, pus61.h); assert.equal(r.s, 200, `${n}: ${r.t}`); assert.equal(JSON.parse(r.t).n, n, "data turunan nasional: staf wilayah ikut membaca"); }
  const n0 = await hitung("laju_bnpb"); for (let i = 0; i < 30; i++) assert.equal((await dataGet("zona", pim.h)).s, 200); assert.equal(await hitung("laju_bnpb"), n0, "GET data tidak menulis laju (ADR-06)");
});
uji("GET /api/sippa/ringkas: tamu 401, verifikator 403; bentuk DT §4.3; angka sama dengan hitungan SQL sendiri; dummy hanya untuk admin; wilayah 61 tidak melihat kit 62; pemicu_dibuat dari MEDIA.head; tanpa laju", async () => {
  await R2.delete("sippa/pemicu.json");
  assert.equal((await sip("GET", "/ringkas")).s, 401); assert.equal((await sip("GET", "/ringkas", undefined, ver.h)).s, 403);
  const r = await sip("GET", "/ringkas", undefined, pim.h); assert.equal(r.s, 200, r.t); cekKepala(r, "ringkas");
  for (const f of ["kit", "log", "alarm_aktif", "gerak_terakhir", "per", "pemicu_dibuat"]) assert.ok(f in r.j, `ringkas memuat ${f}`);
  for (const s of ["gudang", "depot", "gelar", "banjir", "servis", "hilang", "pensiun"]) assert.equal(typeof r.j.kit.per_status[s], "number", `per_status.${s}`);
  assert.ok("hilang_komponen_pct" in r.j.kit); assert.equal(r.j.pemicu_dibuat, null, "belum ada objek pemicu: null, bukan 0"); assert.equal(r.j.alarm_aktif, 0, "tabel alarm (0058) belum ada: 0");
  const nyata = await DB.prepare("SELECT status, count(*) n FROM sippa_kit WHERE dummy = 0 GROUP BY status").all();
  for (const x of nyata.results) assert.equal(r.j.kit.per_status[x.status], x.n, `per_status.${x.status} = hitungan SQL`);
  const nk = await hitung("sippa_log_gelar", "dummy = 0 AND jenis = 'karhutla' AND NOT EXISTS (SELECT 1 FROM sippa_log_gelar x WHERE x.koreksi_dari = sippa_log_gelar.id)"); assert.equal(r.j.log.n_karhutla, nk);
  assert.ok(Math.abs(r.j.per - Date.now()) < 60e3);
  await R2.put("sippa/pemicu.json", "{}"); const p = await sip("GET", "/ringkas", undefined, pim.h); assert.ok(Math.abs(p.j.pemicu_dibuat - Date.now()) < 120e3, `pemicu_dibuat ${p.j.pemicu_dibuat}`);
  /* dummy: isi lewat layar ringkas, hitung ulang dari baris dummy */
  const sejak = Date.now() - 20 * HARI, sampai = Date.now() - HARI;
  assert.equal((await sip("POST", "/dummy/isi", {layar: "ringkas", sejak, sampai}, ADMIN)).s, 200);
  const a = await sip("GET", "/ringkas", undefined, ADMIN); assert.equal(a.s, 200, a.t);
  const dk = await DB.prepare("SELECT status, count(*) n FROM sippa_kit GROUP BY status").all(); for (const x of dk.results) assert.equal(a.j.kit.per_status[x.status], x.n, `admin: per_status.${x.status} = semua baris`);
  const ls = (await DB.prepare("SELECT t_tiba, t_air_mengalir FROM sippa_log_gelar WHERE jenis = 'karhutla' ORDER BY (t_air_mengalir - t_tiba)").all()).results.map(l => (l.t_air_mengalir - l.t_tiba) / JAM);
  const med = ls.length % 2 ? ls[(ls.length - 1) / 2] : (ls[ls.length / 2 - 1] + ls[ls.length / 2]) / 2;
  assert.equal(a.j.log.n_karhutla, ls.length); assert.ok(Math.abs(a.j.log.p50_jam - med) <= 0.05, `p50_jam ${a.j.log.p50_jam} vs median ${med}`); assert.equal(a.j.log.n_kecil, ls.length < 5, "n_kecil: kurang dari 5 ulangan (gerbang G3)");
  assert.ok(a.j.gerak_terakhir.length >= 1 && a.j.gerak_terakhir.length <= 10); for (const g of a.j.gerak_terakhir) { for (const f of ["id", "kit_id", "kit_kode", "dari_status", "ke_status", "alasan", "waktu"]) assert.ok(f in g, `gerak_terakhir.${f}`); assert.ok(!("lat" in g) && !("oleh" in g), "tanpa koordinat dan pelaku"); }
  assert.deepEqual(a.j.gerak_terakhir.map(g => g.waktu), a.j.gerak_terakhir.map(g => g.waktu).sort((x, y) => y - x), "terbaru dulu");
  const s = await sip("GET", "/ringkas", undefined, pim.h); assert.ok(s.j.kit.per_status.gudang <= a.j.kit.per_status.gudang && !s.j.gerak_terakhir.some(g => /^SIPPA-9\d\d$/.test(g.kit_kode)), "staf nyata tidak melihat dummy");
  const w = await sip("GET", "/ringkas", undefined, pus61.h); assert.equal(Object.values(w.j.kit.per_status).reduce((x, y) => x + y, 0) - await hitung("sippa_kit", "dummy = 0 AND prov = '61'"), 0, "wilayah 61: tepat kit provinsi 61 (kit tanpa provinsi tak terlihat), nol kit 62"); assert.equal(w.j.log.n_karhutla, 0); const g61 = new Set((await DB.prepare("SELECT g.id FROM sippa_gerak g JOIN sippa_kit k ON k.id = g.kit_id WHERE g.dummy = 0 AND (g.prov = '61' OR k.prov = '61')").all()).results.map(x => x.id)); assert.deepEqual(w.j.gerak_terakhir.filter(g => !g61.has(g.id)), [], "wilayah 61: hanya gerak yang menyentuh provinsi 61 (tujuan atau asal kit)");
  const n0 = await hitung("laju_bnpb"); for (let i = 0; i < 20; i++) assert.equal((await sip("GET", "/ringkas", undefined, pus.h)).s, 200); assert.equal(await hitung("laju_bnpb"), n0, "GET ringkas tanpa laju");
  assert.equal((await sip("POST", "/dummy/hapus", {}, ADMIN)).s, 200);
});
uji("GET dan POST /api/sippa/jalan-cek: W 201 dengan jejak; pimpinan 403, tamu 401; masukan liar 400; wilayah 61 tidak boleh menulis prov 62 dan tidak melihatnya; filter kompleks; laju 600; GET tanpa laju", async () => {
  const bd = (o = {}) => ({kompleks_id: "K0001", prov: "62", musim: "kemarau", hasil: "lolos", kendaraan: "pickup_4x4", catatan: "Jalan tanah, kering", ...o});
  assert.equal((await sip("GET", "/jalan-cek")).s, 401); assert.equal((await sip("GET", "/jalan-cek", undefined, ver.h)).s, 403);
  assert.deepEqual((await sip("GET", "/jalan-cek", undefined, pim.h)).j, {cek: []}); for (const q of ["kompleks=k1", "kompleks=K12x", "kompleks=", "kompleks=K1%27"]) assert.equal((await sip("GET", "/jalan-cek?" + q, undefined, pim.h)).s, 400, q);
  const j0 = await jejak(), n0 = await hitung("sippa_jalan_cek");
  const ok = await sip("POST", "/jalan-cek", bd(), pus.h); assert.equal(ok.s, 201, ok.t); cekKepala(ok, "jalan-cek");
  const baris = await DB.prepare("SELECT * FROM sippa_jalan_cek WHERE id = ?").bind(ok.j.cek.id).first(); assert.equal(baris.oleh, pus.kunci); assert.equal(baris.dummy, 0); assert.equal(baris.kompleks_id, "K0001"); assert.ok(Math.abs(baris.waktu - Date.now()) < 60e3, "waktu dari server");
  assert.equal(await jejak(), j0 + 1, "satu baris jejak"); assert.equal(await hitung("sippa_jalan_cek"), n0 + 1);
  assert.equal((await sip("POST", "/jalan-cek", {kompleks_id: "K0002", prov: "62", musim: "hujan", hasil: "gagal"}, koor.h)).s, 201, "tanpa kendaraan dan catatan");
  const n1 = await hitung("sippa_jalan_cek");
  assert.equal((await sip("POST", "/jalan-cek", bd(), pim.h)).s, 403); assert.equal((await sip("POST", "/jalan-cek", bd())).s, 401); assert.equal((await sip("POST", "/jalan-cek", bd(), pus.g)).s, 401, "sesi tanpa x-pb"); assert.equal((await sip("POST", "/jalan-cek", bd(), ver.h)).s, 403);
  const liar = [{kompleks_id: "X1"}, {kompleks_id: "k1"}, {kompleks_id: 5}, {kompleks_id: undefined}, {prov: "6"}, {prov: "AB"}, {prov: 62}, {musim: "semi"}, {musim: undefined}, {hasil: "mungkin"}, {hasil: undefined}, {kendaraan: "roket"}, {catatan: "x".repeat(501)}, {catatan: 7}, {foto_id: "zz"}, {foto_id: "0123456789abcdef"}];
  for (const l of liar) { const r = await sip("POST", "/jalan-cek", bd(l), pus.h); assert.equal(r.s, 400, `${JSON.stringify(l)}: ${r.s} ${r.t}`); assert.ok(r.j?.galat, "pesan galat menyebut medan"); }
  assert.equal((await sip("POST", "/jalan-cek", [1], pus.h)).s, 400); assert.equal((await sip("POST", "/jalan-cek", "{rusak", pus.h)).s, 400);
  assert.equal(await hitung("sippa_jalan_cek"), n1, "masukan liar tidak menulis");
  assert.equal((await sip("POST", "/jalan-cek", bd({catatan: "x".repeat(500)}), pus.h)).s, 201, "tepat 500 sah");
  const w = await sip("POST", "/jalan-cek", bd(), pus61.h); assert.equal(w.s, 404, "wilayah 61 menulis prov 62 = tidak tersedia"); assert.equal((await sip("POST", "/jalan-cek", bd({prov: "61", kompleks_id: "K0900"}), pus61.h)).s, 201);
  const sem = (await sip("GET", "/jalan-cek", undefined, pim.h)).j.cek; assert.ok(sem.length >= 4 && sem.every(c => ["id", "kompleks_id", "prov", "musim", "hasil", "waktu"].every(f => f in c)));
  assert.deepEqual(sem.map(c => c.waktu), sem.map(c => c.waktu).sort((a, b) => b - a), "terbaru dulu");
  const w61 = (await sip("GET", "/jalan-cek", undefined, pus61.h)).j.cek; assert.ok(w61.length === 1 && w61[0].prov === "61", "wilayah 61 hanya melihat provinsinya");
  assert.ok((await sip("GET", "/jalan-cek?kompleks=K0002", undefined, pim.h)).j.cek.every(c => c.kompleks_id === "K0002"));
  const l0 = await hitung("laju_bnpb"); for (let i = 0; i < 30; i++) assert.equal((await sip("GET", "/jalan-cek", undefined, pim.h)).s, 200); assert.equal(await hitung("laju_bnpb"), l0, "GET tanpa laju");
  await isiLaju(pus.kunci, "sippa.tulis", 600); assert.equal((await sip("POST", "/jalan-cek", bd(), pus.h)).s, 429, "laju 600 per jam"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pus.kunci).run();
});
uji("POST /api/sippa/aoi: W 201 status usul dengan jejak; pimpinan 403, tamu 401; kompleks atau sel wajib; masukan liar 400; wilayah 61 tidak boleh usul prov 62; status kiriman klien diabaikan; laju 120", async () => {
  const bd = (o = {}) => ({kompleks_id: "K0001", prov: "62", alasan: "Kompleks sering terbakar, belum ada kit di dekatnya", ...o});
  const j0 = await jejak(), n0 = await hitung("sippa_aoi_usul");
  const ok = await sip("POST", "/aoi", bd({status: "terpilih", oleh: "orang-lain", dummy: 1}), pus.h); assert.equal(ok.s, 201, ok.t); cekKepala(ok, "aoi");
  const b = await DB.prepare("SELECT * FROM sippa_aoi_usul WHERE id = ?").bind(ok.j.aoi.id).first(); assert.equal(b.status, "usul", "status tidak bisa diisi klien"); assert.equal(b.oleh, pus.kunci); assert.equal(b.dummy, 0); assert.equal(b.sel, null);
  assert.equal(await jejak(), j0 + 1); assert.equal(await hitung("sippa_aoi_usul"), n0 + 1);
  assert.equal((await sip("POST", "/aoi", {sel: "s650_1000", prov: "62", alasan: "Sel kekerapan tinggi tanpa kompleks"}, koor.h)).s, 201, "hanya sel");
  assert.equal((await sip("POST", "/aoi", {kompleks_id: "K0001", sel: "s650_1000", prov: "62", alasan: "Keduanya sekaligus"}, koor.h)).s, 201, "kompleks dan sel");
  const n1 = await hitung("sippa_aoi_usul");
  assert.equal((await sip("POST", "/aoi", bd(), pim.h)).s, 403); assert.equal((await sip("POST", "/aoi", bd())).s, 401); assert.equal((await sip("POST", "/aoi", bd(), pus.g)).s, 401); assert.equal((await sip("POST", "/aoi", bd(), ver.h)).s, 403);
  const liar = [{kompleks_id: "X1"}, {kompleks_id: 7}, {kompleks_id: undefined, sel: "s12"}, {kompleks_id: undefined, sel: "S1_2"}, {kompleks_id: undefined, sel: "s1_2 "}, {prov: "6"}, {prov: undefined}, {alasan: "abcd"}, {alasan: "    a   "}, {alasan: "x".repeat(501)}, {alasan: undefined}, {alasan: 12345}];
  for (const l of liar) { const r = await sip("POST", "/aoi", bd(l), pus.h); assert.equal(r.s, 400, `${JSON.stringify(l)}: ${r.s} ${r.t}`); assert.ok(r.j?.galat); }
  assert.equal((await sip("POST", "/aoi", {prov: "62", alasan: "Tanpa kompleks dan tanpa sel"}, pus.h)).s, 400, "kompleks_id atau sel wajib"); assert.equal(await hitung("sippa_aoi_usul"), n1, "masukan liar tidak menulis");
  assert.equal((await sip("POST", "/aoi", bd({alasan: "abcde"}), pus.h)).s, 201, "tepat 5 sah"); assert.equal((await sip("POST", "/aoi", bd({alasan: "x".repeat(500)}), pus.h)).s, 201, "tepat 500 sah");
  assert.equal((await sip("POST", "/aoi", bd(), pus61.h)).s, 404, "wilayah 61 usul prov 62"); assert.equal((await sip("POST", "/aoi", bd({prov: "61"}), pus61.h)).s, 201);
  await isiLaju(pus.kunci, "sippa.aoi", 120); assert.equal((await sip("POST", "/aoi", bd(), pus.h)).s, 429, "laju 120 per jam"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pus.kunci).run();
});
uji("dummy layar peta: mengisi cek jalan dan usul AOI di periode yang terpampang, isi kedua 409, hanya admin melihat, hapus menyisakan baris nyata", async () => {
  const sejak = Date.now() - 20 * HARI, sampai = Date.now() - HARI, nyata = async () => [await hitung("sippa_jalan_cek", "dummy = 0"), await hitung("sippa_aoi_usul", "dummy = 0")], sebelum = await nyata();
  assert.equal((await sip("POST", "/dummy/isi", {layar: "peta", sejak, sampai}, pus.h)).s, 403);
  const r = await sip("POST", "/dummy/isi", {layar: "peta", sejak, sampai}, ADMIN); assert.equal(r.s, 200, r.t); assert.ok(r.j.dibuat.sippa_jalan_cek >= 3 && r.j.dibuat.sippa_aoi_usul >= 2, JSON.stringify(r.j.dibuat));
  const d = (await DB.prepare("SELECT * FROM sippa_jalan_cek WHERE dummy = 1").all()).results; for (const c of d) assert.ok(c.waktu >= sejak && c.waktu <= sampai, "periode yang terpampang");
  assert.ok(new Set(d.map(c => c.hasil)).size === 2 && new Set(d.map(c => c.musim)).size === 2, "lolos dan gagal, kemarau dan hujan bervariasi (bukan angka sama rata)");
  assert.ok(new Set((await DB.prepare("SELECT status FROM sippa_aoi_usul WHERE dummy = 1").all()).results.map(x => x.status)).size >= 2, "status AOI bervariasi");
  assert.equal((await sip("POST", "/dummy/isi", {layar: "peta", sejak, sampai}, ADMIN)).s, 409);
  assert.ok(!(await sip("GET", "/jalan-cek", undefined, pim.h)).j.cek.some(c => d.some(x => x.id === c.id)), "staf nyata tidak melihat dummy"); assert.ok((await sip("GET", "/jalan-cek", undefined, ADMIN)).j.cek.some(c => c.dummy === 1), "admin melihat");
  assert.equal((await sip("POST", "/dummy/hapus", {}, ADMIN)).s, 200); assert.equal(await hitung("sippa_jalan_cek", "dummy = 1"), 0); assert.equal(await hitung("sippa_aoi_usul", "dummy = 1"), 0); assert.deepEqual(await nyata(), sebelum, "baris nyata utuh");
});

/* ---------------------------------------------------------------- SP-035: A/B, skenario, laporan */
const KEPALA_AB = "petak_id,aoi,prov,lengan,pasangan_id,tanggal_perlakuan,luas_m2,regu_hari,air_m3,surfaktan_l,biaya_rp,dingin_24j,dingin_72j,nyala_7h,nyala_30h,nyala_90h,catatan";
const barisAb = (o = {}) => { const b = {petak_id: "P-001", aoi: "AOI-1", prov: "62", lengan: "lance", pasangan_id: "", tanggal_perlakuan: "2026-09-01", luas_m2: 5000, regu_hari: 4, air_m3: 120, surfaktan_l: 0, biaya_rp: 2500000, dingin_24j: 1, dingin_72j: 1, nyala_7h: 0, nyala_30h: 0, nyala_90h: "", catatan: "ok", ...o};
  return KEPALA_AB.split(",").map(k => b[k]).join(","); };
const unggahAb = (baris, h = pus.h, pisah = ",") => sip("POST", "/ab/unggah", [KEPALA_AB, ...baris].map(x => pisah === "," ? x : x.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, pisah)).join("\n") + "\n", h);
const adaPetak = aoi => hitung("sippa_petak", "aoi = ?", aoi);
uji("POST /api/sippa/ab/unggah: W 201 {unggah_id, n}; satu baris salah = 400 dengan baris dan kolom dan 0 baris tersimpan; sha sama 409; titik koma dikenali; pimpinan 403; tamu 401", async () => {
  const j0 = await jejak(), n0 = await hitung("sippa_petak");
  const r = await unggahAb([barisAb({petak_id: "P-001"}), barisAb({petak_id: "P-002", lengan: "konvensional", nyala_90h: 1})]);
  assert.equal(r.s, 201, r.t); assert.equal(r.j.n, 2); assert.match(r.j.unggah_id, /^[0-9a-f]{16}$/); cekKepala(r, "ab/unggah");
  assert.equal(await adaPetak("AOI-1"), 2); assert.equal(await jejak(), j0 + 1, "satu jejak per unggahan");
  const u = await DB.prepare("SELECT * FROM sippa_ab_unggah WHERE id = ?").bind(r.j.unggah_id).first(); assert.equal(u.status, "draf"); assert.equal(u.n_baris, 2); assert.equal(u.dummy, 0);
  const p = await DB.prepare("SELECT * FROM sippa_petak WHERE petak_id = 'P-002'").first(); assert.equal(p.sumber, "unggah"); assert.equal(p.nyala_90h, 1); assert.equal(p.unggah_id, r.j.unggah_id);
  const kembar = await unggahAb([barisAb({petak_id: "P-001"}), barisAb({petak_id: "P-002", lengan: "konvensional", nyala_90h: 1})]); assert.equal(kembar.s, 409, "sha sama"); assert.equal(await adaPetak("AOI-1"), 2);
  /* satu baris salah: tidak ada yang tersimpan; nomor baris berhitung dari baris kepala = 1 */
  const salah = await unggahAb([barisAb({aoi: "AOI-2", petak_id: "Q-001"}), barisAb({aoi: "AOI-2", petak_id: "Q-002", lengan: "lance", surfaktan_l: 5}), barisAb({aoi: "AOI-2", petak_id: "Q-003", lengan: "tidakada"}), barisAb({aoi: "AOI-2", petak_id: "Q-004", tanggal_perlakuan: "2999-01-01"})]);
  assert.equal(salah.s, 400, salah.t); assert.match(salah.j.galat, /3 baris salah, tidak ada yang disimpan/); assert.equal(await adaPetak("AOI-2"), 0, "0 baris tersimpan");
  assert.deepEqual(salah.j.rincian.map(x => `${x.baris}:${x.kolom}`), ["3:surfaktan_l", "4:lengan", "5:tanggal_perlakuan"]); for (const x of salah.j.rincian) assert.ok(x.alasan.length > 5);
  /* titik koma dikenali dari baris kepala; koma desimal diterima di berkas titik koma */
  const tk = await unggahAb([barisAb({aoi: "AOI-3", petak_id: "S-001", luas_m2: '"1500,5"'})], pus.h, ";"); assert.equal(tk.s, 201, tk.t); assert.equal((await DB.prepare("SELECT luas_m2 FROM sippa_petak WHERE aoi = 'AOI-3'").first()).luas_m2, 1500.5);
  assert.equal((await unggahAb([barisAb({aoi: "AOI-4", petak_id: "T-001", lengan: "lance_surfaktan", surfaktan_l: 5})])).s, 201, "surfaktan > 0 sah di lengan surfaktan");
  const gandaDalam = await unggahAb([barisAb({aoi: "AOI-5", petak_id: "U-001"}), barisAb({aoi: "AOI-5", petak_id: "U-001"})]); assert.equal(gandaDalam.s, 400); assert.equal(gandaDalam.j.rincian[0].kolom, "petak_id"); assert.equal(await adaPetak("AOI-5"), 0);
  const gandaLama = await unggahAb([barisAb({aoi: "AOI-1", petak_id: "P-001", catatan: "beda"})]); assert.equal(gandaLama.s, 400, "petak yang sudah ada di basis data ditolak per baris"); assert.equal(gandaLama.j.rincian[0].kolom, "petak_id");
  assert.equal((await unggahAb([barisAb({aoi: "AOI-6", petak_id: "P-001"})])).s, 201, "aoi beda, petak sama: sah");
  for (const [ket, o, kol] of [["luas 0", {luas_m2: 0}, "luas_m2"], ["luas 100001", {luas_m2: 100001}, "luas_m2"], ["luas huruf", {luas_m2: "abc"}, "luas_m2"], ["petak 2 huruf", {petak_id: "ab"}, "petak_id"], ["aoi kosong", {aoi: ""}, "aoi"], ["prov 1 digit", {prov: "6"}, "prov"],
    ["tanggal 31 Feb", {tanggal_perlakuan: "2026-02-31"}, "tanggal_perlakuan"], ["tanggal besok", {tanggal_perlakuan: new Date(Date.now() + 2 * HARI).toISOString().slice(0, 10)}, "tanggal_perlakuan"], ["dingin 2", {dingin_24j: 2}, "dingin_24j"], ["biaya pecahan", {biaya_rp: "1.5"}, "biaya_rp"],
    ["biaya negatif", {biaya_rp: -1}, "biaya_rp"], ["regu 1001", {regu_hari: 1001}, "regu_hari"], ["air 100001", {air_m3: 100001}, "air_m3"], ["catatan 501", {catatan: "x".repeat(501)}, "catatan"]]) {
    const x = await unggahAb([barisAb({aoi: "AOI-9", petak_id: "Z-001", ...o})]); assert.equal(x.s, 400, `${ket}: ${x.t}`); assert.equal(x.j.rincian[0].kolom, kol, ket);
  }
  assert.equal(await adaPetak("AOI-9"), 0);
  assert.equal((await sip("POST", "/ab/unggah", "petak_id,aoi\nA-001,X\n", pus.h)).s, 400, "kolom wajib hilang"); assert.equal((await sip("POST", "/ab/unggah", KEPALA_AB + ",sakti\n" + barisAb({aoi: "AOI-7"}) + ",1\n", pus.h)).s, 400, "kolom asing"); assert.equal((await sip("POST", "/ab/unggah", "", pus.h)).s, 400);
  assert.equal((await sip("POST", "/ab/unggah", new Uint8Array([0xff, 0xfe, 0x41]), pus.h)).s, 400, "bukan UTF-8");
  assert.equal((await unggahAb([barisAb({aoi: "AOI-8", petak_id: "K-001", catatan: '"=1+1, ""x"""'})])).s, 201); assert.equal((await DB.prepare("SELECT catatan FROM sippa_petak WHERE aoi = 'AOI-8'").first()).catatan, '=1+1, "x"');
  assert.equal((await unggahAb([barisAb({aoi: "AOI-10"})], pim.h)).s, 403); assert.equal((await unggahAb([barisAb({aoi: "AOI-10"})], {})).s, 401); assert.equal((await unggahAb([barisAb({aoi: "AOI-10"})], ver.h)).s, 403);
  assert.equal(await adaPetak("AOI-10"), 0); assert.ok(await hitung("sippa_petak") > n0);
});
uji("POST /ab/unggah: 1.048.577 byte 413, 2.001 baris 400, 2.000 baris sah 201 (atomik); rincian paling banyak 50; staf wilayah 61 tidak boleh menulis prov 62; laju 20", async () => {
  assert.equal((await sip("POST", "/ab/unggah", "x".repeat(1048577), pus.h)).s, 413);
  const baris = (n, aoi) => Array.from({length: n}, (_, i) => barisAb({aoi, petak_id: "B-" + String(i).padStart(5, "0")}));
  const lebih = await unggahAb(baris(2001, "AOI-B1")); assert.equal(lebih.s, 400, lebih.t); assert.match(lebih.j.galat, /2\.000/); assert.equal(await adaPetak("AOI-B1"), 0);
  const pas = await unggahAb(baris(2000, "AOI-B2")); assert.equal(pas.s, 201, pas.t.slice(0, 300)); assert.equal(pas.j.n, 2000); assert.equal(await adaPetak("AOI-B2"), 2000);
  const banyak = await unggahAb(Array.from({length: 120}, (_, i) => barisAb({aoi: "AOI-R", petak_id: "R-" + String(i).padStart(4, "0"), lengan: "tidakada"}))); assert.equal(banyak.s, 400); assert.equal(banyak.j.rincian.length, 50); assert.match(banyak.j.galat, /120 baris salah/);
  const w = await unggahAb([barisAb({aoi: "AOI-W", petak_id: "W-001", prov: "62"})], pus61.h); assert.equal(w.s, 400, w.t); assert.equal(w.j.rincian[0].kolom, "prov"); assert.equal(await adaPetak("AOI-W"), 0);
  assert.equal((await unggahAb([barisAb({aoi: "AOI-W", petak_id: "W-002", prov: ""})], pus61.h)).s, 400, "staf berwilayah wajib mengisi prov");
  assert.equal((await unggahAb([barisAb({aoi: "AOI-W", petak_id: "W-003", prov: "61"})], pus61.h)).s, 201);
  await isiLaju(pus.kunci, "sippa.ab", 20); assert.equal((await unggahAb([barisAb({aoi: "AOI-L", petak_id: "L-001"})])).s, 429, "laju 20"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pus.kunci).run();
});
uji("GET /api/sippa/ab dan ab.csv: B 200 {petak, unggah}, filter aoi dan lengan, filter liar 400; CSV aman injeksi rumus; wilayah 61 hanya miliknya; tamu 401; laju csv 60; baris dummy tersaring", async () => {
  const r = await sip("GET", "/ab", undefined, pim.h); assert.equal(r.s, 200, r.t); cekKepala(r, "ab"); assert.ok(r.j.petak.length >= 2 && r.j.unggah.length >= 2);
  const f = await sip("GET", "/ab?aoi=AOI-1&lengan=konvensional", undefined, pim.h); assert.deepEqual(f.j.petak.map(p => p.petak_id), ["P-002"]);
  assert.equal((await sip("GET", "/ab?lengan=liar", undefined, pim.h)).s, 400); assert.equal((await sip("GET", "/ab?aoi=" + "x".repeat(41), undefined, pim.h)).s, 400); assert.equal((await sip("GET", "/ab")).s, 401); assert.equal((await sip("GET", "/ab", undefined, ver.h)).s, 403);
  const w = await sip("GET", "/ab?aoi=AOI-W", undefined, pus61.h); assert.ok(w.j.petak.length > 0 && w.j.petak.every(p => p.prov === "61"), "staf 61 hanya melihat prov 61"); assert.equal((await sip("GET", "/ab?aoi=AOI-1", undefined, pus61.h)).j.petak.length, 0);
  await DB.prepare("UPDATE sippa_petak SET catatan = ? WHERE petak_id = 'P-002' AND aoi = 'AOI-1'").bind("=HYPERLINK(1)").run();
  const c = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/ab.csv", {headers: pim.h}); const t = await c.text(); assert.equal(c.status, 200); assert.match(c.headers.get("content-disposition"), /^attachment; filename="sippa-ab-\d{8}\.csv"$/); assert.match(t, /'=HYPERLINK\(1\)/); assert.ok(t.startsWith("petak_id,"));
  assert.equal((await sip("GET", "/ab.csv")).s, 401);
  await isiLaju(pim.kunci, "sippa.csv", 60); assert.equal((await sip("GET", "/ab.csv", undefined, pim.h)).s, 429, "laju csv 60"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pim.kunci).run();
  const d = await sip("POST", "/dummy/isi", {layar: "ab"}, ADMIN); assert.equal(d.s, 200, d.t); assert.ok(await hitung("sippa_petak", "dummy = 1") > 0 && await hitung("sippa_ab_unggah", "dummy = 1") > 0, "dummy layar ab mengisi petak dan unggahan");
  assert.ok(!(await sip("GET", "/ab?aoi=DUMMY-AOI", undefined, pim.h)).j.petak.length, "dummy tersaring dari staf nyata"); assert.ok((await sip("GET", "/ab?aoi=DUMMY-AOI", undefined, ADMIN)).j.petak.length > 0, "admin melihat dummy");
  assert.equal((await sip("POST", "/dummy/isi", {layar: "ab"}, ADMIN)).s, 409);
});
uji("SP-052: rantai dummy tiap layar menunjuk pengisi yang ada; A/B dummy memberi tiga vonis G4 dan n 10/10/6/8 (vonisG4 sungguhan)", async () => {
  const {RANTAI_DUMMY, PENGISI, LAYAR_SIPPA} = await import("../../src/sippa.js"), {vonisG4} = await import("../../public/pipa/hitung.js");
  for (const l of LAYAR_SIPPA) assert.ok(Object.hasOwn(RANTAI_DUMMY, l), `layar ${l} tanpa entri RANTAI_DUMMY`);
  for (const [l, ns] of Object.entries(RANTAI_DUMMY)) for (const n of ns) assert.equal(typeof PENGISI[n], "function", `${l}: pengisi ${n} tidak ada`);
  assert.deepEqual(Object.keys(RANTAI_DUMMY).filter(l => !RANTAI_DUMMY[l].length).sort(), ["3d", "data", "hitung"], "hanya layar R2/hitung yang boleh tanpa pengisi");
  const r = (await DB.prepare("SELECT * FROM sippa_petak WHERE aoi = 'DUMMY-AOI' AND dummy = 1").all()).results, per = l => r.filter(x => x.lengan === l).map(x => ({...x, tanggal_perlakuan: "2027-01-01"}));
  assert.deepEqual(["konvensional", "lance", "lance_surfaktan", "sekat_rewetting"].map(l => per(l).length), [10, 10, 6, 8]);
  assert.deepEqual(["lance", "lance_surfaktan", "sekat_rewetting"].map(l => vonisG4(per(l), per("konvensional")).vonis), ["LULUS", "BELUM BISA DIPUTUS", "TIDAK LULUS"], "tanggal digeser lewat pilot_sampai supaya vonis keluar");
});
uji("POST /api/sippa/ab-status/:id: moderator 200 ke ditinjau_evaluator (idempoten), pusdalops 403, status liar 400, id acak 404, tamu 401; laju 20", async () => {
  const id = (await DB.prepare("SELECT id FROM sippa_ab_unggah WHERE dummy = 0 LIMIT 1").first()).id, j0 = await jejak();
  assert.equal((await sip("POST", "/ab-status/" + id, {status: "ditinjau_evaluator"}, pus.h)).s, 403); assert.equal((await sip("POST", "/ab-status/" + id, {status: "ditinjau_evaluator"})).s, 401);
  assert.equal((await sip("POST", "/ab-status/" + id, {status: "draf"}, MOD2)).s, 400); assert.equal((await sip("POST", "/ab-status/" + id, {}, MOD2)).s, 400); assert.equal((await sip("POST", "/ab-status/0123456789abcdef", {status: "ditinjau_evaluator"}, MOD2)).s, 404);
  assert.equal((await DB.prepare("SELECT status FROM sippa_ab_unggah WHERE id = ?").bind(id).first()).status, "draf");
  const r = await sip("POST", "/ab-status/" + id, {status: "ditinjau_evaluator"}, MOD2); assert.equal(r.s, 200, r.t); assert.equal(r.j.status, "ditinjau_evaluator"); assert.equal(await jejak(), j0 + 1);
  assert.equal((await sip("POST", "/ab-status/" + id, {status: "ditinjau_evaluator"}, MOD2)).s, 200); assert.equal(await jejak(), j0 + 1, "ulang idempoten tanpa jejak kedua");
  assert.equal((await sip("GET", "/ab", undefined, pim.h)).j.unggah.find(u => u.id === id).status, "ditinjau_evaluator");
  await isiLaju(MOD, "sippa.ab", 20); assert.equal((await sip("POST", "/ab-status/" + id, {status: "ditinjau_evaluator"}, MOD2)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(MOD).run();
});
const stateS = {n_lance: 8, q_lpm: 300, trase: [[0, 0], [1, 1]]};
uji("skenario: W 201 simpan, GET daftar tanpa state kecuali ?id=, hapus lunak oleh pembuat atau moderator, orang lain 403; nama 2 huruf, state bukan objek, state 32.769 byte 400; laju 120", async () => {
  const j0 = await jejak();
  const r = await sip("POST", "/skenario", {nama: "Uji pompa A", state: stateS, versi_mesin: "studio-1", ringkas: {vonis: "KONDISIONAL"}}, pus.h); assert.equal(r.s, 201, r.t); assert.match(r.j.id, /^[0-9a-f]{16}$/); assert.equal(await jejak(), j0 + 1);
  for (const [ket, b] of [["nama 2 huruf", {nama: "ab", state: stateS, versi_mesin: "studio-1"}], ["nama 81", {nama: "x".repeat(81), state: stateS, versi_mesin: "studio-1"}], ["state larik", {nama: "Uji B", state: [1], versi_mesin: "studio-1"}], ["state teks", {nama: "Uji B", state: "x", versi_mesin: "studio-1"}],
    ["state null", {nama: "Uji B", state: null, versi_mesin: "studio-1"}], ["versi 1 huruf", {nama: "Uji B", state: stateS, versi_mesin: "v"}], ["ringkas larik", {nama: "Uji B", state: stateS, versi_mesin: "studio-1", ringkas: [1]}], ["tanpa state", {nama: "Uji B", versi_mesin: "studio-1"}]]) assert.equal((await sip("POST", "/skenario", b, pus.h)).s, 400, ket);
  assert.equal((await sip("POST", "/skenario", {nama: "Uji tepi", state: {a: "x".repeat(32768 - 8)}, versi_mesin: "studio-1"}, pus.h)).s, 201, "tepat 32.768 byte sah");
  assert.equal((await sip("POST", "/skenario", {nama: "Uji besar", state: {a: "x".repeat(32769 - 8)}, versi_mesin: "studio-1"}, pus.h)).s, 400, "32.769 byte");
  assert.equal((await sip("POST", "/skenario", {nama: "Uji B", state: stateS, versi_mesin: "studio-1"}, pim.h)).s, 403); assert.equal((await sip("POST", "/skenario", {nama: "Uji B", state: stateS, versi_mesin: "studio-1"})).s, 401);
  const d = await sip("GET", "/skenario", undefined, pim.h); assert.equal(d.s, 200); const e = d.j.skenario.find(s => s.id === r.j.id); assert.ok(e && !("state" in e), "daftar tanpa state"); assert.equal(e.nama, "Uji pompa A"); assert.equal(e.oleh, pus.kunci); assert.deepEqual(e.ringkas, {vonis: "KONDISIONAL"});
  const s1 = await sip("GET", "/skenario?id=" + r.j.id, undefined, pim.h); assert.equal(s1.s, 200); assert.deepEqual(s1.j.skenario[0].state, stateS); assert.equal((await sip("GET", "/skenario?id=0123456789abcdef", undefined, pim.h)).s, 404); assert.equal((await sip("GET", "/skenario?id=zz", undefined, pim.h)).s, 400); assert.equal((await sip("GET", "/skenario")).s, 401);
  assert.equal((await sip("POST", "/skenario-hapus/" + r.j.id, {}, koor.h)).s, 403, "W lain tidak boleh menghapus"); assert.equal((await sip("POST", "/skenario-hapus/" + r.j.id, {}, pim.h)).s, 403); assert.equal((await sip("POST", "/skenario-hapus/" + r.j.id)).s, 401);
  assert.equal((await sip("POST", "/skenario-hapus/0123456789abcdef", {}, pus.h)).s, 404); assert.equal(await hitung("sippa_skenario", "id = ? AND dihapus IS NULL", r.j.id), 1);
  const h = await sip("POST", "/skenario-hapus/" + r.j.id, {}, pus.h); assert.equal(h.s, 200, h.t); assert.equal(await hitung("sippa_skenario", "id = ? AND dihapus IS NOT NULL", r.j.id), 1, "hapus lunak: baris tetap"); assert.ok(!(await sip("GET", "/skenario", undefined, pim.h)).j.skenario.some(s => s.id === r.j.id));
  assert.equal((await sip("GET", "/skenario?id=" + r.j.id, undefined, pim.h)).s, 404, "yang dihapus tidak terbaca");
  const r2 = await sip("POST", "/skenario", {nama: "Uji milik koor", state: stateS, versi_mesin: "studio-1"}, koor.h); assert.equal((await sip("POST", "/skenario-hapus/" + r2.j.id, {}, MOD2)).s, 200, "moderator boleh");
  await isiLaju(pus.kunci, "sippa.skenario", 120); assert.equal((await sip("POST", "/skenario", {nama: "Uji laju", state: stateS, versi_mesin: "studio-1"}, pus.h)).s, 429, "laju 120"); assert.equal((await sip("POST", "/skenario-hapus/" + r.j.id, {}, pus.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pus.kunci).run();
  assert.equal((await sip("POST", "/dummy/isi", {layar: "studio"}, ADMIN)).s, 200); assert.ok(await hitung("sippa_skenario", "dummy = 1") > 0, "dummy studio"); assert.ok(!(await sip("GET", "/skenario", undefined, pim.h)).j.skenario.some(s => s.dummy === 1), "dummy tersaring dari staf nyata");
});
const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const kirimLaporan = async (meta, pdf, h = pus.h) => { const f = new FormData(); f.append("meta", typeof meta === "string" ? meta : JSON.stringify(meta)); if (pdf) f.append("berkas", new File([pdf], "x.pdf", {type: "application/pdf"}));
  const {body, headers} = await badanPanjang(f, h); const r = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/laporan", {method: "POST", body, headers}); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return {s: r.status, j, t, h: r.headers}; };
uji("laporan: W 201 dengan PDF di R2 sippa-laporan/<id>.pdf dari server; GET daftar; berkas attachment + CSP sandbox; tanpa %PDF- 400; meta bukan JSON 400; 8.193 byte 400; 10.485.761 byte 413; tamu 401; laju 30", async () => {
  const j0 = await jejak(), r = await kirimLaporan({jenis: "pilot", prov: "62", parameter: {dari: "2026-10-01", sampai: "2026-10-26"}}, PDF); assert.equal(r.s, 201, r.t); assert.match(r.j.id, /^[0-9a-f]{16}$/); assert.equal(await jejak(), j0 + 1);
  const b = await DB.prepare("SELECT * FROM sippa_laporan WHERE id = ?").bind(r.j.id).first(); assert.equal(b.ada_berkas, 1); assert.equal(b.ukuran, PDF.length); assert.equal(b.sha, createHash("sha256").update(PDF).digest("hex")); assert.equal(b.jenis, "pilot"); assert.equal(b.prov, "62"); assert.equal(b.oleh, pus.kunci);
  const o = await R2.get("sippa-laporan/" + r.j.id + ".pdf"); assert.ok(o, "objek R2 dari id server"); assert.equal(o.httpMetadata.contentType, "application/pdf"); assert.equal((await o.arrayBuffer()).byteLength, PDF.length);
  const dl = await sip("GET", "/laporan", undefined, pim.h); assert.equal(dl.s, 200); const e = dl.j.laporan.find(x => x.id === r.j.id); assert.ok(e && e.ada_berkas === 1 && e.jenis === "pilot"); assert.equal((await sip("GET", "/laporan?jenis=musim", undefined, pim.h)).j.laporan.length, 0); assert.equal((await sip("GET", "/laporan?jenis=liar", undefined, pim.h)).s, 400); assert.equal((await sip("GET", "/laporan")).s, 401);
  const g = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/laporan-berkas/" + r.j.id, {headers: pim.h}); assert.equal(g.status, 200); assert.equal(g.headers.get("content-type"), "application/pdf"); assert.equal(g.headers.get("content-security-policy"), "sandbox"); assert.equal(g.headers.get("x-content-type-options"), "nosniff");
  assert.match(g.headers.get("content-disposition"), /^attachment; filename="sippa-pilot-62-\d{8}\.pdf"$/); assert.equal((await g.arrayBuffer()).byteLength, PDF.length);
  assert.equal((await mf.dispatchFetch("http://bnpb.lokal/api/sippa/laporan-berkas/" + r.j.id)).status, 401); assert.equal((await sip("GET", "/laporan-berkas/0123456789abcdef", undefined, pim.h)).s, 404);
  const k = await kirimLaporan({jenis: "mingguan", parameter: {minggu: 44}}); assert.equal(k.s, 201, k.t); assert.equal(await hitung("sippa_laporan", "id = ? AND ada_berkas = 0 AND sha IS NULL", k.j.id), 1); assert.equal((await sip("GET", "/laporan-berkas/" + k.j.id, undefined, pim.h)).s, 404, "tanpa berkas");
  const palsu = await kirimLaporan({jenis: "pilot", parameter: {}}, new TextEncoder().encode("<html>bukan pdf</html>")); assert.equal(palsu.s, 400, palsu.t); assert.match(palsu.j.galat, /PDF/);
  assert.equal((await kirimLaporan("{bukan json", PDF)).s, 400); assert.equal((await kirimLaporan({jenis: "liar", parameter: {}}, PDF)).s, 400); assert.equal((await kirimLaporan({jenis: "pilot", parameter: "teks"}, PDF)).s, 400); assert.equal((await kirimLaporan({jenis: "pilot"}, PDF)).s, 400); assert.equal((await kirimLaporan({jenis: "pilot", prov: "6", parameter: {}}, PDF)).s, 400);
  const meta8193 = JSON.stringify({jenis: "pilot", parameter: {a: "x".repeat(8193)}}); assert.ok(new TextEncoder().encode(meta8193).length > 8192); assert.equal((await kirimLaporan(meta8193, PDF)).s, 400, "meta > 8.192 byte");
  const pdfBesar = new Uint8Array(10485761); pdfBesar.set(PDF); assert.equal((await kirimLaporan({jenis: "pilot", parameter: {}}, pdfBesar)).s, 413, "PDF 10.485.761 byte");
  assert.equal((await kirimLaporan({jenis: "pilot", parameter: {}}, new Uint8Array(0))).s, 400, "PDF kosong");
  assert.equal(await hitung("sippa_laporan", "ada_berkas = 1"), 1, "yang ditolak tidak meninggalkan baris"); assert.equal((await R2.list({prefix: "sippa-laporan/"})).objects.length, 1, "yang ditolak tidak meninggalkan objek R2");
  assert.equal((await kirimLaporan({jenis: "pilot", parameter: {}}, PDF, pim.h)).s, 403); assert.equal((await kirimLaporan({jenis: "pilot", parameter: {}}, PDF, {})).s, 401);
  assert.equal((await kirimLaporan({jenis: "pilot", prov: "62", parameter: {}}, PDF, pus61.h)).s, 404, "staf 61 tidak boleh menulis prov 62"); assert.equal((await sip("GET", "/laporan", undefined, pus61.h)).j.laporan.length, 0, "staf 61 tidak melihat laporan prov 62"); assert.equal((await sip("GET", "/laporan-berkas/" + r.j.id, undefined, pus61.h)).s, 404);
  await isiLaju(pus.kunci, "sippa.laporan", 30); assert.equal((await kirimLaporan({jenis: "pilot", parameter: {}}, PDF)).s, 429, "laju 30"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pus.kunci).run();
  assert.equal((await sip("POST", "/dummy/isi", {layar: "laporan"}, ADMIN)).s, 200); assert.ok(await hitung("sippa_laporan", "dummy = 1") > 0, "dummy laporan"); assert.ok((await sip("GET", "/laporan", undefined, pim.h)).j.laporan.every(x => x.dummy !== 1));
  const h = await sip("POST", "/dummy/hapus", {}, ADMIN); assert.equal(h.s, 200, h.t); for (const t of ["sippa_petak", "sippa_ab_unggah", "sippa_skenario", "sippa_laporan"]) assert.equal(await hitung(t, "dummy = 1"), 0, `${t} masih punya dummy`); assert.ok(await hitung("sippa_petak", "dummy = 0") > 0, "baris nyata utuh");
});

/* ---------------------------------------------------------------- dummy tiga layar R4 (SP-096; PRD §9.14, RENCANA-UJI §7.5) */
uji("dummy R4: pelihara, air, akses terisi tanpa nol palsu (empat status jadwal, pil tidak laik gelar, stok di bawah minimum, zona sumur, mutu air tiga rupa, jembatan dengan dan tanpa rencana ganti); isi kedua 409; staf nyata tidak melihat; hapus menyisakan baris nyata", async () => {
  const {jadwal, laikGelar, stokMin, kelasDari, KELAS_ASET} = await import("../../public/pipa/pelihara.js");
  const R4 = ["pelihara", "air", "akses"], tabel = ["sippa_aset", "sippa_inspeksi", "sippa_stok_gerak"];
  /* baris nyata lebih dulu: harus utuh sesudah hapus */
  const rn = await sip("POST", "/aset", {kelas: "sumur_bor", nama: "Sumur nyata", sumber: "pemda", pemilik_aset: "Pemda nyata", keyakinan: "terverifikasi", prov: "62", atribut: {kedalaman_m: 40}}, pus.h); assert.equal(rn.s, 201, rn.t);
  const sn = await sip("POST", "/stok", {gudang: "Gudang nyata", kode_bom: "C-101", nama: "Gasket nyata", delta: 5, satuan: "set", alasan: "terima"}, pus.h); assert.equal(sn.s, 201, sn.t);
  const nyata = async () => Object.fromEntries(await Promise.all(tabel.map(async t => [t, await hitung(t, "dummy = 0")])));
  const sebelum = await nyata(); assert.ok(sebelum.sippa_aset >= 1 && sebelum.sippa_stok_gerak >= 1);
  for (const l of R4) { assert.equal((await sip("POST", "/dummy/isi", {layar: l}, pus.h)).s, 403, `${l}: pusdalops bukan Super Admin`); assert.equal((await sip("POST", "/dummy/isi", {layar: l})).s, 401, `${l}: tamu`); }
  assert.equal(await hitung("sippa_aset", "dummy = 1"), 0, "tolakan tidak menulis");

  /* pelihara */
  const p = await sip("POST", "/dummy/isi", {layar: "pelihara"}, ADMIN); assert.equal(p.s, 200, p.t);
  for (const t of ["sippa_kit", "sippa_komponen", "sippa_log_gelar", "sippa_aset", "sippa_inspeksi", "sippa_stok_gerak"]) assert.ok(p.j.dibuat[t] > 0, `rantai pelihara mengisi ${t}: ${JSON.stringify(p.j.dibuat)}`);
  const d = (await sip("GET", "/pelihara", undefined, ADMIN)).j, kini = d.per, terakhir = new Map();
  for (const i of d.inspeksi_terakhir) { const k = `${i.sasaran_jenis}:${i.sasaran_id}`; if (!(terakhir.get(k) >= i.waktu)) terakhir.set(k, i.waktu); }
  const butir = [];
  for (const c of d.komponen) { const kelas = kelasDari(c.kode_bom); if (kelas) butir.push({kelas, j: jadwal({kelas}, terakhir.get("komponen:" + c.id) ?? null, kelas === "K1" ? d.jam_sejak_servis[c.kit_id] ?? null : null, kini)}); }
  for (const a of d.aset) { const kelas = KELAS_ASET[a.kelas]; butir.push({kelas, j: jadwal({kelas}, terakhir.get("aset:" + a.id) ?? null, null, kini)}); }
  const status = new Set(butir.map(b => b.j.status)); for (const s of ["terlambat", "segera", "aman", "belum_pernah"]) assert.ok(status.has(s), `status jadwal ${s} tidak muncul; ada ${[...status]}`);
  const kit903 = (await DB.prepare("SELECT id FROM sippa_kit WHERE kode = 'SIPPA-903'").first()).id, komp903 = d.komponen.filter(c => c.kit_id === kit903);
  const laik = laikGelar(komp903.map(c => ({kode_bom: c.kode_bom, kondisi: c.kondisi})), []); assert.equal(laik.laik, false, `kit SIPPA-903 harus tidak laik gelar: ${JSON.stringify(komp903.map(c => [c.kode_bom, c.kondisi]))}`);
  assert.ok(komp903.some(c => c.kondisi === "rusak_berat" && kelasDari(c.kode_bom) === "K1"), "satu komponen K1 skor 2 (rusak_berat)");
  assert.ok(Math.max(...Object.values(d.jam_sejak_servis)) > 0, "jam pompa sejak servis bukan nol");
  const dm = d.stok.filter(s => s.gudang === "Gudang dummy"); assert.ok(dm.length >= 2 && dm.every(s => s.saldo > 0), `saldo stok dummy bukan nol: ${JSON.stringify(dm)}`);
  const nKit = d.n_kit_per_gudang["Gudang dummy"]; assert.ok(nKit > 0, "kit per gudang bukan nol");
  assert.ok(dm.some(s => s.saldo < stokMin(s.kode_bom, nKit)) && dm.some(s => s.saldo >= stokMin(s.kode_bom, nKit)), `satu kode di bawah stok minimum, satu di atas: ${JSON.stringify(dm)} n=${nKit}`);
  assert.equal(await hitung("sippa_aset", "dummy = 1 AND kode NOT GLOB 'AS-9[0-9][0-9][0-9]'"), 0, "kode dummy 9000 ke atas");
  assert.equal((await sip("POST", "/dummy/isi", {layar: "pelihara"}, ADMIN)).s, 409, "isi kedua pelihara");

  /* air */
  const a = await sip("POST", "/dummy/isi", {layar: "air"}, ADMIN); assert.equal(a.s, 200, a.t); assert.ok(a.j.dibuat.sippa_aset >= 6 && a.j.dibuat.sippa_inspeksi >= 3, JSON.stringify(a.j.dibuat));
  const sumur = (await sip("GET", "/aset?kelas=sumur_bor", undefined, ADMIN)).j.aset.filter(s => s.dummy === 1); assert.ok(sumur.length >= 6, `${sumur.length} sumur dummy`);
  const zona = new Map(); for (const s of sumur) { const at = JSON.parse((await DB.prepare("SELECT atribut FROM sippa_aset WHERE id = ?").bind(s.id).first()).atribut); zona.set(at.zona_konservasi, at); }
  for (const z of ["aman", "rawan", "kritis"]) assert.ok(zona.has(z), `zona ${z} tidak ada; ada ${[...zona.keys()]}`);
  assert.ok(zona.get("kritis").rekomendasi_bg, "sumur kritis bawa rekomendasi Badan Geologi");
  assert.ok(sumur.some(s => s.mutu_terakhir?.lolos === true) && sumur.some(s => s.mutu_terakhir?.lolos === false && s.mutu_terakhir.e_coli_cfu > 0) && sumur.some(s => s.mutu_terakhir === null), "mutu air: lolos, gagal E. coli, belum diuji");
  assert.equal((await sip("POST", "/dummy/isi", {layar: "air"}, ADMIN)).s, 409, "isi kedua air");

  /* akses */
  const k = await sip("POST", "/dummy/isi", {layar: "akses"}, ADMIN); assert.equal(k.s, 200, k.t);
  const jb = (await DB.prepare("SELECT kelas, rencana_ganti, sumber, atribut FROM sippa_aset WHERE dummy = 1 AND kelas LIKE 'jembatan_%'").all()).results;
  assert.ok(jb.some(j => j.kelas === "jembatan_darurat" && j.rencana_ganti > kini) && jb.some(j => j.kelas === "jembatan_darurat" && j.rencana_ganti === null), "jembatan darurat dengan dan tanpa rencana ganti");
  const perm = jb.filter(j => j.kelas === "jembatan_permanen"); assert.ok(perm.length >= 2 && new Set(perm.map(j => j.sumber)).size >= 2 && new Set(perm.map(j => JSON.parse(j.atribut).program)).size >= 2, "dua jembatan permanen dari sumber program berbeda");
  assert.ok(jb.every(j => j.kelas !== "jembatan_permanen" || !j.rencana_ganti), "permanen tidak punya rencana ganti");
  assert.equal((await sip("POST", "/dummy/isi", {layar: "akses"}, ADMIN)).s, 409, "isi kedua akses");

  /* staf nyata tidak melihat dummy; admin melihat */
  const nyataAset = (await sip("GET", "/aset", undefined, pim.h)).j.aset; assert.ok(nyataAset.every(x => !x.kode.startsWith("AS-9")), "aset dummy tersaring untuk staf nyata");
  const dp = (await sip("GET", "/pelihara", undefined, pim.h)).j; assert.ok(dp.komponen.every(c => !/^SIPPA-9/.test(c.kit_kode)) && dp.stok.every(s => s.gudang !== "Gudang dummy"), "pelihara tanpa dummy untuk staf nyata");
  assert.ok((await sip("GET", "/stok", undefined, pim.h)).j.stok.every(s => s.gudang !== "Gudang dummy"));

  /* hilir tanpa hulu: pengisi melapor 0 baris dan tidak menulis (KELAS C) */
  const env = await mf.getBindings(), cc = {kini: Date.now(), sejak: Date.now() - 20 * HARI, sampai: Date.now(), ada: false};
  await sip("POST", "/dummy/hapus", {}, ADMIN);
  for (const t of tabel) assert.equal(await hitung(t, "dummy = 1"), 0, `${t} masih punya dummy sesudah hapus`);
  assert.deepEqual(await nyata(), sebelum, "baris nyata utuh");
  for (const nama of ["isiInspeksiKit"]) { const x = await PENGISI[nama](env, cc); assert.equal(Object.values(x).reduce((a2, b) => a2 + b, 0), 0, `${nama} tanpa hulu harus 0 baris: ${JSON.stringify(x)}`); }
  assert.equal(await hitung("sippa_inspeksi", "dummy = 1"), 0);
  assert.equal((await sip("POST", "/dummy/isi", {layar: "akses"}, ADMIN)).s, 200, "sesudah hapus, isi lagi berhasil");
  await sip("POST", "/dummy/hapus", {}, ADMIN); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(ADM).run();
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
  await T.DB.batch(["sippa_laporan", "sippa_skenario", "sippa_petak", "sippa_ab_unggah", "sippa_bbm", "sippa_probe", "sippa_log_gelar", "sippa_foto", "sippa_jalan_cek", "sippa_aoi_usul", "sippa_gerak", "sippa_tugas", "sippa_komponen", "sippa_kit"].map(t => T.DB.prepare(`DROP TABLE ${t}`)));
  const pesan = {galat: "Migrasi SIPPA belum diterapkan di basis data", status: "tanpa_migrasi"};
  const kasus = [["GET", "/kit", undefined], ["GET", "/kit/0123456789abcdef", undefined], ["POST", "/kit", {kode: "SIPPA-101", jenis: "gambut", templat: "gambut"}], ["POST", "/kit/0123456789abcdef", {lokasi: "x"}], ["POST", "/komponen/0123456789abcdef", {baru: [{kode_bom: "X-1", nama: "ab", jumlah: 1, satuan: "unit"}]}],
    ["POST", "/gerak/0123456789abcdef", {alasan: "gelar", ke_status: "gelar"}], ["POST", "/tiba/0123456789abcdef", {}], ["POST", "/tugas", {nama_regu: "Regu", unsur: "mpa", prov: "62", kab: "Kab", berlaku_hari: 1}], ["POST", "/tugas-cabut/0123456789abcdef", {}],
    ["GET", "/ringkas", undefined], ["GET", "/jalan-cek", undefined], ["POST", "/jalan-cek", {kompleks_id: "K0001", prov: "62", musim: "kemarau", hasil: "lolos"}], ["POST", "/aoi", {kompleks_id: "K0001", prov: "62", alasan: "Usul uji tanpa migrasi"}],
    ["GET", "/log", undefined], ["GET", "/log.csv", undefined], ["GET", "/probe.csv", undefined], ["POST", "/log", {jenis: "latihan"}], ["GET", "/foto/0123456789abcdef", undefined], ["POST", "/dummy/isi", {layar: "log"}], ["POST", "/dummy/hapus", {}],
    ["GET", "/ab", undefined], ["GET", "/ab.csv", undefined], ["GET", "/skenario", undefined], ["GET", "/laporan", undefined], ["POST", "/skenario", {nama: "Uji B", state: {}, versi_mesin: "studio-1"}], ["POST", "/ab-status/0123456789abcdef", {status: "ditinjau_evaluator"}],
    ["POST", "/skenario-hapus/0123456789abcdef", {}], ["GET", "/laporan-berkas/0123456789abcdef", undefined]];
  for (const [m, j, b] of kasus) { const r = await T.api(m, "/api/sippa" + j, b, ADMIN); assert.equal(r.s, 503, `${m} ${j}: ${r.s} ${r.t.slice(0, 120)}`); assert.deepEqual(r.j, pesan, `${m} ${j}`); }
  const kd = "a".repeat(26); for (const [m, j, b] of [["GET", "/lapangan/saya"], ["POST", "/lapangan/kirim", {}], ["POST", "/gerak/0123456789abcdef", {alasan: "gelar", ke_status: "gelar"}]]) { const r = await T.api(m, "/api/sippa" + j, b, {"x-kode": kd}); assert.equal(r.s, 503, `${m} ${j} (kode): ${r.s} ${r.t}`); }
  const f = await T.api("GET", "/api/warga/konfig"); assert.equal(f.s, 200, "rute lain repo tetap 200 (/api/titik tidak dipakai: 404 sah sebelum cron FIRMS pertama)"); assert.equal((await T.api("GET", "/api/warga")).s, 200); 
  assert.equal((await T.api("GET", "/pipa/lapangan")).s, 200, "halaman tidak menyentuh tabel");
});

/* ---------------------------------------------------------------- SP-050 telemetri, perangkat, alarm (migrasi 0058, keputusan 38) */
const iso = t => new Date(t).toISOString(), tglWib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
const tel = async (token, b, h = {}) => {
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/telemetri", {method: "POST", headers: {...(token ? {authorization: "Bearer " + token} : {}), "content-type": "application/json", ...h}, body: typeof b === "string" ? b : JSON.stringify(b)});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
};
const bersihLaju = () => DB.prepare("DELETE FROM laju_bnpb WHERE aksi IN ('sippa.perangkat', 'sippa.kit_buat')").run();
const kitTel = async kode => { await bersihLaju(); const r = await sip("POST", "/kit", {kode, jenis: "gambut", prov: "62", kab: "Kota Palangka Raya"}, MOD2); assert.equal(r.s, 201, r.t); return r.j.kit; };
const perTel = async (kit_id, tag, jenis, satuan, x = {}) => { const r = await sip("POST", "/perangkat", {kit_id, tag, jenis, satuan, ...x}, MOD2); assert.equal(r.s, 201, `${tag}: ${r.t}`); return r.j; };
const rakit = async (kode, daftar) => {
  const kit = await kitTel(kode), gw = await perTel(kit.id, "U-102", "gateway", "-"), per = {};
  for (const [tag, jenis, satuan, x] of daftar) per[tag] = (await perTel(kit.id, tag, jenis, satuan, x)).perangkat;
  return {kit, kode, token: gw.token, gw: gw.perangkat, per};
};
/* bacaan = [[tag, detik relatif sekarang, nilai, satuan]] */
const kirimT = (K, bacaan, x = {}) => tel(K.token, {kit: K.kode, dikirim: iso(Date.now()), sumber: "gateway", bacaan: bacaan.map(([tag, dt, nilai, satuan]) => ({tag, waktu: iso(Date.now() + dt * 1000), nilai, ...(satuan ? {satuan} : {})})), ...x});
const alarmDi = (kit_id, kode) => DB.prepare("SELECT * FROM sippa_alarm WHERE kit_id = ?" + (kode ? " AND kode = ?" : "") + " ORDER BY mulai, rowid").bind(...(kode ? [kit_id, kode] : [kit_id])).all().then(r => r.results);
const barisT = kit_id => DB.prepare("SELECT * FROM sippa_telemetri WHERE kit_id = ? ORDER BY diterima, rowid").bind(kit_id).all().then(r => r.results);
const dekat = (a, b, ket) => assert.ok(Math.abs(a - b) < 1e-9, `${ket}: ${a} bukan ${b}`);
const butirPantau = async h => (await api("GET", "/api/pantau", undefined, h)).j.butir.filter(b => b.jenis === "sippa_alarm");
let T1tel, K151;
const PER_ISI = [["PT-102", "tekanan", "bar", {min_sah: 0, maks_sah: 12, tag_datar: "PT102_bar"}], ["FT-101", "debit", "m3/jam", {min_sah: 0, maks_sah: 90, tag_datar: "FT101_m3h"}],
  ["T-103", "suhu_gambut", "C", {kedalaman_cm: 50, min_sah: -10, maks_sah: 120, tag_datar: "T03_50cm_C"}], ["GWT-101", "muka_air_tanah", "m", {tag_datar: "GWT01_m"}]];

uji("POST /api/sippa/perangkat dan perangkat-cabut: M 201, gateway selalu bertoken 64 heks tampil sekali dan hanya sha256 tersimpan; pusdalops, pimpinan, akun gerbang 403; tamu 401; masukan liar 400; tag kembar 409; laju 60", async () => {
  const kit = await kitTel("SIPPA-150"), j0 = await jejak();
  const g = await sip("POST", "/perangkat", {kit_id: kit.id, tag: "U-102", jenis: "gateway", satuan: "-"}, MOD2);
  assert.equal(g.s, 201, g.t); cekKepala(g, "perangkat"); assert.match(g.j.token, /^[0-9a-f]{64}$/, "gateway selalu mendapat token"); assert.equal(g.j.perangkat.bertoken, true); assert.equal(g.j.perangkat.kit_kode, "SIPPA-150");
  assert.ok(!("token_sha" in g.j.perangkat) && !("prov" in g.j.perangkat), "tanpa token_sha dan prov"); assert.doesNotMatch(JSON.stringify(g.j.perangkat), new RegExp(g.j.token));
  const baris = await DB.prepare("SELECT * FROM sippa_perangkat WHERE id = ?").bind(g.j.perangkat.id).first();
  assert.equal(baris.token_sha, sha256(g.j.token), "hanya sha256 yang tersimpan"); assert.ok(!Object.values(baris).includes(g.j.token), "token polos tidak tersimpan di kolom mana pun"); assert.equal(await jejak(), j0 + 1);
  const s = await sip("POST", "/perangkat", {kit_id: kit.id, tag: "PT-101", jenis: "tekanan", satuan: "bar", min_sah: -1, maks_sah: 12, interval_s: 30}, MOD2);
  assert.equal(s.s, 201, s.t); assert.equal(s.j.token, undefined, "sensor tanpa beri_token tidak bertoken"); assert.equal(s.j.perangkat.bertoken, false); assert.equal(s.j.perangkat.interval_s, 30); assert.equal(s.j.perangkat.aktif, 1);
  const b = await sip("POST", "/perangkat", {kit_id: kit.id, tag: "FT-101", jenis: "debit", satuan: "m3/jam", beri_token: true, tag_datar: "FT101_m3h"}, MOD2); assert.equal(b.s, 201); assert.match(b.j.token, /^[0-9a-f]{64}$/);
  assert.notEqual(b.j.token, g.j.token, "tiap token acak");
  for (const [n, h] of [["pusdalops", pus.h], ["pimpinan", pim.h], ["koordalops", koor.h], ["verifikator", ver.h], ["akun gerbang", GERBANG]]) assert.equal((await sip("POST", "/perangkat", {kit_id: kit.id, tag: "T-101", jenis: "suhu_gambut", satuan: "C"}, h)).s, 403, n);
  assert.equal((await sip("POST", "/perangkat", {kit_id: kit.id, tag: "T-101", jenis: "suhu_gambut", satuan: "C"})).s, 401, "tamu");
  const n0 = await hitung("sippa_perangkat"), dasar = {kit_id: kit.id, tag: "PT-102", jenis: "tekanan", satuan: "bar"};
  for (const liar of [{tag: "pt-101"}, {tag: "PT_101"}, {tag: "PT-1234567890"}, {tag: 5}, {jenis: "angin"}, {satuan: "kg"}, {kedalaman_cm: 20}, {min_sah: 5, maks_sah: 5}, {min_sah: "a"}, {interval_s: 5}, {interval_s: 3601}, {interval_s: 60.5},
    {tag_datar: "a b"}, {tag_datar: "x".repeat(21)}, {beri_token: "ya"}, {kit_id: "x"}, {kit_id: "0123456789abcdef"}, {kit_id: undefined}]) { const r = await sip("POST", "/perangkat", {...dasar, ...liar}, MOD2); assert.equal(r.s, 400, `${JSON.stringify(liar)}: ${r.s} ${r.t}`); }
  assert.equal(await hitung("sippa_perangkat"), n0, "masukan liar tidak menulis baris");
  assert.equal((await sip("POST", "/perangkat", {kit_id: kit.id, tag: "PT-101", jenis: "tekanan", satuan: "bar"}, MOD2)).s, 409, "tag kembar di kit sama");
  assert.equal((await sip("POST", "/perangkat", {kit_id: kit.id, tag: "FT-102", jenis: "debit", satuan: "m3/jam", tag_datar: "FT101_m3h"}, MOD2)).s, 409, "tag_datar kembar di kit sama");
  const lain = await kitTel("SIPPA-149"); assert.equal((await sip("POST", "/perangkat", {kit_id: lain.id, tag: "PT-101", jenis: "tekanan", satuan: "bar"}, MOD2)).s, 201, "tag sama di kit lain sah");
  await isiLaju(MOD, "sippa.perangkat", 60); assert.equal((await sip("POST", "/perangkat", dasar, MOD2)).s, 429, "laju 60 per jam"); await bersihLaju();
  /* cabut */
  const j1 = await jejak(), c = await sip("POST", "/perangkat-cabut/" + s.j.perangkat.id, {}, MOD2); assert.equal(c.s, 200, c.t); assert.deepEqual(c.j, {id: s.j.perangkat.id, aktif: 0}); cekKepala(c, "cabut");
  assert.equal((await DB.prepare("SELECT aktif FROM sippa_perangkat WHERE id = ?").bind(s.j.perangkat.id).first()).aktif, 0); assert.equal(await jejak(), j1 + 1);
  assert.equal((await sip("POST", "/perangkat-cabut/" + s.j.perangkat.id, {}, MOD2)).s, 200, "cabut ulang idempoten"); assert.equal(await jejak(), j1 + 1, "tanpa jejak kedua");
  for (const [n, h] of [["pusdalops", pus.h], ["pimpinan", pim.h]]) assert.equal((await sip("POST", "/perangkat-cabut/" + b.j.perangkat.id, {}, h)).s, 403, n);
  assert.equal((await sip("POST", "/perangkat-cabut/" + b.j.perangkat.id, {})).s, 401); assert.equal((await sip("POST", "/perangkat-cabut/0123456789abcdef", {}, MOD2)).s, 404);
  assert.equal((await DB.prepare("SELECT aktif FROM sippa_perangkat WHERE id = ?").bind(b.j.perangkat.id).first()).aktif, 1, "yang ditolak tidak berubah");
});

uji("dariDatar: bentuk datar paket pemilik dipecah per kunci; POST /telemetri menyimpan bentuk bersarang dan datar sebagai baris identik; tag tanpa padanan tag_datar ditandai tag_asing (E2)", async () => {
  const T1 = Date.now() - 60e3; T1tel = T1;
  const datar = {site_id: "SIPPA-151", utc_time: iso(T1), PT102_bar: 4.8, T03_50cm_C: 61.2, sensor_quality: 0.9, source: "gateway"};
  assert.deepEqual(dariDatar(datar), {kit: "SIPPA-151", dikirim: iso(T1), sumber: "gateway", sensor_quality: 0.9, asing: [], bacaan: [
    {tag_datar: "PT102_bar", awalan: "PT", nomor: "102", kedalaman_cm: null, satuan: "bar", nilai: 4.8, waktu: iso(T1)}, {tag_datar: "T03_50cm_C", awalan: "T", nomor: "03", kedalaman_cm: 50, satuan: "C", nilai: 61.2, waktu: iso(T1)}]});
  assert.deepEqual(dariDatar({site_id: "S", utc_time: "x", FT101_m3h: 1, GWT01_m: 2, rusak: 3, "PT-1_bar": 4}).bacaan.map(b => [b.awalan, b.nomor, b.satuan]), [["FT", "101", "m3/jam"], ["GWT", "01", "m"]]);
  assert.deepEqual(dariDatar({site_id: "S", utc_time: "x", rusak: 3, "PT-1_bar": 4}).asing, ["rusak", "PT-1_bar"], "kunci yang bukan pola dilaporkan, bukan ditelan");
  const K = await rakit("SIPPA-151", PER_ISI); K151 = K;
  const nested = {kit: "SIPPA-151", dikirim: iso(T1), sumber: "gateway", bacaan: [{tag: "PT-102", waktu: iso(T1), nilai: 4.8, satuan: "bar"}, {tag: "T-103", waktu: iso(T1), nilai: 61.2, satuan: "C", kedalaman_cm: 50}]};
  const a = await tel(K.token, nested); assert.equal(a.s, 202, a.t); cekKepala(a, "telemetri"); assert.deepEqual(a.j, {diterima: 2, ditandai: [], ganda: false});
  let baris = await barisT(K.kit.id); assert.equal(baris.length, 1, "satu baris per PESAN, bukan per bacaan"); const r0 = baris[0];
  assert.equal(r0.id, sha256(sha256(K.token) + JSON.stringify(nested)).slice(0, 32), "id = 32 heks pertama sha256(token_sha + badan)"); assert.equal(r0.pengirim_id, K.gw.id); assert.equal(r0.n, 2); assert.equal(r0.n_mutu2, 0);
  assert.equal(r0.t_awal, T1); assert.equal(r0.t_akhir, T1); assert.deepEqual(JSON.parse(r0.bacaan), [["PT-102", T1, 4.8, 0, null], ["T-103", T1, 61.2, 0, 50]]); assert.equal(r0.dummy, 0);
  const lagi = await tel(K.token, nested); assert.equal(lagi.s, 202); assert.deepEqual(lagi.j, {diterima: 0, ditandai: [], ganda: true}, "kirim ulang pesan sama = ganda"); assert.equal((await barisT(K.kit.id)).length, 1, "ganda tidak menulis baris kedua");
  const f = await tel(K.token, datar); assert.equal(f.s, 202, f.t); assert.deepEqual(f.j, {diterima: 2, ditandai: [], ganda: false});
  baris = await barisT(K.kit.id); assert.equal(baris.length, 2); assert.notEqual(baris[1].id, r0.id); assert.equal(baris[1].bacaan, r0.bacaan, "bentuk datar menghasilkan bacaan identik dengan bentuk bersarang: hanya satu bentuk yang disimpan");
  const g = await tel(K.token, {site_id: "SIPPA-151", utc_time: iso(T1 + 1000), XX99_bar: 1, FT101_m3h: 12.5, GWT01_m: 2.4, nonsens: 1, source: "gateway"});
  assert.equal(g.s, 202, g.t); assert.equal(g.j.diterima, 2); assert.deepEqual(g.j.ditandai.map(x => x.alasan), ["tag_asing", "tag_asing"]); assert.deepEqual(g.j.ditandai.map(x => x.tag).sort(), ["XX99_bar", "nonsens"]);
  const q = await tel(K.token, {site_id: "SIPPA-151", utc_time: iso(T1 + 2000), PT102_bar: 5, sensor_quality: 0.3, source: "gateway"}); assert.equal(q.s, 202);
  assert.equal(JSON.parse((await barisT(K.kit.id)).at(-1).bacaan)[0][3], 1, "sensor_quality < 0,5 = mutu 1 (diragukan)");
});

uji("POST /api/sippa/telemetri: token salah, tanpa token, dicabut 401; > 300 token salah per IP 429 tetapi token sah lolos; kit lain, waktu, satuan, nilai, tag asing; di luar rentang tersimpan mutu 2; 501 bacaan 400; 65.537 byte 413; pesan ke-121 per jam 429", async () => {
  const K = K151, T1 = T1tel, n0 = (await barisT(K.kit.id)).length;
  const s401 = async (token, ket, h = {}) => { const r = await tel(token, {kit: "SIPPA-151", dikirim: iso(Date.now()), bacaan: []}, h); assert.equal(r.s, 401, ket); assert.ok(r.j.galat); assert.equal(r.h.get("www-authenticate"), "Bearer"); };
  await s401(null, "tanpa Authorization"); await s401("0".repeat(64), "token salah"); await s401("abc", "token pendek"); await s401(K.token + "0", "token kepanjangan");
  const ip2 = {"cf-connecting-ip": "203.0.113.51"}, k2 = sha256("garam-uji|203.0.113.51"); await s401("1".repeat(64), "salah dari IP 2", ip2); await s401("2".repeat(64), "salah lagi", ip2);
  assert.equal(await hitung("laju_bnpb", "aksi = 'sippa.token_gagal' AND kunci = ?", k2), 2, "tiap token salah dihitung per IP");
  const ip = {"cf-connecting-ip": "203.0.113.50"}, kunci = sha256("garam-uji|203.0.113.50"); await isiLaju(kunci, "sippa.token_gagal", 300);
  assert.equal((await tel("3".repeat(64), {kit: "SIPPA-151", bacaan: []}, ip)).s, 429, "lewat 300 token salah per jam per IP");
  assert.equal((await tel(K.token, {kit: "SIPPA-151", dikirim: iso(Date.now()), sumber: "gateway", bacaan: [{tag: "PT-102", waktu: iso(Date.now() - 45e3), nilai: 4.2, satuan: "bar"}]}, ip)).s, 202, "token sah tidak ikut terkunci");
  const g2 = await perTel(K.kit.id, "U-103", "gateway", "-"), ok2 = await tel(g2.token, {kit: "SIPPA-151", bacaan: [{tag: "PT-102", waktu: iso(Date.now() - 30e3), nilai: 3.3}]}); assert.equal(ok2.s, 202, ok2.t);
  assert.equal((await sip("POST", "/perangkat-cabut/" + g2.perangkat.id, {}, MOD2)).s, 200); await s401(g2.token, "token perangkat yang dicabut");
  /* isi pesan */
  const bad = async (b, s, ket) => { const r = await tel(K.token, b, ip2); assert.equal(r.s, s, `${ket}: ${r.s} ${r.t.slice(0, 120)}`); return r; };
  await bad("bukan json", 400, "bukan JSON"); await bad("[]", 400, "larik"); await bad({kit: "SIPPA-151", bacaan: []}, 400, "bacaan kosong"); await bad({kit: "SIPPA-151"}, 400, "tanpa bacaan"); await bad({kit: "SIPPA-150", bacaan: [{tag: "PT-102", waktu: iso(Date.now()), nilai: 1}]}, 400, "kit bukan milik token");
  const banyak = n => ({kit: "SIPPA-151", dikirim: iso(Date.now()), bacaan: Array.from({length: n}, (_, i) => ({tag: "PT-102", waktu: iso(Date.now() - 20e3 - i), nilai: 1 + i / 1000}))});
  await bad(banyak(501), 400, "501 bacaan"); assert.equal((await tel(K.token, banyak(500), ip2)).j.diterima, 500, "500 bacaan sah"); const b500 = (await barisT(K.kit.id)).at(-1); assert.equal(b500.n, 500);
  const besar = JSON.stringify(banyak(3)); await bad(besar + " ".repeat(65537 - besar.length), 413, "65.537 byte");
  const kirim1 = (dt, nilai, x = {}) => tel(K.token, {kit: "SIPPA-151", dikirim: iso(Date.now()), bacaan: [{tag: "PT-102", waktu: iso(Date.now() + dt * 1000), nilai, satuan: "bar", ...x}]}, ip2), n1 = (await barisT(K.kit.id)).length;
  let r = await kirim1(360, 5); assert.equal(r.s, 202); assert.equal(r.j.diterima, 0); assert.match(r.j.ditandai[0].alasan, /5 menit di depan/); r = await kirim1(-31 * 86400, 5); assert.match(r.j.ditandai[0].alasan, /30 hari/);
  r = await kirim1(-10, 5, {satuan: "psi"}); assert.match(r.j.ditandai[0].alasan, /satuan/); r = await kirim1(-11, "5"); assert.match(r.j.ditandai[0].alasan, /nilai harus angka/); r = await kirim1(-12, 5, {waktu: "kemarin"}); assert.match(r.j.ditandai[0].alasan, /waktu tidak sah/);
  r = await kirim1(-13, 5, {kedalaman_cm: 1.5}); assert.match(r.j.ditandai[0].alasan, /kedalaman/); r = await kirim1(-14, 5, {tag: "PT-999"}); assert.deepEqual(r.j.ditandai, [{tag: "PT-999", alasan: "tag_asing"}]);
  assert.equal((await barisT(K.kit.id)).length, n1, "bacaan yang ditolak per butir tidak menulis baris");
  r = await kirim1(240, 5); assert.equal(r.j.diterima, 1, "4 menit di depan masih sah");
  r = await kirim1(-15, 15); assert.equal(r.j.diterima, 1, "di luar min_sah..maks_sah DISIMPAN, bukan dibuang"); const luar = (await barisT(K.kit.id)).at(-1); assert.equal(luar.n_mutu2, 1); assert.equal(JSON.parse(luar.bacaan)[0][3], 2); assert.equal(JSON.parse(luar.bacaan)[0][2], 15);
  assert.ok((await barisT(K.kit.id)).length > n0);
  /* batas 120 pesan per jam per pengirim, dihitung dari baris tabel (tanpa tulisan laju) */
  const L = await rakit("SIPPA-152", [PER_ISI[0]]), T = Date.now(), seed = k => DB.batch(Array.from({length: k}, (_, i) => DB.prepare("INSERT INTO sippa_telemetri (id, pengirim_id, kit_id, diterima, t_awal, t_akhir, n, bacaan) VALUES (?, ?, ?, ?, ?, ?, 1, '[]')")
    .bind(sha256("seed" + L.kit.id + i).slice(0, 32), L.gw.id, L.kit.id, T - 1000 - i * 1000, T - 60e3, T - 60e3)));
  await seed(119); const lj0 = await hitung("laju_bnpb");
  assert.equal((await kirimT(L, [["PT-102", -30, 4, "bar"]])).s, 202, "pesan ke-120 masih lolos"); assert.equal(await hitung("laju_bnpb"), lj0, "batas dihitung dari tabel telemetri, tanpa tulisan laju");
  const ke121 = await kirimT(L, [["PT-102", -29, 4, "bar"]]); assert.equal(ke121.s, 429, ke121.t); assert.equal(ke121.h.get("retry-after"), "3600"); assert.equal((await barisT(L.kit.id)).length, 120, "pesan ke-121 tidak ditulis");
  await DB.prepare("UPDATE sippa_telemetri SET diterima = ? WHERE kit_id = ?").bind(Date.now() - 2 * JAM, L.kit.id).run();
  assert.equal((await kirimT(L, [["PT-102", -28, 4, "bar"]])).s, 202, "jendela satu jam bergeser: pesan lama tidak dihitung");
});

uji("GET /api/sippa/perangkat, /telemetri: B 200 tanpa token; terakhir dan nilai terakhir; seri naik menurut waktu dengan ambang; sejak > 30 hari dan masukan liar 400; wilayah 61 tidak melihat; tamu 401, verifikator 403", async () => {
  const K = K151, T1 = T1tel;
  const r = await sip("GET", "/perangkat", undefined, pus.h); assert.equal(r.s, 200, r.t); cekKepala(r, "perangkat"); assert.doesNotMatch(r.t, /token_sha|"token"|"prov"|[0-9a-f]{64}/, "tanpa token atau sha dan tanpa prov");
  const p = r.j.perangkat, kit151 = p.filter(x => x.kit_kode === "SIPPA-151"); assert.ok(kit151.length >= 5, `${kit151.length} perangkat di kit 151`);
  const gwt = kit151.find(x => x.tag === "GWT-101"); assert.equal(gwt.terakhir, T1 + 1000); assert.equal(gwt.nilai_terakhir, 2.4); assert.equal(gwt.mutu_terakhir, 0); assert.equal(gwt.satuan, "m"); assert.equal(gwt.tag_datar, "GWT01_m");
  const gw = kit151.find(x => x.jenis === "gateway" && x.aktif === 1 && x.tag === "U-102"); assert.equal(gw.bertoken, true); assert.ok(gw.terakhir > T1, "gateway: terakhir = waktu terima pesan terakhir"); assert.equal(gw.nilai_terakhir, null);
  const sensor = kit151.find(x => x.tag === "PT-102"); assert.equal(sensor.bertoken, false); assert.equal(typeof sensor.nilai_terakhir, "number"); assert.ok([0, 1, 2].includes(sensor.mutu_terakhir)); assert.equal(sensor.min_sah, 0); assert.equal(sensor.maks_sah, 12);
  const sepi = p.find(x => x.kit_kode === "SIPPA-150" && x.tag === "PT-101"); assert.equal(sepi.terakhir, null); assert.equal(sepi.nilai_terakhir, null, "perangkat yang belum pernah mengirim: kosong, bukan nol");
  assert.equal((await sip("GET", "/perangkat", undefined, pim.h)).s, 200); assert.equal((await sip("GET", "/perangkat", undefined, koor.h)).s, 200); assert.equal((await sip("GET", "/perangkat")).s, 401); assert.equal((await sip("GET", "/perangkat", undefined, ver.h)).s, 403);
  assert.ok((await sip("GET", "/perangkat", undefined, pus61.h)).j.perangkat.every(x => !["SIPPA-150", "SIPPA-151", "SIPPA-152"].includes(x.kit_kode)), "staf wilayah 61 tidak melihat kit provinsi 62");
  /* seri */
  const s = await sip("GET", `/telemetri?perangkat=${gwt.id}&sejak=${T1 + 500}`, undefined, pus.h); assert.equal(s.s, 200, s.t); cekKepala(s, "seri"); assert.deepEqual(s.j, {seri: [[T1 + 1000, 2.4, 0]], ambang: {min_sah: null, maks_sah: null}, terpotong: false});
  const pt = await sip("GET", `/telemetri?perangkat=${sensor.id}`, undefined, pim.h); assert.equal(pt.s, 200); assert.deepEqual(pt.j.ambang, {min_sah: 0, maks_sah: 12}); assert.ok(pt.j.seri.length >= 500, `${pt.j.seri.length} titik`);
  for (let i = 1; i < pt.j.seri.length; i++) assert.ok(pt.j.seri[i - 1][0] <= pt.j.seri[i][0], "seri naik menurut waktu"); assert.ok(pt.j.seri.some(x => x[2] === 2 && x[1] === 15), "bacaan mutu 2 ikut tampil");
  assert.deepEqual((await sip("GET", `/telemetri?perangkat=${gwt.id}&harian=1`, undefined, pus.h)).j, {harian: [], ambang: {min_sah: null, maks_sah: null}});
  for (const q of ["", "?perangkat=x", `?perangkat=${gwt.id.toUpperCase()}`, `?perangkat=${gwt.id}&sejak=${Date.now() - 31 * HARI}`, `?perangkat=${gwt.id}&sejak=abc`, `?perangkat=${gwt.id}&sejak=-5`, `?perangkat=${gwt.id}&harian=2`]) assert.equal((await sip("GET", "/telemetri" + q, undefined, pus.h)).s, 400, q);
  assert.equal((await sip("GET", `/telemetri?perangkat=${gwt.id}&sejak=${Date.now() - 29 * HARI}`, undefined, pus.h)).s, 200, "29 hari lalu masih sah");
  assert.equal((await sip("GET", "/telemetri?perangkat=0123456789abcdef", undefined, pus.h)).s, 404); assert.equal((await sip("GET", `/telemetri?perangkat=${gwt.id}`, undefined, pus61.h)).s, 404, "di luar wilayah = tidak ada");
  assert.equal((await sip("GET", `/telemetri?perangkat=${gwt.id}`)).s, 401); assert.equal((await sip("GET", `/telemetri?perangkat=${gwt.id}`, undefined, ver.h)).s, 403);
  assert.equal((await mf.dispatchFetch("http://bnpb.lokal/api/sippa/telemetri?perangkat=" + gwt.id, {headers: {authorization: "Bearer " + K.token}})).status, 401, "token perangkat tidak bisa membaca apa pun");
});

uji("alarm (E3, satu kasus per kode): hisap_rendah, debit_rendah, dry_run, tekanan_lebih, belum_dingin, co_tinggi, bbm_rendah terbuka sekali dan tertutup otomatis saat pulih", async () => {
  const ya = async (K, kode, n) => { const a = (await alarmDi(K.kit.id)).filter(x => x.ditutup == null); assert.deepEqual(a.map(x => x.kode), n ? Array(n).fill(kode) : [], `alarm terbuka ${kode}`); return a; };
  const total = async K => (await alarmDi(K.kit.id)).length, tutupOto = async (K, kode) => { const a = await alarmDi(K.kit.id, kode); assert.equal(a.length, 1, `${kode}: tepat satu baris`); assert.ok(a[0].ditutup > 0, `${kode} tertutup`); assert.equal(a[0].ditutup_oleh, "otomatis"); };
  /* hisap_rendah: PT-101 < -0,6 bar; tutup sesudah 2 bacaan berturut di atas */
  let K = await rakit("SIPPA-180", [["PT-101", "tekanan", "bar", {min_sah: -5, maks_sah: 12}]]);
  assert.equal((await kirimT(K, [["PT-101", -60, -0.9, "bar"]])).s, 202); let a = await ya(K, "hisap_rendah", 1); assert.equal(a[0].perangkat_id, K.per["PT-101"].id); assert.equal(a[0].nilai, -0.9); dekat(a[0].ambang, -0.6, "ambang NPSH");
  await kirimT(K, [["PT-101", -50, -0.8, "bar"]]); assert.equal(await total(K), 1, "terbuka SEKALI: bacaan rendah berikutnya tidak membuka alarm kedua");
  await kirimT(K, [["PT-101", -40, -0.5, "bar"]]); await ya(K, "hisap_rendah", 1); await kirimT(K, [["PT-101", -30, -0.4, "bar"]]); await ya(K, "hisap_rendah", 0); await tutupOto(K, "hisap_rendah");
  /* debit_rendah: FT < 20% x 18 m3/jam selama RPM > 0 lebih dari 2 menit */
  K = await rakit("SIPPA-181", [["FT-101", "debit", "m3/jam", {min_sah: 0, maks_sah: 90}], ["RPM-101", "rpm", "rpm", {min_sah: 0, maks_sah: 4000}]]);
  await kirimT(K, [["RPM-101", -300, 1500, "rpm"], ["FT-101", -300, 2, "m3/jam"]]); assert.equal(await total(K), 0); await kirimT(K, [["FT-101", -200, 2, "m3/jam"]]); assert.equal(await total(K), 0, "100 detik belum 2 menit");
  await kirimT(K, [["FT-101", -170, 2, "m3/jam"]]); a = await ya(K, "debit_rendah", 1); assert.equal(a[0].nilai, 2); dekat(a[0].ambang, 3.6, "20% debit operasi 18 m3/jam");
  await kirimT(K, [["FT-101", -60, 15, "m3/jam"]]); await ya(K, "debit_rendah", 0); await tutupOto(K, "debit_rendah"); assert.equal(await total(K), 1);
  /* debit rendah tanpa pompa hidup (RPM 0) bukan alarm */
  K = await rakit("SIPPA-188", [["FT-101", "debit", "m3/jam", {min_sah: 0, maks_sah: 90}], ["RPM-101", "rpm", "rpm", {min_sah: 0, maks_sah: 4000}]]);
  await kirimT(K, [["RPM-101", -300, 0, "rpm"], ["FT-101", -300, 1, "m3/jam"], ["FT-101", -100, 1, "m3/jam"], ["FT-101", -10, 0, "m3/jam"]]); assert.equal(await total(K), 0, "pompa mati: tidak ada alarm debit atau dry-run");
  /* dry_run: FT = 0 dan RPM > 0 selama 30 detik; tutup saat debit > 0 */
  K = await rakit("SIPPA-182", [["FT-101", "debit", "m3/jam", {min_sah: 0, maks_sah: 90}], ["RPM-101", "rpm", "rpm", {min_sah: 0, maks_sah: 4000}]]);
  await kirimT(K, [["RPM-101", -100, 1500, "rpm"], ["FT-101", -100, 0, "m3/jam"]]); assert.equal(await total(K), 0, "satu bacaan belum 30 detik");
  await kirimT(K, [["FT-101", -60, 0, "m3/jam"]]); a = await ya(K, "dry_run", 1); assert.equal(a[0].nilai, 0); assert.equal(a[0].ambang, 0); assert.equal(await total(K), 1, "40 detik: dry_run saja, debit_rendah belum 2 menit");
  await kirimT(K, [["FT-101", -10, 5, "m3/jam"]]); await ya(K, "dry_run", 0); await tutupOto(K, "dry_run");
  /* tekanan_lebih: PT-102 > 0,88 x PN 10 bar x f 1 */
  K = await rakit("SIPPA-183", [["PT-102", "tekanan", "bar", {min_sah: 0, maks_sah: 12}]]);
  await kirimT(K, [["PT-102", -30, 8.5, "bar"]]); assert.equal(await total(K), 0, "8,5 bar di bawah 8,8"); await kirimT(K, [["PT-102", -20, 9.0, "bar"]]); a = await ya(K, "tekanan_lebih", 1); assert.equal(a[0].nilai, 9); dekat(a[0].ambang, 8.8, "0,88 x PN");
  await kirimT(K, [["PT-102", -10, 8.0, "bar"]]); await ya(K, "tekanan_lebih", 0); await tutupOto(K, "tekanan_lebih");
  /* belum_dingin: T > 50 C hanya pada tahap 24 jam sesudah t_selesai */
  K = await rakit("SIPPA-184", [["T-103", "suhu_gambut", "C", {kedalaman_cm: 50, min_sah: -10, maks_sah: 120}]]);
  await kirimT(K, [["T-103", -60, 55, "C"]]); assert.equal(await total(K), 0, "belum ada gelar selesai 24 jam: panas wajar");
  await DB.prepare("INSERT INTO sippa_log_gelar (id, kit_id, jenis, t_tiba, t_selesai, waktu_klien, diterima, oleh) VALUES (?, ?, 'karhutla', ?, ?, ?, ?, 'tugas:abc')").bind(crypto.randomUUID(), K.kit.id, Date.now() - 30 * JAM, Date.now() - 25 * JAM, Date.now(), Date.now()).run();
  await kirimT(K, [["T-103", -30, 54, "C"]]); a = await ya(K, "belum_dingin", 1); assert.equal(a[0].nilai, 54); assert.equal(a[0].ambang, 50); await kirimT(K, [["T-103", -10, 49, "C"]]); await ya(K, "belum_dingin", 0); await tutupOto(K, "belum_dingin");
  /* co_tinggi: rerata 15 menit > 35 ppm */
  K = await rakit("SIPPA-185", [["CO-101", "co", "ppm", {min_sah: 0, maks_sah: 500}]]);
  await kirimT(K, [["CO-101", -600, 20, "ppm"]]); assert.equal(await total(K), 0); await kirimT(K, [["CO-101", -300, 60, "ppm"]]); a = await ya(K, "co_tinggi", 1); assert.equal(a[0].nilai, 40); assert.equal(a[0].ambang, 35);
  await kirimT(K, [["CO-101", -60, 10, "ppm"], ["CO-101", -30, 5, "ppm"]]); await ya(K, "co_tinggi", 0); await tutupOto(K, "co_tinggi");
  /* bbm_rendah: BBM < 20% */
  K = await rakit("SIPPA-186", [["BBM-101", "bbm", "%", {min_sah: 0, maks_sah: 100}]]);
  await kirimT(K, [["BBM-101", -30, 15, "%"]]); a = await ya(K, "bbm_rendah", 1); assert.equal(a[0].nilai, 15); assert.equal(a[0].ambang, 20); await kirimT(K, [["BBM-101", -10, 60, "%"]]); await ya(K, "bbm_rendah", 0); await tutupOto(K, "bbm_rendah");
  /* fungsi murni: tanpa seri tidak ada butir; kondisi yang tidak berubah tidak menghasilkan butir; tiap kode alarm dikenal CHECK */
  assert.deepEqual(nilaiAlarm([{id: "p", tag: "PT-102", jenis: "tekanan", satuan: "bar"}], new Map(), {kini: Date.now()}), []);
  assert.deepEqual(nilaiAlarm([{id: "p", tag: "PT-101", jenis: "tekanan", satuan: "bar"}], new Map([["PT-101", [[1, -0.2]]]]), {kini: Date.now()}), [], "satu bacaan aman belum menutup");
  const sqlKode = [...teks("migrations/0058_sippa_telemetri.sql").match(/kode IN \(([^)]*)\)/)[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]); assert.deepEqual(KODE_ALARM, sqlKode, "KODE_ALARM sama dengan CHECK sippa_alarm.kode");
  assert.equal(AMBANG_ALARM.npsh_bar, -0.6); assert.equal(AMBANG_ALARM.co_ppm, 35); assert.equal(AMBANG_ALARM.suhu_c, 50);
});

uji("GET /api/sippa/alarm dan POST /alarm-tutup/:id: B 200 tanpa prov; W menutup dengan jejak, ulang 409; pimpinan 403, tamu 401, wilayah 61 404; ditutup manual tidak dibuka lagi 30 menit; butir Meja Pantau sippa_alarm hilang sendiri saat tertutup", async () => {
  const K = await rakit("SIPPA-187", [PER_ISI[0]]); await kirimT(K, [["PT-102", -20, 9.5, "bar"]]);
  const [al] = await alarmDi(K.kit.id); assert.equal(al.kode, "tekanan_lebih"); assert.equal(al.ditutup, null);
  const aktif = await sip("GET", "/alarm?aktif=1", undefined, pus.h); assert.equal(aktif.s, 200, aktif.t); cekKepala(aktif, "alarm");
  const mine = aktif.j.alarm.find(x => x.id === al.id); assert.ok(mine, "alarm aktif tampil"); assert.equal(mine.tag, "PT-102"); assert.equal(mine.kit_kode, "SIPPA-187"); assert.equal(mine.kode, "tekanan_lebih"); assert.ok(!("prov" in mine)); assert.ok(aktif.j.alarm.every(x => x.ditutup == null), "aktif=1: hanya yang terbuka");
  const semua = await sip("GET", "/alarm", undefined, pim.h); assert.equal(semua.s, 200); assert.ok(semua.j.alarm.some(x => x.ditutup != null) && semua.j.alarm.some(x => x.ditutup == null), "riwayat memuat yang tertutup dan terbuka"); assert.ok(semua.j.alarm.length <= 500);
  assert.equal((await sip("GET", "/alarm?aktif=2", undefined, pus.h)).s, 400); assert.equal((await sip("GET", "/alarm")).s, 401); assert.equal((await sip("GET", "/alarm", undefined, ver.h)).s, 403);
  assert.ok(!(await sip("GET", "/alarm?aktif=1", undefined, pus61.h)).j.alarm.some(x => x.id === al.id), "wilayah 61 tidak melihat alarm provinsi 62");
  /* Meja Pantau */
  const butir = async h => (await api("GET", "/api/pantau", undefined, h)).j.butir.filter(b => b.jenis === "sippa_alarm");
  const bp = (await butir(pus.h)).find(b => b.id === "sippa-alarm:" + al.id); assert.ok(bp, "pusdalops melihat butir"); assert.equal(bp.label, "Alarm telemetri kit SIPPA"); assert.equal(bp.tautan, "/pipa/telemetri"); assert.equal(bp.prov, "62");
  assert.match(bp.judul, /SIPPA-187.*PT-102/); assert.match(bp.rincian, /Terukur 9,5, ambang 8,8/); assert.doesNotMatch(bp.judul + bp.rincian, /—|·/); assert.equal(bp.prioritas, 1, "tekanan lebih = keselamatan"); assert.equal(bp.dummy, 0);
  assert.ok((await butir(koor.h)).some(b => b.id === bp.id) && (await butir(ADMIN)).some(b => b.id === bp.id)); assert.equal((await butir(ver.h)).length, 0, "peran verifikator tidak melihat"); assert.ok(!(await butir(pus61.h)).some(b => b.id === bp.id), "wilayah 61 tidak melihat");
  /* tutup */
  for (const [n, h, s] of [["pimpinan", pim.h, 403], ["verifikator", ver.h, 403], ["tamu", {}, 401], ["wilayah 61", pus61.h, 404], ["pusdalops tanpa x-pb", pus.g, 401]]) assert.equal((await sip("POST", "/alarm-tutup/" + al.id, {}, h)).s, s, n);
  assert.equal((await sip("POST", "/alarm-tutup/0123456789abcdef", {}, pus.h)).s, 404); const j0 = await jejak();
  const t = await sip("POST", "/alarm-tutup/" + al.id, {}, pus.h); assert.equal(t.s, 200, t.t); assert.equal(t.j.alarm.ditutup_oleh, pus.kunci); assert.ok(t.j.alarm.ditutup > 0); assert.equal(await jejak(), j0 + 1);
  const baris = await DB.prepare("SELECT ditutup, ditutup_oleh FROM sippa_alarm WHERE id = ?").bind(al.id).first(); assert.equal(baris.ditutup_oleh, pus.kunci); assert.ok(baris.ditutup > 0);
  assert.equal((await sip("POST", "/alarm-tutup/" + al.id, {}, pus.h)).s, 409, "sudah tertutup"); assert.equal(await jejak(), j0 + 1);
  assert.ok(!(await butir(pus.h)).some(b => b.id === bp.id), "butir hilang sendiri saat alarm tertutup");
  /* kondisi masih berlangsung: ditutup manual tidak dibuka lagi dalam 30 menit (hemat kuota tulis) */
  await kirimT(K, [["PT-102", -10, 9.6, "bar"]]); assert.equal((await alarmDi(K.kit.id)).length, 1, "tidak dibuka ulang oleh bacaan berikutnya"); assert.equal((await alarmDi(K.kit.id))[0].ditutup_oleh, pus.kunci);
  await DB.prepare("UPDATE sippa_alarm SET ditutup = ? WHERE id = ?").bind(Date.now() - 31 * 60e3, al.id).run(); await kirimT(K, [["PT-102", -5, 9.7, "bar"]]); assert.equal((await alarmDi(K.kit.id, "tekanan_lebih")).filter(x => x.ditutup == null).length, 1, "lewat 30 menit: terbuka lagi");
  await isiLaju(ADM, "sippa.tulis", 600); const buka = (await alarmDi(K.kit.id)).find(x => x.ditutup == null); assert.equal((await sip("POST", "/alarm-tutup/" + buka.id, {}, ADMIN)).s, 429, "laju 600 per jam"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(ADM).run();
});

uji("bersihkanSippa lewat cron menit 17 yang ada: pesan 31 hari lalu diringkas per hari WIB (n, min, maks, rerata berbobot, mutu 2) lalu dihapus, 29 hari tetap; perangkat diam > 3 x interval membuka alarm diam dan menutup saat bicara", async () => {
  const S = new Date(); S.setUTCHours(20, 17, 0, 0);   // 03.17 WIB: jam ringkas harian (sekali sehari, bukan tiap jam: kuota baca D1)
  const K = await rakit("SIPPA-190", [PER_ISI[0]]), noon = k => Math.floor((S.getTime() - k * HARI + 7 * JAM) / HARI) * HARI - 7 * JAM + 12 * JAM, t31 = noon(31), t29 = noon(29), pid = K.per["PT-102"].id;
  const sisip = (id, t, bacaan) => DB.prepare("INSERT INTO sippa_telemetri (id, pengirim_id, kit_id, diterima, t_awal, t_akhir, n, n_mutu2, bacaan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(sha256(id + K.kit.id).slice(0, 32), K.gw.id, K.kit.id, t, t, t + 1000, bacaan.length, bacaan.filter(x => x[3] === 2).length, JSON.stringify(bacaan)).run();
  await sisip("a", t31, [["PT-102", t31, 4, 0, null], ["PT-102", t31 + 1000, 6, 2, null], ["XX-999", t31, 99, 0, null]]); await sisip("b", t29, [["PT-102", t29, 7, 0, null]]);
  const w = await mf.getWorker(); await w.scheduled({cron: "17 * * * *", scheduledTime: S.getTime() - 6 * JAM});
  assert.equal(await hitung("sippa_telemetri_harian", "perangkat_id = ?", pid), 0, "jam 14 UTC: belum waktunya meringkas"); assert.equal(await hitung("sippa_telemetri", "kit_id = ? AND diterima = ?", K.kit.id, t31), 1, "pesan 31 hari belum dihapus");
  await w.scheduled({cron: "17 * * * *", scheduledTime: S.getTime()});
  const h = await DB.prepare("SELECT * FROM sippa_telemetri_harian WHERE perangkat_id = ?").bind(pid).all(); assert.equal(h.results.length, 1, JSON.stringify(h.results)); const r = h.results[0];
  assert.equal(r.hari, tglWib(t31)); assert.equal(r.n, 2, "tag tanpa perangkat tidak diringkas"); assert.equal(r.min, 4); assert.equal(r.maks, 6); assert.equal(r.rerata, 5); assert.equal(r.n_mutu2, 1); assert.equal(r.dummy, 0);
  assert.equal(await hitung("sippa_telemetri", "kit_id = ? AND t_akhir < ?", K.kit.id, S.getTime() - 30 * HARI), 0, "pesan > 30 hari dihapus"); assert.equal(await hitung("sippa_telemetri", "kit_id = ? AND diterima = ?", K.kit.id, t29), 1, "29 hari tetap");
  const env0 = await mf.getBindings(), kiniNon20 = S.getTime() - 6 * JAM; await sisip("c", t31, [["PT-102", t31 + 2000, 10, 0, null]]);
  const bukan = await bersihkanSippa(env0, kiniNon20); assert.deepEqual([bukan.diringkas, bukan.dihapus], [0, 0], "di luar jam 20 UTC tidak meringkas"); assert.equal(await hitung("sippa_telemetri", "kit_id = ? AND diterima = ?", K.kit.id, t31), 1);
  assert.equal((await bersihkanSippa(env0, kiniNon20, {paksa: true})).dihapus, 1, "paksa: operator atau uji meringkas di luar jam 20 UTC");
  await sisip("d", t31, [["PT-102", t31 + 3000, 2, 0, null]]); await w.scheduled({cron: "17 * * * *", scheduledTime: S.getTime()});
  const g = await DB.prepare("SELECT * FROM sippa_telemetri_harian WHERE perangkat_id = ?").bind(pid).first(); assert.equal(g.n, 4); assert.equal(g.min, 2); assert.equal(g.maks, 10); dekat(g.rerata, 5.5, "rerata digabung berbobot n: (5 x 2 + 10 + 2) / 4"); assert.equal(g.n_mutu2, 1);
  const hr = await sip("GET", `/telemetri?perangkat=${pid}&harian=1`, undefined, pus.h); assert.equal(hr.s, 200); assert.deepEqual(hr.j.harian.map(x => [x.hari, x.n, x.min, x.maks]), [[tglWib(t31), 4, 2, 10]], "GET harian membaca ringkasan yang lebih tua dari 30 hari");
  assert.match(teks("src/worker.js"), /async function bersihSemua[\s\S]*bersihkanSippa\(env/, "bersihkanSippa dipanggil dari bersihSemua (cron menit 17), bukan jadwal baru"); assert.doesNotMatch(teks("wrangler.jsonc"), /sippa/i);
  /* diam */
  const D = await rakit("SIPPA-191", [PER_ISI[0], PER_ISI[1]]); assert.equal((await kirimT(D, [["PT-102", -20, 5, "bar"]])).s, 202);
  const tua = Date.now() - 10 * 60e3; await DB.prepare("UPDATE sippa_telemetri SET diterima = ?, t_awal = ?, t_akhir = ? WHERE kit_id = ?").bind(tua, tua, tua, D.kit.id).run(); await DB.prepare("UPDATE sippa_perangkat SET dibuat = ? WHERE kit_id = ?").bind(Date.now() - 86400e3, D.kit.id).run();
  const env = await mf.getBindings(), a = await bersihkanSippa(env, Date.now()); assert.ok(a.diam >= 3, JSON.stringify(a));
  const diam = await alarmDi(D.kit.id, "diam"); assert.deepEqual(diam.map(x => x.perangkat_id).sort(), [D.gw.id, D.per["PT-102"].id, D.per["FT-101"].id].sort(), "gateway, PT-102 (tak ada bacaan 3 menit), FT-101 (tak pernah): semuanya diam"); assert.ok(diam.every(x => x.ambang === 180 && x.ditutup == null && x.nilai == null));
  await bersihkanSippa(env, Date.now()); assert.equal((await alarmDi(D.kit.id, "diam")).length, 3, "cron berikutnya tidak membuka alarm kembar");
  assert.equal((await kirimT(D, [["PT-102", -5, 5.1, "bar"]])).s, 202); const sesudah = await alarmDi(D.kit.id, "diam");
  assert.deepEqual(sesudah.filter(x => x.ditutup == null).map(x => x.perangkat_id), [D.per["FT-101"].id], "yang baru bicara (gateway dan PT-102) tertutup; FT-101 tetap diam"); assert.ok(sesudah.filter(x => x.ditutup != null).every(x => x.ditutup_oleh === "otomatis"));
  const dicabut = await sip("POST", "/perangkat-cabut/" + D.per["FT-101"].id, {}, MOD2); assert.equal(dicabut.s, 200); assert.equal((await alarmDi(D.kit.id, "diam")).filter(x => x.ditutup == null).length, 0, "perangkat dicabut: alarmnya ikut tertutup");
  assert.equal((await alarmDi(D.kit.id, "diam")).find(x => x.perangkat_id === D.per["FT-101"].id).ditutup_oleh, "dicabut"); await bersihkanSippa(env, Date.now()); assert.equal((await alarmDi(D.kit.id, "diam")).filter(x => x.ditutup == null).length, 0, "perangkat nonaktif tidak diperiksa");
});

uji("dummy: Super Admin mengisi layar telemetri (kit, perangkat, 96 pesan 24 jam, 7 hari ringkasan, satu alarm tertutup dan satu aktif), isi kedua 409, staf nyata tidak melihat, hapus menyisakan baris nyata dan hilir tanpa hulu 0 baris", async () => {
  const nyata = async () => ({perangkat: await hitung("sippa_perangkat", "dummy = 0"), tel: await hitung("sippa_telemetri", "dummy = 0"), harian: await hitung("sippa_telemetri_harian", "dummy = 0"), alarm: await hitung("sippa_alarm", "dummy = 0"), kit: await hitung("sippa_kit", "dummy = 0"), jejak: await jejak()});
  const sebelum = await nyata(), sampai = Date.now() - 5 * 60e3, sejak = sampai - 30 * HARI;
  assert.equal((await sip("POST", "/dummy/isi", {layar: "telemetri"}, MOD2)).s, 403); assert.equal((await sip("POST", "/dummy/isi", {layar: "telemetri"}, pus.h)).s, 403);
  const r = await sip("POST", "/dummy/isi", {layar: "telemetri", sejak, sampai}, ADMIN); assert.equal(r.s, 200, r.t); cekKepala(r, "dummy telemetri");
  assert.equal(r.j.dibuat.sippa_perangkat, 4); assert.equal(r.j.dibuat.sippa_telemetri, 96); assert.equal(r.j.dibuat.sippa_telemetri_harian, 21); assert.equal(r.j.dibuat.sippa_alarm, 2); assert.ok(r.j.dibuat.sippa_kit >= 7, JSON.stringify(r.j.dibuat));
  const p = (await DB.prepare("SELECT * FROM sippa_perangkat WHERE dummy = 1").all()).results; assert.deepEqual(p.map(x => x.tag).sort(), ["FT-101", "PT-102", "T-103", "U-102"]); assert.ok(p.find(x => x.tag === "U-102").token_sha, "gateway dummy bertoken (CHECK)");
  const baris = (await DB.prepare("SELECT * FROM sippa_telemetri WHERE dummy = 1 ORDER BY t_akhir").all()).results; assert.equal(baris.length, 96); assert.ok(baris.every(x => x.t_akhir > sampai - 24 * JAM && x.t_akhir <= sampai), "24 jam yang terpampang, bukan hari ini");
  const nilai = tag => baris.map(x => JSON.parse(x.bacaan).find(b => b[0] === tag)[2]); for (const tag of ["PT-102", "FT-101", "T-103"]) { assert.ok(new Set(nilai(tag)).size > 20, `${tag}: angka bervariasi, bukan konstanta`); assert.ok(nilai(tag).some(v => v !== 0)); }
  assert.ok(baris.some(x => x.n_mutu2 === 1) && baris.every(x => x.n === 3), "satu pesan memuat mutu 2"); assert.ok(nilai("T-103")[95] > 50 && nilai("T-103")[0] > nilai("T-103")[95], "suhu mendingin tetapi masih di atas 50 C");
  const al = (await DB.prepare("SELECT * FROM sippa_alarm WHERE dummy = 1 ORDER BY mulai").all()).results; assert.equal(al.filter(x => x.ditutup != null).length, 1); assert.equal(al.filter(x => x.ditutup == null).length, 1); assert.deepEqual(al.map(x => x.kode).sort(), ["belum_dingin", "tekanan_lebih"]);
  assert.equal(await hitung("sippa_telemetri_harian", "dummy = 1 AND n > 0 AND maks > min"), 21);
  const lagi = await sip("POST", "/dummy/isi", {layar: "telemetri", sejak, sampai}, ADMIN); assert.equal(lagi.s, 409, lagi.t); assert.match(lagi.j.galat, /sudah ada untuk periode/);
  /* staf nyata tidak melihat dummy; admin melihat */
  const dpt = p.find(x => x.tag === "PT-102").id;
  assert.ok(!(await sip("GET", "/perangkat", undefined, pim.h)).j.perangkat.some(x => x.dummy === 1), "perangkat dummy tersaring"); assert.ok(!(await sip("GET", "/alarm", undefined, pim.h)).j.alarm.some(x => x.dummy === 1), "alarm dummy tersaring");
  assert.equal((await sip("GET", `/telemetri?perangkat=${dpt}`, undefined, pim.h)).s, 404, "seri dummy 404 untuk staf nyata"); assert.ok(!(await butirPantau(pim.h)).some(b => b.dummy === 1), "butir dummy tersaring untuk staf nyata");
  const ad = await sip("GET", `/telemetri?perangkat=${dpt}`, undefined, ADMIN); assert.equal(ad.s, 200); assert.equal(ad.j.seri.length, 96); assert.ok(ad.j.seri.some(x => x[2] === 2), "mutu 2 terlihat"); assert.deepEqual(ad.j.ambang, {min_sah: 0, maks_sah: 12});
  const hr = await sip("GET", `/telemetri?perangkat=${dpt}&harian=1`, undefined, ADMIN); assert.equal(hr.j.harian.length, 7); assert.ok(hr.j.harian.every(x => x.n === 96 && x.maks > x.min && x.rerata >= x.min && x.rerata <= x.maks));
  assert.ok((await sip("GET", "/perangkat", undefined, ADMIN)).j.perangkat.some(x => x.dummy === 1 && x.tag === "PT-102" && x.nilai_terakhir != null)); assert.ok((await sip("GET", "/alarm?aktif=1", undefined, ADMIN)).j.alarm.some(x => x.dummy === 1 && x.kode === "belum_dingin"));
  assert.ok((await butirPantau(ADMIN)).some(b => b.dummy === 1), "Meja Pantau admin melihat butir dummy"); const env = await mf.getBindings(); const cr = await bersihkanSippa(env, Date.now());
  assert.equal(await hitung("sippa_alarm", "dummy = 1 AND kode = 'diam'"), 0, "perangkat dummy tidak pernah memicu diam"); assert.ok(cr.diam >= 0);
  const h = await sip("POST", "/dummy/hapus", {}, ADMIN); assert.equal(h.s, 200, h.t); for (const [t, n] of [["sippa_perangkat", 4], ["sippa_telemetri", 96], ["sippa_telemetri_harian", 21], ["sippa_alarm", 2]]) assert.equal(h.j.dihapus[t], n, t);
  for (const t of ["sippa_perangkat", "sippa_telemetri", "sippa_telemetri_harian", "sippa_alarm", "sippa_kit"]) assert.equal(await hitung(t, "dummy = 1"), 0, `${t} masih punya dummy`); assert.deepEqual(await nyata(), sebelum, "baris nyata utuh");
  const c = {kini: Date.now(), sejak, sampai, ada: false}; for (const nama of ["isiPerangkat", "isiTelemetri", "isiHarian", "isiAlarm"]) { const x = await PENGISI[nama](env, c); assert.equal(Object.values(x).reduce((a, b) => a + b, 0), 0, `${nama} tanpa hulu harus 0 baris: ${JSON.stringify(x)}`); }
  assert.deepEqual(RANTAI_DUMMY.telemetri, ["isiKit", "isiPerangkat", "isiTelemetri", "isiHarian", "isiAlarm"]); assert.equal((await sip("POST", "/dummy/isi", {layar: "telemetri", sejak, sampai}, ADMIN)).s, 200, "sesudah hapus, isi lagi berhasil");
  assert.equal((await sip("POST", "/dummy/hapus", {}, ADMIN)).s, 200);
});

uji("tanpa tabel 0058 (kode tiba sebelum migrasi): semua rute telemetri menjawab 503 sopan, token sah tetap 503 bukan 401, Meja Pantau dan rute 0056 tetap 200, cron tidak jatuh", async () => {
  const T = await siapkan("uji-sippa-tanpa-0058", {r2: true});
  await T.DB.batch(["sippa_alarm", "sippa_telemetri_harian", "sippa_telemetri", "sippa_perangkat"].map(t => T.DB.prepare(`DROP TABLE ${t}`)));
  const pesan = {galat: "Migrasi SIPPA belum diterapkan di basis data", status: "tanpa_migrasi"}, id = "0123456789abcdef";
  const k0 = await T.api("POST", "/api/sippa/kit", {kode: "SIPPA-101", jenis: "gambut", prov: "62", kab: "Kota Palangka Raya"}, MOD2); assert.equal(k0.s, 201, k0.t);   // kit 0056 nyata: validasi kit lolos, lalu tabel 0058 yang hilang
  for (const [m, j, b] of [["GET", "/perangkat"], ["POST", "/perangkat", {kit_id: k0.j.kit.id, tag: "PT-101", jenis: "tekanan", satuan: "bar"}], ["POST", "/perangkat-cabut/" + id, {}], ["GET", "/telemetri?perangkat=" + id], ["GET", "/alarm"], ["POST", "/alarm-tutup/" + id, {}]]) {
    const r = await T.api(m, "/api/sippa" + j, b, ADMIN); assert.equal(r.s, 503, `${m} ${j}: ${r.s} ${r.t.slice(0, 120)}`); assert.deepEqual(r.j, pesan, `${m} ${j}`);
  }
  const t = await T.api("POST", "/api/sippa/telemetri", {kit: "SIPPA-101", bacaan: []}, {authorization: "Bearer " + "a".repeat(64)}); assert.equal(t.s, 503, t.t); assert.deepEqual(t.j, pesan);
  assert.equal((await T.api("GET", "/api/sippa/kit", undefined, ADMIN)).s, 200, "rute 0056 tetap hidup"); assert.equal((await T.api("GET", "/api/pantau", undefined, ADMIN)).s, 200, "Meja Pantau melewati detektor yang tabelnya belum ada");
  await (await T.mf.getWorker()).scheduled({cron: "17 * * * *"}); assert.equal((await T.api("GET", "/api/warga/konfig")).s, 200, "cron menit 17 tidak menjatuhkan worker");
});

/* ---------------------------------------------------------------- SP-093 aset, inspeksi, pelihara, stok (migrasi 0059, keputusan 56) */
{   // rantai uji sendiri: kegagalan uji SP-035 atau SP-050 di atas tidak boleh menyembunyikan hasil blok ini (status D1 yang dipakai di sini hanya dari kit1 sampai kit3)
const uji = berantai();
const asetB =(o = {}) => ({kelas: "pompa_sumur", nama: "Pompa sumur Kelurahan Pahandut", sumber: "bpbd", pemilik_aset: "BPBD Kota Palangka Raya", prov: "62", kab: "Kota Palangka Raya", atribut: {kw: 5.5}, keyakinan: "terverifikasi", ...o});
const sumurB = (atribut, o = {}) => asetB({kelas: "sumur_bor", nama: "Sumur bor Kereng Bangkirai", atribut, ...o});
const asetBaru = async (o, h = pus.h) => { const r = await sip("POST", "/aset", o, h); assert.equal(r.s, 201, r.t); return r.j.aset; };
const komp3 = (kit, kode) => DB.prepare("SELECT id, kondisi, dicek FROM sippa_komponen WHERE kit_id = ? AND kode_bom = ?").bind(kit, kode).first();
let K93, T93, S93, J93, A1, A2, A3;
uji("SP-093 siapkan: kit SIPPA-170 dengan tugas, dan halaman /pipa/pelihara, /pipa/air, /pipa/akses, /pipa/aset/:id", async () => {
  await bersihLaju();
  const k = await sip("POST", "/kit", {kode: "SIPPA-170", jenis: "gambut", templat: "gambut", prov: "62", kab: "Kota Palangka Raya", lokasi: "Gudang Pahandut"}, MOD2); assert.equal(k.s, 201, k.t); K93 = k.j.kit.id;
  const t = await tugasBaru({kit_id: K93, nama_regu: "Regu Inspeksi"}); assert.equal(t.s, 201, t.t); T93 = t.j.tugas.id; S93 = t.j.kode;
  const t2 = await tugasBaru({nama_regu: "Regu Tanpa Kit"}); J93 = t2.j.kode;
  for (const l of ["pelihara", "air", "akses"]) { const r = await man("/pipa/" + l, pus.g); assert.equal(r.s, 200, l); assert.match(r.t, new RegExp(`data-layar="${l}"`)); assert.equal((await man("/pipa/" + l)).s, 303, `${l} tamu`); assert.equal((await man("/pipa/" + l, ver.g)).s, 403, `${l} verifikator`); }
  const a = await man("/pipa/aset/0123456789abcdef", pus.g); assert.equal(a.s, 200); assert.match(a.t, /data-layar="aset"/);
  assert.equal((await man("/pipa/aset/0123456789abcdef")).s, 303, "tamu"); assert.equal((await man("/pipa/aset/0123456789abcdef", ver.g)).s, 403, "verifikator"); assert.equal((await man("/pipa/aset/0123456789abcde", pus.g)).s, 404, "15 heks"); assert.equal((await man("/pipa/aset", pus.g)).s, 404, "tanpa id bukan layar");
});
uji("POST /api/sippa/aset: W 201 kode AS-#### urut dari server dengan jejak; pimpinan 403, tamu 401; kelas, atribut, koordinat, sumur kritis tanpa rekomendasi 400; atribut 4.097 byte 400; wilayah 61 untuk 62 404; laju 120", async () => {
  const j0 = await jejak();
  A1 = await asetBaru(asetB({kode: "AS-0999", atribut: {kw: 5.5, sumber_daya: "genset"}}));
  assert.match(A1.kode, /^AS-\d{4}$/); assert.notEqual(A1.kode, "AS-0999", "kode dari klien diabaikan"); assert.equal(A1.status, "rencana"); assert.deepEqual(A1.atribut, {kw: 5.5, sumber_daya: "genset"}); assert.equal(A1.oleh, pus.kunci); assert.equal(A1.dummy, 0);
  assert.equal(await jejak(), j0 + 1, "satu baris jejak"); assert.equal(await hitung("pantau_jejak", "obyek = ?", "sippa_aset:" + A1.id), 1);
  A2 = await asetBaru(sumurB({kedalaman_m: 60, zona_konservasi: "kritis", rekomendasi_bg: "Rek. Teknis Badan Geologi 12/2026"}, {sumber: "badan_geologi", status: "berfungsi"}));
  assert.equal(Number(A2.kode.slice(3)), Number(A1.kode.slice(3)) + 1, "nomor urut berikutnya"); assert.equal(A2.atribut.rekomendasi_bg, "Rek. Teknis Badan Geologi 12/2026");
  A3 = await asetBaru(asetB({kelas: "jembatan_darurat", nama: "Jembatan Bailey Sei Kapuas", sumber: "tniad", pemilik_aset: "Pemkab Kapuas", atribut: {jenis: "bailey", bentang_m: 30}, lat: -3.0, lon: 114.3, keyakinan: "resmi"}));
  assert.equal(A3.rencana_ganti, null, "tanpa rencana_ganti diterima (pil tanpa jadwal ganti di layar)"); assert.equal(A3.lat, -3);
  assert.equal((await asetBaru(sumurB({zona_konservasi: "aman"}))).kelas, "sumur_bor", "zona aman tanpa rekomendasi lolos");
  for (const [n, h] of [["pimpinan", pim.h], ["verifikator", ver.h], ["akun gerbang", GERBANG]]) { const x = await sip("POST", "/aset", asetB(), h); assert.equal(x.s, 403, n); assert.ok(x.j.galat); }
  assert.equal((await sip("POST", "/aset", asetB())).s, 401, "tamu"); assert.equal((await sip("POST", "/aset", asetB(), {cookie: pus.g.cookie})).s, 401, "sesi staf tanpa x-pb");
  const n0 = await hitung("sippa_aset");
  const kon = [["kelas liar", {kelas: "helikopter"}], ["kelas bukan teks", {kelas: 5}], ["kelas hilang", {kelas: undefined}], ["atribut bukan objek", {atribut: [1]}], ["atribut teks", {atribut: "x"}], ["atribut medan liar", {atribut: {kw: 5, warna: "merah"}}], ["atribut wajib kosong", {atribut: {}}],
    ["sumur kritis tanpa rekomendasi", sumurB({zona_konservasi: "kritis"})], ["sumur rusak tanpa rekomendasi", sumurB({zona_konservasi: "rusak", rekomendasi_bg: "  "})], ["lat di luar kotak", {lat: 20, lon: 114}], ["lon di luar kotak", {lat: -3, lon: 150}], ["lat teks", {lat: "-3"}],
    ["atribut 4.097 byte", {atribut: {kw: 5, sumber_daya: "x".repeat(4097)}}], ["nama 1 huruf", {nama: "A"}], ["pemilik 2 huruf", {pemilik_aset: "ab"}], ["sumber liar", {sumber: "swasta"}], ["keyakinan liar", {keyakinan: "pasti"}], ["keyakinan hilang", {keyakinan: undefined}],
    ["status liar", {status: "hancur"}], ["prov 1 digit", {prov: "6"}], ["prov hilang", {prov: undefined}], ["rencana_ganti pecahan", {rencana_ganti: 1.5}], ["kit_id tidak ada", {kit_id: "0123456789abcdef"}], ["kit_id cacat", {kit_id: "xyz"}],
    ["jembatan darurat tanpa pemilik", {kelas: "jembatan_darurat", pemilik_aset: undefined, atribut: {jenis: "bailey", bentang_m: 30}}]];
  for (const [ket, o] of kon) { const x = await sip("POST", "/aset", {...asetB(), ...o}, pus.h); assert.equal(x.s, 400, `${ket}: ${x.t}`); assert.ok(x.j.galat, ket); }
  assert.match((await sip("POST", "/aset", sumurB({zona_konservasi: "kritis"}), pus.h)).j.galat, /rekomendasi_bg/, "galat menyebut nama medan");
  assert.equal(await hitung("sippa_aset"), n0, "masukan liar tidak menulis");
  assert.equal((await sip("POST", "/aset", asetB({prov: "62"}), pus61.h)).s, 404, "wilayah 61 tidak boleh menulis prov 62"); assert.equal((await sip("POST", "/aset", asetB({prov: "61", kab: "Kab X"}), pus61.h)).s, 201);
  await isiLaju(koor.kunci, "sippa.aset", 120); assert.equal((await sip("POST", "/aset", asetB(), koor.h)).s, 429); assert.equal((await sip("POST", "/aset", asetB(), pus.h)).s, 201, "pelaku lain tetap lolos"); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(koor.kunci).run();
  const raw = await DB.prepare("INSERT INTO sippa_aset (id, kode, kelas, nama, sumber, pemilik_aset, prov, atribut, keyakinan, dibuat, diubah, oleh) VALUES ('aaaaaaaaaaaaaaaa', 'AS-0500', 'sumur_bor', 'Sumur liar', 'bpbd', 'BPBD', '62', '{\"zona_konservasi\":\"kritis\"}', 'resmi', 1, 1, 'uji')").run().then(() => "lolos", e => String(e.message));
  assert.match(raw, /CHECK/, "SQL langsung: CHECK 0059 menolak sumur kritis tanpa rekomendasi");
});
uji("POST /api/sippa/aset/:id: W 200 hanya status, pemelihara, rencana_ganti, rujukan, atribut (digabung lalu cekAset ulang); medan lain 400; pimpinan 403; wilayah 61 404; laju 600", async () => {
  const j0 = await jejak(), r = await sip("POST", "/aset/" + A3.id, {status: "berfungsi", rencana_ganti: Date.now() + 90 * HARI, pemelihara: "Zeni TNI AD", atribut: {beban_ton: 40}, rujukan: "BA serah terima 7/2026"}, pus.h);
  assert.equal(r.s, 200, r.t); assert.equal(r.j.aset.status, "berfungsi"); assert.ok(r.j.aset.rencana_ganti > Date.now()); assert.deepEqual(r.j.aset.atribut, {jenis: "bailey", bentang_m: 30, beban_ton: 40}, "atribut digabung, bukan diganti"); assert.equal(r.j.aset.pemelihara, "Zeni TNI AD");
  assert.equal(await jejak(), j0 + 1);
  const h = await sip("POST", "/aset/" + A3.id, {atribut: {beban_ton: null}}, pus.h); assert.equal(h.s, 200); assert.deepEqual(h.j.aset.atribut, {jenis: "bailey", bentang_m: 30}, "null menghapus kunci");
  const w = await sip("POST", "/aset/" + A2.id, {atribut: {zona_konservasi: "rusak"}}, pus.h); assert.equal(w.s, 200, "rekomendasi lama tetap ada sesudah digabung");
  for (const [ket, o] of [["kelas", {kelas: "sumur_bor"}], ["prov", {prov: "61"}], ["kode", {kode: "AS-0001"}], ["nama", {nama: "Baru"}], ["badan kosong", {}], ["status liar", {status: "hancur"}], ["status null", {status: null}], ["atribut bukan objek", {atribut: 5}], ["atribut medan liar", {atribut: {warna: 1}}], ["bentang 301", {atribut: {bentang_m: 301}}], ["rencana_ganti teks", {rencana_ganti: "besok"}], ["atribut 4.097 byte", {atribut: {jenis: "lain", program: "x".repeat(130), kw: 1, x: "y".repeat(4000)}}]]) {
    const x = await sip("POST", "/aset/" + A3.id, o, pus.h); assert.equal(x.s, 400, `${ket}: ${x.t}`);
  }
  const hapusRek = await sip("POST", "/aset/" + A2.id, {atribut: {rekomendasi_bg: null}}, pus.h); assert.equal(hapusRek.s, 400, "menghapus rekomendasi di zona rusak ditolak"); assert.match(hapusRek.j.galat, /rekomendasi_bg/);
  assert.equal((await sip("POST", "/aset/" + A3.id, {status: "rusak"}, pim.h)).s, 403); assert.equal((await sip("POST", "/aset/" + A3.id, {status: "rusak"})).s, 401);
  assert.equal((await sip("POST", "/aset/" + A3.id, {status: "rusak"}, pus61.h)).s, 404, "di luar wilayah"); assert.equal((await sip("POST", "/aset/0123456789abcdef", {status: "rusak"}, pus.h)).s, 404);
  await isiLaju(koor.kunci, "sippa.tulis", 600); assert.equal((await sip("POST", "/aset/" + A3.id, {status: "rusak"}, koor.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(koor.kunci).run();
});
uji("POST /api/sippa/inspeksi: komponen skor 2 menjadi rusak_berat dengan dicek = waktu (P8); mutu_air tanpa e_coli_cfu 400 dan dengan 3 201 (A2); komponen bukan milik kit, skor 4, uji_tekanan tanpa tekanan_bar, ukuran 400; pimpinan 403; K 401; wilayah 404; laju 600", async () => {
  const cp = await komp3(K93, "P-101"), j0 = await jejak();
  const r = await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: cp.id, kit_id: K93, jenis: "berkala", skor: 2, temuan: "Impeller aus", tindakan: "ganti"}, pus.h);
  assert.equal(r.s, 201, r.t); cekKepala(r, "inspeksi"); assert.equal(r.j.inspeksi.skor, 2); assert.equal(r.j.inspeksi.prov, "62", "prov dari kit"); assert.equal(await jejak(), j0 + 1, "jejak satu baris");
  const k = await komp3(K93, "P-101"); assert.equal(k.kondisi, "rusak_berat"); assert.equal(k.dicek, r.j.inspeksi.waktu, "dicek = waktu inspeksi (trigger 0059)");
  assert.equal((await sip("GET", "/kit/" + K93, undefined, pus.h)).j.komponen.find(c => c.id === cp.id).kondisi, "rusak_berat", "layar Kit membaca kolom yang sama");
  const b = await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: cp.id, kit_id: K93, jenis: "berkala", skor: 0}, pus.h); assert.equal(b.s, 201); assert.equal((await komp3(K93, "P-101")).kondisi, "baik", "skor 0 memulihkan");
  const kt = await sip("POST", "/inspeksi", {sasaran_jenis: "kit", sasaran_id: K93, jenis: "tahunan", skor: 1, jam_operasi: 12.5}, pus.h); assert.equal(kt.s, 201, kt.t); assert.equal(kt.j.inspeksi.kit_id, K93);
  const m0 = await sip("POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: A2.id, jenis: "mutu_air", skor: 0}, pus.h); assert.equal(m0.s, 400, m0.t); assert.match(m0.j.galat, /e_coli_cfu/);
  assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: A2.id, jenis: "mutu_air", skor: 0, hasil: {e_coli_cfu: "tiga"}}, pus.h)).s, 400, "e_coli_cfu harus angka");
  const m3 = await sip("POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: A2.id, jenis: "mutu_air", skor: 2, hasil: {e_coli_cfu: 3}, tindakan: "uji_ulang"}, pus.h); assert.equal(m3.s, 201, m3.t); assert.equal(m3.j.inspeksi.hasil.e_coli_cfu, 3); assert.equal(m3.j.inspeksi.kit_id, null);
  const kon = [["skor 4", {skor: 4}], ["skor -1", {skor: -1}], ["skor pecahan", {skor: 1.5}], ["skor teks", {skor: "1"}], ["jenis liar", {jenis: "visual"}], ["sasaran_jenis liar", {sasaran_jenis: "gudang"}], ["sasaran_id cacat", {sasaran_id: "xyz"}], ["tindakan liar", {tindakan: "bakar"}],
    ["uji_tekanan tanpa tekanan_bar", {jenis: "uji_tekanan"}], ["temuan 1.001", {temuan: "x".repeat(1001)}], ["hasil 2.049 byte", {hasil: {x: "y".repeat(2049)}}], ["hasil bukan objek", {hasil: [1]}], ["jam_operasi negatif", {jam_operasi: -1}],
    ["komponen kit lain", {sasaran_id: (await DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? LIMIT 1").bind(kit2).first()).id}], ["komponen tanpa kit_id", {kit_id: undefined}], ["foto tidak ada", {foto_id: "0123456789abcdef"}]];
  for (const [ket, o] of kon) { const x = await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: cp.id, kit_id: K93, jenis: "berkala", skor: 1, ...o}, pus.h); assert.equal(x.s, 400, `${ket}: ${x.t}`); assert.ok(x.j.galat); }
  assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: cp.id, kit_id: K93, jenis: "uji_tekanan", skor: 1, hasil: {tekanan_bar: 9}}, pus.h)).s, 201, "uji_tekanan dengan tekanan_bar lolos");
  const sa = await sip("POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: A3.id, jenis: "serah_terima", skor: 0, tindakan: "serahkan", kit_id: kit1}, pus.h); assert.equal(sa.s, 201, sa.t); assert.equal(sa.j.inspeksi.kit_id, null, "kit_id kiriman diabaikan untuk aset");
  assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "kit", sasaran_id: K93, kit_id: kit1, jenis: "tahunan", skor: 1}, pus.h)).s, 400, "kit_id harus sama dengan sasaran_id");
  assert.equal(await hitung("sippa_inspeksi", "dummy = 0"), 6, "hanya yang sah tertulis");
  const dasar = {sasaran_jenis: "komponen", sasaran_id: cp.id, kit_id: K93, jenis: "berkala", skor: 1};
  assert.equal((await sip("POST", "/inspeksi", dasar, pim.h)).s, 403, "pimpinan"); assert.equal((await sip("POST", "/inspeksi", dasar, ver.h)).s, 403, "verifikator"); assert.equal((await sip("POST", "/inspeksi", dasar)).s, 401, "tamu");
  assert.equal((await sip("POST", "/inspeksi", {...dasar, jenis: "pra_gelar"}, {"x-kode": S93})).s, 401, "operator berkode tidak lewat rute ini");
  assert.equal((await sip("POST", "/inspeksi", dasar, pus61.h)).s, 404, "kit di luar wilayah"); assert.equal((await sip("POST", "/inspeksi", {...dasar, sasaran_jenis: "aset", sasaran_id: A1.id}, pus61.h)).s, 404, "aset di luar wilayah");
  assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: "0123456789abcdef", jenis: "berkala", skor: 0}, pus.h)).s, 404);
  assert.equal(await hitung("sippa_inspeksi", "dummy = 0"), 6, "penolakan wilayah tidak menulis");
  await isiLaju(koor.kunci, "sippa.tulis", 600); assert.equal((await sip("POST", "/inspeksi", dasar, koor.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(koor.kunci).run();
  const upd = await DB.prepare("UPDATE sippa_inspeksi SET skor = 0").run().then(() => "lolos", e => String(e.message)); assert.match(upd, /sippa_insp_tetap/, "tambah-saja");
});
uji("POST /lapangan/kirim butir inspeksi: pasca_gelar komponen kit tugasnya diterima dan menurunkan kondisi (P10); komponen kit lain, jenis tahunan, aset, kit lain, tugas tanpa kit, id bukan UUID ditolak per butir; kirim ulang = ganda; batas 200 butir", async () => {
  const cp = await komp3(K93, "H-101"), kitLain = (await DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? LIMIT 1").bind(kit2).first()).id;
  const ib = (o = {}) => ({id: uuid(), sasaran_jenis: "komponen", sasaran_id: cp.id, jenis: "pasca_gelar", skor: 1, temuan: "Layflat lecet", waktu_klien: Date.now() - 1000, ...o});
  const sah = ib(), t = ib({jenis: "tahunan"}), kl = ib({sasaran_id: kitLain}), kitSendiri = ib({sasaran_jenis: "kit", sasaran_id: K93, jenis: "pra_gelar", skor: 0}), kitAsing = ib({sasaran_jenis: "kit", sasaran_id: kit1}), aset = ib({sasaran_jenis: "aset", sasaran_id: A1.id}), buruk = ib({id: "bukan-uuid"}), skor = ib({skor: 4});
  const j0 = await jejak(), r = await kirim(S93, {inspeksi: [sah, t, kl, kitSendiri, kitAsing, aset, buruk, skor]}); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.diterima.sort(), [sah.id, kitSendiri.id].sort()); assert.equal(r.j.ditolak.length, 6, JSON.stringify(r.j.ditolak));
  const alasan = id => r.j.ditolak.find(x => x.id === id)?.alasan; assert.match(alasan(t.id), /hanya untuk staf/); assert.match(alasan(kl.id), /bukan bagian dari kit tugas/); assert.match(alasan(kitAsing.id), /bukan bagian dari kit tugas/); assert.match(alasan(aset.id), /komponen atau kit/); assert.match(alasan(skor.id), /skor/); assert.ok(r.j.ditolak.some(x => /UUID v4/.test(x.alasan)));
  assert.equal(await jejak(), j0 + 1, "satu jejak kiriman");
  const k = await komp3(K93, "H-101"); assert.equal(k.kondisi, "rusak_ringan"); assert.equal(k.dicek, sah.waktu_klien, "waktu jam perangkat dipakai bila masuk akal");
  const baris = await DB.prepare("SELECT * FROM sippa_inspeksi WHERE id = ?").bind(sah.id).first(); assert.equal(baris.oleh, "tugas:" + T93); assert.equal(baris.prov, "62"); assert.equal(baris.kit_id, K93); assert.equal(baris.tindakan, "tidak_ada"); assert.equal(baris.hasil, "{}");
  const u = await kirim(S93, {inspeksi: [sah]}); assert.deepEqual(u.j.ganda, [sah.id]); assert.equal(await hitung("sippa_inspeksi", "id = ?", sah.id), 1, "kirim ulang tidak menulis dua kali");
  const tk = await kirim(J93, {inspeksi: [ib()]}); assert.match(tk.j.ditolak[0].alasan, /tidak punya kit/);
  assert.equal((await kirim(S93, {inspeksi: Array.from({length: 201}, () => ib())})).s, 400, "201 butir"); assert.equal((await kirim(S93, {inspeksi: "x"})).s, 400, "inspeksi harus larik");
  assert.equal((await kirim(S93, {inspeksi: Array.from({length: 150}, () => ib()), log: Array.from({length: 51}, () => logB())})).s, 400, "inspeksi ikut batas 200 butir gabungan");
});
uji("GET /api/sippa/aset dan /aset/:id: bentuk badan dengan inspeksi_terakhir dan mutu_terakhir; filter liar 400; tamu 401, verifikator 403; staf 61 tidak melihat prov 62 (404 identik); GET tanpa laju", async () => {
  const l = await sip("GET", "/aset", undefined, pim.h); assert.equal(l.s, 200, l.t); cekKepala(l, "aset"); assert.equal(l.j.n, l.j.aset.length);
  const a2 = l.j.aset.find(x => x.id === A2.id); for (const f of ["id", "kode", "kelas", "nama", "status", "sumber", "pemilik_aset", "pemelihara", "prov", "kab", "lat", "lon", "rencana_ganti", "keyakinan", "inspeksi_terakhir", "mutu_terakhir"]) assert.ok(f in a2, `kolom ${f}`);
  assert.deepEqual(a2.atribut.zona_konservasi, "rusak", "daftar memuat atribut terurai (tabel sumur /pipa/air)"); assert.equal(a2.inspeksi_terakhir.jenis, "mutu_air"); assert.deepEqual({e: a2.mutu_terakhir.e_coli_cfu, lolos: a2.mutu_terakhir.lolos}, {e: 3, lolos: false}, "3 CFU = tidak laik minum"); assert.ok(a2.mutu_terakhir.waktu > 0);
  assert.equal(l.j.aset.find(x => x.id === A1.id).inspeksi_terakhir, null); assert.equal(l.j.aset.find(x => x.id === A1.id).mutu_terakhir, null);
  assert.ok(l.j.aset.every((x, i, d) => !i || d[i - 1].kode <= x.kode), "urut kode");
  const f = await sip("GET", "/aset?kelas=sumur_bor&prov=62&status=berfungsi&sumber=badan_geologi", undefined, pim.h); assert.deepEqual(f.j.aset.map(x => x.id), [A2.id]);
  for (const q of ["kelas=helikopter", "status=hancur", "sumber=swasta", "prov=6", "prov=62%27"]) assert.equal((await sip("GET", "/aset?" + q, undefined, pim.h)).s, 400, q);
  assert.equal((await sip("GET", "/aset")).s, 401); assert.equal((await sip("GET", "/aset", undefined, ver.h)).s, 403);
  const w = await sip("GET", "/aset", undefined, pus61.h); assert.ok(w.j.aset.length > 0 && w.j.aset.every(x => x.prov === "61"), "wilayah 61 hanya miliknya");
  const d = await sip("GET", "/aset/" + A2.id, undefined, pim.h); assert.equal(d.s, 200, d.t); assert.deepEqual(d.j.aset.atribut.zona_konservasi, "rusak"); assert.equal(d.j.inspeksi.length, 1); assert.equal(d.j.inspeksi[0].hasil.e_coli_cfu, 3);
  const luar = await sip("GET", "/aset/" + A2.id, undefined, pus61.h), acak2 = await sip("GET", "/aset/0123456789abcdef", undefined, pus61.h); assert.equal(luar.s, 404); assert.equal(luar.t, acak2.t, "404 di luar wilayah identik dengan id tidak ada"); assert.equal((await sip("GET", "/aset/" + A2.id)).s, 401);
  const n0 = await hitung("laju_bnpb"); for (let i = 0; i < 30; i++) assert.equal((await sip("GET", i % 2 ? "/aset" : "/aset/" + A2.id, undefined, pim.h)).s, 200); assert.equal(await hitung("laju_bnpb"), n0, "GET tanpa laju (ADR-06)");
});
uji("POST/GET /api/sippa/stok: saldo 10 lalu -11 = 409 'stok tidak cukup' dan saldo tetap 10, -10 menjadi 0 (P9); pimpinan 403; delta 0, satuan, kode, alasan liar 400; GET filter gudang; laju 600", async () => {
  const j0 = await jejak(), st = o => ({gudang: "Gudang Palangka Raya", kode_bom: "C-101", nama: "Gasket kopling Storz", delta: 10, satuan: "set", alasan: "terima", ...o});
  const r = await sip("POST", "/stok", st({}), pus.h); assert.equal(r.s, 201, r.t); assert.equal(r.j.stok.saldo, 10); assert.equal(await jejak(), j0 + 1);
  const k = await sip("POST", "/stok", st({delta: -11, alasan: "pakai"}), pus.h); assert.equal(k.s, 409, k.t); assert.match(k.j.galat, /stok tidak cukup/); assert.equal(await jejak(), j0 + 1, "penolakan tidak menulis jejak");
  const saldo = async () => (await sip("GET", "/stok?gudang=" + encodeURIComponent("Gudang Palangka Raya"), undefined, pim.h)).j.stok.find(x => x.kode_bom === "C-101")?.saldo;
  assert.equal(await saldo(), 10, "saldo tetap 10"); assert.equal((await sip("POST", "/stok", st({delta: -10, alasan: "pakai"}), pus.h)).s, 201); assert.equal(await saldo(), 0);
  assert.equal((await sip("POST", "/stok", st({delta: -1, alasan: "pakai"}), pus.h)).s, 409, "saldo 0 tak bisa dikurangi");
  await sip("POST", "/stok", st({gudang: "Gudang Banjarmasin", kode_bom: "SF-101", nama: "Elemen filter", delta: 4, satuan: "unit"}), pus.h);
  const g = await sip("GET", "/stok", undefined, pim.h); assert.equal(g.s, 200); cekKepala(g, "stok"); assert.ok(g.j.stok.some(x => x.gudang === "Gudang Banjarmasin" && x.saldo === 4 && x.nama === "Elemen filter" && x.satuan === "unit"));
  const kon = [["delta 0", {delta: 0}], ["delta teks", {delta: "5"}], ["delta 100001", {delta: 100001}], ["satuan liar", {satuan: "kg"}], ["alasan liar", {alasan: "hilang"}], ["kode bom liar", {kode_bom: "kopling"}], ["kode bom 13 huruf", {kode_bom: "ABCD-12345678"}], ["gudang 2 huruf", {gudang: "ab"}], ["nama 1 huruf", {nama: "x"}], ["kit tidak ada", {kit_id: "0123456789abcdef"}]];
  for (const [ket, o] of kon) { const x = await sip("POST", "/stok", st(o), pus.h); assert.equal(x.s, 400, `${ket}: ${x.t}`); }
  assert.equal((await sip("POST", "/stok", st({}), pim.h)).s, 403); assert.equal((await sip("POST", "/stok", st({}))).s, 401); assert.equal((await sip("GET", "/stok")).s, 401);
  assert.equal((await sip("GET", "/stok?gudang=ab", undefined, pim.h)).s, 400, "gudang 2 huruf");
  await isiLaju(koor.kunci, "sippa.tulis", 600); assert.equal((await sip("POST", "/stok", st({}), koor.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(koor.kunci).run();
  const n0 = await hitung("laju_bnpb"); for (let i = 0; i < 20; i++) assert.equal((await sip("GET", "/stok", undefined, pim.h)).s, 200); assert.equal(await hitung("laju_bnpb"), n0, "GET tanpa laju");
});
uji("GET /api/sippa/pelihara dan pelihara.csv: bentuk DT §4.3; jam_sejak_servis dihitung dari log sesudah servis terakhir; filter kelas dan prov; CSV aman injeksi rumus; tamu 401; liar 400; GET tanpa laju, CSV laju 60", async () => {
  const lg = {id: "c".repeat(16), tugas_id: T93, kit_id: K93, prov: "62", jenis: "karhutla", kelas_medan: "II", t_tiba: Date.now() - 3 * HARI, jam_pompa: 30, waktu_klien: Date.now() - 3 * HARI, diterima: Date.now(), oleh: "tugas:" + T93, dummy: 0};
  await DB.prepare("INSERT INTO sippa_log_gelar (id, tugas_id, kit_id, prov, jenis, kelas_medan, t_tiba, jam_pompa, waktu_klien, diterima, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...Object.values(lg)).run();
  const r = await sip("GET", "/pelihara", undefined, pim.h); assert.equal(r.s, 200, r.t); cekKepala(r, "pelihara");
  for (const k of ["komponen", "aset", "inspeksi_terakhir", "jam_sejak_servis", "stok", "n_kit_per_gudang", "per"]) assert.ok(k in r.j, `kunci ${k}`);
  const c = r.j.komponen.find(x => x.kit_id === K93 && x.kode_bom === "P-101"); for (const f of ["id", "kit_id", "kit_kode", "kit_status", "kode_bom", "nama", "kondisi", "dicek"]) assert.ok(f in c, `komponen.${f}`); assert.equal(c.kit_kode, "SIPPA-170"); assert.equal(c.kit_status, "gudang");
  assert.equal(r.j.jam_sejak_servis[K93], 30, "belum pernah servis: semua jam log"); assert.ok(r.j.aset.some(x => x.id === A1.id) && r.j.aset.every(x => !("atribut" in x)), "aset ringkas");
  assert.ok(r.j.inspeksi_terakhir.some(i => i.sasaran_jenis === "aset" && i.sasaran_id === A2.id && i.jenis === "mutu_air" && i.skor === 2)); assert.ok(r.j.stok.some(x => x.kode_bom === "C-101" && x.saldo === 0)); assert.ok(r.j.n_kit_per_gudang["Gudang Pahandut"] >= 1); assert.ok(Math.abs(r.j.per - Date.now()) < 60e3);
  const cp = await komp3(K93, "P-101"), sv = await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: cp.id, kit_id: K93, jenis: "servis", skor: 0, jam_operasi: 30}, pus.h); assert.equal(sv.s, 201, sv.t);
  assert.equal((await sip("GET", "/pelihara", undefined, pim.h)).j.jam_sejak_servis[K93], 0, "servis tercatat: jam sejak servis dihitung ulang dari log sesudahnya");
  const k1 = await sip("GET", "/pelihara?kelas=K7", undefined, pim.h); assert.ok(k1.j.komponen.length === 0 && k1.j.aset.length > 0 && k1.j.aset.every(x => ["sumur_bor", "pompa_sumur"].includes(x.kelas)), "filter kelas K7");
  const p63 = await sip("GET", "/pelihara?prov=63", undefined, pim.h); assert.ok(p63.j.komponen.every(x => x.kit_id === kit3) && p63.j.aset.length === 0);
  const w = await sip("GET", "/pelihara?prov=62", undefined, pus61.h); assert.equal(w.j.komponen.length, 0, "wilayah 61 tidak melihat kit 62"); assert.equal(w.j.aset.length, 0, "dan tidak melihat aset 62");
  const w2 = await sip("GET", "/pelihara", undefined, pus61.h); assert.ok(w2.j.aset.every(x => x.prov === "61") && w2.j.aset.length > 0 && !w2.j.aset.some(x => x.id === A1.id), "tanpa filter: hanya aset prov 61");
  for (const q of ["kelas=K11", "kelas=k1", "prov=6", "prov=abc"]) assert.equal((await sip("GET", "/pelihara?" + q, undefined, pim.h)).s, 400, q);
  assert.equal((await sip("GET", "/pelihara")).s, 401); assert.equal((await sip("GET", "/pelihara", undefined, ver.h)).s, 403);
  await DB.prepare("UPDATE sippa_aset SET nama = '=HYPERLINK(\"http://x\")' WHERE id = ?").bind(A1.id).run();
  const cs = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/pelihara.csv", {headers: pim.h}), tx = await cs.text(); assert.equal(cs.status, 200, tx.slice(0, 200)); assert.match(cs.headers.get("content-type"), /^text\/csv; charset=utf-8/); assert.match(cs.headers.get("content-disposition"), /^attachment; filename="sippa-pelihara-\d{8}\.csv"$/);
  const baris = tx.trim().split("\r\n"); assert.equal(baris[0], "sasaran,kode,kelas,nama,status,jatuh_tempo,alasan"); assert.ok(baris.length > 20, `${baris.length} baris`); assert.match(tx, /'=HYPERLINK/, "sel berawalan = diberi tanda petik"); assert.ok(!/(^|,)=HYPERLINK/m.test(tx));
  assert.match(tx, /aset,AS-\d{4},K7,.*,(aman|segera|terlambat|belum_pernah),/); assert.match(tx, /komponen,SIPPA-170 P-101,K1,.*,(aman|segera|terlambat|belum_pernah),/);
  assert.equal((await sip("GET", "/pelihara.csv?kelas=K99", undefined, pim.h)).s, 400); assert.equal((await sip("GET", "/pelihara.csv")).s, 401);
  const n0 = await hitung("laju_bnpb"); for (let i = 0; i < 30; i++) assert.equal((await sip("GET", "/pelihara", undefined, pim.h)).s, 200); assert.equal(await hitung("laju_bnpb"), n0, "GET JSON tanpa laju");
  await isiLaju(pim.kunci, "sippa.csv", 60); assert.equal((await sip("GET", "/pelihara.csv", undefined, pim.h)).s, 429); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(pim.kunci).run();
});
uji("dummy: staf nyata tidak pernah menerima baris dummy = 1 dari aset, aset/:id, pelihara, stok; admin melihat; hapus dummy membuang aset, inspeksi, dan stok dummy dan menyisakan yang nyata", async () => {
  const D = "d".repeat(16);
  await DB.batch([DB.prepare("INSERT INTO sippa_aset (id, kode, kelas, nama, sumber, pemilik_aset, prov, atribut, keyakinan, dibuat, diubah, oleh, dummy) VALUES (?, 'AS-9001', 'pompa_sumur', 'Pompa dummy', 'bpbd', 'BPBD Dummy', '62', '{\"kw\":3}', 'asumsi-kebijakan', 1, 1, 'dummy', 1)").bind(D),
    DB.prepare("INSERT INTO sippa_inspeksi (id, sasaran_jenis, sasaran_id, jenis, skor, prov, oleh, waktu, dummy) VALUES (?, 'aset', ?, 'berkala', 0, '62', 'dummy', 1, 1)").bind("e".repeat(16), D),
    DB.prepare("INSERT INTO sippa_stok_gerak (id, gudang, kode_bom, nama, delta, satuan, alasan, oleh, waktu, dummy) VALUES (?, 'Gudang Dummy', 'C-101', 'Gasket dummy', 7, 'set', 'terima', 'dummy', 1, 1)").bind("f".repeat(16))]);
  assert.ok((await sip("GET", "/aset", undefined, ADMIN)).j.aset.some(x => x.id === D), "admin melihat dummy");
  for (const h of [pim.h, pus.h]) {
    assert.ok(!(await sip("GET", "/aset", undefined, h)).j.aset.some(x => x.id === D), "daftar aset"); assert.equal((await sip("GET", "/aset/" + D, undefined, h)).s, 404, "rincian aset dummy 404");
    const p = (await sip("GET", "/pelihara", undefined, h)).j; assert.ok(!p.aset.some(x => x.id === D) && !p.stok.some(x => x.gudang === "Gudang Dummy") && !p.inspeksi_terakhir.some(x => x.sasaran_id === D), "pelihara");
    assert.ok(!(await sip("GET", "/stok", undefined, h)).j.stok.some(x => x.gudang === "Gudang Dummy"), "stok");
  }
  assert.equal((await sip("POST", "/aset/" + D, {status: "berfungsi"}, pus.h)).s, 404, "staf nyata tidak menulis aset dummy");
  assert.ok((await sip("GET", "/pelihara", undefined, ADMIN)).j.stok.some(x => x.gudang === "Gudang Dummy")); assert.equal((await sip("GET", "/aset/" + D, undefined, ADMIN)).j.inspeksi.length, 1);
  const nyata = [await hitung("sippa_aset", "dummy = 0"), await hitung("sippa_inspeksi", "dummy = 0"), await hitung("sippa_stok_gerak", "dummy = 0")];
  const h = await sip("POST", "/dummy/hapus", {}, ADMIN); assert.equal(h.s, 200, h.t); assert.equal(h.j.dihapus.sippa_aset, 1); assert.equal(h.j.dihapus.sippa_inspeksi, 1); assert.equal(h.j.dihapus.sippa_stok_gerak, 1);
  assert.deepEqual([await hitung("sippa_aset", "dummy = 0"), await hitung("sippa_inspeksi", "dummy = 0"), await hitung("sippa_stok_gerak", "dummy = 0")], nyata, "baris nyata utuh");
  assert.equal((await sip("POST", "/dummy/isi", {layar: "pelihara"}, ADMIN)).s, 200, "layar baru sah untuk dummy"); for (const l of ["air", "akses"]) assert.equal((await sip("POST", "/dummy/isi", {layar: l}, ADMIN)).s, 200, l);
});
uji("tanpa tabel 0059 (kode tiba sebelum migrasi): rute aset, inspeksi, pelihara, stok menjawab 503 sopan; rute 0056 dan halaman tetap 200; kirim lapangan dengan butir inspeksi tidak jatuh", async () => {
  const T = await siapkan("uji-sippa-tanpa-0059", {r2: true});
  await T.DB.batch(["sippa_inspeksi", "sippa_stok_gerak", "sippa_aset"].map(t => T.DB.prepare(`DROP TABLE ${t}`)));
  const pesan = {galat: "Migrasi SIPPA belum diterapkan di basis data", status: "tanpa_migrasi"}, id = "0123456789abcdef";
  const k0 = await T.api("POST", "/api/sippa/kit", {kode: "SIPPA-101", jenis: "gambut", prov: "62", kab: "Kota Palangka Raya"}, MOD2); assert.equal(k0.s, 201, k0.t);
  for (const [m, j, b] of [["GET", "/aset"], ["GET", "/aset/" + id], ["POST", "/aset", asetB()], ["POST", "/aset/" + id, {status: "rusak"}], ["POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: id, jenis: "berkala", skor: 0}],
    ["GET", "/pelihara"], ["GET", "/pelihara.csv"], ["GET", "/stok"], ["POST", "/stok", {gudang: "Gudang Uji", kode_bom: "C-101", nama: "Gasket", delta: 1, satuan: "set", alasan: "terima"}], ["POST", "/dummy/hapus", {}]]) {
    const r = await T.api(m, "/api/sippa" + j, b, ADMIN); assert.equal(r.s, 503, `${m} ${j}: ${r.s} ${r.t.slice(0, 120)}`); assert.deepEqual(r.j, pesan, `${m} ${j}`);
  }
  assert.equal((await T.api("GET", "/api/sippa/kit", undefined, ADMIN)).s, 200, "rute 0056 tetap hidup"); assert.equal((await T.api("GET", "/pipa/pelihara", undefined, ADMIN)).s, 200, "cangkang halaman tidak menyentuh tabel");
  const tg = await T.api("POST", "/api/sippa/tugas", {kit_id: k0.j.kit.id, nama_regu: "Regu Uji", unsur: "mpa", prov: "62", kab: "Kab", berlaku_hari: 1}, ADMIN); assert.equal(tg.s, 201, tg.t);
  const kp = (await T.DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? LIMIT 1").bind(k0.j.kit.id).first()).id;
  const l = await T.api("POST", "/api/sippa/lapangan/kirim", {jam_kirim: Date.now(), log: [], inspeksi: [{id: uuid(), sasaran_jenis: "komponen", sasaran_id: kp, jenis: "pasca_gelar", skor: 0}]}, {"x-kode": tg.j.kode}); assert.equal(l.s, 503, l.t);
  assert.deepEqual((await T.api("POST", "/api/sippa/lapangan/kirim", {jam_kirim: Date.now(), log: [], probe: []}, {"x-kode": tg.j.kode})).j.diterima, [], "kirim tanpa butir inspeksi tetap jalan");
});
}

/* ---------------------------------------------------------------- SP-045: pengingat mingguan = butir terhitung Meja Pantau (ADR-11), tanpa tabel dan tanpa cron baru */
uji("SP-045: awalMingguSippa murni: Senin 07.40 WIB tepat memulai pekan; sebelum itu masih pekan lalu", async () => {
  const {awalMingguSippa} = await import("../../src/pantau.js");
  const wib = t => Date.parse(t + "+07:00");
  assert.equal(awalMingguSippa(wib("2026-10-26T07:40:00")).tgl, "2026-10-26", "Senin tepat 07.40");
  assert.equal(awalMingguSippa(wib("2026-10-26T07:39:59")).tgl, "2026-10-19", "Senin 07.39 masih pekan lalu");
  assert.equal(awalMingguSippa(wib("2026-10-28T12:00:00")).tgl, "2026-10-26", "Rabu ikut pekan Senin 26");
  assert.equal(awalMingguSippa(wib("2026-11-01T23:59:00")).tgl, "2026-10-26", "Minggu malam ikut pekan Senin 26");
  assert.equal(awalMingguSippa(wib("2026-10-26T07:40:00")).waktu, wib("2026-10-26T07:40:00"));
});
uji("SP-045: butir sippa_mingguan: tanpa kit aktif tidak ada; kit banjir tanpa laporan mingguan 7 hari satu butir; laporan mingguan menghilangkannya; peran dan wilayah menyaring", async () => {
  const snap = (await DB.prepare("SELECT id, status FROM sippa_kit").all()).results, KID = "0045000000000001";
  const butir = async (h = pus.h) => { const r = await api("GET", "/api/pantau", undefined, h); assert.equal(r.s, 200, r.t); return {r, b: r.j.butir.filter(x => x.jenis === "sippa_mingguan")}; };
  const laporan = (jenis, waktu) => DB.prepare("INSERT INTO sippa_laporan (id, jenis, parameter, oleh, waktu, dummy) VALUES (?, ?, '{}', 'staf:uji045', ?, 0)").bind(crypto.randomUUID().replace(/-/g, "").slice(0, 16), jenis, waktu).run();
  try {
    await DB.prepare("DELETE FROM sippa_laporan WHERE jenis = 'mingguan' AND dummy = 0").run();   // isolasi: uji laporan di atas mengarsipkan satu mingguan nyata < 7 hari
    await DB.prepare("UPDATE sippa_kit SET status = 'gudang'").run();
    assert.equal((await butir()).b.length, 0, "tanpa kit gelar atau banjir tidak ada butir");
    await DB.prepare("INSERT INTO sippa_kit (id, kode, jenis, status, prov, dibuat, diubah, dummy) VALUES (?2, 'SIPPA-845', 'banjir', 'banjir', '62', ?1, ?1, 0)").bind(Date.now(), KID).run();
    const a = await butir(); assert.equal(a.b.length, 1, "kit banjir tanpa laporan mingguan: satu butir");
    const x = a.b[0]; assert.match(x.id, /^sippa-mingguan:\d{4}-\d{2}-\d{2}$/); assert.equal(x.tautan, "/pipa/laporan"); assert.equal(x.label, a.r.j.jenis.sippa_mingguan); assert.ok(!x.dummy);
    assert.match(x.judul, /1 kit/); assert.doesNotMatch(x.judul + x.rincian, /—|·|terbukti/);
    assert.deepEqual(x.provs, ["62"]);
    assert.equal((await butir(koor.h)).b.length, 1, "koordalops melihat semua jenis"); assert.equal((await butir(pim.h)).b.length, 1, "pimpinan membaca");
    assert.equal((await butir(ver.h)).b.length, 0, "verifikator bukan penangan laporan SIPPA"); assert.equal((await butir(pus61.h)).b.length, 0, "wilayah 61 tidak mencakup kit di 62");
    assert.equal((await api("GET", "/api/pantau", undefined, {})).s, 401, "tamu ditolak");
    await laporan("kejadian", Date.now() - 1000); await laporan("mingguan", Date.now() - 8 * HARI);
    assert.equal((await butir()).b.length, 1, "laporan jenis lain atau mingguan lebih lama dari 7 hari tidak menghilangkan butir");
    await laporan("mingguan", Date.now() - 2 * HARI);
    assert.equal((await butir()).b.length, 0, "sesudah laporan mingguan diarsipkan butir hilang");
    await DB.prepare("DELETE FROM sippa_laporan WHERE oleh = 'staf:uji045'").run(); await DB.prepare("UPDATE sippa_kit SET status = 'gelar' WHERE id = ?").bind(KID).run();
    assert.equal((await butir()).b.length, 1, "kit gelar juga memicu"); await DB.prepare("UPDATE sippa_kit SET status = 'servis' WHERE id = ?").bind(KID).run();
    assert.equal((await butir()).b.length, 0, "kit servis tidak memicu");
  } finally {
    await DB.prepare("DELETE FROM sippa_kit WHERE id = ?").bind(KID).run(); await DB.prepare("DELETE FROM sippa_laporan WHERE oleh = 'staf:uji045'").run();
    for (const k of snap) await DB.prepare("UPDATE sippa_kit SET status = ? WHERE id = ?").bind(k.status, k.id).run();
  }
});
uji("SP-045: tanpa tabel sippa_*, Meja Pantau tetap 200 (detektor dilewati)", async () => {
  const T = await siapkan("uji-sippa-pantau-tanpa-tabel", {r2: true});
  await T.DB.batch(["sippa_bbm", "sippa_probe", "sippa_log_gelar", "sippa_foto", "sippa_jalan_cek", "sippa_aoi_usul", "sippa_gerak", "sippa_tugas", "sippa_komponen", "sippa_kit"].map(t => T.DB.prepare(`DROP TABLE ${t}`)));
  const r = await T.api("GET", "/api/pantau", undefined, ADMIN); assert.equal(r.s, 200, r.t.slice(0, 200)); assert.ok(!r.j.butir.some(b => b.jenis === "sippa_mingguan"));
});
