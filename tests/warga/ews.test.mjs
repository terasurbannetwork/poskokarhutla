/* Peringatan Dini (EWS): src/worker.js + src/ews.js di workerd (Miniflare) dengan D1 lokal sungguhan, migrasi apa adanya.
   Tidak ada mock DB. Hanya fetch KELUAR yang dijawab fixture (outboundService): Resend (dicatat di `surat`) dan BMKG autogempa.
   Aset statis: data bahaya (fwi, status banjir, peringatan, rob) dari fixture yang tanggalnya diikuti jam cron; provinsi & pusat kecamatan asli.
   Waktu cron diatur lewat scheduledTime (T0 = 10.00 WIB, 30 hari lalu), jadi hari "hari ini" tetap dan tidak tergantung jam uji dijalankan.
   Jalankan: node --test tests/warga/ews.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import * as E from "../../src/ews.js";   // ews.js diimpor PERTAMA dan sendirian: dulu melempar (siklus dengan worker.js)
import {emailPeringatan, emailKonfirmasi, emailGempa, kataPeluang} from "../../src/ews_email.js";

const MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM;
const wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
const tambah = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * HARI).toISOString().slice(0, 10);
const T0 = Date.parse(new Date(Date.now() - 30 * HARI).toISOString().slice(0, 10) + "T03:00:00Z");   // 10.00 WIB, 30 hari lalu

/* ---- fixture ---- */
const surat = [];            // semua body POST ke Resend
let gempa = null;            // jawaban BMKG autogempa
let resendGagal = false;
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname === "challenges.cloudflare.com") { const f = await req.formData(); return Response.json({success: f.get("secret") === "rahasia-ts" && f.get("response") === "lolos"}); }
  if (u.hostname === "api.resend.com") {
    const b = await req.json();
    if (resendGagal) return new Response("gagal", {status: 500});
    /* kunci terkirim harus SUDAH tercatat saat surat keluar (catat dulu, kirim kemudian) */
    if (b.headers && DB) { const l = await DB.prepare("SELECT id FROM ews_langganan WHERE email = ?").bind(b.to[0]).first(); b.tercatat = l ? (await DB.prepare("SELECT count(*) n FROM ews_terkirim WHERE langganan_id = ?").bind(l.id).first()).n : -1; }
    surat.push({...b, auth: req.headers.get("authorization")}); return Response.json({id: "x" + surat.length});
  }
  if (u.hostname === "data.bmkg.go.id") return gempa ? Response.json(gempa) : new Response("tidak ada", {status: 503});
  return new Response("diblok di uji", {status: 599});
};
const fx = {};
let kecKunci = null;         // "prov|kab|kec" Palangka Raya, diisi setelah langganan pertama
/* jejak_api.json: satu kompleks K0012 (Palangka Raya); o = {24: [[km, p], ...], 48: ..., 72: ...} sel di utara PAL sejauh km */
const jejakFx = (o, acuan, id = "K0012", nama = "Kec. Pahandut, Kota Palangka Raya", extra = {}, atas = {}) => ({dibuat: new Date(acuan + 8 * JAM).toISOString(), acuan: new Date(acuan).toISOString(), status: "ok", model: "uji", sumber: "uji", ambang_p: 0.05,
  cakupan: {n_aktif: 10, n_diramal: 8, dilewati: {}}, ...atas,
  kompleks: [{id, nama, prov: "62", lat: -2.2, lon: 113.9, titik_24j: 3, p_lepas: 0.5, ...extra, hari: [24, 48, 72].map(jam => ({jam, p_maks: 0.5, luas_p50_ha: 10, sel: (o[jam] || []).map(([k, p]) => [-2.21 + k / 111.2, 113.92, p])}))}]});
function muat(t, o = {}) {   // data bahaya untuk hari WIB dari waktu t
  const h = i => tambah(wib(t), i);
  fx.fwi = {sel: 0.5, hari_ini: h(0), grid: [{lat: -2.25, lon: 114.0, prov: "62", hari: [0, 1, 2].map(i => ({tgl: h(i), fwi: [o.f0 ?? 3, o.f1 ?? 9, o.f2 ?? 3][i]}))}]};
  fx.status = {hari: [0, 1, 2, 3].map(h), kec: kecKunci && !o.tanpaBanjir ? {[kecKunci]: {b: o.b ?? [0, 2, 0, 0], l: o.l ?? [0, 0, 0, 0]}} : {}};
  fx.peringatan = {dibuat: new Date(t).toISOString(), nowcast: o.cuaca || []};
  fx.rob = {dibuat: new Date(t).toISOString(), hari: [0, 1, 2].map(h), titik: o.rob || []};
  fx.jejak = o.tanpaJejak ? null : jejakFx(o.jejak || {}, o.jejakAcuan ?? t - 6 * JAM);
}
const aset = async req => {
  const p = new URL(req.url).pathname;
  const peta = {"/data/fwi.json": fx.fwi, "/banjir/data/status.json": fx.status, "/data/peringatan.json": fx.peringatan, "/banjir/data/rob.json": fx.rob, "/data/jejak_api.json": fx.jejak};
  if (p === "/data/jejak_api.json" && !fx.jejak) return new Response("tidak ada", {status: 404});
  if (peta[p]) return Response.json(peta[p]);
  const f = path.join(AKAR, "public", decodeURIComponent(p));
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !f.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const opsi = (nama, ikat = {}) => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
  compatibilityDate: "2024-09-23", d1Databases: {DB: nama}, bindings: {IP_SALT: "garam-uji", TURNSTILE_SITEKEY: "kunci-situs", TURNSTILE_SECRET: "rahasia-ts", EMAIL_API_KEY: "kunci-resend", EMAIL_FROM: "Pantau Bencana <peringatan@contoh.id>", ...ikat},
  serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});

let mf, DB, mf2, DB2, mf3, DB3, mf4, DB4, mf5, DB5;
before(async () => {
  muat(T0);
  mf = new Miniflare(opsi("uji-ews")); DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  mf2 = new Miniflare(opsi("uji-ews-resenddev", {TURNSTILE_SITEKEY: "", TURNSTILE_SECRET: "", EMAIL_FROM: "Pantau Bencana <onboarding@resend.dev>"})); DB2 = await mf2.getD1Database("DB");
  await DB2.batch(pecah(migrasi()).map(s => DB2.prepare(s)));
  mf3 = new Miniflare(opsi("uji-ews-tanpats", {TURNSTILE_SITEKEY: "", TURNSTILE_SECRET: ""}));   // email aktif, Turnstile tidak dipasang
  DB3 = await mf3.getD1Database("DB"); await DB3.batch(pecah(migrasi()).map(s => DB3.prepare(s)));
  // kelompok 20 (produksi 200): uji "> 2 kelompok" cukup 45 pelanggan
  mf4 = new Miniflare(opsi("uji-ews-giliran", {EWS_MAKS_EMAIL: "2", EWS_CHUNK: "20"})); DB4 = await mf4.getD1Database("DB");
  await DB4.batch(pecah(migrasi()).map(s => DB4.prepare(s)));
  mf5 = new Miniflare(opsi("uji-ews-simulasi")); DB5 = await mf5.getD1Database("DB");
  await DB5.batch(pecah(migrasi()).map(s => DB5.prepare(s)));
});
after(async () => { await mf?.dispose(); await mf2?.dispose(); await mf3?.dispose(); await mf4?.dispose(); await mf5?.dispose(); });
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});

let n = 0; const ipBaru = () => `10.20.${Math.floor(++n / 250)}.${n % 250}`;
const panggil = async (metode, jalur, body, ip = ipBaru(), h = {}, w = mf) => {
  const r = await w.dispatchFetch("http://warga.lokal" + jalur, {method: metode, redirect: "manual", headers: {"cf-connecting-ip": ip, "content-type": "application/json", ...h}, body: body && JSON.stringify(body)});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
};
const cron = async (isi, t, w = mf) => (await w.getWorker()).scheduled({cron: isi, scheduledTime: new Date(t)});
const JAM_CRON = "17 * * * *", CRON_GEMPA = E.CRON_GEMPA;   // cron gempa bersama src/gempa.js (tiap menit)
const sampai = async (fn, ms = 4000) => { const m = Date.now(); while (Date.now() - m < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 40)); } return false; };
const untuk = (email, daftar = surat) => daftar.filter(s => s.to.includes(email));
const ASAL = "https://centurisk97.id";
const tokenDari = s => s.html.match(/\/ews\/konfirmasi\?t=([0-9a-f]{32})/)[1];
const baris = async (email, db = DB) => db.prepare("SELECT * FROM ews_langganan WHERE email = ?").bind(email).first();

const PAL = {lat: -2.21, lon: 113.92};     // Palangka Raya (darat, Kalteng)
const ACEH = {lat: 5.55, lon: 95.32};      // Banda Aceh
const PAPUA = {lat: -2.53, lon: 140.72};   // Jayapura
const sub = (email, lokasi, bencana, waspada = false, tambahan = {}) => ({email, ...lokasi, akurasi: 20, bencana, waspada, turnstile: "lolos", ...tambahan});
/* daftar + klik konfirmasi; mengembalikan token */
async function daftarAktif(isian, w = mf) {
  const awal = untuk(isian.email).length, r = await panggil("POST", "/api/ews/langganan", isian, ipBaru(), {}, w);
  assert.equal(r.s, 202, r.t);
  assert.ok(await sampai(() => untuk(isian.email).length > awal), "email konfirmasi tidak terkirim");
  const token = tokenDari(untuk(isian.email).at(-1)), k = await panggil("POST", "/ews/konfirmasi?t=" + token, undefined, ipBaru(), {}, w);
  assert.equal(k.s, 200, k.t); assert.equal(k.j.ok, true);
  return {token, wilayah: r.j.wilayah};
}

