/* laporan_matador.js: deck "Matador" untuk layar besar ruang konferensi pers, dari isian harian yang SAMA.
   Beda dengan deck harian/konpers: huruf isi >= 28 pt dan judul >= 44 pt (kanvas 16:9), satu gagasan per halaman dengan angka utama sangat besar,
   daftar dipecah paling banyak 5 baris per halaman ("(1/3)"), latar navy + teks putih + angka jingga, tanpa tabel; semua detail tetap ada, hanya lebih banyak halaman.
   Rasio kanvas = parameter (c.W, c.H; ASPEK): 16:9 bawaan, 32:9 untuk videotron lebar. Kanvas tiga keluaran dipinjam dari paparan_slide.js. */
(() => {
const LB = window.LaporanBnpbSlide, PS = window.PaparanSlide, K = window.LaporanKonpers, {JENIS, STATUS, C, tglHari, rentang, KONTAK, H: {R, n0, kelompok, namaProv, W: W0, H: H0}} = LB;
const UKURAN = {isi: 28, judul: 44, angka: 150, sampul: 60};
const ASPEK = {"16:9": [W0, H0], "32:9": [W0 * 2, H0]};
const MAKS_BARIS = 5, ASPEK_PETA = 1750 / 732;
const NAVY = C.navy, PUTIH = C.putih, JINGGA = "F08A3C", TEDUH = "D1D5DB", MERAH = "FF8A80";
const J = t => R(t, JINGGA, true);
const LH = UKURAN.isi * 1.2 / 72;   // tinggi satu baris isi (inci)
const cpl = W => Math.floor((W - 2.2) / (UKURAN.isi * 0.58 / 72));   // perkiraan huruf per baris (konservatif: Roboto 28 pt)
const panjang = runs => runs.reduce((a, r) => a + r.t.length, 0);
const baris = (W, ...runs) => ({runs, baris: Math.min(MAKS_BARIS, Math.max(1, Math.ceil(panjang(runs) / cpl(W))))});
const warnaStatus = s => s === "belum" ? MERAH : PUTIH;

/* ------------------------------------------------------------ isi halaman (murni) */
function baruKejadian(W, c, x) {
  const ket = x.ket ? String(x.ket).split("|").map(s => s.trim()).filter(Boolean) : [];
  return baris(W, R(namaProv(c, x.prov), PUTIH, true), R(x.lokasi ? ", " + x.lokasi : ""), R(": "), x.utama ? J(x.utama) : R(""), R(x.kedua ? ", " + x.kedua : ""), R(ket.length ? ", " + ket.join(", ") : ""), R(`, ${STATUS[x.status]?.nama || ""}`, warnaStatus(x.status)));
}
const barisTeks = (W, x) => baris(W, R(x.judul || "", PUTIH, true), R(x.isi ? ": " + x.isi : ""));
/* daftar -> halaman daftar bertitle "(i/n)" */
function daftar(W, judul, rows, id) {
  const hal = K.pecahHalaman(rows, r => r.baris, MAKS_BARIS);
  return hal.map((rs, i) => ({t: "daftar", id: `${id}${hal.length > 1 ? i + 1 : ""}`, judul: hal.length > 1 ? `${judul} (${i + 1}/${hal.length})` : judul, rows: rs}));
}
function halaman(c) {
  const W = c.W || ASPEK["16:9"][0], i = c.isi, ks = K.kejadian(c), tb = K.tambahan(c), out = [];
  const nProv = new Set(ks.map(x => x.prov).filter(Boolean)).size, belum = ks.filter(x => x.status === "belum");
  out.push({t: "sampul", id: "sampul"});
  out.push({t: "angka", id: "kejadian", judul: "Kejadian bencana menonjol", angka: n0(ks.length), label: [R("di "), J(n0(nProv)), R(` provinsi, ${rentang(i.mulai, c.tanggal)}`)]});
  const jn = Object.keys(JENIS).map(j => [j, ks.filter(x => x.jenis === j).length]).filter(x => x[1]);
  out.push(...daftar(W, "Menurut jenis bencana", jn.map(([j, n]) => baris(W, J(n0(n)), R(" " + JENIS[j].nama.toLowerCase()))), "jenis"));
  out.push({t: "angka", id: "belum", judul: "Belum selesai ditangani", angka: n0(belum.length), label: [R(`dari ${n0(ks.length)} kejadian menonjol`)]});
  if (belum.length) out.push(...daftar(W, "Belum selesai", belum.map(x => baris(W, R(namaProv(c, x.prov), PUTIH, true), R(x.lokasi ? ", " + x.lokasi : ""), R(": "), J(x.utama || x.perhatian || ""))), "belum-daftar"));
  if (c.aset.petaM) out.push({t: "peta", id: "peta", judul: "Sebaran kejadian", jenis: jn.map(x => x[0])});
  for (const j of K.jenisAda(c)) {
    const kj = ks.filter(x => x.jenis === j), tj = tb.filter(x => x.jenis === j), nama = JENIS[j].nama, nb = kj.filter(x => x.status === "belum").length;
    out.push({t: "angka", id: "j-" + j, judul: nama, angka: n0(kj.length || tj.length), label: kj.length ? [R(`kejadian di `), J(n0(new Set(kj.map(x => x.prov)).size)), R(" provinsi"), ...(nb ? [R(", "), J(n0(nb)), R(" belum selesai")] : [])] : [R("dilaporkan")]});
    out.push(...daftar(W, `${nama}, rincian`, [...K.kelompokProv(kj).flatMap(([, xs]) => xs).map(x => baruKejadian(W, c, x)), ...tj.map(x => barisTeks(W, x))], "r-" + j));
  }
  const ph = K.perhatian(c); if (ph.length) out.push(...daftar(W, "Perlu perhatian", ph.map(x => baris(W, R(x.judul, PUTIH, true), R(x.isi ? ": " + x.isi : ""), R(x.status === "belum" ? ", belum selesai" : "", MERAH))), "perhatian"));
  const td = (i.tindak || []).filter(x => x.judul || x.isi); if (td.length) out.push(...daftar(W, "Yang akan dilakukan", td.map(x => barisTeks(W, x)), "tindak"));
  out.push(...daftar(W, "Imbauan kepada masyarakat", K.imbauan(c).map(x => barisTeks(W, x)), "imbauan"));
  out.push({t: "terima", id: "terima"});
  out.push(...daftar(W, "Hubungi kami", KONTAK.map(([l, v]) => baris(W, R(l + ": "), R(v, JINGGA, true))), "kontak"));
  return out;
}

/* ------------------------------------------------------------ gambar */
function latar(k, c) {
  k.kotak(0, 0, c.W, c.H, {f: NAVY});
  if (c.aset.logo) { k.kotak(c.W - 1.55, 0.4, 0.95, 0.95, {f: PUTIH, r: 0.475}); const lw = 0.55, lh = lw * 315 / 250; k.gambar(c.aset.logo, c.W - 1.55 + (0.95 - lw) / 2, 0.4 + (0.95 - lh) / 2, lw, lh); }
}
const judulM = (k, c, t, s = UKURAN.judul) => k.teks(0.8, 0.45, c.W - 3.0, s > 50 ? 2.6 : 1.5, t, {s, b: true, c: PUTIH});
function gambarHalaman(k, c, p) {
  const W = c.W, lebar = W / c.H > 3;
  latar(k, c);
  if (p.t === "sampul") {
    k.teks(0.8, 1.2, W - 3.0, 2.6, "Konferensi Pers Penanganan Bencana", {s: UKURAN.sampul, b: true, c: PUTIH});
    k.teks(0.8, 4.1, W - 1.6, 0.6, c.isi.instansi || "Badan Nasional Penanggulangan Bencana", {s: UKURAN.isi, b: true, c: JINGGA});
    k.kotak(0.8, 5.0, 7.6, 0.85, {f: JINGGA, r: 0.42}); k.teks(0.8, 5.0, 7.6, 0.85, tglHari(c.tanggal), {s: UKURAN.isi, b: true, c: PUTIH, a: "c", v: "m"});
    if (c.isi.penyaji) k.teks(lebar ? 9.0 : 0.8, lebar ? 5.0 : 6.1, W - 9.8, 0.85, [R(c.isi.penyaji, PUTIH, true), R(c.isi.jabatan ? ", " + c.isi.jabatan : "", TEDUH)], {s: UKURAN.isi, v: lebar ? "m" : "t"});
  } else if (p.t === "angka") {
    judulM(k, c, p.judul);
    const s = p.angka.length > 8 ? 110 : UKURAN.angka;
    if (lebar) { k.teks(0.8, 1.75, 11.5, 2.8, p.angka, {s, b: true, c: JINGGA}); k.teks(12.6, 2.6, W - 13.4, 1.8, p.label, {s: UKURAN.isi, c: PUTIH, v: "m"}); }
    else { k.teks(0.8, 1.9, W - 1.6, 2.7, p.angka, {s, b: true, c: JINGGA}); k.teks(0.8, 4.9, W - 1.6, 1.4, p.label, {s: UKURAN.isi, c: PUTIH}); }
  } else if (p.t === "daftar") {
    judulM(k, c, p.judul);
    let y = 2.2;
    for (const r of p.rows) { k.bulat(1.0, y + LH / 2, 0.1, {f: JINGGA}); k.teks(1.4, y, W - 2.2, r.baris * LH + 0.05, r.runs, {s: UKURAN.isi, c: PUTIH}); y += r.baris * LH + 0.32; }
  } else if (p.t === "peta") {
    judulM(k, c, p.judul);
    const ha = 5.0, wa = W - 1.6, hh = Math.min(ha, wa / ASPEK_PETA), ww = hh * ASPEK_PETA, x = (W - ww) / 2;
    k.kotak(x - 0.1, 1.35, ww + 0.2, hh + 0.2, {f: PUTIH, r: 0.12}); k.gambar(c.aset.petaM, x, 1.45, ww, hh);
    let lx = 0.8, ly = 6.7; for (const j of p.jenis) { const w = JENIS[j].nama.length * UKURAN.isi * 0.58 / 72 + 0.9; if (lx + w > W - 0.8) { lx = 0.8; ly += LH + 0.05; } k.bulat(lx + 0.15, ly + LH / 2, 0.14, {f: JENIS[j].w}); k.teks(lx + 0.4, ly, w - 0.4, LH + 0.05, JENIS[j].nama, {s: UKURAN.isi, c: PUTIH}); lx += w + 0.3; }
  } else if (p.t === "terima") {
    judulM(k, c, "Terima kasih", UKURAN.sampul);
    k.kotak(0.8, 2.3, 5.2, 0.05, {f: JINGGA});
    k.teks(0.8, 2.7, W - 1.6, 0.6, c.isi.penyaji || "", {s: UKURAN.isi, b: true, c: PUTIH}); k.teks(0.8, 3.3, W - 1.6, 0.6, c.isi.jabatan || "", {s: UKURAN.isi, c: TEDUH});
    k.teks(0.8, 4.2, W - 1.6, 1.4, `Konferensi Pers Penanganan Bencana, ${tglHari(c.tanggal)}`, {s: UKURAN.isi, c: TEDUH});
  }
}
const jadi = (p, n) => PS.lengkapi({id: "m" + n + "-" + p.id, judul: p.judul || {sampul: "Sampul", terima: "Terima kasih"}[p.t] || p.id, gambar: (k, c) => gambarHalaman(k, c, p)});
const deckMatador = c => halaman(c).map(jadi);

LB.deckMatador = deckMatador;
window.LaporanMatador = {halaman, deckMatador, UKURAN, ASPEK, MAKS_BARIS, ASPEK_PETA};
})();
