/* Logbook Pusdalops (kontrak L1: docs/superpowers/specs/2026-11-01-logbook-pusdalops-design.md; migrasi 0088; medan Juklak 7/2023 + KIB + SK status: migrasi 0094).
   Satu kejadian = banyak entri; angka dampak di entri = nilai TERKINI (entri lanjutan menimpa, tidak menjumlah; null = tidak dilaporkan).
   Semua rute: stafOK(pusdalops|koordalops|pimpinan) PERTAMA, sebelum body/D1. Wilayah = kunci "prov|nama" (prov 2 angka), sama dengan public/data/logbook_riwayat.json.
   Pengingat lanjutan (24/72 jam tanpa entri baru) dibuat src/pengingat.js lewat pendeteksi `logbookLanjutan` memakai logbook_kejadian.terakhir (indeks status, terakhir). */
import {json, gagal, acak, bacaBody} from "./worker.js";
import {stafOK, dalamWilayahStaf} from "./staf.js";
import {superOK} from "./posko.js";
import {laju} from "./bnpb.js";
import {PROV} from "./alun.js";
import {catatBerantai} from "./berantai.js";

const PERAN = ["pusdalops", "koordalops", "pimpinan"], HARI = 864e5, MENIT = 6e4, MAKS_BODY = 8192, MAKS_HARI = 1000;
export const JENIS = ["banjir", "cuaca", "kebakaran_permukiman", "karhutla", "longsor", "gempabumi", "gunungapi", "kekeringan", "kecelakaan", "konflik_sosial", "lainnya", "gelombang_pasang", "tsunami", "wabah"];   // tiga terakhir: panduan resmi Pusdalops (DIBI 103, 108, 201), butuh migrasi 0091
const JENIS_BARU = ["gelombang_pasang", "tsunami", "wabah"];
export const KENDALA = ["akses", "logistik", "sinyal", "air", "personel", "alat_berat", "gambut", "cuaca", "data", "dana", "malam", "sosial", "listrik", "angin"];
export const KEBUTUHAN = ["makanan", "tenda", "sandang", "air_bersih", "obat", "perahu", "material", "alat_berat", "pompa", "dana"];
/* batas wajar seperti BATAS_WAJAR di scripts/umum/laphar_arsip.py; di atasnya ditolak kecuali yakin:true. KERAS = batas mutlak, yakin pun tak menolong. */
export const BATAS_WAJAR = {md: 5000, hilang: 5000, luka: 50000, mengungsi_jiwa: 2e6, mengungsi_kk: 1e6, rumah_rb: 5e5, rumah_rs: 5e5, rumah_rr: 5e5, rumah_terendam: 1e6, luas_ha: 3e6};
const KERAS = 1e8, ANGKA = Object.keys(BATAS_WAJAR), RE_TGL = /^\d{4}-\d\d-\d\d$/, KONTROL = /[\u0000-\u001f\u007f​-‏‪-‮﻿]/;
const KOLOM_ENTRI = ["id", "kejadian_id", "waktu", ...ANGKA, "kendala", "kebutuhan", "catatan", "sumber_instansi", "oleh", "dibuat"];
const tabelBelum = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "logbook belum diaktifkan (migrasi 0088_logbook atau 0094_logbook_juklak belum diterapkan)"); throw e; }
};

const teks = (v, maks, min = 0) => v == null || v === "" ? (min ? undefined : null) : typeof v === "string" && !KONTROL.test(v) && v.trim().length >= min && v.trim().length <= maks ? v.trim() : undefined;
const waktuMs = (v, kini) => {   // epoch ms atau ISO; null = sekarang
  if (v == null) return kini;
  const t = typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(t) && t <= kini + 5 * MENIT && t >= kini - 14 * HARI ? Math.round(t) : undefined;
};
export const wilayahKejadian = o => wilayah(o);
function wilayah(o) {   // kab_kode "prov|nama" (bentuk form staf), atau kab/wilayah berkunci "prov|nama", atau prov_kode/prov (2 angka) + kab (nama)
  const k = [o.kab_kode, o.kab, o.wilayah].find(x => typeof x === "string" && x.includes("|"));
  const [prov, kab, ...sisa] = k ? k.split("|") : [o.prov_kode ?? o.prov, o.kab];
  const nama = typeof kab === "string" ? teks(kab, 60, 2) : null;
  return !sisa.length && typeof prov === "string" && /^\d{2}$/.test(prov) && Object.hasOwn(PROV, prov) && nama ? {prov, kab: nama} : null;
}
function daftarKode(v, sah, nama) {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > sah.length || new Set(v).size !== v.length || v.some(x => !sah.includes(x))) return `${nama} harus larik kode unik dari: ${sah.join(", ")}`;
  return v;
}
/* validasi bagian entri; kembalikan {e} atau {galat} */
export function periksaEntri(o, kini) {
  const e = {};
  for (const k of ANGKA) {
    const v = o[k];
    if (v == null || v === "") { e[k] = null; continue; }
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || (k !== "luas_ha" && !Number.isInteger(v))) return {galat: `${k} harus ${k === "luas_ha" ? "angka" : "bilangan bulat"} >= 0`};
    if (v > KERAS) return {galat: `${k} melewati batas mutlak ${KERAS}`};
    if (v > BATAS_WAJAR[k] && o.yakin !== true) return {galat: `${k}=${v} melewati batas wajar ${BATAS_WAJAR[k]}; periksa lagi atau kirim yakin: true`, status: 400, wajar: k};
    e[k] = v;
  }
  if (e.mengungsi_kk != null && e.mengungsi_jiwa != null && e.mengungsi_kk > e.mengungsi_jiwa && o.yakin !== true) return {galat: "mengungsi_kk lebih besar dari mengungsi_jiwa; periksa lagi atau kirim yakin: true", wajar: "mengungsi_kk"};
  for (const [k, sah] of [["kendala", KENDALA], ["kebutuhan", KEBUTUHAN]]) { const d = daftarKode(o[k], sah, k); if (typeof d === "string") return {galat: d}; e[k] = d; }
  e.catatan = teks(o.catatan, 1000); e.sumber_instansi = teks(o.sumber_instansi, 80);
  if (e.catatan === undefined) return {galat: "catatan maksimal 1000 karakter tanpa karakter kontrol"};
  if (e.sumber_instansi === undefined) return {galat: "sumber_instansi maksimal 80 karakter tanpa karakter kontrol"};
  const w = waktuMs(o.waktu, kini); if (w === undefined) return {galat: "waktu harus epoch ms atau ISO, tidak lebih dari 5 menit ke depan dan 14 hari ke belakang"};
  e.waktu = w;
  const jk = periksaJuklak(o); if (jk.galat) return jk;
  e.jk = jk.j; return {e};
}

/* ---------------- Juklak BNPB 7/2023: medan baru, semua opsional (absen/null = tidak dilaporkan) ----------------
   Disimpan di logbook_entri_juklak (migrasi 0094) sebagai JSON tervalidasi; nilai TERKINI per entri seperti angka dampak. */
