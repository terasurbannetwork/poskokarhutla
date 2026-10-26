"""Teks lapangan, bahasa sehari-hari. Placeholder diisi cetak.py: {L} panjang selang, {gulung}, {kaki_km}, {kaki_mnt},
{air_d} jarak air ke petak (m), {air_nama} nama sumber air, {p_lance} sisa tekanan di lance (bar)."""

# (barang, jumlah, catatan)
KIT = [
    ("Pompa portabel 1.000–1.300 liter/menit", "1 unit", ""),
    ("Selang isap 3 m dengan saringan", "1", "Saringan jangan sampai menyentuh lumpur"),
    ("Selang 2,5 inci, 20 m per gulung", "{gulung} gulung", "Sudah termasuk 2 gulung cadangan"),
    ("Y-pembagi berkatup (2,5 ke 2 × 1,5 inci)", "1", "Satu cabang ke lance, satu ke nozzle"),
    ("Lance pipa baja 1,5 inci, panjang 1,5 m", "2 (boleh sampai 8)", "Ujung runcing berlubang, katup dan pengukur tekanan"),
    ("Nozzle semprot biasa", "1", "Untuk petak pembanding"),
    ("Termometer tusuk gambut, panjang ≥ 1 m", "2", "Ukur suhu sebelum, sesudah, dan besoknya"),
    ("Bor gambut", "1", "Ukur tebal gambut di tiap petak"),
    ("Meteran 50 m, patok, tali rafia", "1, 16 patok, 1 gulung", "Untuk memasang 4 petak 10 × 10 m"),
    ("HP dengan aplikasi /pipa, kamera, formulir kertas", "1 set", "Formulir kertas untuk cadangan bila sinyal hilang"),
    ("Bensin", "20 liter", "Pompa memakai 2–5 liter per jam"),
    ("Alat servis: oli, busi, kunci, klem, selang tambal, sealtape", "1 set", "Untuk perbaikan kecil di lokasi"),
    ("Masker N95, kacamata, sarung tangan, sepatu bot", "1 per orang", "Wajib dipakai selama di lokasi"),
    ("Kotak P3K dan air minum", "1 kotak, 3 liter per orang", ""),
]

