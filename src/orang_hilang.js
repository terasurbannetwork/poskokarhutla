/* Orang hilang publik (paket data/kajian-bnpb/orang-hilang-publik/, K110-K116). OH-03: hanya pembaca sempit penyaring bencana (K116, D25).
   Rute publik lain, meja, dan foto menyusul di OH-05 sampai OH-11. Di belakang bendera OH_PUBLIK (bawaan mati = 404): tanpa bendera tidak ada yang tayang.
   Daftar kejadian untuk warga hanya jenis, kab, tanggal (dan id kejadian untuk memilih): tanpa nama kejadian, titik, sumber, atau data orang.
   Pencocok kejadian tidak ada yang baru: pembaca ini membaca Buku Besar (sk_kejadian_kab) lewat hak.js; kandidat disaring fungsi murni. */
import {json, bacaBody, bacaBytes, sha, acak} from "./worker.js";
import {lajuIP, laju} from "./bnpb.js";
import {sesiMasuk} from "./masuk_sesi.js";
import {mesinSah} from "./lapor_ai.js";
import {nomorWa} from "./lapor_tampil.js";
import {JENIS_SAH} from "./siklus_kejadian.js";
import {NAMA_KAB4} from "./siklus_kab.js";
import {dalamWilayah, bolehAksi} from "./lapor_meja_hak.js";
import {periksaFotoPublik, MAKS_BYTE} from "./orang_hilang_foto_publik.js";
import {samarkan} from "./samarkan.js";
import * as H from "./hak.js";
import {kandidatKejadian, batasi, JENDELA_HARI, MASA_TAYANG_HARI, turunOtomatis, persetujuanSah, layak, waliSah, profilPublik, saranCocok, SETUJU_VERSI, LABEL} from "./orang_hilang_murni.js";

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
export async function turunkan(env, p, oh, alasan, oleh, kini, alasanRiwayat = null, catatan = null) {
  if (!oh || !["menunggu", "tayang"].includes(oh.status)) return false;
  const ok = await H.ohPindah(env, p, {cari_id: oh.cari_id, dari: oh.status, ke: "turun", alasan_turun: alasan, alasan: alasanRiwayat ?? alasan, catatan, oleh: String(oleh || "sistem").slice(0, 64)}, kini);
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
/* berkas foto publik yatim (R2 gagal dihapus saat turun, atau unggahan yang batal): kunci tanpa profil draf, menunggu, atau tayang yang memuatnya, dan lebih tua dari 1 jam (unggahan baru belum tertaut). Sampai 1000 kunci per jam. */
export async function sapuFotoYatim(env, kini) {
  if (!env.MEDIA) return 0;
  const awalan = kunciFotoPublik(""); let cursor, hapus = 0;
  for (let hal = 0; hal < 20; hal++) {   // 20 halaman x 1000 per jam
    const l = await env.MEDIA.list({prefix: awalan, limit: 1000, cursor}), tua = l.objects.filter(o => o.uploaded.getTime() < kini - JAM);
    const ids = tua.map(o => o.key.slice(awalan.length)), dipakai = new Set(await H.ohFotoDipakai(env, H.pelakuLpCron, ids)), yatim = tua.filter(o => !dipakai.has(o.key.slice(awalan.length))).map(o => o.key);
    if (yatim.length) { await env.MEDIA.delete(yatim); hapus += yatim.length; }
    if (!l.truncated) break; cursor = l.cursor;
  }
  return hapus;
}
/* cron menit 17: jaring pengaman turun otomatis, kedaluwarsa, lalu retensi. Tiap langkah menangkap tabel belum ada (migrasi 0188 belum diterapkan). */
export async function bersihOrangHilang(env, kini) {
  const P = H.pelakuLpCron, hasil = {turun: 0}, langkah = async f => { try { await f(); } catch (e) { if (!/no such table/i.test(String(e?.message))) console.error("oh_bersih", e?.message); } };
  await langkah(async () => { for (const r of await H.ohSapuan(env, P, kini - batasi(env.OH_MASA_HARI, MASA_TAYANG_HARI) * HARI))
    if (await turunkan(env, P, r, ALASAN_CARI[r.cari_status] ?? "kedaluwarsa", "sistem", kini)) hasil.turun++; });
  await langkah(() => sapuFotoYatim(env, kini));
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
  const lj = await laju(env, await sha(m.wa), "oh.saya.baca", [[JAM, 120]], kini); if (lj) return lj;   // kunci laju = sha nomor
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

/* ---- foto publik (OH-05, D29) ---- */
const FOTO_HDR = {...HDR, "x-content-type-options": "nosniff"};
async function sayaFoto(env, req, url, kini) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const m = await pemilik(env, req, url, kini, true, null); if (m.tolak) return m.tolak;
  const id = url.searchParams.get("id") ?? ""; if (!/^[0-9a-f]{16}$/.test(id)) return galat(400, "Laporan tidak dikenal.");
  const lj = await laju(env, await sha(m.wa), "oh.saya.foto", [[JAM, 30]], kini); if (lj) return lj;
  const r = (await H.ohMilik(env, H.pelakuLpPelapor, m.wa).catch(e => { if (/no such table/i.test(String(e?.message))) return []; throw e; })).find(x => x.cari_id === id);
  if (!r) return galat(404, "Laporan tidak ditemukan.");
  if (r.kelas === "anak") return galat(403, "Foto anak tidak ditampilkan di halaman publik.");
  if (!["draf", "menunggu"].includes(r.status)) return galat(409, "Foto hanya bisa ditambah sebelum profil tampil. Hubungi petugas.");
  if (idFoto(r.foto_publik).length >= 3) return galat(409, "Paling banyak 3 foto.");
  const bb = await bacaBytes(req, MAKS_BYTE + 1024); if (bb.galat) return galat(bb.status || 400, bb.galat);
  const f = periksaFotoPublik(bb.b); if (f.galat) return galat(400, f.galat);
  const fid = acak(16), kunci = kunciFotoPublik(fid);   // nama acak, tanpa hubungan dengan cari_id
  await env.MEDIA.put(kunci, bb.b, {httpMetadata: {contentType: f.jenis}});
  if (!await H.ohFotoTambah(env, H.pelakuLpPelapor, id, fid)) { await env.MEDIA.delete(kunci); return galat(409, "Foto tidak bisa ditambah (jumlah penuh atau status berubah)."); }
  return kirim(200, {id: fid, jumlah: idFoto(r.foto_publik).length + 1});
}
/* hanya profil dewasa yang sedang tayang; selain itu 404 sama. private, no-store: K114 menjanjikan turun seketika, jadi tidak pernah public atau max-age. */
async function fotoGet(env, req, url, kini, ctx, x) {
  if (env.OH_PUBLIK !== "1" || !env.MEDIA) return galat(404, "tidak ada");
  const lj = await lajuIP(env, req, "oh.foto", [[JAM, 600]], kini); if (lj) return lj;
  if (!/^[0-9a-f]{32}$/.test(x ?? "")) return galat(404, "tidak ada");
  const ada = await H.ohFotoTayang(env, H.pelakuLpPublik, x, kini - batasi(env.OH_MASA_HARI, MASA_TAYANG_HARI) * HARI).catch(e => { if (/no such table/i.test(String(e?.message))) return null; throw e; });
  const o = ada ? await env.MEDIA.get(kunciFotoPublik(x)) : null; if (!o) return galat(404, "tidak ada");
  return new Response(o.body, {headers: {...FOTO_HDR, "content-type": o.httpMetadata?.contentType || "application/octet-stream"}});
}

/* ---- meja tinjau (OH-07, K113): h = hasil hakMeja dari lapor_ai.js ---- */
const ALASAN_TOLAK = ["bukan_bencana", "tidak_masuk_akal", "duplikat", "anak_tanpa_wali", "lainnya"], HASIL_TELEPON = ["ingin", "tidak_ingin", "tak_terjangkau", "tanpa_nomor"];
const catatanPendek = v => samarkan(String(v ?? "")).replace(/\s+/g, " ").trim().slice(0, 140) || null;
const wilayahOh = r => ({provKode: String(r.kab ?? "").slice(0, 2), kabKode: r.kab, kab: NAMA_KAB4[String(r.kab ?? "").replace(/\D/g, "")] ?? r.kab_nama});
/* syarat Tayang yang bisa dihitung: dipakai layar (tombol aktif) dan rute (penjaga sebenarnya) */
function syaratTayang(r, tel, infoTerbuka, bendera) {
  const k = [];
  if (r.status !== "menunggu") k.push("status");
  if (!layak(r)) k.push(r.kelas === "anak" && r.kejadian_id && r.kejadian_oleh ? "wali_belum_diverifikasi" : "kejadian_belum_dikonfirmasi");
  if (!persetujuanSah(r)) k.push("persetujuan_tidak_sah");
  if (r.kelas === "dewasa") {   // [BAWAAN SEMENTARA] ALGORITMA 4: hanya telepon terbaru yang dihitung; harus dicatat sesudah profil terakhir masuk menunggu; tidak_ingin lama memblokir sampai ada telepon baru
    if (tel?.hasil === "tidak_ingin") k.push("orang_tidak_ingin_dicari");
    else if (!tel || !tel.segar || tel.hasil === "tanpa_nomor" && r.nomor_dicari) k.push("telepon_belum_dicatat");
  }
  if (infoTerbuka > 0) k.push("laporan_pihak_ketiga_terbuka");
  if (!bendera) k.push("bendera_mati");
  return k;
}
async function mejaHilangGet(env, h, url, kini) {
  const lj = await laju(env, h.kunci, "oh.mejaget", [[JAM, 600]], kini); if (lj) return lj;
  const kab = h.c.jenis === "bnpb" ? null : h.c.kab ?? h.c.prov, masa = batasi(env.OH_MASA_HARI, MASA_TAYANG_HARI);
  const tabelBelum = e => { if (/no such table/i.test(String(e?.message))) return []; throw e; };
  const baris = [], perKab = new Map(), kabDari = r => perKab.get(r.kab) ?? perKab.set(r.kab, Promise.all([H.ohTemuDekat(env, H.pelakuLpStaf, r.kab), kejadianUntuk(env, r.kab, kini)])).get(r.kab);   // temu dan kandidat sekali per kab
  for (const r of await H.ohAntrean(env, H.pelakuLpStaf, kab || null).catch(tabelBelum)) {
    if (!dalamWilayah(h.c, wilayahOh(r))) continue;
    const [tel, info, [temu, kandidat]] = await Promise.all([H.ohTeleponTerbaru(env, H.pelakuLpStaf, r.cari_id), H.ohInfoTerbuka(env, H.pelakuLpStaf, r.token), kabDari(r)]);
    const foto = idFoto(r.foto_publik), kej = r.kejadian_id ? {jenis: r.kejadian_jenis, kab: NAMA_KAB4[r.kejadian_kab] ?? null, mulai: r.kejadian_mulai} : null;
    baris.push({id: r.cari_id, kelas: r.kelas, dibuat: r.dibuat, prioritas: !!(r.kejadian_id && kandidat.find(k => k.id === r.kejadian_id)?.aktif),
      pratinjau: profilPublik({...r, waktu: r.waktu_terakhir, kejadian: kej}, r.kelas, {foto: foto.map(f => `/api/lapor/hilang/foto/${f}`), ciri_ditinjau: !!r.ciri}),
      privat: {tampil: false, nomor_pelapor: r.nomor_pencari, nomor_dicari: r.nomor_dicari, hubungan: r.hubungan, lokasi_terakhir: r.lokasi_terakhir, ciri_laporan: r.ciri_laporan},   // panel "Hanya petugas": tidak pernah tampil di publik
      kejadian: {terisi: !!r.kejadian_id, dikonfirmasi: !!r.kejadian_oleh, usulan: kandidat.map(k => ({id: k.id, jenis: k.jenis, mulai: k.mulai, aktif: k.aktif}))},
      anak: r.kelas === "anak" ? {pelapor_wali: r.setuju_wali === 1, wali_diverifikasi: waliSah(r)} : null,
      telepon: tel?.hasil ?? null, info_terbuka: info, syarat_belum: syaratTayang(r, tel, info, env.OH_PUBLIK === "1"),
      saran_cocok: saranCocok({kab: r.kab, waktu_terakhir: r.waktu_terakhir, kelamin: r.kelamin, umur: r.umur, pakaian: r.pakaian}, temu.map(t => ({id: t.id, kab: t.kab, waktu_temu: t.waktu_temu}))), berakhir_masa_hari: masa});
  }
  return kirim(200, {akun: {jenis: h.c.jenis, label: h.c.label}, baris});
}
async function mejaHilangPost(env, req, h, x, kini) {
  const mm = /^hilang\/([0-9a-f]{16})\/aksi$/.exec(x); if (!mm) return galat(404, "rute lapor tidak ada");
  if (!bolehAksi(h.c, "tayang")) return galat(403, "akun ini tidak boleh meninjau orang hilang");
  const lj = await laju(env, h.kunci, "oh.mejapost", [[JAM, 300]], kini); if (lj) return lj;
  const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat); const o = b.o, id = mm[1], oleh = String(h.oleh || "staf").slice(0, 64), S = H.pelakuLpStaf;
  const r = (await H.ohAntrean(env, S, null, id).catch(e => { if (/no such table/i.test(String(e?.message))) return []; throw e; }))[0];   // satu baris menurut id, bukan 100 teratas
  if (!r || !dalamWilayah(h.c, wilayahOh(r))) return galat(404, "Laporan tidak ditemukan.");   // hanya yang menunggu; wilayah lain menjawab sama
  const catatan = catatanPendek(o.catatan), catat = (sql, arg, alasan, c = catatan) => H.ohMejaCatat(env, S, {sql, arg, cari_id: id, status: "menunggu", alasan, catatan: c, oleh}, kini);
  switch (o.aksi) {
    case "tayang": {
      const [tel, info] = await Promise.all([H.ohTeleponTerbaru(env, S, id), H.ohInfoTerbuka(env, S, r.token)]), k = syaratTayang(r, tel, info, env.OH_PUBLIK === "1");   // layak && persetujuanSah SEBELUM ohPindah (OH-03)
      if (k.length) return kirim(409, {galat: "Belum bisa ditayangkan.", syarat_belum: k});
      return await H.ohPindah(env, S, {cari_id: id, dari: "menunggu", ke: "tayang", alasan: "tayang", catatan, oleh}, kini) ? kirim(200, {id, status: "tayang"}) : galat(409, "Status laporan baru berubah.");
    }
    case "perbaikan": {
      if (!catatan) return galat(400, "Tulis catatan singkat untuk pelapor.");
      return await H.ohPindah(env, S, {cari_id: id, dari: "menunggu", ke: "draf", alasan: "minta_perbaikan", catatan, oleh}, kini) ? kirim(200, {id, status: "draf"}) : galat(409, "Status laporan baru berubah.");
    }
    case "tolak": {
      if (!ALASAN_TOLAK.includes(o.alasan)) return galat(400, `Alasan harus salah satu dari: ${ALASAN_TOLAK.join(", ")}.`);
      return await turunkan(env, S, r, "ditolak", oleh, kini, `tolak_${o.alasan}`, catatan) ? kirim(200, {id, status: "turun"}) : galat(409, "Status laporan baru berubah.");
    }
    case "ganti_foto": {
      const f = String(o.foto ?? ""); if (!idFoto(r.foto_publik).includes(f)) return galat(404, "Foto tidak ditemukan.");
      if (!await H.ohFotoCoret(env, S, id, f)) return galat(409, "Status laporan baru berubah.");
      await env.MEDIA?.delete(kunciFotoPublik(f)).catch(e => console.error("oh_foto_publik", e?.message));
      await H.ohMejaCatat(env, S, {sql: H.ohMejaSql.catat, arg: [id], cari_id: id, status: "menunggu", alasan: "foto_dicoret", catatan: null, oleh}, kini);
      return kirim(200, {id, foto: idFoto(r.foto_publik).filter(y => y !== f).length});
    }
    case "ubah_kejadian": {
      const daftar = await kejadianUntuk(env, r.kab, kini), k = daftar.find(y => y.id === o.kejadian);
      if (!k) return galat(400, "Kejadian harus salah satu dari daftar untuk kab/kota ini.");   // kejadian baru tidak pernah dibuat di sini
      return await catat(H.ohMejaSql.kejadianUbah, [id, k.id, k.jenis, k.kab4, k.mulai, oleh, kini], "kejadian_diubah") ? kirim(200, {id, kejadian: k.id}) : galat(409, "Status laporan baru berubah.");
    }
    case "konfirmasi_kejadian":
      if (!r.kejadian_id) return galat(409, "Laporan belum memilih kejadian. Pilih lewat Ubah kejadian.");
      return await catat(H.ohMejaSql.kejadianKonfirm, [id, oleh, kini], "kejadian_dikonfirmasi") ? kirim(200, {id}) : galat(409, "Status laporan baru berubah.");
    case "verifikasi_wali":
      if (r.kelas !== "anak") return galat(409, "Hanya untuk profil anak.");
      if (r.setuju_wali !== 1) return galat(409, "Pelapor tidak menyatakan diri wali. Tolak atau minta perbaikan.");
      return await catat(H.ohMejaSql.wali, [id, oleh, kini], "wali_diverifikasi") ? kirim(200, {id}) : galat(409, "Status laporan baru berubah.");
    case "telepon": {   // daftar periksa D34: petugas menelepon nomor_dicari dan menandai hasilnya (baku)
      if (!HASIL_TELEPON.includes(o.hasil)) return galat(400, `Hasil harus salah satu dari: ${HASIL_TELEPON.join(", ")}.`);
      if (o.hasil === "tanpa_nomor" && r.nomor_dicari) return galat(409, "Laporan ini punya nomor orang yang dicari. Telepon dulu.");
      if (r.kelas !== "dewasa") return galat(409, "Daftar periksa telepon untuk profil dewasa.");
      return await catat(H.ohMejaSql.catat, [id], `telepon_${o.hasil}`) ? kirim(200, {id, hasil: o.hasil}) : galat(409, "Status laporan baru berubah.");
    }
    default: return galat(400, "Aksi tidak dikenal.");
  }
}
export const mejaHilang = {daftar: mejaHilangGet, aksi: mejaHilangPost};

export const RUTE_ORANG_HILANG = {
  "GET /api/lapor/hilang/kejadian": kejadianGet,
  "GET /api/lapor/hilang/saya": sayaGet,
  "POST /api/lapor/hilang/saya/cabut": (env, req, url, kini) => sayaAksi(env, req, url, kini, "cabut"),
  "POST /api/lapor/hilang/saya/perpanjang": (env, req, url, kini) => sayaAksi(env, req, url, kini, "perpanjang"),
  "POST /api/lapor/hilang/saya/foto": sayaFoto,
  "GET /api/lapor/hilang/foto/:x": fotoGet,
};
