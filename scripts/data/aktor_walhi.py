"""Perusahaan di balik titik panas karhutla 2026 menurut kajian WALHI, dicek silang ke peta konsesi dan arsip VIIRS.

Pakai:  python3 scripts/data/aktor_walhi.py        # -> public/data/aktor_karhutla.json
        python3 scripts/data/aktor_walhi.py --titik titik.json  # cek terkini pakai salinan /api/titik
        python3 scripts/data/aktor_walhi.py uji    # invarian berkas hasil

Sumber: Eksekutif Nasional WALHI (2026), "Siapa di Balik Api? Menelusuri Afiliasi Modal, Kekuasaan, dan Kelompok Usaha di
Balik Perusahaan Terindikasi Karhutla Tertinggi" (Kajian Peta Aktor). Tabel 1 (15 konsesi sawit), Tabel 2 (15 PBPH),
Tabel 3 (modal asing), Tabel 4 (grup & negara), Tabel 5 (PSN Merauke), Lampiran 1-2 (93 perusahaan grup Malaysia/Singapura),
bab 2 (tokoh politik). Angka WALHI: titik panas keyakinan tinggi; Tabel 1-2 = 1 Jan-31 Agu 2026, Lampiran = Jan-Sep 2026.

Cek silang (keputusan pemilik 17 Okt 2026: daftar perusahaan tampil lagi, dicek ke peta): nama tiap perusahaan dicocokkan ke
poligon public/data/lahan/konsesi.geojson (kunci nama yang sama dengan scripts/scrape/konsesi.py), lalu titik VIIRS S-NPP
(keyakinan nominal/tinggi, api vegetasi) 1 Jan-31 Agu 2026 di dalam poligonnya dihitung dari arsip lokal
data/raw/sebaran/viirs_veg_panjang.pkl. Arsip itu tidak ada di Actions: tanpa arsip, angka cek silang lama dipertahankan.
Batas konsesi berumur (sawit/HPH +- 2014, HTI 2020-2022), dan FIRMS kosong 8 Mei-1 Jun 2026, jadi angka kita tidak akan sama
dengan WALHI; selisihnya ditampilkan apa adanya.
"""
import datetime as dt, json, math, os, pickle, re, sys

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
KONSESI = os.path.join(AKAR, "public/data/lahan/konsesi.geojson")
VIIRS = os.path.join(AKAR, "data/raw/sebaran/viirs_veg_panjang.pkl")
KELUAR = os.path.join(AKAR, "public/data/aktor_karhutla.json")
T0 = dt.datetime(2015, 1, 1, tzinfo=dt.timezone.utc)  # menit arsip VIIRS dihitung dari sini (scripts/sebaran/umum.py)
PERIODE = ("2026-01-01", "2026-09-01")
TITIK_MAKS = 300  # titik terbaru per perusahaan yang disimpan untuk terbang-ke-titik

SUMBER = {"judul": "Siapa di Balik Api? Kajian Peta Aktor Karhutla 2026", "penerbit": "Eksekutif Nasional WALHI",
          "tahun": 2026, "url": "https://www.walhi.or.id"}
NEGARA = {"ID": "Indonesia", "SG": "Singapura", "MY": "Malaysia", "IN": "India", "KR": "Korea Selatan",
          "KY": "Kep. Cayman", "VG": "Kep. Virgin Britania (BVI)", "WS": "Samoa"}
# Tabel 4: grup -> negara basis hukum (Sinar Mas, Wilmar, Salim: induk usaha terdaftar di Singapura)
GRUP_NEGARA = {"Sinar Mas": "SG", "APP/Sinar Mas": "SG", "Wilmar": "SG", "Sime Darby": "MY", "Genting Group": "MY",
               "BHD Group": "MY", "Musim Mas": "SG", "RGE/APRIL": "SG", "Lion Group": "MY", "First Resources": "SG",
               "Salim Group": "SG", "Jcorp": "MY", "Synergy Drive": "MY", "Goodhope Asia Holdings": "SG"}
# nama grup di peta (GFW/Trase) yang sama dengan grup Tabel 4: poligon di luar daftar WALHI ikut berbendera negara induk grupnya
GRUP_PETA = {"Royal Golden Eagle": "SG", "RGE Group": "SG", "Goodhope Asia Holdings": "SG"}
TABEL4 = [("Sinar Mas (termasuk APP)", "SG", 26), ("Wilmar", "SG", 21), ("Sime Darby", "MY", 9), ("Genting Group", "MY", 8),
          ("BHD Group", "MY", 6), ("Musim Mas", "SG", 6), ("RGE/APRIL", "SG", 5), ("Lion Group", "MY", 2),
          ("First Resources", "SG", 2), ("Salim Group", "SG", 2), ("Jcorp", "MY", 1), ("Synergy Drive", "MY", 1),
          ("Goodhope Asia Holdings Limited", "SG", 1), ("Premier Palmoil Energy Pte Ltd", "SG", 1),
          ("Salween Investment Pte Ltd", "SG", 1), ("Nordic Forest Development Holdings Pte Ltd", "SG", 1)]

# Tabel 1 (sawit) dan Tabel 2 (PBPH): nama, provinsi, kab/kota, titik panas 1 Jan-31 Agu 2026
TABEL1 = [("PT Mekar Karya Kahuripan", "Kalimantan Barat", "Ketapang", 312), ("PT Sinar Karya Mandiri", "Kalimantan Barat", "Ketapang", 254),
          ("PT Kayung Agro Lestari", "Kalimantan Barat", "Kayong Utara", 229), ("PT Arjuna Utama Sawit", "Kalimantan Tengah", "Katingan", 165),
          ("PT Ragam R.R.", "Kalimantan Barat", "Kubu Raya", 131), ("PT Sungai Putri Agro Sawit", "Kalimantan Barat", "Ketapang", 126),
          ("PT Kalbar Inti Plantation", "Kalimantan Barat", "Melawi", 116), ("PT Benua R.R.", "Kalimantan Barat", "Kubu Raya", 93),
          ("PT Bumi Subur Lestari", "Kalimantan Barat", "Kubu Raya", 77), ("PT Panca Surya Agrindo Sejahtera", "Riau", "Pelalawan", 73),
          ("PT Sumber Mardhika Graha", "Kalimantan Tengah", "Lamandau", 69), ("PT Agro Majusejahtera", "Kalimantan Barat", "Ketapang", 61),
          ("PT Gelora Sawita Makmur", "Aceh", "Nagan Raya", 50), ("PT Jalin Vaneo", "Kalimantan Barat", "Kayong Utara", 46),
          ("PT Globalindo Alam Perkasa", "Kalimantan Tengah", "Kotawaringin Timur", 46)]
