#!/usr/bin/env python3
"""Paket `lembaga`: matriks lembaga dan tugas per fase untuk dua kajian Kepala BNPB (Okt 2026).

Jalankan dari mana saja:  python3 data/kajian-bnpb/bangun/lembaga.py
Menulis data/kajian-bnpb/data/lembaga/*.csv + lembaga.json, lalu self-check assert (gagal = keluar non-nol).
Python 3 stdlib saja. Silsilah dan penjelasan: data/kajian-bnpb/data/lembaga/README.md.

Prinsip: tidak ada sel tanpa kutipan. Tiap baris membawa (sid, halaman, kutipan); skrip MENOLAK jalan bila kutipan
tidak ditemukan di teks sumber yang disimpan (pencocokan tanpa spasi, huruf kecil; potongan dipisah " … " wajib
semuanya ada di halaman yang disebut). Teks sumber:
  data/kajian-bnpb/data/lembaga/mentah/teks/<sid>.json.gz   teks PDF peraturan.bpk.go.id (pymupdf) dan 2 halaman web
  data/kajian-bnpb/data/lembaga/mentah/meta/<sid>.json      metadata BPK: status, relasi cabut/ubah, URL, SHA-1 PDF
  data/raw/hukum/teks/<slug>.json + indeks.json              korpus JDIH BNPB lokal (sid "jdih:<slug>")
"""
import csv, gzip, json, os, re, sys
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P("data/kajian-bnpb/data/lembaga")
MEN = os.path.join(OUT, "mentah")
JDIH = P("data/raw/hukum")
LABEL = {"resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan"}
SEP = " … "

# ---------------------------------------------------------------------------------------------------------------
# 1. Lembaga (nomenklatur per 23 Okt 2026). Kolom: kode, nama_resmi, singkatan, kelompok, dikoordinasikan_oleh,
#    nomenklatur_sebelumnya (diverifikasi ke relasi "Mencabut" di metadata BPK sid_dasar), dasar_hukum, sid, hlm,
#    kutipan (tugas/kedudukan), unit_terkait, catatan
# ---------------------------------------------------------------------------------------------------------------
L = [
 ("PRES", "Presiden Republik Indonesia", "Presiden", "Kepala pemerintahan", "-", "", "Perpres 17/2018 Pasal 2 ayat (2)",
  "jdih:perpres-nomor-17-tahun-2018", "3", "untuk tingkat nasional ditetapkan oleh Presiden", "", "Penetap status keadaan darurat bencana tingkat nasional."),
 ("PEMPUS", "Pemerintah Pusat (K/L tidak disebut dalam norma)", "Pemerintah Pusat", "Kepala pemerintahan", "-", "",
  "UU 17/2019 Pasal 10-11 jo. UU 6/2023 Pasal 53", "uu-17-2019", "9", "Pemerintah Pusat sebagaimana dimaksud dalam Pasal 9 ayat (1) bertugas",
  "", "Dipakai bila norma menyebut 'Pemerintah Pusat' tanpa menunjuk K/L; ketidakjelasan ini sendiri dicatat di celah.csv."),
 ("KEMENKO_POLKAM", "Kementerian Koordinator Bidang Politik dan Keamanan", "Kemenko Polkam", "Kementerian koordinator", "-",
  "PERPRES No. 73 Tahun 2020 tentang Kementerian Koordinator Bidang Politik, Hukum, dan Keamanan", "Perpres 141/2024", "perpres-141-2024", "3",
  "Kementerian Koordinator mempunyai tugas menyelenggarakan sinkronisasi dan koordinasi pelaksanaan urusan kementerian dalam penyelenggaraan pemerintahan di bidang politik dan keamanan",
  "", "Mengoordinasikan Kemendagri, Kemlu, Kemhan, Komdigi, Kejaksaan, TNI, Polri (Pasal 7 ayat (1))."),
 ("KEMENKO_PMK", "Kementerian Koordinator Bidang Pembangunan Manusia dan Kebudayaan", "Kemenko PMK", "Kementerian koordinator", "-", "",
  "Perpres 144/2024 jo. Perpres 91/2025", "perpres-144-2024", "3",
  "pengendalian pelaksanaan urusan kementerian dalam penyelenggaraan pemerintahan di bidang pembangunan manusia dan kebudayaan",
  "Deputi Bidang Koordinasi Penanggulangan Bencana dan Konflik Sosial (Pasal 24-26)", "Mengoordinasikan BNPB menurut Perpres 1/2019 Pasal 6."),
 ("KEMENKO_IPK", "Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan", "Kemenko IPK", "Kementerian koordinator", "-",
  "PERPRES No. 92 Tahun 2019 tentang Kementerian Koordinator Bidang Kemaritiman dan Investasi", "Perpres 145/2024", "perpres-145-2024", "3",
  "pengendalian pelaksanaan urusan kementerian dalam penyelenggaraan pemerintahan di bidang infrastruktur dan pembangunan kewilayahan",
  "", "Mengoordinasikan ATR/BPN, PU, PKP, Transmigrasi, Perhubungan (Pasal 7 ayat (1)); Ketua Dewan Pengarah BOP Pantura Jawa."),
 ("KEMENKO_PM", "Kementerian Koordinator Bidang Pemberdayaan Masyarakat", "Kemenko PM", "Kementerian koordinator", "-", "",
  "Perpres 146/2024", "perpres-146-2024", "3",
  "pengendalian pelaksanaan urusan kementerian dalam penyelenggaraan pemerintahan di bidang pemberdayaan masyarakat",
  "", "Mengoordinasikan Kemensos dan Kemendes PDT (Pasal 7 ayat (1))."),
 ("KEMENKO_PANGAN", "Kementerian Koordinator Bidang Pangan", "Kemenko Pangan", "Kementerian koordinator", "-", "",
  "Perpres 147/2024", "perpres-147-2024", "3",
  "pengendalian pelaksanaan urusan kementerian dalam penyelenggaraan pemerintahan di bidang pangan",
  "", "Mengoordinasikan Kementan, Kemenhut, KKP, KLH/BPLH (Pasal 8 ayat (1))."),
 ("KEMENKO_EKON", "Kementerian Koordinator Bidang Perekonomian", "Kemenko Perekonomian", "Kementerian koordinator", "-",
  "PERPRES No. 37 Tahun 2020 tentang Kementerian Koordinator Bidang Perekonomian", "Perpres 143/2024", "perpres-143-2024", "3",
  "pengendalian pelaksanaan urusan kementerian dalam penyelenggaraan pemerintahan di bidang perekonomian",
  "", "Mengoordinasikan Kementerian ESDM dan (dalam teks) Kementerian BUMN (Pasal 8 ayat (1))."),
 ("KEMENDAGRI", "Kementerian Dalam Negeri", "Kemendagri", "Kementerian", "KEMENKO_POLKAM",
  "PERPRES No. 114 Tahun 2021 tentang Kementerian Dalam Negeri", "Perpres 149/2024", "perpres-149-2024", "3",
  "urusan pemerintahan di bidang dalam negeri untuk membantu Presiden", "Ditjen Bina Administrasi Kewilayahan (manajemen bencana dan kebakaran)", ""),
 ("KEMLU", "Kementerian Luar Negeri", "Kemlu", "Kementerian", "KEMENKO_POLKAM",
  "PERPRES No. 116 Tahun 2020 tentang Kementerian Luar Negeri", "Perpres 150/2024", "perpres-150-2024", "3",
  "penyelenggaraan urusan pemerintahan di bidang luar negeri", "", ""),
 ("KEMENKEU", "Kementerian Keuangan", "Kemenkeu", "Kementerian", "-",
  "PERPRES No. 57 Tahun 2020 tentang Kementerian Keuangan", "Perpres 158/2024", "perpres-158-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang keuangan untuk membantu Presiden", "", "Tidak tercantum di daftar koordinasi Kemenko mana pun yang dibaca."),
 ("KEMENKES", "Kementerian Kesehatan", "Kemenkes", "Kementerian", "KEMENKO_PMK",
  "PERPRES No. 18 Tahun 2021 tentang Kementerian Kesehatan", "Perpres 161/2024", "perpres-161-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang kesehatan untuk membantu Presiden", "Ditjen Penanggulangan Penyakit", ""),
 ("KEMENSOS", "Kementerian Sosial", "Kemensos", "Kementerian", "KEMENKO_PM",
  "PERPRES No. 110 Tahun 2021 tentang Kementerian Sosial", "Perpres 162/2024 jo. Perpres 22/2026", "perpres-162-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang sosial untuk membantu Presiden", "Ditjen Perlindungan dan Jaminan Sosial (Perpres 22/2026)", ""),
 ("KEMENDIKDASMEN", "Kementerian Pendidikan Dasar dan Menengah", "Kemendikdasmen", "Kementerian", "KEMENKO_PMK",
  "PERPRES No. 62 Tahun 2021 tentang Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi", "Perpres 188/2024 jo. Perpres 6/2026", "perpres-188-2024", "3",
  "menyelenggarakan suburusan pemerintahan pendidikan dasar dan pendidikan menengah", "", "Pewaris klaster pendidikan (Kepka 308/2024 menulis 'Kementerian Pendidikan dan Kebudayaan')."),
 ("KEMEN_PU", "Kementerian Pekerjaan Umum", "Kementerian PU", "Kementerian", "KEMENKO_IPK",
  "PERPRES No. 27 Tahun 2020 tentang Kementerian Pekerjaan Umum dan Perumahan Rakyat", "Perpres 170/2024", "perpres-170-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang pekerjaan umum untuk membantu Presiden",
  "Ditjen Sumber Daya Air (BBWS/BWS sebagai UPT); Ditjen Cipta Karya (SPAM, persampahan)", "Menteri bidang SDA dalam UU 17/2019, PP 30/2024, PP 37/2010."),
 ("KEMEN_PKP", "Kementerian Perumahan dan Kawasan Permukiman", "Kementerian PKP", "Kementerian", "KEMENKO_IPK", "",
  "Perpres 191/2024", "perpres-191-2024", "3",
  "urusan pemerintahan di bidang perumahan dan suburusan pemerintahan kawasan permukiman", "", "Dipecah dari Kementerian PUPR (2024)."),
 ("KEMEN_ESDM", "Kementerian Energi dan Sumber Daya Mineral", "Kementerian ESDM", "Kementerian", "KEMENKO_EKON",
  "PERPRES No. 97 Tahun 2021 tentang Kementerian Energi dan Sumber Daya Mineral", "Perpres 169/2024", "perpres-169-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang energi dan sumber daya mineral untuk membantu Presiden",
  "Badan Geologi (vulkanologi dan mitigasi bencana geologi, air tanah, geologi lingkungan)", ""),
 ("KEMENHUT", "Kementerian Kehutanan", "Kemenhut", "Kementerian", "KEMENKO_PANGAN",
  "PERPRES No. 92 Tahun 2020 tentang Kementerian Lingkungan Hidup dan Kehutanan", "Perpres 175/2024", "perpres-175-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang kehutanan untuk membantu Presiden", "Ditjen Penegakan Hukum Kehutanan (pengendalian kebakaran hutan)", ""),
 ("KLH_BPLH", "Kementerian Lingkungan Hidup/Badan Pengendalian Lingkungan Hidup", "KLH/BPLH", "Kementerian", "KEMENKO_PANGAN", "",
  "Perpres 182/2024 (KLH) dan Perpres 183/2024 (BPLH)", "perpres-182-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang lingkungan hidup untuk membantu Presiden",
  "BPLH: Deputi Bidang Penegakan Hukum Lingkungan Hidup (pengendalian kebakaran lahan); Deputi Bidang Pengelolaan Sampah, Limbah, dan B3",
  "Dua perpres terpisah dipimpin satu Menteri/Kepala."),
 ("KEMENTAN", "Kementerian Pertanian", "Kementan", "Kementerian", "KEMENKO_PANGAN",
  "PERPRES No. 117 Tahun 2022 tentang Kementerian Pertanian", "Perpres 192/2024", "perpres-192-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang pertanian untuk membantu Presiden", "Ditjen Lahan dan Irigasi Pertanian", ""),
 ("KKP", "Kementerian Kelautan dan Perikanan", "KKP", "Kementerian", "KEMENKO_PANGAN",
  "PERPRES No. 38 Tahun 2023 tentang Kementerian Kelautan dan Perikanan", "Perpres 193/2024 jo. Perpres 112/2025", "perpres-193-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang kelautan dan perikanan untuk membantu Presiden", "", "Perpres 112/2025 (perubahan) belum dibaca isinya."),
 ("ATR_BPN", "Kementerian Agraria dan Tata Ruang/Badan Pertanahan Nasional", "ATR/BPN", "Kementerian", "KEMENKO_IPK",
  "PERPRES No. 47 Tahun 2020 tentang Kementerian Agraria dan Tata Ruang", "Perpres 176/2024 dan Perpres 177/2024", "perpres-176-2024", "3",
  "suburusan tata ruang yang merupakan lingkup urusan pemerintahan di bidang pekerjaan umum", "Ditjen Tata Ruang", ""),
 ("KEMEN_PPN", "Kementerian Perencanaan Pembangunan Nasional/Badan Perencanaan Pembangunan Nasional", "Kementerian PPN/Bappenas", "Kementerian", "-",
  "PERPRES No. 80 Tahun 2021 tentang Kementerian Perencanaan Pembangunan Nasional", "Perpres 194/2024 dan Perpres 195/2024", "perpres-194-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang perencanaan pembangunan nasional untuk membantu Presiden", "", ""),
 ("KOMDIGI", "Kementerian Komunikasi dan Digital", "Komdigi", "Kementerian", "KEMENKO_POLKAM",
  "PERPRES No. 22 Tahun 2023 tentang Kementerian Komunikasi dan Informatika", "Perpres 174/2024", "perpres-174-2024", "3",
  "menyelenggarakan urusan pemerintahan di bidang komunikasi dan informasi untuk membantu Presiden", "Ditjen Komunikasi Publik dan Media", ""),
 ("KEMENHUB", "Kementerian Perhubungan", "Kemenhub", "Kementerian", "KEMENKO_IPK",
  "PERPRES No. 23 Tahun 2022 tentang Kementerian Perhubungan", "Perpres 173/2024 jo. Perpres 16/2026", "perpres-173-2024", "3",
  "pemerintahan di bidang transportasi untuk membantu Presiden", "", "Jalur koordinasi BMKG ke Presiden (Perpres 12/2024 Pasal 2)."),
 ("KEMENDES", "Kementerian Desa dan Pembangunan Daerah Tertinggal", "Kemendes PDT", "Kementerian", "KEMENKO_PM",
  "PERPRES No. 85 Tahun 2020 tentang Kementerian Desa, Pembangunan Daerah Tertinggal, dan Transmigrasi", "Perpres 171/2024", "perpres-171-2024", "3",
  "menyelenggarakan suburusan pemerintahan desa", "", ""),
 ("BNPB", "Badan Nasional Penanggulangan Bencana", "BNPB", "LPNK", "KEMENKO_PMK",
  "PERPRES No. 8 Tahun 2008 tentang Badan Nasional Penanggulangan Bencana", "UU 24/2007 Pasal 10-12; Perpres 1/2019 jo. Perpres 29/2021", "perpres-1-2019", "2",
  "memberikan pedoman dan pengarahan terhadap usaha penanggulangan bencana",
  "Deputi Sistem dan Strategi, Pencegahan, Penanganan Darurat, Rehabilitasi dan Rekonstruksi, Logistik dan Peralatan (Pasal 21)", "Dikoordinasikan Kemenko PMK (Pasal 6)."),
 ("BPBD", "Badan Penanggulangan Bencana Daerah (provinsi, kabupaten/kota)", "BPBD", "Perangkat daerah", "PEMDA", "",
  "UU 24/2007 Pasal 18-21", "uu-24-2007", "11", "Pemerintah daerah sebagaimana dimaksud dalam Pasal 5 membentuk badan penanggulangan bencana daerah", "", ""),
 ("PEMDA", "Pemerintah daerah provinsi dan kabupaten/kota", "Pemda", "Pemerintah daerah", "-", "",
  "UU 23/2014 Lampiran E (sub-urusan bencana); UU 24/2007 Pasal 8-9", "uu-23-2014", "332", "Penanggulangan bencana provinsi. Penanggulangan bencana kabupaten/kota.",
  "Gubernur, bupati/wali kota; dinas SDA, damkar, dinas sosial", ""),
 ("BMKG", "Badan Meteorologi, Klimatologi, dan Geofisika", "BMKG", "LPNK", "KEMENHUB",
  "PERPRES No. 61 Tahun 2008 tentang Badan Meteorologi, Klimatologi, dan Geofosika", "UU 31/2009; Perpres 12/2024", "perpres-12-2024", "2",
  "BMKG mempunyai tugas melaksanakan tugas pemerintahan di bidang penyelenggaraan meteorologi, klimatologi, dan geofisika",
  "", "Bertanggung jawab kepada Presiden melalui menteri bidang transportasi (Pasal 2)."),
 ("BRIN", "Badan Riset dan Inovasi Nasional", "BRIN", "LPNK", "-", "Perpres Nomor 33 Tahun 2021", "Perpres 78/2021", "perpres-78-2021", "4",
  "BRIN mempunyai tugas membantu Presiden dalam menyelenggarakan tugas pemerintahan", "", "Menyerap LAPAN dan BPPT (Pasal 65-66)."),
 ("BIG", "Badan Informasi Geospasial", "BIG", "LPNK", "-", "PERPRES No. 94 Tahun 2011 tentang Badan Informasi Geospasial",
  "Perpres 128/2022", "perpres-128-2022", "2-3", "tugas pemerintahan di bidang informasi geospasial", "", ""),
 ("BASARNAS", "Badan Nasional Pencarian dan Pertolongan", "Basarnas", "LPNK", "-", "PERPRES No. 99 Tahun 2007 tentang Badan SAR Nasional",
  "UU 29/2014; Perpres 83/2016", "perpres-83-2016", "2", "memberikan pedoman dan pengarahan dalam penyelenggaraan pencarian dan pertolongan", "", ""),
 ("TNI", "Tentara Nasional Indonesia", "TNI", "TNI/Polri", "KEMENKO_POLKAM", "", "UU 34/2004 jo. UU 3/2025", "uu-3-2025", "4",
  "akibat bencana alam, pengungsian, dan pemberian bantuan kemanusiaan", "", "Operasi militer selain perang (Pasal 7 ayat (2) huruf b angka 12)."),
 ("POLRI", "Kepolisian Negara Republik Indonesia", "Polri", "TNI/Polri", "KEMENKO_POLKAM", "", "UU 2/2002 jo. UU 5/2026", "uu-5-2026", "4",
  "masyarakat, dan lingkungan hidup dari gangguan ketertiban dan/ atau bencana", "", ""),
 ("BOP_PANTURA", "Badan Otorita Pengelola Pantai Utara Jawa", "BOP Pantura Jawa", "Lembaga nonstruktural", "PRES", "", "Perpres 77/2025",
  "perpres-77-2025", "4", "BOP Pantura Jawa mempunyai tugas melaksanakan persiapan, perencanaan, pembangunan, dan pengembangan di Pantura Jawa",
  "Dewan Pengarah diketuai Menko IPK", "Riset B menulis 'Badan Otorita Pengelolaan Pantai Utara Jawa'; nama resmi 'Pengelola'."),
 ("BP_BUMN", "Badan Pengaturan Badan Usaha Milik Negara", "BP BUMN", "Lembaga pemerintah", "-",
  "Perpres No. 179 Tahun 2024 tentang Kementerian Badan Usaha Milik Negara", "UU 16/2025; Perpres 105/2025", "perpres-105-2025", "3",
  "BP BUMN melaksanakan tugas pemerintahan di bidang pengaturan badan usaha milik negara", "",
  "Pengelolaan BUMN oleh Badan Pengelola Investasi Daya Anagata Nusantara (UU 16/2025 Pasal 1 angka 23)."),
 ("PJT1", "Perum Jasa Tirta I", "PJT I", "BUMN", "-", "", "PP 46/2010", "pp-46-2010", "4",
  "Wilayah Sungai Kali Brantas dan Wilayah Sungai Bengawan Solo secara utuh dari hulu sampai hilir", "", "Pengelola SDA (UU 17/2019 Pasal 19 ayat (2)). BUMN: pengaturan BP BUMN, pengelolaan Danantara (UU 16/2025)."),
 ("PJT2", "Perum Jasa Tirta II", "PJT II", "BUMN", "-", "PP No. 7 Tahun 2010 tentang Perusahaan Umum (Perum) Jasa Tirta II", "PP 25/2022",
  "pp-25-2022", "6", "a. Wilayah Sungai Citarum", "", "Pengelola SDA; pengelola Waduk Jatiluhur (WS Citarum)."),
 ("BUMD_SPAM", "BUMD penyelenggara SPAM (PDAM/Perumda Air Minum)", "BUMD SPAM", "BUMD", "PEMDA", "", "PP 122/2015", "pp-122-2015", "3",
  "Badan Usaha Milik Daerah Penyelenggara SPAM yang selanjutnya disebut BUMD adalah badan usaha yang dibentuk khusus untuk melakukan kegiatan Penyelenggaraan SPAM", "", ""),
]
# Lembaga tanpa baris peran/air: alasannya di kolom catatan (nomenklatur, bukan peran PB yang bersumber).
ORPHAN_OK = {"KEMENKO_EKON", "KEMENKO_PM", "BP_BUMN"}
# Dasar hukum pendamping yang disebut di kolom dasar_hukum ("jo.", "dan"): wajib berstatus Berlaku dan masuk sumber.csv.
PENDAMPING = {"perpres-140-2024", "perpres-91-2025", "perpres-22-2026", "perpres-6-2026", "perpres-177-2024", "perpres-195-2024",
              "perpres-29-2021", "uu-34-2004", "uu-2-2002", "uu-16-2025"}

