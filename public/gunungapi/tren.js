"use strict";
/* Tab Tren gunung api: tiap blok = Kartu.ex (inti/kartu.js), sama dengan Tren karhutla/kekeringan. Kartu tanpa data dibuang (A18):
   riwayat harian (jumlah gunung per level, erupsi 24 jam) baru muncul setelah >= 2 hari terkumpul oleh scripts/gunungapi/magma.py; kejadian per tahun dari BNPB (../banjir/data/dampak_gunungapi.json). */
const M_AKHIR = (a = 190) => innerWidth < 640 ? Math.min(a, 130) + 60 : a;   /* ruang kanan batang untuk deretan pil */
const Tren = {
  D: undefined,
  kartu(ey, judul, isi, sumber, leg) { Kartu.leg(leg); return Kartu.ex(judul, "", "", isi, "Sumber: " + sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
  /* batang berangka: v = [{n, t, tip}], bila n2 ada = batang kedua lebih sempit di depan */
  batang(v, {W = 940, H = 280, warna = "#e58a45", warna2 = "#c9503a", w2 = false, puncak = true} = {}) {
    const M = innerWidth < 640, Wd = M ? 700 : W, L = 34, B = H - 26, T = 22, gap = (Wd - L - 10) / v.length, bw = gap * .7, mx = Math.max(1, ...v.map(x => x.n || 0)), Y = x => B - x / mx * (B - T), pk = v.reduce((a, x, i) => x.n > v[a].n ? i : a, 0);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${Wd - 4}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += v.map((x, i) => { const px = L + i * gap + (gap - bw) / 2, ini = i === v.length - 1;
      if (x.kosong) return `<g data-tip="${x.tip}"><rect x="${px}" y="${T}" width="${bw}" height="${B - T}" fill="transparent"/><text x="${px + bw / 2}" y="${B - 6}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" opacity=".45" pointer-events="none">–</text>
        <text x="${px + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" opacity=".7" pointer-events="none">${x.t}</text></g>`;
      const lbl = fmt(x.n), pw = lbl.length * 11 * .6 + 16;
      return `<rect class="gy" style="--i:${i}" x="${px}" y="${Y(x.n)}" width="${bw}" height="${Math.max(1, B - Y(x.n))}" rx="3" fill="${warna}" opacity="${ini ? 1 : .8}" data-tip="${x.tip}"/>
        ${w2 && x.n2 ? `<rect class="gy" style="--i:${i}" x="${px + bw * .2}" y="${Y(x.n2)}" width="${bw * .6}" height="${Math.max(1, B - Y(x.n2))}" rx="2" fill="${warna2}" data-tip="${x.tip}"/>` : ""}
        ${puncak && i === pk ? `<g class="gf" style="--i:${i}">${Kartu.pil(px + bw / 2 - pw / 2, Y(x.n) - 26, lbl, "#c9503a", "#fff", 11)[0]}</g>` : `<text class="gf" style="--i:${i}" x="${px + bw / 2}" y="${Y(x.n) - 5}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" font-weight="800" opacity=".85" pointer-events="none">${fmt(x.n)}</text>`}
        <text x="${px + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" opacity=".7" pointer-events="none">${x.t}</text>`; }).join("");
    return `<div class="tw sk"><svg viewBox="0 0 ${Wd} ${H}" style="min-width:${M ? 700 : 0}px" role="img" aria-label="Tren">${g}</svg></div>`; },
  tgl: t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"}),

  /* 1. kejadian erupsi per tahun (BNPB) */
  kTahun() {
    const T = this.D?.tahunan, th = Object.keys(T || {}).sort().filter(t => T[t].kejadian != null); if (th.length < 3) return "";
    const v = th.map(t => ({n: T[t].kejadian, t: t.slice(2), tip: `<b>${t}</b><br>Kejadian erupsi gunung api: ${fmt(T[t].kejadian)}`})), pk = th.reduce((a, t) => T[t].kejadian > T[a].kejadian ? t : a, th[0]), akhir = th.at(-1);
    return this.kartu("Per tahun", `${Kartu.hl(fmt(T[akhir].kejadian) + " kejadian")} erupsi gunung api tercatat BNPB pada ${akhir}; tertinggi ${Kartu.hl(pk)} dengan ${fmt(T[pk].kejadian)} kejadian`,
      this.batang(v, {warna: "#e58a45"}), "BNPB, Data Bencana Indonesia 2010–" + akhir, [["#e58a45", "kejadian erupsi gunung api"], ["#c9503a", "tertinggi"]]); },

  /* hari yang tak punya baris riwayat di antara hari pertama dan terakhir (pekerjaan harian terbunuh): tetap digambar sebagai "–" tidak tercatat, TIDAK diinterpolasi atau dipadatkan */
  denganBolong(r) {
    const out = []; r.forEach((x, i) => { if (i) for (let t = Date.parse(r[i - 1].tgl + "T12:00:00Z") + 864e5; t < Date.parse(x.tgl + "T12:00:00Z"); t += 864e5) { const tg = new Date(t).toISOString().slice(0, 10);
      out.push({kosong: 1, tgl: tg, t: this.tgl(tg), tip: `<b>${this.tgl(tg)}</b><br>Tidak tercatat`}); } out.push(x); }); return out; },

  /* 2. gunung berstatus Waspada ke atas per hari (riwayat harian magma.py) */
  kLevel() {
    const r0 = S.st?.riwayat || []; if (r0.length < 2) return "";
    const r = this.denganBolong(r0), bolong = r.filter(x => x.kosong).map(x => x.t);
    const v = r.map(x => { if (x.kosong) return x; const n = x.level; return {n: (n[2] || 0) + (n[3] || 0) + (n[4] || 0), n2: (n[3] || 0) + (n[4] || 0), t: this.tgl(x.tgl),
      tip: `<b>${this.tgl(x.tgl)}</b><br>Waspada ke atas: ${fmt((n[2] || 0) + (n[3] || 0) + (n[4] || 0))} gunung<br>Siaga atau Awas: ${fmt((n[3] || 0) + (n[4] || 0))} gunung`}; }), a = v.at(-1), b = v[0];
    return this.kartu("Status harian", `${Kartu.hl(fmt(a.n) + " gunung")} berstatus Waspada ke atas pada ${a.t}, ${a.n > b.n ? "naik" : a.n < b.n ? "turun" : "sama"} ${a.n === b.n ? "dengan" : "dari"} ${fmt(b.n)} gunung pada ${b.t}`,
      this.batang(v, {warna: WARNA_LV[2], warna2: WARNA_LV[3], w2: true, puncak: false}), "MAGMA Indonesia, PVMBG; dicatat Pantau Bencana tiap pembaruan" + (bolong.length ? `. Tidak tercatat: ${bolong.join(" dan ")} (pekerjaan harian terhenti; arsip MAGMA hari itu tidak lengkap)` : ""), [[WARNA_LV[2], "Waspada ke atas"], [WARNA_LV[3], "Siaga atau Awas"]]); },

  /* 3. erupsi 24 jam per hari (hanya hari dengan daftar MAGMA yang mencapai 24 jam) */
  kErupsi() {
    const r = (S.st?.riwayat || []).filter(x => x.erupsi != null); if (r.length < 2) return "";
    const v = r.map(x => ({n: x.erupsi, t: this.tgl(x.tgl), tip: `<b>${this.tgl(x.tgl)}</b><br>Erupsi 24 jam: ${fmt(x.erupsi)}`})), pk = v.reduce((a, x, i) => x.n > v[a].n ? i : a, 0);
    return this.kartu("Erupsi harian", `${Kartu.hl(fmt(v.at(-1).n) + " erupsi")} dalam 24 jam terakhir; terbanyak ${Kartu.hl(fmt(v[pk].n) + " erupsi")} pada ${v[pk].t}`,
      this.batang(v, {warna: BATA}), "MAGMA Indonesia, informasi letusan; dicatat Pantau Bencana tiap pembaruan", [[BATA, "erupsi dalam 24 jam"], ["#c9503a", "terbanyak"]]); },

  /* 4. gunung naik atau turun level per hari (perubahan yang dicatat Pantau Bencana + tren di abu_gunungapi.json); dibuang bila belum ada perubahan */
  kNaik() {
    const ev = new Map(), tambah = (nm, tgl, dari, ke) => ev.set(nm + tgl + dari + ke, {nm, tgl, dari, ke});
    (S.st?.perubahan || []).forEach(p => tambah(p.nama, p.tgl, p.dari, p.ke));
    (this.abu?.tren || []).forEach(t => tambah(t.nama, new Date(t.waktu).toLocaleDateString("en-CA", WIB), t.dari, t.ke));
    const E = [...ev.values()]; if (!E.length) return "";
    const hari = [...new Set([...(S.st?.riwayat || []).map(r => r.tgl), ...E.map(e => e.tgl)])].sort(); if (hari.length < 2) return "";
    const naik = E.filter(e => e.ke > e.dari).length, turun = E.length - naik;
    const v = hari.map(t => { const d = E.filter(e => e.tgl === t), n = d.filter(e => e.ke > e.dari).length;
      return {n: d.length, n2: n, t: this.tgl(t), tip: `<b>${this.tgl(t)}</b><br>Naik level: ${fmt(n)} gunung<br>Turun level: ${fmt(d.length - n)} gunung${d.length ? "<br>" + esc(d.map(e => e.nm).join(", ")) : ""}`}; });
    return this.kartu("Naik turun level", `${Kartu.hl(fmt(naik) + " gunung")} naik level dan ${Kartu.hl(fmt(turun) + " gunung")} turun dalam ${fmt(hari.length)} hari terakhir`,
      this.batang(v, {warna: WARNA_LV[2], warna2: WARNA_LV[4], w2: true, puncak: false}), "MAGMA Indonesia, PVMBG; dicatat Pantau Bencana tiap pembaruan", [[WARNA_LV[2], "perubahan level"], [WARNA_LV[4], "naik"]]); },

  /* baris mendatar: rows [{nama, v, warna, pil: [[teks, bg, fg]], tip, gn?}]; batang sepanjang v, pil berderet sesudahnya (kartu Kartu.pil dari inti) */
  mendatar(rows, akhir) {
    const M = innerWidth < 640, Wd = M ? 520 : 940, L = M ? 118 : 190, rh = 30, fs = M ? 12 : 12.5, mx = Math.max(1, ...rows.map(r => r.v)), X = v => v / mx * (Wd - L - akhir);
    return `<div class="tw sk"><svg viewBox="0 0 ${Wd} ${rows.length * rh + 4}" role="img" aria-label="Perbandingan">${rows.map((r, i) => { const y = i * rh, w = Math.max(2, X(r.v)); let px = L + w + 8;
      const pil = r.pil.map(([t, bg, fg = "#fff"]) => { const [svg, pw] = Kartu.pil(px, y + 5, t, bg, fg, 11); px += pw + 5; return svg; }).join("");
      return `<g${r.gn ? ` class="klik" data-gn="${esc(r.gn)}"` : ""}><text x="${L - 8}" y="${y + 19}" text-anchor="end" font-size="${fs}" font-weight="600">${esc(r.nama)}</text>
        <rect class="gx" style="--i:${i}" x="${L}" y="${y + 6}" width="${w}" height="${rh - 12}" rx="4" fill="${r.warna}" data-tip="${r.tip}"/><g class="gf" style="--i:${i}" pointer-events="none">${pil}</g></g>`; }).join("")}</svg></div>`; },
  p3: p => p < .001 ? "< 0,001" : p.toLocaleString("id-ID", {maximumFractionDigits: 3}),
  situs(u) { try { const h = new URL(u).hostname; return /noaa\.gov$/.test(h) ? "NOAA NCEI" : /volcano\.si\.edu$/.test(h) ? "Smithsonian GVP" : /archive\.org$/.test(h) && /bnpb/.test(u) ? "BNPB" : h; } catch (e) { return String(u); } },

  /* 5. tren jangka panjang (B06): Mann-Kendall + kemiringan Theil-Sen atas seri tahunan BNPB, dihitung scripts/gunungapi/tren.py */
  kTrenJangka() {
    const T = this.D?.tren, M = innerWidth < 640, SAT = {kejadian: ["Kejadian erupsi", "kejadian"], terdampak: ["Warga terdampak", "jiwa"], mengungsi: ["Warga mengungsi", "jiwa"], rumah_rusak: ["Rumah rusak", "rumah"]};
    const ks = Object.keys(SAT).filter(k => T?.[k]); if (!ks.length) return "";
    const WV = {naik: "#d64545", turun: "#2f8f83", "tidak bermakna": "#8a94a3"}, bermakna = ks.filter(k => T[k].vonis !== "tidak bermakna"), t0 = T[ks[0]];
    const Wd = M ? 520 : 940, L = M ? 120 : 190, rh = 34;
    const g = ks.map((k, i) => { const r = T[k], y = i * rh, sl = Math.abs(r.kemiringan) >= 10 ? fmt(Math.round(Math.abs(r.kemiringan))) : Math.abs(r.kemiringan).toLocaleString("id-ID", {maximumFractionDigits: 1}), tanda = r.kemiringan > 0 ? "+" : r.kemiringan < 0 ? "−" : "",
      tip = `<b>${SAT[k][0]} ${r.dari} sampai ${r.sampai}</b><br>Uji Mann-Kendall: p = ${this.p3(r.p)} (n = ${r.n} tahun)<br>Kemiringan Theil-Sen: ${tanda}${sl} ${SAT[k][1]} per tahun`;
      const [pv, pw] = Kartu.pil(L, y + 6, r.vonis === "tidak bermakna" ? r.vonis : "tren " + r.vonis, WV[r.vonis], "#fff", 11.5);
      return `<g data-tip="${tip}"><rect x="0" y="${y}" width="${Wd}" height="${rh}" fill="transparent"/><text x="${L - 8}" y="${y + 21}" text-anchor="end" font-size="${M ? 12 : 12.5}" font-weight="600">${SAT[k][0]}</text>${pv}
        <text x="${L + pw + 10}" y="${y + 21}" font-size="${M ? 11.5 : 12}" opacity=".8">p = ${this.p3(r.p)} · ${tanda}${sl} ${SAT[k][1]}/tahun</text></g>`; }).join("");
    const judul = bermakna.length ? `${Kartu.hl(SAT[bermakna[0]][0])} menunjukkan ${Kartu.hl("tren " + T[bermakna[0]].vonis)} pada ${t0.dari} sampai ${t0.sampai} (p = ${this.p3(T[bermakna[0]].p)})`
      : `${Kartu.hl("Tidak ada tren naik atau turun yang bermakna")} pada ${fmt(ks.length)} seri tahunan BNPB ${t0.dari} sampai ${t0.sampai} (semua p di atas 0,05)`;
    return this.kartu("Tren jangka panjang", judul, `<div class="tw sk"><svg viewBox="0 0 ${Wd} ${ks.length * rh + 4}" role="img" aria-label="Uji tren jangka panjang">${g}</svg></div>`,
      `BNPB. Uji Mann-Kendall, ${t0.n} tahun; bukan prakiraan letusan`, [["#d64545", "tren naik"], ["#2f8f83", "tren turun"], ["#8a94a3", "tidak bermakna"]]); },

  /* 6. letusan besar yang dikurasi tangan (A36): factsheet_gunungapi.json, tiap angka bersumber URL-nya sendiri */
  kKasus() {
    const K = (this.F?.kasus || []).filter(k => k.meninggal > 0 && k.sumber?.meninggal && k.tanggal); if (!K.length) return "";
    const top = [...K].sort((a, b) => b.meninggal - a.meninggal)[0], th = k => k.tanggal.slice(0, 4), WV = v => v >= 6 ? "#7a2e2e" : v >= 4 ? "#d64545" : "#e8743b";
    const tglK = k => k.tanggal.length === 10 ? new Date(k.tanggal + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}) : th(k);
    const rows = [...K].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map(k => ({nama: `${th(k)} ${k.gunung.replace(" Laki-laki", "")}`, v: k.meninggal, warna: "#b5523b",
      pil: [[fmt(k.meninggal) + " jiwa", "#b5523b"], ...(k.vei != null ? [["VEI " + k.vei, WV(k.vei)]] : [])],
      tip: `<b>${esc(k.nama)}</b><br>${tglK(k)}${k.vei != null ? " · VEI " + k.vei : ""}<br>Meninggal: ${fmt(k.meninggal)} jiwa${k.korban_ket ? " (" + esc(k.korban_ket) + ")" : ""}${k.pengungsi ? `<br>Pengungsi: ${fmt(k.pengungsi)} jiwa (${esc(k.pengungsi_ket)})` : ""}${k.rumah_hancur ? `<br>Rumah hancur: ${fmt(k.rumah_hancur)}` : ""}${k.vei_ket ? `<br>${esc(k.vei_ket)}` : ""}<br>Sumber: ${[...new Set(Object.values(k.sumber).map(u => this.situs(u)))].join(", ")}`}));
    return this.kartu("Letusan merusak", `${Kartu.hl(fmt(top.meninggal) + " jiwa")} meninggal pada letusan ${Kartu.hl(top.gunung + " " + th(top))}${top.vei != null ? ` (VEI ${top.vei})` : ""}, yang terbanyak dari ${Kartu.hl(K.length + " letusan merusak")} yang dikurasi sejak ${th(K.reduce((a, k) => k.tanggal < a.tanggal ? k : a))}`,
      this.mendatar(rows, M_AKHIR()), [...new Set(K.flatMap(k => Object.values(k.sumber).map(u => this.situs(u))))].join(", ") + (K.some(k => k.korban_ket) ? ". Total " + K.filter(k => k.korban_ket).map(k => k.gunung).join(" dan ") + " termasuk korban tidak langsung" : ""), [["#b5523b", "meninggal"], ["#d64545", "VEI 4 ke atas"], ["#e8743b", "VEI 3 ke bawah"]]); },

  /* 7. indeks risiko riwayat letusan 0 sampai 100 per gunung (A15), scripts/gunungapi/risiko.py */
  kRisiko() {
    const r = this.Rk; if (!r?.gunung) return "";
    const WK = ["#9aa4b2", "#e0b400", "#e8743b", "#d64545"], R = Object.entries(r.gunung).slice(0, 10); if (!R.length) return "";
    const rows = R.map(([nm, [skor, ki, th, vm]]) => ({nama: nm, gn: nm, v: skor, warna: WK[ki], pil: [[String(skor), WK[ki], ki === 1 ? "#3b2e00" : "#fff"], [r.kelas[ki], WK[ki], ki === 1 ? "#3b2e00" : "#fff"]],
      tip: `<b>${esc(nm)}</b><br>Indeks risiko riwayat: ${skor} dari 100 (${r.kelas[ki]})<br>Aktif ${fmt(th)} tahun sejak ${r.tahun[0]}<br>VEI tertinggi: ${vm}`}));
    return this.kartu("Indeks risiko riwayat", `${R.filter(x => x[1][0] === R[0][1][0]).map(x => Kartu.hl(esc(x[0]))).join(", ").replace(/, ([^,]*)$/, " dan $1")} punya indeks risiko riwayat letusan tertinggi${R.filter(x => x[1][0] === R[0][1][0]).length > 1 ? " bersama" : ""}: ${Kartu.hl(R[0][1][0] + " dari 100")}, dari ${Kartu.hl(fmt(Object.keys(r.gunung).length) + " gunung")} yang dinilai`,
      this.mendatar(rows, M_AKHIR(150)), `Smithsonian GVP. Riwayat ${r.tahun[0]} sampai ${r.tahun[1]}, bukan prakiraan letusan`, WK.map((w, i) => [w, r.kelas[i]])); },

  async render() {
    const el = $("#tren"); if (!el) return;
    if (this.D === undefined) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat tren gunung api…</div>`; [this.D, this.F, this.Rk] = await Promise.all([Data.dampak(), Data.fs(), Data.risiko()]); }
    this.abu = await Data.abu();
    if (!el._klik) { el._klik = 1; el.addEventListener("click", e => { const gn = e.target.closest("[data-gn]"); if (!gn) return; const g = S.st.gunung.find(x => x.nama === gn.dataset.gn); if (g) { bukaTab("peta"); nanti(() => { Peta.terbang(g); Detail.buka(g); }); } }); }
    el.innerHTML = [this.kTahun, this.kTrenJangka, this.kKasus, this.kRisiko, this.kLevel, this.kNaik, this.kErupsi].map(f => { try { return f.call(this); } catch (e) { console.error(e); return ""; } }).join("") || `<p class="kosong">Belum ada tren.</p>`; },
};
