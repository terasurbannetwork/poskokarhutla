/* Layar /karbon (pribadi, di balik adminOK): tab, Ringkasan, Metode, dan pemuatan awal. Kontrak: docs/karbon/RANCANGAN.md §6.
   ?contoh=1 memakai public/karbon/contoh.json (data sintetis) tanpa worker. */
import * as AK from "./akuntansi.js";
import {S, h, ganti, ang, T, pct, tgl, selisihHari, judul, pil, kpi, kosong, tabel, tombol, nanti, kabar, api, CONTOH} from "./alat.js";
import {TAHAP, TAHAP_KS, LABEL_ASUMSI, label, statDari, proyeksi, potensi as potensiP, sumberGfw, infoGfw} from "./ranah.js";
import * as Saring from "./saring.js";
import * as Proyek from "./proyek.js";
import * as Keuangan from "./keuangan.js";
import {muatKelola, renderPemantauan, renderKesepakatan, renderBuku} from "./kelola.js";

const TAB = {
  ringkasan: ["Ringkasan", ringkasan], saring: ["Penyaringan", p => Saring.render(p)], proyek: ["Proyek", (p, id) => Proyek.render(p, id)],
  pantau: ["Pemantauan", renderPemantauan], sepakat: ["Kesepakatan", renderKesepakatan], buku: ["Buku unit", renderBuku],
  keuangan: ["Keuangan", p => Keuangan.render(p)], metode: ["Metode", metode],
};
const nav = document.getElementById("kbTab"), main = document.getElementById("kbIsi");
const panel = {};
for (const [k, [t]] of Object.entries(TAB)) {
  nav.append(h("button", {type: "button", role: "tab", id: "t-" + k, "aria-controls": "p-" + k, "aria-selected": "false", tabindex: "-1", data: {t: k}, onclick: () => { location.hash = "#" + k; }}, t));
  main.append(panel[k] = h("section", {class: "kb-p", id: "p-" + k, role: "tabpanel", "aria-labelledby": "t-" + k, hidden: true}));
}
/* panah kiri/kanan, Home/End: pindah tab (pola tablist WAI-ARIA, aktivasi otomatis) */
nav.addEventListener("keydown", e => {
  const B = [...nav.children], i = B.indexOf(document.activeElement); if (i < 0) return;
  const j = {ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: B.length - 1}[e.key]; if (j == null) return;
  e.preventDefault(); const b = B[(j + B.length) % B.length]; b.focus(); location.hash = "#" + b.dataset.t;
});
let siap = false;
function buka() {
  const [k0, id] = location.hash.slice(1).split("/"), k = TAB[k0] ? k0 : "ringkasan";
  for (const b of nav.children) { const on = b.dataset.t === k; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; }
  for (const [x, el] of Object.entries(panel)) el.hidden = x !== k;
  if (siap) nanti(() => Promise.resolve(TAB[k][1](panel[k], id && decodeURIComponent(id))).catch(e => { console.error(e); ganti(panel[k], kosong("Bagian ini gagal digambar: " + e.message)); }));
}
addEventListener("hashchange", buka);
document.getElementById("tema")?.addEventListener("click", () => { const d = document.documentElement, t = d.dataset.theme === "dark" ? "light" : "dark"; d.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} });

