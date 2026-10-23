/* Peringatan Dini (EWS) lewat email. Skema: migrations/0011_ews.sql. Halaman: public/peringatan.html.
   Warga berlangganan dengan email + koordinat (GPS) + pilihan bencana; double opt-in. Dua jalur kirim:
   - prakiraan (karhutla, banjir, longsor, cuaca, rob) dinilai tiap jam oleh nilaiTitik() — fungsi yang SAMA dipakai /api/ews/cek;
   - gempa & tsunami waktu nyata tiap 5 menit dari BMKG autogempa, hanya untuk pelanggan dalam radius terasa.
   Email dikirim lewat Resend. Dengan pengirim @resend.dev (hanya sampai ke pemilik akun) atau tanpa kunci, TIDAK ada email
   pelanggan yang dikirim dan /api/ews/konfig melaporkan email_aktif:false; langganan tetap tersimpan.
   Dua token berbeda. Konfirmasi: acak, sekali pakai, kedaluwarsa 48 jam, hanya sha yang disimpan. Berhenti/kelola: id + HMAC-SHA256
   (rahasia EWS_KUNCI, cadangan IP_SALT) atas id, dihitung ulang saat dipakai; email peringatan harus membawa tautan berhenti padahal
   D1 tidak menyimpan token itu, dan tautan di email lama tetap berlaku. GET /ews/* TIDAK mengubah apa pun (pemindai tautan email
   membuka GET): hanya mengalihkan ke /peringatan, yang lalu memanggil POST. Semua tautan di email memakai ASAL_PUBLIK, bukan origin permintaan. */
import {json, gagal, sha, acak, hex, ipHash, turnstileOK, bacaBody, cacheTepi} from "./worker.js";
import {wilayah, cariWilayah, km, dalam} from "./titik.js";
import {BENCANA, TINGKAT} from "../public/ews_tindakan.js";
import {muatHimawari, tandaiBaru, saringIndonesia} from "./himawari.js";
import {emailKonfirmasi, emailPeringatan, emailGempa, angka, kataPeluang} from "./ews_email.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM;
const ASAL_PUBLIK = "https://centurisk97.id";   // cron tak punya permintaan, jadi tak tahu origin
const BATAS_ID = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};   // sama dengan CHECK lat/lon migrasi dan src/worker.js
const RE_EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;   // sama dengan src/foto.js
export const BATAS_EWS = {langganan: [[JAM, 5], [HARI, 20]]};
const MAKS_EMAIL_PER_ALAMAT = 3;                  // email konfirmasi per alamat per 24 jam
const KONFIRMASI_UMUR = 48 * JAM, BERHENTI_SIMPAN = 30 * HARI, TERKIRIM_SIMPAN = 14 * HARI;
const JEDA_PRAKIRAAN = 6 * JAM;                   // paling banyak satu email prakiraan per pelanggan per 6 jam
const MAKS_EMAIL_PER_PUTARAN = 100;               // sisanya dilanjutkan putaran berikutnya (env EWS_MAKS_EMAIL mengubahnya, dipakai uji)
const CHUNK = 200;                                // pelanggan yang dinilai per kelompok dalam satu putaran
const MAKS_KONFIRMASI_PER_JAM = 200;              // email konfirmasi dari semua orang per jam; di atasnya 503 (bukan 202 diam-diam)
const CACHE_DATA = 10 * MENIT;
export const CRON_GEMPA = "* * * * *";   // sama dengan CRON_GEMPA worker.js: cron gempa BMKG/USGS tiap menit (src/gempa.js) lalu email pelanggan

/* ---- ambang penilaian. Tiap angka menyebut asalnya. ---- */
export const FWI_WASPADA = 7, FWI_SIAGA = 14;     // scripts/data/aturan.py::kelas_fwi: <2 rendah, <7 sedang, <14 tinggi, >=14 sangat tinggi. Tinggi = Waspada, sangat tinggi = Siaga
export const FWI_JARAK_SEL = 0.5;                 // public/data/fwi.json: sel 0,5 derajat; titik dianggap tercakup bila selisih lat dan lon sel terdekat <= 0,5
export const TITIK_AWAS_KM = 5, TITIK_SIAGA_KM = 15, TITIK_UMUR = 24 * JAM;   // titik panas FIRMS (D1 titik_terbaru) dalam 24 jam: <=5 km Awas, <=15 km Siaga (hari ini)
export const ROB_JARAK_KM = 10;                   // public/banjir/data/rob.json: titik pesisir terdekat <= 10 km mewakili lokasi
/* simulasi penjalaran api (public/data/jejak_api.json, scripts/sebaran/jejak.py): sel peluang-bakar kumulatif pada cakrawala 24/48/72 jam sesudah `acuan` (deteksi satelit terbaru).
   Ambang sengaja KONSERVATIF, dibatasi bukti hasil review model: Monte Carlo n=20 -> galat baku peluang ~0,1 (selisih < 0,2 tidak bermakna); lompatan model <= ~1,9 km/hari
   (jadi "dalam 2 km" sudah batas wajar, bukan 1 km); galat arah ~80 derajat (maka jarak 5 km, bukan 10 km, dan tidak ada Waspada dari simulasi).
   Awas = ada sel <= 2 km dengan p >= 0,50 DAN kompleks tidak terpangkas (sel dipangkas = model tak penuh); Siaga = ada sel <= 5 km dengan p >= 0,20. */
export const SIM_AWAS_KM = 2, SIM_AWAS_P = 0.50, SIM_SIAGA_KM = 5, SIM_SIAGA_P = 0.20;
export const SIM_UMUR = 36 * JAM;                 // jejak_api.json dianggap segar bila kini - acuan <= ini DAN status "ok"; selain itu diabaikan dan "jejak" masuk basi_sumber
const SIM_JAM = [24, 48, 72];
const SIM_GRID = 0.1;                             // derajat (>= 11 km di lintang Indonesia) > SIM_SIAGA_KM, jadi 3x3 sel cukup
const SIM_SUMBER = "Simulasi penjalaran api Pantau Bencana (model data, prakiraan, bukan kepastian)";
export const CUACA_DEPAN = 24 * JAM;              // peringatan nowcast BMKG yang aktif sekarang atau mulai dalam 24 jam
const CUACA_TINGKAT = {Moderate: 2, Severe: 3, Extreme: 3};   // CAP: lainnya (Minor dst.) = 1
/* gempa terasa (km) menurut magnitudo: [M minimal, radius]. Aproksimasi kasar jarak guncangan terasa (skala MMI >= III-IV) dari praktik BMKG/USGS. */
export const RADIUS_GEMPA = [[7, 500], [6, 300], [5, 150], [4, 50]];
export const GEMPA_AWAS_BAGI = 3, GEMPA_AWAS_MAG = 6;   // dalam radius/3 dan M >= 6: Awas
export const TSUNAMI_KM = 500, GEMPA_UMUR_MAKS = 2 * JAM;

