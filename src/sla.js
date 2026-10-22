/* Analitik SLA (docs/bnpb/RENCANA-LANJUT.md §1.2, §1.3). SATU modul hitung untuk layar /admin/sla, blok "waktu tanggap api" di Rapor BPBD, dan laporan otomatis:
   tidak ada hitungan kedua di klien. Dua sumber:
   1. status_riwayat (0042): umur data tiap sumber per jam, ditulis cron bersih-bersih dari hasil periksaStatus (/api/status).
   2. tahap waktu per tugas api: deteksi -> tugas -> konfirmasi -> kabar/tiba -> padam -> terverifikasi, dari kolom tugas_api, tugas_isian, penugasan.
   Target hanya untuk aturan yang sudah ada (konfirmasi <= 6 jam, kabar <= 24 jam); tahap lain target_menit null = persentil tanpa vonis.
   Deteksi tanpa jam asli (terdeteksi_awal/himawari_awal kosong) jatuh ke `dibuat` dan TIDAK dihitung di statistiknya ("tidak ada data", bukan nol).
   Tambahan 22 Okt (dashboard Kinerja pemantauan), semua dari tugas_api/tugas_isian/instansi_media/ops_garis/tugas_muncul, juga per wilayah:
   - proses: corong, n tugas yang sudah punya waktu tiap tahap (deteksi = semua tugas; muncul_lagi = tugas di tugas_muncul atau padam_verif muncul_lagi).
   - macet: tugas yang menunggu tahap berikutnya. konfirmasi = buka tanpa konfirmasi (sejak dibuat, target 6 jam); kabar = sudah konfirmasi tanpa kabar tindakan (sejak konfirmasi, target 24 jam);
     tiba = sudah konfirmasi tanpa tiba; padam = sudah tiba tanpa padam; terverifikasi = padam_dilaporkan belum terverifikasi. n_lewat_target null bila tahap tanpa target.
   - lapangan (penyebut = tugas yang punya isian konfirmasi, kecuali disebut lain; penyebut 0 = null, BUKAN 0; lapangan.n = {isian: baris isian, foto, kabar: tugas wajib kabar, padam: tugas pernah dilaporkan padam atau muncul lagi, konfirmasi}): isian_lengkap = konfirmasi dengan PIC (nama, jabatan, WA) + minimal satu foto + status api di
     isian mana pun; foto_gps_sah_pct = foto tanpa gps_curiga / semua foto; kabar_tepat = jarak antar isian (konfirmasi, tindakan, lalu padam atau kini bila masih buka) semuanya <= 24 jam, tugas bukan_api tidak dihitung;
     padam_terverifikasi_pct dan muncul_lagi_pct memakai penyebut tugas yang pernah dilaporkan padam; bukan_api_pct = isian konfirmasi hasil bukan_api; luas = rasio luas lapangan (isian terakhir ber-luas) dan
     luas garis api (ops_garis garis_api, terbesar) terhadap luas satelit; taktik = regu/personel nyata (isian terakhir) per saran rekomendasi.kebutuhan.total (nilai tengah); regu[] = per akun instansi pengisi
     konfirmasi (tanpa nama orang: hanya akun dan nama instansi).
   Migrasi 0043 belum ada = kolom awal dilewati; 0042 belum ada = /api/sla menjawab 503. */
import {json, gagal} from "./worker.js";
import {dummySla} from "./sla_dummy.js";
import {stafOK, stafSesi, dariStaf} from "./staf.js";
import {SEMUA_PERAN} from "./admin_halaman.js";
import {superOK} from "./posko.js";
import {tenggat, PROV} from "./instansi.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, TARGET = {tugas_konfirmasi: 360, konfirmasi_kabar: 1440};   // = TENGGAT_KONFIRMASI / TENGGAT_KABAR di instansi.js
const NAMA = {titik: "Titik panas", berita: "Berita", dampak: "Dampak", himawari: "Himawari-9"};
/* urutan tahap; pasangan berurutan = tahap yang diukur */
export const TAHAP = [["deteksi", "tugas"], ["tugas", "konfirmasi"], ["konfirmasi", "kabar"], ["konfirmasi", "tiba"], ["tiba", "padam"], ["padam", "terverifikasi"]];
const kunciTahap = ([d, k]) => d === "deteksi" ? "deteksi_tugas" : `${d}_${k}`;
const WIB = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
const tanpaTabel = e => /no such table: (main\.)?status_riwayat/i.test(String(e?.message || e));

