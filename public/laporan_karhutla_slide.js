/* laporan_karhutla_slide.js: deck "Penanganan dan Pengendalian Karhutla" (slide 1-3, daftar lampiran, A1-A11, B1-B5) dari SNAPSHOT laporan karhutla yang sudah dikunci
   (GET /api/laporan-karhutla/snapshot/:tanggal, docs/laporan-karhutla/API-SNAPSHOT.md). Bentuk meniru deck asli 29 slide BNPB 21 Okt 2026.
   Kanvas tiga keluaran (pptx/pdf/html) dipinjam dari paparan_slide.js dan gaya dari laporan_bnpb_slide.js, jadi pratinjau = PPTX = PDF.
   ATURAN: angka HANYA dari snapshot (hanya jumlah dan persen untuk judul). Bagian yang bernilai null/kosong di snapshot TIDAK dikarang: slide menulis "belum ada data"
   atau dilewati dengan catatan (daftar lampiran memuat alasannya). Pengecualian "lanjut tanpa X" dan nomor ralat tercetak di slide. Judul aksi dihitung dari angka.
   Sebelum kunci hanya pratinjau berwatermark DRAF (opsi draf). Huruf: Roboto subset tidak punya segitiga/centang, jadi arah perubahan ditulis "naik"/"turun". */
