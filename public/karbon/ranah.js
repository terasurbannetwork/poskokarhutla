/* Bagian layar karbon yang dipakai lebih dari satu tab: label, statistik satelit, grafik tahunan, dua penaksir,
   tabel kredit, ringkas keuangan, dan formulir asumsi. Semua angka dibaca dari keluaran akuntansi.js. */
import * as AK from "./akuntansi.js";
import {S, h, s, ang, pct, json, kpi, tabel, pil, tunda, T, T_HA, uangKpi} from "./alat.js";

export const TAHAP = [["identifikasi", "Identifikasi"], ["loi", "LoI"], ["kesepakatan", "Kesepakatan"], ["studi", "Studi kelayakan"], ["pdd", "PDD"], ["validasi", "Validasi"],
  ["registrasi", "Registrasi"], ["pemantauan", "Pemantauan"], ["verifikasi", "Verifikasi"], ["terbit", "Terbit"], ["hentikan", "Dihentikan"]];
export const TAHAP_KS = [["prospek", "Prospek"], ["nda", "NDA"], ["term_sheet", "Term sheet"], ["loi", "LoI"], ["kontrak", "Kontrak"], ["selesai", "Selesai"], ["batal", "Batal"]];
export const ARAH = [["pasok", "Pasok"], ["jual", "Jual"], ["modal", "Modal"], ["jasa", "Jasa"]];
export const JENIS_PIHAK = [["pemegang_konsesi", "Pemegang konsesi"], ["pembeli", "Pembeli"], ["investor", "Investor"], ["vvb", "Lembaga verifikasi"], ["mitra", "Mitra"], ["pemerintah", "Pemerintah"], ["komunitas", "Komunitas"]];
export const STATUS_PER = [["baru", "Baru"], ["dicek", "Dicek"], ["valid", "Valid"], ["palsu", "Palsu"], ["selesai", "Selesai"]];
export const SUMBER_PER = [["gfw_terpadu", "GFW terpadu"], ["firms", "FIRMS"]];
export const JENIS_BUKU = [["terbit", "Terbit"], ["cadang", "Cadang"], ["lepas_cadang", "Lepas cadang"], ["alih", "Alih"], ["pensiun", "Pensiun"], ["batal", "Batal"]];
export const JENIS_KONSESI = [["hph", "HPH"], ["hti", "HTI"], ["re", "Restorasi ekosistem"], ["sawit", "Sawit"], ["tambang", "Tambang"], ["ps", "Perhutanan sosial"], ["lain", "Lainnya"]];
export const label = (L, v) => L.find(x => x[0] === v)?.[1] ?? v ?? "–";
export const prov = k => window.Wilayah?.prov(k) ?? k ?? "–";

const KLHK = {"2001": "Hutan lahan kering primer", "2002": "Hutan lahan kering sekunder", "2004": "Hutan mangrove primer", "20041": "Hutan mangrove sekunder", "2005": "Hutan rawa primer",
  "20051": "Hutan rawa sekunder", "2006": "Hutan tanaman", "2007": "Semak belukar", "20071": "Semak belukar rawa", "2010": "Perkebunan", "2012": "Permukiman", "20121": "Bandara/pelabuhan",
  "20122": "Transmigrasi", "2014": "Tanah terbuka", "20141": "Pertambangan", "3000": "Savana", "20091": "Pertanian lahan kering", "20092": "Pertanian lahan kering campur semak",
  "20093": "Sawah", "20094": "Tambak", "5001": "Tubuh air", "50011": "Rawa"};
const KAWASAN = {"Protected Forest": "Hutan lindung", "Production Forest": "Hutan produksi", "Limited Production Forest": "Hutan produksi terbatas", "Convertible Production Forest": "Hutan produksi konversi",
  "Sanctuary Reserves/Nature Conservation Area": "Kawasan suaka/pelestarian alam", "Other Utilization Area": "Areal penggunaan lain"};
