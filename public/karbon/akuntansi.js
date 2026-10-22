/* Akuntansi kredit karbon pra-FS (kontrak: docs/karbon/RANCANGAN.md §4). SATU-SATUNYA tempat rumus kredit & keuangan.
   Modul ES murni tanpa DOM dan tanpa impor: dipakai peramban (public/karbon), worker (src/karbon.js), dan node:test.
   Satuan di nama: _ha, _t (tCO2e), _usd. Masukan stat = statistik satelit per poligon §3.2. Estimasi satelit, belum diverifikasi.
   Parameter pecahan di luar 0..1 DITOLAK (validasiAsumsi), tidak pernah dijepit diam-diam. */

export const CO2_PER_C = 44 / 12;

/* Ambang dan koefisien yang juga dikutip layar (kalimat Metode, kartu): satu sumber, tidak diketik ulang di layar. */
export const AMBANG = Object.freeze({
  luas_min_ha: 10000, hutan_sisa_min: 0.5, gambut_maks: 0.02, hilang_min_teramati_ha: 20,
  buffer_lantai: 0.12, buffer_per_kelas: 0.05, kelas_api_maks: 2, hutan_tutupan_min_pct: 30, meleset_lipat: 2,
});
export const UJI_BALIK = Object.freeze({latih: [2010, 2019], uji: [2020, 2024]});   // bawaan ujiBalik
export const BATAS_HARGA = 1000;   // batas atas pencarian harga impas (USD/t)

export const ASUMSI_BAWAAN = Object.freeze({
  periode_acuan: [2016, 2025], metode: "rerata", ef_metode: "gfw", tahun_mulai: 2027, durasi_th: 20, masa_baseline_th: 7, pendorong_baseline: ["1", "2", "3", "6"],
  efektivitas: 0.8, kebocoran: 0.2, ketidakpastian: 0.15, buffer: null, bagian_negara: 0.1,
  porsi_terjual: 0.9, harga_usd: 5, eskalasi: 0, kurs: 16500, capex_usd: 600000, opex_tetap_usd_th: 250000,
  opex_usd_per_t: 1.5, verifikasi_usd: 50000, siklus_verifikasi: 2, jeda_terbit: 3, pnbp: 0.1,
  bagi_hasil_pemegang: 0.35, dana_komunitas: 0.1, pph: 0.22, diskonto: 0.15,
});

/* Sumber tiap bawaan, ditulis dengan nama sumber yang bisa dicari pembaca. Dokumen pemilik pribadi disebut judulnya saja.
   HIPOTESIS = belum ada sumber, ganti bila ada. */