/* ---------- Ringkasan ---------- */
function ringkasan(p) {
  const aktif = S.proyek.filter(x => x.tahap !== "hentikan"), iStudi = TAHAP.findIndex(t => t[0] === "studi");
  const dipantau = aktif.filter(x => TAHAP.findIndex(t => t[0] === x.tahap) >= iStudi);
  let potensi = 0;
  for (const x of aktif) { const st = statDari(x); if (!st) continue; const pr = proyeksi(st, AK.gabungAsumsi(typeof x.asumsi === "string" ? JSON.parse(x.asumsi) : x.asumsi || {})); if (!pr.galat) potensi += potensiP(pr); }
  const saldo = S.buku.saldo.reduce((s, x) => s + (+x.saldo || 0), 0), tersedia = S.buku.saldo.reduce((s, x) => s + (+x.tersedia || 0), 0);
  const terbuka = S.kesepakatan.filter(k => !["selesai", "batal"].includes(k.tahap)), pipeline = terbuka.reduce((s, k) => s + (+k.nilai_usd || 0), 0);
  const jatuh = terbuka.filter(k => k.tenggat && selisihHari(k.tenggat) <= 14).sort((a, b) => a.tenggat.localeCompare(b.tenggat));
  const per = TAHAP.map(([t, nm]) => ({nm, t, L: S.proyek.filter(x => x.tahap === t)})).filter(r => r.L.length);
  const nmPihak = id => S.pihak.find(x => x.id === id)?.nama ?? "–", nmProyek = id => S.proyek.find(x => x.id === id)?.nama ?? "–";
  ganti(p,
    judul("Ringkasan", "Keadaan portofolio karbon hari ini."),
    h("div", {class: "kb-kpis"},
      kpi("Proyek aktif", ang(aktif.length)), kpi("Luas dipantau", ang(dipantau.reduce((s, x) => s + (+x.luas_ha || 0), 0)), "ha"),
      kpi("Potensi estimasi kredit", ang(potensi), `${T}/th`), kpi(`Saldo unit (catatan internal, ${T})`, ang(saldo)), kpi(`Unit tersedia (catatan internal, ${T})`, ang(tersedia)),
      kpi("Nilai kesepakatan terbuka", ang(pipeline), "USD"), kpi("Peringatan baru", ang(S.peringatan.filter(x => x.status === "baru").length))),
    h("div", {class: "grid g2"},
      h("section", null, h("h3", null, "Proyek per tahap"), per.length ? tabel([{t: "Tahap", f: r => pil(r.nm, "t-" + r.t)}, {t: "Proyek", n: 1, f: r => ang(r.L.length)},
        {t: "Luas (ha)", n: 1, f: r => ang(r.L.reduce((s, x) => s + (+x.luas_ha || 0), 0))}], per, {klik: () => { location.hash = "#proyek"; }}) : kosong("Belum ada proyek.")),
      h("section", null, h("h3", null, "Tindakan 14 hari ke depan"), jatuh.length ? tabel([
        {t: "Tenggat", f: k => tgl(k.tenggat)}, {t: "Status", f: k => { const d = selisihHari(k.tenggat); return pil(d < 0 ? "Lewat" : d === 0 ? "Hari ini" : "Segera", d < 0 ? "lewat" : "dekat"); }},
        {t: "Sisa (hari)", n: 1, f: k => ang(selisihHari(k.tenggat))},
        {t: "Pihak", kelas: "kb-nama", f: k => nmPihak(k.pihak_id)}, {t: "Langkah berikut", kelas: "kb-nama", f: k => k.langkah_berikut || "–"},
        {t: "Tahap", f: k => label(TAHAP_KS, k.tahap)}], jatuh, {klik: () => { location.hash = "#sepakat"; }}) : kosong("Tidak ada tenggat dalam 14 hari."))),
    S.peringatan.some(x => x.status === "baru") ? h("section", {class: "kb-bag"}, h("h3", null, "Peringatan baru terbaru"),
      tabel([{t: "Tanggal", f: x => tgl(x.tanggal)}, {t: "Proyek", kelas: "kb-nama", f: x => nmProyek(x.proyek_id)}, {t: "Luas (ha)", n: 1, f: x => x.luas_ha == null ? "–" : ang(x.luas_ha, 1)},
        {t: "Keyakinan", f: x => x.keyakinan || "–"}], S.peringatan.filter(x => x.status === "baru").sort((a, b) => String(b.tanggal).localeCompare(a.tanggal)).slice(0, 8), {klik: () => { location.hash = "#pantau"; }})) : null,
    aktif.some(x => x.stat_diambil) ? h("p", {class: "kb-cat"}, sumberGfw(aktif)) : null);
}

