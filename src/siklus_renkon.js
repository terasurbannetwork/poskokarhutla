/* Siklus Bencana F5 (Renkon Hidup dan Gladi): rute renkon, asumsi, status, gladi, catatan. Kontrak: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md 3.4 dan 4; ALGORITMA F5; KEAMANAN-PRIVASI 1.
   TIDAK menyentuh env.DB: semua SQL ada di bagian Siklus src/hak.js (termasuk bacaan stok LogPal dan personel /petugas: dibaca, tidak disalin).
   Kedaluwarsa dan sisa hari dihitung saat dibaca (ADR-09), bukan nilai status. Usulan angka kebutuhan tidak pernah menimpa isian staf. Gladi hanya untuk kejadian yang sudah dipromosikan ke D1 (ADR-04); pemutaran ulang tanpa nama korban.
   ponytail: personel siap tugas dihitung tingkat provinsi (relawan.prov), belum per kabupaten; padanan stok hanya beras dan air mineral (ALGORITMA F5.2). */
import {json, gagal, acak} from "./worker.js";
import {tolak, teks, tglSah, kodeProv} from "./pusdalops_umum.js";
import * as H from "./hak.js";
import {NAMA_KAB4, lingkupKab4, daftarKab4} from "./siklus_kab.js";
import {RE_KJ, MENUNGGU, PADANAN, kebutuhanDasar, kesenjanganItem, kesenjanganPersonel, kesegaran, skorGladi, putarUlang, tambahBulan} from "./siklus_hitung.js";
import {bodi, masukan, ujiLaju, NO, parse, bersihNama, lihat, lihatTulis, utkBP, kab4Sah, polos, bacaArsipKecil, barisArsip, JENIS_SAH} from "./siklus_kejadian.js";

const RE_ID16 = /^[0-9a-f]{16}$/, ASPEK = ["lingkungan", "kependudukan", "ekonomi", "infrastruktur", "layanan_sipil"];   // Perban 2/2023 Pasal 7 ayat (5)
const YAKIN = ["resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan", "hipotesis", "menunggu"];
const tglWib = kini => new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
const bersih = (v, nama, maks, min = 1) => { if (v == null || v === "") return null; const b = bersihNama(teks(v, nama, maks, min), maks); if (b.length < min) tolak(`${nama} ${min}-${maks} karakter setelah dibersihkan`); return b; };
const GESER_RK = {pelaksanaan: "persiapan", finalisasi: "pelaksanaan", ditetapkan: "finalisasi", berlaku: "ditetapkan", dimutakhirkan: "berlaku"};   // ke: dari
const GESER_GL = {siap: "dirancang", berjalan: "siap", dievaluasi: "berjalan", selesai: "dievaluasi"};
const BIDANG = ["kebijakan", "renkon", "sarpras"];   // keluaran gladi minimal (Juklak 4/2026)

/* renkon yang boleh dilihat pemanggil: dummy hanya untuk yang berhak; BP hanya wilayahnya (tingkat provinsi: akun provinsi yang mencakup prov) */
export const renkonBP = (c, r) => c.h.tipe !== "bp" || (r.kab4 ? lingkupKab4(c.h.akun, r.kab4) : c.h.akun.tingkat === "prov" && c.h.cakupan.includes(r.prov));
/* lingkup BP untuk SQL (null = staf): kab4 dalam lingkup, dan provinsi bagi akun provinsi (renkon tanpa kab4); sama dengan renkonBP */
export const lingRenkon = c => c.h?.tipe !== "bp" ? null : {kab: JSON.stringify(daftarKab4(c.h.akun)), prov: JSON.stringify(c.h.akun.tingkat === "prov" ? c.h.cakupan : [])};
async function renkonBoleh(c, id, tulis = false) { const r = await H.skRenkonById(c.env, c.h.pelaku, id); return (tulis ? lihatTulis : lihat)(c, r) && renkonBP(c, r) ? r : null; }

