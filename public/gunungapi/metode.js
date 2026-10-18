"use strict";
/* Metode dan data gunung api: dari mana angkanya, arti tiap level resmi (kalimat PVMBG apa adanya), dan apa yang sengaja tidak ditampilkan. */
const Metode = {
  /* arti level: kutipan halaman Tingkat Aktivitas MAGMA Indonesia, 16 Okt 2026 */
  ARTI: {4: "Hasil pengamatan visual dan instrumental teramati mengalami peningkatan aktivitas yang semakin nyata atau gunung api mengalami erupsi",
    3: "Hasil pengamatan visual dan instrumental memperlihatkan peningkatan aktivitas yang semakin nyata atau gunung api mengalami erupsi",
    2: "Hasil pengamatan visual dan instrumental mulai memperlihatkan peningkatan aktivitas. Pada beberapa gunung api dapat terjadi erupsi",
    1: "Hasil pengamatan visual dan instrumental fluktuatif, tetapi tidak memperlihatkan peningkatan aktivitas yang signifikan"},
  daftar: (judul, baris, sumber, ey) => Kartu.ex(judul, "", "", `<ul class="mt">${baris.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join("")}</ul>`, sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`),
  async render() {
    const a = await Data.abu(), P = a?.parameter || {}, UB = a?.uji_balik, UT = a?.uji_balik_tipis, amb = P.ambang || {}, kb = P.kelas_butir || [];
    const kh = P.kh_m2s ?? 1000, lepas = P.durasi_lepas_jam ?? 3, nP = P.n_partikel ?? 1500;
    const butir = kb.length ? kb.map(k => `${fmt(Math.round(k.massa * 100))}% jatuh ${fmt(k.kec_jatuh_ms)} m/dtk`).join(", ") : "40% jatuh 0,008 m/dtk, 30% 0,07 m/dtk, 20% 0,5 m/dtk, 10% 1,5 m/dtk";
    const uji = (u, nama) => { if (!u?.n) return ""; const p = pAcak(u.n, u.persen_dalam_45deg);
      return `${nama}: ${fmt(u.n)} kejadian, ${fmt(u.persen_dalam_45deg)}% arahnya dalam 45° dari laporan PVMBG, median selisih ${fmt(u.median_selisih_deg)}°; pembanding acak ${fmt(ACAK_45 * 100)}%, peluang kebetulan P ${fmtP(p)}, jadi ${p < .05 ? "di atas acak" : "tidak berbeda dari acak"}`; };
    $("#metode").innerHTML = [
      this.daftar("Level gunung api memakai status resmi PVMBG tanpa diubah", [4, 3, 2, 1].map(l => [pilLv(l), esc(this.ARTI[l])]), "Sumber: MAGMA Indonesia, PVMBG (Badan Geologi, KESDM)", "Level"),
      this.daftar("Angka dan peta diambil dari halaman publik MAGMA Indonesia", [
        ["Level dan nama gunung", "Halaman Tingkat Aktivitas Gunung Api, dibaca ulang tiap kali data diperbarui. Level tampil persis seperti yang diterbitkan PVMBG."],
        ["Radius rekomendasi", "Angka kilometer pada kalimat radius di laporan aktivitas harian gunung berstatus Level II ke atas. Jarak sektor (aliran awan panas dan lahar) dicatat terpisah dan tidak digambar sebagai lingkaran."],
        ["Erupsi terbaru", "Halaman Informasi Letusan MAGMA: waktu, gunung, dan tinggi kolom abu bila disebut."],
        ["Perubahan level", "Pantau Bencana membandingkan level tiap pembaruan dengan pembaruan sebelumnya. Catatannya dimulai sejak halaman ini berjalan, bukan riwayat PVMBG."],
        ["Jiwa dalam radius", "Penduduk WorldPop 2026 (kisi 25 km) dikalikan bagian luas tiap sel yang masuk lingkaran radius. Kisinya jauh lebih kasar daripada radius, jadi angkanya perkiraan orde besar, bukan hitungan per desa."]], "Sumber: MAGMA Indonesia, WorldPop", "Sumber data"),
      this.daftar("Jejak abu adalah skenario Pantau Bencana, bukan advisory VAAC", [
        ["Skenario", "Gunung Level II ke atas diandaikan meletus sekarang. Tinggi kolom dari letusan MAGMA 48 jam terakhir bila ada; bila tidak, asumsi per level: Level II 1 km, Level III 2 km, Level IV 5 km di atas puncak."],
        ["Model Lagrangian", `${fmt(nP)} partikel dilepas sepanjang kolom (profil Suzuki A = 4, k = 5) selama ${fmt(lepas)} jam, digeser angin per jam ECMWF IFS 0,25° di lapisan 1000 sampai 200 hPa dari Open-Meteo, langkah 15 menit, ditambah gerak acak horizontal dengan K_h = ${fmt(kh)} m²/dtk. Bilangan acak tetap (seed) supaya hasilnya bisa diulang.`],
        ["Massa abu", `MER = 2.500 × (H / 2)^(1 / 0,241) kg/dtk dengan H tinggi kolom di atas puncak dalam km (Mastin dkk. 2009). Massa total = MER × lama pelepasan; seluruhnya dianggap abu halus yang terbawa, tanpa penggumpalan. Empat kelas butir: ${butir}.`],
        ["Ambang penerbangan", `Sel ${fmt(amb.sel_deg ?? 0.1)}° masuk jejak bila konsentrasi di awan setebal ${fmt((amb.tebal_awan_m ?? 2000) / 1000)} km mencapai ${fmt(amb.konsentrasi_mg_m3 ?? 2)} mg/m³ (batas bawah kontaminasi sedang pedoman ICAO/CAA): jumlah partikel × massa lepas / n ≥ konsentrasi × tebal × luas sel.`],
        ["Jejak kosong", "Jejak kosong berarti abu di bawah ambang penerbangan, bukan tanpa abu: kolom 1 km atau lebih rendah hampir tak pernah menghasilkan sel yang lolos, padahal hujan abu di sekitar kawah tetap mungkin. Sebaran mentah tanpa ambang hanya dipakai untuk animasi di Simulasi, bukan sebagai area dampak."],
        ["Bandara", "Bandara dari OurAirports; bandara masuk jalur bila ada partikel di atas ambang dalam 25 km darinya, dan jam tiba = jam pertama itu."],
        ["Uji balik arah", [uji(UB, "Berambang"), uji(UT, "Tanpa ambang (sebaran mentah)")].filter(Boolean).join(". ") + `. Pembanding laporan VONA PVMBG (8 mata angin) dengan angin historis Open-Meteo, ${esc(UB?.periode || "")}. Sampel kecil dan hanya arah yang diuji; jangkauan belum bisa diuji karena VONA tanpa jarak dan arsip VAAC Darwin tidak terbuka.`]].filter(r => r[1] && !/^\. /.test(r[1])), "Sumber: Open-Meteo, MAGMA Indonesia (VONA), OurAirports, Mastin dkk. 2009", "Model abu"),
      this.daftar("Lahar dan awan panas di Simulasi adalah ilustrasi bahaya", [
        ["Lahar", "LAHARZ (Iverson dkk. 1998): luas penampang A = 0,05 × V^(2/3) dan luas sebaran B = 200 × V^(2/3), diisi di lembah dari DEM terrarium zoom 12 (piksel sekitar 38 m). Volume dibagi: separuh ke lembah dari dasar kawah, sisanya merata ke lembah lain. Waktu tempuh hanya ilustrasi: 6 m/dtk, mulai 1 jam sesudah hujan memicu."],
        ["Awan panas", "Kerucut energi H/L dari puncak (pilihan 0,2 sampai 0,35), dibatasi lembah, tebal 15 m, 20 m/dtk. Lembah sempit di bawah sekitar 80 m tak terpisah di DEM ini; kawah, kubah, dan tanggul baru tidak terbaca."],
        ["Hujan abu di desa", "Angka relatif (100% = titik terbanyak), bukan milimeter, tanpa hujan, gedung, atau abu yang terangkat lagi."]], "Sumber: Iverson dkk. 1998, DEM terrarium (Mapzen, NASA SRTM, USGS)", "Simulasi"),
      this.daftar("Paparan penduduk, sekolah, tambang, dan evakuasi", [
        ["Zona KRB", "Kawasan Rawan Bencana III, II, I dari PVMBG edisi 2018 (geoportal ESDM, terbuka tanpa login). Bila suatu gunung tak punya poligon KRB, zonanya diganti proksi dan ditulis sebagai proksi."],
        ["Penduduk", "WorldPop R2025A 2026 constrained, kisi 1 km: jumlah piksel yang pusatnya jatuh di zona atau cincin. Galat tepi sekitar 1 km, jadi orde besar. Per desa: tiap piksel dialokasikan ke desa OpenStreetMap terdekat (paling jauh 3 km), perkiraan kasar, bukan penduduk administratif."],
        ["Desa, sekolah, faskes", "OpenStreetMap lewat Overpass dalam 20 km dari kawah (lisensi ODbL). Yang belum terpetakan di OSM tidak terhitung."],
        ["Izin tambang", "Wilayah Izin Usaha Pertambangan (WIUP) dari geoportal ESDM, hanya badan usaha. Zonanya yang tertinggi dari titik pusat dan simpul poligon."],
        ["Evakuasi", "Dijkstra berganda di jaringan jalan OSM (motorway sampai residential) dari titik aman: jalan tersier ke atas di luar KRB III dan II dan di luar radius rekomendasi ditambah 2 km. Kecepatan per kelas jalan: 50, 40, 35, 30, 25, 18, dan 15 km/jam. Hasilnya waktu tempuh arus bebas, tanpa antrean evakuasi massal, dan di tampilan hanya desa KRB III dan II yang dihitung. Titik kumpul bertanda OSM (assembly point atau shelter) diutamakan bila selisihnya tak lebih dari 10 menit."],
        ["Citra", "Sentinel-2 (Copernicus/ESA) bebas awan terbaik sebelum dan sesudah kejadian besar yang tercatat."]], "Sumber: ESDM, WorldPop, OpenStreetMap, Copernicus", "Paparan"),
      this.daftar("Batas model dan yang sengaja tidak dilakukan", [
        ["Bukan prakiraan letusan", "Pantau Bencana tidak meramal letusan dan tidak menentukan level sendiri. Untuk keputusan, ikuti rekomendasi PVMBG dan BPBD setempat; Level I Normal bukan jaminan tidak ada bahaya."],
        ["Bukan informasi penerbangan", "Informasi abu vulkanik untuk penerbangan (VONA, VAAC) tetap bersumber dari PVMBG dan BMKG."],
        ["Angin dan jarak", "Angin dari prakiraan, bukan pengukuran; satu skenario kolom tetap selama pelepasan. Jarak jangkauan belum teruji."],
        ["Data tidak lengkap", "Tanpa data zona, desa, atau rute untuk suatu gunung, bagian itu dibuang, bukan ditulis kosong. Nol di OSM bukan bukti tidak ada."]], "Sumber: PVMBG, Badan Geologi", "Batas"),
    ].join(""); },
};