export function persen(arr, p) {   // nearest-rank
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p / 100 * s.length) - 1))];
}
const bulat = x => x == null ? null : Math.round(x);

/* ---------------- riwayat status (cron) ---------------- */
export async function catatRiwayatStatus(env, hasil, kini = Date.now()) {
  const slot = Math.floor(kini / JAM), st = Object.entries(hasil.sumber || {}).map(([nama, s]) =>
    env.DB.prepare("INSERT OR REPLACE INTO status_riwayat (slot, sumber, umur_menit, batas_menit, segar) VALUES (?, ?, ?, ?, ?)")
      .bind(slot, nama.slice(0, 40), s.umur_jam == null ? null : Math.round(s.umur_jam * 60), s.ambang_jam == null ? null : Math.round(s.ambang_jam * 60), (hasil.basi || []).includes(nama) ? 0 : 1));   // periksaStatus membuang `basi` per sumber; daftarnya di hasil.basi
  if (!st.length) return {lewat: "tanpa sumber"};
  try { await env.DB.batch([...st, env.DB.prepare("DELETE FROM status_riwayat WHERE slot < ?").bind(slot - 90 * 24)]); return {sumber: st.length}; }
  catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0042 belum diterapkan"}; throw e; }
}

/* ---------------- tahap waktu per tugas ---------------- */
/* kolom awal (0043) dan tabel penugasan (0035) boleh belum ada: coba penuh, lalu tanggalkan yang hilang */
export async function muatTugas(env, kini, hari, {prov, kab, provs, dummy = false} = {}) {
  let awal = true, tugasan = true;
  for (let i = 0; i < 3; i++) {
    const sql = `SELECT t.id, t.prov, t.kab, t.status, t.luas_ha, t.dibuat, t.konfirmasi_pada, t.isian_terakhir, t.padam_pada, t.verif_pada, t.padam_verif,
      ${awal ? "t.terdeteksi_awal, t.himawari_awal, t.sumber_awal" : "NULL terdeteksi_awal, NULL himawari_awal, NULL sumber_awal"},
      ${tugasan ? "(SELECT min(tiba_pada) FROM penugasan WHERE tugas_id = t.id AND tiba_pada IS NOT NULL) tiba" : "NULL tiba"},
      (SELECT min(dibuat) FROM tugas_isian WHERE tugas_id = t.id AND langkah = 'tindakan') kabar
      FROM tugas_api t WHERE t.dibuat >= ?1 ${dummy ? "" : "AND t.dummy = 0"} ${prov ? "AND t.prov = ?2" : "AND ?2 IS NULL"} ${kab ? "AND lower(t.kab) = lower(?3)" : "AND ?3 IS NULL"} AND (?4 IS NULL OR t.prov IN (SELECT value FROM json_each(?4))) ORDER BY t.dibuat DESC LIMIT 5000`;
    try { return {baris: (await env.DB.prepare(sql).bind(kini - hari * HARI, prov || null, kab || null, provs?.length ? JSON.stringify(provs) : null).all()).results, awal, tugasan}; }
    catch (e) {
      const m = String(e?.message || e);
      if (awal && /no such column: t?\.?(terdeteksi_awal|himawari_awal|sumber_awal)/i.test(m)) awal = false;
      else if (tugasan && /no such table: (main\.)?penugasan/i.test(m)) tugasan = false;
      else throw e;
    }
  }
  throw new Error("muatTugas: gagal setelah 3 percobaan");
}