TABEL2 = [("PT Bumi Mekar Hijau", "Sumatera Selatan", "Ogan Komering Ilir", 552), ("PT Finnantara Intiga", "Kalimantan Barat", "Sanggau", 189),
          ("PT Inhutani III Nanga Pinoh", "Kalimantan Barat", "Melawi", 188), ("PT Mayawana Persada", "Kalimantan Barat", "Kayong Utara", 176),
          ("PT Hutan Ketapang Industri", "Kalimantan Barat", "Ketapang", 142), ("PT Grace Putri Perdana", "Kalimantan Barat", "Ketapang", 138),
          ("PT Hermes Sugar Indonesia", "Kalimantan Tengah", "Kotawaringin Timur", 90), ("PT Kiani Lestari", "Kalimantan Timur", "Kutai Timur", 88),
          ("PT Prima Bumi Sentosa", "Kalimantan Barat", "Ketapang", 87), ("PT Inhutani I Unit Labanan", "Kalimantan Timur", "Berau", 83),
          ("PT Bumi Hijau Prima", "Kalimantan Tengah", "Kapuas", 74), ("PT Arfak Indra", "Papua Barat", "Fakfak", 71),
          ("PT Merbau Pelalawan Lestari", "Riau", "Pelalawan", 68), ("PT Wahana Samudera Sentosa", "Papua Selatan", "Merauke", 64),
          ("PT Wanakerta Ekalestari", "Kalimantan Barat", "Ketapang", 46)]
# Tabel 3: perusahaan paling tinggi karhutla yang terafiliasi modal asing -> [(pemegang saham/induk, negara)]
TABEL3 = {"PT Kayung Agro Lestari": [("First Resources", "SG")],
          "PT Panca Surya Agrindo Sejahtera": [("First Resources", "SG")],
          "PT Arjuna Utama Sawit": [("Premier Palmoil Energy Pte Ltd", "SG"), ("PT Oilim Agriculture (First Borneo Group)", "ID")],
          "PT Sumber Mardhika Graha": [("Salween Investment Pte Ltd", "SG"), ("Gochean Holdings Incorporated", "KY"), ("PT Triputra Agro Persada Tbk", "ID")],
          "PT Finnantara Intiga": [("Nordic Forest Development Pte Ltd", "SG")],
          "PT Hutan Ketapang Industri": [("Sampoerna Agri Resources Pte Ltd", "SG"), ("AGPA Pte Ltd", "SG"), ("POSCO International Corporation", "KR")],
          "PT Mayawana Persada": [("Green Ascend Group Limited", "VG"), ("Balaji Investment Group Holdings Limited", "WS")],
          "PT Hermes Sugar Indonesia": [("Hermes Distillery Pvt Ltd", "IN")],
          "PT Globalindo Alam Perkasa": [("Musim Mas", "SG")]}
CATATAN = {
    "PT Kayung Agro Lestari": "Grup First Resources setelah PT Austindo Nusantara Jaya Tbk diambil alih PT Ciliandra Perkasa (2025); induknya tercatat di Bursa Efek Singapura.",
    "PT Panca Surya Agrindo Sejahtera": "Grup First Resources setelah PT Austindo Nusantara Jaya Tbk diambil alih PT Ciliandra Perkasa (2025).",
    "PT Arjuna Utama Sawit": "63,3% saham dipegang Premier Palmoil Energy Pte Ltd (Singapura, First Borneo Group); 36,67% oleh PT Oilim Agriculture.",
    "PT Sumber Mardhika Graha": "Di bawah PT Triputra Agro Persada Tbk; pemegang saham minoritas asing Salween Investment Pte Ltd (kendaraan investasi GIC Singapura) dan Gochean Holdings Incorporated (sebagian dimiliki TPG Capital, Kep. Cayman).",
    "PT Finnantara Intiga": "Mayoritas saham dipegang Nordic Forest Development Pte Ltd (Singapura, terafiliasi Stora Enso, Finlandia); sisanya PT Purinusa Ekapersada (induk Sinar Mas/APP).",
    "PT Hutan Ketapang Industri": "Dahulu PT Kertas Basuki Rachmat. 80% saham beralih ke Sampoerna Agri Resources Pte Ltd (Singapura) pada Nov 2025, setelah Sampoerna Agro Tbk dilepas ke AGPA Pte Ltd, anak usaha POSCO International (Korea Selatan).",
    "PT Mayawana Persada": "Sejak 2022-2023 seluruh saham beralih ke Green Ascend Group Limited (BVI) dan Balaji Investment Group Holdings Limited (Samoa); pemilik manfaat akhir tidak teridentifikasi. Mei 2026 diumumkan resmi menjadi pemasok APRIL.",
    "PT Hermes Sugar Indonesia": "95% saham disebut dipegang Hermes Distillery Pvt Ltd (India); hanya dari satu rujukan publik, perlu verifikasi.",
    "PT Globalindo Alam Perkasa": "Kepemilikan keluarga Karim, di bawah bendera Musim Mas Holdings Pte Ltd (Singapura).",
    "PT Bumi Mekar Hijau": "Grup Sinar Mas/APP; titik panas terbanyak di antara PBPH.",
    "PT Wahana Samudera Sentosa": "Pola kepengurusan serupa grup Wilmar International.",
    "PT Kiani Lestari": "Mayoritas saham dipegang PT Bali Pasific Investama (Nusantara Group).",
    "PT Golden Blossom Sumatra": "Terafiliasi Bomba Group; ditemukan kebakaran lewat pemantauan lapangan WALHI.",
    "PT Monrad Intan Barakat": "Anak usaha PT Bakrie Sumatera Plantations Tbk (UNSP); tersangka korporasi kasus karhutla 2019 di Kab. Banjar (146 titik panas).",
    "PT Riau Andalan Pulp and Paper": "Kebakaran hutan alam +- 71,9 ha di Estate Sungai Mandau (pemantauan WALHI Riau, Sentinel-2).",
    "PT Arara Abadi": "Kebakaran sekitar penghujung Maret 2026; hamparan terbakar di dalam dan sekitar izin +- 616,3 ha (WALHI Riau).",
    "PT Sekato Pratama Makmur": "Kebakaran pertengahan-akhir Maret 2026, +- 115,3 ha di hutan alam sekunder (WALHI Riau).",
}
# Bab 2: tokoh politik di jajaran pemilik/pengurus (peran sebagaimana ditulis WALHI)
TOKOH = [{"nama": "Iwan Bomba (Setiawan Ichlas)", "peran": "Utusan Khusus Presiden Bidang Ekonomi dan Perbankan; eks TKN Prabowo-Gibran",
          "kaitan": "Pemilik Bomba Group", "perusahaan": "PT Golden Blossom Sumatra"},
         {"nama": "Aburizal Bakrie", "peran": "Dewan Pembina TKN Prabowo-Gibran", "kaitan": "Grup Bakrie (induk melalui PT Bakrie Sumatera Plantations Tbk)",
          "perusahaan": "PT Monrad Intan Barakat"},
         {"nama": "Edhy Prabowo", "peran": "Elite Partai Gerindra; mantan Menteri Kelautan dan Perikanan",
          "kaitan": "Direktur Utama PT Kiani Lestari; pemegang saham PT Nusantara Agro Forestry", "perusahaan": "PT Kiani Lestari"},
         {"nama": "Widjono Hardjanto", "peran": "Wakil Ketua Harian Partai Gerindra; Dewan Penasihat TKN Prabowo-Gibran",
          "kaitan": "Komisaris Utama PT Bali Pasific Investama; Komisaris PT Nusantara Agro Forestry", "perusahaan": "PT Kiani Lestari"},
         {"nama": "Benny Pangbin", "peran": "Ketua Bidang Analisa dan Pengembangan Potensi Kader DPP Partai Gerindra",
          "kaitan": "Direksi PT Kiani Lestari", "perusahaan": "PT Kiani Lestari"}]
