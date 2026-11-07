/* MB-2 Jam Aturan: fungsi murni atas jam_aturan.json (ALGORITMA §3, DT §4.2).
   Angka tenggat dan ambang hanya hidup di JSON itu; skrip dan layar membaca lewat kunci.
   Tafsir kita (bukan pasal): "N hari" = tanggal WIB + N hari kalender; "N hari kerja" = Senin-Jumat sesudah tanggal mulai, minus libur_nasional;
"N bulan" = tanggal sama N bulan kemudian, dipangkas ke hari terakhir bulan;
   "N tahun" = 12 x N bulan; "x 24 jam" dari cap waktu; tanggal diturunkan di WIB (UTC+7). */

/* Data ditulis literal (tanpa import JSON/fetch/top-level await) supaya termuat sama di Node, Miniflare, Worker, peramban.
   Kembarannya jam_aturan.json (Python + gerbang G-1); uji unit_kembar menjaga keduanya sama. Sunting KEDUANYA. */
export const ATURAN = [
  {"kunci":"kaji_awal","jenis":"tenggat","nilai":24,"satuan":"jam","sejak":"tiba di lokasi kejadian","acuan":"juklak-3-2022","letak":"hal. 16","kutipan":"paling lambat 1 x 24 jam setelah tiba di lokasi kejadian","asumsi":false,"catatan":"Dihitung dari cap waktu, bukan tanggal. Sampai WIL-3 menyimpan waktu tiba, meja memakai waktu catat sebagai pengganti."},
  {"kunci":"kaji_lanjutan","jenis":"tenggat","nilai":72,"satuan":"jam","sejak":"tiba di lokasi kejadian","acuan":"juklak-3-2022","letak":"hal. 16","kutipan":"paling lambat 3 x 24 jam setelah tiba di lokasi kejadian","asumsi":false,"catatan":"3 x 24 jam ditulis 72 jam; dihitung dari cap waktu."},
  {"kunci":"dsp_laporan_perkembangan","jenis":"tenggat","nilai":5,"satuan":"tanggal_bulan_berikut","sejak":"BPP BNPB/BPBD menerima pemindahbukuan DSP, lalu tiap bulan","acuan":"perban-4-2020","letak":"Pasal 21 ayat (1)","kutipan":"paling lambat setiap tanggal 5 (lima) bulan berikutnya","asumsi":false,"catatan":"Selalu bulan berikutnya, walau tanggal mulai jatuh sebelum tanggal 5: cair 2026-01-05 memberi 2026-02-05."},
  {"kunci":"dsp_spj","jenis":"tenggat","nilai":3,"satuan":"bulan","sejak":"masa status keadaan darurat bencana berakhir","acuan":"perban-4-2020","letak":"Pasal 21 ayat (2)","kutipan":"paling lambat 3 (tiga) bulan setelah masa status keadaan darurat bencana berakhir","asumsi":false,"catatan":"Tafsir kita: tanggal yang sama N bulan kemudian, dipangkas ke hari terakhir bulan bila tanggalnya tidak ada (2025-11-30 + 3 bulan = 2026-02-28)."},
  {"kunci":"renkon_berlaku","jenis":"tenggat","nilai":3,"satuan":"tahun","sejak":"penetapan","acuan":"perban-2-2023","letak":"Pasal 21 ayat (1)","kutipan":"berlaku untuk jangka waktu 3 (tiga) tahun","asumsi":false,"catatan":"Tafsir kita: 12 x N bulan dengan pangkas akhir bulan (2024-02-29 + 3 tahun = 2027-02-28). Pemutakhiran memperbarui masa berlaku (ayat 5)."},
  {"kunci":"renkon_reviu","jenis":"tenggat","nilai":6,"satuan":"bulan","sejak":"penetapan atau reviu terakhir","acuan":"perban-2-2023","letak":"Pasal 21 ayat (2)","kutipan":"paling sedikit 6 (enam) bulan sekali","asumsi":false,"catatan":"Pasal berbunyi 'dapat dilakukan reviu secara berkala'; kita memperlakukannya sebagai tanda kerja, bukan kewajiban hukum. Pangkas akhir bulan seperti dsp_spj."},
  {"kunci":"destana_penilaian","jenis":"tenggat","nilai":3,"satuan":"tahun","sejak":"penilaian terakhir","acuan":"perban-7-2025","letak":"Pasal 14 ayat (5)","kutipan":"paling sedikit setiap 3 (tiga) tahun","asumsi":false,"catatan":"Pasal 14 ayat (1) berbunyi 'dapat dilakukan' penilaian; ayat (5) menetapkan jarak paling sedikit 3 tahun."},
  {"kunci":"logistik_setuju_jam","jenis":"ambang","nilai":24,"satuan":"jam","sejak":"permintaan logistik diajukan","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Tanda internal meja, tidak ada pasalnya."},
  {"kunci":"renkon_segera_hari","jenis":"ambang","nilai":90,"satuan":"hari","sejak":"sisa masa berlaku renkon","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Tanda internal: renkon berstatus segera_habis bila sisa masa berlaku tinggal 90 hari. Tidak ada pasalnya."},
  {"kunci":"destana_pasif_bulan","jenis":"ambang","nilai":12,"satuan":"bulan","sejak":"aktivitas terakhir desa/kelurahan tangguh bencana","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Tanda internal (riset/2 temuan 5), tidak ada pasalnya."},
  {"kunci":"rehab_macet_hari","jenis":"ambang","nilai":60,"satuan":"hari","sejak":"perkembangan terakhir rehabilitasi","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Tanda internal meja, tidak ada pasalnya."},
  {"kunci":"kaji_mulai","jenis":"tenggat","nilai":24,"satuan":"jam","sejak":"informasi diterima","acuan":"juklak-3-2022","letak":"hal. 7","kutipan":"Kaji cepat dilakukan paling lambat 1 x 24 jam setelah informasi","asumsi":false,"catatan":"Dihitung dari cap waktu, bukan tanggal."},
  {"kunci":"trc_bergerak","jenis":"tenggat","nilai":24,"satuan":"jam","sejak":"perintah penugasan diterima","acuan":"juklak-3-2022","letak":"hal. 8","kutipan":"Paling lambat 1 x 24 jam setelah perintah penugasan diterima","asumsi":false,"catatan":"Dihitung dari cap waktu, bukan tanggal."},
  {"kunci":"dsp_laporan_kejadian","jenis":"tenggat","nilai":3,"satuan":"hari","sejak":"terjadinya ancaman atau kejadian bencana","acuan":"perban-4-2020","letak":"Pasal 4","kutipan":"paling lambat 3 (tiga) hari sejak terjadinya ancaman atau kejadian Bencana","asumsi":false,"catatan":"Tanggal WIB kejadian + 3 hari kalender; laporan di hari tenggat masih tepat waktu."},
  {"kunci":"r3p","jenis":"tenggat","nilai":90,"satuan":"hari","sejak":"mulai tanggap darurat (hari-0)","acuan":"perban-5-2017","letak":"Pasal 2 ayat (2) dan (3)","kutipan":"paling lama 90 (sembilan puluh) hari","asumsi":false,"catatan":"Hari-0 + 90 hari kalender."},
  {"kunci":"destana_evaluasi","jenis":"tenggat","nilai":1,"satuan":"tahun","sejak":"evaluasi terakhir (berulang)","acuan":"perban-7-2025","letak":"Pasal 19 ayat (2)","kutipan":"minimal 1 (satu) kali dalam kurun waktu 1 (satu) tahun","asumsi":false},
  {"kunci":"ews_evaluasi","jenis":"tenggat","nilai":4,"satuan":"bulan","sejak":"evaluasi terakhir (berulang)","acuan":"perban-2-2024","letak":"Pasal 29 ayat (1)","kutipan":"minimal 1 (satu) kali dalam kurun waktu 4 (empat) bulan","asumsi":false},
  {"kunci":"ews_rapat_platform","jenis":"tenggat","nilai":1,"satuan":"tahun","sejak":"rapat terakhir (berulang)","acuan":"perban-2-2024","letak":"Pasal 9 ayat (4)","kutipan":"paling sedikit 1 (satu) kali dalam 1 (satu) tahun","asumsi":false},
  {"kunci":"pengungsi_mutakhir","jenis":"tenggat","nilai":1,"satuan":"hari","sejak":"pembaruan data terakhir","acuan":"juknis-9-2023","letak":"hal. 10","kutipan":"pembaharuan data Pengungsi terpilah setiap hari","asumsi":false,"catatan":"Pasal tidak memuat angka tenggat; \"setiap hari\" ditafsir 1 hari sejak pembaruan terakhir."},
  {"kunci":"klaster_logistik_mutakhir","jenis":"tenggat","nilai":3,"satuan":"bulan","sejak":"laporan terakhir","acuan":"juklak-16-2025","letak":"hal. 15","kutipan":"per triwulan/ 3 (tiga) bulan","asumsi":false},
  {"kunci":"hibah_rr_lapor","jenis":"tenggat","nilai":3,"satuan":"bulan","sejak":"SPPH diterbitkan, lalu tiap tiga bulan","acuan":"juklak-9-2024","letak":"hal. 9","kutipan":"setiap tiga bulan sejak SPPH diterbitkan dan paling lambat 15 (lima belas) hari kalender setelah berakhirnya setiap tahapan","asumsi":false,"catatan":"Dua aturan dalam satu kalimat: tiap 3 bulan sejak SPPH, dan paling lambat 15 hari kalender setelah tahap berakhir (angka 15 dicatat di sini, belum jadi kunci sendiri)."},
  {"kunci":"tlhp","jenis":"tenggat","nilai":60,"satuan":"hari","sejak":"laporan hasil pemeriksaan diterima","acuan":"pedoman-1-2025","letak":"BAB II (hal. 5)","kutipan":"paling lambat 60 (enam puluh) hari setelah laporan hasil pemeriksaan diterima","asumsi":false},
  {"kunci":"pengaduan_berkadar","jenis":"tenggat","nilai":20,"satuan":"hari_kerja","sejak":"pengaduan diterima","acuan":"juklak-5-2025","letak":"BAB III (hal. 10)","kutipan":"dalam jangka waktu 20 (dua puluh) hari kerja sejak pengaduan diterima","asumsi":false,"catatan":"Hari kerja tanpa daftar libur nasional selama libur_nasional kosong (tafsir kita)."},
  {"kunci":"pengaduan_tak_berkadar","jenis":"tenggat","nilai":15,"satuan":"hari_kerja","sejak":"pengaduan diterima","acuan":"juklak-5-2025","letak":"BAB III (hal. 10)","kutipan":"dalam jangka waktu 15 (lima belas) hari kerja sejak pengaduan diterima","asumsi":false,"catatan":"Hari kerja tanpa daftar libur nasional selama libur_nasional kosong (tafsir kita)."},
  {"kunci":"laporan_pelatihan","jenis":"tenggat","nilai":7,"satuan":"hari_kerja","sejak":"kegiatan pelatihan berakhir","acuan":"perban-2-2025","letak":"Pasal 14 ayat (3)","kutipan":"paling lambat 7 (tujuh) hari kerja setelah berakhirnya kegiatan pelatihan","asumsi":false,"catatan":"Hari kerja tanpa daftar libur nasional selama libur_nasional kosong (tafsir kita)."},
  {"kunci":"jf_jp_tahun","jenis":"standar","nilai":20,"satuan":"jp_per_tahun","sejak":"tahun kalender","acuan":"perban-4-2025","letak":"Pasal 40","kutipan":"paling sedikit 20 (dua puluh) jam pelajaran dalam 1 (satu) tahun","asumsi":false},
  {"kunci":"rpbd_monev","jenis":"tenggat","nilai":1,"satuan":"tahun","sejak":"pemantauan dan evaluasi terakhir (berulang)","acuan":"perban-3-2026","letak":"Pasal 47 ayat (2)","kutipan":"dilaksanakan paling sedikit 1 (satu) kali dalam 1 (satu) tahun","asumsi":false},
  {"kunci":"stok_minimal_jam","jenis":"standar","nilai":72,"satuan":"jam","sejak":"keadaan darurat bencana ditetapkan","acuan":"perka-23-2014","letak":"Pasal 1 angka 15","kutipan":"kurun waktu 72 jam pertama sejak keadaan darurat bencana ditetapkan","asumsi":false},
  {"kunci":"stok_pr_umum","jenis":"standar","nilai":1,"satuan":"persen","sejak":"jumlah penduduk","acuan":"perka-23-2014","letak":"Pasal 12 ayat (2)","kutipan":"1% dari jumlah penduduk","asumsi":false},
  {"kunci":"stok_pr_khusus","jenis":"standar","nilai":4,"satuan":"persen","sejak":"jumlah penduduk","acuan":"perka-23-2014","letak":"Pasal 14 ayat (2)","kutipan":"4% dari jumlah penduduk","asumsi":false},
  {"kunci":"stok_jiwa_per_paket","jenis":"standar","nilai":4,"satuan":"jiwa_per_paket","sejak":"rumus kebutuhan","acuan":"perka-23-2014","letak":"Pasal 11 huruf b, c; Pasal 13","kutipan":"Jumlah Penduduk x Prosentase x Hari/ 4 Jiwa","asumsi":false},
  {"kunci":"std_beras_kg","jenis":"standar","nilai":0.4,"satuan":"kg_orang_hari","sejak":"per orang","acuan":"perka-7-2008","letak":"Lampiran hal. 9","kutipan":"beras 400 gram per orang per hari","asumsi":false},
  {"kunci":"std_air_minum_l","jenis":"standar","nilai":2.5,"satuan":"l_orang_hari","sejak":"per orang","acuan":"perka-7-2008","letak":"Lampiran hal. 12","kutipan":"air minum diberikan sejumlah 2.5 liter per orang per hari","asumsi":false},
  {"kunci":"std_air_bersih_l","jenis":"standar","nilai":15,"satuan":"l_orang_hari","sejak":"buka tempat pengungsian","acuan":"perka-7-2008","letak":"Lampiran hal. 12","kutipan":"7 liter pada tiga hari pertama, selanjutnya 15 liter per orang per hari","asumsi":false,"catatan":"nilai = takaran sesudah 3 hari pertama; takaran awal ada di medan awal.","awal":{"nilai":7,"hari":3}},
  {"kunci":"std_hunian_m2","jenis":"standar","nilai":3,"satuan":"m2_orang","sejak":"per orang","acuan":"perka-7-2008","letak":"Lampiran hal. 7","kutipan":"3 (tiga) meter persegi per orang","asumsi":false},
  {"kunci":"std_jamban_jiwa","jenis":"standar","nilai":20,"satuan":"orang_per_unit","sejak":"per jamban","acuan":"juklak-3-2022","letak":"Lampiran hal. 24","kutipan":"1 jamban/20 orang","asumsi":false},
  {"kunci":"std_sabun_kg","jenis":"standar","nilai":0.25,"satuan":"kg_orang_bulan","sejak":"per orang","acuan":"perka-7-2008","letak":"Lampiran hal. 11","kutipan":"250 gram sabun mandi setiap bulan","asumsi":false},
  {"kunci":"std_sampah_kk","jenis":"standar","nilai":3,"satuan":"kk_per_unit_per_3hari","sejak":"per kantong sampah","acuan":"juklak-3-2022","letak":"Lampiran hal. 25","kutipan":"untuk 3 (tiga) keluarga selama 3 (tiga) hari","asumsi":false,"catatan":"1 kantong untuk 3 keluarga per 3 hari."},
  {"kunci":"masa_status_kab","jenis":"tenggat","nilai":14,"satuan":"hari","sejak":"penetapan status keadaan darurat","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Pedoman non-JDIH: Pedoman Penetapan Status 2016, bukan dokumen JDIH (riset/3 sec 2). Batas atas rentang 7-14 hari."},
  {"kunci":"masa_status_prov","jenis":"tenggat","nilai":1,"satuan":"bulan","sejak":"penetapan status keadaan darurat","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Pedoman non-JDIH: Pedoman Penetapan Status 2016, bukan dokumen JDIH (riset/3 sec 2). Batas atas rentang 14 hari sampai 1 bulan."},
  {"kunci":"masa_status_nas","jenis":"tenggat","nilai":3,"satuan":"bulan","sejak":"penetapan status keadaan darurat","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Pedoman non-JDIH: Pedoman Penetapan Status 2016, bukan dokumen JDIH (riset/3 sec 2). Batas atas rentang 1 sampai 3 bulan."},
  {"kunci":"hibah_logpal_lapor","jenis":"tenggat","nilai":12,"satuan":"bulan","sejak":"BAST","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Juklak 3/2024 tidak menyebut angka (riset/4 Q4); 12 bulan sesudah BAST adalah angka internal."},
  {"kunci":"hibah_kedaluwarsa_hari","jenis":"ambang","nilai":[90,30],"satuan":"hari","sejak":"hibah mendekati kedaluwarsa","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Peringatan internal: dua tingkat, 90 hari lalu 30 hari sebelum kedaluwarsa. Tidak ada pasalnya."},
  {"kunci":"ikd_ambang_kelas","jenis":"ambang","nilai":[0.4,0.8],"satuan":"skala","sejak":"skor IKD","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"riset/1 sec 1.5, tidak ada di korpus. Batas kelas rendah/sedang 0,40 dan sedang/tinggi 0,80."},
  {"kunci":"ews_radius_sirine_km","jenis":"ambang","nilai":2,"satuan":"km","sejak":"lokasi sirine EWS","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Hipotesis jangkau dengar (riset/2 PD-2), tidak ada pasalnya."},
  {"kunci":"evakuasi_jarak_km","jenis":"ambang","nilai":{"tsunami":1,"banjir":2,"erupsi":2},"satuan":"km","sejak":"jarak ke titik kumpul per bahaya","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"riset/2 KS-3, belum dicek ke pedoman TES. Tidak ada pasalnya."},
  {"kunci":"pr_risiko_rentang","jenis":"ambang","nilai":[1,4],"satuan":"persen","sejak":"skenario ketiga stok PLP-1","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Penjepit skenario ketiga PLP-1 antara persentase umum (1%) dan khusus (4%); bukan angka pasal."},
  {"kunci":"jam_dekat_hari","jenis":"ambang","nilai":30,"satuan":"hari","sejak":"sisa hari ke tenggat","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Ambang pil \"dekat\" pada .un-jam (DS sec 5.2.3). Tanda internal."},
  {"kunci":"sk_gabung_hari","jenis":"ambang","nilai":14,"satuan":"hari","sejak":"perpanjangan status darurat","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Pola perpanjangan di status_darurat.json; tanda internal."},
  {"kunci":"r3p_layak_rumah","jenis":"ambang","nilai":100,"satuan":"rumah","sejak":"rusak berat + rusak sedang","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Ambang internal riset/5 D1 (RB + RS). Tidak ada pasalnya."},
  {"kunci":"tarif_stimulan_juta","jenis":"ambang","nilai":{"RB":60,"RS":30,"RR":15},"satuan":"juta","sejak":"per unit rumah rusak","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Rilis 2023-2024; Juklak 5/2024 tidak ada di korpus (riset/5 sec 1)."},
  {"kunci":"libur_nasional","jenis":"kalender","nilai":[],"satuan":"tanggal","sejak":"daftar tanggal ISO libur nasional","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Daftar libur nasional BELUM diisi (tidak ada di repo; tidak dikarang). Isi dengan tanggal ISO dari SKB libur; sampai terisi, hari_kerja hanya melewati Sabtu-Minggu dan hasilnya berlabel asumsi."},
  {"kunci":"kalender_tanpa_libur","jenis":"kalender","nilai":true,"satuan":"bendera","sejak":"libur_nasional","acuan":null,"letak":null,"kutipan":null,"asumsi":true,"catatan":"Benar selama libur_nasional kosong; uji unit_kembar menjaga keduanya konsisten. Dasar label asumsi pada keluaran hari_kerja."},
];

export const SATUAN = ["jam", "hari", "hari_kerja", "hari_kalender", "bulan", "tahun", "tanggal_bulan_berikut",
  "kg_orang_hari", "l_orang_hari", "m2_orang", "orang_per_unit", "kk_per_unit_per_3hari", "kg_orang_bulan", "persen", "jiwa_per_paket", "jp_per_tahun",
  "km", "rumah", "juta", "skala", "tanggal", "bendera"]; // enam terakhir: ambang & kalender RU-015 (ALGORITMA 3.1 "dan seterusnya")

/* Berkas rusak ditolak saat dimuat, bukan saat dipakai. */
export function periksa(daftar) {
  const ada = new Set();
  for (const e of daftar) {
    if (ada.has(e.kunci)) throw new Error(`Jam Aturan: kunci kembar ${e.kunci}`);
    ada.add(e.kunci);
    if (!SATUAN.includes(e.satuan)) throw new Error(`Jam Aturan: satuan "${e.satuan}" di kunci ${e.kunci} tidak sah`);
    if (e.asumsi && !e.catatan) throw new Error(`Jam Aturan: kunci ${e.kunci} asumsi tanpa catatan`);
    if (!e.asumsi && !(e.acuan && e.kutipan)) throw new Error(`Jam Aturan: kunci ${e.kunci} bukan asumsi tapi tanpa acuan/kutipan`);
  }
  return daftar;
}
periksa(ATURAN);

export function aturan(kunci) {
  const e = ATURAN.find((x) => x.kunci === kunci);
  if (!e) throw new Error(`Jam Aturan: kunci tidak dikenal ${kunci}`);
  return e;
}
export const nilai = (kunci) => aturan(kunci).nilai;

/* standar(kunci): takaran kebutuhan (std_*, stok_*, jf_jp_tahun); kunci lain ditolak supaya tenggat/ambang tak terbaca sebagai takaran. */
export function standar(kunci) {
  const e = aturan(kunci);
  if (e.jenis !== "standar") throw new Error(`Jam Aturan: ${kunci} bukan standar (jenis ${e.jenis})`);
  return { nilai: e.nilai, satuan: e.satuan, ...(e.awal ? { awal: e.awal } : {}), asumsi: !!e.asumsi };
}

/* Daftar libur nasional (tanggal ISO) hidup di entri libur_nasional; kosong = hari_kerja tanpa libur, berlabel asumsi. */
const LIBUR = aturan("libur_nasional").nilai;

const WIB = 7 * 3600e3;
const hariDalamBulan = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m 1..12
const iso = (y, m, d) => `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function tanggalSah(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= hariDalamBulan(y, mo) ? [y, mo, d] : null;
}
const CAP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const capMs = (s) => (typeof s === "string" && CAP.test(s) ? Date.parse(s) : NaN);

/* tanggal WIB [y,m,d] dari tanggal ISO atau cap waktu bersel zona */
function tanggalWib(mulai) {
  if (typeof mulai !== "string") return null;
  const t = tanggalSah(mulai);
  if (t) return t;
  const ms = capMs(mulai);
  if (Number.isNaN(ms)) return null;
  const w = new Date(ms + WIB);
  return [w.getUTCFullYear(), w.getUTCMonth() + 1, w.getUTCDate()];
}

function tambahBulan([y, m, d], n) {
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  return iso(ny, nm, Math.min(d, hariDalamBulan(ny, nm)));
}

const tidak = (alasan) => ({ hasil: null, alasan, asumsi: false });

const tglUtc = ([y, m, d]) => new Date(Date.UTC(y, m - 1, d));
const isoUtc = (x) => iso(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
function tambahHari(t, n) { const x = tglUtc(t); x.setUTCDate(x.getUTCDate() + n); return isoUtc(x); }

/* n hari kerja SESUDAH tanggal t: Senin-Jumat dikurangi libur (tanggal ISO). Libur dioper supaya bisa diuji tanpa daftar sungguhan. */
export function hariKerja(t, n, libur = LIBUR) {
  const x = tglUtc(typeof t === "string" ? tanggalSah(t) : t); // t: "YYYY-MM-DD" atau [y,m,d]
  for (let sisa = n; sisa > 0;) {
    x.setUTCDate(x.getUTCDate() + 1);
    const dow = x.getUTCDay();
    if (dow !== 0 && dow !== 6 && !libur.includes(isoUtc(x))) sisa--;
  }
  return isoUtc(x);
}

/* tenggat(kunci, mulai) -> {hasil, alasan, asumsi}
   jam: mulai = cap waktu bersel zona; hasil cap waktu +07:00. Satuan lain: tanggal atau cap waktu; hasil tanggal ISO (WIB).
   Tanggal kosong atau tidak sah memberi hasil null dan alasan, bukan 1970. */
export function tenggat(kunci, mulai) {
  const e = ATURAN.find((x) => x.kunci === kunci);
  if (!e) return tidak(`kunci tidak dikenal: ${kunci}`);
  if (e.jenis !== "tenggat") return tidak(`${kunci} berjenis ${e.jenis}, bukan tenggat`);
  const ok = (hasil) => ({ hasil, alasan: null, asumsi: !!e.asumsi });
  if (mulai == null || mulai === "") return tidak("tanggal mulai kosong");
  if (e.satuan === "jam") {
    const ms = capMs(mulai);
    if (Number.isNaN(ms)) return tidak("jam butuh cap waktu bersel zona (mis. 2026-11-05T08:00:00+07:00)");
    const w = new Date(ms + e.nilai * 3600e3 + WIB).toISOString(); // jam dinding WIB
    return ok(w.slice(0, 19) + "+07:00");
  }
  const t = tanggalWib(mulai);
  if (!t) return tidak("tanggal mulai tidak sah");
  switch (e.satuan) {
    case "hari": case "hari_kalender": return ok(tambahHari(t, e.nilai));
    case "hari_kerja": { // berlabel asumsi bila daftar libur kosong (kalender_tanpa_libur)
      const r = ok(hariKerja(t, e.nilai));
      return LIBUR.length ? r : { ...r, asumsi: true };
    }
    case "bulan": return ok(tambahBulan(t, e.nilai));
    case "tahun": return ok(tambahBulan(t, 12 * e.nilai));
    case "tanggal_bulan_berikut": { // tanggal ke-nilai bulan sesudah bulan mulai
      const [y, m] = tambahBulan([t[0], t[1], 1], 1).split("-").map(Number);
      return ok(iso(y, m, Math.min(e.nilai, hariDalamBulan(y, m))));
    }
    default: return tidak(`satuan ${e.satuan} tidak didukung tenggat()`);
  }
}
