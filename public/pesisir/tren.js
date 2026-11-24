"use strict";
/* Tab Tren: gerak garis pantai per situs (Landsat), kejadian "Banjir Rob" DIBI per tahun, dan catatan jujur tentang logbook.
   Logbook Pusdalops punya jenis resmi gelombang_pasang (kode DIBI 103: gelombang pasang, gelombang tinggi, abrasi); kartu Logbook memakai kuncinya langsung. Rob sendiri ada di jenis banjir (kode 101) dan dihitung dari label rob_kejadian.json. */
const WARNA_SITUS = ["#c9503a", "#e58a45", "#3f8f6b", "#3f7fb8", "#7a4fc4"];
const Tren = {
  exPantai() { if (!S.abr) return ""; const D = Pesisir.seriSitus(S.abr); if (!D.length) return "";
    const seri = D.map((s, i) => ({n: s.nama, w: WARNA_SITUS[i % 5], titik: s.titik.map(p => ({x: p.y, y: p.v})), s})), b0 = Pesisir.BASE;
    const u = seri.map(s => s.s).filter(s => s.arah?.M).sort((a, b) => b.arah.mundur100 / b.arah.M - a.arah.mundur100 / a.arah.M)[0]; if (!u) return "";
    const r = u.arah, sg = x => (x < 0 ? "-" : "+") + fmt(Math.round(Math.abs(x) / 10) * 10);
    return kartuP("Garis pantai", "abrasi", `${Kartu.hl(fmt(r.mundur100) + " dari " + fmt(r.M) + " transek")} ${esc(u.nama)} mundur lebih dari 100 m ke darat dari posisi ${b0[0]}–${b0[1]} hingga ${r.yAkhir}`,
      GrafikP.garis(seri, {lebar: lebarKartu(), tinggi: 260, tip: x => `<b>${x}</b>` + seri.map(s => { const p = s.titik.find(q => q.x === x); return p ? `<br>${esc(s.n)}: median ${p.y > 0 ? "+" : ""}${fmt(p.y)} m (${fmt(p.n)} transek)` : ""; }).join("")})
      /* angka kunci situs terparah sebagai deret kotak, catatan metode dilipat (pemilik 23 Nov 2026: dua paragraf panjang "bagusin") */
      + `<div class="gp-ang" aria-label="Angka kunci ${esc(u.nama)}">`
      + `<div><small>Median ${esc(u.nama)} ${r.yAkhir}</small><b>${sg(r.med)} m</b></div>`
      + `<div><small>Rentang antarkuartil</small><b>${sg(r.q1)} sampai ${sg(r.q3)} m</b></div>`
      + `<div><small>Median lima tahun terakhir</small><b>${sg(r.med5)} m</b></div>`
      + `<div><small>Transek bertanda tinjau (lompatan citra)</small><b>${fmt(r.tinjau)} dari ${fmt(r.M)}</b><em>arah kokoh, besar tidak pasti</em></div>`
      + `<div><small>Mundur lebih dari 100 m</small><b>${fmt(r.mundur100)} dari ${fmt(r.M)}</b><em>transek ${esc(u.nama)} sampai ${r.yAkhir}</em></div></div>`,
      "Landsat USGS lewat Microsoft Planetary Computer, olahan Centurisk97", seri.map(s => [s.w, s.n]),
      {pil: PIL_SAT(), cat: [`Garis adalah median perubahan jarak garis pantai tiap transek terhadap median posisinya pada ${b0[0]} sampai ${b0[1]}. Nilai negatif berarti pantai mundur ke darat. Angka dibulatkan ke 10 m.`,
        "Satu tahun dipakai bila paling sedikit 60% transek berbaseline di situs itu terbaca. Transek bangunan (tanggul tol, Patimban) dibuang. Transek yang melompat tetap ikut karena median meredamnya.",
        "Ambang air dan darat disetel memakai data Sayung, jadi Sayung bukan uji bebas. Posisi tiap tahun belum dikoreksi pasang surut, jadi bacalah arah dan laju jangka panjang, bukan lompatan antartahun."]}); },
  exRob() { if (!S.rob?.kejadian?.length) return ""; const {tahun, akhir} = Pesisir.robTahun(S.rob), y0 = tahun[0].y, y1 = tahun[tahun.length - 1].y, per = {}; tahun.forEach(t => per[t.y] = t);
    const cols = []; for (let y = y0; y <= y1; y++) { const t = per[y]; cols.push({n: String(y), v: t?.n || 0, w: t ? "#4f9be0" : "#9aa4b2", txt: t ? fmt(t.n) : "–",
      tip: t ? `<b>${y}${y === +akhir.slice(0, 4) ? ", sampai " + tglSgk(akhir) : ""}</b><br>Kejadian: ${fmt(t.n)}<br>Terdampak: ${fmt(t.terdampak)} jiwa<br>Rumah terendam: ${fmt(t.rumah)}` : `<b>${y}</b><br>Tidak ada catatan Banjir Rob di DIBI`}); }
    const tot = tahun.reduce((n, t) => n + t.n, 0);
    return kartuP("Kejadian rob per tahun", "rob", `${Kartu.hl(fmt(tot) + " kejadian")} Banjir Rob tercatat di DIBI BNPB sejak ${y0}, kejadian terakhir ${tglTahun(akhir)}`,
      GrafikP.batangV(cols, {lebar: lebarKartu(), tinggi: 210})
      + `<div class="gp-ang"><div><small>Kejadian Banjir Rob di DIBI</small><b>${fmt(tot)}</b><em>sejak ${y0}</em></div><div><small>Kejadian terakhir</small><b>${tglTahun(akhir)}</b></div></div>`,
      "DIBI BNPB, diambil lewat arsip rob Centurisk97", null,
      {cat: ["Hanya kejadian yang dilaporkan dan dimasukkan ke DIBI. Tahun tanpa batang berarti tidak ada catatan, belum tentu tidak ada kejadian.", "Tahun terakhir belum penuh."]}); },
  exKalender(R) { if (!R?.kab?.length) return ""; const BL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], tot = R.kab.reduce((a, k) => a + k.n, 0),
      bln = BL.map((n, i) => ({n, v: R.kab.reduce((a, k) => a + k.bulan[i], 0), top: R.kab.filter(k => k.bulan[i]).sort((a, b) => b.bulan[i] - a.bulan[i]).slice(0, 3)})), mx = bln.reduce((a, b) => b.v > a.v ? b : a), tinggi = bln.filter(b => b.v === mx.v);
    const cols = bln.map(b => ({n: b.n, v: b.v, w: "#4f9be0", txt: fmt(b.v), tip: `<b>${b.n}</b><br>Kejadian: ${fmt(b.v)}` + b.top.map(k => `<br>${esc(k.nama)}: ${fmt(k.bulan[BL.indexOf(b.n)])}`).join("")}));
    const MS = [["Des sampai Feb", [11, 0, 1], "#3f7fb8"], ["Mar sampai Mei", [2, 3, 4], "#3f8f6b"], ["Jun sampai Agu", [5, 6, 7], "#e58a45"], ["Sep sampai Nov", [8, 9, 10], "#7a4fc4"]],
      rows = R.kab.slice(0, 10).map(k => ({n: k.nama.replace("Kota Administrasi", "Kota Adm."), segs: MS.map(([nm, ix, w]) => ({v: ix.reduce((a, i) => a + k.bulan[i], 0), w, tip: `<b>${esc(k.nama)}, ${esc(k.prov)}</b><br>${nm}: ${fmt(ix.reduce((a, i) => a + k.bulan[i], 0))} dari ${fmt(k.n)} kejadian`}))}));
    return kartuP("Bulan dan musim laporan rob", "rob", `${Kartu.hl(fmt(R.n_kejadian) + " kejadian rob")} di ${fmt(R.n_kab)} kabupaten dan kota, paling banyak dilaporkan bulan ${tinggi.map(b => b.n).join(" dan ")} (${fmt(mx.v)} kejadian)`,
      `<div class="lbl gp-sublbl">Kejadian per bulan kalender, ${R.rentang[0].slice(0, 4)} sampai ${R.rentang[1].slice(0, 4)} digabung</div>` + GrafikP.batangV(cols, {lebar: lebarKartu(), tinggi: 190})
      + `<div class="lbl gp-sublbl">Sepuluh kabupaten dan kota dengan laporan terbanyak, per musim</div>` + GrafikP.tumpuk(rows, {lebar: lebarKartu()})
      + `<div class="gp-ang"><div><small>Kejadian rob dilaporkan</small><b>${fmt(R.n_kejadian)}</b></div><div><small>Kabupaten dan kota</small><b>${fmt(R.n_kab)}</b></div><div><small>Bulan terbanyak</small><b>${tinggi.map(b => b.n).join(" dan ")}</b><em>${fmt(mx.v)} kejadian</em></div></div>`,
      "Rekap Pusdalops BNPB banjir rob 2023-2024, logbook Pusdalops, DIBI BNPB; olahan Centurisk97, dibuat " + tglTahun((R.dibuat || "").slice(0, 10)), MS.map(([nm, , w]) => [w, nm]),
      {cat: ["Satu kejadian adalah satu tanggal laporan di satu kabupaten atau kota. Laporan kembar antarsumber digabung.",
        "Ini hitungan laporan BPBD dan Pusdalops, bukan jumlah hari banjir. Tahun atau wilayah tanpa laporan belum tentu tanpa rob, dan logbook belum penuh tiap tahun.",
        "Label ini dipakai untuk menguji prakiraan rob. Uji balik terhadap prakiraan yang diarsipkan menunggu arsip prakiraan terkumpul."]}); },
  exLogbook(L) { const J = "gelombang_pasang", N = L?.nasional; if (!L?.jenis?.includes(J) || !N) return "";
    const ys = Object.keys(N).filter(y => N[y][J] != null).sort(); if (!ys.length) return ""; const penuh = new Set(L.tahun_penuh || []), yp = ys.filter(y => penuh.has(y)); if (!yp.length) return ""; const tot = yp.reduce((a, y) => a + N[y][J], 0), rg = []; yp.forEach(y => { const l = rg[rg.length - 1]; if (l && +y === +l[1] + 1) l[1] = y; else rg.push([y, y]); }); const rentang = rg.map(([a, b]) => a === b ? a : a + "–" + b).join(" dan ");
    const cols = ys.map(y => ({n: y, v: N[y][J], w: penuh.has(y) ? "#4f9be0" : "#9aa4b2", txt: fmt(N[y][J]), tip: `<b>${y}</b><br>Kejadian: ${fmt(N[y][J])}<br>Hari tercatat: ${fmt(L.hari_tercatat?.[y] ?? 0)}${penuh.has(y) ? "" : "<br>Tahun belum penuh tercatat"}`}));
    return kartuP("Logbook gelombang pasang", "ombak", `${Kartu.hl(fmt(tot) + " kejadian")} berjenis gelombang pasang tercatat di logbook Pusdalops pada tahun yang penuh tercatat (${rentang})`,
      GrafikP.batangV(cols, {lebar: lebarKartu(), tinggi: 200})
      + `<div class="gp-ang"><div><small>Kejadian gelombang pasang</small><b>${fmt(tot)}</b><em>tahun penuh tercatat: ${rentang}</em></div></div>`,
      "Logbook Pusdalops BNPB, dibuat " + tglTahun((L.dibuat || "").slice(0, 10)), [["#4f9be0", "Tahun penuh tercatat"], ["#9aa4b2", "Tahun belum penuh"]],
      {cat: ["Jenis resmi logbook (kode DIBI 103) memuat gelombang pasang, gelombang tinggi, dan abrasi. Rob dicatat di jenis banjir sehingga tidak ikut di sini.", "Batang abu-abu adalah tahun dengan hari tercatat yang belum penuh; jangan dibandingkan dengan tahun lain."]}); },
  async render() { const el = $("#tren"); if (el._ok) return; el._ok = 1;
    const [L, R] = await Promise.all([opsi("../data/logbook_riwayat.json"), opsi("data/rob_kejadian.json")]), h = [this.exPantai(), this.exRob(), this.exKalender(R), this.exLogbook(L)].filter(Boolean);
    el.innerHTML = h.length ? `<div class="gp-kartu">${h.join("")}</div>` : `<p class="kosong">Belum ada data yang terbaca.</p>`; }
};