function segar(r, hariIni) {
  const s = ["ditetapkan", "berlaku", "dimutakhirkan"].includes(r.status) ? kesegaran({tgl_sah: r.tgl_sah, reviu_terakhir: r.reviu_terakhir, berlaku_sampai: r.berlaku_sampai, hariIni}) : {status: MENUNGGU, berlaku_sampai: null, sisa: null, reviu_jatuh: null};
  return {...s, kedaluwarsa: s.status === "kedaluwarsa", hari_tersisa: s.sisa};
}
const tampil = (c, r, hariIni) => {
  const s = segar(r, hariIni);   // kedaluwarsa dan hari tersisa dihitung saat dibaca, tidak disimpan (ADR-09)
  return utkBP(c, {...r, asumsi: parse(r.asumsi), kerangka: parse(r.kerangka), kesenjangan: parse(r.kesenjangan), kesegaran: s, kedaluwarsa: s.kedaluwarsa, hari_tersisa: s.hari_tersisa});
};

/* ================================================================ baca renkon */
async function daftarRenkon(c) {
  const q = c.url.searchParams, prov = q.get("prov"), kab4 = q.get("kab4"), bencana = q.get("bencana");
  masukan(() => { kodeProv(prov); if (kab4) kab4Sah(kab4); if (bencana && !JENIS_SAH.includes(bencana)) tolak("bencana tidak dikenal"); });
  const baris = (await H.skRenkonDaftar(c.env, c.h.pelaku, {prov, kab4, bencana, dummyOk: c.h.dummyOk, ling: lingRenkon(c)})).filter(r => renkonBP(c, r)), hariIni = tglWib(c.kini);
  return json({prov, baris: baris.slice(0, 100).map(r => tampil(c, r, hariIni)), terpotong: baris.length > 100});
}

const SATUAN = {kilogram: "kg", kg: "kg", liter: "liter", ltr: "liter", l: "liter"};
const normSatuan = s => SATUAN[String(s ?? "").trim().toLowerCase()] ?? String(s ?? "").trim().toLowerCase();
/* gabungkan baris LogPal (barang, satuan) menjadi stok per komponen padanan; tidak ada baris = null ("stok belum tercatat"), satuan lain = satuan beda */
function stokUntuk(rows, nama) {
  const cocok = rows.filter(x => PADANAN[nama].pola.test(`${x.barang} ${x.item_standar}`));
  if (!cocok.length) return null;
  const sama = cocok.filter(x => normSatuan(x.satuan) === PADANAN[nama].satuan);
  if (!sama.length) return {baik: 0, rusak: 0, belum: 0, satuan: normSatuan(cocok[0].satuan)};
  return {baik: sama.reduce((a, x) => a + x.baik, 0), rusak: sama.reduce((a, x) => a + x.rusak, 0), belum: sama.reduce((a, x) => a + (x.jumlah - x.baik - x.rusak), 0), satuan: PADANAN[nama].satuan};
}
function varianKab(kab4) {
  const n = NAMA_KAB4[kab4]?.toLowerCase(); if (!n) return null;
  return /^kota /.test(n) ? [n] : [n, "kabupaten " + n, "kab. " + n];
}
async function hitungSenjang(c, r, kerangka, kes) {
  const usulan = kebutuhanDasar({jiwa: kerangka?.jiwa, hari: kerangka?.hari, kk: kerangka?.kk ?? null});
  const rows = usulan.status === "usulan" ? await H.skStokLogpal(c.env, r.prov, r.kab4 ? varianKab(r.kab4) : null, r.dummy) : null;
  const barang = Object.keys(PADANAN).map(nama => usulan.status !== "usulan" ? {nama, status: "kebutuhan menunggu", gap: null, surplus: null}
    : rows == null ? {nama, status: "stok belum tercatat", gap: null, surplus: null} : kesenjanganItem(nama, usulan.komponen[nama], stokUntuk(rows, nama)));
  const siap = await H.skPersonelSiap(c.env, r.prov, r.dummy);
  return {usulan, barang, personel: {...kesenjanganPersonel(kes?.target_personel, siap), cakupan: "provinsi"},
    catatan: "stok dibaca dari LogPal (kondisi baik; rusak dan belum dinilai terpisah) dan personel siap tugas dari /petugas; tidak disalin"};
}

