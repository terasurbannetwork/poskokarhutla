/* Satu Pintu Masuk, tiket PM-09 sampai PM-12 (data/kajian-bnpb/pintu-masuk/: ALGORITMA §4, §5, §8, ALUR A5, A6, A9, KEAMANAN-PRIVASI §1):
   permohonan anggota dan aktif otomatis (undangan, kontak pemangku), email dinas terpetakan, undangan berantai, daftar dan cabut anggota, antrean tinjau, papan aktivasi.
   Semua SQL di hak.js (gerbang d1), semua ambang di masuk_konst.js (G-6). Modul ini TIDAK PERNAH menulis instansi_akun, staf, atau tabel sesi modul lain (G-7):
   sesi instansi lewat sesiUntuk/cabutSemuaSesi milik instansi.js, pendataan tidak pernah diubah dari sini (D19). Tidak ada rute yang menerbitkan sesi staf atau sesi admin.
   Nomor di jawaban API selalu tersamar kecuali empat angka terakhir; isi pesan undangan = templat tetap + nama lembaga dari basis data. */
import {json, gagal, acak, bacaBody, bersihTeks, normalWA, ipHash} from "./worker.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb, HALAMAN_STAF} from "./admin_halaman.js";
import {stafPeran, dalamWilayahStaf, dariStaf, wilayahStaf} from "./staf.js";
import {modOK, RE_EMAIL} from "./posko.js";
import {emailAktif} from "./ews.js";
import {kirimEmail} from "./keluar.js";
import {adaPemda} from "./profil_konst.js";
import {bakuKab} from "./lapor_meja_hak.js";
import {cabutSemuaSesi, PROV as PROV_INSTANSI} from "./instansi.js";
import {mkInstansiById, mkAkunPilihan, mkUndangBerlaku, mkKontakCocok, mkAnggotaCari, mkMenungguHitung, mkAnggotaTulis, mkJedaTerakhir, mkHanguskan, mkKodeEmailBaru,
  mkDomainCocok, mkDomainTulis, mkDomainHapus, mkAnggotaMenunggu, mkAnggotaAkun, mkAnggotaById, mkAnggotaSetujui, mkAnggotaCabut, mkAkunSaya, mkUndangHitung, mkSudahAnggota, mkUndangAda,
  mkUndangBaru, mkUndangDaftar, mkUndangById, mkUndangCabut, mkKontakById, mkPapanHitung, mkPapanRinci, mkUndangNomorHitung, mkUndangCabutOleh, pfPapanAkun, pfAkunWilayah, pfAkunPemdaById, pfProfilRinci, pfKontakBpbd, pfUndangAntre} from "./hak.js";
import {sesiMasuk} from "./masuk_sesi.js";
import {tandaInstansi} from "./masuk_tanda.js";
import {tabelBelum, kunciSah, penjaga, batas, hmac, kodeAcak, galatKode, galatNomor, reKode, samar, cocokKode} from "./masuk.js";
import * as K from "./masuk_konst.js";

const reId = /^[0-9a-f]{16}$/;
const jsonCakupan = s => { try { return JSON.parse(s || "[]"); } catch (e) { return []; } };
const KATEGORI_SEMUA = [...new Set(Object.values(K.PETA_KATEGORI).flat())];
const IKUT = "/instansi";

/* ---------------- daftar wilayah (kunci sama dengan instansi_akun.prov dan .kab: public/banjir/data/pusat_kec.json) ---------------- */
let KAB = null;
async function daftarKab(env) {
  if (KAB) return KAB;
  const r = await env.ASSETS.fetch(new Request("https://aset.lokal/banjir/data/pusat_kec.json"));
  if (!r.ok) { r.body?.cancel(); throw new Error("pusat_kec.json " + r.status); }
  const per = new Map();
  for (const kunci of Object.keys(await r.json())) {
    const [p, k] = kunci.split("|");
    if (!Object.hasOwn(PROV_INSTANSI, p) || !k || k.length < 2 || k === "None") continue;   // sama dengan susunDefs() instansi.js
    if (!per.has(p)) per.set(p, new Set());
    per.get(p).add(k);
  }
  KAB = new Map([...per].sort().map(([p, s]) => [p, [...s].sort((a, b) => a.localeCompare(b, "id"))]));
  return KAB;
}
const wilayahGalat = () => gagal(503, "daftar wilayah belum tersedia");

/* ---------------- siapa yang memanggil ---------------- */
/* sesi akun umum (cookie sesi_masuk, Path=/) dan/atau staf atau admin. Pemilik nomor akun dan anggota dikenali dari NOMOR sesi akun umum (sama dengan cariRuang PM-06), bukan dari cookie instansi:
   cookie itu hanya terkirim ke /instansi dan /api/instansi, tidak ke /api/masuk/*. */
async function pelaku(env, req, kini) {
  const s = await sesiMasuk(env, req, kini);
  const {mod, admin} = await hakStaf(env, req);
  return {s, mod, staf: !admin && !!mod, admin};
}
/* admin = modOK (tegas; akun gerbang situs dan identitas pemirsa tidak termasuk), staf = peran aktivasi; mod = identitas pelaku atau null */
async function hakStaf(env, req) {
  const a = await modOK(env, req);
  return {mod: a || await stafPeran(env, req, K.PERAN_AKTIVASI), admin: !!a};
}
const olehStaf = mod => dariStaf(mod) ? {tabel: "staf", id: String(mod).slice(5)} : {tabel: "admin", id: String(mod)};
const labelOleh = (p, milik) => milik ? "pemilik:" + p.s.id : p.mod ? String(p.mod) : "?";
/* hak melihat atau mengundang untuk satu akun: pemilik/anggota (dari nomor sesi) atau staf dalam wilayah hak stafnya atau admin */
async function hakAkun(env, req, p, akunId) {
  const milik = p.s ? await mkAkunSaya(env, p.s.id, p.s.wa, K.AKUN_PER_JENIS) : [];
  const sendiri = milik.find(x => x.id === akunId);
  if (sendiri) return {akun: sendiri, milik: true, pemilik: !!sendiri.pemilik};
  if (!p.mod) return null;
  const a = await mkInstansiById(env, akunId);
  if (!a || a.status !== "aktif" || !dalamWilayahStaf(req, jsonCakupan(a.cakupan))) return null;
  return {akun: a, milik: false, pemilik: false};
}

