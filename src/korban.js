/* Laporan korban jiwa (meninggal, luka berat, hilang). Skema: migrations/0034_korban_p3k.sql. Aturan pemilik (21 Okt 2026):
   - Pelapor: akun instansi AKTIF (wilayah cakupannya), staf berperan pusdalops, atau moderator ke atas. Satu rute lapor (POST /api/korban/lapor); kiriman instansi dan staf wajib x-pb: 1.
   - PRIVASI: nama korban OPSIONAL dan hanya dibaca moderator ke atas dan staf pusdalops (pelapor instansi pun tidak melihatnya lagi sesudah kirim). Tidak pernah ada di rute publik,
     butir Meja Pantau, korbanHari/teks WA, slide, atau korban_jejak. Foto dokumen mengikuti aturan yang sama (R2 korban/foto/<id>, bersihMedia).
   - Status: dilaporkan -> terverifikasi (pusdalops, verifikator, moderator) -> dikoreksi. Koreksi menimpa angka di baris dan menyimpan nilai SEBELUMNYA di korban_jejak (append-only). Korban nyata tidak dihapus.
   - Tiap laporan yang belum terverifikasi menjadi butir Meja Pantau berprioritas 0 (tertinggi) untuk pusdalops dan koordalops (butirKorban, dipanggil src/pantau.js), dan hilang saat diverifikasi.
   - Agregat laporan harian: korbanHari(env, tanggal_data) mengembalikan angka saja (tanpa nama), dihitung per hari WIB kejadian.
   - Tanpa migrasi 0034 semua rute menjawab 503 sopan dan butir Meja Pantau diam.
   - Kirim ulang aman: klien membuat klien_id acak per form (disimpan sampai sukses); pelapor + klien_id sama = laporan yang sama (200, duplikat true), diperkuat indeks unik. Dua laporan BERBEDA dengan angka sama tersimpan dua.
   - Foto dokumen: unggah ulang ditolak (409) bagi pelapor instansi sesudah laporan terverifikasi; moderator dan pusdalops boleh. Tiap unggah dan hapus foto tercatat di korban_jejak (foto, foto_hapus); hapus foto hanya moderator.
   ponytail: batas laju baca-lalu-tulis (laju_bnpb). */
import {json, gagal, acak, bacaBody, bacaBytes} from "./worker.js";
import {tx, num, modOK, superOK} from "./posko.js";
import {laju} from "./bnpb.js";
import {jenisBerkas} from "./foto.js";
import {bersihMedia} from "./media_bersih.js";
import {modAtauStaf, stafSesi, dalamWilayahStaf, stafNyata, P_VALIDASI} from "./staf.js";
import {akunAktif, tugasDalam, PROV, RUTE_INSTANSI, durasi} from "./instansi.js";
import {halamanKorban, HALAMAN_STAF} from "./admin_halaman.js";
import {halamanAdmin} from "./statistik.js";

const JAM = 36e5, HARI = 24 * JAM, MAKS_FOTO = 2 * 1048576, JENDELA_LAPOR = 60 * HARI, RE_KLIEN = /^[0-9A-Za-z_-]{8,64}$/;
/* daftar tetap: sama dengan CHECK di 0034 dan public/instansi_korban.js, public/admin/korban.js (dijaga korban.test.mjs) */
export const BENCANA = {karhutla: "Karhutla", banjir: "Banjir, longsor, dan rob", gempa: "Gempa dan tsunami", cuaca: "Cuaca ekstrem", udara: "Kualitas udara", gunungapi: "Letusan gunung api", kekeringan: "Kekeringan", lainnya: "Lainnya"};
export const KATEGORI = {warga: "Warga", petugas_pemadam: "Petugas pemadam", relawan: "Relawan", lainnya: "Lainnya"};
export const PENYEBAB = {terbakar: "Terbakar", asap_ispa: "Asap atau ISPA", tenggelam: "Tenggelam", kecelakaan_tugas: "Kecelakaan saat bertugas", lainnya: "Lainnya"};
export const SUMBER = {laporan_langsung: "Laporan langsung", rs: "Rumah sakit", kepolisian: "Kepolisian"};
export const STATUS = ["dilaporkan", "terverifikasi", "dikoreksi"];
const PERAN_LIHAT = ["pusdalops", "verifikator", "koordalops", "pimpinan"], P_NAMA = ["pusdalops"];
const RE_ID = /^[0-9a-f]{16}$/;
const ada = (o, k) => Object.hasOwn(o, k);
export const tanpaTabelKorban = e => /no such table: korban/i.test(String(e?.message || e));
const KAMUS = () => ({bencana: BENCANA, kategori: KATEGORI, penyebab: PENYEBAB, sumber: SUMBER, status: STATUS});
const nTak = () => gagal(404, "tidak ada");
const bungkus = f => async (env, req, ...sisa) => {
  try { return await f(env, req, ...sisa); }
  catch (e) { if (tanpaTabelKorban(e)) return gagal(503, "laporan korban belum diaktifkan (migrasi 0034_korban_p3k belum diterapkan)"); throw e; }
};

