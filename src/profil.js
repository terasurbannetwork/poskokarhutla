/* Akun BPBD dengan profil PIC (paket data/kajian-bnpb/profil-bpbd/, migrasi 0166). Satu akun lembaga pemda (username, sandi) punya paling banyak 4 profil
   orang; kerja butuh sesi profil = sesi akun + PIN benar (K3). Semua SQL di src/hak.js (pf*). Aturan yang dijaga di sini:
   - PIN 6 angka, hanya HMAC-SHA256 bergaram berkunci PROFIL_KUNCI (rahasia Worker, minimal 32 karakter; kurang = 503 dan tidak ada baris ditulis). PIN, hash, dan token
     tidak pernah masuk console, galat, URL, atau log D1.
   - Percobaan dihitung DULU (reservasi atomik), baru dibandingkan: tebakan serentak tidak bisa lolos dari batas (ALGORITMA 3.3).
   - Rute akun-level tidak pernah menerima akun_id dari klien (selalu dari sesi); "profil bukan milik akun ini" dan "profil tidak ada" dijawab sama (403).
   - Foto hanya JPEG, EXIF dibuang, disajikan tersandbox; tanpa vektor wajah dan tanpa pencocokan (K8).
   ponytail: kunci harian per profil bisa dipakai pemegang sandi lembaga untuk mengunci profil rekannya sampai admin membuka (N7, diterima, terlihat di log). */
import {json, gagal, acak, sha, bacaBody, bacaBytes, normalWA, ipHash} from "./worker.js";
import {tx, RE_EMAIL, modOK} from "./posko.js";
import {laju} from "./bnpb.js";
import {bersihMedia} from "./media_bersih.js";
import {modAtauStaf, dalamWilayahStaf, dariStaf, P_VALIDASI} from "./staf.js";
import * as H from "./hak.js";
import {sesiProfilDari, tokenProfil, kukiProfil} from "./profil_sesi.js";
import {K, ACTION, adaPemda} from "./profil_konst.js";

const RE_NIP = /^[0-9A-Za-z .\/-]{5,30}$/;
const WIB = 7 * 36e5, HARI = 864e5;
const hariWib = kini => Math.floor((kini + WIB) / HARI);
const jamWib = ms => { const d = new Date(ms + WIB); return `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`; };
const GALAT_MILIK = "profil itu tidak ada atau bukan milik akun ini";
/* kunci laju_bnpb paling panjang 64: pf:<profil 16>:<40 pertama hash IP> */
const kunciPf = (profilId, ip) => `pf:${profilId}:${ip.slice(0, 40)}`;
const jsonAman = t => { try { return JSON.parse(t); } catch { return null; } };

/* ================================================================ murni */
/* PIN sah: persis 6 angka; ditolak semua angka sama, deret naik atau turun (melingkar 9 ke 0), dan 6 angka terakhir HP profil itu */
export function pinSah(pin, wa = "") {
  if (typeof pin !== "string" || !new RegExp(`^\\d{${K.PIN_DIGIT}}$`).test(pin)) return false;
  const d = [...pin].map(Number);
  if (d.every(x => x === d[0])) return false;
  if (d.every((x, i) => i === 0 || x === (d[i - 1] + 1) % 10) || d.every((x, i) => i === 0 || x === (d[i - 1] + 9) % 10)) return false;
  if (/^(\d{2})\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin) || /^(\d)\1(\d)\2(\d)\3$/.test(pin) || pin === [...pin].reverse().join("")) return false;   // 121212, 123123, 112233, palindrom 123321
  return !(wa && pin === String(wa).slice(-K.PIN_DIGIT));
}
/* PIN sementara acak seragam (buang >= 4.000.000.000 supaya tanpa bias), diulang bila kena aturan PIN sah */
export function pinSementara(wa = "") {
  for (;;) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0]; if (n >= 4e9) continue;
    const pin = String(n % 1e6).padStart(K.PIN_DIGIT, "0"); if (pinSah(pin, wa)) return pin;
  }
}
/* profil lengkap (ALGORITMA 2): data sah, foto, PIN, bukan dicabut. p = baris pfProfil (pin_ada) */
export const profilLengkap = p => !!p && p.status !== "dicabut" && p.foto === 1 && !!p.pin_ada
  && typeof p.nama === "string" && p.nama.length >= 2 && typeof p.jabatan === "string" && p.jabatan.length >= 2
  && RE_NIP.test(p.nip || "") && RE_EMAIL.test(p.email || "") && /^62\d{8,13}$/.test(p.wa || "");