/* ---------------- GET /api/masuk/akun: akun instansi aktif untuk dipilih pemohon (ALUR A5) ---------------- */
async function akunPilihan(env, req, url, kini) {
  const ip = await batas(env, await ipHash(env, req), "masuk.akun_ip", K.LAJU_IP_AKUN, kini); if (ip) return ip;
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  const prov = url.searchParams.get("prov") || "", kab = url.searchParams.get("kab") || "", rumpun = url.searchParams.get("rumpun") || "";
  if (!Object.hasOwn(PROV_INSTANSI, prov)) return gagal(400, "provinsi tidak sah");
  if (!Object.hasOwn(K.RUMPUN, rumpun)) return gagal(400, "rumpun harus pemda atau aparat");
  let daftar; try { daftar = (await daftarKab(env)).get(prov) || []; } catch (e) { return wilayahGalat(); }
  if (kab && !daftar.includes(kab)) return gagal(400, "kabupaten atau kota tidak sah");
  const akun = await mkAkunPilihan(env, K.RUMPUN[rumpun], prov, kab);
  /* kab_ada_akun false = layar mengarahkan ke verifikasi akun instansi yang ada (/instansi); akun tingkat provinsi tetap ditawarkan */
  return json({kab: daftar, akun: akun.map(a => ({id: a.id, jenis: a.jenis, lembaga: a.wilayah, tingkat: a.tingkat})), kab_ada_akun: !!kab && akun.some(a => a.tingkat === "kab")});
}

/* ---------------- POST /api/masuk/mohon: jadi anggota akun lembaga (ALGORITMA §4) ---------------- */
async function jalurBukti(env, nomor, a, kini) {
  const u = await mkUndangBerlaku(env, nomor, a.id, kini);
  if (u) return {jalur: "undang", rujukan: "undang:" + u.id, oleh: u.oleh_tabel + ":" + u.oleh_id, undangId: u.id};
  const kategori = K.PETA_KATEGORI[a.jenis];
  const k = kategori ? await mkKontakCocok(env, nomor, kategori, a) : null;
  return k ? {jalur: "kontak", rujukan: "kontak:" + k.id, oleh: null, undangId: null} : null;
}
/* K25 (pemilik 26 Nov 2026, "Cabut dari login saja"): keanggotaan tetap dicatat, tetapi kode WA tidak menerbitkan sesi instansi; anggota masuk lewat sandi di /masuk */
async function sesiAnggota(env, s, a, kini, ekstra) {
  if (a.status !== "aktif") return gagal(403, "akun lembaga itu tidak aktif");
  return json({ok: true, status: "aktif", ke: "/masuk?ke=" + encodeURIComponent(IKUT), ...ekstra});
}
async function mohon(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.mohon_ip", K.LAJU_IP_MOHON, kini); if (ip) return ip;
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.jenis !== "instansi" || typeof b.o.akun_id !== "string" || !reId.test(b.o.akun_id)) return gagal(400, "jenis harus instansi dan akun_id 16 heks");
  const a = await mkInstansiById(env, b.o.akun_id);
  if (!a || a.status === "dicabut") return gagal(404, "akun lembaga itu tidak ada");
  if (adaPemda(a.jenis)) return gagal(403, "akun BPBD masuk lewat halaman /instansi dengan username, sandi, profil, dan PIN");   // Q1: pintu kode WA ditutup untuk akun pemda
  if (a.status === "aktif" && a.wa === s.wa) return sesiAnggota(env, s, a, kini, {jalur: "pemilik"});   // nomor akunnya sendiri: tidak perlu baris anggota
  const ada = await mkAnggotaCari(env, s.id, a.id);
  if (ada?.status === "dicabut") return gagal(403, "keanggotaanmu di akun ini dicabut");
  if (ada?.status === "aktif") return sesiAnggota(env, s, a, kini, {jalur: ada.jalur});
  const bukti = a.status === "aktif" ? await jalurBukti(env, s.wa, a, kini) : null;   // akun yang belum aktif tidak bisa dimasuki: permohonan hanya menunggu
  if (!ada && !bukti && await mkMenungguHitung(env, s.id) >= K.MOHON_MENUNGGU_MAKS) return gagal(429, "terlalu banyak permohonan yang masih menunggu pemeriksaan");
  const r = await mkAnggotaTulis(env, acak(8), s.id, a.id, bukti ? "aktif" : "menunggu", bukti?.jalur ?? "tinjau", bukti?.rujukan ?? "mohon", bukti?.oleh ?? null, bukti?.undangId ?? null, kini);
  if (r.status === "aktif") return sesiAnggota(env, s, a, kini, {jalur: r.jalur});
  return json({ok: true, status: "menunggu", akun_aktif: a.status === "aktif"});
}

