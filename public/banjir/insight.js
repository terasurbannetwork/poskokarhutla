"use strict";
/* ================================================================ insight */
/* Kartu Insight banjir: rupa dan anatomi sama dengan Insight karhutla (pil kategori, judul satu kalimat berangka merah, pemilih di kanan judul,
   grafik, legenda tengah + "Sumber:"). Mesinnya dari public/inti (Kartu.ex/pil/seg/selProvMulti, PilihCantik, rapikanTip, paginasi, pengurutKepala);
   di sini hanya data banjir dan gambar SVG-nya. exMusim dan exDampak disembunyikan (pindah ke Tren dan Dampak) tapi fungsinya tetap ada, lihat window.InsightEx. */
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const NAVY = "oklch(25.5% .075 256)", HIJAU = "#2b8c86", MERAH = "#c9503a", BIRU = "#4f8fc4", FG_LV = ["#fff", "#3b2e00", "#fff", "#fff"];
Tip.polaSatu = /^([\d.,]+(?:\s?(?:rb|jt))?\s+(?:kecamatan|kejadian|mm))$/;   /* tooltip satu angka jadi label pil */
/* satu pemasangan PilihCantik untuk seluruh halaman (tab lain boleh ikut memakainya, jangan dipasang dua kali: klik jadi buka-tutup) */
if (!window.__pilihPasang) { window.__pilihPasang = 1; PilihCantik.pasang(); }

