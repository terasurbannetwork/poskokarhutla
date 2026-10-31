"""Panel kinerja BNPB (IKU 1.1 IRB, IKU 1.2 kapasitas daerah, kerugian/PDB, peringatan dini) -> public/data/bnpb/iku.json

SUMBER   Angka resmi hanya dari catatan di data/kajian-bnpb/pustaka (LAKIP 2025, Renstra 2025-2029, NDPBA), tiap angka membawa
         dokumen + halaman. Angka sistem kita: public/data/bnpb/ikd.json (raster kapasitas InaRISK, BUKAN IKD resmi) dan
         public/data/bnpb/terpapar.json (penduduk terpapar bahaya InaRISK sedang+). Tanpa jaringan.
KEPUTUSAN ANGKA  IRB 2025 krb2021: 170,17 (teks LAKIP hal. 19), rumus hal. 19 memakai 170,19 -> dicatat. Target turun IRB 1,2 persen/tahun
         dari 147,95 (LAKIP hal. 19, Renstra hal. 133): v(n) = 147,95 x 0,988^n, n = tahun - 2025.
Pakai:   python3 scripts/bnpb/iku.py   |   python3 scripts/bnpb/iku.py --uji
"""
import json, os, re, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KELUAR = os.path.join(AKAR, "public/data/bnpb/iku.json")
IKD = os.path.join(AKAR, "public/data/bnpb/ikd.json")
TERPAPAR = os.path.join(AKAR, "public/data/bnpb/terpapar.json")
KOTA = os.path.join(AKAR, "scripts/udara/kota.json")
INSTANSI = os.path.join(AKAR, "src/instansi.js")

BASELINE, DASAR, TURUN = 147.95, 2025, 1.2
LAK, REN, NDP, BD = "LAKIP BNPB 2025", "Renstra BNPB 2025-2029", "NDPBA Indonesia", "Buku Data 2024"


def lintasan(baseline=BASELINE, dasar=DASAR, turun=TURUN, tahun=range(2026, 2030)):
    return [{"tahun": t, "v": round(baseline * (1 - turun / 100) ** (t - dasar), 2)} for t in tahun]

