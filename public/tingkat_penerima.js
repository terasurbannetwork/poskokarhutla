/* Klasifikasi tingkat penerima proyek pendanaan: pusat, daerah, nonpem (non-pemerintah), belum.
   Murni fungsi nama + (opsional) data lembaga; dipakai layar /direktori dan diuji di tests/agen. */
(function (akar) {
  const DAERAH = /\b(pemerintah daerah|pemda|provinsi|province|kabupaten|regency|kota|city of|bpbd|dinas|pemprov|pemkab|pemkot|gubernur|bupati|wali ?kota|bappeda|desa)\b/i;
  const PUSAT = /\b(kementerian|kemen[a-z]*|ministry|directorate general|dirjen|bappenas|national development planning|bnpb|bmkg|basarnas|badan (nasional|meteorologi|informasi|riset|geologi|pusat)|national (disaster|agency|board)|bank indonesia|ojk|pln|pertamina|persero|bumn|bpdlh|indonesia environment fund|coordinating ministry|fiscal policy|republic of indonesia|pemerintah (pusat|indonesia|republik)|government of indonesia)\b/i;
  const NONPEM = /\b(universit[a-z]*|institut|kampus|college|ngo|lsm|foundation|yayasan|palang merah|pmi|united nations|un[a-z]*|unicef|undp|fao|who|wfp|ifrc|oxfam|world vision|world bank|asian development|bank dunia|walhi|ltd|inc|corporation|company|swasta|pt|cv|laz|dompet|care|plan international|save the children|mercy corps|catholic relief|caritas)\b/i;
  function tingkatPenerima(nama, lembaga) {
    const n = String(nama || "").trim();
    if (!n) return "belum";
    if (lembaga && lembaga.kategori) {
      if (lembaga.kategori === "pemerintah") return /bpbd/i.test(lembaga.sub || n) || lembaga.kab || /^(pemerintah|dinas)/i.test(n) ? "daerah" : (lembaga.skala === "nasional" || lembaga.skala === "pusat" ? "pusat" : (DAERAH.test(n) ? "daerah" : "pusat"));
      return "nonpem";
    }
    if (DAERAH.test(n)) return "daerah";
    if (PUSAT.test(n)) return "pusat";
    if (NONPEM.test(n)) return "nonpem";
    return "belum";
  }
  akar.tingkatPenerima = tingkatPenerima;
  if (typeof module !== "undefined" && module.exports) module.exports = {tingkatPenerima};
})(typeof window !== "undefined" ? window : globalThis);
