/* laporan_bahaya_slide.js: deck laporan harian untuk bencana selain karhutla (banjir, gempa, gunungapi, cuaca, kekeringan, udara) dari SNAPSHOT yang sudah dikunci
   (GET /api/laporan-karhutla/snapshot/:tanggal?bencana=<bahaya>, bentuk dibangun public/laporan_bencana_spek.js). Antarmuka sama dengan laporan_karhutla_slide.js
   (deck, namaBerkas) supaya laporan_karhutla_deck.js memilih lewat s.bencana. Kanvas tiga keluaran dari paparan_slide.js, gaya dari laporan_bnpb_slide.js: pratinjau = PPTX = PDF.
   ATURAN: angka HANYA dari snapshot; bagian yang null di snapshot dilewati dengan alasan tercatat di slide metode (tidak ditulis nol). Tiap angka menyebut sumbernya di kaki slide.
   Sebelum kunci hanya pratinjau berwatermark DRAF (opsi draf). Huruf: Roboto subset tak punya segitiga/centang, arah ditulis "naik"/"turun". */
(() => {
const PS = window.PaparanSlide, LB = window.LaporanBnpbSlide, {W, H} = PS, {R, J, pil, kartu, labelKecil, lebarTeks} = LB.H, C = LB.C;
const KABUR = "9AA1AB", TEKS2 = "3A3F45", TERANG = "F4F5F7";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tglP = t => { const [y, m, d] = String(t).split("-").map(Number); return `${d} ${BULAN[m - 1]} ${y}`; };
const tglK = t => { const [, m, d] = String(t).split("-").map(Number); return `${d} ${BULAN[m - 1].slice(0, 3)}`; };
const nn = v => typeof v === "number" && Number.isFinite(v);
const ang = (v, d = 0) => nn(v) ? Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}) : "–";
const ketik = (t, n) => { t = String(t ?? ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const kap = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
const TINGKAT = {awas: ["Awas", C.merah], siaga: ["Siaga", C.jingga], waspada: ["Waspada", "A88A3C"], info: ["Info", C.biru]};
const DAMPAK = [["meninggal", "meninggal"], ["hilang", "hilang"], ["luka", "luka"], ["mengungsi", "mengungsi"], ["terdampak", "jiwa terdampak"]];
const namaSumber = s => (s.sumber || []).map(x => x.nama).filter(Boolean).join(", ") || "laporan harian otomatis";
const ubahTeks = u => u?.teks ?? null;
const unggul = s => s.nasional?.find(m => m.utama) ?? s.nasional?.[0] ?? null;

/* ------------------------------------------------------------ komponen */
function rangka(k, c, judul, o = {}) {
  const s = c.s;
  k.kotak(0, 0, W, H, {f: C.putih});
  if (c.draf) k.teks(1.2, 2.2, 11, 3.2, "DRAF", {s: 230, b: true, c: "F6E4E6", a: "c", v: "m"});
  k.teks(0.6, 0.36, 11.4, o.tj || 0.95, judul, {s: o.s || 21, b: true});
  if (c.aset?.logo) k.gambar(c.aset.logo, 12.3, 0.3, 0.46, 0.58); else k.teks(11.9, 0.4, 0.85, 0.3, "BNPB", {s: 9, b: true, c: C.biru, a: "r"});
  k.garis(0.6, o.gy || 1.34, 12.75, o.gy || 1.34, {c: TEKS2, w: 0.75});
  if (o.sumber) k.teks(0.6, 6.7, 12.15, 0.3, "Sumber: " + o.sumber, {s: 7, c: C.abu});
  k.garis(0.6, 7.04, 4.3, 7.04, {c: TEKS2, w: 0.75});
  k.teks(0.6, 7.1, 9.5, 0.2, `Badan Nasional Penanggulangan Bencana  |  Copyright ${c.tahun}  |  Data ${tglK(s.tanggal_data)}, laporan ${tglK(s.tanggal_laporan)}${s.ralat ? `, Ralat-${s.ralat}` : ""}${c.draf ? ", DRAF belum dikunci" : ""}`, {s: 8});
  k.teks(12.0, 7.1, 0.75, 0.2, String(c.no), {s: 8, b: true, a: "r"});
  if (c.draf) { k.kotak(10.4, 0.06, 2.35, 0.24, {f: C.merah, r: 0.12}); k.teks(10.4, 0.06, 2.35, 0.24, "DRAF, BELUM DIKUNCI", {s: 8, b: true, c: C.putih, a: "c", v: "m"}); }
}
function kosongKartu(k, x, y, w, h, teks, sub) {
  kartu(k, x, y, w, h, {f: TERANG}); k.teks(x + 0.2, y + h / 2 - (sub ? 0.7 : 0.4), w - 0.4, 0.8, teks, {s: 13, b: true, c: C.abu, a: "c", v: "m"});
  if (sub) k.teks(x + 0.3, y + h / 2 + 0.1, w - 0.6, 1.0, sub, {s: 9.5, c: C.abu, a: "c"});
}
function tabelHeader(k, x, y, kol) {
  const xs = []; let xx = x; for (const c of kol) { xs.push(xx); xx += c.w; }
  kol.forEach((c, i) => k.teks(xs[i], y, c.w - 0.08, 0.4, c.j, {s: 8.5, b: true, a: c.a || "l", v: "m"}));
  k.garis(x, y + 0.4, x + kol.reduce((a, c) => a + c.w, 0), y + 0.4, {c: C.navy, w: 1.25});
  return xs;
}
const sumberProv = "laporan Pemerintah Provinsi, diverifikasi Pusdalops BNPB";

/* ------------------------------------------------------------ registri slide */
const REGISTRI = [];
const slide = (id, judul, siap, gambar) => REGISTRI.push({id, judul, bagian: "utama", siap, gambar});

slide("utama", "Ringkasan nasional", () => null, (k, c) => {
  const s = c.s, u = unggul(s), ms = (s.nasional || []).slice(0, 4);
  rangka(k, c, u ? [J(`${ang(u.nilai, u.desimal)} ${u.satuan}`), R(` ${u.judul ?? u.label.toLowerCase()} pada ${tglP(s.tanggal_data)}`)] : [R(`${s.judul} per tanggal ${tglP(s.tanggal_laporan)}`)], {s: 24, sumber: u ? namaSumber(s) : null});
  if (!ms.length) return kosongKartu(k, 0.6, 1.6, 12.15, 3.2, "Pantauan otomatis belum ada data", s.data_otomatis ? `${kap(s.data_otomatis.alasan)}${s.data_otomatis.hari_lengkap ? `; hari lengkap terakhir ${tglP(s.data_otomatis.hari_lengkap)}` : ""}.` : null);
  const w = 2.9, g = (12.15 - 4 * w) / 3;
  ms.forEach((m, i) => {
    const x = 0.6 + i * (w + g), y = 1.6; kartu(k, x, y, w, 2.55); labelKecil(k, x + 0.2, y + 0.16, w - 0.4, ketik(m.label, 34));
    k.teks(x + 0.2, y + 0.5, w - 0.4, 0.75, ang(m.nilai, m.desimal), {s: 34, b: true, c: m.utama ? C.jingga : C.navy, v: "m"});
    k.teks(x + 0.2, y + 1.25, w - 0.4, 0.3, m.satuan, {s: 11, c: C.abu});
    const ut = ubahTeks(m.ubah); k.teks(x + 0.2, y + 1.65, w - 0.4, 0.4, ut || "tanpa pembanding hari sebelumnya", {s: 9, b: !!ut, c: !ut ? KABUR : m.ubah.arah === "tetap" ? C.abu : (m.ubah.arah === "naik") === (m.arah !== "naik_baik") ? C.jingga : "2B7A3D"});
    k.teks(x + 0.2, y + 2.1, w - 0.4, 0.35, ketik(namaSumber(s), 48), {s: 7, c: C.abu});
  });
  k.teks(0.6, 4.4, 12.15, 0.3, "Kesimpulan", {s: 12, b: true}); k.garis(0.6, 4.73, 12.75, 4.73, {c: C.navy, w: 0.75});
  s.kesimpulan.slice(0, 5).forEach((t, i) => { k.bulat(0.72, 5.0 + i * 0.33, 0.04, {f: C.jingga}); k.teks(0.95, 4.85 + i * 0.33, 11.7, 0.3, ketik(t, 190), {s: 10, v: "m"}); });
});

slide("tren", "Tiga hari terakhir", s => s.tiga_hari ? null : "kurang dari dua hari bernilai pada berkas otomatis", (k, c) => {
  const s = c.s, u = unggul(s), t = s.tiga_hari, mx = Math.max(1, ...t.map(x => x.nilai)), ujung = t.at(-1), awal = t[0];
  rangka(k, c, [R(`${u.label} dalam ${t.length} hari terakhir: `), J(`${ang(awal.nilai, u.desimal)} menjadi ${ang(ujung.nilai, u.desimal)} ${u.satuan}`)], {s: 22, sumber: namaSumber(s)});
  const bw = 2.4, gap = 0.9, x0 = 0.9 + (11.6 - t.length * bw - (t.length - 1) * gap) / 2, dasar = 5.7, tg = 3.6;
  t.forEach((d, i) => { const x = x0 + i * (bw + gap), h = Math.max(0.05, tg * d.nilai / mx), terakhir = i === t.length - 1;
    k.kotak(x, dasar - h, bw, h, {f: terakhir ? C.jingga : C.navy, r: 0.05}); k.teks(x, dasar - h - 0.45, bw, 0.4, `${ang(d.nilai, u.desimal)} ${u.satuan}`, {s: 14, b: true, a: "c", v: "m", c: terakhir ? C.jingga : C.teks});
    k.teks(x, dasar + 0.1, bw, 0.3, tglP(d.tanggal_data), {s: 10, a: "c"}); });
  k.garis(0.6, dasar, 12.75, dasar, {c: C.navy, w: 1});
  if (s.otomatis?.berjalan) k.teks(0.6, 6.3, 12.15, 0.3, `Hari terakhir (${tglP(s.tanggal_data)}) masih berjalan dan belum final menurut berkas otomatis.`, {s: 9, i: true, c: C.abu});
});

slide("provinsi", "Provinsi yang wajib mengirim laporan", s => s.provinsi.length ? null : "tidak ada provinsi yang wajib mengirim laporan dan tidak ada kiriman provinsi", (k, c) => {
  const s = c.s, ms = (s.metrik || []).filter(m => s.provinsi.some(p => p.metrik[m.k] != null)).slice(0, 3), n = s.provinsi.length;
  rangka(k, c, [J(`${n} provinsi`), R(` dalam laporan ${s.nama_bencana.toLowerCase()} ${tglP(s.tanggal_data)}`), s.provinsi.some(p => p.wajib) ? R(`; ${s.provinsi.filter(p => p.wajib && p.ada).length} dari ${s.provinsi.filter(p => p.wajib).length} provinsi yang wajib mengirim laporan sudah mengirim`) : R("")], {s: 20, sumber: `${namaSumber(s)} (angka otomatis); ${sumberProv} (kolom laporan)`});
  const sisa = 12.15 - 2.2 - ms.length * 1.6, kol = [{j: "Provinsi", w: 2.2}, ...ms.map(m => ({j: `${m.label} (${m.satuan})`, w: 1.6, a: "r"})), {j: "Laporan provinsi", w: sisa}], xs = tabelHeader(k, 0.6, 1.5, kol), rh = Math.min(0.62, 4.5 / n);
  s.provinsi.slice(0, 7).forEach((p, i) => { const y = 1.95 + i * rh; if (i % 2 === 0) k.kotak(0.6, y, 12.15, rh, {f: "F6F7F9"});
    k.teks(xs[0], y, 2.1, rh, [R(p.nama, C.teks, true), R(p.wajib ? "" : "  (tidak wajib)", C.abu)], {s: 10, v: "m"});
    ms.forEach((m, j) => { const v = p.metrik[m.k]; k.teks(xs[1 + j], y, 1.5, rh, nn(v) ? ang(v, m.desimal) : "–", {s: 11, b: nn(v), a: "r", v: "m", c: nn(v) ? (m.utama ? C.jingga : C.teks) : KABUR}); });
    const x = p.kiriman; k.teks(xs[1 + ms.length], y, sisa - 0.1, rh, x ? ketik(x.ringkasan ?? "", 110) : p.lanjut_tanpa ? `lanjut tanpa laporan: ${ketik(p.lanjut_tanpa.alasan, 80)}` : "belum ada laporan provinsi", {s: 8.5, v: "m", c: x ? C.teks : KABUR}); });
  if (n > 7) k.teks(0.6, 1.95 + 7 * rh + 0.05, 12, 0.25, `dan ${n - 7} provinsi lain tidak ditampilkan di slide ini`, {s: 8, c: C.abu});
});

slide("lapprov", "Laporan dan dampak provinsi", s => s.provinsi.some(p => p.kiriman) ? null : "belum ada laporan provinsi yang disetujui", (k, c) => {
  const s = c.s, ps = s.provinsi.filter(p => p.kiriman), d = s.dampak_provinsi, kj = ps.slice(0, 4);
  rangka(k, c, d && DAMPAK.some(([x]) => nn(d[x]) && d[x] > 0) ? [J(DAMPAK.filter(([x]) => nn(d[x]) && d[x] > 0).map(([x, l]) => `${ang(d[x])} ${l}`).join(", ")), R(` menurut ${d.provinsi} provinsi yang melapor`)] : [R(`Laporan ${ps.length} provinsi tanpa korban atau dampak jiwa yang dilaporkan`)], {s: 20, sumber: sumberProv});
  const w = 5.95, h = 2.4;
  kj.forEach((p, i) => { const x = 0.6 + (i % 2) * (w + 0.25), y = 1.55 + Math.floor(i / 2) * (h + 0.2), q = p.kiriman; kartu(k, x, y, w, h); labelKecil(k, x + 0.2, y + 0.14, w - 0.4, p.nama);
    k.teks(x + 0.2, y + 0.42, w - 0.4, 0.6, ketik(q.ringkasan ?? "", 150), {s: 10, b: true});
    const dm = DAMPAK.filter(([e]) => nn(q.dampak?.[e])).map(([e, l]) => `${ang(q.dampak[e])} ${l}`).join(", ");
    k.teks(x + 0.2, y + 1.05, w - 0.4, 0.3, dm ? `Dampak: ${dm}` : "Dampak jiwa tidak dilaporkan", {s: 9, b: !!dm, c: dm ? C.jingga : KABUR});
    k.teks(x + 0.2, y + 1.4, w - 0.4, 0.95, [q.upaya ? R("Upaya: ", C.biru, true) : R(""), R(q.upaya ? ketik(q.upaya, 90) + "  " : ""), q.hambatan ? R("Hambatan: ", C.biru, true) : R(""), R(q.hambatan ? ketik(q.hambatan, 90) : "")], {s: 8.5}); });
  if (ps.length > 4) k.teks(0.6, 6.5, 12, 0.25, `dan ${ps.length - 4} provinsi lain tidak ditampilkan di slide ini`, {s: 8, c: C.abu});
});

slide("sorot", "Perlu perhatian", s => s.sorot ? null : "berkas otomatis tidak memuat butir perlu perhatian", (k, c) => {
  const s = c.s, so = s.sorot, atas = so.filter(x => ["awas", "siaga"].includes(x.tingkat)).length;
  rangka(k, c, [J(`${so.length} butir`), R(" perlu perhatian"), atas ? R(`, ${atas} berstatus siaga atau awas`) : R("")], {s: 22, sumber: namaSumber(s)});
  so.slice(0, 7).forEach((x, i) => { const y = 1.6 + i * 0.7, [lab, wrn] = TINGKAT[x.tingkat] ?? ["Info", C.biru]; pil(k, 0.6, y + 0.14, lab, {f: wrn, c: C.putih, b: true, s: 8, h: 0.24});
    k.teks(1.75, y, 10.9, 0.3, ketik(x.judul, 120), {s: 11, b: true, v: "m"}); k.teks(1.75, y + 0.3, 10.9, 0.3, ketik(x.teks, 150), {s: 9, c: C.abu}); k.garis(0.6, y + 0.64, 12.75, y + 0.64, {c: "E3E6EA", w: 0.5}); });
});

slide("prakiraan", "Prakiraan", s => s.prakiraan ? null : "berkas otomatis tidak memuat prakiraan", (k, c) => {
  const s = c.s, p = s.prakiraan, nh = p.hari.length, lw = Math.min(1.0, 7.2 / nh);
  rangka(k, c, [R(ketik(p.judul, 90))], {s: 20, sumber: namaSumber(s)});
  const kol = [{j: "Wilayah", w: 12.15 - nh * lw}, ...p.hari.map(h => ({j: tglK(h), w: lw, a: "r"}))], xs = tabelHeader(k, 0.6, 1.5, kol), rh = Math.min(0.5, 4.4 / p.baris.length);
  p.baris.forEach((b, i) => { const y = 1.95 + i * rh; if (i % 2 === 0) k.kotak(0.6, y, 12.15, rh, {f: "F6F7F9"}); k.teks(xs[0], y, kol[0].w - 0.1, rh, ketik(b.label, 50), {s: 10, b: true, v: "m"});
    p.hari.forEach((_, j) => k.teks(xs[1 + j], y, lw - 0.1, rh, nn(b.nilai[j]) ? ang(b.nilai[j], b.desimal ?? 0) : "–", {s: 10, a: "r", v: "m", c: nn(b.nilai[j]) ? C.teks : KABUR})); });
  if (p.baris[0]?.satuan) k.teks(0.6, 1.95 + p.baris.length * rh + 0.1, 12, 0.3, `Satuan nilai: ${p.baris[0].satuan}.`, {s: 8.5, i: true, c: C.abu});
});

slide("metode", "Metode, sumber, dan catatan data", () => null, (k, c) => {
  const s = c.s, ex = c.ex;
  rangka(k, c, [R("Metode, sumber, dan catatan data"), s.pengecualian.length ? R(`: ${s.pengecualian.length} provinsi dilanjutkan tanpa kiriman terbaru`) : R("")], {s: 20});
  const blok = [
    ["DUA TANGGAL", `Laporan ${tglP(s.tanggal_laporan)} (hari dikunci). Data ${tglP(s.tanggal_data)}, cut-off ${tglP(s.tanggal_laporan)} pukul 07.00 WIB.`],
    ["SUMBER ANGKA", `Angka nasional dan per provinsi dari berkas laporan otomatis (${namaSumber(s)})${s.otomatis?.dibuat_teks ? `, dibuat ${s.otomatis.dibuat_teks}` : ""}. Dampak jiwa, upaya, dan hambatan dari laporan Pemerintah Provinsi yang diverifikasi Pusdalops BNPB. Keduanya tidak dicampur.`],
    ["STATUS LAPORAN", `${s.status === "dikunci_pengecualian" ? "Dikunci dengan pengecualian" : "Dikunci"}${s.dikunci_oleh ? " oleh " + s.dikunci_oleh : ""}, ${s.ralat ? "Ralat-" + s.ralat + (s.alasan_ralat ? ", " + s.alasan_ralat : "") : "kunci pertama (tanpa ralat)"}${ex.hash ? `. Hash snapshot ${ex.hash.slice(0, 16)}` : ""}.`],
    ["ARTI TANDA –", "Tanda – berarti belum ada data. Angka tidak diisi dari hari lain tanpa tertulis tanggal data terakhir."],
  ];
  blok.forEach(([l, t], i) => { const x = 0.6 + (i % 2) * 6.15, y = 1.5 + Math.floor(i / 2) * 1.5; kartu(k, x, y, 6.0, 1.38); labelKecil(k, x + 0.2, y + 0.12, 5.6, l); k.teks(x + 0.2, y + 0.4, 5.6, 0.95, t, {s: 10.5}); });
  let y = 4.6; k.teks(0.6, y, 6, 0.3, "Slide yang dilewati karena belum ada data", {s: 12}); k.garis(0.6, y + 0.33, 12.75, y + 0.33, {c: C.navy, w: 0.75});
  const lw = Object.entries(ex.lewat); if (!lw.length) k.teks(0.6, y + 0.42, 12, 0.3, "Tidak ada. Semua bagian snapshot punya data.", {s: 9.5, c: C.abu});
  else lw.slice(0, 5).forEach(([id, a], i) => k.teks(0.6, y + 0.42 + i * 0.36, 12.1, 0.3, [R(`${REGISTRI.find(r => r.id === id).judul}: `, C.biru, true), R(a)], {s: 9.5, v: "m"}));
  s.pengecualian.slice(0, 2).forEach((p, i) => k.teks(0.6, 6.2 + i * 0.25, 12.1, 0.25, `${p.label}: data terakhir ${p.data_terakhir ? tglP(p.data_terakhir) : "tidak ada"}. Alasan: ${ketik(p.alasan, 100)}`, {s: 8.5, i: true}));
});

/* ------------------------------------------------------------ perakit deck */
function deck(s, opsi = {}) {
  const lewat = {}, aktif = REGISTRI.filter(r => { const a = r.siap(s); if (a) lewat[r.id] = a; return !a; });
  const ex = {lewat, hash: opsi.hash || null};
  const slide2 = aktif.map(r => PS.lengkapi({id: r.id, judul: r.judul, bagian: r.bagian, gambar: (k, c) => r.gambar(k, {...c, s, ex, draf: !!opsi.draf, tahun: c.tahun || s.tanggal_laporan.slice(0, 4)})}));
  return {slide: slide2, dilewati: Object.entries(lewat).map(([id, alasan]) => ({id, judul: REGISTRI.find(r => r.id === id).judul, alasan}))};
}
const namaBerkas = (s, ext) => { const [y, m, d] = s.tanggal_laporan.split("-"); return `Laporan-Harian-${s.bencana ? kap(s.bencana) : "Bencana"}-${+d}-${BULAN[+m - 1].slice(0, 3)}-${y}${s.ralat ? "-Ralat-" + s.ralat : ""}.${ext}`; };
window.LaporanBahayaSlide = {deck, namaBerkas, REGISTRI, tglP, tglK};
})();
