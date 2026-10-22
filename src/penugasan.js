/* Penugasan orang ke tugas api dan pelacak posisi lewat tautan. Skema: migrations/0035_penugasan.sql. Aturan pemilik (21 Okt 2026, pola gemah-ripah antar/[token] dan pangantara kdmp_links):
   - Akun instansi aktif menugaskan orang (driver, ketua regu, anggota) ke tugas api: nama, peran, WA, jumlah orang. Worker membuat tautan /lacak/<token>: token 18 byte acak (36 hex),
     TAMPIL SEKALI ke akun yang menugaskan, hanya sha256-nya disimpan. Status aktif/dicabut/selesai, kedaluwarsa (default 48 jam), dibuka_pada. Tombol WA hanya membuka wa.me (tidak ada kiriman otomatis).
   - /lacak/<token> tanpa login: halaman statis (public/lacak.html). API-nya membawa token di header `x-lacak` (bukan di URL, supaya tidak masuk log): info, centang butir, berangkat, posisi, tiba, selesai.
   - Posisi: ditolak 410 bila tautan dicabut/selesai/kedaluwarsa, 409 sebelum "Mulai berangkat"; lat/lon dalam kotak Indonesia (0,0 ditolak), akurasi 0 sampai 5000 (selain itu null);
     batas 4 per menit per token dan 300 per menit per IP; tabel hanya menambah; retensi 30 hari di cron bersih-bersih; geofence: tiba otomatis bila <= 300 m dari api dengan akurasi <= 300 m.
   - Privasi: posisi hanya terlihat akun pemilik tugas (wilayah), moderator, dan staf pusdalops/verifikator wilayah itu; berhenti saat selesai/dicabut. WA orang yang ditugaskan hanya untuk akun pemilik.
   - Checklist persiapan disusun Worker dari rekomendasi.kebutuhan, kunci `akses`, dan daftar baku; butir yang dicentang tersimpan dengan stempel waktu (peringatan, bukan pemblokir, saat berangkat).
   ponytail: batas 4 per menit per token baca-lalu-tulis (serentak bisa lolos satu-dua); ETA kasar = garis lurus x 1,3 pada 30 km/jam, bukan routing jalan. */
import {json, gagal, acak, sha, bacaBody, normalWA, ipHash} from "./worker.js";
import {tx, num} from "./posko.js";
import {laju} from "./bnpb.js";
import {km} from "./titik.js";
import {akunAktif, tugasDalam, dalamLingkup, jsonAman} from "./instansi.js";
import {modAtauStaf, dalamWilayahStaf, stafNyata, P_VALIDASI} from "./staf.js";
import {gudangTerdekat} from "./inventaris.js";

const MENIT = 60e3, JAM = 36e5, HARI = 24 * JAM;
const BBOX = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};
export const BATAS = {jedaKlienMs: 45e3, posisiPerMenitToken: 4, posisiPerMenitIp: 300, retensiHari: 30, jejakMaks: 200, tibaMeter: 300, tibaAkurasiMeter: 300, kedaluwarsaJam: 48, kedaluwarsaMaksJam: 168, maksPerTugas: 40, etaKmJam: 30, etaFaktorJalan: 1.3, airLiterPerOrangHari: 5}   // 5 = sama dengan operasi.py koef air_minum mid (Sphere, dipakai taktik.py); uji paritas membaca operasi.py;
export const PERAN = {driver: "Driver", ketua_regu: "Ketua regu", anggota: "Anggota", lainnya: "Lainnya"};
/* L2 usulan penugasan dan L3 keselamatan regu (docs/bnpb/RENCANA-OPERASI-LAPANGAN.md). Semua ambang di sini; uji membaca nilainya. */
export const USULAN = {kakiKmJam: 3, rosterHari: 60, bebanHari: 7, posisiMaksJam: 24, maks: 20, barisMaks: 600};
export const KESELAMATAN = {sunyiMenit: 30, rotasiJam: 12, daruratAktifJam: 6, daruratPer10Menit: 5, anginJamDepan: 6, anginSudut: 45, anginWsKmj: 15, anginGustKmj: 25, anginJarakKm: 15, anginPosisiMaksMenit: 60};
export const JENIS_DARURAT = {cedera: "Cedera", terkepung_api: "Terkepung api", tersesat: "Tersesat", lainnya: "Keadaan darurat lainnya"};
export const STATUS_PENUGASAN = ["aktif", "dicabut", "selesai"];
const RE_TOKEN = /^[0-9a-f]{36}$/, RE_ID = /^[0-9a-f]{16}$/, RE_KUNCI = /^[a-z0-9_]{1,30}$/;
const tolakMod = () => gagal(403, "fitur ini hanya untuk moderator ke atas atau staf wilayah (bukan akun gerbang situs)");
const TANPA_TABEL = /no such table: (main\.)?penugasan/i;   // "main." muncul bila tabel induk yang hilang (FK)
const bulat1 = x => Math.round(x * 10) / 10;

/* ================================================================ checklist persiapan (murni) */
const tengah = v => { const m = Array.isArray(v) ? (v.length === 3 ? v[1] : v[0]) : v; return typeof m === "number" && Number.isFinite(m) ? m : null; };
const ang = n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
/* Butir = [{k, teks, wajib}]. `t.rekomendasi` dan `t.akses` boleh objek atau string JSON (baris D1 mentah). Butir kebutuhan hanya ada bila pipeline memberi angkanya;
   butir `bawa` mengikuti daftar barang yang dipikul di akses. Kunci tetap (a-z0-9_) karena dipakai sebagai kunci JSON checklist. */
export function susunChecklist(t, orang = 1) {
  const rek = typeof t.rekomendasi === "string" ? jsonAman(t.rekomendasi) : t.rekomendasi, ak = typeof t.akses === "string" ? jsonAman(t.akses) : t.akses;
  const n = Math.max(1, Math.min(200, Math.round(Number(orang)) || 1)), air = n * BATAS.airLiterPerOrangHari, tot = rek?.kebutuhan?.total, en = rek?.kebutuhan?.energi;
  const out = [{k: "apd", teks: "APD lengkap: helm, sepatu bot, sarung tangan, baju tahan api", wajib: true},
    {k: "n95", teks: `Masker N95 untuk tiap orang (${n} buah), asap gambut berbahaya`, wajib: true},
    {k: "air_minum", teks: `Air minum ${ang(air)} liter (${n} orang, ${BATAS.airLiterPerOrangHari} liter per orang per hari, perkiraan)`, wajib: true},
    {k: "makanan", teks: "Makanan dan bekal untuk satu hari penuh", wajib: true}];
  const pompa = tot ? (Array.isArray(tot.pompa) ? tot.pompa.reduce((a, p) => a + (tengah(p?.unit) ?? 0), 0) : tengah(tot.pompa)) : null, bbm = tengah(en?.bbm_l_hari), selang = tengah(tot?.selang_m), jet = tengah(tot?.jet_shooter), lance = tengah(tot?.lance_cm);
  if (pompa > 0) out.push({k: "pompa", teks: `Pompa ${ang(pompa)} unit sudah dicek dan berfungsi (perkiraan kebutuhan seluruh tugas, bukan jatah satu regu)`, wajib: true});
  if (bbm > 0) out.push({k: "bbm", teks: `BBM pompa sekitar ${ang(bbm)} liter per hari (perkiraan kebutuhan seluruh tugas)`, wajib: true});
  if (selang > 0) out.push({k: "selang", teks: `Selang sekitar ${ang(selang)} meter (perkiraan kebutuhan seluruh tugas)`, wajib: true});
  if (jet > 0) out.push({k: "jet_shooter", teks: `Jet shooter ${ang(jet)} unit${lance > 0 ? ` dan lance ${ang(lance)} cm` : ""} (perkiraan kebutuhan seluruh tugas)`, wajib: true});
  const pem = rek?.kebutuhan?.pembasah, lPem = pem && pem.perlu === true ? tengah(pem.konsentrat_l_hari) : null;
  if (lPem > 0) out.push({k: "pembasah", teks: `Bahan pembasah konsentrat sekitar ${ang(lPem)} liter per hari + inductor/proportioner (gambut kering menolak air; disarankan, bukan wajib)`, wajib: false, saran: true});
  out.push({k: "p3k", teks: "Kotak P3K lengkap", wajib: true}, {k: "gps_ht", teks: "GPS atau ponsel berbaterai penuh, HT, dan baterai cadangan", wajib: true}, {k: "senter", teks: "Senter atau lampu kepala", wajib: false},
    {k: "rute", teks: "Rute dicek: lihat kartu akses dan tombol Navigasi", wajib: true}, {k: "cuaca", teks: "Cuaca dan arah angin dicek", wajib: false},
    {k: "komandan", teks: "Sudah lapor ke komandan atau pimpinan regu", wajib: true}, {k: "darurat", teks: "Nomor darurat dicatat: 112, Pusdalops BPBD, dan komandan", wajib: true});
  if (Array.isArray(ak?.bawa)) ak.bawa.slice(0, 12).forEach((b, i) => { if (b && typeof b.barang === "string") out.push({k: "bawa_" + i, teks: `Bawa ${b.barang.slice(0, 60)}${Number.isFinite(b.jumlah) ? ` ${ang(b.jumlah)}` : ""}${typeof b.satuan === "string" ? " " + b.satuan.slice(0, 12) : ""}`, wajib: false}); });
  return out;
}
const ringkasChecklist = (butir, cek) => { const w = butir.filter(b => b.wajib); return {wajib: w.length, wajib_centang: w.filter(b => cek[b.k] != null).length, belum_wajib: w.filter(b => cek[b.k] == null).map(b => b.k), total: butir.length, centang: butir.filter(b => cek[b.k] != null).length}; };