# ---------------------------------------------------------------------------------------------------------------
# 2. Peran per jenis bencana dan fase. Kode peran: K = koordinator/penanggung jawab utama, P = pelaksana/pendukung,
#    R = penetap status/izin/norma, I = informasi dan peringatan dini. Fase: pra, saat, pasca, lintas (semua fase).
#    (id, lembaga, ancaman, fase, peran, uraian, sid, hlm, kutipan, sid2, hlm2, kutipan2, catatan)
#    sid2/kutipan2 = bukti pemetaan nomenklatur atau bukti kedua (juga diverifikasi).
# ---------------------------------------------------------------------------------------------------------------
JK = "jdih:juklak-nomor-16-tahun-2025"
IN = "inpres-3-2020"
R = [
 # --- lintas jenis bencana ---
 ("R001", "BNPB", "semua", "lintas", "K", "Pedoman dan pengarahan PB dari pencegahan sampai rekonstruksi", "uu-24-2007", "9",
  "memberikan pedoman dan pengarahan terhadap usaha penanggulangan bencana yang mencakup pencegahan bencana, penanganan tanggap darurat, rehabilitasi, dan rekonstruksi secara adil dan setara", "", "", "", ""),
 ("R002", "BNPB", "semua", "saat", "K", "Kemudahan akses saat status darurat, termasuk komando memerintahkan sektor/lembaga", "uu-24-2007", "23",
  "komando untuk memerintahkan sektor/lembaga", "", "", "", "BPBD memegang kemudahan akses yang sama (Pasal 50 ayat (1))."),
 ("R003", "BNPB", "semua", "saat", "K", "Menggunakan dana siap pakai saat tanggap darurat", "uu-24-2007", "27",
  "Pada saat tanggap darurat, Badan Nasional Penanggulangan Bencana menggunakan dana siap pakai", "", "", "", ""),
 ("R004", "BNPB", "semua", "saat", "K", "PB dalam keadaan tertentu (tanpa/selepas status darurat) untuk faktor alam, nonalam, sosial", "jdih:perpres-nomor-46-tahun-2026", "3",
  "adanya potensi Bencana dengan tingkat ancaman maksimum yang disebabkan oleh faktor alam, nonalam, dan/atau sosial", "", "", "", "Setelah keputusan rapat koordinasi yang dipimpin menko pembidang PB."),
 ("R005", "BNPB", "semua", "lintas", "K", "Fungsi komando: pengerahan SDM, logistik, peralatan dari instansi terkait, Polri, TNI", "perpres-1-2019", "8",
  "pengerahan sumber daya manusia, logistik dan peralatan dari instansi terkait, Kepolisian Negara Republik Indonesia, dan Tentara Nasional Indonesia", "", "", "", ""),
 ("R006", "BNPB", "semua", "pra", "I", "Mengelola platform Sistem Peringatan Dini Bencana multiancaman", "jdih:perban-nomor-2-tahun-2024", "2",
  "Program peringatan dini multi ancaman Bahaya yang dikelola oleh BNPB", "", "", "", ""),
 ("R007", "BNPB", "semua", "pasca", "K", "Menyusun Rencana Rehabilitasi dan Rekonstruksi skala nasional bersama Bappenas dan K/L", "jdih:perban-nomor-5-tahun-2017", "5",
  "terdiri atas BNPB, Badan Perencanaan Pembangunan Nasional, kementerian/lembaga terkait", "", "", "", ""),
 ("R008", "KEMEN_PPN", "semua", "pasca", "P", "Anggota tim penyusun Rencana Rehabilitasi dan Rekonstruksi skala nasional", "jdih:perban-nomor-5-tahun-2017", "5",
  "terdiri atas BNPB, Badan Perencanaan Pembangunan Nasional, kementerian/lembaga terkait", "", "", "", ""),
 ("R009", "BNPB", "semua", "saat", "K", "Koordinator Klaster Logistik (Kepka BNPB 308/2024)", JK, "1",
  "Klaster Logistik dengan koordinator Badan Nasional Penanggulangan Bencana", "", "", "", ""),
 ("R010", "BPBD", "semua", "lintas", "K", "Pedoman dan pengarahan PB di daerah dari pencegahan sampai rekonstruksi", "uu-24-2007", "12",
  "pencegahan bencana, penanganan darurat, rehabilitasi, serta rekonstruksi secara adil dan setara", "", "", "", ""),
 ("R011", "BPBD", "semua", "pra", "I", "Menyusun, menetapkan, dan menginformasikan peta rawan bencana", "uu-24-2007", "12",
  "menyusun, menetapkan, dan menginformasikan peta rawan bencana", "", "", "", ""),
 ("R012", "PEMDA", "semua", "lintas", "K", "Menjamin hak pengungsi sesuai SPM dan mengalokasikan dana PB di APBD", "uu-24-2007", "8",
  "penjaminan pemenuhan hak masyarakat dan pengungsi yang terkena bencana sesuai dengan standar pelayanan minimum", "", "", "", ""),
 ("R013", "PEMDA", "semua", "lintas", "K", "Sub-urusan bencana sebagai urusan daerah", "uu-23-2014", "332",
  "Penanggulangan bencana provinsi. Penanggulangan bencana kabupaten/kota.", "", "", "", ""),
 ("R014", "PRES", "semua", "saat", "R", "Menetapkan status keadaan darurat bencana tingkat nasional", "jdih:perpres-nomor-17-tahun-2018", "3",
  "untuk tingkat nasional ditetapkan oleh Presiden", "", "", "", ""),
 ("R015", "PEMDA", "semua", "saat", "R", "Gubernur dan bupati/wali kota menetapkan status keadaan darurat bencana daerah", "jdih:perpres-nomor-17-tahun-2018", "3",
  "tingkat daerah provinsi oleh gubernur, dan tingkat daerah kabupaten/kota oleh bupati/wali kota", "", "", "", ""),
 ("R016", "KEMENKO_PMK", "semua", "lintas", "K", "Sinkronisasi dan koordinasi kebijakan K/L di bidang penanggulangan bencana dan konflik sosial", "perpres-144-2024", "13",
  "isu dan agenda pembangunan nasional di bidang penanggulangan bencana dan konflik sosial", "", "", "", ""),
 ("R017", "KEMENKO_PMK", "semua", "saat", "K", "Memimpin rapat koordinasi antar-K/L sebagai syarat BNPB bertindak dalam keadaan tertentu",
  "jdih:perpres-nomor-46-tahun-2026", "3", "dikoordinasikan oleh menteri koordinator yang membidangi koordinasi penyelenggaraan penanggulangan bencana",
  "perpres-1-2019", "4", "BNPB dikoordinasikan oleh kementerian yang menyelenggarakan koordinasi, sinkronisasi, dan pengendalian urusan kementerian dalam penyelenggaraan pemerintahan di bidang pembangunan manusia dan kebudayaan",
  "Perpres 46/2026 tidak menyebut nama Kemenko; dipetakan ke Kemenko PMK lewat Perpres 1/2019 Pasal 6."),
 ("R018", "KEMENKO_PMK", "semua", "pra", "P", "Dilibatkan dalam penetapan prioritas penyaluran Dana Bersama PB", "jdih:perban-nomor-1-tahun-2026", "5",
  "dengan melibatkan Kementerian yang menyelenggarakan sinkronisasi dan koordinasi serta pengendalian pelaksanaan urusan Kementerian dalam penyelenggaraan pemerintahan di bidang pembangunan manusia dan kebudayaan", "", "", "", ""),
 ("R019", "BASARNAS", "semua", "saat", "K", "Koordinator Klaster Pencarian dan Pertolongan", JK, "1",
  "Klaster Pencarian dan Pertolongan dengan koordinator Badan Nasional Pencarian dan Pertolongan", "uu-29-2014", "3",
  "Badan Nasional Pencarian dan Pertolongan adalah lembaga pemerintah nonkementerian yang menyelenggarakan urusan pemerintahan di bidang Pencarian dan Pertolongan", ""),
 ("R020", "KEMENSOS", "semua", "saat", "K", "Koordinator Klaster Pengungsian dan Perlindungan", JK, "1",
  "Klaster Pengungsian dan Perlindungan dengan koordinator Kementerian Sosial", "", "", "", ""),
 ("R021", "KEMENKES", "semua", "saat", "K", "Koordinator Klaster Kesehatan", JK, "1", "Klaster Kesehatan dengan koordinator Kementerian Kesehatan", "", "", "", ""),
 ("R022", "KEMENDIKDASMEN", "semua", "saat", "K", "Koordinator Klaster Pendidikan (pewaris nomenklatur)", JK, "1",
  "Klaster Pendidikan dengan koordinator Kementerian Pendidikan dan Kebudayaan", "perpres-188-2024", "3",
  "menyelenggarakan suburusan pemerintahan pendidikan dasar dan pendidikan menengah",
  "Kepka 308/2024 memakai nama kementerian yang tidak ada lagi; pewaris pendidikan dasar-menengah = Kemendikdasmen (lihat celah C08)."),
 ("R023", "KEMENDAGRI", "semua", "pasca", "K", "Koordinator Klaster Pemulihan", JK, "1", "Klaster Pemulihan dengan koordinator Kementerian Dalam Negeri", "", "", "", ""),
 ("R024", "KEMENKES", "semua", "lintas", "K", "Kesehatan bencana dari perencanaan prabencana sampai pascabencana (bersama pemda)", "uu-17-2023", "52",
  "Pemerintah Pusat dan Pemerintah Daerah bertanggung jawab atas ketersediaan sumber daya, fasilitas, dan pelaksanaan Pelayanan Kesehatan pada bencana", "", "", "", ""),
 ("R025", "TNI", "semua", "saat", "P", "Operasi militer selain perang: membantu mengatasi akibat bencana alam, pengungsian, bantuan kemanusiaan", "uu-3-2025", "4",
  "akibat bencana alam, pengungsian, dan pemberian bantuan kemanusiaan", "", "", "", ""),
 ("R026", "POLRI", "semua", "saat", "P", "Melindungi masyarakat dan lingkungan dari gangguan ketertiban dan/atau bencana", "uu-5-2026", "4",
  "masyarakat, dan lingkungan hidup dari gangguan ketertiban dan/ atau bencana", "", "", "", ""),
 ("R027", "KEMENDAGRI", "semua", "lintas", "P", "Pembinaan sub-urusan bencana dan kebakaran daerah (Ditjen Bina Administrasi Kewilayahan)", "perpres-149-2024", "7",
  "manajemen bencana dan kebakaran", "", "", "", ""),
 ("R028", "KEMEN_PKP", "semua", "pasca", "K", "Penyediaan dan rehabilitasi rumah korban bencana nasional (urusan perumahan)", "uu-23-2014", "329",
  "Penyediaan dan rehabilitasi rumah korban bencana nasional", "perpres-191-2024", "3", "urusan pemerintahan di bidang perumahan",
  "UU 23/2014 menempatkannya di urusan perumahan; urusan perumahan kini di Kementerian PKP."),
 ("R029", "PEMDA", "semua", "pasca", "K", "Penyediaan dan rehabilitasi rumah korban bencana provinsi dan kabupaten/kota", "uu-23-2014", "329",
  "Penyediaan dan rehabilitasi rumah korban bencana provinsi" + SEP + "Penyediaan dan rehabilitasi rumah korban bencana kabupaten/kota", "", "", "", ""),
 ("R030", "KEMENKEU", "semua", "saat", "P", "Kepabeanan dan perpajakan barang bantuan internasional", "jdih:perban-nomor-6-tahun-2018", "19",
  "Kementerian Keuangan berwenang dalam urusan kepabeanan dan perpajakan atas barang impor", "", "", "", ""),
 ("R031", "KEMLU", "semua", "saat", "P", "Perizinan diplomatik personel asing bantuan internasional", "jdih:perban-nomor-6-tahun-2018", "19",
  "Kementerian Luar Negeri berwenang dalam pengurusan perizinan diplomatik untuk personil asing", "", "", "", ""),
 ("R032", "KEMENHUB", "semua", "saat", "P", "Perizinan sarana transportasi dan fasilitas bandara/pelabuhan bantuan internasional", "jdih:perban-nomor-6-tahun-2018", "19",
  "Kementerian Perhubungan berwenang dalam perizinan masuknya sarana transportasi", "", "", "", ""),
 ("R033", "KOMDIGI", "semua", "saat", "P", "Perizinan alat komunikasi yang dibawa lembaga internasional", "jdih:perban-nomor-6-tahun-2018", "19",
  "Kementerian Komunikasi dan Informatika berwenang dalam perijinan penggunaan alat komunikasi", "perpres-174-2024", "", "PERPRES No. 22 Tahun 2023 tentang Kementerian Komunikasi dan Informatika",
  "Perban 6/2018 memakai nama lama; Perpres 174/2024 mencabut Perpres 22/2023 (relasi BPK)."),
 ("R034", "KEMEN_PU", "semua", "saat", "P", "Bantuan bidang pekerjaan umum dan perumahan", "jdih:perban-nomor-6-tahun-2018", "19",
  "Kementerian Pekerjaan Umum dan Perumahan Rakyat berwenang dalam penanganan bantuan bidang pekerjaan umum dan perumahan rakyat", "", "", "",
  "Nama lama; bidang perumahan kini di Kementerian PKP."),
 ("R035", "KEMEN_ESDM", "semua", "saat", "P", "Bantuan bidang energi dan sumber daya mineral", "jdih:perban-nomor-6-tahun-2018", "19",
  "Kementerian Energi Sumber Daya Mineral berwenang dalam penanganan bantuan bidang energi sumber daya mineral", "", "", "", ""),
 ("R036", "BIG", "semua", "pra", "I", "Informasi geospasial dasar dan tematik", "perpres-128-2022", "3",
  "informasi geospasial dasar, informasi geospasial tematik", "", "", "", ""),
 ("R037", "BRIN", "semua", "pra", "P", "Riset dan inovasi nasional (termasuk eks LAPAN dan BPPT)", "perpres-78-2021", "4",
  "BRIN mempunyai tugas membantu Presiden dalam menyelenggarakan tugas pemerintahan", "perpres-78-2021", "35",
  "Lembaga Penerbangan dan Antariksa Nasional yang dibentuk berdasarkan", "Peran PB tidak disebut eksplisit; tugas riset umum."),
 ("R038", "ATR_BPN", "semua", "pra", "R", "Perencanaan tata ruang dan pemanfaatan ruang (Ditjen Tata Ruang)", "perpres-176-2024", "5",
  "perencanaan tata ruang dan pemanfaatan ruang", "jdih:perban-nomor-1-tahun-2025", "27",
  "Belum seluruh daerah memiliki Rencana Tata Ruang Wilayah (RTRW) dan Rencana Detail Tata Ruang (RDTR) berbasis mitigasi bencana", ""),
 # --- geologi ---
 ("R050", "BMKG", "gempa", "pra", "I", "Informasi gempa bumi tektonik", "uu-31-2009", "17", "informasi gempa bumi tektonik", "", "", "", ""),
 ("R051", "KEMEN_ESDM", "gempa", "pra", "R", "Penetapan kawasan rawan bencana geologi; mitigasi bencana geologi (Badan Geologi)", "uu-23-2014", "436",
  "Penetapan kawasan rawan bencana geologi", "perpres-169-2024", "12", "vulkanologi dan mitigasi bencana geologi", ""),
 ("R052", "BMKG", "tsunami", "pra", "I", "Peringatan dini tsunami", "uu-31-2009", "17", "c. gelombang laut berbahaya; dan d. tsunami", "", "", "", ""),
 ("R053", "KEMEN_ESDM", "tsunami", "pra", "R", "Penetapan kawasan rawan bencana geologi", "uu-23-2014", "436", "Penetapan kawasan rawan bencana geologi", "", "", "",
  "Tsunami tidak disebut eksplisit; dimasukkan karena KRB geologi."),
 ("R054", "KEMEN_ESDM", "gunungapi", "pra", "I", "Penetapan status dan peringatan dini bahaya gunung api (Badan Geologi)", "uu-23-2014", "435",
  "Penetapan status dan peringatan dini bahaya gunung api", "perpres-169-2024", "12", "vulkanologi dan mitigasi bencana geologi", ""),
 ("R055", "KEMEN_ESDM", "longsor", "pra", "I", "Peringatan dini potensi gerakan tanah", "uu-23-2014", "435-436", "e. Peringatan dini potensi" + SEP + "gerakan tanah.",
  "", "", "", ""),
 # --- hidrometeorologi ---
 ("R060", "KEMEN_PU", "banjir", "lintas", "K", "Pengelolaan SDA dan bangunan pengaman pantai di WS lintas provinsi/negara/strategis nasional", "uu-23-2014", "322",
  "Pengelolaan SDA dan bangunan pengaman pantai pada wilayah sungai lintas Daerah provinsi, wilayah sungai lintas negara, dan wilayah sungai strategis nasional", "", "", "", ""),
 ("R061", "PEMDA", "banjir", "lintas", "K", "Pengelolaan SDA dan pengaman pantai di WS lintas kab/kota (provinsi) dan dalam satu kab/kota", "uu-23-2014", "322",
  "Pengelolaan SDA dan bangunan pengaman pantai pada wilayah sungai lintas Daerah kabupaten/kota" + SEP + "Pengelolaan SDA dan bangunan pengaman pantai pada wilayah sungai dalam 1 (satu) Daerah kabupaten/kota", "", "", "", ""),
 ("R062", "KEMEN_PU", "banjir", "pra", "R", "Menetapkan kawasan daya rusak air (banjir, erosi, longsor, lahar dingin, ambles)", "pp-30-2024", "66",
  "berupa: a. banjir; b. erosi dan sedimentasi; c. tanah longsor; d. banjir lahar dingin; e. ambles", "pp-30-2024", "6",
  "Menteri adalah menteri yang menyelenggarakan urusan pemerintahan di bidang Sumber Daya Air", ""),
 ("R063", "PEMDA", "banjir", "pra", "R", "Gubernur/bupati menetapkan kawasan daya rusak air pada WS kewenangannya", "pp-30-2024", "66",
  "Gubernur atau bupati/wali kota menetapkan kawasan Daya Rusak Air", "", "", "", ""),
 ("R064", "PJT1", "banjir", "lintas", "P", "Pengendalian banjir di wilayah kerja (WS Brantas, Bengawan Solo)", "pp-46-2010", "7", "c. pengendalian banjir", "", "", "", ""),
 ("R065", "PJT2", "banjir", "lintas", "P", "Pengendalian banjir di wilayah kerja (WS Citarum)", "pp-25-2022", "12", "c. pengendalian banjir", "", "", "", ""),
 ("R066", "BOP_PANTURA", "banjir", "pra", "P", "Pengelolaan Pantura Jawa termasuk tanggul laut (banjir laut/rob)", "perpres-77-2025", "1",
  "ancaman banjir laut yang semakin besar", "perpres-77-2025", "4",
  "BOP Pantura Jawa mempunyai tugas melaksanakan persiapan, perencanaan, pembangunan, dan pengembangan di Pantura Jawa", ""),
 ("R067", "KEMEN_PU", "longsor", "pra", "R", "Kawasan daya rusak air memuat tanah longsor", "pp-30-2024", "66", "c. tanah longsor", "", "", "", ""),
 ("R068", "BMKG", "cuaca_ekstrem", "pra", "I", "Peringatan dini cuaca ekstrem", "uu-31-2009", "17", "dapat meliputi: a. cuaca ekstrim", "", "", "", ""),
 ("R069", "BMKG", "gelombang_abrasi", "pra", "I", "Peringatan dini gelombang laut berbahaya", "uu-31-2009", "17", "c. gelombang laut berbahaya", "", "", "", ""),
 ("R070", "KKP", "gelombang_abrasi", "pra", "P", "Adaptasi dan mitigasi bencana laut di pesisir dan pulau kecil", "perpres-193-2024", "7",
  "adaptasi dan mitigasi bencana laut", "", "", "", ""),
 ("R071", "KEMEN_PU", "gelombang_abrasi", "pra", "K", "Bangunan pengaman pantai di WS kewenangan pusat", "uu-23-2014", "322",
  "Pengelolaan SDA dan bangunan pengaman pantai pada wilayah sungai lintas Daerah provinsi", "", "", "", ""),
 ("R072", "BMKG", "kekeringan", "pra", "I", "Peringatan dini iklim ekstrem dan prakiraan musim", "uu-31-2009", "17",
  "b. iklim ekstrim" + SEP + "b. prakiraan musim", "", "", "", ""),
 ("R073", "KEMEN_PU", "kekeringan", "lintas", "K", "Menjamin penyediaan air baku di WS lintas negara/provinsi/strategis nasional", "uu-17-2019", "9",
  "menjamin penyediaan Air baku yang memenuhi kualitas untuk pemenuhan kebutuhan pokok minimal sehari-hari masyarakat pada Wilayah Sungai lintas negara",
  "", "", "", "Norma menyebut Pemerintah Pusat; Menteri SDA = Kementerian PU."),
 ("R074", "PEMDA", "kekeringan", "lintas", "K", "Kab/kota memenuhi kebutuhan pokok minimal air warganya", "uu-17-2019", "14",
  "memenuhi kebutuhan pokok minimal sehari-hari atas Air bagi masyarakat di wilayah kabupaten / kota", "", "", "", ""),
 ("R075", "KEMENKO_PANGAN", "kekeringan", "pra", "K", "Sinkronisasi penyediaan air di lahan pertanian padi", "inpres-2-2025", "3",
  "penyediaan air di lahan pertanian pada budidaya tanaman padi", "", "", "", ""),
 ("R076", "KEMENTAN", "kekeringan", "pra", "P", "Lahan dan irigasi pertanian", "perpres-192-2024", "5", "kebijakan di bidang lahan dan irigasi pertanian", "", "", "", ""),
 ("R077", "KEMEN_PU", "kekeringan", "saat", "P", "SPAM bersifat khusus oleh pusat, termasuk penanganan bencana dan kekeringan", "pp-122-2015", "43",
  "penanganan bencana alam, kekeringan", "", "", "", ""),
 # --- karhutla (Inpres 3/2020, nomenklatur lama dipetakan) ---
 ("R080", "KEMENKO_POLKAM", "karhutla", "lintas", "K", "Mengoordinasikan kebijakan penanggulangan karhutla (alamat Inpres: Menko Polhukam)", IN, "2",
  "1. Menteri Koordinator Bidang Politik, Hukum, dan Keamanan:" + SEP + "kebakaran hutan dan lahan secara terencana, terpadu, dan menyeluruh",
  "perpres-141-2024", "", "PERPRES No. 73 Tahun 2020 tentang Kementerian Koordinator Bidang Politik, Hukum, dan Keamanan", "Pewaris: Kemenko Polkam (Perpres 141/2024 mencabut Perpres 73/2020)."),
 ("R081", "KEMENDAGRI", "karhutla", "pra", "P", "Bersama Menteri LHK membina dan mengawasi kebijakan gubernur/bupati soal karhutla", IN, "3",
  "bersama Menteri Lingkungan Hidup dan Kehutanan melakukan pembinaan dan pengawasan terhadap kebijakan serta tindakan Gubernur", "", "", "", ""),
 ("R082", "KEMENKES", "karhutla", "saat", "P", "Menjamin layanan kesehatan masyarakat terdampak", IN, "4",
  "ketersediaan pelayanan kesehatan untuk membantu masyarakat yang terdampak kebakaran hutan dan lahan", "", "", "", ""),
 ("R083", "KEMENSOS", "karhutla", "saat", "P", "Menjamin kesejahteraan sosial masyarakat terdampak", IN, "4",
  "Menteri Sosial, menjamin penyelenggaraan kesejahteraan sosial kepada masyarakat yang terdampak kebakaran hutan dan lahan", "", "", "", ""),
 ("R084", "KEMEN_PU", "karhutla", "pra", "P", "Sekat kanal pembasahan, konstruksi fisik, pemompaan (alamat Inpres: Menteri PUPR)", IN, "4",
  "pembuatan sekat kanal untuk pembasahan", "perpres-170-2024", "", "PERPRES No. 27 Tahun 2020 tentang Kementerian Pekerjaan Umum dan Perumahan Rakyat", ""),
 ("R085", "KEMENHUB", "karhutla", "saat", "P", "Layanan angkutan udara, bandara sebagai base ops, ruang udara untuk OMC dan pemadaman", IN, "4",
  "ruang udara dalam operasi modifikasi cuaca dan pemadaman kebakaran hutan dan lahan", "", "", "", ""),
 ("R086", "KOMDIGI", "karhutla", "saat", "P", "Monitor media massa dan perimbangan informasi (alamat Inpres: Menkominfo)", IN, "4",
  "melakukan monitor media massa dan perimbangan informasi", "perpres-174-2024", "", "PERPRES No. 22 Tahun 2023 tentang Kementerian Komunikasi dan Informatika", ""),
 ("R087", "KEMENTAN", "karhutla", "pra", "R", "Pengawasan usaha pertanian; pembukaan lahan tanpa bakar", IN, "5",
  "mendorong penerapan pembukaan dan/ atau pengolahan lahan pertanian tanpa membakar", "", "", "", ""),
 ("R088", "KEMENHUT", "karhutla", "lintas", "K", "Pengendalian kebakaran hutan (Ditjen Penegakan Hukum Kehutanan)", "perpres-175-2024", "13",
  "pengendalian kebakaran hutan, serta dukungan operasi perlindungan hutan", IN, "5", "meningkatkan patroli Polisi Kehutanan di dalam kawasan hutan",
  "Inpres 3/2020 ditujukan ke Menteri LHK; kehutanan kini di Kemenhut."),
 ("R089", "KLH_BPLH", "karhutla", "lintas", "K", "Pengendalian kebakaran lahan (BPLH, Deputi Penegakan Hukum LH)", "perpres-183-2024", "15",
  "pengendalian kebakaran lahan, serta dukungan operasi penegakan hukum lingkungan hidup", IN, "6",
  "f. mengoordinasikan upaya pemulihan lingkungan hidup akibat kebakaran hutan dan lahan", "Inpres 3/2020 ditujukan ke Menteri LHK; lingkungan hidup kini di KLH/BPLH."),
 ("R090", "KEMENDES", "karhutla", "pra", "P", "Prioritas dana desa untuk penanggulangan karhutla", IN, "6",
  "menetapkan prioritas penggunaan dana desa salah satunya untuk dukungan upaya penanggulangan kebakaran hutan dan lahan", "", "", "", "Alamat Inpres: Menteri Desa PDTT."),
 ("R091", "ATR_BPN", "karhutla", "pra", "R", "Identifikasi tanah terlantar berizin dan sanksi", IN, "6",
  "melakukan identifikasi terhadap tanah terlantar yang telah diberikan izin usaha", "", "", "", ""),
 ("R092", "TNI", "karhutla", "saat", "P", "Mengerahkan kekuatan TNI membantu Kepala BNPB untuk pemadaman", IN, "7",
  "membantu Kepala Badan Nasional Penanggulangan Bencana dengan mengerahkan kekuatan Tentara Nasional Indonesia untuk pemadaman", "", "", "", ""),
 ("R093", "POLRI", "karhutla", "saat", "P", "Mengerahkan kekuatan Polri membantu Kepala BNPB; penegakan hukum pidana", IN, "8",
  "membantu Kepala Badan Nasional Penanggulangan Bencana dengan mengerahkan kekuatan Kepolisian Negara Republik Indonesia untuk pemadaman", "", "", "", ""),
 ("R094", "BNPB", "karhutla", "saat", "K", "Fungsi komando pengerahan sumber daya tingkat nasional; bantuan dana dan operasi udara/darat", IN, "9",
  "melaksanakan fungsi komando untuk pengerahan sumber daya dalam pengoordinasian penanggulangan kebakaran hutan, dan lahan pada tingkat nasional", "", "", "", ""),
 ("R095", "BMKG", "karhutla", "pra", "I", "Data asap, titik panas, prakiraan cuaca dan musim; prakiraan potensi karhutla", IN, "10",
  "proaktif memberikan dukungan data dan informasi persebaran asap dan titik panas", "uu-31-2009", "17", "d. prakiraan potensi kebakaran hutan atau lahan", ""),
 ("R096", "BMKG", "karhutla", "saat", "P", "Operasi modifikasi cuaca (fungsi BMKG sejak Perpres 12/2024; Inpres menugaskan BPPT)", "perpres-12-2024", "2",
  "sarana dan prasarana meteorologi, klimatologi, dan geofisika, serta modifikasi cuaca", IN, "10", "Kepala Badan Pengkajian dan Penerapan Teknologi, melakukan operasi modifikasi cuaca",
  "BPPT sudah dilebur ke BRIN (Perpres 78/2021); fungsi modifikasi cuaca kini tertulis di fungsi BMKG."),
 ("R097", "BIG", "karhutla", "pra", "I", "Peta dasar dan tematik untuk pemadaman dan analisis tutupan lahan", IN, "10",
  "menyediakan data peta dasar dan tematik yang diperbarui secara berkala", "", "", "", ""),
 ("R098", "BRIN", "karhutla", "pra", "I", "Data citra satelit (alamat Inpres: LAPAN, kini BRIN)", IN, "10",
  "menyediakan data citra satelit yang berkualitas dan memadai", "perpres-78-2021", "35", "Lembaga Penerbangan dan Antariksa Nasional yang dibentuk berdasarkan", ""),
 ("R099", "BASARNAS", "karhutla", "saat", "P", "Operasi pencarian dan pertolongan masyarakat terdampak karhutla", IN, "10",
  "menjamin terselenggaranya operasi pencarian dan pertolongan kepada masyarakat", "", "", "", ""),
 ("R100", "PEMDA", "karhutla", "saat", "K", "Gubernur dan bupati/wali kota sebagai komandan satuan tugas karhutla", IN, "11-12",
  "sebagai komandan satuan tugas melaksanakan penanggulangan kebakaran hutan dan lahan di wilayah provinsi" + SEP +
  "sebagai komandan satuan tugas melaksanakan penanggulangan kebakaran hutan dan lahan di wilayah kabupaten/kota", "", "", "", ""),
 ("R101", "BPBD", "karhutla", "lintas", "K", "BPBD sebagai koordinator penanggulangan karhutla di provinsi dan kab/kota", IN, "12",
  "sebagai koordinator dalam upaya penanggulangan ke bakaran h utan dan lahan di wilayah kabupaten/kota", "", "", "", ""),
 ("R102", "KEMENKEU", "karhutla", "pra", "P", "Sinkronisasi perencanaan dan penganggaran (bersama Bappenas)", IN, "13",
  "Menteri Keuangan dan Menteri Perencanaan Pembangunan Nasional/Kepala Badan Perencanaan Pembangunan Nasional memberikan dukungan sinkronisasi perencanaan dan penganggaran", "", "", "", ""),
 ("R103", "KEMEN_PPN", "karhutla", "pra", "P", "Sinkronisasi perencanaan dan penganggaran (bersama Kemenkeu)", IN, "13",
  "Menteri Keuangan dan Menteri Perencanaan Pembangunan Nasional/Kepala Badan Perencanaan Pembangunan Nasional memberikan dukungan sinkronisasi perencanaan dan penganggaran", "", "", "", ""),
 # --- nonalam ---
 ("R110", "KEMENKES", "epidemi", "saat", "R", "Menetapkan/mencabut daerah terjangkit wabah", "uu-17-2023", "162",
  "Menteri menetapkan atau mencabut penetapan daerah tertentu sebagai Daerah Terjangkit Wabah", "", "", "", ""),
 ("R111", "PEMDA", "epidemi", "saat", "R", "Bupati/wali kota, gubernur (atau Menteri) menetapkan KLB dan wajib menanggulanginya", "uu-17-2023", "155-156",
  "Bupati/wali kota, gubernur, atau Menteri harus menetapkan KLB" + SEP + "wajib segera melaksanakan kegiatan penanggulangan KLB", "", "", "", ""),
 ("R112", "KEMENKES", "epidemi", "lintas", "K", "Penanggulangan penyakit (Ditjen Penanggulangan Penyakit)", "perpres-161-2024", "6",
  "Direktorat Jenderal Penanggulangan Penyakit mempunyai tugas menyelenggarakan perumusan dan pelaksanaan kebijakan di bidang penanggulangan penyakit", "", "", "", ""),
 ("R113", "BNPB", "epidemi", "lintas", "P", "Epidemi dan wabah termasuk bencana nonalam; data peringatan dini epidemik masuk SPD BNPB", "uu-24-2007", "2",
  "gagal teknologi, gagal modernisasi, epidemi, dan wabah penyakit", "jdih:perban-nomor-2-tahun-2024", "5", "i. epidemik", ""),
 ("R114", "PEMDA", "gagal_teknologi", "lintas", "K", "Damkar kab/kota: pencegahan, pemadaman, penyelamatan, penanganan B3 kebakaran", "uu-23-2014", "333",
  "Pencegahan, pengendalian, pemadaman, penyelamatan, dan penanganan bahan berbahaya dan beracun kebakaran dalam Daerah kabupaten/kota", "", "", "", ""),
 ("R115", "KEMENDAGRI", "gagal_teknologi", "pra", "R", "Standardisasi sarana-prasarana dan kompetensi pemadam kebakaran (urusan pusat)", "uu-23-2014", "333",
  "Standardisasi sarana dan prasarana pemadam kebakaran", "perpres-149-2024", "7", "manajemen bencana dan kebakaran",
  "Urusan trantibum-linmas dibina Kemendagri (Ditjen Bina Adwil)."),
 ("R116", "KLH_BPLH", "gagal_teknologi", "lintas", "P", "Pengelolaan B3 dan limbah B3; bantuan bencana dampak B3", "perpres-183-2024", "3",
  "pengelolaan sampah, bahan berbahaya dan beracun", "jdih:perban-nomor-6-tahun-2018", "19",
  "bencana dampak pengelolaan bahan berbahaya dan beracun (B3) dan limbah B3", "Perban 6/2018 menyebut KLHK."),
 ("R117", "BNPB", "gagal_teknologi", "lintas", "P", "Gagal teknologi termasuk bencana nonalam; data peringatan dini teknologi industri", "uu-24-2007", "2",
  "gagal teknologi, gagal modernisasi, epidemi, dan wabah penyakit", "jdih:perban-nomor-2-tahun-2024", "5", "k. teknologi industri", ""),
 ("R118", "PEMDA", "kebakaran_tpa", "pra", "K", "Kab/kota menyusun sistem tanggap darurat pengelolaan sampah dan memantau TPA", "uu-18-2008", "7",
  "menyusun dan menyelenggarakan sistem tanggap darurat pengelolaan sampah sesuai dengan kewenangannya", "", "", "", ""),
 ("R119", "PEMDA", "kebakaran_tpa", "saat", "K", "Pemadaman oleh damkar kab/kota", "uu-23-2014", "333",
  "Pencegahan, pengendalian, pemadaman, penyelamatan, dan penanganan bahan berbahaya dan beracun kebakaran", "", "", "", ""),
 ("R120", "KLH_BPLH", "kebakaran_tpa", "pra", "R", "NSPK pengelolaan sampah (Pemerintah); pengelolaan sampah di KLH", "uu-18-2008", "6",
  "menetapkan norma, standar, prosedur, dan kriteria pengelolaan sampah", "perpres-182-2024", "3", "pengelolaan sampah, bahan berbahaya dan beracun", ""),
 ("R121", "KEMEN_PU", "kebakaran_tpa", "pra", "P", "Infrastruktur persampahan (Ditjen Cipta Karya)", "perpres-170-2024", "7", "dan pengelolaan persampahan", "", "", "", ""),
 ("R122", "PEMDA", "kebakaran_tpa", "pra", "K", "Penanganan sampah di TPA/TPST regional (provinsi) dan pengelolaan sampah (kab/kota)", "uu-23-2014", "361",
  "Penanganan sampah di TPA/TPST regional", "", "", "", ""),
 # --- sosial ---
 ("R130", "PEMDA", "konflik_sosial", "saat", "R", "Bupati/wali kota dan gubernur menetapkan status keadaan konflik", "uu-7-2012", "10-11",
  "ditetapkan oleh bupati/wali kota setelah berkonsultasi dengan pimpinan DPRD kabupaten/kota" + SEP + "ditetapkan oleh gubernur setelah berkonsultasi dengan pimpinan DPRD provinsi", "", "", "", ""),
 ("R131", "PRES", "konflik_sosial", "saat", "R", "Presiden menetapkan status keadaan konflik skala nasional", "uu-7-2012", "11",
  "Status Keadaan Konflik skala nasional sebagaimana dimaksud dalam Pasal 15 ayat (4) ditetapkan oleh Presiden", "", "", "", ""),
 ("R132", "POLRI", "konflik_sosial", "saat", "K", "Mengoordinasikan pelaksanaan bantuan kekuatan TNI", "uu-7-2012", "16",
  "Pelaksanaan bantuan penggunaan kekuatan TNI sebagaimana dimaksud dalam Pasal 33 dikoordinasikan oleh Polri", "", "", "", ""),
 ("R133", "TNI", "konflik_sosial", "saat", "P", "Bantuan penggunaan kekuatan TNI atas permintaan kepala daerah", "uu-7-2012", "15",
  "bupati/wali kota dapat meminta bantuan penggunaan kekuatan TNI kepada Pemerintah", "", "", "", ""),
 ("R134", "PEMDA", "konflik_sosial", "pasca", "K", "Pemulihan pascakonflik (bersama Pemerintah)", "uu-7-2012", "16",
  "Pemerintah dan Pemerintah Daerah berkewajiban melakukan upaya Pemulihan Pascakonflik", "", "", "", ""),
 ("R135", "BNPB", "konflik_sosial", "pasca", "P", "PB keadaan tertentu bagi daerah dalam rekonsiliasi pascakonflik berkapasitas fiskal rendah", "jdih:perpres-nomor-46-tahun-2026", "3",
  "pemerintah daerah yang wilayahnya dalam proses rekonsiliasi pascakonflik sosial dan memiliki kapasitas fiskal sangat rendah atau rendah", "", "", "", ""),
 ("R136", "BNPB", "konflik_sosial", "saat", "P", "Anggota Satgas Penyelesaian Konflik Sosial skala nasional", "uu-7-2012", "25", "l. Badan Nasional Penanggulangan Bencana", "", "", "", ""),
 ("R137", "KEMENKO_POLKAM", "konflik_sosial", "saat", "K", "Unsur Satgas nasional: kementerian koordinasi politik, hukum, keamanan", "uu-7-2012", "24",
  "a. kementerian yang membidangi koordinasi urusan politik, hukum, dan keamanan", "", "", "",
  "Fungsi ini sejak 2024 terbelah: Kemenko Polkam dan Kemenko Kumham Imipas (lihat celah C10)."),
 ("R138", "KEMENKO_PMK", "konflik_sosial", "lintas", "K", "Deputi Koordinasi Penanggulangan Bencana dan Konflik Sosial", "perpres-144-2024", "13",
  "isu dan agenda pembangunan nasional di bidang penanggulangan bencana dan konflik sosial", "", "", "", ""),
 ("R139", "KEMENSOS", "konflik_sosial", "saat", "P", "Unsur Satgas nasional: kementerian urusan sosial", "uu-7-2012", "24", "g. kementerian yang membidangi urusan sosial", "", "", "", ""),
 ("R140", "KEMENDAGRI", "konflik_sosial", "saat", "P", "Unsur Satgas nasional: kementerian urusan dalam negeri", "uu-7-2012", "24", "c. kementerian yang membidangi urusan dalam negeri", "", "", "", ""),
 ("R141", "KEMENKES", "konflik_sosial", "saat", "P", "Unsur Satgas nasional: kementerian urusan kesehatan", "uu-7-2012", "24", "f. kementerian yang membidangi urusan kesehatan", "", "", "", ""),
 ("R142", "KEMENKEU", "konflik_sosial", "saat", "P", "Unsur Satgas nasional: kementerian urusan keuangan negara", "uu-7-2012", "24", "e. kementerian yang membidangi urusan keuangan negara", "", "", "", ""),
]
ANCAMAN = {  # kode: (nama, kategori UU 24/2007)
 "semua": ("Lintas jenis bencana", "lintas"), "gempa": ("Gempa bumi", "alam"), "tsunami": ("Tsunami", "alam"),
 "gunungapi": ("Letusan gunung api", "alam"), "banjir": ("Banjir, banjir bandang, rob", "alam"), "longsor": ("Tanah longsor", "alam"),
 "cuaca_ekstrem": ("Cuaca ekstrem", "alam"), "gelombang_abrasi": ("Gelombang ekstrem dan abrasi", "alam"), "kekeringan": ("Kekeringan", "alam"),
 "karhutla": ("Kebakaran hutan dan lahan", "alam"), "epidemi": ("Epidemi dan wabah", "nonalam"),
 "gagal_teknologi": ("Gagal teknologi dan kebakaran industri", "nonalam"), "kebakaran_tpa": ("Kebakaran TPA", "nonalam"),
 "konflik_sosial": ("Konflik dan kerusuhan sosial", "sosial"),
}
FASE = ["pra", "saat", "pasca", "lintas"]

