/* SIPPA: fungsi hitung murni, subset P0 (DESAIN-TEKNIS §5, SP-010). ES module tanpa DOM; juga globalThis.SippaHitung di baris akhir
   (Web Worker, konsol). Kembar Python di scripts/data/sippa/ (SP-019); kasus acuan bersama tests/sippa/fixtures/acuan.json.
   Tanpa toFixed: pembulatan tampilan urusan fmt. Sisa fungsi (neracaAir, saranSarana, matriksRespons, bandingRerata, keuangan) di SP-030. */

export const KONST = {
  rho: 1000, g: 9.81, m_per_bar: 10.197, kw_per_hp: 0.7457,
  hisap_m: 3.5,                        // head hisap + filter (PRD §6.4)
  batas_kerja: 0.88,                   // 88% x PN
  derating: {a: 0.014, t0: 20, min: 0.58, max: 1},
  pn_sdr: {11: 16, 17: 10},
  layflat_id_rasio: 0.96,              // dipakai hanya bila ID datasheet kosong; pil asumsi
  id_datasheet: {min: 40, maks: 260},
  v_peringatan: 3,                     // m/s
  sisa_keras: 1, sisa_syarat: 2,       // bar
  serap_lance_lpm: 40,                 // L/min per lance (K-09, G22)
  daya_rating_rasio: 0.85,
  dalam_maks_m: 5,                     // keputusan 50, SATU-SATUNYA tempat angka batas kedalaman ditulis
  dalam_uji_m: 3,                      // >= 3 m = pil lengan uji
  bsfc: {solar: 0.25, bensin: 0.38},   // kg/kWh
  rho_bbm: {solar: 0.84, bensin: 0.74},// kg/L
  co2: {bensin: 2.31, solar: 2.68},    // kg/L
  joukowsky_a: {hdpe: 300, layflat: 150},
  ambang_zona: {air: 2.5, jalan: 5},
  liku_trase: 1.2,
  t_kritis95: [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131,
               2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042],
  r_bawaan: 0.08, h_bawaan: 5,
  profil_langkah_m: 50, n_kecil: 5, jam_ms: 3600e3
};

export const KELAS_POMPA = {
  ve1500: {nama: "Kelas 1.500 L/min @ 10 bar, bensin", titik: [[1500, 10], [2050, 6]], kw: 44, bbm: "bensin", bbm_lpj: 22,
           sumber: "pabrikan, PRD §6.1", keyakinan: "terverifikasi"},
  portabel_besar: {nama: "Kelas Tohatsu VC52AS", titik: [[1000, 8], [1300, 6]], kw: 30, bbm: "bensin", bbm_lpj: null,
           sumber: "scripts/data/taktik.py POMPA", keyakinan: "terverifikasi"},
  tekanan_tinggi: {nama: "Kelas Waterax Mark-3", titik: [[151, 17.2], [265, 10.3], [303, 6.9]], kw: 8, bbm: "bensin", bbm_lpj: null,
           sumber: "scripts/data/taktik.py POMPA", keyakinan: "terverifikasi"}
};

/* masukan kalkulator bila tidak diisi (PRD §9.4.3): layflat DN100, 300 L/min, 8 lance, kelas pompa 1.500 L/min */
export const BAWAAN = {bahan: "layflat", dn_mm: 100, od_mm: null, sdr: 11, id_datasheet_mm: null, pk_layflat_bar: 12,
  L_m: 1000, q_lpm: 300, C: 130, dz_m: 2, dz_sumber: "masukan", K: 5, sisa_bar: 3, eta: 0.65, suhu_c: 35,
  pompa: "ve1500", n_pompa: 1, jenis_bbm: null, n_lance: 8, serap_lain_lpm: 0, dalam_m: 1.5, jam: 24,
  hisap: true, perimeter_aktif: false, sumber: null};

const adaAngka = x => typeof x === "number" && Number.isFinite(x);
const batasi = (x, a, b) => Math.min(b, Math.max(a, x));
/* angka tampil: fmt id-ID bila halaman memuatnya (public/inti/format.js), selain itu padanannya (uji Node) */
const tampil = n => typeof fmt === "function" ? fmt(n) : n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});

