/* Kartu Laporan warga di Pantau Dalops (pemilik 20 Nov 2026: satu pintu di Dalops, Meja Laporan tetap halamannya sendiri).
   Laporan Lapor Bencana yang masih berjalan (bukan Selesai atau Tidak valid) untuk jenis tab ini, dikelompokkan per kejadian sama (kode KJ dari
   pelapor), lalu per gugus, lalu per tiket. Angka dampak antarlaporan tidak dijumlah (KEPUTUSAN-LAPOR-AI D28): kartu hanya menghitung laporan.
   Data dari GET /api/lapor/meja (hak meja: staf BNPB); dimuat hanya saat kartu dibuka. Laporan warga belum terverifikasi, bukan data resmi.
   Fungsi murni kelompok() diuji di tests/bnpb/dalops_lapor.test.mjs. */
(() => {
  "use strict";
  const MAKS = 8, SELESAI = new Set(["selesai", "tidak_valid"]);
  /* kunci jenis Dalops -> jenisId Lapor (src/lapor_spek.js); gelombang pasang = abrasi, tsunami ikut tab gempa */
  const JENIS = {banjir: ["banjir"], longsor: ["longsor"], gempa: ["gempa", "tsunami"], cuaca: ["cuaca"], kekeringan: ["kekeringan"],
    gelombang: ["abrasi"], permukiman: ["kebakaran_gedung"], gunungapi: ["erupsi"], karhutla: ["karhutla"]};
  const LABEL = {baru: "Baru", dilihat: "Dilihat", ditelaah: "Ditelaah", diteruskan: "Diteruskan", ditindaklanjuti: "Ditindaklanjuti"};
  const kab = b => (b.wilayah?.kab || "").replace(/^Kota Administrasi /, "Kota ");

  /* baris meja -> [{kunci, label, jenis, tempat, n, pelapor, baru, status, akhir}] terurut laporan terakhir, hanya yang masih berjalan */
  function kelompok(baris, jenisKey) {
    const id = new Set(JENIS[jenisKey] || []), m = new Map();
    for (const b of baris || []) {
      if (!id.has(b.jenisId) || SELESAI.has(b.status)) continue;
      const kunci = b.kejadian?.kode || b.gugus?.kode || b.nomor;
      const g = m.get(kunci) || {kunci, label: b.kejadian?.kode ? "Kejadian sama" : b.gugus?.kode ? "Gugus" : "Tiket", jenis: b.subjenis || b.jenis, tempat: new Set(), n: 0, wa: new Set(), baru: 0, status: b.status, akhir: 0};
      g.n++; if (b.wa) g.wa.add(b.wa); if (b.status === "baru") g.baru++;
      const t = [b.wilayah?.desa, kab(b)].filter(Boolean).join(", "); if (t) g.tempat.add(t);
      if ((b.terkirim || 0) > g.akhir) { g.akhir = b.terkirim || 0; g.status = b.status; }
      m.set(kunci, g);
    }
    return [...m.values()].map(g => ({...g, tempat: [...g.tempat], pelapor: g.wa.size, wa: undefined})).sort((a, b) => b.akhir - a.akhir);
  }

  const galatTeks = s => s === 401 || s === 403 ? "Laporan warga hanya untuk staf yang sudah masuk." : "Laporan warga belum bisa dimuat, coba lagi.";
  const jam = t => t ? new Date(t).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}) + " WIB" : "–";

  async function isi(wadah, jenisKey, {h, F}) {
    const teks = t => wadah.replaceChildren(h("p", {class: "dl-redup", teks: t}));
    teks("Memuat laporan warga…");
    let r; try { r = await fetch("/api/lapor/meja", {credentials: "same-origin", cache: "no-store", headers: {accept: "application/json"}}); } catch (e) { return teks(galatTeks(0)); }
    if (!r.ok) return teks(galatTeks(r.status));
    const g = kelompok((await r.json()).baris, jenisKey);
    if (!g.length) return teks("Tidak ada laporan warga yang masih berjalan untuk jenis ini.");
    const ARTI = {Laporan: "jumlah tiket laporan warga di kelompok ini; angka dampak antarlaporan tidak dijumlah", Pelapor: "jumlah nomor pelapor berbeda",
      Baru: "tiket yang belum dibuka petugas", Status: "status tiket terakhir di kelompok ini"};
    const th = ["Kejadian", "Lokasi", "Laporan", "Pelapor", "Baru", "Status", "Laporan terakhir", ""].map(k => h("th", ARTI[k] ? {scope: "col", title: ARTI[k], teks: k} : {scope: "col", teks: k}));
    const tb = h("tbody", null, ...g.slice(0, MAKS).map(x => h("tr", null,
      h("td", null, h("b", {teks: x.jenis || "Laporan"}), h("span", {class: "bn-label", teks: x.label === "Tiket" ? x.kunci : `${x.label} ${x.kunci}`})),
      h("td", {teks: x.tempat.slice(0, 2).join("; ") + (x.tempat.length > 2 ? `; +${F(x.tempat.length - 2)} lokasi` : "") || "Tanpa lokasi"}),
      h("td", {class: "dl-angka", teks: F(x.n)}), h("td", {class: "dl-angka", teks: F(x.pelapor)}),
      h("td", null, x.baru ? h("span", {class: "dl-tag dl-tag-merah", teks: F(x.baru)}) : "–"),
      h("td", {teks: LABEL[x.status] || x.status}), h("td", {teks: jam(x.akhir)}),
      h("td", null, h("a", {href: "/lapor/meja#daftar", teks: "Buka meja"})))));
    wadah.replaceChildren(h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, ...th)), tb)),
      g.length > MAKS ? h("p", {class: "dl-redup", teks: `${F(g.length - MAKS)} kelompok lain ada di Meja Laporan.`}) : "");
  }
  const api = {kelompok, isi, JENIS};
  if (typeof window !== "undefined") window.DalopsLapor = api;
  if (typeof module !== "undefined") module.exports = api;
})();