UMUM = {
    "gagasan": "Kit pompa, selang, dan lance menyuntikkan air ke bara gambut sampai kedalaman 1,5 m. "
               "Petak uji ditaruh di <b>titik api 24 jam terdekat yang berada di tanah gambut</b>, lalu dicari sumber air terdekat untuk titik itu. "
               "Peta lokasi memakai citra satelit Sentinel-2 SWIR terbaru yang masih terbaca.",
    "cek_gambut": "<p>Kelima lokasi berada di dalam peta gambut resmi 1:250.000 (Kementan, lewat PRIMS BRGM). "
                  "Peta itu <b>tidak mencantumkan kedalaman</b>, jadi kedalaman di tabel diambil dari penelitian di kawasan sekitarnya.</p>"
                  "<p><b>Aturan ganti:</b> tiap petak dibor saat survei. Kalau gambutnya kurang dari 50 cm (bukan gambut) atau kurang dari 1 m (lance tembus ke tanah biasa), "
                  "petak dipindah ke titik api berikutnya dan alasannya dicatat. Lokasi 4 dan 5 paling perlu dibor dulu.</p>",
    "panjang": "Di lapangan, api sering berada 1–2 km masuk ke dalam lahan, sementara air yang bisa didekati mobil ada di tepi jalan. "
                "Bagian ini menguji keadaan itu: pompa di parit atau sungai dekat tempat parkir, lalu <b>satu jalur selang RENTANG</b> ke api gambut, "
                "dengan pompa tambahan di tengah bila hitungan menunjukkan tekanan tidak cukup. Lokasi dipilih dari kompleks gambut Kalteng yang punya "
                "air ≤ 400 m dari ujung jalan dan titik api 48 jam di gambut 1–1,8 km dari situ.",
    "putus": [
        "Urutan pilot 28 Okt–1 Nov: hari 1 latihan di lokasi 4 Bukit Batu; hari 2–3 uji utama di lokasi 1 Sabangau; hari 4 lokasi 2 Jabiren; lokasi 3 Dadahup cadangan.",
        "Lokasi 5 Pulau Hanaut hanya disurvei untuk calon gudang wilayah barat, tidak dipakai untuk uji.",
        "Uji selang panjang: usul lokasi 8 (sambung dari latihan Bukit Batu) dan lokasi 10 (terpanjang, ± 2,4 km, 14 menit dari Daops). Lokasi 6 dan 7 cadangan dekat kota; lokasi 9 hanya bila regu BPBD Seruyan siap.",
        "Tiap sore H-1 diputuskan jalan atau tidak, dilihat dari titik api 24 jam terakhir. Hujan diprakirakan turun hampir tiap hari.",
        "Siapa regu pelaksana dan pompa siapa yang dipinjam (Daops Palangka Raya, Daops Kapuas, atau BPBD).",
        "Alat tambahan: 2 lance, 2 termometer tusuk, 1 bor gambut. Lance ke-3 sampai ke-8 bila mau uji penuh.",
        "Kalau kit terbukti bisa dipakai, kit dipindah untuk banjir Nov–Des 2026.",
    ],
    "uji": [
        "<b>Petak:</b> 4 petak 10 × 10 m di bara yang sama, jarak antarpetak ≥ 10 m. 2 petak disuntik lance (L1, L2), 2 petak disemprot biasa (K1, K2). Posisi diundi.",
        "<b>Suhu tanah</b> diukur di 5 titik tiap petak, di kedalaman 10, 30, 50, dan 100 cm: sebelum, sesudah, dan besoknya (24 jam).",
        "<b>Dianggap padam</b> bila besoknya semua titik di bawah 40 °C dan tidak ada asap keluar dari tanah. Bandingkan petak lance dengan petak semprot biasa.",
        "<b>Air, waktu, dan bensin</b> yang dipakai tiap petak dicatat.",
        "<b>Api muncul lagi atau tidak:</b> dipantau 7 hari lewat titik panas satelit, plus didatangi lagi setelah 3 hari.",
        "<b>Kit dinyatakan bisa dipakai</b> bila: air sampai ke lance di ≥ 2 sesi, dari tiba sampai air mengalir ≤ 4 jam, tekanan lance ≥ 2 bar bertahan 30 menit, "
        "data suhu lengkap ≥ 90%, tidak ada kecelakaan, dan ≥ 95% alat kembali utuh (keputusan 53).",
        "Semua dicatat di aplikasi /pipa.",
    ],
    "selamat": [
        "<b>Lubang bara:</b> tusuk tanah dengan tongkat sebelum melangkah. Jangan berdiri di tanah yang berasap. Jalan beriringan di jalur yang sudah dicek.",
        "<b>Asap:</b> pakai masker, kerja di arah datang angin, ganti orang tiap 30 menit. Istirahat di udara bersih bila pusing atau mual.",
        "<b>Selang bertekanan:</b> kecilkan gas pompa sebelum melepas sambungan. Jangan berdiri di depan ujung lance saat membuka katup.",
        "<b>Api mendekat:</b> mundur ke arah air atau kanal, bukan ke semak kering. Satu orang khusus mengawasi api dan angin.",
        "<b>Di air:</b> pakai pelampung di tepi kanal dan di perahu. Waspada ular dan buaya. Perahu jangan kelebihan muatan.",
        "<b>Panas:</b> minum 3 liter per orang, kerja berat paling lama 45 menit lalu istirahat. Bensin disimpan ≥ 10 m dari bara.",
        "HP dan radio terisi penuh. Titik kumpul di ujung jalan, satu kendaraan siaga.",
    ],
    "kerja": [
        ("Sehari sebelumnya", "Datangi lokasi. Pastikan air di parit atau kanal cukup (dalam ≥ 30 cm), jalan bisa dilewati, dan minta izin kepala desa serta pemilik lahan."),
        ("Begitu tiba", "Catat jam tiba di aplikasi /pipa. Kumpulkan tim 10 menit untuk pengarahan keselamatan. Lihat arah angin dan asap."),
        ("Pasang petak", "Cari tanah gambut yang masih berasap. Pasang 4 petak 10 × 10 m dengan patok dan tali. Bor 1 titik per petak untuk tahu tebal gambut."),
        ("Ukur sebelum", "Ukur suhu tanah di 5 titik tiap petak, di kedalaman 10, 30, 50, dan 100 cm. Foto tiap petak dari 4 arah."),
        ("Pasang pompa dan selang", "Pompa di tepi air, paling tinggi 3,5 m di atas permukaan air. Masukkan selang isap; saringan jangan kena lumpur. Gelar selang ke petak, pasang Y-pembagi 15 m sebelum petak."),
        ("Alirkan air", "Nyalakan pompa, naikkan gas pelan-pelan sampai jarum di lance menunjuk 2–3 bar. Catat jam air mulai keluar dan tekanan tiap 10 menit."),
        ("Suntik dan semprot", "Petak L1 dan L2: tusukkan lance tiap 2 m (25 tusukan per petak), tahan 1–2 menit di kedalaman 30, 60, lalu 100 cm. Petak K1 dan K2: semprot permukaan biasa, catat lamanya."),
        ("Ukur sesudah", "Langsung ukur suhu lagi di titik yang sama. Besok di jam yang sama ukur sekali lagi (titik ditandai patok bernomor)."),
        ("Bongkar", "Matikan pompa, buang sisa air di selang, gulung. Catat jam selesai dan alat yang rusak atau hilang."),
    ],
}

