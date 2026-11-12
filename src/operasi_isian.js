/* Operasi Udara: isian manual (K12..K19, data/kajian-bnpb/operasi-udara/DESAIN-TEKNIS.md bagian 7; skema migrations/0126_operasi_isian.sql). UD-27: gelar, sortie, hasil, temuan, hapus, riwayat.
   Tulis = stafPeran PERAN_TULIS atau modOK (moderator ber-ADMIN_TOKEN). BUKAN adminOK: akun gerbang AKUN_SITUS* (pimpinan, pembaca) tidak boleh menulis. Baca riwayat = hak baca /api/operasi/peta.
   Pengisi dicatat "staf:<id>" / "admin:<hash12>", tanpa nama. Validasi di sini, bukan di layar. Isian manual menang atas bot WA (K15): penjagaan bot ada di catatOperasi (src/operasi_udara.js).
   Tidak menulis ke public/. Nama kru tidak disimpan: kolom bebas (alasan, lokasi, misi) dipangkas dan dibatasi. */
import {json, gagal, bacaBody, adminOK} from "./worker.js";
import {tglSah, wib, modOK} from "./posko.js";
import {stafPeran, pemirsaLihat} from "./staf.js";
import {PERAN_BACA, dalamBbox, bungkus} from "./operasi_udara.js";
import {opIsianTerhapus as hapusSet, opLajuIsian, opStmtIsian as isianStmt, opStmtLog as logStmt, opStmtKejadian, opArmada, opBaseAda, opStatusTanggal, opStmtStatusManual, opStmtStatusJadiManual,
  opGerakById, opGerakKembar, opSisipGerak, opStmtUbahGerak, opHasil, opStmtHasil, opTemuanById, opSisipTemuan, opStmtUbahTemuan, opBatalSisip, opButir, opRiwayat, batchTulis} from "./hak.js";

export const PERAN_TULIS = ["pusdalops"];
const MAKS_LAJU = 60, JENDELA_LAJU = 10 * 60e3, HARI = 864e5;
const STATUS = ["siap", "operasi", "siaga", "tidak_siap"], JENIS_GERAK = ["rencana", "berangkat", "kembali", "batal"], STATUS_TEMUAN = ["fs", "berasap", "berasap_tipis", "clear"], LAPOR = ["masih_berasap", "padam"];
const TABEL_HAPUS = ["op_armada_status", "op_gerak", "op_gerak_hasil", "op_temuan"];
const teks = (v, maks) => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maks) : "";
class Galat { constructor(pesan, status = 400) { this.pesan = pesan; this.status = status; } }
const tolak = (pesan, status) => { throw new Galat(pesan, status); };

/* batas tanggal isian: hari ini WIB sampai 7 hari ke belakang */
function tanggalSah(t, kini) {
  if (typeof t !== "string" || !tglSah(t)) tolak("tanggal harus YYYY-MM-DD yang sah");
  if (t > wib(kini)) tolak("tanggal tidak boleh di depan hari ini");
  if (t < wib(kini - 7 * HARI)) tolak("tanggal isian hanya boleh hari ini sampai 7 hari ke belakang");
  return t;
}
const jamWib = (j, t, wajib) => {
  if (j == null || j === "") return wajib ? tolak("jam_wib wajib, format HH:MM (WIB)") : null;
  if (typeof j !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(j)) tolak("jam_wib harus HH:MM (WIB)");
  return Date.parse(`${t}T${j}:00+07:00`);
};
const angka = (v, nama, min, maks, bulat = true) => {
  if (v == null || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > maks || (bulat && !Number.isInteger(v))) tolak(`${nama} harus ${bulat ? "bilangan bulat" : "angka"} ${min} sampai ${maks}`);
  return v;
};
const koordinat = (b, wajib) => {
  if (b.lat == null && b.lon == null && !wajib) return [null, null];
  if (!dalamBbox(b.lat, b.lon)) tolak("koordinat harus lat dan lon di wilayah Indonesia");
  return [b.lat, b.lon];
};
const pilih = (v, daftar, nama) => daftar.includes(v) ? v : tolak(`${nama} harus salah satu dari: ${daftar.join(", ")}`);