/* ---------- hidraulika ---------- */
export function idHdpe(od, sdr) {
  if (!KONST.pn_sdr[sdr]) throw new RangeError(`SDR ${sdr} tidak dikenal; pilih ${Object.keys(KONST.pn_sdr).join(" atau ")}`);
  if (!adaAngka(od) || od <= 0) throw new RangeError("OD HDPE wajib angka positif");
  return od * (1 - 2 / sdr);
}
export function idLayflat(dn, idDatasheet) {
  const {min, maks} = KONST.id_datasheet;
  if (adaAngka(idDatasheet) && idDatasheet >= min && idDatasheet <= maks) return {id: idDatasheet, asumsi: false};
  return {id: KONST.layflat_id_rasio * dn, asumsi: true};
}
export const hfHW = (L, Q, C, D) => 10.67 * L * Q ** 1.852 / (C ** 1.852 * D ** 4.871);
export const fSuhu = T => batasi(1 - KONST.derating.a * (T - KONST.derating.t0), KONST.derating.min, KONST.derating.max);
export function batasTekanan(p) {
  if (p.bahan === "hdpe") return KONST.batas_kerja * KONST.pn_sdr[p.sdr] * fSuhu(p.suhu_c);
  return KONST.batas_kerja * p.pk_layflat_bar;
}
/* ponytail: dua sampai tiga titik datasheet, bukan kurva Q-H terukur; diganti kurva FAT sesudah G2 */
export function pRating(kelas, qLpm) {
  const t = kelas.titik;
  if (qLpm <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (qLpm <= t[i][0]) {
    const [q0, p0] = t[i - 1], [q1, p1] = t[i];
    return p0 + (p1 - p0) * (qLpm - q0) / (q1 - q0);
  }
  return null;
}
export function bbmJam(kw, kelas, jenis, nPompa) {
  if (kelas?.bbm_lpj && jenis === "bensin") return nPompa * kelas.bbm_lpj;
  return kw * KONST.bsfc[jenis] / KONST.rho_bbm[jenis];
}
export const co2 = (liter, jenis) => liter * KONST.co2[jenis];

function periksaMasukan(p) {
  if (p.bahan !== "layflat" && p.bahan !== "hdpe") throw new RangeError(`bahan ${p.bahan} tidak ditawarkan untuk kit`);
  for (const k of ["L_m", "q_lpm", "C", "eta", "n_pompa"]) if (!adaAngka(p[k]) || p[k] <= 0) throw new RangeError(`${k} wajib angka positif`);
  if (!adaAngka(p.dalam_m) || p.dalam_m < 0) throw new RangeError("kedalaman lance wajib angka 0 atau lebih");
  if (p.dalam_m > KONST.dalam_maks_m) throw new RangeError(`Injeksi lebih dari ${KONST.dalam_maks_m} m tidak termasuk SIPPA (keputusan 50)`);
  if (p.pompa != null && !KELAS_POMPA[p.pompa]) throw new RangeError(`kelas pompa ${p.pompa} tidak dikenal`);
}

export function hidraulika(masukan = {}) {
  const p = {...BAWAAN, ...masukan};
  periksaMasukan(p);
  const idr = p.bahan === "hdpe" ? {id: idHdpe(p.od_mm, p.sdr), asumsi: false} : idLayflat(p.dn_mm, p.id_datasheet_mm);
  const D = idr.id / 1000, Q = p.q_lpm / 60000, A = Math.PI * D * D / 4, v = Q / A;
  const hf = hfHW(p.L_m, Q, p.C, D), hm = p.K * v * v / (2 * KONST.g);
  const hisap = p.hisap ? KONST.hisap_m : 0;
  const tdh = p.dz_m + hf + hm + p.sisa_bar * KONST.m_per_bar + hisap;
  const pPompa = tdh / KONST.m_per_bar;
  const kw = KONST.rho * KONST.g * Q * tdh / p.eta / 1000, hp = kw / KONST.kw_per_hp, kwPer = kw / p.n_pompa;
  const kelas = p.pompa ? KELAS_POMPA[p.pompa] : null;
  const rating = kelas ? pRating(kelas, p.q_lpm) : null;
  const pTersedia = rating == null ? null : p.n_pompa * rating;
  const pUjung = pTersedia == null ? p.sisa_bar : p.sisa_bar + pTersedia - pPompa;
  const vIsi = A * p.L_m, tTiba = vIsi / Q / 60;
  const serap = p.n_lance * KONST.serap_lance_lpm + p.serap_lain_lpm;
  const jenis = p.jenis_bbm ?? kelas?.bbm ?? "solar";
  const bbmLJam = bbmJam(kw, kelas, jenis, p.n_pompa), bbmL = bbmLJam * p.jam;
  const profil = [];
  for (let x = 0; x < p.L_m; x += KONST.profil_langkah_m) profil.push(titikProfil(x));
  profil.push(titikProfil(p.L_m));
  function titikProfil(x) { return {x_m: x, p_bar: pPompa - (hf * x / p.L_m + p.dz_m * x / p.L_m + hisap) / KONST.m_per_bar}; }
  const h = {id_mm: idr.id, id_asumsi: idr.asumsi, v_ms: v, hf_m: hf, hm_m: hm, tdh_m: tdh, p_pompa_bar: pPompa, p_batas_bar: batasTekanan(p),
    f_suhu: fSuhu(p.suhu_c), p_tersedia_bar: pTersedia, p_ujung_bar: pUjung, kw, hp, kw_per_pompa: kwPer, bbm_l_jam: bbmLJam, bbm_l: bbmL,
    co2_kg: co2(bbmL, jenis), v_isi_m3: vIsi, t_tiba_menit: tTiba, serap_lpm: serap, profil,
    neraca: null /* ponytail: neracaAir dan H-AIR di SP-030 */};
  h.rating_ada = rating != null;
  h.gerbang = gerbangHidraulika(p, h);
  h.vonis = vonis(h.gerbang);
  return h;
}

/* Gerbang kalkulator (DT §5.3.2). Murni: kode, tingkat, nilai, batas (+ konteks untuk teks); teks dibentuk pesanGerbang. */
export function gerbangHidraulika(masukan, h) {
  const p = {...BAWAAN, ...masukan}, kelas = p.pompa ? KELAS_POMPA[p.pompa] : null, g = [];
  const tambah = (kode, tingkat, nilai, batas, ctx = {}) => g.push({kode, tingkat, nilai, batas, ...ctx});
  if (h.p_pompa_bar > h.p_batas_bar) tambah("H-TEKANAN", "keras", h.p_pompa_bar, h.p_batas_bar, {bahan: p.bahan, sdr: p.sdr, suhu_c: p.suhu_c, f_suhu: h.f_suhu});
  if (h.p_ujung_bar < KONST.sisa_keras) tambah("H-SISA", "keras", h.p_ujung_bar, KONST.sisa_keras);
  else if (h.p_ujung_bar < KONST.sisa_syarat) tambah("H-SISA2", "syarat", h.p_ujung_bar, KONST.sisa_syarat);
  if (p.q_lpm > h.serap_lpm) tambah("H-SERAP", "keras", p.q_lpm, h.serap_lpm, {n_lance: p.n_lance});
  if (kelas && !h.rating_ada) tambah("H-RATING", "keras", p.q_lpm, kelas.titik[kelas.titik.length - 1][0]);
  if (kelas && h.kw_per_pompa > kelas.kw * KONST.daya_rating_rasio) tambah("H-DAYA", "keras", h.kw_per_pompa, kelas.kw, {rasio: KONST.daya_rating_rasio});
  if (h.v_ms > KONST.v_peringatan) tambah("H-KECEPATAN", "syarat", h.v_ms, KONST.v_peringatan);
  if (p.bahan === "hdpe" && p.perimeter_aktif) tambah("H-PANAS", "keras", null, null);
  if (p.dz_sumber === "dsm") tambah("H-DSM", "catatan", null, null);
  if (p.dalam_m >= KONST.dalam_uji_m) tambah("H-UJI", "catatan", p.dalam_m, KONST.dalam_uji_m);
  const urut = {keras: 0, syarat: 1, catatan: 2};
  return g.sort((a, b) => urut[a.tingkat] - urut[b.tingkat]);
}

export function pesanGerbang(g) {
  const f = tampil;
  switch (g.kode) {
    case "H-TEKANAN": return g.bahan === "hdpe"
      ? `Tekanan ${f(g.nilai)} bar melewati batas kerja ${f(g.batas)} bar (${f(KONST.batas_kerja * 100)}% x PN${KONST.pn_sdr[g.sdr]} x ${f(Math.round(g.f_suhu * 100) / 100)} pada ${f(g.suhu_c)} °C)`
      : `Tekanan ${f(g.nilai)} bar melewati batas kerja ${f(g.batas)} bar (${f(KONST.batas_kerja * 100)}% x tekanan kerja datasheet)`;
    case "H-SISA": return "Tekanan di manifold kurang dari 1 bar; lance tidak bekerja";
    case "H-SISA2": return "Tekanan ujung di bawah 2 bar; lance 15–40 L/min butuh 2–4 bar";
    case "H-SERAP": return `Debit ${f(g.nilai)} L/min tidak terserap ${f(g.n_lance)} lance (paling banyak ${f(g.batas)} L/min)`;
    case "H-RATING": return `Debit ${f(g.nilai)} L/min di luar rating pompa terpilih (paling banyak ${f(g.batas)} L/min)`;
    case "H-DAYA": return `Daya poros ${f(g.nilai)} kW per pompa melewati ${f(g.rasio * 100)}% rating ${f(g.batas)} kW`;
    case "H-KECEPATAN": return `Kecepatan ${f(g.nilai)} m/s; risiko lonjakan saat katup ditutup`;
    case "H-PANAS": return "HDPE tidak boleh berada di perimeter api aktif (K-16)";
    case "H-DSM": return "Beda elevasi dari DSM berkanopi (Copernicus GLO-30); ukur ulang dengan DEMNAS atau GNSS";
    case "H-UJI": return `Kedalaman ${f(KONST.dalam_uji_m)}–${f(KONST.dalam_maks_m)} m hanya untuk lengan uji kedua`;
    default: return g.kode;
  }
}

export function vonis(gerbang) {
  if (gerbang.some(g => g.tingkat === "keras")) return "NO-GO";
  return gerbang.some(g => g.tingkat === "syarat") ? "HOLD" : "KONDISIONAL";   // tidak ada GO
}

/* ---------- zona dan statistik ---------- */
/* pembanding ketat `<` (keputusan 51): tepat 2,50 atau 5,00 km = jauh; null = jauh */
export function zona(air, jalan, ambang = KONST.ambang_zona) {
  const a = air == null ? Infinity : air, j = jalan == null ? Infinity : jalan;
  return a < ambang.air ? (j < ambang.jalan ? "A" : "B") : (j < ambang.jalan ? "C" : "D");
}
/* tipe 7 (sama dengan numpy.percentile bawaan); n = 0 -> null */
export function kuantil(xs, p) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), h = (s.length - 1) * p, i = Math.floor(h);
  return i + 1 < s.length ? s[i] + (h - i) * (s[i + 1] - s[i]) : s[i];
}
export const nKecil = n => n < KONST.n_kecil;