async function detailRenkon(c) {
  const r = await renkonBoleh(c, c.p.sid); if (!r) return NO();
  const hariIni = tglWib(c.kini), v = tampil(c, r, hariIni), p = c.h.pelaku;
  const s = await hitungSenjang(c, r, v.kerangka, v.kesenjangan);
  const gladi = c.h.tipe === "bp" ? [] : await H.skGladiDaftar(c.env, p, r.id, c.h.dummyOk);
  const akhir = gladi.find(g => g.status === "selesai"), rek = akhir ? parse(akhir.rekomendasi) : null;
  const skor = skorGladi({kesegaran: v.kesegaran.status === MENUNGGU ? null : v.kesegaran.status, barang: s.barang, personel: s.personel, rekomendasi: Array.isArray(rek) ? rek : null});
  return json({renkon: v, usulan: s.usulan, kesenjangan_hitung: {barang: s.barang, personel: s.personel, catatan: s.catatan}, skor,
    gladi: gladi.map(g => ({id: g.id, jenis: g.jenis, status: g.status, kejadian_id: g.kejadian_id, diubah: g.diubah})),
    catatan: "usulan angka dari rumus Perka 7/2008 hanya di samping isian staf; tidak menimpa"});
}

/* ================================================================ tulis renkon */
async function renkonBaru(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    const prov = kodeProv(b.prov), kab4 = b.kab4 == null || b.kab4 === "" ? null : kab4Sah(b.kab4);
    if (kab4 && !kab4.startsWith(prov)) tolak("kab4 bukan kabupaten provinsi itu");
    if (!JENIS_SAH.includes(b.bencana)) tolak(`bencana harus ${JENIS_SAH.join(", ")}`);
    const mj = b.meja_id == null || b.meja_id === "" ? null : b.meja_id;
    if (mj != null && (typeof mj !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(mj))) tolak("meja_id 1-40 karakter huruf, angka, - dan _");
    return {judul: bersih(b.judul, "judul", 200, 5) ?? tolak("judul wajib"), bencana: b.bencana, prov, kab4, skenario: bersih(b.skenario, "skenario", 4000, 5), meja_id: mj};
  });
  const dummy = c.h.dummy ? 1 : 0, lama = await H.skRenkonTerbaru(c.env, p, v.prov, v.kab4, v.bencana, dummy);
  if (lama && lama.status !== "dimutakhirkan") return gagal(409, `sudah ada renkon wilayah dan bencana ini (${lama.status}); mutakhirkan dulu`);
  if (lama && lama.versi >= 99) return gagal(409, "versi renkon sudah penuh");
  const lj = await ujiLaju(c, "sk.renkon", 60); if (lj) return lj;
  const id = acak(8);
  await H.skBatch(c.env, p, [H.skStmtRenkonBaru(c.env, p, {...v, id, versi: lama ? lama.versi + 1 : 1, induk_id: lama?.id ?? null, kini: c.kini, oleh: c.h.oleh, dummy}),
    H.skStmtJejak(c.env, p, c.h.oleh, "renkon", id, "buat", null, "persiapan", v.bencana, c.kini, dummy)]);
  return json({id}, 201);
}

function asumsiSah(o) {
  if (!polos(o)) tolak("asumsi harus objek");
  const r = {};
  for (const [k, a] of Object.entries(o)) {
    if (!ASPEK.includes(k)) tolak(`aspek asumsi harus salah satu: ${ASPEK.join(", ")}`);
    if (!polos(a)) tolak(`asumsi.${k} harus objek {nilai, sumber, waktu, yakin}`);
    const nilai = typeof a.nilai === "number" && Number.isFinite(a.nilai) ? a.nilai : bersih(a.nilai, `${k}.nilai`, 300, 1) ?? tolak(`${k}.nilai wajib`);
    if (!YAKIN.includes(a.yakin)) tolak(`${k}.yakin harus salah satu: ${YAKIN.join(", ")}`);
    if (a.waktu != null && !tglSah(a.waktu)) tolak(`${k}.waktu harus YYYY-MM-DD`);
    r[k] = {nilai, sumber: bersih(a.sumber, `${k}.sumber`, 120, 3) ?? tolak(`${k}.sumber wajib`), waktu: a.waktu ?? null, yakin: a.yakin};
  }
  return r;
}
const bulatNol = (v, nama, maks) => { if (v == null) return null; if (!Number.isInteger(v) || v < 0 || v > maks) tolak(`${nama} harus bilangan bulat 0-${maks}`); return v; };

