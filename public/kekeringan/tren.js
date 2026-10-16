"use strict";
/* Tab Tren: tiap blok = Kartu.ex (inti/kartu.js). Kartu tanpa data dibuang (A18): riwayat dasarian baru muncul setelah dua dasarian terkumpul. */
const Tren = {
  kartu(ey, judul, isi, sumber, leg) { Kartu.leg(leg); return Kartu.ex(judul, "", "", isi, "Sumber: " + sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
  /* batang berangka: v = [{n, t, tip}], tinggi mengikuti nilai; kedua = batang kedua lebih sempit di depan (mis. ekstrem di dalam kering) */
  batang(v, {W = 940, H = 280, fmtN = fmt, w2 = null, warna = JINGGA, warna2 = MERAH} = {}) {
    const M = innerWidth < 640, Wd = M ? 700 : W, L = 34, B = H - 26, T = 22, gap = (Wd - L - 10) / v.length, bw = gap * .7, mx = Math.max(1, ...v.map(x => x.n)), Y = x => B - x / mx * (B - T);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${Wd - 4}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${fmtN(mx * f)}</text>`).join("");
    g += v.map((x, i) => { const px = L + i * gap + (gap - bw) / 2, ini = i === v.length - 1;
      return `<rect class="gy" style="--i:${i}" x="${px}" y="${Y(x.n)}" width="${bw}" height="${Math.max(1, B - Y(x.n))}" rx="3" fill="${warna}" opacity="${ini ? 1 : .8}" data-tip="${x.tip}"/>
        ${w2 && x.n2 ? `<rect class="gy" style="--i:${i}" x="${px + bw * .2}" y="${Y(x.n2)}" width="${bw * .6}" height="${Math.max(1, B - Y(x.n2))}" rx="2" fill="${warna2}" data-tip="${x.tip}"/>` : ""}
        <text class="gf" style="--i:${i}" x="${px + bw / 2}" y="${Y(x.n) - 5}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" font-weight="800" opacity=".85" pointer-events="none">${fmtN(x.n)}</text>
        <text x="${px + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" opacity=".7" pointer-events="none">${x.t}</text>`; }).join("");
    return `<div class="tw sk"><svg viewBox="0 0 ${Wd} ${H}" style="min-width:${M ? 700 : 0}px" role="img" aria-label="Tren">${g}</svg></div>`; },

  /* 1. porsi sel kering menurut SPI-3, 24 bulan */
  kSpi() {
    const s = S.tren?.spi_bulanan; if (!s || s.length < 3) return "";
    const v = s.map(x => ({n: x.kering, n2: x.ekstrem, t: BLN[+x.bln.slice(5) - 1] + (x.bln.endsWith("-01") || x === s[0] ? " " + x.bln.slice(2, 4) : ""),
      tip: `<b>${bulanPanjang(x.bln)}</b><br>Kering (SPI-3 ≤ −1): ${fmt(x.kering)}% wilayah<br>Kering ekstrem (≤ −2): ${fmt(x.ekstrem)}% wilayah`})), a = s.at(-1), mx = Math.max(...s.map(x => x.kering)), tertinggi = a.kering >= mx;
    return this.kartu("Hujan", `${Kartu.hl(fmt(a.kering) + "%")} wilayah kering pada ${bulanPanjang(a.bln)}, ${fmt(a.ekstrem)}% kering ekstrem${tertinggi ? ", tertinggi dalam 24 bulan" : ""}`,
      this.batang(v, {fmtN: x => fmt(Math.round(x * 10) / 10), w2: true}), "Deteksi Pantau Bencana (SPI-3 dari NASA POWER 1991–2020)", [[JINGGA, "kering (SPI-3 ≤ −1)"], [MERAH, "kering ekstrem (≤ −2)"]]); },

  /* 2. kode kekeringan (DC) harian: median dan persentil ke-90 seluruh sel */
  kDc() {
    const d = S.tren?.dc_harian; if (!d || d.length < 2) return "";
    const v = d.map(x => ({n: x.p90, n2: x.med, t: tglPendek(x.tgl), tip: `<b>${tglPendek(x.tgl)}</b><br>Median: ${fmt(x.med)}<br>10% sel terkering: ${fmt(x.p90)}`})), a = d[0], b = d.at(-1), naik = b.med - a.med;
    return this.kartu("Kode DC", `DC median ${naik >= 0 ? "naik" : "turun"} dari ${Kartu.hl(fmt(a.med))} ke ${Kartu.hl(fmt(b.med))} dalam ${d.length} hari; 10% sel terkering di ${fmt(b.p90)}`,
      this.batang(v, {warna: "#c9a24b", warna2: "#8a6d4e", w2: true}), "Drought Code Kanada (FWI) dari cuaca ECMWF lewat Open-Meteo", [["#c9a24b", "10% sel terkering"], ["#8a6d4e", "median"]]); },

  /* 3. riwayat dasarian: jiwa di kecamatan kering ekstrem; titik baru bertambah tiap dasarian */
  kDasarian() {
    const r = S.tren?.dasarian; if (!r || r.length < 2) return "";
    const v = r.map(x => ({n: x.jiwa[2], n2: 0, t: DAS(x.das), tip: `<b>${DAS(x.das)} ${x.id.slice(0, 4)}</b><br>${rb(x.jiwa[2])} jiwa di kecamatan awas<br>${fmt(x.kab_n[2])} kabupaten/kota kering ekstrem`})), a = r.at(-1);
    return this.kartu("Dasarian", `${Kartu.hl(rb(a.jiwa[2]) + " jiwa")} di kecamatan kering ekstrem pada dasarian ${DAS(a.das)}, ${fmt(a.kab_n[2])} kabupaten/kota`,
      this.batang(v, {fmtN: rb, warna: MERAH}), "Deteksi Pantau Bencana", [[MERAH, "jiwa di kecamatan awas"]]); },

  render() {
    const el = $("#tren"); el.innerHTML = [this.kSpi, this.kDc, this.kDasarian].map(f => { try { return f.call(this); } catch (e) { console.error(e); return ""; } }).join("") || `<p class="kosong">Belum ada tren.</p>`;
    pasangBagi(el, "tren"); },
};