/* durasi dalam JAM; tiap ukuran null bila salah satu ujung null */
export function durasiLog(l) {
  const jam = (a, b) => l[a] == null || l[b] == null ? null : (l[b] - l[a]) / KONST.jam_ms;
  const gelar = jam("t_mulai_gelar", "t_air_mengalir");
  return {tiba_air: jam("t_tiba", "t_air_mengalir"), gelar, bongkar: jam("t_selesai", "t_bongkar_selesai"),
    laju_m_jam: gelar > 0 && l.panjang_m != null ? l.panjang_m / gelar : null,
    orang_jam_100m: gelar != null && l.n_orang != null && l.panjang_m > 0 ? l.n_orang * gelar / (l.panjang_m / 100) : null};
}

/* ---------- vonis pilot "dapat dipakai" (keputusan 53, DT §5.5.2) ---------- */
const TAHAP_PROBE = ["sebelum", "sesudah", "24j"], DALAM_PROBE = [10, 30, 50, 100];
export function vonisPilot(d) {
  const log = d.log || [], probe = d.probe || [], komp = d.komponen_kembali || [];
  const b = (no, lulus, nilai, alasan) => ({no, lulus, nilai, alasan});
  const butir = [];
  // 1: sesi berair sampai lance, minimal dua, di minimal dua petak
  const air = log.filter(l => l.air_sampai_lance === 1), petak = new Set(air.map(l => l.petak_id).filter(x => x != null));
  butir.push(b(1, log.length ? air.length >= 2 && petak.size >= 2 : null, {sesi: air.length, petak: petak.size}, "sesi dengan air sampai lance, paling sedikit 2 sesi di 2 petak"));
  // 2: tiba sampai air terbaik <= 4 jam dan lima waktu lengkap tiap sesi
  const lima = ["t_tiba", "t_mulai_gelar", "t_air_mengalir", "t_selesai", "t_bongkar_selesai"];
  const tAir = log.map(l => durasiLog(l).tiba_air).filter(x => x != null);
  butir.push(b(2, log.length ? tAir.length > 0 && Math.min(...tAir) <= 4 && log.every(l => lima.every(k => l[k] != null)) : null,
    tAir.length ? Math.min(...tAir) : null, "tiba sampai air mengalir terbaik paling lama 4 jam, lima waktu lengkap di tiap sesi"));
  // 3: tekanan ujung >= 2 bar selama >= 30 menit
  const tekan = log.filter(l => l.p_ujung_bar >= KONST.sisa_syarat && l.p_ujung_menit >= 30);
  butir.push(b(3, log.length ? tekan.length > 0 : null, tekan[0] ? {bar: tekan[0].p_ujung_bar, menit: tekan[0].p_ujung_menit, sumber: tekan[0].p_ujung_sumber} : null, "tekanan ujung 2 bar atau lebih selama 30 menit atau lebih"));
  // 4: gerbang hidraulika tanpa tingkat keras untuk konfigurasi tiap sesi (tanpa konfigurasi = null)
  let gagal4 = false, tanpa = !log.length;
  for (const l of log) {
    if (!l.konfigurasi) { tanpa = true; continue; }
    if (hidraulika(l.konfigurasi).gerbang.some(g => g.tingkat === "keras")) gagal4 = true;
  }
  butir.push(b(4, gagal4 ? false : tanpa ? null : true, null, "konfigurasi tiap sesi lolos gerbang hidraulika tanpa hambatan keras"));
  // 5: kelengkapan probe >= 90%
  const titik = new Set(probe.map(r => `${r.petak_id}|${r.titik}`)), ada = new Set(probe.map(r => `${r.petak_id}|${r.titik}|${r.tahap}|${r.kedalaman_cm}`));
  const harap = titik.size * TAHAP_PROBE.length * DALAM_PROBE.length;
  let kena = 0; for (const t of titik) for (const th of TAHAP_PROBE) for (const k of DALAM_PROBE) if (ada.has(`${t}|${th}|${k}`)) kena++;
  const lengkap = harap ? kena / harap : null;
  butir.push(b(5, lengkap == null ? null : lengkap >= 0.9, lengkap, "kelengkapan probe 90% atau lebih dari tahap sebelum, sesudah, 24 jam di empat kedalaman"));
  // 6: tanpa kecelakaan, tanpa henti bocor lebih dari 30 menit
  const celaka = log.reduce((a, l) => a + (l.kecelakaan || 0), 0), henti = log.some(l => l.bocor_henti_menit > 30);
  butir.push(b(6, log.length ? celaka === 0 && !henti : null, {kecelakaan: celaka, henti_lebih_30: henti}, "tanpa kecelakaan dan tanpa henti karena bocor lebih dari 30 menit"));
  // 7: komponen kembali berfungsi >= 95%
  const baik = komp.filter(c => c.kondisi === "baik" || c.kondisi === "rusak_ringan").length, rasio = komp.length ? baik / komp.length : null;
  butir.push(b(7, rasio == null ? null : rasio >= 0.95, rasio, "komponen kembali berfungsi 95% atau lebih"));
  const gagal = butir.filter(x => x.lulus !== true).map(x => x.no);
  const vonisAkhir = !gagal.length ? "DAPAT DIPAKAI" : gagal.includes(1) || gagal.includes(6) ? "BELUM DAPAT DIPAKAI" : "DAPAT DIPAKAI BERSYARAT";
  return {butir, gagal, vonis: vonisAkhir};
}

globalThis.SippaHitung = {KONST, KELAS_POMPA, idHdpe, idLayflat, hfHW, fSuhu, batasTekanan, pRating, hidraulika, gerbangHidraulika, pesanGerbang, vonis,
  bbmJam, co2, zona, kuantil, nKecil, durasiLog, vonisPilot};