export const UMUR = ["0-17", "18-59", "60+"], JK_KELAMIN = ["L", "P"], KORBAN_TERPILAH = {md: "md", luka: "luka", mengungsi: "mengungsi_jiwa"};   // kunci -> kolom total yang tidak boleh dilampaui jumlah terpilah
export const RENTAN = ["bayi", "balita", "ibu_hamil_menyusui", "lansia", "disabilitas"];
export const TINGKAT_RUSAK = ["rb", "rs", "rr", "terendam"];
/* kode prasarana/layanan dasar (Juklak 7/2023, Daftar Data): satuan TETAP per kode, bukan isian bebas (ha untuk lahan, km untuk jalan, unit selain itu) */
export const PRASARANA = {sawah: "ha", lahan: "ha", kebun: "ha", hutan: "ha", kolam: "ha", kios_toko: "unit", pabrik: "unit", jaringan_air: "unit", jaringan_listrik: "unit", jaringan_telekomunikasi: "unit", irigasi: "unit",
  jalan: "km", jembatan: "unit", transportasi: "unit", spbu: "unit", rumah_ibadat: "unit", faskes: "unit", sekolah: "unit", kantor: "unit", pasar: "unit"};
export const KELOMPOK_KEBUTUHAN = ["dana", "sdm", "sarpras", "logistik", "peralatan"];   // standar 5 kelompok: Dana, SDM, Sarana-prasarana, Logistik, Peralatan
export const BATAS_JUKLAK = {kerugian_juta: 1e6, rentan: 2e6, prasarana_unit: 1e5, prasarana_ha: 3e6, prasarana_km: 1e5, kebutuhan_jumlah: 1e7};
const tglSah = v => typeof v === "string" && RE_TGL.test(v) && Number.isFinite(Date.parse(v + "T00:00:00Z")) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
const tolak = (galat, wajar) => { throw {galat, wajar}; };
const objek = (v, nama) => { if (!v || typeof v !== "object" || Array.isArray(v)) tolak(`${nama} harus objek`); return v; };
const larik = (v, nama, maks) => { if (!Array.isArray(v) || v.length > maks) tolak(`${nama} harus larik maksimal ${maks} isi`); return v; };
const bil = (v, nama, batas, o, bulat = true) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || (bulat && !Number.isInteger(v))) tolak(`${nama} harus ${bulat ? "bilangan bulat" : "angka"} >= 0`);
  if (v > KERAS) tolak(`${nama} melewati batas mutlak ${KERAS}`);
  if (v > batas && o.yakin !== true) tolak(`${nama}=${v} melewati batas wajar ${batas}; periksa lagi atau kirim yakin: true`, nama);
  return v;
};
/* teks bebas juklak: tanpa nomor telepon (9+ angka dengan sela 0-3 karakter bukan angka, setelah NFKC supaya angka/tanda lebar penuh ikut terbaca) dan tanpa surel.
   Nomor surat sah ("360/123/BPBD/2026") lolos karena huruf antar-angka lebih dari 3 karakter memutus rangkaian. */
export const RE_HP2 = /\d(?:\D{0,3}\d){8,}/, RE_HP3 = /\d(?:\D{0,3}\d){10,}/;   // longgar (nomor surat/SK yang memang berangka, mis. 360/112/2026): 11+ angka
const tekspendek = (v, nama, maks, min = 1, longgar = false) => {
  const t = teks(v, maks, min); if (t === undefined || t === null) tolak(`${nama} ${min}-${maks} karakter tanpa karakter kontrol`);
  const n = t.normalize("NFKC"); if ((longgar ? RE_HP3 : RE_HP2).test(n) || n.includes("@")) tolak(`${nama} tidak boleh memuat nomor telepon atau surel`);
  return t;
};
export const urlHttps = (v, nama) => {
  const t = tekspendek(v, nama, 300, 12);
  let u; try { u = new URL(t); } catch { tolak(`${nama} bukan URL`); }
  const h = u.hostname;
  if (!t.startsWith("https://") || u.protocol !== "https:" || u.username || u.password || !h.includes(".") || h.endsWith(".") || /^[\d.]+$/.test(h) || h.includes(":") || /\s/.test(t)) tolak(`${nama} harus URL https://nama-situs tanpa kata sandi dan bukan alamat IP`);
  return u.href;
};
export function periksaJuklak(o) {
  const j = {kerugian_juta: null, korban: null, rentan: null, prasarana: null, kebutuhan_rinci: null, pemberi: null, dokumentasi: null, posko: null};
  try {
    if (o.kerugian_juta != null && o.kerugian_juta !== "") j.kerugian_juta = bil(o.kerugian_juta, "kerugian_juta", BATAS_JUKLAK.kerugian_juta, o, false);
    if (o.korban != null) {   // {md|luka|mengungsi: {"0-17"|"18-59"|"60+": {L, P}}}
      const k = {};
      for (const [g, per] of Object.entries(objek(o.korban, "korban"))) {
        if (!Object.hasOwn(KORBAN_TERPILAH, g)) tolak(`korban.${g} tidak dikenal; pilih: ${Object.keys(KORBAN_TERPILAH).join(", ")}`);
        let jumlah = 0; k[g] = {};
        for (const [u, lp] of Object.entries(objek(per, `korban.${g}`))) {
          if (!UMUR.includes(u)) tolak(`korban.${g}.${u}: umur harus salah satu dari ${UMUR.join(", ")}`);
          k[g][u] = {};
          for (const [kel, v] of Object.entries(objek(lp, `korban.${g}.${u}`))) {
            if (!JK_KELAMIN.includes(kel)) tolak(`korban.${g}.${u}.${kel}: jenis kelamin harus L atau P`);
            jumlah += k[g][u][kel] = bil(v, `korban.${g}.${u}.${kel}`, BATAS_WAJAR[KORBAN_TERPILAH[g]], o);
          }
        }
        const total = o[KORBAN_TERPILAH[g]];   // jumlah terpilah tidak boleh melebihi total yang dilaporkan di entri yang sama
        if (typeof total === "number" && jumlah > total && o.yakin !== true) tolak(`jumlah korban.${g} terpilah (${jumlah}) lebih besar dari ${KORBAN_TERPILAH[g]} (${total}); periksa lagi atau kirim yakin: true`, `korban.${g}`);
      }
      j.korban = Object.keys(k).length ? k : null;
    }
    if (o.rentan != null) {
      const r = {};
      for (const [g, v] of Object.entries(objek(o.rentan, "rentan"))) { if (!RENTAN.includes(g)) tolak(`rentan.${g} tidak dikenal; pilih: ${RENTAN.join(", ")}`); r[g] = bil(v, `rentan.${g}`, BATAS_JUKLAK.rentan, o); }
      j.rentan = Object.keys(r).length ? r : null;
    }
    if (o.prasarana != null) {   // [{kode, tingkat?, jumlah}] -> satuan ditetapkan server dari kode
      const p = [], pakai = new Set();
      for (const x of larik(o.prasarana, "prasarana", 40)) {
        objek(x, "prasarana[]");
        if (!Object.hasOwn(PRASARANA, x.kode)) tolak(`prasarana.kode harus salah satu: ${Object.keys(PRASARANA).join(", ")}`);
        const tk = x.tingkat ?? null; if (tk !== null && !TINGKAT_RUSAK.includes(tk)) tolak(`prasarana.tingkat harus salah satu: ${TINGKAT_RUSAK.join(", ")}`);
        const kunci = x.kode + "/" + tk; if (pakai.has(kunci)) tolak(`prasarana ${x.kode} tingkat ${tk} dobel`); pakai.add(kunci);
        const sat = PRASARANA[x.kode];
        p.push({kode: x.kode, tingkat: tk, jumlah: bil(x.jumlah, `prasarana.${x.kode}.jumlah`, BATAS_JUKLAK["prasarana_" + sat], o, sat === "unit"), satuan: sat});
      }
      j.prasarana = p.length ? p : null;
    }
    if (o.kebutuhan_rinci != null) {   // [{kelompok, barang, jumlah, satuan}]
      const b = [];
      for (const x of larik(o.kebutuhan_rinci, "kebutuhan_rinci", 30)) {
        objek(x, "kebutuhan_rinci[]");
        if (!KELOMPOK_KEBUTUHAN.includes(x.kelompok)) tolak(`kebutuhan_rinci.kelompok harus salah satu: ${KELOMPOK_KEBUTUHAN.join(", ")}`);
        const n = bil(x.jumlah, "kebutuhan_rinci.jumlah", BATAS_JUKLAK.kebutuhan_jumlah, o, false); if (!(n > 0)) tolak("kebutuhan_rinci.jumlah harus lebih dari 0");
        b.push({kelompok: x.kelompok, barang: tekspendek(x.barang, "kebutuhan_rinci.barang", 60), jumlah: n, satuan: tekspendek(x.satuan, "kebutuhan_rinci.satuan", 20)});
      }
      j.kebutuhan_rinci = b.length ? b : null;
    }
    if (o.pemberi != null) {   // instansi saja: tanpa nama orang dan nomor telepon
      const m = larik(o.pemberi, "pemberi", 3).map(x => tekspendek(x, "pemberi", 80, 2));
      j.pemberi = m.length ? m : null;
    }
    if (o.dokumentasi != null) { const d = larik(o.dokumentasi, "dokumentasi", 3).map(x => urlHttps(x, "dokumentasi")); j.dokumentasi = d.length ? d : null; }
    if (o.posko != null) {
      const x = objek(o.posko, "posko"), p = {};
      if (typeof x.ada !== "boolean") tolak("posko.ada harus true atau false");
      p.ada = x.ada;
      for (const k of ["berlaku_mulai", "berlaku_sampai"]) if (x[k] != null) { if (!tglSah(x[k])) tolak(`posko.${k} harus YYYY-MM-DD yang sah`); p[k] = x[k]; }
      if (x.sk != null) p.sk = tekspendek(x.sk, "posko.sk", 80, 1, true);
      if (!p.ada && (p.sk || p.berlaku_mulai || p.berlaku_sampai)) tolak("posko.ada=false tidak boleh disertai SK atau masa berlaku");
      if (p.berlaku_mulai && p.berlaku_sampai && p.berlaku_sampai < p.berlaku_mulai) tolak("posko.berlaku_sampai tidak boleh sebelum berlaku_mulai");
      j.posko = p;
    }
  } catch (e) { if (e && typeof e.galat === "string") return {galat: e.galat, wajar: e.wajar}; throw e; }
  return {j};
}