/* ================================================================ bentuk keluaran */
const statusEfektif = (p, kini) => p.status === "aktif" && p.kedaluwarsa <= kini ? "kedaluwarsa" : p.status;
/* jarak ke api dan ETA kasar: hanya selama masih berangkat (belum tiba, belum selesai) */
export function jarakEta(posisi, t, p, kini) {
  if (!posisi) return {jarak_km: null, eta_menit: null};
  const j = bulat1(km(posisi.lat, posisi.lon, t.lat, t.lon)), jalan = p.berangkat_pada != null && p.tiba_pada == null && statusEfektif(p, kini) === "aktif";
  return {jarak_km: j, eta_menit: jalan ? Math.max(1, Math.round(j * BATAS.etaFaktorJalan / BATAS.etaKmJam * 60)) : null};
}
function bentukPenugasan(p, t, jejak, kini, akunId, darurat = null) {
  const tampilWA = akunId != null && p.akun_id === akunId;   // WA hanya untuk akun PEMBUATNYA (akun lain sekabupaten pun tidak)
  const cek = jsonAman(p.checklist) ?? {}, akhir = jejak.length ? jejak[jejak.length - 1] : null, butir = susunChecklist(t, p.orang);
  return {id: p.id, nama: p.nama, peran: p.peran, orang: p.orang, ...(tampilWA ? {wa: p.wa} : {}), status: statusEfektif(p, kini), dibuat: p.dibuat, kedaluwarsa: p.kedaluwarsa, dibuka_pada: p.dibuka_pada,
    berangkat_pada: p.berangkat_pada, tiba_pada: p.tiba_pada, selesai_pada: p.selesai_pada, checklist: cek, butir, ringkas: ringkasChecklist(butir, cek),
    posisi: akhir && {lat: akhir.lat, lon: akhir.lon, akurasi: akhir.akurasi, pada: akhir.pada}, jejak: jejak.map(x => [x.lat, x.lon, x.pada]), ...jarakEta(akhir, t, p, kini), darurat, dummy: p.dummy};
}
/* n posisi terbaru tiap penugasan lewat indeks penugasan_posisi_jejak (penugasan_id, pada DESC): satu SELECT ... LIMIT per penugasan, dikirim sebagai batch.
   Pengganti row_number() OVER (PARTITION BY ...) yang memindai semua baris penugasan itu. Map id -> baris urut pada MENURUN; sejak = hanya pada > sejak. */
async function posisiTerbaru(env, ids, n, sejak = 0) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const potong = ids.slice(i, i + 50), rs = await env.DB.batch(potong.map(id => env.DB.prepare("SELECT lat, lon, akurasi, pada FROM penugasan_posisi WHERE penugasan_id = ?1 AND pada > ?2 ORDER BY pada DESC LIMIT ?3").bind(id, sejak, n)));
    potong.forEach((id, k) => out.set(id, rs[k].results));
  }
  return out;
}
/* penugasan satu tugas + jejak terakhir (<= 200 titik tiap orang, urut waktu naik) */
async function daftarUntukTugas(env, t, kini, akunId) {
  const P = (await env.DB.prepare("SELECT * FROM penugasan WHERE tugas_id = ? ORDER BY dibuat DESC LIMIT ?").bind(t.id, BATAS.maksPerTugas).all()).results;
  if (!P.length) return [];
  const per = new Map([...await posisiTerbaru(env, P.map(p => p.id), BATAS.jejakMaks)].map(([id, r]) => [id, r.reverse()]));   // urut waktu naik
  const dar = new Map();   // darurat terbaru (<= 6 jam) per penugasan; tabel 0038 belum ada = tidak ada darurat
  try { for (const x of (await env.DB.prepare("SELECT penugasan_id, jenis, lat, lon, pada FROM penugasan_darurat WHERE pada > ? AND penugasan_id IN (SELECT value FROM json_each(?)) ORDER BY pada DESC")
    .bind(kini - KESELAMATAN.daruratAktifJam * JAM, JSON.stringify(P.map(p => p.id))).all()).results) if (!dar.has(x.penugasan_id)) dar.set(x.penugasan_id, {jenis: x.jenis, label: JENIS_DARURAT[x.jenis], lat: x.lat, lon: x.lon, pada: x.pada}); }
  catch (e) { if (!TANPA_TABEL.test(String(e?.message || e))) throw e; }
  return P.map(p => bentukPenugasan(p, t, per.get(p.id), kini, akunId, dar.get(p.id) ?? null));
}

/* ================================================================ sisi akun instansi (sesi) */
const pesanTugas = (t, p, tautan, kedaluwarsa) => {
  const tempat = [t.kec, t.kab].filter(Boolean).join(", "), sampai = new Date(kedaluwarsa).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"});
  return `Yth. ${p.nama}. Anda ditugaskan ke titik api di ${tempat} (koordinat ${Number(t.lat).toFixed(4)}, ${Number(t.lon).toFixed(4)}) sebagai ${PERAN[p.peran].toLowerCase()}. Buka tautan ini untuk checklist persiapan, navigasi, dan berbagi posisi saat berangkat: ${tautan} `
    + `Tautan berlaku sampai ${sampai} WIB. Jangan bagikan tautan ini ke orang lain. Hati-hati di jalan.`;
};
const tautanWa = (no, teks) => `https://wa.me/${no ?? ""}?text=${encodeURIComponent(teks)}`;
function jamKedaluwarsa(v) { const j = num(v ?? BATAS.kedaluwarsaJam, 1, BATAS.kedaluwarsaMaksJam, true); return j == null || Number.isNaN(j) ? null : j; }
async function tokenBaru() { const token = acak(18); return {token, sha: await sha(token)}; }

