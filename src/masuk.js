/* Satu Pintu Masuk, tiket PM-03 (data/kajian-bnpb/pintu-masuk/: ALGORITMA §2, DESAIN-TEKNIS §3-4, KEAMANAN-PRIVASI §2):
   minta dan periksa kode enam angka lewat WA, sesi akun umum (cookie sesi_masuk), profil minimal, keluar.
   Kode hanya disimpan sebagai HMAC berahasia MASUK_KUNCI, tidak pernah ada di jawaban API atau log. Pesan keluar lewat wa_antre (jenis 'otp'); tidak ada pembacaan WA masuk.
   PM-06: sesi peran (tiap modul menerbitkan dan mencabut sesinya sendiri; di sini tidak ada tulis ke tabel sesi/akun modul lain), pemilih ruang, keluar, nomor pemirsa.
   PM-08: lengkapi profil akun umum, halaman public/masuk.*.
   PM-07: sandi staf sesudah kode lewat cobaMasukStaf; akun rahasia (sesi_admin) tidak pernah lewat sini. Belum di sini: undangan, email (PM-09 sampai PM-16). Semua ambang ada di masuk_konst.js. */
import {json, gagal, sha, hex, acak, bacaBody, bersihTeks, normalWA, turnstileOK, ipHash, cacheTepi} from "./worker.js";
import {PROV} from "./bangunan.js";
import {laju} from "./bnpb.js";
import {emailAktif, kirimEmail} from "./ews.js";
import {superOK, RE_EMAIL} from "./posko.js";
import {sesiUntuk as sesiInstansi, cabutSesi as cabutInstansi, aturSandi as sandiInstansi} from "./instansi.js";
import {sesiUntuk as sesiPendataan, cabutSesi as cabutPendataan, aturSandi as sandiPendataan} from "./pendataan.js";
import {sesiUntuk as sesiKampus, cabutSesi as cabutKampus, aturSandi as sandiKampus} from "./kemitraan_akun.js";
import {sesiUntuk as sesiPemirsa, cabutSesi as cabutPemirsa, arahPemirsa} from "./pemirsa.js";
import {cabutSesi as cabutStaf, cobaMasukStaf, hanyaDirektori} from "./staf.js";
import {STATUS_RELAWAN_ARR} from "./lapangan.js";
import {mkJedaTerakhir, mkKodeBaru, mkNaikCobaSemua, mkHanguskanBanyak, mkSelesaiKode, mkPakaiKode, mkDenyutBaca, mkAkunUntuk, mkSesiBaru, mkCabutSesi, mkLengkapi,
  mkRuangPeran, mkStafPerWa, mkLogMasuk, mkOrangDariWa, mkRelawanDariWa, mkPemirsaAda, mkPemirsaWaSet,
  mkUndangTerima, mkAkunSaya, mkHapusAkun, mkAnggotaLama, mkAnggotaTurun, mkKontakCocok, mkEmailAkunCocok, mkKodeEmailAkun, mkKodeAkunAmbil, mkHanguskan, mkAnggotaMenungguMilik} from "./hak.js";   // semua SQL di hak.js (gerbang d1)
import {sesiMasuk, tokenDari} from "./masuk_sesi.js";
import * as K from "./masuk_konst.js";

const BELUM = "fitur belum diaktifkan (migrasi masuk belum dijalankan)";
const tabelBelum = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, BELUM); throw e; }
};
const kunciSah = env => typeof env.MASUK_KUNCI === "string" && env.MASUK_KUNCI.length >= K.KUNCI_MIN;   // kunci pendek = belum dikonfigurasi
const reKode = new RegExp(`^[0-9]{${K.KODE_DIGIT}}$`);
const galatKode = () => gagal(400, "kode salah atau kedaluwarsa");   // satu pesan untuk salah, habis waktu, habis coba, tanpa kode
const galatNomor = () => gagal(400, "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)");
const kukiSesi = (nilai, umurDetik) => `sesi_masuk=${nilai}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${umurDetik}`;

/* header x-pb: 1 dan Origin sama situs (kosong/"null" hanya bila peramban menyatakan Sec-Fetch-Site same-origin): form lintas situs tidak bisa memenuhinya */
function penjaga(req, url) {
  if (req.headers.get("x-pb") !== "1") return gagal(403, "kiriman wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman)");
  const o = req.headers.get("origin"), kosong = !o || o === "null";
  const sama = kosong ? req.headers.get("sec-fetch-site") === "same-origin" : URL.canParse(o) && new URL(o).host === url.host;
  return sama ? null : gagal(403, "origin lain ditolak");
}

