#!/usr/bin/env python3
"""Paket `program-terbukti`: kompendium program mitigasi dan ketahanan air yang TERBUKTI (atau belum), dalam dan luar
negeri, untuk dua kajian Kepala BNPB (Okt 2026), ditambah tabel silang kelembagaan dan perencanaan BNPB.

Jalankan dari akar repo:  python3 data/kajian-bnpb/bangun/program-terbukti.py
Menulis data/kajian-bnpb/data/program-terbukti/*.csv + program-terbukti.json + kompendium.md, lalu self-check assert
(gagal = keluar non-nol). Python 3 stdlib saja, luring. Silsilah: data/kajian-bnpb/data/program-terbukti/README.md.

Masukan:
  data/raw/hukum/teks/*.json   korpus JDIH BNPB lokal: Perban 6/2025 jo. 11/2025 (OTK), Perban 5/2025 (Renstra),
                               Perban 1/2025 (Renas PB, memuat kutipan RIPB 2020-2044), Perban 7/2025 (Destana),
                               Perka 4/2012 (SPAB), Perban 2/2024 (SPDB), Juklak 4/2025 (Dana Bersama prabencana).
                               Tiap nama unit, program, sasaran, dan angka resmi DICEK ke teks ini (kutipan wajib ketemu).
  data/kajian-bnpb/tema.json   kosakata kode (status usulan, fase, jenis bencana, jenis aksi, keyakinan)
  SUMBER di bawah              dokumen web yang dibuka 23 Okt 2026; kutipan pendek disimpan per baris bukti.
Tidak ada pagu, anggaran, atau biaya proyek di keluaran (aturan kajian; dicek mesin).
"""
import csv, hashlib, json, math, os, re, sys
from collections import Counter, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P("data/kajian-bnpb/data/program-terbukti")
HUKUM = P("data/raw/hukum/teks")
TEMA = P("data/kajian-bnpb/tema.json")
TGL = "2026-10-23"
LABEL = {"resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan"}
VERIF = {"korpus-lokal": "teks JDIH di repo; kutipan dicek mesin",
         "dibuka-langsung": "dokumen dibuka 23 Okt 2026; kutipan pendek disimpan",
         "via-riset": "dikutip dari berkas riset A-D di repo; status verifikasi mengikuti berkas itu",
         "ringkasan-mesin-cari": "dokumen primer tidak dapat dibuka (403/404/terlalu besar); angka dari ringkasan mesin "
                                 "pencari, WAJIB dicek sebelum naskah final"}
KEKUATAN = {"kuat": "deret data pra-pasca resmi atau studi bertinjauan, pola konsisten lintas kejadian/lokasi",
            "sedang": "data terukur tetapi satu kejadian, tanpa pembanding terkontrol, atau hasil pemodelan terdokumentasi",
            "lemah": "laporan sendiri pelaksana atau klaim pejabat tanpa pembanding",
            "belum-terbukti": "tidak ditemukan evaluasi dampak kuantitatif"}
POSISI = ["Program (bukti kuat)", "Program dengan syarat (bukti sedang)", "Program berjalan, wajib evaluasi dampak",
          "Uji coba terukur", "Rujukan tata kelola", "Pelajaran, bukan teladan"]
JENIS_EVAL = {"peer-review", "evaluasi-independen", "data-resmi-pra-pasca", "laporan-sendiri", "pendapat-ahli",
              "model", "tidak-ada-evaluasi-dampak"}

# ============================================================================ korpus JDIH lokal

DOK = {}  # slug -> daftar (nomor halaman, teks dinormalkan, teks asli)


def norm(s):
    s = s.replace("‐", "-").replace("‑", "-").replace("­", "").replace("–", "-")
    s = re.sub(r"(?<=\w)-[ \t]*\n\s*", "-", s)  # tanda hubung di ujung baris ("Multi-\n Pihak" -> "Multi-Pihak")
    return " ".join(s.split())


def dok(slug):
    if slug not in DOK:
        d = json.load(open(os.path.join(HUKUM, slug + ".json"), encoding="utf-8"))
        DOK[slug] = [(h["n"], norm(h["t"]), h["t"]) for h in d["halaman"]]
    return DOK[slug]


def hlm(slug, kutipan):
    """Nomor halaman tempat kutipan (dinormalkan) muncul utuh; assert bila tidak ada."""
    k = norm(kutipan)
    for n, t, _ in dok(slug):
        if k in t:
            return n
    raise AssertionError(f"kutipan tidak ditemukan di {slug}: {kutipan[:90]!r}")


def token(s):
    return re.findall(r"\w+", s.lower())


def cocok(q, d):
    return q == d or (min(len(q), len(d)) >= 4 and (q.startswith(d) or d.startswith(q)))


def urut(frasa, tok, celah=30):
    """Semua kata `frasa` muncul berurutan di `tok`, tiap kata <= celah posisi dari kata sebelumnya (tabel bertumpuk kolom)."""
    q = token(frasa)

    def maju(w, p):  # kata OCR terbelah ("Kementerian/L embaga") boleh cocok dengan dua token bersambung
        for j in range(p + 1, min(len(tok), p + 1 + celah)):
            if cocok(w, tok[j]):
                return j
            if j + 1 < len(tok) and w == tok[j] + tok[j + 1]:
                return j + 1
        return None

    for s in (i for i, t in enumerate(tok) if cocok(q[0], t)):
        p, ok = s, True
        for w in q[1:]:
            j = maju(w, p)
            if j is None:
                ok = False
                break
            p = j
        if ok:
            return True
    return False


def hlm_urut(slug, frasa, dari, sampai, celah=30):
    """Halaman pertama (atau pasangan halaman bila frasa menyeberang) di rentang tempat frasa muncul berurutan."""
    hal = {n: token(t) for n, t, _ in dok(slug) if dari <= n <= sampai}
    for n in sorted(hal):
        if urut(frasa, hal[n], celah):
            return str(n)
        if n + 1 in hal and urut(frasa, hal[n] + hal[n + 1], celah):
            return f"{n}-{n + 1}"
    raise AssertionError(f"{slug} hlm {dari}-{sampai}: frasa tidak ditemukan berurutan: {frasa[:80]!r}")


def ada_token(slug, dari, sampai, nilai):
    teks = " ".join(t for n, t, _ in dok(slug) if dari <= n <= sampai)
    for v in nilai:
        assert v in teks, f"{slug} hlm {dari}-{sampai}: nilai {v!r} tidak ada di teks"


def ada_deret(slug, dari, sampai, deret):
    """Deret target lima tahun muncul berurutan dan bersambung (tanda % diabaikan, karena OCR sering memindahnya ke baris lain)."""
    teks = " ".join(t for n, t, _ in dok(slug) if dari <= n <= sampai).replace("%", "")
    teks = " ".join(teks.split())
    d = " ".join(v.rstrip("%") for v in deret)
    assert d in teks, f"{slug} hlm {dari}-{sampai}: deret target {d!r} tidak ada berurutan di teks"


def sha1(path):
    return hashlib.sha1(open(path, "rb").read()).hexdigest()


KORPUS = {"perban-nomor-6-tahun-2025": "Peraturan BNPB No. 6/2025 tentang Organisasi dan Tata Kerja BNPB (ditetapkan 6 Okt 2025)",
          "perban-nomor-11-tahun-2025": "Peraturan BNPB No. 11/2025 tentang Perubahan atas Perban 6/2025 (ditetapkan 30 Des 2025)",
          "perban-nomor-5-tahun-2025": "Peraturan BNPB No. 5/2025 tentang Renstra BNPB 2025-2029",
          "perban-nomor-1-tahun-2025": "Peraturan BNPB No. 1/2025 tentang Renas PB 2025-2029 (memuat kutipan RIPB 2020-2044)",
          "perban-nomor-7-tahun-2025": "Peraturan BNPB No. 7/2025 tentang Desa dan Kelurahan Tangguh Bencana",
          "perka-nomor-4-tahun-2012": "Perka BNPB No. 4/2012 tentang Pedoman Penerapan Sekolah/Madrasah Aman dari Bencana",
          "perban-nomor-2-tahun-2024": "Peraturan BNPB No. 2/2024 tentang Sistem Peringatan Dini Bencana",
          "juklak-nomor-4-tahun-2025": "Juklak BNPB No. 4/2025 Penelaahan, Verifikasi, dan Evaluasi Penyaluran Dana Bersama PB Tahap Prabencana"}
O6, O11, RS, RN = "perban-nomor-6-tahun-2025", "perban-nomor-11-tahun-2025", "perban-nomor-5-tahun-2025", "perban-nomor-1-tahun-2025"

# ============================================================================ (a) organisasi BNPB

# (unit, jenis, induk, status, slug, kutipan, catatan)
ORG = [
    ("Kepala BNPB", "Kepala", "", "berlaku", O6, "Badan Nasional Penanggulangan Bencana dipimpin oleh seorang Kepala.", ""),
    ("Unsur Pengarah", "Unsur pengarah", "Kepala BNPB", "berlaku", O6,
     "Unsur pengarah terdiri atas Ketua yang dijabat oleh Kepala dan 20 (dua puluh) Anggota.", "11 pejabat K/L/TNI/Polri + 9 masyarakat profesional (Pasal 10)"),
    ("Sekretariat Utama", "Sekretariat Utama", "Kepala BNPB", "berlaku", O6, "a. Sekretariat Utama; b. Deputi Bidang Sistem dan Strategi;", ""),
    ("Biro Perencanaan", "Biro", "Sekretariat Utama", "berlaku", O6, "Sekretariat Utama terdiri atas: a. Biro Perencanaan; b. Biro Keuangan;", ""),
    ("Biro Keuangan", "Biro", "Sekretariat Utama", "berlaku", O6, "a. Biro Perencanaan; b. Biro Keuangan;", ""),
    ("Biro Sumber Daya Manusia dan Umum", "Biro", "Sekretariat Utama", "berlaku", O6, "c. Biro Sumber Daya Manusia dan Umum; dan", ""),
    ("Biro Hukum, Organisasi, dan Kerja Sama", "Biro", "Sekretariat Utama", "berlaku", O6,
     "Biro Hukum, Organisasi, dan Kerja Sama mempunyai tugas", "Pasal 23 menulis 'Biro Hukum, Organisasi dan Kerja Sama' (tanpa koma)"),
    ("Bagian Rumah Tangga", "Bagian", "Biro Sumber Daya Manusia dan Umum", "berlaku", O11, "a. Bagian Rumah Tangga; b. Bagian Tata Usaha;", "Pasal 32 diubah Perban 11/2025"),
    ("Bagian Tata Usaha (Biro SDMU)", "Bagian", "Biro Sumber Daya Manusia dan Umum", "berlaku", O11, "b. Bagian Tata Usaha; c. Bagian Pengadaan Barang dan Jasa; dan", ""),
    ("Bagian Pengadaan Barang dan Jasa", "Bagian", "Biro Sumber Daya Manusia dan Umum", "berlaku", O11, "c. Bagian Pengadaan Barang dan Jasa; dan", "baru (Pasal 36A-36C Perban 11/2025)"),
    ("Deputi Bidang Sistem dan Strategi", "Deputi", "Kepala BNPB", "berlaku", O6, "b. Deputi Bidang Sistem dan Strategi;", ""),
    ("Direktorat Pemetaan dan Evaluasi Risiko Bencana", "Direktorat", "Deputi Bidang Sistem dan Strategi", "berlaku", O6,
     "Deputi Bidang Sistem dan Strategi terdiri atas: a. Direktorat Pemetaan dan Evaluasi Risiko Bencana;", "fungsi: analisis potensi bencana, ancaman, kerentanan, risiko, kapasitas (Pasal 48 c)"),
    ("Direktorat Pengembangan Strategi Penanggulangan Bencana", "Direktorat", "Deputi Bidang Sistem dan Strategi", "berlaku", O6,
     "b. Direktorat Pengembangan Strategi Penanggulangan Bencana; dan", ""),
    ("Direktorat Sistem Penanggulangan Bencana", "Direktorat", "Deputi Bidang Sistem dan Strategi", "berlaku", O6, "c. Direktorat Sistem Penanggulangan Bencana.", ""),
    ("Deputi Bidang Pencegahan", "Deputi", "Kepala BNPB", "berlaku", O6, "c. Deputi Bidang Pencegahan;", ""),
    ("Direktorat Mitigasi Bencana", "Direktorat", "Deputi Bidang Pencegahan", "berlaku", O6,
     "Deputi Bidang Pencegahan terdiri atas: a. Direktorat Mitigasi Bencana; b. Direktorat Kesiapsiagaan; dan c. Direktorat Peringatan Dini.", ""),
    ("Direktorat Kesiapsiagaan", "Direktorat", "Deputi Bidang Pencegahan", "berlaku", O6,
     "koordinasi pemberdayaan sumber daya dan penguatan ketahanan masyarakat;", "fungsi Pasal 63 d: pemberdayaan sumber daya dan ketahanan masyarakat"),
    ("Direktorat Peringatan Dini", "Direktorat", "Deputi Bidang Pencegahan", "berlaku", O6,
     "penyiapan koordinasi pengintegrasian sistem peringatan dini bencana kementerian/lembaga dan daerah;", "fungsi Pasal 66 b"),
    ("Deputi Bidang Penanganan Darurat", "Deputi", "Kepala BNPB", "berlaku", O6, "d. Deputi Bidang Penanganan Darurat;", ""),
    ("Direktorat Koordinasi Pengendalian Operasi Darurat", "Direktorat", "Deputi Bidang Penanganan Darurat", "berlaku", O11,
     "Deputi Bidang Penanganan Darurat terdiri atas: a. Direktorat Koordinasi Pengendalian Operasi Darurat;", "Pasal 70 diubah Perban 11/2025"),
    ("Direktorat Penanganan Darurat Wilayah I", "Direktorat", "Deputi Bidang Penanganan Darurat", "berlaku", O11, "b. Direktorat Penanganan Darurat Wilayah I;", ""),
    ("Direktorat Penanganan Darurat Wilayah II", "Direktorat", "Deputi Bidang Penanganan Darurat", "berlaku", O11, "c. Direktorat Penanganan Darurat Wilayah II; dan", ""),
    ("Direktorat Penanganan Darurat Wilayah III", "Direktorat", "Deputi Bidang Penanganan Darurat", "berlaku", O11, "d. Direktorat Penanganan Darurat Wilayah III.", ""),
    ("Deputi Bidang Rehabilitasi dan Rekonstruksi", "Deputi", "Kepala BNPB", "berlaku", O6, "e. Deputi Bidang Rehabilitasi dan Rekonstruksi;", ""),
    ("Direktorat Rehabilitasi dan Rekonstruksi Perumahan", "Direktorat", "Deputi Bidang Rehabilitasi dan Rekonstruksi", "berlaku", O11,
     "Deputi Bidang Rehabilitasi dan Rekonstruksi terdiri atas: a. Direktorat Rehabilitasi dan Rekonstruksi Perumahan;", "Pasal 82 diubah Perban 11/2025"),
    ("Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur", "Direktorat", "Deputi Bidang Rehabilitasi dan Rekonstruksi", "berlaku", O11,
     "b. Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur; dan", ""),
    ("Direktorat Rehabilitasi dan Rekonstruksi Sosial, Ekonomi, dan Lingkungan Hidup", "Direktorat", "Deputi Bidang Rehabilitasi dan Rekonstruksi", "berlaku", O11,
     "c. Direktorat Rehabilitasi dan Rekonstruksi Sosial, Ekonomi, dan Lingkungan Hidup.", ""),
    ("Deputi Bidang Logistik dan Peralatan", "Deputi", "Kepala BNPB", "berlaku", O6, "f. Deputi Bidang Logistik dan Peralatan; dan", ""),
    ("Direktorat Pengelolaan Logistik dan Peralatan", "Direktorat", "Deputi Bidang Logistik dan Peralatan", "berlaku", O6,
     "Deputi Bidang Logistik dan Peralatan terdiri atas: a. Direktorat Pengelolaan Logistik dan Peralatan; dan b. Direktorat Optimasi Jaringan Logistik dan Peralatan.", ""),
    ("Direktorat Optimasi Jaringan Logistik dan Peralatan", "Direktorat", "Deputi Bidang Logistik dan Peralatan", "berlaku", O6,
     "b. Direktorat Optimasi Jaringan Logistik dan Peralatan.", "tugas diubah Pasal 98 Perban 11/2025 (kemitraan dan layanan digital)"),
    ("Inspektorat Utama", "Inspektorat Utama", "Kepala BNPB", "berlaku", O6, "g. Inspektorat Utama.", ""),
    ("Inspektorat I", "Inspektorat", "Inspektorat Utama", "berlaku", O6, "Inspektorat Utama terdiri atas: a. Inspektorat I; b. Inspektorat II; c. Inspektorat III; dan d. Bagian Tata Usaha.",
     "mengawasi Deputi Sistem dan Strategi, Deputi Pencegahan, Deputi RR, Pusdatinkom (Pasal 104)"),
    ("Inspektorat II", "Inspektorat", "Inspektorat Utama", "berlaku", O6, "b. Inspektorat II;",
     "mengawasi Sestama, Deputi PD, Deputi Logpal, Pusdiklat, dan 'Pusat Pengendalian Operasi' (Pasal 106, tidak ikut diubah)"),
    ("Inspektorat III", "Inspektorat", "Inspektorat Utama", "berlaku", O6, "c. Inspektorat III; dan", ""),
    ("Bagian Tata Usaha (Inspektorat Utama)", "Bagian", "Inspektorat Utama", "berlaku", O6, "d. Bagian Tata Usaha.", ""),
    ("Pusat Data, Informasi, dan Komunikasi Kebencanaan", "Pusat", "Kepala BNPB", "berlaku", O6,
     "Pusat Data, Informasi, dan Komunikasi Kebencanaan mempunyai tugas", ""),
    ("Pusat Pendidikan dan Pelatihan Penanggulangan Bencana", "Pusat", "Kepala BNPB", "berlaku", O6,
     "Pusat Pendidikan dan Pelatihan Penanggulangan Bencana mempunyai tugas", ""),
    ("Pusat Pembinaan Jabatan Fungsional Kebencanaan", "Pusat", "Kepala BNPB", "berlaku", O11,
     "Pusat Pembinaan Jabatan Fungsional Kebencanaan mempunyai tugas", "menggantikan Paragraf 12 Pusat Pengendalian Operasi (Perban 11/2025 angka 31-35)"),
    # unit lama yang diganti Perban 11/2025: tetap dicatat karena Renstra 2025-2029 masih memakai namanya
    ("Direktorat Dukungan Sumber Daya Darurat", "Direktorat", "Deputi Bidang Penanganan Darurat", "diganti Perban 11/2025", O6, "a. Direktorat Dukungan Sumber Daya Darurat;", ""),
    ("Direktorat Dukungan Infrastruktur Darurat", "Direktorat", "Deputi Bidang Penanganan Darurat", "diganti Perban 11/2025", O6, "b. Direktorat Dukungan Infrastruktur Darurat; dan", ""),
    ("Direktorat Fasilitasi Penanganan Korban dan Pengungsi", "Direktorat", "Deputi Bidang Penanganan Darurat", "diganti Perban 11/2025", O6,
     "Direktorat Fasilitasi Penanganan Korban dan Pengungsi mempunyai tugas", ""),
    ("Direktorat Perencanaan Rehabilitasi dan Rekonstruksi", "Direktorat", "Deputi Bidang Rehabilitasi dan Rekonstruksi", "diganti Perban 11/2025", O6,
     "a. Direktorat Perencanaan Rehabilitasi dan Rekonstruksi;", ""),
    ("Direktorat Pemulihan dan Peningkatan Fisik", "Direktorat", "Deputi Bidang Rehabilitasi dan Rekonstruksi", "diganti Perban 11/2025", O6,
     "b. Direktorat Pemulihan dan Peningkatan Fisik; dan", ""),
    ("Direktorat Pemulihan dan Peningkatan Sosial, Ekonomi, dan Sumber Daya Alam", "Direktorat", "Deputi Bidang Rehabilitasi dan Rekonstruksi", "diganti Perban 11/2025", O6,
     "c. Direktorat Pemulihan dan Peningkatan Sosial, Ekonomi, dan Sumber Daya Alam.", ""),
    ("Pusat Pengendalian Operasi", "Pusat", "Kepala BNPB", "diganti Perban 11/2025", O6, "Pusat Pengendalian Operasi mempunyai tugas", ""),
]
# Wilayah kerja tiga Direktorat Penanganan Darurat (Pasal 74, 77, 79A Perban 11/2025)
WIL_PD = {
    "Direktorat Penanganan Darurat Wilayah I": "penanganan darurat di Provinsi Aceh, Provinsi Riau, Provinsi Kepulauan Riau, Provinsi Jawa Tengah, Provinsi Daerah Istimewa Yogyakarta, Provinsi Bali, Provinsi Kalimantan Tengah, Provinsi Kalimantan Utara, Provinsi Sulawesi Tenggara, Provinsi Sulawesi Tengah, Provinsi Maluku Utara, Provinsi Papua, dan Provinsi Papua Selatan.",
    "Direktorat Penanganan Darurat Wilayah II": "penanganan darurat di Provinsi Sumatera Utara, Provinsi Jambi, Provinsi Sumatera Selatan, Provinsi Lampung, Provinsi Daerah Khusus Jakarta, Provinsi Banten, Provinsi Jawa Barat, Provinsi Nusa Tenggara Barat, Provinsi Kalimantan Timur, Daerah Ibu Kota Nusantara, Provinsi Sulawesi Utara, Provinsi Gorontalo, Provinsi Papua Barat, dan Provinsi Papua Tengah.",
    "Direktorat Penanganan Darurat Wilayah III": "penanganan darurat di Provinsi Bengkulu, Provinsi Sumatera Barat, Provinsi Kepulauan Bangka Belitung, Provinsi Jawa Timur, Provinsi Kalimantan Barat, Provinsi Kalimantan Selatan, Provinsi Sulawesi Selatan, Provinsi Sulawesi Barat, Provinsi Nusa Tenggara Timur, Provinsi Maluku, Provinsi Papua Barat Daya, dan Provinsi Papua Pegunungan.",
}
JAWA = {"Daerah Khusus Jakarta", "Jawa Barat", "Jawa Tengah", "Daerah Istimewa Yogyakarta", "Jawa Timur", "Banten"}

# ============================================================================ (a) Renstra BNPB 2025-2029 (Perban 5/2025)