const kurangnya = p => ["foto", "PIN"].filter(k => k === "foto" ? p.foto !== 1 : !p.pin_ada);
const samaPanjang = (a, b) => { if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };
const kunciSah = env => typeof env.PROFIL_KUNCI === "string" && env.PROFIL_KUNCI.length >= 32;
const tanpaKunci = () => gagal(503, "profil belum dikonfigurasi");
async function hmacPin(env, profilId, garam, pin) {
  const enc = new TextEncoder(), k = await crypto.subtle.importKey("raw", enc.encode(env.PROFIL_KUNCI), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`pin|${profilId}|${garam}|${pin}`)))].map(b => b.toString(16).padStart(2, "0")).join("");
}
const simpanPin = async (env, profilId, pin) => { const garam = acak(8); return {garam, sha: await hmacPin(env, profilId, garam, pin)}; };
const tanpaTabel = e => /no such table/i.test(String(e?.message || e));

/* isian data PIC: {v} atau {g: pesan} */
function bacaIsian(o) {
  /* panjang dihitung per code point (Array.from) seperti length() SQLite, supaya emoji tidak lolos JS lalu kena CHECK D1 */
  const t = (v, min, maks, nama) => { const s = tx(v, maks * 2); const n = s ? Array.from(s).length : 0; return s === undefined || n > maks ? {g: `${nama} maksimal ${maks} karakter`} : !s ? {g: `${nama} wajib diisi`} : n < min ? {g: `${nama} minimal ${min} karakter`} : {s}; };
  const nama = t(o.nama, 2, 100, "nama"), jabatan = t(o.jabatan, 2, 100, "jabatan"), nip = t(o.nip, 5, 30, "NIP"), email = t(o.email, 6, 254, "email"), hp = t(o.wa, 8, 30, "nomor HP");
  for (const x of [nama, jabatan, nip, email, hp]) if (x.g) return {g: x.g};
  if (!RE_NIP.test(nip.s)) return {g: "NIP hanya huruf, angka, titik, garis, spasi, 5 sampai 30 karakter"};
  const em = email.s.toLowerCase(); if (!RE_EMAIL.test(em)) return {g: "email tidak sah"};
  const wa = normalWA(hp.s); if (!wa) return {g: "nomor HP tidak sah (contoh 0812xxxxxxx)"};
  return {v: {nama: nama.s, jabatan: jabatan.s, nip: nip.s, email: em, wa}};
}
const SATUAN = /UNIQUE constraint failed/i;
const galatTulis = e => /satu akun paling banyak 4/.test(String(e?.message)) ? gagal(409, "satu akun paling banyak 4 profil")
  : SATUAN.test(String(e?.message)) ? gagal(409, "NIP atau email itu sudah dipakai profil lain di lembaga ini") : null;
/* data PIC yang tampil ke klien: tanpa kolom hitungan kunci dan tanpa apa pun tentang PIN selain ada atau tidaknya */
const tampil = (p, penuh) => ({id: p.id, nama: p.nama, jabatan: p.jabatan, foto: p.foto === 1, status: p.status, pin_ada: !!p.pin_ada, lengkap: profilLengkap(p), kurang: kurangnya(p), diubah: p.diubah, terakhir_masuk: p.terakhir_masuk,
  ...(penuh ? {nip: p.nip, email: p.email, wa: p.wa} : {})});
