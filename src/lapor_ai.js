/* Lapor Bencana BNPB di Worker (data/kajian-bnpb/lapor-ai, tiket LA-05, LA-06, LA-10; AGENTS 2.30). Port dari scripts/lapor/lokal.mjs, acuan perilaku yang disetujui pemilik.
   Mesin percakapan murni = src/lapor_mesin.js (kode memegang alur, model hanya mengurai berkutipan); bentuk jawaban = src/lapor_tampil.js; info daerah = src/lapor_info.js.
   Semua SQL di src/hak.js (bagian Lapor, migrasi 0155). Foto dan dokumen di R2 MEDIA, kunci lapor/foto/<id>.jpg dan lapor/dok/<nomor>.<versi>.<pdf|docx>.
   Penjaga: (a) mesin Mac mini, Bearer WA_MESIN, membawa body.wa (gateway WA); (b) pelapor web: sesi Satu Pintu Masuk (nomor dari sesi) + x-pb: 1 pada POST;
   (c) pelapor web tanpa kode (K65, D99-D102): nomor diketik di body/kueri `wa`, terikat ke perangkat lewat kuki HttpOnly lapor_perangkat (sidik di D1, migrasi 0159) + x-pb; keduanya hanya untuk nomor di lapor_izin selama masa uji (KEPUTUSAN K2); (d) meja: admin/moderator atau staf pusdalops/koordalops (Q12) + x-pb. Tautan lacak, foto, unduhan: token 32 heks turunan HMAC
   nomor tiket (hanya sha256-nya disimpan). Jawaban privat: cache-control private no-store, x-robots-tag noindex. */
import {json, bacaBody, bacaBytes, sha, hex, acak, ipHash, cacheTepi} from "./worker.js";
import {laju, lajuIP} from "./bnpb.js";
import {modOK} from "./posko.js";
import {modAtauStaf} from "./staf.js";
import {sesiMasuk} from "./masuk_sesi.js";
import {sesiProfilDari} from "./profil_sesi.js";
import {hakKm} from "./kemitraan.js";
import {bersihMedia} from "./media_bersih.js";
import {jenisBerkas, durasiMP4, waktuMP4, lokasiMP4} from "./media_berkas.js";
import {BAHASA, bahasaSah, keIndonesia, dariIndonesia, terjemahUi, MAKS_TEKS_UI, PANJANG_TEKS_UI, HURUF_PANGGILAN} from "./lapor_bahasa.js";
import {samarkan} from "./samarkan.js";
import {kontakBpbd, kalimatBpbd} from "./lapor_kontak.js";
import {cakupanMeja, dalamWilayah, bolehAksi, pindahUntuk, bakuKab, labelAmbil, hitungRespons, RESPONS_HARI} from "./lapor_meja_hak.js";
import {hitungGugus, kandidatKejadian, kodeKejadian, tglKejadian} from "./lapor_gugus.js";
import {agregat, keCsv, BATAS_SEL, KOLOM as KOLOM_AGREGAT} from "./lapor_agregat.js";
import {putaran, sesiSekaliKetuk, mulaiDiJenisDarurat, nilaiFotoLuring, lengkap, T, waktuLapor, saringTopik} from "./lapor_mesin.js";
import {JENIS} from "./lapor_spek.js";
import {buatModel} from "./lapor_model.js";
import {buatWilayah} from "./lapor_wilayah.js";
import {buatInfo} from "./lapor_info.js";
import {HALAMAN_TUNGGU_DOK, urlMedia, isianTampil, KUNCI_SUSULAN, bolehSusulan, STATUS, PINDAH, TAMPIL_ALUN, nomorWa, tglWib, keluaran, lanjutan, sesiTampil, jawabStatus, bahanDokumen, lacakTampil, ringkasSesi, barisMeja, barisAlun, mejaRinciTampil, labelJenis, pelakuLabel} from "./lapor_tampil.js";
import {jalanOsm} from "./lapor_jalan.js";
import {buatRutePeringatan, jalankanPeringatan, bersihPeringatan} from "./pw_peringatan.js";
import * as H from "./hak.js";
import {buatSelamat} from "./lapor_selamat.js";
import {buatKomen, buatKomenMeja} from "./lapor_komen.js";
import {bukaBerkas, pesanTim, fotoTim, bersihSesiLanjut, sapuDrafYatim, hapusPribadiLama} from "./lapor_lanjut.js";
import {HASIL_PERIKSA, revisiTampil, tindakanUntuk, sahkanTindakan, sahkanPeriksa, terapkanRevisi, statusDariHasil} from "./lapor_periksa.js";
import {penandaPemeriksa, waktuVerifikasi, kejadianTerverifikasi, kartuPublik, terakhir, syaratPublik, usulanDari, usulanTerakhir, statusUsulan} from "./lapor_kejadian.js";
import {hakSk} from "./siklus.js";

const MENIT = 60e3, HARI = 864e5, JAM = 3600e3, VERSI = 1, MAKS_TERKIRIM_HARI = 5, MAKS_FOTO = 10, MAKS_BERKAS = 20;   // D79: foto dan video dihitung bersama, paling banyak 20, video paling banyak 3
const BATAS_PESAN = [[MENIT, 20], [JAM, 120], [HARI, 300]],   // K104 (pemilik 25 Nov 2026): 120 per jam per orang karena pertanyaannya banyak; harian ikut naik supaya tidak lebih ketat dari jam
  BATAS_IP_JAM = [[JAM, 300]], BATAS_PERANGKAT_JAM = [[JAM, 120]];   // per nomor; per alamat IP /64 hanya pintu web
const SELESAI = new Set(["terkirim", "batal", "kedaluwarsa", "cari_terkirim"]);
const HDR = {"cache-control": "private, no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer"};
const kirim = (kode, isi) => json(isi, kode, HDR);
const galat = (kode, pesan, tambah = {}) => kirim(kode, {galat: pesan, ...tambah});
const RE_NOMOR = /^LA-\d{6}-\d{2,3}$/, RE_TOKEN = /^[0-9a-f]{32}$/, RE_KODE_DESA = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/;
const BATAS_KIRIM_TEKS = `*Batas laporan harian*\nSatu nomor paling banyak ${MAKS_TERKIRIM_HARI} laporan dalam sehari. Coba lagi besok, atau hubungi 112 bila darurat.`;
const angka = v => typeof v === "number" && Number.isFinite(v);   // null, "" dan teks tidak pernah lolos jadi 0
const titikSah = (lat, lon) => angka(lat) && angka(lon) && lat >= -12 && lat <= 7 && lon >= 94 && lon <= 142;
const RE_PERANGKAT = /(?:^|;\s*)lapor_perangkat=([0-9a-f]{64})(?:;|$)/, MAKS_NOMOR_PERANGKAT = 5, KUKI_UMUR = 365 * 86400;
const kukiPerangkat = req => RE_PERANGKAT.exec(req.headers.get("cookie") || "")?.[1] ?? null;
const adaIdentitas = req => req.headers.has("authorization") || /(?:^|;\s*)sesi_masuk=/.test(req.headers.get("cookie") || "") || RE_PERANGKAT.test(req.headers.get("cookie") || "");   // saringan murah sebelum membaca badan BESAR; badan kecil (pesan, susulan, nilai, mulai unggah) tidak memakainya karena kunjungan pertama pintu tanpa kode belum punya kuki
const SET_KUKI = new WeakMap();   // Request -> nilai Set-Cookie; ditempelkan di pembungkus jaga() supaya handler tidak perlu tahu
/* sebelum membaca badan besar: identitas benar-benar sah (kunci mesin atau sesi /masuk yang hidup), bukan hanya nama kuki, plus batas per IP.
   Penyerang tanpa akun tidak bisa membuat Worker menelan 5 MB per permintaan (tinjauan keamanan tahap 2). */
async function identitasSah(env, req, kini, aksi) {
  const lj = await lajuPublik(env, req, aksi, 400, kini); if (lj) return lj;
  if (req.headers.get("authorization")) return await mesinSah(env, req) ? null : galat(403, "kunci mesin salah");
  let s = null; try { s = await sesiMasuk(env, req, kini); } catch (e) { if (!tabelBelum(e)) throw e; }
  if (s) return null;
  const k = kukiPerangkat(req); try { if (k && (await H.lpPerangkatBaris(env, P, await sha(k))).length) return null; } catch (e) { if (!tabelBelum(e)) throw e; }   // kuki perangkat yang diterbitkan server (kunci karangan tidak dikenal)
  try { await req.body?.cancel(); } catch {}
  return galat(401, "Masuk dulu dengan nomor WhatsApp Anda.");
}
const lajuPublik = (env, req, aksi, maks, kini) => req.headers.get("authorization") ? null : lajuIP(env, req, aksi, [[JAM, maks]], kini);   // mesin Mac mini tidak dibatasi per IP
const P = H.pelakuLpPelapor, PUBLIK = H.pelakuLpPublik, HARI_INI = H.pelakuLpHari, STAF = H.pelakuLpStaf, MESIN = H.pelakuLpMesin;

/* ---------------- penjaga ---------------- */
async function mesinSah(env, req) {
  const t = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "")?.[1];
  return !!(env.WA_MESIN && t && await sha(t) === await sha(env.WA_MESIN));
}
/* pemilik nomor: mesin (nomor dari body/kueri) atau sesi /masuk (nomor dari sesi). Mengembalikan {wa, saluran, izin} atau Response penolakan. */
async function pelapor(env, req, url, body) {
  let wa, saluran, perangkat = null, ketik = false;
  if (req.headers.get("authorization")) {
    if (!await mesinSah(env, req)) return galat(403, "kunci mesin salah");
    wa = nomorWa(body?.wa ?? url.searchParams.get("wa")); saluran = "wa";
    if (!wa) return galat(400, "Nomor WhatsApp tidak sah.");
  } else {
    let s = null; try { s = await sesiMasuk(env, req); } catch (e) { if (!/no such table/i.test(String(e?.message))) throw e; }
    if (s) {
      if (req.method !== "GET" && req.headers.get("x-pb") !== "1") return galat(403, "kiriman bersesi wajib membawa header x-pb: 1");   // POST dan PUT (bagian video)
      wa = s.wa; saluran = "web";
    } else {   // K65: nomor diketik tanpa kode, terikat perangkat (D99, D100)
      wa = nomorWa(body?.wa ?? url.searchParams.get("wa"));
      if (!wa) return galat(401, "Masuk dulu dengan nomor WhatsApp Anda.");
      if (req.method !== "GET" && req.headers.get("x-pb") !== "1") return galat(403, "kiriman web wajib membawa header x-pb: 1");
      saluran = "web"; ketik = true;
      const lj = await lajuIP(env, req, "lapor.ketik", [[JAM, 240]], Date.now()); if (lj) return lj;   // sebelum izin: pintu tanpa kode tidak jadi penebak daftar izin dan pembakar baca D1
    }
  }
  // K67 (pemilik 20 Nov 2026: "di local tadi ga ada masalah"): nomor ketikan di web tidak memakai daftar izin masa uji, sama dengan server tinjau.
  // Penjaganya laju IP, ikatan perangkat, dan kuota per perangkat; izin tetap dibaca untuk WA dan sesi /masuk, dan nomor ketikan tidak pernah naik ke bpbd (D101).
  const izin = ketik ? {wa, peran: null, kab: null} : await H.lpIzin(env, P, wa);
  if (!izin) return galat(403, "Nomor ini belum diizinkan memakai layanan lapor (masa uji).");
  if (ketik) { const r = await ikatPerangkat(env, req, wa); if (r instanceof Response) return r; perangkat = r; }   // sesudah izin: nomor tak berizin tidak membuat ikatan atau kuki
  return {wa, saluran, izin, perangkat, ketik};
}
/* ikatan perangkat (D100, D102): kunci acak 32 byte di kuki; D1 hanya sha256-nya. Kuki yang tidak dikenal D1 dianggap tidak ada (kunci karangan tidak diterima) dan diganti baru.
   Tiap perangkat paling banyak MAKS_NOMOR_PERANGKAT nomor; ikatan baru dibatasi 20 per jam per IP, karena nomor bisa diganti-ganti. Mengembalikan sidik perangkat atau Response. */
async function ikatPerangkat(env, req, wa) {
  const kini = Date.now(), lama = kukiPerangkat(req);
  try {
    let dev = lama ? await sha(lama) : null, baris = dev ? await H.lpPerangkatBaris(env, P, dev) : [];
    if (!baris.length) { const k = acak(32); dev = await sha(k); baris = []; SET_KUKI.set(req, `lapor_perangkat=${k}; Max-Age=${KUKI_UMUR}; Path=/api/lapor; HttpOnly; Secure; SameSite=Lax`); }
    const ada = baris.find(b => b.wa === wa);
    if (ada) { if (kini - ada.terakhir > HARI) await H.lpPerangkatSentuh(env, P, dev, wa, kini); return dev; }
    if (baris.length >= MAKS_NOMOR_PERANGKAT) { SET_KUKI.delete(req); return galat(429, "Perangkat ini sudah dipakai untuk terlalu banyak nomor. Gunakan perangkat Anda sendiri."); }
    const lj = await lajuIP(env, req, "lapor.ikat", [[JAM, 20]], kini); if (lj) { SET_KUKI.delete(req); return lj; }
    await H.lpPerangkatTambah(env, P, dev, wa, kini);
    return dev;
  } catch (e) { SET_KUKI.delete(req); if (tabelBelum(e)) return galat(503, "Pintu tanpa kode belum aktif (migrasi 0159 belum diterapkan)."); throw e; }
}
/* sesi aktif dan milik: jalur perangkat hanya melihat sesi yang dibuat dari perangkatnya; mesin dan sesi /masuk seperti semula */
/* jalur mesin (WA) dan sesi /masuk tidak melanjutkan sesi yang dibuat dari nomor ketikan: orang yang mengetik nomor orang lain
   tidak bisa menyiapkan percakapan yang nanti diteruskan pemilik nomor sebenarnya (tinjauan pengerja, D100); mereka mulai sesi baru */
const sesiAktif = async (env, id) => {
  if (id.perangkat) return H.lpSesiAktifPerangkat(env, P, id.wa, id.perangkat);
  const b = await H.lpSesiAktif(env, P, id.wa);
  return b && dariBaris(b)?.verifikasi === "ketik" ? null : b;
};
const milikSesi = async (env, id, baris) => !!baris && baris.wa === id.wa && (!id.perangkat || await H.lpMilikAda(env, P, "sesi", baris.id, id.perangkat));
/* sesi baru jalur perangkat dipetakan ke perangkat dalam batch yang sama (setelah sesi baru, bergerbang changes() > 0) */
const stmtMilikSesi = (env, perangkat, sesiId) => perangkat ? [H.lpMilikStmt(env, P, "sesi", sesiId, perangkat, true)] : [];
/* staf meja: admin/moderator (bukan akun gerbang) atau staf pusdalops/koordalops; POST bersesi staf wajib x-pb (diperiksa stafSesiSemua) */
async function stafMeja(env, req) {
  const oleh = await modAtauStaf(env, req, ["pusdalops", "koordalops"]);
  return oleh ? (String(oleh).startsWith("staf:") ? oleh : `admin:${oleh}`) : null;
}
const tolakStaf = () => galat(403, "perlu masuk sebagai admin, staf Pusdalops/Koordalops, atau akun lembaga pemda");
const tabelBelum = e => /no such table/i.test(String(e?.message));
/* pembukaan berkas data lanjutan tidak pernah menggagalkan laporan yang sudah terkirim: migrasi 0161 belum ada atau galat lain hanya dicatat */
const bukaBerkasAman = async (env, nomor, kini, origin) => { try { await bukaBerkas(env, nomor, kini, origin); } catch (e) { if (!tabelBelum(e)) console.error("bukaBerkas", nomor, String(e?.message || e)); } };
// ringkasan dipotong tetap membawa kode wilayah, supaya laporan panjang tetap masuk daftar meja BPBD wilayahnya (tinjauan guard-api)
const wilayahKecil = s => { const w = s.isian?.lokasi?.nilai?.wilayah; return w ? {provKode: w.provKode ?? null, kabKode: w.kabKode ?? null, kab: w.kab ?? null, prov: w.prov ?? null} : null; };
const tulisAudit = async f => { try { await f(); } catch (e) { if (!tabelBelum(e)) throw e; } };   // log audit sebelum migrasi 0157 tidak menggagalkan aksi
const bacaTabel = async (f, awal) => { try { return await f(); } catch (e) { if (tabelBelum(e)) return awal; throw e; } };   // kode tayang sebelum migrasi 0157: bacaan memberi kosong, bukan 500
/* hak meja (K63, D94-D98): BNPB (admin/staf, Q12) = cakupan penuh; selain itu akun lembaga pemda lewat SESI PROFIL (username, sandi, pilih profil, PIN; paket profil-bpbd PF-04),
   bukan lagi sesi /masuk (Q1). Kuki sesi_profil berjalur /api/lapor juga, jadi sampai ke sini; kuki akun tidak.
   Hasil {c: cakupanMeja, oleh: pelaku riwayat (memuat nama profil), kunci: kunci batas laju}, {tolak: Response}, atau null (tidak berhak). */
export async function hakMeja(env, req, kini) {
  const oleh = await stafMeja(env, req);
  if (oleh) return {c: cakupanMeja({bnpb: true, nama: oleh}), oleh, kunci: String(oleh).slice(0, 60)};
  let p = null; try { p = await sesiProfilDari(env, req, kini); } catch (e) { if (!tabelBelum(e)) throw e; }
  if (!p) return null;
  if (p.pin_wajib_ganti) return {tolak: json({galat: "ganti PIN dulu", pin_wajib_ganti: true}, 403, HDR)};   // meja tidak punya rute pengecualian
  if (req.method !== "GET" && req.headers.get("x-pb") !== "1") return {tolak: galat(403, "kiriman bersesi wajib membawa header x-pb: 1")};
  const c = cakupanMeja({jenis: p.jenis, tingkat: p.tingkat, prov: p.prov, kab: p.kab, wilayah: p.wilayah, status: "aktif", nama: p.profil_nama});
  if (!c) return null;
  const catat = async () => H.pfLog(env, {akun: p.akun_id, profil: p.profil_id, jenis: "meja", rute: `${req.method} ${new URL(req.url).pathname.replace(/[0-9a-f]{16,}/g, ":id")}`, objek: /\/meja\/(LA-\d{6}-\d{2,3})/.exec(new URL(req.url).pathname)?.[1], ip: (await ipHash(env, req)).slice(0, 12)}, kini).catch(() => {});
  /* aksi lihat dan ambil dicatat SESUDAH penangan sukses (h.tunda), supaya aksi yang ditolak tidak terhitung "dilihat" di waktu respons; aksi tulis lain dicatat sebelum penangan jalan (A6) */
  const tunda = req.method !== "GET" && /\/(lihat|ambil)$/.test(new URL(req.url).pathname);
  if (req.method !== "GET" && !tunda) await catat();
  return {c, oleh: c.pelaku, kunci: `pf:${p.profil_id}`, tunda: tunda ? catat : null, profil: {id: p.profil_id, akun: p.akun_id, nama: p.profil_nama, jabatan: p.profil_jabatan}};
}
const wilayahBaris = baris => { try { return JSON.parse(baris.kerja)?.isian?.lokasi?.nilai?.wilayah ?? null; } catch { return null; } };

/* kuota pesan (pemilik 19 Nov 2026): lewat batas = 429 berisi balasan sopan; laporan yang sedang diisi tetap tersimpan di D1. Batas nomor dan IP dibaca sebelum baris laju ditulis. */
async function kuota(env, req, {wa, saluran, perangkat}, kini, aksi = "lapor.pesan") {
  const kn = perangkat ? `${wa}:${perangkat.slice(0, 16)}` : wa;   // nomor ketikan: kuota per nomor dihitung per perangkat, supaya pemilik nomor tidak kehabisan jatah karena orang lain
  const daftar = aksi === "lapor.pesan" ? [{kunci: kn, aksi, batas: BATAS_PESAN}] : [{kunci: kn, aksi, batas: aksi === "lapor.bagian" ? [[JAM, 120]] : [[JAM, 30]]}];   // satu video = paling banyak 6 bagian; 120 bagian/jam memberi ruang ulang
  if (aksi === "lapor.pesan" && saluran === "web") daftar.push({kunci: await ipHash(env, req), aksi: "lapor.ip", batas: BATAS_IP_JAM});
  if (aksi === "lapor.pesan" && perangkat) daftar.push({kunci: perangkat, aksi: "lapor.perangkat", batas: BATAS_PERANGKAT_JAM});   // D102: per perangkat, di samping nomor dan IP
  const r = await H.lpKuota(env, P, daftar, kini);
  if (!r) return null;
  if (aksi !== "lapor.pesan") return json({galat: "Terlalu sering. Coba lagi nanti.", sisaDetik: r.sisa}, 429, {...HDR, "retry-after": String(r.sisa)});
  const d = new Date(kini + r.sisa * 1000 + 7 * JAM), pukul = `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`;
  const balasan = `Kuota pesan untuk nomor ini habis untuk satu jam ini. Laporan Anda tersimpan; lanjutkan lagi pukul ${pukul} WIB. Bila ada nyawa terancam, telepon 112.`;
  return json({galat: balasan, sisaDetik: r.sisa, balasan, teksWa: balasan}, 429, {...HDR, "retry-after": String(r.sisa)});
}