async function isiRenkon(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    const k = b.kerangka, s = b.kesenjangan, r = {};
    if (b.asumsi != null) r.asumsi = JSON.stringify(asumsiSah(b.asumsi));
    if (k != null) { if (!polos(k)) tolak("kerangka harus objek"); r.kerangka = JSON.stringify({jiwa: bulatNol(k.jiwa, "kerangka.jiwa", 1e8), hari: k.hari == null ? null : (Number.isInteger(k.hari) && k.hari >= 1 && k.hari <= 365 ? k.hari : tolak("kerangka.hari 1-365")), kk: bulatNol(k.kk, "kerangka.kk", 1e8)}); }
    if (s != null) { if (!polos(s)) tolak("kesenjangan harus objek"); r.kesenjangan = JSON.stringify({target_personel: bulatNol(s.target_personel, "kesenjangan.target_personel", 1e6), catatan: bersih(s.catatan, "kesenjangan.catatan", 500, 3)}); }
    if (b.skenario != null) r.skenario = bersih(b.skenario, "skenario", 4000, 5);
    if (b.meja_id != null) { if (typeof b.meja_id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(b.meja_id)) tolak("meja_id tidak sah"); r.meja_id = b.meja_id; }
    if (b.reviu_terakhir != null) { if (!tglSah(b.reviu_terakhir)) tolak("reviu_terakhir harus YYYY-MM-DD"); r.reviu = b.reviu_terakhir; }
    if (!Object.keys(r).length) tolak("tidak ada isian");
    return r;
  });
  const rk = await renkonBoleh(c, c.p.sid, true); if (!rk) return NO();
  const sunting = v.asumsi != null || v.kerangka != null || v.kesenjangan != null || v.skenario != null || v.meja_id != null;
  if (sunting && !["persiapan", "pelaksanaan", "finalisasi"].includes(rk.status)) return gagal(409, `isian hanya sebelum ditetapkan (sekarang ${rk.status}); buat versi baru lewat pemutakhiran`);
  if (v.reviu && !["ditetapkan", "berlaku"].includes(rk.status)) return gagal(409, `reviu_terakhir dicatat saat ditetapkan atau berlaku (sekarang ${rk.status})`);
  const lj = await ujiLaju(c, "sk.renkonisi", 60); if (lj) return lj;
  const st = [];
  if (sunting) st.push(H.skStmtRenkonIsi(c.env, p, rk.id, v, c.kini));
  if (v.reviu) st.push(H.skStmtRenkonReviu(c.env, p, rk.id, v.reviu, c.kini));
  const res = await H.skBatch(c.env, p, [...st, H.skStmtJejak(c.env, p, c.h.oleh, "renkon", rk.id, "isi", null, null, Object.keys(v).join(",").slice(0, 100), c.kini, rk.dummy)]);
  if (res.slice(0, st.length).some(x => !x.meta.changes)) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id: rk.id, status: rk.status});
}