/* ---------------- KIB (Juklak 7/2023; panduan_resmi.json "kib"): PPKK KKK YYYYMMDD I, 16 digit ----------------
   PPKK = kode BPS 4 angka kab/kota (2 provinsi + 2 kab; dikirim klien sebagai kab_bps karena D1 hanya menyimpan nama kab), KKK = kode bencana DIBI (jenis -> kode di bawah, dari panduan_resmi.json "jenis"),
   YYYYMMDD = tanggal mulai kejadian WIB, I = indeks 1-9 kejadian dengan 15 digit awal sama. Sufiks entri -001 (kejadian baru), -002, ... (pengkinian). Jenis tanpa kode DIBI pasti (kecelakaan, lainnya) tidak berKIB. */
export const KODE_BENCANA = {banjir: "101", longsor: "102", gelombang_pasang: "103", cuaca: "104", kekeringan: "105", karhutla: "106", gempabumi: "107", tsunami: "108", gunungapi: "109", wabah: "201", kebakaran_permukiman: "202", konflik_sosial: "301"};
const kibAwal = (prov, kabBps, jenis, mulaiMs) => typeof kabBps === "string" && /^\d{4}$/.test(kabBps) && kabBps.startsWith(prov) && KODE_BENCANA[jenis] && Number.isFinite(mulaiMs)
  ? kabBps + KODE_BENCANA[jenis] + new Date(mulaiMs + 7 * 36e5).toISOString().slice(0, 10).replaceAll("-", "") : null;
async function kibBerikut(env, awal) {   // null bila indeks 1-9 habis
  const m = (await env.DB.prepare("SELECT max(CAST(substr(kib, 16, 1) AS INTEGER)) m FROM logbook_kib WHERE substr(kib, 1, 15) = ?").bind(awal).first()).m ?? 0;
  return m >= 9 ? null : awal + (m + 1);
}
const stmtEntri = (env, kejadian, e, oleh, kini, eid = acak(8)) => env.DB.prepare(`INSERT INTO logbook_entri (${KOLOM_ENTRI}) VALUES (${KOLOM_ENTRI.map(() => "?")})`)
  .bind(eid, kejadian, e.waktu, ...ANGKA.map(k => e[k]), JSON.stringify(e.kendala), JSON.stringify(e.kebutuhan), e.catatan, e.sumber_instansi, oleh, kini);
const JK = ["kerugian_juta", "korban", "rentan", "prasarana", "kebutuhan_rinci", "pemberi", "dokumentasi", "posko"];
/* tiga pernyataan berurutan untuk satu entri: naikkan urut KIB (tanpa baris logbook_kib = tak berpengaruh), simpan entri, simpan medan juklak dengan kib_entri = KIB-<urut 3 digit> */
/* Tabel samping migrasi 0094 mungkin belum ada di D1 (kode terdeploy lebih dulu dari migrasi): cek SEKALI per isolate (hanya `true` dicache selamanya; `false` dicek ulang paling cepat tiap 5 menit),
   tanpa baca D1 per permintaan. Tanpa 0094 semua rute lama jalan dengan kueri lama, medan juklak diabaikan, rute SK 503. */
