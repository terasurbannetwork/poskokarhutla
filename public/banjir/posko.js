"use strict";
/* ================================================================ sungai */
const Sungai = {
  urut: "rasio",
  render() {
    const T = S.sungai.titik.map((t, i) => ({...t, i, r: t.puncak / t.q2})).sort(this.urut === "debit" ? (a, b) => b.puncak - a.puncak : (a, b) => b.r - a.r).slice(0, 120);
    const n = [1, 2, 3].map(l => S.sungai.titik.filter(t => t.kelas === l).length);
    $("#sungaiTab").innerHTML = `<div class="head"><div><h2>Sungai besar · prakiraan debit GloFAS 7 hari</h2><p>${fmt(S.sungai.titik.length)} titik sungai; ${fmt(n[2])} di atas banjir 20 tahunan, ${fmt(n[1])} di atas 5 tahunan, ${fmt(n[0])} di atas 2 tahunan.</p></div>
      <div class="seg" id="sgU"><button data-u="rasio" aria-pressed="${this.urut === "rasio"}">Urut: puncak ÷ Q2</button><button data-u="debit" aria-pressed="${this.urut === "debit"}">Urut: debit</button></div></div>
      <div class="tw"><table><thead><tr><th>Lokasi</th><th>Provinsi</th><th class="n">Puncak 7 hari</th><th class="n">Q2</th><th class="n">Q5</th><th class="n">Q20</th><th class="n">Puncak ÷ Q2</th><th>Status</th></tr></thead><tbody>
      ${T.map(t => `<tr data-i="${t.i}" style="cursor:pointer"><td><b>${esc(t.kec)}</b> · ${esc(t.kab)}</td><td>${esc(namaProv(t.prov))}</td><td class="n num">${fmt(Math.round(t.puncak))} m³/s</td><td class="n num">${fmt(Math.round(t.q2))}</td><td class="n num">${fmt(Math.round(t.q5))}</td><td class="n num">${fmt(Math.round(t.q20))}</td>
        <td class="n num"><b>${fmt(Math.round(t.r * 100) / 100)}×</b></td><td>${pill(t.kelas)}</td></tr>`).join("")}</tbody></table></div>
      <p class="fnd" style="margin-top:8px">Klik baris untuk hidrograf. Ambang dari debit maksimum tiap tahun 1997–2025, distribusi Gumbel. Sumber: Copernicus GloFAS lewat Open-Meteo.</p>`;
    $("#sgU").onclick = e => { const b = e.target.closest("button"); if (b) { this.urut = b.dataset.u; nanti(() => this.render()); } };
    $("#sungaiTab").querySelector("tbody").onclick = e => { const tr = e.target.closest("[data-i]"); if (tr) Analisa.sungai(+tr.dataset.i); }; },
};