/* waktu tiap tahap untuk satu baris tugas (ms epoch atau null) + apakah deteksinya perkiraan */
export function waktuTahap(t) {
  const asli = [t.himawari_awal, t.terdeteksi_awal].filter(x => x != null);
  return {perkiraan: !asli.length, w: {deteksi: asli.length ? Math.min(t.dibuat, ...asli) : t.dibuat, tugas: t.dibuat, konfirmasi: t.konfirmasi_pada, kabar: t.kabar, tiba: t.tiba,
    padam: t.padam_pada, terverifikasi: t.padam_verif === "padam_terverifikasi" ? t.verif_pada : null}};
}
/* durasi (menit) per tahap; null = tidak ada data atau urutan terbalik (isian terlambat dicatat, bukan nol) */
export function durasiTahap(t) {
  const {perkiraan, w} = waktuTahap(t), o = {};
  for (const p of TAHAP) {
    const a = w[p[0]], b = w[p[1]], k = kunciTahap(p);
    o[k] = a == null || b == null || b < a || (p[0] === "deteksi" && perkiraan) ? null : (b - a) / MENIT;
  }
  return o;
}
/* ringkasan: kumpulan baris tugas -> {tahap: {n, p50_menit, p90_menit, target_menit, dalam_target_pct}} */
export function ringkasTahap(baris) {
  const D = baris.map(durasiTahap);
  return TAHAP.map(p => {
    const k = kunciTahap(p), v = D.map(d => d[k]).filter(x => x != null), tm = TARGET[k] ?? null;
    return {dari: p[0], ke: p[1], n: v.length, p50_menit: bulat(persen(v, 50)), p90_menit: bulat(persen(v, 90)), target_menit: tm, dalam_target_pct: tm == null || !v.length ? null : Math.round(1000 * v.filter(x => x <= tm).length / v.length) / 10};
  });
}
const wilayahDari = (baris, kini, perKab) => {
  const g = new Map();
  for (const t of baris) { const kode = perKab ? t.kab : t.prov; (g.get(kode) || g.set(kode, []).get(kode)).push(t); }
  return [...g].map(([kode, ts]) => {
    const D = ts.map(durasiTahap), tahap = {};
    for (const p of TAHAP) { const k = kunciTahap(p), v = D.map(d => d[k]).filter(x => x != null); if (v.length) tahap[k] = {p50: bulat(persen(v, 50)), p90: bulat(persen(v, 90)), n: v.length}; }
    return {kode, nama: perKab ? kode : PROV[kode]?.[1] ?? kode, n: ts.length, tahap, terlambat_buka: ts.filter(t => tenggat(t, kini).terlambat).length, ...(ts[0].isian ? evaluasi(ts, kini) : {})};
  }).sort((a, b) => b.n - a.n || String(a.kode).localeCompare(String(b.kode)));
};

/* ---------------- data tambahan (isian, foto, garis, muncul lagi, saran) ---------------- */
const gugus = (a, n = 1000) => Array.from({length: Math.ceil(a.length / n)}, (_, i) => a.slice(i * n, i * n + n));
const tabelHilang = e => /no such (table|column)/i.test(String(e?.message || e));
/* jalankan sql (memuat `IN (SELECT value FROM json_each(?))`) per gugus id; tabel/kolom belum ada = [] */
async function perGugus(env, sql, ids) {
  const out = [];
  try { for (const g of gugus(ids)) out.push(...(await env.DB.prepare(sql).bind(JSON.stringify(g)).all()).results); }
  catch (e) { if (!tabelHilang(e)) throw e; return []; }
  return out;
}
const IN = "IN (SELECT value FROM json_each(?))";
export async function perkaya(env, baris) {
  const ids = baris.map(t => t.id), M = new Map(baris.map(t => [t.id, t]));
  for (const t of baris) Object.assign(t, {isian: [], foto: 0, foto_sah: 0, foto_konf: 0, garis: null, muncul: false, saran_regu: null, saran_personel: null, akun: null});
  const [isian, media, garis, muncul, saran] = await Promise.all([
    perGugus(env, `SELECT id, tugas_id, akun_id, langkah, dibuat, pic_nama, pic_jabatan, pic_wa, status_api, hasil, luas_ha, regu, personel FROM tugas_isian WHERE tugas_id ${IN} ORDER BY dibuat`, ids),
    perGugus(env, `SELECT tugas_id, isian_id, gps_curiga FROM instansi_media WHERE tugas_id ${IN}`, ids),
    perGugus(env, `SELECT tugas_id, max(luas_ha) l FROM ops_garis WHERE jenis = 'garis_api' AND luas_ha IS NOT NULL AND tugas_id ${IN} GROUP BY tugas_id`, ids),
    perGugus(env, `SELECT DISTINCT tugas_id FROM tugas_muncul WHERE tugas_id ${IN}`, ids),
    perGugus(env, `SELECT id, json_extract(rekomendasi, '$.kebutuhan.total.regu[1]') r, json_extract(rekomendasi, '$.kebutuhan.total.personel[1]') p FROM tugas_api WHERE id ${IN}`, ids),
  ]);
  for (const i of isian) M.get(i.tugas_id)?.isian.push(i);
  const konfId = new Map();
  for (const t of baris) { const k = t.isian.find(i => i.langkah === "konfirmasi"); if (k) { konfId.set(k.id, t); t.akun = k.akun_id; } }
  for (const m of media) { const t = M.get(m.tugas_id); if (!t) continue; t.foto++; if (m.gps_curiga == null) t.foto_sah++; if (konfId.get(m.isian_id) === t) t.foto_konf++; }
  for (const g of garis) M.get(g.tugas_id).garis = g.l;
  for (const m of muncul) M.get(m.tugas_id).muncul = true;
  for (const r of saran) { const t = M.get(r.id); if (r.r > 0) t.saran_regu = r.r; if (r.p > 0) t.saran_personel = r.p; }
  const akun = [...new Set(baris.map(t => t.akun).filter(Boolean))], nama = new Map((await perGugus(env, `SELECT id, wilayah FROM instansi_akun WHERE id ${IN}`, akun)).map(a => [a.id, a.wilayah]));
  for (const t of baris) t.akun_nama = nama.get(t.akun) ?? null;
  return baris;
}

