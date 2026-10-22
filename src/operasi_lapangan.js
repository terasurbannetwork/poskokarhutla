/* Operasi lapangan (docs/bnpb/RENCANA-OPERASI-LAPANGAN.md L4-L13): peta operasi per tugas, garis api rekam jalan, sumber air + pompa estafet, rencana aksi periode,
   permintaan heli/logistik + log drop, linimasa, patroli, drone termal, impor TMAT. Skema: migrations/0042_operasi_lapangan.sql. Aturan:
   - Tulis dan baca = akun instansi AKTIF pemegang cakupan tugas (sesi + header x-pb pada POST), atau moderator ke atas (modOK), atau staf berperan (pusdalops, koordalops, udara; baca + verifikator,
     pimpinan) yang wilayahnya mencakup tugas. Tugas di luar cakupan dijawab 404 (sama dengan "tidak ada"). Tidak ada rute publik; posisi orang tidak pernah keluar dari rute ini ke publik.
   - Persetujuan permintaan (diminta -> disetujui/ditolak, jadwal heli, kirim logistik) hanya moderator ke atas atau staf; akun instansi mengajukan dan menutup (selesai/diterima).
   - Baris dummy hanya terlihat akun dummy, staf dummy, dan admin (sama dengan tugas api). POST /api/ops/dummy (Super Admin) mengisi dan menghapus semua butir.
   - Berkas besar (tugas_kompleks.json, kluster_geo.json, kluster_awal.json) dibaca bertahap dari ASSETS dan dihentikan begitu nilai yang dicari ketemu: CPU Worker 10 ms tidak cukup untuk JSON.parse 6 MB.
   ponytail: batas laju baca-lalu-tulis (laju_bnpb), serentak bisa lolos satu-dua di atas batas. Batas 2000 titik drone per tugas dicek sebelum menulis, dua unggahan serentak bisa melewatinya.
   ponytail: hasil drop dinilai saat dibaca (tanpa cron); titik_terbaru hanya menyimpan putaran FIRMS terakhir (<= 24 jam), jadi drop yang tak pernah dibaca dalam 30 jam berstatus tak_dinilai. */
import {json, gagal, acak, bacaBody} from "./worker.js";
import {tx, num, modOK, superOK} from "./posko.js";
import {laju} from "./bnpb.js";
import {km} from "./titik.js";
import {akunAktif, dalamLingkup, jsonAman, PROV} from "./instansi.js";
import {modAtauStaf, dalamWilayahStaf, stafNyata, dariStaf} from "./staf.js";
import {BARANG} from "./meja_spek.js";
import {sisipLogistik} from "./meja.js";
import {muatHimawari} from "./himawari.js";

const MENIT = 60e3, JAM = 36e5, HARI = 24 * JAM;
const RE_ID = /^[0-9a-f]{16}$/, RE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
/* daftar tetap: sama dengan CHECK di 0042 (dijaga operasi_lapangan.test.mjs) */
export const JENIS_GARIS = ["garis_api", "padam", "sektor_aktif", "sektor_dingin"];
export const JENIS_SUMBER = ["sungai", "kanal", "embung", "sumur_bor", "sekat_kanal", "hidran", "lainnya"];
export const KONDISI_SUMBER = ["ada_air", "kering", "tidak_tahu"];
export const STATUS_PERIODE = ["draf", "terbit", "selesai"];
export const PRIORITAS = ["rendah", "sedang", "tinggi", "darurat"];
export const ALASAN_PATROLI = ["risiko", "khg", "lainnya"];
export const STATUS_PATROLI = ["terjadwal", "dikunjungi", "terlewat"];
/* transisi sah per jenis permintaan; nilai = siapa yang boleh: "adm" moderator ke atas atau staf, "tulis" siapa pun yang boleh menulis di tugas itu */
export const TRANSISI = {
  heli: {diminta: {disetujui: "adm", ditolak: "adm"}, disetujui: {dijadwalkan: "adm", ditolak: "adm"}, dijadwalkan: {selesai: "tulis", ditolak: "adm"}},
  logistik: {diminta: {disetujui: "adm", ditolak: "adm"}, disetujui: {dikirim: "adm", ditolak: "adm"}, dikirim: {diterima: "tulis"}},
};
export const BATAS = {titikGaris: 500, drone: 2000, tmat: 3000, sumberKm: 5, kompleksKm: 3, dropJam: 6, dropFirmsKm: 1, dropHimawariKm: 2, jejak: 200, patroliTerlewat: HARI,
  titikDekatKm: 15, sumberJauhKm: 25, heliSumberKm: 15, kanalKm: 12};
/* ---- rumus selang dan pompa estafet. Konstanta dari scripts/data/taktik.py (AMBANG gesek_c, POMPA); yang bukan dari sana diberi sumbernya ---- */
export const FAKTOR_JARAK_SELANG = 1.2;   // jarak selang = garis lurus x 1,2 (selang tak lurus mengikuti medan; asumsi platform, pemilik 22 Okt 2026)
export const BAR_PER_METER_NAIK = 0.0981;   // tekanan statis air: 1000 kg/m3 x 9,81 m/s2 / 1e5 Pa per bar = 0,0981 bar per meter naik
export const SISA_BAR_DEFAULT = 2;   // tekanan sisa di ujung segmen (masukan pompa berikutnya atau nozel); asumsi platform, dapat diganti lewat ?sisa_bar
export const SELANG = {
  "1_5": {c: 24, nama: "Selang 1,5 inci", sumber: "taktik.py AMBANG.gesek_c = 24 (FL psi per 100 ft = C x (gpm/100)^2, rumus dinas pemadam IFSTA/NFPA; belum diverifikasi)"},
  "2_5": {c: 2, nama: "Selang 2,5 inci", sumber: "koefisien gesek IFSTA selang 2,5 inci C = 2 (diingat dari buku ajar, teks belum dibuka; belum diverifikasi)"},
};
export const POMPA = {
  tekanan_tinggi: {debit_lpm: 265, kerja_bar: 10.3, contoh: "Waterax Mark-3 (titik kerja 265 L/menit pada 10,3 bar)"},
  jinjing_ringan: {debit_lpm: 159, kerja_bar: 3.4, contoh: "Waterax Mini-Striker (titik kerja 159 L/menit pada 3,4 bar)"},
  debit_besar: {debit_lpm: 660, kerja_bar: 2.3, contoh: "Honda WB30 (debit 1.100 x 0,6 asumsi platform; head total 23 m = 2,3 bar)"},
  portabel_besar: {debit_lpm: 1000, kerja_bar: 8, contoh: "Tohatsu VC52AS (titik kerja 1.000 L/menit pada 8 bar)"},
};
export const KOEF_SELANG_POMPA_M = 300;   // public/data/operasi.json koef selang_pompa mid (m per pompa estafet), pembanding lapangan
/* kehilangan tekanan per 100 m (bar): sama dengan susut_bar_per_100m di taktik.py. 378,541 L/menit = 100 gpm dan C 24 memberi 5,429 bar/100 m. */
export const susutBar100m = (debitLpm, c) => c * (debitLpm / 3.785411784 / 100) ** 2 * (100 / 0.3048 / 100) / 14.5037738;
/* murni. jarakLurusKm dari sumber ke api. Tiap pompa menaikkan tekanan kembali ke kerja_bar; anggaran susut satu segmen = kerja_bar - sisa_bar.
   Jumlah pompa = ceil((susut selang total + tekanan naik) / anggaran), paling sedikit 1 (pompa di sumber). Beda tinggi negatif (api lebih rendah) diabaikan. */
export function hitungEstafet({jarakLurusKm, pompa = "tekanan_tinggi", selang = "1_5", bedaTinggiM = 0, sisaBar = SISA_BAR_DEFAULT, debitLpm}) {
  const P = POMPA[pompa], S = SELANG[selang], debit = debitLpm ?? P.debit_lpm, anggaran = P.kerja_bar - sisaBar;
  const jarakSelangM = jarakLurusKm * 1000 * FAKTOR_JARAK_SELANG, per100 = susutBar100m(debit, S.c), susut = per100 * jarakSelangM / 100, naik = BAR_PER_METER_NAIK * Math.max(0, bedaTinggiM);
  if (anggaran <= 0) return {galat: `tekanan kerja pompa ${P.kerja_bar} bar tidak melebihi tekanan sisa ${sisaBar} bar`};
  const pompaN = Math.max(1, Math.ceil((susut + naik) / anggaran - 1e-9));
  return {jarak_lurus_km: jarakLurusKm, jarak_selang_m: Math.round(jarakSelangM), susut_bar_per_100m: per100, susut_total_bar: susut, tekanan_naik_bar: naik, anggaran_segmen_bar: anggaran,
    panjang_segmen_m: Math.round(anggaran / per100 * 100), pompa: pompaN, debit_lpm: debit, kerja_bar: P.kerja_bar, sisa_bar: sisaBar,
    pembanding_lapangan: {pompa: Math.max(1, Math.ceil(jarakSelangM / KOEF_SELANG_POMPA_M)), per_pompa_m: KOEF_SELANG_POMPA_M, sumber: "public/data/operasi.json koef selang_pompa (mid)"}};
}

/* ---- geometri (titik = [lon, lat], urutan GeoJSON) ---- */
const R_BUMI = 6371;
export const panjangKm = ps => ps.slice(1).reduce((s, p, i) => s + km(ps[i][1], ps[i][0], p[1], p[0]), 0);
/* luas cincin tertutup (titik pertama = terakhir) dalam hektare: proyeksi datar lokal (cos lintang tengah), rumus tali sepatu. Cukup untuk kompleks sampai puluhan km. */
export function luasHa(ring) {
  const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length, lon0 = ring[0][0], r = Math.PI / 180, c = Math.cos(lat0 * r);
  const xy = ring.map(p => [(p[0] - lon0) * r * R_BUMI * c, (p[1] - lat0) * r * R_BUMI]);
  let a = 0; for (let i = 0; i < xy.length - 1; i++) a += xy[i][0] * xy[i + 1][1] - xy[i + 1][0] * xy[i][1];
  return Math.abs(a) / 2 * 100;
}
/* Douglas-Peucker iteratif; epsM meter. Mempertahankan titik pertama dan terakhir. */
export function douglasPeucker(ps, epsM) {
  if (ps.length < 3) return ps;
  const r = Math.PI / 180, c = Math.cos(ps[0][1] * r), xy = ps.map(p => [(p[0] - ps[0][0]) * r * R_BUMI * c * 1000, (p[1] - ps[0][1]) * r * R_BUMI * 1000]);
  const simpan = new Uint8Array(ps.length); simpan[0] = simpan[ps.length - 1] = 1;
  const tumpuk = [[0, ps.length - 1]];
  while (tumpuk.length) {
    const [a, b] = tumpuk.pop(); let jauh = 0, at = -1;
    const dx = xy[b][0] - xy[a][0], dy = xy[b][1] - xy[a][1], pj = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) {
      const d = pj === 0 ? Math.hypot(xy[i][0] - xy[a][0], xy[i][1] - xy[a][1]) : Math.abs(dy * xy[i][0] - dx * xy[i][1] + xy[b][0] * xy[a][1] - xy[b][1] * xy[a][0]) / pj;
      if (d > jauh) { jauh = d; at = i; }
    }
    if (jauh > epsM && at > 0) { simpan[at] = 1; tumpuk.push([a, at], [at, b]); }
  }
  return ps.filter((_, i) => simpan[i]);
}
/* sederhanakan sampai <= maks titik: epsilon 2 m, digandakan sampai muat */
export function sederhanakan(ps, maks) { let e = 2, out = ps; while (out.length > maks && e < 1e5) { out = douglasPeucker(ps, e); e *= 2; } return out; }
const arahMata = d => ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"][Math.round(((d % 360) + 360) % 360 / 45) % 8];
const bulat = (x, n = 2) => x == null ? null : Math.round(x * 10 ** n) / 10 ** n;