/* ================================================================ daftar wilayah siaga (setara daftar kompleks api) */
const unduh = (nama, isi) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([isi], {type: "text/csv"})); a.download = nama; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const csv = rows => rows.map(r => r.map(v => { const s = String(v ?? ""); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");
const Daftar = {
  q: "", urut: "lv", hal: 0,
  baris() { const q = this.q.toLowerCase();
    return Object.entries(S.st.kec).map(([k, v]) => { const [p, kb, kc] = k.split("|"), b = v.b || [0], l = v.l || [0];
      return {k, p, kb, kc, b, l, mb: Math.max(...b), ml: Math.max(...l), h3: v.h3, a7: v.a7, bh: S.bahaya[k]?.banjir}; })
      .filter(r => (r.mb || r.ml) && (!q || (r.kc + " " + r.kb + " " + namaProv(r.p)).toLowerCase().includes(q)))
      .sort(this.urut === "h3" ? (a, b) => (b.h3 || 0) - (a.h3 || 0) : (a, b) => Math.max(b.mb, b.ml) - Math.max(a.mb, a.ml) || b.mb - a.mb || (b.h3 || 0) - (a.h3 || 0)); },
  render() {
    const R = this.baris(), per = 60, jml = Math.ceil(R.length / per), hal = R.slice(this.hal * per, (this.hal + 1) * per);
    $("#daftar").innerHTML = `<div class="head"><div><h2>Wilayah siaga · ${fmt(R.length)} kecamatan</h2><p>Kecamatan berstatus Waspada ke atas dalam 4 hari, diurutkan dari yang paling mendesak.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input class="btn sec" id="dfQ" placeholder="Cari kecamatan atau kabupaten" value="${esc(this.q)}" style="min-width:220px">
      <div class="seg" id="dfU"><button data-u="lv" aria-pressed="${this.urut === "lv"}">Urut: status</button><button data-u="h3" aria-pressed="${this.urut === "h3"}">Urut: hujan</button></div>
      <button class="btn sec" id="dfCsv">Unduh CSV</button>${jml > 1 ? `<span class="num" style="font-size:12px">${this.hal + 1}/${jml}</span>${this.hal ? `<button class="btn sec" data-h="${this.hal - 1}">‹</button>` : ""}${this.hal < jml - 1 ? `<button class="btn sec" data-h="${this.hal + 1}">›</button>` : ""}` : ""}</div></div>
      <div class="tw"><table><thead><tr><th>Kecamatan</th><th>Kab/Kota</th><th>Provinsi</th>${S.st.hari.map((t, h) => `<th>${h ? tglPendek(t) : "Hari ini"}</th>`).join("")}<th>Longsor</th><th class="n">Hujan 3h</th><th class="n">Hujan 7h lalu</th><th class="n">Bahaya InaRISK</th></tr></thead><tbody>
      ${hal.map(r => `<tr data-k="${esc(r.k)}" style="cursor:pointer"><td><b>${esc(r.kc)}</b></td><td>${esc(r.kb)}</td><td>${esc(namaProv(r.p))}</td>${r.b.map(l => `<td>${l ? pill(l) : `<span style="color:var(--ink2);font-size:11.5px">–</span>`}</td>`).join("")}
        <td>${r.ml ? pill(r.ml) : "–"}</td><td class="n num">${r.h3 != null ? fmt(Math.round(r.h3)) + " mm" : "–"}</td><td class="n num">${r.a7 != null ? fmt(Math.round(r.a7)) + " mm" : "–"}</td><td class="n num">${r.bh != null ? fmt(Math.round(r.bh * 100) / 100) : "–"}</td></tr>`).join("") || `<tr><td colspan="11" class="kosong">Tidak ada kecamatan berstatus.</td></tr>`}</tbody></table></div>`;
    $("#dfQ").oninput = e => { this.q = e.target.value; this.hal = 0; clearTimeout(this._t); this._t = setTimeout(() => { this.render(); $("#dfQ").focus(); $("#dfQ").setSelectionRange(this.q.length, this.q.length); }, 250); };
    $("#dfU").onclick = e => { const b = e.target.closest("button"); if (b) { this.urut = b.dataset.u; nanti(() => this.render()); } };
    $("#dfCsv").onclick = () => unduh("wilayah-siaga-banjir.csv", csv([["Provinsi", "Kab/Kota", "Kecamatan", ...S.st.hari.map(t => "Banjir " + t), "Longsor maks", "Hujan 3 hari (mm)", "Hujan 7 hari lalu (mm)", "Bahaya InaRISK"], ...R.map(r => [namaProv(r.p), r.kb, r.kc, ...r.b.map(l => LEVEL[l]), LEVEL[r.ml], r.h3, r.a7, r.bh])]));
    $("#daftar").querySelectorAll("[data-h]").forEach(b => b.onclick = () => { this.hal = +b.dataset.h; nanti(() => this.render()); });
    $("#daftar").querySelector("tbody").onclick = e => { const tr = e.target.closest("[data-k]"); if (!tr) return; const p = tr.dataset.k.split("|"); S.jalur = p.slice(0, 2); bukaTab("peta"); Peta.aturWilayah().then(() => Analisa.wilayah(tr.dataset.k)); }; },
};

/* ================================================================ provinsi (setara Prioritas karhutla) */
/* rekomendasi otomatis per provinsi; tiap butir punya tingkat (3 segera … 0 info) dan dasar datanya */
function rekomendasiBanjir(k, d) {
  const R = [], tambah = (lv, teks, dasar) => R.push({lv, teks, dasar}), daftar = a => a.slice(0, 3).map(x => `<b>${esc(x.split("|")[2])}</b> (${esc(x.split("|")[1])})`).join(", ");
  if (d.awas.length) tambah(3, `Evakuasi warga bantaran dan dataran banjir di ${fmt(d.awas.length)} kecamatan awas banjir, mulai ${daftar(d.awas)}; aktifkan posko komando kabupaten`, "status awas: sungai di atas banjir 20 tahunan, atau hujan 3 hari ≥ 150 mm di wilayah bahaya tinggi");
  if (d.siaga.length) tambah(2, `Siagakan tim evakuasi, perahu, dan pompa di ${fmt(d.siaga.length)} kecamatan siaga banjir, mulai ${daftar(d.siaga)}`, "status siaga 4 hari ke depan");
  if (d.longsor.length) tambah(2, `Periksa lereng dan tutup ruas jalan rawan di ${fmt(d.longsor.length)} kecamatan siaga longsor, mulai ${daftar(d.longsor)}`, "hujan lebat di atas tanah jenuh pada wilayah bahaya longsor tinggi");
  if (d.sungai.length) tambah(2, `Pantau tinggi muka air di ${fmt(d.sungai.length)} titik sungai yang diperkirakan melewati debit banjir 2 tahunan: ${d.sungai.slice(0, 3).map(t => `<b>${esc(t.kec)}</b>`).join(", ")}`, "prakiraan debit GloFAS 7 hari dibanding ambang periode ulang");
  if (d.h3 >= 100) tambah(2, `Hujan sangat lebat ${fmt(Math.round(d.h3))} mm dalam 3 hari di sebagian wilayah: bersihkan saluran dan siapkan jalur evakuasi`, "sel hujan 0,25° terbasah di provinsi ini");
  else if (d.h3 >= 50) tambah(1, `Hujan lebat hingga ${fmt(Math.round(d.h3))} mm dalam 3 hari: periksa drainase dan pintu air`, "sel hujan 0,25° terbasah di provinsi ini");
  if (d.bmkg.length) tambah(2, `BMKG memperingatkan rob di ${fmt(d.bmkg.length)} lokasi pesisir (${esc(d.bmkg.slice(0, 2).map(w => w.lokasi || w.wilayah).join("; "))}): siapkan pompa dan karung pasir di tanggul rendah`, "peringatan dini rob BMKG Maritim");
  if (d.rob) tambah(1, `${fmt(d.rob)} titik pantai diperkirakan melewati ambang pasang dalam 10 hari: informasikan jam pasang tertinggi ke warga pesisir`, "prakiraan muka laut Open-Meteo Marine dibanding persentil 95/99");
  if (d.kabLanggan.length) tambah(1, `Pra-posisikan logistik pengungsi di kabupaten paling sering banjir: ${d.kabLanggan.slice(0, 3).map(x => `<b>${esc(x.kab)}</b> (${fmt(x.n)})`).join(", ")}`, "jumlah kejadian banjir tercatat BNPB/DIBI");
  if (d.bulanPersen != null) tambah(0, `Bulan ini ${fmt(d.bulanPersen)}% dari bulan puncak kejadian banjir (${BLN[d.bulanPuncak]}) di provinsi ini`, "kalender kejadian DIBI 3 tahun terakhir");
  if (d.posko) tambah(0, `${fmt(d.posko)} posko permanen pra-musim direkomendasikan di provinsi ini`, "tab Posko");
  return R.sort((a, b) => b.lv - a.lv); }
const Provinsi = {
  urut: "status",
  render() {
    const K = S.kejadian, ag = S.st.hari.map((_, h) => agregat("b", h)), agL = agregat("l", 0), bulanIni = new Date().getMonth(), warnaRek = ["#4f8fc4", "#e3b94e", "#e58a45", "#c9503a"];
    const lipat = (j, isi, buka = true) => `<details class="lipat" ${buka ? "open" : ""}><summary>${j}</summary><div class="isi">${isi}</div></details>`;
    const iH = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
    const pv = Object.keys(S.meta.provinsi).map(k => {
      const kecK = Object.entries(S.st.kec).filter(([kk]) => kk.startsWith(k + "|"));
      const awas = kecK.filter(([, v]) => Math.max(...(v.b || [0])) === 3).map(([kk]) => kk), siaga = kecK.filter(([, v]) => Math.max(...(v.b || [0])) === 2).map(([kk]) => kk), longsor = kecK.filter(([, v]) => Math.max(...(v.l || [0])) >= 2).map(([kk]) => kk);
      const sel = S.hujan.grid.filter(g => g.prov === k), sg = S.sungai.titik.filter(t => t.prov === k && t.kelas >= 1), rob = S.rob?.titik.filter(t => t.prov === k && Math.max(...t.lv.slice(iH)) > 0).length || 0;
      const bmkg = (S.rob?.bmkg?.rob || []).filter(w => (w.kp || w.prov) === k || (w.provinsi || "").toLowerCase().includes(namaProv(k).toLowerCase()));
      const kabLanggan = Object.entries(K?.kab || {}).filter(([kk]) => kk.startsWith(k + "|")).map(([kk, v]) => ({kab: kk.split("|")[1], n: Object.values(v.banjir || {}).reduce((a, b) => a + b, 0)})).filter(x => x.n).sort((a, b) => b.n - a.n);
      const bln = Array(12).fill(0); (K?.kejadian_dibi || []).forEach(e => { if (e.prov === k && /banjir/.test(e.jenis) && e.jenis !== "banjir_rob") bln[+e.tanggal.slice(5, 7) - 1]++; });
      const pk = Math.max(...bln), ev = K?.prov?.[k] || {}, thB = Object.keys(ev.banjir || {}).sort(), thS = Object.keys(ev.semua || {}).sort();
      const d = {awas, siaga, longsor, sungai: sg, h3: Math.max(0, ...sel.map(g => g.h3 || 0)), rob, bmkg, kabLanggan, bulanPersen: pk ? Math.round(bln[bulanIni] / pk * 100) : null, bulanPuncak: bln.indexOf(pk), posko: (S.posko?.permanen || []).filter(x => x.prov === k).length};
      return {k, d, lv: ag.map(a => a[k]?.lv || 0), n: ag[0][k]?.n || [0, 0, 0, 0], l: agL[k]?.n || [0, 0, 0, 0], ev, thB, thS, bln, rek: rekomendasiBanjir(k, d),
        skor: Math.max(...ag.map(a => a[k]?.lv || 0)) * 1e6 + awas.length * 1e3 + siaga.length + longsor.length * .5 + (bmkg.length ? 1 : 0)}; });
    pv.sort(this.urut === "riwayat" ? (a, b) => (b.d.kabLanggan.reduce((s, x) => s + x.n, 0)) - (a.d.kabLanggan.reduce((s, x) => s + x.n, 0)) : (a, b) => b.skor - a.skor || b.d.h3 - a.d.h3);
    const kartu = pv.map(r => { const v = r.thS.map(t => r.ev.semua?.[t]?.kejadian ?? 0), m = Math.max(1, ...v), lb = r.thB.at(-1) ? r.ev.banjir[r.thB.at(-1)] : null, mb = Math.max(1, ...r.bln);
      return `<article class="card pad" style="display:grid;gap:10px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="display:flex;gap:10px;align-items:center">${lambang(r.k)}<div><h3 style="font-size:16px">${esc(namaProv(r.k))}</h3>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${r.lv.map((l, h) => `<span title="${S.st.hari[h]}">${l ? pill(l) : `<span class="pill" style="background:var(--surface);color:var(--ink2)">Normal</span>`}</span>`).join("")}</div></div></div></div>
        <div class="kv"><div><b style="color:${WARNA_LV[3]}">${fmt(r.d.awas.length)}</b><span>kec. awas banjir</span></div><div><b style="color:${WARNA_LV[2]}">${fmt(r.d.siaga.length)}</b><span>kec. siaga banjir</span></div><div><b>${fmt(r.d.longsor.length)}</b><span>kec. siaga+ longsor</span></div></div>
        ${lipat(`Rekomendasi · ${r.rek.length} langkah`, `<ol class="rek">${r.rek.map(x => `<li style="--w:${warnaRek[x.lv]}"><span>${x.teks}</span><small>Dasar: ${esc(x.dasar)}</small></li>`).join("") || `<li style="--w:${warnaRek[0]}"><span>Kesiapsiagaan rutin; belum ada kecamatan siaga.</span></li>`}</ol>`)}
        ${lipat("Situasi 4 hari", `<table class="tb2"><tbody><tr><td>Kecamatan waspada banjir hari ini</td><td class="n">${fmt(r.n[1])}</td></tr><tr><td>Hujan 3 hari terlebat</td><td class="n">${fmt(Math.round(r.d.h3))} mm</td></tr>
          <tr><td>Sungai di atas banjir 2 tahunan</td><td class="n">${fmt(r.d.sungai.length)}</td></tr>${S.rob ? `<tr><td>Titik pantai berstatus rob (10 hari)</td><td class="n">${fmt(r.d.rob)}</td></tr><tr><td>Peringatan rob BMKG</td><td class="n">${fmt(r.d.bmkg.length)}</td></tr>` : ""}</tbody></table>`, false)}
        ${lipat("Riwayat & musim", `${lb ? `<table class="tb2"><tbody><tr><td>Banjir ${r.thB.at(-1)}</td><td class="n">${fmt(lb.kejadian ?? lb)} kejadian${lb.meninggal != null ? " · " + fmt(lb.meninggal) + " meninggal" : ""}</td></tr>${lb.mengungsi != null ? `<tr><td>Mengungsi</td><td class="n">${fmt(lb.mengungsi)}</td></tr>` : ""}</tbody></table>` : ""}
          ${v.length ? `<div class="lbl">Semua bencana tercatat ${r.thS[0]}–${r.thS.at(-1)}</div><svg viewBox="0 0 ${v.length * 10} 30" width="100%" height="34" preserveAspectRatio="none" aria-hidden="true">${v.map((x, j) => `<rect x="${j * 10 + 1}" y="${30 - x / m * 28}" width="8" height="${Math.max(.5, x / m * 28)}" fill="#3f7fb8" data-tip="${r.thS[j]}: ${fmt(x)} kejadian"/>`).join("")}</svg>` : ""}
          <div class="lbl">Kejadian banjir per bulan (DIBI 3 tahun)</div><svg viewBox="0 0 360 26" width="100%" aria-hidden="true">${r.bln.map((n, b) => `<rect x="${b * 30 + 1}" y="0" width="28" height="16" rx="3" style="fill:${n ? `color-mix(in oklch, #3f7fb8 ${Math.round(15 + n / mb * 80)}%, var(--surface))` : "var(--surface)"}" ${b === bulanIni ? 'stroke="currentColor" stroke-width="1.5"' : ""} data-tip="${BLN[b]}: ${fmt(n)} kejadian"/><text x="${b * 30 + 15}" y="25" text-anchor="middle" font-size="7.5" opacity=".6">${BLN[b]}</text>`).join("")}</svg>
          ${r.d.kabLanggan.length ? `<p class="fnd">Kabupaten paling sering banjir: ${r.d.kabLanggan.slice(0, 3).map(x => `${esc(x.kab)} (${fmt(x.n)})`).join(", ")}.</p>` : ""}`, false)}
        <button class="btn sec" data-k="${r.k}">Lihat di peta</button></article>`; }).join("");
    $("#provinsiTab").innerHTML = `<div class="head"><div><h2>38 provinsi</h2><p>Status, rekomendasi, dan riwayat banjir, longsor, dan rob tiap provinsi.</p></div>
      <div class="seg" id="pvU"><button data-u="status" aria-pressed="${this.urut === "status"}">Urut: status</button><button data-u="riwayat" aria-pressed="${this.urut === "riwayat"}">Urut: riwayat</button></div></div><div class="grid g3">${kartu}</div>`;
    $("#pvU").onclick = e => { const b = e.target.closest("button"); if (b) { this.urut = b.dataset.u; nanti(() => this.render()); } };
    $("#provinsiTab").onclick = e => { const b = e.target.closest("button[data-k]"); if (b) { bukaTab("peta"); turun(b.dataset.k); } }; },
};

/* ================================================================ rob */
/* grafik pasang: tinggi muka laut maksimum harian vs ambang p95 / p99 / maks titik itu */
function grafikPasang(t) {
  const hr = S.rob.hari, W = 660, B = 140, lo = Math.min(...t.h.filter(v => v != null), t.p95) - .1, hi = Math.max(...t.h.filter(v => v != null), t.amax) + .05, Y = v => B - (v - lo) / (hi - lo) * 120, X = j => j / (hr.length - 1) * (W - 40) + 20;
  const iH = hr.indexOf(S.hujan.hari_ini);
  let g = [[t.p95, 1, "persentil 95"], [t.p99, 2, "persentil 99"], [t.amax, 3, "tertinggi tercatat"]].map(([v, l, n]) => `<line x1="20" x2="${W - 20}" y1="${Y(v)}" y2="${Y(v)}" stroke="${WARNA_LV[l]}" stroke-dasharray="5 3"/><text x="${W - 20}" y="${Y(v) - 4}" text-anchor="end" font-size="10" style="fill:${WARNA_LV[l]}">${n} · ${fmt(Math.round(v * 100) / 100)} m</text>`).join("");
  g += `<path d="${t.h.map((v, j) => (j ? "L" : "M") + X(j) + "," + Y(v ?? lo)).join("")}" fill="none" stroke="#2b8c86" stroke-width="2.5"/>`;
  g += t.h.map((v, j) => `<circle cx="${X(j)}" cy="${Y(v ?? lo)}" r="${j === iH ? 5 : 3.5}" fill="${t.lv[j] ? WARNA_LV[t.lv[j]] : "#2b8c86"}" data-tip="<b>${tglPendek(hr[j])}</b>${j < iH ? " · lalu" : ""}<br>muka laut maks ${fmt(Math.round(v * 100) / 100)} m${t.w?.[j] != null ? `<br>gelombang maks ${fmt(Math.round(t.w[j] * 10) / 10)} m` : ""}<br>${LEVEL[t.lv[j] || 0]}"/><text x="${X(j)}" y="${B + 14}" text-anchor="middle" font-size="10" opacity="${j === iH ? 1 : .6}" font-weight="${j === iH ? 800 : 400}">${j === iH ? "Hari ini" : hr[j].slice(8) + "/" + hr[j].slice(5, 7)}</text>`).join("");
  return `<svg viewBox="0 -8 ${W} ${B + 22}" width="100%" role="img" aria-label="Pasang laut harian">${g}</svg>`; }
const Rob = {
  /* peringatan resmi BMKG yang menyebut kabupaten/kecamatan titik ini */
  bmkg(t) { const kunci = [t.kab, t.kec].filter(Boolean).map(x => x.toLowerCase().replace(/^kota /, ""));
    return (S.rob.bmkg?.rob || []).filter(w => kunci.some(k => (w.lokasi || w.wilayah || "").toLowerCase().includes(k))); },
  titik(i) {
    const t = S.rob.titik[i]; if (!t) return; const iH = S.rob.hari.indexOf(S.hujan.hari_ini), maju = t.lv.slice(Math.max(0, iH)), puncak = Math.max(0, ...maju);
    const jP = iH + maju.indexOf(puncak), bm = this.bmkg(t), kt = S.rob.kab_tahun?.[t.prov + "|" + t.kab];
    const isi = `<div class="grid g4">${kot("Status puncak", `<span style="color:${puncak ? WARNA_LV[puncak] : "inherit"}">${LEVEL[puncak]}</span>`, puncak ? tglPendek(S.rob.hari[jP]) : "10 hari ke depan")}${kot("Muka laut maks", fmt(Math.round(Math.max(...t.h.slice(iH).filter(v => v != null)) * 100) / 100) + " m", "10 hari, terhadap MSL")}${kot("Ambang siaga", fmt(Math.round(t.p99 * 100) / 100) + " m", "persentil 99 sejak 2022")}${kot("Peringatan BMKG", bm.length ? `<span style="color:var(--bad)">${bm.length}</span>` : "–", bm.length ? "menyebut wilayah ini" : "tidak menyebut")}</div>
      ${lipat("Pasang 13 hari · 3 lalu + 10 prakiraan", `${grafikPasang(t)}<p class="fnd">Muka laut maksimum harian dari Open-Meteo Marine (pasang + efek tekanan udara), terhadap muka laut rata-rata global. Ambang dihitung dari arsip titik ini sejak 2022.</p>`)}
      ${bm.length ? lipat("Peringatan dini rob BMKG", `<table class="tb3"><thead><tr><th>Lokasi</th><th>Periode</th><th>Keterangan</th></tr></thead><tbody>${bm.map(w => `<tr><td>${esc(w.lokasi || w.wilayah)}</td><td>${esc(w.tanggal_mulai || "")}${w.tanggal_selesai ? " – " + esc(w.tanggal_selesai) : ""}</td><td>${esc(w.keterangan || "")}</td></tr>`).join("")}</tbody></table><p class="fnd">Sumber resmi: BMKG Maritim (${esc(S.rob.bmkg?.sumber || "")}).</p>`) : ""}
      ${t.ioc ? lipat("Alat ukur pasut terdekat (IOC)", `<table class="tb2"><tbody><tr><td>Stasiun</td><td class="n">${esc(t.ioc.stasiun)}</td></tr><tr><td>Selisih model – alat ukur</td><td class="n">${fmt(Math.round(t.ioc.offset * 100) / 100)} m</td></tr><tr><td>Korelasi pola pasang</td><td class="n">${fmt(Math.round(t.ioc.r * 100) / 100)}</td></tr><tr><td>Data terakhir</td><td class="n">${t.ioc.lag_jam != null ? fmt(Math.round(t.ioc.lag_jam)) + " jam lalu" : "–"}</td></tr></tbody></table>`, false) : ""}
      ${kt ? lipat("Kejadian rob tercatat (DIBI BNPB)", `<table class="tb2"><tbody>${Object.entries(kt).sort().map(([th, n]) => `<tr><td>${th}</td><td class="n">${fmt(n)} kejadian</td></tr>`).join("")}</tbody></table>`, false) : ""}
      ${lipat("Tindakan yang disarankan", `<ul style="margin:0;padding-left:18px;font-size:12.5px">${[["Pantau jadwal pasang tertinggi harian"], ["Siapkan pompa dan karung pasir di titik tanggul rendah", "Informasikan jam pasang tertinggi ke warga pesisir"], ["Siagakan pompa dan tim di tanggul dan pintu air", "Pindahkan barang berharga dan ternak ke tempat tinggi", "Atur lalu lintas di jalan pantai yang rawan tergenang"], ["Evakuasi kelompok rentan di permukiman pesisir terendah", "Tutup jalan pantai yang tergenang", "Koordinasi BPBD, PUPR, dan pengelola pelabuhan"]][puncak].map(a => `<li>${esc(a)}</li>`).join("")}</ul>`)}
      <p class="fnd">Koordinat titik ${t.lat.toLocaleString("id-ID", {minimumFractionDigits: 3, maximumFractionDigits: 3})}, ${t.lon.toLocaleString("id-ID", {minimumFractionDigits: 3, maximumFractionDigits: 3})}. Ketinggian adalah muka laut, bukan tinggi genangan di darat; dampak di darat bergantung pada tanggul dan penurunan tanah setempat.</p>`;
    Analisa.buka(isi, `${lambang(t.prov, t.kab)}<div><h3 id="dlgJudul">Pantai ${esc(t.kec || t.kab)}</h3><p>${esc(t.kab)} · ${esc(namaProv(t.prov))}</p></div>`); },
  render() {
    const el = $("#robTab"); if (!S.rob) { el.innerHTML = `<div class="kosong">Data rob belum tersedia.</div>`; return; }
    const iH = S.rob.hari.indexOf(S.hujan.hari_ini), T = S.rob.titik.map((t, i) => ({...t, i, pk: Math.max(0, ...t.lv.slice(Math.max(0, iH))), hm: Math.max(...t.h.slice(Math.max(0, iH)).filter(v => v != null))}))
      .sort((a, b) => b.pk - a.pk || (b.hm - b.p99) - (a.hm - a.p99));
    const n = [1, 2, 3].map(l => T.filter(t => t.pk === l).length), V = S.rob.validasi || {}, bm = S.rob.bmkg?.rob || [];
    el.innerHTML = `<div class="head"><div><h2>Banjir rob · prakiraan pasang 10 hari</h2><p>${fmt(T.length)} titik pantai; ${fmt(n[2])} awas, ${fmt(n[1])} siaga, ${fmt(n[0])} waspada dalam 10 hari ke depan.</p></div></div>
      ${bm.length ? `<article class="ex"><h3>Peringatan dini rob resmi BMKG: <span class="hl">${fmt(bm.length)} wilayah</span></h3><p class="sub">Dibaca otomatis dari dokumen BMKG Maritim</p><p class="unit">diambil ${S.rob.bmkg.diambil ? jamWIB(S.rob.bmkg.diambil) : "–"}</p>
        <div class="tw" style="border:0;box-shadow:none"><table><thead><tr><th>Lokasi</th><th>Periode</th><th>Keterangan</th></tr></thead><tbody>${bm.map(w => `<tr><td>${esc(w.lokasi || w.wilayah)}</td><td>${esc(w.tanggal_mulai || "")}${w.tanggal_selesai ? " – " + esc(w.tanggal_selesai) : ""}</td><td>${esc(w.keterangan || "")}</td></tr>`).join("")}</tbody></table></div>
        <p class="fn">Pembacaan dokumen bisa meleset bila format BMKG berubah; dokumen asli: <a href="${escUrl(S.rob.bmkg.sumber)}" target="_blank" rel="noopener">${esc(S.rob.bmkg.sumber)}</a>.</p></article>` : ""}
      <div class="tw"><table><thead><tr><th>Titik pantai</th><th>Provinsi</th>${S.rob.hari.slice(Math.max(0, iH), Math.max(0, iH) + 7).map((d, j) => `<th class="n">${j ? tglPendek(d) : "Hari ini"}</th>`).join("")}<th class="n">Maks 10 hari</th><th class="n">Ambang p99</th></tr></thead><tbody>
      ${T.map(t => `<tr data-i="${t.i}" style="cursor:pointer"><td><b>${esc(t.kec || t.kab)}</b><small style="display:block;color:var(--ink2)">${esc(t.kab)}</small></td><td>${esc(namaProv(t.prov))}</td>
        ${t.lv.slice(Math.max(0, iH), Math.max(0, iH) + 7).map(l => `<td class="n">${l ? pill(l) : `<span style="color:var(--ink2);font-size:11.5px">–</span>`}</td>`).join("")}<td class="n num"><b>${fmt(Math.round(t.hm * 100) / 100)} m</b></td><td class="n num">${fmt(Math.round(t.p99 * 100) / 100)} m</td></tr>`).join("")}</tbody></table></div>
      ${V.ringkas ? `<p class="fnd" style="margin-top:8px">Uji terhadap kejadian rob DIBI: ${esc(V.ringkas)}</p>` : ""}
      <p class="fnd">Klik baris untuk grafik pasang. Sumber: Open-Meteo Marine (CC BY 4.0), IOC Sea Level Monitoring, BMKG Maritim, DIBI BNPB.</p>`;
    el.querySelectorAll("[data-i]").forEach(tr => tr.onclick = () => this.titik(+tr.dataset.i)); },
};

/* ================================================================ posko & sarana banjir (setara tab Posko dan Sarana karhutla)
   Data: data/posko.json (scripts/banjir/posko.py), data/param_banjir.json (scripts/banjir/RISET-PARAMETER.md).
   Pola sama dengan karhutla: HARGA, UH, ASUMSI, SEWA, hargaGrup, grupTingkat, anggaran, Posko, Sarana. */
const KELOK_B = 1.4, LAJU_B = 40; /* sama dengan karhutla (KELOK, LAJU_DARAT) dan posko.py */
/* pembantu yang mungkin sudah dipasang modul lain (Keputusan memakai rp/rpc yang sama): pasang hanya bila belum ada */
if (typeof rp === "undefined") window.rp = v => v < 0 ? "−" + rp(-v) : "Rp" + (v >= 1e12 ? fmt(Math.round(v / 1e11) / 10) + " T" : v >= 1e9 ? fmt(Math.round(v / 1e8) / 10) + " M" : v >= 1e6 ? fmt(Math.round(v / 1e5) / 10) + " jt" : fmt(Math.round(v)));
/* sel tabel: "Rp" rata kiri, angka rata kanan */
if (typeof rpc === "undefined") window.rpc = v => `<span class="rp"><i>${v < 0 ? "−Rp" : "Rp"}</i><span>${rp(Math.abs(v)).slice(2)}</span></span>`;
if (typeof jamDarat === "undefined") window.jamDarat = km_ => km_ * KELOK_B / LAJU_B;
if (typeof fmtJam === "undefined") window.fmtJam = j => j < 1 ? Math.round(j * 60) + " menit" : (Math.round(j * 2) / 2).toString().replace(".", ",") + " jam";
let HARGA = {}, UH = {};
const UH_CADANGAN = 430e3; /* median SBM 2026 provinsi yang tercantum; dipakai bila provinsi belum ada di uh_sbm2026 */
/* kendaraan & alat berat disewa/dipinjam: masuk biaya operasional, bukan belanja alat */
const SEWA = new Set(["Mobil double cabin 4x4", "Truk angkut", "Mobil tangki air", "Ekskavator (sewa)"]);
const LOGISTIK = s => /\/hari$/.test(s) || s === "m2"; /* kebutuhan harian/ruang: dihitung di logistik pengungsi */
/* Asumsi anggaran (bisa diubah di tab Posko). Nilai bawaan diisi dari param_banjir.json (angka tengah) saat dimuat. */
const ASUMSI_BAWAAN = {hari: 14, hariSiaga: 90, adaAlat: 0, alat: true, orangRegu: 10, porsiBKO: .4, honorRelawan: 100e3, konsumsi: 150e3, uhDalam: 170e3,
  jamPerahu: 6, lPerahu: 15, bbm: 10e3, solar: 6800, jamPompa: 6, lPompa: 1.2, jamGenset: 12, lGenset: 1.5, sewaMobil: 1.5e6, mobilLap: 1, mobilKab: 3, mobilProv: 2,
  starlink: 1.639e6, jamExc: 8, sewaExc: 600e3, faktorUngsi: 1, minUngsi: 100, hariUngsi: 7, biayaUngsi: 35e3, dapurPer100: 2,
  heliUnit: 1, heliJamHari: 4, heliJam: 150e6, hariDarurat: 14};
const ASUMSI_PARAM = {konsumsi: "konsumsi_petugas", uhDalam: "uh_dalam_kota", jamPerahu: "jam_perahu_hari", lPerahu: "l_mesin_tempel_jam", bbm: "bbm_pertalite", solar: "bbm_solar",
  lPompa: "l_pompa_alkon_jam", sewaMobil: "sewa_mobil_hari", starlink: "starlink_bulan", sewaExc: "sewa_excavator_jam", hariUngsi: "hari_mengungsi", biayaUngsi: "biaya_pengungsi_hari"};
const ASUMSI = {...ASUMSI_BAWAAN, ...bacaLokal("pb-asumsi", {})};
/* jumlah orang per peran pos komando (Perka 3/2016 tidak menetapkan jumlah; R = rekomendasi platform) */
const ORANG_PERAN = {kabupaten: [1, 1, 2, 1, 1, 2, 3, 2, 2, 1], provinsi: [1, 1, 3, 2, 1, 3, 4, 2, 3, 2]};

/* pengungsi per kejadian: median per tahun (mengungsi ÷ kejadian) di provinsi itu untuk jenisnya, hanya tahun yang mencatat pengungsi;
   median dipakai supaya satu kejadian besar (mis. Jabodetabek 2020) tidak menarik semua posko */
function ungsiPerKejadian(prov, jenis) {
  const K = S.kejadian; if (!K) return null;
  const med = y => { const r = Object.values(y || {}).filter(v => v && v.kejadian && v.mengungsi > 0).map(v => v.mengungsi / v.kejadian).sort((a, b) => a - b);
    return r.length ? r[Math.floor((r.length - 1) / 2)] : null; };
  return med(K.prov?.[prov]?.[jenis]) ?? med(K.nasional?.[jenis]) ?? med(K.nasional?.banjir); }
const aktifPosko = x => x.jenis !== "permanen" || x.nlv[2] + x.nlv[3] > 0;
function ungsiPosko(x) { if (x.tingkat !== 2) return 0;
  const pk = ungsiPerKejadian(x.prov, x.bahaya) || 0, n = Math.max(1, x.nlv[2] + x.nlv[3]);
  return Math.max(ASUMSI.minUngsi, Math.round(pk * n * ASUMSI.faktorUngsi / 10) * 10); }
/* regu SAR per posko lapangan: awas 1, siaga ½, waspada ¼ per kecamatan dilayani, rob ≥ siaga +1; 1–6 regu */
function reguPosko(x) { if (!aktifPosko(x)) return 1;
  return Math.max(1, Math.min(6, Math.ceil(x.nlv[3] + x.nlv[2] / 2 + x.nlv[1] / 4 + (x.r >= 2 ? 1 : 0)))); }
const lvPosko = x => x.tingkat === 2 ? Math.max(x.b, x.l, x.r) : Math.max(0, ...Posko.anak(x).map(lvPosko));
/* daftar sarana satu tingkat: [kelompok, [[nama, satuan, minimal, sumber, kali]]]; kali "r" = per regu, "u" = per 100 pengungsi, 0 = per posko */
function grupTingkat(t, o = {}) { const P = S.param?.sarana || {}, kali = g => t !== "lapangan" ? 0 : /^Evakuasi air/.test(g) ? "r" : /^Pengungsian/.test(g) ? "u" : 0;
  const ambil = (k, f) => (P[k] || []).map(([g, it]) => [g, it.map(x => [...x, f(g)])]);
  return [...ambil(t, kali), ...(o.rob ? ambil("rob", () => 0) : []), ...(o.longsor ? ambil("longsor", () => 0) : [])]; }
const jumlahItem = (m, kali, regu, ungsi) => kali === "r" ? m * regu : kali === "u" ? Math.ceil(m * ungsi / 100) : m;
const opsiBahaya = x => ({rob: x.tingkat === 2 && (x.bahaya === "rob" || x.r > 0), longsor: x.tingkat === 2 && (x.bahaya === "longsor" || x.l >= 2)});
/* alat sekali beli: kendaraan disewa (operasional), logistik harian tidak dibeli; dikurangi porsi alat yang sudah ada */
function hargaGrup(grup, regu, ungsi) { let t = 0, est = 0; const kurang = [];
  for (const [, it] of grup) for (const [n, s, m, , kali] of it) { if (SEWA.has(n) || LOGISTIK(s) || !m) continue; const h = HARGA[n], q = jumlahItem(m, kali, regu, ungsi);
    if (!h) { kurang.push(n); continue; } t += h[0] * q; if (h[2]) est += h[0] * q; }
  const f = 1 - ASUMSI.adaAlat / 100; return {t: t * f, est: est * f, kurang}; }
/* personel per peran: [peran, orang, jenis, Rp per orang per hari (tanpa konsumsi)] */
function personel(x, regu, ungsi) { const A = ASUMSI, K = S.param.komando, uh = UH[x.prov] || UH_CADANGAN, J = {bko: ["BKO TNI/Polri/Basarnas", uh], asn: ["ASN BPBD/instansi", A.uhDalam], rel: ["Relawan/Tagana", A.honorRelawan], kes: ["Dinas Kesehatan", 0]};
  const r = (peran, n, j) => n > 0 ? [[peran, n, ...J[j]]] : [];
  if (x.tingkat === 2) { const p = K.lapangan.peran, sar = regu * A.orangRegu, bko = Math.round(sar * A.porsiBKO), ak = aktifPosko(x);
    return [...r(p[0], 1, "asn"), ...r(p[1] + " · BKO", bko, "bko"), ...r(p[1] + " · relawan", sar - bko, "rel"),
      ...r(p[2], ak ? Math.max(2, Math.ceil(ungsi / 100 * A.dapurPer100)) : 0, "rel"), ...r(p[3], ak ? Math.max(1, Math.ceil(ungsi / 200)) : 0, "rel"),
      ...r(p[4], ak ? Math.max(1, Math.ceil(ungsi / 500)) : 0, "kes"), ...r(p[5], 1, "asn"), ...r(p[6], 2, "rel")]; }
  const t = x.tingkat === 1 ? "kabupaten" : "provinsi", rows = K[t].peran.flatMap((p, i) => r(p, ORANG_PERAN[t][i] || 1, "asn"));
  if (x.tingkat === 1) { const bko = Math.round(A.orangRegu * A.porsiBKO); rows.push(...r("Regu cadangan SAR · BKO", bko, "bko"), ...r("Regu cadangan SAR · relawan", A.orangRegu - bko, "rel")); }
  return rows; }
function anggaran(x) {
  const A = ASUMSI, aktif = Posko.cucu(x).some(aktifPosko);
  const perm = x.tingkat === 2 ? x.jenis === "permanen" : Posko.cucu(x).some(y => y.jenis === "permanen"), hari = perm ? A.hariSiaga : A.hari;
  const regu = x.tingkat === 2 ? reguPosko(x) : 0, ungsi = ungsiPosko(x), peran = personel(x, regu, ungsi), org = peran.reduce((a, p) => a + p[1], 0);
  const grup = grupTingkat(["provinsi", "kabupaten", "lapangan"][x.tingkat], opsiBahaya(x)), alat = hargaGrup(grup, regu, ungsi);
  const mobil = (n, l = 40) => n * (A.sewaMobil + l * A.solar), ops = [["Personel (uang harian, uang saku, konsumsi)", peran.reduce((a, p) => a + p[1] * (p[3] + A.konsumsi), 0)]];
  if (x.tingkat === 2) { const lcr = aktif ? regu : 0, pompa = aktif ? 2 + (opsiBahaya(x).rob ? 2 : 0) : 0;
    ops.push(["BBM perahu bermesin", lcr * A.jamPerahu * A.lPerahu * A.bbm], ["BBM pompa jinjing", Math.min(pompa, 2) * A.jamPompa * A.lPompa * A.bbm],
      ["BBM genset (pompa celup, lampu)", A.jamGenset * A.lGenset * A.bbm * (pompa > 2 ? 2 : 1)], ["Sewa kendaraan + solar", mobil(A.mobilLap)],
      ["Sewa ekskavator (longsor)", aktif && opsiBahaya(x).longsor ? A.jamExc * A.sewaExc : 0], ["Internet satelit", A.starlink / 30]); }
  else ops.push(["BBM genset 10 kVA", A.jamGenset * A.lGenset * 2 * A.bbm], ["Sewa kendaraan + solar", mobil(x.tingkat === 1 ? A.mobilKab : A.mobilProv)], ["Internet satelit", (x.tingkat === 1 ? 1 : 2) * A.starlink / 30]);
  const harian = ops.reduce((a, o) => a + o[1], 0), op = harian * hari;
  /* logistik pengungsi (Perka BNPB 7/2008), hanya saat posko aktif menampung pengungsi */
  const hariU = Math.min(A.hariUngsi, hari), logistik = x.tingkat === 2 && aktif ? ungsi * hariU * A.biayaUngsi : 0;
  /* Dana Siap Pakai BNPB: provinsi yang punya posko aktif siaga/awas; dipakai setelah status tanggap darurat ditetapkan */
  const dsp = x.tingkat === 0 && Posko.cucu(x).some(y => Math.max(y.b, y.l, y.r) >= 2) ? A.heliUnit * A.heliJamHari * A.heliJam * A.hariDarurat : 0;
  return {regu, org, peran, ungsi, aktif, grup, alat, ops, harian, hari, op, hariU, logistik, dsp, total: (A.alat ? alat.t : 0) + op + logistik}; }

/* ================================================================ posko */
const Posko = {
  prov: "", tingkat: "semua", hal: 0, pilih: null,
  muat() { return this._m ||= Promise.all([muatJSON("data/posko.json"), muatJSON("data/param_banjir.json")]).then(([pk, pr]) => {
    S.posko = pk; S.param = pr; HARGA = pr.harga || {};
    UH = Object.fromEntries(Object.entries(pr.uh_sbm2026 || {}).filter(([k]) => !k.startsWith("_")));
    const simpan = bacaLokal("pb-asumsi", {});
    for (const [k, p] of Object.entries(ASUMSI_PARAM)) if (!(k in simpan) && pr.param?.[p]) ASUMSI[k] = ASUMSI_BAWAAN[k] = pr.param[p][0];
    S.semuaPosko = new Map([...pk.provinsi.map(x => [x.id, {...x, tingkat: 0}]), ...pk.kabupaten.map(x => [x.id, {...x, tingkat: 1}]), ...pk.lapangan.map(x => [x.id, {...x, tingkat: 2}])]);
    return pk; }).catch(e => { this._m = null; throw e; }); },
  anak(x) { return x.tingkat === 0 ? x.kabupaten.map(i => S.semuaPosko.get(i)).filter(Boolean) : x.tingkat === 1 ? x.lapangan.map(i => S.semuaPosko.get(i)).filter(Boolean) : []; },
  cucu(x) { return x.tingkat === 2 ? [x] : this.anak(x).flatMap(y => this.cucu(y)); },
  nKec(x) { return this.cucu(x).reduce((a, y) => a + y.layan.length, 0); },
  namaKab: k => /^Kota /.test(k) ? k : "Kab. " + k,
  nama(x) { return x.tingkat === 2 ? `${x.id} · ${x.desa ? "Desa " + x.desa : "Kec. " + x.kec}` : x.tingkat === 1 ? this.namaKab(x.kab) : "Prov. " + namaProv(x.prov); },
  jenis(x) { return x.tingkat === 0 ? "Pos komando · provinsi" : x.tingkat === 1 ? "Pos komando · kabupaten/kota" : {permanen: "Pos lapangan · permanen pra-musim", siaga: "Pos lapangan · siaga (sementara)", waspada: "Pos lapangan · siaga dini", rob: "Pos lapangan · rob"}[x.jenis]; },
  warna(x) { return x.tingkat === 0 ? "#0b2545" : x.tingkat === 1 ? "#5f6fb0" : x.jenis === "permanen" && !lvPosko(x) ? "#2b8c86" : WARNA_LV[Math.max(1, lvPosko(x))]; },
  tanda(x) { const s = [12, 10, 9][x.tingkat], isi = x.tingkat < 2 || x.jenis === "permanen";
    return `<i style="display:inline-block;width:${s}px;height:${s}px;border-radius:50%;background:${isi ? this.warna(x) : "#fff"};border:2px solid ${isi ? "#fff" : this.warna(x)};box-shadow:0 0 0 1px ${this.warna(x)}"></i>`; },
  pillLv(x) { const l = lvPosko(x); return l ? pill(l) : x.tingkat === 2 && x.jenis === "permanen" ? `<span class="pill" style="background:var(--surface);color:var(--ink2)">pra-musim</span>` : `<span style="color:var(--ink2);font-size:11.5px">Normal</span>`; },
  induk(x) { return x.induk && S.semuaPosko.get(x.induk); },
  jalur(x) { const a = this.induk(x), b = a && this.induk(a); return [a, b].filter(Boolean); },

  /* ---------- peta: 3 tingkat; jalur komando tidak digambar (ada di popup) ---------- */
  async lapis() {
    if (!peta) return; await this.muat().catch(() => null); if (!S.semuaPosko || peta.getSource("posko")) return;
    const ptk = [...S.semuaPosko.values()], vis = Peta.lihat("posko") && S.mode !== "riwayat" ? "visible" : "none";
    peta.addSource("posko", {type: "geojson", data: {type: "FeatureCollection", features: ptk.map(x => ({type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]},
      properties: {id: x.id, t: x.tingkat, lv: lvPosko(x), perm: x.jenis === "permanen" ? 1 : 0, lbl: ["Posko prov. " + x.nama, "Posko " + this.namaKab(x.kab || ""), "Posko " + x.id][x.tingkat]}}))}});
    peta.addLayer({id: "posko", type: "circle", source: "posko", layout: {visibility: vis, "circle-sort-key": ["-", 3, ["get", "t"]]},
      filter: ["any", ["==", ["get", "t"], 0], ["all", ["==", ["get", "t"], 1], [">=", ["zoom"], 5.8]], ["all", ["==", ["get", "t"], 2], [">=", ["get", "lv"], 2]], [">=", ["zoom"], 7.5]],
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["match", ["get", "t"], 0, 7, 1, 4, 3.5], 10, ["match", ["get", "t"], 0, 13, 1, 9, 7]],
        "circle-color": ["match", ["get", "t"], 0, "#0b2545", 1, "#5f6fb0", ["case", ["all", ["==", ["get", "perm"], 1], ["==", ["get", "lv"], 0]], "#2b8c86", "#ffffff"]],
        "circle-stroke-color": ["case", ["all", ["==", ["get", "t"], 2], ["any", ["==", ["get", "perm"], 0], [">", ["get", "lv"], 0]]], ["match", ["get", "lv"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], "#5f6fb0"], "#ffffff"],
        "circle-stroke-width": ["match", ["get", "t"], 0, 3, 1, 2, ["case", ["==", ["get", "perm"], 1], 2, 2.8]]}});
    peta.addLayer({id: "posko-lbl", type: "symbol", source: "posko", layout: {visibility: vis, "text-field": ["get", "lbl"], "text-size": ["match", ["get", "t"], 0, 12.5, 11],
        "text-offset": [0, 1.15], "text-anchor": "top", "text-font": ["Noto Sans Bold"], "text-optional": true, "symbol-sort-key": ["get", "t"]},
      filter: ["any", ["all", ["==", ["get", "t"], 0], [">=", ["zoom"], 5]], ["all", ["==", ["get", "t"], 1], [">=", ["zoom"], 6.5]], [">=", ["zoom"], 8.5]],
      paint: {"text-color": gelap() ? "#ffffff" : "#0b2545", "text-halo-color": gelap() ? "#0b1424" : "#ffffff", "text-halo-width": 1.8}});
    if (!this._ev) { this._ev = 1; peta.on("mouseenter", "posko", () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", "posko", () => peta.getCanvas().style.cursor = ""); }
    renderLegenda(); },
  tampil(on) { ["posko", "posko-lbl"].forEach(l => peta?.getLayer(l) && peta.setLayoutProperty(l, "visibility", on && Peta.lihat("posko") ? "visible" : "none")); },
  legenda() { if (!Peta.lihat("posko") || S.mode === "riwayat" || !S.semuaPosko) return "";
    const d = (bg, bd, t) => `<span><i class="sw dot" style="background:${bg};border:2px solid ${bd};box-shadow:0 0 0 1px ${bg === "#fff" ? bd : bg}"></i>${t}</span>`;
    return `<div class="lbl" style="margin-top:4px">Posko (Perka BNPB 3/2016)</div><div class="leg" style="margin:4px 0 0">${d("#0b2545", "#fff", "Pos komando provinsi")}${d("#5f6fb0", "#fff", "Pos komando kabupaten/kota, zoom 6+")}
      ${d("#2b8c86", "#fff", "Pos lapangan permanen pra-musim, zoom 7,5+")}${d("#fff", WARNA_LV[2], "Pos lapangan aktif (tepi = status); siaga/awas tampil di semua skala")}</div>`; },

  /* ---------- popup kartu ---------- */
  popup(id, ll) { const x = S.semuaPosko?.get(id); if (!x) return; const a = anggaran(x), jl = this.jalur(x);
    const kb = (k, v, penuh) => `<div class="kb${penuh ? " penuh" : ""}"><span>${k}</span><b title="${esc(String(v).replace(/<[^>]+>/g, ""))}">${v}</b></div>`, sel = [];
    if (x.tingkat === 2) sel.push(kb("Kec. dilayani", fmt(x.layan.length)), kb("Status 4 hari", lvPosko(x) ? LEVEL[lvPosko(x)] : x.jenis === "permanen" ? "pra-musim" : "Normal"), kb("Hujan 3 hari", x.h3 != null ? fmt(Math.round(x.h3)) + " mm" : "–"), kb("Regu SAR", fmt(a.regu)),
      kb("Perkiraan pengungsi", fmt(a.ungsi)), kb("Bahaya InaRISK", fmt(x.ib)));
    if (x.tingkat === 1) sel.push(kb("Posko lapangan", fmt(x.lapangan.length)), kb("Kec. dilayani", fmt(this.nKec(x))), kb("Lapangan siaga+", fmt(x.awas + x.siaga)), kb("Ke provinsi", x.km_induk != null ? fmt(Math.round(x.km_induk)) + " km" : "–"));
    if (x.tingkat === 0) sel.push(kb("Posko kabupaten", fmt(x.kabupaten.length)), kb("Posko lapangan", fmt(this.cucu(x).length)), kb("Kec. dilayani", fmt(this.nKec(x))), kb("Status tertinggi", lvPosko(x) ? LEVEL[lvPosko(x)] : "Normal"));
    sel.push(kb("Personel", fmt(a.org)), kb("Alat kurang", rp(a.alat.t)), kb("Operasional/hari", rp(a.harian)), kb("Total " + a.hari + " hari", rp(a.total)));
    if (a.dsp) sel.push(kb("DSP BNPB (terpisah)", rp(a.dsp), 1));
    if (x.tingkat === 2) sel.push(kb("Melayani", x.layan.map(esc).join(", "), 1));
    if (x.km_induk != null && x.tingkat === 2) sel.push(kb("Ke posko kabupaten", x.km_induk < 1 ? "satu lokasi" : `${fmt(Math.round(x.km_induk))} km · ± ${fmtJam(jamDarat(x.km_induk))}`, 1));
    if (x.bpbd) sel.push(kb("Kantor BPBD", esc(x.bpbd.alamat || "") + (x.bpbd.pusdalops ? " · " + esc(x.bpbd.pusdalops) : ""), 1));
    const ke = jl.map(y => y.tingkat === 1 ? "posko " + this.namaKab(y.kab) : "posko provinsi " + y.nama).join(" → ");
    new maplibregl.Popup({closeButton: true, maxWidth: "340px"}).setLngLat(ll).setHTML(`<div class="kartu">
      <div class="kp" style="background:linear-gradient(135deg,${this.warna(x)},rgba(11,37,69,.95))">${x.tingkat === 0 ? lambang(x.prov) : lambang(x.prov, x.kab)}<div><small>${this.jenis(x)}</small><b title="${esc(this.nama(x))}">${esc(this.nama(x))}</b></div></div>
      <div class="kg">${sel.join("")}</div>
      <div class="kk">${ke ? "Melapor ke " + esc(ke) : "Melapor ke BNPB"}<button class="btn sec" style="height:30px;font-size:12px" onclick="Posko.rinci('${x.id}')">Rincian alat, personel & anggaran</button></div></div>`).addTo(peta); },
  /* rincian di dialog (dari peta); tombol di dalamnya membuka tab Posko */
  async rinci(id) { await this.muat(); const x = S.semuaPosko.get(id); if (!x) return;
    Analisa.buka(this.rinciHTML(x, true), `${x.tingkat === 0 ? lambang(x.prov) : lambang(x.prov, x.kab)}<div><h3 id="dlgJudul">${esc(this.nama(x))}</h3><p>${esc(this.jenis(x))} · ${esc(namaProv(x.prov))}</p></div>`); },
  keTab(id) { $("#dlg").open && $("#dlg").close(); this.pilih = id; bukaTab("posko"); nanti(() => $("#rinciPosko")?.scrollIntoView({behavior: "smooth", block: "start"})); },
  lihat(id) { const x = S.semuaPosko.get(id); if (!x) return; $("#dlg").open && $("#dlg").close(); bukaTab("peta");
    nanti(() => { peta.flyTo({center: [x.lon, x.lat], zoom: [6.5, 8.5, 10][x.tingkat], padding: kiriPad()}); setTimeout(() => this.popup(x.id, [x.lon, x.lat]), 900); }); },

  /* ---------- rincian: komando, personel, alat, operasional, logistik pengungsi ---------- */
  rinciHTML(x, diDialog) { const a = anggaran(x), A = ASUMSI, K = S.param.komando, t = ["provinsi", "kabupaten", "lapangan"][x.tingkat], jl = this.jalur(x);
    const tbl = (kepala, isi, kaki) => `<div class="tw" style="margin-bottom:12px"><table><thead><tr>${kepala}</tr></thead><tbody>${isi}</tbody>${kaki ? `<tfoot>${kaki}</tfoot>` : ""}</table></div>`;
    const h = s => `<h3 style="font-size:15px;margin:14px 0 6px">${s}</h3>`, cat = s => `<p class="fnd" style="margin:-4px 0 10px">${s}</p>`;
    const naik = jl.map(y => `${y.tingkat === 1 ? "posko " + esc(this.namaKab(y.kab)) : "posko provinsi " + esc(y.nama)}`).join(" → ");
    const jarak = x.km_induk == null ? "" : x.km_induk < 1 ? " (satu lokasi)" : ` (${fmt(Math.round(x.km_induk))} km, ± ${fmtJam(jamDarat(x.km_induk))} darat)`;
    const per = a.peran.map(([p, n, j, b]) => `<tr><td style="white-space:normal">${esc(p)}</td><td class="n num">${fmt(n)}</td><td>${esc(j)}</td><td class="n num">${rpc(b + A.konsumsi)}</td><td class="n num">${rpc(n * (b + A.konsumsi))}</td></tr>`).join("");
    const alat = a.grup.flatMap(([g, it]) => it.map(([n, s, m, src, kali]) => { const q = jumlahItem(m, kali, a.regu, a.ungsi), hg = HARGA[n], gn = esc(g.replace(/\(per 100 pengungsi\)/, `(untuk ${fmt(a.ungsi)} pengungsi)`));
      const dasar = `<small style="color:var(--ink2)" title="${esc(src)}">${esc(Sarana.sumberPendek(src))}</small>`;
      if (SEWA.has(n)) return `<tr><td>${gn}</td><td style="white-space:normal">${esc(n)}<br>${dasar}</td><td class="n num">${fmt(q)} ${esc(s)}</td><td colspan="2" class="n">disewa/dipinjam (operasional)</td><td></td></tr>`;
      if (LOGISTIK(s)) return `<tr><td>${gn}</td><td style="white-space:normal">${esc(n)}<br>${dasar}</td><td class="n num">${fmt(q)} ${esc(s)}</td><td colspan="2" class="n">lihat logistik pengungsi</td><td></td></tr>`;
      if (!m) return `<tr><td>${gn}</td><td style="white-space:normal">${esc(n)}<br>${dasar}</td><td class="n">sesuai survei</td><td colspan="2"></td><td></td></tr>`;
      return `<tr><td>${gn}</td><td style="white-space:normal">${esc(n)}<br>${dasar}</td><td class="n num">${fmt(q)} ${esc(s)}</td><td class="n num">${hg ? rpc(hg[0]) : "–"}</td><td class="n num">${hg ? rpc(hg[0] * q) : "–"}</td>
        <td style="white-space:normal;min-width:160px;font-size:11.5px">${hg ? (hg[2] ? `<span class="pill l2">estimasi</span> ` : "") + esc(Sarana.sumberPendek(hg[1])) : `<span class="pill l3">belum ada harga</span>`}</td></tr>`; })).join("");
    const u = a.ungsi, logi = [["Ruang hunian", u * 3, "m²", "3 m²/orang"], ["Beras", u * .4, "kg/hari", "400 g/orang/hari, dapur umum 2 kali makan"], ["Air bersih", u * 15, "L/hari", "15 L/orang/hari (7 L tiga hari pertama)"],
      ["Air minum", u * 2.5, "L/hari", "2,5 L/orang/hari"], ["Jamban", Math.ceil(u / 20), "unit", "1 per 20 orang"], ["Tempat sampah 100 L", Math.ceil(u / 4 / 10), "unit", "1 per 10 KK (± 4 orang/KK)"]];
    const pk = ungsiPerKejadian(x.prov, x.bahaya);
    return `<div class="${diDialog ? "" : "card pad"}" id="${diDialog ? "" : "rinciPosko"}" style="${diDialog ? "" : "margin-bottom:14px"}">
      ${diDialog ? "" : `<div class="head" style="margin-top:0"><div style="display:flex;gap:10px;align-items:center">${x.tingkat === 0 ? lambang(x.prov) : lambang(x.prov, x.kab)}<div><div class="lbl">${esc(this.jenis(x))}</div>
        <h2>${esc(this.nama(x))}</h2></div></div><button class="btn sec" onclick="Posko.pilih=null;Posko.render()">Tutup rincian</button></div>`}
      <p style="margin:0 0 10px;font-size:13px">${esc(namaProv(x.prov))}${x.tingkat === 2 ? ` · ${esc(this.namaKab(x.kab))} · Kec. ${esc(x.kec)}${x.desa ? ", desa " + esc(x.desa) : ""}` : x.tingkat === 1 && x.kec ? " · Kec. " + esc(x.kec) : ""} · ${x.lat}, ${x.lon}<br>
        ${naik ? `Melapor ke ${naik}${jarak}.` : "Melapor ke BNPB."}${x.tingkat === 2 ? ` Melayani ${fmt(x.layan.length)} kecamatan: ${x.layan.map(esc).join(", ")}.` : ""}</p>
      <div class="grid g4" style="margin-bottom:12px">${[["Personel", fmt(a.org), x.tingkat === 2 ? `${a.regu} regu SAR × ${A.orangRegu} + staf posko` : "staf komando" + (x.tingkat === 1 ? " + 1 regu cadangan" : "")],
        ["Alat yang kurang", rp(a.alat.t), a.alat.est ? rp(a.alat.est) + " masih estimasi" : "kendaraan disewa"], ["Operasional / hari", rp(a.harian), a.aktif ? "personel, BBM, sewa, internet" : "siaga: personel inti, genset, sewa"],
        ["Total " + a.hari + " hari", rp(a.total), a.dsp ? "+ DSP BNPB " + rp(a.dsp) + " terpisah" : a.logistik ? "termasuk logistik pengungsi " + rp(a.logistik) : "APBD / instansi"]].map(([l, v, s]) => kot(l, v, s)).join("")}</div>
      ${h("Struktur komando dan personel")}${cat(`${esc(K[t].posko)}. Peran menurut Perka BNPB 3/2016 dan 10/2008; jumlah orang per peran adalah rekomendasi platform (Perka tidak menetapkannya). Komunikasi: ${esc(K[t].komunikasi)}.`)}
      ${tbl(`<th>Peran</th><th class="n">Orang</th><th>Asal / jenis</th><th class="n">Biaya / orang / hari</th><th class="n">Sub Total / hari</th>`, per, `<tr><td>Total personel</td><td class="n num">${fmt(a.org)}</td><td></td><td></td><td class="n num">${rpc(a.ops[0][1])}</td></tr>`)}
      ${cat(`Biaya per orang = uang harian/uang saku + konsumsi Rp${fmt(A.konsumsi)}. BKO: uang harian SBM 2026 ${esc(namaProv(x.prov))} Rp${fmt(UH[x.prov] || UH_CADANGAN)}${UH[x.prov] ? "" : " (provinsi belum tercantum, dipakai median)"}; ASN setempat Rp${fmt(A.uhDalam)}; relawan uang saku Rp${fmt(A.honorRelawan)} (asumsi); tenaga kesehatan dibiayai Dinkes.`)}
      ${h("Biaya operasional")}${tbl(`<th>Pos biaya</th><th class="n">Per hari</th><th class="n">${a.hari} hari</th>`, a.ops.filter(o => o[1]).map(([n, v]) => `<tr><td>${esc(n)}</td><td class="n num">${rpc(v)}</td><td class="n num">${rpc(v * a.hari)}</td></tr>`).join(""),
        `<tr><td>Total operasional</td><td class="n num">${rpc(a.harian)}</td><td class="n num">${rpc(a.op)}</td></tr>`)}
      ${cat(a.aktif ? `Perahu ${A.jamPerahu} jam/hari × ${fmt(A.lPerahu)} L/jam; pompa ${A.jamPompa} jam × ${fmt(A.lPompa)} L/jam; genset ${A.jamGenset} jam × ${fmt(A.lGenset)} L/jam; pertalite Rp${fmt(A.bbm)}/L, solar Rp${fmt(A.solar)}/L; sewa kendaraan Rp${fmt(A.sewaMobil)}/hari.` : `Posko permanen pra-musim dalam siaga: perahu dan pompa belum berjalan; dihitung ${A.hariSiaga} hari.`)}
      ${h("Peralatan")}${tbl(`<th>Kelompok</th><th>Sarana · dasar jumlah</th><th class="n">Jumlah</th><th class="n">Harga satuan</th><th class="n">Sub Total</th><th>Sumber harga</th>`, alat,
        `<tr><td colspan="4">Total alat yang kurang${A.adaAlat ? ` (sudah dikurangi ${A.adaAlat}% yang ada)` : ""}</td><td class="n num">${rpc(a.alat.t)}</td><td></td></tr>`)}
      ${cat(`Kebutuhan penuh. ${x.tingkat === 2 ? `Evakuasi air dikali ${a.regu} regu; kit pengungsian dikali ${fmt(a.ungsi)} ÷ 100 pengungsi. ` : x.tingkat === 1 ? "Jumlah kabupaten adalah turunan Perka 17/2009 (lemah). " : "Jumlah provinsi = median 33 provinsi Perka BNPB 17/2009. "}Kurangi dengan yang sudah ada di BPBD, Basarnas, TNI/Polri, dan PMI (isi di tab Sarana). ${a.alat.kurang.length ? "Belum ada harga: " + a.alat.kurang.map(esc).join(", ") + "." : ""}`)}
      ${x.tingkat === 2 ? `${h(`Logistik pengungsi · ${fmt(u)} orang`)}${cat(`Perkiraan = ${pk != null ? `median pengungsi per kejadian ${esc(x.bahaya)} di ${esc(namaProv(x.prov))} (${fmt(Math.round(pk))} orang, BNPB/DIBI)` : "data pengungsi belum termuat"} × ${fmt(Math.max(1, x.nlv[2] + x.nlv[3]))} kecamatan siaga/awas × ${fmt(A.faktorUngsi)}, minimal ${fmt(A.minUngsi)}.`)}
        ${tbl(`<th>Kebutuhan</th><th class="n">Per hari / total</th><th>Standar Perka BNPB 7/2008</th>`, logi.map(([n, v, s, d]) => `<tr><td>${n}</td><td class="n num">${fmt(Math.ceil(v))} ${s}</td><td style="white-space:normal">${d}</td></tr>`).join("")
          + `<tr><td>Biaya pengungsi (beras, lauk, air, dapur)</td><td class="n num">${rpc(u * A.biayaUngsi)} /hari</td><td style="white-space:normal">Rp${fmt(A.biayaUngsi)}/orang/hari (turunan, lemah) × ${a.hariU} hari = ${rp(u * A.biayaUngsi * a.hariU)}${a.aktif ? "" : "; belum dihitung karena posko masih siaga"}</td></tr>`)}` : ""}
      ${x.tingkat === 0 ? `${h("Dana Siap Pakai BNPB (terpisah dari APBD)")}${cat(a.dsp ? `${A.heliUnit} helikopter × ${A.heliJamHari} jam/hari × Rp${fmt(A.heliJam / 1e6)} jt/jam × ${A.hariDarurat} hari = <b>${rp(a.dsp)}</b>. Dipakai setelah status tanggap darurat ditetapkan; untuk evakuasi dan distribusi logistik ke wilayah terisolasi.` : "Belum ada posko lapangan siaga/awas di provinsi ini; DSP tidak dihitung.")}` : ""}
      ${diDialog ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" onclick="Posko.keTab('${x.id}')">Buka di tab Posko</button><button class="btn sec" onclick="Posko.lihat('${x.id}')">Lihat di peta</button></div>` : ""}
      <p class="fnd">Sumber: Perka BNPB 3/2016, 10/2008, 7/2008, 17/2009; harga dari param_banjir.json (51 item, ${Object.values(HARGA).filter(v => v[2]).length} masih estimasi); uang harian PMK 32/2025 (SBM 2026).</p></div>`; },

  /* ---------- tab Posko ---------- */
  async render() {
    const el = $("#posko"); if (!S.semuaPosko) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat posko…</div>`; try { await this.muat(); } catch (e) { el.innerHTML = `<div class="kosong">Data posko belum tersedia.</div>`; return; } }
    const A = ASUMSI, semua = [...S.semuaPosko.values()], PV = this.prov ? this.prov.split(",") : [], nmPv = PV.length > 3 ? PV.length + " provinsi" : PV.map(namaProv).join(", "), diProv = semua.filter(x => !PV.length || PV.includes(x.prov));
    const daftar = diProv.filter(x => this.tingkat === "semua" || ["provinsi", "kabupaten", "lapangan"][x.tingkat] === this.tingkat)
      .sort((p, q) => p.tingkat - q.tingkat || lvPosko(q) - lvPosko(p) || p.id.localeCompare(q.id));
    const per = 40, jml = Math.ceil(daftar.length / per), hal = daftar.slice(this.hal * per, (this.hal + 1) * per);
    const provs = [...new Set(semua.map(x => x.prov))].sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    const sel = this.pilih && S.semuaPosko.get(this.pilih), AG = new Map(diProv.map(x => [x.id, anggaran(x)]));
    const jum = f => diProv.filter(f).reduce((s, x) => { const g = AG.get(x.id); s.alat += g.alat.t; s.op += g.op; s.lg += g.logistik; s.total += g.total; s.dsp += g.dsp; s.org += g.org; s.n++; return s; }, {alat: 0, op: 0, lg: 0, total: 0, dsp: 0, org: 0, n: 0});
    const J = [jum(x => x.tingkat === 0), jum(x => x.tingkat === 1), jum(x => x.tingkat === 2 && x.jenis === "permanen"), jum(x => x.tingkat === 2 && x.jenis !== "permanen")], T = J.reduce((s, j) => s + j.total, 0), DSP = J[0].dsp;
    const K = S.param.komando, nAktif = diProv.filter(x => x.tingkat === 2 && x.jenis !== "permanen").length;
    const komando = `<div class="head" style="margin-top:6px"><div><h2>Jalur komando</h2><p>Laporan naik berjenjang dari pos lapangan ke pos komando kabupaten lalu provinsi (Perka BNPB 3/2016).</p></div></div>
      <div class="grid g3" style="margin-bottom:8px">${[["provinsi", "Pos komando · provinsi", 0], ["kabupaten", "Pos komando · kabupaten/kota", 1], ["lapangan", "Pos lapangan · kecamatan/desa", 2]].map(([k, j, i]) => `<div class="card pad">
        <div style="display:flex;gap:8px;align-items:center"><i style="width:${[14, 11, 10][i]}px;height:${[14, 11, 10][i]}px;border-radius:50%;background:${["#0b2545", "#5f6fb0", "#2b8c86"][i]};border:2px solid #fff;box-shadow:0 0 0 1px ${["#0b2545", "#5f6fb0", "#2b8c86"][i]}"></i><h3 style="font-size:15px">${j}</h3></div>
        <p style="font-size:12.5px;color:var(--ink2);margin:6px 0">${esc(K[k].posko)}${K[k].tugas ? ". Tugas: " + esc(K[k].tugas) : ""}.</p>
        <ul style="font-size:12.5px;margin:0;padding-left:18px">${K[k].peran.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
        <p class="fnd" style="margin-top:6px">Komunikasi: ${esc(K[k].komunikasi)}${K[k].catatan ? ". " + esc(K[k].catatan) : ""}.</p></div>`).join("")}</div>
      <p class="fnd" style="margin-bottom:18px">Dasar: ${esc(K.dasar.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " "))}.</p>`;
    const F = [["hari", "Lama operasi tanggap darurat (hari)"], ["hariSiaga", "Lama siaga posko permanen (hari)"], ["adaAlat", "Alat yang sudah ada (%)"], ["orangRegu", "Orang per regu SAR"], ["porsiBKO", "Porsi personel BKO (0–1)"],
      ["honorRelawan", "Uang saku relawan / hari (Rp)"], ["konsumsi", "Konsumsi / orang / hari (Rp)"], ["sewaMobil", "Sewa kendaraan / hari (Rp)"], ["faktorUngsi", "Pengali perkiraan pengungsi"], ["minUngsi", "Pengungsi minimal / posko"],
      ["hariUngsi", "Lama mengungsi (hari)"], ["biayaUngsi", "Biaya pengungsi / orang / hari (Rp)"], ["heliUnit", "Helikopter BNPB / provinsi"], ["heliJamHari", "Jam terbang / heli / hari"], ["hariDarurat", "Hari status tanggap darurat"]];
    const ang = `<div class="head"><div><h2>Anggaran ${this.prov ? esc(nmPv) : "nasional"}</h2><p>Kebutuhan dana per tingkat posko, dipisah menurut sumber dananya. Posko aktif ${A.hari} hari, posko permanen ${A.hariSiaga} hari.</p></div>
      <button class="btn sec" id="pbReset">Kembalikan asumsi bawaan</button></div>
      <div class="card pad" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px" id="asumsiB">
        ${F.map(([k, n]) => `<label class="fld" style="margin:0"><span class="lbl">${n}</span><input type="number" min="0" step="any" data-a="${k}" value="${A[k]}" style="width:150px"></label>`).join("")}
        <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" data-a="alat" ${A.alat ? "checked" : ""}> Termasuk beli alat</label></div>
      <div class="tw" style="margin-bottom:12px"><table><thead><tr><th>Tingkat</th><th class="n">Jumlah posko</th><th class="n">Personel</th><th class="n">Alat yang kurang</th><th class="n">Operasional</th><th class="n">Logistik pengungsi</th><th class="n">APBD / instansi</th></tr></thead><tbody>
        ${["Pos komando provinsi", "Pos komando kabupaten/kota", `Pos lapangan permanen (${A.hariSiaga} hari)`, `Pos lapangan aktif (${A.hari} hari)`].map((n, i) => `<tr><td>${n}</td><td class="n num">${fmt(J[i].n)}</td><td class="n num">${fmt(J[i].org)}</td><td class="n num">${rpc(J[i].alat)}</td><td class="n num">${rpc(J[i].op)}</td><td class="n num">${rpc(J[i].lg)}</td><td class="n num"><b>${rpc(J[i].total)}</b></td></tr>`).join("")}</tbody>
        <tfoot><tr><td>Total APBD / instansi</td><td class="n num">${fmt(J.reduce((s, j) => s + j.n, 0))}</td><td class="n num">${fmt(J.reduce((s, j) => s + j.org, 0))}</td><td class="n num">${rpc(J.reduce((s, j) => s + j.alat, 0))}</td><td class="n num">${rpc(J.reduce((s, j) => s + j.op, 0))}</td><td class="n num">${rpc(J.reduce((s, j) => s + j.lg, 0))}</td><td class="n num">${rpc(T)}</td></tr></tfoot></table></div>
      <div class="grid g2" style="margin-bottom:18px"><div class="kpi" style="text-align:left"><span class="lbl">Dana Siap Pakai BNPB (terpisah)</span><b style="padding-left:12px">${rp(DSP)}</b><small style="padding-left:12px">${A.heliUnit} heli × ${A.heliJamHari} jam × ${A.hariDarurat} hari per provinsi yang punya posko siaga/awas</small></div>
        <div class="kpi" style="text-align:left"><span class="lbl">Catatan</span><b style="padding-left:12px;font-size:14px">Logistik pengungsi biasanya dari Kemensos (buffer stock) dan BPBD</b><small style="padding-left:12px">Uang harian SBM 2026 · stimulan rumah tidak dihitung di sini (biaya pemulihan, bukan posko)</small></div></div>`;
    const ringkas = `<div class="grid g4" style="margin-bottom:14px">${[["Pos komando provinsi", fmt(J[0].n), this.prov ? esc(nmPv) : "ibu kota provinsi"], ["Pos komando kabupaten", fmt(J[1].n), "kantor BPBD bila diketahui"],
      ["Pos lapangan", fmt(J[2].n + J[3].n), `${fmt(J[2].n)} permanen · ${fmt(nAktif)} aktif`], ["Anggaran APBD / instansi", rp(T), DSP ? "+ DSP BNPB " + rp(DSP) : "tanpa DSP"]].map(([l, v, s]) => kot(l, v, s)).join("")}</div>`;
    const nmT = {semua: "Semua tingkat", provinsi: "Provinsi", kabupaten: "Kabupaten/kota", lapangan: "Lapangan"};
    el.innerHTML = `<div class="head"><div><h2>Posko banjir, longsor & rob</h2><p>Pos lapangan permanen pra-musim di kabupaten paling sering banjir, ditambah pos lapangan aktif untuk kecamatan siaga 4 hari ke depan.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><select id="pkProv" multiple class="btn sec" aria-label="Pilih provinsi"><option value="" ${PV.length ? "" : "selected"}>Semua provinsi (${fmt(semua.length)})</option>${provs.map(k => `<option value="${k}" ${PV.includes(k) ? "selected" : ""}>${esc(namaProv(k))} (${semua.filter(x => x.prov === k).length})</option>`).join("")}</select>
      <select id="pkTk" class="btn sec" aria-label="Pilih tingkat">${Object.entries(nmT).map(([k, n]) => `<option value="${k}" ${k === this.tingkat ? "selected" : ""}>${n}</option>`).join("")}</select>
      <button class="btn sec" id="pkCsv">Unduh CSV</button></div></div>
      ${ringkas}${sel ? this.rinciHTML(sel) : ""}
      <div class="tw"><table><thead><tr><th>Posko</th><th>Lokasi</th><th>Kab/Kota</th><th>Status</th><th>Kecamatan dilayani</th><th class="n">Regu</th><th class="n">Personel</th><th class="n">Pengungsi</th><th class="n">Anggaran (APBD)</th><th class="n">Ke induk</th><th></th></tr></thead><tbody>
      ${hal.map(x => { const g = AG.get(x.id); return `<tr><td>${this.tanda(x)} <b>${x.id}</b><br><small style="color:var(--ink2)">${esc(this.jenis(x).split(" · ").reverse().join(" · "))}</small></td>
        <td style="white-space:normal;min-width:150px">${x.tingkat === 0 ? esc(x.nama) : x.tingkat === 1 ? (x.bpbd ? "Kantor BPBD" : "Kec. " + esc(x.kec || "–")) : (x.desa ? "Desa " + esc(x.desa) + ", " : "") + "Kec. " + esc(x.kec)}<br><small style="color:var(--ink2)">${x.lat}, ${x.lon}</small></td>
        <td>${x.tingkat ? esc(x.kab) : "–"}<br><small style="color:var(--ink2)">${esc(namaProv(x.prov))}</small></td><td>${this.pillLv(x)}</td>
        <td style="white-space:normal;font-size:12px;min-width:200px">${x.tingkat === 2 ? x.layan.map(esc).join(", ") : `${fmt(this.nKec(x))} kec. lewat ${fmt(this.cucu(x).length)} pos lapangan`}</td>
        <td class="n num">${g.regu || (x.tingkat === 1 ? "1 cad." : "–")}</td><td class="n num">${fmt(g.org)}</td><td class="n num">${x.tingkat === 2 ? fmt(g.ungsi) : "–"}</td><td class="n num">${rpc(g.total)}</td>
        <td class="n num">${x.km_induk != null ? `${fmt(Math.round(x.km_induk))} km<br><small style="color:var(--ink2)">± ${fmtJam(jamDarat(x.km_induk))}</small>` : "–"}</td>
        <td><button class="link" data-rinci="${x.id}">Rincian</button> · <button class="link" data-lihat="${x.id}">Peta</button></td></tr>`; }).join("") || `<tr><td colspan="11" class="kosong">Belum ada posko di pilihan ini.</td></tr>`}</tbody></table></div>
      <div class="pager">${jml > 1 ? `Halaman ${this.hal + 1} dari ${jml} ${this.hal > 0 ? `<button class="btn sec" data-h="${this.hal - 1}">‹</button>` : ""}${this.hal < jml - 1 ? `<button class="btn sec" data-h="${this.hal + 1}">›</button>` : ""}` : ""}</div>
      ${komando}${ang}
      <p class="fnd">Lokasi: posko.py (${esc(S.posko.dibuat)}). Permanen = maks. ${S.posko.per_prov ?? 3} kabupaten per provinsi yang paling sering banjir+longsor (BNPB/DIBI), di kecamatan dengan bahaya InaRISK tertinggi. Aktif = kecamatan siaga/awas hari ini s.d. +3, gugus ≥ ${S.posko.waspada_min ?? 4} kecamatan waspada, dan titik rob siaga; kecamatan dalam ${fmt(S.posko.gabung_km)} km digabung. Waktu tempuh = jarak × ${KELOK_B} ÷ ${LAJU_B} km/jam (perkiraan darat).</p>`;
    el.querySelector("#asumsiB").addEventListener("change", e => { const i = e.target.closest("[data-a]"); if (!i) return;
      ASUMSI[i.dataset.a] = i.type === "checkbox" ? i.checked : Math.max(0, +i.value); simpanLokal("pb-asumsi", ASUMSI); nanti(() => this.render()); });
    $("#pbReset").onclick = () => { simpanLokal("pb-asumsi", {}); Object.assign(ASUMSI, ASUMSI_BAWAAN); nanti(() => this.render()); };
    $("#pkProv").onchange = e => { this.prov = PilihCantik.nilai(e.target).join(","); this.hal = 0; nanti(() => this.render()); };
    $("#pkTk").onchange = e => { this.tingkat = e.target.value; this.hal = 0; nanti(() => this.render()); };
    el.querySelector(".pager").onclick = e => { const b = e.target.closest("button"); if (b) { this.hal = +b.dataset.h; nanti(() => this.render()); } };
    $("#pkCsv").onclick = () => unduh("rekomendasi-posko-banjir.csv", csv([["Posko", "Tingkat", "Jenis", "Provinsi", "Kab/Kota", "Kecamatan", "Desa", "Lintang", "Bujur", "Status", "Kecamatan dilayani", "Regu", "Personel", "Pengungsi", "Alat kurang (Rp)", "Operasional/hari (Rp)", "Hari", "Logistik pengungsi (Rp)", "Total APBD (Rp)", "DSP BNPB (Rp)", "Induk", "Jarak induk km", "Waktu induk jam"],
      ...daftar.map(x => { const g = AG.get(x.id); return [x.id, ["provinsi", "kabupaten", "lapangan"][x.tingkat], x.jenis || "", namaProv(x.prov), x.kab || "", x.kec || "", x.desa || "", x.lat, x.lon, LEVEL[lvPosko(x)], x.tingkat === 2 ? x.layan.join("; ") : this.nKec(x),
        g.regu, g.org, x.tingkat === 2 ? g.ungsi : "", Math.round(g.alat.t), Math.round(g.harian), g.hari, Math.round(g.logistik), Math.round(g.total), Math.round(g.dsp), x.induk || "", x.km_induk ?? "", x.km_induk != null ? Math.round(jamDarat(x.km_induk) * 10) / 10 : ""]; })]));
    el.querySelector("tbody").onclick = e => { const r = e.target.closest("[data-rinci]"); if (r) { this.pilih = r.dataset.rinci; return nanti(() => { this.render(); $("#rinciPosko")?.scrollIntoView({behavior: "smooth", block: "start"}); }); }
      const b = e.target.closest("[data-lihat]"); if (b) this.lihat(b.dataset.lihat); };
  },
};

/* ---------- panel kiri mode Posko (setara renderDaftarPosko karhutla) ---------- */
function renderDaftarPosko() {
  if (!S.semuaPosko) { $("#rows").innerHTML = `<div class="kosong"><div class="spin"></div>Memuat posko…</div>`; Posko.muat().then(() => S.panel === "posko" && renderDaftar(), () => $("#rows").innerHTML = `<div class="kosong">Data posko belum tersedia.</div>`); return; }
  const [pv, kb] = S.jalur, baris = [], g = "grid-template-columns:20px minmax(0,1fr) 40px 78px", semua = [...S.semuaPosko.values()];
  const row = x => `<button class="tb" data-pk="${x.id}" style="${g}"><span class="rk">${Posko.tanda(x)}</span><span style="padding-left:${x.tingkat * 12}px;font-weight:${x.tingkat < 2 ? 700 : 500}">${esc(Posko.nama(x))}</span>
    <span class="n">${fmt(Posko.nKec(x))}</span><span style="text-align:right">${Posko.pillLv(x)}</span></button>`;
  for (const u of semua.filter(u => u.tingkat === 0 && (!pv || u.prov === pv))) {
    baris.push(row(u));
    for (const m of Posko.anak(u).filter(m => !kb || m.kab === kb).sort((a, b) => lvPosko(b) - lvPosko(a) || a.kab.localeCompare(b.kab))) {
      baris.push(row(m)); if (pv) Posko.anak(m).forEach(l => baris.push(row(l))); } }
  const n = t => semua.filter(x => x.tingkat === t && (!pv || x.prov === pv) && (!kb || t === 0 || x.kab === kb)).length;
  $("#rows").innerHTML = `<div class="ringkas"><div class="lbl">Posko ${pv ? esc(namaProv(pv)) : "seluruh Indonesia"}${kb ? " · " + esc(kb) : ""}</div>
    <div class="kv" style="grid-template-columns:repeat(3,1fr)">${[[0, "provinsi"], [1, "kabupaten"], [2, "lapangan"]].map(([t, s]) => `<div><b>${fmt(n(t))}</b><span>${s}</span></div>`).join("")}</div></div>
    <div class="tb kepala" style="${g}"><span></span><span>Posko</span><span class="n">Kec.</span><span style="text-align:right">Status</span></div>`
    + (baris.join("") || `<div class="kosong">Belum ada posko di wilayah ini.</div>`)
    + (pv ? "" : `<p class="fnd" style="padding:8px">Pilih provinsi untuk melihat pos lapangan.</p>`);
}
S.panel ??= "wil";
$("#panelMode")?.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.panel = b.dataset.m;
  $("#panelMode").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => renderDaftar()); });
