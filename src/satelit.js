/* Riwayat kedatangan data FIRMS per satelit (migrasi 0075 satelit_granul) supaya jeda "lintasan sampai data tampil di aplikasi" terukur dari riwayat,
   bukan angka tetap 3 jam / 2 jam. Granul = satu (sensor, menit akuisisi); `terlihat` = waktu putaran titik (perbaruiTitik) yang PERTAMA melihatnya, jadi
   terlihat - akuisisi = jeda sampai titik itu muncul di /api/titik = latensi FIRMS + tunggu putaran Worker berikutnya (putaran tiap 3 jam, rata-rata ±1,5 jam
   menunggu). Itu BUKAN latensi FIRMS murni (bawaan lama 27 Okt 2026), jadi tidak sebesar-besaran sama. Jendela urai CSV Worker (JENDELA_URAI_JAM) membatasi jeda
   yang bisa tercatat: granul yang baru muncul di FIRMS sesudah umurnya lewat jendela itu tidak pernah tercatat, jadi tak ada jeda tercatat di atas
   `batas_jeda_menit` (= JENDELA_URAI_JAM * 60, ikut di respons) dan ekor panjang terpotong. Penulis: putaran titik yang sudah ada (tanpa panggilan FIRMS baru). Pembaca: GET /api/satelit/jeda
   (pipeline scripts/data/tle.py memakainya untuk jeda_data_menit; kontrak bentuknya dipakai layar kartu "Satelit berikutnya").
   Endpoint TIDAK menghitung dari granul per permintaan: cron harian (ringkasGranul) menghitung ringkasan 30 hari sekali dan menyimpannya sebagai satu baris satelit_ringkas;
   endpoint membaca baris itu. Alasannya kuota baca D1: miss cache tepi terjadi per pusat data, dan tiap miss yang menghitung dari granul membaca ribuan baris.
   Berkas ini sengaja tidak mengimpor worker.js: titik.js (yang diimpor worker.js) memakainya. */
const MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, WIB = 7 * JAM;
export const JENDELA_URAI_JAM = 24;   // satu-satunya tempat: titik.js (uraiCSV) memakainya sebagai jendela bawaan, endpoint menurunkan batas_jeda_menit darinya
export const JENDELA_HARI = 30, SIMPAN_HARI = 400, JAM_PANGKAS_UTC = 4, CELAH_LINTASAN_MENIT = 45;   // 04 UTC = 11 WIB: bukan jam 20 UTC (SIPPA telemetri + dasar SIHKA) dan bukan kelipatan 3 (titik, antrean, push)
export const JAM_RINGKAS_UTC = 13, TELAT_RINGKAS_JAM = 25;   // ringkasan harian 13:19 UTC, sebelum tle.py (data.yml 14:20 UTC); ringkasan > 25 jam ikut dihitung ulang di menit 19 jam berikutnya (penyembuhan bila 13:19 gagal)
const KODE = ["N20", "N21", "M", "N"], BARIS_PER_PERNYATAAN = 800;   // 800 baris ~ 25 KB JSON: jauh di bawah batas panjang pernyataan D1 (100 KB)

