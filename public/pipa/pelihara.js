/* SIPPA: fungsi pemeliharaan murni (DESAIN-TEKNIS §5.10, PRD §6.10, keputusan 56, SP-092). ES module tanpa DOM; juga globalThis.SippaPelihara
   di baris akhir (konsol, Web Worker); diimpor worker untuk validasi seperti formulir.js. SATU-SATUNYA tempat konstanta interval, laju,
   stok, dan kelas K1-K10: buku membaca data/kajian-bnpb/data/sippa/pelihara.csv hasil `node public/pipa/pelihara.js --csv`.
   Semua angka berlabel asumsi-kebijakan sampai diganti lembar data pabrikan, pedoman pemilik aset, atau data musim 2027. Tanpa toFixed. */

const HARI = 864e5, SEGERA_HARI = 14;
/* angka tampil: fmt id-ID bila halaman memuatnya (public/inti/format.js), selain itu padanannya (uji Node) */
const tampil = n => typeof fmt === "function" ? fmt(n) : n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const angka = x => typeof x === "number" && Number.isFinite(x);

/* interval.hari / interval.jam: {jenis: n}; jatuh tempo memakai yang terkecil (atau jenis yang disebut butir). tiap_pakai: periksa pra dan pasca gelar (tak terjadwal). */
export const KELAS = {
  K1: {nama: "Pompa api, pompa banjir, booster", interval: {tiap_pakai: true, hari: {berkala: 30, servis: 180, tahunan: 365}, jam: {servis: 50, overhaul: 500}}, laju_biaya: 0.08,
    pemelihara_t1: "operator Manggala Agni atau BPBD saat gelar; YonTP di gudang", pemelihara_t2: "penyedia servis kontrak BNPB; FAT kurva Q-H"},
  K2: {nama: "Selang layflat, serang, dan hisap", interval: {tiap_pakai: true, hari: {uji_tekanan: 365}, jam: {}}, laju_biaya: 0.06,
    pemelihara_t1: "operator (bilas, kering, gulung)", pemelihara_t2: "YonTP atau penyedia (uji tekanan 1,5 kali)"},
  K3: {nama: "Manifold, kopling, katup, filter, lance", interval: {tiap_pakai: true, hari: {pra_musim: 180, tahunan: 365}, jam: {}}, laju_biaya: 0.05,
    pemelihara_t1: "operator", pemelihara_t2: "YonTP atau penyedia (uji relief, uji debit lance)"},
  K4: {nama: "Sensor dan telemetri", interval: {tiap_pakai: true, hari: {pra_musim: 180, tahunan: 365}, jam: {}}, laju_biaya: 0.08,
    pemelihara_t1: "operator (baterai, bersih)", pemelihara_t2: "penyedia kalibrasi"},
  K5: {nama: "APD, gas monitor, kontainer depot, tangki BBM, baut", interval: {tiap_pakai: false, hari: {berkala: 180, tahunan: 365}, jam: {}}, laju_biaya: 0.10,
    pemelihara_t1: "YonTP", pemelihara_t2: "penyedia kalibrasi gas monitor"},
  K6: {nama: "Pipa HDPE koridor dan rumah pompa panggung", interval: {tiap_pakai: false, hari: {berkala: 30, tahunan: 365}, jam: {}}, laju_biaya: 0.02,
    pemelihara_t1: "BPBD atau Daops setempat", pemelihara_t2: "penyedia (uji kebocoran)"},
  K7: {nama: "Sumur bor dan pompa sumur", interval: {tiap_pakai: false, hari: {berkala: 180, mutu_air: 180}, jam: {servis: 250}}, laju_biaya: 0.03,
    pemelihara_t1: "pengelola setempat", pemelihara_t2: "Badan Geologi (muka air); dinas kesehatan atau laboratorium (mutu air)"},
  K8: {nama: "Perpipaan sementara, tandon, hidran umum", interval: {tiap_pakai: true, hari: {berkala: 7}, jam: {}}, laju_biaya: 0,
    pemelihara_t1: "PDAM atau BPBD", pemelihara_t2: "Cipta Karya"},
  K9: {nama: "Jembatan darurat", interval: {tiap_pakai: true, hari: {berkala: 30, tahunan: 365}, jam: {}}, laju_biaya: 0.02,
    pemelihara_t1: "penerima (pemda atau BPBD)", pemelihara_t2: "Kementerian PU (Bina Marga) atau TNI (Zeni)"},
  K10: {nama: "Jembatan permanen dan gantung yang dipantau", interval: {tiap_pakai: false, hari: {tahunan: 365}, jam: {}}, laju_biaya: 0,
    pemelihara_t1: "pemilik aset", pemelihara_t2: "pemilik aset; BNPB hanya mencatat kondisi"},
};
/* awalan kode BOM -> kelas. PB dan F melengkapi DT §5.10 supaya templat banjir (PRD §6.3) berkelas; uji P1 menolak awalan tanpa kelas. */
export const KELAS_BOM = {P: "K1", PB: "K1", E: "K1", H: "K2", ST: "K2", M: "K3", C: "K3", V: "K3", SF: "K3", I: "K3", G: "K3", F: "K3",
  FT: "K4", PT: "K4", LT: "K4", T: "K4", GWT: "K4", U: "K4", Q: "K5", S: "K5", B: "K5"};