LAPANGAN = [("PT Golden Blossom Sumatra", "Sumatera Selatan", "sawit"), ("PT Monrad Intan Barakat", "Kalimantan Selatan", "sawit")]
# Lampiran 1-2: (titik panas Jan-Sep 2026, grup, nama, provinsi); negara dari judul lampiran
LAMPIRAN_MY = [(121, "Jcorp", "PT Sumber Mardhika Graha", "Kalimantan Tengah"), (13, "Genting Group", "PT Sepanjang Inti Surya Utama 1", "Kalimantan Barat"),
    (9, "Sime Darby", "PT Duta Sumber Nabati 1", "Kalimantan Barat"), (1, "Sime Darby", "PT Langgeng Muara Makmur 2", "Kalimantan Selatan"),
    (7, "Sime Darby", "PT Laguna Mandiri 5", "Kalimantan Timur"), (7, "Genting Group", "PT Sepanjang Inti Surya Utama", "Kalimantan Barat"),
    (6, "Lion Group", "PT Kebun Aria 1", "Kalimantan Barat"), (2, "Genting Group", "PT Sawit Sehat", "Kalimantan Barat"),
    (11, "Genting Group", "PT Sepanjang Inti Surya Abadi 1", "Kalimantan Barat"), (1, "Genting Group", "PT Sawit Murni", "Kalimantan Barat"),
    (2, "Sime Darby", "PT Budidaya Agro Lestari 1", "Kalimantan Barat"), (2, "Sime Darby", "PT Bangun Maya Indah 1", "Kalimantan Barat"),
    (3, "Genting Group", "PT Sepanjang Inti Surya Mulia", "Kalimantan Barat"), (10, "Genting Group", "PT Sepanjang Inti Surya Utama 2", "Kalimantan Barat"),
    (5, "Genting Group", "PT Sepanjang Inti Surya Abadi 2", "Kalimantan Barat"), (1, "Sime Darby", "PT Mitra Austral Sejahtera 1", "Kalimantan Barat"),
    (1, "Sime Darby", "PT Mitra Austral Sejahtera 2", "Kalimantan Barat"), (8, "Sime Darby", "PT Sime Indoagro", "Kalimantan Barat"),
    (1, "Synergy Drive", "PT Duta Sumber Nabati 2", "Kalimantan Barat"), (9, "Sime Darby", "PT Mitra Austral Sejahtera 3", "Kalimantan Barat"),
    (3, "BHD Group", "PT Sawit Desa Kapuas 6", "Kalimantan Barat"), (3, "BHD Group", "PT Duta Surya Pratama 2", "Kalimantan Barat"),
    (7, "BHD Group", "PT Duta Surya Pratama 3", "Kalimantan Barat"), (3, "BHD Group", "PT Bintang Harapan Desa", "Kalimantan Barat"),
    (2, "BHD Group", "PT Duta Surya Pratama 4", "Kalimantan Barat"), (16, "Lion Group", "PT Kebun Aria 3", "Kalimantan Barat"),
    (5, "BHD Group", "PT Surya Borneo Indah 3", "Kalimantan Barat")]