# ---------------------------------------------------------------------------------------------------------------
# 3. Kewenangan komponen air (UU 17/2019 dan turunannya; UU 23/2014). (id, komponen, tingkat, lembaga, wewenang, sid, hlm,
#    kutipan, sid2, hlm2, kutipan2, catatan)
# ---------------------------------------------------------------------------------------------------------------
A = [
 ("A01", "air_baku", "pusat", "KEMEN_PU", "Menjamin air baku di WS lintas negara, lintas provinsi, strategis nasional", "uu-17-2019", "9",
  "menjamin penyediaan Air baku yang memenuhi kualitas untuk pemenuhan kebutuhan pokok minimal sehari-hari masyarakat pada Wilayah Sungai lintas negara, Wilayah Sungai lintas provinsi, dan Wilayah Sungai strategis nasional",
  "uu-17-2019", "5", "Menteri adalah menteri yang menyelenggarakan urusan pemerintahan di bidang Sumber Daya Air", "Norma: Pemerintah Pusat; pelaksana teknis Ditjen SDA/BBWS."),
 ("A02", "air_baku", "provinsi", "PEMDA", "Menjamin air baku di WS lintas kabupaten/kota", "uu-17-2019", "12",
  "sehari-hari masyarakat pada Wilayih Sungai lintas kabupaten", "", "", "", "Teks OCR asli ('Wilayih')."),
 ("A03", "air_baku", "kabupaten_kota", "PEMDA", "Menjamin air baku di WS dalam satu kab/kota dan kebutuhan pokok minimal warga", "uu-17-2019", "14",
  "menjamin penyediaan Air baku yang memenuhi kualitas untuk pemenuhan kebutuhan pokok minimal sehari-hari masyarakat pada Wilayah Sungai dalam satu kabupaten/kota", "", "", "", ""),
 ("A04", "air_baku", "operator", "PJT1", "Pengelola SDA penugasan (UPT atau BUMN/BUMD) untuk satu WS", "uu-17-2019", "16",
  "unit pelaksana teknis kementerian/unit pelaksana teknis daerah atau badan usaha milik negara/ badan usaha milik daerah di bidang Pengelolaan Sumber Daya Air",
  "pp-46-2010", "4", "Wilayah Sungai Kali Brantas dan Wilayah Sungai Bengawan Solo secara utuh dari hulu sampai hilir", ""),
 ("A05", "air_baku", "operator", "PJT2", "Pengelola SDA WS Citarum", "pp-25-2022", "6", "a. Wilayah Sungai Citarum", "", "", "", ""),
 ("A06", "air_baku", "lintas", "PEMPUS", "Tugas dan wewenang pusat/daerah dijalankan sesuai NSPK yang ditetapkan Pemerintah Pusat (perubahan Cipta Kerja)", "uu-6-2023", "367",
  "sesuai dengan norma, standar, prosedur, dan kriteria yang ditetapkan oleh Pemerintah Pusat diberi tugas dan wewenang untuk mengatur dan mengelola Sumber Daya Air", "", "", "",
  "Pasal 10, 11, 13-16 UU 17/2019 tidak diubah UU 6/2023; Pasal 9, 12, 17, 19 diubah."),
 ("A07", "air_minum", "pusat", "KEMEN_PU", "Penetapan pengembangan SPAM nasional; SPAM lintas provinsi dan strategis nasional (Ditjen Cipta Karya)", "uu-23-2014", "323",
  "Penetapan pengembangan Sistem Penyediaan Air Minum (SPAM) secara nasional", "perpres-170-2024", "7",
  "Direktorat Jenderal Cipta Karya mempunyai tugas menyelenggarakan perumusan dan pelaksanaan kebijakan di bidang penyelenggaraan sistem penyediaan air minum", ""),
 ("A08", "air_minum", "provinsi", "PEMDA", "Pengelolaan dan pengembangan SPAM lintas kab/kota", "uu-23-2014", "323", "Pengelolaan dan pengembangan SPAM lintas Daerah kabupaten/kota", "", "", "", ""),
 ("A09", "air_minum", "kabupaten_kota", "PEMDA", "Pengelolaan dan pengembangan SPAM di kab/kota", "uu-23-2014", "323", "Pengelolaan dan pengembangan SPAM di Daerah kabupaten/kota", "", "", "", ""),
 ("A10", "air_minum", "operator", "BUMD_SPAM", "Penyelenggara SPAM: BUMN/BUMD, UPT/UPTD, kelompok masyarakat, badan usaha", "pp-122-2015", "19",
  "Penyelenggaraan SPAM dilaksanakan oleh: a. BUMN/BUMD; b. UPT/UPTD; c. Kelompok Masyarakat; dan/atau d. Badan Usaha", "", "", "", ""),
 ("A11", "irigasi", "pusat", "KEMEN_PU", "Sistem irigasi primer-sekunder DI > 3.000 ha, lintas provinsi/negara, strategis; menetapkan status DI", "uu-23-2014", "322",
  "daerah irigasi yang luasnya lebih dari 3000 ha", "uu-17-2019", "11", "f. menetapkan status daerah irigasi", ""),
 ("A12", "irigasi", "provinsi", "PEMDA", "Sistem irigasi primer-sekunder DI 1.000-3.000 ha dan lintas kab/kota", "uu-23-2014", "322", "daerah irigasi yang luasnya 1000 ha - 3000 ha", "", "", "", ""),
 ("A13", "irigasi", "kabupaten_kota", "PEMDA", "Sistem irigasi primer-sekunder DI < 1.000 ha dalam satu kab/kota", "uu-23-2014", "322",
  "daerah irigasi yang luasnya kurang dari 1000 ha dalam 1 (satu) Daerah kabupaten/kota", "", "", "", ""),
 ("A14", "irigasi", "pusat", "KEMENTAN", "Jaringan irigasi tersier kewenangan Kementan (Ditjen Lahan dan Irigasi Pertanian)", "inpres-2-2025", "7",
  "jaringan irigasi tersier kewenangan Kementerian Pertanian", "perpres-192-2024", "5", "Direktorat Jenderal Lahan dan Irigasi Pertanian", ""),
 ("A15", "irigasi", "lintas", "KEMEN_PU", "Inpres 2/2025: PU mengambil alih percepatan jaringan irigasi kewenangan Kementan dan pemda, lalu menyerahkan kembali", "inpres-2-2025", "4",
  "pada jaringan irigasi kewenangan Kementerian Pertanian dan pemerintah daerah yang akan diambil alih", "inpres-2-2025", "6",
  "kepada Kementerian Pertanian melalui alih status atau pemerintah daerah dalam bentuk hibah", ""),
 ("A16", "irigasi", "lintas", "KEMENKO_IPK", "Sinkronisasi dan koordinasi percepatan jaringan irigasi", "inpres-2-2025", "2",
  "melaksanakan sinkronisasi dan koordinasi serta kegiatan percepatan pembangunan", "", "", "", ""),
 ("A17", "waduk_bendungan", "pusat", "KEMEN_PU", "Menteri SDA membina keamanan bendungan; rencana tindak darurat bila gejala/terjadi kegagalan bendungan", "pp-37-2010", "23",
  "apabila terdapat gejala kegagalan bendungan atau terjadi kegagalan bendungan", "pp-37-2010", "3",
  "Menteri adalah menteri yang menyelenggarakan urusan pemerintahan di bidang sumber daya air", ""),
 ("A18", "waduk_bendungan", "kabupaten_kota", "PEMDA", "RTD dikonsultasikan ke bupati/wali kota dan gubernur yang terpengaruh", "pp-37-2010", "24",
  "dikonsultasikan kepada bupati/walikota dan gubernur yang wilayahnya terpengaruh potensi kegagalan bendungan", "", "", "", ""),
 ("A19", "waduk_bendungan", "lintas", "BPBD", "Instansi teknis yang diikutsertakan menyusun RTD, misalnya perangkat daerah urusan PB", "pp-37-2010", "83",
  "Instansi teknis misalnya satuan kerja perangkat daerah yang menyelenggarakan urusan pemerintahan di bidang penanggulangan bencana", "", "", "", ""),
 ("A20", "air_tanah", "pusat", "KEMEN_ESDM", "Penetapan cekungan air tanah dan zona konservasi CAT lintas provinsi/negara; penyelidikan air tanah (Badan Geologi)", "uu-23-2014", "435",
  "a. Penetapan cekungan air tanah. b. Penetapan zona konservasi air tanah pada cekungan air tanah lintas Daerah provinsi dan lintas negara",
  "perpres-169-2024", "12", "vulkanologi dan mitigasi bencana geologi, air tanah, dan geologi lingkungan", ""),
 ("A21", "air_tanah", "pusat", "PEMPUS", "Zona konservasi air tanah pada CAT di WS lintas negara/provinsi/strategis (rumusan berbasis WS)", "uu-17-2019", "11",
  "menetapkan zona konservasi Air Tanah pada Cekungan Air Tanah di Wilayah Sungai lintas negara", "", "", "", "K/L tidak disebut."),
 ("A22", "air_tanah", "provinsi", "PEMDA", "Zona konservasi CAT dalam provinsi; izin pengeboran, pemakaian, pengusahaan air tanah (UU 23/2014)", "uu-23-2014", "435",
  "Penetapan zona konservasi air tanah pada cekungan air tanah dalam Daerah provinsi" + SEP + "izin pemakaian, dan izin pengusahaan air tanah dalam Daerah provinsi", "", "", "", ""),
 ("A23", "air_tanah", "provinsi", "PEMDA", "Zona konservasi air tanah pada CAT di WS lintas kab/kota (UU 17/2019)", "uu-17-2019", "13",
  "menetapkan zona konservasi Air Tanah'pada Cekungan Air Tanah di Wilayah Sungai lintas kabupaten", "", "", "", "Teks OCR asli (apostrof)."),
 ("A24", "subsiden", "pusat", "KEMEN_ESDM", "Pengendalian daya rusak air tanah: mencegah, menghentikan, mengurangi amblesan (Menteri bidang air tanah, gubernur, bupati)", "pp-43-2008", "31",
  "mencegah, menghentikan, atau mengurangi terjadinya amblesan tanah" + SEP + "Menteri, gubernur, atau bupati/walikota sesuai dengan kewenangannya menyelenggarakan pengendalian daya rusak air tanah",
  "pp-43-2008", "3", "Menteri adalah Menteri yang tugas dan tanggung jawabnya di bidang air tanah", "'Menteri bidang air tanah' dipetakan ke ESDM (Badan Geologi: air tanah)."),
 ("A25", "subsiden", "provinsi", "PEMDA", "Gubernur dan bupati/wali kota ikut menyelenggarakan pengendalian daya rusak air tanah (amblesan)", "pp-43-2008", "31",
  "Menteri, gubernur, atau bupati/walikota sesuai dengan kewenangannya menyelenggarakan pengendalian daya rusak air tanah", "", "", "", ""),
 ("A26", "subsiden", "pusat", "KEMEN_PU", "Kawasan daya rusak air memuat 'ambles', ditetapkan Menteri SDA (dan gubernur/bupati)", "pp-30-2024", "66",
  "d. banjir lahar dingin; e. ambles", "pp-30-2024", "6", "Menteri adalah menteri yang menyelenggarakan urusan pemerintahan di bidang Sumber Daya Air", ""),
 ("A27", "subsiden", "lintas", "BOP_PANTURA", "Penurunan muka tanah Pantura jadi dasar pembentukan BOP Pantura Jawa", "perpres-77-2025", "1",
  "terjadinya penurunan air muka tanah", "", "", "", ""),
 ("A28", "banjir_rob", "pusat", "KEMEN_PU", "NCICD: pembangunan oleh Pemerintah Pusat (Kementerian PU) dan Pemprov DKI", "web-dsda-ncicd-2025", "1",
  "Pelaksanaan pembangunan NCICD ini terbagi melalui Pemerintah Pusat oleh Kementerian PU dan Pemprov DKI Jakarta melalui Dinas Sumber Daya Air", "", "", "", ""),
 ("A29", "banjir_rob", "provinsi", "PEMDA", "NCICD Fase A: trase kewenangan Pemprov DKI 20,9 km, terbangun 9,4 km (17 Jul 2025)", "web-dsda-ncicd-2025", "1",
  "tercatat sepanjang 9,4 km tanggul pengaman pantai telah terealisasi dari total trase kewenangan Pemerintah Provinsi DKI Jakarta yang sepanjang 20,9 km", "", "", "", ""),
 ("A30", "banjir_rob", "lintas", "BOP_PANTURA", "Pengelolaan Pantura Jawa termasuk Giant Sea Wall (PSN RPJMN 2025-2029)", "perpres-77-2025", "1",
  "merupakan Proyek Strategis Nasional" + SEP + "diperlukan pembentukan Badan Otorita Pengelola Pantai Utara Jawa", "", "", "", ""),
]