const Insight = {
  st: {status: "b", hari: 0, hujan: "h3", tren: "banjir", prak: "b", musim: "banjir", dampak: "meninggal", kab: "banjir", provKec: "", provPv: ""},
  /* urutan kartu; tabel kecamatan dan provinsi ikut sebagai kartu terakhir. musim/dampak/kab sengaja tidak di sini (disembunyikan, A24) */
  EX: ["kejadian", "status", "hujan", "sungai", "rob", "tren", "prakiraan", "kecamatan", "provinsi"],
  LABEL: {kejadian: "Kejadian", status: "Status", hujan: "Hujan", sungai: "Sungai", rob: "Rob", tren: "Riwayat 15 tahun", prakiraan: "Prakiraan", kecamatan: "Siaga dan awas", provinsi: "Provinsi",
    musim: "Musim", dampak: "Dampak", kab: "Langganan"},
  /* status tabel (urut, arah, halaman) per kartu bertabel */
  T: {kejadian: {urut: "_", turun: true, hal: 0}, kecamatan: {urut: "_", turun: true, hal: 0}, provinsi: {urut: "_", turun: true, hal: 0}},
  /* penghubung ke inti/kartu.js */
  ex: (...a) => Kartu.ex(...a),
  hl: Kartu.hl,
  pil: Kartu.pil,
  seg(key, opsi) { return Kartu.seg(key, opsi, this.st); },
  daftarProv: () => Object.keys(S.meta.provinsi).sort((a, b) => namaProv(a).localeCompare(namaProv(b))),
  selProvMulti(key) { return Kartu.selProvMulti(key, this.daftarProv(), namaProv, this.st); },
  selJenis(key, opsi, label) { return `<select data-set="${key}" aria-label="${label}">${opsi.map(([v, n]) => `<option value="${v}"${String(this.st[key]) === v ? " selected" : ""}>${n}</option>`).join("")}</select>`; },
  nm: k => `<span translate="no">${esc(namaProv(k))}</span>`,
  tgl: t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"}),
  pendek: k => namaProv(k).replace("Kalimantan", "Kal.").replace("Sumatera", "Sum.").replace("Sulawesi", "Sul.").replace("Nusa Tenggara", "NT").replace("Papua", "Pap."),
  /* ukuran gambar: di layar sempit viewBox dirapatkan supaya huruf tidak mengecil jadi tak terbaca */
  uk() { const M = innerWidth < 640; return M ? {M, W: 520, L: 120, rh: 30, fs: 14, nm: k => this.pendek(k)} : {M, W: 940, L: 190, rh: 30, fs: 13, nm: k => namaProv(k)}; },
  /* pil SVG: [markup, lebar] */
  p(x, y, t, bg, fg = "#fff", fs = 12) { return Kartu.pil(x, y, t, bg, fg, fs); },
  pl: (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`,
  warnaHujan: v => v >= 150 ? MERAH : v >= 100 ? "#e58a45" : v >= 50 ? "#c99a1e" : BIRU,

  /* 0. kejadian aktif (gugus kecamatan bersebelahan berstatus siaga atau awas, scripts/banjir/kejadian_aktif.py); tanpa berkas atau kosong = kartu tidak tampil */
  exKejadian() {
    const A = this.aktif?.kejadian; if (!A?.length) return "";
    const nKec = A.reduce((a, e) => a + (e.n_kec || e.kec.length), 0), nProv = new Set(A.flatMap(e => e.prov || [])).size;
    const kol = [{k: "kode", n: "Kode", v: r => r.kode, h: r => `<b>${esc(r.kode)}</b>`}, {k: "kec", n: "Kecamatan", v: r => r.kec[0].split("|")[2], h: r => esc(r.kec[0].split("|")[2])},
      {k: "kab", n: "Kab/Kota", v: r => r.kec[0].split("|")[1], h: r => esc(r.kec[0].split("|")[1])}, {k: "prov", n: "Provinsi", v: r => namaProv(r.prov?.[0] || r.kec[0].split("|")[0]), h: r => esc(namaProv(r.prov?.[0] || r.kec[0].split("|")[0]))},
      {k: "n", n: "Kecamatan terdampak", num: 1, v: r => r.n_kec || r.kec.length, h: r => fmt(r.n_kec || r.kec.length)},
      {k: "lv", n: "Status", v: r => r.level_tertinggi, h: r => pill(r.level_tertinggi)},
      ...(A.some(r => r.penduduk != null) ? [{k: "pend", n: "Penduduk", num: 1, v: r => r.penduduk ?? -1, h: r => r.penduduk != null ? rb(r.penduduk) + " jiwa" : "–"}] : []),
      ...(A.some(r => r.h3_mm != null) ? [{k: "h3", n: "Hujan 3 hari", num: 1, v: r => r.h3_mm ?? -1, h: r => r.h3_mm != null ? this.pl(fmt(Math.round(r.h3_mm)) + " mm", this.warnaHujan(r.h3_mm)) : "–"}] : []),
      {k: "skor", n: "Skor", num: 1, v: r => r.skor ?? -1, h: r => r.skor != null ? this.pl(fmt(Math.round(r.skor)), NAVY) : "–"}];
    return this.ex(`${this.hl(fmt(A.length) + " kejadian")} banjir aktif melanda ${this.hl(fmt(nKec) + " kecamatan")} di ${fmt(nProv)} provinsi hari ini`, "", "",
      this.tabel("kejadian", kol, A, r => `data-kej="${esc(r.kode)}"`, 5, "kejadian", r => r.skor ?? -1), `Sumber: Open-Meteo, GloFAS, InaRISK`); },

  /* 1. status per provinsi untuk hari terpilih */
  exStatus() {
    const U = this.uk(), b = this.st.status, h = +this.st.hari, ag = agregat(b, h), nama = NAMA_B[b], kapan = h ? `<span translate="no">${tglPendek(S.st.hari[h])}</span>` : "hari ini";
    const jml = a => a.n[1] + a.n[2] + a.n[3], skor = a => a.n[3] * 1e6 + a.n[2] * 1e3 + a.n[1];
    const pv = Object.keys(S.meta.provinsi).map(k => ({k, a: ag[k]})).filter(x => x.a).sort((x, y) => skor(y.a) - skor(x.a)).slice(0, 15);
    const nLv = l => Object.values(S.st.kec).filter(v => (v[b]?.[h] || 0) === l).length, sa = nLv(3) + nLv(2), w = nLv(1);
    const {W, L, rh} = U, mx = Math.max(1, ...pv.map(x => jml(x.a))), X = v => v / mx * (W - L - 70);
    const g = pv.map((x, i) => { let acc = 0, y = i * rh;
      const tip = `<b>${esc(namaProv(x.k))}</b><br>Awas: ${fmt(x.a.n[3])} kecamatan<br>Siaga: ${fmt(x.a.n[2])} kecamatan<br>Waspada: ${fmt(x.a.n[1])} kecamatan`;
      return `<g data-prov="${x.k}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(U.nm(x.k))}</text>`
        + [3, 2, 1].map(l => { const bw = X(x.a.n[l]); if (!bw) return ""; const s = `<rect class="gx" style="--i:${i}" x="${L + acc}" y="${y + 5}" width="${bw}" height="${rh - 10}" fill="${WARNA_LV[l]}" data-tip="${tip}"/>`; acc += bw; return s; }).join("")
        + `<g class="gf" style="--i:${i}">${this.p(L + acc + 8, y + 5, fmt(jml(x.a)), WARNA_LV[x.a.lv], FG_LV[x.a.lv])[0]}</g></g>`; }).join("");
    Kartu.leg([[WARNA_LV[3], "Awas"], [WARNA_LV[2], "Siaga"], [WARNA_LV[1], "Waspada"]]);
    return this.ex(sa ? `${this.hl(fmt(sa) + " kecamatan")} berstatus siaga atau awas ${nama} ${kapan}, ${fmt(w)} lainnya waspada`
        : w ? `Belum ada kecamatan siaga atau awas ${nama} ${kapan}; ${this.hl(fmt(w) + " kecamatan")} waspada` : `Tidak ada kecamatan berstatus ${nama} ${kapan}`, "", "",
      pv.length ? `<svg viewBox="0 0 ${W} ${pv.length * rh + 6}" role="img" aria-label="Status per provinsi">${g}</svg>` : `<p class="kosong">Semua kecamatan normal.</p>`, `Sumber: Open-Meteo, GloFAS, InaRISK`,
      this.seg("status", [["b", "Banjir"], ["l", "Longsor"]]) + this.seg("hari", S.st.hari.map((t, i) => [i, i ? tglPendek(t) : "Hari ini"]))); },

  /* 2. hujan: sebaran sel per provinsi */
  exHujan() {
    const U = this.uk(), m = this.st.hujan, H = S.hujan, iH = H.hari.indexOf(H.hari_ini), nilai = g => m === "h3" ? g.h3 : m === "a7" ? g.a7 : Math.max(...g.h.slice(iH, iH + 7));
    const pv = Object.keys(S.meta.provinsi).map(k => { const v = H.grid.filter(g => g.prov === k).map(nilai).sort((a, b) => a - b); if (!v.length) return null;
      const q = p => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))]; return {k, min: v[0], q1: q(.25), med: q(.5), q3: q(.75), max: v.at(-1), n: v.length}; }).filter(Boolean).sort((a, b) => b.max - a.max).slice(0, 15);
    if (!pv.length) return "";
    const {W, L, rh} = U, mx = Math.max(10, ...pv.map(x => x.max)), X = v => L + v / mx * (W - L - 80);
    const ambang = m === "h3" ? [[50, "50"], [100, "100"], [150, "150"]] : m === "a7" ? [[70, "basah"], [150, "jenuh"]] : [[50, "lebat"], [100, "sangat lebat"]];
    let g = ambang.map(([v, n]) => v <= mx ? `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${pv.length * rh}" stroke="currentColor" stroke-dasharray="3 3" opacity=".3"/><text x="${X(v)}" y="${pv.length * rh + 14}" text-anchor="middle" font-size="11" opacity=".65">${n}</text>` : "").join("");
    g += pv.map((x, i) => { const y = i * rh + rh / 2, r = v => fmt(Math.round(v));
      const tip = `<b>${esc(namaProv(x.k))}</b><br>Sel terbasah: ${r(x.max)} mm<br>Median: ${r(x.med)} mm<br>Jumlah sel: ${fmt(x.n)}`;
      return `<g data-prov="${x.k}" style="cursor:pointer"><text x="${L - 10}" y="${y + 5}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(U.nm(x.k))}</text>
        <line x1="${X(x.min)}" x2="${X(x.max)}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".3"/><rect class="gx" style="--i:${i}" x="${X(x.q1)}" y="${y - 8}" width="${Math.max(3, X(x.q3) - X(x.q1))}" height="16" rx="4" fill="${BIRU}" opacity=".8" data-tip="${tip}"/>
        <line x1="${X(x.med)}" x2="${X(x.med)}" y1="${y - 10}" y2="${y + 10}" stroke="${NAVY}" stroke-width="2.5" data-tip="${tip}"/><circle cx="${X(x.max)}" cy="${y}" r="5" fill="${MERAH}" data-tip="${tip}"/>
        <g class="gf" style="--i:${i}">${this.p(X(x.max) + 12, y - 10, r(x.max), MERAH)[0]}</g></g>`; }).join("");
    const top = pv[0], mm = fmt(Math.round(top.max)) + " mm";
    Kartu.leg([[BIRU, "separuh sel di tengah"], [NAVY, "median"], [MERAH, "sel terbasah"]]);
    return this.ex(m === "h3" ? `Hujan terlebat ${this.hl(mm)} dalam 3 hari di ${this.nm(top.k)}` : m === "a7" ? `Hujan ${this.hl(mm)} dalam 7 hari terakhir di ${this.nm(top.k)}` : `Hujan harian terlebat ${this.hl(mm)} dalam 7 hari ke depan di ${this.nm(top.k)}`, "", "",
      `<svg viewBox="0 0 ${W} ${pv.length * rh + 20}" role="img" aria-label="Sebaran hujan per provinsi">${g}</svg>`, `Sumber: Open-Meteo (ECMWF, ICON, GFS)`,
      this.seg("hujan", [["h3", "3 hari"], ["maks", "Harian maks"], ["a7", "7 hari lalu"]])); },

  /* 3. sungai: puncak dibanding ambang */
  exSungai() {
    const U = this.uk(), T = S.sungai.titik.map((t, i) => ({...t, i, r: t.puncak / t.q2})).filter(t => t.q2).sort((a, b) => b.r - a.r).slice(0, 15);
    if (!T.length) return "";
    const {W, rh} = U, L = U.M ? 150 : 260, T0 = 26, mx = Math.max(1.2, ...T.map(t => t.r)), X = v => L + v / mx * (W - L - 90);
    let g = `<line x1="${X(1)}" x2="${X(1)}" y1="${T0 - 4}" y2="${T0 + T.length * rh}" stroke="${NAVY}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".6"/>${this.p(X(1) - 52, 0, "banjir 2 tahunan", NAVY, "#fff", 11)[0]}`;
    g += T.map((t, i) => { const y = T0 + i * rh, w = t.kelas ? WARNA_LV[t.kelas] : BIRU, tip = `<b>${esc(t.kec)}</b>${t.kab ? " · " + esc(t.kab) : ""}<br>Puncak 7 hari: ${fmt(Math.round(t.puncak))} m³/s<br>Banjir 2 tahunan: ${fmt(Math.round(t.q2))} m³/s`;
      return `<g data-sg="${t.i}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.M ? 13 : 12.5}"><tspan font-weight="700">${esc(t.kec)}</tspan>${U.M ? "" : `<tspan opacity=".6"> ${esc(t.kab)}</tspan>`}</text>
        <rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(t.r) - L)}" height="${rh - 10}" rx="4" fill="${w}" data-tip="${tip}"/>
        <g class="gf" style="--i:${i}">${this.p(X(t.r) + 8, y + 5, F2(t.r) + "×", w, t.kelas === 1 ? FG_LV[1] : "#fff")[0]}</g></g>`; }).join("");
    const n = S.sungai.titik.filter(t => t.kelas >= 1).length;
    Kartu.leg([[BIRU, "di bawah banjir 2 tahunan"], [WARNA_LV[1], "Waspada"], [WARNA_LV[2], "Siaga"], [WARNA_LV[3], "Awas"]]);
    return this.ex(n ? `${this.hl(fmt(n) + " titik sungai")} diperkirakan melewati debit banjir 2 tahunan dalam 7 hari` : `Belum ada sungai besar yang diperkirakan melewati debit banjir 2 tahunan dalam 7 hari`, "", "",
      `<svg viewBox="0 0 ${W} ${T0 + T.length * rh + 6}" role="img" aria-label="Rasio debit sungai">${g}</svg>`, `Sumber: Copernicus GloFAS lewat Open-Meteo, ambang dari data 1997–2025`); },

  /* 4. rob: titik pantai x hari */
  exRob() {
    if (!S.rob) return "";
    const R = S.rob, iH = Math.max(0, R.hari.indexOf(S.hujan.hari_ini)), hr = R.hari.slice(iH, iH + 10), T = R.titik.map((t, i) => ({...t, i, lvs: t.lv.slice(iH, iH + 10)}))
      .filter(t => t.p95 != null).sort((a, b) => Math.max(...b.lvs) - Math.max(...a.lvs) || Math.max(...b.h.slice(iH).map(v => v - b.p95)) - Math.max(...a.h.slice(iH).map(v => v - a.p95))).slice(0, 16);
    if (!T.length) return "";
    const W = 940, L = 230, cw = (W - L) / hr.length, rh = 28, T0 = 24, H = T0 + T.length * rh;
    let g = hr.map((d, j) => `<text x="${L + j * cw + cw / 2}" y="14" text-anchor="middle" font-size="11" font-weight="${j ? 500 : 800}">${j ? d.slice(8) + "/" + d.slice(5, 7) : "Hari ini"}</text>`).join("");
    g += T.map((t, i) => `<g data-rob="${t.i}" style="cursor:pointer"><text x="${L - 10}" y="${T0 + i * rh + 18}" text-anchor="end" font-size="12.5"><tspan font-weight="700" translate="no">${esc(t.kec || t.kab)}</tspan><tspan opacity=".6" translate="no"> ${esc(t.kab)}</tspan></text>` +
      t.lvs.map((l, j) => { const v = t.h[iH + j], d = v - t.p95, nm = esc(t.kec || t.kab);
        return `<rect x="${L + j * cw + 1.5}" y="${T0 + i * rh + 3}" width="${cw - 3}" height="${rh - 6}" rx="5" style="fill:${l ? WARNA_LV[l] : `color-mix(in oklch, ${BIRU} ${Math.round(Math.max(8, Math.min(70, 40 + d * 200)))}%, var(--surface))`}" data-tip="<b>${nm} · ${tglPendek(hr[j])}</b><br>Muka laut maks: ${F2(v)} m<br>Ambang p95: ${F2(t.p95)} m<br>Status: ${LEVEL[l || 0]}"/>`
          + `<text x="${L + j * cw + cw / 2}" y="${T0 + i * rh + 18}" text-anchor="middle" font-size="10.5" font-weight="700" pointer-events="none" style="fill:${l === 1 ? FG_LV[1] : l ? "#fff" : "currentColor"}">${F2(v)}</text>`; }).join("") + `</g>`).join("");
    const n = R.titik.filter(t => Math.max(...t.lv.slice(iH)) > 0).length, bm = R.bmkg?.rob?.length || 0;
    Kartu.leg([[BIRU, "di bawah ambang"], [WARNA_LV[1], "Waspada"], [WARNA_LV[2], "Siaga"], [WARNA_LV[3], "Awas"]]);
    return this.ex(n ? `${this.hl(fmt(n) + " titik pantai")} diperkirakan berstatus rob dalam 10 hari ke depan` : `Pasang belum melewati ambang dalam 10 hari ke depan; BMKG mengeluarkan ${this.hl(fmt(bm) + " peringatan rob")}`, "", "",
      `<div class="tw sk"><svg viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Pasang laut 10 hari">${g}</svg></div>`, `Sumber: Open-Meteo Marine, BMKG Maritim, DIBI BNPB`); },

  /* 5. riwayat 15 tahun: kejadian nasional per tahun */
  exTren() {
    const K = S.kejadian; if (!K) return "";
    const j = this.st.tren, th = K.tahun.map(String).filter(t => K.nasional?.[j]?.[t]?.kejadian != null || Object.values(K.prov).some(p => p[j]?.[t])).slice(-15);
    if (th.length < 2) return "";
    const v = th.map(t => K.nasional?.[j]?.[t]?.kejadian ?? Object.values(K.prov).reduce((a, p) => a + (p[j]?.[t]?.kejadian || 0), 0));
    const M = innerWidth < 640, W = M ? 700 : 940, H = 310, L = M ? 38 : 46, RM = M ? 126 : 150, B = 280, T = 40, gap = (W - L - RM) / th.length, bw = gap * .7, mx = Math.max(1, ...v), Y = x => B - x / mx * (B - T), rata = v.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, v.length - 1);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - RM + 4}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += v.map((x, i) => { const px = L + i * gap + (gap - bw) / 2, ini = i === v.length - 1, d = i && v[i - 1] ? Math.round((x / v[i - 1] - 1) * 100) : null;
      return `<rect class="gy" style="--i:${i}" x="${px}" y="${Y(x)}" width="${bw}" height="${Math.max(1, B - Y(x))}" rx="3" fill="${ini ? "#5f6fb0" : BIRU}" opacity="${ini ? .65 : .9}" data-tip="<b>${th[i]}${ini ? " (berjalan)" : ""}</b><br>Kejadian: ${fmt(x)}${d == null ? "" : `<br>Dibanding tahun sebelumnya: ${d > 0 ? "▲" : d < 0 ? "▼" : ""} ${fmt(Math.abs(d))}%`}"/>
        <text x="${px + bw / 2}" y="${B + 16}" text-anchor="middle" font-size="11" opacity=".75">${th[i].slice(2)}</text>${`<text class="gf" style="--i:${i}" x="${px + bw / 2}" y="${Y(x) - 6}" text-anchor="middle" font-size="10" font-weight="800" opacity=".85" pointer-events="none">${rb(x).replace(" ", " ")}</text>`}`; }).join("");
    g += `<line x1="${L}" x2="${W - RM + 4}" y1="${Y(rata)}" y2="${Y(rata)}" stroke="${NAVY}" stroke-width="1.5" stroke-dasharray="5 4" opacity=".8"/>${this.p(W - RM + 8, Y(rata) - 10, "rata-rata " + rb(rata), NAVY, "#fff", M ? 12 : 11)[0]}`;
    const iMax = v.slice(0, -1).indexOf(Math.max(...v.slice(0, -1))), nm = {banjir: "banjir", longsor: "tanah longsor", rob: "banjir rob", gelombang: "gelombang pasang dan abrasi", cuaca: "cuaca ekstrem", kering: "kekeringan"}[j];
    Kartu.leg([[BIRU, "kejadian per tahun"], ["#5f6fb0", String(th.at(-1)) + " (berjalan)"]]);
    return this.ex(`Kejadian ${nm} terbanyak terjadi pada ${this.hl(th[iMax])}: ${this.hl(fmt(v[iMax]) + " kejadian")}, ${fmt(Math.round(v[iMax] / rata * 10) / 10)}× rata-rata`, "", "",
      `<div class="tw sk"><svg viewBox="0 0 ${W} ${H}" style="min-width:${M ? 700 : 0}px" role="img" aria-label="Kejadian per tahun">${g}</svg></div>`, `Sumber: BNPB (data.bnpb.go.id) dan DIBI`,
      this.selJenis("tren", [["banjir", "Banjir"], ["longsor", "Longsor"], ["rob", "Rob"], ["cuaca", "Cuaca ekstrem"], ["gelombang", "Gelombang"]], "Jenis kejadian")); },

  /* 6. prakiraan: status tertinggi tiap provinsi, 4 hari ke depan */
  exPrakiraan() {
    const U = this.uk(), b = this.st.prak, ag = S.st.hari.map((_, h) => agregat(b, h)), nama = NAMA_B[b];
    const baris = Object.keys(S.meta.provinsi).map(k => { const lv = ag.map(a => a[k]), sel = S.hujan.grid.filter(g => g.prov === k), mx = Math.max(0, ...lv.map(a => a?.lv || 0));
      return {k, lv, mx, h3: Math.max(0, ...sel.map(g => g.h3 || 0)), skor: mx * 1e6 + (lv[0]?.n[3] || 0) * 1e3 + (lv[0]?.n[2] || 0) * 10 + (lv[0]?.n[1] || 0) / 1e3}; })
      .filter(r => r.mx).sort((a, b) => b.skor - a.skor || b.h3 - a.h3).slice(0, 15);
    const nSA = Object.keys(S.meta.provinsi).filter(k => ag.some(a => (a[k]?.lv || 0) >= 2)).length, nW = Object.keys(S.meta.provinsi).filter(k => ag.some(a => a[k])).length;
    const {W, L, rh} = U, T0 = 26, hari = S.st.hari.length, cw = (W - L - 100) / hari, H = T0 + baris.length * rh;
    let g = S.st.hari.map((t, h) => `<text x="${L + h * cw + cw / 2}" y="15" text-anchor="middle" font-size="${U.M ? 12 : 11}" font-weight="${h ? 600 : 800}">${h ? this.tgl(t) : "Hari ini"}</text>`).join("") + `<text x="${W - 4}" y="15" text-anchor="end" font-size="${U.M ? 12 : 11}" font-weight="700">Hujan 3 hari</text>`;
    g += baris.map((r, i) => { const y = T0 + i * rh;
      return `<g data-prov="${r.k}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(U.nm(r.k))}</text>`
        + r.lv.map((a, h) => { const x = L + h * cw + 2, n = a ? a.n[1] + a.n[2] + a.n[3] : 0, tg = h ? tglPendek(S.st.hari[h]) : "Hari ini", sebelum = h && ag[h - 1][r.k] ? ag[h - 1][r.k].n[1] + ag[h - 1][r.k].n[2] + ag[h - 1][r.k].n[3] : 0, d = n - sebelum;
          return a ? `<rect class="gx" style="--i:${i}" x="${x}" y="${y + 3}" width="${cw - 4}" height="${rh - 6}" rx="6" fill="${WARNA_LV[a.lv]}" data-tip="<b>${esc(namaProv(r.k))} · ${tg}</b><br>Status tertinggi: ${LEVEL[a.lv]}<br>Awas: ${fmt(a.n[3])} kecamatan<br>Siaga: ${fmt(a.n[2])} kecamatan<br>Waspada: ${fmt(a.n[1])} kecamatan${h ? `<br>Dibanding hari sebelumnya: ${d > 0 ? "▲" : d < 0 ? "▼" : ""} ${fmt(Math.abs(d))} kecamatan` : ""}"/><text x="${x + (cw - 4) / 2}" y="${y + 19}" text-anchor="middle" font-size="12" font-weight="800" pointer-events="none" style="fill:${a.lv === 1 ? FG_LV[1] : "#fff"}">${fmt(n)}</text>`
            : `<rect x="${x}" y="${y + 3}" width="${cw - 4}" height="${rh - 6}" rx="6" style="fill:var(--surface)"/><text x="${x + (cw - 4) / 2}" y="${y + 19}" text-anchor="middle" font-size="12" opacity=".45" pointer-events="none">–</text>`; }).join("")
        + `<g class="gf" style="--i:${i}">${this.p(W - 88, y + 4, fmt(Math.round(r.h3)) + " mm", this.warnaHujan(r.h3))[0]}</g></g>`; }).join("");
    Kartu.leg([[WARNA_LV[3], "Awas"], [WARNA_LV[2], "Siaga"], [WARNA_LV[1], "Waspada"]]);
    return this.ex(nSA ? `${this.hl(fmt(nSA) + " provinsi")} punya kecamatan siaga atau awas ${nama} dalam 4 hari ke depan` : `Belum ada provinsi dengan kecamatan siaga atau awas ${nama} dalam 4 hari ke depan; ${this.hl(fmt(nW) + " provinsi")} waspada`, "", "",
      baris.length ? `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Prakiraan status per provinsi">${g}</svg>` : `<p class="kosong">Semua kecamatan normal.</p>`, `Sumber: Open-Meteo, GloFAS, InaRISK`,
      this.seg("prak", [["b", "Banjir"], ["l", "Longsor"]])); },

  /* 7. tabel kecamatan siaga atau awas 4 hari ke depan (dari Daftar); tanpa satu pun, daftar waspada */
  exKecamatan() {
    const P = Kartu.provDipilih("provKec", this.st), hari = S.st.hari;
    const semua = Object.entries(S.st.kec).map(([k, v]) => { const [p, kb, kc] = k.split("|"), b = v.b || [0], l = v.l || [0]; return {k, p, kb, kc, b, l, mb: Math.max(...b), ml: Math.max(...l), lv: Math.max(...b, ...l), h3: v.h3, a7: v.a7}; });
    const sa = semua.filter(r => r.lv >= 2), dasar = sa.length ? sa : semua.filter(r => r.lv >= 1), R = P.length ? dasar.filter(r => P.includes(r.p)) : dasar;
    if (!semua.length) return "";
    const kol = [{k: "kc", n: "Kecamatan", v: r => r.kc, h: r => `<b>${esc(r.kc)}</b>`}, {k: "kb", n: "Kab/Kota", v: r => r.kb, h: r => esc(r.kb)}, {k: "p", n: "Provinsi", v: r => namaProv(r.p), h: r => esc(namaProv(r.p))},
      ...hari.map((t, i) => ({k: "b" + i, n: i ? `Banjir <span translate="no">${this.tgl(t)}</span>` : "Banjir hari ini", v: r => r.b[i] || 0, h: r => r.b[i] ? pill(r.b[i]) : "–"})),
      {k: "l", n: "Longsor", v: r => r.ml, h: r => r.ml ? pill(r.ml) : "–"}, {k: "h3", n: "Hujan 3 hari", num: 1, v: r => r.h3 ?? -1, h: r => r.h3 != null ? this.pl(fmt(Math.round(r.h3)) + " mm", this.warnaHujan(r.h3)) : "–"}];
    const judul = sa.length ? `${this.hl(fmt(R.length) + " kecamatan")} berstatus siaga atau awas dalam 4 hari ke depan` : `Belum ada kecamatan siaga atau awas dalam 4 hari ke depan; ${this.hl(fmt(R.length) + " kecamatan")} waspada`;
    return this.ex(P.length && !R.length ? `Tidak ada kecamatan berstatus di provinsi yang dipilih` : judul, "", "", this.tabel("kecamatan", kol, R, r => `data-kec="${esc(r.k)}"`, 10, "kecamatan", r => r.lv * 1e3 + (r.h3 || 0) / 1e3), `Sumber: Open-Meteo, GloFAS, InaRISK`, this.selProvMulti("provKec")); },

  /* 8. tabel provinsi (dari Provinsi): status, hujan, sungai, rob */
  exProvinsi() {
    const P = Kartu.provDipilih("provPv", this.st), ag = S.st.hari.map((_, h) => agregat("b", h)), agL = agregat("l", 0), iH = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
    const semua = Object.keys(S.meta.provinsi).map(k => { const n = ag[0][k]?.n || [0, 0, 0, 0], sel = S.hujan.grid.filter(g => g.prov === k);
      return {k, n, l: agL[k]?.n || [0, 0, 0, 0], h3: Math.max(0, ...sel.map(g => g.h3 || 0)), sg: S.sungai.titik.filter(t => t.prov === k && t.kelas >= 1).length, rob: S.rob ? S.rob.titik.filter(t => t.prov === k && Math.max(...t.lv.slice(iH)) > 0).length : 0,
        skor: Math.max(...ag.map(a => a[k]?.lv || 0)) * 1e6 + n[3] * 1e3 + n[2] * 10 + n[1] / 1e3}; });
    const R = P.length ? semua.filter(r => P.includes(r.k)) : semua, top = [...semua].sort((a, b) => (b.n[1] + b.n[2] + b.n[3]) - (a.n[1] + a.n[2] + a.n[3]))[0], nTop = top ? top.n[1] + top.n[2] + top.n[3] : 0;
    const c = (k, n, f, h) => ({k, n, num: 1, v: f, h}), p0 = (x, w) => x ? this.pl(fmt(x), w) : "–";
    const kol = [{k: "k", n: "Provinsi", v: r => namaProv(r.k), h: r => `<span class="pvn">${lambang(r.k)}<b>${esc(namaProv(r.k))}</b></span>`},
      c("aw", "Awas", r => r.n[3], r => p0(r.n[3], WARNA_LV[3])), c("sg", "Siaga", r => r.n[2], r => p0(r.n[2], WARNA_LV[2])), c("wp", "Waspada", r => r.n[1], r => p0(r.n[1], "#c99a1e")), c("ls", "Longsor siaga", r => r.l[2] + r.l[3], r => p0(r.l[2] + r.l[3], WARNA_LV[2])),
      c("h3", "Hujan 3 hari", r => r.h3, r => this.pl(fmt(Math.round(r.h3)) + " mm", this.warnaHujan(r.h3))), c("sung", "Sungai di atas Q2", r => r.sg, r => p0(r.sg, BIRU)), ...(S.rob ? [c("rob", "Titik rob", r => r.rob, r => p0(r.rob, BIRU))] : [])];
    return this.ex(nTop ? `${this.hl(this.nm(top.k))} paling banyak kecamatan berstatus banjir hari ini: ${this.hl(fmt(nTop) + " kecamatan")}` : `Belum ada kecamatan berstatus banjir di provinsi mana pun hari ini`, "", "",
      this.tabel("provinsi", kol, R, r => `data-prov="${r.k}"`, 10, "provinsi", r => r.n[3] * 1e6 + r.n[2] * 1e3 + r.n[1]), `Sumber: Open-Meteo, GloFAS, InaRISK, BMKG`, this.selProvMulti("provPv")); },

  /* tabel standar inti: kepala gelap, kolom bisa diurut, paginasi. kol[{k,n,v,h,num}]; awal = nilai urutan bawaan (turun) sebelum kolom diklik */
  tabel(id, kol, baris, atribut, per, satuan, awal) {
    const st = this.T[id], s = st.turun ? -1 : 1, kk = kol.find(c => c.k === st.urut), f = kk ? kk.v : awal;
    const R = [...baris].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / per) - 1));
    const hal = R.slice(st.hal * per, (st.hal + 1) * per);
    return `<div class="tw"><table><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${hal.map(r => `<tr class="klik" ${atribut(r)}>${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${kol.length}" class="kosong">Tidak ada data.</td></tr>`}</tbody></table></div>${paginasi(st.hal, R.length, per, satuan)}`; },

  /* ---- disembunyikan dari Insight (A24), fungsi dipertahankan: musim pindah ke Tren, dampak ke Dampak. Lihat window.InsightEx di bawah. ---- */
  exMusim() {
    const K = S.kejadian, E = K?.kejadian_dibi || []; if (!E.length) return "";
    const j = this.st.musim, cocok = e => j === "banjir" ? /banjir/.test(e.jenis) && e.jenis !== "banjir_rob" : j === "longsor" ? /longsor/.test(e.jenis) : e.jenis.includes(j);
    const per = {}; for (const e of E) { if (!cocok(e)) continue; const p = per[e.prov] ||= Array(12).fill(0); p[+e.tanggal.slice(5, 7) - 1]++; }
    const pv = Object.entries(per).map(([k, v]) => ({k, v, n: v.reduce((a, b) => a + b, 0)})).sort((a, b) => b.n - a.n).slice(0, 16);
    if (!pv.length) return "";
    const W = 940, L = 200, cw = (W - L - 70) / 12, rh = 26, T0 = 22, H = T0 + pv.length * rh;
    let g = BLN.map((b, i) => `<text x="${L + i * cw + cw / 2}" y="14" text-anchor="middle" font-size="11" font-weight="${i === new Date().getMonth() ? 800 : 400}">${b}</text>`).join("") + `<text x="${W - 4}" y="14" text-anchor="end" font-size="11" font-weight="700">Total</text>`;
    g += pv.map((x, i) => { const m = Math.max(1, ...x.v); return `<text x="${L - 10}" y="${T0 + i * rh + 17}" text-anchor="end" font-size="12.5" font-weight="600">${esc(namaProv(x.k))}</text>` + x.v.map((n, b) => `<rect x="${L + b * cw + 1.5}" y="${T0 + i * rh + 3}" width="${cw - 3}" height="${rh - 6}" rx="4" style="fill:${n ? `color-mix(in oklch, #3f7fb8 ${Math.round(15 + n / m * 80)}%, var(--surface))` : "var(--surface)"}" data-tip="<b>${esc(namaProv(x.k))} · ${BLN[b]}</b><br>Kejadian: ${fmt(n)}"/>`).join("") + `<text x="${W - 4}" y="${T0 + i * rh + 17}" text-anchor="end" font-size="12" font-weight="700">${fmt(x.n)}</text>`; }).join("");
    const bulan = Array(12).fill(0); pv.forEach(x => x.v.forEach((n, b) => bulan[b] += n)); const pk = bulan.indexOf(Math.max(...bulan));
    return this.ex(`Kejadian ${j === "banjir" ? "banjir" : j === "longsor" ? "longsor" : "rob"} memuncak pada ${this.hl(BLN[pk])}; bulan ini (${BLN[new Date().getMonth()]}) ${this.hl(fmt(Math.round(bulan[new Date().getMonth()] / Math.max(...bulan) * 100)) + "%")} dari puncak`, "", "",
      `<div class="tw sk"><svg viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Kalender kejadian">${g}</svg></div>`, `Sumber: DIBI BNPB`,
      this.seg("musim", [["banjir", "Banjir"], ["longsor", "Longsor"], ["rob", "Rob"]])); },
  exKab() {
    const K = S.kejadian; if (!K) return "";
    const j = this.st.kab, T = Object.entries(K.kab || {}).map(([k, v]) => { const y = v[j] || {}, th = Object.keys(y).sort(); return {k, y, th, n: th.reduce((a, t) => a + (y[t] || 0), 0)}; }).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 15);
    if (!T.length) return "";
    const semuaTh = [...new Set(T.flatMap(x => x.th))].sort(), W = 940, L = 260, rh = 28, mx = Math.max(...T.map(x => x.n)), X = v => v / mx * (W - L - 230);
    const g = T.map((x, i) => { const [p, kb] = x.k.split("|"), mm = Math.max(1, ...semuaTh.map(t => x.y[t] || 0));
      return `<g data-kab="${esc(x.k)}" style="cursor:pointer"><text x="${L - 10}" y="${i * rh + 18}" text-anchor="end" font-size="12.5"><tspan font-weight="700">${esc(kb)}</tspan><tspan opacity=".6"> ${esc(this.pendek(p))}</tspan></text>
      <rect class="gx" style="--i:${i}" x="${L}" y="${i * rh + 6}" width="${X(x.n)}" height="${rh - 12}" rx="3" fill="#3f7fb8" data-tip="<b>${esc(kb)}</b><br>Kejadian: ${fmt(x.n)}"/>${this.p(L + X(x.n) + 8, i * rh + 4, fmt(x.n), "#3f7fb8")[0]}` +
      semuaTh.map((t, b) => { const h = (x.y[t] || 0) / mm * (rh - 10); return `<rect x="${W - 200 + b * (190 / semuaTh.length)}" y="${i * rh + rh - 4 - h}" width="${190 / semuaTh.length - 1.5}" height="${Math.max(.5, h)}" fill="${BIRU}"/>`; }).join("") + `</g>`; }).join("");
    const nm = {banjir: "banjir", longsor: "longsor", rob: "rob"}[j];
    return this.ex(`${esc(T[0].k.split("|")[1])} paling sering dilanda ${nm}: ${this.hl(fmt(T[0].n) + " kejadian")} sejak ${semuaTh[0]}`, "", "",
      `<svg viewBox="0 0 ${W} ${T.length * rh + 6}" role="img" aria-label="Kabupaten paling sering">${g}</svg>`, `Sumber: BNPB/DIBI`,
      this.seg("kab", [["banjir", "Banjir"], ["longsor", "Longsor"], ["rob", "Rob"]])); },
  exDampak() {
    const K = S.kejadian; if (!K) return "";
    const f = this.st.dampak, th = ["2025", "2024"].find(t => Object.values(K.prov).some(p => p.banjir?.[t]?.[f] != null)); if (!th) return "";
    const T = Object.entries(K.prov).map(([k, p]) => ({k, b: p.banjir?.[th]?.[f] || 0, l: p.longsor?.[th]?.[f] || 0})).map(x => ({...x, n: x.b + x.l})).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 15);
    const W = 940, L = 200, rh = 28, mx = Math.max(1, ...T.map(x => x.n)), X = v => v / mx * (W - L - 90), tot = T.reduce((a, x) => a + x.n, 0);
    const g = T.map((x, i) => `<text x="${L - 10}" y="${i * rh + 18}" text-anchor="end" font-size="13" font-weight="600">${esc(namaProv(x.k))}</text>
      <rect class="gx" style="--i:${i}" x="${L}" y="${i * rh + 6}" width="${X(x.b)}" height="${rh - 12}" fill="#3f7fb8" data-tip="<b>${esc(namaProv(x.k))}</b><br>Banjir: ${fmt(x.b)}"/><rect class="gx" style="--i:${i}" x="${L + X(x.b)}" y="${i * rh + 6}" width="${X(x.l)}" height="${rh - 12}" fill="#9a7448" data-tip="<b>${esc(namaProv(x.k))}</b><br>Longsor: ${fmt(x.l)}"/>
      ${this.p(L + X(x.n) + 8, i * rh + 4, rb(x.n), "#3f7fb8")[0]}`).join("");
    const nm = {meninggal: "korban meninggal", terdampak: "warga terdampak", mengungsi: "warga mengungsi", rumah_rusak: "rumah rusak"}[f];
    Kartu.leg([["#3f7fb8", "banjir"], ["#9a7448", "longsor"]]);
    return this.ex(`${th}: ${this.hl(f === "meninggal" ? fmt(tot) : rb(tot))} ${nm} akibat banjir dan longsor di 15 provinsi teratas; ${esc(namaProv(T[0]?.k))} terbanyak`, "", "",
      `<svg viewBox="0 0 ${W} ${T.length * rh + 22}" role="img" aria-label="Dampak per provinsi">${g}</svg>`, `Sumber: rekap kejadian dan dampak BNPB ${th}`,
      this.seg("dampak", [["meninggal", "Meninggal"], ["mengungsi", "Mengungsi"], ["terdampak", "Terdampak"], ["rumah_rusak", "Rumah rusak"]])); },

  gambar(id) { const f = this["ex" + id[0].toUpperCase() + id.slice(1)]; Kartu._leg = null;
    try { return f.call(this).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${this.LABEL[id] || ""}</span>`); } catch (e) { console.error(e); return ""; } },
  /* kepala kolom bisa diurut: pasang ulang tiap kartu bertabel digambar ulang */
  pasangUrut(box) { if (box.dataset.ex === "tren") { const w = box.querySelector(".tw.sk"); if (w) w.scrollLeft = w.scrollWidth; } /* tahun terbaru di kanan: tampil dulu */
    const th = box.querySelector("thead"), st = this.T[box.dataset.ex]; if (th && st) pengurutKepala(st, th, () => this.ulang(box)); },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); this.pasangUrut(box); }); },
  async render() {
    if (!S.kejadian) S.kejadian = await muatJSON("data/kejadian.json").catch(() => null);
    if (this.aktif === undefined) this.aktif = await muatJSON("data/kejadian_aktif_awal.json").catch(() => null);
    const el = $("#insight");
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("");
    el.querySelectorAll("[data-ex]").forEach(b => this.pasangUrut(b));
    el.onchange = e => { const m = e.target.closest("input[data-multi]");
      if (m) { const k = m.dataset.multi, box = m.closest(".pm-menu"); if (!m.value) box.querySelectorAll("input[value]:not([value=''])").forEach(x => x.checked = false); else box.querySelector("input[value='']").checked = false;
        this.st[k] = [...box.querySelectorAll("input:checked")].map(x => x.value).filter(Boolean).join(","); Kartu._bukaMulti = k; Object.values(this.T).forEach(t => t.hal = 0); return this.ulang(m.closest("[data-ex]")); }
      const s = e.target.closest("select[data-set]"); if (s) { this.st[s.dataset.set] = s.value; this.ulang(s.closest("[data-ex]")); } };
    el.onclick = e => {
      const s = e.target.closest("[data-set]"); if (s && s.tagName !== "SELECT") { this.st[s.dataset.set] = s.dataset.v; return this.ulang(s.closest("[data-ex]")); }
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; this.ulang(box); } return; }
      const pv = e.target.closest("[data-prov]"); if (pv) { bukaTab("peta"); return turun(pv.dataset.prov); }
      const sg = e.target.closest("[data-sg]"); if (sg && +sg.dataset.sg >= 0) return Analisa.sungai(+sg.dataset.sg);
      const rb_ = e.target.closest("[data-rob]"); if (rb_) return Rob.titik(+rb_.dataset.rob);
      const kc = e.target.closest("[data-kec]"); if (kc) { const p = kc.dataset.kec.split("|"); S.jalur = p.slice(0, 2); bukaTab("peta"); return Peta.aturWilayah().then(() => Analisa.wilayah(kc.dataset.kec)); }
      const kj = e.target.closest("[data-kej]"); if (kj) { const k = this.aktif.kejadian.find(x => x.kode === kj.dataset.kej); bukaTab("peta");
        if (k?.bbox) nanti(() => peta && peta.fitBounds([[k.bbox[0], k.bbox[1]], [k.bbox[2], k.bbox[3]]], {padding: 80, maxZoom: 10})); return; }
      const kb = e.target.closest("[data-kab]"); if (kb) { const p = kb.dataset.kab.split("|"); S.jalur = [p[0]]; bukaTab("peta"); return Peta.aturWilayah().then(() => Analisa.wilayah(kb.dataset.kab)); } };
  },
};
/* serah-terima ke Tren (musim) dan Dampak (dampak, kab): kartu jadi dengan label pil; kontrol (data-set) ditangani pemanggil lewat st */
window.InsightEx = {musim: () => Insight.gambar("musim"), dampak: () => Insight.gambar("dampak"), kab: () => Insight.gambar("kab"), st: Insight.st};
