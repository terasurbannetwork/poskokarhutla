"use strict";
/* Dua kartu Insight: debit sungai induk (GEOGloWS, geoglows.json) dan radar air permukaan OPERA DSWx (opera_dswx.json).
   Keduanya INDEKS/hipotesis pembanding, belum lolos uji balik, dan TIDAK memengaruhi status resmi kecamatan (status.json tidak dibaca di sini).
   Dimuat lazy: kartu digambar kosong dulu, berkas diambil setelah Insight selesai tampil, lalu kartunya diisi (klik tab tidak menunggu berkas).
   Nama sungai tidak ada di data penerbit (hanya ID ruas dan koordinat), jadi ruas ditulis dengan luas DAS dan koordinat, bukan dikarang namanya. */
const SungaiInduk = (() => {
  const r3 = v => v == null || !isFinite(v) ? null : v === 0 ? 0 : +v.toPrecision(3);        // tiga angka berarti, tanpa presisi palsu
  const q = v => v == null ? "–" : fmt(r3(v));
  const KELAS = {"T<2": "di bawah 2 tahunan", "T>=2": "2 tahunan", "T>=5": "5 tahunan", "T>=10": "10 tahunan", "T>=25": "25 tahunan", "T>=50": "50 tahunan", "T>=100": "100 tahunan atau lebih"};
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = t => `${+t.slice(8, 10)} ${BLN[+t.slice(5, 7) - 1]}`;
  const hl = t => `<span class="hl">${t}</span>`;
  const kartu = (ey, judul, isi) => `<article class="ex ex-std"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div></article>`;
  const tabel = (kepala, baris) => `<div class="tw ex-tabel"><table><thead><tr>${kepala.map(k => { const [t, tip] = k.split("|"); return `<th${tip ? ` title="${esc(tip)}"` : ""}>${t}</th>`; }).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>`;
  const td = (v, n = true) => `<td${n ? ' class="n num"' : ""}>${v}</td>`;
  /* ruas yang boleh jadi kesimpulan: bukan kanal/anak sungai kecil, bukan data basi, kelas ada */
  const layak = r => !r.ruas_kecil && !r.basi && r.kelas_puncak != null;

  function debit(d) {
    const semua = Object.values(d?.ruas || {});
    if (!semua.length) return "";
    const L = semua.filter(layak).sort((a, b) => (b.luas_km2 || 0) - (a.luas_km2 || 0)), lewat = L.filter(r => r.kelas_puncak !== "T<2");
    const judul = lewat.length ? `${hl(fmt(lewat.length) + " dari " + fmt(L.length) + " sungai induk")} diperkirakan melewati debit banjir 2 tahunan dalam 15 hari`
      : `Dari ${hl(fmt(L.length) + " sungai induk")}, belum ada yang diperkirakan melewati debit banjir 2 tahunan dalam 15 hari`;
    const baris = L.map(r => `<tr>${td(`${r.luas_km2 ? "DAS " + fmt(r.luas_km2) + " km²" : "Ruas"}, ${fmt(Math.abs(r.lat).toFixed(1) * 1)}°${r.lat < 0 ? "LS" : "LU"} ${fmt(r.lon.toFixed(1) * 1)}°BT`, false)}${td(q(r.debit_sekarang))}${td(q(r.puncak_15hari))}${td(tgl(r.tgl_puncak), false)}${td(KELAS[r.kelas_puncak] || esc(r.kelas_puncak), false)}${td(q(r.rp?.["2"]))}</tr>`);
    const keluar = semua.length - L.length;
    return kartu("Indeks", judul, tabel(["Ruas sungai induk|Ruas GEOGloWS di muara cekungan, dipilih dari luas DAS terbesar; nama sungai tidak tersedia di data penerbit", "Debit sekarang (m³/dtk)|Rata-rata 24 jam pertama ramalan median 51 anggota ECMWF",
      "Puncak 15 hari (m³/dtk)|Debit median tertinggi dalam ramalan 15 hari", "Tanggal puncak", "Periode ulang puncak|Dibanding Gumbel dari simulasi ERA5 1990 sampai kini, dihitung sendiri; indeks pembanding, belum lolos uji balik",
      "Banjir 2 tahunan (m³/dtk)"], baris)
      + (keluar ? `<p>${fmt(keluar)} ruas lain (kanal dan anak sungai kecil, atau ramalan basi) tidak ditampilkan sebagai kesimpulan.</p>` : "")
      + `<p>Model hidrologi global ini berbeda dari status resmi kecamatan dan tidak mengubahnya.</p>`);
  }

  function dswx(d) {
    const kat = Object.entries(d?.katalog || {});
    if (!kat.length) return "";
    const akhir = kat[kat.length - 1], idx = d.di_atas_min_ha || {};
    const baruIdx = {};                                                  // tanggal terbaru per kabupaten
    for (const [k, p] of Object.entries(idx)) { const t = Object.keys(p).sort().pop(); if (t) baruIdx[k] = [t, p[t]]; }
    const nIdx = Object.keys(baruIdx).length, tunggu = /MENUNGGU KUNCI/.test(d.status || "");
    const judul = nIdx ? `Radar OPERA DSWx: indeks air terbuka tersedia untuk ${hl(fmt(nIdx) + " kabupaten")}, katalog terakhir ${hl(tgl(akhir[0]))}`
      : `Radar OPERA DSWx: katalog terakhir ${hl(tgl(akhir[0]))} berisi ${hl(fmt(akhir[1].ubin.length) + " ubin")}, ${tunggu ? "indeks per kabupaten menunggu kunci unduh" : "indeks per kabupaten belum ada"}`;
    const baris = kat.slice(-7).reverse().map(([t, v]) => `<tr>${td(tgl(t), false)}${td(fmt(v.n_granul))}${td(fmt(v.ubin.length))}</tr>`);
    let isi = tabel(["Tanggal akuisisi|Hari Sentinel-1 merekam (UTC); granul terbit sekitar sehari sesudahnya", "Granul|Jumlah berkas DSWx-S1 di kotak Indonesia", "Ubin|Ubin MGRS 100 km berbeda yang tercakup hari itu; tidak semua ubin ada tiap hari"], baris);
    if (nIdx) {
      const top = Object.entries(baruIdx).sort((a, b) => b[1][1] - a[1][1]).slice(0, 10);
      isi += tabel(["Kabupaten", "Tanggal", "Air di atas minimum (ha)|Air terbuka dikurangi porsi air minimum 60 hari sebelumnya x area teramati; INDEKS, bukan luas genangan"],
        top.map(([k, [t, v]]) => `<tr>${td(`<span translate="no">${esc(k.split("|")[1] || k)}</span>`, false)}${td(tgl(t), false)}${td(q(v))}</tr>`));
    }
    if (d.cakupan && d.cakupan.hari_lengkap < d.cakupan.hari_total) isi += `<p>Cakupan: ${fmt(d.cakupan.hari_lengkap)} dari ${fmt(d.cakupan.hari_total)} hari lengkap.</p>`;
    if (!nIdx && tunggu) isi += `<p>Status: ${esc(d.status)}. Katalog granul terbuka, unduh data butuh token Earthdata.</p>`;
    return kartu("Indeks", judul, isi);
  }
  return {debit, dswx, r3, layak};
})();

