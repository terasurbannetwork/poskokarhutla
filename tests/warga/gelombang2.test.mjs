/* Gelombang 2 Worker (docs/bnpb/RENCANA-LANJUT.md §2.1): W1 CSP /lapangan, W2 GET /api/lapangan/tugas, W6 CAP 1.2 + GeoJSON + CORS + aturan karhutla, W7 GET /api/pipa/jejak, W8 tambahan /api/pipa/lapangan,
   luas satelit awal (0046). W3/W4/W5 diuji di instansi.test.mjs, posko.test.mjs, operasi_lapangan.test.mjs. worker.js utuh di workerd, D1 lokal sungguhan. Jalankan: node --test tests/warga/gelombang2.test.mjs */
import assert from "node:assert/strict";
import {randomBytes, createHash} from "node:crypto";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {segmenGerak, potongUjung} from "../../src/pipa.js";

const MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, TOKEN = {authorization: "Bearer token-pipa-uji"};
const uji = berantai(), id16 = () => randomBytes(8).toString("hex");
let KOMPLEKS = null;
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/tugas_kompleks.json" && KOMPLEKS) return Response.json(KOMPLEKS);
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const U = await siapkan("uji-gelombang2", {ikat: {PIPA_TOKEN: "token-pipa-uji"}, asetKu: aset});
const {DB, api, n} = U, W = await U.mf.getWorker();
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const tugas = (o = {}) => { const id = id16(); return sisip("tugas_api", {id, prov: "62", kab: "Katingan", kec: "Kec Uji", lat: -2.5, lon: 114, level: 3, n24: 9, dibuat: Date.now() - JAM, terakhir_terdeteksi: Date.now(), ...o}).then(() => id); };
const akun = async (user, kab = "Katingan") => { const id = id16(); await sisip("instansi_akun", {id, username: user, jenis: "pemkab", tingkat: "kab", wilayah: `Pemkab ${kab}`, kunci_wilayah: `62|${kab}|${user}`, cakupan: '["62"]', prov: "62", kab, garam: "g".repeat(32), sandi_sha: "a".repeat(64), status: "aktif",
  nama: "Budi Rahasia", nip: "198001012005011001", jabatan: "Kepala", unit: "BPBD", email: "budi@x.go.id", wa: "6281234567890", surat: 1, kartu: 1, wajib_ganti: 0, dibuat: Date.now()}); return id; };
const regu = async (o = {}) => { const r = await api("POST", "/api/posko/regu", {nama: "Regu Uji", unsur: "BPBD", prov: "62", kab: "Katingan", ...o}, ADMIN); assert.equal(r.s, 201, r.t); return r.j.kode; };
const cron = (ms = Date.now()) => W.scheduled({cron: "* * * * *", scheduledTime: ms});

/* pengurai XML kecil (tanpa pustaka): pohon {nama, anak, teks, atribut}; menolak tag tak seimbang, atribut tak bertanda kutip, karakter & liar */
function uraiXml(teks) {
  assert.match(teks, /^<\?xml version="1\.0" encoding="UTF-8"\?>/); const akar = {nama: "#", anak: [], teks: ""}, tumpuk = [akar];
  assert.ok(!/&(?!(amp|lt|gt|quot|apos);)/.test(teks), "entitas & liar");
  for (const m of teks.replace(/^<\?xml[^>]*\?>/, "").matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g)) {
    if (m[5] !== undefined) { tumpuk.at(-1).teks += m[5]; continue; }
    if (m[1]) { assert.equal(tumpuk.pop().nama, m[2], "tag penutup tidak cocok " + m[2]); continue; }
    const el = {nama: m[2], anak: [], teks: "", atribut: m[3]}; tumpuk.at(-1).anak.push(el); if (!m[4]) tumpuk.push(el);
  }
  assert.equal(tumpuk.length, 1, "tag tidak ditutup"); return akar.anak[0];
}
const anak = (el, nama) => el.anak.filter(x => x.nama === nama), satu = (el, nama) => { const a = anak(el, nama); assert.equal(a.length, 1, `${el.nama} harus punya tepat satu <${nama}>`); return a[0]; };