async function buat(env, req, url, kini, id) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const t = await tugasDalam(env, a, id); if (t instanceof Response) return t;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, nama = tx(o.nama, 80); if (!nama || nama.length < 2) return gagal(400, "nama orang yang ditugaskan 2-80 karakter");
  if (!Object.hasOwn(PERAN, o.peran)) return gagal(400, `peran harus ${Object.keys(PERAN).join("/")}`);
  let wa = null; if (o.wa != null && o.wa !== "") { wa = normalWA(o.wa); if (!wa) return gagal(400, "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)"); }
  const orang = num(o.orang ?? 1, 1, 200, true); if (orang == null || Number.isNaN(orang)) return gagal(400, "jumlah orang bilangan bulat 1-200");
  const jam = jamKedaluwarsa(o.jam); if (jam == null) return gagal(400, `masa berlaku tautan 1-${BATAS.kedaluwarsaMaksJam} jam`);
  if (t.status !== "buka") return gagal(409, "tugas ini sudah ditutup; penugasan baru tidak bisa dibuat");
  if ((await env.DB.prepare("SELECT count(*) n FROM penugasan WHERE tugas_id = ?").bind(id).first()).n >= BATAS.maksPerTugas) return gagal(409, `satu tugas maksimal ${BATAS.maksPerTugas} penugasan; cabut yang tidak terpakai`);
  const l = await laju(env, a.id, "instansi.tugaskan", [[JAM, 60]], kini); if (l) return l;
  const {token, sha: th} = await tokenBaru(), pid = acak(8), kedaluwarsa = kini + jam * JAM;
  await env.DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, wa, orang, token_sha, dibuat, kedaluwarsa, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(pid, id, a.id, nama, o.peran, wa, orang, th, kini, kedaluwarsa, a.dummy ? 1 : 0).run();
  return json(hasilTautan(url, t, {id: pid, nama, peran: o.peran, wa}, token, kedaluwarsa), 201);   // token hanya di respons ini
}
function hasilTautan(url, t, p, token, kedaluwarsa) {
  const tautan = `${url.origin}/lacak#${token}`, pesan = pesanTugas(t, p, tautan, kedaluwarsa);   // token di fragmen: tidak ikut ke server, log, atau Referer
  return {id: p.id, token, tautan, kedaluwarsa, wa: {tautan: tautanWa(p.wa, pesan), pesan}};
}
async function daftarAkun(env, req, kini, id) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const t = await tugasDalam(env, a, id); if (t instanceof Response) return t;
  return json({kini, penugasan: await daftarUntukTugas(env, t, kini, a.id), peran: PERAN, batas: BATAS});
}
/* penugasan yang tugasnya di lingkup akun, atau 404 yang sama untuk "tidak ada" dan "wilayah lain" */
async function milikAkun(env, a, pid) {
  const p = await env.DB.prepare("SELECT p.*, t.prov, t.kab, t.kec, t.lat, t.lon, t.status tstatus, t.rekomendasi, t.akses, t.dummy tdummy FROM penugasan p JOIN tugas_api t ON t.id = p.tugas_id WHERE p.id = ?").bind(pid).first();
  return p && dalamLingkup(a, {prov: p.prov, kab: p.kab, dummy: p.tdummy}) ? p : gagal(404, "penugasan tidak ada");
}
async function cabut(env, req, kini, pid) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const p = await milikAkun(env, a, pid); if (p instanceof Response) return p;
  if (p.akun_id !== a.id) return gagal(403, "hanya akun yang membuat penugasan ini yang boleh mencabutnya");
  const r = await env.DB.prepare("UPDATE penugasan SET status = 'dicabut' WHERE id = ? AND status = 'aktif'").bind(pid).run();
  return r.meta.changes ? json({id: pid, status: "dicabut"}) : gagal(409, `penugasan sudah ${p.status}`);
}
/* terbitkan ulang: token BARU (yang lama mati), aktif lagi, masa berlaku baru, berangkat dan tiba dikosongkan; checklist tetap */
async function terbitUlang(env, req, url, kini, pid) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const p = await milikAkun(env, a, pid); if (p instanceof Response) return p;
  if (p.akun_id !== a.id) return gagal(403, "hanya akun yang membuat penugasan ini yang boleh menerbitkan ulang tautannya");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  const jam = jamKedaluwarsa(b.o.jam); if (jam == null) return gagal(400, `masa berlaku tautan 1-${BATAS.kedaluwarsaMaksJam} jam`);
  if (p.tstatus !== "buka") return gagal(409, "tugas ini sudah ditutup; tautan tidak bisa diterbitkan ulang");
  const l = await laju(env, a.id, "instansi.tugaskan", [[JAM, 60]], kini); if (l) return l;
  const {token, sha: th} = await tokenBaru(), kedaluwarsa = kini + jam * JAM;
  await env.DB.prepare("UPDATE penugasan SET token_sha = ?, status = 'aktif', kedaluwarsa = ?, dibuka_pada = NULL, berangkat_pada = NULL, tiba_pada = NULL, selesai_pada = NULL WHERE id = ?").bind(th, kedaluwarsa, pid).run();
  return json(hasilTautan(url, p, {...p, wa: p.akun_id === a.id ? p.wa : null}, token, kedaluwarsa), 201);
}
/* centang oleh akun (misalnya dari /instansi saat membantu persiapan); sumber kebenaran daftar butir = susunChecklist */
async function centangCore(env, p, o, kini) {
  const k = typeof o.k === "string" ? o.k : "", butir = susunChecklist(p, p.orang);
  if (!RE_KUNCI.test(k) || !butir.some(b => b.k === k)) return gagal(400, "butir tidak dikenal untuk tugas ini");
  const ya = o.ya !== false;
  await env.DB.prepare(ya ? "UPDATE penugasan SET checklist = json_set(checklist, '$.' || ?1, ?2) WHERE id = ?3" : "UPDATE penugasan SET checklist = json_remove(checklist, '$.' || ?1) WHERE id = ?3").bind(k, kini, p.id).run();
  const cek = jsonAman((await env.DB.prepare("SELECT checklist FROM penugasan WHERE id = ?").bind(p.id).first()).checklist) ?? {};
  return json({k, ya, checklist: cek, ringkas: ringkasChecklist(butir, cek)});
}
async function centangAkun(env, req, kini, pid) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const p = await milikAkun(env, a, pid); if (p instanceof Response) return p;
  if (p.status !== "aktif") return gagal(409, `penugasan sudah ${p.status}`);
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  return centangCore(env, p, b.o, kini);
}
/* sisi admin: moderator atau staf pusdalops/verifikator dalam wilayahnya. Tanpa WA orang yang ditugaskan. */
async function daftarAdmin(env, req, kini, id) {
  if (!await modAtauStaf(env, req, P_VALIDASI)) return tolakMod();
  const t = await env.DB.prepare("SELECT id, prov, kab, kec, lat, lon, rekomendasi, akses, dummy FROM tugas_api WHERE id = ?").bind(id).first();
  if (!t || !dalamWilayahStaf(req, [t.prov]) || (stafNyata(req) && t.dummy)) return gagal(404, "tugas tidak ada");
  return json({kini, penugasan: await daftarUntukTugas(env, t, kini, null)});
}

/* ================================================================ L2 usulan penugasan */
/* Waktu tempuh perkiraan (menit) dari asal ke tugas t. asal = {lat, lon, nama?, pos: bool}. Asal pos (gudang/posko/daops) yang namanya ada di t.akses.dari (graf jalan+sungai akses.json,
   salinan di tugas_api.akses) memakai jam graf itu; selain itu garis lurus x 1,3 pada 30 km/jam. Keduanya ditambah kaki_km pada 3 km/jam. null bila asal tak diketahui.
   ponytail: graf hanya terbaca bila asal = pangkalan yang tercantum di akses tugas (1 sampai 5 pangkalan); jalur lain jatuh ke garis lurus. */
