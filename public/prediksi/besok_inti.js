"use strict";
/* besok_inti.js: fungsi murni tab Besok /prediksi (level sel, level baris, urutan, angka pil, kunci geo). Tanpa DOM dan tanpa fetch;
   prediksi.js menggambar, tests/prediksi/prediksi.test.mjs menjalankannya nyata di node. Aturan: data/kajian-bnpb/prediksi-besok/ALGORITMA.md.
   KOL = kode.<K>.kol dari prediksi.json (kode yang belum ada di data, mis. GEL/CEX, tidak ada di KOL: selnya null, tampil "–"). */
(() => {
  const KOLOM = ["HJN", "BNJ", "LSR", "API", "ASP", "GEL", "ROB", "CEX"];
  /* pil bencana -> kolom yang dicakup; pil "laut" menggabung gelombang dan rob */
  const PIL = {ALL: KOLOM, HJN: ["HJN"], BNJ: ["BNJ"], LSR: ["LSR"], API: ["API"], ASP: ["ASP"], LAUT: ["GEL", "ROB"], CEX: ["CEX"]};
  const PIL_NAMA = {ALL: "Semua", HJN: "Hujan", BNJ: "Banjir", LSR: "Longsor", API: "Titik panas", ASP: "Asap", LAUT: "Gelombang dan rob", CEX: "Angin"};
  const LEVEL = ["Normal", "Waspada", "Siaga", "Awas"];

  const deret = (a, b, c) => v => v < a ? 0 : v < b ? 1 : v < c ? 2 : 3;
  const hujan = deret(20, 50, 100), titik = deret(0.2, 0.5, 0.8);

  /* r = satu baris (hari) kode itu; null/undefined = tidak ada data = null (bukan 0) */
  function levelSel(kode, KOL, r) {
    const ks = KOL?.[kode];
    if (!r || !ks) return null;
    const v = c => { const x = r[ks.indexOf(c)]; return x == null ? null : x; };
    let x;
    switch (kode) {
      case "HJN": x = v("tot"); return x == null ? null : hujan(x);
      case "API": x = v("p"); return x == null ? null : titik(x);
      case "ASP": x = v("kat"); return x == null ? null : Math.max(0, Math.min(3, x));
      case "ROB": x = v("lewat"); return x == null ? null : x ? 2 : 0;
      default: x = v("lv"); return x == null ? null : Math.max(0, Math.min(3, x)); // BNJ, LSR, GEL, CEX
    }
  }
  const levelKode = (k, KOL, n, kode) => levelSel(kode, KOL, k[kode]?.[n - 1]);
  const levelPil = (k, KOL, n, pil) => Math.max(0, ...PIL[pil].map(c => levelKode(k, KOL, n, c) ?? 0));
  const levelKab = (k, KOL, n) => levelPil(k, KOL, n, "ALL");
  /* angka pil = jumlah kab level >= 2 pada pil itu */
  const angkaPil = (daftar, KOL, n, pil) => daftar.filter(k => levelPil(k, KOL, n, pil) >= 2).length;
  const hitungLevel = (daftar, KOL, n, pil, lv) => daftar.filter(k => levelPil(k, KOL, n, pil) === lv).length;

  /* kunci urut satu kolom: level dulu, nilai mentah sebagai pemecah seri; tanpa data = -1 */
  function nilaiKolom(k, KOL, n, kol) {
    if (kol === "nama") return k.nama;
    if (kol === "jiwa") return k.jiwa || 0;
    const r = k[kol]?.[n - 1], lv = levelSel(kol, KOL, r);
    if (lv == null) return -1;
    const ks = KOL[kol], mentah = { HJN: "tot", API: "p", ASP: "pm", GEL: "hs", CEX: "emb", BNJ: "ps", LSR: "ps", ROB: "lewat" }[kol];
    return lv * 1e4 + (r[ks.indexOf(mentah)] || 0) * (kol === "API" || kol === "BNJ" || kol === "LSR" ? 100 : 1);
  }
  /* urut bawaan: level baris menurun lalu jiwa; pil terpilih = hanya kab level >= 1 pil itu, urut level pil lalu jiwa */
  function urutBawaan(daftar, KOL, n, pil = "ALL") {
    const lv = new Map(daftar.map(k => [k, levelPil(k, KOL, n, pil)]));
    return daftar.filter(k => pil === "ALL" || lv.get(k) >= 1)
      .sort((a, b) => lv.get(b) - lv.get(a) || (b.jiwa || 0) - (a.jiwa || 0) || a.nama.localeCompare(b.nama, "id"));
  }
  /* urut dari klik kepala kolom; arah 1 = menurun (angka terbesar di atas), -1 = menaik; nama menaik bila arah 1 */
  function urutKolom(daftar, KOL, n, kol, arah = 1, pil = "ALL") {
    const s = daftar.filter(k => pil === "ALL" || levelPil(k, KOL, n, pil) >= 1);
    const a = new Map(s.map(k => [k, nilaiKolom(k, KOL, n, kol)]));
    return s.sort((x, y) => (kol === "nama" ? arah * a.get(x).localeCompare(a.get(y), "id") : arah * (a.get(y) - a.get(x))) || (y.jiwa || 0) - (x.jiwa || 0));
  }

  /* kunci geo "prov|nama" sama dengan properti kab di /geo/kabupaten/<prov>.json: nama tanpa awalan "Kab. ", "Kota X" tetap */
  const kunciGeo = k => k.geo || `${k.prov}|${String(k.nama).replace(/^Kab\.\s+/, "")}`;

  window.Besok = {KOLOM, PIL, PIL_NAMA, LEVEL, levelSel, levelKode, levelPil, levelKab, angkaPil, hitungLevel, nilaiKolom, urutBawaan, urutKolom, kunciGeo};
})();