RENSTRA_PROGRAM = [  # (kode, program, sasaran program, [(indikator, baseline, [t2025..t2029])], unit eselon I)
    ("1", "Program Pengembangan Sistem dan Strategi Penanggulangan Bencana",
     "Meningkatnya Sinkronisasi Pengembangan Sistem dan Strategi Penanggulangan Bencana Secara Terpadu dan Inovatif",
     [("Persentase rekomendasi kebijakan sistem dan strategi yang di integrasikan oleh K/L/D ke dalam rencana pembangunan/sektoral",
       "82,35%", ["87,06%", "90,59%", "94,12%", "97,65%", "100%"])], "Deputi Bidang Sistem dan Strategi"),
    ("2", "Program Ketangguhan Masyarakat terhadap Bencana",
     "Meningkatnya kualitas masyarakat yang Tangguh terhadap Bencana di Kawasan Berisiko Bencana",
     [("Persentase cakupan layanan peringatan dini di daerah berisiko bencana", "N/A", ["6,10%", "6,17%", "6,21%", "6,26%", "6,32%"]),
      ("Persentase desa berketahanan bencana multipihak", "N/A", ["10,49%", "10,75%", "11,07%", "11,46%", "11,74%"]),
      ("Persentase cakupan layanan mitigasi bencana di daerah berisiko bencana", "N/A", ["7,39%", "10,12%", "13,04%", "15,95%", "18,87%"])],
     "Deputi Bidang Pencegahan"),
    ("3", "Program Manajemen Penanganan Darurat Bencana", "Meningkatnya kualitas Manajemen Penanganan Darurat pada Saat Kejadian Bencana",
     [("Persentase Daerah yang menetapkan status keadaan darurat bencana dan menerima intervensi sesuai standar", "N/A", ["100%"] * 5)],
     "Deputi Bidang Penanganan Darurat"),
    ("4", "Program Rehabilitasi dan Rekonstruksi Pascabencana",
     "Meningkatnya Kualitas Layanan Pemulihan Pascabencana Sektor Permukiman, Infrastruktur, Sosial, Ekonomi dan Lintas Sektor",
     [("Persentase Daerah pasca bencana masif yang ditangani", "N/A", ["100%"] * 5)], "Deputi Bidang Rehabilitasi dan Rekonstruksi"),
    ("5", "Program Logistik dan Peralatan", "Meningkatnya Ketahanan Logistik dan Peralatan yang Berkelanjutan dalam Mendukung PB Berdasarkan Wilayah",
     [("Persentase Daerah yang difasilitasi Logistik dan Peralatan PB serta Sumber Daya Manusia yang Mampu Mengelola", "N/A", ["35%", "45%", "55%", "65%", "75%"])],
     "Deputi Bidang Logistik dan Peralatan"),
    ("6", "Program Koordinasi, Pembinaan, dan Dukungan Tata Kelola (Dukungan Manajemen)",
     "Meningkatnya Kualitas Tata Kelola Penyelenggaraan Penanggulangan Bencana yang Profesional, Akuntabel dan Transparan",
     [("Nilai Reformasi Birokrasi", "77,18", ["77,18", "77,50", "78", "78,50", "79"])], "Sekretariat Utama"),
    ("7", "Program Pengawasan (Dukungan Manajemen)", "Meningkatnya Pengawasan yang Akuntabel dan Transparan",
     [("Skor Kapabilitas APIP", "3,04", ["3,05", "3,1", "3,15", "3,2", "3,25"]),
      ("Persentase Tindak Lanjut Hasil Pemeriksaan BPK RI", "75%", ["75%"] * 5),
      ("Persentase Pelaksanaan Tindak Lanjut Pengaduan Masyarakat", "100%", ["100%"] * 5),
      ("Persentase Tindak Lanjut Hasil Pengawasan APIP", "40%", ["46%", "52%", "58%", "64%", "70%"])], "Inspektorat Utama"),
]
RENSTRA_SS = [  # sasaran strategis (Tabel 4.5, hlm. 132)
    ("SS1", "Resiliensi Terhadap Bencana", "Persentase Penurunan Nilai Indeks Risiko Bencana Nasional", "", ["1,2%"] * 5),
    ("SS1", "Resiliensi Terhadap Bencana", "Persentase Daerah yang memiliki tingkat kapasitas penanggulangan bencana minimal kategori sedang", "",
     ["67%", "73%", "79%", "85%", "90%"]),
    ("SS2", "Meningkatnya Kualitas Tata Kelola BNPB", "Indeks Reformasi Birokrasi", "77,18", ["77,18", "77,50", "78", "78,50", "79"]),
]
# Sasaran kegiatan eselon II (Tabel 4.7, hlm. 134-137). Nama unit sesuai Renstra (merujuk OTK lama Perban 4/2019).
RENSTRA_SK = [  # (program, unit renstra, sasaran kegiatan, indikator, [t2025..t2029], potongan teks OCR bila urutan kolom terbalik)
    ("1", "Direktorat Pemetaan dan Evaluasi Risiko Bencana", "Meningkatnya Kualitas Pemetaan dan Evaluasi Risiko Bencana",
     "Persentase Rekomendasi kebijakan dan dukungan teknis di lingkup pemetaan dan evaluasi risiko bencana yang dimanfaatkan oleh K/L dan atau Pemerintah daerah", ["100%"] * 5, None),
    ("1", "Direktorat Pengembangan Strategi Penanggulangan Bencana", "Meningkatnya Kualitas Pengembangan Strategi Penanggulangan Bencana",
     "Persentase Rekomendasi Kebijakan dan dukungan teknis di Lingkup Pengembangan Strategi PB yang dimanfaatkan oleh Kementerian/Lembaga dan atau Pemerintah Daerah", ["100%"] * 5, None),
    ("1", "Direktorat Sistem Penanggulangan Bencana", "Meningkatnya Kualitas Pengembangan Sistem Penanggulangan Bencana",
     "Persentase Rekomendasi Kebijakan dan dukungan teknis di lingkup Sistem PB yang dimanfaatkan oleh Kementerian/Lembaga dan atau Pemerintah Daerah", ["100%"] * 5, None),
    ("1", "Pusat Data, Informasi, dan Komunikasi Kebencanaan", "Meningkatnya Kualitas Layanan Bidang Data, Informasi dan Komunikasi Penanggulangan Bencana",
     "Persentase Penyampaian layanan informasi kejadian bencana ke publik kurang dari 2 jam", ["100%"] * 5, None),
    ("2", "Direktorat Peringatan Dini", "Meningkatnya Layanan Sistem Peringatan Dini Bencana",
     "Persentase layanan sistem diseminasi peringatan dini bencana berbasis sirine yang memadai", ["6,09%", "6,14%", "6,18%", "6,23%", "6,29%"], ["6,14% 6,09% 6,18% 6,23% 6,29%"]),
    ("2", "Direktorat Peringatan Dini", "Meningkatnya Layanan Sistem Peringatan Dini Bencana",
     "Persentase layanan pembangunan sistem diseminasi peringatan dini bencana berbasis sistem informasi yang memadai", ["16,67%", "33,33%", "50%", "83,3%", "100%"], None),
    ("2", "Direktorat Mitigasi Bencana", "Meningkatnya daerah prioritas hasil kajian risiko bencana yang difasilitasi upaya mitigasi bencana",
     "Persentase daerah prioritas hasil kajian risiko bencana yang difasilitasi upaya mitigasi bencana", ["6,40%", "14,53%", "23,26%", "31,98%", "40,70%"], ["6,40%", "14,53% 23,26% 31,98% 40,70%"]),
    ("2", "Direktorat Kesiapsiagaan", "Meningkatnya daerah yang memiliki dokumen rencana aksi kesiapsiagaan",
     "Persentase daerah yang memiliki dokumen rencana aksi kesiapsiagaan", ["4,27%", "4,61%", "4,95%", "5,39%", "5,82%"], None),
    ("2", "Direktorat Kesiapsiagaan", "Meningkatnya daerah yang memiliki forum pengurangan risiko bencana lembaga usaha dan komunitas",
     "Persentase daerah yang memiliki forum pengurangan risiko bencana Lembaga Usaha dan Komunitas", ["14,30%", "14,49%", "15,58%", "16,67%", "17,75%"], None),
    ("2", "Direktorat Kesiapsiagaan", "Meningkatnya daerah yang memiliki desa tangguh bencana",
     "Persentase daerah yang memiliki Desa tangguh Bencana", ["2,58%", "2,61%", "2,77%", "2,99%", "3,26%"], None),
    ("3", "Direktorat Dukungan Sumber Daya Darurat", "Meningkatnya Dukungan Sumber Daya Saat Keadaan Darurat Bencana",
     "Persentase Daerah yang mendapatkan dukungan sumber daya darurat pada saat keadaan darurat bencana", ["100%"] * 5, None),
    ("3", "Direktorat Dukungan Infrastruktur Darurat", "Meningkatnya Dukungan Fasilitasi dan Pengelolaan Pemulihan dengan Segera Prasarana dan Sarana Vital pada Saat Keadaan Darurat Bencana",
     "Persentase Daerah yang mendapatkan Fasilitasi Dukungan dan Pengelolaan Pemulihan dengan Segera Prasarana dan Sarana Vital", ["100%"] * 5, None),
    ("3", "Direktorat Fasilitasi Penanganan Korban dan Pengungsi", "Meningkatnya Kegiatan Fasilitasi Penanganan Korban dan Pengungsi",
     "Persentase Daerah yang mendapat Fasilitasi Penanganan Korban dan Pengungsi pada Keadaan darurat Bencana", ["100%"] * 5, None),
    ("3", "Pusat Pengendalian Operasi", "Meningkatnya Layanan Pusat Pengendalian Operasi sesuai standar",
     "Persentase daerah yang mengaktivasi posko pada saat penetapan status keadaan darurat bencana", ["15%", "20%", "25%", "30%", "35%"], None),
    ("4", "Direktorat Perencanaan Rehabilitasi dan Rekonstruksi", "Meningkatnya Layanan Perencanaan Rehabilitasi dan Rekonstruksi Pascabencana",
     "Persentase daerah terdampak bencana yang mendapatkan pendampingan perencanaan rehabilitasi dan rekonstruksi pascabencana", ["80%", "85%", "90%", "95%", "100%"], None),
    ("4", "Direktorat Perencanaan Rehabilitasi dan Rekonstruksi", "Meningkatnya Layanan Perencanaan Rehabilitasi dan Rekonstruksi Pascabencana",
     "Persentase Daerah yang mendapatkan rekomendasi bantuan pendanaan pascabencana", ["50%", "55%", "60%", "65%", "70%"], None),
    ("4", "Direktorat Pemulihan dan Peningkatan Sosial, Ekonomi, dan Sumber Daya Alam", "Meningkatnya Layanan Pemulihan dan Peningkatan Sosial Ekonomi, Sumber Daya Alam dan Lingkungan",
     "Persentase kelompok masyarakat terdampak bencana masif yang mendapatkan pendampingan pemulihan sosial ekonomi dan sumber daya alam sesuai dengan kebutuhan", ["60%", "65%", "70%", "75%", "80%"], None),
    ("4", "Direktorat Pemulihan dan Peningkatan Fisik", "Meningkatnya Layanan Rehabilitasi dan Rekonstruksi Bidang Pemulihan dan Peningkatan Fisik",
     "Persentase Daerah yang melaksanakan pemulihan fisik dengan baik sesuai standar", ["70%", "75%", "80%", "85%", "90%"], None),
    ("5", "Direktorat Pengelolaan Logistik dan Peralatan", "Terfasilitasinya pemenuhan logistik di Daerah", "Persentase daerah yang di fasilitasi logistik", ["75%"] * 5, None),
    ("5", "Direktorat Pengelolaan Logistik dan Peralatan", "Terfasilitasinya pemenuhan peralatan di Daerah", "Persentase daerah yang di fasilitasi peralatan", ["35%", "45%", "55%", "65%", "75%"], None),
    ("5", "Direktorat Pengelolaan Logistik dan Peralatan", "Tersedianya SDM pengelola logistik dan peralatan", "Persentase ketersediaan SDM Pengelola Logistik dan Peralatan", ["35%", "45%", "55%", "65%", "75%"], None),
    ("5", "Direktorat Optimasi Jaringan Logistik dan Peralatan", "Terpenuhinya layanan distribusi logistik dan peralatan",
     "Persentase logistik dan peralatan yang terdistribusi ke daerah", ["100%"] * 5, None),
    ("5", "Direktorat Optimasi Jaringan Logistik dan Peralatan", "Meningkatnya layanan Kemitraan Logistik dan Peralatan",
     "Persentase layanan kemitraan terkait logistik dan peralatan", ["35%", "45%", "55%", "65%", "75%"], None),
    ("6", "Pusat Pendidikan dan Pelatihan Penanggulangan Bencana", "Meningkatnya Sumber Daya Manusia Penanggulangan Bencana berdasarkan kompetensi",
     "Persentase sumber daya manusia daerah rawan bencana yang difasilitasi pendidikan dan pelatihan teknis", ["64%", "78%", "80%", "87%", "96%"], None),
]
# Pemetaan nama unit Renstra (OTK lama) -> unit OTK berlaku. Tidak ada pasal peralihan yang memetakan satu-satu.
PETA_UNIT_LAMA = {
    "Direktorat Dukungan Sumber Daya Darurat": "tidak dipetakan eksplisit; fungsi komando darurat kini per wilayah (Direktorat Penanganan Darurat Wilayah I-III, Pasal 75/78/79B Perban 11/2025)",
    "Direktorat Dukungan Infrastruktur Darurat": "tidak dipetakan eksplisit (lihat Direktorat Penanganan Darurat Wilayah I-III)",
    "Direktorat Fasilitasi Penanganan Korban dan Pengungsi": "tidak dipetakan eksplisit (lihat Direktorat Penanganan Darurat Wilayah I-III)",
    "Pusat Pengendalian Operasi": "paragrafnya diganti Pusat Pembinaan Jabatan Fungsional Kebencanaan; fungsi pengendalian operasi diduga ke Direktorat Koordinasi Pengendalian Operasi Darurat (dugaan dari nama)",
    "Direktorat Perencanaan Rehabilitasi dan Rekonstruksi": "tidak dipetakan eksplisit; tiap Direktorat RR baru memegang fungsi 'perencanaan' sektornya (Pasal 84/87/90 a Perban 11/2025)",
    "Direktorat Pemulihan dan Peningkatan Sosial, Ekonomi, dan Sumber Daya Alam": "Direktorat Rehabilitasi dan Rekonstruksi Sosial, Ekonomi, dan Lingkungan Hidup (padanan terdekat)",
    "Direktorat Pemulihan dan Peningkatan Fisik": "Direktorat Rehabilitasi dan Rekonstruksi Perumahan dan Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur (dipecah)",
}

# ============================================================================ (a) Renas PB 2025-2029 (Perban 1/2025)

RENAS_SASARAN = {
    "1": "Mengurangi Jumlah Penduduk Terdampak Bencana melalui Peningkatan Kualitas Kesiapsiagaan, Peringatan Dini, dan Penanggulangan Kedaruratan Bencana",
    "2": "Mengurangi Dampak Kerusakan dan Kerugian Akibat Bencana melalui Peningkatan Efektivitas Upaya Pencegahan, Mitigasi Bencana dan Adaptasi Perubahan Iklim",
    "3": "Meningkatkan Daya Lenting di Daerah Terdampak melalui Peningkatan Percepatan Rehabilitasi dan Rekonstruksi",
    "4": "Meningkatkan Pelayanan dan Kapasitas Penanggulangan Bencana melalui Transformasi Tata Kelola Kolaborasi Multi Pihak",
}
RENAS_STRATEGI = {
    "1.1": "Meningkatkan Aksesibilitas Layanan dan Efektivitas Pengelolaan Sistem Peringatan Dini",
    "1.2": "Meningkatkan Investasi dan Kapasitas Sumber Daya dalam Kesiapsiagaan dan Penanggulangan Kedaruratan Bencana",
    "1.3": "Meningkatkan Kesiapan dan Keandalan Logistik Serta Peralatan Untuk Penanggulangan Kedaruratan Bencana",
    "1.4": "Meningkatkan Keterbukaan Data dan Informasi serta Literasi Kebencanaan Untuk Ketangguhan Masyarakat dan Lembaga Usaha",
    "2.1": "Meningkatkan Investasi Publik dan Lembaga Usaha Berketahanan Bencana & Perubahan Iklim",
    "2.2": "Meningkatkan Pengembangan Pusat Pertumbuhan, Perdesaan, dan Kawasan Investasi Berketahanan Bencana & Perubahan Iklim",
    "2.3": "Meningkatkan Kepatuhan Terhadap/Kesesuaian Tata Ruang Darat dan Laut Serta Ketangguhan dan Keandalan Bangunan Gedung",
    "2.4": "Meningkatkan Pelindungan Ekosistem Laut dan Pesisir Yang Berisiko Bencana",
    "2.5": "Meningkatkan Pemanfaatan Skema Perlindungan Aset dan Transfer Risiko Bencana oleh Masyarakat & Lembaga Usaha",
    "3.1": "Meningkatkan Kualitas Perencanaan dan Percepatan Pelaksanaan Rehabilitasi dan Rekonstruksi Pascabencana Berbasis Tata Ruang dan Pengurangan Risiko Bencana",
    "3.2": "Meningkatkan Keterlibatan dan Sinergi Multipihak untuk Mempercepat Rehabilitasi dan Rekonstruksi Pasca Bencana pada Seluruh Aspek Secara Efektif",
    "4.1": "Membangun Sistem Regulasi yang Handal dan Terpadu dalam Mendukung Kinerja Sistem Penanggulangan Bencana",
    "4.2": "Meningkatkan Capaian Penerapan SPM Sub Urusan Bencana",
    "4.3": "Meningkatkan Ketersediaan SDM yang Memiliki Keahlian dan Profesional di Bidang Kebencanaan",
    "4.4": "Menciptakan Lingkungan yang Kondusif untuk Menumbuhkembangkan Industrialisasi Kebencanaan",
    "4.5": "Meningkatkan Kolaborasi dalam Membangun Ketangguhan Individu, Keluarga, dan Masyarakat",
    "4.6": "Mengembangkan Skema Pendanaan Inovatif dalam Penanggulangan Bencana",
    "4.7": "Meningkatkan Kualitas Pemantauan, Pengendalian, dan Evaluasi Penanggulangan Bencana",
    "4.8": "Meningkatkan Advokasi Resiliensi Berkelanjutan di Tingkat Nasional & Global",
}
# kode -> (nama program di Tabel 3.1 Rencana Aksi, fokus capaian RIPB menurut Tabel 2.9)
RENAS_PROGRAM = {
    "1.1.1": ("Pengembangan dan Pemanfaatan MHEWS", 3),
    "1.1.2": ("Penguatan Implementasi Pengamatan dan Diseminasi Peringatan Dini Bencana", 3),
    "1.2.1": ("Penguatan Kesiapsiagaan dan Kesiagaan Menghadapi Kedaruratan Bencana dan Krisis Kesehatan", 7),
    "1.2.2": ("Penguatan Sumber Daya untuk Operasi Pencarian, Pertolongan, dan Evakuasi Korban Bencana", 7),
    "1.2.3": ("Penguatan Kapasitas SDM dalam Kesiapsiagaan dan Penanganan Kedaruratan", 7),
    "1.2.4": ("Riset dan Pengembangan Terkait Peningkatan Kesiapsiagaan Bencana", 7),
    "1.3.1": ("Pemenuhan Kebutuhan Logistik dan Peralatan Kesiapsiagaan", 7),
    "1.3.2": ("Pembangunan Gudang dan Pemenuhan Logistik Dan Peralatan", 7),
    "1.3.3": ("Pengembangan Sistem Logistik dan Peralatan Kebencanaan", 7),
    "1.4.1": ("Pembangunan satu data bencana terintegrasi", 6),
    "1.4.2": ("Peningkatan Diseminasi Data dan Informasi Kebencanaan Untuk Masyarakat", 6),
    "2.1.1": ("Pengembangan Rumah Sakit dan Fasilitas Kesehatan Aman Bencana", 12),
    "2.1.2": ("Pembangunan Fasilitas Publik Tangguh Bencana", 12),
    "2.1.3": ("Riset dan Pengembangan Teknologi Infrastruktur Tahan Bencana dan Perubahan Iklim", 2),
    "2.2.1": ("Pembangunan IKN Berketahanan Bencana dan Perubahan Iklim", 4),
    "2.2.2": ("Pengembangan Kawasan Perkotaan dan Perdesaan Berketahanan Bencana dan Perubahan Iklim", 4),
    "2.2.3": ("Pengembangan Investasi di Kawasan Strategis Ekonomi Berketahanan Bencana dan Perubahan Iklim", 4),
    "2.3.1": ("Peningkatan Kepatuhan/Kesesuaian Tata Ruang", 8),
    "2.3.2": ("Peningkatan Kualitas Rencana Tata Ruang", 8),
    "2.3.3": ("Peningkatan Kualitas Pengelolaan DAS, Hutan, dan Lahan", 8),
    "2.3.4": ("Peningkatan Ketangguhan dan Keandalan Bangunan Gedung", 8),
    "2.4.1": ("Pelindungan Ekosistem Pesisir dengan Solusi Berbasis Alam (Nature-Based Solution)", 9),
    "2.4.2": ("Pembangunan Bangunan Pengaman Pantai", 9),
    "2.4.3": ("Peningkatan Partisipasi Masyarakat dalam Pelindungan Ekosistem Laut dan Pesisir", 9),
    "2.4.4": ("Peningkatan Mitigasi dan Adaptasi Subsiden Tanah", 9),
    "2.5.1": ("Peningkatan Perlindungan Aset Penghidupan Masyarakat terhadap Risiko Bencana", 4),
    "3.1.1": ("Penguatan Kapasitas SDM untuk Perencanaan Rehabilitasi dan Rekonstruksi", 11),
    "3.1.2": ("Percepatan Pelaksanaan Rehabilitasi dan Rekonstruksi", 11),
    "3.2.1": ("Penguatan Keterlibatan dan Sinergi Multipihak dalam Rehabilitasi dan Rekonstruksi Pascabencana", 11),
    "4.1.1": ("Penguatan Sistem Regulasi untuk Penanggulangan Bencana", 1),
    "4.1.2": ("Pengarusutamaan KRB dan RPB dalam Rencana Pembangunan", 1),
    "4.2.1": ("Penguatan Penerapan SPM Sub Urusan Bencana", 5),
    "4.3.1": ("Peningkatan Kapasitas SDM Penanggulangan Bencana", 10),
    "4.3.2": ("Pengembangan Standarisasi Kompetensi Bidang Kebencanaan", 10),
    "4.4.1": ("Peningkatan Keterlibatan Multi Pihak dalam Industrialisasi Kebencanaan", 2),
    "4.5.1": ("Peningkatan Ketangguhan Berbasis Komunitas", 4),
    "4.5.2": ("Pengembangan Pendidikan & Edukasi Kebencanaan Bagi Masyarakat", 6),
    "4.6.1": ("Pengembangan Skema Perlindungan Sosial Adaptif", 4),
    "4.6.2": ("Optimasi Pemanfaatan Dana Bersama Penanggulangan Bencana", 4),
    "4.6.3": ("Pengembangan Kebijakan Asuransi Bencana Dan Pembiayaan Risiko", 4),
    "4.7.1": ("Pengembangan Sistem Pemantauan dan Evaluasi Penanggulangan Bencana", 5),
    "4.8.1": ("Pengembangan Kebijakan dan Kerangka Hukum untuk Resiliensi Berkelanjutan", 5),
    "4.8.2": ("Peningkatan Kapasitas dan Pengetahuan tentang Resiliensi Berkelanjutan", 5),
    "4.8.3": ("Penguatan Kerja Sama dan Kemitraan untuk Resiliensi Berkelanjutan", 5),
}
RENAS_KEBIJAKAN = [
    "Penguatan Kerangka Regulasi untuk Mewujudkan Sistem Penanggulangan Bencana yang Efisien dan Efektif",
    "Penguatan Kelembagaan, Pendanaan, dan Peningkatan Kolaborasi Multi-Pihak dalam Penanggulangan Bencana",
    "Penguatan Investasi Pengelolaan Risiko Bencana",
    "Peningkatan Ketangguhan Masyarakat dan Lembaga Usaha dalam Menghadapi Bencana",
    "Peningkatan Kapasitas dan Kapabilitas dalam Kesiapsiagaan dan Penanganan Kedaruratan",
    "Peningkatan Kualitas Rehabilitasi dan Rekonstruksi Pascabencana",
]

# ============================================================================ (b) RIPB 2020-2044 (dikutip Renas PB hlm. 13-16)