export function tempuhMenit(asal, t) {
  if (!asal || !Number.isFinite(asal.lat) || !Number.isFinite(asal.lon)) return null;
  const ak = typeof t.akses === "string" ? jsonAman(t.akses) : t.akses, kakiKm = Number.isFinite(ak?.kaki_km) ? ak.kaki_km : 0, kaki = kakiKm / USULAN.kakiKmJam * 60, nm = String(asal.nama ?? "").toLowerCase().trim();
  const g = asal.pos && nm ? [].concat(ak?.dari ?? []).find(d => d && Number.isFinite(d.jam) && ((d.dari && String(d.dari).toLowerCase().trim() === nm) || (d.kode && nm.includes(String(d.kode).toLowerCase())))) : null;
  const jarak = km(asal.lat, asal.lon, t.lat, t.lon);
  return g ? {menit: Math.round(g.jam * 60 + kaki), cara: "graf", jarak_km: bulat1(jarak)}
    : {menit: Math.round(jarak * BATAS.etaFaktorJalan / BATAS.etaKmJam * 60 + kaki), cara: "garis_lurus", jarak_km: bulat1(jarak)};
}
const RUMUS_USULAN = `Perkiraan, bukan rute jalan. Dari pangkalan yang tercantum di kartu akses tugas: jam graf jalan dan sungai ditambah kaki_km pada ${USULAN.kakiKmJam} km/jam. Selain itu: jarak garis lurus x ${BATAS.etaFaktorJalan} pada ${BATAS.etaKmJam} km/jam ditambah kaki_km pada ${USULAN.kakiKmJam} km/jam. Posisi terakhir (${USULAN.posisiMaksJam} jam) didahulukan atas pos asal. Daftar orang diambil dari penugasan ${USULAN.rosterHari} hari terakhir di provinsi ini; beban = jumlah penugasan ${USULAN.bebanHari} hari terakhir.`;
async function usulan(env, req, kini, id) {
  let a = await akunAktif(env, req, kini), t, admin = false;
  if (a instanceof Response) {   // bukan akun instansi aktif: moderator atau staf berwenang boleh melihat (tanpa WA, gudang tanpa PIC di luar wilayah)
    if (!await modAtauStaf(env, req, P_VALIDASI)) return a;
    admin = true; t = await env.DB.prepare("SELECT id, prov, kab, kec, lat, lon, status, rekomendasi, akses, dummy FROM tugas_api WHERE id = ?").bind(id).first();
    if (!t || !dalamWilayahStaf(req, [t.prov]) || (stafNyata(req) && t.dummy)) return gagal(404, "tugas tidak ada");
  } else { t = await tugasDalam(env, a, id); if (t instanceof Response) return t; }
  if (t.status !== "buka") return gagal(409, "tugas ini sudah ditutup; tidak ada usulan penugasan");
  const R = (await env.DB.prepare(`SELECT p.id, p.nama, p.peran, p.wa, p.orang, p.akun_id, p.status, p.kedaluwarsa, p.dibuat, tt.status tstatus, k.wilayah FROM penugasan p JOIN instansi_akun k ON k.id = p.akun_id JOIN tugas_api tt ON tt.id = p.tugas_id
    WHERE k.status = 'aktif' AND p.dummy = ?1 AND p.dibuat > ?2 AND (k.prov = ?3 OR EXISTS (SELECT 1 FROM json_each(k.cakupan) WHERE value = ?3)) AND (?5 IS NULL OR p.akun_id = ?5) ORDER BY p.dibuat DESC LIMIT ?4`)
    .bind(t.dummy ? 1 : 0, kini - USULAN.rosterHari * HARI, t.prov, USULAN.barisMaks, admin ? null : a.id).all()).results;   // akun biasa: hanya orang akunnya sendiri; lintas akun hanya moderator/staf berwenang
  const orang = new Map();   // kunci orang = nomor WA, atau nama + akun bila tanpa WA; baris pertama (terbaru) menentukan nama, peran, akun
  for (const r of R) {
    const k = `${String(r.nama).toLowerCase().trim()}|${r.akun_id}`, o = orang.get(k) ?? orang.set(k, {...r, ids: [], idsAktif: [], beban: 0, bertugas: false}).get(k);   // kunci nama+akun, bukan WA (WA dikosongkan cron 7 hari)
    o.ids.push(r.id); if (r.status === "aktif" && r.kedaluwarsa > kini) o.idsAktif.push(r.id); if (r.dibuat > kini - USULAN.bebanHari * HARI) o.beban++;
    if (r.status === "aktif" && r.kedaluwarsa > kini && r.tstatus === "buka") o.bertugas = true;
  }
  const bebas = [...orang.values()].filter(o => !o.bertugas);
  const posisi = new Map(), pos = new Map();
  if (bebas.length) {
    /* posisi hanya dari penugasan yang masih aktif (selesai/dicabut/kedaluwarsa tidak membuka lokasi terakhir orangnya) */
    for (const [id, r] of await posisiTerbaru(env, bebas.flatMap(o => o.idsAktif), 1, kini - USULAN.posisiMaksJam * JAM)) if (r[0]) posisi.set(id, r[0]);
    try { for (const g of (await env.DB.prepare("SELECT akun_id, nama, jenis, lat, lon FROM gudang WHERE dummy = ? AND akun_id IN (SELECT value FROM json_each(?))").bind(t.dummy ? 1 : 0, JSON.stringify([...new Set(bebas.map(o => o.akun_id))])).all()).results) {
      const d = km(g.lat, g.lon, t.lat, t.lon), lama = pos.get(g.akun_id); if (!lama || d < lama.d) pos.set(g.akun_id, {...g, d}); } }
    catch (e) { if (!/no such table: gudang/i.test(String(e?.message || e))) throw e; }
  }
  const kandidat = bebas.map(o => {
    const p = o.idsAktif.map(i => posisi.get(i)).filter(Boolean).sort((x, y) => y.pada - x.pada)[0], g = pos.get(o.akun_id);
    const asal = p ? {lat: p.lat, lon: p.lon, pos: false} : g ? {lat: g.lat, lon: g.lon, nama: g.nama, pos: true} : null, w = tempuhMenit(asal, t);
    const milik = !admin && o.akun_id === a.id, dasar = {nama: o.nama, peran: o.peran, peran_nama: PERAN[o.peran], orang: o.orang, milik_saya: milik, oleh: o.wilayah, beban_7h: o.beban};
    /* orang akun lain (hanya terlihat moderator/staf): kelas jarak kasar saja, tanpa jarak, umur posisi, nama pos, atau WA */
    return milik ? {...dasar, ...(o.wa ? {wa: o.wa} : {}), asal: p ? {jenis: "posisi", umur_menit: Math.max(0, Math.round((kini - p.pada) / MENIT))} : g ? {jenis: "pos", nama: g.nama} : {jenis: "tidak_diketahui"},   // koordinat tidak dikirim
      tempuh_menit: w?.menit ?? null, cara: w?.cara ?? null, jarak_km: w?.jarak_km ?? null}
      : {...dasar, kelas_jarak: w == null ? null : w.jarak_km < 10 ? "< 10 km" : w.jarak_km <= 30 ? "10–30 km" : "> 30 km", tempuh_menit: null, _urut: w?.menit ?? null};
  }).sort((x, y) => (x._urut ?? x.tempuh_menit ?? Infinity) - (y._urut ?? y.tempuh_menit ?? Infinity) || x.beban_7h - y.beban_7h).slice(0, USULAN.maks).map(({_urut, ...k}) => k);
  const al = await gudangTerdekat(env, t, admin ? {adminPic: true, dalam: p => dalamWilayahStaf(req, [p])} : {provs: [t.prov], akunId: a.id});
  return json({kini, tugas_id: t.id, perkiraan: true, rumus: RUMUS_USULAN, kandidat, alat: al && {gudang: al.gudang.slice(0, 3), pompa: al.pompa},
    ...(kandidat.length ? {} : {pesan: "Belum ada orang yang bisa diusulkan: tidak ada riwayat penugasan di provinsi ini, atau semuanya sedang bertugas. Tugaskan orang baru lewat tombol Tugaskan orang."})});
}

