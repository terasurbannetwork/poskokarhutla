/* Command center karhutla (keputusan pemilik 1 Nov 2026). Skema: migrations/0099_command_center.sql (cc_status, cc_jejak, cc_hadir). Klien: public/admin/command_*.js|css.
   MEJA OPERATOR (per orang); layar dinding DIBUANG 2 Nov 2026 (layar besar memakai peta utama "/"). Operator menindaklanjuti alert api level 3:
   lihat alert -> telepon BPBD (di luar sistem) -> "Dalam konfirmasi" -> kabar BPBD -> "Ada api" / "Tidak ada api". Tiap klik dilog (operator, waktu, durasi).
   - Alert = tugas karhutla (FILTER_BENCANA.karhutla, src/monitor.js) level = 3, dibuat <= 7 hari. Tanpa baris cc_status = 'baru'. TANPA FK ke tugas_api; modul ini TIDAK menulis tugas_api, tugas_isian,
     atau alur konfirmasi BPBD (monitor/instansi tidak disentuh).
   - Hak (auth SELALU sebelum validasi). TULIS = staf berperan operator_cc ATAU modOK (akun gerbang AKUN_SITUS ditolak, bukan adminOK). BACA MEJA = tulis + koordalops, pimpinan.
     Akun pemirsa tidak membuka command center (tab 'dinding' dibuang; migrasi 0100). Staf berwilayah disaring (dalamWilayahStaf / SQL). Baris dummy hanya untuk moderator dan staf dummy (pemirsa dan staf nyata tanpa dummy), seperti src/monitor.js.
   - Penulisan status = compare-and-set: UPDATE ... WHERE status = dari, jejak ditulis INSERT..SELECT..WHERE changes() > 0 dalam SATU batch, jadi klik yang kalah (409) tidak meninggalkan jejak palsu.
   - Pelaku ke klien: staf = 'staf:<id>' + nama; moderator = 'moderator' + 'Moderator'. Hash token moderator (oleh di cc_status/cc_jejak, 12 heks awal sha256 entri ADMIN_TOKEN) TIDAK PERNAH keluar (log, CSV, ringkasan).
   - POST aksi dibatasi BATAS_AKSI_JAM per pelaku per jam (laju(), 429 + Retry-After); GET log (JSON dan CSV) BATAS_LOG_JAM per pelaku per jam, penghitung 'cc.log' sendiri. GET antrean (jajak 30 dtk) TIDAK
     dibatasi: itu rute baca ringan yang di-memo. Daftar yang dibaca (alert terbuka, keputusan akhir, jejak respons hari ini) dipotong di BATAS_DAFTAR; pemotongan dikirim sebagai
     antrean_terpotong / final_terpotong / median_respons_terpotong (hitungan dari daftar terpotong = batas bawah) dan penampil WAJIB menandainya.
     Log (GET /api/cc/log) dipotong di BATAS_LOG baris PERTAMA: JSON memuat terpotong + batas; CSV-nya tidak lengkap, jadi diberi baris CATATAN terakhir, header x-terpotong, dan akhiran -terpotong pada nama berkas.
   - Nomor BPBD (GET /api/cc/kontak) hanya untuk meja TULIS, tidak pernah ke pemirsa;
     hanya `telepon` kantor entri bernama unit (bukan `wa` pribadi, bukan label di `jabatan`).
   - Meja Pantau (src/pantau.js, public/admin/pantau.js): kartu api (api_konfirmasi, api_kabar, api_muncul_lagi) bagi pemanggil berhak BACA cc menampilkan status tindak lanjut + pemegang, dan bagi penulis tombol transisinya (POST /api/cc/aksi/:id yang sama).
     Statusnya dibaca langsung per tugas lewat alertUntukPantau() (definisi alert yang sama dengan bacaSatu()), BUKAN dari memo antrean: antrean membuang keputusan akhir > 12 jam padahal tugasnya masih terbuka (alert, kabar tindakan menunggu),
     dan memo 5 dtk membuat muat ulang sesudah aksi bisa melihat keadaan lama. Log tindak lanjutnya ikut riwayat kartu lewat jejakUntukPantau(); hak (hakCc) dan nama pelaku (namaOleh) satu sumber dengan modul ini.
   ponytail: antrean dibangun dari satu batch D1 (pindai tugas 'buka' lewat indeks status) lalu di-memo di isolat (5 dtk, env CC_MEMO_DETIK; "0" mematikan) per kombinasi dummy+wilayah, supaya layar yang
   menyala terus tidak menghabiskan anggaran baca D1 Free. Memo antar isolat bisa basi sampai TTL; kebenaran tetap dijaga CAS di POST.
   - Halaman: GET /command-center (meja operator) memakai pelaku() YANG SAMA dengan API-nya, jadi halaman terbuka tepat bila API-nya menjawab.
     Tamu: meja 303 ke /admin/pantau?ke= (masuk staf). Layar meja SENYAP total (tanpa Audio/suara). Sesi sah tanpa hak: 403 polos tanpa pengalihan (cegah pantulan, pola SIPPA).
     Berkas klien public/admin/command_*.{js,css} (vanilla; CSP tanpa skrip/gaya sebaris; teks dari API tidak pernah lewat innerHTML). Gerbang centurisk97.id tidak ikut: halamanTerkunci (src/worker.js) mengecualikan /command-center. */
import {json, gagal, bacaBody, adminOK} from "./worker.js";
import {modOK, tx, tglSah} from "./posko.js";
import {PROV, tanpaBencana, tanpaTabel} from "./instansi.js";
import {stafSesi, stafTertahan, dalamWilayahStaf} from "./staf.js";
import {pemirsaSesi} from "./pemirsa.js";
import {FILTER_BENCANA} from "./monitor.js";
import {kunciPublikKarhutla} from "./peringatan.js";
import {laju} from "./bnpb.js";
import {CSP_ADMIN, halamanCc} from "./admin_halaman.js";