export const KELAS_ASET = {sumur_bor: "K7", pompa_sumur: "K7", pipa_sementara: "K8", tandon_hidran: "K8", pipa_koridor: "K6", jembatan_darurat: "K9", jembatan_permanen: "K10"};
export const KRITIS = ["K1", "K2", "K3"];
/* laju pakai suku cadang per musim per satuan dilayani (PRD §6.10.5), kunci = awalan kode (unit dilayani atau suku cadang):
   C gasket kopling Storz 1 set per 10 kopling; SF elemen filter servis 2 per pompa; P oli, filter oli, busi 2 servis per pompa;
   IMP impeller 1 per 4 pompa (kunci tersendiri, bukan P); I lance 1 per 4 lance; H layflat cadangan 10% panjang, satuan H = per meter (panjang satuan);
   T baterai sensor 1 set per node; Q respirator P100 2 per orang. Baris baut/pelat bailey menunggu data DSP, belum ada kunci. */
export const STOK_LAJU = {C: 0.1, SF: 2, P: 2, IMP: 0.25, I: 0.25, H: 0.1, T: 1, Q: 2};
const KONDISI = ["baik", "rusak_ringan", "rusak_berat", "hilang"];

const awalanDari = kode => typeof kode === "string" ? /^([A-Z]{1,4})-/.exec(kode)?.[1] : undefined;
export function kelasDari(kodeBom) { const a = awalanDari(kodeBom); return a && Object.hasOwn(KELAS_BOM, a) ? KELAS_BOM[a] : null; }

export function skorKeKondisi(s) {
  if (!Number.isInteger(s) || s < 0 || s > 3) throw new RangeError("skor kondisi harus bilangan bulat 0 sampai 3");
  return KONDISI[s];
}

const kelasButir = b => { const k = b?.kelas ?? kelasDari(b?.kode_bom); if (!Object.hasOwn(KELAS, k)) throw new RangeError(`kelas butir tidak dikenal: ${k}`); return k; };

/* jatuh tempo = min(inspeksi terakhir + interval hari, saat jam >= batas jam); aman > 14 hari, segera <= 14, terlambat (tepat jatuh tempo = terlambat) */
export function jadwal(butir, terakhir, jamSejakServis, kini) {
  const k = kelasButir(butir);
  if (!angka(kini)) throw new RangeError("kini harus angka (ms epoch)");
  if (jamSejakServis != null && (!angka(jamSejakServis) || jamSejakServis < 0)) throw new RangeError("jam sejak servis harus angka 0 atau lebih");
  const {hari, jam} = KELAS[k].interval, j = butir.jenis;
  if (j && !angka(hari[j]) && !angka(jam[j])) throw new RangeError(`jenis ${j} tidak ada di kelas ${k}`);
  /* jenis disebut: batas hari dan jam hanya milik jenis itu (overhaul hanya di jam); tanpa jenis: terkecil dari semuanya */
  const hh = (j ? [hari[j]] : Object.values(hari)).filter(angka), jj = (j ? [jam[j]] : Object.values(jam)).filter(angka);
  const hariBatas = hh.length ? Math.min(...hh) : null, jamBatas = jj.length ? Math.min(...jj) : null;
  const lewatJam = jamBatas != null && jamSejakServis != null && jamSejakServis >= jamBatas;
  const alasanJam = `${tampil(jamSejakServis)} jam sejak servis, batas ${tampil(jamBatas)} jam`;
  if (terakhir == null) {
    /* tanpa catatan inspeksi tetapi jam sudah lewat batas: konservatif terlambat (pompa 900 jam tanpa catatan paling berisiko) */
    if (lewatJam) return {kelas: k, jatuh_tempo: kini, status: "terlambat", alasan: `${alasanJam}; belum ada inspeksi tercatat`};
    return {kelas: k, jatuh_tempo: null, status: "belum_pernah", alasan: "belum ada inspeksi tercatat"};
  }
  if (!angka(terakhir)) throw new RangeError("inspeksi terakhir harus angka (ms epoch)");
  let tempo = hariBatas == null ? Infinity : terakhir + hariBatas * HARI, alasan = hariBatas == null ? "" : `interval ${tampil(hariBatas)} hari sejak inspeksi terakhir`;
  if (lewatJam) { tempo = Math.min(tempo, kini); alasan = alasanJam; }
  if (tempo === Infinity) return {kelas: k, jatuh_tempo: null, status: "aman", alasan: "tanpa interval hari"};
  const sisa = tempo - kini;
  return {kelas: k, jatuh_tempo: tempo, status: sisa <= 0 ? "terlambat" : sisa <= SEGERA_HARI * HARI ? "segera" : "aman", alasan};
}

