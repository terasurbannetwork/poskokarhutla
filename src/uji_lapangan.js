/* Uji lapangan karhutla: protokol + pengumpulan data + hasil, supaya klasifikasi dan prediksi platform bisa disebut TERUJI (bukan klaim). Skema: migrations/0054_uji_lapangan.sql.
   Dokumen pemilik: halaman /uji-lapangan (public/instansi_uji.html). Pemakai data: isian Ruang Instansi (src/instansi.js memanggil bacaUji/stmtUji), cron (jalankanUji), GET /api/uji-lapangan.
   Aturan:
   - Lima pertanyaan Q1-Q5 dengan metrik + ambang lolos DIBEKUKAN di PRAREGISTRASI (di bawah). Mengubah ambang sesudah data masuk = melanggar pra-registrasi: ganti `versi` dan catat di halaman.
   - Bias seleksi: tugas otomatis hanya level 3/2 (hanya positif). Tiap minggu per provinsi dipilih acak deterministik sampai 5 kandidat level 0-1 / firespot "mungkin" dekat akses sebagai sampel KONTROL;
     metrik Q1 ditimbang kebalikan peluang terpilih (n_kandidat / n_dipilih) dan dilaporkan per strata.
   - Agregat saja: tanpa nama PIC, WhatsApp, atau koordinat. Tanpa data di API yang bisa menunjuk satu orang atau satu lokasi.
   ponytail: kolam kandidat diukur sekali, pada eksekusi pertama minggu itu yang punya kandidat untuk provinsi tsb; kandidat yang muncul sesudahnya tidak ikut diundi. */
import {json, gagal, acak, adminOK, cacheTepi} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {pemirsaSesi} from "./pemirsa.js";
import {km} from "./titik.js";
import {pasKartu, pasAkses, pasRekomendasi} from "./instansi.js";

const JAM = 36e5, HARI = 24 * JAM;
const BBOX = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};

/* ================================================================ pra-registrasi (BEKU) */
const bekukan = o => { for (const v of Object.values(o)) if (v && typeof v === "object") bekukan(v); return Object.freeze(o); };
export const PRAREGISTRASI = bekukan({
  versi: "uji-lapangan/1", dibekukan: "2026-10-23",
  selang: "Wilson 95% untuk proporsi; selang median berbasis peringkat 95%; bootstrap persentil 95% (benih tetap) untuk BSS.",
  q1: {id: "Q1", judul: "Presisi deteksi", metrik: "porsi kunjungan pertama yang menemukan api (hasil api_ada, atau bekas terbakar baru untuk hasil sudah_padam), per level platform 0-3 dan per kelas firespot; ditimbang kebalikan peluang terpilih sampel kontrol",
    ambang: {presisi_min: 0.80, level_min: 2, n_min: 50}, aturan: "lolos bila presisi level >= 2 mencapai 0,80 dengan paling sedikit 50 kunjungan; batas bawah Wilson 95% selalu dilaporkan"},
  q2: {id: "Q2", judul: "Api terlewat (POD)", metrik: "porsi api yang ditemukan regu berkode (menyala/bara, tepercaya) yang TIDAK punya tugas api atau titik satelit dalam 2 km dari -3 jam sampai +24 jam sesudah laporan",
    ambang: {n_min: 30}, aturan: "deskriptif: belum ada ambang lolos; dilaporkan sebagai porsi + selang. Kurang dari 30 laporan dinilai = belum cukup data"},
  q3: {id: "Q3", judul: "Membesar dalam 72 jam", metrik: "Brier skill score (BSS) peluang 'lolos' yang dicatat prospektif terhadap kenyataan lapangan (luas >= 140 ha pada kabar >= 72 jam sesudah kunjungan pertama), acuan = frekuensi kejadian",
    ambang: {bss_min: 0, n_min: 30, luas_lolos_ha: 140, jeda_jam: 72}, aturan: "lolos bila BSS > 0 dengan paling sedikit 30 pasangan"},
  q4: {id: "Q4", judul: "Luas terbakar", metrik: "rasio luas terukur lapangan terhadap luas perkiraan platform per kejadian (median) dan MAPE; hanya metode terukur (keliling_gps, jalan_keliling, drone); taksiran mata tidak dihitung",
    ambang: {rasio_min: 0.7, rasio_maks: 1.4, n_min: 30}, aturan: "lolos bila median rasio ada di 0,7-1,4 dengan paling sedikit 30 kejadian"},
  q5: {id: "Q5", judul: "Padam terverifikasi", metrik: "porsi tugas berstatus padam_terverifikasi yang tidak muncul lagi dalam 7 hari (tugas_muncul)",
    ambang: {porsi_min: 0.85, n_min: 30, jendela_hari: 7}, aturan: "lolos bila porsi benar >= 0,85 dengan paling sedikit 30 tugas yang jendela 7 harinya sudah selesai"},
  kontrol: {per_minggu_per_provinsi: 5, akses_maks_kaki_km: 3, umur_tugas_maks_jam: 24, kedaluwarsa_hari: 3},
});
export const METODE_TERUKUR = ["keliling_gps", "jalan_keliling", "drone"];