/* ---------------- token lacak: HMAC nomor, hanya sha256-nya di D1 ---------------- */
async function tokenLacak(env, nomor) {   // kunci turunan berlabel domain "lapor-lacak|": SESI_KUNCI mentah tidak pernah menandatangani langsung; SESI_KUNCI kosong dicegah oleh jaga()
  const enc = new TextEncoder(), hmac = k => crypto.subtle.importKey("raw", k, {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const turunan = await crypto.subtle.sign("HMAC", await hmac(enc.encode(env.SESI_KUNCI)), enc.encode("lapor-lacak|"));
  return hex(await crypto.subtle.sign("HMAC", await hmac(turunan), enc.encode(nomor))).slice(0, 32);
}

/* ---------------- data publik via ASSETS ---------------- */
let WIL, INFO, REG;
const muatAset = env => async jalur => { const r = await env.ASSETS.fetch(new Request("https://aset.lokal" + jalur)); if (!r.ok) { r.body?.cancel(); throw new Error(`aset ${jalur} ${r.status}`); } return r.json(); };
const wilayahDari = env => WIL ||= buatWilayah(muatAset(env));
const SEL = buatSelamat(wilayahDari);
const KOMEN = buatKomen({pelapor: (...a) => pelapor(...a), kartuTampil: (...a) => kartuTampil(...a), model: env => modelDari(env)});   // komentar kartu Alun-alun (LA-85); fungsi dibungkus karena didefinisikan di bawah   // kabar selamat dan orang dicari (LA-80)
const KOMEN_MEJA = buatKomenMeja({hakMeja: (...a) => hakMeja(...a), kartuPeta: (...a) => kartuPeta(...a), stmtRevisi: (...a) => stmtRevisi(...a), dariBaris: r => dariBaris(r), wilayahBaris: b => wilayahBaris(b)});   // meja komentar (LA-88)
const registriDari = env => REG ||= muatAset(env)("/bencana.json").catch(e => { REG = null; throw e; });   // katalog tindakan (AGENTS 2.28, D112)
// nomor BPBD dari panen situs resmi (K88); gagal muat = 117, laporan tetap tersimpan
let KONTAK;
const kontakDari = env => KONTAK ||= muatAset(env)("/data/bpbd_kontak.json").catch(() => { KONTAK = null; return null; });
const infoDari = env => INFO ||= buatInfo({muat: muatAset(env), wilayah: wilayahDari(env)});
const modelDari = env => buatModel({kunci: env.ANTHROPIC_API_KEY, model: env.LAPOR_MODEL || undefined, dasar: /^https:\/\//.test(env.LAPOR_BASE_URL || "") ? env.LAPOR_BASE_URL : "", catat: u => console.log(`lapor model ${u.model} masuk ${u.masuk} keluar ${u.keluar} cache ${u.cache ?? 0} ${u.henti}`)});   // tanpa kunci = null = pertanyaan templat

/* ---------------- memuat sesi ---------------- */
const dariBaris = r => { const s = JSON.parse(r.kerja); s.id = r.id; s.wa = r.wa; if (r.nomor) { s.nomor = r.nomor; s.terkirim = r.terkirim; } return s; };
async function lengkapi(env, p, row) {   // sesi + tiket + balasan + pelapor (untuk lacak, meja, dokumen)
  const s = dariBaris(row), [tiket, riwayat, balasan, pel] = await Promise.all([H.lpTiket(env, p, s.nomor), H.lpRiwayat(env, p, s.nomor), H.lpBalasan(env, p, s.nomor),
    s.verifikasi === "ketik" ? s.pelaporKetik ?? null : H.lpPelapor(env, p, s.wa)]);   // laporan ketikan memakai identitas yang diketik di laporan itu, bukan profil pemilik nomor
  s.tiket = {status: tiket?.status || "baru", riwayat}; s.balasan = balasan;
  const vi = await H.lpVersiInfo(env, p, s.nomor); s.jumlahVersi = vi.versi; s.adaSusulan = vi.ada;
  return {s, pel: pel || {}};
}
const provDari = s => s.isian.lokasi?.nilai?.wilayah?.provKode;

/* ---------------- satu putaran percakapan (POST /pesan, dan foto) ---------------- */
/* profil pelapor (nama, peran, instansi): disimpan per nomor untuk jalur WA dan /masuk. Nomor ketikan (K65) memakai profil yang tersimpan di sesinya
   sendiri, supaya orang yang mengetik nomor orang lain tidak melihat atau menimpa nama pemiliknya (tinjauan keamanan, 20 Nov 2026). */
// batas harian nomor ketikan dihitung per perangkat: orang lain yang mengetik nomor itu tidak menghabiskan jatah pemilik nomor
const terkirimHari = async (env, id, kini) => id.ketik ? (await H.lpSesiMilikPerangkat(env, P, id.wa, id.perangkat)).filter(x => x.terkirim > kini - HARI).length : H.lpHitungTerkirim(env, P, id.wa, kini - HARI);
const profil = async (env, id, sesi) => id.ketik ? (sesi?.pelaporKetik ? {...sesi.pelaporKetik} : null) : (await H.lpPelapor(env, P, id.wa)) || null;
function naikBpbd(pel, izin) {   // D19: klaim BPBD jadi bpbd bila nomor dikonfirmasi pemilik/admin lewat lapor_izin
  if (pel?.peran === "bpbd_klaim" && izin?.peran === "bpbd") { pel.peran = "bpbd"; if (izin.kab && !pel.kab) pel.kab = izin.kab; return true; }
  return false;
}
/* kejadian yang sama (K66, D103): laporan terkirim sekecamatan dalam jendela jenisnya; tanpa tabel 0160 = kosong = jalur lama. Tanpa data orang di hasil (D104). */
async function kandidatDari(env, kecKode, kini) {
  if (!/^\d{2}\.\d{2}\.\d{2}$/.test(kecKode || "")) return [];
  const baris = await bacaTabel(() => H.lpKandidatKejadian(env, P, kecKode.slice(0, 5), kini - 72 * JAM), []);
  return kandidatKejadian(baris.map(r => { const k = ringkasDari(r);
    return {nomor: r.nomor, jenis: r.jenis, subjenis: k.subjenis || null, wilayah: k.wilayah || null, ref: Math.max(k.waktuMs || 0, r.terkirim || 0), status: r.status, n: r.n || 1, kejadian: r.kode || null,
      waktu: k.waktuKejadian && k.waktuMs ? {nilai: k.waktuKejadian, ms: k.waktuMs} : null}; }), {kecKode, kini});
}
async function putar(env, ctx, url, id, pesan, kini) {
  const {wa, saluran} = id, izin = id.ketik ? null : id.izin;   // D101: nomor ketikan tidak pernah menaikkan bpbd_klaim
  const baris = await sesiAktif(env, id), lama = baris ? dariBaris(baris) : null;
  const pel = await profil(env, id, lama);
  naikBpbd(pel, izin);
  const kirimIsh = /^(1|kirim)$/i.test(String(pesan.teks || "").trim()) || pesan.pilih?.[0] === 1;
  if (lama?.status === "ringkasan" && !lama.susulanDari && kirimIsh && await terkirimHari(env, id, kini) >= MAKS_TERKIRIM_HARI) return {batas: true};   // sebelum model dipanggil
  const awal = lama?.transkrip?.length ?? 0, lanjut = !!lama && !SELESAI.has(lama.status);   // putaran menambah ke objek yang sama: panjang awal dicatat sebelumnya
  const h = await putaran({sesi: lama, pelapor: pel, model: modelDari(env), wilayah: wilayahDari(env), kandidat: a => kandidatDari(env, a.kecKode, a.kini), pesan: {...pesan, wa, saluran}, kini});
  if (naikBpbd(h.pelapor, izin)) h.sesi.tingkat = "bpbd";
  // lanjut dihitung sebelum putaran: putaran mengubah objek lama di tempat. Sesi selesai diganti sesi baru, selebihnya baris yang sama
  h.sesi.id = lanjut ? lama.id : `${kini.toString(36)}${acak(3)}`;
  h.sesi.wa = wa;
  if (id.ketik) { h.sesi.verifikasi = "ketik"; if (h.pelapor) h.sesi.pelaporKetik = h.pelapor; }   // D101: meja menampilkan nomorTerverifikasi: false
  return {h, baris, lama, lanjut, pel, awal};
}
/* laporan susulan (F-28, ALGORITMA A12): perubahan digabung ke tiket asal sebagai versi baru, satu batch; (nomor, versi) menolak dua susulan serentak */
async function simpanSusulan(env, url, {wa, saluran, perangkat}, {h, baris, awal}, kini) {
  const copy = h.sesi, nomor = copy.susulanDari, aBaris = await H.lpSesiNomor(env, P, nomor);
  if (!await milikSesi(env, {wa, perangkat}, aBaris)) return {tolak: "Laporan asal tidak ditemukan."};
  const asal = dariBaris(aBaris), [tiket, vi] = await Promise.all([H.lpTiket(env, P, nomor), H.lpVersiInfo(env, P, nomor)]);
  asal.tiket = {status: tiket?.status}; asal.jumlahVersi = vi.versi;
  if (!bolehSusulan(asal, kini)) return {tolak: "Kabar tambahan hanya bisa dikirim 72 jam sejak laporan terkirim, sebelum laporan selesai ditangani."};
  for (const k of KUNCI_SUSULAN) if (asal.isian[k]) copy.isian[k] = asal.isian[k]; else if (!(k === "jenis" && asal.darurat)) delete copy.isian[k];   // jenis, lokasi, waktu terkunci; jenis kosong laporan darurat sekali ketuk boleh diisi (K90)
  const lama = new Map(isianTampil(asal).map(x => [x.nama, x])), perubahan = [], kosong = v => /^(belum didata|tidak tahu|belum tahu|belum diketahui)$/i.test(v);
  for (const x of isianTampil(copy)) {
    const l = lama.get(x.nama), a = l && l.status !== "kosong" ? l.tampil : "belum didata", b = x.status !== "kosong" ? x.tampil : "belum didata";
    if (a !== b && !(kosong(a) && kosong(b))) perubahan.push({nama: x.nama, label: x.label, dari: a, ke: b});
  }
  if (asal.darurat?.cara === "sekali_ketuk" && copy.darurat?.korban && copy.darurat.korban !== asal.darurat.korban) {   // K90: korban darurat diisi lewat Tambah kabar, tercatat di versi
    perubahan.push({nama: "korban_darurat", label: "Ada korban", dari: KORBAN_DARURAT[asal.darurat.korban], ke: KORBAN_DARURAT[copy.darurat.korban]});
    asal.darurat = {...asal.darurat, korban: copy.darurat.korban};
  }
  const versi = vi.versi + 1, st = tiket.status, token = await tokenLacak(env, nomor), pesanBaru = copy.transkrip.slice(awal);
  asal.isian = structuredClone(copy.isian);
  asal.foto = [...(asal.foto || []), ...(copy.foto || [])].slice(0, 20);
  copy.status = "terkirim"; copy.susulanVersi = versi;   // salinan selesai; tanpa nomor sendiri jadi tidak tampil di meja
  h.inti = h.balasan = `*Laporan diperbarui*\n_${nomor} versi ${versi}_\n\n${perubahan.length ? `*Perubahan:*\n${perubahan.map(x => `- ${x.label}: ${x.dari} menjadi ${x.ke}`).join("\n")}` : "Tidak ada angka yang berubah."}\n\nPDF versi baru menyusul.`;
  const akhir = copy.transkrip.at(-1); if (akhir?.dari === "bot") akhir.teks = h.inti;
  let ringkas = JSON.stringify(ringkasSesi(asal)); if (ringkas.length > 4000) ringkas = JSON.stringify({lengkap: lengkap(asal), foto: (asal.foto || []).length, wilayah: wilayahKecil(asal)});
  const w = asal.isian.lokasi?.nilai, catatan = `Susulan versi ${versi}: ${perubahan.length ? perubahan.map(x => x.label).join(", ") : "tanpa perubahan angka"}`;
  const sesiAsal = {id: asal.id, status: asal.status, tingkat: asal.tingkat, jenis: asal.isian.jenis?.nilai ?? null, kab: w?.wilayah?.kabKode ?? null, lat: w?.lat ?? null, lon: w?.lon ?? null,
    kerja: JSON.stringify({...asal, tiket: undefined, jumlahVersi: undefined}), ringkas};
  const sesiCopy = {id: copy.id, status: copy.status, tingkat: copy.tingkat, jenis: copy.isian.jenis?.nilai ?? null, kab: w?.wilayah?.kabKode ?? null, lat: w?.lat ?? null, lon: w?.lon ?? null, kerja: JSON.stringify(copy)};
  let r;
  try {
    r = await H.lpBatch(env, P, [H.lpStmtSesiUbah(env, P, sesiAsal, aBaris.rev, kini),
      H.lpStmtVersi(env, P, nomor, versi, JSON.stringify(asal.isian), JSON.stringify(perubahan), kini, true),
      H.lpStmtRiwayat(env, P, nomor, st, st, catatan, "Pelapor", kini, true), H.lpStmtPdfAntre(env, P, nomor, versi, kini, true),
      ...pesanBaru.map(t => H.lpStmtPesan(env, P, copy.id, t.dari, saluran === "wa" ? "wa" : "web", t.teks, t.waktu, true)),
      H.lpStmtSesiUbah(env, P, sesiCopy, baris.rev, kini)]);
  } catch (e) { if (/UNIQUE|constraint/i.test(String(e?.message))) return {bentrok: true}; throw e; }   // susulan lain mengambil versi yang sama
  if (!r[0].meta.changes) return {bentrok: true};
  const q = `?t=${token}`;
  return {token, tambahan: {nomor, susulan: versi, lacak: `/lapor/lacak.html${q}`, foto: asal.foto?.[0] ? `/api/lapor/foto/${asal.foto[0].id}${q}` : null, unduhan: [
    {label: "Lacak laporan", url: `/lapor/lacak.html${q}`, lacak: true},
    {label: "Unduh PDF", url: `/api/lapor/unduh/${nomor}.pdf${q}`}, {label: "Unduh Word", url: `/api/lapor/unduh/${nomor}.docx${q}`}]}};
}
async function simpanPutaran(env, url, {wa, saluran, perangkat}, {h, baris, lama, lanjut, pel, awal}, kini, tambahStmt = []) {
  if (h.kirim && h.sesi.susulanDari) return simpanSusulan(env, url, {wa, saluran, perangkat}, {h, baris, awal}, kini);
  const s = h.sesi, pesanBaru = s.transkrip.slice(lanjut ? awal : 0), g = [], kj = [], tambahan = {};
  // orang dicari lewat obrolan (pemilik 25 Nov 2026): batas 5 per nomor per hari sama dengan POST /api/lapor/cari, dicek sebelum sesi disimpan
  if (h.kirimCari && await laju(env, await sha(wa), "lapor.cari.baru", [[HARI, 5]], kini)) return {batas: true, teks: "Batas laporan orang dicari hari ini sudah tercapai (5 laporan per nomor). Coba lagi besok, atau hubungi 112 bila orang itu dalam bahaya sekarang."};
  let nomor = null, tokenSha = null, ringkas = null, token = null;
  if (h.kirim) {   // nomor tiket, token lacak, PDF dan Word (ALGORITMA A6, A8)
    if (await H.lpHitungTerkirim(env, P, wa, kini - HARI) >= MAKS_TERKIRIM_HARI) return {batas: true, teks: BATAS_KIRIM_TEKS};
    const tgl = tglWib(kini), n = await H.lpNomorBerikut(env, P, tgl);
    nomor = `LA-${tgl.slice(8, 10)}${tgl.slice(5, 7)}${tgl.slice(2, 4)}-${String(n).padStart(2, "0")}`;
    token = await tokenLacak(env, nomor); tokenSha = await sha(token);
    s.nomor = nomor;
    const kb = kontakBpbd(await kontakDari(env), s.isian.lokasi?.nilai?.wilayah);   // K88: arahkan pelapor ke BPBD setempat
    h.inti = h.balasan = T.terkirim(h.pelapor?.nama, nomor, kalimatBpbd(kb));
    const akhir = s.transkrip.at(-1); if (akhir?.dari === "bot") akhir.teks = h.inti;   // transkrip memuat nomor sebenarnya, bukan "(nomor menyusul)"
    ringkas = JSON.stringify(ringkasSesi(s));
    if (ringkas.length > 4000) ringkas = JSON.stringify({lengkap: lengkap(s), foto: (s.foto || []).length, wilayah: wilayahKecil(s)});   // CHECK kolom: ringkasan tidak boleh memutus penyimpanan
    const q = `?t=${token}`;
    Object.assign(tambahan, {nomor, bpbd: {nama: kb.nama, nomor: kb.nomor, tingkat: kb.tingkat}, lacak: `/lapor/lacak.html${q}`, foto: s.foto?.[0] ? `/api/lapor/foto/${s.foto[0].id}${q}` : null, unduhan: [
      {label: "Lacak laporan", url: `/lapor/lacak.html${q}`, lacak: true},
      {label: "Unduh PDF", url: `/api/lapor/unduh/${nomor}.pdf${q}`}, {label: "Unduh Word", url: `/api/lapor/unduh/${nomor}.docx${q}`}]});
    g.push(H.lpStmtTiketBaru(env, P, nomor, s.id, kini, true), H.lpStmtRiwayat(env, P, nomor, null, "baru", null, "Sistem", kini, true), H.lpStmtPdfAntre(env, P, nomor, VERSI, kini, true));
  }
  if (h.kirim && s.kejadian) {   // kejadian yang sama (K66, D106): kode diberikan saat laporan kedua dikonfirmasi; laporan induk ikut ditandai
    const induk = s.kejadian.induk, ib = RE_NOMOR.test(induk) ? await bacaTabel(() => H.lpSesiNomor(env, P, induk), null) : null;
    const ada = ib ? await bacaTabel(() => H.lpKejadianKode(env, P, induk), null) : null;
    let kode = ada;
    if (ib && !kode) { try { kode = kodeKejadian(ib.terkirim, await H.lpKejadianBerikut(env, P, tglKejadian(ib.terkirim))); } catch (e) { if (!tabelBelum(e)) throw e; } }
    if (kode) { s.kejadian = {kode, induk}; if (!ada) kj.push(H.lpStmtKejadianInduk(env, P, induk, kode, kini)); kj.push(H.lpStmtKejadianAnggota(env, P, nomor, induk, kini)); }   // di akhir batch: INSERT OR IGNORE bisa 0 baris dan memutus rantai changes() > 0 di atas
    else delete s.kejadian;
  }
  const w = s.isian.lokasi?.nilai, baru = {id: s.id, wa, status: s.status, tingkat: s.tingkat, jenis: s.isian.jenis?.nilai ?? null, kab: w?.wilayah?.kabKode ?? null,
    lat: w?.lat ?? null, lon: w?.lon ?? null, kerja: JSON.stringify(s), nomor, token_sha: tokenSha, terkirim: nomor ? s.terkirim : null, ringkas};
  for (const t of pesanBaru) g.push(H.lpStmtPesan(env, P, s.id, t.dari, saluran === "wa" ? "wa" : "web", t.teks, t.waktu, true));
  if (h.kirimCari) { const id = acak(8); g.push(H.crStmtTambah(env, P, {id, nomor_pencari: wa, ...h.kirimCari}, kini, true)); tambahan.cari = {id, status: "buka"}; }   // satu batch dengan sesi (tinjauan keamanan 25 Nov 2026)
  const p = h.pelapor;
  if (s.verifikasi !== "ketik" && p?.nama && (!pel || pel.nama !== p.nama || pel.peran !== p.peran || pel.kab !== (p.kab ?? null) || pel.jabatan !== (p.jabatan ?? null))) g.push(H.lpStmtPelapor(env, P, wa, p, kini, true));
  g.push(...tambahStmt, ...kj);
  // satu batch: pembaruan sesi (rev dijaga) lebih dulu, sisanya hanya menulis bila pembaruan itu mengubah baris (changes() > 0): tidak ada sesi bernomor tanpa tiket
  // sesi baru yang langsung terkirim (darurat sekali ketuk, K90): INSERT tidak menulis nomor dan token, jadi diikuti UPDATE rev 0 di batch yang sama
  const r = await H.lpBatch(env, P, [lanjut ? H.lpStmtSesiUbah(env, P, baru, baris.rev, kini) : H.lpStmtSesiBaru(env, P, baru, kini), ...(!lanjut && nomor ? [H.lpStmtSesiUbah(env, P, baru, 0, kini)] : []),
    ...(lanjut ? [] : stmtMilikSesi(env, perangkat, s.id)), ...g]);
  if (!r[0].meta.changes) return {bentrok: true};
  if (h.kirimTemu && tambahan.cari) await H.ctTambah(env, P, {cari_id: tambahan.cari.id, ...h.kirimTemu}).catch(e => tabelBelum(e) || console.error("lapor_cari_temu", e?.message));   // ponytail: di luar batch sampai 0177 terpasang di produksi
  if (h.kirimTemu?.foto_id && tambahan.cari) await H.cfTambah(env, P, tambahan.cari.id, h.kirimTemu.foto_id).catch(e => tabelBelum(e) || console.error("lapor_cari_foto", e?.message));   // sampai 0185 terpasang: laporan tetap masuk tanpa tautan foto
  return {tambahan, token};
}
const teksWaDari = (h, tambahan, token, url) => h.kirim ? `${h.inti}\n\nLacak laporan: ${url.origin}/lapor/lacak.html?t=${token}` : h.balasan;

async function pesan(env, req, url, kini, ctx) {
  const b = await bacaBody(req, 16384); if (b.galat) return galat(b.status || 400, b.galat);
  const o = b.o;
  if (req.headers.get("authorization") && await mesinSah(env, req)) { const w = nomorWa(o?.wa), j = w && await pesanTim(env, w, o, kini, url.origin); if (j) return j; }   // tahap 2 data lanjutan BPBD (LJ-05, D11): anggota tim berkas lolos di sini saja
  const id = await pelapor(env, req, url, o); if (id instanceof Response) return id;
  const {wa, perangkat} = id;
  // ponytail: saluran bawaan = jalur masuk (mesin = wa, sesi = web); mesin boleh meneruskan saluran "web" hanya bila gateway web memintanya
  const saluran = id.saluran === "web" ? "web" : o.saluran === "web" ? "web" : "wa";
  const batas = await kuota(env, req, id, kini);
  if (batas) return batas;
  // bahasa pilihan (K58, D80-D82): web dan WA (gateway mengirim pilihan nomor itu), hanya bila model tersedia; pesan diterjemahkan ke Indonesia sebelum mesin, teks asli disimpan berdampingan
  const model = modelDari(env), bahasa = model ? bahasaSah(o.bahasa) : "id";
  const mentahTeks = typeof o.teks === "string" ? o.teks.slice(0, 2000) : "";
  const terj = saringTopik(mentahTeks) ? {teks: mentahTeks, asli: mentahTeks, diterjemahkan: false} : await keIndonesia(model, mentahTeks, bahasa), teks = terj.teks;   // K72: pesan luar topik tidak diterjemahkan model
  if (/^(cek\s+)?status(\s+laporan)?$/i.test(teks.trim())) return statusLaporan(env, id);
  let lokasi = null;
  if (o.lokasi && typeof o.lokasi === "object") {
    const L = o.lokasi;
    if (L.kode != null) { // dipilih dari pencarian desa
      if (typeof L.kode !== "string" || !RE_KODE_DESA.test(L.kode)) return galat(400, "Kode desa tidak sah.");
      const c = await wilayahDari(env).pusat(L.kode);
      if (!c) return galat(400, "Desa tidak ditemukan.");
      lokasi = {lat: c.lat, lon: c.lon, sumber: L.poster === true ? "poster" : "cari", wilayah: c.wilayah};   // poster: tautan /lapor/?d= (K92, D131), dipilih pelapor sendiri
    } else {
      if (!titikSah(L.lat, L.lon)) return galat(400, "Lokasi di luar Indonesia atau tidak sah.");
      lokasi = {lat: L.lat, lon: L.lon, sumber: typeof L.sumber === "string" ? L.sumber.slice(0, 20) : "perangkat", ...(angka(L.akurasi) && L.akurasi >= 0 ? {akurasi: L.akurasi} : {})};
    }
  }
  const sesiPesan = {teks, lokasi, form: o.form && typeof o.form === "object" && !Array.isArray(o.form) ? o.form : null,
    pilih: Array.isArray(o.pilih) ? o.pilih.slice(0, 20).map(Number).filter(Number.isInteger) : null, lain: typeof o.lain === "string" ? o.lain.slice(0, 120) : null, kembali: o.kembali === true,
    luring: angka(o.luring) ? o.luring : null, luringKirim: angka(o.luring_kirim) ? o.luring_kirim : null};   // Lapor tanpa sinyal: waktu simpan di HP, hanya keterangan (tandaLuring), bukan waktu kejadian
  const r = await putar(env, ctx, url, {...id, saluran}, sesiPesan, kini);
  if (r.batas) return kirim(200, {balasan: BATAS_KIRIM_TEKS, teksWa: BATAS_KIRIM_TEKS, status: "ringkasan"});
  r.h.sesi.bahasa = bahasa;
  if (terj.diterjemahkan) { const t = [...r.h.sesi.transkrip].reverse().find(x => x.dari === "pelapor"); if (t) Object.assign(t, {asli: samarkan(terj.asli), bahasa}); }   // asli disamarkan sama dengan terjemahannya; ikut tersimpan di kerja sesi
  const s = await simpanPutaran(env, url, {wa, saluran, perangkat}, r, kini);
  if (s.bentrok) return galat(409, "Pesan lain dari nomor ini sedang diproses. Coba kirim ulang.");
  if (s.tolak) return galat(409, s.tolak);
  if (s.batas) return kirim(200, {balasan: s.teks, teksWa: s.teks, status: r.lama?.status || null});
  if (s.tambahan?.nomor && !r.h.sesi.susulanDari && r.h.sesi.tingkat === "bpbd") await bukaBerkasAman(env, s.tambahan.nomor, kini, url.origin);   // data lanjutan BPBD (LJ-03, D1)
  return kirim(200, await keluarBahasa(r.h.sesi?.tanpaModel ? null : model, {...keluaran(r.h, r.h.sesi), ...s.tambahan, teksWa: teksWaDari(r.h, s.tambahan, s.token, url), pelapor: r.h.pelapor ? {nama: r.h.pelapor.nama, peran: r.h.pelapor.peran} : null}, bahasa, saluran, env));
}
/* balasan mesin (Indonesia) -> bahasa pilihan; angka dijaga dua arah di dariIndonesia, gagal = Indonesia.
   Pintu WA (pemilik 20 Nov 2026: "bot WA bisa bahasa daerah juga"): yang dikirim gateway adalah teksWa, jadi itu yang diterjemahkan. */
const KAMUS_TR = new Map();   // kamus statis per bahasa dari aset public/lapor/tr, sekali per isolat
async function kamusTr(env, bahasa) {
  if (!env?.ASSETS || bahasa === "id") return null;
  if (!KAMUS_TR.has(bahasa)) KAMUS_TR.set(bahasa, env.ASSETS.fetch(new Request(`https://aset.lokal/lapor/tr/${bahasa}.json`)).then(r => r.ok ? r.json() : null).catch(() => null));
  return KAMUS_TR.get(bahasa);
}
async function keluarBahasa(model, out, bahasa, saluran = "web", env = null) {
  if (bahasa === "id") return out;
  const kamus = await kamusTr(env, bahasa);
  if (!model && !kamus) return out;
  if (saluran === "wa") { if (!out.teksWa) return out; const tr = await dariIndonesia(model, {teks: out.teksWa, nama: out.pelapor?.nama || null}, bahasa, kamus); return Object.assign(out, {teksWa: tr.teks, bahasa}); }
  if (!out.balasan) return out;
  const tr = await dariIndonesia(model, {teks: out.balasan, pilihan: out.pilihan, ket: out.ket, nama: out.pelapor?.nama || null}, bahasa, kamus);
  return Object.assign(out, {balasan: tr.teks, pilihan: tr.pilihan, ket: tr.ket, bahasa, pilihanAsli: out.pilihan});   // label Indonesia untuk aturan layar (pilihan tunggal, Lainnya)
}
async function bahasaGet(env, req, url, kini) {
  const lj = await lajuPublik(env, req, "lapor.bahasa", 120, kini); if (lj) return lj;
  return kirim(200, {bahasa: modelDari(env) ? BAHASA.map(([kode, nama]) => ({kode, nama})) : [{kode: "id", nama: "Bahasa Indonesia"}]});   // tanpa model hanya Indonesia (D82)
}

/* mulai laporan susulan (F-28): sesi salinan tanpa nomor, langsung mode Ubah; 409 di luar jendela 72 jam / 10 versi atau bila ada sesi isian hidup */
async function susulanPost(env, req, url, kini) {
  const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat);
  const id = await pelapor(env, req, url, b.o); if (id instanceof Response) return id;
  const {wa, saluran} = id, nomor = b.o.nomor;
  const lj = await kuota(env, req, id, kini); if (lj) return lj;
  const aBaris = typeof nomor === "string" && RE_NOMOR.test(nomor) ? await H.lpSesiNomor(env, P, nomor) : null;
  if (!await milikSesi(env, id, aBaris)) return galat(404, "Laporan tidak ditemukan.");
  const asal = dariBaris(aBaris), [tiket, vi] = await Promise.all([H.lpTiket(env, P, nomor), H.lpVersiInfo(env, P, nomor)]);
  asal.tiket = {status: tiket?.status}; asal.jumlahVersi = vi.versi;
  if (!bolehSusulan(asal, kini)) return galat(409, "Kabar tambahan hanya bisa dikirim 72 jam sejak laporan terkirim, sebelum laporan selesai ditangani.");
  const hb = await sesiAktif(env, id), hidup = hb ? dariBaris(hb) : null;
  if (hidup && !SELESAI.has(hidup.status) && !hidup.susulanDari) return galat(409, "Selesaikan atau batalkan dulu laporan yang sedang diisi.");
  const {nomor: _n, token: _t, tiket: _ti, versi: _v, jejak: _j, akhir: _a, susulanBaru: _s, balasan: _b, nilai: _ni, jumlahVersi: _jv, adaSusulan: _as, terkirim: _te, id: _id, ...dasar} = structuredClone(asal);
  const copy = {...dasar, id: `${kini.toString(36)}${acak(3)}`, wa, status: "ringkasan", susulanDari: nomor, transkrip: [], foto: [], fotoSelesai: true, ditanya: [], dibuat: kini};
  const pel = await profil(env, id, copy);
  const lengkapiDarurat = mulaiDiJenisDarurat(copy);   // laporan sekali ketuk (K90): mulai di jenis, korban, foto
  if (lengkapiDarurat) copy.status = "darurat_jenis";
  const h = await putaran({sesi: copy, pelapor: pel, model: null, wilayah: wilayahDari(env), kini, pesan: {wa, teks: lengkapiDarurat ? "" : "2", saluran}});   // masuk mode Ubah
  h.sesi.transkrip = h.sesi.transkrip.filter(t => t.dari === "bot");
  h.inti = lengkapiDarurat ? `*Lengkapi laporan darurat ${nomor}*\nLokasi Anda sudah diterima petugas. Jawab beberapa pertanyaan ini bila sempat.\n\n${h.inti}` : `*Tambah kabar untuk ${nomor}*\nTulis apa yang berubah dengan kalimat biasa, misalnya *air naik lagi sepinggang*, *meninggal jadi 2*, atau *pengungsi 30 orang*.\nJenis bencana, lokasi, dan waktu kejadian tidak berubah. Kabar ini masuk ke tiket yang sama sebagai versi baru.`;
  h.sesi.transkrip.at(-1).teks = h.inti; h.sesi.akhir = {...(h.sesi.akhir || {}), inti: h.inti, balasan: h.inti};
  h.sesi.id = copy.id; h.sesi.wa = wa;
  const w = h.sesi.isian.lokasi?.nilai;
  await H.lpBatch(env, P, [H.lpStmtSesiBaru(env, P, {id: copy.id, wa, status: h.sesi.status, tingkat: h.sesi.tingkat, jenis: h.sesi.isian.jenis?.nilai ?? null, kab: w?.wilayah?.kabKode ?? null, lat: w?.lat ?? null, lon: w?.lon ?? null, kerja: JSON.stringify(h.sesi)}, kini), ...stmtMilikSesi(env, id.perangkat, copy.id)]);
  return kirim(200, {...keluaran(h, h.sesi), susulanDari: nomor, teksWa: h.balasan});
}

/* Darurat sekali ketuk (K90, D122-D125): satu permintaan membuat laporan darurat terkirim berisi titik GPS. Nomor tetap wajib
   (Q65 belum dijawab pemilik: pintu tanpa identitas tidak dibuka); identitas dari jalur yang sama dengan /pesan.
   Batas di luar kuota pesan: 1 per perangkat (atau nomor) per 30 menit, 3 per IP per jam (A29). Draf laporan biasa yang belum terkirim diganti, sama dengan K68. */
const JEDA_SEKALI = 30 * 60000;
const KORBAN_DARURAT = {ya: "ada", tidak: "tidak ada", belum_tahu: "belum tahu"};
async function daruratCepat(env, req, url, kini) {
  const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat);
  const o = b.o, id = await pelapor(env, req, url, o); if (id instanceof Response) return id;
  const lj = await lajuPublik(env, req, "lapor.sekali.ip", 3, kini); if (lj) return lj;
  // per nomor juga (tinjauan keamanan 23 Nov 2026): nomor ketikan orang lain dari perangkat berganti tetap paling banyak 1 per 30 menit dan 3 per hari
  const r0 = await H.lpKuota(env, P, [{kunci: id.perangkat || id.wa, aksi: "lapor.sekali", batas: [[JEDA_SEKALI, 1]]}, {kunci: id.wa, aksi: "lapor.sekali.wa", batas: [[JEDA_SEKALI, 1], [HARI, 3]]}], kini);
  if (r0) return json({galat: "Laporan darurat dari perangkat ini baru saja terkirim. Petugas sudah menerimanya; telepon 112 bila ada nyawa terancam.", sisaDetik: r0.sisa}, 429, {...HDR, "retry-after": String(r0.sisa)});
  const L = o.lokasi && typeof o.lokasi === "object" ? o.lokasi : null;
  const lokasi = L && titikSah(L.lat, L.lon) ? {lat: L.lat, lon: L.lon, ...(angka(L.akurasi) && L.akurasi >= 0 ? {akurasi: L.akurasi} : {})} : null;   // titik di luar Indonesia dibuang, laporan tetap dibuat (A29)
  let wil = null;
  if (lokasi) { try { const w = await wilayahDari(env)(lokasi.lat, lokasi.lon); if (w) { const {sekitar, ...x} = w; wil = x; } } catch { wil = null; } }
  const hb = await sesiAktif(env, id), hidup = hb ? dariBaris(hb) : null, lanjut = !!hidup && !SELESAI.has(hidup.status) && !hidup.susulanDari;
  const pel = await profil(env, id, null); naikBpbd(pel, id.ketik ? null : id.izin);
  const sesi = sesiSekaliKetuk({pelapor: pel, lokasi, wil, kini, waktu: angka(o.waktu_klien) ? o.waktu_klien : null});
  sesi.id = lanjut ? hidup.id : `${kini.toString(36)}${acak(3)}`; sesi.wa = id.wa;
  if (id.ketik) { sesi.verifikasi = "ketik"; if (pel) sesi.pelaporKetik = pel; }
  const h = {sesi, pelapor: pel, kirim: true, inti: "", balasan: ""};
  const s = await simpanPutaran(env, url, {wa: id.wa, saluran: "web", perangkat: id.perangkat}, {h, baris: lanjut ? hb : null, lama: hidup, lanjut, pel, awal: 0}, kini);
  if (s.bentrok) return galat(409, "Pesan lain dari nomor ini sedang diproses. Coba lagi.");
  if (s.batas) return galat(429, s.teks.replace(/\*/g, ""));
  return kirim(200, {...s.tambahan, balasan: h.inti, wilayah: wil ? {desa: wil.desa, kec: wil.kec, kab: wil.kab} : null});
}

/* cek status laporan milik nomor ini */
async function statusLaporan(env, id) {
  const {wa} = id, baris = await (id.perangkat ? H.lpSesiMilikPerangkat(env, P, wa, id.perangkat) : H.lpSesiMilik(env, P, wa)), milik = [];
  for (const b of baris) { const s = JSON.parse(b.kerja); milik.push({nomor: b.nomor, token: await tokenLacak(env, b.nomor), jenisLabel: labelJenis(s.isian.jenis?.nilai), terkirim: b.terkirim, provKode: provDari(s), status: b.tiket}); }
  const j = jawabStatus(milik), a = await sesiAktif(env, id), aktif = a ? dariBaris(a) : null;
  const lanjut = aktif && !["terkirim", "batal", "cari_terkirim"].includes(aktif.status) ? aktif : null;
  return kirim(200, {...j, teksWa: j.balasan, ...(lanjut ? lanjutan(lanjut) : {})});
}

/* ---------------- sesi, lokasi sekitar, info ---------------- */
async function sesiGet(env, req, url) {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const baris = await sesiAktif(env, id);
  return kirim(200, sesiTampil(baris ? dariBaris(baris) : null));
}
async function cariGet(env, req, url, kini) {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const lj = await lajuPublik(env, req, "lapor.cari", 300, kini); if (lj) return lj;
  const dalam = url.searchParams.get("dalam") || "";
  return kirim(200, {hasil: await wilayahDari(env).cariNama(String(url.searchParams.get("q") || "").slice(0, 80), /^\d{2}\.\d{2}(\.\d{2})?$/.test(dalam) ? dalam : "")});
}
const kueri = url => Object.fromEntries([...url.searchParams].map(([k, v]) => [k, v.slice(0, 80)]));
async function sekitarGet(env, req, url, kini, ctx) {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const lj = await lajuPublik(env, req, "lapor.sekitar", 120, kini); if (lj) return lj;
  const baris = await sesiAktif(env, id), s = baris ? dariBaris(baris) : null;
  const [kode, isi] = await infoDari(env).sekitar(kueri(url), s?.isian?.lokasi?.nilai, ctx);
  return kirim(kode, isi);
}
const infoGet = nama => async (env, req, url, kini) => {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const lj = await lajuPublik(env, req, `lapor.${nama}`, 120, kini); if (lj) return lj;
  const [kode, isi] = await infoDari(env)[nama](kueri(url));
  return kirim(kode, isi);
};
async function kotakGet(env, req, url) {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const sejak = Number(url.searchParams.get("sejak") || 0);
  return kirim(200, {pesan: (await (id.perangkat ? H.lpKabarWebPerangkat(env, P, id.wa, id.perangkat, Number.isFinite(sejak) ? sejak : 0) : H.lpKabarWeb(env, P, id.wa, Number.isFinite(sejak) ? sejak : 0))).map(k => ({nomor: k.nomor, teks: k.teks, waktu: k.waktu, ...(k.jenis === "status" ? {status: true} : {})}))});
}
async function nilaiPost(env, req, url, kini) {
  const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat);
  const id = await pelapor(env, req, url, b.o); if (id instanceof Response) return id;
  const lj = await kuota(env, req, id, kini, "lapor.nilai"); if (lj) return lj;
  const n = b.o.nilai, baris = RE_NOMOR.test(b.o.nomor || "") ? await H.lpSesiNomor(env, P, b.o.nomor) : null;
  if (!await milikSesi(env, id, baris) || !angka(n) || !Number.isInteger(n) || n < 1 || n > 5) return galat(400, "Nilai tidak sah.");
  const s = dariBaris(baris); s.nilai = {nilai: n, waktu: kini};
  if (!await H.lpSesiUbah(env, P, {id: s.id, status: s.status, tingkat: s.tingkat, jenis: s.isian.jenis?.nilai, kab: s.isian.lokasi?.nilai?.wilayah?.kabKode, lat: s.isian.lokasi?.nilai?.lat, lon: s.isian.lokasi?.nilai?.lon, kerja: JSON.stringify(s)}, baris.rev, kini))
    return galat(409, "Coba lagi.");
  return kirim(200, {ok: true});
}

/* ---------------- foto (KEPUTUSAN K5, D11): GPS perangkat <= 1 km dan <= 10 menit; EXIF <= 5 km dan <= 48 jam; WA: lokasi yang dibagikan ---------------- */
const b64 = (s, maks) => { const t = String(s || "").replace(/^data:image\/jpeg;base64,/, ""); if (t.length > maks) return null; try { return Uint8Array.from(atob(t), c => c.charCodeAt(0)); } catch { return null; } };
const kmDua = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return 6371 * Math.hypot(x, y); };
async function fotoPost(env, req, url, kini, ctx) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  if (!adaIdentitas(req)) return galat(401, "Masuk dulu dengan nomor WhatsApp Anda.");   // sebelum membaca badan sampai 7 MB
  const bb = await bacaBytes(req, 7e6); if (bb.galat) return galat(bb.status || 400, bb.galat);
  let o; try { o = JSON.parse(new TextDecoder().decode(bb.b) || "{}"); } catch { return galat(400, "body bukan JSON"); }
  if (!o || typeof o !== "object") return galat(400, "body harus objek JSON");
  if (req.headers.get("authorization") && await mesinSah(env, req)) { const w = nomorWa(o.wa), j = w && await fotoTim(env, w, o, kini); if (j) return j; }   // foto ke draf data lanjutan (LJ-05)
  const id = await pelapor(env, req, url, o); if (id instanceof Response) return id;
  const {wa, saluran} = id, mesin = saluran === "wa";
  const batas = await kuota(env, req, id, kini); if (batas) return batas;
  const mentah = b64(o.data, mesin ? 6.9e6 : 3.5e6);
  if (!mentah || mentah.length < 1000 || mentah.length > (mesin ? 5 : 2.5) * 1048576 || mentah[0] !== 0xff || mentah[1] !== 0xd8) return galat(400, `Foto harus JPEG, paling besar ${mesin ? 5 : "2,5"} MB.`);
  const bersih = bersihMedia("image/jpeg", mentah);   // buang metadata (EXIF) sebelum disimpan
  if (!bersih) return galat(400, "Struktur foto tidak sah atau rusak.");
  const baris = await sesiAktif(env, id), lama = baris ? dariBaris(baris) : null;
  const cari = lama?.status === "cari_foto";   // foto orang dicari: boleh dari galeri dan foto lama, tanpa lokasi (pemilik 26 Nov 2026)
  if (!lama || lama.status !== "foto" && !cari) return galat(409, "Foto belum diperlukan sekarang. Lanjutkan pertanyaan laporan dulu.", {teksWa: "*Foto belum diperlukan*\nLanjutkan jawaban pertanyaan laporan dulu; foto diminta di akhir."});
  if ((lama.foto || []).filter(f => f.jenis !== "video").length >= MAKS_FOTO || (lama.foto || []).length >= MAKS_BERKAS) return galat(400, `Paling banyak ${MAKS_FOTO} foto per laporan.`);
  let meta, waktuAmbil, sumberWaktu;
  if (cari) { meta = {lencana: "tanpa", lencanaTeks: "Foto orang dicari"}; waktuAmbil = kini; sumberWaktu = "waktu unggah"; }
  else if (mesin) {   // gateway WA: jam pesan dan lokasi yang dibagikan (bila ada); nilai tidak sah dibuang, bukan disimpan
    const w = o.waktu, L = o.lokasi && typeof o.lokasi === "object" && titikSah(o.lokasi.lat, o.lokasi.lon) ? {lat: o.lokasi.lat, lon: o.lokasi.lon} : null;
    waktuAmbil = angka(w) && w > kini - 48 * JAM && w <= kini + 5 * MENIT ? w : kini; sumberWaktu = waktuAmbil === kini ? "waktu unggah" : "waktu pesan WhatsApp";
    meta = L ? {lencana: "wa", lencanaTeks: "Lokasi dibagikan lewat WhatsApp", lat: L.lat, lon: L.lon} : {lencana: "tanpa", lencanaTeks: "Tanpa lokasi"};
  } else {
    const g = o.gps && typeof o.gps === "object" ? o.gps : null, x = o.exif && typeof o.exif === "object" ? o.exif : null;
    const L = nilaiFotoLuring(angka(o.luring) ? o.luring : null, kini, x && angka(x.waktu) ? x.waktu : null), acuan = L?.acuan ?? kini;   // foto Lapor tanpa sinyal (LR-06, Q1)
    if (L?.galat) return galat(400, L.galat);
    const gpsSah = !!g && titikSah(g.lat, g.lon) && angka(g.akurasi) && g.akurasi >= 0 && g.akurasi <= 1000 && angka(g.waktu) && Math.abs(acuan - g.waktu) <= 10 * MENIT;
    const xLok = x && titikSah(x.lat, x.lon) ? {lat: x.lat, lon: x.lon} : null, xWaktu = x && angka(x.waktu) && x.waktu <= kini + 5 * MENIT ? x.waktu : null;   // EXIF tidak sah dibuang
    if (xWaktu && kini - xWaktu > 48 * JAM) return galat(400, "Foto diambil lebih dari 48 jam lalu. Kirim foto terbaru dari lokasi.");
    if (x && x.kamera === false) return galat(400, "Foto harus diambil langsung dengan kamera ponsel. Tangkapan layar atau gambar hasil sunting tidak diterima.");   // web: tanpa Make/Model kamera (21 Nov 2026)
    if (gpsSah && xLok && kmDua(g.lat, g.lon, xLok.lat, xLok.lon) > 5) return galat(400, "Lokasi di foto lebih dari 5 km dari posisi Anda sekarang. Kirim foto yang diambil di lokasi ini.");
    meta = gpsSah ? {lencana: "gps", lencanaTeks: "Lokasi GPS perangkat", lat: g.lat, lon: g.lon, akurasi: g.akurasi}
      : xLok ? {lencana: "exif", lencanaTeks: "Lokasi dari data foto", lat: xLok.lat, lon: xLok.lon} : {lencana: "tanpa", lencanaTeks: "Tanpa lokasi"};
    if (L) meta.lencanaTeks = `${meta.lencanaTeks}, ${L.tanda}`;   // kolom lencana D1 tetap gps/exif/tanpa (CHECK 0155); tanda luring hanya di teks
    waktuAmbil = xWaktu || kini; sumberWaktu = xWaktu ? "waktu EXIF foto" : gpsSah ? "waktu GPS perangkat" : "waktu unggah";
  }
  const fid = acak(8), kunci = `lapor/foto/${fid}.jpg`;
  const info = {id: fid, ...meta, waktuAmbil, sumberWaktu, waktuTerima: kini};
  const m = await masukkanMedia(env, url, id, kini, baris, lama, info, kunci, () => env.MEDIA.put(kunci, bersih, {httpMetadata: {contentType: "image/jpeg"}}), () => env.MEDIA.delete(kunci).catch(() => {}));
  if (m.tolak) return galat(409, m.tolak);
  if (m.bentrok) return galat(409, "Pesan lain dari nomor ini sedang diproses. Coba kirim ulang.");
  const h = m.h, prov = provDari(h.sesi), bahasa = bahasaSah(o.bahasa);
  return kirim(200, await keluarBahasa(modelDari(env), {...keluaran(h, h.sesi), teksWa: h.balasan, fotoBaru: {id: fid, lencana: meta.lencana, lencanaTeks: meta.lencanaTeks, lat: meta.lat ?? null, lon: meta.lon ?? null, akurasi: meta.akurasi ?? null,
    waktuTeks: waktuLapor(waktuAmbil, prov), sumberWaktu, ke: h.sesi.foto.length, maks: MAKS_FOTO}}, bahasa, id.saluran, env));
}
/* satu foto atau video masuk ke laporan yang sedang diisi: putaran mesin + baris lapor_foto dalam satu batch D1. tulisR2 menulis berkas sesudah mesin menerima, buangR2 membuangnya bila batch gagal. */
async function masukkanMedia(env, url, id, kini, baris, lama, info, kunci, tulisR2, buangR2) {
  const {wa, saluran, perangkat} = id, izin = id.ketik ? null : id.izin;
  const pel = await profil(env, id, lama); naikBpbd(pel, izin);
  const awal = lama.transkrip.length;
  const h = await putaran({sesi: lama, pelapor: pel, model: null, wilayah: wilayahDari(env), pesan: {wa, saluran, foto: info}, kini});
  h.sesi.id = lama.id; h.sesi.wa = wa;
  if (id.ketik) { h.sesi.verifikasi = "ketik"; if (h.pelapor) h.sesi.pelaporKetik = h.pelapor; }
  if (!h.sesi.foto?.some(f => f.id === info.id)) return {tolak: "Foto belum diperlukan sekarang."};
  await tulisR2();
  try {
    const s = await simpanPutaran(env, url, {wa, saluran, perangkat}, {h, baris, lama, lanjut: true, pel, awal}, kini,
      [H.lpStmtFoto(env, P, {id: info.id, sesi: lama.id, kunci, lat: info.lat, lon: info.lon, akurasi: info.akurasi, waktuAmbil: info.waktuAmbil, waktuTerima: kini, lencana: info.lencana, pintu: saluran === "wa" ? "wa" : "web"}, true)]);
    if (s.bentrok) { await buangR2(); return {bentrok: true}; }
  } catch (e) { await buangR2(); throw e; }
  return {h};
}
/* berkas foto atau video: pemegang token lacak, pelapornya (sesi atau mesin), atau staf meja. `<id>` = foto atau sampul video (JPEG), `<id>.mp4|mov|webm` = video dengan Range (206)
   supaya bisa digeser. ponytail: kunci R2 video berekstensi netral (.vid, jenis baru diketahui setelah byte dibaca di "selesai"); Content-Type disajikan dari ekstensi alamat yang
   dibuat server sendiri dari sesi (urlMedia), jadi ekstensi yang dikarang pemegang token hanya mengubah header jawabannya sendiri. */
