/* Paritas bencana PB-22: dokumen sitrep, renops, laporan per KIB, penunjuk renkon (F-8, F-9, F-10). data/kajian-bnpb/paritas-bencana/DESAIN-TEKNIS.md 3.3, 5, 6.2; KEAMANAN-PRIVASI.md 2, 6.
   Rakit = JSON dari data yang sudah ada (public/data/ringkas/<bencana>.json lewat ASSETS + hitungan D1 operasi lewat hak.js), disimpan sebagai draf di R2 MEDIA dokumen/draf/<id>.json.
   Bekukan = tulis sekali ke dokumen/<jenis>/<bencana>/<periode>/<prov>[-<kab>]/v<versi>.json (onlyIf etagDoesNotMatch "*": put kedua gagal 409). Versi beku tidak pernah ditimpa; perbaikan = rakit ulang (versi + 1).
   Hak: rakit = moderator atau staf pusdalops/koordalops; bekukan juga pimpinan (Q32); baca = akun gerbang, moderator, staf pusdalops/koordalops/pimpinan. Pemirsa dan instansi: tidak (Q31, matriks). Tanpa nama orang; angka antarsumber tidak dijumlah. */
import {json, gagal, adminOK, acak, sha} from "./worker.js";
import {modOK} from "./posko.js";
import {stafPeran, stafSesiSemua, dalamWilayahStaf} from "./staf.js";
import {tolak, teks} from "./operasi_isian.js";
import REGISTRY from "./bencana.generated.js";
import {rute, badan, lajuOK, lambat, bersih, RE_PRIBADI, wilayah, idBody} from "./pb_isian.js";
import {KODE_BENCANA} from "./logbook.js";
import {indukLogbook, pelakuPbTulis, pelakuPbBaca, pbDokById, pbDokDaftar, pbStmtDokRakit, pbDokBeku, pbStmtLog, pbKepatuhan, tanpaTabelPb, batchTulis} from "./hak.js";

const JENIS = ["sitrep", "renops", "laporan_kib", "renkon_peta"], FMT = {json: "application/json; charset=utf-8", pdf: "application/pdf"};
const PERAN_RAKIT = ["pusdalops", "koordalops"], PERAN_BEKU = [...PERAN_RAKIT, "pimpinan"], PERAN_BACA = [...PERAN_BEKU];
const RE_PERIODE = /^\d{4}(?:-\d{2}(?:-\d{2})?|-W\d{2})?$/, RE_HARI = /^\d{4}-\d{2}-\d{2}$/, MAKS_KALIMAT = 1500, MAKS_JSON = 2e6;
const TOLAK = "dokumen hanya untuk staf Pusdalops, koordalops, pimpinan, atau moderator";
const MIGRASI = "fitur dokumen belum diaktifkan (migrasi 0131_paritas_dokumen belum diterapkan)";
const kunciDraf = id => `dokumen/draf/${id}.json`;
const kunciBeku = (d, fmt) => `dokumen/${d.jenis}/${d.bencana}/${d.periode}/${d.prov}${d.kab ? "-" + d.kab : ""}/v${d.versi}.${fmt}`;
const str = (v, n = 300) => typeof v === "string" ? v.slice(0, n) : null;
const pilih = (v, daftar, nama) => typeof v === "string" && daftar.includes(v) ? v : tolak(`${nama} harus salah satu dari: ${daftar.join(", ")}`);

/* jenis dokumen yang dinyalakan registri untuk bencana (kemampuan.dokumen); saklar env.PB_REGISTRI {id: {dokumen: [...]}} menimpa (dipakai uji). Tak dikenal atau belum menyala = 404 */
function dokumenAktif(env, bencana, jenis) {
  const b = REGISTRY.bencana.find(x => x.id === bencana); if (!b) tolak("bencana tidak dikenal atau dokumennya belum menyala", 404);
  let d = b.kemampuan?.dokumen ?? [];
  if (env.PB_REGISTRI) { try { const o = JSON.parse(env.PB_REGISTRI)[bencana]; if (o?.dokumen) d = o.dokumen; } catch (e) { /* saklar rusak = abaikan */ } }
  if (!d.includes(jenis)) tolak("bencana tidak dikenal atau dokumennya belum menyala", 404);
}