# ---------- peta kontribusi modul Centurisk97 ke Renstra (tulisan tangan; REKOMENDASI-100 no. 1, butir 98) ----------
# status: berjalan = fitur ada di repo dan membaca data nyata; sebagian = fitur ada tetapi cakupan, data, atau uji terbatas; belum = tidak ada.
# "berkas" hanya dipakai uji (harus ada di repo), tidak ditampilkan di layar.
STATUS_KONTRIBUSI = ("berjalan", "sebagian", "belum")
def _i(nama, hal, dok=REN): return {"nama": nama, "dokumen": dok, "hal": hal}
KONTRIBUSI = [
    {"id": "irb-panel", "modul": "Panel Kinerja BNPB", "url": "/kinerja-bnpb", "bentuk": "pemantauan", "status": "berjalan",
     "indikator": [_i("IKU 1.1: persen penurunan Indeks Risiko Bencana nasional, 1,2 persen per tahun (Tabel 4.5)", "133")],
     "bukti": "Tiga deret IRB dipisah, lintasan target 2026 sampai 2029 dihitung dari baseline 147,95.",
     "batas": "Memantau capaian dari dokumen resmi; tidak menurunkan IRB dan tidak menghitung IRB resmi.",
     "berkas": ["public/bnpb/kinerja.js", "public/data/bnpb/iku.json"]},
    {"id": "irb-risiko", "modul": "Risiko kecamatan", "url": "/risiko", "bentuk": "data", "status": "sebagian",
     "indikator": [_i("IKU 1.1: persen penurunan Indeks Risiko Bencana nasional (Tabel 4.5)", "133"),
                   _i("Dit. Pemetaan dan Evaluasi Risiko: rekomendasi kebijakan pemetaan risiko berbasis kewilayahan (Lampiran I)", "154-156")],
     "bukti": "Indeks risiko operasional harian per kecamatan dari bahaya, penduduk terpapar, dan kapasitas.",
     "batas": "Indeks buatan sendiri, berlabel belum diuji balik; uji bahaya x kerentanan / kapasitas atas korban DIBI belum lolos.",
     "berkas": ["scripts/bnpb/risiko.py", "scripts/bnpb/risiko_hvc.py", "public/bnpb/risiko.js"]},
    {"id": "kapasitas-panel", "modul": "Panel Kinerja BNPB, daftar kapasitas daerah", "url": "/kinerja-bnpb", "bentuk": "pemantauan", "status": "sebagian",
     "indikator": [_i("IKU 1.2: persen daerah berkapasitas penanggulangan bencana minimal sedang, 67 persen (2025) ke 90 persen (2029) (Tabel 4.5)", "133")],
     "bukti": "Capaian IKD resmi per provinsi dan kabupaten/kota, serta daftar kabupaten/kota berkapasitas rendah menurut raster InaRISK.",
     "batas": "Daftar kabupaten memakai raster InaRISK, bukan IKD resmi (310 rendah menurut hitungan kita dari raster; 225 menurut LAKIP hal. 22); IKD resmi per kabupaten tidak terbit terbuka.",
     "berkas": ["scripts/bnpb/ikd.py", "public/data/bnpb/ikd.json"]},
    {"id": "kapasitas-meja", "modul": "Meja Kerja BPBD, rapor kinerja", "url": "/meja", "bentuk": "alat kerja", "status": "sebagian",
     "indikator": [_i("IKU 1.2: persen daerah berkapasitas minimal sedang (Tabel 4.5)", "133"),
                   _i("Dit. Kesiapsiagaan: persen daerah punya dokumen rencana aksi kesiapsiagaan (Tabel 4.7)", "135-141")],
     "bukti": "Formulir kaji cepat, logistik, DSP, rencana kontingensi, dan Destana dengan status bertahap, plus rapor kinerja BPBD.",
     "batas": "Alat ada, tetapi pemakaian BPBD belum tercatat; tidak ada bukti ia menaikkan kelas IKD.",
     "berkas": ["src/meja.js", "public/bnpb/meja.js"]},
    {"id": "pdb", "modul": "Panel Kinerja BNPB, kerugian terhadap PDB", "url": "/kinerja-bnpb", "bentuk": "pemantauan", "status": "berjalan",
     "indikator": [_i("Indikator tujuan: proporsi kerugian ekonomi langsung terhadap PDB, 0,1370 persen (2025) ke 0,1350 persen (2029) (Tabel 2.1)", "85")],
     "bukti": "Realisasi 2025 0,217 persen dengan target tahunan, dari LAKIP dan Renstra.",
     "batas": "Menampilkan angka resmi; kita tidak mengukur kerugian sendiri dan angka 2025 belum memuat Siklon Senyar.",
     "berkas": ["public/bnpb/kinerja.js", "scripts/bnpb/iku.py"]},
    {"id": "cakupan-pd", "modul": "Peringatan dini untuk lokasimu", "url": "/peringatan", "bentuk": "peringatan", "status": "sebagian",
     "indikator": [_i("Program 2: persen cakupan layanan peringatan dini di daerah berisiko, 6,10 persen (2025) ke 6,32 persen (2029) (Tabel 4.6)", "133-135")],
     "bukti": "Pemicu otomatis untuk gempa, tsunami, cuaca ekstrem, karhutla, dan banjir; langganan email; keluaran JSON, CAP 1.2, dan GeoJSON.",
     "batas": "Jangkauan penerima belum terukur, jadi tidak bisa dihitung sebagai cakupan layanan versi Renstra; CAP memuat satu alert gabungan.",
     "berkas": ["src/peringatan.js", "src/ews.js", "public/peringatan.html", "public/ews_tindakan.js"]},
    {"id": "aksi-dini", "modul": "Peringatan dini dan tindakan per tingkat", "url": "/peringatan", "bentuk": "peringatan", "status": "sebagian",
     "indikator": [_i("Pusdatin: Pembangunan Ekosistem Aksi Dini, 17 lokasi per tahun 2026 sampai 2028 dan 1 lokasi 2029 (Lampiran I)", "161")],
     "bukti": "Rantai pemicu, tingkat, tindakan warga, dan keluaran CAP sudah jalan untuk lima bahaya.",
     "batas": "Belum ada lokasi percontohan, dan belum ada ukuran jangkauan penerima; dasar pilot ada di dokumen kesesuaian Ekosistem Aksi Dini.",
     "berkas": ["public/ews_tindakan.js", "src/peringatan.js"]},
    {"id": "mhews", "modul": "Platform MHEWS BNPB", "url": None, "bentuk": "peringatan", "status": "belum",
     "indikator": [_i("Pusdatin: Platform MHEWS, 1 sistem (2025) (Lampiran I)", "160-162"),
                   _i("Usulan Perpres tentang MHEWS (Bab 3)", "107")],
     "bukti": "Tidak ada sambungan ke platform MHEWS BNPB; yang ada hanya keluaran CAP 1.2 yang bisa dibaca sistem lain.",
     "batas": "Belum ada bukti ada sistem BNPB yang mengambil CAP kita; platform resmi bukan milik repo ini.",
     "berkas": ["src/peringatan.js"]},
    {"id": "sirene", "modul": "Peta evakuasi tsunami, sirine", "url": "/gempa/", "bentuk": "pemantauan", "status": "sebagian",
     "indikator": [_i("Dit. Peringatan Dini: penguatan instrumen peringatan dini, sirene terpasang 23 paket (2025) ke 170 paket (2029) (Lampiran I)", "162-164"),
                   _i("Dit. Peringatan Dini: persen layanan diseminasi berbasis sirine yang memadai (Tabel 4.7)", "135-141")],
     "bukti": "Lapisan sirine tsunami, titik kumpul, rambu, dan jangkauan sirine di peta gempa.",
     "batas": "Hanya empat wilayah rintisan dan sirine di Bali; 62 lokasi sirine tsunami LAKIP belum dipetakan dan penduduk dalam jangkauan bunyi belum dihitung.",
     "berkas": ["public/gempa/evakuasi.js", "public/cuaca/data/evakuasi_tsunami.json"]},
    {"id": "destana", "modul": "Meja Kerja BPBD, formulir Destana", "url": "/meja", "bentuk": "alat kerja", "status": "sebagian",
     "indikator": [_i("Program 2: persen desa berketahanan bencana multipihak, 10,49 persen (2025) (Tabel 4.6)", "133-135"),
                   _i("Dit. Kesiapsiagaan: Desa/Kelurahan Tangguh Bencana, 10 desa (2025) ke 170 desa (2029) (Lampiran I)", "166")],
     "bukti": "Formulir Destana dengan tingkat utama, madya, dan pratama, serta rekap per wilayah.",
     "batas": "Tidak ada peta atau daftar Destana per kabupaten dan tidak ada panel target 10 ke 170 desa.",
     "berkas": ["src/meja.js"]},
    {"id": "logistik", "modul": "Perkiraan kebutuhan musim", "url": "/kebutuhan", "bentuk": "alat kerja", "status": "sebagian",
     "indikator": [_i("Program 5: persen daerah difasilitasi logistik dan peralatan PB, 35 persen (2025) ke 75 persen (2029) (Tabel 4.6)", "133-135"),
                   _i("Bantuan peralatan/sarana, 60 unit (2025) ke 1.245 unit per tahun (2026 sampai 2029) (Lampiran II)", "194")],
     "bukti": "Perkiraan jam terbang, regu darat, dan logistik karhutla per provinsi untuk 30, 60, dan 90 hari, lengkap dengan rupiah dan asumsinya.",
     "batas": "Hanya karhutla; tidak melacak stok atau distribusi (itu INALOGPAL), dan bukan pusat dukungan logistik antarpulau.",
     "berkas": ["scripts/bnpb/kebutuhan.py", "public/bnpb/kebutuhan.js"]},
    {"id": "dsp", "modul": "Meja Kerja BPBD, formulir DSP", "url": "/meja", "bentuk": "alat kerja", "status": "sebagian",
     "indikator": [_i("Bantuan dana siap pakai darurat kebencanaan, 30 paket per tahun (Tabel 4.2)", "126-128"),
                   _i("Dit. Dukungan Sumber Daya Darurat: bantuan DSP, Rp250 miliar per tahun (Lampiran I)", "168")],
     "bukti": "Formulir usulan DSP dengan status bertahap di Meja Kerja BPBD.",
     "batas": "Tidak tersambung ke Sistala DSP milik BNPB; hanya mencatat sisi daerah.",
     "berkas": ["src/meja.js"]},
    {"id": "status-darurat", "modul": "Status darurat bencana", "url": "/semua/", "bentuk": "data", "status": "berjalan",
     "indikator": [_i("Program 3: persen daerah yang menetapkan status darurat dan menerima intervensi sesuai standar, 100 persen (Tabel 4.6)", "133-135")],
     "bukti": "SK status darurat dari data.bnpb.go.id di peta, penanda SK yang melewati masa pedoman, dan saran status untuk rakor (bukan penetapan).",
     "batas": "SK tahun berjalan belum terbit di sumber; saran status sebagian berdasarkan data lama dan cuaca belum punya sinyal per kabupaten.",
     "berkas": ["public/semua/darurat.js", "scripts/umum/saran_status.py", "public/data/status_darurat.json"]},
    {"id": "posko", "modul": "Posko dan regu lapangan", "url": "/admin/posko", "bentuk": "alat kerja", "status": "sebagian",
     "indikator": [_i("Pusdalops: persen daerah yang mengaktivasi posko saat penetapan status keadaan darurat, 15 persen (2025) ke 35 persen (2029) (Tabel 4.7)", "135-141")],
     "bukti": "Modul posko karhutla dan banjir untuk regu, laporan, dan tugas api.",
     "batas": "Mencatat posko yang memakai sistem kita; tidak mengukur aktivasi posko seluruh daerah.",
     "berkas": ["src/posko.js", "public/banjir/posko.js"]},
    {"id": "info-2jam", "modul": "Laporan situasi", "url": "/sitrep", "bentuk": "data", "status": "sebagian",
     "indikator": [_i("Pusdatin: persen penyampaian informasi kejadian bencana ke publik kurang dari 2 jam, 100 persen (Tabel 4.7)", "135-141")],
     "bukti": "Laporan situasi harian nasional dan per provinsi, siap cetak dan salin ke WhatsApp.",
     "batas": "Waktu dari kejadian sampai rilis tidak diukur; laporan dirakit dari data harian, bukan dari laporan Pusdalops.",
     "berkas": ["public/bnpb/sitrep.js"]},
    {"id": "satu-data", "modul": "Pendataan Satu Data BNPB", "url": "/pendataan", "bentuk": "data", "status": "sebagian",
     "indikator": [_i("Pusdatin: Forum Komunikasi Satu Data Bencana dan NSPK Satu Data Bencana (Lampiran I)", "160-162"),
                   _i("Pusdatin: Indeks SPBE 3,15 (2025) ke 3,35 (2029) dan Indeks Pembangunan Statistik (Tabel 4.7)", "135-141")],
     "bukti": "Formulir pendataan unit dan responden tahap satu, dengan pilihan Lainnya di semua isian.",
     "batas": "Tahap dua belum jalan; bukan integrasi dengan Satu Data Indonesia dan tidak mengubah nilai SPBE.",
     "berkas": ["src/pendataan.js", "public/bnpb/pendataan.js"]},
    {"id": "api-data", "modul": "API data terbuka", "url": "/api", "bentuk": "data", "status": "sebagian",
     "indikator": [_i("Pusdatin: layanan sistem diseminasi dan pengintegrasian sistem informasi kebencanaan, 7 sistem per tahun (Lampiran I)", "160-162")],
     "bukti": "Keluaran JSON dan GeoJSON publik untuk data bahaya dan peringatan, berizin terbuka.",
     "batas": "Tidak ada kesepakatan tukar data dengan Pusdatin; BNPB belum memakainya sebagai salah satu dari 7 sistem.",
     "berkas": ["src/api_v1.js", "public/api.html"]},
    {"id": "damkar", "modul": "Risiko kebakaran permukiman", "url": "/risiko-kebakaran", "bentuk": "data", "status": "sebagian",
     "indikator": [_i("Rekomendasi 19: berinvestasi pada pencegahan kebakaran dan prasarana pemadam", "123", NDP)],
     "bukti": "Indeks risiko kebakaran permukiman padat per kelurahan dengan waktu tempuh Damkar.",
     "batas": "Hanya DKI Jakarta; tidak ada data pos damkar nasional dan rasio pos per 100.000 penduduk belum dihitung.",
     "berkas": ["scripts/bnpb/kebakaran.py", "public/bnpb/kebakaran.js"]},
    {"id": "mitigasi", "modul": "Cakupan layanan mitigasi", "url": None, "bentuk": "alat kerja", "status": "belum",
     "indikator": [_i("Program 2: persen cakupan layanan mitigasi bencana di daerah berisiko, 7,39 persen (2025) ke 18,87 persen (2029) (Tabel 4.6)", "133-135")],
     "bukti": "Tidak ada modul yang memantau atau membantu layanan mitigasi.",
     "batas": "Capaian 2025 hanya 6,42 persen (LAKIP hal. 40); belum ada fitur kita untuk indikator ini.",
     "berkas": []},
]