const TIPE_EKS = {mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm"};
async function fotoGet(env, req, url, kini, ctx, x) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const lj = await lajuPublik(env, req, "lapor.fotoget", 600, kini); if (lj) return lj;
  const m = /^([0-9a-f]{16})(?:\.(mp4|mov|webm))?$/.exec(x || ""); if (!m) return galat(404, "tidak ada");
  const f = await H.lpFotoById(env, PUBLIK, m[1]); if (!f) return galat(404, "tidak ada");
  const t = url.searchParams.get("t") || "";
  let ok = RE_TOKEN.test(t) && f.token_sha && await sha(t) === f.token_sha;
  if (!ok) ok = !!await stafMeja(env, req);
  if (!ok && req.headers.get("authorization")) ok = await mesinSah(env, req);
  if (!ok && req.headers.has("cookie")) { try { ok = (await sesiMasuk(env, req))?.wa === f.wa; } catch {} }
  const kp = !ok ? kukiPerangkat(req) : null;
  if (kp) { try { ok = await H.lpMilikAda(env, PUBLIK, "sesi", f.sesi_id, await sha(kp)); } catch (e) { if (!tabelBelum(e)) throw e; } }   // pelapor pintu tanpa kode: hanya foto sesi dari perangkatnya
  if (!ok) return galat(404, "tidak ada");
  const video = f.kunci_r2.endsWith(".vid");
  if (m[2] && !video) return galat(404, "tidak ada");
  const kunci = video && !m[2] ? f.kunci_r2.replace(/\.vid$/, ".jpg") : f.kunci_r2;
  const baku = {"cache-control": "private, no-store", "x-robots-tag": "noindex", "x-content-type-options": "nosniff"};
  if (!m[2]) { const o = await env.MEDIA.get(kunci); return o ? new Response(o.body, {headers: {"content-type": "image/jpeg", ...baku}}) : galat(404, "tidak ada"); }
  const rentang = req.headers.get("range");
  let o; try { o = await env.MEDIA.get(kunci, rentang ? {range: req.headers} : undefined); } catch { return new Response(null, {status: 416, headers: baku}); }
  if (!o) return galat(404, "tidak ada");
  const h = {"content-type": TIPE_EKS[m[2]], "accept-ranges": "bytes", ...baku};
  if (rentang && o.range && o.range.offset != null) {
    const {offset, length} = o.range;
    const awal = /^bytes=(\d+)-/.exec(rentang)?.[1];   // awal rentang di luar berkas: R2 sungguhan menolak, emulator mengembalikan seluruh berkas; jawab 416 dua-duanya
    if (!(length > 0) || offset >= o.size || awal != null && Number(awal) >= o.size) { o.body?.cancel(); return new Response(null, {status: 416, headers: {...baku, "content-range": `bytes */${o.size}`}}); }
    return new Response(o.body, {status: 206, headers: {...h, "content-range": `bytes ${offset}-${offset + length - 1}/${o.size}`, "content-length": String(length)}});
  }
  return new Response(o.body, {headers: {...h, "content-length": String(o.size)}});
}