# ---------------------------------------------------------------------------------------------------------------
# 4. Klaster nasional PB: dua versi berdampingan. (versi, no, klaster, koordinator_sumber, lembaga_okt2026, sid, hlm, kutipan, catatan)
# ---------------------------------------------------------------------------------------------------------------
WB = "web-bpbddiy-klaster-2019"
K = [
 ("Kepka BNPB 173/2014", 1, "Kesehatan", "Kepala Pusat Penanggulangan Krisis Kesehatan, Kementerian Kesehatan", "KEMENKES", WB, "1",
  "Koordinator : Kepala Pusat Penanggulangan Krisis Kesehatan, Kementerian Kesehatan", "Wakil: Pusat Kedokteran Polri."),
 ("Kepka BNPB 173/2014", 2, "Pencarian dan Penyelamatan", "Direktur Operasi dan Pelatihan, BASARNAS", "BASARNAS", WB, "1",
  "Koordinator : Direktur Operasi dan Pelatihan, BASARNAS", "Wakil: Wakil Asisten Operasi TNI."),
 ("Kepka BNPB 173/2014", 3, "Logistik", "Direktur Logistik, BNPB", "BNPB", WB, "1", "Koordinator : Direktur Logistik, BNPB", "Wakil: Direktur PSKBA Kemensos."),
 ("Kepka BNPB 173/2014", 4, "Pengungsian dan Perlindungan", "Direktur Perlindungan Sosial Korban Bencana Alam, Kementerian Sosial", "KEMENSOS", WB, "1",
  "Koordinator: Direktur Perlindungan Sosial Korban Bencana Alam, Kementerian Sosial", "Wakil: Asisten Operasi Polri."),
 ("Kepka BNPB 173/2014", 5, "Pendidikan", "Kepala Biro Perencanaan dan KLN, Setjen Kementerian Pendidikan", "KEMENDIKDASMEN", WB, "1",
  "Koordinator : Kepala Biro Perencanaan dan Kerjasama Luar Negeri, Sekretariat Jendral, Kementerian Pendidikan", "Wakil: Setditjen Pendidikan Islam Kemenag."),
 ("Kepka BNPB 173/2014", 6, "Sarana dan Prasarana", "Sekretaris Ditjen Cipta Karya, Kementerian Pekerjaan Umum", "KEMEN_PU", WB, "1",
  "Koordinator : Sekretaris Ditjen Cipta Karya, Kementerian Pekerjaan Umum", "Wakil: Dirjen SDPPI Kominfo (kini Komdigi). Hunian tetap kini urusan Kementerian PKP."),
 ("Kepka BNPB 173/2014", 7, "Ekonomi", "Sekretaris Ditjen Hortikultura, Kementerian Pertanian", "KEMENTAN", WB, "1",
  "Koordinator : Sekretaris Ditjen Hortikultura, Kementerian Pertanian", "Wakil: Kementerian Koperasi dan UKM (kini dipecah: Kemenkop, Kemen UMKM)."),
 ("Kepka BNPB 173/2014", 8, "Pemulihan Dini", "Direktur Pencegahan dan Penanggulangan Bencana, Kementerian Dalam Negeri", "KEMENDAGRI", WB, "1",
  "Koordinator : Direktur Pencegahan dan Penanggulangan Bencana, KementerianDalam Negeri", "Wakil: KemenPANRB."),
 ("Kepka BNPB 308/2024", 1, "Pencarian dan Pertolongan", "Badan Nasional Pencarian dan Pertolongan", "BASARNAS", JK, "1",
  "Klaster Pencarian dan Pertolongan dengan koordinator Badan Nasional Pencarian dan Pertolongan", ""),
 ("Kepka BNPB 308/2024", 2, "Pengungsian dan Perlindungan", "Kementerian Sosial", "KEMENSOS", JK, "1", "Klaster Pengungsian dan Perlindungan dengan koordinator Kementerian Sosial", ""),
 ("Kepka BNPB 308/2024", 3, "Logistik", "Badan Nasional Penanggulangan Bencana", "BNPB", JK, "1", "Klaster Logistik dengan koordinator Badan Nasional Penanggulangan Bencana", ""),
 ("Kepka BNPB 308/2024", 4, "Kesehatan", "Kementerian Kesehatan", "KEMENKES", JK, "1", "Klaster Kesehatan dengan koordinator Kementerian Kesehatan", ""),
 ("Kepka BNPB 308/2024", 5, "Pendidikan", "Kementerian Pendidikan dan Kebudayaan", "KEMENDIKDASMEN", JK, "1", "Klaster Pendidikan dengan koordinator Kementerian Pendidikan dan Kebudayaan",
  "Nama di Kepka tidak ada di Perpres 90/2025; pewaris pendidikan dasar-menengah Kemendikdasmen, pendidikan tinggi Kemendiktisaintek, kebudayaan Kemenbud."),
 ("Kepka BNPB 308/2024", 6, "Pemulihan", "Kementerian Dalam Negeri", "KEMENDAGRI", JK, "1", "Klaster Pemulihan dengan koordinator Kementerian Dalam Negeri", ""),
]
K_SUMBER_CATATAN = {
 "Kepka BNPB 173/2014": "Teks SK tidak dibuka; daftar dari BPBD DIY (8 Jul 2019) yang menulis tahunnya '2015'. Tahun 2014 dipakai BNPB dalam penyebutan lain.",
 "Kepka BNPB 308/2024": "Teks SK tidak ada di korpus lokal; daftar dari Juklak BNPB 16/2025 hlm 1. Apakah SK 308/2024 mencabut SK 173/2014 tidak tertulis di sumber yang dibuka.",
}