const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : null;
const konf = t => t.isian.find(i => i.langkah === "konfirmasi");
const lengkap = t => { const k = konf(t); return !!k && !!k.pic_nama && !!k.pic_jabatan && !!k.pic_wa && t.foto_konf > 0 && t.isian.some(i => i.status_api); };
const bukanApi = t => konf(t)?.hasil === "bukan_api" || t.status === "bukan_api";
function kabarTepat(t, kini) {
  const k = t.konfirmasi_pada; if (k == null || bukanApi(t)) return null;
  const titik = [k, ...t.isian.filter(i => i.langkah === "tindakan" && i.dibuat >= k).map(i => i.dibuat)].sort((a, b) => a - b);
  titik.push(t.padam_pada ?? (t.status === "buka" ? kini : titik[titik.length - 1]));
  return titik.every((x, i) => !i || x - titik[i - 1] <= 24 * JAM);
}
const lt = (arr, p) => bulat(persen(arr, p));
/* proses + macet + lapangan untuk satu kumpulan tugas (sudah diperkaya) */
export function evaluasi(ts, kini, denganRegu = true) {
  const W = ts.map(t => waktuTahap(t).w), sudah = k => W.filter(w => w[k] != null).length;
  const proses = ["deteksi", "tugas", "konfirmasi", "tiba", "padam", "terverifikasi"].map(tahap => ({tahap, n: sudah(tahap)}));
  proses.push({tahap: "muncul_lagi", n: ts.filter(t => t.muncul || t.padam_verif === "muncul_lagi").length});
  const menunggu = (nama, saring, sejak, target) => { const m = ts.filter(saring); return {tahap: nama, n_menunggu: m.length, n_lewat_target: target == null ? null : m.filter(t => kini - sejak(t) > target * MENIT).length}; };
  const buka = t => t.status === "buka";
  const macet = [menunggu("konfirmasi", t => buka(t) && t.konfirmasi_pada == null, t => t.dibuat, TARGET.tugas_konfirmasi),
    menunggu("kabar", t => buka(t) && t.konfirmasi_pada != null && t.kabar == null && !bukanApi(t), t => t.konfirmasi_pada, TARGET.konfirmasi_kabar),
    menunggu("tiba", t => buka(t) && t.konfirmasi_pada != null && t.tiba == null && !bukanApi(t), t => t.konfirmasi_pada, null),
    menunggu("padam", t => buka(t) && t.tiba != null && t.padam_pada == null, t => t.tiba, null),
    menunggu("terverifikasi", t => t.padam_verif === "padam_dilaporkan", t => t.padam_pada ?? t.dibuat, null)];
  const K = ts.filter(t => konf(t)), kt = K.map(t => kabarTepat(t, kini)).filter(x => x != null), padam = ts.filter(t => t.padam_pada != null || t.muncul || t.padam_verif === "muncul_lagi");
  const foto = ts.reduce((a, t) => a + t.foto, 0), sah = ts.reduce((a, t) => a + t.foto_sah, 0);
  const rasioL = ts.filter(t => t.luas_ha > 0 && t.isian.some(i => i.luas_ha != null)).map(t => t.isian.findLast(i => i.luas_ha != null).luas_ha / t.luas_ha);
  const rasioG = ts.filter(t => t.luas_ha > 0 && t.garis != null).map(t => t.garis / t.luas_ha);
  const reguR = [], persR = [];
  for (const t of ts) { const i = t.isian.findLast(x => x.regu != null), j = t.isian.findLast(x => x.personel != null); if (t.saran_regu && i) reguR.push(i.regu / t.saran_regu); if (t.saran_personel && j) persR.push(j.personel / t.saran_personel); }
  const r2 = x => x == null ? null : Math.round(x * 100) / 100;
  const lap = {n: {isian: ts.reduce((a, t) => a + t.isian.length, 0), foto, kabar: kt.length, padam: padam.length, konfirmasi: K.length}, isian_lengkap_pct: pct(K.filter(lengkap).length, K.length), foto_gps_sah_pct: pct(sah, foto), gps_curiga_n: foto - sah, kabar_tepat_pct: pct(kt.filter(Boolean).length, kt.length),
    padam_terverifikasi_pct: pct(padam.filter(t => t.padam_verif === "padam_terverifikasi").length, padam.length), muncul_lagi_pct: pct(padam.filter(t => t.muncul || t.padam_verif === "muncul_lagi").length, padam.length),
    bukan_api_pct: pct(K.filter(bukanApi).length, K.length),
    luas: {n: rasioL.length, n_garis: rasioG.length, rasio_lapangan_satelit_p50: r2(persen(rasioL, 50)), rasio_garis_satelit_p50: r2(persen(rasioG, 50))},
    taktik: {n: Math.max(reguR.length, persR.length), regu_nyata_per_saran_p50: r2(persen(reguR, 50)), personel_nyata_per_saran_p50: r2(persen(persR, 50))}};
  if (denganRegu) {
    const per = new Map();
    for (const t of K) if (t.akun) (per.get(t.akun) || per.set(t.akun, []).get(t.akun)).push(t);
    lap.regu = [...per].map(([akun, a]) => { const D = a.map(durasiTahap), kk = a.map(t => kabarTepat(t, kini)).filter(x => x != null);
      return {akun, nama: a[0].akun_nama, n: a.length, tiba_p50_menit: lt(D.map(d => d.konfirmasi_tiba).filter(x => x != null), 50), padam_p50_jam: (v => v == null ? null : Math.round(v * 10) / 10)(persen(a.filter(t => t.padam_pada != null).map(t => (t.padam_pada - t.dibuat) / JAM), 50)),
        isian_lengkap_pct: pct(a.filter(lengkap).length, a.length), kabar_tepat_pct: pct(kk.filter(Boolean).length, kk.length)}; }).sort((a, b) => b.n - a.n || String(a.akun).localeCompare(String(b.akun)));
  }
  return {proses, macet, lapangan: lap};
}