const PENDORONG = {"1": "Pertanian menetap", "2": "Tambang", "3": "Ladang berpindah", "4": "Penebangan", "5": "Kebakaran", "6": "Permukiman dan infrastruktur", "7": "Gangguan alam lain"};
const KELAS_API = ["Rendah", "Sedang", "Tinggi"];
export const kelasApi = k => KELAS_API[k] ?? "–";

/* stat §3.2 dari baris saring (datar) atau proyek (kolom stat JSON) */
export const statDari = r => r?.stat !== undefined ? json(r.stat) : r;
const coba = f => { try { return f(); } catch (e) { return {galat: e.message}; } };
/* rerata kredit tahunan di dalam masa baseline */
export const potensi = p => p.rerata_masa_kredit_t;
export const proyeksi = (st, a) => coba(() => AK.proyeksiKredit(st, a, S.frl));
export const kas = (p, a) => coba(() => AK.arusKas(p, a));
export const impas = (st, a) => coba(() => AK.hargaImpas(st, a, S.frl));

/* Kaki sumber untuk angka satelit: tahun data dan tanggal ambil dibaca dari stat (satu atau banyak), tidak diketik. */
export function infoGfw(daftar) {
  let akhir = 0, diambil = "", versi = {};
  for (const x of daftar) { const st = statDari(x); if (!st) continue; if (st.tahun_data_akhir > akhir) akhir = st.tahun_data_akhir; if (st.diambil && String(st.diambil) > diambil) diambil = String(st.diambil); if (st.versi) versi = st.versi; }
  return {akhir: akhir || "–", diambil: diambil || "–", versi};
}
export function sumberGfw(daftar) {
  const i = infoGfw(daftar);
  return `Sumber: GFW (Hansen/UMD, Harris dkk.), data 2001–${i.akhir}, diambil ${i.diambil}. Estimasi satelit.`;
}
/* tahun data terakhir: dari stat bila ada, kalau tidak dari data penyaringan, kalau tidak dari periode acuan */
export const tahunData = (st, a) => st?.tahun_data_akhir ?? S.saring?.baris?.[0]?.tahun_data_akhir ?? a?.periode_acuan?.[1] ?? AK.ASUMSI_BAWAAN.periode_acuan[1];

/* ---------- grafik batang tahunan (SVG tanpa pustaka) ---------- */
export function grafikTahun(nilai, {periode, satuan, judul: jd, akhir = 2025}) {
  const th = []; for (let t = 2001; t <= akhir; t++) th.push(t);
  const v = th.map(t => +nilai[t] || 0), maks = Math.max(...v, 1e-9), W = 640, H = 190, kiri = 56, bawah = 22, atas = 18, lb = (W - kiri - 6) / th.length;
  const y = x => atas + (H - atas - bawah) * (1 - x / maks), g = s("svg", {viewBox: `0 0 ${W} ${H}`, class: "kb-g", role: "img", "aria-label": jd});
  for (const f of [0, .5, 1]) g.append(s("line", {x1: kiri, x2: W - 6, y1: y(maks * f), y2: y(maks * f), class: "gr"}), s("text", {x: kiri - 6, y: y(maks * f) + 4, "text-anchor": "end"}, ang(maks * f)));
  const iMaks = v.indexOf(Math.max(...v));
  th.forEach((t, i) => {
    const x = kiri + i * lb + 1.5, on = periode && t >= periode[0] && t <= periode[1];
    g.append(s("rect", {x, y: y(v[i]), width: lb - 3, height: Math.max(0, H - bawah - y(v[i])), class: on ? "b on" : "b"}, s("title", null, `${t}: ${ang(v[i])} ${satuan}`)));
    if (t % 5 === 0 || t === 2001) g.append(s("text", {x: x + (lb - 3) / 2, y: H - 6, "text-anchor": "middle"}, t));
    if (i === iMaks && v[i] > 0) g.append(s("text", {x: x + (lb - 3) / 2, y: y(v[i]) - 5, "text-anchor": "middle", class: "nil"}, ang(v[i])));
  });
  return h("figure", {class: "kb-grafik"}, h("figcaption", null, jd), g,
    periode ? h("div", {class: "ex-leg"}, h("span", null, h("i", {class: "kb-lg on"}), `Periode acuan ${periode[0]}–${periode[1]}`), h("span", null, h("i", {class: "kb-lg"}), "Tahun lain")) : null);
}