/* ---------------- video, unggah bersambung (KEPUTUSAN K57, K61, D77, D79, D89, D90) ----------------
   mulai (multipart R2 dibuka, baris lapor_unggah) -> PUT bagian 5 MB satu per satu (etag di D1) -> status (bagian yang sudah ada) -> selesai (complete, periksa isi, masuk laporan).
   Pemeriksaan isi dijalankan di selesai, bukan per bagian. Semua rute hanya untuk pemilik unggahan (nomor sama); selain pemilik = 404. Cron menit 17 membuang yang 24 jam tanpa bagian baru. */
const BAGIAN = 5 * 1048576, VIDEO_MAKS = 30 * 1048576, VIDEO_DETIK = 60, VIDEO_PER_LAPORAN = 3, UNGGAH_BASI = 24 * JAM, UNGGAH_BERJALAN = 5, SISI = 1048576;
const EKS_VIDEO = {"video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm"};
const bagianDari = u => { try { return Object.keys(JSON.parse(u.bagian || "{}")).map(Number).sort((a, b) => a - b); } catch { return []; } };
const gagalUnggah = {galat: "Unggahan tidak ditemukan atau sudah kedaluwarsa. Pilih video lagi."};
const miliknya = async (env, u, id) => !!u && !u.kunci_r2.startsWith("lapor/data/") && u.wa === id.wa && (!id.perangkat || await H.lpMilikAda(env, P, "unggah", u.id, id.perangkat));
async function unggahMulai(env, req, url, kini) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const b = await bacaBody(req, 4096); if (b.galat) return galat(b.status || 400, b.galat);
  const o = b.o, id = await pelapor(env, req, url, o); if (id instanceof Response) return id;
  const batas = await kuota(env, req, id, kini, "lapor.unggah"); if (batas) return batas;
  const {wa, saluran} = id, ukuran = o.ukuran;
  if (!Number.isInteger(ukuran) || ukuran < 1000 || ukuran > VIDEO_MAKS) return galat(400, `Video paling besar ${VIDEO_MAKS / 1048576} MB.`);
  const baris = await sesiAktif(env, id), lama = baris ? dariBaris(baris) : null;
  const cari = lama?.status === "cari_foto";   // foto orang dicari: boleh dari galeri dan foto lama, tanpa lokasi (pemilik 26 Nov 2026)
  if (!lama || lama.status !== "foto" && !cari) return galat(409, "Kirim video saat diminta foto atau video kejadian.");
  if ((lama.foto || []).filter(f => f.jenis === "video").length >= VIDEO_PER_LAPORAN) return galat(400, `Paling banyak ${VIDEO_PER_LAPORAN} video per laporan.`);
  if ((lama.foto || []).length >= MAKS_BERKAS) return galat(400, `Paling banyak ${MAKS_BERKAS} foto dan video per laporan.`);
  if (await H.lpUnggahHitung(env, P, wa) >= UNGGAH_BERJALAN) return galat(429, "Terlalu banyak unggahan video yang belum selesai. Selesaikan dulu atau tunggu beberapa jam.");
  const g = o.gps && typeof o.gps === "object" && titikSah(o.gps.lat, o.gps.lon) && angka(o.gps.akurasi) && o.gps.akurasi >= 0 && angka(o.gps.waktu) ? {lat: o.gps.lat, lon: o.gps.lon, akurasi: o.gps.akurasi, waktu: o.gps.waktu} : null;
  const durasi = angka(o.durasi) && o.durasi >= 0 && o.durasi < 36000 ? Math.round(o.durasi) : null, jumlah = Math.ceil(ukuran / BAGIAN);
  const fid = acak(8), kunci = `lapor/foto/${fid}.vid`, mp = await env.MEDIA.createMultipartUpload(kunci);
  try { await H.lpUnggahBaru(env, P, {id: fid, wa, kunci, uploadId: mp.uploadId, ukuran, jumlah, gps: g ? JSON.stringify(g) : null, durasi, bahasa: bahasaSah(o.bahasa), kini}); if (id.perangkat) await H.lpMilikTambah(env, P, "unggah", fid, id.perangkat); }
  catch (e) { await mp.abort().catch(() => {}); throw e; }
  return kirim(200, {id: fid, bagian: BAGIAN, jumlah, diterima: []});
}
async function unggahBagian(env, req, url, kini, ctx, x) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const m = /^([0-9a-f]{16})\/(\d{1,2})$/.exec(x || ""); if (!m) return galat(404, "tidak ada");
  const tolakDini = await identitasSah(env, req, kini, "lapor.unggah.ip"); if (tolakDini) return tolakDini;   // sebelum membaca badan 5 MB
  // badan dibaca (dan kelebihannya dibuang) sebelum pemeriksaan hak: jawaban dini tanpa membaca badan memutus sambungan klien di tengah kirim sehingga status 404/429 tak sampai
  const bb = await bacaBytes(req, BAGIAN); if (bb.galat) return galat(bb.status || 400, "Bagian lebih besar dari seharusnya.");
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const u = await H.lpUnggahBaca(env, P, m[1]), n = Number(m[2]);
  if (!await miliknya(env, u, id) || n >= u.jumlah) return galat(404, gagalUnggah.galat);
  const batas = await kuota(env, req, id, kini, "lapor.bagian"); if (batas) return batas;
  const harap = n === u.jumlah - 1 ? u.ukuran - n * BAGIAN : BAGIAN;   // R2: semua bagian kecuali yang terakhir persis sama besar
  if (bb.b.length > harap) return galat(413, "Bagian lebih besar dari seharusnya.");
  if (bb.b.length !== harap) return galat(400, `Bagian ${n + 1} terpotong (${bb.b.length} dari ${harap} byte). Dikirim ulang.`);
  const p = await env.MEDIA.resumeMultipartUpload(u.kunci_r2, u.upload_id).uploadPart(n + 1, bb.b);
  await H.lpUnggahBagian(env, P, u.id, n, p.etag, kini);
  return kirim(200, {diterima: bagianDari(await H.lpUnggahBaca(env, P, u.id)), jumlah: u.jumlah});
}
async function unggahStatus(env, req, url, kini, ctx, x) {
  if (!/^[0-9a-f]{16}$/.test(x || "")) return galat(404, "tidak ada");
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const u = await H.lpUnggahBaca(env, P, x);
  return await miliknya(env, u, id) ? kirim(200, {diterima: bagianDari(u), jumlah: u.jumlah, bagian: BAGIAN}) : galat(404, "Unggahan tidak ditemukan.");
}
async function unggahPost(env, req, url, kini, ctx, x) {
  if (x === "mulai") return unggahMulai(env, req, url, kini);
  const m = /^([0-9a-f]{16})\/selesai$/.exec(x || ""); if (!m) return galat(404, "tidak ada");
  return unggahSelesai(env, req, url, kini, m[1]);
}
async function unggahSelesai(env, req, url, kini, uid) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const tolakDini = await identitasSah(env, req, kini, "lapor.unggah.ip"); if (tolakDini) return tolakDini;
  const bb = await bacaBytes(req, 700e3); if (bb.galat) return galat(bb.status || 400, bb.galat);   // sampul JPEG paling besar 400 KB (base64 +33%)
  let o; try { o = JSON.parse(new TextDecoder().decode(bb.b) || "{}"); } catch { return galat(400, "body bukan JSON"); }
  if (!o || typeof o !== "object") return galat(400, "body harus objek JSON");
  const id = await pelapor(env, req, url, o); if (id instanceof Response) return id;
  const u = await H.lpUnggahBaca(env, P, uid); if (!await miliknya(env, u, id)) return galat(404, "Unggahan tidak ditemukan.");
  const diterima = bagianDari(u); if (diterima.length !== u.jumlah) return galat(409, `Baru ${diterima.length} dari ${u.jumlah} bagian.`, {diterima});
  const {wa, saluran} = id, kunci = u.kunci_r2, kunciSampul = `lapor/foto/${uid}.jpg`;
  let selesai = false;   // multipart sudah digabung: yang dibuang berkas, bukan multipart
  const tolak = async (kode, pesan) => {   // ditolak = berkas R2, multipart, dan baris dibuang (D90)
    if (selesai) await env.MEDIA.delete([kunci, kunciSampul]).catch(() => {}); else await env.MEDIA.resumeMultipartUpload(kunci, u.upload_id).abort().catch(() => {});
    await H.lpUnggahHapus(env, P, uid); return galat(kode, pesan);
  };
  try {
    const sampulMentah = b64(o.sampul, 560e3);
    const sampul = sampulMentah && sampulMentah.length > 500 && sampulMentah.length < 400 * 1024 && sampulMentah[0] === 0xff && sampulMentah[1] === 0xd8 ? bersihMedia("image/jpeg", sampulMentah) : null;
    if (!sampul) return await tolak(400, "Gambar sampul video tidak terbaca. Kirim video lagi.");
    try { await env.MEDIA.resumeMultipartUpload(kunci, u.upload_id).complete(diterima.map(n => ({partNumber: n + 1, etag: JSON.parse(u.bagian)[n]}))); selesai = true; }
    catch { return await tolak(400, "Unggahan tidak dapat diselesaikan. Kirim video lagi."); }
    const head = await env.MEDIA.head(kunci), ukuran = head?.size ?? 0;
    // pemeriksaan isi dari byte, bukan nama atau Content-Type. ponytail: hanya 1 MB awal dan 1 MB akhir dibaca (kotak moov di depan atau di belakang; batas CPU Workers Free 10 ms): rekaman 60 detik moov < 1 MB
    const baca = async (offset, length) => new Uint8Array(await (await env.MEDIA.get(kunci, {range: {offset, length}})).arrayBuffer());
    const kepala = await baca(0, Math.min(ukuran, SISI)), ekor = ukuran > SISI ? await baca(Math.max(SISI, ukuran - SISI), Math.min(SISI, ukuran - SISI)) : null;
    const eks = EKS_VIDEO[jenisBerkas(kepala)];
    if (!eks || ukuran !== u.ukuran) return await tolak(400, "Berkas bukan video MP4, MOV, atau WebM.");
    const cari = f => f(kepala) ?? (ekor ? f(ekor) : null), durasiBaca = cari(durasiMP4), durasi = durasiBaca ?? u.durasi;
    // MP4/MOV wajib punya mvhd (berkas berkepala ftyp tanpa kotak film bukan video); WebM tanpa mvhd wajib durasi dari peramban (tinjauan keamanan tahap 2)
    if (eks === "webm" ? u.durasi == null : durasiBaca == null) return await tolak(400, "Durasi video tidak terbaca. Rekam ulang dengan kamera, lalu kirim lagi.");
    if (durasi != null && durasi > VIDEO_DETIK + 1) return await tolak(400, `Video paling lama ${VIDEO_DETIK} detik. Potong dulu, lalu kirim lagi.`);
    // aturan lokasi dan waktu sama dengan foto (D11): GPS perangkat; metadata video (©xyz, creation_time) menggantikan EXIF
    let g = null; try { g = u.gps ? JSON.parse(u.gps) : null; } catch {}
    const gpsSah = !!g && g.akurasi <= 1000 && Math.abs(kini - g.waktu) <= 10 * MENIT;
    const lok0 = cari(lokasiMP4), mLok = lok0 && titikSah(lok0.lat, lok0.lon) ? lok0 : null, w0 = cari(waktuMP4), mWaktu = w0 && w0 <= kini + 5 * MENIT ? w0 : null;
    if (mWaktu && kini - mWaktu > 48 * JAM) return await tolak(400, "Video direkam lebih dari 48 jam lalu. Kirim rekaman terbaru dari lokasi.");
    if (gpsSah && mLok && kmDua(g.lat, g.lon, mLok.lat, mLok.lon) > 5) return await tolak(400, "Lokasi di video lebih dari 5 km dari posisi Anda sekarang.");
    const meta = gpsSah ? {lencana: "gps", lencanaTeks: "Lokasi GPS perangkat", lat: g.lat, lon: g.lon, akurasi: g.akurasi}
      : mLok ? {lencana: "exif", lencanaTeks: "Lokasi dari data video", lat: mLok.lat, lon: mLok.lon} : {lencana: "tanpa", lencanaTeks: "Tanpa lokasi"};
    const baris = await sesiAktif(env, id), lama = baris ? dariBaris(baris) : null;
    if (!lama || lama.status !== "foto") return await tolak(409, "Video belum diperlukan sekarang. Lanjutkan pertanyaan laporan dulu.");
    if ((lama.foto || []).filter(f => f.jenis === "video").length >= VIDEO_PER_LAPORAN) return await tolak(400, `Paling banyak ${VIDEO_PER_LAPORAN} video per laporan.`);
    if ((lama.foto || []).length >= MAKS_BERKAS) return await tolak(400, `Paling banyak ${MAKS_BERKAS} foto dan video per laporan.`);
    const waktuAmbil = mWaktu || kini, sumberWaktu = mWaktu ? "waktu rekam video" : gpsSah ? "waktu GPS perangkat" : "waktu unggah", dRound = durasi != null ? Math.round(durasi) : null;
    const info = {id: uid, jenis: "video", eks, durasi: dRound, ...meta, waktuAmbil, sumberWaktu, waktuTerima: kini};
    const mm = await masukkanMedia(env, url, id, kini, baris, lama, info, kunci, () => env.MEDIA.put(kunciSampul, sampul, {httpMetadata: {contentType: "image/jpeg"}}), () => env.MEDIA.delete([kunci, kunciSampul]).catch(() => {}));
    if (mm.tolak || mm.bentrok) { await H.lpUnggahHapus(env, P, uid); if (mm.tolak) await env.MEDIA.delete([kunci, kunciSampul]).catch(() => {}); return galat(mm.bentrok ? 400 : 409, mm.tolak || "Pesan lain dari nomor ini sedang diproses. Kirim video lagi."); }
    await H.lpUnggahHapus(env, P, uid);
    const h = mm.h, prov = provDari(h.sesi);
    return kirim(200, await keluarBahasa(modelDari(env), {...keluaran(h, h.sesi), teksWa: h.balasan, fotoBaru: {id: uid, jenis: "video", durasi: dRound, lencana: meta.lencana, lencanaTeks: meta.lencanaTeks, lat: meta.lat ?? null, lon: meta.lon ?? null,
      waktuTeks: waktuLapor(waktuAmbil, prov), sumberWaktu}}, bahasaSah(u.bahasa), saluran, env));
  } catch (e) {   // galat tak terduga: tidak meninggalkan berkas yatim
    if (selesai) await env.MEDIA.delete([kunci, kunciSampul]).catch(() => {});
    await H.lpUnggahHapus(env, P, uid).catch(() => {});
    throw e;
  }
}
/* D90: dipanggil cron bersih-bersih menit 17. Unggahan 24 jam tanpa bagian baru: multipart di-abort, baris dibuang; paling banyak 20 per putaran. */
export async function bersihkanLapor(env, kini = Date.now()) {
  await H.slBersih(env, H.pelakuLpCron, kini - 30 * HARI).catch(e => tabelBelum(e) || console.error("lapor_selamat", e?.message));   // tanda selamat 30 hari (Q67)
  await H.crAnonimkan(env, H.pelakuLpCron, kini - H.CARI_SIMPAN_HARI * HARI).catch(e => tabelBelum(e) || console.error("lapor_cari", e?.message));
  try { const f = await H.cfAnonimFoto(env, H.pelakuLpCron); if (f.length && env.MEDIA) await env.MEDIA.delete(f.map(id => `lapor/foto/${id}.jpg`)); await H.cfAnonim(env, H.pelakuLpCron); }   // foto orang dicari: berkas dulu, baru barisnya
  catch (e) { if (!tabelBelum(e)) console.error("lapor_cari_foto", e?.message); }
  await H.ctAnonim(env, H.pelakuLpCron).catch(e => tabelBelum(e) || console.error("lapor_cari_temu", e?.message));   // orang dicari ditutup >2 tahun dianonimkan (Q67 bawaan sementara)
  await H.ljKabarBersih(env, H.pelakuLpCron, kini - 864e5, kini - 30 * 864e5, kini - 7 * 864e5).catch(e => tabelBelum(e) || console.error("lj_kabar", e?.message));   // LJ-11: pembuka dan tim belum terkirim >1 hari (token mentah), lain belum terkirim >7 hari, terkirim >30 hari
  await bersihSesiLanjut(env, kini).catch(e => console.error("lj_sesi", e?.message));   // draf WA tahap 2 lebih dari 24 jam (LJ-05)
  await sapuDrafYatim(env, kini).catch(e => console.error("lj_draf", e?.message));   // foto draf R2 yatim lebih dari 2 hari (LJ-19)
  await hapusPribadiLama(env, kini).then(h => h && h.berkas && console.log("lj_pribadi", JSON.stringify(h))).catch(e => console.error("lj_pribadi", e?.message));   // data pribadi 5 tahun sesudah penutupan (LJ-17, D23)
  if (!env.MEDIA) return {lewat: "tanpa R2 MEDIA"};
  let basi; try { basi = await H.lpUnggahBasi(env, H.pelakuLpCron, kini - UNGGAH_BASI); } catch (e) { if (tabelBelum(e)) return {lewat: "migrasi 0158 belum diterapkan"}; throw e; }
  for (const u of basi) { await env.MEDIA.resumeMultipartUpload(u.kunci_r2, u.upload_id).abort().catch(() => {}); await H.lpUnggahHapus(env, H.pelakuLpCron, u.id); }
  return {unggahBasi: basi.length};
}