TEKS = {
    "K0166": {
        "status": "Ada api 24 jam terakhir",
        "dalam": "Dalam, lebih dari 3 m (penelitian di Kalampangan); TN Sebangau 1–12 m",
        "peran": "Paling dekat Daops dan sedang ada api; kanal tepat di sebelah petak. Paling cocok untuk uji utama.",
        "pompa": "Pompa ditaruh di tepi {air_nama}, {air_d} m dari petak. Dari pompa cukup <b>satu jalur selang ± {L} m ({gulung} gulung)</b> ke petak. "
                 "Tidak perlu pompa tambahan. Tekanan yang sampai di lance masih besar (± {p_lance} bar), jadi buka katup pelan-pelan dan jaga di 2–3 bar.",
        "topo": "Datar. Beda tinggi kanal dan petak kurang dari 1 m, jadi pompa tidak perlu mendorong air menanjak.",
        "rute_catatan": "Api ada ± 1 km di sebelah timur ujung jalan, di sepanjang kanal.",
        "sulit": ["Ada kebakaran besar 2,5 km ke tenggara yang sudah 7 hari menyala. Asapnya bisa terbawa angin ke petak.",
                  "Bara di sini kemungkinan dalam (perkiraan 15–51 cm, gambut lebih dari 3 m). Lance 1,5 m belum tentu sampai dasar bara.",
                  "Letak kanal di peta bisa meleset puluhan meter, dan banyaknya air saat kemarau belum diketahui.",
                  "Sekitarnya kebun dan ladang warga: minta izin pemilik lahan sebelum menusuk tanah."],
        "mudah": ["29 menit naik mobil dari Daops Palangkaraya, sebagian besar lewat jalan besar.",
                  "Kanal tepat di sebelah petak: selang pendek, air sampai dalam 1 menit.",
                  "Ada 13 sumur bor BRGM dalam 3 km, yang terdekat 0,4 km. Bisa jadi cadangan air bila kanal kering (perlu pompa celup).",
                  "Dekat permukiman Kalampangan: bensin dan bantuan mudah didapat."],
        "tips": ["Mulai pagi, jam 7–10, saat angin masih lemah dan asap belum naik.",
                 "Cek dulu dalamnya air kanal dengan galah. Saringan isap butuh air ≥ 30 cm.",
                 "Kalau ada sekat kanal BRGM di dekat petak, ambil air di sisi hulu sekat. Jangan bongkar sekatnya.",
                 "Taruh petak semprot biasa di sisi kanal yang sama supaya perbandingannya adil."],
    },
    "K9321": {
        "status": "Ada api 24 jam terakhir",
        "dalam": "Dalam, umumnya lebih dari 3 m (eks-PLG Blok C)",
        "peran": "Menguji membawa alat jalan kaki jauh: 2,4 km tanpa jalan mobil, kanal dekat petak.",
        "pompa": "Pompa ditaruh di tepi {air_nama}, {air_d} m dari petak. Dari pompa <b>satu jalur selang ± {L} m ({gulung} gulung)</b> ke petak, tanpa pompa tambahan. "
                 "Tekanan bukan masalah (± {p_lance} bar sampai di lance). Yang berat justru membawa {gulung} gulung selang (± 8 kg per gulung) dan pompa (± 60 kg) jalan kaki {kaki_km} km.",
        "topo": "Datar. Jalur jalan kaki naik-turun hanya beberapa meter.",
        "rute_catatan": "Jalan dari Desa Sakakajang ke ujung jalan adalah jalan kebun yang belum ada di peta. Minta warga menunjukkan jalannya. Dari ujung jalan, jalur kaki menyusuri kanal ke arah barat.",
        "sulit": ["Jalan kaki {kaki_km} km ({kaki_mnt} menit) sambil membawa alat. Perlu 8–10 orang pengangkut atau gerobak dorong.",
                  "Gambut sangat kering (indeks kekeringan 632), bara mudah menjalar sampai ke bawah petak pembanding.",
                  "Daops terdekat (Kapuas) lebih dari 3 jam. Kalau alat rusak, cadangan lama datangnya.",
                  "Banyak sekat kanal dan sumur bor BRGM di sekitar. Selang harus dilewatkan, jangan sampai merusaknya."],
        "mudah": ["Kanal ± 260 m dari petak, dan jalur jalan kaki menyusuri kanal itu.",
                  "Satu pompa cukup, tidak perlu pompa tambahan.",
                  "Sumur bor BRGM terdekat 0,5 km dari petak, bisa jadi cadangan air.",
                  "Di citra satelit 21 Okt bara dan bekas bakarnya terlihat jelas, jadi petak mudah ditemukan."],
        "tips": ["Angkut bergantian: bagi tim jadi 2 kelompok. Selang dibawa duluan, pompa terakhir.",
                 "Masukkan gulungan selang ke karung yang dipanggul supaya tidak tersangkut akar.",
                 "Pasang pita penanda tiap 50 m di jalur kaki untuk jalan pulang saat asap tebal.",
                 "Bawa air minum lebih: tidak ada warung di sepanjang jalur kaki."],
    },
    "K7357": {
        "status": "Ada api 24 jam terakhir",
        "dalam": "Campuran: sebagian lebih dari 3 m, banyak yang kurang dari 1,5 m (eks-PLG Blok A)",
        "peran": "Menguji membawa alat dengan perahu dan mengambil air dari kanal. Cadangan uji utama.",
        "pompa": "Pompa ditaruh di tepi {air_nama}, {air_d} m dari petak; kalau tepi kanal lembek, pompa boleh tetap di atas perahu. "
                 "Dari pompa <b>satu jalur selang ± {L} m ({gulung} gulung)</b> ke petak, tanpa pompa tambahan. Tekanan di lance ± {p_lance} bar, buka katup pelan-pelan.",
        "topo": "Datar dan rendah (4–5 m di atas laut). Air tanah dekat permukaan, dan di beberapa tempat gambutnya tipis. Bor dulu sebelum menusuk lance 1,5 m.",
        "rute_catatan": "Ini perjalanan terlama: ± 2 jam sekali jalan. Waktu dari tiba sampai air mengalir paling lama 4 jam benar-benar diuji di sini.",
        "sulit": ["± 2 jam sekali jalan. Pulang-pergi memakan hampir setengah hari kerja.",
                  "Pompa, bensin, dan {gulung} gulung selang perlu 2 perahu atau 2 kali angkut.",
                  "Gambutnya campuran. Di petak yang tipis, lance bisa tembus ke tanah biasa.",
                  "Kebakaran 3,3 km dari sini ada di hutan lindung yang dikelola KPH. Lapor KPH sebelum masuk."],
        "mudah": ["Kanal hanya 40 m dari petak: selang paling pendek di antara kelima lokasi.",
                  "Air tidak akan habis karena kanal tersambung ke sungai.",
                  "Ada 85 sumur bor BRGM dalam 3 km, yang terdekat 0,3 km.",
                  "Bekas bakar terlihat jelas di citra satelit 21 Okt."],
        "tips": ["Ikat pompa di lantai perahu. Tiap orang pakai pelampung.",
                 "Selang dimuat di perahu pertama, supaya bisa mulai digelar sebelum pompa tiba.",
                 "Catat naik-turun air kanal tiap jam, karena tinggi isap pompa ikut berubah.",
                 "Bawa jangkar atau tali tambat kalau perahu dipakai sebagai tempat pompa."],
    },
    "K9037": {
        "status": "Latihan, api di sekitar bukan di gambut",
        "dalam": "Di pinggir sebaran gambut (0,4 km dari batasnya): kemungkinan tipis, wajib dibor",
        "peran": "Paling mudah dijangkau: 37 menit dari Daops, parit 40 m. Api di sekitarnya bukan di gambut, jadi dipakai untuk latihan hari pertama.",
        "pompa": "Latihan di kompleks: pompa di tepi {air_nama}, {air_d} m dari petak. <b>Satu jalur selang ± {L} m ({gulung} gulung)</b>, tanpa pompa tambahan. "
                 "Pakai latihan ini untuk menyetel katup sampai tekanan lance stabil di 2–3 bar.",
        "topo": "Hampir rata: kompleks ± 21 m dan parit ± 22 m di atas laut. Grafik di atas tampak naik karena data ketinggiannya ikut menghitung tinggi pohon. Ukur dengan GPS saat survei.",
        "rute_catatan": "Semua lewat jalan besar dan jalan kampung, tidak ada jalan tanah.",
        "sulit": ["Ada 6 titik api 24 jam 1,2–1,6 km dari sini, tapi 5 di antaranya bukan di tanah gambut. Jadi tidak ada bara gambut untuk diuji.",
                  "Hanya 0,4 km dari batas gambut, jadi gambutnya mungkin tipis. Kalau kurang dari 50 cm, latihan tetap jalan tanpa ukur suhu.",
                  "Lebar dan dalam air parit belum diketahui.",
                  "Hujan diprakirakan 15 mm pada 27 Okt dan 20 mm pada 31 Okt. Tanah becek, membawa alat jadi lebih lambat."],
        "mudah": ["37 menit dari Daops Palangkaraya, semua lewat jalan besar dan jalan kampung.",
                  "Parit 40 m dari petak, ujung jalan 0,3 km (5 menit jalan kaki).",
                  "Dekat kota: bensin, bengkel, dan alat cadangan mudah didapat.",
                  "Tempat aman untuk berlatih dan mengukur waktu pasang-bongkar sebelum ke lokasi api sungguhan."],
        "tips": ["Jadikan hari pertama latihan, lalu pindah ke lokasi 1 dengan regu yang sudah hafal urutannya.",
                 "Kalau saat survei ternyata ada asap keluar dari tanah gambut dalam 500 m, jadikan uji sungguhan. Kalau tidak, catat sebagai latihan di /pipa.",
                 "Ukur waktu tiap langkah dengan stopwatch sebagai patokan SOP.",
                 "Coba sambungan selang dengan tekanan penuh di sini untuk cek bocor, bukan di lokasi api."],
    },
    "K2628": {
        "status": "Survei saja, tidak dipakai untuk uji",
        "dalam": "Belum ada rujukan; gambut pesisir Mentaya, kemungkinan dangkal sampai sedang",
        "peran": "Api paling sering berulang (7 dari 14 tahun), tapi butuh ± 2 jam termasuk jalan kaki 3,9 km, dan Daops lebih dari 7 jam. Disurvei untuk calon gudang wilayah barat.",
        "pompa": "Kalau kelak dipakai: pompa di tepi {air_nama}, {air_d} m dari petak, <b>satu jalur selang ± {L} m ({gulung} gulung)</b>, tanpa pompa tambahan. "
                 "Yang berat adalah membawa alat jalan kaki {kaki_km} km.",
        "topo": "Datar dan rendah (± 6 m di atas laut), dekat pantai. Air kanal bisa payau saat kemarau panjang; cicipi atau ukur dulu.",
        "rute_catatan": "Daops terdekat lebih dari 7 jam. Berangkat dari Desa Samuda Kota.",
        "sulit": ["Jalan kaki {kaki_km} km ({kaki_mnt} menit) dari ujung jalan ke petak, paling jauh di antara kelima lokasi.",
                  "Citra satelit terakhir yang jelas tanggal 14 Okt. Setelah itu tertutup awan, jadi kondisi lahan hari ini belum terlihat.",
                  "Dua kebakaran besar di hutan produksi 3,5–4,2 km dari sini: asap tebal dan perlu izin pengelola.",
                  "Bantuan alat dan regu cadangan sangat jauh."],
        "mudah": ["Kanal 40 m dari petak: selang pendek, tanpa pompa tambahan.",
                  "Ada 111 sumur bor BRGM dalam 3 km sebagai cadangan air.",
                  "Api sering berulang di sini, jadi hasil survei berguna untuk wilayah barat."],
        "tips": ["Saat survei, catat: jalan mobil terdekat ke kanal, calon tempat gudang di Samuda, lebar dan dalam kanal, rasa air (payau atau tawar).",
                 "Kalau nanti dipakai untuk uji, kirim tim angkut sehari sebelumnya untuk menitipkan alat dekat petak.",
                 "Bawa power bank atau genset kecil: sinyal dan listrik terbatas.",
                 "Hubungi BPBD Kotawaringin Timur dan MPA Desa Babaung sejak awal."],
    },
}