/* ---------------- email dinas terpetakan (PM-10, ALGORITMA 2.4 untuk bukti anggota) ---------------- */
const akhiranEmail = d => { const p = d.split("."); return p.map((_, i) => p.slice(i).join(".")).filter(x => x.includes(".") && !K.AKHIRAN_UMUM.includes(x)); };   // berbatas titik: xgo.id bukan akhiran go.id
async function emailKonteks(env, req, url, kini, ipAksi, ipBatas, b) {
  const g = penjaga(req, url); if (g) return {g};
  if (!kunciSah(env)) return {g: gagal(503, "masuk lewat kode belum dikonfigurasi")};
  if (!emailAktif(env)) return {g: gagal(503, "kode lewat email belum aktif")};
  if (!req.headers.get("cf-connecting-ip")) return {g: gagal(403, "alamat jaringan tidak terbaca")};
  const ip = await batas(env, await ipHash(env, req), ipAksi, ipBatas, kini); if (ip) return {g: ip};
  const s = await sesiMasuk(env, req, kini); if (!s) return {g: gagal(401, "belum masuk")};
  const x = await bacaBody(req, 1024); if (x.galat) return {g: gagal(x.status || 400, x.galat)};
  const email = typeof x.o.email === "string" ? x.o.email.trim().toLowerCase() : "";
  if (email.length > 254 || !RE_EMAIL.test(email) || /[^\x21-\x7e]/.test(email) || /(?:^|[.@])xn--/.test(email)) return {g: gagal(400, "alamat email tidak sah (huruf non-ASCII dan punycode ditolak)")};
  if (typeof x.o.akun_id !== "string" || !reId.test(x.o.akun_id)) return {g: gagal(400, "akun_id tidak sah")};
  const a = await mkInstansiById(env, x.o.akun_id);
  if (!a || a.status !== "aktif") return {g: gagal(404, "akun lembaga itu tidak ada atau belum aktif")};
  const domain = email.split("@")[1];
  if (!await mkDomainCocok(env, akhiranEmail(domain), a.id)) return {g: gagal(400, "alamat email itu bukan email dinas yang dipetakan ke lembaga ini")};   // .go.id atau .ac.id saja tidak pernah cukup
  const ada = await mkAnggotaCari(env, s.id, a.id);
  if (ada?.status === "dicabut") return {g: gagal(403, "keanggotaanmu di akun ini dicabut")};
  /* email tidak disimpan: hanya HMAC (orang, akun, alamat) sebagai kunci kode; kode di HMAC terpisah dari kunci nomor WA */
  return {s, a, email, domain, x: x.o, kunci: ["em", s.id, a.id, email].join("|")};
}
async function emailMinta(env, req, url, kini) {
  const k = await emailKonteks(env, req, url, kini, "masuk.email_ip", K.LAJU_IP_EMAIL); if (k.g) return k.g;
  const nsha = await hmac(env.MASUK_KUNCI, k.kunci);
  const d = await mkJedaTerakhir(env, nsha, kini - K.JEDA_KIRIM);
  if (d) return gagal(429, "tunggu sebentar sebelum meminta kode lagi", {"retry-after": String(Math.ceil((d + K.JEDA_KIRIM - kini) / 1000))});
  const n = await batas(env, nsha, "masuk.email_nomor", K.LAJU_NOMOR, kini); if (n) return n;
  const gl = await batas(env, "global", "masuk.email_global", K.LAJU_EMAIL_GLOBAL, kini, "sedang ramai, coba beberapa menit lagi"); if (gl) return gl;
  const kode = kodeAcak(), id = acak(8), menit = K.KODE_UMUR / 60e3;
  await mkKodeEmailBaru(env, id, nsha, await hmac(env.MASUK_KUNCI, k.kunci + "|" + kode), kini, kini + K.KODE_UMUR);
  const teks = `Kode masuk Centurisk97: ${kode}. Berlaku ${menit} menit. Jangan berikan kode ini kepada siapa pun.`;
  try { await kirimEmail(env, k.email, {subject: "Kode masuk Centurisk97", text: teks, html: `<p>${teks}</p>`}); }
  catch (e) { await mkHanguskan(env, id, kini); return gagal(502, "pengiriman email gagal; coba lagi nanti"); }
  return json({ok: true, tunggu: K.JEDA_KIRIM / 1000});
}
async function emailPeriksa(env, req, url, kini) {
  const k = await emailKonteks(env, req, url, kini, "masuk.email_periksa_ip", K.LAJU_IP_PERIKSA); if (k.g) return k.g;
  const kode = typeof k.x.kode === "string" ? k.x.kode.trim() : "";
  if (!reKode.test(kode)) return galatKode();
  const nsha = await hmac(env.MASUK_KUNCI, k.kunci);
  if (!await cocokKode(env, nsha, await hmac(env.MASUK_KUNCI, k.kunci + "|" + kode), kini, K.KODE_EMAIL_MAKS)) return galatKode();
  const sekarang = await mkAnggotaCari(env, k.s.id, k.a.id), akunNow = await mkInstansiById(env, k.a.id);   // keadaan bisa berubah sejak kode diminta
  if (sekarang?.status === "dicabut") return gagal(403, "keanggotaanmu di akun ini dicabut");
  if (!akunNow || akunNow.status !== "aktif") return gagal(409, "akun lembaga itu tidak lagi aktif");
  const r = await mkAnggotaTulis(env, acak(8), k.s.id, k.a.id, "aktif", "email", "email:" + k.domain, null, null, kini);   // aktif tidak ditimpa, dicabut sudah ditolak di emailKonteks
  return sesiAnggota(env, k.s, k.a, kini, {jalur: r.jalur});
}