/* ---------------- lacak dan unduhan ---------------- */
async function lacak(env, req, url, kini) {
  const lj = await lajuPublik(env, req, "lapor.lacak", 300, kini); if (lj) return lj;
  const t = url.searchParams.get("t") || "";
  const baris = RE_TOKEN.test(t) ? await H.lpSesiToken(env, PUBLIK, await sha(t)) : null;
  if (!baris) return galat(404, "Laporan tidak ditemukan.");
  const {s, pel} = await lengkapi(env, PUBLIK, baris);
  s.bukti = await bacaTabel(() => H.lpBuktiDaftar(env, PUBLIK, s.nomor), []);
  return kirim(200, lacakTampil(s, pel, t));
}
async function unduh(env, req, url, kini, ctx, x) {
  const lj = await lajuPublik(env, req, "lapor.unduh", 120, kini); if (lj) return lj;
  let nama = ""; try { nama = decodeURIComponent(x); } catch { return galat(404, "tidak ada"); }
  const m = /^(LA-\d{6}-\d{2,3})\.(pdf|docx)$/.exec(nama);
  const baris = m ? await H.lpSesiNomor(env, PUBLIK, m[1]) : null, t = url.searchParams.get("t") || "";
  if (!baris || !(RE_TOKEN.test(t) && baris.token_sha && await sha(t) === baris.token_sha) && !await stafMeja(env, req)) return galat(404, "tidak ada");
  const v = await H.lpPdfTerakhir(env, PUBLIK, m[1]) ?? VERSI;   // versi terbaru yang sudah jadi; versi baru menyusul, sementara yang lama tetap bisa diunduh
  const o = env.MEDIA ? await env.MEDIA.get(`lapor/dok/${m[1]}.${v}.${m[2]}`) : null;
  if (!o) return new Response(HALAMAN_TUNGGU_DOK, {status: 202, headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...HDR}});   // dibuka langsung dari tautan: halaman tunggu yang memuat ulang sendiri, bukan berkas teks
  return new Response(o.body, {headers: {"content-type": m[2] === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "content-disposition": `attachment; filename="Laporan ${m[1]}.${m[2]}"`, "x-content-type-options": "nosniff", ...HDR}});
}

/* ---------------- izin uji (K2): mesin atas perintah pemilik, atau admin ---------------- */
async function izinGet(env, req) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  return kirim(200, {wa: await H.lpIzinDaftar(env, MESIN)});
}
async function izinPost(env, req, url, kini) {
  const mesin = await mesinSah(env, req), admin = mesin ? null : await modOK(env, req);
  if (!mesin && !admin) return galat(403, "perlu kunci mesin atau admin");
  const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat);
  const wa = nomorWa(b.o.wa); if (!wa) return galat(400, "Nomor WhatsApp tidak sah.");
  const p = mesin ? MESIN : STAF;
  if (b.o.cabut === true) { await H.lpIzinCabut(env, p, wa); return kirim(200, {ok: true, wa, cabut: true}); }
  if (b.o.peran != null && b.o.peran !== "bpbd") return galat(400, "peran hanya boleh bpbd");
  const kab = typeof b.o.kab === "string" && b.o.kab.trim() ? b.o.kab.trim().slice(0, 120) : null;
  await H.lpIzinSimpan(env, p, wa, b.o.peran ?? null, kab, mesin ? "mesin" : `admin:${String(admin).slice(0, 12)}`, kini);
  return kirim(200, {ok: true, wa, peran: b.o.peran ?? null, kab});
}

/* ---------------- antrean PDF dan kabar untuk mesin Mac mini ---------------- */
async function pdfAntre(env, req, url, kini) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  const antre = [];
  for (const r of await H.lpPdfAmbil(env, MESIN, kini)) {
    try {   // satu sesi rusak tidak memacetkan antrean; yang gagal diambil lagi sesudah 5 menit, maksimal 3 percobaan
      const baris = await H.lpSesiNomor(env, MESIN, r.nomor); if (!baris) continue;
      const {s, pel} = await lengkapi(env, MESIN, baris), t = await tokenLacak(env, s.nomor);
      antre.push({nomor: r.nomor, versi: r.versi, bahan: bahanDokumen(s, pel, f => `${url.origin}/api/lapor/foto/${f.id}?t=${t}`)});   // mesin mengunduh foto lewat url bertoken
    } catch (e) { console.error("lapor pdf antre", r.nomor, e?.message); }
  }
  return kirim(200, {antre});
}
async function pdfPost(env, req, url, kini, ctx, x) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  if (!env.MEDIA) return galat(503, "Penyimpanan belum aktif.");
  const m = /^(LA-\d{6}-\d{2,3})\/(\d{1,3})$/.exec(x), jenis = url.searchParams.get("jenis") || "pdf";
  if (!m || !["pdf", "docx"].includes(jenis)) return galat(400, "nomor, versi, atau jenis tidak sah");
  const versi = Number(m[2]), ada = await H.lpPdfAda(env, MESIN, m[1], versi);
  if (!ada) return galat(404, "tidak ada antrean untuk nomor dan versi itu");
  const b = await bacaBytes(req, 15 * 1048576); if (b.galat) return galat(b.status || 400, b.galat);
  const pdf = jenis === "pdf" ? b.b[0] === 0x25 && b.b[1] === 0x50 && b.b[2] === 0x44 && b.b[3] === 0x46 : b.b[0] === 0x50 && b.b[1] === 0x4b;   // %PDF, atau PK (zip docx)
  if (b.b.length < 100 || !pdf) return galat(400, `badan bukan berkas ${jenis}`);
  await env.MEDIA.put(`lapor/dok/${m[1]}.${versi}.${jenis}`, b.b, {httpMetadata: {contentType: jenis === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}});
  if (jenis === "pdf") {
    await H.lpPdfStatus(env, MESIN, m[1], versi, "jadi", kini);
    if (ada.status !== "jadi") {   // kabar ke pelapor hanya sekali per versi
      const baris = await H.lpSesiNomor(env, MESIN, m[1]);
      if (baris) await H.lpBatch(env, MESIN, [H.lpStmtKabar(env, MESIN, baris.wa, m[1], "pdf", `PDF laporan ${m[1]} sudah jadi.`, `${url.origin}/api/lapor/unduh/${m[1]}.pdf?t=${await tokenLacak(env, m[1])}`, kini)]);
    }
  }
  return kirim(201, {ok: true, nomor: m[1], versi, jenis});
}
async function kabarGet(env, req) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  const bpbd = await bacaTabel(() => H.lpKabarBpbdAntre(env, MESIN), []);   // butir BPBD berjenis "bpbd", id berawalan "b": bot yang ada mengirim teksnya apa adanya (D97)
  const lj = await bacaTabel(() => H.ljKabarAntre(env, MESIN, 20), []);   // LJ-11: antrean tahap 2, id berawalan "l"; paling banyak 20 per putaran
  return kirim(200, {kabar: [...await H.lpKabarAntre(env, MESIN), ...bpbd.map(x => ({id: `b${x.id}`, wa: x.wa, jenis: "bpbd", teks: x.teks, url: null, nomor: null})),
    ...lj.map(x => ({id: `l${x.id}`, wa: x.wa, jenis: x.jenis, teks: x.teks, url: null, nomor: null}))]});
}
async function kabarTerkirim(env, req, url, kini, ctx, x) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  const m = /^([bl]?)(\d{1,12})\/terkirim$/.exec(x); if (!m) return galat(404, "rute lapor tidak ada");
  const n = m[1] === "l" ? await bacaTabel(() => H.ljKabarTerkirim(env, MESIN, Number(m[2]), kini), 0) : m[1] ? await H.lpKabarBpbdTerkirim(env, MESIN, Number(m[2]), kini) : await H.lpKabarTerkirim(env, MESIN, Number(m[2]), kini);
  return n ? kirim(200, {ok: true}) : galat(404, "kabar tidak ada atau sudah ditandai");
}

/* ---------------- meja (K7, D20, D22; K63 D94-D98: BNPB atau akun lembaga pemda bersaring wilayah) ---------------- */
async function mejaDaftar(env, req, url, kini) {
  const h = await hakMeja(env, req, kini); if (!h) return tolakStaf(); if (h.tolak) return h.tolak;
  const lj = await laju(env, h.kunci, "lapor.mejadaftar", [[JAM, 300]], kini); if (lj) return lj;
  const {c} = h, q = url.searchParams, f = {dari: q.has("dari") ? Number(q.get("dari")) : NaN, sampai: q.has("sampai") ? Number(q.get("sampai")) : NaN,
    jenis: /^[a-z_]{1,40}$/.test(q.get("jenis") || "") ? q.get("jenis") : null, status: Object.hasOwn(STATUS, q.get("status") || "") ? q.get("status") : null, kab: /^\d{2}(\.\d{2})?$/.test(q.get("kab") || "") ? q.get("kab") : null,
    prov: c.jenis === "bpbd" ? c.prov : null};   // BPBD: saring kasar di SQL, lalu tepat per kab/kota di bawah
  const lihat = (await H.lpMejaDaftar(env, STAF, f)).map(barisMeja).filter(b => dalamWilayah(c, b.wilayah));
  // kejadian yang sama (K66, D107): dua laporan atau lebih yang terlihat akun ini; jumlah warga dari nomor berbeda, dihitung sebelum identitas dibuang
  const kj = new Map((await bacaTabel(() => H.lpKejadianSemuaNomor(env, STAF), [])).map(x => [x.nomor, x.kode])), hit = new Map();
  for (const b of lihat) { const k = kj.get(b.nomor); if (k) { const x = hit.get(k) || {n: 0, wa: new Set()}; x.n++; x.wa.add(b.wa); hit.set(k, x); } }
  const cek = new Map((await bacaTabel(() => H.lpPeriksaTerakhirSemua(env, STAF), [])).map(x => [x.nomor, x.hasil]));   // hasil pengecekan terakhir (K69, D108)
  /* gugus (A9, A1) seperti meja lokal: kode, label, jumlah, dan penanda satu_desa untuk chip "satu desa" (lapor-kejadian LK-08). ponytail: membaca laporan 30 hari
     per muat daftar (sama dengan Alun-alun, lihat catatan kuota LK-05); pindah ke tabel hasil cron bila laporan 30 hari mendekati ribuan */
  const {G: GG, gk: GK} = await bacaTabel(() => gugusDasar(env, kini), {G: {per: {}}, gk: new Map()});
  const gugusDari = n => { const g = GK.get(GG.per[n]); return g ? {kode: g.kode, label: g.label, n_laporan: g.n_laporan, n_pelapor: g.n_pelapor, satu_desa: g.satu_desa} : null; };
  const baris = lihat.map(b => { const k = kj.get(b.nomor), x = k && hit.get(k); return {...b, periksa: cek.get(b.nomor) || null, gugus: gugusDari(b.nomor), kejadian: x && x.n >= 2 ? {kode: k, n_laporan: x.n, n_pelapor: x.wa.size} : null}; })
    .map(b => ({...b, dikenal: !!b.nama})).map(b => c.jenis === "bnpb" ? b : {...b, wa: null, nama: null});   // dikenal: chip "Pelapor belum dikenal" (K90)   // BPBD: identitas pelapor hanya lewat POST lihat yang tercatat (D95)
  const ambil = new Map((await bacaTabel(() => H.lpAmbilDaftar(env, baris.map(b => b.nomor)), [])).map(x => [x.nomor, x.label]));   // PF-08: penangan; sebelum migrasi 0167 kosong
  for (const b of baris) b.ditangani = ambil.get(b.nomor) ?? null;
  return kirim(200, {akun: {jenis: c.jenis, label: c.label}, baris});
}
/* identitas: BNPB selalu; BPBD hanya pada jawaban POST (lihat atau aksi) yang menulis lapor_akses, supaya tiap pembukaan identitas tercatat (D95).
   GET rincian untuk BPBD tanpa nama, nomor WA, jabatan, dan transkrip pelapor. */