def nama_prov():
    """kode prov -> nama, dibaca dari tabel PROV di src/instansi.js (hanya dibaca, bukan disunting)."""
    s = open(INSTANSI, encoding="utf-8").read()
    return {k: n for k, n in re.findall(r'"(\d\d)":\s*\["[a-z]+",\s*"([^"]+)"\]', s)}


def kapasitas_raster():
    d = json.load(open(IKD, encoding="utf-8"))
    kota = json.load(open(KOTA, encoding="utf-8")); i = {k: n for n, k in enumerate(kota["kolom"])}
    info = {r[i["kode"]]: (r[i["nama"]], r[i["prov"]]) for r in kota["baris"]}
    pv = nama_prov()
    kab = d["kab"]
    rendah = sorted(({"kode": k, "nama": info[k][0], "prov": pv.get(info[k][1], info[k][1]), "c": v["c"]}
                     for k, v in kab.items() if v.get("kelas") == "rendah" and k in info), key=lambda r: (r["c"], r["kode"]))
    kelas = {x: sum(1 for v in kab.values() if v.get("kelas") == x) for x in ("rendah", "sedang", "tinggi")}
    tanpa = sorted(k for k in info if k not in kab or kab[k].get("c") is None)
    total = len(kab)
    return {"label": "Raster kapasitas InaRISK, bukan IKD resmi",
            "dibuat_dari": d.get("dibuat"), "kab": {**kelas, "total": total},
            "persen_min_sedang": round((kelas["sedang"] + kelas["tinggi"]) / total * 100, 1),
            "ambang": d.get("kelas_ambang"),
            "catatan": "Raster memberi 310 kabupaten kelas rendah, IKD resmi 225 (LAKIP hal. 22). Padanan raster dengan IKD tidak terbukti; angka resmi menang. Persentase ini dihitung atas kabupaten/kota, sedangkan angka IKU 50 persen dihitung atas provinsi.",
            "kab_rendah": rendah, "kab_tanpa_nilai": tanpa}