const B = "bersumber", H = "HIPOTESIS", PA = ASUMSI_BAWAAN.periode_acuan;
const MB = "Manual Book Carbon Business", COA = "Paparan COA untuk PPI 2022";
export const SUMBER_ASUMSI = Object.freeze({
  periode_acuan: {teks: `10 tahun data terakhir (${PA[0]}–${PA[1]}) sebagai periode acuan baseline`, sumber: "pilihan tim; diuji lewat uji balik", status: H},
  metode: {teks: "baseline riwayat satu poligon, BUKAN VM0048 (VM0048 memakai data aktivitas yurisdiksi dari Verra, belum terbit untuk Indonesia). rerata = laju proporsional; tren = regresi linear ha/th dipotong antara 0 dan maksimum teramati", sumber: "rancangan modul karbon §4.1", status: H},
  ef_metode: {teks: "gfw = faktor emisi teramati GFW; frl = biomassa & dekomposisi gambut FRL Indonesia 2022", sumber: "FRL Indonesia 2022 Tabel 6–10 (public/karbon/faktor_frl.json); pemetaan pendorong ke kelas tujuan HIPOTESIS", status: H},
  tahun_mulai: {teks: "tahun kredit pertama", sumber: "rencana tim", status: H},
  durasi_th: {teks: "umur proyek 20 th (30 th = ujung atas)", sumber: `${MB} hlm 58 (tipikal 20 th) dan hlm 64 (Rimba Raya 30 th); ${COA} hlm 23 (asumsi 20 th)`, status: B},
  masa_baseline_th: {teks: `baseline berlaku paling lama ${ASUMSI_BAWAAN.masa_baseline_th} th sesudah tahun mulai, lalu harus dinilai ulang; kredit sesudahnya dilaporkan terpisah`, sumber: "Verra VMD0055 v1.1 (VM0048)", status: B},
  pendorong_baseline: {teks: "pendorong WRI/Google yang dihitung sebagai deforestasi tak terencana yang dapat dicegah: 1 pertanian permanen, 2 komoditas keras, 3 perladangan, 6 permukiman/infrastruktur. Tebang (4) = indikator IFM, kebakaran (5) dan alami (7) tidak masuk", sumber: "Sims dkk. 2025 (pendorong WRI/Google); pilihan pendorong yang masuk HIPOTESIS", status: H},
  efektivitas: {teks: "porsi emisi baseline yang benar-benar dicegah proyek", sumber: "belum ada data proyek", status: H},
  kebocoran: {teks: "porsi reduksi yang pindah ke luar area", sumber: `${MB} (studi kasus) memakai 0 tanpa metode`, status: H},
  ketidakpastian: {teks: "potongan konservatif; VMD0055 v1.1 memicu inflasi bila ketidakpastian data aktivitas > ±10% (CI 90%)", sumber: "Verra VMD0055 v1.1; nilai 0,15 menunggu uji balik", status: H},
  buffer: {teks: `null = dari risiko api: ${AMBANG.buffer_lantai * 100}% + ${AMBANG.buffer_per_kelas * 100}% × kelas api (kelas 0..${AMBANG.kelas_api_maks}), jadi maksimum efektif ${Math.round((AMBANG.buffer_lantai + AMBANG.buffer_per_kelas * AMBANG.kelas_api_maks) * 100)}%. Lantai ${AMBANG.buffer_lantai * 100}% bersumber (rating minimum NPRT v4.2); kenaikan per kelas HIPOTESIS`, sumber: "Verra AFOLU Non-Permanence Risk Tool (NPRT) v4.2", status: H},
  bagian_negara: {teks: "porsi untuk NDC/otorisasi pemerintah", sumber: "Permenhut 6/2026 tidak menyebut persen; Permen LHK 21/2022 (0–5% domestik, 10–20% internasional) sudah dicabut", status: H},
  porsi_terjual: {teks: "porsi kredit terbit yang terjual", sumber: `${MB} hlm 68 memakai 72%; 90% pilihan tim`, status: H},
  harga_usd: {teks: "harga dasar USD/tCO2e. Rentang pasar 2025–26: ±USD 4 (rata-rata global MSCI 2025) sampai ±USD 8 (REDD+ BBB+, Sylvera Q3 2026); bawaan 5 = lantai offtake Agrinas/COA", sumber: `MSCI 2025; Sylvera Q3 2026 (sekunder); lantai offtake Agrinas (surat ke KLHK 2020) dan ${COA} hlm 23`, status: B},
  eskalasi: {teks: "kenaikan harga per tahun; bawaan 0 karena eskalasi harga tanpa eskalasi biaya menggelembungkan NPV, pakai skenario", sumber: `${MB} hlm 68 (Rimba Raya +USD 0,5/th, ±6%); belum ada eskalasi biaya yang menyertainya`, status: H},
  kurs: {teks: "Rp per USD, hanya untuk tampilan", sumber: `${MB} hlm 67 memakai 15.600 (2023); 16.500 perkiraan tim`, status: H},
  capex_usd: {teks: "studi + validasi + pendaftaran, 50/50 tahun 0 dan 1", sumber: `${COA} hlm 23: USD 3.000.000 per 20.000 ha sebagai pembanding; USD 600.000 pilihan tim`, status: H},
  opex_tetap_usd_th: {teks: "patroli, pemantauan, kantor per tahun", sumber: "belum ada", status: H},
  opex_usd_per_t: {teks: "biaya per tCO2e kredit", sumber: `${COA} hlm 23 (USD 1,5/t)`, status: B},
  verifikasi_usd: {teks: "biaya VVB per verifikasi", sumber: "belum ada penawaran VVB", status: H},
  siklus_verifikasi: {teks: "verifikasi (dan penerbitan) tiap N tahun mulai terbit pertama, plus satu di tahun kredit terakhir bila masih ada yang belum terbit", sumber: `${MB} hlm 46 dan 58 menyebut MRV minimal tahunan; 2 th pilihan biaya`, status: H},
  jeda_terbit: {teks: "kredit pertama terbit di tahun ke-3", sumber: `${MB} hlm 58; ${COA} hlm 25`, status: B},
  pnbp: {teks: "PNBP pendapatan karbon 10%", sumber: `Perpres 110/2025 tidak menyebut persentase; 10% hanya dari ${MB} hlm 68 (sekunder, dasar hukum tidak dikutip)`, status: H},
  bagi_hasil_pemegang: {teks: "bagian pemegang konsesi dari laba operasi", sumber: "belum ada kesepakatan", status: H},
  dana_komunitas: {teks: "dana manfaat komunitas dari pendapatan", sumber: "belum ada", status: H},
  pph: {teks: "PPh badan 22%", sumber: `${MB} hlm 68`, status: B},
  diskonto: {teks: "tingkat diskonto NPV", sumber: `${MB} hlm 67`, status: B},
});