/* penulis: {oleh} atau Response. Tamu ditolak SEBELUM body dibaca (gerbangTulis); wilayah baris diperiksa untuk staf. */
const gerbang = async (env, req, peran) => !await modOK(env, req) && !await stafPeran(env, req, peran) ? gagal(403, TOLAK) : null;
async function penulis(env, req, peran, prov) {
  const m = await modOK(env, req); if (m) return {oleh: "admin:" + m};
  const oleh = await stafPeran(env, req, peran); if (!oleh) return gagal(403, TOLAK);
  return dalamWilayahStaf(req, [prov]) ? {oleh} : gagal(403, "provinsi di luar wilayah akun Anda");
}
async function izinBaca(env, req, prov) {
  if (await adminOK(env, req)) return null;
  const s = await stafSesiSemua(env, req);
  if (!s || !(s.peran ?? []).some(r => PERAN_BACA.includes(r))) return gagal(403, TOLAK);
  return dalamWilayahStaf(req, [prov]) ? null : gagal(403, "provinsi di luar wilayah akun Anda");
}

/* ---- perakit: angka dari berkas ringkas + hitungan D1; nilai tak diketahui null, tidak pernah 0 atau "aman" ---- */
const angka = r => Object.entries(r.angka ?? {}).filter(([k]) => /^[a-z0-9_]{1,40}$/.test(k)).map(([k, v]) => {
  const m = r.angka_meta?.[k] ?? {};
  return {nama: k, nilai: Number.isFinite(v) ? v : null, satuan: str(m.satuan, 40), sumber: str(m.sumber, 40), waktu: str(m.waktu, 40), arti: str(m.arti)};
});
async function bacaRingkas(env, req, bencana) {
  try {
    const x = await env.ASSETS.fetch(new Request(new URL(`/data/ringkas/${bencana}.json`, req.url)));
    if (!x.ok) { x.body?.cancel().catch(() => {}); return null; }
    return await x.json();
  } catch (e) { return null; }
}
async function operasi(env, d) {
  if (!RE_HARI.test(d.periode)) return {angka: [], keterangan: "hitungan operasi hanya untuk periode harian; belum diisi"};
  try {
    const k = await pbKepatuhan(env, pelakuPbBaca, d.periode, d.periode, d.bencana, d.prov);
    const didatangi = k.rinci.reduce((a, x) => a + (x.didatangi === 1 ? x.n : 0), 0), s = "pb_renlap", w = d.periode;
    const a = (nama, nilai, satuan) => ({nama, nilai, satuan, sumber: s, waktu: w, arti: null});
    return {angka: [a("renlap_terbit", k.renlap, "renlap"), a("target_renlap", k.target, "target"), a("target_didatangi", didatangi, "target")]};
  } catch (e) { if (tanpaTabelPb(e)) return {angka: [], keterangan: "hitungan operasi belum tersedia"}; throw e; }
}
async function rakitIsi(env, req, d) {
  const r = await bacaRingkas(env, req, d.bencana), op = await operasi(env, d);
  const wil = (r?.tingkat?.wilayah ?? []).filter(x => x && x.prov === d.prov && (!d.kab || x.kab === d.kab)).map(x => ({prov: str(x.prov, 2), kab: str(x.kab, 4), tingkat: Number.isFinite(x.tingkat) ? x.tingkat : null, dasar: str(x.dasar, 40)}));
  const bagian = [{kunci: "situasi", judul: "Situasi dari sumber data", angka: r ? angka(r) : [], sumber: (r?.sumber ?? []).map(s => ({id: str(s.id, 40), umur_menit: Number.isFinite(s.umur_menit) ? s.umur_menit : null, status: str(s.status_sumber, 20)})),
    ...(r ? {} : {keterangan: "belum ada data ringkas untuk bencana ini"}), kalimat_staf: ""}];
  bagian.push({kunci: "operasi", judul: "Operasi lapangan", ...op, sumber: [], kalimat_staf: ""});
  if (d.jenis === "renops") bagian.push({kunci: "perka_24_2010", judul: "Butir kerangka Perka BNPB 24/2010", angka: [], sumber: [], keterangan: "belum diisi [perlu cek]: butir lampiran tidak diisi mesin", kalimat_staf: ""});   // Q9: isi lampiran belum dipastikan
  if (d.jenis === "laporan_kib") bagian.push({kunci: "kejadian", judul: "Kejadian", kib: d.kib, angka: [], sumber: [], keterangan: "kronologi belum tersedia untuk jenis ini", kalimat_staf: ""});
  if (d.jenis === "renkon_peta") bagian.push({kunci: "penunjuk", judul: "Penunjuk ke renkon di Siklus Bencana", angka: [], sumber: [], penunjuk: "/siklus", kalimat_staf: ""});   // isi renkon tetap di /siklus (D10)
  bagian.push({kunci: "ringkasan", judul: "Ringkasan (ditulis staf)", angka: [], sumber: [], kalimat_staf: ""}, {kunci: "kebijakan", judul: "Kalimat kebijakan (ditulis staf)", angka: [], sumber: [], kalimat_staf: ""});
  return {skema: 1, jenis: d.jenis, bencana: d.bencana, prov: d.prov, kab: d.kab, ...(d.kib ? {kib: d.kib} : {}), periode: d.periode, dibuat: new Date().toISOString(),
    data_dibuat: str(r?.dibuat, 40), basi: r ? r.basi === true : null, tingkat: {nasional: Number.isFinite(r?.tingkat?.nasional) ? r.tingkat.nasional : null, wilayah: wil},
    prospektif: r?.prospektif ? {n: r.prospektif.n ?? null, hit: r.prospektif.hit ?? null, far: r.prospektif.far ?? null, hipotesis: r.prospektif.hipotesis ?? null} : null, bagian};
}
/* nomor telepon dan NIK di mana pun di JSON = 422; KIB 16 digit sah dikeluarkan dulu supaya tidak terbaca NIK */
const pribadi = (dok, kib) => RE_PRIBADI.test(kib ? JSON.stringify(dok).split(kib).join("") : JSON.stringify(dok));

