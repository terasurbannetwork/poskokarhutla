"use strict";
/* Tab Insight: kartu format Insight (pil label, angka kunci Kartu.hl di judul, sumber lembaga). Semua angka dihitung dari berkas data (hitung.js);
   kartu yang datanya tak ada atau tak mencakup hari ini dibuang atau berjudul jujur, tidak diisi tebakan. */
const IK_EY = {abrasi: '<path d="M2 18c3-3 5-3 8 0s5 3 8 0M3 8l5 3 4-6 4 8 5-3"/>', rob: '<path d="M12 3s-6 6.7-6 11a6 6 0 0 0 12 0c0-4.3-6-11-6-11Z"/>', pasang: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', ombak: '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2"/>', catatan: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
const eyP = k => `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_EY[k]}</svg>`;
/* kartu standar (AGENTS.md 3.5, 11 Nov 2026): pil kategori berikon + NAMA SEKSI di kepala, tanpa kalimat temuan, tanpa kaki "Sumber:".
   nama = nama seksi; judul = kalimat temuan, hanya dipakai sebagai isi keadaan kosong (isi ""); o.cat = catatan metode, dilipat bersama sumber di <details>;
   o.pil = pil status (Hipotesis, Perkiraan satelit); leg = [[warna, nama]] tetap di kaki sebagai legenda. */
const KAT_EY = {abrasi: "Abrasi", rob: "Rob", pasang: "Pasang surut", ombak: "Gelombang", catatan: "Catatan"};
const PIL_HIP = () => pilW("Hipotesis", "#e58a45"), PIL_SAT = () => pilW("Perkiraan satelit", "#e58a45");
const lipat = (ring, adaCat) => ring.length ? `<details class="gp-lip"><summary>${adaCat ? "Cara membaca dan sumber data" : "Sumber data"}</summary><ul>${ring.map(c => `<li>${c}</li>`).join("")}</ul></details>` : "";
const kartuP = (nama, ik, judul, isi, sumber, leg = null, o = {}) => {
  const cats = [].concat(o.cat || []).filter(Boolean), ring = [...cats, sumber ? "Sumber data: " + sumber + "." : ""].filter(Boolean);
  const bd = (isi || `<p class="kosong">${judul}.${o.kosong ? " " + o.kosong : ""}</p>`) + lipat(ring, cats.length > 0);
  const ft = leg?.length ? `<footer class="ex-ft"><span class="ex-leg">${leg.map(([w, n]) => `<span><i style="background:${w}"></i>${n}</span>`).join("")}</span></footer>` : "";
  return `<article class="ex ex-std gp-ex"><header class="ex-hd"><span class="ex-ey">${eyP(ik)}${KAT_EY[ik] || ""}${o.pil || ""}</span><div class="ex-jd"><h3>${nama}</h3></div></header><div class="ex-bd">${bd}</div>${ft}</article>`; };
const lebarKartu = () => Math.min(900, ($("#insight")?.clientWidth || $("#tren")?.clientWidth || 700) - 48);
const tglTahun = t => tglSgk(t) + " " + t.slice(0, 4);
const nmT = t => t.desa || t.id;
const tglWIB0 = t => Pesisir.tglWIB(Date.parse(t));
const cat = t => `<p class="gp-cat">${t}</p>`;   /* catatan pendek satu kalimat yang wajib terlihat (bukan penjelasan metode) */

const Insight = {
  mb: n => fmt(Math.round(Math.abs(n))),   /* m per tahun dibulatkan ke bilangan bulat */
  exAbrasi() { if (!S.abr) return ""; const W = Pesisir.abrasiSitus(S.abr), T = Pesisir.abrasiTercepat(S.abr, 8); if (!W.length || !T.length) return "";
    const w = W[0], nSitus = S.abr.transek.filter(t => t.situs === w.id && t.kelas).length, atas = T.filter(x => x.laju < 2 * w.median).length;
    const rows = T.map(x => ({n: nmT(x) + " " + x.id.split("-")[1], v: Math.abs(x.laju), w: ABR.abrasi[1], txt: this.mb(x.laju) + " m/th", tip: `<b>${esc(nmT(x))}, ${esc(x.id)}</b><br>Laju: ${m1(x.laju)} m per tahun<br>Selang 95%: ${m1(x.ci95[0])} sampai ${m1(x.ci95[1])}<br>Keyakinan: ${x.keyakinan}<br>Periode: ${x.periode[0]} sampai ${x.periode[1]}`}));
    /* angka kunci situs dengan median mundur tercepat jadi kotak angka; penjelasan saringan dilipat */
    const ang = `<div class="gp-ang"><div><small>Median mundur ${esc(w.nama)}</small><b>${this.mb(w.median)} m per tahun</b><em>garis putus pada grafik</em></div><div><small>Transek abrasi nyata bersih</small><b>${fmt(w.n)} dari ${fmt(nSitus)}</b><em>lolos saringan lompatan</em></div>${atas ? `<div><small>Lebih dari dua kali median situs</small><b>${fmt(atas)} batang</b></div>` : ""}</div>`;
    return kartuP("Transek abrasi tercepat", "abrasi", `${Kartu.hl(this.mb(w.median) + " m per tahun")} median mundur garis pantai di ${esc(w.nama)}, ${fmt(w.n)} transek abrasi nyata bersih`,
      GrafikP.batangH(rows, {lebar: lebarKartu(), tengah: {v: Math.abs(w.median), n: "median situs (" + this.mb(w.median) + " m/th)"}}) + ang,
      "Landsat USGS lewat Microsoft Planetary Computer, olahan Centurisk97, dibuat " + tglTahun((S.abr.dibuat || "").slice(0, 10)), [[ABR.abrasi[1], "Abrasi nyata, lolos saringan lompatan"]],
      {pil: PIL_SAT(), cat: [`Median situs dihitung dari transek yang lolos saringan lompatan saja, bukan dari seluruh transek ${esc(w.nama)}.`,
        "Batang adalah transek abrasi nyata berkeyakinan sedang atau tinggi, tanpa transek yang garisnya melompat lebih dari 300 m dalam satu tahun dan tanpa transek bangunan (tanggul, reklamasi).",
        "Angka adalah perkiraan dari citra satelit, belum dikoreksi pasang surut, dan belum dicek lapangan. Sebagian transek mengandung perubahan tutupan lahan (tambak, mangrove)."]}); },
  exSitus() { if (!S.abr) return ""; const P = Pesisir.perSitus(S.abr).filter(s => s.n), a = P.reduce((n, s) => n + s.abrasi, 0), k = P.reduce((n, s) => n + s.akresi, 0), B = P.reduce((n, s) => n + s.bersih, 0), N = P.reduce((n, s) => n + s.n, 0);
    const KL = [["abrasi", ABR.abrasi[0], ABR.abrasi[1]], ["akresi", ABR.akresi[0], ABR.akresi[1]], ["tidak", ABR["tidak nyata"][0], ABR["tidak nyata"][1]], ["tinjau", "Ditinjau (lompatan lebih dari 300 m per tahun)", "#6b7280"], ["gangguan", "Bangunan (tanggul, reklamasi)", "#2f3b4a"]];
    const rows = P.map(s => ({n: s.nama, segs: KL.map(([f, nm, w]) => ({v: s[f], w, tip: `<b>${esc(s.nama)}</b><br>${nm}: ${fmt(s[f])} dari ${fmt(s.n)} transek<br>Median laju transek bersih: ${m1(s.median)} m per tahun`}))}));
    const ang = `<div class="gp-ang"><div><small>Abrasi nyata</small><b>${fmt(a)} dari ${fmt(B)}</b><em>transek bersih</em></div><div><small>Akresi nyata</small><b>${fmt(k)} dari ${fmt(B)}</b><em>transek bersih</em></div><div><small>Tidak dihitung ke kelas</small><b>${fmt(N - B)} dari ${fmt(N)}</b><em>lompatan atau bangunan</em></div></div>`;
    return kartuP("Kelas transek per situs", "abrasi", `${Kartu.hl(fmt(a) + " dari " + fmt(B) + " transek bersih")} menunjukkan abrasi nyata, ${fmt(k)} akresi nyata`,
      GrafikP.tumpuk(rows, {lebar: lebarKartu()}) + ang,
      "Landsat USGS lewat Microsoft Planetary Computer, olahan Centurisk97", KL.map(([, n, w]) => [w, n]),
      {pil: PIL_SAT(), cat: [`Dari ${fmt(N)} transek, ${fmt(N - B)} tidak dihitung ke kelas karena garisnya melompat lebih dari 300 m dalam satu tahun atau karena bangunan.`,
        "Kelas disebut nyata bila selang kepercayaan 95% laju tidak memuat nol.",
        "Transek yang garisnya maju karena bangunan (Patimban, tanggul tol) tidak ikut laju. Penyebab akresi lain di Subang dan Indramayu belum diperiksa."]}); },
  exRob() { if (!S.rob) return ""; const tg = HARI_INI(), r = Pesisir.robHari(S.rob, tg), sumber = "Open-Meteo Marine (MeteoFrance SMOC), olahan Centurisk97, dibuat " + jamWIB(S.rob.dibuat);
    if (!r) return kartuP("Status rob model", "rob", `Data rob terakhir dibuat ${esc(jamWIB(S.rob.dibuat))} dan belum mencakup ${tglSgk(tg)}`, "", sumber, null, {pil: PIL_HIP(), kosong: "Status rob tidak ditampilkan sampai data baru terbit."});
    const seri = Pesisir.robSeri(S.rob, tg, 7), aktif = r.aktif.length, N = r.ada.length, tanpa = r.L.length - N, far = S.rob.validasi?.persentil?.p95?.far;
    const cols = seri.map(d => ({n: d.tgl === tg ? "Hari ini" : tglSgk(d.tgl), v: d.n, w: d.siaga ? TINGKAT[2][1] : d.n ? TINGKAT[1][1] : TINGKAT[0][1], tip: `<b>${tglSgk(d.tgl)}</b><br>Waspada atau lebih: ${fmt(d.n)} titik<br>Siaga atau lebih: ${fmt(d.siaga)} titik`}));
    const daftar = r.aktif.slice(0, 5).map(x => `<tr><td class="c">${pilT(x.lv)}</td><td translate="no">${esc(x.t.kec)}, ${esc(x.t.kab)}</td><td class="n">${m1(x.h)} m</td></tr>`).join("");
    const tabel = daftar ? `<div class="tw ex-tabel gp-pk"><table><thead><tr><th title="Waspada: muka laut maksimum harian di atas persentil 95 titik; Siaga: di atas persentil 99.">Status</th><th title="Kecamatan dan kabupaten/kota">Lokasi</th><th title="Muka laut maksimum harian model, meter terhadap rata-rata laut global.">Muka laut tertinggi (m)</th></tr></thead><tbody>${daftar}</tbody></table></div>` : "";
    return kartuP("Status rob model", "rob", aktif ? `${Kartu.hl(fmt(aktif) + " dari " + fmt(N) + " titik")} pesisir berstatus Waspada atau lebih ${kapan(tg)}` : `Tidak ada dari ${fmt(N)} titik pesisir berambang yang berstatus Waspada ${kapan(tg)}`,
      (seri.some(d => d.n) ? GrafikP.batangV(cols, {lebar: lebarKartu()}) : "") + tabel,
      sumber, seri.some(d => d.n) ? [[TINGKAT[1][1], "Waspada"], [TINGKAT[2][1], "Siaga atau lebih"]] : null,
      {pil: PIL_HIP(), cat: [`Status dihitung dari muka laut model terhadap ambang persentil 95 dan 99 tiap titik, dari arsip model sejak ${S.rob.validasi?.periode?.[0] ? tglTahun(S.rob.validasi.periode[0]) : "Nov 2022"}. Ini hitungan Centurisk97, bukan peringatan resmi.`,
        far == null ? "" : `Pada uji retrospektif terhadap ${fmt(S.rob.validasi.kejadian_diuji)} kejadian DIBI, sekitar ${fmt(Math.round(far * 100))}% hari terpicu Waspada tidak bertepatan dengan kejadian DIBI. DIBI tidak mencatat semua rob.`,
        tanpa ? `${fmt(tanpa)} titik belum punya arsip untuk ambang dan tidak dihitung.` : ""]}); },
  exRobBmkg() { const tg = HARI_INI(), B = Pesisir.robBmkg(S.rob, tg); if (!B.length) return "";
    const baris = B.map(b => `<tr><td translate="no">${esc(b.wilayah)}</td><td translate="no">${esc(b.lokasi)}</td><td class="c">${tglSgk(b.tanggal_mulai)} sampai ${tglSgk(b.tanggal_selesai)}</td></tr>`).join("");
    return kartuP("Peringatan rob BMKG", "rob", `${Kartu.hl(fmt(B.length) + " peringatan")} rob BMKG berlaku ${kapan(tg)}`, `<div class="tw ex-tabel gp-pk"><table><thead><tr><th>Wilayah</th><th>Lokasi</th><th title="Tanggal mulai sampai selesai menurut BMKG Maritim.">Berlaku</th></tr></thead><tbody>${baris}</tbody></table></div>`,
      "BMKG Maritim, diambil " + jamWIB(S.rob.bmkg.diambil || S.rob.dibuat)); },
  exPasang() { if (!S.pas) return ""; const tg = HARI_INI(), P = Pesisir.pasutPekan(S.pas, tg, 7); if (!P.length) return "";
    const t = P[0], rows = P.slice(0, 10).map(x => ({n: x.s.nama, v: x.cm, w: PASUT[kelasPasut(x.s, x.cm)][1], txt: fmt(x.cm) + " cm", tip: `<b>${esc(x.s.nama)}, ${esc(x.s.prov)}</b><br>Pasang tertinggi: ${fmt(x.cm)} cm, ${tglSgk(x.tgl)} pukul ${x.jam} WIB<br>Persentil 90 stasiun: ${fmt(x.s.p90)} cm`}));
    return kartuP("Pasang tertinggi tujuh hari", "pasang", `${Kartu.hl(fmt(t.cm) + " cm")} pasang tertinggi tujuh hari ke depan, di ${esc(t.s.nama)} ${kapan(t.tgl)}`,
      GrafikP.batangH(rows, {lebar: lebarKartu()}),
      "BMKG Maritim, prediksi pasang surut, dibuat " + jamWIB(S.pas.dibuat), PASUT.map(([n, w], k) => [w, n, rows.some(r => r.w === w)]).filter(x => x[2]).map(x => [x[0], x[1]]),
      {cat: ["Tinggi pasang diukur terhadap rata-rata muka laut (mean sea level, MSL).", "Warna batang membandingkan pasang dengan persentil 75 dan 90 puncak harian stasiun itu sendiri. Itu penanda relatif, bukan ambang banjir."]}); },
  exOmbak() { if (!S.gel) return ""; const tg = HARI_INI(), G = Pesisir.gelHari(S.gel, tg);
    if (!G.length) return kartuP("Gelombang model", "ombak", `Data gelombang model terakhir dibuat ${esc(jamWIB(S.gel.dibuat))} dan belum mencakup ${tglSgk(tg)}`, "", "Open-Meteo Marine (model gelombang)", null, {kosong: "Gelombang model tidak ditampilkan sampai data baru terbit."});
    const rows = G.slice(0, 10).map(x => ({n: x.nama || namaProv(x.prov), v: x.hs, w: Pesisir.kelasGel(x.hs)[2], txt: m1(x.hs) + " m", tip: `<b>${esc(x.nama || namaProv(x.prov))}, ${esc(namaProv(x.prov))}</b><br>Gelombang tertinggi: ${m1(x.hs)} m<br>Kelas: ${Pesisir.kelasGel(x.hs)[1]}`}));
    const kelas = Pesisir.KELAS_GEL.filter(c => G.some(x => Pesisir.kelasGel(x.hs) === c));
    return kartuP("Gelombang model", "ombak", `${Kartu.hl(m1(G[0].hs) + " m")} gelombang model tertinggi, di ${esc(G[0].nama || namaProv(G[0].prov))} ${kapan(tg)}`, GrafikP.batangH(rows, {lebar: lebarKartu()}),
      "Open-Meteo Marine (model gelombang), dibuat " + jamWIB(S.gel.dibuat), kelas.map(c => [c[2], c[1]]),
      {cat: ["Angka adalah keluaran model di titik pelabuhan dan pesisir, bukan peringatan resmi. Kelas mengikuti ambang BMKG Maritim."]}); },
  exBmkgGel() { if (!S.per) return ""; const G = S.glb, tg = HARI_INI(), sumber = "BMKG Maritim, terbit " + jamWIB(S.per.dibuat);
    if (!G.length && tglWIB0(S.per.dibuat) !== tg) return kartuP("Peringatan gelombang BMKG", "ombak", `Data peringatan BMKG terakhir terbit ${esc(jamWIB(S.per.dibuat))} dan belum mencakup ${tglSgk(tg)}`, "", sumber, null, {kosong: "Peringatan tidak ditulis \"tidak ada\" karena data yang tersedia bukan data hari ini."});
    if (!G.length) return kartuP("Peringatan gelombang BMKG", "ombak", `Tidak ada peringatan gelombang tinggi BMKG yang berlaku pada data terbit ${esc(jamWIB(S.per.dibuat))}`, "", sumber, null, {kosong: "Peringatan BMKG terbit berkala; tidak adanya peringatan bukan jaminan bahwa laut tanpa bahaya."});
    const nm = ["Tinggi", "Sangat tinggi", "Ekstrem"], rows = G.slice(0, 12).map(o => ({n: namaProv(o.prov), segs: o.kelas.map((v, i) => ({v, w: Pesisir.KELAS_GEL.find(c => c[1] === nm[i])[2], tip: `<b>${esc(namaProv(o.prov))}</b><br>${nm[i]}: ${fmt(v)} perairan`}))}));
    return kartuP("Peringatan gelombang BMKG", "ombak", `${Kartu.hl(fmt(G.length) + " provinsi")} dalam peringatan gelombang tinggi BMKG ${kapan(tg)}`, GrafikP.tumpuk(rows, {lebar: lebarKartu()}),
      sumber, nm.map((n, i) => [Pesisir.KELAS_GEL.find(c => c[1] === n)[2], n, G.some(o => o.kelas[i] > 0)]).filter(x => x[2]).map(x => [x[0], x[1]]),
      {cat: ["Panjang batang adalah jumlah perairan yang diberi peringatan. Kelas sedang (1,25 sampai 2,5 m) bukan peringatan dan tidak dihitung."]}); },
  render() { const el = $("#insight"); if (el._ok) return; el._ok = 1;
    const h = ["Rob", "RobBmkg", "Pasang", "Omb", "BmkgGel", "Abrasi", "Situs"].map(k => { try { return this["ex" + (k === "Omb" ? "Ombak" : k)]() || ""; } catch (e) { console.error(e); return ""; } }).filter(Boolean);
    /* kartu berisi lebih dulu, kartu keadaan kosong (data basi) di belakang */
    h.sort((a, b) => /<p class="kosong">/.test(a) - /<p class="kosong">/.test(b));
    el.innerHTML = h.length ? `<div class="gp-kartu">${h.join("")}</div>` : `<p class="kosong">Belum ada data yang terbaca.</p>`; }
};