const MENIT = 6e4, JAM = 36e5, HARI = 24 * JAM, WIB = 7 * JAM;
const UMUR_ALERT = 7 * HARI, FINAL_TAMPIL = 12 * JAM, HADIR_TULIS = 5 * MENIT, SIMPAN_JEJAK = 730 * HARI, SIMPAN_HADIR = 30 * HARI, JAM_BERSIH_UTC = 4;
export const STATUS = ["baru", "dalam_konfirmasi", "ada_api", "tidak_ada_api"], FINAL = ["ada_api", "tidak_ada_api"];
/* satu-satunya tabel transisi (diuji semua pasangan): baru -> dalam_konfirmasi -> ada_api | tidak_ada_api; final -> dalam_konfirmasi hanya sebagai koreksi (catatan wajib) */
export const TRANSISI = {baru: ["dalam_konfirmasi"], dalam_konfirmasi: ["ada_api", "tidak_ada_api"], ada_api: ["dalam_konfirmasi"], tidak_ada_api: ["dalam_konfirmasi"]};
export const BATAS_DAFTAR = 500;   // baris per daftar yang dibaca muat() (alert terbuka, keputusan akhir, jejak respons hari ini); dibaca BATAS_DAFTAR + 1 supaya terpotong terdeteksi tepat; terpotong = angkanya batas bawah
export const BATAS_AKSI_JAM = 120, BATAS_LOG_JAM = 120, MAKS_LOKASI = 20;   // POST /api/cc/aksi dan GET /api/cc/log per pelaku per jam (penghitung terpisah: jajak antrean tidak ikut); pasangan prov/kab per panggilan GET /api/cc/kontak
export const BATAS_LOG = 5000;   // baris jejak yang dibaca GET /api/cc/log (dibaca BATAS_LOG + 1 supaya terpotong terdeteksi tepat); terpotong = JSON/CSV/ringkasan hanya memuat BATAS_LOG baris PERTAMA (terlama) dan hitungannya batas bawah

/* ================================================================ fungsi murni (diuji) */
/* ms epoch -> tanggal WIB YYYY-MM-DD (hari 00.00-24.00 WIB). 00.00 WIB = 17.00 UTC hari sebelumnya. */
export function tglWib(ms) { return new Date(Math.floor((ms + WIB) / HARI) * HARI).toISOString().slice(0, 10); }
/* tanggal WIB -> {mulai, akhir} ms, akhir eksklusif (00.00 WIB tanggal itu sampai 00.00 WIB hari berikutnya) */
export function rentangHari(tgl) {
  const mulai = Date.parse(tgl + "T00:00:00Z") - WIB;
  return {mulai, akhir: mulai + HARI};
}
/* median larik angka (genap: rata-rata dua tengah, dibulatkan ms); null bila kosong */
export function median(a) {
  const u = a.filter(Number.isFinite).sort((x, y) => x - y), n = u.length;
  return n ? (n % 2 ? u[(n - 1) / 2] : Math.round((u[n / 2 - 1] + u[n / 2]) / 2)) : null;
}
/* Durasi per jejak SATU tugas (urut waktu, id). respons = jejak baru->dalam_konfirmasi PERTAMA - dibuat tugas;
   konfirmasi = jejak ke final - jejak ->dalam_konfirmasi TERAKHIR sebelumnya. Lainnya (koreksi) tanpa durasi. Mengembalikan [{...jejak, jenis, ms}]. */