const KAT = ["1", "2", "3", "4", "5", "6", "7"];
const PECAHAN = ["efektivitas", "kebocoran", "ketidakpastian", "bagian_negara", "porsi_terjual", "pnbp", "bagi_hasil_pemegang", "dana_komunitas", "pph", "diskonto"];
const TAK_NEGATIF = ["harga_usd", "capex_usd", "opex_tetap_usd_th", "opex_usd_per_t", "verifikasi_usd"];
const bulat = v => Number.isInteger(v);
const hingga = v => typeof v === "number" && Number.isFinite(v);
const num = v => { const x = +v; return Number.isFinite(x) && x > 0 ? x : 0; };   // angka stat: hilang/negatif/NaN = 0

/* stat opsional: bila diberi, periode acuan wajib di dalam tahun data. */
export function validasiAsumsi(a, stat) {
  const g = [];
  if (!a || typeof a !== "object") return {ok: false, galat: ["asumsi bukan objek"]};
  for (const k of Object.keys(a)) if (!(k in ASUMSI_BAWAAN)) g.push(`${k}: kunci tak dikenal`);
  for (const k of PECAHAN) if (!(hingga(a[k]) && a[k] >= 0 && a[k] <= 1)) g.push(`${k}: harus 0..1, didapat ${a[k]}`);
  if (a.buffer !== null && !(hingga(a.buffer) && a.buffer >= 0 && a.buffer <= 1)) g.push(`buffer: harus 0..1 atau null, didapat ${a.buffer}`);
  for (const k of TAK_NEGATIF) if (!(hingga(a[k]) && a[k] >= 0)) g.push(`${k}: harus angka >= 0, didapat ${a[k]}`);
  if (!(hingga(a.kurs) && a.kurs > 0)) g.push(`kurs: harus > 0, didapat ${a.kurs}`);
  if (!(hingga(a.eskalasi) && a.eskalasi >= -1 && a.eskalasi <= 1)) g.push(`eskalasi: harus -1..1, didapat ${a.eskalasi}`);
  if (!["rerata", "tren"].includes(a.metode)) g.push(`metode: rerata|tren, didapat ${a.metode}`);
  if (!["gfw", "frl"].includes(a.ef_metode)) g.push(`ef_metode: gfw|frl, didapat ${a.ef_metode}`);
  if (!(bulat(a.tahun_mulai) && a.tahun_mulai >= 2001 && a.tahun_mulai <= 2100)) g.push(`tahun_mulai: bulat 2001..2100, didapat ${a.tahun_mulai}`);
  if (!(bulat(a.durasi_th) && a.durasi_th >= 1 && a.durasi_th <= 100)) g.push(`durasi_th: bulat 1..100, didapat ${a.durasi_th}`);
  if (!(bulat(a.masa_baseline_th) && a.masa_baseline_th >= 1 && a.masa_baseline_th <= 100)) g.push(`masa_baseline_th: bulat 1..100, didapat ${a.masa_baseline_th}`);
  if (!(Array.isArray(a.pendorong_baseline) && a.pendorong_baseline.every(k => KAT.includes(k)))) g.push(`pendorong_baseline: daftar string "1".."7", didapat ${JSON.stringify(a.pendorong_baseline)}`);
  if (!(bulat(a.siklus_verifikasi) && a.siklus_verifikasi >= 1 && a.siklus_verifikasi <= 100)) g.push(`siklus_verifikasi: bulat 1..100, didapat ${a.siklus_verifikasi}`);
  if (!(bulat(a.jeda_terbit) && a.jeda_terbit >= 1 && a.jeda_terbit <= 100)) g.push(`jeda_terbit: bulat 1..100, didapat ${a.jeda_terbit}`);
  const p = a.periode_acuan;
  if (!(Array.isArray(p) && p.length === 2 && bulat(p[0]) && bulat(p[1]) && p[0] >= 2001 && p[0] <= p[1])) g.push(`periode_acuan: [awal, akhir] bulat, 2001 <= awal <= akhir, didapat ${JSON.stringify(p)}`);
  else if (stat) { const akhir = tahunAkhir(stat); if (akhir !== null && p[1] > akhir) g.push(`periode_acuan: berakhir ${p[1]} melewati data terakhir ${akhir}`); }
  return {ok: g.length === 0, galat: g};
}

export function gabungAsumsi(parsial = {}) {
  const a = {...ASUMSI_BAWAAN, ...parsial};
  a.periode_acuan = [...(a.periode_acuan ?? ASUMSI_BAWAAN.periode_acuan)];
  a.pendorong_baseline = Array.isArray(a.pendorong_baseline) ? [...a.pendorong_baseline] : a.pendorong_baseline;
  return a;
}

function siap(a, stat) {
  const g = gabungAsumsi(a), v = validasiAsumsi(g, stat);
  if (!v.ok) throw new Error("asumsi tidak sah: " + v.galat.join("; "));
  return g;
}

/* tahun data terakhir: stat.tahun_data_akhir bila ada, kalau tidak kunci hilang terbesar. null bila tak ada keduanya
   (konsesi tanpa kehilangan sama sekali: GFW tidak mengirim baris). */