LAMPIRAN_SG = [(320, "First Resources", "PT Kayung Agro Lestari", "Kalimantan Barat"), (73, "First Resources", "PT Panca Surya Agrindo Sejahtera", "Riau"),
    (207, "Premier Palmoil Energy Pte Ltd", "PT Arjuna Utama Sawit", "Kalimantan Tengah"), (69, "Salween Investment Pte Ltd", "PT Sumber Mardhika Graha", "Kalimantan Tengah"),
    (196, "Nordic Forest Development Holdings Pte Ltd", "PT Finnantara Intiga", "Kalimantan Barat"), (46, "Musim Mas", "PT Globalindo Alam Perkasa 1", "Kalimantan Tengah"),
    (1, "Musim Mas", "PT Unggul Lestari", "Kalimantan Tengah"), (19, "Musim Mas", "PT Globalindo Alam Perkasa 2", "Kalimantan Tengah"),
    (22, "Musim Mas", "PT Sukajadi Sawit Mekar 2", "Kalimantan Tengah"), (7, "Musim Mas", "PT Maju Aneka Sawit 3", "Kalimantan Tengah"),
    (3, "Musim Mas", "PT Maju Aneka Sawit 5", "Kalimantan Tengah"), (2, "Wilmar", "PT Mentaya Sawit Mas", "Kalimantan Tengah"),
    (35, "Wilmar", "PT Benua Alam Subur", "Kalimantan Tengah"), (23, "Wilmar", "PT Petak Malai Sawit Makmur 2", "Kalimantan Tengah"),
    (41, "Wilmar", "PT Pukun Mandiri Lestari", "Kalimantan Tengah"), (10, "RGE/APRIL", "PT Archipelago Timur Abadi", "Kalimantan Tengah"),
    (18, "Wilmar", "PT Daya Landak Plantation 1", "Kalimantan Barat"), (23, "Wilmar", "PT Petak Malai Sawit Makmur 1", "Kalimantan Tengah"),
    (20, "Wilmar", "PT Bawak Sawit Tunas Belum", "Kalimantan Tengah"), (8, "Wilmar", "PT Alam Sawit Permai", "Kalimantan Tengah"),
    (4, "Wilmar", "PT Eka Kaharap Itah", "Kalimantan Tengah"), (7, "Wilmar", "PT Kerisawit Indonesia", "Kalimantan Tengah"),
    (1, "Wilmar", "PT Buluh Cawang Plantation 1", "Kalimantan Barat"), (1, "Wilmar", "PT Wilmar Sambas Plantation 1", "Kalimantan Barat"),
    (18, "Wilmar", "PT Indoresins Putra Mandiri", "Kalimantan Barat"), (6, "Wilmar", "PT Bumi Sawit Kencana 2", "Kalimantan Tengah"),
    (43, "Wilmar", "PT Bumi Pratama Khatulistiwa 1", "Kalimantan Barat"), (1, "Wilmar", "PT Agronusa Investama 3", "Kalimantan Barat"),
    (5, "Wilmar", "PT Pratama Prosentindo", "Kalimantan Barat"), (1, "Wilmar", "PT Putra Indotropical", "Kalimantan Barat"),
    (2, "Wilmar", "PT Sarana Titian Permata", "Kalimantan Tengah"), (2, "Wilmar", "PT Mustika Sembuluh 3", "Kalimantan Tengah"),
    (1, "Wilmar", "PT Jatim Jaya Perkasa", "Riau"), (6, "Goodhope Asia Holdings", "PT Sariwana Adi Perkasa", "Papua Tengah"),
    (65, "Sinar Mas", "PT Agro Majusejahtera", "Kalimantan Barat"), (23, "Sinar Mas", "PT Kartika Prima Citra", "Kalimantan Barat"),
    (15, "Sinar Mas", "PT Primanusa Mitraserasi", "Kalimantan Barat"), (10, "Sinar Mas", "PT Bangun Nusa Mandiri", "Kalimantan Barat"),
    (3, "Sinar Mas", "PT Nusantara Mukti Sentosa", "Kalimantan Barat"), (6, "Sinar Mas", "PT Dutanusa Lestari", "Kalimantan Barat"),
    (25, "Sinar Mas", "PT Smart Corporation 3", "Kalimantan Barat"), (44, "Sinar Mas", "PT Cahaya Nusa Gemilang", "Kalimantan Barat"),
    (3, "Sinar Mas", "PT Kencana Graha Permai", "Kalimantan Barat"), (9, "Sinar Mas", "PT Anugerah Makmur Sejati", "Kalimantan Barat"),
    (3, "Sinar Mas", "PT Agro Lestari Mandiri", "Kalimantan Barat"), (7, "Sinar Mas", "PT Buana Tunas Sejahtera", "Kalimantan Barat"),
    (8, "Sinar Mas", "PT Sentrakarya Manunggal", "Kalimantan Barat"), (1, "Sinar Mas", "PT Persada Graha Mandiri", "Kalimantan Barat"),
    (5, "Sinar Mas", "PT Kapuasindo Palm Lestari", "Kalimantan Barat"), (3, "Sinar Mas", "PT Paramitra Internusa Pratama", "Kalimantan Barat"),
    (4, "Salim Group", "PT Kebun Ganda Prima 2", "Kalimantan Barat"), (1, "Salim Group", "PT Riau Agrotama Plantation 2", "Kalimantan Barat"),
    (39, "RGE/APRIL", "PT Restorasi Ekosistem Indonesia", "Jambi; Sumatera Selatan"), (22, "RGE/APRIL", "PT Tunas Timber Lestari", "Papua Selatan"),
    (2, "RGE/APRIL", "PT Adindo Hutani Lestari", "Kalimantan Utara"), (1, "RGE/APRIL", "PT Riau Andalan Pulp and Paper", "Riau"),
    (13, "APP/Sinar Mas", "PT Buana Megatama Jaya", "Kalimantan Barat"), (10, "APP/Sinar Mas", "PT Bumi Persada Permai", "Sumatera Selatan"),
    (4, "APP/Sinar Mas", "PT Satria Perkasa Agung", "Riau"), (3, "APP/Sinar Mas", "PT Rimba Hutani Mas", "Sumatera Selatan"),
    (2, "APP/Sinar Mas", "PT Wira Karya Sakti", "Jambi"), (1, "APP/Sinar Mas", "PT Bukit Batu Hutani Alam", "Riau"),
    (601, "APP/Sinar Mas", "PT Bumi Mekar Hijau", "Sumatera Selatan"), (196, "APP/Sinar Mas", "PT Finnantara Intiga", "Kalimantan Barat"),
    (21, "APP/Sinar Mas", "PT Sekato Pratama Makmur", "Riau"), (14, "APP/Sinar Mas", "PT Arara Abadi", "Riau")]