async function statusRenkon(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    if (!Object.hasOwn(GESER_RK, b.ke)) tolak(`ke harus ${Object.keys(GESER_RK).join(", ")}`);
    if (b.ke !== "ditetapkan") return {ke: b.ke};
    if (!tglSah(b.tgl_sah)) tolak("tgl_sah wajib YYYY-MM-DD");
    return {ke: b.ke, tgl_sah: b.tgl_sah, no_penetapan: bersih(b.no_penetapan, "no_penetapan", 120, 1) ?? tolak("no_penetapan wajib"), berlaku_sampai: tambahBulan(b.tgl_sah, 36)};
  });
  const rk = await renkonBoleh(c, c.p.sid, true); if (!rk) return NO();
  if (rk.status !== GESER_RK[v.ke]) return gagal(409, `status ${rk.status} tidak bisa menjadi ${v.ke}`);
  const lj = await ujiLaju(c, "sk.renkonstatus", 60); if (lj) return lj;
  const res = await H.skBatch(c.env, p, [H.skStmtRenkonStatus(c.env, p, rk.id, rk.status, v.ke, v, c.kini), H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "renkon", rk.id, "status", rk.status, v.ke, v.no_penetapan ?? null, c.kini, rk.dummy)]);
  if (!res[0].meta.changes) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id: rk.id, status: v.ke, berlaku_sampai: v.berlaku_sampai ?? rk.berlaku_sampai});
}

/* ================================================================ gladi */
async function gladiBoleh(c, id, tulis = false) {
  const lh = tulis ? lihatTulis : lihat, g = await H.skGladiById(c.env, c.h.pelaku, id); if (!lh(c, g)) return null;
  const rk = await H.skRenkonById(c.env, c.h.pelaku, g.renkon_id); return lh(c, rk) ? {g, rk} : null;
}
const tampilGladi = g => ({...g, skenario: parse(g.skenario), masalah: parse(g.masalah), rekomendasi: parse(g.rekomendasi)});

async function daftarGladi(c) {
  const id = c.url.searchParams.get("renkon_id");
  masukan(() => { if (typeof id !== "string" || !RE_ID16.test(id)) tolak("renkon_id wajib (16 heks)"); });
  const rk = await renkonBoleh(c, id); if (!rk) return NO();
  return json({renkon_id: id, baris: (await H.skGladiDaftar(c.env, c.h.pelaku, id, c.h.dummyOk)).map(tampilGladi)});
}
async function detailGladi(c) {
  const x = await gladiBoleh(c, c.p.sid); if (!x) return NO();
  return json({gladi: tampilGladi(x.g), renkon: {id: x.rk.id, judul: x.rk.judul, status: x.rk.status}, label: "Model sederhana, bukan prakiraan"});
}

/* skenario gladi dari entri [{waktu ms, sumber, metrik, nilai}] (hitungan dampak saja; tanpa nama atau catatan). Dipakai rute gladi DAN dummy. Replay Maret 2025: hanya banjir yang mulai Maret 2025, lisensi DEM NC. */
export function bentukSkenario(entri, percepatan, kej) {
  const putar = putarUlang(entri, percepatan), maret = kej.jenis === "banjir" && /^2025-03/.test(kej.mulai);
  let langkah = putar.langkah.slice(0, 80), isi;
  do {
    isi = {label: putar.label, yakin: putar.yakin, percepatan, kejadian_mulai: kej.mulai, jenis: kej.jenis, total_langkah: putar.langkah.length, langkah, tanpa_identitas: true, ...(maret ? {replay_maret_2025: true, lisensi: "NC (DEM): bukan untuk keperluan komersial"} : {})};
    if (JSON.stringify(isi).length <= 5800) break;
    langkah = langkah.slice(0, Math.floor(langkah.length * 0.8));
  } while (langkah.length);
  return JSON.stringify(isi);
}
/* entri dari baris D1 kejadian terpromosi: dampak sumber (sk_kejadian_sumber) dan entri logbook berkode id logbook */
async function susunSkenario(c, kej, percepatan) {
  const sumber = await H.skSumberDariKejadian(c.env, c.h.pelaku, kej.id), entri = [];
  for (const s of sumber) {
    const t = Date.parse(s.mulai + "T00:00:00Z"), d = parse(s.dampak) ?? {};
    for (const [metrik, a] of Object.entries(d)) if (a && typeof a.n === "number") entri.push({waktu: t, sumber: s.sumber, metrik, nilai: a.n});
    if (s.sumber === "logbook" && RE_ID16.test(s.kode))
      for (const e of await H.skLogbookEntri(c.env, s.kode))
        for (const m of ["md", "hilang", "luka", "mengungsi_jiwa", "mengungsi_kk", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "luas_ha"]) if (typeof e[m] === "number") entri.push({waktu: e.waktu, sumber: "logbook", metrik: m, nilai: e[m]});
  }
  return bentukSkenario(entri, percepatan, kej);
}