/* hak tulis + isi badan + pengisi; mengembalikan {oleh, o} atau Response */
async function masuk(env, req, batas = 32768) {
  const m = await modOK(env, req), oleh = m ? "admin:" + m : await stafPeran(env, req, PERAN_TULIS);   // staf dicek ulang tiap permintaan: peran dicabut = 403
  if (!oleh) return gagal(403, "isian manual operasi udara hanya untuk staf Pusdalops atau moderator");
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const b = await bacaBody(req, batas); if (b.galat) return gagal(b.status || 400, b.galat);
  return {oleh, o: b.o};
}
/* batas laju dari op_isian_log; n = jumlah baris riwayat yang akan ditulis */
async function lajuOK(env, oleh, kini, n) {
  return await opLajuIsian(env, oleh, kini - JENDELA_LAJU) + n <= MAKS_LAJU;
}
const lambat = () => gagal(429, `isian terlalu cepat: maksimal ${MAKS_LAJU} tulis per 10 menit per pengisi`);
/* satu pembungkus untuk semua rute tulis: Galat validasi -> respons Indonesia; tabel 0126 belum ada -> 503 */
const rute = fn => bungkus(async (env, req, url, kini) => {
  try {
    const p = await masuk(env, req); if (p instanceof Response) return p;
    return await fn(env, p, kini);
  } catch (e) {
    if (e instanceof Galat) return gagal(e.status, e.pesan);
    if (/no such table: op_isian/i.test(String(e?.message || e))) return gagal(503, "isian manual operasi udara belum diaktifkan (migrasi 0126_operasi_isian belum diterapkan)");
    throw e;
  }
});

const armadaAda = async (env, reg) => {
  const r = typeof reg === "string" ? reg.trim().toUpperCase() : "";
  const a = r && await opArmada(env, r);
  return a || tolak(`registrasi ${teks(reg, 12) || "(kosong)"} tidak ada di daftar armada`);
};

/* ---------------------------------------------------------------- gelar armada: {tanggal, base_id, butir:[{registrasi, status, alasan}]} */
const gelar = rute(async (env, {oleh, o}, kini) => {
  const tanggal = tanggalSah(o.tanggal, kini);
  const base = typeof o.base_id === "string" && await opBaseAda(env, o.base_id);
  if (!base) tolak("base_id tidak ada di daftar base");
  if (!Array.isArray(o.butir) || !o.butir.length || o.butir.length > 30) tolak("butir harus larik 1 sampai 30 pesawat");
  const lihat = new Set(), baru = [];
  for (const x of o.butir) {
    if (!x || typeof x !== "object") tolak("tiap butir harus objek {registrasi, status, alasan}");
    const a = await armadaAda(env, x.registrasi);
    if (a.base_id && a.base_id !== o.base_id) tolak(`${a.registrasi} bukan armada base ${o.base_id}`);
    if (lihat.has(a.registrasi)) tolak(`${a.registrasi} muncul dua kali`); lihat.add(a.registrasi);
    baru.push({registrasi: a.registrasi, status: pilih(x.status, STATUS, "status"), alasan: teks(x.alasan, 200) || null});
  }
  if (!await lajuOK(env, oleh, kini, baru.length)) return lambat();
  const ada = new Map((await opStatusTanggal(env, tanggal)).map(r => [r.registrasi, r])), hapus = await hapusSet(env, "op_armada_status");
  const st = [];
  for (const b of baru) {
    const kunci = `${tanggal}|${b.registrasi}`, lama = ada.get(b.registrasi), hidup = lama && !(lama.sumber === "manual" && hapus.has(kunci));
    st.push(opStmtStatusManual(env, tanggal, b.registrasi, b.status, b.alasan, kini),
      isianStmt(env, "op_armada_status", kunci, oleh, kini),
      logStmt(env, oleh, kini, "op_armada_status", kunci, hidup ? "ubah" : "isi", hidup ? {status: lama.status, alasan: lama.alasan, sumber: lama.sumber} : null, {tanggal, status: b.status, alasan: b.alasan}));
  }
  await batchTulis(env, st);
  return json({ok: true, tanggal, base_id: o.base_id, tersimpan: baru.length}, 201);
});