# ---------------------------------------------------------------------------------------------------------------
# 5. Tumpang tindih, celah, dan nomenklatur usang. jenis_bukti: "dinyatakan sumber" (sumbernya sendiri menyebut
#    tumpang tindih/celah) atau "disimpulkan dari teks resmi" (penyusun membandingkan teks resmi yang dikutip).
#    bukti = daftar (sid, hlm, kutipan), semuanya diverifikasi.
# ---------------------------------------------------------------------------------------------------------------
C = [
 ("C01", "Ambiguitas regulasi dan pembagian kewenangan PB", "tumpang_tindih", "BNPB;BPBD;PEMDA", "dinyatakan sumber",
  "Renstra BNPB 2025-2029 mengutip National Assessment Report 2023: ketidakjelasan regulasi dan pembagian kewenangan mengakibatkan tumpang tindih penanganan bencana.",
  [("jdih:perban-nomor-5-tahun-2025", "24", "Terdapat ketidakjelasan dalam regulasi dan" + SEP + "pembagian kewenangan, mengakibatkan tumpang" + SEP + "tindih dalam penanganan bencana")]),
 ("C02", "Dana darurat daerah (BTT) dan pusat (DSP) belum sinkron; TRC PB multisektor tanpa dasar hukum; SKPDB lemah", "celah", "BNPB;BPBD;PEMDA;KEMENKEU;KEMENDAGRI", "dinyatakan sumber",
  "Renas PB 2025-2029 mencatat akuntabilitas BTT tidak jelas, pemahaman dan pengelolaan BTT-DSP belum tersinkronisasi, belum ada aturan TRC PB multisektor, dan koordinasi multisektor dalam SKPDB kurang optimal.",
  [("jdih:perban-nomor-1-tahun-2025", "26", "belum tersinkronisasinya pemahaman dan pengelolaan dana untuk penanganan darurat bencana"),
   ("jdih:perban-nomor-1-tahun-2025", "26", "belum adanya peraturan perundangan dan petunjuk pelaksanaan bagaimana operasional dan pembentukan Tim Reaksi Cepat Penanggulangan Bencana (TRC PB) multisektor"),
   ("jdih:perban-nomor-1-tahun-2025", "27", "kurang optimalnya koordinasi multisektor dalam penerapan Sistem Komando Penanganan Kedaruratan Bencana (SKPDB)")]),
 ("C03", "Peringatan dini: K/L penyedia data per bahaya tidak ditetapkan dalam aturan SPD", "celah", "BNPB;BMKG;KEMEN_ESDM;KEMEN_PU;KEMENHUT;KLH_BPLH;KEMENKES", "dinyatakan sumber",
  "Perban 2/2024 mendaftar 11 jenis data peringatan dini dari K/L tetapi menyerahkan siapa penyedianya ke peraturan lain. Mandat tertulis yang ditemukan: BMKG (cuaca ekstrem, iklim ekstrem, gelombang, tsunami; UU 31/2009) dan Badan Geologi (gunung api, gerakan tanah; UU 23/2014). Untuk banjir dan kekeringan hidrologis tidak ditemukan K/L penyedia peringatan dini yang ditunjuk. Renas 2025-2029 sendiri menyebut regulasi peringatan dini multiancaman belum optimal.",
  [("jdih:perban-nomor-2-tahun-2024", "5", "Kementerian/lembaga menyampaikan data dan informasi sebagaimana dimaksud pada ayat (1) sesuai dengan ketentuan peraturan perundang-undangan"),
   ("jdih:perban-nomor-1-tahun-2025", "26", "Belum optimalnya regulasi peringatan dini yang ada terutama untuk multi ancaman bencana"),
   ("uu-31-2009", "17", "a. cuaca ekstrim; b. iklim ekstrim; c. gelombang laut berbahaya; dan d. tsunami")]),
 ("C04", "Inpres 3/2020 (karhutla) masih berlaku tetapi alamatnya memakai lembaga yang sudah berubah", "nomenklatur_usang", "KEMENHUT;KLH_BPLH;BRIN;BMKG;KEMENKO_POLKAM;KOMDIGI;KEMEN_PU;KEMEN_PKP;KEMENDIKDASMEN", "disimpulkan dari teks resmi",
  "Inpres 3/2020 (status BPK: Berlaku) ditujukan antara lain ke Menko Polhukam, Mendikbud, Menteri PUPR, Menkominfo, Menteri LHK, Menteri BUMN, Sekretaris Kabinet, Kepala LAPAN, Kepala BPPT. Sejak 2024 kehutanan dan lingkungan hidup dipisah: pengendalian kebakaran HUTAN di Kemenhut, pengendalian kebakaran LAHAN di BPLH; LAPAN dan BPPT dilebur ke BRIN; modifikasi cuaca kini fungsi BMKG; Sekretariat Kabinet dibubarkan dan diintegrasikan ke Kemensetneg. Inpres sendiri memerintahkan inventarisasi tumpang tindih regulasi karhutla.",
  [("inpres-3-2020", "1", "Menteri Lingkungan Hidup dan Kehutanan"),
   ("inpres-3-2020", "6", "melakukan inventarisasi dan prakarsa penyelesaian tumpang tindih peraturan perundang-undangan yang terkait upaya penanggulangan kebakaran hutan dan lahan"),
   ("perpres-175-2024", "13", "pengendalian kebakaran hutan"),
   ("perpres-183-2024", "15", "pengendalian kebakaran lahan"),
   ("perpres-12-2024", "2", "serta modifikasi cuaca"),
   ("inpres-3-2020", "13", "Sekretaris Kabinet, melakukan pengawasan pelaksanaan Instruksi Presiden ini"),
   ("perpres-139-2024", "", "membubarkan Sekretariat Kabinet")]),
 ("C05", "Irigasi: tiga pemegang kewenangan dan pengambilalihan sementara oleh PU", "tumpang_tindih", "KEMEN_PU;KEMENTAN;PEMDA;KEMENKO_IPK;KEMENKO_PANGAN", "dinyatakan sumber",
  "Kewenangan irigasi dibagi menurut luas DI (pusat > 3.000 ha, provinsi 1.000-3.000 ha, kab/kota < 1.000 ha) ditambah jaringan tersier di Kementan. Inpres 2/2025 membuat PU mengambil alih percepatan jaringan kewenangan Kementan dan pemda lalu menyerahkannya kembali (alih status/hibah), dan mewajibkan PU serta Kementan memastikan tidak ada tumpang tindih.",
  [("inpres-2-2025", "5", "memastikan tidak ada tumpang tindih kegiatan percepatan pembangunan"),
   ("inpres-2-2025", "7", "pada lokasi jaringan irigasi tersier kewenangan Kementerian Pertanian dengan kegiatan yang dilaksanakan oleh pemerintah daerah"),
   ("uu-23-2014", "322", "daerah irigasi yang luasnya lebih dari 3000 ha")]),
 ("C06", "Penurunan muka tanah (subsiden) tanpa pemegang kewenangan tunggal", "tumpang_tindih", "KEMEN_ESDM;KEMEN_PU;PEMDA;BOP_PANTURA;BNPB", "disimpulkan dari teks resmi",
  "Amblesan diatur di dua rezim: pengendalian daya rusak air tanah oleh 'Menteri bidang air tanah', gubernur, bupati (PP 43/2008) dan kawasan daya rusak air yang memuat 'ambles' oleh Menteri SDA, gubernur, bupati (PP 30/2024). Izin air tanah menurut UU 23/2014 di provinsi. BOP Pantura Jawa dibentuk dengan alasan penurunan muka tanah, tetapi Dewan Pengarahnya tidak memuat Kementerian ESDM maupun BNPB.",
  [("pp-43-2008", "31", "mencegah, menghentikan, atau mengurangi terjadinya amblesan tanah"),
   ("pp-30-2024", "66", "e. ambles"),
   ("perpres-77-2025", "1", "terjadinya penurunan air muka tanah"),
   ("perpres-77-2025", "5-6", "a. Menteri Perencanaan Pembangunan Nasional/Kepala Badan Perencanaan Pembangunan Nasional" + SEP + "m. Kepala Badan Informasi Geospasial; dan n. Kepala daerah di Pantura Jawa")]),
 ("C07", "Air tanah: dasar spasial kewenangan berbeda antara UU 23/2014 (CAT per provinsi) dan UU 17/2019 (CAT per wilayah sungai)", "tumpang_tindih", "KEMEN_ESDM;PEMPUS;PEMDA", "disimpulkan dari teks resmi",
  "UU 23/2014 memberi provinsi zona konservasi untuk CAT 'dalam Daerah provinsi' dan izin air tanah; UU 17/2019 memberi provinsi zona konservasi CAT 'di Wilayah Sungai lintas kabupaten/kota' dan pusat untuk CAT di WS lintas provinsi/strategis. Batas CAT dan WS tidak sama, dan UU 17/2019 menyebut 'Pemerintah Pusat' tanpa menunjuk K/L.",
  [("uu-23-2014", "435", "Penetapan zona konservasi air tanah pada cekungan air tanah dalam Daerah provinsi"),
   ("uu-17-2019", "13", "menetapkan zona konservasi Air Tanah'pada Cekungan Air Tanah di Wilayah Sungai lintas kabupaten"),
   ("uu-17-2019", "11", "menetapkan zona konservasi Air Tanah pada Cekungan Air Tanah di Wilayah Sungai lintas negara")]),
 ("C08", "Klaster nasional: 8 klaster (2014) menjadi 6 (2024); klaster Sarana-Prasarana dan Ekonomi hilang; nama koordinator pendidikan usang", "nomenklatur_usang", "KEMEN_PU;KEMENTAN;KEMENDIKDASMEN;BNPB", "disimpulkan dari teks resmi",
  "Versi 2014 (dikutip BPBD DIY) memuat klaster Sarana dan Prasarana (koordinator Kementerian PU) dan Ekonomi (Kementan). Versi Kepka 308/2024 (dikutip Juklak 16/2025) tinggal 6 klaster tanpa keduanya, dan menulis koordinator pendidikan 'Kementerian Pendidikan dan Kebudayaan' yang tidak ada di daftar kementerian Perpres 90/2025. Teks SK 308/2024 tidak tersedia di korpus lokal.",
  [(WB, "1", "Koordinator : Sekretaris Ditjen Cipta Karya, Kementerian Pekerjaan Umum"),
   (JK, "1", "ditetapkan 6 (enam) klaster penanggulangan bencana"),
   (JK, "1", "Klaster Pendidikan dengan koordinator Kementerian Pendidikan dan Kebudayaan")]),
 ("C09", "Epidemi: UU 6/2018 Kekarantinaan Kesehatan sudah dicabut; dua rezim status untuk satu kejadian", "regulasi_dicabut", "KEMENKES;PEMDA;BNPB;PRES", "disimpulkan dari teks resmi",
  "UU 6/2018 dicabut oleh UU 17/2023 (relasi BPK), padahal KERANGKA Bab 2/8 dan riset A masih merujuknya. Untuk epidemi kini ada dua penetapan status yang terpisah: KLB/daerah terjangkit wabah (bupati, gubernur, Menteri Kesehatan; UU 17/2023) dan status keadaan darurat bencana (Presiden, gubernur, bupati; UU 24/2007 jo. Perpres 17/2018). Tidak ditemukan norma yang mengaitkan keduanya.",
  [("uu-17-2023", "155", "Bupati/wali kota, gubernur, atau Menteri harus menetapkan KLB"),
   ("jdih:perpres-nomor-17-tahun-2018", "3", "untuk tingkat nasional ditetapkan oleh Presiden")]),
 ("C10", "Konflik sosial: dua rezim (UU 7/2012 dan UU 24/2007) dan rujukan fungsi koordinator yang sudah terbelah", "tumpang_tindih", "PEMDA;PRES;BNPB;KEMENKO_POLKAM;KEMENKO_PMK;POLRI;TNI", "disimpulkan dari teks resmi",
  "Status keadaan konflik ditetapkan kepala daerah/Presiden menurut UU 7/2012, sementara konflik sosial juga 'bencana sosial' menurut UU 24/2007 dan sejak Perpres 46/2026 BNPB dapat bertindak dalam keadaan tertentu bagi daerah pascakonflik. Satgas nasional UU 7/2012 memakai 'kementerian yang membidangi koordinasi urusan politik, hukum, dan keamanan', fungsi yang sejak 2024 dibagi ke Kemenko Polkam dan Kemenko Kumham Imipas; deputi PB dan konflik sosial justru di Kemenko PMK.",
  [("uu-7-2012", "11", "Status Keadaan Konflik skala nasional sebagaimana dimaksud dalam Pasal 15 ayat (4) ditetapkan oleh Presiden"),
   ("uu-24-2007", "2", "konflik sosial antarkelompok atau antarkomunitas masyarakat"),
   ("uu-7-2012", "24", "a. kementerian yang membidangi koordinasi urusan politik, hukum, dan keamanan"),
   ("perpres-90-2025", "2", "1. Kementerian Koordinator Bidang Politik dan Keamanan; 2. Kementerian Koordinator Bidang Hukum, Hak Asasi Manusia, Imigrasi, dan Pemasyarakatan"),
   ("perpres-144-2024", "13", "di bidang penanggulangan bencana dan konflik sosial")]),
 ("C11", "Kementerian BUMN masih tercantum di Perpres 140/2024 jo. 90/2025 padahal sudah diganti BP BUMN", "nomenklatur_usang", "BP_BUMN;KEMENKO_EKON;PJT1;PJT2", "disimpulkan dari teks resmi",
  "Perpres 90/2025 (8 Sep 2025) masih mendaftar 'Kementerian Badan Usaha Milik Negara' sebagai kementerian ke-40; Perpres 105/2025 (7 Okt 2025) mencabut Perpres 179/2024 dan membentuk BP BUMN, dengan pengelolaan BUMN oleh Danantara (UU 16/2025). Tidak ditemukan perubahan Perpres 140/2024 setelah itu di basis data BPK per 23 Okt 2026. Instruksi karhutla kepada Menteri BUMN (Inpres 3/2020) kehilangan alamat.",
  [("perpres-90-2025", "3", "4O. Kementerian Badan Usaha Milik Negara"),
   ("perpres-105-2025", "3", "BP BUMN melaksanakan tugas pemerintahan di bidang pengaturan badan usaha milik negara"),
   ("inpres-3-2020", "7", "14. Menteri Badan Usaha Milik Negara")]),
 ("C12", "Unsur Pengarah BNPB dan peran K/L bantuan internasional masih memakai nama kementerian lama", "nomenklatur_usang", "BNPB;KEMENKO_POLKAM;KEMEN_PU;KEMEN_PKP;KEMENHUT;KLH_BPLH;KOMDIGI", "disimpulkan dari teks resmi",
  "Perpres 1/2019 Pasal 13 menetapkan wakil Kemenko Polhukam dan Kementerian PUPR di Unsur Pengarah; Perban 6/2018 Pasal 17 membagi peran bantuan internasional ke KLHK, Kemenkumham, Kominfo, PUPR. Keempatnya sudah dipecah/diganti sejak 2024.",
  [("perpres-1-2019", "5", "b. Kementerian Koordinator Bidang Politik, Hukum, dan Keamanan"),
   ("perpres-1-2019", "6", "h. Kementerian Pekerjaan Umum dan Perumahan Ralryat"),
   ("jdih:perban-nomor-6-tahun-2018", "19", "f. Kementerian Lingkungan Hidup dan Kehutanan berwenang dalam penanganan bantuan kebakaran hutan dan lahan")]),
 ("C13", "Pesisir Jakarta: tiga pelaku tanggul (Kementerian PU, Pemprov DKI, BOP Pantura Jawa)", "tumpang_tindih", "KEMEN_PU;PEMDA;BOP_PANTURA;KEMENKO_IPK", "disimpulkan dari teks resmi",
  "NCICD dibangun terbagi antara Kementerian PU dan Pemprov DKI (trase kewenangan DKI 20,9 km dari 39 km trase kritis); sejak 2025 BOP Pantura Jawa berwenang atas persiapan sampai pembangunan Pantura termasuk Giant Sea Wall, dengan Gubernur DKI dan Menteri PU sebagai anggota Dewan Pengarah.",
  [("web-dsda-ncicd-2025", "1", "Pelaksanaan pembangunan NCICD ini terbagi melalui Pemerintah Pusat oleh Kementerian PU dan Pemprov DKI Jakarta"),
   ("perpres-77-2025", "4", "BOP Pantura Jawa mempunyai tugas melaksanakan persiapan, perencanaan, pembangunan, dan pengembangan di Pantura Jawa"),
   ("perpres-77-2025", "6", "b. Gubernur Provinsi Daerah Khusus Ibukota Jakarta")]),
 ("C14", "Kebakaran industri/gagal teknologi tanpa K/L penanggung jawab nasional yang tertulis", "celah", "PEMDA;KEMENDAGRI;KLH_BPLH;BNPB", "disimpulkan dari teks resmi",
  "Yang tertulis: pemadaman oleh damkar kab/kota (UU 23/2014), standardisasi damkar oleh pusat, B3 di KLH/BPLH, dan gagal teknologi sebagai bencana nonalam (UU 24/2007). Tidak ditemukan norma yang menunjuk K/L koordinator untuk kebakaran industri/kilang berskala bencana di sumber yang dibaca.",
  [("uu-23-2014", "333", "Pencegahan, pengendalian, pemadaman, penyelamatan, dan penanganan bahan berbahaya dan beracun kebakaran dalam Daerah kabupaten/kota"),
   ("uu-24-2007", "2", "gagal teknologi, gagal modernisasi, epidemi, dan wabah penyakit")]),
 ("C15", "Rantai koordinasi peringatan dini melintasi tiga Kemenko", "celah", "BMKG;KEMENHUB;BNPB;KEMENKO_PMK;KEMEN_PU;KEMENKO_IPK;KEMEN_ESDM;KEMENKO_EKON", "disimpulkan dari teks resmi",
  "BMKG bertanggung jawab kepada Presiden melalui menteri bidang transportasi (di bawah Kemenko IPK), BNPB dikoordinasikan Kemenko PMK, Badan Geologi ada di Kementerian ESDM (Kemenko Perekonomian), dan Kementerian PU (banjir, bendungan) di Kemenko IPK.",
  [("perpres-12-2024", "2", "BMKG berada di bawah dan bertanggung jawab kepada Presiden melalui menteri yang menyelenggarakan urusan pemerintahan di bidang transportasi"),
   ("perpres-1-2019", "4", "BNPB dikoordinasikan oleh kementerian yang menyelenggarakan koordinasi"),
   ("perpres-143-2024", "5", "d. Kementerian Energi dan Sumber Daya Mineral"),
   ("perpres-145-2024", "4", "b. Kementerian Pekerjaan Umum")]),
]