/* ---------- Metode ---------- */
const {AMBANG: AB, ASUMSI_BAWAAN: BW, BATAS_HARGA, UJI_BALIK: UJ} = AK, pc = (v, d = 0) => pct(v, d);
const RUMUS = () => [
  ["Hutan dan laju kehilangan", `hutan tahun t = hutan 2000 − jumlah kehilangan 2001..t
kehilangan baseline = hanya pendorong yang bisa dicegah (bawaan: pertanian, tambang, ladang, permukiman);
  penebangan, kebakaran, dan gangguan alam tidak dihitung
laju = jumlah kehilangan baseline periode acuan ÷ jumlah hutan awal tiap tahun periode acuan
faktor emisi (GFW) = jumlah emisi GFW periode acuan ÷ jumlah kehilangan periode acuan
  bila kehilangan baseline < ${ang(AB.hilang_min_teramati_ha)} ha: (stok atas + bawah tanah per ha hutan) × 44/12`],
  ["Faktor emisi FRL nasional", `emisi per ha = (biomassa kelas hutan − biomassa kelas tujuan) × ${ang(S.frl?.fraksi_karbon, 2)} × 44/12
kelas hutan = rata-rata tertimbang tutupan 2017; kelas tujuan = dari pendorong kehilangan
gambut yang dibuka terus beremisi: luas gambut terbuka kumulatif × faktor dekomposisi per tahun`],
  ["Estimasi kredit per tahun, urutan potongan tetap", `hilang baseline k = hutan k−1 × laju        (cara tren: garis lurus ha/th, tidak di bawah 0)
emisi baseline = hilang × faktor emisi
reduksi = emisi baseline × efektivitas
bruto = reduksi − reduksi × kebocoran
setelah ketidakpastian = bruto − bruto × ketidakpastian
buffer = setelah ketidakpastian × buffer   (bawaan ${pc(AB.buffer_lantai)} + ${pc(AB.buffer_per_kelas)} × kelas risiko api)
bagian negara = (setelah ketidakpastian − buffer) × bagian negara
estimasi kredit = setelah ketidakpastian − buffer − bagian negara   (satuan ${T})
masa baseline (bawaan ${BW.masa_baseline_th} th): kredit sesudahnya hanya sah bila baseline dinilai ulang`],
  ["Keuangan (USD per tahun kalender)", `pendapatan = estimasi kredit terbit × porsi terjual × harga × (1 + kenaikan)^(tahun − tahun mulai)
biaya = biaya awal (dibagi dua tahun pertama) + biaya tetap + biaya per ${T} + verifikasi tiap N tahun
        + PNBP × pendapatan + bagi hasil × laba operasi + dana komunitas × pendapatan
pajak = PPh × laba bila positif;  arus kas = pendapatan − biaya − pajak
NPV = Σ arus kas ÷ (1 + diskonto)^i;  IRR = diskonto yang membuat NPV = 0 (tidak ada bila arus kas tak berganti tanda)
harga impas = harga yang membuat NPV = 0 (dicari sampai ${ang(BATAS_HARGA)} USD/${T})`],
  ["Penilaian penyaringan", `potensi estimasi kredit = rata-rata kredit tahunan di dalam masa baseline
layak = luas ≥ ${ang(AB.luas_min_ha)} ha, hutan tersisa ≥ ${pc(AB.hutan_sisa_min)} luas, NPV > 0
jalur Verra terbuka bila gambut ≤ ${pc(AB.gambut_maks)} luas (VMD0055 v1.1 tidak berlaku di atasnya)`],
  ["Uji balik baseline", `ramal kehilangan ${UJ.uji.join("–")} dari laju ${UJ.latih.join("–")}, dibandingkan dengan kehilangan teramati
rasio = ramalan ÷ aktual; 1 = tepat, di atas 1 = baseline terlalu tinggi`],
];
const ISTILAH = [
  ["Vintage", "tahun terjadinya pengurangan emisi yang diklaim sebuah unit."],
  ["PNBP", "Penerimaan Negara Bukan Pajak: pungutan negara atas pendapatan karbon."],
  ["VVB", "Validation/Verification Body: lembaga pihak ketiga yang memvalidasi dan memverifikasi proyek."],
  ["IFM", "Improved Forest Management: pengelolaan hutan yang mengurangi tebangan atau emisinya."],
  ["MRV", "pengukuran, pelaporan, dan verifikasi emisi."],
  ["Buffer", "porsi kredit yang ditahan sebagai cadangan bila karbon hilang lagi (misalnya terbakar)."],
  ["Baseline", "perkiraan emisi seandainya proyek tidak ada."],
];
const PEND = {"1": "pertanian menetap", "2": "tambang", "3": "ladang berpindah", "4": "penebangan", "5": "kebakaran", "6": "permukiman dan infrastruktur", "7": "gangguan alam lain"};
const PERSEN_BW = new Set(["efektivitas", "kebocoran", "ketidakpastian", "bagian_negara", "porsi_terjual", "eskalasi", "pnbp", "bagi_hasil_pemegang", "dana_komunitas", "pph", "diskonto"]);
/* nilai bawaan sebagai teks per baris; satuan ada di label kolom Asumsi */
const fmtNilai = (k, v) => v == null ? "otomatis dari risiko api" : k === "periode_acuan" ? v.join("–") : k === "pendorong_baseline" ? v.map(x => PEND[x] ?? x).join(", ")
  : k === "metode" ? (v === "tren" ? "Tren garis lurus" : "Laju rata-rata") : k === "ef_metode" ? (v === "frl" ? "FRL nasional" : "GFW teramati")
  : PERSEN_BW.has(k) ? pct(v, 0) : typeof v === "number" ? ang(v, Number.isInteger(v) ? 0 : 2) : String(v);