/* ---- validasi kecil ---- */
const titikSah = (lat, lon) => typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 141.5;
const waktuMs = v => {
  if (Number.isInteger(v) && v > 1e12 && v < 4e12) return v;
  if (typeof v === "string" && /^\d{13}$/.test(v)) return Number(v);
  if (typeof v === "string" && RE_ISO.test(v)) { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  return null;
};
const teksOpsi = (v, maks, nama) => { const s = tx(v, maks); return s === undefined ? {g: `${nama} maksimal ${maks} karakter`} : {v: s}; };
const lajuTulis = (env, P, kini, aksi = "ops.tulis", maks = 300) => laju(env, P.oleh, aksi, [[JAM, maks]], kini);
const bacaJson = async (req, maks) => { const b = await bacaBody(req, maks); return b.galat ? {r: gagal(b.status || 400, b.galat)} : {o: b.o}; };

/* ================================================================ pelaku dan tugas */
const P_TULIS = ["pusdalops", "koordalops", "udara"], P_BACA = [...P_TULIS, "verifikator", "pimpinan"];
/* pelaku: moderator/staf (mod = true) atau akun instansi aktif. POST akun wajib header x-pb: 1 (anti-CSRF; cookie SameSite=Lax saja tidak menahan POST lintas situs). */
async function pelaku(env, req, kini, tulis = false) {
  const m = await modAtauStaf(env, req, tulis ? P_TULIS : P_BACA);
  if (m) return {mod: true, oleh: String(m).slice(0, 40), akun: null, lihatDummy: !stafNyata(req), staf: dariStaf(m)};
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (req.method === "POST" && req.headers.get("x-pb") !== "1") return gagal(403, "kiriman instansi wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman)");
  return {mod: false, oleh: "akun:" + a.id, akun: a, lihatDummy: !!a.dummy};
}
const tolakAdm = () => gagal(403, "hanya moderator ke atas atau staf berwenang");
/* tugas yang boleh dilihat pelaku, atau 404 yang sama untuk "tidak ada" dan "di luar wilayah" */
async function tugasUntuk(env, P, req, id) {
  if (typeof id !== "string" || !RE_ID.test(id)) return gagal(400, "tugas_id harus 16 hex");
  const t = await env.DB.prepare("SELECT id, prov, kab, kec, lat, lon, level, status, luas_ha, dibuat, konfirmasi_pada, padam_verif, padam_pada, verif_pada, cek_ulang_pada, rekomendasi, dummy FROM tugas_api WHERE id = ?").bind(id).first();
  const ok = t && (P.akun ? dalamLingkup(P.akun, t) : (!t.dummy || P.lihatDummy) && dalamWilayahStaf(req, [t.prov]));
  return ok ? t : gagal(404, "tugas tidak ada");
}
/* wilayah (prov + kab) yang boleh disentuh pelaku */
const wilayahOK = (P, req, prov, kab) => P.akun ? dalamLingkup(P.akun, {prov, kab, dummy: 0}) : dalamWilayahStaf(req, [prov]);
const sqlDummy = P => P.lihatDummy ? "1" : "dummy = 0";

/* ================================================================ berkas besar dibaca bertahap */
async function sedot(env, jalur, penanda, selesai, maks = 3e5) {
  let r; try { r = await env.ASSETS.fetch(new Request("https://aset.lokal" + jalur)); } catch (e) { return null; }
  if (!r.ok || !r.body) { r.body?.cancel(); return null; }
  const rd = r.body.getReader(), dek = new TextDecoder(); let buf = "", ada = false;
  try {
    for (;;) {
      const {value, done} = await rd.read(); if (done) return ada ? selesai(buf, true) : null;
      buf += dek.decode(value, {stream: true});
      if (!ada) { const i = buf.indexOf(penanda); if (i < 0) { buf = buf.slice(Math.max(0, buf.length - penanda.length + 1)); continue; } buf = buf.slice(i); ada = true; }
      const s = selesai(buf, false); if (s !== undefined) return s;
      if (buf.length > maks) return null;
    }
  } finally { rd.cancel().catch(() => {}); }
}
/* indeks penutup elemen JSON (objek/larik) yang dimulai di `mulai`, atau -1 bila belum lengkap. Isinya angka saja (tanpa string berkurung). */
const penutup = (t, mulai) => { let d = 0; for (let i = mulai; i < t.length; i++) { const c = t[i]; if (c === "[" || c === "{") d++; else if (c === "]" || c === "}") { d--; if (d === 0) return i + 1; } } return -1; };
const KLUSTER = new Map();   // id kompleks -> {waktu, nilai}; 10 menit
async function infoKluster(env, t, kini) {
  let ks; try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal/data/tugas_kompleks.json")); if (!r.ok) { r.body?.cancel(); return null; } ks = (await r.json())?.kompleks; } catch (e) { return null; }
  let dekat = null;
  for (const k of Array.isArray(ks) ? ks : []) { if (!titikSah(k?.lat, k?.lon) || typeof k.id !== "string" || !/^K\d{1,8}$/.test(k.id)) continue; const j = km(t.lat, t.lon, k.lat, k.lon); if (j <= BATAS.kompleksKm && (!dekat || j < dekat.jarak_km)) dekat = {id: k.id, jarak_km: j}; }
  if (!dekat) return null;
  const c = KLUSTER.get(dekat.id); if (c && kini - c.waktu < 10 * MENIT) return {...dekat, ...c.nilai};
  const poligon = await sedot(env, "/data/kluster_geo.json", `"${dekat.id}":`, (b, habis) => {
    const m = b.indexOf("[") + 1; if (!m) return habis ? null : undefined;
    if (b.startsWith("null", m)) return null;
    const e = penutup(b, m); if (e < 0) return habis ? null : undefined;
    try { return JSON.parse(b.slice(m, e)); } catch (x) { return null; }
  });
  const angin = await sedot(env, "/data/kluster_awal.json", `"id":"${dekat.id}"`, (b, habis) => {
    const j = b.indexOf('"id":"K', 10); if (j < 0 && !habis && b.length < 4000) return undefined;
    const seg = j < 0 ? b : b.slice(0, j), ws = seg.match(/"ws":(-?[\d.]+)/), wd = seg.match(/"wd":(-?[\d.]+)/);
    return {ws: ws ? Number(ws[1]) : null, wd: wd ? Number(wd[1]) : null};
  });
  const nilai = {poligon: poligon ?? null, ws: angin?.ws ?? null, wd: angin?.wd ?? null};
  if (KLUSTER.size > 200) KLUSTER.clear();
  KLUSTER.set(dekat.id, {waktu: kini, nilai});
  return {...dekat, ...nilai};
}
const anginDari = kl => kl && (kl.ws != null || kl.wd != null) ? {ws_kmj: kl.ws, wd_derajat: kl.wd, dari: kl.wd != null ? arahMata(kl.wd) : null, kluster: kl.id,
  catatan: "wd = arah datangnya angin menurut konvensi meteorologi, diteruskan apa adanya dari kluster.json"} : null;
let KANAL = null;
async function muatKanal(env) {
  if (KANAL) return KANAL;
  try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal/data/kanal.json")); if (!r.ok) { r.body?.cancel(); return null; } KANAL = (await r.json())?.grid ?? null; } catch (e) { return null; }
  return KANAL;
}

/* ================================================================ sumber air terdekat (L5 lalu kanal.json) */
async function sumberTerdekat(env, lat, lon, prov, dummy, maksKm) {
  const d = maksKm / 111 + 0.01;
  const S = (await env.DB.prepare("SELECT id, jenis, kondisi, lat, lon FROM ops_sumber_air WHERE prov = ? AND dummy = ? AND kondisi != 'kering' AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? LIMIT 200")
    .bind(prov, dummy, lat - d, lat + d, lon - d, lon + d).all()).results;
  let b = null; for (const s of S) { const j = km(lat, lon, s.lat, s.lon); if (j <= maksKm && (!b || j < b.j)) b = {...s, j}; }
  if (b) return {sumber_dari: "sumber_air", sumber_id: b.id, sumber_lat: b.lat, sumber_lon: b.lon, sumber_km: bulat(b.j)};
  const g = await muatKanal(env); if (!g) return null;
  let k = null; for (const c of g) { if (Math.abs(c[0] - lat) > d || Math.abs(c[1] - lon) > d) continue; const j = km(lat, lon, c[0], c[1]); if (j <= BATAS.kanalKm && (!k || j < k.j)) k = {c, j}; }
  return k ? {sumber_dari: "kanal", sumber_id: null, sumber_lat: k.c[0], sumber_lon: k.c[1], sumber_km: bulat(k.j)} : null;
}

/* ================================================================ L4 peta operasi */
const bentukGaris = r => ({id: r.id, tugas_id: r.tugas_id, penugasan_id: r.penugasan_id, jenis: r.jenis, koordinat: jsonAman(r.koordinat), n_titik: r.n_titik, panjang_km: r.panjang_km, luas_ha: r.luas_ha,
  tertutup: !!r.tertutup, sumber: r.sumber, mulai: r.mulai, selesai: r.selesai, dibuat: r.dibuat, dummy: r.dummy});
const bentukSumber = (r, jarak) => ({id: r.id, jenis: r.jenis, kondisi: r.kondisi, lat: r.lat, lon: r.lon, catatan: r.catatan, dibuat: r.dibuat, diubah: r.diubah, ...(jarak != null ? {jarak_km: bulat(jarak)} : {}), dummy: r.dummy});
const bentukPermintaan = (r, drop = []) => ({id: r.id, tugas_id: r.tugas_id, jenis: r.jenis, status: r.status, prioritas: r.prioritas, lat: r.lat, lon: r.lon, luas_ha: r.luas_ha,
  sumber: r.sumber_dari ? {dari: r.sumber_dari, id: r.sumber_id, lat: r.sumber_lat, lon: r.sumber_lon, jarak_km: r.sumber_km} : null, barang: r.barang, barang_ket: r.barang_ket, jumlah: r.jumlah, satuan: r.satuan,
  catatan: r.catatan, meja_id: r.meja_id, dibuat: r.dibuat, diubah: r.diubah, drop, dummy: r.dummy});
const bentukDrop = (r, kini) => ({id: r.id, permintaan_id: r.permintaan_id, lat: r.lat, lon: r.lon, liter: r.liter, pada: r.pada, hasil: r.hasil ?? "menunggu", hasil_n: r.hasil_n, hasil_pada: r.hasil_pada, dibuat: r.dibuat, dummy: r.dummy});
const bentukPeriode = r => ({id: r.id, tugas_id: r.tugas_id, mulai: r.mulai, selesai: r.selesai, sasaran: r.sasaran, sektor: jsonAman(r.sektor) ?? [], regu: jsonAman(r.regu) ?? [], alat: r.alat, pj: r.pj,
  komunikasi: r.komunikasi, keselamatan: r.keselamatan, cuaca: r.cuaca, status: r.status, dibuat: r.dibuat, diubah: r.diubah, dummy: r.dummy});

/* penugasan aktif + posisi terakhir + jejak (<= 200 titik tiap orang). Tabel 0035 belum ada: daftar kosong. */
async function penugasanAktif(env, t, kini) {
  let P; try { P = (await env.DB.prepare("SELECT id, nama, peran, orang, status, berangkat_pada, tiba_pada, selesai_pada, kedaluwarsa FROM penugasan WHERE tugas_id = ? AND status = 'aktif' AND kedaluwarsa > ? ORDER BY dibuat DESC LIMIT 40").bind(t.id, kini).all()).results; }
  catch (e) { if (/no such table: penugasan/i.test(String(e?.message))) return []; throw e; }
  if (!P.length) return [];
  const J = (await env.DB.prepare(`SELECT penugasan_id, lat, lon, akurasi, pada FROM (SELECT penugasan_id, lat, lon, akurasi, pada, row_number() OVER (PARTITION BY penugasan_id ORDER BY pada DESC) rn
    FROM penugasan_posisi WHERE penugasan_id IN (SELECT value FROM json_each(?))) WHERE rn <= ? ORDER BY pada`).bind(JSON.stringify(P.map(p => p.id)), BATAS.jejak).all()).results;
  const per = new Map(P.map(p => [p.id, []])); for (const x of J) per.get(x.penugasan_id)?.push(x);
  return P.map(p => { const j = per.get(p.id), a = j.length ? j[j.length - 1] : null;
    return {id: p.id, nama: p.nama, peran: p.peran, orang: p.orang, status: p.status, berangkat_pada: p.berangkat_pada, tiba_pada: p.tiba_pada, selesai_pada: p.selesai_pada,
      posisi: a && {lat: a.lat, lon: a.lon, akurasi: a.akurasi, pada: a.pada}, jejak: j.map(x => [x.lat, x.lon, x.pada])}; });
}
async function petaOperasi(env, req, kini, id) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  const t = await tugasUntuk(env, P, req, id); if (t instanceof Response) return t;
  const d = BATAS.sumberKm / 111 + 0.01, dm = t.dummy;
  const [kl, pen, garis, sumber, perm, drop, drone, periode, unggah] = await Promise.all([infoKluster(env, t, kini), penugasanAktif(env, t, kini),
    env.DB.prepare("SELECT * FROM ops_garis WHERE tugas_id = ? ORDER BY dibuat LIMIT 300").bind(id).all(),
    env.DB.prepare("SELECT * FROM ops_sumber_air WHERE prov = ? AND dummy = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? LIMIT 300").bind(t.prov, dm, t.lat - d, t.lat + d, t.lon - d, t.lon + d).all(),
    env.DB.prepare("SELECT * FROM ops_permintaan WHERE tugas_id = ? ORDER BY dibuat LIMIT 100").bind(id).all(),
    env.DB.prepare("SELECT * FROM ops_drop WHERE tugas_id = ? ORDER BY pada LIMIT 300").bind(id).all(),
    env.DB.prepare("SELECT lat, lon, suhu_c, waktu FROM ops_drone WHERE tugas_id = ? ORDER BY waktu LIMIT ?").bind(id, BATAS.drone).all(),
    env.DB.prepare("SELECT * FROM ops_periode WHERE tugas_id = ? ORDER BY mulai DESC LIMIT 20").bind(id).all(),
    env.DB.prepare("SELECT id, alat, catatan, n, dibuat FROM ops_drone_unggah WHERE tugas_id = ? ORDER BY dibuat").bind(id).all()]);
  const drops = (await nilaiDrop(env, drop.results, kini)).map(x => bentukDrop(x, kini));
  const sk = sumber.results.map(s => ({s, j: km(t.lat, t.lon, s.lat, s.lon)})).filter(x => x.j <= BATAS.sumberKm).sort((a, b) => a.j - b.j).map(x => bentukSumber(x.s, x.j));
  const g = garis.results.map(bentukGaris);
  return json({kini, tugas: {id: t.id, prov: t.prov, kab: t.kab, kec: t.kec, lat: t.lat, lon: t.lon, status: t.status, level: t.level, luas_ha: t.luas_ha, padam_verif: t.padam_verif, dummy: t.dummy},
    kluster: kl && {id: kl.id, jarak_km: bulat(kl.jarak_km), poligon: kl.poligon}, angin: anginDari(kl), penugasan: pen,
    garis: g.filter(x => x.jenis === "garis_api" || x.jenis === "padam"), sektor: g.filter(x => x.jenis.startsWith("sektor_")), sumber_air: sk,
    permintaan: perm.results.map(r => bentukPermintaan(r, drops.filter(x => x.permintaan_id === r.id))), drop: drops,
    drone: {titik: drone.results.map(x => [x.lat, x.lon, x.suhu_c, x.waktu]), unggah: unggah.results}, periode: periode.results.map(bentukPeriode),
    batas: {jejak: BATAS.jejak, drone: BATAS.drone, sumber_km: BATAS.sumberKm}});
}