/* ================================================================ sisi penerima tugas (token di header x-lacak) */
async function dariToken(env, req, kini, tanpaIp = false) {
  const tk = req.headers.get("x-lacak") || "";
  if (!RE_TOKEN.test(tk)) return {r: gagal(404, "tautan tidak dikenal")};
  if (!env.IP_SALT) return {r: gagal(503, "server belum dikonfigurasi (IP_SALT)")};
  const ip = await ipHash(env, req);
  /* di atas batas: tolak tanpa menulis; token tak dikenal tidak menulis baris laju sama sekali (probing tidak membengkakkan tabel) */
  if (!tanpaIp && (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = 'lacak.ip' AND waktu > ?").bind(ip, kini - MENIT).first()).n >= BATAS.posisiPerMenitIp)
    return {r: gagal(429, `batas ${BATAS.posisiPerMenitIp} per menit per IP sudah tercapai`, {"retry-after": "60"})};
  const p = await env.DB.prepare(`SELECT p.*, t.prov, t.kab, t.kec, t.lat, t.lon, t.level, t.status tstatus, t.rekomendasi, t.akses, a.wilayah akun_wilayah
    FROM penugasan p JOIN tugas_api t ON t.id = p.tugas_id JOIN instansi_akun a ON a.id = p.akun_id WHERE p.token_sha = ?`).bind(await sha(tk)).first();
  if (!p) return {r: gagal(404, "tautan tidak dikenal")};
  if (!tanpaIp) await env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lacak.ip', ?)").bind(ip, kini).run();   // darurat dikecualikan: banjir /posisi dari satu IP (CGNAT) tak boleh memblokir tombol darurat; batasnya per tautan
  const s = statusEfektif(p, kini);
  if (s !== "aktif") return {r: json({galat: s === "dicabut" ? "tautan ini dicabut oleh yang menugaskan" : s === "selesai" ? "tugas ini sudah selesai; terima kasih" : "tautan ini sudah kedaluwarsa; minta tautan baru", alasan: s}, 410)};
  return {p};
}
const navigasi = t => `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}&travelmode=driving`;
async function infoLacak(env, req, kini) {
  const d = await dariToken(env, req, kini); if (d.r) return d.r; const p = d.p;
  if (p.dibuka_pada == null) await env.DB.prepare("UPDATE penugasan SET dibuka_pada = ? WHERE id = ? AND dibuka_pada IS NULL").bind(kini, p.id).run();
  const cek = jsonAman(p.checklist) ?? {}, butir = susunChecklist(p, p.orang), rek = jsonAman(p.rekomendasi);
  const cara = (Array.isArray(rek?.cara) ? rek.cara : []).map(c => c && c.metode).filter(x => typeof x === "string").slice(0, 4), alat = (Array.isArray(rek?.alat) ? rek.alat : []).filter(x => typeof x === "string").slice(0, 8);
  const angin = await anginRegu(env, p, kini);
  return json({kini, angin, darurat_jenis: JENIS_DARURAT, tugas: {kab: p.kab, kec: p.kec, lat: p.lat, lon: p.lon, level: p.level, ditutup: p.tstatus !== "buka", cara, alat}, akses: jsonAman(p.akses), navigasi: navigasi(p), oleh: p.akun_wilayah,
    penugasan: {nama: p.nama, peran: p.peran, peran_nama: PERAN[p.peran], orang: p.orang, kedaluwarsa: p.kedaluwarsa, dibuka_pada: p.dibuka_pada ?? kini, berangkat_pada: p.berangkat_pada, tiba_pada: p.tiba_pada},
    butir, checklist: cek, ringkas: ringkasChecklist(butir, cek), batas: {jeda_ms: BATAS.jedaKlienMs, tiba_m: BATAS.tibaMeter}});
}
async function centangLacak(env, req, kini) {
  const d = await dariToken(env, req, kini); if (d.r) return d.r;
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  return centangCore(env, d.p, b.o, kini);
}
async function berangkat(env, req, kini) {
  const d = await dariToken(env, req, kini); if (d.r) return d.r;
  await env.DB.prepare("UPDATE penugasan SET berangkat_pada = coalesce(berangkat_pada, ?1), dibuka_pada = coalesce(dibuka_pada, ?1) WHERE id = ?2").bind(kini, d.p.id).run();
  const cek = jsonAman(d.p.checklist) ?? {}, r = ringkasChecklist(susunChecklist(d.p, d.p.orang), cek);
  return json({berangkat_pada: d.p.berangkat_pada ?? kini, belum_wajib: r.belum_wajib.length, ringkas: r});   // peringatan saja: berangkat tidak diblokir
}
async function posisi(env, req, kini) {
  const d = await dariToken(env, req, kini); if (d.r) return d.r; const p = d.p;
  if (p.tstatus !== "buka" && p.tstatus !== "padam") return json({galat: "tugas api ini sudah ditutup; posisi tidak lagi dikirim", alasan: "ditutup"}, 410);   // padam saja tidak menutup: penugasan ditutup lewat jalurnya sendiri (selesai/cabut)
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const lat = num(b.o.lat, BBOX.latMin, BBOX.latMaks), lon = num(b.o.lon, BBOX.lonMin, BBOX.lonMaks);
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon) || (lat === 0 && lon === 0)) return gagal(400, "posisi tidak sah: lat dan lon wajib angka di dalam Indonesia (0,0 ditolak)");
  if (p.berangkat_pada == null) return gagal(409, "tekan Mulai berangkat dulu; posisi baru dikirim sesudahnya");
  const ak = num(b.o.akurasi, 0, 5000), akurasi = ak == null || Number.isNaN(ak) ? null : Math.round(ak);   // di luar 0-5000 menjadi null, posisinya tetap dipakai
  if ((await env.DB.prepare("SELECT count(*) n FROM penugasan_posisi WHERE penugasan_id = ? AND pada > ?").bind(p.id, kini - MENIT).first()).n >= BATAS.posisiPerMenitToken)
    return gagal(429, `maksimal ${BATAS.posisiPerMenitToken} posisi per menit per tautan`, {"retry-after": "15"});
  const r1 = Math.round(lat * 1e5) / 1e5, r2 = Math.round(lon * 1e5) / 1e5, jarakM = km(r1, r2, p.lat, p.lon) * 1000;
  const tiba = p.tiba_pada == null && jarakM <= BATAS.tibaMeter && akurasi != null && akurasi <= BATAS.tibaAkurasiMeter;   // geofence: dekat DAN cukup akurat
  await env.DB.batch([env.DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, ?, ?, ?, ?)").bind(p.id, r1, r2, akurasi, kini),
    ...(tiba ? [env.DB.prepare("UPDATE penugasan SET tiba_pada = ? WHERE id = ? AND tiba_pada IS NULL").bind(kini, p.id)] : [])]);
  return json({ok: true, pada: kini, jarak_km: bulat1(jarakM / 1000), tiba: p.tiba_pada != null || tiba, tiba_pada: p.tiba_pada ?? (tiba ? kini : null)}, 201);
}
async function tiba(env, req, kini) {
  const d = await dariToken(env, req, kini); if (d.r) return d.r;
  await env.DB.prepare("UPDATE penugasan SET tiba_pada = coalesce(tiba_pada, ?1), berangkat_pada = coalesce(berangkat_pada, ?1) WHERE id = ?2").bind(kini, d.p.id).run();
  return json({tiba_pada: d.p.tiba_pada ?? kini});
}
async function selesai(env, req, kini) {
  const d = await dariToken(env, req, kini); if (d.r) return d.r;
  await env.DB.prepare("UPDATE penugasan SET status = 'selesai', selesai_pada = ?1, tiba_pada = coalesce(tiba_pada, ?1) WHERE id = ?2 AND status = 'aktif'").bind(kini, d.p.id).run();
  return json({selesai_pada: kini});   // posisi berhenti: tautan menjawab 410 mulai sekarang
}