async function rincianObj(env, c, baris, identitas = c.jenis === "bnpb") {   // hanya baca: GET tidak pernah menulis
  const {s, pel} = await lengkapi(env, STAF, baris), nomor = s.nomor;
  s.bukti = await bacaTabel(() => H.lpBuktiDaftar(env, STAF, nomor), []);
  const o = mejaRinciTampil(s, pel, await tokenLacak(env, nomor));
  o.kejadian = await bacaTabel(async () => { const k = await H.lpKejadianNomor(env, STAF, nomor); if (!k) return null;
    const r = (await H.lpKejadianRingkas(env, STAF, [k.kode]))[k.kode]; return r && r.n_laporan >= 2 ? {kode: k.kode, ...r} : null; }, null);
  // pengecekan lapangan dan tindakan (K69-K70); sebelum migrasi 0162 kosong
  const prov = s.isian.lokasi?.nilai?.wilayah?.provKode, [periksa, tindakan, reg] = await Promise.all([bacaTabel(() => H.lpPeriksaDaftar(env, STAF, nomor), []),
    bacaTabel(() => H.lpTindakanDaftar(env, STAF, nomor), []), registriDari(env).catch(() => null)]);
  o.periksa = periksa.map(x => { let perubahan = []; try { perubahan = JSON.parse(x.perubahan); } catch {} return {hasil: x.hasil, label: HASIL_PERIKSA[x.hasil], catatan: x.catatan, oleh: x.oleh, perubahan, waktu: waktuLapor(x.waktu, prov)}; });
  o.tindakan = tindakan.map(x => ({kode: x.kode, label: x.label, oleh: x.oleh, waktu: waktuLapor(x.waktu, prov)}));
  o.ditangani = (await bacaTabel(() => H.lpAmbilNomor(env, nomor), null))?.label ?? null;   // PF-08: tidak pernah ke jawaban publik atau halaman lacak (N12)
  o.tindakanPilihan = reg ? tindakanUntuk(s.isian.jenis?.nilai, reg) : []; o.revisi = revisiTampil(s);
  o.publik = await bacaTabel(() => statusPublik(env, baris, s.tiket.status), null);   // LK-07: daftar centang lima syarat dan status tarikan; sebelum migrasi 0170 kosong
  /* LK-09: kartu Buku Besar hanya untuk BNPB dan hanya bila saklar LAPOR_USUL menyala. ponytail: membaca laporan 30 hari (gugusDasar) per buka rincian BNPB,
     sama dengan daftar meja; pindah ke tabel hasil cron bila laporan 30 hari mendekati ribuan */
  o.usulan = c.jenis === "bnpb" && env.LAPOR_USUL === "1" ? await bacaTabel(async () => { const r = await kejadianUsulan(env, baris, s.tiket.status, Date.now());
    return {...(r.usulan ? {siap: true, ada: null, alasan: null} : {siap: false, ada: r.ada || null, alasan: r.ada ? null : r.galat}), status: r.statusUsulan}; }, null) : null;   // LK-11 status dari sk_kejadian_sumber
  if (!identitas) { o.pelapor = {peran: o.pelapor?.peran ?? null, tersembunyi: true}; o.transkrip = []; }
  return {...o, akun: {jenis: c.jenis, label: c.label}, pindah: pindahUntuk(c, s.tiket.status, PINDAH[s.tiket.status])};
}
/* kartu "Halaman publik" di rincian meja (lapor-kejadian LK-07, DESIGN-SYSTEM 3): lima syarat A3 untuk laporan ini, apakah ditarik, dan apakah tayang sekarang.
   Halaman publik menghitung per kejadian laporan (cukup satu anggota terverifikasi), jadi "tayang" di sini berarti laporan ini sendiri yang membuat kartunya tayang. */
async function statusPublik(env, baris, status) {
  const nomor = baris.nomor, [periksa, versi, tarik] = await Promise.all([H.lpPeriksaAkunNomor(env, STAF, [nomor]), H.lpVersiTerakhir(env, STAF, [nomor]), H.lpTarikKode(env, STAF, [nomor])]);
  const P = periksa.map(r => ({id: r.id, hasil: r.hasil, waktu: r.waktu, akun: r.jenis ? {jenis: r.jenis, tingkat: r.tingkat, prov: r.prov, kab: r.kab, kab_nama: r.kab_nama} : null}));
  const syarat = syaratPublik({status, wilayah: wilayahBaris(baris)}, P, versi.map(v => ({waktu: v.waktu})), tarik), t = terakhir(tarik);
  const segar = (terakhir(P)?.waktu || 0) > Date.now() - JENDELA_HARI_INI;
  return {syarat: syarat.map(({id, label, ok}) => ({id, label, ok})), ditarik: !!t?.aktif, tayang: syarat.every(x => x.ok) && segar, dalam24jam: segar, halamanBuka: env.LAPOR_HARI_INI === "1"};
}
/* tarik dari halaman publik atau tampilkan lagi (D8, A8, F-6, Q18): satu baris lk_tarik per anggota kejadian laporan (gugus satu desa), dikunci ke nomor tiket LA-,
   bukan kode GL- yang dihitung ulang tiap muat (tinjauan keamanan LK-05). Append-only; tidak mengubah tiket, pengecekan, atau usulan. Jejaknya lk_tarik sendiri (pelaku, alasan, waktu) dan log profil hakMeja;
   sengaja TIDAK ke riwayat tiket, karena catatan riwayat tampil ke pelapor di halaman lacak (lacakTampil) dan alasan tarikan bersifat internal. */
async function tarikPublik(env, h, nomor, o, kini) {
  if (typeof o.aktif !== "boolean") return galat(400, "aktif harus true (tarik) atau false (tampilkan lagi).");
  const alasan = String(o.alasan ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  const kini0 = terakhir(await H.lpTarikKode(env, STAF, [nomor]));
  if (!!kini0?.aktif === o.aktif) return galat(409, o.aktif ? "Laporan ini sudah ditarik dari halaman publik." : "Laporan ini tidak sedang ditarik.");
  /* gugus dikelompokkan menurut jarak dan bisa melintasi batas kab (lapor_gugus.js dekat): akun BPBD hanya menarik anggota di wilayahnya, BNPB semua
     (tinjauan guard-api LK-07; D95 "di luar wilayah = tidak ada"; bawaan sementara, dicatat di TIKET untuk pemilik). Jumlah anggota yang dijawab hanya yang ditarik. */
  const {per, G, gk} = await gugusDasar(env, kini), c = h.c;
  const anggota = [nomor, ...(gk.get(G.per[nomor])?.anggota || []).filter(n => n !== nomor && dalamWilayah(c, ringkasDari(per.get(n) || {}).wilayah || null))];
  /* ponytail: baca keadaan lalu tulis tidak atomik; dua klik bersamaan bisa menulis dua baris aktif yang sama. Tabel append-only dan baris terakhir yang menentukan, jadi hasil akhirnya sama */
  await H.lpBatch(env, STAF, anggota.map(n => H.lpStmtTarik(env, STAF, n, o.aktif, alasan, h.oleh, kini)));
  return kirim(200, {ok: true, ditarik: o.aktif, anggota: anggota.length});
}
/* usulan ke Buku Besar (lapor-kejadian LK-09; A6, D9, D12, K87; bawaan Q11 diterima pemilik 25 Nov 2026): satu klik menulis SATU baris lk_usulan, tidak pernah
   mendirikan kejadian resmi; pemasangan tetap lewat pencocok scripts/siklus/pasang.py (LK-10). Kejadian laporan = gugus (anggota terkunci ke nomor tiket LA-)
   atau laporan tunggal, dikunci ke nomor tiket anggota paling awal (kode GL- bergeser tiap muat, catatan LK-03). Mengusulkan ulang hanya sesudah staf Siklus
   menolak usulan terakhir (putaran berikut). Tanpa data pribadi: nomor tiket, jenis, kab4, pelaku sesi. */
const jenisBaris = baris => { try { return JSON.parse(baris.kerja)?.isian?.jenis?.nilai ?? null; } catch { return null; } };
async function kejadianUsulan(env, baris, status, kini) {
  const nomor = baris.nomor, {per, G, gk} = await gugusDasar(env, kini), daftar = gk.get(G.per[nomor])?.anggota || [nomor];
  const dasar = daftar.map(n => { const r = per.get(n);
    return r ? {nomor: n, jenis: r.jenis, laporan: {status: r.status, wilayah: ringkasDari(r).wilayah || null}} : {nomor: n, jenis: jenisBaris(baris), laporan: {status, wilayah: wilayahBaris(baris)}}; });
  const semua = async f => (await Promise.all(potong(daftar).map(f))).flat();
  const [periksa, versi, lama] = await Promise.all([semua(xs => H.lpPeriksaAkunNomor(env, STAF, xs)), semua(xs => H.lpVersiTerakhir(env, STAF, xs)), semua(xs => H.lpUsulanKejadian(env, STAF, xs))]);
  const P = new Map(), V = new Map(versi.map(v => [v.nomor, v.waktu]));
  for (const r of periksa) (P.get(r.nomor) || P.set(r.nomor, []).get(r.nomor)).push({id: r.id, hasil: r.hasil, waktu: r.waktu, akun: r.jenis ? {jenis: r.jenis, tingkat: r.tingkat, prov: r.prov, kab: r.kab, kab_nama: r.kab_nama} : null});
  /* LK-11: satu bacaan berindeks untuk usulan terakhir saja (hanya itu yang menentukan putaran berikut dan status di meja); sebelum migrasi 0120 dianggap menunggu */
  const akhir = usulanTerakhir(lama), sumber = akhir ? await bacaTabel(() => H.lpUsulanSumber(env, STAF, akhir.kode), null) : null;
  const r = usulanDari(dasar.map(a => ({...a, periksa: P.get(a.nomor) || [], versi: V.get(a.nomor) ? [{waktu: V.get(a.nomor)}] : []})), lama, new Set(sumber?.status === "ditolak" ? [akhir.kode] : []));
  return {...r, statusUsulan: statusUsulan(akhir, sumber)};
}
const TOLAK_USUL = "Mengusulkan ke Buku Besar hanya untuk staf Pusdalops atau Koordalops BNPB dan Super Admin.";
async function usulkan(env, req, h, baris, t, kini) {
  if (h.c.jenis !== "bnpb") return galat(403, TOLAK_USUL);
  const sk = await hakSk(env, req, kini); if (sk instanceof Response || !(sk.sa || sk.pd || sk.ko)) return galat(403, TOLAK_USUL);   // peran PDKO antrean Siklus (Q11)
  const r = await bacaTabel(() => kejadianUsulan(env, baris, t.status, kini), null); if (!r) return galat(503, "Fitur ini belum diaktifkan.");   // sebelum migrasi 0170
  if (!r.usulan) return galat(r.status, r.galat, r.ada ? {usulan: r.ada} : {});
  let x;
  try { x = await H.lpStmtUsulanHari(env, STAF, {...r.usulan, oleh: h.oleh, waktu: kini}, tglKejadian(kini)).first(); }
  catch (e) { if (/UNIQUE/i.test(String(e?.message))) return galat(409, "Kejadian ini sudah diusulkan ke Buku Besar."); throw e; }   // klik ganda pada putaran yang sama
  return kirim(200, {ok: true, usulan: {kode: x.kode, putaran: x.putaran, anggota: r.usulan.anggota.length}});
}
async function mejaRinci(env, c, nomor) {
  const baris = await H.lpSesiNomor(env, STAF, nomor);
  if (!baris || !dalamWilayah(c, wilayahBaris(baris))) return galat(404, "Laporan tidak ditemukan.");   // di luar wilayah = tidak ada (D95)
  return kirim(200, await rincianObj(env, c, baris));
}
const b64Foto = (d, maks) => { const t = String(d || "").replace(/^data:image\/jpeg;base64,/, ""); if (t.length > maks) return null; try { return Uint8Array.from(atob(t), ch => ch.charCodeAt(0)); } catch { return null; } };
async function bacaJsonBesar(req, maks) {
  const r = await bacaBytes(req, maks); if (r.galat) return r;
  try { const o = JSON.parse(new TextDecoder().decode(r.b) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? {o} : {galat: "body harus objek JSON"}; } catch { return {galat: "body bukan JSON"}; }
}
/* revisi petugas jadi versi baru (pola susulan A12): sesi dengan rev sama, lalu versi berlabel petugas. Dipakai pengecekan lapangan dan terima angka kabar warga (LA-88).
   r = hasil terapkanRevisi; s diubah di tempat. Antrean PDF ditambah pemanggil di ujung rantai, karena INSERT OR IGNORE-nya bisa 0 baris. */
async function stmtRevisi(env, baris, s, r, oleh, kini) {
  const vi = await H.lpVersiInfo(env, STAF, s.nomor), label = Object.fromEntries(revisiTampil(s).map(x => [x.nama, x.label])), versi = vi.versi + 1;
  s.isian = r.isian;
  const w = s.isian.lokasi?.nilai, {id: _i, wa: _w, nomor: _n, terkirim: _t, ...kerja} = s;
  let ringkas = JSON.stringify(ringkasSesi(s)); if (ringkas.length > 4000) ringkas = JSON.stringify({lengkap: lengkap(s), foto: (s.foto || []).length, wilayah: wilayahKecil(s)});
  return {versi, label, stmts: [H.lpStmtSesiUbah(env, STAF, {id: baris.id, status: s.status, tingkat: s.tingkat, jenis: s.isian.jenis?.nilai ?? null, kab: w?.wilayah?.kabKode ?? null, lat: w?.lat ?? null, lon: w?.lon ?? null,
      kerja: JSON.stringify(kerja), ringkas}, baris.rev, kini),
    H.lpStmtVersi(env, STAF, s.nomor, versi, JSON.stringify(s.isian), JSON.stringify(r.perubahan.map(x => ({...x, label: label[x.nama], petugas: oleh}))), kini, true)]};
}
async function mejaUbah(env, req, url, nomor, aksi, kini) {
  const h = await hakMeja(env, req, kini); if (!h) return tolakStaf(); if (h.tolak) return h.tolak;
  const {c, oleh} = h;
  const batas = await laju(env, h.kunci, "lapor.meja", [[JAM, 120]], kini); if (batas) return batas;   // laju sebelum membaca badan sampai 4,6 MB
  const b = aksi === "bukti" ? await bacaJsonBesar(req, 4.6e6) : await bacaBody(req, 4096); if (b.galat) return galat(b.status || 400, b.galat);
  const baris = await H.lpSesiNomor(env, STAF, nomor);
  if (!baris || !dalamWilayah(c, wilayahBaris(baris))) return galat(404, "Laporan tidak ditemukan.");
  const t = await H.lpTiket(env, STAF, nomor); if (!t) return galat(404, "Tiket laporan tidak ditemukan.");
  if (!bolehAksi(c, aksi, t.status, b.o.ke)) return galat(403, "Aksi ini hanya untuk BNPB (membuka kembali tiket, meneruskan ke BPBD).");   // D96
  if (aksi === "ambil") return ambilLaporan(env, h, nomor, t, kini);
  if (aksi === "tarik") return tarikPublik(env, h, nomor, b.o, kini);
  if (aksi === "usulkan") return usulkan(env, req, h, baris, t, kini);
  const catatan = String(b.o.catatan || b.o.teks || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000);
  let tambahan = {};
  if (aksi === "lihat") {   // petugas membuka laporan baru = "Sudah dilihat petugas" (POST, bukan GET); akun BPBD tiap kali tercatat di lapor_akses (D95)
    const g = [];
    if (t.status === "baru") g.push(H.lpStmtTiketPindah(env, STAF, nomor, "baru", "dilihat", kini), H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, "baru", "dilihat", null, oleh, kini));
    if (c.jenis !== "bnpb") g.push(H.lpStmtAkses(env, STAF, nomor, oleh, kini));
    if (g.length) await H.lpBatch(env, STAF, g);
  } else if (aksi === "balas") {
    if (catatan.length < 2) return galat(400, "Balasan kosong.");
    const stmts = [H.lpStmtBalasan(env, STAF, nomor, catatan, oleh, kini), H.lpStmtKabar(env, STAF, baris.wa, nomor, "balasan", catatan, null, kini)];
    if (t.status === "baru" || t.status === "dilihat") stmts.push(H.lpStmtTiketPindah(env, STAF, nomor, t.status, "ditelaah", kini), H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, t.status, "ditelaah", null, oleh, kini));
    await H.lpBatch(env, STAF, stmts);
  } else if (aksi === "bukti") {   // foto penanganan petugas (K60, D87): tabel samping, bukan foto pelapor; GPS perangkat petugas dicatat bila sah
    if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
    const mentah = b64Foto(b.o.data, 4.3e6);
    if (!mentah || mentah.length < 1000 || mentah.length > 3 * 1048576 || jenisBerkas(mentah) !== "image/jpeg") return galat(400, "Foto penanganan harus JPEG, paling besar 3 MB.");
    const bersih = bersihMedia("image/jpeg", mentah); if (!bersih) return galat(400, "Struktur foto tidak sah atau rusak.");
    const g = b.o.gps && typeof b.o.gps === "object" ? b.o.gps : null;
    const gpsSah = !!g && titikSah(g.lat, g.lon) && angka(g.akurasi) && g.akurasi >= 0 && g.akurasi <= 1000 && angka(g.waktu) && Math.abs(kini - g.waktu) <= 10 * MENIT;
    const id = acak(8), kunci = `lapor/bukti/${id}.jpg`;
    await env.MEDIA.put(kunci, bersih, {httpMetadata: {contentType: "image/jpeg"}});
    let r; try {
      r = await H.lpBatch(env, STAF, [H.lpStmtBukti(env, STAF, {id, nomor, kunci, oleh, ...(gpsSah ? {lat: g.lat, lon: g.lon, akurasi: g.akurasi} : {}), waktu: kini}),
        H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, t.status, t.status, `Foto penanganan ditambahkan${gpsSah ? "" : " (tanpa lokasi GPS)"}`, oleh, kini)]);
    } catch (e) { await env.MEDIA.delete(kunci).catch(() => {}); throw e; }
    if (!r[0].meta.changes) { await env.MEDIA.delete(kunci).catch(() => {}); return galat(400, "Paling banyak 10 foto penanganan per laporan."); }
  } else if (aksi === "bukti-publik") {   // D88, Q47: tampil di Alun-alun hanya bila ditandai per foto
    if (typeof b.o.id !== "string" || !/^[0-9a-f]{16}$/.test(b.o.id) || !await H.lpBuktiPublik(env, STAF, nomor, b.o.id, b.o.publik === true)) return galat(404, "Foto penanganan tidak ditemukan.");
  } else if (aksi === "lepas") {   // D106: hanya BNPB (bolehAksi); laporan keluar dari kejadiannya, tercatat di riwayat tiket
    const k = await bacaTabel(() => H.lpKejadianNomor(env, STAF, nomor), null);
    if (!k) return galat(409, "Laporan ini tidak tergabung dalam kejadian.");
    await H.lpKejadianLepas(env, STAF, nomor, k.kode, [H.lpStmtRiwayat(env, STAF, nomor, t.status, t.status, `Dilepas dari kejadian ${k.kode}`, oleh, kini)]);
  } else if (aksi === "teruskan") {   // LA-67 (D97, Q55): hanya BNPB; antrean pemberitahuan WA ke akun lembaga kab/kota, tanpa isi laporan, paling banyak 20 per kab per hari
    if (!PINDAH[t.status]?.includes("diteruskan")) return galat(409, "Perpindahan status tidak sah.");
    const w = wilayahBaris(baris), kabNama = w?.kab || null;
    const akun = kabNama && w.provKode ? (await H.lpAkunKabProv(env, w.provKode)).filter(a => bakuKab(a.kab) === bakuKab(kabNama)) : [];
    const wa = [...new Set(akun.map(a => a.wa))];
    const teks = `Ada laporan warga di ${kabNama} yang diteruskan BNPB lewat Lapor Bencana. Buka meja BPBD untuk melihat dan menindaklanjuti: ${url.origin}/lapor/meja`;
    const r = await H.lpBatch(env, STAF, [H.lpStmtTiketPindah(env, STAF, nomor, t.status, "diteruskan", kini),
      H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, t.status, "diteruskan", `Diteruskan ke meja BPBD${kabNama ? ` ${kabNama}` : " setempat"}`, oleh, kini),
      H.lpStmtKabarJikaBerubah(env, STAF, baris.wa, nomor, "status", `Status laporan ${nomor}: ${STATUS.diteruskan}.`, kini),
      ...wa.map(x => H.lpStmtKabarBpbd(env, STAF, x, nomor, kabNama, teks, kini))]);
    if (!r[0].meta.changes) return galat(409, "Status laporan baru saja berubah. Muat ulang.");
    tambahan = {bpbdTerdaftar: wa.length > 0, antre: r.slice(3).reduce((n, x) => n + x.meta.changes, 0)};
  } else if (aksi === "periksa") {   // pengecekan lapangan (K69, D108-D110): revisi = versi baru berasal petugas (pola susulan A12), tidak valid memindah tiket
    if (["selesai", "tidak_valid"].includes(t.status)) return galat(409, "Tiket sudah ditutup.");
    const s = dariBaris(baris), v = sahkanPeriksa(b.o, new Set(revisiTampil(s).map(x => x.nama)));
    if (v.galat) return galat(400, v.galat);
    const r = terapkanRevisi(s.isian, v.ubah, {pelaku: oleh, catatan: v.catatan, waktu: kini}), ke = statusDariHasil(v.hasil, t.status, PINDAH), stmts = [];
    let versiBaru = null;
    if (r.perubahan.length) { const rv = await stmtRevisi(env, baris, s, r, oleh, kini); versiBaru = rv.versi; stmts.push(...rv.stmts, H.lpStmtPdfAntre(env, STAF, nomor, versiBaru, kini, true)); }
    const ket = `Pengecekan lapangan: ${HASIL_PERIKSA[v.hasil]}. ${v.catatan}${versiBaru ? `. Revisi versi ${versiBaru}: ${r.perubahan.map(x => `${x.nama.replace(/_/g, " ")} ${x.dari ?? "belum didata"} menjadi ${x.ke}`).join(", ")}` : ""}`.slice(0, 1000);
    const g = stmts.length > 0;   // dengan revisi: semua baris berikut hanya jalan bila sesi berhasil diubah (rev sama)
    if (ke) stmts.push(H.lpStmtTiketPindah(env, STAF, nomor, t.status, ke, kini), H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, t.status, ke, ket, oleh, kini),
      H.lpStmtKabarJikaBerubah(env, STAF, baris.wa, nomor, "status", `Status laporan ${nomor}: ${STATUS[ke]}. ${v.catatan}`, kini));
    else stmts.push(H.lpStmtRiwayat(env, STAF, nomor, t.status, t.status, ket, oleh, kini, g));
    stmts.push(H.lpStmtPeriksa(env, STAF, nomor, v.hasil, v.catatan, JSON.stringify(r.perubahan), oleh, kini, true));
    const iP = stmts.length - 1, akunP = H.lpStmtPeriksaAkun(env, STAF, penandaPemeriksa(c));   // LK-02: jenis dan wilayah pemeriksa dari sesi, bukan dari teks oleh
    let hasil;
    try { hasil = await H.lpBatch(env, STAF, [...stmts, akunP]); }
    catch (e) {
      if (/lk_periksa_akun/i.test(String(e?.message))) hasil = await H.lpBatch(env, STAF, stmts);   // sebelum migrasi 0169 atau penanda ditolak CHECK: pengecekan tetap tercatat, dihitung belum terverifikasi
      else if (/UNIQUE|constraint/i.test(String(e?.message))) return galat(409, "Laporan baru saja berubah. Muat ulang.");
      else throw e;
    }
    if (!hasil[0].meta.changes || !hasil[iP].meta.changes) return galat(409, "Laporan baru saja berubah. Muat ulang.");
  } else if (aksi === "tindakan") {   // tambah tindakan selama Ditindaklanjuti (K70, D112)
    if (t.status !== "ditindaklanjuti") return galat(409, "Tindakan dicatat saat tiket Ditindaklanjuti.");
    const s = dariBaris(baris), v = sahkanTindakan(b.o, s.isian.jenis?.nilai, await registriDari(env)); if (v.galat) return galat(400, v.galat);
    const teks = v.tindakan.map(x => x.label).join(", ");
    await H.lpBatch(env, STAF, [...v.tindakan.map(x => H.lpStmtTindakan(env, STAF, nomor, x.kode, x.label, oleh, kini)),
      H.lpStmtRiwayat(env, STAF, nomor, t.status, t.status, `Tindakan: ${teks}`, oleh, kini),
      H.lpStmtKabar(env, STAF, baris.wa, nomor, "status", `Tindakan untuk laporan ${nomor}: ${teks}.`, null, kini)]);
  } else {
    const ke = b.o.ke;
    if (!PINDAH[t.status]?.includes(ke)) return galat(409, "Perpindahan status tidak sah.");
    if (ke === "tidak_valid" && catatan.length < 5) return galat(400, "Tulis alasan laporan tidak valid di kotak catatan.");
    let tindakan = [];   // Ditindaklanjuti wajib menyebut tindakan (K70, D112)
    if (ke === "ditindaklanjuti") { const v = sahkanTindakan(b.o, dariBaris(baris).isian.jenis?.nilai, await registriDari(env)); if (v.galat) return galat(400, v.galat, {perluTindakan: true}); tindakan = v.tindakan; }
    const teksT = tindakan.length ? `Tindakan: ${tindakan.map(x => x.label).join(", ")}` : null;
    // Selesai wajib minimal satu foto penanganan, atau alasan tertulis tanpa foto yang tercatat di riwayat (K60, D87, Q49)
    const alasan = String(b.o.tanpaBukti || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    const nb = ke === "selesai" ? await bacaTabel(() => H.lpBuktiHitung(env, STAF, nomor), 0) : 0;
    if (ke === "selesai" && !nb && alasan.length < 5) return galat(400, "Lampirkan minimal satu foto penanganan, atau tulis alasan tanpa foto.", {perluBukti: true});
    if (["selesai", "tidak_valid"].includes(t.status) && !catatan) return galat(400, "Membuka kembali wajib dengan catatan.");
    const tanpa = ke === "selesai" && !nb ? `Tanpa foto penanganan: ${alasan}` : null, catatanRiwayat = [teksT, catatan, tanpa].filter(Boolean).join(". ").slice(0, 1000) || null;
    const r = await H.lpBatch(env, STAF, [H.lpStmtTiketPindah(env, STAF, nomor, t.status, ke, kini), H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, t.status, ke, catatanRiwayat, oleh, kini),
      H.lpStmtKabarJikaBerubah(env, STAF, baris.wa, nomor, "status", `Status laporan ${nomor}: ${STATUS[ke]}.${teksT ? ` ${teksT}.` : ""}${catatan ? ` ${catatan}` : ""}${ke === "selesai" && nb ? ` Lihat ${nb} foto penanganan di halaman lacak.` : ""}`, kini),
      ...tindakan.map(x => H.lpStmtTindakan(env, STAF, nomor, x.kode, x.label, oleh, kini, true))]);
    if (!r[0].meta.changes) return galat(409, "Status laporan baru saja berubah. Muat ulang.");   // balapan dua staf
  }
  const baru = await H.lpSesiNomor(env, STAF, nomor);
  if (c.jenis !== "bnpb" && aksi !== "lihat") await tulisAudit(() => H.lpBatch(env, STAF, [H.lpStmtAkses(env, STAF, nomor, oleh, kini)]));   // aksi BPBD juga membuka identitas: tercatat
  await h.tunda?.();   // log meja untuk lihat sesudah sukses
  return kirim(200, {...await rincianObj(env, c, baru, true), ...tambahan});
}
/* PF-08 (ALGORITMA 13.1): hanya profil BPBD di wilayah laporan; status tiket tidak berubah, satu baris riwayat dengan dari = ke */
async function ambilLaporan(env, h, nomor, t, kini) {
  const {c, profil} = h;
  if (c.jenis !== "bpbd" || !profil) return galat(403, "Hanya profil BPBD yang bisa mengambil laporan.");
  if (["selesai", "tidak_valid"].includes(t.status)) return galat(409, "Laporan ini sudah ditutup.");
  const lama = await bacaTabel(() => H.lpAmbilNomor(env, nomor), undefined); if (lama === undefined) return galat(503, "Fitur ini belum diaktifkan.");
  if (lama?.profil_id === profil.id) { await h.tunda?.(); return kirim(200, {label: lama.label, ditangani: lama.label}); }
  const label = Array.from(labelAmbil(profil.nama, profil.jabatan, c.label)).slice(0, 300).join("");   // CHECK 0167 menghitung code point (maks 300)
  const n = await H.lpAmbilTulis(env, {nomor, profil: profil.id, akun: profil.akun, nama: profil.nama, jabatan: profil.jabatan, label, status: t.status, catatan: `Diambil oleh ${profil.nama}, ${profil.jabatan}`, pelaku: h.oleh}, kini);
  if (!n) return kirim(409, {galat: "Laporan ini sudah ditangani profil lain.", label: (await H.lpAmbilNomor(env, nomor))?.label ?? null});
  await h.tunda?.();
  return kirim(200, {label, ditangani: label});
}
/* PF-08 (ALGORITMA 13.2): respons per BPBD kab/kota untuk staf BNPB; tanpa peringkat, tanpa nama PIC, tanpa nomor */
async function responsGet(env, req, url, kini) {
  const h = await hakMeja(env, req, kini); if (!h) return tolakStaf(); if (h.tolak) return h.tolak;
  if (h.c.jenis !== "bnpb") return galat(403, "Angka respons hanya untuk staf BNPB.");
  /* ?bulan=YYYY-MM (LB-13, K8): laporan terkirim dalam bulan itu (WIB); tanpa parameter = 30 hari terakhir. Bulan di luar pola, sebelum 2020, atau belum mulai = 400 */
  const bln = url.searchParams.get("bulan"); let sejak = kini - RESPONS_HARI * HARI, sampai = kini, hari = RESPONS_HARI;
  if (bln !== null) {
    const m = /^(202\d)-(0[1-9]|1[0-2])$/.exec(bln); if (!m) return galat(400, "bulan harus berpola YYYY-MM, mulai 2020");
    sejak = Date.UTC(+m[1], +m[2] - 1, 1) - 7 * JAM; sampai = Date.UTC(+m[1], +m[2], 1) - 7 * JAM; hari = Math.round((sampai - sejak) / HARI);
    if (sejak > kini) return galat(400, "bulan itu belum mulai");
  }
  const lj = await laju(env, h.kunci, "lapor.respons", [[JAM, 60]], kini); if (lj) return lj;
  const [laporan, dilihat, akun] = await Promise.all([bacaTabel(() => H.lpResponsLaporan(env, sejak, sampai), []), bacaTabel(() => H.lpResponsDilihat(env, sejak, sampai), []), bacaTabel(() => H.pfAkunBpbdAktif(env), [])]);
  const terpotong = laporan.length > 5000; if (terpotong) laporan.length = 5000;   // ponytail: batas 5000 laporan per jendela; pecah per minggu bila terlampaui
  const lihat = new Map(dilihat.map(x => [x.nomor, x.waktu]));
  const ambilW = new Map(laporan.filter(l => l.ambil != null).map(l => [l.nomor, l.ambil]));
  const kabAkun = new Map(akun.map(a => [`${a.prov}|${bakuKab(a.kab)}`, a]));
  const baris = [];
  for (const l of laporan) {
    const w = (() => { try { return JSON.parse(l.ringkas)?.wilayah; } catch { return null; } })(), a = w && kabAkun.get(`${w.provKode}|${bakuKab(w.kab)}`);
    if (a) baris.push({kab: a.wilayah, masuk: l.terkirim, dilihat: lihat.get(l.nomor) ?? null, ambil: ambilW.get(l.nomor) ?? null});
  }
  return kirim(200, {jendela_hari: hari, ...(bln !== null ? {bulan: bln} : {}), ...(terpotong ? {terpotong: true} : {}), ambang: 5, bpbd: hitungRespons(baris).sort((x, z) => x.kab.localeCompare(z.kab, "id")).map(({kab, ...r}) => ({wilayah: kab, ...r}))});
}
/* PF-09 (ALGORITMA 14): PIC aktif BPBD wilayah laporan untuk staf BNPB; nomor tersamar, nomor penuh hanya lewat POST yang tercatat di lapor_akses */
async function daftarPic(env, baris) {
  const w = wilayahBaris(baris) || {};
  if (!w.provKode) return {w, baku: []};   // laporan tanpa wilayah: daftar kosong, bukan 500
  const akun = (await H.pfPicAkunProv(env, w.provKode)).filter(a => a.tingkat === "prov" || bakuKab(a.kab) === bakuKab(w.kab));
  const pic = await H.pfPicDaftar(env, akun.map(a => a.id)), per = new Map(akun.map(a => [a.id, a]));
  const baku = pic.map(p => ({...p, akun: per.get(p.akun_id), aktif: Math.max(p.terakhir_meja ?? 0, p.terakhir_masuk ?? 0)}))
    .sort((x, z) => (x.akun.tingkat === "kab" ? 0 : 1) - (z.akun.tingkat === "kab" ? 0 : 1) || z.aktif - x.aktif);
  return {w, baku};
}
const samarWa = wa => "x".repeat(Math.max(0, wa.length - 4)) + wa.slice(-4);
async function picGet(env, req, url, kini, nomor) {
  const h = await hakMeja(env, req, kini); if (!h) return tolakStaf(); if (h.tolak) return h.tolak;
  if (h.c.jenis !== "bnpb") return galat(403, "Nomor PIC hanya untuk staf BNPB.");
  const baris = await H.lpSesiNomor(env, STAF, nomor); if (!baris) return galat(404, "Laporan tidak ditemukan.");
  let d; try { d = await daftarPic(env, baris); } catch (e) { if (!tabelBelum(e)) throw e; d = {w: wilayahBaris(baris) || {}, baku: []}; }
  const ada = d.baku.some(p => p.akun.tingkat === "kab");
  return kirim(200, {pic: d.baku.map(p => ({profil_id: p.id, nama: p.nama, jabatan: p.jabatan, bpbd: p.akun.wilayah, tingkat: p.akun.tingkat, wa_samar: samarWa(p.wa), terakhir_aktif: p.aktif || null})),
    ...(ada ? {} : {kontak_situs: {...kontakBpbd(await kontakDari(env), d.w), sumber: "situs resmi"}})});
}
async function picPost(env, req, url, kini, nomor) {
  const h = await hakMeja(env, req, kini); if (!h) return tolakStaf(); if (h.tolak) return h.tolak;
  if (h.c.jenis !== "bnpb") return galat(403, "Nomor PIC hanya untuk staf BNPB.");
  const lj = await laju(env, h.kunci, "lapor.pic", [[JAM, 120]], kini); if (lj) return lj;
  const b = await bacaBody(req, 512); if (b.galat) return galat(b.status || 400, b.galat);
  const baris = await H.lpSesiNomor(env, STAF, nomor); if (!baris) return galat(404, "Laporan tidak ditemukan.");
  const d = await daftarPic(env, baris), p = d.baku.find(x => x.id === b.o.profil_id); if (!p) return galat(404, "PIC itu tidak ada di wilayah laporan ini.");
  await H.lpBatch(env, STAF, [H.lpStmtAkses(env, STAF, nomor, `${h.oleh} membuka nomor PIC ${p.nama}`, kini)]);
  return kirim(200, {profil_id: p.id, nama: p.nama, jabatan: p.jabatan, wa: p.wa});
}
/* rekonsiliasi tiga sumber (lapor-ai LA-76): laporan terverifikasi BPBD (LK-02, A3) per kab/kota, jenis, bulan WIB; tanpa nomor, nama, teks, atau foto.
   Staf BNPB saja sampai pemilik menjawab Q-R1. ponytail: tabel lk_tarik ada (LK-03) tetapi belum ada rute yang menulisnya (LK-07) dan kode GL- butuh gugus (LK-05), jadi syarat 5 belum dibaca; sambungkan bersama LK-07; rentang paling lama 400 hari */