/* ================= fungsi murni ================= */
uji("nilaiTitik: ambang karhutla, titik panas, banjir/longsor, cuaca, rob", () => {
  const h0 = "2026-10-20", kini = Date.parse("2026-10-20T03:00:00Z");
  const dasar = {kini, fwi: {grid: [{lat: -2.25, lon: 114.0, hari: [{tgl: h0, fwi: 6.9}, {tgl: tambah(h0, 1), fwi: 7}, {tgl: tambah(h0, 2), fwi: 14}]}]}, titik: [], cuaca: [], status: null, rob: null};
  const f = (d, lat = -2.21, lon = 113.92, kunci = "") => E.nilaiTitik({...dasar, ...d}, lat, lon, kunci, h0);
  assert.deepEqual(f({}).map(p => [p.bencana, p.tingkat, p.hari]), [["karhutla", 2, 2], ["karhutla", 1, 1]], "FWI 6,9 tidak dihitung; 7 = Waspada; 14 = Siaga");
  assert.equal(f({}, -2.21, 120.0).length, 0, "sel FWI terdekat > 0,5 derajat = tidak tercakup");
  /* titik panas: 4 km => Awas hari ini, 10 km => Siaga, 20 km => tidak ada; titik lama (> 24 jam) sudah disaring muatData */
  const dekat = km => [[-2.21 + km / 111.2, 113.92, kini]];
  assert.equal(f({titik: dekat(4)}).find(p => p.hari === 0).tingkat, 3);
  assert.equal(f({titik: dekat(10)}).find(p => p.hari === 0).tingkat, 2);
  assert.equal(f({titik: dekat(20)}).filter(p => p.hari === 0).length, 0);
  const status = {hari: [h0, tambah(h0, 1), tambah(h0, 2), tambah(h0, 3)], kec: {"62|Kota|Pahandut": {b: [0, 1, 3, 3], l: [2, 0, 0, 0]}}};
  const bl = f({fwi: null, status}, -2.21, 113.92, "62|Kota|Pahandut").map(p => `${p.bencana}${p.tingkat}h${p.hari}`);
  assert.deepEqual(bl.sort(), ["banjir1h1", "banjir3h2", "longsor2h0"], "hari ke-3 (index 3) di luar jendela 0..2");
  assert.deepEqual(f({fwi: null, status}, -2.21, 113.92, "99|X|Y"), [], "kecamatan lain tidak ikut");
  /* cuaca: poligon memuat titik; Severe = 3; di luar poligon / sudah selesai / mulai > 24 jam lagi = tidak */
  const poli = [[[113.8, -2.3], [114.0, -2.3], [114.0, -2.1], [113.8, -2.1], [113.8, -2.3]]];
  const iso = t => new Date(t).toISOString();
  const w = (o = {}) => ({event: "Hujan Lebat", severity: "Severe", headline: "Hujan lebat Kalteng", polygon: poli, mulai: iso(kini - JAM), selesai: iso(kini + 2 * JAM), ...o});
  assert.deepEqual(f({fwi: null, cuaca: [w()]}).map(p => [p.bencana, p.tingkat]), [["cuaca", 3]]);
  assert.equal(f({fwi: null, cuaca: [w({severity: "Moderate"})]})[0].tingkat, 2);
  assert.equal(f({fwi: null, cuaca: [w({severity: "Minor"})]})[0].tingkat, 1);
  assert.equal(f({fwi: null, cuaca: [w()]}, -2.21, 115.0).length, 0, "di luar poligon");
  assert.equal(f({fwi: null, cuaca: [w({selesai: iso(kini - 60e3)})]}).length, 0, "sudah selesai");
  assert.equal(f({fwi: null, cuaca: [w({mulai: iso(kini + 30 * JAM), selesai: iso(kini + 33 * JAM)})]}).length, 0, "mulai > 24 jam lagi");
  assert.equal(f({fwi: null, cuaca: [w({polygon: poli[0]})]}).length, 1, "cincin tunggal (tanpa pembungkus) juga dipahami");
  /* rob: titik terdekat <= 10 km, lv sejajar rob.hari */
  const rob = {hari: [h0, tambah(h0, 1), tambah(h0, 2)], titik: [{lat: -2.21, lon: 113.99, kec: "Kahayan", kab: "Pulang Pisau", lv: [0, 2, 1]}]};
  assert.deepEqual(f({fwi: null, rob}).map(p => [p.bencana, p.tingkat, p.hari]), [["rob", 2, 1], ["rob", 1, 2]]);
  assert.equal(f({fwi: null, rob}, -2.21, 114.2).length, 0, "titik rob > 10 km");
  assert.ok(f({}).every(p => p.kunci === `${p.bencana}|${tambah(h0, p.hari)}|${p.tingkat}` && p.sumber && p.judul), "kunci dedupe memuat bencana, tanggal, tingkat");
});

uji("gempa: radius menurut magnitudo, tsunami dari kata Potensi, jarak", () => {
  assert.deepEqual([3.9, 4, 5, 6, 7.5].map(E.radiusGempa), [0, 50, 150, 300, 500]);
  assert.equal(E.berpotensiTsunami("Tidak berpotensi tsunami"), false);
  assert.equal(E.berpotensiTsunami("Gempa ini berpotensi tsunami untuk diteruskan pada masyarakat"), true);
  assert.equal(E.berpotensiTsunami("TIDAK BERPOTENSI TSUNAMI"), false);
  assert.equal(E.berpotensiTsunami(""), false);
  const g = {lat: 5.2, lon: 95.0, mag: 6.1, potensi: "Tidak berpotensi tsunami"};
  assert.equal(E.nilaiGempa(g, ACEH.lat, ACEH.lon).gempa, 3, "M6,1 dalam radius/3 = Awas");
  assert.equal(E.nilaiGempa({...g, mag: 5.5}, ACEH.lat, ACEH.lon).gempa, 2, "M5,5 dalam 150 km = Siaga");
  assert.equal(E.nilaiGempa({...g, mag: 3.5}, ACEH.lat, ACEH.lon).gempa, 0, "M < 4 tidak terasa");
  assert.equal(E.nilaiGempa(g, PAPUA.lat, PAPUA.lon).gempa, 0, "gempa Aceh tidak terasa di Papua");
  assert.equal(E.nilaiGempa({...g, potensi: "Berpotensi tsunami"}, PAPUA.lat, PAPUA.lon).tsunami, 0, "tsunami hanya <= 500 km");
  assert.equal(E.nilaiGempa({...g, potensi: "Berpotensi tsunami"}, ACEH.lat, ACEH.lon).tsunami, 3);
  assert.equal(E.uraiGempa({Infogempa: {gempa: {DateTime: "bukan tanggal", Coordinates: "1,2", Magnitude: "5"}}}), null);
  assert.equal(E.uraiGempa({}), null);
  assert.equal(E.emailAktif({EMAIL_API_KEY: "k", EMAIL_FROM: "A <a@contoh.id>"}), true);
  assert.equal(E.emailAktif({EMAIL_API_KEY: "k", EMAIL_FROM: "A <onboarding@resend.dev>"}), false);
  assert.equal(E.emailAktif({EMAIL_FROM: "A <a@contoh.id>"}), false);
});

uji("email: HTML aman, tata letak tabel, kalimat biasa, angka id-ID", () => {
  const w = {prov: "62", kab: "Kota <b>Palangka</b>", kec: 'Pahandut "X"'};
  const ps = [{bencana: "banjir", tingkat: 2, hari: 1, judul: "j", rincian: "<script>alert(1)</script>", sumber: "s"}, {bencana: "karhutla", tingkat: 1, hari: 0, judul: "k", rincian: "", sumber: "s"}];
  const a = emailPeringatan({asal: "https://contoh.id", lat: -2.21, lon: 113.92, wilayah: w, peringatan: ps, tautanBerhenti: "https://contoh.id/ews/berhenti?t=abc"});
  assert.match(a.subject, /^Siaga banjir besok di Kec\. Pahandut/);
  assert.ok(!/[A-Z]{5,}/.test(a.subject), "subjek bukan huruf kapital semua");
  assert.ok(!a.html.includes("<script>") && !a.html.includes("<b>Palangka"), "data di-escape");
  assert.ok(a.html.includes("https://contoh.id/img/bencana-banjir.jpg") && a.html.includes('alt="Banjir"'), "gambar hero mutlak, ada alt");
  assert.ok(!/display:\s*(flex|grid)/.test(a.html) && a.html.includes("<table"), "tabel, bukan flex/grid");
  assert.ok(a.html.includes("Hari ini") && a.html.includes("Lusa") && a.html.includes("Yang perlu Anda lakukan") && a.html.includes("Berhenti berlangganan"));
  assert.ok(a.html.includes("https://contoh.id/peringatan?lat=-2.21&amp;lon=113.92") || a.html.includes("https://contoh.id/peringatan?lat=-2.21&lon=113.92"));
  assert.match(a.html, /Prakiraan, bukan kepastian/);
  const k = emailKonfirmasi({wilayah: w, bencana: ["gempa", "banjir"], waspada: false, tautan: "https://contoh.id/ews/konfirmasi?t=x"});
  assert.ok(k.html.includes("48 jam") && k.html.includes("Gempa bumi") && !k.html.includes("<b>Palangka"));
  const g = emailGempa({asal: "https://contoh.id", lat: 5.5, lon: 95.3, wilayah: w, g: {mag: 5.6, dalam: "10 km", wilayah: "Pusat gempa 1.234 km", potensi: "Tidak berpotensi tsunami", jarak: 1234.4}, tingkat: 2, tsunami: false, tautanBerhenti: "https://contoh.id/b"});
  assert.equal(g.subject, "Gempa M5,6 terasa di sekitar Anda (1.234 km)", "desimal koma, ribuan titik");
  assert.ok(!g.html.includes("Segera menjauhi pantai"));
  const t = emailGempa({asal: "https://contoh.id", lat: 5.5, lon: 95.3, wilayah: w, g: {mag: 7.2, dalam: "10 km", jarak: 80, potensi: "Berpotensi tsunami"}, tingkat: 3, tsunami: true, tautanBerhenti: "https://contoh.id/b"});
  assert.ok(t.html.includes("Segera menjauhi pantai") && t.html.includes("#c62828") && t.subject.includes("tsunami"));
});

