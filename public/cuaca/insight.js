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
  ansambel: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', peluang: '<path d="M3 20h18M6 20v-6M11 20V8M16 20v-9"/><path d="M4 7l4-3 4 3 4-3 4 3"/>', siklon: '<path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 3a9 9 0 0 1 9 9M12 21a9 9 0 0 1-9-9M12 6a6 6 0 0 1 6 6M12 18a6 6 0 0 1-6-6"/>', bukti: '<path d="M5 12l4 4 10-10"/><circle cx="12" cy="12" r="9"/>', status: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', sarana: '<path d="M4 20V9l8-5 8 5v11H4Z"/><path d="M10 20v-6h4v6"/>', provinsi: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'};

IK.buktiBmkg = IK.buktiKita = IK.bukti;

const Insight = {
  /* tabel provinsi: urut menurun menurut hujan, 10 baris per halaman */
  T: {provinsi: {urut: "hujan", turun: true, hal: 0}},
  EX: ["status", "siklon", "sarana", "buktiBmkg", "buktiKita", "nowcast", "gelombang", "hujan", "angin", "ansambel", "peluang", "provinsi"],
  st: {},   /* state kontrol kartu peluang (wilayah, ambang) */
  PL: null,
  ih: 0, lead: "1",   /* hari kartu Status: indeks di kontrak 72 jam */
  LABEL: {peluang: "Peluang hujan ekstrem", status: "Wilayah Siaga/Awas 72 jam", siklon: "Siklon tropis", sarana: "Pelabuhan dan bandara terancam", buktiBmkg: "Ketepatan peringatan BMKG", buktiKita: "Ketepatan prakiraan Centurisk97", nowcast: "Nowcast BMKG", gelombang: "Gelombang", hujan: "Hujan", angin: "Angin", ansambel: "Ansambel", provinsi: "Provinsi"},
  /* 10b. peluang hujan ekstrem per kab/provinsi (../banjir/data/cuaca_peluang.json, kontrak peluang/1; mesin public/inti/peluang.js). Tanpa berkas = dibuang. */
  exPeluang() { if (typeof Peluang === "undefined" || !this.PL) return ""; this.st.pelW ??= Object.entries(this.PL.wilayah).filter(([, w]) => w.tingkat === "provinsi").map(([k, w]) => [k, Math.max(0, ...w.hari.map(h => h.p?.[0] ?? 0))]).sort((a, b) => b[1] - a[1])[0]?.[0];
    return Peluang.kartu(this.PL, {ey: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK.peluang}</svg>${this.LABEL.peluang}`, st: this.st, kejadian: "hujan ekstrem", sumber: "ECMWF IFS 51 anggota via Open-Meteo, dibuat " + jamWIB(this.PL?.dibuat)}); },
  ex: (...a) => Kartu.ex(...a), hl: Kartu.hl, pil: Kartu.pil,
  uk() { const M = innerWidth < 640; return M ? {M, W: 520, L: 130, rh: 30, fs: 13} : {M, W: 940, L: 260, rh: 30, fs: 13}; },
  kapan: t => t.ini && !basi() ? "hari ini" : t.i === S.h0 + 1 && !basi() ? "besok" : `pada <span translate="no">${t.label}</span>`,
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

  /* status 72 jam: deteksi Centurisk97 dari prakiraan model; berkas cuaca_kec.json tak ada = kartu dibuang */
  exStatus() {
    if (!S.kec) return ""; const j = Math.min(this.ih, S.kec.hari.length - 1), W = [1, 2, 3];
    const R = Status.urutProv(j).slice(0, 15), n = [0, 1, 2].map(i => Object.values(S.kec.prov).reduce((a, o) => a + (o.n[j][i] || 0), 0)), tot = n[0] + n[1] + n[2];
    const ctl = `<div class="seg penuh" role="group">${S.kec.hari.map((h, d) => `<button data-sth="${d}" aria-pressed="${d === j}">${lbl3(d)}</button>`).join("")}</div>`;
    Kartu.leg(W.map(t => [warnaT(t), namaT(t)]));
    const kapan = kapan3(j);
    return this.ex(tot ? `${this.hl(fmt(tot) + " kecamatan")} diprakirakan berstatus Waspada atau lebih ${kapan}, ${this.hl(fmt(n[1] + n[2]) + " kecamatan")} Siaga atau Awas`
      : `Tidak ada kecamatan yang diprakirakan melewati ambang Waspada ${kapan}`, "", "",
      tot ? this.tumpukH(R.map(([p, o]) => ({label: namaProv(p), warna: warnaT(o.t[j]), seg: [2, 1, 0].map(i => ({nilai: o.n[j][i], warna: warnaT(i + 1), tip: `<b>${esc(namaProv(p))}</b><br>${namaT(i + 1)}: ${fmt(o.n[j][i])} kecamatan`}))})), this.uk()) : "",
      `Sumber: Deteksi Centurisk97 dari prakiraan Open-Meteo, dibuat ${jamWIB(S.kec.dibuat)}`, ctl); },
  /* siklon aktif dari JTWC/GDACS; "aktif: []" = kartu dibuang, bukan "aman" */
  exSiklon() {
    const A = S.sik?.aktif; if (!A?.length) return ""; const kmj = v => Math.round(v * 1.852), U = this.uk();
    const w = x => new Date(x).toLocaleString("id-ID", {...WIB, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "");
    const R = A.flatMap(c => (c.lintasan || []).slice(0, 14).map(x => ({label: (A.length > 1 ? c.nama + " " : "") + w(x[0]), nilai: kmj(x[3]), warna: x[4] === "amatan" ? "#7a1f2b" : "#c9503a", teks: fmt(kmj(x[3])), tip: `<b>${esc(c.nama)}</b><br>${x[4] === "amatan" ? "Amatan" : "Prakiraan"} ${w(x[0])} WIB<br>Angin ${fmt(kmj(x[3]))} km/jam`})));
    const c = [...A].sort((a, b) => (b.angin_kt || 0) - (a.angin_kt || 0))[0]; Kartu.leg([["#7a1f2b", "Amatan"], ["#c9503a", "Prakiraan"]]);
    return this.ex(`${this.hl("Siklon tropis " + esc(c.nama))}${A.length > 1 ? " dan " + (A.length - 1) + " lainnya" : ""} berangin ${this.hl(fmt(kmj(c.angin_kt)) + " km/jam")}${c.kategori ? ", " + esc(String(c.kategori).toLowerCase()) : ""}`, "", "", R.length ? this.batangH(R, U) : "",
      `Sumber: ${[...new Set(A.map(x => esc(x.sumber)))].join(", ")}, dibuat ${jamWIB(S.sik.dibuat)}`); },
  /* ketepatan: a = tepat, b = alarm palsu, c = meleset. Singkatan dan rumus hanya di Metode. */
  tepat(R, U, kode) {
    return this.tumpukH(R.map(([k, o]) => ({label: k === "ID" ? "Nasional" : namaProv(k), warna: "#2b8c86", seg: [[o.a, "#2b8c86", "tepat"], [o.c, "#e58a45", "meleset"], [o.b, "#c9503a", "alarm palsu"]].map(([n, w, t]) => ({nilai: n, warna: w, tip: `<b>${k === "ID" ? "Nasional" : esc(namaProv(k))}</b><br>${fmt(n)} ${t}`}))})), U); },
  /* judul ketepatan: di bawah n_min penilaian tak ada persen dan skor; "tertangkap" = bagian kejadian yang didahului peringatan, "alarm palsu" = bagian peringatan tanpa kejadian */
  /* tanggal periode lengkap bertahun tanpa nama hari */
  tglLengkap: t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"}),
  buktiIsi(o, mulai, nmin, akhir) { const n = o.a + o.b + o.c, tgl = mulai ? ` sejak ${this.tglLengkap(mulai)}${akhir ? " sampai " + this.tglLengkap(akhir) : ""}` : "";
    if (n < nmin) return `Belum bisa dinilai: baru ${this.hl(fmt(n) + " penilaian")}${tgl}`;
    const tg = pct(o.a, o.a + o.c), fa = pct(o.b, o.a + o.b);
    return `${tg == null ? "" : this.hl(fmt(tg) + "% kejadian") + " tertangkap, "}${fa == null ? "" : this.hl(fmt(fa) + "%") + " alarm palsu "}(${fmt(n)} penilaian${tgl})`; },
  kartuBukti(judul, o, R, ket, sumber, ctl = "") {
    Kartu.leg([["#2b8c86", "Tepat"], ["#e58a45", "Meleset"], ["#c9503a", "Alarm palsu"]]);
    return this.ex(judul, "", "", (o.a + o.b + o.c ? this.tepat(R, this.uk()) : "") + ket, `Sumber: ${sumber}, dibuat ${jamWIB(S.ver.dibuat)}`, ctl); },
  exBuktiBmkg() {
    const B = S.ver?.bmkg; if (!B?.nasional) return ""; const n = B.nasional, nmin = B.n_min ?? 30, acuan = B.kejadian ? esc(B.kejadian) : "DIBI BNPB";
    const R = [["ID", n], ...Object.entries(B.prov || {}).filter(([, o]) => o.a + o.b + o.c).sort((a, b) => (b[1].a + b[1].b + b[1].c) - (a[1].a + a[1].b + a[1].c)).slice(0, 12)];
    return this.kartuBukti(`Peringatan BMKG: ${this.buktiIsi(n, B.mulai, nmin, B.dinilai_sampai)}`, n, R, "", `arsip nowcast BMKG sejak ${this.tglLengkap(B.mulai)}, ${acuan}`); },
  exBuktiKita() {
    const K = S.ver?.kita; if (!K?.lead) return ""; const l = this.lead, n = K.lead[l], mulai = K.periode?.[0] || S.ver.bmkg?.mulai, nmin = K.n_min ?? 30; if (!n) return "";
    const ctl = `<div class="seg penuh" role="group">${["1", "2", "3"].filter(x => K.lead[x]).map(x => `<button data-sld="${x}" aria-pressed="${x === l}">${x} hari sebelumnya</button>`).join("")}</div>`;
    /* kita.prov[kode] = {"1": {...}, "2": ..., "3": ...}; bentuk lama (lead dalam .lead, atau satu objek) tetap terbaca */
    const g = o => o?.[l] ?? o?.lead?.[l] ?? (o?.a != null ? o : null);
    const R = [["ID", n], ...Object.entries(K.prov || {}).map(([k, o]) => [k, g(o)]).filter(([, o]) => o && o.a + o.b + o.c).sort((a, b) => (b[1].a + b[1].b + b[1].c) - (a[1].a + a[1].b + a[1].c)).slice(0, 12)];
    return this.kartuBukti(`Prakiraan ${l} hari sebelumnya: ${this.buktiIsi(n, mulai, nmin, K.periode?.[1])}`, n, R, n.a + n.b + n.c ? `<p class="fnd">Hujan ${fmt(K.ambang_mm)} mm atau lebih dalam sehari.</p>` : "", `Centurisk97, ${esc(K.acuan || "DIBI BNPB")}`, ctl); },
  /* pelabuhan dan bandara dengan status Waspada atau lebih pada hari ini (hari pertama kontrak 72 jam) */
  exSarana() {
    if (!S.sar || !S.dmp) return ""; const j = Math.max(0, kIdx()), pel = (S.dmp.pelabuhan || []).filter(r => r[1][j] > 0).sort((a, b) => b[1][j] - a[1][j] || b[2] - a[2]),
      ban = (S.dmp.bandara || []).filter(r => r[1][j] > 0).sort((a, b) => b[1][j] - a[1][j] || b[3] - a[3]); if (!pel.length && !ban.length) return "";
    const U = this.uk(), P = pel.slice(0, 10).map(r => { const s = S.sar.pelabuhan[r[0]]; return {label: s[0], nilai: r[2], warna: warnaT(r[1][j]), teks: fmt(r[2] / 10) + " m", tip: `<b>${esc(s[0])}</b><br>${namaT(r[1][j])}<br>Gelombang tertinggi ${fmt(r[2] / 10)} m, embusan ${fmt(r[3])} km/jam`}; }),
      B = ban.slice(0, 10).map(r => { const s = S.sar.bandara[r[0]]; return {label: s[1], nilai: Math.max(1, r[2]), warna: warnaT(r[1][j]), teks: fmt(r[2]) + " mm", tip: `<b>${esc(s[1])}</b><br>${namaT(r[1][j])}<br>Hujan ${fmt(r[2])} mm, embusan ${fmt(r[3])} km/jam`}; });
    Kartu.leg([1, 2, 3].map(t => [warnaT(t), namaT(t)]));
    return this.ex(`${this.hl(fmt(pel.length) + " pelabuhan")} dan ${this.hl(fmt(ban.length) + " bandara")} diprakirakan berstatus Waspada atau lebih ${kapan3(j)}`, "", "",
      (P.length ? this.batangH(P, U) : "") + (B.length ? this.batangH(B, U) : ""), `Sumber: Deteksi Centurisk97 dari prakiraan Open-Meteo dan Open-Meteo Marine, dibuat ${jamWIB(S.dmp.dibuat || S.kec?.dibuat || S.meta.dibuat)}`); },
  exNowcast() {
    const A = [...S.nc].sort((a, b) => b.n - a.n).slice(0, 12); if (!S.per) return "";
    const nProv = new Set(S.nc.flatMap(a => a.prov)).size, nKec = S.nc.reduce((a, x) => a + x.n, 0);
    Kartu.leg(Object.entries(WARNA_SEV).filter(([k]) => S.nc.some(a => a.severity === k)).map(([k, w]) => [w, k]));
    return this.ex(A.length ? `${this.hl(fmt(nKec) + " kecamatan")} di ${this.hl(fmt(nProv) + " provinsi")} dalam peringatan nowcast BMKG yang berlaku` : `Tidak ada peringatan nowcast BMKG yang berlaku`, "", "",
      A.length ? this.batangH(A.map(a => ({label: innerWidth < 640 ? a.headline.split(" di ").pop() : a.headline, nilai: a.n, warna: sevWarna(a.severity), teks: fmt(a.n), tip: `<b>${esc(a.event)}</b> · ${esc(a.severity)}<br>Kecamatan: ${fmt(a.n)} kecamatan<br>${waktuBerlaku(a.mulai, a.selesai)}`})), this.uk()) : "",
      `Sumber: BMKG, terbit ${jamWIB(S.ncDibuat ?? S.per.dibuat)}`); },
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
      : `Belum ada hujan 50 mm atau lebih diprakirakan; terlebat ${this.hl(fmt(Math.round(t.nilai)) + " mm")} di ${this.nm(t.r[2])} ${this.kapan(t)}`, "", "", this.batangV(D, AMB().hujan, "mm"), `Sumber: Open-Meteo, dibuat ${jamWIB(S.meta.dibuat)}`); },
  exAngin() {
    const D = hariTampil().map(i => { const m = this.maksHari(i, 4), h = S.meta.hitung[i]; return {i, nilai: m.v, r: m.r, label: labelHari(i), ini: i === S.h0, warna: warnaAngin(m.v),
      tip: `<b>${labelHari(i)}</b><br>Terkuat: ${fmt(Math.round(m.v))} km/jam<br>Sel ≥ 54 km/jam: ${fmt(h.angin.reduce((a, b) => a + b, 0))} sel`}; });
    const t = D.reduce((a, d) => d.nilai > a.nilai ? d : a, D[0]); if (!t || !t.r) return "";
    Kartu.leg([[HIJAU, "di bawah 54 km/jam"], ["#c99a1e", "waspada"], [WARNA_LV[2], "siaga"], [WARNA_LV[3], "awas"]]);
    return this.ex(`Embusan angin terkuat ${this.hl(fmt(Math.round(t.nilai)) + " km/jam")} diprakirakan di ${this.nm(t.r[2])} ${this.kapan(t)}`, "", "", this.batangV(D, AMB().angin_kmj, "km/jam"), `Sumber: Open-Meteo, dibuat ${jamWIB(S.meta.dibuat)}`); },
  exAnsambel() {
    const D = hariTampil().map(i => { let p = 0, r = null; for (const e of S.pr.ens) { const v = e[3][i]; if (v != null && v > p) { p = v; r = e; } }
      return {i, nilai: Math.round(p * 100), r, ada: S.pr.ens.some(e => e[3][i] != null), label: labelHari(i), ini: i === S.h0, warna: p >= .5 ? WARNA_LV[3] : p >= .25 ? WARNA_LV[2] : BIRU,
        tip: `<b>${labelHari(i)}</b><br>Peluang tertinggi: ${Math.round(p * 100)}%<br>Titik di atas 50%: ${S.meta.hitung[i].ens} titik`}; }).filter(d => d.ada);
    const t = D.reduce((a, d) => d.nilai > a.nilai ? d : a, D[0]); if (!t || t.nilai < 10) return "";
    Kartu.leg([[BIRU, "di bawah 25%"], [WARNA_LV[2], "25% sampai 50%"], [WARNA_LV[3], "50% atau lebih"]]);
    return this.ex(`Peluang hujan 50 mm atau lebih sampai ${this.hl(t.nilai + "%")} di ${this.nm(t.r[2])} ${this.kapan(t)}`, "", "", this.batangV(D, [25, 50], "%", v => v + "%"), `Sumber: ECMWF IFS ansambel 51 anggota via Open-Meteo, dibuat ${jamWIB(S.meta.dibuat)}`); },
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
      `Sumber: Open-Meteo, ECMWF, BMKG, dibuat ${jamWIB(S.meta.dibuat)}`); },
  tabel(id, kol, baris, per, satuan) {
    const st = this.T[id], s = st.turun ? -1 : 1, kk = kol.find(c => c.k === st.urut) || kol[1];
    const R = [...baris].sort((a, b) => { const x = kk.v(a), y = kk.v(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / per) - 1));
    const hal = R.slice(st.hal * per, (st.hal + 1) * per);
    return `<div class="tw"><table><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${hal.map(r => `<tr class="klik">${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, R.length, per, satuan)}`; },

  /* satu kartu: label pil berikon di kepala; ikon bagikan dipasang mesin Bagikan (public/bagikan.js) */
  gambar(id) { Kartu._leg = null;
    try { let h = this["ex" + id[0].toUpperCase() + id.slice(1)](); if (!h) return "";
      if (id === "status" || id === "sarana") h = beriAmbang(h);   /* angka bergantung pada ambang tingkat kecamatan: pil hipotesis sampai teruji */
      return h.replace('<span class="ex-ey"></span>', `<span class="ex-ey"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[id]}</svg>${this.LABEL[id]}</span>`);
    } catch (e) { console.error(e); return ""; } },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); },
  async render() {
    const el = $("#insight");
    if (typeof Peluang !== "undefined") this.PL = await Peluang.muat("../banjir/data/cuaca_peluang.json");
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("");
    Cerita.sisip(el, "cuaca");
    el.addEventListener("change", e => { const s = e.target.closest("select[data-set]"); if (s) { this.st[s.dataset.set] = s.value; this.ulang(s.closest("[data-ex]")); } });
    el.onclick = e => {
      const ds = e.target.closest("button[data-set]"); if (ds) { this.st[ds.dataset.set] = ds.dataset.v; ds.parentElement.querySelectorAll("[data-set]").forEach(b => b.setAttribute("aria-pressed", b === ds)); this.ulang(ds.closest("[data-ex]")); return; }
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; halUrgen(pg, box); this.ulang(box); } return; }
      const sl = e.target.closest("button[data-sld]"); if (sl) { this.lead = sl.dataset.sld; sl.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === sl)); this.ulang(sl.closest("[data-ex]")); return; }
      const sh = e.target.closest("button[data-sth]"); if (sh) { const box = sh.closest("[data-ex]"); this.ih = +sh.dataset.sth;
        sh.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === sh)); this.ulang(box); return; }   /* kontrol urgent dulu, kartu menyusul */
      const th = e.target.closest("th button[data-k]"); if (th) { const box = th.closest("[data-ex]"), st = this.T[box.dataset.ex], k = th.dataset.k;
        st.turun = st.urut === k ? !st.turun : true; st.urut = k; st.hal = 0;
        box.querySelectorAll("th").forEach(h => { const b = h.querySelector("button"), on = b === th; h.setAttribute("aria-sort", on ? (st.turun ? "descending" : "ascending") : "none"); b.querySelector("i").textContent = on ? (st.turun ? "↓" : "↑") : ""; });
        this.ulang(box); } };
  },
};
/* kartu Cerita (inti/cerita.js): rekap BNPB per tahun (diperingkat menurut rumah rusak: jiwa terdampak cuaca ekstrem jarang tercatat) + prakiraan hujan hari ini */
Cerita.daftar("cuaca", async () => { const D = await muatJSON("../banjir/data/cuaca_dampak.json").catch(() => null), c = Cerita.dibi(D?.tahunan?.nasional, "rumah_rusak", "cuaca ekstrem"); if (!c) return null;
  const P = D.terpapar?.[D.hari_ini], st = P?.penduduk ? [["#c9503a", "Status", `Pada ${new Date(D.hari_ini + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long"})}, hujan ${fmt(D.ambang_mm)} mm atau lebih diprakirakan turun di area berpenduduk ${Cerita.kata(P.penduduk)} jiwa (prakiraan, bukan jiwa yang sudah terdampak).`]] : [];
  return {judul: c.judul, baris: [...st, ...c.baris], sumber: "BNPB, data.bnpb.go.id; DIBI BNPB; Open-Meteo; WorldPop"}; });
