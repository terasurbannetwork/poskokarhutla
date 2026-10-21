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

const MENIT = 60e3, JAM = 36e5, HARI = 24 * JAM;
const BBOX = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};
export const BATAS = {jedaKlienMs: 45e3, posisiPerMenitToken: 4, posisiPerMenitIp: 300, retensiHari: 30, jejakMaks: 200, tibaMeter: 300, tibaAkurasiMeter: 300, kedaluwarsaJam: 48, kedaluwarsaMaksJam: 168, maksPerTugas: 40, etaKmJam: 30, etaFaktorJalan: 1.3, airLiterPerOrangHari: 5}   // 5 = sama dengan operasi.py koef air_minum mid (Sphere, dipakai taktik.py); uji paritas membaca operasi.py;
export const PERAN = {driver: "Driver", ketua_regu: "Ketua regu", anggota: "Anggota", lainnya: "Lainnya"};
export const STATUS_PENUGASAN = ["aktif", "dicabut", "selesai"];
const RE_TOKEN = /^[0-9a-f]{36}$/, RE_ID = /^[0-9a-f]{16}$/, RE_KUNCI = /^[a-z0-9_]{1,30}$/;
const tolakMod = () => gagal(403, "fitur ini hanya untuk moderator ke atas atau staf wilayah (bukan akun gerbang situs)");
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
function bentukPenugasan(p, t, jejak, kini, akunId) {
  const tampilWA = akunId != null && p.akun_id === akunId;   // WA hanya untuk akun PEMBUATNYA (akun lain sekabupaten pun tidak)
  const cek = jsonAman(p.checklist) ?? {}, akhir = jejak.length ? jejak[jejak.length - 1] : null, butir = susunChecklist(t, p.orang);
  return {id: p.id, nama: p.nama, peran: p.peran, orang: p.orang, ...(tampilWA ? {wa: p.wa} : {}), status: statusEfektif(p, kini), dibuat: p.dibuat, kedaluwarsa: p.kedaluwarsa, dibuka_pada: p.dibuka_pada,
    berangkat_pada: p.berangkat_pada, tiba_pada: p.tiba_pada, selesai_pada: p.selesai_pada, checklist: cek, butir, ringkas: ringkasChecklist(butir, cek),
    posisi: akhir && {lat: akhir.lat, lon: akhir.lon, akurasi: akhir.akurasi, pada: akhir.pada}, jejak: jejak.map(x => [x.lat, x.lon, x.pada]), ...jarakEta(akhir, t, p, kini), dummy: p.dummy};
}
/* penugasan satu tugas + jejak terakhir (<= 200 titik tiap orang, urut waktu naik) */
async function daftarUntukTugas(env, t, kini, akunId) {
  const P = (await env.DB.prepare("SELECT * FROM penugasan WHERE tugas_id = ? ORDER BY dibuat DESC LIMIT ?").bind(t.id, BATAS.maksPerTugas).all()).results;
  if (!P.length) return [];
  const J = (await env.DB.prepare(`SELECT penugasan_id, lat, lon, akurasi, pada FROM (SELECT penugasan_id, lat, lon, akurasi, pada, row_number() OVER (PARTITION BY penugasan_id ORDER BY pada DESC) rn
    FROM penugasan_posisi WHERE penugasan_id IN (SELECT value FROM json_each(?))) WHERE rn <= ? ORDER BY pada`).bind(JSON.stringify(P.map(p => p.id)), BATAS.jejakMaks).all()).results;
  const per = new Map(P.map(p => [p.id, []])); for (const x of J) per.get(x.penugasan_id)?.push(x);
  return P.map(p => bentukPenugasan(p, t, per.get(p.id), kini, akunId));
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

/* ================================================================ sisi penerima tugas (token di header x-lacak) */
async function dariToken(env, req, kini) {
  const tk = req.headers.get("x-lacak") || "";
  if (!RE_TOKEN.test(tk)) return {r: gagal(404, "tautan tidak dikenal")};
  if (!env.IP_SALT) return {r: gagal(503, "server belum dikonfigurasi (IP_SALT)")};
  const ip = await ipHash(env, req);
  /* di atas batas: tolak tanpa menulis; token tak dikenal tidak menulis baris laju sama sekali (probing tidak membengkakkan tabel) */
  if ((await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = 'lacak.ip' AND waktu > ?").bind(ip, kini - MENIT).first()).n >= BATAS.posisiPerMenitIp)
    return {r: gagal(429, `batas ${BATAS.posisiPerMenitIp} per menit per IP sudah tercapai`, {"retry-after": "60"})};
  const p = await env.DB.prepare(`SELECT p.*, t.prov, t.kab, t.kec, t.lat, t.lon, t.level, t.status tstatus, t.rekomendasi, t.akses, a.wilayah akun_wilayah
    FROM penugasan p JOIN tugas_api t ON t.id = p.tugas_id JOIN instansi_akun a ON a.id = p.akun_id WHERE p.token_sha = ?`).bind(await sha(tk)).first();
  if (!p) return {r: gagal(404, "tautan tidak dikenal")};
  await env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lacak.ip', ?)").bind(ip, kini).run();
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
  return json({kini, tugas: {kab: p.kab, kec: p.kec, lat: p.lat, lon: p.lon, level: p.level, ditutup: p.tstatus !== "buka", cara, alat}, akses: jsonAman(p.akses), navigasi: navigasi(p), oleh: p.akun_wilayah,
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
  if (p.tstatus !== "buka") return json({galat: "tugas api ini sudah ditutup; posisi tidak lagi dikirim", alasan: "ditutup"}, 410);
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
  try { return (await env.DB.prepare("DELETE FROM penugasan_posisi WHERE pada <= ?").bind(kini - BATAS.retensiHari * HARI).run()).meta.changes; }
  catch (e) { if (/no such table: penugasan/i.test(String(e?.message || e))) return null; throw e; }
}
export const hapusDummyPenugasan = async env => { await env.DB.batch([env.DB.prepare("DELETE FROM penugasan_posisi WHERE penugasan_id IN (SELECT id FROM penugasan WHERE dummy = 1)"), env.DB.prepare("DELETE FROM penugasan WHERE dummy = 1")]); };
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
  await env.DB.batch(st); for (let i = 0; i < posisiSql.length; i += 50) await env.DB.batch(posisiSql.slice(i, i + 50));
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
};
/* kiriman bersesi dan kiriman lacak wajib header x-pb: 1 (anti-CSRF; halaman mengirimnya otomatis); tabel 0035 belum ada = 503 yang jelas */
export const RUTE_PENUGASAN = Object.fromEntries(Object.entries(RUTE_ASLI).map(([kunci, f]) => [kunci, async (env, req, ...sisa) => {
  if (req.method === "POST" && !kunci.includes("/admin/") && req.headers.get("x-pb") !== "1") return gagal(403, "kiriman wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman)");
  try { return await f(env, req, ...sisa); }
  catch (e) { if (/no such table: penugasan/i.test(String(e?.message || e))) return gagal(503, "fitur penugasan belum diaktifkan (migrasi 0035 belum diterapkan)"); throw e; }
}]));