/* peta domain: hanya admin (bukan akun gerbang situs); akhiran milik umum dan surel gratis tidak pernah dipetakan */
const reDomain = /^(?=.{4,120}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
async function domain(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.domain_ip", K.LAJU_IP_DOMAIN, kini); if (ip) return ip;
  const mod = await modOK(env, req); if (!mod) return gagal(403, "peta domain hanya diatur admin");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const d = typeof b.o.domain === "string" ? b.o.domain.trim().toLowerCase().replace(/^@/, "") : "";
  if (!reDomain.test(d)) return gagal(400, "domain tidak sah (contoh bpbd.kabupaten.go.id)");
  if (K.AKHIRAN_UMUM.includes(d) || K.SUREL_GRATIS.some(f => d === f || d.endsWith("." + f))) return gagal(400, "domain umum atau surel gratis tidak boleh dipetakan");
  if (typeof b.o.akun_id !== "string" || !reId.test(b.o.akun_id)) return gagal(400, "akun_id tidak sah");
  const a = await mkInstansiById(env, b.o.akun_id);
  if (!a || a.status !== "aktif") return gagal(404, "akun instansi itu tidak ada atau belum aktif");
  if (b.o.aksi === "hapus") return await mkDomainHapus(env, d, a.id) ? json({ok: true, domain: d, akun_id: a.id, dihapus: true}) : gagal(404, "pemetaan itu tidak ada");
  if (b.o.aksi !== "tambah") return gagal(400, "aksi harus tambah atau hapus");
  await mkDomainTulis(env, d, a.id, String(mod).slice(0, 40), kini);
  return json({ok: true, domain: d, akun_id: a.id}, 201);
}

/* ---------------- undangan berantai (PM-11, ALGORITMA §5) ---------------- */
const pesanUndang = lembaga => `Anda diundang bergabung ke ${lembaga} di Centurisk97. Masuk di https://centurisk97.id/masuk dengan nomor ini. Undangan berlaku ${Math.round(K.UNDANG_UMUR / 864e5)} hari.`;
async function undangBuat(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.undang_ip", K.LAJU_IP_UNDANG, kini); if (ip) return ip;
  const p = await pelaku(env, req, kini); if (!p.s && !p.mod) return gagal(401, "belum masuk");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const ke = b.o.ke == null || b.o.ke === "instansi" ? "instansi" : b.o.ke === "pendataan" ? "pendataan" : null;
  if (!ke) return gagal(400, "ke harus instansi atau pendataan");
  /* nomor dan nama: dari ketikan, atau dari kontak pemangku (hanya staf dan admin; nomor kontak tidak pernah tampil terang) */
  let nomor, nama = null;
  if (b.o.kontak_id != null) {
    if (!p.mod) return gagal(403, "undangan dari kontak pemangku hanya untuk staf dan admin");
    if (typeof b.o.kontak_id !== "string" || !reId.test(b.o.kontak_id)) return gagal(400, "kontak_id tidak sah");
    const kt = await mkKontakById(env, b.o.kontak_id); if (!kt || !kt.wa) return gagal(404, "kontak itu tidak ada");
    nomor = kt.wa; nama = kt.nama;
  } else {
    nomor = normalWA(b.o.wa); if (!nomor) return galatNomor();
    if (b.o.nama != null) { const n = bersihTeks(String(b.o.nama).trim(), 80); if (n.galat || n.teks.length < 2 || /\[(?:tautan|nomor) dihapus\]/.test(n.teks)) return gagal(400, "nama 2 sampai 80 huruf, tanpa tautan atau nomor"); nama = n.teks; }
  }
  if (nama && nama.length < 2) nama = null;
  let akun = null, oleh;
  if (ke === "pendataan") {
    if (!p.mod) return gagal(403, "undangan ke pendataan hanya dari staf atau admin");
    oleh = olehStaf(p.mod);
  } else {
    const id = b.o.akun_id == null ? null : b.o.akun_id;
    if (id != null && (typeof id !== "string" || !reId.test(id))) return gagal(400, "akun_id tidak sah");
    const milik = p.s ? await mkAkunSaya(env, p.s.id, p.s.wa, K.AKUN_PER_JENIS) : [];
    const sendiri = id ? milik.find(x => x.id === id) : milik.length === 1 ? milik[0] : null;
    if (sendiri) { akun = sendiri; oleh = {tabel: "mk_akun", id: p.s.id}; }
    else if (p.mod && id) {
      const x = await mkInstansiById(env, id);
      if (!x || x.status !== "aktif") return gagal(404, "akun lembaga itu tidak ada atau belum aktif");
      if (!dalamWilayahStaf(req, jsonCakupan(x.cakupan))) return gagal(403, "akun itu di luar wilayah haknya");
      akun = x; oleh = olehStaf(p.mod);
    } else if (!id && milik.length > 1) return gagal(400, "pilih akun_id: kamu terhubung ke lebih dari satu akun");
    else return gagal(403, "kamu bukan pemilik atau anggota akun itu");
  }
  if (adaPemda(akun?.jenis)) return gagal(409, "akun BPBD tidak memakai undangan; daftarkan PIC lewat halaman /instansi");
  if (p.s && nomor === p.s.wa) return gagal(400, "tidak bisa mengundang nomor sendiri");
  if (akun && await mkSudahAnggota(env, nomor, akun.id)) return gagal(409, "nomor itu sudah menjadi anggota akun ini");
  const tabel = ke === "pendataan" ? "pdt_akun" : "instansi_akun";
  if (await mkUndangAda(env, nomor, tabel, akun?.id ?? null, kini)) return gagal(409, "nomor itu sudah punya undangan yang masih berlaku");
  if (await mkUndangNomorHitung(env, nomor, kini - K.UNDANG_JENDELA) >= K.UNDANG_PER_NOMOR) return gagal(429, "Nomor ini belum bisa diundang sekarang. Coba lagi besok.");   // tanpa petunjuk tentang nomor itu
  const h = await mkUndangHitung(env, oleh.tabel, oleh.id, kini - K.UNDANG_JENDELA, kini);
  if (h.harian >= K.UNDANG_HARIAN) return gagal(429, "batas undangan hari ini sudah habis; coba lagi besok");
  if (h.terbuka >= K.UNDANG_TERBUKA) return gagal(429, "terlalu banyak undangan yang belum dijawab; tunggu atau cabut sebagian");
  const id = acak(8);
  await mkUndangBaru(env, {id, wa: nomor, nama, tabel, akun_id: akun?.id ?? null, oleh_tabel: oleh.tabel, oleh_id: oleh.id, umur: K.UNDANG_UMUR}, pesanUndang(akun ? akun.wilayah : "Pendataan Satu Data BNPB"), kini);
  return json({ok: true, id, wa: samar(nomor), status: "terkirim"}, 201);
}
async function undangDaftar(env, req, url, kini) {
  const ip = await batas(env, await ipHash(env, req), "masuk.baca_ip", K.LAJU_IP_BACA, kini); if (ip) return ip;
  const p = await pelaku(env, req, kini); if (!p.s && !p.mod) return gagal(401, "belum masuk");
  const ke = url.searchParams.get("ke") === "pendataan" ? "pendataan" : "instansi";
  let akunId = url.searchParams.get("akun_id") || null, milik = null;
  if (ke === "pendataan") { if (!p.mod) return gagal(403, "daftar undangan pendataan hanya untuk staf dan admin"); }
  else {
    if (akunId != null && !reId.test(akunId)) return gagal(400, "akun_id tidak sah");
    if (!akunId && p.s) { const m = await mkAkunSaya(env, p.s.id, p.s.wa, K.AKUN_PER_JENIS); if (m.length === 1) akunId = m[0].id; }
    if (!akunId) return gagal(400, "akun_id wajib");
    milik = await hakAkun(env, req, p, akunId); if (!milik) return gagal(403, "kamu bukan pemilik atau anggota akun itu");
  }
  const aku = p.s ? {tabel: "mk_akun", id: p.s.id} : p.mod ? olehStaf(p.mod) : null;
  const semua = !!p.mod || !!milik?.pemilik;   // anggota biasa hanya melihat undangan yang ia kirim sendiri: disaring di SQL sebelum LIMIT
  const lihat = await mkUndangDaftar(env, ke === "pendataan" ? "pdt_akun" : "instansi_akun", ke === "pendataan" ? null : akunId, K.DAFTAR_MAKS, semua ? null : aku?.tabel ?? "-", semua ? null : aku?.id ?? "-");
  return json({undangan: lihat.map(u => ({id: u.id, nama: u.nama, wa: samar(u.wa), status: u.status === "terkirim" && u.habis <= kini ? "habis" : u.status, dibuat: u.dibuat, habis: u.habis,
    milikku: !!aku && (aku.tabel === u.oleh_tabel && aku.id === u.oleh_id)})), boleh_cabut_semua: !!milik?.pemilik || p.admin});
}
async function undangCabut(env, req, url, kini, ctx, id) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.undang_ip", K.LAJU_IP_UNDANG, kini); if (ip) return ip;
  const p = await pelaku(env, req, kini); if (!p.s && !p.mod) return gagal(401, "belum masuk");
  const u = await mkUndangById(env, id); if (!u) return gagal(404, "undangan tidak ada");   // tidak boleh diakses dijawab sama (404)
  const aku = p.s ? {tabel: "mk_akun", id: p.s.id} : null, akuStaf = p.mod ? olehStaf(p.mod) : null;
  const milikku = (aku && aku.tabel === u.oleh_tabel && aku.id === u.oleh_id) || (akuStaf && akuStaf.tabel === u.oleh_tabel && akuStaf.id === u.oleh_id);
  let boleh = milikku || p.admin;
  if (!boleh && p.s && u.akun_id) boleh = (await mkAkunSaya(env, p.s.id, p.s.wa, K.AKUN_PER_JENIS)).some(x => x.id === u.akun_id && x.pemilik);
  if (!boleh) return gagal(404, "undangan tidak ada");
  return await mkUndangCabut(env, id) ? json({ok: true, id, status: "dicabut"}) : gagal(409, "undangan itu sudah tidak berstatus terkirim");
}