const tglWibIso = ms => new Date(ms + 7 * JAM).toISOString().slice(0, 10);
async function rekonGet(env, c, url) {
  if (c.jenis !== "bnpb") return galat(403, "Rekonsiliasi hanya untuk staf BNPB.");
  const q = url.searchParams, hari = v => /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? Date.parse(v + "T00:00:00+07:00") : NaN;
  const dari = hari(q.get("dari")), sampai = hari(q.get("sampai")), prov = /^\d{2}$/.test(q.get("prov") || "") ? q.get("prov") : null;
  if (!Number.isFinite(dari) || !Number.isFinite(sampai) || sampai < dari || sampai - dari > 400 * 24 * JAM) return galat(400, "dari dan sampai wajib (YYYY-MM-DD), paling lama 400 hari.");
  const calon = await bacaTabel(() => H.lpRekonCalon(env, STAF, dari, sampai + 24 * JAM - 1, prov), []);
  const per = new Map();
  for (let i = 0; i < calon.length; i += 100) for (const r of await bacaTabel(() => H.lpPeriksaAkunNomor(env, STAF, calon.slice(i, i + 100).map(x => x.nomor)), []))
    (per.get(r.nomor) || per.set(r.nomor, []).get(r.nomor)).push({id: r.id, hasil: r.hasil, waktu: r.waktu, akun: r.jenis ? {jenis: r.jenis, tingkat: r.tingkat, prov: r.prov, kab: r.kab, kab_nama: r.kab_nama} : null});
  const grup = new Map();
  for (const r of calon) {
    let k = {}; try { k = JSON.parse(r.ringkas || "{}"); } catch {}
    const w = k.wilayah || null;
    if (!w?.provKode || !waktuVerifikasi({status: r.status, wilayah: w}, per.get(r.nomor), r.versi_waktu ? [{waktu: r.versi_waktu}] : [], [])) continue;
    const tgl = tglWibIso(k.waktuMs || r.terkirim), kunci = `${w.kabKode || w.kab}|${r.jenis}|${tgl.slice(0, 7)}`;
    const g = grup.get(kunci) || grup.set(kunci, {prov: w.provKode, kab: w.kabKode || null, kabNama: w.kab || null, jenis: r.jenis || null, bulan: tgl.slice(0, 7), n: 0, pertama: tgl, terakhir: tgl}).get(kunci);
    g.n++; if (tgl < g.pertama) g.pertama = tgl; if (tgl > g.terakhir) g.terakhir = tgl;
  }
  return kirim(200, {baris: [...grup.values()].sort((a, b) => a.bulan.localeCompare(b.bulan) || String(a.kab).localeCompare(String(b.kab)))});
}
async function mejaGet(env, req, url, kini, ctx, x) {
  const h = await hakMeja(env, req, kini); if (!h) return tolakStaf(); if (h.tolak) return h.tolak;
  const lj = await laju(env, h.kunci, "lapor.mejaget", [[JAM, 600]], kini); if (lj) return lj;   // G4: setara mejaDaftar
  if (x === "rekon") return rekonGet(env, h.c, url);
  if (x === "cari") return SEL.cariMeja(env, h, url, kini);   // orang dicari (LA-80)
  const pc = /^(LA-\d{6}-\d{2,3})\/pic$/.exec(x); if (pc) return picGet(env, req, url, kini, pc[1]);
  const km = /^(LA-\d{6}-\d{2,3})\/komen$/.exec(x); if (km) return KOMEN_MEJA.lihat(env, h, km[1], kini);
  const mj = /^(LA-\d{6}-\d{2,3})\/jalan$/.exec(x);   // ruas jalan rusak untuk peta meja (K83); nama diambil dari laporan, bukan dari peminta
  if (mj) { const baris = await H.lpSesiNomor(env, STAF, mj[1]); if (!baris || !dalamWilayah(h.c, wilayahBaris(baris))) return galat(404, "Laporan tidak ditemukan.");
    const b = barisMeja(baris); return kirim(200, await jalanOsm(b.lat, b.lon, b.tempat?.jalan || [])); }
  if (!RE_NOMOR.test(x)) return galat(404, "rute lapor tidak ada");
  return mejaRinci(env, h.c, x);
}
async function mejaPost(env, req, url, kini, ctx, x) {
  if (x.startsWith("cari/")) { const h = await hakMeja(env, req, kini); if (!h) return tolakStaf(); if (h.tolak) return h.tolak; return SEL.cariStatus(env, req, h, x, kini); }
  const pc = /^(LA-\d{6}-\d{2,3})\/pic$/.exec(x); if (pc) return picPost(env, req, url, kini, pc[1]);
  const km = /^(LA-\d{6}-\d{2,3})\/komen$/.exec(x); if (km) return KOMEN_MEJA.putus(env, req, km[1], kini);
  const m = /^(LA-\d{6}-\d{2,3})\/(balas|status|lihat|bukti|bukti-publik|teruskan|lepas|periksa|tindakan|ambil|tarik|usulkan)$/.exec(x);
  if (m?.[2] === "usulkan" && env.LAPOR_USUL !== "1") return galat(404, "Usulan ke Buku Besar belum dibuka.");   // saklar dibaca di rute (D12)
  return m ? mejaUbah(env, req, url, m[1], m[2], kini) : galat(404, "rute lapor tidak ada");
}

/* ---------------- foto penanganan: berkas (K60, D88) ---------------- */
async function buktiGet(env, req, url, kini, ctx, id) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const lj = await lajuPublik(env, req, "lapor.buktiget", 600, kini); if (lj) return lj;
  const f = /^[0-9a-f]{16}$/.test(id) ? await bacaTabel(() => H.lpBuktiById(env, PUBLIK, id), null) : null; if (!f) return galat(404, "tidak ada");
  const t = url.searchParams.get("t") || "";
  const ok = RE_TOKEN.test(t) && f.token_sha && await sha(t) === f.token_sha || url.searchParams.get("alun") === "1" && f.publik === 1 && TAMPIL_ALUN.has(f.status);
  if (!ok) return galat(404, "tidak ada");
  const o = await env.MEDIA.get(f.kunci_r2); if (!o) return galat(404, "tidak ada");
  const publik = url.searchParams.get("alun") === "1";   // foto yang ditandai publik boleh di-cache peramban: halaman Alun-alun memuat banyak sekaligus
  return new Response(o.body, {headers: {"content-type": "image/jpeg", "cache-control": publik ? "public, max-age=300" : "private, no-store", "x-robots-tag": "noindex", "x-content-type-options": "nosniff"}});
}

