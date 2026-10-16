"use strict";
/* chrome urgen: halaman aktif langsung berpindah, isi tabel menyusul di ulang() */
const halUrgen = (pg, box) => { const h = pg.dataset.h; box.querySelectorAll(".pgn-b").forEach(x => { if (!/^\d+$/.test(x.textContent)) return; const on = x.dataset.h === h; x.classList.toggle("on", on); on ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current"); }); };
/* ================================================================ insight */
/* Kartu Insight cuaca ekstrem: anatomi sama dengan karhutla dan banjir (pil kategori, judul satu kalimat dengan angka merah, grafik berangka,
   legenda tengah dan "Sumber:"), mesin kartu dari public/inti. Kartu tanpa isi dibuang (A18); ikon bagikan dari mesin Bagikan. */
Tip.polaSatu = /^([\d.,]+(?:\s?(?:rb|jt))?\s+(?:kecamatan|perairan|mm|km\/jam|titik))$/;
if (!window.__pilihPasang) { window.__pilihPasang = 1; PilihCantik.pasang(); }
const NAVY = "oklch(25.5% .075 256)", BIRU = "#4f8fc4", HIJAU = "#2b8c86";
const warnaHujan = v => v >= 150 ? WARNA_LV[3] : v >= 100 ? WARNA_LV[2] : v >= 50 ? "#c99a1e" : BIRU;
const warnaAngin = v => v >= 90 ? WARNA_LV[3] : v >= 72 ? WARNA_LV[2] : v >= 54 ? "#c99a1e" : HIJAU;
const IK = {nowcast: '<path d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/><path d="m12 13-2 5h2.5l-1 4 4-6h-2.5l1.5-3z"/>', gelombang: '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2"/>',
  hujan: '<path d="M7 14a4 4 0 0 1-.5-8A6 6 0 0 1 18 5a4 4 0 0 1-1 9"/><path d="M8 17v3M12 16v4M16 17v3"/>', angin: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  ansambel: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', provinsi: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'};

const Insight = {
  /* tabel provinsi: urut menurun menurut hujan, 10 baris per halaman */
  T: {provinsi: {urut: "hujan", turun: true, hal: 0}},
  EX: ["nowcast", "gelombang", "hujan", "angin", "ansambel", "provinsi"],
  LABEL: {nowcast: "Nowcast BMKG", gelombang: "Gelombang", hujan: "Hujan", angin: "Angin", ansambel: "Ansambel", provinsi: "Provinsi"},
  ex: (...a) => Kartu.ex(...a), hl: Kartu.hl, pil: Kartu.pil,
  uk() { const M = innerWidth < 640; return M ? {M, W: 520, L: 130, rh: 30, fs: 13} : {M, W: 940, L: 260, rh: 30, fs: 13}; },
  kapan: t => t.ini ? "hari ini" : t.i === S.h0 + 1 ? "besok" : `pada <span translate="no">${t.label}</span>`,
  pendek: (t, n) => t.length > n ? t.slice(0, n - 1) + "…" : t,
  nm: k => `<span translate="no">${esc(namaProv(k))}</span>`,

  /* batang mendatar per baris: [{label, nilai, warna, tip, teks}] */
  batangH(R, U) {
    const {W, L, rh} = U, mx = Math.max(1, ...R.map(r => r.nilai)), X = v => v / mx * (W - L - 80);
    return `<svg viewBox="0 0 ${W} ${R.length * rh + 6}" role="img">${R.map((r, i) => { const y = i * rh, bw = Math.max(3, X(r.nilai));
      return `<g><text translate="no" x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(this.pendek(r.label, U.M ? 16 : 36))}</text>
        <rect x="${L}" y="${y + 5}" width="${bw}" height="${rh - 10}" rx="4" fill="${r.warna}" data-tip="${esc(r.tip)}"/>${Kartu.pil(L + bw + 8, y + 5, r.teks, r.warna, r.fg || "#fff")[0]}</g>`; }).join("")}</svg>`; },
  /* batang bertumpuk mendatar: seg = [{nilai, warna}] per baris */
  tumpukH(R, U) {
    const {W, L, rh} = U, mx = Math.max(1, ...R.map(r => r.seg.reduce((a, s) => a + s.nilai, 0))), X = v => v / mx * (W - L - 80);
    return `<svg viewBox="0 0 ${W} ${R.length * rh + 6}" role="img">${R.map((r, i) => { let acc = 0; const y = i * rh, tot = r.seg.reduce((a, s) => a + s.nilai, 0);
      return `<g><text translate="no" x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(this.pendek(r.label, U.M ? 16 : 36))}</text>`
        + r.seg.map(s => { const bw = X(s.nilai); if (!bw) return ""; const o = `<rect x="${L + acc}" y="${y + 5}" width="${bw}" height="${rh - 10}" fill="${s.warna}" data-tip="${esc(s.tip)}"/>`; acc += bw; return o; }).join("")
        + Kartu.pil(L + acc + 8, y + 5, fmt(tot), r.warna, "#fff")[0] + "</g>"; }).join("")}</svg>`; },
  /* batang tegak per hari: nilai di atas batang (A8), garis ambang putus-putus */
  batangV(D, ambang, satuan, fmtNilai = v => fmt(Math.round(v))) {
    const U = this.uk(), W = U.W, H = 200, B = H - 28, mx = Math.max(ambang.at(-1) * 1.05, ...D.map(d => d.nilai)), Y = v => B - v / mx * (B - 20), gap = W / D.length;
    const g = ambang.map(a => `<line x1="0" x2="${W}" y1="${Y(a)}" y2="${Y(a)}" stroke="currentColor" stroke-dasharray="4 3" opacity=".35"/><text x="${W}" y="${Y(a) - 4}" text-anchor="end" font-size="11" opacity=".6">${a} ${satuan}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img">${g}${D.map((d, i) => { const h = Math.max(2, B - Y(d.nilai)), x = i * gap + gap * .2;
      return `<rect x="${x}" y="${B - h}" width="${gap * .6}" height="${h}" rx="5" fill="${d.warna}" data-tip="${esc(d.tip)}"/><text x="${x + gap * .3}" y="${B - h - 6}" text-anchor="middle" font-size="13" font-weight="700">${fmtNilai(d.nilai)}</text>
        <text x="${x + gap * .3}" y="${H - 8}" text-anchor="middle" font-size="${U.M ? 10.5 : 12}" font-weight="${d.ini ? 800 : 500}">${d.label}</text>`; }).join("")}</svg>`; },
  /* prakiraan per hari: terbesar dari semua sel */
  maksHari(idx, col) { let m = {v: 0, r: null}; for (const r of S.pr.sel) { const v = r[col][idx]; if (v != null && v > m.v) m = {v, r}; } return m; },

  exNowcast() {
    const A = [...S.nc].sort((a, b) => b.n - a.n).slice(0, 12); if (!S.per) return "";
    const nProv = new Set(S.nc.flatMap(a => a.prov)).size, nKec = S.nc.reduce((a, x) => a + x.n, 0);
    Kartu.leg(Object.entries(WARNA_SEV).filter(([k]) => S.nc.some(a => a.severity === k)).map(([k, w]) => [w, k]));
    return this.ex(A.length ? `${this.hl(fmt(nKec) + " kecamatan")} di ${this.hl(fmt(nProv) + " provinsi")} dalam peringatan nowcast BMKG yang berlaku` : `Tidak ada peringatan nowcast BMKG yang berlaku`, "", "",
      A.length ? this.batangH(A.map(a => ({label: innerWidth < 640 ? a.headline.split(" di ").pop() : a.headline, nilai: a.n, warna: sevWarna(a.severity), teks: fmt(a.n), tip: `<b>${esc(a.event)}</b> · ${esc(a.severity)}<br>Kecamatan: ${a.n} kecamatan<br>${waktuBerlaku(a.mulai, a.selesai)}`})), this.uk()) : "",
      `Sumber: BMKG, terbit ${jamWIB(S.per.dibuat)}`); },
  exGelombang() {
    const A = [...S.gl].sort((a, b) => b.lv - a.lv || b.total - a.total).slice(0, 15); if (!S.per) return "";
    const nPer = S.gl.reduce((a, o) => a + o.total, 0);
    Kartu.leg(GEL.filter((k, i) => S.gl.some(o => o.kelas[i])).map(k => [k[3], `${k[1]} ${k[2]}`]));
    return this.ex(A.length ? `${this.hl(fmt(S.gl.length) + " provinsi")} dalam peringatan gelombang tinggi BMKG, ${this.hl(fmt(nPer) + " perairan")}` : `Tidak ada peringatan gelombang BMKG yang berlaku`, "", "",
      A.length ? this.tumpukH(A.map(o => ({label: namaProv(o.prov), warna: GEL[o.lv - 1][3], seg: GEL.map((k, i) => ({nilai: o.kelas[i], warna: k[3], tip: `<b>${esc(namaProv(o.prov))}</b><br>${k[1]}: ${o.kelas[i]} perairan`})).reverse()})), this.uk()) : "",
      `Sumber: BMKG Maritim, terbit ${jamWIB(S.per.dibuat)}`); },
  exHujan() {
    const D = hariTampil().map(i => { const m = this.maksHari(i, 3), h = S.meta.hitung[i]; return {i, nilai: m.v, r: m.r, label: labelHari(i), ini: i === S.h0, warna: warnaHujan(m.v),
      tip: `<b>${labelHari(i)}</b><br>Terlebat: ${fmt(Math.round(m.v))} mm<br>Sel ≥ 50 mm: ${fmt(h.hujan.reduce((a, b) => a + b, 0))} sel`}; });
    const t = D.reduce((a, d) => d.nilai > a.nilai ? d : a, D[0]); if (!t || !t.r) return "";
    Kartu.leg([[BIRU, "di bawah 50 mm"], ["#c99a1e", "lebat"], [WARNA_LV[2], "sangat lebat"], [WARNA_LV[3], "ekstrem"]]);
    return this.ex(t.nilai >= AMB().hujan[0] ? `Hujan ${KELAS_HUJAN[tingkat(t.nilai, AMB().hujan)]} ${this.hl(fmt(Math.round(t.nilai)) + " mm")} diprakirakan di ${this.nm(t.r[2])} ${this.kapan(t)}`
      : `Belum ada hujan 50 mm atau lebih diprakirakan; terlebat ${this.hl(fmt(Math.round(t.nilai)) + " mm")} di ${this.nm(t.r[2])} ${this.kapan(t)}`, "", "", this.batangV(D, AMB().hujan, "mm"), `Sumber: Open-Meteo`); },
  exAngin() {
    const D = hariTampil().map(i => { const m = this.maksHari(i, 4), h = S.meta.hitung[i]; return {i, nilai: m.v, r: m.r, label: labelHari(i), ini: i === S.h0, warna: warnaAngin(m.v),
      tip: `<b>${labelHari(i)}</b><br>Terkuat: ${fmt(Math.round(m.v))} km/jam<br>Sel ≥ 54 km/jam: ${fmt(h.angin.reduce((a, b) => a + b, 0))} sel`}; });
    const t = D.reduce((a, d) => d.nilai > a.nilai ? d : a, D[0]); if (!t || !t.r) return "";
    Kartu.leg([[HIJAU, "di bawah 54 km/jam"], ["#c99a1e", "waspada"], [WARNA_LV[2], "siaga"], [WARNA_LV[3], "awas"]]);
    return this.ex(`Embusan angin terkuat ${this.hl(fmt(Math.round(t.nilai)) + " km/jam")} diprakirakan di ${this.nm(t.r[2])} ${this.kapan(t)}`, "", "", this.batangV(D, AMB().angin_kmj, "km/jam"), `Sumber: Open-Meteo`); },
  exAnsambel() {
    const D = hariTampil().map(i => { let p = 0, r = null; for (const e of S.pr.ens) { const v = e[3][i]; if (v != null && v > p) { p = v; r = e; } }
      return {i, nilai: Math.round(p * 100), r, ada: S.pr.ens.some(e => e[3][i] != null), label: labelHari(i), ini: i === S.h0, warna: p >= .5 ? WARNA_LV[3] : p >= .25 ? WARNA_LV[2] : BIRU,
        tip: `<b>${labelHari(i)}</b><br>Peluang tertinggi: ${Math.round(p * 100)}%<br>Titik di atas 50%: ${S.meta.hitung[i].ens} titik`}; }).filter(d => d.ada);
    const t = D.reduce((a, d) => d.nilai > a.nilai ? d : a, D[0]); if (!t || t.nilai < 10) return "";
    Kartu.leg([[BIRU, "di bawah 25%"], [WARNA_LV[2], "25% sampai 50%"], [WARNA_LV[3], "50% atau lebih"]]);
    return this.ex(`Peluang hujan 50 mm atau lebih sampai ${this.hl(t.nilai + "%")} di ${this.nm(t.r[2])} ${this.kapan(t)}`, "", "", this.batangV(D, [25, 50], "%", v => v + "%"), `Sumber: ECMWF IFS ansambel 51 anggota via Open-Meteo`); },
  exProvinsi() {
    const hari = hariTampil(), P = {};
    for (const r of S.pr.sel) { const p = P[r[2]] ||= {k: r[2], hujan: 0, angin: 0, pel: 0, nc: 0, gl: 0};
      for (const i of hari) { p.hujan = Math.max(p.hujan, r[3][i] || 0); p.angin = Math.max(p.angin, r[4][i] || 0); } }
    for (const e of S.pr.ens) if (P[e[2]]) for (const i of hari) P[e[2]].pel = Math.max(P[e[2]].pel, e[3][i] || 0);
    for (const a of S.nc) for (const k of a.prov) if (P[k]) P[k].nc += a.n;
    for (const o of S.gl) if (P[o.prov]) P[o.prov].gl = o.lv;
    const R = Object.values(P), sinyal = R.filter(p => p.hujan >= AMB().hujan[0] || p.angin >= AMB().angin_kmj[0] || p.pel >= .5 || p.nc || p.gl).length;
    const pl = (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`;
    const kol = [{k: "prov", n: "Provinsi", v: r => namaProv(r.k), h: r => this.nm(r.k)},
      {k: "hujan", n: "Hujan terlebat", num: 1, v: r => r.hujan, h: r => pl(fmt(Math.round(r.hujan)) + " mm", warnaHujan(r.hujan))},
      {k: "angin", n: "Embusan terkuat", num: 1, v: r => r.angin, h: r => pl(fmt(Math.round(r.angin)) + " km/jam", warnaAngin(r.angin))},
      ...(S.pr.ens.length ? [{k: "pel", n: "Peluang hujan lebat", num: 1, v: r => r.pel, h: r => pl(Math.round(r.pel * 100) + "%", r.pel >= .5 ? WARNA_LV[3] : r.pel >= .25 ? WARNA_LV[2] : BIRU)}] : []),
      ...(S.nc.length ? [{k: "nc", n: "Nowcast BMKG", num: 1, v: r => r.nc, h: r => r.nc ? pl(fmt(r.nc) + " kecamatan", WARNA_LV[2]) : "–"}] : []),
      ...(S.gl.length ? [{k: "gl", n: "Gelombang", v: r => r.gl, h: r => r.gl ? pilGel(r.gl - 1) : "–"}] : [])];
    return this.ex(`${this.hl(fmt(sinyal) + " provinsi")} punya hujan lebat, embusan kencang, atau peringatan BMKG dalam ${hari.length} hari`, "", "", this.tabel("provinsi", kol, R, 10, "provinsi"),
      `Sumber: Open-Meteo, ECMWF, BMKG`); },
  tabel(id, kol, baris, per, satuan) {
    const st = this.T[id], s = st.turun ? -1 : 1, kk = kol.find(c => c.k === st.urut) || kol[1];
    const R = [...baris].sort((a, b) => { const x = kk.v(a), y = kk.v(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / per) - 1));
    const hal = R.slice(st.hal * per, (st.hal + 1) * per);
    return `<div class="tw"><table><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${hal.map(r => `<tr class="klik">${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, R.length, per, satuan)}`; },

  /* satu kartu: label pil berikon di kepala; ikon bagikan dipasang mesin Bagikan (public/bagikan.js) */
  gambar(id) { Kartu._leg = null;
    try { const h = this["ex" + id[0].toUpperCase() + id.slice(1)](); if (!h) return "";
      return h.replace('<span class="ex-ey"></span>', `<span class="ex-ey"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[id]}</svg>${this.LABEL[id]}</span>`);
    } catch (e) { console.error(e); return ""; } },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); },
  async render() {
    const el = $("#insight");
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("");
    el.onclick = e => {
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; halUrgen(pg, box); this.ulang(box); } return; }
      const th = e.target.closest("th button[data-k]"); if (th) { const box = th.closest("[data-ex]"), st = this.T[box.dataset.ex], k = th.dataset.k;
        st.turun = st.urut === k ? !st.turun : true; st.urut = k; st.hal = 0;
        box.querySelectorAll("th").forEach(h => { const b = h.querySelector("button"), on = b === th; h.setAttribute("aria-sort", on ? (st.turun ? "descending" : "ascending") : "none"); b.querySelector("i").textContent = on ? (st.turun ? "↓" : "↑") : ""; });
        this.ulang(box); } };
  },
};
