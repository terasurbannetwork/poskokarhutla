"use strict";
/* ================================================================ kartu Insight: kab/kota tertutup asap (PKH-38) dan hari PM2,5 di atas 55 (PKH-42)
   asap_kab.json (scripts/udara/asap_kab.py): analisis dan prakiraan CAMS sel 1 derajat, HIPOTESIS. hari_tinggi.json (scripts/udara/riwayat.py):
   pengamatan stasiun OpenAQ. Berkas hilang = pesan "belum ada" atau kartu dibuang, tidak pernah angka. Tanpa kalimat kesimpulan (AGENTS.md 3.5). */
const HariAsap = {
  A: null, H: null,
  async muat() {
    const j = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
    [this.A, this.H] = await Promise.all([this.A || j("data/asap_kab.json"), this.H || j("data/hari_tinggi.json")]); },
  PIL_HIP: '<span class="kt kt-tk">hipotesis, sel CAMS 1 derajat</span>',
  PIL_KASAR: '<span class="kt kt-tk">perkiraan kasar</span>',
  /* kartu 1: tren harian kab/kota di sel CAMS PM2,5 > ambang, bertumpuk per kelas; hari prakiraan berbingkai putus-putus; null = celah */
  exAsap() {
    const A = this.A; if (!A?.tren?.length) return Insight.kepala(Kartu.ex("", "", "", '<p class="kosong">Belum ada data kab/kota tertutup asap.</p>', ""), "kab", "Kab/kota tertutup asap", this.PIL_HIP);
    const kws = Object.keys(A.kawasan || {}), kw = kws.includes(Insight.st.asapKw) ? Insight.st.asapKw : "";
    const WR = [0, 1, 2], warna = i => `color-mix(in oklch, var(--brand2) ${[30, 60, 100][i]}%, transparent)`;   /* satu hue netral, tiga intensitas: bukan warna kategori ISPU */
    const D = A.tren.map(t => { const v = kw ? [t.kawasan?.[kw]] : Object.values(t.kawasan || {});
      if (!v.length || v.some(x => !Array.isArray(x))) return {t, v: null};
      return {t, v: [0, 1, 2, 3].map(i => v.reduce((a, x) => a + (x[i] || 0), 0))}; });
    const M = innerWidth < 640, W = M ? 520 : 940, H = 190, L = 40, B = 26, n = D.length, bw = (W - L - 6) / n, mx = Math.max(5, ...D.map(d => d.v ? d.v[0] + d.v[1] + d.v[2] : 0)), Y = v => H - B - v / mx * (H - B - 12);
    const tg = s => new Date(s + "T00:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
    const bar = D.map((d, j) => { const x = L + j * bw; if (!d.v) return `<text x="${(x + bw / 2).toFixed(1)}" y="${H - B - 4}" text-anchor="middle" font-size="10" opacity=".6">tanpa data</text>`;
      let acc = 0, tot = d.v[0] + d.v[1] + d.v[2];
      const pk = d.t.jenis === "prakiraan", tip = esc(`<b>${tg(d.t.tgl)}${pk ? ", prakiraan" : ""}</b><br>tertutup 50-70% wilayah: ${fmt(d.v[0])} kab/kota<br>70-90%: ${fmt(d.v[1])}<br>di atas 90%: ${fmt(d.v[2])}<br>dari ${fmt(d.v[3])} kab/kota bernilai`);
      return `<g class="gx" style="--i:${Math.min(j, 30)}" data-tip="${tip}">${WR.map((_, i) => { const y0 = Y(acc + d.v[i]), h = Y(acc) - y0; acc += d.v[i];
        return h > 0 ? `<rect x="${(x + 1).toFixed(1)}" y="${y0.toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${h.toFixed(1)}" style="fill:${warna(i)}${pk ? ";opacity:.6" : ""}"/>` : ""; }).join("")}
        <rect x="${(x + 1).toFixed(1)}" y="${(Y(tot) - 1).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${Math.max(2, Y(0) - Y(tot) + 1).toFixed(1)}" fill="transparent" ${pk ? 'stroke="currentColor" stroke-dasharray="3 2" opacity=".6"' : ""}/></g>`; }).join("");
    const sb = D.map((d, j) => j % Math.max(1, Math.round(n / (M ? 5 : 10))) ? "" : `<text x="${(L + j * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" opacity=".75">${tg(d.t.tgl)}${d.t.jenis === "prakiraan" ? ", prakiraan" : ""}</text>`).join("");
    const gr = [0, .5, 1].map(f => { const v = Math.round(mx * f); return `<line x1="${L}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".15"/><text x="${L - 4}" y="${Y(v) + 4}" text-anchor="end" font-size="10" opacity=".7">${fmt(v)}</text>`; }).join("");
    Kartu.leg(WR.map(i => [warna(i), A.kelas[i] + "% wilayah"]).concat([["transparent", "bingkai putus-putus = prakiraan"]]));
    const ctl = `<select data-set="asapKw" aria-label="Kawasan"><option value="">Semua kawasan</option>${kws.map(k => `<option value="${esc(k)}" ${k === kw ? "selected" : ""}>${esc(k)}</option>`).join("")}</select>`;
    return Insight.kepala(Kartu.ex("", "", "", `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kab/kota tertutup asap per hari">${gr}${bar}${sb}</svg>
      <details class="lipat ud-lipat"><summary>Cara membaca grafik</summary><div class="isi"><p class="fnd">Satu batang adalah satu hari: jumlah kab/kota yang sedikitnya separuh wilayahnya berada di sel CAMS 1 derajat (sekitar 100 km) dengan PM2,5 harian di atas ambang, ditumpuk menurut persen wilayah yang tertutup. Bingkai putus-putus dan warna pudar menandai hari prakiraan, yang sumbu tanggalnya diberi ", prakiraan". Hari tanpa data dikosongkan, bukan nol. Ambang ${esc(dec(A.ambang_ug, 1))} µg/m³ adalah hipotesis yang belum diuji terhadap citra, dan sel sebesar itu tidak membedakan kota di dalamnya.</p></div></details>`, "", ctl), "kab", "Kab/kota tertutup asap", this.PIL_HIP); },
  /* kartu 2: hari PM2,5 harian di atas 55 per kota, tahun ini lawan dua tahun sebelumnya, setara rokok (K8) */
  exHari() {
    const H = this.H, ada = H?.kota && Object.keys(H.kota).length;
    if (!ada) return Insight.kepala(Kartu.ex("", "", "", '<p class="kosong">Belum ada arsip pengamatan stasiun multi-tahun, jadi belum ada hitungan hari PM2,5 di atas 55.</p>', ""), "pel", "Hari PM2,5 di atas 55 µg/m³", "");
    const th = [...new Set(Object.values(H.kota).flatMap(k => Object.keys(k.tahun)))].sort().slice(-3), yb = th[th.length - 1];
    const R = Object.values(H.kota).sort((a, b) => (b.tahun[yb]?.[1] ?? -1) - (a.tahun[yb]?.[1] ?? -1));
    const sel = (k, y) => { const v = k.tahun[y]; if (!v || v[1] == null) return `<td class="n" data-tip="${esc(`<b>${esc(k.nama)}, ${y}</b><br>data belum cukup untuk jendela ${esc(H.jendela)}`)}">belum cukup data</td>`;
      return `<td class="n" data-tip="${esc(`<b>${esc(k.nama)}, ${y}</b><br>${fmt(v[1])} hari di atas ${fmt(H.ambang_ug)} µg/m³<br>dari ${fmt(v[0])} hari berdata, ${esc(H.jendela)}`)}">${fmt(v[1])} hari</td>`; };
    const rok = k => { const v = k.tahun[yb]?.[2]; return v == null ? '<td class="n">belum cukup data</td>' : `<td class="n" data-tip="${esc(`<b>${esc(k.nama)}, ${yb}</b><br>rata-rata PM2,5 harian dibagi 22 µg/m³<br>${esc(H.setara_rokok_rujukan)}`)}">${dec(v, Number.isInteger(v) ? 0 : 1)} batang</td>`; };
    const tb = `<div class="tw"><table><thead><tr><th title="Stasiun dalam 30 km dari kota dirata-rata per hari">Kota</th>${th.map(y => `<th class="n" title="Hari berdata rata-rata 24 jam (WIB) di atas ${fmt(H.ambang_ug)} µg/m³, ${esc(H.jendela)}">${y}</th>`).join("")}<th class="n" title="Rata-rata PM2,5 harian ${yb} dibagi 22 µg/m³ per batang rokok. Perkiraan kasar">Setara rokok per hari</th></tr></thead>
      <tbody>${R.map(k => `<tr><td>${esc(k.nama)}</td>${th.map(y => sel(k, y)).join("")}${rok(k)}</tr>`).join("")}</tbody></table></div>`;
    return Insight.kepala(Kartu.ex("", "", "", `<div style="margin:0 0 6px">${this.PIL_KASAR}</div>${tb}
      <details class="lipat ud-lipat"><summary>Cara membaca angka</summary><div class="isi"><p class="fnd">Hari dihitung per kota dari stasiun dalam 30 km, hanya hari dengan sedikitnya 18 jam terisi, dan tiap tahun dipotong pada jendela tanggal yang sama (${esc(H.jendela)}) supaya sebanding. Tahun dengan data kurang dari 70% jendela tidak dihitung, bukan nol. Setara rokok memakai kaidah Berkeley Earth: 22 µg/m³ selama 24 jam kira-kira satu batang. Itu perkiraan kasar, bukan ukuran paparan atau dosis.</p></div></details>`, ""), "pel", "Hari PM2,5 di atas 55 µg/m³", ""); },
};