const rincian = (obj, nama, luas, kolNama) => {
  const b = Object.entries(obj || {}).map(([k, v]) => ({k, nm: nama[k] ?? k, ha: +v || 0})).filter(r => r.ha > 0).sort((a, b) => b.ha - a.ha);
  return b.length ? tabel([{t: kolNama, f: r => r.nm}, {t: "Luas (ha)", n: 1, f: r => ang(r.ha)}, {t: "Porsi", n: 1, f: r => pct(luas ? r.ha / luas : null)}], b) : h("p", {class: "kb-cat"}, "Tidak ada data.");
};

/* pendorong WRI: dari hilang[th].pendorong (ha + emisi) bila ada, kalau tidak dari st.pendorong (ha saja) */
function tabelPendorong(st, a) {
  const m = {};
  for (const v of Object.values(st.hilang || {})) for (const [k, x] of Object.entries(v?.pendorong || {})) { const o = m[k] ||= {ha: 0, co2: 0}; o.ha += +x?.ha || 0; o.co2 += +x?.co2_t || 0; }
  const adaTh = Object.keys(m).length, B = adaTh ? m : Object.fromEntries(Object.entries(st.pendorong || {}).map(([k, v]) => [k, {ha: +v || 0, co2: null}]));
  const L = Object.entries(B).map(([k, v]) => ({k, ...v})).filter(r => r.ha > 0).sort((x, y) => y.ha - x.ha), tot = L.reduce((x, r) => x + r.ha, 0), pb = a.pendorong_baseline;
  if (!L.length) return h("p", {class: "kb-cat"}, "Tidak ada data.");
  return tabel([{t: "Pendorong", f: r => PENDORONG[r.k] ?? r.k}, {t: "Luas (ha)", n: 1, f: r => ang(r.ha)}, {t: "Porsi", n: 1, f: r => pct(tot ? r.ha / tot : null)},
    adaTh ? {t: "Emisi (tCO2e)", n: 1, f: r => ang(r.co2)} : null,
    Array.isArray(pb) ? {t: "Baseline", f: r => pb.map(String).includes(r.k) ? pil("Masuk", "ya") : pil("Tidak", "tidak")} : null].filter(Boolean), L);
}

/* blok statistik satelit: KPI, dua grafik, rincian kawasan/tutupan/pendorong */
export function blokStat(st, a) {
  const H = AK.hutanPerTahun(st), akhir = Math.max(...Object.keys(H).map(Number)), r = AK.risikoApi(st), luas = +st.luas_ha || 0, h0 = +st.hutan2000_ha || 0;
  const stok = h0 > 0 ? ((+st.stok_tC?.atas || 0) + (+st.stok_tC?.bawah || 0)) / h0 * AK.CO2_PER_C : null;
  const per = (k, f = x => x) => Object.fromEntries(Object.entries(st[k] || {}).map(([t, v]) => [t, f(v)]));
  return h("div", {class: "kb-stat"},
    h("div", {class: "kb-kpis"},
      kpi("Luas", ang(luas), "ha"), kpi("Hutan 2000", pct(luas ? h0 / luas : null)), kpi(`Hutan ${akhir}`, ang(H[akhir]), "ha"),
      kpi("Gambut", pct(luas ? (+st.gambut_ha || 0) / luas : null)), kpi("Stok atas+bawah tanah", ang(stok), T_HA), kpi("Risiko api", kelasApi(r.kelas))),
    h("div", {class: "grid g2"},
      grafikTahun(per("hilang", x => x?.ha), {periode: a.periode_acuan, satuan: "ha", judul: "Kehilangan hutan per tahun (ha)", akhir}),
      grafikTahun(per("hilang", x => x?.co2_t), {periode: a.periode_acuan, satuan: T, judul: `Emisi bruto per tahun (${T}, GFW)`, akhir})),
    h("div", {class: "grid g3"},
      h("div", null, h("h4", null, "Kawasan hutan"), rincian(st.kawasan, KAWASAN, luas, "Fungsi")),
      h("div", null, h("h4", null, "Tutupan lahan 2017"), rincian(st.tutupan2017, KLHK, luas, "Kelas KLHK")),
      h("div", null, h("h4", null, "Pendorong kehilangan"), tabelPendorong(st, a))),
    h("p", {class: "kb-cat"}, `${r.tahun_berapi} tahun dengan kehilangan hutan akibat api, ${pct(r.porsi_api)} dari seluruh kehilangan. ${sumberGfw([st])}`));
}