/* ================= rute ================= */
uji("konfig: sitekey, email_aktif, daftar bencana", async () => {
  const r = await panggil("GET", "/api/ews/konfig");
  assert.equal(r.s, 200); assert.equal(r.j.turnstile, "kunci-situs"); assert.equal(r.j.email_aktif, true);
  assert.deepEqual(r.j.bencana.sort(), ["banjir", "cuaca", "gempa", "karhutla", "longsor", "rob", "tsunami"]);
  assert.equal(r.j.bencana.length, new Set(r.j.bencana).size);
});

uji("langganan: masukan salah DITOLAK dan tidak menulis apa pun", async () => {
  const sah = sub("salah@contoh.id", PAL, ["banjir"]), awal = surat.length;
  const kasus = [
    [{email: "bukan-email"}, "email"], [{email: ""}, "email"], [{email: "a@b"}, "email"], [{email: "a".repeat(250) + "@contoh.id"}, "email"],
    [{bencana: []}, "bencana"], [{bencana: ["banjir", "tsunamix"]}, "bencana"], [{bencana: "banjir"}, "bencana"], [{bencana: ["banjir", "banjir"]}, "bencana"], [{bencana: undefined}, "bencana"],
    [{lat: -5.5, lon: 108.0}, "daratan"],     // Laut Jawa
    [{lat: 1.55, lon: 110.35}, "daratan"],    // Kuching, Malaysia
    [{lat: 40, lon: 113.9}, "Indonesia"], [{lat: null}, "Indonesia"], [{lat: "abc"}, "Indonesia"], [{lat: true}, "Indonesia"],
    [{akurasi: 9000}, "akurasi"], [{waspada: "ya"}, "waspada"],
  ];
  for (const [ubah, kata] of kasus) {
    const r = await panggil("POST", "/api/ews/langganan", {...sah, ...ubah});
    assert.equal(r.s, 400, `${JSON.stringify(ubah)} harus 400, dapat ${r.s} ${r.t}`);
    assert.match(r.j.galat, new RegExp(kata, "i"), r.t);
  }
  assert.equal((await panggil("POST", "/api/ews/langganan", null)).s, 400, "body kosong");
  assert.equal((await panggil("POST", "/api/ews/langganan", sah, ipBaru(), {origin: "https://jahat.example"})).s, 403, "origin lain ditolak");
  assert.equal((await DB.prepare("SELECT count(*) n FROM ews_langganan").first()).n, 0);
  assert.equal(surat.length, awal, "tidak ada email untuk masukan yang ditolak");
});

uji("double opt-in: menunggu tidak menerima peringatan; jawaban sama untuk alamat baru dan lama", async () => {
  const isian = sub("Rina@Contoh.ID", PAL, ["karhutla", "banjir"], true);
  const r = await panggil("POST", "/api/ews/langganan", isian);
  assert.equal(r.s, 202, r.t); assert.equal(r.j.ok, true); assert.equal(r.j.wilayah.prov, "62"); assert.ok(r.j.wilayah.kab && r.j.wilayah.kec);
  kecKunci = `${r.j.wilayah.prov}|${r.j.wilayah.kab}|${r.j.wilayah.kec}`;
  const b = await baris("rina@contoh.id");
  assert.equal(b.status, "menunggu"); assert.equal(b.waspada, 1); assert.deepEqual(JSON.parse(b.bencana), ["karhutla", "banjir"]);
  assert.equal(b.lat, -2.21); assert.equal(b.kec_kunci, kecKunci); assert.ok(!("ip_hash" in b), "hash IP tidak disimpan di baris langganan");
  assert.equal(b.konfirmasi_hash.length, 64); assert.ok(b.konfirmasi_exp > Date.now() + 47 * JAM && b.konfirmasi_exp <= Date.now() + 48 * JAM);
  assert.equal(r.j.wilayah.prov_nama, "Kalimantan Tengah", "nama provinsi dari data/meta.json, bukan kode");
  assert.ok(await sampai(() => untuk("rina@contoh.id").length === 1), "email konfirmasi terkirim ke alamat yang dinormalkan");
  const k = surat[0]; assert.equal(k.subject, "Konfirmasi langganan Peringatan Dini"); assert.equal(k.auth, "Bearer kunci-resend");
  assert.ok(k.html.includes(ASAL + "/ews/konfirmasi?t=") && !k.html.includes("warga.lokal"), "tautan email memakai asal publik tetap, bukan origin permintaan");
  assert.ok(k.html.includes("Kalimantan Tengah") && !/, 62\b/.test(k.html), "email menulis nama provinsi, bukan kode");
  /* peringatan prakiraan sudah ada, tapi belum dikonfirmasi: cron tidak mengirim apa pun */
  muat(T0, {kecKunci});
  await cron(JAM_CRON, T0);
  assert.equal(untuk("rina@contoh.id").length, 1, "baris menunggu tidak dapat email peringatan");
  /* kiriman kedua: respons identik, tidak membocorkan keberadaan */
  const r2 = await panggil("POST", "/api/ews/langganan", {...isian, email: "rina@contoh.id"});
  assert.deepEqual(r2.j, r.j); assert.equal(r2.s, 202);
  assert.ok(await sampai(() => untuk("rina@contoh.id").length === 2), "kiriman ulang untuk yang masih menunggu mengirim konfirmasi lagi");
  assert.equal((await DB.prepare("SELECT count(*) n FROM ews_langganan").first()).n, 1, "satu email = satu langganan");
});

uji("konfirmasi: GET tidak mengubah apa pun; POST menolak token salah, menerima sekali saja", async () => {
  const lama = tokenDari(surat[0]), token = tokenDari(untuk("rina@contoh.id").at(-1));
  assert.notEqual(lama, token, "kiriman ulang memutar token konfirmasi");
  /* GET: hanya mengalihkan ke halaman, termasuk untuk token ngawur (tidak ada oracle) */
  for (const t of [token, "", "salah", "0".repeat(32)]) {
    const r = await panggil("GET", "/ews/konfirmasi?t=" + t);
    assert.equal(r.s, 303); assert.equal(r.h.get("location"), `/peringatan?aksi=konfirmasi&t=${t}`); assert.equal(r.h.get("referrer-policy"), "no-referrer");
  }
  assert.equal((await baris("rina@contoh.id")).status, "menunggu", "GET tidak mengaktifkan (pemindai tautan email membuka GET)");
  /* rincian: apa yang akan dikonfirmasi, tanpa mengubah */
  const d = await panggil("GET", "/api/ews/rincian?t=" + token);
  assert.equal(d.s, 200); assert.deepEqual(d.j.aksi_mungkin, ["konfirmasi"]); assert.equal(d.j.status, "menunggu"); assert.equal(d.j.wilayah.prov, "62"); assert.deepEqual(d.j.bencana, ["karhutla", "banjir"]); assert.equal(d.j.calon, null);
  assert.equal(d.h.get("referrer-policy"), "no-referrer"); assert.ok(!/"email"|ip_hash|"lat"|"lon"/i.test(d.t) && !d.t.includes("rina@"), "rincian tidak memuat email atau koordinat (regex lama /lat/ ikut mencocokkan kata biasa)");
  assert.equal((await panggil("GET", "/api/ews/rincian?t=" + "0".repeat(32))).s, 404);
  assert.equal((await panggil("GET", "/api/ews/rincian")).s, 404);
  /* POST: token salah/lama/kosong ditolak */
  for (const t of ["", "salah", "0".repeat(32), "0".repeat(48), "g".repeat(32), lama, tokenDari(surat[0]).toUpperCase()]) {
    const r = await panggil("POST", "/ews/konfirmasi?t=" + t); assert.equal(r.s, 400, `token "${t}"`); assert.ok(r.j.galat);
  }
  assert.equal((await baris("rina@contoh.id")).status, "menunggu");
  const ok = await panggil("POST", "/ews/konfirmasi?t=" + token);
  assert.equal(ok.s, 200); assert.equal(ok.j.ok, true); assert.equal(ok.j.wilayah.prov, "62"); assert.deepEqual(ok.j.bencana, ["karhutla", "banjir"]); assert.equal(ok.h.get("referrer-policy"), "no-referrer");
  const b = await baris("rina@contoh.id"); assert.equal(b.status, "aktif"); assert.ok(b.dikonfirmasi > 0); assert.equal(b.konfirmasi_hash, null, "token konfirmasi dihapus setelah dipakai");
  const lagi = await panggil("POST", "/ews/konfirmasi?t=" + token); assert.equal(lagi.s, 400, "sekali pakai"); assert.equal((await panggil("GET", "/api/ews/rincian?t=" + token)).s, 404);
  /* kedaluwarsa 48 jam */
  await panggil("POST", "/api/ews/langganan", sub("tua48@contoh.id", PAL, ["banjir"]));
  assert.ok(await sampai(() => untuk("tua48@contoh.id").length === 1));
  await DB.prepare("UPDATE ews_langganan SET konfirmasi_exp = ? WHERE email = 'tua48@contoh.id'").bind(Date.now() - 1000).run();
  assert.equal((await panggil("POST", "/ews/konfirmasi?t=" + tokenDari(untuk("tua48@contoh.id")[0]))).s, 400, "kedaluwarsa");
  await DB.prepare("DELETE FROM ews_langganan WHERE email = 'tua48@contoh.id'").run();
});