def paparan():
    d = json.load(open(TERPAPAR, encoding="utf-8"))
    n = sum(k["n"] for k in d["kab"].values())
    j = {}
    for k in d["kab"].values():
        for b, v in k["h"].items():
            j[b] = j.get(b, 0) + v[0]
    return n, j, d.get("dibuat")


def sistem_kita():
    n, j, dibuat = paparan()
    sp = "Hitungan Centurisk97: penduduk Dukcapil x bahaya InaRISK sedang ke atas, titik pusat desa"
    def r(jenis, pemicu, kunci=None, alt=None, alasan=None):
        return {"jenis": jenis, "pemicu_otomatis": True, "pemicu": pemicu,
                "penduduk_terpapar": j[kunci] if kunci else alt, "sumber_paparan": sp if kunci else (alasan or ""), "persen_penduduk": round(j[kunci] / n * 100, 1) if kunci else None}
    return {"diukur": dibuat, "penduduk_total": n,
            "per_bahaya": [
                r("gempa", "M 5 atau lebih di darat atau 100 km dari pusat kecamatan, atau dirasakan MMI IV (Waspada); M 6 atau lebih dan dangkal (Siaga)", "gempa"),
                r("tsunami", "Pernyataan potensi tsunami BMKG kode 1 sampai 3 (Awas); tanpa pernyataan tidak ada alarm", None, 5341282,
                  "LAKIP 2025 hal. 35-37 (Tabel 3.4): penduduk terpapar tsunami menurut BNPB; bukan hitungan raster kita"),
                r("cuaca", "Nowcast BMKG tingkat Severe (Siaga) atau Extreme (Awas)", None, None, "tidak ada data paparan penduduk untuk cuaca ekstrem di repo"),
                r("karhutla", "Tugas api level 3 baru, dibuat dalam 6 jam (Siaga)", "karhutla"),
                r("banjir", "Kejadian aktif level 2 (Siaga) atau level 3 (Awas)", "banjir")],
            "jangkauan_penerima": "Jangkauan penerima (siapa yang benar-benar menerima peringatan) belum terukur.",
            "sumber_aturan": "peringatan dini sistem Centurisk97"}