/* ================================================================ L4 garis api rekam jalan */
async function buatGaris(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 60000); if (b.r) return b.r; const o = b.o;
  const t = await tugasUntuk(env, P, req, o.tugas_id); if (t instanceof Response) return t;
  if (!JENIS_GARIS.includes(o.jenis)) return gagal(400, `jenis harus ${JENIS_GARIS.join("/")}`);
  let ps, mulai = null, selesai = null, sumber;
  if (o.titik != null) {
    if (o.penugasan_id != null) return gagal(400, "pilih titik atau penugasan_id, jangan dua-duanya");
    if (!Array.isArray(o.titik) || o.titik.length < 2 || o.titik.length > BATAS.titikGaris) return gagal(400, `titik harus larik 2 sampai ${BATAS.titikGaris} pasangan [lat, lon]`);
    ps = [];
    for (const p of o.titik) {
      if (!Array.isArray(p) || p.length !== 2 || !titikSah(p[0], p[1])) return gagal(400, "tiap titik [lat, lon] angka di dalam kotak Indonesia");
      if (km(t.lat, t.lon, p[0], p[1]) > BATAS.titikDekatKm) return gagal(400, `titik lebih dari ${BATAS.titikDekatKm} km dari tugas`);
      ps.push([p[1], p[0]]);
    }
    sumber = "kirim";
  } else {
    if (typeof o.penugasan_id !== "string" || !RE_ID.test(o.penugasan_id)) return gagal(400, "titik atau penugasan_id (16 hex) wajib");
    const pn = await env.DB.prepare("SELECT id, dibuat, berangkat_pada, selesai_pada FROM penugasan WHERE id = ? AND tugas_id = ?").bind(o.penugasan_id, t.id).first();
    if (!pn) return gagal(404, "penugasan tidak ada di tugas ini");
    mulai = o.mulai == null ? (pn.berangkat_pada ?? pn.dibuat) : waktuMs(o.mulai); selesai = o.selesai == null ? (pn.selesai_pada ?? kini) : waktuMs(o.selesai);
    if (mulai == null || selesai == null || selesai <= mulai || selesai - mulai > 7 * HARI || selesai > kini + MENIT) return gagal(400, "mulai dan selesai: waktu sah, mulai < selesai, rentang paling lama 7 hari");
    const rows = (await env.DB.prepare("SELECT lat, lon FROM penugasan_posisi WHERE penugasan_id = ? AND pada BETWEEN ? AND ? AND (akurasi IS NULL OR akurasi <= 100) ORDER BY pada LIMIT 5000").bind(pn.id, mulai, selesai).all()).results;
    if (rows.length < 2) return gagal(409, "kurang dari 2 posisi akurat (<= 100 m) di rentang waktu itu");
    ps = rows.map(r => [r.lon, r.lat]); sumber = "rekam";
  }
  if (ps.length > BATAS.titikGaris) ps = sederhanakan(ps, BATAS.titikGaris);
  const tertutup = ps.length >= 4 && km(ps[0][1], ps[0][0], ps.at(-1)[1], ps.at(-1)[0]) <= 0.05;
  if (tertutup) ps[ps.length - 1] = [...ps[0]];
  const panjang = panjangKm(ps), luas = tertutup ? luasHa(ps) : null, id = acak(8);
  await env.DB.prepare("INSERT INTO ops_garis (id, tugas_id, penugasan_id, jenis, koordinat, n_titik, panjang_km, luas_ha, tertutup, sumber, mulai, selesai, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, t.id, sumber === "rekam" ? o.penugasan_id : null, o.jenis, JSON.stringify(ps), ps.length, panjang, luas, tertutup ? 1 : 0, sumber, mulai, selesai, P.oleh, kini, t.dummy).run();
  return json({garis: bentukGaris(await env.DB.prepare("SELECT * FROM ops_garis WHERE id = ?").bind(id).first())}, 201);
}
async function ubahGaris(env, req, kini, id) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 2048); if (b.r) return b.r;
  if (b.o.aksi !== "hapus") return gagal(400, "aksi harus hapus");
  const r = await env.DB.prepare("SELECT * FROM ops_garis WHERE id = ?").bind(id).first();
  const t = r && await tugasUntuk(env, P, req, r.tugas_id); if (!r || t instanceof Response) return gagal(404, "garis tidak ada");
  if (!P.mod && r.oleh !== P.oleh) return gagal(403, "garis hanya bisa dihapus pembuatnya, moderator, atau staf berwenang");
  await env.DB.prepare("DELETE FROM ops_garis WHERE id = ?").bind(id).run();
  return json({id, dihapus: true});
}

/* ================================================================ L5 sumber air dan selang */
async function buatSumber(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 2048); if (b.r) return b.r; const o = b.o;
  const t = await tugasUntuk(env, P, req, o.tugas_id); if (t instanceof Response) return t;
  if (!JENIS_SUMBER.includes(o.jenis)) return gagal(400, `jenis harus ${JENIS_SUMBER.join("/")}`);
  if (!KONDISI_SUMBER.includes(o.kondisi)) return gagal(400, `kondisi harus ${KONDISI_SUMBER.join("/")}`);
  if (!titikSah(o.lat, o.lon)) return gagal(400, "lat/lon angka di dalam kotak Indonesia");
  if (km(t.lat, t.lon, o.lat, o.lon) > BATAS.sumberJauhKm) return gagal(400, `sumber air lebih dari ${BATAS.sumberJauhKm} km dari tugas`);
  const c = teksOpsi(o.catatan, 300, "catatan"); if (c.g) return gagal(400, c.g);
  const l = await lajuTulis(env, P, kini); if (l) return l;
  const id = acak(8);
  await env.DB.prepare("INSERT INTO ops_sumber_air (id, tugas_id, prov, jenis, kondisi, lat, lon, catatan, oleh, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, t.id, t.prov, o.jenis, o.kondisi, o.lat, o.lon, c.v, P.oleh, kini, kini, t.dummy).run();
  return json({sumber: bentukSumber(await env.DB.prepare("SELECT * FROM ops_sumber_air WHERE id = ?").bind(id).first(), km(t.lat, t.lon, o.lat, o.lon))}, 201);
}
async function ubahSumber(env, req, kini, id) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 2048); if (b.r) return b.r; const o = b.o;
  const s = await env.DB.prepare("SELECT * FROM ops_sumber_air WHERE id = ?").bind(id).first();
  const t = s?.tugas_id ? await tugasUntuk(env, P, req, s.tugas_id) : null;   // tugas sudah dibuang retensi: hanya moderator
  if (!s || (t ? t instanceof Response : !P.mod || (s.dummy && !P.lihatDummy))) return gagal(404, "sumber air tidak ada");
  if (o.kondisi != null && !KONDISI_SUMBER.includes(o.kondisi)) return gagal(400, `kondisi harus ${KONDISI_SUMBER.join("/")}`);
  const c = o.catatan === undefined ? {v: s.catatan} : teksOpsi(o.catatan, 300, "catatan"); if (c.g) return gagal(400, c.g);
  await env.DB.prepare("UPDATE ops_sumber_air SET kondisi = ?, catatan = ?, diubah = ? WHERE id = ?").bind(o.kondisi ?? s.kondisi, c.v, kini, id).run();
  return json({sumber: bentukSumber(await env.DB.prepare("SELECT * FROM ops_sumber_air WHERE id = ?").bind(id).first())});
}
async function daftarSumber(env, req, kini, url) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  const t = await tugasUntuk(env, P, req, url.searchParams.get("tugas_id")); if (t instanceof Response) return t;
  const d = BATAS.sumberKm / 111 + 0.01;
  const S = (await env.DB.prepare("SELECT * FROM ops_sumber_air WHERE prov = ? AND dummy = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? LIMIT 300").bind(t.prov, t.dummy, t.lat - d, t.lat + d, t.lon - d, t.lon + d).all()).results;
  return json({radius_km: BATAS.sumberKm, sumber_air: S.map(s => ({s, j: km(t.lat, t.lon, s.lat, s.lon)})).filter(x => x.j <= BATAS.sumberKm).sort((a, b) => a.j - b.j).slice(0, 100).map(x => bentukSumber(x.s, x.j)),
    jenis: JENIS_SUMBER, kondisi: KONDISI_SUMBER});
}
async function hitungSelang(env, req, kini, url) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  const q = url.searchParams, t = await tugasUntuk(env, P, req, q.get("tugas_id")); if (t instanceof Response) return t;
  const sid = q.get("sumber_id"); if (!sid || !RE_ID.test(sid)) return gagal(400, "sumber_id wajib (16 hex)");
  const s = await env.DB.prepare("SELECT * FROM ops_sumber_air WHERE id = ? AND dummy = ? AND prov = ?").bind(sid, t.dummy, t.prov).first(); if (!s) return gagal(404, "sumber air tidak ada");
  const pompa = q.get("pompa") ?? "tekanan_tinggi", selang = q.get("selang") ?? "1_5";
  if (!Object.hasOwn(POMPA, pompa)) return gagal(400, `pompa harus ${Object.keys(POMPA).join("/")}`);
  if (!Object.hasOwn(SELANG, selang)) return gagal(400, `selang harus ${Object.keys(SELANG).join("/")}`);
  const angka = (nama, min, maks, def) => { const v = q.get(nama); if (v == null || v === "") return def; return /^-?\d{1,5}(\.\d{1,3})?$/.test(v) && +v >= min && +v <= maks ? +v : NaN; };
  const beda = angka("beda_tinggi_m", -500, 3000, null), sisa = angka("sisa_bar", 0.5, 20, SISA_BAR_DEFAULT), debit = angka("debit_lpm", 20, 3000, undefined);
  if ([beda, sisa, debit].some(Number.isNaN)) return gagal(400, "beda_tinggi_m -500..3000, sisa_bar 0,5..20, debit_lpm 20..3000 (angka)");
  const h = hitungEstafet({jarakLurusKm: km(t.lat, t.lon, s.lat, s.lon), pompa, selang, bedaTinggiM: beda ?? 0, sisaBar: sisa, debitLpm: debit});
  if (h.galat) return gagal(400, h.galat);
  return json({tugas_id: t.id, sumber: bentukSumber(s), pompa_kelas: pompa, selang, ...h,
    beda_tinggi: {m: beda ?? 0, keterangan: beda == null ? "beda tinggi tidak tersedia (belum ada data elevasi), dihitung 0 m; kirim ?beda_tinggi_m bila diukur di lapangan" : "beda tinggi dari kiriman"},
    peringatan: s.kondisi === "kering" ? "sumber ini dilaporkan kering" : s.kondisi === "tidak_tahu" ? "kondisi sumber belum diketahui" : null,
    rumus: "pompa = ceil((susut selang total + 0,0981 x beda tinggi) / (tekanan kerja - tekanan sisa)), paling sedikit 1; susut per 100 m = C x (gpm/100)^2 psi per 100 ft diubah ke bar",
    sumber_konstanta: {faktor_jarak_selang: {nilai: FAKTOR_JARAK_SELANG, sumber: "asumsi platform"}, bar_per_meter_naik: {nilai: BAR_PER_METER_NAIK, sumber: "fisika: 1000 kg/m3 x 9,81 / 1e5"},
      sisa_bar: {nilai: sisa, sumber: sisa === SISA_BAR_DEFAULT ? "asumsi platform" : "kiriman"}, gesek_c: {nilai: SELANG[selang].c, sumber: SELANG[selang].sumber}, pompa: POMPA[pompa].contoh}});
}

