"use strict";
/* Tab Tren: tiap blok = Kartu.ex (inti/kartu.js). Kartu tanpa data dibuang (A18): riwayat dasarian baru muncul setelah dua dasarian terkumpul. */
const Tren = {
  kartu(ey, judul, isi, sumber, leg) { Kartu.leg(leg); return Kartu.ex(judul, "", "", isi, "Sumber: " + sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
  /* batang berangka: v = [{n, t, tip}], tinggi mengikuti nilai; kedua = batang kedua lebih sempit di depan (mis. ekstrem di dalam kering) */
  batang(v, {W = 940, H = 280, fmtN = fmt, w2 = null, warna = JINGGA, warna2 = MERAH} = {}) {
    const M = innerWidth < 640, Wd = M ? 700 : W, L = 34, B = H - 26, T = 22, gap = (Wd - L - 10) / v.length, bw = gap * .7, mx = Math.max(1, ...v.map(x => x.n)), Y = x => B - x / mx * (B - T);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${Wd - 4}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${fmtN(mx * f)}</text>`).join("");
    g += v.map((x, i) => { const px = L + i * gap + (gap - bw) / 2, ini = i === v.length - 1;
      return `<rect class="gy" style="--i:${i}" x="${px}" y="${Y(x.n)}" width="${bw}" height="${Math.max(1, B - Y(x.n))}" rx="3" fill="${warna}" opacity="${ini ? 1 : .8}" data-tip="${x.tip}"/>
        ${w2 && x.n2 ? `<rect class="gy" style="--i:${i}" x="${px + bw * .2}" y="${Y(x.n2)}" width="${bw * .6}" height="${Math.max(1, B - Y(x.n2))}" rx="2" fill="${warna2}" data-tip="${x.tip}"/>` : ""}
        <text class="gf" style="--i:${i}" x="${px + bw / 2}" y="${Y(x.n) - 5}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" font-weight="800" opacity=".85" pointer-events="none">${fmtN(x.n)}</text>
        <text x="${px + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" opacity=".7" pointer-events="none">${x.t}</text>`; }).join("");
    return `<div class="tw sk"><svg viewBox="0 0 ${Wd} ${H}" style="min-width:${M ? 700 : 0}px" role="img" aria-label="Tren">${g}</svg></div>`; },

  /* 1. porsi sel kering menurut SPI-3, 24 bulan */
  kSpi() {
    const s = S.tren?.spi_bulanan; if (!s || s.length < 3) return "";
    const v = s.map(x => ({n: x.kering, n2: x.ekstrem, t: BLN[+x.bln.slice(5) - 1] + (x.bln.endsWith("-01") || x === s[0] ? " " + x.bln.slice(2, 4) : ""),
      tip: `<b>${bulanPanjang(x.bln)}</b><br>Kering (SPI-3 ≤ −1): ${fmt(x.kering)}% wilayah<br>Kering ekstrem (curah hujan, ≤ −2): ${fmt(x.ekstrem)}% wilayah`})), a = s.at(-1), mx = Math.max(...s.map(x => x.kering)), tertinggi = a.kering >= mx;
    return this.kartu("Hujan", `${Kartu.hl(fmt(a.kering) + "%")} wilayah kering pada ${bulanPanjang(a.bln)}, ${fmt(a.ekstrem)}% kering ekstrem (curah hujan)${tertinggi ? `, tertinggi dalam ${s.length} bulan` : ""}`,
      this.batang(v, {fmtN: x => fmt(Math.round(x * 10) / 10), w2: true}), "Deteksi Pantau Bencana (SPI-3 dari NASA POWER 1991–2020)", [[JINGGA, "agak kering atau lebih (SPI-3 ≤ −1)"], [MERAH, "kering ekstrem (curah hujan, ≤ −2)"]]); },

  /* 2. kode kekeringan (DC) harian: median dan persentil ke-90 seluruh sel */
  kDc() {
    const d = S.tren?.dc_harian; if (!d || d.length < 2) return "";
    const v = d.map(x => ({n: x.p90, n2: x.med, t: tglPendek(x.tgl), tip: `<b>${tglPendek(x.tgl)}</b><br>Median: ${fmt(x.med)}<br>10% sel terkering: ${fmt(x.p90)}`})), a = d[0], b = d.at(-1), naik = b.med - a.med;
    return this.kartu("Kode DC", `DC median ${naik >= 0 ? "naik" : "turun"} dari ${Kartu.hl(fmt(a.med))} ke ${Kartu.hl(fmt(b.med))} dalam ${d.length} hari; 10% sel terkering di ${fmt(b.p90)}`,
      this.batang(v, {warna: "#c9a24b", warna2: "#8a6d4e", w2: true}), "Drought Code Kanada (FWI) dari cuaca ECMWF lewat Open-Meteo", [["#c9a24b", "10% sel terkering"], ["#8a6d4e", "median"]]); },

  /* 3. riwayat dasarian: jiwa di kecamatan kering ekstrem; titik baru bertambah tiap dasarian */
  kDasarian() {
    const r = S.tren?.dasarian; if (!r || r.length < 2) return "";
    const v = r.map(x => ({n: x.jiwa[2], n2: 0, t: DAS(x.das), tip: `<b>${DAS(x.das)} ${x.id.slice(0, 4)}</b><br>${rb(x.jiwa[2])} jiwa di kecamatan Awas<br>${fmt(x.kab_n[2])} kabupaten/kota Awas`})), a = r.at(-1);
    return this.kartu("Dasarian", `${Kartu.hl(jt(a.jiwa[2]) + " jiwa")} di kecamatan Awas pada dasarian ${DAS(a.das)}, ${fmt(a.kab_n[2])} kabupaten/kota`,
      this.batang(v, {fmtN: rb, warna: MERAH}), "Deteksi Pantau Bencana", [[MERAH, "jiwa di kecamatan Awas"]]); },

  /* 4-5. HTH 30 hari: jiwa di wilayah HTH 31 hari atau lebih, dan HTH terpanjang nasional */
  kHth() {
    const H = S.hth, r = H?.nasional?.seri, tg = H?.tgl30; if (!r?.j31?.length || r.j31.length !== tg?.length) return "";
    const v = tg.map((t, i) => ({n: r.j31[i], t: tglPendek(t), tip: `<b>${tglPendek(t)}</b><br>${rb(r.j31[i])} jiwa di wilayah HTH 31 hari atau lebih<br>${fmt(r.kab31[i])} kabupaten/kota`})), n = v.length - 1, d = v[n].n - v[Math.max(0, n - 7)].n;
    return this.kartu("HTH", `${Kartu.hl(jt(v[n].n) + " jiwa")} tinggal di wilayah HTH 31 hari atau lebih, ${d === 0 ? "sama dengan" : Kartu.hl((d > 0 ? "naik " : "turun ") + jt(Math.abs(d)) + " jiwa") + " dari"} 7 hari lalu`,
      this.batang(v, {fmtN: rb, warna: MERAH}), "Deteksi Pantau Bencana (hujan Open-Meteo, ambang " + fmt(H.ambang_mm) + " mm)", [[MERAH, "jiwa di wilayah HTH 31 hari atau lebih"]]); },
  kHthMaks() {
    const H = S.hth, r = H?.nasional?.seri, tg = H?.tgl30; if (!r?.maks?.length || r.maks.length !== tg?.length) return "";
    const v = tg.map((t, i) => ({n: r.maks[i], t: tglPendek(t), tip: `<b>${tglPendek(t)}</b><br>HTH terpanjang: ${fmt(r.maks[i])} hari`})), a = v.at(-1).n;
    return this.kartu("HTH terpanjang", `HTH terpanjang nasional ${Kartu.hl(fmt(a) + " hari")} pada ${tglPendek(tg.at(-1))}, kelas ${esc((KELAS_HTH()[klsHth(a)] || "").toLowerCase())} menurut BMKG`,
      this.batang(v, {warna: JINGGA}), "Deteksi Pantau Bencana (hujan Open-Meteo; batas kelas BMKG, angka bukan peta BMKG)", [[JINGGA, "hari tanpa hujan berturut-turut, nilai terbesar di seluruh sel"]]); },

  /* 6. kalender musim: curah hujan bulanan rata-rata 1991-2025, nasional dan musim kering per provinsi (riwayat.py) */
  kKalender() {
    const R = S.riw, N = R?.kalender?.nasional; if (!N?.mm?.every(x => x != null)) return "";
    const v = N.mm.map((n, i) => ({n, n2: N.mm_elnino[i] ?? 0, t: BLN[i], tip: `<b>${BLN_PENUH[i]}</b><br>Rata-rata ${R.tahun[0]}–${R.tahun[1]}: ${fmt(n)} mm<br>Saat El Niño (${fmt(R.tahun_el_nino.length)} tahun): ${N.mm_elnino[i] != null ? fmt(N.mm_elnino[i]) + " mm" : "–"}<br>Tahun dengan bulan kering (< ${fmt(R.bulan_kering_mm)} mm): ${fmt(N.kering_pct[i])}%`}));
    const k = N.mm.indexOf(Math.min(...N.mm)), rentang = a => { const m = a.map((x, i) => x ? i : -1).filter(i => i >= 0); if (!m.length) return "–"; const w = (m[0] === 0 && m.at(-1) === 11 && m.length < 12) ? [...m.filter(i => i > 5), ...m.filter(i => i <= 5)] : m; return m.length === 12 ? "sepanjang tahun" : w.length === 1 ? BLN[w[0]] : BLN[w[0]] + "–" + BLN[w.at(-1)]; };
    const baris = Object.entries(R.kalender).filter(([g, o]) => g !== "nasional" && o.mm.every(x => x != null)).map(([g, o]) => ({g, o, kering: o.mm.map(x => x < R.bulan_kering_mm), mn: Math.min(...o.mm), i: o.mm.indexOf(Math.min(...o.mm))}))
      .sort((a, b) => b.kering.filter(Boolean).length - a.kering.filter(Boolean).length || a.mn - b.mn).slice(0, 12);
    const tb = baris.length ? `<div class="tw"><table class="kl-tb"><thead><tr><th>Provinsi (musim kering = rata-rata di bawah ${fmt(R.bulan_kering_mm)} mm)</th><th>Bulan kering</th><th class="n">Bulan terkering</th><th class="n">Saat El Niño</th></tr></thead><tbody>${baris.map(b => `<tr><td><b translate="no">${esc(namaProv(b.g))}</b></td><td>${rentang(b.kering)}</td><td class="n num">${BLN[b.i]} ${fmt(b.mn)} mm</td><td class="n num">${b.o.mm_elnino[b.i] != null ? fmt(b.o.mm_elnino[b.i]) + " mm" : "–"}</td></tr>`).join("")}</tbody></table></div>` : "";
    return this.kartu("Kalender musim", `${Kartu.hl(BLN_PENUH[k])} bulan terkering rata-rata nasional (${Kartu.hl(fmt(N.mm[k]) + " mm")}), turun ke ${Kartu.hl(N.mm_elnino[k] != null ? fmt(N.mm_elnino[k]) + " mm" : "–")} pada tahun El Niño`,
      this.batang(v, {warna: BIRU, warna2: MERAH, w2: true, fmtN: x => fmt(Math.round(x))}) + tb, `Pantau Bencana (${esc(R.sumber)}); bulan kering menurut Schmidt-Ferguson`, [[BIRU, `curah hujan bulanan rata-rata ${R.tahun[0]}–${R.tahun[1]} (mm)`], [MERAH, "rata-rata pada tahun El Niño (ONI Jul–Sep ≥ +0,5)"]]); },

  /* 7. indeks risiko riwayat 0-100 per kabupaten: 50% kekerapan, 30% besaran, 20% tren (pola risiko_riwayat karhutla) */
  kRisiko() {
    const R = S.riw, E = Object.entries(R?.kab || {}); if (E.length < 5) return "";
    const T = E.map(([k, o]) => ({k, ...o})).sort((a, b) => b.risiko - a.risiko || b.bulan_siaga - a.bulan_siaga || a.k.localeCompare(b.k)), top = T.slice(0, 15), med = T[Math.floor(T.length / 2)].risiko;
    const baris = top.map((o, i) => { const p = o.k.split("|"); return `<tr data-kab="${esc(o.k)}" style="cursor:pointer"><td class="n num">${i + 1}</td><td><b translate="no">${esc(p[1])}</b><br><small translate="no">${esc(namaProv(p[0]))}</small></td>
      <td><span style="display:inline-block;height:9px;border-radius:3px;background:${MERAH};width:${Math.round(o.risiko * 1.1)}px;vertical-align:middle"></span> <b>${fmt(o.risiko)}</b></td><td class="n num">${fmt(o.bulan_siaga)}</td><td class="n num">${fmt(Math.round(o.kekerapan * 100))}%</td><td class="n num">${o.dibi ? fmt(o.dibi) : "–"}</td></tr>`; }).join("");
    return this.kartu("Risiko riwayat", `${Kartu.hl(esc(top[0].k.split("|")[1]) + " " + fmt(top[0].risiko))} indeks risiko riwayat tertinggi dari 100, median ${fmt(med)} di ${fmt(T.length)} kabupaten/kota`,
      `<div class="tw"><table class="kl-tb"><thead><tr><th class="n">#</th><th>Kabupaten/kota</th><th>Indeks 0–100</th><th class="n">Bulan Siaga atau lebih (${R.tahun[0]}–${R.tahun[1]})</th><th class="n">Tahun bersiaga</th><th class="n">Kejadian DIBI 2023–26</th></tr></thead><tbody>${baris}</tbody></table></div>`,
      `Pantau Bencana (${esc(R.sumber)}). ${esc(R.catatan)}`, [[MERAH, "indeks: 50% kekerapan, 30% besaran, 20% tren"]]); },

  render() {
    const el = $("#tren"); el.innerHTML = [this.kSpi, this.kDc, this.kHth, this.kHthMaks, this.kDasarian, this.kKalender, this.kRisiko].map(f => { try { return f.call(this); } catch (e) { console.error(e); return ""; } }).join("") || `<p class="kosong">Belum ada tren.</p>`;
    el.onclick = e => { const kb = e.target.closest("tr[data-kab]"); if (!kb) return; const p = kb.dataset.kab.split("|"); S.jalur = [p[0]]; bukaTab("peta"); nanti(() => Peta.aturWilayah().then(() => Analisa.wilayah(kb.dataset.kab))); }; },
};
