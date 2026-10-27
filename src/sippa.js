/* SIPPA P0 (DESAIN-TEKNIS SIPPA §1.3, §1.4, §4, §6, §8.5; skema migrations/0056_sippa_inti.sql): web /pipa untuk staf BNPB dan satu pintu tanpa akun /pipa/lapangan berkode penugasan.
   Cakupan tiket SP-008: cangkang halaman, kit, komponen, gerak, tugas, lapangan (kirim, foto), log + CSV, dummy. SP-029 menambah rute data R2 (DATA_SIPPA), ringkas, cek jalan, usul AOI. A/B, skenario, laporan, telemetri menyusul (SP-035 dst). SP-050 menambah telemetri, perangkat, alarm (skema 0058).
   Aturan yang mengikat modul ini:
   - Jalur aksi SEBELUM id (/api/sippa/gerak/:id): router worker.js hanya mengenali :id (16 heks) di ujung jalur (ADR-04). Awalan /api/pipa/* milik src/pipa.js, tidak disentuh.
   - Hak diperiksa DULU di tiap rute: tamu 401 (juga sesi staf tanpa x-pb), masuk tetapi tidak berhak 403 polos tanpa pengalihan, di luar wilayah = tidak ada = 404 identik.
   - Batas laju hanya di rute TULIS dan kegagalan kode (ADR-06): tiap laju() = satu tulisan D1 dari kuota 100 rb/hari yang dipakai bersama seluruh situs. GET staf tanpa laju.
   - Tulisan butir lapangan memakai ON CONFLICT(id) DO NOTHING, tidak pernah INSERT OR IGNORE (ADR-08): IGNORE juga menelan pelanggaran CHECK dan NOT NULL, butir rusak hilang diam-diam.
   - Validasi masukan klien = server lewat cekButir dari public/pipa/formulir.js (ADR-03); trigger dan CHECK D1 adalah sumber kebenaran terakhir.
   ponytail: staf berwilayah disaring di JS sesudah SQL (dalamWilayahStaf, jumlah kit puluhan); bila kit atau log menembus ribuan, pindahkan ke WHERE prov IN (json_each). */
import {json, gagal, acak, bacaBody, bacaBytes, adminOK, sha, ipHash} from "./worker.js";
import {stafOK, stafSesi, stafNyata, dalamWilayahStaf, jejakStmt} from "./staf.js";
import {laju, kodeBaru, pemegangKode} from "./bnpb.js";
import {modOK, superOK, CSP_LAPANGAN} from "./posko.js";
import {pemirsaSesi} from "./pemirsa.js";
import {jenisBerkas} from "./foto.js";
import {bersihMedia} from "./media_bersih.js";
import {halamanSippa, halamanSippaLapangan, CSP_SIPPA} from "./admin_halaman.js";
import {cekButir, MEDAN, DIISI_SERVER, JENIS_TABEL, FORMULIR_VERSI} from "../public/pipa/formulir.js";
import {cekAset, KELAS, KELAS_ASET, kelasDari, jadwal} from "../public/pipa/pelihara.js";