let JK_ADA = false, JK_CEK = 0;
async function jkAda(env, kini = Date.now()) {
  if (JK_ADA || (JK_CEK && kini - JK_CEK < 3e5)) return JK_ADA;
  JK_CEK = kini;
  JK_ADA = (await env.DB.prepare("SELECT count(*) n FROM sqlite_master WHERE type = 'table' AND name IN ('logbook_kib', 'logbook_entri_juklak', 'logbook_sk')").first()).n === 3;
  return JK_ADA;
}
const MENUNGGU = "menunggu migrasi 0094";
const adaIsiJk = (o, e) => JK.some(k => e.jk?.[k] != null) || o.kab_bps != null;   // klien mengirim sesuatu yang akan dibuang
const stmtEntriJk = (env, kejadian, e, oleh, kini, eid = acak(8)) => !JK_ADA ? [stmtEntri(env, kejadian, e, oleh, kini, eid)] : [
  env.DB.prepare("UPDATE logbook_kib SET urut = urut + 1 WHERE kejadian_id = ?").bind(kejadian), stmtEntri(env, kejadian, e, oleh, kini, eid),
  env.DB.prepare(`INSERT INTO logbook_entri_juklak (entri_id, kib_entri, ${JK}) VALUES (?, (SELECT kib || '-' || printf('%03d', urut) FROM logbook_kib WHERE kejadian_id = ?), ${JK.map(() => "?")})`)
    .bind(eid, kejadian, ...JK.map(k => e.jk?.[k] == null ? null : typeof e.jk[k] === "object" ? JSON.stringify(e.jk[k]) : e.jk[k]))];
const keluarEntri = r => { const o = {...r, kendala: JSON.parse(r.kendala), kebutuhan: JSON.parse(r.kebutuhan), ...("dummy" in r ? {dummy: !!r.dummy} : {})};
  for (const k of JK.slice(1)) o[k] = typeof r[k] === "string" ? JSON.parse(r[k]) : null;
  return o; };
const keluarKej = k => ({...k, dummy: !!k.dummy});
const BASE_KEJ = "k.id, k.jenis, k.prov, k.kab, k.kec, k.desa, k.lat, k.lon, k.mulai, k.status, k.terakhir, k.dibuat, k.diubah, k.dummy";
const kolKej = () => JK_ADA ? BASE_KEJ + ", b.kib" : BASE_KEJ, dariKej = () => JK_ADA ? "logbook_kejadian k LEFT JOIN logbook_kib b ON b.kejadian_id = k.id" : "logbook_kejadian k";
const BASE_ENT = [...["id", "kejadian_id", "waktu", ...ANGKA, "kendala", "kebutuhan", "catatan", "sumber_instansi", "dibuat"].map(c => "e." + c)];
const kolEnt = () => (JK_ADA ? [...BASE_ENT, "j.kib_entri AS kib", ...JK.map(c => "j." + c)] : BASE_ENT).join(", "), dariEnt = () => JK_ADA ? "logbook_entri e LEFT JOIN logbook_entri_juklak j ON j.entri_id = e.id" : "logbook_entri e";
const luarWilayah = (req, provs) => provs.every(p => dalamWilayahStaf(req, [p])) && dalamWilayahStaf(req, provs) ? null : gagal(403, "provinsi di luar wilayah staf");
const BATAS_TULIS = [[3600e3, 120]];   // tulis logbook per pelaku per jam
const lajuTulis = (env, oleh, kini) => laju(env, "lb:" + oleh, "logbook_tulis", BATAS_TULIS, kini);
const pintu = async (env, req) => { const oleh = await stafOK(env, req, PERAN); return oleh ? String(oleh).slice(0, 64) : null; };
const baca = async req => { const b = await bacaBody(req, MAKS_BODY); return b.galat ? {r: gagal(b.status || 400, b.galat)} : {o: b.o}; };

async function buat(env, req, kini) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const b = await baca(req); if (b.r) return b.r;
  const w = wilayah(b.o); if (w) { const lw = luarWilayah(req, [w.prov]); if (lw) return lw; }
  return buatKejadian(env, oleh, b.o, kini);
}
/* Dipakai juga src/medsos_antre.js (butir pantauan jadi kejadian): validasi dan tulis satu tempat. Pemanggil sudah lolos gerbang staf dan membaca body. */
export async function buatKejadian(env, oleh, o, kini) {
  await jkAda(env, kini);
  const w = wilayah(o);
  if (!JENIS.includes(o.jenis)) return gagal(400, `jenis harus salah satu: ${JENIS.join(", ")}`);
  if (!w) return gagal(400, 'kab harus kunci wilayah "prov|nama" (prov 2 angka dikenal)');
  const kec = teks(o.kec, 60), desa = teks(o.desa, 60);
  if (kec === undefined || desa === undefined) return gagal(400, "kec/desa maksimal 60 karakter tanpa karakter kontrol");
  const ada = o.lat != null || o.lon != null;
  if (ada && (typeof o.lat !== "number" || typeof o.lon !== "number" || !(o.lat >= -11.5 && o.lat <= 6.5) || !(o.lon >= 94 && o.lon <= 142))) return gagal(400, "lat dan lon wajib berpasangan di dalam Indonesia");
  const mt = typeof o.mulai === "string" && /^\d{4}-\d\d-\d\d/.test(o.mulai) ? Date.parse(o.mulai) : NaN;
  if (!Number.isFinite(mt) || mt > kini + HARI || mt < kini - 400 * HARI) return gagal(400, "mulai harus tanggal ISO (YYYY-MM-DD atau waktu lengkap), tidak lebih dari 1 hari ke depan dan 400 hari ke belakang");
  const p = periksaEntri(typeof o.entri === "object" && o.entri && !Array.isArray(o.entri) ? {yakin: o.yakin, ...o.entri} : o, kini); if (p.galat) return json({galat: p.galat, wajar: p.wajar}, 400);
  const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
  const id = acak(8), awal = JK_ADA ? kibAwal(w.prov, o.kab_bps, o.jenis, mt) : null;
  for (let coba = 0; ; coba++) {   // dua kejadian serentak bisa berebut indeks KIB yang sama: UNIQUE menolak salah satu, hitung ulang
    const kib = awal ? await kibBerikut(env, awal) : null;
    try { await env.DB.batch([env.DB.prepare(`INSERT INTO logbook_kejadian (id, jenis, prov, kab, kec, desa, lat, lon, mulai, status, terakhir, dibuat, diubah, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'buka', ?, ?, ?, ?)`)
      .bind(id, o.jenis, w.prov, w.kab, kec, desa, ada ? o.lat : null, ada ? o.lon : null, new Date(mt).toISOString(), kini, kini, kini, oleh),
      ...kib ? [env.DB.prepare("INSERT INTO logbook_kib (kejadian_id, kib, urut) VALUES (?, ?, 0)").bind(id, kib)] : [], ...stmtEntriJk(env, id, p.e, oleh, kini)]); break; }
    catch (e) {
      if (kib && coba < 3 && /UNIQUE constraint failed/i.test(String(e?.message || e))) continue;
      if (JENIS_BARU.includes(o.jenis) && /CHECK constraint failed/i.test(String(e?.message || e))) return gagal(503, "jenis ini belum aktif (migrasi 0091_logbook_jenis belum diterapkan)"); throw e;
    }
  }
  await catatBerantai(env, {jenis: o.jenis, prov: w.prov, kab: w.kab, kejadian: id, kini});
  return json({kejadian: keluarKej(await env.DB.prepare(`SELECT ${kolKej()} FROM ${dariKej()} WHERE k.id = ?`).bind(id).first()), entri: keluarEntri(await env.DB.prepare(`SELECT ${kolEnt()} FROM ${dariEnt()} WHERE e.kejadian_id = ?`).bind(id).first()), ...!JK_ADA && adaIsiJk(o, p.e) ? {juklak: MENUNGGU} : {}}, 201);
}
async function lanjut(env, req, kini, id) {
  await jkAda(env, kini);
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const b = await baca(req); if (b.r) return b.r;
  const k = await env.DB.prepare(JK_ADA ? "SELECT k.id, k.status, k.jenis, k.prov, k.kab, k.mulai, b.kib FROM logbook_kejadian k LEFT JOIN logbook_kib b ON b.kejadian_id = k.id WHERE k.id = ?" : "SELECT id, status, jenis, prov, kab FROM logbook_kejadian WHERE id = ?").bind(id).first();
  if (!k) return gagal(404, "kejadian tidak ada");
  const lw = luarWilayah(req, [k.prov]); if (lw) return lw;
  if (k.status !== "buka") return gagal(409, "kejadian sudah ditutup");
  const p = periksaEntri(b.o, kini); if (p.galat) return json({galat: p.galat, wajar: p.wajar}, 400);
  const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
  const eid = acak(8), awal = k.kib || !JK_ADA ? null : kibAwal(k.prov, b.o.kab_bps, k.jenis, Date.parse(k.mulai));
  /* kejadian lama tanpa KIB dapat KIB pada entri ini bila klien mengirim kab_bps; urut dimulai dari jumlah entri yang sudah ada */
  for (let coba = 0; ; coba++) {   // tabrakan UNIQUE (indeks KIB direbut kejadian lain, atau entri serentak sudah memberi KIB kejadian ini): hitung ulang, jangan ditelan diam-diam
    const sudah = awal && (await env.DB.prepare("SELECT 1 x FROM logbook_kib WHERE kejadian_id = ?").bind(id).first());
    const kib = awal && !sudah ? await kibBerikut(env, awal) : null, lama = kib ? (await env.DB.prepare("SELECT count(*) n FROM logbook_entri WHERE kejadian_id = ?").bind(id).first()).n : 0;
    try { await env.DB.batch([...kib ? [env.DB.prepare("INSERT INTO logbook_kib (kejadian_id, kib, urut) VALUES (?, ?, ?)").bind(id, kib, lama)] : [], ...stmtEntriJk(env, id, p.e, oleh, kini, eid),
      env.DB.prepare("UPDATE logbook_kejadian SET terakhir = ?, diubah = ? WHERE id = ?").bind(kini, kini, id)]); break; }
    catch (e) { if (awal && coba < 3 && /UNIQUE constraint failed/i.test(String(e?.message || e))) continue; throw e; }
  }
  await catatBerantai(env, {jenis: k.jenis, prov: k.prov, kab: k.kab, kejadian: id, kini});
  return json({entri: keluarEntri(await env.DB.prepare(`SELECT ${kolEnt()} FROM ${dariEnt()} WHERE e.id = ?`).bind(eid).first()), ...!JK_ADA && adaIsiJk(b.o, p.e) ? {juklak: MENUNGGU} : {}}, 201);
}
/* G1: tutup WAJIB membawa tgl_tuntas dan kondisi_akhir. Detail disimpan di logbook_tutup (migrasi 0098); tanpa tabelnya kejadian tetap ditutup dan balasan memuat tutup_detail.
   Kejadian lama yang sudah tutup tanpa baris di logbook_tutup tetap sah. */