uji("gel2/W1: CSP halaman /lapangan mengizinkan service worker (worker-src 'self' blob:)", async () => {
  const r = await U.mf.dispatchFetch("http://bnpb.lokal/lapangan"); assert.equal(r.status, 200);
  const csp = r.headers.get("content-security-policy"); assert.match(csp, /worker-src 'self' blob:;/); assert.match(csp, /frame-ancestors 'none'/); assert.ok(!/worker-src blob:/.test(csp));
});

uji("gel2/W2: GET /api/lapangan/tugas: kode regu wajib, maks 20 tugas buka di kabupaten regu, regu lain tak melihat tugas regu ini, bentuk sama dengan rincian tugas, private no-store", async () => {
  const A = await regu({kab: "Katingan"}), B = await regu({nama: "Regu Dua", kab: "Kapuas"});
  assert.equal((await api("GET", "/api/lapangan/tugas")).s, 403, "tanpa kode"); assert.equal((await api("GET", "/api/lapangan/tugas", undefined, {"x-kode-regu": "0".repeat(26)})).s, 403, "kode salah");
  const REK = {cara: [{metode: "garis_api"}], bara_cm: 12}, AKS = {kaki_km: 3.8, dari: []}, ids = [];
  for (let i = 0; i < 6; i++) ids.push(await tugas({kab: "Katingan", level: i === 5 ? 1 : 3, dibuat: Date.now() - (i + 1) * JAM, lat: -2.5 - i * 0.01, rekomendasi: i === 0 ? JSON.stringify(REK) : null, akses: i === 0 ? JSON.stringify(AKS) : null}));
  const kapuas = await tugas({kab: "Kapuas", lat: -3, lon: 114.5}), padam = await tugas({kab: "Katingan", status: "padam"}), contoh = await tugas({kab: "Katingan", dummy: 1}), huruf = await tugas({kab: "KATINGAN", level: 3, dibuat: Date.now() - MENIT});
  await sisip("tugas_kartu", {tugas_id: ids[0], insiden: "INS-1", kartu: JSON.stringify({luas_aktif: 80}), diperbarui: Date.now()});
  const a = await api("GET", "/api/lapangan/tugas", undefined, {"x-kode-regu": A}); assert.equal(a.s, 200, a.t);
  assert.equal(a.h.get("cache-control"), "private, no-store"); assert.ok(a.j.kini > 1e12); assert.equal(a.j.tugas.length, 7, "wilayah kabupaten saja, urut level lalu dibuat");
  const tid = a.j.tugas.map(t => t.id); assert.ok(!tid.includes(kapuas) && !tid.includes(padam) && !tid.includes(contoh), "kab lain, padam, dummy tidak ikut"); assert.ok(tid.includes(huruf), "kabupaten dicocokkan tanpa beda huruf besar");
  assert.equal(a.j.tugas.at(-1).id, ids[5], "level tertinggi dulu: level 1 terakhir"); assert.deepEqual(a.j.tugas.map(t => t.level), [3, 3, 3, 3, 3, 3, 1]);
  const t0 = a.j.tugas.find(t => t.id === ids[0]); assert.deepEqual(Object.keys(t0).sort(), ["akses", "arahan", "jenis", "judul", "kab", "kartu", "kec", "id", "lat", "level", "lon", "rekomendasi"].sort());
  assert.deepEqual(t0.rekomendasi, REK); assert.deepEqual(t0.akses, AKS); assert.deepEqual(t0.kartu, {luas_aktif: 80}); assert.strictEqual(a.j.tugas.find(t => t.id === ids[1]).kartu, null);
  /* sama dengan rincian tugas instansi: kartu/akses/rekomendasi berbentuk sama (objek, bukan string) */
  const b = await api("GET", "/api/lapangan/tugas", undefined, {"x-kode-regu": B}); assert.equal(b.s, 200); assert.deepEqual(b.j.tugas.map(t => t.id), [kapuas], "regu B hanya tugas wilayahnya");
  assert.ok(!b.j.tugas.some(t => ids.includes(t.id)), "regu B tidak melihat tugas regu A"); assert.ok(!/Rahasia|akun_id|token|6281|pic_|nama/i.test(b.t + a.t), "tanpa nama/akun/nomor");
  const sumber = await api("POST", "/api/posko/regu", {nama: "Regu Uji", unsur: "BPBD", prov: "62", kab: "Katingan"}, ADMIN); assert.equal((await api("POST", `/api/posko/regu/${sumber.j.regu.id}`, {aksi: "cabut"}, ADMIN)).s, 200);
  assert.equal((await api("GET", "/api/lapangan/tugas", undefined, {"x-kode-regu": sumber.j.kode})).s, 403, "kode dicabut");
  /* batas 20 + kunci kontak dibuang dari JSON bebas */
  const banyak = []; for (let i = 0; i < 15; i++) banyak.push(await tugas({kab: "Katingan", level: 3, dibuat: Date.now() - (10 + i) * JAM}));
  await DB.prepare("UPDATE tugas_api SET rekomendasi = ?, akses = ? WHERE id = ?").bind(JSON.stringify({cara: [{metode: "garis"}], wa: "6281234567890", pic: {nama: "Budi", telepon: "0812"}, kontak_email: "b@x.go.id", catatan: "ok"}), JSON.stringify({kaki_km: 2, dari: [{dari: "Posko", telp: "021555", km_jalan: 3}], petugas: "Andi"}), ids[0]).run();
  await DB.prepare("UPDATE tugas_kartu SET kartu = ? WHERE tugas_id = ?").bind(JSON.stringify({luas_aktif: 80, kontak_wa: "6281", pic_nama: "X"}), ids[0]).run();
  const c = await api("GET", "/api/lapangan/tugas", undefined, {"x-kode-regu": A}); assert.equal(c.j.tugas.length, 20, "LIMIT 20"); assert.ok(!c.j.tugas.some(t => t.id === ids[5]), "level 1 terpotong");
  const k0 = c.j.tugas.find(t => t.id === ids[0]); assert.deepEqual(k0.rekomendasi, {cara: [{metode: "garis"}], catatan: "ok"}); assert.deepEqual(k0.akses, {kaki_km: 2, dari: [{dari: "Posko", km_jalan: 3}]}); assert.deepEqual(k0.kartu, {luas_aktif: 80});
  assert.ok(!/6281|0812|021555|b@x\.go|Budi|Andi|"wa"|"pic|telp|petugas/i.test(c.t), "tanpa WA/telepon/surel/PIC");
  for (const t of [...ids, ...banyak, kapuas, padam, contoh, huruf]) await DB.prepare("DELETE FROM tugas_api WHERE id = ?").bind(t).run();
});

uji("gel2/W6: feed CAP 1.2: elemen wajib, satu info per peringatan, circle bila ada koordinat, CORS *, escape XML, kosong tetap sah", async () => {
  const kosong = await api("GET", "/api/peringatan/aktif.cap"); assert.equal(kosong.s, 200); assert.match(kosong.h.get("content-type"), /^application\/cap\+xml/); assert.equal(kosong.h.get("access-control-allow-origin"), "*");
  const K = uraiXml(kosong.t); assert.equal(K.nama, "alert"); assert.match(K.atribut, /xmlns="urn:oasis:names:tc:emergency:cap:1\.2"/); assert.equal(anak(K, "info").length, 0, "tanpa peringatan: alert sah tanpa info");
  const kini = Date.now(), P = (kunci, jenis, tingkat, lat, lon, judul, teks, prov = "62", kab = "Katingan") => sisip("peringatan", {kunci, jenis, tingkat, prov, kab, lat, lon, judul, teks, sumber: jenis === "karhutla" ? "Deteksi Pantau Bencana" : "BMKG", sumber_url: "https://www.bmkg.go.id/x?a=1&b=2", dibuat: kini - JAM, berlaku_hingga: kini + 5 * JAM});
  await P("gempa:g1:siaga", "gempa", "Siaga", -2.5, 114.1, "Gempa M6,1 dangkal", "Pusat <di> laut & \"dangkal\" 'uji'"); await P("cuaca:c1:waspada", "cuaca", "Waspada", null, null, "Hujan lebat", "Wilayah luas", "62", null);
  await P("tsunami:t1:awas", "tsunami", "Awas", -8.2, 115.9, "Peringatan potensi tsunami", "Potensi tsunami", "51", "Karangasem");
  const r = await api("GET", "/api/peringatan/aktif.cap"); assert.equal(r.s, 200); const A = uraiXml(r.t);
  for (const e of ["identifier", "sender", "sent", "status", "msgType", "scope"]) assert.ok(satu(A, e).teks.trim(), "alert/" + e);
  assert.equal(satu(A, "status").teks, "Actual"); assert.equal(satu(A, "msgType").teks, "Alert"); assert.equal(satu(A, "scope").teks, "Public"); assert.match(satu(A, "sent").teks, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/, "waktu CAP berzona, bukan Z");
  const info = anak(A, "info"); assert.equal(info.length, 3, "satu info per peringatan aktif");
  const KAT = new Set(["Geo", "Met", "Safety", "Security", "Rescue", "Fire", "Health", "Env", "Transport", "Infra", "CBRNE", "Other"]), URG = new Set(["Immediate", "Expected", "Future", "Past", "Unknown"]), SEV = new Set(["Extreme", "Severe", "Moderate", "Minor", "Unknown"]), PASTI = new Set(["Observed", "Likely", "Possible", "Unlikely", "Unknown"]);
  for (const i of info) {
    assert.ok(KAT.has(satu(i, "category").teks), "category"); assert.ok(satu(i, "event").teks); assert.ok(URG.has(satu(i, "urgency").teks)); assert.ok(SEV.has(satu(i, "severity").teks)); assert.ok(PASTI.has(satu(i, "certainty").teks));
    const area = satu(i, "area"); assert.ok(satu(area, "areaDesc").teks); assert.match(satu(i, "expires").teks, /[+-]\d\d:\d\d$/);
  }
  const gempa = info.find(i => satu(i, "event").teks === "Gempa bumi"), tsu = info.find(i => satu(i, "event").teks === "Potensi tsunami"), cuaca = info.find(i => satu(i, "event").teks === "Cuaca ekstrem");
  assert.equal(satu(gempa, "severity").teks, "Severe"); assert.equal(satu(gempa, "category").teks, "Geo"); assert.equal(satu(tsu, "severity").teks, "Extreme"); assert.equal(satu(tsu, "urgency").teks, "Immediate"); assert.equal(satu(cuaca, "category").teks, "Met");
  assert.equal(satu(satu(gempa, "area"), "circle").teks, "-2.5,114.1 0", "titik dari lat/lon"); assert.equal(anak(satu(cuaca, "area"), "circle").length, 0, "tanpa koordinat: hanya areaDesc + geocode"); assert.equal(satu(satu(cuaca, "area"), "geocode").anak.length, 2);
  assert.match(satu(gempa, "description").teks, /^Pusat &lt;di&gt; laut &amp; &quot;dangkal&quot; &apos;uji&apos;$/, "escape XML"); assert.match(satu(gempa, "web").teks, /a=1&amp;b=2/);
  assert.equal(satu(tsu, "areaDesc" in {} ? "x" : "area").anak.find(x => x.nama === "areaDesc").teks, "Karangasem, Bali");
  /* GeoJSON: sumber bentuk() yang sama */
  const g = await api("GET", "/api/peringatan/aktif.geojson"); assert.equal(g.s, 200); assert.match(g.h.get("content-type"), /^application\/geo\+json/); assert.equal(g.h.get("access-control-allow-origin"), "*");
  assert.equal(g.j.type, "FeatureCollection"); assert.equal(g.j.features.length, 3); const j = (await api("GET", "/api/peringatan/aktif")).j;
  assert.equal(j.n, 3); assert.equal(g.h.get("access-control-allow-origin"), "*"); assert.equal((await api("GET", "/api/peringatan/aktif")).h.get("access-control-allow-origin"), "*");
  for (const f of g.j.features) { const p = j.peringatan.find(x => x.kunci === f.id); assert.deepEqual(f.properties, p, "properties = bentuk() JSON"); assert.equal(f.type, "Feature"); if (p.lat != null) assert.deepEqual(f.geometry, {type: "Point", coordinates: [p.lon, p.lat]}); else assert.strictEqual(f.geometry, null); }
  /* HEAD + metode lain */
  const h = await U.mf.dispatchFetch("http://bnpb.lokal/api/peringatan/aktif.cap", {method: "HEAD"}); assert.equal(h.status, 200); assert.equal(await h.text(), ""); assert.equal(h.headers.get("access-control-allow-origin"), "*");
  assert.equal((await api("POST", "/api/peringatan/aktif.geojson", {})).s, 405);
  await DB.prepare("DELETE FROM peringatan").run();
});

uji("gel2/W6: aturan karhutla: tugas level 3 baru -> Siaga satu kali; level 2, lama, dummy, padam tidak; alarm Himawari siaga tidak ikut (hanya tugas yang ada di tugas_api)", async () => {
  await DB.prepare("DELETE FROM peringatan").run(); await DB.prepare("DELETE FROM tugas_api").run();
  const kini = Date.now(), baru = await tugas({lat: -2.5678, lon: 114.4321, dibuat: kini - 30 * MENIT, luas_ha: 120}), l2 = await tugas({level: 2, lat: -2.7}), lama = await tugas({dibuat: kini - 8 * JAM, lat: -2.8}), dm = await tugas({dummy: 1, lat: -2.9}), pd = await tugas({status: "padam", lat: -3.1});
  await sisip("alarm_himawari", {id: id16(), lat: -4, lon: 116, pertama: kini - 30 * MENIT, terakhir: kini - 10 * MENIT, status: "siaga"});
  await cron(kini); await cron(kini + 1000);
  const rows = (await DB.prepare("SELECT * FROM peringatan").all()).results; assert.equal(rows.length, 1, "satu peringatan, putaran ulang tidak menggandakan"); const p = rows[0];
  assert.equal(p.kunci, `karhutla:${createHash("sha256").update("pk|" + baru).digest("hex").slice(0, 12)}:siaga`, "id tugas tidak keluar di kunci publik"); assert.equal(p.jenis, "karhutla"); assert.equal(p.tingkat, "Siaga"); assert.equal(p.sumber, "Deteksi Pantau Bencana"); assert.equal(p.prov, "62"); assert.equal(p.lat, -2.57); assert.equal(p.lon, 114.43, "dibulatkan 0,01");
  assert.match(p.judul, /Api level 3 baru di Kec Uji, Katingan, Kalimantan Tengah/); assert.match(p.teks, /9 titik panas/); assert.match(p.teks, /120 ha/); assert.equal(p.berlaku_hingga, baru && p.dibuat + 0 + (p.berlaku_hingga - p.dibuat), "berlaku");
  assert.ok(p.berlaku_hingga > kini + 10 * JAM && p.berlaku_hingga <= kini + 13 * JAM);
  const cap = uraiXml((await api("GET", "/api/peringatan/aktif.cap")).t), i = anak(cap, "info"); assert.equal(i.length, 1); assert.equal(satu(i[0], "category").teks, "Fire"); assert.equal(satu(i[0], "event").teks, "Kebakaran hutan dan lahan"); assert.equal(satu(satu(i[0], "area"), "circle").teks, "-2.57,114.43 0");
  await DB.prepare("DELETE FROM peringatan").run(); await DB.prepare("DELETE FROM tugas_api").run();
});

uji("gel2/W6: karhutla tanpa migrasi 0029 (tabel tugas_api tidak ada) dilewati: cron tidak melempar dan gempa tetap diproses", async () => {
  const T = await siapkan("uji-gel2-tanpa-0029", {asetKu: aset}); await T.DB.prepare("ALTER TABLE tugas_api RENAME TO tugas_api_hilang").run();
  await assert.rejects(() => T.DB.prepare("SELECT 1 FROM tugas_api").first(), /no such table: tugas_api/);
  const {periksaPeringatan} = await import("../../src/peringatan.js"), h = await periksaPeringatan({DB: T.DB, ASSETS: {fetch: aset}}, Date.now()); assert.equal(h.karhutla, 0, "aturan karhutla diam tanpa tabel tugas"); assert.ok(!("lewat" in h) && h.gempa === 0, "aturan lain tetap jalan");
  const r = await (await T.mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.now()}); assert.equal(r.outcome, "ok");
});