# ---------------------------------------------------------------------------------------------------------------
def norm(s):
    return re.sub(r"\s+", "", s).lower()


def hal_set(hlm):
    if not hlm:
        return None
    a, _, b = hlm.partition("-")
    return set(range(int(a), int(b or a) + 1))


class Korpus:
    def __init__(self):
        self.cache = {}
        self.idx = json.load(open(os.path.join(JDIH, "indeks.json"), encoding="utf-8"))
        self.idx = {v["slug"]: v for v in self.idx.values()}

    def halaman(self, sid):
        if sid not in self.cache:
            if sid.startswith("jdih:"):
                d = json.load(open(os.path.join(JDIH, "teks", sid[5:] + ".json"), encoding="utf-8"))
            else:
                with gzip.open(os.path.join(MEN, "teks", sid + ".json.gz"), "rt", encoding="utf-8") as f:
                    d = json.load(f)
            self.cache[sid] = {h["n"]: norm(h["t"]) for h in d["halaman"]}
        return self.cache[sid]

    def meta(self, sid):
        if sid.startswith("jdih:"):
            v = self.idx[sid[5:]]
            return {"sid": sid, "judul": v["Judul"], "status": v["Status"], "url": v["url"], "pdf_url": (v.get("pdf") or [""])[0],
                    "tanggal_penetapan": v.get("Tanggal Penetapan", ""), "sumber_teks": "data/raw/hukum/teks/" + sid[5:] + ".json"}
        return json.load(open(os.path.join(MEN, "meta", sid + ".json"), encoding="utf-8"))

    def cek(self, sid, hlm, kutipan, konteks):
        """Kutipan wajib ada (tanpa spasi, huruf kecil) di halaman yang disebut. Mengembalikan halaman tempat ditemukan."""
        assert kutipan.strip(), f"{konteks}: kutipan kosong"
        hal = self.halaman(sid)
        pilih = hal_set(hlm)
        if pilih is not None:
            hilang = pilih - set(hal)
            assert not hilang, f"{konteks}: halaman {sorted(hilang)} tidak disimpan untuk {sid}"
        teks = "".join(t for n, t in sorted(hal.items()) if pilih is None or n in pilih)
        for frag in kutipan.split(SEP):
            assert norm(frag) in teks, f"{konteks}: kutipan tidak ditemukan di {sid} hlm {hlm or 'semua'}: «{frag[:90]}»"