async function gladiBaru(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    if (!["ruang", "posko", "lapang"].includes(b.jenis)) tolak("jenis harus ruang, posko, atau lapang");
    if (typeof b.renkon_id !== "string" || !RE_ID16.test(b.renkon_id)) tolak("renkon_id wajib (16 heks)");
    if (typeof b.kejadian_id !== "string" || !RE_KJ.test(b.kejadian_id)) tolak("kejadian_id wajib ID kejadian KJ-...");
    const per = b.percepatan == null ? 1 : b.percepatan;
    if (typeof per !== "number" || !Number.isFinite(per) || per < 1 || per > 1000) tolak("percepatan harus angka 1-1000");
    if ((b.tahun == null) !== (b.kab4 == null)) tolak("tahun dan kab4 diberikan bersama (untuk memeriksa arsip)");
    if (b.tahun != null && (!/^\d{4}$/.test(String(b.tahun)) || +b.tahun < 2011 || +b.tahun > 2100)) tolak("tahun harus 2011-2100");
    if (b.kab4 != null) kab4Sah(b.kab4);
    return {jenis: b.jenis, renkon_id: b.renkon_id, kejadian_id: b.kejadian_id, percepatan: per, tahun: b.tahun, kab4: b.kab4};
  });
  const rk = await renkonBoleh(c, v.renkon_id, true); if (!rk) return NO();
  if (!["pelaksanaan", "finalisasi", "ditetapkan", "berlaku", "persiapan"].includes(rk.status)) return gagal(409, `renkon berstatus ${rk.status} tidak menerima gladi baru`);
  const kej = await H.skKejadianRingkas(c.env, p, v.kejadian_id);
  if (!lihatTulis(c, kej)) {   // belum di D1: bila ada di arsip R2, minta dipromosikan dulu; selain itu 404
    if (v.tahun != null) { const a = await bacaArsipKecil(c, v.tahun, v.kab4); if (!(a instanceof Response) && barisArsip(a, v.kejadian_id)) return gagal(409, "kejadian masih di arsip R2: promosikan dulu ke D1 sebelum dijadikan gladi"); }
    return NO();
  }
  if (kej.fase === "digabung" || kej.fase === "dibatalkan") return gagal(409, `kejadian berfase ${kej.fase} tidak bisa dijadikan skenario`);
  if ((kej.dummy ? 1 : 0) !== (rk.dummy ? 1 : 0)) return gagal(409, "renkon dan kejadian harus sama-sama contoh atau sama-sama nyata");
  const lj = await ujiLaju(c, "sk.gladi", 60); if (lj) return lj;
  const id = acak(8), skenario = await susunSkenario(c, {...kej, id: v.kejadian_id}, v.percepatan);
  await H.skBatch(c.env, p, [H.skStmtGladiBaru(c.env, p, {id, jenis: v.jenis, renkon_id: rk.id, kejadian_id: v.kejadian_id, skenario, kini: c.kini, oleh: c.h.oleh, dummy: rk.dummy}),
    H.skStmtJejak(c.env, p, c.h.oleh, "gladi", id, "buat", null, "dirancang", v.jenis, c.kini, rk.dummy)]);
  return json({id}, 201);
}