const hapusKuki = () => kukiProfil("", 0);
const denganKuki = (r, daftar) => { for (const c of daftar) r.headers.append("set-cookie", c); return r; };
const ipPendek = async (env, req) => (await ipHash(env, req)).slice(0, 12);
const catat = async (env, req, akun, jenis, profil, kini, tambahan = {}) => { await H.pfLog(env, {akun, profil, jenis, ip: await ipPendek(env, req), ...tambahan}, kini).catch(e => { if (!tanpaTabel(e)) throw e; }); };

/* ================================================================ rute */
export function rutePofil(D) {
  /* sesi akun pemda yang sudah punya sandi sendiri; jenis lain 403 */
  async function akunPemda(env, req, kini) {
    const a = await D.akunMasuk(env, req, kini); if (a instanceof Response) return a;
    if (!adaPemda(a.jenis)) return gagal(403, "profil hanya untuk akun BPBD (pemerintah provinsi, kabupaten, dan kota)");
    return a.wajib_ganti ? json({galat: "buat sandi baru dulu: sandi awal diketahui admin", wajib_ganti: true}, 403) : a;
  }
  /* sesi akun, lalu profil milik akun itu: GALAT_MILIK (403) bila tidak ada atau milik akun lain */
  async function profilMilik(env, req, kini, id) {
    const a = await akunPemda(env, req, kini); if (a instanceof Response) return {r: a};
    const p = await H.pfProfil(env, a.id, id); return p ? {a, p} : {r: gagal(403, GALAT_MILIK)};
  }
  /* boleh mengubah data atau foto: sesi akun untuk draf tanpa PIN, sesi profil profil itu untuk profil aktif */
  async function bolehUbah(env, req, kini, id) {
    const m = await profilMilik(env, req, kini, id); if (m.r) return m;
    if (m.p.status === "draf" && !m.p.pin_ada) return m;
    if (m.p.status !== "aktif") return {r: gagal(403, "profil ini tidak bisa diubah sekarang")};
    const sp = await sesiProfilDari(env, req, kini);
    if (!sp || sp.profil_id !== id || sp.akun_id !== m.a.id) return {r: gagal(401, "masuk dengan profil ini dulu (pilih profil dan isi PIN)")};
    return sp.pin_wajib_ganti ? {r: json({galat: "ganti PIN dulu", pin_wajib_ganti: true}, 403)} : m;
  }

  /* kunci laju per profil dan IP; bukan per akun, supaya satu IP tidak mengunci profil dari IP lain (N7) */
  async function terkunciSampai(env, req, profilId, kini) {
    const {n, buka} = await H.pfBukaLaju(env, kunciPf(profilId, await ipHash(env, req)), ACTION.PIN_SALAH, K.KUNCI, kini);
    return n >= K.SALAH_BERUNTUN ? buka : null;
  }
  const kunciSementara = (buka) => json({galat: `Profil ini dikunci sementara. Bisa dicoba lagi pukul ${jamWib(buka)}.`, terkunci: true, buka}, 423, {"retry-after": String(Math.max(1, Math.ceil((buka - Date.now()) / 1000)))});
  const kunciAdmin = () => json({galat: "Profil ini dikunci. Hubungi admin BNPB untuk membukanya.", terkunci: true, kunci_admin: true}, 423);

  /* periksa PIN dengan reservasi dulu. Kembalian {r: Response} atau {ok: true}. data = pfPinData */
  async function periksaPin(env, req, akun, data, pin, kini) {
    if (!kunciSah(env)) return {r: tanpaKunci()};
    if (typeof pin !== "string" || !new RegExp(`^\\d{${K.PIN_DIGIT}}$`).test(pin)) return {r: gagal(400, `PIN harus ${K.PIN_DIGIT} angka`)};
    if (!data || data.status !== "aktif" || !data.pin_sha) return {r: gagal(403, "Profil ini belum aktif.")};
    if (data.kunci_admin) return {r: kunciAdmin()};
    const ip = await ipHash(env, req);
    const l1 = await laju(env, akun.id, ACTION.PIN_AKUN, K.LAJU_PIN_AKUN, kini); if (l1) return {r: l1};
    const l2 = await laju(env, ip, ACTION.PIN_IP, K.LAJU_PIN_IP, kini); if (l2) return {r: l2};
    const rs = await H.pfReservasiPin(env, akun.id, data.id, kunciPf(data.id, ip), ACTION.PIN_SALAH, K.SALAH_BERUNTUN, K.KUNCI, hariWib(kini), K.SALAH_HARI, kini);
    if (!rs.ok) {
      if (rs.sebab === "laju") { const {buka} = await H.pfBukaLaju(env, kunciPf(data.id, ip), ACTION.PIN_SALAH, K.KUNCI, kini); return {r: kunciSementara(buka ?? kini + K.KUNCI)}; }
      const baru = await H.pfPinData(env, akun.id, data.id);
      return {r: baru?.kunci_admin ? kunciAdmin() : gagal(403, "Profil ini belum aktif.")};
    }
    if (samaPanjang(await hmacPin(env, data.id, data.pin_garam, pin), data.pin_sha)) { await H.pfPinBenar(env, data.id, rs.laju, K.SALAH_HARI, kini); return {ok: true}; }
    if (rs.kunci_admin) { await catat(env, req, akun.id, "terkunci_admin", data.id, kini); return {r: kunciAdmin()}; }
    const t = await terkunciSampai(env, req, data.id, kini);
    if (t) { await catat(env, req, akun.id, "terkunci", data.id, kini); return {r: kunciSementara(t)}; }
    await catat(env, req, akun.id, "pin_salah", data.id, kini);
    return {r: gagal(401, "PIN belum cocok. Coba lagi.")};
  }

  /* ---------------- akun-level ---------------- */
  async function daftar(env, req, url, kini) {
    const a = await D.akunMasuk(env, req, kini); if (a instanceof Response) return a;
    if (!adaPemda(a.jenis)) return json({profil_mode: false});
    const ps = await H.pfProfilAkun(env, a.id), sp = await sesiProfilDari(env, req, kini).catch(() => null), aktifSaya = sp && sp.akun_id === a.id ? sp.profil_id : null;
    const keluar = [];
    for (const p of ps) {
      const t = p.status === "aktif" ? (p.kunci_admin ? "admin" : await terkunciSampai(env, req, p.id, kini)) : null;
      keluar.push({...tampil(p, p.id === aktifSaya), ...(t ? {terkunci: t} : {})});
    }
    return json({profil_mode: true, akun: {id: a.id, status: a.status, wilayah: a.wilayah, wajib_ganti: !!a.wajib_ganti, surat: !!a.surat, kartu: !!a.kartu}, profil: keluar, profil_aktif: aktifSaya,
      pin_wajib_ganti: !!sp?.pin_wajib_ganti, maks: K.PROFIL_MAKS, wajib: K.PROFIL_WAJIB, kunci_ada: kunciSah(env)});
  }
  async function buat(env, req, url, kini) {
    const a = await akunPemda(env, req, kini); if (a instanceof Response) return a;
    if (!["belum_klaim", "ditolak", "aktif"].includes(a.status)) return gagal(409, "profil tidak bisa ditambah selama pengajuan diperiksa");
    const l = await laju(env, a.id, ACTION.BUAT, K.LAJU_BUAT_PROFIL, kini); if (l) return l;
    const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
    if (b.o.setuju !== true) return gagal(400, "centang persetujuan pengolahan data pribadi dulu");
    const f = bacaIsian(b.o); if (f.g) return gagal(400, f.g);
    if ((await H.pfProfilAkun(env, a.id)).filter(p => p.status !== "dicabut").length >= K.PROFIL_MAKS) return gagal(409, `satu akun paling banyak ${K.PROFIL_MAKS} profil`);
    const id = acak(8);
    try { await H.pfBuat(env, a.id, id, f.v, kini); } catch (e) { const g = galatTulis(e); if (g) return g; throw e; }
    await catat(env, req, a.id, "profil_buat", id, kini);
    return json({id, status: "draf"}, 201);
  }
  async function ubah(env, req, url, kini, ctx, id) {
    const m = await bolehUbah(env, req, kini, id); if (m.r) return m.r;
    const l = await laju(env, m.a.id, ACTION.UBAH, K.LAJU_UBAH_PROFIL, kini); if (l) return l;
    const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
    const f = bacaIsian(b.o); if (f.g) return gagal(400, f.g);
    const berubah = ["nama", "jabatan", "nip", "email", "wa"].filter(k => f.v[k] !== m.p[k]).join(",");   // S4: nama kolom saja, tanpa nilai
    let n; try { n = await H.pfUbah(env, m.a.id, id, f.v, kini); } catch (e) { const g = galatTulis(e); if (g) return g; throw e; }
    if (!n) return gagal(409, "profil berubah; muat ulang");
    await catat(env, req, m.a.id, "profil_ubah", id, kini, {objek: berubah || "tetap"});
    return json({ok: true});
  }
  async function unggahFoto(env, req, url, kini, ctx, id) {
    const m = await bolehUbah(env, req, kini, id); if (m.r) return m.r;
    if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum aktif (R2 MEDIA)");
    const l = await laju(env, m.a.id, "instansi.unggah", K.LAJU_UNGGAH_FOTO, kini); if (l) return l;
    const n = D.tanpaPanjang(req); if (n) return n;
    const u = await bacaBytes(req, K.FOTO_MAKS); if (u.galat) return gagal(u.status || 400, u.galat);
    if (D.jenisDok(u.b) !== "image/jpeg") return gagal(400, "foto harus JPEG");
    const b = bersihMedia("image/jpeg", u.b); if (!b) return gagal(400, "struktur JPEG tidak sah atau tidak lengkap");   // EXIF, XMP, ICC dibuang; data sesudah EOI dipotong
    const kunci = `instansi/profil/${m.a.id}/${id}`, sementara = kunci + ".baru";   // S3: tulis ke kunci sementara; foto lama tidak tersentuh bila D1 menolak
    await env.MEDIA.put(sementara, b, {httpMetadata: {contentType: "image/jpeg"}});
    let ok; try { ok = await H.pfSetFoto(env, m.a.id, id, kini); } catch (e) { await env.MEDIA.delete(sementara); throw e; }
    if (!ok) { await env.MEDIA.delete(sementara); return gagal(409, "profil berubah; muat ulang"); }
    await env.MEDIA.put(kunci, b, {httpMetadata: {contentType: "image/jpeg"}}); await env.MEDIA.delete(sementara);
    await catat(env, req, m.a.id, "foto", id, kini);
    return json({foto: true});
  }
  async function lihatFoto(env, req, url, kini, ctx, id) {
    const m = await profilMilik(env, req, kini, id); if (m.r) return m.r;
    return m.p.foto === 1 ? D.kirimBerkas(env, `instansi/profil/${m.a.id}/${id}`) : gagal(404, "foto belum ada");
  }
  /* satu rute dua mode (ALGORITMA 3.4): profil tanpa PIN = atur PIN pertama; profil ber-PIN = periksa PIN lalu terbitkan sesi profil */
  async function pin(env, req, url, kini, ctx, id) {
    const a = await akunPemda(env, req, kini); if (a instanceof Response) return a;
    if (!kunciSah(env)) return tanpaKunci();   // G5: sesudah autentikasi, supaya tamu tidak bisa membedakan konfigurasi
    const b = await bacaBody(req, 256); if (b.galat) return gagal(b.status || 400, b.galat);
    const data = await H.pfPinData(env, a.id, id); if (!data) return gagal(403, GALAT_MILIK);
    if (!data.pin_sha) {
      if (data.status !== "draf") return gagal(409, "profil ini tidak bisa diberi PIN sekarang");
      if (!pinSah(b.o.pin, data.wa)) return gagal(400, "PIN itu terlalu mudah ditebak. Pilih 6 angka lain.");
      const s = await simpanPin(env, id, b.o.pin);
      if (!await H.pfSetPin(env, a.id, id, s.garam, s.sha, kini)) return gagal(409, "profil ini sudah punya PIN");
      await catat(env, req, a.id, "pin_atur", id, kini);
      return json({ok: true, pin_ada: true});
    }
    const r = await periksaPin(env, req, a, data, b.o.pin, kini); if (r.r) return r.r;
    const token = acak(32);
    if (!await H.pfSesiBaru(env, await sha(token), id, a.id, kini, kini + K.SESI_PROFIL)) return gagal(403, "akun atau profil tidak aktif");
    await catat(env, req, a.id, "pin_ok", id, kini);
    const p = await H.pfProfil(env, a.id, id);
    return denganKuki(json({ok: true, profil: {id, nama: p.nama, jabatan: p.jabatan, foto: p.foto === 1}, pin_wajib_ganti: !!data.pin_wajib_ganti}), kukiProfil(token, K.SESI_PROFIL / 1000));
  }
  async function gantiPin(env, req, url, kini, ctx, id) {
    const a = await akunPemda(env, req, kini); if (a instanceof Response) return a;
    if (!kunciSah(env)) return tanpaKunci();
    const sp = await sesiProfilDari(env, req, kini);
    if (!sp || sp.profil_id !== id || sp.akun_id !== a.id) return gagal(401, "masuk dengan profil ini dulu (pilih profil dan isi PIN)");
    const b = await bacaBody(req, 256); if (b.galat) return gagal(b.status || 400, b.galat);
    const data = await H.pfPinData(env, a.id, id); if (!data) return gagal(403, GALAT_MILIK);
    const r = await periksaPin(env, req, a, data, b.o.lama, kini); if (r.r) return r.r;
    if (!pinSah(b.o.baru, data.wa) || b.o.baru === b.o.lama) return gagal(400, "PIN baru terlalu mudah ditebak atau sama dengan yang lama. Pilih 6 angka lain.");
    const s = await simpanPin(env, id, b.o.baru);
    if (!await H.pfGantiPin(env, a.id, id, data.pin_sha, s.garam, s.sha, await sha(tokenProfil(req)), kini)) return gagal(409, "PIN berubah; coba lagi");
    await catat(env, req, a.id, "pin_ganti", id, kini);
    return json({ok: true});
  }
  async function keluarProfil(env, req, url, kini) {
    const sp = await sesiProfilDari(env, req, kini).catch(() => null), t = tokenProfil(req);
    if (t) await H.pfSesiCabut(env, await sha(t));
    if (sp) await catat(env, req, sp.akun_id, "ganti_profil", sp.profil_id, kini);
    return denganKuki(json({ok: true}), hapusKuki());
  }
  async function ajukan(env, req, url, kini, ctx, id) {
    const m = await profilMilik(env, req, kini, id); if (m.r) return m.r;
    const lj = await laju(env, m.a.id, ACTION.AJUKAN, K.LAJU_AJUKAN, kini); if (lj) return lj;
    if (m.a.status !== "aktif") return gagal(409, "profil tambahan hanya sesudah akun aktif; kirim akun untuk disetujui");
    if (m.p.status !== "draf" || !profilLengkap(m.p)) return gagal(409, `profil belum lengkap: ${kurangnya(m.p).join(" dan ") || "data"} belum ada`);
    if (!await H.pfAjukan(env, m.a.id, id, kini)) return gagal(409, "profil berubah; muat ulang");
    await catat(env, req, m.a.id, "kirim", id, kini);
    return json({status: "menunggu"}, 201);
  }
  async function kirim(env, req, url, kini) {
    const a = await akunPemda(env, req, kini); if (a instanceof Response) return a;
    const lj = await laju(env, a.id, ACTION.AJUKAN, K.LAJU_AJUKAN, kini); if (lj) return lj;
    if (!["belum_klaim", "ditolak"].includes(a.status)) return gagal(409, a.status === "aktif" ? "akun sudah aktif" : "pengajuan sedang diperiksa admin BNPB");
    if (!a.surat || !a.kartu) return gagal(409, "unggah surat tugas dan foto kartu pegawai dulu");
    const ps = (await H.pfProfilAkun(env, a.id)).filter(p => p.status === "draf"), lengkap = ps.filter(profilLengkap);
    if (lengkap.length < K.PROFIL_WAJIB) {
      const kurang = ps.filter(p => !profilLengkap(p)).map(p => `${p.nama} belum punya ${kurangnya(p).join(" dan ") || "data lengkap"}`);
      return gagal(409, `Daftarkan ${K.PROFIL_WAJIB} PIC lengkap sebelum mengirim. Baru ada ${lengkap.length}.${kurang.length ? " " + kurang.join("; ") + "." : ""}`);
    }
    const pic = lengkap[0];   // PIC pertama = dibuat paling awal; datanya disalin ke kolom akun (N2)
    if (!await H.pfKirim(env, a.id, pic, await ipPendek(env, req), kini)) return gagal(409, "status akun berubah; muat ulang");
    return json({status: "menunggu"}, 201);
  }
  async function logLembaga(env, req, url, kini) {
    const sp = await sesiProfilDari(env, req, kini); if (!sp) return gagal(401, "pilih profil dan isi PIN dulu");
    if (sp.pin_wajib_ganti) return json({galat: "ganti PIN dulu", pin_wajib_ganti: true}, 403);
    const q = url.searchParams, jenis = q.get("jenis") || null, sb = q.get("sebelum");
    if ((jenis && !/^[a-z_]{3,20}$/.test(jenis)) || (sb && !/^\d{1,15}$/.test(sb))) return gagal(400, "saringan tidak sah");   // G3
    const sebelum = Number(sb) || kini, baris = await H.pfLogDaftar(env, {akun: sp.akun_id, jenis}, sebelum);
    const nama = new Map((await H.pfProfilAkun(env, sp.akun_id)).map(p => [p.id, p.nama]));
    return json({log: baris.slice(0, K.LOG_HALAMAN).map(r => ({id: r.id, waktu: r.waktu, profil: r.profil_id ? nama.get(r.profil_id) ?? null : null, jenis: r.jenis, rute: r.rute, objek: r.objek})), berikut: baris.length > K.LOG_HALAMAN ? baris[K.LOG_HALAMAN - 1].waktu : null});
  }

  /* ---------------- admin ---------------- */
  const tolakMod = () => gagal(403, "fitur ini hanya untuk moderator ke atas atau staf verifikator");
  async function akunAdmin(env, req, akunId) {
    const mod = await modAtauStaf(env, req, P_VALIDASI); if (!mod) return {r: tolakMod()};
    const a = await H.mkInstansiById(env, akunId);
    return a && adaPemda(a.jenis) && dalamWilayahStaf(req, jsonAman(a.cakupan) || []) ? {mod, a} : {r: gagal(404, "akun BPBD tidak ada")};
  }
  async function adminDaftar(env, req, url, kini, ctx, akunId) {
    const m = await akunAdmin(env, req, akunId); if (m.r) return m.r;
    return json({profil: (await H.pfProfilAkun(env, akunId)).map(p => ({...tampil(p, true), terkunci: p.kunci_admin ? "admin" : null, pin_wajib_ganti: !!p.pin_wajib_ganti, disetujui: p.disetujui, dibuat: p.dibuat})), maks: K.PROFIL_MAKS, wajib: K.PROFIL_WAJIB});
  }
  async function adminAksi(env, req, url, kini, ctx, id) {
    const mod = await modAtauStaf(env, req, P_VALIDASI); if (!mod) return tolakMod();
    const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
    const aksi = b.o.aksi; if (!["setuju", "cabut", "reset_pin", "buka_kunci"].includes(aksi)) return gagal(400, "aksi harus setuju, cabut, reset_pin, atau buka_kunci");
    const p = await H.pfProfilById(env, id), m = p ? await akunAdmin(env, req, p.akun_id) : null;
    if (!m || m.r) return m?.r ?? gagal(404, "profil tidak ada");
    if (dariStaf(mod) && aksi !== "setuju") return gagal(403, "staf hanya boleh menyetujui profil di wilayahnya");
    const oleh = String(mod).slice(0, 40);
    if (aksi === "setuju") return await H.pfSetujuProfil(env, id, p.akun_id, oleh, K.PROFIL_MAKS, kini) ? json({id, status: "aktif"}) : gagal(409, "profil tidak menunggu, akunnya belum aktif, atau sudah ada 4 profil aktif");
    if (aksi === "cabut") return await H.pfCabutProfil(env, id, p.akun_id, oleh, kini) ? json({id, status: "dicabut"}) : gagal(409, "profil sudah dicabut");
    if (aksi === "buka_kunci") return await H.pfBukaKunci(env, id, p.akun_id, oleh, kini) ? json({id, terkunci: false}) : gagal(409, "profil belum aktif");
    if (!kunciSah(env)) return tanpaKunci();
    const sementara = pinSementara(p.wa), s = await simpanPin(env, id, sementara);
    return await H.pfResetPin(env, id, p.akun_id, s.garam, s.sha, oleh, kini) ? json({id, pin_sementara: sementara}) : gagal(409, "profil belum aktif");   // tampil sekali; tidak disimpan terbaca, tidak di-log
  }
  async function adminFoto(env, req, url, kini, ctx, id) {
    const p = await H.pfProfilById(env, id), m = p ? await akunAdmin(env, req, p.akun_id) : null;
    if (!m || m.r) return m?.r ?? gagal(404, "foto tidak ada");
    return p.foto === 1 ? D.kirimBerkas(env, `instansi/profil/${p.akun_id}/${id}`) : gagal(404, "foto belum ada");
  }
  async function adminLog(env, req, url, kini) {
    if (!await modOK(env, req)) return tolakMod();
    const q = url.searchParams, re = /^[0-9a-f]{16}$/, akun = q.get("akun") || null, profil = q.get("profil") || null, jenis = q.get("jenis") || null;
    if ((akun && !re.test(akun)) || (profil && !re.test(profil)) || (jenis && !/^[a-z_]{3,20}$/.test(jenis)) || (q.get("sebelum") && !/^\d{1,15}$/.test(q.get("sebelum")))) return gagal(400, "saringan tidak sah");
    const baris = await H.pfLogDaftar(env, {akun, profil, jenis}, Number(q.get("sebelum")) || kini);
    return json({log: baris.slice(0, K.LOG_HALAMAN), berikut: baris.length > K.LOG_HALAMAN ? baris[K.LOG_HALAMAN - 1].waktu : null});
  }

  return {
    "GET /api/instansi/profil": daftar,
    "POST /api/instansi/profil": buat,
    "POST /api/instansi/profil/:id": ubah,
    "POST /api/instansi/profil/foto/:id": unggahFoto,
    "GET /api/instansi/profil/foto/:id": lihatFoto,
    "POST /api/instansi/profil/pin/:id": pin,
    "POST /api/instansi/profil/gantipin/:id": gantiPin,
    "POST /api/instansi/profil/ajukan/:id": ajukan,
    "POST /api/instansi/profil/keluar": keluarProfil,
    "POST /api/instansi/kirim": kirim,
    "GET /api/instansi/profil/log": logLembaga,
    "GET /api/instansi/admin/profil/:id": adminDaftar,
    "POST /api/instansi/admin/profil/:id": adminAksi,
    "GET /api/instansi/admin/profil/foto/:id": adminFoto,
    "GET /api/instansi/admin/log": adminLog,
  };
}
export {tanpaTabel as profilTanpaTabel};