function tahunAkhir(stat) {
  if (bulat(stat?.tahun_data_akhir)) return stat.tahun_data_akhir;
  const t = Object.keys(stat?.hilang ?? {}).map(Number).filter(bulat);
  return t.length ? Math.max(...t) : null;
}
const ha = (stat, t) => num(stat.hilang?.[t]?.ha);

/* hutan di AKHIR tiap tahun; tahun tanpa baris hilang = 0 ha hilang. */
export function hutanPerTahun(stat) {
  const akhir = tahunAkhir(stat) ?? 2000, o = {2000: num(stat.hutan2000_ha)};
  for (let t = 2001; t <= akhir; t++) o[t] = Math.max(0, o[t - 1] - ha(stat, t));
  return o;
}

function lajuPeriode(stat, H, p0, p1, hil_t = t => ha(stat, t)) {
  let hil = 0, awal = 0;
  for (let t = p0; t <= p1; t++) { hil += hil_t(t); awal += H[t - 1] ?? 0; }
  return {laju: awal > 0 ? Math.min(1, hil / awal) : 0, hil};
}

/* Kehilangan tutupan yang dihitung sebagai baseline: hanya pendorong terpilih (deforestasi tak terencana yang dapat dicegah).
   Kehilangan tahun t yang tak punya pendorong (hilang[t] − Σ semua pendorong, >= 0) dibagi menurut porsi pendorong tahun itu;
   tahun tanpa data pendorong memakai porsi seluruh tahun. Tanpa pendorong di mana pun: semua kehilangan + peringatan.
   Dihitung terpisah untuk ha dan co2_t (bila hanya salah satunya punya rincian pendorong, yang lain memakai semua kehilangan). */
function hilangBaseline(stat, sel) {
  const th = Object.keys(stat.hilang ?? {}).map(Number).filter(bulat), semua = () => true, dalam = k => sel.includes(k);
  const jum = (pd, f, pilih) => Object.entries(pd ?? {}).reduce((s, [k, v]) => s + (pilih(k) ? num(v?.[f]) : 0), 0);
  const o = Object.fromEntries(th.map(t => [t, {}])), ada = {};
  for (const f of ["ha", "co2_t"]) {
    let sA = 0, sS = 0;
    for (const t of th) { const pd = stat.hilang[t]?.pendorong; sA += jum(pd, f, semua); sS += jum(pd, f, dalam); }
    ada[f] = sA > 0;
    for (const t of th) {
      const pd = stat.hilang[t]?.pendorong, tot = num(stat.hilang[t]?.[f]), sem = jum(pd, f, semua), pil = jum(pd, f, dalam);
      const porsi = sem > 0 ? pil / sem : sA > 0 ? sS / sA : 1;
      o[t][f] = sA > 0 ? pil + Math.max(0, tot - sem) * porsi : tot;
    }
  }
  return {per_tahun: o, ada_pendorong: ada.ha};
}

export function baseline(stat, a) {
  a = siap(a, stat);
  const [p0, p1] = a.periode_acuan, akhirData = tahunAkhir(stat), akhir = akhirData ?? p1, peringatan = [];
  const H = hutanPerTahun({...stat, tahun_data_akhir: Math.max(akhir, p1)});
  const hb = hilangBaseline(stat, a.pendorong_baseline), hbha = t => hb.per_tahun[t]?.ha ?? 0;
  if (!hb.ada_pendorong) peringatan.push("pendorong tidak tersedia: baseline memakai semua kehilangan tutupan");
  const {laju, hil} = lajuPeriode(stat, H, p0, p1, hbha);
  let co2 = 0, xs = 0, ys = 0, total = 0, tebang_ha = 0, tebang_t = 0, cap = 0; const n = p1 - p0 + 1;
  for (let t = p0; t <= p1; t++) {
    co2 += hb.per_tahun[t]?.co2_t ?? 0; xs += t; ys += hbha(t); total += ha(stat, t); cap = Math.max(cap, hbha(t));
    tebang_ha += num(stat.hilang?.[t]?.pendorong?.["4"]?.ha); tebang_t += num(stat.hilang?.[t]?.pendorong?.["4"]?.co2_t);
  }
  // tren: hilang_ha(t) = tren_a + tren_b × t, kuadrat terkecil pada periode acuan
  const xm = xs / n, ym = ys / n; let sxy = 0, sxx = 0;
  for (let t = p0; t <= p1; t++) { sxy += (t - xm) * (hbha(t) - ym); sxx += (t - xm) ** 2; }
  const tren_b = sxx > 0 ? sxy / sxx : 0, tren_a = ym - tren_b * xm;
  const h2000 = num(stat.hutan2000_ha), stok = num(stat.stok_tC?.atas) + num(stat.stok_tC?.bawah);
  const teramati = hil >= AMBANG.hilang_min_teramati_ha;   // di bawah ambang (20 ha) faktor emisi teramati terlalu berisik: pakai faktor-stok
  const ef = teramati ? co2 / hil : (h2000 > 0 ? stok / h2000 * CO2_PER_C : 0);
  // tren dipotong ke [0, maksimum tahunan teramati (terfilter) di periode acuan]
  const hilangModel = (h, t) => Math.min(h, a.metode === "tren" ? Math.min(cap, Math.max(0, tren_a + tren_b * t)) : h * laju);
  // hutan di awal tahun_mulai: teramati bila datanya ada; tahun celah sesudah data diproyeksikan (tanpa kredit)
  let hutan_awal_ha;
  if (a.tahun_mulai - 1 <= akhir) hutan_awal_ha = H[a.tahun_mulai - 1];
  else { hutan_awal_ha = H[akhir]; for (let t = akhir + 1; t < a.tahun_mulai; t++) hutan_awal_ha -= hilangModel(hutan_awal_ha, t); }
  return {laju, ef_tCO2_per_ha: ef, hutan_awal_ha, tahun_data_akhir: akhirData, hilang_rerata_ha: hil / n, tren_a, tren_b, hilangModel,
    ef_sumber: teramati ? "teramati" : `stok (hilang baseline < ${AMBANG.hilang_min_teramati_ha} ha di periode acuan: faktor teramati tak andal)`,
    pendorong_baseline: a.pendorong_baseline, porsi_dapat_dicegah: total > 0 ? hil / total : 0,
    // indikator IFM: jejak tebang NYATA (pendorong 4). Baseline IFM "logged to protected forest" butuh rencana tebang RKU, bukan ini.
    hilang_tebang_rerata_ha: tebang_ha / n, emisi_tebang_rerata_t: tebang_t / n, peringatan};
}