(() => {
const PS = window.PaparanSlide, LB = window.LaporanBnpbSlide, {W, H} = PS, {R, J, n0, n2, pil, kartu, labelKecil, lebarTeks} = LB.H, C = LB.C, Bi = x => R(x, C.biru, true);
const KABUR = "9AA1AB", TEKS2 = "3A3F45", TERANG = "F4F5F7";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tglP = t => { const [y, m, d] = String(t).split("-").map(Number); return `${d} ${BULAN[m - 1]} ${y}`; };
const tglK = t => { const [, m, d] = String(t).split("-").map(Number); return `${d} ${BULAN[m - 1].slice(0, 3)}`; };
const geser = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const nn = v => typeof v === "number" && Number.isFinite(v);
const ang = v => nn(v) ? n0(v) : "NA";
const hek = v => nn(v) ? n2(v) : "NA";
const sum = (a, f) => a.reduce((x, y) => x + (f(y) ?? 0), 0);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const unik = a => [...new Set(a)];
const teksDampak = d => [[d.meninggal, "meninggal"], [d.luka_berat, "luka berat"], [d.hilang, "hilang"]].filter(([n]) => n > 0).map(([n, l]) => `${n} ${l}`).join(", ") || "tidak ada korban", labelVerifikasi = d => `terverifikasi ${d.terverifikasi} dari ${d.laporan} laporan`;   // sama dengan spek
const gabung = a => a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} dan ${a.at(-1)}`;
const ketik = (t, n) => { t = String(t ?? ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const ALAT = {pompa: "Pompa", selang_1_5: "Selang 1,5\"", selang_2_5: "Selang 2,5\"", nozzle: "Nozzle", jet_shooter_lance: "Jet shooter", tangki_fleksibel: "Tangki fleksibel", mobil_tangki: "Mobil tangki", mobil_pemadam: "Mobil pemadam",
  motor_trail: "Motor trail", alat_berat: "Alat berat", drone_termal: "Drone termal", genset: "Genset", perahu: "Perahu", apd_set: "APD", scba: "SCBA", kepyok_garu: "Kepyok dan garu", pompa_punggung: "Pompa punggung", ht_radio: "HT/radio", tenda: "Tenda", lainnya: "Lainnya"};
const HAMBATAN = {air_jauh: "Sumber air jauh", akses_sulit_rawa: "Akses sulit di rawa dan gambut", roda_empat_sulit: "Kendaraan roda empat sulit masuk", air_tidak_cukup: "Air tidak cukup", asap_tebal: "Asap tebal", angin_kencang: "Angin kencang", personel_terbatas: "Personel terbatas", alat_terbatas: "Peralatan terbatas"};
const UPAYA = {pemadaman_darat: "Pemadaman darat", water_bombing: "Water bombing", patroli_terpadu: "Patroli terpadu", pembasahan_gambut: "Pembasahan gambut", sekat_kanal: "Sekat kanal", omc: "Operasi modifikasi cuaca", penegakan_hukum: "Penegakan hukum", sosialisasi: "Sosialisasi"};
const DARURAT = {siaga_darurat: "Siaga darurat", tanggap_darurat: "Tanggap darurat"};
const BAHAN = {nacl: "NaCl", dry_ice: "Dry ice"};
const ISPU = {baik: "Baik", sedang: "Sedang", tidak_sehat: "Tidak sehat", sangat_tidak_sehat: "Sangat tidak sehat", berbahaya: "Berbahaya"};
const ISPU_W = {baik: "2B7A3D", sedang: "A88A3C", tidak_sehat: C.jingga, sangat_tidak_sehat: "B8392B", berbahaya: C.merah};
const PEMILIK = {KLHK: "Kemenhut", BPBD: "BPBD", TNI: "TNI", Polri: "Polri", Swasta: "Swasta", BNPB: "BNPB", Lainnya: "Lainnya"};

/* ------------------------------------------------------------ data turunan dari snapshot (tanpa menghitung ulang angka pipeline) */
const fsNas = s => s.nasional.fs_ha;
const urutSisa = s => [...s.provinsi].sort((a, b) => (b.total?.sisa_ha ?? -1) - (a.total?.sisa_ha ?? -1));
const tiga = s => (s.tiga_hari || []).slice(-3);
/* tiga kolom hari: entri dari snapshot, sisanya NA dengan tanggal mundur dari entri tertua */
function kolomHari(s) {
  const t = tiga(s); if (!t.length) return [];
  const pad = []; for (let i = t.length; i < 3; i++) pad.push({tanggal_data: geser(t[0].tanggal_data, -(3 - i)), kosong: true});
  return [...pad, ...t];
}
const hariProv = (d, kode) => d.kosong ? null : d.provinsi?.[kode] ?? null;
const hariNas = d => d.kosong ? null : d.nasional;
const arah = (a, b) => !nn(a) || !nn(b) ? null : a === b ? "tetap" : b > a ? "naik" : "turun";
const delta = (a, b, baik = false) => {   // baik = true: naik itu kabar baik (mis. luas padam), warna dibalik
  if (!nn(a) || !nn(b)) return null; if (a === 0) return b === 0 ? {t: "tetap", c: C.abu} : {t: "baru", c: baik ? "2B7A3D" : C.jingga};
  const p = Math.round((b - a) / a * 100), bagus = "2B7A3D"; if (p === 0) return {t: "tetap", c: C.abu};
  return {t: `${p > 0 ? "naik" : "turun"} ${Math.abs(p)}%`, c: (p > 0) !== baik ? C.jingga : bagus}; };
const kodeTNTP = p => p.blok.find(b => /TNTP/.test(b.kawasan) && !/luar/i.test(b.kawasan) && b.sisa_ha > 0);
const unsurNama = {bpbd: "BPBD", tni: "TNI", polri: "Polri", manggala_agni: "M. Agni", mpa: "MPA", swasta: "Swasta", relawan: "Relawan", pemda: "Pemda", kehutanan: "Kehutanan"};
const adaKondisi = s => s.provinsi.some(p => p.kondisi?.length);
const adaAlat = s => s.provinsi.some(p => p.peralatan?.length);
const adaHamb = s => s.provinsi.some(p => p.hambatan?.pilihan?.length || p.hambatan?.teks || p.upaya?.pilihan?.length || p.upaya?.teks || (p.darurat?.jenis && p.darurat.jenis !== "tidak"));
const adaUdara = s => !!s.udara && (s.udara.armada.length || s.udara.water_bombing.daftar.length || s.udara.patroli.daftar.length);
const adaOmc = s => !!s.omc && (s.omc.daftar.length || s.omc.hasil.length);
const armadaProv = (s, k, jenis) => (s.udara?.armada || []).filter(a => a.prov === k && (!jenis || a.jenis === jenis));
const sortieProv = (daftar, k) => (daftar || []).filter(x => x.provs.includes(k));
const jamMenit = m => !nn(m) ? "NA" : m >= 60 ? `${Math.floor(m / 60)} j${m % 60 ? " " + (m % 60) + " mnt" : ""}` : `${m} mnt`;
const tren = s => s.lampiran?.B2_tren_hotspot, harSat = s => s.lampiran?.B2_tren_hotspot && s.satelit?.hari;
const riwayatTahun = s => {
  const b = s.lampiran?.B5_riwayat_tahunan; if (!Array.isArray(b) || !b.length) return null;
  const tahun = unik(b.flatMap(x => Object.keys(x.perkiraan || x.sipongi || {}))).sort();
  if (!tahun.length) return null;
  const jum = (k, y) => { const v = b.map(x => x[k]?.[y]).filter(nn); return v.length ? {v: v.reduce((a, c) => a + c, 0), n: v.length} : null; };
  return {tahun, perkiraan: tahun.map(y => jum("perkiraan", y)), sipongi: tahun.map(y => jum("sipongi", y)), nProv: b.length};
};

/* ------------------------------------------------------------ komponen */
function logoKanan(k, c) { if (c.aset?.logo) k.gambar(c.aset.logo, 12.3, 0.3, 0.46, 0.58); else k.teks(11.9, 0.4, 0.85, 0.3, "BNPB", {s: 9, b: true, c: C.biru, a: "r"}); }   // gambar logo sudah memuat tulisan BNPB
function rangka(k, c, judul, o = {}) {
  const s = c.s;
  k.kotak(0, 0, W, H, {f: C.putih});
  if (c.draf) k.teks(1.2, 2.2, 11, 3.2, "DRAF", {s: 230, b: true, c: "F6E4E6", a: "c", v: "m"});   // watermark di belakang isi
  k.teks(0.6, 0.36, 11.4, o.tj || 0.95, judul, {s: o.s || 21, b: true});
  logoKanan(k, c);
  if (o.sub) k.teks(0.6, 1.02, 11.4, 0.28, o.sub, {s: 11.5});
  if (o.garis !== false) k.garis(0.6, o.gy || 1.34, 12.75, o.gy || 1.34, {c: TEKS2, w: 0.75});
  if (o.sumber) k.teks(0.6, 6.7, 12.15, 0.3, "Sumber: " + o.sumber, {s: 7, c: C.abu});
  k.garis(0.6, 7.04, 4.3, 7.04, {c: TEKS2, w: 0.75});
  k.teks(0.6, 7.1, 9.5, 0.2, `Badan Nasional Penanggulangan Bencana  |  Copyright ${c.tahun}  |  Data ${tglK(s.tanggal_data)}, laporan ${tglK(s.tanggal_laporan)}${s.ralat ? `, Ralat-${s.ralat}` : ""}${c.draf ? ", DRAF belum dikunci" : ""}`, {s: 8});
  k.teks(12.0, 7.1, 0.75, 0.2, String(c.no), {s: 8, b: true, a: "r"});
  if (c.draf) { k.kotak(10.4, 0.06, 2.35, 0.24, {f: C.merah, r: 0.12}); k.teks(10.4, 0.06, 2.35, 0.24, "DRAF, BELUM DIKUNCI", {s: 8, b: true, c: C.putih, a: "c", v: "m"}); }
}
function kosongKartu(k, x, y, w, h, teks, sub) {   // kotak "belum ada data" yang jujur
  kartu(k, x, y, w, h, {f: TERANG}); k.teks(x + 0.2, y + h / 2 - (sub ? 0.95 : 0.4), w - 0.4, sub ? 0.85 : 0.8, teks, {s: h > 3 ? 14 : 11, b: true, c: C.abu, a: "c", v: "m"});
  if (sub) k.teks(x + 0.3, y + h / 2 - 0.02, w - 0.6, 1.4, sub, {s: h > 3 ? 9.5 : 8.5, c: C.abu, a: "c"});
}
function kepalaKartu(k, x, y, w, t, sub) { labelKecil(k, x + 0.18, y + 0.14, w - 0.36, t); if (sub) k.teks(x + 0.18, y + 0.14, w - 0.36, 0.2, sub, {s: 7.5, c: C.abu, a: "r"}); }
function batangPA(k, x, y, w, h, padam, sisa, o = {}) {   // batang tumpuk padam (navy) lalu belum padam (jingga), nilai di dalam
  const t = (padam || 0) + (sisa || 0), wp = t ? w * padam / t : 0;
  k.kotak(x, y, w, h, {f: "EEF0F3", r: Math.min(0.05, h / 2)});
  if (wp > 0.01) k.kotak(x, y, wp, h, {f: C.navy, r: Math.min(0.05, h / 2)});
  if (t - padam > 0 && w - wp > 0.01) k.kotak(x + wp, y, w - wp, h, {f: C.jingga, r: Math.min(0.05, h / 2)});
  if (o.lab && wp > 0.7) k.teks(x + 0.06, y, wp - 0.1, h, hek(padam), {s: o.s || 8, b: true, c: C.putih, v: "m"});
  if (o.lab && sisa > 0 && w - wp > 0.7) k.teks(x + wp + 0.06, y, w - wp - 0.1, h, hek(sisa), {s: o.s || 8, b: true, c: C.putih, v: "m"});
}
function pilTeks(k, x, y, t, f, c, o = {}) { return pil(k, x, y, t, {f, c, b: true, s: o.s || 7.5, h: o.h || 0.22}); }
function tabelHeader(k, x, y, kol, o = {}) {   // kol: [{j, w, a}], mengembalikan koordinat x tiap kolom
  const xs = []; let xx = x; for (const c of kol) { xs.push(xx); xx += c.w; }
  kol.forEach((c, i) => k.teks(xs[i], y, c.w - 0.08, o.hh || 0.4, c.j, {s: o.s || 8.5, b: true, a: c.a || "l", v: "m"}));
  k.garis(x, y + (o.hh || 0.4), x + kol.reduce((a, c) => a + c.w, 0), y + (o.hh || 0.4), {c: C.navy, w: 1.25});
  return xs;
}

/* ------------------------------------------------------------ registri slide */
const REGISTRI = [];
const slide = (id, judul, bagian, siap, gambar) => REGISTRI.push({id, judul, bagian, siap, gambar});

/* catatan slide 1: pengecualian "lanjut tanpa X", provinsi tanpa data, ralat. Tiap butir {r: runs, n: panjang teks}. Tata letak dihitung dari jumlah baris perkiraan
   (170 huruf per baris di lebar 11,9 inci), supaya catatan TIDAK pernah menimpa footer (y 7,04): muat di bawah tabel, atau pindah ke slide lanjutan "utama2". */
const LH = 0.2, HURUF = 170, FOOT = 6.95, MIN_RH = 0.27;
const baris = n => Math.max(1, Math.ceil(n / HURUF));
const butir = runs => ({r: runs, n: runs.reduce((a, x) => a + x.t.length, 0)});
function catatanUtama(s) {
  const cat = [];
  for (const p of s.pengecualian) cat.push(butir([R(`${p.label}: `, C.biru, true), R(`dikunci tanpa kiriman terbaru, data terakhir ${p.data_terakhir ? tglP(p.data_terakhir) : "tidak ada"}. Alasan: ${p.alasan}.`)]));
  const tanpa = s.provinsi.filter(p => !p.total).map(p => p.nama); if (tanpa.length) cat.push(butir([R(`${gabung(tanpa)}: `, C.biru, true), R("belum ada data penanganan, ditulis NA.")]));
  if (s.dampak) cat.push(butir([R("Korban jiwa: ", C.merah, true), R(`${teksDampak(s.dampak)} pada ${tglP(s.dampak.tanggal)} (${labelVerifikasi(s.dampak)}).`)]));   // angka saja, tanpa nama
  if (s.ralat) cat.push(butir([R(`Ralat-${s.ralat}: `, C.merah, true), R(s.alasan_ralat || "koreksi sesudah kunci.")]));
  return cat;
}
const FN = butir([R("*Hotspot berdasarkan GIS (Geographic Information System). NA: belum ada data laporan lapangan. Tanggal kolom = tanggal data (pantauan 24 jam), laporan dikunci sehari sesudahnya.", C.teks)]);
const tinggiCat = a => 0.1 + a.reduce((x, b) => x + baris(b.n) * LH, 0);
function tataUtama(s) {   // {rh, cat (butir di slide 1), pecah: catatan pindah ke slide lanjutan}
  const N = s.prioritas.length, cat = catatanUtama(s), rhDari = h => Math.min(0.42, (FOOT - h - 2.93) / (N + 1));
  const rh = rhDari(tinggiCat([...cat, FN]));
  if (rh >= MIN_RH || !cat.length) return {rh: Math.max(rh, 0.2), cat, pecah: false};
  const ptr = butir([R(`${cat.length} catatan pengecualian dan data kosong: `, C.biru, true), R("lihat slide berikutnya.")]);
  return {rh: Math.max(rhDari(tinggiCat([ptr, FN])), 0.2), cat: [ptr], pecah: true};
}

/* ---- slide 1: tabel provinsi tiga hari ---- */
slide("utama", "Penanganan dan pengendalian per tanggal laporan", "utama", () => null, (k, c) => {
  const s = c.s, f = fsNas(s), N = s.prioritas.length, ps = urutSisa(s), kol = kolomHari(s), tata = tataUtama(s);
  rangka(k, c, [R(`Penanganan dan Pengendalian Karhutla per Tanggal ${tglP(s.tanggal_laporan)}`)], {s: 26, tj: 0.62, garis: false});
  k.teks(0.6, 1.03, 8.8, 0.3, [J(`${ang(f.fs)} titik api`), R(" dari "), J(`${N} provinsi`), R("; "), J(`±${hek(f.padam_ha)} ha`), R(` (${pct(f.padam_ha, f.target_ha)} persen) dari `), J(`±${hek(f.target_ha)} ha`), R(" telah padam, belum padam "), J(`±${hek(f.sisa_ha)} ha`)], {s: 11.5});
  k.kotak(9.45, 0.98, 3.3, 0.32, {f: C.navy, r: 0.16}); k.teks(9.45, 0.98, 3.3, 0.32, [R("CUT OFF DATA   ", "9FB0C2", true), R(`${tglK(s.tanggal_laporan)} ${c.tahun}, 07.00 WIB`, C.putih, true)], {s: 8, a: "c", v: "m"});
  k.garis(0.6, 1.38, 12.75, 1.38, {c: TEKS2, w: 0.75});
  const gx = [3.3, 6.5, 9.7], gw = 3.05, cw = gw / 3;
  [["HOTSPOT*", " (titik)", C.navy], ["LUAS TERBAKAR / TARGET", " (ha)", C.slate], ["BELUM PADAM", " (ha)", C.jingga]].forEach(([a, b, w], i) => {
    k.kotak(gx[i], 1.5, gw, 0.4, {f: w, r: 0.08}); k.teks(gx[i], 1.5, gw, 0.4, [R(a, C.putih, true), R(b, "E4E9EF")], {s: 8.5, a: "c", v: "m"});
    kol.forEach((d, j) => k.teks(gx[i] + j * cw, 1.98, cw - 0.06, 0.24, d.kosong ? `${tglK(d.tanggal_data)}` : tglK(d.tanggal_data), {s: 8.5, a: "r", b: j === 2, c: j === 2 ? C.teks : C.abu}));
  });
  k.teks(0.6, 1.98, 2.4, 0.24, "PROVINSI", {s: 8, b: true, c: C.abu});
  k.garis(0.6, 2.26, 12.75, 2.26, {c: C.navy, w: 1});
  const rh = tata.rh; let y = 2.3;
  const sel = (d, kode, f2) => { const v = d && hariProv(d, kode); return v ? v[f2] : null; };
  ps.forEach((p, i) => {
    if (i % 2 === 0) k.kotak(0.6, y, 12.15, rh, {f: "F6F7F9"});
    k.kotak(gx[2], y, gw, rh, {f: "FDF1E7"});
    k.teks(0.7, y, 2.0, rh, p.nama, {s: 9.5, b: i === 0, v: "m"});
    if (p.lanjut_tanpa) pilTeks(k, 0.7 + Math.min(1.9, lebarTeks(p.nama, 9.5, i === 0)) + 0.08, y + (rh - 0.2) / 2, `data ${p.data_terakhir ? tglK(p.data_terakhir) : "tidak ada"}`, "FBEBDD", C.jingga, {s: 6.5, h: 0.2});
    kol.forEach((d, j) => {
      const x0 = (g, jj) => gx[g] + jj * cw, hs = sel(d, p.kode, "hotspot"), tg = sel(d, p.kode, "target_ha"), sb = sel(d, p.kode, "sisa_ha"), akhir = j === 2;
      k.teks(x0(0, j), y, cw - 0.06, rh, ang(hs), {s: 9, a: "r", v: "m", b: akhir, c: nn(hs) ? C.teks : KABUR});
      k.teks(x0(1, j), y, cw - 0.06, rh, hek(tg), {s: 9, a: "r", v: "m", b: akhir, c: nn(tg) ? C.teks : KABUR});
      k.teks(x0(2, j), y, cw - 0.06, rh, hek(sb), {s: 9, a: "r", v: "m", b: akhir, c: nn(sb) ? C.jingga : KABUR});
    });
    y += rh;
  });
  y += 0.07;
  k.kotak(0.6, y, 12.15, rh + 0.04, {f: "DDE3EA", r: 0.05}); k.teks(0.7, y, 2.4, rh + 0.04, `Jumlah ${N} provinsi`, {s: 9.5, b: true, v: "m"});
  kol.forEach((d, j) => { const n = hariNas(d), akhir = j === 2; [[0, n?.hotspot, ang, C.teks], [1, n?.target_ha, hek, C.teks], [2, n?.sisa_ha, hek, C.jingga]].forEach(([g, v, fm, w]) => k.teks(gx[g] + j * cw, y, cw - 0.06, rh + 0.04, fm(v), {s: 9.5, a: "r", v: "m", b: true, c: nn(v) ? w : KABUR})); });
  y += rh + 0.14;
  k.teks(0.7, y, 1.8, 0.3, "Fire spot", {s: 9.5, b: true, v: "m"});
  kol.forEach((d, j) => { const n = hariNas(d), t = n ? `${ang(n.fs)} FS` : "NA", akhir = j === 2; const w = cw - 0.14; k.kotak(gx[0] + j * cw + 0.04, y + 0.02, w, 0.26, {f: akhir ? C.navy : "E6E8EC", r: 0.13}); k.teks(gx[0] + j * cw + 0.04, y + 0.02, w, 0.26, t, {s: 8.5, b: true, a: "c", v: "m", c: akhir ? C.putih : TEKS2}); });
  y += 0.4;
  const cat = [...tata.cat, FN], tinggi = Math.min(FOOT - y, tinggiCat(cat));
  k.kotak(0.6, y, 0.05, tinggi, {f: C.biru}); let yy = y + 0.04;
  cat.forEach((b, i) => { const h = baris(b.n) * LH; k.teks(0.78, yy, 11.9, h, b.r, {s: 8.5, i: i === cat.length - 1}); yy += h; });
});

/* ---- slide 1b: catatan lanjutan, hanya bila catatan pengecualian tidak muat di slide 1 (tidak masuk daftar dilewati) ---- */
slide("utama2", "Catatan pengecualian dan data kosong", "utama", s => tataUtama(s).pecah ? null : "muat di slide 1", (k, c) => {
  const s = c.s, cat = catatanUtama(s), jml = cat.reduce((x, b) => x + baris(b.n / 0.8), 0), lh = Math.min(0.34, 4.9 / (jml + cat.length * 0.5)), sz = lh > 0.3 ? 11 : 9.5;
  rangka(k, c, [R("Catatan pengecualian dan data kosong: "), J(`${cat.length} catatan`)], {s: 22, tj: 0.62});
  let y = 1.55;
  cat.forEach(b => { const h = baris(b.n / 0.8) * lh; k.kotak(0.6, y + 0.02, 0.05, h, {f: C.biru}); k.teks(0.8, y, 11.9, h + 0.04, b.r, {s: sz}); y += h + lh * 0.5; });
});
REGISTRI[REGISTRI.length - 1].diam = true;

/* ---- slide 2: ringkasan hotspot, OMC, armada, penanganan ---- */
slide("ringkasan", "Hotspot, OMC, armada udara, penanganan", "utama", () => null, (k, c) => {
  const s = c.s, n = s.nasional, hot = n.hotspot, ps = [...s.provinsi].sort((a, b) => (b.hotspot?.total ?? -1) - (a.hotspot?.total ?? -1)), mx = Math.max(1, ...ps.map(p => p.hotspot?.total || 0)), N = ps.length;
  const maxH = [...ps].filter(p => nn(p.hotspot?.total)).sort((a, b) => b.hotspot.total - a.hotspot.total)[0];
  const judul = [];
  if (hot && maxH) judul.push(R("Hotspot terbanyak di "), Bi(maxH.nama), R(` (${n0(maxH.hotspot.total)} dari `), J(n0(hot.total)), R(" titik)"));
  else judul.push(R("Hotspot satelit "), J("belum ada data"));
  judul.push(R("; "), J(`${n0(n.personel.total)} personel`), R(" di darat"));
  if (adaUdara(s)) judul.push(R(", "), J(`${n0(s.udara.armada.length)} armada udara`));
  if (adaOmc(s)) judul.push(R(" dan "), J(`${n0(s.omc.sortie)} sortie OMC`));
  rangka(k, c, judul);
  /* kiri: hotspot per provinsi */
  kartu(k, 0.6, 1.5, 7.45, 3.95); kepalaKartu(k, 0.6, 1.5, 7.45, "Hotspot per provinsi (satelit, GIS), FS, dan belum padam", `data ${tglK(s.tanggal_data)}`);
  const rh = Math.min(0.55, 3.3 / Math.max(1, N)), kl = kolomHari(s);
  ps.forEach((p, i) => {
    const y = 1.95 + i * rh, v = p.hotspot?.total, sbl = kl.length > 1 ? hariProv(kl[kl.length - 2], p.kode)?.hotspot : null, d = delta(sbl, v);
    k.teks(0.8, y, 2.0, rh, p.nama, {s: 10, b: true, v: "m"});
    if (nn(v)) { const bw = Math.max(0.04, 1.75 * v / mx); k.kotak(2.75, y + rh / 2 - 0.1, bw, 0.2, {f: C.jingga}); k.teks(2.75 + bw + 0.06, y, 0.7, rh, n0(v), {s: 9.5, b: true, v: "m"}); } else k.teks(2.75, y, 1.5, rh, "NA", {s: 9.5, c: KABUR, v: "m"});
    if (d) pilTeks(k, 5.2, y + rh / 2 - 0.11, d.t, TERANG, d.c, {s: 7});
    k.teks(6.05, y, 0.8, rh, p.total ? `${n0(p.total.fs)} FS` : "NA", {s: 9, a: "r", v: "m", c: p.total ? TEKS2 : KABUR});
    k.teks(6.85, y, 1.05, rh, p.total ? `±${hek(p.total.sisa_ha)} ha` : "NA", {s: 9, a: "r", v: "m", b: true, c: p.total ? C.jingga : KABUR});
  });
  if (!hot) k.teks(0.8, 1.95, 6.9, 0.3, "Hotspot satelit belum ada data pada snapshot ini.", {s: 10, c: C.abu});
  /* kanan atas: OMC */
  kartu(k, 8.2, 1.5, 4.55, 2.15); kepalaKartu(k, 8.2, 1.5, 4.55, "Modifikasi cuaca", s.omc ? `data ${tglK(s.omc.data_terakhir || s.tanggal_data)}` : "");
  if (!adaOmc(s)) kosongKartu(k, 8.3, 1.9, 4.35, 1.65, s.omc?.alasan_kosong ? "Tidak ada sortie OMC" : "Belum ada data OMC", s.omc?.alasan_kosong || "Snapshot ini belum memuat kiriman OMC.");
  else {
    const o = s.omc; let y = 1.9;
    k.teks(8.4, y, 4.15, 0.26, [R(`${n0(o.sortie)} sortie, `, C.teks, true), R(`${n0(o.kg_total)} kg bahan semai: `), R(Object.entries(o.per_bahan).filter(([, v]) => v.sortie).map(([b, v]) => `${BAHAN[b]} ${n0(v.kg)} kg`).join(", "))], {s: 9.5}); y += 0.32;
    const hs = o.hasil.slice(0, 4);
    if (!hs.length) k.teks(8.4, y, 4.15, 0.3, "Hasil pemantauan hujan belum diisi.", {s: 9, c: C.abu});
    hs.forEach((h, i) => { const ya = h.hujan === "ya"; k.teks(8.4, y + i * 0.3, 2.3, 0.26, ketik(h.sasaran, 30), {s: 8.5, b: true, v: "m"}); pilTeks(k, 10.75, y + i * 0.3 + 0.02, ya ? "HUJAN SETELAH OMC" : h.hujan === "tidak" ? "BELUM HUJAN" : "BELUM DIKETAHUI", ya ? "DCEBF7" : TERANG, ya ? C.biru : C.abu, {s: 6.5, h: 0.22}); });
    if (o.hasil.length > 4) k.teks(8.4, y + 1.2, 4.15, 0.2, `dan ${o.hasil.length - 4} sasaran lain di lampiran A9`, {s: 7.5, c: C.abu});
    k.teks(8.4, 3.38, 4.15, 0.22, ketik(o.kalimat_hujan.charAt(0).toUpperCase() + o.kalimat_hujan.slice(1), 88), {s: 7, i: true, c: C.abu});
  }
  /* kanan bawah: armada udara */
  kartu(k, 8.2, 3.8, 4.55, 1.65); kepalaKartu(k, 8.2, 3.8, 4.55, "Armada udara");
  if (!adaUdara(s)) kosongKartu(k, 8.3, 4.15, 4.35, 1.2, s.udara?.alasan_kosong ? "Tidak ada armada udara" : "Belum ada data armada udara", s.udara?.alasan_kosong || "Snapshot ini belum memuat kiriman operasi udara.");
  else {
    const a = s.udara.armada, pes = a.filter(x => x.jenis === "pesawat").length, hel = a.filter(x => x.jenis === "heli").length;
    k.teks(8.4, 4.1, 1.4, 0.4, `${n0(a.length)} unit`, {s: 17, b: true, v: "m"}); pilTeks(k, 9.85, 4.18, `${n0(pes)} patroli/OMC`, C.navy, C.putih, {s: 7.5}); pilTeks(k, 11.2, 4.18, `${n0(hel)} heli WB`, C.jingga, C.putih, {s: 7.5});
    const pm = unik(a.map(x => x.pemilik)).map(p => [p, a.filter(x => x.pemilik === p).length]).sort((x, y) => y[1] - x[1]); let xx = 8.4;
    pm.slice(0, 5).forEach(([p, nv]) => { const w = pilTeks(k, xx, 4.62, `${PEMILIK[p] || p} ${nv}`, TERANG, TEKS2, {s: 7.5}); xx += w + 0.06; });
    const per = Object.entries(s.udara.armada_per_provinsi).slice(0, 6); per.forEach(([kd, v], i) => k.teks(8.4 + (i % 2) * 2.1, 4.95 + Math.floor(i / 2) * 0.17, 2.1, 0.17, `${ps.find(p => p.kode === kd)?.nama || kd}: ${n0(v.total)} unit`, {s: 7}));
  }
  /* bawah: penanganan */
  kartu(k, 0.6, 5.6, 12.15, 1.02); labelKecil(k, 0.78, 5.7, 3, "Penanganan");
  const pe = n.personel; k.teks(0.78, 5.93, 2.4, 0.5, `${n0(pe.total)}`, {s: 24, b: true, c: C.jingga, v: "m"}); k.teks(0.78, 6.4, 2.2, 0.2, "personel darat", {s: 8, c: C.abu});
  k.teks(3.1, 5.93, 1.3, 0.5, adaUdara(s) ? n0(s.udara.armada.filter(x => x.jenis === "heli").length) : "NA", {s: 24, b: true, v: "m"}); k.teks(3.1, 6.4, 1.6, 0.2, "heli water bombing", {s: 8, c: C.abu});
  k.teks(4.9, 5.93, 1.3, 0.5, adaUdara(s) ? n0(s.udara.armada.filter(x => x.jenis === "pesawat").length) : "NA", {s: 24, b: true, v: "m"}); k.teks(4.9, 6.4, 1.6, 0.2, "pesawat patroli/OMC", {s: 8, c: C.abu});
  const un = Object.entries(pe.unsur).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!un.length) k.teks(6.7, 5.95, 5.9, 0.55, pe.tanpa_rincian ? `Rincian per unsur (TNI, Polri, BPBD, dan lain-lain) belum ada data; ${n0(pe.tanpa_rincian)} personel dilaporkan tanpa rincian unsur.` : "Rincian per unsur belum ada data.", {s: 9, c: C.abu, v: "m"});
  else un.slice(0, 9).forEach(([u, v], i) => { const xx = 6.7 + (i % 3) * 2.0, yy = 5.78 + Math.floor(i / 3) * 0.26; k.teks(xx, yy, 0.9, 0.24, unsurNama[u], {s: 8.5, b: true, v: "m"}); k.teks(xx + 0.85, yy, 0.7, 0.24, n0(v), {s: 8.5, v: "m", c: C.jingga, b: true}); k.teks(xx + 1.5, yy, 0.45, 0.24, `${pct(v, pe.total)}%`, {s: 7.5, c: C.abu, v: "m"}); });
});

/* ---- slide 3: kompleks api (data satelit) ---- */
const kompleks = s => { const b = s.lampiran?.B4_konsesi_terindikasi; return Array.isArray(b) && b.some(x => nn(x.kompleks)) ? b : null; };
slide("kompleks", "Kompleks api per provinsi", "utama", () => null, (k, c) => {
  const s = c.s, kp = kompleks(s), nm = kd => s.provinsi.find(p => p.kode === kd)?.nama || kd;
  if (!kp) {
    rangka(k, c, [R("Kompleks api dan titik panas di areal konsesi serta lahan gambut: "), J("belum ada data")]);
    kosongKartu(k, 0.6, 1.6, 12.15, 4.9, "Belum ada data kompleks api, konsesi, dan gambut", "Snapshot ini tidak memuat angka satelit kompleks api (public/data/laporan.json tidak terbaca saat kunci). Tidak ada angka yang diisi dari sumber lain.");
    return;
  }
  const urut = [...kp].sort((a, b) => (b.luas_kompleks || 0) - (a.luas_kompleks || 0)), top = urut[0], tot = sum(kp, x => x.kompleks), luas = sum(kp, x => x.luas_kompleks), mx = Math.max(1, ...kp.map(x => x.luas_kompleks || 0));
  rangka(k, c, [R("Kompleks api terluas di "), Bi(nm(top.kode)), R(`: ${n0(top.kompleks)} kompleks seluas `), J(`±${n0(top.luas_kompleks)} ha`), R(`, dari ${n0(tot)} kompleks (`), J(`±${n0(luas)} ha`), R(`) di ${kp.length} provinsi`)], {s: 20});
  k.teks(0.6, 1.5, 6, 0.28, "Kompleks api per provinsi (kluster titik panas satelit)", {s: 12}); k.garis(0.6, 1.82, 8.9, 1.82, {c: C.navy, w: 0.75});
  urut.forEach((x, i) => { const y = 1.95 + i * 0.62, bw = Math.max(0.05, 4.3 * (x.luas_kompleks || 0) / mx);
    k.teks(0.6, y, 2.0, 0.5, nm(x.kode), {s: 10.5, b: i === 0, v: "m"}); k.kotak(2.65, y + 0.1, bw, 0.3, {f: i === 0 ? C.jingga : C.navy}); k.teks(2.65 + bw + 0.08, y, 1.7, 0.5, `±${n0(x.luas_kompleks)} ha`, {s: 10, b: true, v: "m", c: i === 0 ? C.jingga : C.teks});
    pilTeks(k, 8.0, y + 0.14, `${n0(x.kompleks)} kompleks`, TERANG, TEKS2, {s: 8, h: 0.24}); k.garis(0.6, y + 0.58, 9.3, y + 0.58, {c: "ECEEF1", w: 0.5}); });
  kosongKartu(k, 9.75, 1.5, 3.0, 4.4, "Konsesi dan gambut: belum ada data", "Persen titik panas di areal konsesi dan lahan gambut per provinsi belum ada pada snapshot ini (lampiran A6 dan B2 dilewati). Nama perusahaan hanya di laporan berotorisasi.");
  k.teks(0.6, 6.15, 12.15, 0.4, "Kompleks api = titik panas satelit yang berdekatan dikelompokkan; luas adalah hitungan dari deteksi satelit, bukan hasil ukur lapangan. Titik atau kompleks di suatu areal bukan bukti siapa yang membakar.", {s: 8.5, i: true, c: C.abu});
});

/* ---- daftar lampiran (isi diisi saat deck dirakit) ---- */
const DAFTAR_A = [["a1", "A1", "Ringkasan per wilayah dan angka kunci"], ["a2", "A2", "Riwayat luas terbakar tahunan"], ["a3", "A3", "Cut-off laporan harian tiga hari per provinsi"], ["a4", "A4", "Rincian per provinsi: target, padam, belum padam"], ["a5", "A5", "Tren hotspot 12 hari di provinsi prioritas"],
  ["a6", "A6", "Titik panas di areal konsesi dan lahan gambut"], ["a7", "A7", "Kabut asap: kualitas udara, jarak pandang, sekolah"], ["a8", "A8", "Operasi darat: personel dan peralatan"], ["a9", "A9", "Operasi udara dan OMC per provinsi"], ["a10", "A10", "Hambatan, upaya, dan status kedaruratan"], ["a11", "A11", "Karhutla di luar provinsi prioritas"]];
const DAFTAR_B = [["b1", "B1", "Hotspot satelit per provinsi"], ["b2", "B2", "Titik panas di konsesi dan gambut per provinsi"], ["b3", "B3", "Konsesi dengan titik panas terbanyak"], ["b4", "B4", "Grup usaha dan daftar perusahaan"], ["b5", "B5", "Metode, sumber, dan catatan data"]];
slide("lampiran", "Daftar lampiran", "lampiran", () => null, (k, c) => {
  k.kotak(0, 0, W, H, {f: C.navy}); if (c.draf) k.teks(1.2, 2.2, 11, 3.2, "DRAF", {s: 230, b: true, c: "1B2D40", a: "c", v: "m"});
  if (c.aset?.logo) { k.kotak(12.0, 0.4, 0.8, 0.8, {f: C.putih, r: 0.4}); k.gambar(c.aset.logo, 12.16, 0.5, 0.48, 0.6); } else k.teks(11.6, 0.5, 1.2, 0.3, "BNPB", {s: 11, b: true, c: C.putih, a: "r"});
  k.teks(0.6, 1.5, 8, 1.0, "Lampiran", {s: 48, b: true, c: C.putih}); k.teks(0.6, 2.75, 10, 0.4, "Data rinci pendukung paparan, dari snapshot yang dikunci", {s: 17, c: "F0B070"});
  k.garis(0.6, 3.45, 12.75, 3.45, {c: "5B6B7C", w: 0.75});
  const kolom = (x, judul, daftar) => { k.teks(x, 3.6, 5.8, 0.3, judul, {s: 12, b: true, c: "F0B070"});
    daftar.forEach(([id, kode, t], i) => { const no = c.ex.peta[id], lewat = c.ex.lewat[id], y = 4.0 + i * 0.255;
      k.teks(x, y, 0.55, 0.25, kode, {s: 10, b: true, c: "F0B070", v: "m"});
      k.teks(x + 0.55, y, 4.2, 0.25, t, {s: 10, c: lewat ? "7C8B9B" : C.putih, v: "m"});
      k.teks(x + 4.7, y, 1.3, 0.25, no ? String(no) : "dilewati", {s: no ? 10 : 8.5, c: "9AA8B6", v: "m", i: !no}); }); };
  kolom(0.6, "A, Rincian situasi dan operasi", DAFTAR_A); kolom(6.9, "B, Satelit, konsesi, dan metode", DAFTAR_B);
  const lw = Object.entries(c.ex.lewat); if (lw.length) {
    k.teks(6.9, 5.45, 5.9, 0.25, "Lampiran dilewati karena belum ada data di snapshot:", {s: 9, b: true, c: "F0B070"});
    lw.slice(0, 7).forEach(([id, a], i) => k.teks(6.9, 5.72 + i * 0.2, 5.9, 0.2, `${id.toUpperCase()}: ${ketik(a, 92)}`, {s: 7.5, c: "9AA8B6"})); }
  k.teks(0.6, 7.1, 9.5, 0.2, `Badan Nasional Penanggulangan Bencana  |  Copyright ${c.tahun}  |  Data ${tglK(c.s.tanggal_data)}, laporan ${tglK(c.s.tanggal_laporan)}${c.s.ralat ? `, Ralat-${c.s.ralat}` : ""}${c.draf ? ", DRAF belum dikunci" : ""}`, {s: 8, c: C.putih}); k.teks(12.0, 7.1, 0.75, 0.2, String(c.no), {s: 8, b: true, a: "r", c: C.putih});
});

/* ---- A1: ringkasan wilayah ---- */
slide("a1", "A1 Ringkasan per wilayah", "lampiran", s => s.wilayah?.length ? null : "tidak ada provinsi yang terisi", (k, c) => {
  const s = c.s, f = fsNas(s), N = s.prioritas.length, ps = urutSisa(s), top = ps[0], tn = top?.total ? kodeTNTP(top) : null, kl = kolomHari(s), sbl = kl.length > 1 ? hariNas(kl[kl.length - 2]) : null;
  rangka(k, c, [R("A1. Terdapat "), J(`${ang(f.fs)} titik api`), R(" di "), J(`${N} provinsi`), R(" prioritas, "), J(`±${hek(f.padam_ha)} ha`), R(` (${pct(f.padam_ha, f.target_ha)} persen) dari `), J(`±${hek(f.target_ha)} ha`), R(" lahan terbakar di titik api tersebut telah berhasil dipadamkan")], {s: 19});
  k.teks(0.6, 1.03, 12.1, 0.28, [R("Belum padam "), J(`±${hek(f.sisa_ha)} ha`), top?.total?.sisa_ha > 0 ? R("; terbesar di ") : R(""), top?.total?.sisa_ha > 0 ? Bi(top.nama) : R(""), tn ? R(" termasuk ") : R(""), tn ? Bi(tn.kawasan) : R("")], {s: 11.5});
  const hot = s.nasional.hotspot, kar = [["hotspot satelit", hot ? n0(hot.total) : "NA", sbl ? delta(sbl.hotspot, hot?.total) : null, C.navy], ["titik api nyata (FS)", n0(f.fs), sbl ? delta(sbl.fs, f.fs) : null, C.navy], ["ha target penanganan", `±${hek(f.target_ha)}`, sbl ? delta(sbl.target_ha, f.target_ha) : null, C.jingga],
    [`ha sudah padam (${pct(f.padam_ha, f.target_ha)}%)`, `±${hek(f.padam_ha)}`, sbl ? delta(sbl.padam_ha, f.padam_ha, true) : null, C.navy], [`ha belum padam (${pct(f.sisa_ha, f.target_ha)}%)`, `±${hek(f.sisa_ha)}`, sbl ? delta(sbl.sisa_ha, f.sisa_ha) : null, C.merah]];
  kar.forEach(([l, v, d, w], i) => { const x = 0.6 + i * 2.45; kartu(k, x, 1.5, 2.3, 1.25); k.teks(x + 0.15, 1.58, 2.0, 0.5, v, {s: 19, b: true, c: w, v: "m"}); k.teks(x + 0.15, 2.1, 2.0, 0.22, l, {s: 8.5, b: true}); if (d) pilTeks(k, x + 0.15, 2.4, `${d.t} dari ${tglK(kl[kl.length - 2].tanggal_data)}`, TERANG, d.c, {s: 7, h: 0.22}); });
  if (!sbl) k.teks(0.6, 2.77, 12.1, 0.18, "Perbandingan dengan hari sebelumnya belum ada: ini laporan pertama pada sistem.", {s: 7.5, i: true, c: C.abu});
  s.wilayah.forEach((w, wi) => {
    const x = 0.6 + wi * 6.15, wd = 6.0, y0 = 2.95, provs = urutSisa(s).filter(p => w.provinsi.includes(p.kode));
    kartu(k, x, y0, wd, 3.65); k.kotak(x, y0 + 0.15, 0.06, 0.5, {f: C.jingga}); k.teks(x + 0.2, y0 + 0.12, 2.3, 0.32, w.wilayah, {s: 15, b: true}); k.teks(x + 0.2, y0 + 0.44, 2.3, 0.22, gabung(provs.map(p => p.nama.replace("Kalimantan", "Kal.").replace("Sumatera", "Sum."))), {s: 7.5, c: C.abu});
    let px = x + wd - 0.2; [[`±${hek(w.padam_ha)} ha padam`, C.teks], [`±${hek(w.target_ha)} ha target`, C.teks], [`${n0(w.fs)} FS`, C.jingga]].forEach(([t, wr]) => { const lw = lebarTeks(t, 7.5, true) + 0.22; px -= lw; pilTeks(k, px, y0 + 0.2, t, TERANG, wr, {s: 7.5, h: 0.26}); px -= 0.08; });
    batangPA(k, x + 0.2, y0 + 0.8, wd - 0.4, 0.3, w.padam_ha, w.sisa_ha, {lab: true});
    k.teks(x + 0.2, y0 + 1.14, 2.8, 0.2, `Padam ±${hek(w.padam_ha)} ha (${n0(w.fs_padam)} FS)`, {s: 8, b: true}); k.teks(x + 2.8, y0 + 1.14, wd - 3.0, 0.2, `Belum padam ±${hek(w.sisa_ha)} ha (${n0(w.fs_sisa)} FS)`, {s: 8, b: true, c: C.jingga, a: "r"});
    provs.forEach((p, i) => { const y = y0 + 1.5 + i * 0.68, t = p.total;
      k.teks(x + 0.2, y, 1.9, 0.26, p.nama, {s: 10, b: true, v: "m"});
      if (p.darurat?.jenis && p.darurat.jenis !== "tidak") pilTeks(k, x + 2.1, y + 0.44, `${DARURAT[p.darurat.jenis]}${p.darurat.sd ? " s.d. " + tglK(p.darurat.sd) : ""}`, "FBE3E6", C.merah, {s: 6.5, h: 0.19});
      if (nn(p.hotspot?.total)) pilTeks(k, x + 0.2, y + 0.3, `${n0(p.hotspot.total)} hotspot`, TERANG, TEKS2, {s: 7, h: 0.2});
      if (t) { pilTeks(k, x + 1.28, y + 0.3, `${n0(t.fs)} FS`, "FBEBDD", C.jingga, {s: 7, h: 0.2}); batangPA(k, x + 2.1, y + 0.1, 2.9, 0.3, t.padam_ha, t.sisa_ha, {lab: true, s: 7.5}); k.teks(x + wd - 0.9, y, 0.7, 0.5, `${pct(t.padam_ha, t.target_ha)}%`, {s: 13, b: true, a: "r", v: "m", c: pct(t.padam_ha, t.target_ha) >= 70 ? C.navy : C.jingga}); }
      else k.teks(x + 2.1, y, 3.0, 0.5, "belum ada data penanganan", {s: 9, c: C.abu, v: "m"}); });
  });
});

/* ---- A2: riwayat tahunan ---- */
slide("a2", "A2 Riwayat luas terbakar", "lampiran", s => riwayatTahun(s) ? null : "riwayat luas terbakar tahunan tidak ada (aset satelit kosong)", (k, c) => {
  const s = c.s, r = riwayatTahun(s), akhir = r.tahun.length - 1, p = r.perkiraan, nmax = Math.max(1, ...p.map(x => x?.v || 0), ...r.sipongi.map(x => x?.v || 0));
  const v26 = p[akhir], urut = p.map((x, i) => [x?.v ?? -1, i]).sort((a, b) => b[0] - a[0]), rank = urut.findIndex(x => x[1] === akhir) + 1;
  rangka(k, c, v26 ? [R(`A2. Perkiraan luas terbakar ${r.tahun[akhir]} di provinsi prioritas sudah `), J(`±${n0(v26.v)} ha`), R(` hingga ${tglP(s.tanggal_data)}, tertinggi ke-`), J(String(rank)), R(` sejak ${r.tahun[0]}`)] : [R(`A2. Riwayat luas terbakar ${r.tahun[0]} sampai ${r.tahun[akhir]}: perkiraan tahun berjalan `), J("belum ada data")], {s: 20});
  k.teks(1.9, 1.5, 4.9, 0.3, "HITUNGAN SATELIT (HA)", {s: 9, b: true, c: C.abu}); k.teks(7.2, 1.5, 4.2, 0.3, "ANGKA RESMI SIPONGI (HA)", {s: 9, b: true, c: C.abu});
  const rh = Math.min(0.46, 4.1 / r.tahun.length);
  r.tahun.forEach((y, i) => { const yy = 1.9 + i * rh, ini = i === akhir;
    if (ini) k.kotak(0.6, yy, 12.15, rh, {f: "FDF1E7"});
    k.teks(0.7, yy, 1.0, rh, y, {s: 11, b: true, v: "m"});
    [[p[i], 1.9, 4.2, ini ? "EBA56F" : C.navy], [r.sipongi[i], 7.2, 3.9, ini ? "EBA56F" : C.slate]].forEach(([d, x, w, wr]) => { if (!d) { k.teks(x, yy, 2, rh, "belum ada data", {s: 8.5, i: true, c: KABUR, v: "m"}); return; } const bw = Math.max(0.03, w * d.v / nmax); k.kotak(x, yy + rh * 0.2, bw, rh * 0.6, {f: wr}); k.teks(x + bw + 0.08, yy, 1.8, rh, `${n0(d.v)} ha`, {s: 9, b: true, v: "m", c: ini ? C.jingga : C.teks}); });
  });
  k.kotak(0.6, 6.18, 12.15, 0.45, {f: "FDF1E7", r: 0.05}); k.teks(0.75, 6.18, 11.9, 0.45, `Jumlah ${r.nProv} provinsi prioritas. Hitungan satelit dan angka SiPongi berasal dari dua sumber berbeda dan tidak dijumlahkan. ${r.tahun[akhir]}: tahun berjalan sampai tanggal data, bukan hasil ukur lapangan.`, {s: 8.5, v: "m"});
});

/* ---- A3: cut-off tiga hari ---- */
slide("a3", "A3 Cut-off tiga hari", "lampiran", s => tiga(s).length >= 2 ? null : "baru ada satu hari laporan (belum ada hari pembanding)", (k, c) => {
  const s = c.s, t = tiga(s), a = hariNas(t[0]), b = hariNas(t.at(-1)), ps = urutSisa(s);
  const arahH = arah(a.hotspot, b.hotspot), arahS = arah(a.sisa_ha, b.sisa_ha);
  rangka(k, c, [R(`A3. Cut-off laporan harian: hotspot ${arahH || "berubah"} dari `), J(ang(a.hotspot)), R(` (laporan ${tglK(t[0].tanggal_laporan)}) menjadi `), J(ang(b.hotspot)), R(` (laporan ${tglK(t.at(-1).tanggal_laporan)}), luas belum padam ${arahS || "berubah"} dari `), J(`±${hek(a.sisa_ha)} ha`), R(" menjadi "), J(`±${hek(b.sisa_ha)} ha`)], {s: 19});
  const grafik = (x0, judul, f2, fm) => {
    k.teks(x0, 1.5, 5.8, 0.3, judul, {s: 12}); k.garis(x0, 1.83, x0 + 5.8, 1.83, {c: C.navy, w: 0.75});
    const gw = 5.8 / ps.length, mx = Math.max(1, ...ps.flatMap(p => t.map(d => hariProv(d, p.kode)?.[f2] || 0))), by = 5.5, bh = 3.3;
    k.garis(x0, by, x0 + 5.8, by, {c: C.navy, w: 0.75});
    ps.forEach((p, i) => { const gx = x0 + i * gw, bw = Math.min(0.28, (gw - 0.2) / t.length);
      t.forEach((d, j) => { const v = hariProv(d, p.kode)?.[f2], h2 = nn(v) ? bh * v / mx : 0, xx = gx + (gw - bw * t.length) / 2 + j * bw, ak = j === t.length - 1;
        if (h2 > 0.005) k.kotak(xx, by - h2, bw - 0.02, h2, {f: ak ? C.navy : j === 0 ? "D5D9DE" : "9AA1AB"}); k.teks(xx - 0.12, by - h2 - 0.2, bw + 0.22, 0.18, nn(v) ? fm(v) : "NA", {s: 6, a: "c", b: ak, c: nn(v) ? C.teks : KABUR}); });
      const dl = delta(hariProv(t.at(-2), p.kode)?.[f2], hariProv(t.at(-1), p.kode)?.[f2]); if (dl) k.teks(gx - 0.05, by + 0.04, gw + 0.1, 0.18, dl.t, {s: 6, a: "c", b: true, c: dl.c});
      k.teks(gx - 0.05, by + 0.24, gw + 0.1, 0.4, ketik(p.nama.replace("Kalimantan", "Kal.").replace("Sumatera", "Sum."), 14), {s: 7.5, a: "c"}); });
  };
  grafik(0.6, "Hotspot per provinsi", "hotspot", n0); grafik(6.95, "Target penanganan per provinsi (ha)", "target_ha", v => n0(v));
  t.forEach((d, j) => { const x = 0.6 + j * 1.2; k.kotak(x, 6.42, 0.22, 0.14, {f: j === t.length - 1 ? C.navy : j === 0 ? "D5D9DE" : "9AA1AB"}); k.teks(x + 0.28, 6.37, 0.9, 0.24, tglK(t[j].tanggal_laporan), {s: 8, v: "m"}); });
  k.teks(6.95, 6.37, 5.8, 0.3, "naik/turun = dibanding laporan sebelumnya. Tanggal = tanggal laporan, isinya pantauan 24 jam hari sebelumnya.", {s: 7.5, i: true, c: C.abu, a: "r"});
});

/* ---- A4: rincian per provinsi ---- */
slide("a4", "A4 Rincian per provinsi", "lampiran", s => s.provinsi.some(p => p.total) ? null : "tidak ada provinsi yang mengirim total", (k, c) => {
  const s = c.s, f = fsNas(s), ps = urutSisa(s).filter(p => p.total), t3 = ps.slice(0, 3), top = ps[0], tn = top ? kodeTNTP(top) : null;
  const judul = [R("A4. "), ...t3.flatMap((p, i) => [Bi(p.nama), R(i < t3.length - 2 ? ", " : i === t3.length - 2 ? ", dan " : "")]), R(" memiliki luas belum padam terbesar")];
  if (top && top.total.sisa_ha > 0) { judul.push(R("; "), Bi(top.nama), R(" "), J(`±${hek(top.total.sisa_ha)} ha`)); if (tn) judul.push(R(" termasuk "), J(`±${hek(tn.sisa_ha)} ha`), R(" di "), Bi(tn.kawasan)); }
  rangka(k, c, judul, {s: 19});
  const kol = [{j: "Provinsi", w: 2.1}, {j: "Hotspot", w: 0.85, a: "r"}, {j: "FS", w: 0.55, a: "r"}, {j: "Target (ha)", w: 1.0, a: "r"}, {j: "Padam (ha)", w: 1.4, a: "r"}, {j: "Belum padam (ha)", w: 1.6, a: "r"}, {j: "% padam", w: 0.7, a: "r"}];
  const xs = tabelHeader(k, 0.6, 1.5, kol), rh = Math.min(0.4, 3.2 / (ps.length + 1)); let y = 1.95;
  ps.forEach((p, i) => { const t = p.total; if (i % 2 === 0) k.kotak(0.6, y, 8.2, rh, {f: "F6F7F9"});
    const v = [{t: p.nama, b: i === 0}, nn(p.hotspot?.total) ? n0(p.hotspot.total) : "NA", n0(t.fs), hek(t.target_ha), `${hek(t.padam_ha)} (${n0(t.fs_padam)} FS)`, {t: `${hek(t.sisa_ha)} (${n0(t.fs_sisa)} FS)`, c: C.jingga, b: true}, `${pct(t.padam_ha, t.target_ha)}%`];
    v.forEach((cel, j) => { const o = typeof cel === "object" ? cel : {t: cel}; k.teks(xs[j], y, kol[j].w - 0.08, rh, o.t, {s: 9, v: "m", a: kol[j].a || "l", b: o.b, c: o.c || (o.t === "NA" ? KABUR : C.teks)}); }); y += rh; });
  k.garis(0.6, y, 8.8, y, {c: C.navy, w: 1}); const tv = [{t: "Jumlah", b: true}, nn(s.nasional.hotspot?.total) ? n0(s.nasional.hotspot.total) : "NA", n0(f.fs), hek(f.target_ha), `${hek(f.padam_ha)} (${n0(f.fs_padam)} FS)`, {t: `${hek(f.sisa_ha)} (${n0(f.fs_sisa)} FS)`, c: C.jingga, b: true}, `${pct(f.padam_ha, f.target_ha)}%`];
  tv.forEach((cel, j) => { const o = typeof cel === "object" ? cel : {t: cel}; k.teks(xs[j], y + 0.03, kol[j].w - 0.08, rh, o.t, {s: 9, v: "m", a: kol[j].a || "l", b: true, c: o.c}); }); y += rh + 0.25;
  const catatan = ps.filter(p => p.blok.length > 1).map(p => `${p.nama}: ` + p.blok.map(b => `${b.kawasan} ${n0(b.fs)} FS target ${hek(b.target_ha)} ha, padam ${hek(b.padam_ha)} ha, sisa ${hek(b.sisa_ha)} ha`).join("; ") + ".");
  if (catatan.length) k.teks(0.6, y, 8.2, 0.9, catatan.join(" "), {s: 8.5, i: true}), y += 0.9;
  k.teks(0.6, Math.max(y, 5.05), 8.2, 0.3, `Hasil pemadaman ±${hek(f.padam_ha)} ha`, {s: 12}); k.garis(0.6, Math.max(y, 5.05) + 0.33, 8.8, Math.max(y, 5.05) + 0.33, {c: C.navy, w: 0.75});
  s.wilayah.forEach((w, i) => { const x = 0.6 + i * 2.8; k.teks(x, Math.max(y, 5.05) + 0.42, 2.7, 0.45, `±${hek(w.padam_ha)} ha`, {s: 18, b: true, c: i ? C.navy : C.jingga}); k.teks(x, Math.max(y, 5.05) + 0.9, 2.7, 0.22, `${w.wilayah}, ${n0(w.fs_padam)} FS padam`, {s: 8.5, c: C.abu}); });
  /* kanan: batang */
  k.kotak(9.1, 1.5, 0.01, 5.0, {f: C.garis}); k.teks(9.35, 1.5, 3.4, 0.3, "Target, padam, dan belum padam (ha)", {s: 11});
  const rb = Math.min(0.8, 4.2 / ps.length);
  ps.forEach((p, i) => { const yy = 1.95 + i * rb, t = p.total, mxv = Math.max(1, ...ps.map(q => q.total.target_ha));
    k.teks(9.35, yy, 2.4, 0.22, p.nama, {s: 9.5, b: i === 0, v: "m"}); batangPA(k, 9.35, yy + 0.26, Math.max(0.1, 2.5 * t.target_ha / mxv), 0.18, t.padam_ha, t.sisa_ha);
    k.teks(9.35, yy + 0.47, 2.7, 0.18, [R(`padam ${hek(t.padam_ha)}`, C.teks, true), R(`, belum ${hek(t.sisa_ha)} ha`, C.jingga, true)], {s: 7, v: "m"}); k.teks(12.0, yy + 0.05, 0.75, 0.45, `${pct(t.padam_ha, t.target_ha)}%`, {s: 13, b: true, a: "r", v: "m", c: pct(t.padam_ha, t.target_ha) >= 70 ? C.navy : C.jingga}); });
  k.kotak(9.35, 6.2, 0.2, 0.14, {f: C.navy}); k.teks(9.6, 6.15, 0.8, 0.24, "Padam", {s: 8, v: "m"}); k.kotak(10.5, 6.2, 0.2, 0.14, {f: C.jingga}); k.teks(10.75, 6.15, 1.2, 0.24, "Belum padam", {s: 8, v: "m"});
});

/* ---- A5: tren hotspot 12 hari ---- */
slide("a5", "A5 Tren hotspot", "lampiran", s => { const t = tren(s); return Array.isArray(t) && t.some(x => Array.isArray(x.titik)) && s.satelit?.hari ? null : "tren hotspot satelit tidak ada (aset satelit kosong)"; }, (k, c) => {
  const s = c.s, hari = s.satelit.hari, t = tren(s).filter(x => Array.isArray(x.titik)), n = hari.length;
  const per = t.map(x => { const a = sum(x.titik.slice(-3), v => v), b = sum(x.titik.slice(-6, -3), v => v); return {...x, a, b, p: b ? Math.round((a - b) / b * 100) : null}; });
  const naik = per.filter(x => x.p != null && x.p > 0), turun = per.filter(x => !(x.p != null && x.p > 0));
  rangka(k, c, [R(`A5. Hotspot 3 hari terakhir (${tglK(hari[n - 3])} sampai ${tglK(hari[n - 1])}) `), naik.length ? R("naik di ") : R("tidak naik di provinsi mana pun; turun atau tetap di "), ...(naik.length ? naik.flatMap((x, i) => [Bi(x.nama), R(` ${x.p} persen`), R(i < naik.length - 1 ? ", " : "")]) : []), turun.length && naik.length ? R("; turun atau tetap di ") : R(""), J(turun.length ? String(turun.length) : ""), turun.length && naik.length ? R(" provinsi lain") : turun.length ? R(" provinsi") : R("")], {s: 19});
  const kolN = 3, cw = 3.95, ch = per.length > 3 ? 2.35 : 4.0;
  per.forEach((x, i) => { const cx = 0.6 + (i % kolN) * (cw + 0.15), cy = 1.5 + Math.floor(i / kolN) * (ch + 0.12), mx = Math.max(1, ...x.titik), bw = (cw - 0.4) / x.titik.length, up = x.p != null && x.p > 0, by = cy + ch - 0.62, bh = ch - 1.05;
    kartu(k, cx, cy, cw, ch); k.teks(cx + 0.15, cy + 0.08, 2.2, 0.28, x.nama, {s: 10.5, b: true, v: "m"}); k.teks(cx + 2.0, cy + 0.08, cw - 2.15, 0.28, x.p == null ? "NA" : `${up ? "naik" : x.p < 0 ? "turun" : "tetap"} ${Math.abs(x.p)}%`, {s: 10, b: true, a: "r", v: "m", c: up ? C.jingga : C.navy});
    k.garis(cx + 0.2, by, cx + cw - 0.2, by, {c: C.navy, w: 0.5});
    x.titik.forEach((v, j) => { const h2 = bh * v / mx, xx = cx + 0.2 + j * bw, ak = j >= n - 3, wr = !ak ? "AEB6C0" : up ? C.jingga : C.navy; if (h2 > 0.004) k.kotak(xx + 0.02, by - h2, bw - 0.04, h2, {f: wr}); k.teks(xx - 0.05, by - h2 - 0.17, bw + 0.1, 0.16, n0(v), {s: ch > 3 ? 7 : 5.5, a: "c", b: ak}); k.teks(xx - 0.05, by + 0.04, bw + 0.1, 0.16, String(+hari[j].slice(8)), {s: 6.5, a: "c", b: ak, c: ak ? C.teks : C.abu}); });
  });
  k.teks(0.6, 6.45, 12.15, 0.2, `Tanggal di bawah batang = tanggal deteksi bulan ${BULAN[+hari[n - 1].slice(5, 7) - 1]}. Gelap atau jingga = 3 hari terakhir (jingga naik, gelap turun), abu = hari pembanding. Persen = jumlah 3 hari terakhir dibanding 3 hari sebelumnya.`, {s: 8, i: true, c: C.abu});
  k.teks(0.6, 6.7, 12.15, 0.3, `Sumber: ${s.satelit.sumber}; deteksi satelit tersedia sampai ${tglP(hari[n - 1])}, sedangkan laporan ini ${tglP(s.tanggal_laporan)}.`, {s: 7, c: C.abu});
});

/* ---- A6: konsesi dan gambut (belum ada data pada snapshot) ---- */
slide("a6", "A6 Konsesi dan gambut", "lampiran", s => s.lampiran?.B3_konsesi_gambut ? null : "persen titik panas di konsesi dan gambut per provinsi belum ada di snapshot", (k, c) => {
  rangka(k, c, [R("A6. Titik panas di areal konsesi dan lahan gambut")]); kosongKartu(k, 0.6, 1.6, 12.15, 4.9, "Belum ada data");
});

/* ---- A7: kabut asap ---- */
function teksKondisi(p) {
  const k = p.kondisi || [], o = {};
  o.udara = urutIspuKey().map(l => { const a = k.filter(r => r.ispu === l).map(r => r.kab); return a.length ? `${ISPU[l]} di ${gabung(a)}` : null; }).filter(Boolean).join("; ") || null;
  o.jarak = unik(k.filter(r => nn(r.jarak_pandang_m)).map(r => r.jarak_pandang_m)).sort((a, b) => a - b).map(m => `${m >= 1000 ? String(m / 1000).replace(".", ",") + " km" : n0(m) + " m"} ${gabung(k.filter(r => r.jarak_pandang_m === m).map(r => r.kab))}`).join("; ") || null;
  const pn = ["terganggu", "ditutup"].map(l => { const a = k.filter(r => r.penerbangan === l).map(r => r.kab); return a.length ? `penerbangan ${l} di ${gabung(a)}` : null; }).filter(Boolean);
  if (!pn.length && k.some(r => r.penerbangan === "normal")) pn.push("penerbangan normal");
  const sk = [["daring", "belajar daring"], ["libur", "sekolah libur"]].map(([l, t]) => { const a = k.filter(r => r.sekolah === l).map(r => r.kab); return a.length ? `${t} di ${gabung(a)}` : null; }).filter(Boolean);
  o.sekolah = [...pn, ...sk].join("; ").replace(/^./, ch => ch.toUpperCase()) || null;
  const ispa = k.filter(r => nn(r.ispa)), hj = ["ringan", "sedang", "lebat"].map(l => { const a = k.filter(r => r.hujan === l).map(r => r.kab); return a.length ? `${l} di ${gabung(a)}` : null; }).filter(Boolean);
  o.hujan = [...hj, ...(ispa.length ? [`ISPA ${n0(sum(ispa, r => r.ispa))} kasus`] : [])].join("; ") || null;
  return o;
}
function urutIspuKey() { return ["baik", "sedang", "tidak_sehat", "sangat_tidak_sehat", "berbahaya"]; }
const terburuk = p => (p.kondisi || []).map(r => urutIspuKey().indexOf(r.ispu)).reduce((a, b) => Math.max(a, b), -1);
slide("a7", "A7 Kabut asap", "lampiran", s => adaKondisi(s) ? null : "belum ada kondisi wilayah (kualitas udara, jarak pandang, sekolah) dari provinsi", (k, c) => {
  const s = c.s, ps = s.provinsi, parah = ps.filter(p => terburuk(p) >= 4), jp = ps.flatMap(p => (p.kondisi || []).map(r => r.jarak_pandang_m)).filter(nn), mn = jp.length ? Math.min(...jp) : null;
  rangka(k, c, [R("A7. Kabut asap: "), parah.length ? R("kualitas udara berbahaya di ") : R("kualitas udara dilaporkan di "), J(`${parah.length ? parah.length : ps.filter(p => p.kondisi?.length).length} provinsi`), mn != null ? R(", jarak pandang terendah ") : R(""), mn != null ? J(`${n0(mn)} meter`) : R(""), R(", dan kondisi sekolah per kabupaten/kota")], {s: 19});
  const kolN = 3, cw = 3.95, ch = 2.45;
  ps.forEach((p, i) => { const x = 0.6 + (i % kolN) * (cw + 0.15), y = 1.5 + Math.floor(i / kolN) * (ch + 0.12), tb = terburuk(p), wr = tb >= 0 ? ISPU_W[urutIspuKey()[tb]] : C.abu2 || C.abu, o = teksKondisi(p);
    kartu(k, x, y, cw, ch); k.kotak(x, y + 0.1, 0.06, ch - 0.2, {f: wr}); k.teks(x + 0.2, y + 0.1, 2.1, 0.32, p.nama, {s: 11, b: true, v: "m"});
    if (tb >= 0) pilTeks(k, x + cw - 1.65, y + 0.14, ISPU[urutIspuKey()[tb]].toUpperCase(), wr, C.putih, {s: 6.5, h: 0.24}); else pilTeks(k, x + cw - 1.65, y + 0.14, "BELUM ADA DATA", TERANG, C.abu, {s: 6.5, h: 0.24});
    [["UDARA", o.udara], ["JARAK PANDANG", o.jarak], ["SEKOLAH DAN PENERBANGAN", o.sekolah], ["HUJAN DAN ISPA", o.hujan]].forEach(([l, v], j) => { const yy = y + 0.5 + j * 0.47; k.teks(x + 0.2, yy, cw - 0.4, 0.15, l, {s: 6.5, b: true, c: C.biru}); k.teks(x + 0.2, yy + 0.15, cw - 0.4, 0.3, v ? ketik(v, 105) : "belum ada data", {s: 7.5, c: v ? C.teks : KABUR}); });
  });
  k.teks(0.6, 6.75, 12, 0.2, "Kategori ISPU PM2,5 dari BMKG atau Pusdalops provinsi; teks per kabupaten/kota disalin dari kiriman provinsi yang disetujui.", {s: 7, c: C.abu});
});

/* ---- A8: operasi darat ---- */
slide("a8", "A8 Operasi darat", "lampiran", s => s.provinsi.some(p => nn(p.personel?.total)) || adaAlat(s) ? null : "belum ada personel dan peralatan dari provinsi", (k, c) => {
  const s = c.s, f = fsNas(s), ps = s.provinsi, pers = [...ps].filter(p => nn(p.personel?.total)).sort((a, b) => b.personel.total - a.personel.total), mxp = Math.max(1, ...pers.map(p => p.personel.total));
  rangka(k, c, [R("A8. Operasi darat: "), J(`±${n0(s.nasional.personel.total)} personel`), R(` di ${s.prioritas.length} provinsi prioritas, hasil pemadaman `), J(`±${hek(f.padam_ha)} ha`), R(` pada ${tglP(s.tanggal_data)}`)], {s: 19});
  k.teks(0.6, 1.5, 4.2, 0.3, `Personel (±${n0(s.nasional.personel.total)})`, {s: 12}); k.garis(0.6, 1.83, 4.8, 1.83, {c: C.navy, w: 0.75});
  pers.forEach((p, i) => { const y = 1.95 + i * 0.4, bw = Math.max(0.05, 1.75 * p.personel.total / mxp); k.teks(0.6, y, 1.7, 0.34, p.nama, {s: 8.5, b: i === 0, v: "m"}); k.kotak(2.3, y + 0.06, bw, 0.22, {f: i === 0 ? C.jingga : C.navy}); k.teks(2.3 + bw + 0.06, y, 0.9, 0.34, n0(p.personel.total), {s: 8.5, b: i === 0, v: "m", c: i === 0 ? C.jingga : C.teks}); });
  ps.filter(p => !nn(p.personel?.total)).forEach((p, i) => k.teks(0.6, 1.95 + (pers.length + i) * 0.4, 4.2, 0.34, `${p.nama}: belum ada data personel`, {s: 8.5, c: KABUR, v: "m"}));
  const y2 = 1.95 + ps.length * 0.4 + 0.2; k.teks(0.6, y2, 4.2, 0.3, `Hasil padam, ${tglK(s.tanggal_data)}`, {s: 12}); k.garis(0.6, y2 + 0.33, 4.8, y2 + 0.33, {c: C.navy, w: 0.75});
  const pad = [...ps].filter(p => p.total).sort((a, b) => b.total.padam_ha - a.total.padam_ha), mxd = Math.max(1, ...pad.map(p => p.total.padam_ha));
  pad.forEach((p, i) => { const y = y2 + 0.45 + i * 0.3, bw = Math.max(0.04, 1.6 * p.total.padam_ha / mxd); k.teks(0.6, y, 1.7, 0.26, p.nama, {s: 8, v: "m"}); k.kotak(2.3, y + 0.04, bw, 0.18, {f: C.navy}); k.teks(2.3 + bw + 0.06, y, 1.6, 0.26, `±${hek(p.total.padam_ha)} ha, ${n0(p.total.fs_padam)} FS`, {s: 8, b: true, v: "m"}); });
  /* kanan: peralatan */
  k.kotak(5.05, 1.5, 0.01, 5.0, {f: C.garis}); k.teks(5.3, 1.5, 7, 0.3, "Dukungan peralatan", {s: 12}); k.garis(5.3, 1.83, 12.75, 1.83, {c: C.navy, w: 0.75});
  if (!adaAlat(s)) { kosongKartu(k, 5.3, 2.0, 7.45, 4.2, "Belum ada data peralatan", "Provinsi belum mengirim stok dan tambahan peralatan pada snapshot ini."); return; }
  const tot = {}; for (const p of ps) for (const a of p.peralatan) tot[a.kategori] = (tot[a.kategori] || 0) + a.stok + a.tambahan;
  const kat = Object.keys(tot).sort((a, b) => tot[b] - tot[a]).slice(0, 6), sisa = Object.keys(tot).filter(a => !kat.includes(a)), cw = 0.82;
  const xs = kat.map((_, i) => 6.75 + i * cw); k.teks(5.3, 1.9, 1.4, 0.4, "Provinsi", {s: 8, b: true, v: "m"}); kat.forEach((kt, i) => k.teks(xs[i], 1.9, cw - 0.04, 0.4, ALAT[kt] || kt, {s: 7.5, b: true, a: "c", v: "m"}));
  const xl = 6.75 + kat.length * cw; k.teks(xl, 1.9, 12.75 - xl, 0.4, "Lainnya", {s: 7.5, b: true, v: "m"});
  const rh = Math.min(0.62, 4.2 / ps.length); ps.forEach((p, i) => { const y = 2.35 + i * rh; if (i % 2 === 0) k.kotak(5.3, y, 7.45, rh, {f: "F6F7F9"}); k.teks(5.35, y, 1.4, rh, p.nama, {s: 8.5, b: true, v: "m"});
    kat.forEach((kt, j) => { const a = p.peralatan.filter(x => x.kategori === kt); k.teks(xs[j], y, cw - 0.04, rh, a.length ? n0(sum(a, x => x.stok + x.tambahan)) : "–", {s: 10, b: !!a.length, a: "c", v: "m", c: a.length ? C.teks : KABUR}); });
    const lain = p.peralatan.filter(a => !kat.includes(a.kategori)), cat = p.peralatan.map(a => a.catatan).filter(Boolean); k.teks(xl, y, 12.75 - xl, rh, ketik([...lain.map(a => `${ALAT[a.kategori] || a.kategori} ${n0(a.stok + a.tambahan)}`), ...cat].join(", ") || (p.peralatan.length ? "" : "belum ada data"), 60), {s: 7.5, v: "m", c: p.peralatan.length ? C.teks : KABUR}); });
  k.teks(5.3, 6.3, 7.4, 0.3, "Angka = stok ditambah tambahan hari ini (unit, set, atau buah) dari kiriman provinsi; tanda – berarti tidak dilaporkan.", {s: 7.5, i: true, c: C.abu});
});

/* ---- A9: operasi udara dan OMC ---- */
slide("a9", "A9 Operasi udara dan OMC", "lampiran", s => adaUdara(s) || adaOmc(s) ? null : "belum ada rincian operasi udara dan OMC", (k, c) => {
  const s = c.s, u = s.udara, o = s.omc, wb = u?.water_bombing, ps = s.provinsi, heli = u ? u.armada.filter(a => a.jenis === "heli").length : null, pes = u ? u.armada.filter(a => a.jenis === "pesawat").length : null;
  const judul = [R(`A9. Operasi udara ${tglK(s.tanggal_data)}: `)];
  if (adaUdara(s) && u.armada.length) judul.push(J(String(heli)), R(" heli water bombing dan "), J(String(pes)), R(" pesawat patroli/OMC"), wb.sortie ? R("; water bombing padam ") : R("; water bombing "), wb.sortie ? J(`±${hek(wb.padam_ha)} ha`) : J("nihil")); else judul.push(R("armada udara "), J("belum ada data"));
  if (adaOmc(s)) judul.push(R(`; OMC ${n0(o.sortie)} sortie, ${n0(o.kg_total)} kg bahan semai`));
  rangka(k, c, judul, {s: 19});
  const kol = [{j: "Provinsi", w: 2.2}, {j: "Armada", w: 2.4}, {j: "Water bombing", w: 2.6}, {j: "Patroli udara", w: 2.4}, {j: "Modifikasi cuaca", w: 2.55}], xs = tabelHeader(k, 0.6, 1.5, kol), rh = Math.min(0.66, 4.1 / ps.length);
  ps.forEach((p, i) => { const y = 1.95 + i * rh, a = armadaProv(s, p.kode), h = a.filter(x => x.jenis === "heli").length, pe = a.filter(x => x.jenis === "pesawat").length, w = sortieProv(wb?.daftar, p.kode), pt = sortieProv(u?.patroli.daftar, p.kode), om = sortieProv(o?.daftar, p.kode);
    if (i % 2 === 0) k.kotak(0.6, y, 12.15, rh, {f: "F6F7F9"}); k.teks(xs[0], y, 2.1, rh, p.nama, {s: 10, b: true, v: "m"});
    k.teks(xs[1], y, 2.3, rh, u ? (a.length ? [R(`${h} `, C.teks, true), R("heli WB   "), R(`${pe} `, C.teks, true), R("pesawat")] : "tidak ada armada") : "belum ada data", {s: 9, v: "m", c: u && a.length ? C.teks : KABUR});
    const tdk = a.filter(x => x.status === "tidak_terbang"); if (tdk.length) k.teks(xs[1], y + rh - 0.24, 2.3, 0.22, ketik(`${tdk.map(x => x.registrasi).join(", ")} tidak terbang`, 40), {s: 6.5, c: C.merah});
    const dua = (x, w, a, b, ok, merah) => { if (b == null) return k.teks(x, y, w, rh, a, {s: 9, v: "m", b: !!ok, c: merah ? C.merah : ok ? C.teks : KABUR}); k.teks(x, y + 0.04, w, rh / 2 - 0.02, a, {s: 9, b: true, v: "m"}); k.teks(x, y + rh / 2 - 0.02, w, rh / 2 - 0.04, ketik(b, 44), {s: 7.5, c: C.abu, v: "m"}); };
    if (!u) dua(xs[2], 2.5, "belum ada data", null, false); else if (w.length) dua(xs[2], 2.5, `±${hek(sum(w, x => x.padam_ha))} ha padam`, `${n0(unik(w.map(x => x.registrasi)).length)} heli, ${w.length} sortie, ${n0(sum(w, x => x.bom))} kali`, true); else dua(xs[2], 2.5, "Nihil", null, true, true);
    if (!u) dua(xs[3], 2.3, "belum ada data", null, false); else if (pt.length) dua(xs[3], 2.3, `${pt.length} sortie, ${jamMenit(sum(pt, x => x.durasi_menit))}`, `${unik(pt.map(x => x.registrasi)).join(", ")}${sum(pt, x => x.temuan_fs) ? `, temuan ${n0(sum(pt, x => x.temuan_fs))} FS` : ""}`, true); else dua(xs[3], 2.3, "tidak ada patroli", null, false);
    if (!o) dua(xs[4], 2.45, "belum ada data", null, false); else if (om.length) dua(xs[4], 2.45, `${om.length} sortie`, Object.keys(BAHAN).map(b => { const kg = sum(om.filter(x => x.bahan === b), x => x.kg); return kg ? `${n0(kg)} kg ${BAHAN[b]}` : null; }).filter(Boolean).join(", "), true); else dua(xs[4], 2.45, "tidak ada sortie", null, false); });
  const yb = 1.95 + ps.length * rh + 0.12;
  const hs = (o?.hasil || []).map(h => `${h.sasaran}: ${{ya: "hujan setelah OMC", tidak: "belum hujan", tidak_diketahui: "belum diketahui"}[h.hujan] || "belum diisi"}`);
  const cat = [hs.length ? `Hujan setelah OMC, ${hs.join("; ")}.` : null, o ? `${o.kalimat_hujan.charAt(0).toUpperCase() + o.kalimat_hujan.slice(1)}.` : null, u?.alasan_kosong && !u.armada.length ? `Operasi udara: ${u.alasan_kosong}.` : null, o?.alasan_kosong && !o.daftar.length ? `OMC: ${o.alasan_kosong}.` : null, wb?.lintas_provinsi ? `${n0(wb.lintas_provinsi)} sortie water bombing lintas provinsi dihitung sekali di total nasional.` : null, o?.lintas_provinsi ? `${n0(o.lintas_provinsi)} sortie OMC lintas provinsi dihitung sekali.` : null].filter(Boolean);
  k.teks(0.6, Math.min(yb, 6.0), 12.15, 6.65 - Math.min(yb, 6.0), cat.join(" "), {s: 8.5, i: true});
});

/* ---- A10: hambatan, upaya, kedaruratan ---- */
slide("a10", "A10 Hambatan dan upaya", "lampiran", s => adaHamb(s) ? null : "belum ada hambatan, upaya, dan status kedaruratan dari provinsi", (k, c) => {
  const s = c.s, ds = s.provinsi.filter(p => p.darurat?.jenis && p.darurat.jenis !== "tidak");
  rangka(k, c, [R("A10. Hambatan utama dan cara mengatasinya"), ds.length ? R(`; ${ds.length} provinsi berstatus darurat`) : R("")], {s: 20});
  const wil = s.wilayah.map(w => w.wilayah), rh = 1.25;
  k.teks(2.7, 1.5, 4.5, 0.3, "Hambatan", {s: 12}); k.garis(2.7, 1.83, 7.55, 1.83, {c: C.navy, w: 0.75}); k.teks(7.9, 1.5, 4.8, 0.3, "Upaya", {s: 12}); k.garis(7.9, 1.83, 12.75, 1.83, {c: C.navy, w: 0.75});
  wil.forEach((w, i) => { const y = 1.95 + i * rh, ps = s.provinsi.filter(p => p.wilayah === w);
    const hb = unik(ps.flatMap(p => [...(p.hambatan?.pilihan || []).map(x => HAMBATAN[x]), p.hambatan?.teks])).filter(Boolean), up = unik(ps.flatMap(p => [...(p.upaya?.pilihan || []).map(x => UPAYA[x]), p.upaya?.teks])).filter(Boolean);
    k.bulat(0.95, y + 0.5, 0.35, {f: i ? C.navy : C.jingga}); k.teks(0.6, y + 0.15, 0.7, 0.7, w.slice(0, 1), {s: 20, b: true, c: C.putih, a: "c", v: "m"}); k.teks(1.4, y + 0.3, 1.25, 0.5, w, {s: 12, b: true, v: "m"});
    k.teks(2.7, y, 4.85, rh - 0.1, hb.length ? hb.join("; ") + "." : "belum ada data hambatan", {s: 10, v: "m", c: hb.length ? C.teks : KABUR}); k.teks(7.9, y, 4.85, rh - 0.1, up.length ? up.join("; ") + "." : "belum ada data upaya", {s: 10, v: "m", c: up.length ? C.teks : KABUR}); k.garis(0.6, y + rh - 0.05, 12.75, y + rh - 0.05, {c: "ECEEF1", w: 0.5}); });
  const yk = 1.95 + wil.length * rh + 0.1; k.teks(0.6, yk, 5, 0.3, "Status kedaruratan", {s: 12}); k.garis(0.6, yk + 0.33, 12.75, yk + 0.33, {c: C.navy, w: 0.75});
  if (!ds.length) k.teks(0.6, yk + 0.45, 12, 0.3, "Tidak ada provinsi prioritas yang dilaporkan berstatus siaga atau tanggap darurat.", {s: 10, c: C.abu});
  else { let xx = 0.6, yy = yk + 0.5; ds.forEach(p => { const t = `${p.nama}, ${DARURAT[p.darurat.jenis]}${p.darurat.tmt ? " TMT " + tglK(p.darurat.tmt) : ""}${p.darurat.sd ? " s.d. " + tglK(p.darurat.sd) : ""}`, w = lebarTeks(t, 8.5, true) + 0.3; if (xx + w > 12.75) { xx = 0.6; yy += 0.32; } pilTeks(k, xx, yy, t, p.darurat.jenis === "tanggap_darurat" ? "FBE3E6" : "FBEBDD", p.darurat.jenis === "tanggap_darurat" ? C.merah : C.jingga, {s: 8.5, h: 0.26}); xx += w + 0.1; }); }
});

/* ---- A11: di luar provinsi prioritas ---- */
slide("a11", "A11 Di luar provinsi prioritas", "lampiran", s => s.di_luar_prioritas?.kejadian?.length ? null : (s.di_luar_prioritas ? "tidak ada kejadian di luar provinsi prioritas yang dilaporkan" : "belum ada kiriman Dit. Koordalops"), (k, c) => {
  const s = c.s, kj = s.di_luar_prioritas.kejadian, adaL = kj.filter(x => nn(x.luas_ha)), luas = sum(adaL, x => x.luas_ha), pv = unik(kj.map(x => x.prov)), terbesar = [...adaL].sort((a, b) => b.luas_ha - a.luas_ha)[0];
  rangka(k, c, [R("A11. Di luar provinsi prioritas: "), adaL.length ? J(`±${hek(luas)} ha`) : J("luas belum ada data"), R(" terbakar di "), J(`${pv.length} provinsi`), terbesar ? R(", terbesar di ") : R(""), terbesar ? Bi(terbesar.kab || terbesar.prov) : R("")], {s: 20});
  const kol = [{j: "Provinsi", w: 2.3}, {j: "Kabupaten/kota", w: 2.5}, {j: "Jenis", w: 1.3}, {j: "Luas (ha)", w: 1.2, a: "r"}, {j: "", w: 0.25}, {j: "Keterangan", w: 4.6}], xs = tabelHeader(k, 0.6, 1.5, kol), rh = Math.min(0.4, 4.3 / (kj.length + 1));
  kj.slice(0, 11).forEach((x, i) => { const y = 1.95 + i * rh; if (i % 2 === 0) k.kotak(0.6, y, 12.15, rh, {f: "F6F7F9"}); [x.prov, x.kab || "NA", x.jenis, nn(x.luas_ha) ? hek(x.luas_ha) : "NA", "", x.keterangan || ""].forEach((t, j) => k.teks(xs[j], y, kol[j].w - 0.08, rh, ketik(t, j === 5 ? 70 : 30), {s: 9, v: "m", a: kol[j].a || "l", b: j === 3, c: t === "NA" ? KABUR : C.teks})); });
  if (kj.length > 11) k.teks(0.6, 1.95 + 11 * rh + 0.05, 12, 0.25, `dan ${kj.length - 11} kejadian lain pada JSON snapshot`, {s: 8, c: C.abu});
  k.teks(0.6, 6.3, 12.15, 0.4, `Luas hanya dari kejadian yang menyebut luas (${adaL.length} dari ${kj.length}). Sumber: kiriman Dit. Koordalops${s.di_luar_prioritas.catatan ? ", " + s.di_luar_prioritas.catatan : ""}.`, {s: 8, i: true, c: C.abu});
});

/* ---- B1: hotspot satelit per provinsi ---- */
slide("b1", "B1 Hotspot satelit per provinsi", "lampiran", s => Array.isArray(s.lampiran?.B1_hotspot_provinsi) && s.lampiran.B1_hotspot_provinsi.some(x => nn(x.total)) ? null : "hotspot satelit per provinsi belum ada di snapshot", (k, c) => {
  const s = c.s, hot = s.nasional.hotspot, b1 = [...s.lampiran.B1_hotspot_provinsi].filter(x => nn(x.total)).sort((a, b) => b.total - a.total), mx = Math.max(1, ...b1.map(x => x.total));
  rangka(k, c, [R("B1. Satelit mendeteksi "), J(`${n0(hot.total)} hotspot`), R(` di ${b1.length} provinsi prioritas`), hot.tinggi != null ? R("; ") : R(""), hot.tinggi != null ? J(`${n0(hot.tinggi)} keyakinan tinggi`) : R(""), hot.tinggi != null ? R(` dan ${n0(hot.sedang)} sedang`) : R(". Rincian keyakinan belum ada data")], {s: 20, sumber: `${hot.sumber}; hotspot dihitung satelit (GIS), bukan angka lapangan dan tidak dicampur dengan fire spot.`});
  const kol = [{j: "Provinsi", w: 2.5}, {j: "Hotspot", w: 1.2, a: "r"}, {j: "Keyakinan tinggi", w: 1.6, a: "r"}, {j: "Keyakinan sedang", w: 1.6, a: "r"}], xs = tabelHeader(k, 0.6, 1.5, kol), rh = Math.min(0.62, 4.3 / b1.length);
  b1.forEach((x, i) => { const y = 1.95 + i * rh; if (i % 2 === 0) k.kotak(0.6, y, 6.9, rh, {f: "F6F7F9"}); [x.nama, n0(x.total), nn(x.tinggi) ? n0(x.tinggi) : "NA", nn(x.sedang) ? n0(x.sedang) : "NA"].forEach((t, j) => k.teks(xs[j], y, kol[j].w - 0.08, rh, t, {s: 10, v: "m", a: kol[j].a || "l", b: j < 2, c: t === "NA" ? KABUR : C.teks})); });
  k.teks(8.1, 1.5, 4.6, 0.3, "Hotspot per provinsi", {s: 12}); k.garis(8.1, 1.83, 12.75, 1.83, {c: C.navy, w: 0.75});
  b1.forEach((x, i) => { const y = 1.95 + i * rh, bw = Math.max(0.05, 3.1 * x.total / mx); k.kotak(8.1, y + rh * 0.25, bw, rh * 0.5, {f: i === 0 ? C.jingga : C.navy}); k.teks(8.1 + bw + 0.08, y, 1.2, rh, n0(x.total), {s: 9, b: true, v: "m", c: i === 0 ? C.jingga : C.teks}); });
});

/* ---- B2-B4: belum ada data pada snapshot ---- */
slide("b2", "B2 Konsesi dan gambut per provinsi", "lampiran", s => s.lampiran?.B3_konsesi_gambut ? null : "persen titik panas di konsesi dan gambut belum ada di snapshot", (k, c) => { rangka(k, c, [R("B2. Titik panas di konsesi dan gambut per provinsi")]); kosongKartu(k, 0.6, 1.6, 12.15, 4.9, "Belum ada data"); });
slide("b3", "B3 Konsesi dengan titik panas terbanyak", "lampiran", () => "daftar konsesi per provinsi belum menjadi bagian snapshot", (k, c) => { rangka(k, c, [R("B3. Konsesi dengan titik panas terbanyak")]); kosongKartu(k, 0.6, 1.6, 12.15, 4.9, "Belum ada data"); });
slide("b4", "B4 Grup usaha dan perusahaan", "lampiran", () => "nama perusahaan hanya di laporan berotorisasi, bukan di snapshot", (k, c) => { rangka(k, c, [R("B4. Grup usaha dan daftar perusahaan")]); kosongKartu(k, 0.6, 1.6, 12.15, 4.9, "Belum ada data"); });

/* ---- B5: metode, sumber, catatan data ---- */
slide("b5", "B5 Metode, sumber, dan catatan data", "lampiran", () => null, (k, c) => {
  const s = c.s, ex = c.ex;
  rangka(k, c, [R("B5. Metode, sumber, dan catatan data"), s.pengecualian.length ? R(`: ${s.pengecualian.length} sumber dilanjutkan tanpa kiriman terbaru`) : R("")], {s: 20});
  const blok = [
    ["DUA TANGGAL", `Laporan ${tglP(s.tanggal_laporan)} (hari dikunci). Data ${tglP(s.tanggal_data)}, pantauan 24 jam dengan cut-off ${tglP(s.tanggal_laporan)} pukul 07.00 WIB.`],
    ["SUMBER ANGKA", "Fire spot, luas target, padam, belum padam, personel, peralatan, dan kondisi wilayah dari form provinsi yang diverifikasi. Hotspot dari satelit (GIS) dan tidak dicampur dengan angka lapangan. Operasi udara dan OMC dari Satgas Udara BNPB dan Posko TMC."],
    ["STATUS LAPORAN", `${s.status === "dikunci_pengecualian" ? "Dikunci dengan pengecualian" : "Dikunci"}${s.dikunci_oleh ? " oleh " + s.dikunci_oleh : ""}, ${s.ralat ? "Ralat-" + s.ralat + (s.alasan_ralat ? ", " + s.alasan_ralat : "") : "kunci pertama (tanpa ralat)"}${ex.hash ? `. Hash snapshot ${ex.hash.slice(0, 16)}` : ""}${c.draf ? ". DRAF: belum dikunci, bukan untuk dibagikan" : ""}.`],
    ["ARTI NA", "NA berarti belum ada data pada snapshot. Angka tidak diisi dari hari lain tanpa tertulis tanggal data terakhir."],
  ];
  blok.forEach(([l, t], i) => { const x = 0.6 + (i % 2) * 6.15, y = 1.5 + Math.floor(i / 2) * 1.5; kartu(k, x, y, 6.0, 1.38); labelKecil(k, x + 0.2, y + 0.12, 5.6, l); k.teks(x + 0.2, y + 0.4, 5.6, 0.95, t, {s: 10.5}); });
  let y = 4.6; k.teks(0.6, y, 6, 0.3, "Pengecualian lanjut tanpa", {s: 12}); k.garis(0.6, y + 0.33, 12.75, y + 0.33, {c: C.navy, w: 0.75});
  if (!s.pengecualian.length) k.teks(0.6, y + 0.42, 12, 0.3, "Tidak ada. Semua sumber wajib disetujui sebelum dikunci.", {s: 9.5, c: C.abu});
  else s.pengecualian.slice(0, 4).forEach((p, i) => { k.teks(0.6, y + 0.42 + i * 0.4, 2.0, 0.34, p.label, {s: 9.5, b: true, v: "m"}); k.teks(2.7, y + 0.42 + i * 0.4, 2.2, 0.34, `data terakhir ${p.data_terakhir ? tglP(p.data_terakhir) : "tidak ada"}`, {s: 9, v: "m"}); k.teks(5.0, y + 0.42 + i * 0.4, 7.7, 0.34, ketik(p.alasan, 100), {s: 9, v: "m"}); });
  const kum = s.nasional.kumulatif_tidak_dijumlah; if (kum.length) k.teks(0.6, 6.25, 12.1, 0.4, `Luasan kumulatif musim tidak dijumlahkan ke kolom harian: ${kum.map(x => `${x.nama} ±${hek(x.ha)} ha`).join(", ")}.`, {s: 8.5, i: true});
  if (s.satelit) k.teks(0.6, 6.7, 12.15, 0.3, `Sumber satelit: ${s.satelit.sumber}.`, {s: 7, c: C.abu});
});

/* ------------------------------------------------------------ perakit deck */
/* deck(snapshot, {draf, hash}) -> {slide: [objek ber-buat(c)], dilewati: [{id, judul, alasan}]}. Tiap objek: {id, judul, bagian, buat(c)}; c = {no, total, tahun, aset}. */
function deck(s, opsi = {}) {
  const lewat = {}, aktif = REGISTRI.filter(r => { const a = r.siap(s); if (a && !r.diam) lewat[r.id] = a; return !a; }), peta = {};
  aktif.forEach((r, i) => { peta[r.id] = i + 1; });
  const ex = {peta, lewat, hash: opsi.hash || null};
  const slide2 = aktif.map(r => PS.lengkapi({id: r.id, judul: r.judul, bagian: r.bagian, gambar: (k, c) => r.gambar(k, {...c, s, ex, draf: !!opsi.draf, tahun: c.tahun || s.tanggal_laporan.slice(0, 4)})}));
  return {slide: slide2, dilewati: Object.entries(lewat).map(([id, alasan]) => ({id, judul: REGISTRI.find(r => r.id === id).judul, alasan}))};
}
const namaBerkas = (s, ext) => { const [y, m, d] = s.tanggal_laporan.split("-"); return `Laporan-Penanganan-Pengendalian-Karhutla-${+d}-${BULAN[+m - 1].slice(0, 3)}-${y}${s.ralat ? "-Ralat-" + s.ralat : ""}.${ext}`; };
window.LaporanKarhutlaSlide = {deck, namaBerkas, REGISTRI, DAFTAR_A, DAFTAR_B, kolomHari, riwayatTahun, tglP, tglK};
})();