async function tutup(env, req, kini, id) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const b = await baca(req); if (b.r) return b.r;
  let tgl, kondisi;
  try {
    tgl = b.o.tgl_tuntas; if (!tglSah(tgl)) tolak("tgl_tuntas wajib, YYYY-MM-DD yang sah");
    if (tgl > new Date(kini + 7 * 36e5).toISOString().slice(0, 10)) tolak("tgl_tuntas tidak boleh di masa depan");
    kondisi = tekspendek(b.o.kondisi_akhir, "kondisi_akhir", 300, 3);
  } catch (e) { if (e && typeof e.galat === "string") return gagal(400, e.galat); throw e; }
  const k = await env.DB.prepare("SELECT status, mulai, prov FROM logbook_kejadian WHERE id = ?").bind(id).first();
  if (k) { const lw = luarWilayah(req, [k.prov]); if (lw) return lw; }
  const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
  if (!k) return gagal(404, "kejadian tidak ada");
  if (k.status !== "buka") return gagal(409, "kejadian sudah ditutup");
  if (tgl < k.mulai.slice(0, 10)) return gagal(400, "tgl_tuntas tidak boleh sebelum tanggal mulai kejadian (" + k.mulai.slice(0, 10) + ")");
  const ubah = env.DB.prepare("UPDATE logbook_kejadian SET status = 'tutup', diubah = ? WHERE id = ? AND status = 'buka'").bind(kini, id);
  let r, extra = {};
  try { r = (await env.DB.batch([ubah, env.DB.prepare("INSERT INTO logbook_tutup (kejadian_id, tgl_tuntas, kondisi_akhir, oleh, dibuat) SELECT ?, ?, ?, ?, ? WHERE changes() > 0").bind(id, tgl, kondisi, oleh, kini)]))[0]; }
  catch (e) { if (!/no such table: logbook_tutup/i.test(String(e?.message || e))) throw e; r = await ubah.run(); extra = {tutup_detail: "menunggu migrasi 0098"}; }
  if (!r.meta.changes) return gagal(409, "kejadian sudah ditutup");
  return json({ok: true, id, status: "tutup", tgl_tuntas: tgl, kondisi_akhir: kondisi, ...extra});
}
/* kejadian buka di kab dalam 14 hari terakhir (mulai ATAU entri terakhir), lengkap dengan entri terkini untuk mengisi form lanjutan */
async function buka(env, req, url, kini) {
  await jkAda(env, kini);
  if (!await pintu(env, req)) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const q = url.searchParams.get("kab") ?? "", w = wilayah(q.includes("|") ? {kab: q} : {prov: url.searchParams.get("prov"), kab: q});
  if (!w) return gagal(400, 'kab wajib kunci wilayah "prov|nama" (atau kab + prov)');
  const kej = (await env.DB.prepare(`SELECT ${kolKej()} FROM ${dariKej()} WHERE k.prov = ? AND k.kab = ? AND k.status = 'buka' AND k.terakhir >= ? ORDER BY k.terakhir DESC LIMIT 50`).bind(w.prov, w.kab, kini - 14 * HARI).all()).results;
  if (!kej.length) return json({kejadian: []}, 200, {"cache-control": "no-store"});
  const ent = (await env.DB.prepare(`SELECT ${kolEnt()} FROM ${dariEnt()} WHERE e.kejadian_id IN (SELECT value FROM json_each(?)) AND e.rowid = (SELECT x.rowid FROM logbook_entri x WHERE x.kejadian_id = e.kejadian_id ORDER BY x.waktu DESC, x.rowid DESC LIMIT 1)`)
    .bind(JSON.stringify(kej.map(k => k.id))).all()).results;
  const per = new Map(ent.map(e => [e.kejadian_id, keluarEntri(e)]));
  return json({kejadian: kej.map(k => ({...keluarKej(k), entri_terkini: per.get(k.id) ?? null, perlu_tutup: kini - k.terakhir > 7 * HARI}))}, 200, {"cache-control": "no-store"});
}
/* periode 07.00-07.00 WIB yang DIMULAI pada tanggal T: dari T 07.00 WIB (= T 00.00 UTC) sampai T+1 07.00 WIB, kiri-tutup kanan-buka. Entri pukul 00.00-07.00 WIB masuk tanggal sebelumnya;
   periode yang memuat "sekarang" = tanggal WIB dari (sekarang - 7 jam). Laporan harian pagi hari T+1 memakai tgl=T. */
