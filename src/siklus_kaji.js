/* Siklus Bencana F3 (Kaji Cepat Otomatis): rute baca, status, dan ingest. Kontrak: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md 3.2, 4, 5.2.6; KEPUTUSAN-AWAL.md (KA 9).
   TIDAK menyentuh env.DB: SQL sk_kaji dan baca meja_catatan ada di src/hak.js. Keluaran kaji SELALU rentang [bawah, atas] berlabel estimasi-model (terkunci CHECK 0122); tidak pernah angka tunggal atau resmi.
   Isian petugas meja kaji_cepat dibaca berdampingan (kolom angka saja), tidak dijumlah dengan hasil model. Versi baru dari ingest tidak menimpa; yang salah ditarik dengan alasan.
   ponytail: tanpa kueri pindai; daftar kaji selalu per kejadian_id (indeks sk_kaji_kej), meja lewat indeks meja_catatan_wilayah dibatasi 20 baris. */
import {json, gagal, acak} from "./worker.js";
import {tolak} from "./pusdalops_umum.js";
import * as H from "./hak.js";
import {NAMA_KAB4, lingkupKab4} from "./siklus_kab.js";
import {RE_KJ} from "./siklus_hitung.js";
import {bodi, masukan, ujiLaju, NO, parse, bersihNama, dalamBP, lihat, lihatTulis, utkBP, gerbangIngest, polos, HIDUP} from "./siklus_kejadian.js";

const HARI = 864e5, MAKS_R2 = 100 * 1024, MODEL = ["gempa", "banjir_jam1", "banjir_gfm"];
const BATAS_BERKAS = {geojson: 300 * 1024, png: 120 * 1024}, TIPE_BERKAS = {geojson: "application/geo+json; charset=utf-8", png: "image/png"};
/* status_model diturunkan dari vonis (cermin scripts/siklus/kaji_banjir.py periksa_gfm): hipotesis kecuali vonis lulus */
const PIL_GFM = {hipotesis: "Hipotesis: belum lulus uji balik", teruji: "Teruji: lulus uji balik"};
const RE_SID = /^[0-9a-f]{16}$/;
/* dari -> ke yang sah; ditarik terminal (salah = versi baru, KEAMANAN 7) */
const TRANSISI = {dihitung: ["diperiksa", "ditarik"], diperiksa: ["dipakai", "ditarik"], dipakai: ["ditarik"], menunggu_data: ["ditarik"], ditarik: []};

const bentuk = (c, r) => utkBP(c, {...r, masukan: parse(r.masukan), ringkas: parse(r.ringkas), galat_kalibrasi: parse(r.galat_kalibrasi)});

/* kejadian induk yang boleh dilihat pemanggil, atau null (404 seragam: tidak ada, dummy bagi akun nyata, di luar lingkup BP) */
async function kejadianBoleh(c, kejadianId) {
  const p = c.h.pelaku, k = await H.skKejadianRingkas(c.env, p, kejadianId);
  if (!lihat(c, k)) return null;
  if (c.h.tipe === "bp") { const kab = await H.skKejadianKab(c.env, p, kejadianId); if (!dalamBP(c, kab.length ? kab : [k.kab4])) return null; }
  return k;
}

async function daftarKaji(c) {
  const id = c.url.searchParams.get("kejadian_id");
  masukan(() => { if (typeof id !== "string" || !RE_KJ.test(id)) tolak("kejadian_id wajib ID kejadian KJ-..."); });
  if (!(await kejadianBoleh(c, id))) return NO();
  const baris = await H.skKajiDaftar(c.env, c.h.pelaku, id, c.h.dummyOk);
  return json({kejadian_id: id, baris: baris.map(r => bentuk(c, r))});
}

/* BP hanya melihat kab4 dalam lingkupnya: "kab" dan "kec" tingkat atas (larik objek ber-kab4 atau objek berkunci kab4) disaring; PD dan KO utuh. Tanpa kab4 sah = dibuang (gagal tertutup). */
function saringBP(c, h) {
  if (c.h.tipe !== "bp" || !h || typeof h !== "object") return h;
  const o = {...h};
  for (const k of ["kab", "kec"]) {
    if (Array.isArray(o[k])) o[k] = o[k].filter(x => lingkupKab4(c.h.akun, x?.kab4));
    else if (polos(o[k])) o[k] = Object.fromEntries(Object.entries(o[k]).filter(([kab4]) => lingkupKab4(c.h.akun, kab4)));
  }
  if (polos(o.jiwa_kab_sah)) delete o.jiwa_kab_sah;   // gabungan lintas kab: bukan milik satu BP
  return o;
}

async function bacaHasil(c, r) {
  if (!r.hasil_r2) return {hasil: null, hasil_status: "menunggu"};
  if (!c.env.MEDIA) return {hasil: null, hasil_status: "tanpa_penyimpanan"};
  const o = await c.env.MEDIA.get(r.hasil_r2);
  if (!o) return {hasil: null, hasil_status: "menunggu"};
  if (o.size > MAKS_R2) { o.body?.cancel?.(); return {hasil: null, hasil_status: "terlalu_besar"}; }
  const h = parse(await o.text());
  return h && typeof h === "object" ? {hasil: r.model === "banjir_gfm" ? saringBP(c, h) : h, hasil_status: "ada", hasil_selaras: h.versi === r.versi} : {hasil: null, hasil_status: "rusak"};
}