export const wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
const tambah = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * HARI).toISOString().slice(0, 10);
export const emailAktif = env => !!env.EMAIL_API_KEY && !!env.EMAIL_FROM && !/@resend\.dev\b/i.test(env.EMAIL_FROM);
const ALASAN_MATI = "dilewati: domain pengirim belum diverifikasi (EMAIL_FROM kosong, @resend.dev, atau EMAIL_API_KEY belum diset)";

/* ---------------- token ---------------- */
const enc = s => new TextEncoder().encode(s);
async function hmacId(env, id) {
  const rahasia = env.EWS_KUNCI || env.IP_SALT; if (!rahasia) throw new Error("EWS_KUNCI atau IP_SALT belum diset");
  const k = await crypto.subtle.importKey("raw", enc(rahasia), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc("ews|" + id))).slice(0, 32);
}
export async function tokenKelola(env, id) { return id + await hmacId(env, id); }
const samaWaktuTetap = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const RE_KELOLA = /^[0-9a-f]{48}$/, RE_KONFIRMASI = /^[0-9a-f]{32}$/;
/* email -> kunci kotak surat: huruf kecil, tanpa +tag; gmail/googlemail juga tanpa titik */
export function kunciEmail(e) {
  let [l, d] = e.trim().toLowerCase().split("@"); l = l.split("+")[0];
  if (d === "gmail.com" || d === "googlemail.com") { l = l.replace(/\./g, ""); d = "gmail.com"; }
  return `${l}@${d}`;
}
const RP = {"referrer-policy": "no-referrer"};   // token ada di URL: jangan bocor lewat Referer

/* nama provinsi dari kode (public/data/meta.json::provinsi), sekali per isolat */
let PROV = null;
export async function namaProv(env) {
  if (PROV) return PROV;
  try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal/data/meta.json")); if (r.ok) PROV = (await r.json()).provinsi || {}; } catch (e) {}
  return PROV || {};
}