function rekomendasiSah(a) {
  if (!Array.isArray(a) || a.length < 1 || a.length > 20) tolak("rekomendasi wajib larik 1-20 butir");
  return a.map((x, i) => {
    if (!polos(x)) tolak(`rekomendasi[${i}] harus objek`);
    if (!BIDANG.includes(x.bidang)) tolak(`rekomendasi[${i}].bidang harus ${BIDANG.join(", ")}`);
    return {bidang: x.bidang, teks: bersih(x.teks, `rekomendasi[${i}].teks`, 300, 5) ?? tolak(`rekomendasi[${i}].teks wajib`), tertaut: x.tertaut === true};
  });
}
async function statusGladi(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    if (!Object.hasOwn(GESER_GL, b.ke)) tolak(`ke harus ${Object.keys(GESER_GL).join(", ")}`);
    const r = {ke: b.ke, alasan: bersih(b.alasan, "alasan", 200, 3)};
    if (b.ke === "selesai") r.rekomendasi = JSON.stringify(rekomendasiSah(b.rekomendasi));
    else if (b.rekomendasi != null) tolak("rekomendasi hanya saat selesai");
    if (r.rekomendasi && r.rekomendasi.length > 4000) tolak("rekomendasi terlalu panjang (maks 4000 karakter)");
    return r;
  });
  const x = await gladiBoleh(c, c.p.sid, true); if (!x) return NO();
  if (x.g.status !== GESER_GL[v.ke]) return gagal(409, `status ${x.g.status} tidak bisa menjadi ${v.ke}`);
  const lj = await ujiLaju(c, "sk.gladistatus", 60); if (lj) return lj;
  const res = await H.skBatch(c.env, p, [H.skStmtGladiStatus(c.env, p, x.g.id, x.g.status, v.ke, v.rekomendasi ?? null, c.kini), H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "gladi", x.g.id, "status", x.g.status, v.ke, v.alasan, c.kini, x.g.dummy)]);
  if (!res[0].meta.changes) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id: x.g.id, status: v.ke});
}

async function catatanGladi(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const t = masukan(() => bersih(b.teks, "teks", 300, 3) ?? tolak("teks wajib"));
  const x = await gladiBoleh(c, c.p.sid, true); if (!x) return NO();
  if (!["siap", "berjalan", "dievaluasi"].includes(x.g.status)) return gagal(409, `catatan hanya saat siap, berjalan, atau dievaluasi (sekarang ${x.g.status})`);
  const m = parse(x.g.masalah) ?? [];
  if (!Array.isArray(m) || m.length >= 30) return gagal(409, "matriks masalah penuh (maks 30 butir)");
  const baru = JSON.stringify([...m, {waktu: new Date(c.kini).toISOString(), oleh: c.h.oleh, teks: t}]);
  if (baru.length > 6000) return gagal(409, "matriks masalah melebihi 6000 karakter");
  const lj = await ujiLaju(c, "sk.gladicatatan", 120); if (lj) return lj;
  const res = await H.skBatch(c.env, p, [H.skStmtGladiMasalah(c.env, p, x.g.id, baru, x.g.diubah, c.kini), H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "gladi", x.g.id, "catatan", null, null, t.slice(0, 100), c.kini, x.g.dummy)]);
  if (!res[0].meta.changes) return gagal(409, "gladi berubah oleh pengguna lain; muat ulang");
  return json({id: x.g.id, butir: m.length + 1}, 201);
}

export const RUTE_SIKLUS_RENKON = {
  "GET /api/siklus/renkon": {izin: ["STAF", "BP"], f: daftarRenkon},
  "GET /api/siklus/renkon/:sid": {izin: ["STAF", "BP"], f: detailRenkon},
  "POST /api/siklus/renkon": {izin: ["PDKO"], f: renkonBaru},
  "POST /api/siklus/renkon/:sid/status": {izin: ["KO"], f: statusRenkon},
  "POST /api/siklus/renkon/:sid/asumsi": {izin: ["PDKO"], f: isiRenkon},
  "GET /api/siklus/gladi": {izin: ["STAF"], f: daftarGladi},
  "GET /api/siklus/gladi/:sid": {izin: ["STAF"], f: detailGladi},
  "POST /api/siklus/gladi": {izin: ["KO"], f: gladiBaru},
  "POST /api/siklus/gladi/:sid/status": {izin: ["KO"], f: statusGladi},
  "POST /api/siklus/gladi/:sid/catatan": {izin: ["PDKO"], f: catatanGladi},
};