async function hari(env, req, url) {
  await jkAda(env);
  if (!await pintu(env, req)) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const tgl = url.searchParams.get("tgl") ?? "", t = RE_TGL.test(tgl) ? Date.parse(tgl + "T00:00:00Z") : NaN;
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== tgl) return gagal(400, "tgl harus YYYY-MM-DD yang sah");
  const dari = t, sampai = t + HARI;
  const rows = (await env.DB.prepare(`SELECT ${kolEnt()}, k.jenis, k.prov, k.kab, k.kec, k.desa, k.status, k.dummy, k.mulai AS kejadian_mulai${JK_ADA ? ", b.kib AS kejadian_kib" : ""} FROM ${dariEnt()} JOIN logbook_kejadian k ON k.id = e.kejadian_id${JK_ADA ? " LEFT JOIN logbook_kib b ON b.kejadian_id = k.id" : ""}
    WHERE e.waktu >= ? AND e.waktu < ? ORDER BY e.waktu LIMIT ${MAKS_HARI + 1}`).bind(dari, sampai).all()).results;
  return json({tgl, dari, sampai, terpotong: rows.length > MAKS_HARI, entri: rows.slice(0, MAKS_HARI).map(r => ({...keluarEntri(r), kib: r.kib ?? r.kejadian_kib}))}, 200, {"cache-control": "no-store"});
}

/* ---------------- SK status darurat per kejadian (logbook_sk, migrasi 0094): SK provinsi didahulukan saat dibaca ---------------- */
const TINGKAT_SK = ["siaga", "tanggap", "transisi"], MAKS_SK = 30;
async function skTambah(env, req, kini, id) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  if (!await jkAda(env, kini)) return gagal(503, "SK status belum aktif (" + MENUNGGU + ")");
  const b = await baca(req); if (b.r) return b.r;
  const kej = await env.DB.prepare("SELECT prov FROM logbook_kejadian WHERE id = ?").bind(id).first(); if (!kej) return gagal(404, "kejadian tidak ada");
  const lw = luarWilayah(req, [kej.prov]); if (lw) return lw;
  const o = b.o; let v;
  try {
    if (!TINGKAT_SK.includes(o.tingkat)) tolak(`tingkat harus salah satu: ${TINGKAT_SK.join(", ")}`);
    if (!["prov", "kab"].includes(o.wilayah)) tolak("wilayah harus prov atau kab");
    if (o.tgl_sk != null && !tglSah(o.tgl_sk)) tolak("tgl_sk harus YYYY-MM-DD yang sah");
    if (!tglSah(o.tmt_mulai)) tolak("tmt_mulai wajib, YYYY-MM-DD yang sah");
    if (o.tmt_selesai != null && (!tglSah(o.tmt_selesai) || o.tmt_selesai < o.tmt_mulai)) tolak("tmt_selesai harus YYYY-MM-DD yang sah dan tidak sebelum tmt_mulai");
    const ke = o.perpanjangan_ke ?? 0; if (!Number.isInteger(ke) || ke < 0 || ke > 20) tolak("perpanjangan_ke harus bilangan bulat 0-20 (0 = SK awal)");
    v = {tingkat: o.tingkat, wilayah: o.wilayah, nomor: tekspendek(o.nomor, "nomor", 80, 1, true), tgl_sk: o.tgl_sk ?? null, tmt_mulai: o.tmt_mulai, tmt_selesai: o.tmt_selesai ?? null, perpanjangan_ke: ke, tautan: o.tautan == null ? null : urlHttps(o.tautan, "tautan")};
  } catch (e) { if (e && typeof e.galat === "string") return gagal(400, e.galat); throw e; }
  if ((await env.DB.prepare("SELECT count(*) n FROM logbook_sk WHERE kejadian_id = ?").bind(id).first()).n >= MAKS_SK) return gagal(409, `maksimal ${MAKS_SK} SK per kejadian`);
  const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
  const sid = acak(8);
  try { await env.DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tgl_sk, tmt_mulai, tmt_selesai, perpanjangan_ke, tautan, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(sid, id, v.tingkat, v.wilayah, v.nomor, v.tgl_sk, v.tmt_mulai, v.tmt_selesai, v.perpanjangan_ke, v.tautan, oleh, kini).run(); }
  catch (e) { const m = String(e?.message || e); if (/UNIQUE constraint failed/i.test(m)) return gagal(409, "nomor SK ini sudah tercatat untuk kejadian ini"); if (/CHECK constraint failed/i.test(m)) return gagal(400, "isian SK ditolak skema (tanggal, tautan, atau panjang)"); throw e; }
  return json({sk: await env.DB.prepare(`SELECT ${KOL_SK} FROM logbook_sk WHERE id = ?`).bind(sid).first()}, 201);
}
const KOL_SK = "id, kejadian_id, tingkat, wilayah, nomor, tgl_sk, tmt_mulai, tmt_selesai, perpanjangan_ke, tautan, dibuat";
async function skDaftar(env, req, id) {
  if (!await pintu(env, req)) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  if (!await jkAda(env)) return gagal(503, "SK status belum aktif (" + MENUNGGU + ")");
  if (!await env.DB.prepare("SELECT 1 x FROM logbook_kejadian WHERE id = ?").bind(id).first()) return gagal(404, "kejadian tidak ada");
  const r = await env.DB.prepare(`SELECT ${KOL_SK} FROM logbook_sk WHERE kejadian_id = ? ORDER BY (wilayah = 'prov') DESC, tmt_mulai DESC, perpanjangan_ke DESC, dibuat DESC`).bind(id).all();
  return json({sk: r.results}, 200, {"cache-control": "no-store"});
}

/* G2: papan SK aktif nasional. SK aktif = tmt_selesai >= hari ini (WIB) atau tanpa tmt_selesai, digabung kejadiannya (PK). Dua cabang UNION ALL (IS NULL; >= hari ini), masing-masing SEARCH di logbook_sk_selesai (0098): OR biasa jadi SCAN indeks yang melewati semua SK kedaluwarsa.
   perlu_cek = kejadian sudah tutup ATAU tanpa entri baru > 7 hari. */