/* tidak laik gelar: komponen kelas kritis rusak berat atau hilang, atau butir K1 terlambat. Hanya peringatan (T-P), bukan blokir. */
export function laikGelar(komponen, jadwalButir) {
  const alasan = [];
  for (const c of komponen || []) {
    const k = c.kelas ?? kelasDari(c.kode_bom);
    if (KRITIS.includes(k) && (c.kondisi === "rusak_berat" || c.kondisi === "hilang")) alasan.push(`komponen ${c.kode_bom ?? k} ${c.kondisi === "hilang" ? "hilang" : "rusak berat"} (kelas ${k})`);
  }
  for (const j of jadwalButir || []) if (j.kelas === "K1" && j.status === "terlambat") alasan.push("pemeliharaan pompa (K1) terlambat");
  return {laik: alasan.length === 0, alasan};
}

/* stok_min = ceil(laju x n x (1 + tunggu/180)); pembulatan 9 desimal supaya galat float (0,1 x 30) tidak menaikkan satu butir */
export function stokMin(kode, nSatuan, waktuTungguHari = 60) {
  const a = awalanDari(kode);
  if (!a || !Object.hasOwn(STOK_LAJU, a)) throw new RangeError(`laju pakai tidak ada untuk kode ${kode}`);
  if (!angka(nSatuan) || nSatuan < 0) throw new RangeError("jumlah satuan harus angka 0 atau lebih");
  if (!angka(waktuTungguHari) || waktuTungguHari < 0) throw new RangeError("waktu tunggu harus angka 0 atau lebih");
  return Math.ceil(Math.round(STOK_LAJU[a] * nSatuan * (1 + waktuTungguHari / 180) * 1e9) / 1e9);
}

/* B_tahun = sum_kelas(NG x r) + jam_pompa x c_jam + n_lab x c_lab (PRD §6.10.7). item [{kode_bom|kelas, jumlah}], harga {kode: rupiah per satuan}. */
export function biayaTahun(item, harga, param = {}) {
  const per = {}, tanpa = [];
  let nilai = 0, total = 0;
  for (const it of item || []) {
    const k = it.kelas ?? kelasDari(it.kode_bom);
    if (!Object.hasOwn(KELAS, k)) throw new RangeError(`kelas tidak dikenal untuk ${it.kode_bom ?? it.kelas}`);
    if (!angka(it.jumlah) || it.jumlah < 0) throw new RangeError(`jumlah ${it.kode_bom ?? it.kelas} harus angka 0 atau lebih`);
    const h = harga?.[it.kode_bom];
    if (!angka(h)) { tanpa.push(it.kode_bom); continue; }
    const r = param.laju?.[k] ?? KELAS[k].laju_biaya;
    if (!angka(r) || r < 0 || r > 1) throw new RangeError(`laju ${k} harus angka 0 sampai 1`);
    const ng = it.jumlah * h, p = per[k] ??= {nilai: 0, laju: r, biaya: 0};
    p.nilai += ng; p.biaya += ng * r; nilai += ng; total += ng * r;
  }
  const {jam_pompa = 0, c_jam = 0, n_lab = 0, c_lab = 0} = param;
  for (const [n, v] of Object.entries({jam_pompa, c_jam, n_lab, c_lab})) if (!angka(v) || v < 0) throw new RangeError(`${n} harus angka 0 atau lebih`);
  const pompa = jam_pompa * c_jam, lab = n_lab * c_lab;
  return {per_kelas: per, nilai, biaya_kelas: total, pompa, lab, total: total + pompa + lab, rata_tertimbang: nilai ? total / nilai : null, tanpa_harga: tanpa, keyakinan: "estimasi-model"};
}

