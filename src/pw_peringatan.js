/* Peringatan dini warga Pantau Bencana: rute /api/lapor/peringatan/* dan cron (paket data/kajian-bnpb/pwa-peringatan, PW-06, PW-07, PW-09).
   Fungsi murni (peristiwa, teks, penerima, titik) di src/pw_inti.js. D1 hanya lewat src/hak.js. */
import {Besok} from "./lapor_besok.js";
import {kirimKe, mati} from "./push.js";
import * as H from "./hak.js";
import {lajuIP} from "./bnpb.js";
import {JENIS_PW, MAKS_KEC, MAKS_LANGGANAN, PER_MENIT, endpointSah, tglWib, tahanSampai, hitungPeristiwa, hitungDariStatus, teksNotif, penerima, idLangganan, titikTerdekat, NAMA_HARI, label} from "./pw_inti.js";
const kunciSah = (p256dh, auth) => /^[A-Za-z0-9_-]{80,100}$/.test(p256dh || "") && /^[A-Za-z0-9_-]{20,30}$/.test(auth || "");

/* ---------------- rute /api/lapor/peringatan/* (dipetakan dari src/lapor_ai.js) ---------------- */
const P = H.pelakuPwPublik, C = H.pelakuPwCron;
const json = (kode, isi) => new Response(JSON.stringify(isi), {status: kode, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}});
const galat = (kode, pesan) => json(kode, {galat: pesan});
const JAM = 3600e3;
async function badan(req) { try { const t = await req.text(); if (t.length > 4000) return null; const o = JSON.parse(t || "{}"); return o && typeof o === "object" ? o : null; } catch { return null; } }
const kunciPublik = env => env.VAPID_PUBLIK_WARGA || "";
const siap = env => !!(env.VAPID_PUBLIK_WARGA && env.VAPID_PRIVAT_WARGA && /^(mailto:|https:\/\/)/.test(env.VAPID_SUBJEK || ""));

