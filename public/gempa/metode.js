"use strict";
/* ================================================================ metode gempa dan tsunami
   Satu-satunya tempat rumus (selera pemilik: kartu dan laci tanpa rumus). Gaya dan markup dari public/inti/metode.css (kembaran banjir/metode.js).
   Bab yang belum berisi DISEMBUNYIKAN, tidak pernah menampilkan teks "menunggu". Bab Susulan, Tsunami, Evakuasi, dan Bukti muncul hanya bila modulnya
   (susulan.js, tsunami.js, data/bukti.json) ada; parameter diambil dari modulnya, bukan ditulis tangan.
   Bab Susulan dan Bukti diisi dari model_susulan.json dan bukti.json (pengerja pipa). MENUNGGU-B: teks Metode Tsunami dan Evakuasi dari pengerja sim. */
const Metode = (() => {
  const IK = {
    getar: '<path d="M2 12h4l2-6 4 12 3-9 2 3h5"/>', susulan: '<path d="M3 17l5-5 3 3 6-8"/><circle cx="19" cy="7" r="2"/>', ombak: '<path d="M2 12c2.5-6 4.5-6 7 0s4.5 6 7 0 3.5-4 6-3"/><path d="M2 19h20"/>',
    evak: '<path d="M4 20h16M6 20V9l6-5 6 5v11M12 20v-6"/>', gedung: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>', orang: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>',
    berkas: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>', batas: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', sumber: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'};
  const ik = n => `<svg class="mt-ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[n] || ""}</svg>`;
  const a = (x, d = 2) => x == null || isNaN(x) ? "–" : Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
  const li = L => `<ul>${L.filter(Boolean).map(x => `<li><span>${x}</span></li>`).join("")}</ul>`;
  const bab = (n, ikon, judul, sub, singkat, teknis, batas) => `<details class="mt-sek"><summary><span class="mt-nom">${ik(ikon)}</span><span class="mt-jd"><b>${n}. ${judul}</b><small>${sub}</small></span></summary>
    <div class="mt-isi"><div class="mt-singkat"><span class="mt-lbl">Singkatnya</span><p>${singkat}</p></div>
      ${teknis ? `<details class="mt-tek"><summary>Rumus, konstanta, dan sumber</summary><div class="mt-tekisi">${teknis}</div></details>` : ""}
      ${batas && batas.length ? `<div class="mt-batas"><span class="mt-lbl">Batasan</span>${li(batas)}</div>` : ""}</div></details>`;
  const ptg = x => `<p>${x}</p>`;

  /* ---- bab-bab; tiap fungsi mengembalikan HTML atau "" (bab disembunyikan) ---- */
  function guncangan(M) {
    if (!M) return "";
    const P = M.param, S2 = M.sitasi || {};
    return bab(0, "getar", "Guncangan satu gempa", "dari magnitudo dan jarak ke tingkat guncangan (MMI) di tiap kecamatan",
      "Dari kekuatan, kedalaman, dan jenis gempa, kami menghitung percepatan tanah di pusat tiap kecamatan, lalu mengubahnya ke skala MMI yang dipakai BMKG. Hasilnya perkiraan rata-rata, bukan pengukuran.",
      `${ptg(`<b>Percepatan tanah (PGA).</b> Gempa dangkal kerak memakai ${esc(S2.kerak || "BSSA14")}; gempa antarmuka subduksi dan intraslab (kedalaman 50 km atau lebih) memakai ${esc(S2.antarmuka || "Zhao 2006")}. Vs30 seragam ${a(M.vs30_baku, 0)} m/s karena peta Vs30 belum ada.`)}
       ${ptg(`<b>Jarak.</b> Gempa titik diubah ke jarak Joyner-Boore: Rjb = maks(0, Repi - L/4), dengan L = 10^(${a(P.wells_coppersmith94.a)} + ${a(P.wells_coppersmith94.b)} M) km (${esc(S2.panjang_rupture || "Wells & Coppersmith 1994")}).`)}
       ${ptg(`<b>PGA ke MMI</b> (${esc(S2.gmice || "Worden 2012")}). Dengan lg = log10(PGA, cm/s²): MMI = ${a(P.worden12_pga.c1)} + ${a(P.worden12_pga.c2)} lg bila lg ≤ ${a(P.worden12_pga.t1)}, selain itu MMI = ${a(P.worden12_pga.c3)} + ${a(P.worden12_pga.c4)} lg. Hasil dipotong ${a(P.mmi_min, 0)} sampai ${a(P.mmi_maks, 0)}; di luar ${a(P.mmi_valid_min, 0)} sampai ${a(P.mmi_valid_maks, 0)} ditandai ekstrapolasi.`)}
       ${ptg(`<b>Jendela hitung.</b> Kecamatan dihitung sampai MMI turun di bawah ${a(P.ambang_jendela, 0)}, paling jauh ${a(P.jendela_maks_km, 0)} km dari pusat gempa.`)}
       ${ptg(`Kinerja terhadap laporan Dirasakan BMKG: ${esc(M.kinerja_uji?.status === "belum_diuji" ? "belum diuji (arsip laporan belum cukup); tidak ada angka kinerja yang dikarang" : M.kinerja_uji?.status || "belum ada")}. Pembanding: ${esc(M.pembanding?.nama || "–")}.`)}`,
      (M.catatan || []).map(esc));
  }
  function susulan(M) {
    if (!M?.param) return "";
    const p = M.param, u = M.kinerja_uji?.m5, v = M.kinerja_validasi?.m5, n = M.pembagian?.n_utama || {}, mc = a(p.mc, 1), pr = x => a(x * 100, 1) + "%";
    const bu = M.kinerja_uji?.bootstrap_selisih_brier, ks = M.kinerja_sesuaikan?.per_t1, unggul = (x, pb) => pb ? a((pb - x) / pb * 100, 1) + "%" : "–";
    return bab(0, "susulan", "Peluang susulan", "peluang gempa susulan dalam 7 hari ke depan",
      "Kami tidak meramal gempa utama; tidak ada yang bisa, termasuk situs ini. Yang kami hitung hanya peluang gempa susulan sesudah gempa utama M 5 atau lebih terjadi. Peluang tampil sebagai angka, dengan rentang 10 sampai 90 persen untuk gempa utama kecil (keragaman antar-rangkaian, bukan rentang kepercayaan); untuk gempa utama besar hanya angka tengah.",
      `${ptg(`<b>Laju susulan</b> berkekuatan M-min atau lebih, t hari sesudah gempa utama Mu (Reasenberg dan Jones 1989, 1994): λ(t) = 10^(a + b (Mu - M-min) + (α - b)(Mu - 6)) (t + c)^(-p). Cacah harapan N dalam jendela [t1, t2] adalah integral λ dt, dan peluang minimal satu susulan = 1 - e^(-N).`)}
       ${ptg(`<b>Keragaman rangkaian.</b> Tiap rangkaian gempa berbeda tingkat keaktifannya, jadi a dianggap menyebar normal (rerata ${a(p.a)}, simpangan ${a(p.sa)}; pola Page dkk. 2016). Angka yang tampil adalah peluang rata-rata atas sebaran itu, dan rentangnya (keragaman antar-rangkaian, bukan rentang kepercayaan) adalah peluang pada persentil 10 dan 90 dari a, hanya untuk Mu sampai ${a(M.rentang_maks_mu ?? 5.5, 1)}. ${M.terbit_sesuaikan === true ? "Sesudah susulan mulai tercatat, a diperbarui untuk rangkaian itu saja (Bayes, likelihood Poisson); b, p, c, dan α tetap." : "Penyesuaian dengan susulan yang sudah tercatat sudah diuji, kalah dari tanpa penyesuaian, jadi tidak dipakai."}`)}
       ${ptg(`<b>Parameter Indonesia</b> (katalog USGS M ${a(4.5, 1)} atau lebih, gempa utama 2000 sampai 2019): a = ${a(p.a)}, b = ${a(p.b)}, p = ${a(p.p)}, c = ${a(p.c)} hari, α = ${a(p.alfa)}, kelengkapan magnitudo ${mc}. Gempa utama adalah M 5 atau lebih di Indonesia yang tidak berada di jendela Gardner dan Knopoff (1974) gempa lebih besar sebelumnya. Susulan adalah gempa M ${mc} atau lebih dalam jarak 10^(0,1238 Mu + 0,983) km, 1 jam sampai 7 hari sesudahnya.`)}
       ${ks ? ptg(`<b>Penyesuaian per rangkaian diuji dan kalah.</b> Pada validasi, memperbarui a dengan susulan teramati (jendela sesudah t1 sampai 7 hari) memberi Brier lebih buruk daripada parameter umum: ${Object.entries(ks).map(([t1, v]) => `t1 = ${a(+t1, 1)} hari, ${a(v.brier_sesuai, 3)} lawan ${a(v.brier_generik, 3)}`).join("; ")}. Karena itu penyesuaian tidak dipakai.`) : ""}
       ${u ? ptg(`<b>Pengujian.</b> Validasi 2020 sampai 2022 (${fmt(n.validasi)} gempa utama), uji 2023 sampai 2026 dibuka satu kali (${fmt(n.uji)} gempa utama), melawan pembanding sederhana: proporsi gempa sekelas M (lebar 0,5) yang diikuti susulan. Untuk susulan M 5 atau lebih dalam 7 hari, model setara dengan pembanding sederhana (nilai Brier ${a(u.brier, 3)} lawan ${a(u.brier_pembanding, 3)} pada uji, selisih ${unggul(u.brier, u.brier_pembanding)}${bu ? `; bootstrap ${fmt(bu.n_boot)} ulangan memberi selisih Brier ${a(bu.selisih_brier, 4)} dengan CI95 ${a(bu.ci95[0], 4)} sampai ${a(bu.ci95[1], 4)}, mencakup nol, jadi tidak berbeda nyata` : ", tidak berbeda nyata"}). Target susulan M 6 dan M (Mu - 1) kalah dari pembanding di validasi, sehingga tidak kami tampilkan. Tiap gempa utama baru dicatat ramalannya lalu dinilai 7 hari kemudian (prospektif, tidak pernah diubah).`) : ""}`,
      ["Rentangnya lebar karena rangkaian gempa Indonesia sangat beragam.", u?.n_test ? `Cacah susulan rata-rata terlalu tinggi (uji: harapan ${fmt(Math.round(u.n_test.harapan))}, teramati ${fmt(u.n_test.amat)}), prakiraan cenderung sedikit terlalu tinggi (rata-rata ${a((u.ramal_rata ?? 0) * 100, 0)}% lawan teramati ${a((u.frek_amat ?? 0) * 100, 0)}% pada uji).` : "",
       "Jam pertama tidak dimodelkan karena katalog tidak lengkap.", "Jenis magnitudo USGS campur.", `Jendela jarak terlalu sempit untuk gempa megathrust M 8 atau lebih.`, "Gempa dalam kawanan bisa tergolong susulan gempa sebelumnya dan tidak mendapat peluang sendiri.", "Peluang adalah perkiraan model, bukan peringatan resmi."]);
  }
  /* teks dari pengerja sim (gempa-metode-B.md, versi final) */
  function simulasi() {
    if (typeof Tsunami === "undefined") return "";
    return bab(0, "getar", "Simulasi: bidang patahan dan guncangan", "bagaimana jika gempa besar terjadi di sini (bukan prakiraan)",
      "Simulasi menjawab \"bagaimana jika\"; ia tidak meramal kapan atau di mana gempa terjadi. Status tsunami resmi hanya dari BMKG.",
      `${ptg("<b>Bidang patahan.</b> Panjang L dan lebar W: antarmuka subduksi Strasser dkk. (2010), log L = -2,477 + 0,585 Mw dan log W = -0,882 + 0,351 Mw; sesar kerak Wells dan Coppersmith (1994) per mekanisme (geser, naik, turun). W dibatasi ketebalan seismogenik (kerak 20 km, antarmuka 50 km tegak). Kemiringan bawaan: subduksi 15°, naik 35°, turun 60°, geser 90°. Slip seragam D = M0 / (μ L W), M0 = 10^(1,5 Mw + 9,1) N·m, μ = 3×10^10 Pa. Untuk megathrust, bidang diletakkan dari parit ke arah darat.")}
       ${ptg("<b>Guncangan.</b> MMI dari model guncangan yang sama seperti bab Guncangan: BSSA14 untuk kerak, Zhao dkk. (2006) untuk antarmuka dan intraslab, lalu Worden dkk. (2012). Jarak = jarak ke proyeksi permukaan bidang patahan (Rjb); untuk Zhao dipakai x = √(Rjb² + h²) sebagai perkiraan jarak ke bidang (makalah memakai Rrup). Magnitudo dipotong 7,8 hanya untuk intraslab (seperti OpenQuake NSHMP 2014); antarmuka tidak dipotong. Laut tidak diwarnai.")}
       ${ptg("<b>Contoh megathrust selatan Jawa M 8,5.</b> Di simulasi (pusat 9,83° LS 110,72° BT, kedalaman 25 km, bidang 313 × 122 km), MMI terkuat di permukiman sekitar VI (6,44 di Kecamatan Tulungagung). Angka ini wajar karena bidang patahan berada di laut: Rjb terkecil ke pusat kecamatan berpenduduk 121 km (Munjungan, Trenggalek; MMI 6,39). Sebagai pembanding, ShakeMap USGS mencatat MMI terkuat 5,0 pada Pangandaran 2006 (M 7,7) dan 5,3 pada Banyuwangi 1994 (M 7,8), sedangkan model memberi 3,6 sampai 4,5 pada Rjb 174 sampai 275 km (kedalaman 20 sampai 25 km). Jadi model cenderung 0,5 sampai 1,5 kelas lebih rendah di pantai yang jauh dari megathrust; anggap angkanya perkiraan bawah.")}
       ${ptg("<b>Gelombang P dan S.</b> Muka gelombang P 6,5 km/s dan S 3,7 km/s memancar dari titik pusat, seketika, pada kedalaman h: r = √((v t)² - h²). Lamanya patahan merobek (puluhan detik sampai beberapa menit untuk megathrust) tidak dimodelkan. Jeda P ke S per kota adalah ilustrasi gagasan peringatan dini, belum termasuk waktu deteksi dan siaran. Penduduk: WorldPop 2026 per kecamatan, MMI di titik pusat kecamatan.")}`,
      ["Slip seragam pada satu bidang.", "Tanpa arah patahan dan efek tapak; angka guncangan adalah rata-rata."]);
  }
  function tsunami() {
    if (typeof Tsunami === "undefined") return "";
    return bab(0, "ombak", "Waktu tiba dan tinggi gelombang tsunami", "perkiraan model untuk simulasi dan rincian gempa laut besar",
      "Untuk gempa laut yang cukup besar dan dangkal, kami memperkirakan berapa menit gelombang tiba di pantai dan setinggi apa. Ini simulasi, bukan prakiraan. Status resmi tsunami hanya dari BMKG dan PTWC, tampil terpisah dan tidak pernah diubah oleh perhitungan kami.",
      `${ptg("<b>Waktu tiba.</b> Kecepatan gelombang panjang c = √(g h) di batimetri ETOPO 2022 (NOAA NCEI), disampel tiap 3 menit busur (sekitar 5,5 km). Waktu tempuh tercepat dari seluruh jejak bidang patahan dihitung dengan lintasan terpendek 16 tetangga yang tidak boleh memotong daratan. Di Pacitan, Bantul, dan Cilacap lintasan sel ke sel ini 3 sampai 5 menit lebih lambat daripada stepper air dangkal, jadi waktu yang tampil dikali 0,85. Faktor itu dipasang di tiga pantai Jawa tersebut, bukan konstanta: di 13 pantai lain dari enam skenario, rasio stepper terhadap lintasan mentah 0,61 sampai 1,06 (1,9 di balik pulau). Waktu tampil bisa sampai 10 menit lebih lambat daripada stepper (Bengkulu M 8,4) atau belasan menit lebih awal (Padang dari Aceh M 9,1, 14 menit). Di balik pulau atau di dalam teluk, waktu tampil bisa jauh lebih awal (Flores M 8,0, 43 menit). Stepper sendiri belum dibandingkan dengan pengamatan. Waktu tiba tampil \"sekitar N menit\" (kelipatan 5) sampai 180 menit sesudah gempa. Pantai di atas atau tepat di tepi bidang patahan tampil \"langsung\", karena dasar laut di depannya sudah terangkat saat gempa.")}
       ${ptg("<b>Tinggi indikatif di pantai.</b> Rumus Abe (1995): log Hr = Mw - log R - 5,55. R (km) adalah panjang lintasan lewat laut, sehingga pantai di balik selat atau pulau dihitung lebih jauh. R tidak kurang dari R0, dengan log R0 = 0,5 Mw - 2,25 (R0 sekitar 100 km untuk M 8,5 dan 141 km untuk M 8,8). Akibatnya, semua pantai dalam jarak R0 mendapat tinggi dasar yang sama sebelum koreksi kedalaman sel.")}
       ${ptg("Ada dua koreksi heuristik: hukum Green terhadap kedalaman sel pantai (rujukan 50 m, faktor dibatasi 0,7 sampai 1,5), dan faktor mekanisme, karena sesar geser hampir tidak mengangkat dasar laut sehingga tingginya dikali 0,2. Tsunami Palu 2018 terutama berasal dari longsor bawah laut, yang tidak dimodelkan.")}
       ${ptg("<b>Kapan dihitung.</b> Faktor kedalaman (heuristik): subduksi penuh sampai 30 km lalu menurun linear ke nol di 50 km (50 km atau lebih dianggap intraslab, sama dengan model guncangan), kerak penuh sampai 20 km lalu nol di 40 km. Tsunami dihitung hanya bila M 6,5 atau lebih, faktor kedalaman di atas nol, dan jejak bidang patahan berjarak 20 km atau kurang dari laut. Di rincian gempa, jenis gempa tidak diketahui, jadi dianggap subduksi.")}
       ${ptg("<b>Rentang tinggi.</b> Tinggi ditampilkan sebagai rentang 0,5 Hr sampai 2 Hr, bukan angka pasti. Batas atas 2 Hr bisa melampaui skenario terburuk yang diterbitkan; contohnya 21,4 m untuk M 8,5 di Malang (tertinggi 22,3 m di Tulungagung), padahal Widiyantoro dkk. (2020) memberi sekitar 12 m untuk Jawa Timur. Pakai batas atas sebagai kemungkinan terburuk kasar.")}
       ${ptg("<b>Animasi muka air.</b> Persamaan air dangkal linear (∂η/∂t + ∇·Q = 0, ∂Q/∂t + g h ∇η = 0) pada grid Arakawa C, dengan skema maju-mundur: fluks dihitung dari muka air lama, lalu muka air dari fluks baru. Langkah waktu mengikuti syarat CFL (10,1 detik untuk kotak Jawa). Garis pantai 0 m menjadi dinding. Kotak hitung (700 sampai 1.100 km dari sumber, tidak melewati 12° LS) dibatasi lapisan penyerap. Perpindahan awal adalah angkatan seragam D sin(kemiringan) × faktor kedalaman di jejak bidang patahan (bukan Okada, tanpa penurunan di sisi darat), dengan tepi dihaluskan. Tidak ada dispersi gelombang dan tidak ada gesekan dasar.")}`,
      ["Linear, tanpa pecah gelombang dan tanpa genangan darat sebenarnya.", "Resolusi sekitar 5,5 km: teluk, pelabuhan, dan pulau kecil tidak terlihat. Batimetri berupa titik sampel, bukan rata-rata sel.", "Tinggi empiris tidak memperhitungkan bentuk teluk.",
       "Longsor bawah laut tidak dimodelkan. Gempa tsunami lambat juga tidak: pada Pangandaran 2006 (M 7,7) model memberi tiba sekitar 30 menit dan tinggi 0,3 sampai 1,1 m di Pangandaran, sedangkan pengamatan mencatat run-up 5 sampai 8 m, melampaui yang diramalkan dari magnitudonya."]);
  }
  function evakuasi() {
    if (typeof Tsunami === "undefined") return "";
    return bab(0, "evak", "Evakuasi", "tempat tinggi terdekat dan waktu berjalan ke sana",
      "Untuk tiap titik pesisir, kami membandingkan waktu berjalan kaki ke tanah tinggi terdekat dengan waktu tiba gelombang. \"Tidak sempat\" berarti waktu jalan melebihi perkiraan tercepat waktu tiba.",
      `${ptg("<b>Titik asal dan tujuan.</b> Asalnya pusat kecamatan dan rumah sakit atau puskesmas pesisir setinggi 10 m atau kurang. Tujuannya sel tanah 20 m atau lebih yang terdekat dan garis lurusnya tidak melewati laut. Jarak jalan = jarak lurus × 1,3, dengan laju jalan kaki 4 km/jam (rentang 2,5 sampai 5), tanpa waktu reaksi atau menunggu peringatan.")}
       ${ptg("<b>Perbandingan.</b> Waktu tiba gelombang diambil dari sel laut dengan waktu tercepat dalam kotak ±2 sel (sekitar 11 km) di sekitar titik, dari sisi aman: waktu lintasan mentah dikali 0,61, rasio terkecil yang teramati terhadap stepper, sehingga lebih awal daripada waktu yang tampil di tabel pantai. Di 13 pantai uji waktu sisi aman ini tidak pernah lebih lambat dari stepper. \"Tidak sempat\" berarti waktu jalan pada 4 km/jam melebihi waktu tiba itu. Hanya titik yang tinggi indikatif atasnya di pantai terdekat 0,5 m atau lebih yang dinilai. Titik tanpa tanah 20 m dalam 40 km ditandai terpisah. Contoh megathrust selatan Jawa M 8,5: 185 dari 244 titik tidak sempat, 16 tanpa tanah 20 m.")}`,
      ["Jalur evakuasi tanpa jaringan jalan.", "Data sekolah dan rumah sakit mengikuti cakupan bab Sekolah, fasilitas kesehatan, dan bangunan publik rawan."]);
  }
  function bukti(B) {
    if (!B?.fasilitas?.length) return "";
    const RS = Bukti.R(B), sum = f => Object.values(RS).reduce((s, p) => s + Object.values(p).reduce((t, v) => t + f(v), 0), 0), prov = Bukti.cakup(B), dinilai = sum(v => v.dinilai || 0);
    const c = z => fmt(sum(v => v[z] || 0)), bnpb = (B.syarat || []).includes("genangan_bnpb");
    return bab(0, "gedung", "Sekolah, fasilitas kesehatan, dan bangunan publik rawan", "fasilitas yang berdiri di tempat berbahaya",
      `Kami mencocokkan lokasi sekolah, fasilitas kesehatan, dan bangunan publik (balai kota, kantor polisi, pemadam kebakaran) dengan jejak sesar aktif, perkiraan guncangan sesar terdekat, dan pesisir rendah. Dari ${fmt(dinilai)} fasilitas yang dinilai di ${fmt(prov)} provinsi, yang memenuhi paling sedikit satu syarat masuk daftar. Cacah bukan sensus: sekolah dan klinik tanpa tag OpenStreetMap tidak terhitung, dan provinsi yang tidak muncul bukan berarti aman.`,
      `${ptg("<b>Sumber lokasi.</b> Sekolah dari Dapodik Kemendikbudristek dan EMIS Kemenag, serta data rumah sakit dan puskesmas Pantau Bencana, di provinsi yang datanya ada. Provinsi lain memakai OpenStreetMap (ODbL 1.0, kontributor OpenStreetMap), yang kelengkapannya beragam.")}
       ${ptg(`<b>Di atas sesar</b> (${c("atas_sesar")}): jarak 1 km atau kurang dari jejak sesar aktif GEM (Styron dan Pagani 2020, CC BY-SA 4.0).`)}
       ${ptg(`<b>Zona guncangan tinggi</b> (${c("mmi_tinggi")}): MMI VII atau lebih pada skenario sesar terdekat (60 km atau kurang) yang pecah utuh sepanjang jejaknya. Itu bisa melebihi segmen yang nyata pecah sekaligus. Magnitudo skenario dari panjang jejak (Wells dan Coppersmith 1994), dipotong M 7,8, kedalaman kerak 10 km, tanpa efek tapak, dengan model guncangan yang sama seperti bab Guncangan.`)}
       ${ptg(`<b>Pesisir rendah</b> (${c("genangan")}): proksi topografi (ketinggian 10 m atau kurang dan 2 km atau kurang dari garis pantai), bukan peta bahaya tsunami. Ketinggian dari ubin AWS Terrain Tiles (sekitar 150 m).`)}
       ${ptg(`<b>Tanpa evakuasi</b> (${c("tanpa_evakuasi")}): pesisir rendah dan tanah setinggi 20 m atau lebih terdekat lebih dari 2 km, tanpa memeriksa jalan atau gedung evakuasi vertikal.`)}
       ${bnpb ? ptg(`<b>Genangan skenario BNPB</b> (${c("genangan_bnpb")}): berada di dalam genangan tsunami skenario Mw 9,0 dari InaRISK BNPB. Ketujuh skenario BNPB (Mw 7,8 sampai 9,0) hanya meliputi Kota Ambon, jadi di luar Ambon kami memakai proksi pesisir rendah sebagai cadangan.`) : ""}
       ${ptg(`<b>Pemangkasan.</b> Berkas data dibatasi 1,5 MB. Semua rumah sakit dan bangunan publik dimuat, sedangkan sekolah dipangkas mulai dari yang syaratnya paling ringan. Berkas memuat ${fmt(B.fasilitas.length)} fasilitas; semua cacah di kartu dan tabel dihitung dari ringkasan SEBELUM pemangkasan. Perkiraan fasilitas per gempa di rincian gempa memakai subset yang dimuat.`)}`,
      ["Koordinat di luar provinsinya dibuang.", "Genangan memakai DEM sekitar 150 m; sungai dan tambak pesisir rendah bisa terbaca sebagai laut.", "Sesar subduksi tidak dipakai untuk skenario.", "Daftar ini petunjuk untuk diperiksa di lapangan, bukan penilaian kelayakan bangunan."]);
  }
  const paparan = () => bab(0, "orang", "Penduduk terpapar", "berapa orang berada di tiap tingkat guncangan",
    "Perkiraan MMI tiap kecamatan dipasangkan dengan jumlah penduduk kecamatan itu, lalu dijumlahkan per kelas MMI. Ini jumlah orang yang tinggal di wilayah berguncangan tertentu, bukan jumlah korban.",
    `${ptg("<b>Hitungan.</b> Penduduk kecamatan (WorldPop 2026, disesuaikan dengan total PBB) dimasukkan ke kelas MMI bulat di pusat kecamatannya.")}`,
    ["Seluruh penduduk kecamatan dihitung di satu kelas walau guncangan bervariasi di dalamnya.", "Kecamatan tanpa data penduduk dilewati."]);
  const laporan = () => bab(0, "berkas", "Laporan harian", "ringkasan gempa dan tsunami satu hari",
    `Setiap hari kami menerbitkan ringkasan gempa dan status resmi tsunami. <a href="/gempa/laporan.html">Buka laporan harian</a>.`, "", ["Angka harian mengikuti sumber data pada saat laporan dibuat dan bisa direvisi sumbernya."]);
  const batas = () => bab(0, "batas", "Batas model", "apa yang tidak bisa dikatakan platform ini",
    "Platform ini tidak meramal kapan dan di mana gempa utama terjadi. Yang kami tampilkan adalah data gempa yang sudah terjadi, perkiraan guncangan dan susulan dari model, dan status resmi tsunami dari BMKG dan PTWC.",
    "", ["Status resmi tsunami (BMKG, PTWC) tampil apa adanya dan terpisah dari Tingkat Pantau Bencana; kami tidak menurunkannya sendiri.", "Bila BMKG tidak menyebut tsunami, kami menulis \"BMKG tidak menyebut tsunami\", bukan \"aman\".",
      "Perkiraan model dikalibrasi dari data historis dan diuji dengan aturan yang sama sebelum terbit; model yang kalah dari pembanding sederhana tidak ditampilkan."]);
  function sumber(meta, bm) {
    const L = ["BMKG: gempa terkini, gempa M 5+, gempa dirasakan, dan status tsunami (autogempa, gempaterkini, gempadirasakan), diperbarui tiap menit",
      meta?.atribusi && esc(meta.atribusi), bm?.atribusi?.batas_lempeng && esc(bm.atribusi.batas_lempeng), bm?.atribusi?.inarisk_gempa && esc(bm.atribusi.inarisk_gempa),
      "Penduduk: WorldPop 2026, disesuaikan dengan total PBB (CC BY 4.0)"];
    return bab(0, "sumber", "Sumber data", "dari mana data dan model berasal", "Semua data berasal dari penyedia resmi dan terbuka; atribusi lengkap ada di bawah.", "", L);
  }

  async function render() {
    const el = $("#metode"); if (!el || el.dataset.ok) return; el.dataset.ok = 1;
    el.innerHTML = `<div class="head"><div><h2>Metode &amp; data</h2><p>Cara tiap angka gempa dan tsunami dihitung, berikut batasnya.</p></div></div><div class="kosong"><div class="spin"></div></div>`;
    const j = u => muatJSON(u).catch(() => null);
    const [M, MS, meta, bm, B] = await Promise.all([j("data/model_guncangan.json"), j("data/model_susulan.json"), j("data/meta.json"), j("data/bahaya_meta.json"), typeof Bukti !== "undefined" ? Bukti.muat() : null]);
    const bagian = [guncangan(M), susulan(MS), simulasi(), tsunami(), evakuasi(), bukti(B), paparan(), laporan(), batas(), sumber(meta, bm)].filter(Boolean);
    let n = 0; el.innerHTML = `<div class="head"><div><h2>Metode &amp; data</h2><p>Cara tiap angka gempa dan tsunami dihitung, berikut batasnya.</p></div></div>
      ${bagian.map(h => h.replace(/<b>0\. /, `<b>${++n}. `)).join("")}`;
    el.querySelector("details.mt-sek")?.setAttribute("open", "");
  }
  return {render};
})();