const JAM = 3600e3, HARI = 24 * JAM;
export const P_SIPPA_BACA = ["pusdalops", "koordalops", "pimpinan"], P_SIPPA_TULIS = ["pusdalops", "koordalops"];
export const LAYAR_SIPPA = ["peta", "hitung", "pemicu", "kit", "log", "ab", "studio", "3d", "telemetri", "laporan", "data", "pelihara", "air", "akses"];
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
  const o = b.o, JENIS = ["log", "probe", "bbm", "gerak", "inspeksi"]; let total = 0;
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
    if (jenis === "inspeksi") {   // keputusan 56: pra/pasca gelar komponen atau kit tugasnya (DT §4.3, §6.6)
      const e = await butirInspeksi(env, t, butir, kini); if (e.alasan) { tolak(id, e.alasan); continue; }
      daftar.push({id, jenis, buat: () => sisipInspeksi(env, {...e.v, id, oleh, dummy: t.dummy}, true)}); continue;
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
    const jej = () => jejakStmt(env, oleh, "sippa_tugas:" + t.id, "kirim", `n${daftar.length}`, `log ${n("log")}, probe ${n("probe")}, bbm ${n("bbm")}, gerak ${n("gerak")}, inspeksi ${n("inspeksi")}`, kini, t.dummy);
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
  const r = await env.DB.prepare(`SELECT l.*, k.kode AS kit_kode, k.prov AS kit_prov, k.kab AS kab, t.nama_regu FROM sippa_log_gelar l LEFT JOIN sippa_kit k ON k.id = l.kit_id LEFT JOIN sippa_tugas t ON t.id = l.tugas_id WHERE l.dummy <= ?${f.w.map(x => " AND " + x).join("")} ORDER BY coalesce(l.t_tiba, l.waktu_klien) DESC, l.rowid DESC LIMIT ${MAKS_LOG + 1}`).bind(lihatDummy(req), ...f.p).all();
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
const KOLOM_PROBE = ["id", "log_id", "tugas_id", "petak_id", "titik", "tahap", "kedalaman_cm", "suhu_c", "waktu", "oleh", "dummy"];
/* sel teks berawalan = + - @ tab CR diberi ' (injeksi rumus spreadsheet); angka ditulis apa adanya, jadi lintang negatif tetap angka */
const sel = v => { if (v == null) return ""; let s = String(v); if (typeof v === "string" && /^\s*[=+\-@]|^[\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
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
  const s = await env.DB.prepare(`SELECT p.id, p.log_id, p.tugas_id, p.petak_id, p.titik, p.tahap, p.kedalaman_cm, p.suhu_c, p.waktu, p.oleh, p.dummy, t.prov AS tprov FROM sippa_probe p LEFT JOIN sippa_tugas t ON t.id = p.tugas_id
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

/* ================================================================ data turunan R2, ringkas, cek jalan, usul AOI (SP-029; DT §3.1, §4.3, §8.3) */
/* nama tetap: hanya ini yang boleh dibaca dari R2 sippa/<nama>.json. Router worker.js meneruskan /api/sippa/data/<nama> apa adanya; nama lain = 404 tanpa menyentuh R2. */
export const DATA_SIPPA = ["kelayakan_kompleks", "kelayakan_sel", "zona", "sel22", "kit_nasional", "pemicu", "aoi_calon", "akses_kompleks", "cat", "jembatan_dibi", "program_jembatan", "prioritas"];
const MAKS_BYTE = 8 * 1024 * 1024, SEGAR_DETIK = 300;   // sama dengan MAKS_BYTE src/risiko7.js; salinan boleh dipakai ulang peramban 5 menit, kecuali pemicu (harian, dipantau kesegarannya)
async function dataBaca(env, req, url, kini, ctx, nama) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;   // hak SEBELUM nama dan R2: tamu tak boleh tahu berkas ada atau tidak
  if (!DATA_SIPPA.includes(nama)) return json({galat: "data tidak dikenal", status: "tidak_dikenal"}, 404);
  if (!env.MEDIA) return json({galat: "penyimpanan belum tersedia", status: "tanpa_penyimpanan"}, 503);
  const o = await env.MEDIA.get(`sippa/${nama}.json`);
  if (!o?.size) { o?.body?.cancel().catch(() => {}); return json({galat: `data ${nama} belum diunggah`, status: "belum_ada"}, 404); }   // 0 byte = unggahan gagal = belum ada
  if (o.size > MAKS_BYTE) { console.error("sippa data terlalu besar", nama, o.size); o.body?.cancel().catch(() => {}); return json({galat: `berkas ${o.size} byte, batas ${MAKS_BYTE}`, status: "terlalu_besar"}, 500); }
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": nama === "pemicu" ? "private, no-store" : `private, max-age=${SEGAR_DETIK}`}});
}
const median = v => { const s = [...v].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const N_KECIL = 5;   // gerbang G3: kurang dari 5 ulangan = angka kecil, layar menandainya
async function ringkas(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const lihat = lihatDummy(req), q = (sql, ...p) => env.DB.prepare(sql).bind(...p).all().then(r => r.results);
  const [kits, komp, logs, gerak, alarm, pemicu] = await Promise.all([
    q("SELECT id, status, prov FROM sippa_kit WHERE dummy <= ?", lihat),
    q("SELECT kit_id, sum(musim_awal) n, sum(CASE WHEN musim_awal = 1 AND kondisi = 'hilang' THEN 1 ELSE 0 END) h FROM sippa_komponen GROUP BY kit_id"),
    q(`SELECT l.prov, l.kit_id, l.t_tiba, l.t_air_mengalir FROM sippa_log_gelar l WHERE l.dummy <= ? AND l.jenis = 'karhutla' AND NOT EXISTS (SELECT 1 FROM sippa_log_gelar x WHERE x.koreksi_dari = l.id)`, lihat),
    q("SELECT g.id, g.kit_id, k.kode AS kit_kode, k.prov AS kprov, g.dari_status, g.ke_status, g.ke_lokasi, g.prov, g.alasan, g.rencana, g.tiba, g.waktu FROM sippa_gerak g JOIN sippa_kit k ON k.id = g.kit_id WHERE g.dummy <= ? ORDER BY g.waktu DESC, g.rowid DESC LIMIT 200", lihat),
    env.DB.prepare("SELECT count(*) n FROM sippa_alarm WHERE ditutup IS NULL AND dummy <= ?").bind(lihat).first().then(r => r.n, e => { if (tanpaTabel(e)) return 0; throw e; }),   // tabel alarm baru ada di 0058 (SP-050)
    env.MEDIA ? env.MEDIA.head("sippa/pemicu.json").then(o => o?.size ? o.uploaded.getTime() : null, () => null) : null]);
  const lihatKit = kits.filter(k => dalam(req, k.prov)), id = new Set(lihatKit.map(k => k.id)), per_status = Object.fromEntries(STATUS.map(s => [s, 0]));
  for (const k of lihatKit) per_status[k.status]++;
  let n = 0, h = 0; for (const c of komp) if (id.has(c.kit_id)) { n += c.n ?? 0; h += c.h ?? 0; }
  const adaKit = k => k == null || id.has(k), lg = logs.filter(l => dalam(req, l.prov) && adaKit(l.kit_id));
  const jam = lg.filter(l => l.t_tiba != null && l.t_air_mengalir != null).map(l => (l.t_air_mengalir - l.t_tiba) / JAM), p50 = median(jam);
  const gt = gerak.filter(g => dalam(req, g.prov) || dalam(req, g.kprov)).slice(0, 10).map(({kprov, ...g}) => g);
  return json({kit: {per_status, hilang_komponen_pct: persen(h, n)}, log: {n_karhutla: lg.length, p50_jam: p50 == null ? null : Math.round(p50 * 10) / 10, n_kecil: lg.length < N_KECIL}, alarm_aktif: alarm, gerak_terakhir: gt, pemicu_dibuat: pemicu, per: kini});
}
const KENDARAAN = ["pickup_4x4", "truk", "motor", "jalan_kaki", "perahu"], RE_SEL = /^s\d{1,6}_\d{1,6}$/;
async function jalanDaftar(env, req, url) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const k = url.searchParams.get("kompleks"); if (k !== null && !RE_KOMPLEKS.test(k)) return gagal(400, "kompleks harus berbentuk K12");
  const r = await env.DB.prepare(`SELECT id, kompleks_id, prov, musim, hasil, kendaraan, catatan, foto_id, oleh, waktu, dummy FROM sippa_jalan_cek WHERE dummy <= ?${k ? " AND kompleks_id = ?" : ""} ORDER BY waktu DESC, rowid DESC LIMIT 500`).bind(lihatDummy(req), ...(k ? [k] : [])).all();
  return json({cek: r.results.filter(c => dalam(req, c.prov))});
}
async function jalanTulis(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tulis", 600, kini); if (l) return l;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat); const o = b.o;
  if (typeof o.kompleks_id !== "string" || !RE_KOMPLEKS.test(o.kompleks_id)) return gagal(400, "kompleks_id harus berbentuk K0001");
  if (typeof o.prov !== "string" || !RE_PROV.test(o.prov)) return gagal(400, "prov harus kode provinsi 2 digit");
  if (o.musim !== "kemarau" && o.musim !== "hujan") return gagal(400, "musim harus kemarau atau hujan");
  if (o.hasil !== "lolos" && o.hasil !== "gagal") return gagal(400, "hasil harus lolos atau gagal");
  if (o.kendaraan != null && !KENDARAAN.includes(o.kendaraan)) return gagal(400, `kendaraan harus salah satu dari ${KENDARAAN.join(", ")}`);
  const catatan = o.catatan == null ? null : teksOK(o.catatan, 0, 500); if (catatan === undefined) return gagal(400, "catatan harus teks paling banyak 500 karakter");
  if (o.foto_id != null && !(typeof o.foto_id === "string" && RE_ID.test(o.foto_id) && await env.DB.prepare("SELECT 1 FROM sippa_foto WHERE id = ? AND dummy <= ?").bind(o.foto_id, lihatDummy(req)).first())) return gagal(400, "foto_id tidak ditemukan");
  if (!dalam(req, o.prov)) return tdk("wilayah tidak tersedia");
  const id = acak(8), dm = dummyStaf(req, a.oleh);   // server memeriksa kompleks_id berpola, bukan keanggotaan di R2 (hemat CPU; DT §4.4)
  await env.DB.batch([env.DB.prepare("INSERT INTO sippa_jalan_cek (id, kompleks_id, prov, musim, hasil, kendaraan, catatan, foto_id, oleh, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, o.kompleks_id, o.prov, o.musim, o.hasil, o.kendaraan ?? null, catatan || null, o.foto_id ?? null, a.oleh, kini, dm), jejakStmt(env, a.oleh, "sippa_jalan_cek:" + id, "jalan_cek", `${o.kompleks_id} ${o.hasil}`, null, kini, dm)]);
  return json({cek: await env.DB.prepare("SELECT id, kompleks_id, prov, musim, hasil, kendaraan, catatan, foto_id, oleh, waktu, dummy FROM sippa_jalan_cek WHERE id = ?").bind(id).first()}, 201);
}
async function aoiUsul(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.aoi", 120, kini); if (l) return l;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat); const o = b.o;
  if (o.kompleks_id != null && !(typeof o.kompleks_id === "string" && RE_KOMPLEKS.test(o.kompleks_id))) return gagal(400, "kompleks_id harus berbentuk K0001");
  if (o.sel != null && !(typeof o.sel === "string" && RE_SEL.test(o.sel))) return gagal(400, "sel harus berbentuk s650_1000");
  if (o.kompleks_id == null && o.sel == null) return gagal(400, "kompleks_id atau sel wajib");
  if (typeof o.prov !== "string" || !RE_PROV.test(o.prov)) return gagal(400, "prov harus kode provinsi 2 digit");
  const alasan = teksOK(o.alasan, 5, 500); if (alasan === undefined) return gagal(400, "alasan 5 sampai 500 karakter");
  if (!dalam(req, o.prov)) return tdk("wilayah tidak tersedia");
  const id = acak(8), dm = dummyStaf(req, a.oleh);   // status selalu 'usul': survei dan keputusan adalah kerja staf lain, bukan kiriman klien
  await env.DB.batch([env.DB.prepare("INSERT INTO sippa_aoi_usul (id, kompleks_id, sel, prov, alasan, status, oleh, waktu, dummy) VALUES (?, ?, ?, ?, ?, 'usul', ?, ?, ?)").bind(id, o.kompleks_id ?? null, o.sel ?? null, o.prov, alasan, a.oleh, kini, dm),
    jejakStmt(env, a.oleh, "sippa_aoi_usul:" + id, "aoi", o.kompleks_id ?? o.sel, null, kini, dm)]);
  return json({aoi: await env.DB.prepare("SELECT id, kompleks_id, sel, prov, alasan, status, oleh, waktu, dummy FROM sippa_aoi_usul WHERE id = ?").bind(id).first()}, 201);
}

/* ================================================================ A/B, skenario, laporan (SP-035; DT §3.3, §4.3; PRD §9.4.7)
   Server TIDAK menghitung statistik (SippaHitung.bandingRerata/bandingProporsi hanya di klien). Unggahan CSV atomik: satu baris salah = 0 baris tersimpan.
   ponytail: satu batch per unggahan (hingga 2.002 pernyataan) menjaga atomik; bila D1 produksi menolak batch sebesar itu, pecah jadi INSERT ... SELECT json_each dalam satu pernyataan. */
const LENGAN = ["konvensional", "lance", "lance_surfaktan", "sekat_rewetting", "lance_dalam"], JENIS_LAPORAN = ["pilot", "kejadian", "mingguan", "musim", "skenario"];
const MAKS_CSV = 1048576, MAKS_BARIS = 2000, MAKS_RINCIAN = 50, MAKS_LAPORAN = 10485760, MAKS_META = 8192, MAKS_STATE = 32768;
const KOLOM_AB = ["petak_id", "aoi", "prov", "lengan", "pasangan_id", "tanggal_perlakuan", "luas_m2", "regu_hari", "air_m3", "surfaktan_l", "biaya_rp", "dingin_24j", "dingin_72j", "nyala_7h", "nyala_30h", "nyala_90h", "catatan"];
const WAJIB_AB = ["petak_id", "aoi", "lengan", "tanggal_perlakuan", "luas_m2"], KOLOM_PETAK_CSV = [...KOLOM_AB, "id", "unggah_id", "sumber", "dummy"];
const byteLen = s => new TextEncoder().encode(s).length;
const hexSha = async b => [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))].map(x => x.toString(16).padStart(2, "0")).join("");
/* CSV RFC 4180 ringkas: kutip ganda, "" di dalam kutip, CRLF atau LF; baris kosong dibuang */
function bacaCsv(teks, pisah) {
  const baris = []; let sel = "", r = [], kutip = false, ada = false;
  const tutupSel = () => { r.push(sel); sel = ""; ada = true; };
  const tutupBaris = () => { tutupSel(); if (r.length > 1 || r[0].trim() !== "") baris.push(r); r = []; ada = false; };
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) { if (c === '"') { if (teks[i + 1] === '"') { sel += '"'; i++; } else kutip = false; } else sel += c; }
    else if (c === '"' && sel === "") kutip = true;
    else if (c === pisah) tutupSel();
    else if (c === "\n") tutupBaris();
    else if (c === "\r") { if (teks[i + 1] === "\n") i++; tutupBaris(); }
    else sel += c;
  }
  if (kutip) return {galat: "tanda kutip tidak tertutup"};
  if (ada || sel !== "") tutupBaris();
  return {baris};
}
const tanggalSah = s => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(s + "T00:00:00Z"); return !isNaN(d) && d.toISOString().slice(0, 10) === s; };
/* satu baris CSV -> {nilai} atau {salah: [{kolom, alasan}]}; angka berdesimal koma diterima bila pemisah titik koma */
function cekBarisAb(b, hariIni, komaDesimal) {
  const salah = [], v = {}, tambah = (kolom, alasan) => salah.push({kolom, alasan});
  const angka = (k, min, maks, bulat) => {
    let s = (b[k] ?? "").trim(); if (s === "") return null; if (komaDesimal) s = s.replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(s)) { tambah(k, "harus angka"); return null; }
    const n = Number(s); if (bulat && !Number.isInteger(n)) { tambah(k, "harus bilangan bulat"); return null; }
    if (n < min || n > maks) { tambah(k, `harus ${min} sampai ${maks}`); return null; } return n;
  };
  const tf = k => { const s = (b[k] ?? "").trim(); if (s === "") return null; if (s !== "0" && s !== "1") { tambah(k, "harus 0, 1, atau kosong"); return null; } return Number(s); };
  const teks = (k, min, maks, wajib) => { const s = (b[k] ?? "").normalize("NFC").trim(); if (s === "") { if (wajib) tambah(k, "wajib diisi"); return null; } if (s.length < min || s.length > maks) { tambah(k, `harus ${min} sampai ${maks} karakter`); return null; } return s; };
  v.petak_id = teks("petak_id", 3, 40, true); v.aoi = teks("aoi", 1, 40, true); v.pasangan_id = teks("pasangan_id", 1, 40, false); v.catatan = teks("catatan", 1, 500, false);
  const prov = (b.prov ?? "").trim(); if (prov !== "" && !RE_PROV.test(prov)) tambah("prov", "harus kode provinsi 2 digit"); v.prov = prov === "" ? null : prov;
  const lengan = (b.lengan ?? "").trim(); if (!LENGAN.includes(lengan)) tambah("lengan", "harus " + LENGAN.join("/")); v.lengan = lengan;
  const t = (b.tanggal_perlakuan ?? "").trim(); if (!tanggalSah(t)) tambah("tanggal_perlakuan", "harus tanggal YYYY-MM-DD yang nyata"); else if (t > hariIni) tambah("tanggal_perlakuan", "tidak boleh lebih dari hari ini"); v.tanggal_perlakuan = t;
  v.luas_m2 = angka("luas_m2", 1, 100000); if (v.luas_m2 === null && !salah.some(s => s.kolom === "luas_m2")) tambah("luas_m2", "wajib diisi");
  v.regu_hari = angka("regu_hari", 0, 1000); v.air_m3 = angka("air_m3", 0, 100000); v.surfaktan_l = angka("surfaktan_l", 0, 1e9) ?? 0; v.biaya_rp = angka("biaya_rp", 0, Number.MAX_SAFE_INTEGER, true);
  if (v.surfaktan_l > 0 && v.lengan !== "lance_surfaktan") tambah("surfaktan_l", "lebih dari 0 hanya untuk lance_surfaktan");
  for (const k of ["dingin_24j", "dingin_72j", "nyala_7h", "nyala_30h", "nyala_90h"]) v[k] = tf(k);
  return salah.length ? {salah} : {v};
}
const SQL_PETAK = `INSERT INTO sippa_petak (id, unggah_id, ${KOLOM_AB.join(", ")}, sumber, dummy) VALUES (?, ?, ${KOLOM_AB.map(() => "?").join(", ")}, 'unggah', ?)`;
async function abUnggah(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const r = await bacaBytes(req, MAKS_CSV); if (r.galat) return gagal(r.status || 400, r.galat);
  let teks; try { teks = new TextDecoder("utf-8", {fatal: true}).decode(r.b); } catch (e) { return gagal(400, "berkas harus UTF-8"); }
  teks = teks.replace(/^﻿/, ""); if (!teks.trim()) return gagal(400, "berkas kosong");
  const sha = await hexSha(r.b); if (await env.DB.prepare("SELECT 1 FROM sippa_ab_unggah WHERE sha = ?").bind(sha).first()) return gagal(409, "berkas yang sama persis sudah pernah diunggah");
  const kepala = teks.split(/\r?\n/, 1)[0], pisah = (kepala.match(/;/g) || []).length > (kepala.match(/,/g) || []).length ? ";" : ",";
  const c = bacaCsv(teks, pisah); if (c.galat) return gagal(400, c.galat);
  const [kol, ...isi] = c.baris, nama = kol.map(k => k.trim());
  const kurang = WAJIB_AB.filter(k => !nama.includes(k)), asing = nama.filter(k => !KOLOM_AB.includes(k));
  if (kurang.length || asing.length || new Set(nama).size !== nama.length) return json({galat: "baris kepala tidak sah", rincian: [...kurang.map(k => ({baris: 1, kolom: k, alasan: "kolom wajib tidak ada"})), ...asing.map(k => ({baris: 1, kolom: k, alasan: "kolom tidak dikenal"})), ...(new Set(nama).size !== nama.length ? [{baris: 1, kolom: "kepala", alasan: "nama kolom ganda"}] : [])].slice(0, MAKS_RINCIAN)}, 400);
  if (!isi.length) return gagal(400, "berkas tidak punya baris data");
  if (isi.length > MAKS_BARIS) return gagal(400, `paling banyak ${MAKS_BARIS.toLocaleString("id-ID")} baris data (dikirim ${isi.length.toLocaleString("id-ID")})`);
  const hariIni = new Date(kini + 7 * JAM).toISOString().slice(0, 10), dm = dummyStaf(req, a.oleh), nilai = [], rincian = []; let nSalah = 0;
  const lama = new Set((await env.DB.prepare("SELECT aoi || char(31) || petak_id k FROM sippa_petak").all()).results.map(x => x.k)), baru = new Set();
  isi.forEach((f, i) => {
    const no = i + 2, b = Object.fromEntries(nama.map((k, j) => [k, f[j] ?? ""])), x = cekBarisAb(b, hariIni, pisah === ";");
    let salah = x.salah ?? [];
    if (f.length > nama.length) salah = [...salah, {kolom: "kepala", alasan: "jumlah kolom lebih banyak dari baris kepala"}];
    if (x.v) {
      const kunci = x.v.aoi + "\u001f" + x.v.petak_id;
      if (lama.has(kunci) || baru.has(kunci)) salah = [...salah, {kolom: "petak_id", alasan: "petak_id tidak dapat dipakai untuk AOI ini"}]; baru.add(kunci);
      if (x.v.prov === null ? !dalamWilayahStaf(req, []) : !dalam(req, x.v.prov)) salah = [...salah, {kolom: "prov", alasan: x.v.prov === null ? "provinsi wajib untuk staf berwilayah" : "provinsi di luar wilayahmu"}];
    }
    if (salah.length) { nSalah++; for (const s of salah) if (rincian.length < MAKS_RINCIAN) rincian.push({baris: no, ...s}); } else nilai.push(x.v);
  });
  if (nSalah) return json({galat: `berkas ditolak: ${nSalah} baris salah, tidak ada yang disimpan`, rincian}, 400);
  const l = await batasJam(env, a.oleh, "sippa.ab", 20, kini); if (l) return l;   // hanya unggahan yang lolos validasi dihitung: berkas ditolak boleh diperbaiki berulang
  const id = acak(8), namaBerkas = (url.searchParams.get("nama") ?? "").slice(0, 120) || null;
  try {
    await env.DB.batch([env.DB.prepare("INSERT INTO sippa_ab_unggah (id, nama_berkas, sha, n_baris, status, oleh, waktu, dummy) VALUES (?, ?, ?, ?, 'draf', ?, ?, ?)").bind(id, namaBerkas, sha, nilai.length, a.oleh, kini, dm),
      ...nilai.map(v => env.DB.prepare(SQL_PETAK).bind(acak(8), id, ...KOLOM_AB.map(k => v[k] ?? null), dm)), jejakStmt(env, a.oleh, "sippa_ab_unggah:" + id, "ab_unggah", `n${nilai.length}`, null, kini, dm)]);
  } catch (e) { if (/UNIQUE constraint failed: sippa_ab_unggah\.sha/.test(String(e?.message || e))) return gagal(409, "berkas yang sama persis sudah pernah diunggah"); if (/CHECK|UNIQUE/.test(String(e?.message || e))) return gagal(400, bersihGalat(e)); throw e; }
  return json({unggah_id: id, n: nilai.length}, 201);
}
async function abDaftar(env, req, url) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const aoi = url.searchParams.get("aoi"), lengan = url.searchParams.get("lengan"), w = ["dummy <= ?"], p = [lihatDummy(req)];
  if (aoi !== null) { if (aoi.length < 1 || aoi.length > 40) return gagal(400, "aoi harus 1 sampai 40 karakter"); w.push("aoi = ?"); p.push(aoi); }
  if (lengan !== null) { if (!LENGAN.includes(lengan)) return gagal(400, `lengan harus salah satu dari ${LENGAN.join(", ")}`); w.push("lengan = ?"); p.push(lengan); }
  const [pt, un] = await Promise.all([env.DB.prepare(`SELECT * FROM sippa_petak WHERE ${w.join(" AND ")} ORDER BY aoi, petak_id LIMIT 5001`).bind(...p).all(),
    env.DB.prepare("SELECT id, nama_berkas, n_baris, status, oleh, waktu, dummy FROM sippa_ab_unggah WHERE dummy <= ? ORDER BY waktu DESC, rowid DESC LIMIT 100").bind(lihatDummy(req)).all()]);
  const petak = pt.results.filter(x => dalam(req, x.prov)), terlihat = new Set(petak.map(x => x.unggah_id)), bebas = dalamWilayahStaf(req, []);
  return json({petak: petak.slice(0, 5000), terpotong: pt.results.length > 5000, unggah: bebas ? un.results : un.results.filter(x => terlihat.has(x.id))});
}
async function abCsv(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.csv", 60, kini); if (l) return l;
  const s = await env.DB.prepare("SELECT * FROM sippa_petak WHERE dummy <= ? ORDER BY aoi, petak_id LIMIT 20000").bind(lihatDummy(req)).all();
  return berkasCsv("ab", csv(KOLOM_PETAK_CSV, s.results.filter(x => dalam(req, x.prov))), kini);
}
async function abStatus(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "M"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.ab", 20, kini); if (l) return l;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.status !== "ditinjau_evaluator") return gagal(400, "status hanya boleh ditinjau_evaluator");
  const u = await env.DB.prepare("SELECT id, status, dummy FROM sippa_ab_unggah WHERE id = ? AND dummy <= ?").bind(id, lihatDummy(req)).first(); if (!u) return tdk("unggahan tidak ada");
  if (u.status === "ditinjau_evaluator") return json({id, status: u.status});   // idempoten: tidak menulis jejak kedua
  await env.DB.batch([env.DB.prepare("UPDATE sippa_ab_unggah SET status = 'ditinjau_evaluator' WHERE id = ?").bind(id), jejakStmt(env, a.oleh, "sippa_ab_unggah:" + id, "ab_status", "ditinjau_evaluator", null, kini, u.dummy)]);
  return json({id, status: "ditinjau_evaluator"});
}
const objekJson = (s) => { try { const o = JSON.parse(s); return o; } catch (e) { return null; } };
async function skenarioDaftar(env, req, url) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const id = url.searchParams.get("id"); if (id !== null && !RE_ID.test(id)) return gagal(400, "id harus id skenario 16 heks");
  const r = await env.DB.prepare(`SELECT id, nama, ${id ? "state, " : ""}versi_mesin, ringkas, oleh, waktu, dummy FROM sippa_skenario WHERE dihapus IS NULL AND dummy <= ?${id ? " AND id = ?" : ""} ORDER BY waktu DESC, rowid DESC LIMIT 200`).bind(lihatDummy(req), ...(id ? [id] : [])).all();
  if (id && !r.results.length) return tdk("skenario tidak ada");
  return json({skenario: r.results.map(x => ({...x, ringkas: x.ringkas ? objekJson(x.ringkas) : null, ...(id ? {state: objekJson(x.state)} : {})}))});
}
async function skenarioBuat(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.skenario", 120, kini); if (l) return l;
  const b = await bacaJsonByte(req, MAKS_STATE + 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const nama = teksOK(b.o.nama, 3, 80), versi = teksOK(b.o.versi_mesin, 3, 40), s = b.o.state, rg = b.o.ringkas;
  if (nama === undefined) return gagal(400, "nama harus 3 sampai 80 karakter"); if (versi === undefined) return gagal(400, "versi_mesin harus 3 sampai 40 karakter");
  if (!s || typeof s !== "object" || Array.isArray(s)) return gagal(400, "state harus objek JSON");
  const st = JSON.stringify(s); if (byteLen(st) > MAKS_STATE) return gagal(400, `state ${byteLen(st)} byte, maksimal ${MAKS_STATE}`);
  let rs = null; if (rg !== undefined && rg !== null) { if (typeof rg !== "object" || Array.isArray(rg)) return gagal(400, "ringkas harus objek JSON"); rs = JSON.stringify(rg); if (byteLen(rs) > MAKS_META) return gagal(400, `ringkas lebih dari ${MAKS_META} byte`); }
  const id = acak(8), dm = dummyStaf(req, a.oleh);
  await env.DB.batch([env.DB.prepare("INSERT INTO sippa_skenario (id, nama, state, versi_mesin, ringkas, oleh, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, nama, st, versi, rs, a.oleh, kini, dm), jejakStmt(env, a.oleh, "sippa_skenario:" + id, "skenario_buat", null, null, kini, dm)]);
  return json({id}, 201);
}
async function skenarioHapus(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.skenario", 120, kini); if (l) return l;
  const s = await env.DB.prepare("SELECT id, oleh, dummy FROM sippa_skenario WHERE id = ? AND dihapus IS NULL AND dummy <= ? AND dummy >= ?").bind(id, lihatDummy(req), loDummy(req)).first(); if (!s) return tdk("skenario tidak ada");
  if (s.oleh !== a.oleh && !await modOK(env, req)) return gagal(403, "skenario hanya boleh dihapus pembuatnya atau moderator");
  await env.DB.batch([env.DB.prepare("UPDATE sippa_skenario SET dihapus = ? WHERE id = ? AND dihapus IS NULL").bind(kini, id), jejakStmt(env, a.oleh, "sippa_skenario:" + id, "skenario_hapus", null, null, kini, s.dummy)]);
  return json({id, dihapus: kini});
}
async function laporanDaftar(env, req, url) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const jenis = url.searchParams.get("jenis"); if (jenis !== null && !JENIS_LAPORAN.includes(jenis)) return gagal(400, `jenis harus salah satu dari ${JENIS_LAPORAN.join(", ")}`);
  const r = await env.DB.prepare(`SELECT id, jenis, prov, parameter, ada_berkas, ukuran, oleh, waktu, dummy FROM sippa_laporan WHERE dummy <= ?${jenis ? " AND jenis = ?" : ""} ORDER BY waktu DESC, rowid DESC LIMIT 200`).bind(lihatDummy(req), ...(jenis ? [jenis] : [])).all();
  return json({laporan: r.results.filter(x => dalam(req, x.prov)).map(x => ({...x, parameter: objekJson(x.parameter)}))});
}
async function laporanBuat(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.laporan", 30, kini); if (l) return l;
  if (!(req.headers.get("content-type") || "").startsWith("multipart/form-data")) return gagal(400, "kirim sebagai multipart/form-data dengan medan meta dan berkas");
  const pjg = Number(req.headers.get("content-length") || 0);
  if (!(pjg > 0)) return gagal(411, "Content-Length wajib pada unggahan");
  if (pjg > MAKS_LAPORAN + 65536) return gagal(413, `kiriman ${pjg} byte, maksimal ${MAKS_LAPORAN}`);
  let f; try { f = await req.formData(); } catch (e) { return gagal(400, "formulir tidak terbaca"); }
  const mentah = f.get("meta"); if (typeof mentah !== "string") return gagal(400, "medan meta wajib berisi JSON");
  if (byteLen(mentah) > MAKS_META) return gagal(400, `meta ${byteLen(mentah)} byte, maksimal ${MAKS_META}`);
  let meta; try { meta = JSON.parse(mentah); } catch (e) { return gagal(400, "meta bukan JSON"); }
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return gagal(400, "meta harus objek JSON");
  if (!JENIS_LAPORAN.includes(meta.jenis)) return gagal(400, `jenis harus salah satu dari ${JENIS_LAPORAN.join(", ")}`);
  if (!meta.parameter || typeof meta.parameter !== "object" || Array.isArray(meta.parameter)) return gagal(400, "parameter harus objek JSON");
  const par = JSON.stringify(meta.parameter); if (byteLen(par) > MAKS_META) return gagal(400, `parameter lebih dari ${MAKS_META} byte`);
  if (meta.prov !== undefined && meta.prov !== null && !(typeof meta.prov === "string" && RE_PROV.test(meta.prov))) return gagal(400, "prov harus kode provinsi 2 digit");
  const prov = meta.prov ?? null; if (prov === null ? !dalamWilayahStaf(req, []) : !dalam(req, prov)) return prov === null ? gagal(400, "prov wajib untuk staf berwilayah") : tdk("wilayah tidak tersedia");
  const berkas = f.get("berkas"); let bytes = null;
  if (berkas !== null) {
    if (!(berkas instanceof File) || !berkas.size) return gagal(400, "medan berkas wajib berisi PDF");
    if (berkas.size > MAKS_LAPORAN) return gagal(413, `PDF ${berkas.size} byte, maksimal ${MAKS_LAPORAN}`);
    bytes = new Uint8Array(await berkas.arrayBuffer());
    if (!(bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-")) return gagal(400, "berkas harus PDF (diawali %PDF-)");   // dari byte awal, bukan nama atau Content-Type kiriman
    if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum tersedia");
  }
  const id = acak(8), kunci = `sippa-laporan/${id}.pdf`, dm = dummyStaf(req, a.oleh);
  if (bytes) await env.MEDIA.put(kunci, bytes, {httpMetadata: {contentType: "application/pdf"}});   // kunci selalu dari server
  try { await env.DB.batch([env.DB.prepare("INSERT INTO sippa_laporan (id, jenis, prov, parameter, ada_berkas, sha, ukuran, oleh, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, meta.jenis, prov, par, bytes ? 1 : 0, bytes ? await hexSha(bytes) : null, bytes ? bytes.length : null, a.oleh, kini, dm),
    jejakStmt(env, a.oleh, "sippa_laporan:" + id, "laporan", meta.jenis, null, kini, dm)]); }
  catch (e) { if (bytes) await env.MEDIA.delete(kunci).catch(() => {}); throw e; }
  return json({id}, 201);
}
async function laporanBerkas(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const r = await env.DB.prepare("SELECT id, jenis, prov, waktu, ada_berkas FROM sippa_laporan WHERE id = ? AND dummy <= ?").bind(id, lihatDummy(req)).first();
  if (!r || !r.ada_berkas || !dalam(req, r.prov)) return tdk("laporan tidak ada");
  if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum tersedia");
  const o = await env.MEDIA.get(`sippa-laporan/${id}.pdf`); if (!o) return tdk("berkas laporan tidak ada");
  return new Response(o.body, {headers: {"content-type": "application/pdf", "content-disposition": `attachment; filename="sippa-${r.jenis}-${r.prov ?? "nasional"}-${tgl(r.waktu)}.pdf"`, "content-security-policy": "sandbox", "cache-control": "private, no-store"}});
}

/* ================================================================ telemetri (DT §3.4, §6.3, ADR-07; PRD §9.11; skema 0058): satu baris per PESAN, token perangkat, alarm
   - POST /telemetri memakai token perangkat (Authorization: Bearer), bukan sesi; token hanya bisa menulis telemetri kit itu dan tidak bisa membaca apa pun.
   - Batas 120 pesan per jam dihitung dari baris sippa_telemetri sendiri (tanpa tulisan laju); hanya token SALAH yang menulis ke laju_bnpb (sippa.token_gagal).
   - Pesan sama dikirim ulang = ganda (id = sha256(token_sha + badan)[:32], ON CONFLICT DO NOTHING, bukan INSERT OR IGNORE: ADR-08).
   ponytail: nilai_terakhir dan terakhir di GET /perangkat dibaca dari 10 pesan terakhir per kit (indeks kit_id, t_akhir); sensor yang tidak ada di 10 pesan itu tampil tanpa nilai. Bila menyesatkan, simpan baris "terakhir" per perangkat. */
const JENIS_PERANGKAT = ["gateway", "tekanan", "debit", "level", "suhu_gambut", "muka_air_tanah", "co", "pm25", "bbm", "rpm", "posisi"];
const SATUAN_PERANGKAT = ["-", "bar", "m3/jam", "L/s", "m", "C", "ppm", "ug/m3", "%", "rpm", "derajat"], KEDALAMAN_CM = [10, 30, 50, 100, 150, 300, 400, 500];
const RE_TAG = /^[A-Z]{1,5}-\d{1,6}$/, RE_TAG_DATAR = /^[A-Za-z0-9_]{1,20}$/, RE_DATAR = /^([A-Z]+)(\d+)(?:_(\d+)cm)?_([A-Za-z0-9]+)$/;
const RE_WAKTU = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,3})?(Z|[+-]\d\d:\d\d)$/;
const MAKS_PESAN = 65536, MAKS_BACAAN = 500, PESAN_PER_JAM = 120, DEPAN_MS = 5 * 60e3, USIA_MS = 30 * HARI, MAKS_SERI = 5000, MAKS_ALARM = 500;
const SATUAN_DATAR = {bar: "bar", m3h: "m3/jam", Ls: "L/s", m: "m", C: "C", ppm: "ppm", ugm3: "ug/m3", pct: "%", rpm: "rpm", deg: "derajat"};
/* Semua ambang asumsi-kebijakan sampai G2 (PRD §9.11, DT §6.3.1). PN dan debit operasi bawaan = kit gambut (pompa 1,0 MPa, 300 L/min = 18 m3/jam, PRD §6.1); ganti per kit bila datanya ada. */
export const AMBANG_ALARM = {npsh_bar: -0.6, hisap_tutup_berturut: 2, debit_operasi_m3jam: 18, debit_frac: 0.2, debit_menit: 2, dry_run_detik: 30, pn_bar: 10, f_suhu: 1, tekanan_frac: 0.88,
  suhu_c: 50, tahap_jam: 24, co_ppm: 35, co_menit: 15, bbm_persen: 20, diam_x: 3, senyap_menit: 30};
export const KODE_ALARM = ["hisap_rendah", "debit_rendah", "dry_run", "tekanan_lebih", "belum_dingin", "co_tinggi", "bbm_rendah", "diam"];

/* Bentuk datar paket pemilik -> bentuk bersarang (murni). Kunci bacaan dipecah RE_DATAR; padanan ke tag P&ID lewat sippa_perangkat.tag_datar (BT-02: penomoran pemilik tidak sama dengan P&ID, jadi tidak ditebak). */
export function dariDatar(o) {
  const bacaan = [], asing = [];
  for (const [k, v] of Object.entries(o)) {
    if (k === "site_id" || k === "utc_time" || k === "sensor_quality" || k === "source") continue;
    const m = RE_DATAR.exec(k);
    if (!m) { asing.push(k); continue; }
    bacaan.push({tag_datar: k, awalan: m[1], nomor: m[2], kedalaman_cm: m[3] ? Number(m[3]) : null, satuan: SATUAN_DATAR[m[4]] ?? m[4], nilai: v, waktu: o.utc_time});
  }
  return {kit: o.site_id, dikirim: o.utc_time, sumber: o.source, sensor_quality: o.sensor_quality, bacaan, asing};
}

/* Evaluasi alarm dari seri pesan terakhir (murni, DT §6.3.1). seri = Map(tag -> [[t_ms, nilai]] naik menurut waktu). Hasil: [{perangkat_id, kode, aksi: "buka"|"tutup", nilai, ambang}];
   kondisi tidak berubah = tidak ada butir. Tidak mengevaluasi "diam" (itu kerja cron: bersihkanSippa). */
export function nilaiAlarm(perangkat, seri, {kini, tahap24 = false, A = AMBANG_ALARM}) {
  const per = new Map(perangkat.map(p => [p.tag, p])), s = tag => seri.get(tag) ?? [], akhir = a => a[a.length - 1], hasil = [];
  const catat = (p, kode, buka, nilai, ambang) => { if (p && buka !== null) hasil.push({perangkat_id: p.id, kode, aksi: buka ? "buka" : "tutup", nilai, ambang}); };
  const rpmDi = t => { let r = null; for (const [tt, v] of s("RPM-101")) { if (tt > t) break; r = v; } return r; };   // RPM terakhir pada atau sebelum t
  const lari = (a, pred) => { let i = a.length - 1; if (i < 0 || !pred(a[i])) return -1; while (i > 0 && pred(a[i - 1])) i--; return akhir(a)[0] - a[i][0]; };   // -1: bacaan terakhir tidak memenuhi; selain itu lama (ms) syarat bertahan
  const hisap = s("PT-101");
  if (hisap.length) { const v = akhir(hisap)[1], aman = hisap.length >= A.hisap_tutup_berturut && hisap.slice(-A.hisap_tutup_berturut).every(x => x[1] >= A.npsh_bar);
    catat(per.get("PT-101"), "hisap_rendah", v < A.npsh_bar ? true : aman ? false : null, v, A.npsh_bar); }
  const ft = s("FT-101"), pf = per.get("FT-101");
  if (ft.length && pf) {
    const f = pf.satuan === "L/s" ? 3.6 : 1, batas = A.debit_operasi_m3jam * A.debit_frac, v = akhir(ft)[1], rpm = s("RPM-101"), rpmMati = rpm.length > 0 && akhir(rpm)[1] <= 0;   // f: nilai FT ke m3/jam
    catat(pf, "debit_rendah", lari(ft, ([t, x]) => x * f < batas && rpmDi(t) > 0) >= A.debit_menit * 60e3 ? true : v * f >= batas ? false : null, v, batas / f);
    catat(pf, "dry_run", lari(ft, ([t, x]) => x <= 0 && rpmDi(t) > 0) >= A.dry_run_detik * 1000 ? true : v > 0 || rpmMati ? false : null, v, 0);
  }
  const buang = s("PT-102");
  if (buang.length) { const batas = A.tekanan_frac * A.pn_bar * A.f_suhu, v = akhir(buang)[1]; catat(per.get("PT-102"), "tekanan_lebih", v > batas, v, batas); }
  for (const p of perangkat) if (p.jenis === "suhu_gambut" && s(p.tag).length) { const v = akhir(s(p.tag))[1]; catat(p, "belum_dingin", v <= A.suhu_c ? false : tahap24 ? true : null, v, A.suhu_c); }
  const co = s("CO-101").filter(x => x[0] >= kini - A.co_menit * 60e3);
  if (co.length) { const m = Math.round(100 * co.reduce((j, x) => j + x[1], 0) / co.length) / 100; catat(per.get("CO-101"), "co_tinggi", m > A.co_ppm, m, A.co_ppm); }
  const bbm = s("BBM-101");
  if (bbm.length) { const v = akhir(bbm)[1]; catat(per.get("BBM-101"), "bbm_rendah", v < A.bbm_persen, v, A.bbm_persen); }
  return hasil;
}

/* tulis alarm untuk kit pengirim sesudah pesan tersimpan: baca seri 15 menit terakhir (json_each, baca bukan tulis), buka yang baru, tutup yang pulih.
   Alarm yang baru ditutup MANUAL tidak dibuka lagi dalam senyap_menit (hemat kuota tulis D1). */
async function periksaAlarm(env, pengirim, perangkat, idBicara, kini) {
  const A = AMBANG_ALARM, dari = kini - A.co_menit * 60e3, kit = pengirim.kit_id;
  const [seriR, alarmR, log] = await Promise.all([
    env.DB.prepare("SELECT json_extract(b.value, '$[0]') tag, json_extract(b.value, '$[1]') t, json_extract(b.value, '$[2]') v FROM sippa_telemetri x, json_each(x.bacaan) b WHERE x.kit_id = ? AND x.t_akhir >= ? AND json_extract(b.value, '$[1]') >= ? ORDER BY 2").bind(kit, dari, dari).all(),
    env.DB.prepare("SELECT id, perangkat_id, kode, ditutup, ditutup_oleh FROM sippa_alarm WHERE kit_id = ? AND (ditutup IS NULL OR ditutup >= ?)").bind(kit, kini - A.senyap_menit * 60e3).all(),
    perangkat.some(p => p.jenis === "suhu_gambut") ? env.DB.prepare("SELECT max(t_selesai) t FROM sippa_log_gelar WHERE kit_id = ?").bind(kit).first() : null]);
  const seri = new Map(); for (const r of seriR.results) { if (!seri.has(r.tag)) seri.set(r.tag, []); seri.get(r.tag).push([r.t, r.v]); }
  const terbuka = new Map(alarmR.results.filter(a => a.ditutup == null).map(a => [a.perangkat_id + "|" + a.kode, a.id]));
  const senyap = new Set(alarmR.results.filter(a => a.ditutup != null && a.ditutup_oleh !== "otomatis" && a.ditutup_oleh !== "dicabut").map(a => a.perangkat_id + "|" + a.kode));
  const tutup = id => env.DB.prepare("UPDATE sippa_alarm SET ditutup = ?, ditutup_oleh = 'otomatis' WHERE id = ? AND ditutup IS NULL").bind(kini, id), stm = [];
  for (const h of nilaiAlarm(perangkat, seri, {kini, tahap24: log?.t != null && kini - log.t >= A.tahap_jam * 3600e3})) {
    const k = h.perangkat_id + "|" + h.kode;
    if (h.aksi === "buka" && !terbuka.has(k) && !senyap.has(k)) stm.push(env.DB.prepare("INSERT INTO sippa_alarm (id, perangkat_id, kit_id, kode, nilai, ambang, mulai, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING")
      .bind(acak(8), h.perangkat_id, kit, h.kode, h.nilai, h.ambang, kini, pengirim.dummy));
    else if (h.aksi === "tutup" && terbuka.has(k)) stm.push(tutup(terbuka.get(k)));
  }
  for (const a of alarmR.results) if (a.ditutup == null && a.kode === "diam" && idBicara.has(a.perangkat_id)) stm.push(tutup(a.id));   // perangkat yang baru bicara tidak lagi diam
  if (stm.length) await env.DB.batch(stm);
}

const tglWib = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const waktuMs = v => typeof v === "string" && RE_WAKTU.test(v) ? Date.parse(v) : NaN;
async function telemetriMasuk(env, req, url, kini) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const m = /^Bearer ([0-9a-fA-F]{64})$/.exec((req.headers.get("authorization") || "").trim()), tsha = m ? await sha(m[1].toLowerCase()) : null;
  const p = tsha ? await env.DB.prepare("SELECT p.id, p.kit_id, p.dummy, k.kode AS kit_kode FROM sippa_perangkat p JOIN sippa_kit k ON k.id = p.kit_id WHERE p.token_sha = ? AND p.aktif = 1").bind(tsha).first() : null;
  if (!p) return await laju(env, await ipHash(env, req), "sippa.token_gagal", [[JAM, 300]], kini) ?? gagal(401, "token perangkat tidak berlaku (salah atau dicabut)", {"www-authenticate": "Bearer"});
  const pernah = (await env.DB.prepare("SELECT count(*) n FROM sippa_telemetri WHERE pengirim_id = ? AND diterima > ?").bind(p.id, kini - JAM).first()).n;
  if (pernah >= PESAN_PER_JAM) return gagal(429, `batas ${PESAN_PER_JAM} pesan per jam untuk perangkat ini sudah tercapai`, {"retry-after": "3600"});
  const b = await bacaBytes(req, MAKS_PESAN); if (b.galat) return gagal(b.status || 400, b.galat);
  const teks = new TextDecoder().decode(b.b); let o; try { o = JSON.parse(teks); } catch (e) { return gagal(400, "body bukan JSON"); }
  if (!o || typeof o !== "object" || Array.isArray(o)) return gagal(400, "body harus objek JSON");
  const datar = o.bacaan === undefined && typeof o.site_id === "string", psn = datar ? dariDatar(o) : o;   // satu bentuk saja yang disimpan
  if (!Array.isArray(psn.bacaan) || psn.bacaan.length < 1 || psn.bacaan.length > MAKS_BACAAN) return gagal(400, `bacaan harus larik 1 sampai ${MAKS_BACAAN} butir`);
  if (psn.kit !== p.kit_kode) return gagal(400, "kit di pesan tidak sama dengan kit milik token ini");
  const sq = typeof psn.sensor_quality === "number" && Number.isFinite(psn.sensor_quality) ? psn.sensor_quality : null;
  const rows = (await env.DB.prepare("SELECT id, tag, tag_datar, jenis, satuan, kedalaman_cm, min_sah, maks_sah FROM sippa_perangkat WHERE kit_id = ? AND aktif = 1").bind(p.kit_id).all()).results;
  const perTag = new Map(rows.map(r => [r.tag, r])), perDatar = new Map(rows.filter(r => r.tag_datar).map(r => [r.tag_datar, r]));
  const simpan = [], ditandai = [], bicara = new Set(), tandai = (tag, alasan) => ditandai.push({tag: typeof tag === "string" ? tag.slice(0, 20) : null, alasan});
  for (const k of psn.asing ?? []) tandai(k, "tag_asing");
  for (const x of psn.bacaan) {
    if (!x || typeof x !== "object" || Array.isArray(x)) { tandai(null, "bacaan harus objek"); continue; }
    const ref = typeof x.tag === "string" ? perTag.get(x.tag) : typeof x.tag_datar === "string" ? perDatar.get(x.tag_datar) : null, nama = x.tag ?? x.tag_datar;
    if (!ref) { tandai(nama, "tag_asing"); continue; }
    const t = waktuMs(x.waktu ?? psn.dikirim);
    if (Number.isNaN(t)) { tandai(nama, "waktu tidak sah (ISO 8601 dengan zona)"); continue; }
    if (t > kini + DEPAN_MS) { tandai(nama, "waktu lebih dari 5 menit di depan server"); continue; }
    if (t < kini - USIA_MS) { tandai(nama, "waktu lebih tua dari 30 hari"); continue; }
    if (x.satuan !== undefined && x.satuan !== ref.satuan) { tandai(nama, `satuan tidak sama dengan perangkat (${ref.satuan})`); continue; }
    if (typeof x.nilai !== "number" || !Number.isFinite(x.nilai)) { tandai(nama, "nilai harus angka"); continue; }
    if (x.kedalaman_cm != null && !Number.isInteger(x.kedalaman_cm)) { tandai(nama, "kedalaman_cm harus bilangan bulat"); continue; }
    const luar = (ref.min_sah != null && x.nilai < ref.min_sah) || (ref.maks_sah != null && x.nilai > ref.maks_sah);   // di luar rentang sah DISIMPAN dengan mutu 2, bukan dibuang
    simpan.push([ref.tag, t, x.nilai, luar ? 2 : sq !== null && sq < 0.5 ? 1 : 0, x.kedalaman_cm ?? ref.kedalaman_cm ?? null]); bicara.add(ref.id);
  }
  if (!simpan.length) return json({diterima: 0, ditandai, ganda: false}, 202);
  const waktu = simpan.map(r => r[1]), mutu2 = simpan.filter(r => r[3] === 2).length, id = (await sha(tsha + teks)).slice(0, 32);
  const r = await env.DB.prepare("INSERT INTO sippa_telemetri (id, pengirim_id, kit_id, diterima, t_awal, t_akhir, n, n_mutu2, bacaan, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
    .bind(id, p.id, p.kit_id, kini, Math.min(...waktu), Math.max(...waktu), simpan.length, mutu2, JSON.stringify(simpan), p.dummy).run();
  if (!r.meta.changes) return json({diterima: 0, ditandai, ganda: true}, 202);
  bicara.add(p.id);
  try { await periksaAlarm(env, p, rows, bicara, kini); } catch (e) { if (!tanpaTabel(e)) console.error("sippa alarm", String(e?.message || e).slice(0, 200)); }   // pesan sudah tersimpan; gagal alarm tidak boleh membuat gateway mengirim ulang
  return json({diterima: simpan.length, ditandai, ganda: false}, 202);
}

/* kolom perangkat yang boleh keluar: tanpa token_sha */
const KOLOM_PERANGKAT = "p.id, p.kit_id, k.kode AS kit_kode, k.prov, p.tag, p.tag_datar, p.jenis, p.satuan, p.kedalaman_cm, p.min_sah, p.maks_sah, p.interval_s, p.aktif, p.dibuat, p.dummy, p.token_sha IS NOT NULL AS bertoken";
const perangkatLihat = async (env, req, id) => { const r = await env.DB.prepare(`SELECT ${KOLOM_PERANGKAT} FROM sippa_perangkat p JOIN sippa_kit k ON k.id = p.kit_id WHERE p.id = ? AND p.dummy <= ?`).bind(id, lihatDummy(req)).first(); return r && dalam(req, r.prov) ? r : null; };
const tanpaProv = ({prov, bertoken, ...sisa}) => bertoken === undefined ? sisa : {...sisa, bertoken: !!bertoken};
async function perangkatDaftar(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const P = (await env.DB.prepare(`SELECT ${KOLOM_PERANGKAT} FROM sippa_perangkat p JOIN sippa_kit k ON k.id = p.kit_id WHERE p.dummy <= ? ORDER BY k.kode, p.tag LIMIT 2000`).bind(lihatDummy(req)).all()).results.filter(r => dalam(req, r.prov));
  const kits = [...new Set(P.map(r => r.kit_id))];   // satu SELECT per kit lewat indeks (kit_id, t_akhir): 10 pesan terakhir; satu batch, hanya baca
  const pesan = kits.length ? await env.DB.batch(kits.map(k => env.DB.prepare("SELECT pengirim_id, diterima, t_akhir, bacaan FROM sippa_telemetri WHERE kit_id = ? ORDER BY t_akhir DESC LIMIT 10").bind(k))) : [];
  const per = new Map(kits.map((k, i) => [k, pesan[i].results]));
  const out = P.map(r => {
    let terakhir = null, nilai = null, mutu = null;
    for (const m of per.get(r.kit_id) ?? []) {   // dari pesan terbaru
      if (r.jenis === "gateway") { if (m.pengirim_id === r.id) { terakhir = m.diterima; break; } continue; }
      let b = null; for (const x of JSON.parse(m.bacaan)) if (x[0] === r.tag && (!b || x[1] > b[1])) b = x;
      if (b) { terakhir = m.t_akhir; nilai = b[2]; mutu = b[3]; break; }
    }
    return {...tanpaProv(r), terakhir, nilai_terakhir: nilai, mutu_terakhir: mutu};
  });
  return json({perangkat: out});
}
async function perangkatBuat(env, req, url, kini) {
  const a = await akses(env, req, "M"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.perangkat", 60, kini); if (l) return l;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, angka = v => v == null || (typeof v === "number" && Number.isFinite(v));
  if (typeof o.kit_id !== "string" || !RE_ID.test(o.kit_id)) return gagal(400, "kit_id harus id kit 16 heks");
  if (typeof o.tag !== "string" || !RE_TAG.test(o.tag) || o.tag.length > 12) return gagal(400, "tag harus berbentuk P&ID huruf besar, tanda hubung, angka (PT-101, GWT-101), paling banyak 12 karakter");
  if (!JENIS_PERANGKAT.includes(o.jenis)) return gagal(400, `jenis harus salah satu dari ${JENIS_PERANGKAT.join(", ")}`);
  if (!SATUAN_PERANGKAT.includes(o.satuan)) return gagal(400, `satuan harus salah satu dari ${SATUAN_PERANGKAT.join(", ")}`);
  if (o.kedalaman_cm != null && !KEDALAMAN_CM.includes(o.kedalaman_cm)) return gagal(400, `kedalaman_cm harus salah satu dari ${KEDALAMAN_CM.join(", ")}`);
  if (!angka(o.min_sah) || !angka(o.maks_sah)) return gagal(400, "min_sah dan maks_sah harus angka");
  if (o.min_sah != null && o.maks_sah != null && !(o.maks_sah > o.min_sah)) return gagal(400, "maks_sah harus lebih besar dari min_sah");
  if (o.interval_s != null && !(Number.isInteger(o.interval_s) && o.interval_s >= 10 && o.interval_s <= 3600)) return gagal(400, "interval_s bilangan bulat 10 sampai 3600");
  if (o.tag_datar != null && !(typeof o.tag_datar === "string" && RE_TAG_DATAR.test(o.tag_datar))) return gagal(400, "tag_datar 1 sampai 20 huruf, angka, garis bawah");
  if (o.beri_token != null && typeof o.beri_token !== "boolean") return gagal(400, "beri_token harus true atau false");
  const kit = await kitTulis(env, req, o.kit_id); if (!kit) return gagal(400, "kit_id tidak ditemukan");
  if (await env.DB.prepare("SELECT 1 FROM sippa_perangkat WHERE kit_id = ? AND (tag = ? OR (? IS NOT NULL AND tag_datar = ?))").bind(kit.id, o.tag, o.tag_datar ?? null, o.tag_datar ?? null).first()) return gagal(409, "tag atau tag_datar sudah dipakai perangkat lain di kit ini");
  const token = o.jenis === "gateway" || o.beri_token ? acak(32) : null, id = acak(8), dm = dummyStaf(req, a.oleh) || kit.dummy;   // gateway selalu bertoken; token 64 heks tampil SEKALI, hanya sha256-nya disimpan
  await env.DB.batch([env.DB.prepare("INSERT INTO sippa_perangkat (id, kit_id, tag, tag_datar, jenis, satuan, kedalaman_cm, min_sah, maks_sah, interval_s, token_sha, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, kit.id, o.tag, o.tag_datar ?? null, o.jenis, o.satuan, o.kedalaman_cm ?? null, o.min_sah ?? null, o.maks_sah ?? null, o.interval_s ?? 60, token ? await sha(token) : null, kini, dm),
    jejakStmt(env, a.oleh, "sippa_perangkat:" + id, "perangkat", o.tag, `${o.jenis} kit ${kit.kode}`, kini, dm)]);
  const baris = await env.DB.prepare(`SELECT ${KOLOM_PERANGKAT} FROM sippa_perangkat p JOIN sippa_kit k ON k.id = p.kit_id WHERE p.id = ?`).bind(id).first();
  return json({perangkat: tanpaProv(baris), ...(token ? {token} : {})}, 201);
}
async function perangkatCabut(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "M"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.perangkat", 60, kini); if (l) return l;
  const p = await perangkatLihat(env, req, id); if (!p) return tdk("perangkat tidak ada");
  if (!p.aktif) return json({id, aktif: 0});   // idempoten: tanpa jejak kedua
  await env.DB.batch([env.DB.prepare("UPDATE sippa_perangkat SET aktif = 0 WHERE id = ?").bind(id),
    env.DB.prepare("UPDATE sippa_alarm SET ditutup = ?, ditutup_oleh = 'dicabut' WHERE perangkat_id = ? AND ditutup IS NULL").bind(kini, id),   // alarm perangkat yang sudah tiada tidak boleh menggantung
    jejakStmt(env, a.oleh, "sippa_perangkat:" + id, "cabut", p.tag, null, kini, dummyStaf(req, a.oleh) || p.dummy)]);
  return json({id, aktif: 0});
}
async function telemetriBaca(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const q = url.searchParams, id = q.get("perangkat"), harian = q.get("harian"), sejakQ = q.get("sejak");
  if (id === null || !RE_ID.test(id)) return gagal(400, "perangkat harus id perangkat 16 heks");
  if (harian !== null && harian !== "1") return gagal(400, "harian hanya boleh 1");
  if (sejakQ !== null && !RE_MS.test(sejakQ)) return gagal(400, "sejak harus milidetik epoch (bilangan bulat)");
  /* seri mentah hanya ada 30 hari (lalu diringkas), jadi sejak > 30 hari ke belakang ditolak; ringkasan harian justru berisi data yang lebih tua dari itu, bawaannya setahun */
  const sejak = sejakQ === null ? kini - (harian ? 365 * HARI : 24 * JAM) : Number(sejakQ);
  if (!harian && sejak < kini - USIA_MS) return gagal(400, "sejak tidak boleh lebih dari 30 hari ke belakang");
  const p = await perangkatLihat(env, req, id); if (!p) return tdk("perangkat tidak ada");
  const ambang = {min_sah: p.min_sah, maks_sah: p.maks_sah};
  if (harian) return json({harian: (await env.DB.prepare("SELECT hari, n, min, maks, rerata, n_mutu2 FROM sippa_telemetri_harian WHERE perangkat_id = ? AND hari >= ? ORDER BY hari").bind(id, tglWib(sejak)).all()).results, ambang});
  const r = (await env.DB.prepare("SELECT json_extract(b.value, '$[1]') t, json_extract(b.value, '$[2]') v, json_extract(b.value, '$[3]') m FROM sippa_telemetri x, json_each(x.bacaan) b WHERE x.kit_id = ? AND x.t_akhir >= ? AND json_extract(b.value, '$[0]') = ? AND json_extract(b.value, '$[1]') >= ? ORDER BY 1 DESC LIMIT ?")
    .bind(p.kit_id, sejak, p.tag, sejak, MAKS_SERI + 1).all()).results;
  return json({seri: r.slice(0, MAKS_SERI).reverse().map(x => [x.t, x.v, x.m]), ambang, terpotong: r.length > MAKS_SERI});   // yang terbaru dipertahankan bila terpotong
}
const KOLOM_ALARM = "a.id, a.perangkat_id, a.kit_id, a.kode, a.nilai, a.ambang, a.mulai, a.ditutup, a.ditutup_oleh, a.dummy, p.tag, k.kode AS kit_kode, k.prov";
async function alarmDaftar(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const aktif = url.searchParams.get("aktif"); if (aktif !== null && aktif !== "1") return gagal(400, "aktif hanya boleh 1");
  const r = (await env.DB.prepare(`SELECT ${KOLOM_ALARM} FROM sippa_alarm a JOIN sippa_perangkat p ON p.id = a.perangkat_id JOIN sippa_kit k ON k.id = a.kit_id WHERE a.dummy <= ?${aktif ? " AND a.ditutup IS NULL" : ""} ORDER BY a.mulai DESC LIMIT ${MAKS_ALARM}`).bind(lihatDummy(req)).all()).results;
  return json({alarm: r.filter(x => dalam(req, x.prov)).map(tanpaProv)});
}
async function alarmTutup(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tulis", 600, kini); if (l) return l;
  const r = await env.DB.prepare(`SELECT ${KOLOM_ALARM} FROM sippa_alarm a JOIN sippa_perangkat p ON p.id = a.perangkat_id JOIN sippa_kit k ON k.id = a.kit_id WHERE a.id = ? AND a.dummy <= ? AND a.dummy >= ?`).bind(id, lihatDummy(req), loDummy(req)).first();
  if (!r || !dalam(req, r.prov)) return tdk("alarm tidak ada");
  if (r.ditutup != null) return gagal(409, "alarm ini sudah tertutup");
  const t = await env.DB.batch([env.DB.prepare("UPDATE sippa_alarm SET ditutup = ?, ditutup_oleh = ? WHERE id = ? AND ditutup IS NULL").bind(kini, a.oleh, id), jejakStmt(env, a.oleh, "sippa_alarm:" + id, "alarm_tutup", r.kode, null, kini, dummyStaf(req, a.oleh) || r.dummy)]);
  if (!t[0].meta.changes) return gagal(409, "alarm ini sudah tertutup");
  return json({alarm: tanpaProv({...r, ditutup: kini, ditutup_oleh: a.oleh})});
}

/* cron menit 17 (bersihSemua di worker.js, tanpa jadwal baru): tiap jam perangkat yang diam > 3 x interval dibuka alarmnya; SEKALI SEHARI (jam 20 UTC = 03 WIB) pesan > 30 hari diringkas per perangkat per hari WIB lalu dihapus (satu db.batch).
   rerata digabung berbobot n; median harian tidak disimpan (tidak dipakai layar). Perangkat dummy tidak pernah memicu "diam" (datanya statis).
   ponytail: ringkas harian memindai seluruh tabel (t_akhir tanpa indeks sendiri, supaya tiap pesan tidak menulis indeks ketiga): sekali sehari ~43 rb baris per kit, sejam sekali akan melewati kuota baca D1 gratis (5 jt per hari) pada 5 kit.
   Bila cron jam 20 terlewat, pesan lama tinggal sehari lagi; paksa:true dipakai uji dan operator. */
export async function bersihkanSippa(env, kini = Date.now(), {paksa = false} = {}) {
  const batas = kini - USIA_MS, hariIni = paksa || new Date(kini).getUTCHours() === 20;
  const [ringkas, hapus] = !hariIni ? [{meta: {changes: 0}}, {meta: {changes: 0}}] : await env.DB.batch([
    env.DB.prepare(`INSERT INTO sippa_telemetri_harian (perangkat_id, hari, n, min, maks, rerata, n_mutu2, dummy)
      SELECT p.id, date((json_extract(b.value, '$[1]') / 1000) + 25200, 'unixepoch'), count(*), min(json_extract(b.value, '$[2]')), max(json_extract(b.value, '$[2]')), avg(json_extract(b.value, '$[2]')), coalesce(sum(json_extract(b.value, '$[3]') = 2), 0), max(t.dummy)
      FROM sippa_telemetri t, json_each(t.bacaan) b JOIN sippa_perangkat p ON p.kit_id = t.kit_id AND p.tag = json_extract(b.value, '$[0]')
      WHERE t.t_akhir < ?1 GROUP BY 1, 2
      ON CONFLICT (perangkat_id, hari) DO UPDATE SET n = n + excluded.n, min = min(min, excluded.min), maks = max(maks, excluded.maks),
        rerata = (rerata * n + excluded.rerata * excluded.n) / (n + excluded.n), n_mutu2 = n_mutu2 + excluded.n_mutu2`).bind(batas),
    env.DB.prepare("DELETE FROM sippa_telemetri WHERE t_akhir < ?").bind(batas)]);
  const diam = (await env.DB.prepare(`SELECT p.id, p.kit_id, p.interval_s FROM sippa_perangkat p
    WHERE p.aktif = 1 AND p.dummy = 0 AND p.dibuat < ?1 - 1000 * ?2 * p.interval_s
      AND EXISTS (SELECT 1 FROM sippa_telemetri k WHERE k.kit_id = p.kit_id AND k.t_akhir >= ?1 - ?3)
      AND NOT EXISTS (SELECT 1 FROM sippa_alarm a WHERE a.perangkat_id = p.id AND a.kode = 'diam' AND a.ditutup IS NULL)
      AND CASE WHEN p.jenis = 'gateway' THEN NOT EXISTS (SELECT 1 FROM sippa_telemetri x WHERE x.pengirim_id = p.id AND x.diterima >= ?1 - 1000 * ?2 * p.interval_s)
        ELSE NOT EXISTS (SELECT 1 FROM sippa_telemetri x, json_each(x.bacaan) b WHERE x.kit_id = p.kit_id AND x.t_akhir >= ?1 - 1000 * ?2 * p.interval_s AND json_extract(b.value, '$[0]') = p.tag) END
    LIMIT 500`).bind(kini, AMBANG_ALARM.diam_x, USIA_MS).all()).results;
  if (diam.length) await kumpul(env, diam.map(p => env.DB.prepare("INSERT INTO sippa_alarm (id, perangkat_id, kit_id, kode, nilai, ambang, mulai, dummy) VALUES (?, ?, ?, 'diam', NULL, ?, ?, 0) ON CONFLICT DO NOTHING")
    .bind(acak(8), p.id, p.kit_id, AMBANG_ALARM.diam_x * p.interval_s, kini)));
  console.log("sippa", JSON.stringify({aksi: "bersih", diringkas: ringkas.meta.changes, dihapus: hapus.meta.changes, diam: diam.length}));
  return {diringkas: ringkas.meta.changes, dihapus: hapus.meta.changes, diam: diam.length};
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
const DUMMY_AB = {
  konvensional: [[4200,6,1,1,1,0,0],[3800,6.5,1,0,1,1,0],[4600,7,1,1,0,1,0],[3500,5.5,0,0,1,1,0],[5000,7.5,1,1,0,0,0],[4100,6,1,0,1,1,0],[3900,6.5,0,0,1,1,0],[4400,7,1,1,1,0,0],[4800,7,1,0,1,1,0],[3600,6,0,0,1,1,0]],
  lance: [[4300,3.5,1,1,0,0,0],[4700,4,1,1,0,0,0],[3900,3.5,1,1,0,1,0],[5200,4.5,1,1,0,0,0],[4100,4,1,0,0,1,0],[4500,3.5,1,1,0,1,0],[4900,4,1,1,0,0,0],[3800,3.5,0,0,0,1,0],[4400,4.5,1,0,0,1,0],[4600,4,1,1,0,1,0]],
  lance_surfaktan: [[4200,3.5,1,1,0,0,0],[4600,4,1,1,0,0,0],[3900,3.5,1,1,0,1,0],[4800,4.5,1,1,0,0,0],[4100,4,1,1,0,1,0],[4400,3.5,1,1,0,0,0]],
  sekat_rewetting: [[4100,6,1,1,1,0,1],[4500,6.5,1,0,1,1,1],[3900,6,1,1,1,1,1],[4700,7,0,0,1,1,1],[4200,6,1,1,1,0,1],[4000,6.5,1,0,1,1,1],[4400,7,1,1,1,1,1],[4300,6,0,0,1,1,1]],
};
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
  async isiJalan(env, c) {   // layar peta: cek jalan lolos dan gagal di dua musim, waktu tersebar di periode yang terpampang
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_jalan_cek WHERE dummy = 1 AND waktu BETWEEN ? AND ?", c.sejak, c.sampai)) { c.ada = true; return {}; }
    const langkah = (c.sampai - c.sejak) / 7, isi = [["K0001", "kemarau", "lolos", "pickup_4x4", "Jalan tanah keras, kering"], ["K0003", "hujan", "gagal", "truk", "Genangan di km 3, truk amblas"], ["K0007", "kemarau", "lolos", "motor", "Hanya motor, jembatan kayu"],
      ["K0001", "hujan", "lolos", "pickup_4x4", "Licin tetapi terlewati"], ["K0012", "hujan", "gagal", null, "Jalan putus, tanpa kendaraan"], ["K0003", "kemarau", "lolos", "jalan_kaki", "Jalan setapak 1,2 km dari ujung jalan"]];
    await kumpul(env, isi.map(([k, musim, hasil, kend, cat], i) => env.DB.prepare("INSERT INTO sippa_jalan_cek (id, kompleks_id, prov, musim, hasil, kendaraan, catatan, oleh, waktu, dummy) VALUES (?, ?, '62', ?, ?, ?, ?, ?, ?, 1)").bind(acak(8), k, musim, hasil, kend, cat, OLEH_DUMMY, Math.round(c.sejak + (i + 1) * langkah))));
    return {sippa_jalan_cek: isi.length};
  },
  async isiAoi(env, c) {   // status bervariasi supaya papan usul tidak seragam
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_aoi_usul WHERE dummy = 1 AND waktu BETWEEN ? AND ?", c.sejak, c.sampai)) { c.ada = true; return {}; }
    const langkah = (c.sampai - c.sejak) / 5, isi = [["K0003", null, "usul", "Sering terbakar tiga musim berturut-turut"], [null, "s650_1000", "survei", "Sel kekerapan tinggi, belum ada kompleks"], ["K0007", null, "terpilih", "Dekat jalan utama dan sungai"], ["K0012", null, "ditolak", "Akses jalan putus sepanjang tahun"]];
    await kumpul(env, isi.map(([k, sel, status, alasan], i) => env.DB.prepare("INSERT INTO sippa_aoi_usul (id, kompleks_id, sel, prov, alasan, status, oleh, waktu, dummy) VALUES (?, ?, ?, '62', ?, ?, ?, ?, 1)").bind(acak(8), k, sel, alasan, status, OLEH_DUMMY, Math.round(c.sejak + (i + 1) * langkah))));
    return {sippa_aoi_usul: isi.length};
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
  /* A/B (DT §8.5): n konvensional 10, lance 10 (LULUS), lance_surfaktan 6 (BELUM BISA DIPUTUS), sekat_rewetting 8 (TIDAK LULUS); angka per petak berbeda, bukan rata. Tiap baris [luas_m2, regu_hari, dingin_24j, dingin_72j, nyala_7h, nyala_30h, nyala_90h]; biaya = regu-hari x Rp3 juta [asumsi dummy]. AOI dummy supaya tidak bentrok UNIQUE (aoi, petak_id) dengan data nyata. Vonis dibuktikan di uji lewat vonisG4. */
  async isiAb(env, c) {
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_ab_unggah WHERE dummy = 1")) { c.ada = true; return {}; }
    const id = acak(8), stm = [], semua = Object.entries(DUMMY_AB).flatMap(([l, rs]) => rs.map((r, i) => [l, r, i])), n = semua.length;
    semua.forEach(([l, r, i], k) => { const [luas, regu, d24, d72, n7, n30, n90] = r, tgl = new Date(c.sejak + (c.sampai - c.sejak) * (k + 1) / (n + 1)).toISOString().slice(0, 10), li = Object.keys(DUMMY_AB).indexOf(l);
      stm.push(env.DB.prepare("INSERT INTO sippa_petak (id, unggah_id, petak_id, aoi, prov, lengan, pasangan_id, tanggal_perlakuan, luas_m2, regu_hari, air_m3, surfaktan_l, biaya_rp, dingin_24j, dingin_72j, nyala_7h, nyala_30h, nyala_90h, catatan, sumber, dummy) VALUES (?, ?, ?, 'DUMMY-AOI', '62', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dummy', 'unggah', 1)")
        .bind(acak(8), id, `DM-L${li + 1}-${i + 1}`, l, `PSG-${i + 1}`, tgl, luas, regu, bulat1(luas * (l === "konvensional" ? 0.05 : 0.03) / 10), l === "lance_surfaktan" ? bulat1(luas / 400) : 0, Math.round(regu * 3e6), d24, d72, n7, n30, n90)); });
    await env.DB.batch([env.DB.prepare("INSERT INTO sippa_ab_unggah (id, nama_berkas, sha, n_baris, status, oleh, waktu, dummy) VALUES (?, 'dummy-ab.csv', ?, ?, 'draf', ?, ?, 1)").bind(id, await hexSha(new TextEncoder().encode("dummy-ab-" + id)), stm.length, OLEH_DUMMY, c.kini), ...stm]);
    return {sippa_ab_unggah: 1, sippa_petak: stm.length};
  },
  async isiSkenario(env, c) {
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_skenario WHERE dummy = 1")) { c.ada = true; return {}; }
    const baris = [["Dummy: kit bawaan 8 lance", {sippa: {n_lance: 8, dalam_m: 1, koridor: "K1"}, q_lpm: 300}, {vonis: "KONDISIONAL"}], ["Dummy: debit 600 L/min", {sippa: {n_lance: 8, dalam_m: 1, koridor: "K1"}, q_lpm: 600}, {vonis: "NO-GO"}], ["Dummy: 4 lance", {sippa: {n_lance: 4, dalam_m: 2, koridor: "K2"}, q_lpm: 160}, {vonis: "HOLD"}]];
    await env.DB.batch(baris.map(([nama, state, ringkas], i) => env.DB.prepare("INSERT INTO sippa_skenario (id, nama, state, versi_mesin, ringkas, oleh, waktu, dummy) VALUES (?, ?, ?, 'studio-1', ?, ?, ?, 1)").bind(acak(8), nama, JSON.stringify(state), JSON.stringify(ringkas), OLEH_DUMMY, c.kini - i * HARI)));
    return {sippa_skenario: baris.length};
  },
  async isiLaporan(env, c) {
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_laporan WHERE dummy = 1")) { c.ada = true; return {}; }
    const baris = [["pilot", "62", {dari: c.sejak, sampai: c.sampai}], ["mingguan", null, {minggu: 44}], ["kejadian", "62", {kit: "SIPPA-903"}]];
    await env.DB.batch(baris.map(([jenis, prov, par], i) => env.DB.prepare("INSERT INTO sippa_laporan (id, jenis, prov, parameter, ada_berkas, oleh, waktu, dummy) VALUES (?, ?, ?, ?, 0, ?, ?, 1)").bind(acak(8), jenis, prov, JSON.stringify(par), OLEH_DUMMY, c.kini - i * 2 * HARI)));
    return {sippa_laporan: baris.length};
  },
  /* telemetri (PRD §9.12): kit gelar SIPPA-903 -> perangkat (gateway, PT-102, FT-101, T-103) -> 96 pesan 24 jam terakhir -> harian 7 hari sebelumnya -> alarm (satu ditutup, satu aktif). Nilai mengalir dari fungsi i, bukan konstanta. */
  async isiPerangkat(env, c) {
    const kit = (await kitDummy(env))["SIPPA-903"]; if (!kit) return {};
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_perangkat WHERE dummy = 1")) { c.ada = true; return {}; }
    const baris = [["U-102", "gateway", "-", null, null, null, null], ["PT-102", "tekanan", "bar", null, 0, 12, "PT102_bar"], ["FT-101", "debit", "m3/jam", null, 0, 90, "FT101_m3h"], ["T-103", "suhu_gambut", "C", 50, -10, 120, "T03_50cm_C"]];
    const stm = []; for (const [tag, jenis, satuan, cm, min, maks, datar] of baris) stm.push(env.DB.prepare("INSERT INTO sippa_perangkat (id, kit_id, tag, tag_datar, jenis, satuan, kedalaman_cm, min_sah, maks_sah, interval_s, token_sha, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 900, ?, ?, 1)")
      .bind(acak(8), kit.id, tag, datar, jenis, satuan, cm, min, maks, jenis === "gateway" ? await sha(acak(32)) : null, c.kini));   // token gateway dummy tidak diketahui siapa pun
    await env.DB.batch(stm); return {sippa_perangkat: baris.length};
  },
  async isiTelemetri(env, c) {
    const P = await perangkatDummy(env), gw = P["U-102"]; if (!gw) return {};
    const awal = c.sampai - 24 * JAM;
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_telemetri WHERE dummy = 1 AND t_akhir BETWEEN ? AND ?", awal, c.sampai)) { c.ada = true; return {}; }
    const stm = []; for (let i = 0; i < TEL_N; i++) {
      const t = telT(awal, i), luar = i === 50, pt = luar ? -1.5 : telPT(i);   // satu bacaan di bawah min_sah (mutu 2) supaya mutu 2 terlihat
      stm.push(env.DB.prepare("INSERT INTO sippa_telemetri (id, pengirim_id, kit_id, diterima, t_awal, t_akhir, n, n_mutu2, bacaan, dummy) VALUES (?, ?, ?, ?, ?, ?, 3, ?, ?, 1)")
        .bind(crypto.randomUUID().replaceAll("-", ""), gw.id, gw.kit_id, t, t, t, luar ? 1 : 0, JSON.stringify([["PT-102", t, pt, luar ? 2 : 0, null], ["FT-101", t, telFT(i), 0, null], ["T-103", t, telSuhu(i), 0, 50]])));
    }
    await kumpul(env, stm); return {sippa_telemetri: stm.length};
  },
  async isiHarian(env, c) {
    const P = Object.values(await perangkatDummy(env)).filter(p => p.jenis !== "gateway"); if (!P.length) return {};
    const hari = k => tglWib(c.sampai - 24 * JAM * k);   // 7 hari sebelum jendela 24 jam (jendela itu sendiri masih pesan mentah)
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_telemetri_harian WHERE dummy = 1 AND hari = ?", hari(2))) { c.ada = true; return {}; }
    const dasar = {"PT-102": [4.8, 0.7], "FT-101": [17.5, 1.3], "T-103": [61, 9]}, stm = [];
    for (const p of P) for (let k = 2; k <= 8; k++) {
      const [mid, lebar] = dasar[p.tag] ?? [1, 0.1], geser = Math.sin(k * 1.7 + p.tag.length);
      stm.push(env.DB.prepare("INSERT INTO sippa_telemetri_harian (perangkat_id, hari, n, min, maks, rerata, n_mutu2, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT (perangkat_id, hari) DO NOTHING")
        .bind(p.id, hari(k), TEL_N, bulat2(mid + geser * lebar * 0.3 - lebar), bulat2(mid + geser * lebar * 0.3 + lebar), bulat2(mid + geser * lebar * 0.3), p.tag === "PT-102" && k === 4 ? 1 : 0));
    }
    await kumpul(env, stm); return {sippa_telemetri_harian: stm.length};
  },
  async isiAlarm(env, c) {
    const P = await perangkatDummy(env), pt = P["PT-102"], suhu = P["T-103"]; if (!pt || !suhu) return {};
    const awal = c.sampai - 24 * JAM;
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_alarm WHERE dummy = 1 AND mulai BETWEEN ? AND ?", awal, c.sampai)) { c.ada = true; return {}; }
    const sisip = "INSERT INTO sippa_alarm (id, perangkat_id, kit_id, kode, nilai, ambang, mulai, ditutup, ditutup_oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT DO NOTHING";
    const r = await env.DB.batch([env.DB.prepare(sisip).bind(acak(8), pt.id, pt.kit_id, "tekanan_lebih", telPT(20), AMBANG_ALARM.tekanan_frac * AMBANG_ALARM.pn_bar * AMBANG_ALARM.f_suhu, telT(awal, 20), telT(awal, 22), "otomatis"),   // ditutup: pulih dua pesan kemudian
      env.DB.prepare(sisip).bind(acak(8), suhu.id, suhu.kit_id, "belum_dingin", telSuhu(TEL_N - 1), AMBANG_ALARM.suhu_c, telT(awal, 70), null, null)]);   // aktif: suhu masih di atas 50 C
    const n = r.reduce((j, x) => j + x.meta.changes, 0); return n ? {sippa_alarm: n} : {};
  },
  /* tiga layar R4 (PRD §9.14, keputusan 56). Umur inspeksi dihitung dari c.kini karena jadwal dihitung terhadap hari ini, bukan terhadap periode yang terpampang.
     Kode AS-9001 s.d. 9013 tetap per baris (CHECK menjaga 9000 ke atas hanya dummy); satu pengisi = satu kelompok kelas, jadi dua layar tidak saling mengisi. */
  async isiAsetPelihara(env, c) {   // pompa sumur dan tandon: jadwal K7 dan K8 dengan umur berbeda (pipa koridor dicabut, keputusan 60)
    return isiAsetDummy(env, c, ["pompa_sumur", "tandon_hidran"], [
      {kode: "AS-9011", kelas: "pompa_sumur", nama: "Pompa sumur dummy", sumber: "pemda", pemilik: "Pemda dummy", atribut: {kw: 7.5, sumber_daya: "genset"}, insp: [{jenis: "berkala", skor: 1, umur: 200, temuan: "Dummy: seal aus", tindakan: "perbaiki"}]},   // K7 180 hari: terlambat
      {kode: "AS-9013", kelas: "tandon_hidran", nama: "Tandon hidran dummy", sumber: "pdam", pemilik: "PDAM dummy", atribut: {kapasitas_l: 20000}, insp: [{jenis: "berkala", skor: 0, umur: 3}]},   // K8 7 hari: segera
    ]);
  },
  async isiSumur(env, c) {   // air tanah: tiga zona konservasi; mutu air satu lolos, satu gagal E. coli, sisanya belum diuji
    const zona = ["aman", "aman", "rawan", "rawan", "kritis", "kritis"], insp = [
      [{jenis: "mutu_air", skor: 0, umur: 10, hasil: {e_coli_cfu: 0}}], [{jenis: "mutu_air", skor: 2, umur: 30, hasil: {e_coli_cfu: 120}, temuan: "Dummy: E. coli di atas baku mutu", tindakan: "uji_ulang"}],
      [{jenis: "berkala", skor: 0, umur: 200}], [{jenis: "berkala", skor: 0, umur: 170}], [], []];   // berkala 180 hari: terlambat, segera, lalu dua belum pernah
    return isiAsetDummy(env, c, ["sumur_bor"], zona.map((z, i) => ({kode: "AS-" + (9001 + i), kelas: "sumur_bor", nama: `Sumur bor dummy ${i + 1}`, sumber: i < 4 ? "pemda" : "badan_geologi", pemilik: "Pemda dummy",
      atribut: {kedalaman_m: 40 + 12 * i, debit_lps: bulat1(2.5 + 0.8 * i), zona_konservasi: z, pengelola: "Desa dummy", ...(z === "kritis" ? {rekomendasi_bg: `Rekomendasi Badan Geologi dummy ${i - 3}/2026`} : {})}, insp: insp[i]})));
  },
  async isiJembatan(env, c) {   // akses: dua darurat (satu dengan rencana ganti), dua permanen dari program berbeda; tiap umur inspeksi berbeda
    return isiAsetDummy(env, c, ["jembatan_darurat", "jembatan_permanen"], [
      {kode: "AS-9007", kelas: "jembatan_darurat", nama: "Jembatan Bailey dummy", sumber: "bnpb_dsp", pemilik: "BNPB", kejadian: "Banjir dummy 2026", rencana_ganti: c.kini + 120 * HARI, atribut: {jenis: "bailey", bentang_m: 30, beban_ton: 20, program: "Penanganan darurat dummy"}, insp: [{jenis: "berkala", skor: 0, umur: 10}]},
      {kode: "AS-9008", kelas: "jembatan_darurat", nama: "Jembatan rangka baja dummy", sumber: "tniad", pemilik: "TNI AD", kejadian: "Banjir dummy 2026", atribut: {jenis: "rangka_baja", bentang_m: 24}, insp: [{jenis: "berkala", skor: 1, umur: 45}]},
      {kode: "AS-9009", kelas: "jembatan_permanen", nama: "Jembatan permanen dummy A", sumber: "pu_bina_marga", pemilik: "Kementerian PU", atribut: {jenis: "gantung", bentang_m: 80, program: "Program Bina Marga dummy", nilai_kondisi_pemilik: 3.5}, insp: [{jenis: "tahunan", skor: 0, umur: 100}]},
      {kode: "AS-9010", kelas: "jembatan_permanen", nama: "Jembatan permanen dummy B", sumber: "pemda", pemilik: "Pemda dummy", atribut: {jenis: "beton", bentang_m: 40, program: "Program pemda dummy"}, insp: []},
    ]);
  },
  async isiInspeksiKit(env, c) {   // komponen K1 dummy dengan umur inspeksi berputar (terlambat, segera, aman, belum pernah); satu komponen K1 SIPPA-903 skor 2
    const komp = (await env.DB.prepare("SELECT c.id, c.kit_id, c.kode_bom, c.kondisi, k.kode, k.prov FROM sippa_komponen c JOIN sippa_kit k ON k.id = c.kit_id WHERE k.dummy = 1 AND c.dummy = 1 ORDER BY k.kode, c.kode_bom").all()).results.filter(x => kelasDari(x.kode_bom) === "K1");
    if (!komp.length) return {};
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_inspeksi WHERE dummy = 1 AND sasaran_jenis = 'komponen'")) { c.ada = true; return {}; }
    const umur = [45, 20, 5, null], rusak = komp.find(x => x.kode === "SIPPA-903") ?? komp[0], stm = [];
    komp.forEach((x, i) => {
      const u = x === rusak ? 5 : x.kondisi === "baik" ? umur[i % umur.length] : null;   // komponen rusak atau hilang dari pengisi komponen tidak disentuh: skor 0 akan memulihkan kondisinya
      if (u == null) return;
      stm.push(sisipInspeksi(env, {id: acak(8), sasaran_jenis: "komponen", sasaran_id: x.id, kit_id: x.kit_id, jenis: "berkala", skor: x === rusak ? 2 : 0, jam_operasi: null, temuan: x === rusak ? "Dummy: impeller aus, perlu servis" : null,
        tindakan: x === rusak ? "perbaiki" : "tidak_ada", hasil: {}, prov: x.prov ?? "62", oleh: OLEH_DUMMY, waktu: c.kini - u * HARI, dummy: 1}));
    });
    if (!stm.length) return {};
    await kumpul(env, stm); return {sippa_inspeksi: stm.length};
  },
  async isiStok(env, c) {   // gudang dummy: dua kode, satu saldo jauh di atas stok minimum dan satu di bawahnya
    if (await adaDummy(env, "SELECT count(*) n FROM sippa_stok_gerak WHERE dummy = 1")) { c.ada = true; return {}; }
    const kit = (await kitDummy(env))["SIPPA-903"]?.id ?? null, g = "Gudang dummy";
    const baris = [["C-101", "Gasket kopling Storz dummy", "set", 200, "terima", null, 6], ["C-101", "Gasket kopling Storz dummy", "set", -12, "pakai", kit, 3], ["SF-101", "Elemen filter servis dummy", "unit", 4, "terima", null, 5], ["SF-101", "Elemen filter servis dummy", "unit", -1, "pakai", kit, 2]];
    await env.DB.batch(baris.map(([kode, nama, satuan, delta, alasan, kitId, umurHari]) => env.DB.prepare("INSERT INTO sippa_stok_gerak (id, gudang, kode_bom, nama, delta, satuan, alasan, kit_id, oleh, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(acak(8), g, kode, nama, delta, satuan, alasan, kitId, OLEH_DUMMY, c.kini - umurHari * HARI)));
    return {sippa_stok_gerak: baris.length};
  },
};
/* aset dummy + inspeksinya dalam satu batch; penjaga per kelompok kelas supaya isi kedua = c.ada (409) dan layar lain tak ikut terisi */
async function isiAsetDummy(env, c, kelas, baris) {
  if (await adaDummy(env, `SELECT count(*) n FROM sippa_aset WHERE dummy = 1 AND kelas IN (${kelas.map(() => "?").join(",")})`, ...kelas)) { c.ada = true; return {}; }
  const stm = []; let nIns = 0;
  for (const b of baris) {
    const id = acak(8);
    stm.push(env.DB.prepare("INSERT INTO sippa_aset (id, kode, kelas, nama, status, sumber, pemilik_aset, pemelihara, kit_id, prov, kab, lat, lon, kejadian, rencana_ganti, atribut, rujukan, keyakinan, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, 'berfungsi', ?, ?, ?, ?, '62', 'Kota Palangka Raya', ?, ?, ?, ?, ?, ?, 'asumsi-kebijakan', ?, ?, ?, 1)")
      .bind(id, b.kode, b.kelas, b.nama, b.sumber, b.pemilik, "Pemelihara dummy", b.kit_id ?? null, -2.2 - (Number(b.kode.slice(3)) % 10) * 0.012, 113.9 + (Number(b.kode.slice(3)) % 10) * 0.014, b.kejadian ?? null, b.rencana_ganti ?? null, JSON.stringify(b.atribut),
        "Data dummy: bukan data lapangan", c.kini, c.kini, OLEH_DUMMY));
    for (const i of b.insp) { nIns++; stm.push(sisipInspeksi(env, {id: acak(8), sasaran_jenis: "aset", sasaran_id: id, kit_id: null, jenis: i.jenis, skor: i.skor, jam_operasi: null, temuan: i.temuan ?? null, tindakan: i.tindakan ?? "tidak_ada", hasil: i.hasil ?? {}, prov: "62", oleh: OLEH_DUMMY, waktu: c.kini - i.umur * HARI, dummy: 1})); }
  }
  await kumpul(env, stm); return {sippa_aset: baris.length, ...(nIns ? {sippa_inspeksi: nIns} : {})};
}
const TEL_N = 96, telT = (awal, i) => Math.round(awal + (i + 1) * (24 * JAM / TEL_N)), telPT = i => i === 20 ? 9.4 : bulat2(4.8 + 0.6 * Math.sin(i / 6)), telFT = i => bulat2(17.5 + 1.2 * Math.cos(i / 5)), telSuhu = i => bulat1(78 - i * 0.27);
const perangkatDummy = async env => Object.fromEntries((await env.DB.prepare("SELECT id, kit_id, tag, jenis FROM sippa_perangkat WHERE dummy = 1").all()).results.map(p => [p.tag, p]));
const SEMUA_KIT = ["isiKit", "isiKomponen", "isiTugas", "isiGerak"], SEMUA_LOG = ["isiKit", "isiKomponen", "isiTugas", "isiLog", "isiProbe", "isiBbm"];
/* tabel keputusan {layar: [pengisi...]} hulu ke hilir (bukan rantai if). Layar yang datanya dari R2 atau murni hitung (hitung, 3d, data) memberi daftar kosong: 200 tanpa baris, bukan nol palsu. */
export const RANTAI_DUMMY = {kit: SEMUA_KIT, log: SEMUA_LOG, lapangan: SEMUA_LOG, ringkas: [...SEMUA_KIT, "isiLog", "isiProbe", "isiBbm"],
  telemetri: ["isiKit", "isiPerangkat", "isiTelemetri", "isiHarian", "isiAlarm"],
  ...Object.fromEntries(LAYAR_SIPPA.filter(l => !["kit", "log", "telemetri"].includes(l)).map(l => [l, []])), pemicu: SEMUA_KIT, peta: ["isiJalan", "isiAoi"], ab: ["isiAb"], studio: ["isiSkenario"], laporan: ["isiLaporan"],
  pelihara: ["isiKit", "isiKomponen", "isiTugas", "isiLog", "isiAsetPelihara", "isiInspeksiKit", "isiStok"], air: ["isiSumur"], akses: ["isiJembatan"]};
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
const HAPUS_URUT = ["sippa_inspeksi", "sippa_stok_gerak", "sippa_aset", "sippa_alarm", "sippa_telemetri_harian", "sippa_telemetri", "sippa_perangkat", "sippa_laporan", "sippa_petak", "sippa_ab_unggah", "sippa_skenario", "sippa_bbm", "sippa_probe", "sippa_log_gelar", "sippa_foto", "sippa_gerak", "sippa_tugas", "sippa_komponen", "sippa_jalan_cek", "sippa_aoi_usul", "sippa_kit"];
async function dummyHapus(env, req, url, kini) {
  const a = await akses(env, req, "SA"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.dummy", 30, kini); if (l) return l;
  const foto = (await env.DB.prepare("SELECT id FROM sippa_foto WHERE dummy = 1").all()).results.map(r => "sippa-foto/" + r.id);
  const lap = (await env.DB.prepare("SELECT id FROM sippa_laporan WHERE dummy = 1 AND ada_berkas = 1").all()).results.map(r => `sippa-laporan/${r.id}.pdf`);
  if (foto.length + lap.length && env.MEDIA) await env.MEDIA.delete([...foto, ...lap]);
  const r = await env.DB.batch([...HAPUS_URUT.map(t => env.DB.prepare(`DELETE FROM ${t} WHERE dummy = 1`)), env.DB.prepare("DELETE FROM pantau_jejak WHERE dummy = 1 AND obyek GLOB 'sippa_*'")]);
  return json({dihapus: Object.fromEntries(HAPUS_URUT.map((t, i) => [t, r[i].meta.changes]))});
}

/* ================================================================ aset, inspeksi, pelihara, stok (SP-093, keputusan 56; DT §3.6, §4.3, §6.6; skema 0059; fungsi murni public/pipa/pelihara.js) */
const ASET_STATUS = ["rencana", "berfungsi", "rusak", "diserahkan", "diganti_permanen", "nonaktif"];
const SUMBER_ASET = ["bnpb_dsp", "bpbd", "pu_bina_marga", "pu_cipta_karya", "pu_sda", "badan_geologi", "tniad", "polri", "pemda", "desa", "pdam", "lain"], KEYAKINAN = ["resmi", "terverifikasi", "asumsi-kebijakan"];
const SASARAN = ["komponen", "kit", "aset"], JENIS_INSPEKSI = ["pra_gelar", "pasca_gelar", "berkala", "pra_musim", "tahunan", "pasca_bencana", "servis", "uji_tekanan", "mutu_air", "serah_terima"], JENIS_LAPANGAN = ["pra_gelar", "pasca_gelar"];
const TINDAKAN = ["tidak_ada", "perbaiki", "ganti", "afkir", "uji_ulang", "serahkan"], SATUAN_STOK = [...SATUAN, "liter"], ALASAN_STOK = ["terima", "pakai", "pindah", "koreksi", "afkir"], KELAS_K = Object.keys(KELAS);
const MAKS_ATRIBUT = 4096, MAKS_HASIL = 2048;
const byteDari = o => new TextEncoder().encode(typeof o === "string" ? o : JSON.stringify(o)).length;   // CHECK D1 menghitung huruf; byte >= huruf, jadi lebih ketat dan aman
const urai = (s, kosong = {}) => { try { return JSON.parse(s); } catch (e) { return kosong; } };
const asetKeluar = r => r && {...r, atribut: urai(r.atribut)};
const daftarPesan = (n, d) => `${n} harus salah satu dari ${d.join(", ")}`;
const teksNull = (min, maks) => v => v === null ? null : (t => t === undefined ? undefined : t || null)(teksOK(v, min, maks));
const koord = (min, maks) => v => v === null ? null : typeof v === "number" && Number.isFinite(v) && v >= min && v <= maks ? v : undefined;
/* validator per medan aset; undefined = ditolak. null hanya untuk medan yang boleh kosong. */
const MEDAN_ASET = {
  nama: v => teksOK(v, 2, 120), pemilik_aset: v => teksOK(v, 3, 120), status: v => ASET_STATUS.includes(v) ? v : undefined, sumber: v => SUMBER_ASET.includes(v) ? v : undefined, keyakinan: v => KEYAKINAN.includes(v) ? v : undefined,
  pemelihara: teksNull(3, 120), kab: teksNull(1, 60), kejadian: teksNull(1, 120), rujukan: teksNull(1, 300), lat: koord(-11.5, 6.5), lon: koord(94.5, 141.5),
  rencana_ganti: v => v === null ? null : Number.isInteger(v) && v > 0 && v <= 4102444800000 ? v : undefined,
};
const PESAN_ASET = {nama: "nama 2 sampai 120 karakter", pemilik_aset: "pemilik_aset 3 sampai 120 karakter", status: daftarPesan("status", ASET_STATUS), sumber: daftarPesan("sumber", SUMBER_ASET), keyakinan: daftarPesan("keyakinan", KEYAKINAN),
  pemelihara: "pemelihara 3 sampai 120 karakter", kab: "kab paling banyak 60 karakter", kejadian: "kejadian paling banyak 120 karakter", rujukan: "rujukan paling banyak 300 karakter",
  lat: "lat harus angka antara -11,5 dan 6,5 (kotak Indonesia)", lon: "lon harus angka antara 94,5 dan 141,5 (kotak Indonesia)", rencana_ganti: "rencana_ganti harus milidetik epoch bilangan bulat"};
const cekMedanAset = (o, kunci) => { const v = {}; for (const k of kunci) { const x = MEDAN_ASET[k](o[k] === undefined ? null : o[k]); if (x === undefined) return {galat: PESAN_ASET[k]}; v[k] = x; } return {v}; };
const cekAtribut = (kelas, atribut) => {
  if (!atribut || typeof atribut !== "object" || Array.isArray(atribut)) return "atribut: harus objek";
  const n = byteDari(atribut); if (n > MAKS_ATRIBUT) return `atribut: ${n} byte, batas ${MAKS_ATRIBUT}`;
  const g = kelas ? cekAset(kelas, atribut) : []; return g.length ? g.map(x => `${x.medan}: ${x.pesan}`).join("; ") : null;
};
const asetTulis = async (env, req, id) => { const r = await env.DB.prepare("SELECT * FROM sippa_aset WHERE id = ? AND dummy <= ? AND dummy >= ?").bind(id, lihatDummy(req), loDummy(req)).first(); return r && dalam(req, r.prov) ? r : null; };
const TAMBAH_ASET = ["nama", "sumber", "pemilik_aset", "keyakinan", "pemelihara", "kab", "kejadian", "rujukan", "lat", "lon", "rencana_ganti"];

async function asetDaftar(env, req, url) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const q = url.searchParams, kelas = q.get("kelas"), status = q.get("status"), sumber = q.get("sumber"), prov = q.get("prov");
  if (kelas !== null && !Object.hasOwn(KELAS_ASET, kelas)) return gagal(400, daftarPesan("kelas", Object.keys(KELAS_ASET)));
  if (status !== null && !ASET_STATUS.includes(status)) return gagal(400, daftarPesan("status", ASET_STATUS));
  if (sumber !== null && !SUMBER_ASET.includes(sumber)) return gagal(400, daftarPesan("sumber", SUMBER_ASET));
  if (prov !== null && !RE_PROV.test(prov)) return gagal(400, "prov harus kode provinsi 2 digit");
  const lihat = lihatDummy(req), w = ["dummy <= ?"], p = [lihat];
  for (const [k, v] of [["kelas", kelas], ["status", status], ["sumber", sumber], ["prov", prov]]) if (v) { w.push(`${k} = ?`); p.push(v); }
  const [as, ins] = await Promise.all([
    env.DB.prepare(`SELECT id, kode, kelas, nama, status, sumber, pemilik_aset, pemelihara, prov, kab, lat, lon, rencana_ganti, keyakinan, atribut, dummy FROM sippa_aset WHERE ${w.join(" AND ")} ORDER BY kode`).bind(...p).all(),
    env.DB.prepare("SELECT sasaran_id, jenis, skor, waktu, hasil FROM sippa_inspeksi WHERE sasaran_jenis = 'aset' AND dummy <= ? ORDER BY waktu, rowid LIMIT 50000").bind(lihat).all()]);   // ponytail: dilipat di JS; bila inspeksi aset menembus puluhan ribu, pindah ke subquery NOT EXISTS
  const akhir = new Map(), mutu = new Map();
  for (const i of ins.results) {
    akhir.set(i.sasaran_id, {jenis: i.jenis, skor: i.skor, waktu: i.waktu});
    if (i.jenis === "mutu_air") { const e = urai(i.hasil).e_coli_cfu; mutu.set(i.sasaran_id, {e_coli_cfu: e ?? null, lolos: typeof e === "number" ? e === 0 : null, waktu: i.waktu}); }
  }
  const aset = as.results.filter(r => dalam(req, r.prov)).map(r => ({...r, atribut: urai(r.atribut), inspeksi_terakhir: akhir.get(r.id) ?? null, mutu_terakhir: mutu.get(r.id) ?? null}));
  return json({aset, n: aset.length});
}
async function asetRincian(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const r = await env.DB.prepare("SELECT * FROM sippa_aset WHERE id = ? AND dummy <= ?").bind(id, lihatDummy(req)).first();
  if (!r || !dalam(req, r.prov)) return tdk("aset tidak ada");
  const ins = await env.DB.prepare("SELECT * FROM sippa_inspeksi WHERE sasaran_jenis = 'aset' AND sasaran_id = ? AND dummy <= ? ORDER BY waktu DESC, rowid DESC LIMIT 200").bind(id, lihatDummy(req)).all();
  return json({aset: asetKeluar(r), inspeksi: ins.results.map(i => ({...i, hasil: urai(i.hasil)}))});
}
async function asetBuat(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.aset", 120, kini); if (l) return l;
  const b = await bacaBody(req, 16384); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;   // kode dari klien tidak dibaca: AS-#### selalu dari server
  if (typeof o.kelas !== "string" || !Object.hasOwn(KELAS_ASET, o.kelas)) return gagal(400, daftarPesan("kelas", Object.keys(KELAS_ASET)));
  const c = cekMedanAset({...o, status: o.status ?? "rencana"}, ["status", ...TAMBAH_ASET]); if (c.galat) return gagal(400, c.galat);
  if (typeof o.prov !== "string" || !RE_PROV.test(o.prov)) return gagal(400, "prov harus kode provinsi 2 digit");
  const atribut = o.atribut ?? {}, ga = cekAtribut(o.kelas, atribut); if (ga) return gagal(400, ga);
  if (o.kit_id != null && !(typeof o.kit_id === "string" && RE_ID.test(o.kit_id) && await kitTulis(env, req, o.kit_id))) return gagal(400, "kit_id tidak ditemukan");
  if (!dalam(req, o.prov)) return tdk("wilayah tidak tersedia");
  const v = c.v, dm = dummyStaf(req, a.oleh), id = acak(8), batas = dm ? 9999 : 8999;
  for (let i = 0; i < 4; i++) {   // dua penulis serentak bisa memilih nomor sama: UNIQUE menolak satu, ulang dengan nomor berikutnya
    const mx = (await env.DB.prepare(`SELECT max(kode) k FROM sippa_aset WHERE kode ${dm ? ">=" : "<"} 'AS-9000'`).first()).k, n = mx ? Number(mx.slice(3)) + 1 : dm ? 9001 : 1;
    if (n > batas) return gagal(409, "nomor kode aset habis");
    const kode = "AS-" + String(n).padStart(4, "0");
    try {
      await env.DB.batch([env.DB.prepare("INSERT INTO sippa_aset (id, kode, kelas, nama, status, sumber, pemilik_aset, pemelihara, kit_id, prov, kab, lat, lon, kejadian, rencana_ganti, atribut, rujukan, keyakinan, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, kode, o.kelas, v.nama, v.status, v.sumber, v.pemilik_aset, v.pemelihara, o.kit_id ?? null, o.prov, v.kab, v.lat, v.lon, v.kejadian, v.rencana_ganti, JSON.stringify(atribut), v.rujukan, v.keyakinan, kini, kini, a.oleh, dm),
        jejakStmt(env, a.oleh, "sippa_aset:" + id, "buat", kode, o.kelas, kini, dm)]);
      return json({aset: asetKeluar(await env.DB.prepare("SELECT * FROM sippa_aset WHERE id = ?").bind(id).first())}, 201);
    } catch (e) { if (!/UNIQUE constraint failed: sippa_aset\.kode/.test(String(e?.message || e))) throw e; }
  }
  return gagal(409, "kode aset bentrok, ulangi");
}
const UBAH_ASET = ["status", "pemelihara", "rencana_ganti", "rujukan", "atribut"];
async function asetUbah(env, req, url, kini, ctx, id) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tulis", 600, kini); if (l) return l;
  const b = await bacaBody(req, 16384); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, kunci = Object.keys(o);
  if (!kunci.length || kunci.some(k => !UBAH_ASET.includes(k))) return gagal(400, `hanya ${UBAH_ASET.join(", ")} yang bisa diubah`);
  const c = cekMedanAset(o, kunci.filter(k => k !== "atribut")); if (c.galat) return gagal(400, c.galat);
  if ("atribut" in o && (!o.atribut || typeof o.atribut !== "object" || Array.isArray(o.atribut))) return gagal(400, "atribut: harus objek");
  const ase = await asetTulis(env, req, id); if (!ase) return tdk("aset tidak ada");
  let atribut = urai(ase.atribut);
  if ("atribut" in o) { atribut = {...atribut, ...o.atribut}; for (const k of Object.keys(atribut)) if (atribut[k] === null) delete atribut[k]; }   // digabung; null menghapus kunci
  const ga = cekAtribut(ase.kelas, atribut); if (ga) return gagal(400, ga);
  const baru = {status: ase.status, pemelihara: ase.pemelihara, rencana_ganti: ase.rencana_ganti, rujukan: ase.rujukan, ...c.v};
  await env.DB.batch([env.DB.prepare("UPDATE sippa_aset SET status = ?, pemelihara = ?, rencana_ganti = ?, rujukan = ?, atribut = ?, diubah = ? WHERE id = ?").bind(baru.status, baru.pemelihara, baru.rencana_ganti, baru.rujukan, JSON.stringify(atribut), kini, id),
    jejakStmt(env, a.oleh, "sippa_aset:" + id, "ubah", baru.status, kunci.join(","), kini, dummyStaf(req, a.oleh))]);
  return json({aset: asetKeluar(await env.DB.prepare("SELECT * FROM sippa_aset WHERE id = ?").bind(id).first())});
}

/* medan isi inspeksi yang sama untuk staf dan operator: skor 0-3, jam, temuan, tindakan */
function isiInspeksi(o) {
  if (!Number.isInteger(o.skor) || o.skor < 0 || o.skor > 3) return {galat: "skor harus bilangan bulat 0 sampai 3"};
  if (o.jam_operasi != null && !(typeof o.jam_operasi === "number" && o.jam_operasi >= 0 && o.jam_operasi <= 100000)) return {galat: "jam_operasi harus angka 0 sampai 100000"};
  const temuan = o.temuan == null ? null : teksOK(o.temuan, 0, 1000); if (temuan === undefined) return {galat: "temuan paling banyak 1000 karakter"};
  if (o.tindakan != null && !TINDAKAN.includes(o.tindakan)) return {galat: daftarPesan("tindakan", TINDAKAN)};
  return {v: {skor: o.skor, jam_operasi: o.jam_operasi ?? null, temuan: temuan || null, tindakan: o.tindakan ?? "tidak_ada"}};
}
const sisipInspeksi = (env, e, konflik) => env.DB.prepare(`INSERT INTO sippa_inspeksi (id, sasaran_jenis, sasaran_id, kit_id, jenis, skor, jam_operasi, temuan, tindakan, hasil, foto_id, prov, oleh, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)${konflik ? " ON CONFLICT(id) DO NOTHING" : ""}`)
  .bind(e.id, e.sasaran_jenis, e.sasaran_id, e.kit_id, e.jenis, e.skor, e.jam_operasi, e.temuan, e.tindakan, JSON.stringify(e.hasil ?? {}), e.foto_id ?? null, e.prov, e.oleh, e.waktu, e.dummy);
async function inspeksiBuat(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;   // operator berkode tidak lewat sini (401): ia hanya lewat lapangan/kirim
  const l = await batasJam(env, a.oleh, "sippa.tulis", 600, kini); if (l) return l;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (!SASARAN.includes(o.sasaran_jenis)) return gagal(400, daftarPesan("sasaran_jenis", SASARAN));
  if (typeof o.sasaran_id !== "string" || !RE_ID.test(o.sasaran_id)) return gagal(400, "sasaran_id harus id 16 heks");
  if (!JENIS_INSPEKSI.includes(o.jenis)) return gagal(400, daftarPesan("jenis", JENIS_INSPEKSI));
  const c = isiInspeksi(o); if (c.galat) return gagal(400, c.galat);
  const hasil = o.hasil ?? {};
  if (!hasil || typeof hasil !== "object" || Array.isArray(hasil)) return gagal(400, "hasil harus objek");
  const n = byteDari(hasil); if (n > MAKS_HASIL) return gagal(400, `hasil ${n} byte, batas ${MAKS_HASIL}`);
  if (o.jenis === "mutu_air" && !(typeof hasil.e_coli_cfu === "number" && hasil.e_coli_cfu >= 0)) return gagal(400, "hasil.e_coli_cfu wajib angka 0 atau lebih untuk jenis mutu_air");
  if (o.jenis === "uji_tekanan" && !(typeof hasil.tekanan_bar === "number" && hasil.tekanan_bar > 0)) return gagal(400, "hasil.tekanan_bar wajib angka lebih dari 0 untuk jenis uji_tekanan");
  if (o.kit_id != null && !(typeof o.kit_id === "string" && RE_ID.test(o.kit_id))) return gagal(400, "kit_id harus id 16 heks");
  if (o.foto_id != null && !(typeof o.foto_id === "string" && RE_ID.test(o.foto_id) && await env.DB.prepare("SELECT 1 FROM sippa_foto WHERE id = ? AND dummy <= ?").bind(o.foto_id, lihatDummy(req)).first())) return gagal(400, "foto_id tidak ditemukan");
  let prov, kitId = null;
  if (o.sasaran_jenis === "aset") { const s = await asetTulis(env, req, o.sasaran_id); if (!s) return tdk("aset tidak ada"); prov = s.prov; }
  else {
    kitId = o.sasaran_jenis === "kit" ? o.sasaran_id : o.kit_id;
    if (typeof kitId !== "string") return gagal(400, "kit_id wajib untuk inspeksi komponen");
    if (o.sasaran_jenis === "kit" && o.kit_id != null && o.kit_id !== kitId) return gagal(400, "kit_id harus sama dengan sasaran_id untuk inspeksi kit");
    const k = await kitTulis(env, req, kitId); if (!k) return tdk("kit tidak ada");
    if (o.sasaran_jenis === "komponen" && !await env.DB.prepare("SELECT 1 FROM sippa_komponen WHERE id = ? AND kit_id = ?").bind(o.sasaran_id, kitId).first()) return gagal(400, "komponen bukan milik kit ini");
    prov = k.prov ?? null;
  }
  if (prov == null) return gagal(400, "kit belum punya provinsi; isi lokasi kit lebih dulu");   // sippa_inspeksi.prov NOT NULL (diisi dari kit atau aset)
  const id = acak(8), dm = dummyStaf(req, a.oleh);
  await env.DB.batch([sisipInspeksi(env, {id, sasaran_jenis: o.sasaran_jenis, sasaran_id: o.sasaran_id, kit_id: kitId, jenis: o.jenis, ...c.v, hasil, foto_id: o.foto_id ?? null, prov, oleh: a.oleh, waktu: kini, dummy: dm}),
    jejakStmt(env, a.oleh, "sippa_inspeksi:" + id, "inspeksi", o.jenis, `${o.sasaran_jenis} skor ${c.v.skor}`, kini, dm)]);
  const r = await env.DB.prepare("SELECT * FROM sippa_inspeksi WHERE id = ?").bind(id).first();
  return json({inspeksi: {...r, hasil: urai(r.hasil)}}, 201);
}
/* butir inspeksi dari operator berkode: hanya pra/pasca gelar, hanya komponen atau kit tugasnya. {alasan} bila ditolak, {v} bila sah. */
async function butirInspeksi(env, t, b, kini) {
  if (!t.kit_id) return {alasan: "tugas ini tidak punya kit"};
  if (!JENIS_LAPANGAN.includes(b.jenis)) return {alasan: `jenis ${b.jenis} hanya untuk staf; operator memakai pra_gelar atau pasca_gelar`};
  if (b.sasaran_jenis !== "komponen" && b.sasaran_jenis !== "kit") return {alasan: "sasaran_jenis harus komponen atau kit"};
  if (typeof b.sasaran_id !== "string" || !RE_ID.test(b.sasaran_id)) return {alasan: "sasaran_id harus id 16 heks"};
  const c = isiInspeksi(b); if (c.galat) return {alasan: c.galat};
  const milik = b.sasaran_jenis === "kit" ? b.sasaran_id === t.kit_id : !!await env.DB.prepare("SELECT 1 FROM sippa_komponen WHERE id = ? AND kit_id = ?").bind(b.sasaran_id, t.kit_id).first();
  if (!milik) return {alasan: "sasaran bukan bagian dari kit tugas ini"};
  const w = typeof b.waktu_klien === "number" && b.waktu_klien > kini - 30 * HARI && b.waktu_klien <= kini + MELESET_MS ? Math.round(b.waktu_klien) : kini;   // jam perangkat dipercaya hanya bila masuk akal
  return {v: {sasaran_jenis: b.sasaran_jenis, sasaran_id: b.sasaran_id, kit_id: t.kit_id, jenis: b.jenis, ...c.v, hasil: {}, foto_id: null, prov: t.prov, waktu: w}};
}

/* pemeliharaan: data mentah untuk layar; jadwal dihitung klien dengan SippaPelihara.jadwal, CSV dengan modul yang sama */
async function peliharaAmbil(env, req, url, kini) {
  const q = url.searchParams, prov = q.get("prov"), kelas = q.get("kelas");
  if (prov !== null && !RE_PROV.test(prov)) return {res: gagal(400, "prov harus kode provinsi 2 digit")};
  if (kelas !== null && !KELAS_K.includes(kelas)) return {res: gagal(400, daftarPesan("kelas", KELAS_K))};
  const lihat = lihatDummy(req), t = (sql, ...p) => env.DB.prepare(sql).bind(...p).all().then(r => r.results);
  const [kits, komp, aset, insp, jam, stok] = await Promise.all([
    t("SELECT id, kode, status, prov, lokasi FROM sippa_kit WHERE dummy <= ? AND status != 'pensiun' ORDER BY kode", lihat),
    t("SELECT id, kit_id, kode_bom, nama, kondisi, dicek FROM sippa_komponen ORDER BY kit_id, kode_bom"),
    t("SELECT id, kode, kelas, nama, status, pemelihara, prov, kab, kit_id, rencana_ganti, keyakinan FROM sippa_aset WHERE dummy <= ? ORDER BY kode", lihat),
    t("SELECT sasaran_jenis, sasaran_id, kit_id, jenis, skor, waktu FROM sippa_inspeksi WHERE dummy <= ? ORDER BY waktu, rowid LIMIT 50000", lihat),   // ponytail: dilipat di JS per (sasaran, jenis); bila inspeksi menembus puluhan ribu, pindah ke SQL
    t(`SELECT k.id kit_id, coalesce((SELECT sum(l.jam_pompa) FROM sippa_log_gelar l WHERE l.kit_id = k.id AND l.dummy <= ? AND coalesce(l.t_tiba, l.waktu_klien) > coalesce((SELECT max(i.waktu) FROM sippa_inspeksi i WHERE i.kit_id = k.id AND i.jenis = 'servis'), 0)
      AND NOT EXISTS (SELECT 1 FROM sippa_log_gelar x WHERE x.koreksi_dari = l.id)), 0) jam FROM sippa_kit k WHERE k.dummy <= ?`, lihat, lihat),
    t("SELECT gudang, kode_bom, sum(delta) saldo, satuan FROM sippa_stok_gerak WHERE dummy <= ? GROUP BY gudang, kode_bom, satuan ORDER BY gudang, kode_bom", lihat)]);
  const boleh = p => dalam(req, p) && (prov === null || p === prov);
  const kit = kits.filter(k => boleh(k.prov)), idKit = new Map(kit.map(k => [k.id, k]));
  const komponen = komp.filter(c => idKit.has(c.kit_id) && (kelas === null || kelasDari(c.kode_bom) === kelas)).map(c => ({id: c.id, kit_id: c.kit_id, kit_kode: idKit.get(c.kit_id).kode, kit_status: idKit.get(c.kit_id).status, kode_bom: c.kode_bom, nama: c.nama, kondisi: c.kondisi, dicek: c.dicek}));
  const asets = aset.filter(a => boleh(a.prov) && (kelas === null || KELAS_ASET[a.kelas] === kelas)), idAset = new Set(asets.map(a => a.id)), idKomp = new Set(komp.filter(c => idKit.has(c.kit_id)).map(c => c.id));
  const akhir = new Map();
  for (const i of insp) {
    const sah = i.sasaran_jenis === "aset" ? idAset.has(i.sasaran_id) : i.sasaran_jenis === "kit" ? idKit.has(i.sasaran_id) : idKomp.has(i.sasaran_id);
    if (sah) akhir.set(`${i.sasaran_jenis}:${i.sasaran_id}:${i.jenis}`, {sasaran_jenis: i.sasaran_jenis, sasaran_id: i.sasaran_id, jenis: i.jenis, skor: i.skor, waktu: i.waktu});
  }
  const per_gudang = {}; for (const k of kit) if (k.status === "gudang" && k.lokasi) per_gudang[k.lokasi] = (per_gudang[k.lokasi] ?? 0) + 1;
  return {data: {komponen, aset: asets, inspeksi_terakhir: [...akhir.values()], jam_sejak_servis: Object.fromEntries(jam.filter(j => idKit.has(j.kit_id)).map(j => [j.kit_id, Math.round(j.jam * 100) / 100])), stok, n_kit_per_gudang: per_gudang, per: kini}};
}
async function peliharaDaftar(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const r = await peliharaAmbil(env, req, url, kini); return r.res ?? json(r.data);
}
const KOLOM_PELIHARA = ["sasaran", "kode", "kelas", "nama", "status", "jatuh_tempo", "alasan"];
async function peliharaCsv(env, req, url, kini) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const r = await peliharaAmbil(env, req, url, kini); if (r.res) return r.res;
  const l = await batasJam(env, a.oleh, "sippa.csv", 60, kini); if (l) return l;
  const d = r.data, terakhir = new Map();
  for (const i of d.inspeksi_terakhir) { const k = `${i.sasaran_jenis}:${i.sasaran_id}`; if (!(terakhir.get(k) >= i.waktu)) terakhir.set(k, i.waktu); }
  const tgl2 = ms => ms == null ? "" : new Date(ms).toISOString().slice(0, 10), baris = [];
  for (const c of d.komponen) {
    const kelas = kelasDari(c.kode_bom); if (!kelas) continue;   // awalan BOM tanpa kelas tidak terjadwal (uji P1 menjaga templat)
    const j = jadwal({kelas}, terakhir.get("komponen:" + c.id) ?? null, kelas === "K1" ? d.jam_sejak_servis[c.kit_id] ?? null : null, kini);
    baris.push({sasaran: "komponen", kode: `${c.kit_kode} ${c.kode_bom}`, kelas, nama: c.nama, status: j.status, jatuh_tempo: tgl2(j.jatuh_tempo), alasan: j.alasan});
  }
  for (const s of d.aset) { const kelas = KELAS_ASET[s.kelas]; if (!kelas) continue;   // kelas yang dicabut (pipa_koridor, keputusan 60) tidak terjadwal
    const j = jadwal({kelas}, terakhir.get("aset:" + s.id) ?? null, null, kini); baris.push({sasaran: "aset", kode: s.kode, kelas, nama: s.nama, status: j.status, jatuh_tempo: tgl2(j.jatuh_tempo), alasan: j.alasan}); }
  return berkasCsv("pelihara", csv(KOLOM_PELIHARA, baris), kini);
}

/* stok suku cadang: buku besar tambah-saja per gudang; saldo = jumlah delta; trigger sippa_stok_cek menolak saldo negatif */
async function stokDaftar(env, req, url) {
  const a = await akses(env, req, "B"); if (a.res) return a.res;
  const g = url.searchParams.get("gudang"); if (g !== null && teksOK(g, 3, 80) === undefined) return gagal(400, "gudang 3 sampai 80 karakter");
  const r = await env.DB.prepare(`SELECT gudang, kode_bom, max(nama) nama, sum(delta) saldo, satuan FROM sippa_stok_gerak WHERE dummy <= ?${g ? " AND gudang = ?" : ""} GROUP BY gudang, kode_bom, satuan ORDER BY gudang, kode_bom`).bind(lihatDummy(req), ...(g ? [g] : [])).all();
  return json({stok: r.results});
}
async function stokBuat(env, req, url, kini) {
  const a = await akses(env, req, "W"); if (a.res) return a.res;
  const l = await batasJam(env, a.oleh, "sippa.tulis", 600, kini); if (l) return l;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, gudang = teksOK(o.gudang, 3, 80), nama = teksOK(o.nama, 2, 120);
  if (gudang === undefined) return gagal(400, "gudang 3 sampai 80 karakter");
  if (typeof o.kode_bom !== "string" || !RE_BOM.test(o.kode_bom) || o.kode_bom.length > 12) return gagal(400, "kode_bom harus berbentuk P-101 (paling banyak 12 karakter)");
  if (nama === undefined) return gagal(400, "nama 2 sampai 120 karakter");
  if (typeof o.delta !== "number" || !Number.isFinite(o.delta) || o.delta === 0 || Math.abs(o.delta) > 100000) return gagal(400, "delta harus angka bukan nol, paling banyak 100000 mutlak");
  if (!SATUAN_STOK.includes(o.satuan)) return gagal(400, daftarPesan("satuan", SATUAN_STOK));
  if (!ALASAN_STOK.includes(o.alasan)) return gagal(400, daftarPesan("alasan", ALASAN_STOK));
  if (o.kit_id != null && !(typeof o.kit_id === "string" && RE_ID.test(o.kit_id) && await kitTulis(env, req, o.kit_id))) return gagal(400, "kit_id tidak ditemukan");
  const id = acak(8), dm = dummyStaf(req, a.oleh);
  try {
    await env.DB.batch([env.DB.prepare("INSERT INTO sippa_stok_gerak (id, gudang, kode_bom, nama, delta, satuan, alasan, kit_id, oleh, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, gudang, o.kode_bom, nama, o.delta, o.satuan, o.alasan, o.kit_id ?? null, a.oleh, kini, dm),
      jejakStmt(env, a.oleh, "sippa_stok_gerak:" + id, "stok", o.kode_bom, `${o.alasan} ${o.delta} ${o.satuan}`, kini, dm)]);
  } catch (e) { if (/sippa_stok_cek/.test(String(e?.message || e))) return gagal(409, "stok tidak cukup"); throw e; }
  const s = await env.DB.prepare("SELECT gudang, kode_bom, max(nama) nama, sum(delta) saldo, satuan FROM sippa_stok_gerak WHERE gudang = ? AND kode_bom = ? AND dummy = ? GROUP BY satuan").bind(gudang, o.kode_bom, dm).first();
  return json({stok: s}, 201);
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
  "GET /api/sippa/data/:nama": dataBaca,
  "GET /api/sippa/ringkas": ringkas,
  "GET /api/sippa/jalan-cek": jalanDaftar,
  "POST /api/sippa/jalan-cek": jalanTulis,
  "POST /api/sippa/aoi": aoiUsul,
  "GET /api/sippa/ab": abDaftar,
  "POST /api/sippa/ab/unggah": abUnggah,
  "POST /api/sippa/ab-status/:id": abStatus,
  "GET /api/sippa/ab.csv": abCsv,
  "GET /api/sippa/skenario": skenarioDaftar,
  "POST /api/sippa/skenario": skenarioBuat,
  "POST /api/sippa/skenario-hapus/:id": skenarioHapus,
  "GET /api/sippa/laporan": laporanDaftar,
  "POST /api/sippa/laporan": laporanBuat,
  "GET /api/sippa/laporan-berkas/:id": laporanBerkas,
  "POST /api/sippa/telemetri": telemetriMasuk,
  "GET /api/sippa/telemetri": telemetriBaca,
  "GET /api/sippa/perangkat": perangkatDaftar,
  "POST /api/sippa/perangkat": perangkatBuat,
  "POST /api/sippa/perangkat-cabut/:id": perangkatCabut,
  "GET /api/sippa/alarm": alarmDaftar,
  "POST /api/sippa/alarm-tutup/:id": alarmTutup,
  "GET /api/sippa/aset": asetDaftar,
  "GET /api/sippa/aset/:id": asetRincian,
  "POST /api/sippa/aset": asetBuat,
  "POST /api/sippa/aset/:id": asetUbah,
  "POST /api/sippa/inspeksi": inspeksiBuat,
  "GET /api/sippa/pelihara": peliharaDaftar,
  "GET /api/sippa/pelihara.csv": peliharaCsv,
  "GET /api/sippa/stok": stokDaftar,
  "POST /api/sippa/stok": stokBuat,
  "POST /api/sippa/dummy/isi": dummyIsi,
  "POST /api/sippa/dummy/hapus": dummyHapus,
}).map(([k, f]) => [k, bungkusSippa(f)]));
export const RUTE_SIPPA = {
  "GET /pipa": hal("peta"),
  ...Object.fromEntries(LAYAR_SIPPA.map(l => ["GET /pipa/" + l, hal(l)])),   // nama layar didaftarkan satu per satu: jalur lain di bawah /pipa/ jatuh ke aset statis (404)
  "GET /pipa/kit/:id": hal("kit"),
  "GET /pipa/aset/:id": hal("aset"),
  "GET /pipa/lapangan": () => halamanLapangan(),
  "GET /admin/pipa": () => alihkan("/pipa"),
  ...API,
};
