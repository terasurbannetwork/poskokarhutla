/* SIPPA: layar Kalkulator hidraulika /pipa/hitung (PRD §9.4.3, DS §3.7.1, §3.11, §3.12, §4.3). Kontrak router: pasang(akar, konteks) dan lepas().
   Butuh global public/inti: nanti (dimuat cangkang atau app.js); fmt dipakai bila ada. Logika murni di atas (diuji tanpa DOM), DOM di bawah.
   Rumus tidak ditulis ulang: semua dari hitung.js. Gaya di layar_hitung.css (dimuat layar ini, bukan pipa.css). Tidak ada data di berkas ini. */
import {hidraulika, hfHW, idHdpe, idLayflat, pesanGerbang, KONST, KELAS_POMPA, BAWAAN} from "./hitung.js";
import {memuat, galat} from "./keadaan.js";
import {ikon} from "./ikon.js";

/* ---------- format ---------- */
const tampil = n => typeof fmt === "function" ? fmt(n) : n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const desimal = x => String(x).replace(".", ",");   // isian dan rasio: presisi penuh, tanpa pembulatan fmt
const lolos = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const durasi = menit => {
  if (typeof fmt === "function" && fmt.durasi) return fmt.durasi(menit * 6e4);
  const m = Math.max(1, Math.round(menit)), j = Math.floor(m / 60);
  return j ? `${j} jam${m % 60 ? ` ${m % 60} menit` : ""}` : `${m} menit`;
};

/* ---------- masukan: satu daftar batas untuk klien (PRD §9.4.3); fungsi murni menolak yang sama ---------- */
export const KELOMPOK = [["trase", "Trase"], ["pipa", "Pipa/selang"], ["pompa", "Pompa"], ["lance", "Lance"], ["sumber", "Sumber air"], ["lingkungan", "Lingkungan"]];
const OPSI_POMPA = [...Object.entries(KELAS_POMPA).map(([k, v]) => [k, v.nama]), ["tanpa", "Tanpa pompa terpilih"]];
export const MEDAN = [
  {k: "L_m", label: "Panjang trase", satuan: "m", min: 10, maks: 5000, bawaan: BAWAAN.L_m, kel: "trase", jenis: "angka"},
  {k: "liku", label: "Faktor liku trase", satuan: "", min: 1, maks: 2, bawaan: KONST.liku_trase, kel: "trase", jenis: "angka", bilaKompleks: true, bantu: "panjang = jarak air x faktor ini, asumsi kebijakan"},
  {k: "dz_m", label: "Beda elevasi", satuan: "m", min: -20, maks: 50, bawaan: BAWAAN.dz_m, kel: "trase", jenis: "angka", bantu: "positif = naik"},
  {k: "K", label: "Σ K minor", satuan: "", min: 0, maks: 30, bawaan: BAWAAN.K, kel: "trase", jenis: "angka"},
  {k: "sisa_bar", label: "Tekanan sisa di manifold", satuan: "bar", min: 0.5, maks: 6, bawaan: BAWAAN.sisa_bar, kel: "trase", jenis: "angka"},
  {k: "bahan", label: "Bahan", kel: "pipa", jenis: "pilih", seg: true, bawaan: BAWAAN.bahan, opsi: [["layflat", "Layflat"], ["hdpe", "HDPE"]]},
  {k: "dn_mm", label: "DN layflat", kel: "pipa", jenis: "pilih", bawaan: BAWAAN.dn_mm, hanya: "layflat", opsi: [[65, "DN65"], [100, "DN100"], [150, "DN150"]]},
  {k: "od_mm", label: "OD HDPE", kel: "pipa", jenis: "pilih", bawaan: 160, hanya: "hdpe", opsi: [[110, "OD110"], [160, "OD160"], [200, "OD200"], [250, "OD250"]]},
  {k: "sdr", label: "SDR HDPE", kel: "pipa", jenis: "pilih", seg: true, bawaan: BAWAAN.sdr, hanya: "hdpe", opsi: [[11, "SDR11 (PN16)"], [17, "SDR17 (PN10)"]]},
  {k: "id_datasheet_mm", label: "ID datasheet", satuan: "mm", min: KONST.id_datasheet.min, maks: KONST.id_datasheet.maks, bawaan: null, opsional: true, kel: "pipa", jenis: "angka", hanya: "layflat", bantu: "kosong = 0,96 x DN"},
  {k: "pk_layflat_bar", label: "Tekanan kerja layflat", satuan: "bar", min: 6, maks: 25, bawaan: BAWAAN.pk_layflat_bar, kel: "pipa", jenis: "angka", hanya: "layflat", bantu: "dari datasheet"},
  {k: "C", label: "C Hazen-Williams", satuan: "", min: 100, maks: 150, bawaan: BAWAAN.C, kel: "pipa", jenis: "angka", bantu: "layflat 120–130, HDPE 135–140"},
  {k: "pompa", label: "Kelas pompa", kel: "pompa", jenis: "pilih", bawaan: BAWAAN.pompa, opsi: OPSI_POMPA, kosongKe: "tanpa"},
  {k: "n_pompa", label: "Jumlah pompa", satuan: "", min: 1, maks: 4, bawaan: BAWAAN.n_pompa, kel: "pompa", jenis: "angka", bulat: true},
  {k: "eta", label: "Efisiensi pompa η", satuan: "", min: 0.35, maks: 0.9, bawaan: BAWAAN.eta, kel: "pompa", jenis: "angka"},
  {k: "q_lpm", label: "Debit", satuan: "L/min", min: 50, maks: 3000, bawaan: BAWAAN.q_lpm, kel: "pompa", jenis: "angka", bantu: "300 L/min = 5 L/s, terserap 8 lance"},
  {k: "n_lance", label: "Jumlah lance aktif", satuan: "", min: 0, maks: 24, bawaan: BAWAAN.n_lance, kel: "lance", jenis: "angka", bulat: true},
  {k: "serap_lain_lpm", label: "Debit pemakai lain", satuan: "L/min", min: 0, maks: 3000, bawaan: BAWAAN.serap_lain_lpm, kel: "lance", jenis: "angka", bantu: "selang serang atau perimeter, ikut serapan"},
  {k: "dalam_m", label: "Kedalaman lance", satuan: "m", min: 0, maks: KONST.dalam_maks_m, bawaan: BAWAAN.dalam_m, kel: "lance", jenis: "angka"},
  {k: "jam", label: "Jam pompa per insiden", satuan: "jam", min: 1, maks: 720, bawaan: BAWAAN.jam, kel: "lance", jenis: "angka"},
  {k: "q95_ls", label: "Q95 sumber", satuan: "L/s", min: 0, maks: 1e6, bawaan: null, opsional: true, kel: "sumber", jenis: "angka", bantu: "neraca air dihitung bila diisi"},
  {k: "qeko_ls", label: "Q ekologi", satuan: "L/s", min: 0, maks: 1e6, bawaan: null, opsional: true, kel: "sumber", jenis: "angka"},
  {k: "stok_m3", label: "Stok awal", satuan: "m3", min: 0, maks: 1e9, bawaan: null, opsional: true, kel: "sumber", jenis: "angka"},
  {k: "hari", label: "Lama pemantauan", satuan: "hari", min: 1, maks: 3650, bawaan: null, opsional: true, kel: "sumber", jenis: "angka", bulat: true, bantu: "kosong = 30 hari"},
  {k: "suhu_c", label: "Suhu pipa", satuan: "°C", min: 20, maks: 60, bawaan: BAWAAN.suhu_c, kel: "lingkungan", jenis: "angka", bantu: "untuk derating HDPE"},
  {k: "perimeter_aktif", label: "Ujung di perimeter api aktif", kel: "lingkungan", jenis: "sakelar", bawaan: false},
];
const POLA_KOMPLEKS = /^K\d{1,10}$/;