/* ================================================================ murni: validasi dan teks */
/* kolom yang bisa dilaporkan dan dikoreksi (lokasi dan pelapor tetap). `lama` = baris untuk koreksi sebagian. {g} galat atau {v}. */
export function cekKorban(o, lama = null, kini = Date.now()) {
  const f = k => ada(o, k) ? o[k] : lama?.[k];
  let w = f("waktu_kejadian"); if (typeof w === "string" && w) w = Date.parse(w); w = num(w, 1, 1e14, true);
  if (w == null || Number.isNaN(w)) return {g: "waktu kejadian wajib (waktu sah, epoch milidetik atau teks ISO)"};
  if (w !== lama?.waktu_kejadian && (w > kini + 5 * 60e3 || w < kini - JENDELA_LAPOR)) return {g: "waktu kejadian tidak boleh di masa depan atau lebih dari 60 hari lalu"};
  const bencana = f("bencana") ?? "karhutla"; if (!Object.hasOwn(BENCANA, bencana)) return {g: `bencana harus ${Object.keys(BENCANA).join("/")}`};
  const n = {}; for (const k of ["meninggal", "luka_berat", "hilang"]) { n[k] = num(f(k) ?? 0, 0, 100000, true); if (Number.isNaN(n[k])) return {g: `${k.replace("_", " ")} harus bilangan bulat 0 sampai 100000`}; n[k] ??= 0; }
  if (n.meninggal + n.luka_berat + n.hilang < 1) return {g: "isi minimal satu korban: meninggal, luka berat, atau hilang"};
  const kategori = f("kategori"); if (!Object.hasOwn(KATEGORI, kategori)) return {g: `kategori korban harus ${Object.keys(KATEGORI).join("/")}`};
  const penyebab = f("penyebab"); if (!Object.hasOwn(PENYEBAB, penyebab)) return {g: `penyebab harus ${Object.keys(PENYEBAB).join("/")}`};
  const sumber = f("sumber") ?? "laporan_langsung"; if (!Object.hasOwn(SUMBER, sumber)) return {g: `sumber harus ${Object.keys(SUMBER).join("/")}`};
  const kronologi = tx(f("kronologi"), 600); if (kronologi === undefined) return {g: "kronologi maksimal 600 karakter"};
  const nama = tx(f("nama_korban"), 300); if (nama === undefined) return {g: "nama korban maksimal 300 karakter"};
  return {v: {waktu_kejadian: w, bencana, ...n, kategori, penyebab, sumber, kronologi, nama_korban: nama}};
}
/* "2 meninggal, 1 luka berat, 3 hilang": hanya angka (tidak pernah nama); null bila semuanya nol */
export const teksKorban = a => [[a.meninggal, "meninggal"], [a.luka_berat, "luka berat"], [a.hilang, "hilang"]].filter(([n]) => n > 0).map(([n, l]) => `${n} ${l}`).join(", ") || null;

/* ================================================================ pelaku */
/* pelapor: admin (modOK), staf pusdalops, atau akun instansi aktif; {tipe, oleh, akun, dummy, kunci} atau Response galat */
async function pelapor(env, req, kini) {
  const mod = await modOK(env, req);
  if (mod) return {tipe: "admin", oleh: "admin:" + mod, akun: null, dummy: 0, kunci: "admin:" + mod, mod: true};
  const s = await stafSesi(env, req, kini);
  if (s) return s.peran.some(p => P_NAMA.includes(p)) ? {tipe: "staf", oleh: "staf:" + s.id, akun: null, dummy: s.dummy ? 1 : 0, kunci: "staf:" + s.id, mod: false}
    : gagal(403, "melaporkan korban hanya untuk staf Pusdalops, moderator, atau akun instansi aktif");
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (req.headers.get("x-pb") !== "1") return gagal(403, "kiriman instansi wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman /instansi)");
  return {tipe: "instansi", oleh: "instansi:" + a.id, akun: a, dummy: a.dummy ? 1 : 0, kunci: a.id, mod: false};
}
const pelihat = (env, req) => modAtauStaf(env, req, PERAN_LIHAT);
async function bolehNama(env, req) { if (await modOK(env, req)) return true; const s = await stafSesi(env, req); return !!s && s.peran.some(p => P_NAMA.includes(p)); }
const pemeriksa = (env, req) => modAtauStaf(env, req, P_VALIDASI);
const tolakMod = () => gagal(403, "fitur ini hanya untuk moderator ke atas atau staf berperan (bukan akun gerbang situs)");

