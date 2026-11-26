/* Kabar selamat dan orang dicari (paket data/kajian-bnpb/lapor-ai/, K91, D126-D130, tiket LA-80). SQL di src/hak.js (bagian Lapor, migrasi 0173).
   Penanda wajib sesi /masuk (nomor terbukti lewat kode sekali pakai WA, D127); nomor ketikan tidak pernah cukup. Keluarga melihat lewat tautan bertoken
   milik penanda (D128), tidak ada pencarian per nomor (Q66). Orang dicari hanya untuk meja; pencocokan hanya nomor sama persis (D130), tidak pernah nama. */
import {json, bacaBody, acak, sha} from "./worker.js";
import {laju, lajuIP} from "./bnpb.js";
import {sesiMasuk} from "./masuk_sesi.js";
import {terbitkan, periksa, cabut} from "./token.js";
import {nomorWa} from "./lapor_tampil.js";
import {dalamWilayah, bolehAksi} from "./lapor_meja_hak.js";
import * as H from "./hak.js";

const HARI = 864e5, JAM = 3600e3, TAUTAN_HARI = 7;
const HDR = {"cache-control": "private, no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer"};
const kirim = (kode, isi) => json(isi, kode, HDR);
const galat = (kode, pesan) => kirim(kode, {galat: pesan});
const P = H.pelakuLpPelapor, PUBLIK = H.pelakuLpPublik, STAF = H.pelakuLpStaf;
const LABEL = {selamat: "Selamat", butuh_bantuan: "Selamat, butuh bantuan"};
export const STATUS_CARI = ["buka", "ditemukan_selamat", "ditemukan_meninggal", "ke_sar", "tutup"];
const RE_KAB = /^\d{2}\.\d{2}$/, RE_ID = /^[0-9a-f]{16}$/, TIDAK_ADA = "Tautan ini tidak ditemukan atau sudah tidak berlaku.";
const teks = (v, maks) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maks);
const tabelBelum = e => /no such table/i.test(String(e?.message));