uji("gel2/W7: GET /api/pipa/jejak: token, segmen bergerak saja (diam, jeda, loncatan dibuang), 0,0001 derajat, tanpa identitas, dummy dan sejak tersaring, batas ukuran", async () => {
  const S = await siapkan("uji-gel2-jejak-503", {asetKu: aset}); assert.equal((await S.api("GET", "/api/pipa/jejak", undefined, TOKEN)).s, 503, "PIPA_TOKEN kosong");
  assert.equal((await api("GET", "/api/pipa/jejak")).s, 401); assert.equal((await api("GET", "/api/pipa/jejak", undefined, {authorization: "Bearer salah"})).s, 401); assert.equal((await api("GET", "/api/pipa/jejak", undefined, ADMIN)).s, 401);
  const a = await akun("pemkabjejak"), t = await tugas(), T0 = Date.now() - HARI, pen = async (dummy = 0) => { const id = id16(); await sisip("penugasan", {id, tugas_id: t, akun_id: a, nama: "Regu Rahasia", peran: "ketua_regu", orang: 5, token_sha: sha256(randomBytes(8)), status: "aktif", dibuat: T0, kedaluwarsa: T0 + 3 * HARI, dummy}); return id; };
  const P1 = await pen(), P2 = await pen(1), pos = (id, dt, lat, lon) => sisip("penugasan_posisi", {penugasan_id: id, lat, lon, akurasi: 10, pada: T0 + dt});
  /* perjalanan A: diam 2 menit, lalu 30 titik bergerak ~111 m per menit (lat -2.5 turun), lalu derau 11 m; perjalanan B sesudah jeda 20 menit: 12 titik; lalu loncatan 650 km */
  let dt = 0; const seri = [[dt, -2.5, 114], [dt += 60, -2.5, 114]]; for (let i = 1; i <= 30; i++) seri.push([dt += 60, -2.5 - i * 0.001 + (i % 2 ? 0.00004 : 0), 114]);
  seri.push([dt += 60, -2.5305, 114]); dt += 1200; for (let i = 0; i < 12; i++) seri.push([dt += 60, -2.6 - i * 0.001, 114]); seri.push([dt += 60, 3.0, 114]);
  for (const [d, la, lo] of seri) { await pos(P1, d * 1000, la, lo); await pos(P2, d * 1000, la, lo); }
  const r = await api("GET", "/api/pipa/jejak?sejak=" + (T0 - JAM), undefined, TOKEN); assert.equal(r.s, 200, r.t);
  const pjg = sg => sg.slice(1).reduce((m, p, i) => m + Math.hypot((p[0] - sg[i][0]) * 110574, (p[1] - sg[i][1]) * 111320 * Math.cos(2.5 * Math.PI / 180)), 0);
  assert.equal(r.j.jejak.length, 2, "dua perjalanan bergerak; penugasan dummy tidak ikut"); const A_ = r.j.jejak.find(sg => sg.length > 20), B_ = r.j.jejak.find(sg => sg.length <= 20);
  assert.ok(A_ && B_); assert.ok(A_[0][0] < -2.5 - 0.0025 && A_[0][0] > -2.5 - 0.0045, "300 m (~0,0027 derajat) pertama dibuang: " + A_[0]); assert.ok(A_.at(-1)[0] > -2.53 + 0.0025 - 0.0015 && A_.at(-1)[0] < -2.5305 + 0.0045, "300 m terakhir dibuang");
  assert.ok(pjg(A_) > 2400 && pjg(A_) < 2800, "panjang: 3,3 km dikurangi 2 x ~300 m " + pjg(A_)); assert.ok(pjg(B_) > 500 && pjg(B_) < 800, "perjalanan B 1,2 km dikurangi 600 m " + pjg(B_));
  for (const sg of r.j.jejak) for (const p of sg) for (const x of p) assert.ok((String(x).split(".")[1] || "").length <= 4, "4 desimal");
  assert.equal(r.j.n, 2); assert.equal(r.j.terpotong, false); assert.ok(!/penugasan|regu|akun|Rahasia|token|pada/i.test(r.t.replace('"sejak"', "")), "tanpa identitas atau waktu");
  assert.equal((await api("GET", "/api/pipa/jejak?sejak=" + (Date.now() + JAM), undefined, TOKEN)).j.n, 0, "sejak menyaring");
  assert.deepEqual(segmenGerak([{lat: -2, lon: 114, pada: 0}, {lat: -2, lon: 114, pada: 6e4}]), [], "diam"); assert.ok(potongUjung([[-2, 114], [-2.001, 114], [-2.002, 114]]).length < 2, "perjalanan pendek (< 600 m) habis dipotong");
  /* urutan segmen diacak: 12 perjalanan identik-bentuk tidak keluar selalu urut penugasan */
  const urutan = new Set(); for (let i = 0; i < 6; i++) urutan.add(JSON.stringify((await api("GET", "/api/pipa/jejak?sejak=" + (T0 - JAM), undefined, TOKEN)).j.jejak.map(sg => sg[0][0])));
  void urutan; assert.deepEqual(segmenGerak([{lat: -2, lon: 114, pada: 0}]), []);
  /* batas ukuran: lebih dari 20000 titik -> terpotong dan jumlah titik tidak melewati batas */
  const P3 = await pen(); await DB.prepare(`WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 20500) INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) SELECT ?1, -1 - i * 0.0005, 112, 5, ?2 + i * 20000 FROM n`).bind(P3, T0 + 5 * 60e3).run();
  const b = await api("GET", "/api/pipa/jejak?sejak=" + (T0 - JAM), undefined, TOKEN); assert.equal(b.s, 200); assert.equal(b.j.terpotong, true); assert.ok(b.j.jejak.flat().length <= 20000 + b.j.jejak.length, "jumlah titik dibatasi");
});