function metode(p) {
  const ub = h("div");
  const hitungUji = () => {
    const B = S.saring?.baris || [], r = [], U = AK.UJI_BALIK;
    for (const x of B) { try { const u = AK.ujiBalik(statDari(x)); if (u.rasio != null) r.push(u.rasio); } catch {} }
    if (!r.length) return ganti(ub, kosong(S.saringGalat?.status === 404 ? "Data penyaringan belum diunggah, jadi uji balik belum bisa dihitung." : `Tidak ada konsesi dengan kehilangan hutan ${U.uji.join("–")} untuk diuji.`));
    r.sort((a, b) => a - b); const q = f => r[Math.floor(f * (r.length - 1))], x1 = v => ang(v, 1) + "×";
    ganti(ub, h("div", {class: "kb-kpis"}, kpi("Konsesi diuji", ang(r.length)), kpi("Median ramalan ÷ aktual", x1(q(.5))), kpi("Kuartil bawah", x1(q(.25))), kpi("Kuartil atas", x1(q(.75))),
      kpi(`Meleset > ${AB.meleset_lipat} kali lipat`, pct(r.filter(x => x > AB.meleset_lipat || x < 1 / AB.meleset_lipat).length / r.length, 0))));
  };
  ganti(ub, S.saring || S.saringGalat ? "" : tombol("Hitung uji balik dari data penyaringan", async e => { e.target.disabled = true; e.target.textContent = "Memuat…"; await Saring.muatSaring(); hitungUji(); }));
  if (S.saring || S.saringGalat) hitungUji();
  const d = infoGfw(S.saring?.baris?.length ? S.saring.baris : S.proyek), akhir = d.akhir;
  ganti(p,
    judul("Metode", "Cara angka di layar ini dihitung, dari mana datanya, dan batasnya."),
    h("section", {class: "kb-bag"}, h("h3", null, "Cara hitung"), RUMUS().map(([j, r]) => h("div", {class: "kb-rumus"}, h("h4", null, j), h("pre", {class: "rumus"}, r)))),
    h("section", {class: "kb-bag"}, h("h3", null, "Asumsi bawaan"), tabel([
      {t: "Asumsi", f: ([k]) => LABEL_ASUMSI[k] ?? k}, {t: "Bawaan", f: ([k]) => fmtNilai(k, AK.ASUMSI_BAWAAN[k])},
      {t: "Penjelasan", kelas: "kb-teks", f: ([, v]) => v.teks}, {t: "Sumber", kelas: "kb-teks", f: ([, v]) => v.sumber},
      {t: "Status", f: ([, v]) => pil(v.status === "HIPOTESIS" ? "Hipotesis" : "Bersumber", v.status === "HIPOTESIS" ? "hipotesis" : "ya")}], Object.entries(AK.SUMBER_ASUMSI))),
    h("section", {class: "kb-bag"}, h("h3", null, "Istilah"), h("ul", {class: "kb-daftar"}, ISTILAH.map(([k, t]) => h("li", null, h("b", null, k + ": "), t)))),
    h("section", {class: "kb-bag"}, h("h3", null, "Sumber data"), h("ul", {class: "kb-daftar"},
      h("li", null, `Kehilangan tutupan pohon 2001–${akhir}: Hansen/UMD lewat GFW Data API (umd_tree_cover_loss ${d.versi.tcl ?? "–"}). Hutan = tutupan pohon 2000 ≥ ${AB.hutan_tutupan_min_pct}% (umd_tree_cover_density_2000 ${d.versi.tcd ?? "–"}).`),
      h("li", null, "Emisi bruto, stok karbon atas, bawah, dan tanah: model fluks karbon hutan GFW."),
      h("li", null, "Gambut, hutan primer, kawasan hutan, tutupan lahan KLHK 2017, pendorong kehilangan (WRI/Google): lapisan GFW."),
      h("li", null, "Peringatan deforestasi harian: GFW integrated alerts (GLAD-L, GLAD-S2, RADD). Titik api: NASA FIRMS VIIRS dan MODIS."),
      h("li", null, "Faktor emisi nasional: FRL Indonesia 2022 (biomassa per kelas tutupan, dekomposisi gambut)."))),
    h("section", {class: "kb-bag"}, h("h3", null, "Batas"), h("ul", {class: "kb-daftar"},
      h("li", null, "Semua angka adalah estimasi satelit pra-studi kelayakan, bukan kredit tersertifikasi dan belum diverifikasi pihak ketiga."),
      h("li", null, "Validasi, verifikasi, persetujuan masyarakat (FPIC), plot biomassa, dan muka air gambut tetap pekerjaan lapangan."),
      h("li", null, "Baseline di sini memakai laju historis per konsesi. Verra VM0048 memakai data aktivitas yurisdiksi dari Verra yang tidak direproduksi di sini."),
      h("li", null, `Konsesi dengan gambut lebih dari ${pc(AB.gambut_maks)} luas belum punya jalur Verra (VMD0055 v1.1 tidak berlaku, VM0036 ditahan); jalur realistisnya SPE-GRK nasional dengan faktor FRL.`),
      h("li", null, "Registri perdagangan sejak 9 Juli 2026 adalah SRUK (Perpres 110/2025); unit non-SPE perlu persetujuan Kemenhut (Permenhut 6/2026)."),
      h("li", null, "Buku unit di layar ini catatan internal, bukan registri dan bukan penerbitan kredit."),
      h("li", null, "Peta kehilangan tutupan pohon juga mencatat panen hutan tanaman dan gangguan alam; tanpa cek lapangan sebagian bukan deforestasi."),
      h("li", null, "Belum dibangun: penurunan muka gambut (InSAR), peta biomassa ESA CCI/GEDI, citra Planet berbayar."))),
    h("section", {class: "kb-bag"}, h("h3", null, "Uji balik baseline"), ub));
}

/* ---------- muat awal ---------- */
(async () => {
  if (CONTOH) document.getElementById("kbContoh").hidden = false;
  buka(); ganti(main.querySelector(".kb-p:not([hidden])"), h("p", {class: "kb-st"}, "Memuat data…"));
  S.frl = await fetch("/karbon/faktor_frl.json").then(r => r.json()).catch(() => null);
  const [pr, kl] = await Promise.allSettled([Proyek.muatProyek(), muatKelola()]);
  const g = pr.reason || kl.value;
  if (g && g.status !== 401 && g.status !== 403) kabar("Sebagian data gagal dimuat: " + g.message);
  document.getElementById("upd").textContent = CONTOH ? "Data contoh" : `${ang(S.proyek.length)} proyek`;
  siap = true; buka();
})();