def bangun():
    return {
        "dibuat": time.strftime("%Y-%m-%dT%H:%M", time.localtime()) + "+07:00",
        "tahun_data": "LAKIP BNPB 2025 (capaian 2019-2025), Renstra BNPB 2025-2029 (target 2025-2029); raster InaRISK: tahun sumber tidak tertulis",
        "sumber": [
            {"id": "lakip", "dokumen": LAK, "hal": "xi, 18-22, 35-37, 112-113"},
            {"id": "renstra", "dokumen": REN, "hal": "53, 71, 85, 133-134"},
            {"id": "ndpba", "dokumen": NDP, "hal": "108-110"},
            {"id": "ikd_raster", "dokumen": "InaRISK BNPB, raster kapasitas per kabupaten (hitungan Centurisk97)", "hal": "-"},
            {"id": "terpapar", "dokumen": "Dukcapil Kemendagri x InaRISK BNPB (hitungan Centurisk97)", "hal": "-"}],
        "irb": {
            "deret": [
                {"id": "lama", "label": "Metode lama, 2019 sampai 2024",
                 "nilai": [{"tahun": t, "v": v} for t, v in ((2019, 144.02), (2020, 141.65), (2021, 138.81), (2022, 135.56), (2023, 132.25), (2024, 128.52))],
                 "target": [{"tahun": t, "v": v} for t, v in ((2020, 141.14), (2021, 138.26), (2022, 135.38), (2023, 132.50), (2024, 129.62))],
                 "turun_persen": 10.76, "sumber": f"{REN} hal. 53 (Tabel 1.6)"},
                {"id": "krb2021", "label": "Bahaya dan kerentanan KRB 2021, 2024 ke 2025",
                 "nilai": [{"tahun": 2024, "v": 171.95}, {"tahun": 2025, "v": 170.17}], "turun_persen": 1.03,
                 "catatan": "Teks LAKIP 170,17; rumus penurunan di LAKIP hal. 19 memakai 170,19. Dipakai angka teks.",
                 "sumber": f"{LAK} hal. 18-19"},
                {"id": "seb", "label": "Kerentanan proyeksi SEB Kemendagri dan Bappenas, baseline 2026 sampai 2029",
                 "nilai": [{"tahun": 2025, "v": 147.95}], "sumber": f"{LAK} hal. 18-19"}],
            "target": {"baseline": BASELINE, "tahun_dasar": DASAR, "turun_persen_per_tahun": TURUN, "lintasan": lintasan(),
                       "rumus": "147,95 x 0,988 pangkat (tahun - 2025): hitungan kita, bukan angka dokumen; dokumen tidak mencetak nilai mutlak target",
                       "sumber": f"{LAK} hal. 19; {REN} hal. 133"},
            "capaian_turun_persen": [
                {"tahun": 2021, "target": None, "capaian": 2.01}, {"tahun": 2022, "target": None, "capaian": 2.34},
                {"tahun": 2023, "target": None, "capaian": 2.44}, {"tahun": 2024, "target": None, "capaian": 2.81},
                {"tahun": 2025, "target": 1.2, "capaian": 1.03}],
            "catatan_capaian": f"Capaian 2021-2025 dari Gambar 3.1 {LAK} hal. 19 (dibaca dari gambar). Target persen hanya ada untuk 2025 (1,2 persen, {LAK} hal. 19). Target tahunan Renstra lama berupa nilai IRB mutlak (141,14 sampai 129,62), ada di grafik deret metode lama ({REN} hal. 53, Tabel 1.6).",
            "catatan": "Tiga deret tidak boleh dibandingkan antarderet: LAKIP hal. 18-19 menyatakan pemutakhiran data bahaya dan kerentanan membuat IRB 2013-2024 berbeda signifikan dari IRB 2025, dan target Renstra dihitung atas baseline baru 147,95, bukan 128,52."},
        "kapasitas": {
            "resmi": {"tahun": 2025, "persen_min_sedang": 50, "target": 67,
                      "target_lintasan": [{"tahun": t, "v": v} for t, v in zip(range(2025, 2030), (67, 73, 79, 85, 90))],
                      "prov": {"2024": {"rendah": 14, "sedang": 24, "tinggi": 0}, "2025": {"rendah": 19, "sedang": 19, "tinggi": 0}},
                      "prov_riwayat": {"2021": [26, 12, 0], "2022": [21, 17, 0], "2023": [19, 19, 0], "2024": [14, 24, 0], "2025": [19, 19, 0]},
                      "kab": {"rendah": 225, "sedang": 274, "tinggi": 15, "menilai": 469, "total": 514},
                      "sumber": f"{LAK} hal. 20 (Tabel 3.2, 3.3), hal. 22; target {REN} hal. 133"},
            "raster": kapasitas_raster()},
        "kerugian_pdb": {
            "satuan": "persen PDB",
            "realisasi": [{"tahun": 2025, "v": 0.217, "kerugian_rp_t": 51.3, "pdb_rp_t": 23656.2, "catatan": "dampak Siklon Senyar belum dihitung"}],
            "target": [{"tahun": t, "v": v} for t, v in zip(range(2025, 2030), (0.137, 0.1365, 0.136, 0.1355, 0.135))],
            "sumber": f"{LAK} hal. 18; target {REN} hal. 85 (Tabel 2.1)"},
        "kontribusi": KONTRIBUSI,
        "peringatan": {
            "renstra_cakupan_persen": [{"tahun": t, "v": v} for t, v in zip(range(2025, 2030), (6.10, 6.17, 6.21, 6.26, 6.32))],
            "renstra_sumber": f"{REN} hal. 133-134 (Tabel 4.6); realisasi 2025 6,10 persen {LAK} hal. 35",
            "lakip_cakupan": [{"jenis": "tsunami", "terpapar": 5341282, "tercakup": 651000, "persen": 12.19},
                              {"jenis": "banjir", "terpapar": 113829496, "tercakup": 10800, "persen": 0.01}],
            "lakip_sumber": f"{LAK} hal. 35-37 (Tabel 3.4)",
            "rpjmn_keterpenuhan_persen": 6, "rpjmn_sumber": f"{REN} hal. 71",
            "ndpba": "Cakupan pemantauan ancaman hanya 25-75 persen penduduk; target minimal 75 persen penduduk terlayani peringatan",
            "ndpba_sumber": f"{NDP} hal. 108-110",
            "sistem_kita": sistem_kita()}}