if (typeof window !== "undefined" && typeof Insight !== "undefined") {
  Insight.LABEL.debit = "Indeks"; Insight.LABEL.dswx = "Indeks";
  Insight.EX.splice(Insight.EX.indexOf("sungai") + 1, 0, "debit", "dswx");
  Insight.exDebit = function () { return SungaiInduk.debit(this.GG); };
  Insight.exDswx = function () { return SungaiInduk.dswx(this.DS); };
  /* satu promise untuk seluruh sesi; gagal = dibuang agar render berikutnya mencoba lagi */
  let _p = null;
  const muat = () => _p ||= Promise.all([muatJSON("data/geoglows.json"), muatJSON("data/opera_dswx.json")].map(x => x.catch(() => null)))
    .then(h => { if (h.every(x => x == null)) _p = null; return h; });
  /* #insight dibaca ulang saat menulis (render bisa terpanggil dua kali cepat); wadah yang belum ada dibuat menurut urutan EX */
  const pasang = (id) => {
    const el = document.getElementById("insight"); if (!el) return;
    let b = el.querySelector(`[data-ex="${id}"]`);
    if (!b) {
      b = document.createElement("div"); b.dataset.ex = id;
      const sesudah = Insight.EX.slice(Insight.EX.indexOf(id) + 1).map(k => el.querySelector(`[data-ex="${k}"]`)).find(Boolean);
      el.insertBefore(b, sesudah || null);
    }
    b.innerHTML = Insight.gambar(id);
  };
  const render0 = Insight.render;
  Insight.render = async function () {
    const r = await render0.apply(this, arguments);
    muat().then(([gg, ds]) => { this.GG = gg; this.DS = ds; pasang("debit"); pasang("dswx"); });
    return r;
  };
}
