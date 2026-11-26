"use strict";
/* KPOD-2 Jam Aturan (tiket RU-038; DESAIN-TEKNIS 5.5; DESIGN-SYSTEM 7.5). Menyusun satu kartu skema rapor.py dari public/inti/jam_aturan.json
   (teks pasal publik, bukan R2); perendernya tetap UnitRapor (rapor.js). Fungsi murni tanpa DOM: hanya menghitung jumlah kunci, nilai tidak diubah.
   Status pasal "Berpasal" sah karena gerbang G-1 (tests/agen/gerbang-jam-aturan.test.mjs) menolak acuan yang tidak BERLAKU atau kutipan yang tidak ada di teks.
   Pakai: UnitJam.bangun(larikJamAturan) -> kartu. */
(() => {
  const SATUAN = {jam: "jam", hari: "hari", hari_kerja: "hari kerja", hari_kalender: "hari kalender", bulan: "bulan", tahun: "tahun", persen: "%",
    kg_orang_hari: "kg per orang per hari", l_orang_hari: "liter per orang per hari", m2_orang: "m² per orang", orang_per_unit: "orang per unit",
    kk_per_unit_per_3hari: "keluarga per unit per 3 hari", kg_orang_bulan: "kg per orang per bulan", jiwa_per_paket: "jiwa per paket",
    jp_per_tahun: "jam pelajaran per tahun", km: "km", rumah: "rumah", juta: "juta rupiah", skala: "(ambang kelas IKD, skala 0 sampai 1)"};
  const KEP = {RB: "rusak berat (RB)", RS: "rusak sedang (RS)", RR: "rusak ringan (RR)"};
  const JENIS = {tenggat: "Tenggat", standar: "Standar", ambang: "Ambang", kalender: "Kalender"};
  function nilaiJam(e) {
    const v = e.nilai, n = x => typeof x === "number" ? x.toLocaleString("id-ID") : String(x);
    if (e.satuan === "tanggal_bulan_berikut") return `tanggal ${n(v)} bulan berikutnya`;
    if (e.satuan === "tanggal") return Array.isArray(v) && v.length ? v.join(", ") : "belum diisi";
    if (e.satuan === "bendera") return v ? "ya" : "tidak";
    const t = Array.isArray(v) ? v.map(n).join(" dan ") : v && typeof v === "object" ? Object.entries(v).map(([k, x]) => `${KEP[k] || k} ${n(x)}`).join(", ") : n(v);
    return e.satuan === "persen" ? `${t}%` : `${t} ${SATUAN[e.satuan] || e.satuan}`;
  }
  function bangun(daftar) {
    const asumsi = daftar.filter(e => e.asumsi).length, tenggat = daftar.filter(e => e.jenis === "tenggat" && !e.asumsi && e.acuan).length;
    return {id: "kpod2-jam", sistem: "KPOD-2", pil: "Jam Aturan", ikon: "kalender", judul: "Tenggat dan standar berpasal", label: ["resmi"],
      sumber: ["jam_aturan"], rumus: null, aturan: [], asumsi: asumsi ? ["Asumsi: kunci tanpa pasal ditandai di kolom Status"] : [],
      angka: [{k: "tenggat", label: "Tenggat berpasal", nilai: tenggat}, {k: "asumsi", label: "Kunci berlabel asumsi", nilai: asumsi},
        {k: "kunci", label: "Kunci di Jam Aturan", nilai: daftar.length}],
      kolom: [{k: "kunci", label: "Kunci"}, {k: "jenis", label: "Jenis"}, {k: "nilai", label: "Nilai"}, {k: "sejak", label: "Sejak"},
        {k: "acuan", label: "Acuan", title: "Dokumen dan letak pasal di Pustaka hukum BNPB", tautan: "acuan_url"},
        {k: "kutipan", label: "Kutipan pasal atau catatan", title: "Kunci berpasal: kutipan persis. Kunci asumsi: catatan alasannya"}, {k: "status", label: "Status", title: "Berpasal: acuan berlaku di katalog JDIH dan kutipannya ada di teks (gerbang G-1). Asumsi: belum ada pasal"}],
      baris: daftar.map(e => ({kunci: e.kunci, jenis: JENIS[e.jenis] || e.jenis, nilai: nilaiJam(e), sejak: e.sejak || null,
        acuan: e.acuan ? [e.acuan, e.letak].filter(Boolean).join(", ") : null, acuan_url: e.acuan ? "/bnpb/hukum#d=" + encodeURIComponent(e.acuan) : undefined,
        kutipan: e.kutipan || (e.asumsi ? e.catatan : null) || null, status: e.asumsi ? "Asumsi" : "Berpasal"}))};
  }
  (typeof window !== "undefined" ? window : globalThis).UnitJam = {bangun, nilaiJam};
})();
