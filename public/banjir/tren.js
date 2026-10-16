"use strict";
const Tren = {
  jenis: "banjir", prov: "", mMode: "semua", rt: "kab", rh: 0, urut: "tahun",
  get rj() { return ["banjir", "longsor", "rob"].includes(this.jenis) ? this.jenis : null; },
  /* periode siaga: busur terpendek yang memuat semua dasarian berpeluang >= 30%. Musim hujan melintasi tahun baru
     (Nov-Mar), jadi dicari celah terpanjang di lingkaran 36 dasarian; musim mulai sesudah celah itu. -> [awal, akhir] */
  siagaIdx(p) { const i = p.map((v, j) => v >= .3 ? j : -1).filter(j => j >= 0); if (!i.length) return null;
    let g = -1, a = i[0], z = i.at(-1); i.forEach((x, k) => { const nx = k < i.length - 1 ? i[k + 1] : i[0] + 36; if (nx - x > g) { g = nx - x; z = x; a = nx % 36; } }); return [a, z]; },
  siaga(p) { const r = this.siagaIdx(p); return !r ? "tidak ada" : r[0] === r[1] ? DAS(r[0]) : DAS(r[0]) + " – " + DAS(r[1]); },
  peringkat() { const j = this.rj, t = j === "rob" ? "kab" : this.rt;
    return Riwayat.semua(j, t).filter(r => !this.prov || r.prov === this.prov).sort((a, b) => b.skor - a.skor || b.total - a.total); },
  peringkatHTML() {
    const j = this.rj, J = Riwayat.R.jenis[j], t = j === "rob" ? "kab" : this.rt, daf = this._daf = this.peringkat(), per = 50, jml = Math.ceil(daf.length / per), hal = daf.slice(this.rh * per, (this.rh + 1) * per);
    const th = Riwayat.R.tahun, n = J.tahun_cakup.length, i0 = th.indexOf(J.tahun_cakup[0]);
    return `<div class="head" style="margin-top:22px"><div><h2>Peringkat risiko ${NAMA_J[j]} · ${t === "kec" ? "kecamatan" : "kabupaten/kota"} · ${this.prov ? esc(namaProv(this.prov)) : "Indonesia"}</h2>
      <p>Skor 0–100 dari riwayat kejadian ${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)}${J.bobot.inarisk ? " dan bahaya InaRISK" : ""}. Klik baris untuk analisa.${t === "kec" ? " Riwayat kecamatan = riwayat kab/kotanya." : ""}</p></div>
      <div id="rkCtl" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${j === "rob" ? "" : `<div class="seg"><button data-rt="kab" aria-pressed="${t === "kab"}">Kab/Kota</button><button data-rt="kec" aria-pressed="${t === "kec"}">Kecamatan</button></div>`}
      <button class="btn sec" data-rcsv="1">Unduh CSV (${fmt(daf.length)})</button>
      ${jml > 1 ? `<span class="num" style="font-size:12px">${this.rh + 1}/${jml}</span>${this.rh > 0 ? `<button class="btn sec" data-rh="${this.rh - 1}" aria-label="Halaman sebelumnya">‹</button>` : ""}${this.rh < jml - 1 ? `<button class="btn sec" data-rh="${this.rh + 1}" aria-label="Halaman berikutnya">›</button>` : ""}` : ""}</div></div>
      <div class="tw"><table><thead><tr><th class="n">#</th><th>${t === "kec" ? "Kecamatan" : "Kab/Kota"}</th>${t === "kec" ? "<th>Kab/Kota</th>" : ""}<th>Provinsi</th><th class="n">Skor</th><th>Kelas</th><th class="n">Tahun berkejadian</th><th class="n">Total kejadian</th><th class="n">Tahun puncak</th><th class="n">Tren*</th>${J.bobot.inarisk ? "<th class=\"n\">InaRISK</th>" : ""}<th>Pola ${th[i0]}–${th.at(-1)}</th></tr></thead><tbody>
      ${hal.map((r, i) => { const v = r.v.slice(i0), m = Math.max(...v, 1); return `<tr class="klik" data-ri="${this.rh * per + i}" tabindex="0"><td class="n num">${this.rh * per + i + 1}</td><td><b>${esc(r.nama)}</b></td>${t === "kec" ? `<td>${esc(r.kab)}</td>` : ""}<td>${esc(namaProv(r.prov))}</td>
        <td class="n num"><b>${r.skor}</b></td><td><span class="pill l${r.lv}">${r.kelas}</span></td><td class="n num">${fmt(r.tahun)} / ${fmt(n)}</td><td class="n num">${fmt(r.total)}</td><td class="n num">${r.puncak || "–"}</td>
        <td class="n num" style="color:${r.tren >= 1.5 ? "var(--bad)" : r.tren <= .67 ? "var(--ok)" : "inherit"}">${r.tren >= 1 ? "↑" : "↓"} ${fmt(r.tren)}×</td>${J.bobot.inarisk ? `<td class="n num">${fmt(Math.round((t === "kec" ? r.hKec : r.h) * 100) / 100)}</td>` : ""}
        <td><svg viewBox="0 0 ${v.length * 6} 16" width="${v.length * 6}" height="16" aria-hidden="true">${v.map((x, k) => `<rect x="${k * 6}" y="${16 - x / m * 15}" width="4.5" height="${Math.max(.5, x / m * 15)}" fill="${k === v.length - 1 ? "#9aa8b8" : Riwayat.R.la_nina.includes(+th[i0 + k]) ? "#1d4e89" : "#5b8fc7"}"/>`).join("")}</svg></td></tr>`; }).join("")}</tbody></table></div>
      <p class="fnd" style="margin-top:6px">* Tren = laju kejadian ${J.tahun_baru[0]}–${J.tahun_baru.at(-1)} dibanding tahun sebelumnya, dibagi laju nasional (pencatatan DIBI ikut naik tiap tahun). Batang biru tua = tahun La Niña, abu-abu = ${th.at(-1)} berjalan.</p>`; },
  musimHTML() {
    const j = this.rj, M = Riwayat.R.musim[j]; if (!M) return "";
    const kunci = {semua: "p_semua", la_nina: "p_la_nina", biasa: "p_biasa"}[this.mMode], kini = dasKini(), rentang = Riwayat.R.musim[j + "_tahun"];
    const baris = Object.keys(M).sort((a, b) => namaProv(a).localeCompare(namaProv(b))).map(k => { const o = M[k], pp = o[kunci];
      return `<div class="nm" data-mp="${k}" aria-current="${k === this.prov}" title="Tampilkan ${esc(namaProv(k))}">${esc(namaProv(k))}</div>`
        + pp.map((v, i) => `<div class="c${i === kini ? " kini" : ""}" style="background:${warnaMusim(v)}" data-tip="<b>${esc(namaProv(k))} · ${DAS(i)}</b><br>peluang ${Math.round(v * 100)}% (La Niña ${Math.round(o.p_la_nina[i] * 100)}%, biasa ${Math.round(o.p_biasa[i] * 100)}%)<br>rata-rata ${fmt(o.rata[i])} kejadian per 10 hari"></div>`).join("")
        + `<div class="sg num">${this.siaga(pp)}</div>`; }).join("");
    return `<div class="head" style="margin-top:22px"><div><h2>Periode rawan ${NAMA_J[j]} tiap tahun</h2><p>Peluang tiap 10 hari menjadi periode banyak kejadian, DIBI ${rentang[0]}–${rentang[1]}. Kotak bergaris = hari ini. Klik nama provinsi untuk memilihnya.</p></div>
      <div class="seg" id="mMode"><button data-m="semua" aria-pressed="${this.mMode === "semua"}">Semua tahun</button><button data-m="la_nina" aria-pressed="${this.mMode === "la_nina"}">Tahun La Niña</button><button data-m="biasa" aria-pressed="${this.mMode === "biasa"}">Tahun biasa</button></div></div>
      <div class="card pad"><div class="tw" style="border:0;box-shadow:none"><div class="kal"><div></div>${BLN.map(b => `<div class="bl">${b}</div>`).join("")}<div class="bl" style="grid-column:auto;justify-content:flex-start;padding-left:10px">Siaga (≥ 30%)</div>${baris}</div></div>
      <p style="font-size:12px;color:var(--ink2);margin:10px 0 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap">Peluang
        ${[0, .1, .3, .5, .7, .9].map(v => `<span style="display:inline-block;width:22px;height:12px;border-radius:3px;background:${warnaMusim(v)}"></span>${Math.round(v * 100)}%`).join(" ")}
        · La Niña (ONI NOAA): ${Riwayat.R.la_nina.filter(y => y >= rentang[0] && y <= rentang[1]).join(", ") || "–"}</p></div>`; },
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
        <p class="fnd">Sel 0,25° di titik wakil ${r.tingkat === "kec" ? "kecamatan" : "wilayah"} (${cH.lat.toFixed(2)}, ${cH.lon.toFixed(2)}). Garis putus = 50 dan 100 mm (BMKG).</p>`, false) : ""}
      ${sg.length ? lipat("Sungai terdekat (GloFAS)", `<table class="tb3"><thead><tr><th>Titik sungai</th><th class="n">Puncak 7 hari</th><th class="n">Q2</th><th class="n">Jarak</th><th class="n">Status</th></tr></thead><tbody>${sg.map(t => `<tr data-sg="${t.i}" style="cursor:pointer"><td><b>${esc(t.kec)}</b><small>${esc(t.kab)}</small></td><td class="n num">${fmt(Math.round(t.puncak))} m³/s</td><td class="n num">${t.q2 ? fmt(Math.round(t.q2)) : "–"}</td><td class="n num">${fmt(Math.round(t.d))} km</td><td class="n">${pill(t.kelas)}</td></tr>`).join("")}</tbody></table><p class="fnd">Klik baris untuk hidrograf.</p>`, false) : ""}
      ${robD.length ? lipat("Titik pantai terdekat (rob)", `<table class="tb3"><thead><tr><th>Pantai</th><th class="n">Muka laut maks 10 hari</th><th class="n">Ambang p99</th><th class="n">Jarak</th><th class="n">Status</th></tr></thead><tbody>${robD.map(t => `<tr data-rob="${t.i}" style="cursor:pointer"><td><b>${esc(t.kec || t.kab)}</b><small>${esc(t.kab)}</small></td><td class="n num">${fmt(Math.round(t.hm * 100) / 100)} m</td><td class="n num">${fmt(Math.round(t.p99 * 100) / 100)} m</td><td class="n num">${fmt(Math.round(t.d))} km</td><td class="n">${t.pk ? pill(t.pk) : "–"}</td></tr>`).join("")}</tbody></table><p class="fnd">Klik baris untuk grafik pasang.</p>`, j === "rob") : ""}
      ${ina.length ? lipat("Indeks bahaya InaRISK (0–1)", `<table class="tb2"><tbody>${ina.map(x => `<tr${x.k === J.lapis ? ' style="font-weight:700"' : ""}><td>${x.nm}</td><td class="n">${r.tingkat === "kec" ? `${fmt(Math.round(x.rata * 100) / 100)} · ${x.rata >= .66 ? "tinggi" : x.rata >= .33 ? "sedang" : "rendah"}` : `rata-rata ${fmt(Math.round(x.rata * 100) / 100)} · maks ${fmt(Math.round(x.maks * 100) / 100)} · ${fmt(x.tinggi)} dari ${fmt(x.n)} kec. tinggi`}</td></tr>`).join("")}</tbody></table><p class="fnd">Sampel raster InaRISK BNPB di kecamatan${r.tingkat === "kec" ? " ini" : "-kecamatan wilayah ini"}.${j === "rob" ? " Lapisan gelombang tidak dipakai di skor rob (hampir selalu 0 di titik tengah kecamatan pantai)." : ""}</p>`, false) : ""}
      ${lipat(`Kejadian ${NAMA_J[j]} per tahun ${thT[0]}–${thT.at(-1)}${r.tingkat === "kec" ? " · Kab. " + esc(r.kab) : ""} <span style="text-transform:none;letter-spacing:0;font-weight:500">· biru tua = tahun La Niña</span>`, `<svg viewBox="0 -14 ${W} ${B + 30}" width="100%" role="img" aria-label="Kejadian per tahun">${grafik}</svg>
        <p class="fnd">${rLN != null && rB != null ? `Tahun La Niña rata-rata ${fmt(Math.round(rLN * 10) / 10)} kejadian, tahun biasa ${fmt(Math.round(rB * 10) / 10)}${rB ? ` (${fmt(Math.round(rLN / rB * 10) / 10)}×)` : ""}. ` : ""}Puncak ${r.puncak || "–"}. ${th.at(-1)} masih berjalan.${r.tingkat === "kec" ? " BNPB/DIBI mencatat kejadian per kab/kota, jadi grafik ini milik kab/kotanya." : ""}${j === "rob" ? ` Rob baru tercatat rutin sejak ${thC[0]}; tahun pudar tidak lengkap.` : ""}</p>`)}
      ${o ? lipat(`Musim rawan ${esc(pr)} · per 10 hari, kotak bergaris = sekarang`, `${musim}<p class="fnd">Siaga (peluang ≥ 30%): tahun La Niña <b>${this.siaga(o.p_la_nina)}</b>, tahun biasa <b>${this.siaga(o.p_biasa)}</b>; puncak ${DAS(o.puncak)}. Periode rawan = ≥ ${fmt(o.ambang)} kejadian se-provinsi dalam 10 hari.</p>`) : ""}
      ${lipat("Rincian skor", `<table class="skor"><tbody>
        <tr><td>Kekerapan</td><td>${r.tahun} dari ${n} tahun dengan ≥ ${amb} kejadian (${thC[0]}–${thC.at(-1)})</td><td class="n num">${f2(r.fK)} × ${Bb.kekerapan}</td><td class="n num"><b>${fmt(Math.round(r.fK * Bb.kekerapan))}</b></td></tr>
        <tr><td>Besaran</td><td>log(1 + ${fmt(r.total)}) ÷ log(1 + ${fmt(maks)})</td><td class="n num">${f2(r.fB)} × ${Bb.besaran}</td><td class="n num"><b>${fmt(Math.round(r.fB * Bb.besaran))}</b></td></tr>
        <tr><td>Tren</td><td>rasio ${fmt(r.tren)}× relatif nasional → ${r.tren >= 2 ? "batas atas (≥ 2×)" : r.tren <= .5 ? "batas bawah (≤ ½×)" : "skala log antara ½× dan 2×"}</td><td class="n num">${f2(r.fT)} × ${Bb.tren}</td><td class="n num"><b>${fmt(Math.round(r.fT * Bb.tren))}</b></td></tr>
        ${Bb.inarisk ? `<tr><td>InaRISK</td><td>rata-rata bahaya ${J.lapis} kecamatan ${r.tingkat === "kec" ? "di kab/kota" : ""} = ${f2(r.h)}</td><td class="n num">${f2(r.h)} × ${Bb.inarisk}</td><td class="n num"><b>${fmt(Math.round(r.h * Bb.inarisk))}</b></td></tr>` : ""}
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
      <table class="tb2" style="margin-top:6px"><tbody><tr><td>Lokasi</td><td class="n">Kec. ${esc(x.kec)}, ${esc(x.kab)}, ${esc(namaProv(x.prov))}</td></tr><tr><td>Koordinat</td><td class="n">${x.lat.toFixed(4)}, ${x.lon.toFixed(4)}</td></tr>
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
    const JENIS = [["banjir", "Banjir"], ["longsor", "Tanah longsor"], ["rob", "Rob"], ["bandang", "Banjir bandang"], ["cuaca", "Cuaca ekstrem"], ["kering", "Kekeringan"], ["gelombang", "Gelombang & abrasi"], ["semua", "Semua bencana"]].filter(([j]) => Object.values(K.prov || {}).some(p => p[j]));
    const th = K.tahun.map(String), ini = th.at(-1), pv = Object.keys(K.prov || {}), j = this.jenis, rj = this.rj;
    const nil = (k, t, f = "kejadian") => K.prov[k]?.[j]?.[t]?.[f] || 0, wil = this.prov ? [this.prov] : pv;
    const tot = th.map(t => sumA(wil.map(k => nil(k, t)))), totM = th.map(t => sumA(wil.map(k => nil(k, t, "meninggal")))), mx = Math.max(1, ...tot);
    const lalu = tot.slice(0, -1), rata = sumA(lalu) / lalu.length, rank = [...tot].sort((a, b) => b - a).indexOf(tot.at(-1)) + 1;
    /* pola bulanan: rata-rata DIBI per bulan (riwayat.json) vs tahun berjalan (baris DIBI terbaru) */
    const M = rj && Riwayat.R.musim[rj], mp = M ? (this.prov ? [this.prov] : Object.keys(M)).filter(k => M[k]) : [];
    const iklim = BLN.map((_, b) => sumA(mp.map(k => sumA(M[k].rata.slice(b * 3, b * 3 + 3)))));
    const kini = BLN.map(() => 0); if (rj) for (const x of K.kejadian_dibi || []) if (x.tanggal.startsWith(ini) && x.jenis.split("_").includes(rj) && (!this.prov || x.prov === this.prov)) kini[+x.tanggal.slice(5, 7) - 1]++;
    const das = dasKini(), bln = Math.floor(das / 3), sdIni = sumA(kini.slice(0, bln + 1)), sdRata = sumA(mp.map(k => sumA(M[k].rata.slice(0, das + 1))));
    const W = 940, B = 220, gap = (W - 40) / th.length, bw = gap * .7, LN = Riwayat.R.la_nina.map(String);
    const g = tot.map((v, i) => { const h = v / mx * 180, la = LN.includes(th[i]), akhir = i === th.length - 1;
      return `<rect x="${40 + i * gap}" y="${B - h}" width="${bw}" height="${h}" rx="3" fill="${akhir ? "#9aa8b8" : la ? "#1d4e89" : "#5b8fc7"}" data-tip="<b>${th[i]}</b>${la ? " · La Niña" : ""}${akhir ? " · berjalan" : ""}<br>${fmt(v)} kejadian · ${fmt(totM[i])} meninggal"/><text x="${40 + i * gap + bw / 2}" y="${B + 14}" text-anchor="middle" font-size="10.5" opacity="${la ? 1 : .7}" font-weight="${la ? 800 : 400}">${th[i].slice(2)}</text>${v === mx || akhir ? `<text x="${40 + i * gap + bw / 2}" y="${B - h - 5}" text-anchor="middle" font-size="11" font-weight="700">${fmt(v)}</text>` : ""}`; }).join("")
      + `<line x1="40" x2="${W}" y1="${B - rata / mx * 180}" y2="${B - rata / mx * 180}" stroke="currentColor" stroke-dasharray="4 3" opacity=".5"/>`;
    const mi = Math.max(1, ...iklim, ...kini);
    const rankP = pv.map(k => ({k, n: sumA(th.map(t => nil(k, t))), m: sumA(th.map(t => nil(k, t, "meninggal"))), d: sumA(th.map(t => nil(k, t, "terdampak")))})).sort((a, b) => b.n - a.n);
    const nmJ = (JENIS.find(x => x[0] === j) || ["", j])[1].toLowerCase();
    let isi = `<div class="head"><div><h2>Tren & riwayat kejadian ${nmJ} ${th[0]}–${ini}</h2><p>Kejadian tercatat BNPB per tahun, per bulan, dan risiko per wilayah.${K.catatan ? ` <span title="${esc(K.catatan)}" style="text-decoration:underline dotted">Catatan data</span>` : ""}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><div class="seg" id="trJ">${JENIS.map(([k, nm]) => `<button data-j="${k}" aria-pressed="${j === k}">${nm}</button>`).join("")}</div>
      <select id="trProv" class="btn sec" aria-label="Pilih provinsi"><option value="">Indonesia</option>${pv.sort((a, b) => namaProv(a).localeCompare(namaProv(b))).map(k => `<option value="${k}" ${k === this.prov ? "selected" : ""}>${esc(namaProv(k))}</option>`).join("")}</select></div></div>
      <div class="grid g4" style="margin-bottom:14px">${[[`Kejadian ${ini}`, fmt(tot.at(-1)), `peringkat ${rank} dari ${th.length} tahun · berjalan`],
        [`Sampai ${BLN[bln]} ${ini}`, rj && sdRata ? (sdIni >= sdRata ? "+" : "") + fmt(Math.round((sdIni / sdRata - 1) * 100)) + "%" : "–", rj ? `${fmt(sdIni)} vs rata-rata ${fmt(Math.round(sdRata))} periode sama` : "tersedia untuk banjir, longsor, rob"],
        ["Tahun terburuk", th[tot.indexOf(mx)], fmt(mx) + " kejadian"], ["Bulan puncak", rj && mp.length ? BLN[iklim.indexOf(Math.max(...iklim))] : "–", rj ? `rata-rata DIBI ${Riwayat.R.musim[rj + "_tahun"].join("–")}` : ""]]
        .map(([l, v, s]) => kot(l, v, s)).join("")}</div>
      <div class="grid g2"><div class="card pad"><h3 style="font-size:15px">Kejadian per tahun · ${this.prov ? esc(namaProv(this.prov)) : "Indonesia"}</h3>
        <svg viewBox="0 0 ${W} ${B + 22}" width="100%" role="img" aria-label="Kejadian per tahun">${g}</svg>
        <p class="fnd">Total ${fmt(sumA(tot))} kejadian dan ${fmt(sumA(totM))} meninggal. Biru tua = tahun La Niña (${LN.join(", ")}), abu-abu = ${ini} berjalan, garis putus = rata-rata ${th[0]}–${th.at(-2)}.</p></div>
      ${rj ? `<div class="card pad"><h3 style="font-size:15px">Kalender: rata-rata per bulan vs ${ini}</h3>
        <svg viewBox="0 0 552 190" width="100%" role="img" aria-label="Pola bulanan">${iklim.map((v, b) => { const h = v / mi * 150, h2 = kini[b] / mi * 150;
          return `<rect x="${b * 46 + 6}" y="${160 - h}" width="16" height="${h}" rx="3" fill="#5b8fc7" opacity=".6" data-tip="${BLN[b]} rata-rata: ${fmt(Math.round(v))} kejadian"/>
          <rect x="${b * 46 + 24}" y="${160 - h2}" width="16" height="${h2}" rx="3" fill="#1d4e89" data-tip="${BLN[b]} ${ini}: ${fmt(kini[b])} kejadian"/>
          <text x="${b * 46 + 23}" y="176" font-size="10" text-anchor="middle" opacity=".7">${BLN[b]}</text>`; }).join("")}</svg>
        <p class="fnd"><span style="color:#5b8fc7">■</span> rata-rata DIBI ${Riwayat.R.musim[rj + "_tahun"].join("–")} · <span style="color:#1d4e89">■</span> ${ini} (baris DIBI). Posko pra-musim didirikan paling lambat sebulan sebelum bulan puncak.</p></div>` : ""}</div>`;
    if (rj) {
      const J = Riwayat.R.jenis[rj], n = J.tahun_cakup.length, batas = Math.ceil(n * 2 / 3), iA = th.indexOf(ini);
      const lg = Object.keys(J.kab).map(k => Riwayat.rec(k, rj)).filter(r => r.tahun >= batas && (!this.prov || r.prov === this.prov)).sort((a, b) => b[this.urut] - a[this.urut] || b.total - a.total).slice(0, 25);
      const perm = (S.posko?.permanen || []).filter(x => !this.prov || x.prov === this.prov);
      isi += this.musimHTML() + this.peringkatHTML()
        + `<div class="head" style="margin-top:22px"><div><h2>Kab/kota langganan ${NAMA_J[rj]}</h2><p>Ada kejadian di ≥ ${batas} dari ${n} tahun (${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)}). Klik baris untuk analisa.</p></div>
        <div class="seg" id="tUrut"><button data-u="tahun" aria-pressed="${this.urut === "tahun"}">Paling sering</button><button data-u="total" aria-pressed="${this.urut === "total"}">Paling banyak</button></div></div>
        <div class="tw"><table><thead><tr><th>Kab/Kota</th><th>Provinsi</th><th class="n">Tahun berkejadian</th><th>Kekerapan</th><th class="n">Total ${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)}</th><th class="n">${ini}</th><th class="n">Skor</th></tr></thead><tbody>
        ${lg.map(r => `<tr class="klik" data-kl="${esc(r.kunci)}" tabindex="0"><td><b>${esc(r.nama)}</b></td><td>${esc(namaProv(r.prov))}</td><td class="n num"><b>${fmt(r.tahun)}</b> / ${fmt(n)}</td><td><span class="bar" style="display:block;width:120px;height:6px;border-radius:4px;background:var(--surface)"><i style="display:block;height:100%;width:${r.tahun / n * 100}%;background:linear-gradient(90deg,#5b8fc7,#1d4e89);border-radius:4px"></i></span></td>
          <td class="n num">${fmt(r.total)}</td><td class="n num">${fmt(r.v[iA])}</td><td class="n num"><span class="pill l${r.lv}">${r.skor}</span></td></tr>`).join("") || `<tr><td colspan="7" class="kosong">Tidak ada kab/kota dengan kejadian di ≥ ${batas} tahun${this.prov ? " di provinsi ini" : ""}.</td></tr>`}</tbody></table></div>
        <div class="head" style="margin-top:22px"><div><h2>Rekomendasi posko permanen banjir · ${this.prov ? esc(namaProv(this.prov)) : "Indonesia"}</h2><p>Satu posko pra-musim di kab/kota paling sering banjir, di kecamatan berbahaya banjir tertinggi. Klik baris untuk rincian.</p></div></div>
        <div class="tw"><table><thead><tr><th>Kode</th><th>Kecamatan</th><th>Kab/Kota</th><th>Provinsi</th><th class="n">Kejadian banjir kab</th><th class="n">Bahaya InaRISK</th><th class="n">Skor risiko kab</th><th></th></tr></thead><tbody>
        ${perm.map(x => { const rk = Riwayat.rec(x.prov + "|" + x.kab, "banjir"); return `<tr class="klik" data-pp="${x.id}" tabindex="0"><td><b>${x.id}</b></td><td>${esc(x.kec)}</td><td>${esc(x.kab)}</td><td>${esc(namaProv(x.prov))}</td><td class="n num">${fmt(x.kejadian)}</td><td class="n num">${fmt(x.bahaya)}</td><td class="n num">${rk ? `<span class="pill l${rk.lv}">${rk.skor}</span>` : "–"}</td><td><button class="link" data-lp="${x.id}">Peta</button></td></tr>`; }).join("") || `<tr><td colspan="8" class="kosong">Tidak ada posko permanen di provinsi ini.</td></tr>`}</tbody></table></div>`;
    } else isi += `<p class="fnd" style="margin-top:14px">Peringkat risiko, kalender musim, dan kab/kota langganan tersedia untuk banjir, tanah longsor, dan rob.</p>`;
    isi += `<div class="head" style="margin-top:22px"><div><h2>Per provinsi · ${nmJ} ${th[0]}–${ini}</h2><p>Klik provinsi untuk memilihnya.</p></div></div>
      <div class="tw"><table><thead><tr><th class="n">#</th><th>Provinsi</th><th class="n">Kejadian</th><th class="n">Meninggal</th><th class="n">Terdampak</th><th>Pola ${th[0]}–${ini}</th></tr></thead><tbody>
      ${rankP.map((r, i) => { const v = th.map(t => nil(r.k, t)), m = Math.max(1, ...v); return `<tr class="klik" data-pv="${r.k}" tabindex="0" ${r.k === this.prov ? 'style="background:var(--surface)"' : ""}><td class="n num">${i + 1}</td><td><b>${esc(namaProv(r.k))}</b></td><td class="n num">${fmt(r.n)}</td><td class="n num">${fmt(r.m)}</td><td class="n num">${rb(r.d)}</td>
        <td><svg viewBox="0 0 ${v.length * 6} 16" width="${v.length * 6}" height="16" aria-hidden="true">${v.map((x, k) => `<rect x="${k * 6}" y="${16 - x / m * 15}" width="4.5" height="${Math.max(.5, x / m * 15)}" fill="${LN.includes(th[k]) ? "#1d4e89" : "#5b8fc7"}"/>`).join("")}</svg></td></tr>`; }).join("")}</tbody></table></div>
      ${rj ? lipat("Cara menghitung skor risiko", `<p>Skor 0–100 per kab/kota dan provinsi, dinilai se-Indonesia (scripts/banjir/riwayat.py):</p><ul>
        <li><b>Kekerapan ${Riwayat.R.jenis[rj].bobot.kekerapan}</b>: tahun berkejadian (kab/kota ≥ 1, provinsi ≥ ${Riwayat.R.jenis[rj].ambang_prov} kejadian) ÷ tahun tercakup (${Riwayat.R.jenis[rj].tahun_cakup.join(", ")})</li>
        <li><b>Besaran ${Riwayat.R.jenis[rj].bobot.besaran}</b>: log(1 + total kejadian) ÷ log(1 + total terbesar)</li>
        <li><b>Tren ${Riwayat.R.jenis[rj].bobot.tren}</b>: laju ${Riwayat.R.jenis[rj].tahun_baru.join(", ")} dibanding sebelumnya, dibagi laju nasional; ½× atau kurang = 0, 2× atau lebih = 1</li>
        ${Riwayat.R.jenis[rj].bobot.inarisk ? `<li><b>InaRISK ${Riwayat.R.jenis[rj].bobot.inarisk}</b>: rata-rata indeks bahaya ${Riwayat.R.jenis[rj].lapis} kecamatan di wilayah itu</li>` : "<li>Rob tanpa InaRISK: lapisan gelombang hampir selalu 0 di titik tengah kecamatan pantai</li>"}</ul>
        <p>Kelas: 10% skor teratas sangat tinggi, 10–30% tinggi, 30–60% sedang, sisanya rendah. BNPB dan DIBI mencatat kejadian per kab/kota, bukan per kecamatan; skor kecamatan = skor kab/kota × (0,4 + 0,6 × bahaya InaRISK kecamatan). Peta Riwayat membagi kejadian kab/kota ke kecamatannya berbobot 0,1 + bahaya InaRISK.</p>
        <p>Kalender musim: ambang = persentil 90 jumlah kejadian per 10 hari di provinsi itu; peluang = porsi tahun yang 10 hari itu melewati ambang. Tahun La Niña dari indeks ONI NOAA CPC.</p>
        <p>Keterbatasan: DIBI bergantung pada laporan daerah (pencatatan naik tajam setelah 2018), satu kejadian lintas kabupaten bisa tercatat beberapa kali, DKI Jakarta tercatat jauh lebih sedikit dari kenyataan, dan rob baru tercatat rutin sejak ${Riwayat.R.jenis.rob.tahun_cakup[0]}.</p>`, false) : ""}`;
    el.innerHTML = isi;
    $("#trJ").onclick = e => { const b = e.target.closest("button"); if (b) { this.jenis = b.dataset.j; this.rh = 0; nanti(() => this.render()); } };
    $("#trProv").onchange = e => { this.prov = e.target.value; this.rh = 0; nanti(() => this.render()); };
    const rk = el.querySelector("#rkCtl"); if (rk) rk.onclick = e => { const b = e.target.closest("[data-rt],[data-rh],[data-rcsv]"); if (!b) return;
      if (b.dataset.rcsv) { const t = this.rj === "rob" ? "kab" : this.rt;
        return unduh(`peringkat-risiko-${this.rj}-${t}${this.prov ? "-" + this.prov : ""}.csv`, csv([["Peringkat", "Wilayah", "Kab/Kota", "Provinsi", "Skor", "Kelas", "Tahun berkejadian", "Tahun tercakup", "Total kejadian", "Tahun puncak", "Tren relatif nasional", "InaRISK"],
          ...this.peringkat().map((r, i) => [i + 1, r.nama, r.kab, namaProv(r.prov), r.skor, r.kelas, r.tahun, Riwayat.R.jenis[this.rj].tahun_cakup.length, r.total, r.puncak, r.tren, t === "kec" ? r.hKec : r.h])])); }
      if (b.dataset.rt) { this.rt = b.dataset.rt; this.rh = 0; } if (b.dataset.rh) this.rh = +b.dataset.rh; nanti(() => this.render()); };
    const mm = el.querySelector("#mMode"); if (mm) mm.onclick = e => { const b = e.target.closest("button"); if (!b) return; this.mMode = b.dataset.m; nanti(() => this.render()); };
    const tu = el.querySelector("#tUrut"); if (tu) tu.onclick = e => { const b = e.target.closest("button"); if (!b) return; this.urut = b.dataset.u; nanti(() => this.render()); };
    const enter = (tr, f) => { tr.onclick = f; tr.onkeydown = e => { if (e.key === "Enter") f(e); }; };
    el.querySelectorAll("[data-mp]").forEach(x => x.onclick = () => { this.prov = x.dataset.mp === this.prov ? "" : x.dataset.mp; this.rh = 0; nanti(() => this.render()); });
    el.querySelectorAll("tr[data-pv]").forEach(tr => enter(tr, () => { this.prov = tr.dataset.pv === this.prov ? "" : tr.dataset.pv; this.rh = 0; nanti(() => { this.render(); $("#p-tren").scrollTo({top: 0, behavior: "smooth"}); }); }));
    el.querySelectorAll("tr[data-ri]").forEach(tr => enter(tr, () => this.rinci(this._daf[+tr.dataset.ri])));
    el.querySelectorAll("tr[data-kl]").forEach(tr => enter(tr, () => this.rinci(Riwayat.rec(tr.dataset.kl, this.rj))));
    el.querySelectorAll("tr[data-pp]").forEach(tr => enter(tr, e => { if (e.target.closest("[data-lp]")) return; this.posko(tr.dataset.pp); }));
    el.querySelectorAll("[data-lp]").forEach(x => x.onclick = () => { const p = S.posko.permanen.find(q => q.id === x.dataset.lp); bukaTab("peta"); S.jalur = [p.prov, p.kab];
      Peta.aturWilayah().then(() => { peta.flyTo({center: [p.lon, p.lat], zoom: 10}); new maplibregl.Popup({closeButton: false}).setLngLat([p.lon, p.lat]).setHTML(`<b>Posko permanen ${esc(p.id)}</b><br>Kec. ${esc(p.kec)}, ${esc(p.kab)}`).addTo(peta); }); });
  },
};
