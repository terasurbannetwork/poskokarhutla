/* SIPPA P0 (DESAIN-TEKNIS SIPPA §1.3, §1.4, §4, §6, §8.5; skema migrations/0056_sippa_inti.sql): web /pipa untuk staf BNPB dan satu pintu tanpa akun /pipa/lapangan berkode penugasan.
   Cakupan tiket SP-008: cangkang halaman, kit, komponen, gerak, tugas, lapangan (kirim, foto), log + CSV, dummy. Rute data R2, A/B, skenario, laporan, telemetri menyusul (SP-029 dst).
   Aturan yang mengikat modul ini:
   - Jalur aksi SEBELUM id (/api/sippa/gerak/:id): router worker.js hanya mengenali :id (16 heks) di ujung jalur (ADR-04). Awalan /api/pipa/* milik src/pipa.js, tidak disentuh.
   - Hak diperiksa DULU di tiap rute: tamu 401 (juga sesi staf tanpa x-pb), masuk tetapi tidak berhak 403 polos tanpa pengalihan, di luar wilayah = tidak ada = 404 identik.
   - Batas laju hanya di rute TULIS dan kegagalan kode (ADR-06): tiap laju() = satu tulisan D1 dari kuota 100 rb/hari yang dipakai bersama seluruh situs. GET staf tanpa laju.
   - Tulisan butir lapangan memakai ON CONFLICT(id) DO NOTHING, tidak pernah INSERT OR IGNORE (ADR-08): IGNORE juga menelan pelanggaran CHECK dan NOT NULL, butir rusak hilang diam-diam.
   - Validasi masukan klien = server lewat cekButir dari public/pipa/formulir.js (ADR-03); trigger dan CHECK D1 adalah sumber kebenaran terakhir.
   ponytail: staf berwilayah disaring di JS sesudah SQL (dalamWilayahStaf, jumlah kit puluhan); bila kit atau log menembus ribuan, pindahkan ke WHERE prov IN (json_each). */
import {json, gagal, acak, bacaBody, bacaBytes, adminOK} from "./worker.js";
import {stafOK, stafSesi, stafNyata, dalamWilayahStaf, jejakStmt} from "./staf.js";
import {laju, kodeBaru, pemegangKode} from "./bnpb.js";
import {modOK, superOK, CSP_LAPANGAN} from "./posko.js";
import {pemirsaSesi} from "./pemirsa.js";
import {jenisBerkas} from "./foto.js";
import {bersihMedia} from "./media_bersih.js";
import {halamanSippa, halamanSippaLapangan, CSP_SIPPA} from "./admin_halaman.js";
import {cekButir, MEDAN, DIISI_SERVER, JENIS_TABEL, FORMULIR_VERSI} from "../public/pipa/formulir.js";

const JAM = 3600e3, HARI = 24 * JAM;
export const P_SIPPA_BACA = ["pusdalops", "koordalops", "pimpinan"], P_SIPPA_TULIS = ["pusdalops", "koordalops"];
export const LAYAR_SIPPA = ["peta", "hitung", "pemicu", "kit", "log", "ab", "studio", "3d", "telemetri", "laporan", "data"];
const STATUS = ["gudang", "depot", "gelar", "banjir", "servis", "hilang", "pensiun"], JENIS_KIT = ["gambut", "mineral", "banjir", "pinjam_pilot"], UNSUR = ["manggala_agni", "bpbd", "yontp", "mpa", "lain"];
const KONDISI = ["baik", "rusak_ringan", "rusak_berat", "hilang"], SATUAN = ["unit", "m", "set", "paket"], TEMPLAT = ["gambut", "mineral", "banjir"], JENIS_LOG = ["karhutla", "banjir", "latihan"];
const RE_ID = /^[0-9a-f]{16}$/, RE_PROV = /^\d{2}$/, RE_KODE_KIT = /^SIPPA-\d{3}$/, RE_BOM = /^[A-Z]{1,4}-\d{1,6}$/, RE_KOMPLEKS = /^K\d{1,10}$/, RE_MS = /^\d{1,15}$/;
const RE_UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, RE_PETAK = /^[A-Za-z0-9._ -]{1,40}$/;
const MAKS_KIRIM = 262144, MAKS_BUTIR = 200, MAKS_FOTO = 8388608, MAKS_LOG = 2000, MELESET_MS = 600000;

/* ================================================================ transisi kit (DT §6.2), harus sama dengan CHECK sippa_gerak di 0056 (diuji dari teks migrasi) */
const ke = (dari, tujuan) => dari.map(d => `${d}>${tujuan}`);
const DASAR = {
  pra_posisi: ke(["gudang", "banjir"], "depot"), gelar: ke(["gudang", "depot", "banjir"], "gelar"), bongkar: ["gelar>depot"], kembali: ke(["depot", "gelar", "banjir", "servis"], "gudang"),
  pindah_banjir: ke(["gudang", "depot", "gelar"], "banjir"), servis: ke(["gudang", "depot", "gelar", "banjir"], "servis"), hilang: ke(["gudang", "depot", "gelar", "banjir", "servis"], "hilang"),
  ditemukan: ["hilang>gudang"], pensiun: ke(["gudang", "servis", "hilang"], "pensiun"),
};
export const ALASAN_TRANSISI = {...DASAR, koreksi: [...new Set(Object.values(DASAR).flat())]};
const MOD_SAJA = ["hilang", "ditemukan", "pensiun", "koreksi"], OPERATOR = ["gelar", "bongkar", "kembali"], WAJIB_CATATAN = ["hilang", "koreksi"], RENCANA_BOLEH = ["pra_posisi", "pindah_banjir"];

/* ================================================================ templat BOM kit (PRD §6.1, §6.3; kelas kinerja "atau setara", tanpa merek) */
const B = (kode_bom, nama, jumlah, satuan) => ({kode_bom, nama, jumlah, satuan});
const KESELAMATAN = B("Q-101", "Perlengkapan keselamatan: APD 20 orang, monitor gas CO, P3K", 1, "paket");
const GAMBUT = [
  B("P-101", "Pompa portabel kelas 1.500 L/min pada 1,0 MPa, bensin, atau setara", 2, "unit"), B("H-101", "Layflat DN100 bersertifikat, gulung 100 m", 1000, "m"), B("H-201", "Layflat DN65", 500, "m"),
  B("H-301", "Selang serang 38 mm dengan nozzle variabel", 4, "set"), B("I-101", "Lance injeksi SS316 1,5 m dengan ball valve", 8, "unit"), B("M-101", "Manifold DN100 ke 4 x DN65 dengan katup bola", 2, "unit"),
  B("C-101", "Kopling Storz DN100 dan DN65 dengan adaptor pompa", 20, "unit"), B("ST-101", "Selang hisap dengan foot valve dan strainer kasar", 2, "unit"), B("SF-101", "Filter servis dengan bypass", 2, "unit"),
  B("V-101", "Katup isolasi, katup cek, dan pelepas udara", 2, "set"), B("FT-101", "Flowmeter totalizer", 2, "unit"), B("PT-101", "Sensor tekanan hisap, buang, dan distal", 4, "unit"),
  B("T-101", "Node suhu gambut empat kedalaman", 8, "unit"), B("GWT-101", "Piezometer atau logger muka air tanah", 2, "unit"), B("U-102", "Gateway telemetri dengan logger tepi", 1, "unit"), KESELAMATAN];
const TEMPLAT_BOM = {
  gambut: GAMBUT,
  /* kit mineral dan sabana: tanpa I-101, T-101, GWT-101; layflat DN100 800 m (PRD §6.1) */
  mineral: GAMBUT.filter(k => !["I-101", "T-101", "GWT-101"].includes(k.kode_bom)).map(k => k.kode_bom === "H-101" ? {...k, jumlah: 800} : k),
  banjir: [B("PB-101", "Pompa banjir portabel 100 L/s pada head 3 sampai 5 m", 1, "unit"), B("H-401", "Layflat DN150", 300, "m"), B("F-101", "Pelampung dan jangkar intake", 1, "set"), B("V-401", "Katup cek dan selang buang", 1, "set"), KESELAMATAN],
};

/* ================================================================ pembungkus, hak, wilayah */
const tanpaTabel = e => /no such table: (main\.)?sippa_/i.test(String(e?.message || e));
/* tiap handler API: tabel 0056 belum ada = 503 sopan (kode yang tiba sebelum migrasi tetap aman); header pribadi pada semua jawaban */
export function bungkusSippa(f) {
  return async (...a) => {
    let r;
    try { r = await f(...a); }
    catch (e) { if (!tanpaTabel(e)) throw e; r = json({galat: "Migrasi SIPPA belum diterapkan di basis data", status: "tanpa_migrasi"}, 503); }
    const h = new Headers(r.headers);
    if (!h.has("cache-control") || h.get("cache-control") === "no-store") h.set("cache-control", "private, no-store");
    h.set("vary", "cookie"); h.set("x-content-type-options", "nosniff");
    return new Response(r.body, {status: r.status, headers: h});
  };
}
/* t: B baca, W tulis, M moderator, SA Super Admin. {oleh} bila berhak, {res} (401 atau 403) bila tidak. 401 = belum masuk (termasuk sesi staf tanpa x-pb), 403 = masuk tetapi tidak berhak. */
/* admin = moderator ke atas (modOK) atau staf berperan; akun gerbang AKUN_SITUS BUKAN staf BNPB (keputusan pemilik 32, DT §1.4 butir 5): 403 */
const adminAtauStaf = async (env, req, peran) => await modOK(env, req) || (await adminOK(env, req) ? null : await stafOK(env, req, peran));
async function akses(env, req, t) {
  const oleh = t === "SA" ? await superOK(env, req) : t === "M" ? await modOK(env, req) : await adminAtauStaf(env, req, t === "B" ? P_SIPPA_BACA : P_SIPPA_TULIS);
  if (oleh) { DM.set(req, dummyStaf(req, oleh)); return {oleh}; }
  const masuk = await adminOK(env, req) || await stafSesi(env, req) || await pemirsaSesi(env, req);
  return {res: masuk ? gagal(403, "akunmu tidak punya hak untuk aksi ini") : gagal(401, "perlu masuk sebagai staf BNPB")};
}
const DM = new WeakMap();   // permintaan -> 1 bila pelakunya akun staf dummy (hanya boleh MENULIS ke baris dummy; membaca boleh keduanya)
const loDummy = req => DM.get(req) ?? 0;
const lihatDummy = req => stafNyata(req) ? 0 : 1;   // baris dummy hanya untuk admin dan akun staf dummy
const dummyStaf = (req, oleh) => oleh.startsWith("staf:") && !stafNyata(req) ? 1 : 0;
const dalam = (req, prov) => dalamWilayahStaf(req, prov == null ? [] : [prov]);
const batasJam = (env, kunci, aksi, maks, kini) => laju(env, kunci, aksi, [[JAM, maks]], kini);
const alihkan = (ke2, h = {}) => new Response(null, {status: 303, headers: {location: ke2, "cache-control": "no-store", ...h}});
const gal = c => gagal(400, c.galat.map(g => `${g.medan}: ${g.pesan}`).join("; "));
const teksOK = (v, min, maks) => typeof v === "string" && v.normalize("NFC").trim().length >= min && v.trim().length <= maks ? v.normalize("NFC").trim() : undefined;
const bersihGalat = e => { const m = String(e?.message || e).replace(/^D1_ERROR:\s*/, "").replace(/:?\s*SQLITE_\w+.*$/s, "").slice(0, 200); return /^sippa_\w+:/.test(m) ? m : "basis data menolak butir: " + m; };
const galatKeadaan = e => /sippa_gerak_(cek|tetap)/.test(String(e?.message || e));

