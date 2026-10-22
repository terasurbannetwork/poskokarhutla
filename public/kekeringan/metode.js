"use strict";
/* Tab Metode (tidak di menu, A24): cara status dihitung dan batasnya, ditulis dari angka berkas data supaya tidak basi. */
const Metode = {
  /* bagian dari data baru; angka dari berkas, bagian tanpa datanya dibuang */
  baru(tabel, kartu) {
    const H = S.hth, P = S.prak, D = S.padi, J = S.uji, B = S.bukti, R = S.resmi, N = S.bnpb, o = [], bs = BASELINE_PRAK("pk1", 0);
    const F3m = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 3, maximumFractionDigits: 3}).replace("-", "−");
    if (H) o.push(kartu("HTH", `Hari tanpa hujan (HTH): hujan di bawah ${Kartu.hl(fmt(H.ambang_mm) + " mm")} sehari dihitung kering`, tabel(["Bahan", "Keterangan"],
      [["Hitungan", `hari kering berturut-turut terakhir sampai kemarin${(m => m ? `; data ${m[1]} hari ke belakang, jadi nilai terbesar ${+m[1] + 1}` : "")(/(\d+) hari ke belakang/.exec(H.catatan || ""))}`], ["Kelas BMKG", `${(H.kelas || []).map((k, i) => `${k} (${i === 0 ? "1–" + H.batas_kelas[0] : i < H.batas_kelas.length ? (H.batas_kelas[i - 1] + 1) + "–" + H.batas_kelas[i] : "> " + H.batas_kelas.at(-1)} hari)`).join(", ")}`],
       ["Sumber hujan", "Open-Meteo (model gabungan), bukan pos BMKG; hasil bisa beda dari peta HTH BMKG"], ["Wilayah", "kabupaten/kota dihitung dari penduduk di sel HTH 31 hari atau lebih, sama dengan jiwa di wilayah"]]), "Open-Meteo; kelas HTH BMKG"));
    if (P) o.push(kartu("Prakiraan", `Prakiraan 1–3 bulan dari ECMWF SEAS5: ${Kartu.hl(BELUM_UJI.toLowerCase())}, tanpa koreksi bias; arah bias tertulis di bawah`, tabel(["Bahan", "Keterangan"],
      [["Model", `${esc(P.sumber || "ECMWF SEAS5, 51 anggota")}; titik 2 derajat, sel kisi memakai titik tempat ia berada`], ["Peluang", "porsi anggota ensemble dengan SPI-3 ≤ −1, ≤ −1,5, dan ≤ −2; HTH 31 dan 61 hari dihitung dari hujan harian anggota"],
       ["Baseline", bs != null ? `peluang klimatologi ${fmt(Math.round(bs))}%; selisih dari baseline ditulis di tiap angka` : "belum tersedia di berkas data"], ["Arah bias", esc(BIAS_BULAN().join("; ") || BIAS_TXT())], ["Catatan bias", esc((P.bias?.catatan || "") + (P.catatan ? " " + P.catatan : ""))],
       ["Uji balik", "belum ada: hindcast SEAS5 tidak tersedia lewat Open-Meteo, jadi kamu membacanya sebagai arah, bukan angka pasti"]]), "ECMWF SEAS5 lewat Open-Meteo"));
    if (D) o.push(kartu("Padi", `Gagal panen padi tadah hujan: indikator cekaman air, ${Kartu.hl("bukan data puso")}`, tabel(["Bahan", "Keterangan"],
      [["Neraca air", `FAO-56 (Allen 1998) bab 8; hasil lewat FAO-33 (Doorenbos dan Kassam 1979), ${D.model?.ky != null ? `Ky ${F2(D.model.ky)}, ` : ""}TAW ${fmt(D.model?.taw_mm)} mm`], ["Tanam", `${esc(D.tanam?.definisi || "asumsi")}; umur ${fmt(D.umur)} hari: ${(D.fase || []).map(f => `${esc(f.nama)} ${fmt(f.hari)} hari`).join(", ")}`], ["Normal", "hasil yang sama dihitung dari hujan klimatologi; angka dibaca sebagai selisih terhadap Normal pada satu besaran ("+PADI_BESARAN(padiJenis())+"), bukan peringkat antarwilayah"],
       ["Ambang", `gagal panen = hasil turun ${fmt(D.ambang?.gagal_pct)}% atau lebih; turun ${fmt(D.ambang?.turun_pct)}% atau lebih ditampilkan terpisah`], ["Yang tidak ada", "data luas sawah (bobot kabupaten memakai penduduk); irigasi, pompa, dan genangan tidak dimodelkan, jadi daerah beririgasi terbaca terlalu tinggi"], ["Hujan", "ensemble SEAS5 tanpa koreksi bias, belum diuji balik"]]), "FAO-56; FAO-33; ECMWF SEAS5"));
    const A = J?.prospek?.semua;
    if (J?.aturan) o.push(kartu("Uji balik", `Uji balik ${esc((J.periode || []).join("–"))} apa adanya${A ? `: model cadangan ENSO BSS ${Kartu.hl(F3m(A.bss))}` : ""}`, tabel(["Bagian", "Hasil"],
      [["Aturan SPI-3", "dibandingkan dengan tahun kering yang dikenal (2015, 2019, 2023) dan tahun netral; hanya tahun yang melebihi rentang tahun netral disebut menonjol"],
       ...(A ? [["Model cadangan", `bersyarat fase ENSO, BSS ${F3m(A.bss)} (nol = sama dengan klimatologi); BSS rerata per tahun ${F3m(J.prospek.bss_rerata_tahun)}, positif pada ${fmt(J.prospek.tahun_bss_positif)} dari ${fmt(J.prospek.n_tahun)} tahun`]] : []),
       ["Batas", esc(J.catatan || "")], ...(J.kejadian ? [["Kejadian DIBI", esc(`${J.kejadian.dibi_dalam_periode} kejadian kering ${J.kejadian.periode_data.map(blnIso).join(" sampai ")} dicocokkan per kabupaten-bulan dengan tingkat SPI-3 (${J.kejadian.dibi_cocok} dari ${J.kejadian.dibi_total} cocok nama kabupaten). Ambang pada bagian ini tidak disetel; penyetelan terpisah ada di kartu Penyetelan (latih Okt 2023 sampai Des 2024, uji Jan 2025 sampai Agu 2026). Tanah dan HTH tak punya riwayat harian. SPI-3 pada bulan kejadian adalah diagnosis serentak, bukan prakiraan. Alarm palsu batas atas karena DIBI hanya mencatat laporan.`)], ["Kriteria layak", esc(`POD ${J.kejadian.kriteria_layak.pod_min} atau lebih, FAR ${J.kejadian.kriteria_layak.far_maks} atau kurang, CSI ${J.kejadian.kriteria_layak.csi_lipat_acak} kali alarm acak atau lebih, di setiap periode; ditetapkan sebelum angka dilihat.`)], ["Vonis", esc(J.kejadian.vonis?.layak ? "Lolos: label hipotesis dilepas." : J.kejadian.vonis?.alasan || "")]] : J.bnpb?.ada === false ? [["Kejadian BNPB", esc(J.bnpb.alasan || "")]] : []), ["SEAS5", "tidak termasuk dalam uji ini"]]), "Pantau Bencana"));
    /* penyetelan ambang (ambang.py, RISET-AMBANG.md): dipilih di periode latih, diuji sekali; angka apa adanya */
    const T = J?.kejadian?.setel;
    if (T?.hasil?.terpilih) {
      const pc = x => x == null ? "belum ada data" : fmt(Math.round(x * 100)) + "%", ci = v => v ? ` (${pc(v[0])}–${pc(v[1])})` : "";
      const nama = k => { const c = (T.kandidat || []).find(x => x.kode === k); return c ? esc((T.keluarga?.[c.keluarga] || k).replaceAll("<= t", "≤ " + String(c.t).replace(".", ",").replace("-", "−"))) : esc(k); };
      const bar = (lab, k, s, c) => [lab, nama(k), pc(s.pod) + ci(c?.pod), pc(s.far) + ci(c?.far), F3m(s.csi) + (c?.csi ? ` (${F3m(c.csi[0])}–${F3m(c.csi[1])})` : ""), F3m(s.csi_acak)];
      const H2 = T.hasil.terpilih, S0 = T.hasil.sekarang, L = T.latih.map(blnIso).join(" sampai "), U = T.uji.map(blnIso).join(" sampai ");
      o.push(kartu("Penyetelan", `Ambang baru dipilih dari ${fmt(T.kandidat_n)} kandidat dan diuji sekali: ${Kartu.hl(T.vonis?.layak ? "lolos" : "belum layak")}${T.vonis?.layak ? "" : ", status tetap memakai ambang sekarang"}`, tabel(["Aturan", "Isi", "Tertangkap (POD)", "Alarm palsu (FAR)", "CSI", "CSI alarm acak"],
        [bar(`Terpilih, latih ${L}`, H2.kode, H2.latih), bar(`Terpilih, uji ${U}`, H2.kode, H2.uji, H2.uji_selang95), bar(`Sekarang, latih ${L}`, S0.kode, S0.latih), bar(`Sekarang, uji ${U}`, S0.kode, S0.uji, S0.uji_selang95)], "n num") +
        tabel(["Bagian", "Keterangan"], [["Cara", `kandidat dipilih dari CSI tertinggi pada ${L}; skor uji ${U} hanya dihitung untuk aturan terpilih dan aturan sekarang; selang 95% dari ${fmt(T.bootstrap?.ulang)} cuplikan ulang bulan`],
          ["Kandidat", esc(Object.values(T.keluarga || {}).map(x => x.replaceAll("<=", "≤")).join("; ") + `; t = ${(T.ambang_t || []).map(x => String(x).replace(".", ",").replace("-", "−")).join(", ")}; pemilihan tidak dikoreksi untuk banyaknya percobaan`)],
          ["Kriteria layak", "POD 50% atau lebih, alarm palsu 80% atau kurang, CSI 2 kali alarm acak atau lebih, dan batas bawah selang CSI di atas alarm acak, di periode uji; ditetapkan sebelum angka dilihat"],
          ["Vonis", esc(T.vonis?.alasan || "")]]), "Pantau Bencana; DIBI BNPB; NASA POWER"));
    }
    const T2 = J?.kejadian?.setel2;
    if (T2?.rancangan) {
      const BD = "belum ada data", pn = x => x == null ? BD : fmt(Math.round(x * 100)) + "%", p1 = x => x == null ? BD : (x * 100).toFixed(1).replace(".", ",") + "%", mn = x => String(x).replaceAll("-", "−");
      const ci2 = (v, ok) => ok === false ? " (selang tak andal, kurang dari 10 klaster)" : v ? ` (${p1(v[0])}–${p1(v[1])})` : "", br = Object.entries(T2.rancangan);
      o.push(kartu("Penyetelan putaran 2", `${fmt(T2.kandidat_n)} kandidat (${fmt(T2.aturan_n)} aturan × ${fmt(T2.bonferroni_k)} rancangan) diuji: ${Kartu.hl(T2.vonis?.layak ? "ada yang lolos" : "tidak ada yang lolos")}${T2.vonis?.layak ? "" : ", status tetap memakai ambang sekarang"}`,
        tabel(["Rancangan", "Jenis", "Aturan terpilih (latih)", "Tertangkap (POD)", "Alarm palsu (FAR)", "CSI", "CSI alarm acak"], br.map(([k, h]) => { const u = h.terpilih_uji, c = h.terpilih_selang_bonferroni, a = c?.andal;
          return u ? [esc(`${k}, ${h.uraian}`), esc(h.jenis || ""), esc(mn(h.terpilih)), p1(u.pod) + (a === false ? "" : ci2(c?.pod, a)), p1(u.far) + (a === false ? "" : ci2(c?.far, a)), F3m(u.csi) + (a === false ? " (selang tak andal, kurang dari 10 klaster)" : ""), F3m(u.csi_acak)]
            : [esc(`${k}, ${h.uraian}`), esc(h.jenis || ""), BD, BD, BD, BD, BD]; }), "n num") +
        tabel(["Bagian", "Keterangan"], [["Cara", esc(`protokol ditulis sebelum angka dihitung; per rancangan satu aturan dipilih dari CSI latih ${T2.latih.map(blnIso).join(" sampai ")}, diuji sekali ${T2.uji.map(blnIso).join(" sampai ")}; selang Bonferroni untuk ${T2.bonferroni_k} uji dari ${fmt(T2.bootstrap?.ulang)} cuplikan ulang bulan atau triwulan`)],
          ["Jenis rancangan", "diagnosis: alarm boleh jatuh sesudah kejadian dalam jendela; prakiraan: alarm mendahului kejadian. Rancangan diagnosis tidak boleh dibaca sebagai kemampuan memprakirakan"],
          ["Kriteria layak", "POD 50% atau lebih, alarm palsu 80% atau kurang, CSI 2 kali alarm acak atau lebih, dan batas bawah selang CSI di atas alarm acak; tidak dilonggarkan dari putaran 1"],
          ["Uji tidak sepenuhnya buta", "periode uji sudah pernah dilihat untuk keluarga E dan aturan A−1,0 pada putaran 1; aturan lain belum pernah"],
          ["Kewajaran target", esc(T2.pelaporan ? `DIBI mencatat laporan BPBD: hanya ${fmt(T2.pelaporan.kab_pernah_melapor)} dari ${fmt(T2.pelaporan.kab_total)} kabupaten pernah melapor kekeringan sejak Okt 2023, jadi alarm di kabupaten yang tak melapor terhitung palsu. Ini batas atas FAR dan tidak dipakai untuk meloloskan` : "DIBI mencatat laporan BPBD, bukan semua kekeringan")]]), "Pantau Bencana; DIBI BNPB; NASA POWER; Open-Meteo; ERA5-Land"));
    }
    if (B) o.push(kartu("Bukti", "Bukti gambut dan kabupaten kandidat sering kering, beserta batasnya", tabel(["Bagian", "Keterangan"],
      [...(B.gambut ? [["Gambut konsesi", esc(B.gambut.catatan || "kompleks konsesi berlahan gambut di sel kekeringan Siaga atau Awas, tanpa nama perusahaan")]] : []),
       ...(B.berulang ? [["Sering kering", esc(B.berulang.catatan || "")], ["Tampungan", esc((B.berulang.embung_sumber || "") + ". Nol bukan bukti kekurangan karena peta OSM tidak lengkap")]] : [])]), "Pantau Bencana; OpenStreetMap; InaRISK BNPB"));
    if (R || N) o.push(kartu("BNPB", "Sumber BNPB dan batasnya", tabel(["Data", "Keterangan"],
      [...(R ? [["SK status darurat", `${fmt(R.n)} SK ${R.tahun_data} yang menyebut kekeringan dari ${fmt(R.n_sk_total)} SK; ${fmt(R.n_aktif)} berlaku sekarang. Tampil sebagai riwayat, bukan status berlaku; dicocokkan ke kabupaten lewat nama`]] : []),
       ...(N ? [["IRBI", esc(N.irbi_catatan || "")], ["Sawah dan lahan rusak", "seri pelaporan BNPB per tahun, bukan ukuran dampak; tahun tanpa data tidak diisi"]] : [])]), "data.bnpb.go.id; InaRISK BNPB"));
    return o.join(""); },
  render() {
    const M = S.meta, sp = M.spi, N = M.nasional;
    const tabel = (h, r, n = "") => `<div class="tw"><table class="kl-tb"><thead><tr>${h.map((x, i) => `<th class="${i ? n : ""}">${x}</th>`).join("")}</tr></thead><tbody>${r.map(c => `<tr>${c.map((x, i) => `<td class="${i ? n : ""}">${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    const kartu = (ey, judul, isi, sumber) => Kartu.ex(judul, "", "", isi, "Sumber: " + sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`);
    $("#metode").innerHTML =
      kartu("Status", `Status wilayah dihitung sendiri: ${Kartu.hl("Deteksi Pantau Bencana")}`, tabel(["Tingkat", "SPI-3", "Kelembapan tanah (persentil)"],
        [[pill(1), "≤ −1", "≤ 20"], [pill(2), "≤ −1,5", "≤ 10"], [pill(3), "≤ −2, dan butuh penguat: tanah ≤ 10 atau SPI-6 ≤ −1,5", "≤ 10 (penguat)"]], "n num"), `ambang Pantau Bencana, ${AMBANG_PIL().toLowerCase()} (lihat Uji balik); tanah menaikkan status paling banyak satu tingkat dari SPI-3, dan tanah saja paling tinggi Siaga`) +
      kartu("Hujan", `SPI-3 dari hujan bulanan 1991–2020${sp ? `, sampai ${bulanPanjang(sp.bulan)} di ${fmt(sp.sel)} sel` : ""}`, tabel(["Bahan", "Keterangan"],
        [["Hujan", "NASA POWER (MERRA-2), jumlah tiga bulan dibanding sebaran gamma 1991–2020"], ["Jeda data", "sekitar enam minggu; bulan terakhir yang terisi di hampir semua sel"], ["Dibuang", "sel yang rata-rata tiga bulannya di bawah 50 mm (SPI tak bermakna)"]]), "NASA POWER; McKee 1993; BMKG hanya menerbitkan peta gambar") +
      kartu("Tanah", `Kelembapan tanah 7–28 cm: ${Kartu.hl(fmt(M.tanah.sel))} sel sudah berpersentil`, tabel(["Bahan", "Keterangan"],
        [["Persentil", "dibanding ERA5-Land 2015–2025 pada dasarian yang sama"], ["Aturan", "tanah boleh menaikkan satu tingkat dari SPI; tanah sendirian paling tinggi Siaga; Awas butuh tanah ≤ 10 atau SPI-6 ≤ −1,5, tanpa itu paling tinggi Siaga"], ["Sel baru", "klimatologi sel bertambah tiap hari, jadi lapisan ini makin penuh"]]), "ECMWF IFS (Open-Meteo), ERA5-Land") +
      kartu("Kode DC", "Kode kekeringan (DC) hanya lapisan peta, tidak ikut menentukan status", tabel(["Kelas DC", "Nilai"],
        [["Rendah", "< 80"], ["Sedang", "80–189"], ["Tinggi", "190–299"], ["Sangat tinggi", "300–424"], ["Ekstrem", "≥ 425"]], "n num"), "Canadian Forest Fire Danger Rating System") +
      kartu("Wilayah", `Kabupaten/kota naik tingkat bila ${Kartu.hl("30%")} penduduknya di kecamatan bertingkat itu`, tabel(["Bahan", "Keterangan"],
        [["Kecamatan", "tingkat sel 0,5° terdekat dari titik tengah kecamatan"], ["Jiwa", `WorldPop, ${rb(N.total)} jiwa`], ["Status resmi", "status gabungan kami bukan status resmi; BMKG tidak menerbitkan data terstruktur. SK status darurat BNPB tampil terpisah di pop-up wilayah"]]), "WorldPop; BMKG") + this.baru(tabel, kartu);
    if (typeof Peluang !== "undefined") Peluang.muat("../banjir/data/kering_peluang.json").then(d => { const h = d && Peluang.batasan(d, {judul: "Peluang kekeringan"}); if (h) $("#metode")?.insertAdjacentHTML("beforeend", h.replace(/<b>0\. /, "<b>")); });
 },
};