const enc = new TextEncoder();
async function hmac(kunci, teks) {
  const k = await crypto.subtle.importKey("raw", enc.encode(kunci), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(teks)));
}
function samaWaktu(a, b) {   // dua hex berpanjang tetap
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/* enam angka seragam: nilai di atas kelipatan terbesar ditolak (tanpa bias modulo) */
function kodeAcak() {
  const m = 10 ** K.KODE_DIGIT, batas = Math.floor(2 ** 32 / m) * m, u = new Uint32Array(1);
  do crypto.getRandomValues(u); while (u[0] >= batas);
  return String(u[0] % m).padStart(K.KODE_DIGIT, "0");
}
/* laju() menghitung lalu mencatat; lewat batas -> 429 tanpa menyebut angka batas */
async function batas(env, kunci, aksi, b, kini, pesan = "terlalu sering, coba lagi nanti") {
  const r = await laju(env, kunci, aksi, b, kini);
  return r && gagal(429, pesan, {"retry-after": r.headers.get("retry-after") || "60"});
}

/* ---------------- minta kode (ALGORITMA 2.1) ---------------- */
async function mintaKode(env, req, url, kini) {
  if (!kunciSah(env) || !env.TURNSTILE_SECRET || !env.TURNSTILE_SITEKEY) return gagal(503, "masuk lewat kode belum dikonfigurasi");   // tanpa lolos-diam seperti turnstileOK
  const g = penjaga(req, url); if (g) return g;
  if (!req.headers.get("cf-connecting-ip")) return gagal(403, "alamat jaringan tidak terbaca");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const nomor = normalWA(b.o.wa); if (!nomor) return galatNomor();
  const ip = await batas(env, await ipHash(env, req), "masuk.minta_ip", K.LAJU_IP_MINTA, kini); if (ip) return ip;   // sebelum siteverify: token ngawur tidak memicu fetch tanpa hitungan
  if (!(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const nsha = await hmac(env.MASUK_KUNCI, "wa|" + nomor);
  /* jeda sebelum laju per nomor: klik ganda tidak menghabiskan jatah nomor itu */
  const d = await mkJedaTerakhir(env, nsha, kini - K.JEDA_KIRIM);
  if (d) return gagal(429, "tunggu sebentar sebelum meminta kode lagi", {"retry-after": String(Math.ceil((d + K.JEDA_KIRIM - kini) / 1000))});
  const x = await batas(env, nsha, "masuk.minta_nomor", K.LAJU_NOMOR, kini); if (x) return x;
  const r = await batas(env, "global", "masuk.global", K.LAJU_GLOBAL, kini, "sedang ramai, coba beberapa menit lagi"); if (r) return r;
  const kode = kodeAcak(), id = acak(8);   // id yang sama dipakai baris wa_antre supaya penghapusan lewat kunci utama
  const pesan = `Kode masuk Centurisk97: ${kode}. Berlaku ${K.KODE_UMUR / 60e3} menit. Jangan berikan kode ini kepada siapa pun.`;
  await mkKodeBaru(env, id, nsha, await hmac(env.MASUK_KUNCI, nomor + "|" + kode), nomor, pesan, kini, kini + K.KODE_UMUR);
  return json({ok: true, tunggu: K.JEDA_KIRIM / 1000});   // sama untuk nomor dikenal maupun tidak
}

/* semua kode aktif satu kunci naik coba dulu, lalu dibandingkan satu per satu tanpa keluar lebih awal (D18); baris pemenang = satu pemanggil saja (UPDATE ... WHERE dipakai IS NULL).
   Dipakai kode WA dan kode email (src/masuk_undang.js). Mengembalikan baris pemenang atau null; kode aktif lain kunci itu hangus. */
export async function cocokKode(env, nsha, h, kini, maks) {
  const baris = await mkNaikCobaSemua(env, nsha, kini, maks);
  if (!baris.length) return null;
  const lewat = [];
  let menang = null;
  for (const r of baris) {
    if (r.coba > K.MAKS_COBA) { lewat.push(r.id); continue; }
    if (samaWaktu(r.kode_sha, h) && !menang) menang = r;
  }
  if (lewat.length) await mkHanguskanBanyak(env, lewat, kini);
  if (!menang || !await mkPakaiKode(env, menang.id, kini)) return null;   // permintaan serentak: hanya satu yang menang
  await mkSelesaiKode(env, nsha, menang.id, kini);   // kode aktif lain hangus, baris otp dihapus
  return menang;
}

/* ---------------- periksa kode (ALGORITMA 2.2) ---------------- */
async function periksaKode(env, req, url, kini) {
  if (!kunciSah(env)) return gagal(503, "masuk lewat kode belum dikonfigurasi");
  const g = penjaga(req, url); if (g) return g;
  if (!req.headers.get("cf-connecting-ip")) return gagal(403, "alamat jaringan tidak terbaca");
  const x = await batas(env, await ipHash(env, req), "masuk.periksa_ip", K.LAJU_IP_PERIKSA, kini); if (x) return x;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const nomor = normalWA(b.o.wa); if (!nomor) return galatNomor();
  const kode = typeof b.o.kode === "string" ? b.o.kode.trim() : "";
  if (!reKode.test(kode)) return galatKode();
  const nsha = await hmac(env.MASUK_KUNCI, "wa|" + nomor);
  const menang = await cocokKode(env, nsha, await hmac(env.MASUK_KUNCI, nomor + "|" + kode), kini, K.KODE_AKTIF_MAKS);
  if (!menang) return galatKode();
  if (menang.saluran === "email") return periksaEmail(env, menang, nomor, kini);   // D21: email hanya membuka akun yang emailnya cocok
  /* nomor yang kodenya sah tetapi belum punya akun: akun umum kosong (nama, wilayah, persetujuan dilengkapi PM-08) */
  const a = await mkAkunUntuk(env, acak(8), nomor, kini);
  if (a.status !== "aktif") return gagal(403, "akun ini diblokir");
  await buktiUlang(env, a.id, nomor, kini);   // PM-14: anggota yang lama tidak masuk diperiksa ulang SEBELUM undangan baru dihitung
  await buktiNomor(env, a.id, nomor, kini);   // PM-09: undangan berlaku dan kontak bnpb dipakai SEBELUM daftar ruang dihitung
  const token = acak(32);
  await mkSesiBaru(env, await sha(token), a.id, kini, kini + K.SESI_UMUR_UMUM);
  /* sesi lama tiap akun peran yang terikat langsung ke nomor ini (D2, D4); akun yang gugur di tengah jalan (dicabut) tidak masuk daftar */
  const kuki = [kukiSesi(token, K.SESI_UMUR_UMUM / 1000)], log = [], ruang = [];
  for (const e of tandaiPilih((await cariRuang(env, nomor)).ruang)) {
    if (e._s && !e.perlu_pilih) {   // lebih dari satu akun sejenis: tanpa sesi otomatis, orang memilih lewat /api/masuk/pilih
      const c = await MODUL()[e._s[0]].buat(env, e._s[2], kini); if (!c) continue;
      kuki.push(...c); log.push({id: acak(8), tabel: e._s[1], akun_id: e._s[2]});
    }
    ruang.push(e);
  }
  await mkLogMasuk(env, log, a.id, kini);
  const r = json({ok: true, lengkap: a.setuju_pdp > 0, ruang: ruang.map(bersihRuang), menunggu: await menungguMilik(env, a.id)});
  for (const c of kuki) r.headers.append("set-cookie", c);
  return r;
}

/* PM-16 (D21): kode lewat email hanya membuka akun yang emailnya cocok saat kode diminta (mk_kode_akun), bukan semua peran bernomor itu. Tidak membuat atau menemukan mk_akun, tidak menerbitkan
   sesi_masuk, tidak memproses undangan atau bukti ulang, tidak mencatat mk_masuk_log (tanpa mk_id). Staf tidak mendapat sesi: diarahkan ke pintu sandi lama. Satu akun per modul (satu cookie per modul).
   Akibatnya lewat email orang tidak bisa memilih akun lain, mengundang, mengatur sandi, atau menghapus akun. */
async function periksaEmail(env, menang, nomor, kini) {
  const ada = new Set((await mkKodeAkunAmbil(env, menang.id)).map(x => x.tabel + ":" + x.akun_id)), kuki = [], ruang = [], dipakai = new Set();
  for (const e of (await cariRuang(env, nomor)).ruang) {
    if (e.jenis === "staf") { if (ada.has("staf:" + e.pilih)) ruang.push({jenis: "staf", nama_ruang: e.nama_ruang, lembaga: e.lembaga, wilayah: null, ke: "/admin/masuk", butuh_sandi: true}); continue; }
    if (!e._s || !ada.has(e._s[1] + ":" + e._s[2]) || dipakai.has(e._s[0])) continue;
    const c = await MODUL()[e._s[0]].buat(env, e._s[2], kini); if (!c) continue;   // akun yang gugur sejak kode diminta tidak dibuka
    dipakai.add(e._s[0]); kuki.push(...c);
    ruang.push({jenis: e.jenis, nama_ruang: e.nama_ruang, lembaga: e.lembaga, wilayah: e.wilayah, ke: e.ke, butuh_sandi: false});
  }
  const r = json({ok: true, lewat: "email", ruang});
  for (const c of kuki) r.headers.append("set-cookie", c);
  return r;
}

/* PM-09 (ALGORITMA §5): undangan berlaku (pengundang masih berhak) ke akun instansi aktif menjadi anggota aktif saat kode sah. Pintu ini TIDAK PERNAH mengubah status pdt_akun
   (D19): pendaftaran pendataan memakai sandi dan nomor ketikan pendaftar yang tak dibuktikan, jadi persetujuannya tetap Super Admin. Tidak menyentuh instansi_akun. */
async function buktiNomor(env, mkId, nomor, kini) {
  await mkUndangTerima(env, mkId, nomor, kini);
}

/* PM-14 (ALGORITMA §7): anggota aktif yang 180 hari tidak masuk ke akun lembaganya: kontak pemangku yang cocok masih ada = tetap aktif; selain itu menunggu pemeriksaan.
   Undangan tidak dihitung ulang (sudah dipakai); email terpetakan tidak bisa diperiksa tanpa email baru, jadi jatuh ke menunggu. */
async function buktiUlang(env, mkId, nomor, kini) {
  for (const g of await mkAnggotaLama(env, mkId, kini - K.BUKTI_ULANG)) {
    const kategori = K.PETA_KATEGORI[g.jenis];
    if (kategori && await mkKontakCocok(env, nomor, kategori, g)) continue;
    await mkAnggotaTurun(env, g.id, kini);
  }
}
const menungguMilik = async (env, mkId) => (await mkAnggotaMenungguMilik(env, mkId)).map(x => x.wilayah);

/* ---------------- sesi akun umum ---------------- */
export {sesiMasuk};   // pembacanya ada di masuk_sesi.js
const samar = wa => "x".repeat(Math.max(0, wa.length - 4)) + wa.slice(-4);   // nomor tidak pernah tampil terang

/* ---------------- ruang: akun peran yang terikat langsung ke nomor terbukti (ALGORITMA 3) ---------------- */
const MODUL = () => ({instansi: {buat: sesiInstansi, cabut: cabutInstansi}, pendataan: {buat: sesiPendataan, cabut: cabutPendataan}, kemitraan: {buat: sesiKampus, cabut: cabutKampus}, pemirsa: {buat: sesiPemirsa, cabut: cabutPemirsa}});   // dibuat saat dipanggil: aman dari siklus impor
const JENIS_INSTANSI = {pemprov: "Pemerintah provinsi", pemkab: "Pemerintah kabupaten", pemkot: "Pemerintah kota", polda: "Polda", polres: "Polres", kodam: "Kodam", kodim: "Kodim"};
/* satu nama cookie per jenis: bila nomor terikat ke lebih dari satu akun sejenis, tidak ada sesi otomatis; tiap baris membawa `pilih` (id akun) dan perlu_pilih */
const tandaiPilih = ruang => {
  const n = {}; for (const e of ruang) if (e._s) n[e._s[0]] = (n[e._s[0]] || 0) + 1;
  return ruang.map(e => e._s && n[e._s[0]] > 1 ? {...e, pilih: e._s[2], perlu_pilih: true} : e);
};
const bersihRuang = ({_s, ...e}) => e;   // _s = [modul, tabel, akun id] hanya untuk server; `pilih` (id staf) tetap karena klien memilih akun staf lewat itu
async function cariRuang(env, nomor) {
  const p = await mkRuangPeran(env, nomor, K.AKUN_PER_JENIS), ruang = [];
  const tambah = (jenis, nama_ruang, lembaga, wilayah, ke, butuh_sandi, _s, tambahan = {}) => ruang.push({jenis, nama_ruang, lembaga, wilayah, ke, butuh_sandi, ...tambahan, _s});
  for (const a of p.instansi) tambah("instansi", "Ruang instansi", JENIS_INSTANSI[a.jenis] ?? a.jenis, a.wilayah, "/instansi", false, ["instansi", "instansi_akun", a.id]);
  for (const a of p.pendataan) tambah("pendataan", "Pendataan Satu Data", a.unit_lain ?? a.unit, null, "/pendataan", false, ["pendataan", "pdt_akun", a.id]);
  for (const a of p.kemitraan) tambah("kemitraan", "Kemitraan kampus", a.lembaga, null, "/kemitraan", false, ["kemitraan", "km_akun", a.id]);
  for (const a of p.pemirsa) {
    let tab = []; try { tab = JSON.parse(a.tab); } catch (e) {}
    tambah("pemirsa", "Pantauan", a.nama, null, arahPemirsa({tab}, "/") ?? "/", false, ["pemirsa", "pemirsa", a.id]);
  }
  for (const a of p.staf) tambah("staf", "Panel staf BNPB", "BNPB", null, "/admin/pantau", true, null, {pilih: a.id});   // tanpa sesi: butuh sandi (D8)
  /* relawan dan petugas: tanpa cookie baru (DESAIN-TEKNIS 4.3); tepat satu baris, yang lain tidak dibuka */
  try {
    const o = await mkOrangDariWa(env, nomor), r = await mkRelawanDariWa(env, nomor, STATUS_RELAWAN_ARR);
    if (r.length === 1) tambah("relawan", "Relawan", "Relawan", r[0].kab, "/relawan/saya", false, null);
    if (o.length === 1 || o.length === 0 && r.length === 1) tambah("petugas", "Petugas lapangan", o[0]?.unit ?? "Lapangan", o[0]?.kab ?? r[0]?.kab ?? null, "/petugas", false, null);
  } catch (e) { if (!/no such table/i.test(String(e?.message || e))) throw e; }
  return {ruang};
}

/* saluran kode: WA hidup bila gerbang berdenyut dalam DENYUT_MATI, email bila pengirimnya terkonfigurasi; tanpa data pribadi */
async function saluran(env, kini) {
  const d = await mkDenyutBaca(env);
  return {wa: d != null && kini - d <= K.DENYUT_MATI, email: emailAktif(env)};
}
/* cache tepi 15 detik (cacheTepi, kunci tanpa query): tanpanya tiap permintaan membaca D1 dan header cache-control tidak berlaku di jalur ini */
const saluranPublik = (env, req, url, kini, ctx) => cacheTepi(req, ctx, 15, async () => json(await saluran(env, kini)), true);
async function saya(env, req, url, kini) {
  const tamu = () => url.searchParams.get("lunak") === "1" ? json({masuk: false}) : gagal(401, "belum masuk");
  if (!tokenDari(req)) return tamu();   // tanpa cookie berbentuk sah: tanpa laju dan tanpa D1 sama sekali
  const ip = await batas(env, await ipHash(env, req), "masuk.saya_ip", K.LAJU_IP_SAYA, kini); if (ip) return ip;   // sebelum sesiMasuk, juga untuk ?lunak=1
  const s = await sesiMasuk(env, req, kini);
  if (!s) return tamu();   // ?lunak=1: pemeriksaan diam-diam dari halaman lain (tanpa galat 401 di konsol)
  const ruang = tandaiPilih((await cariRuang(env, s.wa)).ruang), baru = kini - s.kode_pada <= K.BARU_KODE;
  /* aksi yang butuh kode baru (atur sandi, hapus akun): daftar akun yang boleh diatur sandinya dan jumlah keanggotaan yang ikut hilang saat akun dihapus */
  let sandi = [], anggotaN = 0;
  if (baru) {
    const milik = await mkAkunSaya(env, s.id, s.wa, K.AKUN_PER_JENIS);
    sandi = [...ruang.filter(e => e._s && (e._s[0] === "pendataan" || e._s[0] === "kemitraan")).map(e => ({jenis: e._s[0], pilih: e._s[2], lembaga: e.lembaga})),
      ...milik.filter(x => x.pemilik).map(x => ({jenis: "instansi", pilih: x.id, lembaga: x.wilayah}))];
    anggotaN = milik.filter(x => !x.pemilik).length;
  }
  return json({akun: {id: s.id, wa: samar(s.wa), nama: s.nama, prov: s.prov, kab: s.kab, lengkap: s.setuju_pdp > 0}, baru_kode: baru, ruang: ruang.map(bersihRuang), menunggu: await menungguMilik(env, s.id),
    ...(baru ? {sandi, anggota_n: anggotaN} : {}), saluran: await saluran(env, kini)});
}
/* cabut sesi akun umum peramban ini dan tiap sesi peran; mengembalikan cookie penghapus (instansi: dua Path). sesi_admin tidak disentuh. */
async function cabutPeramban(env, req) {
  const t = tokenDari(req);
  if (t) await mkCabutSesi(env, await sha(t));
  const kuki = [kukiSesi("", 0)];
  for (const cabut of [...Object.values(MODUL()).map(m => m.cabut), cabutStaf]) {
    try { kuki.push(...await cabut(env, req)); } catch (e) { if (!/no such table/i.test(String(e?.message || e))) throw e; }
  }
  return kuki;
}
async function keluar(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const x = await batas(env, await ipHash(env, req), "masuk.keluar_ip", K.LAJU_IP_KELUAR, kini); if (x) return x;
  const r = json({ok: true});
  for (const c of await cabutPeramban(env, req)) r.headers.append("set-cookie", c);
  return r;
}

/* ---------------- lengkapi profil akun umum (PM-08, ALUR A4): nama, wilayah, persetujuan pemrosesan data ---------------- */
const teksPendek = (v, maks, nama) => {
  if (typeof v !== "string") return {galat: nama + " wajib diisi"};
  const r = bersihTeks(v.trim(), maks); if (r.galat) return {galat: nama + ": " + r.galat};
  if (r.teks.length < 2 || /\[(?:tautan|nomor) dihapus\]/.test(r.teks)) return {galat: nama + " tidak sah (2 sampai " + maks + " huruf, tanpa tautan atau nomor)"};
  return r;
};
async function lengkapi(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.lengkapi_ip", K.LAJU_IP_LENGKAPI, kini); if (ip) return ip;
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.setuju !== true) return gagal(400, "persetujuan pemrosesan data wajib dicentang");
  const nama = teksPendek(b.o.nama, K.NAMA_MAKS, "nama"); if (nama.galat) return gagal(400, nama.galat);
  const kab = teksPendek(b.o.kab, K.KAB_MAKS, "kabupaten atau kota"); if (kab.galat) return gagal(400, kab.galat);
  if (typeof b.o.prov !== "string" || !PROV.has(b.o.prov)) return gagal(400, "provinsi tidak sah");
  await mkLengkapi(env, s.id, nama.teks, b.o.prov, kab.teks, kini);
  return json({ok: true, lengkap: true});
}

/* ---------------- pilih akun peran (ALUR A3 "Ganti ruang"): sesi satu akun, dihitung ulang dari nomor sesi ---------------- */
async function pilihAkun(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.pilih_ip", K.LAJU_IP_PILIH, kini); if (ip) return ip;
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const jenis = typeof b.o.jenis === "string" ? b.o.jenis : "", pilih = typeof b.o.pilih === "string" ? b.o.pilih : "", modul = Object.hasOwn(MODUL(), jenis) ? MODUL()[jenis] : null;
  if (!modul || !/^[0-9a-f]{16}$/.test(pilih)) return gagal(400, "jenis atau pilih tidak sah");
  const e = (await cariRuang(env, s.wa)).ruang.find(x => x._s && x._s[0] === jenis && x._s[2] === pilih);
  if (!e) return gagal(403, "akun itu tidak terikat ke nomormu");
  try { await modul.cabut(env, req); } catch (x) { if (!/no such table/i.test(String(x?.message || x))) throw x; }   // sesi jenis yang sama di peramban ini diganti
  const c = await modul.buat(env, pilih, kini); if (!c) return gagal(403, "akun itu tidak aktif");
  await mkLogMasuk(env, [{id: acak(8), tabel: e._s[1], akun_id: pilih}], s.id, kini);
  const r = json({ok: true, ke: e.ke});
  for (const k of c) r.headers.append("set-cookie", k);
  return r;
}

/* ---------------- sandi staf sesudah kode (PM-07, D8) ---------------- */
async function sandiStaf(env, req, url, kini) {
  if (!kunciSah(env)) return gagal(503, "masuk lewat kode belum dikonfigurasi");
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.sandi_ip", K.LAJU_IP_SANDI, kini); if (ip) return ip;   // sebelum sesiMasuk: cookie palsu tidak membebani D1
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  if (kini - s.kode_pada > K.BARU_KODE) return gagal(403, "masuk dengan kode lagi dulu (kode sudah lebih dari 15 menit)");
  const ak = await batas(env, s.id, "masuk.sandi_akun", K.LAJU_AKUN_SANDI, kini); if (ak) return ak;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const sandi = typeof b.o.sandi === "string" ? b.o.sandi.slice(0, 100) : "";
  if (!sandi) return gagal(400, "sandi wajib diisi");
  /* akun staf hanya yang nomornya = nomor sesi; klien memilih lewat id dari daftar ruang, tidak pernah mengetik username */
  const daftar = await mkStafPerWa(env, s.wa, K.AKUN_PER_JENIS);
  if (!daftar.length) return gagal(403, "tidak ada akun staf untuk nomor ini");
  const pilih = b.o.staf == null ? null : String(b.o.staf), st = pilih == null ? (daftar.length === 1 ? daftar[0] : null) : daftar.find(x => x.id === pilih);
  if (!st) return gagal(400, daftar.length > 1 || pilih != null ? "pilih salah satu akun staf dari daftar ruang" : "akun staf tidak ditemukan");
  const m = await cobaMasukStaf(env, req, st.username, sandi, kini);   // penguncian dan hitungan gagal ikut aturan staf; sandi benar saja yang menerbitkan sesi_staf
  if (m.hasil === "kunci") return gagal(429, "terlalu banyak percobaan masuk yang salah; coba lagi sejam lagi", {"retry-after": "3600"});
  if (m.hasil !== "ok") return gagal(401, "sandi salah");
  await mkLogMasuk(env, [{id: acak(8), tabel: "staf", akun_id: st.id}], s.id, kini);
  const peran = m.staf.peran || [], ke = m.staf.wajib_ganti ? "/admin/pantau" : hanyaDirektori(peran) ? "/direktori" : peran.length === 1 && peran[0] === "operator_cc" ? "/" : "/admin/pantau";
  const r = json({ok: true, ke, wajib_ganti: !!m.staf.wajib_ganti}); r.headers.append("set-cookie", m.cookie); return r;
}

/* ---------------- atur sandi sesudah kode (PM-13, ALUR A7): pendataan, kampus, dan instansi (hanya pemilik nomor akun); tidak pernah staf, pemirsa, atau akun rahasia ---------------- */
const SANDI_MODUL = {instansi: sandiInstansi, pendataan: sandiPendataan, kemitraan: sandiKampus};
async function sandiCalon(env, s, jenis) {   // akun yang boleh diatur sandinya oleh nomor sesi ini, dihitung di server dari nomor sesi
  if (jenis === "instansi") return (await mkAkunSaya(env, s.id, s.wa, K.AKUN_PER_JENIS)).filter(x => x.pemilik).map(x => x.id);
  const p = await mkRuangPeran(env, s.wa, K.AKUN_PER_JENIS);
  return (jenis === "pendataan" ? p.pendataan : p.kemitraan).map(x => x.id);
}
async function sandiBaru(env, req, url, kini) {
  if (!kunciSah(env)) return gagal(503, "masuk lewat kode belum dikonfigurasi");
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.sandi_baru_ip", K.LAJU_IP_SANDI_BARU, kini); if (ip) return ip;   // sebelum sesiMasuk: cookie palsu tidak membebani D1
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  if (kini - s.kode_pada > K.BARU_KODE) return gagal(403, "masuk dengan kode lagi dulu (kode sudah lebih dari 15 menit)");
  const ak = await batas(env, s.id, "masuk.sandi_baru_akun", K.LAJU_AKUN_SANDI_BARU, kini); if (ak) return ak;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const jenis = typeof b.o.jenis === "string" ? b.o.jenis : "";
  if (!Object.hasOwn(SANDI_MODUL, jenis)) return gagal(400, "jenis harus instansi, pendataan, atau kemitraan");
  const calon = await sandiCalon(env, s, jenis);
  if (!calon.length) return gagal(403, "tidak ada akun itu yang bisa diatur sandinya dari nomormu");
  const pilih = b.o.pilih == null ? null : String(b.o.pilih), id = pilih == null ? (calon.length === 1 ? calon[0] : null) : calon.find(x => x === pilih);
  if (!id) return gagal(pilih == null ? 400 : 403, pilih == null ? "pilih salah satu akun dari daftar" : "akun itu tidak terikat ke nomormu");
  const h = await SANDI_MODUL[jenis](env, id, typeof b.o.sandi === "string" ? b.o.sandi : null, kini);   // format hash dan panjang minimum: aturan modul itu
  if (h.galat) return gagal(400, h.galat);
  return json({ok: true, ...(h.sandi ? {sandi: h.sandi} : {})});   // sandi acak instansi tampil sekali, tidak disimpan di sini
}

/* ---------------- hapus akun umum (PM-14, ALUR A10): akun lembaga tidak terhapus ---------------- */
async function hapusAkun(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.hapus_ip", K.LAJU_IP_HAPUS, kini); if (ip) return ip;
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  if (kini - s.kode_pada > K.BARU_KODE) return gagal(403, "masuk dengan kode lagi dulu (kode sudah lebih dari 15 menit)");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.yakin !== true) return gagal(400, "konfirmasi penghapusan wajib (yakin: true)");
  await mkHapusAkun(env, s.id);   // undangan berstatus 'diterima' buatan akun ini dibiarkan: anggota yang diundangnya tetap aktif
  const r = json({ok: true});
  for (const c of await cabutPeramban(env, req)) r.headers.append("set-cookie", c);
  return r;
}

/* ---------------- kode lewat email (PM-16, ALGORITMA §2.4, ALUR A8): publik, jawaban SELALU sama ---------------- */
async function kodeEmail(env, req, url, kini, ctx) {
  if (!kunciSah(env) || !env.TURNSTILE_SECRET || !env.TURNSTILE_SITEKEY) return gagal(503, "masuk lewat kode belum dikonfigurasi");
  if (!emailAktif(env)) return gagal(503, "kode lewat email belum aktif");
  const g = penjaga(req, url); if (g) return g;
  if (!req.headers.get("cf-connecting-ip")) return gagal(403, "alamat jaringan tidak terbaca");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const nomor = normalWA(b.o.wa); if (!nomor) return galatNomor();
  const email = typeof b.o.email === "string" ? b.o.email.trim().toLowerCase() : "";
  if (email.length > 254 || !RE_EMAIL.test(email) || /[^\x21-\x7e]/.test(email)) return gagal(400, "alamat email tidak sah");   // bentuk saja; tidak bergantung pada akun
  const ip = await batas(env, await ipHash(env, req), "masuk.kode_email_ip", K.LAJU_IP_KODE_EMAIL, kini); if (ip) return ip;   // sebelum siteverify
  if (!(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const nsha = await hmac(env.MASUK_KUNCI, "wa|" + nomor);
  const n = await batas(env, nsha, "masuk.kode_email_nomor", K.LAJU_NOMOR_KODE_EMAIL, kini); if (n) return n;   // dihitung untuk SEMUA permintaan, cocok atau tidak
  const gl = await batas(env, "global", "masuk.kode_email_global", K.LAJU_GLOBAL_KODE_EMAIL, kini, "sedang ramai, coba beberapa menit lagi"); if (gl) return gl;
  /* kerja yang sama untuk alamat cocok dan tidak: satu pencarian, satu tulis mk_kode (alamat tak cocok = baris yang sudah hangus), email dikirim di latar supaya waktu jawab tidak membocorkan */
  const cocok = await mkEmailAkunCocok(env, nomor, email), kode = kodeAcak(), id = acak(8);
  await mkKodeEmailAkun(env, id, nsha, await hmac(env.MASUK_KUNCI, nomor + "|" + kode), kini, cocok.length ? kini + K.KODE_UMUR : kini, cocok);   // kode terikat ke akun yang cocok (D21)
  if (cocok.length) {
    const teks = `Kode masuk Centurisk97: ${kode}. Berlaku ${K.KODE_UMUR / 60e3} menit. Jangan berikan kode ini kepada siapa pun.`;
    const kirim = kirimEmail(env, email, {subject: "Kode masuk Centurisk97", text: teks, html: `<p>${teks}</p>`}).catch(() => mkHanguskan(env, id, kini).catch(() => {}));   // gagal kirim: kode dihanguskan, jawaban tetap sama
    if (ctx?.waitUntil) ctx.waitUntil(kirim); else await kirim;
  }
  return json({ok: true, tunggu: K.JEDA_KIRIM / 1000});
}

/* ---------------- nomor pemirsa, hanya Super Admin (D17) ---------------- */
async function pemirsaWa(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.pemirsa_wa_ip", K.LAJU_IP_PEMIRSA_WA, kini); if (ip) return ip;
  const oleh = await superOK(env, req); if (!oleh) return gagal(403, "nomor pemirsa hanya diatur Super Admin");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const id = typeof b.o.pemirsa_id === "string" ? b.o.pemirsa_id : "";
  if (!/^[0-9a-f]{16}$/.test(id)) return gagal(400, "pemirsa_id tidak sah");
  const wa = b.o.wa == null ? null : normalWA(b.o.wa);
  if (b.o.wa != null && !wa) return galatNomor();
  if (!await mkPemirsaAda(env, id)) return gagal(404, "akun pemirsa tidak ada");
  try { await mkPemirsaWaSet(env, id, wa, String(oleh).slice(0, 40), kini); }
  catch (e) { if (/UNIQUE/i.test(String(e?.message || e))) return gagal(409, "nomor itu sudah dipakai akun pemirsa lain"); throw e; }
  return json({ok: true, pemirsa_id: id, wa: wa ? samar(wa) : null});
}

/* ---------------- halaman (PM-05): public/masuk.html milik PM-08; sebelum itu halaman sementara tanpa data ---------------- */
const CSP_MASUK = "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const halSementara = '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Masuk</title><body><h1>Masuk</h1><p>Masuk lewat kode WhatsApp belum tersedia di halaman ini. Gunakan <a href="/admin/masuk">masuk dengan sandi</a>.</p></body></html>';
async function halamanMasuk(env, req, url) {
  const a = await env.ASSETS.fetch(new Request(new URL("/masuk.html", url)));
  const h = {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": CSP_MASUK};
  if (!a.ok) { a.body?.cancel(); return new Response(halSementara, {headers: h}); }
  return new Response(a.body, {headers: h});
}

export const RUTE_MASUK = {
  "GET /masuk": halamanMasuk,   // publik (K8, PUBLIK_TANPA_SESI); sesi dicek di API
  "POST /api/masuk/kode": tabelBelum(mintaKode),
  "POST /api/masuk/periksa": tabelBelum(periksaKode),
  "GET /api/masuk/saya": tabelBelum(saya),
  "POST /api/masuk/sandi": tabelBelum(sandiStaf),
  "POST /api/masuk/lengkapi": tabelBelum(lengkapi),
  "POST /api/masuk/pilih": tabelBelum(pilihAkun),
  "POST /api/masuk/sandi_baru": tabelBelum(sandiBaru),   // bawaan rancangan `atur-sandi`; garis tengah tidak terbaca gerbang cakupan
  "POST /api/masuk/hapus": tabelBelum(hapusAkun),
  "POST /api/masuk/kode_email": tabelBelum(kodeEmail),
  "POST /api/masuk/pemirsa_wa": tabelBelum(pemirsaWa),   // bawaan rancangan `pemirsa-wa`; garis tengah tidak terbaca gerbang cakupan (regex [\\w/:])
  "GET /api/masuk/saluran": saluranPublik,   // tanpa sesi; tabel belum ada = wa false
  "POST /api/masuk/keluar": tabelBelum(keluar),
};
export {tabelBelum, kunciSah, penjaga, batas, hmac, samaWaktu, kodeAcak, galatKode, galatNomor, reKode, samar, cariRuang};   // dipakai src/masuk_undang.js
