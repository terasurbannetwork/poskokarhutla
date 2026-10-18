"use strict";
/* Tab Tren: tiap blok = Kartu.ex (inti/kartu.js), tabel = tb() di bawah (paginasi + pengurutKepala dari inti/tabel.js).
   Jenis dan provinsi di atas menggambar ulang semua kartu; kartu bertabel menyimpan keadaannya di Tren.T dan menggambar ulang dirinya sendiri. */
/* dua desimal lewat toLocaleString supaya i18n.js menukar koma jadi titik di EN (f2 di peta.js menulis koma mati) */
const F2 = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const Tren = {
  jenis: "banjir", prov: "", seri: undefined, rows: {}, c: null,
  /* prov = kode dipisah koma (pemilih provinsi ganda, pemilik 18 Okt 2026); "" = Indonesia */
  get PV() { return this.prov ? this.prov.split(",") : []; },
  get nmPv() { const P = this.PV; return P.length > 3 ? P.length + " provinsi" : P.map(namaProv).join(", "); },
  T: {periode: {mMode: "semua"}, risiko: {rt: "kab", rprov: "", urut: "skor", turun: true, hal: 0}, langganan: {urut: "tahun", turun: true, hal: 0}, prov: {urut: "n", turun: true, hal: 0}, posko: {urut: "kejadian", turun: true, hal: 0}},
  get rj() { return ["banjir", "longsor", "rob"].includes(this.jenis) ? this.jenis : null; },
  /* periode siaga: busur terpendek yang memuat semua dasarian berpeluang >= 30%. Musim hujan melintasi tahun baru
     (Nov-Mar), jadi dicari celah terpanjang di lingkaran 36 dasarian; musim mulai sesudah celah itu. -> [awal, akhir] */
  siagaIdx(p) { const i = p.map((v, j) => v >= .3 ? j : -1).filter(j => j >= 0); if (!i.length) return null;
    let g = -1, a = i[0], z = i.at(-1); i.forEach((x, k) => { const nx = k < i.length - 1 ? i[k + 1] : i[0] + 36; if (nx - x > g) { g = nx - x; z = x; a = nx % 36; } }); return [a, z]; },
  siaga(p) { const r = this.siagaIdx(p); return !r ? "tidak ada" : r[0] === r[1] ? DAS(r[0]) : DAS(r[0]) + " – " + DAS(r[1]); },

  /* ---------- perkakas kartu */
  jn: t => `<span>${t}</span>`,
  ang: v => v < 10 ? fmt(Math.round(v * 10) / 10) : rb(v),
  nil(k, t, f = "kejadian") { return this.c.K.prov[k]?.[this.jenis]?.[t]?.[f] || 0; },
  /* kartu bergaya Insight: ey = pil kategori, leg = [[warna, nama]] untuk kaki, ctl = pemilih (pemilih pertama pindah ke kanan judul) */
  kartu(ey, judul, isi, sumber, ctl = "", leg = null) { if (leg) Kartu.leg(leg);
    return Kartu.ex(judul, "", "", isi, "Sumber: " + sumber, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
  pola(v, warna) { const m = Math.max(...v, 1);
    return `<svg viewBox="0 0 ${v.length * 6} 16" width="${v.length * 6}" height="16" aria-hidden="true">${v.map((x, k) => `<rect x="${k * 6}" y="${16 - x / m * 15}" width="4.5" height="${Math.max(.5, x / m * 15)}" fill="${warna(k)}"/>`).join("")}</svg>`; },
  /* tabel standar: kepala gelap, kolom bisa diurut (pengurutKepala), sudut atas membulat, paginasi.
     kol = [{k, h, n: angka, l: rata kiri, v: nilai urut (tanpa v = tak bisa diurut), s: (baris, nomor) => html sel}] */
  tb(nama, kol, rows, per, satuan, attr) {
    const st = this.T[nama], k = kol.find(c => c.k === st.urut && c.v) || kol.find(c => c.v), w = r => k.v(r) ?? -1;
    const a = this.rows[nama] = [...rows].sort((x, y) => { const p = w(x), q = w(y), d = typeof p === "string" ? p.localeCompare(q) : p - q; return st.turun ? -d : d; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(a.length / per) - 1));
    const dari = st.hal * per, cls = c => [c.n ? "n" : "", c.l ? "l" : ""].filter(Boolean).join(" ");
    return `<div class="tw"><table class="kl-tb"><thead><tr>${kol.map(c => `<th class="${cls(c)}">${c.v ? `<button data-k="${c.k}">${c.h}<i>${c.k === k.k ? (st.turun ? "↓" : "↑") : ""}</i></button>` : c.h}</th>`).join("")}</tr></thead><tbody>
      ${a.slice(dari, dari + per).map((r, i) => `<tr class="klik" tabindex="0" ${attr(r, dari + i)}>${kol.map(c => `<td class="${cls(c)}${c.n ? " num" : ""}">${c.s(r, dari + i)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, a.length, per, satuan)}`; },

  /* ---------- kartu bertabel (digambar ulang sendiri) */
  /* kalender periode rawan: peluang tiap 10 hari masuk periode banyak kejadian (riwayat.json musim) */
  kPeriode() {
    const j = this.rj, M = Riwayat.R.musim[j]; if (!M) return "";
    const T = this.T.periode, kunci = {semua: "p_semua", la_nina: "p_la_nina", biasa: "p_biasa"}[T.mMode], kini = dasKini(), rentang = Riwayat.R.musim[j + "_tahun"];
    const ks = Object.keys(M).sort((a, b) => namaProv(a).localeCompare(namaProv(b))), nRawan = ks.filter(k => M[k][kunci][kini] >= .3).length;
    const baris = ks.map(k => { const o = M[k], pp = o[kunci], sg = this.siaga(pp);
      return `<div class="nm" data-mp="${k}" aria-current="${this.PV.includes(k)}">${esc(namaProv(k))}</div>`
        + pp.map((v, i) => `<div class="c${i === kini ? " kini" : ""}" style="background:${warnaMusim(v)}" data-tip="<b>${esc(namaProv(k))} · ${DAS(i)}</b><br>Peluang: ${Math.round(v * 100)}%<br>La Niña: ${Math.round(o.p_la_nina[i] * 100)}%<br>Biasa: ${Math.round(o.p_biasa[i] * 100)}%<br>Rata-rata: ${fmt(o.rata[i])} kejadian"></div>`).join("")
        + `<div class="sg num">${sg === "tidak ada" ? `<em class="br-lb" style="--w:#8a96a8">tidak ada</em>` : `<em class="br-lb" style="--w:#1d4e89">${sg.replace(" – ", " → ")}</em>`}</div>`; }).join("");
    const o = this.PV.length === 1 && M[this.prov], judul = o ? `${this.c.nmK}, ${esc(namaProv(this.prov))}: periode rawan ${Kartu.hl(this.siaga(o[kunci]))}, puncak ${Kartu.hl(DAS(o.puncak))}`
      : nRawan ? `${this.c.nmK}: ${Kartu.hl(fmt(nRawan) + " provinsi")} sedang di periode rawan` : `${this.c.nmK}: belum ada provinsi di periode rawan`;
    return this.kartu("Periode rawan", judul, `<div class="tw" style="border:0;box-shadow:none"><div class="kal"><div></div>${BLN.map(b => `<div class="bl">${b}</div>`).join("")}<div class="bl" style="grid-column:auto;justify-content:flex-start;padding-left:10px">Siaga (≥ 30%)</div>${baris}</div></div>`,
      `DIBI BNPB ${rentang[0]}–${rentang[1]}, ONI NOAA`, Kartu.seg("mMode", [["semua", "Semua tahun"], ["la_nina", "Tahun La Niña"], ["biasa", "Tahun biasa"]], T),
      [.1, .3, .5, .7, .9].map(v => [warnaMusim(v), Math.round(v * 100) + "%"])); },

  /* musim kejadian: bulan kejadian dari daftar DIBI tiga tahun terakhir, per provinsi (logika dari Insight.exMusim) */
  kMusim() {
    const K = this.c.K, E = K.kejadian_dibi || []; if (!E.length) return "";
    const j = this.jenis, cocok = e => j === "semua" || (j === "banjir" ? /banjir/.test(e.jenis) && e.jenis !== "banjir_rob" : j === "longsor" ? /longsor/.test(e.jenis) : e.jenis.includes(j));
    const per = {}; for (const e of E) { if (!cocok(e)) continue; const p = per[e.prov] ||= Array(12).fill(0); p[+e.tanggal.slice(5, 7) - 1]++; }
    const pv = Object.entries(per).map(([k, v]) => ({k, v, n: sumA(v)})).sort((a, b) => b.n - a.n).slice(0, 16); if (!pv.length) return "";
    const W = 940, L = 200, cw = (W - L - 70) / 12, rh = 28, T0 = 24, H = T0 + pv.length * rh, bn = new Date(Date.now() + 7 * 36e5).getUTCMonth();
    let g = BLN.map((b, i) => `<text x="${L + i * cw + cw / 2}" y="14" text-anchor="middle" font-size="11" font-weight="${i === bn ? 800 : 500}">${b}</text>`).join("") + `<text x="${W - 4}" y="14" text-anchor="end" font-size="11" font-weight="700">Total</text>`;
    g += pv.map((x, i) => { const m = Math.max(1, ...x.v); return `<text x="${L - 10}" y="${T0 + i * rh + 18}" text-anchor="end" font-size="12.5" font-weight="600">${esc(namaProv(x.k))}</text>`
      + x.v.map((n, b) => { const f = n / m; return `<rect x="${L + b * cw + 1.5}" y="${T0 + i * rh + 3}" width="${cw - 3}" height="${rh - 6}" rx="4" style="fill:${n ? `color-mix(in oklch, #3f7fb8 ${Math.round(15 + f * 80)}%, var(--surface))` : "var(--surface)"}" data-tip="<b>${esc(namaProv(x.k))} · ${BLN[b]}</b><br>Kejadian: ${fmt(n)}"/>`
        + (n ? `<text x="${L + b * cw + cw / 2}" y="${T0 + i * rh + 18}" text-anchor="middle" font-size="10.5" font-weight="700" style="fill:${f > .55 ? "#fff" : "currentColor"};pointer-events:none">${fmt(n)}</text>` : ""); }).join("")
      + `<text x="${W - 4}" y="${T0 + i * rh + 18}" text-anchor="end" font-size="12" font-weight="700">${fmt(x.n)}</text>`; }).join("");
    const bulan = Array(12).fill(0); pv.forEach(x => x.v.forEach((n, b) => bulan[b] += n)); const pk = bulan.indexOf(Math.max(...bulan)), th = [...new Set(E.map(e => e.tanggal.slice(0, 4)))].sort();
    return this.kartu("Musim", `${this.c.nmK}: kejadian memuncak pada ${Kartu.hl(BLN[pk])}; bulan ini ${Kartu.hl(fmt(Math.round(bulan[bn] / Math.max(1, ...bulan) * 100)) + "%")} dari puncak`,
      `<div class="tw" style="border:0;box-shadow:none"><svg viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Kalender kejadian">${g}</svg></div>`, `DIBI BNPB ${th[0]}–${th.at(-1)}`); },

  /* peringkat risiko (skor 0-100) per kab/kota atau kecamatan, pemilih provinsi ganda */
  kRisiko() {
    const j = this.rj; if (!j) return "";
    const J = Riwayat.R.jenis[j], T = this.T.risiko, t = j === "rob" ? "kab" : T.rt, P = String(T.rprov || "").split(",").filter(Boolean);
    const th = Riwayat.R.tahun, n = J.tahun_cakup.length, i0 = th.indexOf(J.tahun_cakup[0]), LN = new Set(Riwayat.R.la_nina.map(String));
    const daf = Riwayat.semua(j, t).filter(r => !P.length || P.includes(r.prov)).sort((a, b) => b.skor - a.skor || b.total - a.total);
    const kol = [{k: "no", h: "#", n: 1, s: (r, i) => `<span class="kl-no">${i + 1}</span>`},
      {k: "nama", h: t === "kec" ? "Kecamatan" : "Kab/Kota", l: 1, v: r => r.nama, s: r => `<b>${esc(r.nama)}</b>`},
      ...(t === "kec" ? [{k: "kab", h: "Kab/Kota", l: 1, v: r => r.kab, s: r => esc(r.kab)}] : []),
      {k: "prov", h: "Provinsi", l: 1, v: r => namaProv(r.prov), s: r => esc(namaProv(r.prov))},
      {k: "skor", h: "Skor", n: 1, v: r => r.skor, s: r => `<b>${r.skor}</b>`},
      {k: "lv", h: "Kelas", v: r => r.lv, s: r => `<span class="pill l${r.lv}">${r.kelas}</span>`},
      {k: "tahun", h: "Tahun berkejadian", n: 1, v: r => r.tahun, s: r => `<em class="br-lb" style="--w:${r.tahun >= n - 2 ? "#c9503a" : "#1d4e89"}">${fmt(r.tahun)} / ${fmt(n)} tahun</em>`},
      {k: "total", h: "Total kejadian", n: 1, v: r => r.total, s: r => fmt(r.total)},
      {k: "puncak", h: "Tahun puncak", n: 1, v: r => +r.puncak || 0, s: r => r.puncak || "–"},
      {k: "tren", h: "Tren", n: 1, v: r => r.tren, s: r => `<span style="color:${r.tren >= 1.5 ? "var(--bad)" : r.tren <= .67 ? "var(--ok)" : "inherit"}">${r.tren >= 1 ? "↑" : "↓"} ${fmt(r.tren)}×</span>`},
      ...(J.bobot.inarisk ? [{k: "ina", h: "InaRISK", n: 1, v: r => t === "kec" ? r.hKec : r.h, s: r => fmt(Math.round((t === "kec" ? r.hKec : r.h) * 100) / 100)}] : []),
      {k: "pola", h: `Pola ${th[i0]}–${th.at(-1)}`, s: r => this.pola(r.v.slice(i0), k => k === n ? "#9aa8b8" : LN.has(th[i0 + k]) ? "#1d4e89" : "#5b8fc7")}];
    const sangat = daf.filter(r => r.lv === 3).length, sat = t === "kec" ? "kecamatan" : "kab/kota", provs = Object.keys(J.prov).sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    return this.kartu("Risiko", `${this.c.nmK}: ${Kartu.hl(fmt(sangat) + " " + sat)} berisiko sangat tinggi di ${P.length ? esc(P.map(namaProv).join(", ")) : "Indonesia"}`,
      this.tb("risiko", kol, daf, 50, sat, (r, i) => `data-ri="${i}"`), `BNPB dan DIBI ${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)}${J.bobot.inarisk ? ", InaRISK" : ""}`,
      Kartu.selProvMulti("rprov", provs, namaProv, T) + (j === "rob" ? "" : Kartu.seg("rt", [["kab", "Kab/Kota"], ["kec", "Kecamatan"]], T))); },

  /* kab/kota langganan: ada kejadian di >= 2/3 tahun tercakup */
  kLangganan() {
    const j = this.rj; if (!j) return "";
    const J = Riwayat.R.jenis[j], n = J.tahun_cakup.length, batas = Math.ceil(n * 2 / 3), iA = Riwayat.R.tahun.length - 1, ini = this.c.ini;
    const lg = Object.keys(J.kab).map(k => Riwayat.rec(k, j)).filter(r => r.tahun >= batas && (!this.prov || this.PV.includes(r.prov))); if (!lg.length) return "";
    const kol = [{k: "no", h: "#", n: 1, s: (r, i) => `<span class="kl-no">${i + 1}</span>`},
      {k: "nama", h: "Kab/Kota", l: 1, v: r => r.nama, s: r => `<b>${esc(r.nama)}</b>`},
      {k: "prov", h: "Provinsi", l: 1, v: r => namaProv(r.prov), s: r => esc(namaProv(r.prov))},
      {k: "tahun", h: "Tahun berkejadian", v: r => r.tahun, s: r => `<em class="br-lb" style="--w:${r.tahun / n >= .85 ? "#c9503a" : "#1d4e89"}">${fmt(r.tahun)} / ${fmt(n)} tahun</em>`},
      {k: "total", h: `Total ${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)}`, n: 1, v: r => r.total, s: r => fmt(r.total)},
      {k: "ini", h: ini, n: 1, v: r => r.v[iA], s: r => fmt(r.v[iA])},
      {k: "skor", h: "Skor", n: 1, v: r => r.skor, s: r => `<span class="pill l${r.lv}">${r.skor}</span>`}];
    return this.kartu("Langganan", `${this.c.nmK}: ${Kartu.hl(fmt(lg.length) + " kab/kota")} langganan, kejadiannya tercatat di ≥ ${batas} dari ${n} tahun`,
      this.tb("langganan", kol, lg, 10, "kab/kota", r => `data-kl="${esc(r.kunci)}"`), `BNPB dan DIBI ${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)}`,
      Kartu.seg("urut", [["tahun", "Paling sering"], ["total", "Paling banyak"]], this.T.langganan)); },

  /* per provinsi: kejadian, korban, pola tahunan; klik baris memilih provinsi */
  kProv() {
    const { th, ini, pv } = this.c, LN = new Set(Riwayat.R.la_nina.map(String));
    const rows = pv.map(k => ({k, n: sumA(th.map(t => this.nil(k, t))), m: sumA(th.map(t => this.nil(k, t, "meninggal"))), d: sumA(th.map(t => this.nil(k, t, "terdampak"))), v: th.map(t => this.nil(k, t))})).filter(r => r.n);
    if (!rows.length) return "";
    const top = [...rows].sort((a, b) => b.n - a.n)[0];
    const kol = [{k: "no", h: "#", n: 1, s: (r, i) => `<span class="kl-no">${i + 1}</span>`},
      {k: "nama", h: "Provinsi", l: 1, v: r => namaProv(r.k), s: r => `<b>${esc(namaProv(r.k))}</b>`},
      {k: "n", h: "Kejadian", n: 1, v: r => r.n, s: r => fmt(r.n)}, {k: "m", h: "Meninggal", n: 1, v: r => r.m, s: r => fmt(r.m)}, {k: "d", h: "Terdampak", n: 1, v: r => r.d, s: r => rb(r.d)},
      {k: "pola", h: `Pola ${th[0]}–${ini}`, s: r => this.pola(r.v, k => k === th.length - 1 ? "#9aa8b8" : LN.has(th[k]) ? "#1d4e89" : "#5b8fc7")}];
    return this.kartu("Per provinsi", `${this.c.nmK} terbanyak di ${Kartu.hl(esc(namaProv(top.k)))}: ${Kartu.hl(fmt(top.n) + " kejadian")} ${th[0]}–${ini}`,
      this.tb("prov", kol, rows, 10, "provinsi", r => `data-pv="${r.k}"${this.PV.includes(r.k) ? ' style="background:var(--surface)"' : ""}`), "BNPB dan DIBI"); },

  /* rekomendasi posko permanen banjir. DISEMBUNYIKAN (A24, seperti Posko ajuan karhutla): tidak ada di urutan kartu render(); pulihkan dengan menambahkannya di sana */
  kPosko() {
    if (this.jenis !== "banjir") return "";
    const perm = (S.posko?.permanen || []).filter(x => !this.prov || this.PV.includes(x.prov)); if (!perm.length) return "";
    const kol = [{k: "id", h: "Kode", v: r => r.id, s: r => `<b>${r.id}</b>`}, {k: "kec", h: "Kecamatan", l: 1, v: r => r.kec, s: r => esc(r.kec)}, {k: "kab", h: "Kab/Kota", l: 1, v: r => r.kab, s: r => esc(r.kab)},
      {k: "prov", h: "Provinsi", l: 1, v: r => namaProv(r.prov), s: r => esc(namaProv(r.prov))}, {k: "kejadian", h: "Kejadian banjir kab", n: 1, v: r => r.kejadian, s: r => fmt(r.kejadian)},
      {k: "bahaya", h: "Bahaya InaRISK", n: 1, v: r => r.bahaya, s: r => fmt(r.bahaya)}, {k: "peta", h: "", s: r => `<button class="link" data-lp="${r.id}">Peta</button>`}];
    return this.kartu("Posko", `${Kartu.hl(fmt(perm.length) + " lokasi")} diusulkan untuk posko permanen banjir${this.prov ? " di " + esc(this.nmPv) : ""}`,
      this.tb("posko", kol, perm, 10, "lokasi", r => `data-pp="${r.id}"`), "BNPB, DIBI, InaRISK"); },

  hubung(box) { box.querySelectorAll("thead").forEach(th => { const kt = th.closest("[data-kt]")?.dataset.kt; if (kt) pengurutKepala(this.T[kt], th, () => this.ulang(kt)); }); },
  ulang(kt) { nanti(() => kt ? this.muat(kt) : this.render()); },
  muat(kt) { const b = $(`#tren [data-kt="${kt}"]`); if (!b) return; b.innerHTML = this["k" + kt[0].toUpperCase() + kt.slice(1)](); this.hubung(b); },
  reset() { Object.values(this.T).forEach(o => { if ("hal" in o) o.hal = 0; }); this.T.risiko.rprov = ""; },
  petaPosko(id) { const p = S.posko.permanen.find(q => q.id === id); bukaTab("peta"); S.jalur = [p.prov, p.kab];
    Peta.aturWilayah().then(() => { peta.flyTo({center: [p.lon, p.lat], zoom: 10}); new maplibregl.Popup({closeButton: false}).setLngLat([p.lon, p.lat]).setHTML(`<b>Posko permanen ${esc(p.id)}</b><br>Kec. ${esc(p.kec)}, ${esc(p.kab)}`).addTo(peta); }); },
  klik(tr, e) { const d = tr.dataset, lp = e.target.closest("[data-lp]");
    if (lp) return this.petaPosko(lp.dataset.lp);
    if (d.ri != null) return this.rinci(this.rows.risiko[+d.ri]);
    if (d.kl) return this.rinci(Riwayat.rec(d.kl, this.rj));
    if (d.pv) { this.prov = d.pv === this.prov ? "" : d.pv; this.reset(); nanti(() => { this.render(); $("#p-tren").scrollTo({top: 0, behavior: "smooth"}); }); return; }
    if (d.pp) this.posko(d.pp); },
  /* analisa satu wilayah: kondisi sekarang, hujan, sungai, rob, InaRISK, riwayat tahunan (La Niña ditandai), musim, rincian skor, tindakan */
  rinci(r, dariPeta = false) {
    const R = Riwayat.R, j = r.j, J = R.jenis[j], th = R.tahun, thC = J.tahun_cakup, n = thC.length, LN = new Set(R.la_nina.map(String)), o = R.musim[j]?.[r.prov], das = dasKini();
    const sama = Riwayat.semua(j, r.tingkat), rkNas = sama.filter(x => x.skor > r.skor).length + 1, sProv = sama.filter(x => x.prov === r.prov), rkProv = sProv.filter(x => x.skor > r.skor).length + 1;
    const b = j === "longsor" ? "l" : "b", pr = namaProv(r.prov), c0 = Riwayat.titik(r.kunci) || [0, 0], [lat, lon] = c0, cH = selDekat(lat, lon), rad = {prov: 400, kab: 60, kec: 30}[r.tingkat];
    const robT = (S.rob?.titik || []).map((t, i) => ({...t, i, d: km(lat, lon, t.lat, t.lon)})).filter(t => t.prov === pr && (r.tingkat === "prov" || t.kab === r.kab || t.d <= rad));
    const lvRob = h => { const i = S.rob ? S.rob.hari.indexOf(S.st.hari[h]) : -1; return i < 0 ? 0 : Math.max(0, ...robT.map(t => t.lv[i] || 0)); };
    const lvH = h => j === "rob" ? lvRob(h) : r.tingkat === "kec" ? (S.st.kec[r.kunci]?.[b]?.[h] || 0) : (agregat(b, h)[r.kunci]?.lv || 0);
    const lvMaks = Math.max(...S.st.hari.map((_, h) => lvH(h)));
    const sg = (S.sungai?.titik || []).map((t, i) => ({...t, i, d: km(lat, lon, t.lat, t.lon)})).filter(t => t.d <= (r.tingkat === "prov" ? 400 : r.tingkat === "kab" ? 80 : 30)).sort((x, y) => (y.kelas || 0) - (x.kelas || 0) || x.d - y.d).slice(0, 6);
    const iR = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
    const robD = robT.map(t => ({...t, pk: Math.max(0, ...t.lv.slice(iR)), hm: Math.max(...t.h.slice(iR).filter(v => v != null))})).sort((x, y) => y.pk - x.pk || x.d - y.d).slice(0, 6);
    /* InaRISK: kecamatan langsung; kab/prov = rata-rata dan maksimum kecamatannya */
    const kecs = r.tingkat === "kec" ? [r.kunci] : Object.keys(S.bahaya).filter(k => k.startsWith(r.kunci + "|"));
    const LAP = [["banjir", "Banjir"], ["bandang", "Banjir bandang"], ["longsor", "Tanah longsor"], ["kering", "Kekeringan"], ["gelombang", "Gelombang ekstrem & abrasi"]];
    const ina = LAP.map(([k, nm]) => { const v = kecs.map(x => S.bahaya[x]?.[k]).filter(x => x != null); return v.length ? {k, nm, rata: sumA(v) / v.length, maks: Math.max(...v), tinggi: v.filter(x => x >= .66).length, n: v.length} : null; }).filter(Boolean);
    const hUtama = ina.find(x => x.k === J.lapis);
    /* riwayat tahunan */
    const i0 = th.indexOf(thC[0]), thT = th.slice(i0), v = r.v.slice(i0), m = Math.max(...v, 1), cak = new Set(thC);
    const vc = thC.map(t => r.v[th.indexOf(t)]), rata = sumA(vc) / n, ln = thC.filter(t => LN.has(t)), bi = thC.filter(t => !LN.has(t));
    const rLN = ln.length ? sumA(ln.map(t => r.v[th.indexOf(t)])) / ln.length : null, rB = bi.length ? sumA(bi.map(t => r.v[th.indexOf(t)])) / bi.length : null;
    const amb = r.tingkat === "prov" ? J.ambang_prov || 1 : 1; let beruntun = 0; for (let i = vc.length - 1; i >= 0 && vc[i] >= amb; i--) beruntun++;
    const terakhir = thC[vc.map(x => x >= amb).lastIndexOf(true)] || "–";
    const W = 700, B = 140, gap = W / thT.length, bw = gap * .72;
    let grafik = `<line x1="0" x2="${W}" y1="${B - rata / m * 112}" y2="${B - rata / m * 112}" stroke="currentColor" stroke-dasharray="4 3" opacity=".5"/>`;
    v.forEach((x, k) => { const h = x / m * 112, t = thT[k], la = LN.has(t), ini = k === v.length - 1, ada = cak.has(t);
      grafik += `<rect x="${k * gap + (gap - bw) / 2}" y="${B - h}" width="${bw}" height="${Math.max(1, h)}" rx="3" fill="${ini ? "#9aa8b8" : la ? "#1d4e89" : "#5b8fc7"}" opacity="${ada || ini ? (la ? 1 : .8) : .3}" data-tip="<b>${t}</b>${la ? " · La Niña" : ""}${ini ? " · berjalan" : ada ? "" : " · data tidak lengkap"}<br>${fmt(x)} kejadian${r.tingkat === "kec" ? " di Kab. " + esc(r.kab) : ""}"/>
        ${x === m || ini ? `<text x="${k * gap + gap / 2}" y="${B - h - 5}" text-anchor="middle" font-size="10.5" font-weight="700">${fmt(x)}</text>` : ""}
        <text x="${k * gap + gap / 2}" y="${B + 14}" text-anchor="middle" font-size="10" opacity="${la ? 1 : .6}" font-weight="${la ? 800 : 400}" style="${la ? "fill:#3f7fb8" : ""}">${thT.length > 14 && k % 2 && !la ? "" : t.slice(2)}</text>`; });
    grafik += `<text x="${W}" y="${B - rata / m * 112 - 5}" text-anchor="end" font-size="10.5" opacity=".7">rata-rata ${fmt(Math.round(rata * 10) / 10)}</text>`;
    const musim = o ? `<svg viewBox="0 0 ${W} 44" width="100%" role="img" aria-label="Kalender musim">${o.p_semua.map((p, i) => `<rect x="${i * W / 36 + 1}" y="0" width="${W / 36 - 2}" height="22" rx="3" style="fill:${warnaMusim(p)}" ${i === das ? 'stroke="currentColor" stroke-width="2"' : ""} data-tip="<b>${DAS(i)}</b><br>peluang ${Math.round(p * 100)}% (La Niña ${Math.round(o.p_la_nina[i] * 100)}%, biasa ${Math.round(o.p_biasa[i] * 100)}%)<br>rata-rata ${fmt(o.rata[i])} kejadian se-provinsi"/>`).join("")}
      ${BLN.map((x, i) => `<text x="${(i * 3 + 1.5) * W / 36}" y="38" text-anchor="middle" font-size="10.5" opacity=".7">${x}</text>`).join("")}</svg>` : "";
    /* tindakan: status sekarang, musim, kelas, tren, bahaya, La Niña */
    const aksi = [], tambah = (tag, t) => aksi.push(`<li><span class="tg">${tag}</span>${t}</li>`);
    const AKSI_ROB = [[], ["Siapkan pompa dan karung pasir di tanggul rendah", "Informasikan jam pasang tertinggi ke warga pesisir"], ["Siagakan pompa dan tim di tanggul dan pintu air", "Pindahkan barang berharga dan ternak ke tempat tinggi"], ["Evakuasi kelompok rentan di permukiman pesisir terendah", "Tutup jalan pantai yang tergenang"]];
    if (lvMaks >= 1) (j === "rob" ? AKSI_ROB : AKSI[b])[lvMaks].forEach(a => tambah("Sekarang", esc(a)));
    if (o) { const p = o.p_semua; let mulai = -1; for (let k = 1; k <= 9; k++) if (p[(das + k) % 36] >= .3) { mulai = k; break; }
      if (p[das] >= .3) tambah("Musim", `Sekarang periode rawan ${NAMA_J[j]} di ${esc(pr)} (peluang ${Math.round(p[das] * 100)}%): posko siaga aktif, regu piket, logistik dasar di gudang terdekat.`);
      else if (mulai > 0) tambah("Musim", `Periode rawan mulai ${DAS((das + mulai) % 36)} (± ${mulai * 10} hari lagi): bersihkan saluran dan dirikan posko pra-musim paling lambat ${DAS((das + Math.max(1, mulai - 3)) % 36)}.`); }
    if (r.lv >= 2) tambah("Struktural", r.tingkat === "kec" ? `Kecamatan ini masuk kelas ${r.kelas.toLowerCase()} se-Indonesia: calon lokasi posko permanen dan gudang logistik pra-musim.` : `Wilayah ini masuk kelas ${r.kelas.toLowerCase()} se-Indonesia: anggarkan posko permanen dan latihan evakuasi tahunan sebelum musim.`);
    if (r.tren >= 1.5) tambah("Struktural", `Kejadian ${J.tahun_baru[0]}–${J.tahun_baru.at(-1)} naik ${fmt(r.tren)}× dibanding laju nasional: periksa perubahan tutupan lahan, drainase, dan permukiman baru di ${j === "longsor" ? "lereng" : "dataran banjir"}.`);
    if (hUtama && hUtama.maks >= .66) tambah("Struktural", j === "longsor" ? `${fmt(hUtama.tinggi)} kecamatan berbahaya longsor tinggi (InaRISK ≥ 0,66): petakan lereng retak, pasang peringatan dini longsor, batasi bangunan di kaki lereng.` : `${fmt(hUtama.tinggi)} kecamatan berbahaya banjir tinggi (InaRISK ≥ 0,66): tandai zona genangan dan jalur evakuasi, pastikan pompa dan pintu air terawat.`);
    if (j === "rob") tambah("Struktural", "Bagikan jadwal pasang tertinggi bulanan ke kelurahan pesisir; periksa tanggul dan penurunan tanah setiap tahun.");
    if (rLN != null && rB && rLN >= rB * 1.3) tambah("Iklim", `Tahun La Niña rata-rata ${fmt(Math.round(rLN / rB * 10) / 10)}× tahun biasa: saat BMKG atau NOAA mengumumkan La Niña, majukan kesiapsiagaan satu bulan.`);
    if (!aksi.length) AKSI[b === "l" ? "l" : "b"][0].forEach(a => tambah("Rutin", esc(a)));
    /* posko di wilayah ini */
    const pkP = (S.posko?.permanen || []).filter(x => x.prov === r.prov && (r.tingkat === "prov" || x.kab === r.kab) && (r.tingkat !== "kec" || x.kec === r.nama)).map(x => ({...x, jn: "posko permanen"}));
    const pkL = (S.posko?.lapangan || []).filter(x => x.prov === r.prov && (r.tingkat === "prov" || x.kab === r.kab) && (r.tingkat !== "kec" || (x.layan || []).includes(r.nama))).map(x => ({...x, jn: "posko lapangan (status hari ini)"}));
    const pk = [...pkP, ...pkL];
    const maks = r.tingkat === "prov" ? J.maks_prov : J.maks, Bb = J.bobot;
    const sub = {kec: "Kecamatan · " + esc(r.kab) + " · " + esc(pr), kab: "Kabupaten/kota · " + esc(pr), prov: "Provinsi"}[r.tingkat];
    const kepala = `${r.tingkat === "prov" ? lambang(r.prov) : lambang(r.prov, r.kab)}<div><h3 id="dlgJudul">${esc(r.nama)}</h3><p>${sub} · risiko ${NAMA_J[j]}</p></div>`;
    const isi = `<div class="grid g4">${kot("Skor risiko", r.skor, `<span class="pill l${r.lv}">${r.kelas}</span>`)}${kot("Peringkat", `${fmt(rkNas)}<span style="font-size:13px;opacity:.6"> / ${fmt(sama.length)}</span>`, `nasional · ke-${fmt(rkProv)} dari ${fmt(sProv.length)} di provinsi`)}
        ${kot("Tahun berkejadian", `${r.tahun}<span style="font-size:13px;opacity:.6"> / ${n}</span>`, `${beruntun ? beruntun + " tahun beruntun" : "terakhir " + terakhir}${r.tingkat === "kec" ? " · kab/kota" : ""}`)}${kot("Tren", (r.tren >= 1 ? "↑ " : "↓ ") + fmt(r.tren) + "×", "relatif laju nasional")}</div>
      ${lipat(`Saat ini · status ${NAMA_J[j]} 4 hari`, `<div class="grid g4" style="margin-top:6px">${S.st.hari.map((t, h) => kot(h ? tglPendek(t) : "Hari ini", `<span style="color:${WARNA_LV[lvH(h)]}">${LEVEL[lvH(h)]}</span>`, j === "rob" ? `${fmt(robT.length)} titik pantai` : r.tingkat === "kec" ? "kecamatan" : "kecamatan tertinggi")).join("")}</div>
        <div class="grid g4" style="margin-top:8px">${kot("Peluang periode ini", o ? Math.round(o.p_semua[das] * 100) + "%" : "–", o ? `${DAS(das)} · La Niña ${Math.round(o.p_la_nina[das] * 100)}%` : "kalender belum ada")}${kot("Posko di wilayah ini", fmt(pk.length), `${fmt(pkP.length)} permanen · ${fmt(pkL.length)} lapangan`)}
          ${kot("Sungai di atas Q2", fmt(sg.filter(t => t.kelas >= 1).length), `dari ${fmt(sg.length)} titik terdekat`)}${kot("Pantai berstatus", fmt(robD.filter(t => t.pk >= 1).length), `dari ${fmt(robD.length)} titik pantai`)}</div>`)}
      ${cH ? lipat("Hujan 10 hari · 3 hari teramati + 7 hari prakiraan", `${grafikHujan(cH)}<div class="grid g4">${kot("Puncak 3 hari", fmt(Math.round(cH.h3)) + " mm", kelasHujan(cH.h3 / 3) + " rata-rata")}${kot("Hujan 7 hari lalu", fmt(Math.round(cH.a7)) + " mm", cH.a7 >= 150 ? "tanah jenuh" : cH.a7 >= 70 ? "tanah basah" : "tanah relatif kering")}${kot("Hari hujan lebat", fmt(cH.h.filter((x, k) => k >= S.hujan.hari.indexOf(S.hujan.hari_ini) && x >= 50).length), "≥ 50 mm, 7 hari")}${kot("Hembusan maks", fmt(Math.round(Math.max(...(cH.g || [0])))) + " km/jam", "7 hari")}</div>
        <p class="fnd">Sel 0,25° di titik wakil ${r.tingkat === "kec" ? "kecamatan" : "wilayah"} (${cH.lat.toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2})}, ${cH.lon.toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2})}). Garis putus = 50 dan 100 mm (BMKG).</p>`, false) : ""}
      ${sg.length ? lipat("Sungai terdekat (GloFAS)", `<table class="tb3"><thead><tr><th>Titik sungai</th><th class="n">Puncak 7 hari</th><th class="n">Q2</th><th class="n">Jarak</th><th class="n">Status</th></tr></thead><tbody>${sg.map(t => `<tr data-sg="${t.i}" style="cursor:pointer"><td><b>${esc(t.kec)}</b><small>${esc(t.kab)}</small></td><td class="n num">${fmt(Math.round(t.puncak))} m³/s</td><td class="n num">${t.q2 ? fmt(Math.round(t.q2)) : "–"}</td><td class="n num">${fmt(Math.round(t.d))} km</td><td class="n">${pill(t.kelas)}</td></tr>`).join("")}</tbody></table><p class="fnd">Klik baris untuk hidrograf.</p>`, false) : ""}
      ${robD.length ? lipat("Titik pantai terdekat (rob)", `<table class="tb3"><thead><tr><th>Pantai</th><th class="n">Muka laut maks 10 hari</th><th class="n">Ambang p99</th><th class="n">Jarak</th><th class="n">Status</th></tr></thead><tbody>${robD.map(t => `<tr data-rob="${t.i}" style="cursor:pointer"><td><b>${esc(t.kec || t.kab)}</b><small>${esc(t.kab)}</small></td><td class="n num">${fmt(Math.round(t.hm * 100) / 100)} m</td><td class="n num">${fmt(Math.round(t.p99 * 100) / 100)} m</td><td class="n num">${fmt(Math.round(t.d))} km</td><td class="n">${t.pk ? pill(t.pk) : "–"}</td></tr>`).join("")}</tbody></table><p class="fnd">Klik baris untuk grafik pasang.</p>`, j === "rob") : ""}
      ${ina.length ? lipat("Indeks bahaya InaRISK (0–1)", `<table class="tb2"><tbody>${ina.map(x => `<tr${x.k === J.lapis ? ' style="font-weight:700"' : ""}><td>${x.nm}</td><td class="n">${r.tingkat === "kec" ? `${fmt(Math.round(x.rata * 100) / 100)} · ${x.rata >= .66 ? "tinggi" : x.rata >= .33 ? "sedang" : "rendah"}` : `rata-rata ${fmt(Math.round(x.rata * 100) / 100)} · maks ${fmt(Math.round(x.maks * 100) / 100)} · ${fmt(x.tinggi)} dari ${fmt(x.n)} kec. tinggi`}</td></tr>`).join("")}</tbody></table><p class="fnd">Sampel raster InaRISK BNPB di kecamatan${r.tingkat === "kec" ? " ini" : "-kecamatan wilayah ini"}.${j === "rob" ? " Lapisan gelombang tidak dipakai di skor rob (hampir selalu 0 di titik tengah kecamatan pantai)." : ""}</p>`, false) : ""}
      ${lipat(`Kejadian ${NAMA_J[j]} per tahun ${thT[0]}–${thT.at(-1)}${r.tingkat === "kec" ? " · Kab. " + esc(r.kab) : ""} <span style="text-transform:none;letter-spacing:0;font-weight:500">· biru tua = tahun La Niña</span>`, `<svg viewBox="0 -14 ${W} ${B + 30}" width="100%" role="img" aria-label="Kejadian per tahun">${grafik}</svg>
        <p class="fnd">${rLN != null && rB != null ? `Tahun La Niña rata-rata ${fmt(Math.round(rLN * 10) / 10)} kejadian, tahun biasa ${fmt(Math.round(rB * 10) / 10)}${rB ? ` (${fmt(Math.round(rLN / rB * 10) / 10)}×)` : ""}. ` : ""}Puncak ${r.puncak || "–"}. ${th.at(-1)} masih berjalan.${r.tingkat === "kec" ? " BNPB/DIBI mencatat kejadian per kab/kota, jadi grafik ini milik kab/kotanya." : ""}${j === "rob" ? ` Rob baru tercatat rutin sejak ${thC[0]}; tahun pudar tidak lengkap.` : ""}</p>`)}
      ${o ? lipat(`Musim rawan ${esc(pr)} · per 10 hari, kotak bergaris = sekarang`, `${musim}<p class="fnd">Siaga (peluang ≥ 30%): tahun La Niña <b>${this.siaga(o.p_la_nina)}</b>, tahun biasa <b>${this.siaga(o.p_biasa)}</b>; puncak ${DAS(o.puncak)}. Periode rawan = ≥ ${fmt(o.ambang)} kejadian se-provinsi dalam 10 hari.</p>`) : ""}
      ${lipat("Rincian skor", `<table class="skor"><tbody>
        <tr><td>Kekerapan</td><td>${r.tahun} dari ${n} tahun dengan ≥ ${amb} kejadian (${thC[0]}–${thC.at(-1)})</td><td class="n num">${F2(r.fK)} × ${Bb.kekerapan}</td><td class="n num"><b>${fmt(Math.round(r.fK * Bb.kekerapan))}</b></td></tr>
        <tr><td>Besaran</td><td>log(1 + ${fmt(r.total)}) ÷ log(1 + ${fmt(maks)})</td><td class="n num">${F2(r.fB)} × ${Bb.besaran}</td><td class="n num"><b>${fmt(Math.round(r.fB * Bb.besaran))}</b></td></tr>
        <tr><td>Tren</td><td>rasio ${fmt(r.tren)}× relatif nasional → ${r.tren >= 2 ? "batas atas (≥ 2×)" : r.tren <= .5 ? "batas bawah (≤ ½×)" : "skala log antara ½× dan 2×"}</td><td class="n num">${F2(r.fT)} × ${Bb.tren}</td><td class="n num"><b>${fmt(Math.round(r.fT * Bb.tren))}</b></td></tr>
        ${Bb.inarisk ? `<tr><td>InaRISK</td><td>rata-rata bahaya ${J.lapis} kecamatan ${r.tingkat === "kec" ? "di kab/kota" : ""} = ${F2(r.h)}</td><td class="n num">${F2(r.h)} × ${Bb.inarisk}</td><td class="n num"><b>${fmt(Math.round(r.h * Bb.inarisk))}</b></td></tr>` : ""}
        <tr><td colspan="3"><b>Skor ${r.tingkat === "kec" ? "kab/kota" : ""}</b></td><td class="n num"><b>${r.tingkat === "kec" ? r.skorKab : r.skor}</b></td></tr>
        ${r.tingkat === "kec" ? `<tr><td>Kecamatan</td><td>${r.skorKab} × (0,4 + 0,6 × bahaya ${J.lapis} ${fmt(Math.round(r.hKec * 100) / 100)})</td><td></td><td class="n num"><b>${r.skor}</b></td></tr>` : ""}
        </tbody></table><p class="fnd">Kelas dari urutan se-Indonesia: 10% teratas sangat tinggi, 10–30% tinggi, 30–60% sedang, sisanya rendah. Skor sama selalu kelas sama.</p>`, false)}
      ${lipat("Tindakan yang disarankan", `<ul class="aksi">${aksi.join("")}</ul><p class="fnd">Dihitung dari status 4 hari, kalender musim, kelas risiko, tren, bahaya InaRISK, dan pola La Niña wilayah ini. Ikuti arahan BPBD setempat.</p>`)}
      ${pk.length ? lipat("Posko di wilayah ini", `<div class="dlist">${pk.slice(0, 6).map(x => `<button data-pk="${x.lat},${x.lon}"><b>${x.id}</b> ${esc(x.kec)} <span>${x.jn}</span></button>`).join("")}</div>`, false) : ""}
      <p class="fnd">Sumber: BNPB data.bnpb.go.id dan DIBI (dibi.bnpb.go.id) ${thT[0]}–${thT.at(-1)}, InaRISK BNPB, Open-Meteo, GloFAS. Status dari pembaruan ${jamWIB(S.meta.dibuat)}.</p>
      ${dariPeta && r.tingkat !== "kec" && !(j === "rob" && r.tingkat === "kab") ? `<button class="btn" data-masuk style="justify-self:start">Lihat ${r.tingkat === "prov" ? "kabupaten/kota" : "kecamatan"} di dalamnya</button>` : ""}`;
    bukaDlg(kepala, isi, (e, d) => {
      const s = e.target.closest("[data-sg]"); if (s) return Analisa.sungai(+s.dataset.sg);
      const rb_ = e.target.closest("[data-rob]"); if (rb_) return Rob.titik(+rb_.dataset.rob);
      const p = e.target.closest("[data-pk]"); if (p) { const [la, lo] = p.dataset.pk.split(",").map(Number); d.close(); bukaTab("peta"); return nanti(() => peta.flyTo({center: [lo, la], zoom: 10})); }
      if (e.target.closest("[data-masuk]")) { d.close(); turun(r.kunci); } }); },
  /* popup posko permanen: alasan lokasi, riwayat kab, kapan didirikan */
  posko(id) {
    const x = (S.posko?.permanen || []).find(p => p.id === id); if (!x) return;
    const rk = Riwayat.rec(x.prov + "|" + x.kab, "banjir"), o = Riwayat.R.musim.banjir?.[x.prov], urut = (S.posko.permanen || []).indexOf(x) + 1, lv = Math.max(...S.st.hari.map((_, h) => S.st.kec[`${x.prov}|${x.kab}|${x.kec}`]?.b?.[h] || 0));
    const mulai = o ? this.siagaIdx(o.p_semua)?.[0] ?? null : null;
    const isi = `<div class="grid g4">${kot("Skor risiko kab/kota", rk ? rk.skor : "–", rk ? `<span class="pill l${rk.lv}">${rk.kelas}</span>` : "")}${kot("Kejadian banjir", fmt(x.kejadian), `Kab. ${esc(x.kab)}, semua tahun`)}${kot("Bahaya banjir", fmt(x.bahaya), "InaRISK kecamatan ini")}${kot("Status 4 hari", `<span style="color:${WARNA_LV[lv]}">${LEVEL[lv]}</span>`, "banjir, tertinggi")}</div>
      <table class="tb2" style="margin-top:6px"><tbody><tr><td>Lokasi</td><td class="n">Kec. ${esc(x.kec)}, ${esc(x.kab)}, ${esc(namaProv(x.prov))}</td></tr><tr><td>Koordinat</td><td class="n">${x.lat.toLocaleString("id-ID", {minimumFractionDigits: 4, maximumFractionDigits: 4})}, ${x.lon.toLocaleString("id-ID", {minimumFractionDigits: 4, maximumFractionDigits: 4})}</td></tr>
        <tr><td>Alasan dipilih</td><td class="n">kab/kota ke-${urut} paling sering banjir; kecamatan dengan bahaya banjir InaRISK tertinggi di kab/kota itu</td></tr>
        ${o ? `<tr><td>Periode rawan provinsi</td><td class="n">${this.siaga(o.p_semua)} · puncak ${DAS(o.puncak)}</td></tr><tr><td>Dirikan paling lambat</td><td class="n">${mulai != null ? DAS((mulai + 33) % 36) + " (sebulan sebelum periode rawan)" : "sebulan sebelum puncak"}</td></tr>` : ""}</tbody></table>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-ak="1">Analisa Kab. ${esc(x.kab)}</button><button class="btn sec" data-pt="1">Lihat di peta</button></div>`;
    bukaDlg(`${lambang(x.prov, x.kab)}<div><h3 id="dlgJudul">Posko permanen ${esc(x.id)}</h3><p>Kec. ${esc(x.kec)} · ${esc(x.kab)}</p></div>`, isi, (e, d) => {
      if (e.target.closest("[data-ak]") && rk) return this.rinci(rk);
      if (e.target.closest("[data-pt]")) { d.close(); bukaTab("peta"); S.jalur = [x.prov, x.kab];
        Peta.aturWilayah().then(() => { peta.flyTo({center: [x.lon, x.lat], zoom: 10}); new maplibregl.Popup({closeButton: false}).setLngLat([x.lon, x.lat]).setHTML(`<b>Posko permanen ${esc(x.id)}</b><br>Kec. ${esc(x.kec)}, ${esc(x.kab)}`).addTo(peta); }); } }); },

  async render() {
    const el = $("#tren");
    if (!Riwayat.R) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat riwayat kejadian…</div>`;
      try { await Riwayat.muat(); } catch (e) { el.innerHTML = `<div class="kosong">Data riwayat belum tersedia.</div>`; return; } }
    const K = S.kejadian; if (!K) { el.innerHTML = `<div class="kosong">Data kejadian BNPB belum tersedia.</div>`; return; }
    if (this.seri === undefined) this.seri = await muatJSON("data/seri_status.json").catch(() => null);
    const JENIS = [["banjir", "Banjir"], ["longsor", "Tanah longsor"], ["rob", "Rob"], ["bandang", "Banjir bandang"], ["cuaca", "Cuaca ekstrem"], ["kering", "Kekeringan"], ["gelombang", "Gelombang & abrasi"], ["semua", "Semua bencana"]].filter(([j]) => Object.values(K.prov || {}).some(p => p[j]));
    if (!JENIS.some(x => x[0] === this.jenis)) this.jenis = JENIS[0]?.[0] || "banjir";
    const th = K.tahun.map(String), ini = th.at(-1), j = this.jenis, rj = this.rj, nmJ = this.jn((JENIS.find(x => x[0] === j) || ["", j])[1].toLowerCase());
    const pv = Object.keys(K.prov || {}).sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    const nmK = this.jn((JENIS.find(x => x[0] === j) || ["", j])[1]);
    this.c = {K, th, ini, pv, nmJ, nmK};
    const wil = this.prov ? this.PV : pv, nmP = this.prov ? esc(this.nmPv) : "Indonesia", LN = new Set(Riwayat.R.la_nina.map(String));
    const tot = th.map(t => sumA(wil.map(k => this.nil(k, t)))), totM = th.map(t => sumA(wil.map(k => this.nil(k, t, "meninggal")))), mx = Math.max(1, ...tot);
    const lalu = th.slice(0, -1), rata = sumA(tot.slice(0, -1)) / Math.max(1, lalu.length), rank = [...tot].sort((a, b) => b - a).indexOf(tot.at(-1)) + 1;
    const hl = Kartu.hl, pil = Kartu.pil.bind(Kartu), kontrolProv = `<select data-set="prov" multiple aria-label="Provinsi"><option value="" ${this.prov ? "" : "selected"}>Indonesia</option>${pv.map(k => `<option value="${k}" ${this.PV.includes(k) ? "selected" : ""}>${esc(namaProv(k))}</option>`).join("")}</select>`;
    const W = 940, L = 46, kartuA = (() => {
      /* per tahun: semua batang berlabel, dua garis rata-rata berpil di luar area batang */
      const H = 300, RM = 130, B = 262, T = 30, gp = (W - L - RM) / th.length, bw = gp * .68, Yt = v => B - v / mx * (B - T), buruk = th[tot.indexOf(mx)];
      let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - RM + 4}" y1="${Yt(mx * f)}" y2="${Yt(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Yt(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mx * f)}</text>`).join("");
      tot.forEach((v, i) => { const x = L + i * gp + (gp - bw) / 2, la = LN.has(th[i]), ak = i === tot.length - 1, w = ak ? "#9aa8b8" : la ? "#1d4e89" : "#5b8fc7", kali = rata ? Math.round(v / rata * 10) / 10 : 0;
        g += `<rect class="gy" style="--i:${i}" x="${x}" y="${Yt(v)}" width="${bw}" height="${Math.max(0, B - Yt(v))}" rx="4" fill="${w}" opacity="${ak ? 1 : .9}" data-tip="<b>${th[i]}</b>${la ? " · La Niña" : ak ? " · berjalan" : ""}<br>Kejadian: ${fmt(v)}<br>Meninggal: ${fmt(totM[i])}<br>Dibanding rata-rata: ${kali >= 1 ? "▲" : "▼"} ${fmt(kali)}×"/>
          <text class="gf" style="--i:${i}" x="${x + bw / 2}" y="${Yt(v) - 5}" text-anchor="middle" font-size="10" font-weight="800" opacity=".85">${this.ang(v)}</text>
          <text x="${x + bw / 2}" y="${B + 16}" text-anchor="middle" font-size="11" opacity=".7">${th[i].slice(2)}</text>`; });
      /* rata-rata tahun La Niña dan tahun biasa (tahun lengkap); label digeser bila berdekatan */
      const rataF = f => { const v = lalu.map((t, i) => [t, tot[i]]).filter(([t]) => LN.has(t) === f).map(x => x[1]); return v.length ? sumA(v) / v.length : null; }, rL = rataF(true), rB = rataF(false);
      const gs = [[rL, `La Niña ${this.ang(rL ?? 0)}`, "#1d4e89"], [rB, `biasa ${this.ang(rB ?? 0)}`, "#5b8fc7"]].filter(x => x[0] != null);
      if (gs.length === 2) { const yA = Yt(gs[0][0]), yB = Yt(gs[1][0]), sel = Math.abs(yA - yB) < 24 ? (24 - Math.abs(yA - yB)) / 2 : 0, atasA = yA <= yB; gs[0].push(atasA ? -sel : sel); gs[1].push(atasA ? sel : -sel); } else gs.forEach(x => x.push(0));
      gs.forEach(([v, t, w, dy]) => { const y = Yt(v); g += `<line x1="${L}" x2="${W - RM + 4}" y1="${y}" y2="${y}" stroke="${w}" stroke-width="1.5" stroke-dasharray="5 4" opacity=".8"/>${pil(W - RM + 8, y + dy - 10, t, w, "#fff", 11)[0]}`; });
      return this.kartu("Per tahun", `${nmP}: ${nmJ} ${hl(fmt(tot.at(-1)) + " kejadian")} pada ${ini}; peringkat ${hl(rank)} dari ${th.length} tahun; terburuk ${buruk} (${fmt(mx)} kejadian)`,
        `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kejadian per tahun">${g}</svg>`, "BNPB (data.bnpb.go.id) dan DIBI", kontrolProv, [["#1d4e89", "tahun La Niña"], ["#5b8fc7", "tahun biasa"], ["#9aa8b8", ini + " (berjalan)"]]); })();

    /* per bulan: rata-rata DIBI vs tahun berjalan (hanya banjir, longsor, rob) */
    const M = rj && Riwayat.R.musim[rj], mp = M ? (this.prov ? this.PV : Object.keys(M)).filter(k => M[k]) : [];
    const kartuB = (() => { if (!mp.length) return "";
      const rg = Riwayat.R.musim[rj + "_tahun"], iklim = BLN.map((_, b) => sumA(mp.map(k => sumA(M[k].rata.slice(b * 3, b * 3 + 3))))), kini = BLN.map(() => 0);
      for (const x of K.kejadian_dibi || []) if (x.tanggal.startsWith(ini) && x.jenis.split("_").includes(rj) && (!this.prov || this.PV.includes(x.prov))) kini[+x.tanggal.slice(5, 7) - 1]++;
      const das = dasKini(), bln = Math.floor(das / 3), sdIni = sumA(kini.slice(0, bln + 1)), sdRata = sumA(mp.map(k => sumA(M[k].rata.slice(0, das + 1)))), beda = sdRata ? Math.round((sdIni / sdRata - 1) * 100) : null;
      const mi = Math.max(1, ...iklim, ...kini), pBln = iklim.indexOf(Math.max(...iklim)), H = 300, B = 260, T = 52, gp = (W - L - 20) / 12, bw = gp * .3, Y = v => B - v / mi * (B - T);
      let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - 20}" y1="${Y(mi * f)}" y2="${Y(mi * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mi * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mi * f)}</text>`).join("");
      BLN.forEach((bn, m) => { const x0 = L + m * gp, c = x0 + gp / 2, lewat = m <= bln, tip = `<b>${bn}</b><br>Rata-rata: ${fmt(Math.round(iklim[m]))}<br>${ini}: ${lewat ? fmt(kini[m]) : "belum"}`;
        if (m === pBln) g += `<rect x="${x0 + 2}" y="${T - 24}" width="${gp - 4}" height="${B - T + 24}" rx="8" fill="#1d4e89" opacity=".06"/>`;
        [[iklim[m], "#5b8fc7", c - bw - 2, 1], [kini[m], "#1d4e89", c + 2, lewat]].forEach(([v, w, x, ada]) => { if (!ada) return;
          g += `<rect class="gy" style="--i:${m}" x="${x}" y="${Y(v)}" width="${bw}" height="${Math.max(0, B - Y(v))}" rx="3" fill="${w}" data-tip="${tip}"/><text x="${x + bw / 2}" y="${Y(v) - 4}" text-anchor="middle" font-size="9.5" font-weight="800" style="fill:${w}">${this.ang(v)}</text>`; });
        g += `<text x="${c}" y="${B + 17}" text-anchor="middle" font-size="11.5" font-weight="${m === pBln ? 800 : 500}" opacity="${m === pBln ? 1 : .7}">${bn}</text>`; });
      g += pil(L + pBln * gp + gp / 2 - 24, 4, "puncak", "#1d4e89", "#fff", 10.5)[0];
      return this.kartu("Per bulan", `Sampai bulan ini, ${nmJ}: ${beda == null ? "–" : hl((beda >= 0 ? "+" : "") + fmt(beda) + "%")} dibanding rata-rata periode sama; puncak biasanya ${hl(BLN[pBln])}`,
        `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pola bulanan">${g}</svg>`, `DIBI BNPB ${rg[0]}–${rg[1]}`, "", [["#5b8fc7", `rata-rata ${rg[0]}–${rg[1]}`], ["#1d4e89", String(ini)]]); })();

    /* status harian aktual dari seri_status.json (bergulir); tanpa berkas itu kartunya tidak tampil */
    const sr = this.seri, bj = j === "banjir" ? 0 : j === "longsor" ? 3 : null;
    const kartuC = (() => { if (!sr || bj == null || (sr.hari || []).length < 2) return "";
      const hr = sr.hari.slice(-30), ambil = d => { const vs = (this.prov ? this.PV.map(k => sr.prov?.[k]?.[d]) : [sr.nas?.[d]]).filter(Boolean); return vs.length ? [0, 1, 2].map(i => vs.reduce((a, v) => a + (v[bj + i] || 0), 0)) : null; }, data = hr.map(ambil), last = data.at(-1), prev = data.at(-2);
      if (!last) return "";
      const H = 300, B = 250, T = 30, jum = a => a ? sumA(a) : 0, m = Math.max(1, ...data.map(jum)), gp = (W - L - 10) / hr.length, bw = gp * .68, Y = v => B - v / m * (B - T), WR = [WARNA_LV[1], WARNA_LV[2], WARNA_LV[3]];
      let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - 8}" y1="${Y(m * f)}" y2="${Y(m * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(m * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(m * f)}</text>`).join("");
      hr.forEach((d, i) => { const x = L + i * gp + (gp - bw) / 2, v = data[i], tgl = +d.slice(8), awal = i === 0 || tgl === 1; let y = B;
        if (v) { [2, 1, 0].forEach(l => { const h = v[l] / m * (B - T); y -= h; g += `<rect class="gy" style="--i:${i}" x="${x}" y="${y}" width="${bw}" height="${h}" fill="${WR[l]}" data-tip="<b>${tglPendek(d)}</b><br>Awas: ${fmt(v[2])}<br>Siaga: ${fmt(v[1])}<br>Waspada: ${fmt(v[0])}"/>`; });
          g += `<text class="gf" style="--i:${i}" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="800" opacity=".85">${this.ang(jum(v))}</text>`; }
        g += `<text x="${x + bw / 2}" y="${B + 16}" text-anchor="middle" font-size="10.5" opacity=".7">${tgl}</text>${awal ? `<text x="${x + bw / 2}" y="${B + 30}" text-anchor="middle" font-size="10.5" font-weight="700" opacity=".7">${BLN[+d.slice(5, 7) - 1]}</text>` : ""}`; });
      const sa = last[1] + last[2], sel = prev ? sa - (prev[1] + prev[2]) : null, kapan = hr.at(-1) === S.hujan.hari_ini ? "hari ini" : tglPendek(hr.at(-1));
      const ban = sel == null ? "" : sel ? `, ${hl((sel > 0 ? "▲ " : "▼ ") + fmt(Math.abs(sel)))} dari kemarin` : ", sama dengan kemarin";
      return this.kartu("Status harian", sa ? `${nmK}: ${hl(fmt(sa) + " kecamatan")} siaga atau awas ${kapan}${ban}` : `${nmK}: belum ada kecamatan siaga atau awas ${kapan}; ${hl(fmt(last[0]) + " kecamatan")} waspada`,
        `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Status harian">${g}</svg>`, "Open-Meteo, GloFAS, InaRISK", "", [[WR[2], "Awas"], [WR[1], "Siaga"], [WR[0], "Waspada"]]); })();

    const tk = (isi, kt = "") => isi ? `<div class="tk"${kt ? ` data-kt="${kt}"` : ""}>${isi}</div>` : "";
    el.innerHTML = `<div class="tren-sumber">${Kartu.seg("jenis", JENIS, this)}</div>` + tk(kartuA) + tk(kartuB) + tk(kartuC) + tk(rj && this.kPeriode(), "periode") + tk(this.kMusim()) + tk(this.kRisiko(), "risiko") + tk(this.kLangganan(), "langganan") + tk(this.kProv(), "prov");
    this.hubung(el);
    el.onclick = e => {
      const s = e.target.closest("button[data-set]"); if (s) { const kt = s.closest("[data-kt]")?.dataset.kt, o = kt ? this.T[kt] : this; o[s.dataset.set] = s.dataset.v;
        if ("hal" in o) { o.hal = 0; if (s.dataset.set === "urut") o.turun = true; } if (!kt) this.reset(); return this.ulang(kt); }
      const h = e.target.closest("[data-h]"); if (h) { if (!h.disabled) { const kt = h.closest("[data-kt]").dataset.kt; this.T[kt].hal = +h.dataset.h; this.ulang(kt); } return; }
      const mp = e.target.closest("[data-mp]"); if (mp) { this.prov = mp.dataset.mp === this.prov ? "" : mp.dataset.mp; this.reset(); return this.ulang(); }
      const tr = e.target.closest("tr.klik"); if (tr) this.klik(tr, e); };
    el.onkeydown = e => { if (e.key === "Enter" && e.target.matches("tr.klik")) this.klik(e.target, e); };
    el.onchange = e => {
      const m = e.target.closest("input[data-multi]");
      if (m) { const box = m.closest(".pm-menu"), kt = m.closest("[data-kt]").dataset.kt, o = this.T[kt];
        if (!m.value) box.querySelectorAll("input:not([value=''])").forEach(x => x.checked = false); else box.querySelector("input[value='']").checked = false;
        o[m.dataset.multi] = [...box.querySelectorAll("input:checked")].map(x => x.value).filter(Boolean).join(","); Kartu._bukaMulti = m.dataset.multi; o.hal = 0; return this.ulang(kt); }
      const s = e.target.closest("select[data-set]"); if (s) { this[s.dataset.set] = s.multiple ? PilihCantik.nilai(s).join(",") : s.value; this.reset(); this.ulang(); } };
  },
};