UJI = {
    "K0166": "Uji utama: suntik air ke bara gambut, selang pendek",
    "K9321": "Uji membawa alat jalan kaki 2,4 km, selang pendek",
    "K7357": "Uji membawa alat dengan perahu, selang pendek",
    "K9037": "Latihan pasang dan bongkar alat, tanpa api",
    "K2628": "Survei calon gudang wilayah barat, bukan untuk uji",
}

DALAM_PANJANG = {
    "K1439": "Belum ada rujukan untuk titik ini; wajib dibor",
    "K0188": "Kemungkinan dalam, lebih dari 3 m (kawasan Sebangau dan Kalampangan); wajib dibor",
    "K0317": "Di pinggir sebaran gambut Bukit Batu: kemungkinan tipis, wajib dibor",
    "K1253": "Belum ada rujukan; gambut pesisir Seruyan, wajib dibor",
    "K0598": "Belum ada rujukan untuk titik ini; wajib dibor",
}

CATATAN_PANJANG = {
    "K1439": "Paling dekat kota: 11 menit naik mobil dari Desa Bukit Tunggal.",
    "K0188": "Berangkat langsung dari Daops Palangkaraya, 23 menit naik mobil.",
    "K0317": "Satu kawasan dengan lokasi 4 Bukit Batu: latihan di lokasi 4 bisa langsung disambung uji selang panjang ke api gambut di sini.",
    "K1253": "Jauh dari Daops (lebih dari 9 jam); hanya bila ada regu BPBD Seruyan yang siap.",
    "K0598": "Berangkat dari Daops Palangkaraya, 14 menit naik mobil. Selang terpanjang di daftar, ± 2 km lurus dari air ke api.",
}