/* ================================================================ L3 keselamatan regu */
const ARAH = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
const namaArah = d => ARAH[Math.round((((d % 360) + 360) % 360) / 45) % 8];
const sudutKe = (a, b, c, d) => { const r = Math.PI / 180; return (Math.atan2((d - b) * Math.cos((a + c) / 2 * r), c - a) / r + 360) % 360; };   // arah mata angin dari (a,b) ke (c,d)
const selisihSudut = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
/* Prakiraan angin per jam sel 0,5 derajat (scripts/data/cuaca_jam.py): c = {m0 (ms UTC jam pertama), ws, wd (arah angin DARI), gust} km/jam. Memicu bila dalam 6 jam ke depan angin
   bertiup DARI api KE regu (arah asal angin berselisih <= 45 derajat dengan arah regu ke api) dengan ws >= 15 atau gust >= 25 km/jam. Regu harus dalam 15 km dari api (jauh dari itu
   peringatan tidak bermakna) dan tidak tepat di titik api (arah tak terdefinisi). Arah menjauh = tegak lurus angin, di sisi tempat regu berada.
   ponytail: satu titik api, bukan kepulan asap atau garis api; tanpa model bentang lahan. */
export function anginKeRegu(c, api, regu, kini) {
  if (!c || !Array.isArray(c.ws) || !Array.isArray(c.wd) || !Number.isFinite(c.m0)) return null;
  const jarak = km(regu.lat, regu.lon, api.lat, api.lon); if (jarak > KESELAMATAN.anginJarakKm || jarak < 0.05) return null;
  const keApi = sudutKe(regu.lat, regu.lon, api.lat, api.lon), i0 = Math.floor((kini - c.m0) / JAM);
  for (let i = 0; i < KESELAMATAN.anginJamDepan; i++) {
    const ws = c.ws[i0 + i], wd = c.wd[i0 + i], gust = c.gust?.[i0 + i];
    if (!Number.isFinite(ws) || !Number.isFinite(wd) || selisihSudut(wd, keApi) > KESELAMATAN.anginSudut || !(ws >= KESELAMATAN.anginWsKmj || gust >= KESELAMATAN.anginGustKmj)) continue;
    const tuju = (wd + 180) % 360, apiKeRegu = (keApi + 180) % 360, s = ((apiKeRegu - tuju + 540) % 360) - 180, menjauh = (tuju + (s >= 0 ? 90 : 270)) % 360;
    return {jam_ke: i, pada: c.m0 + (i0 + i) * JAM, ws: bulat1(ws), gust: Number.isFinite(gust) ? bulat1(gust) : null, dari_derajat: Math.round(wd), dari_arah: namaArah(wd), menjauh_derajat: Math.round(menjauh), menjauh_arah: namaArah(menjauh), jarak_km: bulat1(jarak)};
  }
  return null;
}
const selCuaca = (lat, lon) => `${(Math.floor(lat / .5) * .5 + .25).toFixed(2)}_${(Math.floor(lon / .5) * .5 + .25).toFixed(2)}`;
function muatCuaca(env, lat, lon, cache) {
  const k = selCuaca(lat, lon);
  if (!cache.has(k)) cache.set(k, (async () => { try { const r = await env.ASSETS.fetch(new Request(`https://aset.lokal/data/cuaca/${k}.json`)); if (!r.ok) { r.body?.cancel(); return null; } return await r.json(); } catch (e) { return null; } })());
  return cache.get(k);
}
/* peringatan angin untuk satu penugasan (p memuat id, lat, lon tugas); posisi terakhir <= 60 menit. null bila tak ada posisi, cuaca, atau ancaman. */
async function anginRegu(env, p, kini, cache = new Map()) {
  const pos = await env.DB.prepare("SELECT lat, lon FROM penugasan_posisi WHERE penugasan_id = ? AND pada > ? ORDER BY pada DESC LIMIT 1").bind(p.id, kini - KESELAMATAN.anginPosisiMaksMenit * MENIT).first();
  return pos ? anginKeRegu(await muatCuaca(env, p.lat, p.lon, cache), p, pos, kini) : null;
}
async function darurat(env, req, kini) {
  const d = await dariToken(env, req, kini, true); if (d.r) return d.r; const p = d.p;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (!Object.hasOwn(JENIS_DARURAT, b.o.jenis)) return gagal(400, `jenis darurat harus ${Object.keys(JENIS_DARURAT).join("/")}`);
  /* posisi cacat tidak menggagalkan panggilan darurat: disimpan tanpa koordinat (tampilan memakai posisi terakhir) */
  const lat = num(b.o.lat, BBOX.latMin, BBOX.latMaks), lon = num(b.o.lon, BBOX.lonMin, BBOX.lonMaks), ada = lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon) && !(lat === 0 && lon === 0);
  const ak = num(b.o.akurasi, 0, 5000), akurasi = ada && ak != null && !Number.isNaN(ak) ? Math.round(ak) : null;
  if ((await env.DB.prepare("SELECT count(*) n FROM penugasan_darurat WHERE penugasan_id = ? AND pada > ?").bind(p.id, kini - 10 * MENIT).first()).n >= KESELAMATAN.daruratPer10Menit)
    return gagal(429, `maksimal ${KESELAMATAN.daruratPer10Menit} panggilan darurat per 10 menit per tautan; hubungi 112 atau komandan lewat telepon`, {"retry-after": "60"});
  await env.DB.prepare("INSERT INTO penugasan_darurat (penugasan_id, jenis, lat, lon, akurasi, pada) VALUES (?, ?, ?, ?, ?, ?)").bind(p.id, b.o.jenis, ada ? Math.round(lat * 1e5) / 1e5 : null, ada ? Math.round(lon * 1e5) / 1e5 : null, akurasi, kini).run();
  return json({ok: true, pada: kini, jenis: b.o.jenis, posisi_tercatat: ada}, 201);
}

/* Butir Meja Pantau untuk dipanggil src/pantau.js (agent lain yang menyambung): [{id, jenis, judul, rincian, provs, kab, dibuat, tenggat, prioritas, dummy}].
   darurat (prioritas 0, paling atas) | sunyi (tanpa posisi > 30 menit sejak posisi terakhir atau berangkat) | rotasi (berangkat > 12 jam tanpa selesai) | angin_ke_regu.
   Penugasan berstatus aktif dan belum kedaluwarsa, APA PUN status tugasnya (buka atau padam: tugas ditandai padam tidak menutup penugasan). Hasil di-cache 30 detik per isolat (Meja Pantau dibaca berulang); tulisan penugasan lewat RUTE_PENUGASAN membuangnya. Tabel 0035 belum ada = []; 0038 belum ada = tanpa butir darurat. */
