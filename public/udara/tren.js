"use strict";
/* ================================================================ tren kualitas udara */
/* Tab Tren: kartu bergaya Insight (Kartu.kartu di public/inti), tabel standar (kepala gelap, urut, paginasi), rupa sama dengan Tren karhutla dan banjir.
   Data: /udara/data/riwayat.json (scripts/udara/riwayat.py: analisis CAMS hari lampau per kabupaten/kota x jiwa) ditambah prakiraan 3 hari dari prakiraan.json (batang pudar). SEMUA angka perkiraan model CAMS (belum dikoreksi ke alat ukur): pil model dipasang di tiap kartu berangka jiwa.
   Kartu tanpa data dibuang (A18): riwayat harian baru muncul bila >= 2 hari. */
const Grafik = {
  MERAH: "#c9503a",
  tgl: (t, o = {day: "numeric", month: "short"}) => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", o),
  /* batang tegak (bertumpuk bila seri > 1): cat = label sumbu, seri = [[nama, warna]], nilai[i] = angka tiap seri, tip(i) = isi tooltip, pudar(i) = batang prakiraan.
     Puncak diberi pil merah, selain itu angka total tertulis di atas batang (A8). Layar sempit menggulir ke samping, huruf tidak mengecil. */
  kolom({cat, seri, nilai, tip, aria = "Grafik", fmtNilai = kr, pudar = () => false}) {
    const M = innerWidth < 640, n = cat.length, W = M ? Math.max(350, n * 24 + 60) : 940, L = 44, R = 20, T = 36, B = 236, gap = (W - L - R) / n, bw = gap * .72;
    const tot = nilai.map(v => v.reduce((a, b) => a + b, 0)), mx = Math.max(1, ...tot), Y = v => B - v / mx * (B - T), puncak = tot.indexOf(Math.max(...tot)), fs = n > 40 ? 8.5 : n > 24 ? 9.5 : 10.5, langkah = Math.ceil(n / (M ? 9 : 14));
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${fmtNilai(mx * f)}</text>`).join("");
    g += cat.map((c, i) => { const x = L + i * gap + (gap - bw) / 2; let y0 = B, bar = "";
      nilai[i].forEach((v, k) => { if (!v) return; const h = v / mx * (B - T); y0 -= h; bar += `<rect x="${x}" y="${y0}" width="${bw}" height="${Math.max(1, h)}" rx="${seri.length > 1 ? 0 : Math.min(4, bw / 3)}" fill="${seri[k][1]}" opacity="${pudar(i) ? .5 : .93}"/>`; });
      const lbl = fmtNilai(tot[i]), pw = lbl.length * 11 * .6 + 16;
      return `<g class="gy" style="--i:${i}" data-tip="${esc(tip(i))}">${bar}<rect x="${x - (gap - bw) / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g>`
        + (i === puncak && tot[i] ? Kartu.pil(x + bw / 2 - pw / 2, Y(tot[i]) - 26, lbl, Grafik.MERAH, "#fff", 11)[0] : tot[i] ? `<text x="${x + bw / 2}" y="${Y(tot[i]) - 6}" text-anchor="middle" font-size="${fs}" font-weight="700" opacity=".75" pointer-events="none">${lbl}</text>` : "")
        + (i % langkah === 0 ? `<text x="${x + bw / 2}" y="${B + 16}" text-anchor="middle" font-size="10.5" opacity=".7">${c}</text>` : ""); }).join("");
    return `<div class="tw sk"><svg viewBox="0 0 ${W} ${B + 24}" style="min-width:${M ? W : 0}px" role="img" aria-label="${aria}">${g}</svg></div>`; },
  gulir: el => el.querySelectorAll(".tw.sk").forEach(w => { w.scrollLeft = w.scrollWidth; }),
};