def teks_panjang(kid, s):
    """teks selang panjang dihitung dari data lokasi; angka selalu dari data.json"""
    h = s["hid"]
    relay = h.get("relay")
    n_pompa = relay["n_ruas"] if relay else 1
    pompa = (f"Pompa pertama di tepi {{air_nama}}, dekat tempat parkir mobil. Dari situ <b>satu jalur selang ± {{L}} m ({{gulung}} gulung)</b> masuk ke lahan sampai petak. "
             + (f"Karena jauh, perlu <b>{n_pompa - 1} pompa tambahan</b> di tengah jalur, kira-kira tiap {relay['L_ruas']:,} m".replace(",", ".")
                + ". Pompa tambahan menerima air dari selang dan mendorongnya lagi ke depan." if relay
                else "Satu pompa masih cukup kuat untuk jarak ini.")
             + " Uji di sini untuk melihat berapa lama selang panjang digelar, apakah tekanan di lance masih cukup, dan berapa orang yang dibutuhkan.")
    return {
        "status": "Ada api 24 jam terakhir" if s["target"] and s["target"]["jam"] >= -24 else "Ada api 48 jam terakhir",
        "dalam": DALAM_PANJANG[kid],
        "peran": f"Pompa di air tepi jalan, api gambut {{air_d}} m masuk ke dalam lahan. {CATATAN_PANJANG[kid]}",
        "pompa": pompa,
        "topo": "Tinggi air dan petak hampir sama menurut data; ukur dengan GPS saat survei karena data ketinggian ikut menghitung tinggi pohon.",
        "rute_catatan": CATATAN_PANJANG[kid] + " Jalur jalan kaki ke petak mengikuti jalur selang.",
        "sulit": [f"Selang ± {{L}} m berarti {{gulung}} gulung (± 8 kg per gulung): perlu banyak orang atau gerobak untuk menggelar.",
                  "Makin panjang selang, makin banyak sambungan yang bisa bocor. Siapkan klem dan selang tambal lebih banyak.",
                  "Petak 1–2 km dari jalan: kalau api membesar, jalur mundur jauh. Tetapkan jalur mundur sebelum mulai.",
                  "Tebal gambut di titik ini belum diketahui; bor dulu sebelum menyuntik."],
        "mudah": ["Pompa di tepi jalan: pompa dan bensin tidak perlu dipikul jauh.",
                  "Air diambil dekat tempat parkir mobil, jadi mudah diganti bila sumbernya habis.",
                  "Jalur selang bisa dipakai sekaligus sebagai jalur jalan kaki ke petak."],
        "tips": ["Gelar selang dari petak ke arah pompa: ujung yang sudah tersambung tidak terseret.",
                 "Beri nomor tiap gulung dan catat jam selesai tiap 200 m untuk mengukur kecepatan gelar.",
                 "Pasang pengukur tekanan di pompa tambahan dan di lance; catat keduanya tiap 10 menit.",
                 "Siapkan radio di pompa pertama, pompa tambahan, dan petak supaya pompa bisa dimatikan cepat."],
    }