/* Buffer non-permanen dari riwayat api, seluruh tahun data. Ambang kelas HIPOTESIS:
   tahun berapi = hilang_api >= 1 ha; kelas 2 bila porsi_api >= 0,3 atau >= 5 tahun berapi; kelas 1 bila porsi >= 0,1 atau >= 2 tahun.
   buffer = 12% (lantai NPRT v4.2, bersumber) + 5% × kelas (HIPOTESIS); kelas maks 2 → buffer maks efektif 22%. */
export function risikoApi(stat) {
  let api = 0, semua = 0, tahun_berapi = 0;
  for (const v of Object.values(stat.hilang_api ?? {})) { const x = num(v); api += x; if (x >= 1) tahun_berapi++; }
  for (const v of Object.values(stat.hilang ?? {})) semua += num(v?.ha);
  const porsi_api = semua > 0 ? Math.min(1, api / semua) : 0;
  const kelas = porsi_api >= 0.3 || tahun_berapi >= 5 ? 2 : porsi_api >= 0.1 || tahun_berapi >= 2 ? 1 : 0;
  return {porsi_api, tahun_berapi, kelas, buffer: AMBANG.buffer_lantai + AMBANG.buffer_per_kelas * kelas};
}

/* Faktor nasional FRL 2022. frl = isi public/karbon/faktor_frl.json (diberikan pemanggil; modul ini tanpa impor).
   Bobot tujuan = luas per pendorong WRI; pemetaan pendorong→kelas tujuan HIPOTESIS (lihat _tujuan di JSON). */
export function efFRL(stat, frl, periode = ASUMSI_BAWAAN.periode_acuan) {
  const bio = frl.biomassa_dm_ha, gef = frl.gambut_ef_tco2_ha_th;
  let w = 0, s = 0;
  for (const k of frl.kelas_hutan_alam) { const x = num(stat.tutupan2017?.[k]); w += x; s += x * num(bio[k]); }
  const stok_hutan_dm = w > 0 ? s / w : num(bio["2002"]);
  let wt = 0, st = 0, sg = 0;
  for (const [kat, v] of Object.entries(stat.pendorong ?? {})) {
    const x = num(v), kls = frl.tujuan_per_pendorong[kat] ?? frl.tujuan_per_pendorong.lain;
    wt += x; st += x * num(bio[kls]); sg += x * num(gef[kls]);
  }
  const stok_tujuan_dm = wt > 0 ? st / wt : num(bio["2007"]);
  const dekomposisi_tCO2_ha_th = wt > 0 ? sg / wt : num(gef["2007"]);
  let hg = 0, hh = 0;
  for (let t = periode[0]; t <= periode[1]; t++) { hg += num(stat.hilang?.[t]?.ha_gambut); hh += ha(stat, t); }
  return {ef_biomassa_tCO2_ha: Math.max(0, stok_hutan_dm - stok_tujuan_dm) * frl.fraksi_karbon * CO2_PER_C,
    dekomposisi_tCO2_ha_th, porsi_gambut_hilang: hh > 0 ? Math.min(1, hg / hh) : 0, stok_hutan_dm, stok_tujuan_dm};
}