/* KIB sah = pola Logbook (src/logbook.js kibAwal: PPKK KKK YYYYMMDD I, KKK dari KODE_BENCANA) DAN ada di logbook_kib untuk provinsi yang sama (lewat UNIQUE kib, tanpa SCAN).
   Hanya nilai yang lolos ini yang dikecualikan dari pemindai NIK; NIK 16 digit sembarang = 400. */
async function kibSah(env, kib, w) {
  const m = /^(\d{4})(\d{3})(\d{4})(\d{2})(\d{2})[1-9]$/.exec(kib), tgl = m && `${m[3]}-${m[4]}-${m[5]}`;
  if (!m || !Object.values(KODE_BENCANA).includes(m[2]) || !m[1].startsWith(w.prov) || (w.kab && w.kab !== m[1]) || !(Date.parse(tgl) >= 0 && new Date(tgl).toISOString().slice(0, 10) === tgl)) tolak("kib bukan KIB yang sah (PPKK KKK YYYYMMDD I)");
  let k = null; try { k = await indukLogbook(env, kib); } catch (e) { if (!/no such table/i.test(String(e?.message))) throw e; }
  if (!k || k.prov !== w.prov) tolak("kib tidak ditemukan di Logbook untuk provinsi ini");
}

const rakit = rute(async (env, req, url, kini) => {
  const tamu = await gerbang(env, req, PERAN_RAKIT); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const jenis = pilih(o.jenis, JENIS, "jenis"), bencana = typeof o.bencana === "string" ? o.bencana : "";
  dokumenAktif(env, bencana, jenis);
  const w = wilayah(o), periode = typeof o.periode === "string" && RE_PERIODE.test(o.periode) ? o.periode : tolak("periode harus YYYY, YYYY-MM, YYYY-MM-DD, atau YYYY-Www");
  if (RE_HARI.test(periode) && !(Date.parse(periode) >= 0 && new Date(periode).toISOString().slice(0, 10) === periode)) tolak("periode bukan tanggal yang sah");
  const kib = o.kib == null || o.kib === "" ? null : typeof o.kib === "string" ? o.kib : tolak("kib harus teks");
  if (jenis === "laporan_kib" ? !kib : kib) tolak(jenis === "laporan_kib" ? "kib wajib untuk laporan_kib" : "kib hanya untuk laporan_kib");
  if (kib) await kibSah(env, kib, w);
  const p = await penulis(env, req, PERAN_RAKIT, w.prov); if (p instanceof Response) return p;
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  if (!await lajuOK(env, p.oleh, kini)) return lambat();
  const d = {id: acak(8), jenis, bencana, ...w, kib, periode}, dok = await rakitIsi(env, req, d);
  if (pribadi(dok, kib)) return gagal(422, "isi dokumen memuat nomor telepon atau NIK; dokumen tanpa data pribadi");
  const isi = JSON.stringify(dok);
  if (new TextEncoder().encode(isi).length > MAKS_JSON) return gagal(413, "dokumen terlalu besar");
  if (!await env.MEDIA.put(kunciDraf(d.id), isi, {onlyIf: {etagDoesNotMatch: "*"}, httpMetadata: {contentType: FMT.json}})) return gagal(409, "draf bentrok; coba lagi");
  let baru;
  try { baru = await pbStmtDokRakit(env, pelakuPbTulis, d, p.oleh, kini).run(); }
  catch (e) { if (/UNIQUE|CHECK/i.test(String(e?.message))) return gagal(409, "versi dokumen bentrok atau penuh; coba lagi"); throw e; }
  if (!baru.meta.changes) return gagal(409, "dokumen tidak dapat dirakit");
  const row = await pbDokById(env, pelakuPbBaca, d.id);
  await batchTulis(env, [pbStmtLog(env, pelakuPbTulis, kini, p.oleh, "pb_dokumen", d.id, "isi", null, {jenis, bencana, ...w, periode, versi: row.versi})]);
  return json({id: d.id, versi: row.versi, status: "draf", dokumen: dok}, 201);
});

