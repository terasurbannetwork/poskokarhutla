/* Paritas bencana: isian manual sarana dan fasilitas sasaran (F-2, F-7, F-4 staf). PB-10; data/kajian-bnpb/paritas-bencana/DESAIN-TEKNIS.md 2.3, 2.4, 5; KEAMANAN-PRIVASI.md 2, 6.
   Tulis = modOK (moderator) atau stafPeran pusdalops DAN provinsi dalam wilayah staf. BUKAN adminOK: akun gerbang tidak menulis. Akun instansi BPBD menyusul (PB-11, Q3): ganti `penulis` saja.
   Pengisi dicatat "staf:<id>" / "admin:<hash12>", tanpa nama orang. SEMUA D1 lewat src/hak.js. Tidak menulis ke public/.
   Saklar `env.PB_REGISTRI` (JSON {id: {operasi, renlap: {sarana}}}) menimpa kemampuan registri; kosong = murni public/bencana.json (bentuk sementara sebelum registri menyalakan operasi, dipakai uji). */
import {json, gagal, bacaBody, adminOK, acak, bersihTeks} from "./worker.js";
import {modOK} from "./posko.js";
import {stafPeran, stafSesiSemua, pemirsaLihat, dalamWilayahStaf} from "./staf.js";
import {PERAN_BACA, dalamBbox} from "./operasi_udara.js";
import {teks, Galat, tolak} from "./operasi_isian.js";
import {SARANA, FASILITAS} from "./tugas_bencana.js";
import {PROV} from "./bangunan.js";
import REGISTRY from "./bencana.generated.js";
import {pelakuPbTulis, pelakuPbBaca, pbTitikDaftar, pbTitikById, pbStmtTitikSisip, pbStmtTitikUbah, pbStmtTitikHapus, pbStmtLog, pbLogLaju, tanpaTabelPb, batchTulis} from "./hak.js";

export const PERAN_TULIS = ["pusdalops"];
const PERAN_SEMUA = ["pusdalops", "koordalops", "pimpinan"], BENCANA_UDARA = ["karhutla", "udara"];
const MAKS_LAJU = 60, JENDELA_LAJU = 10 * 60e3, STATUS = ["siap", "dipakai", "rusak", "tidak_tersedia"], RE_ID = /^[0-9a-f]{16}$/;
const MIGRASI = "fitur sarana dan fasilitas belum diaktifkan (migrasi 0130_paritas_operasi belum diterapkan)";
const pilih = (v, daftar, nama) => daftar.includes(v) ? v : tolak(`${nama} harus salah satu dari: ${daftar.join(", ")}`);
const bersih = (v, maks) => {
  const t = teks(v, maks).replace(/[<>]/g, ""), r = bersihTeks(t, maks);
  if (r.galat) tolak(r.galat);
  if (r.teks !== t) tolak("tanpa nomor telepon, NIK, atau tautan");   // pembersih worker menandai URL dan deret angka 9+ digit
  return t;
};   // tanpa kurung sudut: XSS dan penutup CDATA tidak pernah tersimpan; keluaran HTML tetap lewat esc()

/* kemampuan bencana yang boleh dioperasikan; null = tidak ada atau operasi belum menyala (404, bukan 400) */
function kemampuan(env, id) {
  const b = REGISTRY.bencana.find(x => x.id === id); if (!b) return null;
  let k = b.kemampuan ?? {};
  if (env.PB_REGISTRI) { try { const o = JSON.parse(env.PB_REGISTRI)[id]; if (o) k = {...k, ...o}; } catch (e) { /* saklar rusak = abaikan */ } }
  return k.operasi === true ? k : null;
}
const bencanaAktif = (env, id) => kemampuan(env, id) ?? tolak("bencana tidak dikenal atau operasinya belum menyala", 404);
const wilayah = o => {
  const prov = typeof o.prov === "string" && PROV.has(o.prov) ? o.prov : tolak("prov harus kode BPS 2 digit yang sah");
  const kab = o.kab == null || o.kab === "" ? "" : typeof o.kab === "string" && /^\d{4}$/.test(o.kab) && o.kab.startsWith(prov) ? o.kab : tolak("kab harus kode BPS 4 digit di dalam prov");
  return {prov, kab};
};