/* dua penaksir faktor emisi berdampingan */
export function penaksir(st, a) {
  const g = proyeksi(st, {...a, ef_metode: "gfw"}), f = proyeksi(st, {...a, ef_metode: "frl"});
  if (g.galat || f.galat) return h("p", {class: "kb-galat"}, g.galat || f.galat);
  const n = Math.min(g.masa_baseline_th ?? 10, g.baris.length), rerataEmisi = p => p.baris.slice(0, n).reduce((x, r) => x + r.emisi_baseline_t, 0) / n;
  const baris = [[`Faktor emisi (${T_HA})`, g.ef_tCO2_per_ha, f.ef_tCO2_per_ha], [`Emisi baseline ${n} th pertama (${T}/th)`, rerataEmisi(g), rerataEmisi(f)],
    [`Estimasi kredit ${n} th pertama (${T}/th)`, potensi(g), potensi(f)], [`Estimasi kredit ${a.durasi_th} th (${T})`, g.total.kredit_t, f.total.kredit_t]];
  return tabel([{t: "Ukuran", f: r => r[0]}, {t: "GFW teramati", n: 1, f: r => ang(r[1])}, {t: "FRL nasional", n: 1, f: r => ang(r[2])},
    {t: "Selisih FRL thd GFW", n: 1, f: r => r[1] ? pct((r[2] - r[1]) / r[1], 0) : "–"}], baris);
}

const LABEL_KOLOM = {kredit_dalam_baseline_t: `Estimasi kredit masa baseline (${T})`, kredit_luar_baseline_t: `Estimasi kredit di luar masa baseline (${T})`, kredit_dalam_t: `Estimasi kredit masa baseline (${T})`, kredit_luar_t: `Estimasi kredit di luar masa baseline (${T})`};
export function tabelKredit(p, maks = Infinity) {
  const b = p.baris.slice(0, maks), t = p.total;
  const K = [["tahun", "Tahun"], ["hutan_ha", "Hutan (ha)"], ["hilang_ha", "Hilang baseline (ha)"], ["emisi_baseline_t", `Emisi baseline (${T})`], ["reduksi_t", `Reduksi (${T})`],
    ["kebocoran_t", `Kebocoran (${T})`], ["pot_ketidakpastian_t", `Ketidakpastian (${T})`], ["buffer_t", `Buffer (${T})`], ["bagian_negara_t", `Bagian negara (${T})`], ["kredit_t", `Estimasi kredit (${T})`]];
  /* kolom tambahan dari akuntansi (mis. kredit di dalam/luar masa berlaku baseline) ikut tampil bila ada */
  const dikenal = new Set([...K.map(x => x[0]), "k", "emisi_proyek_t", "bruto_t"]);
  for (const k of Object.keys(b[0] || {})) if (!dikenal.has(k) && /_t$|_ha$/.test(k) && typeof b[0][k] === "number") K.push([k, LABEL_KOLOM[k] ?? k.replace(/_/g, " ").replace(/ t$/, ` (${T})`).replace(/ ha$/, " (ha)")]);
  const masa = "dalam_masa_baseline" in (b[0] || {});
  const kolom = K.map(([k, j]) => ({t: j, n: k !== "tahun", f: r => k === "tahun" ? r.tahun : ang(r[k])}));
  if (masa) kolom.splice(1, 0, {t: "Masa baseline", f: r => r.dalam_masa_baseline ? pil("Berlaku", "ya") : pil("Perlu dinilai ulang", "dekat")});
  const tb = tabel(kolom, b,
    {kaki: (k, i) => { const j = masa ? i - 1 : i; return i === 0 ? (b.length < p.baris.length ? `Total ${p.baris.length} th` : "Total") : j <= 1 ? "" : ang(t[K[j][0]] ?? p.baris.reduce((x, r) => x + (+r[K[j][0]] || 0), 0)); }});
  if (!p.total_masa_baseline) return tb;
  return h("div", null, tb, h("p", {class: "kb-cat"}, `Estimasi kredit di dalam masa baseline ${p.masa_baseline_th} th: ${ang(p.total_masa_baseline.kredit_t)} ${T}. Sesudahnya ${ang(t.kredit_t - p.total_masa_baseline.kredit_t)} ${T}, hanya bila baseline dinilai ulang dan disetujui.`));
}

