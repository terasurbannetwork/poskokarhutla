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

/* Analisa keahlian pakar dari histori karyanya (judul + topik + kata kunci OpenAlex): jenis bencana, fase, klaster PB nasional, wilayah kajian, tren.
   Aturan kata kunci, bukan model: tiap label membawa id karya buktinya supaya bisa diperiksa. Murni fungsi; diuji di tests/agen/analisa-keahlian.test.mjs.
   ponytail: wilayah hanya tingkat provinsi + kota/pulau besar; kab/kota menyusul bila pemilik minta. */
(function (akar) {
  const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const K = (...w) => new RegExp("\\b(" + w.join("|") + ")", "i");
  const JENIS = {
    gempa: K("earthquake", "seismi", "quake", "gempa", "liquefaction", "likuifaksi", "fault rupture"),
    tsunami: K("tsunami"),
    "gunung api": K("volcan", "erupt", "lahar", "pyroclastic", "erupsi", "letusan", "gunung ?api", "merapi", "sinabung", "semeru", "kelud", "agung volcano"),
    banjir: K("flood", "banjir", "inundat", "genangan", "flash flood"),
    longsor: K("landslide", "longsor", "mass movement", "slope (failure|stability)", "debris flow", "gerakan tanah"),
    karhutla: K("wildfire", "forest fire", "peat ?fire", "peatland fire", "land fire", "haze", "hotspot", "burned area", "burnt area", "fire (risk|danger|weather|occurrence|regime)", "kebakaran hutan", "karhutla", "titik panas"),
    kekeringan: K("drought", "kekeringan", "el ni[nñ]o", "water scarcity", "dry spell"),
    "cuaca ekstrem": K("extreme (weather|rain|precipitation)", "cyclone", "tornado", "storm", "typhoon", "puting beliung", "cuaca ekstrem", "hujan ekstrem"),
    pesisir: K("coastal", "shoreline", "abrasi", "abrasion", "sea level", "land subsidence", "penurunan (muka )?tanah", "tidal flood", "rob\\b", "storm surge"),
    iklim: K("climate change", "perubahan iklim", "global warming", "adaptation", "adaptasi iklim"),
    wabah: K("epidemi", "pandemi", "outbreak", "covid", "sars-cov", "dengue", "malaria", "cholera", "wabah", "infectious disease", "penyakit menular"),
  };
  const FASE = {
    pra: [K("risk", "hazard", "vulnerab", "susceptib", "mitigat", "early warning", "forecast", "predict", "preparedness", "zonation", "zonasi", "mapping", "resilien", "risiko", "bahaya", "kerentanan", "kerawanan", "mitigasi", "peringatan dini", "kesiapsiagaan", "prakiraan", "pemetaan"), "Pra-bencana"],
    tanggap: [K("emergency response", "evacuat", "search and rescue", "rescue", "relief", "humanitarian", "triage", "rapid assessment", "damage assessment", "tanggap darurat", "evakuasi", "pengungsi", "kaji cepat", "posko"), "Tanggap darurat"],
    pasca: [K("recover", "reconstruct", "rehabilitat", "post-?disaster", "aftermath", "trauma", "ptsd", "livelihood", "pemulihan", "rehabilitasi", "rekonstruksi", "pasca ?bencana", "huntara", "hunian tetap"), "Pascabencana"],
  };
  /* 8 klaster PB nasional (Keputusan Kepala BNPB 173/2014) */
  const KLASTER = {
    kesehatan: [K("health", "hospital", "medical", "disease", "nutrition", "mental", "psycholog", "kesehatan", "rumah sakit", "puskesmas", "gizi", "epidemi", "pandemi", "covid", "dengue", "malaria"), "Kesehatan"],
    sar: [K("search and rescue", "rescue", "pencarian dan pertolongan", "penyelamatan", "basarnas"), "Pencarian dan penyelamatan"],
    logistik: [K("logistic", "supply chain", "distribution", "stockpil", "logistik", "rantai pasok"), "Logistik"],
    pengungsian: [K("shelter", "displace", "refugee", "evacuat", "gender", "child protection", "disabilit", "pengungsi", "evakuasi", "perlindungan", "kelompok rentan"), "Pengungsian dan perlindungan"],
    pendidikan: [K("school", "education", "student", "teacher", "curricul", "sekolah", "pendidikan", "siswa", "guru", "kurikulum"), "Pendidikan"],
    sarpras: [K("infrastructur", "(?<!capacity )buildings?\\b", "bridges?\\b", "roads?\\b", "structural", "retrofit", "construction", "dam\\b", "levee", "bangunan", "jembatan", "jalan", "struktur", "bendungan", "tanggul", "konstruksi"), "Sarana dan prasarana"],
    ekonomi: [K("econom", "livelihood", "poverty", "insurance", "disaster financ", "risk financ", "economic loss", "ekonomi", "mata pencaharian", "kemiskinan", "asuransi", "pembiayaan", "kerugian"), "Ekonomi"],
    pemulihan: [K("recover", "reconstruct", "rehabilitat", "build back better", "pemulihan", "rehabilitasi", "rekonstruksi"), "Pemulihan dini"],
  };
  const PROV = {
    "Aceh": ["aceh", "banda aceh", "simeulue"], "Sumatera Utara": ["sumatera utara", "north sumatra", "medan", "nias", "toba", "sinabung", "karo"], "Sumatera Barat": ["sumatera barat", "west sumatra", "padang", "mentawai", "bukittinggi"],
    "Kepulauan Riau": ["kepulauan riau", "riau islands", "batam"], "Riau": ["riau", "pekanbaru"], "Jambi": ["jambi"], "Sumatera Selatan": ["sumatera selatan", "south sumatra", "palembang"],
    "Bengkulu": ["bengkulu"], "Lampung": ["lampung"], "Kepulauan Bangka Belitung": ["bangka", "belitung"], "DKI Jakarta": ["jakarta"], "Banten": ["banten", "serang", "tangerang"],
    "Jawa Barat": ["jawa barat", "west java", "bandung", "bogor", "cianjur", "garut", "sukabumi", "citarum", "pangandaran"], "Jawa Tengah": ["jawa tengah", "central java", "semarang", "banjarnegara", "solo", "surakarta", "demak"],
    "DI Yogyakarta": ["yogyakarta", "jogja", "bantul", "sleman", "merapi"], "Jawa Timur": ["jawa timur", "east java", "surabaya", "malang", "semeru", "kelud", "sidoarjo", "lusi"],
    "Bali": ["bali"], "Nusa Tenggara Barat": ["nusa tenggara barat", "west nusa tenggara", "lombok", "sumbawa", "bima"], "Nusa Tenggara Timur": ["nusa tenggara timur", "east nusa tenggara", "kupang", "flores", "sumba", "timor"],
    "Kalimantan Barat": ["kalimantan barat", "west kalimantan", "pontianak"], "Kalimantan Tengah": ["kalimantan tengah", "central kalimantan", "palangka ?raya"], "Kalimantan Selatan": ["kalimantan selatan", "south kalimantan", "banjarmasin"],
    "Kalimantan Timur": ["kalimantan timur", "east kalimantan", "samarinda", "balikpapan"], "Kalimantan Utara": ["kalimantan utara", "north kalimantan"],
    "Sulawesi Utara": ["sulawesi utara", "north sulawesi", "manado"], "Gorontalo": ["gorontalo"], "Sulawesi Tengah": ["sulawesi tengah", "central sulawesi", "palu", "donggala", "sigi"],
    "Sulawesi Barat": ["sulawesi barat", "west sulawesi", "mamuju", "majene"], "Sulawesi Selatan": ["sulawesi selatan", "south sulawesi", "makassar"], "Sulawesi Tenggara": ["sulawesi tenggara", "southeast sulawesi", "kendari"],
    "Maluku Utara": ["maluku utara", "north maluku", "ternate"], "Maluku": ["maluku", "ambon"], "Papua": ["papua", "jayapura"],
  };
  /* Kepulauan Riau dan Maluku Utara didaftar sebelum Riau dan Maluku; teks yang sudah cocok dihapus supaya tidak terhitung dua kali */
  const PROV_RE = Object.entries(PROV).map(([p, ws]) => [p, new RegExp("\\b(" + ws.join("|") + ")\\b", "g")]);
  const teksKarya = k => norm([k.judul, ...(k.topik || []), ...(k.kunci || [])].join(" | "));
  function tambah(peta, kunci, label, k) { const e = peta.get(kunci) || {kunci, label, n: 0, bukti: []}; e.n++; e.bukti.push(k); peta.set(kunci, e); }
  /* bukti: karya terbaru dulu, paling banyak 3 */
  const urut = peta => [...peta.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "id")).map(e => ({kunci: e.kunci, label: e.label, n: e.n, bukti: e.bukti.sort((a, b) => (+b.tahun || 0) - (+a.tahun || 0)).slice(0, 3).map(k => ({id: k.id, judul: k.judul, tahun: k.tahun}))}));
  function analisaKeahlian(karya, opsi) {
    const min = (opsi && opsi.min) || 2, L = Array.isArray(karya) ? karya.filter(k => k && k.judul) : [];
    const jenis = new Map(), fase = new Map(), klaster = new Map(), wilayah = new Map();
    for (const k of L) {
      const t = teksKarya(k), j = norm(k.judul);
      for (const [kunci, re] of Object.entries(JENIS)) if (re.test(t)) tambah(jenis, kunci, kunci, k);
      for (const [kunci, [re, label]] of Object.entries(FASE)) if (re.test(t)) tambah(fase, kunci, label, k);
      for (const [kunci, [re, label]] of Object.entries(KLASTER)) if (re.test(t)) tambah(klaster, kunci, label, k);
      /* wilayah dari judul saja: topik OpenAlex tidak memuat nama tempat */
      let sisa = j; for (const [p, re] of PROV_RE) { const b = sisa.replace(re, " "); if (b !== sisa) { tambah(wilayah, p, p, k); sisa = b; } }
    }
    const saring = arr => arr.filter(e => e.n >= min);
    /* tren: jenis bencana teratas pada separuh karya lama vs 5 tahun terakhir */
    const bertahun = L.filter(k => +k.tahun).sort((a, b) => a.tahun - b.tahun), akhir = bertahun.length ? +bertahun[bertahun.length - 1].tahun : 0;
    const puncak = arr => { const m = new Map(); for (const k of arr) { const t = teksKarya(k); for (const [kunci, re] of Object.entries(JENIS)) if (re.test(t)) m.set(kunci, (m.get(kunci) || 0) + 1); }
      return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([kunci, n]) => ({kunci, n})); };
    const kini = bertahun.filter(k => +k.tahun > akhir - 5), dulu = bertahun.filter(k => +k.tahun <= akhir - 5);
    const tren = dulu.length >= 3 && kini.length >= 3 ? {dulu: {dari: +dulu[0].tahun, sampai: +dulu[dulu.length - 1].tahun, jenis: puncak(dulu)}, kini: {dari: akhir - 4, sampai: akhir, jenis: puncak(kini)}} : null;
    return {karya: L.length, jenis: saring(urut(jenis)), fase: saring(urut(fase)), klaster: saring(urut(klaster)), wilayah: saring(urut(wilayah)), tren};
  }
  akar.analisaKeahlian = analisaKeahlian;
})(typeof window !== "undefined" ? window : globalThis);