const Tren = {
  st: {rentang: "30"}, T: {provinsi: {urut: "hari", turun: true, hal: 0}},
  R: undefined,
  /* deret nasional: hari riwayat (sampai kemarin atau hari pertama prakiraan) + hari prakiraan yang belum ada di riwayat; [{t, depan, jiwa: [baik..berbahaya tak diperlukan], ts, stp, rata}] */
  deret() {
    const U = S.uk, N = +this.st.rentang, rw = this.R?.tgl || {}, hariUk = U.hari, mulaiUk = hariUk[S.h0];
    const lalu = Object.keys(rw).sort().filter(t => t < mulaiUk).map(t => ({t, depan: false, ts: rw[t][1], stp: rw[t][3] ?? 0, rata: rw[t][2]}));
    const kini = hariTampil().map(i => { const n = U.nasional[i]; return {t: hariUk[i], depan: hariUk[i] > tglWIB(SEKARANG()), ts: n.jiwa[2] + n.jiwa[3] + n.jiwa[4], stp: n.jiwa[3] + n.jiwa[4], rata: n.rata}; });
    return [...lalu, ...kini].slice(-(N + kini.length)); },
  tampilSeg: () => Tren.R && Object.keys(Tren.R.tgl).length > 14,
  segRentang() { return this.tampilSeg() ? Kartu.seg("rentang", [["14", "14 hari"], ["30", "30 hari"], ["45", "45 hari"]], this.st) : ""; },

  exJiwa() {
    const D = this.deret(); if (D.length < 2) return "";
    const nilai = D.map(d => [d.ts - d.stp, d.stp]), tot = nilai.map(v => v[0] + v[1]), pk = tot.indexOf(Math.max(...tot)), ini = D.find(d => !d.depan && d.t === tglWIB(SEKARANG())) || D.filter(d => !d.depan).at(-1);
    const nama = i => Grafik.tgl(D[i].t, {weekday: "long", day: "numeric", month: "long"});
    return this.kartu("Jiwa terpapar", `${Kartu.hl(jiwa(tot[pk]))} menghirup udara tidak sehat pada ${Kartu.hl(Grafik.tgl(D[pk].t))}, tertinggi dalam ${fmt(D.length)} hari${ini ? `; ${Grafik.tgl(ini.t) === Grafik.tgl(D[pk].t) ? "itu juga" : "hari ini"} ${Kartu.hl(jiwa(ini.ts))}` : ""}`,
      Grafik.kolom({cat: D.map(d => Grafik.tgl(d.t)), seri: [["Tidak sehat", KAT[2].w], ["Sangat tidak sehat atau berbahaya", KAT[3].w]], nilai, aria: "Jiwa terpapar udara tidak sehat per hari", pudar: i => D[i].depan,
        tip: i => `<b>${nama(i)}</b>${D[i].depan ? " · prakiraan" : ""}<br>Tidak sehat atau lebih: ${jiwa(tot[i])}<br>Sangat tidak sehat atau berbahaya: ${jiwa(nilai[i][1])}<br>PM2,5 rata-rata: ${fmt(Math.round(D[i].rata))} µg/m³`}),
      "Copernicus CAMS lewat Open-Meteo, WorldPop; batang pudar = prakiraan", this.segRentang(), [[KAT[2].w, "tidak sehat"], [KAT[3].w, "sangat tidak sehat atau berbahaya"]]); },
  exRata() {
    const D = this.deret(); if (D.length < 2) return "";
    const v = D.map(d => d.rata), mx = Math.max(...v), pk = v.indexOf(mx), ini = D.find(d => d.t === tglWIB(SEKARANG())) || D.filter(d => !d.depan).at(-1);
    return this.kartu("PM2,5", `PM2,5 rata-rata nasional tertinggi ${Kartu.hl(fmt(Math.round(mx)) + " µg/m³")} pada ${Kartu.hl(Grafik.tgl(D[pk].t))}${ini ? `, ${Grafik.tgl(ini.t) === Grafik.tgl(D[pk].t) ? "itu juga hari ini" : `hari ini ${Kartu.hl(fmt(Math.round(ini.rata)) + " µg/m³")}`}` : ""}`,
      Grafik.kolom({cat: D.map(d => Grafik.tgl(d.t)), seri: [["PM2,5", KAT[2].w]], nilai: D.map(d => [Math.round(d.rata)]), aria: "PM2,5 rata-rata nasional per hari", fmtNilai: x => fmt(Math.round(x)), pudar: i => D[i].depan,
        tip: i => `<b>${Grafik.tgl(D[i].t, {weekday: "long", day: "numeric", month: "long"})}</b>${D[i].depan ? " · prakiraan" : ""}<br>PM2,5 rata-rata berbobot jiwa: ${fmt(Math.round(D[i].rata))} µg/m³<br>Kategori: ${KAT[kat(D[i].rata)].n}`}),
      "Copernicus CAMS lewat Open-Meteo, WorldPop; batang pudar = prakiraan; µg/m³", this.segRentang(), null); },
  /* provinsi: berapa hari rata-rata 24 jam melewati batas Baik dan Sedang dalam rentang */
  exProvinsi() {
    const D = this.deret().filter(d => !d.depan), h = D.map(d => d.t); if (h.length < 2) return "";
    const R = Object.entries(this.R.prov).map(([k, d]) => { const v = h.map(t => d[t]).filter(Boolean); if (!v.length) return null;
      return {k, hari: v.filter(x => x[1] > BATAS[1]).length, rata: v.reduce((a, x) => a + x[1], 0) / v.length, maks: Math.max(...v.map(x => x[1])), ts: v.at(-1)[0]}; }).filter(r => r && (r.hari || r.ts));
    if (!R.length) return ""; Insight.T.tren_prov = this.T.provinsi;
    const top = [...R].sort((a, b) => b.hari - a.hari || b.rata - a.rata)[0];
    const kol = [{k: "prov", n: "Provinsi", v: r => namaProv(r.k), h: r => `<span translate="no">${esc(namaProv(r.k))}</span>`},
      {k: "hari", n: "Hari tidak sehat", num: 1, v: r => r.hari, h: r => r.hari ? `<span class="kt" style="--c:${KAT[2].w};--f:${KAT[2].fg}">${fmt(r.hari)} hari</span>` : "–"},
      {k: "rata", n: "PM2,5 rata-rata", num: 1, v: r => r.rata, h: r => `<span class="kt" style="--c:${KAT[kat(r.rata)].w};--f:${KAT[kat(r.rata)].fg}">${fmt(Math.round(r.rata))} µg/m³</span>`},
      {k: "maks", n: "PM2,5 tertinggi", num: 1, v: r => r.maks, h: r => fmt(Math.round(r.maks)) + " µg/m³"},
      {k: "ts", n: "Jiwa tidak sehat (terakhir)", num: 1, v: r => r.ts, h: r => r.ts ? kr(r.ts) + " jiwa" : "–"}];
    return this.kartu("Provinsi", `${Kartu.hl(esc(namaProv(top.k)))} paling sering berudara tidak sehat: ${Kartu.hl(fmt(top.hari) + " dari " + fmt(h.length) + " hari")}, PM2,5 rata-rata ${Kartu.hl(fmt(Math.round(top.rata)) + " µg/m³")}`,
      Insight.tabel("tren_prov", kol, R, r => `data-prov="${r.k}"`, 10, "provinsi", r => r.hari), "Copernicus CAMS lewat Open-Meteo, WorldPop; hari tidak sehat = PM2,5 rata-rata 24 jam di atas 55,4 µg/m³"); },

  /* kalender musim asap: median titik panas nasional per bulan (penanda musim bakar, BUKAN ukuran asap), musim_asap.json / scripts/udara/musim_asap.py. Tanpa klaim sebab. */
  BLN: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  BLN_PENUH: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
  exMusim() {
    const B = this.M?.bulan; if (!B || !B.median.some(v => v > 0)) return "";
    const md = B.median, pk = md.indexOf(Math.max(...md)), th = B.tahun, cams = Object.fromEntries((this.M.cams || []).map(([b, n, r]) => [+b.slice(5) - 1, [b, r]])), c0 = this.M.cams?.[0];
    return this.kartu("Kalender musim asap", `${Kartu.hl(this.BLN_PENUH[pk])} bulan dengan titik panas terbanyak: median ${Kartu.hl(fmt(md[pk]) + " titik")} per bulan pada ${th[0]} sampai ${th.at(-1)}, kisaran ${fmt(B.min[pk])} sampai ${fmt(B.maks[pk])}`,
      Grafik.kolom({cat: this.BLN, seri: [["Titik panas", "#c9503a"]], nilai: md.map(v => [v]), aria: "Median titik panas nasional per bulan", fmtNilai: x => kr(Math.round(x)),
        tip: i => `<b>${this.BLN_PENUH[i]}</b><br>Median titik panas: ${fmt(md[i])}<br>Kisaran: ${fmt(B.min[i])} sampai ${fmt(B.maks[i])}${cams[i] ? `<br>PM2,5 CAMS ${cams[i][0].slice(0, 4)}: ${fmt(cams[i][1])} µg/m³ (perkiraan model)` : ""}`}),
      `NASA FIRMS, semua satelit, ${th[0]} sampai ${th.at(-1)}. Titik panas penanda musim bakar, bukan ukuran asap; ${c0 ? `PM2,5 CAMS baru ada sejak ${this.BLN_PENUH[+c0[0].slice(5) - 1]} ${c0[0].slice(0, 4)}, belum cukup untuk kalender PM2,5` : "PM2,5 CAMS belum cukup panjang untuk kalender PM2,5"}`); },
  /* ENSO: titik panas 1 Jan sampai tanggal data terakhir tiap tahun, diwarnai fase ENSO tahun itu (rata-rata ONI, NOAA CPC); hanya mempertemukan dua deret, tidak menilai sebab */
  exEnso() {
    const T = this.M?.tahun, th = T && Object.keys(T).sort(); if (!th || th.length < 4) return "";
    const FASE = [["El Niño", "#c9503a"], ["Netral", "#9aa4b2"], ["La Niña", "#3f7fb8"]], pk = th.reduce((a, t) => T[t].n > T[a].n ? t : a, th[0]), K = this.M.kini || {}, o = K.oni;
    const f2 = v => (v > 0 ? "+" : "") + v.toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2}), tg = Grafik.tgl(this.M.sd);
    return this.kartu("ENSO", `${Kartu.hl(fmt(T[pk].n) + " titik panas")} sampai ${Kartu.hl(tg)} pada ${Kartu.hl(pk)} (${T[pk].fase}${T[pk].sementara ? ", ONI sementara" : ""}), tertinggi sejak ${th[0]}${K.status && o ? `; ENSO kini ${Kartu.hl(K.status)}, ONI ${f2(o.nilai)} (${o.musim} ${o.tahun})` : ""}`,
      Grafik.kolom({cat: th.map(t => "'" + t.slice(2)), seri: FASE, nilai: th.map(t => FASE.map(([f]) => T[t].fase === f ? T[t].n : 0)), aria: "Titik panas per tahun menurut fase ENSO", fmtNilai: x => kr(Math.round(x)),
        tip: i => `<b>${th[i]}</b><br>${fmt(T[th[i]].n)} titik panas (1 Jan sampai ${tg})<br>Fase ${T[th[i]].fase}, ONI rata-rata ${f2(T[th[i]].oni)}${T[th[i]].sementara ? " (sementara, tahun belum selesai)" : ""}`}),
      `NASA FIRMS, 1 Jan sampai ${tg} tiap tahun; ONI NOAA CPC rata-rata setahun (El Niño +0,5 atau lebih, La Niña -0,5 atau kurang). Hanya tujuh tahun data, titik panas bukan ukuran asap, dan tahun berjalan memakai data NRT`,
      "", FASE.map(([f, w]) => [w, f]), false); },

  IKON: {"Jiwa terpapar": "jiwa", "PM2,5": "pm", Provinsi: "prov", "Kalender musim asap": "musim", ENSO: "enso"},
  IK: {musim: '<path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4"/>', enso: '<path d="M3 12c3-6 6-6 9 0s6 6 9 0"/>', jiwa: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>', pm: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>', prov: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'},
  /* semua kartu Tren berangka jiwa/PM2,5: pil "perkiraan model CAMS" di samping pil kategori */
  kartu(ey, judul, isi, sumber, ctl = "", leg = null, model = true) { return Kartu.kartu(`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${this.IK[this.IKON[ey]] || ""}</svg>${ey}`, judul, isi, sumber, ctl, leg).replace("</span><div class=\"ex-jd\">", model ? `</span>${PIL_MODEL}<div class="ex-jd">` : `</span><div class="ex-jd">`); },
  EX: ["jiwa", "rata", "provinsi", "musim", "enso"],
  gambar(id) { Kartu._leg = null; try { return this["ex" + id[0].toUpperCase() + id.slice(1)]() || ""; } catch (e) { console.error(e); return ""; } },
  tulis() { const el = $("#tren"); el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join(""); Grafik.gulir(el); },
  async render() {
    const el = $("#tren"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-set]"); if (s) { this.st[s.dataset.set] = s.dataset.v; return nanti(() => this.tulis()); }
        const pg = e.target.closest(".pgn-b[data-h]"); if (pg && !pg.disabled) { this.T.provinsi.hal = +pg.dataset.h; const box = pg.closest("[data-ex]"); return nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); }
        const th = e.target.closest("th button[data-k]"); if (th) { const st = this.T.provinsi, k = th.dataset.k; st.turun = st.urut === k ? !st.turun : true; st.urut = k; st.hal = 0; const box = th.closest("[data-ex]"); return nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); }
        const pv = e.target.closest("[data-prov]"); if (pv) { bukaTab("peta"); nanti(() => Peta.pilihProv(pv.dataset.prov)); } }); }
    if (this.R === undefined) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat tren udara…</div>`; this.R = S.rw || null; this.M = await muatJSON("/udara/data/musim_asap.json").catch(() => null); }
    this.tulis();
    if (!el.textContent.trim()) el.innerHTML = `<div class="kosong">Data tren udara belum tersedia.</div>`; },
};
