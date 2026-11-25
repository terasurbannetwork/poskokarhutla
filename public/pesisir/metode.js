"use strict";
/* Tab Metode: cara abrasi, rob, pasang surut, dan gelombang dihitung. Angka dibaca dari abrasi.json dan rob.json (S.abr, S.rob) supaya tidak berbeda dari pipeline.
   PB-54b (F-28, C22): tiap bab memakai kartu bersama inti/cerita.js (Cerita.metode; sumber data lewat Cerita._std; Galat model dari public/data/gerbang/pesisir.json).
   Cerita.metode membungkus tiap bab dengan <p>: isi blok ditulis sebagai span display:block, butir batasan dipisah <br>, tabel diisi lewat DOM sesudah kartu terpasang.
   Kepala kartu = nama seksi, anak judul ke title kepala; bab tanpa data dibuang. */
const Metode = (() => {
  const a = (x, d = 2) => x == null || isNaN(x) ? "–" : Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
  const blk = x => `<span style="display:block">${x}</span>`;
  const brs = L => L.filter(Boolean).join("<br>");
  const tabel = (kep, baris) => `<div class="tw"><table class="ex-tabel"><thead><tr>${kep.map(k => `<th>${k}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const T = {}; /* tabel yang diisi lewat DOM: kunci -> HTML */
  const tempat = (k, h) => (T[k] = h, `<span data-mt="${k}" style="display:block"></span>`);
  const kartu = (nama, sub, bab, o = {}) => Cerita.metode(nama, bab, {sumber: sub, ...o});

  /* ---- bab; tiap fungsi mengembalikan HTML atau "" ---- */
  const citra = m => !m ? "" : kartu("Citra Landsat", "Bahan tahunan untuk garis pantai", {
    singkatnya: `Tiap tahun kami mengambil citra Landsat 4 sampai 9 (USGS Collection 2 Level-2), membuang yang berawan, lalu menggabungkan sisanya jadi satu komposit ${esc(m.komposit)} per tahun.`,
    rincian: blk(`<b>Rentang.</b> ${m.tahun[0]} sampai ${m.tahun[1]}. Tahun berjalan tidak dipakai karena komposit musimnya timpang. Tahun tanpa adegan layak dilewati, jadi deret tiap transek bisa bolong.`)
      + blk("<b>Penyaringan.</b> Awan dan bayangan awan dibuang dengan band QA_PIXEL; adegan yang terlalu berawan ditolak. Landsat 7 sesudah Mei 2003 bergaris kosong (SLC-off), garis itu tertutup median beberapa adegan.")
      + blk("<b>Akses.</b> Microsoft Planetary Computer (token anonim); pembacaan COG dan proyeksi UTM lewat modul citra bersama repo."),
    batasan: brs(["Landsat 5 di Jawa bolong 2001 sampai 2006, sebagian tahun hanya dari Landsat 7.", "Resolusi 30 m; garis dicari sampai sebagian kecil piksel lewat interpolasi, bukan diukur sebesar itu."])});
  const garis = m => !m ? "" : kartu("Garis pantai dari MNDWI", "Memisahkan air dan darat", {
    singkatnya: "Air dipisah dari darat dengan indeks air termodifikasi MNDWI. Nilai ambang antara keduanya dihitung per tahun dengan metode Otsu, lalu dijepit supaya tidak melenceng.",
    rincian: blk(`<b>Indeks.</b> ${esc(m.indeks)}: MNDWI = (hijau - SWIR1) / (hijau + SWIR1).`)
      + blk(`<b>Ambang.</b> ${esc(m.ambang)}. Ambang nol seperti di DEA Coastlines salah membaca tambak sebagai laut di pantura, sehingga dipakai Otsu yang dijepit. Ambang per tahun dan per situs tersimpan di berkas data.`)
      + blk("<b>Garis.</b> Di sepanjang transek, garis adalah penyeberangan pertama dari air ke darat mulai dari ujung laut, dengan darat bersambung sedikitnya 60 m, dihitung subpiksel dengan interpolasi linear antar-sampel."),
    batasan: brs(["Tambak yang tanggulnya jebol terbaca laut, tambak utuh di belakang tanggul terbaca darat.", "Pulau mangrove atau tanggul lepas pantai lebih lebar dari 60 m terbaca sebagai garis pantai.", "Ambang dipilih sesudah melihat data Sayung, jadi Sayung bukan uji bebas untuk ambang."])});
  const transek = (m, A) => !m ? "" : kartu("Transek tetap", "Garis tegak lurus pantai tempat posisi diukur", {
    singkatnya: `Posisi pantai diukur di sepanjang transek yang letaknya tetap dari tahun ke tahun, jadi perubahan antartahun benar-benar dibandingkan di tempat yang sama. Saat ini ${fmt(A?.transek?.length ?? 0)} transek di ${fmt(A?.situs?.length ?? 0)} situs pantura Jawa.`,
    rincian: blk(`<b>Letak.</b> Satu transek tiap ${fmt(m.jarak_transek_m)} m, tegak lurus garis pantai OpenStreetMap, ${fmt(m.darat_m / 1000)} km ke darat dan ${fmt(m.laut_m / 1000)} km ke laut, sampel tiap ${fmt(m.langkah_m)} m. OpenStreetMap hanya dipakai saat situs pertama kali dibuat; sesudahnya transek dibaca dari keluaran lama supaya ID dan letaknya tidak berubah diam-diam.`)
      + blk("<b>Situs.</b> " + (A?.situs || []).map(s => `${esc(s.nama)} (${esc(s.kab)}), ${fmt(s.transek)} transek`).join("; ") + "."),
    batasan: brs(["Situs berupa kotak yang ditentukan tangan, bukan seluruh pesisir Indonesia.", "Garis dasar OpenStreetMap bisa meleset dari pantai nyata; jarak diukur dari garis dasar itu."])});
  /* laju abrasi belum punya uji lapangan; pil mengikuti gerbang prospektif abrasi (gagal-tertutup bila berkas tak terbaca) */
  const laju = (m, A, GB) => !m ? "" : kartu("Laju perubahan", "Dari deret posisi ke meter per tahun", {
    singkatnya: "Posisi tahunan di tiap transek diregresi linear untuk mendapat laju meter per tahun. Tiap laju selalu tampil bersama selang 95 persen dan tingkat keyakinan; bila selang memuat nol, ditulis tidak nyata.",
    rincian: blk(`<b>Regresi.</b> ${esc(m.laju)}. Rujukan: ${esc(m.rujukan)}.`)
      + blk("<b>Keyakinan.</b> Tinggi: sedikitnya 15 tahun terbaca, selang tidak memuat nol, R2 sedikitnya 0,5. Sedang: sedikitnya 8 tahun dan selang tidak memuat nol. Turun satu tingkat bila membuang pencilan membalik arah atau baru membuat laju nyata. Rendah ditulis tidak nyata.")
      + blk("<b>Lompatan.</b> Lompatan lebih dari 300 m dalam satu tahun, di mana pun dalam deret, menandai transek sebagai tinjau. Bila garis kembali dalam 1 sampai 2 tahun ke dalam 40 persen dari posisi semula, tahun itu dibuang (bolak-balik); bila tetap bergeser, tetap dipakai tetapi perlu cek citra. Transek tinjau tidak dipakai untuk judul atau peringkat. Ambang 300 m dan 40 persen adalah pilihan kasar, bukan hasil kalibrasi.")
      + blk("<b>Gangguan buatan.</b> Tanggul Tol Semarang-Demak dan reklamasi Patimban memotong deret di tahun pembangunannya supaya tidak terbaca sebagai pantai tumbuh.")
      + blk("<b>Uji ke depan.</b> Tiap tahun perubahan garis pantai setahun ke depan dibekukan lebih dulu, lalu dibandingkan dengan citra tahun berikutnya dan dengan tebakan persistensi. Hasilnya ada di kartu Galat model."),
    batasan: brs(["Garis tahun berurutan saling terkait (pasang, tambak, awan yang mirip); selang 95 persen sudah dilebarkan untuk autokorelasi AR(1) tetapi tetap perkiraan statistik.", "Di Sayung dan Semarang-Demak, garis mundur adalah gabungan abrasi dan penurunan muka tanah; citra tidak bisa memisahkannya.", "Belum ada pengukuran lapangan yang mencocokkan laju abrasi."])},
    {peta: GB, keluaran: "abrasi_prakiraan_setahun"});
  const rob = R => !R?.aturan ? "" : kartu("Rob, pasang surut, dan gelombang", "Status harian titik pesisir", {
    singkatnya: "Status rob dihitung dari muka laut model per titik, dibandingkan dengan persentil iklim titik itu sendiri. Pasang surut dan peringatan gelombang ditampilkan apa adanya dari BMKG Maritim; gelombang model dari Open-Meteo Marine.",
    rincian: blk(`<b>Ambang rob.</b> Waspada: ${esc(R.aturan.waspada)}. Siaga: ${esc(R.aturan.siaga)}. Awas: ${esc(R.aturan.awas)}. Gabungan: ${esc(R.aturan.gabung)}. Titik tanpa arsip persentil ditulis tanpa ambang, bukan normal.`)
      + blk(`<b>Datum.</b> ${esc(R.aturan.datum)}.`)
      + blk("<b>Pasang surut.</b> Prediksi astronomis BMKG Maritim terhadap MSL; puncak harian per stasiun, dengan p50, p75, dan p90 dari puncak harian stasiun itu sendiri.")
      + blk("<b>Gelombang.</b> Tinggi tertinggi sehari di titik pelabuhan dan pesisir dari model Open-Meteo, kelas mengikuti ambang BMKG Maritim. Peringatan BMKG digabung per provinsi untuk kelas tinggi sampai ekstrem; kelas sedang tidak dihitung."),
    batasan: brs(["Muka laut model bukan datum lokal dan tidak memasukkan penurunan tanah atau tanggul.", "Pasang surut, rob, dan gelombang ditampilkan terpisah; tidak ada skor gabungan yang diuji."])});
  const uji = (R, K) => { const v = R?.validasi; if (!v?.kejadian_diuji) return ""; const p = v.persentil || {}, baris = Object.entries(p).map(([k, x]) => [k, a(x.pod, 2), a(x.pofd, 2), a(x.pss, 2), fmt(x.hari_terpicu)]);
    return kartu("Uji terhadap kejadian rob", "Ambang dibandingkan kejadian yang tercatat", {
      singkatnya: `Ambang Waspada diuji mundur terhadap ${fmt(v.kejadian_diuji)} kejadian DIBI di ${fmt(v.kab_berkejadian)} kabupaten dan kota (${esc(v.periode?.[0] || "")} sampai ${esc(v.periode?.[1] || "")}). Persentil 95 dipertahankan.`,
      rincian: blk("Kemampuan membedakan (PSS) persentil 90 sampai 97 hampir sama, selisihnya kurang dari satu galat baku. Persentil 90 menggandakan jumlah hari terpicu, jadi persentil 95 dipilih.")
        + tempat("uji", tabel(["Persentil", "POD", "POFD", "PSS", "Hari terpicu"], baris))
        + (K?.fase ? blk(`<b>Fase bulan.</b> ${fmt(K.n_kejadian)} kejadian rob dari ${fmt(K.n_kab)} kabupaten dan kota (Pusdalops, logbook, DIBI). Porsi kejadian dalam 2 hari dari bulan baru atau purnama ${a(K.fase.porsi_dalam_2_hari * 100, 0)} persen, lawan ${a(K.fase.porsi_acak * 100, 0)} persen pada pengacakan. Sinyal ini lemah dan ditentukan beberapa episode, jadi tidak ditampilkan sebagai temuan.`) : ""),
      batasan: brs(["Sebagian besar hari terpicu tidak bertepatan dengan kejadian tercatat, dan DIBI tidak mencatat semua rob."])}); };
  /* daftar sumber bukan kartu metode: kartu standar tanpa bab dan tanpa isian Batasan */
  const sumber = A => Cerita._std("Sumber data", tabel(["Data", "Sumber"], [
    ["Garis pantai dan laju abrasi", "Landsat Collection 2 Level-2 (USGS) lewat Microsoft Planetary Computer; garis dasar transek OpenStreetMap (ODbL); deteksi Centurisk97"],
    ["Rob", "Open-Meteo Marine (MeteoFrance SMOC), muka laut model; hitungan Centurisk97"],
    ["Peringatan rob dan gelombang", "BMKG Maritim, apa adanya"], ["Pasang surut", "BMKG Maritim, prediksi astronomis terhadap MSL"],
    ["Gelombang model", "Open-Meteo Marine"], ["Kejadian rob", "DIBI BNPB, logbook Pusdalops BNPB, rekap Pusdalops 2023 sampai 2024"]]) + (A?.sumber ? `<p>${esc(A.sumber)}</p>` : ""));
  const batas = A => kartu("Batas model", "Apa yang tidak bisa dikatakan halaman ini", {
    singkatnya: "Garis pantai belum dikoreksi pasang surut. Pantura bertunggang pasang sekitar 1 m dengan pantai landai berlumpur, sehingga garis satu tahun bisa bergeser puluhan sampai ratusan meter menurut pasang saat satelit lewat. Laju jangka panjang lebih bisa dipegang daripada posisi satu tahun.",
    batasan: brs(["Angka laju adalah perkiraan statistik dari citra satelit, bukan pengukuran lapangan dan bukan pernyataan resmi.", ...(A?.catatan || []).filter(c => !/^Belum dikoreksi pasang/.test(c)).map(esc)])});

  async function render() {
    const el = $("#metode"); if (!el || el.dataset.ok) return; el.dataset.ok = 1;
    const A = S.abr, m = A?.metode, R = S.rob;
    const [K, GB] = await Promise.all([fetch("data/rob_kejadian.json").then(r => r.ok ? r.json() : null).catch(() => null), typeof Gerbang !== "undefined" ? Gerbang.muat("pesisir") : {}]);
    const galat = Cerita.galat(GB, {keluaran: ["abrasi_prakiraan_setahun"], nama: {abrasi_prakiraan_setahun: "Perubahan garis pantai setahun ke depan"}, sumber: "public/data/gerbang/pesisir.json"});
    el.innerHTML = [citra(m), garis(m), transek(m, A), laju(m, A, GB), galat, rob(R), uji(R, K), sumber(A), batas(A)].filter(Boolean).join("");
    el.querySelectorAll("[data-mt]").forEach(e => e.innerHTML = T[e.dataset.mt] || "");
  }
  return {render};
})();