async function detailKaji(c) {
  const r = await H.skKajiById(c.env, c.h.pelaku, c.p.sid);
  if (!lihat(c, r)) return NO();
  const k = await kejadianBoleh(c, r.kejadian_id); if (!k) return NO();
  const mulaiMs = Date.parse(k.mulai + "T00:00:00Z");
  /* staf: kabupaten kejadian; BP: hanya kabupaten kejadian yang di lingkup akunnya (bukan k.kab4, yang bisa di luar lingkup pada kejadian multi-kabupaten) */
  const kabs = c.h.tipe === "bp" ? [...new Set([...(await H.skKejadianKab(c.env, c.h.pelaku, k.id)), k.kab4])].filter(x => lingkupKab4(c.h.akun, x)).slice(0, 5) : [k.kab4];
  const meja = [];
  for (const kb of kabs) if (kb && NAMA_KAB4[kb]) meja.push(...await H.skMejaKajiCepat(c.env, kb.slice(0, 2), NAMA_KAB4[kb], mulaiMs - HARI, mulaiMs + 45 * HARI, k.dummy));
  return json({kaji: bentuk(c, r), kejadian: {id: k.id, jenis: k.jenis, mulai: k.mulai, kab4: k.kab4, fase: k.fase}, ...(await bacaHasil(c, r)),
    meja: {catatan: "isian petugas BPBD, bukan hasil model; angka berdampingan, tidak dijumlah", baris: meja}});
}

/* GET /api/siklus/kaji/:sid/berkas/:nama (nama dibatasi POLA di siklus.js). Kunci R2 disusun dari baris sk_kaji, tidak pernah dari masukan pengguna. */
async function berkasKaji(c) {
  const r = await H.skKajiById(c.env, c.h.pelaku, c.p.sid);
  if (!lihat(c, r) || r.model !== "banjir_gfm") return NO();
  if (!(await kejadianBoleh(c, r.kejadian_id))) return NO();
  const kab4 = c.p.nama.slice(0, 4), jenis = c.p.nama.endsWith(".geojson") ? "geojson" : "png";
  if (c.h.tipe === "bp" && !lingkupKab4(c.h.akun, kab4)) return gagal(403, "di luar wilayah akun");
  if (!c.env.MEDIA) return gagal(503, "penyimpanan belum terpasang");
  const kunci = `siklus/saji/kaji_berkas/${r.kejadian_id}/banjir_gfm/v${r.versi}/${c.p.nama}`;
  const o = await c.env.MEDIA.get(kunci); if (!o) return NO();
  if (o.size > BATAS_BERKAS[jenis]) { o.body?.cancel?.(); return gagal(413, "berkas melebihi batas"); }
  return new Response(o.body, {headers: {"content-type": TIPE_BERKAS[jenis], "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff"}});
}

async function ubahStatus(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    if (!["diperiksa", "dipakai", "ditarik"].includes(b.ke)) tolak("ke harus diperiksa, dipakai, atau ditarik");
    if (b.ke === "ditarik") { const a = bersihNama(b.alasan, 300); if (typeof b.alasan !== "string" || a.length < 3) tolak("alasan wajib (3-300 karakter) untuk menarik kaji"); return {ke: b.ke, alasan: a}; }
    return {ke: b.ke, alasan: null};
  });
  const r = await H.skKajiById(c.env, p, c.p.sid); if (!lihatTulis(c, r)) return NO();
  if (!TRANSISI[r.status].includes(v.ke)) return gagal(409, `status ${r.status} tidak bisa menjadi ${v.ke}`);
  const lj = await ujiLaju(c, "sk.kaji", 120); if (lj) return lj;
  const res = await H.skBatch(c.env, p, [H.skStmtKajiStatus(c.env, p, r.id, r.status, v.ke, v.alasan, c.kini), H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "kaji", r.id, "status", r.status, v.ke, v.alasan, c.kini, r.dummy)]);
  if (!res[0].meta.changes) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id: r.id, status: v.ke});
}