RIPB_SASARAN = [
    "Terwujudnya kerangka peraturan perundang-undangan yang kuat dan keterpaduan kelembagaan yang adaptif dalam penanggulangan bencana.",
    "Tercapainya peningkatan investasi kesiapsiagaan dan pengelolaan risiko bencana sesuai dengan proyeksi peningkatan risiko bencana.",
    "Terwujudnya peningkatan kualitas tata kelola penanggulangan bencana yang profesional, transpararan, dan akuntabel.",
    "Terwujudnya penanganan darurat bencana yang cepat dan andal.",
    "Tercapainya pemulihan infrastruktur, pelayanan publik, dan penghidupan masyarakat pascabencana yang lebih baik dan lebih aman",
]
RIPB_KEBIJAKAN = [
    "Penguatan peraturan perundang-undangan penanggulangan bencana yang efektif dan efisien.",
    "Peningkatan sinergi antar kementerian/lembaga dan pemangku kepentingan dalam penanggulangan bencana.",
    "Penguatan investasi pengelolaan risiko bencana sesuai dengan proyeksi peningkatan risiko bencana dengan memperhatikan tata ruang dan penataan kawasan.",
    "Penguatan tata kelola penanggulangan bencana yang semakin profesional, transparan, dan akuntabel.",
    "Peningkatan kapasitas dan kapabilitas penanganan kedaruratan bencana yang cepat dan andal.",
    "Percepatan pemulihan pascabencana pada daerah dan masyarakat terdampak bencana untuk membangun kehidupan yang lebih baik.",
]
RIPB_STRATEGI = {  # kebijakan -> [(huruf, strategi)] (Renas Tabel 1.2, hlm. 14-16)
    1: [("a", "Meningkatkan kualitas perangkat peraturan perundang-undangan dan implementasi dalam penanggulangan bencana yang adaptif dan berkelanjutan."),
        ("b", "Meningkatkan kualitas NSPK penanggulangan bencana")],
    2: [("a", "Meningkatkan koordinasi dan kerja sama antar Kementerian/Lembaga, pemerintah daerah, TNI, Polri, akademisi, lembaga usaha, masyarakat, media, dan pemangku kepentingan lainnya dalam penanggulangan bencana."),
        ("b", "Mewujudkan dan meningkatkan sistem peringatan dini, data, dan layanan informasi kebencanaan yang terpadu dan berkesinambungan berdasarkan prinsip-prinsip kebijakan satu peta dan satu data.")],
    3: [("a", "Melaksanakan dan mengembangkan program kesiapsiagaan dan pengelolaan risiko bencana dengan memperhatikan tata ruang dan penataan kawasan."),
        ("b", "Meningkatkan investasi dan pemanfaatan berbagai skema pendanaan inovatif termasuk transfer risiko untuk penanggulangan bencana."),
        ("c", "Mengoptimalkan pendanaan secara terpadu untuk penanggulangan bencana.")],
    4: [("a", "Meningkatkan kapasitas dan profesionalisme para penyelenggaraan dan pelaku penanggulangan bencana."),
        ("b", "Mengoptimalkan pelaksanaan standar pelayanan minimal penanggulangan bencana."),
        ("c", "Meningkatkan keterbukaan informasi dan komunikasi, kualitas sistem perencanaan, serta pemantauan dan evaluasi dalam penanggulangan bencana."),
        ("d", "Mendorong pelibatan pemangku kepentingan dalam tata kelola penanggulangan bencana untuk meningkatkan akuntabilitas."),
        ("e", "Mewujudkan kabupaten/kota, desa/kelurahan, dan masyarakat tangguh bencana."),
        ("f", "Mewujudkan sarana dan prasarana yang tangguh terhadap bencana."),
        ("g", "Meningkatkan edukasi kebencanaan dan pengelolaan pengetahuan penanggulangan bencana kepada masyarakat dan pemangku kepentingan.")],
    5: [("a", "Meningkatkan kuantitas dan kualitas sumber daya manusia dalam penanganan darurat bencana."),
        ("b", "Meningkatkan kesiapan dan keandalan logistik dan peralatanan penanganan darurat bencana."),
        ("c", "Mengoptimalkan pengelolaan bantuan masyarakat dalam penanganan darurat bencana."),
        ("d", "Menguatkan kualitas kelembagaan dan penggunaan ilmu pengetahuan & teknologi."),
        ("e", "Mempercepat pemulihan sarana dan prasarana vital.")],
    6: [("a", "Mengoptimalkan perencanaan rehabilitasi dan rekonstruksi pascabencana berdasarkan tata ruang yang peka risiko bencana."),
        ("b", "Meningkatkan kualitas penghidupan masyarakat terdampak bencana yang lebih baik."),
        ("c", "Mewujudkan infrastruktur, perumahan, dan permukiman berketahanan bencana."),
        ("d", "Meningkatkan kualitas pemulihan sosial ekonomi, sumber daya alam, dan lingkungan hidup.")],
}
RIPB_FOKUS = {
    1: "Terwujudnya peraturan perundang-undangan yang harmonis di bidang penanggulangan bencana",
    2: "Terwujudnya kemandirian teknologi dan industrialisasi kebencanaan",
    3: "Terwujudnya kemudahan akses layanan peringatan dini terpadu multi ancaman",
    4: "Terwujudnya investasi yang memadai dalam pengurangan risiko bencana untuk ketangguhan",
    5: "Terwujudnya tata kelola risiko bencana yang sinergis antara pusat dan daerah",
    6: "Terwujudnya pemahaman terhadap risiko bencana, bentang alam, dan adaptasi perubahan iklim, serta ketahanan sosial dan ketahanan kesehatan masyarakat",
    7: "Terwujudnya penanganan darurat bencana secara cepat, efektif, dan terkoordinasi",
    8: "Terwujudnya penataan ruang dan permukiman serta perencanaan perkotaan yang terpadu terhadap ketahanan bencana dan adaptasi perubahan iklim, serta ketahanan sosial, dan ketahanan kesehatan masyarakat",
    9: "Terwujudnya pelindungan ekosistem laut dan pesisir yang berisiko bencana",
    10: "Tersedianya sumber daya manusia yang memiliki keahlian dan profesional di bidang kebencanaan",
    11: "Terwujudnya pemulihan daerah terdampak bencana yang lebih baik, aman, dan berkelanjutan dengan memperhatikan pengurangan risiko bencana",
    12: "Terwujudnya infrastruktur yang berkualitas, andal, serta berkelanjutan dan tangguh bencana.",
}

# ============================================================================ status Indonesia: baris Rencana Aksi Renas (tanpa pagu)

# (kode, kegiatan, indikator, satuan, baseline 2024, target 2029, penanggung jawab, kontributor, token wajib di halaman, catatan)
RENAS_AKSI = [
    ("1.1.2.a", "Peningkatan Ketersediaan Sarana Prasarana Pendukung Dan Diseminasi Peringatan Dini Bencana Di Daerah",
     "1) sarana dan prasarana pendukung dan diseminasi peringatan dini; 2) desa dengan sarana dan prasarana peringatan dini", "unit; desa/kelurahan",
     "1) 546; 2) 8.412", "1) 1.495; 2) 8.642", "Kementerian ESDM; Kementerian Pekerjaan Umum; BMKG; Kementerian Lingkungan Hidup; Kementerian Kehutanan; Kementerian Sosial; Kementerian Kesehatan; BRIN; Kementerian Pertanian; Kementerian Desa PDT; BIG",
     "Kementerian Dalam Negeri", ["1)546", "2)8.412", "1)1.495", "2)8.642"], ""),
    ("1.1.2.d", "Pengembangan dan Penguatan Sistem Diseminasi Informasi Gempabumi & Tsunami",
     "sarana, prasarana, alat, sistem, dan jaringan diseminasi informasi gempabumi dan tsunami", "unit/jaringan (WRS/sirine tsunami)",
     "480", "530", "BMKG", "", ["480", "530", "WRS/sirine"], ""),
    ("1.2.1.c", "Pembangunan dan Pembinaan Pusdalops", "Pusdalops daerah yang mendapatkan pembinaan/pendampingan/peningkatan kapasitas",
     "daerah (provinsi/kabupaten/kota)", "395", "525", "BNPB", "", ["395", "525", "Pusdalops"], ""),
    ("1.2.3.d", "Pembentukan dan Pembinaan Brigdal karhutla", "1) Brigade Pengendalian Kebakaran Hutan dan Lahan", "brigade/kelompok",
     "1) 45", "1) 71", "Kementerian Kehutanan", "BNPB; BRGM", ["1) 45", "1) 71", "Brigdal karhutla"], ""),
    ("2.1.2.a", "Penguatan Fasilitas Pendidikan Aman Bencana",
     "1) peserta didik/tenaga pengajar yang mendapat pembinaan; 2) fasilitator SPAB; 3) daerah", "orang; orang; daerah",
     "1) ±4.433.262 peserta didik, ±286.734 tenaga pengajar/pendidik; 2) 4.110; 3) 29",
     "1) 38.946.645 peserta didik, 249.168 tenaga pengajar/pendidik; 2) 10.280; 3) 449",
     "Kementerian Pendidikan Dasar dan Menengah; Kementerian Agama", "BNPB", ["4.433.2", "286.734", "4.110", "38.946.64", "249.168", "10.280", "449"],
     "angka peserta didik terbelah baris di teks OCR (4.433.2|62 dan 38.946.64|5); target tenaga pendidik lebih kecil dari baseline, sesuai tertulis"),
    ("2.3.3.a", "Fasilitasi, Pembinaan, dan Rehabilitasi DAS, Hutan, dan Lahan", "1) area rehabilitasi hutan dan lahan secara vegetatif", "hektar",
     "N/A", "1) 200.000", "Kementerian Kehutanan", "", ["1) 200.000"], "indikator 2)-5) tidak disalin"),
    ("2.3.3.b", "Fasilitasi, Pembinaan, dan Rehabilitasi DTA dan Daerah Imbuhan Mata Air", "1) luas DTA danau yang dipulihkan", "hektar",
     "N/A", "1) 10000", "Kementerian Kehutanan", "", ["1) 10000", "Imbuhan"], ""),
    ("2.3.4.a", "Peningkatan Pengawasan Penerapan Standar Bangunan Tahan Bencana", "rekomendasi tindak lanjut penerapan standar bangunan tahan bencana",
     "dokumen/rekomendasi kebijakan", "-", "50", "Kementerian Pekerjaan Umum; BNPB", "Kementerian Perumahan dan Kawasan Permukiman", ["Bangunan", "50"], ""),
    ("2.4.2.a", "Pembangunan Tanggul Laut, Breakwater, dan Bangunan Pengaman Pantai Lainnya", "panjang bangunan pengaman pantai yang dibangun", "kilometer",
     "3.635,42", "5453,12", "Kementerian Pekerjaan Umum", "Kementerian Kelautan dan Perikanan; Kementerian ESDM; Kementerian Lingkungan Hidup", ["3.635,42", "5453,12"], ""),
    ("2.4.4.a", "Penyusunan NSPK Mitigasi dan Adaptasi Subsiden Tanah", "naskah akademis/RIA/urgensi/NSPK terkait mitigasi dan adaptasi subsiden tanah",
     "dokumen", "-", "5", "Kementerian Lingkungan Hidup", "Kementerian Hukum; Kemenko PMK; Kemenko Infrastruktur", ["Subsiden Tanah"], ""),
    ("2.5.1.c", "Asuransi Pertanian", "luas pertanaman pertanian yang terlindungi asuransi", "hektar", "278.806", "1.250.000", "Kementerian Pertanian", "",
     ["278.806", "1.250.000"], ""),
    ("3.1.2.c", "Rehabilitasi dan Rekonstruksi Sektor Perumahan", "rumah dan sarpras permukiman yang direhabilitasi/direkonstruksi", "rumah/unit/paket",
     "1.160", "5.802", "Kementerian Perumahan dan Kawasan Permukiman", "BNPB; Kementerian ATR/BPN; Kementerian BUMN", ["1.160", "5.802"], ""),
    ("4.5.1.a", "Penguatan Desa dan Kelurahan dalam Menghadapi Bencana",
     "desa/kelurahan yang mendapatkan pemberdayaan/pembinaan/pendampingan dalam menghadapi bencana", "desa/kelurahan", "2.234", "7.234",
     "Kementerian Desa PDT; BNPB; Kementerian Sosial", "", ["2.234", "7.234"], "PJ ditulis 'Kementeiran Desa PDT' di sumber"),
    ("4.5.1.b", "Penguatan Keluarga Tangguh Bencana", "penyuluh yang mendapatkan pemberdayaan/pembinaan/pendampingan", "orang penyuluh", "30", "150", "BNPB",
     "Kementerian Kependudukan dan Pembangunan Keluarga/BKKBN; Kementerian PPPA", ["30", "150", "Keluarga"], ""),
    ("4.5.1.c", "Pembinaan Kesiapsiagaan", "kelompok masyarakat/desa yang dibina kesiapsiagaan", "kelompok masyarakat/desa", "1.450", "2.950",
     "Kementerian Sosial; BMKG; Kementerian Kelautan dan Perikanan", "BNPB", ["1.450", "2.950"], ""),
    ("4.6.3.a", "Asuransi BMN serta Perluasan Skema Pembiayaan untuk Perlindungan BMN dan BMD",
     "naskah akademis/RIA/urgensi/NSPK perluasan skema pembiayaan perlindungan BMN dan BMD", "dokumen", "1 rekomendasi kebijakan", "1 peraturan perundang-undangan",
     "Kementerian Keuangan; BNPB; Kementerian Dalam Negeri", "", ["Asuransi BMN"], ""),
    ("4.6.3.b", "Pengenalan Konsep Transfer Risiko dalam Peningkatan Ketahanan Pembiayaan terhadap Bencana",
     "daerah yang mendapatkan peningkatan pemahaman konsep transfer risiko", "daerah (prov/kab/kota)", "-", "546", "BNPB",
     "Kementerian Keuangan; Kementerian Dalam Negeri; Otoritas Jasa Keuangan", ["546", "Transfer"], ""),
]

# ============================================================================ sumber web dan riset (dibuka 23 Okt 2026)

