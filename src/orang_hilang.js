/* Orang hilang publik (paket data/kajian-bnpb/orang-hilang-publik/, K110-K116). OH-03: hanya pembaca sempit penyaring bencana (K116, D25).
   Rute publik lain, meja, dan foto menyusul di OH-05 sampai OH-11. Di belakang bendera OH_PUBLIK (bawaan mati = 404): tanpa bendera tidak ada yang tayang.
   Daftar kejadian untuk warga hanya jenis, kab, tanggal (dan id kejadian untuk memilih): tanpa nama kejadian, titik, sumber, atau data orang.
   Pencocok kejadian tidak ada yang baru: pembaca ini membaca Buku Besar (sk_kejadian_kab) lewat hak.js; kandidat disaring fungsi murni. */
import {json, bacaBody, sha} from "./worker.js";
import {lajuIP, laju} from "./bnpb.js";
import {sesiMasuk} from "./masuk_sesi.js";
import {mesinSah} from "./lapor_ai.js";
import {nomorWa} from "./lapor_tampil.js";
import {JENIS_SAH} from "./siklus_kejadian.js";
import {NAMA_KAB4} from "./siklus_kab.js";
import * as H from "./hak.js";
import {kandidatKejadian, batasi, JENDELA_HARI, MASA_TAYANG_HARI, turunOtomatis, persetujuanSah, LABEL} from "./orang_hilang_murni.js";

const JAM = 3600e3, HARI = 24 * JAM;
const HDR = {"cache-control": "private, no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer"};
const kirim = (kode, isi) => json(isi, kode, HDR);
const galat = (kode, pesan) => kirim(kode, {galat: pesan});

async function kejadianGet(env, req, url, kini) {
  if (env.OH_PUBLIK !== "1") return galat(404, "Halaman ini belum dibuka.");
  if (!env.IP_SALT) return galat(503, "server belum dikonfigurasi (IP_SALT)");
  const q = url.searchParams, ks = [...q.keys()], m = /^(\d{2})\.?(\d{2})$/.exec(q.get("kab") ?? "");
  if (ks.length !== 1 || ks[0] !== "kab" || q.getAll("kab").length !== 1 || !m || !Object.hasOwn(NAMA_KAB4, m[1] + m[2])) return galat(400, "Pilih kabupaten atau kota yang dikenal.");
  const lj = await lajuIP(env, req, "oh.kejadian", [[JAM, 60]], kini); if (lj) return lj;
  const kab4 = m[1] + m[2], jendela = batasi(env.OH_JENDELA_HARI, JENDELA_HARI);
  const kejadian = (await kejadianUntuk(env, `${m[1]}.${m[2]}`, kini)).map(k => ({id: k.id, jenis: k.jenis, kab4: k.kab4, kab: NAMA_KAB4[k.kab4], mulai: k.mulai}));   // kab tanpa kejadian: daftar kosong, bukan 0 atau galat
  return kirim(200, {kab4, kab: NAMA_KAB4[kab4], jendela_hari: jendela, kejadian});
}

/* kandidat kejadian untuk satu kab (kode "32.71") dari Buku Besar: dipakai rute kejadian dan langkah penyaring di obrolan (lapor_ai.js). Tabel belum ada = daftar kosong. */
export async function kejadianUntuk(env, kab5, kini) {
  const m = /^(\d{2})\.(\d{2})$/.exec(kab5 ?? ""); if (!m) return [];
  const kab4 = m[1] + m[2], baris = await H.ohKejadianKab(env, H.pelakuSistem, kab4).catch(e => { if (/no such table/i.test(String(e?.message))) return []; throw e; });
  return kandidatKejadian(kab4, kini, baris.map(r => ({id: r.id, jenis: r.jenis, kab4: [r.kab4], mulai: r.mulai, fase: r.fase})), JENIS_SAH, batasi(env.OH_JENDELA_HARI, JENDELA_HARI));
}