def uji_kontribusi(K):
    assert len(K) >= 9 and len({x["id"] for x in K}) == len(K)
    for x in K:
        assert x["status"] in STATUS_KONTRIBUSI, x["id"]
        assert x["indikator"] and all(i["nama"] and i["dokumen"] and re.fullmatch(r"\d+(-\d+)?", i["hal"]) for i in x["indikator"]), x["id"]
        assert x["bukti"] and x["batas"] and x["bentuk"], x["id"]
        assert (x["url"] is None) == (x["status"] == "belum"), x["id"]   # tanpa halaman = belum; "berjalan" butuh halaman nyata
        if x["status"] != "belum":
            assert x["berkas"] and all(os.path.exists(os.path.join(AKAR, b)) for b in x["berkas"]), (x["id"], x["berkas"])
        assert "\u00b7" not in json.dumps(x, ensure_ascii=False), x["id"]
    ada = " ".join(json.dumps(x, ensure_ascii=False) for x in K)
    for kata in ("IKU 1.1", "IKU 1.2", "kerugian ekonomi", "peringatan dini", "sirene", "Tangguh", "logistik", "darurat", "Satu Data"):
        assert kata.lower() in ada.lower(), kata


def uji():
    L = lintasan()
    assert [x["v"] for x in L] == [round(147.95 * 0.988 ** n, 2) for n in (1, 2, 3, 4)] and L[0]["v"] == 146.17 and L[-1]["v"] == 140.98, L
    d = bangun()
    for k in ("dibuat", "sumber", "irb", "kapasitas", "kerugian_pdb", "peringatan"):
        assert k in d, k
    assert [s["id"] for s in d["irb"]["deret"]] == ["lama", "krb2021", "seb"]
    assert d["irb"]["target"]["lintasan"] == L
    r = d["kapasitas"]["raster"]
    ik = json.load(open(IKD, encoding="utf-8"))["kab"]
    sed = sum(1 for v in ik.values() if v["c"] >= 0.33)
    assert r["persen_min_sedang"] == round(sed / len(ik) * 100, 1), (r["persen_min_sedang"], sed)
    assert len(r["kab_rendah"]) == r["kab"]["rendah"] == sum(1 for v in ik.values() if v["c"] < 0.33)
    c = [x["c"] for x in r["kab_rendah"]]; assert c == sorted(c) and all(x["prov"] and not x["prov"].isdigit() for x in r["kab_rendah"])
    assert r["kab"]["total"] == 514 and r["kab_tanpa_nilai"] == []
    k = d["kapasitas"]["resmi"]["kab"]; assert k["rendah"] + k["sedang"] + k["tinggi"] == k["total"] == 514
    assert d["kapasitas"]["resmi"]["prov"]["2025"]["rendah"] + d["kapasitas"]["resmi"]["prov"]["2025"]["sedang"] == 38
    assert round(51.3 / 23656.2 * 100, 3) == 0.217 and d["kerugian_pdb"]["realisasi"][0]["v"] == 0.217
    assert [x["v"] for x in d["kerugian_pdb"]["target"]][0] == 0.137
    p = d["peringatan"]["sistem_kita"]; assert len(p["per_bahaya"]) == 5 and "belum terukur" in p["jangkauan_penerima"]
    assert all(x["penduduk_terpapar"] is None or x["penduduk_terpapar"] <= p["penduduk_total"] for x in p["per_bahaya"])
    assert len(nama_prov()) >= 34
    uji_kontribusi(d["kontribusi"])
    print("iku.py --uji hijau")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    else:
        uji()
        d = bangun()
        s = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
        assert len(s) < 2_000_000
        open(KELUAR, "w", encoding="utf-8").write(s)
        print(f"{KELUAR}: {len(s)} B")