def tulis_csv(nama, kolom, baris):
    with open(os.path.join(OUT, nama), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(kolom)
        for b in baris:
            w.writerow(["" if x is None else x for x in b])


def main():
    kp = Korpus()
    lem = {r[0]: r for r in L}
    assert len(lem) == len(L), "kode lembaga ganda"
    dipakai = set()  # sid yang dirujuk

    # --- lembaga: kutipan tugas, nomenklatur sebelumnya (relasi BPK), status berlaku, nama di daftar Perpres 90/2025 ---
    p90 = norm(" ".join(t for n, t in kp.halaman("perpres-90-2025").items() if n in (2, 3, 4)))
    for kode in ["Kementerian Koordinator Bidang Politik dan Keamanan", "Kementerian Koordinator Bidang Pangan", "49. Kementerian Pemuda dan Olahraga"]:
        assert norm(kode) in p90, f"daftar Perpres 90/2025 tidak memuat {kode}"
    baris_l = []
    for (kode, nama, singkat, kel, koord, sebelum, dasar, sid, hlm, kut, unit, cat) in L:
        kp.cek(sid, hlm, kut, f"lembaga {kode}")
        dipakai.add(sid)
        m = kp.meta(sid)
        status = m.get("status", "")
        assert status.lower() == "berlaku", f"dasar hukum {kode} ({sid}) berstatus {status!r}"
        if sebelum:
            assert norm(sebelum) in norm(m.get("status_peraturan") or ""), f"{kode}: relasi 'Mencabut {sebelum}' tidak ada di metadata BPK {sid}"
        if kel in ("Kementerian", "Kementerian koordinator"):
            assert norm(nama) in p90, f"nama {nama!r} tidak ada di daftar kementerian Perpres 90/2025"
        assert koord == "-" or koord in lem, f"{kode}: koordinator {koord} tidak dikenal"
        baris_l.append([kode, nama, singkat, kel, koord, sebelum, dasar, sid, hlm, kut, unit, status, m.get("url", ""), "resmi", cat])
    tulis_csv("lembaga.csv", ["kode", "nama_resmi_okt2026", "singkatan", "kelompok", "dikoordinasikan_oleh", "dasar_hukum_lama_dicabut",
                              "dasar_hukum", "sid", "hlm", "kutipan", "unit_terkait", "status_bpk", "url_sumber", "label", "catatan"], baris_l)

    # --- peran ---
    ids = set()
    baris_r = []
    for (i, kode, anc, fase, peran, uraian, sid, hlm, kut, sid2, hlm2, kut2, cat) in R:
        assert i not in ids, f"id ganda {i}"
        ids.add(i)
        assert kode in lem, f"{i}: lembaga {kode} tidak ada di lembaga.csv"
        assert anc in ANCAMAN and fase in FASE and peran in "KPRI" and len(peran) == 1, f"{i}: kode ancaman/fase/peran tak sah"
        kp.cek(sid, hlm, kut, i)
        dipakai.add(sid)
        if sid2:
            if hlm2 == "" and not kut2.startswith(("PERPRES", "Perpres", "PP ")):
                kp.cek(sid2, hlm2, kut2, i + " (bukti 2)")
            elif hlm2 == "":   # bukti 2 = relasi cabut di metadata BPK
                assert norm(kut2) in norm(kp.meta(sid2).get("status_peraturan") or ""), f"{i}: relasi {kut2!r} tidak ada di metadata {sid2}"
            else:
                kp.cek(sid2, hlm2, kut2, i + " (bukti 2)")
            dipakai.add(sid2)
        baris_r.append([i, kode, lem[kode][1], ANCAMAN[anc][1], anc, fase, peran, uraian, sid, hlm, kut, sid2, hlm2, kut2, "resmi", cat])
    tulis_csv("peran.csv", ["id", "lembaga", "nama_lembaga", "kategori", "ancaman", "fase", "peran", "uraian", "sid", "hlm", "kutipan",
                            "sid2", "hlm2", "kutipan2", "label", "catatan"], baris_r)

    # --- matriks turunan (lembaga x ancaman x fase), sel = kode peran + id baris peran ---
    sel = defaultdict(lambda: defaultdict(list))
    for b in baris_r:
        sel[(b[1], b[4])][b[5]].append(f"{b[6]}[{b[0]}]")
    urut_l = [r[0] for r in L]
    baris_m = []
    for (kode, anc), f in sorted(sel.items(), key=lambda x: (urut_l.index(x[0][0]), list(ANCAMAN).index(x[0][1]))):
        baris_m.append([kode, lem[kode][2], ANCAMAN[anc][1], anc] + [";".join(f.get(x, [])) for x in FASE])
    tulis_csv("matriks_bencana.csv", ["lembaga", "singkatan", "kategori", "ancaman"] + FASE, baris_m)
    ringkas = defaultdict(dict)
    for (kode, anc), f in sel.items():
        ringkas[kode][anc] = " | ".join(f"{x}:{','.join(sorted({c[0] for c in f[x]}))}" for x in FASE if f.get(x))
    tulis_csv("matriks_ringkas.csv", ["lembaga", "singkatan"] + list(ANCAMAN),
              [[k, lem[k][2]] + [ringkas[k].get(a, "") for a in ANCAMAN] for k in urut_l if k in ringkas])

    # --- air ---
    baris_a = []
    for (i, komp, tingkat, kode, wewenang, sid, hlm, kut, sid2, hlm2, kut2, cat) in A:
        assert kode in lem, f"{i}: lembaga {kode} tidak dikenal"
        kp.cek(sid, hlm, kut, i)
        dipakai.add(sid)
        if sid2:
            kp.cek(sid2, hlm2, kut2, i + " (bukti 2)")
            dipakai.add(sid2)
        baris_a.append([i, komp, tingkat, kode, lem[kode][2], wewenang, sid, hlm, kut, sid2, hlm2, kut2, "resmi", cat])
    tulis_csv("matriks_air.csv", ["id", "komponen", "tingkat", "lembaga", "singkatan", "wewenang", "sid", "hlm", "kutipan", "sid2", "hlm2", "kutipan2", "label", "catatan"], baris_a)

    # --- klaster ---
    baris_k = []
    for (versi, no, nama, koord, kode, sid, hlm, kut, cat) in K:
        assert kode in lem
        kp.cek(sid, hlm, kut, f"klaster {versi} {no}")
        dipakai.add(sid)
        baris_k.append([versi, no, nama, koord, kode, lem[kode][1], sid, hlm, kut, "resmi", (cat + " " + K_SUMBER_CATATAN[versi]).strip()])
    tulis_csv("klaster.csv", ["versi", "no", "klaster", "koordinator_menurut_sumber", "lembaga", "nama_okt2026", "sid", "hlm", "kutipan", "label", "catatan"], baris_k)

    # --- celah ---
    baris_c = []
    for (i, topik, jenis, terlibat, jb, uraian, bukti) in C:
        for kode in terlibat.split(";"):
            assert kode in lem, f"{i}: lembaga {kode} tidak dikenal"
        assert jb in ("dinyatakan sumber", "disimpulkan dari teks resmi") and bukti, f"{i}: jenis bukti/bukti kosong"
        teks_b = []
        for (sid, hlm, kut) in bukti:
            kp.cek(sid, hlm, kut, i)
            dipakai.add(sid)
            teks_b.append(f"{sid} hlm {hlm or 'semua'}: «{kut}»")
        baris_c.append([i, topik, jenis, terlibat, jb, uraian, " || ".join(teks_b), "resmi"])
    tulis_csv("celah.csv", ["id", "topik", "jenis", "lembaga_terlibat", "jenis_bukti", "uraian", "bukti", "label"], baris_c)

    # --- sumber (yang dirujuk + metadata relasi yang dipakai untuk nomenklatur) ---
    for sid in PENDAMPING:
        assert kp.meta(sid)["status"].lower() == "berlaku", f"dasar hukum pendamping {sid} tidak berlaku"
    dipakai |= PENDAMPING | {"uu-6-2018", "perpres-179-2024"}
    baris_s = []
    for sid in sorted(dipakai):
        m = kp.meta(sid)
        baris_s.append([sid, m.get("judul") or m.get("url", ""), m.get("status", "") or ("halaman web" if sid.startswith("web-") else ""),
                        m.get("status_peraturan") or "", m.get("tanggal_penetapan", ""), m.get("url", ""), m.get("pdf_url", ""), m.get("pdf_sha1") or m.get("html_sha1", ""),
                        m.get("diakses", "korpus JDIH lokal" if sid.startswith("jdih:") else ""),
                        m.get("sumber_teks") or (f"mentah/teks/{sid}.json.gz" if os.path.exists(os.path.join(MEN, "teks", sid + ".json.gz")) else "hanya metadata"),
                        json.dumps(m.get("halaman_disimpan", "semua")) if not sid.startswith("jdih:") else '"semua"', "resmi"])
    tulis_csv("sumber.csv", ["sid", "judul", "status", "relasi_bpk", "tanggal_penetapan", "url", "url_pdf", "sha1", "tanggal_akses", "berkas_teks", "halaman_disimpan", "label"], baris_s)

    # --- JSON cermin ---
    tabel = {}
    for f in ["lembaga.csv", "peran.csv", "matriks_bencana.csv", "matriks_ringkas.csv", "matriks_air.csv", "klaster.csv", "celah.csv", "sumber.csv"]:
        with open(os.path.join(OUT, f), encoding="utf-8") as fh:
            rows = list(csv.reader(fh))
        tabel[f] = {"kolom": rows[0], "baris": rows[1:]}
    meta = {"paket": "lembaga", "dibangun_oleh": "data/kajian-bnpb/bangun/lembaga.py", "tanggal_batas_data": "2026-10-23",
            "kode_peran": {"K": "koordinator/penanggung jawab utama", "P": "pelaksana/pendukung", "R": "penetap status/izin/norma", "I": "informasi dan peringatan dini"},
            "ancaman": {k: {"nama": v[0], "kategori": v[1]} for k, v in ANCAMAN.items()},
            "pencocokan_kutipan": "tanpa spasi, huruf kecil; potongan dipisah ' … ' wajib semuanya ada di halaman yang disebut"}
    json.dump({"meta": meta, "tabel": tabel}, open(os.path.join(OUT, "lembaga.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # --- self-check invarian ---
    n14 = sum(1 for k in K if k[0].endswith("173/2014"))
    n24 = sum(1 for k in K if k[0].endswith("308/2024"))
    assert (n14, n24) == (8, 6), f"jumlah klaster 2014/2024 = {n14}/{n24}, harus 8/6"
    terpakai = {b[1] for b in baris_r} | {b[3] for b in baris_a} | {b[4] for b in baris_k}
    yatim = set(lem) - terpakai
    assert yatim <= ORPHAN_OK, f"lembaga tanpa peran bersumber: {sorted(yatim - ORPHAN_OK)}"
    for anc in ANCAMAN:
        assert any(b[4] == anc for b in baris_r), f"ancaman {anc} tanpa baris peran"
        if anc != "semua":
            assert any(b[4] == anc and b[6] in "KRI" for b in baris_r), f"ancaman {anc} tanpa K/R/I"
    for komp in ["air_baku", "air_minum", "irigasi", "waduk_bendungan", "air_tanah", "subsiden"]:
        assert any(b[1] == komp for b in baris_a), f"komponen air {komp} kosong"
    um = kp.meta("uu-6-2018")
    assert um["status"].lower() == "tidak berlaku" and "17 Tahun 2023" in (um.get("status_peraturan") or ""), "status UU 6/2018 berubah; periksa C09"
    m179 = kp.meta("perpres-179-2024")
    assert m179["status"].lower() == "tidak berlaku" and "105 Tahun 2025" in (m179.get("status_peraturan") or ""), "status Perpres 179/2024 berubah; periksa C11"
    for f in ["lembaga.csv", "peran.csv", "matriks_bencana.csv", "matriks_ringkas.csv", "matriks_air.csv", "klaster.csv", "celah.csv", "sumber.csv"]:
        with open(os.path.join(OUT, f), encoding="utf-8") as fh:
            rows = list(csv.reader(fh))
        assert len(rows) > 1, f"{f} kosong"
        lebar = len(rows[0])
        for r in rows:
            assert len(r) == lebar, f"{f}: lebar baris tidak konsisten"
            for x in r:
                assert x.strip().lower() not in ("nan", "none", "null", "inf"), f"{f}: nilai tak sah {x!r}"
        if "label" in rows[0]:
            j = rows[0].index("label")
            assert all(r[j] in LABEL for r in rows[1:]), f"{f}: label di luar {LABEL}"
        if "sid" in rows[0]:
            j = rows[0].index("sid")
            assert all(r[j] for r in rows[1:]), f"{f}: ada baris tanpa sumber"
    print(f"lembaga {len(L)}, peran {len(R)}, sel matriks {len(baris_m)}, air {len(A)}, klaster {len(K)}, celah {len(C)}, sumber {len(baris_s)}")
    print("self-check hijau")


if __name__ == "__main__":
    main()
