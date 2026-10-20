"use strict";
/* ================================================================ insight */
/* Kartu Insight kekeringan: anatomi sama dengan karhutla/banjir (pil kategori, judul satu kalimat berangka merah, grafik, legenda + "Sumber:", bisa dibagikan).
   Mesin kartu dari public/inti (Kartu.ex/pil/seg, paginasi, pengurutKepala); di sini hanya data kekeringan dan gambar SVG-nya. */
Tip.polaSatu = /^([\d.,]+(?:\s?(?:rb|jt))?\s+(?:kabupaten|jiwa|kecamatan))$/;
if (!window.__pilihPasang) { window.__pilihPasang = 1; PilihCantik.pasang(); }
const SUMBER = "Deteksi Pantau Bencana (NASA POWER, ECMWF, ERA5-Land), penduduk WorldPop";
const F3 = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 3, maximumFractionDigits: 3}).replace("-", "−");
const tanda = v => (v > 0 ? "+" : v < 0 ? "−" : "") + F2(Math.abs(v));

const Insight = {
  st: {jiwa: "3"},
  EX: ["kabupaten", "jiwa", "prakiraan", "peluang", "padi", "ujibalik", "gambut", "berulang", "enso", "tabel"],
  LABEL: {kabupaten: "Kabupaten/kota", jiwa: "Jiwa", prakiraan: "Prakiraan", peluang: "Peluang kering", padi: "Padi", ujibalik: "Seberapa tepat", gambut: "Gambut", berulang: "Paling sering kering", enso: "El Niño", tabel: "Paling kering"},
  T: {tabel: {urut: "_", turun: true, hal: 0}, prakiraan: {urut: "nm", turun: false, hal: 0}, padi: {urut: "nm", turun: false, hal: 0}, gambut: {urut: "dc", turun: true, hal: 0}, berulang: {urut: "tahun", turun: true, hal: 0}},
  ex: (...a) => Kartu.ex(...a), hl: Kartu.hl, pil: Kartu.pil,
  seg(key, opsi) { return Kartu.seg(key, opsi, this.st); },
  nm: k => `<span translate="no">${esc(namaProv(k))}</span>`,
  pendek: k => namaProv(k).replace("Kalimantan", "Kal.").replace("Sumatera", "Sum.").replace("Sulawesi", "Sul.").replace("Nusa Tenggara", "NT").replace("Papua", "Pap."),
  uk() { const M = innerWidth < 640; return M ? {M, W: 520, L: 120, rh: 30, fs: 14, nm: k => this.pendek(k)} : {M, W: 940, L: 190, rh: 30, fs: 13, nm: k => namaProv(k)}; },
  p(x, y, t, bg, fg = "#fff", fs = 12) { return Kartu.pil(x, y, t, bg, fg, fs); },

  /* 1. kabupaten/kota per tingkat, per provinsi */
  exKabupaten() {
    const N = S.meta.nasional, U = this.uk(); if (!N.kab_n[0]) return "";
    const pv = Object.entries(S.wil.prov).map(([k, v]) => ({k, n: tepat(v.kab_n).reverse()})).filter(x => x.n.some(Boolean))   /* [awas, siaga, waspada] */
      .sort((a, b) => b.n[0] - a.n[0] || b.n[1] - a.n[1] || b.n[2] - a.n[2]).slice(0, 15);
    const {W, L, rh} = U, mx = Math.max(1, ...pv.map(x => x.n[0] + x.n[1] + x.n[2])), X = v => v / mx * (W - L - 70), t = tepat(N.kab_n);
    const g = pv.map((x, i) => { let acc = 0, y = i * rh, tot = x.n[0] + x.n[1] + x.n[2];
      const tip = `<b>${esc(namaProv(x.k))}</b><br>Awas: ${fmt(x.n[0])} kabupaten<br>Siaga: ${fmt(x.n[1])} kabupaten<br>Waspada: ${fmt(x.n[2])} kabupaten`;
      return `<g data-prov="${esc(x.k)}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(U.nm(x.k))}</text>`
        + x.n.map((n, j) => { const bw = X(n); if (!bw) return ""; const s = `<rect class="gx" style="--i:${i}" x="${L + acc}" y="${y + 5}" width="${bw}" height="${rh - 10}" fill="${WARNA_LV[3 - j]}" data-tip="${tip}"/>`; acc += bw; return s; }).join("")
        + `<g class="gf" style="--i:${i}">${this.p(L + acc + 8, y + 5, fmt(tot), WARNA_LV[x.n[0] ? 3 : x.n[1] ? 2 : 1], FG_LV[x.n[0] ? 3 : x.n[1] ? 2 : 1])[0]}</g></g>`; }).join("");
    Kartu.leg([[WARNA_LV[3], "Awas"], [WARNA_LV[2], "Siaga"], [WARNA_LV[1], "Waspada"]]);
    return this.ex(t[2] ? `${this.hl(fmt(t[2]) + " kabupaten/kota")} berstatus Awas di ${fmt(N.prov_n[2])} provinsi, ${fmt(t[1])} Siaga, ${fmt(t[0])} Waspada`
        : `Belum ada kabupaten/kota berstatus Awas; ${this.hl(fmt(t[1] + t[0]) + " kabupaten/kota")} Siaga atau Waspada`, "", "",
      `<svg viewBox="0 0 ${W} ${pv.length * rh + 6}" role="img" aria-label="Kabupaten kering per provinsi">${g}</svg>`, `Sumber: ${SUMBER}`); },

  /* 2. jiwa di kecamatan kering, per provinsi */
  exJiwa() {
    const N = S.meta.nasional, m = +this.st.jiwa, U = this.uk(); if (!N.jiwa[0]) return "";
    const pv = Object.entries(S.wil.prov).map(([k, v]) => ({k, n: v.jiwa[m - 1], t: v.total})).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 15);
    if (!pv.length) return "";
    const {W, L, rh} = U, mx = Math.max(1, ...pv.map(x => x.n)), X = v => v / mx * (W - L - 90);
    const g = pv.map((x, i) => { const y = i * rh, tip = `<b>${esc(namaProv(x.k))}</b><br>${rb(x.n)} jiwa<br>${fmt(Math.round(x.n / x.t * 100))}% penduduk provinsi`;
      return `<g data-prov="${esc(x.k)}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(U.nm(x.k))}</text>
        <rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(x.n))}" height="${rh - 10}" fill="${WARNA_LV[m]}" data-tip="${tip}"/>
        <g class="gf" style="--i:${i}">${this.p(L + X(x.n) + 8, y + 5, rb(x.n), WARNA_LV[m], FG_LV[m])[0]}</g></g>`; }).join("");
    const nama = ["Waspada kekeringan atau lebih", "Siaga kekeringan atau lebih", "Awas kekeringan"][m - 1];
    Kartu.leg([[WARNA_LV[m], "jiwa di kecamatan " + ["waspada ke atas", "siaga ke atas", "awas"][m - 1]]]);
    return this.ex(`${this.hl(jt(N.jiwa[m - 1]) + " jiwa")} tinggal di kecamatan ${nama}, ${fmt(Math.round(N.jiwa[m - 1] / N.total * 100))}% penduduk`, "", "",
      `<svg viewBox="0 0 ${W} ${pv.length * rh + 6}" role="img" aria-label="Jiwa di kecamatan kering per provinsi">${g}</svg>`, `Sumber: ${SUMBER}`,
      this.seg("jiwa", [["1", "Waspada ke atas"], ["2", "Siaga ke atas"], ["3", "Awas"]])); },

  /* 3. El Niño: ONI 36 musim terakhir */
  exEnso() {
    const I = S.iklim, E = S.meta.enso; if (!I?.oni?.length || E.oni == null) return "";
    const o = I.oni.slice(-36), W = innerWidth < 640 ? 700 : 940, H = 190, Lm = 20, R = 130, B0 = 116, esk = 38, gap = (W - Lm - R) / o.length, bw = gap * .72, Y = v => B0 - v * esk;
    const w = v => v >= .5 ? MERAH : v <= -.5 ? BIRU : "#9aa4b2";
    let g = [[.5, "El Niño ≥ +0,5"], [-.5, "La Niña ≤ −0,5"]].map(([v, n]) => `<line x1="${Lm}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" stroke-dasharray="4 4" opacity=".3"/><text x="${W - R + 8}" y="${Y(v) + 4}" font-size="10.5" opacity=".7">${n}</text>`).join("");
    g += `<line x1="${Lm}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="currentColor" opacity=".35"/>`;
    g += o.map((d, i) => { const x = Lm + i * gap + (gap - bw) / 2, h = Math.abs(d.nilai) * esk, y = d.nilai >= 0 ? Y(d.nilai) : Y(0), ini = i === o.length - 1;
      return `<rect class="gy" style="--i:${i}" x="${x}" y="${y}" width="${bw}" height="${Math.max(1, h)}" rx="2" fill="${w(d.nilai)}" opacity="${ini ? 1 : .8}" data-tip="<b>${d.musim} ${d.tahun}</b><br>ONI: ${tanda(d.nilai)}"/>
        <text x="${x + bw / 2}" y="${d.nilai >= 0 ? y - 4 : y + h + 11}" text-anchor="middle" font-size="9.5" font-weight="${ini ? 800 : 600}" opacity=".85" pointer-events="none">${d.nilai < 0 ? "−" : ""}${F1(Math.abs(d.nilai))}</text>
        ${i % 6 === (o.length - 1) % 6 ? `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="10" opacity=".7" font-weight="${ini ? 800 : 400}">${d.musim} ${String(d.tahun).slice(2)}</text>` : ""}`; }).join("");
    if (E.iod) g += this.p(Lm, 2, `${E.iod}${E.dmi != null ? " · DMI " + tanda(E.dmi) : ""}`, E.dmi >= .4 ? "#a8671c" : "#5f6fb0")[0];
    const kuat = Math.abs(E.oni) >= 2 ? "sangat kuat" : Math.abs(E.oni) >= 1.5 ? "kuat" : Math.abs(E.oni) >= 1 ? "sedang" : "lemah";
    Kartu.leg([[MERAH, "El Niño (ONI ≥ +0,5)"], [BIRU, "La Niña (ONI ≤ −0,5)"], ["#9aa4b2", "Netral"]]);
    return this.ex(`${E.status} ${kuat}: ONI ${this.hl(tanda(E.oni))} (${E.musim} ${E.tahun})${E.peluang && E.hingga ? `; NOAA: ${this.hl(fmt(E.peluang) + "%")} bertahan hingga ${E.hingga}` : ""}`, "", "",
      `<div class="tw sk"><svg viewBox="0 0 ${W} ${H}" style="min-width:${W > 800 ? 0 : 700}px" role="img" aria-label="Indeks ONI">${g}</svg></div>`, `Sumber: NOAA CPC (ONI), NOAA PSL (IOD)`); },

  /* 4. tabel kabupaten/kota paling kering */
  tabel(nama, kol, rows, attr, per, satuan) {
    const st = this.T[nama], k = kol.find(c => c.k === st.urut && c.v) || kol.find(c => c.v), w = r => k.v(r) ?? -1;
    const a = [...rows].sort((x, y) => { const p = w(x), q = w(y), d = typeof p === "string" ? p.localeCompare(q) : p - q; return st.turun ? -d : d; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(a.length / per) - 1)); const dari = st.hal * per;
    return `<div class="tw"><table class="kl-tb"><thead><tr>${kol.map(c => `<th class="${c.n ? "n" : ""}">${c.v ? `<button data-k="${c.k}">${c.h}<i>${c.k === k.k ? (st.turun ? "↓" : "↑") : ""}</i></button>` : c.h}</th>`).join("")}</tr></thead><tbody>
      ${a.slice(dari, dari + per).map((r, i) => `<tr class="klik" tabindex="0" ${attr(r)}>${kol.map(c => `<td class="${c.n ? "n num" : ""}">${c.s(r, dari + i)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, a.length, per, satuan)}`; },
  exTabel() {
    const R = Object.entries(S.wil.kab).filter(([, v]) => v.lv >= 2).map(([k, v]) => ({k, p: k.split("|")[0], nama: k.split("|")[1], ...v})); if (!R.length) return "";
    const ada = f => R.some(r => r[f] != null), N = S.meta.nasional;
    const kol = [{k: "_", h: "#", s: (r, i) => `<span class="rk">${i + 1}</span>`}, {k: "nama", h: "Kabupaten/kota", v: r => r.nama, s: r => `<b translate="no">${esc(r.nama)}</b>`},
      {k: "prov", h: "Provinsi", v: r => namaProv(r.p), s: r => `<span translate="no">${esc(namaProv(r.p))}</span>`}, {k: "lv", h: "Status", v: r => r.lv * 1e9 + r.jiwa[2], s: r => pill(r.lv)},
      ...(ada("spi3") ? [{k: "spi", h: "SPI " + bulanPanjang(S.meta.spi.bulan), n: 1, v: r => r.spi3, s: r => r.spi3 != null ? `${F2(r.spi3)} <small>${katSpi(r.spi3)}</small>` : "–"}] : []),
      ...(ada("mm3") ? [{k: "mm", h: "Hujan 3 bln (mm)", n: 1, v: r => r.mm3, s: r => r.mm3 != null ? fmt(r.mm3) : "–"}] : []), ...(ada("pct") ? [{k: "pct", h: "Tanah", n: 1, v: r => r.pct, s: r => r.pct != null ? fmt(r.pct) : "–"}] : []),
      ...(ada("dc") ? [{k: "dc", h: "DC", n: 1, v: r => r.dc, s: r => r.dc != null ? fmt(r.dc) : "–"}] : []),
      {k: "jiwa", h: "Jiwa kering", n: 1, v: r => r.jiwa[0], s: r => rb(r.jiwa[0])}];
    if (this.T.tabel.urut === "_") this.T.tabel.urut = "lv";
    return this.ex(`${this.hl(fmt(R.length) + " kabupaten/kota")} berstatus Siaga atau Awas kekeringan, ${this.hl(jt(R.reduce((a, r) => a + r.jiwa[0], 0)) + " jiwa")} di kecamatan kering`, "", "",
      this.tabel("tabel", kol, R, r => `data-kab="${esc(r.k)}"`, 10, "kabupaten/kota"), `Sumber: ${SUMBER}`); },


  /* 5. prakiraan SEAS5 1-3 bulan: nasional + tabel provinsi TANPA peringkat (urutan nama; pengguna boleh mengurutkan sendiri) */
  /* peluang kekeringan (../banjir/data/kering_peluang.json, kontrak peluang/1; membungkus prakiraan SEAS5). Mesin public/inti/peluang.js; tanpa mesin atau berkas = dibuang. */
  exPeluang() { const d = this.pel; if (typeof Peluang === "undefined" || !d) return "";
    return Peluang.kartu(d, {ey: this.LABEL.peluang, st: this.st, kunci: "pel", kejadian: "bulan kering", sumber: "ECMWF SEAS5 lewat Open-Meteo, Deteksi Pantau Bencana"}); },
  exPrakiraan() {
    const P = S.prak, L = P?.nasional?.lead; if (!L?.length) return "";
    const bl = BLN_PRAK(), M = innerWidth < 640, W = M ? 700 : 940, H = 230, Lm = 20, B0 = 176, T0 = 40, gw = (W - Lm - 10) / L.length, bw = Math.min(70, gw / 4.2);
    const mx = Math.max(25, ...L.flatMap(l => [l.pk1, l.pk15, l.pk2])), Y = v => B0 - v / mx * (B0 - T0), WR = [JINGGA, MERAH, "#8e2a1f"], NM = ["SPI-3 ≤ −1", "≤ −1,5", "≤ −2"];
    let g = this.p(Lm, 2, BELUM_UJI + " · ECMWF SEAS5 tanpa koreksi bias", NAVY)[0];
    g += L.map((l, i) => { const cx = Lm + gw * i + gw / 2, bs = BASELINE_PRAK("pk1", i);
      const bars = [l.pk1, l.pk15, l.pk2].map((v, j) => { const x = cx + (j - 1) * (bw + 6) - bw / 2, h = Math.max(1, B0 - Y(v));
        return `<rect class="gy" style="--i:${i * 3 + j}" x="${x}" y="${Y(v)}" width="${bw}" height="${h}" rx="3" fill="${WR[j]}" data-tip="<b>${esc(bl[i] || "")}</b><br>Peluang ${NM[j]}: ${fmt(v)}% (rerata nasional tertimbang penduduk)"/><text x="${x + bw / 2}" y="${Y(v) - 5}" text-anchor="middle" font-size="11" font-weight="800" opacity=".85" pointer-events="none">${fmt(Math.round(v))}%</text>`; }).join("");
      const base = bs != null ? `<line x1="${cx - (bw + 6) - bw / 2 - 5}" x2="${cx - (bw + 6) + bw / 2 + 5}" y1="${Y(bs)}" y2="${Y(bs)}" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" opacity=".7"><title>baseline klimatologi</title></line>` : "";
      return bars + base + `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="12" font-weight="700">${esc(bl[i] || "")}${bs != null ? ` · garis putus = baseline ${fmt(Math.round(bs))}%` : ""}</text>`; }).join("");
    Kartu.leg(WR.map((w, j) => [w, "Peluang " + NM[j]]));
    const bs0 = BASELINE_PRAK("pk1", 0), jiwa = P.nasional.jiwa_pk1_50?.[0];
    const rows = Object.entries(P.prov || {}).filter(([, o]) => prakAda(o)).map(([k, o]) => ({k, nm: namaProv(k), lead: o.lead}));
    const kol = [{k: "nm", h: "Provinsi", v: r => r.nm, s: r => `<b translate="no">${esc(r.nm)}</b>`},
      ...L.map((_, i) => ({k: "b" + i, h: `${esc(bl[i] || "")} (%)`, n: 1, v: r => r.lead[i].pk1, s: r => { const bs = BASELINE_PRAK("pk1", i); return `${fmt(Math.round(r.lead[i].pk1))} ${bs != null ? `<small>${selisihTxt(r.lead[i].pk1, bs)}</small>` : ""}`; }}))];
    return this.ex(`Peluang SPI-3 ≤ −1 bulan ${esc(bl[0] || "depan")} rerata ${this.hl(fmt(Math.round(L[0].pk1)) + "%")}${bs0 != null ? `, baseline klimatologi ${this.hl(fmt(Math.round(bs0)) + "%")} (${selisihTxt(L[0].pk1, bs0)})` : ""}${jiwa ? `; ${this.hl(jt(jiwa) + " jiwa")} di wilayah berpeluang 50% atau lebih` : ""}; belum diuji balik`, "", "",
      `<div class="tw sk"><svg viewBox="0 0 ${W} ${H}" style="min-width:${M ? 700 : 0}px" role="img" aria-label="Peluang kering 1 sampai 3 bulan">${g}</svg></div>` + (rows.length ? this.tabel("prakiraan", kol, rows, r => `data-prov="${esc(r.k)}"`, 10, "provinsi") : ""),
      `${esc(BIAS_TXT())}. Sumber: ${esc(P.sumber || "ECMWF SEAS5")} (Pantau Bencana, belum diuji balik)`); },

  /* 6. padi tadah hujan: SATU besaran dibandingkan dengan Normal (padiBanding di app.js), bukan peringkat nilai mentah */
  exPadi() {
    const D = S.padi, K = Object.entries(D?.kab || {}).map(([k, o]) => ({k, o, b: padiBanding(o), nm: k.split("|")[1], p: k.split("|")[0]})).filter(r => r.b); if (!K.length) return "";
    const j = K[0].b.j, bes = PADI_BESARAN(j), Bes = bes[0].toUpperCase() + bes.slice(1);
    const pita = [["0 poin atau kurang", d => d <= 0, "#9ccfae"], ["1–9 poin", d => d >= 1 && d < 10, "#e3b94e"], ["10–24 poin", d => d >= 10 && d < 25, "#e58a45"], ["25 poin atau lebih", d => d >= 25, "#c9503a"]]
      .map(([n, f, w]) => ({n, w, v: K.filter(r => f(Math.round(r.b.d))).length}));
    const gagal = K.filter(r => r.o.gagal > 0), mxg = Math.max(0, ...K.map(r => r.o.gagal)), rows = K.filter(r => Math.round(r.b.d) >= 10);
    const U = this.uk(), W = U.W, L = U.M ? 150 : 170, rh = 30, mx = Math.max(1, ...pita.map(p => p.v)), X = v => v / mx * (W - L - 90);
    const g = pita.map((p, i) => { const y = i * rh;
      return `<g><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${p.n}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(p.v))}" height="${rh - 10}" fill="${p.w}" data-tip="${fmt(p.v)} kabupaten, selisih ${bes} terhadap normal: ${p.n}"/><g class="gf" style="--i:${i}">${this.p(L + X(p.v) + 8, y + 5, fmt(p.v), p.w, p.w === "#e3b94e" ? "#3b2e00" : "#fff")[0]}</g></g>`; }).join("");
    const pt = x => (Math.round(x) > 0 ? "+" : Math.round(x) < 0 ? "−" : "") + fmt(Math.abs(Math.round(x)));
    const kol = [{k: "nm", h: "Kabupaten/kota", v: r => r.nm, s: r => `<b translate="no">${esc(r.nm)}</b>`}, {k: "prov", h: "Provinsi", v: r => namaProv(r.p), s: r => `<span translate="no">${esc(namaProv(r.p))}</span>`},
      {k: "v", h: `${Bes} (%)`, n: 1, v: r => r.b.v, s: r => fmt(r.b.v)}, {k: "nrm", h: "Normal (%)", n: 1, v: r => r.b.n, s: r => fmt(r.b.n)}, {k: "sel", h: "Selisih (poin)", n: 1, v: r => r.b.d, s: r => pt(r.b.d)},
      {k: "gagal", h: "Gagal panen (%)", n: 1, v: r => r.o.gagal, s: r => fmt(r.o.gagal)}];
    Kartu.leg(pita.map(p => [p.w, "selisih " + p.n]));
    return this.ex(`${j === "peluang" ? "Peluang hasil padi tadah hujan turun 25% atau lebih" : "Penurunan hasil padi tadah hujan (median)"} melampaui normal 10 poin atau lebih di ${this.hl(fmt(rows.length) + " dari " + fmt(K.length) + " kabupaten")}; peluang gagal panen di atas 0% di ${fmt(gagal.length)} kabupaten${mxg ? ` (setinggi ${fmt(mxg)}%)` : ""}`, "", "",
      `<svg viewBox="0 0 ${W} ${pita.length * rh + 6}" role="img" aria-label="Kabupaten menurut selisih ${esc(bes)} terhadap normal">${g}</svg>` + (rows.length ? this.tabel("padi", kol, rows, r => `data-kab="${esc(r.k)}"`, 10, "kabupaten/kota") : ""),
      `Indikator cekaman air, bukan data puso; tanam mengikuti onset hujan (asumsi), tanpa irigasi, tanpa data luas sawah; ${esc(BIAS_TXT())}. Sumber: Pantau Bencana (FAO-56, FAO-33)`); },

  /* 7. seberapa tepat: uji balik apa adanya */
  exUjibalik() {
    const J = S.uji, Y = J?.aturan?.tahun; if (!Y || !J.aturan.netral?.bulan) return "";
    const bl = Object.keys(J.aturan.netral.bulan).sort().at(-1), nt = J.aturan.netral.bulan[bl]?.sel_waspada, thn = Object.keys(Y).sort().filter(t => Y[t].bulan?.[bl]?.sel); if (!nt || !thn.length) return "";
    const v = t => Y[t].bulan[bl].sel[0], men = thn.filter(t => v(t) > nt.maks), lain = thn.filter(t => !men.includes(t)), nm = BLN_PENUH[+bl - 1];
    const rows = [...thn.map(t => ({n: t, v: v(t), w: men.includes(t) ? MERAH : "#9aa4b2", tip: `Tahun ${t}: ${fmt(v(t))}% sel Waspada ke atas pada ${nm}`})), {n: `Rerata ${fmt(J.aturan.netral.tahun.length)} tahun netral`, v: nt.rerata, w: BIRU, tip: `Rerata ${fmt(nt.rerata)}%, rentang ${fmt(nt.min)} sampai ${fmt(nt.maks)}%`}];
    const U = this.uk(), W = U.W, L = U.M ? 150 : 190, rh = 30, mx = Math.max(1, ...rows.map(r => r.v)), X = x => x / mx * (W - L - 90);
    const g = rows.map((r, i) => { const y = i * rh;
      return `<g><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(r.v))}" height="${rh - 10}" fill="${r.w}" data-tip="${esc(r.tip)}"/><g class="gf" style="--i:${i}">${this.p(L + X(r.v) + 8, y + 5, fmt(r.v) + "%", r.w)[0]}</g></g>`; }).join("");
    const Q = J.prospek, A = Q?.semua, th = (a, b) => `<tr><td>${a}</td><td class="n num">${b}</td></tr>`;
    const tb = A ? `<div class="tw"><table class="kl-tb"><thead><tr><th>Model cadangan ENSO (bukan SEAS5), ${esc(Q.bulan_target || "")}</th><th class="n">Hasil</th></tr></thead><tbody>
      ${th("Skor Brier relatif klimatologi (BSS), semua sel dan tahun", F3(A.bss))}${Q.bss_rerata_tahun != null ? th("BSS rerata per tahun", F3(Q.bss_rerata_tahun)) : ""}${Q.tahun_bss_positif != null ? th("Tahun dengan BSS positif", `${fmt(Q.tahun_bss_positif)} dari ${fmt(Q.n_tahun)}`) : ""}
      ${A.tangkapan_pct != null ? th(`Kejadian tertangkap oleh alarm (ambang ${fmt(Q.ambang_alarm_pct)}%)`, fmt(A.tangkapan_pct) + "%") : ""}${A.alarm_palsu_pct != null ? th("Alarm yang palsu", fmt(A.alarm_palsu_pct) + "%") : ""}</tbody></table></div>` : "";
    /* kejadian nyata DIBI BNPB per kabupaten-bulan (ujibalik.py `kejadian`): angka apa adanya, termasuk yang buruk */
    const K = J.kejadian, kw = K?.aturan?.waspada, ksg = K?.aturan?.siaga, pc = x => x == null ? "–" : fmt(Math.round(x * 100)) + "%", nmP = p => p === "semua" ? "Seluruh periode" : p.replace("..", " sampai ");
    const baris = (n, o) => o ? `<tr><td>${esc(nmP(n))}</td><td class="n num">${pc(o.pod)}</td><td class="n num">${pc(o.far)}</td><td class="n num">${o.csi != null ? F3(o.csi) : "–"}</td><td class="n num">${o.csi_acak != null ? F3(o.csi_acak) : "–"}</td></tr>` : "";
    const tk = kw?.semua ? `<div class="tw"><table class="kl-tb"><thead><tr><th>Kabupaten-bulan vs ${fmt(K.dibi_dalam_periode)} kejadian kering DIBI BNPB (${esc(K.periode_data.map(blnIso).join(" sampai "))})</th><th class="n">Tertangkap (POD)</th><th class="n">Alarm palsu (FAR)</th><th class="n">CSI</th><th class="n">CSI alarm acak</th></tr></thead><tbody>
      <tr><td colspan="5"><span class="pill" style="background:oklch(25.5% .075 256);color:#fff">${AMBANG_PIL()}</span></td></tr>
      <tr><td colspan="5"><b>Waspada atau lebih (SPI-3 ≤ −1)</b></td></tr>${Object.entries(kw).map(([n, o]) => baris(n, o)).join("")}${ksg ? `<tr><td colspan="5"><b>Siaga atau lebih (SPI-3 ≤ −1,5)</b></td></tr>${Object.entries(ksg).map(([n, o]) => baris(n, o)).join("")}` : ""}</tbody></table></div>
      <p class="fnd" style="margin:8px 2px 0">${K.vonis?.layak ? "Lolos kriteria di semua periode uji." : `Belum layak: POD di bawah ${Math.round(K.kriteria_layak.pod_min * 100)}% dan FAR di atas ${Math.round(K.kriteria_layak.far_maks * 100)}% pada tiap periode uji.`} Hanya bagian SPI-3 yang diuji (tanah dan HTH tak punya riwayat harian); SPI-3 pada bulan kejadian adalah diagnosis serentak, bukan prakiraan; ambang tidak disetel pada kejadian ini. DIBI hanya mencatat laporan BPBD, jadi alarm palsu di sini batas atas.</p>` : "";
    const kal = kw?.semua ? `; terhadap kejadian DIBI aturan menangkap ${this.hl(pc(kw.semua.pod))} kabupaten-bulan berkejadian dan ${this.hl(pc(kw.semua.far))} alarmnya tanpa laporan (${K.vonis?.layak ? "ambang layak" : "ambang tetap hipotesis"})` : "";
    Kartu.leg([[MERAH, "tahun yang menonjol dari tahun netral"], ["#9aa4b2", "tahun tidak menonjol"], [BIRU, "rerata tahun netral"]]);
    return this.ex(`Aturan SPI-3 hanya menonjol pada ${this.hl(men.length ? men.join(", ") : "tidak satu pun tahun")}: ${fmt(Math.round(men.length ? v(men[0]) : nt.rerata))}% sel Waspada ke atas pada ${nm}${lain.length ? `, sedangkan ${lain.map(t => `${t} hanya ${fmt(Math.round(v(t)))}%`).join(" dan ")}` : ""} (tahun netral rerata ${fmt(Math.round(nt.rerata))}%)${kal}${A ? `; model cadangan ENSO ${A.bss <= 0 ? "tanpa keterampilan" : "dengan keterampilan kecil"} (BSS ${this.hl(F3(A.bss))})` : ""}`, "", "",
      `<svg viewBox="0 0 ${W} ${rows.length * rh + 6}" role="img" aria-label="Uji balik aturan SPI-3">${g}</svg>${tk}${tb}`,
      `Uji ${esc((J.periode || []).join("–"))}, klimatologi ${esc((J.klimatologi || []).join("–"))}; prakiraan SEAS5 sendiri belum diuji (hindcast tidak tersedia). Sumber: Pantau Bencana${K ? ", DIBI BNPB" : ""}`); },

  /* 8. gambut konsesi mengering: penghubung ke Karhutla */
  exGambut() {
    const G = S.bukti?.gambut; if (!G?.n_kering) return "";
    const pv = Object.entries(G.prov || {}).sort((a, b) => b[1] - a[1]), U = this.uk(), W = U.W, L = U.L, rh = 30, mx = Math.max(1, ...pv.map(x => x[1])), X = v => v / mx * (W - L - 80);
    const g = pv.map(([k, n], i) => { const y = i * rh;
      return `<g data-prov="${esc(k)}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(U.nm(k))}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(n))}" height="${rh - 10}" fill="#7a4a2c" data-tip="<b>${esc(namaProv(k))}</b><br>${fmt(n)} kompleks konsesi berlahan gambut di sel Siaga atau Awas"/><g class="gf" style="--i:${i}">${this.p(L + X(n) + 8, y + 5, fmt(n), "#7a4a2c")[0]}</g></g>`; }).join("");
    const R = (G.daftar || []).map(d => ({...d, nm: d.id})), kol = [{k: "nm", h: "Kompleks", v: r => r.nm, s: r => `<b translate="no">${esc(r.nm)}</b>`}, {k: "prov", h: "Provinsi", v: r => namaProv(r.prov), s: r => `<span translate="no">${esc(namaProv(r.prov))}</span>`},
      {k: "lv", h: "Status", v: r => r.lv, s: r => pill(r.lv)}, {k: "dc", h: "DC", n: 1, v: r => r.dc, s: r => r.dc != null ? fmt(r.dc) : "–"}, {k: "spi", h: "SPI-3", n: 1, v: r => r.spi3, s: r => r.spi3 != null ? F2(r.spi3) : "–"}, {k: "titik", h: "Titik panas tercatat", n: 1, v: r => r.titik, s: r => fmt(r.titik)}];
    Kartu.leg([["#7a4a2c", "kompleks konsesi berlahan gambut di sel Siaga atau Awas"]]);
    const dcMaks = Math.max(0, ...R.map(r => r.dc || 0));
    return this.ex(`${this.hl(fmt(G.n_kering) + " dari " + fmt(G.n_gambut) + " kompleks konsesi")} berlahan gambut berada di sel kekeringan Siaga atau Awas${dcMaks ? `, DC tertinggi ${this.hl(fmt(dcMaks))}` : ""}`, "", "",
      `<svg viewBox="0 0 ${W} ${pv.length * rh + 6}" role="img" aria-label="Konsesi gambut mengering per provinsi">${g}</svg>` + (R.length ? this.tabel("gambut", kol, R, r => `data-prov="${esc(r.prov)}"`, 8, `kompleks teratas (dari ${fmt(G.n_kering)} di sel Siaga atau Awas)`) : "") + `<p style="margin:12px 2px 0"><a href="../">Lihat titik panas dan konsesi di halaman Karhutla</a></p>`,
      `Indikator kasar per sel 0,5°, tanpa data tinggi muka air gambut; kompleks tanpa nama. Sumber: Pantau Bencana, konsesi dan titik panas dari halaman Karhutla`); },

  /* 9. kabupaten kandidat sering kering: temuan jujur, tanpa menyebut satu pun "berulang" bila ujinya tak lolos */
  exBerulang() {
    const B = S.bukti?.berulang, R = (B?.daftar || []).map(d => ({...d, nm: d.kab.split("|")[1], pv: d.kab.split("|")[0]})); if (!B || !R.length) return "";
    const nT = +String(B.tahun || "").split("-")[1] - +String(B.tahun).split("-")[0] + 1 || 35, nb = B.n_berulang ?? R.filter(r => r.berulang).length, cek = B.n_cek_lapangan ?? R.filter(r => r.cek_lapangan).length;
    const kol = [{k: "nm", h: "Kabupaten/kota", v: r => r.nm, s: r => `<b translate="no">${esc(r.nm)}</b>`}, {k: "prov", h: "Provinsi", v: r => namaProv(r.pv), s: r => `<span translate="no">${esc(namaProv(r.pv))}</span>`},
      {k: "tahun", h: `Tahun kering (dari ${nT})`, n: 1, v: r => r.tahun, s: r => `${fmt(r.tahun)}${r.berulang ? ' <em class="pill l3">melebihi acak</em>' : ""}`}, ...(R.some(r => r.p != null) ? [{k: "p", h: "p (acak)", n: 1, v: r => r.p, s: r => r.p != null ? F3(r.p) : "–"}] : []),
      {k: "emb", h: "Tampungan OSM per 100.000 jiwa", n: 1, v: r => r.per100rb, s: r => r.per100rb != null ? `${F1(r.per100rb)}${r.cek_lapangan ? " <small>cek lapangan</small>" : ""}` : "–"},
      ...(R.some(r => r.irbi != null) ? [{k: "irbi", h: "IRBI 2025", n: 1, v: r => r.irbi, s: r => r.irbi != null ? `${fmt(r.irbi)}${r.irbi_arah ? ` <small>${esc(r.irbi_arah)}</small>` : ""}` : "–"}] : [])];
    return this.ex(`${this.hl(fmt(nb) + " kabupaten")} kering lebih sering dari peluang acak di antara ${fmt(B.n_kab ?? R.length)} kandidat yang SPI-3 ${esc(B.jendela || "")} ≤ ${F1(B.ambang_spi3).replace("-", "−")} pada ${fmt(B.min_tahun)} tahun atau lebih (${esc(B.tahun || "")})${cek ? `; ${fmt(cek)} kandidat bertampungan OSM sedikit, perlu cek lapangan` : ""}`, "", "",
      this.tabel("berulang", kol, R, r => `data-kab="${esc(r.kab)}"`, 10, "kabupaten/kota"),
      `Kandidat = kering ${fmt(B.min_tahun)} tahun atau lebih; "melebihi acak" bila jumlah tahun keringnya lebih banyak dari dugaan peluang acak${B.alfa != null ? ` (p di bawah ${F3(B.alfa)})` : ""}. Tampungan OSM kasar dan tidak lengkap, jadi nol bukan bukti kekurangan; rincian di Metode. Sumber: Pantau Bencana (NASA POWER), OpenStreetMap (ODbL), InaRISK BNPB`); },

  gambar(id) { const f = this["ex" + id[0].toUpperCase() + id.slice(1)]; Kartu._leg = null;
    try { const h = f.call(this).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${this.LABEL[id] || ""}</span>`); return ["kabupaten", "jiwa", "tabel"].includes(id) ? beriAmbang(h) : h; } catch (e) { console.error(e); return ""; } },
  pasangUrut(box) { const th = box.querySelector("thead"), st = this.T[box.dataset.ex]; if (th && st) pengurutKepala(st, th, () => this.ulang(box)); },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); this.pasangUrut(box); }); },
  render() {
    const el = $("#insight");
    if (this.pel === undefined) { this.pel = null; if (typeof Peluang !== "undefined") Peluang.muat("../banjir/data/kering_peluang.json").then(d => { if (d) { this.pel = d; if (el.isConnected) this.render(); } }); }
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).filter(h => h.includes("<article")).join("");
    el.querySelectorAll("[data-ex]").forEach(b => this.pasangUrut(b));
    if (!el.innerHTML) el.innerHTML = `<p class="kosong">Belum ada data kekeringan.</p>`;
    else el.insertAdjacentHTML("beforeend", `<div class="kl-tautan"><a href="simulasi.html">Simulasi neraca air 180 hari</a><a href="laporan.html">Laporan harian</a></div>`);
    el.onchange = e => { const s = e.target.closest("select[data-set]"); if (s) { this.st[s.dataset.set] = s.value; this.ulang(s.closest("[data-ex]")); } };
    el.onclick = e => {
      const s = e.target.closest("[data-set]:not(select)"); if (s) { this.st[s.dataset.set] = s.dataset.v; s.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === s)); return this.ulang(s.closest("[data-ex]")); }
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; box.querySelectorAll(".pgn-b[data-h]").forEach(x => { const on = x === pg; if (!x.textContent.match(/[‹›]/)) { x.classList.toggle("on", on); on ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current"); } }); this.ulang(box); } return; }
      const pv = e.target.closest("[data-prov]"); if (pv) { bukaTab("peta"); return turun(pv.dataset.prov); }
      const kb = e.target.closest("[data-kab]"); if (kb) { const p = kb.dataset.kab.split("|"); S.jalur = [p[0]]; bukaTab("peta"); nanti(() => Peta.aturWilayah().then(() => Analisa.wilayah(kb.dataset.kab))); return; } };
  },
};