export function buatRutePeringatan({wilayah, muat}) {
  async function kecInfo(env, kode) {
    if (!/^\d{2}\.\d{2}\.\d{2}$/.test(kode || "")) return null;
    const d = (await wilayah(env).cariNama("", kode))[0];
    return d?.kec && d.kabKode ? {kec_kode: kode, kab_kode: d.kabKode.replace(".", ""), kec_nama: String(d.kec).slice(0, 80), prov: d.provKode, desa: d.kode} : null;
  }
  async function langganan(env, req, kini) {
    if (req.headers.get("x-pb") !== "1") return galat(403, "kiriman wajib membawa header x-pb: 1");
    const lj = await lajuIP(env, req, "pw.langganan", [[JAM, 10]], kini); if (lj) return lj;
    const b = await badan(req); if (!b) return galat(400, "Isi permintaan tidak terbaca.");
    if (!endpointSah(b.endpoint) || !kunciSah(b.kunci?.p256dh, b.kunci?.auth)) return galat(400, "Langganan peramban tidak sah.");
    const kodes = [...new Set((Array.isArray(b.kec) ? b.kec : []).map(String))].slice(0, MAKS_KEC + 1);
    if (!kodes.length || kodes.length > MAKS_KEC) return galat(400, `Pilih 1 sampai ${MAKS_KEC} kecamatan.`);
    const jenis = Number.isInteger(b.jenis) && b.jenis >= 1 && b.jenis <= 15 ? b.jenis : 15, ambang = [1, 2, 3].includes(b.ambang) ? b.ambang : 1, bahasa = b.bahasa === "en" ? "en" : "id";
    const info = []; for (const k of kodes) { const x = await kecInfo(env, k); if (!x) return galat(400, `Kecamatan ${k} tidak dikenal.`); info.push(x); }
    const lama = await H.pwMilik(env, P, b.endpoint);
    if (!lama.length && (await H.pwJumlah(env, P)) >= MAKS_LANGGANAN) return galat(503, "Kuota peringatan sedang penuh. Coba lagi nanti.");   // Q7
    const uji = env.PW_UJI === "1" && b.uji === true ? 1 : 0;
    const stmts = [H.pwHapusLainStmt(env, P, b.endpoint, info.map(x => x.kec_kode))];
    for (const x of info) stmts.push(H.pwSimpanStmt(env, P, {...x, id: await idLangganan(b.endpoint, x.kec_kode), endpoint: b.endpoint, p256dh: b.kunci.p256dh, auth: b.kunci.auth, jenis, ambang, bahasa, uji}, kini));
    await H.pwBatch(env, P, stmts);
    return json(200, {ok: true, kec: info.map(x => ({kode: x.kec_kode, nama: x.kec_nama})), jenis, ambang});
  }
  async function status(env, req, kini) {
    if (req.headers.get("x-pb") !== "1") return galat(403, "kiriman wajib membawa header x-pb: 1");
    const lj = await lajuIP(env, req, "pw.status", [[JAM, 60]], kini); if (lj) return lj;
    const b = await badan(req); if (!b || !endpointSah(b.endpoint)) return galat(400, "Langganan peramban tidak sah.");
    const r = await H.pwMilik(env, P, b.endpoint);
    return json(200, {aktif: r.length > 0, kec: r.map(x => ({kode: x.kec_kode, nama: x.kec_nama})), jenis: r[0]?.jenis ?? null, ambang: r[0]?.ambang ?? null});
  }
  async function berhenti(env, req, kini) {
    if (req.headers.get("x-pb") !== "1") return galat(403, "kiriman wajib membawa header x-pb: 1");
    const lj = await lajuIP(env, req, "pw.berhenti", [[JAM, 20]], kini); if (lj) return lj;
    const b = await badan(req); if (!b || !endpointSah(b.endpoint)) return galat(400, "Langganan peramban tidak sah.");
    await H.pwBerhenti(env, P, b.endpoint); return json(200, {ok: true});
  }
  /* arahan: tingkat 3 hari kab dari kecamatan, dan tiga titik berkumpul terdekat dari titik tengah desa pertama kecamatan atau GPS perangkat (tidak dicatat) */
  async function arah(env, req, url, kini) {
    const lj = await lajuIP(env, req, "pw.arah", [[JAM, 120]], kini); if (lj) return lj;
    const x = await kecInfo(env, String(url.searchParams.get("kec") || "")); if (!x) return galat(400, "Kecamatan tidak dikenal.");
    const lat = Number(url.searchParams.get("lat")), lon = Number(url.searchParams.get("lon"));
    let asal = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 12 && lon >= 94 && lon <= 142 ? {lat, lon} : null;
    if (!asal) { const c = await wilayah(env).pusat(x.desa); if (c) asal = {lat: c.lat, lon: c.lon}; }
    const [osm, ib, Pr] = await Promise.all([muat(env)(`/data/osm_nasional/${x.prov}.json`).catch(() => null), muat(env)(`/data/osm_nasional/ibadah/${x.prov}.json`).catch(() => null), muat(env)("/prediksi/data/prediksi.json").catch(() => null)]);
    const k = Pr?.kab?.find(r => r.id === x.kab_kode), KOL = Pr ? Object.fromEntries(Object.entries(Pr.kode).map(([c, v]) => [c, v.kol])) : {};
    const hari = k ? Pr.kode.HJN.hari.map((t, i) => ({tanggal: t, nama: NAMA_HARI(t), butir: JENIS_PW.map(([c]) => ({jenis: c, label: label(c), lv: Besok.levelKode(k, KOL, i + 1, c)})).filter(b => b.lv != null)})) : [];
    return new Response(JSON.stringify({kec: x.kec_nama, kab: k?.nama || null, hari, titik: asal ? titikTerdekat(asal, osm, ib) : [], catatan: "Jarak garis lurus, bukan rute. Tempat ini belum tentu ditetapkan sebagai titik evakuasi."}),
      {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, max-age=300"}});
  }
  /* cari kecamatan tanpa akun: hanya kecamatan (bukan desa), paling banyak 12 */
  async function cari(env, req, url, kini) {
    const lj = await lajuIP(env, req, "pw.cari", [[JAM, 300]], kini); if (lj) return lj;
    const q = String(url.searchParams.get("q") || "").slice(0, 60); if (q.trim().length < 2) return json(200, {hasil: []});
    const h = (await wilayah(env).cariNama(q, "")).filter(x => x.tingkat === "kec").slice(0, 12).map(x => ({kode: x.kode, judul: x.judul, sub: x.sub}));
    return json(200, {hasil: h});
  }
  return {
    "GET /api/lapor/peringatan/cari": (env, req, url) => cari(env, req, url, Date.now()),
    "GET /api/lapor/peringatan/kunci": async env => json(200, siap(env) ? {tersedia: true, publik: kunciPublik(env)} : {tersedia: false}),
    "POST /api/lapor/peringatan/langganan": (env, req) => langganan(env, req, Date.now()),
    "POST /api/lapor/peringatan/ubah": (env, req) => langganan(env, req, Date.now()),
    "POST /api/lapor/peringatan/status": (env, req) => status(env, req, Date.now()),
    "POST /api/lapor/peringatan/berhenti": (env, req) => berhenti(env, req, Date.now()),
    "GET /api/lapor/peringatan/arah": (env, req, url) => arah(env, req, url, Date.now()),
  };
}

/* ---------------- cron tiap menit (dipanggil scheduled() di src/worker.js) ---------------- */
const bacaStatus = async env => { try { const o = await env.MEDIA?.get("dampak_peringatan/status.json"); return o ? JSON.parse(await o.text()) : null; } catch { return null; } };
const TEMBOLOK = {d: null, t: 0};
export async function jalankanPeringatan(env, kini, muat) {
  if (!siap(env)) return {lewat: "kunci VAPID warga belum terpasang"};
  let ken; try { ken = await H.pwKendali(env, C); } catch (e) { if (/no such table/i.test(String(e?.message))) return {lewat: "migrasi 0163 belum diterapkan"}; throw e; }
  if (ken.jeda === "1") return {lewat: "jeda"};
  const hasil = {};
  if (!TEMBOLOK.d || kini - TEMBOLOK.t > 10 * 60e3) { const d = await muat(env)("/prediksi/data/prediksi.json").catch(() => null); if (d) Object.assign(TEMBOLOK, {d, t: kini}); }   // 200 KB: dibaca ulang tiap 10 menit
  const Pr = TEMBOLOK.d;
  const catat = (hitung, dibuat, penanda) => {
    const {perKab, status, nama} = hitung, stmts = [];
    for (const [kab, kab_ts, tgl, lv] of status) stmts.push(H.pwStatusStmt(env, C, kab, kab_ts, tgl, lv));
    for (const [kab, daftar] of perKab) stmts.push(H.pwPeristiwaStmt(env, C, dibuat, kab, JSON.stringify({nama: nama.get(kab), daftar}), kini, tahanSampai(kini, Math.max(...daftar.map(x => x.lv)))));
    stmts.push(penanda); return {stmts, n: perKab.size};
  };
  let tercatat = null;
  const muatTercatat = async () => tercatat ||= new Map((await H.pwStatusSemua(env, C, tglWib(kini))).map(r => [`${r.kab_kode}|${r.jenis}|${r.tanggal}`, r.level]));
  if (Pr?.dibuat && Pr.dibuat !== ken.dibuat_terakhir) {
    const {stmts, n} = catat(hitungPeristiwa(Pr, await muatTercatat(), kini), Pr.dibuat, H.pwKendaliStmt(env, C, "dibuat_terakhir", Pr.dibuat));
    await H.pwBatch(env, C, stmts); hasil.peristiwa = n;
  }
  // DP-13: pemicu kedua dari status prakiraan (R2 dampak_peringatan/status.json); berkas hilang atau rusak = tanpa push
  const tanda = await H.pwStatusDibuat(env, C).catch(e => /no such table/i.test(String(e?.message)) ? null : Promise.reject(e));   // null = migrasi 0184 belum ada
  const ada0184 = tanda !== null;
  if (!ada0184 && !TEMBOLOK.log) { TEMBOLOK.log = 1; console.error("migrasi 0184 belum diterapkan: pemicu status dan penjaga harian dilewati"); }
  const S = ada0184 ? await bacaStatus(env) : null;
  if (S?.dibuat && S.dibuat !== tanda) {
    const namaKab = new Map((Pr?.kab || []).map(k => [k.id, k.nama]));
    const {stmts, n} = catat(hitungDariStatus(S, await muatTercatat(), kini, namaKab), `status:${S.dibuat}`, H.pwStatusDibuatStmt(env, C, S.dibuat));
    await H.pwBatch(env, C, stmts); hasil.peristiwa_status = n;
  }
  const ev = await H.pwPeristiwaBerikut(env, C, kini); if (!ev) return hasil;
  const {nama, daftar} = JSON.parse(ev.ringkas), berlaku = daftar.filter(x => x.tanggal >= tglWib(kini));
  const baris = berlaku.length ? await H.pwPenerima(env, C, ev.kab_kode, ev.kursor, env.PW_UJI === "1") : [];
  const ambil = baris.slice(0, PER_MENIT), sisa = baris.length > PER_MENIT;
  const kirim = penerima(ambil, berlaku), envW = {...env, VAPID_PUBLIK: env.VAPID_PUBLIK_WARGA, VAPID_PRIVAT: env.VAPID_PRIVAT_WARGA};
  let ok = 0, gagal = 0, matiN = 0; const stmts = [], hariIni = tglWib(kini);
  const sudah = new Set((ada0184 ? await H.pwKirimHarian(env, C, ev.kab_kode, hariIni) : []).map(r => `${r.perangkat}|${r.jenis}`));   // penjaga harian lintas kedua pemicu (D30)
  for (const g of kirim) {
    const dev = await idLangganan(g.sub.endpoint, ""), daftarG = g.daftar.filter(x => !sudah.has(`${dev}|${x.jenis}`));
    if (!daftarG.length) continue;
    const [r] = await kirimKe(envW, [g.sub], teksNotif(nama, daftarG, g.kec), `pw${ev.kab_kode}`, kini);
    if (ada0184 && r.status >= 200 && r.status < 300) { for (const j of new Set(daftarG.map(x => x.jenis))) stmts.push(H.pwKirimHarianStmt(env, C, dev, ev.kab_kode, j, hariIni)); }
    if (r.status >= 200 && r.status < 300) ok++; else if (mati(r.status)) { matiN++; for (const b of ambil.filter(x => x.endpoint === g.sub.endpoint)) stmts.push(H.pwHapusIdStmt(env, C, b.id)); } else gagal++;
  }
  stmts.push(H.pwPeristiwaMajuStmt(env, C, ev.id, ambil.at(-1)?.id || ev.kursor, !sisa, ok, gagal, matiN));
  await H.pwBatch(env, C, stmts);
  return {...hasil, kirim: {kab: ev.kab_kode, ok, gagal, mati: matiN, sisa}};
}
const tolerir = e => { if (!/no such table/i.test(String(e?.message))) throw e; };
export const bersihPeringatan = async (env, kini) => {
  await H.pwBersih(env, C, kini, tglWib(kini - 30 * 864e5)).catch(tolerir);
  await H.pwBersihHarian(env, C, tglWib(kini - 30 * 864e5)).catch(tolerir);   // tabel 0184 boleh belum ada
};
