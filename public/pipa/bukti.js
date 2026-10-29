/* SIPPA: bukti dan anggaran fase 3 (keputusan 61: SP-145 butir 41, 42, 43, 46, 47, 50). Fungsi murni tanpa DOM; pembangun HTML memakai global public/inti
   (fmt, esc, jamWIB). Tidak ada data di berkas ini. Semua ambang gerbang dibaca dari PRD §4.4 dan berlabel asumsi-kebijakan; hasil A/B lapangan berlabel hipotesis.
   Kata vonis hanya "lulus" bila data memenuhi ambang; gerbang yang butuh bukti di luar log, probe, dan A/B dinilai manual dan TIDAK PERNAH dinyatakan lulus di sini. */
import {bandingRerata, durasiLog, KONST} from "./hitung.js";
import {rekapKelas, AMBANG_G3} from "./layar_log.js";
import {tanggalHtml} from "./tanggal.js";

const tampil = n => typeof fmt === "function" ? fmt(n) : n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const h = s => typeof esc === "function" ? esc(s) : String(s);
const angka = x => typeof x === "number" && Number.isFinite(x);
const rata = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
const dummy = x => x && (x.dummy === 1 || x.dummy === true);
const WIB = 7 * 36e5;
const pil = (teks, kelas, judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${h(judul)}"` : ""}>${h(teks)}</span>`;
const rp = v => v == null ? "belum ditetapkan" : `Rp${tampil(Math.round(v))}`;

/* ---------- butir 41: A/B terisi dari data lapangan ---------- */
/* lengan petak: dari tabel petak A/B bila ada; selain itu dari huruf awal kode petak (L = lance, K = semprot konvensional) */
export function lenganPetak(petakId, petak = []) {
  const p = (petak || []).find(x => x.petak_id === petakId);
  if (p?.lengan) return p.lengan === "konvensional" ? "semprot" : String(p.lengan).startsWith("lance") ? "lance" : null;
  const m = /^([LK])(?![A-Za-z])/i.exec(String(petakId ?? ""));
  return m ? (m[1].toUpperCase() === "L" ? "lance" : "semprot") : null;
}
const TAHAP = ["sebelum", "sesudah", "24j"];
/* probe [{petak_id, tahap, suhu_c}], log [{petak_id}], petak [{petak_id, lengan}]. Penurunan = rata-rata sebelum dikurangi rata-rata besok (24 jam). */
export function abLapangan({probe = [], log = [], petak = []}) {
  const per = new Map();
  for (const p of probe || []) {
    if (dummy(p) || p.petak_id == null || !TAHAP.includes(p.tahap) || !angka(p.suhu_c)) continue;
    if (!per.has(p.petak_id)) per.set(p.petak_id, {sebelum: [], sesudah: [], "24j": []});
    per.get(p.petak_id)[p.tahap].push(p.suhu_c);
  }
  const sesi = new Map();
  for (const l of log || []) if (!dummy(l) && l.petak_id != null) sesi.set(l.petak_id, (sesi.get(l.petak_id) ?? 0) + 1);
  const baris = [...per].map(([id, t]) => {
    const sebelum = rata(t.sebelum), sesudah = rata(t.sesudah), besok = rata(t["24j"]);
    return {petak_id: id, lengan: lenganPetak(id, petak), sebelum, sesudah, besok, turun: sebelum != null && besok != null ? sebelum - besok : null, n: t.sebelum.length + t.sesudah.length + t["24j"].length, sesi: sesi.get(id) ?? 0};
  }).sort((a, b) => (a.petak_id < b.petak_id ? -1 : 1));
  const grup = k => { const r = baris.filter(b => b.lengan === k), t = r.map(b => b.turun).filter(angka);
    return {n_petak: r.length, n_turun: t.length, sebelum: rata(r.map(b => b.sebelum).filter(angka)), sesudah: rata(r.map(b => b.sesudah).filter(angka)), besok: rata(r.map(b => b.besok).filter(angka)), turun: t}; };
  const lance = grup("lance"), semprot = grup("semprot");
  /* selisih > 0: petak lance turun lebih banyak daripada semprot */
  const banding = bandingRerata(lance.turun, semprot.turun);
  return {petak: baris, lance, semprot, banding, tanpa_lengan: baris.filter(b => b.lengan == null).length, keyakinan: "hipotesis"};
}
export function abLapanganHtml(r, per = null) {
  if (!r.petak.length) return `<p class="ad-kosong">Belum ada pengukuran suhu tanah dari lapangan untuk dibandingkan. Probe diisi regu lewat form lapangan.</p>`;
  const kolom = ["Petak", "Lengan", "Sebelum", "Sesudah", "Besok", "Turun"];
  const nama = { lance: "Lance (L)", semprot: "Semprot (K)" };
  const isi = r.petak.map(b => `<tr><td data-label="Petak">${h(b.petak_id)}</td><td data-label="Lengan">${h(nama[b.lengan] ?? "belum dikenali")}</td>`
    + ["sebelum", "sesudah", "besok", "turun"].map(k => `<td class="n" data-label="${k}">${b[k] == null ? "–" : h(tampil(b[k])) + " °C"}</td>`).join("") + `</tr>`).join("");
  const b = r.banding, ci = b && b.ci ? `${tampil(b.ci[0])} sampai ${tampil(b.ci[1])} °C` : null;
  const kalimat = !b ? `Perbandingan belum bisa dihitung: butuh sedikitnya 2 petak lance dan 2 petak semprot yang punya suhu sebelum dan besok (sekarang ${tampil(r.lance.n_turun)} dan ${tampil(r.semprot.n_turun)}).`
    : `Petak lance turun ${tampil(Math.round(b.rerata_a * 10) / 10)} °C dalam sehari, petak semprot ${tampil(Math.round(b.rerata_b * 10) / 10)} °C; selisih ${tampil(Math.round(b.selisih * 10) / 10)} °C, selang kepercayaan 95% ${ci}. ${b.belum_bisa_diputus ? `Petak kurang dari ${tampil(KONST.n_min_putus)} per lengan, belum bisa diputus.` : ""}`;
  return `<p class="sp-pil-baris">${pil("hipotesis", "hipotesis", "Dari probe lapangan; belum ditinjau evaluator independen")}</p><p>${h(kalimat)}</p>`
    + `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Suhu tanah per petak, lance lawan semprot</caption><thead><tr>${kolom.map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${isi}</tbody></table></div>`
    + `<p class="ad-catat sp-sumber">Sumber: probe suhu tanah dan log form lapangan, rata-rata semua kedalaman${per == null ? "" : `, per ${h(typeof jamWIB === "function" ? jamWIB(per) : "–")}`}.${r.tanpa_lengan ? ` ${h(tampil(r.tanpa_lengan))} petak belum dikenali lengannya (kode petak diawali L atau K).` : ""}</p>`;
}

/* ---------- butir 42: gerbang G0 sampai G5 dihitung ulang dari data ---------- */
const hariUnik = log => new Set(log.filter(l => l.jenis === "karhutla" && angka(l.t_tiba)).map(l => new Date(l.t_tiba + WIB).toISOString().slice(0, 10))).size;
export const HARI_API_G5 = 30;
/* ab = keluaran ringkasAb (layar_ab) atau null. Mengembalikan 6 gerbang: {kode, nama, status: lulus|gagal|menunggu|manual, ringkas, rinci[]}. */
export function hitungGerbang({log = [], probe = [], ab = null} = {}) {
  log = (log || []).filter(l => !dummy(l)); probe = (probe || []).filter(p => !dummy(p));
  const g = [];
  const manual = (kode, nama, alasan) => g.push({kode, nama, status: "manual", ringkas: alasan, rinci: []});
  manual("G0", "Lokasi dan izin", "Persetujuan pemegang hak dan izin air dicatat di luar log, probe, dan A/B; dinilai manual oleh evaluator.");
  manual("G1", "Air", "Debit kemarau, piezometer, dan izin air dari survei tapak; dinilai manual oleh evaluator.");
  manual("G2", "Bench", "Kurva Q-H, head loss, dan uji bocor dari uji bangku; dinilai manual oleh evaluator.");
  /* G3: tiap kelas medan paling sedikit 5 ulangan, p50 dan p90 tiba sampai air mengalir di bawah ambang */
  const rekap = rekapKelas(log), rinci = ["I", "II", "III"].map(k => {
    const r = rekap[k], a = AMBANG_G3[k], cukup = r.n >= KONST.n_kecil, lulus = cukup && r.p50 <= a.p50 && r.p90 <= a.p90;
    return {kelas: k, n: r.n, p50: r.p50, p90: r.p90, ambang: a, status: !cukup ? "menunggu" : lulus ? "lulus" : "gagal"};
  });
  const gagal3 = rinci.filter(r => r.status === "gagal"), lulus3 = rinci.filter(r => r.status === "lulus");
  g.push({kode: "G3", nama: "Waktu gelar", status: gagal3.length ? "gagal" : lulus3.length === 3 ? "lulus" : "menunggu",
    ringkas: gagal3.length ? `Kelas ${gagal3.map(r => r.kelas).join(", ")} melewati ambang p50 atau p90.` : lulus3.length === 3 ? "Ketiga kelas medan di bawah ambang p50 dan p90." : `Kelas yang punya ${tampil(KONST.n_kecil)} ulangan atau lebih: ${tampil(rinci.filter(r => r.n >= KONST.n_kecil).length)} dari 3.`, rinci});
  /* G4: vonis G4 lengan lance terhadap konvensional (hitung.js vonisG4); data pilot tidak pernah divonis */
  const lance = ab?.lengan?.find(l => l.kunci === "lance"), v = lance?.g4?.vonis ?? null;
  g.push({kode: "G4", nama: "Efikasi", status: v === "LULUS" ? "lulus" : v === "TIDAK LULUS" ? "gagal" : "menunggu",
    ringkas: v === "LULUS" ? "Lance memberi hasil lebih baik dengan selang kepercayaan di atas nol dan biaya wajar." : v === "TIDAK LULUS" ? (lance.g4.alasan || []).join("; ") || "Lance tidak memenuhi ambang efikasi atau biaya."
      : lance?.g4?.pilot ? "Data masih pilot, n kecil; tidak dipakai untuk vonis G4." : "Belum ada cukup petak A/B untuk memutuskan.", rinci: []});
  /* G5: G4 lulus, ditinjau evaluator independen, dan paling sedikit 30 hari api aktif tercatat di log karhutla */
  const hari = hariUnik(log), evaluator = lance?.keyakinan === "ditinjau-evaluator", g4 = g.find(x => x.kode === "G4").status;
  g.push({kode: "G5", nama: "Skala", status: g4 === "gagal" ? "gagal" : g4 === "lulus" && evaluator && hari >= HARI_API_G5 ? "lulus" : "menunggu",
    ringkas: g4 === "gagal" ? "G4 tidak lulus." : `G4 ${g4 === "lulus" ? "lulus" : "belum lulus"}; ${evaluator ? "sudah" : "belum"} ditinjau evaluator independen; ${tampil(hari)} dari ${tampil(HARI_API_G5)} hari api aktif tercatat.`,
    rinci: [{hari_api: hari, evaluator}]});
  return g;
}
export const labelGerbang = {lulus: "Lulus dengan data", gagal: "Belum memenuhi ambang", menunggu: "Menunggu data", manual: "Dinilai manual"};

/* ---------- butir 43: kartu untuk pimpinan. Tanpa kata vonis berlebihan: "lulus" hanya bila status lulus. ---------- */
export function kartuGerbangHtml(gerbang, per = null) {
  const lulus = gerbang.filter(x => x.status === "lulus"), belum = gerbang.filter(x => x.status !== "lulus");
  const li = x => `<li><b>${h(x.kode)} ${h(x.nama)}</b>${pil(labelGerbang[x.status], x.status === "lulus" ? "terverifikasi" : "asumsi-kebijakan", "Ambang gerbang PRD §4.4 ditetapkan sebagai asumsi kebijakan")}<small>${h(x.ringkas)}</small></li>`;
  const judul = lulus.length ? `${tampil(lulus.length)} dari ${tampil(gerbang.length)} gerbang lulus dengan data` : `Belum ada gerbang yang lulus dengan data`;
  return `<p class="sp-siap-judul"><b class="num">${h(judul)}</b></p>`
    + `<h3 class="sp-sub">Sudah lulus</h3>${lulus.length ? `<ul class="sp-siap">${lulus.map(li).join("")}</ul>` : `<p class="ad-kosong">Belum ada.</p>`}`
    + `<h3 class="sp-sub">Belum</h3><ul class="sp-siap">${belum.map(li).join("")}</ul>`
    + `<p class="ad-catat sp-sumber">Dihitung ulang dari log, probe, dan A/B tiap layar dibuka${per == null ? "" : `, per ${h(typeof jamWIB === "function" ? jamWIB(per) : "–")}`}. Hasil A/B berstatus hipotesis sampai evaluator independen menandatangani.</p>`;
}

/* ---------- butir 46: laporan mingguan. minggu = YYYY-Www (ISO 8601); rentang Senin sampai Minggu dalam tanggal WIB ---------- */
export function rentangMinggu(minggu) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(minggu ?? ""));
  if (!m) return null;
  const tahun = Number(m[1]), w = Number(m[2]);
  if (w < 1 || w > 53) return null;
  const jan4 = Date.UTC(tahun, 0, 4), dow = new Date(jan4).getUTCDay() || 7, senin = jan4 - (dow - 1) * 864e5 + (w - 1) * 7 * 864e5;
  if (new Date(senin + 3 * 864e5).getUTCFullYear() !== tahun) return null;   // minggu 53 hanya ada di tahun yang memilikinya
  const f = ms => new Date(ms).toISOString().slice(0, 10);
  return {dari: f(senin), sampai: f(senin + 6 * 864e5)};
}
/* tautan dari Meja Pantau: ?jenis=mingguan&minggu=2026-W44 atau hanya ?minggu=. Tidak sah = null (layar memakai nilai awalnya). */
export function awalLaporan(search) {
  const q = new URLSearchParams(search || ""), minggu = q.get("minggu"), r = minggu ? rentangMinggu(minggu) : null;
  if (!r) return null;
  return {jenis: q.get("jenis") === "mingguan" || !q.get("jenis") ? "mingguan" : q.get("jenis"), ...r, minggu};
}