/* ---------------------------------------------------------------- sortie: {id?, tanggal, registrasi, jenis, jam_wib, misi, lokasi, lat?, lon?} */
const sortie = rute(async (env, {oleh, o}, kini) => {
  const tanggal = tanggalSah(o.tanggal, kini), reg = (await armadaAda(env, o.registrasi)).registrasi, jenis = pilih(o.jenis, JENIS_GERAK, "jenis");
  const jam = jamWib(o.jam_wib, tanggal, true), misi = teks(o.misi, 40).toLowerCase() || null, lokasi = teks(o.lokasi, 120) || null, [lat, lon] = koordinat(o, false);
  const sesudah = {tanggal, registrasi: reg, jenis, jam_utc: jam, misi, lokasi, lat, lon};
  if (o.id != null) {   // ubah: boleh baris bot (lalu jadi milik manual) atau manual
    const id = angka(o.id, "id", 1, 2 ** 31, true), lama = await opGerakById(env, id);
    if (!lama) return gagal(404, "sortie tidak ditemukan");
    if ((await hapusSet(env, "op_gerak")).has(String(id))) return gagal(409, "sortie ini sudah dihapus");
    if (!await lajuOK(env, oleh, kini, 1)) return lambat();
    const {id: _, ...sebelum} = lama;
    await batchTulis(env, [opStmtUbahGerak(env, id, sesudah),
      opStmtKejadian(env, "gerak", lama.tanggal, lama.registrasi, lama.jenis, id),   // kunci asal tetap dijaga: bot yang memutar ulang pesan lama tidak membuat kembaran
      opStmtKejadian(env, "gerak", tanggal, reg, jenis, id),
      isianStmt(env, "op_gerak", String(id), oleh, kini), logStmt(env, oleh, kini, "op_gerak", String(id), "ubah", sebelum, sesudah)]);
    return json({ok: true, id});
  }
  if (!await lajuOK(env, oleh, kini, 1)) return lambat();
  const hidup = await opGerakKembar(env, tanggal, reg, jenis, jam);
  if (hidup) return gagal(409, "sortie yang sama sudah ada; pakai id untuk mengubahnya");
  const id = await opSisipGerak(env, sesudah);
  try {
    await batchTulis(env, [opStmtKejadian(env, "gerak", tanggal, reg, jenis, id),
      isianStmt(env, "op_gerak", String(id), oleh, kini), logStmt(env, oleh, kini, "op_gerak", String(id), "isi", null, sesudah)]);
  } catch (e) { await opBatalSisip(env, "op_gerak", id); throw e; }   // tanpa penanda bot bisa menggandakan: batalkan barisnya
  return json({ok: true, id}, 201);
});

/* ---------------------------------------------------------------- hasil: {gerak_id, drops?, liter?, lapor?}; kolom satelit (hasil padam/masih_api) tidak disentuh */
const hasil = rute(async (env, {oleh, o}, kini) => {
  const gid = angka(o.gerak_id, "gerak_id", 1, 2 ** 31, true);
  if (gid == null) tolak("gerak_id wajib");
  const g = await opGerakById(env, gid);
  if (!g) return gagal(404, "sortie tidak ditemukan");
  if ((await hapusSet(env, "op_gerak")).has(String(gid))) return gagal(409, "sortie ini sudah dihapus");
  const isi = {drops: angka(o.drops, "drops", 0, 1000), liter: angka(o.liter, "liter", 0, 1e6)};
  if (o.lapor != null && o.lapor !== "") isi.lapor = pilih(o.lapor, LAPOR, "lapor");
  const kol = Object.keys(isi).filter(k => isi[k] != null);
  if (!kol.length) tolak("isi sedikitnya satu dari drops, liter, lapor");
  if (!await lajuOK(env, oleh, kini, 1)) return lambat();
  const lama = await opHasil(env, gid);
  const hapus = (await hapusSet(env, "op_gerak_hasil")).has(String(gid)), hidup = lama && !hapus;
  await batchTulis(env, [opStmtHasil(env, gid, isi),
    isianStmt(env, "op_gerak_hasil", String(gid), oleh, kini),
    logStmt(env, oleh, kini, "op_gerak_hasil", String(gid), hidup ? "ubah" : "isi", hidup ? lama : null, {tanggal: g.tanggal, ...Object.fromEntries(kol.map(k => [k, isi[k]]))})]);
  return json({ok: true, gerak_id: gid}, 201);
});