/* ================================================================ halaman */
const H_HAL = {"content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", vary: "cookie", "content-security-policy": CSP_SIPPA, "x-robots-tag": "noindex, nofollow", "referrer-policy": "same-origin",
  "x-content-type-options": "nosniff", "x-frame-options": "DENY"};
const polos403 = () => new Response(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>SIPPA, Centurisk97</title></head><body><p>Akunmu tidak punya akses SIPPA.</p></body></html>`, {status: 403, headers: H_HAL});
/* admin (token, akun gerbang, sesi) atau staf berperan P_SIPPA_BACA; sesi sah tanpa peran = 403 polos tanpa pengalihan (cegah pantulan tanpa akhir); tamu = 303 ke Meja Pantau dengan ?ke= */
async function halaman(env, req, url, layar) {
  let ctx;
  if (await modOK(env, req)) ctx = {nama: "Admin", peran: ["admin"], tulis: true, mod: true, super: !!await superOK(env, req)};
  else if (await adminOK(env, req)) return polos403();   // akun gerbang: bukan staf BNPB
  else {
    const s = await stafSesi(env, req);
    if (s) {
      if (!s.peran.some(p => P_SIPPA_BACA.includes(p))) return polos403();
      ctx = {nama: s.nama, peran: s.peran, tulis: s.peran.some(p => P_SIPPA_TULIS.includes(p)), mod: false, super: false};
    } else if (await pemirsaSesi(env, req)) return polos403();
    else return alihkan("/admin/pantau?ke=" + encodeURIComponent(url.pathname + url.search));
  }
  return new Response(halamanSippa(layar, ctx), {headers: H_HAL});
}
const halamanLapangan = () => new Response(halamanSippaLapangan(), {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow", "content-security-policy": CSP_LAPANGAN}});

/* ================================================================ kit */
const cariTugas = kini => env => kodeSha => env.DB.prepare("SELECT id, kit_id, nama_regu, unsur, prov, kab, kompleks_id, lengan_dalam, mulai, berakhir, dummy FROM sippa_tugas WHERE kode_sha = ? AND dicabut IS NULL AND mulai <= ? AND berakhir > ?")
  .bind(kodeSha, kini, kini).first();
const pegang = (env, req, kini) => pemegangKode(env, req, "sippa", cariTugas(kini)(env), kini);
/* kit yang boleh dilihat pemanggil: dummy sesuai peran, wilayah staf; provinsi tujuan ikut melihat selama gerak terbuka. null = tidak ada (404 identik) */
async function kitLihat(env, req, id) {
  const k = await env.DB.prepare("SELECT * FROM sippa_kit WHERE id = ? AND dummy <= ?").bind(id, lihatDummy(req)).first();
  if (!k) return null;
  if (dalam(req, k.prov)) return k;
  const g = await env.DB.prepare("SELECT prov FROM sippa_gerak WHERE kit_id = ? AND tiba IS NULL").bind(id).first();
  return g && dalam(req, g.prov) ? k : null;
}
const kitTulis = async (env, req, id) => { const k = await env.DB.prepare("SELECT * FROM sippa_kit WHERE id = ? AND dummy <= ? AND dummy >= ?").bind(id, lihatDummy(req), loDummy(req)).first(); return k && dalam(req, k.prov) ? k : null; };
async function bacaJsonByte(req, maks) {
  const r = await bacaBytes(req, maks); if (r.galat) return r;
  try { const o = JSON.parse(new TextDecoder().decode(r.b) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? {o} : {galat: "body harus objek JSON"}; } catch (e) { return {galat: "body bukan JSON"}; }
}
const tdk = pesan => gagal(404, pesan);
const awalMusim = (musim, kini) => { const d = new Date(kini), t = d.getUTCFullYear(); return musim === "banjir" ? Date.UTC(d.getUTCMonth() >= 10 ? t : t - 1, 10, 1) : Date.UTC(t, 4, 1); };   // 1 Mei karhutla, 1 November banjir (DT §6.2)
const persen = (h, n) => n > 0 ? Math.round(1000 * h / n) / 10 : null;

async function kitDaftar(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const q = url.searchParams, status = q.get("status"), jenis = q.get("jenis"), prov = q.get("prov"), musim = q.get("musim") ?? "karhutla";
  if (status !== null && !STATUS.includes(status)) return gagal(400, `status harus salah satu dari ${STATUS.join(", ")}`);
  if (jenis !== null && !JENIS_KIT.includes(jenis)) return gagal(400, `jenis harus salah satu dari ${JENIS_KIT.join(", ")}`);
  if (prov !== null && !RE_PROV.test(prov)) return gagal(400, "prov harus kode provinsi 2 digit");
  if (musim !== "karhutla" && musim !== "banjir") return gagal(400, "musim harus karhutla atau banjir");
  const lihat = lihatDummy(req), awal = awalMusim(musim, kini), ph = [lihat], w = ["dummy <= ?"];
  if (status) { w.push("status = ?"); ph.push(status); } if (jenis) { w.push("jenis = ?"); ph.push(jenis); } if (prov) { w.push("prov = ?"); ph.push(prov); }
  const [kits, buka, komp, pakai] = await Promise.all([
    env.DB.prepare(`SELECT * FROM sippa_kit WHERE ${w.join(" AND ")} ORDER BY kode`).bind(...ph).all(),
    env.DB.prepare("SELECT kit_id, ke_status, eta_jam, waktu, prov FROM sippa_gerak WHERE tiba IS NULL").all(),
    env.DB.prepare(`SELECT kit_id, sum(musim_awal) n_awal, sum(CASE WHEN musim_awal = 1 AND kondisi = 'hilang' THEN 1 ELSE 0 END) hilang_awal, sum(CASE WHEN kondisi = 'hilang' THEN 1 ELSE 0 END) kurang FROM sippa_komponen GROUP BY kit_id`).all(),
    env.DB.prepare(`SELECT kit_id, prov, jam_pompa, banjir_m3 FROM sippa_log_gelar l WHERE kit_id IS NOT NULL AND dummy <= ? AND coalesce(t_tiba, waktu_klien) >= ?
      AND NOT EXISTS (SELECT 1 FROM sippa_log_gelar x WHERE x.koreksi_dari = l.id)`).bind(lihat, awal).all()]);
  const gb = new Map(buka.results.map(g => [g.kit_id, g])), km = new Map(komp.results.map(c => [c.kit_id, c])), pk = new Map();
  for (const p of pakai.results) if (dalam(req, p.prov)) { const a2 = pk.get(p.kit_id) ?? {jam: 0, banjir: 0}; a2.jam += p.jam_pompa ?? 0; a2.banjir += p.banjir_m3 ?? 0; pk.set(p.kit_id, a2); }   // hanya log provinsi di wilayah pemanggil
  const lihatKit = kits.results.filter(k => dalam(req, k.prov) || (gb.has(k.id) && dalam(req, gb.get(k.id).prov)));
  let nAwal = 0, hAwal = 0; const perKit = {};
  const out = lihatKit.map(k => {
    const c = km.get(k.id), p = pk.get(k.id), g = gb.get(k.id);
    nAwal += c?.n_awal ?? 0; hAwal += c?.hilang_awal ?? 0; perKit[k.id] = persen(c?.hilang_awal ?? 0, c?.n_awal ?? 0);
    return {id: k.id, kode: k.kode, jenis: k.jenis, status: k.status, lokasi: k.lokasi, lat: k.lat, lon: k.lon, prov: k.prov, kab: k.kab, pemilik_asal: k.pemilik_asal, diubah: k.diubah, dummy: k.dummy,
      komponen_kurang: c?.kurang ?? 0, jam_pompa_musim: p?.jam ?? 0, banjir_m3_musim: p?.banjir ?? 0, gerak_buka: g ? {ke_status: g.ke_status, eta_jam: g.eta_jam, waktu: g.waktu} : null};
  });
  return json({kit: await kasar(env, req, out), kehilangan: {musim_pct: persen(hAwal, nAwal), per_kit: perKit}});
}
async function kitRincian(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const k = await kitLihat(env, req, id); if (!k) return tdk("kit tidak ada");
  const lihat = lihatDummy(req), q = (sql, ...p) => env.DB.prepare(sql).bind(...p).all().then(r => r.results);
  const [komponen, gerak, pemakaian, bbm, tugas] = await Promise.all([
    q("SELECT * FROM sippa_komponen WHERE kit_id = ? ORDER BY kode_bom", id), q("SELECT * FROM sippa_gerak WHERE kit_id = ? ORDER BY waktu DESC LIMIT 200", id),
    q("SELECT id, prov, jenis, kelas_medan, t_tiba, t_air_mengalir, t_selesai, jam_pompa, bbm_l, air_m3, banjir_m3, petak_id FROM sippa_log_gelar WHERE kit_id = ? AND dummy <= ? ORDER BY coalesce(t_tiba, waktu_klien) DESC LIMIT 200", id, lihat),
    q("SELECT * FROM sippa_bbm WHERE kit_id = ? AND dummy <= ? ORDER BY waktu DESC LIMIT 200", id, lihat),
    q("SELECT id, kit_id, nama_regu, unsur, prov, kab, kompleks_id, lengan_dalam, mulai, berakhir, dicabut, oleh, dummy FROM sippa_tugas WHERE kit_id = ? AND dummy <= ? ORDER BY mulai DESC LIMIT 100", id, lihat)]);
  const [kk, gg] = await Promise.all([kasar(env, req, [k]), kasar(env, req, gerak)]);
  return json({kit: kk[0], komponen, gerak: gg, pemakaian: pemakaian.filter(l => dalam(req, l.prov)), bbm, tugas});
}
async function kitBuat(env, req, url, kini) {
  const a = await akses(env, req, "M"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.kit_buat", 60, kini); if (l) return l;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, opsi = (v, min, maks) => v == null ? null : teksOK(v, min, maks);
  if (typeof o.kode !== "string" || !RE_KODE_KIT.test(o.kode) || o.kode >= "SIPPA-900") return gagal(400, "kode harus SIPPA-### dan di bawah SIPPA-900 (900 ke atas khusus dummy)");
  if (!JENIS_KIT.includes(o.jenis)) return gagal(400, `jenis harus salah satu dari ${JENIS_KIT.join(", ")}`);
  const templat = o.templat ?? (o.jenis === "banjir" ? "banjir" : o.jenis === "mineral" ? "mineral" : "gambut"); if (!TEMPLAT.includes(templat)) return gagal(400, `templat harus salah satu dari ${TEMPLAT.join(", ")}`);
  const pemilik = o.pemilik_asal == null ? "BMN BNPB" : teksOK(o.pemilik_asal, 3, 80); if (pemilik === undefined) return gagal(400, "pemilik_asal 3 sampai 80 karakter");
  const lokasi = opsi(o.lokasi, 0, 120), kab = opsi(o.kab, 0, 60), catatan = opsi(o.catatan, 0, 1000);
  if (lokasi === undefined) return gagal(400, "lokasi paling banyak 120 karakter"); if (kab === undefined) return gagal(400, "kab paling banyak 60 karakter"); if (catatan === undefined) return gagal(400, "catatan paling banyak 1000 karakter");
  if (o.prov != null && !(typeof o.prov === "string" && RE_PROV.test(o.prov))) return gagal(400, "prov harus kode provinsi 2 digit");
  if (o.prov != null && !dalam(req, o.prov)) return tdk("wilayah tidak tersedia");
  if (await env.DB.prepare("SELECT 1 FROM sippa_kit WHERE kode = ?").bind(o.kode).first()) return gagal(409, "kode kit sudah dipakai");
  const id = acak(8), dm = dummyStaf(req, a.oleh);
  const stm = [env.DB.prepare("INSERT INTO sippa_kit (id, kode, jenis, status, lokasi, prov, kab, pemilik_asal, catatan, dibuat, diubah, dummy) VALUES (?, ?, ?, 'gudang', ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, o.kode, o.jenis, lokasi || null, o.prov ?? null, kab || null, pemilik, catatan || null, kini, kini, dm),
    ...TEMPLAT_BOM[templat].map(k => env.DB.prepare("INSERT INTO sippa_komponen (id, kit_id, kode_bom, nama, jumlah, satuan, dummy) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(acak(8), id, k.kode_bom, k.nama, k.jumlah, k.satuan, dm)),
    jejakStmt(env, a.oleh, "sippa_kit:" + id, "buat", o.kode, `templat ${templat}`, kini, dm)];
  try { await env.DB.batch(stm); } catch (e) { if (/UNIQUE constraint failed: sippa_kit\.kode/.test(String(e?.message || e))) return gagal(409, "kode kit sudah dipakai"); throw e; }
  return json({kit: await env.DB.prepare("SELECT * FROM sippa_kit WHERE id = ?").bind(id).first(), komponen: TEMPLAT_BOM[templat].length}, 201);
}
async function kitUbah(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tulis", 600, kini); if (l) return l;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, kunci = Object.keys(o);
  if (!kunci.length || kunci.some(k => k !== "lokasi" && k !== "catatan")) return gagal(400, "hanya lokasi dan catatan yang bisa diubah di sini; status berubah lewat gerak");
  const batas = {lokasi: 120, catatan: 1000}, nilai = {};
  for (const k of kunci) { const v = o[k] === null ? null : teksOK(o[k], 0, batas[k]); if (v === undefined) return gagal(400, `${k} harus teks paling banyak ${batas[k]} karakter`); nilai[k] = v || null; }
  const kit = await kitTulis(env, req, id); if (!kit) return tdk("kit tidak ada");
  await env.DB.batch([env.DB.prepare("UPDATE sippa_kit SET lokasi = ?, catatan = ?, diubah = ? WHERE id = ?").bind("lokasi" in nilai ? nilai.lokasi : kit.lokasi, "catatan" in nilai ? nilai.catatan : kit.catatan, kini, id),
    jejakStmt(env, a.oleh, "sippa_kit:" + id, "ubah", null, kunci.join(","), kini, dummyStaf(req, a.oleh))]);
  return json({kit: await env.DB.prepare("SELECT * FROM sippa_kit WHERE id = ?").bind(id).first()});
}
async function komponenUbah(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tulis", 600, kini); if (l) return l;
  const b = await bacaBody(req, 65536); if (b.galat) return gagal(b.status || 400, b.galat);
  const catAtas = b.o.catatan;   // klien "Cek komponen" mengirim catatan sekali di atas; dipakai bila butir tanpa catatan sendiri
  if (catAtas != null && teksOK(catAtas, 0, 300) === undefined) return gagal(400, "catatan paling banyak 300 karakter");
  const ubah = (b.o.ubah ?? []), baru = b.o.baru ?? [];
  if (Array.isArray(ubah)) for (const u of ubah) if (u && typeof u === "object" && u.catatan == null && catAtas != null) u.catatan = catAtas;
  if (!Array.isArray(ubah) || !Array.isArray(baru)) return gagal(400, "ubah dan baru harus larik");
  if (!ubah.length && !baru.length) return gagal(400, "tidak ada perubahan");
  if (ubah.length + baru.length > 100) return gagal(400, "paling banyak 100 perubahan per kiriman");
  for (const u of ubah) {
    if (!u || typeof u !== "object" || !RE_ID.test(u.id)) return gagal(400, "ubah[].id harus id komponen 16 heks");
    if (u.kondisi === undefined && u.nomor_seri === undefined && u.dicek !== true) return gagal(400, "ubah[] tanpa kondisi, nomor_seri, atau dicek");
    if (u.kondisi !== undefined && !KONDISI.includes(u.kondisi)) return gagal(400, `kondisi harus salah satu dari ${KONDISI.join(", ")}`);
    if (u.kondisi === "hilang" && !teksOK(u.catatan, 3, 300)) return gagal(400, "kondisi hilang wajib catatan (3 sampai 300 karakter)");
    if (u.catatan != null && teksOK(u.catatan, 0, 300) === undefined) return gagal(400, "catatan paling banyak 300 karakter");
    if (u.nomor_seri != null && teksOK(u.nomor_seri, 0, 60) === undefined) return gagal(400, "nomor_seri paling banyak 60 karakter");
  }
  for (const n of baru) {
    if (!n || typeof n !== "object" || typeof n.kode_bom !== "string" || !RE_BOM.test(n.kode_bom)) return gagal(400, "baru[].kode_bom harus berbentuk P-101 (huruf besar, tanda hubung, angka)");
    if (!teksOK(n.nama, 2, 120)) return gagal(400, "baru[].nama 2 sampai 120 karakter");
    if (typeof n.jumlah !== "number" || !(n.jumlah > 0 && n.jumlah <= 100000)) return gagal(400, "baru[].jumlah harus lebih dari 0 dan paling banyak 100000");
    if (!SATUAN.includes(n.satuan)) return gagal(400, `baru[].satuan harus salah satu dari ${SATUAN.join(", ")}`);
    if (n.nomor_seri != null && teksOK(n.nomor_seri, 0, 60) === undefined) return gagal(400, "nomor_seri paling banyak 60 karakter");
  }
  const kit = await kitTulis(env, req, id); if (!kit) return tdk("kit tidak ada");
  const milik = new Set((await env.DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ?").bind(id).all()).results.map(r => r.id));
  for (const u of ubah) if (!milik.has(u.id)) return gagal(400, `komponen ${u.id} bukan milik kit ini`);
  const dm = dummyStaf(req, a.oleh), stm = [];
  for (const u of ubah) {
    const set = [], p = [];
    if (u.kondisi !== undefined) { set.push("kondisi = ?"); p.push(u.kondisi); }
    if (u.nomor_seri !== undefined) { set.push("nomor_seri = ?"); p.push(teksOK(u.nomor_seri, 0, 60) || null); }
    if (u.dicek === true) { set.push("dicek = ?"); p.push(kini); }
    stm.push(env.DB.prepare(`UPDATE sippa_komponen SET ${set.join(", ")} WHERE id = ?`).bind(...p, u.id), jejakStmt(env, a.oleh, "sippa_komponen:" + u.id, "ubah", u.kondisi ?? null, teksOK(u.catatan, 0, 300) || null, kini, dm));
  }
  for (const n of baru) {
    const nid = acak(8);
    stm.push(env.DB.prepare("INSERT INTO sippa_komponen (id, kit_id, kode_bom, nama, jumlah, satuan, nomor_seri, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(nid, id, n.kode_bom, teksOK(n.nama, 2, 120), n.jumlah, n.satuan, teksOK(n.nomor_seri, 0, 60) || null, kit.dummy),
      jejakStmt(env, a.oleh, "sippa_komponen:" + nid, "baru", n.kode_bom, null, kini, dm));
  }
  await env.DB.batch(stm);
  return json({berubah: ubah.length, baru: baru.length});
}

/* ================================================================ gerak dan tiba */
const GERAK_SERVER = ["id", "dari_status", "waktu", "tiba"];
async function gerakRute(env, req, url, kini, ctx, kitId) {
  const kode = req.headers.has("x-kode");   // ada header x-kode = jalur operator; staf tidak pernah mengirimnya
  let oleh, tugas = null;
  if (kode) {
    tugas = await pegang(env, req, kini); if (tugas instanceof Response) return tugas;
    if (tugas.kit_id !== kitId) return gagal(403, "kode ini tidak berlaku untuk kit itu");
    oleh = "tugas:" + tugas.id;
    const l = await batasJam(env, oleh, "sippa.lapangan", 120, kini); if (l) return l;
  } else {
    const a = await akses(env, req, "W"); if (a.res) return a.res; oleh = a.oleh;
    const l = await batasJam(env, oleh, "sippa.tulis", 600, kini); if (l) return l;
  }
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const alasan = b.o.alasan;
  if (typeof alasan !== "string" || !Object.hasOwn(ALASAN_TRANSISI, alasan)) return gagal(400, `alasan harus salah satu dari ${Object.keys(ALASAN_TRANSISI).join(", ")}`);
  if (tugas && !OPERATOR.includes(alasan)) return gagal(403, "operator hanya boleh alasan gelar, bongkar, atau kembali");
  if (MOD_SAJA.includes(alasan) && !tugas && !await modOK(env, req)) return gagal(403, `alasan ${alasan} hanya untuk moderator`);
  const kit = tugas ? await env.DB.prepare("SELECT * FROM sippa_kit WHERE id = ?").bind(kitId).first() : await kitTulis(env, req, kitId); if (!kit) return tdk("kit tidak ada");
  const inti = Object.fromEntries(Object.entries(b.o).filter(([k]) => !GERAK_SERVER.includes(k)));
  const butir = {...inti, id: acak(8), dari_status: kit.status, waktu: kini, rencana: inti.rencana ?? 0}; if (butir.rencana !== 1) butir.tiba = kini;
  const c = cekButir("gerak", butir); if (!c.ok) return gal(c);
  if (!ALASAN_TRANSISI[alasan].includes(`${kit.status}>${butir.ke_status}`)) return gagal(400, `transisi ${kit.status} ke ${butir.ke_status} tidak sah untuk alasan ${alasan}`);
  if (WAJIB_CATATAN.includes(alasan) && !teksOK(butir.catatan, 3, 500)) return gagal(400, `alasan ${alasan} wajib catatan (minimal 3 karakter)`);
  if (alasan === "pindah_banjir" && (!butir.pengangkut || !teksOK(butir.permintaan_dari, 2, 120))) return gagal(400, "pindah_banjir wajib pengangkut dan permintaan_dari");
  if (butir.rencana === 1 && !RENCANA_BOLEH.includes(alasan)) return gagal(400, "gerak terencana hanya untuk pra_posisi dan pindah_banjir");
  if (butir.prov != null && !dalam(req, butir.prov)) return tdk("wilayah tidak tersedia");
  if (tugas) { if (butir.prov != null && butir.prov !== tugas.prov) return gagal(403, "operator hanya boleh bergerak di provinsi tugasnya"); if (butir.prov != null) butir.kab = tugas.kab; else delete butir.kab; }   // prov sama dengan tugas; kab dari tugas, bukan klien; tanpa prov lokasi kit tidak disentuh
  if (await env.DB.prepare("SELECT 1 FROM sippa_gerak WHERE kit_id = ? AND tiba IS NULL").bind(kitId).first()) return gagal(409, "kit masih punya gerak terencana yang belum tiba");
  const dm = tugas ? tugas.dummy : dummyStaf(req, oleh) || kit.dummy;
  const stm = tulisButir(env, "gerak", butir, {kit_id: kitId, tugas_id: tugas?.id ?? null, oleh, dummy: kit.dummy});
  try { await env.DB.batch([stm, jejakStmt(env, oleh, "sippa_gerak:" + butir.id, "gerak", `${kit.status}>${butir.ke_status}`.slice(0, 40), alasan, kini, dm)]); }
  catch (e) { if (galatKeadaan(e)) return gagal(409, "status kit sudah berubah atau masih ada gerak terencana; muat ulang lalu ulangi"); throw e; }
  const [gerak, kitBaru] = await Promise.all([env.DB.prepare("SELECT * FROM sippa_gerak WHERE id = ?").bind(butir.id).first(), env.DB.prepare("SELECT * FROM sippa_kit WHERE id = ?").bind(kitId).first()]);
  return json({gerak, kit: kitBaru}, 201);
}
async function tibaRute(env, req, url, kini, ctx, gid) {
  const kode = req.headers.has("x-kode");
  let oleh, tugas = null;
  if (kode) {
    tugas = await pegang(env, req, kini); if (tugas instanceof Response) return tugas;
    oleh = "tugas:" + tugas.id; const l = await batasJam(env, oleh, "sippa.lapangan", 120, kini); if (l) return l;
  } else {
    const a = await akses(env, req, "W"); if (a.res) return a.res; oleh = a.oleh;
    const l = await batasJam(env, oleh, "sippa.tiba", 120, kini); if (l) return l;
  }
  const g = await env.DB.prepare("SELECT g.*, k.prov AS kprov FROM sippa_gerak g JOIN sippa_kit k ON k.id = g.kit_id WHERE g.id = ? AND g.dummy <= ? AND g.dummy >= ?").bind(gid, tugas ? 1 : lihatDummy(req), tugas ? 0 : loDummy(req)).first();
  if (!g || (!tugas && !dalam(req, g.prov) && !dalam(req, g.kprov))) return tdk("gerak tidak ada");
  if (tugas && g.kit_id !== tugas.kit_id) return gagal(403, "kode ini tidak berlaku untuk kit itu");
  if (g.rencana !== 1) return gagal(400, "hanya gerak terencana yang dikonfirmasi tiba");
  if (g.tiba != null) return gagal(409, "gerak ini sudah tiba");
  try {
    const r = await env.DB.batch([env.DB.prepare("UPDATE sippa_gerak SET tiba = ? WHERE id = ? AND tiba IS NULL").bind(kini, gid),
      jejakStmt(env, oleh, "sippa_gerak:" + gid, "tiba", g.ke_status, null, kini, tugas ? tugas.dummy : dummyStaf(req, oleh) || g.dummy)]);
    if (!r[0].meta.changes) return gagal(409, "gerak ini sudah tiba");
  } catch (e) { if (galatKeadaan(e)) return gagal(409, "status kit sudah berubah sejak gerak direncanakan; periksa kit lalu rencanakan ulang"); throw e; }
  const [gerak, kit] = await Promise.all([env.DB.prepare("SELECT * FROM sippa_gerak WHERE id = ?").bind(gid).first(), env.DB.prepare("SELECT * FROM sippa_kit WHERE id = ?").bind(g.kit_id).first()]);
  return json({gerak, kit});
}

/* ================================================================ tugas dan lapangan */
async function tugasBuat(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tugas", 60, kini); if (l) return l;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, nama = teksOK(o.nama_regu, 2, 80), kab = teksOK(o.kab, 2, 60);
  if (!nama) return gagal(400, "nama_regu 2 sampai 80 karakter"); if (!UNSUR.includes(o.unsur)) return gagal(400, `unsur harus salah satu dari ${UNSUR.join(", ")}`);
  if (typeof o.prov !== "string" || !RE_PROV.test(o.prov)) return gagal(400, "prov harus kode provinsi 2 digit"); if (!kab) return gagal(400, "kab 2 sampai 60 karakter");
  if (o.kompleks_id != null && !(typeof o.kompleks_id === "string" && RE_KOMPLEKS.test(o.kompleks_id))) return gagal(400, "kompleks_id harus berbentuk K12");
  const dalamHari = o.lengan_dalam ?? 0; if (dalamHari !== 0 && dalamHari !== 1) return gagal(400, "lengan_dalam harus 0 atau 1");
  if (!Number.isInteger(o.berlaku_hari) || o.berlaku_hari < 1 || o.berlaku_hari > 30) return gagal(400, "berlaku_hari bilangan bulat 1 sampai 30");
  let kit = null;
  if (o.kit_id != null) { kit = typeof o.kit_id === "string" && RE_ID.test(o.kit_id) ? await kitTulis(env, req, o.kit_id) : null; if (!kit) return gagal(400, "kit_id tidak ditemukan"); }
  if (!dalam(req, o.prov)) return tdk("wilayah tidak tersedia");
  const id = acak(8), {kode, kode_sha} = await kodeBaru(), berakhir = kini + o.berlaku_hari * HARI;
  await env.DB.batch([env.DB.prepare("INSERT INTO sippa_tugas (id, kit_id, kode_sha, nama_regu, unsur, prov, kab, kompleks_id, lengan_dalam, mulai, berakhir, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, kit?.id ?? null, kode_sha, nama, o.unsur, o.prov, kab, o.kompleks_id ?? null, dalamHari, kini, berakhir, a.oleh, dummyStaf(req, a.oleh) || (kit?.dummy ?? 0)),
    jejakStmt(env, a.oleh, "sippa_tugas:" + id, "tugas", o.prov, `${nama} ${o.berlaku_hari} hari`.slice(0, 300), kini, dummyStaf(req, a.oleh) || (kit?.dummy ?? 0))]);
  const tugas = {id, kit_id: kit?.id ?? null, nama_regu: nama, unsur: o.unsur, prov: o.prov, kab, kompleks_id: o.kompleks_id ?? null, lengan_dalam: dalamHari, mulai: kini, berakhir};
  return json({tugas, kode, tautan: "/pipa/lapangan#k=" + kode}, 201);   // kode tampil sekali: hanya sha256-nya disimpan
}
async function tugasCabut(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tugas_cabut", 120, kini); if (l) return l;
  const t = await env.DB.prepare("SELECT id, prov, dicabut, dummy FROM sippa_tugas WHERE id = ? AND dummy <= ? AND dummy >= ?").bind(id, lihatDummy(req), loDummy(req)).first();
  if (!t || !dalam(req, t.prov)) return tdk("tugas tidak ada");
  if (t.dicabut != null) return json({id, dicabut: t.dicabut});   // idempoten: tidak menulis jejak kedua
  await env.DB.batch([env.DB.prepare("UPDATE sippa_tugas SET dicabut = ? WHERE id = ? AND dicabut IS NULL").bind(kini, id), jejakStmt(env, a.oleh, "sippa_tugas:" + id, "cabut", null, null, kini, dummyStaf(req, a.oleh) || t.dummy)]);
  return json({id, dicabut: kini});
}
async function lapanganSaya(env, req, url, kini) {
  const t = await pegang(env, req, kini); if (t instanceof Response) return t;
  const q = (sql, ...p) => env.DB.prepare(sql).bind(...p);
  const [kit, ring, petak] = await Promise.all([t.kit_id ? q("SELECT kode, status, jenis FROM sippa_kit WHERE id = ?", t.kit_id).first() : null,
    t.kit_id ? q("SELECT count(*) total, coalesce(sum(kondisi = 'baik'), 0) baik, coalesce(sum(kondisi IN ('rusak_ringan', 'rusak_berat')), 0) rusak, coalesce(sum(kondisi = 'hilang'), 0) hilang FROM sippa_komponen WHERE kit_id = ?", t.kit_id).first() : null,
    q("SELECT petak_id FROM sippa_log_gelar WHERE tugas_id = ? AND petak_id IS NOT NULL UNION SELECT petak_id FROM sippa_probe WHERE tugas_id = ? AND petak_id IS NOT NULL ORDER BY 1", t.id, t.id).all()]);
  const {id, nama_regu, unsur, prov, kab, kompleks_id, lengan_dalam, berakhir} = t;
  return json({tugas: {id, nama_regu, unsur, prov, kab, kompleks_id, lengan_dalam, berakhir}, kit: kit ? {...kit, komponen_ringkas: ring} : null, petak: petak.results.map(r => r.petak_id), formulir_versi: FORMULIR_VERSI});
}
/* INSERT satu butir dari MEDAN + kolom diisi server (DIISI_SERVER): ON CONFLICT(id) DO NOTHING, kirim ulang = tidak menulis dua kali */
function tulisButir(env, jenis, butir, srv) {
  const kolom = [...Object.keys(MEDAN[jenis]), ...DIISI_SERVER[jenis]], nilai = kolom.map(k => k in srv ? srv[k] : butir[k] ?? null);
  return env.DB.prepare(`INSERT INTO ${JENIS_TABEL[jenis]} (${kolom.join(", ")}) VALUES (${kolom.map(() => "?").join(", ")}) ON CONFLICT(id) DO NOTHING`).bind(...nilai);
}
async function lapanganKirim(env, req, url, kini) {
  const t = await pegang(env, req, kini); if (t instanceof Response) return t;
  const oleh = "tugas:" + t.id, l = await batasJam(env, oleh, "sippa.lapangan", 120, kini); if (l) return l;
  const b = await bacaJsonByte(req, MAKS_KIRIM); if (b.galat) return gagal(b.status || 400, b.galat);   // batas dihitung BYTE sebelum didekode (bacaBody menghitung huruf)
  const o = b.o, JENIS = ["log", "probe", "bbm", "gerak"]; let total = 0;
  for (const j of JENIS) { if (o[j] !== undefined && !Array.isArray(o[j])) return gagal(400, `${j} harus larik`); total += (o[j] ?? []).length; }
  if (total > MAKS_BUTIR) return gagal(400, `paling banyak ${MAKS_BUTIR} butir per kiriman (dikirim ${total})`);
  const meleset = typeof o.jam_kirim !== "number" || !Number.isFinite(o.jam_kirim) || Math.abs(o.jam_kirim - kini) > MELESET_MS;   // jam perangkat beda > 10 menit dari jam server
  const diterima = [], ganda = [], ditolak = [], daftar = [];
  const tolak = (id, alasan) => ditolak.push({id: typeof id === "string" ? id : null, alasan});
  const statusKit = async () => t.kit_id ? (await env.DB.prepare("SELECT status FROM sippa_kit WHERE id = ?").bind(t.kit_id).first())?.status : null;
  let kursor;   // status kit sesudah gerak butir sebelumnya dalam kiriman yang sama (dari_status = status kit SEKARANG, bukan kiriman klien)
  for (const jenis of JENIS) for (const butir of o[jenis] ?? []) {
    const id = butir?.id;
    if (typeof id !== "string" || !RE_UUID4.test(id)) { tolak(id, "id harus UUID v4 huruf kecil (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)"); continue; }
    let isi = butir, foto = null;
    if (jenis === "log" && Object.hasOwn(butir, "foto_id")) {   // foto_id diisi klien sesudah unggah foto (DT §6.1.4); bukan medan MEDAN.log, jadi dicek di sini
      ({foto_id: foto, ...isi} = butir);
      if (foto !== null && !(typeof foto === "string" && RE_ID.test(foto) && await env.DB.prepare("SELECT 1 FROM sippa_foto WHERE id = ? AND tugas_id = ?").bind(foto, t.id).first())) { tolak(id, "foto_id tidak dikenal untuk tugas ini"); continue; }
    }
    const c = cekButir(jenis, isi, {lengan_dalam: t.lengan_dalam});
    if (!c.ok) { tolak(id, c.galat.map(g => `${g.medan}: ${g.pesan}`).join("; ")); continue; }
    if (jenis === "gerak") {
      if (!t.kit_id) { tolak(id, "tugas ini tidak punya kit"); continue; }
      if (!OPERATOR.includes(isi.alasan)) { tolak(id, `alasan ${isi.alasan} hanya untuk staf; operator memakai gelar, bongkar, atau kembali`); continue; }
      if (isi.rencana === 1) { tolak(id, "gerak terencana hanya untuk staf"); continue; }
      if (isi.prov != null && isi.prov !== t.prov) { tolak(id, "operator hanya boleh bergerak di provinsi tugasnya"); continue; }
      if (await env.DB.prepare("SELECT 1 FROM sippa_gerak WHERE id = ?").bind(id).first()) { ganda.push(id); continue; }   // kirim ulang: trigger sippa_gerak_cek akan menolaknya padahal sudah tercatat
      kursor ??= await statusKit();
      if (!ALASAN_TRANSISI[isi.alasan].includes(`${kursor}>${isi.ke_status}`)) { tolak(id, `transisi ${kursor} ke ${isi.ke_status} tidak sah untuk alasan ${isi.alasan}`); continue; }
      const dari = kursor; kursor = isi.ke_status;
      daftar.push({id, jenis, dari, buat: d => tulisButir(env, "gerak", {...isi, tiba: isi.tiba ?? null, rencana: isi.rencana ?? 0}, {dari_status: d, kit_id: t.kit_id, tugas_id: t.id, oleh, prov: isi.prov ?? null, kab: isi.prov != null ? t.kab : null, dummy: t.dummy})});
    } else if (jenis === "log") {
      const m = meleset || isi.waktu_klien > kini + MELESET_MS ? 1 : 0;
      daftar.push({id, jenis, buat: () => tulisButir(env, "log", isi, {tugas_id: t.id, kit_id: t.kit_id, kompleks_id: t.kompleks_id, prov: t.prov, foto_id: foto, jam_klien_meleset: m, diterima: kini, oleh, dummy: t.dummy})});
    } else if (jenis === "probe") daftar.push({id, jenis, buat: () => tulisButir(env, "probe", isi, {tugas_id: t.id, oleh, dummy: t.dummy})});
    else daftar.push({id, jenis, buat: () => tulisButir(env, "bbm", isi, {kit_id: t.kit_id, oleh, dummy: t.dummy})});
  }
  if (daftar.length) {
    const n = j => daftar.filter(e => e.jenis === j).length;
    const jej = () => jejakStmt(env, oleh, "sippa_tugas:" + t.id, "kirim", `n${daftar.length}`, `log ${n("log")}, probe ${n("probe")}, bbm ${n("bbm")}, gerak ${n("gerak")}`, kini, t.dummy);
    let hasil = null;
    try { hasil = await env.DB.batch([...daftar.map(e => e.buat(e.dari)), jej()]); } catch (e) { if (tanpaTabel(e)) throw e; }   // satu butir ditolak D1 membatalkan seluruh batch: ulangi satu per satu supaya yang sah tetap masuk
    if (hasil) daftar.forEach((e, i) => (hasil[i].meta.changes ? diterima : ganda).push(e.id));
    else {
      for (const e of daftar) {
        try { const r = await e.buat(e.jenis === "gerak" ? await statusKit() : undefined).run(); (r.meta.changes ? diterima : ganda).push(e.id); }
        catch (er) { if (tanpaTabel(er)) throw er; tolak(e.id, bersihGalat(er)); }
      }
      await jej().run();
    }
  }
  return json({diterima, ganda, ditolak, jam_server: kini});
}
async function lapanganFoto(env, req, url, kini) {
  const t = await pegang(env, req, kini); if (t instanceof Response) return t;
  const oleh = "tugas:" + t.id, l = await batasJam(env, oleh, "sippa.foto", 60, kini); if (l) return l;
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum tersedia");
  if (!(req.headers.get("content-type") || "").startsWith("multipart/form-data")) return gagal(400, "kirim sebagai multipart/form-data dengan medan berkas");
  const pjg = Number(req.headers.get("content-length") || 0);
  if (!(pjg > 0)) return gagal(411, "Content-Length wajib pada unggahan");   // sebelum formData(): badan chunked tak terbatas tidak ditampung
  if (pjg > MAKS_FOTO + 65536) return gagal(413, `kiriman ${pjg} byte, maksimal ${MAKS_FOTO}`);
  let f; try { f = await req.formData(); } catch (e) { return gagal(400, "formulir tidak terbaca"); }
  const berkas = f.get("berkas");
  if (!(berkas instanceof File) || !berkas.size) return gagal(400, "medan berkas wajib berisi foto");
  if (berkas.size > MAKS_FOTO) return gagal(413, `foto ${berkas.size} byte, maksimal ${MAKS_FOTO}`);
  const bytes = new Uint8Array(await berkas.arrayBuffer()), mime = jenisBerkas(bytes);   // jenis dari byte awal, bukan nama atau Content-Type kiriman
  if (mime !== "image/jpeg" && mime !== "image/webp") return gagal(400, "berkas harus foto JPEG atau WebP (PNG, GIF, dan video tidak diterima)");
  const bersih = bersihMedia(mime, bytes); if (!bersih || !bersih.length) return gagal(400, "struktur foto tidak sah atau tidak lengkap");   // EXIF, XMP, dan lokasi dibuang
  const id = acak(8), kunci = "sippa-foto/" + id;
  await env.MEDIA.put(kunci, bersih, {httpMetadata: {contentType: mime}});
  try { await env.DB.batch([env.DB.prepare("INSERT INTO sippa_foto (id, tugas_id, prov, mime, ukuran, waktu, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, t.id, t.prov, mime, bersih.length, kini, oleh, t.dummy),
    jejakStmt(env, oleh, "sippa_foto:" + id, "foto", mime, null, kini, t.dummy)]); }
  catch (e) { await env.MEDIA.delete(kunci).catch(() => {}); throw e; }
  return json({foto_id: id}, 201);
}
async function fotoBaca(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const f = await env.DB.prepare("SELECT id, prov, mime FROM sippa_foto WHERE id = ? AND dummy <= ?").bind(id, lihatDummy(req)).first();
  if (!f || !dalam(req, f.prov)) return tdk("foto tidak ada");
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum tersedia");
  const o = await env.MEDIA.get("sippa-foto/" + id); if (!o) return tdk("foto tidak ada");
  return new Response(o.body, {headers: {"content-type": f.mime, "content-disposition": "inline", "cache-control": "private, max-age=3600"}});
}

/* ================================================================ log gelar, probe, CSV */
function filterLog(q) {
  const jenis = q.get("jenis"), kelas = q.get("kelas"), kit = q.get("kit"), sejak = q.get("sejak"), sampai = q.get("sampai"), w = [], p = [];
  if (jenis !== null) { if (!JENIS_LOG.includes(jenis)) return {galat: `jenis harus salah satu dari ${JENIS_LOG.join(", ")}`}; w.push("l.jenis = ?"); p.push(jenis); }
  if (kelas !== null) { if (!["I", "II", "III"].includes(kelas)) return {galat: "kelas harus I, II, atau III"}; w.push("l.kelas_medan = ?"); p.push(kelas); }
  if (kit !== null) { if (!RE_ID.test(kit)) return {galat: "kit harus id kit 16 heks"}; w.push("l.kit_id = ?"); p.push(kit); }
  const rentang = rentangMs(q, "coalesce(l.t_tiba, l.waktu_klien)"); if (rentang.galat) return rentang;
  return {w: [...w, ...rentang.w], p: [...p, ...rentang.p]};
}
function rentangMs(q, kolom) {
  const sejak = q.get("sejak"), sampai = q.get("sampai"), w = [], p = [];
  for (const [nama, v, op] of [["sejak", sejak, ">="], ["sampai", sampai, "<="]]) if (v !== null) { if (!RE_MS.test(v)) return {galat: `${nama} harus milidetik epoch (bilangan bulat)`}; w.push(`${kolom} ${op} ?`); p.push(Number(v)); }
  if (sejak !== null && sampai !== null && Number(sejak) > Number(sampai)) return {galat: "sejak tidak boleh lebih besar dari sampai"};
  return {w, p};
}
async function ambilLog(env, req, f) {
  const r = await env.DB.prepare(`SELECT l.*, k.kode AS kit_kode, k.prov AS kit_prov, t.nama_regu FROM sippa_log_gelar l LEFT JOIN sippa_kit k ON k.id = l.kit_id LEFT JOIN sippa_tugas t ON t.id = l.tugas_id WHERE l.dummy <= ?${f.w.map(x => " AND " + x).join("")} ORDER BY coalesce(l.t_tiba, l.waktu_klien) DESC, l.rowid DESC LIMIT ${MAKS_LOG + 1}`).bind(lihatDummy(req), ...f.p).all();
  const baris = r.results, terpotong = baris.length > MAKS_LOG;
  return {baris: baris.slice(0, MAKS_LOG).filter(x => dalam(req, x.prov) && (x.kit_id == null || dalam(req, x.kit_prov))).reverse(), terpotong};   // urut waktu naik; yang terbaru dipertahankan bila terpotong
}
/* peran baca saja melihat lat/lon dibulatkan 0,01 (sama dengan CSV tanpa presisi=penuh); peran tulis penuh */
const bulat = v => typeof v === "number" ? Math.round(v * 100) / 100 : v;
const kasar = async (env, req, baris) => await adminAtauStaf(env, req, P_SIPPA_TULIS) ? baris : baris.map(r => "lat" in r ? {...r, lat: bulat(r.lat), lon: bulat(r.lon)} : r);
async function logDaftar(env, req, url) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const f = filterLog(url.searchParams); if (f.galat) return gagal(400, f.galat);
  const {baris, terpotong} = await ambilLog(env, req, f);
  return json({log: await kasar(env, req, baris), n: baris.length, terpotong});
}
const KOLOM_LOG = ["id", "tugas_id", "kit_id", "kompleks_id", "prov", "jenis", "kelas_medan", "panjang_m", "n_orang", "t_tiba", "t_mulai_gelar", "t_air_mengalir", "t_mulai_injeksi", "t_selesai", "t_bongkar_selesai", "jam_pompa", "bbm_l", "air_m3", "banjir_m3",
  "lat", "lon", "catatan", "foto_id", "petak_id", "air_sampai_lance", "p_ujung_bar", "p_ujung_menit", "p_ujung_sumber", "kecelakaan", "bocor_henti_menit", "konfigurasi", "koreksi_dari", "jam_klien_meleset", "waktu_klien", "diterima", "oleh", "dummy"];
const KOLOM_PROBE = ["id", "log_id", "tugas_id", "petak_id", "titik", "tahap", "kedalaman_cm", "suhu_c", "waktu", "oleh"];
/* sel teks berawalan = + - @ tab CR diberi ' (injeksi rumus spreadsheet); angka ditulis apa adanya, jadi lintang negatif tetap angka */
const sel = v => { if (v == null) return ""; let s = String(v); if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (kolom, baris) => [kolom.join(","), ...baris.map(r => kolom.map(k => sel(r[k])).join(","))].join("\r\n") + "\r\n";
const tgl = kini => new Date(kini).toISOString().slice(0, 10).replaceAll("-", "");
const berkasCsv = (nama, isi, kini) => new Response(isi, {headers: {"content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="sippa-${nama}-${tgl(kini)}.csv"`}});
async function logCsv(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const f = filterLog(url.searchParams); if (f.galat) return gagal(400, f.galat);
  const presisi = url.searchParams.get("presisi"); if (presisi !== null && presisi !== "penuh") return gagal(400, "presisi hanya boleh penuh");
  if (presisi === "penuh" && !await adminAtauStaf(env, req, P_SIPPA_TULIS)) return gagal(403, "koordinat penuh hanya untuk staf yang boleh menulis");
  const l = await batasJam(env, a.oleh, "sippa.csv", 60, kini); if (l) return l;
  const {baris} = await ambilLog(env, req, f);
  return berkasCsv("log", csv(KOLOM_LOG, presisi === "penuh" ? baris : baris.map(r => ({...r, lat: bulat(r.lat), lon: bulat(r.lon)}))), kini);
}
async function probeCsv(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const q = url.searchParams, petak = q.get("petak"), tugas = q.get("tugas"), w = [], p = [];
  if (petak !== null) { if (!RE_PETAK.test(petak)) return gagal(400, "petak 1 sampai 40 karakter huruf, angka, titik, garis, spasi"); w.push("p.petak_id = ?"); p.push(petak); }
  if (tugas !== null) { if (!RE_ID.test(tugas)) return gagal(400, "tugas harus id tugas 16 heks"); w.push("p.tugas_id = ?"); p.push(tugas); }
  const r = rentangMs(q, "p.waktu"); if (r.galat) return gagal(400, r.galat);
  const l = await batasJam(env, a.oleh, "sippa.csv", 60, kini); if (l) return l;
  const s = await env.DB.prepare(`SELECT p.id, p.log_id, p.tugas_id, p.petak_id, p.titik, p.tahap, p.kedalaman_cm, p.suhu_c, p.waktu, p.oleh, t.prov AS tprov FROM sippa_probe p LEFT JOIN sippa_tugas t ON t.id = p.tugas_id
    WHERE p.dummy <= ?${[...w, ...r.w].map(x => " AND " + x).join("")} ORDER BY p.waktu, p.rowid LIMIT 20000`).bind(lihatDummy(req), ...p, ...r.p).all();
  return berkasCsv("probe", csv(KOLOM_PROBE, s.results.filter(x => dalam(req, x.tprov))), kini);
}
/* entri staf dari formulir kertas G3-lite: medan sama dengan butir log lapangan; id dari server; oleh = pelaku */
async function logTulis(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tulis", 600, kini); if (l) return l;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const {prov, kit_id, kompleks_id, id: _id, waktu_klien: _w, ...isi} = b.o;
  if (prov !== undefined && !(typeof prov === "string" && RE_PROV.test(prov))) return gagal(400, "prov harus kode provinsi 2 digit");
  if (kit_id !== undefined && !(typeof kit_id === "string" && RE_ID.test(kit_id))) return gagal(400, "kit_id harus id kit 16 heks");
  if (kompleks_id !== undefined && !(typeof kompleks_id === "string" && RE_KOMPLEKS.test(kompleks_id))) return gagal(400, "kompleks_id harus berbentuk K12");
  const butir = {...isi, id: acak(8), waktu_klien: kini}, c = cekButir("log", butir); if (!c.ok) return gal(c);
  if (prov === undefined && !dalamWilayahStaf(req, [])) return gagal(400, "prov wajib untuk staf berwilayah");
  if (prov !== undefined && !dalam(req, prov)) return tdk("wilayah tidak tersedia");
  const kit = kit_id === undefined ? null : await kitTulis(env, req, kit_id);   // kit di luar wilayah dijawab sama dengan kit yang tidak ada
  if (kit_id !== undefined && !kit) return gagal(400, "kit_id tidak ditemukan");
  try { await env.DB.batch([tulisButir(env, "log", butir, {tugas_id: null, kit_id: kit?.id ?? null, kompleks_id: kompleks_id ?? null, prov: prov ?? null, foto_id: null, jam_klien_meleset: 0, diterima: kini, oleh: a.oleh, dummy: dummyStaf(req, a.oleh) || (kit?.dummy ?? 0)}),
    jejakStmt(env, a.oleh, "sippa_log_gelar:" + butir.id, "log", butir.jenis, null, kini, dummyStaf(req, a.oleh) || (kit?.dummy ?? 0))]); }
  catch (e) { if (/sippa_log_urut|CHECK constraint/.test(String(e?.message || e))) return gagal(400, bersihGalat(e)); throw e; }
  return json({log: await env.DB.prepare("SELECT * FROM sippa_log_gelar WHERE id = ?").bind(butir.id).first()}, 201);
}