# Tabel 5: PSN Pangan dan Energi Merauke (titik panas 1 Jan-31 Agu 2026, total 807)
PSN = {"energi": [("PT Global Papua Abadi", "First Resources", 57), ("PT Murni Nusantara Mandiri", "Wilmar", 40),
                  ("PT Andalan Manis Nusantara", "First Resources", 23), ("PT Semesta Gula Nusantara", "First Resources", 10),
                  ("PT Sejahtera Gula Nusantara", "Wilmar", 2), ("PT Agrindo Gula Nusantara", "Wilmar", 1)],
       "pangan": [("Klaster 4", "Kemenko Pangan", 236), ("Klaster 1", "Kemenko Pangan", 179), ("Klaster 2", "Kemenko Pangan", 172),
                  ("Klaster 5", "Food Estate/Kementan", 87)],
       "total": 807, "catatan": "Sebagian klaster di Kecamatan Ilwayab berada di wilayah kerja Jhonlin Group (Andi Syamsuddin Arsyad/Haji Isam); tautan langsung ke titik panas masih perlu verifikasi lapangan."}
# PBPH di Lampiran 2 (HTI/restorasi); sisanya sawit
PBPH_LAMPIRAN = {"PT Restorasi Ekosistem Indonesia", "PT Tunas Timber Lestari", "PT Adindo Hutani Lestari", "PT Riau Andalan Pulp and Paper",
                 "PT Buana Megatama Jaya", "PT Bumi Persada Permai", "PT Satria Perkasa Agung", "PT Rimba Hutani Mas", "PT Wira Karya Sakti",
                 "PT Bukit Batu Hutani Alam", "PT Bumi Mekar Hijau", "PT Finnantara Intiga", "PT Sekato Pratama Makmur", "PT Arara Abadi"}
# Nama yang di peta ditulis lain, atau yang kunci namanya terlalu umum (semua unit Inhutani berkunci "INHUTANI"):
# poligonnya dipilih dengan pola atas nama lengkap di peta, bukan kunci nama.
POLA = {"PT Inhutani III Nanga Pinoh": r"^PT Inhutani Iii \(nangapinoh\)$", "PT Inhutani I Unit Labanan": r"^PT Inhutani I \(unit Labanan\)$",
        "PT Tunas Timber Lestari": r"^PT Tunas Sawaerma$", "PT Hutan Ketapang Industri": r"^PT (Hutan Ketapang Industri|Kertas Basuki Rachmat)",
        "PT Riau Andalan Pulp and Paper": r"^PT Riau Andalan Pulp & Paper$"}
# Provinsi WALHI -> kode BPS di peta: poligon senama di provinsi lain (mis. PT Gelora Sawita Makmur di Siak) dibuang bila ada yang sama provinsinya
KODE = {"Aceh": "11", "Riau": "14", "Jambi": "15", "Sumatera Selatan": "16", "Kalimantan Barat": "61", "Kalimantan Tengah": "62",
        "Kalimantan Selatan": "63", "Kalimantan Timur": "64", "Kalimantan Utara": "65", "Papua Barat": "92", "Papua Selatan": "93", "Papua Tengah": "94"}


def kunci(nama):  # salinan scripts/scrape/konsesi.py kunci()
    n = re.sub(r"\(.*?\)|\bD\.?\s?H\.?\b.*", " ", (nama or "").upper())
    n = re.sub(r"[^A-Z0-9& ]", " ", n)
    n = re.sub(r"\b(PT|TBK|CV|PERSERO|KOPERASI|KOP|COY|CO|LTD|INC)\b", " ", n)
    n = re.sub(r"\bTBR\b", "TIMBER", n).replace("DJ", "J").replace("TJ", "C").replace("OE", "U")
    n = re.sub(r"(\s+(UNIT|BLOK)\b.*|\s+(\d+|I{1,3}|IV|V|VI{1,3}))+$", "", " ".join(n.split()))
    return n.replace(" ", "")


def gabung():
    """Semua tabel -> satu daftar perusahaan berkunci nama baku (blok '1/2/3' lampiran dijumlah ke nama induknya)."""
    P = {}

    def ambil(nama, **kw):
        k = kunci(nama)
        p = P.setdefault(k, {"nama": re.sub(r"\s+\d+$", "", nama), "jenis": "", "prov": "", "kab": "", "grup": [], "negara": [],
                             "pemegang": [], "titik_agu": None, "titik_sep": None, "tabel": [], "tokoh": [], "catatan": ""})
        for a, b in kw.items():
            if b and not p.get(a):
                p[a] = b
        return p
    for tab, daf, jenis in (("Tabel 1", TABEL1, "sawit"), ("Tabel 2", TABEL2, "pbph")):
        for i, (nm, prov, kab, n) in enumerate(daf, 1):
            p = ambil(nm, jenis=jenis, prov=prov, kab=kab)
            p["titik_agu"] = n
            p["tabel"].append(f"{tab} #{i}")
    for neg, daf in (("MY", LAMPIRAN_MY), ("SG", LAMPIRAN_SG)):
        for n, grup, nm, prov in daf:
            grup = {"APP/Sinar Mas": "Sinar Mas"}.get(grup, grup)  # satu nama grup di tabel (Lampiran memakai keduanya)
            p = ambil(nm, jenis="pbph" if nm in PBPH_LAMPIRAN else "sawit", prov=prov)
            p["titik_sep"] = (p["titik_sep"] or 0) + n
            if grup not in p["grup"]:
                p["grup"].append(grup)
            if neg not in p["negara"]:
                p["negara"].append(neg)
            t = "Lampiran 1" if neg == "MY" else "Lampiran 2"
            if t not in p["tabel"]:
                p["tabel"].append(t)
    for nm, daf in TABEL3.items():
        p = ambil(nm)
        p["pemegang"] = [{"nama": a, "negara": b} for a, b in daf]
        for _, b in daf:
            if b != "ID" and b not in p["negara"]:
                p["negara"].append(b)
        p["tabel"].append("Tabel 3")
    for nm, prov, jenis in LAPANGAN:
        ambil(nm, prov=prov, jenis=jenis)["tabel"].append("Pemantauan lapangan")
    for t in TOKOH:
        ambil(t["perusahaan"])["tokoh"].append({k: t[k] for k in ("nama", "peran", "kaitan")})
    for nm, c in CATATAN.items():
        ambil(nm)["catatan"] = c
    for nm, g in (("PT Bumi Mekar Hijau", "Sinar Mas"), ("PT Wahana Samudera Sentosa", "Wilmar"), ("PT Kiani Lestari", "Nusantara Group"),
                  ("PT Golden Blossom Sumatra", "Bomba Group"), ("PT Monrad Intan Barakat", "Bakrie Group"), ("PT Mayawana Persada", "RGE/APRIL"),
                  ("PT Hutan Ketapang Industri", "Sampoerna Agro/POSCO"), ("PT Arjuna Utama Sawit", "First Borneo Group"),
                  ("PT Sumber Mardhika Graha", "Triputra Group"), ("PT Hermes Sugar Indonesia", "Hermes Distillery")):
        p = ambil(nm)
        if g not in p["grup"]:
            p["grup"].append(g)
        if GRUP_NEGARA.get(g) and GRUP_NEGARA[g] not in p["negara"]:
            p["negara"].append(GRUP_NEGARA[g])
    for p in P.values():  # negara kosong tapi grupnya di Tabel 4
        for g in p["grup"]:
            if GRUP_NEGARA.get(g) and GRUP_NEGARA[g] not in p["negara"]:
                p["negara"].append(GRUP_NEGARA[g])
    return P


