/* Siklus Bencana F1 (Buku Besar Kejadian): rute baca, tulis, antrean, dan ingest. Kontrak: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md bagian 4; KEAMANAN-PRIVASI.md; ALGORITMA F1.
   TIDAK menyentuh env.DB: semua SQL sk_* ada di bagian Siklus src/hak.js (fungsi sk*). Cangkang, gerbang peran, dan halaman: src/siklus.js. R2: env.MEDIA, awalan siklus/saji/.
   Definisi rute: {izin: [...], f}. izin: "tamu" | "sistem" (Bearer PIPA_TOKEN) | gabungan STAF, BP, PDKO, KO, PM, SA (dicek src/siklus.js SEBELUM handler dipanggil).
   ponytail: GET tidak memakai laju() (satu tulis D1 per panggilan; DT 4); ingest GET dijaga Bearer saja. Kandidat kab4 BP dihitung dari NAMA_KAB4, kejadian tanpa kab4 tidak pernah terlihat BP. */
import {json, gagal, acak, bacaBody} from "./worker.js";
import {tolak, teks, tglSah} from "./pusdalops_umum.js";
import {laju} from "./bnpb.js";
import {periksaToken} from "./pipa.js";
import {PROV} from "./alun.js";
import * as H from "./hak.js";
import {NAMA_KAB4, lingkupKab4, daftarKab4} from "./siklus_kab.js";
import {FASE, RE_KJ, idKejadian, kunciPendiri, selisihDampak, resolusiAlias, faseSah, hariAntara} from "./siklus_hitung.js";