/* ---- turun (OH-08): satu fungsi untuk tiga pemanggil (cariStatus, cron, cabut pelapor) ---- */
export const kunciFotoPublik = id => `orang-hilang/publik/${id}`;   // R2; OH-05 menulis berkas dengan nama acak ini
const idFoto = j => { try { const a = JSON.parse(j ?? "[]"); return Array.isArray(a) ? a.filter(x => typeof x === "string" && /^[0-9a-f]{16,64}$/.test(x)) : []; } catch { return []; } };
/* oh = baris dengan cari_id, status, foto_publik. Benar bila baris ini yang berpindah (kalah balapan = false). Berkas foto publik dihapus sesudah baris turun (foto hanya dilayani untuk profil tayang, jadi sisa berkas tidak terbaca). */
export async function turunkan(env, p, oh, alasan, oleh, kini) {
  if (!oh || !["menunggu", "tayang"].includes(oh.status)) return false;
  const ok = await H.ohPindah(env, p, {cari_id: oh.cari_id, dari: oh.status, ke: "turun", alasan_turun: alasan, alasan, oleh: String(oleh || "sistem").slice(0, 64)}, kini);
  const f = idFoto(oh.foto_publik);
  if (ok && f.length && env.MEDIA) await env.MEDIA.delete(f.map(kunciFotoPublik)).catch(e => console.error("oh_foto_publik", e?.message));
  return ok;
}
/* laporan lapor_cari diubah petugas (cariStatus): profil turun dalam permintaan yang sama (K115). ke_sar dan buka tidak menurunkan (Q25). */
export async function turunDariCari(env, p, cariId, statusCari, oleh, kini) {
  if (!turunOtomatis(statusCari)) return false;
  const oh = await H.ohById(env, p, cariId).catch(e => { if (/no such table/i.test(String(e?.message))) return null; throw e; });
  return turunkan(env, p, oh, statusCari === "tutup" ? "tutup" : "ditemukan", oleh, kini);
}
const ALASAN_CARI = {ditemukan_selamat: "ditemukan", ditemukan_meninggal: "ditemukan", tutup: "tutup"};
/* cron menit 17: jaring pengaman turun otomatis, kedaluwarsa, lalu retensi. Tiap langkah menangkap tabel belum ada (migrasi 0188 belum diterapkan). */
export async function bersihOrangHilang(env, kini) {
  const P = H.pelakuLpCron, hasil = {turun: 0}, langkah = async f => { try { await f(); } catch (e) { if (!/no such table/i.test(String(e?.message))) console.error("oh_bersih", e?.message); } };
  await langkah(async () => { for (const r of await H.ohSapuan(env, P, kini - batasi(env.OH_MASA_HARI, MASA_TAYANG_HARI) * HARI))
    if (await turunkan(env, P, r, ALASAN_CARI[r.cari_status] ?? "kedaluwarsa", "sistem", kini)) hasil.turun++; });
  await langkah(() => H.ohAnonimCari(env, P));   // sesudah crAnonimkan di bersihkanLapor
  await langkah(async () => { const temu = await H.ohTemuLama(env, P, kini - H.CARI_SIMPAN_HARI * HARI), foto = await H.ohTemuFoto(env, P, temu);
    if (foto.length && env.MEDIA) await env.MEDIA.delete(foto.map(id => `lapor/foto/${id}.jpg`));   // berkas dulu, baru barisnya (pola foto orang dicari)
    await H.ohAnonimTemu(env, P, temu); });
  await langkah(async () => Object.assign(hasil, await H.ohRetensi(env, P, kini)));
  return hasil;
}