/* baris posko di panel: tangkap lebih dulu supaya handler wilayah (turun) tidak ikut jalan */
$("#rows").addEventListener("click", e => { const pb = e.target.closest("[data-pk]"); if (!pb) return; e.stopPropagation(); const x = S.semuaPosko.get(pb.dataset.pk);
  peta.flyTo({center: [x.lon, x.lat], zoom: [6.5, 8.5, 10][x.tingkat], padding: kiriPad()}); setTimeout(() => Posko.popup(x.id, [x.lon, x.lat]), 900); }, true);
Posko.muat().catch(() => {});

/* ================================================================ sarana banjir */
const Sarana = {
  isi: bacaLokal("pb-sarana", {}),
  /* sumber panjang (dengan URL) -> teks pendek; URL tetap di title/tautan */
  sumberPendek(s) { s = String(s || ""); if (/^R\b/.test(s)) return s.length > 2 ? "rekomendasi platform" + s.slice(1).replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ") : "rekomendasi platform";
    let t = s.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim(); if (window.T) t = window.T(t);   /* terjemahkan dulu, baru dipotong */
    return t.length > 90 ? t.slice(0, 87) + "…" : t; },
  url: s => (String(s || "").match(/https?:\/\/\S+/) || [""])[0],
  kunci(gi, ii) { return this.tingkat + ":" + this.grup[gi][0] + ":" + this.grup[gi][1][ii][0]; },
  async render() {
    const el = $("#sarana"); if (!S.param) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat daftar sarana…</div>`; try { await Posko.muat(); } catch (e) { el.innerHTML = `<div class="kosong">Daftar sarana belum tersedia.</div>`; return; } }
    const I = this.isi, t = I._tingkat || "lapangan", bh = I._bahaya || "banjir", lap = t === "lapangan";
    const regu = lap ? Math.max(1, +I._regu || 1) : 1, ungsi = lap ? Math.max(0, I._ungsi != null ? +I._ungsi : 100) : 0;
    Object.assign(this, {tingkat: t, regu, ungsi, grup: grupTingkat(t, {rob: bh === "rob", longsor: bh === "longsor"})});
    const lapPosko = [...S.semuaPosko.values()].filter(x => x.tingkat === 2).sort((a, b) => lvPosko(b) - lvPosko(a) || a.id.localeCompare(b.id));
    el.innerHTML = `<div class="head"><div><h2>Kesiapan sarana posko banjir</h2><p>Centang yang sudah ada untuk melihat kekurangan dan biayanya. Isian tersimpan di perangkat ini.</p></div>
      <div class="np" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="sUnit" placeholder="Nama posko / unit" value="${esc(I._unit || "")}" style="height:38px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 12px;max-width:100%">
      <button class="btn sec" id="sCsv">Unduh CSV</button><button class="btn sec" id="sCetak">Cetak</button><button class="btn sec" id="sHapus">Kosongkan centang</button></div></div>
      <div class="card pad np" style="margin-bottom:14px;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
        <label class="fld" style="margin:0"><span class="lbl">Tingkat posko</span><select id="sTk">${[["lapangan", "Pos lapangan"], ["kabupaten", "Pos komando kabupaten/kota"], ["provinsi", "Pos komando provinsi"]].map(([v, n]) => `<option value="${v}" ${t === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="fld" style="margin:0"><span class="lbl">Bahaya utama</span><select id="sBh">${[["banjir", "Banjir"], ["longsor", "Banjir + longsor"], ["rob", "Banjir + rob"]].map(([v, n]) => `<option value="${v}" ${bh === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        ${lap ? `<label class="fld" style="margin:0"><span class="lbl">Jumlah regu SAR</span><input type="number" min="1" id="sRegu" value="${regu}"></label>
          <label class="fld" style="margin:0"><span class="lbl">Perkiraan pengungsi</span><input type="number" min="0" step="10" id="sUngsi" value="${ungsi}"></label>
          <label class="fld" style="margin:0"><span class="lbl">Isi dari rekomendasi posko</span><select id="sDari"><option value="">pilih posko…</option>${lapPosko.map(x => `<option value="${x.id}">${esc(x.id + " · " + x.kec + ", " + x.kab)}</option>`).join("")}</select></label>` : ""}
        <div style="font-size:13px;max-width:52ch">${lap ? `<b>${fmt(regu)} regu</b> (${fmt(regu * ASUMSI.orangRegu)} orang) · kit pengungsian untuk <b>${fmt(ungsi)}</b> orang (dikali ${fmt(ungsi)} ÷ 100).` : t === "kabupaten" ? "Jumlah kabupaten adalah turunan Perka 17/2009 (regulasi hanya mengatur nasional dan provinsi)." : "Jumlah provinsi = median 33 provinsi, Perka BNPB 17/2009 Bab III.B."}</div></div>
      <div class="cetak-judul">${esc(I._unit || "Posko")} · ${esc({lapangan: "Pos lapangan", kabupaten: "Pos komando kabupaten/kota", provinsi: "Pos komando provinsi"}[t])} · ${esc(bh)}${lap ? ` · ${regu} regu · ${fmt(ungsi)} pengungsi` : ""} · ${new Date().toLocaleDateString("id-ID", WIB)}</div>
      <div class="grid g4" id="sKpi" style="margin-bottom:14px"></div>
      ${this.grup.map(([g, it], gi) => `<div class="fold"><button aria-expanded="${gi < 2}" data-g="${gi}">${esc(g.replace(/\(per 100 pengungsi\)/, `(untuk ${fmt(ungsi)} pengungsi)`))} <span class="pill l1" id="sg${gi}"></span><span class="num" id="sr${gi}" style="font-size:12px;color:var(--ink2);font-weight:600"></span>
        <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg></button>
        <div ${gi < 2 ? "" : "hidden"}><div class="chk srn lbl" style="border:0"><span>Sarana · dasar jumlah</span><span class="n">Kebutuhan</span><span style="text-align:center">Sudah ada</span><span class="n">Harga satuan</span><span class="n">Kekurangan</span></div>
        ${it.map(([n, s, m, src, kali], ii) => { const q = jumlahItem(m, kali, regu, ungsi), h = HARGA[n], k = this.kunci(gi, ii), u = this.url(src);
          return `<div class="chk srn"><span>${esc(n)}<small style="display:block;color:var(--ink2)" title="${esc(src)}">(${esc(s)}) · ${esc(this.sumberPendek(src))}${u ? ` · <a href="${escUrl(u)}" target="_blank" rel="noopener">naskah</a>` : ""}</small></span>
            <span class="n num"><small class="m">Kebutuhan </small>${m ? fmt(q) + " " + esc(s) : "sesuai survei"}</span>
            <label style="text-align:center"><small class="m">Sudah ada </small><input type="checkbox" data-k="${esc(k)}" ${I[k] ? "checked" : ""} aria-label="${esc(n)} sudah ada"></label>
            <span class="n num"><small class="m">Harga </small>${SEWA.has(n) ? "sewa" : LOGISTIK(s) ? "logistik" : h ? rp(h[0]) + (h[2] ? ` <span class="pill l2" title="${esc(h[1])}">estimasi</span>` : "") : "–"}</span>
            <span class="n num" id="sk${gi}_${ii}"></span></div>`; }).join("")}</div></div>`).join("")}
      <p class="fnd">Harga: param_banjir.json (${Object.keys(HARGA).length} item; label <b>estimasi</b> = belum ada harga resmi, cek e-Katalog/SSH daerah). Kendaraan dan alat berat disewa/dipinjam; air, beras, dan ruang hunian dihitung sebagai logistik harian pengungsi (Perka BNPB 7/2008).</p>`;
    el.querySelectorAll(".fold > button").forEach(b => b.onclick = () => { const buka = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", buka); nanti(() => b.nextElementSibling.hidden = !buka); });
    const simpan = () => simpanLokal("pb-sarana", this.isi);
    el.oninput = e => { const i = e.target;
      if (i.id === "sUnit") { I._unit = i.value; return simpan(); }
      if (i.id === "sRegu" || i.id === "sUngsi") { I[i.id === "sRegu" ? "_regu" : "_ungsi"] = +i.value; simpan(); clearTimeout(this._t); this._t = setTimeout(() => { this.render().then(() => { const x = $("#" + i.id); x.focus(); }); }, 500); } };
    el.onchange = e => { const i = e.target;
      if (i.dataset.k) { if (i.checked) I[i.dataset.k] = 1; else delete I[i.dataset.k]; simpan(); return this.skor(); }
      if (i.id === "sTk") { I._tingkat = i.value; simpan(); nanti(() => this.render()); }
      if (i.id === "sBh") { I._bahaya = i.value; simpan(); nanti(() => this.render()); }
      if (i.id === "sDari" && i.value) { const x = S.semuaPosko.get(i.value), a = anggaran(x); Object.assign(I, {_regu: a.regu, _ungsi: a.ungsi, _unit: x.id + " · Kec. " + x.kec, _bahaya: x.bahaya === "rob" || x.r ? "rob" : x.bahaya}); simpan(); nanti(() => this.render()); } };
    $("#sCsv").onclick = () => unduh(`sarana-posko-banjir-${t}-${(I._unit || "posko").replace(/\W+/g, "-")}.csv`, csv([["Kelompok", "Sarana", "Satuan", "Kebutuhan", "Sudah ada", "Harga satuan (Rp)", "Estimasi", "Kekurangan (Rp)", "Dasar jumlah", "Sumber harga"],
      ...this.grup.flatMap(([g, it], gi) => it.map(([n, s, m, src, kali], ii) => { const q = jumlahItem(m, kali, regu, ungsi), h = HARGA[n], ada = !!I[this.kunci(gi, ii)], beli = h && !SEWA.has(n) && !LOGISTIK(s);
        return [g, n, s, m ? q : "sesuai survei", ada ? "ya" : "tidak", beli ? h[0] : "", beli && h[2] ? "ya" : "", beli && !ada ? h[0] * q : 0, src, h ? h[1] : ""]; }))]));
    $("#sCetak").onclick = () => { document.body.classList.add("cetak-sarana"); this.grup.forEach((_, gi) => { const b = el.querySelector(`[data-g="${gi}"]`); b.setAttribute("aria-expanded", true); b.nextElementSibling.hidden = false; });
      addEventListener("afterprint", () => document.body.classList.remove("cetak-sarana"), {once: true}); print(); };
    $("#sHapus").onclick = () => { if (!confirm("Kosongkan semua centang di tingkat ini?")) return; Object.keys(I).filter(k => k.startsWith(t + ":")).forEach(k => delete I[k]); simpan(); this.render(); };
    this.skor();
  },
  skor() {
    let n = 0, ada = 0, butuh = 0, kurang = 0;
    this.grup.forEach(([g, it], gi) => { let gn = 0, ga = 0, gk = 0;
      it.forEach(([nm, s, m, , kali], ii) => { const q = jumlahItem(m, kali, this.regu, this.ungsi), h = HARGA[nm], v = !!this.isi[this.kunci(gi, ii)], beli = h && m && !SEWA.has(nm) && !LOGISTIK(s), el = $(`#sk${gi}_${ii}`);
        n++; gn++; if (v) { ada++; ga++; } if (beli) { butuh += h[0] * q; if (!v) { kurang += h[0] * q; gk += h[0] * q; } }
        el.innerHTML = `<small class="m">Kekurangan </small>` + (v ? `<span class="pill l0">Ada</span>` : beli ? rp(h[0] * q) : `<span style="color:var(--ink2);font-size:12px">${SEWA.has(nm) ? "sewa" : LOGISTIK(s) ? "logistik" : !m ? "survei" : "belum ada harga"}</span>`); });
      $(`#sg${gi}`).textContent = Math.round(ga / gn * 100) + "%"; $(`#sr${gi}`).textContent = gk ? "kurang " + rp(gk) : ""; });
    $("#sKpi").innerHTML = [["Kelengkapan", Math.round(ada / n * 100) + "%", `${fmt(ada)} dari ${fmt(n)} item`], ["Biaya kekurangan", rp(kurang), "alat yang belum dicentang"],
      ["Biaya kebutuhan penuh", rp(butuh), "alat beli, tanpa sewa & logistik"], ["Item belum ada", fmt(n - ada), "perlu pengadaan atau pinjam"]].map(([l, v, s]) => kot(l, v, s)).join("");
  },
};