/* ================================================================ dummy (DUMMY.md; DT §8.5): rantai hulu ke hilir, Super Admin saja */
const DUMMY_KIT = [["SIPPA-901", "gambut"], ["SIPPA-902", "gambut"], ["SIPPA-903", "gambut"], ["SIPPA-904", "banjir"], ["SIPPA-905", "mineral"], ["SIPPA-906", "gambut"], ["SIPPA-907", "mineral"]];   // satu per status
const OLEH_DUMMY = "dummy", BBM_LPJ_KELAS_POMPA = 22, N_POMPA = 2, LPM_DEBIT = 300;   // kelas pompa 1.500 L/min bensin 22 L/jam (PRD §6.1); debit bawaan 300 L/min
const bulat1 = x => Math.round(x * 10) / 10, bulat2 = x => Math.round(x * 100) / 100;
const kumpul = async (env, stm) => { for (let i = 0; i < stm.length; i += 50) await env.DB.batch(stm.slice(i, i + 50)); };
const adaDummy = async (env, sql, ...p) => (await env.DB.prepare(sql).bind(...p).first()).n > 0;
const kitDummy = async env => Object.fromEntries((await env.DB.prepare("SELECT id, kode, jenis, status FROM sippa_kit WHERE dummy = 1").all()).results.map(k => [k.kode, k]));
const tugasDummy = env => env.DB.prepare("SELECT id, kit_id, prov FROM sippa_tugas WHERE dummy = 1 ORDER BY mulai LIMIT 1").first();
const logDummy = (env, c) => env.DB.prepare("SELECT * FROM sippa_log_gelar WHERE dummy = 1 AND t_tiba BETWEEN ? AND ? ORDER BY t_tiba").bind(c.sejak, c.sampai).all().then(r => r.results);
export const PENGISI = {
  async isiKit(env, c) {
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_kit WHERE dummy = 1")) { c.ada = true; return {}; }
    await env.DB.batch(DUMMY_KIT.map(([kode, jenis]) => env.DB.prepare("INSERT INTO sippa_kit (id, kode, jenis, status, lokasi, lat, lon, prov, kab, pemilik_asal, dibuat, diubah, dummy) VALUES (?, ?, ?, 'gudang', 'Gudang dummy', -2.21, 113.92, '62', 'Kota Palangka Raya', 'BMN BNPB', ?, ?, 1)")
      .bind(acak(8), kode, jenis, c.kini, c.kini)));
    return {sippa_kit: DUMMY_KIT.length};
  },
  async isiKomponen(env, c) {
    const kosong = (await env.DB.prepare("SELECT id, kode, jenis FROM sippa_kit k WHERE dummy = 1 AND NOT EXISTS (SELECT 1 FROM sippa_komponen c WHERE c.kit_id = k.id)").all()).results;
    if (!kosong.length) { if (await adaDummy(env, "SELECT count(*) n FROM sippa_komponen WHERE dummy = 1")) c.ada = true; return {}; }
    const stm = [];
    for (const k of kosong) TEMPLAT_BOM[k.jenis === "pinjam_pilot" ? "gambut" : k.jenis].forEach((b, i, semua) => {
      const kondisi = k.kode === "SIPPA-903" && i === semua.length - 1 ? "hilang" : k.kode === "SIPPA-903" && i === 0 ? "rusak_ringan" : "baik";   // satu komponen hilang dan satu rusak supaya kartu kehilangan berangka
      stm.push(env.DB.prepare("INSERT INTO sippa_komponen (id, kit_id, kode_bom, nama, jumlah, satuan, kondisi, dicek, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(acak(8), k.id, b.kode_bom, b.nama, b.jumlah, b.satuan, kondisi, c.kini - i * HARI));
    });
    await kumpul(env, stm); return {sippa_komponen: stm.length};
  },
  async isiTugas(env, c) {
    const kit = (await kitDummy(env))["SIPPA-903"]; if (!kit) return {};
    if (await tugasDummy(env)) { c.ada = true; return {}; }
    const {kode_sha} = await kodeBaru();
    await env.DB.prepare("INSERT INTO sippa_tugas (id, kit_id, kode_sha, nama_regu, unsur, prov, kab, kompleks_id, lengan_dalam, mulai, berakhir, oleh, dummy) VALUES (?, ?, ?, 'Regu dummy', 'manggala_agni', '62', 'Kota Palangka Raya', 'K1', 0, ?, ?, ?, 1)")
      .bind(acak(8), kit.id, kode_sha, c.kini, c.kini + 7 * HARI, OLEH_DUMMY).run();
    return {sippa_tugas: 1};
  },
  async isiGerak(env, c) {
    const kit = await kitDummy(env); if (!Object.keys(kit).length) return {};
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_gerak WHERE dummy = 1")) { c.ada = true; return {}; }
    /* tiap kit mulai di gudang; satu gerak per status tujuan, satu terencana belum tiba (901), satu antar-provinsi (904), servis lalu pensiun (907) */
    const langkah = [["SIPPA-902", "depot", "pra_posisi", {ke_lokasi: "Depot dummy", prov: "62"}], ["SIPPA-903", "gelar", "gelar", {ke_lokasi: "Lokasi gelar dummy", prov: "62"}],
      ["SIPPA-904", "banjir", "pindah_banjir", {pengangkut: "yontp", permintaan_dari: "BPBD dummy", ke_lokasi: "Posko banjir dummy", prov: "64", kab: "Banjar"}], ["SIPPA-905", "servis", "servis", {}],
      ["SIPPA-906", "hilang", "hilang", {catatan: "dummy: tidak ditemukan saat inventaris"}], ["SIPPA-907", "servis", "servis", {}], ["SIPPA-907", "pensiun", "pensiun", {}],
      ["SIPPA-901", "banjir", "pindah_banjir", {rencana: 1, eta_jam: 48, pengangkut: "yontp", permintaan_dari: "Pusdalops dummy", prov: "63"}]];
    const stm = []; let t = c.kini - langkah.length * 3 * JAM; const dari = {};
    for (const [kode, tujuan, alasan, x] of langkah) {
      const k = kit[kode]; if (!k) continue; const asal = dari[kode] ?? k.status; t += 3 * JAM; if (asal !== "gudang" && !dari[kode]) continue;
      stm.push(env.DB.prepare("INSERT INTO sippa_gerak (id, kit_id, dari_status, ke_status, ke_lokasi, prov, kab, alasan, rencana, eta_jam, tiba, pengangkut, permintaan_dari, catatan, oleh, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
        .bind(acak(8), k.id, asal, tujuan, x.ke_lokasi ?? null, x.prov ?? null, x.kab ?? null, alasan, x.rencana ?? 0, x.eta_jam ?? null, x.rencana ? null : t + HARI / 24, x.pengangkut ?? null, x.permintaan_dari ?? null, x.catatan ?? null, OLEH_DUMMY, t));
      if (!x.rencana) dari[kode] = tujuan;
    }
    if (!stm.length) return {};
    await kumpul(env, stm); return {sippa_gerak: stm.length};
  },
  async isiLog(env, c) {
    const tugas = await tugasDummy(env); if (!tugas) return {};
    if ((await logDummy(env, c)).length) { c.ada = true; return {}; }
    const n = 6, langkah = (c.sampai - c.sejak) / (n + 1), jenis = ["karhutla", "karhutla", "karhutla", "banjir", "karhutla", "latihan"], kelas = ["I", "II", "III", "II", "I", "III"], stm = [];
    for (let i = 0; i < n; i++) {
      const tiba = Math.round(c.sejak + (i + 1) * langkah), gelar = tiba + (30 + 10 * i) * 60e3, air = gelar + (90 + 15 * i) * 60e3, injeksi = air + 10 * 60e3, selesai = air + (4 + i) * JAM, bongkar = selesai + JAM;
      const jam = bulat2((selesai - air) / JAM);   // jam pompa = t_selesai - t_air_mengalir (rantai, bukan konstanta); BBM dan air turun dari jam itu
      stm.push(env.DB.prepare(`INSERT INTO sippa_log_gelar (id, tugas_id, kit_id, kompleks_id, prov, jenis, kelas_medan, panjang_m, n_orang, t_tiba, t_mulai_gelar, t_air_mengalir, t_mulai_injeksi, t_selesai, t_bongkar_selesai, jam_pompa, bbm_l, air_m3, banjir_m3,
        lat, lon, petak_id, air_sampai_lance, p_ujung_bar, p_ujung_menit, p_ujung_sumber, kecelakaan, bocor_henti_menit, konfigurasi, jam_klien_meleset, waktu_klien, diterima, oleh, dummy)
        VALUES (?, ?, ?, 'K1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
        .bind(crypto.randomUUID(), tugas.id, tugas.kit_id, tugas.prov, jenis[i], kelas[i], 300 + 120 * i, 8 + 3 * i, tiba, gelar, air, injeksi, selesai, bongkar, jam, bulat1(jam * N_POMPA * BBM_LPJ_KELAS_POMPA), bulat1(jam * LPM_DEBIT * 60 / 1000),
          jenis[i] === "banjir" ? bulat1(jam * 100 * 3.6) : null, -2.2 - i * 0.01, 113.9 + i * 0.01, `PETAK-DM${i % 2 + 1}`, i === 4 ? 0 : 1, bulat1(2.1 + 0.2 * i), 40 + 10 * i, i % 2 ? "operator" : "gauge", 0, 5 * i,
          JSON.stringify({bahan: "layflat", dn_mm: 100, L_m: 1000, q_lpm: LPM_DEBIT, n_lance: 8}), i === 2 ? 1 : 0, bongkar, bongkar, "tugas:" + tugas.id));
    }
    await kumpul(env, stm); return {sippa_log_gelar: n};
  },
  async isiProbe(env, c) {
    const logs = (await logDummy(env, c)).filter(l => l.jenis === "karhutla").slice(0, 2); if (!logs.length) return {};
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_probe WHERE dummy = 1 AND log_id IN (SELECT id FROM sippa_log_gelar WHERE dummy = 1 AND t_tiba BETWEEN ? AND ?)", c.sejak, c.sampai)) { c.ada = true; return {}; }
    const stm = [], waktuTahap = l => ({sebelum: l.t_tiba + 10 * 60e3, sesudah: l.t_selesai + 5 * 60e3, "24j": l.t_selesai + 24 * JAM}), dasar = {sebelum: 72, sesudah: 41, "24j": 33};
    logs.forEach((l, li) => { for (const [tahap, t] of Object.entries(waktuTahap(l))) for (const [ti, titik] of ["T1", "T2"].entries()) for (const dalamCm of [10, 30, 50, 100])
      stm.push(env.DB.prepare("INSERT INTO sippa_probe (id, log_id, tugas_id, petak_id, titik, tahap, kedalaman_cm, suhu_c, waktu, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
        .bind(crypto.randomUUID(), l.id, l.tugas_id, l.petak_id, titik, tahap, dalamCm, bulat1(dasar[tahap] - dalamCm * 0.12 + ti * 2.5 + li * 1.5), t, "tugas:" + l.tugas_id)); });
    await kumpul(env, stm); return {sippa_probe: stm.length};
  },
  async isiBbm(env, c) {
    const logs = await logDummy(env, c); if (!logs.length) return {};
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_bbm WHERE dummy = 1 AND log_id IN (SELECT id FROM sippa_log_gelar WHERE dummy = 1 AND t_tiba BETWEEN ? AND ?)", c.sejak, c.sampai)) { c.ada = true; return {}; }
    const stm = [], bbm = (id, kit, log, waktu, aksi, liter) => env.DB.prepare("INSERT INTO sippa_bbm (id, kit_id, log_id, waktu, jenis, aksi, liter, operator, oleh, dummy) VALUES (?, ?, ?, ?, 'bensin', ?, ?, 'Operator dummy', ?, 1)").bind(id, kit, log, waktu, aksi, liter, OLEH_DUMMY);
    stm.push(bbm(acak(8), logs[0].kit_id, null, logs[0].t_tiba - JAM, "terima", 500));
    for (const l of logs) {   // keluar 110% dari yang terpakai, sisanya kembali: dua sisi tidak pernah sama rata
      const keluar = Math.ceil(l.bbm_l * 1.1);
      stm.push(bbm(acak(8), l.kit_id, l.id, l.t_tiba, "keluar", keluar), bbm(acak(8), l.kit_id, l.id, l.t_bongkar_selesai, "kembali", bulat1(keluar - l.bbm_l)));
    }
    await kumpul(env, stm); return {sippa_bbm: stm.length};
  },
};
const SEMUA_KIT = ["isiKit", "isiKomponen", "isiTugas", "isiGerak"], SEMUA_LOG = ["isiKit", "isiKomponen", "isiTugas", "isiLog", "isiProbe", "isiBbm"];
/* tabel keputusan {layar: [pengisi...]} hulu ke hilir (bukan rantai if). Layar yang pengisinya belum ada (SP-029 dst) memberi daftar kosong: 200 tanpa baris. */
export const RANTAI_DUMMY = {kit: SEMUA_KIT, log: SEMUA_LOG, lapangan: SEMUA_LOG, ringkas: [...SEMUA_KIT, "isiLog", "isiProbe", "isiBbm"],
  ...Object.fromEntries(LAYAR_SIPPA.filter(l => l !== "kit" && l !== "log").map(l => [l, []]))};
async function dummyIsi(env, req, url, kini) {
  const a = await akses(env, req, "SA"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.dummy", 30, kini); if (l) return l;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const layar = b.o.layar; if (typeof layar !== "string" || !Object.hasOwn(RANTAI_DUMMY, layar)) return gagal(400, `layar harus salah satu dari ${Object.keys(RANTAI_DUMMY).join(", ")}`);
  const sampai = b.o.sampai ?? kini, sejak = b.o.sejak ?? sampai - 30 * HARI;
  if (!Number.isInteger(sejak) || !Number.isInteger(sampai) || sejak < 0 || sejak >= sampai) return gagal(400, "sejak dan sampai harus milidetik epoch dengan sejak < sampai");
  const c = {kini, sejak, sampai, ada: false}, dibuat = {};
  for (const nama of RANTAI_DUMMY[layar]) for (const [tabel, n] of Object.entries(await PENGISI[nama](env, c))) if (n) dibuat[tabel] = (dibuat[tabel] ?? 0) + n;
  if (!Object.keys(dibuat).length && c.ada) return gagal(409, "dummy layar ini sudah ada untuk periode itu");
  return json({dibuat});
}
/* hilir ke hulu; trigger append-only mengizinkan hapus baris dummy. Objek R2 dummy dihapus berdasarkan id baris sebelum barisnya hilang. */
const HAPUS_URUT = ["sippa_bbm", "sippa_probe", "sippa_log_gelar", "sippa_foto", "sippa_gerak", "sippa_tugas", "sippa_komponen", "sippa_jalan_cek", "sippa_aoi_usul", "sippa_kit"];
async function dummyHapus(env, req, url, kini) {
  const a = await akses(env, req, "SA"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.dummy", 30, kini); if (l) return l;
  const foto = (await env.DB.prepare("SELECT id FROM sippa_foto WHERE dummy = 1").all()).results.map(r => "sippa-foto/" + r.id);
  if (foto.length && env.MEDIA) await env.MEDIA.delete(foto);
  const r = await env.DB.batch([...HAPUS_URUT.map(t => env.DB.prepare(`DELETE FROM ${t} WHERE dummy = 1`)), env.DB.prepare("DELETE FROM pantau_jejak WHERE dummy = 1 AND obyek GLOB 'sippa_*'")]);
  return json({dihapus: Object.fromEntries(HAPUS_URUT.map((t, i) => [t, r[i].meta.changes]))});
}

/* ================================================================ tabel rute (digabung ke RUTE di src/worker.js; kunci dibaca gerbang.test.mjs, jadi tiap rute API satu baris literal) */
const hal = layar => (env, req, url) => halaman(env, req, url, layar);
const API = Object.fromEntries(Object.entries({
  "GET /api/sippa/kit": kitDaftar,
  "GET /api/sippa/kit/:id": kitRincian,
  "POST /api/sippa/kit": kitBuat,
  "POST /api/sippa/kit/:id": kitUbah,
  "POST /api/sippa/komponen/:id": komponenUbah,
  "POST /api/sippa/gerak/:id": gerakRute,
  "POST /api/sippa/tiba/:id": tibaRute,
  "POST /api/sippa/tugas": tugasBuat,
  "POST /api/sippa/tugas-cabut/:id": tugasCabut,
  "GET /api/sippa/lapangan/saya": lapanganSaya,
  "POST /api/sippa/lapangan/kirim": lapanganKirim,
  "POST /api/sippa/lapangan/foto": lapanganFoto,
  "GET /api/sippa/foto/:id": fotoBaca,
  "GET /api/sippa/log": logDaftar,
  "GET /api/sippa/log.csv": logCsv,
  "GET /api/sippa/probe.csv": probeCsv,
  "POST /api/sippa/log": logTulis,
  "POST /api/sippa/dummy/isi": dummyIsi,
  "POST /api/sippa/dummy/hapus": dummyHapus,
}).map(([k, f]) => [k, bungkusSippa(f)]));
export const RUTE_SIPPA = {
  "GET /pipa": hal("peta"),
  ...Object.fromEntries(LAYAR_SIPPA.map(l => ["GET /pipa/" + l, hal(l)])),   // nama layar didaftarkan satu per satu: jalur lain di bawah /pipa/ jatuh ke aset statis (404)
  "GET /pipa/kit/:id": hal("kit"),
  "GET /pipa/lapangan": () => halamanLapangan(),
  "GET /admin/pipa": () => alihkan("/pipa"),
  ...API,
};
