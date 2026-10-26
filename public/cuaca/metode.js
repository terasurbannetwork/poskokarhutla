"use strict";
/* ================================================================ metode: sumber, ambang, batasan (tab tersembunyi dari menu, A24) */
const Metode = {
  tabel: (kep, baris) => `<div class="tw"><table><thead><tr>${kep.map(k => `<th>${k}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
  /* kartu verifikasi: peringatan BMKG dan prakiraan kita dicocokkan dengan kejadian DIBI BNPB. Hilang bila cuaca_verifikasi.json tak ada */
  verifikasi() {
    const V = S.ver; if (!V) return ""; const pc = v => v == null ? "–" : fmt(Math.round(v * 1000) / 10) + "%", n = v => v == null ? "–" : fmt(v);
    const baris = (nama, o) => o ? [nama, n(o.a), n(o.b), n(o.c), pc(o.pod), pc(o.far), pc(o.csi)] : null;
    const R = [baris("Peringatan BMKG", V.bmkg?.nasional), ...Object.entries(V.kita?.lead || {}).map(([l, o]) => baris(`Prakiraan kita, ${l} hari sebelumnya`, o))].filter(Boolean); if (!R.length) return "";
    const cat = [V.bmkg?.catatan, V.kita?.catatan].filter(Boolean).map(c => `<li>${esc(c)}</li>`).join("");
    const isi = this.tabel(["Yang dinilai", "Tepat", "Alarm palsu", "Meleset", "POD", "FAR", "CSI"], R)
      + `<ul class="mt"><li>Penilaian dicocokkan per provinsi dan tanggal. Prakiraan kita dihitung untuk 1, 2, dan 3 hari sebelumnya, dengan hujan sehari 50 mm atau lebih sebagai alarm. Kejadian pembanding hanya yang dilaporkan, jadi jumlah meleset cenderung terlalu kecil bila laporan telat, dan terlalu besar bila arsip peringatan baru dimulai.</li><li>Tepat = ada peringatan dan ada kejadian. Alarm palsu = ada peringatan, tak ada kejadian. Meleset = ada kejadian, tak ada peringatan.</li><li>POD = tepat / (tepat + meleset). FAR = alarm palsu / (tepat + alarm palsu). CSI = tepat / (tepat + alarm palsu + meleset).</li>${V.bmkg?.kejadian ? `<li>Kejadian pembanding: ${esc(V.bmkg.kejadian)}.</li>` : ""}${cat}</ul>`;
    return `<div data-ex="Verifikasi">${Kartu.ex("Verifikasi", "", "", isi, "Sumber: BMKG, DIBI BNPB, Open-Meteo, dibuat " + jamWIB(V.dibuat)).replace('<span class="ex-ey"></span>', "")}</div>`; },
  async render() {
    const PL = typeof Peluang !== "undefined" ? await Peluang.muat("../banjir/data/cuaca_peluang.json") : null, A = S.meta.ambang, sumber = this.tabel(["Data", "Sumber", "Cara tampil"], [
      ["Peringatan nowcast", "BMKG (CAP)", "Apa adanya, berlabel BMKG dan jam terbit; hilang saat masa berlakunya lewat"],
      ["Peringatan gelombang", "BMKG Maritim", "Kelas dan perairan dari BMKG, digabung per provinsi"],
      ["Hujan dan embusan", "Open-Meteo, kisi 0,25 derajat", "Prakiraan per sel, 10 hari"],
      ["Peluang hujan lebat", "ECMWF IFS 51 anggota via Open-Meteo", "Satu titik per kotak 1 derajat"],
      ["Riwayat harian (Tren)", "Open-Meteo, analisis dan prakiraan model", "Satu titik per hari, tumbuh tiap jalan; hari lampau = analisis model, bukan alat ukur"],
      ["Penduduk di area hujan lebat (Dampak)", "WorldPop 2026 dan Open-Meteo", "Jiwa di kotak prakiraan 50 mm atau lebih; prakiraan, bukan jiwa yang sudah terdampak"],
      ["Kejadian dan korban tahunan (Tren, Dampak)", "BNPB dan DIBI BNPB", "Hanya angka yang tercatat"],
      ["Risiko cuaca ekstrem dan sarana kelas bahaya tinggi (Dampak)", "InaRISK BNPB: indeks risiko IRBI per kabupaten dan kota (2015 sampai 2025) dan sarana per kelas bahaya (infra-risk)", "Indeks risiko adalah penilaian potensi, bukan catatan kejadian. Skala 2025 berbeda dari 2015 sampai 2024, jadi perubahan dihitung 2015 ke 2024. <span id='mtRisiko'>Data InaRISK diambil berkala</span>; lisensi data tidak tertulis, sumber selalu disebut"],
      ["Status kecamatan 72 jam: hujan", "Open-Meteo, ambang kelas BMKG (50, 100, 150 mm per hari)", "Normal, Waspada, Siaga, Awas per kecamatan, tiga hari; dihitung dari prakiraan, bukan pernyataan resmi"],
      ["Status kecamatan 72 jam: gelombang", "Open-Meteo Marine, ambang kelas BMKG Maritim (2,5; 4; 6 m)", "Tinggi gelombang tertinggi sehari di titik pesisir terdekat"],
      ["Status kecamatan 72 jam: embusan", "Open-Meteo, ambang hipotesis Centurisk97 (54, 72, 90 km/jam)", "Belum dikunci uji balik"],
      ["Peluang ansambel (hipotesis)", "ECMWF IFS ansambel via Open-Meteo", "Waspada bila peluang 50 mm atau lebih sebesar 40% atau lebih; Siaga bila peluang 100 mm atau lebih 40% atau lebih; Awas bila 70% atau lebih; hanya titik ansambel sejauh 80 km atau kurang dari kecamatan"],
      ["Titik gelombang", "Open-Meteo Marine", "Tinggi gelombang tertinggi sehari per titik pesisir; model, bukan peringatan BMKG Maritim"],
      ["Siklon tropis", "JTWC dan GDACS", "Posisi amatan dan prakiraan apa adanya; tanpa siklon aktif kartunya tidak ada"],
      ["Pelabuhan dan bandara", "Data terbuka (OpenStreetMap), Open-Meteo", "Sarana yang berstatus Waspada atau lebih pada titiknya"],
      ["Berita", "Google News RSS", "Judul dan cuplikan; diperbarui tangan, jam panen tertulis di kartu"]]);
    const ambang = this.tabel(["Bahaya", "Tingkat 1", "Tingkat 2", "Tingkat 3"], [
      ["Hujan harian (mm)", ...A.hujan.map((v, i) => `${v} ${["lebat", "sangat lebat", "ekstrem"][i]}`)],
      ["Embusan (km/jam)", ...A.angin_kmj.map((v, i) => `${v} ${["waspada", "siaga", "awas"][i]}`)]]);
    const batas = `<ul class="mt"><li>Deteksi Centurisk97 dari prakiraan model, bukan pengukuran; sel model 0,25 derajat lebih luas dari puting beliung dan sel badai.</li><li>Ambang adalah hipotesis awal dan belum dikunci uji balik.</li><li>Badai guntur tidak ditampilkan: indeks angkat tidak ada di sumber.</li><li>Kuota: Open-Meteo gratis dibatasi 10.000 panggilan per hari dan dibagi dengan modul banjir; kalau satu jalan gagal, berkas terakhir tetap tampil dengan jam pembuatannya.</li><li>Peringatan BMKG tidak dipetakan ulang ke tingkat Centurisk97.</li><li>Berkas peringatan BMKG terbit berkala dan nowcast hanya berlaku 2 sampai 3 jam: tanpa peringatan di layar berarti tidak ada yang berlaku pada data terbitan terakhir, bukan pernyataan BMKG bahwa cuaca aman. Peringatan terbaru ada di bmkg.go.id.</li></ul>`;
    const K = S.kec?.ambang, st = !K ? "" : this.tabel(["Bahaya", "Waspada", "Siaga", "Awas"], [
      ["Hujan harian (mm)", ...K.hujan_mm], ["Embusan (km/jam)", ...K.angin_kmj], ["Gelombang (m)", ...K.hs_m.map(v => fmt(v))]]);
    const lain = [["Sumber data", sumber, "Sumber: BMKG, Open-Meteo, ECMWF"], ["Ambang", ambang, "Sumber: kelas hujan BMKG"], ...(st ? [["Ambang status 72 jam", st, "Sumber: kelas hujan BMKG, Centurisk97"]] : []), ["Batasan", batas, "Sumber: BMKG, Open-Meteo, ECMWF"]]
      .map(([j, isi, s]) => `<div data-ex="${j}">${Kartu.ex(j, "", "", isi, s).replace('<span class="ex-ey"></span>', "")}</div>`).join("");
    const sim = `<ul class="mt"><li>Simulasi adalah prakiraan nyata yang digerakkan per jam, bukan model fisik badai: ia tidak bisa menghasilkan puting beliung atau sel petir yang tidak ada di prakiraan.</li>
      <li>Angin siklon memakai profil Holland (1980): V = Vmaks x akar((Rm/r)^B x e^(1 - (Rm/r)^B)) dengan B = 1,5. Vmaks dari lintasan JTWC, Rm (radius angin maksimum) dari pengaturan di layar karena tidak ada di berkas. Angin berputar melawan jarum jam di utara ekuator, searah di selatan, dan masuk 20 derajat ke pusat (asumsi).</li>
      <li>Gelombang di bawah siklon memakai Pierson dan Moskowitz (1964), Hs = 0,21 U kuadrat / g. Ini batas atas laut berkembang penuh, jadi perkiraan atas, bukan prakiraan.</li>
      <li>Pelabuhan: terganggu bila Hs 1,5 m atau lebih, atau angin 16 kt atau lebih; tutup bila Hs 2,5 m atau lebih, atau angin 21 kt atau lebih. Bandara: terganggu bila embusan 54 km/jam atau lebih, atau hujan 10 mm/jam atau lebih; tutup bila embusan 72 km/jam atau lebih. Semua ini hipotesis berdasar kriteria risiko BMKG, bukan keputusan syahbandar atau otoritas bandara.</li></ul>`;
    const pel = PL ? `<div data-ex="Peluang">${Kartu.ex("Peluang hujan ekstrem", "", "", Peluang.batasan(PL, {judul: "Peluang dan batasnya"}).replace("<b>0. ", "<b>"), "Sumber: ECMWF, Open-Meteo").replace('<span class="ex-ey"></span>', "")}</div>` : "";
    $("#metode").innerHTML = lain + pel + `<div data-ex="Simulasi" id="simulasi">${Kartu.ex("Simulasi", "", "", sim, "Sumber: Holland (1980), Pierson dan Moskowitz (1964), BMKG, Centurisk97").replace('<span class="ex-ey"></span>', "")}</div>` + this.verifikasi();
    (typeof Dampak !== "undefined" ? Dampak.dibuat() : Promise.resolve(null)).then(d => { const e = $("#mtRisiko"); if (d && e) e.textContent = "Data InaRISK dibuat " + tglPendek(d.slice(0, 10)); });
  },
};