export function buatSelamat(wilayahDari) {
  const kabNama = async (env, kode) => RE_KAB.test(kode) ? (await wilayahDari(env).kabNama(kode)) ?? null : null;
  /* pemilik nomor = sesi /masuk yang hidup; tulis wajib x-pb. Tanpa sesi: 401 yang menyuruh minta kode. */
  async function pemilik(env, req, kini, tulis) {
    let s = null; try { s = await sesiMasuk(env, req, kini); } catch (e) { if (!tabelBelum(e)) throw e; }
    if (!s) return {tolak: galat(401, "Minta kode dulu: masuk dengan nomor WhatsApp Anda lewat kode sekali pakai. Nomor yang hanya diketik tidak cukup.")};
    return tulis && req.headers.get("x-pb") !== "1" ? {tolak: galat(403, "kiriman wajib membawa header x-pb: 1")} : {wa: s.wa};
  }
  const batasi = async (env, req, wa, aksi, perNomor, kini) =>
    await laju(env, await sha(wa), aksi, perNomor, kini) ??   // kunci laju = sha nomor, bukan nomor mentah
    await lajuIP(env, req, aksi + ".ip", [[JAM, 30]], kini);
  const tampil = async (env, t) => ({nama_panggil: t.nama_panggil, status: t.status, label: LABEL[t.status], kab: t.kab, kab_nama: await kabNama(env, t.kab), waktu: t.dibuat});

  /* cabut tanda aktif nomor ini beserta tautannya; jumlah yang dicabut */
  const lepas = async (env, wa, kini) => { const lama = await H.slCabut(env, P, wa, kini); for (const t of lama) await cabut(env, "selamat", t, kini); return lama.length; };
  async function selamatPost(env, req, url, kini) {
    const m = await pemilik(env, req, kini, true); if (m.tolak) return m.tolak;
    const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat);
    const o = b.o || {}, nama = teks(o.nama_panggil, 40), kab = String(o.kab || "");
    if (!nama || nama.replace(/\D/g, "").length >= 6) return galat(400, "Isi nama panggilan singkat, tanpa nomor telepon.");
    if (!Object.hasOwn(LABEL, o.status)) return galat(400, "Status harus selamat atau butuh_bantuan.");
    if (!await kabNama(env, kab)) return galat(400, "Kode kabupaten/kota tidak dikenal.");
    const lj = await batasi(env, req, m.wa, "lapor.selamat", [[HARI, 10]], kini); if (lj) return lj;   // sesudah validasi: isian salah tidak menghabiskan jatah
    const id = acak(8), {token, id: token_id, kedaluwarsa} = await terbitkan(env, {jenis: "selamat", sasaran: {sel: id}, ttlMs: TAUTAN_HARI * HARI, oleh: "warga"}, kini);   // token.js: 32 bita acak, D1 hanya sha-256
    let lama;
    try { lama = await H.slGanti(env, P, m.wa, {id, nama_panggil: nama, status: o.status, kab, token_id, kedaluwarsa}, kini); }
    catch (e) { await cabut(env, "selamat", token_id, kini); if (/UNIQUE/i.test(String(e?.message))) return galat(409, "Tanda sedang disimpan dari permintaan lain. Coba lagi sebentar."); throw e; }   // dua kiriman serentak: indeks unik menahan yang kedua, token yatimnya dicabut
    for (const t of lama) await cabut(env, "selamat", t, kini);   // atomik; tautan lama sudah mati lewat tanda dicabut
    return kirim(200, {tautan: `/lapor/s/${token}`, kedaluwarsa, status: o.status, label: LABEL[o.status], nama_panggil: nama, kab, kab_nama: await kabNama(env, kab)});
  }
  async function selamatDelete(env, req, url, kini) {
    const m = await pemilik(env, req, kini, true); if (m.tolak) return m.tolak;
    return kirim(200, {dicabut: await lepas(env, m.wa, kini) > 0});
  }
  async function selamatSaya(env, req, url, kini) {
    const m = await pemilik(env, req, kini, false); if (m.tolak) return m.tolak;
    const [t, cari] = await Promise.all([H.slAktif(env, P, m.wa, kini), H.crMilik(env, P, m.wa)]);
    // laporan orang dicari milik nomor ini ikut di Laporan saya (pemilik 25 Nov 2026)
    const daftarCari = await Promise.all(cari.map(async r => ({id: r.id, nama_dicari: r.nama_dicari, status: r.status, dibuat: r.dibuat, kab_nama: (await kabNama(env, r.kab)) || r.kab})));
    return kirim(200, {tanda: t ? {...await tampil(env, {...t}), kedaluwarsa: t.kedaluwarsa} : null, cari: daftarCari});
  }
  /* publik bertoken: nama panggilan, status, waktu, kab/kota. Tidak pernah nomor, titik, atau desa. Tidak dikenal, dicabut, kedaluwarsa: jawaban sama. */
  async function selamatToken(env, req, url, kini, ctx, x) {
    const lj = await lajuIP(env, req, "lapor.s", [[JAM, 120]], kini); if (lj) return lj;
    const k = await periksa(env, "selamat", x, kini), t = k && RE_ID.test(k.sasaran?.sel) ? await H.slById(env, PUBLIK, k.sasaran.sel, kini) : null;
    return t ? kirim(200, await tampil(env, t)) : galat(404, TIDAK_ADA);
  }
  async function cariPost(env, req, url, kini) {
    const m = await pemilik(env, req, kini, true); if (m.tolak) return m.tolak;
    const b = await bacaBody(req, 2048); if (b.galat) return galat(b.status || 400, b.galat);
    const o = b.o || {}, nama = teks(o.nama_dicari, 80), kab = String(o.kab || "");
    let nomorDicari = null;
    if (teks(o.nomor_dicari, 20)) { nomorDicari = nomorWa(o.nomor_dicari); if (!nomorDicari) return galat(400, "Nomor WhatsApp orang yang dicari tidak sah."); }
    if (nama.length < 2) return galat(400, "Isi nama orang yang dicari.");
    if (!await kabNama(env, kab)) return galat(400, "Kode kabupaten/kota tidak dikenal.");
    const lj = await batasi(env, req, m.wa, "lapor.cari.baru", [[HARI, 5]], kini); if (lj) return lj;
    const id = acak(8);
    await H.crTambah(env, P, {id, nomor_pencari: m.wa, nama_dicari: nama, ciri: teks(o.ciri, 300) || null, lokasi_terakhir: teks(o.lokasi_terakhir, 200) || null,
      waktu_terakhir: teks(o.waktu_terakhir, 100) || null, nomor_dicari: nomorDicari, hubungan: teks(o.hubungan, 60) || null, kab}, kini);
    return kirim(200, {id, status: "buka", pesan: "Laporan diterima petugas. Laporan ini tidak tampil di publik."});
  }
  /* meja: h = hasil hakMeja (diperiksa pemanggil). BPBD hanya kab wilayahnya. */
  async function cariMeja(env, h, url, kini) {
    const lj = await laju(env, h.kunci, "lapor.mejacari", [[JAM, 300]], kini); if (lj) return lj;
    const nama = new Map(), namaKab = async k => { if (!nama.has(k)) nama.set(k, await kabNama(env, k)); return nama.get(k); };
    const baris = [];
    const kab = h.c.jenis === "bnpb" ? null : h.c.kab ?? h.c.prov;   // prefiks kode; BPBD kab bernama (tanpa kode) hanya disaring di aplikasi
    for (const r of await H.crDaftar(env, STAF, kab || null)) { const kn = await namaKab(r.kab);
      if (dalamWilayah(h.c, {provKode: r.kab.slice(0, 2), kabKode: r.kab, kab: kn})) baris.push({...r, kab_nama: kn}); }
    const temu = new Map((await H.ctBaca(env, STAF, baris.map(r => r.id)).catch(e => { if (tabelBelum(e)) return []; throw e; })).map(t => [t.cari_id, t]));
    for (const r of baris) { const t = temu.get(r.id); if (t) Object.assign(r, {panggilan: t.panggilan, nomor_kontak: t.nomor_kontak, tempat_tunggu: t.tempat_tunggu}); }
    const tanda = new Map((await H.slAktifNomor(env, STAF, [...new Set(baris.map(r => r.nomor_dicari).filter(Boolean))], kini)).map(t => [t.nomor, t]));
    return kirim(200, {akun: {jenis: h.c.jenis, label: h.c.label}, baris: baris.map(r => { const t = r.nomor_dicari && tanda.get(r.nomor_dicari);
      return {...r, cocok: !!t, tanda: t ? {status: t.status, label: LABEL[t.status], waktu: t.dibuat} : null}; })});
  }
  async function cariStatus(env, req, h, x, kini) {
    const id = /^cari\/([0-9a-f]{16})\/status$/.exec(x)?.[1]; if (!id) return galat(404, "rute lapor tidak ada");
    if (!bolehAksi(h.c, "status")) return galat(403, "akun ini tidak boleh mengubah status");
    const lj = await laju(env, h.kunci, "lapor.caristatus", [[JAM, 120]], kini); if (lj) return lj;
    const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat);
    const o = b.o || {};
    if (!STATUS_CARI.includes(o.status)) return galat(400, `Status harus salah satu dari: ${STATUS_CARI.join(", ")}.`);
    const r = RE_ID.test(id) ? await H.crById(env, STAF, id) : null;
    if (!r || !dalamWilayah(h.c, {provKode: r.kab.slice(0, 2), kabKode: r.kab, kab: await kabNama(env, r.kab)})) return galat(404, "Laporan tidak ditemukan.");
    await H.crStatus(env, STAF, id, o.status, teks(o.catatan, 300) || null, h.oleh, kini);
    return kirim(200, {id, status: o.status});
  }
  return {
    rute: {"POST /api/lapor/selamat": selamatPost, "DELETE /api/lapor/selamat": selamatDelete, "GET /api/lapor/selamat/saya": selamatSaya,
      "GET /api/lapor/s/:x": selamatToken, "POST /api/lapor/cari": cariPost},
    cariMeja, cariStatus,
  };
}