/* ---------------- anggota: daftar, cabut, antrean tinjau ---------------- */
async function anggotaDaftar(env, req, url, kini) {
  const ip = await batas(env, await ipHash(env, req), "masuk.baca_ip", K.LAJU_IP_BACA, kini); if (ip) return ip;
  const p = await pelaku(env, req, kini); if (!p.s && !p.admin) return gagal(p.mod ? 403 : 401, p.mod ? "daftar anggota hanya untuk pemilik nomor akun dan admin" : "belum masuk");
  let akunId = url.searchParams.get("akun_id") || null;
  if (akunId != null && !reId.test(akunId)) return gagal(400, "akun_id tidak sah");
  const milik = p.s ? await mkAkunSaya(env, p.s.id, p.s.wa, K.AKUN_PER_JENIS) : [];
  if (!akunId) { const sendiri = milik.filter(x => x.pemilik); if (sendiri.length === 1) akunId = sendiri[0].id; }
  if (!akunId) return gagal(400, "akun_id wajib");
  if (!p.admin && !milik.some(x => x.id === akunId && x.pemilik)) return gagal(403, "daftar anggota hanya untuk pemilik nomor akun dan admin");   // anggota biasa dan staf tidak
  return json({cabut_sesi_default: false, anggota: (await mkAnggotaAkun(env, akunId, K.DAFTAR_MAKS)).map(a => ({id: a.id, nama: a.nama, wa: samar(a.wa), status: a.status, jalur: a.jalur, dibuat: a.dibuat, terakhir_masuk: a.terakhir_masuk}))});
}
async function anggotaCabut(env, req, url, kini, ctx, id) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.undang_ip", K.LAJU_IP_UNDANG, kini); if (ip) return ip;
  const p = await pelaku(env, req, kini); if (!p.s && !p.admin) return gagal(p.mod ? 403 : 401, p.mod ? "mencabut anggota hanya untuk pemilik nomor akun dan admin" : "belum masuk");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const a = await mkAnggotaById(env, id), pemilik = !!a && !!p.s && !!a.akun_wa && a.akun_wa === p.s.wa && a.akun_status === "aktif";
  if (!a || (!p.admin && !pemilik)) return gagal(404, "anggota tidak ada");   // sama untuk id yang tidak ada dan yang tidak boleh diakses
  const sesi = b.o.cabut_sesi === true;
  /* sudah dicabut + cabut_sesi: pemanggil berhak tetap boleh memutus sesi akun itu (tombol "Putuskan semua sesi"); tanpa cabut_sesi tetap 409 */
  if (!await mkAnggotaCabut(env, id, "cabut:" + labelOleh(p, pemilik), kini) && !(a.status === "dicabut" && sesi)) return gagal(409, "anggota itu sudah dicabut");
  await mkUndangCabutOleh(env, "mk_akun", a.mk_id, a.akun_id);   // undangan sisa dari orang yang tak lagi berhak ikut mati
  /* anggota yang sudah dicabut tidak bisa mendapat sesi baru. Sesi instansi yang sudah terbit tidak mencatat orang, jadi hanya bisa dicabut untuk SEMUA pemegang akun itu (cabut_sesi) */
  if (sesi) await cabutSemuaSesi(env, a.akun_id);
  return json({ok: true, id, status: "dicabut", sesi_semua_dicabut: sesi, sesi_lama_masih_hidup: !sesi});
}
/* antrean anggota menunggu: admin semua, staf dalam wilayahnya, pemilik nomor akun untuk akunnya sendiri; tiap baris membawa tanda yang sama dengan antrean tinjau akun */
async function anggotaTinjau(env, req, url, kini) {
  const ip = await batas(env, await ipHash(env, req), "masuk.baca_ip", K.LAJU_IP_BACA, kini); if (ip) return ip;
  const p = await pelaku(env, req, kini); if (!p.s && !p.mod) return gagal(401, "belum masuk");
  const wil = p.staf ? wilayahStaf(req) : [];
  const akunId = url.searchParams.get("akun_id") || "";
  if (akunId && !reId.test(akunId)) return gagal(400, "akun_id tidak sah");
  const baris = await mkAnggotaMenunggu(env, K.DAFTAR_MAKS, p.admin || (p.staf && !wil.length), p.s?.wa ?? "", JSON.stringify(wil), akunId);   // hak dan akun_id disaring di SQL sebelum LIMIT
  const tanda = await tandaInstansi(env, baris);
  return json({anggota: baris.map((r, i) => ({id: r.id, akun_id: r.akun_id, nama: r.nama, wa: samar(r.wa), lembaga: r.wilayah, jenis: r.jenis, akun_aktif: r.akun_status === "aktif", dibuat: r.dibuat, cocok_kontak: tanda[i].cocok_kontak, nomor_terbukti: true}))});
}
async function anggotaPutus(env, req, url, kini, ctx, id) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.undang_ip", K.LAJU_IP_UNDANG, kini); if (ip) return ip;
  const p = await pelaku(env, req, kini); if (!p.s && !p.mod) return gagal(401, "belum masuk");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi !== "setujui" && b.o.aksi !== "tolak") return gagal(400, "aksi harus setujui atau tolak");
  const a = await mkAnggotaById(env, id), pemilik = !!a && !!p.s && !!a.akun_wa && a.akun_wa === p.s.wa && a.akun_status === "aktif";
  if (!a || (!p.admin && !pemilik && !(p.staf && dalamWilayahStaf(req, jsonCakupan(a.cakupan))))) return gagal(404, "anggota tidak ada");
  if (a.status !== "menunggu") return gagal(409, "anggota itu tidak berstatus menunggu");
  const oleh = "tinjau:" + labelOleh(p, pemilik);
  if (b.o.aksi === "setujui") {
    if (a.akun_status !== "aktif") return gagal(409, "akun lembaga itu belum aktif; verifikasi akunnya dulu");
    return await mkAnggotaSetujui(env, id, oleh, kini) ? json({ok: true, id, status: "aktif"}) : gagal(409, "anggota itu sudah diputus");
  }
  return await mkAnggotaCabut(env, id, oleh, kini) ? json({ok: true, id, status: "dicabut"}) : gagal(409, "anggota itu sudah diputus");
}