const JAM = 36e5, HARI = 864e5, MAKS_ARSIP = 128 * 1024, MAKS_BATCH = 200;
export const JENIS_SAH = ["banjir", "cuaca", "gelombang", "gempa", "gunungapi", "karhutla", "kebakaran_permukiman", "kekeringan", "longsor", "tsunami"];   // kunci JENIS scripts/bnpb/kunci_kejadian.py
const FASE_SEMUA = [...FASE, "dibatalkan"]; export const HIDUP = f => f !== "digabung" && f !== "dibatalkan";
export const NO = () => gagal(404, "tidak ada");   // satu bentuk untuk "tidak ada" dan "di luar lingkup" (byte demi byte sama)
const tglWib = kini => new Date(kini + 7 * JAM).toISOString().slice(0, 10);
const tglGeser = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * HARI).toISOString().slice(0, 10);
export const kab4Sah = (v, nama = "kab4") => { if (typeof v !== "string" || !Object.hasOwn(NAMA_KAB4, v)) tolak(`${nama} harus kode kabupaten 4 digit (Kemendagri, scripts/udara/kota.json) yang dikenal`); return v; };
export const parse = s => { try { return s == null ? null : JSON.parse(s); } catch (e) { return null; } };
const kursor = (s, nama = "sesudah") => { if (s == null || s === "") return null; const m = /^(\d{4}-\d\d-\d\d)\|([0-9A-Za-z-]{1,16})$/.exec(s); if (!m || !tglSah(m[1])) tolak(`${nama} bukan penanda halaman yang sah`); return {mulai: m[1], id: m[2]}; };
const batasHal = (v, maks, awal) => { if (v == null || v === "") return awal; const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > maks) tolak(`batas harus bilangan bulat 1-${maks}`); return n; };
const halaman = (baris, batas, peta = x => x) => ({baris: baris.slice(0, batas).map(peta), berikut: baris.length > batas ? `${baris[batas - 1].mulai}|${baris[batas - 1].id}` : null});
export const bersihNama = (s, maks = 160) => String(s ?? "").normalize("NFKC").replace(/[\u0000-\u001f\u007f​-‏‪-‮﻿<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maks);
/* teks() memeriksa; bersihNama membuang <, >, kontrol, dan lebar-nol dari yang DISIMPAN (item 3: tidak ada markup tersimpan) */
const tb = (v, nama, maks, min = 0) => { const t = teks(v, nama, maks, min); if (t == null) return t; const b = bersihNama(t, maks); if (b.length < Math.max(min, 1)) tolak(`${nama} ${Math.max(min, 1)}-${maks} karakter setelah dibersihkan`); return b; };
export const bodi = async (c, maks = 16384) => { const b = await bacaBody(c.req, maks); if (b.galat) throw new H.Galat(b.status || 400, b.galat); return b.o; };
export const masukan = fn => { try { return fn(); } catch (e) { if (e && typeof e.galat === "string") throw new H.Galat(400, e.galat); throw e; } };   // tolak() -> 400
export const ujiLaju = async (c, aksi, maks) => laju(c.env, "sk:" + c.h.oleh, aksi, [[JAM, maks]], c.kini);
const jenisSah = (v, nama = "jenis") => {
  const a = typeof v === "string" && v.length <= 24 ? v.split("+") : null;
  if (!a || !a.every(x => JENIS_SAH.includes(x)) || a.join("+") !== [...new Set(a)].sort().join("+")) tolak(`${nama} harus kunci jenis yang dikenal (diurut naik, digabung "+")`);
  return v;
};
const wilayahKab4 = kab4 => kab4 ? `${NAMA_KAB4[kab4]}, ${PROV[kab4.slice(0, 2)] ?? ""}`.replace(/, $/, "") : null;

/* ================================================================ lingkup BP */
export const dalamBP = (c, kab4s) => c.h.tipe !== "bp" || (kab4s ?? []).some(k => lingkupKab4(c.h.akun, k));
export const lihat = (c, r) => !!r && (c.h.dummyOk || !r.dummy);
export const lihatTulis = (c, r) => lihat(c, r) && (!c.h.dummy || !!r.dummy);   // jalur tulis: akun dummy tidak boleh menyentuh baris nyata (404 seragam)   // staf nyata dan akun nyata tidak melihat dummy = 1
export const utkBP = (c, o) => { if (c.h.tipe !== "bp") return o; const {oleh, ...sisa} = o; return sisa; };

/* ID bebas: hash kunci (n = 1..5) sekali tanya; ID yang sudah dipakai D1 (termasuk dibatalkan/digabung) atau dalam batch yang sama dilewati */
async function pilihId(c, p, kunci, dalamBatch = new Set()) {
  const calon = []; for (let n = 1; n <= 5; n++) calon.push(await idKejadian(kunci, n));
  const terpakai = new Set(await H.skIdTerpakai(c.env, p, calon));
  const id = calon.find(x => !terpakai.has(x) && !dalamBatch.has(x));
  if (!id) throw new H.Galat(409, "ID kejadian bentrok berulang; hubungi pengelola");
  dalamBatch.add(id);
  return id;
}

/* ================================================================ baca */
async function daftarKejadian(c) {
  const q = c.url.searchParams;
  const f = masukan(() => {
    const sampai = q.get("sampai") ?? tglWib(c.kini), dari = q.get("dari") ?? tglGeser(sampai, -30);
    if (!tglSah(dari) || !tglSah(sampai)) tolak("dari dan sampai harus YYYY-MM-DD yang sah");
    if (dari > sampai) tolak("dari tidak boleh sesudah sampai");
    if (hariAntara(dari, sampai) > 366) tolak("rentang paling lama 366 hari");
    const o = {dari, sampai, batas: batasHal(q.get("batas"), 100, 50), sesudah: kursor(q.get("sesudah"))};
    if (q.get("kab4")) o.kab4 = kab4Sah(q.get("kab4"));
    if (q.get("prov")) { if (!/^\d{2}$/.test(q.get("prov"))) tolak("prov harus 2 digit"); o.prov = q.get("prov"); }
    if (q.get("jenis")) o.jenis = jenisSah(q.get("jenis"));
    if (q.get("fase")) { if (!FASE_SEMUA.includes(q.get("fase"))) tolak("fase tidak dikenal"); o.fase = q.get("fase"); }
    return o;
  });
  if (c.h.tipe === "bp") { if (f.kab4 && !lingkupKab4(c.h.akun, f.kab4)) return NO(); f.lingkup = JSON.stringify(daftarKab4(c.h.akun)); }
  const baris = await H.skKejadianDaftar(c.env, c.h.pelaku, {...f, dummyOk: c.h.dummyOk});
  const hal = halaman(baris, f.batas, r => r), per = new Map();
  for (const d of await H.skDampakBanyak(c.env, c.h.pelaku, hal.baris.map(r => r.id))) { const m = per.get(d.kejadian_id) ?? {}; m[m[d.sumber] ? `${d.sumber}:${d.kode}` : d.sumber] = parse(d.dampak) ?? {}; per.set(d.kejadian_id, m); }
  /* dampak ringkas per baris: angka tiap sumber berdampingan + selisih (tanpa total). Karhutla: terdampak hanya dari sistem kita (KA 6), jadi null di sini. null = tidak ada sumber */
  hal.baris = hal.baris.map(r => utkBP(c, {...r, dampak: r.jenis.split("+").includes("karhutla") ? null : per.has(r.id) ? {sumber: per.get(r.id), selisih: selisihDampak(per.get(r.id))} : null}));
  return json(hal);
}

/* aliran R2 apa adanya (tanpa JSON.parse): siklus/saji/kejadian/arsip/<tahun>/<prov>.json, k<kab4>.json (BP selalu k<kab4>), atau tanpa_wilayah.json (?tanpa_wilayah=1, staf saja) */
async function arsipKejadian(c) {
  const q = c.url.searchParams, tahun = q.get("tahun"), prov = q.get("prov"), kab4 = q.get("kab4");
  const a = masukan(() => {
    if (!/^\d{4}$/.test(tahun ?? "") || +tahun < 2011 || +tahun > 2100) tolak("tahun harus 2011-2100");
    if (q.get("tanpa_wilayah") === "1") return {berkas: "tanpa_wilayah", staf: true};   // baris tanpa wilayah: staf saja, tidak bisa dipromosikan
    if (c.h.tipe === "bp" || kab4) return {berkas: "k" + kab4Sah(kab4)};
    if (!/^\d{2}$/.test(prov ?? "")) tolak("prov harus 2 digit (atau beri kab4)");
    return {berkas: prov};
  });
  if (a.staf && c.h.tipe === "bp") return gagal(403, "baris tanpa wilayah hanya untuk staf");
  if (!a.staf && c.h.tipe === "bp" && !lingkupKab4(c.h.akun, kab4)) return NO();
  if (!c.env.MEDIA) return gagal(503, "penyimpanan arsip belum terpasang");
  const o = await c.env.MEDIA.get(`siklus/saji/kejadian/arsip/${tahun}/${a.berkas}.json`);
  if (!o) return gagal(404, "arsip belum dibangun");
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"}});
}
/* baca <= 128 KB dan urai; lebih besar tidak dibuka di Worker (CPU 10 ms). Mengembalikan objek, atau Response galat. */
export async function bacaArsipKecil(c, tahun, kab4) {
  if (!c.env.MEDIA) return gagal(503, "penyimpanan arsip belum terpasang");
  const o = await c.env.MEDIA.get(`siklus/saji/kejadian/arsip/${tahun}/k${kab4}.json`);
  if (!o) return gagal(404, "arsip belum dibangun");
  if (o.size > MAKS_ARSIP) { o.body?.cancel?.(); return gagal(413, "berkas arsip terlalu besar untuk dibuka di Worker; minta pengelola memecahnya"); }
  try { return JSON.parse(await o.text()); } catch (e) { return gagal(502, "berkas arsip rusak"); }
}
export const barisArsip = (a, id) => {
  const i = Array.isArray(a?.kolom) ? a.kolom.indexOf("id") : -1;
  const b = i >= 0 && Array.isArray(a.baris) ? a.baris.find(r => Array.isArray(r) && r[i] === id) : null;
  return b ? Object.fromEntries(a.kolom.map((k, j) => [k, b[j] ?? null])) : null;
};

async function detailKejadian(c) {
  const id = c.p.id, p = c.h.pelaku, q = c.url.searchParams;
  let r = await H.skKejadianById(c.env, p, id);
  if (!lihat(c, r)) r = null;
  if (r?.fase === "digabung") {   // alias: ikuti ke penyintas
    let akhir; try { akhir = await resolusiAlias(id, async x => { const b = await H.skKejadianRingkas(c.env, p, x); return lihat(c, b) ? b : null; }); } catch (e) { console.error("siklus alias", e.message); return NO(); }
    const t = await H.skKejadianKab(c.env, p, akhir);
    return dalamBP(c, t) ? json({alias_ke: akhir}) : NO();
  }
  if (!r) {   // belum dipromosikan: arsip R2 (hanya bila tahun dan kab4 diberikan), baca saja
    const tahun = q.get("tahun"), kab4 = q.get("kab4");
    if (!tahun || !kab4) return NO();
    masukan(() => { if (!/^\d{4}$/.test(tahun) || +tahun < 2011 || +tahun > 2100) tolak("tahun harus 2011-2100"); kab4Sah(kab4); });
    if (c.h.tipe === "bp" && !lingkupKab4(c.h.akun, kab4)) return NO();
    const a = await bacaArsipKecil(c, tahun, kab4); if (a instanceof Response) return a;
    const b = barisArsip(a, id); return b ? json({arsip: true, tahun: +tahun, kab4, kejadian: b}) : NO();
  }
  const kabSemua = await H.skKejadianKab(c.env, p, id);
  if (!dalamBP(c, kabSemua.length ? kabSemua : [r.kab4])) return NO();
  const kab = c.h.tipe === "bp" ? kabSemua.filter(k => lingkupKab4(c.h.akun, k)) : kabSemua;
  const sumber = await H.skSumberDariKejadian(c.env, p, id), jejak = await H.skJejakObyek(c.env, p, "kejadian", id, 50, c.h.dummyOk);
  const per = {};   // sumber berdampingan, tidak dijumlah; dua kode dari satu nama sumber dibedakan oleh kode
  for (const s of sumber) per[sumber.filter(x => x.sumber === s.sumber).length > 1 ? `${s.sumber}:${s.kode}` : s.sumber] = parse(s.dampak) ?? {};
  return json({kejadian: utkBP(c, r), wilayah: wilayahKab4(r.kab4), kab, sumber: sumber.map(({kandidat, ...s}) => ({...s, ...(c.h.tipe === "bp" ? {} : {kandidat: parse(kandidat)}), dampak: parse(s.dampak)})),
    selisih: selisihDampak(per), kaji_ids: await H.skKajiIds(c.env, p, id, c.h.dummyOk), pulih_ids: await H.skJitupasnaIds(c.env, p, id, c.h.dummyOk), jejak: c.h.tipe === "bp" ? jejak.map(({oleh, catatan, ...x}) => x) : jejak});
}

/* publik: hanya publik = 1 dan dummy = 0; semua alasan tidak ada memberi jawaban yang sama; tembolok tepi 5 menit (KP 8) */
async function publikKejadian(c) {
  const kunci = new Request(c.url.origin + c.url.pathname, {method: "GET"}), cache = globalThis.caches?.default;
  if (cache) { const ada = await cache.match(kunci); if (ada) return ada; }
  const r = RE_KJ.test(c.p.id) ? await H.skKejadianPublik(c.env, H.pelakuSkStaf, c.p.id) : null;
  /* 404 juga disimpan 60 dtk (item 6): tebakan id berulang tidak menembus D1; semua alasan tidak ada memberi jawaban yang sama */
  const res = r ? new Response(JSON.stringify({id: r.id, jenis: r.jenis, wilayah: wilayahKab4(r.kab4) ?? (r.prov ? PROV[r.prov] ?? null : null), mulai: r.mulai, fase: r.fase, ringkasan: r.ringkasan_publik, yakin: r.yakin, diperbarui: new Date(r.diubah).toISOString()}),
    {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=300", "x-content-type-options": "nosniff"}})
    : new Response(JSON.stringify({galat: "tidak ada"}), {status: 404, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=60", "x-content-type-options": "nosniff"}});
  if (cache) c.ctx?.waitUntil?.(cache.put(kunci, res.clone()).catch(() => {}));
  return res;
}

async function jejakDaftar(c) {
  const q = c.url.searchParams, obyek = q.get("obyek") ?? "kejadian", id = q.get("id");
  masukan(() => { if (!/^[a-z_]{2,24}$/.test(obyek)) tolak("obyek tidak sah"); if (!/^[0-9A-Za-z-]{1,40}$/.test(id ?? "")) tolak("id wajib"); });
  return json({jejak: await H.skJejakObyek(c.env, c.h.pelaku, obyek, id, 50, c.h.dummyOk)});
}

const petaSumber = s => ({...s, kandidat: parse(s.kandidat), dampak: parse(s.dampak)});
async function antreanDaftar(c) {
  const q = c.url.searchParams;
  const f = masukan(() => {
    if (q.get("status") && !["ambigu", "tanpa_wilayah"].includes(q.get("status"))) tolak("status harus ambigu atau tanpa_wilayah");
    return {status: q.get("status") || null, batas: batasHal(q.get("batas"), 100, 50), sesudah: kursor(q.get("sesudah"))};
  });
  return json(halaman(await H.skAntreanDaftar(c.env, c.h.pelaku, {...f, dummyOk: c.h.dummyOk}), f.batas, petaSumber));
}

/* ================================================================ tulis */
async function kejadianBaru(c) {
  const b = await bodi(c);
  const v = masukan(() => {
    const kab4 = b.kab4 == null || b.kab4 === "" ? null : kab4Sah(b.kab4);
    const mulai = b.mulai; if (!tglSah(mulai) || mulai > tglGeser(tglWib(c.kini), 1) || mulai < "2011-01-01") tolak("mulai harus YYYY-MM-DD, antara 2011 dan besok");
    let pusat = {lat: null, lon: null};
    if (b.pusat != null) { const {lat, lon} = b.pusat; if (typeof lat !== "number" || typeof lon !== "number" || !(lat >= -11.5 && lat <= 6.5) || !(lon >= 94 && lon <= 142)) tolak("pusat harus {lat, lon} di dalam Indonesia"); pusat = {lat, lon}; }
    if (b.paksa != null && typeof b.paksa !== "boolean") tolak("paksa harus boolean");
    return {jenis: jenisSah(b.jenis), nama: tb(b.nama, "nama", 160, 3), kab4, mulai, pusat, paksa: b.paksa === true};
  });
  const lj = await ujiLaju(c, "sk.kejadian", 60); if (lj) return lj;
  const p = c.h.pelaku;
  if (v.kab4 && !v.paksa) {
    const serupa = (await H.skKejadianSerupa(c.env, p, v.kab4, tglGeser(v.mulai, -3), tglGeser(v.mulai, 3), c.h.dummyOk)).filter(x => x.jenis.split("+").some(j => v.jenis.split("+").includes(j)));
    if (serupa.length) return json({galat: "ada kejadian serupa; ulangi dengan paksa: true bila memang kejadian lain", kandidat: serupa}, 409);
  }
  const id = await pilihId(c, p, kunciPendiri(v.jenis.split("+"), v.kab4 ?? "0000", v.mulai));
  const dummy = c.h.dummy ? 1 : 0;
  await H.skBatch(c.env, p, [H.skStmtKejadianBaru(c.env, p, {id, jenis: v.jenis, nama: v.nama, prov: v.kab4?.slice(0, 2), kab4: v.kab4, mulai: v.mulai, pusat_lat: v.pusat.lat, pusat_lon: v.pusat.lon, asal: "manual", kini: c.kini, oleh: c.h.oleh, dummy}),
    ...(v.kab4 ? [H.skStmtKab(c.env, p, id, v.kab4, c.kini, dummy)] : []), H.skStmtJejak(c.env, p, c.h.oleh, "kejadian", id, "buat", null, "terdeteksi", null, c.kini, dummy)]);
  return json({id}, 201);
}

async function promosi(c) {
  const b = await bodi(c), id = c.p.id, p = c.h.pelaku;
  const v = masukan(() => { const tahun = b.tahun; if (!Number.isInteger(tahun) || tahun < 2011 || tahun > 2100) tolak("tahun harus bilangan bulat 2011-2100"); return {tahun, kab4: kab4Sah(b.kab4)}; });
  const lj = await ujiLaju(c, "sk.promosi", 60); if (lj) return lj;
  const ada = await H.skKejadianRingkas(c.env, p, id);
  if (lihat(c, ada)) return json({id, sudah_ada: true});
  const a = await bacaArsipKecil(c, v.tahun, v.kab4); if (a instanceof Response) return a;
  const r = barisArsip(a, id); if (!r) return NO();
  if (r.kab4 == null || r.kab4 === "") return gagal(400, "baris arsip tanpa wilayah tidak bisa dipromosikan; petakan wilayahnya dulu");
  if (r.kab4 !== v.kab4) return NO();
  const baris = masukan(() => ({jenis: jenisSah(r.jenis, "jenis arsip"), mulai: (() => { if (!tglSah(r.mulai)) tolak("mulai arsip tidak sah"); return r.mulai; })(), akhir: tglSah(r.akhir) ? r.akhir : null}));
  const nama = bersihNama(r.nama); const dummy = c.h.dummy ? 1 : 0;
  await H.skBatch(c.env, p, [H.skStmtKejadianBaru(c.env, p, {id, jenis: baris.jenis, nama: nama.length >= 3 ? nama : `${baris.jenis} ${baris.mulai}`, prov: v.kab4.slice(0, 2), kab4: v.kab4, mulai: baris.mulai, akhir: baris.akhir, asal: "promosi", arsip_tahun: v.tahun, kini: c.kini, oleh: c.h.oleh, dummy}),
    H.skStmtKab(c.env, p, id, v.kab4, c.kini, dummy), H.skStmtJejak(c.env, p, c.h.oleh, "kejadian", id, "promosi", null, "terdeteksi", `arsip ${v.tahun}`, c.kini, dummy)]);
  return json({id}, 201);
}

async function ubahFase(c) {
  const b = await bodi(c), id = c.p.id, p = c.h.pelaku;
  const v = masukan(() => {
    if (b.ke === "digabung") tolak("fase digabung hanya lewat rute gabung");
    if (!FASE_SEMUA.includes(b.ke)) tolak(`ke harus salah satu dari ${FASE_SEMUA.join(", ")}`);
    const tm = b.tanggap_mulai ?? null, ta = b.tanggap_akhir ?? null;
    for (const [n, t] of [["tanggap_mulai", tm], ["tanggap_akhir", ta]]) if (t !== null && !tglSah(t)) tolak(`${n} harus YYYY-MM-DD yang sah`);
    return {ke: b.ke, alasan: b.alasan == null || b.alasan === "" ? null : tb(b.alasan, "alasan", 200, 3), tm, ta};
  });
  const r = await H.skKejadianById(c.env, p, id); if (!lihat(c, r)) return NO();
  if (r.fase === v.ke) return gagal(409, "kejadian sudah berada di fase itu");
  if (!faseSah(r.fase, v.ke)) return gagal(409, `transisi ${r.fase} ke ${v.ke} tidak sah`);
  if (!(c.h.ko || c.h.sa) && !(r.fase === "terdeteksi" && (v.ke === "terverifikasi" || v.ke === "dibatalkan"))) return gagal(403, "pusdalops hanya boleh memverifikasi atau membatalkan kejadian terdeteksi");
  if ((FASE.indexOf(v.ke) >= 0 && FASE.indexOf(v.ke) < FASE.indexOf(r.fase) || v.ke === "selesai" || v.ke === "dibatalkan") && !v.alasan) return gagal(400, "alasan wajib untuk mundur, selesai, dan dibatalkan");
  if (v.ke === "terverifikasi" && r.fase === "terdeteksi" && !r.kab4) return gagal(400, "kabupaten belum terpetakan; isi wilayah sebelum verifikasi");
  const tm = v.tm ?? r.tanggap_mulai, ta = v.ta ?? r.tanggap_akhir;
  if (v.ke === "tanggap" && !tm) return gagal(400, "tanggap_mulai wajib saat masuk fase tanggap");
  if (v.ke === "transisi" && !ta) return gagal(400, "tanggap_akhir wajib saat masuk fase transisi");
  if (tm && ta && ta < tm) return gagal(400, "tanggap_akhir tidak boleh sebelum tanggap_mulai");
  if (r.fase === "transisi" && v.ke === "pemulihan" && (await H.skR3pDiusulkanAda(c.env, p, id)) === false) return gagal(409, "transisi ke pemulihan butuh R3P berstatus diusulkan atau lebih (ALUR 2.1)");   // null = sk_r3p belum ada: syarat belum berlaku
  const lj = await ujiLaju(c, "sk.fase", 120); if (lj) return lj;
  await H.skBatch(c.env, p, [H.skStmtFase(c.env, p, id, v.ke, c.kini, v.tm, v.ta), H.skStmtJejak(c.env, p, c.h.oleh, "kejadian", id, "fase", r.fase, v.ke, v.alasan, c.kini, r.dummy)]);
  return json({id, fase: v.ke});
}

async function ubahPublik(c) {
  const b = await bodi(c), id = c.p.id, p = c.h.pelaku;
  const v = masukan(() => { if (typeof b.publik !== "boolean") tolak("publik harus true atau false"); return {publik: b.publik, ringkasan: b.publik ? tb(b.ringkasan, "ringkasan", 600, 20) : null}; });
  const r = await H.skKejadianRingkas(c.env, p, id); if (!lihat(c, r)) return NO();
  if (v.publik && (r.fase === "terdeteksi" || !HIDUP(r.fase))) return gagal(409, "kejadian terdeteksi, dibatalkan, atau digabung tidak boleh dipublikasikan");
  if (r.dummy && v.publik) return gagal(409, "kejadian dummy tidak boleh dipublikasikan");
  const lj = await ujiLaju(c, "sk.publik", 60); if (lj) return lj;
  await H.skBatch(c.env, p, [H.skStmtPublik(c.env, p, id, v.publik, v.ringkasan, c.kini), H.skStmtJejak(c.env, p, c.h.oleh, "kejadian", id, v.publik ? "publik" : "tarik", String(r.publik), v.publik ? "1" : "0", null, c.kini, r.dummy)]);
  return json({id, publik: v.publik});
}

/* Gabung: penyintas = mulai lebih awal (seri: ID lebih kecil); yang lain berfase digabung, ke = penyintas (ALG F1.5). Tidak ada pecah. */
async function gabung(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => { if (typeof b.ke !== "string" || !RE_KJ.test(b.ke)) tolak("ke harus ID kejadian KJ-..."); if (b.ke === c.p.id) tolak("tidak bisa menggabung kejadian dengan dirinya sendiri"); return {ke: b.ke, alasan: b.alasan == null ? "digabung oleh koordinator" : tb(b.alasan, "alasan", 200, 3)}; });
  const baris = await H.skKejadianRingkasBanyak(c.env, p, [c.p.id, v.ke]);
  const x = baris.find(r => r.id === c.p.id), y = baris.find(r => r.id === v.ke);
  if (!lihat(c, x) || !lihat(c, y)) return NO();
  if (!HIDUP(x.fase) || !HIDUP(y.fase)) return gagal(409, "kejadian digabung atau dibatalkan tidak bisa digabung lagi");
  if (x.fase !== y.fase) return gagal(409, `fase berbeda (${x.fase} dan ${y.fase}); samakan fase dulu`);
  if (!!x.dummy !== !!y.dummy) return gagal(409, "kejadian dummy dan nyata tidak bisa digabung");
  const [hidup, mati] = x.mulai < y.mulai || (x.mulai === y.mulai && x.id < y.id) ? [x, y] : [y, x];
  const lj = await ujiLaju(c, "sk.gabung", 30); if (lj) return lj;
  await H.skBatch(c.env, p, [H.skStmtFase(c.env, p, mati.id, "digabung", c.kini, null, null, hidup.id), H.skStmtAlias(c.env, p, mati.id, hidup.id, v.alasan, c.kini, c.h.oleh, mati.dummy),
    H.skStmtKabSalin(c.env, p, mati.id, hidup.id, c.kini), H.skStmtSumberPindahSemua(c.env, p, mati.id, hidup.id, c.kini),
    H.skStmtJejak(c.env, p, c.h.oleh, "kejadian", mati.id, "gabung", mati.fase, hidup.id, v.alasan, c.kini, mati.dummy)]);
  return json({digabung: mati.id, ke: hidup.id});
}

/* kejadian baru dari satu baris sumber (koreksi atau keputusan antrean): jenis, kab4, mulai milik baris itu */
async function kejadianDariSumber(c, s, kab4, dalamBatch) {
  const p = c.h.pelaku, id = await pilihId(c, p, kunciPendiri(s.jenis.split("+"), kab4, s.mulai), dalamBatch), dummy = s.dummy ? 1 : 0;
  masukan(() => jenisSah(s.jenis, "jenis sumber"));
  return {id, dummy, stmts: [H.skStmtKejadianBaru(c.env, p, {id, jenis: s.jenis, nama: `${s.jenis.replaceAll("_", " ")} ${NAMA_KAB4[kab4]} ${s.mulai}`.slice(0, 160), prov: kab4.slice(0, 2), kab4, mulai: s.mulai, asal: "manual", kini: c.kini, oleh: c.h.oleh, dummy}),
    H.skStmtKab(c.env, p, id, kab4, c.kini, dummy)]};
}

/* Koreksi manual (pengganti pecah): memindahkan SATU baris sumber ke kejadian lain atau ke kejadian baru; asal_id terisi, jurnal di sk_jejak */
async function koreksi(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => { if (typeof b.sid !== "string" || !/^[0-9a-f]{16}$/.test(b.sid)) tolak("sid harus 16 heks"); if (b.ke !== "baru" && !(typeof b.ke === "string" && RE_KJ.test(b.ke))) tolak('ke harus ID kejadian KJ-... atau "baru"'); return {sid: b.sid, ke: b.ke}; });
  const x = await H.skKejadianRingkas(c.env, p, c.p.id); if (!lihat(c, x)) return NO();
  const s = await H.skSumberById(c.env, p, v.sid); if (!lihat(c, s) || s.kejadian_id !== c.p.id || s.status !== "terpasang") return NO();
  let tujuan, stmts;
  if (v.ke === "baru") {
    if (!s.kab4) return gagal(400, "baris sumber tanpa wilayah tidak bisa menjadi kejadian baru");
    const k = await kejadianDariSumber(c, s, s.kab4); tujuan = k.id; stmts = k.stmts;
  } else {
    if (v.ke === c.p.id) return gagal(400, "tujuan sama dengan asal");
    const y = await H.skKejadianRingkas(c.env, p, v.ke); if (!lihat(c, y)) return NO();
    if (!HIDUP(y.fase)) return gagal(409, "kejadian tujuan digabung atau dibatalkan");
    if (y.fase !== x.fase) return gagal(409, `fase berbeda (${x.fase} dan ${y.fase})`);
    if (!!y.dummy !== !!x.dummy) return gagal(409, "kejadian dummy dan nyata tidak bisa dicampur");
    tujuan = v.ke; stmts = s.kab4 ? [H.skStmtKab(c.env, p, tujuan, s.kab4, c.kini, x.dummy)] : [];
  }
  const lj = await ujiLaju(c, "sk.koreksi", 30); if (lj) return lj;
  await H.skBatch(c.env, p, [...stmts, H.skStmtSumberPindah(c.env, p, v.sid, c.p.id, tujuan, c.kini), H.skStmtJejak(c.env, p, c.h.oleh, "sumber", v.sid, "koreksi", c.p.id, tujuan, "asal_id terisi", c.kini, s.dummy)]);
  return json({sid: v.sid, dari: c.p.id, ke: tujuan});
}

/* Keputusan antrean: pilih = ID kandidat | "baru" | null (tolak); kab4 melengkapi baris tanpa wilayah */
async function antreanPutus(c) {
  const b = await bodi(c), p = c.h.pelaku, sid = c.p.sid;
  const v = masukan(() => {
    if (!Object.hasOwn(b, "pilih")) tolak('pilih wajib: ID kejadian KJ-..., "baru", atau null');
    if (b.pilih !== null && b.pilih !== "baru" && !(typeof b.pilih === "string" && RE_KJ.test(b.pilih))) tolak('pilih harus ID kejadian KJ-..., "baru", atau null');
    return {pilih: b.pilih, kab4: b.kab4 == null || b.kab4 === "" ? null : kab4Sah(b.kab4)};
  });
  const s = await H.skSumberById(c.env, p, sid); if (!lihat(c, s)) return NO();
  if (s.status !== "ambigu" && s.status !== "tanpa_wilayah") return gagal(409, "baris ini sudah diputuskan");
  const kab4 = s.kab4 ?? v.kab4;
  let status, kejadian = null, stmts = [];
  if (v.pilih === null) status = "ditolak";
  else if (v.pilih === "baru") {
    if (!kab4) return gagal(400, "kab4 wajib untuk membuat kejadian baru dari baris tanpa wilayah");
    const k = await kejadianDariSumber(c, s, kab4); kejadian = k.id; stmts = k.stmts; status = "terpasang";
  } else {
    if (!(parse(s.kandidat) ?? []).includes(v.pilih)) return gagal(409, "pilihan di luar daftar kandidat");
    const y = await H.skKejadianRingkas(c.env, p, v.pilih); if (!lihat(c, y)) return NO();
    if (!!y.dummy !== !!s.dummy) return gagal(409, "sumber dummy dan kejadian nyata tidak bisa dipasangkan");
    if (!HIDUP(y.fase)) return gagal(409, "kejadian kandidat sudah digabung atau dibatalkan");
    kejadian = v.pilih; status = "terpasang"; stmts = kab4 ? [H.skStmtKab(c.env, p, kejadian, kab4, c.kini, y.dummy)] : [];
  }
  const lj = await ujiLaju(c, "sk.antrean", 120); if (lj) return lj;
  await H.skBatch(c.env, p, [...stmts, H.skStmtAntrean(c.env, p, sid, status, kejadian, s.kab4 ? null : v.kab4, c.kini), H.skStmtJejak(c.env, p, c.h.oleh, "sumber", sid, "antrean", s.status, status, kejadian ? `ke ${kejadian}` : null, c.kini, s.dummy)]);
  return json({sid, status, kejadian_id: kejadian});
}

/* ================================================================ ingest (pipeline, Bearer PIPA_TOKEN) */
const COOKIE_SESI = /(?:^|;\s*)sesi_(?:staf|admin|instansi|kemitraan|pendataan)=/;
export async function gerbangIngest(c) {
  if (COOKIE_SESI.test(c.req.headers.get("cookie") || "")) return gagal(400, "ingest memakai Bearer PIPA_TOKEN, bukan cookie sesi");
  return periksaToken(c.env, c.req);
}
function jendela(c) {
  const q = c.url.searchParams;
  return masukan(() => {
    const dari = q.get("dari"), sampai = q.get("sampai");
    if (!tglSah(dari) || !tglSah(sampai)) tolak("dari dan sampai wajib YYYY-MM-DD yang sah");
    if (dari > sampai) tolak("dari tidak boleh sesudah sampai");
    if (hariAntara(dari, sampai) > 120) tolak("rentang paling lama 120 hari");
    return {dari, sampai, batas: 1000, sesudah: kursor(q.get("lanjut"), "lanjut")};
  });
}
const lanjut = (baris, batas) => baris.length > batas ? `${baris[batas - 1].mulai}|${baris[batas - 1].id}` : null;
async function ingestJendela(c) {
  const t = await gerbangIngest(c); if (t) return t;
  const f = jendela(c), b = await H.skIngestJendela(c.env, H.pelakuSistem, f);
  return json({baris: b.slice(0, f.batas), lanjut: lanjut(b, f.batas)});
}
async function ingestSumber(c) {
  const t = await gerbangIngest(c); if (t) return t;
  const f = jendela(c), b = await H.skIngestSumber(c.env, H.pelakuSistem, f);
  return json({baris: b.slice(0, f.batas), lanjut: lanjut(b, f.batas)});
}

const LABEL = ["resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan", "hipotesis", "menunggu"];
export const polos = o => o !== null && typeof o === "object" && !Array.isArray(o);
function dampakSah(d) {
  if (d == null) return null;
  if (!polos(d) || Object.keys(d).length > 30) tolak("dampak harus objek {kolom: {n, y, t}} paling banyak 30 kolom");
  for (const [k, x] of Object.entries(d)) {
    if (/^(total|jumlah_gabungan)$/.test(k)) tolak("dampak tidak boleh memuat kunci total atau jumlah_gabungan (angka antarsumber tidak dijumlah)");
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(k) || !polos(x)) tolak(`kolom dampak ${k.slice(0, 40)} tidak sah`);
    if (x.n != null && !(typeof x.n === "number" && Number.isFinite(x.n))) tolak(`dampak.${k}.n harus angka atau null`);
    if (x.y != null && !LABEL.includes(x.y)) tolak(`dampak.${k}.y bukan label keyakinan`);
    if (x.t != null && (typeof x.t !== "string" || x.t.length > 16)) tolak(`dampak.${k}.t terlalu panjang`);
  }
  const s = JSON.stringify(d); if (s.length > 2000) tolak("dampak lebih dari 2000 karakter");
  return s;
}
const teksPendek = (v, nama, maks, min = 1) => { if (typeof v !== "string") tolak(`${nama} wajib teks`); const t = v.normalize("NFKC"); if (/[\u0000-\u001f\u007f​-‏‪-‮﻿]/.test(t) || t.length < min || t.length > maks) tolak(`${nama} ${min}-${maks} karakter tanpa karakter kontrol`); const u = bersihNama(t, maks); if (u.length < min) tolak(`${nama} ${min}-${maks} karakter setelah dibersihkan`); return u; };
function itemIngest(x, i, kini) {
  const at = `keputusan[${i}]`;
  try {
    if (!polos(x)) tolak("harus objek");
    if (x.dummy) tolak("kiriman dummy ditolak");
    const aksi = x.aksi; if (!["tambah", "baru", "ambigu", "tanpa_wilayah"].includes(aksi)) tolak("aksi harus tambah, baru, ambigu, atau tanpa_wilayah");
    if (typeof x.sumber !== "string" || !/^[a-z][a-z0-9_]{1,23}$/.test(x.sumber)) tolak("sumber tidak sah");
    const o = {aksi, sumber: x.sumber, kode: teksPendek(x.kode, "kode", 120), jenis: jenisSah(x.jenis), mulai: x.mulai, dampak: dampakSah(x.dampak),
      kode_hari: x.kode_hari == null ? null : teksPendek(x.kode_hari, "kode_hari", 16), pengenal_luar: x.pengenal_luar == null ? null : teksPendek(x.pengenal_luar, "pengenal_luar", 120),
      kab4: x.kab4 == null || x.kab4 === "" ? null : kab4Sah(x.kab4), diambil: x.diambil};
    if (x.kab != null) {   // kab[]: semua kabupaten kejadian (paling banyak 50); kab4 tetap kabupaten utama
      if (!Array.isArray(x.kab) || x.kab.length > 50) tolak("kab harus larik paling banyak 50 kode kabupaten");
      o.kab = [...new Set(x.kab.map(k => kab4Sah(k, "kab[]")))];
    }
    if (!tglSah(o.mulai)) tolak("mulai harus YYYY-MM-DD yang sah");
    if (!Number.isInteger(o.diambil) || o.diambil <= 0 || o.diambil > kini + HARI) tolak("diambil harus ms epoch bulat");
    if (aksi === "tambah") { if (typeof x.kejadian_id !== "string" || !RE_KJ.test(x.kejadian_id)) tolak("kejadian_id wajib ID KJ-... untuk aksi tambah"); o.kejadian_id = x.kejadian_id; }
    if (aksi === "baru") { if (!o.kab4) tolak("kab4 wajib untuk aksi baru"); o.nama = bersihNama(x.nama); if (o.nama.length < 3) tolak("nama kejadian 3-160 karakter"); }
    if (aksi === "ambigu") { if (!Array.isArray(x.kandidat) || x.kandidat.length < 1 || x.kandidat.length > 30 || !x.kandidat.every(k => typeof k === "string" && RE_KJ.test(k))) tolak("kandidat harus 1-30 ID KJ-..."); o.kandidat = JSON.stringify(x.kandidat); }
    if (aksi === "tanpa_wilayah") { o.kab4 = null; o.kab = []; }
    if (aksi === "ambigu") o.kab = [];
    o.kab = o.kab ?? [];
    return o;
  } catch (e) { if (e && typeof e.galat === "string") throw new H.Galat(400, `${at}: ${e.galat}`); throw e; }
}
async function ingestKejadian(c) {
  const t = await gerbangIngest(c); if (t) return t;
  const b = await bodi(c, 262144), p = H.pelakuSistem;
  if (!Array.isArray(b.keputusan) || !b.keputusan.length) return gagal(400, "keputusan harus larik tidak kosong");
  if (b.keputusan.length > MAKS_BATCH) return gagal(413, `batch paling banyak ${MAKS_BATCH} keputusan`);
  const item = b.keputusan.map((x, i) => itemIngest(x, i, c.kini));
  const ada = new Set((await H.skSumberAda(c.env, p, item.map(x => [x.sumber, x.kode]))).map(r => r.sumber + "\u0000" + r.kode)), lihatBatch = new Set();
  const baru = item.filter(x => { const k = x.sumber + "\u0000" + x.kode; if (ada.has(k) || lihatBatch.has(k)) return false; lihatBatch.add(k); return true; });
  const refs = [...new Set(baru.filter(x => x.aksi === "tambah").map(x => x.kejadian_id))];
  const dikenal = new Map((refs.length ? await H.skKejadianRingkasBanyak(c.env, p, refs) : []).map(r => [r.id, r]));
  for (const x of baru) if (x.aksi === "tambah") { const r = dikenal.get(x.kejadian_id); if (!r || !HIDUP(r.fase) || r.dummy) throw new H.Galat(400, `kejadian_id ${x.kejadian_id} tidak ada atau sudah digabung, dibatalkan, atau dummy`); }
  const dalamBatch = new Set(), stmts = [], tanda = [];   // tanda: jenis pernyataan sumber per indeks batch
  for (const x of baru) {
    const sid = acak(8); let kid = x.kejadian_id ?? null;
    if (x.aksi === "baru") {
      kid = await pilihId(c, p, kunciPendiri(x.jenis.split("+"), x.kab4, x.mulai), dalamBatch);
      stmts.push(H.skStmtKejadianBaru(c.env, p, {id: kid, jenis: x.jenis, nama: x.nama, prov: x.kab4.slice(0, 2), kab4: x.kab4, mulai: x.mulai, asal: "otomatis", kini: c.kini, oleh: "sistem:ingest", belumAda: [x.sumber, x.kode]}), H.skStmtKab(c.env, p, kid, x.kab4, c.kini, 0, [x.sumber, x.kode]));
    }
    if (x.aksi === "baru" || x.aksi === "tambah") for (const k of new Set([...(x.aksi === "tambah" && x.kab4 ? [x.kab4] : []), ...x.kab])) if (k !== (x.aksi === "baru" ? x.kab4 : null)) stmts.push(H.skStmtKab(c.env, p, kid, k, c.kini, 0, [x.sumber, x.kode]));
    tanda.push([stmts.length, x.aksi]);
    stmts.push(H.skStmtSumberBaru(c.env, p, {id: sid, sumber: x.sumber, kode: x.kode, kode_hari: x.kode_hari, pengenal_luar: x.pengenal_luar, kejadian_id: kid, jenis: x.jenis, kab4: x.kab4, mulai: x.mulai, kandidat: x.kandidat, dampak: x.dampak, diambil: x.diambil, kini: c.kini,
      status: x.aksi === "baru" || x.aksi === "tambah" ? "terpasang" : x.aksi}));
  }
  const hasil = {terpasang: 0, baru: 0, antre: 0, duplikat: item.length - baru.length};
  if (stmts.length) {
    stmts.push(H.skStmtJejak(c.env, p, "sistem:ingest", "ingest", acak(8), "ingest", null, String(baru.length), `masuk ${item.length}, duplikat ${hasil.duplikat}`, c.kini));
    const res = await H.skBatch(c.env, p, stmts);
    for (const [i, aksi] of tanda) {
      if (!res[i]?.meta?.changes) { hasil.duplikat++; continue; }   // kalah balapan di UNIQUE (sumber, kode, dummy): tidak menimpa
      if (aksi === "baru") { hasil.baru++; hasil.terpasang++; } else if (aksi === "tambah") hasil.terpasang++; else hasil.antre++;
    }
  }
  return json(hasil);
}

/* ================================================================ tabel rute */
/* siapa saya: untuk layar (tombol dummy, filter wilayah); BP memakai rute instansi sendiri */
async function saya(c) {
  const h = c.h, peran = h.sa ? ["superadmin"] : h.oleh.startsWith("admin:") ? ["moderator"] : (h.peranStaf ?? []);
  return json({peran, dummyOk: !!h.dummyOk, wilayah: h.wilayah ?? []});
}
export const RUTE_SIKLUS = {
  "GET /api/siklus/saya": {izin: ["STAF"], f: saya},
  "GET /api/siklus/publik/kejadian/:id": {izin: ["tamu"], f: publikKejadian},
  "GET /api/siklus/kejadian": {izin: ["STAF", "BP"], f: daftarKejadian},
  "GET /api/siklus/kejadian/arsip": {izin: ["STAF", "BP"], f: arsipKejadian},
  "GET /api/siklus/kejadian/:id": {izin: ["STAF", "BP"], f: detailKejadian},
  "POST /api/siklus/kejadian": {izin: ["PDKO"], f: kejadianBaru},
  "POST /api/siklus/kejadian/:id/promosi": {izin: ["PDKO"], f: promosi},
  "POST /api/siklus/kejadian/:id/fase": {izin: ["PDKO"], f: ubahFase},
  "POST /api/siklus/kejadian/:id/publik": {izin: ["KO"], f: ubahPublik},
  "POST /api/siklus/kejadian/:id/gabung": {izin: ["KO"], f: gabung},
  "POST /api/siklus/kejadian/:id/koreksi": {izin: ["KO"], f: koreksi},
  "GET /api/siklus/antrean": {izin: ["PDKO"], f: antreanDaftar},
  "POST /api/siklus/antrean/:sid": {izin: ["PDKO"], f: antreanPutus},
  "GET /api/siklus/jejak": {izin: ["STAF"], f: jejakDaftar},
  "GET /api/siklus/ingest/jendela": {izin: ["sistem"], f: ingestJendela},
  "GET /api/siklus/ingest/sumber": {izin: ["sistem"], f: ingestSumber},
  "POST /api/siklus/ingest/kejadian": {izin: ["sistem"], f: ingestKejadian},
};