const MAKS_SK_AKTIF = 1000;
async function skAktif(env, req, kini) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  if (!await jkAda(env, kini)) return gagal(503, "SK status belum aktif (" + MENUNGGU + ")");
  const lj = await laju(env, "lb:" + oleh, "logbook_baca", [[3600e3, 120]], kini); if (lj) return lj;
  const tgl = new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
  const rows = (await env.DB.prepare(`SELECT s.id, s.kejadian_id, s.tingkat, s.wilayah, s.nomor, s.tmt_mulai, s.tmt_selesai, s.perpanjangan_ke, k.jenis, k.prov, k.kab, k.status, k.terakhir, k.dummy
    FROM (SELECT * FROM logbook_sk WHERE tmt_selesai IS NULL UNION ALL SELECT * FROM logbook_sk WHERE tmt_selesai >= ?) s JOIN logbook_kejadian k ON k.id = s.kejadian_id ORDER BY s.tmt_selesai LIMIT ${MAKS_SK_AKTIF + 1}`).bind(tgl).all()).results;
  const sk = rows.slice(0, MAKS_SK_AKTIF).map(r => {
    const selesai = r.status === "tutup", tanpa = Math.max(0, Math.floor((kini - r.terakhir) / HARI));
    return {id: r.id, kejadian_id: r.kejadian_id, jenis: r.jenis, prov: r.prov, kab: r.kab, tingkat: r.tingkat, wilayah: r.wilayah, nomor: r.nomor, tmt_mulai: r.tmt_mulai, tmt_selesai: r.tmt_selesai, perpanjangan_ke: r.perpanjangan_ke,
      sisa_hari: r.tmt_selesai ? Math.round((Date.parse(r.tmt_selesai + "T00:00:00Z") - Date.parse(tgl + "T00:00:00Z")) / HARI) : null, kejadian_selesai: selesai, tanpa_entri_hari: tanpa, perlu_cek: selesai || tanpa > 7, dummy: !!r.dummy};
  });
  const per = (kunci, init) => { const m = new Map(); for (const x of sk) { const a = m.get(x[kunci]) ?? init(x); a.sk++; if (x.perlu_cek) a.perlu_cek++; m.set(x[kunci], a); } return m; };
  return json({tanggal: tgl, terpotong: rows.length > MAKS_SK_AKTIF, jumlah: sk.length, perlu_cek: sk.filter(x => x.perlu_cek).length,
    per_tingkat: TINGKAT_SK.map(t => per("tingkat", () => ({tingkat: t, sk: 0, perlu_cek: 0})).get(t) ?? {tingkat: t, sk: 0, perlu_cek: 0}),
    per_provinsi: [...per("prov", x => ({prov: x.prov, sk: 0, perlu_cek: 0})).values()].sort((a, b) => a.prov < b.prov ? -1 : 1), sk}, 200, {"cache-control": "no-store"});
}

/* ---------------- dummy (DUMMY.md): Super Admin saja; baris dummy=1 bertanda jelas, dihapus bersih oleh aksi hapus ---------------- */
const KAB_BPS = {"33|Banjarnegara": "3304", "33|Cilacap": "3301", "14|Rokan Hilir": "1407", "33|Magelang": "3308"};   // dummy saja: kunci "prov|nama" -> kode BPS untuk KIB
const SK_CONTOH = [   // di kejadian pertama (longsor Banjarnegara): SK kab ditulis dulu agar uji urutan prov-dulu bermakna
  {tingkat: "tanggap", wilayah: "kab", nomor: "360/101/2026", tgl_sk: "2026-10-30", tmt_mulai: "2026-10-30", tmt_selesai: "2026-11-05", perpanjangan_ke: 0, tautan: "https://contoh.invalid/sk/kab-360-101"},
  {tingkat: "tanggap", wilayah: "prov", nomor: "188/445/2026", tgl_sk: "2026-10-31", tmt_mulai: "2026-10-31", tmt_selesai: "2026-11-14", perpanjangan_ke: 1, tautan: "https://contoh.invalid/sk/prov-188-445"}];
const CONTOH = [   // [jenis, kab, kec, desa, status, [[menit lalu, dampak...]]] — angka dari rantai nyata: entri lanjutan menimpa, mengungsi_kk <= mengungsi_jiwa
  ["longsor", "33|Banjarnegara", "Pandanarum", "Tulis", "buka", [[300, {md: 1, hilang: 4, luka: 3, mengungsi_jiwa: 120, mengungsi_kk: 38, rumah_rb: 3, rumah_rs: 2, rumah_rr: 5, kendala: ["akses", "sinyal"], kebutuhan: ["tenda", "makanan"]}],
    [60, {md: 2, hilang: 2, luka: 6, mengungsi_jiwa: 210, mengungsi_kk: 66, rumah_rb: 5, rumah_rs: 4, rumah_rr: 9, kendala: ["akses", "alat_berat"], kebutuhan: ["tenda", "makanan", "alat_berat"],
      jk: {kerugian_juta: 4500.5, korban: {md: {"0-17": {L: 0, P: 1}, "18-59": {L: 1, P: 0}, "60+": {L: 0, P: 0}}, luka: {"18-59": {L: 3, P: 2}, "60+": {L: 1, P: 0}}, mengungsi: {"0-17": {L: 40, P: 38}, "18-59": {L: 60, P: 52}, "60+": {L: 12, P: 8}}},
        rentan: {bayi: 6, balita: 21, ibu_hamil_menyusui: 9, lansia: 20, disabilitas: 3}, prasarana: [{kode: "jalan", tingkat: "rb", jumlah: 1.8}, {kode: "jembatan", tingkat: "rs", jumlah: 1}, {kode: "sekolah", tingkat: "rr", jumlah: 2}, {kode: "sawah", jumlah: 12.5}],
        kebutuhan_rinci: [{kelompok: "logistik", barang: "Tenda keluarga", jumlah: 80, satuan: "unit"}, {kelompok: "logistik", barang: "Beras", jumlah: 5, satuan: "ton"}, {kelompok: "peralatan", barang: "Ekskavator", jumlah: 2, satuan: "unit"}, {kelompok: "dana", barang: "Dana siap pakai", jumlah: 250, satuan: "juta rupiah"}],
        pemberi: ["BPBD Banjarnegara", "Basarnas Cilacap"], dokumentasi: ["https://contoh.invalid/dokumentasi/longsor-tulis"], posko: {ada: true, sk: "360/112/2026", berlaku_mulai: "2026-10-30", berlaku_sampai: "2026-11-13"}}}]]],
  ["banjir", "33|Cilacap", "Kroya", "Pucung Kidul", "buka", [[30 * 60, {mengungsi_jiwa: 800, mengungsi_kk: 250, rumah_terendam: 310, rumah_rr: 12, kendala: ["listrik", "logistik"], kebutuhan: ["perahu", "air_bersih", "obat"]}]]],
  ["karhutla", "14|Rokan Hilir", "Bangko", "Bagan Batu", "buka", [[200, {luas_ha: 35.5, kendala: ["gambut", "air", "angin"], kebutuhan: ["pompa", "air_bersih"]}], [45, {luas_ha: 48.2, kendala: ["gambut", "air", "malam"], kebutuhan: ["pompa"]}]]],
  ["kebakaran_permukiman", "33|Magelang", "Mertoyudan", "Danurejo", "tutup", [[500, {md: 0, luka: 2, mengungsi_jiwa: 40, mengungsi_kk: 12, rumah_rb: 4, rumah_rs: 1, kendala: ["sosial"], kebutuhan: ["sandang", "makanan"]}], [90, {md: 0, luka: 2, mengungsi_jiwa: 40, mengungsi_kk: 12, rumah_rb: 4, rumah_rs: 1, kendala: [], kebutuhan: ["sandang"]}]]]];
