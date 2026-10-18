"use strict";
/* Kartu fasilitas rawan dari data/bukti.json (scripts/gempa/bukti.py, pengerja pipa). Kolom dan kode alasan: lihat kontrak gempa-kontrak.md.
   Dipakai Insight (kartu per alasan), Dampak (tabel per provinsi), dan Laci (Bukti.muat() untuk fasilitas di MMI VI+).
   CACAH SELALU dari `ringkas` (menghitung semua yang dinilai, sebelum berkas dipangkas ke plafon 1,5 MB); `fasilitas` hanya subset baris yang dimuat
   (semua RS dan bangunan publik, sekolah dipangkas dari syarat teringan) dan dipakai untuk menghitung titik per gempa di laci.
   Data belum ada atau kosong = semua kartu "" (dibuang, A18), tanpa galat. */
const Bukti = (() => {
  const WARNA = {sekolah: "#5f6fb0", rs: "#2b8c86", publik: "#b07a3c"}, NAMA = {sekolah: "sekolah", rs: "fasilitas kesehatan", publik: "bangunan publik"}, JENIS = ["sekolah", "rs", "publik"];
  const KARTU = {
    sesar: {kode: "atas_sesar", ey: "Di atas sesar aktif", kata: "berdiri di atas jejak sesar aktif"},
    mmi: {kode: "mmi_tinggi", ey: "Zona guncangan tinggi", kata: "berada di zona guncangan MMI VII atau lebih bila sesar terdekat pecah utuh"},
    pesisir: {kode: "genangan", ey: "Pesisir rendah", kata: "berada di pesisir rendah (dataran sampai 10 m dan dekat pantai, bukan peta bahaya tsunami)"},
    evakuasi: {kode: "tanpa_evakuasi", ey: "Tanpa jalur evakuasi", kata: "di pesisir rendah tanpa tempat tinggi dalam 2 km"},
    bnpb: {kode: "genangan_bnpb", ey: "Genangan skenario BNPB", kata: "berada di genangan tsunami skenario BNPB (Mw 9,0)", cak: "Di Kota Ambon, satu-satunya wilayah skenario BNPB, ", sumber: "InaRISK BNPB (genangan tsunami skenario)"},
  };
  let P = null;
  /* mentah (untuk guncangan.js dan Metode) atau null; kegagalan tidak di-cache */
  const muat = () => P ||= muatJSON("data/bukti.json").then(d => d?.fasilitas?.length && d.fasilitas_kolom ? d : null).catch(() => { P = null; return null; });
  /* {prov: {jenis: {dinilai, kode...}}} dari ringkas */
  const R = d => { const o = {}; for (const j of JENIS) for (const [p, v] of Object.entries(d.ringkas?.[j] || {})) (o[p] ||= {})[j] = v; return o; };
  const cakup = d => Object.values(R(d)).filter(p => Object.values(p).some(v => v.dinilai > 0)).length;
  const sumber = (c) => (c?.sumber || "OpenStreetMap (ODbL), Dapodik, EMIS Kemenag, GEM, AWS Terrain Tiles");
  const nmU = k => esc(innerWidth < 640 ? KG.pendek(namaProv(k)) : namaProv(k));
  const CATATAN = "Bukan sensus; provinsi yang tidak muncul bukan berarti aman";
  async function kartu(id) {
    const d = await muat(), c = KARTU[id]; if (!d || !c) return "";
    const K = Object.entries(R(d)).map(([p, v]) => [p, Object.fromEntries(JENIS.map(j => [j, v[j]?.[c.kode] || 0]))]).filter(([, v]) => JENIS.some(j => v[j] > 0))
      .sort((a, b) => JENIS.reduce((s, j) => s + b[1][j] - a[1][j], 0));
    const tot = Object.fromEntries(JENIS.map(j => [j, K.reduce((a, [, v]) => a + v[j], 0)])), ada = JENIS.filter(j => tot[j] > 0); if (!ada.length) return "";
    const nc = cakup(d), awal = c.cak || (nc ? `Di ${fmt(nc)} provinsi yang sudah dinilai, ` : ""), bagian = ada.map(j => Kartu.hl(fmt(tot[j]) + " " + NAMA[j]));
    const gabung = bagian.length > 1 ? bagian.slice(0, -1).join(", ") + " dan " + bagian.at(-1) : bagian[0];
    const rows = K.slice(0, 12).map(([k, v]) => ({nama: nmU(k), v: ada.map(j => v[j]), warna: ada.map(j => WARNA[j]),
      tip: `<b>${nmU(k)}</b>${ada.map(j => `<br>${NAMA[j][0].toUpperCase() + NAMA[j].slice(1)}: ${fmt(v[j])}`).join("")}`}));
    return Kartu.kartu(c.ey, `${awal}${gabung} ${c.kata}`, KG.mendatar(rows, {akhir: 60}), sumber(c) + (c.cak ? "" : `. ${CATATAN}`), "", ada.length > 1 ? ada.map(j => [WARNA[j], NAMA[j][0].toUpperCase() + NAMA[j].slice(1)]) : null); }
  /* tabel standar per provinsi (kepala gelap, bisa diurut, paginasi): cacah SEMUA fasilitas yang dinilai, dari ringkas */
  const T = {urut: "dinilai", turun: true, hal: 0};
  async function tabel() {
    const d = await muat(); if (!d) return "";
    const kodes = ["atas_sesar", "mmi_tinggi", "genangan", "tanpa_evakuasi", ...((d.syarat || []).includes("genangan_bnpb") ? ["genangan_bnpb"] : [])];
    const baris = Object.entries(R(d)).map(([k, v]) => { const r = {k, dinilai: 0}; kodes.forEach(c => r[c] = 0); for (const j of JENIS) if (v[j]) { r.dinilai += v[j].dinilai || 0; kodes.forEach(c => { r[c] += v[j][c] || 0; }); } return r; }).filter(r => r.dinilai > 0);
    if (!baris.length) return "";
    const NK = {atas_sesar: "Di atas sesar", mmi_tinggi: "MMI VII+", genangan: "Pesisir rendah", tanpa_evakuasi: "Tanpa evakuasi", genangan_bnpb: "Genangan BNPB"};
    const aktif = kodes.filter(c => baris.some(r => r[c] > 0));
    const kol = [{k: "prov", n: "Provinsi", v: r => namaProv(r.k), h: r => esc(namaProv(r.k))}, ...[["dinilai", "Fasilitas dinilai"], ...aktif.map(c => [c, NK[c]])]
      .map(([k, n]) => ({k, n, num: 1, v: r => r[k], h: r => r[k] ? `<b>${fmt(r[k])}</b>` : fmt(0)}))];
    const kk = kol.find(c => c.k === T.urut) || kol[1], s = T.turun ? -1 : 1, per = 10;
    const S2 = [...baris].sort((a, b) => { const x = kk.v(a), y = kk.v(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s; });
    T.hal = Math.min(T.hal, Math.max(0, Math.ceil(S2.length / per) - 1));
    const hal = S2.slice(T.hal * per, (T.hal + 1) * per), tot = baris.reduce((a, r) => a + r.dinilai, 0);
    const isi = `<div class="tw"><table data-bukti><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (T.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (T.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${hal.map(r => `<tr>${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(T.hal, S2.length, per, "provinsi")}`;
    return Kartu.kartu("Fasilitas rawan", `${Kartu.hl(fmt(tot) + " sekolah, fasilitas kesehatan, dan bangunan publik")} dinilai di ${fmt(baris.length)} provinsi`, isi, sumber() + `. ${CATATAN}. Cacah dari semua yang dinilai`); }
  /* pasang pengurut dan paginasi pada wadah yang memuat tabel(); ulang() menggambar ulang wadah */
  function hubung(box, ulang) {
    const th = box.querySelector("thead"); if (th) pengurutKepala(T, th, ulang);
    box.querySelector(".pgn")?.addEventListener("click", e => { const b = e.target.closest("[data-h]"); if (!b || b.disabled) return; T.hal = +b.dataset.h; ulang(); }); }
  return {muat, kartu, tabel, hubung, cakup, R, IDS: Object.keys(KARTU)};
})();