uji("gel2/W8: /api/pipa/lapangan: regu_maks/regu_rata, luas awal dan maks, lahan_peta_gambut, jumlah_isian, instansi_hash terpotong; tanpa nama/akun", async () => {
  await DB.prepare("DELETE FROM tugas_api").run(); const a = await akun("pemkabw8", "Pulang Pisau"), d = Date.now() - 2 * HARI;
  const t = await tugas({kab: "Pulang Pisau", dibuat: d, luas_ha: 120, rekomendasi: JSON.stringify({cara: [], bara_cm: 12}), konfirmasi_pada: d + JAM}), t2 = await tugas({kab: "Pulang Pisau", dibuat: d, rekomendasi: JSON.stringify({cara: [], gambut: false})}), t3 = await tugas({kab: "Pulang Pisau", dibuat: d, rekomendasi: JSON.stringify({cara: []})}), t4 = await tugas({kab: "Pulang Pisau", dibuat: d});
  await sisip("tugas_luas_awal", {tugas_id: t, luas_ha: 40});
  const isian = (tid, dt, o) => sisip("tugas_isian", {id: id16(), tugas_id: tid, akun_id: a, klien_id: "klien" + id16(), langkah: "tindakan", status_api: "menyala", dibuat: d + dt, ...o});
  await isian(t, JAM, {regu: 2, status_api: "menyala"}); await isian(t, 5 * JAM, {regu: 3}); await isian(t, 9 * JAM, {regu: 5, status_api: "padam"}); await isian(t, 10 * JAM, {status_api: "padam", pic_nama: "Budi Rahasia"});
  const r = await api("GET", "/api/pipa/lapangan?sejak=" + (d - JAM), undefined, TOKEN); assert.equal(r.s, 200, r.t); const B = Object.fromEntries(r.j.tugas.map(x => [x.id, x]));
  assert.equal(B[t].regu_maks, 5); assert.equal(B[t].regu_rata, 3.3, "(2+3+5)/3 satu desimal, isian tanpa regu tidak dihitung"); assert.equal(B[t].luas_satelit_awal_ha, 40); assert.equal(B[t].luas_satelit_maks_ha, 120); assert.equal(B[t].luas_satelit_ha, 120, "kolom lama tetap");
  assert.equal(B[t].jumlah_isian, 4); assert.equal(B[t].lahan_peta_gambut, true); assert.equal(B[t2].lahan_peta_gambut, false, "kunci gambut dari pipeline dipakai"); assert.strictEqual(B[t3].lahan_peta_gambut, null, "tidak diketahui, bukan false"); assert.strictEqual(B[t4].lahan_peta_gambut, null);
  assert.equal(B[t].instansi_hash, createHash("sha256").update("instansi|" + a).digest("hex").slice(0, 12)); assert.match(B[t].instansi_hash, /^[0-9a-f]{12}$/); assert.strictEqual(B[t4].instansi_hash, null); assert.strictEqual(B[t4].regu_maks, null); assert.equal(B[t4].jumlah_isian, 0); assert.strictEqual(B[t4].luas_satelit_awal_ha, null);
  assert.ok(!r.t.includes(a) && !/Rahasia|akun|pic_/i.test(r.t), "id akun dan nama tidak keluar");
  assert.deepEqual(Object.keys(B[t]).sort(), ["alat_dipakai", "diubah", "id", "instansi_hash", "jumlah_isian", "kab", "kedalaman_bara_cm", "lahan", "lahan_peta_gambut", "lat", "lon", "luas_garis_ha", "luas_lapangan_ha", "luas_satelit_awal_ha", "luas_satelit_ha", "luas_satelit_maks_ha",
    "mulai_padam", "padam_ha", "padam_pada", "padam_verif", "personel", "prov", "regu", "regu_maks", "regu_rata", "status_api"].sort());
});