const KUNCI_T = ["hilang_ha", "emisi_baseline_t", "emisi_proyek_t", "reduksi_t", "kebocoran_t", "bruto_t", "pot_ketidakpastian_t", "buffer_t", "bagian_negara_t", "kredit_t"];

/* Kredit per tahun k = 1..durasi_th, urutan potongan TETAP (§4.2). total menjumlah kolom _t dan hilang_ha (hutan_ha tidak);
   total_masa_baseline hanya baris dengan dalam_masa_baseline (k <= masa_baseline_th, VMD0055). Hutan proyeksi berkurang oleh
   kehilangan baseline (terfilter pendorong), bukan oleh kehilangan total.
   ef_metode 'frl': emisi_baseline_k = hilang_k × ef_biomassa + (Σ gambut baseline terbuka s.d. k) × dekomposisi
   (gambut terus beremisi sesudah dibuka; gambut yang dibuka sebelum proyek ada di kedua skenario, tidak dihitung). */
export function proyeksiKredit(stat, a, frl) {
  a = siap(a, stat);
  const bl = baseline(stat, a), buffer = a.buffer ?? risikoApi(stat).buffer;
  let ef = bl.ef_tCO2_per_ha, f = null;
  if (a.ef_metode === "frl") {
    if (!frl) throw new Error("ef_metode frl butuh isi faktor_frl.json");
    f = efFRL(stat, frl, a.periode_acuan); ef = f.ef_biomassa_tCO2_ha;
  }
  const baris = [], total = Object.fromEntries(KUNCI_T.map(k => [k, 0])), total_masa_baseline = {...total};
  let hutan = bl.hutan_awal_ha, gambut_kum = 0;
  for (let k = 1; k <= a.durasi_th; k++) {
    const tahun = a.tahun_mulai + k - 1, hilang_ha = bl.hilangModel(hutan, tahun);
    hutan -= hilang_ha;
    let emisi_baseline_t = hilang_ha * ef;
    if (f) { gambut_kum += hilang_ha * f.porsi_gambut_hilang; emisi_baseline_t += gambut_kum * f.dekomposisi_tCO2_ha_th; }
    const emisi_proyek_t = emisi_baseline_t * (1 - a.efektivitas), reduksi_t = emisi_baseline_t - emisi_proyek_t;
    const kebocoran_t = reduksi_t * a.kebocoran, bruto_t = reduksi_t - kebocoran_t;
    const pot_ketidakpastian_t = bruto_t * a.ketidakpastian, setelah_u = bruto_t - pot_ketidakpastian_t;
    const buffer_t = setelah_u * buffer, bagian_negara_t = (setelah_u - buffer_t) * a.bagian_negara;
    const kredit_t = setelah_u - buffer_t - bagian_negara_t;
    const r = {tahun, k, dalam_masa_baseline: k <= a.masa_baseline_th, hutan_ha: hutan, hilang_ha, emisi_baseline_t, emisi_proyek_t, reduksi_t, kebocoran_t, bruto_t, pot_ketidakpastian_t, buffer_t, bagian_negara_t, kredit_t};
    for (const kk of KUNCI_T) { r[kk] = Math.max(0, r[kk]); total[kk] += r[kk]; if (r.dalam_masa_baseline) total_masa_baseline[kk] += r[kk]; }   // pecahan 0..1 → tak negatif; jaga pembulatan
    baris.push(r);
  }
  const nm = Math.min(a.masa_baseline_th, baris.length);   // durasi >= 1 sehingga nm >= 1
  return {baris, total, total_masa_baseline, rerata_masa_kredit_t: baris.slice(0, nm).reduce((s, r) => s + r.kredit_t, 0) / nm, buffer_dipakai: buffer,
    ef_tCO2_per_ha: ef, ef_sumber: f ? "frl" : bl.ef_sumber, tahun_mulai: a.tahun_mulai, masa_baseline_th: a.masa_baseline_th, peringatan: bl.peringatan};
}

/* Bentuk umum Manual Book (WRC/REDD: baseline − proyek − kebocoran; ARR dengan tanda dibalik). Boleh negatif (net serapan ARR SMPP). */
export function netKredit({baseline_t, proyek_t, kebocoran_t = 0}) { return baseline_t - proyek_t - kebocoran_t; }

export function npv(arus, r) { return arus.reduce((s, x, i) => s + x / (1 + r) ** i, 0); }