export function nilaiBawaan() {
  const n = {hisap: true, dz_sumber: "masukan", kompleks: null};
  for (const m of MEDAN) n[m.k] = m.bawaan;
  return n;
}

/* teks ketikan id-ID: koma desimal, titik ribuan (kelompok tiga angka, bukan "0.xxx"); selain itu NaN */
export function angkaId(t) {
  const s = String(t ?? "").trim();
  if (!s) return NaN;
  if (s.includes(",")) return /^-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d+$/.test(s) ? Number(s.replace(/\./g, "").replace(",", ".")) : NaN;
  if (/^-?(?!0\.)\d{1,3}(?:\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  return /^-?\d+(?:\.\d+)?$/.test(s) ? Number(s) : NaN;
}
const angkaMesin = t => /^-?\d+(?:\.\d+)?$/.test(String(t ?? "").trim()) ? Number(t) : NaN;   // isi tautan: titik selalu desimal

/* satu medan: {nilai} atau {galat}; mesin = teks dari tautan, bukan ketikan */
export function cekMedan(m, teks, mesin = false) {
  const s = String(teks ?? "").trim();
  if (m.jenis === "sakelar") return s === "1" || s === "true" ? {nilai: true} : s === "0" || s === "false" || s === "" ? {nilai: false} : {galat: `${m.label} tidak dikenal`};
  if (m.jenis === "pilih") {
    const o = m.opsi.find(([v]) => String(v) === s);
    return o ? {nilai: o[0] === m.kosongKe ? null : o[0]} : {galat: `${m.label} tidak dikenal`};
  }
  if (!s) return m.opsional ? {nilai: null} : {galat: `${m.label} wajib diisi`};
  const v = (mesin ? angkaMesin : angkaId)(s);
  if (Number.isNaN(v)) return {galat: `${m.label} harus berupa angka`};
  if (m.bulat && !Number.isInteger(v)) return {galat: `${m.label} harus bilangan bulat`};
  if (m.k === "dalam_m" && v > m.maks) return {galat: `Injeksi lebih dari ${KONST.dalam_maks_m} m tidak termasuk SIPPA (keputusan 50)`};
  if (v < m.min || v > m.maks) {
    const u = m.satuan ? " " + m.satuan : "";
    return {galat: `${m.label} ${tampil(v)}${u} di luar rentang ${tampil(m.min)}–${tampil(m.maks)}${u}`};
  }
  return {nilai: v};
}

/* teks per kunci -> nilai baru; yang tertolak tidak menimpa nilai sah terakhir (lama = kunci yang masih memakai nilai lama) */
export function terapkan(teks, sebelumnya, mesin = false) {
  const nilai = {...sebelumnya}, galatPer = {};
  for (const [k, t] of Object.entries(teks)) {
    const m = MEDAN.find(x => x.k === k);
    if (!m) continue;
    const r = cekMedan(m, t, mesin);
    if (r.galat) galatPer[k] = r.galat; else nilai[k] = r.nilai;
  }
  if ("dz_m" in teks && !galatPer.dz_m) nilai.dz_sumber = "masukan";
  return {nilai, galat: galatPer, lama: Object.keys(galatPer)};
}

/* ---------- tautan: semua masukan ke query dan kembali (H5) ---------- */
export const KUNCI_QUERY = [...MEDAN.map(m => m.k), "kompleks", "dzs"];
export function keQuery(n) {
  const q = new URLSearchParams();
  for (const m of MEDAN) {
    const v = n[m.k];
    if (v == null && m.jenis === "pilih" && m.kosongKe) q.set(m.k, m.kosongKe);
    else if (v != null) q.set(m.k, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  if (n.kompleks) q.set("kompleks", n.kompleks);
  if (n.dz_sumber === "dsm") q.set("dzs", "dsm");
  return q.toString();
}
/* medan liar dibuang per medan (bawaan menggantikan), tidak seluruh tautan; galat dilaporkan per kunci */
export function dariQuery(cari) {
  const q = new URLSearchParams(cari), n = nilaiBawaan(), galatPer = {};
  for (const m of MEDAN) {
    if (!q.has(m.k)) continue;
    const r = cekMedan(m, q.get(m.k), true);
    if (!r.galat) n[m.k] = r.nilai;
    else if (m.jenis === "angka") galatPer[m.k] = r.galat;   // pilihan liar jatuh diam ke bawaan: bukan ketikan siapa pun
  }
  if (POLA_KOMPLEKS.test(q.get("kompleks") || "")) n.kompleks = q.get("kompleks");
  if (q.get("dzs") === "dsm") n.dz_sumber = "dsm";
  return {nilai: n, galat: galatPer, eksplisit: new Set(MEDAN.filter(m => q.has(m.k)).map(m => m.k))};
}

/* kompleks dari Peta (P7): L = jarak air x faktor liku, dz = -(beda elevasi) dari DSM; di luar rentang dijepit dan dilaporkan */
export function masukanKompleks(k, liku = KONST.liku_trase) {
  const r = {kompleks: k.id, dz_sumber: "dsm", dijepit: []};
  const jepit = (kunci, v) => {
    const m = MEDAN.find(x => x.k === kunci), j = Math.min(m.maks, Math.max(m.min, v));
    if (j !== v) r.dijepit.push(kunci);
    r[kunci] = j;
  };
  if (k.air_km_semua != null) jepit("L_m", k.air_km_semua * 1000 * liku);
  if (k.beda_air_m != null) jepit("dz_m", -k.beda_air_m);
  return r;
}

/* ---------- ke fungsi murni ---------- */
export function keHidraulika(n) {
  const q95 = n.q95_ls;
  return {bahan: n.bahan, dn_mm: n.dn_mm, od_mm: n.od_mm, sdr: n.sdr, id_datasheet_mm: n.id_datasheet_mm, pk_layflat_bar: n.pk_layflat_bar, L_m: n.L_m, q_lpm: n.q_lpm, C: n.C,
    dz_m: n.dz_m, dz_sumber: n.dz_sumber, K: n.K, sisa_bar: n.sisa_bar, eta: n.eta, suhu_c: n.suhu_c, pompa: n.pompa, n_pompa: n.n_pompa, n_lance: n.n_lance,
    serap_lain_lpm: n.serap_lain_lpm, dalam_m: n.dalam_m, jam: n.jam, hisap: n.hisap ?? true, perimeter_aktif: !!n.perimeter_aktif,
    sumber: q95 == null ? null : {q95_ls: q95, qeko_ls: n.qeko_ls ?? 0, stok_m3: n.stok_m3 ?? 0, hari: n.hari ?? 30, evap_m3_hari: 0}};
}

/* ---------- vonis dan kartu angka ---------- */
const KELAS_VONIS = {"NO-GO": "nogo", HOLD: "hold", KONDISIONAL: "kondisional"};
const TANPA_HAMBATAN = "Tidak ada hambatan keras atau bersyarat. KONDISIONAL tetap butuh uji lapangan (G2, G3).";
export function ringkasVonis(h, p) {
  const gerbang = h.gerbang.map(g => ({kode: g.kode, tingkat: g.tingkat, pesan: pesanGerbang(g)}));
  const utama = gerbang.find(g => g.tingkat !== "catatan"), lain = gerbang.filter(g => g.tingkat !== "catatan").length - 1;
  const alasan = !utama ? TANPA_HAMBATAN : lain > 0 ? `${utama.pesan}; ${tampil(lain)} hambatan lain` : utama.pesan;
  return {kata: h.vonis, kelas: KELAS_VONIS[h.vonis], alasan, gerbang, lengan_uji: p.dalam_m >= KONST.dalam_uji_m};
}

export function kartuAngka(h, p) {
  const tekanan = h.p_pompa_bar > h.p_batas_bar ? "lewat" : "";
  const ujung = h.p_ujung_bar < KONST.sisa_keras ? "lewat" : h.p_ujung_bar < KONST.sisa_syarat ? "syarat" : "";
  const em = "estimasi-model";
  return [
    {k: "p_pompa", label: "Tekanan pompa", nilai: `${tampil(h.p_pompa_bar)} bar`, banding: `batas kerja ${tampil(h.p_batas_bar)} bar`, nada: tekanan, yakin: em, sumber: "Hazen-Williams dan TDH, PRD §6.4"},
    {k: "p_ujung", label: "Tekanan ujung", nilai: `${tampil(h.p_ujung_bar)} bar`, banding: h.rating_ada ? `sisa ${tampil(p.sisa_bar)} bar + rating pompa dikurangi kebutuhan` : "tanpa rating pompa, sama dengan tekanan sisa", nada: ujung, yakin: em, sumber: "rating datasheet kelas pompa, bukan kurva terukur"},
    {k: "tdh", label: "TDH", nilai: `${tampil(h.tdh_m)} m`, banding: `head loss pipa ${tampil(h.hf_m)} m`, nada: "", yakin: em, sumber: "Δz + h_f + K v²/2g + tekanan sisa, PRD §6.4"},
    {k: "v", label: "Kecepatan", nilai: `${tampil(h.v_ms)} m/s`, banding: `waspada di atas ${tampil(KONST.v_peringatan)} m/s`, nada: h.v_ms > KONST.v_peringatan ? "syarat" : "", yakin: h.id_asumsi ? "asumsi-kebijakan" : em, sumber: h.id_asumsi ? `ID dari ${desimal(KONST.layflat_id_rasio)} x DN` : "ID datasheet atau dari OD dan SDR"},
    {k: "kw", label: "Daya poros", nilai: `${tampil(h.kw)} kW`, banding: `${tampil(h.hp)} HP; ${tampil(h.kw_per_pompa)} kW per pompa`, nada: "", yakin: em, sumber: "P = ρ g Q TDH / η"},
    {k: "bbm", label: "BBM", nilai: `${tampil(h.bbm_l_jam)} L/jam`, banding: `${tampil(h.bbm_l)} L per insiden`, nada: "", yakin: em, sumber: "konsumsi spesifik dan densitas BBM, PRD §6.4"},
    {k: "co2", label: "CO2", nilai: `${tampil(h.co2_kg / p.jam)} kg/jam`, banding: `${tampil(h.co2_kg)} kg per insiden`, nada: "", yakin: em, sumber: "faktor emisi per liter BBM"},
    {k: "isi", label: "Volume isi trase", nilai: `${tampil(h.v_isi_m3)} m3`, banding: `trase ${tampil(p.L_m)} m`, nada: "", yakin: h.id_asumsi ? "asumsi-kebijakan" : em, sumber: "luas penampang x panjang"},
    {k: "tiba", label: "Waktu air tiba", nilai: durasi(h.t_tiba_menit), banding: "mengisi trase pada debit ini", nada: "", yakin: em, sumber: "volume isi / debit"},
  ];
}

/* pil kecil di samping isian: dari mana angka itu berasal atau apa artinya */
export function pilIsian(n, h) {
  const r = {};
  if (n.bahan === "layflat" && n.id_datasheet_mm == null) r.id_datasheet_mm = {teks: `ID = ${desimal(KONST.layflat_id_rasio)} x DN`, kelas: "asumsi-kebijakan"};
  if (n.dz_sumber === "dsm") r.dz_m = {teks: "Dari DSM", kelas: "estimasi-model"};
  if (h && n.dalam_m >= KONST.dalam_uji_m) r.dalam_m = {teks: "Lengan uji", kelas: "hipotesis"};
  return r;
}

/* ---------- grafik ---------- */
const DIAMETER = [["DN65", "layflat", 65], ["DN100", "layflat", 100], ["DN150", "layflat", 150], ["OD110", "hdpe", 110], ["OD160", "hdpe", 160], ["OD200", "hdpe", 200]];
/* head loss m per km pada debit dan C masukan; layflat ID = 0,96 x DN, HDPE dari OD dan SDR masukan */
export function headlossPerDiameter(n) {
  const Q = n.q_lpm / 60000;
  return DIAMETER.map(([nama, bahan, mm]) => {
    const id = bahan === "hdpe" ? idHdpe(mm, n.sdr) : idLayflat(mm, null).id, D = id / 1000;
    return {n: nama, bahan, mm, id, hf: hfHW(1000, Q, n.C, D), v: Q / (Math.PI * D * D / 4), dipakai: n.bahan === bahan && (bahan === "hdpe" ? n.od_mm : n.dn_mm) === mm};
  });
}

const sumbuTeks = (x, y, t, jangkar = "end", kelas = "sp-teks") => `<text class="${kelas}" x="${x}" y="${y}" text-anchor="${jangkar}">${lolos(t)}</text>`;
const langkahBagus = maks => { const kasar = maks / 4, p = 10 ** Math.floor(Math.log10(kasar)), f = kasar / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };

/* garis tekanan per 50 m dari pompa sampai manifold, garis batas kerja dan 2 bar */
export function svgTekanan(h, p) {
  const W = 720, H = 270, kiri = 46, kanan = 96, atas = 16, bawah = 34;
  const ys = h.profil.map(t => t.p_bar), maks = Math.max(h.p_batas_bar, KONST.sisa_syarat, ...ys) * 1.1, min = Math.min(0, ...ys);
  const langkah = langkahBagus(maks - min);
  const X = m => kiri + (W - kiri - kanan) * (m / p.L_m), Y = v => atas + (H - atas - bawah) * (1 - (v - min) / (maks - min));
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="hx-gt-j hx-gt-d"><title id="hx-gt-j">Tekanan sepanjang trase, bar, per ${tampil(KONST.profil_langkah_m)} m</title>`;
  s += `<desc id="hx-gt-d">Tekanan turun dari ${tampil(h.profil[0].p_bar)} bar di pompa menjadi ${tampil(h.profil[h.profil.length - 1].p_bar)} bar di manifold sepanjang ${tampil(p.L_m)} m; batas kerja ${tampil(h.p_batas_bar)} bar.</desc>`;
  for (let v = Math.ceil(min / langkah) * langkah; v <= maks; v += langkah) s += `<line class="sp-sumbu" x1="${kiri}" x2="${W - kanan}" y1="${Y(v)}" y2="${Y(v)}"/>${sumbuTeks(kiri - 6, Y(v) + 4, tampil(v))}`;
  const ujungX = [0, 0.25, 0.5, 0.75, 1].map(f => f * p.L_m);
  for (const m of ujungX) s += sumbuTeks(X(m), H - 14, tampil(m), "middle");
  s += sumbuTeks(W - kanan, H - 2, "jarak dari pompa, m", "end");
  s += `<line class="sp-ambang" x1="${kiri}" x2="${W - kanan}" y1="${Y(h.p_batas_bar)}" y2="${Y(h.p_batas_bar)}"/>${sumbuTeks(W - kanan + 6, Y(h.p_batas_bar) + 4, `batas ${tampil(h.p_batas_bar)} bar`, "start", "sp-teks sp-kuat")}`;
  s += `<line class="sp-ambang putus" x1="${kiri}" x2="${W - kanan}" y1="${Y(KONST.sisa_syarat)}" y2="${Y(KONST.sisa_syarat)}"/>${sumbuTeks(W - kanan + 6, Y(KONST.sisa_syarat) + 4, `${tampil(KONST.sisa_syarat)} bar`, "start")}`;
  s += `<polyline class="sp-garis-tekanan" fill="none" points="${h.profil.map(t => `${X(t.x_m)},${Y(t.p_bar)}`).join(" ")}"/>`;
  for (const t of h.profil) s += `<circle class="sp-titik sp-titik-kecil" cx="${X(t.x_m)}" cy="${Y(t.p_bar)}" r="2"><title>${tampil(t.x_m)} m: ${tampil(t.p_bar)} bar</title></circle>`;
  return s + "</svg>";
}

/* tabel profil untuk pembaca layar dan papan ketik: pengganti grafik */
export function tabelProfil(h) {
  return `<table class="ad-tabel"><caption class="sr">Tekanan sepanjang trase</caption><thead><tr><th scope="col">Jarak dari pompa, m</th><th scope="col">Tekanan, bar</th></tr></thead><tbody>${h.profil.map(t => `<tr><td class="n">${tampil(t.x_m)}</td><td class="n">${tampil(t.p_bar)}</td></tr>`).join("")}</tbody></table>`;
}

/* batang horizontal berlabel: head loss per diameter pada debit terpilih (pola Kartu.hbar, warna lewat kelas CSS) */
export function svgHeadloss(n) {
  const baris = headlossPerDiameter(n), rh = 30, kiri = 70, kanan = 104, W = 720, H = baris.length * rh + 6, maks = Math.max(...baris.map(b => b.hf));
  const X = v => v / maks * (W - kiri - kanan);
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="hx-gh-j hx-gh-d"><title id="hx-gh-j">Head loss per diameter pada ${tampil(n.q_lpm)} L/min, m per km</title>`;
  s += `<desc id="hx-gh-d">${lolos(baris.map(b => `${b.n} ${tampil(b.hf)} m per km`).join("; "))}.</desc>`;
  baris.forEach((b, i) => {
    const y = i * rh + 3, w = Math.max(2, X(b.hf));
    s += `<g><text class="sp-teks sp-kuat" x="${kiri - 8}" y="${y + rh / 2 + 3}" text-anchor="end">${b.n}</text>`;
    s += `<rect class="sp-batang${b.dipakai ? " dipakai" : ""}" x="${kiri}" y="${y + 5}" width="${w}" height="${rh - 12}" rx="4"><title>${b.n}: ${tampil(b.hf)} m per km, ID ${tampil(b.id)} mm, ${tampil(b.v)} m/s</title></rect>`;
    s += sumbuTeks(kiri + w + 8, y + rh / 2 + 3, `${tampil(b.hf)} m/km`, "start", "sp-teks sp-kuat") + "</g>";
  });
  return s + "</svg>";
}

/* ---------- ekspor dan hak ---------- */
export function eksporAcuan(n, h, id = "H-ekspor") {
  return {id, fungsi: "hidraulika", masukan: keHidraulika(n), kembar: false, harap: {id_mm: h.id_mm, v_ms: h.v_ms, hf_m: h.hf_m, hm_m: h.hm_m, tdh_m: h.tdh_m, p_pompa_bar: h.p_pompa_bar,
    p_batas_bar: h.p_batas_bar, p_ujung_bar: h.p_ujung_bar, kw: h.kw, bbm_l_jam: h.bbm_l_jam, v_isi_m3: h.v_isi_m3, t_tiba_menit: h.t_tiba_menit,
    gerbang: h.gerbang.filter(g => g.tingkat !== "catatan").map(g => g.kode), vonis: h.vonis}};
}
export const bolehEkspor = peran => peran === "M";
export function bolehSkenario(peran, tersedia) {
  if (peran !== "W" && peran !== "M") return {aktif: false, alasan: "Akunmu hanya bisa membaca layar ini"};
  return tersedia ? {aktif: true, alasan: ""} : {aktif: false, alasan: "Belum tersedia. Penyimpanan skenario Studio aktif setelah rute skenario dirilis."};
}

/* ================= tampilan (DOM) ================= */
const SKENARIO_TERSEDIA = false;   // dibalik oleh tiket rute skenario (SP-035) bersama layar Studio
const TINGKAT = {keras: "Keras", syarat: "Bersyarat", catatan: "Catatan"};
const IKON_VONIS = {
  nogo: '<path d="m15 9-6 6"/><path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"/><path d="m9 9 6 6"/>',
  hold: '<circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/>',
  kondisional: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
};
const svgVonis = kelas => `<svg class="sp-ikon sp-ikon-vonis" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON_VONIS[kelas]}</svg>`;
const pil = (teks, kelas) => `<span class="sp-yakin ${kelas}">${lolos(teks)}</span>`;
const teksMasukan = v => v == null ? "" : desimal(v);
const peranSaya = () => { const d = document.body?.dataset; return d && (d.mod === "1" || d.super === "1") ? "M" : d && d.tulis === "1" ? "W" : "B"; };

function isianHtml(m, v) {
  const id = `hx-${m.k}`, atribut = (m.hanya ? ` data-hanya="${m.hanya}"` : "") + (m.bilaKompleks ? " data-bila-kompleks" : "");
  if (m.jenis === "sakelar") return `<div class="sp-isian sp-isian-sakelar" data-isian="${m.k}"><label class="sp-sakelar" for="${id}"><input type="checkbox" id="${id}" data-k="${m.k}"${v ? " checked" : ""}><span>${lolos(m.label)}</span></label><small class="sp-bantu" id="${id}-b">Wajib bila ujung pipa HDPE ada di perimeter api (K-16)</small></div>`;
  if (m.jenis === "pilih" && m.seg) return `<div class="sp-isian" data-isian="${m.k}"${atribut}><span class="sp-lab" id="${id}-l">${lolos(m.label)}</span><div class="ad-seg" role="radiogroup" aria-labelledby="${id}-l">${m.opsi.map(([o, n]) => `<button type="button" role="radio" aria-checked="${String(o === v)}" tabindex="${o === v ? 0 : -1}" data-seg="${m.k}" data-v="${o}">${lolos(n)}</button>`).join("")}</div></div>`;
  if (m.jenis === "pilih") return `<div class="sp-isian" data-isian="${m.k}"${atribut}><label for="${id}">${lolos(m.label)}</label><select id="${id}" data-k="${m.k}">${m.opsi.map(([o, n]) => `<option value="${o}"${(v ?? m.kosongKe) === o ? " selected" : ""}>${lolos(n)}</option>`).join("")}</select></div>`;
  const rentang = `${tampil(m.min)}–${tampil(m.maks)}${m.satuan ? " " + m.satuan : ""}`;
  return `<div class="sp-isian" data-isian="${m.k}"${atribut}><div class="sp-lab-baris"><label for="${id}">${lolos(m.label)}</label><span class="sp-pil-isian" data-pil="${m.k}" hidden></span></div>
    <span class="sp-kotak"><input id="${id}" data-k="${m.k}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${lolos(teksMasukan(v))}" aria-describedby="${id}-b ${id}-g"${m.satuan ? ' class="ada-satuan"' : ""}>${m.satuan ? `<span class="sp-satuan">${lolos(m.satuan)}</span>` : ""}</span>
    <small class="sp-bantu" id="${id}-b">Rentang ${lolos(rentang)}${m.bantu ? `; ${lolos(m.bantu)}` : ""}</small><small class="sp-galat-isian" id="${id}-g" hidden></small></div>`;
}

const kerangkaGrafik = (ey, judul, isiId, legenda, sumberId, sumber) => `<article class="ex"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header>
  <div class="ex-bd" id="${isiId}"><div class="sp-kerangka"></div></div><footer class="ex-ft">${legenda}<em id="${sumberId}">${sumber}</em></footer></article>`;

let ctrl = null, hentikan = [];
export function lepas() { ctrl?.abort(); ctrl = null; hentikan.forEach(f => f()); hentikan = []; }

/* gaya layar ini dimuat sekali; layar menunggu sampai terpasang agar tidak berkedip polos */
function muatGaya() {
  return new Promise(ok => {
    if (document.querySelector('link[data-sp="hitung"]')) return ok();
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "/pipa/layar_hitung.css?v=1"; l.dataset.sp = "hitung";
    l.onload = l.onerror = () => ok();
    document.head.append(l);
    setTimeout(ok, 1500);
  });
}

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranSaya(), ponsel = matchMedia("(max-width: 767px)").matches;
  await muatGaya();
  if (sinyal.aborted) return;

  const awal = dariQuery(location.search);
  const st = {nilai: awal.nilai, galat: {...awal.galat}, h: null, vonis: null, kompleks: null};
  const skenario = bolehSkenario(peran, SKENARIO_TERSEDIA);

  akar.innerHTML = `<div class="sp-judul-baris"><h1 class="sp-judul">Kalkulator hidraulika</h1>
    <div class="sp-aksi-judul"><button type="button" class="ad-tombol" data-aksi="salin">Salin tautan</button>
    <button type="button" class="ad-tombol" data-aksi="skenario" ${skenario.aktif ? "" : "disabled"} title="${lolos(skenario.alasan)}">Simpan sebagai skenario Studio</button>
    ${bolehEkspor(peran) ? '<button type="button" class="ad-tombol" data-aksi="ekspor">Ekspor acuan</button>' : ""}</div></div>
    <p class="sp-info-aksi" role="status" data-info></p>${skenario.aktif ? "" : `<p class="sp-bantu sp-info-skenario">${lolos(skenario.alasan)}</p>`}
    <div data-kompleks></div>
    <div class="sp-hitung">
      <form class="sp-form sp-hitung-form" novalidate aria-label="Masukan kalkulator">${KELOMPOK.map(([kel, nama], i) => `<details class="sp-kel"${!ponsel || i === 0 ? " open" : ""} data-kel="${kel}"><summary><span class="ad-ey">${nama}</span></summary><div class="sp-kel-isi">${MEDAN.filter(m => m.kel === kel).map(m => isianHtml(m, st.nilai[m.k])).join("")}</div></details>`).join("")}</form>
      <div class="sp-hasil">
        <section class="sp-vonis-kartu" aria-labelledby="hx-vonis-kata"><div class="sp-vonis-ikon" data-vonis-ikon></div><div class="sp-vonis-isi">
          <p class="sp-vonis-kata" id="hx-vonis-kata"></p><p class="sp-vonis-alasan" data-vonis-alasan></p><div class="sp-pil-baris" data-vonis-pil></div><p class="sp-lama" data-lama hidden></p>
          <details class="sp-gerbang-rinci"${ponsel ? "" : " open"}><summary>Daftar gerbang</summary><ul class="sp-gerbang-daftar" role="list" data-gerbang></ul></details></div></section>
        <p class="sr" aria-live="polite" data-umum></p>
        <dl class="sp-angka-kisi" data-angka></dl>
        ${kerangkaGrafik("Hidraulika", "Tekanan sepanjang trase, bar, per 50 m", "hx-g-tekanan",
          `<span class="ex-leg"><span><i class="sp-pj sp-pj-garis"></i>tekanan</span><span><i class="sp-pj"></i>batas kerja</span><span><i class="sp-pj sp-pj-putus"></i>2 bar</span></span>`, "hx-sumber-t", "Sumber: rumus Hazen-Williams (PRD §6.4) dan rating kelas pompa datasheet; estimasi-model sampai bench G2")}
        <details class="sp-tabel-data"><summary>Lihat sebagai tabel</summary><div data-tabel-profil></div></details>
        ${kerangkaGrafik("Hidraulika", "Head loss per diameter, m per km", "hx-g-headloss", "", "hx-sumber-hl", "")}
      </div></div>`;

  const q = s => akar.querySelector(s), semua = s => [...akar.querySelectorAll(s)];
  const info = q("[data-info]"), umum = q("[data-umum]");

  /* ----- hitung dan isi kartu: murni, cukup murah untuk dilakukan di handler ----- */
  function perbarui() {
    let h;
    try { h = hidraulika(keHidraulika(st.nilai)); }
    catch (e) { q("[data-vonis-alasan]").textContent = e.message; return; }
    st.h = h;
    const r = ringkasVonis(h, st.nilai), lama = Object.keys(st.galat);
    q(".sp-vonis-kartu").className = `sp-vonis-kartu ${r.kelas}`;
    q("[data-vonis-ikon]").innerHTML = svgVonis(r.kelas);
    q(".sp-vonis-kata").textContent = r.kata;
    q("[data-vonis-alasan]").textContent = r.alasan;
    q("[data-vonis-pil]").innerHTML = pil("Estimasi model", "estimasi-model") + (r.lengan_uji ? pil("Lengan uji", "hipotesis") : "");
    const lm = q("[data-lama]");
    lm.hidden = !lama.length;
    lm.textContent = lama.length ? `Hasil memakai nilai sah terakhir untuk: ${lama.map(k => MEDAN.find(m => m.k === k).label).join(", ")}.` : "";
    q("[data-gerbang]").innerHTML = r.gerbang.length ? r.gerbang.map(g => `<li><span class="sp-tingkat ${lolos(g.tingkat)}">${lolos(TINGKAT[g.tingkat])}</span><code class="sp-kode-g">${lolos(g.kode)}</code><span>${lolos(g.pesan)}</span></li>`).join("") : `<li class="sp-gerbang-kosong">${lolos(TANPA_HAMBATAN)}</li>`;
    if (st.vonis !== r.kata) { if (st.vonis != null) umum.textContent = `Vonis berubah menjadi ${r.kata}: ${r.alasan}`; st.vonis = r.kata; }
    q("[data-angka]").innerHTML = kartuAngka(h, st.nilai).map(a => `<div class="sp-angka${a.nada ? " " + lolos(a.nada) : ""}"><dt><span class="ad-ey">${lolos(a.label)}</span>${pil(a.yakin === "estimasi-model" ? "Estimasi model" : "Asumsi kebijakan", a.yakin)}</dt><dd><b>${lolos(a.nilai)}</b>${a.nada === "lewat" ? '<span class="sr"> melewati batas</span>' : ""}<small>${lolos(a.banding)}</small><small class="sp-sumber">${lolos(a.sumber)}</small></dd></div>`).join("");
    const pilI = pilIsian(st.nilai, h);
    semua("[data-pil]").forEach(e => { const p = pilI[e.dataset.pil]; e.hidden = !p; e.innerHTML = p ? pil(p.teks, p.kelas) : ""; });
    semua("[data-hanya]").forEach(e => { e.hidden = e.dataset.hanya !== st.nilai.bahan; });
    semua("[data-bila-kompleks]").forEach(e => { e.hidden = !st.nilai.kompleks; });
  }

  /* ----- grafik dan tautan: sesudah frame tercat (nanti), satu kali walau diketik cepat ----- */
  let terjadwal = false;
  const jadwalkanGrafik = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; gambarGrafik(); tulisQuery(); }); };
  function gambarGrafik() {
    if (sinyal.aborted || !st.h) return;
    q("#hx-g-tekanan").innerHTML = svgTekanan(st.h, st.nilai);
    q("#hx-g-headloss").innerHTML = svgHeadloss(st.nilai);
    q("[data-tabel-profil]").innerHTML = tabelProfil(st.h);
    q("#hx-sumber-hl").textContent = `Sumber: rumus Hazen-Williams pada debit ${tampil(st.nilai.q_lpm)} L/min dan C ${tampil(st.nilai.C)}; ID layflat ${desimal(KONST.layflat_id_rasio)} x DN, ID HDPE dari OD dan SDR${tampil(st.nilai.sdr)}; estimasi-model`;
  }
  function tulisQuery() {
    if (sinyal.aborted || location.pathname !== "/pipa/hitung") return;
    const u = new URL(location.href);
    KUNCI_QUERY.forEach(k => u.searchParams.delete(k));
    new URLSearchParams(keQuery(st.nilai)).forEach((v, k) => u.searchParams.append(k, v));
    history.replaceState(null, "", u);
  }

  /* ----- masukan: isian, pilihan, sakelar ----- */
  function tulisGalat(k) {
    const isi = q(`[data-k="${k}"]`), pesan = q(`#hx-${k}-g`);
    if (!isi || !pesan) return;
    const ada = st.galat[k];
    isi.setAttribute("aria-invalid", String(!!ada));
    pesan.hidden = !ada;
    pesan.innerHTML = ada ? `${ikon("circle-x")}<span>${lolos(ada)}</span>` : "";
    if (ada) isi.closest("details")?.setAttribute("open", "");
  }
  function saatMasukan(e) {
    const t = e.target.closest("[data-k]");
    if (!t) return;
    const k = t.dataset.k, r = terapkan({[k]: t.type === "checkbox" ? (t.checked ? "1" : "0") : t.value}, st.nilai);
    st.nilai = r.nilai;
    if (r.galat[k]) st.galat[k] = r.galat[k]; else delete st.galat[k];
    if (k === "liku" && st.kompleks && !r.galat.liku) {   // panjang mengikuti faktor liku selama kompleks terpasang
      const mk = masukanKompleks(st.kompleks, st.nilai.liku);
      if (mk.L_m != null) { st.nilai.L_m = mk.L_m; delete st.galat.L_m; q('[data-k="L_m"]').value = teksMasukan(mk.L_m); tulisGalat("L_m"); }
    }
    tulisGalat(k); perbarui(); jadwalkanGrafik();
  }
  function saatSeg(b) {
    const k = b.dataset.seg, m = MEDAN.find(x => x.k === k), opsi = m.opsi.find(([o]) => String(o) === b.dataset.v);
    b.parentElement.querySelectorAll("button").forEach(x => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.tabIndex = on ? 0 : -1; });
    st.nilai[k] = opsi[0];
    perbarui(); jadwalkanGrafik();
  }
  const form = q(".sp-hitung-form");
  form.addEventListener("input", saatMasukan, {signal: sinyal});
  form.addEventListener("submit", e => e.preventDefault(), {signal: sinyal});
  form.addEventListener("click", e => { const b = e.target.closest("[data-seg]"); if (b && b.getAttribute("aria-checked") !== "true") saatSeg(b); }, {signal: sinyal});
  form.addEventListener("keydown", e => {
    const b = e.target.closest("[data-seg]");
    if (!b || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    const bs = [...b.parentElement.querySelectorAll("button")], i = bs.indexOf(b), n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length];
    e.preventDefault(); n.focus(); saatSeg(n);
  }, {signal: sinyal});
  Object.keys(st.galat).forEach(tulisGalat);

  /* ----- aksi ----- */
  let jamInfo = 0;
  const kabari = t => { info.textContent = t; clearTimeout(jamInfo); jamInfo = setTimeout(() => { info.textContent = ""; }, 4000); };
  hentikan.push(() => clearTimeout(jamInfo));
  akar.addEventListener("click", async e => {
    const b = e.target.closest("[data-aksi]");
    if (!b || b.disabled) return;
    if (b.dataset.aksi === "salin") {
      tulisQuery();
      try { await navigator.clipboard.writeText(location.href); kabari("Tautan disalin. Semua masukan ikut di dalamnya."); }
      catch { kabari("Tautan sudah ada di bilah alamat. Salin dari sana."); }
    } else if (b.dataset.aksi === "ekspor" && st.h) {
      const blob = new Blob([JSON.stringify(eksporAcuan(st.nilai, st.h), null, 2)], {type: "application/json"}), u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = "acuan-hidraulika.json"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      kabari("Acuan diunduh. Tambahkan ke tests/sippa/fixtures/acuan.json sebagai kasus baru.");
    }
  }, {signal: sinyal});

  /* ----- kompleks dari Peta: bawaan L dan dz, kecuali yang sudah tertulis di tautan ----- */
  async function muatKompleks() {
    const slot = q("[data-kompleks]"), id = st.nilai.kompleks;
    if (!id) return;
    slot.replaceChildren(memuat());
    try {
      const d = await konteks.ambil("/api/sippa/data/kelayakan_kompleks", sinyal);
      if (sinyal.aborted) return;
      const k = (d.kompleks || []).find(x => x.id === id);
      if (!k) { slot.innerHTML = `<p class="ad-spanduk">Kompleks ${lolos(id)} tidak ada di data kelayakan. Kalkulator tetap bisa dipakai dengan masukan manual.</p>`; return; }
      st.kompleks = k;
      const mk = masukanKompleks(k, st.nilai.liku), yakin = d.kolom_keyakinan?.beda_air_m || "estimasi-model";
      const pakai = ["L_m", "dz_m"].filter(x => mk[x] != null && !awal.eksplisit.has(x));
      for (const x of pakai) st.nilai[x] = mk[x];
      if (pakai.includes("dz_m")) st.nilai.dz_sumber = "dsm";
      pakai.forEach(x => { const i = q(`[data-k="${x}"]`); i.value = teksMasukan(st.nilai[x]); });
      perbarui(); jadwalkanGrafik();
      slot.innerHTML = `<div class="ad-spanduk sp-kompleks"><b>Kompleks ${lolos(k.id)}${k.kab ? `, ${lolos(k.kab)}` : ""}.</b> Panjang trase ${lolos(tampil(st.nilai.liku))} x jarak air ${lolos(tampil(k.air_km_semua))} km ${pil("faktor liku: asumsi kebijakan", "asumsi-kebijakan")}; beda elevasi ${lolos(tampil(mk.dz_m))} m dari DSM ${pil(yakin, yakin)}${mk.dijepit.length ? ` Nilai dijepit ke batas rentang untuk: ${lolos(mk.dijepit.map(x => MEDAN.find(m => m.k === x).label).join(", "))}.` : ""} Ukur ulang di lapangan; kamu bisa mengubah keduanya.</div>`;
    } catch (e) {
      if (sinyal.aborted || e.name === "AbortError") return;
      slot.replaceChildren(galat(e.status ?? 0, e.status === 404 ? "Data kelayakan kompleks belum diunggah pipeline. Isi panjang trase dan beda elevasi sendiri." : e.message || "Data kompleks tidak bisa dimuat", muatKompleks));
    }
  }

  /* vonis menempel di bawah bilah konteks: tingginya diukur (bilah bisa membungkus di ponsel) */
  const ukurAtas = () => { const b = document.querySelector(".sp-konteks"); akar.style.setProperty("--sp-atas", `calc(var(--top) + ${b ? b.offsetHeight : 0}px)`); };
  ukurAtas(); addEventListener("resize", ukurAtas, {signal: sinyal});

  perbarui();
  jadwalkanGrafik();
  muatKompleks();   // tanpa await: kalkulator sudah hidup, kompleks mengisi menyusul
}