/* isi kalimat staf: bagian "ringkasan" dan "kebijakan" saja; teks lain ditolak 400; tiap kalimat <= 1500, tanpa tautan atau nomor (bersih) */
function kalimat(o) {
  const k = o.kalimat ?? {};
  if (typeof k !== "object" || Array.isArray(k) || k === null) tolak("kalimat harus objek {ringkasan, kebijakan}");
  for (const n of Object.keys(k)) if (!["ringkasan", "kebijakan"].includes(n)) tolak("kalimat hanya untuk ringkasan dan kebijakan");
  const h = {};
  for (const n of ["ringkasan", "kebijakan"]) {
    if (k[n] == null) continue;
    if (typeof k[n] !== "string" || teks(k[n], 1e5).length > MAKS_KALIMAT) tolak(`kalimat ${n} harus teks maksimal ${MAKS_KALIMAT} karakter`);
    h[n] = bersih(k[n], MAKS_KALIMAT);
  }
  return h;
}
const bekukan = rute(async (env, req, url, kini) => {
  const tamu = await gerbang(env, req, PERAN_BEKU); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const id = idBody(o), d = await pbDokById(env, pelakuPbBaca, id); if (!d) return gagal(404, "dokumen tidak ditemukan");
  dokumenAktif(env, d.bencana, d.jenis);
  const p = await penulis(env, req, PERAN_BEKU, d.prov); if (p instanceof Response) return p;
  const k = kalimat(o);
  if (d.status !== "draf") return gagal(409, "hanya dokumen berstatus draf yang dapat dibekukan");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  if (!await lajuOK(env, p.oleh, kini)) return lambat();
  const asal = await env.MEDIA.get(kunciDraf(id)); if (!asal) return gagal(409, "draf tidak ada di penyimpanan");
  const dok = JSON.parse(await asal.text());
  for (const b of dok.bagian) if (Object.hasOwn(k, b.kunci)) b.kalimat_staf = k[b.kunci];
  dok.versi = d.versi; dok.dibekukan = new Date(kini).toISOString();
  if (pribadi(dok, d.kib)) return gagal(422, "isi dokumen memuat nomor telepon atau NIK; dokumen tanpa data pribadi");
  const isi = JSON.stringify(dok), ukuran = new TextEncoder().encode(isi).length;
  // tulis sekali: pemenang dua bekukan bersamaan ditentukan R2 (put kedua null = 409). ponytail: bila UPDATE D1 gagal sesudah put, berkas yatim menahan versi itu; rakit ulang (versi + 1).
  if (!await env.MEDIA.put(kunciBeku(d, "json"), isi, {onlyIf: {etagDoesNotMatch: "*"}, httpMetadata: {contentType: FMT.json}, customMetadata: {dibuat: String(kini)}})) return gagal(409, "versi ini sudah beku dan tidak ditimpa");
  if (!await pbDokBeku(env, pelakuPbTulis, id, ukuran, await sha(isi), kini)) return gagal(409, "dokumen sudah dibekukan");
  await batchTulis(env, [pbStmtLog(env, pelakuPbTulis, kini, p.oleh, "pb_dokumen", id, "terbit", {status: "draf"}, {status: "beku", versi: d.versi, ukuran})]);
  return json({id, versi: d.versi, status: "beku", ukuran});
});