/* lokasi: tugas api terkait (provinsi, kabupaten, koordinat dari tugas) ATAU provinsi + koordinat GPS opsional. {v} atau {r: Response} */
async function lokasi(env, o, p, req) {
  if (o.tugas_id != null && o.tugas_id !== "") {
    if (typeof o.tugas_id !== "string" || !RE_ID.test(o.tugas_id)) return {r: gagal(400, "tugas_id tidak sah")};
    const t = p.akun ? await tugasDalam(env, p.akun, o.tugas_id) : await env.DB.prepare("SELECT id, prov, kab, lat, lon, dummy FROM tugas_api WHERE id = ?").bind(o.tugas_id).first();
    if (t instanceof Response) return {r: t}; if (!t) return {r: gagal(404, "tugas api tidak ada")};
    if (p.tipe === "staf" && !dalamWilayahStaf(req, [t.prov])) return {r: nTak()};
    return {v: {tugas_id: t.id, prov: t.prov, kab: t.kab ?? null, lat: t.lat, lon: t.lon, sumber_lokasi: "tugas"}};
  }
  const cak = p.akun ? (() => { try { return JSON.parse(p.akun.cakupan) || []; } catch (e) { return []; } })() : null;
  const prov = typeof o.prov === "string" ? o.prov : cak?.length === 1 ? cak[0] : null;
  if (!prov || !PROV[prov]) return {r: gagal(400, "provinsi wajib (kode 2 digit) bila tidak memilih tugas api")};
  if (cak && !cak.includes(prov)) return {r: gagal(400, `provinsi harus salah satu cakupan akun (${cak.join(", ")})`)};
  if (p.tipe === "staf" && !dalamWilayahStaf(req, [prov])) return {r: gagal(403, "provinsi di luar wilayah staf")};
  const kab = p.akun?.tingkat === "kab" ? p.akun.kab : tx(o.kab, 60); if (kab === undefined || (kab && kab.length < 2)) return {r: gagal(400, "kabupaten 2 sampai 60 karakter")};
  const lat = num(o.lat, -11.5, 6.5), lon = num(o.lon, 94.5, 141.5);
  if (Number.isNaN(lat) || Number.isNaN(lon) || (lat == null) !== (lon == null)) return {r: gagal(400, "koordinat harus berpasangan (lintang -11,5 sampai 6,5; bujur 94,5 sampai 141,5) atau dikosongkan")};
  return {v: {tugas_id: null, prov, kab: kab || null, lat, lon, sumber_lokasi: lat != null && o.sumber_lokasi === "gps" ? "gps" : "manual"}};
}

/* ================================================================ bentuk keluaran */
/* tanpa nama: dipakai pelapor instansi dan peran yang tak boleh melihat nama. ada_nama = nama tercatat atau tidak (bukan isinya). */
const bentuk = (r, nama) => ({id: r.id, waktu_kejadian: r.waktu_kejadian, prov: r.prov, prov_nama: PROV[r.prov]?.[1] ?? r.prov, kab: r.kab, lat: r.lat, lon: r.lon, sumber_lokasi: r.sumber_lokasi, tugas_id: r.tugas_id,
  bencana: r.bencana, meninggal: r.meninggal, luka_berat: r.luka_berat, hilang: r.hilang, kategori: r.kategori, penyebab: r.penyebab, kronologi: r.kronologi, sumber: r.sumber,
  ada_nama: !!r.nama_korban, foto: !!r.foto, status: r.status, diverifikasi_pada: r.diverifikasi_pada, dibuat: r.dibuat, diubah: r.diubah, dummy: r.dummy,
  ...(nama ? {nama_korban: r.nama_korban} : {})});
const angkaJejak = v => JSON.stringify({meninggal: v.meninggal, luka_berat: v.luka_berat, hilang: v.hilang, kategori: v.kategori, penyebab: v.penyebab, bencana: v.bencana});
const jejak = (env, oleh, id, aksi, dari, ke, alasan, kini, dummy, syarat = "1", ikat = []) =>
  env.DB.prepare("INSERT INTO korban_jejak (waktu, oleh, korban_id, aksi, dari, ke, alasan, dummy) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE " + syarat)
    .bind(kini, oleh, id, aksi, dari == null ? null : String(dari).slice(0, 800), ke == null ? null : String(ke).slice(0, 800), alasan ?? null, dummy ? 1 : 0, ...ikat);

