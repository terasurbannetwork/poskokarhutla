/* Ringkasan Status Lifeline per kejadian aktif di Pantau Dalops (data/kajian-bnpb/lifeline/ PRD F-6, TIKET LF-07; Q4: tidak publik).
   Data hanya dimuat saat kartu dibuka (tiga panggilan terbatas: daftar kejadian, lalu kisi tiap kejadian). Kisi lengkap ada di /siklus/kejadian/<KJ>.
   Warna datang dari status resmi staf (rute GET /api/siklus/kejadian/:id/lifeline); abu = belum ada bukti, tanpa warna lain tanpa bukti. "Lewat 24 jam" hanya tanda, warna tidak diubah (Q7).
   Fungsi murni diuji di tests/bnpb/dalops_lifeline.test.mjs. */
(() => {
  "use strict";
  const WARNA = ["merah", "kuning", "hijau", "abu"], MAKS = 5;
  /* kunci jenis Dalops -> jenis kejadian Buku Besar (null = tidak ada padanan) */
  const JENIS = {banjir: "banjir", longsor: "longsor", gempa: "gempa", cuaca: "cuaca", kekeringan: "kekeringan", gelombang: "gelombang", permukiman: "kebakaran_permukiman", gunungapi: "gunungapi", karhutla: "karhutla"};
  const aktif = k => k.fase !== "selesai" && k.fase !== "dibatalkan" && k.fase !== "digabung";
  /* kisi {kab:[{kab4, layanan:{l:{warna, basi}}}]} -> {merah, kuning, hijau, abu, basi, kab, sel}; warna tak dikenal dihitung abu */
  function ringkas(kisi) {
    const r = {merah: 0, kuning: 0, hijau: 0, abu: 0, basi: 0, kab: 0, sel: 0};
    for (const k of kisi?.kab || []) {
      r.kab++;
      for (const s of Object.values(k.layanan || {})) { r[WARNA.includes(s.warna) ? s.warna : "abu"]++; r.sel++; if (s.basi) r.basi++; }
    }
    return r;
  }
  const muat = async u => { try { const r = await fetch(u, {credentials: "same-origin", headers: {accept: "application/json"}}); return {s: r.status, j: r.ok ? await r.json() : null}; } catch (e) { return {s: 0, j: null}; } };
  const galatTeks = s => s === 401 || s === 403 ? "Status layanan hanya untuk staf yang sudah masuk." : s === 503 ? "Status layanan belum diaktifkan di server ini." : "Status layanan belum bisa dimuat, coba lagi.";
  /* satu panggilan daftar + satu kisi per kejadian aktif (paling banyak MAKS): {galat} atau {baris:[{kj, ringkas}], lebih} */
  async function ambil(jenisKey) {
    const jenis = JENIS[jenisKey]; if (!jenis) return {baris: [], lebih: 0};
    const d = await muat("/api/siklus/kejadian?batas=20&jenis=" + encodeURIComponent(jenis));
    if (!d.j) return {galat: galatTeks(d.s)};
    const kj = (d.j.baris || []).filter(aktif);
    const pakai = kj.slice(0, MAKS), kisi = await Promise.all(pakai.map(k => muat("/api/siklus/kejadian/" + encodeURIComponent(k.id) + "/lifeline")));
    const baris = pakai.map((k, i) => ({kj: k, ringkas: kisi[i].j ? ringkas(kisi[i].j) : null, s: kisi[i].s}));
    return {baris, lebih: kj.length - pakai.length};
  }
  /* isi wadah (div) dengan tabel ringkasan; h dan ikon dari Wilayah */
  async function isi(wadah, jenisKey, {h, F}) {
    const teks = t => wadah.replaceChildren(h("p", {class: "dl-redup", teks: t}));
    teks("Memuat status layanan…");
    const a = await ambil(jenisKey);
    if (a.galat) return teks(a.galat);
    if (!a.baris.length) return teks("Belum ada kejadian aktif jenis ini di Buku Besar Kejadian.");
    const ARTI = {Merah: "jumlah sel kab dan layanan berstatus merah menurut status resmi staf", Kuning: "jumlah sel berstatus kuning menurut status resmi staf", Hijau: "jumlah sel berstatus hijau menurut status resmi staf", Abu: "jumlah sel tanpa bukti status", "Lewat 24 jam": "sel yang status resminya belum diperbarui lebih dari 24 jam; warna tidak diubah"};
    const th = ["Kejadian", "Merah", "Kuning", "Hijau", "Abu", "Lewat 24 jam", "Kisi"].map(k => h("th", ARTI[k] ? {scope: "col", title: ARTI[k], teks: k} : {scope: "col", teks: k}));
    const tag = (w, n) => h("span", {class: "dl-tag dl-tag-" + w + (n ? "" : " dl-tag-garis"), teks: F(n)});
    const tb = h("tbody", null, ...a.baris.map(({kj, ringkas: r, s}) => h("tr", null,
      h("td", null, h("b", {teks: kj.nama || kj.id}), h("span", {class: "bn-label", teks: kj.id})),
      ...(r ? [...WARNA.map(w => h("td", null, tag(w, r[w]))), h("td", null, r.basi ? h("span", {class: "dl-tag dl-tag-garis", title: "status resmi belum diperbarui lebih dari 24 jam", teks: F(r.basi)}) : "–")]
            : [h("td", {colspan: "5", class: "dl-redup", teks: s === 404 ? "Tidak ada kab terdampak tercatat." : galatTeks(s)})]),
      h("td", null, h("a", {href: "/siklus/kejadian/" + encodeURIComponent(kj.id), teks: "Buka kisi"})))));
    wadah.replaceChildren(h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, ...th)), tb)),
      a.lebih > 0 ? h("p", {class: "dl-redup", teks: `${F(a.lebih)} kejadian aktif lain ada di Siklus Bencana.`}) : "");
  }
  window.DalopsLifeline = {ringkas, aktif, JENIS, isi, ambil};
})();