/* ---------------- papan aktivasi (PM-12, ALGORITMA §8) ---------------- */
const statusPapan = (r, kini) => !r.akun_aktif ? "belum_ada" : r.terakhir_masuk && kini - r.terakhir_masuk <= K.LAMA_TIDAK_MASUK ? "aktif" : r.undangan_terkirim > 0 && !r.anggota ? "diundang" : "lama";
/* PF-07 (profil-bpbd K11, ALGORITMA 12): baris papan = satu BPBD. 38 baris provinsi (kab null) di samping baris kab/kota; akun pemda memberi status, jumlah PIC, dan masuk terakhir
   dari instansi_profil. Tanpa akun pemda di baris itu, status lama (aparat, undangan) tetap dipakai. Tabel profil belum ada = kolom profil kosong, papan lama tetap jalan. */
const statusPemda = (a, kini) => a.status !== "aktif" ? a.status : a.pic_aktif < 3 ? "aktif_kurang" : a.terakhir && kini - a.terakhir <= K.LAMA_TIDAK_MASUK ? "aktif" : "lama";
async function hitungPapan(env, kini) {
  const [peta, d, pf] = await Promise.all([daftarKab(env), mkPapanHitung(env, kini, K.PAPAN_JENDELA_LOG, KATEGORI_SEMUA), pfPapanAkun(env).catch(e => { if (/no such table/i.test(String(e?.message))) return []; throw e; })]);
  const kolom = {pic: 0, pic_aktif: 0, status_akun: "belum_ada", menunggu: false, akun_id: null};
  const baris = new Map();
  for (const prov of Object.keys(PROV_INSTANSI)) baris.set(prov + "|", {prov, kab: null, tingkat: "prov", akun_aktif: 0, anggota: 0, terakhir_masuk: null, undangan_terkirim: 0, undangan_diterima: 0, kontak_belum: 0, ...kolom});
  for (const [prov, kabs] of peta) for (const kab of kabs) baris.set(prov + "|" + kab, {prov, kab, tingkat: "kab", akun_aktif: 0, anggota: 0, terakhir_masuk: null, undangan_terkirim: 0, undangan_diterima: 0, kontak_belum: 0, ...kolom});
  const isi = (larik, f) => { for (const r of larik) { const x = baris.get(r.prov + "|" + r.kab); if (x) f(x, r); } };
  isi(d.akun, (x, r) => { x.akun_aktif = r.n; });
  isi(d.anggota, (x, r) => { x.anggota = r.n; });
  isi(d.terakhir, (x, r) => { x.terakhir_masuk = r.n; });
  isi(d.undangan, (x, r) => { x.undangan_terkirim = r.terkirim ?? 0; x.undangan_diterima = r.diterima ?? 0; });
  isi(d.kontak, (x, r) => { x.kontak_belum = r.n; });
  const pemda = new Map();
  for (const a of pf) { const x = baris.get(a.tingkat === "kab" ? a.prov + "|" + a.kab : a.pv + "|"); if (!x) continue;
    pemda.set(x, a); x.akun_id = a.id; x.pic = a.pic; x.pic_aktif = a.pic_aktif; x.status_akun = a.status; x.menunggu = a.status === "menunggu" || a.pic_menunggu > 0;
    if (a.terakhir && a.terakhir > (x.terakhir_masuk ?? 0)) x.terakhir_masuk = a.terakhir; }
  const daftar = [...baris.values()].map(x => ({...x, prov_nama: PROV_INSTANSI[x.prov][1], status: pemda.has(x) ? statusPemda({...pemda.get(x), terakhir: x.terakhir_masuk}, kini) : statusPapan(x, kini)}));
  return {dibuat: kini, daftar};
}
/* cache tepi 5 menit untuk hitungan nasional. Pemeriksaan hak SELALU lebih dulu; kunci cache internal (bukan URL permintaan) dan jawaban keluar no-store,
   jadi tidak ada jalan untuk membaca hasil ini tanpa lolos hak staf. */
