function renderMetode() {
  const M = S.meta || {}, d = M.dbscan || {};
  const blok = (j, isi, buka) => `<div class="fold"><button aria-expanded="${!!buka}">${j}<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg></button><div ${buka ? "" : "hidden"}>${isi}</div></div>`;
  /* tabel: sel teks boleh membungkus; kolom di `kanan` rata kanan */
  const tb = (kepala, baris, kanan = []) => `<div class="tw" style="margin:6px 0 10px"><table><thead><tr>${kepala.map((h, i) => `<th class="${kanan.includes(i) ? "n" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${
    baris.map(r => `<tr>${r.map((c, i) => `<td class="${kanan.includes(i) ? "n num" : ""}" style="white-space:${kanan.includes(i) ? "nowrap" : "normal"}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const h = t => `<h4 style="margin:14px 0 4px;font-size:13.5px">${t}</h4>`;
  const ul = a => `<ul style="margin:4px 0 8px;padding-left:18px">${a.map(x => `<li>${x}</li>`).join("")}</ul>`;
  const rumus = s => `<div class="rumus" style="margin:6px 0 10px">${s}</div>`;
  const catat = s => `<p style="font-size:12px;color:var(--ink2)">${s}</p>`;
  const nFwi = S.fwi?.grid?.length, nDaops = (S.daops || []).length, nKota = (S.daops || []).filter(x => x.presisi === "kota").length;
  const nPerm = (S.permanen || []).length, nAju = (S.posko || []).filter(x => x.jenis_posko === "aju").length, nKab = (S.menengah || []).length, nPusat = (S.pusat || []).length;
  const lv = [0, 0, 0, 0]; (S.kluster?.features || []).forEach(f => lv[f.properties.level]++);
  const nHarga = Object.keys(HARGA).length, nEst = Object.values(HARGA).filter(x => x[2]).length;
  const A = ASUMSI;

  $("#metode").innerHTML = `<div class="head"><div><h2>Metode & data</h2><p>Cara tiap angka dihitung, dari data mana, dengan ambang apa, dan di mana batasnya.</p></div></div>
  <p style="font-size:13px">Semua rumus, konstanta, dan ambang di halaman ini diambil dari kode platform: <code>scripts/data/*.py</code>, <code>scripts/scrape/*.py</code>, dan <code>public/index.html</code>. Angka yang tidak berasal dari kode atau berkas data ditandai sebagai kutipan sumber luar. Data diperbarui otomatis sekali sehari pukul 21.20 WIB lewat GitHub Actions; jalan terakhir ${M.dibuat ? jamWIB(M.dibuat) : "–"}, deteksi satelit terakhir ${M.data_terakhir ? jamWIB(M.data_terakhir) : "–"}.</p>

  ${blok("0. Alur pembaruan harian", `<p>Jam 21.20 WIB dipilih karena lintasan siang VIIRS dan MODIS (± 13.30 waktu setempat) sudah masuk FIRMS NRT dengan latensi ± 3 jam (catatan di <code>.github/workflows/data.yml</code>). Urutan langkah:</p>
    ${tb(["Langkah", "Skrip", "Hasil", "Bila gagal"], [
      ["1", "<code>harian.py</code>", "hotspot.json, hotspot72.json, kluster.json, fwi.json, wilayah.json, bnpb.json, meta.json", "FWI: pakai hitungan terakhir; BNPB: pakai berkas lama. FIRMS gagal = seluruh jalan gagal"],
      ["2", "<code>posko.py</code>", "posko.json", "jalan gagal"],
      ["3", "<code>keputusan.py</code>, <code>bnpb_gis.py</code>", "keputusan.json, inarisk.json, bpbd.json", "boleh gagal, berkas lama dipakai"],
      ["4", "<code>udara_rekom.py</code>", "udara_rekom.json", "jalan gagal"],
      ["5", "<code>asap.py</code>", "asap.json", "boleh gagal"],
      ["6", "<code>scrape/metar.py</code>", "metar.json", "boleh gagal (batas 300 detik)"],
      ["7", "uji: <code>fwi.py</code>, <code>aturan.py</code>, <code>posko.py uji</code>, <code>udara_rekom.py uji</code>", "–", "data tidak diterbitkan"]])}
    <p>Berkas yang tidak ada di daftar ini (arsip riwayat, kalender musim, lapisan lahan, bandara, Daops, luas terbakar) dibuat manual oleh skrip terpisah dan tidak berubah tiap hari. Batas waktu satu jalan 50 menit.</p>
    <p><b>Peringatan data basi</b>: bila umur data > 26 jam muncul pita peringatan; bila > 36 jam, status kompleks dinyatakan tidak boleh dipakai untuk keputusan sampai data diperbarui.</p>`)}

  ${blok("1. Titik panas (hotspot)", `${h("Tujuan")}<p>Menghitung titik panas dengan cara yang sama dengan SiPongi/BNPB, dan menyediakan deteksi untuk pengelompokan kompleks api.</p>
    ${h("Data masukan")}${tb(["Produk FIRMS", "Satelit", "Piksel nominal", "Dihitung di angka resmi", "Dipakai untuk kompleks"], [
      ["VIIRS_SNPP_NRT", "Suomi NPP", "375 m", "ya (kode N)", "ya, keyakinan sedang/tinggi"], ["VIIRS_NOAA20_NRT", "NOAA-20", "375 m", "ya (N20)", "ya, sedang/tinggi"],
      ["VIIRS_NOAA21_NRT", "NOAA-21", "375 m", "tidak (tampil di peta)", "ya, sedang/tinggi"], ["MODIS_NRT", "Terra & Aqua", "1 km", "ya (M)", "tidak"]])}
    <p>Diambil lewat FIRMS area API untuk kotak 94–141,5 BT, 11,5 LS–6,5 LU. Parameter tanggal API adalah tanggal <i>awal</i> jendela dengan rentang maksimal 5 hari, jadi tiap sensor diminta dua kali: mulai H−4 (H−4 s.d. H) dan mulai H−9 (H−9 s.d. H−5), tanggal UTC. Sepuluh hari UTC itu lalu dipotong ke 7 × 24 jam terakhir dari saat jalan. Permintaan yang gagal diulang 4 kali; bila kuota FIRMS (5.000 transaksi per 10 menit) habis, jeda 90 detik.</p>
    ${h("Langkah per deteksi")}${ul([
      "Waktu = <code>acq_date</code> + <code>acq_time</code> (UTC). Tanggal WIB = UTC + 7 jam.",
      "Kelas keyakinan (BRIN): MODIS rendah 0–29, sedang 30–79, tinggi 80–100 (nilai bukan angka dianggap rendah); VIIRS rendah (l), sedang (n), tinggi (h), kode lain dianggap sedang.",
      "Koordinat dibulatkan 4 desimal (± 11 m). Baris yang persis sama (lintang, bujur, waktu, sensor) hanya dihitung sekali. Ini membuang baris ganda dari API, bukan menggabungkan deteksi antarsatelit.",
      "Ukuran piksel sebenarnya = max(scan, track) dari FIRMS (km; kosong = 0,4). Dipakai DBSCAN.",
      "Wilayah: uji titik-dalam-poligon (ray casting) terhadap poligon kecamatan kode Kemendagri, diindeks per sel 0,5°. Hanya cincin luar yang dipakai (lubang diabaikan, batas sudah disederhanakan). Titik yang tidak jatuh di kecamatan mana pun dibuang (laut atau negara tetangga)."])}
    ${h("Angka resmi platform")}<p>Jumlah deteksi MODIS + VIIRS S-NPP + VIIRS NOAA-20, semua tingkat keyakinan, per hari kalender WIB (00.00–23.59), tanpa penghapusan duplikat antarsatelit. Satu api bisa tercatat beberapa kali (beberapa satelit, beberapa lintasan), jadi angka ini jumlah deteksi, bukan jumlah api. Jalan terakhir memuat ${fmt(M.jumlah_titik)} deteksi 7 hari (semua sensor).</p>
    <p>Pilihan rentang di peta: <b>hari ini</b> dan <b>kemarin</b> = tanggal WIB; <b>72 jam</b> dan <b>7 hari</b> dihitung mundur dari deteksi terakhir yang masuk, bukan dari jam sekarang. Peta memuat <code>hotspot72.json</code> (≤ 72 jam sebelum deteksi terakhir) lebih dulu, lalu <code>hotspot.json</code> 7 hari di belakang.</p>
    <p><b>Kelipatan normal harian</b> (kartu titik panas, rentang "kemarin"): rata-rata titik VIIRS S-NPP keyakinan sedang/tinggi per hari pada bulan yang sama di tahun-tahun lalu (arsip <code>sejarah.json</code>, 2015 s.d. tahun lalu) = jumlah titik bulan itu ÷ jumlah tahun ÷ jumlah hari bulan itu. Pembandingnya hitungan S-NPP sedang/tinggi kemarin saja, supaya sebanding dengan arsip.</p>
    ${h("Validasi")}<p><b>Uji silang 11 Oktober 2026</b> terhadap dashboard BNPB: Jambi 181 vs 147, Sumsel 2.156 vs 1.991, Kalteng 4.227 vs 3.908, Kalsel 395 vs 445 (selisih 4–23%). Kalbar 796 vs 401 dan Riau 1 vs 8 belum cocok; metode BNPB tidak dipublikasikan.</p>
    ${h("Keterbatasan")}${ul(["Awan dan asap tebal menutupi api; tidak ada deteksi bukan berarti tidak ada api.", "Titik panas adalah anomali panas, bukan selalu kebakaran lahan. Di luar 9 provinsi prioritas banyak titik berasal dari smelter dan industri, karena itu peringkat risiko dan kalender musim dibatasi ke 9 provinsi.", "Data NRT bisa berbeda dari arsip standar yang terbit kemudian.", "Batas kecamatan disederhanakan; titik di garis pantai atau perbatasan bisa salah wilayah atau terbuang.", "Selisih dengan BNPB belum bisa direkonsiliasi karena saringan BNPB tidak dipublikasikan."])}
    ${h("Yang mengubah hasil")}<p>Jam jalan: deteksi yang masuk FIRMS setelah 21.20 WIB baru terhitung di jalan berikutnya (sebagai "kemarin"). Perubahan daftar sensor di <code>SENSOR_UTAMA</code> mengubah angka resmi secara langsung.</p>`, true)}

  ${blok("2. Bahaya cuaca: Fire Weather Index (FWI)", `${h("Tujuan")}<p>Menilai seberapa mudah api menyala dan menjalar dari cuaca, dengan sistem FWI Kanada (Van Wagner 1987), kerangka yang dipakai SPARTAN BMKG.</p>
    ${h("Data masukan")}${ul([
      `Kisi 0,5° (± 55 km): titik tengah sel 11,25 LS–6,25 LU dan 94,75–141,25 BT, hanya sel yang titik tengahnya jatuh di kecamatan (${fmt(nFwi)} sel saat ini).`,
      "Cuaca per jam Open-Meteo Forecast API di titik tengah sel: suhu 2 m (°C), kelembapan relatif 2 m (%), angin 10 m (km/jam) dan arahnya, hujan; zona waktu setempat. Diminta per 80 sel: 8 hari ke belakang dan 4 hari prakiraan.",
      "Nilai harian diambil <b>jam 12.00 waktu setempat</b>. Hujan = jumlah 24 nilai per jam dari 13.00 kemarin sampai 12.00 hari itu; bila satu jam saja kosong, hujan hari itu dianggap kosong.",
      "Pemanasan awal: reanalisis ERA5 lewat Open-Meteo Archive API, 300 hari ke belakang sampai H−8, per 25 sel."])}
    ${h("Rantai perhitungan (fwi.py)")}
    ${rumus(`FFMC  kadar air serasah halus (F0 = kemarin; T suhu, H RH, W angin, r hujan)
  mo = 147,2·(101 − F0)/(59,5 + F0)
  bila r > 0,5:  rf = r − 0,5
     mo += 42,5·rf·e^(−100/(251 − mo))·(1 − e^(−6,93/rf))   [+ 0,0015·(mo − 150)²·√rf bila mo > 150];  mo ≤ 250
  Ed = 0,942·H^0,679 + 11·e^((H − 100)/10) + 0,18·(21,1 − T)·(1 − e^(−0,115·H))
  bila mo > Ed:  ko = 0,424·(1 − (H/100)^1,7) + 0,0694·√W·(1 − (H/100)^8)
                 m  = Ed + (mo − Ed)·10^(−ko·0,581·e^(0,0365·T))
  selain itu:   Ew = 0,618·H^0,753 + 10·e^((H − 100)/10) + 0,18·(21,1 − T)·(1 − e^(−0,115·H))
                 bila mo < Ew:  k1 = 0,424·(1 − ((100 − H)/100)^1,7) + 0,0694·√W·(1 − ((100 − H)/100)^8)
                                m  = Ew − (Ew − mo)·10^(−k1·0,581·e^(0,0365·T))
                 selain itu m = mo
  FFMC = 59,5·(250 − m)/(147,2 + m), dibatasi 0–101

DMC   humus dangkal (P0 = kemarin, Le = 9,0)
  T = max(T, −1,1);  K = 1,894·(T + 1,1)·(100 − H)·Le·10^−4
  bila r > 1,5:  re = 0,92·r − 1,27;  Mo = 20 + 280/e^(0,023·P0)
     b = 100/(0,5 + 0,3·P0) bila P0 ≤ 33;  14 − 1,3·ln P0 bila P0 ≤ 65;  6,2·ln P0 − 17,2 selain itu
     Mr = Mo + 1000·re/(48,77 + b·re);  P0 = 43,43·(5,6348 − ln(Mr − 20))
  DMC = max(P0, 0) + K

DC    kekeringan lapisan dalam / gambut (D0 = kemarin, Lf = 1,39)
  T = max(T, −2,8);  V = max((0,36·(T + 2,8) + Lf)/2, 0)
  bila r > 2,8:  rd = 0,83·r − 1,27;  Qo = 800·e^(−D0/400);  D0 = max(D0 − 400·ln(1 + 3,937·rd/Qo), 0)
  DC = D0 + V

ISI   laju penjalaran awal
  m = 147,2·(101 − FFMC)/(59,5 + FFMC)
  ISI = 0,208·f(W)·f(F),  f(W) = e^(0,05039·W),  f(F) = 91,9·e^(−0,1386·m)·(1 + m^5,31/4,93·10^7)
        (di kode ditulis langsung 19,115·e^(−0,1386·m)·..., karena 0,208 × 91,9 = 19,115)

BUI   bahan bakar tersedia
  bila DMC ≤ 0,4·DC:  BUI = 0,8·DMC·DC/(DMC + 0,4·DC)
  selain itu:         BUI = DMC − (1 − 0,8·DC/(DMC + 0,4·DC))·(0,92 + (0,0114·DMC)^1,7);  BUI ≥ 0

FWI
  f(D) = 0,626·BUI^0,809 + 2 bila BUI ≤ 80;  1000/(25 + 108,64·e^(−0,023·BUI)) selain itu
  B = 0,1·ISI·f(D);   FWI = B bila B ≤ 1,  e^(2,72·(0,434·ln B)^0,647) bila B > 1`)}
    <p>RH dibatasi 0–100 sebelum dihitung. Faktor panjang hari memakai nilai khatulistiwa cffdrs untuk lintang −10° s.d. 10° (Le = 9,0, Lf = 1,39) sepanjang tahun. Nilai awal standar FFMC 85, DMC 6, DC 15.</p>
    ${h("Keadaan bersambung dan celah data")}${ul([
      "FFMC, DMC, dan DC per sel disimpan harian di <code>fwi_state.json</code> dan dilanjutkan esok harinya, bukan dihitung ulang dari nol (perbaikan peer review).",
      "Keadaan yang disimpan adalah nilai H−2, supaya revisi cuaca beberapa hari terakhir ikut terbawa.",
      "Sel tanpa keadaan, atau keadaannya lebih tua dari 8 hari, dipanaskan dari ERA5 300 hari mulai nilai awal standar. Bila kuota Open-Meteo habis, sel itu dipanaskan dari 92 hari data forecast.",
      "Hari dengan data kosong tidak menghapus urutan: FFMC/DMC/DC dibawa dari kemarin, ISI dihitung dengan angin 0, dan hari itu ditandai <i>celah</i>.",
      "Bila seluruh perhitungan FWI gagal, hitungan terakhir dipakai ulang. Berkas <code>fwi.json</code> menyimpan 8 hari per sel (termasuk hari ini dan 3 hari prakiraan)."])}
    ${h("Kelas bahaya")}${tb(["Indeks", "Rendah", "Sedang", "Tinggi", "Sangat tinggi"], [
      ["FWI (dipakai status)", "&lt; 2", "2 s.d. &lt; 7", "7 s.d. &lt; 14", "≥ 14"], ["FFMC", "0–72", "73–77", "78–82", "&gt; 82"],
      ["DC (dipakai kompleks)", "≤ 140 basah", "141–260 lembap", "261–350 kering", "&gt; 350 sangat kering"], ["ISI", "0–1", "2–3", "4–5", "&gt; 5"]])}
    <p>Sumber kelas: BMKG (bmkg.go.id/cuaca/karhutla). Ambang FFMC 82 (penyulutan) dari de Groot dkk. 2005/2007; DC > 350 (asap pekat di gambut) dari Field dkk. 2004 dan BMKG. Kelas FFMC dan ISI hanya ditampilkan; yang masuk aturan status adalah kelas FWI dan ambang DC 350.</p>
    ${h("Validasi")}<p>Tiap hari sebelum terbit, <code>fwi.py</code> menguji contoh baku Van Wagner & Pickett (1985): 45° LU, April, suhu 17 °C, RH 42%, angin 25 km/jam, hujan 0, nilai awal 85/6/15, Le 12,8, Lf 0,9. Hasil wajib FFMC 87,7 · DMC 8,5 · DC 19,0 · ISI 10,9 · BUI 8,5 · FWI 10,1. Diuji juga bahwa hari kosong membawa kode tanpa menggesernya, dan bahwa melanjutkan dari keadaan kemarin sama dengan menghitung bersambung.</p>
    ${h("Keterbatasan")}${ul(["Cuaca adalah keluaran model di titik tengah sel 55 km, bukan pengamatan stasiun. Hujan model lemah di tropis (temuan peer review, belum diganti IMERG/GSMaP).", "Nilai bisa berbeda dari FWI resmi SPARTAN BMKG; lapisan resmi belum diperoleh.", "Kompleks api mengambil sel terdekat tanpa batas jarak; di pulau kecil yang titik tengah selnya jatuh di laut, sel terdekat bisa jauh.", "Tiga hari ke depan dihitung dari cuaca prakiraan, jadi makin jauh makin tidak pasti.", "Faktor panjang hari dibuat tetap; variasi musiman kecil di khatulistiwa diabaikan."])}
    ${h("Yang mengubah hasil")}<p>Hujan 24 jam di atas 0,5 mm (FFMC), 1,5 mm (DMC), atau 2,8 mm (DC); jam pengambilan (12.00); kehilangan keadaan bersambung (sel dipanaskan ulang dari ERA5).</p>`)}

  ${blok("3. Kompleks kebakaran: ST-DBSCAN Haversine", `${h("Tujuan")}<p>Menggabungkan deteksi yang berdekatan dalam ruang dan waktu menjadi satu kejadian api (kompleks), supaya yang dinilai adalah api, bukan titik.</p>
    ${h("Data masukan")}<p>Deteksi VIIRS dari 3 satelit (S-NPP, NOAA-20, NOAA-21) dengan keyakinan sedang dan tinggi selama ${fmt(d.jendela_hari)} hari terakhir dari jam jalan. MODIS tidak dipakai karena pikselnya 1 km.</p>
    ${h("Algoritma")}${rumus(`Jarak (Haversine, R = 6.371,0088 km):
  d = 2R·asin( √( sin²(Δφ/2) + cos φ1·cos φ2·sin²(Δλ/2) ) )

Dua deteksi i dan j bertetangga bila
  |t_i − t_j| ≤ ${d.jam_st || 48} jam   dan   d_ij ≤ eps_ij
  eps_ij = min(${fmt(d.eps_km)}, max(0,6; 1,5 · max(piksel_i, piksel_j)))      (km)

minPts = ${d.min_pts}  → deteksi tunggal tetap menjadi kejadian sendiri
Indeks sel = eps / (111,195 · cos 12°) derajat; tetangga dicari di 3 × 3 sel
(Indonesia berada di |lintang| < 11°, jadi sel pada cos 12° tidak melewatkan tetangga)`)}
    <p>Piksel VIIRS melebar ke tepi sapuan, jadi radius tetangga mengikuti ukuran piksel sebenarnya (kolom scan/track FIRMS), dibatasi 0,6–${fmt(d.eps_km)} km. Parameter mengikuti FEDS (Chen dkk. 2022) dan uji akurasi VIIRS di Indonesia (Indradjad dkk. 2024, puncak galat lokasi 1–1,5 km).</p>
    ${h("Atribut tiap kompleks")}${tb(["Atribut", "Cara hitung"], [
      ["Pusat", "rata-rata lintang dan bujur semua deteksi"], ["Wilayah", "kecamatan tempat pusat jatuh; bila pusat di luar poligon, kecamatan yang paling sering muncul di antara deteksinya"],
      ["px24 (front aktif 24 jam)", "jumlah sel ± 375 m berbeda yang berisi deteksi 24 jam terakhir. Sel = (round(lintang/0,003375), round(bujur·cos lintang/0,003375))"],
      ["Hari menyala", "jumlah tanggal WIB berbeda"], ["Deteksi hari ini / kemarin", "per tanggal WIB jam jalan"], ["FRP, FRP 24 jam", "jumlah FRP (MW)"],
      ["Luas indikatif", "jumlah sel ± 375 m berbeda selama 7 hari × 14,0625 ha (0,375 km × 0,375 km). Laci kompleks menampilkannya sebagai rentang 0,3–1,0 kali nilai itu"],
      ["Bentuk", "lambung cembung (monotone chain) bila ≥ 3 simpul dan status ≥ siaga; selain itu titik"],
      ["Cuaca", "FWI, FFMC, DMC, DC, ISI, BUI, angin, RH, suhu hari ini dari sel FWI terdekat; tidak ada = 'cuaca tidak tersedia'"],
      ["Gambut", "pusat atau salah satu dari 20 deteksi pertama jatuh di poligon gambut"], ["Daops", "markas Daops terdekat (Haversine) dan jaraknya"],
      ["Benih simulasi", "≤ 80 deteksi 24 jam terakhir dengan FRP terbesar (hanya status ≥ siaga)"],
      ["Penanggung jawab lahan", "konsesi sawit → perusahaan perkebunan; HPH → pemegang PBPH; kawasan konservasi → BKSDA/Balai TN; hutan lindung dan Tahura → pemda; HP/HPT/HPK → KPH/pemegang PBPH; selain itu → desa/camat/bupati (P.32/2016 dan praktik KLHK)"]])}
    ${h("Kapan kompleks dianggap aktif")}<p>Kompleks ditampilkan bila deteksi terakhirnya ≤ ${d.aktif_jam} jam dari jam jalan. Di gambut sangat kering (DC > 350 dan berada di peta gambut; tanpa peta gambut cukup DC) batasnya ${d.aktif_gambut_jam || 168} jam, karena bara bisa tertutup awan atau asap (deteksi VIIRS di gambut ± 71%). Kompleks yang tidak terdeteksi 24 jam diberi tanda <i>tidak teramati</i>; tidak teramati tidak sama dengan padam.</p>
    <p>Kompleks dengan < 3 deteksi, status pencegahan rutin, dan terdeteksi dalam 24 jam terakhir hanya dihitung, tidak digambar (${fmt(M.titik_tunggal_belum_dinilai)} pada jalan terakhir). Jalan terakhir menghasilkan ${fmt(M.jumlah_kluster)} kompleks.</p>
    ${h("Keterbatasan")}${ul(["Dua api terpisah yang berjarak < 1,5 km digabung; satu api besar dengan celah deteksi > 1,5 km atau > 48 jam terpecah.", "Lambung cembung memuat lahan yang tidak terbakar; luas indikatif bukan luas terbakar. FIRMS tidak menganjurkan titik panas untuk luas; angka resmi tetap KLHK/BNPB (Landsat dan lapangan).", "Pusat kompleks adalah rata-rata, bisa jatuh di luar area api.", "Peta gambut global melebihkan luas gambut ± 2,5 kali angka BBSDLP, jadi hanya dipakai sebagai tanda ya/tidak."])}
    ${h("Yang mengubah hasil")}<p>eps, jendela waktu 48 jam, jendela 7 hari, dan batas aktif 72/168 jam (semua di <code>harian.py</code>, terbaca di <code>meta.json</code>).</p>`)}

  ${blok("4. Status taktis dan prioritas", `${h("Tujuan")}<p>Memberi tiap kompleks satu dari empat status tindakan (${(M.status || []).map(esc).join(", ")}) dari pengamatan satelit dan cuaca, lalu menandai yang paling perlu dipadamkan dulu.</p>
    ${h("Langkah 1: keparahan teramati (aturan.py)")}${rumus(`S3  bila px24 ≥ 10 piksel (≈ 140 ha)  atau  (hari menyala ≥ 4 dan px24 ≥ 5)
S1  bila jumlah deteksi < 3 dan hari menyala ≤ 1
S2  selain itu`)}
    <p>Klausul lama "naik 50% dari kemarin" dibuang karena uji balik menunjukkan ia menambah kompleks tanpa menangkap api besar tambahan.</p>
    ${h("Langkah 2: bahaya cuaca")}<p>Kelas FWI BMKG apa adanya. FFMC (penyulutan), ISI (laju), dan DC (gambut/asap) ditampilkan terpisah, tidak dijumlahkan ke kelas. Kenaikan kelas otomatis dari FFMC > 82 dan ISI > 5 dihapus karena ambang itu terlampaui hampir tiap hari kemarau.</p>
    ${h("Langkah 3: matriks status")}<div class="tw"><table><thead><tr><th>Bahaya cuaca</th><th>S1</th><th>S2</th><th>S3</th></tr></thead><tbody>
    <tr><td>Rendah / sedang</td><td><span class="pill l0">Pencegahan rutin</span></td><td><span class="pill l1">Patroli terpadu</span></td><td><span class="pill l2">Siaga pemadaman awal</span></td></tr>
    <tr><td>Tinggi</td><td><span class="pill l1">Patroli terpadu</span></td><td><span class="pill l2">Siaga pemadaman awal</span></td><td><span class="pill l2">Siaga pemadaman awal</span></td></tr>
    <tr><td>Sangat tinggi</td><td><span class="pill l1">Patroli terpadu</span></td><td><span class="pill l2">Siaga pemadaman awal</span></td><td><span class="pill l2">Siaga pemadaman awal</span></td></tr>
    <tr><td>Tidak tersedia</td><td><span class="pill l1">Patroli terpadu</span></td><td><span class="pill l1">Patroli terpadu</span></td><td><span class="pill l2">Siaga pemadaman awal</span></td></tr></tbody></table></div>
    <p>Cuaca hanya bisa menaikkan status. Api besar yang teramati (S3) minimal siaga. Cuaca tidak tersedia tidak dianggap rendah.</p>
    ${h("Langkah 4: prioritas pemadaman")}${rumus(`Prioritas  bila  status = siaga  dan  teramati (terdeteksi ≤ 24 jam)
                dan  px24 ≥ 15 piksel VIIRS (≈ 210 ha)
                dan  (FWI ≥ 7  atau  FWI tidak tersedia)`)}
    <p>Prioritas tidak dibatasi jumlahnya. Di dalam tiap wilayah kerja, kompleks prioritas diurutkan dengan skor. Wilayah kerja = Daops terdekat bila jaraknya ≤ 150 km, selain itu kabupaten.</p>
    ${rumus(`bahaya = max(px24, 1) · (1 + ln(1 + FRP24)/5) · (1 + min(hari, 5)/5)
         · (1 + min(max(ISI, 0), 20)/20 + 0,5·[DC > 350])        DC hanya dihitung di gambut (atau bila peta gambut tidak ada)
celah  = min(jarak ke Daops / 150 km, 1)
skor   = bahaya · (1 + celah) · (1 + risiko kecamatan/100)      risiko 0–100, lihat bagian 5`)}
    ${h("Validasi: uji balik")}<p><b>Agustus–Oktober 2019 dan 2023</b> (VIIRS S-NPP, 9 provinsi): ambang front ≥ 10 piksel & FWI ≥ 7 menandai 90% (2019) dan 95% (2023) api yang akhirnya ≥ 100 piksel sebelum mencapai separuh ukurannya, presisi 53% dan 35%, porsi prioritas 1,9% dan 0,8% kompleks-hari. Pipeline harian memakai 3 satelit VIIRS (lebih banyak lintasan dari S-NPP saja), jadi ambangnya dinaikkan menjadi 15 piksel; perlu diuji ulang dengan data NOAA-20.</p>
    <p><b>Kenapa peringkat berkuota ditolak</b>: versi dengan kuota k = regu/2 per Daops hanya menangkap 60–76% api besar, dan 7 dari 10 prioritasnya hilang keesokan hari. Karena itu skor hanya dipakai untuk mengurutkan, bukan membatasi jumlah prioritas.</p>
    <p>Aturan ini diuji tiap hari sebelum terbit (<code>aturan.py</code>): batas kelas FWI dan DC, contoh S1/S2/S3, larangan cuaca menurunkan S3, level 3 hanya lewat ambang prioritas, dan arah skor (lebih jauh dari Daops = lebih tinggi).</p>
    ${h("Status saat ini")}<p>Pencegahan rutin ${fmt(lv[0])} · patroli terpadu ${fmt(lv[1])} · siaga ${fmt(lv[2])} · prioritas ${fmt(lv[3])} kompleks.</p>
    ${h("Batas peran model")}<p>"Siaga darurat" dan "tanggap darurat" adalah status hukum wilayah (Permen LHK P.9/2018) yang ditetapkan bupati, gubernur, atau menteri. Model tidak memberikannya.</p>
    <table><thead><tr><th>Status</th><th>Tindakan yang disarankan</th></tr></thead><tbody>${(M.status || []).map((s, i) => `<tr><td><span class="pill l${i}">${esc(s)}</span></td><td style="white-space:normal">${STATUS_AKSI[i].map(esc).join("; ")}</td></tr>`).join("")}</tbody></table>
    ${catat("Tindakan disusun dari isi SOP dan regulasi, bukan salinan SOP.")}
    ${h("Keterbatasan")}${ul(["Cuaca dinilai per sel 55 km; satu kompleks memakai satu sel.", "Ambang 15 piksel belum diuji ulang dengan 3 satelit.", "Jarak ke Daops garis lurus; markas sebagian Daops masih lokasi perkiraan (bagian 13)."])}`)}

  ${blok("5. Indeks risiko riwayat", `${h("Tujuan")}<p>Satu angka 0–100 untuk membandingkan seberapa sering dan seberapa besar sebuah wilayah terbakar di masa lalu. Dipakai di mode Riwayat peta, tab Tren, Insight, dan (versi VIIRS) di skor prioritas kompleks.</p>
    ${h("Rumus (skorRiwayat, index.html)")}${rumus(`kekerapan fK = tahun terbakar / jumlah tahun
              terbakar = ≥ 10 titik setahun (kecamatan), ≥ 100 (kabupaten), ≥ 500 (provinsi)
besaran   fB = ln(1 + total titik) / ln(1 + total terbesar di antara wilayah setingkat se-Indonesia)
tren      rasio = (rata-rata 2023 s.d. tahun berjalan + 1) / (rata-rata tahun sebelum 2023 + 1)
          fT = min(1, max(0, (log2 rasio + 1)/2))      turun separuh atau lebih = 0, naik dua kali atau lebih = 1
skor = round(100 · (0,5·fK + 0,3·fB + 0,2·fT))`)}
    <p><b>Kelas</b>: wilayah setingkat se-Indonesia diurutkan menurut skor (seri: total titik). 10% teratas sangat tinggi, 10–30% tinggi, 30–60% sedang, sisanya rendah. Kelas adalah posisi relatif, bukan ambang skor tetap.</p>
    ${h("Data")}<p>Arsip NASA FIRMS MODIS Terra/Aqua (arsip standar + NRT), keyakinan ≥ 30, tanggal WIB, 2002 s.d. tahun berjalan (<code>sejarah_modis.json</code>). Tahun 2001 dikeluarkan karena hanya ada Terra (Aqua mulai Juli 2002), jadi jumlahnya tidak sebanding. Berkas hanya menyimpan kecamatan yang pernah ≥ 10 titik setahun; angka kabupaten dan provinsi adalah jumlah kecamatan-kecamatan itu. Tab Tren juga bisa memakai arsip VIIRS S-NPP 2015 s.d. sekarang (keyakinan sedang/tinggi).</p>
    ${h("Versi untuk skor prioritas (aturan.py)")}<p>Skor prioritas kompleks memakai rumus bobot yang sama pada arsip VIIRS S-NPP 2015 s.d. sekarang (<code>sejarah.json</code>), ambang 10 titik di kecamatan, besaran dibagi total kecamatan terbesar. Hasilnya mengalikan skor kompleks dengan (1 + risiko/100), maksimal 2 kali. Laci kompleks menyebut kecamatan "langganan api" bila risikonya ≥ 60.</p>
    ${h("Validasi")}<p>Uji di <code>aturan.py</code>: kecamatan yang terbakar 500 titik tiap tahun harus berisiko lebih tinggi daripada yang terbakar 6.000 titik sekali saja; tanpa api sama sekali skor = 10 (hanya komponen tren netral). Belum ada uji kecocokan indeks terhadap luas terbakar resmi yang tercatat di repo.</p>
    ${h("Keterbatasan")}${ul(["Tahun berjalan ikut dihitung padahal belum lengkap: menekan kekerapan dan tren sebelum musim selesai.", "Titik panas MODIS mencakup sumber panas non-kebakaran (industri) di luar 9 provinsi prioritas.", "Kabupaten dan provinsi tidak menghitung kecamatan yang tidak pernah ≥ 10 titik setahun.", "Dua versi (MODIS 2002–sekarang dan VIIRS 2015–sekarang) memberi angka berbeda untuk kecamatan yang sama."])}`)}

  ${blok("6. Kalender musim per 10 hari", `${h("Tujuan")}<p>Menunjukkan kapan tiap provinsi biasanya memasuki periode api besar, dipisah tahun El Niño dan tahun biasa (<code>musim.py</code> → <code>musim.json</code>).</p>
    ${h("Algoritma")}${rumus(`dasarian(t) = (bulan − 1)·3 + min(2, ⌊(tanggal − 1)/10⌋)        36 dasarian per tahun; dasarian ke-3 = tanggal 21 s.d. akhir bulan
hitungan    = titik MODIS keyakinan ≥ 30 per provinsi per dasarian, tanggal WIB, 2002–2025
ambang      = max(1, persentil 90 dari semua 36 × 24 hitungan provinsi itu)
p_besar(d)  = porsi tahun yang hitungan dasarian d ≥ ambang       (dipisah: El Niño, biasa, semua)
rata(d)     = rata-rata hitungan dasarian d
musim       = dasarian pertama dan terakhir dengan p_besar ≥ 0,3     (tidak harus bersambung)
puncak      = dasarian dengan rata tertinggi`)}
    <p>Tahun El Niño (ONI, NOAA CPC): 2002, 2004, 2006, 2009, 2015, 2019, 2023. Tahun berjalan tidak dipakai karena belum lengkap. Persentil diambil sebagai nilai ke-⌊0,9·(n − 1)⌋ dari data terurut.</p>
    ${h("Keterbatasan")}${ul(["Hanya 7 tahun El Niño, jadi p_besar El Niño berlangkah 1/7 (± 14 poin).", "Ambang relatif terhadap provinsi itu sendiri: provinsi yang jarang terbakar tetap punya \"periode tersibuk\".", "Kekuatan El Niño tidak dibedakan; 2015 dan 2004 dihitung sama."])}`)}

  ${blok("7. Posko dan anggaran", `${h("Posko permanen (posko.py, sekali per musim)")}${rumus(`Kandidat  = kecamatan di 9 provinsi prioritas yang terbakar (≥ 10 titik VIIRS S-NPP) di ≥ 3 tahun sejak 2015
Bobot     = jumlah tahun terbakar × ln(1 + total titik)
Lokasi    = titik berat luas poligon kecamatan (rumus shoelace; rata-rata simpul bisa jatuh di rawa)
Per provinsi, greedy maximal covering radius 30 km: pilih kandidat yang menjangkau bobot terbesar yang belum terjangkau,
ulangi sampai ≥ 80% bobot provinsi terjangkau.
Geser ke desa terdekat bila ≤ 15 km (nama tempat nyata); selain itu tetap di titik berat kecamatan.`)}
    <p>Radius 30 km dipilih sebagai ± 1 jam perjalanan darat/sungai di gambut (catatan di kode). Saat ini ${fmt(nPerm)} posko permanen.</p>
    ${h("Posko aju (harian)")}<p>Tiap kompleks siaga atau prioritas di 9 provinsi ditugaskan ke pangkalan tetap terdekat (posko permanen atau markas Daops) bila ≤ 30 km. Sisanya dikelompokkan per kabupaten dan diberi posko aju dengan greedy maximal covering yang sama (radius 30 km, sampai semua terjangkau), bobot = (3 bila prioritas, 1 bila siaga) × max(1, px24). Kandidat lokasi = desa dalam kotak kompleks ± 0,3°; bila tidak ada data desa, titik berat kecamatan; bila tetap kosong, titik kompleks itu sendiri. Saat ini ${fmt(nAju)} posko aju.</p>
    ${h("Posko kabupaten (menengah)")}<p>Tidak tiap kabupaten. Per provinsi, kandidat = satu kota (OSM <i>town/city</i> di kabupaten itu sendiri, terdekat ke pusat bobot api kabupaten; cadangan: titik berat kecamatan). Bobot posko lapangan = bobot api aktif + ln(1 + titik riwayat) untuk posko permanen. Greedy radius 75 km (± 2–3 jam, batas koordinasi harian) sampai semua posko lapangan terlayani; posko lapangan yang tidak terjangkau menjadikan kabupatennya hub sendiri. Tiap posko lapangan melapor ke hub terdekat; hub tanpa anak dibuang. Saat ini ${fmt(nKab)} posko kabupaten.</p>
    ${h("Posko provinsi")}<p>Ibu kota provinsi (Kalimantan Selatan: Banjarbaru), ${fmt(nPusat)} posko. Jalur laporan: posko lapangan → posko kabupaten → posko provinsi → BNPB dan KLHK.</p>
    ${h("Jarak dan waktu tempuh")}<p>Semua jarak garis lurus Haversine. Waktu tempuh darat = jarak × 1,4 (kelok jalan) ÷ 40 km/jam. Di gambut tanpa jalan waktu nyata bisa 3–6 kali lebih lama. Sumber air dan fasilitas kesehatan terdekat hanya tersedia di provinsi yang punya lapisan OSM lengkap (saat ini Kalimantan Selatan); provinsi lain memakai titik pusat desa Kemendagri tanpa air dan faskes.</p>
    ${h("Daftar sarana")}<p>Per regu inti (15 orang): Permen LHK P.32/2016 Pasal 54–60, Permentan 5/2018 Lampiran IV, dan daftar inventaris PKS (Lampiran 1b), dikali jumlah regu. Per posko (lapangan, kabupaten, provinsi): rekomendasi platform menurut peran tiap tingkat, bukan angka regulasi. Untuk perusahaan perkebunan, regu inti dari luas kebun (Permentan 5/2018): &lt; 1.000 ha 1 regu, ≤ 5.000 ha 2, ≤ 10.000 ha 3, ≤ 20.000 ha 4, lalu +1 per 10.000 ha; embung dan menara pengawas 1 per 500 ha.</p>
    ${h("Rumus anggaran per posko (fungsi anggaran)")}${rumus(`biaya orang/hari = ${fmt(A.porsiBKO)}·UH_SBM provinsi + ${fmt(A.porsiMPA)}·honor MPA (Rp${fmt(A.honorMPA)}) + konsumsi (Rp${fmt(A.konsumsi)})
                   sisa porsi = Manggala Agni, sudah dibiayai DIPA (tidak dihitung)

Posko lapangan:  regu = min(6, max(1, ⌈prioritas/2 + siaga/6⌉))   (1 bila belum ada kompleks);  orang = 15·regu
  harian = orang·biaya orang
         + regu·${fmt(A.jamPompa)} jam pompa·${fmt(A.lPompa)} L/jam·Rp${fmt(A.bbm)}/L
         + regu·${fmt(A.mobilPerRegu)} kendaraan·(sewa Rp${fmt(A.sewaMobil)} + 40 L·Rp${fmt(A.dexlite)} Dexlite)
         + Starlink Rp${fmt(A.starlink)}/30
  hari   = ${fmt(A.hari)} (permanen) atau ${fmt(A.hariAju)} (aju);  alat = daftar per regu × regu + daftar posko (aju: 0)
Posko kabupaten: ${fmt(A.staffKab)} staf·(uang harian Rp${fmt(A.uhDalam)} + konsumsi) + 3 kendaraan sewa + Starlink/30
Posko provinsi:  ${fmt(A.staffProv)} staf·(uang harian Rp${fmt(A.uhDalam)} + konsumsi) + 2 kendaraan sewa + 2·Starlink/30
total (APBD/instansi) = alat × (1 − alat yang sudah ada ${fmt(A.adaAlat)}%) + harian × hari
Dana Siap Pakai BNPB (provinsi yang punya kompleks prioritas, terpisah dari total):
  ${fmt(A.heliUnit)} heli × ${fmt(A.heliJamHari)} jam/hari × Rp${fmt(A.heliJam)} × ${fmt(A.hariDarurat)} hari + ${fmt(A.omcHari)} hari OMC × Rp${fmt(A.omc)}`)}
    ${catat("Angka di atas adalah nilai asumsi yang aktif di peramban ini; bisa diubah di tab Posko.")}
    <p>Kendaraan disewa, bukan dibeli. Harga satuan: ${fmt(nHarga)} item, ${fmt(nEst)} di antaranya masih estimasi (ditandai, wajib dicek ke e-Katalog atau SSH daerah); sisanya dari Tokopedia, Indotrading, INAPROC, Auto2000, Carmudi, dan SSH Lombok Tengah/Sulawesi Selatan. Item tanpa harga tidak masuk total.</p>
    ${tb(["Provinsi", "Uang harian luar kota SBM 2026"], Object.entries(UH).map(([k, v]) => [esc(namaProv(k)), "Rp" + fmt(v)]), [1])}
    <p>Pemisahan sumber dana: APBD/instansi (alat yang kurang + operasional), Dana Siap Pakai BNPB (helikopter dan modifikasi cuaca, hanya saat status darurat), DIPA kementerian (Manggala Agni, tidak dihitung), dan kewajiban perusahaan (Permentan 5/2018).</p>
    ${h("Keterbatasan")}${ul(["Lokasi dari jarak garis lurus, bukan waktu tempuh jaringan jalan atau sungai.", "Posko permanen dihitung dari arsip VIIRS 2015 s.d. tahun berjalan; musim berjalan ikut mempengaruhi lokasi.", "Jumlah regu posko aju bergantung pada kompleks hari itu, jadi berubah tiap hari.", "Harga bertanda estimasi belum diverifikasi."])}`)}

  ${blok("8. Pangkalan udara: helikopter dan modifikasi cuaca", `${h("Data")}<p>Bandara, landasan perintis, helipad, dan pangkalan militer dari OurAirports (seluruh Indonesia) dan OpenStreetMap lewat Overpass (9 provinsi prioritas). Titik OSM yang < 2 km dari titik OurAirports dibuang. Pangkalan militer dikenali dari nama (lanud, lanal, TNI, air base, dan sejenisnya); bandara kecil dengan landasan tanah/rumput atau < 1.200 m dicatat sebagai landasan perintis.</p>
    ${h("Pangkalan helikopter water bombing (udara_rekom.py)")}${rumus(`Kandidat  = bandara besar/sedang/kecil atau pangkalan militer dengan landasan ≥ 800 m, boleh lintas provinsi (butuh Avtur)
Bobot     = (3 bila prioritas, 0,3 bila siaga) × max(1, px24)
Per provinsi, greedy maximal covering radius 100 km; berhenti bila ≥ 90% bobot terjangkau atau sudah 3 pangkalan
Waktu terbang = jarak rata-rata ke kompleks / 200 km/jam
Siklus siram  = 2,5 + 0,8 × jarak sumber air (km);  asumsi 5 km → 6,5 menit, ± 9,2 siraman per jam`)}
    <p>Kompleks prioritas yang > 100 km dari pangkalan terpilih diberi pangkalan aju: helipad, landasan perintis, atau bandara terdekat ≤ 60 km sebagai titik isi ulang; Avtur dikirim lewat darat.</p>
    ${h("Pangkalan modifikasi cuaca (OMC)")}<p>Satu per provinsi: bandara kandidat dengan landasan ≥ 1.000 m (CN-295 butuh ± 962 m) yang paling dekat ke pusat bobot kompleks siaga/prioritas.</p>
    ${h("Keterbatasan")}${ul(["Jarak sumber air 5 km adalah asumsi dari riset pemakaian bucket; belum memakai jarak nyata ke sungai/danau.", "Panjang landasan dari OurAirports atau tag OSM; banyak landasan OSM tanpa panjang.", "Helikopter dan OMC diminta lewat BNPB; platform hanya menyarankan lokasi."])}`)}

  ${blok("9. Model keputusan musim (tab Keputusan)", `${h("Tujuan")}<p>Membandingkan empat pilihan strategi satu musim per provinsi: A respons seperti biasa (pembanding), B pencegahan & serangan awal, C = B + sekat kanal, D = B + helikopter dan modifikasi cuaca. Data dasar dari <code>keputusan.py</code>; skenario dihitung di peramban.</p>
    ${h("Langkah 1: kalibrasi luas terbakar dari titik panas (keputusan.py)")}${rumus(`ln L = a_prov + b·ln N         L = luas terbakar (ha), N = titik VIIRS S-NPP sedang/tinggi setahun
b       = kemiringan OLS nasional dari 7 titik: 2015 (2.611.411 ha, Bank Dunia/KLHK) + 2018–2023 (jumlah luas resmi semua provinsi)
          (tanpa 2015, b = 1,27 dan tahun seperti 2015 dilebihkan 2 kali)
a_prov  = rata-rata (ln L_t − b·ln N_t), tahun 2018–2023 dengan L > 0 dan N > 0, minimal 4 tahun
σ_prov  = max(0,3; simpangan baku sisaan, pembagi n − 1)
s_prov  = rata-rata e^(sisaan)                       (faktor smearing)
L̂(N)   = e^(a_prov + b·ln max(N, 1)) · s_prov
Papua Selatan memakai luas KLHK "Papua" sebelum 2023 (sebelum pemekaran)`)}
    ${rumus(`L_ElNino = rata-rata L̂(N_t), t ∈ {2015, 2019, 2023}
L_normal = median L̂(N_t), t = tahun lalu lainnya sejak 2015 (jumlah genap: nilai tengah atas)
L_2026   = L̂( N_2026 / max(0,05; 1 − sisa) )
sisa     = [Σ rata-rata bulanan setelah bulan ini + (1 − tanggal/30)·rata-rata bulan ini] / Σ rata-rata bulanan`)}
    ${h("Langkah 2: masukan per provinsi")}${ul(["Porsi gambut g = bobot px24 kompleks berstatus ≥ patroli yang berada di gambut hari ini.", "Porsi langganan = porsi titik tahun-tahun lalu yang jatuh di kecamatan terbakar ≥ 3 tahun.", "Cakupan posko = porsi titik tahun-tahun lalu (di titik berat kecamatan) yang ≤ 30 km dari posko permanen.", "Paparan asap = pengali kasar per provinsi relatif rata-rata nasional (Riau dan Sumsel 1,5; Jambi 1,3; Kalsel 1,0; Kalbar 0,9; Kalteng 0,8; Kaltim 0,7; NTT 0,3; Papua Selatan 0,2), mengikuti Hein dkk. 2022 bahwa beban kesehatan terbesar di Sumatra. Ditandai sebagai asumsi."])}
    ${h("Langkah 3: hektare dicegah dan biaya tiap pilihan (Kp.hitung)")}${rumus(`Luas tahun ini L:
  deterministik: L = p·L_ElNino + (1 − p)·L_normal  (p bawaan 0,3);  rendah/tinggi = L·e^(∓1,28σ)  (persentil 10/90)
  simulasi:      tahun El Niño diundi dengan peluang p; L = median tahun itu · e^(σ·Z), Z ~ N(0, 1)

emisi/ha   = g·E_gambut + (1 − g)·E_mineral
manfaat/ha = faktor_marginal·(rugi_ekonomi + rugi_kesehatan·paparan_asap) + harga_karbon·emisi/ha

B  ΔMPA   = L · porsi_langganan · cakupan_MPA · ef_mpa
   api    = (L − ΔMPA) / ukuran_api
   regu   = posko_permanen · regu_per_posko
   serang = min(api · cakupan_posko,  regu · ${fmt(A.hari)} hari · api_per_regu_hari)
   ΔIA    = min((L − ΔMPA) · cakupan_posko,  serang · p_padam_awal · ukuran_api · porsi_tumbuh_dicegah)
   ΔB     = ΔMPA + ΔIA;    sisa = L − ΔB
C  p_bakar = p_bakar_dibasahi · min(1, L / L_ElNino)
   ΔC     = ΔB + min(sisa · g,  sekat · ha_per_sekat · p_bakar · ef_sekat)
D  jam    = heli · jam/hari · hari darurat   (asumsi aktif: ${fmt(A.heliUnit)} · ${fmt(A.heliJamHari)} · ${fmt(A.hariDarurat)} = ${fmt(A.heliUnit * A.heliJamHari * A.hariDarurat)} jam)
   ΔWB    = min(sisa,  jam / jam_heli_per_api · p_padam_heli · ukuran_api · porsi_tumbuh_dicegah)
   ΔD     = ΔB + ΔWB + (sisa − ΔWB) · ef_omc · min(1, hari_OMC / 12)       hari_OMC aktif: ${fmt(A.omcHari)}

Biaya per tahun, CRF(i, n) = i / (1 − (1 + i)^(−n)):
   B = Σ posko non-aju di provinsi (operasional + CRF(bunga, umur_alat)·alat)
       (posko permanen diskalakan regu_per_posko / regu posko itu) + desa·biaya_mpa_desa,
       desa = kecamatan_langganan · desa_per_kecamatan · cakupan_MPA
   C = B + sekat · biaya_sekat · (CRF(bunga, umur_sekat) + om_sekat)
   D = B + jam · biaya_heli_jam + hari_OMC · biaya_omc_hari

manfaat bersih = Δha · manfaat/ha − biaya;   ISPA dicegah = Δha · ispa_ha · paparan_asap;   emisi dicegah = Δha · emisi/ha`)}
    ${h("Langkah 4: ketidakpastian (Monte Carlo)")}<p>${fmt(Kp.n)} simulasi. Tiap simulasi mengundi semua parameter sekali dan memakainya untuk keempat pilihan (bilangan acak bersama), jadi selisih antarpilihan tidak tercampur derau. Parameter selain L diundi dari sebaran segitiga (rendah, tengah, tinggi):</p>
    ${rumus(`c = (tengah − rendah)/(tinggi − rendah),  u ~ U(0, 1)
x = rendah + √(u·(tinggi − rendah)·(tengah − rendah))          bila u < c
x = tinggi − √((1 − u)·(tinggi − rendah)·(tinggi − tengah))     selain itu`)}
    <p>Harga karbon tidak diundi karena pilihan kebijakan (pasar domestik, pajak karbon, atau biaya sosial global). Rentang 80% = persentil 10 dan 90 (nilai ke-⌊p·(n − 1)⌋ data terurut).</p>
    ${h("Langkah 5: aturan keputusan")}${rumus(`Setujui B   bila P(manfaat bersih B > 0) ≥ 70%
Setujui C   bila B disetujui dan P(manfaat bersih C − manfaat bersih B > 0) ≥ 70%
Setujui D   bila B disetujui dan P(manfaat bersih D − manfaat bersih B > 0) ≥ 70%
Pilihan terbaik: A bila B ditolak; D bila D disetujui dan (C ditolak atau tambahan D ≥ tambahan C pada nilai tengah); C; atau B`)}
    <p><b>Pagu</b>: bawaan = biaya B × 1,2 dibulatkan ke miliar; pilihan yang muat pagu dengan skor multikriteria tertinggi ditampilkan.</p>
    ${h("Langkah 6: multikriteria dan ketahanan peringkat (SMAA)")}${rumus(`Kriteria: manfaat bersih, ISPA dicegah, kekuatan bukti (A 1 · B 0,35 · C 0,7 · D 0,3)
skor_j = Σ_k w_k · (x_jk − min_k)/(max_k − min_k)        (1 bila semua pilihan sama),  w dinormalkan
Tiap simulasi: w_k ~ Gamma(max(0,05; 20·bobot_k/100)) lalu dinormalkan = Dirichlet
Bobot bawaan 50/20/30 → α = 10/4/6`)}
    <p>Peluang peringkat 1 hanya pembanding; keputusan memakai aturan tambahan biaya-manfaat di langkah 5.</p>
    ${h("Langkah 7: sensitivitas (tornado)")}<p>Untuk L dan tiap parameter, nilai rendah lalu tinggi dipasang sementara parameter lain di nilai tengah; dihitung manfaat bersih pilihan terbaik. Tujuh parameter dengan rentang terbesar ditampilkan.</p>
    ${h("Parameter (keputusan.json)")}<div id="mtParam"><div class="kosong"><div class="spin"></div>Memuat parameter…</div></div>
    ${h("Keterbatasan")}${ul(["Efektivitas MPA, serangan awal, dan water bombing belum punya bukti terukur di Indonesia; nilainya asumsi (ditandai).", "Kalibrasi luas hanya 6 tahun resmi per provinsi; σ dibatasi minimal 0,3.", "Luas El Niño dikalibrasi dari tiga El Niño kuat (2015, 2019, 2023), sedangkan peluang bawaan 0,3 mengikuti 7 dari 25 tahun termasuk El Niño lemah; tahun rata-rata cenderung dilebihkan.", "Hari OMC bawaan 0, jadi pilihan D bawaan hanya berisi helikopter.", "Paparan asap per provinsi adalah pengali kasar, belum hitungan penduduk terpapar searah angin.", "Biaya posko permanen diskalakan linear dengan jumlah regu, termasuk komponen tetap per posko."])}`)}

  ${blok("10. Simulasi penjalaran api", `${h("Tujuan")}<p>Menunjukkan arah dan urutan waktu penjalaran api 72 jam dari satu kompleks. Belum divalidasi untuk Indonesia, jadi luas tidak ditampilkan.</p>
    ${h("Data masukan")}${ul(["Benih = ≤ 80 deteksi 24 jam terakhir dengan FRP terbesar; bila tidak ada, sel di dalam lambung kompleks; bila tetap tidak ada, pusat kompleks.", "Cuaca per jam Open-Meteo Forecast (angin 10 m, arah, RH, hujan) di pusat kompleks, 73 jam mulai jam sekarang − 1, diambil peramban saat tombol ditekan. Bila gagal, angin/RH siang ini dipakai konstan tanpa hujan.", "ISI, BUI, DC, RH siang ini dari sel FWI kompleks."])}
    ${h("Algoritma (hitungSebaran)")}${rumus(`Kisi 220 × 220 sel, 120 m (26,4 km × 26,4 km), berpusat di pusat kompleks
Waktu tempuh minimum (Dijkstra) ke 16 arah tetangga (8 arah + 8 langkah kuda); berhenti di 72 jam
waktu antarsel = jarak / laju / 60 jam (laju m/menit), laju memakai cuaca pada jam keberangkatan

f(F) siang = ISI siang / (0,208·e^(0,05039·W siang))         f(F) dianggap tetap 72 jam
koreksi RH = min(1,4; max(0,35; 1 + (RH siang − RH jam itu)/60)) × (0,2 bila hujan jam itu > 1 mm)
ISI jam    = 0,208·e^(0,05039·W jam)·f(F)·koreksi;   ISI belakang memakai angin −W (FBP)
ROS        = a·(1 − e^(−b·ISI))^c · CF · [efek BUI]       (FBP Kanada, FCFDG 1992)
efek BUI (D-1) = e^(32·ln 0,90·(1/BUI − 1/32))
CF rumput  = 0,005·(e^(0,061·C) − 1) bila C < 58,8;  0,176 + 0,02·(C − 58,8) selain itu   (C = curing %)
Rasio panjang-lebar: rumput 1,1·W^0,464 (1 bila W < 1);  lainnya 1 + 8,729·(1 − e^(−0,030·W))^2,155
Elips: a = (kepala + belakang)/2,  b = a/LB,  x0 = belakang − a;  laju ke arah θ = akar positif persamaan elips`)}
    ${tb(["Bahan bakar", "a", "b", "c", "Catatan"], Object.values(BAHAN).map(b => [esc(b.n), b.a, b.b, b.c, esc(b.cat)]), [1, 2, 3])}
    <p>Bahan bakar bawaan: gambut bila kompleks di peta gambut; sabana untuk Papua Selatan, NTT, NTB, Maluku; selain itu rumput. Indonesia hanya punya adaptasi tipe rumput O-1 (dasar indikator ISI BMKG); semak memakai proksi D-1.</p>
    <p>Gambut: api bara bawah permukaan menjalar 2,7 cm/jam mendatar dan 0,8 cm/jam ke bawah (Graham dkk. 2022), jadi tidak berpindah antarsel 120 m dalam 72 jam. Peringatan bara muncul bila bahan bakar gambut dan DC > 350.</p>
    ${h("Keluaran")}<p>Peta waktu tiba (≤ 12, 12–24, 24–48, 48–72 jam), jangkauan terjauh 12/24/72 jam (jarak sel terbakar terjauh dari pusat kisi, yaitu pusat kompleks, bukan dari benih), laju kepala maksimum, dan arah angin dominan (rata-rata vektor). Bila api mencapai 2 sel dari tepi kisi, muncul peringatan.</p>
    ${h("Keterbatasan")}${ul(["Lereng dan peta bahan bakar belum dimasukkan; satu jenis bahan bakar untuk seluruh kisi.", "Tidak ada efek sekat bakar, sungai, jalan, atau pemadaman.", "f(F) siang dipakai 72 jam; siklus harian kadar air hanya didekati dengan koreksi RH.", "Belum ada uji balik terhadap perimeter api nyata."])}`)}

  ${blok("11. Lapisan cuaca, asap, hujan, angin, dan jarak pandang", `${tb(["Lapisan", "Data", "Cara hitung", "Warna / ambang"], [
      ["FWI", "fwi.json (bagian 2)", "1 piksel per sel 0,5°, dihaluskan peta", "kontinu: 0, 2, 7, 14, 25, 40"],
      ["Hujan", "fwi.json, hujan 24 jam sampai 12.00", "1 piksel per sel 0,5°", "1, 10, 30, 80 mm"],
      ["Angin", "fwi.json, angin dan arah jam 12.00", "partikel bergerak, interpolasi bilinear 4 sel; tanpa animasi (preferensi gerak dikurangi) = panah", "makin terang makin kencang"],
      ["Asap PM2.5", "CAMS (Copernicus) lewat Open-Meteo Air Quality API, kisi 1° darat dan laut (799 sel), 4 hari, waktu WIB", "PM2.5 = maksimum per jam dalam sehari; CO = rata-rata harian", "ISPU: ≤ 15,5 baik, ≤ 55,4 sedang, ≤ 150,4 tidak sehat, ≤ 250,4 sangat tidak sehat, &gt; 250,4 berbahaya (µg/m³)"],
      ["Jarak pandang bandara", "METAR aviationweather.gov (NOAA), 25 bandara, laporan 6 jam terakhir, yang terbaru per bandara", "statute mile × 1.609,34 m dibulatkan 100 m; \"10+\" = 9.999 m; tanda asap bila kode cuaca memuat FU (asap) atau HZ (kabut asap)", "&lt; 1 km, 1–5 km, 5–8 km, ≥ 8 km"],
      ["InaRISK", "BNPB ImageServer bahaya karhutla, raster 100 m, 0–1", "nilai di titik kompleks siaga/prioritas dan semua posko", "≤ 0,33 rendah, ≤ 0,66 sedang, &gt; 0,66 tinggi"]])}
    <p>Pilihan hari di garis waktu (hari ini + 3 hari) berlaku untuk FWI, hujan, angin, dan asap sekaligus. METAR di sumbernya terbit ± 30 menit, tetapi di platform hanya diambil sekali sehari bersama pipeline. Bandara tanpa laporan 6 jam terakhir tidak tampil.</p>`)}

  ${blok("12. Insight: cara menghitung angka di judul", `${tb(["Exhibit", "Angka di judul", "Cara hitung"], [
      ["Titik panas harian", "naik di X dari 9 provinsi", "per provinsi: jumlah 3 hari penuh terakhir (hari ini tidak dihitung) dibanding 3 hari sebelumnya, dari <code>wilayah.json</code> (hitungan resmi per hari WIB). Naik bila &gt; +10%"],
      ["Tahun berjalan vs normal", "X dari 9 provinsi di atas 1,5×; provinsi tertinggi", "MODIS Januari s.d. bulan ini tahun berjalan ÷ rata-rata periode sama tahun 2002 s.d. tahun lalu"],
      ["Periode berbahaya", "X provinsi masih berbahaya 30 hari ke depan; provinsi paling lama", "kalender musim (bagian 6): provinsi dengan p ≥ 0,3 di salah satu dari 3 dasarian mulai sekarang; paling lama = deret dasarian beruntun dengan p ≥ 0,3 mulai sekarang (dilihat 7 dasarian)"],
      ["Cuaca 4 hari", "X provinsi dengan FWI sangat tinggi / hujan &lt; 1 mm / PM2.5 &gt; 55 pada hari keempat", "FWI = maksimum sel provinsi; hujan = rata-rata sel; PM2.5 = maksimum sel asap yang sel FWI terdekatnya (≤ ± 0,77°) milik provinsi itu"],
      ["Laporan BNPB", "total lahan terbakar indikatif dan personel", "jumlah baris laporan BNPB hari itu, apa adanya"],
      ["Tahun demi tahun", "peringkat tahun berjalan; kelipatan rata-rata", "jumlah titik MODIS per tahun (9 provinsi atau satu provinsi); rata-rata = 2002 s.d. tahun lalu; rata-rata tahun El Niño vs biasa memakai 7 tahun El Niño bagian 6"],
      ["Luas terbakar satelit", "kelipatan luas tahun El Niño vs tahun biasa", "GWIS MCD64A1 per provinsi; tahun terakhir (belum final) tidak masuk rata-rata tahun biasa. Titik pembanding = luas resmi KLHK 2018–2023"],
      ["Kecamatan langganan api", "X kecamatan terbakar hampir setiap tahun", "12 atau 25 kecamatan dengan skor risiko riwayat tertinggi (bagian 5); dihitung yang tahun terbakarnya ≥ jumlah tahun − 2"]])}
    <p>Semua angka dihitung dari berkas data yang sama dengan tab lain; tidak ada angka ketikan tangan. Perbandingan "s.d. bulan ini" memakai bulan berjalan yang belum lengkap untuk tahun ini tetapi bulan penuh untuk tahun lalu, jadi di awal bulan rasionya cenderung rendah.</p>
    <p>Catatan pada exhibit luas: satelit cocok dengan angka resmi di tahun besar, tetapi hanya menangkap 0–30% di tahun sepi (api kecil dan gambut membara di bawah asap); untuk NTT satelit tidak bisa dipakai (savana, api kecil).</p>`)}

  ${blok("13. Sumber data", `${tb(["Data", "Penyedia / alamat", "Lisensi (seperti tercatat di repo)", "Resolusi", "Pembaruan di platform", "Berkas"], [
      ["Titik panas NRT", "NASA FIRMS area API (firms.modaps.eosdis.nasa.gov)", "tidak dicantumkan", "VIIRS 375 m, MODIS 1 km, per lintasan", "harian 21.20 WIB", "hotspot.json, hotspot72.json, kluster.json, wilayah.json"],
      ["Arsip titik panas VIIRS 2015–sekarang", "NASA FIRMS, arsip standar (SP) + NRT, S-NPP sedang/tinggi", "tidak dicantumkan", "375 m", "manual (firms.py, sejarah.py)", "sejarah.json"],
      ["Arsip titik panas MODIS 2002–sekarang", "NASA FIRMS, arsip standar + NRT, keyakinan ≥ 30", "tidak dicantumkan", "1 km", "manual", "sejarah_modis.json, musim.json (2002–2025)"],
      ["Cuaca per jam dan prakiraan 4 hari", "Open-Meteo Forecast API", "tidak dicantumkan", "diambil di titik tengah sel 0,5°", "harian", "fwi.json, fwi_state.json"],
      ["Reanalisis ERA5 (pemanasan FWI)", "Open-Meteo Archive API", "tidak dicantumkan", "titik tengah sel 0,5°", "saat sel baru atau keadaannya &gt; 8 hari", "fwi_state.json"],
      ["Angin per jam simulasi", "Open-Meteo Forecast API, dari peramban", "tidak dicantumkan", "titik pusat kompleks", "saat simulasi dijalankan", "–"],
      ["PM2.5 dan CO", "CAMS (Copernicus) lewat Open-Meteo Air Quality API", "tidak dicantumkan", "1°", "harian", "asap.json"],
      ["Laporan harian 6 provinsi", "BNPB gis.bnpb.go.id/karhutla2026", "tidak dicantumkan", "per provinsi", "harian", "bnpb.json"],
      ["Indeks bahaya karhutla", "InaRISK BNPB (gis.bnpb.go.id)", "tidak dicantumkan", "raster 100 m", "harian (di titik kompleks dan posko)", "inarisk.json"],
      ["Kantor BPBD & Pusdalops", "BNPB peta_bpbd; nomor pribadi pejabat tidak disimpan", "tidak dicantumkan", "titik", "harian (isi data lama, ± 2016, perlu dicek)", "bpbd.json"],
      ["Markas Daops Manggala Agni", "API SiPongi opsroom.sipongidata.my.id + geokode Nominatim (OSM)", "tidak dicantumkan", `titik; ${fmt(nKota)} dari ${fmt(nDaops)} lokasi perkiraan (kota), sisanya alamat`, "manual", "daops.json"],
      ["Batas provinsi, kab/kota, kecamatan", "kode Kemendagri (dari pangantara)", "tidak dicantumkan", "poligon disederhanakan", "tetap", "geo/"],
      ["Titik pusat desa", "cahyadsn/wilayah_boundaries, Kepmendagri 300.2.2-2430/2025", "MIT", "titik", "manual", "osm/desa.json"],
      ["Permukiman, sumber air, faskes", "OpenStreetMap lewat Overpass", "ODbL", "titik; sungai disampel tiap 1 km", "manual", "osm/&lt;provinsi&gt;.json (saat ini Kalsel)"],
      ["Bandara, landasan, helipad", "OurAirports + OpenStreetMap", "domain publik; ODbL", "titik", "manual", "udara.json"],
      ["METAR", "aviationweather.gov (NOAA)", "tidak dicantumkan", "25 bandara", "harian", "metar.json"],
      ["Gambut", "GFW Global peatland extent v20230315 (Miettinen dkk. 2016 + Gumbricht dkk. 2017)", "CC BY 4.0", "ubin z8 ± 600 m, sel 2 × 2 piksel ± 1,2 km (gambut bila ≥ 2 dari 4 piksel)", "manual", "lahan/gambut.geojson"],
      ["Konsesi sawit dan HPH", "GFW (data KLHK; sawit v20191031, data ± 2014). HTI belum ada", "Indonesia dikecualikan dari CC BY 4.0", "poligon disederhanakan", "manual", "lahan/konsesi.geojson"],
      ["Kawasan hutan", "KLHK versi 2017 lewat akun GFW di ArcGIS Online", "tidak dicantumkan", "poligon disederhanakan", "manual", "lahan/kawasan.geojson"],
      ["Luas terbakar resmi 2018–2023", "KLHK SiPongi, dikutip Tulisan Hukum JDIH BPK 2024", "tidak dicantumkan", "per provinsi per tahun", "tetap", "luas_resmi.json"],
      ["Luas terbakar satelit 2002–2025", "GWIS (EU JRC/Copernicus), MODIS MCD64A1 C6.1 per GADM 3.6", "CC BY 4.0", "per provinsi lama (Kaltim termasuk Kaltara; Papua lama)", "manual", "luas_satelit.json"],
      ["Peta dasar", "OpenFreeMap; citra Esri World Imagery (© Esri, Maxar, Earthstar)", "atribusi di peta", "ubin", "langsung", "–"],
      ["Foto Insight", "Wikimedia Commons", "per foto (CC BY-SA 4.0, CC BY 4.0, domain publik)", "–", "tetap", "img/kredit.json"],
      ["Harga satuan dan uang harian", "Tokopedia, Indotrading, INAPROC, Auto2000, Carmudi, SSH daerah; SBM 2026", "–", "per item", "tetap (di kode)", "index.html"],
      ["Parameter ekonomi dan efektivitas", "lihat tabel parameter bagian 9", "–", "–", "tetap (di kode)", "keputusan.json"]])}
    <p><b>Belum tersedia</b>: FWI resmi dan radar SRI/PAC 24H BMKG SPARTAN (perlu surat permintaan), daftar desa MPA KLHK Dit. PKHL (perlu surat permintaan), peta bahan bakar/tutupan lahan, burned area MODIS/VIIRS dari Earthdata, hujan satelit IMERG/GSMaP.</p>`)}

  ${blok("14. Peer review 12 Oktober 2026 dan keterbatasan", `<p>Temuan peninjau metode dan peninjau kode, beserta statusnya.</p>
    <div class="tw"><table><thead><tr><th>Temuan</th><th>Tingkat</th><th>Tindak lanjut</th></tr></thead><tbody>
    ${[["Cuaca (sel 55 km) bisa menurunkan api besar teramati menjadi 'patroli'; FWI kosong dianggap rendah", "kritis", "Diperbaiki: S3 minimal siaga; FWI kosong = 'tidak tersedia'", "l0"],
       ["Kenaikan kelas FFMC > 82 / ISI > 5 jenuh di musim kemarau; 'prioritas' 11% tidak bermakna", "kritis", "Diperbaiki: kenaikan dihapus; prioritas = front ≥ 15 piksel & FWI ≥ 7, dikalibrasi uji balik 2019/2023", "l0"],
       ["Uji balik: prioritas berkuota per Daops melewatkan 24–40% api besar dan berganti-ganti tiap hari", "kritis", "Diperbaiki: kuota dibuang, skor hanya untuk urutan", "l0"],
       ["Anggaran Rp9,2 T: beli kendaraan tiap regu, dihitung ulang harian, hitung ganda heli", "kritis", "Diperbaiki: sewa kendaraan, posko permanen per musim, DSP BNPB terpisah, personel per jenis", "l0"],
       ["'Tidak ada titik' dianggap aman; umur dihitung dari data, bukan jam", "kritis", "Diperbaiki: status 'tidak teramati', gambut kering 7 hari, peringatan data basi", "l0"],
       ["Jendela FIRMS hanya 5,3 hari (DATE = tanggal awal)", "tinggi", "Diperbaiki: dua jendela 5 hari, dipotong 7 × 24 jam", "l0"],
       ["Indeks DBSCAN melewatkan tetangga di lintang > 3,4°", "sedang", "Diperbaiki: sel indeks pada cos 12°; ST-DBSCAN 48 jam, eps menurut ukuran piksel", "l0"],
       ["FWI dimulai ulang tiap hari dari nilai awal 92 hari; DC terpotong", "major", "Diperbaiki: keadaan disimpan harian, pemanasan ERA5 300 hari", "l0"],
       ["Hujan model lemah di tropis; berbeda dengan SPARTAN BMKG", "major", "Antre: hujan IMERG/GSMaP, ambil lapisan SPARTAN resmi", "l2"],
       ["Simulasi menampilkan hektare tanpa validasi; benih lambung 7 hari", "major", "Diperbaiki sebagian: hektare disembunyikan, benih titik 24 jam. Antre: peta bahan bakar, model rumput Cheney, uji balik", "l2"],
       ["Posko jarak garis lurus; rata-rata simpul bisa jatuh di rawa", "major", "Diperbaiki sebagian: titik berat luas, posko permanen per musim. Antre: waktu tempuh jaringan jalan/sungai", "l2"],
       ["Kalbar 2× angka BNPB belum terjelaskan", "major", "Antre: rekonsiliasi per sensor dengan SiPongi", "l2"],
       ["'Titik kemarin' kartu prioritas salah ambil hari; koefisien BUI D-1", "rendah", "Diperbaiki", "l0"]]
      .map(([a, b, c, w]) => `<tr><td style="white-space:normal">${a}</td><td>${b}</td><td style="white-space:normal"><span class="pill ${w}">${w === "l0" ? "selesai" : "antre"}</span> ${c}</td></tr>`).join("")}</tbody></table></div>
    ${h("Keterbatasan yang masih berlaku")}${ul([
      "Titik panas tidak melihat api di bawah awan atau asap tebal; status 'tidak teramati' bukan bukti padam.",
      "Angka titik panas platform belum cocok dengan BNPB untuk Kalbar dan Riau.",
      "Cuaca dari model 0,5° dengan hujan model; belum dibandingkan dengan FWI resmi BMKG.",
      "Ambang prioritas 15 piksel adalah penyesuaian dari uji balik S-NPP, belum diuji ulang dengan 3 satelit.",
      "Indeks risiko riwayat belum diuji terhadap luas terbakar resmi.",
      "Lokasi posko dan pangkalan memakai jarak garis lurus; lapisan sumber air dan faskes baru lengkap di satu provinsi.",
      "Lapisan lahan berumur: kawasan hutan 2017, konsesi ± 2014, HTI belum ada; status lahan wajib dipastikan ke KPH/ATR.",
      "Model keputusan bertumpu pada parameter efektivitas yang sebagian besar asumsi; hasilnya untuk membandingkan pilihan, bukan meramal luas.",
      "Simulasi penjalaran belum divalidasi dan tidak memakai peta bahan bakar, lereng, atau pemadaman.",
      "Harga satuan bertanda estimasi belum diverifikasi ke e-Katalog atau SSH."])}`)}`;

  $("#metode").querySelectorAll(".fold > button").forEach(b => b.onclick = () => { const buka = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", buka); nanti(() => b.nextElementSibling.hidden = !buka); });

  /* tabel parameter dan kalibrasi per provinsi, langsung dari keputusan.json */
  const NAMA = {rugi_ekonomi_ha: "Kerugian ekonomi per ha", rugi_kesehatan_ha: "Kerugian kesehatan per ha", ispa_ha: "Kasus ISPA per ha", emisi_gambut_ha: "Emisi gambut per ha",
    emisi_mineral_ha: "Emisi tanah mineral per ha", harga_karbon: "Harga karbon", ef_mpa: "Efektivitas MPA", ef_sekat: "Efektivitas sekat kanal", ha_per_sekat: "Luas basah per sekat",
    umur_sekat: "Umur sekat", faktor_marginal: "Nilai api kecil vs rata-rata", ukuran_api: "Ukuran akhir satu api", api_per_regu_hari: "Api diserang per regu per hari",
    p_padam_awal: "Peluang tertahan bila diserang dini", porsi_tumbuh_dicegah: "Porsi luas yang tak sempat terbakar", regu_per_posko: "Regu per posko permanen",
    jam_heli_per_api: "Jam heli per api", p_padam_heli: "Peluang tertahan oleh water bombing", ef_omc: "Efektivitas modifikasi cuaca", biaya_sekat: "Biaya sekat",
    p_bakar_dibasahi: "Peluang lahan basah terbakar", om_sekat: "Perawatan sekat per tahun", bunga: "Tingkat diskonto", umur_alat: "Umur alat", biaya_mpa_desa: "Biaya MPA per desa",
    desa_per_kecamatan: "Desa per kecamatan", biaya_heli_jam: "Biaya helikopter per jam", biaya_omc_hari: "Biaya OMC per hari"};
  const ang = x => typeof x !== "number" ? esc(x) : x >= 1e5 ? rp(x) : x.toLocaleString("id-ID", {maximumFractionDigits: 3});
  const pc = x => x == null ? "–" : Math.round(x * 100) + "%";
  (Kp.d ? Promise.resolve(Kp.d) : muatJSON("data/keputusan.json")).then(K => {
    const el = $("#mtParam"); if (!el) return;
    el.innerHTML = `<p>Berkas dibuat ${esc(K.dibuat)}. Kemiringan log-log nasional b = ${ang(K.b_loglog)}. Tahun El Niño untuk kalibrasi luas: ${(K.el_nino || []).map(esc).join(", ")}. Tiap parameter tercatat [tengah, rendah, tinggi, satuan, sumber, catatan]; catatan "lemah" atau sumber "ASUMSI" = belum ada bukti terukur.</p>
      ${tb(["Parameter", "Tengah", "Rendah", "Tinggi", "Satuan", "Sumber", "Catatan"], Object.entries(K.param).map(([k, v]) => [`${esc(NAMA[k] || k)}<br><small style="color:var(--ink2)"><code>${esc(k)}</code></small>`, ang(v[0]), ang(v[1]), ang(v[2]), esc(v[3]), esc(v[4]), esc(v[5] || "")]), [1, 2, 3])}
      ${h("Kalibrasi dan masukan per provinsi")}
      ${tb(["Provinsi", "Tahun kalibrasi", "σ log", "L normal (ha)", "L El Niño (ha)", "L 2026 (ha)", "Titik 2026", "Sisa musim", "Porsi gambut", "Porsi langganan", "Posko permanen", "Cakupan posko", "Kec. langganan", "Paparan asap"],
        Object.values(K.prov).map(P => [esc(P.nama), fmt(P.tahun_kalibrasi), ang(P.sigma_log), fmt(P.luas_normal), fmt(P.luas_el_nino), fmt(P.luas_2026), fmt(P.titik_ini), pc(P.sisa_musim), pc(P.porsi_gambut), pc(P.porsi_langganan), fmt(P.posko_permanen), pc(P.cakupan_posko), fmt(P.kecamatan_langganan), ang(P.paparan_asap)]),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])}`;
  }).catch(() => { const el = $("#mtParam"); if (el) el.innerHTML = `<p>keputusan.json belum tersedia. Daftar parameter ada di <code>scripts/data/keputusan.py</code> (PARAM).</p>`; });
}