export function durasiJejak(jejak, dibuat) {
  let sudahRespons = false, mulaiKonfirmasi = null;
  return jejak.map(j => {
    let jenis = null, ms = null;
    if (j.ke === "dalam_konfirmasi") {
      if (j.dari === "baru" && !sudahRespons) { sudahRespons = true; if (Number.isFinite(dibuat)) { jenis = "respons"; ms = j.waktu - dibuat; } }
      mulaiKonfirmasi = j.waktu;
    } else if (FINAL.includes(j.ke) && mulaiKonfirmasi != null) { jenis = "konfirmasi"; ms = j.waktu - mulaiKonfirmasi; }
    return {...j, jenis, ms: ms == null ? null : Math.max(0, ms)};
  });
}
/* transisi yang boleh bagi pemanggil: pembaca (koordalops, pimpinan) tidak punya aksi */
export const aksiBoleh = (status, tulis) => tulis ? TRANSISI[status] ?? [] : [];
/* sel CSV: kutip digandakan, dibungkus kutip; awalan = + - @ TAB CR diberi ' (injeksi rumus di spreadsheet). Angka tidak lewat sini. */
export function selCsv(v) {
  if (v == null) return "";
  let s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
/* Nama dan kunci pelaku di layar dan log. oleh moderator = 12 heks awal sha256 entri ADMIN_TOKEN (entri bisa email:sandi): hash itu tidak pernah dikirim ke klien (bisa dipakai menebak entri). */
const NAMA_MOD = "Moderator", KUNCI_MOD = "moderator";
const kunciOleh = oleh => oleh.startsWith("staf:") ? oleh : KUNCI_MOD;
const wibTeks = t => new Date(t + WIB).toISOString().replace("T", " ").slice(0, 19);
const awalHari = kini => Math.floor((kini + WIB) / HARI) * HARI - WIB;   // 00.00 WIB hari ini

/* ================================================================ pelaku */
/* Hak cc dari peran (SATU sumber: pelaku() dan Meja Pantau, src/pantau.js). TULIS = moderator (mod) atau peran operator_cc; BACA = tulis + koordalops, pimpinan. */
export const hakCc = (peran, mod = false) => { const tulis = mod || peran.includes("operator_cc"); return {tulis, baca: tulis || peran.some(p => p === "koordalops" || p === "pimpinan")}; };
/* Urutan: moderator (modOK; akun gerbang AKUN_SITUS BUKAN moderator) -> sesi staf -> akun pemirsa (403) -> 401/403. Mengembalikan pelaku atau Response galat.
   {oleh, nama, staf, tulis, operator, dummy, wil, pemirsa} */
async function pelaku(env, req, kini) {
  const m = await modOK(env, req);
  if (m) return {oleh: m, nama: NAMA_MOD, staf: null, tulis: true, operator: false, dummy: true, wil: [], pemirsa: false};
  const s = await stafSesi(env, req, kini);
  if (s) {
    const hak = hakCc(s.peran);
    if (!hak.baca) return gagal(403, "peran staf ini tidak membuka command center");
    return {oleh: "staf:" + s.id, nama: s.nama, staf: s, tulis: hak.tulis, operator: hak.tulis, dummy: !!s.dummy, wil: s.wilayah, pemirsa: false};
  }
  if (await pemirsaSesi(env, req, kini)) return gagal(403, "akun pemirsa tidak membuka command center");
  if (await adminOK(env, req)) return gagal(403, "akun gerbang situs bukan moderator; masuk sebagai moderator atau staf untuk membuka command center");
  const t = await stafTertahan(env, req, kini);   // sandi awal belum diganti: layar langsung menawarkan sandi baru
  return json({galat: "belum masuk sebagai staf atau admin; masuk lagi", ...(t ? {wajib_ganti: t} : {})}, 401);
}
const tolakBaca = () => gagal(403, "peran ini hanya membaca; tindak lanjut hanya untuk operator command center");

/* ================================================================ pembacaan alert */
/* klausa dummy + wilayah untuk alias tabel tugas `t`; ikat bernomor ?N supaya urutan bind aman. Mengembalikan {sql, ikat} dengan ikat = awal + [wilayah bila ada]. */
function saring(a, awal = []) {
  const wil = a.wil.length ? `AND t.prov IN (SELECT value FROM json_each(?${awal.length + 1}))` : "";
  return {sql: `${a.dummy ? "" : "AND t.dummy = 0"} ${wil}`, ikat: a.wil.length ? [...awal, JSON.stringify(a.wil)] : awal};
}
/* karhutla saja (tugas_bencana 0047 belum ada = semua tugas karhutla) */
async function denganBencana(fn) { try { return await fn(FILTER_BENCANA.karhutla); } catch (e) { if (!tanpaBencana(e)) throw e; return fn(""); } }

const KOLOM_ALERT = "t.id, t.prov, t.kab, t.kec, t.lat, t.lon, t.n24, t.luas_ha, t.dibuat, t.konfirmasi_pada, t.dummy, c.status cstatus, c.oleh coleh, c.sejak csejak";
/* satu batch: alert terbuka (cc baru/dalam_konfirmasi, tugas 'buka') dan keputusan akhir 12 jam terakhir.
   Pindai 'buka' lewat indeks status (tugas_api_wilayah); keputusan akhir lewat indeks cc_status_sejak. */
async function muat(env, a, kini) {
  const mulaiHari = awalHari(kini), batasFinal = Math.min(kini - FINAL_TAMPIL, mulaiHari), batasAlert = kini - UMUR_ALERT, rg = rentangHari(tglWib(kini));
  const hasil = await denganBencana(async kecuali => {
    const S1 = saring(a, [batasAlert]), S2 = saring(a, [batasFinal, batasAlert]);
    const st = [
      env.DB.prepare(`SELECT ${KOLOM_ALERT} FROM tugas_api t LEFT JOIN cc_status c ON c.tugas_id = t.id WHERE t.status = 'buka' AND t.level = 3 AND t.dibuat >= ?1 AND (c.status IS NULL OR c.status = 'dalam_konfirmasi') ${kecuali} ${S1.sql} ORDER BY c.status IS NULL DESC, t.dibuat LIMIT ${BATAS_DAFTAR + 1}`).bind(...S1.ikat),
      env.DB.prepare(`SELECT ${KOLOM_ALERT} FROM cc_status c JOIN tugas_api t ON t.id = c.tugas_id WHERE c.status IN ('ada_api', 'tidak_ada_api') AND c.sejak >= ?1 AND t.level = 3 AND t.dibuat >= ?2 ${kecuali} ${S2.sql} ORDER BY c.sejak DESC LIMIT ${BATAS_DAFTAR + 1}`).bind(...S2.ikat)];
    return env.DB.batch(st);
  });
  /* terpotong = ada baris ke-(BATAS_DAFTAR + 1): hitungan dari daftar itu hanya batas bawah, dan penampil WAJIB menandainya (pola lewat_tenggat_terpotong). Alert terbuka dibaca yang belum dipegang dulu, lalu terlama dulu (urutan tampil), jadi yang tersisih yang sudah dipegang dan terbaru. */
  const potong = r => r.length > BATAS_DAFTAR ? [r.slice(0, BATAS_DAFTAR), true] : [r, false];
  const [buka, bukaT] = potong(hasil[0].results), [akhir, akhirT] = potong(hasil[1].results);
  const ids = [...new Set([...buka, ...akhir].map(r => r.coleh).filter(o => o?.startsWith("staf:")).map(o => o.slice(5)))];
  const nama = new Map(ids.length ? (await env.DB.prepare("SELECT id, nama FROM staf WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results.map(r => [r.id, r.nama]) : []);
  const alert = [...buka.map(r => ({...r, cstatus: r.cstatus ?? "baru"})), ...akhir.filter(r => r.csejak >= kini - FINAL_TAMPIL)];
  const out = {t: kini, hari: {tgl: tglWib(kini), ...rg}, alert, nama, finalHari: akhir.filter(r => r.csejak >= mulaiHari).length, bukaTerpotong: bukaT, akhirTerpotong: akhirT};
  return out;
}
export const namaOleh = (oleh, nama) => oleh == null ? null : oleh.startsWith("staf:") ? nama.get(oleh.slice(5)) ?? "staf" : NAMA_MOD;
const URUT = {baru: 0, dalam_konfirmasi: 1, ada_api: 2, tidak_ada_api: 2};
/* terlama atas untuk yang menunggu (baru menurut dibuat, dalam_konfirmasi menurut sejak), keputusan akhir terbaru atas */
const urut = (x, y) => URUT[x.cstatus] - URUT[y.cstatus] || (x.cstatus === "baru" ? x.dibuat - y.dibuat : x.cstatus === "dalam_konfirmasi" ? x.csejak - y.csejak : y.csejak - x.csejak);

/* memo isolat per kombinasi (jenis, dummy, wilayah). ttl: env.CC_MEMO_DETIK ("0" = mati) atau bawaan. */
const MEMO = new Map();
const ttl = (env, bawaan) => env.CC_MEMO_DETIK == null ? bawaan : Math.max(0, Number(env.CC_MEMO_DETIK) || 0) * 1000;
async function memo(env, jenis, a, kini, bawaan, buat) {
  const k = `${jenis}|${a.dummy ? 1 : 0}|${a.wil.join(",")}`, m = MEMO.get(k), t = ttl(env, bawaan);
  if (m && t > 0 && kini >= m.t && kini - m.t < t) return m.nilai;
  const nilai = await buat(); if (MEMO.size > 60) MEMO.clear(); MEMO.set(k, {t: kini, nilai}); return nilai;
}

/* ================================================================ kehadiran operator */
const HADIR_LOKAL = new Map();   // staf_id -> kapan isolat ini terakhir menulis (menghemat panggilan D1; SQL tetap menjaga satu tulis per 5 menit lintas isolat)
async function tandaiHadir(env, a, kini) {
  const id = a.staf.id, lokal = env.CC_MEMO_DETIK !== "0";
  if (lokal && kini - (HADIR_LOKAL.get(id) ?? -Infinity) < HADIR_TULIS) return;
  await env.DB.prepare("INSERT INTO cc_hadir (staf_id, terakhir, dummy) VALUES (?1, ?2, ?3) ON CONFLICT (staf_id) DO UPDATE SET terakhir = excluded.terakhir WHERE cc_hadir.terakhir < ?2 - ?4")
    .bind(id, kini, a.dummy ? 1 : 0, HADIR_TULIS).run();
  HADIR_LOKAL.set(id, kini);
}

/* ================================================================ GET /api/cc/antrean */
const bentukAlert = (r, a, nama) => ({id: r.id, prov: r.prov, prov_nama: PROV[r.prov]?.[1] ?? r.prov, kab: r.kab, kec: r.kec, n24: r.n24, luas_ha: r.luas_ha, dibuat: r.dibuat, status: r.cstatus,
  oleh_nama: namaOleh(r.coleh, nama), sejak: r.csejak ?? null, konfirmasi_lapangan: r.konfirmasi_pada != null, aksi: aksiBoleh(r.cstatus, a.tulis)});
async function antrean(env, req, kini) {
  const a = await pelaku(env, req, kini); if (a instanceof Response) return a;
  if (a.operator) await tandaiHadir(env, a, kini);
  const m = await memo(env, "r", a, kini, 5e3, () => muat(env, a, kini));
  return json({kini, hari: m.hari, saya: {nama: a.nama, tulis: a.tulis}, alert: [...m.alert].sort(urut).map(r => bentukAlert(r, a, m.nama)),
    antrean_terpotong: m.bukaTerpotong, final_terpotong: m.akhirTerpotong});
}

/* ================================================================ GET /api/cc/status?kunci=karhutla:<12 heks>:siaga */
const ID_KUNCI = new Map();   // id tugas -> kunci publik (sha256 tak berubah; dihitung sekali per id per isolat)
async function kunciDari(id) { let k = ID_KUNCI.get(id); if (!k) { k = await kunciPublikKarhutla(id); if (ID_KUNCI.size > 20000) ID_KUNCI.clear(); ID_KUNCI.set(id, k); } return k; }
const adaKredensial = req => /(?:^|;\s*)(?:sesi_staf|sesi_admin)=/.test(req.headers.get("cookie") || "") || req.headers.has("x-admin-token") || /^Bearer\s/i.test(req.headers.get("authorization") || "");
async function statusKunci(env, req, url, kini) {
  if (!adaKredensial(req)) return gagal(401, "belum masuk sebagai staf atau admin; masuk lagi");   // pop-up alarm publik memanggil rute ini di semua halaman: tamu ditolak tanpa menyentuh D1
  const a = await pelaku(env, req, kini); if (a instanceof Response) return a;
  const k = /^karhutla:([0-9a-f]{12}):siaga$/.exec(url.searchParams.get("kunci") || ""); if (!k) return gagal(400, "kunci harus karhutla:<12 heks>:siaga");
  const r = await denganBencana(async kecuali => { const S = saring(a, [kini - UMUR_ALERT]);
    return (await env.DB.prepare(`SELECT t.id FROM tugas_api t WHERE t.level = 3 AND t.dibuat >= ?1 ${kecuali} ${S.sql} ORDER BY t.dibuat DESC LIMIT 1000`).bind(...S.ikat).all()).results; });
  let id = null; for (const x of r) if (await kunciDari(x.id) === k[1]) { id = x.id; break; }
  if (!id) return gagal(404, "alert tidak ditemukan");
  const m = await bacaSatu(env, req, a, id, kini);
  return m ? json({id: m.id, prov: m.prov, kab: m.kab, status: m.cstatus, oleh_nama: m.oleh_nama, sejak: m.csejak ?? null, aksi: aksiBoleh(m.cstatus, a.tulis)}) : gagal(404, "alert tidak ditemukan");
}
/* satu alert (level 3, <= 7 hari, karhutla) yang boleh dilihat pelaku, dengan status cc dan nama pemegang; null bila bukan alert atau di luar jangkauan */
async function bacaSatu(env, req, a, id, kini) {
  const t = await denganBencana(kecuali => env.DB.prepare(`SELECT ${KOLOM_ALERT} FROM tugas_api t LEFT JOIN cc_status c ON c.tugas_id = t.id WHERE t.id = ?1 AND t.level = 3 AND t.dibuat >= ?2 ${kecuali}`).bind(id, kini - UMUR_ALERT).first());
  if (!t || (t.dummy && !a.dummy) || !dalamWilayahStaf(req, [t.prov])) return null;   // dummy bagi pelaku nyata dan di luar wilayah: sama dengan tidak ada
  return {...t, cstatus: t.cstatus ?? "baru", oleh_nama: await namaStaf(env, t.coleh)};
}
async function namaStaf(env, oleh) {
  if (oleh == null) return null;
  if (!oleh.startsWith("staf:")) return NAMA_MOD;
  return (await env.DB.prepare("SELECT nama FROM staf WHERE id = ?").bind(oleh.slice(5)).first())?.nama ?? "staf";
}

/* ================================================================ Meja Pantau (dipanggil src/pantau.js) */
/* Status tindak lanjut per tugas untuk kartu api di Meja Pantau. Alert = definisi bacaSatu() (karhutla, level 3, <= 7 hari; dummy dan wilayah menurut `a`), TANPA batas 12 jam keputusan akhir milik antrean:
   tugas yang diputuskan kemarin dan masih terbuka tetap alert, tidak boleh terbaca "bukan alert". Dibaca langsung dari D1 (bukan memo antrean 5 dtk), jadi muat ulang sesudah POST aksi selalu melihat keadaan baru.
   a = {wil, dummy, tulis}; nama = Map(id staf -> nama) yang sudah dimuat pemanggil. Mengembalikan Map(id tugas -> {status, oleh_nama, sejak, aksi}); id yang BUKAN alert tidak ada di Map; null = tabel cc belum ada.
   Hanya nama pemegang yang keluar (namaOleh: moderator = 'Moderator'), tidak pernah hash token moderator di cc_status.oleh. */
export async function alertUntukPantau(env, a, kini, ids, nama) {
  if (!ids.length) return new Map();
  try {
    const r = await denganBencana(kecuali => { const S = saring(a, [JSON.stringify(ids), kini - UMUR_ALERT]);
      return env.DB.prepare(`SELECT t.id, c.status cstatus, c.oleh coleh, c.sejak csejak FROM tugas_api t LEFT JOIN cc_status c ON c.tugas_id = t.id
        WHERE t.id IN (SELECT value FROM json_each(?1)) AND t.level = 3 AND t.dibuat >= ?2 ${kecuali} ${S.sql} LIMIT ${ids.length}`).bind(...S.ikat).all(); });
    return new Map(r.results.map(t => { const status = t.cstatus ?? "baru"; return [t.id, {status, oleh_nama: namaOleh(t.coleh, nama), sejak: t.csejak ?? null, aksi: aksiBoleh(status, a.tulis)}]; }));
  } catch (e) { if (/no such table: (main\.)?cc_/i.test(String(e?.message))) return null; throw e; }
}
/* Sebab tugas karhutla BUKAN alert, untuk keterangan operator di Meja Pantau (supaya kalimatnya tidak menuduh level padahal sebabnya umur):
   'level' = level bukan 3, 'umur' = level 3 tetapi dibuat > 7 hari lalu (UMUR_ALERT yang sama dengan alertUntukPantau). Id yang tidak terbaca atau lolos kedua syarat (sebabnya bencana, ditentukan pemanggil) tidak ada di Map.
   Satu kueri kunci utama, hanya dipanggil untuk tugas yang BUKAN alert; a = {wil, dummy} seperti alertUntukPantau. */
export async function sebabBukanAlert(env, a, kini, ids) {
  if (!ids.length) return new Map();
  const S = saring(a, [JSON.stringify(ids)]);
  const r = await env.DB.prepare(`SELECT t.id, t.level, t.dibuat FROM tugas_api t WHERE t.id IN (SELECT value FROM json_each(?1)) ${S.sql} LIMIT ${ids.length}`).bind(...S.ikat).all();
  return new Map(r.results.flatMap(t => t.level !== 3 ? [[t.id, "level"]] : t.dibuat < kini - UMUR_ALERT ? [[t.id, "umur"]] : []));
}
/* log tindak lanjut cc satu tugas untuk riwayat kartu api di Meja Pantau: hanya bila tugas itu alert bagi pemanggil (alertUntukPantau), terbaru dulu, nama pelaku lewat namaOleh (tanpa hash moderator) */
export async function jejakUntukPantau(env, a, kini, id, nama) {
  const A = await alertUntukPantau(env, a, kini, [id], nama); if (!A?.has(id)) return [];
  return (await env.DB.prepare("SELECT waktu, oleh, dari, ke, catatan FROM cc_jejak WHERE tugas_id = ? ORDER BY waktu DESC, id DESC LIMIT 100").bind(id).all()).results
    .map(r => ({waktu: r.waktu, oleh_nama: namaOleh(r.oleh, nama), dari: r.dari, ke: r.ke, catatan: r.catatan}));
}

/* ================================================================ POST /api/cc/aksi/:id {dari, ke, catatan?} */
async function aksi(env, req, id, kini) {
  const a = await pelaku(env, req, kini); if (a instanceof Response) return a;
  if (!a.tulis) return tolakBaca();
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const {dari, ke} = b.o;
  if (!STATUS.includes(dari)) return gagal(400, `dari harus salah satu dari ${STATUS.join("/")}`);
  if (!STATUS.includes(ke) || ke === "baru") return gagal(400, `ke harus salah satu dari ${STATUS.slice(1).join("/")}`);
  if (!TRANSISI[dari].includes(ke)) return gagal(400, `transisi ${dari} -> ${ke} tidak diizinkan (boleh: ${TRANSISI[dari].join("/")})`);
  const catatan = tx(b.o.catatan, 300); if (catatan === undefined) return gagal(400, "catatan harus teks, maksimal 300 karakter");
  if (FINAL.includes(dari) && (catatan?.length ?? 0) < 3) return gagal(400, "koreksi keputusan wajib bercatatan (3 sampai 300 karakter)");
  /* batas laju per pelaku SESUDAH validasi bentuk (salah ketik tidak menghabiskan jatah) dan SEBELUM membaca/menulis tugas; tiap panggilan yang lolos validasi dihitung, juga yang berakhir 404/409 */
  const lim = await laju(env, a.oleh, "cc.aksi", [[JAM, BATAS_AKSI_JAM]], kini); if (lim) return lim;
  const t = await bacaSatu(env, req, a, id, kini);
  if (!t) return gagal(404, "alert tidak ada, sudah lewat 7 hari, atau di luar wilayah Anda");   // bukan alert / di luar wilayah / dummy bagi pelaku nyata: satu jawaban
  const dummy = t.dummy ? 1 : 0;
  const r = await env.DB.batch([
    dari === "baru"
      ? env.DB.prepare("INSERT OR IGNORE INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, ?, ?, ?, ?)").bind(id, ke, a.oleh, kini, dummy)
      : env.DB.prepare("UPDATE cc_status SET status = ?, oleh = ?, sejak = ? WHERE tugas_id = ? AND status = ?").bind(ke, a.oleh, kini, id, dari),
    env.DB.prepare("INSERT INTO cc_jejak (waktu, tugas_id, oleh, dari, ke, catatan, dummy) SELECT ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0").bind(kini, id, a.oleh, dari, ke, catatan, dummy)]);
  MEMO.clear();   // pembaca di isolat ini langsung melihat keadaan baru
  if (!r[0].meta.changes) {   // kalah balapan: status sekarang bukan `dari`; tidak ada jejak yang tertulis
    const s = await env.DB.prepare("SELECT status, oleh, sejak FROM cc_status WHERE tugas_id = ?").bind(id).first();
    return json({galat: "status sudah berubah; muat ulang antrean", status: s?.status ?? "baru", oleh_nama: await namaStaf(env, s?.oleh), sejak: s?.sejak ?? null}, 409);
  }
  return json({id, status: ke, oleh_nama: a.nama, sejak: kini, aksi: aksiBoleh(ke, true)});
}

/* ================================================================ GET /api/cc/log?tgl=&operator=&format=csv */
/* kunci operator di log: staf:<id>, atau 'moderator' (SEMUA moderator; hash token mereka tidak pernah keluar, lihat kunciOleh) */
const RE_OPERATOR = /^(?:staf:[0-9A-Za-z]{1,32}|moderator)$/;
async function log(env, req, url, kini) {
  const a = await pelaku(env, req, kini); if (a instanceof Response) return a;
  const q = url.searchParams, tgl = q.get("tgl") ?? tglWib(kini), op = q.get("operator"), format = q.get("format") ?? "json";
  if (!tglSah(tgl)) return gagal(400, "tgl harus YYYY-MM-DD yang sah");
  if (op != null && !RE_OPERATOR.test(op)) return gagal(400, "operator harus staf:<id> atau moderator");
  if (!["json", "csv"].includes(format)) return gagal(400, "format harus json atau csv");
  /* batas laju per pelaku SESUDAH validasi bentuk (salah ketik tidak menghabiskan jatah) dan SEBELUM membaca jejak (kueri terberat modul ini: sampai BATAS_LOG baris + durasi); JSON dan CSV berbagi jatah */
  const lim = await laju(env, a.oleh, "cc.log", [[JAM, BATAS_LOG_JAM]], kini); if (lim) return lim;
  const modOp = op === KUNCI_MOD, rg = rentangHari(tgl), S = saring(a, op && !modOp ? [rg.mulai, rg.akhir, op] : [rg.mulai, rg.akhir]);
  /* LEFT JOIN: tugas yang sudah dibuang retensi 180 hari tetap terlihat di log (kab/prov kosong); staf berwilayah hanya melihat baris yang tugasnya ada di wilayahnya */
  const baris = (await env.DB.prepare(`SELECT j.id, j.waktu, j.tugas_id, j.oleh, j.dari, j.ke, j.catatan, t.kab, t.prov, t.dibuat FROM cc_jejak j LEFT JOIN tugas_api t ON t.id = j.tugas_id
    WHERE j.waktu >= ?1 AND j.waktu < ?2 ${modOp ? "AND j.oleh NOT LIKE 'staf:%'" : op ? "AND j.oleh = ?3" : ""} ${a.dummy ? "" : "AND j.dummy = 0"} ${a.wil.length ? `AND t.prov IN (SELECT value FROM json_each(?${S.ikat.length}))` : ""} ORDER BY j.waktu, j.id LIMIT ${BATAS_LOG + 1}`).bind(...S.ikat).all()).results;
  const terpotong = baris.length > BATAS_LOG; if (terpotong) baris.pop();
  /* durasi butuh seluruh riwayat tugasnya, termasuk jejak di luar jendela (dalam_konfirmasi 14.58, keputusan 15.03) */
  const tugas = [...new Set(baris.map(r => r.tugas_id))], dibuat = new Map(baris.map(r => [r.tugas_id, r.dibuat])), dur = new Map();
  if (tugas.length) {
    const per = new Map();
    for (const r of (await env.DB.prepare("SELECT id, tugas_id, waktu, dari, ke FROM cc_jejak WHERE tugas_id IN (SELECT value FROM json_each(?)) ORDER BY waktu, id LIMIT 20000").bind(JSON.stringify(tugas)).all()).results) (per.get(r.tugas_id) || per.set(r.tugas_id, []).get(r.tugas_id)).push(r);
    for (const [tid, js] of per) for (const j of durasiJejak(js, dibuat.get(tid))) dur.set(j.id, j);
  }
  const ids = [...new Set(baris.map(r => r.oleh).filter(o => o.startsWith("staf:")).map(o => o.slice(5)))];
  const nama = new Map(ids.length ? (await env.DB.prepare("SELECT id, nama FROM staf WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results.map(r => [r.id, r.nama]) : []);
  const jejak = baris.map(r => ({waktu: r.waktu, operator: kunciOleh(r.oleh), operator_nama: namaOleh(r.oleh, nama), kab: r.kab ?? null, prov: r.prov ?? null, prov_nama: r.prov ? PROV[r.prov]?.[1] ?? r.prov : null,
    dari: r.dari, ke: r.ke, catatan: r.catatan, durasi_ms: dur.get(r.id)?.ms ?? null, durasi_jenis: dur.get(r.id)?.jenis ?? null}));
  if (format === "csv") {
    const kepala = ["waktu_wib", "operator", "kab", "provinsi", "dari", "ke", "catatan", "durasi_ms"];
    const isi = jejak.map(j => [selCsv(wibTeks(j.waktu)), selCsv(j.operator_nama), selCsv(j.kab), selCsv(j.prov_nama), selCsv(j.dari), selCsv(j.ke), selCsv(j.catatan), j.durasi_ms ?? ""].join(","));
    /* log terpotong: berkas TIDAK lengkap, jadi diberi tiga penanda yang tak bisa terlewat: baris catatan terakhir, akhiran -terpotong pada nama berkas, dan header x-terpotong */
    if (terpotong) isi.push([selCsv(`CATATAN: log terpotong, berkas ini hanya memuat ${String(BATAS_LOG).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} baris pertama; persempit operator atau pilih tanggal lain untuk mendapat sisanya`), ...Array(kepala.length - 1).fill("")].join(","));
    return new Response("﻿" + [kepala.join(","), ...isi].join("\r\n") + "\r\n", {headers: {"content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff",
      "content-disposition": `attachment; filename="cc-log-${tgl}${terpotong ? "-terpotong" : ""}.csv"`, ...(terpotong ? {"x-terpotong": "1"} : {})}});
  }
  const per = new Map();
  for (const j of jejak) {
    const o = per.get(j.operator) || per.set(j.operator, {operator: j.operator, nama: j.operator_nama, aksi: 0, selesai: 0, respons: [], konfirmasi: []}).get(j.operator);
    o.aksi++; if (FINAL.includes(j.ke)) o.selesai++;
    if (j.durasi_jenis === "respons") o.respons.push(j.durasi_ms); else if (j.durasi_jenis === "konfirmasi") o.konfirmasi.push(j.durasi_ms);
  }
  return json({tgl, ...rg, jejak, terpotong, batas: BATAS_LOG, ringkasan: [...per.values()].map(({respons, konfirmasi, ...o}) => ({...o, median_respons_ms: median(respons), median_konfirmasi_ms: median(konfirmasi)}))});
}

/* ================================================================ GET /api/cc/kontak?prov=&kab= ATAU ?lokasi=<prov>|<kab> (berulang, maks 20) (hanya meja TULIS) */
/* Hanya nomor KANTOR / Pusdalops BPBD. Buku kontak (kontak_pemangku, src/kontak.js) memuat ORANG: kolom `wa` adalah seluler pribadi (wajib seluler Indonesia), `telepon` berlabel "Telepon kantor" di formnya.
   Maka dari buku kontak hanya keluar entri kategori 'bpbd' yang (a) bernama unit: LABEL_KANTOR cocok di `nama` atau `lembaga`, BUKAN di `jabatan` (orang berjabatan "Operator Pusdalops", "Kepala Pusdalops",
   "Piket" tidak lolos), dan (b) bernomor `telepon` (kantor); `wa`, e-mail, dan ajudan bahkan tidak dibaca dari D1, jadi tak ada jalur kembali ke nomor pribadi. Cadangan: /data/bpbd.json (BNPB peta_bpbd), hanya nilai yang berbentuk nomor telepon. */
const LABEL_KANTOR = /pusdalops|posko|pusat (?:operasi|kendali)|ruang (?:operasi|kendali|komando)|kantor|call ?center|hotline|piket|sekretariat/i;
const nk = s => String(s ?? "").toLowerCase().replace(/^(?:kabupaten|kab\.?)\s+/, "").replace(/[^a-z0-9]/g, "");
export function nomorDari(s) {
  const out = [];
  for (const m of String(s ?? "").matchAll(/\+?\d[\d ()-]{4,18}\d/g)) { const d = m[0].replace(/\D/g, ""); if (d.length >= 7 && d.length <= 15) out.push(m[0].replace(/\s+/g, " ").trim()); }
  return out;
}
let BPBD = null;
async function bpbdJson(env) {
  if (BPBD) return BPBD;
  try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal/data/bpbd.json")); if (r.ok) { const j = await r.json(); if (Array.isArray(j.kantor)) return (BPBD = j.kantor); } } catch (e) { console.error("cc bpbd.json", e?.message); }
  return [];
}
/* satu pasangan prov/kab -> {prov, kab} atau Response galat. Urutan: bentuk prov (400), bentuk kab (400), wilayah staf (403). */
function cekLokasi(req, prov, kabMentah) {
  const kab = kabMentah == null ? null : tx(kabMentah, 60);
  if (!Object.hasOwn(PROV, prov)) return gagal(400, "prov harus kode provinsi BPS 2 digit");
  if (kab === undefined || (kab !== null && kab.length < 2)) return gagal(400, "kab 2 sampai 60 karakter");
  if (!dalamWilayahStaf(req, [prov])) return gagal(403, "provinsi di luar wilayah Anda");
  return {prov, kab};
}
/* ?prov=&kab= (satu lokasi; respons {prov, kab, kontak}) ATAU ?lokasi=<prov>|<kab>&lokasi=... (maks MAKS_LOKASI, kab boleh dikosongkan; respons {lokasi: [{prov, kab, kontak}]} searah permintaan) */
function bacaLokasi(req, q) {
  const ganda = q.getAll("lokasi");
  if (!ganda.length) { const l = cekLokasi(req, q.get("prov") || "", q.get("kab")); return l instanceof Response ? l : {daftar: [l], banyak: false}; }
  if (q.has("prov") || q.has("kab")) return gagal(400, "pakai lokasi (boleh berulang) ATAU prov/kab, jangan keduanya");
  if (ganda.length > MAKS_LOKASI) return gagal(400, `lokasi maksimal ${MAKS_LOKASI} per panggilan`);
  const daftar = [];
  for (const s of ganda) { const i = s.indexOf("|"), l = cekLokasi(req, i < 0 ? s : s.slice(0, i), i < 0 ? null : s.slice(i + 1)); if (l instanceof Response) return l; daftar.push(l); }
  return {daftar, banyak: true};
}
const huruf = s => String(s).replace(/[A-Z]/g, c => c.toLowerCase());   // lower() SQLite: hanya ASCII, jadi pembanding JS yang sama
/* nomor satu lokasi dari baris buku kontak yang sudah dibaca (R, semua lokasi sekaligus) dan bpbd.json (B) */
function kontakLokasi({prov, kab}, R, B) {
  const out = [], sudah = new Set(), tambah = (tingkat, label, nomor, sumber) => { const d = String(nomor).replace(/\D/g, ""); if (!sudah.has(d)) { sudah.add(d); out.push({tingkat, label, nomor, sumber}); } };
  for (const r of R.filter(r => r.prov === prov && (r.kab == null || huruf(r.kab) === huruf(kab ?? ""))).slice(0, 100)) {
    const label = [r.nama, r.lembaga].find(x => x && LABEL_KANTOR.test(x)); if (!label) continue;   // tidak bernama unit (orang): tidak keluar
    tambah(r.kab ? "kabupaten" : "provinsi", label, r.telepon, "buku_kontak");
  }
  const P = B.filter(k => k.prov === prov), prop = P.filter(k => /provinsi/i.test(k.nama)), kabs = kab ? P.filter(k => !/provinsi/i.test(k.nama) && nk(k.kab) === nk(kab)) : [];
  for (const [tingkat, daftar] of [["kabupaten", kabs], ["provinsi", prop]]) for (const k of daftar) for (const n of nomorDari(k.pusdalops)) tambah(tingkat, `Pusdalops ${/^BPBD\b/i.test(String(k.nama).trim()) ? "" : "BPBD "}${k.nama}`.replace(/\s+/g, " ").trim(), n, "bpbd_json");
  return out.sort((x, y) => (x.tingkat === "kabupaten" ? 0 : 1) - (y.tingkat === "kabupaten" ? 0 : 1));
}
async function kontak(env, req, url, kini) {
  const a = await pelaku(env, req, kini); if (a instanceof Response) return a;
  if (!a.tulis) return gagal(403, "nomor BPBD hanya untuk operator command center");
  const L = bacaLokasi(req, url.searchParams); if (L instanceof Response) return L;
  const lim = await laju(env, a.oleh, "cc.kontak", [[JAM, 120]], kini); if (lim) return lim;   // per PANGGILAN, berapa pun lokasinya: meja memuat semua lokasi antrean dalam satu-dua panggilan
  let R = [];
  try {
    R = (await env.DB.prepare("SELECT prov, kab, nama, lembaga, telepon FROM kontak_pemangku WHERE status = 'aktif' AND kategori = 'bpbd' AND telepon IS NOT NULL AND prov IN (SELECT value FROM json_each(?1)) AND (kab IS NULL OR lower(kab) IN (SELECT value FROM json_each(?2))) ORDER BY kab IS NULL LIMIT ?3")
      .bind(JSON.stringify([...new Set(L.daftar.map(l => l.prov))]), JSON.stringify([...new Set(L.daftar.map(l => huruf(l.kab ?? "")))]), 100 * L.daftar.length).all()).results;
  } catch (e) { if (!/no such table: kontak_pemangku/i.test(String(e?.message))) throw e; }   // buku kontak belum ada: cadangan saja
  const B = await bpbdJson(env), hasil = L.daftar.map(l => ({prov: l.prov, kab: l.kab, kontak: kontakLokasi(l, R, B)}));
  return json(L.banyak ? {lokasi: hasil} : hasil[0]);
}

/* ================================================================ retensi (cron menit 17, sekali sehari jam 04 UTC) */
export async function bersihkanCc(env, kini = Date.now(), {paksa = false} = {}) {
  if (!paksa && new Date(kini).getUTCHours() !== JAM_BERSIH_UTC) return {lewat: "bukan jamnya"};
  try {
    const jejak = (await env.DB.prepare("DELETE FROM cc_jejak WHERE waktu < ?").bind(kini - SIMPAN_JEJAK).run()).meta.changes;   // trigger mengizinkan hanya baris > 2 tahun menurut jam D1 (atau dummy)
    const status = (await env.DB.prepare("DELETE FROM cc_status WHERE sejak < ?").bind(kini - SIMPAN_JEJAK).run()).meta.changes;
    const hadir = (await env.DB.prepare("DELETE FROM cc_hadir WHERE terakhir < ?").bind(kini - SIMPAN_HADIR).run()).meta.changes;
    return {jejak, status, hadir};
  } catch (e) { if (/no such table: cc_/i.test(String(e?.message))) return {lewat: "migrasi command center belum diterapkan"}; throw e; }
}

/* ================================================================ halaman */
const H_HAL = {"content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", vary: "cookie", "x-robots-tag": "noindex, nofollow", "referrer-policy": "same-origin", "x-content-type-options": "nosniff", "x-frame-options": "DENY"};
const polos403 = () => new Response(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Command center, Centurisk97</title></head><body><p>Akunmu tidak punya akses ke command center.</p></body></html>`, {status: 403, headers: {...H_HAL, "content-security-policy": CSP_ADMIN}});
const alihkan = ke => new Response(null, {status: 303, headers: {location: ke, "cache-control": "no-store"}});
/* pelaku() memutuskan: Response 401 = tamu (dialihkan ke layar masuk), Response lain = sesi sah tanpa hak (403 polos) */
async function halamanMeja(env, req, url, kini) {
  const a = await pelaku(env, req, kini);
  if (a instanceof Response) return a.status === 401 ? alihkan("/admin/pantau?ke=" + encodeURIComponent(url.pathname + url.search)) : polos403();
  return new Response(halamanCc(a.staf ? {nama: a.staf.nama, peran: a.staf.peran} : undefined), {headers: {...H_HAL, "content-security-policy": CSP_ADMIN}});
}

/* ================================================================ rute (digabung ke RUTE di src/worker.js) */
const bungkus = f => async (...a) => {
  try { return await f(...a); }
  catch (e) {
    if (/no such table: (main\.)?cc_/i.test(String(e?.message || e))) { console.error("cc: tabel belum ada:", e?.message); return gagal(503, "command center belum diaktifkan (migrasi D1 belum diterapkan)"); }
    if (tanpaTabel(e)) return gagal(503, "fitur instansi belum diaktifkan (migrasi D1 belum diterapkan)");
    throw e;
  }
};
export const RUTE_CC = Object.fromEntries(Object.entries({
  "GET /api/cc/antrean": (env, req, url, kini) => antrean(env, req, kini),
  "GET /api/cc/status": (env, req, url, kini) => statusKunci(env, req, url, kini),
  "POST /api/cc/aksi/:id": (env, req, url, kini, ctx, id) => aksi(env, req, id, kini),
  "GET /api/cc/log": (env, req, url, kini) => log(env, req, url, kini),
  "GET /api/cc/kontak": (env, req, url, kini) => kontak(env, req, url, kini),
  "GET /command-center": (env, req, url, kini) => halamanMeja(env, req, url, kini),
  "GET /admin/command-center": () => alihkan("/command-center"),   // entri menu admin (HALAMAN_STAF) hanya meneruskan
}).map(([k, f]) => [k, bungkus(f)]));