/* ================================================================ lapor */
async function lapor(env, req, url, kini) {
  const p = await pelapor(env, req, kini); if (p instanceof Response) return p;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekKorban(b.o, null, kini); if (c.g) return gagal(400, c.g);
  const L = await lokasi(env, b.o, p, req); if (L.r) return L.r;
  const v = {...c.v, ...L.v}, klien = b.o.klien_id ?? null;
  if (klien !== null && (typeof klien !== "string" || !RE_KLIEN.test(klien))) return gagal(400, "klien_id harus 8 sampai 64 huruf, angka, strip, atau garis bawah");
  /* kirim ulang: pelapor + klien_id yang sama dijawab dengan laporan yang sudah ada (bukan kecocokan isi: dua laporan berbeda berangka sama tetap dua) */
  const cari = () => klien ? env.DB.prepare("SELECT id FROM korban WHERE oleh = ? AND klien_id = ?").bind(p.oleh, klien).first() : null;
  const dup = await cari(); if (dup) return json({id: dup.id, duplikat: true});
  const lj = await laju(env, p.kunci, "korban.tulis", [[JAM, 30]], kini); if (lj) return lj;
  const id = acak(8);
  try { await env.DB.batch([env.DB.prepare(`INSERT INTO korban (id, akun_id, oleh, klien_id, waktu_kejadian, prov, kab, lat, lon, sumber_lokasi, tugas_id, bencana, meninggal, luka_berat, hilang, kategori, penyebab, kronologi, sumber, nama_korban, status, dibuat, diubah, dummy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dilaporkan', ?, ?, ?)`)
    .bind(id, p.akun?.id ?? null, p.oleh, klien, v.waktu_kejadian, v.prov, v.kab, v.lat, v.lon, v.sumber_lokasi, v.tugas_id, v.bencana, v.meninggal, v.luka_berat, v.hilang, v.kategori, v.penyebab, v.kronologi, v.sumber, v.nama_korban, kini, kini, p.dummy),
    jejak(env, p.oleh, id, "lapor", null, angkaJejak(v), null, kini, p.dummy)]); }
  catch (e) { if (klien && /UNIQUE/i.test(String(e?.message || e))) { const d2 = await cari(); if (d2) return json({id: d2.id, duplikat: true}); } throw e; }   // dua kirim serentak: yang kalah mengembalikan yang menang
  return json({id}, 201);
}
async function daftarMilik(env, req, url, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const R = (await env.DB.prepare("SELECT * FROM korban WHERE akun_id = ? ORDER BY waktu_kejadian DESC LIMIT 200").bind(a.id).all()).results;
  let cak = []; try { cak = JSON.parse(a.cakupan) || []; } catch (e) { /* cakupan rusak: tanpa pilihan provinsi */ }
  return json({kini, kamus: KAMUS(), prov: cak.map(k => ({kode: k, nama: PROV[k]?.[1] ?? k})), tingkat: a.tingkat, kab: a.kab, korban: R.map(r => bentuk(r, false))});
}

