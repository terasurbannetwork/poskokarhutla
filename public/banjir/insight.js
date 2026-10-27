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
  st: {status: "b", hari: 0, hujan: "h3", tren: "banjir", prak: "b", pel: "b", pa: "pantura", ub: "banjir", hulu: "", hj: "lalu", pulau: "", musim: "banjir", dampak: "meninggal", kab: "banjir", provKec: "", provPv: ""},
  /* urutan kartu; tabel kecamatan dan provinsi ikut sebagai kartu terakhir. musim/dampak/kab sengaja tidak di sini (disembunyikan, A24) */
  EX: ["kejadian", "status", "hujan", "sungai", "rob", "pasang", "tren", "prakiraan", "pelhujan", "peluang", "hulu", "ujibalik", "kecamatan", "provinsi"],
  LABEL: {kejadian: "Kejadian", status: "Status", hujan: "Hujan", sungai: "Sungai", rob: "Rob", pasang: "Kalender pasang", pelhujan: "Peluang hujan lebat", tren: "Riwayat 15 tahun", prakiraan: "Prakiraan", peluang: "Peluang 3 hari", hulu: "Telusur hulu", ujibalik: "Ketepatan status", kecamatan: "Siaga dan awas", provinsi: "Provinsi",
    musim: "Musim", dampak: "Dampak", kab: "Langganan"},
  /* status tabel (urut, arah, halaman) per kartu bertabel */
  T: {kejadian: {urut: "_", turun: true, hal: 0}, peluang: {urut: "_", turun: true, hal: 0}, kecamatan: {urut: "_", turun: true, hal: 0}, provinsi: {urut: "_", turun: true, hal: 0}},
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
    return this.ex(`${this.hl(fmt(A.length) + " wilayah Siaga (prakiraan)")} mencakup ${this.hl(fmt(nKec) + " kecamatan")} di ${fmt(nProv)} provinsi hari ini`, "", "",
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
    g += T.map((t, i) => { const y = T0 + i * rh, w = t.kelas ? WARNA_LV[t.kelas] : BIRU, tip = `<b>${esc(t.kec)}</b>${t.kab ? ", " + esc(t.kab) : ""}<br>Puncak 7 hari: ${fmt(Math.round(t.puncak))} m³/s<br>Banjir 2 tahunan: ${fmt(Math.round(t.q2))} m³/s`;
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
        return `<rect x="${L + j * cw + 1.5}" y="${T0 + i * rh + 3}" width="${cw - 3}" height="${rh - 6}" rx="5" style="fill:${l ? WARNA_LV[l] : `color-mix(in oklch, ${BIRU} ${Math.round(Math.max(8, Math.min(70, 40 + d * 200)))}%, var(--surface))`}" data-tip="<b>${nm}, ${tglPendek(hr[j])}</b><br>Muka laut maks: ${F2(v)} m<br>Ambang p95: ${F2(t.p95)} m<br>Status: ${LEVEL[l || 0]}"/>`
          + `<text x="${L + j * cw + cw / 2}" y="${T0 + i * rh + 18}" text-anchor="middle" font-size="10.5" font-weight="700" pointer-events="none" style="fill:${l === 1 ? FG_LV[1] : l ? "#fff" : "currentColor"}">${F2(v)}</text>`; }).join("") + `</g>`).join("");
    const n = R.titik.filter(t => Math.max(...t.lv.slice(iH)) > 0).length, bm = R.bmkg?.rob?.length || 0;
    Kartu.leg([[BIRU, "di bawah ambang"], [WARNA_LV[1], "Waspada"], [WARNA_LV[2], "Siaga"], [WARNA_LV[3], "Awas"]]);
    return this.ex(n ? `${this.hl(fmt(n) + " titik pantai")} diperkirakan berstatus rob dalam 10 hari ke depan` : `Pasang belum melewati ambang dalam 10 hari ke depan; BMKG mengeluarkan ${this.hl(fmt(bm) + " peringatan rob")}`, "", "",
      `<div class="tw sk"><svg viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Pasang laut 10 hari">${g}</svg></div>`, `Sumber: Open-Meteo Marine, BMKG Maritim, DIBI BNPB`); },

  /* 4b. kalender pasang: indeks gaya pasang astronomis harian 12 bulan (scripts/banjir/pasang_astro.py). Batasan (bukan tinggi muka air, asumsi bobot) ada di Metode. */
  exPasang() {
    const D = this.PA; if (!D?.seri?.g) return "";
    const pr = D.seri.g[this.st.pa] ? this.st.pa : "pantura", g = D.seri.g[pr], n = g.length, PT = D.pasang_tinggi[pr], t0 = Date.parse(D.seri.t0 + "T00:00:00Z");
    if (!PT?.tertinggi?.length) return "";
    const M = innerWidth < 640, W = 940, L = 34, R = 16, T = 62, B = 214, X = i => L + i * (W - L - R) / (n - 1), Y = v => B - v * (B - T), ix = t => Math.round((Date.parse(t + "T00:00:00Z") - t0) / 864e5);
    const f = (t, o) => new Date(t + "T12:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", ...o});
    const rentang = (a, b, tahun) => { const A = new Date(a + "T12:00:00Z"), Z = new Date(b + "T12:00:00Z"), ba = A.getUTCMonth() !== Z.getUTCMonth() || A.getUTCFullYear() !== Z.getUTCFullYear(), th = tahun ? " " + Z.getUTCFullYear() : "";
      if (a === b) return f(a, {day: "numeric", month: tahun ? "long" : "short"}) + th;
      return ba ? `${f(a, {day: "numeric", month: tahun ? "long" : "short"})}–${f(b, {day: "numeric", month: tahun ? "long" : "short"})}${th}` : `${A.getUTCDate()}–${f(b, {day: "numeric", month: tahun ? "long" : "short"})}${th}`; };
    const top = PT.tertinggi[0], tertinggi = [...PT.tertinggi].sort((a, b) => a.awal < b.awal ? -1 : 1);
    let s = [0, .5, 1].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" opacity=".6">${F2(v)}</text>`).join("");
    s += PT.jendela.map(j => { const a = ix(j.awal), b = ix(j.akhir); return `<rect x="${X(a) - 1}" y="${T - 8}" width="${Math.max(3, X(b) - X(a) + 2)}" height="${B - T + 8}" fill="${MERAH}" opacity=".16"/>`; }).join("");
    s += `<path d="M${X(0)},${B} ${g.map((v, i) => `L${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} L${X(n - 1)},${B}Z" fill="${BIRU}" opacity=".16"/><path d="${g.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${BIRU}" stroke-width="1.8" stroke-linejoin="round"/>`;
    s += tertinggi.map((j, k) => { const c = (X(ix(j.awal)) + X(ix(j.akhir))) / 2, tk = `${rentang(j.awal, j.akhir)}, ${F2(j.nilai)}`, w = tk.length * 6.8 + 16, x = Math.max(2, Math.min(W - w - 2, c - w / 2)), y = k % 2 ? 30 : 4;
      return `<line x1="${c}" x2="${c}" y1="${y + 22}" y2="${Y(j.nilai) - 3}" stroke="${MERAH}" stroke-width="1" opacity=".5"/>${this.p(x, y, tk, MERAH, "#fff", 11)[0]}`; }).join("");
    let bl = "", xl = -99; for (let i = 0; i < n; i++) { const d = new Date(t0 + i * 864e5); if ((d.getUTCDate() === 1 || i === 0) && X(i) - xl >= 40) { xl = X(i); bl += `<text x="${X(i)}" y="${B + 18}" text-anchor="${i ? "middle" : "start"}" font-size="${M ? 11 : 10.5}" opacity=".7">${BLN[d.getUTCMonth()]}${d.getUTCMonth() === 0 ? " " + String(d.getUTCFullYear()).slice(2) : ""}</text>`; } }
    const kol = g.map((v, i) => { const t = new Date(t0 + i * 864e5).toISOString().slice(0, 10), j = PT.jendela.find(w => t >= w.awal && t <= w.akhir);
      return `<rect x="${X(i) - (W - L - R) / (n - 1) / 2}" y="${T - 8}" width="${(W - L - R) / (n - 1)}" height="${B - T + 8}" fill="transparent" data-tip="<b>${f(t, {weekday: "long", day: "numeric", month: "long"})}</b><br>Gaya pasang: ${F2(v)}${j ? `<br>Jendela terkuat: ${rentang(j.awal, j.akhir)}` : ""}"/>`; }).join("");
    Kartu.leg([[BIRU, "gaya pasang harian (0–1)"], [MERAH, "jendela terkuat"]]);
    return this.ex(`Pasang astronomis terkuat 12 bulan ke depan jatuh pada ${this.hl(rentang(top.awal, top.akhir, true))}`, "", "",
      `<div class="tw sk"><svg viewBox="0 0 ${W} ${B + 26}" style="min-width:${M ? 720 : 0}px" role="img" aria-label="Gaya pasang astronomis harian 12 bulan">${s}${bl}${kol}</svg></div>`,
      `Sumber: perhitungan astronomi posisi Bulan dan Matahari`, this.seg("pa", Object.entries(D.profil).map(([k, v]) => [k, k === "pantura" ? "Pantura Jawa" : "Titik lain"]))); },

  /* 4c. peluang hujan lebat per wilayah (peluang.json, mesin bersama inti/peluang.js; scripts/banjir/peluang_banjir.py). Tanpa mesin atau berkas = dibuang. */
  exPelhujan() { if (typeof Peluang === "undefined" || !this.PH) return ""; return Peluang.kartu(this.PH, {ey: this.LABEL.pelhujan, st: this.st, kunci: "ph", kejadian: "hujan lebat"}); },

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
          return a ? `<rect class="gx" style="--i:${i}" x="${x}" y="${y + 3}" width="${cw - 4}" height="${rh - 6}" rx="6" fill="${WARNA_LV[a.lv]}" data-tip="<b>${esc(namaProv(r.k))}, ${tg}</b><br>Status tertinggi: ${LEVEL[a.lv]}<br>Awas: ${fmt(a.n[3])} kecamatan<br>Siaga: ${fmt(a.n[2])} kecamatan<br>Waspada: ${fmt(a.n[1])} kecamatan${h ? `<br>Dibanding hari sebelumnya: ${d > 0 ? "▲" : d < 0 ? "▼" : ""} ${fmt(Math.abs(d))} kecamatan` : ""}"/><text x="${x + (cw - 4) / 2}" y="${y + 19}" text-anchor="middle" font-size="12" font-weight="800" pointer-events="none" style="fill:${a.lv === 1 ? FG_LV[1] : "#fff"}">${fmt(n)}</text>`
            : `<rect x="${x}" y="${y + 3}" width="${cw - 4}" height="${rh - 6}" rx="6" style="fill:var(--surface)"/><text x="${x + (cw - 4) / 2}" y="${y + 19}" text-anchor="middle" font-size="12" opacity=".45" pointer-events="none">–</text>`; }).join("")
        + `<g class="gf" style="--i:${i}">${this.p(W - 88, y + 4, fmt(Math.round(r.h3)) + " mm", this.warnaHujan(r.h3))[0]}</g></g>`; }).join("");
    Kartu.leg([[WARNA_LV[3], "Awas"], [WARNA_LV[2], "Siaga"], [WARNA_LV[1], "Waspada"]]);
    return this.ex(nSA ? `${this.hl(fmt(nSA) + " provinsi")} punya kecamatan siaga atau awas ${nama} dalam 4 hari ke depan` : `Belum ada provinsi dengan kecamatan siaga atau awas ${nama} dalam 4 hari ke depan; ${this.hl(fmt(nW) + " provinsi")} waspada`, "", "",
      baris.length ? `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Prakiraan status per provinsi">${g}</svg>` : `<p class="kosong">Semua kecamatan normal.</p>`, `Sumber: Open-Meteo, GloFAS, InaRISK`,
      this.seg("prak", [["b", "Banjir"], ["l", "Longsor"]])); },

  /* 6b. peluang 3 hari: kecamatan dengan peluang Siaga tertinggi (ansambel ECMWF 51 anggota, jalur hujan), status.py -> prakiraan72.json */
  exPeluang() {
    const D = Pra72.d; if (!D) return "";
    if (D.anggota == null) return "";
    const b = this.st.pel, q = b === "b" ? "hb" : "hl", nama = NAMA_B[b], J = Pra72.jendela();
    const semua = Object.entries(D.kec).filter(([, v]) => v[q]).map(([k, v]) => { const [p, kb, kc] = k.split("|"), lv = v[b], pk = v[q].map(x => x[1]); return {k, p, kb, kc, lv, pk, pu: v[q].map(x => x[2]), h3: S.st.kec[k]?.h3}; });
    if (!semua.length) return "";
    const tinggi = [...semua].sort((a, c) => c.pk[2] - a.pk[2])[0], n50 = semua.filter(r => r.pk[2] >= 50).length;
    const pc = v => this.pl(fmt(Math.round(v)) + "%", v >= 50 ? WARNA_LV[3] : v >= 25 ? WARNA_LV[2] : v >= 10 ? "#c99a1e" : BIRU);
    const kol = [{k: "kc", n: "Kecamatan", v: r => r.kc, h: r => `<b translate="no">${esc(r.kc)}</b>`}, {k: "kb", n: "Kab/Kota", v: r => r.kb, h: r => `<span translate="no">${esc(r.kb)}</span>`}, {k: "p", n: "Provinsi", v: r => namaProv(r.p), h: r => esc(namaProv(r.p))},
      {k: "l0", n: `Status ${labelHari(D.hari[0]).toLowerCase()}`, v: r => r.lv[0], h: r => r.lv[0] ? pill(r.lv[0]) : "–"},
      ...J.map((j, i) => ({k: "j" + i, n: `Peluang Siaga ${j}`, num: 1, v: r => r.pk[i], h: r => pc(r.pk[i])})),
      {k: "aw", n: `Peluang Awas ${J[2]}`, num: 1, v: r => r.pu[2], h: r => r.pu[2] ? pc(r.pu[2]) : "–"},
      {k: "h3", n: "Hujan 3 hari", num: 1, v: r => r.h3 ?? -1, h: r => r.h3 != null ? this.pl(fmt(Math.round(r.h3)) + " mm", this.warnaHujan(r.h3)) : "–"}];
    const judul = n50 ? `${this.hl(fmt(n50) + " kecamatan")} punya peluang 50% atau lebih mencapai siaga ${nama} sampai ${tglPendek(D.hari[2])}`
      : `Peluang siaga ${nama} tertinggi sampai ${tglPendek(D.hari[2])} ${this.hl(fmt(Math.round(tinggi.pk[2])) + "%")}, di <span translate="no">${esc(tinggi.kc)}</span>`;
    return this.ex(judul, "", "", this.tabel("peluang", kol, semua, r => `data-kec="${esc(r.k)}"`, 10, "kecamatan", r => r.pk[2] * 1e3 + r.lv[0]),
      `Sumber: ECMWF IFS ansambel ${fmt(D.anggota)} anggota lewat Open-Meteo, InaRISK. Peluang jalur hujan saja; belum diuji balik, kalibrasinya belum diketahui`, this.seg("pel", [["b", "Banjir"], ["l", "Longsor"]])); },

  /* 6b2. telusur hulu: porsi hujan per sub-DAS hulu daerah langganan/Siaga (scripts/banjir/hulu.py -> hulu.json, kontrak hulu/1) */
  exHulu() {
    const H = this.HU; if (!H?.daerah?.length) return "";
    const d = H.daerah.find(x => x.slug === this.st.hulu) || H.daerah[0], w = this.st.hj === "depan" ? "depan" : "lalu", J = H.jendela[w];
    if (!J) return "";
    const U = this.uk(), {W, rh, fs} = U, L = U.M ? 190 : 300, R = U.M ? 70 : 210, tg = t => this.tgl(t), kapan = J[0].slice(0, 7) === J[1].slice(0, 7) ? `${+J[0].slice(8)} s.d. ${tg(J[1])}` : `${tg(J[0])} s.d. ${tg(J[1])}`;
    const sub = d.subdas.filter(o => o[w + "_persen"] != null).sort((a, b) => b[w + "_persen"] - a[w + "_persen"]), top = sub.slice(0, 8), sisa = sub.slice(8);
    const baris = sisa.length ? [...top, {label: `${fmt(sisa.length)} sub-DAS lain`, km2: sisa.reduce((a, o) => a + o.km2, 0), [w + "_persen"]: sisa.reduce((a, o) => a + o[w + "_persen"], 0), lain: 1}] : top;
    const lv = d.status.maks, l0 = d.status.hari_ini, NL = ["", "", "siaga", "awas"], pc = (v, mm) => v > 0 && v < .05 || v === 0 && mm > 0 ? "<0,1%" : fmt(Math.round(v * 10) / 10) + "%", mx = Math.max(1, ...baris.map(o => o[w + "_persen"])), X = v => v / mx * (W - L - R);
    const pendek = t => U.M && t.length > 22 ? t.slice(0, 21) + "…" : t;
    const g = baris.map((o, i) => { const y = i * rh, v = o[w + "_persen"], bw = Math.max(2, X(v)), warna = o.titik_hilang ? MERAH : BIRU;
      const tip = o.lain ? `<b>${esc(o.label)}</b><br>Luas: ${fmt(Math.round(o.km2))} km²<br>Porsi hujan: ${pc(v)}`
        : `<b>Sekitar ${esc(o.label)}</b><br>Luas: ${fmt(Math.round(o.km2))} km²<br>Hujan rata-rata: ${o[w + "_mm"] == null ? "–" : fmt(o[w + "_mm"]) + " mm"}<br>Porsi hujan: ${pc(v)}${o.konsesi_ha ? `<br>Konsesi: ${fmt(o.konsesi_ha)} ha` : ""}${o.keluaran ? "<br>Sub-DAS keluaran" : ""}${o.titik_hilang ? "<br>Sel hutan hilang terbanyak sejak 2021" : ""}`;
      const kons = o.konsesi_ha && !U.M ? this.p(W - R + 70, y + 5, `${fmt(o.konsesi_ha)} ha konsesi`, NAVY, "#fff", 11)[0] : "";
      return `<g data-tip="${esc(tip)}"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${fs}" font-weight="600"><tspan translate="no">${esc(pendek(o.label))}</tspan></text>`
        + `<rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${bw}" height="${rh - 10}" rx="3" fill="${warna}"/>`
        + `<g class="gf" style="--i:${i}">${this.p(L + bw + 8, y + 5, pc(v, o[w + "_mm"]), warna, "#fff")[0]}</g>${kons}</g>`; }).join("");
    const t = top[0], ket = w === "lalu" ? `hujan ${kapan}` : `prakiraan hujan ${kapan}`;
    const judul = t ? `${this.hl(pc(t[w + "_persen"]))} ${ket} di hulu <span translate="no">${esc(d.kab)}</span> jatuh di sub-DAS sekitar <span translate="no">${esc(t.label)}</span>${l0 >= 2 ? `; status kab hari ini ${NL[l0]}` : lv >= 2 ? `; status kab diprakirakan ${NL[lv]} sampai ${tg(H.status_hari[1])}` : ""}`
      : `Belum ada hujan tercatat di hulu <span translate="no">${esc(d.kab)}</span> untuk ${kapan}`;
    const opsi = H.daerah.map(x => [esc(x.slug), `${esc(x.kab)}${x.status.maks >= 2 ? (x.status.maks === 3 ? ", Awas" : ", Siaga") : ""}`]);
    Kartu.leg([[BIRU, "porsi hujan sub-DAS"], [MERAH, "memuat sel hutan hilang terbanyak sejak 2021"], ...(U.M ? [] : [[NAVY, "konsesi di sub-DAS"]])]);  /* layar sempit: konsesi cukup di tooltip */
    return this.ex(judul, "", "", top.length ? `<svg viewBox="0 0 ${W} ${baris.length * rh + 6}" role="img" aria-label="Porsi hujan per sub-DAS hulu">${g}</svg>` : "",
      `Sumber: hujan Open-Meteo kisi 0,25 derajat, batas HydroBASINS v1c; hutan hilang dan konsesi hulu di <a href="/banjir/laporan-das.html#${esc(d.slug)}">Bukti DAS hulu</a>. Porsi volume hujan, bukan debit sungai${H.status_cocok === false ? ". Status kab tidak ditampilkan: data status beda hari dengan data hujan" : ""}`,
      this.selJenis("hulu", opsi, "Daerah") + this.seg("hj", [["lalu", "3 hari terakhir"], ["depan", "3 hari ke depan"]])); },

  /* 6c. uji balik: seberapa tepat status ini (validasi.json, uji_balik.py); angka apa adanya, termasuk yang buruk */
  exUjibalik() {
    const V = S.validasi; if (!V) return "";
    const j = this.st.ub, nama = j, P = this.st.pulau, Z = V[j]; if (!Z) return "";
    const pulau = Object.keys(Z.pulau || {}), sumber = P && Z.pulau?.[P] ? Z.pulau[P] : Z, ada = sumber === Z ? "" : P;
    const T = [["waspada", "Waspada", 1], ["siaga", "Siaga", 2], ["awas", "Awas", 3]].map(([k, n, l]) => ({k, n, l, r: sumber[k]})).filter(x => x.r);
    const sg = sumber.siaga, pc = v => v == null ? "–" : fmt(Math.round(v * 100)) + "%", nKej = r => r.n.a + r.n.c;
    /* persen dari cacah a,b,c (tepat) bila ada; nilai 3 desimal di berkas sudah dibulatkan, membulatkannya lagi menggeser persen (602/1.065 = 56,5%) */
    const nil = (r, m) => { const {a, b, c} = r.n || {}, bg = (x, y) => y ? x / y : null; return a == null ? r[m] : m === "pod" ? bg(a, a + c) : m === "far" ? bg(b, a + b) : bg(a, a + b + c); };
    const ci = (r, m) => nil(r, m) == null ? "–" : `${pc(nil(r, m))}${r.ci?.[m] ? `<small style="display:block;opacity:.7">(${fmt(Math.round(r.ci[m][0] * 100))}–${fmt(Math.round(r.ci[m][1] * 100))}%)</small>` : ""}`;
    const tb = `<div class="tw"><table><thead><tr><th>Tingkat</th><th class="n">Kejadian tertangkap</th><th class="n">Peringatan tanpa kejadian</th><th class="n">Ketepatan gabungan</th><th class="n">Jumlah kejadian</th></tr></thead><tbody>${T.map(x => `<tr><td>${pill(x.l)}</td><td class="n num">${ci(x.r, "pod")}</td><td class="n num">${ci(x.r, "far")}</td><td class="n num">${ci(x.r, "csi")}</td><td class="n num">${fmt(nKej(x.r))}</td></tr>`).join("")}</tbody></table></div>`;
    const judul = sg && nil(sg, "pod") != null ? `Status ${nama} siaga menangkap ${this.hl(pc(nil(sg, "pod")))} kejadian${ada ? ` di <span translate="no">${esc(ada)}</span>` : ""}, tetapi ${this.hl(pc(nil(sg, "far")))} peringatannya tidak diikuti kejadian tercatat`
      : `Belum ada kejadian ${nama} yang cukup untuk menguji status siaga${ada ? ` di <span translate="no">${esc(ada)}</span>` : ""}`;
    return this.ex(judul, "", "", tb, `Sumber: DIBI BNPB ${V.periode_uji}, per kabupaten-hari; rentang 95% dari 1.000 ulangan acak. Hujan ERA5 dipakai sebagai prakiraan sempurna, jadi ini batas atas. Hanya jalur hujan, intensitas, dan tanah yang diuji; sungai dan ansambel tidak. ${j === "longsor" ? "Longsor 2024 dikecualikan. " : ""}Kejadian kecil sering tidak tercatat, jadi peringatan tanpa kejadian bisa tampak lebih banyak`,
      this.selJenis("pulau", [["", "Semua pulau"], ...pulau.map(g => [g, g])], "Pulau") + this.seg("ub", [["banjir", "Banjir"], ["longsor", "Longsor"]])); },

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
    g += pv.map((x, i) => { const m = Math.max(1, ...x.v); return `<text x="${L - 10}" y="${T0 + i * rh + 17}" text-anchor="end" font-size="12.5" font-weight="600">${esc(namaProv(x.k))}</text>` + x.v.map((n, b) => `<rect x="${L + b * cw + 1.5}" y="${T0 + i * rh + 3}" width="${cw - 3}" height="${rh - 6}" rx="4" style="fill:${n ? `color-mix(in oklch, #3f7fb8 ${Math.round(15 + n / m * 80)}%, var(--surface))` : "var(--surface)"}" data-tip="<b>${esc(namaProv(x.k))}, ${BLN[b]}</b><br>Kejadian: ${fmt(n)}"/>`).join("") + `<text x="${W - 4}" y="${T0 + i * rh + 17}" text-anchor="end" font-size="12" font-weight="700">${fmt(x.n)}</text>`; }).join("");
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
  ulang(box, sesudah) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); this.pasangUrut(box); if (sesudah) nanti(sesudah); }); },
  async render() {
    const [kej, val, , akt, ph, pa] = await Promise.all([S.kejadian || muatJSON("data/kejadian.json").catch(() => null), S.validasi || muatJSON("data/validasi.json").catch(() => null), Pra72.muat(),
      this.aktif === undefined ? muatJSON("data/kejadian_aktif_awal.json").catch(() => null) : this.aktif,
      typeof Peluang !== "undefined" ? Peluang.muat("data/peluang.json") : null, muatJSON("data/pasang_astro.json").catch(() => null)]);
    this.PH = ph; this.PA = pa;
    this.HU = await muatJSON("data/hulu.json").catch(() => null);
    S.kejadian ||= kej; S.validasi ||= val; if (this.aktif === undefined) this.aktif = akt;
    const el = $("#insight");
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("");
    el.querySelectorAll("[data-ex]").forEach(b => this.pasangUrut(b));
    Cerita.sisip(el, "banjir");
    el.onchange = e => { const m = e.target.closest("input[data-multi]");
      if (m) { const k = m.dataset.multi, box = m.closest(".pm-menu"); if (!m.value) box.querySelectorAll("input[value]:not([value=''])").forEach(x => x.checked = false); else box.querySelector("input[value='']").checked = false;
        this.st[k] = [...box.querySelectorAll("input:checked")].map(x => x.value).filter(Boolean).join(","); Kartu._bukaMulti = k; Object.values(this.T).forEach(t => t.hal = 0); return this.ulang(m.closest("[data-ex]")); }
      const s = e.target.closest("select[data-set]"); if (s) { const key = s.dataset.set, box = s.closest("[data-ex]"); this.st[key] = s.value;
        this.ulang(box, () => { const n = box.querySelector(`select[data-set="${key}"]`); (n?.parentElement?.querySelector(".pc-btn") || n)?.focus({preventScroll: true}); }); } };
    el.onclick = e => {
      const s = e.target.closest("[data-set]"); if (s && s.tagName !== "SELECT") { const key = s.dataset.set, v = s.dataset.v, box = s.closest("[data-ex]"); this.st[key] = v;
        s.parentElement.querySelectorAll("[data-set]").forEach(x => x.setAttribute("aria-pressed", x === s));  /* tanggapan langsung; gambar ulang menyusul */
        return this.ulang(box, () => box.querySelector(`[data-set="${key}"][data-v="${v}"]`)?.focus({preventScroll: true})); }
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
/* kartu Cerita (inti/cerita.js): rekap BNPB/DIBI per tahun + status hari ini, dari data/dampak.json */
Cerita.daftar("banjir", async () => { const D = await muatJSON("data/dampak.json").catch(() => null), c = Cerita.dibi(D?.tahunan?.nasional, "terdampak", "banjir"); if (!c) return null;
  const P = D.terpapar, st = P?.kec ? [["#c9503a", "Status", `Pada ${new Date(D.hari + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long"})}, ${fmt(P.kec)} kecamatan berstatus Siaga atau Awas banjir, dihuni ${Cerita.kata(P.penduduk)} jiwa (penduduk seluruh kecamatan, bukan area tergenang).`]] : [];
  return {judul: c.judul, baris: [...st, ...c.baris], sumber: "BNPB, data.bnpb.go.id; DIBI BNPB; WorldPop"}; });
