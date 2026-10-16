"use strict";
/* ================================================================ insight */
/* Kartu Insight kekeringan: anatomi sama dengan karhutla/banjir (pil kategori, judul satu kalimat berangka merah, grafik, legenda + "Sumber:", bisa dibagikan).
   Mesin kartu dari public/inti (Kartu.ex/pil/seg, paginasi, pengurutKepala); di sini hanya data kekeringan dan gambar SVG-nya. */
Tip.polaSatu = /^([\d.,]+(?:\s?(?:rb|jt))?\s+(?:kabupaten|jiwa|kecamatan))$/;
if (!window.__pilihPasang) { window.__pilihPasang = 1; PilihCantik.pasang(); }
const SUMBER = "Deteksi Pantau Bencana (NASA POWER, ECMWF, ERA5-Land), penduduk WorldPop";
const tanda = v => (v > 0 ? "+" : v < 0 ? "−" : "") + F2(Math.abs(v));

const Insight = {
  st: {jiwa: "3"},
  EX: ["kabupaten", "jiwa", "enso", "tabel"],
  LABEL: {kabupaten: "Kabupaten/kota", jiwa: "Jiwa", enso: "El Niño", tabel: "Paling kering"},
  T: {tabel: {urut: "_", turun: true, hal: 0}},
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
      return `<g data-prov="${x.k}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(U.nm(x.k))}</text>`
        + x.n.map((n, j) => { const bw = X(n); if (!bw) return ""; const s = `<rect class="gx" style="--i:${i}" x="${L + acc}" y="${y + 5}" width="${bw}" height="${rh - 10}" fill="${WARNA_LV[3 - j]}" data-tip="${tip}"/>`; acc += bw; return s; }).join("")
        + `<g class="gf" style="--i:${i}">${this.p(L + acc + 8, y + 5, fmt(tot), WARNA_LV[x.n[0] ? 3 : x.n[1] ? 2 : 1], FG_LV[x.n[0] ? 3 : x.n[1] ? 2 : 1])[0]}</g></g>`; }).join("");
    Kartu.leg([[WARNA_LV[3], "Awas · kering ekstrem"], [WARNA_LV[2], "Siaga"], [WARNA_LV[1], "Waspada"]]);
    return this.ex(t[2] ? `${this.hl(fmt(t[2]) + " kabupaten/kota")} kering ekstrem di ${fmt(N.prov_n[2])} provinsi, ${fmt(t[1])} siaga, ${fmt(t[0])} waspada`
        : `Belum ada kabupaten/kota kering ekstrem; ${this.hl(fmt(t[1] + t[0]) + " kabupaten/kota")} siaga atau waspada`, "", "",
      `<svg viewBox="0 0 ${W} ${pv.length * rh + 6}" role="img" aria-label="Kabupaten kering per provinsi">${g}</svg>`, `Sumber: ${SUMBER}`); },

  /* 2. jiwa di kecamatan kering, per provinsi */
  exJiwa() {
    const N = S.meta.nasional, m = +this.st.jiwa, U = this.uk(); if (!N.jiwa[0]) return "";
    const pv = Object.entries(S.wil.prov).map(([k, v]) => ({k, n: v.jiwa[m - 1], t: v.total})).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 15);
    if (!pv.length) return "";
    const {W, L, rh} = U, mx = Math.max(1, ...pv.map(x => x.n)), X = v => v / mx * (W - L - 90);
    const g = pv.map((x, i) => { const y = i * rh, tip = `<b>${esc(namaProv(x.k))}</b><br>${rb(x.n)} jiwa<br>${fmt(Math.round(x.n / x.t * 100))}% penduduk provinsi`;
      return `<g data-prov="${x.k}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(U.nm(x.k))}</text>
        <rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(x.n))}" height="${rh - 10}" fill="${WARNA_LV[m]}" data-tip="${tip}"/>
        <g class="gf" style="--i:${i}">${this.p(L + X(x.n) + 8, y + 5, rb(x.n), WARNA_LV[m], FG_LV[m])[0]}</g></g>`; }).join("");
    const nama = ["waspada kekeringan atau lebih", "siaga kekeringan atau lebih", "kering ekstrem"][m - 1];
    Kartu.leg([[WARNA_LV[m], "jiwa di kecamatan " + ["waspada ke atas", "siaga ke atas", "awas"][m - 1]]]);
    return this.ex(`${this.hl(rb(N.jiwa[m - 1]) + " jiwa")} tinggal di kecamatan ${nama}, ${fmt(Math.round(N.jiwa[m - 1] / N.total * 100))}% penduduk`, "", "",
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
    return this.ex(`${E.status} ${kuat}: ONI ${this.hl(tanda(E.oni))} (${E.musim} ${E.tahun})${E.peluang && E.hingga ? `; NOAA: ${this.hl(E.peluang + "%")} bertahan hingga ${E.hingga}` : ""}`, "", "",
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
      ...(ada("spi3") ? [{k: "spi", h: "SPI-3", n: 1, v: r => r.spi3, s: r => r.spi3 != null ? F2(r.spi3) : "–"}] : []),
      ...(ada("pct") ? [{k: "pct", h: "Tanah", n: 1, v: r => r.pct, s: r => r.pct != null ? fmt(r.pct) : "–"}] : []),
      ...(ada("dc") ? [{k: "dc", h: "DC", n: 1, v: r => r.dc, s: r => r.dc != null ? fmt(r.dc) : "–"}] : []),
      {k: "jiwa", h: "Jiwa kering", n: 1, v: r => r.jiwa[0], s: r => rb(r.jiwa[0])}];
    if (this.T.tabel.urut === "_") this.T.tabel.urut = "lv";
    return this.ex(`${this.hl(fmt(R.length) + " kabupaten/kota")} berstatus siaga atau awas kekeringan, ${this.hl(rb(R.reduce((a, r) => a + r.jiwa[0], 0)) + " jiwa")} di kecamatan kering`, "", "",
      this.tabel("tabel", kol, R, r => `data-kab="${esc(r.k)}"`, 10, "kabupaten/kota"), `Sumber: ${SUMBER}`); },

  gambar(id) { const f = this["ex" + id[0].toUpperCase() + id.slice(1)]; Kartu._leg = null;
    try { return f.call(this).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${this.LABEL[id] || ""}</span>`); } catch (e) { console.error(e); return ""; } },
  pasangUrut(box) { const th = box.querySelector("thead"), st = this.T[box.dataset.ex]; if (th && st) pengurutKepala(st, th, () => this.ulang(box)); },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); this.pasangUrut(box); pasangBagi(box, "insight"); }); },
  render() {
    const el = $("#insight");
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).filter(h => h.includes("<article")).join("");
    el.querySelectorAll("[data-ex]").forEach(b => this.pasangUrut(b)); pasangBagi(el, "insight");
    if (!el.innerHTML) el.innerHTML = `<p class="kosong">Belum ada data kekeringan.</p>`;
    el.onclick = e => {
      const s = e.target.closest("[data-set]"); if (s) { this.st[s.dataset.set] = s.dataset.v; return this.ulang(s.closest("[data-ex]")); }
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; this.ulang(box); } return; }
      const pv = e.target.closest("[data-prov]"); if (pv) { bukaTab("peta"); return turun(pv.dataset.prov); }
      const kb = e.target.closest("[data-kab]"); if (kb) { const p = kb.dataset.kab.split("|"); S.jalur = [p[0]]; bukaTab("peta"); return Peta.aturWilayah().then(() => Analisa.wilayah(kb.dataset.kab)); } };
  },
};