/* mata = "USD" | "Rp"; kurs dari asumsi (a.kurs) dipakai untuk Rupiah. NPV dalam juta/miliar, harga impas bulat per tCO2e. */
export function ringkasKeuangan(st, a, p, mata = "USD") {
  const k = kas(p, a), hi = impas(st, a), x = mata === "Rp" ? a.kurs : 1;
  if (k.galat) return h("p", {class: "kb-galat"}, k.galat);
  return h("div", {class: "kb-kpis"},
    kpi(`Estimasi kredit rata-rata per tahun, masa baseline ${p.masa_baseline_th ?? 10} th`, ang(potensi(p)), `${T}/th`), kpi("NPV", uangKpi(k.npv_usd, mata, x), mata),
    k.npv_masa_baseline_usd != null ? kpi(`NPV masa baseline ${p.masa_baseline_th} th`, uangKpi(k.npv_masa_baseline_usd, mata, x), mata) : null, kpi("IRR", k.irr == null ? "Tidak ada" : pct(k.irr)),
    kpi("Balik modal", k.payback_tahun == null ? "Tidak tercapai" : `tahun ke-${k.payback_tahun}`), kpi("Harga impas", hi?.galat ? "–" : hi == null ? `> ${ang(AK.BATAS_HARGA * x)}` : ang(hi * x), `${mata}/${T}`),
    kpi("Buffer dipakai", pct(p.buffer_dipakai, 0)));
}

/* ---------- formulir asumsi ---------- */
const PERSEN = new Set(["efektivitas", "kebocoran", "ketidakpastian", "buffer", "bagian_negara", "porsi_terjual", "eskalasi", "pnbp", "bagi_hasil_pemegang", "dana_komunitas", "pph", "diskonto"]);
const KELOMPOK = [
  ["Baseline", [["periode_acuan", "Periode acuan"], ["metode", "Cara proyeksi"], ["ef_metode", "Faktor emisi"], ["tahun_mulai", "Tahun kredit pertama"], ["durasi_th", "Umur proyek (th)"],
    ["masa_baseline_th", "Masa berlaku baseline (th)"], ["pendorong_baseline", "Pendorong yang dihitung baseline"]].filter(([k]) => k in AK.ASUMSI_BAWAAN)],
  ["Potongan kredit (%)", [["efektivitas", "Efektivitas proyek"], ["kebocoran", "Kebocoran"], ["ketidakpastian", "Ketidakpastian"], ["buffer", "Buffer (kosong = dari risiko api)"], ["bagian_negara", "Bagian negara"]]],
  ["Pasar dan biaya", [["harga_usd", `Harga (USD/${T})`], ["eskalasi", "Kenaikan harga per tahun (%)"], ["porsi_terjual", "Porsi terjual (%)"], ["kurs", "Kurs (Rp/USD)"], ["capex_usd", "Biaya awal (USD)"],
    ["opex_tetap_usd_th", "Biaya tetap per tahun (USD)"], ["opex_usd_per_t", `Biaya per ${T} (USD)`], ["verifikasi_usd", "Biaya verifikasi (USD)"], ["siklus_verifikasi", "Verifikasi tiap (th)"],
    ["jeda_terbit", "Terbit pertama tahun ke-"], ["pnbp", "PNBP (%)"], ["bagi_hasil_pemegang", "Bagi hasil pemegang (%)"], ["dana_komunitas", "Dana komunitas (%)"], ["pph", "PPh badan (%)"], ["diskonto", "Diskonto (%)"]]],
];
export const LABEL_ASUMSI = Object.fromEntries(KELOMPOK.flatMap(k => k[1]));
const ke = (k, v) => PERSEN.has(k) && v != null ? +(v * 100).toFixed(4) : v;