class Indeks:
    """Kotak pembatas poligon per sel 0,1 derajat (cukup untuk ~3.500 poligon)."""
    def __init__(self, fitur):
        self.f, self.sel = fitur, {}
        for i, f in enumerate(fitur):
            xs, ys = zip(*(c for r in cincin(f["geometry"]) for c in r[0]))
            f["_bb"] = (min(xs), min(ys), max(xs), max(ys))
            for a in range(int(math.floor(min(xs) * 10)), int(math.floor(max(xs) * 10)) + 1):
                for b in range(int(math.floor(min(ys) * 10)), int(math.floor(max(ys) * 10)) + 1):
                    self.sel.setdefault((a, b), []).append(i)

    def cari(self, lon, lat):
        for i in self.sel.get((int(math.floor(lon * 10)), int(math.floor(lat * 10))), ()):
            x0, y0, x1, y1 = self.f[i]["_bb"]
            if x0 <= lon <= x1 and y0 <= lat <= y1 and any(di_dalam(lon, lat, r) for r in cincin(self.f[i]["geometry"])):
                yield i


def cincin(g):
    return g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]


def di_dalam(x, y, poli):
    """poli = [luar, lubang...]: ray casting."""
    def isi(r):
        c, j = False, len(r) - 1
        for i in range(len(r)):
            xi, yi = r[i]
            xj, yj = r[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
        return c
    return isi(poli[0]) and not any(isi(h) for h in poli[1:])


def cek_silang(P, fitur):
    """Cocokkan nama ke poligon peta, hitung titik VIIRS Jan-Agu 2026 di poligonnya. Mengisi p['cek'] dan p['_poli']."""
    per_kunci = {}
    for i, f in enumerate(fitur):
        per_kunci.setdefault(kunci(f["properties"].get("nama")), []).append(i)
    for k, p in P.items():
        pola = POLA.get(p["nama"])
        idx = [i for i, f in enumerate(fitur) if re.search(pola, f["properties"].get("nama") or "")] if pola else per_kunci.get(k, [])
        kode = {KODE[x.strip()] for x in p["prov"].split(";") if x.strip() in KODE}
        sama = {i for i in idx if fitur[i]["properties"].get("prov") in kode}
        idx = sorted(sama or idx)  # satu-satunya poligon senama di provinsi tetangga (PT Grace Putri Perdana, Lamandau) tetap dipakai
        p["_poli"] = idx
        p["cek"] = {"poligon": len(idx), "jenis_peta": sorted({fitur[i]["properties"]["jenis"] for i in idx}),
                    "grup_peta": sorted({fitur[i]["properties"].get("grup") for i in idx} - {"", None}),
                    "luas_peta_ha": sum(fitur[i]["properties"].get("luas_peta_ha") or 0 for i in idx)}
    if not os.path.exists(VIIRS):
        return False
    v = pickle.load(open(VIIRS, "rb"))
    # hari kalender WIB (konvensi SiPongi): 1 Jan 00.00 WIB = 31 Des 17.00 UTC, supaya jumlah harian == titik_viirs persis
    m0, m1 = (int((dt.datetime.fromisoformat(t).replace(tzinfo=dt.timezone.utc) - T0).total_seconds() // 60) - 420 for t in PERIODE)
    pakai = sorted({i for p in P.values() for i in p["_poli"]})
    ix = Indeks([fitur[i] for i in pakai])
    hit = {i: 0 for i in pakai}
    milik = {}
    for k, p in P.items():
        for i in p["_poli"]:
            milik.setdefault(i, set()).add(k)
    per = {k: 0 for k in P}
    di_prov = {k: 0 for k in P}  # titik yang juga jatuh di provinsi yang disebut WALHI (cek lokasi)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from wilayah import Wilayah  # noqa: E402
    wil = Wilayah()
    kode = {k: {KODE[x.strip()] for x in p["prov"].split(";") if x.strip() in KODE} for k, p in P.items()}
    t, la, lo = v["t"], v["lat"], v["lon"]
    import bisect
    a, b = bisect.bisect_left(t, m0), bisect.bisect_left(t, m1)  # a: 1 Jan 00.00 WIB (= 31 Des 17.00 UTC)
    sam = {k: [] for k in P}  # indeks titik per perusahaan, 1 Jan WIB s.d. titik terakhir arsip
    for j in range(a, len(t)):
        ks = set()
        for q in ix.cari(lo[j], la[j]):
            ks |= milik[pakai[q]]
            hit[pakai[q]] += 1
        pv = (wil.cari(lo[j], la[j]) or ("",))[0] if ks and m0 <= t[j] < m1 else ""
        for k in ks:  # satu titik dihitung sekali per perusahaan walau bloknya tumpang tindih
            sam[k].append(j)
            if m0 <= t[j] < m1:
                per[k] += 1
                di_prov[k] += pv in kode[k]
    for k, p in P.items():
        if p["_poli"]:
            p["cek"]["titik_viirs"] = per[k]
            # lokasi cocok bila separuh lebih titik di poligon jatuh di provinsi WALHI (PT Grace Putri Perdana: poligon peta di Kalteng, WALHI Kalbar)
            p["cek"]["lokasi"] = "cocok" if not kode[k] or not per[k] or di_prov[k] >= per[k] / 2 else "beda"
            if p["cek"]["lokasi"] == "beda":  # layar menampilkan provinsi poligon peta (pemilik, 17 Okt 2026)
                nama_kode = {v: n for n, v in KODE.items()}
                pv = [fitur[i]["properties"].get("prov") for i in p["_poli"]]
                p["cek"]["prov_peta"] = nama_kode.get(max(set(pv), key=pv.count), "")
            wib = lambda j: T0 + dt.timedelta(minutes=int(t[j]) + 420)
            hr = {}
            for j in sam[k]:
                d = wib(j).date().isoformat()
                hr[d] = hr.get(d, 0) + 1
            p["harian"] = sorted(hr.items())
            p["titik"] = [[round(la[j], 4), round(lo[j], 4), wib(j).strftime("%Y-%m-%d %H:%M"), round(float(v["frp"][j]), 1), "SNPP"]
                          for j in sorted(sam[k], key=lambda j: -t[j])[:TITIK_MAKS]]
    return True


class Kompleks:
    """Titik -> kompleks K#### (kluster.json, jendela 7 hari): di dalam poligonnya, atau pusat terdekat <= 0,03 derajat (~3 km)."""
    def __init__(self, jalur):
        self.f, self.g = [], {}
        if not os.path.exists(jalur):
            return
        for f in json.load(open(jalur))["features"]:
            p = f["properties"]
            poli = cincin(f["geometry"]) if f["geometry"]["type"] != "Point" else []
            bb = None
            if poli:
                xs, ys = zip(*(c for r in poli for c in r[0]))
                bb = (min(xs), min(ys), max(xs), max(ys))
            self.g.setdefault((int(p["lon"] * 20), int(p["lat"] * 20)), []).append(len(self.f))  # sel 0,05 derajat
            self.f.append((p["id"], p["lon"], p["lat"], poli, bb))

    def cari(self, lon, lat):
        cx, cy, ada = int(lon * 20), int(lat * 20), []
        for a in (cx - 1, cx, cx + 1):
            for b in (cy - 1, cy, cy + 1):
                ada += self.g.get((a, b), [])
        for i in ada:
            kid, _, _, poli, bb = self.f[i]
            if bb and bb[0] <= lon <= bb[2] and bb[1] <= lat <= bb[3] and any(di_dalam(lon, lat, r) for r in poli):
                return kid
        d, kid = 0.03 ** 2, None
        for i in ada:
            dd = (self.f[i][1] - lon) ** 2 + (self.f[i][2] - lat) ** 2
            if dd <= d:
                d, kid = dd, self.f[i][0]
        return kid


def cek_terkini(P, fitur, jalur=os.path.join(AKAR, "public/data/hotspot.json")):
    """Titik panas terkini di poligon tiap perusahaan. jalur: hotspot.json (7 hari) atau salinan /api/titik (putaran terakhir D1)."""
    if not os.path.exists(jalur):
        return None
    h = json.load(open(jalur))
    il, io = h["kolom"].index("lat"), h["kolom"].index("lon")
    pakai = sorted({i for p in P.values() for i in p["_poli"]})
    ix = Indeks([fitur[i] for i in pakai])
    milik = {}
    for k, p in P.items():
        for i in p["_poli"]:
            milik.setdefault(i, set()).add(k)
    per = {k: 0 for k in P}
    kp = Kompleks(os.path.join(AKAR, "public/data/kluster.json"))
    t0 = dt.datetime.fromisoformat(h["acuan"])
    kom = {k: {} for k in P}
    for r in h["baris"]:
        ks = set()
        for q in ix.cari(r[io], r[il]):
            ks |= milik[pakai[q]]
        kid = kp.cari(r[io], r[il]) if ks else None
        w = (t0 + dt.timedelta(hours=r[h["kolom"].index("jam")] + 7)).strftime("%Y-%m-%d")
        for k in ks:
            per[k] += 1
            if kid:
                e = kom[k].setdefault(kid, {"id": kid, "n": 0, "dari": w, "sampai": w})
                e["n"] += 1
                e["dari"], e["sampai"] = min(e["dari"], w), max(e["sampai"], w)
    for k, p in P.items():
        if p["_poli"]:
            p["cek"]["titik_terkini"] = per[k]
            p["kompleks"] = sorted(kom[k].values(), key=lambda e: -e["n"])
    tgl = sorted({r[h["kolom"].index("tgl_wib")] for r in h["baris"]})
    return {"acuan": h["acuan"], "dari": tgl[0] if tgl else "", "sampai": tgl[-1] if tgl else ""}


INDUSTRI = {"PT Hermes Sugar Indonesia": "Tebu dan gula", "PT Restorasi Ekosistem Indonesia": "Restorasi ekosistem",
            "PT Golden Blossom Sumatra": "Kelapa sawit", "PT Monrad Intan Barakat": "Kelapa sawit"}


def industri(q):
    """Sektor yang dibaca orang: sawit; PBPH dipecah menurut jenis poligon peta (HTI = kayu pulp, HPH = hutan alam)."""
    if q["nama"] in INDUSTRI:
        return INDUSTRI[q["nama"]]
    if q["jenis"] == "sawit":
        return "Kelapa sawit"
    j = q["cek"].get("jenis_peta") or []
    return "Hutan tanaman (pulp)" if "hti" in j else "Hutan alam (HPH)" if "hph" in j else "Kehutanan (PBPH)"


def tulis(P, fitur, viirs_baru, acuan=None):
    lama = {}
    if os.path.exists(KELUAR):
        lama = {p["nama"]: p for p in json.load(open(KELUAR)).get("perusahaan", [])}
    daf = []
    for p in P.values():
        q = {k: v for k, v in p.items() if not k.startswith("_")}
        if not viirs_baru:
            for c in ("titik_viirs", "lokasi"):
                if c in lama.get(q["nama"], {}).get("cek", {}):
                    q["cek"][c] = lama[q["nama"]]["cek"][c]
            for c in ("harian", "titik"):  # tanpa arsip VIIRS: pertahankan yang lama
                if c in lama.get(q["nama"], {}):
                    q[c] = lama[q["nama"]][c]
        if not q["cek"]["poligon"]:  # lokasi beda tetap diisi: layar memakai provinsi poligon peta (prov_peta, pemilik 17 Okt 2026)
            q["kosong"] = "tanpa_poligon"
        if q.get("kosong"):  # tidak ada poligon peta: tidak ada titik, tidak ada kompleks
            q["harian"], q["titik"], q["kompleks"] = [], [], []
        else:
            q.setdefault("harian", [])
            q.setdefault("titik", [])
            q.setdefault("kompleks", [])
        q["peringkat"] = max(p["titik_agu"] or 0, p["titik_sep"] or 0)
        q["industri"] = industri(q)
        daf.append(q)
    daf.sort(key=lambda q: -q["peringkat"])
    # poligon peta -> perusahaan WALHI (dipakai lapisan konsesi untuk menandai & memberi bendera)
    poli = {}
    for p in P.values():
        for i in p["_poli"]:
            poli.setdefault(fitur[i]["properties"].get("id") or str(i), p["nama"])
    out = {"dibuat": dt.date.today().isoformat(), "sumber": SUMBER, "periode": {"tabel": "1 Jan - 31 Agu 2026", "lampiran": "Jan - Sep 2026",
           "cek": "1 Jan - 31 Agu 2026 (hari WIB), VIIRS S-NPP, FIRMS kosong 8 Mei - 1 Jun", "terkini": acuan},
           "ringkasan": {"titik_jan_sep": 30927, "titik_konsesi": 9951, "areal_sawit": 561, "pbph": 293, "modal_asing": 9, "grup_my_sg": 93,
                         "teridentifikasi": 22, "belum_teridentifikasi": 10},
           "negara": NEGARA, "grup_negara": {**GRUP_NEGARA, **GRUP_PETA}, "grup": [{"grup": g, "negara": n, "jumlah": j} for g, n, j in TABEL4],
           "psn": {"energi": [{"nama": a, "grup": b, "negara": GRUP_NEGARA.get(b, ""), "titik": c} for a, b, c in PSN["energi"]],
                   "pangan": [{"nama": a, "pengampu": b, "titik": c} for a, b, c in PSN["pangan"]], "total": PSN["total"], "catatan": PSN["catatan"]},
           "tokoh": TOKOH, "perusahaan": daf, "poligon": poli}
    with open(KELUAR, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    cocok = sum(1 for q in daf if q["cek"]["poligon"])
    print(f"aktor_karhutla.json: {len(daf)} perusahaan, {cocok} cocok ke poligon peta, {len(poli)} poligon ditandai", file=sys.stderr)


def uji():
    d = json.load(open(KELUAR))
    nama = [p["nama"] for p in d["perusahaan"]]
    assert len(nama) == len(set(nama)), "nama ganda"
    assert sum(t[2] for t in TABEL4) == 93 and sum(x[2] for x in PSN["energi"] + PSN["pangan"]) == PSN["total"] == 807
    assert len(LAMPIRAN_MY) == 27 and len(LAMPIRAN_SG) == 66 and len(TABEL1) == len(TABEL2) == 15
    for p in d["perusahaan"]:
        assert set(p["negara"]) <= set(NEGARA), p
        assert p["tabel"], p
    q = {p["nama"]: p for p in d["perusahaan"]}
    assert q["PT Mayawana Persada"]["negara"][:2] == ["VG", "WS"] and "KR" in q["PT Hutan Ketapang Industri"]["negara"]
    assert q["PT Bumi Mekar Hijau"]["titik_agu"] == 552 and q["PT Bumi Mekar Hijau"]["titik_sep"] == 601
    assert q["PT Sepanjang Inti Surya Utama"]["titik_sep"] == 13 + 7 + 10, "blok lampiran tidak dijumlah"
    assert len(q["PT Kiani Lestari"]["tokoh"]) == 3
    assert q["PT Mayawana Persada"]["industri"] == "Hutan tanaman (pulp)" and q["PT Kayung Agro Lestari"]["industri"] == "Kelapa sawit"
    assert q["PT Grace Putri Perdana"]["cek"].get("lokasi") == "beda" and q["PT Grace Putri Perdana"]["cek"].get("prov_peta") == "Kalimantan Tengah" and q["PT Mayawana Persada"]["cek"].get("lokasi") == "cocok", "cek lokasi"
    assert q["PT Grace Putri Perdana"]["harian"], "lokasi beda tetap punya titik harian"
    for p in d["perusahaan"]:  # harian/titik/kompleks selalu ada; kosong bila poligon tak dipercaya
        assert all(k in p for k in ("harian", "titik", "kompleks")), p["nama"]
        if p.get("kosong"):
            assert p["kosong"] == "tanpa_poligon" and not (p["harian"] or p["titik"] or p["kompleks"]), p["nama"]
        hr = [d_ for d_, _ in p["harian"]]
        assert hr == sorted(set(hr)) and all(n > 0 and d_ >= "2026-01-01" for d_, n in p["harian"]), p["nama"]
        assert len(p["titik"]) <= TITIK_MAKS and all(len(x) == 5 for x in p["titik"]), p["nama"]
        assert [x[2] for x in p["titik"]] == sorted((x[2] for x in p["titik"]), reverse=True), "titik bukan terbaru-dulu"
        assert sum(n for _, n in p["harian"]) >= len(p["titik"]), p["nama"]
        if "titik_viirs" in p["cek"] and p["harian"]:
            assert sum(n for d_, n in p["harian"] if d_ < "2026-09-01") == p["cek"]["titik_viirs"], p["nama"]
        assert all(e["n"] > 0 and e["dari"] <= e["sampai"] and e["id"].startswith("K") for e in p["kompleks"]), p["nama"]
    print("ok", len(nama), "perusahaan;", sum(1 for p in d["perusahaan"] if p["cek"]["poligon"]), "cocok peta")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        fitur = json.load(open(KONSESI))["features"]
        P = gabung()
        baru = cek_silang(P, fitur)
        a = sys.argv[1:]  # --titik <berkas>: salinan https://pantau.terasurban.com/api/titik (titik panas putaran terakhir)
        tulis(P, fitur, baru, cek_terkini(P, fitur, a[a.index("--titik") + 1]) if "--titik" in a else cek_terkini(P, fitur))
