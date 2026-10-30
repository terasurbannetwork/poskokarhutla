/* Fungsi murni layar /direktori (satu berkas supaya aturan _headers tidak bertambah): tingkat penerima, saringan multi-pilih, pencocokan kejadian. Diuji di tests/agen. */
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

/* Saringan pilihan bencana multi-pilih (OR): murni fungsi, dipakai layar /direktori dan diuji di tests/agen. */
(function (akar) {
  const ALIAS = {wabah: "kesehatan bencana"};
  const kunciRumpun = k => ALIAS[k] || k;
  /* butir cocok bila himpunan pilihan kosong, atau punya salah satu rumpun terpilih */
  function cocokBencana(pilihan, rumpun) {
    const p = [...(pilihan || [])].map(kunciRumpun); if (!p.length) return true;
    const r = new Set(Array.isArray(rumpun) ? rumpun : rumpun instanceof Set ? [...rumpun] : []);
    return p.some(k => r.has(k));
  }
  /* "gempa,banjir" atau "gempa" (URL lama) -> himpunan kunci yang sah, tanpa duplikat */
  function bacaBencana(teks, sah) { const s = new Set(sah || []); return [...new Set(String(teks || "").split(",").map(t => t.trim()).filter(t => t && (!sah || s.has(t))))]; }
  function tulisBencana(pilihan) { return [...(pilihan || [])].join(","); }
  /* klik pil: kunci kosong = kosongkan, selain itu masuk/keluar himpunan; mengembalikan himpunan baru */
  function togglePilihan(pilihan, k) { const b = new Set(pilihan || []); if (!k) return new Set(); b.has(k) ? b.delete(k) : b.add(k); return b; }
  akar.togglePilihan = togglePilihan; akar.cocokBencana = cocokBencana; akar.bacaBencana = bacaBencana; akar.tulisBencana = tulisBencana;
})(typeof window !== "undefined" ? window : globalThis);

/* Pencocokan karya riset ke kejadian besar lewat judul: tempat utama + jenis + tahun (±selisih). Murni fungsi; diuji di tests/agen. */
(function (akar) {
  const UMUM = new Set("gempa gempabumi banjir bandang erupsi letusan longsor tanah tsunami kebakaran hutan lahan kekeringan nino lahar rob penurunan angin puting beliung cuaca ekstrem gunung api dan besar dari yang untuk pada dengan kota kabupaten provinsi jawa sumatra sumatera kalimantan sulawesi barat timur tengah utara selatan laut pulau tahun the and of in at".split(" "));
  const JENIS = {gempa: /earthquake|seismic|quake|gempa/i, tsunami: /tsunami/i, "gunung api": /eruption|erupt|volcan|lahar|erupsi|letusan|ash/i, banjir: /flood|banjir|inundat/i, longsor: /landslide|longsor|mass movement|slope failure/i, karhutla: /fire|haze|burn|karhutla|kebakaran/i, kekeringan: /drought|kekeringan|el ni/i, pesisir: /coastal|rob\b|subsidence|sea level|penurunan tanah/i, "cuaca ekstrem": /storm|cyclone|tornado|extreme weather|puting beliung|typhoon/i};
  const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  function tokenTempat(nama) { return [...new Set(norm(nama).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length >= 4 && !/^\d+$/.test(w) && !UMUM.has(w)))]; }
  function siapKejadian(k) { return {tokens: tokenTempat(k.nama), tahun: +String(k.tanggal || "").slice(0, 4) || 0, jenis: JENIS[k.jenis] || null}; }
  /* satu karya cocok bila memuat kata tempat utama (kata utuh, "Merapi" bukan "Marapi"), memuat kata jenis, dan tahun terbit dalam rentang */
  function cocokKejadian(kej, karya, selisih) {
    const s = kej._siap || (kej._siap = siapKejadian(kej)), sel = selisih == null ? 2 : selisih, j = norm(karya.judul);
    if (!s.tokens.length || !j) return false;
    if (s.tahun && karya.tahun && Math.abs(+karya.tahun - s.tahun) > sel) return false;
    if (!s.tokens.some(t => new RegExp("(^|[^a-z0-9])" + t + "([^a-z0-9]|$)").test(j))) return false;
    return s.jenis ? s.jenis.test(karya.judul) : true;
  }
  akar.cocokKejadian = cocokKejadian; akar.tokenTempat = tokenTempat;
})(typeof window !== "undefined" ? window : globalThis);