/* ================================================================ statistik murni */
export function wilson(k, n, z = 1.96) {
  if (!(n > 0)) return null;
  const p = k / n, z2 = z * z, d = 1 + z2 / n, c = (p + z2 / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
const bulat = (x, d = 3) => x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d;
const selangBulat = s => s && s.map(x => bulat(x));
/* proporsi tertimbang: p = sum(w y) / sum(w); n efektif Kish = (sum w)^2 / sum w^2; Wilson memakai n efektif */
export function proporsi(baris) {   // [{ya: 0|1, w, n}] (n = jumlah kunjungan dengan ciri sama)
  let sw = 0, sw2 = 0, swy = 0, n = 0, ya = 0;
  for (const b of baris) { const c = b.n ?? 1; sw += b.w * c; sw2 += b.w * b.w * c; swy += b.w * b.ya * c; n += c; ya += b.ya * c; }
  if (!n || !sw) return {n: 0, ya: 0, nilai: null, selang: null, n_efektif: 0};
  const p = swy / sw, ne = sw * sw / sw2;
  return {n, ya, nilai: bulat(p), selang: selangBulat(wilson(p * ne, ne)), n_efektif: bulat(ne, 1)};
}
const vonis = (n, nMin, lolos) => n < nMin ? "belum_cukup_data" : lolos ? "lolos" : "gagal";

const grupLevel = l => Math.min(3, Math.max(0, l | 0));
/* Q1. baris: [{sampel, level, firespot, ya, bobot, n}] (hasil GROUP BY) */
export function hitungQ1(baris) {
  const A = PRAREGISTRASI.q1.ambang, w = b => ({ya: b.ya, w: b.bobot > 0 ? b.bobot : 1, n: b.n});
  const tinggi = proporsi(baris.filter(b => grupLevel(b.level) >= A.level_min).map(w));
  const perLevel = [0, 1, 2, 3].map(l => ({level: l, ...proporsi(baris.filter(b => grupLevel(b.level) === l).map(w))}));
  const perFire = ["ya", "mungkin", null].map(f => ({firespot: f ?? "tak_tercatat", ...proporsi(baris.filter(b => (b.firespot ?? null) === f).map(w))}));
  const mentah = s => { const x = baris.filter(b => b.sampel === s), n = x.reduce((a, b) => a + b.n, 0), ya = x.reduce((a, b) => a + b.ya * b.n, 0); return {sampel: s, n, ya, presisi_mentah: n ? bulat(ya / n) : null}; };
  return {id: "Q1", n: tinggi.n, nilai: tinggi.nilai, selang: tinggi.selang, batas_bawah: tinggi.selang?.[0] ?? null, n_efektif: tinggi.n_efektif,
    vonis: vonis(tinggi.n, A.n_min, tinggi.nilai != null && tinggi.nilai >= A.presisi_min),
    batas_bawah_memenuhi: tinggi.selang ? tinggi.selang[0] >= A.presisi_min : null,
    rincian: {per_level: perLevel, per_firespot: perFire, per_sampel: [mentah("tugas"), mentah("kontrol")]}};
}
/* Q2. n terdeteksi, n terlewat */
export function hitungQ2(terdeteksi, terlewat) {
  const n = terdeteksi + terlewat, s = wilson(terlewat, n);
  return {id: "Q2", n, nilai: n ? bulat(terlewat / n) : null, selang: selangBulat(s), pod: n ? bulat(terdeteksi / n) : null, terdeteksi, terlewat,
    vonis: n < PRAREGISTRASI.q2.ambang.n_min ? "belum_cukup_data" : null, deskriptif: true};
}
const urut = a => [...a].sort((x, y) => x - y);
export function persen(urutan, q) {   // interpolasi linear, urutan sudah terurut
  if (!urutan.length) return null; const i = (urutan.length - 1) * q, a = Math.floor(i), b = Math.ceil(i); return urutan[a] + (urutan[b] - urutan[a]) * (i - a);
}
/* selang median distribusi-bebas (peringkat) */
export function selangMedian(urutan, z = 1.96) {
  const n = urutan.length; if (n < 6) return null;
  const lo = Math.max(1, Math.floor((n + 1) / 2 - z * Math.sqrt(n) / 2)), hi = Math.min(n, Math.ceil((n + 1) / 2 + z * Math.sqrt(n) / 2));
  return [urutan[lo - 1], urutan[hi - 1]];
}
/* Q3. pasangan [{p, y}] */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const bss = ps => { const n = ps.length, y = ps.reduce((a, q) => a + q.y, 0) / n, bs = ps.reduce((a, q) => a + (q.p - q.y) ** 2, 0) / n, ref = y * (1 - y); return {bs, ref, bss: ref > 0 ? 1 - bs / ref : null, y}; };
export function hitungQ3(pasangan) {
  const A = PRAREGISTRASI.q3.ambang, n = pasangan.length;
  if (!n) return {id: "Q3", n: 0, nilai: null, selang: null, vonis: "belum_cukup_data", rincian: {brier: null, brier_acuan: null, frekuensi_lolos: null}};
  const b = bss(pasangan); let selang = null;
  if (n >= 10 && b.bss != null) {   // bootstrap persentil, benih tetap: hasil sama untuk data sama
    const rnd = mulberry(n * 2654435761), nilai = [];
    for (let r = 0; r < 300; r++) { const s = Array.from({length: n}, () => pasangan[Math.floor(rnd() * n)]), x = bss(s); if (x.bss != null) nilai.push(x.bss); }
    const u = urut(nilai); if (u.length >= 30) selang = [persen(u, 0.025), persen(u, 0.975)];
  }
  return {id: "Q3", n, nilai: bulat(b.bss), selang: selangBulat(selang), vonis: vonis(n, A.n_min, b.bss != null && bulat(b.bss, 6) > A.bss_min),   // dibulatkan: sisa galat pecahan (1e-16) bukan keunggulan
    rincian: {brier: bulat(b.bs), brier_acuan: bulat(b.ref), frekuensi_lolos: bulat(b.y)}};
}
/* Q4. pasangan [{lap, plat}] */
export function hitungQ4(pasangan, nTaksiran = 0) {
  const A = PRAREGISTRASI.q4.ambang, ada = pasangan.filter(q => q.plat > 0 && q.lap >= 0), rasio = urut(ada.map(q => q.lap / q.plat)), n = rasio.length;
  const mape = ada.filter(q => q.lap > 0).map(q => Math.abs(q.plat - q.lap) / q.lap), med = persen(rasio, 0.5);
  return {id: "Q4", n, nilai: bulat(med), selang: selangBulat(selangMedian(rasio)), mape: mape.length ? bulat(mape.reduce((a, b) => a + b, 0) / mape.length) : null, n_mape: mape.length,
    vonis: vonis(n, A.n_min, med != null && med >= A.rasio_min && med <= A.rasio_maks),
    rincian: {kuartil: n ? [bulat(persen(rasio, 0.25)), bulat(persen(rasio, 0.75))] : null, taksiran_tidak_dihitung: nTaksiran}};
}
/* Q5. benar, salah (tugas yang jendela 7 harinya sudah selesai) */
export function hitungQ5(benar, salah) {
  const A = PRAREGISTRASI.q5.ambang, n = benar + salah, p = n ? benar / n : null;
  return {id: "Q5", n, nilai: bulat(p), selang: selangBulat(wilson(benar, n)), benar, salah, vonis: vonis(n, A.n_min, p != null && p >= A.porsi_min)};
}

/* ================================================================ sampel kontrol: pemilihan deterministik */
/* cyrb53: hash 53-bit tanpa kripto (cukup untuk mengacak urutan; benih = minggu + provinsi) */
export function hash53(s, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
export function mingguISO(ms) {
  const d = new Date(ms), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), hari = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - hari);
  const awal = Date.UTC(t.getUTCFullYear(), 0, 1), w = Math.ceil(((t.getTime() - awal) / HARI + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, "0")}`;
}
export const kunciKandidat = k => `${(+k.lat).toFixed(4)},${(+k.lon).toFixed(4)}`;
/* murni: kandidat sah untuk sampel kontrol? level 0-1 atau firespot "mungkin", BUKAN tugas otomatis, teramati <= 24 jam, dekat akses (jalan kaki <= 3 km) */
export function layakKontrol(k) {
  const C = PRAREGISTRASI.kontrol;
  return !!k && typeof k === "object" && Number.isFinite(k.lat) && Number.isFinite(k.lon) && k.lat >= BBOX.latMin && k.lat <= BBOX.latMaks && k.lon >= BBOX.lonMin && k.lon <= BBOX.lonMaks
    && typeof k.prov === "string" && /^\d{2}$/.test(k.prov) && typeof k.kab === "string" && k.kab.length >= 2 && k.kab.length <= 60 && Number.isFinite(k.level) && k.level >= 0 && k.level <= 9
    && (k.level <= 1 || k.firespot === "mungkin") && k.otomatis !== true && Number.isFinite(k.jam_sejak) && k.jam_sejak >= 0 && k.jam_sejak <= C.umur_tugas_maks_jam
    && k.akses && typeof k.akses === "object" && Number.isFinite(k.akses.kaki_km) && k.akses.kaki_km >= 0 && k.akses.kaki_km <= C.akses_maks_kaki_km;
}
/* murni dan deterministik: urutan ditentukan hash(minggu|prov|koordinat); kandidat sama => pilihan sama */
export function pilihKontrol(kandidat, minggu, prov, maks = PRAREGISTRASI.kontrol.per_minggu_per_provinsi) {
  const benih = `${minggu}|${prov}`, unik = new Map();
  for (const k of kandidat) unik.set(kunciKandidat(k), k);
  const diurut = [...unik.entries()].map(([kunci, k]) => ({kunci, k, h: hash53(`${benih}|${kunci}`)})).sort((a, b) => a.h - b.h || (a.kunci < b.kunci ? -1 : 1));
  return {benih, n_kandidat: diurut.length, dipilih: diurut.slice(0, maks).map(x => x.k)};
}

/* ================================================================ medan isian (dipakai src/instansi.js) */
export const TUTUPAN = ["gambut", "semak_belukar", "kebun_sawit", "hti_akasia", "hutan", "pertanian", "lain"];
export const METODE_LUAS = ["keliling_gps", "jalan_keliling", "taksiran", "drone"];
export const YA_TIDAK = ["ya", "tidak"];
export const TINGGI_NYALA = ["lt05", "05_15", "gt15"];
export const ANGIN_LOKAL = ["tenang", "lemah", "sedang", "kencang"];
export const PENYEBAB = ["pembukaan_lahan", "tak_sengaja", "tak_tahu", "lain"];
export const BEKAS_BARU = ["ya", "tidak", "tak_tahu"];
const MAKS_TITIK_JALUR = 150;
const ENUM = {tutupan: TUTUPAN, metode_luas: METODE_LUAS, tepi_aktif: YA_TIDAK, tinggi_nyala: TINGGI_NYALA, angin_lokal: ANGIN_LOKAL, dugaan_penyebab: PENYEBAB, bekas_terbakar_baru: BEKAS_BARU};
export const KUNCI_UJI = [...Object.keys(ENUM), "n_titik_jalur", "arah_jalar_deg"];
/* o.uji (objek) -> {v: baris|null} atau {g: pesan}. luasIsi: apakah isian membawa luas_ha (tutupan + metode_luas lalu wajib). Tanpa o.uji: {v: null} (klien lama, perilaku lama). */
export function bacaUji(uji, luasIsi) {
  if (uji == null) return {v: null};
  if (typeof uji !== "object" || Array.isArray(uji)) return {g: "uji harus objek"};
  if ("jalur_gps" in uji) return {g: "uji.jalur_gps tidak diterima: jalur tidak disimpan. Kirim luas_ha, metode_luas, dan n_titik_jalur (jumlah titik)"};
  for (const k of Object.keys(uji)) if (!KUNCI_UJI.includes(k)) return {g: `uji: kunci '${String(k).slice(0, 30)}' tidak dikenal (boleh: ${KUNCI_UJI.join(", ")})`};
  const v = {};
  for (const [k, daftar] of Object.entries(ENUM)) {
    const x = uji[k]; if (x == null || x === "") { v[k] = null; continue; }
    if (typeof x !== "string" || !daftar.includes(x)) return {g: `uji.${k} harus salah satu dari ${daftar.join("/")}`};
    v[k] = x;
  }
  if (uji.arah_jalar_deg == null || uji.arah_jalar_deg === "") v.arah_jalar_deg = null;
  else { const a = uji.arah_jalar_deg; if (typeof a !== "number" || !Number.isInteger(a) || a < 0 || a > 359) return {g: "uji.arah_jalar_deg harus bilangan bulat 0-359 (derajat dari utara)"}; v.arah_jalar_deg = a; }
  v.n_titik_jalur = null;
  if (uji.n_titik_jalur != null) {
    const j = uji.n_titik_jalur;
    if (typeof j !== "number" || !Number.isInteger(j) || j < 3 || j > MAKS_TITIK_JALUR) return {g: `uji.n_titik_jalur harus bilangan bulat 3-${MAKS_TITIK_JALUR} (jumlah titik jalur keliling)`};
    v.n_titik_jalur = j;
  }
  if (luasIsi && (!v.tutupan || !v.metode_luas)) return {g: "luas diisi: tutupan lahan dan metode pengukuran luas (keliling_gps/jalan_keliling/taksiran/drone) wajib"};
  if (v.n_titik_jalur != null && v.metode_luas !== "keliling_gps") return {g: "uji.n_titik_jalur hanya untuk metode_luas keliling_gps"};
  return {v: Object.values(v).every(x => x == null) ? null : v};
}
/* tabel 0054 ada? Isian yang membawa `uji` ditolak 503 bila belum (bukan membuang medannya diam-diam) */
export async function ujiAda(env) {
  try { await env.DB.prepare("SELECT 1 FROM uji_isian LIMIT 1").first(); return true; }
  catch (e) { if (/no such table: (main\.)?uji_/i.test(String(e?.message || e))) return false; throw e; }
}
export const GALAT_BELUM = "medan uji lapangan belum bisa disimpan: migrasi 0054 belum diterapkan";
/* pernyataan batch: hanya masuk bila isian tersimpan (INSERT ... SELECT ... WHERE EXISTS) */
export const stmtUji = (env, iid, tugasId, v, kini) => env.DB.prepare(`INSERT INTO uji_isian (isian_id, tugas_id, dibuat, tutupan, metode_luas, n_titik_jalur, arah_jalar_deg, tepi_aktif, tinggi_nyala, angin_lokal, dugaan_penyebab, bekas_terbakar_baru)
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12 WHERE EXISTS (SELECT 1 FROM tugas_isian WHERE id = ?1)`)
  .bind(iid, tugasId, kini, v.tutupan, v.metode_luas, v.n_titik_jalur, v.arah_jalar_deg, v.tepi_aktif, v.tinggi_nyala, v.angin_lokal, v.dugaan_penyebab, v.bekas_terbakar_baru);

/* potret platform untuk tugas BARU (dipanggil buatTugasIsi sesudah tugasnya ada). k = butir tugas_kompleks.json */
export function stmtUjiTugasBaru(env, id, k, kini) {
  const firespot = k.firespot === "ya" || k.firespot === "mungkin" ? k.firespot : null, luas = Number.isFinite(k.luas) && k.luas >= 0 && k.luas <= 1e6 ? k.luas : null;
  const p = typeof k.p_lolos === "number" && Number.isFinite(k.p_lolos) && k.p_lolos >= 0 && k.p_lolos <= 1 ? k.p_lolos : null;
  return env.DB.prepare("INSERT OR IGNORE INTO uji_tugas (tugas_id, sampel, level, firespot, prov, luas_platform_ha, p_lolos, minggu, dibuat) VALUES (?, 'tugas', ?, ?, ?, ?, ?, NULL, ?)")
    .bind(id, Math.min(9, Math.max(0, k.level | 0)), firespot, k.prov, luas, p, kini);
}

/* ================================================================ cron: sampel kontrol + Q2 */
const tabelHilang = e => /no such table|no such column/i.test(String(e?.message || e));
async function muatBerkas(env, berkas, kini) {
  try {
    const r = await env.ASSETS.fetch(new Request("https://aset.lokal/data/" + berkas)); if (!r.ok) { r.body?.cancel(); return null; }
    const d = await r.json(), dibuat = Date.parse(d?.dibuat);
    return Number.isFinite(dibuat) && kini - dibuat <= 6 * JAM && Array.isArray(d.kompleks) ? {dibuat: d.dibuat, kompleks: d.kompleks.slice(0, 3000)} : null;
  } catch (e) { return null; }
}
const KUNCI_META = "uji_kandidat_ver";
export async function pilihSampelKontrol(env, kini = Date.now()) {
  const minggu = mingguISO(kini), C = PRAREGISTRASI.kontrol;
  const [a, b] = await Promise.all([muatBerkas(env, "uji_kandidat.json", kini), muatBerkas(env, "tugas_kompleks.json", kini)]);
  if (!a && !b) return {lewat: "uji_kandidat.json dan tugas_kompleks.json belum ada atau lebih dari 6 jam"};
  const versi = `${minggu}|${a?.dibuat ?? "-"}|${b?.dibuat ?? "-"}`.slice(0, 100);
  let adaMeta = true;
  try { const m = await env.DB.prepare("SELECT nilai FROM tugas_meta WHERE kunci = ?").bind(KUNCI_META).first(); if (m?.nilai === versi) return {lewat: "versi sama"}; } catch (e) { if (!tabelHilang(e)) throw e; adaMeta = false; }
  const klaim = new Set((await env.DB.prepare("SELECT prov FROM uji_sampel WHERE minggu = ?").bind(minggu).all()).results.map(r => r.prov));
  const perProv = new Map();
  for (const k of [...(a?.kompleks ?? []), ...(b?.kompleks ?? [])]) if (layakKontrol(k) && !klaim.has(k.prov)) (perProv.get(k.prov) || perProv.set(k.prov, []).get(k.prov)).push(k);
  let dibuat = 0, provs = 0;
  if (perProv.size) {
    const buka = (await env.DB.prepare("SELECT prov, lower(kab) kab, lat, lon FROM tugas_api WHERE (status = 'buka' OR (status = 'bukan_api' AND konfirmasi_pada > ?)) AND prov IN (SELECT value FROM json_each(?)) LIMIT 5000")
      .bind(kini - 14 * HARI, JSON.stringify([...perProv.keys()])).all()).results;
    for (const [prov, daftar] of perProv) {
      /* kandidat yang sudah dekat (<= 2 km, kabupaten sama) tugas terbuka tidak ikut kolam: akan bergabung ke tugas itu, bukan tugas baru */
      const bebas = daftar.filter(k => !buka.some(t => t.prov === prov && t.kab === k.kab.toLowerCase() && km(k.lat, k.lon, t.lat, t.lon) <= 2));
      if (!bebas.length) continue;
      const pil = pilihKontrol(bebas, minggu, prov, C.per_minggu_per_provinsi);
      const klaimBaru = await env.DB.prepare("INSERT OR IGNORE INTO uji_sampel (minggu, prov, benih, n_kandidat, n_dipilih, dibuat) VALUES (?, ?, ?, ?, ?, ?)").bind(minggu, prov, pil.benih, pil.n_kandidat, pil.dipilih.length, kini).run();
      if (!klaimBaru.meta.changes) continue;   // eksekusi lain sudah mengklaim (provinsi, minggu) ini
      provs++;
      const st = [], tambahan = [];
      for (const k of pil.dipilih) {
        const id = acak(8), rek = pasRekomendasi(k.rekomendasi), akses = pasAkses(k.akses), n24 = Math.max(0, Math.round(k.n24) || 0), luas = Number.isFinite(k.luas) && k.luas >= 0 ? k.luas : null;
        const terakhir = Math.round(kini - k.jam_sejak * JAM), kec = typeof k.kec === "string" && k.kec && k.kec.length <= 60 ? k.kec : null;
        st.push(env.DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, rekomendasi, akses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(id, k.prov, k.kab, kec, k.lat, k.lon, k.level, n24, luas, kini, terakhir, rek, akses));
        st.push(env.DB.prepare("INSERT INTO uji_tugas (tugas_id, sampel, level, firespot, prov, luas_platform_ha, p_lolos, minggu, dibuat) VALUES (?, 'kontrol', ?, ?, ?, ?, ?, ?, ?)")
          .bind(id, Math.min(9, Math.max(0, k.level | 0)), k.firespot === "ya" || k.firespot === "mungkin" ? k.firespot : null, k.prov, luas != null && luas <= 1e6 ? luas : null,
            typeof k.p_lolos === "number" && k.p_lolos >= 0 && k.p_lolos <= 1 ? k.p_lolos : null, minggu, kini));
        const kt = pasKartu({insiden: k.insiden, front: k.front, masuk: k.masuk, radius_m: k.radius_m, luas_aktif: k.luas_aktif, luas_koreksi: k.luas_koreksi, tren: k.tren, watak: k.watak, konsesi: k.konsesi, syarat: k.syarat, firespot: k.firespot, jenis: "verifikasi"});
        if (kt) tambahan.push(env.DB.prepare("INSERT INTO tugas_kartu (tugas_id, insiden, kartu, diperbarui) VALUES (?, ?, ?, ?)").bind(id, typeof k.insiden === "string" && k.insiden.length >= 3 && k.insiden.length <= 40 ? k.insiden : null, kt, kini));
        if (luas != null) tambahan.push(env.DB.prepare("INSERT OR IGNORE INTO tugas_luas_awal (tugas_id, luas_ha) VALUES (?, ?)").bind(id, luas));
        dibuat++;
      }
      for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
      try { for (let i = 0; i < tambahan.length; i += 50) await env.DB.batch(tambahan.slice(i, i + 50)); } catch (e) { if (!tabelHilang(e)) console.error("uji kontrol kartu", e?.message); }   // 0041/0046 belum ada: tugas tetap jadi
    }
  }
  if (adaMeta) await env.DB.prepare("INSERT INTO tugas_meta (kunci, nilai) VALUES (?1, ?2) ON CONFLICT(kunci) DO UPDATE SET nilai = ?2").bind(KUNCI_META, versi).run().catch(() => {});
  return {minggu, provinsi: provs, tugas: dibuat};
}
/* tugas kontrol yang tak pernah dikunjungi sampai batasnya dibuang (supaya tidak menjadi "terlambat" selamanya); jumlahnya dicatat di uji_sampel: laju kunjungan ikut dilaporkan */
export async function bersihkanKontrol(env, kini = Date.now()) {
  const batas = kini - PRAREGISTRASI.kontrol.kedaluwarsa_hari * HARI;
  const T = (await env.DB.prepare(`SELECT t.id, u.minggu, u.prov FROM uji_tugas u JOIN tugas_api t ON t.id = u.tugas_id WHERE u.sampel = 'kontrol' AND t.status = 'buka' AND t.konfirmasi_pada IS NULL AND t.dibuat <= ?
    AND NOT EXISTS (SELECT 1 FROM tugas_isian i WHERE i.tugas_id = t.id) LIMIT 200`).bind(batas).all()).results;
  const syarat = "id = ?1 AND status = 'buka' AND konfirmasi_pada IS NULL AND NOT EXISTS (SELECT 1 FROM tugas_isian WHERE tugas_id = ?1)";
  for (let i = 0; i < T.length; i += 25) await env.DB.batch(T.slice(i, i + 25).flatMap(t => [
    env.DB.prepare(`UPDATE uji_sampel SET n_tak_dikunjungi = n_tak_dikunjungi + 1 WHERE minggu = ?2 AND prov = ?3 AND EXISTS (SELECT 1 FROM tugas_api WHERE ${syarat})`).bind(t.id, t.minggu, t.prov),
    env.DB.prepare(`DELETE FROM tugas_api WHERE ${syarat}`).bind(t.id)]));
  const lama = kini - 400 * HARI;
  await env.DB.batch([env.DB.prepare("DELETE FROM uji_terlewat WHERE waktu <= ?").bind(lama), env.DB.prepare("DELETE FROM uji_sampel WHERE dibuat <= ?").bind(lama)]);
  return {kedaluwarsa: T.length};
}
/* Q2: laporan regu menyala/bara berumur 24-72 jam yang belum dinilai. Jendela deteksi = -3 jam .. +24 jam dari waktu laporan. titik_terbaru menyimpan 8 putaran (24 jam per putaran):
   putaran pertama yang dibuat >= waktu + 24 jam mencakup seluruh jendela maju; putaran sebelumnya menambah 3 jam mundur. Putaran terlalu jauh dari batas itu (> 3 jam) = tak_dinilai (tidak dihitung). */
export async function nilaiTerlewat(env, kini = Date.now()) {
  let L;
  try {
    L = (await env.DB.prepare(`SELECT l.id, l.waktu, l.lat, l.lon, l.prov, l.status FROM lapangan l WHERE l.dummy = 0 AND l.status IN ('menyala', 'bara') AND l.gps_curiga IS NULL AND l.waktu <= ?1 AND l.waktu > ?2
      AND l.id NOT IN (SELECT lapangan_id FROM uji_terlewat) AND l.id NOT IN (SELECT lapangan_id FROM lapangan_tahan WHERE putusan = 'tahan') ORDER BY l.waktu LIMIT 100`).bind(kini - 24 * JAM, kini - 72 * JAM).all()).results;
  } catch (e) { if (tabelHilang(e)) return {lewat: "tabel lapangan, lapangan_tahan, atau uji_terlewat belum ada"}; throw e; }
  if (!L.length) return {dinilai: 0};
  let tautan = new Set();
  try { tautan = new Set((await env.DB.prepare("SELECT lapangan_id FROM tugas_lapangan WHERE lapangan_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(L.map(l => l.id))).all()).results.map(r => r.lapangan_id)); } catch (e) { if (!tabelHilang(e)) throw e; }
  const putaran = (await env.DB.prepare("SELECT id, dibuat FROM titik_terbaru ORDER BY dibuat").all()).results, cache = new Map();
  const titikDari = async p => {
    if (!cache.has(p.id)) { const r = await env.DB.prepare("SELECT isi FROM titik_terbaru WHERE id = ?").bind(p.id).first(); let t = [];
      try { const isi = JSON.parse(r.isi), acuan = Date.parse(isi.acuan); t = Array.isArray(isi.baris) && Number.isFinite(acuan) ? isi.baris.map(b => ({lat: b[0], lon: b[1], t: acuan + b[2] * JAM})) : []; } catch (e) {}
      cache.set(p.id, t); }
    return cache.get(p.id);
  };
  const st = []; let terdeteksi = 0, terlewat = 0, tak = 0;
  for (const l of L) {
    let hasil;
    if (tautan.has(l.id)) hasil = "terdeteksi";
    else {
      const i = putaran.findIndex(p => p.dibuat >= l.waktu + 24 * JAM);
      if (i < 0) continue;   // belum ada putaran yang mencakup jendelanya: coba lagi nanti
      if (putaran[i].dibuat - (l.waktu + 24 * JAM) > 3 * JAM) hasil = "tak_dinilai";
      else {
        const titik = [...await titikDari(putaran[i]), ...(i > 0 ? await titikDari(putaran[i - 1]) : [])];
        hasil = titik.some(b => b.t >= l.waktu - 3 * JAM && b.t <= l.waktu + 24 * JAM && km(b.lat, b.lon, l.lat, l.lon) <= 2) ? "terdeteksi" : "terlewat";
      }
    }
    if (hasil === "terdeteksi") terdeteksi++; else if (hasil === "terlewat") terlewat++; else tak++;
    st.push(env.DB.prepare("INSERT OR IGNORE INTO uji_terlewat (lapangan_id, waktu, prov, status, hasil, dinilai) VALUES (?, ?, ?, ?, ?, ?)").bind(l.id, l.waktu, l.prov, l.status, hasil, kini));
  }
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  return {dinilai: st.length, terdeteksi, terlewat, tak_dinilai: tak};
}
/* satu pintu dari cron (menit 20 tiap jam). Tiap langkah dibungkus sendiri; migrasi 0054 belum jalan = dilewati. */
export async function jalankanUji(env, kini = Date.now()) {
  const out = {};
  for (const [nama, f] of [["sampel", pilihSampelKontrol], ["bersih", bersihkanKontrol], ["terlewat", nilaiTerlewat]]) {
    try { out[nama] = await f(env, kini); } catch (e) { out[nama] = tabelHilang(e) ? {lewat: "migrasi 0054 belum diterapkan"} : {galat: String(e?.message || e).slice(0, 120)}; if (!tabelHilang(e)) console.error("uji lapangan " + nama, e?.message); }
  }
  return out;
}

/* ================================================================ penahanan sel kecil: hitungan rincian < 5 tidak ditampilkan (cegah menunjuk satu kunjungan/orang); headline (n, nilai, selang, vonis) tidak berubah */
export const TAHAN_N = 5;
const tahanSel = (r, kunci) => r.n < TAHAN_N ? {...r, ...Object.fromEntries(kunci.map(k => [k, null])), ditahan: true} : r;
const KUNCI_Q1 = ["n", "ya", "nilai", "selang", "n_efektif", "presisi_mentah"];
export function tahanQ1(q) { const r = q.rincian; return {...q, rincian: {per_level: r.per_level.map(x => tahanSel(x, KUNCI_Q1)), per_firespot: r.per_firespot.map(x => tahanSel(x, KUNCI_Q1)), per_sampel: r.per_sampel.map(x => tahanSel(x, KUNCI_Q1))}}; }
const kecil = x => x < TAHAN_N ? null : x;
export function tahanLain(q) {
  if (q.id === "Q2") return q.n < TAHAN_N ? {...q, terdeteksi: null, terlewat: null, pod: null, ditahan: true, rincian: {tak_dinilai_tidak_dihitung: kecil(q.rincian.tak_dinilai_tidak_dihitung)}} : {...q, rincian: {tak_dinilai_tidak_dihitung: kecil(q.rincian.tak_dinilai_tidak_dihitung)}};
  if (q.id === "Q3") return q.n < TAHAN_N ? {...q, rincian: {brier: null, brier_acuan: null, frekuensi_lolos: null}, ditahan: true} : q;
  if (q.id === "Q4") return {...q, mape: q.n_mape < TAHAN_N ? null : q.mape, rincian: {kuartil: q.n < TAHAN_N ? null : q.rincian.kuartil, taksiran_tidak_dihitung: kecil(q.rincian.taksiran_tidak_dihitung)}, ...(q.n_mape < TAHAN_N || q.n < TAHAN_N ? {ditahan: true} : {})};
  if (q.id === "Q5") return q.n < TAHAN_N ? {...q, benar: null, salah: null, ditahan: true} : q;
  return q;
}

/* ================================================================ GET /api/uji-lapangan */
const TABEL = ["tugas_kartu", "tugas_luas_awal", "tugas_bencana", "tugas_muncul", "uji_terlewat", "uji_sampel", "uji_tugas", "uji_isian"];
async function adaTabel(env) {
  const r = (await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${TABEL.map(() => "?").join(",")})`).bind(...TABEL).all()).results;
  return new Set(r.map(x => x.name));
}
export async function agregat(env, kini = Date.now()) {
  const A = await adaTabel(env);
  if (!A.has("uji_tugas") || !A.has("uji_isian")) return null;
  const hanyaKarhutla = A.has("tugas_bencana") ? "AND NOT EXISTS (SELECT 1 FROM tugas_bencana bb WHERE bb.tugas_id = t.id AND bb.bencana != 'karhutla')" : "";
  const FS = A.has("tugas_kartu") ? "(SELECT json_extract(kk.kartu, '$.firespot') FROM tugas_kartu kk WHERE kk.tugas_id = t.id)" : "NULL";
  const PLAT = A.has("tugas_luas_awal") ? "(SELECT la.luas_ha FROM tugas_luas_awal la WHERE la.tugas_id = t.id)" : "NULL";
  const DASAR = `FROM tugas_isian i JOIN tugas_api t ON t.id = i.tugas_id LEFT JOIN uji_tugas u ON u.tugas_id = t.id LEFT JOIN uji_isian x ON x.isian_id = i.id WHERE t.dummy = 0 AND i.dummy = 0 ${hanyaKarhutla}`;
  /* Q1 */
  const q1 = (await env.DB.prepare(`SELECT coalesce(u.sampel, 'tugas') sampel, coalesce(u.level, t.level) level, coalesce(u.firespot, ${FS}) firespot,
      CASE WHEN i.hasil = 'api_ada' OR (i.hasil = 'sudah_padam' AND x.bekas_terbakar_baru = 'ya') THEN 1 ELSE 0 END ya,
      coalesce((SELECT s.n_kandidat * 1.0 / s.n_dipilih FROM uji_sampel s WHERE s.minggu = u.minggu AND s.prov = u.prov AND s.n_dipilih > 0), 1.0) bobot, count(*) n
    ${DASAR} AND i.langkah = 'konfirmasi' AND i.hasil IS NOT NULL GROUP BY 1, 2, 3, 4, 5`).all()).results;
  /* Q2 */
  let t2 = 0, l2 = 0, tak2 = 0;
  if (A.has("uji_terlewat")) for (const r of (await env.DB.prepare("SELECT hasil, count(*) n FROM uji_terlewat GROUP BY hasil").all()).results) { if (r.hasil === "terdeteksi") t2 = r.n; else if (r.hasil === "terlewat") l2 = r.n; else tak2 = r.n; }
  /* Q3: hanya tugas yang peluang prospektifnya dicatat */
  const A3 = PRAREGISTRASI.q3.ambang, pasangan3 = [];
  const pu = new Map((await env.DB.prepare("SELECT tugas_id, p_lolos FROM uji_tugas WHERE p_lolos IS NOT NULL LIMIT 3000").all()).results.map(r => [r.tugas_id, r.p_lolos]));
  if (pu.size) {
    const per = new Map();
    for (const r of (await env.DB.prepare(`SELECT i.tugas_id, i.luas_ha, i.dibuat FROM tugas_isian i WHERE i.luas_ha IS NOT NULL AND i.dummy = 0 AND i.tugas_id IN (SELECT tugas_id FROM uji_tugas WHERE p_lolos IS NOT NULL LIMIT 3000) ORDER BY i.tugas_id, i.dibuat`).all()).results)
      (per.get(r.tugas_id) || per.set(r.tugas_id, []).get(r.tugas_id)).push(r);
    for (const [id, rs] of per) { const awal = rs[0], akhir = rs.find(r => r.dibuat >= awal.dibuat + A3.jeda_jam * JAM); if (akhir) pasangan3.push({p: pu.get(id), y: akhir.luas_ha >= A3.luas_lolos_ha ? 1 : 0}); }
  }
  /* Q4: kejadian pertama yang diukur dengan metode terukur */
  const MT = METODE_TERUKUR.map(m => `'${m}'`).join(",");
  const r4 = (await env.DB.prepare(`SELECT i.luas_ha lap, coalesce(u.luas_platform_ha, ${PLAT}) plat ${DASAR} AND x.metode_luas IN (${MT}) AND i.luas_ha IS NOT NULL
    AND i.dibuat = (SELECT min(j.dibuat) FROM tugas_isian j JOIN uji_isian y ON y.isian_id = j.id WHERE j.tugas_id = i.tugas_id AND y.metode_luas IN (${MT}) AND j.luas_ha IS NOT NULL) LIMIT 5000`).all()).results;
  const taksiran = (await env.DB.prepare(`SELECT count(*) n ${DASAR} AND x.metode_luas = 'taksiran' AND i.luas_ha IS NOT NULL`).first()).n;
  /* Q5: jendela 7 hari sudah selesai */
  let b5 = 0, s5 = 0;
  const jendela = PRAREGISTRASI.q5.ambang.jendela_hari * HARI;
  const muncul = A.has("tugas_muncul") ? "EXISTS (SELECT 1 FROM tugas_muncul m WHERE m.tugas_id = t.id AND m.waktu <= t.padam_pada + ?1)" : "0";
  for (const r of (await env.DB.prepare(`SELECT t.padam_verif, ${muncul} muncul, count(*) n FROM tugas_api t WHERE t.dummy = 0 AND t.padam_pada IS NOT NULL AND t.padam_pada <= ?2 AND t.padam_verif IN ('padam_terverifikasi', 'muncul_lagi') ${hanyaKarhutla}
    GROUP BY 1, 2`).bind(jendela, kini - jendela).all()).results) { if (r.padam_verif === "padam_terverifikasi" && !r.muncul) b5 += r.n; else s5 += r.n; }
  /* ringkasan sampel kontrol */
  let kontrol = {minggu_tercatat: 0, dipilih: 0, tak_dikunjungi: 0, kandidat: 0};
  if (A.has("uji_sampel")) { const k = await env.DB.prepare("SELECT count(*) minggu, coalesce(sum(n_dipilih), 0) dipilih, coalesce(sum(n_tak_dikunjungi), 0) tak, coalesce(sum(n_kandidat), 0) kandidat FROM uji_sampel").first();
    kontrol = {minggu_provinsi_tercatat: k.minggu, dipilih: k.dipilih, tak_dikunjungi: k.tak, kandidat: k.kandidat}; }
  const dikunjungi = (await env.DB.prepare("SELECT count(*) n FROM uji_tugas u JOIN tugas_api t ON t.id = u.tugas_id WHERE u.sampel = 'kontrol' AND t.konfirmasi_pada IS NOT NULL AND t.dummy = 0").first()).n;
  kontrol.dikunjungi = dikunjungi;
  const P = PRAREGISTRASI, jdl = x => ({judul: P[x.id.toLowerCase()].judul, metrik: P[x.id.toLowerCase()].metrik, ambang: P[x.id.toLowerCase()].ambang, aturan: P[x.id.toLowerCase()].aturan, n_min: P[x.id.toLowerCase()].ambang.n_min, ...x});
  const q2 = hitungQ2(t2, l2);
  return {
    versi: P.versi, diperbarui: kini, praregistrasi: P,
    pertanyaan: [jdl(tahanQ1(hitungQ1(q1))), jdl(tahanLain({...q2, rincian: {tak_dinilai_tidak_dihitung: tak2}})), jdl(tahanLain(hitungQ3(pasangan3))), jdl(tahanLain(hitungQ4(r4, taksiran))), jdl(tahanLain(hitungQ5(b5, s5)))],
    kontrol,
    catatan: ["Tugas otomatis hanya level 3 dan level 2 bersyarat: tanpa sampel kontrol, presisi hanya dihitung pada yang sudah dicurigai. Sampel kontrol dipilih acak per minggu per provinsi dan ditimbang kebalikan peluang terpilih.",
      "Kunjungan hanya terjadi di tempat yang bisa dijangkau regu: hasilnya berlaku untuk cluster yang dekat akses, tidak untuk seluruh kawasan.",
      "Luas taksiran mata tidak dihitung di Q4; hanya keliling GPS, jalan keliling, dan drone.",
      "Data bertahan 180 hari mengikuti retensi tugas; ukuran contoh dalam halaman ini adalah jendela bergulir, bukan akumulasi sepanjang musim.",
      "Q2 bergantung pada laporan regu berkode yang tepercaya dan pada jendela 24 jam titik FIRMS di D1; laporan yang jendelanya tak tercakup tidak dihitung."],
  };
}
/* evaluasi internal: admin ATAU pemirsa di SEMUA host (keputusan pemilik 23 Okt 2026). Urutan: izin -> laju -> cache 60 dtk; izin SELALU di depan cache. */
async function izin(env, req) { return !!(await adminOK(env, req) || await pemirsaSesi(env, req)); }
async function layani(env, req, url, kini, ctx) {
  if (!await izin(env, req)) return gagal(403, "perlu masuk");
  const l = await lajuIP(env, req, "uji.baca", [[60e3, 20]], kini); if (l) return l;
  const r = await cacheTepi(req, ctx, 60, async () => {
    let a; try { a = await agregat(env, kini); } catch (e) { if (tabelHilang(e)) a = null; else throw e; }
    return a ? json(a) : gagal(503, "uji lapangan belum aktif: migrasi 0054 belum diterapkan");
  });
  /* cacheTepi memberi "public": jawaban ini di balik login, jadi private dan bervariasi menurut cookie */
  const h = new Headers(r.headers); h.set("cache-control", r.status === 200 ? "private, max-age=60" : "no-store"); h.append("vary", "cookie");
  return new Response(r.body, {status: r.status, headers: h});
}
export const RUTE_UJI = {
  "GET /api/uji-lapangan": (env, req, url, kini, ctx) => layani(env, req, url, kini, ctx),
};