uji("prakiraan: relevansi lokasi, tingkat minimum, dan isi email", async () => {
  await daftarAktif(sub("eko@contoh.id", PAL, ["karhutla"], false));               // hanya Siaga ke atas
  await daftarAktif(sub("bayu@contoh.id", PAPUA, ["gempa", "tsunami", "karhutla"]));  // Papua: tak ada prakiraan di fixture
  await daftarAktif(sub("cut@contoh.id", ACEH, ["gempa"]));
  await daftarAktif(sub("dewi@contoh.id", ACEH, ["gempa", "tsunami"]));
  await daftarAktif(sub("gani@contoh.id", ACEH, ["banjir"]));                        // tidak memilih gempa
  const awal = surat.length;
  muat(T0, {kecKunci});   // banjir Siaga besok + karhutla Waspada besok (FWI 9)
  await cron(JAM_CRON, T0);
  const rina = untuk("rina@contoh.id").slice(2);
  assert.equal(rina.length, 1, "Rina (Waspada ke atas) dapat satu email");
  assert.ok(rina[0].subject.startsWith("Siaga banjir besok di Kec. "), rina[0].subject);
  assert.ok(rina[0].html.includes("bencana-banjir.jpg") && rina[0].html.includes("Karhutla") && rina[0].html.includes("Yang perlu Anda lakukan"));
  assert.deepEqual(rina[0].to, ["rina@contoh.id"]);
  assert.ok(rina[0].tercatat >= 2, `kunci terkirim sudah tercatat saat surat keluar (catat dulu, kirim kemudian); tercatat=${rina[0].tercatat}`);
  assert.ok(rina[0].html.includes(ASAL + "/peringatan?lat=-2.21") && rina[0].html.includes(ASAL + "/ews/berhenti?t="), "semua tautan memakai asal publik tetap");
  assert.ok(rina[0].html.includes("Kalimantan Tengah"), "nama provinsi, bukan kode");
  assert.match(rina[0].headers["List-Unsubscribe"], /^<http:\/\/|^<https:\/\//); assert.equal(rina[0].headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(untuk("eko@contoh.id").slice(1).length, 0, "Waspada saja tidak cukup bagi yang memilih Siaga ke atas");
  assert.equal(surat.slice(awal).filter(s => ["bayu", "cut", "dewi", "gani"].some(x => s.to[0].startsWith(x))).length, 0, "lokasi lain tidak dapat email");
  const pelanggan = await baris("rina@contoh.id"); assert.equal(pelanggan.kirim_terakhir, T0);
});

uji("dedupe: putaran kedua tanpa perubahan tidak mengirim; naik tingkat mengirim; jeda 6 jam", async () => {
  const hitung = () => surat.length;
  let awal = hitung();
  muat(T0 + 7 * JAM, {kecKunci});
  await cron(JAM_CRON, T0 + 7 * JAM);
  assert.equal(hitung(), awal, "kunci sama = tidak ada email baru");
  /* FWI besok naik ke 15 (Siaga): kunci karhutla|besok|2 baru -> Rina dan Eko dapat email */
  muat(T0 + 7.5 * JAM, {kecKunci, f1: 15});
  await cron(JAM_CRON, T0 + 7.5 * JAM);
  assert.equal(untuk("rina@contoh.id").length, 4, "Rina: 2 konfirmasi + 2 peringatan");
  const naik = untuk("rina@contoh.id").at(-1);
  assert.ok(naik.html.includes("Banjir") && naik.html.includes("Karhutla"), "email memuat SEMUA peringatan yang sedang berlaku");
  const eko = untuk("eko@contoh.id").slice(1); assert.equal(eko.length, 1); assert.match(eko[0].subject, /^Siaga karhutla besok/);
  /* kenaikan lagi 30 menit kemudian: tertahan jeda 6 jam */
  awal = hitung();
  muat(T0 + 8 * JAM, {kecKunci, f1: 15, f2: 15});
  await cron(JAM_CRON, T0 + 8 * JAM);
  assert.equal(hitung(), awal, "paling banyak satu email prakiraan per 6 jam");
  /* dan setelah jeda lewat, kenaikan itu terkirim */
  muat(T0 + 13.6 * JAM, {kecKunci, f1: 15, f2: 15});
  await cron(JAM_CRON, T0 + 13.6 * JAM);
  assert.equal(untuk("rina@contoh.id").length, 5);
  assert.equal((await DB.prepare("SELECT max(length(kunci)) m FROM ews_terkirim").first()).m <= 80, true, "kunci terkirim selalu <= 80 karakter");
  const terkirim = await DB.prepare("SELECT kunci FROM ews_terkirim WHERE langganan_id = ?").bind((await baris("eko@contoh.id")).id).all();
  assert.ok(terkirim.results.some(r => r.kunci === `karhutla|${tambah(wib(T0), 2)}|2`), "kenaikan untuk lusa tercatat");
});

uji("kegagalan kirim: tidak dicatat terkirim, dicoba lagi putaran berikutnya", async () => {
  await daftarAktif(sub("fani@contoh.id", PAL, ["banjir"]));
  const T = T0 + 14 * JAM - 30 * MENIT;   // masih hari WIB yang sama (23.30)
  muat(T, {kecKunci, f1: 15, f2: 15});
  resendGagal = true;
  await cron(JAM_CRON, T);
  resendGagal = false;
  const f = await baris("fani@contoh.id");
  assert.equal(f.kirim_terakhir, 0); assert.equal((await DB.prepare("SELECT count(*) n FROM ews_terkirim WHERE langganan_id = ?").bind(f.id).first()).n, 0);
  await cron(JAM_CRON, T + 30 * MENIT - 20 * MENIT);   // putaran berikutnya: berhasil (cache data 10 menit sudah lewat tidak perlu; data sama)
  assert.equal(untuk("fani@contoh.id").length, 2, "konfirmasi + peringatan yang tertunda");
});

uji("gempa: hanya pelanggan dalam radius yang diemail (Aceh ya, Papua tidak); gempa lama diabaikan", async () => {
  const bmkg = (t, o = {}) => ({Infogempa: {gempa: {Tanggal: "20 Okt 2026", Jam: "10:00:00 WIB", DateTime: new Date(t).toISOString().replace(/\.\d+Z$/, "+00:00"), Coordinates: "5.2,95.0",
    Magnitude: "6.1", Kedalaman: "10 km", Wilayah: "Pusat gempa di laut 50 km Barat Laut Banda Aceh", Potensi: "Tidak berpotensi tsunami", Dirasakan: "III Banda Aceh", ...o}}});
  const TQ = T0 + 20 * JAM, awal = surat.length;
  gempa = bmkg(TQ - 3 * JAM);
  await cron(CRON_GEMPA, TQ);
  assert.equal(surat.length, awal, "gempa 3 jam lalu terlalu lama");
  gempa = bmkg(TQ - 5 * MENIT);
  await cron(CRON_GEMPA, TQ);
  const baru = surat.slice(awal);
  assert.deepEqual(baru.map(s => s.to[0]).sort(), ["cut@contoh.id", "dewi@contoh.id"], "Aceh yang memilih gempa; bukan Papua, bukan yang tidak memilih gempa");
  assert.match(baru[0].subject, /^Gempa M6,1 terasa di sekitar Anda \(\d+ km\)$/);
  assert.ok(baru[0].html.includes("Banda Aceh") || baru[0].html.includes("Pusat gempa"));
  assert.equal(baru[0].headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  /* putaran lagi: sudah diproses */
  await cron(CRON_GEMPA, TQ + 5 * MENIT);
  assert.equal(surat.length, awal + 2, "gempa yang sama tidak diemail dua kali");
  await DB.prepare("DELETE FROM ews_keadaan").run();   // kehilangan ingatan cron pun tidak membuat duplikat: ews_terkirim menjaga per pelanggan
  await cron(CRON_GEMPA, TQ + 10 * MENIT);
  assert.equal(surat.length, awal + 2);
  /* gempa kecil jauh dari semua orang */
  gempa = bmkg(TQ + 12 * MENIT, {Magnitude: "3.6"});
  await cron(CRON_GEMPA, TQ + 15 * MENIT);
  assert.equal(surat.length, awal + 2, "M < 4 tidak terasa");
  gempa = bmkg(TQ + 16 * MENIT, {Coordinates: "-2.5,140.5", Wilayah: "Jayapura", Magnitude: "6.5"});
  await cron(CRON_GEMPA, TQ + 20 * MENIT);
  assert.deepEqual(surat.slice(awal + 2).map(s => s.to[0]), ["bayu@contoh.id"], "gempa Papua hanya ke pelanggan Papua");
});

uji("tsunami: potensi tsunami -> email merah ke yang memilih tsunami dalam 500 km; gempa biasa ke yang hanya memilih gempa", async () => {
  const TQ = T0 + 21 * JAM, awal = surat.length;
  gempa = {Infogempa: {gempa: {Tanggal: "20 Okt 2026", Jam: "11:00:00 WIB", DateTime: new Date(TQ - 2 * MENIT).toISOString().replace(/\.\d+Z$/, "+00:00"), Coordinates: "5.0,94.9",
    Magnitude: "7.4", Kedalaman: "15 km", Wilayah: "Pusat gempa di laut 70 km Barat Daya Banda Aceh", Potensi: "Gempa ini berpotensi tsunami untuk diteruskan pada masyarakat", Dirasakan: "V Banda Aceh"}}};
  await cron(CRON_GEMPA, TQ);
  const baru = surat.slice(awal), per = e => baru.filter(s => s.to[0] === e);
  assert.equal(per("dewi@contoh.id").length, 1, "satu email per gempa per pelanggan");
  assert.ok(per("dewi@contoh.id")[0].html.includes("Segera menjauhi pantai") && /tsunami/i.test(per("dewi@contoh.id")[0].subject), per("dewi@contoh.id")[0].subject);
  assert.equal(per("cut@contoh.id").length, 1); assert.ok(!per("cut@contoh.id")[0].html.includes("Segera menjauhi pantai"), "yang hanya memilih gempa dapat email gempa biasa");
  assert.equal(per("bayu@contoh.id").length, 0, "Papua > 500 km dari Aceh");
  assert.equal(per("gani@contoh.id").length, 0);
});

uji("batas laju: IP dan per alamat email, jawaban tetap 202 tanpa membocorkan", async () => {
  const ip = "10.99.0.1";
  for (let i = 1; i <= 5; i++) assert.equal((await panggil("POST", "/api/ews/langganan", sub(`laju${i}@contoh.id`, PAL, ["banjir"]), ip)).s, 202);
  const r = await panggil("POST", "/api/ews/langganan", sub("laju6@contoh.id", PAL, ["banjir"]), ip);
  assert.equal(r.s, 429); assert.ok(r.h.get("retry-after"));
  assert.equal(await baris("laju6@contoh.id"), null, "yang kena batas tidak tersimpan");
  /* per alamat: 4 kiriman dari 4 IP berbeda, hanya 3 email konfirmasi */
  const jawab = [];
  for (let i = 0; i < 4; i++) jawab.push(await panggil("POST", "/api/ews/langganan", sub("sering@contoh.id", PAL, ["banjir"])));
  assert.ok(jawab.every(x => x.s === 202));
  assert.deepEqual(jawab[3].j, jawab[2].j, "kiriman ke-4 tampak sama dengan yang sebelumnya");
  await sampai(() => untuk("sering@contoh.id").length >= 3); await new Promise(r => setTimeout(r, 150));
  assert.equal(untuk("sering@contoh.id").length, 3, "maksimal 3 email konfirmasi per alamat per 24 jam");
});

uji("kirim ulang untuk alamat aktif: perubahan menunggu konfirmasi, langganan lama dan tautan berhenti tetap jalan", async () => {
  const lama = await baris("eko@contoh.id"), jumlah = untuk("eko@contoh.id").length;
  const tautanLama = untuk("eko@contoh.id").filter(s => s.headers).at(-1).headers["List-Unsubscribe"].match(/t=([0-9a-f]{48})/)[1];
  const r = await panggil("POST", "/api/ews/langganan", sub("eko@contoh.id", ACEH, ["gempa", "banjir"], true));
  assert.equal(r.s, 202);
  const b = await baris("eko@contoh.id");
  assert.equal(b.status, "aktif", "orang lain yang mengetik alamat ini tidak bisa menonaktifkan atau memindahkan lokasi"); assert.equal(b.lat, lama.lat); assert.equal(b.bencana, lama.bencana); assert.ok(b.calon);
  assert.ok(await sampai(() => untuk("eko@contoh.id").length === jumlah + 1));
  const token = tokenDari(untuk("eko@contoh.id").at(-1));
  const d = await panggil("GET", "/api/ews/rincian?t=" + token);
  assert.equal(d.j.status, "aktif"); assert.equal(d.j.wilayah.prov, "62", "lokasi berlaku masih yang lama"); assert.equal(d.j.calon.wilayah.prov, "11", "rincian menunjukkan perubahan yang menunggu"); assert.deepEqual(d.j.calon.bencana, ["gempa", "banjir"]);
  /* tautan berhenti dari email lama tidak bergantung pada hash tersimpan: tetap berlaku setelah kiriman ulang */
  assert.deepEqual((await panggil("GET", "/api/ews/rincian?t=" + tautanLama)).j.aksi_mungkin, ["berhenti"]);
  const k = await panggil("POST", "/ews/konfirmasi?t=" + token); assert.equal(k.s, 200); assert.equal(k.j.wilayah.prov, "11");
  const baru = await baris("eko@contoh.id");
  assert.equal(baru.lat, 5.55); assert.deepEqual(JSON.parse(baru.bencana), ["gempa", "banjir"]); assert.equal(baru.waspada, 1); assert.equal(baru.calon, null); assert.equal(baru.prov, "11");
  assert.deepEqual((await panggil("GET", "/api/ews/rincian?t=" + tautanLama)).j.aksi_mungkin, ["berhenti"], "tautan berhenti lama masih berlaku setelah konfirmasi");
  assert.equal((await panggil("GET", "/api/ews/rincian?t=" + tautanLama.slice(0, 16) + "0".repeat(32))).s, 404, "tanda tangan salah ditolak");
  assert.equal((await panggil("GET", "/api/ews/rincian?t=" + "f".repeat(16) + tautanLama.slice(16))).s, 404, "id lain dengan tanda tangan orang lain ditolak");
});

uji("/api/ews/cek: peringatan lokasi dengan nilaiTitik yang sama, wilayah, 3 hari; tanpa data pribadi", async () => {
  const kini = Date.now(), hari0 = wib(kini), iso = t => new Date(t).toISOString();
  const poli = [[[113.8, -2.3], [114.0, -2.3], [114.0, -2.1], [113.8, -2.1], [113.8, -2.3]]];
  muat(kini, {kecKunci, cuaca: [{event: "Hujan Lebat", severity: "Severe", headline: "Hujan lebat Kalteng", polygon: poli, mulai: iso(kini - JAM), selesai: iso(kini + JAM)}]});
  const r = await panggil("GET", "/api/ews/cek?lat=-2.2149&lon=113.9151");
  assert.equal(r.s, 200, r.t);
  assert.equal(r.j.wilayah.prov, "62"); assert.deepEqual(r.j.hari, [hari0, tambah(hari0, 1), tambah(hari0, 2)]);
  const banjir = r.j.peringatan.find(p => p.bencana === "banjir"), cuaca = r.j.peringatan.find(p => p.bencana === "cuaca");
  assert.deepEqual([banjir.tingkat, banjir.hari], [2, 1]); assert.equal(cuaca.tingkat, 3);
  for (const p of r.j.peringatan) assert.ok(p.judul && p.rincian && p.sumber && !("kunci" in p) && Object.keys(p).sort().join() === "bencana,hari,judul,rincian,sumber,tingkat", JSON.stringify(p));
  assert.ok(r.j.diperbarui.cuaca && r.j.diperbarui.fwi);
  assert.ok(!/email|ip_hash|token/i.test(r.t), "tanpa data pelanggan");
  const laut = await panggil("GET", "/api/ews/cek?lat=-5.5&lon=108.0"); assert.equal(laut.s, 200); assert.equal(laut.j.wilayah, null);
  for (const q of ["", "?lat=40&lon=113", "?lat=abc&lon=113", "?lat=-2.2", "?lat=&lon=", "?lat=-2.2&lon=200"]) assert.equal((await panggil("GET", "/api/ews/cek" + q)).s, 400, q);
});

uji("sumberBasi: sumber yang tidak mencakup hari ini ditandai; cek melaporkan basi", async () => {
  const d = {fwi: {hari_ini: "2026-10-20"}, status: {hari: ["2026-10-20"]}, cuacaDibuat: "2026-10-20T03:00:00Z", rob: {hari: ["2026-10-20"]}, titikDibuat: "2026-10-20T02:00:00Z", jejakAcuan: "2026-10-20T02:00:00Z", jejakStatus: "ok"};
  const t = Date.parse("2026-10-20T03:00:00Z");
  assert.deepEqual(E.sumberBasi(d, t), []);
  assert.deepEqual(E.sumberBasi(d, t + HARI + MENIT), ["banjir", "cuaca", "rob", "titik"], "besoknya: fwi masih sehari tertinggal = boleh; jejak harian masih dalam SIM_UMUR; sisanya tidak mencakup hari ini");
  assert.ok(E.sumberBasi(d, Date.parse(d.jejakAcuan) + E.SIM_UMUR + MENIT).includes("jejak"), "acuan lebih tua dari SIM_UMUR = basi");
  assert.ok(E.sumberBasi({...d, jejakStatus: "data_basi"}, t).includes("jejak"), "status bukan ok = basi");
  assert.deepEqual(E.sumberBasi(d, t + 2 * HARI + MENIT), ["fwi", "banjir", "cuaca", "rob", "titik", "jejak"]);
  assert.deepEqual(E.sumberBasi({}, t), ["fwi", "banjir", "cuaca", "rob", "titik", "jejak"], "berkas hilang = basi, bukan aman");
  /* e2e: fixture segar untuk hari ini, tapi belum ada putaran titik panas di D1 */
  muat(Date.now(), {kecKunci});
  const r = await panggil("GET", "/api/ews/cek?lat=-2.21&lon=113.92");
  assert.equal(r.j.basi, true); assert.deepEqual(r.j.basi_sumber, ["titik"]);
});

uji("privasi: koordinat tersimpan 2 desimal, tanpa hash IP, tautan peta memakai koordinat bulat", async () => {
  const r = await panggil("POST", "/api/ews/langganan", sub("bulat@contoh.id", {lat: -2.2149, lon: 113.9151}, ["banjir"], true));
  assert.equal(r.s, 202);
  const b = await baris("bulat@contoh.id"); assert.equal(b.lat, -2.21); assert.equal(b.lon, 113.92); assert.ok(!Object.keys(b).includes("ip_hash"));
  const k = emailPeringatan({asal: ASAL, lat: b.lat, lon: b.lon, wilayah: {kec: "A", kab: "B", prov_nama: "C"}, peringatan: [{bencana: "banjir", tingkat: 2, hari: 0, judul: "j", rincian: "", sumber: "s"}], tautanBerhenti: ASAL + "/ews/berhenti?t=x"});
  assert.ok(k.html.includes("lat=-2.21&amp;lon=113.92") || k.html.includes("lat=-2.21&lon=113.92"));
  assert.ok(k.html.includes("Kec. A, B, C"), "wilayah memuat nama provinsi");
  await DB.prepare("DELETE FROM ews_langganan WHERE email = 'bulat@contoh.id'").run();
});

uji("alias email: +tag dan titik gmail satu kotak surat = satu langganan dan satu jatah", async () => {
  assert.equal(E.kunciEmail("A.B+x@Gmail.com"), "ab@gmail.com"); assert.equal(E.kunciEmail("ab@googlemail.com"), "ab@gmail.com");
  assert.equal(E.kunciEmail("x.y+tag@contoh.id"), "x.y@contoh.id", "titik dipertahankan di domain selain gmail");
  for (const e of ["a.b+1@gmail.com", "ab+2@googlemail.com", "A.B@gmail.com"]) assert.equal((await panggil("POST", "/api/ews/langganan", sub(e, PAL, ["banjir"]))).s, 202);
  assert.equal((await DB.prepare("SELECT count(*) n FROM ews_langganan WHERE email_kunci = 'ab@gmail.com'").first()).n, 1, "alias tidak melipatgandakan langganan");
  assert.ok(await sampai(() => untuk("a.b@gmail.com").length + untuk("a.b+1@gmail.com").length + untuk("ab+2@googlemail.com").length >= 3));
  const r4 = await panggil("POST", "/api/ews/langganan", sub("ab+empat@gmail.com", PAL, ["banjir"])); assert.equal(r4.s, 202, "jawaban sama, tidak membocorkan");
  await new Promise(r => setTimeout(r, 200));
  assert.equal(untuk("a.b+1@gmail.com").length + untuk("ab+2@googlemail.com").length + untuk("a.b@gmail.com").length + untuk("ab+empat@gmail.com").length, 3, "alias ke-4 tidak dapat email: jatah 3 per kotak surat");
  await panggil("POST", "/api/ews/langganan", sub("x.y@contoh.id", PAL, ["banjir"])); await panggil("POST", "/api/ews/langganan", sub("xy@contoh.id", PAL, ["banjir"]));
  assert.equal((await DB.prepare("SELECT count(*) n FROM ews_langganan WHERE email_kunci IN ('x.y@contoh.id', 'xy@contoh.id')").first()).n, 2, "titik hanya dibuang untuk gmail");
});

uji("Turnstile: token salah DITOLAK; email aktif tanpa Turnstile terpasang = 503; batas global per jam = 503", async () => {
  const awal = surat.length, jumlah = async d => (await d.prepare("SELECT count(*) n FROM ews_langganan").first()).n, n0 = await jumlah(DB);
  for (const t of ["salah", "", undefined]) { const r = await panggil("POST", "/api/ews/langganan", sub("bot@contoh.id", PAL, ["banjir"], false, {turnstile: t})); assert.equal(r.s, 403, String(t)); }
  assert.equal(await jumlah(DB), n0);
  const r3 = await panggil("POST", "/api/ews/langganan", sub("bot@contoh.id", PAL, ["banjir"]), ipBaru(), {}, mf3);
  assert.equal(r3.s, 503); assert.equal(r3.j.galat, "verifikasi Turnstile belum dipasang"); assert.equal(await jumlah(DB3), 0, "tanpa verifikasi tidak ada yang disimpan");
  assert.equal((await panggil("GET", "/api/ews/konfig", undefined, ipBaru(), {}, mf3)).j.turnstile, null);
  const sekarang = Date.now();
  await DB.batch(Array.from({length: 200}, () => DB.prepare("INSERT INTO ews_laju VALUES ('semua', 'global', ?)").bind(sekarang)));
  const g = await panggil("POST", "/api/ews/langganan", sub("ramai@contoh.id", PAL, ["banjir"])); assert.equal(g.s, 503); assert.equal(await baris("ramai@contoh.id"), null);
  await DB.prepare("DELETE FROM ews_laju WHERE aksi = 'global'").run();
  await new Promise(r => setTimeout(r, 100)); assert.equal(surat.length, awal, "tidak ada email konfirmasi dari kiriman yang ditolak");
});

uji("metode salah: jalur ada di tabel rute tapi metodenya lain = 405, bukan jatuh ke aset", async () => {
  const a = await panggil("GET", "/api/ews/langganan"); assert.equal(a.s, 405); assert.equal(a.j.galat, "metode tidak diizinkan"); assert.equal(a.h.get("allow"), "POST");
  assert.equal((await panggil("POST", "/api/ews/konfig")).s, 405);
  assert.equal((await panggil("POST", "/api/ews/cek")).s, 405);
  assert.equal((await panggil("GET", "/api/jejak")).s, 405, "rute lama (statistik) ikut terlindungi");
  const d = await panggil("DELETE", "/ews/berhenti"); assert.equal(d.s, 405); assert.equal(d.h.get("allow"), "GET, POST");
  assert.notEqual((await panggil("POST", "/api/tidak-ada-sama-sekali")).s, 405, "jalur yang memang tidak ada bukan 405");
  assert.notEqual((await panggil("HEAD", "/statistik")).s, 405, "HEAD ke halaman tetap dilayani");
  assert.equal((await panggil("GET", "/api/ews/konfig")).s, 200);
});

uji("giliran adil: semua pelanggan dinilai tiap putaran (lebih dari satu kelompok); batas email hanya menunda, tiap orang tepat sekali", async () => {
  const TF = T0 + 3 * HARI + 3 * JAM, id = i => i.toString(16).padStart(16, "0");
  const masuk = (i, email, kk) => DB4.prepare("INSERT INTO ews_langganan (id, email, email_kunci, lat, lon, kec_kunci, bencana, status, dibuat) VALUES (?, ?, ?, ?, ?, ?, '[\"banjir\"]', 'aktif', 1)")
    .bind(id(i), email, email, kk ? -2.21 : 5.55, kk ? 113.92 : 95.32, kk || "11|Tidak|Ada");
  /* 45 pelanggan diam dengan EWS_CHUNK 20 = > 2 kelompok. Dulu 450 dengan kelompok 200: satu putaran cron menilai 455 orang dan
     panggilan miniflare putus ("fetch failed") di runner CI yang lebih lambat (19 Okt 2026). Yang diuji sama: giliran melewati beberapa kelompok. */
  await DB4.batch([...Array.from({length: 45}, (_, i) => masuk(i + 1, `diam${i}@contoh.id`)), ...Array.from({length: 5}, (_, i) => masuk(0xf000 + i, `kena${i}@contoh.id`, kecKunci))]);
  muat(TF, {kecKunci});
  const kena = () => surat.filter(s => /^kena\d@/.test(s.to[0])), per = {};
  await cron(JAM_CRON, TF, mf4);
  assert.equal(kena().length, 2, "batas 2 email per putaran");
  assert.ok((await DB4.prepare("SELECT count(*) n FROM ews_langganan WHERE diperiksa = ?").bind(TF).first()).n >= 47, "semua yang diam (45, > 2 kelompok) tetap dinilai walau batas email tercapai");
  await cron(JAM_CRON, TF + MENIT, mf4); assert.equal(kena().length, 4);
  await cron(JAM_CRON, TF + 2 * MENIT, mf4); assert.equal(kena().length, 5);
  await cron(JAM_CRON, TF + 3 * MENIT, mf4); assert.equal(kena().length, 5, "tidak ada yang dapat dua kali");
  for (const s of kena()) per[s.to[0]] = (per[s.to[0]] || 0) + 1;
  assert.deepEqual(Object.values(per), [1, 1, 1, 1, 1]);
});

uji("berhenti: POST satu klik (RFC 8058) dan GET dari tautan; token salah DITOLAK; tidak lagi dapat email", async () => {
  const tautan = untuk("rina@contoh.id").at(-1).headers["List-Unsubscribe"].slice(1, -1), t = new URL(tautan).searchParams.get("t");
  assert.match(t, /^[0-9a-f]{48}$/);
  const salah = await panggil("POST", "/ews/berhenti?t=" + "0".repeat(48)); assert.equal(salah.s, 404);
  assert.equal((await panggil("POST", "/ews/berhenti")).s, 404);
  const g = await panggil("GET", "/ews/berhenti?t=salah"); assert.equal(g.s, 303); assert.equal(g.h.get("location"), "/peringatan?aksi=berhenti&t=salah"); assert.equal(g.h.get("referrer-policy"), "no-referrer");
  assert.equal((await baris("rina@contoh.id")).status, "aktif", "token salah tidak menghentikan siapa pun");
  const gv = await panggil("GET", "/ews/berhenti?t=" + t); assert.equal(gv.s, 303); assert.equal(gv.h.get("location"), `/peringatan?aksi=berhenti&t=${t}`);
  assert.equal((await baris("rina@contoh.id")).status, "aktif", "GET tidak berhenti-kan siapa pun (pemindai tautan membuka GET)");
  const rc = await panggil("GET", "/api/ews/rincian?t=" + t); assert.deepEqual(rc.j.aksi_mungkin, ["berhenti"]); assert.equal(rc.j.calon, null);
  assert.equal((await panggil("POST", "/ews/berhenti?t=" + t.slice(0, 16) + "a".repeat(32))).s, 404, "tanda tangan HMAC salah");
  const r = await panggil("POST", "/ews/berhenti?t=" + t, undefined, ipBaru(), {"content-type": "application/x-www-form-urlencoded"});
  assert.equal(r.s, 200); assert.equal(r.j.ok, true);
  const b = await baris("rina@contoh.id"); assert.equal(b.status, "berhenti"); assert.ok(b.berhenti_pada > 0);
  const awal = untuk("rina@contoh.id").length;
  muat(T0 + 30 * JAM, {kecKunci, f1: 15, f2: 15});
  await cron(JAM_CRON, T0 + 30 * JAM);
  assert.equal(untuk("rina@contoh.id").length, awal, "berhenti = tidak ada email lagi");
  const te = untuk("eko@contoh.id").filter(s => s.headers).at(-1).headers["List-Unsubscribe"].match(/t=([0-9a-f]{48})/)[1];
  assert.equal((await panggil("POST", "/ews/berhenti?t=" + te)).s, 200); assert.equal((await baris("eko@contoh.id")).status, "berhenti");
  assert.equal((await panggil("POST", "/ews/berhenti?t=" + te)).s, 200, "berhenti dua kali tidak merusak");
  assert.equal((await panggil("POST", "/ews/konfirmasi?t=" + t)).s, 400, "token berhenti bukan token konfirmasi");
  assert.deepEqual((await panggil("GET", "/api/ews/rincian?t=" + t)).j.aksi_mungkin, [], "yang sudah berhenti tidak punya aksi lagi");
});

uji("pengirim resend.dev atau tanpa kunci: langganan tersimpan, TIDAK ada email pelanggan, konfig melaporkan email_aktif:false", async () => {
  const k = await panggil("GET", "/api/ews/konfig", undefined, ipBaru(), {}, mf2); assert.equal(k.j.email_aktif, false);
  const awal = surat.length;
  const r = await panggil("POST", "/api/ews/langganan", sub("owner@contoh.id", PAL, ["banjir"], true), ipBaru(), {}, mf2);
  assert.equal(r.s, 202); assert.equal(r.j.email_aktif, false);
  await new Promise(r => setTimeout(r, 200));
  assert.equal(surat.length, awal, "tidak ada permintaan ke Resend");
  const b = await baris("owner@contoh.id", DB2); assert.equal(b.status, "menunggu");
  await DB2.prepare("UPDATE ews_langganan SET status = 'aktif'").run();
  muat(T0, {kecKunci}); await cron(JAM_CRON, T0, mf2);
  gempa = {Infogempa: {gempa: {DateTime: new Date(T0 - MENIT).toISOString(), Coordinates: "-2.2,113.9", Magnitude: "7", Potensi: "Berpotensi tsunami"}}};
  await cron(CRON_GEMPA, T0, mf2);
  assert.equal(surat.length, awal, "cron prakiraan dan gempa dilewati, tidak ada panggilan Resend");
  const ada = await mf2.dispatchFetch("http://warga.lokal/ews/konfirmasi?t=x", {redirect: "manual"}); assert.equal(ada.status, 303);
});

uji("pembersihan: menunggu > 48 jam, berhenti > 30 hari, terkirim > 14 hari, laju lama dihapus; yang masih sah tetap", async () => {
  const kini = Date.now(), tambahBaris = (id, email, status, dibuat, berhenti = null) => DB.prepare(
    "INSERT INTO ews_langganan (id, email, email_kunci, lat, lon, bencana, status, dibuat, berhenti_pada) VALUES (?, ?, ?, -2.2, 113.9, '[\"banjir\"]', ?, ?, ?)").bind(id, email, email, status, dibuat, berhenti);
  await DB.batch([
    tambahBaris("a000000000000001", "tua@contoh.id", "menunggu", kini - 49 * JAM), tambahBaris("a000000000000002", "baru@contoh.id", "menunggu", kini - 47 * JAM),
    tambahBaris("a000000000000003", "lama-berhenti@contoh.id", "berhenti", kini - 90 * HARI, kini - 31 * HARI), tambahBaris("a000000000000004", "baru-berhenti@contoh.id", "berhenti", kini - 90 * HARI, kini - 29 * HARI),
    tambahBaris("a000000000000005", "aktif-lama@contoh.id", "aktif", kini - 90 * HARI),
    DB.prepare("INSERT INTO ews_terkirim VALUES ('a000000000000005', 'banjir|x|2', ?)").bind(kini - 15 * HARI), DB.prepare("INSERT INTO ews_terkirim VALUES ('a000000000000005', 'banjir|y|2', ?)").bind(kini - 13 * HARI),
    DB.prepare("INSERT INTO ews_terkirim VALUES ('a000000000000003', 'banjir|z|2', ?)").bind(kini - 1 * HARI),   // yatim setelah barisnya dihapus
    DB.prepare("INSERT INTO ews_laju VALUES ('h', 'langganan', ?)").bind(kini - 3 * HARI),
  ]);
  muat(kini, {tanpaBanjir: true});
  await cron(JAM_CRON, kini);
  const ada = (await DB.prepare("SELECT email FROM ews_langganan WHERE id LIKE 'a0000000000000%'").all()).results.map(r => r.email).sort();
  assert.deepEqual(ada, ["aktif-lama@contoh.id", "baru-berhenti@contoh.id", "baru@contoh.id"]);
  assert.deepEqual((await DB.prepare("SELECT kunci FROM ews_terkirim WHERE langganan_id LIKE 'a0000000000000%'").all()).results.map(r => r.kunci), ["banjir|y|2"]);
  assert.equal((await DB.prepare("SELECT count(*) n FROM ews_laju WHERE ip_hash = 'h'").first()).n, 0);
});

uji("skema: constraint menolak baris yang salah langsung di D1", async () => {
  const masuk = (o = {}) => { const r = {id: "b000000000000001", email: "x@contoh.id", lat: -2, lon: 113, bencana: '["banjir"]', status: "menunggu", konfirmasi_hash: null, dibuat: 1, waspada: 0, ...o};
    return DB.prepare("INSERT INTO ews_langganan (id, email, email_kunci, lat, lon, bencana, status, konfirmasi_hash, dibuat, waspada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(r.id, r.email, r.email.toLowerCase(), r.lat, r.lon, r.bencana, r.status, r.konfirmasi_hash, r.dibuat, r.waspada).run(); };
  for (const [nama, o] of [["status liar", {status: "halo"}], ["email kapital", {email: "X@contoh.id"}], ["lat luar negeri", {lat: 40}], ["bencana bukan array", {bencana: '{"a":1}'}], ["bencana bukan JSON", {bencana: "banjir"}], ["waspada 2", {waspada: 2}], ["id pendek", {id: "abc"}], ["hash konfirmasi pendek", {konfirmasi_hash: "abc"}], ["email kembar", {email: "rina@contoh.id", id: "b000000000000002"}]])
    await assert.rejects(masuk(o), undefined, `${nama} harus ditolak`);
  await assert.rejects(DB.prepare("INSERT INTO ews_laju VALUES ('h', 'liar', 1)").run(), undefined, "aksi laju liar");
  await masuk(); await DB.prepare("DELETE FROM ews_langganan WHERE id = 'b000000000000001'").run();
});

/* ================= simulasi penjalaran api (public/data/jejak_api.json) ================= */
uji("simulasi: ambang, cakrawala yang lewat dilewati, label sisa jam, kunci dedupe, tanpa presisi palsu", () => {
  const h0 = "2026-10-20", kini = Date.parse("2026-10-20T03:00:00Z"), acuan = kini - 6 * JAM;   // cakrawala berakhir kini+18, +42, +66 jam
  const f = (o, {lat = PAL.lat, lon = PAL.lon, id, extra, ac = acuan, atas} = {}) => E.nilaiTitik({kini, fwi: null, titik: [], cuaca: [], status: null, rob: null, jejak: E.indeksJejak(jejakFx(o, ac, id, undefined, extra, atas))}, lat, lon, "", h0);
  const ringkas = ps => ps.map(p => [p.tingkat, p.hari, p.jam_sisa]);
  /* 1,5 km, p 0,6 = Awas; label dari sisa waktu (18 jam -> 18) */
  const a = f({24: [[1.5, 0.6]]});
  assert.deepEqual(ringkas(a), [[3, 0, 18]]);
  assert.equal(a[0].bencana, "karhutla"); assert.equal(a[0].sumber_jenis, "simulasi"); assert.equal(a[0].kompleks, "K0012");
  assert.equal(a[0].jarak_maks_km, 2); assert.equal(a[0].peluang, 0.6);
  assert.equal(a[0].kunci, "karhutla-sim|K0012|2026-10-20|3"); assert.ok(a[0].kunci.length <= 80);
  assert.equal(a[0].judul, "Perkiraan model: api bisa mencapai area dalam 2 km dari lokasimu dalam 18 jam");
  assert.match(a[0].kalimat, /^Perkiraan model: api bisa mencapai area dalam \d km dari lokasimu dalam \d+ jam · sekitar 1 dari 2 kemungkinan · simulasi dari deteksi satelit pukul 04\.00 WIB$/,
    "potongan ' · ' harus persis kunci kamus EN (public/i18n/en.json), layar menerjemahkan per potongan");
  assert.equal(a[0].rincian, a[0].kalimat); assert.match(a[0].sumber, /bukan kepastian/);
  /* p 0,4 dalam 1 km = Siaga (bukan Awas); 8 km = tidak ada; p < 0,2 = tidak ada */
  const b = f({24: [[1, 0.4]]}); assert.deepEqual(ringkas(b), [[2, 0, 18]]); assert.equal(b[0].jarak_maks_km, 5); assert.equal(b[0].peluang, 0.4);
  assert.deepEqual(f({24: [[8, 0.9]], 48: [[8, 0.9]], 72: [[8, 0.9]]}), [], "8 km: tidak ada Waspada simulasi");
  assert.deepEqual(f({24: [[1, 0.15]]}), [], "p < 0,20");
  assert.deepEqual(ringkas(f({24: [[4.5, 0.25]]})), [[2, 0, 18]]);
  assert.deepEqual(f({24: [[30, 0.9]]}), []);
  /* kompleks terpangkas: paling tinggi Siaga */
  assert.deepEqual(ringkas(f({24: [[1, 0.9]]}, {extra: {terpangkas: true}})), [[2, 0, 18]]);
  /* peluang yang dilaporkan = sel penentu tingkat (Awas 0,5 bukan sel Siaga 0,9 di 4 km) */
  assert.equal(f({24: [[1, 0.5], [4, 0.9]]})[0].peluang, 0.5);
  /* cakrawala 24 jam sudah lewat (acuan 30 jam lalu): dilewati; 48 jam sisa 18 jam; label membulat naik ke 6 jam */
  assert.deepEqual(ringkas(f({24: [[1, 0.9]], 48: [[1, 0.9]]}, {ac: kini - 30 * JAM})), [[3, 0, 18]]);
  assert.deepEqual(ringkas(f({48: [[1, 0.9]]}, {ac: kini - 31 * JAM})), [[3, 0, 18]], "sisa 17 jam -> 18");
  assert.deepEqual(ringkas(f({72: [[1, 0.9]]}, {ac: kini - 3 * JAM})), [[3, 2, 72]], "sisa 69 jam -> 72, hari ke-3");
  /* sel kumulatif: sama di dua cakrawala = sekali; kenaikan di cakrawala lebih jauh tetap mengabari */
  assert.deepEqual(ringkas(f({24: [[1, 0.9]], 48: [[1, 0.9]]})), [[3, 0, 18]]);
  assert.deepEqual(ringkas(f({24: [[4, 0.3]], 48: [[1, 0.9], [4, 0.3]]})), [[3, 1, 42], [2, 0, 18]]);
  /* tanpa ± dan tanpa rentang "24–48" di teks mana pun */
  for (const x of [...a, ...b, ...f({48: [[1, 0.9]]})]) assert.ok(!/±|24–48|48–72/.test(x.judul + x.kalimat + x.rincian), x.judul);
  /* kata peluang */
  assert.deepEqual([0.2, 0.3, 0.45, 0.65].map(kataPeluang), ["kemungkinan kecil (sekitar 1 dari 5)", "sekitar 1 dari 3 kemungkinan", "sekitar 1 dari 2 kemungkinan", "lebih dari separuh kemungkinan"]);
  /* kompleks Aceh tidak pernah sampai ke pelanggan Papua; dan Aceh dekat ke pelanggan Aceh */
  const aceh = {kini, fwi: null, titik: [], cuaca: [], status: null, rob: null, jejak: E.indeksJejak({acuan: new Date(acuan).toISOString(), status: "ok", kompleks: [{id: "K0001", nama: "Kec. X, Kab. Aceh", hari: [{jam: 24, sel: [[ACEH.lat + 0.005, ACEH.lon, 0.7]]}]}]})};
  assert.deepEqual(E.nilaiTitik(aceh, PAPUA.lat, PAPUA.lon, "", h0), []);
  assert.equal(E.nilaiTitik(aceh, ACEH.lat, ACEH.lon, "", h0)[0].tingkat, 3);
  /* berdampingan dengan FWI: tingkat sama = kalimat simulasi yang menang; FWI lebih tinggi = FWI menang */
  const fwi = fw => ({grid: [{lat: -2.25, lon: 114.0, hari: [{tgl: h0, fwi: fw}]}]});
  const dasar = {kini, titik: [], cuaca: [], status: null, rob: null, jejak: E.indeksJejak(jejakFx({24: [[4, 0.3]]}, acuan))};
  assert.equal(E.nilaiTitik({...dasar, fwi: fwi(15)}, PAL.lat, PAL.lon, "", h0)[0].sumber_jenis, "simulasi", "Siaga FWI = Siaga simulasi: simulasi menang");
  assert.equal(E.nilaiTitik({...dasar, jejak: E.indeksJejak(jejakFx({24: [[4, 0.3]]}, acuan, undefined, undefined, {terpangkas: false})), fwi: fwi(15)}, PAL.lat, PAL.lon, "", h0)[0].sumber_jenis, "simulasi");
  assert.equal(E.nilaiTitik({...dasar, jejak: E.indeksJejak(jejakFx({24: [[8, 0.9]]}, acuan)), fwi: fwi(15)}, PAL.lat, PAL.lon, "", h0)[0].sumber_jenis, undefined, "FWI saja");
  /* id kompleks yang tidak aman dibuang saat memuat */
  assert.deepEqual(f({24: [[1, 0.9]]}, {id: 'K1"><img'}), []);
});

uji("simulasi: email memuat kalimat, kata peluang, cakupan, catatan kelemahan, tombol Lihat simulasi dengan id di-escape", () => {
  const p = {bencana: "karhutla", tingkat: 3, hari: 1, judul: "j", rincian: "x", kalimat: "Perkiraan model dari kompleks Kec. <i>X</i>: api bisa mencapai area dalam 2 km dari lokasimu dalam 30 jam, sekitar 1 dari 2 kemungkinan.", sumber: "s",
    sumber_jenis: "simulasi", kompleks: 'K1"><b>x', jarak_maks_km: 2, peluang: 0.5, jam_sisa: 30};
  const bangun = (peringatan, simulasi) => emailPeringatan({asal: "https://contoh.id", lat: -2.21, lon: 113.92, wilayah: {kec: "A", kab: "B", prov_nama: "C"}, peringatan, simulasi, tautanBerhenti: "https://contoh.id/b"});
  const a = bangun([p], {n_aktif: 1234, n_diramal: 987});
  assert.ok(a.html.includes("Lihat simulasi") && a.html.includes('href="https://contoh.id/sim/K1%22%3E%3Cb%3Ex"'), "id di-encode di URL");
  assert.ok(!a.html.includes("<b>x") && !a.html.includes("<i>X</i>"), "data di-escape");
  assert.ok(a.html.includes("dalam 30 jam") && a.html.includes("sekitar 1 dari 2 kemungkinan"));
  assert.ok(a.html.includes("Ini perkiraan model, bukan pengamatan.") && a.html.includes("kebakaran gambut dan kompleks besar"));
  assert.ok(a.html.includes("Simulasi hanya mencakup 987 dari 1.234 kompleks aktif hari ini; tidak ada peringatan simulasi bukan berarti aman."), "cakupan id-ID");
  assert.ok(a.text.includes("/sim/K1%22%3E%3Cb%3Ex") && a.text.includes("987 dari 1.234"));
  assert.ok(!/±|24–48/.test(a.html + a.text));
  const tanpaCakupan = bangun([p], null);
  assert.ok(tanpaCakupan.html.includes("Ini perkiraan model") && !tanpaCakupan.html.includes("kompleks aktif hari ini"), "tanpa cakupan: kalimat cakupan dihilangkan");
  const tanpa = bangun([{...p, sumber_jenis: undefined, kompleks: undefined}], null);
  assert.ok(!tanpa.html.includes("Lihat simulasi"), "peringatan karhutla biasa tanpa blok simulasi");
});

uji("simulasi e2e: Awas terkirim, dedupe, kenaikan terkirim, acuan basi diabaikan (basi_sumber), /api/ews/cek memuat bidang tambahan", async () => {
  const TA = T0 + 100 * JAM, em = "sim@contoh.id", opt = {kecKunci, f1: 3, tanpaBanjir: true};
  await daftarAktif(sub(em, PAL, ["karhutla"], true), mf5);
  const kirim = async (t, jejak, extra = {}) => { muat(t, {...opt, jejak, ...extra}); await cron(JAM_CRON, t, mf5); return untuk(em).slice(1).length; };
  assert.equal(await kirim(TA, {24: [[4, 0.3]]}), 1, "Siaga terkirim");
  assert.match(untuk(em).at(-1).subject, /^Siaga karhutla hari ini/);
  assert.equal(await kirim(TA + JAM, {24: [[4, 0.3]]}), 1, "tanpa perubahan: tidak ada email baru");
  assert.equal(await kirim(TA + 7 * JAM, {24: [[1, 0.7]]}, {jejakAcuan: TA + 7 * JAM - 6 * JAM}), 2, "naik ke Awas: email baru");
  const awas = untuk(em).at(-1);
  assert.match(awas.subject, /^Awas karhutla hari ini/);
  assert.ok(awas.html.includes("Lihat simulasi") && awas.html.includes(ASAL + "/sim/K0012") && awas.html.includes("dalam 2 km dari lokasimu") && awas.html.includes("lebih dari separuh kemungkinan") && awas.html.includes("8 dari 10 kompleks aktif"));
  const kunci = (await DB5.prepare("SELECT kunci FROM ews_terkirim").all()).results.map(r => r.kunci);
  assert.ok(kunci.includes(`karhutla-sim|K0012|${wib(TA + 7 * JAM)}|3`) && kunci.every(k => k.length <= 80), kunci.join());
  /* acuan lebih tua dari SIM_UMUR: diabaikan walau memuat sel Awas baru */
  assert.equal(await kirim(TA + 40 * JAM, {24: [[1, 0.9]], 48: [[0.5, 0.9]]}, {jejakAcuan: TA + 40 * JAM - E.SIM_UMUR - JAM}), 2, "acuan basi = tidak mengirim");
  assert.equal(await kirim(TA + 47 * JAM, {48: [[1, 0.9]]}, {jejakAcuan: TA + 47 * JAM - 30 * JAM}), 3, "acuan segar, cakrawala 24 jam sudah lewat, 48 jam masih: terkirim");
  assert.match(untuk(em).at(-1).html, /dalam 18 jam/);
  /* cek: bidang tambahan hanya pada butir simulasi; kunci tidak bocor */
  muat(Date.now(), {...opt, jejak: {24: [[1, 0.7]]}});
  const r = await panggil("GET", "/api/ews/cek?lat=-2.21&lon=113.92", undefined, ipBaru(), {}, mf5);
  assert.equal(r.s, 200, r.t); assert.ok(!r.j.basi_sumber.includes("jejak"), JSON.stringify(r.j.basi_sumber));
  assert.deepEqual([r.j.simulasi.n_aktif, r.j.simulasi.n_diramal], [10, 8]); assert.ok(r.j.simulasi.acuan);
  const s = r.j.peringatan.find(x => x.sumber_jenis === "simulasi");
  assert.deepEqual(Object.keys(s).sort(), "bencana,hari,jam_sisa,jarak_maks_km,judul,kalimat,kompleks,peluang,rincian,sumber,sumber_jenis,tingkat".split(","));
  assert.deepEqual([s.tingkat, s.hari, s.kompleks, s.jarak_maks_km, s.peluang], [3, 0, "K0012", 2, 0.7]);
  assert.ok(s.jam_sisa % 6 === 0 && s.kalimat.includes("dalam 2 km"));
});