/* ---------------- respons /api/sla ---------------- */
/* dummy = false: tugas, alarm, dan riwayat status dummy TIDAK ikut (default); true hanya untuk Super Admin (?dummy=1) dan respons membawa dummy: true.
   provs = batas wilayah staf berwilayah (daftar kode provinsi); alarm Himawari tak punya provinsi, jadi daftarnya dikosongkan untuk mereka. */
export async function hitungSla(env, kini, {hari = 30, prov, kab, provs, dummy = false} = {}) {
  const catatan = [], dari = kini - hari * HARI;
  const R = (await env.DB.prepare(`SELECT slot, sumber, umur_menit, batas_menit, segar FROM status_riwayat WHERE slot >= ? ${dummy ? "" : "AND sumber NOT LIKE 'dummy\\_%' ESCAPE '\\'"} ORDER BY slot`).bind(Math.floor(dari / JAM)).all()).results;   // tanpa 0042: lempar, rute menjawab 503
  const per = new Map(), perHari = new Map();
  for (const r of R) { (per.get(r.sumber) || per.set(r.sumber, []).get(r.sumber)).push(r); const h = WIB(r.slot * JAM), g = perHari.get(h) || perHari.set(h, {n: 0, segar: 0}).get(h); g.n++; g.segar += r.segar; }
  const sumber = [...per].map(([id, rs]) => {
    const u = rs.map(r => r.umur_menit).filter(x => x != null), gangguan = []; let buka = null;
    for (const r of rs) { if (!r.segar && !buka) buka = {mulai: r.slot * JAM, akhir: (r.slot + 1) * JAM}; else if (!r.segar) buka.akhir = (r.slot + 1) * JAM; else if (buka) { gangguan.push(buka); buka = null; } }
    if (buka) gangguan.push(buka);
    return {id, nama: NAMA[id] ?? id, batas_menit: rs.findLast(r => r.batas_menit != null)?.batas_menit ?? null, slo_target_pct: null, segar_pct: Math.round(1000 * rs.filter(r => r.segar).length / rs.length) / 10,
      umur_p50: bulat(persen(u, 50)), umur_p95: bulat(persen(u, 95)), gangguan: gangguan.map(g => ({mulai: g.mulai, selesai: g.akhir, menit: Math.round((g.akhir - g.mulai) / MENIT)}))};
  });
  if (!sumber.length) catatan.push("Belum ada riwayat umur data: cron bersih-bersih menulisnya tiap jam.");
  const {baris, awal, tugasan} = await muatTugas(env, kini, hari, {prov, kab, provs, dummy});
  await perkaya(env, baris);
  if (!awal) catatan.push("Kolom jam deteksi pertama belum ada (migrasi 0043 belum diterapkan): tahap deteksi ke tugas tidak dihitung.");
  else if (baris.length && baris.every(t => waktuTahap(t).perkiraan)) catatan.push("Tidak ada tugas dengan jam deteksi pertama asli; tahap deteksi ke tugas menunggu pipeline mengisi awal.");
  if (!tugasan) catatan.push("Tabel penugasan belum ada (migrasi 0035): tahap tiba tidak dihitung.");
  catatan.push("Target hanya untuk aturan yang sudah ada: konfirmasi paling lama 6 jam, kabar tindakan paling lama 24 jam sesudah konfirmasi. Tahap lain menampilkan persentil tanpa vonis.");
  catatan.push("Tahap tanpa isian dihitung tidak ada data, bukan nol.");
  const perkiraan = baris.filter(t => waktuTahap(t).perkiraan).length;
  if (perkiraan) catatan.push(`${perkiraan} dari ${baris.length} tugas memakai waktu pembuatan sebagai perkiraan deteksi dan tidak ikut statistik deteksi.`);
  /* tren harian: kesegaran dari riwayat, median deteksi->tugas dari tugas yang dibuat hari itu */
  const tugasHari = new Map();
  for (const t of baris) { const d = durasiTahap(t).deteksi_tugas; if (d != null) { const h = WIB(t.dibuat); (tugasHari.get(h) || tugasHari.set(h, []).get(h)).push(d); } }
  const tren = [...new Set([...perHari.keys(), ...tugasHari.keys()])].sort().map(tanggal => ({tanggal, segar_pct: perHari.has(tanggal) ? Math.round(1000 * perHari.get(tanggal).segar / perHari.get(tanggal).n) / 10 : null, deteksi_tugas_p50: bulat(persen(tugasHari.get(tanggal) || [], 50))}));
  /* Himawari: alarm dan selisih terhadap VIIRS (hanya tugas yang terkunci oleh alarm) */
  const hw = {alarm: 0, terkunci: 0, hilang: 0, selisih_viirs_p50_menit: null, daftar: []};
  try {
    for (const r of (await env.DB.prepare(`SELECT status, count(*) n FROM alarm_himawari WHERE pertama >= ? ${dummy ? "" : "AND id NOT LIKE 'dummy%'"} GROUP BY status`).bind(dari).all()).results) { hw.alarm += r.n; if (r.status !== "siaga") hw[r.status] = r.n; }
    if (!provs?.length) hw.daftar = (await env.DB.prepare(`SELECT id, round(lat, 2) lat, round(lon, 2) lon, radius_m, pertama, terakhir, n_pindai, status, tugas_id, terkunci_pada FROM alarm_himawari WHERE status != 'hilang' AND terakhir >= ? ${dummy ? "" : "AND id NOT LIKE 'dummy%'"} ORDER BY terakhir DESC LIMIT 50`).bind(Math.max(dari, kini - 7 * HARI)).all()).results;
    else catatan.push("Daftar alarm Himawari tidak ditampilkan untuk staf berwilayah (alarm belum punya provinsi).");
  } catch (e) { if (!/no such table: (main\.)?alarm_himawari/i.test(String(e?.message || e))) throw e; catatan.push("Alarm Himawari belum aktif (migrasi 0043 belum diterapkan)."); }
  hw.selisih_viirs_p50_menit = bulat(persen(baris.filter(t => t.himawari_awal != null).map(t => ((t.terdeteksi_awal ?? t.dibuat) - t.himawari_awal) / MENIT).filter(x => x >= 0), 50));
  return {kini, hari, ...(dummy ? {dummy: true} : {}), ...(prov ? {prov_nama: PROV[prov]?.[1] ?? null} : {}), ...(kab ? {kab_nama: baris.find(t => t.kab.toLowerCase() === kab.toLowerCase())?.kab ?? kab} : {}),
    sumber, tahap: ringkasTahap(baris), wilayah: wilayahDari(baris, kini, !!prov), tren, himawari: hw, catatan, ...evaluasi(baris, kini)};
}