/* ---------------- data sumber (aset statis + D1), cache per isolat 10 menit ---------------- */
let DATA = null;
export async function muatData(env, kini) {
  if (DATA && Math.abs(kini - DATA.kini) < CACHE_DATA) return DATA;
  const ambil = async p => { try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal" + p)); return r.ok ? await r.json() : null; } catch (e) { return null; } };
  const [fwi, status, cuaca, rob, jejakMentah, titik, hw] = await Promise.all([ambil("/data/fwi.json"), ambil("/banjir/data/status.json"), ambil("/data/peringatan.json"), ambil("/banjir/data/rob.json"), ambil("/data/jejak_api.json"),
    env.DB.prepare("SELECT isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first().then(r => r && JSON.parse(r.isi), () => null), muatHimawari(env)]);
  const hwBaru = tandaiBaru(hw, titik, kini, await saringIndonesia(env)).filter(r => r[9]).map(r => [r[0], r[1], r[2], r[3], r[4]]);   // api baru: Himawari ya, FIRMS (keyakinan apa pun) belum; aturan di src/himawari.js
  /* titik panas: hanya yang <= 24 jam dan keyakinan sedang ke atas (rendah = banyak alarm palsu). ponytail: pindai linear (~20 rb titik) per pelanggan; indeks grid bila pelanggan > ribuan */
  const acuan = titik ? Date.parse(titik.acuan) : 0, pts = [];
  if (titik) for (const [la, lo, jam, , , c] of titik.baris) { const t = acuan + jam * JAM; if (c >= 1 && t >= kini - TITIK_UMUR) pts.push([la, lo, t]); }
  const jejakAcuan = jejakMentah?.acuan, jejakStatus = jejakMentah?.status, jejakBoleh = jejakMentah?.boleh_tampil === true, jejak = jejakSegar({jejakAcuan, jejakStatus, jejakBoleh}, kini) ? indeksJejak(jejakMentah) : null;
  return DATA = {kini, jejak, jejakAcuan, jejakStatus, jejakBoleh, fwi, status, cuaca: cuaca?.nowcast || [], cuacaDibuat: cuaca?.dibuat, rob, titik: pts, titikAcuan: titik?.acuan, titikDibuat: titik?.dibuat, hwBaru, hwAcuan: hw?.acuan};
}
/* gagal-tertutup: boleh_tampil (jejak.py; false = model kalah dari persistensi, gerbang_model.json) harus persis true; medan hilang = diabaikan */
export const jejakSegar = (d, kini) => d.jejakBoleh === true && d.jejakStatus === "ok" && kini - Date.parse(d.jejakAcuan) <= SIM_UMUR;
/* sel simulasi diindeks ke grid per cakrawala sekali per muat, jadi tiap pelanggan hanya memeriksa 9 sel, bukan semua sel. ponytail: seluruh sel di memori isolat; kalau jejak_api.json membengkak (> ~100 rb sel) pangkas di jejak.py */
export function indeksJejak(j) {
  const kompleks = [], grid = {24: new Map(), 48: new Map(), 72: new Map()};
  for (const k of Array.isArray(j.kompleks) ? j.kompleks : []) {
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(String(k?.id))) continue;
    const ki = kompleks.push({id: k.id, nama: String(k.nama || ""), terpangkas: !!k.terpangkas}) - 1;
    for (const h of k.hari || []) {
      const g = grid[h?.jam]; if (!g) continue;
      for (const [la, lo, p] of h.sel || []) {
        if (!Number.isFinite(la) || !Number.isFinite(lo) || !Number.isFinite(p)) continue;
        const kunci = Math.floor(la / SIM_GRID) + "," + Math.floor(lo / SIM_GRID);
        (g.get(kunci) || g.set(kunci, []).get(kunci)).push([la, lo, p, ki]);
      }
    }
  }
  const c = j.cakupan, ada = n => Number.isFinite(n) ? n : null;
  return {kompleks, grid, acuan: Date.parse(j.acuan), n_aktif: ada(c?.n_aktif), n_diramal: ada(c?.n_diramal)};
}
/* untuk satu cakrawala: per kompleks {a: p tertinggi sel <= SIM_AWAS_KM dengan p >= SIM_AWAS_P (0 bila tak ada), s: idem untuk Siaga} */
function jejakDekat(J, jam, lat, lon) {
  const g = J.grid[jam], a = Math.floor(lat / SIM_GRID), b = Math.floor(lon / SIM_GRID), per = new Map();
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [la, lo, p, ki] of g.get((a + i) + "," + (b + j)) || []) {
    if (p < SIM_SIAGA_P) continue;
    const d = km(lat, lon, la, lo); if (d > SIM_SIAGA_KM) continue;
    const x = per.get(ki) || {a: 0, s: 0};
    x.s = Math.max(x.s, p); if (d <= SIM_AWAS_KM && p >= SIM_AWAS_P) x.a = Math.max(x.a, p);
    per.set(ki, x);
  }
  return per;
}
const jamWib = t => { const d = new Date(t + 7 * JAM); return `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`; };

export const lupakanData = () => { DATA = null; };

/* ---------------- penilaian lokasi ---------------- */
const tingkatFWI = f => f >= FWI_SIAGA ? 2 : f >= FWI_WASPADA ? 1 : 0;

/* titik panas diindeks ke grid 0,2 derajat (>= 22 km) sekali per kumpulan titik, jadi tiap pelanggan hanya memeriksa 9 sel, bukan semua titik */
const GRID = new WeakMap(), SEL_GRID = 0.2;
function titikTerdekat(titik, lat, lon) {
  let g = GRID.get(titik);
  if (!g) { g = new Map(); for (const p of titik) { const k = Math.floor(p[0] / SEL_GRID) + "," + Math.floor(p[1] / SEL_GRID); (g.get(k) || g.set(k, []).get(k)).push(p); } GRID.set(titik, g); }
  let d = 1e9; const a = Math.floor(lat / SEL_GRID), b = Math.floor(lon / SEL_GRID);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of g.get((a + i) + "," + (b + j)) || []) d = Math.min(d, km(lat, lon, p[0], p[1]));
  return d;
}

/* data = hasil muatData(); hariIni = "YYYY-MM-DD" WIB. Mengembalikan [{bencana, tingkat 1-3, hari 0..2, judul, rincian, sumber, kunci}]. */
export function nilaiTitik(data, lat, lon, kecKunci, hariIni) {
  const hari = [0, 1, 2].map(i => tambah(hariIni, i)), out = [];
  const tambahkan = (bencana, tingkat, h, judul, rincian) => out.push({bencana, tingkat, hari: h, judul, rincian, sumber: BENCANA[bencana].sumber, kunci: `${bencana}|${hari[h]}|${tingkat}`});

  /* karhutla: FWI prakiraan sel terdekat */
  if (data.fwi?.grid) {
    let g = null, bd = 1e9;
    for (const c of data.fwi.grid) { const dl = Math.abs(c.lat - lat), dn = Math.abs(c.lon - lon); if (dl > FWI_JARAK_SEL || dn > FWI_JARAK_SEL) continue; const d = dl * dl + dn * dn; if (d < bd) { bd = d; g = c; } }
    if (g) hari.forEach((tgl, h) => { const e = g.hari.find(x => x.tgl === tgl); const t = e ? tingkatFWI(e.fwi) : 0;
      if (t) tambahkan("karhutla", t, h, `Bahaya kebakaran ${t === 2 ? "sangat tinggi" : "tinggi"} ${["hari ini", "besok", "lusa"][h]}`, `Indeks cuaca kebakaran (FWI) ${angka(e.fwi, 1)}.`); });
  }
  /* karhutla: titik panas terkini */
  const dekat = titikTerdekat(data.titik || [], lat, lon);
  if (dekat <= TITIK_AWAS_KM) tambahkan("karhutla", 3, 0, "Titik panas sangat dekat", `Titik panas satelit terdeteksi ${angka(dekat, 1)} km dari lokasi Anda dalam 24 jam terakhir.`);
  else if (dekat <= TITIK_SIAGA_KM) tambahkan("karhutla", 2, 0, "Titik panas di sekitar Anda", `Titik panas satelit terdeteksi ${angka(dekat, 1)} km dari lokasi Anda dalam 24 jam terakhir.`);
  /* karhutla: api baru Himawari-9 (belum tercatat FIRMS). Dilewati hanya bila titik FIRMS sendiri sudah memberi tingkat sama/lebih tinggi; kunci sendiri
     (karhutla-hw) supaya FWI yang sudah terkirim hari ini tidak menelan kabar api baru, dan sumber_jenis membuatnya menang seri di pemadatan per hari */
  if (data.hwBaru?.length) {
    let d = 1e9, u = 0; for (const p of data.hwBaru) { const x = km(lat, lon, p[0], p[1]); if (x < d) { d = x; u = p[2]; } }
    const t = d <= TITIK_AWAS_KM ? 3 : d <= TITIK_SIAGA_KM ? 2 : 0;
    if (t && t > (dekat <= TITIK_AWAS_KM ? 3 : dekat <= TITIK_SIAGA_KM ? 2 : 0)) {
      out.push({bencana: "karhutla", tingkat: t, hari: 0, judul: t === 3 ? "Api baru terdeteksi sangat dekat" : "Api baru terdeteksi di sekitar Anda",
        rincian: `Satelit Himawari-9 (JAXA) mendeteksi api baru ${angka(d, 1)} km dari lokasi Anda, ${u} menit sebelum pukul ${jamWib(Date.parse(data.hwAcuan))} WIB; belum tercatat satelit NASA FIRMS.`,
        sumber: BENCANA.karhutla.sumber + " dan satelit Himawari-9 (JAXA)", kunci: `karhutla-hw|${hari[0]}|${t}`, sumber_jenis: "himawari"});
    }
  }
  /* karhutla: simulasi penjalaran api. Cakrawala yang sudah lewat dilewati; sel kumulatif, jadi cakrawala lebih jauh hanya mengabari bila tingkatnya LEBIH tinggi dari yang sudah ada untuk kompleks yang sama.
     Label "dalam N jam" dari sisa waktu sampai akhir cakrawala (dibulatkan naik ke kelipatan 6 jam), bukan rentang, karena peluangnya kumulatif. */
  if (data.jejak) {
    const lalu = new Map(), J = data.jejak;
    for (const jam of SIM_JAM) {
      const akhir = J.acuan + jam * JAM; if (akhir <= data.kini) continue;
      let top = null;
      for (const [ki, x] of jejakDekat(J, jam, lat, lon)) {
        const t = x.a && !J.kompleks[ki].terpangkas ? 3 : x.s ? 2 : 0, p = t === 3 ? x.a : x.s;
        if (!t || t <= (lalu.get(ki) || 0)) continue;
        lalu.set(ki, t); if (!top || t > top.t || (t === top.t && p > top.p)) top = {t, p, ki};
      }
      if (!top) continue;
      const h = Math.min(2, Math.ceil((akhir - data.kini) / HARI) - 1), kp = J.kompleks[top.ki], band = top.t === 3 ? SIM_AWAS_KM : SIM_SIAGA_KM, sisa = Math.ceil((akhir - data.kini) / (6 * JAM)) * 6, peluang = Math.round(top.p * 10) / 10;
      /* potongan dipisah " · " persis seperti kamus EN di public/i18n/en.json (layar menerjemahkan per potongan) */
      const judul = `Perkiraan model: api bisa mencapai area dalam ${band} km dari lokasimu dalam ${sisa} jam`;
      const kalimat = `${judul} · ${kataPeluang(top.p)} · simulasi dari deteksi satelit pukul ${jamWib(J.acuan)} WIB`;
      out.push({bencana: "karhutla", tingkat: top.t, hari: h, judul, rincian: kalimat, sumber: SIM_SUMBER,
        kunci: `karhutla-sim|${kp.id}|${hari[h]}|${top.t}`, sumber_jenis: "simulasi", kompleks: kp.id, jarak_maks_km: band, peluang, jam_sisa: sisa, kalimat});
    }
  }
  /* banjir & longsor: status per kecamatan, indeks sejajar status.hari */
  const k = data.status?.kec?.[kecKunci];
  if (k) for (const [kunci, b, kata] of [["b", "banjir", "Banjir"], ["l", "longsor", "Tanah longsor"]]) (k[kunci] || []).forEach((lv, i) => {
    const h = hari.indexOf(data.status.hari[i]); if (h >= 0 && lv >= 1) tambahkan(b, Math.min(3, lv), h, `${TINGKAT[Math.min(3, lv)].nama} ${kata.toLowerCase()} di kecamatan Anda`, `Status ${kata.toLowerCase()} kecamatan ${TINGKAT[Math.min(3, lv)].nama.toLowerCase()} untuk ${hari[h]}.`);
  });

  /* cuaca ekstrem: poligon peringatan nowcast BMKG yang memuat titik, aktif sekarang atau mulai <= 24 jam */
  for (const p of data.cuaca || []) {
    const mulai = Date.parse(p.mulai), selesai = Date.parse(p.selesai);
    if (!(mulai <= data.kini + CUACA_DEPAN && selesai >= data.kini) || !p.polygon?.length) continue;
    const cincin = typeof p.polygon[0][0] === "number" ? [p.polygon] : p.polygon;
    if (!dalam(lon, lat, cincin)) continue;
    const h = Math.max(0, hari.indexOf(wib(Math.max(mulai, data.kini))));
    tambahkan("cuaca", CUACA_TINGKAT[p.severity] || 1, h, p.headline || p.event || "Peringatan cuaca", `${p.event || "Cuaca ekstrem"} (BMKG)${p.wilayah ? ": " + p.wilayah : ""}.`);
  }

  /* rob: titik pesisir terdekat <= 10 km; lv sejajar rob.hari */
  if (data.rob?.titik) {
    let t = null, bd = 1e9; for (const x of data.rob.titik) { const d = km(lat, lon, x.lat, x.lon); if (d < bd) { bd = d; t = x; } }
    if (t && bd <= ROB_JARAK_KM) hari.forEach((tgl, h) => { const lv = t.lv?.[data.rob.hari.indexOf(tgl)] || 0;
      if (lv >= 1) tambahkan("rob", Math.min(3, lv), h, `${TINGKAT[Math.min(3, lv)].nama} banjir rob di pesisir ${t.kec}`, `Pasang laut tinggi diprakirakan di ${t.kec}, ${t.kab} (${angka(bd, 1)} km dari lokasi Anda).`); });
  }
  /* satu entri tertinggi per bencana per hari */
  const peta = new Map(); for (const e of out) { const c = e.bencana + e.hari; if (!peta.has(c) || peta.get(c).tingkat < e.tingkat || (peta.get(c).tingkat === e.tingkat && e.sumber_jenis)) peta.set(c, e); }
  return [...peta.values()].sort((a, b) => b.tingkat - a.tingkat || a.hari - b.hari);
}

/* ---------------- gempa ---------------- */
export const radiusGempa = m => RADIUS_GEMPA.find(([a]) => m >= a)?.[1] ?? 0;
export const berpotensiTsunami = p => /berpotensi tsunami/i.test(p || "") && !/tidak berpotensi/i.test(p || "");
export function uraiGempa(j) {
  const g = j?.Infogempa?.gempa; if (!g) return null;
  const [lat, lon] = String(g.Coordinates || "").split(",").map(Number), mag = Number(g.Magnitude), t = Date.parse(g.DateTime);
  if (![lat, lon, mag, t].every(Number.isFinite)) return null;
  return {dt: g.DateTime, t, lat, lon, mag, dalam: g.Kedalaman, wilayah: g.Wilayah, potensi: g.Potensi, dirasakan: g.Dirasakan, waktu: `${g.Tanggal || ""} ${g.Jam || ""}`.trim()};
}
/* {gempa: 0|2|3, tsunami: 0|3, jarak} untuk satu lokasi */
export function nilaiGempa(g, lat, lon) {
  const jarak = km(lat, lon, g.lat, g.lon), r = radiusGempa(g.mag);
  const gempa = !r || jarak > r ? 0 : g.mag >= GEMPA_AWAS_MAG && jarak <= r / GEMPA_AWAS_BAGI ? 3 : 2;
  return {gempa, tsunami: berpotensiTsunami(g.potensi) && jarak <= TSUNAMI_KM ? 3 : 0, jarak};
}

/* ---------------- kirim email ---------------- */
export async function kirimEmail(env, a, {subject, html, text}, tautanBerhenti) {
  const r = await fetch("https://api.resend.com/emails", {method: "POST", headers: {authorization: `Bearer ${env.EMAIL_API_KEY}`, "content-type": "application/json"},
    body: JSON.stringify({from: env.EMAIL_FROM, to: [a], subject, html, text,
      ...(tautanBerhenti ? {headers: {"List-Unsubscribe": `<${tautanBerhenti}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}} : {})})});
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
const wilayahSurat = (s, pn) => ({prov: s.prov, kab: s.kab, kec: s.kec, prov_nama: pn[s.prov]});
const baris = (s, pn) => ({lat: s.lat, lon: s.lon, wilayah: wilayahSurat(s, pn)});
const rahasiaAda = env => !!(env.EWS_KUNCI || env.IP_SALT);
const maksEmail = env => Number(env.EWS_MAKS_EMAIL) || MAKS_EMAIL_PER_PUTARAN;
const k80 = k => k.length <= 80 ? k : k.slice(0, 80);   // CHECK kolom kunci: INSERT yang gagal SESUDAH kirim = kirim berulang. Kunci dibangun dari bagian pendek (kunci bencana, tanggal, tingkat, DateTime ISO)
const tautanBerhenti = async (env, id) => `${ASAL_PUBLIK}/ews/berhenti?t=${await tokenKelola(env, id)}`;

/* ---------------- cron: prakiraan tiap jam ----------------
   SEMUA pelanggan aktif dinilai tiap putaran, per kelompok CHUNK berurutan `diperiksa` (yang paling lama belum dinilai lebih dulu). Batas email per putaran
   hanya menunda pengiriman: pelanggan yang tertunda tidak ditandai diperiksa, jadi jadi yang pertama di putaran berikutnya.
   Urutan aman: kunci dicatat SEBELUM kirim; bila kirim gagal, catatan itu ditarik lagi (dicoba ulang putaran depan). Galat pada satu pelanggan tidak menghentikan putaran. */
export async function kirimEws(env, kini = Date.now()) {
  if (!emailAktif(env)) return {lewat: ALASAN_MATI};
  if (!rahasiaAda(env)) return {lewat: "IP_SALT belum diset"};
  const data = await muatData(env, kini), hariIni = wib(kini), maks = maksEmail(env), pn = await namaProv(env), chunk = Number(env.EWS_CHUNK) || CHUNK;   // EWS_CHUNK hanya untuk uji
  const hasil = {diperiksa: 0, dikirim: 0, tertunda: 0, gagal: 0};
  for (let penuh = false; !penuh;) {
    const kel = (await env.DB.prepare("SELECT id, email, lat, lon, prov, kab, kec, kec_kunci, bencana, waspada, kirim_terakhir FROM ews_langganan WHERE status = 'aktif' AND diperiksa < ? ORDER BY diperiksa, id LIMIT ?").bind(kini, chunk).all()).results;
    if (!kel.length) break;
    const lalu = new Map();
    for (const r of (await env.DB.prepare("SELECT langganan_id i, kunci k FROM ews_terkirim WHERE langganan_id IN (SELECT value FROM json_each(?)) AND kunci NOT LIKE 'gempa|%' AND kunci NOT LIKE 'tsunami|%'").bind(JSON.stringify(kel.map(s => s.id))).all()).results)
      (lalu.get(r.i) || lalu.set(r.i, new Set()).get(r.i)).add(r.k);
    const selesai = [];
    for (const s of kel) {
      try {
        const pilih = JSON.parse(s.bencana), min = s.waspada ? 1 : 2;
        const ps = nilaiTitik(data, s.lat, s.lon, s.kec_kunci, hariIni).filter(p => pilih.includes(p.bencana) && p.tingkat >= min);
        const baru = ps.filter(p => !lalu.get(s.id)?.has(p.kunci)).map(p => k80(p.kunci));
        if (baru.length && kini - s.kirim_terakhir >= JEDA_PRAKIRAAN) {
          if (hasil.dikirim >= maks) { hasil.tertunda++; penuh = true; continue; }   // tidak ditandai diperiksa
          await env.DB.batch([...baru.map(k => env.DB.prepare("INSERT OR IGNORE INTO ews_terkirim (langganan_id, kunci, waktu) VALUES (?, ?, ?)").bind(s.id, k, kini)),
            env.DB.prepare("UPDATE ews_langganan SET kirim_terakhir = ? WHERE id = ?").bind(kini, s.id)]);
          const tautan = await tautanBerhenti(env, s.id);
          try { await kirimEmail(env, s.email, emailPeringatan({asal: ASAL_PUBLIK, ...baris(s, pn), peringatan: ps, simulasi: data.jejak, tautanBerhenti: tautan}), tautan); hasil.dikirim++; }
          catch (e) {
            console.error("ews kirim", s.id, e.message); hasil.gagal++;
            await env.DB.batch([...baru.map(k => env.DB.prepare("DELETE FROM ews_terkirim WHERE langganan_id = ? AND kunci = ?").bind(s.id, k)),
              env.DB.prepare("UPDATE ews_langganan SET kirim_terakhir = ? WHERE id = ?").bind(s.kirim_terakhir, s.id)]);
          }
        }
      } catch (e) { console.error("ews nilai", s.id, e.message); hasil.gagal++; }
      selesai.push(s.id); hasil.diperiksa++;
    }
    if (selesai.length) await env.DB.prepare("UPDATE ews_langganan SET diperiksa = ? WHERE id IN (SELECT value FROM json_each(?))").bind(kini, JSON.stringify(selesai)).run();
  }
  if (hasil.tertunda) console.log("ews: tertunda ke putaran berikutnya", hasil.tertunda);
  return hasil;
}

/* ---------------- cron: gempa tiap 5 menit ---------------- */
export async function prosesGempa(env, kini = Date.now()) {
  if (!emailAktif(env)) return {lewat: ALASAN_MATI};
  if (!rahasiaAda(env)) return {lewat: "IP_SALT belum diset"};
  let g;
  try { const r = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json"); if (!r.ok) return {galat: `BMKG ${r.status}`}; g = uraiGempa(await r.json()); }
  catch (e) { return {galat: e.message}; }
  if (!g) return {galat: "format autogempa tidak dikenal"};
  const terakhir = Number((await env.DB.prepare("SELECT nilai FROM ews_keadaan WHERE kunci = 'gempa_terakhir'").first())?.nilai || 0);
  if (g.t <= terakhir) return {lewat: "tidak ada gempa baru"};
  if (kini - g.t > GEMPA_UMUR_MAKS || g.t > kini + 5 * MENIT) return {lewat: "gempa terlalu lama atau waktunya janggal"};
  const kunci = "gempa|" + new Date(g.t).toISOString(), pn = await namaProv(env), maks = maksEmail(env);
  const subs = (await env.DB.prepare(`SELECT id, email, lat, lon, prov, kab, kec, bencana FROM ews_langganan WHERE status = 'aktif' AND (bencana LIKE '%"gempa"%' OR bencana LIKE '%"tsunami"%')`).all()).results;
  const sudah = new Set((await env.DB.prepare("SELECT langganan_id i FROM ews_terkirim WHERE kunci = ?").bind(kunci).all()).results.map(r => r.i));
  const hasil = {dikirim: 0, gagal: 0, tertunda: 0, jauh: 0}; let selesai = true;
  for (const s of subs) {
    if (sudah.has(s.id)) continue;
    try {
      const pilih = JSON.parse(s.bencana), n = nilaiGempa(g, s.lat, s.lon);
      const tsunami = pilih.includes("tsunami") && n.tsunami, gempa = pilih.includes("gempa") && n.gempa;
      if (!tsunami && !gempa) { hasil.jauh++; continue; }
      if (hasil.dikirim >= maks) { hasil.tertunda++; selesai = false; continue; }
      await env.DB.prepare("INSERT OR IGNORE INTO ews_terkirim (langganan_id, kunci, waktu) VALUES (?, ?, ?)").bind(s.id, kunci, kini).run();   // dicatat dulu
      const tautan = await tautanBerhenti(env, s.id);
      try { await kirimEmail(env, s.email, emailGempa({asal: ASAL_PUBLIK, ...baris(s, pn), g: {...g, jarak: n.jarak}, tingkat: tsunami ? 3 : gempa, tsunami: !!tsunami, tautanBerhenti: tautan}), tautan); hasil.dikirim++; }
      catch (e) { console.error("ews gempa", s.id, e.message); hasil.gagal++; selesai = false; await env.DB.prepare("DELETE FROM ews_terkirim WHERE langganan_id = ? AND kunci = ?").bind(s.id, kunci).run(); }
    } catch (e) { console.error("ews gempa nilai", s.id, e.message); hasil.gagal++; selesai = false; }
  }
  if (selesai) await env.DB.prepare("INSERT INTO ews_keadaan (kunci, nilai, waktu) VALUES ('gempa_terakhir', ?, ?) ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai, waktu = excluded.waktu").bind(String(g.t), kini).run();
  return hasil;
}

/* ---------------- cron: bersih-bersih ---------------- */
export async function bersihkanEws(env, kini = Date.now()) {
  const r = await env.DB.batch([
    env.DB.prepare("DELETE FROM ews_langganan WHERE status = 'menunggu' AND dibuat <= ?").bind(kini - KONFIRMASI_UMUR),
    env.DB.prepare("DELETE FROM ews_langganan WHERE status = 'berhenti' AND coalesce(berhenti_pada, dibuat) <= ?").bind(kini - BERHENTI_SIMPAN),
    env.DB.prepare("DELETE FROM ews_terkirim WHERE waktu <= ? OR langganan_id NOT IN (SELECT id FROM ews_langganan)").bind(kini - TERKIRIM_SIMPAN),
    env.DB.prepare("DELETE FROM ews_laju WHERE waktu <= ?").bind(kini - 2 * HARI),
    env.DB.prepare("UPDATE ews_langganan SET konfirmasi_hash = NULL, konfirmasi_exp = NULL, calon = NULL WHERE konfirmasi_exp IS NOT NULL AND konfirmasi_exp <= ?").bind(kini),
  ]);
  return {menunggu: r[0].meta.changes, berhenti: r[1].meta.changes, terkirim: r[2].meta.changes, laju: r[3].meta.changes};
}

/* ---------------- rute ---------------- */
const dalamID = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= BATAS_ID.latMin && lat <= BATAS_ID.latMaks && lon >= BATAS_ID.lonMin && lon <= BATAS_ID.lonMaks;
const angkaMasuk = v => v == null || v === "" || typeof v === "boolean" ? NaN : Number(v);
const bulat2 = x => Math.round(x * 100) / 100;
const pecahKec = (k, pn = {}) => { const [prov, kab, kec] = (k || "").split("|"); return {prov: prov || "", kab: kab || "", kec: kec || "", prov_nama: pn[prov] || ""}; };

/* Jatah atomik: SATU pernyataan INSERT ... WHERE semua hitungan < batas; meta.changes = 0 berarti ditolak. Dua permintaan serentak tak bisa sama-sama lolos. */
async function jatah(env, kunci, aksi, batas, kini) {
  const kond = batas.map(() => "(SELECT count(*) FROM ews_laju WHERE ip_hash = ? AND aksi = ? AND waktu > ?) < ?").join(" AND ");
  const r = await env.DB.prepare(`INSERT INTO ews_laju (ip_hash, aksi, waktu) SELECT ?, ?, ? WHERE ${kond}`)
    .bind(kunci, aksi, kini, ...batas.flatMap(([j, m]) => [kunci, aksi, kini - j, m])).run();
  return r.meta.changes === 1 ? null : batas[0];
}

function konfig(env, req, ctx) {
  return cacheTepi(req, ctx, 300, () => json({turnstile: env.TURNSTILE_SITEKEY || null, email_aktif: emailAktif(env), bencana: Object.keys(BENCANA)}));
}

/* sumber prakiraan yang tidak mencakup hari ini: layar harus menulis "data belum diperbarui", bukan "aman" */
export function sumberBasi(data, kini) {
  const h = wib(kini), out = [];
  if (!data.fwi || !(data.fwi.hari_ini >= tambah(h, -1))) out.push("fwi");
  if (!data.status?.hari?.includes(h)) out.push("banjir");
  if (!data.cuacaDibuat || Date.parse(data.cuacaDibuat) < kini - 24 * JAM) out.push("cuaca");
  if (!data.rob?.hari?.includes(h)) out.push("rob");
  if (!data.titikDibuat || Date.parse(data.titikDibuat) < kini - 9 * JAM) out.push("titik");   // FIRMS diperbarui tiap 3 jam
  if (!jejakSegar(data, kini)) out.push("jejak");
  return out;
}

async function cek(env, req, url, kini, ctx) {
  const lat0 = angkaMasuk(url.searchParams.get("lat")), lon0 = angkaMasuk(url.searchParams.get("lon"));
  if (!dalamID(lat0, lon0)) return gagal(400, "koordinat harus di wilayah Indonesia");
  const lat = bulat2(lat0), lon = bulat2(lon0), u = new URL(url); u.search = ""; u.searchParams.set("lat", lat.toFixed(2)); u.searchParams.set("lon", lon.toFixed(2));   // kunci cache ~1 km
  return cacheTepi(new Request(u, {method: "GET"}), ctx, 300, async () => {
    const [data, W, pn] = await Promise.all([muatData(env, kini), wilayah(env), namaProv(env)]);
    const kec = cariWilayah(W, lat, lon), hariIni = wib(kini), basi = sumberBasi(data, kini);
    return json({wilayah: kec ? pecahKec(kec, pn) : null, hari: [0, 1, 2].map(i => tambah(hariIni, i)),
      peringatan: nilaiTitik(data, lat, lon, kec || "", hariIni).map(({kunci, ...p}) => p), basi: basi.length > 0, basi_sumber: basi, simulasi: data.jejak ? {acuan: data.jejakAcuan, n_aktif: data.jejak.n_aktif, n_diramal: data.jejak.n_diramal} : null,
      diperbarui: Object.fromEntries(Object.entries({fwi: data.fwi?.hari_ini, banjir: data.status?.hari?.[0], cuaca: data.cuacaDibuat, rob: data.rob?.dibuat, titik: data.titikAcuan, jejak: data.jejak ? data.jejakAcuan : null}).filter(([, v]) => v))});
  });
}

async function langganan(env, req, url, kini, ctx) {
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat); const o = b.o;
  const aktif = emailAktif(env);
  /* email sungguhan akan keluar: wajib ada verifikasi manusia, kalau tidak ini mesin kiriman surat gratis */
  if (aktif && !(env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY)) return gagal(503, "verifikasi Turnstile belum dipasang");
  const email = String(o.email ?? "").trim().toLowerCase();
  if (email.length > 254 || !RE_EMAIL.test(email)) return gagal(400, "alamat email tidak valid");
  const lat0 = angkaMasuk(o.lat), lon0 = angkaMasuk(o.lon);
  if (!dalamID(lat0, lon0)) return gagal(400, "koordinat harus di wilayah Indonesia");
  if (o.akurasi != null && o.akurasi !== "" && !(Number(o.akurasi) >= 0 && Number(o.akurasi) <= 5000)) return gagal(400, "akurasi GPS terlalu rendah (maksimal 5.000 m)");
  const bencana = o.bencana;
  if (!Array.isArray(bencana) || !bencana.length || bencana.length > Object.keys(BENCANA).length || bencana.some(x => !(x in BENCANA)) || new Set(bencana).size !== bencana.length)
    return gagal(400, `pilih satu atau lebih bencana dari: ${Object.keys(BENCANA).join(", ")}`);
  if (o.waspada != null && typeof o.waspada !== "boolean") return gagal(400, "waspada harus true atau false");
  const lt = bulat2(lat0), ln = bulat2(lon0), kecKunci = cariWilayah(await wilayah(env), lt, ln);   // koordinat tersimpan ~1 km
  if (!kecKunci) return gagal(400, "lokasi tidak berada di daratan Indonesia (laut atau luar negeri); geser titik ke daratan");
  if (!(await turnstileOK(env, o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const ip = await ipHash(env, req), pn = await namaProv(env), w = pecahKec(kecKunci, pn);
  if (await jatah(env, ip, "langganan", BATAS_EWS.langganan, kini)) return gagal(429, "batas langganan tercapai, coba lagi nanti", {"retry-after": String(BATAS_EWS.langganan[0][0] / 1000)});
  const ek = kunciEmail(email), balas = () => json({ok: true, wilayah: w, email_aktif: aktif}, 202);   // jawaban SAMA untuk alamat baru, lama, atau kena batas
  if (await jatah(env, await sha(`${env.IP_SALT}|email|${ek}`), "email", [[HARI, MAKS_EMAIL_PER_ALAMAT]], kini)) return balas();
  if (aktif && await jatah(env, "semua", "global", [[JAM, MAKS_KONFIRMASI_PER_JAM]], kini)) return gagal(503, "layanan sedang ramai, coba lagi sebentar lagi", {"retry-after": "600"});

  const isi = {lat: lt, lon: ln, prov: w.prov, kab: w.kab, kec: w.kec, kec_kunci: kecKunci, bencana: JSON.stringify(bencana), waspada: o.waspada ? 1 : 0};
  const kt = acak(16), kh = await sha(kt), exp = kini + KONFIRMASI_UMUR;
  const ada = await env.DB.prepare("SELECT id, status FROM ews_langganan WHERE email_kunci = ?").bind(ek).first();
  if (!ada) {
    try {
      await env.DB.prepare("INSERT INTO ews_langganan (id, email, email_kunci, lat, lon, prov, kab, kec, kec_kunci, bencana, waspada, status, konfirmasi_hash, konfirmasi_exp, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', ?, ?, ?)")
        .bind(acak(8), email, ek, isi.lat, isi.lon, isi.prov, isi.kab, isi.kec, isi.kec_kunci, isi.bencana, isi.waspada, kh, exp, kini).run();
    } catch (e) { return balas(); }   // kiriman kembar bersamaan: yang lain sudah membuatnya
  } else if (ada.status === "aktif") await env.DB.prepare("UPDATE ews_langganan SET calon = ?, konfirmasi_hash = ?, konfirmasi_exp = ? WHERE id = ?").bind(JSON.stringify({...isi, t: kini}), kh, exp, ada.id).run();   // tetap aktif; berubah setelah konfirmasi
  else await env.DB.prepare("UPDATE ews_langganan SET lat=?, lon=?, prov=?, kab=?, kec=?, kec_kunci=?, bencana=?, waspada=?, status='menunggu', calon=NULL, konfirmasi_hash=?, konfirmasi_exp=?, dibuat=?, berhenti_pada=NULL WHERE id=?")
    .bind(isi.lat, isi.lon, isi.prov, isi.kab, isi.kec, isi.kec_kunci, isi.bencana, isi.waspada, kh, exp, kini, ada.id).run();
  if (aktif) {
    const surat = emailKonfirmasi({wilayah: w, bencana, waspada: !!o.waspada, tautan: `${ASAL_PUBLIK}/ews/konfirmasi?t=${kt}`});
    ctx?.waitUntil?.(kirimEmail(env, email, surat).catch(e => console.error("ews konfirmasi", e.message)));
  }
  return balas();
}

/* token -> {jenis, r}. Konfirmasi: acak 32 hex, sha cocok dan belum kedaluwarsa. Kelola: 48 hex = id + HMAC, dihitung ulang. */
async function cariToken(env, t, kini) {
  try {
    if (RE_KONFIRMASI.test(t)) { const r = await env.DB.prepare("SELECT * FROM ews_langganan WHERE konfirmasi_hash = ? AND konfirmasi_exp > ?").bind(await sha(t), kini).first(); return r && {jenis: "konfirmasi", r}; }
    if (RE_KELOLA.test(t) && samaWaktuTetap(t.slice(16), await hmacId(env, t.slice(0, 16)))) { const r = await env.DB.prepare("SELECT * FROM ews_langganan WHERE id = ?").bind(t.slice(0, 16)).first(); return r && {jenis: "kelola", r}; }
  } catch (e) { console.error("ews token", e.message); }
  return null;
}
const jsonRP = (d, s = 200) => json(d, s, RP), galatRP = (s, m) => gagal(s, m, RP);
const alih = (aksi, url) => new Response(null, {status: 303, headers: {location: `/peringatan?aksi=${aksi}&t=${encodeURIComponent((url.searchParams.get("t") || "").slice(0, 64))}`, "cache-control": "no-store", ...RP}});
const TAUTAN_MATI = "tautan tidak berlaku, sudah dipakai, atau kedaluwarsa";

/* GET /api/ews/rincian?t=: apa yang akan terjadi bila tautan ini dipakai (tanpa mengubah apa pun) */
async function rincian(env, req, url, kini) {
  const c = await cariToken(env, url.searchParams.get("t") || "", kini); if (!c) return galatRP(404, TAUTAN_MATI);
  const pn = await namaProv(env), r = c.r; let calon = null;
  try { const x = r.calon && JSON.parse(r.calon); if (x && kini - x.t <= KONFIRMASI_UMUR) calon = {wilayah: pecahKec(x.kec_kunci, pn), bencana: JSON.parse(x.bencana)}; } catch (e) {}
  return jsonRP({aksi_mungkin: c.jenis === "konfirmasi" ? ["konfirmasi"] : r.status === "berhenti" ? [] : ["berhenti"], status: r.status,
    wilayah: pecahKec(r.kec_kunci, pn), bencana: JSON.parse(r.bencana), calon: c.jenis === "konfirmasi" ? calon : null});
}

async function konfirmasi(env, req, url, kini) {
  const t = url.searchParams.get("t") || "", c = RE_KONFIRMASI.test(t) ? await cariToken(env, t, kini) : null;
  if (!c) return galatRP(400, TAUTAN_MATI);
  const r = c.r; let x = null; try { x = r.calon && JSON.parse(r.calon); } catch (e) {}
  const v = x && kini - x.t <= KONFIRMASI_UMUR ? x : r;   // perubahan dari kiriman ulang berlaku hanya lewat konfirmasi ini
  const up = await env.DB.prepare("UPDATE ews_langganan SET lat=?, lon=?, prov=?, kab=?, kec=?, kec_kunci=?, bencana=?, waspada=?, status='aktif', calon=NULL, konfirmasi_hash=NULL, konfirmasi_exp=NULL, dikonfirmasi=coalesce(dikonfirmasi, ?), berhenti_pada=NULL, kirim_terakhir=?, diperiksa=0 WHERE id=? AND konfirmasi_hash=?")
    .bind(v.lat, v.lon, v.prov, v.kab, v.kec, v.kec_kunci, v.bencana, v.waspada, kini, v === r ? r.kirim_terakhir : 0, r.id, await sha(t)).run();
  if (up.meta.changes !== 1) return galatRP(400, TAUTAN_MATI);   // pemakaian kedua (termasuk balapan) gagal: sekali pakai
  return jsonRP({ok: true, wilayah: pecahKec(v.kec_kunci, await namaProv(env)), bencana: JSON.parse(v.bencana)});
}

async function berhenti(env, req, url, kini) {
  const c = await cariToken(env, url.searchParams.get("t") || "", kini);
  if (!c || c.jenis !== "kelola") return galatRP(404, TAUTAN_MATI);
  await env.DB.prepare("UPDATE ews_langganan SET status='berhenti', calon=NULL, konfirmasi_hash=NULL, konfirmasi_exp=NULL, berhenti_pada=coalesce(berhenti_pada, ?) WHERE id=?").bind(kini, c.r.id).run();
  return jsonRP({ok: true});
}

/* rute: kunci "METODE /jalur", digabung ke RUTE di src/worker.js. GET /ews/* hanya mengalihkan (tanpa mengubah data). */
export const RUTE_EWS = {
  "GET /api/ews/konfig": (env, req, url, kini, ctx) => konfig(env, req, ctx),
  "GET /api/ews/cek": (env, req, url, kini, ctx) => cek(env, req, url, kini, ctx),
  "GET /api/ews/rincian": (env, req, url, kini) => rincian(env, req, url, kini),
  "POST /api/ews/langganan": (env, req, url, kini, ctx) => langganan(env, req, url, kini, ctx),
  "GET /ews/konfirmasi": (env, req, url) => alih("konfirmasi", url),
  "POST /ews/konfirmasi": (env, req, url, kini) => konfirmasi(env, req, url, kini),
  "GET /ews/berhenti": (env, req, url) => alih("berhenti", url),
  "POST /ews/berhenti": (env, req, url, kini) => berhenti(env, req, url, kini),
};
