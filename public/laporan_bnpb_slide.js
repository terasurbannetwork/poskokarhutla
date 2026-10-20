/* laporan_bnpb_slide.js: dua deck BNPB yang angkanya DIKETIK tim di /laporan-bnpb (bukan dari pipeline):
   - "harian"  : Laporan Kejadian Bencana Harian (sampul, ringkasan + peta, rincian per jenis, penutup)
   - "presiden": Paparan Kepala BNPB kepada Presiden, karhutla provinsi prioritas (sampul, situasi, efektivitas, prioritas, konsesi, kesimpulan, penutup)
   Kanvas tiga keluaran (pptx/pdf/html) dipinjam dari paparan_slide.js, jadi pratinjau = PPTX = PDF.
   Judul aksi dihitung dari angka isian; tiap judul bisa ditimpa lewat kolom judul_* di isian. Dipakai laporan_bnpb.js. */
(() => {
const PS = window.PaparanSlide, {W, H, fmt} = PS;
const C = {navy: "0F1E2D", jingga: "D9650B", biru: "0B4EA2", teks: "1A1A1A", abu: "6B7280", abu2: "9AA1AB", garis: "D5D9DE", putih: "FFFFFF",
  krem: "FBEBDD", krem2: "FDF4EC", merah: "C8102E", merahM: "FBE3E6", emas: "A88A3C", emasM: "F3ECDC", slate: "5B7A99", slateM: "E3EAF1", latar: "F4F5F7"};
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
/* jenis kejadian: urutan = urutan kolom/legenda */
const JENIS = {
  karhutla: {nama: "Karhutla", w: C.jingga, m: C.krem},
  kekeringan: {nama: "Kekeringan", w: C.emas, m: C.emasM},
  banjir: {nama: "Banjir", w: C.biru, m: "DCE7F5"},
  longsor: {nama: "Tanah longsor", w: "7A5230", m: "EFE4DA"},
  cuaca: {nama: "Cuaca ekstrem", w: "3E7C8C", m: "DCEDF1"},
  gempabumi: {nama: "Gempabumi", w: C.slate, m: C.slateM},
  gunungapi: {nama: "Erupsi gunung api", w: "8C3B2E", m: "F2DEDA"},
  kebakaran_permukiman: {nama: "Kebakaran permukiman", w: C.merah, m: C.merahM},
  lainnya: {nama: "Lainnya", w: C.abu, m: C.latar},
};
const STATUS = {selesai: {nama: "selesai/terkendali", w: C.navy}, berjalan: {nama: "penanganan berjalan", w: C.jingga}, belum: {nama: "belum selesai", w: C.merah}};

/* ------------------------------------------------------------ format */
const R = (t, c, b) => ({t: String(t), c, b});
const J = t => R(t, C.jingga, true), Bi = t => R(t, C.biru, true);
const n0 = v => fmt(v, 0), n2 = v => fmt(v, 2);
const tglObj = s => new Date(s + "T00:00:00Z");
const tglP = s => { const d = tglObj(s); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const tglK = s => { const d = tglObj(s); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()].slice(0, 3)}`; };
const tglHari = s => { const d = tglObj(s); return `${HARI[d.getUTCDay()]}, ${tglP(s)}`; };
const tambahHari = (s, n) => new Date(Date.parse(s + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
/* rentang "18–19 Oktober 2026" atau "30 September – 1 Oktober 2026" */
function rentang(a, b) {
  const x = tglObj(a), y = tglObj(b);
  if (x.getUTCMonth() === y.getUTCMonth() && x.getUTCFullYear() === y.getUTCFullYear()) return `${x.getUTCDate()}–${y.getUTCDate()} ${BULAN[y.getUTCMonth()]} ${y.getUTCFullYear()}`;
  return `${tglK(a)} – ${tglP(b)}`;
}
const num = v => typeof v === "number" && Number.isFinite(v) ? v : null;
const jum = a => (a || []).reduce((x, y) => x + (num(y) || 0), 0);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
/* angka pertama di teks bebas gaya Indonesia: "± 12.022 KK" -> 12022, "665,07 ha" -> 665.07 */
const angkaTeks = t => { const m = String(t || "").match(/\d[\d.]*(,\d+)?/); return m ? Number(m[0].replace(/\./g, "").replace(",", ".")) : null; };
const lebarTeks = (t, s, b) => String(t).length * s / 72 * (b ? 0.56 : 0.52);   // perkiraan lebar Roboto, cukup untuk ukuran pil

/* ------------------------------------------------------------ komponen */
function pil(k, x, y, t, o = {}) {   // pil teks; kembalikan lebarnya
  const s = o.s || 7.5, h = o.h || 0.22, w = o.w || lebarTeks(t, s, o.b) + 0.22;
  k.kotak(x, y, w, h, {f: o.f || C.latar, l: o.l, r: h / 2, lw: 0.75});
  k.teks(x, y, w, h, t, {s, b: o.b, c: o.c || C.teks, a: "c", v: "m"});
  return w;
}
function ikonStatus(k, cx, cy, st, r = 0.085) {   // bulat status: centang / tiga titik / tanda seru
  k.bulat(cx, cy, r, {f: (STATUS[st] || STATUS.berjalan).w});
  if (st === "selesai") { k.garis(cx - r * 0.45, cy, cx - r * 0.1, cy + r * 0.38, {c: C.putih, w: 1.3}); k.garis(cx - r * 0.1, cy + r * 0.38, cx + r * 0.5, cy - r * 0.35, {c: C.putih, w: 1.3}); }
  else if (st === "belum") k.teks(cx - r, cy - r, 2 * r, 2 * r, "!", {s: r * 110, b: true, c: C.putih, a: "c", v: "m"});
  else for (const d of [-0.42, 0, 0.42]) k.bulat(cx + d * r, cy, r * 0.12, {f: C.putih});
}
function logo(k, c, x, y, d) {   // logo BNPB di lingkaran putih bergaris
  k.kotak(x, y, d, d, {f: C.putih, l: "E3E6EA", r: d / 2, lw: 1});
  if (c.aset.logo) { const lw = d * 0.56, lh = lw * 315 / 250; k.gambar(c.aset.logo, x + (d - lw) / 2, y + (d - lh) / 2, lw, lh); }
  else k.teks(x, y, d, d, "BNPB", {s: d * 14, b: true, c: C.biru, a: "c", v: "m"});
}
/* kerangka halaman isi: judul aksi (runs), garis, logo kanan atas, kaki halaman */
function rangka(k, c, judul, o = {}) {
  k.kotak(0, 0, W, H, {f: C.putih});
  k.teks(0.6, 0.36, 11.2, o.tj || 0.95, judul, {s: o.s || 21, b: true});
  if (c.aset.logo) k.gambar(c.aset.logo, 12.32, 0.36, 0.42, 0.53); else k.teks(11.9, 0.4, 0.85, 0.3, "BNPB", {s: 9, b: true, c: C.biru, a: "r"});
  k.teks(12.2, 0.9, 0.66, 0.16, "BNPB", {s: 6.5, b: true, c: C.biru, a: "c"});
  if (o.garis !== false) k.garis(0.6, o.gy || 1.3, 12.75, o.gy || 1.3, {c: "3A3F45", w: 0.75});
  k.garis(0.6, 7.04, 4.3, 7.04, {c: "3A3F45", w: 0.75});
  k.teks(0.6, 7.1, 7, 0.2, `${c.isi.instansi || "Badan Nasional Penanggulangan Bencana"}  |  Copyright ${c.tahun}`, {s: 8});
  k.teks(12.0, 7.1, 0.75, 0.2, String(c.no), {s: 8, b: true, a: "r"});
}
function kartu(k, x, y, w, h, o = {}) { k.kotak(x, y, w, h, {f: o.f || C.putih, l: o.l || C.garis, r: 0.1, lw: 0.75}); }
function labelKecil(k, x, y, w, t, c = C.jingga) { k.teks(x, y, w, 0.2, t.toUpperCase(), {s: 7.5, b: true, c}); }

/* sampul bersama: kiri putih, foto kanan, logo, lencana BerAKHLAK */
function sampul(k, c, isi) {
  k.kotak(0, 0, W, H, {f: C.putih});
  const fx = 6.95;
  if (c.aset.foto) { k.gambar(c.aset.foto.data, fx, 0, W - fx, H); k.teks(fx, 7.18, W - fx - 0.12, 0.18, c.aset.foto.kredit, {s: 6, c: C.putih, a: "r"}); }
  else k.kotak(fx, 0, W - fx, H, {f: C.navy});
  if (c.aset.berakhlak) { k.kotak(10.2, 0.5, 2.6, 0.98, {f: C.putih, r: 0.1}); k.gambar(c.aset.berakhlak, 10.33, 0.58, 2.2, 0.84); }
  logo(k, c, 0.6, 0.5, 1.1);
  isi(k);
  k.teks(0.6, 7.1, 6, 0.2, `${c.isi.instansi || "Badan Nasional Penanggulangan Bencana"}  |  Copyright ${c.tahun}`, {s: 8});
}
function blokPenyaji(k, c, y, label) {
  k.garis(0.6, y, 6.2, y, {c: "3A3F45", w: 0.75});
  labelKecil(k, 0.6, y + 0.17, 5, label);
  k.teks(0.6, y + 0.42, 6.3, 0.3, c.isi.penyaji || "", {s: 13.5, b: true});
  k.teks(0.6, y + 0.78, 6.3, 0.25, c.isi.jabatan || "", {s: 11, c: C.abu});
}
function pilTanggal(k, y, t) { k.kotak(0.6, y, 3.2, 0.42, {f: C.navy, r: 0.21}); k.teks(0.6, y, 3.2, 0.42, t, {s: 11, b: true, c: C.putih, a: "c", v: "m"}); }

const KONTAK = [["Telepon", "021 2982 7793"], ["Call Center", "117"], ["Surel", "persuratan@bnpb.go.id"], ["Situs", "www.bnpb.go.id"], ["Data", "Satu Data Bencana"],
  ["Facebook", "@infoBencanaBNPB"], ["Instagram", "BNPB_Indonesia"], ["X", "@BNPB_Indonesia"], ["YouTube", "BNPB Indonesia"], ["TikTok", "@bnpbindonesia"]];
function penutup(k, c, ket) {
  k.kotak(0, 0, W, H, {f: C.navy});
  if (c.aset.penutup) k.gambar(c.aset.penutup, 0, 0, W, H);
  logo(k, c, 0.6, 0.55, 1.1);
  k.teks(0.6, 2.85, 9, 1.0, "Terima kasih", {s: 54, b: true, c: C.putih});
  k.kotak(0.6, 3.97, 5.2, 0.035, {f: C.jingga});
  k.teks(0.6, 4.2, 11, 0.36, c.isi.penyaji || "", {s: 17, b: true, c: C.putih});
  k.teks(0.6, 4.6, 11, 0.3, c.isi.jabatan || "", {s: 13, c: "E5E7EB"});
  k.teks(0.6, 5.05, 11.5, 0.28, ket, {s: 11.5, c: "C7CDD4"});
  k.kotak(0.6, 5.48, 11.4, 1.14, {f: C.putih, r: 0.1});
  k.teks(0.85, 5.58, 8, 0.22, (c.isi.instansi || "Badan Nasional Penanggulangan Bencana").toUpperCase(), {s: 10, b: true, c: C.navy});
  k.teks(0.85, 5.8, 8, 0.2, "Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120", {s: 8, c: C.abu});
  KONTAK.forEach(([l, v], i) => {
    const x = 0.85 + (i % 5) * 2.22, y = 6.08 + Math.floor(i / 5) * 0.27;
    k.teks(x, y, 2.2, 0.22, [R(l + "  ", C.abu), R(v, C.navy, true)], {s: 7.5, v: "m"});
  });
  if (c.aset.kreditPenutup) k.teks(7, 7.18, W - 7.12, 0.18, c.aset.kreditPenutup, {s: 6, c: "C7CDD4", a: "r"});
}

/* ============================================================ HARIAN */
const urutJenis = ks => Object.keys(JENIS).map(j => [j, ks.filter(x => x.jenis === j).length]).filter(x => x[1] > 0);
const statusHitung = ks => ({selesai: ks.filter(x => x.status === "selesai").length, berjalan: ks.filter(x => x.status === "berjalan").length, belum: ks.filter(x => x.status === "belum").length});
const namaProv = (c, p) => c.prov[p] || p || "";
/* perlu perhatian = kejadian belum selesai (otomatis) + butir tambahan yang diketik (mis. ringkasan kekeringan lintas kabupaten) */
const perhatian = c => [...(c.isi.kejadian || []).filter(x => x.status === "belum"), ...(c.isi.perhatian_tambahan || []).filter(x => x.judul || x.isi).map(x => ({...x, tambahan: true}))];
/* kelompok baris per provinsi, urutan kemunculan pertama */
function kelompok(ks) { const m = new Map(); for (const x of ks) { if (!m.has(x.prov)) m.set(x.prov, []); m.get(x.prov).push(x); } return [...m]; }

const HARIAN = [];
HARIAN.push({id: "sampul", judul: "Sampul", gambar: (k, c) => sampul(k, c, k => {
  const i = c.isi;
  k.teks(0.6, 1.95, 6.2, 1.3, "Laporan Kejadian Bencana Harian", {s: 32, b: true});
  k.teks(0.6, 3.25, 6.2, 0.35, i.instansi || "Badan Nasional Penanggulangan Bencana", {s: 15, b: true, c: C.biru});
  const per = `${tglK(i.mulai)} ${tglObj(i.mulai).getUTCFullYear()}, ${i.jam || "07.00"}  –  ${tglK(c.tanggal)} ${tglObj(c.tanggal).getUTCFullYear()}, ${i.jam || "07.00"} WIB`;
  k.kotak(0.6, 3.75, 4.6, 0.42, {f: C.krem, r: 0.21}); k.bulat(0.83, 3.96, 0.13, {f: C.jingga});
  k.teks(1.05, 3.75, 4.1, 0.42, [R("PERIODE   ", C.jingga, true), R(per, C.teks, true)], {s: 9.5, v: "m"});
  blokPenyaji(k, c, 4.55, "Disampaikan oleh");
  pilTanggal(k, 5.75, tglHari(c.tanggal));
})});

HARIAN.push({id: "ringkasan", judul: "Ringkasan kejadian", gambar: (k, c) => {
  const ks = c.isi.kejadian || [], st = statusHitung(ks), nProv = new Set(ks.map(x => x.prov).filter(Boolean)).size, kh = ks.filter(x => x.jenis === "karhutla").length;
  const judul = c.isi.judul_ringkasan ? [R(c.isi.judul_ringkasan)] : [R(`Laporan ${rentang(c.isi.mulai, c.tanggal)}: `), J(n0(ks.length)), R(" kejadian menonjol di "), J(n0(nProv)), R(" provinsi"),
    ...(kh ? [R("; "), J(n0(kh)), R(" di antaranya karhutla")] : []), R(", "), J(n0(st.belum)), R(" kejadian belum selesai")];
  rangka(k, c, judul);
  /* baris KPI: laporan masuk, menonjol, lalu empat jenis terbanyak */
  const kpi = [["laporan kejadian", c.isi.laporan_masuk ?? ks.length, C.navy, C.latar], ["kejadian menonjol", ks.length, C.navy, C.latar],
    ...urutJenis(ks).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([j, n]) => [JENIS[j].nama.toLowerCase(), n, JENIS[j].w, JENIS[j].m])];
  const kw = (12.15 - 0.15 * (kpi.length - 1)) / kpi.length;
  kpi.forEach(([l, v, w, m], i) => {
    const x = 0.6 + i * (kw + 0.15); kartu(k, x, 1.48, kw, 0.62);
    k.bulat(x + 0.33, 1.79, 0.19, {f: m}); k.bulat(x + 0.33, 1.79, 0.07, {f: w});
    k.teks(x + 0.62, 1.52, kw - 0.7, 0.32, n0(v), {s: 17, b: true, c: i < 2 ? C.navy : w});
    k.teks(x + 0.62, 1.84, kw - 0.7, 0.2, l, {s: 7.5, c: C.abu});
  });
  /* peta (PNG dari laporan_bnpb.js) */
  if (c.aset.peta) k.gambar(c.aset.peta, 0.6, 2.25, 8.75, 3.66);
  let lx = 0.6;
  for (const [j] of urutJenis(ks)) { k.kotak(lx, 5.97, 0.13, 0.13, {f: JENIS[j].w}); k.teks(lx + 0.18, 5.94, 1.6, 0.2, JENIS[j].nama.toLowerCase(), {s: 7.5}); lx += lebarTeks(JENIS[j].nama, 7.5) + 0.55; }
  k.bulat(lx + 0.07, 6.035, 0.075, {f: C.merah}); k.teks(lx + 0.04, 5.95, 0.08, 0.17, "!", {s: 6, b: true, c: C.putih, a: "c", v: "m"}); k.teks(lx + 0.2, 5.94, 1.4, 0.2, "perlu perhatian", {s: 7.5});
  /* panel status */
  const px = 9.55, pw = 3.2; kartu(k, px, 2.25, pw, 3.9);
  labelKecil(k, px + 0.18, 2.38, pw, "Status penanganan", C.navy);
  const tot = ks.length || 1; let bx = px + 0.18; const bw = pw - 0.36;
  for (const s of ["selesai", "berjalan", "belum"]) { const w = bw * st[s] / tot; if (w > 0.01) { k.kotak(bx, 2.66, w, 0.24, {f: STATUS[s].w}); if (w > 0.35) k.teks(bx, 2.66, w, 0.24, pct(st[s], tot) + "%", {s: 7.5, b: true, c: C.putih, a: "c", v: "m"}); bx += w; } }
  [["selesai", C.latar, C.navy], ["berjalan", C.krem, C.jingga], ["belum", C.merahM, C.merah]].forEach(([s, f, w], i) => {
    const x = px + 0.18 + i * (bw / 3), ww = bw / 3 - 0.06; k.kotak(x, 2.98, ww, 0.6, {f, r: 0.06});
    k.teks(x + 0.08, 3.0, ww, 0.32, [R(n0(st[s]), s === "selesai" ? C.navy : w, true), R(` / ${n0(ks.length)}`, C.abu)], {s: 15});
    k.teks(x + 0.08, 3.33, ww, 0.2, s === "belum" ? "belum selesai" : s, {s: 7, b: true, c: s === "selesai" ? C.navy : w});
  });
  const bs = ks.filter(x => x.status === "belum").map(x => x.lokasi || namaProv(c, x.prov));
  if (bs.length) k.teks(px + 0.18, 3.65, bw, 0.32, [R("Belum selesai: ", C.merah, true), R(bs.join(", "))], {s: 7});
  labelKecil(k, px + 0.18, 3.98, pw, "Perlu perhatian", C.merah);
  const ph = perhatian(c).slice(0, 6), rh = Math.min(0.32, 1.95 / Math.max(1, ph.length));
  ph.forEach((x, i) => {
    const y = 4.2 + i * rh, j = JENIS[x.jenis] || JENIS.lainnya;
    k.bulat(px + 0.3, y + 0.12, 0.1, {f: j.w});
    const potong = (t, n) => (t = String(t || "")).length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
    k.teks(px + 0.46, y, 1.95, 0.16, x.tambahan ? [R(potong(x.judul, 34), C.teks, true)] : [R(namaProv(c, x.prov), C.teks, true), R(potong(x.lokasi ? " · " + x.lokasi : "", 34 - namaProv(c, x.prov).length), C.teks)], {s: 7});
    k.teks(px + 0.46, y + 0.15, 1.95, 0.16, potong((x.tambahan ? x.isi : x.perhatian || x.utama) || "", 46), {s: 6.2, c: C.abu});
    pil(k, px + pw - 0.76, y + 0.03, x.status === "belum" ? "belum selesai" : "berjalan", {s: 5.6, w: 0.64, h: 0.17, f: x.status === "belum" ? C.merahM : C.krem, c: x.status === "belum" ? C.merah : C.jingga, b: true});
  });
  /* yang akan dilakukan */
  const td = (c.isi.tindak || []).filter(t => t.judul || t.isi).slice(0, 4);
  if (td.length) {
    labelKecil(k, 0.6, 6.2, 6, `Yang akan dilakukan ${c.isi.singkatan || "BNPB"}`);
    const tw = (12.15 - 0.15 * (td.length - 1)) / td.length;
    td.forEach((t, i) => { const x = 0.6 + i * (tw + 0.15); k.kotak(x, 6.42, tw, 0.56, {f: C.krem2, r: 0.06}); k.bulat(x + 0.27, 6.7, 0.17, {f: C.jingga});
      k.teks(x + 0.53, 6.45, tw - 0.6, 0.2, t.judul || "", {s: 8.5, b: true}); k.teks(x + 0.53, 6.65, tw - 0.6, 0.32, t.isi || "", {s: 6.8, c: C.abu}); });
  }
}});

/* panel rincian: kepala berwarna + daftar baris; baris yang tak muat diringkas "+N kejadian lain" */
function kepalaPanel(k, x, y, w, nama, n, j) {
  k.kotak(x, y, w, 0.48, {f: j.m, r: 0.1}); k.kotak(x, y + 0.3, w, 0.18, {f: j.m});
  k.bulat(x + 0.28, y + 0.24, 0.15, {f: j.w}); k.teks(x + 0.52, y, w - 1.2, 0.48, nama, {s: 11, b: true, v: "m"});
  k.teks(x + w - 0.7, y, 0.55, 0.48, n0(n), {s: 17, b: true, c: j.w, a: "r", v: "m"});
}
HARIAN.push({id: "rincian", judul: "Rincian per jenis", gambar: (k, c) => {
  const ks = c.isi.kejadian || [], kh = ks.filter(x => x.jenis === "karhutla"), kr = ks.filter(x => x.jenis === "kekeringan"), ln = ks.filter(x => x.jenis !== "karhutla" && x.jenis !== "kekeringan");
  const kk = jum(kr.map(x => /KK/i.test(x.utama) ? angkaTeks(x.utama) : 0));
  const lnJ = urutJenis(ln).map(([j, n]) => [J(n0(n)), R(" " + JENIS[j].nama.toLowerCase())]);
  const judul = c.isi.judul_rincian ? [R(c.isi.judul_rincian)] : [R("Rincian per jenis: "), J(n0(kh.length)), R(" karhutla"),
    ...(kh.some(x => x.status === "belum") ? [R(" dengan "), J(n0(kh.filter(x => x.status === "belum").length)), R(" kejadian belum selesai")] : []),
    ...(kr.length ? [R(", "), J(n0(kr.length)), R(" kekeringan"), ...(kk ? [R(" berdampak ±"), J(n0(kk)), R(" KK")] : [])] : []),
    ...lnJ.flatMap((x, i) => [R(!i ? ", serta " : i < lnJ.length - 1 ? ", " : lnJ.length > 2 ? ", dan " : " dan "), ...x])];
  rangka(k, c, judul);
  const y0 = 1.48, yb = 6.95;
  /* karhutla: tabel lokasi | luas | status */
  const xa = 0.6, wa = 5.6; kartu(k, xa, y0, wa, yb - y0); kepalaPanel(k, xa, y0, wa, "Karhutla", kh.length, JENIS.karhutla);
  k.teks(xa + 0.15, y0 + 0.58, 2, 0.18, "LOKASI", {s: 6.5, b: true, c: C.abu}); k.teks(xa + 2.55, y0 + 0.58, 1.5, 0.18, "LUAS TERBAKAR", {s: 6.5, b: true, c: C.abu}); k.teks(xa + 4.0, y0 + 0.58, 1.5, 0.18, "STATUS", {s: 6.5, b: true, c: C.abu});
  k.garis(xa + 0.15, y0 + 0.8, xa + wa - 0.15, y0 + 0.8, {c: "3A3F45", w: 0.75});
  const barisK = []; for (const [p, xs] of kelompok(kh)) { if (xs.length > 1) barisK.push({grup: p, n: xs.length, xs}); for (const x of xs) barisK.push({x, sub: xs.length > 1}); }
  const rhK = Math.min(0.235, (yb - y0 - 0.95) / Math.max(1, barisK.length)), sK = Math.min(7.5, rhK * 34);
  barisK.forEach((b, i) => {
    const y = y0 + 0.85 + i * rhK;
    if (b.grup) { k.kotak(xa + 0.08, y, wa - 0.16, rhK, {f: C.latar}); k.teks(xa + 0.15, y, 1.6, rhK, namaProv(c, b.grup), {s: sK, b: true, v: "m"});
      pil(k, xa + 0.15 + lebarTeks(namaProv(c, b.grup), sK, true) + 0.08, y + (rhK - 0.17) / 2, `${b.n} kejadian`, {s: 5.8, h: 0.17, f: C.krem, c: C.jingga});
      const tl = jum(b.xs.map(x => /\bha\b/.test(x.utama) ? angkaTeks(x.utama) : 0)); if (tl) pil(k, xa + 2.55, y + (rhK - 0.17) / 2, `total ± ${n2(tl)} ha`, {s: 6, h: 0.17, f: C.putih, l: C.jingga}); return; }
    const x = b.x, ix = xa + (b.sub ? 0.35 : 0.15);
    ikonStatus(k, ix + 0.08, y + rhK / 2, x.status, Math.min(0.085, rhK * 0.38));
    k.teks(ix + 0.22, y, 2.3 - (ix - xa), rhK, b.sub ? [R(x.lokasi || "")] : [R(namaProv(c, x.prov), C.teks, true), R(x.lokasi ? " · " + x.lokasi : "")], {s: sK, v: "m"});
    k.teks(xa + 2.55, y, 1.4, rhK, [R(x.utama || ""), R(x.kedua ? " " + x.kedua : "", C.abu)], {s: sK * 0.95, v: "m"});
    if (x.ket) { const [a, bb] = String(x.ket).split("|").map(s => s.trim()); let px = xa + 4.0;
      px += pil(k, px, y + (rhK - 0.17) / 2, a, {s: 5.8, h: 0.17, f: x.status === "belum" ? C.merahM : C.slateM, c: x.status === "belum" ? C.merah : C.navy}) + 0.05;
      if (bb) pil(k, px, y + (rhK - 0.17) / 2, bb, {s: 5.8, h: 0.17, f: C.krem, c: C.jingga, b: true}); }
    k.garis(xa + 0.15, y + rhK, xa + wa - 0.15, y + rhK, {c: "ECEEF1", w: 0.5});
  });
  /* kekeringan: lokasi | terdampak | bantuan air, total per provinsi */
  const xb = 6.35, wb = 3.65; kartu(k, xb, y0, wb, yb - y0); kepalaPanel(k, xb, y0, wb, "Kekeringan", kr.length, JENIS.kekeringan);
  k.teks(xb + 0.15, y0 + 0.58, 1, 0.18, "LOKASI", {s: 6.5, b: true, c: C.abu}); k.teks(xb + 1.3, y0 + 0.58, 1.2, 0.18, "TERDAMPAK", {s: 6.5, b: true, c: C.abu}); k.teks(xb + 2.45, y0 + 0.58, 1.2, 0.18, "BANTUAN AIR", {s: 6.5, b: true, c: C.abu});
  k.garis(xb + 0.15, y0 + 0.8, xb + wb - 0.15, y0 + 0.8, {c: "3A3F45", w: 0.75});
  const barisD = []; for (const [p, xs] of kelompok(kr)) { barisD.push({grup: p, xs}); for (const x of xs) barisD.push({x}); }
  const rhD = Math.min(0.36, (yb - y0 - 0.95) / Math.max(1, barisD.length)), sD = Math.min(7.5, rhD * 24);
  barisD.forEach((b, i) => {
    const y = y0 + 0.85 + i * rhD;
    if (b.grup) { k.kotak(xb + 0.08, y, wb - 0.16, rhD, {f: C.latar});
      k.teks(xb + 0.15, y, 1.15, rhD / 2, namaProv(c, b.grup), {s: sD, b: true, v: "m"}); k.teks(xb + 0.15, y + rhD / 2, 1.1, rhD / 2, "TOTAL", {s: 5.8, b: true, c: C.abu, v: "m"});
      const t = (re, f) => jum(b.xs.map(x => re.test(x[f]) ? angkaTeks(x[f]) : 0));
      const kkT = t(/KK/i, "utama"), jw = t(/jiwa/i, "kedua"), lt = t(/liter/i, "ket");
      if (kkT) k.teks(xb + 1.3, y, 1.15, rhD / 2, n0(kkT) + " KK", {s: sD, b: true, v: "m"}); if (jw) k.teks(xb + 1.3, y + rhD / 2, 1.15, rhD / 2, n0(jw) + " jiwa", {s: sD * 0.85, c: C.abu, v: "m"});
      if (lt) pil(k, xb + 2.45, y + (rhD - 0.18) / 2, n0(lt) + " liter", {s: 6, h: 0.18, f: C.putih, l: C.emas, b: true}); return; }
    const x = b.x; ikonStatus(k, xb + 0.25, y + rhD / 2, x.status, Math.min(0.085, rhD * 0.25));
    k.teks(xb + 0.4, y, 0.9, rhD, x.lokasi || "", {s: sD, v: "m"});
    k.teks(xb + 1.3, y + 0.02, 1.15, rhD / 2, x.utama || "", {s: sD, b: true, v: "m"}); k.teks(xb + 1.3, y + rhD / 2, 1.15, rhD / 2, x.kedua || "", {s: sD * 0.85, c: C.abu, v: "m"});
    if (x.ket) pil(k, xb + 2.45, y + 0.04, x.ket, {s: 6, h: 0.18, f: C.emasM, c: "6E5A22", b: true});
    if (x.catatan) k.teks(xb + 2.45, y + 0.23, 1.15, 0.14, x.catatan, {s: 5.5, c: C.abu});
    k.garis(xb + 0.15, y + rhD, xb + wb - 0.15, y + rhD, {c: "ECEEF1", w: 0.5});
  });
  /* bencana lainnya: kartu per kejadian */
  const xc = 10.15, wc = 2.6; kartu(k, xc, y0, wc, yb - y0); kepalaPanel(k, xc, y0, wc, "Bencana lainnya", ln.length, {w: C.slate, m: C.slateM});
  const ch = Math.min(1.3, (yb - y0 - 0.65) / Math.max(1, ln.length));
  ln.forEach((x, i) => {
    const y = y0 + 0.6 + i * ch, j = JENIS[x.jenis] || JENIS.lainnya;
    k.bulat(xc + 0.23, y + 0.13, 0.08, {f: j.w}); k.teks(xc + 0.37, y + 0.02, wc - 0.5, 0.2, j.nama, {s: 7.5, b: true});
    ikonStatus(k, xc + 0.23, y + 0.4, x.status, 0.075);
    k.teks(xc + 0.37, y + 0.3, wc - 0.5, 0.2, [R(namaProv(c, x.prov), C.teks, true), R(x.lokasi ? " · " + x.lokasi : "")], {s: 7.5});
    if (ch > 0.75) { k.teks(xc + 0.2, y + 0.56, wc - 0.35, 0.28, x.utama || "", {s: 13, b: true, c: j.w}); k.teks(xc + 0.2, y + 0.84, wc - 0.35, 0.2, x.kedua || "", {s: 6.8, c: C.abu}); }
    else k.teks(xc + 0.2, y + 0.5, wc - 0.35, 0.2, [R(x.utama || "", j.w, true), R(x.kedua ? "  " + x.kedua : "", C.abu)], {s: 7});
    if (x.ket && ch > 0.75) pil(k, xc + 0.2, y + 1.05, x.ket, {s: 6, h: 0.17, f: C.latar});
    if (i < ln.length - 1) k.garis(xc + 0.15, y + ch - 0.04, xc + wc - 0.15, y + ch - 0.04, {c: "ECEEF1", w: 0.5});
  });
}});
HARIAN.push({id: "penutup", judul: "Penutup", gambar: (k, c) => penutup(k, c, `Laporan Kejadian Bencana Harian  ·  ${rentang(c.isi.mulai, c.tanggal)}`)});

/* ============================================================ PRESIDEN */
const P = [];
const provP = c => (c.isi.prov || []).filter(p => p.nama);
const akhir = a => num((a || []).at(-1)) || 0;
const lapK = (c, i) => tglK(tambahHari(c.isi.hari[i], 1));   // tanggal laporan = hari data + 1

P.push({id: "sampul", judul: "Sampul", gambar: (k, c) => sampul(k, c, k => {
  const i = c.isi;
  k.teks(0.6, 1.75, 6.3, 1.75, i.judul || "Penanganan dan Pengendalian Kebakaran Hutan dan Lahan di Provinsi Prioritas", {s: 28, b: true});
  k.teks(0.6, 3.55, 6.3, 0.33, i.instansi || "Badan Nasional Penanggulangan Bencana", {s: 15, b: true, c: C.biru});
  k.teks(0.6, 3.93, 6.3, 0.26, `Disampaikan kepada ${i.kepada || "Presiden Republik Indonesia"}`, {s: 11});
  k.teks(0.6, 4.2, 6.3, 0.26, i.kepada_nama || "", {s: 11, b: true});
  blokPenyaji(k, c, 4.6, "Dipresentasikan oleh");
  pilTanggal(k, 5.8, tglHari(c.tanggal));
})});

P.push({id: "situasi", judul: "Situasi provinsi prioritas", gambar: (k, c) => {
  const pr = provP(c), hr = c.isi.hari || [], fs = c.isi.fs || [];
  const L = hr.map((_, i) => jum(pr.map(p => p.luas?.[i]))), B = hr.map((_, i) => jum(pr.map(p => p.belum?.[i]))), Hs = hr.map((_, i) => jum(pr.map(p => p.hotspot?.[i])));
  const la = L.at(-1) || 0, ba = B.at(-1) || 0, maks = [...pr].sort((a, b) => akhir(b.belum) - akhir(a.belum))[0];
  const judul = c.isi.judul_situasi ? [R(c.isi.judul_situasi)] : [R("Terdapat "), J(n0(akhir(fs))), R(" titik api di "), J(n0(pr.length) + " provinsi"), R(" prioritas; ±"), J(n2(la - ba) + " ha"), R(" ("), J(pct(la - ba, la) + " persen"), R(") dari ±"), J(n2(la) + " ha"), R(" lahan terbakar di titik api tersebut telah berhasil dipadamkan")];
  rangka(k, c, judul, {gy: 1.38, s: 19.5});
  k.teks(0.6, 1.05, 11.5, 0.28, [R("Belum padam ±"), J(n2(ba) + " ha"), ...(maks ? [R("; terbesar di "), Bi(maks.nama)] : []), ...(c.isi.sub_catatan ? [R(" " + c.isi.sub_catatan)] : [])], {s: 12});
  /* kepala kelompok */
  const x0 = 2.25, gw = 3.42, gap = 0.12, kol = hr.length || 3, cw = gw / kol;
  [["HOTSPOT", "(titik)", C.navy], ["LUAS TERBAKAR / TARGET", "(ha)", "5B7A99"], ["BELUM PADAM", "(ha)", C.jingga]].forEach(([a, b, f], g) => {
    const x = x0 + g * (gw + gap); k.kotak(x, 1.5, gw, 0.36, {f, r: 0.06}); k.teks(x + 0.15, 1.5, gw - 0.2, 0.36, [R(a + "  ", C.putih, true), R(b, "D8DEE5")], {s: 8.5, v: "m"});
  });
  k.teks(0.6, 1.95, 1.6, 0.25, "PROVINSI", {s: 7, b: true, c: C.abu, v: "m"});
  hr.forEach((h, i) => [0, 1, 2].forEach(g => { const last = i === kol - 1; k.teks(x0 + g * (gw + gap) + i * cw, 1.95, cw - 0.08, 0.25, tglK(h), {s: 7.5, b: last, a: "r", v: "m", c: last ? (g === 2 ? C.jingga : g === 1 ? C.biru : C.navy) : C.abu}); }));
  k.garis(0.6, 2.22, 12.75, 2.22, {c: "3A3F45", w: 1});
  const rh = Math.min(0.38, 2.55 / Math.max(1, pr.length + 1));
  k.kotak(x0 + 2 * (gw + gap), 2.24, gw, rh * pr.length, {f: C.krem2});
  pr.forEach((p, r) => {
    const y = 2.24 + r * rh; if (r % 2 === 0) k.kotak(0.6, y, x0 + 2 * (gw + gap) - 0.6, rh, {f: "F6F7F9"});
    k.teks(0.7, y, 1.6, rh, p.nama, {s: 9.5, b: r === 0, v: "m"});
    hr.forEach((_, i) => { const last = i === kol - 1;
      k.teks(x0 + i * cw, y, cw - 0.08, rh, n0(p.hotspot?.[i]), {s: 9, b: last, a: "r", v: "m"});
      k.teks(x0 + (gw + gap) + i * cw, y, cw - 0.08, rh, n2(p.luas?.[i]), {s: 9, b: last, a: "r", v: "m"});
      k.teks(x0 + 2 * (gw + gap) + i * cw, y, cw - 0.08, rh, n2(p.belum?.[i]), {s: 9, b: last, a: "r", v: "m", c: last ? C.jingga : "E0A578"}); });
  });
  const yj = 2.24 + pr.length * rh; k.kotak(0.6, yj, 12.15, rh, {f: C.navy, r: 0.05});
  k.teks(0.7, yj, 1.6, rh, "Jumlah", {s: 9.5, b: true, c: C.putih, v: "m"});
  hr.forEach((_, i) => { k.teks(x0 + i * cw, yj, cw - 0.08, rh, n0(Hs[i]), {s: 9, b: true, a: "r", v: "m", c: C.putih}); k.teks(x0 + (gw + gap) + i * cw, yj, cw - 0.08, rh, n2(L[i]), {s: 9, b: true, a: "r", v: "m", c: C.putih});
    k.teks(x0 + 2 * (gw + gap) + i * cw, yj, cw - 0.08, rh, n2(B[i]), {s: 9, b: true, a: "r", v: "m", c: "F4B183"}); });
  if (fs.length) { k.teks(0.7, yj + rh + 0.06, 1.5, 0.22, "Fire spot (FS)", {s: 8, c: C.abu, v: "m", i: true});
    fs.forEach((v, i) => { const last = i === fs.length - 1; pil(k, x0 + i * cw + (cw - 0.7) / 2, yj + rh + 0.08, `${n0(v)} FS`, {s: 6.5, w: 0.62, h: 0.19, b: true, f: last ? C.navy : "E8EBEF", c: last ? C.putih : C.teks}); }); }
  /* penanganan + modifikasi cuaca */
  const pn = c.isi.penanganan || {}, y1 = 5.3, h1 = 1.42; kartu(k, 0.6, y1, 7.7, h1); k.bulat(0.92, y1 + 0.32, 0.2, {f: C.navy}); labelKecil(k, 1.22, y1 + 0.22, 3, "Penanganan", C.navy);
  [[pn.personel, "personel darat"], [pn.heli, "helikopter water bombing"], [pn.pesawat, "pesawat patroli/OMC"]].forEach(([v, l], i) => {
    const x = 0.8 + i * 0.95; k.teks(x, y1 + 0.66, 0.95, 0.32, n0(v), {s: 15, b: true}); k.teks(x, y1 + 0.98, 0.85, 0.36, l, {s: 6.5, c: C.abu});
  });
  const un = (pn.unsur || []).filter(u => u.nama), ut = jum(un.map(u => u.n));
  k.teks(3.7, y1 + 0.12, 4.4, 0.18, `PER UNSUR, ${n0(ut)} personel${pn.tanggal_unsur ? ` (data ${pn.tanggal_unsur})` : ""}`, {s: 6, b: true, c: C.abu});
  un.slice(0, 9).forEach((u, i) => { const x = 3.7 + Math.floor(i / 3) * 1.5, y = y1 + 0.38 + (i % 3) * 0.3;
    k.teks(x, y, 0.75, 0.24, u.nama, {s: 7, b: i === 0, c: i === 0 ? C.jingga : C.teks, v: "m"}); k.teks(x + 0.62, y, 0.55, 0.24, n0(u.n), {s: 7.5, b: true, a: "r", c: i === 0 ? C.jingga : C.teks, v: "m"});
    k.teks(x + 1.2, y, 0.3, 0.24, pct(u.n, ut) + "%", {s: 6, c: C.abu, v: "m"}); });
  const om = c.isi.omc || {}; kartu(k, 8.5, y1, 4.25, h1); k.bulat(8.82, y1 + 0.32, 0.2, {f: C.navy}); labelKecil(k, 9.12, y1 + 0.22, 3, "Modifikasi cuaca", C.navy);
  k.teks(8.75, y1 + 0.6, 3.9, 0.36, [R(om.judul || "", C.navy, true), R("  " + (om.ket || ""), C.teks)], {s: 17, v: "m"});
  let ox = 8.75, oy = y1 + 1.03;
  for (const [t, tanpa] of [...String(om.hujan || "").split(";").map(s => [s.trim(), false]), ...String(om.tanpa || "").split(";").map(s => [s.trim(), true])]) {
    if (!t) continue; const w = lebarTeks(t, 6.5, true) + 0.22; if (ox + w > 12.6) { ox = 8.75; oy += 0.24; }
    ox += pil(k, ox, oy, t, {s: 6.5, b: !tanpa, f: tanpa ? C.latar : "E3E8EE", c: tanpa ? C.abu : C.navy}) + 0.06;
  }
}});

const WARNA_EF = {lambat: C.merah, "belum efektif": C.merah, efektif: C.navy, terkendali: "6B7280"};
const warnaEf = s => WARNA_EF[String(s || "").toLowerCase()] || (/fs|baru/i.test(s) ? C.jingga : C.navy);
P.push({id: "efektivitas", judul: "Efektivitas penanganan", gambar: (k, c) => {
  const pr = provP(c).slice(0, 6), hr = c.isi.hari || [];
  const ubah = p => { const a = num(p.belum?.[0]), b = akhir(p.belum); return a ? (b / a - 1) * 100 : 0; };
  const turun = pr.filter(p => ubah(p) <= -50), naik = pr.filter(p => ubah(p) > 0), lambat = pr.filter(p => /lambat/i.test(p.status));
  const daftar = a => a.map(p => p.nama).reduce((s, n, i, arr) => [...s, ...(i ? [R(i === arr.length - 1 ? " dan " : ", ")] : []), Bi(n)], []);
  const judul = c.isi.judul_efektivitas ? [R(c.isi.judul_efektivitas)] : [R("Efektivitas penanganan: "),
    ...(turun.length ? [R("sisa api di "), ...daftar(turun), R(" turun "), J(Math.round(-Math.min(...turun.map(ubah))) + " persen")] : [R("belum ada provinsi yang sisa apinya turun separuh")]),
    ...(lambat.length ? [R("; penanganan "), ...daftar(lambat), R(" lambat")] : []),
    ...(naik.length ? [R("; sisa api di "), ...daftar(naik), R(" bertambah")] : [])];
  rangka(k, c, judul, {gy: 1.38, tj: 1.0, s: 19.5});
  const cw = 3.95, chh = 2.45, gx = 0.15;
  pr.forEach((p, i) => {
    const x = 0.6 + (i % 3) * (cw + gx), y = 1.55 + Math.floor(i / 3) * (chh + 0.18), w = warnaEf(p.status), b = akhir(p.belum), l = akhir(p.luas), u = ubah(p);
    kartu(k, x, y, cw, chh); k.kotak(x, y, cw, 0.07, {f: w, r: 0.03});
    k.teks(x + 0.2, y + 0.18, 2.3, 0.3, p.nama, {s: 12.5, b: true});
    if (p.status) { const t = String(p.status).toUpperCase(), pw = lebarTeks(t, 7, true) + 0.28; pil(k, x + cw - pw - 0.15, y + 0.2, t, {s: 7, b: true, w: pw, h: 0.25, f: w, c: C.putih}); }
    k.teks(x + 0.2, y + 0.55, 2.2, 0.45, "±" + n2(b), {s: 23, b: true, c: /lambat|belum/i.test(p.status) || u > 0 ? C.jingga : C.navy});
    k.teks(x + 0.2, y + 1.0, 2.2, 0.18, `ha belum padam, laporan ${hr.length ? lapK(c, hr.length - 1) : ""}`, {s: 6.8, c: C.abu});
    const dt = u > 0 ? `naik ${Math.round(u)}%` : u < 0 ? `turun ${Math.round(-u)}%` : "tetap";
    let px = x + 0.2; px += pil(k, px, y + 1.22, `${dt} sejak ${hr.length ? lapK(c, 0) : ""}`, {s: 6.5, b: true, h: 0.21, f: u > 0 ? C.krem : "E8EBEF", c: u > 0 ? C.jingga : C.navy}) + 0.06;
    pil(k, px, y + 1.22, `${pct(l - b, l)}% padam`, {s: 6.5, h: 0.21, f: C.latar});
    /* batang belum padam 3 laporan */
    const bv = (p.belum || []).map(num), mx = Math.max(1, ...bv.map(v => v || 0)), bx0 = x + 2.45, bw = 0.38, bh = 0.85, by = y + 1.45;
    bv.forEach((v, j) => { const last = j === bv.length - 1, hh = bh * (v || 0) / mx, xx = bx0 + j * (bw + 0.08);
      k.kotak(xx, by - hh, bw, Math.max(0.01, hh), {f: last ? (u > 0 ? C.jingga : C.navy) : j === bv.length - 2 ? "AEB6C0" : "D5D9DE"});
      k.teks(xx - 0.1, by - hh - 0.17, bw + 0.2, 0.15, fmt(v, v != null && v < 100 && v % 1 ? 1 : 0), {s: 6.5, b: last, a: "c"});
      k.teks(xx - 0.1, by + 0.03, bw + 0.2, 0.15, hr[j] ? (last ? lapK(c, j) : String(tglObj(tambahHari(hr[j], 1)).getUTCDate())) : "", {s: 6, b: last, a: "c", c: C.abu}); });
    k.garis(x + 0.2, y + 1.68, x + cw - 0.2, y + 1.68, {c: "E3E6EA", w: 0.5});
    [[n0(p.personel), "personel"], [n0(p.heli), p.heli_ket || "heli WB"], [n0(p.omc), p.omc ? "sortie OMC" : "tanpa OMC"], ["±" + fmt(p.wb_ha, 0), "ha padam WB, 3 hari"]].forEach(([v, lb], j) => {
      const xx = x + 0.2 + j * 0.93; k.teks(xx, y + 1.73, 0.9, 0.24, v, {s: 11, b: true}); k.teks(xx, y + 1.96, 0.9, 0.16, lb, {s: 5.8, c: C.abu});
    });
    let kx = x + 0.2; for (const t of String(p.kendala || "").split(";").map(s => s.trim()).filter(Boolean).slice(0, 3)) { const ww = lebarTeks(t, 6, true) + 0.22; if (kx + ww > x + cw - 0.1) break; kx += pil(k, kx, y + 2.17, t, {s: 6, b: true, h: 0.19, f: "EEF1F5", c: C.slate}) + 0.05; }
  });
  if (hr.length > 1) k.teks(6.5, 6.78, 6.25, 0.2, `Penilaian dari perubahan luas belum padam laporan ${lapK(c, 0)} ke ${lapK(c, hr.length - 1)} dan % padam laporan ${lapK(c, hr.length - 1)}`, {s: 6.8, c: C.abu, a: "r", i: true});
}});

const warnaPeluang = v => v >= 50 ? ["B83227", C.putih] : v >= 30 ? ["E07B39", C.putih] : v > 0 ? ["E3C15A", C.teks] : ["EEF0F2", C.abu];
P.push({id: "prioritas", judul: "Prioritas provinsi", gambar: (k, c) => {
  const pz = c.isi.prioritas || {}, br = (pz.baris || []).filter(b => b.nama), hr7 = pz.hari || [], per = pz.periode || [];
  const masuk = br.filter(b => /masuk/i.test(b.status)), keluar = br.filter(b => /keluar/i.test(b.status)), aktif = br.filter(b => !/keluar/i.test(b.status));
  const nm = a => a.reduce((s, b, i, arr) => [...s, ...(i ? [R(i === arr.length - 1 ? " dan " : ", ")] : []), Bi(b.nama)], []);
  const judul = pz.judul ? [R(pz.judul)] : [R("Berdasarkan data terbaru, "), ...(masuk.length ? [...nm(masuk), R(" masuk prioritas, ")] : []), ...(keluar.length ? [...nm(keluar), R(" dikeluarkan; ")] : []),
    R("terdapat "), J(n0(aktif.length) + " provinsi"), R(" yang menjadi prioritas")];
  rangka(k, c, judul);
  const xs = 3.5, sw = 3.75, x3 = 7.3, xh = 8.3, hw = 4.45;
  k.teks(xs, 1.42, sw + 1.3, 0.22, `HOTSPOT ${hr7.length ? `${tglObj(hr7[0]).getUTCDate()}–${tglK(hr7.at(-1)).toUpperCase()}` : ""} (SATELIT)`, {s: 8, b: true, c: C.jingga, a: "c"});
  k.teks(xh, 1.42, hw, 0.22, `PELUANG MASA PUNCAK${pz.pola ? ` (${pz.pola.toUpperCase()})` : ""}`, {s: 8, b: true, c: C.jingga, a: "c"});
  k.teks(0.6, 1.72, 1, 0.2, "PERINGKAT", {s: 6, b: true, c: C.abu}); k.teks(x3 - 0.4, 1.66, 1.35, 0.3, "3 hari terakhir vs sebelumnya", {s: 6, c: C.abu, a: "r"});
  const sl = sw / 7; hr7.forEach((h, i) => k.teks(xs + i * sl, 1.7, sl, 0.2, String(tglObj(h).getUTCDate()), {s: 7, a: "c", b: i >= 4, c: i >= 4 ? C.teks : C.abu}));
  const pw = hw / Math.max(1, per.length); per.forEach((t, i) => k.teks(xh + i * pw, 1.7, pw, 0.2, t, {s: 7.5, a: "c", b: i === 0}));
  const rh = Math.min(0.62, (6.62 - 1.98 - 0.3 - (pz.sumber ? 0.36 : 0)) / Math.max(1, br.length));
  br.forEach((b, r) => {
    const y = 1.98 + r * rh, kel = /keluar/i.test(b.status), ms = /masuk/i.test(b.status);
    if (ms) k.kotak(0.6, y, xh - 0.7, rh - 0.04, {f: C.krem2});
    if (kel) k.garis(0.6, y, 12.75, y, {c: "3A3F45", w: 1});
    k.teks(0.6, y, 0.5, rh, String(b.peringkat ?? r + 1), {s: 16, b: true, c: kel ? C.abu2 : C.navy, v: "m"});
    k.teks(1.1, y + 0.04, 1.9, 0.24, b.nama, {s: 10, b: true, c: kel ? C.abu : C.teks});
    let px = 1.1; const st = String(b.status || "tetap").toUpperCase();
    px += pil(k, px, y + 0.32, st, {s: 6, b: true, h: 0.19, w: 0.62, f: ms ? C.jingga : kel ? C.abu2 : "E3E8EE", c: ms || kel ? C.putih : C.navy}) + 0.05;
    if (b.total != null) px += pil(k, px, y + 0.32, `${n0(b.total)} hotspot`, {s: 6, h: 0.19, f: C.latar}) + 0.05;
    if (b.luas) pil(k, px, y + 0.32, b.luas, {s: 6, h: 0.19, f: C.krem, c: C.jingga, b: true});
    const t = (b.titik || []).map(v => num(v) || 0), mx = Math.max(1, ...t), bh = rh - 0.26, a3 = jum(t.slice(-3)), s3 = jum(t.slice(-6, -3)), ub = s3 ? (a3 / s3 - 1) * 100 : 0;
    t.forEach((v, i) => { const hh = Math.max(0.015, bh * 0.6 * v / mx), xx = xs + i * sl + sl * 0.2, by = y + rh - 0.12;
      k.kotak(xx, by - hh, sl * 0.6, hh, {f: i === 0 ? "E3E6EA" : i < 4 ? "AEB6C0" : ub >= 0 ? C.jingga : C.navy});
      k.teks(xs + i * sl - 0.05, by - hh - 0.15, sl + 0.1, 0.14, n0(v), {s: 5.8, a: "c", b: i >= 4});
      if (i) { const pv = t[i - 1], ch = pv ? Math.round((v / pv - 1) * 100) : null; k.teks(xs + i * sl - 0.05, by + 0.005, sl + 0.1, 0.11, ch == null ? "baru" : `${ch >= 0 ? "+" : ""}${ch}%`, {s: 5, a: "c", c: ch != null && ch >= 0 ? C.jingga : C.abu}); } });
    k.teks(x3 - 0.4, y + 0.06, 1.35, 0.24, `${n0(a3)} titik`, {s: 9.5, b: true, a: "r"});
    k.teks(x3 - 0.4, y + 0.3, 1.35, 0.24, `${ub >= 0 ? "naik" : "turun"} ${Math.abs(Math.round(ub))}%`, {s: 9.5, b: true, a: "r", c: ub >= 0 ? C.merah : C.navy});
    (b.peluang || []).slice(0, per.length).forEach((v, i) => { const [f, tc] = warnaPeluang(num(v) || 0);
      k.kotak(xh + i * pw + 0.04, y + 0.05, pw - 0.08, rh - 0.12, {f, r: 0.05}); k.teks(xh + i * pw, y + 0.05, pw, rh - 0.12, `${n0(v)}%`, {s: 9, b: true, c: tc, a: "c", v: "m"}); });
  });
  const yl = 1.98 + br.length * rh + 0.08;
  [["E3E6EA", hr7[0] ? tglK(hr7[0]) : "hari pertama"], ["AEB6C0", "3 hari pembanding"], [C.jingga, "3 hari terakhir naik"], [C.navy, "3 hari terakhir turun"]].forEach(([f, t], i) => {
    k.kotak(0.6 + i * 1.8, yl + 0.04, 0.22, 0.12, {f}); k.teks(0.88 + i * 1.8, yl, 1.5, 0.2, t, {s: 6.8}); });
  [["E3C15A", "rendah"], ["E07B39", "sedang 30–49%"], ["B83227", "50% ke atas"]].forEach(([f, t], i) => { k.kotak(8.3 + i * 1.5, yl + 0.04, 0.22, 0.12, {f}); k.teks(8.58 + i * 1.5, yl, 1.2, 0.2, t, {s: 6.8}); });
  if (pz.sumber) k.teks(0.6, yl + 0.26, 12.15, 0.4, pz.sumber, {s: 6.3, c: C.abu});
}});

const JENIS_K = [["sawit", "Sawit", C.jingga], ["hti", "HTI", C.navy], ["hph", "HPH", "5B7A99"], ["tambang", "Tambang", "AEB6C0"]];
P.push({id: "konsesi", judul: "Areal konsesi", gambar: (k, c) => {
  const ko = c.isi.konsesi || {}, kp = ko.kpi || {}, pv = (ko.prov || []).filter(p => p.nama);
  const judul = ko.judul ? [R(ko.judul)] : [R(`Sejak Januari ${c.tahun}, sebanyak `), J(n0(kp.areal)), R(" areal konsesi di provinsi prioritas terindikasi memiliki lahan yang terbakar seluas ±"), J(n0(kp.ha) + " ha"), R("; "), J(n0(kp.aktif) + " konsesi"), R(" masih memiliki titik panas dalam "), J("7"), R(" hari terakhir")];
  rangka(k, c, judul, {gy: 1.38, s: 19, tj: 1.0});
  const kart = [[n0(kp.areal), "areal konsesi", kp.areal_total ? kp.areal / kp.areal_total : 0, `${pct(kp.areal, kp.areal_total)}% dari ${n0(kp.areal_total)} konsesi di peta terindikasi terbakar`, C.jingga],
    [n0(kp.titik), "titik panas", kp.titik ? kp.titik7 / kp.titik : 0, `${n0(kp.titik7)} titik dalam 7 hari terakhir`, C.navy],
    ["±" + n0(kp.ha), "ha indikasi terbakar", kp.ha_konsesi ? kp.ha / kp.ha_konsesi : 0, `dari ${fmt(kp.ha_konsesi / 1e6, 1)} juta ha luas areal konsesi`, C.jingga],
    ["±" + n0(kp.gambut), "ha di lahan gambut", kp.ha ? kp.gambut / kp.ha : 0, "dari luas indikasi terbakar", "7A5230"],
    [n0(kp.aktif), "konsesi masih ada api", kp.areal ? kp.aktif / kp.areal : 0, `dari ${n0(kp.areal)} konsesi bertitik panas`, C.merah]];
  const kw = (12.15 - 0.15 * 4) / 5;
  kart.forEach(([v, l, f, ket, w], i) => { const x = 0.6 + i * (kw + 0.15); kartu(k, x, 1.55, kw, 1.15);
    k.bulat(x + 0.33, 1.88, 0.2, {f: C.latar}); k.teks(x + 0.62, 1.65, kw - 0.7, 0.3, v, {s: 15, b: true, c: i === 4 ? C.merah : i >= 2 ? C.jingga : C.navy}); k.teks(x + 0.62, 1.95, kw - 0.7, 0.18, l, {s: 7, b: true});
    const bw = kw - 0.85; k.kotak(x + 0.15, 2.27, bw, 0.1, {f: "EEF0F2"}); k.kotak(x + 0.15, 2.27, Math.max(0.02, bw * Math.min(1, f)), 0.1, {f: w});
    k.teks(x + kw - 0.68, 2.2, 0.55, 0.22, fmt(f * 100, f < 0.1 ? 1 : 0) + "%", {s: 9, b: true, a: "r", c: w}); k.teks(x + 0.15, 2.42, kw - 0.3, 0.22, ket, {s: 5.8, c: C.abu}); });
  /* per provinsi: batang bertumpuk menurut jenis */
  k.teks(0.6, 2.9, 7.3, 0.25, "Indikasi luas terbakar per provinsi, menurut jenis usaha", {s: 10.5}); k.garis(0.6, 3.17, 8.15, 3.17, {c: "3A3F45", w: 0.75});
  JENIS_K.forEach(([, l, f], i) => { k.kotak(2.15 + i * 0.8, 3.27, 0.16, 0.11, {f}); k.teks(2.36 + i * 0.8, 3.22, 0.6, 0.2, l, {s: 6.5}); });
  k.teks(5.6, 3.22, 0.9, 0.2, "HEKTAR", {s: 6.5, b: true, c: C.abu, a: "r"}); k.teks(6.6, 3.22, 1.6, 0.2, "KONSESI TERBAKAR / TOTAL", {s: 6.5, b: true, c: C.abu});
  const tot = p => jum(JENIS_K.map(([j]) => p[j])), mx = Math.max(1, ...pv.map(tot)), rh = Math.min(0.5, 3.15 / Math.max(1, pv.length)), bw = 3.3;
  pv.forEach((p, r) => { const y = 3.5 + r * rh, t = tot(p);
    k.teks(0.6, y, 1.5, rh * 0.62, p.nama, {s: 9, b: r < 2, v: "m"});
    k.kotak(2.15, y + 0.06, bw, 0.22, {f: "F1F2F4"});
    let bx = 2.15; const kecil = [];
    for (const [j, l, f] of JENIS_K) { const w = bw * (num(p[j]) || 0) / mx; if (w <= 0) continue; k.kotak(bx, y + 0.06, w, 0.22, {f}); if (w > 0.5) k.teks(bx, y + 0.06, w, 0.22, n0(p[j]), {s: 6, b: true, c: C.putih, a: "c", v: "m"}); else kecil.push(R(`■ ${l} ${n0(p[j])}  `, f === "AEB6C0" ? C.teks : f, false)); bx += w; }
    if (kecil.length) k.teks(2.15, y + 0.29, bw + 2, 0.15, kecil, {s: 5.8});
    k.teks(5.5, y, 1.0, rh * 0.62, n0(t), {s: 9.5, b: true, a: "r", v: "m"});
    k.teks(6.65, y, 1.0, rh * 0.62, [R(n0(p.n), C.teks, true), R(` / ${n0(p.total)}`, C.abu)], {s: 9, v: "m"});
    const q = pct(p.n, p.total); pil(k, 7.6, y + 0.05, q + "%", {s: 7.5, b: true, w: 0.5, h: 0.24, f: q >= 50 ? C.krem : C.latar, c: q >= 50 ? C.jingga : C.teks}); });
  /* per jenis usaha */
  k.garis(8.45, 2.9, 8.45, 6.6, {c: C.garis, w: 0.75});
  k.teks(8.7, 2.9, 4, 0.25, "Per jenis usaha", {s: 10.5}); k.garis(8.7, 3.17, 12.75, 3.17, {c: "3A3F45", w: 0.75});
  const jn = (ko.jenis || []).filter(j => j.nama), jt = jum(jn.map(j => j.ha)), jm = Math.max(1, ...jn.map(j => num(j.ha) || 0));
  jn.slice(0, 4).forEach((j, i) => { const y = 3.32 + i * 0.8, f = JENIS_K.find(x => x[1].toLowerCase() === String(j.nama).toLowerCase())?.[2] || C.navy;
    k.bulat(8.95, y + 0.25, 0.22, {f: C.krem2}); k.bulat(8.95, y + 0.25, 0.07, {f});
    k.teks(9.3, y + 0.02, 1.5, 0.22, j.nama, {s: 9.5, b: true}); k.teks(10.8, y + 0.02, 1.95, 0.22, [R(n0(j.ha) + " ha  ", C.teks, true), R(pct(j.ha, jt) + "%", f, true)], {s: 9.5, a: "r"});
    k.kotak(9.3, y + 0.28, 3.45, 0.09, {f: "EEF0F2"}); k.kotak(9.3, y + 0.28, Math.max(0.02, 3.45 * (num(j.ha) || 0) / jm), 0.09, {f});
    let px = 9.3; px += pil(k, px, y + 0.44, `${n0(j.n)} dari ${n0(j.total)} konsesi`, {s: 6, h: 0.19, f: C.latar}) + 0.06;
    const q = pct(j.n, j.total); pil(k, px, y + 0.44, `${q}% terbakar`, {s: 6, h: 0.19, f: q >= 50 ? C.krem : C.latar, c: q >= 50 ? C.jingga : C.teks}); });
  if (ko.sumber) k.teks(0.6, 6.62, 12.15, 0.4, ko.sumber, {s: 6.5, c: C.abu});
}});

P.push({id: "kesimpulan", judul: "Kesimpulan", gambar: (k, c) => {
  rangka(k, c, [R("Kesimpulan")], {s: 21, tj: 0.5, gy: 1.3});
  const ks = (c.isi.kesimpulan || []).filter(x => x.judul || x.isi).slice(0, 8), n = ks.length, kol = Math.min(4, n), bar = Math.ceil(n / 4) || 1;
  const cw = (12.15 - 0.15 * (kol - 1)) / Math.max(1, kol), ch = Math.min(2.05, (4.4 - 0.15 * (bar - 1)) / bar);
  ks.forEach((x, i) => { const cx = 0.6 + (i % 4) * (cw + 0.15), cy = 1.5 + Math.floor(i / 4) * (ch + 0.15), ora = /situasi|tren|dampak/i.test(x.label || "");
    kartu(k, cx, cy, cw, ch); k.bulat(cx + 0.42, cy + 0.42, 0.24, {f: ora ? C.krem : "E8EBEF"}); k.bulat(cx + 0.42, cy + 0.42, 0.08, {f: ora ? C.jingga : C.navy});
    k.teks(cx + cw - 0.75, cy + 0.15, 0.6, 0.3, String(i + 1).padStart(2, "0"), {s: 13, b: true, c: "D5D9DE", a: "r"});
    k.teks(cx + 0.2, cy + 0.78, cw - 0.4, 0.18, String(x.label || "").toUpperCase(), {s: 6.8, b: true, c: ora ? C.jingga : C.navy});
    k.teks(cx + 0.2, cy + 0.98, cw - 0.4, 0.5, x.judul || "", {s: 12, b: true});
    k.teks(cx + 0.2, cy + 1.45, cw - 0.4, ch - 1.5, x.isi || "", {s: 7.5, c: "3A3F45"}); });
  if (c.isi.arahan) { const y = 1.5 + bar * (ch + 0.15) + 0.02; k.kotak(0.6, y, 12.15, 0.6, {f: C.jingga, r: 0.08}); k.bulat(1.0, y + 0.3, 0.2, {f: C.putih});
    k.teks(0.92, y, 0.16, 0.6, "!", {s: 13, b: true, c: C.jingga, a: "c", v: "m"});
    k.teks(1.4, y, 11.2, 0.6, [R("ARAHAN    ", "FCE3CF", true), R(c.isi.arahan, C.putih, true)], {s: 10.5, v: "m"}); }
}});
P.push({id: "penutup", judul: "Penutup", gambar: (k, c) => penutup(k, c, `Laporan Penanganan Karhutla kepada ${c.isi.kepada || "Presiden Republik Indonesia"}, ${tglHari(c.tanggal)}`)});

HARIAN.forEach(PS.lengkapi); P.forEach(PS.lengkapi);
window.LaporanBnpbSlide = {DECK: {harian: HARIAN, presiden: P}, JENIS, STATUS, C, tglP, tglK, tglHari, rentang, tambahHari, angkaTeks};
})();