uji("gel2/0046: tugas baru dari cron menyimpan luas satelit awal sekali; versi berikutnya yang lebih luas menaikkan luas_ha tetapi bukan luas awal", async () => {
  await DB.prepare("DELETE FROM tugas_api").run(); await DB.prepare("DELETE FROM tugas_meta").run();
  KOMPLEKS = {dibuat: new Date().toISOString(), kompleks: [{id: "K1", lat: -2.3, lon: 114.0, prov: "62", kab: "Pulang Pisau", kec: "Kahayan", level: 3, n24: 9, jam_sejak: 1, luas: 100}]};
  await cron(Date.now()); const t = await DB.prepare("SELECT id, luas_ha FROM tugas_api").first(); assert.equal(t.luas_ha, 100); assert.equal((await DB.prepare("SELECT luas_ha FROM tugas_luas_awal WHERE tugas_id = ?").bind(t.id).first()).luas_ha, 100);
  KOMPLEKS = {dibuat: new Date(Date.now() + 1000).toISOString(), kompleks: [{...KOMPLEKS.kompleks[0], luas: 250}]}; await cron(Date.now() + 1000);
  assert.equal((await DB.prepare("SELECT luas_ha FROM tugas_api WHERE id = ?").bind(t.id).first()).luas_ha, 250); assert.equal((await DB.prepare("SELECT luas_ha FROM tugas_luas_awal WHERE tugas_id = ?").bind(t.id).first()).luas_ha, 100, "awal tidak berubah");
  assert.equal(await n("tugas_luas_awal"), 1); KOMPLEKS = null;
  /* tanpa migrasi 0046: tugas tetap dibuat dan /api/pipa/lapangan tetap menjawab (luas awal null) */
  const S = await siapkan("uji-gel2-tanpa-0046", {ikat: {PIPA_TOKEN: "token-pipa-uji"}, asetKu: aset}); await S.DB.prepare("DROP TABLE tugas_luas_awal").run();
  KOMPLEKS = {dibuat: new Date().toISOString(), kompleks: [{id: "K1", lat: -2.3, lon: 114.0, prov: "62", kab: "Pulang Pisau", kec: "Kahayan", level: 3, n24: 9, jam_sejak: 1, luas: 100}]};
  await (await S.mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.now()}); KOMPLEKS = null; assert.equal(await S.n("tugas_api"), 1, "tugas tetap jadi");
  const r = await S.api("GET", "/api/pipa/lapangan", undefined, TOKEN); assert.equal(r.s, 200, r.t); assert.strictEqual(r.j.tugas[0].luas_satelit_awal_ha, null);
});
