"use strict";
/* Tab Insight: kartu format Insight (pil label, angka kunci Kartu.hl di judul, sumber lembaga). Semua angka dihitung dari berkas data (hitung.js);
   kartu yang datanya tak ada atau tak mencakup hari ini dibuang atau berjudul jujur, tidak diisi tebakan. */
const IK_EY = {abrasi: '<path d="M2 18c3-3 5-3 8 0s5 3 8 0M3 8l5 3 4-6 4 8 5-3"/>', rob: '<path d="M12 3s-6 6.7-6 11a6 6 0 0 0 12 0c0-4.3-6-11-6-11Z"/>', pasang: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', ombak: '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2"/>', catatan: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
const eyP = k => `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_EY[k]}</svg>`;
const kartuP = (ey, ik, judul, isi, sumber, leg = null) => Kartu.kartu(eyP(ik) + ey, judul, isi, sumber, "", leg);
const lebarKartu = () => Math.min(900, ($("#insight")?.clientWidth || $("#tren")?.clientWidth || 700) - 48);
const tglTahun = t => tglSgk(t) + " " + t.slice(0, 4);
const nmT = t => t.desa || t.id;
const tglWIB0 = t => Pesisir.tglWIB(Date.parse(t));
const cat = t => `<p class="gp-cat">${t}</p>`;

const Insight = {
  mb: n => fmt(Math.round(Math.abs(n))),   /* m per tahun dibulatkan ke bilangan bulat */
  exAbrasi() { if (!S.abr) return ""; const W = Pesisir.abrasiSitus(S.abr), T = Pesisir.abrasiTercepat(S.abr, 8); if (!W.length || !T.length) return "";
    const w = W[0], sw = S.abr.situs.find(x => x.id === w.id), nSitus = S.abr.transek.filter(t => t.situs === w.id && t.kelas).length, atas = T.filter(x => x.laju < 2 * w.median).length;
    const ket = `${fmt(w.n)} dari ${fmt(nSitus)} transek ${esc(w.nama)} lolos saringan lompatan; median seluruh transek tidak dihitung. ${atas ? `${fmt(atas)} batang lebih dari dua kali median situs (${this.mb(w.median)} m per tahun, garis putus). ` : ""}`;
    const rows = T.map(x => ({n: nmT(x) + " " + x.id.split("-")[1], v: Math.abs(x.laju), w: ABR.abrasi[1], txt: this.mb(x.laju) + " m/th", tip: `<b>${esc(nmT(x))}, ${esc(x.id)}</b><br>Laju: ${m1(x.laju)} m per tahun<br>Selang 95%: ${m1(x.ci95[0])} sampai ${m1(x.ci95[1])}<br>Keyakinan: ${x.keyakinan}<br>Periode: ${x.periode[0]} sampai ${x.periode[1]}`}));
    return kartuP("Abrasi pantai", "abrasi", `${Kartu.hl(this.mb(w.median) + " m per tahun")} median mundur garis pantai di ${esc(w.nama)}, ${fmt(w.n)} transek abrasi nyata bersih`,
      GrafikP.batangH(rows, {lebar: lebarKartu(), tengah: {v: Math.abs(w.median), n: "median situs (" + this.mb(w.median) + " m/th)"}}) + cat(ket + "Batang: transek abrasi nyata berkeyakinan sedang atau tinggi, tanpa transek yang garisnya melompat lebih dari 300 m dalam satu tahun dan tanpa transek bangunan (tanggul, reklamasi). Perkiraan dari citra satelit, belum dikoreksi pasang surut, belum dicek lapangan, dan sebagian transek mengandung perubahan tutupan (tambak, mangrove)."),
      "Landsat USGS lewat Microsoft Planetary Computer, olahan Centurisk97, dibuat " + tglTahun((S.abr.dibuat || "").slice(0, 10)), [[ABR.abrasi[1], "Abrasi nyata, lolos saringan lompatan"]]); },
  exSitus() { if (!S.abr) return ""; const P = Pesisir.perSitus(S.abr).filter(s => s.n), a = P.reduce((n, s) => n + s.abrasi, 0), k = P.reduce((n, s) => n + s.akresi, 0), B = P.reduce((n, s) => n + s.bersih, 0), N = P.reduce((n, s) => n + s.n, 0);
    const KL = [["abrasi", ABR.abrasi[0], ABR.abrasi[1]], ["akresi", ABR.akresi[0], ABR.akresi[1]], ["tidak", ABR["tidak nyata"][0], ABR["tidak nyata"][1]], ["tinjau", "Ditinjau (lompatan lebih dari 300 m per tahun)", "#6b7280"], ["gangguan", "Bangunan (tanggul, reklamasi)", "#2f3b4a"]];
    const rows = P.map(s => ({n: s.nama, segs: KL.map(([f, nm, w]) => ({v: s[f], w, tip: `<b>${esc(s.nama)}</b><br>${nm}: ${fmt(s[f])} dari ${fmt(s.n)} transek<br>Median laju transek bersih: ${m1(s.median)} m per tahun`}))}));
    return kartuP("Abrasi pantai", "abrasi", `${Kartu.hl(fmt(a) + " dari " + fmt(B) + " transek bersih")} menunjukkan abrasi nyata, ${fmt(k)} akresi nyata`,
      GrafikP.tumpuk(rows, {lebar: lebarKartu()}) + cat(`Dari ${fmt(N)} transek, ${fmt(N - B)} tidak dihitung ke kelas karena garisnya melompat lebih dari 300 m dalam satu tahun atau karena bangunan. Kelas nyata bila selang kepercayaan 95% laju tidak memuat nol. Transek yang garisnya maju karena bangunan (Patimban, tanggul tol) tidak ikut laju. Akresi lain di Subang dan Indramayu belum diperiksa sebabnya.`),
      "Landsat USGS lewat Microsoft Planetary Computer, olahan Centurisk97", KL.map(([, n, w]) => [w, n])); },
  exRob() { if (!S.rob) return ""; const tg = HARI_INI(), r = Pesisir.robHari(S.rob, tg), sumber = "Open-Meteo Marine (MeteoFrance SMOC), olahan Centurisk97, dibuat " + jamWIB(S.rob.dibuat);
    if (!r) return kartuP("Rob", "rob", `Data rob terakhir dibuat ${esc(jamWIB(S.rob.dibuat))} dan belum mencakup ${tglSgk(tg)}`, cat("Status rob tidak ditampilkan sampai data baru terbit."), sumber);
    const seri = Pesisir.robSeri(S.rob, tg, 7), aktif = r.aktif.length, N = r.ada.length, tanpa = r.L.length - N, far = S.rob.validasi?.persentil?.p95?.far;
    const cols = seri.map(d => ({n: d.tgl === tg ? "Hari ini" : tglSgk(d.tgl).replace(" ", " "), v: d.n, w: d.siaga ? TINGKAT[2][1] : d.n ? TINGKAT[1][1] : TINGKAT[0][1], tip: `<b>${tglSgk(d.tgl)}</b><br>Waspada atau lebih: ${fmt(d.n)} titik<br>Siaga atau lebih: ${fmt(d.siaga)} titik`}));
    const daftar = r.aktif.slice(0, 5).map(x => `<tr><td>${pilT(x.lv)}</td><td translate="no">${esc(x.t.kec)}, ${esc(x.t.kab)}</td><td class="n">${m1(x.h)} m</td></tr>`).join("");
    const kartu = kartuP("Rob", "rob", aktif ? `${Kartu.hl(fmt(aktif) + " dari " + fmt(N) + " titik")} pesisir berstatus Waspada atau lebih ${kapan(tg)}` : `Tidak ada dari ${fmt(N)} titik pesisir berambang yang berstatus Waspada ${kapan(tg)}`,
      (seri.some(d => d.n) ? GrafikP.batangV(cols, {lebar: lebarKartu()}) : "") + (daftar ? `<div class="tw gp-pk"><table><tbody>${daftar}</tbody></table></div>` : "") + cat(`Status dari muka laut model terhadap ambang persentil 95 dan 99 tiap titik, dihitung dari arsip model sejak ${S.rob.validasi?.periode?.[0] ? tglTahun(S.rob.validasi.periode[0]) : "Nov 2022"}; hitungan Centurisk97, bukan peringatan resmi.${far == null ? "" : ` Pada uji ${fmt(S.rob.validasi.kejadian_diuji)} kejadian DIBI, sekitar ${fmt(Math.round(far * 100))}% hari terpicu Waspada tidak bertepatan dengan kejadian DIBI (DIBI tidak mencatat semua rob).`}${tanpa ? ` ${fmt(tanpa)} titik belum punya arsip untuk ambang dan tidak dihitung.` : ""}`),
      sumber, seri.some(d => d.n) ? [[TINGKAT[1][1], "Waspada"], [TINGKAT[2][1], "Siaga atau lebih"]] : null);
    return far == null ? kartu : kartu.replace(/(<span class="ex-ey">.*?<\/span>)/s, `$1<span class="ex-ey" style="margin-left:6px">Uji retrospektif: ${fmt(Math.round(far * 100))}% hari terpicu tanpa kejadian DIBI</span>`); },
  exRobBmkg() { const tg = HARI_INI(), B = Pesisir.robBmkg(S.rob, tg); if (!B.length) return "";
    const baris = B.map(b => `<tr><td translate="no">${esc(b.wilayah)}</td><td translate="no">${esc(b.lokasi)}</td><td>${tglSgk(b.tanggal_mulai)} sampai ${tglSgk(b.tanggal_selesai)}</td></tr>`).join("");
    return kartuP("Rob", "rob", `${Kartu.hl(fmt(B.length) + " peringatan")} rob BMKG berlaku ${kapan(tg)}`, `<div class="tw gp-pk"><table><thead><tr><th>Wilayah</th><th>Lokasi</th><th>Berlaku</th></tr></thead><tbody>${baris}</tbody></table></div>`,
      "BMKG Maritim, diambil " + jamWIB(S.rob.bmkg.diambil || S.rob.dibuat)); },
  exPasang() { if (!S.pas) return ""; const tg = HARI_INI(), P = Pesisir.pasutPekan(S.pas, tg, 7); if (!P.length) return "";
    const t = P[0], rows = P.slice(0, 10).map(x => ({n: x.s.nama, v: x.cm, w: PASUT[kelasPasut(x.s, x.cm)][1], txt: fmt(x.cm) + " cm", tip: `<b>${esc(x.s.nama)}, ${esc(x.s.prov)}</b><br>Pasang tertinggi: ${fmt(x.cm)} cm, ${tglSgk(x.tgl)} pukul ${x.jam} WIB<br>p90 stasiun: ${fmt(x.s.p90)} cm`}));
    return kartuP("Pasang surut", "pasang", `${Kartu.hl(fmt(t.cm) + " cm")} pasang tertinggi tujuh hari ke depan, di ${esc(t.s.nama)} ${kapan(t.tgl)}`,
      GrafikP.batangH(rows, {lebar: lebarKartu()}) + cat("Angka terhadap rata-rata laut (MSL). Warna batang membandingkan dengan persentil puncak harian stasiun itu sendiri (p75, p90); itu penanda relatif, bukan ambang banjir."),
      "BMKG Maritim, prediksi pasang surut, dibuat " + jamWIB(S.pas.dibuat), PASUT.map(([n, w], k) => [w, n, rows.some(r => r.w === w)]).filter(x => x[2]).map(x => [x[0], x[1]])); },
  exOmbak() { if (!S.gel) return ""; const tg = HARI_INI(), G = Pesisir.gelHari(S.gel, tg);
    if (!G.length) return kartuP("Gelombang", "ombak", `Data gelombang model terakhir dibuat ${esc(jamWIB(S.gel.dibuat))}, belum mencakup ${tglSgk(tg)}`, cat("Gelombang model tidak ditampilkan sampai data baru terbit."), "Open-Meteo Marine (model gelombang)");
    const t = G[0], rows = G.slice(0, 10).map(x => ({n: x.nama || namaProv(x.prov), v: x.hs, w: Pesisir.kelasGel(x.hs)[2], txt: m1(x.hs) + " m", tip: `<b>${esc(x.nama || namaProv(x.prov))}, ${esc(namaProv(x.prov))}</b><br>Gelombang tertinggi: ${m1(x.hs)} m<br>Kelas: ${Pesisir.kelasGel(x.hs)[1]}`}));
    const kelas = Pesisir.KELAS_GEL.filter(c => G.some(x => Pesisir.kelasGel(x.hs) === c));
    return kartuP("Gelombang", "ombak", `${Kartu.hl(m1(t.hs) + " m")} gelombang model tertinggi, di ${esc(t.nama || namaProv(t.prov))} ${kapan(tg)}`, GrafikP.batangH(rows, {lebar: lebarKartu()}) + cat("Keluaran model di titik pelabuhan dan pesisir, bukan peringatan resmi; kelas mengikuti ambang BMKG Maritim."),
      "Open-Meteo Marine (model gelombang), dibuat " + jamWIB(S.gel.dibuat), kelas.map(c => [c[2], c[1]])); },
  exBmkgGel() { if (!S.per) return ""; const G = S.glb, tg = HARI_INI(), sumber = "BMKG Maritim, terbit " + jamWIB(S.per.dibuat);
    if (!G.length && tglWIB0(S.per.dibuat) !== tg) return kartuP("Gelombang", "ombak", `Data peringatan BMKG terakhir ${esc(jamWIB(S.per.dibuat))}, belum mencakup ${tglSgk(tg)}`, cat("Peringatan gelombang tidak ditampilkan sebagai \"tidak ada\" karena data yang ada bukan data hari ini."), sumber);
    if (!G.length) return kartuP("Gelombang", "ombak", `Tidak ada peringatan gelombang tinggi BMKG yang berlaku pada data terbit ${esc(jamWIB(S.per.dibuat))}`, cat("Peringatan BMKG terbit berkala, jadi ini bukan pernyataan bahwa laut aman."), sumber);
    const nm = ["Tinggi", "Sangat tinggi", "Ekstrem"], rows = G.slice(0, 12).map(o => ({n: namaProv(o.prov), segs: o.kelas.map((v, i) => ({v, w: Pesisir.KELAS_GEL.find(c => c[1] === nm[i])[2], tip: `<b>${esc(namaProv(o.prov))}</b><br>${nm[i]}: ${fmt(v)} perairan`}))}));
    return kartuP("Gelombang", "ombak", `${Kartu.hl(fmt(G.length) + " provinsi")} dalam peringatan gelombang tinggi BMKG ${kapan(tg)}`, GrafikP.tumpuk(rows, {lebar: lebarKartu()}) + cat("Panjang batang adalah jumlah perairan yang diberi peringatan; kelas sedang (1,25 sampai 2,5 m) bukan peringatan dan tidak dihitung."),
      sumber, nm.map((n, i) => [Pesisir.KELAS_GEL.find(c => c[1] === n)[2], n, G.some(o => o.kelas[i] > 0)]).filter(x => x[2]).map(x => [x[0], x[1]])); },
  render() { const el = $("#insight"); if (el._ok) return; el._ok = 1;
    const h = ["Rob", "RobBmkg", "Pasang", "Omb", "BmkgGel", "Abrasi", "Situs"].map(k => { try { return this["ex" + (k === "Omb" ? "Ombak" : k)]() || ""; } catch (e) { console.error(e); return ""; } }).filter(Boolean);
    el.innerHTML = h.length ? `<div class="gp-kartu">${h.join("")}</div>` : `<p class="kosong">Belum ada data yang terbaca.</p>`; }
};
