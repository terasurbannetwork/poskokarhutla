"use strict";
/* karhutla_data.js: kartu layar karhutla dari JSON yang tadinya hanya tersimpan (public/data), dibaca apa adanya, angka tidak dihitung ulang:
   konsesi (ps.json + tambang.json), malam (slstr_malam.json), iklim (iklim_stasiun.json, tab Tren), sinyal (sinyal_sosial.json + gdelt.json).
   Semua data tanggal 29 Okt 2026 dan ditulis begitu di kartu. hgu_api.json (model) sengaja TIDAK disambung sampai divalidasi.
   Dimuat sesudah karhutla_bmkg.js di index.html. Di /laporan-konsesi dimuat laporan_konsesi.js tanpa Insight: hanya window.KarhutlaData.konsesi(). */
(() => {
const A = {};   // nama berkas -> data | false (gagal)
const ambil = (f, ...lain) => Promise.all([f, ...lain].map(n => n in A ? A[n] : (A[n] = fetch("data/" + n + ".json").then(r => r.ok ? r.json() : false).catch(() => false)))).then(x => x);
const n2 = v => v == null ? "–" : Number(v).toLocaleString("id-ID", {maximumFractionDigits: 2});
const pr = v => v == null ? "–" : fmt(Math.round(v * 1000) / 10) + "%";
const hl = t => `<span class="hl">${t}</span>`;
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tgl = s => s ? `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}` : "–";
const prov = (k, n) => typeof namaProv === "function" && /^\d+$/.test(k) ? namaProv(k) : n || k;
const kartu = (ey, judul, isi) => `<article class="ex ex-std"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div></article>`;
const catat = t => `<p class="kd-cat">${t}</p>`;
const tabel = (kepala, baris) => `<div class="tw ex-tabel"><table><thead><tr>${kepala.map(k => { const [t, tip] = k.split("|"); return `<th${tip ? ` title="${esc(tip)}"` : ""}>${t}</th>`; }).join("")}</tr></thead><tbody>${baris.map(b => `<tr>${b.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const kosong = t => kartu("Memuat", t, `<div class="kosong"><div class="spin"></div></div>`);

/* ---------- Konsesi dan tata kawasan ---------- */
const htmlKonsesi = ([ps, tb]) => {
  if (!ps && !tb) return "";
  const a = ps?.ringkas, b = tb?.ringkas;
  const judul = `Konsesi dan tata kawasan: ${a ? hl(pr(a.pangsa_titik_nasional)) + " titik panas di perhutanan sosial" : ""}${a && b ? " dan " : ""}${b ? hl(pr(b.pangsa_titik)) + " di izin tambang" : ""} dari ${fmt((a || b).titik_total)} titik`;
  const psB = a ? Object.values(ps.per_provinsi).sort((x, y) => y.titik_di_ps - x.titik_di_ps).slice(0, 8).map(p =>
    [esc(p.nama), fmt(p.titik_total), fmt(p.titik_di_ps), pr(p.pangsa_titik_ps), pr(p.pangsa_luas_ps), n2(p.lift)]) : [];
  const tbB = b ? Object.values(tb.per_provinsi).sort((x, y) => y.titik_di_iup - x.titik_di_iup).slice(0, 8).map(p =>
    [esc(p.nama), fmt(p.wiup), fmt(p.luas_ha), fmt(p.titik_di_iup), pr(p.pangsa_titik_di_iup)]) : [];
  return kartu("Konsesi dan tata kawasan", judul,
    catat(`Data ${tgl((ps || tb).dibuat.slice(0, 10))}, titik acuan ${tgl((ps || tb).acuan_titik.slice(0, 10))}; bukan data terbaru. Fitur spasial, bukan model prediksi, dan bukan bukti siapa yang membakar.`)
    + (a ? `<h4 class="kd-h">Perhutanan sosial dan hutan adat, ${fmt(a.titik_di_ps)} dari ${fmt(a.titik_total)} titik</h4>`
      + tabel(["Provinsi", "Titik total", "Titik di PS", "Pangsa titik|titik di PS dibagi titik provinsi", "Pangsa luas|luas PS dibagi luas provinsi", "Lift|" + (ps.rumus || "")], psB) : "")
    + (b ? `<h4 class="kd-h">Izin tambang (WIUP), ${fmt(b.titik_di_iup)} dari ${fmt(b.titik_total)} titik, ${fmt(b.wiup)} WIUP</h4>`
      + tabel(["Provinsi", "WIUP", "Luas (ha)", "Titik di izin", "Pangsa titik|titik di izin dibagi titik provinsi"], tbB)
      + catat(esc(tb.cakupan || "")) : ""));
};

/* ---------- Deteksi malam ---------- */
const exMalam = d => {
  if (!d || !d.slstr) return "";
  const s = d.slstr, K = (d.kluster_top || []).slice(0, 10), m = d.model || {};
  const judul = `Deteksi malam: ${hl(fmt(s.lintasan_malam) + " dari " + fmt(s.lintasan_24j))} lintasan Sentinel-3 SLSTR jatuh malam, data FRP SLSTR belum diunduh`;
  const grafik = K.length && typeof Kartu !== "undefined" && Kartu.hbar ? Kartu.hbar(K.map(k => ({n: k.id, v: k.fraksi_malam, txt: pr(k.fraksi_malam),
    tip: esc(`<b>${k.id}</b><br>${prov(k.prov)}<br>fraksi malam ${pr(k.fraksi_malam)}<br>FRP 72 jam ${fmt(k.frp72)} MW`)})), "#5b4b8a") : "";
  return kartu("Deteksi malam", judul,
    catat(`Data ${tgl(d.dibuat.slice(0, 10))}, titik acuan ${tgl(d.acuan.slice(0, 10))}. Sumber angka: ${esc(d.sumber)} (FIRMS); unduhan SLSTR: ${esc(s.unduh)}. Rumus: ${esc(d.rumus || "")}.`)
    + (K.length ? tabel(["Cluster", "Provinsi", "Titik 72 jam", "FRP 72 jam (MW)", "Fraksi malam", "Hari aktif"],
      K.map(k => [esc(k.id), esc(prov(k.prov)), fmt(k.n72), fmt(k.frp72), pr(k.fraksi_malam), fmt(k.hari_aktif)])) + grafik : "")
    + catat(`Vonis model: ${hl(esc(m.vonis || "–"))}. Contoh: ${fmt(m.n)} cluster, ${fmt(m.n_uji)} uji, ${fmt(m.pos_uji)} positif.`));
};

/* ---------- Iklim stasiun (tab Tren) ---------- */
const exIklim = d => {
  if (!d || !d.stasiun) return "";
  const R = d.ringkas || {}, u = d.uji_balik_gev || {}, S = d.stasiun.slice().sort((a, b) => (b.rx1day_maks || 0) - (a.rx1day_maks || 0)).slice(0, 10);
  const judul = `Iklim stasiun: ${hl(fmt(R.tren_rx1day_signifikan_p05) + " dari " + fmt(R.dari))} stasiun menunjukkan tren hujan ekstrem sehari yang signifikan (p &lt; 0,05)`;
  const grafik = typeof Kartu !== "undefined" && Kartu.hbar ? Kartu.hbar(S.map(s => ({n: s.nama.length > 16 ? s.nama.slice(0, 15) + "…" : s.nama, v: s.rx1day_maks, txt: fmt(s.rx1day_maks),
    tip: esc(`<b>${s.nama}</b><br>hujan maksimum sehari ${fmt(s.rx1day_maks)} mm<br>${fmt(s.n_tahun)} tahun data (${s.tahun[0]}-${s.tahun[1]})`)})), "#2f6f8f") : "";
  return kartu("Iklim", judul,
    catat(`Data ${tgl(d.dibuat)}, ${fmt(d.n_stasiun)} stasiun. ${esc(d.atribusi)}. Uji balik GEV: ${hl(esc(u.vonis || "–"))} (frekuensi GEV ${pr(u.frekuensi_gev)}, empiris ${pr(u.frekuensi_empiris)}, diharapkan ${pr(u.diharapkan)}); nilai ulang GEV tidak ditampilkan.`)
    + tabel(["Stasiun", "Tahun data", "P95 (mm)|persentil 95 hari basah >= 1 mm", "P99 (mm)|persentil 99 hari basah >= 1 mm", "Maks sehari (mm)", "Median tahunan (mm)|median maksimum tahunan 1 hari", "Tren (mm/dekade)|kemiringan Sen", "p Mann-Kendall"],
      S.map(s => [esc(s.nama), `${s.tahun[0]} sampai ${s.tahun[1]}`, fmt(s.p95), fmt(s.p99), fmt(s.rx1day_maks), fmt(s.rx1day_median), n2(s.sen_rx1day_mm_dekade), n2(s.mk_p_rx1day)])) + grafik
    + catat(esc(d.metode || "")));
};

/* ---------- Sinyal publik ---------- */
const TOPIK = {banjir: "Banjir", longsor: "Longsor", asap: "Asap", gempa: "Gempa", kekeringan: "Kekeringan"};
const exSinyal = ([ss, gd]) => {
  if (!ss && !gd) return "";
  const z = ss?.z_wikipedia_terakhir || {}, sk = gd?.skor_terakhir || {}, uj = gd?.uji || {}, aw = ss?.uji_wikipedia || {};
  const judul = `Sinyal publik: minat baca Wikipedia soal asap z ${hl(n2(z.asap))} dan ${hl(esc(uj.asap?.gabungan?.vonis || aw.asap?.vonis || "–"))} sebagai deteksi dini`;
  const baris = Object.keys(TOPIK).filter(k => k in z || k in sk).map(k => { const g = uj[k]?.gabungan || aw[k] || {};
    return [TOPIK[k], n2(z[k]), n2(sk[k]?.gdelt_volume), n2(sk[k]?.gdelt_nada_negatif), n2(sk[k]?.gabungan), n2(g.ambang), esc(g.vonis || "–")]; });
  return kartu("Sinyal publik", judul,
    catat(`Sinyal minat publik, bukan kejadian terverifikasi. Data ${tgl((ss || gd).dibuat.slice(0, 10))}, jendela sampai ${tgl((ss || gd).sampai)}; nasional, tanpa pecahan provinsi.`)
    + tabel(["Topik", "z Wikipedia|lonjakan terhadap median dan MAD 28 hari sebelumnya", "z volume GDELT|persen liputan", "z nada negatif GDELT", "Skor gabungan|rata-rata z", "Ambang alarm", "Uji deteksi dini|terhadap kejadian DIBI nasional"], baris)
    + catat(esc(gd?.catatan || ss?.catatan || "")));
};

/* ---------- penyambung ---------- */
const BERKAS = {konsesi: ["ps", "tambang"], malam: ["slstr_malam"], iklim: ["iklim_stasiun"], sinyal: ["sinyal_sosial", "gdelt"]};
const BANGUN = {konsesi: htmlKonsesi, malam: ([d]) => exMalam(d), iklim: ([d]) => exIklim(d), sinyal: exSinyal};
const LABEL = {konsesi: "Konsesi dan tata kawasan", malam: "Deteksi malam", iklim: "Iklim", sinyal: "Sinyal publik"};
const JUDUL_MUAT = {konsesi: "Memuat konsesi dan tata kawasan…", malam: "Memuat deteksi malam…", iklim: "Memuat iklim stasiun…", sinyal: "Memuat sinyal publik…"};
const muat = id => ambil(...BERKAS[id]);

window.KarhutlaData = {konsesi: () => muat("konsesi").then(BANGUN.konsesi)};

if (typeof Insight === "undefined" || !Array.isArray(Insight.EX)) return;
const HASIL = {};
for (const id of Object.keys(BERKAS)) {
  Insight["ex" + id[0].toUpperCase() + id.slice(1)] = function () {
    if (!(id in HASIL)) { HASIL[id] = null;
      muat(id).then(r => { HASIL[id] = r; requestAnimationFrame(() => document.querySelectorAll(`[data-ex="${id}"]`).forEach(b => { b.innerHTML = Insight.gambar(id); })); }); }
    return HASIL[id] ? BANGUN[id](HASIL[id]) : kosong(JUDUL_MUAT[id]);
  };
  Insight.LABEL[id] = LABEL[id];
}
Insight.EX.splice(Math.max(0, Insight.EX.indexOf("bmkg") + 1), 0, "konsesi", "malam", "sinyal");
if (Array.isArray(Insight.TREN)) Insight.TREN.push("iklim");
})();