/* blok Rapor BPBD: aparat/kab tanpa mengubah bobot RAPOR. ikut = termasuk data dummy. */
export async function waktuTanggapApi(env, kini, ikut = false, hari = 30) {
  try {
    const {baris} = await muatTugas(env, kini, hari, {dummy: ikut}), per = new Map();
    for (const t of baris) { const k = t.prov + "|" + t.kab; (per.get(k) || per.set(k, []).get(k)).push(t); }
    const ringkas = ts => Object.fromEntries(ringkasTahap(ts).filter(x => x.n).map(x => [kunciTahap([x.dari, x.ke]), {n: x.n, p50_menit: x.p50_menit, p90_menit: x.p90_menit, ...(x.target_menit != null ? {target_menit: x.target_menit, dalam_target_pct: x.dalam_target_pct} : {})}]));
    return {tersedia: true, label: "waktu tanggap api, terpisah dari indeks komposit (bobot tidak berubah)", hari, n_tugas: baris.length, nasional: ringkas(baris),
      kab: [...per].map(([k, ts]) => { const [prov, kab] = k.split("|"); return {prov, kab, n: ts.length, tahap: ringkas(ts)}; }).sort((a, b) => b.n - a.n || a.prov.localeCompare(b.prov) || a.kab.localeCompare(b.kab))};
  } catch (e) { if (/no such table/i.test(String(e?.message || e))) return {tersedia: false, alasan: "tugas api belum diaktifkan"}; throw e; }
}