const daftar = rute(async (env, req, url) => {
  const q = url.searchParams, bencana = q.get("bencana") ?? "", prov = q.get("prov") ?? "", periode = q.get("periode") ?? "";
  const t = await izinBaca(env, req, /^\d{2}$/.test(prov) ? prov : "00"); if (t) return t;   // hak dulu: tamu 403 seragam; staf berwilayah wajib menyebut provinsinya
  const jenis = pilih(q.get("jenis"), JENIS, "jenis");
  if (bencana && !REGISTRY.bencana.some(x => x.id === bencana)) tolak("bencana tidak dikenal", 404);
  if (prov) wilayah({prov});
  if (periode && !RE_PERIODE.test(periode)) tolak("periode harus YYYY, YYYY-MM, YYYY-MM-DD, atau YYYY-Www");
  try { return json({tersedia: true, dokumen: await pbDokDaftar(env, pelakuPbBaca, jenis, bencana, periode || "", periode || "~", prov)}); }
  catch (e) { if (tanpaTabelPb(e)) return json({tersedia: false, dokumen: []}); throw e; }
});

const berkas = rute(async (env, req, url) => {
  const q = url.searchParams, id = q.get("id") ?? "", fmt = q.get("fmt") ?? "";
  if (!/^[0-9a-f]{16}$/.test(id)) tolak("id harus 16 heks");
  if (!Object.hasOwn(FMT, fmt)) tolak(`fmt harus salah satu dari: ${Object.keys(FMT).join(", ")}`);
  const d = await pbDokById(env, pelakuPbBaca, id); if (!d) return await izinBaca(env, req, "00") ?? gagal(404, "dokumen tidak ditemukan");   // tamu: 403 seragam, ada atau tidak
  const t = await izinBaca(env, req, d.prov); if (t) return t;
  if (d.status !== "beku") return gagal(409, "dokumen belum beku");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(kunciBeku(d, fmt)); if (!o) return gagal(404, "berkas tidak ada");
  return new Response(o.body, {headers: {"content-type": FMT[fmt], "content-disposition": `attachment; filename="${d.jenis}-${d.bencana}-${d.periode}-v${d.versi}.${fmt}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox"}});
});

/* digabung ke RUTE di src/worker.js; nama jalur tanpa garis bawah (gerbang cakupan) */
export const RUTE_PB_DOK = {
  "POST /api/pb/dokumen/rakit": rakit,
  "POST /api/pb/dokumen/bekukan": bekukan,
  "GET /api/pb/dokumen": daftar,
  "GET /api/pb/dokumen/berkas": berkas,
};