async function dummyRute(env, req, kini) {
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await baca(req); if (b.r) return b.r;
  await jkAda(env, kini);
  if (b.o.aksi === "hapus") {
    try { await env.DB.prepare("DELETE FROM logbook_tutup WHERE kejadian_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)").run(); } catch (e) { if (!/no such table/i.test(String(e?.message || e))) throw e; }   // migrasi 0098 mungkin belum ada
    const [, , , e, k, p] = !JK_ADA ? [0, 0, 0, ...await env.DB.batch([env.DB.prepare("DELETE FROM logbook_entri WHERE kejadian_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"), env.DB.prepare("DELETE FROM pengingat WHERE jenis = 'logbook_lanjutan' AND sumber_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"), env.DB.prepare("DELETE FROM logbook_kejadian WHERE dummy = 1")]).then(r => [r[0], 0, r[2]])] : await env.DB.batch([env.DB.prepare("DELETE FROM logbook_sk WHERE kejadian_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"),
      env.DB.prepare("DELETE FROM logbook_entri_juklak WHERE entri_id IN (SELECT e.id FROM logbook_entri e JOIN logbook_kejadian k ON k.id = e.kejadian_id WHERE k.dummy = 1)"),
      env.DB.prepare("DELETE FROM logbook_kib WHERE kejadian_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"), env.DB.prepare("DELETE FROM logbook_entri WHERE kejadian_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"),
      env.DB.prepare("DELETE FROM pengingat WHERE jenis = 'logbook_lanjutan' AND sumber_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"), env.DB.prepare("DELETE FROM logbook_kejadian WHERE dummy = 1")]);
    return json({ok: true, kejadian: p.meta.changes, entri: e.meta.changes});
  }
  if (b.o.aksi !== "isi") return gagal(400, "aksi harus isi/hapus");
  if ((await env.DB.prepare("SELECT count(*) n FROM logbook_kejadian WHERE dummy = 1").first()).n) return gagal(409, "data dummy logbook sudah ada; hapus dulu dengan 🧹");
  const st = [];
  for (const [jenis, kunci, kec, desa, status, entri] of CONTOH) {
    const [prov, kab] = kunci.split("|"), id = acak(8), awal = kini - entri[0][0] * 6e4;
    st.push(env.DB.prepare(`INSERT INTO logbook_kejadian (id, jenis, prov, kab, kec, desa, mulai, status, terakhir, dibuat, diubah, dibuat_oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dummy', 1)`)
      .bind(id, jenis, prov, kab, kec, desa, new Date(awal).toISOString(), status, kini - entri.at(-1)[0] * 6e4, awal, kini));
    const pre = JK_ADA ? kibAwal(prov, KAB_BPS[kunci], jenis, awal) : null, kib = pre ? await kibBerikut(env, pre) : null;
    if (kib) st.push(env.DB.prepare("INSERT INTO logbook_kib (kejadian_id, kib, urut) VALUES (?, ?, 0)").bind(id, kib));
    for (const [menit, d] of entri) st.push(...stmtEntriJk(env, id, {...Object.fromEntries(ANGKA.map(k => [k, d[k] ?? null])), kendala: d.kendala, kebutuhan: d.kebutuhan, catatan: "Data dummy untuk menilai layar", sumber_instansi: "Dummy", waktu: kini - menit * 6e4,
      jk: {...(periksaJuklak({yakin: true, ...d.jk, md: d.md, luka: d.luka, mengungsi_jiwa: d.mengungsi_jiwa}).j ?? {})}}, "dummy", kini));
    if (JK_ADA && jenis === "longsor") for (const x of SK_CONTOH) st.push(env.DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tgl_sk, tmt_mulai, tmt_selesai, perpanjangan_ke, tautan, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dummy', ?)")
      .bind(acak(8), id, x.tingkat, x.wilayah, x.nomor, x.tgl_sk, x.tmt_mulai, x.tmt_selesai, x.perpanjangan_ke, x.tautan, kini));
  }
  await env.DB.batch(st);
  return json({ok: true, kejadian: CONTOH.length, entri: CONTOH.reduce((a, c) => a + c[5].length, 0)}, 201);
}

/* Turunan internal (R2 MEDIA, dibuat scripts/data/logbook_internal.py): daftar putih nama -> kunci tetap, masukan mentah tak pernah jadi kunci R2 */
const TURUNAN = new Set(["rapor_bpbd", "rekomendasi", "penanganan"]), SERUPA = /^serupa_\d{2}$/;
async function turunan(env, req, kini, nama) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  if (!TURUNAN.has(nama) && !SERUPA.test(nama)) return gagal(404, "tidak ditemukan");
  const lj = await laju(env, "lb:" + oleh, "logbook_baca", [[3600e3, 120]], kini); if (lj) return lj;
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersambung");
  const o = await env.MEDIA.get(`internal/pusdalops-logbook/turunan/${nama}.json`); if (!o) return gagal(404, "tidak ditemukan");
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", "vary": "cookie", "x-content-type-options": "nosniff"}});
}

const T = tabelBelum;
export const RUTE_LOGBOOK = {
  "POST /api/logbook/kejadian": T((env, req, url, kini) => buat(env, req, kini)),
  "POST /api/logbook/kejadian/:id/entri": T((env, req, url, kini, ctx, id) => lanjut(env, req, kini, id)),
  "POST /api/logbook/kejadian/:id/tutup": T((env, req, url, kini, ctx, id) => tutup(env, req, kini, id)),
  "POST /api/logbook/kejadian/:id/sk": T((env, req, url, kini, ctx, id) => skTambah(env, req, kini, id)),
  "GET /api/logbook/kejadian/:id/sk": T((env, req, url, kini, ctx, id) => skDaftar(env, req, id)),
  "GET /api/logbook/sk/aktif": T((env, req, url, kini) => skAktif(env, req, kini)),
  "GET /api/logbook/buka": T((env, req, url, kini) => buka(env, req, url, kini)),
  "GET /api/logbook/hari": T((env, req, url) => hari(env, req, url)),
  "GET /api/logbook/turunan/:nama": (env, req, url, kini, ctx, nama) => turunan(env, req, kini, nama),
  "POST /api/logbook/dummy": T((env, req, url, kini) => dummyRute(env, req, kini)),
};