/* ---------- butir 47: selang pendek lawan panjang dari log ---------- */
export const BATAS_SELANG_M = 500;   // asumsi kebijakan: selang 500 m = tingkat respons 1 (PRD §5.4); lebih dari itu dihitung panjang
export function bandingSelang(log) {
  const sah = (log || []).filter(l => !dummy(l) && angka(l.panjang_m) && l.panjang_m > 0), tiba = l => durasiLog(l).tiba_air;
  const kel = f => { const r = sah.filter(f), t = r.map(tiba).filter(angka); return {n: t.length, rerata: rata(t), laju: rata(r.map(l => durasiLog(l).laju_m_jam).filter(angka)), tiba: t}; };
  const pendek = kel(l => l.panjang_m <= BATAS_SELANG_M), panjang = kel(l => l.panjang_m > BATAS_SELANG_M);
  /* selisih > 0: selang panjang lebih lama sampai air mengalir */
  return {pendek, panjang, banding: bandingRerata(panjang.tiba, pendek.tiba), batas_m: BATAS_SELANG_M};
}
export function selangHtml(r) {
  if (!r.pendek.n && !r.panjang.n) return `<p class="ad-kosong">Belum ada sesi dengan panjang selang dan waktu air mengalir untuk dibandingkan.</p>`;
  const sat = x => x.n ? `${tampil(Math.round(x.rerata * 10) / 10)} jam dari ${tampil(x.n)} sesi${x.laju != null ? `, laju gelar ${tampil(Math.round(x.laju))} m per jam` : ""}` : "belum ada sesi";
  const b = r.banding;
  const k = !b ? "Perbandingan belum bisa dihitung: butuh sedikitnya 2 sesi di tiap kelompok." : `Selang panjang ${b.selisih >= 0 ? "lebih lama" : "lebih cepat"} ${tampil(Math.round(Math.abs(b.selisih) * 10) / 10)} jam; selang kepercayaan 95% ${tampil(Math.round(b.ci[0] * 10) / 10)} sampai ${tampil(Math.round(b.ci[1] * 10) / 10)} jam.${b.belum_bisa_diputus ? ` Sesi kurang dari ${tampil(KONST.n_min_putus)} per kelompok, belum bisa diputus.` : ""}`;
  return `<p class="sp-pil-baris">${pil("hipotesis", "hipotesis", "Dari log lapangan; ambang pemisah selang pendek dan panjang adalah asumsi kebijakan")}</p>`
    + `<dl class="sp-dl"><div><dt>Selang pendek (${h(tampil(r.batas_m))} m atau kurang)</dt><dd>${h(sat(r.pendek))}</dd></div><div><dt>Selang panjang (lebih dari ${h(tampil(r.batas_m))} m)</dt><dd>${h(sat(r.panjang))}</dd></div></dl><p>${h(k)}</p>`
    + `<p class="ad-catat sp-sumber">Sumber: log form lapangan, tiba sampai air mengalir.</p>`;
}