/* hak tulis: {oleh} atau Response. PB-11 mengganti isi fungsi ini (akun instansi untuk prov dan kab-nya). */
async function penulis(env, req, prov) {
  const m = await modOK(env, req), oleh = m ? "admin:" + m : await stafPeran(env, req, PERAN_TULIS);   // staf dicek ulang tiap permintaan: peran dicabut = 403
  if (!oleh) return gagal(403, "isian sarana dan fasilitas hanya untuk staf Pusdalops atau moderator");
  if (!m && !dalamWilayahStaf(req, [prov])) return gagal(403, "provinsi di luar wilayah akun Anda");
  return {oleh};
}
/* tamu ditolak SEBELUM body dibaca, bencana dicek, atau baris dicari (tak ada pembeda 400/404 bagi tamu); cek wilayah menyusul di penulis() */
const gerbangTulis = async (env, req) => !await modOK(env, req) && !await stafPeran(env, req, PERAN_TULIS) ? gagal(403, "isian sarana dan fasilitas hanya untuk staf Pusdalops atau moderator") : null;
const rute = fn => async (env, req, url, kini) => {
  try { return await fn(env, req, url, kini); }
  catch (e) {
    if (e instanceof Galat) return gagal(e.status, e.pesan);
    if (tanpaTabelPb(e)) return gagal(503, MIGRASI);
    throw e;
  }
};
async function badan(env, req) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const b = await bacaBody(req, 32768); return b.galat ? gagal(b.status || 400, b.galat) : b.o;
}
// ponytail: baca lalu tulis, lonjakan paralel kecil; atomik bila perlu
const lajuOK = async (env, oleh, kini) => await pbLogLaju(env, pelakuPbTulis, oleh, kini - JENDELA_LAJU) + 1 <= MAKS_LAJU;
const lambat = () => gagal(429, `isian terlalu cepat: maksimal ${MAKS_LAJU} tulis per 10 menit per pengisi`);

/* isi titik dari badan; jenis harus cocok golongan dan, untuk sarana, termasuk renlap.sarana bencananya */
function titik(o, k, w) {
  const golongan = pilih(o.golongan, ["sarana", "fasilitas"], "golongan");
  const jenis = golongan === "sarana"
    ? pilih(o.jenis, SARANA.filter(j => (k.renlap?.sarana ?? []).includes(j)), "jenis sarana untuk bencana ini")
    : pilih(o.jenis, FASILITAS, "jenis fasilitas");
  const nama = bersih(o.nama, 80); if (!nama) tolak("nama tempat atau unit wajib (tanpa nama orang), maksimal 80 karakter");
  if (!dalamBbox(o.lat, o.lon)) tolak("koordinat harus lat dan lon di wilayah Indonesia");
  const kap = o.kapasitas;
  if (kap != null && kap !== "" && (!Number.isInteger(kap) || kap < 0 || kap > 1e6)) tolak("kapasitas harus bilangan bulat 0 sampai 1000000");
  return {golongan, jenis, nama, lat: o.lat, lon: o.lon, kapasitas: kap === "" ? null : kap ?? null, status: o.status == null ? "siap" : pilih(o.status, STATUS, "status"), catatan: bersih(o.catatan, 200) || null, ...w};
}

