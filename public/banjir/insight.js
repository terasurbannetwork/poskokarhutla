"use strict";
/* ================================================================ insight */
/* Exhibit bergaya konsultan (judul = kesimpulan, angka kunci disorot), setara Insight karhutla. Tiap exhibit punya kontrol
   sendiri dan digambar ulang sendiri. Semua angka dari berkas data yang sama dengan tab lain. */
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const Insight = {
  st: {status: "b", hari: 0, hujan: "h3", sungai: "rasio", tren: "banjir", kab: "banjir", musim: "banjir", dampak: "meninggal"},
  EX: ["status", "hujan", "sungai", "rob", "tren", "musim", "kab", "dampak"],
  ex(judul, sub, unit, isi, catatan, ctl = "") {
    return `<article class="ex"><h3>${judul}</h3><p class="sub">${sub}</p><p class="unit">${unit}</p>${ctl ? `<div class="ctl">${ctl}</div>` : ""}${isi}<p class="fn">${catatan}</p></article>`; },
  hl: t => `<span class="hl">${t}</span>`,
  seg(key, opsi) { return `<div class="seg" role="group">${opsi.map(([v, n]) => `<button data-set="${key}" data-v="${v}" aria-pressed="${String(this.st[key]) === String(v)}">${n}</button>`).join("")}</div>`; },
  pendek: k => namaProv(k).replace("Kalimantan", "Kal.").replace("Sumatera", "Sum.").replace("Sulawesi", "Sul.").replace("Nusa Tenggara", "NT").replace("Papua", "Pap."),

  /* 1. status per provinsi untuk hari terpilih */
  exStatus() {
    const b = this.st.status, h = +this.st.hari, ag = agregat(b, h), pv = Object.keys(S.meta.provinsi).map(k => ({k, a: ag[k]})).filter(x => x.a)
      .sort((x, y) => (y.a.n[3] * 1e6 + y.a.n[2] * 1e3 + y.a.n[1]) - (x.a.n[3] * 1e6 + x.a.n[2] * 1e3 + x.a.n[1])).slice(0, 15);
    const W = 940, rh = 28, L = 200, mx = Math.max(1, ...pv.map(x => x.a.n[1] + x.a.n[2] + x.a.n[3])), X = v => v / mx * (W - L - 70);
    const g = pv.map((x, i) => { let acc = 0; return `<g data-prov="${x.k}" style="cursor:pointer"><text x="${L - 10}" y="${i * rh + 18}" text-anchor="end" font-size="13" font-weight="600">${esc(namaProv(x.k))}</text>` + [3, 2, 1].map(l => { const w = X(x.a.n[l]), s = `<rect class="gx" style="--i:${i}" x="${L + acc}" y="${i * rh + 5}" width="${w}" height="${rh - 10}" fill="${WARNA_LV[l]}" data-tip="<b>${esc(namaProv(x.k))}</b><br>${fmt(x.a.n[l])} kecamatan ${LEVEL[l].toLowerCase()}<br>klik untuk buka di peta"/>`; acc += w; return s; }).join("") + `<text x="${L + acc + 6}" y="${i * rh + 18}" font-size="12" font-weight="700">${fmt(x.a.n[1] + x.a.n[2] + x.a.n[3])}</text></g>`; }).join("");
    const nTot = l => Object.values(S.st.kec).filter(v => (v[b]?.[h] || 0) === l).length, nama = NAMA_B[b];
    const kapan = h ? tglPendek(S.st.hari[h]) : "hari ini";
    return this.ex(pv.length ? (nTot(3) + nTot(2) ? `${this.hl(fmt(nTot(3) + nTot(2)) + " kecamatan")} berstatus siaga atau awas ${nama} ${kapan}; ${fmt(nTot(1))} lainnya waspada` : `Belum ada kecamatan siaga atau awas ${nama} ${kapan}; ${this.hl(fmt(nTot(1)) + " kecamatan")} waspada`) : `Tidak ada kecamatan berstatus ${nama} pada ${h ? tglPendek(S.st.hari[h]) : "hari ini"}`,
      `Kecamatan berstatus per provinsi`, `jumlah kecamatan; warna = tingkat status. Klik provinsi untuk membukanya di peta.`,
      pv.length ? `<svg viewBox="0 0 ${W} ${pv.length * rh + 6}" role="img" aria-label="Status per provinsi">${g}</svg>` : `<p class="kosong">Semua kecamatan normal.</p>`, `Aturan status ada di tab Metode. Sumber: Open-Meteo, GloFAS, InaRISK.`,
      this.seg("status", [["b", "Banjir"], ["l", "Longsor"]]) + this.seg("hari", S.st.hari.map((t, i) => [i, i ? tglPendek(t) : "Hari ini"]))); },

  /* 2. hujan: sebaran sel per provinsi */
  exHujan() {
    const m = this.st.hujan, H = S.hujan, iH = H.hari.indexOf(H.hari_ini), nilai = g => m === "h3" ? g.h3 : m === "a7" ? g.a7 : Math.max(...g.h.slice(iH, iH + 7));
    const pv = Object.keys(S.meta.provinsi).map(k => { const v = H.grid.filter(g => g.prov === k).map(nilai).sort((a, b) => a - b); if (!v.length) return null;
      const q = p => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))]; return {k, min: v[0], q1: q(.25), med: q(.5), q3: q(.75), max: v.at(-1), n: v.length}; }).filter(Boolean).sort((a, b) => b.max - a.max).slice(0, 15);
    const W = 940, rh = 28, L = 200, mx = Math.max(10, ...pv.map(x => x.max)), X = v => L + v / mx * (W - L - 80);
    const ambang = m === "h3" ? [[50, "50"], [100, "100"], [150, "150"]] : m === "a7" ? [[70, "basah"], [150, "jenuh"]] : [[50, "lebat"], [100, "sangat lebat"]];
    let g = ambang.map(([v, n]) => v <= mx ? `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${pv.length * rh}" stroke="currentColor" stroke-dasharray="3 3" opacity=".35"/><text x="${X(v)}" y="${pv.length * rh + 14}" text-anchor="middle" font-size="10.5" opacity=".7">${n}</text>` : "").join("");
    g += pv.map((x, i) => { const y = i * rh + rh / 2; return `<text x="${L - 10}" y="${y + 4}" text-anchor="end" font-size="13" font-weight="600">${esc(namaProv(x.k))}</text>
      <line x1="${X(x.min)}" x2="${X(x.max)}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".35"/><rect class="gx" style="--i:${i}" x="${X(x.q1)}" y="${y - 7}" width="${Math.max(2, X(x.q3) - X(x.q1))}" height="14" rx="3" fill="#4f8fc4" opacity=".75"/>
      <line x1="${X(x.med)}" x2="${X(x.med)}" y1="${y - 8}" y2="${y + 8}" stroke="#0b2545" stroke-width="2"/><circle cx="${X(x.max)}" cy="${y}" r="4.5" fill="#c9503a" data-tip="<b>${esc(namaProv(x.k))}</b><br>sel terbasah ${fmt(Math.round(x.max))} mm<br>median ${fmt(Math.round(x.med))} mm · ${x.n} sel"/>
      <text x="${X(x.max) + 8}" y="${y + 4}" font-size="11.5" font-weight="700">${fmt(Math.round(x.max))}</text>`; }).join("");
    const top = pv[0], nm = {h3: "hujan 3 hari terlebat", maks: "hujan harian terlebat 7 hari", a7: "hujan 7 hari terakhir"}[m];
    return this.ex(`${nm[0].toUpperCase() + nm.slice(1)}: ${this.hl(fmt(Math.round(top?.max || 0)) + " mm")} di ${esc(namaProv(top?.k))}`,
      `Sebaran ${nm} per sel 0,25° di tiap provinsi`, `mm; kotak = 50% sel tengah, garis gelap = median, titik merah = sel terbasah`,
      `<svg viewBox="0 0 ${W} ${pv.length * rh + 20}" role="img" aria-label="Sebaran hujan per provinsi">${g}</svg>`, `Sumber: Open-Meteo (ECMWF, ICON, GFS). Skala hujan harian BMKG: lebat 50–100, sangat lebat 100–150, ekstrem > 150 mm.`,
      this.seg("hujan", [["h3", "3 hari"], ["maks", "Harian maks"], ["a7", "7 hari lalu"]])); },

  /* 3. sungai: puncak dibanding ambang */
  exSungai() {
    const T = S.sungai.titik.filter(t => t.q2).map(t => ({...t, r: t.puncak / t.q2})).sort((a, b) => b.r - a.r).slice(0, 15);
    if (!T.length) return this.ex("Ambang banjir sungai sedang dihitung", "Sungai besar GloFAS", "", `<p class="kosong">Belum ada titik sungai dengan ambang.</p>`, "Ambang periode ulang diisi bertahap karena kuota data gratis.");
    const W = 940, rh = 28, L = 260, mx = Math.max(1.2, ...T.map(t => t.r)), X = v => L + v / mx * (W - L - 90);
    let g = [[1, "Q2"], [t5 => 1, ""]].length ? `<line x1="${X(1)}" x2="${X(1)}" y1="0" y2="${T.length * rh}" stroke="${WARNA_LV[1]}" stroke-dasharray="4 3"/><text x="${X(1)}" y="${T.length * rh + 14}" text-anchor="middle" font-size="11" style="fill:${WARNA_LV[1]}">banjir 2 tahunan</text>` : "";
    g += T.map((t, i) => `<g data-sg="${S.sungai.titik.indexOf(S.sungai.titik.find(x => x.lat === t.lat && x.lon === t.lon))}" style="cursor:pointer"><text x="${L - 10}" y="${i * rh + 18}" text-anchor="end" font-size="12.5"><tspan font-weight="700">${esc(t.kec)}</tspan><tspan opacity=".6"> ${esc(t.kab)}</tspan></text>
      <rect class="gx" style="--i:${i}" x="${L}" y="${i * rh + 6}" width="${Math.max(2, X(t.r) - L)}" height="${rh - 12}" rx="3" fill="${t.kelas ? WARNA_LV[t.kelas] : "#4f8fc4"}" data-tip="<b>${esc(t.kec)}</b>, ${esc(t.kab)}<br>puncak ${fmt(Math.round(t.puncak))} m³/s · Q2 ${fmt(Math.round(t.q2))}<br>klik untuk hidrograf"/>
      <text x="${X(t.r) + 6}" y="${i * rh + 18}" font-size="12" font-weight="700">${f2(t.r)}×</text></g>`).join("");
    const n = S.sungai.titik.filter(t => t.kelas >= 1).length, nA = S.sungai.titik.filter(t => t.q2).length;
    return this.ex(n ? `${this.hl(fmt(n) + " titik sungai")} diperkirakan melewati debit banjir 2 tahunan dalam 7 hari` : `Belum ada sungai besar yang diperkirakan melewati debit banjir 2 tahunan dalam 7 hari`,
      `Puncak debit 7 hari dibanding ambang banjir 2 tahunan (Q2)`, `rasio puncak ÷ Q2; ${fmt(nA)} dari ${fmt(S.sungai.titik.length)} titik sudah punya ambang`,
      `<svg viewBox="0 0 ${W} ${T.length * rh + 20}" role="img" aria-label="Rasio debit sungai">${g}</svg>`, `Klik baris untuk hidrograf. Sumber: Copernicus GloFAS lewat Open-Meteo; ambang dari maksimum tahunan 1997–2025 (Gumbel).`); },

  /* 4. rob: titik pantai x hari */
  exRob() {
    if (!S.rob) return "";
    const R = S.rob, iH = Math.max(0, R.hari.indexOf(S.hujan.hari_ini)), hr = R.hari.slice(iH, iH + 10), T = R.titik.map((t, i) => ({...t, i, lvs: t.lv.slice(iH, iH + 10)}))
      .filter(t => t.p95 != null).sort((a, b) => Math.max(...b.lvs) - Math.max(...a.lvs) || Math.max(...b.h.slice(iH).map((v, j) => v - b.p95)) - Math.max(...a.h.slice(iH).map((v, j) => v - a.p95))).slice(0, 16);
    const W = 940, L = 230, cw = (W - L) / hr.length, rh = 26, T0 = 22, H = T0 + T.length * rh;
    let g = hr.map((d, j) => `<text x="${L + j * cw + cw / 2}" y="14" text-anchor="middle" font-size="10.5" font-weight="${j ? 400 : 800}">${j ? d.slice(8) + "/" + d.slice(5, 7) : "Hari ini"}</text>`).join("");
    g += T.map((t, i) => `<g data-rob="${t.i}" style="cursor:pointer"><text x="${L - 10}" y="${T0 + i * rh + 17}" text-anchor="end" font-size="12.5"><tspan font-weight="700">${esc(t.kec || t.kab)}</tspan><tspan opacity=".6"> ${esc(t.kab)}</tspan></text>` +
      t.lvs.map((l, j) => { const v = t.h[iH + j], d = v - t.p95; return `<rect x="${L + j * cw + 1.5}" y="${T0 + i * rh + 3}" width="${cw - 3}" height="${rh - 6}" rx="4" style="fill:${l ? WARNA_LV[l] : `color-mix(in oklch, #4f8fc4 ${Math.round(Math.max(8, Math.min(70, 40 + d * 200)))}%, var(--surface))`}" data-tip="<b>${esc(t.kec || t.kab)} · ${hr[j]}</b><br>muka laut maks ${fmt(Math.round(v * 100) / 100)} m (p95 ${fmt(Math.round(t.p95 * 100) / 100)} m)<br>${LEVEL[l || 0]}"/>`; }).join("") + `</g>`).join("");
    const n = R.titik.filter(t => Math.max(...t.lv.slice(iH)) > 0).length, bm = R.bmkg?.rob?.length || 0;
    return this.ex(n ? `${this.hl(fmt(n) + " titik pantai")} diperkirakan berstatus rob dalam 10 hari ke depan` : `Model belum melihat pasang di atas persentil 95 dalam 10 hari; BMKG mengeluarkan ${this.hl(fmt(bm) + " peringatan rob")}`,
      `Pasang tertinggi harian dibanding ambang titik pantai`, `biru makin pekat = makin dekat ambang; kuning/oranye/merah = waspada/siaga/awas`,
      `<div class="tw" style="border:0;box-shadow:none"><svg viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Pasang laut 10 hari">${g}</svg></div>`,
      `Klik titik untuk grafik pasang dan peringatan BMKG. Ambang diuji terhadap kejadian rob DIBI: ${esc(R.validasi?.ringkas || "lihat tab Rob")}. Sumber: Open-Meteo Marine, BMKG Maritim, DIBI BNPB.`); },

  /* 5. tren kejadian nasional */
  exTren() {
    const K = S.kejadian; if (!K) return "";
    const j = this.st.tren, th = K.tahun.map(String).filter(t => K.nasional?.[j]?.[t]?.kejadian != null || Object.values(K.prov).some(p => p[j]?.[t]));
    const v = th.map(t => K.nasional?.[j]?.[t]?.kejadian ?? Object.values(K.prov).reduce((a, p) => a + (p[j]?.[t]?.kejadian || 0), 0));
    const W = 940, B = 230, L = 46, gap = (W - L) / th.length, bw = gap * .7, mx = Math.max(1, ...v), rata = v.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, v.length - 1);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W}" y1="${B - f * 190}" y2="${B - f * 190}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${B - f * 190 + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += v.map((x, i) => { const h = x / mx * 190; return `<rect class="gy" style="--i:${i}" x="${L + i * gap + (gap - bw) / 2}" y="${B - h}" width="${bw}" height="${h}" rx="3" fill="${i === v.length - 1 ? "#5f6fb0" : "#4f8fc4"}" opacity="${i === v.length - 1 ? .6 : .9}" data-tip="<b>${th[i]}</b><br>${fmt(x)} kejadian${i === v.length - 1 ? " (berjalan)" : ""}"/><text x="${L + i * gap + gap / 2}" y="${B + 15}" text-anchor="middle" font-size="10.5" opacity=".7">${th[i].slice(2)}</text>`; }).join("");
    g += `<line x1="${L}" x2="${W}" y1="${B - rata / mx * 190}" y2="${B - rata / mx * 190}" stroke="currentColor" stroke-dasharray="4 3" opacity=".5"/><text x="${W}" y="${B - rata / mx * 190 - 5}" text-anchor="end" font-size="11" opacity=".7">rata-rata ${rb(rata)}</text>`;
    const iMax = v.slice(0, -1).indexOf(Math.max(...v.slice(0, -1))), nm = {banjir: "banjir", longsor: "tanah longsor", rob: "banjir rob", gelombang: "gelombang pasang & abrasi", cuaca: "cuaca ekstrem", kering: "kekeringan"}[j];
    return this.ex(`Kejadian ${nm} terbanyak pada ${this.hl(th[iMax])}: ${this.hl(fmt(v[iMax]))} kejadian, ${fmt(Math.round(v[iMax] / rata * 10) / 10)}× rata-rata`,
      `Kejadian ${nm} tercatat BNPB per tahun, ${th[0]}–${th.at(-1)}`, `jumlah kejadian (satu kejadian per kabupaten per tanggal)`,
      `<svg viewBox="0 0 ${W} ${B + 22}" role="img" aria-label="Kejadian per tahun">${g}</svg>`, `${esc(K.catatan || "")} Sumber: BNPB (data.bnpb.go.id) dan DIBI.`,
      this.seg("tren", [["banjir", "Banjir"], ["longsor", "Longsor"], ["rob", "Rob"], ["cuaca", "Cuaca ekstrem"], ["gelombang", "Gelombang"]])); },

  /* 6. musim: bulan kejadian dari daftar DIBI 3 tahun terakhir, per provinsi */
  exMusim() {
    const K = S.kejadian, E = K?.kejadian_dibi || []; if (!E.length) return "";
    const j = this.st.musim, cocok = e => j === "banjir" ? /banjir/.test(e.jenis) && e.jenis !== "banjir_rob" : j === "longsor" ? /longsor/.test(e.jenis) : e.jenis.includes(j);
    const per = {}; for (const e of E) { if (!cocok(e)) continue; const p = per[e.prov] ||= Array(12).fill(0); p[+e.tanggal.slice(5, 7) - 1]++; }
    const pv = Object.entries(per).map(([k, v]) => ({k, v, n: v.reduce((a, b) => a + b, 0)})).sort((a, b) => b.n - a.n).slice(0, 16);
    if (!pv.length) return "";
    const W = 940, L = 200, cw = (W - L - 70) / 12, rh = 26, T0 = 22, H = T0 + pv.length * rh;
    let g = BLN.map((b, i) => `<text x="${L + i * cw + cw / 2}" y="14" text-anchor="middle" font-size="11" font-weight="${i === new Date().getMonth() ? 800 : 400}">${b}</text>`).join("") + `<text x="${W - 4}" y="14" text-anchor="end" font-size="11" font-weight="700">Total</text>`;
    g += pv.map((x, i) => { const m = Math.max(1, ...x.v); return `<text x="${L - 10}" y="${T0 + i * rh + 17}" text-anchor="end" font-size="12.5" font-weight="600">${esc(namaProv(x.k))}</text>` + x.v.map((n, b) => `<rect x="${L + b * cw + 1.5}" y="${T0 + i * rh + 3}" width="${cw - 3}" height="${rh - 6}" rx="4" style="fill:${n ? `color-mix(in oklch, #3f7fb8 ${Math.round(15 + n / m * 80)}%, var(--surface))` : "var(--surface)"}" data-tip="<b>${esc(namaProv(x.k))} · ${BLN[b]}</b><br>${fmt(n)} kejadian"/>`).join("") + `<text x="${W - 4}" y="${T0 + i * rh + 17}" text-anchor="end" font-size="12" font-weight="700">${fmt(x.n)}</text>`; }).join("");
    const bulan = Array(12).fill(0); pv.forEach(x => x.v.forEach((n, b) => bulan[b] += n)); const pk = bulan.indexOf(Math.max(...bulan));
    const tahun = [...new Set(E.map(e => e.tanggal.slice(0, 4)))].sort();
    return this.ex(`Kejadian ${j === "banjir" ? "banjir" : j === "longsor" ? "longsor" : "rob"} memuncak pada ${this.hl(BLN[pk])}; bulan ini (${BLN[new Date().getMonth()]}) ${this.hl(fmt(Math.round(bulan[new Date().getMonth()] / Math.max(...bulan) * 100)) + "%")} dari puncak`,
      `Kalender kejadian per bulan, ${tahun[0]}–${tahun.at(-1)}`, `makin pekat = makin sering; per provinsi (16 terbanyak)`,
      `<div class="tw" style="border:0;box-shadow:none"><svg viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Kalender kejadian">${g}</svg></div>`,
      `Dari daftar kejadian DIBI BNPB ${tahun[0]}–${tahun.at(-1)}; tiga tahun belum cukup untuk pola jangka panjang. Sumber: DIBI BNPB.`,
      this.seg("musim", [["banjir", "Banjir"], ["longsor", "Longsor"], ["rob", "Rob"]])); },

  /* 7. kabupaten paling sering */
  exKab() {
    const K = S.kejadian; if (!K) return "";
    const j = this.st.kab, T = Object.entries(K.kab || {}).map(([k, v]) => { const y = v[j] || {}, th = Object.keys(y).sort(); return {k, y, th, n: th.reduce((a, t) => a + (y[t] || 0), 0)}; }).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 15);
    if (!T.length) return "";
    const semuaTh = [...new Set(T.flatMap(x => x.th))].sort(), W = 940, L = 260, rh = 28, mx = Math.max(...T.map(x => x.n)), X = v => v / mx * (W - L - 230);
    const g = T.map((x, i) => { const [p, kb] = x.k.split("|"), mm = Math.max(1, ...semuaTh.map(t => x.y[t] || 0));
      return `<g data-kab="${esc(x.k)}" style="cursor:pointer"><text x="${L - 10}" y="${i * rh + 18}" text-anchor="end" font-size="12.5"><tspan font-weight="700">${esc(kb)}</tspan><tspan opacity=".6"> ${esc(this.pendek(p))}</tspan></text>
      <rect class="gx" style="--i:${i}" x="${L}" y="${i * rh + 6}" width="${X(x.n)}" height="${rh - 12}" rx="3" fill="#3f7fb8" data-tip="<b>${esc(kb)}</b><br>${fmt(x.n)} kejadian ${semuaTh[0]}–${semuaTh.at(-1)}<br>klik untuk analisa"/><text x="${L + X(x.n) + 6}" y="${i * rh + 18}" font-size="12" font-weight="700">${fmt(x.n)}</text>` +
      semuaTh.map((t, b) => { const h = (x.y[t] || 0) / mm * (rh - 10); return `<rect x="${W - 200 + b * (190 / semuaTh.length)}" y="${i * rh + rh - 4 - h}" width="${190 / semuaTh.length - 1.5}" height="${Math.max(.5, h)}" fill="#4f8fc4"/>`; }).join("") + `</g>`; }).join("");
    const nm = {banjir: "banjir", longsor: "longsor", rob: "rob"}[j];
    return this.ex(`${esc(T[0].k.split("|")[1])} paling sering dilanda ${nm}: ${this.hl(fmt(T[0].n) + " kejadian")} sejak ${semuaTh[0]}`,
      `15 kabupaten/kota dengan kejadian ${nm} terbanyak`, `jumlah kejadian; kanan = pola per tahun ${semuaTh[0]}–${semuaTh.at(-1)}`,
      `<svg viewBox="0 0 ${W} ${T.length * rh + 6}" role="img" aria-label="Kabupaten paling sering">${g}</svg>`, `Klik baris untuk analisa kabupaten. Sumber: BNPB/DIBI.`,
      this.seg("kab", [["banjir", "Banjir"], ["longsor", "Longsor"], ["rob", "Rob"]])); },

  /* 8. dampak per provinsi (tahun terakhir lengkap) */
  exDampak() {
    const K = S.kejadian; if (!K) return "";
    const f = this.st.dampak, th = ["2025", "2024"].find(t => Object.values(K.prov).some(p => p.banjir?.[t]?.[f] != null)); if (!th) return "";
    const T = Object.entries(K.prov).map(([k, p]) => ({k, b: p.banjir?.[th]?.[f] || 0, l: p.longsor?.[th]?.[f] || 0})).map(x => ({...x, n: x.b + x.l})).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 15);
    const W = 940, L = 200, rh = 28, mx = Math.max(1, ...T.map(x => x.n)), X = v => v / mx * (W - L - 90), tot = T.reduce((a, x) => a + x.n, 0);
    const g = T.map((x, i) => `<text x="${L - 10}" y="${i * rh + 18}" text-anchor="end" font-size="13" font-weight="600">${esc(namaProv(x.k))}</text>
      <rect class="gx" style="--i:${i}" x="${L}" y="${i * rh + 6}" width="${X(x.b)}" height="${rh - 12}" fill="#3f7fb8" data-tip="<b>${esc(namaProv(x.k))}</b><br>banjir: ${fmt(x.b)}"/><rect class="gx" style="--i:${i}" x="${L + X(x.b)}" y="${i * rh + 6}" width="${X(x.l)}" height="${rh - 12}" fill="#9a7448" data-tip="<b>${esc(namaProv(x.k))}</b><br>longsor: ${fmt(x.l)}"/>
      <text x="${L + X(x.n) + 6}" y="${i * rh + 18}" font-size="12" font-weight="700">${rb(x.n)}</text>`).join("");
    const nm = {meninggal: "korban meninggal", terdampak: "warga terdampak", mengungsi: "warga mengungsi", rumah_rusak: "rumah rusak"}[f];
    return this.ex(`${th}: ${this.hl(f === "meninggal" ? fmt(tot) : rb(tot))} ${nm} akibat banjir dan longsor di 15 provinsi teratas; ${esc(namaProv(T[0]?.k))} terbanyak`,
      `Dampak banjir dan longsor per provinsi, ${th}`, `biru = banjir, cokelat = longsor`,
      `<svg viewBox="0 0 ${W} ${T.length * rh + 22}" role="img" aria-label="Dampak per provinsi">${g}</svg>`, `Sumber: rekap kejadian & dampak BNPB ${th}.`,
      this.seg("dampak", [["meninggal", "Meninggal"], ["mengungsi", "Mengungsi"], ["terdampak", "Terdampak"], ["rumah_rusak", "Rumah rusak"]])); },

  gambar(id) { const f = this["ex" + id[0].toUpperCase() + id.slice(1)]; try { return f.call(this); } catch (e) { console.error(e); return ""; } },
  async render() {
    if (!S.kejadian) S.kejadian = await muatJSON("data/kejadian.json").catch(() => null);
    const el = $("#insight");
    el.innerHTML = `<div class="head"><div><h2>Insight banjir, longsor & rob</h2><p>${new Date().toLocaleDateString("id-ID", {...WIB, weekday: "long", day: "numeric", month: "long", year: "numeric"})} · data ${jamWIB(S.meta.dibuat)}</p></div></div>
      ${this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("")}`;
    const ulang = n => { const box = n.closest("[data-ex]"); if (box) nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); };
    el.onclick = e => {
      const s = e.target.closest("[data-set]"); if (s) { this.st[s.dataset.set] = s.dataset.v; return ulang(s); }
      const pv = e.target.closest("[data-prov]"); if (pv) { bukaTab("peta"); return turun(pv.dataset.prov); }
      const sg = e.target.closest("[data-sg]"); if (sg && +sg.dataset.sg >= 0) return Analisa.sungai(+sg.dataset.sg);
      const rb_ = e.target.closest("[data-rob]"); if (rb_) return Rob.titik(+rb_.dataset.rob);
      const kb = e.target.closest("[data-kab]"); if (kb) { const p = kb.dataset.kab.split("|"); S.jalur = [p[0]]; bukaTab("peta"); return Peta.aturWilayah().then(() => Analisa.wilayah(kb.dataset.kab)); } };
  },
};