export function irr(arus) {
  let lo = -0.99, hi = 10, flo = npv(arus, lo), fhi = npv(arus, hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  if (flo === 0) return lo; if (fhi === 0) return hi;
  for (let i = 0; i < 200 && hi - lo > 1e-12; i++) {
    const m = (lo + hi) / 2, fm = npv(arus, m);
    if (fm === 0) return m;
    if (fm * flo < 0) hi = m; else { lo = m; flo = fm; }
  }
  return (lo + hi) / 2;
}

/* Arus kas USD per tahun kalender, tahun_mulai−1 (tahun 0) s.d. terbit terakhir. Keputusan di luar RANCANGAN §4.4:
   pendapatan dalam USD (kurs hanya tampilan); opex = tetap + per t kredit yang DIHASILKAN tahun itu (bukan per ha, bukan per
   yang terbit); kredit hanya terbit di tahun verifikasi: pertama tahun_mulai+jeda_terbit−1, lalu tiap siklus_verifikasi th, plus
   tahun kredit terakhir bila masih ada yang belum terbit; terbit_t = semua kredit sejak verifikasi sebelumnya s.d. tahun itu;
   biaya verifikasi persis di tahun-tahun itu; pajak atas laba setelah SEMUA biaya tahun itu termasuk capex (tanpa penyusutan,
   tanpa rugi dibawa); total_biaya termasuk pajak sehingga Σ arus = pendapatan − biaya; payback = tahun sesudah tahun 0 saat
   kumulatif >= 0. npv_masa_baseline_usd = NPV arus s.d. tahun terakhir di dalam masa_baseline_th (sama dengan npv_usd bila
   masa >= durasi). proyeksi.tahun_mulai wajib sama dengan a.tahun_mulai. */
export function arusKas(proyeksi, a) {
  a = siap(a);
  if (proyeksi.tahun_mulai !== a.tahun_mulai) throw new Error(`tahun_mulai proyeksi ${proyeksi.tahun_mulai} != asumsi ${a.tahun_mulai}`);
  const T0 = a.tahun_mulai, akhirK = T0 + proyeksi.baris.length - 1, F = T0 + a.jeda_terbit - 1;
  const vy = []; for (let y = F; y <= akhirK; y += a.siklus_verifikasi) vy.push(y);
  if (vy.length === 0) vy.push(F); else if (vy.at(-1) < akhirK) vy.push(akhirK);
  const akhir = Math.max(akhirK, F), kredit = {}, terbit = {}, adaV = new Set(vy);
  for (const r of proyeksi.baris) kredit[r.tahun] = r.kredit_t;
  let tertunda = 0;
  for (let y = T0; y <= akhir; y++) { tertunda += kredit[y] ?? 0; if (adaV.has(y)) { terbit[y] = tertunda; tertunda = 0; } }
  const baris = []; let tp = 0, tb = 0;
  for (let tahun = T0 - 1; tahun <= akhir; tahun++) {
    const terbit_t = terbit[tahun] ?? 0, terjual_t = terbit_t * a.porsi_terjual;
    const harga_usd = a.harga_usd * (1 + a.eskalasi) ** (tahun - T0), pendapatan_usd = terjual_t * harga_usd;
    const capex_usd = tahun <= T0 ? a.capex_usd / 2 : 0;
    const opex_usd = tahun >= T0 && tahun <= akhirK ? a.opex_tetap_usd_th + a.opex_usd_per_t * (kredit[tahun] ?? 0) : 0;
    const verifikasi_usd = adaV.has(tahun) ? a.verifikasi_usd : 0;
    const pnbp_usd = a.pnbp * pendapatan_usd;
    const bagi_hasil_usd = a.bagi_hasil_pemegang * Math.max(0, pendapatan_usd - opex_usd - verifikasi_usd - pnbp_usd);
    const komunitas_usd = a.dana_komunitas * pendapatan_usd;
    const biaya = capex_usd + opex_usd + verifikasi_usd + pnbp_usd + bagi_hasil_usd + komunitas_usd;
    const pajak_usd = a.pph * Math.max(0, pendapatan_usd - biaya), arus_usd = pendapatan_usd - biaya - pajak_usd;
    tp += pendapatan_usd; tb += biaya + pajak_usd;
    baris.push({tahun, terbit_t, terjual_t, harga_usd, pendapatan_usd, capex_usd, opex_usd, verifikasi_usd, pnbp_usd, bagi_hasil_usd, komunitas_usd, pajak_usd, arus_usd});
  }
  const arus = baris.map(r => r.arus_usd), npv_usd = npv(arus, a.diskonto);
  const akhirMasa = T0 + a.masa_baseline_th - 1;
  const npv_masa_baseline_usd = akhirMasa >= akhir ? npv_usd : npv(arus.slice(0, akhirMasa - (T0 - 1) + 1), a.diskonto);
  let kum = 0, payback_tahun = null;
  for (let i = 0; i < arus.length; i++) { kum += arus[i]; if (kum >= 0 && (i > 0 || arus[0] >= 0)) { payback_tahun = i; break; } }
  return {baris, npv_usd, npv_masa_baseline_usd, irr: irr(arus), payback_tahun, total_pendapatan_usd: tp, total_biaya_usd: tb};
}

/* Harga USD/t yang membuat NPV = 0 (bisection 0..1000). 0 bila NPV sudah >= 0 pada harga 0; null bila tak tercapai di 1000. */
export function hargaImpas(stat, a, frl) {
  a = siap(a, stat);
  const p = proyeksiKredit(stat, a, frl), f = h => arusKas(p, {...a, harga_usd: h}).npv_usd;
  if (f(0) >= 0) return 0;
  if (f(BATAS_HARGA) < 0) return null;
  let lo = 0, hi = BATAS_HARGA;
  for (let i = 0; i < 100 && hi - lo > 1e-9; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
  return hi;
}

/* Skor pra-FS. layak = luas >= 10.000 ha, hutan TERSISA (akhir data) >= 50% luas, NPV (seluruh durasi) > 0. `alasan` = hanya
   sebab tidak layak. `peringatan` = catatan yang tak menggugurkan: gambut > 2% (jalur_verra false; VMD0055 v1.1 tak berlaku di
   atasnya, jalur SPE-GRK domestik masih ada), durasi melewati masa baseline, NPV dalam masa baseline negatif, pendorong tak ada.
   potensi_kredit_th = rerata kredit tahunan DI DALAM masa baseline. */
export function skorSaring(stat, a, frl) {
  a = siap(a, stat);
  const p = proyeksiKredit(stat, a, frl), k = arusKas(p, a), bl = baseline(stat, a), r = risikoApi(stat);
  const luas = num(stat.luas_ha), h2000 = num(stat.hutan2000_ha), H = hutanPerTahun(stat), sisa = H[Math.max(...Object.keys(H).map(Number))];
  const porsi_gambut = luas > 0 ? Math.min(1, num(stat.gambut_ha) / luas) : 0, jalur_verra = porsi_gambut <= AMBANG.gambut_maks;
  const alasan = [], peringatan = [...bl.peringatan];
  if (luas < AMBANG.luas_min_ha) alasan.push(`luas ${Math.round(luas)} ha < ${String(AMBANG.luas_min_ha).replace(/\B(?=(\d{3})+$)/g, ".")} ha`);
  if (!(luas > 0 && sisa / luas >= AMBANG.hutan_sisa_min)) alasan.push(`hutan tersisa < ${AMBANG.hutan_sisa_min * 100}% luas`);
  if (!(k.npv_usd > 0)) alasan.push("NPV tidak positif pada asumsi ini");
  const layak = alasan.length === 0;
  if (!jalur_verra) peringatan.push(`gambut > ${AMBANG.gambut_maks * 100}%: VM0048/VMD0055 tidak berlaku, belum ada metodologi Verra untuk gambut tropis (VM0036 ditahan)`);
  if (a.durasi_th > a.masa_baseline_th) peringatan.push(`kredit sesudah tahun ke-${a.masa_baseline_th} memerlukan baseline yang dinilai ulang (VMD0055: masa baseline <= ${a.masa_baseline_th} th)`);
  if (k.npv_usd > 0 && k.npv_masa_baseline_usd < 0) peringatan.push(`Layak hanya bila baseline diperpanjang sesudah tahun ke-${a.masa_baseline_th}`);
  return {potensi_kredit_th: p.rerata_masa_kredit_t, stok_tCO2_ha: h2000 > 0 ? (num(stat.stok_tC?.atas) + num(stat.stok_tC?.bawah)) / h2000 * CO2_PER_C : 0,
    laju: bl.laju, porsi_gambut, risiko_api: r.kelas, npv_usd: k.npv_usd, npv_masa_baseline_usd: k.npv_masa_baseline_usd, irr: k.irr, layak, jalur_verra, alasan, peringatan};
}

/* Uji balik laju proporsional: ramal hilang tahun uji dari laju periode latih, mulai dari hutan teramati akhir tahun sebelum uji. */
export function ujiBalik(stat, latih = UJI_BALIK.latih, uji = UJI_BALIK.uji) {
  const akhir = tahunAkhir(stat);
  if (akhir === null || uji[1] > akhir) throw new Error(`uji ${uji[1]} melewati data terakhir ${akhir}`);
  const H = hutanPerTahun(stat), {laju} = lajuPeriode(stat, H, latih[0], latih[1]);
  let h = H[uji[0] - 1], ramal_ha = 0, aktual_ha = 0;
  for (let t = uji[0]; t <= uji[1]; t++) { const x = h * laju; ramal_ha += x; h -= x; aktual_ha += ha(stat, t); }
  return {ramal_ha, aktual_ha, rasio: aktual_ha > 0 ? ramal_ha / aktual_ha : null};
}

/* Matriks NPV [i harga][j skala volume]; skala mengalikan kredit tiap tahun. */
export function sensitivitas(stat, a, harga, skala_volume, frl) {
  a = siap(a, stat);
  const p = proyeksiKredit(stat, a, frl);
  return harga.map(h => skala_volume.map(s => arusKas({...p, baris: p.baris.map(r => ({...r, kredit_t: r.kredit_t * s}))}, {...a, harga_usd: h}).npv_usd));
}