const simpan = rute(async (env, req, url, kini) => {
  const tamu = await gerbangTulis(env, req); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const bencana = typeof o.bencana === "string" ? o.bencana : "", k = bencanaAktif(env, bencana), w = wilayah(o);
  const p = await penulis(env, req, w.prov); if (p instanceof Response) return p;
  const {oleh} = p, t = {...titik(o, k, w), bencana};
  if (o.id != null) {   // ubah: baris harus ada, aktif, dan di wilayah pemanggil (kepemilikan dicek pada BARIS, bukan pada badan)
    const id = typeof o.id === "string" && RE_ID.test(o.id) ? o.id : tolak("id harus 16 heks");
    const lama = await pbTitikById(env, pelakuPbBaca, id); if (!lama) return gagal(404, "titik tidak ditemukan");
    if (!oleh.startsWith("admin:") && !dalamWilayahStaf(req, [lama.prov])) return gagal(403, "titik ini di luar wilayah akun Anda");
    if (lama.dihapus != null) return gagal(409, "titik ini sudah dihapus");
    if (lama.bencana !== bencana || lama.prov !== w.prov || lama.kab !== w.kab) return gagal(400, "bencana dan wilayah titik tidak dapat dipindah; hapus lalu isi ulang");
    if (!await lajuOK(env, oleh, kini)) return lambat();
    const {dihapus, ...sebelum} = lama, {golongan, jenis, nama, lat, lon, kapasitas, status, catatan} = t;
    await batchTulis(env, [pbStmtTitikUbah(env, pelakuPbTulis, id, t, kini), pbStmtLog(env, pelakuPbTulis, kini, oleh, "pb_titik", id, "ubah", sebelum, {golongan, jenis, nama, lat, lon, kapasitas, status, catatan})]);
    return json({ok: true, id});
  }
  if (!await lajuOK(env, oleh, kini)) return lambat();
  t.id = acak(8);
  await batchTulis(env, [pbStmtTitikSisip(env, pelakuPbTulis, t, oleh, kini), pbStmtLog(env, pelakuPbTulis, kini, oleh, "pb_titik", t.id, "isi", null, t)]);
  return json({ok: true, id: t.id}, 201);
});

const hapus = rute(async (env, req, url, kini) => {
  const tamu = await gerbangTulis(env, req); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const id = typeof o.id === "string" && RE_ID.test(o.id) ? o.id : tolak("id harus 16 heks"), alasan = bersih(o.alasan, 300);
  if (alasan.length < 5) tolak("alasan hapus wajib, 5 sampai 300 karakter");
  const lama = await pbTitikById(env, pelakuPbBaca, id); if (!lama) return gagal(404, "titik tidak ditemukan");
  bencanaAktif(env, lama.bencana);
  const p = await penulis(env, req, lama.prov); if (p instanceof Response) return p;
  if (lama.dihapus != null) return gagal(409, "titik ini sudah dihapus");
  if (!await lajuOK(env, p.oleh, kini)) return lambat();
  const {dihapus, ...sebelum} = lama;
  await batchTulis(env, [pbStmtTitikHapus(env, pelakuPbTulis, id, kini), pbStmtLog(env, pelakuPbTulis, kini, p.oleh, "pb_titik", id, "hapus", sebelum, null, alasan)]);
  return json({ok: true});
});

/* baca: akun gerbang/moderator, staf berperan (udara dan tmc hanya karhutla dan udara), pemirsa pusdalops; staf berwilayah hanya provinsinya */
const daftar = rute(async (env, req, url) => {
  const q = url.searchParams, bencana = q.get("bencana") ?? "";
  bencanaAktif(env, bencana);
  const w = wilayah({prov: q.get("prov"), kab: q.get("kab")}), golongan = q.get("golongan") ?? "", jenis = q.get("jenis") ?? "";
  if (golongan) pilih(golongan, ["sarana", "fasilitas"], "golongan");
  if (jenis) pilih(jenis, [...SARANA, ...FASILITAS], "jenis");
  const adm = await adminOK(env, req), s = adm ? null : await stafSesiSemua(env, req);
  if (s) {
    const peran = s.peran ?? [];
    if (!peran.some(r => PERAN_SEMUA.includes(r))) {
      if (!peran.some(r => PERAN_BACA.includes(r))) return gagal(403, "data sarana hanya untuk akun centurisk97, staf berperan, atau moderator");
      if (!BENCANA_UDARA.includes(bencana)) return gagal(403, "peran ini hanya membaca karhutla dan udara");
    }
    if (!dalamWilayahStaf(req, [w.prov])) return gagal(403, "provinsi di luar wilayah akun Anda");
  } else if (!adm && !await pemirsaLihat(env, req)) return gagal(403, "data sarana hanya untuk akun centurisk97, staf berperan, atau moderator");
  try { return json({tersedia: true, titik: await pbTitikDaftar(env, pelakuPbBaca, {...w, bencana, golongan, jenis})}); }
  catch (e) { if (tanpaTabelPb(e)) return json({tersedia: false, titik: []}); throw e; }
});

/* digabung ke RUTE di src/worker.js; nama jalur tanpa garis bawah (gerbang cakupan) */
export const RUTE_PB = {
  "GET /api/pb/titik": daftar,
  "POST /api/pb/titik": simpan,
  "POST /api/pb/titik/hapus": hapus,
};