async function papanData(env, kini, ctx) {
  const c = globalThis.caches?.default, kunci = new Request("https://cache.lokal/masuk/aktivasi");
  if (c) { const ada = await c.match(kunci); if (ada) return ada.json(); }
  const d = await hitungPapan(env, kini);
  if (c) ctx?.waitUntil?.(c.put(kunci, new Response(JSON.stringify(d), {headers: {"content-type": "application/json", "cache-control": `max-age=${K.PAPAN_CACHE / 1000}`}})).catch(() => {}));
  return d;
}
async function aktivasi(env, req, url, kini, ctx) {
  const ip = await batas(env, await ipHash(env, req), "masuk.papan_ip", K.LAJU_IP_PAPAN, kini); if (ip) return ip;
  const {mod} = await hakStaf(env, req); if (!mod) return gagal(403, "papan aktivasi hanya untuk staf berwenang dan admin");
  const prov = url.searchParams.get("prov") || "", kab = url.searchParams.get("kab") || "";
  if (prov && !Object.hasOwn(PROV_INSTANSI, prov)) return gagal(400, "provinsi tidak sah");
  if (kab || url.searchParams.get("tingkat") === "prov") {   // rincian satu kabupaten atau satu provinsi: kontak pemangku yang belum menjadi anggota, profil PIC (tersamar, tanpa NIP, email, HP)
    if (!prov) return gagal(400, "prov wajib bersama kab");
    if (!dalamWilayahStaf(req, [prov])) return gagal(403, "provinsi di luar wilayah haknya");
    if (kab) { let daftar; try { daftar = (await daftarKab(env)).get(prov) || []; } catch (e) { return wilayahGalat(); }
      if (!daftar.includes(kab)) return gagal(400, "kabupaten atau kota tidak sah"); }
    const r = kab ? await mkPapanRinci(env, prov, kab, KATEGORI_SEMUA, K.KONTAK_RINCI_MAKS) : {kontak: [], akun: []};
    let pemda = null, profil = [];
    try { pemda = await pfAkunWilayah(env, prov, kab || null); if (pemda) profil = await pfProfilRinci(env, pemda.id); } catch (e) { if (!/no such table/i.test(String(e?.message))) throw e; }
    const bpbd = (await pfKontakBpbd(env, prov, kab || null)).map(k => ({id: k.id, nama: k.nama, jabatan: k.jabatan, wa: samar(k.wa)}));
    return json({prov, kab: kab || null, akun: r.akun.map(a => ({id: a.id, jenis: a.jenis, lembaga: a.wilayah})),
      kontak: r.kontak.map(k => ({id: k.id, nama: k.nama, jabatan: k.jabatan, kategori: k.kategori, wa: samar(k.wa), akun_id: r.akun.find(a => K.PETA_KATEGORI[a.jenis]?.includes(k.kategori))?.id ?? null})),
      pemda: pemda && {id: pemda.id, status: pemda.status, wilayah: pemda.wilayah}, kontak_bpbd: bpbd, profil: profil.map(p => ({id: p.id, nama: p.nama, jabatan: p.jabatan, status: p.status, terakhir_masuk: p.terakhir_masuk, terkunci: !!p.kunci_admin}))});
  }
  let d; try { d = await papanData(env, kini, ctx); } catch (e) { if (/pusat_kec/.test(String(e?.message))) return wilayahGalat(); throw e; }
  const daftar = d.daftar.filter(x => (!prov || x.prov === prov) && dalamWilayahStaf(req, [x.prov]));
  return json({dibuat: d.dibuat, daftar});
}