const cacheAlarm = new WeakMap();   // env.DB -> {kini, v}
export async function alarmKeselamatan(env, kini = Date.now()) {
  const ttl = env.ASSETS ? Number(env.ALARM_CACHE_DETIK ?? 30) * 1000 : 0, c = cacheAlarm.get(env.DB);   // cache hanya di Worker sungguhan (ada ASSETS); ALARM_CACHE_DETIK=0 mematikan
  if (ttl > 0 && c && Math.abs(kini - c.kini) < ttl) return c.v.slice();
  const v = await hitungAlarm(env, kini); cacheAlarm.set(env.DB, {kini, v}); return v.slice();
}
async function hitungAlarm(env, kini) {
  const out = [], tempat = p => [p.kec, p.kab].filter(Boolean).join(", ");
  try {
    const P = (await env.DB.prepare(`SELECT p.id, p.nama, p.berangkat_pada, p.dummy, t.prov, t.kab, t.kec, t.lat, t.lon FROM penugasan p JOIN tugas_api t ON t.id = p.tugas_id
      WHERE p.status = 'aktif' AND p.kedaluwarsa > ? AND p.selesai_pada IS NULL AND p.berangkat_pada IS NOT NULL AND t.status IN ('buka', 'padam') ORDER BY p.berangkat_pada LIMIT 500`).bind(kini).all()).results;
    const akhir = new Map(); if (P.length) for (const [id, r] of await posisiTerbaru(env, P.map(p => p.id), 1)) if (r[0]) akhir.set(id, r[0]);
    const cache = new Map();
    for (const p of P) {
      const pos = akhir.get(p.id), ref = Math.max(p.berangkat_pada, pos?.pada ?? 0), diam = kini - ref, batas = ref + KESELAMATAN.sunyiMenit * MENIT, jam = (kini - p.berangkat_pada) / JAM;
      if (diam > KESELAMATAN.sunyiMenit * MENIT) out.push({id: `sunyi:${p.id}:${ref}`, jenis: "regu_sunyi", judul: `${p.nama} tidak mengirim posisi ${Math.floor(diam / MENIT)} menit (${tempat(p)})`,
        rincian: `Batasnya ${KESELAMATAN.sunyiMenit} menit. Hubungi lewat telepon atau WhatsApp; layar mati dan sinyal hilang juga membuat posisi berhenti terkirim.`, provs: [p.prov], kab: p.kab, dibuat: batas, tenggat: batas, prioritas: 1, dummy: p.dummy});
      if (jam > KESELAMATAN.rotasiJam) out.push({id: `rotasi:${p.id}`, jenis: "regu_rotasi", judul: `${p.nama} sudah bertugas ${Math.floor(jam)} jam, waktunya rotasi (${tempat(p)})`,
        rincian: `Batas jam kerja ${KESELAMATAN.rotasiJam} jam tanpa selesai. Siapkan pengganti dari usulan penugasan dan beri waktu istirahat.`, provs: [p.prov], kab: p.kab, dibuat: p.berangkat_pada + KESELAMATAN.rotasiJam * JAM, tenggat: p.berangkat_pada + KESELAMATAN.rotasiJam * JAM, prioritas: 2, dummy: p.dummy});
      if (pos && kini - pos.pada <= KESELAMATAN.anginPosisiMaksMenit * MENIT) {
        const a = anginKeRegu(await muatCuaca(env, p.lat, p.lon, cache), p, pos, kini);
        if (a) out.push({id: `angin:${p.id}:${a.pada}`, jenis: "angin_ke_regu", judul: `Angin mengarah ke posisi ${p.nama} (${tempat(p)})`,
          rincian: `Dalam ${a.jam_ke} jam angin dari ${a.dari_arah} ${a.ws} km/jam${a.gust != null ? `, hembusan ${a.gust}` : ""}, membawa api dan asap ke regu yang ${a.jarak_km} km dari api. Minta bergeser ke arah ${a.menjauh_arah}.`,
          provs: [p.prov], kab: p.kab, dibuat: kini, tenggat: a.pada, prioritas: 1, dummy: p.dummy});
      }
    }
  } catch (e) { if (/no such table: (main\.)?(penugasan|tugas_api)/i.test(String(e?.message || e))) return []; throw e; }
  try {
    /* satu butir per penugasan: panggilan terbaru + jumlahnya (6 tekanan tidak menjadi 6 butir) */
    const per = new Map();
    for (const x of (await env.DB.prepare(`SELECT d.id, d.penugasan_id, d.jenis, d.lat, d.lon, d.pada, p.nama, p.dummy, t.prov, t.kab, t.kec FROM penugasan_darurat d JOIN penugasan p ON p.id = d.penugasan_id JOIN tugas_api t ON t.id = p.tugas_id
      WHERE d.pada > ? AND p.status = 'aktif' ORDER BY d.pada DESC LIMIT 500`).bind(kini - KESELAMATAN.daruratAktifJam * JAM).all()).results) { const o = per.get(x.penugasan_id); if (o) o.n++; else per.set(x.penugasan_id, {...x, n: 1}); }
    for (const x of per.values())
      out.push({id: `darurat:${x.penugasan_id}`, jenis: "darurat", judul: `DARURAT ${JENIS_DARURAT[x.jenis].toLowerCase()}: ${x.nama} (${tempat(x)})${x.n > 1 ? `, ${x.n} panggilan` : ""}`,
        rincian: `Dikirim ${Math.max(0, Math.floor((kini - x.pada) / MENIT))} menit lalu${x.lat != null ? `, posisi ${x.lat}, ${x.lon}` : ", tanpa posisi (lihat posisi terakhir)"}. Hubungi sekarang, kerahkan bantuan, atau telepon 112.`,
        provs: [x.prov], kab: x.kab, dibuat: x.pada, tenggat: x.pada, prioritas: 0, dummy: x.dummy});
  } catch (e) { if (!TANPA_TABEL.test(String(e?.message || e))) throw e; }
  return out.sort((a, b) => a.prioritas - b.prioritas);
}

/* ================================================================ halaman /lacak/<token> dan manifest PWA per token */
const CSP_LACAK = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
const KEPALA_LACAK = {"cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow"};
/* dipanggil rute() di src/worker.js untuk jalur /lacak: halaman statis tunggal; token ada di fragmen (#<36 hex>) yang dibaca lacak.js dan dikirim lewat header x-lacak.
   Manifest PWA dibuat lacak.js sebagai blob (start_url berisi fragmen), jadi tak ada rute manifest per token. */
export async function halamanLacak(env, req, url) {
  if (url.pathname.replace(/\/+$/, "") !== "/lacak") return null;
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "metode tidak diizinkan", {allow: "GET, HEAD"});
  const r = await env.ASSETS.fetch(new Request(new URL("/lacak.html", url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "halaman lacak tidak ada"); }
  return new Response(req.method === "HEAD" ? null : r.body, {headers: {"content-type": "text/html; charset=utf-8", ...KEPALA_LACAK, "content-security-policy": CSP_LACAK}});
}

/* ================================================================ cron bersih-bersih (dipanggil bersihkanInstansi) dan dummy */
export async function bersihkanPenugasan(env, kini = Date.now()) {
  /* WA orang yang ditugaskan tidak disimpan selamanya: dikosongkan 7 hari sesudah penugasan selesai/dicabut/kedaluwarsa (acuan: selesai_pada, selain itu kedaluwarsa) */
  try { await env.DB.prepare("UPDATE penugasan SET wa = NULL WHERE wa IS NOT NULL AND (status <> 'aktif' OR kedaluwarsa <= ?1) AND coalesce(selesai_pada, kedaluwarsa) <= ?1 - ?2").bind(kini, 7 * HARI).run(); } catch (e) { if (!TANPA_TABEL.test(String(e?.message || e))) throw e; }
  try { await env.DB.prepare("DELETE FROM penugasan_darurat WHERE pada <= ?").bind(kini - BATAS.retensiHari * HARI).run(); } catch (e) { if (!TANPA_TABEL.test(String(e?.message || e))) throw e; }
  try { return (await env.DB.prepare("DELETE FROM penugasan_posisi WHERE pada <= ?").bind(kini - BATAS.retensiHari * HARI).run()).meta.changes; }
  catch (e) { if (TANPA_TABEL.test(String(e?.message || e))) return null; throw e; }
}
export const hapusDummyPenugasan = async env => {
  try { await env.DB.prepare("DELETE FROM penugasan_darurat WHERE penugasan_id IN (SELECT id FROM penugasan WHERE dummy = 1)").run(); } catch (e) { if (!/no such table: (main\.)?penugasan_darurat/i.test(String(e?.message || e))) throw e; }
  await env.DB.batch([env.DB.prepare("DELETE FROM penugasan_posisi WHERE penugasan_id IN (SELECT id FROM penugasan WHERE dummy = 1)"), env.DB.prepare("DELETE FROM penugasan WHERE dummy = 1")]); };
