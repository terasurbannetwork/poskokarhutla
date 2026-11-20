"use strict";
/* Tab Metode: cara abrasi, rob, pasang surut, dan gelombang dihitung. Angka dibaca dari abrasi.json dan rob.json (S.abr, S.rob) supaya tidak berbeda dari pipeline.
   Pola dan gaya dari public/gempa/metode.js dan public/inti/metode.css. Bab tanpa isi disembunyikan. */
const Metode = (() => {
  const IK = {citra: '<path d="M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>', garis: '<path d="M3 17c4-8 7 2 11-5s5-3 7-6"/><path d="M3 21h18"/>', transek: '<path d="M4 20 20 4M4 4l4 4M10 10l4 4M16 16l4 4"/>', laju: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    ombak: '<path d="M2 12c2.5-6 4.5-6 7 0s4.5 6 7 0 3.5-4 6-3"/><path d="M2 19h20"/>', uji: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>', sumber: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>', batas: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>'};
  const ik = n => `<svg class="mt-ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[n] || ""}</svg>`;
  const a = (x, d = 2) => x == null || isNaN(x) ? "–" : Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
  const li = L => `<ul>${L.filter(Boolean).map(x => `<li><span>${x}</span></li>`).join("")}</ul>`;
  const ptg = x => `<p>${x}</p>`;
  const bab = (ikon, judul, sub, singkat, teknis, batas) => `<details class="mt-sek"><summary><span class="mt-nom">${ik(ikon)}</span><span class="mt-jd"><b>0. ${judul}</b><small>${sub}</small></span></summary>
    <div class="mt-isi"><div class="mt-singkat"><span class="mt-lbl">Singkatnya</span><p>${singkat}</p></div>
      ${teknis ? `<details class="mt-tek"><summary>Rumus, konstanta, dan sumber</summary><div class="mt-tekisi">${teknis}</div></details>` : ""}
      ${batas && batas.length ? `<div class="mt-batas"><span class="mt-lbl">Batasan</span>${li(batas)}</div>` : ""}</div></details>`;
  const tabel = (kep, baris) => `<div class="tw"><table><thead><tr>${kep.map(k => `<th>${k}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

  /* ---- bab; tiap fungsi mengembalikan HTML atau "" ---- */
  const citra = m => !m ? "" : bab("citra", "Citra Landsat", "bahan tahunan untuk garis pantai",
    `Tiap tahun kami mengambil citra Landsat 4 sampai 9 (USGS Collection 2 Level-2), membuang yang berawan, lalu menggabungkan sisanya jadi satu komposit ${esc(m.komposit)} per tahun.`,
    `${ptg(`<b>Rentang.</b> ${m.tahun[0]} sampai ${m.tahun[1]}. Tahun berjalan tidak dipakai karena komposit musimnya timpang. Tahun tanpa adegan layak dilewati, jadi deret tiap transek bisa bolong.`)}
     ${ptg("<b>Penyaringan.</b> Awan dan bayangan awan dibuang dengan band QA_PIXEL; adegan yang terlalu berawan ditolak. Landsat 7 sesudah Mei 2003 bergaris kosong (SLC-off), garis itu tertutup median beberapa adegan.")}
     ${ptg("<b>Akses.</b> Microsoft Planetary Computer (token anonim); pembacaan COG dan proyeksi UTM lewat modul citra bersama repo.")}`,
    ["Landsat 5 di Jawa bolong 2001 sampai 2006, sebagian tahun hanya dari Landsat 7.", "Resolusi 30 m; garis dicari sampai sebagian kecil piksel lewat interpolasi, bukan diukur sebesar itu."]);
  const garis = m => !m ? "" : bab("garis", "Garis pantai dari MNDWI", "memisahkan air dan darat",
    "Air dipisah dari darat dengan indeks air termodifikasi MNDWI. Nilai ambang antara keduanya dihitung per tahun dengan metode Otsu, lalu dijepit supaya tidak melenceng.",
    `${ptg(`<b>Indeks.</b> ${esc(m.indeks)}: MNDWI = (hijau - SWIR1) / (hijau + SWIR1).`)}
     ${ptg(`<b>Ambang.</b> ${esc(m.ambang)}. Ambang nol seperti di DEA Coastlines salah membaca tambak sebagai laut di pantura, sehingga dipakai Otsu yang dijepit. Ambang per tahun dan per situs tersimpan di berkas data.`)}
     ${ptg("<b>Garis.</b> Di sepanjang transek, garis adalah penyeberangan pertama dari air ke darat mulai dari ujung laut, dengan darat bersambung sedikitnya 60 m, dihitung subpiksel dengan interpolasi linear antar-sampel.")}`,
    ["Tambak yang tanggulnya jebol terbaca laut, tambak utuh di belakang tanggul terbaca darat.", "Pulau mangrove atau tanggul lepas pantai lebih lebar dari 60 m terbaca sebagai garis pantai.", "Ambang dipilih sesudah melihat data Sayung, jadi Sayung bukan uji bebas untuk ambang."]);
  const transek = (m, A) => !m ? "" : bab("transek", "Transek tetap", "garis tegak lurus pantai tempat posisi diukur",
    `Posisi pantai diukur di sepanjang transek yang letaknya tetap dari tahun ke tahun, jadi perubahan antartahun benar-benar dibandingkan di tempat yang sama. Saat ini ${fmt(A?.transek?.length ?? 0)} transek di ${fmt(A?.situs?.length ?? 0)} situs pantura Jawa.`,
    `${ptg(`<b>Letak.</b> Satu transek tiap ${fmt(m.jarak_transek_m)} m, tegak lurus garis pantai OpenStreetMap, ${fmt(m.darat_m / 1000)} km ke darat dan ${fmt(m.laut_m / 1000)} km ke laut, sampel tiap ${fmt(m.langkah_m)} m. OpenStreetMap hanya dipakai saat situs pertama kali dibuat; sesudahnya transek dibaca dari keluaran lama supaya ID dan letaknya tidak berubah diam-diam.`)}
     ${ptg("<b>Situs.</b> " + (A?.situs || []).map(s => `${esc(s.nama)} (${esc(s.kab)}), ${fmt(s.transek)} transek`).join("; ") + ".")}`,
    ["Situs berupa kotak yang ditentukan tangan, bukan seluruh pesisir Indonesia.", "Garis dasar OpenStreetMap bisa meleset dari pantai nyata; jarak diukur dari garis dasar itu."]);
  const laju = (m, A) => !m ? "" : bab("laju", "Laju perubahan", "dari deret posisi ke meter per tahun",
    "Posisi tahunan di tiap transek diregresi linear untuk mendapat laju meter per tahun. Tiap laju selalu tampil bersama selang 95 persen dan tingkat keyakinan; bila selang memuat nol, ditulis tidak nyata.",
    `${ptg(`<b>Regresi.</b> ${esc(m.laju)}. Rujukan: ${esc(m.rujukan)}.`)}
     ${ptg("<b>Keyakinan.</b> Tinggi: sedikitnya 15 tahun terbaca, selang tidak memuat nol, R2 sedikitnya 0,5. Sedang: sedikitnya 8 tahun dan selang tidak memuat nol. Turun satu tingkat bila membuang pencilan membalik arah atau baru membuat laju nyata. Rendah ditulis tidak nyata.")}
     ${ptg("<b>Lompatan.</b> Lompatan lebih dari 300 m dalam satu tahun, di mana pun dalam deret, menandai transek sebagai tinjau. Bila garis kembali dalam 1 sampai 2 tahun ke dalam 40 persen dari posisi semula, tahun itu dibuang (bolak-balik); bila tetap bergeser, tetap dipakai tetapi perlu cek citra. Transek tinjau tidak dipakai untuk judul atau peringkat. Ambang 300 m dan 40 persen adalah pilihan kasar, bukan hasil kalibrasi.")}
     ${ptg("<b>Gangguan buatan.</b> Tanggul Tol Semarang-Demak dan reklamasi Patimban memotong deret di tahun pembangunannya supaya tidak terbaca sebagai pantai tumbuh.")}`,
    ["Garis tahun berurutan saling terkait (pasang, tambak, awan yang mirip); selang 95 persen sudah dilebarkan untuk autokorelasi AR(1) tetapi tetap perkiraan statistik.", "Di Sayung dan Semarang-Demak, garis mundur adalah gabungan abrasi dan penurunan muka tanah; citra tidak bisa memisahkannya."]);
  const rob = R => !R?.aturan ? "" : bab("ombak", "Rob, pasang surut, dan gelombang", "status harian titik pesisir",
    "Status rob dihitung dari muka laut model per titik, dibandingkan dengan persentil iklim titik itu sendiri. Pasang surut dan peringatan gelombang ditampilkan apa adanya dari BMKG Maritim; gelombang model dari Open-Meteo Marine.",
    `${ptg(`<b>Ambang rob.</b> Waspada: ${esc(R.aturan.waspada)}. Siaga: ${esc(R.aturan.siaga)}. Awas: ${esc(R.aturan.awas)}. Gabungan: ${esc(R.aturan.gabung)}. Titik tanpa arsip persentil ditulis tanpa ambang, bukan normal.`)}
     ${ptg(`<b>Datum.</b> ${esc(R.aturan.datum)}.`)}
     ${ptg("<b>Pasang surut.</b> Prediksi astronomis BMKG Maritim terhadap MSL; puncak harian per stasiun, dengan p50, p75, dan p90 dari puncak harian stasiun itu sendiri.")}
     ${ptg("<b>Gelombang.</b> Tinggi tertinggi sehari di titik pelabuhan dan pesisir dari model Open-Meteo, kelas mengikuti ambang BMKG Maritim. Peringatan BMKG digabung per provinsi untuk kelas tinggi sampai ekstrem; kelas sedang tidak dihitung.")}`,
    ["Muka laut model bukan datum lokal dan tidak memasukkan penurunan tanah atau tanggul.", "Pasang surut, rob, dan gelombang ditampilkan terpisah; tidak ada skor gabungan yang diuji."]);
  const uji = (R, K) => { const v = R?.validasi; if (!v?.kejadian_diuji) return ""; const p = v.persentil || {}, baris = Object.entries(p).map(([k, x]) => [k, a(x.pod, 2), a(x.pofd, 2), a(x.pss, 2), fmt(x.hari_terpicu)]);
    return bab("uji", "Uji terhadap kejadian rob", "ambang dibandingkan kejadian yang tercatat",
      `Ambang Waspada diuji mundur terhadap ${fmt(v.kejadian_diuji)} kejadian DIBI di ${fmt(v.kab_berkejadian)} kabupaten dan kota (${esc(v.periode?.[0] || "")} sampai ${esc(v.periode?.[1] || "")}). Persentil 95 dipertahankan.`,
      `${ptg("Kemampuan membedakan (PSS) persentil 90 sampai 97 hampir sama, selisihnya kurang dari satu galat baku. Persentil 90 menggandakan jumlah hari terpicu, jadi persentil 95 dipilih.")}
       ${tabel(["Persentil", "POD", "POFD", "PSS", "Hari terpicu"], baris)}
       ${K?.fase ? ptg(`<b>Fase bulan.</b> ${fmt(K.n_kejadian)} kejadian rob dari ${fmt(K.n_kab)} kabupaten dan kota (Pusdalops, logbook, DIBI). Porsi kejadian dalam 2 hari dari bulan baru atau purnama ${a(K.fase.porsi_dalam_2_hari * 100, 0)} persen, lawan ${a(K.fase.porsi_acak * 100, 0)} persen pada pengacakan. Sinyal ini lemah dan ditentukan beberapa episode, jadi tidak ditampilkan sebagai temuan.`) : ""}`,
      ["Sebagian besar hari terpicu tidak bertepatan dengan kejadian tercatat, dan DIBI tidak mencatat semua rob.", "Tidak ada pengukuran lapangan yang mencocokkan laju abrasi; belum ada uji untuk laju abrasi selain konsistensi statistik di dalam deret."]); };
  const sumber = (A, R) => bab("sumber", "Sumber data", "dari mana data berasal", "Semua data berasal dari penyedia resmi dan terbuka.", tabel(["Data", "Sumber"], [
    ["Garis pantai dan laju abrasi", "Landsat Collection 2 Level-2 (USGS) lewat Microsoft Planetary Computer; garis dasar transek OpenStreetMap (ODbL); deteksi Centurisk97"],
    ["Rob", "Open-Meteo Marine (MeteoFrance SMOC), muka laut model; hitungan Centurisk97"],
    ["Peringatan rob dan gelombang", "BMKG Maritim, apa adanya"], ["Pasang surut", "BMKG Maritim, prediksi astronomis terhadap MSL"],
    ["Gelombang model", "Open-Meteo Marine"], ["Kejadian rob", "DIBI BNPB, logbook Pusdalops BNPB, rekap Pusdalops 2023 sampai 2024"]]) + (A?.sumber ? ptg(esc(A.sumber)) : ""), []);
  const batas = A => bab("batas", "Batas model", "apa yang tidak bisa dikatakan halaman ini",
    "Garis pantai belum dikoreksi pasang surut. Pantura bertunggang pasang sekitar 1 m dengan pantai landai berlumpur, sehingga garis satu tahun bisa bergeser puluhan sampai ratusan meter menurut pasang saat satelit lewat. Laju jangka panjang lebih bisa dipegang daripada posisi satu tahun.", "",
    ["Angka laju adalah perkiraan statistik dari citra satelit, bukan pengukuran lapangan dan bukan pernyataan resmi.", ...(A?.catatan || []).filter(c => !/^Belum dikoreksi pasang/.test(c)).map(esc)]);

  async function render() {
    const el = $("#metode"); if (!el || el.dataset.ok) return; el.dataset.ok = 1;
    const A = S.abr, m = A?.metode, R = S.rob, K = await fetch("data/rob_kejadian.json").then(r => r.ok ? r.json() : null).catch(() => null);
    const bagian = [citra(m), garis(m), transek(m, A), laju(m, A), rob(R), uji(R, K), sumber(A, R), batas(A)].filter(Boolean);
    let n = 0; el.innerHTML = `<div class="head"><div><h2>Metode &amp; data</h2><p>Cara tiap angka abrasi dan rob dihitung, berikut batasnya.</p></div></div>${bagian.map(h => h.replace(/<b>0\. /, `<b>${++n}. `)).join("")}`;
    el.querySelector("details.mt-sek")?.setAttribute("open", "");
  }
  return {render};
})();
