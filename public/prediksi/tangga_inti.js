"use strict";
/* tangga_inti.js: fungsi murni tab Tangga /prediksi (tangga.json dari scripts/prediksi/tangga.py). Tanpa DOM dan tanpa fetch;
   tangga.js menggambar, tests/prediksi/tangga.test.mjs menjalankannya nyata di node. Aturan: data/kajian-bnpb/tangga/ALGORITMA.md. */
(() => {
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const ANCAMAN = {k: "Kering", b: "Basah"};
  const CAKUPAN = {nas: "tingkat nasional", prov: "tingkat provinsi", kab: "", kec: "dari kecamatan, diringkas ke kabupaten"};
  const KETERANGAN = {
    musim: "beberapa bulan", bulan: "bulan ini dan berikutnya", dasarian: "10 harian kalender", h10: "10 hari ke depan",
    sepekan: "7 hari, per provinsi", h3: "3 hari ke depan", jam: "beberapa jam ke depan",
  };

  /* "2026-11-10..." atau "2026-11-10T17:51+07:00" -> "10 Nov"; bukan tanggal -> teks apa adanya */
  const tglS = s => {
    const m = String(s ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${+m[3]} ${BLN[+m[2] - 1]}` : String(s ?? "");
  };

  /* peringkat item untuk ancaman a; item "kb" iklim membawa [kering, basah] (sama dengan tk_a di tangga.py) */
  const tkItem = (e, a) => !e.a.includes(a) ? null : Array.isArray(e.tk) ? e.tk[a === "k" ? 0 : 1] : e.tk;

  /* nasional + provinsi + kabupaten untuk satu skala dan satu ancaman, urutan: nasional, provinsi, kabupaten */
  function pernyataan(t, kabId, provId, skala, a) {
    const dari = [(t.nasional || {})[skala], ((t.prov || {})[provId] || {})[skala], ((t.kab || {})[kabId] || {})[skala]];
    return dari.flatMap(x => x || []).filter(e => e.a.includes(a));
  }

  /* teks cakupan; kosong bila tingkat kabupaten (tidak perlu pil) */
  const cakupanTeks = c => CAKUPAN[c] ?? "";

  /* anak tangga tanpa pernyataan: sumber skala itu ada = "Tidak disebut", tidak ada = "Belum ada data". Tidak pernah "aman". */
  const kosongTeks = (sk, a) => sk?.ok?.[a] ? "Tidak disebut dalam pernyataan sumber" : "Belum ada data";

  /* baris tanggal sumber: "BMKG, terbit 2 Okt" atau "BMKG, diambil 10 Nov" */
  function jejak(t, e) {
    const s = (t.sumber || {})[e.s] || {};
    const tgl = s.terbit ? `terbit ${tglS(s.terbit)}` : s.update ? `update ${s.update}` : s.diambil ? `diambil ${tglS(s.diambil)}` : "tanggal tidak dicantumkan";
    return `${s.lembaga || "tanpa lembaga"}, ${tgl}`;
  }

  /* kab milik provinsi p dengan sinyal; ancaman a = "k" | "b" | "semua". Urut: menguat dulu, lalu belum selaras, lalu nama. */
  function bersinyal(t, daftar, p, a) {
    const ada = e => a === "semua" ? ["k", "b"].some(x => e[x]) : e[a];
    const tgs = e => e.m.k || e.m.b ? 0 : e.d.k || e.d.b ? 1 : 2;
    return daftar.filter(k => (!p || k.prov === p) && t.kab[k.id])
      .map(k => {
        const s = t.kab[k.id].sg;
        return {k, m: {k: s.k.m, b: s.b.m}, d: {k: s.k.d, b: s.b.d}, s: {k: s.k.s, b: s.b.s}};
      })
      .filter(r => ada(r.m) || ada(r.d) || ada(r.s))
      .sort((x, y) => (ada(y.m) - ada(x.m)) || (ada(y.d) - ada(x.d)) || x.k.nama.localeCompare(y.k.nama, "id"));
  }

  /* hitungan per provinsi: [{p, nama, n, mk, mb, sk, sb}] */
  function perProvinsi(t, daftar) {
    const g = new Map();
    for (const k of daftar) {
      const s = t.kab[k.id]?.sg;
      if (!s) continue;
      const r = g.get(k.prov) || {p: k.prov, nama: k.pn, n: 0, mk: 0, mb: 0, dk: 0, db: 0, sk: 0, sb: 0};
      r.n++; r.mk += +s.k.m; r.mb += +s.b.m; r.dk += +s.k.d; r.db += +s.b.d; r.sk += +s.k.s; r.sb += +s.b.s;
      g.set(k.prov, r);
    }
    return [...g.values()].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }

  /* kalimat tooltip pil sinyal (tanpa HTML selain <br>, aman setelah esc oleh pemanggil) */
  function ketSinyal(t, sg) {
    const nama = i => t.skala[i]?.nama ?? "";
    const C = {nas: "nasional", prov: "provinsi", kab: "kabupaten"};
    const baris = t.skala.map((s, i) => `${s.nama}: ${sg.r[i] == null ? "tanpa tingkat" : `peringkat ${sg.r[i]}, tingkat ${C[sg.c?.[i]] || "tidak diketahui"}`}`);
    if (sg.par) baris.push(`Selisih dua peringkat atau lebih: ${nama(sg.par[0])} dan ${nama(sg.par[1])}`);
    return baris;
  }

  const ATURAN = [
    "Peringkat 0 sampai 3 dipetakan dari label resmi tiap sumber (ALGORITMA bagian 3); label resmi selalu tampil apa adanya.",
    "Searah: dari musim ke jam, skala yang lebih dekat menyatakan peringkat sama atau lebih tinggi, dan paling sedikit dua skala berperingkat 1 atau lebih.",
    "Menguat: searah, naik tegas (skala terdekat lebih tinggi dari yang terjauh), dan semua skala yang dihitung bercakupan sama. Searah dengan cakupan beda atau datar tidak disebut menguat.",
    "Belum selaras: dua skala bercakupan sama (sama-sama kabupaten, atau sama-sama provinsi) berselisih peringkat dua atau lebih. Skala bercakupan beda tidak dibandingkan.",
    "Sifat dan curah hujan (selisih dari normal), kategori SPI, hujan sedang, asap terpantau, FWI tertinggi per pulau, prakiraan kondisi harian 10 hari, dan peringatan yang berakhir hari ini tidak diberi peringkat dan tidak ikut sinyal; selisih dari normal tidak disejajarkan dengan Siaga atau Awas.",
    "Sinyal hanya dari pernyataan BMKG; prediksi Centurisk97 ditampilkan terpisah. Sinyal bukan probabilitas dan bukan kabar bahwa kejadian akan terjadi; ia hanya menyatakan pernyataan resmi searah atau bertentangan.",
  ];

  window.Tangga = {tglS, tkItem, pernyataan, cakupanTeks, kosongTeks, jejak, bersinyal, perProvinsi, ketSinyal, ATURAN, ANCAMAN, KETERANGAN};
})();