/* ================================================================ L6 rencana aksi periode */
async function awalPeriode(env, t, kini) {
  const rek = jsonAman(t.rekomendasi), cara = rek?.cara?.[0]?.metode, pen = await penugasanAktif(env, t, kini), kl = await infoKluster(env, t, kini), ang = anginDari(kl);
  const ketua = pen.find(p => p.peran === "ketua_regu") ?? pen[0], tempat = [t.kec, t.kab].filter(Boolean).join(", ");
  const alat = Array.isArray(rek?.alat) ? rek.alat.filter(x => typeof x === "string").join(", ").slice(0, 400) : null;
  const cuaca = ang ? `Angin ${ang.ws_kmj ?? "tidak diketahui"} km/jam${ang.dari ? ` dari ${ang.dari}` : ""}` : null;
  return {sasaran: `Padamkan api di ${tempat}, cegah meluas ke luar sektor${cara ? `, metode utama ${cara}` : ""}.`.slice(0, 500), pj: ketua?.nama ?? null, regu: pen.map(p => `${p.nama} (${p.peran})`).slice(0, 40), alat: alat || null,
    cuaca, keselamatan: ang?.dari ? `Pakai APD lengkap. Angin datang dari ${ang.dari}: jangan berada searah angin dari api, tetapkan jalur keluar dan titik kumpul.` : "Pakai APD lengkap. Arah angin belum diketahui: tetapkan jalur keluar dan titik kumpul.", sektor: []};
}
const bacaPeriode = (o, dasar) => {
  const f = {};
  for (const [k, maks] of [["sasaran", 500], ["alat", 400], ["pj", 80], ["komunikasi", 200], ["keselamatan", 600], ["cuaca", 300]]) {
    if (o[k] === undefined) { f[k] = dasar[k] ?? null; continue; }
    const s = tx(o[k], maks); if (s === undefined) return {g: `${k} maksimal ${maks} karakter`}; f[k] = s;
  }
  for (const [k, maks, n] of [["sektor", 20, 60], ["regu", 40, 80]]) {
    const v = o[k] === undefined ? dasar[k] ?? [] : o[k];
    if (!Array.isArray(v) || v.length > maks || !v.every(x => typeof x === "string" && x.trim().length >= 1 && x.length <= n)) return {g: `${k} harus larik teks (paling banyak ${maks}, tiap butir 1 sampai ${n} karakter)`};
    f[k] = v.map(x => x.trim());
  }
  return {f};
};
async function buatPeriode(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 8192); if (b.r) return b.r; const o = b.o;
  const t = await tugasUntuk(env, P, req, o.tugas_id); if (t instanceof Response) return t;
  const mulai = waktuMs(o.mulai), selesai = waktuMs(o.selesai);
  if (mulai == null || selesai == null || selesai <= mulai || selesai - mulai > 48 * JAM || selesai - mulai < JAM) return gagal(400, "mulai dan selesai: waktu sah, rentang 1 sampai 48 jam (periode operasi 12 atau 24 jam)");
  const r = bacaPeriode(o, await awalPeriode(env, t, kini)); if (r.g) return gagal(400, r.g);
  const l = await lajuTulis(env, P, kini); if (l) return l;
  const id = acak(8), f = r.f;
  await env.DB.prepare("INSERT INTO ops_periode (id, tugas_id, mulai, selesai, sasaran, sektor, regu, alat, pj, komunikasi, keselamatan, cuaca, status, oleh, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draf', ?, ?, ?, ?)")
    .bind(id, t.id, mulai, selesai, f.sasaran, JSON.stringify(f.sektor), JSON.stringify(f.regu), f.alat, f.pj, f.komunikasi, f.keselamatan, f.cuaca, P.oleh, kini, kini, t.dummy).run();
  return json({periode: bentukPeriode(await env.DB.prepare("SELECT * FROM ops_periode WHERE id = ?").bind(id).first())}, 201);
}
async function daftarPeriode(env, req, kini, url) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  const t = await tugasUntuk(env, P, req, url.searchParams.get("tugas_id")); if (t instanceof Response) return t;
  const rows = (await env.DB.prepare("SELECT * FROM ops_periode WHERE tugas_id = ? ORDER BY mulai DESC LIMIT 50").bind(t.id).all()).results;
  return json({periode: rows.map(bentukPeriode), awal: await awalPeriode(env, t, kini), status: STATUS_PERIODE});
}
async function muatPeriode(env, P, req, id) {
  const r = await env.DB.prepare("SELECT * FROM ops_periode WHERE id = ?").bind(id).first();
  const t = r && await tugasUntuk(env, P, req, r.tugas_id);
  return !r || t instanceof Response ? gagal(404, "periode tidak ada") : {r, t};
}
async function periode(env, req, kini, id) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  const m = await muatPeriode(env, P, req, id); if (m instanceof Response) return m;
  const serah = (await env.DB.prepare("SELECT dari, ke, catatan, waktu FROM ops_serah WHERE periode_id = ? ORDER BY waktu, id").bind(id).all()).results;
  return json({periode: bentukPeriode(m.r), serah, tugas: {id: m.t.id, kab: m.t.kab, kec: m.t.kec, lat: m.t.lat, lon: m.t.lon, level: m.t.level}});
}
async function ubahPeriode(env, req, kini, id) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 8192); if (b.r) return b.r; const o = b.o;
  const m = await muatPeriode(env, P, req, id); if (m instanceof Response) return m;
  const {r, t} = m, jejak = ket => env.DB.prepare("INSERT INTO ops_jejak (tugas_id, waktu, jenis, ref_id, ket, oleh, dummy) VALUES (?, ?, 'periode', ?, ?, ?, ?)").bind(t.id, kini, id, ket, P.oleh, t.dummy);
  const l = await lajuTulis(env, P, kini); if (l) return l;
  if (o.aksi === "ubah") {
    if (r.status !== "draf") return gagal(409, "hanya periode draf yang bisa diubah; sesudah terbit gunakan serah terima");
    const f = bacaPeriode(o, {...bentukPeriode(r)}); if (f.g) return gagal(400, f.g);
    let mulai = r.mulai, selesai = r.selesai;
    if (o.mulai !== undefined || o.selesai !== undefined) { mulai = o.mulai === undefined ? r.mulai : waktuMs(o.mulai); selesai = o.selesai === undefined ? r.selesai : waktuMs(o.selesai);
      if (mulai == null || selesai == null || selesai <= mulai || selesai - mulai > 48 * JAM || selesai - mulai < JAM) return gagal(400, "mulai dan selesai: waktu sah, rentang 1 sampai 48 jam"); }
    const x = f.f;
    await env.DB.prepare("UPDATE ops_periode SET mulai = ?, selesai = ?, sasaran = ?, sektor = ?, regu = ?, alat = ?, pj = ?, komunikasi = ?, keselamatan = ?, cuaca = ?, diubah = ? WHERE id = ? AND status = 'draf'")
      .bind(mulai, selesai, x.sasaran, JSON.stringify(x.sektor), JSON.stringify(x.regu), x.alat, x.pj, x.komunikasi, x.keselamatan, x.cuaca, kini, id).run();
  } else if (o.aksi === "terbit" || o.aksi === "selesai") {
    const dari = o.aksi === "terbit" ? "draf" : "terbit";
    if (r.status !== dari) return gagal(409, `periode berstatus ${r.status}; ${o.aksi} hanya dari ${dari}`);
    if (o.aksi === "terbit" && (!r.sasaran || !r.pj)) return gagal(409, "sasaran dan penanggung jawab wajib terisi sebelum terbit");
    const hasil = await env.DB.batch([env.DB.prepare("UPDATE ops_periode SET status = ?, diubah = ? WHERE id = ? AND status = ?").bind(o.aksi, kini, id, dari),
      env.DB.prepare("INSERT INTO ops_jejak (tugas_id, waktu, jenis, ref_id, ket, oleh, dummy) SELECT ?, ?, 'periode', ?, ?, ?, ? WHERE changes() > 0").bind(t.id, kini, id, `Periode ${o.aksi}`, P.oleh, t.dummy)]);
    if (!hasil[0].meta.changes) return gagal(409, "status periode berubah; muat ulang");
  } else if (o.aksi === "serah") {
    if (r.status !== "terbit") return gagal(409, "serah terima hanya untuk periode yang sudah terbit");
    const dari = tx(o.dari, 80), ke = tx(o.ke, 80), cat = tx(o.catatan, 500);
    if (!dari || dari.length < 2 || !ke || ke.length < 2 || cat === undefined) return gagal(400, "dari dan ke wajib (2 sampai 80 karakter), catatan maksimal 500");
    await env.DB.batch([env.DB.prepare("INSERT INTO ops_serah (periode_id, dari, ke, catatan, waktu, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, dari, ke, cat, kini, P.oleh, t.dummy), jejak(`Serah terima dari ${dari} ke ${ke}`)]);
  } else return gagal(400, "aksi harus ubah/terbit/selesai/serah");
  const serah = (await env.DB.prepare("SELECT dari, ke, catatan, waktu FROM ops_serah WHERE periode_id = ? ORDER BY waktu, id").bind(id).all()).results;
  return json({periode: bentukPeriode(await env.DB.prepare("SELECT * FROM ops_periode WHERE id = ?").bind(id).first()), serah});
}

/* ================================================================ L7 + L8 permintaan heli dan logistik */
async function buatPermintaan(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 4096); if (b.r) return b.r; const o = b.o;
  const t = await tugasUntuk(env, P, req, o.tugas_id); if (t instanceof Response) return t;
  if (o.jenis !== "heli" && o.jenis !== "logistik") return gagal(400, "jenis harus heli/logistik");
  const prio = o.prioritas ?? "sedang"; if (!PRIORITAS.includes(prio)) return gagal(400, `prioritas harus ${PRIORITAS.join("/")}`);
  const cat = teksOpsi(o.catatan, 500, "catatan"); if (cat.g) return gagal(400, cat.g);
  let lat = t.lat, lon = t.lon, luas = null, barang = null, barangKet = null, jumlah = null, satuan = null, sumber = {};
  if (o.jenis === "heli") {
    lat = o.lat; lon = o.lon;
    if (!titikSah(lat, lon)) return gagal(400, "lat/lon sasaran wajib, angka di dalam kotak Indonesia");
    if (km(t.lat, t.lon, lat, lon) > BATAS.titikDekatKm) return gagal(400, `sasaran lebih dari ${BATAS.titikDekatKm} km dari tugas`);
    if (o.luas_ha != null) { luas = num(o.luas_ha, 0, 100000); if (luas == null || Number.isNaN(luas)) return gagal(400, "luas_ha 0 sampai 100000"); }
    sumber = await sumberTerdekat(env, lat, lon, t.prov, t.dummy, BATAS.heliSumberKm) ?? {};
  } else {
    if (!BARANG.includes(o.barang)) return gagal(400, `barang harus salah satu daftar meja Logistik: ${BARANG.join(", ")}`);
    barang = o.barang; const k = teksOpsi(o.barang_ket, 100, "barang_ket"); if (k.g) return gagal(400, k.g); barangKet = k.v;
    if (barang === "lainnya" && !barangKet) return gagal(400, "barang_ket wajib bila barang = lainnya");
    jumlah = typeof o.jumlah === "number" ? o.jumlah : NaN; if (!(jumlah > 0 && jumlah <= 1e7)) return gagal(400, "jumlah angka lebih dari 0 sampai 10.000.000");
    satuan = tx(o.satuan, 20); if (!satuan) return gagal(400, "satuan wajib (maksimal 20 karakter)");
  }
  const l = await lajuTulis(env, P, kini); if (l) return l;
  const id = acak(8);
  await env.DB.prepare(`INSERT INTO ops_permintaan (id, tugas_id, jenis, status, prioritas, lat, lon, luas_ha, sumber_dari, sumber_id, sumber_lat, sumber_lon, sumber_km, barang, barang_ket, jumlah, satuan, catatan, oleh, dibuat, diubah, dummy)
    VALUES (?, ?, ?, 'diminta', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, t.id, o.jenis, prio, lat, lon, luas, sumber.sumber_dari ?? null, sumber.sumber_id ?? null, sumber.sumber_lat ?? null, sumber.sumber_lon ?? null,
    sumber.sumber_km ?? null, barang, barangKet, jumlah, satuan, cat.v, P.oleh, kini, kini, t.dummy).run();
  return json({permintaan: bentukPermintaan(await env.DB.prepare("SELECT * FROM ops_permintaan WHERE id = ?").bind(id).first())}, 201);
}
async function daftarPermintaan(env, req, kini, url) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  const q = url.searchParams, tid = q.get("tugas_id"), status = q.get("status"), jenis = q.get("jenis");
  if (status && ![...new Set([...Object.values(TRANSISI).flatMap(x => [...Object.keys(x), ...Object.values(x).flatMap(Object.keys)])])].includes(status)) return gagal(400, "status tidak dikenal");
  if (jenis && jenis !== "heli" && jenis !== "logistik") return gagal(400, "jenis harus heli/logistik");
  let rows;
  if (tid) {
    const t = await tugasUntuk(env, P, req, tid); if (t instanceof Response) return t;
    rows = (await env.DB.prepare("SELECT * FROM ops_permintaan WHERE tugas_id = ? AND (? IS NULL OR status = ?) AND (? IS NULL OR jenis = ?) ORDER BY dibuat DESC LIMIT 200").bind(t.id, status, status, jenis, jenis).all()).results;
  } else {
    if (!P.mod) return gagal(400, "tugas_id wajib untuk akun instansi");
    rows = (await env.DB.prepare(`SELECT p.*, t.prov FROM ops_permintaan p JOIN tugas_api t ON t.id = p.tugas_id WHERE (? IS NULL OR p.status = ?) AND (? IS NULL OR p.jenis = ?) AND (? = 1 OR p.dummy = 0)
      ORDER BY p.dibuat DESC LIMIT 400`).bind(status, status, jenis, jenis, P.lihatDummy ? 1 : 0).all()).results.filter(r => dalamWilayahStaf(req, [r.prov])).slice(0, 200);
  }
  const ids = rows.map(r => r.id);
  const D = ids.length ? await nilaiDrop(env, (await env.DB.prepare("SELECT * FROM ops_drop WHERE permintaan_id IN (SELECT value FROM json_each(?)) ORDER BY pada").bind(JSON.stringify(ids)).all()).results, kini) : [];
  return json({permintaan: rows.map(r => bentukPermintaan(r, D.filter(x => x.permintaan_id === r.id).map(x => bentukDrop(x, kini)))), transisi: TRANSISI, prioritas: PRIORITAS});
}
async function ubahPermintaan(env, req, kini, id) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 2048); if (b.r) return b.r; const o = b.o;
  const r = await env.DB.prepare("SELECT * FROM ops_permintaan WHERE id = ?").bind(id).first();
  const t = r && await tugasUntuk(env, P, req, r.tugas_id); if (!r || t instanceof Response) return gagal(404, "permintaan tidak ada");
  if (o.aksi === "teruskan") {
    if (!P.mod) return tolakAdm();
    if (r.jenis !== "logistik") return gagal(409, "hanya permintaan logistik yang bisa diteruskan ke Meja logistik");
    if (r.meja_id) return gagal(409, "sudah diteruskan ke Meja logistik");
    if (r.status === "ditolak") return gagal(409, "permintaan yang ditolak tidak diteruskan");
    const tempat = [t.kec, t.kab].filter(Boolean).join(", ").slice(0, 60), orang = (await penugasanAktif(env, t, kini)).reduce((s, p) => s + p.orang, 0);
    const m = await sisipLogistik(env, {prov: t.prov, kab: t.kab, data: {barang: r.barang, jumlah_diminta: r.jumlah, satuan: r.satuan, posko: `Titik api ${tempat}`, kebutuhan_untuk: orang}}, kini, P.oleh, t.dummy);
    if (m.galat) return gagal(400, `Meja logistik menolak: ${m.galat}`);
    const u = await env.DB.prepare("UPDATE ops_permintaan SET meja_id = ?, diubah = ? WHERE id = ? AND meja_id IS NULL").bind(m.id, kini, id).run();
    if (!u.meta.changes) return gagal(409, "sudah diteruskan ke Meja logistik");
    return json({permintaan: bentukPermintaan(await env.DB.prepare("SELECT * FROM ops_permintaan WHERE id = ?").bind(id).first()), meja_id: m.id});
  }
  if (o.aksi !== "status") return gagal(400, "aksi harus status/teruskan");
  const peran = typeof o.ke === "string" && Object.hasOwn(TRANSISI[r.jenis][r.status] ?? {}, o.ke) ? TRANSISI[r.jenis][r.status][o.ke] : null;
  if (!peran) return gagal(409, `transisi ${r.status} ke ${String(o.ke).slice(0, 30)} tidak sah untuk permintaan ${r.jenis}`);
  if (peran === "adm" && !P.mod) return tolakAdm();
  const cat = tx(o.catatan, 200); if (cat === undefined) return gagal(400, "catatan maksimal 200 karakter");
  if (o.ke === "ditolak" && !cat) return gagal(400, "alasan penolakan wajib di catatan");
  const l = await lajuTulis(env, P, kini); if (l) return l;
  const hasil = await env.DB.batch([env.DB.prepare("UPDATE ops_permintaan SET status = ?, diubah = ? WHERE id = ? AND status = ?").bind(o.ke, kini, id, r.status),
    env.DB.prepare("INSERT INTO ops_jejak (tugas_id, waktu, jenis, ref_id, ket, oleh, dummy) SELECT ?, ?, 'permintaan', ?, ?, ?, ? WHERE changes() > 0")
      .bind(t.id, kini, id, `${r.jenis === "heli" ? "Permintaan heli" : "Permintaan logistik"} ${r.status} ke ${o.ke}${cat ? `: ${cat}` : ""}`.slice(0, 300), P.oleh, t.dummy)]);
  if (!hasil[0].meta.changes) return gagal(409, "status permintaan berubah; muat ulang");
  return json({permintaan: bentukPermintaan(await env.DB.prepare("SELECT * FROM ops_permintaan WHERE id = ?").bind(id).first())});
}

/* ---- log drop dan hasil otomatis ---- */
/* titik FIRMS (putaran terakhir di titik_terbaru, jam = jam sebelum acuan) dan Himawari (R2 data/himawari.json, u = menit sebelum acuan) */
async function buktiTitik(env) {
  let firms = null, hw = null;
  try { const r = await env.DB.prepare("SELECT isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first(); firms = r && JSON.parse(r.isi); } catch (e) {}
  try { hw = await muatHimawari(env); } catch (e) {}
  const af = firms && Date.parse(firms.acuan), ah = hw && Date.parse(hw.acuan);
  return {f: Array.isArray(firms?.baris) && Number.isFinite(af) ? firms.baris.map(b => ({lat: b[0], lon: b[1], t: af + b[2] * JAM})) : [], af: Number.isFinite(af) ? af : null,
    h: Array.isArray(hw?.baris) && Number.isFinite(ah) ? hw.baris.map(b => ({lat: b[0], lon: b[1], t: ah - b[2] * MENIT})) : [], ah: Number.isFinite(ah) ? ah : null};
}
/* murni. {hasil, n}: ada_titik bila ada titik dalam jendela (langsung final); tanpa_titik hanya bila data sudah mencakup seluruh 6 jam DAN jendela masih dalam 24 jam terakhir data
   (putaran FIRMS hanya menyimpan 24 jam); tak_dinilai bila data tak mungkin lagi mencakupnya atau > 30 jam tanpa putusan; selain itu null (menunggu). */
export function nilaiSatuDrop(d, B, kini) {
  const akhir = d.pada + BATAS.dropJam * JAM, acuan = Math.max(B.af ?? 0, B.ah ?? 0);
  const n = B.f.filter(p => p.t > d.pada && p.t <= akhir && km(p.lat, p.lon, d.lat, d.lon) <= BATAS.dropFirmsKm).length + B.h.filter(p => p.t > d.pada && p.t <= akhir && km(p.lat, p.lon, d.lat, d.lon) <= BATAS.dropHimawariKm).length;
  if (n > 0) return {hasil: "ada_titik", n};
  if (acuan >= akhir) return d.pada >= acuan - 24 * JAM ? {hasil: "tanpa_titik", n: 0} : {hasil: "tak_dinilai", n: 0};
  return kini - d.pada > 30 * JAM ? {hasil: "tak_dinilai", n: 0} : null;
}
async function nilaiDrop(env, drops, kini) {
  const buka = drops.filter(d => d.hasil == null); if (!buka.length) return drops;
  const B = await buktiTitik(env), st = [];
  for (const d of buka) { const v = nilaiSatuDrop(d, B, kini); if (!v) continue; d.hasil = v.hasil; d.hasil_n = v.n; d.hasil_pada = kini;
    st.push(env.DB.prepare("UPDATE ops_drop SET hasil = ?, hasil_n = ?, hasil_pada = ? WHERE id = ? AND hasil IS NULL").bind(v.hasil, v.n, kini, d.id)); }
  if (st.length) await env.DB.batch(st);
  return drops;
}
async function catatDrop(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 2048); if (b.r) return b.r; const o = b.o;
  if (typeof o.permintaan_id !== "string" || !RE_ID.test(o.permintaan_id)) return gagal(400, "permintaan_id wajib (16 hex)");
  const r = await env.DB.prepare("SELECT * FROM ops_permintaan WHERE id = ?").bind(o.permintaan_id).first();
  const t = r && await tugasUntuk(env, P, req, r.tugas_id); if (!r || t instanceof Response) return gagal(404, "permintaan tidak ada");
  if (r.jenis !== "heli") return gagal(409, "drop hanya untuk permintaan heli");
  if (r.status !== "dijadwalkan" && r.status !== "selesai") return gagal(409, `drop dicatat setelah permintaan dijadwalkan (status sekarang ${r.status})`);
  if (!titikSah(o.lat, o.lon)) return gagal(400, "lat/lon drop wajib, angka di dalam kotak Indonesia");
  if (km(r.lat, r.lon, o.lat, o.lon) > 5) return gagal(400, "titik drop lebih dari 5 km dari sasaran permintaan");
  if (!Number.isInteger(o.liter) || o.liter < 1 || o.liter > 30000) return gagal(400, "liter bilangan bulat 1 sampai 30000");
  const pada = o.pada == null ? kini : waktuMs(o.pada); if (pada == null || pada > kini + 5 * MENIT || pada < kini - 7 * HARI) return gagal(400, "pada: waktu sah, tidak lebih dari 7 hari lalu dan tidak di masa depan");
  const l = await lajuTulis(env, P, kini); if (l) return l;
  const id = acak(8);
  await env.DB.prepare("INSERT INTO ops_drop (id, permintaan_id, tugas_id, lat, lon, liter, pada, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, r.id, t.id, o.lat, o.lon, o.liter, pada, P.oleh, kini, t.dummy).run();
  const [d] = await nilaiDrop(env, [await env.DB.prepare("SELECT * FROM ops_drop WHERE id = ?").bind(id).first()], kini);
  return json({drop: bentukDrop(d, kini), jendela_jam: BATAS.dropJam, radius_km: {firms: BATAS.dropFirmsKm, himawari: BATAS.dropHimawariKm}}, 201);
}

/* ================================================================ L9 linimasa dan pelajaran */
const HASIL_LABEL = {api_ada: "api ada", bukan_api: "bukan api", sudah_padam: "sudah padam"};
const menitAntara = (a, b) => a != null && b != null && b >= a ? Math.round((b - a) / MENIT) : null;
async function linimasa(env, req, kini, id) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  const t = await tugasUntuk(env, P, req, id); if (t instanceof Response) return t;
  const aman = async (sql, ...ikat) => { try { return (await env.DB.prepare(sql).bind(...ikat).all()).results; } catch (e) { if (/no such table/i.test(String(e?.message))) return []; throw e; } };
  const [isian, pen, garis, perm, drop, per, serah, jejak, muncul, pel] = await Promise.all([
    aman("SELECT id, langkah, dibuat, hasil, status_api FROM tugas_isian WHERE tugas_id = ?", id), aman("SELECT id, nama, peran, dibuat, berangkat_pada, tiba_pada, selesai_pada FROM penugasan WHERE tugas_id = ?", id),
    aman("SELECT id, jenis, dibuat, panjang_km, luas_ha FROM ops_garis WHERE tugas_id = ?", id), aman("SELECT id, jenis, prioritas, barang, dibuat FROM ops_permintaan WHERE tugas_id = ?", id),
    aman("SELECT * FROM ops_drop WHERE tugas_id = ?", id), aman("SELECT id, mulai, selesai, dibuat FROM ops_periode WHERE tugas_id = ?", id),
    aman("SELECT s.dari, s.ke, s.waktu, s.periode_id FROM ops_serah s JOIN ops_periode p ON p.id = s.periode_id WHERE p.tugas_id = ?", id), aman("SELECT waktu, jenis, ref_id, ket FROM ops_jejak WHERE tugas_id = ?", id),
    aman("SELECT waktu, sumber, jarak_km FROM tugas_muncul WHERE tugas_id = ?", id), aman("SELECT id, catatan, dibuat FROM ops_pelajaran WHERE tugas_id = ? ORDER BY dibuat", id)]);
  const drops = await nilaiDrop(env, drop, kini), E = [];
  const tambah = (waktu, jenis, ket, ref = null) => { if (waktu != null) E.push({waktu, jenis, ket, ref}); };
  tambah(t.dibuat, "deteksi", `Titik api terdeteksi satelit dan tugas dibuat di ${[t.kec, t.kab].filter(Boolean).join(", ")}`);
  tambah(t.konfirmasi_pada, "konfirmasi", "Konfirmasi lapangan diterima");
  for (const i of isian) tambah(i.dibuat, i.langkah === "konfirmasi" ? "isian_konfirmasi" : "isian_kabar", i.langkah === "konfirmasi" ? `Isian konfirmasi: ${HASIL_LABEL[i.hasil] ?? i.hasil}` : `Kabar tindakan: api ${i.status_api}`, i.id);
  for (const p of pen) { tambah(p.dibuat, "penugasan", `${p.nama} ditugaskan sebagai ${p.peran}`, p.id); tambah(p.berangkat_pada, "berangkat", `${p.nama} berangkat`, p.id); tambah(p.tiba_pada, "tiba", `${p.nama} tiba di lokasi`, p.id); tambah(p.selesai_pada, "selesai_tugas", `${p.nama} selesai bertugas`, p.id); }
  for (const g of garis) tambah(g.dibuat, "garis", `Garis ${g.jenis.replace("_", " ")} dicatat, ${bulat(g.panjang_km)} km${g.luas_ha != null ? `, ${bulat(g.luas_ha, 1)} ha` : ""}`, g.id);
  for (const p of perm) tambah(p.dibuat, "permintaan", p.jenis === "heli" ? `Permintaan heli water bombing (prioritas ${p.prioritas})` : `Permintaan logistik ${p.barang}`, p.id);
  for (const d of drops) tambah(d.pada, "drop", `Drop air ${d.liter} L, hasil ${d.hasil ?? "menunggu"}${d.hasil_n ? ` (${d.hasil_n} titik)` : ""}`, d.id);
  for (const p of per) tambah(p.dibuat, "periode", "Rencana aksi periode dibuat", p.id);
  for (const s of serah) tambah(s.waktu, "serah", `Serah terima dari ${s.dari} ke ${s.ke}`, s.periode_id);
  for (const j of jejak) tambah(j.waktu, j.jenis === "periode" ? "periode_status" : "permintaan_status", j.ket, j.ref_id);
  const padam = t.padam_pada ?? isian.filter(i => i.status_api === "padam" || (i.langkah === "konfirmasi" && i.hasil === "sudah_padam")).map(i => i.dibuat).sort((a, b) => a - b)[0] ?? null;
  tambah(padam, "padam", "Dilaporkan padam");
  for (const m of muncul) tambah(m.waktu, "muncul_lagi", `Api muncul lagi (${m.sumber}${m.jarak_km != null ? `, ${bulat(m.jarak_km, 1)} km` : ""})`);
  if (!muncul.length && t.padam_verif === "muncul_lagi") tambah(t.verif_pada, "muncul_lagi", "Api muncul lagi, tugas dibuka kembali");
  const terverif = t.padam_verif === "padam_terverifikasi" ? t.verif_pada : null;
  tambah(terverif, "terverifikasi", "Padam terverifikasi satelit");
  tambah(t.cek_ulang_pada, "cek_ulang", "Cek ulang lapangan dilakukan");
  E.sort((a, b) => a.waktu - b.waktu);
  const tiba = pen.map(p => p.tiba_pada).filter(x => x != null).sort((a, b) => a - b)[0] ?? null;
  return json({kini, tugas: {id: t.id, kab: t.kab, kec: t.kec, status: t.status}, linimasa: E,
    respons: {deteksi: t.dibuat, konfirmasi_menit: menitAntara(t.dibuat, t.konfirmasi_pada), tiba_menit: menitAntara(t.dibuat, tiba), padam_menit: menitAntara(t.dibuat, padam), terverifikasi_menit: menitAntara(t.dibuat, terverif)},
    pelajaran: pel});
}
async function buatPelajaran(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 4096); if (b.r) return b.r; const o = b.o;
  const t = await tugasUntuk(env, P, req, o.tugas_id); if (t instanceof Response) return t;
  const c = tx(o.catatan, 1000); if (!c || c.length < 5) return gagal(400, "catatan pelajaran 5 sampai 1000 karakter");
  if ((await env.DB.prepare("SELECT count(*) n FROM ops_pelajaran WHERE tugas_id = ?").bind(t.id).first()).n >= 20) return gagal(409, "satu tugas maksimal 20 catatan pelajaran");
  const l = await lajuTulis(env, P, kini); if (l) return l;
  const id = acak(8);
  await env.DB.prepare("INSERT INTO ops_pelajaran (id, tugas_id, catatan, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?)").bind(id, t.id, c, P.oleh, kini, t.dummy).run();
  return json({pelajaran: {id, catatan: c, dibuat: kini}}, 201);
}

/* ================================================================ L10 patroli */
const bentukPatroli = (r, kunjungan = []) => ({id: r.id, prov: r.prov, kab: r.kab, kec: r.kec, desa: r.desa, alasan: r.alasan, alasan_ket: r.alasan_ket, jadwal: r.jadwal, akun_id: r.akun_id, status: r.status, dibuat: r.dibuat, kunjungan, dummy: r.dummy});
async function buatPatroli(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 4096); if (b.r) return b.r; const o = b.o;
  const prov = P.akun?.tingkat === "kab" ? P.akun.prov : o.prov, kab = P.akun?.tingkat === "kab" ? P.akun.kab : tx(o.kab, 60);
  if (typeof prov !== "string" || !Object.hasOwn(PROV, prov) || !kab || kab.length < 2) return gagal(400, "prov (kode BPS 2 digit) dan kab (2 sampai 60 karakter) wajib");
  if (o.prov != null && P.akun?.tingkat === "kab" && (o.prov !== prov || (typeof o.kab === "string" && o.kab.toLowerCase() !== kab.toLowerCase()))) return gagal(403, "wilayah di luar cakupan akun");
  if (!wilayahOK(P, req, prov, kab)) return gagal(403, "wilayah di luar cakupan");
  const kec = tx(o.kec, 60), desa = tx(o.desa, 60), ket = teksOpsi(o.alasan_ket, 300, "alasan_ket");
  if (!kec || ket.g || desa === undefined) return gagal(400, ket.g ?? "kec wajib (maksimal 60 karakter), desa maksimal 60");
  if (!ALASAN_PATROLI.includes(o.alasan)) return gagal(400, `alasan harus ${ALASAN_PATROLI.join("/")}`);
  if (o.alasan === "lainnya" && !ket.v) return gagal(400, "alasan_ket wajib bila alasan = lainnya");
  const jadwal = waktuMs(o.jadwal); if (jadwal == null || jadwal < kini - HARI || jadwal > kini + 60 * HARI) return gagal(400, "jadwal: waktu sah, dari kemarin sampai 60 hari ke depan");
  let akunId = P.akun?.id ?? null;
  if (P.mod && o.akun_id != null) {
    if (typeof o.akun_id !== "string" || !RE_ID.test(o.akun_id)) return gagal(400, "akun_id 16 hex");
    const a = await env.DB.prepare("SELECT id, tingkat, prov, kab, cakupan, dummy FROM instansi_akun WHERE id = ? AND status = 'aktif'").bind(o.akun_id).first();
    if (!a || !dalamLingkup(a, {prov, kab, dummy: 0})) return gagal(400, "akun penanggung jawab tidak aktif atau di luar wilayah patroli");
    akunId = a.id;
  }
  const l = await lajuTulis(env, P, kini); if (l) return l;
  const id = acak(8);
  await env.DB.prepare("INSERT INTO ops_patroli (id, prov, kab, kec, desa, alasan, alasan_ket, jadwal, akun_id, status, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'terjadwal', ?, ?, ?)")
    .bind(id, prov, kab, kec, desa, o.alasan, ket.v, jadwal, akunId, P.oleh, kini, P.akun?.dummy ? 1 : 0).run();
  return json({patroli: bentukPatroli(await env.DB.prepare("SELECT * FROM ops_patroli WHERE id = ?").bind(id).first())}, 201);
}
async function daftarPatroli(env, req, kini, url) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  const q = url.searchParams, status = q.get("status"), prov = q.get("prov"), kab = q.get("kab");
  if (status && !STATUS_PATROLI.includes(status)) return gagal(400, `status harus ${STATUS_PATROLI.join("/")}`);
  if (prov && !Object.hasOwn(PROV, prov)) return gagal(400, "prov kode BPS 2 digit");
  await env.DB.prepare("UPDATE ops_patroli SET status = 'terlewat' WHERE status = 'terjadwal' AND jadwal < ?").bind(kini - BATAS.patroliTerlewat).run();
  const rows = (await env.DB.prepare(`SELECT * FROM ops_patroli WHERE (? IS NULL OR status = ?) AND (? IS NULL OR prov = ?) AND (? IS NULL OR lower(kab) = lower(?)) AND (? = 1 OR dummy = 0) ORDER BY jadwal DESC LIMIT 600`)
    .bind(status, status, prov, prov, kab, kab, P.lihatDummy ? 1 : 0).all()).results.filter(r => wilayahOK(P, req, r.prov, r.kab)).slice(0, 200);
  const K = rows.length ? (await env.DB.prepare("SELECT patroli_id, lat, lon, akurasi, media_id, catatan, pada FROM ops_kunjungan WHERE patroli_id IN (SELECT value FROM json_each(?)) ORDER BY pada").bind(JSON.stringify(rows.map(r => r.id))).all()).results : [];
  return json({kini, patroli: rows.map(r => bentukPatroli(r, K.filter(k => k.patroli_id === r.id).map(({patroli_id, ...k}) => k))), alasan: ALASAN_PATROLI, status: STATUS_PATROLI});
}
async function kunjungiPatroli(env, req, kini, id) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 2048); if (b.r) return b.r; const o = b.o;
  const r = await env.DB.prepare("SELECT * FROM ops_patroli WHERE id = ?").bind(id).first();
  if (!r || (r.dummy && !P.lihatDummy) || !wilayahOK(P, req, r.prov, r.kab)) return gagal(404, "patroli tidak ada");
  if (o.aksi !== "kunjungan") return gagal(400, "aksi harus kunjungan");
  if (!P.mod && r.akun_id !== P.akun.id) return gagal(403, "kunjungan hanya dicatat penanggung jawab patroli, moderator, atau staf berwenang");
  let lat = o.lat, lon = o.lon, pada = o.pada == null ? kini : waktuMs(o.pada), media = null;
  if (o.media_id != null) {
    if (typeof o.media_id !== "string" || !RE_ID.test(o.media_id)) return gagal(400, "media_id 16 hex");
    const m = await env.DB.prepare("SELECT id, akun_id, lat, lon, waktu_ambil FROM instansi_media WHERE id = ?").bind(o.media_id).first();
    if (!m || (!P.mod && m.akun_id !== P.akun.id)) return gagal(404, "media tidak ada");
    media = m.id; lat = m.lat; lon = m.lon; pada = m.waktu_ambil;
  }
  if (!titikSah(lat, lon)) return gagal(400, "lat/lon kunjungan wajib (atau media_id foto GPS), angka di dalam kotak Indonesia");
  if (pada == null || pada > kini + 5 * MENIT || pada < kini - 7 * HARI) return gagal(400, "pada: waktu sah, tidak lebih dari 7 hari lalu");
  const ak = o.akurasi == null ? null : num(o.akurasi, 0, 1000); if (Number.isNaN(ak)) return gagal(400, "akurasi 0 sampai 1000 meter");
  const cat = teksOpsi(o.catatan, 500, "catatan"); if (cat.g) return gagal(400, cat.g);
  if (!media && !cat.v && ak == null) return gagal(400, "titik GPS tanpa foto wajib disertai catatan atau akurasi GPS");
  const l = await lajuTulis(env, P, kini); if (l) return l;
  await env.DB.batch([env.DB.prepare("INSERT INTO ops_kunjungan (patroli_id, lat, lon, akurasi, media_id, catatan, pada, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, lat, lon, ak, media, cat.v, pada, P.oleh, r.dummy),
    env.DB.prepare("UPDATE ops_patroli SET status = 'dikunjungi' WHERE id = ?").bind(id)]);
  const K = (await env.DB.prepare("SELECT lat, lon, akurasi, media_id, catatan, pada FROM ops_kunjungan WHERE patroli_id = ? ORDER BY pada").bind(id).all()).results;
  return json({patroli: bentukPatroli(await env.DB.prepare("SELECT * FROM ops_patroli WHERE id = ?").bind(id).first(), K)}, 201);
}

/* ================================================================ CSV: drone termal (L12) dan TMAT (L13) */
const RE_KOORD = /^-?\d{1,3}(\.\d{1,8})?$/, RE_SUHU = /^-?\d{1,4}(\.\d{1,2})?$/, RE_TMAT = /^-?\d{1,3}(\.\d{1,2})?$/;
/* murni: teks CSV ketat. Header harus persis `kolom`; tanpa tanda kutip, tanpa kolom lebih, hanya ASCII cetak. cek(sel, nomor) -> {v} atau {g}. */
export function uraiCsv(teks, kolom, maksBaris, cek) {
  if (typeof teks !== "string" || !teks.trim()) return {galat: "csv kosong"};
  if (/[^\x20-\x7E\r\n]/.test(teks)) return {galat: "csv hanya boleh berisi ASCII cetak (karakter kontrol dan non-ASCII ditolak)"};
  const baris = teks.replace(/\r\n?/g, "\n").split("\n"); while (baris.length && !baris.at(-1).trim()) baris.pop();
  if (baris[0].trim().toLowerCase() !== kolom.join(",")) return {galat: `header harus persis: ${kolom.join(",")}`};
  if (baris.length - 1 > maksBaris) return {galat: `lebih dari ${maksBaris} baris`};
  if (baris.length < 2) return {galat: "csv tanpa baris data"};
  const out = [];
  for (let i = 1; i < baris.length; i++) {
    const sel = baris[i].split(",").map(s => s.trim());
    if (sel.length !== kolom.length || !baris[i].trim()) return {galat: `baris ${i + 1}: harus tepat ${kolom.length} kolom, tanpa baris kosong`};
    const h = cek(sel, i + 1); if (h.g) return {galat: `baris ${i + 1}: ${h.g}`};
    out.push(h.v);
  }
  return {baris: out};
}
const CHUNK_CSV = 250;
const stmtBaris = (env, sql, depan, baris) => { const s = []; for (let i = 0; i < baris.length; i += CHUNK_CSV) s.push(env.DB.prepare(sql).bind(...depan, JSON.stringify(baris.slice(i, i + CHUNK_CSV)))); return s; };
async function unggahDrone(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  const b = await bacaJson(req, 250000); if (b.r) return b.r; const o = b.o;
  const t = await tugasUntuk(env, P, req, o.tugas_id); if (t instanceof Response) return t;
  const alat = tx(o.alat, 80), cat = teksOpsi(o.catatan, 300, "catatan");
  if (!alat || alat.length < 2 || cat.g) return gagal(400, cat.g ?? "alat wajib (2 sampai 80 karakter, mis. DJI Mavic 3T)");
  const ada = (await env.DB.prepare("SELECT count(*) n FROM ops_drone WHERE tugas_id = ?").bind(t.id).first()).n;
  const csv = uraiCsv(o.csv, ["lat", "lon", "suhu_c", "waktu"], BATAS.drone, (s, no) => {
    if (!RE_KOORD.test(s[0]) || !RE_KOORD.test(s[1]) || !titikSah(+s[0], +s[1])) return {g: "lat/lon tidak sah"};
    if (km(t.lat, t.lon, +s[0], +s[1]) > 5) return {g: "titik lebih dari 5 km dari tugas"};
    if (!RE_SUHU.test(s[2]) || +s[2] < -40 || +s[2] > 1500) return {g: "suhu_c harus angka -40 sampai 1500"};
    const w = waktuMs(s[3]); if (w == null || w > kini + JAM || w < kini - 7 * HARI) return {g: "waktu harus ISO dengan zona (Z atau +07:00) atau epoch ms, dalam 7 hari terakhir"};
    return {v: [+s[0], +s[1], +s[2], w]};
  });
  if (csv.galat) return gagal(400, csv.galat);
  if (ada + csv.baris.length > BATAS.drone) return gagal(409, `satu tugas maksimal ${BATAS.drone} titik drone (sudah ${ada}, kiriman ${csv.baris.length})`);
  const l = await lajuTulis(env, P, kini, "ops.csv", 20); if (l) return l;
  const id = acak(8);
  await env.DB.batch([env.DB.prepare("INSERT INTO ops_drone_unggah (id, tugas_id, alat, catatan, n, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, t.id, alat, cat.v, csv.baris.length, P.oleh, kini, t.dummy),
    ...stmtBaris(env, "INSERT INTO ops_drone (unggah_id, tugas_id, lat, lon, suhu_c, waktu, dummy) SELECT ?, ?, json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), ? FROM json_each(?)", [id, t.id, t.dummy], csv.baris)]);
  return json({unggah: {id, alat, catatan: cat.v, n: csv.baris.length, dibuat: kini}, total_tugas: ada + csv.baris.length}, 201);
}
async function unggahTmat(env, req, kini) {
  const P = await pelaku(env, req, kini, true); if (P instanceof Response) return P;
  if (!(await modOK(env, req))) return gagal(403, "unggah TMAT hanya untuk moderator ke atas");
  const b = await bacaJson(req, 400000); if (b.r) return b.r; const o = b.o;
  const csv = uraiCsv(o.csv, ["id", "lat", "lon", "tmat_cm", "waktu", "sumber"], BATAS.tmat, s => {
    if (!/^[A-Za-z0-9_.-]{2,30}$/.test(s[0])) return {g: "id stasiun 2 sampai 30 karakter (huruf, angka, _ . -)"};
    if (!RE_KOORD.test(s[1]) || !RE_KOORD.test(s[2]) || !titikSah(+s[1], +s[2])) return {g: "lat/lon tidak sah"};
    if (!RE_TMAT.test(s[3]) || +s[3] < -500 || +s[3] > 300) return {g: "tmat_cm harus angka -500 sampai 300"};
    const w = waktuMs(s[4]); if (w == null || w > kini + JAM || w < Date.UTC(2015, 0, 1)) return {g: "waktu harus ISO dengan zona (Z atau +07:00) atau epoch ms, sejak 2015 dan tidak di masa depan"};
    if (!/^[A-Za-z0-9 _./-]{2,60}$/.test(s[5])) return {g: "sumber 2 sampai 60 karakter (huruf, angka, spasi, _ . / -)"};
    return {v: [s[0], +s[1], +s[2], +s[3], w, s[5]]};
  });
  if (csv.galat) return gagal(400, csv.galat);
  const l = await lajuTulis(env, P, kini, "ops.csv", 20); if (l) return l;
  await env.DB.batch(stmtBaris(env, "INSERT OR REPLACE INTO ops_tmat (stasiun, lat, lon, tmat_cm, waktu, sumber, diunggah, oleh, dummy) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), json_extract(value, '$[4]'), json_extract(value, '$[5]'), ?, ?, 0 FROM json_each(?)", [kini, P.oleh], csv.baris));
  return json({n: csv.baris.length, stasiun: new Set(csv.baris.map(x => x[0])).size, keterangan: KET_TMAT}, 201);
}
const KET_TMAT = "Data TMAT berasal dari unggahan CSV moderator. Tarikan otomatis dari BRGM menunggu akses resmi.";
async function petaTmat(env, req, kini, url) {
  const P = await pelaku(env, req, kini); if (P instanceof Response) return P;
  let bb = [94.5, -11.5, 141.5, 6.5];
  const s = url.searchParams.get("bbox");
  if (s != null) { bb = s.split(",").map(x => /^-?\d{1,3}(\.\d+)?$/.test(x) ? +x : NaN); if (bb.length !== 4 || bb.some(Number.isNaN) || bb[0] >= bb[2] || bb[1] >= bb[3]) return gagal(400, "bbox = lonMin,latMin,lonMaks,latMaks (angka, min < maks)"); }
  const rows = (await env.DB.prepare(`SELECT t.stasiun, t.lat, t.lon, t.tmat_cm, t.waktu, t.sumber, t.dummy FROM ops_tmat t WHERE t.lon BETWEEN ? AND ? AND t.lat BETWEEN ? AND ? AND (? = 1 OR t.dummy = 0)
    AND t.waktu = (SELECT max(waktu) FROM ops_tmat WHERE stasiun = t.stasiun) ORDER BY t.stasiun LIMIT 2000`).bind(bb[0], bb[2], bb[1], bb[3], P.lihatDummy ? 1 : 0).all()).results;
  return json({bbox: bb, stasiun: rows, keterangan: KET_TMAT, satuan: "tmat_cm negatif = muka air di bawah permukaan gambut"});
}

/* ================================================================ dummy (Super Admin) */
const ID_DUMMY_TUGAS = "00d0ff5000000001";
const TABEL_HAPUS = ["ops_kunjungan", "ops_patroli", "ops_drone", "ops_drone_unggah", "ops_jejak", "ops_pelajaran", "ops_drop", "ops_serah", "ops_permintaan", "ops_periode", "ops_garis", "ops_sumber_air", "ops_tmat"];
async function dummyHapus(env) {
  const n = {};
  for (const tb of TABEL_HAPUS) n[tb] = (await env.DB.prepare(`SELECT count(*) n FROM ${tb} WHERE dummy = 1`).first()).n;
  await env.DB.batch([...TABEL_HAPUS.map(tb => env.DB.prepare(`DELETE FROM ${tb} WHERE dummy = 1`)),
    env.DB.prepare("DELETE FROM tugas_api WHERE id = ? AND dummy = 1 AND NOT EXISTS (SELECT 1 FROM tugas_isian i WHERE i.tugas_id = tugas_api.id) AND NOT EXISTS (SELECT 1 FROM instansi_media m WHERE m.tugas_id = tugas_api.id)").bind(ID_DUMMY_TUGAS)]);
  return json({ok: true, dihapus: n});
}
async function dummyIsi(env, kini, oleh) {
  await dummyHapus(env);
  let t = await env.DB.prepare("SELECT id, prov, kab, kec, lat, lon FROM tugas_api WHERE dummy = 1 AND status = 'buka' ORDER BY dibuat LIMIT 1").first();
  if (!t) {
    await env.DB.prepare("INSERT OR IGNORE INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, dummy) VALUES (?, '62', 'Seruyan', 'Seruyan Hilir', -2.55, 112, 3, 12, 40, ?, ?, 'buka', 1)").bind(ID_DUMMY_TUGAS, kini - 5 * JAM, kini - 5 * JAM).run();
    t = await env.DB.prepare("SELECT id, prov, kab, kec, lat, lon FROM tugas_api WHERE id = ?").bind(ID_DUMMY_TUGAS).first();
  }
  const o = oleh ? String(oleh).slice(0, 40) : "dummy:ops", d = 0.004, id = () => acak(8), st = [];
  const sumber = [["sungai", "ada_air", d, 0], ["embung", "ada_air", -d, d], ["sumur_bor", "kering", 0, -d]].map(([jenis, kondisi, a, b]) => ({id: id(), jenis, kondisi, lat: t.lat + a, lon: t.lon + b}));
  for (const s of sumber) st.push(env.DB.prepare("INSERT INTO ops_sumber_air (id, tugas_id, prov, jenis, kondisi, lat, lon, catatan, oleh, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 'Contoh', ?, ?, ?, 1)").bind(s.id, t.id, t.prov, s.jenis, s.kondisi, s.lat, s.lon, o, kini, kini));
  const garis = (jenis, ps, tutup) => { const k = tutup ? [...ps, ps[0]] : ps; return env.DB.prepare("INSERT INTO ops_garis (id, tugas_id, penugasan_id, jenis, koordinat, n_titik, panjang_km, luas_ha, tertutup, sumber, oleh, dibuat, dummy) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'kirim', ?, ?, 1)")
    .bind(id(), t.id, jenis, JSON.stringify(k), k.length, panjangKm(k), tutup ? luasHa(k) : null, tutup ? 1 : 0, o, kini - HARI / 24); };
  const [x, y] = [t.lon, t.lat];
  st.push(garis("garis_api", [[x - 0.005, y + 0.003], [x, y + 0.005], [x + 0.006, y + 0.002]], false), garis("padam", [[x - 0.005, y - 0.004], [x, y - 0.006]], false),
    garis("sektor_aktif", [[x - 0.004, y - 0.002], [x + 0.004, y - 0.002], [x + 0.004, y + 0.004], [x - 0.004, y + 0.004]], true));
  const per = id(); st.push(env.DB.prepare("INSERT INTO ops_periode (id, tugas_id, mulai, selesai, sasaran, sektor, regu, alat, pj, komunikasi, keselamatan, cuaca, status, oleh, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, 'Padamkan sektor timur, cegah meluas ke gambut', '[\"Sektor timur\",\"Sektor selatan\"]', '[\"Regu Contoh 1\"]', 'Pompa Mark-3, selang 1,5 inci', 'Ketua Regu Contoh', 'Radio kanal 3, grup WA Contoh', 'APD lengkap, jalur keluar ke barat', 'Angin 12 km/jam dari tenggara', 'terbit', ?, ?, ?, 1)")
    .bind(per, t.id, kini - JAM, kini + 11 * JAM, o, kini - 2 * JAM, kini - 2 * JAM), env.DB.prepare("INSERT INTO ops_serah (periode_id, dari, ke, catatan, waktu, oleh, dummy) VALUES (?, 'Regu pagi', 'Regu siang', 'Sektor timur masih bara', ?, ?, 1)").bind(per, kini - HARI / 48, o),
    env.DB.prepare("INSERT INTO ops_jejak (tugas_id, waktu, jenis, ref_id, ket, oleh, dummy) VALUES (?, ?, 'periode', ?, 'Periode terbit', ?, 1)").bind(t.id, kini - 2 * JAM, per, o));
  const heli = id(), logi = id();
  st.push(env.DB.prepare("INSERT INTO ops_permintaan (id, tugas_id, jenis, status, prioritas, lat, lon, luas_ha, sumber_dari, sumber_id, sumber_lat, sumber_lon, sumber_km, catatan, oleh, dibuat, diubah, dummy) VALUES (?, ?, 'heli', 'dijadwalkan', 'tinggi', ?, ?, 20, 'sumber_air', ?, ?, ?, 0.5, 'Contoh', ?, ?, ?, 1)").bind(heli, t.id, t.lat, t.lon, sumber[0].id, sumber[0].lat, sumber[0].lon, o, kini - 3 * JAM, kini - JAM),
    env.DB.prepare("INSERT INTO ops_permintaan (id, tugas_id, jenis, status, prioritas, lat, lon, barang, jumlah, satuan, catatan, oleh, dibuat, diubah, dummy) VALUES (?, ?, 'logistik', 'diminta', 'sedang', ?, ?, 'air_mineral', 20, 'dus', 'Contoh', ?, ?, ?, 1)").bind(logi, t.id, t.lat, t.lon, o, kini - 2 * JAM, kini - 2 * JAM),
    env.DB.prepare("INSERT INTO ops_drop (id, permintaan_id, tugas_id, lat, lon, liter, pada, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, 5000, ?, ?, ?, 1)").bind(id(), heli, t.id, t.lat, t.lon, kini - 2 * JAM, o, kini - 2 * JAM),
    env.DB.prepare("INSERT INTO ops_pelajaran (id, tugas_id, catatan, oleh, dibuat, dummy) VALUES (?, ?, 'Contoh: sumur bor kering, kanal 1 km lebih andal', ?, ?, 1)").bind(id(), t.id, o, kini));
  const pat = id(); st.push(env.DB.prepare("INSERT INTO ops_patroli (id, prov, kab, kec, desa, alasan, alasan_ket, jadwal, status, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, 'Desa Contoh', 'risiko', 'Risiko harian tinggi', ?, 'dikunjungi', ?, ?, 1)").bind(pat, t.prov, t.kab, t.kec, kini + HARI, o, kini),
    env.DB.prepare("INSERT INTO ops_kunjungan (patroli_id, lat, lon, akurasi, catatan, pada, oleh, dummy) VALUES (?, ?, ?, 10, 'Contoh: tidak ada api', ?, ?, 1)").bind(pat, t.lat, t.lon, kini, o),
    env.DB.prepare("INSERT INTO ops_patroli (id, prov, kab, kec, alasan, jadwal, status, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, 'khg', ?, 'terjadwal', ?, ?, 1)").bind(id(), t.prov, t.kab, t.kec, kini + 2 * HARI, o, kini));
  const du = id(); st.push(env.DB.prepare("INSERT INTO ops_drone_unggah (id, tugas_id, alat, catatan, n, oleh, dibuat, dummy) VALUES (?, ?, 'Drone termal Contoh', 'Contoh', 40, ?, ?, 1)").bind(du, t.id, o, kini));
  const titik = [...Array(40)].map((_, i) => [t.lat + (i % 8) * 0.0005, t.lon + Math.floor(i / 8) * 0.0005, 80 + (i * 37) % 300, kini - HARI / 24]);
  st.push(...stmtBaris(env, "INSERT INTO ops_drone (unggah_id, tugas_id, lat, lon, suhu_c, waktu, dummy) SELECT ?, ?, json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), 1 FROM json_each(?)", [du, t.id], titik));
  const tm = [["DUM-001", 0.05, 0.05, -35], ["DUM-002", -0.05, 0.1, -62], ["DUM-003", 0.1, -0.05, 12], ["DUM-004", -0.1, -0.1, -48]].map(([s, a, b, v]) => [s, t.lat + a, t.lon + b, v, kini - 3 * HARI, "Contoh"]);
  st.push(...stmtBaris(env, "INSERT OR REPLACE INTO ops_tmat (stasiun, lat, lon, tmat_cm, waktu, sumber, diunggah, oleh, dummy) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), json_extract(value, '$[4]'), json_extract(value, '$[5]'), ?, ?, 1 FROM json_each(?)", [kini, o], tm));
  await env.DB.batch(st);
  return json({ok: true, tugas_id: t.id, tabel: TABEL_HAPUS}, 201);
}
async function dummy(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaJson(req, 1024); if (b.r) return b.r;
  if (b.o.aksi === "isi") return dummyIsi(env, kini, mod);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ================================================================ rute */
const RUTE_ASLI = {
  "GET /api/ops/tugas/:id": (env, req, url, kini, ctx, id) => petaOperasi(env, req, kini, id),
  "POST /api/ops/garis": (env, req, url, kini) => buatGaris(env, req, kini),
  "POST /api/ops/garis/:id": (env, req, url, kini, ctx, id) => ubahGaris(env, req, kini, id),
  "POST /api/ops/sumber_air": (env, req, url, kini) => buatSumber(env, req, kini),
  "POST /api/ops/sumber_air/:id": (env, req, url, kini, ctx, id) => ubahSumber(env, req, kini, id),
  "GET /api/ops/sumber_air": (env, req, url, kini) => daftarSumber(env, req, kini, url),
  "GET /api/ops/selang": (env, req, url, kini) => hitungSelang(env, req, kini, url),
  "POST /api/ops/periode": (env, req, url, kini) => buatPeriode(env, req, kini),
  "GET /api/ops/periode": (env, req, url, kini) => daftarPeriode(env, req, kini, url),
  "GET /api/ops/periode/:id": (env, req, url, kini, ctx, id) => periode(env, req, kini, id),
  "POST /api/ops/periode/:id": (env, req, url, kini, ctx, id) => ubahPeriode(env, req, kini, id),
  "POST /api/ops/permintaan": (env, req, url, kini) => buatPermintaan(env, req, kini),
  "GET /api/ops/permintaan": (env, req, url, kini) => daftarPermintaan(env, req, kini, url),
  "POST /api/ops/permintaan/:id": (env, req, url, kini, ctx, id) => ubahPermintaan(env, req, kini, id),
  "POST /api/ops/drop": (env, req, url, kini) => catatDrop(env, req, kini),
  "GET /api/ops/linimasa/:id": (env, req, url, kini, ctx, id) => linimasa(env, req, kini, id),
  "POST /api/ops/pelajaran": (env, req, url, kini) => buatPelajaran(env, req, kini),
  "POST /api/ops/patroli": (env, req, url, kini) => buatPatroli(env, req, kini),
  "GET /api/ops/patroli": (env, req, url, kini) => daftarPatroli(env, req, kini, url),
  "POST /api/ops/patroli/:id": (env, req, url, kini, ctx, id) => kunjungiPatroli(env, req, kini, id),
  "POST /api/ops/drone": (env, req, url, kini) => unggahDrone(env, req, kini),
  "POST /api/ops/tmat": (env, req, url, kini) => unggahTmat(env, req, kini),
  "GET /api/ops/tmat": (env, req, url, kini) => petaTmat(env, req, kini, url),
  "POST /api/ops/dummy": (env, req, url, kini) => dummy(env, req, kini),
};
/* tabel 0042 (atau 0029/0035 yang dibutuhkan) belum ada = 503 yang jelas, bukan 500 */
export const RUTE_OPS = Object.fromEntries(Object.entries(RUTE_ASLI).map(([kunci, f]) => [kunci, async (env, req, ...sisa) => {
  try { return await f(env, req, ...sisa); }
  catch (e) { if (/no such table: (ops_|tugas_api|instansi_)/i.test(String(e?.message || e))) return gagal(503, "operasi lapangan belum diaktifkan (migrasi 0042_operasi_lapangan belum diterapkan)"); throw e; }
}]));