/* ---- rute pelapor saya/* (D28): sesi /masuk terbukti atau saluran gateway WA berkunci mesin; nomor yang diketik tidak pernah cukup ---- */
async function pemilik(env, req, url, kini, tulis, body) {
  if (req.headers.get("authorization")) {
    if (!await mesinSah(env, req)) return {tolak: galat(403, "kunci mesin salah")};
    const wa = nomorWa(body?.wa ?? url.searchParams.get("wa")); return wa ? {wa} : {tolak: galat(400, "Nomor WhatsApp tidak sah.")};
  }
  let s = null; try { s = await sesiMasuk(env, req, kini); } catch (e) { if (!/no such table/i.test(String(e?.message))) throw e; }
  if (!s) return {tolak: galat(401, "Masuk dulu dengan kode WhatsApp. Tanpa itu, minta petugas mencabut laporan Anda.")};   // nomor ketikan di badan atau kueri diabaikan
  if (tulis && req.headers.get("x-pb") !== "1") return {tolak: galat(403, "kiriman wajib membawa header x-pb: 1")};
  return {wa: s.wa};
}
const tampilSaya = (r, kini, masa) => ({id: r.cari_id, status: r.status, label: LABEL.status[r.status], alasan: r.alasan_turun ? LABEL.alasan_turun[r.alasan_turun] : null,
  berakhir: r.status === "tayang" && r.tayang_waktu ? r.tayang_waktu + masa * HARI : null, dibuat: r.dibuat,
  bisa_cabut: ["menunggu", "tayang"].includes(r.status), bisa_perpanjang: r.status === "turun" && r.alasan_turun === "kedaluwarsa" && persetujuanSah(r) && !turunOtomatis(r.cari_status)});
async function sayaGet(env, req, url, kini) {
  const m = await pemilik(env, req, url, kini, false, null); if (m.tolak) return m.tolak;
  const masa = batasi(env.OH_MASA_HARI, MASA_TAYANG_HARI), daftar = await H.ohMilik(env, H.pelakuLpPelapor, m.wa).catch(e => { if (/no such table/i.test(String(e?.message))) return []; throw e; });
  return kirim(200, {profil: daftar.map(r => tampilSaya(r, kini, masa))});
}
async function sayaAksi(env, req, url, kini, aksi) {
  const b = await bacaBody(req, 512); if (b.galat) return galat(b.status || 400, b.galat);
  const m = await pemilik(env, req, url, kini, true, b.o); if (m.tolak) return m.tolak;
  const id = String(b.o?.id ?? ""); if (!/^[0-9a-f]{16}$/.test(id)) return galat(400, "Laporan tidak dikenal.");
  const lj = await laju(env, await sha(m.wa), `oh.saya.${aksi}`, [[JAM, 30]], kini); if (lj) return lj;   // kunci laju = sha nomor
  const r = (await H.ohMilik(env, H.pelakuLpPelapor, m.wa).catch(e => { if (/no such table/i.test(String(e?.message))) return []; throw e; })).find(x => x.cari_id === id);
  if (!r) return galat(404, "Laporan tidak ditemukan.");   // milik nomor lain dan tidak ada menjawab sama
  const masa = batasi(env.OH_MASA_HARI, MASA_TAYANG_HARI);
  if (aksi === "cabut") {
    if (!["menunggu", "tayang"].includes(r.status)) return galat(409, "Laporan ini tidak sedang tampil atau menunggu, jadi tidak ada yang perlu dicabut.");
    const ok = await turunkan(env, H.pelakuLpPelapor, r, "dicabut", "pelapor", kini);
    return ok ? kirim(200, {id, status: "turun", label: LABEL.status.turun}) : galat(409, "Status laporan baru berubah. Muat ulang lalu coba lagi.");
  }
  if (!tampilSaya(r, kini, masa).bisa_perpanjang) return galat(409, "Laporan ini tidak bisa ditayangkan lagi. Hubungi petugas.");
  const ok = await H.ohPindah(env, H.pelakuLpPelapor, {cari_id: id, dari: "turun", ke: "menunggu", alasan: "perpanjang", oleh: "pelapor"}, kini);
  return ok ? kirim(200, {id, status: "menunggu", label: LABEL.status.menunggu}) : galat(409, "Status laporan baru berubah. Muat ulang lalu coba lagi.");
}

export const RUTE_ORANG_HILANG = {
  "GET /api/lapor/hilang/kejadian": kejadianGet,
  "GET /api/lapor/hilang/saya": sayaGet,
  "POST /api/lapor/hilang/saya/cabut": (env, req, url, kini) => sayaAksi(env, req, url, kini, "cabut"),
  "POST /api/lapor/hilang/saya/perpanjang": (env, req, url, kini) => sayaAksi(env, req, url, kini, "perpanjang"),
};