/* ---------------- Alun-alun warga (K30, Q14; K59 D84-D85): hanya ditindaklanjuti atau selesai; tanpa nama, nomor WA, nomor tiket, teks, koordinat pelapor; titik = pusat desa ---------------- */
const ID_JENIS = new Set(JENIS.map(j => j.id));
const alun = (env, req, url, kini, ctx) => {   // kunci cache tepi hanya dari kueri yang sah: jenis dari daftar JENIS, prov dua angka, tanpa parameter lain
  const q = url.searchParams, j = q.get("jenis") || "", p = q.get("prov") || "";
  if ([...q.keys()].some(k => k !== "jenis" && k !== "prov") || j && !ID_JENIS.has(j) || p && !/^\d{2}$/.test(p)) return galat(400, "Saringan tidak dikenal.");
  return cacheTepi(req, ctx, 60, () => alunBuat(env, req, url, kini));
};
const ringkasDari = r => { try { return r.ringkas ? JSON.parse(r.ringkas) : {}; } catch { return {}; } };
/* gugus dari semua laporan terkirim 30 hari (A9, src/lapor_gugus.js), dipakai bersama Alun-alun dan halaman hari ini (lapor-kejadian LK-05) */
async function gugusDasar(env, kini) {
  const semua = await H.lpGugusBaris(env, PUBLIK, kini - 30 * HARI), per = new Map(semua.map(r => [r.nomor, r]));
  const G = hitungGugus(semua.map(r => { const k = ringkasDari(r), w = k.wilayah || {};
    return {nomor: r.nomor, jenis: r.jenis, lat: r.lat ?? null, lon: r.lon ?? null, kab: w.kab || null, desa: w.kode || null, t: k.waktuMs || r.terkirim, wa: r.wa, fotoSah: !!r.foto_sah, status: r.status}; }));
  return {per, G, gk: new Map(G.gugus.map(g => [g.kode, g]))};
}
/* kartu Alun-alun yang bisa tampil (rumus id sama dengan alunBuat, tanpa saringan jenis dan provinsi): id kartu -> {jangkar: id laporan paling awal gugus,
   anggota: nomor yang tampil, sasaran: nomor laporan terbaru yang angkanya dibaca kartu (alunBuat, D28)}. Dipakai komentar (LA-85) dan meja komentar (LA-88).
   ponytail: membaca ulang gugus 30 hari tiap komentar ditulis atau dibuka di meja; komentar dibatasi 10 per nomor per jam, tambahkan cache bila baca D1 jadi masalah */
async function kartuPeta(env, kini) {
  const [tampil, {per, G, gk}] = await Promise.all([H.lpAlunBaris(env, PUBLIK, null, null), gugusDasar(env, kini)]), peta = new Map();
  for (const r of tampil.filter(x => TAMPIL_ALUN.has(x.status))) {
    const kunci = G.per[r.nomor] || r.nomor, g = gk.get(kunci), ms = barisAlun(r).ms, x = peta.get(kunci);
    if (!x) peta.set(kunci, {jangkar: (g ? per.get(g.anggota[0]) : null)?.id || r.id, anggota: [r.nomor], sasaran: r.nomor, ms});
    else { x.anggota.push(r.nomor); if (ms > x.ms) { x.ms = ms; x.sasaran = r.nomor; } }
  }
  return new Map(await Promise.all([...peta.values()].map(async v => [(await sha(v.jangkar)).slice(0, 10), v])));
}
const kartuTampil = async (env, kini) => new Map([...await kartuPeta(env, kini)].map(([k, v]) => [k, v.jangkar]));
async function alunBuat(env, req, url, kini) {
  const batas = await lajuIP(env, req, "lapor.alun", [[JAM, 120]], kini); if (batas) return batas;
  const q = url.searchParams, prov = /^\d{2}$/.test(q.get("prov") || "") ? q.get("prov") : null, jenis = /^[a-z_]{1,40}$/.test(q.get("jenis") || "") ? q.get("jenis") : null;
  const [tampil, {per, G, gk}, buktiPublik] = await Promise.all([H.lpAlunBaris(env, PUBLIK, prov, jenis), gugusDasar(env, kini), bacaTabel(() => H.lpBuktiAlun(env, PUBLIK), [])]);
  const terbaru = new Map();   // angka dampak laporan terbaru gugus, tidak dijumlah (D28, D85)
  for (const r of tampil.filter(x => TAMPIL_ALUN.has(x.status))) {
    const b = barisAlun(r), kunci = G.per[r.nomor] || r.nomor, lama = terbaru.get(kunci);
    if (!lama || b.ms > lama.b.ms) terbaru.set(kunci, {r, b});
  }
  const publikPer = new Map(); for (const x of buktiPublik) publikPer.set(x.nomor, [...(publikPer.get(x.nomor) || []), x.id]);
  const hasil = await Promise.all([...terbaru].sort(([, a], [, z]) => z.b.ms - a.b.ms).slice(0, 100).map(async ([kunci, {r, b}]) => {
    const g = gk.get(kunci), awal = g ? per.get(g.anggota[0]) : null, w = ringkasDari(r).wilayah || {}, {ms, id, ...x} = b;
    const desa = w.kode ? await wilayahDari(env).pusat(String(w.kode)).catch(() => null) : null;
    const anggota = g ? g.anggota : [r.nomor], bukti = anggota.filter(n => TAMPIL_ALUN.has(per.get(n)?.status ?? r.status)).flatMap(n => publikPer.get(n) || []).slice(0, 4);
    return {id: (await sha(awal?.id || id)).slice(0, 10), ...x, titik: desa ? {lat: Math.round(desa.lat * 1e4) / 1e4, lon: Math.round(desa.lon * 1e4) / 1e4} : null,
      nWarga: g && g.n_pelapor >= 2 ? g.n_pelapor : null, bukti: bukti.map(i => `/api/lapor/bukti/${i}?alun=1`)};
  }));
  return kirim(200, {baris: hasil, jumlah: hasil.length});
}

/* ---------------- halaman publik kejadian hari ini (lapor-kejadian LK-05; A3, A4, A5; D5, D6, D7, D12; bawaan Q4, Q5, Q9, Q20) ----------------
   Hanya kejadian laporan yang terverifikasi BPBD wilayah (terverifikasiBpbd) dengan verifikasi terakhir dalam 24 jam. Kartu dari kartuPublik (daftar putih).
   Saklar LAPOR_HARI_INI=1; mati = 404. Tidak menulis D1 selain batas laju; cache tepi 60 detik. */
const JENDELA_HARI_INI = 24 * JAM;   // HIPOTESIS Q9: 24 jam bergulir dari waktu verifikasi Valid terakhir
const potong = (xs, n = 100) => Array.from({length: Math.ceil(xs.length / n)}, (_, i) => xs.slice(i * n, i * n + n));
async function idPublik(env, id) {   // id kartu = HMAC berlabel domain dari id laporan paling awal, bukan sha polos (tinjauan keamanan LK-04); jaga() memastikan SESI_KUNCI ada
  const enc = new TextEncoder(), hmac = k => crypto.subtle.importKey("raw", k, {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const turunan = await crypto.subtle.sign("HMAC", await hmac(enc.encode(env.SESI_KUNCI)), enc.encode("lapor-hari-ini|"));
  return hex(await crypto.subtle.sign("HMAC", await hmac(turunan), enc.encode(String(id)))).slice(0, 10);
}
async function hariIniBuat(env, req, url, kini) {
  const batas = await lajuIP(env, req, "lapor.hari", [[JAM, 120]], kini); if (batas) return batas;
  const q = url.searchParams, prov = q.get("prov") || null, jenis = q.get("jenis") || null;
  const [calon, {per, G, gk}] = await Promise.all([H.lpPeriksaValidSejak(env, HARI_INI, kini - JENDELA_HARI_INI), gugusDasar(env, kini)]);
  const kejadian = new Map();   // kode kejadian laporan (GL- gugus atau LA- tunggal) -> nomor anggota
  for (const n of calon) { if (!per.has(n)) continue; const kode = G.per[n] || n; if (!kejadian.has(kode)) kejadian.set(kode, (gk.get(kode)?.anggota || [n]).filter(x => per.has(x))); }
  const nomor = [...new Set([...kejadian.values()].flat())], semua = async (xs, f) => (await Promise.all(potong(xs).map(f))).flat();
  /* tarikan dikunci ke nomor tiket anggota (LA-), bukan kode GL-: nomor urut GL- dihitung ulang tiap muat dan bisa bergeser ke gugus lain (tinjauan keamanan LK-05).
     Kejadian laporan ditarik bila baris tarikan terakhir di antara semua anggotanya aktif; LK-07 menulis satu baris per anggota sekaligus. */
  const [periksa, versi, tarik] = await Promise.all([semua(nomor, xs => H.lpPeriksaAkunNomor(env, HARI_INI, xs)), semua(nomor, xs => H.lpVersiTerakhir(env, HARI_INI, xs)),
    semua(nomor, xs => H.lpTarikKode(env, HARI_INI, xs))]);
  const P = new Map(), V = new Map(versi.map(v => [v.nomor, v.waktu])), T = new Map();
  for (const r of periksa) (P.get(r.nomor) || P.set(r.nomor, []).get(r.nomor)).push({id: r.id, hasil: r.hasil, waktu: r.waktu, akun: r.jenis ? {jenis: r.jenis, tingkat: r.tingkat, prov: r.prov, kab: r.kab, kab_nama: r.kab_nama} : null});
  for (const r of tarik) (T.get(r.kode) || T.set(r.kode, []).get(r.kode)).push(r);
  const pilih = [];
  for (const [kode, anggota] of kejadian) {
    const isi = anggota.map(n => { const r = per.get(n), k = ringkasDari(r); return {nomor: n, r, k, laporan: {status: r.status, wilayah: k.wilayah || null}, periksa: P.get(n) || [], versi: V.get(n) ? [{waktu: V.get(n)}] : []}; });
    const kj = kejadianTerverifikasi(isi, anggota.flatMap(n => T.get(n) || []));   // Q20: Tidak valid, versi baru, atau tarikan aktif = turun pada muat berikut
    if (!kj.terverifikasi || kj.waktu <= kini - JENDELA_HARI_INI) continue;
    const sah = isi.filter(a => kj.anggota.includes(a.nomor)), akhir = sah.reduce((m, a) => (a.k.waktuMs || 0) > (m.k.waktuMs || 0) ? a : m);
    if (prov && akhir.k.wilayah?.provKode !== prov || jenis && akhir.r.jenis !== jenis) continue;
    pilih.push({sah, akhir, awal: isi[0], waktu: kj.waktu});
  }
  const baris = (await Promise.all(pilih.sort((a, z) => z.waktu - a.waktu).slice(0, 100).map(async x => {
    const kd = x.akhir.k.wilayah?.kode, pusat = kd ? await wilayahDari(env).pusat(String(kd)).catch(() => null) : null;
    return kartuPublik({id: await idPublik(env, x.awal.r.id), pusat, anggota: x.sah.map(a => { const p = terakhir(a.periksa);
      return {r: a.r, verifikasi: {waktu: p.waktu, tingkat: p.akun?.tingkat, kab_nama: p.akun?.kab_nama || null}}; })});
  }))).filter(Boolean);
  return kirim(200, {baris, jumlah: baris.length, dibuat: kini, jendela_jam: JENDELA_HARI_INI / JAM});
}
const hariIni = (env, req, url, kini, ctx) => {   // saklar dibaca di rute, bukan di klien (D12); kunci cache hanya dari kueri yang sah, sama dengan Alun-alun
  if (env.LAPOR_HARI_INI !== "1") return galat(404, "Halaman ini belum dibuka.");
  if (!env.IP_SALT) return galat(503, "server belum dikonfigurasi (IP_SALT)");   // kunci batas laju per IP selalu bergaram (tinjauan guard-api LK-05)
  const q = url.searchParams, j = q.get("jenis") || "", p = q.get("prov") || "", ks = [...q.keys()];
  if (ks.some(k => k !== "jenis" && k !== "prov") || new Set(ks).size !== ks.length || j && !ID_JENIS.has(j) || p && !/^\d{2}$/.test(p)) return galat(400, "Saringan tidak dikenal.");   // parameter ganda ditolak: tiap varian kueri = kunci cache baru
  return cacheTepi(req, ctx, 60, () => hariIniBuat(env, req, url, kini));
};

/* ---------------- data terbuka agregat (K62, D91-D93): akun kampus mitra aktif (sesi /kemitraan), staf, atau admin; tiap unduhan tercatat ---------------- */
async function agregatGet(env, req, url, kini) {
  let akun = await stafMeja(env, req);
  if (!akun) { let h = null; try { h = await hakKm(env, req, kini); } catch (e) { if (!tabelBelum(e)) throw e; } if (h?.tolak) return h.tolak; if (["KK", "SA", "ST"].includes(h?.peran)) akun = h.oleh; }
  if (!akun) return galat(403, "Data agregat hanya untuk akun kampus mitra, staf, atau admin.");
  const lj = await laju(env, String(akun).slice(0, 60), "lapor.agregat", [[JAM, 10], [HARI, 30]], kini); if (lj) return lj;   // baca D1 berat (kuota Free 5 juta baris per hari): sampai pipeline harian LA-64
  const csv = url.searchParams.get("format") === "csv";
  const baris = agregat((await H.lpAgregatBaris(env, STAF)).map(r => { const k = ringkasDari(r), w = k.wilayah || {};
    return {provKode: w.provKode, prov: w.prov, kabKode: w.kabKode, kab: w.kab, jenis: labelJenis(r.jenis), kejadian: k.waktuMs ?? null, terkirim: r.terkirim, wa: r.wa, fotoSah: !!r.foto_sah, status: r.status}; }));
  await tulisAudit(() => H.lpUnduhCatat(env, STAF, akun, csv ? "agregat.csv" : "agregat.json", kini));   // D93 meminta tiap unduhan tercatat: satu-satunya GET Lapor yang menulis selain laju
  if (csv) return new Response(keCsv(baris), {headers: {"content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="lapor-agregat.csv"', "x-content-type-options": "nosniff", ...HDR}});
  return kirim(200, {dibuat: new Date(kini).toLocaleString("id-ID", {dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta"}), batas: BATAS_SEL, kolom: KOLOM_AGREGAT, baris});
}

const BATAS_TERJEMAH_HARI = 3000;
/* terjemahan teks kartu (judul, tombol, placeholder) ke bahasa pilihan; tanpa data pelapor. Dibatasi per IP (biaya model); klien menyimpan hasilnya per bahasa. */
async function terjemahPost(env, req, url, kini) {
  // 60 per jam habis dalam beberapa menit ganti bahasa (pemilik 20 Nov 2026: halaman tetap Indonesia); hasil disimpan per butir di cache colo supaya model jarang dipanggil
  const lj = await lajuPublik(env, req, "lapor.terjemah", 600, kini); if (lj) return lj;
  const b = await bacaBody(req, 16384); if (b.galat) return galat(b.status || 400, b.galat);
  if (!Array.isArray(b.o.teks)) return galat(400, "teks harus daftar");
  const bahasa = bahasaSah(b.o.bahasa), teks = b.o.teks.slice(0, MAKS_TEKS_UI).map(t => String(t ?? "").slice(0, PANJANG_TEKS_UI));
  if (bahasa === "id") return kirim(200, {teks});
  const c = globalThis.caches?.default, kunci = t => new Request(`https://cache.lokal/lapor/tr/${bahasa}/${encodeURIComponent(t)}`);
  const hasil = await Promise.all(teks.map(async t => { try { const r = c && await c.match(kunci(t)); return r ? await r.text() : null; } catch { return null; } }));
  let hurufBelum = 0;   // K72: teks belum ter-cache per permintaan dibatasi 2 panggilan model, jadi plafon harian = panggilan, bukan permintaan
  const belum = teks.filter((t, i) => hasil[i] == null).filter(t => (hurufBelum += t.length) <= HURUF_PANGGILAN * 2);
  /* K72: plafon harian SELURUH situs untuk panggilan model di rute ini, supaya rute terjemahan tidak bisa dipakai sebagai layanan terjemah gratis.
     Teks tetap halaman sudah di cache colo, jadi pemakaian wajar jauh di bawahnya; lewat plafon = butir null, klien tetap Indonesia dan mencoba lagi besok. */
  if (belum.length && !(await laju(env, "global", "lapor.terjemah.model", [[24 * JAM, BATAS_TERJEMAH_HARI]], kini))) {
    const tr = await terjemahUi(modelDari(env), belum, bahasa);
    belum.forEach((t, j) => { const x = tr[j]; if (x == null) return; teks.forEach((u, i) => { if (u === t) hasil[i] = x; });
      if (c) c.put(kunci(t), new Response(x, {headers: {"cache-control": "public, max-age=2592000"}})).catch(() => {}); });
  }
  return kirim(200, {teks: hasil});
}
const jaga = f => async (env, req, ...a) => {
  if (!env.SESI_KUNCI) return galat(503, "server belum dikonfigurasi (SESI_KUNCI)");
  const r = await f(env, req, ...a), k = SET_KUKI.get(req);
  if (!k) return r;
  const x = new Response(r.body, r); x.headers.append("set-cookie", k); return x;   // kuki perangkat baru (D100)
};   // token lacak butuh kunci rahasia; tanpa itu tidak ada jalur yang jalan
const RUTE = {
  "POST /api/lapor/pesan": pesan,
  "POST /api/lapor/foto": fotoPost,
  "GET /api/lapor/foto/:id": fotoGet,
  "GET /api/lapor/foto/:x": fotoGet,   // video: <id>.mp4|mov|webm, dengan Range
  "POST /api/lapor/unggah/:x": unggahPost,   // mulai, <id>/selesai
  "PUT /api/lapor/unggah/:x": unggahBagian,   // <id>/<n>
  "GET /api/lapor/unggah/:x": unggahStatus,   // <id>
  "POST /api/lapor/terjemah": terjemahPost,
  "GET /api/lapor/bahasa": bahasaGet,
  "GET /api/lapor/sesi": sesiGet,
  "GET /api/lapor/cari": cariGet,
  "GET /api/lapor/sekitar": sekitarGet,
  "GET /api/lapor/penting": infoGet("penting"),
  "GET /api/lapor/daerah": infoGet("daerah"),
  "GET /api/lapor/rapor": infoGet("rapor"),
  "GET /api/lapor/kotak": kotakGet,
  "POST /api/lapor/nilai": nilaiPost,
  "POST /api/lapor/susulan": susulanPost,
  "POST /api/lapor/darurat/cepat": daruratCepat,
  ...SEL.rute,   // kabar selamat dan orang dicari (src/lapor_selamat.js, migrasi 0173)
  "GET /api/lapor/lacak": lacak,
  "GET /api/lapor/unduh/:x": unduh,
  "GET /api/lapor/alun": alun,
  ...KOMEN.rute,   // komentar warga per kartu Alun-alun (src/lapor_komen.js, migrasi 0175)
  "GET /api/lapor/hari-ini": hariIni,
  "GET /api/lapor/bukti/:id": buktiGet,
  "GET /api/lapor/agregat": agregatGet,
  "GET /api/lapor/izin": izinGet,
  "POST /api/lapor/izin": izinPost,
  "GET /api/lapor/pdf/antre": pdfAntre,
  "POST /api/lapor/pdf/:x": pdfPost,
  "GET /api/lapor/kabar": kabarGet,
  "POST /api/lapor/kabar/:x": kabarTerkirim,
  ...buatRutePeringatan({wilayah: wilayahDari, muat: muatAset}),   // peringatan dini warga (paket pwa-peringatan, PW-06, PW-09)
  "GET /api/lapor/meja": mejaDaftar,
  "GET /api/lapor/respons": responsGet,
  "GET /api/lapor/meja/:x": mejaGet,
  "POST /api/lapor/meja/:x": mejaPost,
};
/* cron peringatan dini warga (PW-07): dipanggil tiap menit dari scheduled() di src/worker.js */
export const peringatanTiapMenit = (env, kini) => jalankanPeringatan(env, kini, muatAset);
export const bersihPeringatanLapor = (env, kini) => bersihPeringatan(env, kini);
export const RUTE_LAPOR = Object.fromEntries(Object.entries(RUTE).map(([k, f]) => [k, jaga(f)]));