/* PF-07 (profil-bpbd ALGORITMA 12): kirim ulang undangan akun BPBD. Nomor tujuan selalu dari baris kontak_pemangku di wilayah akun, tidak pernah dari badan; pesan tidak pernah memuat sandi (N10). */
async function undangUlang(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.undang_ulang_ip", K.LAJU_IP_UNDANG, kini); if (ip) return ip;
  const {mod} = await hakStaf(env, req); if (!mod) return gagal(403, "kirim ulang undangan hanya untuk staf berwenang dan admin");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.akun_id !== "string" || !reId.test(b.o.akun_id)) return gagal(400, "akun_id 16 heks wajib");
  if (b.o.kontak_id != null && (typeof b.o.kontak_id !== "string" || !reId.test(b.o.kontak_id))) return gagal(400, "kontak_id tidak sah");
  const a = await pfAkunPemdaById(env, b.o.akun_id);
  if (!a || !dalamWilayahStaf(req, jsonCakupan(a.cakupan))) return gagal(a ? 403 : 404, a ? "akun itu di luar wilayah haknya" : "akun BPBD itu tidak ada");
  if (a.status === "dicabut") return gagal(409, "akun itu sudah dicabut");
  const pesan = `Yth. ${a.wilayah}, akun Centurisk97 untuk BPBD Anda sudah disiapkan. Username: ${a.username}. Masuk di https://centurisk97.id/instansi, buat sandi baru, lalu daftarkan 3 PIC. Sandi awal diberikan admin BNPB; bila belum menerimanya, hubungi admin.`;
  let k = null;
  if (b.o.kontak_id != null) {   // kontak divalidasi dulu: permintaan ditolak tidak memakai jatah per jam
    k = await mkKontakById(env, b.o.kontak_id);
    const wil = a.tingkat === "kab" ? {prov: a.prov, kab: a.kab} : {prov: jsonCakupan(a.cakupan)[0], kab: null};
    if (!k || k.kategori !== "bpbd" || !k.wa || k.prov !== wil.prov || bakuKab(k.kab) !== bakuKab(wil.kab)) return gagal(400, "kontak itu bukan kontak BPBD di wilayah akun ini");
  }
  const lAkun = await batas(env, a.id, "masuk.undang_ulang_akun", K.LAJU_UNDANG_ULANG_AKUN, kini); if (lAkun) return lAkun;   // teks salin dan antrean WA sama-sama dibatasi per akun
  if (!k) return json({teks_salin: pesan});
  const l = await batas(env, "semua", "masuk.undang_ulang_hari", K.LAJU_UNDANG_ULANG_HARI, kini); if (l) return l;
  await pfUndangAntre(env, {id: acak(8), tujuan: k.wa, pesan, rujukan: a.id, kini});
  return json({ok: true, antre: true, kontak: samar(k.wa)}, 201);
}

export const RUTE_MASUK_UNDANG = {
  "GET /admin/aktivasi": (env, req, url, kini) => halamanAdmin(env, req, kini, ctx => halamanBnpb("aktivasi", ctx), HALAMAN_STAF.aktivasi),   // layar papan: public/admin/aktivasi.js
  "GET /api/masuk/akun": tabelBelum(akunPilihan),
  "POST /api/masuk/mohon": tabelBelum(mohon),
  "POST /api/masuk/domain": tabelBelum(domain),
  "POST /api/masuk/email": tabelBelum(emailMinta),
  "POST /api/masuk/email/periksa": tabelBelum(emailPeriksa),
  "GET /api/masuk/undang": tabelBelum(undangDaftar),
  "POST /api/masuk/undang": tabelBelum(undangBuat),
  "POST /api/masuk/undang/cabut/:id": tabelBelum(undangCabut),   // aksi sebelum id: router worker hanya mengenal :id 16 heks di ujung jalur
  "GET /api/masuk/anggota": tabelBelum(anggotaDaftar),
  "GET /api/masuk/anggota/tinjau": tabelBelum(anggotaTinjau),
  "POST /api/masuk/anggota/cabut/:id": tabelBelum(anggotaCabut),
  "POST /api/masuk/anggota/putus/:id": tabelBelum(anggotaPutus),
  "GET /api/masuk/aktivasi": tabelBelum(aktivasi),
  "POST /api/masuk/undang-ulang": tabelBelum(undangUlang),
};