/* ---------- butir 50: anggaran T0 sampai T4 terkunci gerbang ---------- */
/* server memegang sisa (staf berwilayah selalu null: realisasinya hanya sebagian dari nasional); hitung sendiri hanya bila server tidak mengirim bidangnya */
export const sisaRp = t => t.sisa_rp !== undefined ? t.sisa_rp : t.pagu_rp == null ? null : t.pagu_rp - (t.realisasi_rp ?? 0);
const teksSisa = t => t.pagu_rp == null ? "belum ditetapkan" : sisaRp(t) == null ? "sisa nasional tidak terlihat dari wilayah" : `Rp${tampil(Math.round(sisaRp(t)))}`;
const TGL_SAH = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
export function cekRealisasi(f, tingkat = []) {
  const g = [], tolak = (medan, alasan) => g.push({medan, alasan});
  const t = (tingkat || []).find(x => x.tingkat === f.tingkat);
  if (!t) tolak("tingkat", "Pilih tingkat anggaran dari daftar.");
  else if (t.status === "terkunci") tolak("tingkat", `Tingkat ${t.tingkat} masih terkunci sampai ${t.gerbang_pembuka ?? "gerbangnya"} lulus. Pilih tingkat yang terbuka.`);
  const u = String(f.uraian ?? "").trim();
  if (u.length < 3 || u.length > 200) tolak("uraian", "Uraian harus 3 sampai 200 huruf. Tulis apa yang dibeli atau dibayar.");
  const nominal = Number(String(f.rp ?? "").trim().replace(/\./g, "").replace(",", "."));
  if (!Number.isInteger(nominal) || nominal < 1 || nominal > 1e12) tolak("rp", "Jumlah harus rupiah bulat 1 sampai 1 triliun. Tulis angka tanpa titik atau koma.");
  else if (t && t.status !== "terkunci" && sisaRp(t) != null && nominal > sisaRp(t)) tolak("rp", `Jumlah melebihi sisa dana ${rp(sisaRp(t))}. Kurangi jumlahnya.`);
  if (!TGL_SAH(String(f.tanggal ?? ""))) tolak("tanggal", "Tanggal harus sah, bentuk tahun-bulan-hari.");
  if (f.prov != null && String(f.prov).trim() !== "" && !/^\d{2}$/.test(String(f.prov).trim())) tolak("prov", "Kode provinsi harus 2 angka, misalnya 62. Perbaiki atau kosongkan.");
  if (f.bukti != null && String(f.bukti).trim().length > 300) tolak("bukti", "Bukti paling banyak 300 huruf. Persingkat atau tulis nomor dokumennya saja.");
  return g;
}
export function badanRealisasi(f) {
  const b = {tingkat: f.tingkat, uraian: String(f.uraian).trim(), rp: Number(String(f.rp).trim().replace(/\./g, "").replace(",", ".")), tanggal: f.tanggal};
  if (f.bukti != null && String(f.bukti).trim()) b.bukti = String(f.bukti).trim();
  if (f.prov != null && String(f.prov).trim()) b.prov = String(f.prov).trim();
  return b;
}
export function cekBuka(f) {
  const g = [];
  if (!f.tingkat) g.push({medan: "tingkat", alasan: "Pilih tingkat yang dibuka."});
  const b = String(f.gerbang_bukti ?? "").trim();
  if (b.length < 5 || b.length > 500) g.push({medan: "gerbang_bukti", alasan: "Bukti gerbang harus 5 sampai 500 huruf. Tulis berkas atau keputusan yang menyatakan gerbang lulus."});
  return g;
}
export const badanBuka = f => ({tingkat: f.tingkat, gerbang_bukti: String(f.gerbang_bukti).trim()});
export function anggaranHtml(d, peran, per = null) {
  const tingkat = d?.tingkat || [], tulis = peran === "W" || peran === "M", admin = peran === "M";
  if (!tingkat.length) return `<p class="ad-kosong">Belum ada tingkat anggaran dari server.</p>`;
  const baris = tingkat.map(t => { const kunci = t.status === "terkunci";
    return `<tr><td data-label="Tingkat"><b>${h(t.tingkat)}</b> ${h(t.nama ?? "")}</td><td data-label="Gerbang pembuka">${h(t.gerbang_pembuka ?? "–")}</td>`
      + `<td data-label="Status"><span class="sp-status ${kunci ? "hilang" : "gelar"}">${kunci ? "Terkunci" : "Terbuka"}</span></td>`
      + `<td class="n" data-label="Pagu">${h(rp(t.pagu_rp))}</td><td class="n" data-label="Realisasi">${h(`Rp${tampil(Math.round(t.realisasi_rp ?? 0))}`)}</td><td class="n" data-label="Sisa">${h(teksSisa(t))}</td>`
      + `<td data-label="Aksi">${kunci && admin ? `<button type="button" class="ad-tombol" data-buka-anggaran="${h(t.tingkat)}">Buka gembok</button>` : ""}</td></tr>`; }).join("");
  const real = (d.realisasi || []).slice(0, 20).map(r => `<tr><td data-label="Tanggal">${h(r.tanggal)}</td><td data-label="Tingkat">${h(r.tingkat)}${r.prov ? `, ${h(r.prov)}` : ""}</td><td data-label="Uraian">${h(r.uraian)}</td><td class="n" data-label="Jumlah">${h(`Rp${tampil(Math.round(r.rp))}`)}</td><td data-label="Bukti">${h(r.bukti ?? "–")}</td></tr>`).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Anggaran per tingkat</caption><thead><tr>${["Tingkat", "Gerbang pembuka", "Status", "Pagu", "Realisasi", "Sisa", ""].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris}</tbody></table></div>`
    + (tulis ? `<div class="sp-aksi"><button type="button" class="ad-tombol" data-realisasi>Catat realisasi</button></div>` : `<p class="ad-catat">Mencatat realisasi butuh peran tulis.</p>`)
    + (real ? `<h3 class="sp-sub">Realisasi terakhir</h3><div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Realisasi anggaran</caption><thead><tr>${["Tanggal", "Tingkat", "Uraian", "Jumlah", "Bukti"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${real}</tbody></table></div>` : "")
    + `<p class="ad-catat sp-sumber">Sumber: SIPPA D1 (anggaran), per ${per == null ? "–" : h(typeof jamWIB === "function" ? jamWIB(per) : "–")}. Tingkat terbuka setelah gerbang pembukanya lulus dengan data. ${pil("asumsi-kebijakan", "asumsi-kebijakan", "Pagu dan gerbang pembuka ditetapkan sebagai asumsi kebijakan")}</p>`;
}
export function formRealisasiHtml(tingkat, hariIni = "") {
  const buka = (tingkat || []).filter(t => t.status !== "terkunci");
  return `<form class="sp-form" novalidate><label>Tingkat<select name="tingkat">${buka.map(t => `<option value="${h(t.tingkat)}">${h(t.tingkat)} ${h(t.nama ?? "")}</option>`).join("")}</select></label>`
    + `<label>Uraian<input name="uraian" maxlength="200" autocomplete="off"></label><label>Jumlah, rupiah<input name="rp" inputmode="numeric" autocomplete="off"></label>`
    + `<label>Tanggal${tanggalHtml({nama: "tanggal", label: "Tanggal", nilai: hariIni})}</label><label>Kode provinsi, wajib bila wilayahmu lebih dari satu<input name="prov" maxlength="2" inputmode="numeric" autocomplete="off"></label><label>Bukti, boleh kosong<input name="bukti" maxlength="300" autocomplete="off"></label>`
    + `<div class="sp-galat-slot" role="alert"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama">Simpan realisasi</button></div></form>`;
}
