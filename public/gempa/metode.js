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
       ${u ? ptg(`<b>Pengujian.</b> Validasi 2020 sampai 2022 (${fmt(n.validasi)} gempa utama), uji 2023 sampai 2026 dibuka satu kali (${fmt(n.uji)} gempa utama), melawan pembanding sederhana: proporsi gempa sekelas M (lebar 0,5) yang diikuti susulan. Untuk susulan M 5 atau lebih dalam 7 hari, model belum terbukti lebih baik dari pembanding sederhana: skill terhadap pembanding (BSS) hanya ${a(u.bss, 4)}${u.reliabilitas?.length ? `, dan pada peluang tinggi (${a(u.reliabilitas.at(-1).bin[0] * 100, 0)} sampai ${a(u.reliabilitas.at(-1).bin[1] * 100, 0)} persen, ${u.reliabilitas.at(-1).n} kasus) model meramal ${a(u.reliabilitas.at(-1).ramal * 100, 1)} persen padahal teramati ${a(u.reliabilitas.at(-1).amat * 100, 1)} persen` : ""} (nilai Brier ${a(u.brier, 3)} lawan ${a(u.brier_pembanding, 3)} pada uji, selisih ${unggul(u.brier, u.brier_pembanding)}${bu ? `; bootstrap ${fmt(bu.n_boot)} ulangan memberi selisih Brier ${a(bu.selisih_brier, 4)} dengan CI95 ${a(bu.ci95[0], 4)} sampai ${a(bu.ci95[1], 4)}, mencakup nol, jadi tidak berbeda nyata dari pembanding` : ", tidak berbeda nyata"}). Target susulan M 6 dan M (Mu - 1) kalah dari pembanding di validasi, sehingga tidak kami tampilkan. Tiap gempa utama baru dicatat ramalannya lalu dinilai 7 hari kemudian (prospektif, tidak pernah diubah).`) : ""}`,
      ["Rentangnya lebar karena rangkaian gempa Indonesia sangat beragam.", u?.n_test ? `Cacah susulan rata-rata terlalu tinggi (uji: harapan ${fmt(Math.round(u.n_test.harapan))}, teramati ${fmt(u.n_test.amat)}), prakiraan cenderung sedikit terlalu tinggi (rata-rata ${a((u.ramal_rata ?? 0) * 100, 0)}% lawan teramati ${a((u.frek_amat ?? 0) * 100, 0)}% pada uji).` : "",
       "Jam pertama tidak dimodelkan karena katalog tidak lengkap.", "Jenis magnitudo USGS campur.", `Jendela jarak terlalu sempit untuk gempa megathrust M 8 atau lebih.`, "Gempa dalam kawanan bisa tergolong susulan gempa sebelumnya dan tidak mendapat peluang sendiri.", "Peluang adalah perkiraan model, bukan peringatan resmi."]);
  }
  function tsunami() {
    if (typeof Tsunami === "undefined") return "";
    /* MENUNGGU-B: rumus waktu tempuh, tinggi indikatif, dan batimetri dari pengerja sim */
    return bab(0, "ombak", "Waktu tiba dan tinggi gelombang", "perkiraan model untuk gempa yang berpotensi menimbulkan tsunami",
      "Untuk gempa laut yang cukup besar dan dangkal, kami memperkirakan berapa menit gelombang tiba di pantai dan setinggi apa. Ini perkiraan model untuk simulasi. Status resmi tsunami hanya dari BMKG dan PTWC, tampil terpisah dan tidak pernah diubah oleh perhitungan kami.",
      `${ptg("<b>Waktu tempuh.</b> Gelombang merambat dengan kecepatan √(g h) di atas kedalaman laut h (g = 9,81 m/s²), dihitung sel demi sel pada peta kedalaman laut.")}
       ${ptg("<b>Syarat.</b> Hanya gempa di laut, dangkal, dan cukup besar yang diperhitungkan; di luar itu bagian ini tidak tampil.")}`,
      ["Perkiraan model, bukan peringatan resmi.", "Tinggi gelombang di pantai bersifat indikatif dan sangat bergantung pada bentuk pantai setempat."]);
  }
  function evakuasi() {
    if (typeof Tsunami === "undefined") return "";
    /* MENUNGGU-B: rute dan waktu evakuasi dari sim.js */
    return bab(0, "evak", "Evakuasi", "tempat tinggi terdekat dan jarak ke sana",
      "Pada fasilitas di pesisir rendah, kami memeriksa adakah tempat setinggi 20 meter atau lebih dalam 2 kilometer. Bila tidak ada, fasilitas itu ditandai tanpa jalur evakuasi vertikal yang dekat.",
      `${ptg("<b>Pesisir rendah.</b> Ketinggian tanah 10 m atau kurang dan jarak ke garis pantai 2 km atau kurang.")}${ptg("<b>Tanpa evakuasi.</b> Pesisir rendah dan tempat setinggi 20 m atau lebih terdekat lebih jauh dari 2 km.")}`,
      ["Ketinggian dari model elevasi global; bangunan bertingkat dan jalur nyata tidak diperiksa."]);
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
    const [M, MS, meta, bm, B, PL] = await Promise.all([j("data/model_guncangan.json"), j("data/model_susulan.json"), j("data/meta.json"), j("data/bahaya_meta.json"), typeof Bukti !== "undefined" ? Bukti.muat() : null, typeof Peluang !== "undefined" ? Peluang.muat("data/peluang.json") : null]);
    const bagian = [guncangan(M), susulan(MS), tsunami(), evakuasi(), bukti(B), paparan(), laporan(), typeof Peluang !== "undefined" ? Peluang.batasan(PL) : "", batas(), sumber(meta, bm)].filter(Boolean);
    let n = 0; el.innerHTML = `<div class="head"><div><h2>Metode &amp; data</h2><p>Cara tiap angka gempa dan tsunami dihitung, berikut batasnya.</p></div></div>
      ${bagian.map(h => h.replace(/<b>0\. /, `<b>${++n}. `)).join("")}`;
    el.querySelector("details.mt-sek")?.setAttribute("open", "");
  }
  return {render};
})();