/* ================================================================ ingest (pipeline, Bearer PIPA_TOKEN) */
/* objek JSON polos: kunci snake_case, nilai teks (dibersihkan dari markup), angka hingga, boolean, null, atau larik paling banyak 20; kedalaman paling banyak 3 */
function bersihJson(v, nama, dalam = 0) {
  if (v === null || typeof v === "boolean") return v;
  if (typeof v === "number") { if (!Number.isFinite(v)) tolak(`${nama} memuat angka tak hingga`); return v; }
  if (typeof v === "string") { if (v.length > 200) tolak(`${nama} memuat teks lebih dari 200 karakter`); return bersihNama(v, 200); }
  if (dalam >= 3) tolak(`${nama} terlalu dalam`);
  if (Array.isArray(v)) { if (v.length > 20) tolak(`${nama} memuat larik lebih dari 20`); return v.map(x => bersihJson(x, nama, dalam + 1)); }
  if (!polos(v) || Object.keys(v).length > 30) tolak(`${nama} harus objek paling banyak 30 kolom`);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => { if (!/^[a-z][a-z0-9_]{0,39}$/.test(k)) tolak(`kolom ${k.slice(0, 40)} di ${nama} tidak sah`); return [k, bersihJson(x, nama, dalam + 1)]; }));
}
const objek = (v, nama, maks, wajib) => {
  if (v == null && !wajib) return null;
  if (!polos(v)) tolak(`${nama} harus objek`);
  const s = JSON.stringify(bersihJson(v, nama)); if (s.length > maks) tolak(`${nama} lebih dari ${maks} karakter`);
  return s;
};

async function ingestKaji(c) {
  const t = await gerbangIngest(c); if (t) return t;
  const b = await bodi(c), p = H.pelakuSistem;
  const v = masukan(() => {
    if (typeof b.kejadian_id !== "string" || !RE_KJ.test(b.kejadian_id)) tolak("kejadian_id wajib ID kejadian KJ-...");
    if (!MODEL.includes(b.model)) tolak(`model harus ${MODEL.join(" atau ")}`);
    const status = b.status ?? "dihitung"; if (status !== "dihitung" && status !== "menunggu_data") tolak("status ingest harus dihitung atau menunggu_data");
    if (b.yakin != null && b.yakin !== "estimasi-model") tolak("yakin hanya boleh estimasi-model (KA 9)");
    const ringkas = objek(b.ringkas, "ringkas", 1500, true), r = JSON.parse(ringkas).rentang;
    if (status === "dihitung") {
      if (!Array.isArray(r) || r.length !== 2 || !r.every(x => typeof x === "number" && x >= 0 && x <= 1e9) || r[0] > r[1]) tolak("ringkas.rentang harus larik dua angka [bawah, atas], 0 sampai 1e9, bawah tidak melebihi atas");
    } else if (r != null) tolak("menunggu_data tidak boleh membawa rentang");
    if (b.model === "banjir_gfm") {
      if (!Number.isInteger(b.versi) || b.versi < 1 || b.versi > 99) tolak("versi wajib bilangan bulat 1 sampai 99 untuk banjir_gfm");
      if (b.hasil_r2 != null && b.hasil_r2 !== `siklus/saji/kaji/${b.kejadian_id}_banjir_gfm_v${b.versi}.json`) tolak("hasil_r2 banjir_gfm harus siklus/saji/kaji/<kejadian_id>_banjir_gfm_v<versi>.json atau null");
      const g = JSON.parse(ringkas);
      if (new TextEncoder().encode(ringkas).length > 1500) tolak("ringkas lebih dari 1500 byte");
      const sm = g.vonis === "lulus" ? "teruji" : "hipotesis";
      if (g.status_model !== sm || g.pil !== PIL_GFM[sm]) tolak("status_model harus diturunkan dari vonis (hipotesis kecuali lulus) beserta pil");
    } else if (b.hasil_r2 != null && b.hasil_r2 !== `siklus/saji/kaji/${b.kejadian_id}.json`) tolak("hasil_r2 harus siklus/saji/kaji/<kejadian_id>.json atau null");
    return {kejadian_id: b.kejadian_id, model: b.model, status, ringkas, masukan: objek(b.masukan, "masukan", 800, true), galat_kalibrasi: objek(b.galat_kalibrasi, "galat_kalibrasi", 400, false), hasil_r2: b.hasil_r2 ?? null};
  });
  const k = await H.skKejadianRingkas(c.env, p, v.kejadian_id);
  if (!k || k.dummy) return NO();
  if (!HIDUP(k.fase)) return gagal(409, "kejadian digabung atau dibatalkan");
  const id = acak(8), kini = c.kini;
  await H.skBatch(c.env, p, [H.skStmtKajiBaru(c.env, p, {...v, id, kini, oleh: "sistem:ingest", dummy: 0}), H.skStmtJejak(c.env, p, "sistem:ingest", "kaji", id, "ingest", null, v.status, v.model, kini)]);
  const r = await H.skKajiById(c.env, p, id);
  return json({id, versi: r.versi, status: r.status}, 201);
}

export const RUTE_SIKLUS_KAJI = {
  "GET /api/siklus/kaji": {izin: ["STAF", "BP"], f: daftarKaji},
  "GET /api/siklus/kaji/:sid": {izin: ["STAF", "BP"], f: detailKaji},
  "GET /api/siklus/kaji/:sid/berkas/:nama": {izin: ["STAF", "BP"], f: berkasKaji},
  "POST /api/siklus/kaji/:sid/status": {izin: ["PDKO"], f: ubahStatus},
  "POST /api/siklus/ingest/kaji": {izin: ["sistem"], f: ingestKaji},
};