/* Dummy (DUMMY.md): tiap keadaan terisi: berangkat dengan jejak, belum dibuka, tiba, selesai, dicabut, kedaluwarsa. Token acak yang tak pernah ditampilkan (tak bisa dipakai membuka tautan).
   Jejak berjalan lewat garis lurus (yang berangkat dari 8 km ke 3 km, yang tiba berhenti 150 m dari api); tugas = [{id, lat, lon, ki, status}], akunKab = akun pengisi per kabupaten. */
export async function dummyPenugasan(env, kini, {akunKab, tugas}) {
  const buka = tugas.filter(t => t.status === "buka" && t.ki != null).slice(2, 4); if (buka.length < 2) return 0;
  const CEK = ["apd", "n95", "air_minum", "makanan", "p3k"], st = [], posisiSql = [];
  const baru = async (t, nama, peran, orang, o) => {
    const id = acak(8), cek = Object.fromEntries(CEK.slice(0, o.cek ?? 0).map((k, i) => [k, kini - (3 + i) * 6 * MENIT]));
    st.push(env.DB.prepare(`INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, wa, orang, token_sha, status, dibuat, kedaluwarsa, dibuka_pada, berangkat_pada, tiba_pada, selesai_pada, checklist, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(id, t.id, akunKab[t.ki], `[DUMMY] ${nama}`, peran, "62000000" + String(st.length).padStart(3, "0"), orang, await sha(acak(18)), o.status ?? "aktif", kini - 3 * JAM, o.kedaluwarsa ?? kini + 45 * JAM,
      o.dibuka ?? null, o.berangkat ?? null, o.tiba ?? null, o.selesai ?? null, JSON.stringify(cek)));
    return id;
  };
  const jejak = (id, t, n, dariKm, keKm, tiap) => { for (let i = 0; i < n; i++) { const f = (dariKm + (keKm - dariKm) * i / (n - 1)) / 111; posisiSql.push(env.DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, ?, ?, ?, ?)").bind(id, t.lat - f * 0.8, t.lon + f * 0.6, 8 + i % 5 * 6, kini - (n - 1 - i) * tiap)); } };
  const [A, B] = buka;
  const p1 = await baru(A, "Hendra (driver)", "driver", 4, {dibuka: kini - 50 * MENIT, berangkat: kini - 40 * MENIT, cek: 3}); jejak(p1, A, 14, 8, 3, 45e3);
  await baru(A, "Regu Alfa (belum membuka tautan)", "ketua_regu", 6, {});
  const p3 = await baru(B, "Sari (tiba di lokasi)", "anggota", 3, {dibuka: kini - 120 * MENIT, berangkat: kini - 100 * MENIT, tiba: kini - 20 * MENIT, cek: 5}); jejak(p3, B, 10, 1, 0.15, 60e3);
  await baru(B, "Budi (sudah selesai)", "driver", 2, {status: "selesai", dibuka: kini - 5 * JAM, berangkat: kini - 4 * JAM, tiba: kini - 3 * JAM, selesai: kini - 2 * JAM, cek: 5});
  await baru(A, "Andi (tautan dicabut)", "anggota", 1, {status: "dicabut", dibuka: kini - 2 * JAM});
  await baru(B, "Rina (tautan kedaluwarsa)", "anggota", 2, {kedaluwarsa: kini - JAM, dibuka: kini - 50 * JAM});
  /* L3: sunyi (posisi terakhir 45 menit lalu), rotasi (berangkat 13 jam lalu, posisi segar), darurat (Hendra, 3 menit lalu) */
  const p8 = await baru(A, "Wati (sunyi 45 menit)", "anggota", 2, {dibuka: kini - 2 * JAM, berangkat: kini - 90 * MENIT, cek: 2}); posisiSql.push(env.DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, ?, ?, 15, ?)").bind(p8, A.lat - 0.05, A.lon + 0.04, kini - 45 * MENIT));
  const p9 = await baru(B, "Joko (rotasi 13 jam)", "driver", 3, {dibuka: kini - 14 * JAM, berangkat: kini - 13 * JAM, cek: 5}); posisiSql.push(env.DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, ?, ?, 15, ?)").bind(p9, B.lat - 0.03, B.lon + 0.02, kini - MENIT));
  await env.DB.batch(st); for (let i = 0; i < posisiSql.length; i += 50) await env.DB.batch(posisiSql.slice(i, i + 50));
  try { await env.DB.prepare("INSERT INTO penugasan_darurat (penugasan_id, jenis, lat, lon, akurasi, pada) VALUES (?, 'terkepung_api', ?, ?, 12, ?)").bind(p1, A.lat - 0.03 * 0.8, A.lon + 0.03 * 0.6, kini - 3 * MENIT).run(); }
  catch (e) { if (!/no such table: (main\.)?penugasan_darurat/i.test(String(e?.message || e))) throw e; }   // 0038 belum diterapkan: dummy lain tetap terisi
  return st.length;
}

/* ================================================================ rute (digabung ke RUTE di src/worker.js). Kunci hanya [A-Za-z0-9_/:] (gerbang tests/warga/gerbang.test.mjs). */
const RUTE_ASLI = {
  "POST /api/instansi/penugasan/:id": (env, req, url, kini, ctx, id) => buat(env, req, url, kini, id),
  "GET /api/instansi/penugasan/:id": (env, req, url, kini, ctx, id) => daftarAkun(env, req, kini, id),
  "POST /api/instansi/cabut_penugasan/:id": (env, req, url, kini, ctx, id) => cabut(env, req, kini, id),
  "POST /api/instansi/terbit_penugasan/:id": (env, req, url, kini, ctx, id) => terbitUlang(env, req, url, kini, id),
  "POST /api/instansi/centang_penugasan/:id": (env, req, url, kini, ctx, id) => centangAkun(env, req, kini, id),
  "GET /api/instansi/admin/penugasan/:id": (env, req, url, kini, ctx, id) => daftarAdmin(env, req, kini, id),
  "GET /api/lacak/info": (env, req, url, kini) => infoLacak(env, req, kini),
  "POST /api/lacak/centang": (env, req, url, kini) => centangLacak(env, req, kini),
  "POST /api/lacak/berangkat": (env, req, url, kini) => berangkat(env, req, kini),
  "POST /api/lacak/posisi": (env, req, url, kini) => posisi(env, req, kini),
  "POST /api/lacak/tiba": (env, req, url, kini) => tiba(env, req, kini),
  "POST /api/lacak/selesai": (env, req, url, kini) => selesai(env, req, kini),
  "POST /api/lacak/darurat": (env, req, url, kini) => darurat(env, req, kini),
  "GET /api/instansi/usulan/:id": (env, req, url, kini, ctx, id) => usulan(env, req, kini, id),
};
/* kiriman bersesi dan kiriman lacak wajib header x-pb: 1 (anti-CSRF; halaman mengirimnya otomatis); tabel 0035 belum ada = 503 yang jelas */
export const RUTE_PENUGASAN = Object.fromEntries(Object.entries(RUTE_ASLI).map(([kunci, f]) => [kunci, async (env, req, ...sisa) => {
  if (req.method === "POST" && !kunci.includes("/admin/") && req.headers.get("x-pb") !== "1") return gagal(403, "kiriman wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman)");
  try { const r = await f(env, req, ...sisa); if (req.method === "POST") cacheAlarm.delete(env.DB); return r; }
  catch (e) { if (TANPA_TABEL.test(String(e?.message || e))) return gagal(503, "fitur penugasan belum diaktifkan (migrasi 0035 atau 0038 belum diterapkan)"); throw e; }
}]));