/* ubah(asumsiSah) dipanggil sesudah jeda ketik; galat ditampilkan di bawah kolomnya */
export function formAsumsi(a, st, ubah) {
  const akhirData = tahunData(st, a), f = h("form", {class: "kb-asumsi", novalidate: true, onsubmit: e => e.preventDefault()});
  for (const [jd, kol] of KELOMPOK) {
    const isi = kol;
    f.append(h("fieldset", null, h("legend", null, jd), isi.map(([k, t]) => {
      let inp;
      if (k === "periode_acuan") inp = h("span", {class: "kb-dua"}, h("input", {type: "number", name: "pa0", value: a.periode_acuan[0], min: 2001, max: akhirData, step: 1, "aria-label": "Periode acuan awal"}),
        h("span", null, "–"), h("input", {type: "number", name: "pa1", value: a.periode_acuan[1], min: 2001, max: akhirData, step: 1, "aria-label": "Periode acuan akhir"}));
      else if (k === "metode") inp = h("select", {name: k}, h("option", {value: "rerata", selected: a.metode === "rerata"}, "Laju rata-rata"), h("option", {value: "tren", selected: a.metode === "tren"}, "Tren garis lurus"));
      else if (k === "ef_metode") inp = h("select", {name: k}, h("option", {value: "gfw", selected: a.ef_metode === "gfw"}, "GFW teramati"), h("option", {value: "frl", selected: a.ef_metode === "frl"}, "FRL nasional"));
      else if (k === "pendorong_baseline") inp = h("span", {class: "kb-cek"}, Object.entries(PENDORONG).map(([v, t]) =>
        h("label", null, h("input", {type: "checkbox", name: "pb", value: v, checked: (a.pendorong_baseline || []).map(String).includes(v)}), t)));
      else inp = h("input", {type: "number", name: k, value: ke(k, a[k]) ?? "", step: "any", inputmode: "decimal", placeholder: k === "buffer" ? "otomatis" : null});
      return h("label", {class: "kb-f", data: {k}}, h("span", null, t), inp, h("small", {class: "kb-galat", hidden: true}));
    })));
  }
  const baca = () => {
    const d = new FormData(f), b = {...a};
    for (const [k, v] of d) {
      if (k === "pa0" || k === "pa1" || k === "pb") continue;
      if (k === "metode" || k === "ef_metode") { b[k] = v; continue; }
      b[k] = v === "" ? (k === "buffer" ? null : NaN) : PERSEN.has(k) ? +v / 100 : +v;
    }
    if (d.has("pa0")) b.periode_acuan = [+d.get("pa0"), +d.get("pa1")];
    if (f.querySelector("[name=pb]")) b.pendorong_baseline = d.getAll("pb");
    return b;
  };
  const cek = tunda(() => {
    const b = baca(), v = AK.validasiAsumsi(b, st), salah = new Map();
    for (const g of v.galat) { const k = g.split(":")[0]; salah.set(k, PERSEN.has(k) ? (k === "eskalasi" ? "Isi −100 sampai 100." : k === "buffer" ? "Isi 0 sampai 100, atau kosongkan." : "Isi 0 sampai 100.") : g.slice(k.length + 2)); }
    f.querySelectorAll(".kb-f").forEach(l => { const m = salah.get(l.dataset.k), e = l.querySelector(".kb-galat"); e.hidden = !m; e.textContent = m || ""; l.querySelectorAll("input,select").forEach(x => x.setAttribute("aria-invalid", String(!!m))); });
    if (v.ok) ubah(b);
  }, 300);
  f.addEventListener("input", cek); f.addEventListener("change", cek);
  return f;
}