/* ================================================================ foto dokumen (opsional): R2 korban/foto/<id>, EXIF dibuang */
async function unggahFoto(env, req, url, kini, ctx, id) {
  const p = await pelapor(env, req, kini); if (p instanceof Response) return p;
  const k = await env.DB.prepare("SELECT id, oleh, prov, dummy, status, foto FROM korban WHERE id = ?").bind(id).first();
  if (!k || (p.tipe === "instansi" ? k.oleh !== p.oleh : !(p.mod || k.oleh === p.oleh || dalamWilayahStaf(req, [k.prov])))) return nTak();
  if (k.status === "terverifikasi" && p.tipe === "instansi") return gagal(409, "laporan sudah terverifikasi; dokumen hanya bisa diganti Pusdalops atau moderator");
  if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum aktif (R2 MEDIA)");
  const lj = await laju(env, p.kunci, "korban.foto", [[JAM, 20]], kini); if (lj) return lj;
  if (!(Number(req.headers.get("content-length")) > 0)) return gagal(411, "Content-Length wajib pada unggahan");
  const u = await bacaBytes(req, MAKS_FOTO); if (u.galat) return gagal(u.status || 400, u.galat);
  const mime = jenisBerkas(u.b); if (mime !== "image/jpeg" && mime !== "image/webp") return gagal(400, "foto dokumen harus JPEG atau WebP");
  const bersih = bersihMedia(mime, u.b); if (!bersih) return gagal(400, "struktur gambar tidak sah");
  await env.MEDIA.put(`korban/foto/${id}`, bersih, {httpMetadata: {contentType: mime}});
  try { await env.DB.batch([env.DB.prepare("UPDATE korban SET foto = 1 WHERE id = ?").bind(id), jejak(env, p.oleh, id, "foto", k.foto ? "ada" : "tidak ada", "ada", k.foto ? "diganti" : "diunggah", kini, k.dummy)]); } catch (e) { await env.MEDIA.delete(`korban/foto/${id}`); throw e; }
  return json({foto: true});
}
async function lihatFoto(env, req, url, kini, ctx, id) {
  if (!await pelihat(env, req)) return tolakMod();
  if (!await bolehNama(env, req)) return gagal(403, "dokumen korban hanya untuk moderator dan staf Pusdalops");
  const k = await env.DB.prepare("SELECT prov, dummy, foto FROM korban WHERE id = ?").bind(id).first();
  if (!k || !k.foto || !dalamWilayahStaf(req, [k.prov]) || (stafNyata(req) && k.dummy)) return nTak();
  const o = env.MEDIA ? await env.MEDIA.get(`korban/foto/${id}`) : null;
  return o ? new Response(o.body, {headers: {"content-type": o.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox; default-src 'none'"}}) : nTak();
}

/* ================================================================ admin dan staf: daftar, rekap, verifikasi, koreksi */
async function bacaAdmin(env, req, url, kini) {
  if (!await pelihat(env, req)) return tolakMod();
  const prov = url.searchParams.get("prov") || "", status = url.searchParams.get("status") || "";
  if (prov && !/^\d{2}$/.test(prov)) return gagal(400, "prov harus kode 2 digit"); if (status && !STATUS.includes(status)) return gagal(400, `status harus ${STATUS.join("/")}`);
  const nama = await bolehNama(env, req), nyata = stafNyata(req);
  /* wilayah staf di WHERE (sebelum LIMIT): provinsi yang boleh dihitung dari dalamWilayahStaf; staf nasional dan admin tanpa klausa */
  const boleh = Object.keys(PROV).filter(k => dalamWilayahStaf(req, [k])), batasi = boleh.length < Object.keys(PROV).length;
  const ikat = [prov, status].filter(Boolean), nProv = prov ? 1 : 0, nStatus = status ? nProv + 1 : 0, nWil = ikat.length + 1;
  const R = (await env.DB.prepare(`SELECT k.*, a.wilayah pelapor_wilayah FROM korban k LEFT JOIN instansi_akun a ON a.id = k.akun_id WHERE 1 = 1 ${nyata ? "AND k.dummy = 0" : ""} ${prov ? "AND k.prov = ?1" : ""} ${status ? `AND k.status = ?${nStatus}` : ""}
    ${batasi ? `AND k.prov IN (SELECT value FROM json_each(?${nWil}))` : ""} ORDER BY k.waktu_kejadian DESC LIMIT 1000`).bind(...ikat, ...(batasi ? [JSON.stringify(boleh)] : [])).all()).results;
  const per = new Map(), total = {laporan: 0, meninggal: 0, luka_berat: 0, hilang: 0, belum_diverifikasi: 0};
  for (const r of R) {
    const p = per.get(r.prov) || per.set(r.prov, {prov: r.prov, nama: PROV[r.prov]?.[1] ?? r.prov, laporan: 0, meninggal: 0, luka_berat: 0, hilang: 0, belum_diverifikasi: 0}).get(r.prov), belum = r.status === "terverifikasi" ? 0 : 1;
    for (const t of [p, total]) { t.laporan++; t.meninggal += r.meninggal; t.luka_berat += r.luka_berat; t.hilang += r.hilang; t.belum_diverifikasi += belum; }
  }
  const periksa = !!await pemeriksa(env, req), bisaLapor = !!await laporAdmin(env, req);
  return json({kini, super: !!await superOK(env, req), kamus: KAMUS(), boleh: {nama, periksa, lapor: bisaLapor, moderator: !!await modOK(env, req)}, total, rekap: [...per.values()].sort((x, y) => x.prov.localeCompare(y.prov)),
    provinsi: Object.fromEntries(Object.entries(PROV).map(([k, v]) => [k, v[1]])),
    korban: R.map(r => ({...bentuk(r, nama), pelapor: r.pelapor_wilayah ?? (r.oleh.startsWith("staf:") ? "Staf Pusdalops" : "Admin")}))});
}
/* staf/admin yang boleh MELAPOR dari halaman admin: moderator atau staf pusdalops */
async function laporAdmin(env, req) { return (await modOK(env, req)) || await bolehNama(env, req); }
async function rincianJejak(env, req, url, kini, ctx, id) {
  if (!await pelihat(env, req)) return tolakMod();
  const k = await env.DB.prepare("SELECT prov, dummy FROM korban WHERE id = ?").bind(id).first();
  if (!k || !dalamWilayahStaf(req, [k.prov]) || (stafNyata(req) && k.dummy)) return nTak();
  const J = (await env.DB.prepare("SELECT waktu, oleh, aksi, dari, ke, alasan FROM korban_jejak WHERE korban_id = ? ORDER BY id DESC LIMIT 100").bind(id).all()).results;
  return json({jejak: J.map(j => ({...j, oleh: j.oleh.startsWith("staf:") ? "staf" : j.oleh.startsWith("instansi:") ? "instansi" : j.oleh.startsWith("admin:") ? "admin" : j.oleh}))});
}
const BIDANG = ["waktu_kejadian", "bencana", "meninggal", "luka_berat", "hilang", "kategori", "penyebab", "sumber", "kronologi"];
const ringkas = v => typeof v === "string" ? v.slice(0, 150) : v;
async function ubah(env, req, url, kini, ctx, id) {
  const pm = await pemeriksa(env, req); if (!pm) return tolakMod();
  const oleh = String(pm).startsWith("staf:") ? pm : "admin:" + pm;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const k = await env.DB.prepare("SELECT * FROM korban WHERE id = ?").bind(id).first();
  if (!k || !dalamWilayahStaf(req, [k.prov]) || (stafNyata(req) && k.dummy)) return nTak();
  const aksi = b.o.aksi; if (aksi !== "verifikasi" && aksi !== "koreksi" && aksi !== "hapus_foto") return gagal(400, "aksi harus verifikasi/koreksi/hapus_foto");
  const lj = await laju(env, oleh, "korban.ubah", [[JAM, 120]], kini); if (lj) return lj;
  if (aksi === "hapus_foto") {   // hanya moderator ke atas; berkas R2 dihapus, jejaknya tetap
    if (!await modOK(env, req)) return gagal(403, "hapus foto dokumen hanya untuk moderator");
    if (!k.foto) return gagal(409, "laporan ini tidak punya foto dokumen");
    const alasan = tx(b.o.alasan, 300); if (!alasan || alasan.length < 3) return gagal(400, "alasan hapus foto wajib (3 sampai 300 karakter)");
    await env.DB.batch([env.DB.prepare("UPDATE korban SET foto = 0 WHERE id = ?").bind(id), jejak(env, oleh, id, "foto_hapus", "ada", "tidak ada", alasan, kini, k.dummy)]);
    if (env.MEDIA) await env.MEDIA.delete(`korban/foto/${id}`);
    return json({id, foto: false});
  }
  const kunci = "status = ? AND diubah = ?";
  if (aksi === "verifikasi") {
    if (k.status === "terverifikasi") return gagal(409, "laporan sudah terverifikasi");
    const r = await env.DB.batch([env.DB.prepare(`UPDATE korban SET status = 'terverifikasi', diverifikasi_oleh = ?, diverifikasi_pada = ?, diubah = ? WHERE id = ? AND ${kunci}`).bind(oleh, kini, kini, id, k.status, k.diubah),
      jejak(env, oleh, id, "verifikasi", k.status, "terverifikasi", tx(b.o.alasan, 300) || null, kini, k.dummy, "changes() > 0")]);
    return r[0].meta.changes ? json({id, status: "terverifikasi"}) : gagal(409, "laporan baru saja berubah; muat ulang lalu ulangi");
  }
  const alasan = tx(b.o.alasan, 300); if (!alasan || alasan.length < 3) return gagal(400, "alasan koreksi wajib (3 sampai 300 karakter)");
  if (ada(b.o, "nama_korban") && !await bolehNama(env, req)) return gagal(403, "nama korban hanya bisa diubah moderator atau staf Pusdalops");
  const c = cekKorban(b.o, k, kini); if (c.g) return gagal(400, c.g);
  const dari = {}, ke = {}; for (const f of BIDANG) if (c.v[f] !== k[f]) { dari[f] = ringkas(k[f]); ke[f] = ringkas(c.v[f]); }
  const namaUbah = c.v.nama_korban !== k.nama_korban;
  if (namaUbah) ke.nama_diubah = true;
  if (!Object.keys(ke).length) return gagal(400, "tidak ada yang berubah");
  const v = c.v;
  const r = await env.DB.batch([env.DB.prepare(`UPDATE korban SET waktu_kejadian = ?, bencana = ?, meninggal = ?, luka_berat = ?, hilang = ?, kategori = ?, penyebab = ?, sumber = ?, kronologi = ?, nama_korban = ?,
    status = 'dikoreksi', diverifikasi_oleh = NULL, diverifikasi_pada = NULL, diubah = ? WHERE id = ? AND ${kunci}`)
    .bind(v.waktu_kejadian, v.bencana, v.meninggal, v.luka_berat, v.hilang, v.kategori, v.penyebab, v.sumber, v.kronologi, v.nama_korban, kini, id, k.status, k.diubah),
    jejak(env, oleh, id, "koreksi", JSON.stringify(dari), JSON.stringify(ke), alasan, kini, k.dummy, "changes() > 0")]);
  return r[0].meta.changes ? json({id, status: "dikoreksi"}) : gagal(409, "laporan baru saja berubah; muat ulang lalu ulangi");
}

/* ================================================================ Meja Pantau: laporan yang belum terverifikasi = butir prioritas 0 (pengait butirKorban di src/pantau.js). Tanpa nama. */
export async function butirKorban(env, kini, dummyOk) {
  try {
    const R = (await env.DB.prepare(`SELECT id, prov, kab, meninggal, luka_berat, hilang, status, dibuat, diubah, dummy FROM korban WHERE status != 'terverifikasi' ${dummyOk ? "" : "AND dummy = 0"} ORDER BY dibuat LIMIT 500`).all()).results;
    return R.map(r => ({id: `korban:${r.id}:${r.diubah}`, jenis: "korban_baru", judul: `Korban ${teksKorban(r)}${r.kab ? " di " + r.kab : ""}, ${PROV[r.prov]?.[1] ?? r.prov}, ${r.status === "dikoreksi" ? "sudah dikoreksi dan perlu diverifikasi ulang" : "belum diverifikasi"}, dilaporkan ${durasi(kini - r.dibuat)} lalu`,
      rincian: "Cocokkan dengan rumah sakit atau kepolisian, lalu verifikasi atau koreksi di Korban jiwa", provs: [r.prov], kab: r.kab, dibuat: r.dibuat, tenggat: r.dibuat + 2 * JAM, prioritas: 0, dummy: r.dummy}));
  } catch (e) { if (tanpaTabelKorban(e)) return []; throw e; }
}

/* ================================================================ agregat laporan harian dan Koordalops: angka per hari WIB kejadian, TANPA nama.
   Pakai: const k = await korbanHari(env, tanggal_data) -> {tanggal, laporan, terverifikasi, meninggal, luka_berat, hilang, belum_diverifikasi, meninggal_terverifikasi, teks, teks_md, provinsi: [{prov, nama, ...}]}.
   teks = "2 meninggal, 1 luka berat" (bagian dampak laporan harian), teks_md = "2 jiwa MD" (dampak Koordalops); keduanya null bila tidak ada korban. Baris dummy ikut hanya bila {dummy: true}. */
export async function korbanHari(env, tanggal, {dummy = false} = {}) {
  const kosong = {tanggal, laporan: 0, terverifikasi: 0, meninggal: 0, luka_berat: 0, hilang: 0, belum_diverifikasi: 0, meninggal_terverifikasi: 0, teks: null, teks_md: null, provinsi: []};
  if (typeof tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return kosong;
  const t0 = Date.parse(tanggal + "T00:00:00+07:00"); if (Number.isNaN(t0)) return kosong;
  try {
    const R = (await env.DB.prepare(`SELECT prov, count(*) laporan, sum(meninggal) meninggal, sum(luka_berat) luka_berat, sum(hilang) hilang, sum(CASE WHEN status != 'terverifikasi' THEN 1 ELSE 0 END) belum,
      sum(CASE WHEN status = 'terverifikasi' THEN meninggal ELSE 0 END) md_verif FROM korban WHERE waktu_kejadian >= ? AND waktu_kejadian < ? ${dummy ? "" : "AND dummy = 0"} GROUP BY prov ORDER BY prov`).bind(t0, t0 + HARI).all()).results;
    const o = {...kosong, provinsi: R.map(r => ({prov: r.prov, nama: PROV[r.prov]?.[1] ?? r.prov, laporan: r.laporan, meninggal: r.meninggal, luka_berat: r.luka_berat, hilang: r.hilang}))};
    for (const r of R) { o.laporan += r.laporan; o.meninggal += r.meninggal; o.luka_berat += r.luka_berat; o.hilang += r.hilang; o.belum_diverifikasi += r.belum; o.meninggal_terverifikasi += r.md_verif; }
    o.terverifikasi = o.laporan - o.belum_diverifikasi; o.teks = teksKorban(o); o.teks_md = o.meninggal > 0 ? `${o.meninggal} jiwa MD` : null;
    return o;
  } catch (e) { if (tanpaTabelKorban(e)) return kosong; throw e; }
}

/* ================================================================ dummy (DUMMY.md): satu halaman = rantai penuh. Hulu = tugas api dan akun instansi dummy (rute dummy instansi); hilir = butir Meja Pantau prioritas 0
   dari laporan yang belum terverifikasi. Nama korban contoh selalu berawalan "Contoh". Satu laporan dikoreksi (jejak lengkap), satu terverifikasi, satu baru. */
async function hulu(env, req, url, kini, aksi) {
  const h = new Headers(req.headers); h.delete("content-length"); h.set("content-type", "application/json");
  const r = await RUTE_INSTANSI["POST /api/instansi/admin/dummy"](env, new Request(req.url, {method: "POST", headers: h, body: JSON.stringify({aksi})}), url, kini, undefined);
  if (!r.ok && r.status !== 409) return r;
  r.body?.cancel(); return null;
}
async function dummyIsi(env, req, url, kini, oleh) {
  if ((await env.DB.prepare("SELECT count(*) n FROM korban WHERE dummy = 1").first()).n) return gagal(409, "data dummy korban sudah ada; hapus dulu dengan 🧹");
  await env.DB.prepare("DELETE FROM korban_jejak WHERE dummy = 1").run();
  const g0 = await hulu(env, req, url, kini, "isi"); if (g0) return g0;
  const A = (await env.DB.prepare("SELECT id, cakupan FROM instansi_akun WHERE dummy = 1 AND status = 'aktif'").all()).results, akun62 = A.find(a => { try { return JSON.parse(a.cakupan)[0] === "62"; } catch (e) { return false; } });
  const tugas = (await env.DB.prepare("SELECT id, prov, kab, lat, lon FROM tugas_api WHERE dummy = 1 AND status = 'buka' ORDER BY dibuat LIMIT 1").first());
  /* [umur jam, prov, kab, lat, lon, md, lb, hilang, kategori, penyebab, sumber, status, nama, kronologi, bencana, dengan akun/tugas] */
  const S = [
    [0.5, "62", "Kotawaringin Timur", -2.52, 113.2, 1, 0, 0, "warga", "terbakar", "laporan_langsung", "dilaporkan", "Contoh Korban Satu", "Warga ditemukan di lahan yang terbakar (contoh).", "karhutla", true],
    [30, "62", "Kapuas", -2.9, 114.4, 2, 1, 0, "petugas_pemadam", "kecelakaan_tugas", "rs", "terverifikasi", "Contoh Korban Dua", "Regu pemadam tersambar pohon tumbang (contoh).", "karhutla", true],
    [6, "62", null, null, null, 0, 2, 1, "relawan", "asap_ispa", "kepolisian", "dikoreksi", "Contoh Korban Tiga", "Relawan sesak napas pekat asap, satu belum ditemukan (contoh).", "karhutla", true],
    [3, "14", "Pelalawan", 0.4, 101.9, 1, 0, 0, "warga", "terbakar", "laporan_langsung", "dilaporkan", "Contoh Korban Empat", "Penjaga kebun di area terbakar (contoh).", "karhutla", false],
    [50, "16", "Ogan Komering Ilir", -3.3, 105.3, 3, 4, 0, "warga", "tenggelam", "kepolisian", "terverifikasi", "Contoh Korban Lima", "Perahu terbalik saat banjir (contoh).", "banjir", false],
    [8, "61", "Ketapang", -1.8, 110.0, 0, 0, 2, "lainnya", "lainnya", "laporan_langsung", "dilaporkan", null, "Dua warga belum kembali dari ladang (contoh).", "karhutla", false]];
  const st = [], ids = [];
  for (const [umur, prov, kab, lat, lon, md, lb, hl, kat, sebab, sumber, status, nama, kron, bencana, hulu_] of S) {
    const id = acak(8), dibuat = kini - umur * JAM, kejadian = dibuat - 30 * 60e3, ver = status === "terverifikasi";
    const pakaiAkun = hulu_ && akun62 && prov === "62", pakaiTugas = hulu_ && tugas && prov === "62" && lat != null && kab === "Kotawaringin Timur";
    ids.push(id);
    st.push(env.DB.prepare(`INSERT INTO korban (id, akun_id, oleh, waktu_kejadian, prov, kab, lat, lon, sumber_lokasi, tugas_id, bencana, meninggal, luka_berat, hilang, kategori, penyebab, kronologi, sumber, nama_korban, status, diverifikasi_oleh, diverifikasi_pada, dibuat, diubah, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(id, pakaiAkun ? akun62.id : null, pakaiAkun ? "instansi:" + akun62.id : "staf:contoh", kejadian, prov, kab, lat, lon, lat != null ? (pakaiTugas ? "tugas" : "gps") : "manual",
      pakaiTugas ? tugas.id : null, bencana, md, lb, hl, kat, sebab, kron, sumber, nama, status, ver ? "staf:contoh" : null, ver ? dibuat + 2 * JAM : null, dibuat, status === "dilaporkan" ? dibuat : dibuat + 2 * JAM));
    const oleh2 = pakaiAkun ? "instansi:" + akun62.id : "staf:contoh";
    st.push(jejak(env, oleh2, id, "lapor", null, angkaJejak({meninggal: md, luka_berat: lb, hilang: hl, kategori: kat, penyebab: sebab, bencana}), null, dibuat, 1));
    if (ver) st.push(jejak(env, "staf:contoh", id, "verifikasi", "dilaporkan", "terverifikasi", null, dibuat + 2 * JAM, 1));
    if (status === "dikoreksi") st.push(jejak(env, "staf:contoh", id, "koreksi", JSON.stringify({luka_berat: 1}), JSON.stringify({luka_berat: lb}), "Angka luka berat disesuaikan dengan data rumah sakit", dibuat + 2 * JAM, 1));
  }
  await env.DB.batch(st);
  return json({ok: true, korban: ids.length, butir: S.filter(s => s[11] !== "terverifikasi").length}, 201);
}
async function dummyHapus(env, req, url, kini) {
  const n = {korban: (await env.DB.prepare("SELECT count(*) n FROM korban WHERE dummy = 1").first()).n, jejak: (await env.DB.prepare("SELECT count(*) n FROM korban_jejak WHERE dummy = 1").first()).n};
  const foto = (await env.DB.prepare("SELECT id FROM korban WHERE dummy = 1 AND foto = 1").all()).results;
  await env.DB.batch([env.DB.prepare("DELETE FROM korban_jejak WHERE dummy = 1"), env.DB.prepare("DELETE FROM korban WHERE dummy = 1")]);
  if (env.MEDIA) for (const f of foto) await env.MEDIA.delete(`korban/foto/${f.id}`);
  const g = await hulu(env, req, url, kini, "hapus"); if (g) return g;   // 🧹 menghapus SELURUH dummy: akun dan tugas dummy instansi ikut (seperti Meja Pantau)
  return json({ok: true, ...n});
}
async function dummy(env, req, url, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, req, url, kini, mod);
  if (b.o.aksi === "hapus") return dummyHapus(env, req, url, kini);
  return gagal(400, "aksi harus isi/hapus");
}

/* halaman /admin/korban: kerangka tanpa data (data dari /api/korban yang dijaga sesi). Staf tanpa peran yang cocok dialihkan ke Meja Pantau, belum masuk ke login admin (halamanAdmin). */

/* rute digabung ke RUTE di src/worker.js. Akun instansi: /api/instansi/* (cookie Path=/api/instansi, POST wajib x-pb). Staf dan moderator: /api/korban/* (sesi staf berlaku di semua jalur; handler sama). */
export const RUTE_KORBAN = Object.fromEntries(Object.entries({
  "GET /admin/korban": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanKorban, HALAMAN_STAF.korban),
  "GET /api/instansi/korban": daftarMilik,
  "POST /api/korban/lapor": lapor,
  "POST /api/instansi/korban": lapor,   // pintu akun instansi: cookie sesi_instansi hanya dikirim peramban ke /api/instansi dan /instansi (Path), jadi klien /instansi tidak bisa memakai /api/korban
  "POST /api/korban/foto/:id": unggahFoto,
  "POST /api/instansi/foto-korban/:id": unggahFoto,
  "GET /api/korban/foto/:id": lihatFoto,
  "GET /api/korban": bacaAdmin,
  "GET /api/korban/jejak/:id": rincianJejak,
  "POST /api/korban/dummy": dummy,
  "POST /api/korban/:id": ubah,
}).map(([k, f]) => [k, k.startsWith("GET /admin") ? f : bungkus((env, req, url, kini, ctx, id) => f(env, req, url, kini, ctx, id))]));