/* ---------------------------------------------------------------- temuan api pilot: {id?, tanggal, jam_wib?, registrasi, lat, lon, status, luas_klaim_ha?, lokasi?} */
const temuan = rute(async (env, {oleh, o}, kini) => {
  const tanggal = tanggalSah(o.tanggal, kini), reg = (await armadaAda(env, o.registrasi)).registrasi, [lat, lon] = koordinat(o, true), status = pilih(o.status, STATUS_TEMUAN, "status");
  const jam = jamWib(o.jam_wib, tanggal, false), luas = angka(o.luas_klaim_ha, "luas_klaim_ha", 0, 100000, false), lokasi = teks(o.lokasi, 120) || null;
  const sesudah = {tanggal, jam_utc: jam, registrasi: reg, lat, lon, status, luas_klaim_ha: luas, lokasi}, dobel = e => /UNIQUE/i.test(String(e?.message || e)) ? gagal(409, "temuan di titik, hari, dan pesawat yang sama sudah ada") : null;
  if (o.id != null) {
    const id = angka(o.id, "id", 1, 2 ** 31, true), lama = await opTemuanById(env, id);
    if (!lama) return gagal(404, "temuan tidak ditemukan");
    if ((await hapusSet(env, "op_temuan")).has(String(id))) return gagal(409, "temuan ini sudah dihapus");
    if (!await lajuOK(env, oleh, kini, 1)) return lambat();
    try {
      await batchTulis(env, [opStmtUbahTemuan(env, id, sesudah),
        opStmtKejadian(env, "temuan", tanggal, reg, "*", id),
        isianStmt(env, "op_temuan", String(id), oleh, kini), logStmt(env, oleh, kini, "op_temuan", String(id), "ubah", lama, sesudah)]);
    } catch (e) { const d = dobel(e); if (d) return d; throw e; }
    return json({ok: true, id});
  }
  if (!await lajuOK(env, oleh, kini, 1)) return lambat();
  let id;
  try { id = await opSisipTemuan(env, sesudah); }
  catch (e) { const d = dobel(e); if (d) return d; throw e; }
  try {
    await batchTulis(env, [opStmtKejadian(env, "temuan", tanggal, reg, "*", id),
      isianStmt(env, "op_temuan", String(id), oleh, kini), logStmt(env, oleh, kini, "op_temuan", String(id), "isi", null, sesudah)]);
  } catch (e) { await opBatalSisip(env, "op_temuan", id); throw e; }
  return json({ok: true, id}, 201);
});

/* ---------------------------------------------------------------- hapus lunak: {tabel, kunci, alasan 5..300}; baris asli tetap, op_isian.terhapus = 1 */
const hapus = rute(async (env, {oleh, o}, kini) => {
  const tabel = pilih(o.tabel, TABEL_HAPUS, "tabel"), kunci = typeof o.kunci === "string" ? o.kunci.trim() : "", alasan = teks(o.alasan, 300);
  if (!kunci || kunci.length > 80) tolak("kunci wajib, maksimal 80 karakter");
  if (alasan.length < 5) tolak("alasan hapus wajib, 5 sampai 300 karakter");
  const lama = await opButir(env, tabel, kunci); if (lama === undefined) tolak("kunci tidak sesuai bentuk tabelnya");
  if (!lama) return gagal(404, "butir tidak ditemukan");
  if ((await hapusSet(env, tabel)).has(kunci)) return gagal(409, "butir ini sudah dihapus");
  if (!await lajuOK(env, oleh, kini, 1)) return lambat();
  await batchTulis(env, [isianStmt(env, tabel, kunci, oleh, kini, 1), logStmt(env, oleh, kini, tabel, kunci, "hapus", lama, null, alasan),
    ...tabel === "op_armada_status" ? [opStmtStatusJadiManual(env, ...kunci.split("|"))] : []]);   // baris bot jadi milik manual supaya pembaca menyembunyikannya; bot yang menulis lagi mengembalikan 'wa'
  return json({ok: true});
});

/* ---------------------------------------------------------------- riwayat: ?tabel=&kunci= atau ?tanggal= (maks 200 baris, terbaru dulu); hak baca = peta */
async function riwayat(env, req, url) {
  if (!await adminOK(env, req) && !await stafPeran(env, req, PERAN_BACA) && !await pemirsaLihat(env, req)) return gagal(403, "riwayat isian hanya untuk akun centurisk97, staf berperan, atau moderator");
  const tabel = url.searchParams.get("tabel"), kunci = url.searchParams.get("kunci"), tanggal = url.searchParams.get("tanggal");
  let q;
  if (tabel && kunci) { if (!TABEL_HAPUS.includes(tabel) || kunci.length > 80) return gagal(400, "tabel atau kunci tidak sah"); q = {tabel, kunci}; }
  else if (tanggal) { if (!tglSah(tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD yang sah"); q = {tanggal}; }
  else return gagal(400, "isi tabel dan kunci, atau tanggal");
  const r = await opRiwayat(env, q);
  const baca = s => { try { return s == null ? null : JSON.parse(s); } catch (e) { return null; } };
  return json(r.map(x => ({...x, sebelum: baca(x.sebelum), sesudah: baca(x.sesudah)})), 200, {"cache-control": "no-store"});
}

/* digabung ke RUTE di src/worker.js; nama jalur tanpa garis (gerbang cakupan) */
export const RUTE_ISIAN = Object.fromEntries(Object.entries({
  "POST /api/operasi/isian/gelar": gelar,
  "POST /api/operasi/isian/sortie": sortie,
  "POST /api/operasi/isian/hasil": hasil,
  "POST /api/operasi/isian/temuan": temuan,
  "POST /api/operasi/isian/hapus": hapus,
  "GET /api/operasi/isian/riwayat": riwayat,
}).map(([k, f]) => [k, k.startsWith("GET") ? bungkus(f) : f]));