SUMBER = {
    # korpus lokal
    "RENSTRA": ("Peraturan BNPB No. 5/2025 tentang Renstra BNPB 2025-2029", "BNPB", "data/raw/hukum/teks/perban-nomor-5-tahun-2025.json", "2025-10-03"),
    "RENAS": ("Peraturan BNPB No. 1/2025 tentang Renas PB 2025-2029", "BNPB", "data/raw/hukum/teks/perban-nomor-1-tahun-2025.json", "2025-01-06"),
    "PERBAN7": ("Peraturan BNPB No. 7/2025 tentang Desa dan Kelurahan Tangguh Bencana", "BNPB", "data/raw/hukum/teks/perban-nomor-7-tahun-2025.json", "2025-10-24"),
    "JUKLAK4": ("Juklak BNPB No. 4/2025 Penyaluran Dana Bersama PB Tahap Prabencana", "BNPB", "data/raw/hukum/teks/juklak-nomor-4-tahun-2025.json", "2025-08-21"),
    # riset repo
    "RISET_B": ("Riset B: Desk research pengelolaan air Pulau Jawa (bagian 2.3, 9)", "kajian-bnpb", "data/kajian-bnpb/riset/B-air-jawa.md", "2026-10-23"),
    "RISET_C": ("Riset C: Benchmark kajian dan praktik internasional (bagian 4.1)", "kajian-bnpb", "data/kajian-bnpb/riset/C-benchmark.md", "2026-10-23"),
    # web
    "BMKG_SLI19": ("BMKG Dukung Peningkatan Produktivitas Pertanian melalui Sekolah Lapang Iklim (siaran pers)", "BMKG",
                   "https://www.bmkg.go.id/siaran-pers/bmkg-dukung-peningkatan-produktivitas-pertanian-melalui-sekolah-lapang-iklim", "2019-07-09"),
    "BMKG_SLI16": ("Panen Raya SLI Tahap III Provinsi Jambi", "BMKG", "https://www.bmkg.go.id/berita/utama/panen-raya-sli-tahap-iii-provinsi-jambi", "2016-09-22"),
    "KONTAN_PALU": ("Inilah deretan fakta tentang tsunami Palu", "Kontan (mengutip BMKG)", "https://nasional.kontan.co.id/news/inilah-deretan-fakta-yang-tentang-tsunami-palu", "2018-09-29"),
    "CGTN_PALU": ("Laporan pencabutan peringatan tsunami Palu (pernyataan Kapus Gempa dan Tsunami BMKG)", "CGTN; asianews.network",
                  "https://news.cgtn.com/news/3d3d774e3359544e7a457a6333566d54/share_amp.html", "2018-09"),
    "APRIL16": ("APRIL Group builds on successful Fire Free Village Programme (siaran pers)", "APRIL Group",
                "https://www.rgei.com/attachments/article/565/20160102-april-group-builds-on-successful-fire-free-village-programme.pdf", "2016-02-01"),
    "RAPP18": ("PT RAPP successfully suppresses fire through Fire Free Village Program over past four years (media release)", "PT RAPP",
               "https://www.rgei.com/attachments/article/1113/ffvp-anniversary-26-07-2018.pdf", "2018-07-26"),
    "URZAINKI23": ("Urzainki dkk. (2023), Biogeosciences 20:2099-2116, doi:10.5194/bg-20-2099-2023", "Copernicus", "https://bg.copernicus.org/articles/20/2099/2023/", "2023"),
    "REKOMPAK12": ("Rekompak: Rebuilding Indonesia's Communities After Disasters", "Sekretariat MDF dan JRF, Bank Dunia",
                   "https://documents1.worldbank.org/curated/en/128361468267347740/pdf/665520WP0Box380UBLIC00rekompak0book.pdf", "2012-10"),
    "WB_JRF11": ("Building on success: JRF effectively respond to multiple disasters in Yogyakarta (siaran pers)", "Bank Dunia",
                 "https://www.worldbank.org/en/news/press-release/2011/10/25/building-success-jrf-effectively-respond-multiple-disasters-yogyakarta-indonesia.print", "2011-10-25"),
    "BRR09": ("BRR Book Series: Case Study - The Scattered Beads", "BRR Aceh-Nias", "https://aset-sejarah.dibi.bnpb.go.id/media/assets/arsip/6748628c6962c.pdf", "2009"),
    "PMK_NTB_MAR20": ("Pemerintah Upayakan Percepatan Penanganan Pascabencana Gempa Bumi NTB", "Kemenko PMK",
                      "https://www.kemenkopmk.go.id/pemerintah-upayakan-percepatan-penanganan-pascabencana-gempa-bumi-ntb", "2020-03-13"),
    "PMK_NTB_AGT20": ("Menko PMK Serah Terima 65 Ribu Huntap Pasca Gempa NTB", "Kemenko PMK", "https://kemenkopmk.go.id/menko-pmk-serah-terima-65-ribu-huntap-pasca-gempa-ntb", "2020-08-28"),
    "DETIK_SUMUR": ("Apakah Sumur Resapan Efektif Atasi Banjir Jakarta? Ini Kata Pakar IPB", "detikEdu (mengutip S.D. Tarigan, IPB)",
                    "https://www.detik.com/edu/edutainment/d-5850237/apakah-sumur-resapan-efektif-atasi-banjir-jakarta-ini-kata-pakar-ipb", "2021-12-11"),
    "DETIK_CITARUM": ("Sungai Citarum yang Belum Harum", "detikJabar (mengutip Pemprov Jawa Barat)", "https://www.detik.com/jabar/berita/d-7387076/sungai-citarum-yang-belum-harum", "2024-06-12"),
    "RWSN_PAMSIMAS": ("PAMSIMAS III (ringkasan ICR Bank Dunia 2023)", "Rural Water Supply Network", "https://rural-water-supply.net/en/resources/1221-pamsimas3", "2023"),
    "DFAT_PAMSIMAS": ("PAMSIMAS Independent Evaluation", "DFAT Australia", "https://www.dfat.gov.au/sites/default/files/pamsimas-independent-evaluation.pdf", "2022"),
    "UNESCO_TOKYO": ("Yamamoto, S., Case History 9.4 Tokyo, dalam Guidebook to Studies of Land Subsidence due to Ground-Water Withdrawal", "UNESCO",
                     "https://wwwrcamnl.wr.usgs.gov/rgws/Unesco/PDF-Chapters/Chapter9-4.pdf", "1984"),
    "MOE_JP": ("Water/Soil/Ground Environment: Ground Subsidence", "Ministry of the Environment, Japan", "https://www.env.go.jp/en/water/wq/wemj/ground.html", "t.t."),
    "AIST_BKK": ("Tanaka, A. & Mio, A. (2013), Ground deformation signals detected by SAR interferometry along the Chao Praya River (abstrak JpGU STT57-01; mengutip Phien-wej dkk. 2006)",
                 "Geological Survey of Japan, AIST", "https://www2.jpgu.org/meeting/2013/session/PDF/S-TT57/STT57-01.pdf", "2013"),
    "DP2026": ("Delta Programme 2026", "Pemerintah Belanda (Delta Commissioner)", "https://dp2026.deltaprogramma.nl/en", "2025-09"),
    "EEA_RFTR": ("Room for the River Waal: protecting the city of Nijmegen (studi kasus)", "Climate-ADAPT, European Environment Agency",
                 "https://climate-adapt.eea.europa.eu/en/metadata/case-studies/room-for-the-river-waal-2013-protecting-the-city-of-nijmegen", "t.t."),
    "ENW21": ("Hoogwater 2021: Feiten en Duiding", "Expertisenetwerk Waterveiligheid (ENW)", "https://www.enwinfo.nl/publish/pages/183541/211102_enw_hoogwater_2021-dv-def.pdf", "2021"),
    "HAQUE12": ("Haque dkk. (2012), Reduced death rates from cyclones in Bangladesh: what more needs to be done? Bull. WHO 90(2):150-156",
                "Bulletin of the World Health Organization", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3302549/", "2012-02"),
    "PW_BHOLA": ("What's changed since the 1970 Great Bhola Cyclone (blog)", "PreventionWeb", "https://www.preventionweb.net/blog/whats-changed-1970-great-bhola-cyclone", "t.t."),
    "ODISHA_RDNA": ("India: Cyclone Phailin in Odisha, October 2013, Rapid Damage and Needs Assessment Report", "Pemerintah Odisha, ADB, Bank Dunia",
                    "https://documents1.worldbank.org/curated/en/168471468257979992/pdf/838860WP0P14880Box0382116B00PUBLIC0.pdf", "2013-12"),
    "PHAILIN_AWAL": ("Laporan awal korban Phailin (World Vision; feature Bank Dunia 17 Okt 2013)", "World Vision; Bank Dunia",
                     "https://www.worldbank.org/en/news/feature/2013/10/17/india-cyclone-phailin-destruction-preparation", "2013-10"),
    "JST_KATADA": ("For achieving zero victims in a natural disaster: dynamic hazard map and disaster prevention education (Katada)", "Japan Science and Technology Agency",
                   "https://www.jst.go.jp/EN/achievements/research/pdf/toshitaka_katada2016.pdf", "2016"),
    "CHILE_WCEE": ("Guendelman, Saragoni, Verdugo (2012), Chilean Emergency Seismic Design Code for Building after El Maule 2010 Earthquake, 15WCEE",
                   "15th World Conference on Earthquake Engineering", "https://www.iitk.ac.in/nicee/wcee/article/WCEE2012_4480.pdf", "2012"),
    "OCHA_CHILE": ("Factsheet Chile Earthquake 08/03/2010", "OCHA (ReliefWeb)", "https://reliefweb.int/report/chile/factsheet-chile-earthquake-08032010", "2010-03-08"),
    "WB_CCRIF": ("Risk insurance builds climate and disaster resilience in Central America and the Caribbean (results brief)", "Bank Dunia",
                 "https://www.worldbank.org/en/results/2022/04/21/risk-insurance-builds-climate-and-disaster-resilience-in-central-america-and-the-caribbean", "2022-04-21"),
    "ARTEMIS_CCRIF": ("CCRIF parametric payouts reach $266.8m after $4.9m for 2023 Atlantic storms", "Artemis",
                      "https://www.artemis.bm/news/ccrif-parametric-payouts-reach-266-8m-after-4-9m-for-2023-atlantic-storms/", "2023"),
    "OPM_ARC": ("Value for money in sovereign drought insurance: findings from a VfM analysis of the African Risk Capacity (briefing note 3)", "Oxford Policy Management (didanai FCDO)",
                "https://www.opml.co.uk/sites/default/files/migrated_bolt_files/arc-policy-brief-3-vfm.pdf", "2022"),
    "DJKN_ABMN": ("Asuransi BMN Terima Klaim Kerugian Negara Akibat Bencana di Tahun 2020", "DJKN Kemenkeu",
                  "https://www.djkn.kemenkeu.go.id/berita/baca/22986/Asuransi-BMN-Terima-Klaim-Kerugian-Negara-Rp114-Milyar-Akibat-Bencana-di-Tahun-2020.html", "2021-01-23"),
    "BISNIS_ABMN": ("Konsorsium Asuransi Gedung 'Pelat Merah' Raup Premi Rp132,1 Miliar per Oktober 2024 dari Kemenkeu", "Bisnis.com (mengutip DJKN)",
                    "https://finansial.bisnis.com/read/20241112/215/1815454/konsorsium-asuransi-barang-negara-raup-premi-rp1321-miliar-per-oktober-2024-dari-kemenkeu", "2024-11-12"),
    "FEMA18": ("Natural Hazard Mitigation Saves Interim Report (fact sheet)", "FEMA Federal Insurance and Mitigation Administration",
               "https://www.fema.gov/sites/default/files/2020-07/fema_mitsaves-factsheet_2018.pdf", "2018-06"),
    "NCDOJ26": ("FEMA Concedes in BRIC Funding Case (siaran pers)", "North Carolina Department of Justice", "https://ncdoj.gov/?p=371802", "2026-03-24"),
    "WFP23": ("Prep ka na ba? Are you ready? 30 initiatives that enabled emergency preparedness and response", "World Food Programme",
              "https://wfp.org/publications/prep-ka-na-ba-are-you-ready-30-initiatives-enabled-emergency-preparedness-and-response", "2023-12-18"),
    "INQ_PH": ("Inquirer: korban Yolanda (NDRRMC); 'No death in Albay during Nona'; 'Albay typhoon deaths blamed on evacuation failure'", "Philippine Daily Inquirer",
               "https://newsinfo.inquirer.net/747715/no-death-in-albay-during-nona-due-to-preemptive-evacuation-prayers-salceda", "2015-2017"),
}

# ============================================================================ bukti per angka

# (program, indikator, nilai, satuan, periode, peran, sumber, lokasi, label, verifikasi, kutipan pendek / catatan, konflik_dengan)
B = [
    # P01 Destana
    ("P01", "desa/kelurahan mendapat pembinaan menghadapi bencana (baseline)", "2.234", "desa/kelurahan", "2024", "status-resmi", "RENAS", "Tabel 3.1 kode 4.5.1.a", "resmi", "korpus-lokal", "", ""),
    ("P01", "desa/kelurahan mendapat pembinaan menghadapi bencana (target)", "7.234", "desa/kelurahan", "2029", "target-resmi", "RENAS", "Tabel 3.1 kode 4.5.1.a", "resmi", "korpus-lokal", "", ""),
    ("P01", "desa di daerah rawan bencana (isu strategis RPJMN)", "53.000", "desa", "2025", "pembanding", "RENSTRA", "isu kebencanaan RPJMN",
     "resmi", "korpus-lokal", "Sebanyak 53.000 Desa terletak di daerah rawan bencana", ""),
    ("P01", "persentase daerah yang memiliki Desa tangguh Bencana (IKK)", "2,58", "%", "2025", "target-resmi", "RENSTRA", "Tabel 4.7", "resmi", "korpus-lokal",
     "2,58% 2,61% 2,77% 2,99% 3,26%", ""),
    ("P01", "persentase daerah yang memiliki Desa tangguh Bencana (IKK)", "3,26", "%", "2029", "target-resmi", "RENSTRA", "Tabel 4.7", "resmi", "korpus-lokal",
     "2,58% 2,61% 2,77% 2,99% 3,26%", ""),
    ("P01", "masalah pokok Renas: dana desa", "", "", "2025-2029", "temuan-kualitatif", "RENAS", "permasalahan ketangguhan masyarakat", "resmi", "korpus-lokal",
     "dana desa untuk program ketangguhan bencana masyarakat desa", ""),
    # P02 SPAB
    ("P02", "pelaksana SPAB berpindah dari BNPB", "", "", "2023", "temuan-kualitatif", "RENSTRA", "evaluasi Renstra 2020-2024", "resmi", "korpus-lokal",
     "Sejak tahun 2023 kegiatan SPAB dialihkan pada Kementerian Pendidikan dan Kebudayaan", ""),
    ("P02", "peserta didik dibina satuan pendidikan aman bencana (baseline)", "4.433.262", "peserta didik", "2024", "status-resmi", "RENAS", "Tabel 3.1 kode 2.1.2.a",
     "resmi", "korpus-lokal", "angka terbelah baris di OCR (4.433.2|62)", ""),
    ("P02", "peserta didik dibina satuan pendidikan aman bencana (target)", "38.946.645", "peserta didik", "2029", "target-resmi", "RENAS", "Tabel 3.1 kode 2.1.2.a",
     "resmi", "korpus-lokal", "angka terbelah baris di OCR (38.946.64|5)", ""),
    ("P02", "fasilitator SPAB dibina (baseline)", "4.110", "orang", "2024", "status-resmi", "RENAS", "Tabel 3.1 kode 2.1.2.a", "resmi", "korpus-lokal", "", ""),
    ("P02", "fasilitator SPAB dibina (target)", "10.280", "orang", "2029", "target-resmi", "RENAS", "Tabel 3.1 kode 2.1.2.a", "resmi", "korpus-lokal", "", ""),
    # P03 InaTEWS
    ("P03", "waktu terbit peringatan tsunami setelah gempa Palu", "5", "menit", "2018", "hasil", "KONTAN_PALU", "paragraf kronologi", "resmi", "dibuka-langsung",
     "sekitar lima menit setelah kejadian gempa (Kepala BMKG)", ""),
    ("P03", "jam gempa Palu-Donggala", "17.02", "WIB", "2018", "hasil", "KONTAN_PALU", "paragraf kronologi", "resmi", "dibuka-langsung", "pukul 17.02 WIB", ""),
    ("P03", "jam peringatan tsunami dicabut", "17.37", "WIB", "2018", "hasil", "KONTAN_PALU", "paragraf kronologi", "resmi", "dibuka-langsung",
     "Pada pukul 17.37 WIB, BMKG mencabut peringatan dini tsunami", ""),
    ("P03", "jarak sensor pasang surut terdekat dari Palu", "200", "km", "2018", "hasil", "CGTN_PALU", "pernyataan Rahmat Triyono", "resmi", "ringkasan-mesin-cari",
     "we have no observation data at Palu (dikutip)", ""),
    ("P03", "keterpenuhan sistem peringatan dini bagi masyarakat terpapar di kawasan risiko tinggi", "6", "%", "2024", "status-resmi", "RENSTRA", "isu kebencanaan RPJMN",
     "resmi", "korpus-lokal", "tingkat keterpenuhan sistem peringatan dini bencana baru mencapai 6 persen", ""),
    ("P03", "IKP cakupan layanan peringatan dini di daerah berisiko", "6,10", "%", "2025", "target-resmi", "RENSTRA", "Tabel 4.6", "resmi", "korpus-lokal",
     "6,10 6,17 6,21 6,26 6,32", ""),
    ("P03", "IKP cakupan layanan peringatan dini di daerah berisiko", "6,32", "%", "2029", "target-resmi", "RENSTRA", "Tabel 4.6", "resmi", "korpus-lokal",
     "6,10 6,17 6,21 6,26 6,32", ""),
    # P04 SLI
    ("P04", "produksi peserta SLI Temanggung di atas rata-rata kabupaten", "9,7", "%", "2019", "hasil", "BMKG_SLI19", "paragraf hasil ubinan", "resmi", "dibuka-langsung",
     "dibanding 2018; tanpa kelompok pembanding", ""),
    ("P04", "produksi peserta SLI Temanggung di atas rata-rata kecamatan", "11,5", "%", "2019", "hasil", "BMKG_SLI19", "paragraf hasil ubinan", "resmi", "dibuka-langsung", "", ""),
    ("P04", "klaim kenaikan produktivitas SLI tahap 3 nasional", "30", "% (paling tinggi)", "2019", "klaim", "BMKG_SLI19", "paragraf penutup", "resmi", "dibuka-langsung",
     "peningkatan produktivitas pertanian hingga 30% dibandingkan rata-ratanya; metode tidak dijelaskan", ""),
    ("P04", "produktivitas lahan peserta SLI (Ciherang), Batanghari", "6,949", "ton/ha", "2016", "sesudah", "BMKG_SLI16", "paragraf hasil", "resmi", "dibuka-langsung", "", ""),
    ("P04", "produktivitas padi lokal pembanding, Batanghari", "5,64", "ton/ha", "2016", "pembanding", "BMKG_SLI16", "paragraf hasil", "resmi", "dibuka-langsung",
     "pembanding beda varietas: efek SLI bercampur efek varietas", ""),
    ("P04", "kenaikan produktivitas peserta SLI, Batanghari", "23", "%", "2016", "hasil", "BMKG_SLI16", "paragraf hasil", "resmi", "dibuka-langsung", "", ""),
    # P05 MPA / Desa Bebas Api
    ("P05", "desa peserta Fire Free Village (versi APRIL)", "9", "desa", "2014-2015", "hasil", "APRIL16", "paragraf 1", "terverifikasi", "dibuka-langsung", "", "B_P05_RAPP_DESA"),
    ("P05", "penurunan luas terbakar di desa peserta", "90", "%", "2014-2015", "hasil", "APRIL16", "paragraf 1", "terverifikasi", "dibuka-langsung",
     "reduced the area burnt by fire among nine participating villages by 90 per cent from 2014 to 2015", ""),
    ("P05", "luas terbakar sebagai porsi area program", "0,18", "%", "2014", "sebelum", "RAPP18", "paragraf capaian", "terverifikasi", "dibuka-langsung", "", ""),
    ("P05", "luas terbakar sebagai porsi area program", "0,01", "%", "2015", "sesudah", "RAPP18", "paragraf capaian", "terverifikasi", "dibuka-langsung", "", ""),
    ("P05", "desa peserta FFVP (versi RAPP)", "4", "desa", "2014", "hasil", "RAPP18", "paragraf jumlah desa", "terverifikasi", "dibuka-langsung",
     "In 2014, four villages are listed as participants", "B_P05_RAPP_DESA"),
    ("P05", "desa peserta FFVP (versi RAPP)", "18", "desa", "2015", "hasil", "RAPP18", "paragraf jumlah desa", "terverifikasi", "dibuka-langsung", "", "B_P05_RAPP_DESA"),
    # P06 gambut / sekat kanal
    ("P06", "sekat kanal yang dimodelkan", "168", "sekat", "2023", "hasil", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung", "", ""),
    ("P06", "luas gambut yang dimodelkan (Sumatra)", "22.000", "ha", "2023", "hasil", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung", "", ""),
    ("P06", "kenaikan rata-rata tahunan muka air tanah akibat sekat", "1,5", "cm", "2023", "hasil", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung",
     "blocks raised the annual mean WTD by only 1.5 cm (hasil pemodelan)", ""),
    ("P06", "kenaikan muka air tanah, tahun kering", "1,44", "cm", "2023", "hasil", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung", "", ""),
    ("P06", "kenaikan muka air tanah, tahun basah", "1,57", "cm", "2023", "hasil", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung", "", ""),
    ("P06", "emisi karbon dioksida terhindar, tahun kering", "1,07", "Mg/ha", "2023", "hasil", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung", "", ""),
    ("P06", "emisi karbon dioksida terhindar, tahun basah", "1,17", "Mg/ha", "2023", "hasil", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung", "", ""),
    # P07 Rekompak
    ("P07", "rumah tahan gempa dibangun JRF/Rekompak di Jawa", "15.000", "rumah (lebih dari)", "2006-2012", "hasil", "REKOMPAK12", "hlm. 65 cetak (PDF 69)",
     "terverifikasi", "dibuka-langsung", "The JRF built more than 15,000 earthquake resistant houses in Java", ""),
    ("P07", "rumah dibangun pemerintah dengan pendekatan Rekompak di Jawa", "300.000", "rumah (lebih dari)", "2006-2008", "hasil", "REKOMPAK12", "hlm. 125 cetak (PDF 129), catatan 1",
     "terverifikasi", "dibuka-langsung", "more than 300,000 houses were built using this approach", "B_P07_280"),
    ("P07", "rumah dibangun replikasi provinsi dalam dua tahun", "280.000", "rumah", "2006-2008", "hasil", "WB_JRF11", "siaran pers", "terverifikasi", "ringkasan-mesin-cari",
     "halaman 404 saat dibuka", "B_P07_280"),
    ("P07", "selisih biaya Rekompak terhadap pendekatan non-komunitas", "40", "% lebih rendah (paling besar)", "2007-2008", "hasil", "REKOMPAK12", "hlm. 121 cetak (PDF 125)",
     "terverifikasi", "dibuka-langsung", "up to 40 percent lower cost than projects that did not use a community-based approach", ""),
    ("P07", "selisih biaya untuk spesifikasi identik", "30", "% lebih murah", "2007-2008", "hasil", "REKOMPAK12", "hlm. 121 cetak (PDF 125)", "terverifikasi", "dibuka-langsung",
     "studi 2007 dan survei kepuasan 2008 yang dibiayai proyek", ""),
    # P08 BRR
    ("P08", "masa kerja BRR", "4", "tahun", "2005-2009", "hasil", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "4-Year Achievement", ""),
    ("P08", "rumah permanen dibangun", "140.304", "rumah", "2005-2009", "sesudah", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "140,304 permanent houses built", ""),
    ("P08", "rumah hancur", "139.195", "rumah", "2004-2005", "sebelum", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "", ""),
    ("P08", "sekolah dibangun", "1.759", "sekolah", "2005-2009", "sesudah", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "", ""),
    ("P08", "sekolah rusak", "3.415", "sekolah", "2004-2005", "sebelum", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "", ""),
    ("P08", "fasilitas kesehatan dibangun", "1.115", "unit", "2005-2009", "sesudah", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "", ""),
    ("P08", "fasilitas kesehatan rusak", "517", "unit", "2004-2005", "sebelum", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "", ""),
    ("P08", "jalan dibangun", "3.696", "km", "2005-2009", "sesudah", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "", ""),
    ("P08", "jalan rusak", "2.618", "km", "2004-2005", "sebelum", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "", ""),
    # P09 Lombok
    ("P09", "rumah sasaran rehab-rekon (RB+RS+RR)", "226.204", "rumah", "2020", "status-resmi", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung", "", ""),
    ("P09", "rumah selesai", "170.559", "rumah", "Mar 2020", "hasil", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung", "", ""),
    ("P09", "porsi rumah selesai", "75,40", "%", "Mar 2020", "hasil", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung", "", ""),
    ("P09", "rumah tertangani", "209.634", "rumah", "Mar 2020", "hasil", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung", "", ""),
    ("P09", "porsi rumah tertangani", "92,67", "%", "Mar 2020", "hasil", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung", "", ""),
    ("P09", "porsi rumah rusak berat selesai", "89", "%", "Agt 2020", "hasil", "PMK_NTB_AGT20", "paragraf 1", "resmi", "dibuka-langsung", "", ""),
    ("P09", "rumah rusak berat selesai (versi Danrem)", "65.000", "rumah (sekitar)", "Agt 2020", "hasil", "PMK_NTB_AGT20", "laporan Danrem 162/WB", "resmi", "dibuka-langsung", "", "B_P09_SELESAI"),
    ("P09", "rumah rusak berat selesai (versi pembuka rilis)", "68.000", "rumah (sekitar)", "Agt 2020", "hasil", "PMK_NTB_AGT20", "paragraf 1", "resmi", "dibuka-langsung", "", "B_P09_SELESAI"),
    ("P09", "rumah rusak berat (versi pembuka rilis)", "74.774", "rumah", "2018", "sebelum", "PMK_NTB_AGT20", "paragraf 1", "resmi", "dibuka-langsung", "", "B_P09_RB"),
    ("P09", "rumah rusak berat (versi Kalaksa BPBD NTB)", "74.707", "rumah", "2018", "sebelum", "PMK_NTB_AGT20", "pernyataan Ahmadi", "resmi", "dibuka-langsung", "", "B_P09_RB"),
    # P10 embung
    ("P10", "evaluasi dampak embung berpembanding", "", "", "2026", "temuan-kualitatif", "RISET_B", "bagian 9 (Embung)", "terverifikasi", "via-riset",
     "riset B mencatat embung 2015-2018 [SEKUNDER] tanpa evaluasi terukur; penelusuran 23 Okt 2026 hanya menemukan klaim dinas/pedoman", ""),
    # P11 sumur resapan
    ("P11", "periode ulang hujan di atas mana kontribusi sumur resapan Jakarta kecil", "2", "tahun", "2021", "pendapat-ahli", "DETIK_SUMUR", "kutipan pakar", "terverifikasi",
     "dibuka-langsung", "Kontribusi sumur resapan yang dibangun di Jakarta dalam mengurangi banjir cukup kecil", ""),
    ("P11", "syarat muka air tanah minimum", "2,5", "m", "2021", "pendapat-ahli", "DETIK_SUMUR", "kutipan pakar", "terverifikasi", "dibuka-langsung", "", ""),
    ("P11", "syarat permeabilitas tanah minimum", "2,0", "cm/jam", "2021", "pendapat-ahli", "DETIK_SUMUR", "kutipan pakar", "terverifikasi", "dibuka-langsung", "", ""),
    ("P11", "tutupan vegetasi skenario model DAS Kamoning", "40", "%", "2021", "hasil", "RISET_B", "bagian 9 (Muqaddas dkk. 2021)", "terverifikasi", "via-riset", "hasil simulasi", ""),
    ("P11", "penurunan limpasan skenario model DAS Kamoning", "78,14", "%", "2021", "hasil", "RISET_B", "bagian 9 (Muqaddas dkk. 2021)", "terverifikasi", "via-riset", "hasil simulasi", ""),
    # P12 Citarum
    ("P12", "IKA Sungai Citarum", "33,43", "indeks", "2018", "sebelum", "DETIK_CITARUM", "paragraf IKA", "resmi", "dibuka-langsung", "angka pejabat Jabar; sumber data tidak disebut", "B_P12_2018"),
    ("P12", "IKA Sungai Citarum", "50,78", "indeks", "2023", "sesudah", "DETIK_CITARUM", "paragraf IKA", "resmi", "dibuka-langsung", "", "B_P12_5078"),
    ("P12", "IKA Sungai Citarum (versi Republika)", "33,34", "indeks", "2018", "sebelum", "RISET_B", "bagian 2.3", "resmi", "via-riset", "[SEKUNDER] di riset B", "B_P12_2018"),
    ("P12", "IKA Sungai Citarum (versi Republika)", "51,01", "indeks", "2022", "sesudah", "RISET_B", "bagian 2.3", "resmi", "via-riset", "[SEKUNDER] di riset B", ""),
    ("P12", "IKA Sungai Citarum (versi Metro TV, Juni 2024)", "50,78", "indeks", "2024-06", "sesudah", "RISET_B", "bagian 2.3", "resmi", "via-riset",
     "[SEKUNDER]; detikJabar menyebut nilai yang sama untuk 2023", "B_P12_5078"),
    ("P12", "target IKA akhir masa Perpres 15/2018", "60", "indeks", "2025", "target-resmi", "DETIK_CITARUM", "paragraf target", "resmi", "dibuka-langsung", "", ""),
    # P13 PAMSIMAS
    ("P13", "jiwa terlayani air minum berkelanjutan", "24,8", "juta jiwa", "s.d. 2023", "hasil", "RWSN_PAMSIMAS", "ringkasan ICR", "terverifikasi", "dibuka-langsung", "", ""),
    ("P13", "target awal jiwa terlayani", "22,1", "juta jiwa", "s.d. 2023", "target", "RWSN_PAMSIMAS", "ringkasan ICR", "terverifikasi", "dibuka-langsung", "", ""),
    ("P13", "desa yang didukung", "35.553", "desa (lebih dari)", "s.d. 2023", "hasil", "RWSN_PAMSIMAS", "ringkasan ICR", "terverifikasi", "dibuka-langsung", "", ""),
    ("P13", "sistem dibangun/direhabilitasi yang berfungsi baik", "91", "% (sekitar)", "s.d. 2023", "hasil", "RWSN_PAMSIMAS", "ringkasan ICR", "terverifikasi", "dibuka-langsung", "", ""),
    ("P13", "EIRR terkoreksi", "30,8", "%", "2022", "hasil", "DFAT_PAMSIMAS", "temuan ekonomi", "terverifikasi", "ringkasan-mesin-cari",
     "evaluasi juga memperingatkan data MIS (mis. fungsi sistem) bisa menghitung ganda; berkas timeout saat dibuka", ""),
    # P14 sodetan / bendungan kering
    ("P14", "reduksi debit puncak Bendungan Ciawi, banjir Maret 2025", "20,87", "%", "2025-03", "hasil", "RISET_B", "bagian 9", "resmi", "via-riset", "[SEKUNDER] BBWS via detik", ""),
    ("P14", "debit Ciliwung masuk Ciawi", "267,17", "m³/detik", "2025-03", "sebelum", "RISET_B", "bagian 9", "resmi", "via-riset", "[SEKUNDER]", ""),
    ("P14", "debit Ciliwung keluar Ciawi", "211,41", "m³/detik", "2025-03", "sesudah", "RISET_B", "bagian 9", "resmi", "via-riset", "[SEKUNDER]", ""),
    ("P14", "reduksi debit puncak Bendungan Sukamahi", "7", "%", "2025-03", "hasil", "RISET_B", "bagian 9", "resmi", "via-riset", "[SEKUNDER]", ""),
    ("P14", "kapasitas sodetan Ciliwung-KBT", "60", "m³/detik", "2023", "hasil", "RISET_B", "bagian 9", "resmi", "via-riset", "[SEKUNDER]", ""),
    ("P14", "debit rencana Ciliwung (periode ulang 25 tahun)", "508", "m³/detik", "2023", "pembanding", "RISET_B", "bagian 9", "resmi", "via-riset", "[SEKUNDER]", ""),
    ("P14", "klaim pengurangan potensi banjir sodetan", "62", "%", "2023", "klaim", "RISET_B", "bagian 9", "resmi", "via-riset", "[SEKUNDER]; kinerja terukur pascaoperasi tidak ditemukan", ""),
    ("P14", "kelurahan yang diklaim terbantu sodetan", "6", "kelurahan", "2023", "klaim", "RISET_B", "bagian 9", "resmi", "via-riset", "[SEKUNDER]", ""),
    # P15 polder
    ("P15", "kinerja polder Jati Pinggir dan tanggul Pekalongan", "", "", "2017-2022", "temuan-kualitatif", "RISET_B", "bagian 7 dan 9", "terverifikasi", "via-riset",
     "Polder Jati Pinggir: saluran dan pompa kurang kapasitas [abstrak terverifikasi]; tanggul Pekalongan 2019 tenggelam 2022 [SEKUNDER]", ""),
    # P16 air tanah Tokyo / Bangkok
    ("P16", "pengambilan air tanah wilayah ku (ward) Tokyo", "1.160.000", "m³/hari", "1964", "sebelum", "UNESCO_TOKYO", "9.4.2 Hydrology", "terverifikasi", "dibuka-langsung",
     "1,160,000 m3/day of ground water was withdrawn in 1964", ""),
    ("P16", "pengambilan air tanah wilayah ku (ward) Tokyo", "128.000", "m³/hari", "1975", "sesudah", "UNESCO_TOKYO", "9.4.2 Hydrology", "terverifikasi", "dibuka-langsung",
     "fell to 128,000 m3/day, or about a tenth, in 1975", ""),
    ("P16", "batas kedalaman sumur yang dilarang (Desember 1971; >160 m dilarang Mei 1974)", "160", "m", "1971-1974", "hasil", "UNESCO_TOKYO", "9.4.2 Hydrology",
     "terverifikasi", "dibuka-langsung", "", ""),
    ("P16", "laju penurunan tanah maksimum Tokyo", "27", "cm/tahun", "sebelum 1972", "sebelum", "UNESCO_TOKYO", "9.4.3 Land subsidence", "terverifikasi", "dibuka-langsung",
     "the rate has dropped year after year since 1972", ""),
    ("P16", "penurunan tanah kumulatif maksimum Tokyo", "4,6", "m", "s.d. 1970-an", "sebelum", "UNESCO_TOKYO", "9.4.3 Land subsidence", "terverifikasi", "dibuka-langsung", "", ""),
    ("P16", "laju penurunan tanah puncak Bangkok timur", "120", "mm/tahun", "1981", "sebelum", "AIST_BKK", "abstrak", "terverifikasi", "dibuka-langsung",
     "highest subsidence rate up to 120 mm/year had been recorded in the eastern area", ""),
    ("P16", "laju penurunan tanah Bangkok setelah pembatasan pompa (akhir 1980-an)", "20", "mm/tahun", "2007-2010", "sesudah", "AIST_BKK", "abstrak", "terverifikasi",
     "dibuka-langsung", "rate of 20 mm/year in recent years, due to the law limiting groundwater pumping", ""),
    ("P16", "undang-undang pembatasan air tanah Jepang (1956, 1962)", "", "", "1956-1962", "temuan-kualitatif", "MOE_JP", "Ground subsidence", "resmi", "dibuka-langsung",
     "Industrial Water Law 1956; Law Concerning the Regulation of Pumping-up of Underground Water for Use in Buildings 1962", ""),
    # P17 Delta Programme
    ("P17", "kemajuan agenda pengelolaan risiko banjir menuju 2050", "82", "%", "2025", "hasil", "RISET_C", "bagian 4.1 (DP2026)", "resmi", "via-riset", "[TERVERIFIKASI] di riset C", ""),
    ("P17", "kemajuan agenda air tawar dan adaptasi ruang (masing-masing)", "10", "% (sekitar)", "2025", "hasil", "RISET_C", "bagian 4.1 (DP2026)", "resmi", "via-riset", "[TERVERIFIKASI] di riset C", ""),
    # P18 Room for the River
    ("P18", "penurunan muka air rencana Waal di Nijmegen", "35", "cm", "2016", "hasil", "EEA_RFTR", "ringkasan studi kasus", "terverifikasi", "dibuka-langsung",
     "a 35 cm river water height reduction (nilai desain/model)", ""),
    ("P18", "target awal penurunan muka air", "27", "cm", "2016", "target", "EEA_RFTR", "ringkasan studi kasus", "terverifikasi", "dibuka-langsung", "", ""),
    ("P18", "muka air Maas banjir Juli 2021", "", "", "2021", "temuan-kualitatif", "ENW21", "ringkasan", "resmi", "ringkasan-mesin-cari",
     "muka air hilir Roermond lebih rendah dari banjir terdahulu, sebagian karena Maaswerken; berkas >10 MB tidak terbaca", ""),
    # P19 CPP Bangladesh
    ("P19", "kematian siklon 1970", "500.300", "jiwa", "1970", "sebelum", "HAQUE12", "Tabel 1", "terverifikasi", "dibuka-langsung", "", "B_P19_1970"),
    ("P19", "kematian siklon 1991", "138.958", "jiwa", "1991", "sebelum", "HAQUE12", "Tabel 1", "terverifikasi", "dibuka-langsung", "", ""),
    ("P19", "kematian siklon 1997", "410", "jiwa", "1997", "sesudah", "HAQUE12", "Tabel 1", "terverifikasi", "dibuka-langsung", "", ""),
    ("P19", "kematian siklon Sidr", "4.234", "jiwa", "2007", "sesudah", "HAQUE12", "Tabel 1 dan abstrak", "terverifikasi", "dibuka-langsung",
     "a 100-fold reduction compared with the devastating 1970 cyclone", ""),
    ("P19", "kematian siklon 2009", "197", "jiwa", "2009", "sesudah", "HAQUE12", "Tabel 1", "terverifikasi", "dibuka-langsung", "", ""),
    ("P19", "faktor penurunan kematian 1970 ke 2007", "100", "kali", "1970-2007", "hasil", "HAQUE12", "abstrak", "terverifikasi", "dibuka-langsung", "", ""),
    ("P19", "relawan penyiar peringatan saat siaga siklon", "20.000", "orang (lebih dari)", "2012", "hasil", "HAQUE12", "pembahasan", "terverifikasi", "dibuka-langsung", "", ""),
    ("P19", "shelter siklon sebelum 2007", "1.500", "shelter", "2007", "hasil", "HAQUE12", "pembahasan", "terverifikasi", "dibuka-langsung", "", ""),
    ("P19", "shelter tambahan yang mulai dibangun pasca-Sidr", "2.000", "shelter", "2008-2012", "hasil", "HAQUE12", "pembahasan", "terverifikasi", "dibuka-langsung",
     "penulis: jumlah dan lokasi shelter masih kurang; efek terpisah tiap tindakan belum dibuktikan ilmiah", ""),
    ("P19", "kematian siklon 1970 (versi WMO)", "300.000", "jiwa", "1970", "sebelum", "PW_BHOLA", "blog", "terverifikasi", "ringkasan-mesin-cari", "", "B_P19_1970"),
    ("P19", "kematian siklon 1970 (angka resmi pemerintah, kepala CPP)", "1", "juta jiwa", "1970", "sebelum", "PW_BHOLA", "blog", "resmi", "ringkasan-mesin-cari", "", "B_P19_1970"),
    # P20 Odisha
    ("P20", "korban jiwa Siklon Phailin", "44", "jiwa", "2013", "sesudah", "ODISHA_RDNA", "Foreword", "resmi", "dibuka-langsung", "resulting in 44 human casualties", "B_P20_PHAILIN"),
    ("P20", "penduduk terdampak Phailin", "13,2", "juta jiwa", "2013", "sesudah", "ODISHA_RDNA", "Foreword", "resmi", "dibuka-langsung", "", ""),
    ("P20", "penduduk dievakuasi sebelum pendaratan", "1", "juta jiwa (lebih dari)", "2013", "hasil", "ODISHA_RDNA", "Foreword", "resmi", "dibuka-langsung",
     "Over 1 million people were evacuated within 36 hours preceding the landfall", ""),
    ("P20", "jendela evakuasi sebelum pendaratan", "36", "jam", "2013", "hasil", "ODISHA_RDNA", "Foreword", "resmi", "dibuka-langsung", "", ""),
    ("P20", "korban jiwa Siklon Super 1999", "10.000", "jiwa (sekitar)", "1999", "sebelum", "ODISHA_RDNA", "Background", "resmi", "dibuka-langsung", "left about 10,000 people dead", ""),
    ("P20", "penduduk terdampak Siklon Super 1999", "18", "juta jiwa", "1999", "sebelum", "ODISHA_RDNA", "Background", "resmi", "dibuka-langsung", "", ""),
    ("P20", "korban jiwa Phailin (laporan awal World Vision)", "23", "jiwa", "2013", "sesudah", "PHAILIN_AWAL", "laporan awal", "terverifikasi", "ringkasan-mesin-cari", "", "B_P20_PHAILIN"),
    ("P20", "korban jiwa Phailin (feature Bank Dunia)", "38", "jiwa", "2013", "sesudah", "PHAILIN_AWAL", "feature 17 Okt 2013", "terverifikasi", "ringkasan-mesin-cari", "", "B_P20_PHAILIN"),
    # P21 Kamaishi
    ("P21", "siswa SD dan SMP Kamaishi yang selamat", "99,8", "%", "2011", "hasil", "JST_KATADA", "paragraf pembuka", "resmi", "dibuka-langsung",
     "99.8% of about 3,000 elementary and junior high school students of 14 schools in the city survived", ""),
    ("P21", "jumlah siswa", "3.000", "siswa (sekitar)", "2011", "hasil", "JST_KATADA", "paragraf pembuka", "resmi", "dibuka-langsung", "", ""),
    ("P21", "jumlah sekolah", "14", "sekolah", "2011", "hasil", "JST_KATADA", "paragraf pembuka", "resmi", "dibuka-langsung", "", ""),
    # P22 Chile
    ("P22", "magnitudo gempa Maule", "8,8", "Mw", "2010", "hasil", "CHILE_WCEE", "Pendahuluan", "terverifikasi", "dibuka-langsung", "", ""),
    ("P22", "kegagalan pada bangunan hunian tiga lantai atau lebih (izin 1985-2009)", "0,5", "%", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung", "", ""),
    ("P22", "bangunan hunian tiga lantai atau lebih", "9.974", "bangunan", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung", "", ""),
    ("P22", "kegagalan pada bangunan sembilan lantai atau lebih", "2,8", "%", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung",
     "Only 2.8% of the analyzed of 1939 buildings of more than 8 stories ... shown failure", ""),
    ("P22", "bangunan hunian sembilan lantai atau lebih", "1.939", "bangunan", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung", "", ""),
    ("P22", "bangunan runtuh", "4", "bangunan (sekitar)", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung", "", ""),
    ("P22", "bangunan harus dibongkar", "50", "bangunan (taksiran)", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung", "", ""),
    ("P22", "korban jiwa resmi sementara", "528", "jiwa", "2010-03", "hasil", "OCHA_CHILE", "factsheet", "resmi", "ringkasan-mesin-cari", "angka terus direvisi; ±25% oleh tsunami (EGU blog)", ""),
    # P23 asuransi
    ("P23", "pembayaran CCRIF sejak 2007", "54", "pembayaran", "s.d. 2022", "hasil", "WB_CCRIF", "ringkasan", "terverifikasi", "dibuka-langsung", "", "B_P23_CCRIF"),
    ("P23", "nilai pembayaran CCRIF", "245", "juta US$ (sekitar)", "s.d. 2022", "hasil", "WB_CCRIF", "ringkasan", "terverifikasi", "dibuka-langsung", "", "B_P23_CCRIF"),
    ("P23", "anggota CCRIF penerima pembayaran", "16", "negara", "s.d. 2022", "hasil", "WB_CCRIF", "ringkasan", "terverifikasi", "dibuka-langsung", "", ""),
    ("P23", "batas waktu pembayaran CCRIF setelah bencana", "14", "hari", "s.d. 2022", "hasil", "WB_CCRIF", "ringkasan", "terverifikasi", "dibuka-langsung", "paid within 14 days of the disaster", ""),
    ("P23", "pembayaran CCRIF (versi 2023)", "63", "pembayaran", "s.d. 2023", "hasil", "ARTEMIS_CCRIF", "berita", "terverifikasi", "ringkasan-mesin-cari", "", "B_P23_CCRIF"),
    ("P23", "nilai pembayaran CCRIF (versi 2023)", "266,8", "juta US$", "s.d. 2023", "hasil", "ARTEMIS_CCRIF", "berita", "terverifikasi", "ringkasan-mesin-cari", "", "B_P23_CCRIF"),
    ("P23", "anggota CCRIF penerima (versi 2023)", "17", "negara", "s.d. 2023", "hasil", "ARTEMIS_CCRIF", "berita", "terverifikasi", "ringkasan-mesin-cari", "", ""),
    ("P23", "pembayaran ARC yang tepat waktu", "3", "pembayaran", "2020-2022", "hasil", "OPM_ARC", "Efficiency: reliability and timeliness", "terverifikasi", "dibuka-langsung",
     "target KPI < 30 hari dicapai 3 dari 4 pembayaran", ""),
    ("P23", "pembayaran ARC dalam periode analisis", "4", "pembayaran", "2020-2022", "hasil", "OPM_ARC", "Efficiency: reliability and timeliness", "terverifikasi", "dibuka-langsung", "", ""),
    ("P23", "target waktu pembayaran ARC setelah pemicu", "30", "hari", "2020-2022", "target", "OPM_ARC", "Efficiency: reliability and timeliness", "terverifikasi", "dibuka-langsung", "", ""),
    ("P23", "negara anggota ARC yang membeli polis kekeringan", "16", "negara", "2022", "hasil", "OPM_ARC", "Economy: relevant, well-priced products", "terverifikasi", "dibuka-langsung", "", ""),
    ("P23", "negara anggota ARC", "36", "negara", "2022", "hasil", "OPM_ARC", "Economy: relevant, well-priced products", "terverifikasi", "dibuka-langsung", "", ""),
    ("P23", "premi reasuransi terhadap harapan pembayaran ARC", "81", "%", "2021", "hasil", "OPM_ARC", "Economy: capital, reinsurance, running costs", "terverifikasi", "dibuka-langsung",
     "spesifikasi awal mengasumsikan paling banyak 15%", ""),
    ("P23", "klaim Asuransi BMN dibayar", "1,14", "miliar Rp", "2020", "hasil", "DJKN_ABMN", "paragraf 1", "resmi", "dibuka-langsung",
     "isi berita Rp1,14 miliar; judul URL menulis Rp114 Milyar", "B_P23_ABMN"),
    ("P23", "klaim Asuransi BMN dibayar (versi judul URL berita)", "114", "miliar Rp", "2020", "hasil", "DJKN_ABMN", "slug URL", "resmi", "dibuka-langsung",
     "slug URL 'Rp114-Milyar'; isi berita Rp1,14 milyar, kemungkinan koma hilang di judul", "B_P23_ABMN"),
    ("P23", "BMN terdampak bencana yang diklaim", "18", "BMN", "2020", "hasil", "DJKN_ABMN", "paragraf 1", "resmi", "dibuka-langsung", "", ""),
    ("P23", "K/L peserta Asuransi BMN", "13", "K/L", "2020", "hasil", "DJKN_ABMN", "paragraf 2", "resmi", "dibuka-langsung", "", ""),
    ("P23", "premi Asuransi BMN Jan-Okt 2024", "132,1", "miliar Rp", "2024", "hasil", "BISNIS_ABMN", "berita", "resmi", "ringkasan-mesin-cari", "premi asuransi aset negara, bukan belanja program", ""),
    ("P23", "klaim Asuransi BMN Jan-Okt 2024", "2,45", "miliar Rp", "2024", "hasil", "BISNIS_ABMN", "berita", "resmi", "ringkasan-mesin-cari", "", ""),
    # P24 FEMA
    ("P24", "manfaat rata-rata hibah mitigasi federal per US$1", "6", "US$", "1993-2016", "hasil", "FEMA18", "Overall Findings", "resmi", "dibuka-langsung",
     "Natural hazard mitigation saves $6 on average for every $1 spent on federal mitigation grants", ""),
    ("P24", "investasi pembanding", "1", "US$", "1993-2016", "pembanding", "FEMA18", "Overall Findings", "resmi", "dibuka-langsung", "", ""),
    ("P24", "rasio manfaat-biaya studi NIBS 2005", "4", "rasio (x:1)", "2005", "pembanding", "FEMA18", "Overall Findings", "resmi", "dibuka-langsung", "", ""),
    ("P24", "rasio hibah mitigasi banjir sungai", "7", "kali", "1993-2016", "hasil", "FEMA18", "Flood Mitigation Results", "resmi", "dibuka-langsung", "", ""),
    ("P24", "rasio mitigasi angin", "5", "rasio (x:1)", "1993-2016", "hasil", "FEMA18", "Wind Mitigation Results", "resmi", "dibuka-langsung", "", ""),
    ("P24", "rasio mitigasi gempa investasi publik", "3", "kali", "1993-2016", "hasil", "FEMA18", "Earthquake Mitigation Results", "resmi", "dibuka-langsung", "", ""),
    ("P24", "rasio mitigasi gempa desain di atas kode", "4", "kali", "1993-2016", "hasil", "FEMA18", "Earthquake Mitigation Results", "resmi", "dibuka-langsung", "", ""),
    ("P24", "status BRIC", "", "", "2025-2026", "temuan-kualitatif", "NCDOJ26", "siaran pers", "resmi", "dibuka-langsung",
     "pengadilan (Desember 2025) menyatakan pembatalan BRIC melanggar hukum; FEMA mengajukan rencana memulai lagi (Maret 2026)", ""),
    ("P24", "kewajiban analisis manfaat-biaya di Juklak Dana Bersama prabencana", "", "", "2025", "temuan-kualitatif", "JUKLAK4", "Bab verifikasi", "resmi", "korpus-lokal",
     "kelayakan teknis Rencana Anggaran Biaya", ""),
    # P25 Filipina
    ("P25", "korban jiwa Topan Haiyan/Yolanda", "6.000", "jiwa (lebih dari)", "2013", "sebelum", "WFP23", "ringkasan publikasi", "terverifikasi", "dibuka-langsung", "", "B_P25_HAIYAN"),
    ("P25", "korban jiwa Topan Haiyan/Yolanda (NDRRMC)", "6.300", "jiwa", "2013", "sebelum", "INQ_PH", "berita", "resmi", "ringkasan-mesin-cari", "", "B_P25_HAIYAN"),
    ("P25", "hilang Topan Haiyan/Yolanda (NDRRMC)", "1.061", "jiwa", "2013", "sebelum", "INQ_PH", "berita", "resmi", "ringkasan-mesin-cari", "", ""),
    ("P25", "korban jiwa Topan Rai/Odette", "400", "jiwa (lebih dari)", "2021", "sesudah", "WFP23", "ringkasan publikasi", "terverifikasi", "dibuka-langsung",
     "WFP mengkreditkan langkah preemptif tanpa angka pembanding", ""),
    ("P25", "kematian di Albay saat Topan Nina", "4", "jiwa", "2016", "hasil", "INQ_PH", "berita", "resmi", "ringkasan-mesin-cari", "disebut 'evacuation failure' oleh kepala APSEMO", ""),
]
# Kutipan korpus-lokal yang wajib ketemu (selain angka): sumber -> slug
SLUG = {"RENSTRA": RS, "RENAS": RN, "PERBAN7": "perban-nomor-7-tahun-2025", "JUKLAK4": "juklak-nomor-4-tahun-2025"}

# ============================================================================ kompendium

# Setiap angka di kolom `dampak_terukur` WAJIB muncul sebagai `nilai` bukti program itu (tahun 4 digit dikecualikan).
K = [
    dict(id="P01", nama="Desa dan Kelurahan Tangguh Bencana (Destana)", kelompok="Dalam negeri", lokasi="Indonesia, nasional", periode="2012-sekarang",
         lembaga="BNPB, BPBD, pemerintah desa", fase="prabencana", bencana="banjir;longsor;gempa;tsunami;gunungapi;kekeringan;karhutla", aksi="kapasitas",
         kajian="keduanya",
         apa="Desa/kelurahan menyusun kajian risiko dan rencana PB desa, membentuk Forum PRB dan Tim Relawan, menyiapkan peringatan dini dan jalur evakuasi; tingkat ketangguhan dinilai (pratama, madya, utama).",
         dampak="Belum ada evaluasi dampak kuantitatif (pra-pasca atau desa pembanding). Data resmi hanya cakupan: 2.234 desa/kelurahan dibina (baseline Renas) dengan target 7.234, dibanding 53.000 desa di daerah rawan; IKK Renstra daerah yang memiliki Destana 2,58% menjadi 3,26%.",
         jenis_eval="tidak-ada-evaluasi-dampak", kekuatan="belum-terbukti",
         syarat="Masuk RPJMDes dan dana desa; relawan aktif dan gladi berkala; tersambung ke peringatan dini kab/kota (Pusdalops 24 jam); pendampingan multi-tahun.",
         status="dikembangkan", dasar="Perban BNPB 7/2025 tentang Desa dan Kelurahan Tangguh Bencana (mengganti Perka 1/2012); Renas 4.5.1.a; IKK Direktorat Kesiapsiagaan (Renstra Tabel 4.7)",
         celah="Tidak ada evaluasi dampak; Penilaian Ketangguhan (Perban 7/2025) belum dipakai sebagai garis dasar; cakupan kecil terhadap desa rawan; Renas mencatat dana desa belum optimal untuk ketangguhan.",
         posisi="Program berjalan, wajib evaluasi dampak",
         unit="Direktorat Kesiapsiagaan;Direktorat Peringatan Dini;Direktorat Pemetaan dan Evaluasi Risiko Bencana", kl="Kementerian Desa PDT;Kementerian Sosial;Kementerian Dalam Negeri;BPBD",
         renas="4.5.1;1.1.2", renstra="2", ripb_strategi="4e", catatan=""),
    dict(id="P02", nama="Satuan Pendidikan Aman Bencana (SPAB)", kelompok="Dalam negeri", lokasi="Indonesia, nasional", periode="2012-sekarang",
         lembaga="Kementerian Pendidikan Dasar dan Menengah, Kementerian Agama (sejak 2023); sebelumnya BNPB", fase="prabencana", bencana="gempa;tsunami;banjir;gunungapi",
         aksi="kapasitas", kajian="mitigasi",
         apa="Pendidikan kebencanaan, gladi evakuasi rutin, penilaian keamanan gedung, dan rencana kesiapsiagaan di satuan pendidikan.",
         dampak="Belum ada evaluasi dampak nasional; studi yang ada skala satu sekolah tanpa kelompok pembanding. Pelaksana pindah dari BNPB ke kementerian pendidikan sejak 2023 (Renstra). Renas menargetkan 38.946.645 peserta didik dan 10.280 fasilitator dibina (baseline ±4.433.262 dan 4.110). Bukti terkuat pendekatan ini berasal dari luar negeri (program Kamaishi di kompendium ini).",
         jenis_eval="tidak-ada-evaluasi-dampak", kekuatan="belum-terbukti",
         syarat="Gladi berkala dengan skenario tak terduga; indikator hasil terukur (waktu evakuasi, porsi siswa ikut gladi); gedung sekolah dinilai dan diperkuat.",
         status="dikembangkan", dasar="Perka BNPB 4/2012 Pedoman Penerapan Sekolah/Madrasah Aman dari Bencana; Renas 2.1.2.a (PJ Kemendikdasmen dan Kemenag)",
         celah="Indikator Renas berupa jumlah peserta dibina, bukan hasil; BNPB kini kontributor; Renas mencatat belum semua satuan pendidikan menerapkan SPAB.",
         posisi="Program berjalan, wajib evaluasi dampak",
         unit="Direktorat Kesiapsiagaan;Direktorat Mitigasi Bencana", kl="Kementerian Pendidikan Dasar dan Menengah;Kementerian Agama",
         renas="2.1.2;4.5.2", renstra="2", ripb_strategi="4f;4g", catatan=""),
    dict(id="P03", nama="Sistem Peringatan Dini Tsunami Indonesia (InaTEWS)", kelompok="Dalam negeri", lokasi="Indonesia, pesisir rawan tsunami", periode="2008-sekarang",
         lembaga="BMKG (hulu); BNPB dan BPBD (hilir)", fase="prabencana;tanggap-darurat", bencana="tsunami;gempa", aksi="infrastruktur", kajian="mitigasi",
         apa="Jaringan seismik, pasang surut, dan diseminasi (WRS, sirene) BMKG; peringatan diteruskan BNPB, BPBD, media, dan operator ke masyarakat.",
         dampak="Kecepatan hulu terbukti: pada gempa Palu (September 2018) peringatan terbit sekitar 5 menit setelah gempa pukul 17.02 WIB, tetapi dicabut pukul 17.37 WIB karena tidak ada sensor muka laut di Teluk Palu (sensor terdekat sekitar 200 km); tsunami tetap datang. Hilir lemah: keterpenuhan sistem peringatan dini baru 6% dari masyarakat terpapar berisiko tinggi; IKP cakupan layanan peringatan dini 6,10% menjadi 6,32%.",
         jenis_eval="data-resmi-pra-pasca", kekuatan="sedang",
         syarat="Sensor muka laut di teluk dan dekat sumber; Pusdalops dan BPBD siaga 24 jam; sirene dan pesan seluler sampai rumah tangga; warga terlatih evakuasi mandiri saat guncangan kuat tanpa menunggu peringatan.",
         status="dikembangkan", dasar="Perban BNPB 2/2024 Sistem Peringatan Dini Bencana; Renas 1.1.1, 1.1.2, 1.2.1.c; Perpres 93/2019 (kutipan sekunder, teks tidak dibuka)",
         celah="Mata rantai terakhir (sirene, Pusdalops 24 jam), tsunami nontektonik (Selat Sunda 2018), cakupan peringatan dini 6%; evaluasi UNDRR/UNESCO 2019 atas Palu belum dapat dibuka (HTTP 403).",
         posisi="Program berjalan, wajib evaluasi dampak",
         unit="Direktorat Peringatan Dini;Direktorat Koordinasi Pengendalian Operasi Darurat;Pusat Data, Informasi, dan Komunikasi Kebencanaan", kl="BMKG;BPBD;Kementerian Komunikasi dan Digital",
         renas="1.1.1;1.1.2;1.2.1", renstra="2", ripb_strategi="2b", catatan="Nomenklatur Kementerian Komunikasi dan Digital belum dicek ke kabinet Okt 2026."),
    dict(id="P04", nama="Sekolah Lapang Iklim (SLI) BMKG", kelompok="Dalam negeri", lokasi="Indonesia, sentra pangan", periode="2011-sekarang", lembaga="BMKG",
         fase="prabencana", bencana="kekeringan;banjir", aksi="kapasitas", kajian="air-jawa",
         apa="Pelatihan musiman petani dan penyuluh membaca prakiraan musim dan curah hujan untuk keputusan waktu tanam dan varietas.",
         dampak="Hanya laporan BMKG sendiri tanpa kelompok pembanding. Temanggung 2019: produksi peserta 9,7% di atas rata-rata kabupaten dan 11,5% di atas rata-rata kecamatan; BMKG menyebut kenaikan hingga 30% secara nasional tanpa metode. Batanghari 2016: 6,949 ton/ha di lahan peserta (varietas Ciherang) lawan 5,64 ton/ha padi lokal, naik 23%, tetapi beda varietas mencampur efeknya.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Prakiraan musim yang andal untuk lokasi itu; petani punya pilihan (varietas, air irigasi); evaluasi dengan lahan pembanding sejenis.",
         status="dikembangkan", dasar="Program BMKG sejak 2011 (siaran pers BMKG 9 Jul 2019); terkait Renas 2.5.1 dan 4.5.2",
         celah="Tidak ada evaluasi berpembanding; tidak dikaitkan dengan rencana kontinjensi kekeringan BPBD saat El Nino.",
         posisi="Uji coba terukur", unit="Direktorat Mitigasi Bencana;Direktorat Pengembangan Strategi Penanggulangan Bencana", kl="BMKG;Kementerian Pertanian",
         renas="2.5.1;4.5.2", renstra="2", ripb_strategi="4g", catatan=""),
    dict(id="P05", nama="Masyarakat Peduli Api dan Desa Bebas Api (Fire Free Village Programme)", kelompok="Dalam negeri", lokasi="Riau (konsesi APRIL/RAPP)", periode="2014-sekarang",
         lembaga="APRIL/PT RAPP bersama pemerintah desa; MPA di bawah Kementerian Kehutanan", fase="prabencana", bencana="karhutla", aksi="kapasitas", kajian="mitigasi",
         apa="Hibah infrastruktur bagi desa yang bebas kebakaran, pelatihan regu api desa, patroli, pertanian tanpa bakar, edukasi dan pemantauan udara.",
         dampak="Laporan perusahaan: luas terbakar di 9 desa peserta turun 90% dari 2014 ke 2015 (tahun El Nino kuat); rilis RAPP 2018 menyebut porsi area terbakar 0,18% (2014) menjadi 0,01% (2015), tetapi mencatat 4 desa peserta pada 2014 dan 18 desa pada 2015, berbeda dengan versi 9 desa. Tidak ada kelompok pembanding dan tidak ditemukan evaluasi independen.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Insentif bersyarat yang benar-benar dibayar; regu api desa terlatih dan berperalatan; alternatif pembukaan lahan tanpa bakar yang layak ekonomi; pemantauan titik panas independen.",
         status="dikembangkan", dasar="MPA dan Brigdal karhutla di bawah Kementerian Kehutanan (Renas 1.2.3.d); Inpres 3/2020 (kutipan riset A, sekunder)",
         celah="Tidak ada evaluasi independen; skema insentif belum diadopsi pemerintah; perbandingan dengan desa nonpeserta belum dilakukan.",
         posisi="Uji coba terukur", unit="Direktorat Mitigasi Bencana;Direktorat Kesiapsiagaan", kl="Kementerian Kehutanan;BRGM;pemerintah daerah",
         renas="1.2.3", renstra="2", ripb_strategi="4e", catatan="Biaya per desa yang disebut rilis APRIL sengaja tidak disalin (aturan tanpa biaya proyek)."),
    dict(id="P06", nama="Restorasi gambut melalui sekat kanal (pembasahan)", kelompok="Dalam negeri", lokasi="Sumatra dan Kalimantan, lahan gambut", periode="2016-sekarang",
         lembaga="BRGM, Kementerian Kehutanan, pemegang konsesi", fase="prabencana", bencana="karhutla", aksi="infrastruktur", kajian="mitigasi",
         apa="Pembasahan gambut dengan sekat dan timbun kanal, sumur bor, revegetasi, dan revitalisasi ekonomi masyarakat.",
         dampak="Model hidrologi untuk 168 sekat kanal di 22.000 ha gambut Sumatra: rata-rata tahunan muka air tanah hanya naik 1,5 cm (1,44 cm tahun kering, 1,57 cm tahun basah); emisi karbon dioksida terhindar 1,07 dan 1,17 Mg/ha. Belum ditemukan bukti sekat kanal menurunkan kejadian kebakaran di skala lanskap.",
         jenis_eval="model", kekuatan="lemah",
         syarat="Lokasi sekat dioptimasi (bukan sebanyak-banyaknya); pemantauan muka air tanah rapat di luar tepi kanal; pemeliharaan sekat; disertai pencegahan pembakaran.",
         status="dikembangkan", dasar="BRGM (Perpres 120/2020, kutipan sekunder); Renas 2.3.3 dan 1.2.3.d (BRGM kontributor)",
         celah="Sebaran pemantauan muka air tanah sempit dan dekat kanal; efek pada kebakaran belum diukur.",
         posisi="Uji coba terukur", unit="Direktorat Mitigasi Bencana;Direktorat Pemetaan dan Evaluasi Risiko Bencana", kl="BRGM;Kementerian Kehutanan;Kementerian Lingkungan Hidup",
         renas="2.3.3", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P07", nama="Rekompak: rekonstruksi rumah berbasis komunitas, gempa Yogyakarta-Jawa Tengah 2006", kelompok="Dalam negeri", lokasi="DIY, Jawa Tengah, Jawa Barat",
         periode="2006-2012", lembaga="Kementerian PU dengan Java Reconstruction Fund (JRF, Bank Dunia sebagai wali amanat)", fase="pascabencana", bencana="gempa", aksi="kapasitas",
         kajian="mitigasi",
         apa="Dana langsung ke kelompok warga, rencana permukiman desa, fasilitator teknis, standar tahan gempa, dan pencairan bertahap yang dikunci mutu.",
         dampak="JRF membangun lebih dari 15.000 rumah tahan gempa; pemerintah menerapkan pendekatan yang sama untuk lebih dari 300.000 rumah (sumber lain menyebut 280.000 dalam dua tahun). Studi 2007 dan survei kepuasan 2008: biaya hingga 40% lebih rendah dari pendekatan non-komunitas, dan 30% lebih murah untuk spesifikasi identik.",
         jenis_eval="laporan-sendiri", kekuatan="sedang",
         syarat="Fasilitator teknis memadai; uji mutu struktur oleh pihak luar; data penerima transparan dan pengaduan berjalan; dana tersedia cepat.",
         status="dikembangkan", dasar="Perban BNPB 6/2017 Penyelenggaraan RR Pascabencana; Juklak BNPB 5/2024 DSP stimulan rumah (teks tidak ada di korpus); Renas 3.1.2.c",
         celah="Pola pokmas dipakai lagi (Lombok, Palu, Cianjur) tanpa evaluasi mutu independen yang dipublikasikan.",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Rehabilitasi dan Rekonstruksi Perumahan;Direktorat Rehabilitasi dan Rekonstruksi Sosial, Ekonomi, dan Lingkungan Hidup",
         kl="Kementerian Perumahan dan Kawasan Permukiman;Kementerian Pekerjaan Umum;pemerintah daerah", renas="3.1.2;3.2.1", renstra="4", ripb_strategi="6c", catatan=""),
    dict(id="P08", nama="BRR Aceh-Nias: badan rekonstruksi berbatas waktu", kelompok="Dalam negeri", lokasi="Aceh dan Nias", periode="2005-2009",
         lembaga="Badan Rehabilitasi dan Rekonstruksi (BRR) Aceh-Nias", fase="pascabencana", bencana="tsunami;gempa", aksi="regulasi", kajian="mitigasi",
         apa="Satu badan berbatas waktu mengoordinasikan dana APBN, donor, dan LSM serta proyek rekonstruksi perumahan, infrastruktur, dan penghidupan.",
         dampak="Dalam 4 tahun: 140.304 rumah permanen dibangun terhadap 139.195 rumah hancur; 1.759 sekolah dibangun (3.415 rusak); 1.115 fasilitas kesehatan (517 rusak); 3.696 km jalan (2.618 km rusak). Ini angka keluaran yang dilaporkan BRR sendiri, bukan uji mutu atau hunian.",
         jenis_eval="laporan-sendiri", kekuatan="sedang",
         syarat="Mandat hukum tegas dan berbatas waktu; satu pintu dana; serah terima aset ke pemda direncanakan sejak awal.",
         status="baru", dasar="Preseden BRR 2005-2009 (dasar hukum pembentukannya tidak diperiksa di sesi ini); belum ada templat badan/satgas rekonstruksi siap pakai",
         celah="Tiap bencana besar membentuk pengaturan ad hoc baru; pelajaran BRR (10 pelajaran manajemen) belum dibakukan.",
         posisi="Program dengan syarat (bukti sedang)", unit="Deputi Bidang Rehabilitasi dan Rekonstruksi;Biro Hukum, Organisasi, dan Kerja Sama",
         kl="Bappenas;Kementerian Keuangan;Kementerian Perumahan dan Kawasan Permukiman;pemerintah daerah", renas="3.2.1", renstra="4", ripb_strategi="6a", catatan=""),
    dict(id="P09", nama="Rehabilitasi-rekonstruksi rumah pascagempa Lombok 2018 (stimulan, pokmas, RISHA)", kelompok="Dalam negeri", lokasi="NTB", periode="2018-2020",
         lembaga="BNPB, Kementerian PU, BPBD NTB, pemda", fase="pascabencana", bencana="gempa", aksi="kapasitas", kajian="mitigasi",
         apa="Dana stimulan per kelas kerusakan lewat kelompok masyarakat, pilihan tipe rumah tahan gempa (RISHA, RIKO, RIKA, konvensional), dan fasilitator.",
         dampak="Per Maret 2020: 170.559 dari 226.204 rumah sasaran selesai (75,40%) dan 209.634 tertangani (92,67%). Per akhir Agustus 2020: sekitar 89% rumah rusak berat selesai, disebut ±65.000 atau ±68.000 dari 74.774 atau 74.707 unit (dua versi dalam satu rilis); pandemi dan realokasi anggaran disebut penghambat. Mutu RISHA terhadap guncangan belum diuji dan tidak ditemukan evaluasi independen.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Pendanaan cair tepat waktu; fasilitator cukup per desa; pilihan tipe rumah yang dapat dibangun dengan bahan dan tenaga lokal.",
         status="dikembangkan", dasar="Juklak BNPB 5/2024 DSP stimulan rumah; Renas 3.1.2.c",
         celah="Tidak ada evaluasi mutu dan kepuasan yang dipublikasikan; data progres resmi tidak konsisten di satu rilis.",
         posisi="Pelajaran, bukan teladan", unit="Direktorat Rehabilitasi dan Rekonstruksi Perumahan", kl="Kementerian Perumahan dan Kawasan Permukiman;Kementerian Pekerjaan Umum;Kementerian Keuangan",
         renas="3.1.2", renstra="4", ripb_strategi="6c", catatan=""),
    dict(id="P10", nama="Embung dan panen air hujan", kelompok="Dalam negeri", lokasi="Indonesia, lahan tadah hujan", periode="2015-sekarang",
         lembaga="Kementerian Pertanian, Kementerian PU, pemerintah desa", fase="prabencana", bencana="kekeringan", aksi="infrastruktur", kajian="air-jawa",
         apa="Penampungan air permukaan skala desa/pertanian untuk irigasi suplementer dan air baku musim kemarau.",
         dampak="Tidak ditemukan evaluasi dengan lahan pembanding. Pedoman Kementan menyatakan embung yang memenuhi kriteria teknis dapat menaikkan indeks pertanaman; angka kenaikan yang beredar berasal dari pernyataan dinas atau proyeksi pemerintah.",
         jenis_eval="tidak-ada-evaluasi-dampak", kekuatan="belum-terbukti",
         syarat="Lokasi dengan hujan cukup dan tanah tidak bocor; daerah layanan jelas; pemeliharaan dari sedimentasi; kelompok pengelola.",
         status="dikembangkan", dasar="Program Kementan dan Kementerian PU; Inpres 1/2018 tentang embung desa (kutipan riset B, sekunder)",
         celah="Tidak ada inventaris volume dan fungsi embung terbuka (repo hanya jumlah objek OSM per kab); tidak ada evaluasi.",
         posisi="Uji coba terukur", unit="Direktorat Mitigasi Bencana;Direktorat Pengembangan Strategi Penanggulangan Bencana",
         kl="Kementerian Pertanian;Kementerian Pekerjaan Umum;Kementerian Desa PDT", renas="", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P11", nama="Sumur resapan dan lubang resapan biopori", kelompok="Dalam negeri", lokasi="DKI Jakarta dan kota lain", periode="2010-sekarang",
         lembaga="Pemerintah daerah", fase="prabencana", bencana="banjir", aksi="infrastruktur", kajian="air-jawa",
         apa="Sumur dan lubang resapan di persil dan ruang publik untuk menahan limpasan dan mengisi air tanah dangkal.",
         dampak="Untuk Jakarta, pakar IPB menilai kontribusinya terhadap pengurangan banjir kecil pada hujan periode ulang di atas 2 tahun; efektif hanya bila muka air tanah lebih dari 2,5 m dan permeabilitas lebih dari 2,0 cm/jam. Model DAS Kamoning (Sampang) dengan vegetasi 40% ditambah sumur resapan dan injeksi menurunkan limpasan 78,14% (simulasi, bukan pengukuran). Tidak ditemukan pengukuran skala kota.",
         jenis_eval="pendapat-ahli", kekuatan="lemah",
         syarat="Muka air tanah dalam dan tanah permeabel; perawatan rutin; diposisikan sebagai pelengkap, bukan pengendali banjir.",
         status="dikembangkan", dasar="Program pemda (riset B: 29.833 titik di Jakarta per Des 2023, sekunder)",
         celah="Dibangun tanpa peta kelayakan hidrogeologi; tidak ada pengukuran kinerja.", posisi="Uji coba terukur",
         unit="Direktorat Mitigasi Bencana", kl="Kementerian Pekerjaan Umum;pemerintah daerah", renas="2.3.3", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P12", nama="Citarum Harum (pemulihan DAS Citarum)", kelompok="Dalam negeri", lokasi="DAS Citarum, Jawa Barat", periode="2018-2025",
         lembaga="Satgas PPK DAS Citarum (Perpres 15/2018), Pemprov Jawa Barat, TNI, K/L", fase="prabencana", bencana="banjir", aksi="regulasi", kajian="air-jawa",
         apa="Pengendalian pencemaran industri dan domestik, pengelolaan sampah, penertiban, rehabilitasi hulu, dan pemantauan kualitas air.",
         dampak="IKA Sungai Citarum naik dari 33,43 (2018, cemar berat) menjadi 50,78 (2023, cemar ringan) menurut pejabat Jawa Barat; versi lain 33,34 untuk 2018, 51,01 untuk 2022, dan 50,78 untuk Juni 2024. Target 60 pada akhir 2025. Metode dan titik pantau tidak dijelaskan di sumber yang dibuka, dan atribusi ke program belum diuji.",
         jenis_eval="data-resmi-pra-pasca", kekuatan="sedang",
         syarat="Komando lintas sektor dengan penegakan; pemantauan kualitas air terbuka dan konsisten; sanitasi domestik (sumber terbesar menurut DLH).",
         status="dikembangkan", dasar="Perpres 15/2018 (berakhir 2025; kutipan riset B, sekunder); pengelolaan diserahkan ke kab/kota mulai 2026 (sekunder)",
         celah="Data IKA tidak konsisten antarsumber; kelanjutan pasca-2025 belum jelas; relevansi bencana tidak langsung (air baku).",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Mitigasi Bencana;Direktorat Pemetaan dan Evaluasi Risiko Bencana",
         kl="Kementerian Lingkungan Hidup;Kementerian Pekerjaan Umum;Pemprov Jawa Barat", renas="2.3.3", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P13", nama="PAMSIMAS (penyediaan air minum dan sanitasi berbasis masyarakat)", kelompok="Dalam negeri", lokasi="Indonesia, perdesaan", periode="2008-2023",
         lembaga="Kementerian PU dengan Bank Dunia dan DFAT", fase="prabencana", bencana="kekeringan", aksi="infrastruktur", kajian="air-jawa",
         apa="Sistem air minum perdesaan dibangun dan dikelola kelompok warga (BP-SPAMS) dengan iuran, ditambah perubahan perilaku sanitasi.",
         dampak="Laporan penyelesaian Bank Dunia 2023 (ringkasan RWSN): layanan air berkelanjutan untuk ±24,8 juta jiwa (target awal 22,1 juta) di lebih dari 35.553 desa; ±91% sistem berfungsi baik. Evaluasi independen DFAT 2022 memperingatkan data MIS bisa menghitung ganda dan menaksir EIRR 30,8%.",
         jenis_eval="evaluasi-independen", kekuatan="sedang",
         syarat="Pengelola desa berfungsi dan iuran cukup untuk perawatan; sumber air tahan kemarau; pemantauan fungsi independen.",
         status="dikembangkan", dasar="Program Kementerian PU (fase III berakhir; kelanjutan tidak diverifikasi di sesi ini)",
         celah="Tidak terkait rencana kontinjensi kekeringan BPBD; ketahanan sumber air saat El Nino tidak diukur.",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Mitigasi Bencana;Direktorat Kesiapsiagaan",
         kl="Kementerian Pekerjaan Umum;Kementerian Kesehatan;Kementerian Desa PDT;pemerintah daerah", renas="", renstra="2", ripb_strategi="4f", catatan=""),
    dict(id="P14", nama="Sodetan dan bendungan kering Ciliwung", kelompok="Dalam negeri", lokasi="DAS Ciliwung, Jabodetabek", periode="2023-sekarang",
         lembaga="Kementerian PU (BBWS Ciliwung-Cisadane), Pemprov DKI", fase="prabencana", bencana="banjir", aksi="infrastruktur", kajian="air-jawa",
         apa="Sodetan Ciliwung ke Kanal Banjir Timur dan bendungan kering Ciawi dan Sukamahi untuk memangkas debit puncak.",
         dampak="Bendungan kering Ciawi menurunkan debit puncak 20,87% (267,17 menjadi 211,41 m³/detik) dan Sukamahi 7% saat banjir Maret 2025 (data BBWS dikutip media). Sodetan berkapasitas 60 m³/detik dari debit rencana 508 m³/detik; klaim pengurangan potensi banjir 62% di 6 kelurahan belum diuji pascaoperasi.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Operasi dan pemeliharaan; normalisasi hilir selesai; data debit dan genangan terbuka untuk evaluasi.",
         status="dikembangkan", dasar="Proyek Kementerian PU; Renas 2.2.2", celah="Tidak ada evaluasi pascaoperasi yang mengukur luas dan lama genangan.",
         posisi="Program berjalan, wajib evaluasi dampak", unit="Direktorat Mitigasi Bencana", kl="Kementerian Pekerjaan Umum;Pemprov DKI Jakarta",
         renas="2.2.2", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P15", nama="Sistem polder dan pompa kota pesisir", kelompok="Dalam negeri", lokasi="Jakarta, Semarang, Pekalongan", periode="2009-sekarang",
         lembaga="Kementerian PU, pemda", fase="prabencana", bencana="banjir;rob", aksi="infrastruktur", kajian="air-jawa",
         apa="Kawasan rendah dikelilingi tanggul, kolam retensi, dan pompa untuk membuang air ke laut.",
         dampak="Tidak ditemukan evaluasi kinerja kuantitatif. Kajian Polder Jati Pinggir (Jakarta) menemukan kapasitas saluran dan pompa kurang; di Pekalongan tanggul 2019 dilaporkan tenggelam pada 2022 karena penurunan tanah.",
         jenis_eval="tidak-ada-evaluasi-dampak", kekuatan="belum-terbukti",
         syarat="Penurunan tanah dihentikan; pompa dan listrik cadangan dipelihara; pengelola polder berbiaya tetap.",
         status="dikembangkan", dasar="Proyek Kementerian PU dan pemda; Renas 2.4.2 dan 2.4.4",
         celah="Tanpa penghentian pengambilan air tanah, tanggul dan polder terus tenggelam (lihat P16).",
         posisi="Program berjalan, wajib evaluasi dampak", unit="Direktorat Mitigasi Bencana", kl="Kementerian Pekerjaan Umum;pemerintah daerah",
         renas="2.4.2;2.4.4", renstra="2", ripb_strategi="4f", catatan=""),
    dict(id="P16", nama="Pengendalian pengambilan air tanah untuk menghentikan penurunan tanah (Tokyo, Osaka, Bangkok)", kelompok="Luar negeri", lokasi="Jepang (Tokyo, Osaka); Thailand (Bangkok)",
         periode="1956-1990-an", lembaga="Pemerintah Jepang dan Pemerintah Metropolitan Tokyo; Pemerintah Thailand", fase="prabencana", bencana="rob;banjir", aksi="regulasi", kajian="air-jawa",
         apa="Pasokan air pengganti (air industri dan perpipaan), larangan sumur dan zona kritis, izin dan tarif air tanah yang naik bertahap.",
         dampak="Tokyo: pengambilan air tanah di wilayah ku turun dari 1.160.000 m³/hari (1964) menjadi 128.000 m³/hari (1975); sumur sampai kedalaman 160 m dilarang (Desember 1971) dan yang lebih dalam dari 160 m (Mei 1974); laju penurunan tanah turun tiap tahun sejak 1972 setelah mencapai maksimum 27 cm/tahun dan penurunan kumulatif sekitar 4,6 m; air industri pengganti dipasok dari Sungai Tone. Bangkok: laju penurunan turun dari hingga 120 mm/tahun (1981) menjadi sekitar 20 mm/tahun setelah undang-undang pembatasan pompa sejak akhir 1980-an.",
         jenis_eval="data-resmi-pra-pasca", kekuatan="kuat",
         syarat="Pasokan air pengganti tersedia sebelum larangan; zona kritis berbasis pengukuran; tarif air tanah lebih mahal dari air perpipaan; penegakan izin; butuh 10-20 tahun.",
         status="dikembangkan", dasar="Pergub DKI 93/2021 zona bebas air tanah dan Kepmen ESDM 291.K/2023 (kutipan riset B, sekunder); Renas 2.4.4.a NSPK mitigasi subsiden (PJ KLH)",
         celah="Cakupan air perpipaan rendah di Pantura; data subsiden dan zona konservasi CAT tidak terbuka; kewenangan izin tersebar.",
         posisi="Program (bukti kuat)", unit="Direktorat Mitigasi Bencana;Direktorat Pemetaan dan Evaluasi Risiko Bencana;Direktorat Pengembangan Strategi Penanggulangan Bencana",
         kl="Kementerian ESDM;Kementerian Pekerjaan Umum;Kementerian Lingkungan Hidup;Kementerian ATR/BPN;pemerintah daerah", renas="2.4.4", renstra="2", ripb_strategi="3a",
         catatan="Osaka: Kementerian Lingkungan Jepang mencatat laju melambat setelah pengendalian 1960-an; angka Osaka tidak dikutip."),
    dict(id="P17", nama="Delta Programme Belanda (UU, dana, komisaris, laporan tahunan)", kelompok="Luar negeri", lokasi="Belanda", periode="2010-2050",
         lembaga="Delta Commissioner; Rijkswaterstaat; waterschappen", fase="prabencana", bencana="banjir;kekeringan", aksi="regulasi", kajian="air-jawa",
         apa="Delta Act 2012 membentuk program, dana jangka panjang, dan komisaris independen yang melapor tahunan ke kabinet dan parlemen dengan target 2050 per agenda.",
         dampak="Laporan kemajuan publik tahunan: agenda keamanan banjir 82% menuju target 2050, sementara air tawar dan adaptasi ruang masing-masing sekitar 10% (Delta Programme 2026). Ini indikator kemajuan pelaksanaan, bukan ukuran dampak kejadian.",
         jenis_eval="laporan-sendiri", kekuatan="sedang",
         syarat="Payung hukum, dana khusus multi-tahun, pemegang mandat independen, laporan kemajuan berangka.",
         status="baru", dasar="Indonesia belum punya program air lintas K/L berpayung undang-undang dengan komisaris dan laporan tahunan berangka",
         celah="Kewenangan air terbagi BBWS, pemda, PDAM, ESDM; tidak ada pelapor kemajuan tunggal.",
         posisi="Rujukan tata kelola", unit="Deputi Bidang Sistem dan Strategi;Direktorat Pengembangan Strategi Penanggulangan Bencana",
         kl="Bappenas;Kementerian Pekerjaan Umum;Kementerian Keuangan", renas="4.7.1", renstra="1", ripb_strategi="4c", catatan=""),
    dict(id="P18", nama="Room for the River (ruang untuk sungai)", kelompok="Luar negeri", lokasi="Belanda (Rhine, Waal, Meuse)", periode="2006-2019",
         lembaga="Rijkswaterstaat dan pemerintah daerah", fase="prabencana", bencana="banjir", aksi="infrastruktur", kajian="air-jawa",
         apa="Memberi ruang banjir: memindah tanggul, menggali saluran samping, menurunkan bantaran, sebagai ganti meninggikan tanggul.",
         dampak="Proyek Nijmegen-Lent (Waal) menurunkan muka air rencana 35 cm, melampaui target awal 27 cm, selesai 2016 (nilai desain/model, bukan muka air kejadian). Kajian ENW atas banjir Juli 2021 mencatat muka air Maas hilir Roermond lebih rendah dari banjir terdahulu, sebagian karena Maaswerken (kutipan sekunder).",
         jenis_eval="model", kekuatan="sedang",
         syarat="Lahan tersedia dan relokasi disepakati; penataan ruang mengikat; pemodelan hidraulik sebelum membangun.",
         status="baru", dasar="Belum ada kebijakan ruang untuk sungai; pengendalian banjir Jawa didominasi normalisasi dan tanggul",
         celah="Lahan bantaran padat; relokasi mahal secara sosial; perlu kawasan uji di DAS dengan lahan tersedia.",
         posisi="Uji coba terukur", unit="Direktorat Mitigasi Bencana;Direktorat Pengembangan Strategi Penanggulangan Bencana",
         kl="Kementerian Pekerjaan Umum;Kementerian ATR/BPN", renas="2.3.1", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P19", nama="Cyclone Preparedness Programme (CPP) Bangladesh", kelompok="Luar negeri", lokasi="Pesisir Bangladesh", periode="1972-sekarang",
         lembaga="Pemerintah Bangladesh dan Bangladesh Red Crescent Society", fase="prabencana;tanggap-darurat", bencana="cuaca-ekstrem;gelombang-abrasi", aksi="kapasitas", kajian="mitigasi",
         apa="Relawan desa menyebarkan peringatan berjenjang (megafon, bendera, sirene) dan memandu evakuasi ke shelter siklon; ditambah tanggul pesisir dan hutan mangrove.",
         dampak="Kematian akibat siklon: 500.300 (1970), 138.958 (1991), 410 (1997), 4.234 (Sidr 2007), 197 (2009); penulis menyebutnya penurunan 100 kali lipat 1970-2007. Lebih dari 20.000 relawan menyiarkan peringatan; 1.500 shelter sebelum 2007 ditambah 2.000 yang mulai dibangun. Penulis mencatat efek terpisah shelter, tanggul, dan penyadaran belum dibuktikan ilmiah. Angka 1970 diperdebatkan: 300.000 (WMO) hingga 1 juta (angka pemerintah).",
         jenis_eval="peer-review", kekuatan="kuat",
         syarat="Peringatan dini yang dipercaya; relawan desa terlatih dan berperalatan; shelter cukup dan layak; evakuasi dini sebelum angin kencang.",
         status="dikembangkan", dasar="Padanan di Indonesia: relawan PB, Destana, dan TES belum diberi mandat menyebarkan peringatan sampai rumah tangga",
         celah="Mata rantai peringatan ke rumah tangga (lihat P03) dan shelter evakuasi belum terukur.",
         posisi="Program (bukti kuat)", unit="Direktorat Peringatan Dini;Direktorat Kesiapsiagaan", kl="BMKG;Kementerian Sosial;pemerintah daerah",
         renas="1.1.2;4.5.1", renstra="2", ripb_strategi="2b;4e", catatan=""),
    dict(id="P20", nama="Kesiapsiagaan siklon Odisha (OSDMA): evakuasi preemptif dan shelter", kelompok="Luar negeri", lokasi="Odisha, India", periode="1999-sekarang",
         lembaga="Odisha State Disaster Management Authority (OSDMA)", fase="prabencana;tanggap-darurat", bencana="cuaca-ekstrem;banjir", aksi="kapasitas", kajian="mitigasi",
         apa="Badan PB provinsi pertama di India; shelter serbaguna, sistem komunikasi, dan evakuasi massal berbasis prakiraan.",
         dampak="Siklon Phailin 2013: 44 korban jiwa, 13,2 juta jiwa terdampak, lebih dari 1 juta jiwa dievakuasi dalam 36 jam sebelum pendaratan. Siklon Super 1999: sekitar 10.000 meninggal, 18 juta jiwa terdampak. Versi lain korban Phailin: 23 dan 38 (laporan awal).",
         jenis_eval="data-resmi-pra-pasca", kekuatan="kuat",
         syarat="Prakiraan jalur dan intensitas yang tepat; keputusan evakuasi dini oleh pemerintah daerah; shelter dan logistik siap; latihan berkala.",
         status="dikembangkan", dasar="Perban BNPB 9/2025 Rencana Penanggulangan Kedaruratan Bencana Daerah; Perban BNPB 2/2023 Rencana Kontingensi (katalog JDIH); Renas 1.2.1",
         celah="Pemicu evakuasi berbasis prakiraan (cuaca ekstrem, banjir) belum dibakukan.",
         posisi="Program (bukti kuat)", unit="Direktorat Peringatan Dini;Direktorat Koordinasi Pengendalian Operasi Darurat;Direktorat Kesiapsiagaan",
         kl="BMKG;pemerintah daerah;BPBD", renas="1.2.1", renstra="3", ripb_strategi="5a", catatan=""),
    dict(id="P21", nama="Pendidikan kebencanaan Kamaishi (Jepang)", kelompok="Luar negeri", lokasi="Kota Kamaishi, Iwate, Jepang", periode="2004-2011",
         lembaga="Dinas Pendidikan Kamaishi dengan Prof. T. Katada", fase="prabencana", bencana="tsunami;gempa", aksi="kapasitas", kajian="mitigasi",
         apa="Pendidikan tiga prinsip (jangan percaya peta bahaya, lakukan yang terbaik, pelopori evakuasi) dan latihan evakuasi mandiri di sekolah.",
         dampak="Saat tsunami Maret 2011, 99,8% dari sekitar 3.000 siswa SD dan SMP di 14 sekolah Kota Kamaishi selamat.",
         jenis_eval="data-resmi-pra-pasca", kekuatan="sedang",
         syarat="Latihan rutin yang menuntut keputusan sendiri; guru dilatih; jalur ke tempat tinggi; skenario melampaui peta bahaya.",
         status="dikembangkan", dasar="Padanan Indonesia: SPAB (P02)", celah="Satu kejadian tanpa kelompok pembanding terkontrol; SPAB belum mengukur hasil gladi.",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Kesiapsiagaan", kl="Kementerian Pendidikan Dasar dan Menengah;Kementerian Agama",
         renas="2.1.2;4.5.2", renstra="2", ripb_strategi="4g", catatan="Tahun mulai 2004 dari laman kedutaan Jepang (tidak dibuka); angka korban hanya dari JST."),
    dict(id="P22", nama="Kode bangunan tahan gempa Chile (NCh433) dan penegakannya", kelompok="Luar negeri", lokasi="Chile", periode="1972-sekarang",
         lembaga="Pemerintah Chile (komite kode seismik)", fase="prabencana", bencana="gempa", aksi="regulasi", kajian="mitigasi",
         apa="Kode seismik nasional dengan geser dasar minimum, ditegakkan lewat izin bangunan, dan diperbarui setelah tiap gempa besar.",
         dampak="Gempa Maule 2010 (Mw 8,8): dari bangunan hunian berizin 1985-2009, kegagalan 0,5% pada 9.974 bangunan tiga lantai atau lebih dan 2,8% pada 1.939 bangunan sembilan lantai atau lebih; sekitar 4 runtuh dan sekitar 50 harus dibongkar. Korban jiwa resmi sementara 528 (OCHA, Maret 2010).",
         jenis_eval="data-resmi-pra-pasca", kekuatan="kuat",
         syarat="Kode diperbarui dari pelajaran gempa; izin dan pengawasan konstruksi ditegakkan; insinyur tersertifikasi.",
         status="dikembangkan", dasar="Renas 2.3.4.a pengawasan penerapan standar bangunan tahan bencana (PJ Kementerian PU dan BNPB); SNI ketahanan gempa dan persetujuan bangunan gedung (rujukan umum, teks tidak diperiksa di sesi ini)",
         celah="Rumah nonteknis tidak tersentuh izin; pengawasan lemah (kerusakan Cianjur 2022).",
         posisi="Program (bukti kuat)", unit="Direktorat Mitigasi Bencana;Direktorat Rehabilitasi dan Rekonstruksi Perumahan",
         kl="Kementerian Pekerjaan Umum;Kementerian Perumahan dan Kawasan Permukiman;pemerintah daerah", renas="2.3.4", renstra="2", ripb_strategi="4f;6c", catatan=""),
    dict(id="P23", nama="Asuransi risiko bencana dan pooling regional (CCRIF, ARC; Asuransi BMN dan Dana Bersama PB)", kelompok="Luar negeri", lokasi="Karibia, Afrika; Indonesia",
         periode="2007-sekarang", lembaga="CCRIF SPC; African Risk Capacity; Kemenkeu (DJKN, BKF), BPDLH", fase="pascabencana", bencana="gempa;cuaca-ekstrem;kekeringan;banjir",
         aksi="pembiayaan", kajian="mitigasi",
         apa="Asuransi parametrik bagi pemerintah (pembayaran otomatis bila pemicu terpenuhi) dan asuransi aset negara; dana bersama untuk prabencana, darurat, pascabencana, dan transfer risiko.",
         dampak="CCRIF: 54 pembayaran ±US$245 juta ke 16 anggota sejak 2007, dibayar dalam 14 hari setelah bencana (versi 2023: 63 pembayaran, US$266,8 juta, 17 anggota). ARC (evaluasi independen OPM): ketepatan waktu pembayaran dinilai baik (3 dari 4 pembayaran di bawah target 30 hari), tetapi efektivitas rencana kontinjensi dan pemerataan dinilai buruk; hanya 16 dari 36 anggota membeli polis; premi reasuransi 81% dari harapan pembayaran. Indonesia: Asuransi BMN menutup klaim Rp1,14 miliar untuk 18 BMN pada 2020 (13 K/L peserta).",
         jenis_eval="evaluasi-independen", kekuatan="sedang",
         syarat="Pemicu parametrik yang cocok dengan kerugian nyata (risiko basis kecil); rencana penggunaan dana disiapkan sebelum bencana; premi terjangkau.",
         status="dikembangkan", dasar="Perpres 75/2021 Dana Bersama PB; PMK 97/2019 Asuransi BMN; Perban BNPB 1/2026; Renas 4.6.2, 4.6.3, 2.5.1.c",
         celah="Klaim ABMN kecil dibanding premi (2024, sekunder); dampak pembayaran pada kecepatan pemulihan belum diukur; SEADRIF (ASEAN) tidak ditelusuri di sesi ini.",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Pengembangan Strategi Penanggulangan Bencana;Biro Keuangan;Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur",
         kl="Kementerian Keuangan;BPDLH;Otoritas Jasa Keuangan", renas="4.6.2;4.6.3;2.5.1", renstra="6", ripb_strategi="3b", catatan=""),
    dict(id="P24", nama="Hibah mitigasi FEMA (HMGP, BRIC) dengan syarat analisis manfaat-biaya", kelompok="Luar negeri", lokasi="Amerika Serikat", periode="1993-sekarang",
         lembaga="FEMA; negara bagian", fase="prabencana", bencana="banjir;cuaca-ekstrem;gempa", aksi="pembiayaan", kajian="keduanya",
         apa="Hibah federal untuk proyek mitigasi (pembelian rumah di dataran banjir, ruang aman, perkuatan) yang wajib lolos analisis manfaat-biaya.",
         dampak="Analisis NIBS (lembar fakta FEMA, Juni 2018): hibah mitigasi federal menghemat rata-rata US$6 untuk tiap US$1 (studi 2005: 4:1); banjir sungai 7 kali, angin 5:1, gempa 3 kali untuk investasi publik dan 4 kali untuk desain di atas kode. Rasio ini hasil pemodelan, bukan pengukuran pascakejadian. Program BRIC dihentikan FEMA lalu pengadilan (Desember 2025) menyatakan penghentian melanggar hukum; FEMA mengajukan rencana memulai lagi (Maret 2026).",
         jenis_eval="model", kekuatan="sedang",
         syarat="Data kerugian dan bahaya untuk menghitung manfaat; standar analisis manfaat-biaya yang seragam; pendanaan stabil lintas tahun.",
         status="baru", dasar="Tidak ditemukan kewajiban analisis manfaat-biaya dalam Juklak 4/2025 (verifikasi memuat 'kelayakan teknis Rencana Anggaran Biaya')",
         celah="Usulan prabencana Dana Bersama dinilai tanpa rasio manfaat-biaya; data kerugian rupiah per kejadian (DIBI) belum konsisten.",
         posisi="Rujukan tata kelola", unit="Direktorat Pengembangan Strategi Penanggulangan Bencana;Direktorat Mitigasi Bencana;Biro Perencanaan",
         kl="Kementerian Keuangan;Bappenas;BPDLH", renas="4.6.2", renstra="2", ripb_strategi="3b;3c", catatan=""),
    dict(id="P25", nama="Evakuasi preemptif topan di Filipina (Albay, NDRRMC)", kelompok="Luar negeri", lokasi="Filipina", periode="2010-sekarang",
         lembaga="NDRRMC/OCD; pemerintah provinsi (APSEMO Albay)", fase="prabencana;tanggap-darurat", bencana="cuaca-ekstrem", aksi="kapasitas", kajian="mitigasi",
         apa="Evakuasi paksa sebelum topan berdasarkan prakiraan; target 'zero casualty' provinsi.",
         dampak="Topan Haiyan 2013 menewaskan lebih dari 6.000 orang (NDRRMC: 6.300 meninggal, 1.061 hilang); Topan Rai/Odette 2021 lebih dari 400 orang, dan WFP mengkreditkan langkah preemptif tanpa angka pembanding. Klaim zero casualty Albay (Topan Nona 2015) berasal dari gubernur; pada Topan Nina 2016 terjadi 4 kematian yang disebut kegagalan evakuasi.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Prakiraan tepat; kewenangan evakuasi paksa; tempat evakuasi layak.",
         status="dikembangkan", dasar="Perban BNPB 9/2025 RPKB daerah; Renas 1.2.1", celah="Perbandingan Haiyan dan Rai tidak mengendalikan kekuatan topan dan keterpaparan.",
         posisi="Pelajaran, bukan teladan", unit="Direktorat Kesiapsiagaan;Direktorat Koordinasi Pengendalian Operasi Darurat", kl="BMKG;pemerintah daerah;BPBD",
         renas="1.2.1", renstra="3", ripb_strategi="5a", catatan=""),
]

# ============================================================================ util

def angka(s, satuan=""):
    """Format id-ID -> float. 'WIB' dibaca jam.menit."""
    if satuan == "WIB":
        j, m = s.split(".")
        return int(j) + int(m) / 60
    return float(s.replace(".", "").replace(",", "."))


def angka_teks(s):
    """Token angka di teks naratif (tahun 4 digit 1900-2099 dikecualikan)."""
    out = []
    for t in re.findall(r"\d+(?:[.,]\d+)*", s):
        if re.fullmatch(r"(19|20)\d\d", t):
            continue
        out.append(t)
    return out


def tulis_csv(nama, kolom, baris):
    with open(os.path.join(OUT, nama), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(kolom)
        for b in baris:
            w.writerow(["" if b.get(k) is None else b.get(k) for k in kolom])
    return {"kolom": kolom, "baris": baris}


# ============================================================================ bangun

def bangun():
    os.makedirs(OUT, exist_ok=True)
    tema = json.load(open(TEMA, encoding="utf-8"))["kosakata"]
    tabel = {}

    # --- organisasi
    org = []
    for unit, jenis, induk, status, slug, kut, cat in ORG:
        org.append(dict(unit=unit, jenis=jenis, induk=induk, status=status, dasar=KORPUS[slug].split(" (")[0],
                        berkas=f"data/raw/hukum/teks/{slug}.json", halaman=hlm(slug, kut), kutipan=norm(kut),
                        wilayah_provinsi="", catatan=cat, label="resmi"))
    prov_semua = []
    for unit, kut in WIL_PD.items():
        h = hlm(O11, kut)
        prov = [p.strip() for p in re.findall(r"(?:Provinsi |Daerah Ibu Kota )([A-Z][A-Za-z ]+?)(?=,| dan|\.)", kut)]
        prov = [("Ibu Kota Nusantara" if p == "Nusantara" else p) for p in prov]
        r = next(o for o in org if o["unit"] == unit)
        r["wilayah_provinsi"] = "; ".join(prov)
        r["catatan"] = (r["catatan"] + "; " if r["catatan"] else "") + f"wilayah kerja Perban 11/2025 hlm. {h}"
        prov_semua += prov
    tabel["organisasi_bnpb"] = tulis_csv("organisasi_bnpb.csv",
                                         ["unit", "jenis", "induk", "status", "wilayah_provinsi", "dasar", "berkas", "halaman", "kutipan", "catatan", "label"], org)

    # --- Renstra
    rs = []
    for ss, nama, ind, base, tg in RENSTRA_SS:
        hal = hlm_urut(RS, ind, 132, 132)
        ada_deret(RS, 132, 132, tg)
        rs.append(dict(tingkat="sasaran strategis", kode=ss, program="", sasaran=nama, indikator=ind, baseline=base,
                       t2025=tg[0], t2026=tg[1], t2027=tg[2], t2028=tg[3], t2029=tg[4], unit_renstra="Kepala BNPB", unit_otk_berlaku="Kepala BNPB",
                       halaman=hal, label="resmi"))
    for kode, prog, sas, inds, unit in RENSTRA_PROGRAM:
        hlm(RS, f"{kode}. {prog}")  # daftar tujuh program, hlm. 103
        for ind, base, tg in inds:
            hal = hlm_urut(RS, ind, 130, 131, celah=6)
            ada_deret(RS, 132, 133, tg)
            rs.append(dict(tingkat="program", kode=f"P{kode}", program=prog, sasaran=sas, indikator=ind, baseline=base,
                           t2025=tg[0], t2026=tg[1], t2027=tg[2], t2028=tg[3], t2029=tg[4], unit_renstra=unit, unit_otk_berlaku=unit,
                           halaman=f"{hal}; target hlm. 132-133", label="resmi"))
    for kode, unit, sas, ind, tg, ocr in RENSTRA_SK:
        hlm_urut(RS, sas, 134, 140, celah=20)
        hal = hlm_urut(RS, ind, 134, 140, celah=20)
        ada_token(RS, 134, 140, ocr or [" ".join(tg)])  # deret lima tahun utuh (atau potongan OCR bila kolom bertukar)
        prog = next(p for k, p, *_ in RENSTRA_PROGRAM if k == kode)
        rs.append(dict(tingkat="sasaran kegiatan", kode=f"P{kode}", program=prog, sasaran=sas, indikator=ind, baseline="",
                       t2025=tg[0], t2026=tg[1], t2027=tg[2], t2028=tg[3], t2029=tg[4], unit_renstra=unit,
                       unit_otk_berlaku=PETA_UNIT_LAMA.get(unit, unit), halaman=hal, label="resmi"))
    tabel["renstra_bnpb_2025_2029"] = tulis_csv("renstra_bnpb_2025_2029.csv",
        ["tingkat", "kode", "program", "sasaran", "indikator", "baseline", "t2025", "t2026", "t2027", "t2028", "t2029",
         "unit_renstra", "unit_otk_berlaku", "halaman", "label"], rs)

    # --- Renas
    rn = []
    for i, k in enumerate(RENAS_KEBIJAKAN, 1):
        rn.append(dict(tingkat="kebijakan", kode=str(i), nama=k, induk="", fokus_ripb="", halaman=hlm(RN, f"{i}. {k}" if i == 1 else k), label="resmi"))
    for k, v in RENAS_SASARAN.items():
        rn.append(dict(tingkat="sasaran", kode=k, nama=v, induk="", fokus_ripb="", halaman=hlm_urut(RN, v, 32, 125, celah=3), label="resmi"))
    for k, v in RENAS_STRATEGI.items():
        rn.append(dict(tingkat="strategi", kode=k, nama=v, induk=k.split(".")[0], fokus_ripb="", halaman=hlm_urut(RN, v, 33, 125, celah=3), label="resmi"))
    # fokus capaian per program dibaca dari Tabel 3.1 (Rencana Aksi) dan dibandingkan dengan Tabel 2.9
    fk31, cur = {}, None
    for n, _, asli in dok(RN):
        if n < 49:
            continue
        for ln in asli.split("\n"):
            m = re.match(r"^\s*Program\s+(\d\.\d\.\d)\.?\s", ln)
            if m:
                cur = m.group(1)
            m = re.match(r"^\s*Fokus Capaian (\d+):\s*$", ln)
            if m and cur and cur not in fk31:
                fk31[cur] = int(m.group(1))
    for k, (nama, fc) in RENAS_PROGRAM.items():
        h = hlm(RN, nama)
        assert fk31.get(k) == fc, f"Renas program {k}: fokus capaian Tabel 2.9 = {fc}, Tabel 3.1 = {fk31.get(k)}"
        rn.append(dict(tingkat="program", kode=k, nama=nama, induk=k.rsplit(".", 1)[0], fokus_ripb=fc, halaman=h, label="resmi"))
    tabel["renas_pb_2025_2029"] = tulis_csv("renas_pb_2025_2029.csv", ["tingkat", "kode", "nama", "induk", "fokus_ripb", "halaman", "label"], rn)

    # --- RIPB
    rp = []
    for i, s in enumerate(RIPB_SASARAN, 1):
        rp.append(dict(tipe="sasaran", nomor=str(i), teks=s, kebijakan_induk="", halaman=hlm(RN, f"{i}. {s}"),
                       catatan="ejaan sesuai sumber" if "transpararan" in s else ""))
    for i, s in enumerate(RIPB_KEBIJAKAN, 1):
        rp.append(dict(tipe="kebijakan", nomor=str(i), teks=s, kebijakan_induk="", halaman=hlm(RN, f"{i}. {s}"), catatan=""))
    for kb, daftar in RIPB_STRATEGI.items():
        for huruf, s in daftar:
            rp.append(dict(tipe="strategi", nomor=f"{kb}{huruf}", teks=s, kebijakan_induk=str(kb), halaman=hlm_urut(RN, s, 14, 16, celah=15),
                           catatan="ejaan sesuai sumber" if "peralatanan" in s else ""))
    for i, s in RIPB_FOKUS.items():
        rp.append(dict(tipe="fokus capaian 2025-2029", nomor=str(i), teks=s, kebijakan_induk="", halaman=hlm(RN, f"Fokus Capaian {i}: {s}"), catatan=""))
    for r in rp:
        r.update(sumber="RIPB 2020-2044 (Perpres 87/2020) sebagaimana dikutip Renas PB 2025-2029", berkas=f"data/raw/hukum/teks/{RN}.json", label="resmi")
    tabel["ripb_2020_2044"] = tulis_csv("ripb_2020_2044.csv", ["tipe", "nomor", "teks", "kebijakan_induk", "halaman", "sumber", "berkas", "label", "catatan"], rp)

    # --- status Renas (tanpa pagu)
    sa = []
    for kode, keg, ind, sat, base, tgt, pj, kon, tok, cat in RENAS_AKSI:
        h = hlm(RN, kode)
        ada_token(RN, h, h + 1, tok)
        sa.append(dict(kode=kode, program_renas=kode.rsplit(".", 1)[0], kegiatan=keg, indikator=ind, satuan=sat, baseline_2024=base, target_2029=tgt,
                       penanggung_jawab=pj, kontributor=kon, halaman=h, label="resmi", catatan=cat))
    tabel["renas_aksi_terkait"] = tulis_csv("renas_aksi_terkait.csv",
        ["kode", "program_renas", "kegiatan", "indikator", "satuan", "baseline_2024", "target_2029", "penanggung_jawab", "kontributor", "halaman", "label", "catatan"], sa)

    # --- bukti
    bk = []
    for i, (pid, ind, nil, sat, per, peran, src, lok, lab, ver, kut, konf) in enumerate(B, 1):
        judul, penerbit, url, terbit = SUMBER[src]
        if ver == "korpus-lokal":
            if kut and not kut.startswith("angka"):
                h = hlm(SLUG[src], kut)
            else:  # angka resmi tanpa kalimat utuh: halaman yang memuat kode kegiatan / rentang tabel DAN nilainya
                m = re.search(r"kode (\S+)", lok)
                rentang = {"Tabel 4.6": (132, 133), "Tabel 4.7": (134, 140)}.get(lok, (0, 9999))
                cari = re.search(r"\((\S+?)\|", kut).group(1) if kut.startswith("angka") else nil  # angka terbelah baris: bagian sebelum '|'
                h = next((n for n, t, _ in dok(SLUG[src]) if rentang[0] <= n <= rentang[1] and cari in t and (not m or m.group(1) in t)), None)
                assert h, f"{pid}: nilai resmi {nil} ({lok}) tidak ditemukan di korpus {src}"
            lok = f"{lok}, hlm. {h}"
        bk.append(dict(id=f"B{i:03d}", program=pid, indikator=ind, nilai=nil, nilai_angka=(round(angka(nil, sat), 6) if nil else ""),
                       satuan=sat, periode=per, peran=peran, sumber=judul, penerbit=penerbit, url_atau_berkas=url, terbit=terbit, lokasi=lok,
                       tanggal_akses=TGL, label=lab, verifikasi=ver, kutipan_atau_catatan=kut, grup_konflik=konf))
    tabel["bukti_dampak"] = tulis_csv("bukti_dampak.csv",
        ["id", "program", "indikator", "nilai", "nilai_angka", "satuan", "periode", "peran", "sumber", "penerbit", "url_atau_berkas", "terbit",
         "lokasi", "tanggal_akses", "label", "verifikasi", "kutipan_atau_catatan", "grup_konflik"], bk)

    # --- kompendium
    unit_berlaku = {o["unit"] for o in org if o["status"] == "berlaku"}
    kp = []
    for p in K:
        r = dict(p)
        r["status_label"] = tema["status_usulan"][p["status"]]["label"]
        r["keyakinan"] = ";".join(dict.fromkeys(b["label"] for b in bk if b["program"] == p["id"] and b["nilai"]))
        r["renstra_program"] = next(pr for k, pr, *_ in RENSTRA_PROGRAM if k == p["renstra"])
        r["fokus_ripb"] = ";".join(str(RENAS_PROGRAM[c][1]) for c in p["renas"].split(";") if c)
        r["jumlah_bukti"] = sum(b["program"] == p["id"] for b in bk)
        kp.append(r)
    kol = ["id", "nama", "kelompok", "lokasi", "periode", "lembaga", "fase", "bencana", "aksi", "kajian", "apa", "dampak", "jenis_eval", "kekuatan",
           "keyakinan", "jumlah_bukti", "syarat", "status", "status_label", "dasar", "celah", "posisi", "unit", "kl", "renas", "fokus_ripb", "ripb_strategi",
           "renstra", "renstra_program", "catatan"]
    tabel["kompendium_program"] = tulis_csv("kompendium_program.csv", kol, kp)

    cek(tabel, tema, unit_berlaku, prov_semua)
    meta = dict(paket="program-terbukti", dibangun=TGL, skrip="data/kajian-bnpb/bangun/program-terbukti.py",
                korpus={s: dict(judul=j, sha1=sha1(os.path.join(HUKUM, s + ".json"))) for s, j in KORPUS.items()},
                label={"resmi": "instansi pemerintah", "terverifikasi": "sumber primer non-pemerintah yang dibuka",
                       "estimasi-model": "keluaran mesin platform (tidak dipakai di paket ini)", "asumsi-kebijakan": "parameter pilihan (tidak dipakai di paket ini)"},
                verifikasi=VERIF, kekuatan=KEKUATAN, posisi=POSISI,
                sumber={k: dict(judul=v[0], penerbit=v[1], url_atau_berkas=v[2], terbit=v[3]) for k, v in SUMBER.items()})
    json.dump(dict(meta=meta, tabel=tabel), open(os.path.join(OUT, "program-terbukti.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    tulis_md(kp, bk, org, rs, rn, rp, sa, tema)
    return tabel


# ============================================================================ self-check

def cek(t, tema, unit_berlaku, prov):
    org, rs, rn, rp = (t[k]["baris"] for k in ("organisasi_bnpb", "renstra_bnpb_2025_2029", "renas_pb_2025_2029", "ripb_2020_2044"))
    kp, bk, sa = t["kompendium_program"]["baris"], t["bukti_dampak"]["baris"], t["renas_aksi_terkait"]["baris"]
    berlaku = Counter(o["jenis"] for o in org if o["status"] == "berlaku")
    assert berlaku["Deputi"] == 5 and berlaku["Direktorat"] == 15 and berlaku["Biro"] == 4 and berlaku["Inspektorat"] == 3 and berlaku["Pusat"] == 3, berlaku
    p38 = [p for p in prov if p != "Ibu Kota Nusantara"]
    assert len(p38) == len(set(p38)) == 38, f"wilayah Direktorat PD: {len(p38)} provinsi ({len(set(p38))} unik), harus 38"
    jw = {p: u for o in org for u, p in [(o["unit"], q) for q in o["wilayah_provinsi"].split("; ") if q]}
    assert JAWA <= set(jw), f"provinsi Jawa tanpa direktorat: {JAWA - set(jw)}"
    # pasal Inspektorat II yang masih menyebut Pusat Pengendalian Operasi tidak diubah Perban 11/2025
    assert "Pusat Pengendalian Operasi" in " ".join(t for n, t, _ in dok(O6) if n in (22, 23)) and "Pasal 106" not in " ".join(t for _, t, _ in dok(O11))
    assert Counter(r["tingkat"] for r in rs)["program"] == 12 and len({r["program"] for r in rs if r["tingkat"] == "program"}) == 7  # 7 program, 12 IKP
    c = Counter(r["tingkat"] for r in rn)
    assert (c["kebijakan"], c["sasaran"], c["strategi"], c["program"]) == (6, 4, 19, 44), c
    c = Counter(r["tipe"] for r in rp)
    assert (c["sasaran"], c["kebijakan"], c["strategi"], c["fokus capaian 2025-2029"]) == (5, 6, 23, 12), c
    kode_renas = set(RENAS_PROGRAM)
    assert all(r["program_renas"] in kode_renas for r in sa)
    assert not re.search(r"pagu|anggaran proyek|biaya proyek", json.dumps([sa, bk], ensure_ascii=False), re.I), "angka pagu/biaya proyek bocor ke keluaran"

    ids = {p["id"] for p in kp}
    assert len(ids) == len(kp) == 25
    per = defaultdict(list)
    for b in bk:
        assert b["program"] in ids, b
        assert b["label"] in LABEL and b["verifikasi"] in VERIF, b
        assert b["url_atau_berkas"] and b["tanggal_akses"] == TGL, b
        if b["nilai"]:
            assert re.fullmatch(r"\d+(?:[.,]\d+)*", b["nilai"]), f"{b['id']}: nilai {b['nilai']!r} bukan format angka id-ID"
            assert isinstance(b["nilai_angka"], float) and math.isfinite(b["nilai_angka"]), b
        else:
            assert b["peran"] == "temuan-kualitatif" and b["kutipan_atau_catatan"], f"{b['id']}: baris tanpa angka wajib temuan kualitatif berkutipan"
        if b["verifikasi"] == "korpus-lokal" and b["kutipan_atau_catatan"] and not b["kutipan_atau_catatan"].startswith("angka"):
            hlm(SLUG[[k for k, v in SUMBER.items() if v[0] == b["sumber"]][0]], b["kutipan_atau_catatan"])
            assert not b["nilai"] or b["nilai"] in b["kutipan_atau_catatan"], f"{b['id']}: nilai {b['nilai']} tidak ada di kutipannya sendiri"
        per[b["program"]].append(b)
    for g, n in Counter(b["grup_konflik"] for b in bk if b["grup_konflik"]).items():
        assert n >= 2, f"grup konflik {g} hanya {n} baris (versi pembanding hilang)"
    vocab = {"fase": set(tema["fase"]) - {"_aturan"}, "bencana": set(tema["jenis_bencana"]), "aksi": set(tema["jenis_aksi"])}
    for p in kp:
        for f in ("nama", "lokasi", "periode", "lembaga", "apa", "dampak", "syarat", "dasar", "celah", "unit", "kl"):
            assert p[f], f"{p['id']}: kolom {f} kosong"
        for f, v in vocab.items():
            assert set(p[f].split(";")) <= v, f"{p['id']}: {f} di luar kosakata tema.json: {set(p[f].split(';')) - v}"
        assert p["status"] in tema["status_usulan"] and p["kekuatan"] in KEKUATAN and p["posisi"] in POSISI and p["jenis_eval"] in JENIS_EVAL, p["id"]
        assert set(p["unit"].split(";")) <= unit_berlaku, f"{p['id']}: unit bukan unit OTK berlaku: {set(p['unit'].split(';')) - unit_berlaku}"
        assert all(c in kode_renas for c in p["renas"].split(";") if c), p["id"]
        ripb = {f"{k}{h}" for k, d in RIPB_STRATEGI.items() for h, _ in d}
        assert set(p["ripb_strategi"].split(";")) <= ripb, p["id"]
        bp = per[p["id"]]
        assert bp, f"{p['id']}: tanpa baris bukti"
        nilai = {b["nilai"] for b in bp if b["nilai"]}
        hilang = [x for x in angka_teks(p["dampak"]) if x not in nilai]
        assert not hilang, f"{p['id']}: angka di teks dampak tanpa baris bukti bersumber: {hilang}"
        kuat = [b for b in bp if b["verifikasi"] in ("korpus-lokal", "dibuka-langsung") and b["nilai"]]
        if p["kekuatan"] == "kuat":
            assert p["jenis_eval"] in ("peer-review", "evaluasi-independen", "data-resmi-pra-pasca"), p["id"]
            assert len(kuat) >= 2, f"{p['id']}: 'kuat' bertumpu pada < 2 angka yang dibuka langsung"
        if p["posisi"] == "Program (bukti kuat)":
            assert p["kekuatan"] == "kuat", p["id"]
        if p["kekuatan"] == "belum-terbukti":
            assert p["posisi"] in ("Program berjalan, wajib evaluasi dampak", "Uji coba terukur"), f"{p['id']}: program belum terbukti tidak boleh diusulkan sebagai program"
    # dasar hukum dalam negeri yang disebut kolom `dasar` dan ada di korpus: judul/isi wajib ketemu
    for slug, kut in [("perka-nomor-4-tahun-2012", "PEDOMAN PENERAPAN SEKOLAH/MADRASAH AMAN DARI BENCANA"),
                      ("perban-nomor-2-tahun-2024", "TENTANG SISTEM PERINGATAN DINI BENCANA"),
                      ("perban-nomor-7-tahun-2025", "Pedoman Umum Desa/Kelurahan Tangguh Bencana sudah tidak sesuai dengan perkembangan kebutuhan hukum, sehingga perlu diganti"),
                      ("perban-nomor-7-tahun-2025", "a. Desa dan Kelurahan tangguh utama; b. Desa dan Kelurahan tangguh madya; dan c. Desa dan Kelurahan tangguh pratama."),
                      (RN, "belum semua menerapkan satuan pendidikan aman bencana")]:
        hlm(slug, kut)
    # perlindungan jebakan di Juklak: bila kelak teksnya memuat kewajiban analisis manfaat-biaya, status P24 harus ditinjau
    juk = " ".join(t for _, t, _ in dok("juklak-nomor-4-tahun-2025")).lower()
    assert not re.search(r"manfaat[- ]biaya|benefit[- ]cost|rasio manfaat", juk), "Juklak 4/2025 kini memuat analisis manfaat-biaya: tinjau status P24"


# ============================================================================ kompendium.md

def tulis_md(kp, bk, org, rs, rn, rp, sa, tema):
    L = []
    w = L.append
    nb = Counter(p["kekuatan"] for p in kp)
    w("# Kompendium program yang terbukti: mitigasi bencana dan ketahanan air")
    w("")
    w(f"Dibangun {TGL} oleh `data/kajian-bnpb/bangun/program-terbukti.py` dari data di folder ini. Jangan disunting tangan: ubah skrip, lalu jalankan ulang.")
    w("")
    w("**Cara membaca.** Tiap program diberi *kekuatan bukti* (kuat, sedang, lemah, belum terbukti), *posisi* usulan, dan *status* di Indonesia. "
      "Sesuai prinsip 9 KERANGKA, program yang belum terbukti tidak diusulkan sebagai program baru; paling jauh uji coba terukur, atau, bila sudah berjalan, "
      "wajib dievaluasi dampaknya. Setiap angka di teks punya baris di `bukti_dampak.csv` dengan sumber, label keyakinan, dan cara verifikasi "
      "(dicek mesin). Biaya dan pagu proyek sengaja tidak dicantumkan.")
    w("")
    w(f"Ringkas: {len(kp)} program ({sum(p['kelompok'] == 'Dalam negeri' for p in kp)} dalam negeri, {sum(p['kelompok'] == 'Luar negeri' for p in kp)} luar negeri); "
      f"bukti kuat {nb['kuat']}, sedang {nb['sedang']}, lemah {nb['lemah']}, belum terbukti {nb['belum-terbukti']}; {len(bk)} baris bukti.")
    w("")
    w("| ID | Program | Lokasi | Kekuatan bukti | Posisi | Status di Indonesia |")
    w("| --- | --- | --- | --- | --- | --- |")
    for p in kp:
        w(f"| {p['id']} | {p['nama']} | {p['lokasi']} | {p['kekuatan']} | {p['posisi']} | {p['status_label']} |")
    w("")
    w("## 1. Program per program")
    for p in kp:
        w("")
        w(f"### {p['id']}. {p['nama']}")
        w("")
        w(f"- **Lokasi dan periode:** {p['lokasi']}, {p['periode']}. **Pelaksana:** {p['lembaga']}.")
        w(f"- **Fase / bencana / jenis aksi:** {p['fase'].replace(';', ', ')} / {p['bencana'].replace(';', ', ')} / {p['aksi']}. **Kajian:** {p['kajian']}.")
        w(f"- **Yang dilakukan:** {p['apa']}")
        w(f"- **Dampak terukur:** {p['dampak']}")
        w(f"- **Kekuatan bukti:** {p['kekuatan']} ({KEKUATAN[p['kekuatan']]}); jenis evaluasi: {p['jenis_eval']}; label angka: {p['keyakinan'] or '-'}.")
        w(f"- **Syarat keberhasilan:** {p['syarat']}")
        w(f"- **Status di Indonesia:** {p['status_label']}. {p['dasar']}.")
        w(f"- **Celah:** {p['celah']}")
        w(f"- **Posisi dalam kajian:** {p['posisi']}.")
        w(f"- **Unit BNPB:** {p['unit'].replace(';', '; ')}. **K/L:** {p['kl'].replace(';', '; ')}.")
        w(f"- **Tabel silang:** Renas {p['renas'].replace(';', ', ') or '-'} (fokus RIPB {p['fokus_ripb'].replace(';', ', ') or '-'}); strategi RIPB {p['ripb_strategi'].replace(';', ', ')}; "
          f"Renstra: {p['renstra_program']}.")
        if p["catatan"]:
            w(f"- **Catatan:** {p['catatan']}")
        w("")
        w("| Bukti | Indikator | Nilai | Periode | Label | Verifikasi | Sumber |")
        w("| --- | --- | --- | --- | --- | --- | --- |")
        for b in (b for b in bk if b["program"] == p["id"]):
            nil = f"{b['nilai']} {b['satuan']}".strip() if b["nilai"] else "(kualitatif)"
            w(f"| {b['id']} | {b['indikator']} | {nil} | {b['periode']} | {b['label']} | {b['verifikasi']} | {b['penerbit']}, {b['lokasi']} |")
    w("")
    w("## 2. Susunan organisasi BNPB berlaku (Perban 6/2025 jo. Perban 11/2025)")
    w("")
    w("| Unit | Jenis | Induk | Wilayah kerja | Hlm. |")
    w("| --- | --- | --- | --- | --- |")
    for o in org:
        if o["status"] == "berlaku" and o["jenis"] not in ("Bagian",):
            w(f"| {o['unit']} | {o['jenis']} | {o['induk']} | {o['wilayah_provinsi'] or '-'} | {o['halaman']} ({'P11' if '11' in o['dasar'] else 'P6'}) |")
    w("")
    w("Unit yang diganti Perban 11/2025 tetapi masih dipakai Renstra 2025-2029: " +
      "; ".join(f"{o['unit']}" for o in org if o["status"] != "berlaku") + ". Pemetaan ke unit baru ada di `renstra_bnpb_2025_2029.csv` kolom `unit_otk_berlaku`.")
    w("")
    w("## 3. Renstra BNPB 2025-2029: tujuh program dan indikatornya")
    w("")
    w("| Program | Indikator kinerja program | 2025 | 2029 | Unit |")
    w("| --- | --- | --- | --- | --- |")
    for r in rs:
        if r["tingkat"] == "program":
            w(f"| {r['program']} | {r['indikator']} | {r['t2025']} | {r['t2029']} | {r['unit_renstra']} |")
    w("")
    w("## 4. Renas PB 2025-2029: program dan fokus capaian RIPB")
    w("")
    w("| Kode | Program Renas | Fokus RIPB | Program kompendium terkait |")
    w("| --- | --- | --- | --- |")
    for r in rn:
        if r["tingkat"] == "program":
            ter = ", ".join(p["id"] for p in kp if r["kode"] in p["renas"].split(";"))
            w(f"| {r['kode']} | {r['nama']} | {r['fokus_ripb']} | {ter or '-'} |")
    w("")
    w("## 5. RIPB 2020-2044: kebijakan, strategi, dan fokus capaian 2025-2029 (untuk tabel silang)")
    w("")
    for r in rp:
        if r["tipe"] == "kebijakan":
            w(f"- **Kebijakan {r['nomor']}.** {r['teks']}")
            for s in (s for s in rp if s["tipe"] == "strategi" and s["kebijakan_induk"] == r["nomor"]):
                ter = ", ".join(p["id"] for p in kp if s["nomor"] in p["ripb_strategi"].split(";"))
                w(f"  - {s['nomor']}. {s['teks']}{' (' + ter + ')' if ter else ''}")
    w("")
    for r in rp:
        if r["tipe"] == "fokus capaian 2025-2029":
            w(f"- **Fokus capaian {r['nomor']}.** {r['teks']}")
    w("")
    w("## 6. Batas kompendium")
    w("")
    w("- Angka berlabel `ringkasan-mesin-cari` belum dibaca dari dokumen primernya dan wajib dicek sebelum naskah final.")
    w("- Program dalam negeri hampir semuanya tanpa evaluasi dampak berpembanding; kekuatan bukti mencerminkan ketiadaan itu, bukan penilaian manfaat.")
    w("- Nomenklatur K/L mengikuti Renas PB 2025-2029 (kabinet 2024); belum dicek ke susunan kabinet Oktober 2026.")
    open(os.path.join(OUT, "kompendium.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")


if __name__ == "__main__":
    t = bangun()
    print(" ".join(f"{k}={len(v['baris'])}" for k, v in t.items()))
    print("self-check hijau")