const resp = (isi, status = 200) => new Response(typeof isi === "string" ? isi : JSON.stringify(isi), {status,
  headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff"}});
const tanpaTabel = e => /no such table/i.test(String(e?.message || e));

/* ---------------- tulis: dari hasil uraiCSV per sensor ke baris [kode, menit akuisisi (ms UTC), jumlah deteksi] ---------------- */
/* `hasil` = larik {titik: [{s: kode, t: ms akuisisi dibulatkan menit}], galat?}: satu elemen per sensor. Sensor galat (titik kosong) tidak menghasilkan baris.
   Hitung dengan Map berkunci angka per sensor (tanpa membuat teks per titik): putaran bisa membawa puluhan ribu titik dan anggaran CPU Worker Free hanya 10 ms. */
export function granulDari(hasil) {
  const out = [];
  for (const h of hasil) {
    if (!h.titik?.length) continue;
    const s = h.titik[0].s, m = new Map();
    for (const p of h.titik) m.set(p.t, (m.get(p.t) || 0) + 1);
    for (const [t, n] of [...m].sort((a, b) => a[0] - b[0])) out.push([s, t, n]);
  }
  return out;
}

/* INSERT OR IGNORE lewat json_each: satu pernyataan, satu parameter teks per 800 baris, semuanya dalam satu batch (satu perjalanan ke D1, tanpa SELECT).
   OR IGNORE menjaga `terlihat` pengambilan pertama dan membuang baris yang melanggar CHECK tanpa menggagalkan sisanya. Tidak pernah melempar:
   tabel belum ada (0075 belum diterapkan) atau galat D1 lain = satu console.warn dan {galat}, putaran titik tetap berhasil. */
export async function catatGranul(env, hasil, kini) {
  try {
    const baris = granulDari(hasil); if (!baris.length) return {lihat: 0, baru: 0};
    const sql = "INSERT OR IGNORE INTO satelit_granul (sensor, akuisisi, terlihat, n) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), ?, json_extract(value, '$[2]') FROM json_each(?)";
    const st = []; for (let i = 0; i < baris.length; i += BARIS_PER_PERNYATAAN) st.push(env.DB.prepare(sql).bind(kini, JSON.stringify(baris.slice(i, i + BARIS_PER_PERNYATAAN))));
    const r = await env.DB.batch(st);
    return {lihat: baris.length, baru: r.reduce((a, x) => a + (x.meta?.changes || 0), 0)};
  } catch (e) {
    const galat = tanpaTabel(e) ? "migrasi 0075 belum dijalankan" : String(e?.message || e).slice(0, 120);
    console.warn("titik: riwayat granul satelit tidak ditulis:", galat);
    return {galat};
  }
}

/* sekali sehari di cron bersih-bersih (menit 17 tiap jam; hanya jam JAM_PANGKAS_UTC yang bekerja). `paksa` untuk uji. Melempar bila tabel belum ada: pemanggil menelannya. */
export async function bersihkanGranul(env, kini = Date.now(), {paksa = false} = {}) {
  if (!paksa && new Date(kini).getUTCHours() !== JAM_PANGKAS_UTC) return {lewat: "bukan jamnya"};
  const r = await env.DB.prepare("DELETE FROM satelit_granul WHERE akuisisi < ?").bind(kini - SIMPAN_HARI * HARI).run();
  return {dihapus: r.meta?.changes ?? 0};
}

/* ---------------- baca: GET /api/satelit/jeda ---------------- */
/* nearest-rank pada larik terurut naik; p * n bilangan bulat jadi pembagian 100 tepat (tanpa 0,9 * 30 = 27,000000000000004) */
const persen = (urut, p) => urut[Math.max(0, Math.ceil(p * urut.length / 100) - 1)];
/* lintasan = jumlah gugus granul berurutan (akuisisi naik) dengan celah antar-granul > CELAH_LINTASAN_MENIT (tepat 45 menit masih satu gugus): satu lintasan satelit
   menghasilkan beberapa granul berselang menit, dan statistik per granul menimbang lintasan panjang lebih berat. Dihitung per kelompok sendiri (sensor, siang, malam):
   lintasan yang melintasi 06.00 atau 18.00 WIB terhitung satu di siang dan satu di malam, jadi siang + malam bisa melebihi total. */
const lintasan = urut => { let n = 0, prev = -Infinity; for (const t of urut) { if (t - prev > CELAH_LINTASAN_MENIT * MENIT) n++; prev = t; } return n; };
const ringkas = ({jeda, ak}) => {
  if (!jeda.length) return {n: 0, lintasan: 0, median_menit: null, p90_menit: null};
  const u = Int32Array.from(jeda).sort();   // Int32Array.sort() = numerik
  return {n: u.length, lintasan: lintasan(ak), median_menit: persen(u, 50), p90_menit: persen(u, 90)};
};
const kelompok = () => ({jeda: [], ak: []});

/* Jendela tetap 30 hari ke belakang dari `kini`. Dua pernyataan dalam SATU batch: (1) granul 30 hari lewat indeks akuisisi (urut akuisisi, dasar `lintasan`), (2) satu baris akuisisi tertua untuk
   mulai_catat. mulai_catat = putaran pertama tabel ini (min terlihat): baris akuisisi tertua selalu berasal dari putaran pertama (yang melihat 24 jam data lama
   sekaligus), jadi cukup satu baris dan tanpa pindai terlihat (tak berindeks). Setelah pemangkasan 400 hari ia menjadi "tertua yang masih disimpan": tidak
   berpengaruh pada jendela 30 hari. Granul dengan akuisisi < mulai_catat TIDAK dihitung: terlihat serentak di putaran pertama, jedanya palsu.
   Hanya dipanggil dari cron (ringkasGranul) dan uji, TIDAK dari jalur permintaan publik. Melempar bila tabel belum ada. CHECK terlihat >= akuisisi menjamin jeda tak negatif. */
export async function hitungJeda(env, kini = Date.now()) {
  const dari = kini - JENDELA_HARI * HARI;
  const [g, awal] = await env.DB.batch([
    env.DB.prepare("SELECT sensor, akuisisi, terlihat FROM satelit_granul WHERE akuisisi >= ? AND akuisisi <= ? ORDER BY akuisisi").bind(dari, kini),
    env.DB.prepare("SELECT terlihat FROM satelit_granul ORDER BY akuisisi LIMIT 1")]);
  const mulai = awal.results[0]?.terlihat ?? null;
  const per = new Map(KODE.map(k => [k, {semua: kelompok(), siang: kelompok(), malam: kelompok(), hari: new Set()}]));
  for (const x of g.results) {
    const s = per.get(x.sensor); if (!s || (mulai != null && x.akuisisi < mulai)) continue;
    const m = Math.round((x.terlihat - x.akuisisi) / MENIT), w = x.akuisisi + WIB, jam = Math.floor((w % HARI) / JAM);   // jam akuisisi WIB
    for (const k of [s.semua, jam >= 6 && jam < 18 ? s.siang : s.malam]) { k.jeda.push(m); k.ak.push(x.akuisisi); }
    s.hari.add(Math.floor(w / HARI));
  }
  const sensor = Object.fromEntries(KODE.map(k => { const s = per.get(k), t = ringkas(s.semua);
    return [k, {n: t.n, lintasan: t.lintasan, hari_ada: s.hari.size, median_menit: t.median_menit, p90_menit: t.p90_menit, siang: ringkas(s.siang), malam: ringkas(s.malam)}]; }));
  const iso = t => new Date(t).toISOString();
  return {dibuat: iso(kini), hari: JENDELA_HARI, dari: iso(dari), sampai: iso(kini), mulai_catat: mulai == null ? null : iso(mulai), batas_jeda_menit: JENDELA_URAI_JAM * 60, sensor};
}

/* Cron harian: menit 19 tiap jam (worker.js, invokasi sendiri supaya CPU hitung 30 hari tak menumpang bersih-bersih menit 17). Menghitung dan menyimpan ringkasan HANYA bila
   jamnya (JAM_RINGKAS_UTC), atau barisnya belum ada sama sekali (deploy pertama), atau sudah lebih tua dari TELAT_RINGKAS_JAM (13:19 gagal): di jam lain satu SELECT satu baris.
   UPSERT satu baris (id = 1). Tabel belum ada = {lewat} tanpa galat (migrasi 0075 belum diterapkan). `paksa` untuk uji. */
export async function ringkasGranul(env, kini = Date.now(), {paksa = false} = {}) {
  try {
    if (!paksa && new Date(kini).getUTCHours() !== JAM_RINGKAS_UTC) {
      const r = await env.DB.prepare("SELECT dibuat FROM satelit_ringkas WHERE id = 1").first();
      if (r && r.dibuat > kini - TELAT_RINGKAS_JAM * JAM) return {lewat: "bukan jamnya"};
    }
    const isi = await hitungJeda(env, kini), teks = JSON.stringify(isi);
    await env.DB.prepare("INSERT INTO satelit_ringkas (id, isi, dibuat) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET isi = excluded.isi, dibuat = excluded.dibuat").bind(teks, kini).run();
    return {dibuat: isi.dibuat, byte: teks.length, granul: KODE.reduce((a, k) => a + isi.sensor[k].n, 0)};
  } catch (e) {
    if (tanpaTabel(e)) return {lewat: "migrasi 0075 belum dijalankan"};
    throw e;
  }
}

/* GET /api/satelit/jeda: satu baris satelit_ringkas, diteruskan apa adanya (teks JSON tersimpan, tanpa JSON.parse). Tabel atau baris belum ada = 503 dengan galat umum (detail
   hanya ke console; nama migrasi tidak keluar ke publik), tanpa cache (cacheTepi hanya menyimpan 200). Tidak pernah menyentuh satelit_granul. */
export async function jedaSatelit(env) {
  let r;
  try { r = await env.DB.prepare("SELECT isi FROM satelit_ringkas WHERE id = 1").first(); }
  catch (e) {
    if (tanpaTabel(e)) { console.warn("satelit jeda: tabel satelit_ringkas belum ada (migrasi 0075)"); return resp({galat: "data belum tersedia"}, 503); }
    console.error("satelit jeda", e?.message); return resp({galat: "galat server"}, 500);
  }
  if (!r) { console.warn("satelit jeda: ringkasan belum dihitung"); return resp({galat: "data belum tersedia"}, 503); }
  return resp(r.isi);
}