/* ---------------- rute ---------------- */
async function rute(env, req, url, kini) {
  /* hak SAMA dengan halaman /admin/kinerja: adminOK (token, akun gerbang, sesi admin) ATAU sesi staf berperan apa pun (SEMUA_PERAN) */
  const oleh = await stafOK(env, req, SEMUA_PERAN);
  if (!oleh) return gagal(403, "analitik SLA hanya untuk admin atau staf BNPB");
  const q = url.searchParams, hari = Math.min(90, Math.max(1, Math.floor(Number(q.get("hari") || 30)) || 30)), kab = q.get("kab") || "";
  let prov = q.get("prov") || "", provs = null;
  if (prov && !/^\d{2}$/.test(prov)) return gagal(400, "prov harus kode 2 digit");
  if (kab.length > 60) return gagal(400, "kab terlalu panjang");
  /* staf berwilayah hanya melihat wilayahnya: prov dipaksa ke wilayah itu, provinsi lain 403 */
  if (dariStaf(oleh)) {
    const w = (await stafSesi(env, req, kini))?.wilayah || [];
    if (w.length) { if (prov && !w.includes(prov)) return gagal(403, "wilayah Anda tidak mencakup provinsi itu"); if (!prov) { if (w.length === 1) prov = w[0]; else provs = w; } }
  }
  const dummy = q.get("dummy") === "1" && !!await superOK(env, req);   // dummy: Super Admin saja, ?dummy=1 (pola meja.js)
  try { return json(await hitungSla(env, kini, {hari, prov, kab, provs, dummy})); }
  catch (e) { if (tanpaTabel(e)) return gagal(503, "analitik SLA belum aktif (migrasi 0042 belum diterapkan)"); throw e; }
}
export const RUTE_SLA = {"GET /api/sla": rute, "POST /api/sla/dummy": (env, req, url, kini) => dummySla(env, req, kini)};