/* ---------- aset bukan kit: medan per kelas (DT §3.1.8, PRD §6.10), rentang, dan aturan Q10 ---------- */
const ZONA = ["belum", "aman", "rawan", "kritis", "rusak"], JENIS_DARURAT = ["bailey", "rangka_baja", "lain"];
const ANGKA = (min, maks) => v => angka(v) && v >= min && v <= (maks ?? Infinity) ? null : maks == null ? `harus angka ${tampil(min)} atau lebih` : `harus angka ${tampil(min)} sampai ${tampil(maks)}`;
const TEKS = v => typeof v === "string" && v.trim().length > 0 && v.length <= 120 ? null : "harus teks 1 sampai 120 karakter";
const ENUM = daftar => v => daftar.includes(v) ? null : `harus salah satu dari ${daftar.join(", ")}`;
const BAKU = {
  sumur_bor: {medan: {kedalaman_m: ANGKA(0, 500), debit_lps: ANGKA(0, 200), cat_kode: TEKS, zona_konservasi: ENUM(ZONA), rekomendasi_bg: TEKS, pengelola: TEKS, serah_terima: TEKS}, wajib: []},
  pompa_sumur: {medan: {kw: ANGKA(0, 1000), sumber_daya: TEKS}, wajib: ["kw"]},
  pipa_sementara: {medan: {dn_mm: ANGKA(1, 2000), panjang_m: ANGKA(0, 100000), bahan: TEKS}, wajib: ["dn_mm", "panjang_m"]},
  tandon_hidran: {medan: {kapasitas_l: ANGKA(0, 1e7)}, wajib: ["kapasitas_l"]},
  pipa_koridor: {medan: {od_mm: ANGKA(1, 2000), sdr: ANGKA(1, 100), panjang_m: ANGKA(0, 100000)}, wajib: ["od_mm", "sdr", "panjang_m"]},
  jembatan_darurat: {medan: {jenis: ENUM(JENIS_DARURAT), bentang_m: ANGKA(0, 300), beban_ton: ANGKA(0, 1000), program: TEKS}, wajib: ["jenis", "bentang_m"]},
  jembatan_permanen: {medan: {jenis: TEKS, bentang_m: ANGKA(0, 300), program: TEKS, nilai_kondisi_pemilik: ANGKA(0, 5)}, wajib: ["jenis", "bentang_m"]},
};
export function cekAset(kelas, atribut) {
  if (!Object.hasOwn(BAKU, kelas)) return [{medan: "kelas", pesan: `kelas aset tidak dikenal: ${kelas}`}];
  if (!atribut || typeof atribut !== "object" || Array.isArray(atribut)) return [{medan: "atribut", pesan: "atribut harus objek"}];
  const {medan, wajib} = BAKU[kelas], g = [];
  for (const k of Object.keys(atribut)) if (!Object.hasOwn(medan, k)) g.push({medan: k, pesan: `medan tidak dikenal untuk ${kelas}`});
  for (const k of wajib) if (atribut[k] == null) g.push({medan: k, pesan: "wajib diisi"});
  for (const [k, cek] of Object.entries(medan)) if (atribut[k] != null) { const p = cek(atribut[k]); if (p) g.push({medan: k, pesan: p}); }
  if (kelas === "sumur_bor" && (atribut.zona_konservasi === "kritis" || atribut.zona_konservasi === "rusak")
    && (typeof atribut.rekomendasi_bg !== "string" || !atribut.rekomendasi_bg.trim()) && !g.some(x => x.medan === "rekomendasi_bg"))
    g.push({medan: "rekomendasi_bg", pesan: "sumur di zona kritis atau rusak wajib rekomendasi teknis Badan Geologi"});
  return g;
}

/* ---------- CSV konstanta untuk buku: node public/pipa/pelihara.js --csv ---------- */
const sel = s => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
const peta = o => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(";");
export function keCsv() {
  const kepala = "kelas,nama,tiap_pakai,interval_hari,batas_jam,laju_biaya,kritis,awalan_bom,pemelihara_t1,pemelihara_t2";
  const baris = Object.entries(KELAS).map(([k, v]) => [k, v.nama, v.interval.tiap_pakai ? "ya" : "tidak", peta(v.interval.hari), peta(v.interval.jam), String(v.laju_biaya),
    KRITIS.includes(k) ? "ya" : "tidak", Object.entries(KELAS_BOM).filter(([, kk]) => kk === k).map(([a]) => a).join(" "), v.pemelihara_t1, v.pemelihara_t2].map(sel).join(","));
  return [kepala, ...baris].join("\n") + "\n";
}

globalThis.SippaPelihara = {KELAS, KELAS_BOM, KELAS_ASET, KRITIS, STOK_LAJU, kelasDari, skorKeKondisi, jadwal, laikGelar, stokMin, biayaTahun, cekAset, keCsv};

/* CLI Node saja; dibungkus fungsi async supaya modul tetap aman diimpor worker dan peramban */
if (globalThis.process?.argv?.[1]?.endsWith("pelihara.js") && process.argv.includes("--csv")) {
  (async () => {
    const {writeFileSync, mkdirSync} = await import("node:fs"), {fileURLToPath} = await import("node:url"), {join} = await import("node:path");
    const dir = join(fileURLToPath(import.meta.url), "../../../data/kajian-bnpb/data/sippa");
    mkdirSync(dir, {recursive: true});
    writeFileSync(join(dir, "pelihara.csv"), keCsv());
  })();
}
