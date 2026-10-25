#!/usr/bin/env python3
"""Paket `program-terbukti`: kompendium program mitigasi dan ketahanan air yang TERBUKTI (atau belum), dalam dan luar
negeri, untuk dua kajian Kepala BNPB (Okt 2026), ditambah tabel silang kelembagaan dan perencanaan BNPB.

Jalankan dari akar repo:  python3 data/kajian-bnpb/bangun/program-terbukti.py
Menulis data/kajian-bnpb/data/program-terbukti/*.csv + program-terbukti.json + kompendium.md, lalu self-check assert
(gagal = keluar non-nol). Python 3 stdlib saja, luring. Silsilah: data/kajian-bnpb/data/program-terbukti/README.md.

Masukan:
  data/raw/hukum/teks/*.json   korpus JDIH BNPB lokal (daftar KORPUS di bawah: OTK, Renstra, Renas, Destana, SPAB, SPDB,
                               peringatan dini, RR, kontingensi, RPKB, Dana Bersama). Tiap nama unit, program, sasaran,
                               angka resmi, dan judul peraturan yang disebut kolom `dasar` DICEK ke teks ini.
  data/raw/hukum/indeks.json   metadata JDIH (judul, tanggal penetapan, status) untuk silsilah korpus
  data/kajian-bnpb/tema.json   kosakata kode (status usulan, fase, jenis bencana, jenis aksi, keyakinan)
  data/kajian-bnpb/riset/B-air-jawa.md   angka `via-riset`: kutipannya dicek mesin ke berkas ini
  SUMBER di bawah              dokumen web yang dibuka 23 Okt 2026 (langsung atau lewat salinan web.archive.org);
                               kutipan verbatim yang memuat angkanya disimpan per baris bukti dan dicek mesin.
Tidak ada pagu, anggaran, atau biaya proyek di keluaran (aturan kajian; dicek mesin).
"""
import csv, datetime, hashlib, json, math, os, re, sys
from collections import Counter, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P("data/kajian-bnpb/data/program-terbukti")
HUKUM = P("data/raw/hukum/teks")
TEMA = P("data/kajian-bnpb/tema.json")
TGL = "2026-10-23"
LABEL = {"resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan"}
LABEL_ARTI = {"resmi": "diterbitkan lembaga pemerintah berwenang (PEDOMAN §C6.2); di paket ini hanya baris dari sumber PEMERINTAH (dicek mesin)",
              "terverifikasi": "sumber primer non-resmi yang dibaca langsung; juga batas atas untuk media, blog, dan riset [SEKUNDER] yang mengutip instansi",
              "estimasi-model": "keluaran model atau simulasi, termasuk taksiran ekonomi dan nilai desain, siapa pun pembuatnya (PEDOMAN §C6.2); "
                                "belum diuji balik oleh paket ini",
              "asumsi-kebijakan": "nilai pilihan (tidak dipakai di paket ini)",
              "belum-dibaca": "bukan label keyakinan: angka dari ringkasan mesin pencari yang sumber primernya tidak terbuka; dilarang di kolom dampak"}
VERIF = {"korpus-lokal": "teks JDIH di repo; kutipan dicek mesin",
         "dibuka-langsung": "dokumen dibuka 23 Okt 2026 (langsung atau salinan arsip); kutipan verbatim memuat nilainya (dicek mesin)",
         "via-riset": "dikutip dari berkas riset di repo; kutipan dicek mesin ke berkas itu; label tidak boleh melebihi tanda riset",
         "ringkasan-mesin-cari": "dokumen primer tidak dapat dibuka; angka dari ringkasan mesin pencari. Berlabel `belum-dibaca`, "
                                 "tidak boleh dipakai di kolom dampak (dicek mesin). Saat ini tidak ada baris seperti ini."}
LABEL_BELUM = "belum-dibaca"  # bukan label keyakinan: penanda baris yang angkanya belum dibaca dari sumber primer
KEKUATAN = {"kuat": "deret data pra-pasca resmi atau studi bertinjauan, pola konsisten lintas kejadian/lokasi",
            "sedang": "data terukur tetapi satu kejadian, tanpa pembanding terkontrol, atau hasil pemodelan terdokumentasi",
            "lemah": "laporan sendiri pelaksana atau klaim pejabat tanpa pembanding",
            "belum-terbukti": "tidak ditemukan evaluasi dampak kuantitatif"}
POSISI = ["Program (bukti kuat)", "Program dengan syarat (bukti sedang)", "Program berjalan, wajib evaluasi dampak",
          "Uji coba terukur", "Rujukan tata kelola", "Pelajaran, bukan teladan"]
JENIS_EVAL = {"peer-review", "evaluasi-independen", "data-resmi-pra-pasca", "kejadian-tunggal", "laporan-sendiri", "pendapat-ahli",
              "model", "tidak-ada-evaluasi-dampak"}
# rubrik KEKUATAN ditegakkan mesin: jenis evaluasi membatasi kekuatan yang boleh diklaim
KEKUATAN_BOLEH = {"peer-review": {"kuat", "sedang"}, "evaluasi-independen": {"kuat", "sedang"}, "data-resmi-pra-pasca": {"kuat", "sedang"},
                  "kejadian-tunggal": {"sedang", "lemah"}, "model": {"sedang", "lemah"}, "laporan-sendiri": {"lemah"},
                  "pendapat-ahli": {"lemah"}, "tidak-ada-evaluasi-dampak": {"belum-terbukti"}}
POSISI_BOLEH = {"Program (bukti kuat)": {"kuat"}, "Program dengan syarat (bukti sedang)": {"sedang"},
                "Program berjalan, wajib evaluasi dampak": {"sedang", "lemah", "belum-terbukti"}, "Uji coba terukur": {"sedang", "lemah", "belum-terbukti"},
                "Rujukan tata kelola": {"sedang", "lemah"}, "Pelajaran, bukan teladan": {"sedang", "lemah"}}
PERAN = {"sebelum": "nilai sebelum program/kejadian pembanding", "sesudah": "nilai sesudah program", "hasil": "hasil terukur atau keluaran",
         "pembanding": "nilai pembanding (wilayah, varietas, studi lain)", "klaim": "klaim pelaksana tanpa metode",
         "target": "target program (non-Indonesia atau non-resmi)", "target-resmi": "target dalam peraturan/dokumen resmi Indonesia",
         "status-resmi": "capaian/baseline dalam dokumen resmi Indonesia", "temuan-kualitatif": "temuan tanpa angka, wajib berkutipan",
         "pendapat-ahli": "pendapat pakar yang dikutip", "masukan-model": "parameter masukan atau sampel model (bukan keluaran)"}
# catatan kekuatan bukti per program, bila yang terbukti bukan program itu sendirian
KEKUATAN_CATATAN = {
    "P19": "Yang terbukti adalah paket intervensi (peringatan dini CPP, shelter, tanggul pesisir, penyadaran) sebagai satu kesatuan; "
           "Haque dkk. menulis belum ada bukti ilmiah dampak terpisah shelter, tanggul, atau program penyadaran. CPP sendirian tidak terbukti.",
    "P20": "Pembanding hanya dua badai berbeda (1999 lawan 2013); naik ke kuat bila kejadian resmi lain (mis. Fani 2019) ditambahkan dari dokumen yang dibuka.",
    "P22": "Satu gempa, tanpa periode pra dan tanpa pembanding bangunan nonkode; naik ke kuat bila kinerja gedung gempa terdahulu (mis. 1985) ditambahkan.",
}

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


def _tok_tabel(slug, dari, sampai):
    """Token tabel (dipisah spasi) di rentang halaman: token '%' saja dibuang dan '%' di ujung dilepas (OCR sering memindahnya)."""
    teks = " ".join(t for n, t, _ in dok(slug) if dari <= n <= sampai)
    return [w.rstrip("%") for w in teks.split() if w.strip("%")]


def _kata(w):
    return re.sub(r"[^\w/]", "", w.lower())


def deret_terikat(slug, dari, sampai, indikator, potongan, celah=10, jendela=6):
    """Deret target terikat ke baris indikatornya: tiap potongan deret (urutan token bersambung) wajib mulai di dalam rentang
    kata-kata indikator (dicocokkan berurutan, jarak antarkata <= celah) atau paling jauh `jendela` token sesudahnya.
    Mencegah deret baris lain (mis. '100% x5' yang berulang, atau target IKP b dan c yang ditukar) ikut lolos."""
    tok = _tok_tabel(slug, dari, sampai)
    kt = [_kata(w) for w in tok]
    q = [_kata(w) for w in indikator.split() if _kata(w)]
    pots = [[w.rstrip("%") for w in p.split() if w.strip("%")] for p in potongan]
    for s0 in (i for i, w in enumerate(kt) if cocok(q[0], w) or (len(q) > 1 and q[0] + q[1] == w)):
        p, k, ok = s0, (2 if len(q) > 1 and q[0] + q[1] == kt[s0] else 1), True
        while k < len(q):
            rentang = range(p + 1, min(len(kt), p + 1 + celah))
            j = next((j for j in rentang if k + 1 < len(q) and q[k] + q[k + 1] == kt[j]), None)  # "pasca bencana" = "pascabencana"
            if j is not None:
                p, k = j, k + 2
                continue
            j = next((j for j in rentang if cocok(q[k], kt[j])), None)
            if j is None:  # kata OCR terbelah ("D aerah") boleh cocok dengan dua token bersambung
                j = next((j + 1 for j in rentang if j + 1 < len(kt) and q[k] == kt[j] + kt[j + 1]), None)
            if j is None:
                ok = False
                break
            p, k = j, k + 1
        if not ok:
            continue
        if all(any(tok[i:i + len(d)] == d for i in range(s0, min(len(tok), p + jendela + 1))) for d in pots):
            return True
    raise AssertionError(f"{slug} hlm {dari}-{sampai}: deret {potongan} tidak terikat ke indikator {indikator[:70]!r}")


def urut_baris(slug, kode, tok, dari):
    """Token baris Rencana Aksi muncul BERURUTAN (mis. baseline sebelum target) antara kode kegiatan dan kode berikutnya."""
    teks = " ".join(t for n, t, _ in dok(slug) if dari <= n <= dari + 1)
    i = teks.index(kode)
    m = re.compile(r"\b\d\.\d\.\d\.[a-z]\b").search(teks, i + len(kode))
    baris = teks[i:m.start() if m else len(teks)]
    p = 0
    for t in tok:
        j = baris.find(t, p)
        assert j >= 0, f"{slug} {kode}: token {t!r} tidak ada (atau tidak berurutan) di baris: {baris[:160]!r}"
        p = j + len(t)


def sha1(path):
    return hashlib.sha1(open(path, "rb").read()).hexdigest()


def tanggal_berkas(path):
    """Tanggal tarik teks korpus = tanggal ubah berkas teks JDIH (ditarik ulang = tanggal baru, SHA-1 ikut berubah)."""
    return datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()


KORPUS = {"perban-nomor-6-tahun-2025": "Peraturan BNPB No. 6/2025 tentang Organisasi dan Tata Kerja BNPB (ditetapkan 6 Okt 2025)",
          "perban-nomor-11-tahun-2025": "Peraturan BNPB No. 11/2025 tentang Perubahan atas Perban 6/2025 (ditetapkan 30 Des 2025)",
          "perban-nomor-5-tahun-2025": "Peraturan BNPB No. 5/2025 tentang Renstra BNPB 2025-2029",
          "perban-nomor-1-tahun-2025": "Peraturan BNPB No. 1/2025 tentang Renas PB 2025-2029 (memuat kutipan RIPB 2020-2044)",
          "perban-nomor-7-tahun-2025": "Peraturan BNPB No. 7/2025 tentang Desa dan Kelurahan Tangguh Bencana",
          "perka-nomor-4-tahun-2012": "Perka BNPB No. 4/2012 tentang Pedoman Penerapan Sekolah/Madrasah Aman dari Bencana",
          "perka-nomor-1-tahun-2012": "Perka BNPB No. 1/2012 tentang Pedoman Umum Desa/Kelurahan Tangguh Bencana (diganti Perban 7/2025)",
          "perban-nomor-2-tahun-2024": "Peraturan BNPB No. 2/2024 tentang Sistem Peringatan Dini Bencana",
          "juklak-nomor-4-tahun-2025": "Juklak BNPB No. 4/2025 Penelaahan, Verifikasi, dan Evaluasi Penyaluran Dana Bersama PB Tahap Prabencana",
          "perban-nomor-1-tahun-2024": "Peraturan BNPB No. 1/2024 tentang Penelaahan, Verifikasi dan Evaluasi Penyaluran Dana Bersama PB (dicabut Perban 1/2026 Pasal 34)",
          "perban-nomor-1-tahun-2026": "Peraturan BNPB No. 1/2026 tentang Pelaksanaan Penelaahan, Verifikasi, dan Evaluasi terhadap Penyaluran Dana Bersama PB",
          "perban-nomor-4-tahun-2022": "Peraturan BNPB No. 4/2022 tentang Pelaksanaan Peringatan Dini Bencana pada BNPB dan BPBD",
          "perban-nomor-6-tahun-2017": "Peraturan BNPB No. 6/2017 tentang Penyelenggaraan Rehabilitasi dan Rekonstruksi Pascabencana",
          "perban-nomor-9-tahun-2025": "Peraturan BNPB No. 9/2025 tentang Penyusunan dan Uji Coba Rencana Penanggulangan Kedaruratan Bencana Daerah",
          "perban-nomor-2-tahun-2023": "Peraturan BNPB No. 2/2023 tentang Penyusunan Rencana Kontingensi Bencana",
          "juklak-nomor-1-tahun-2025": "Juklak BNPB No. 1/2025 Penelaahan, Verifikasi, dan Evaluasi Penyaluran Dana Bersama PB Tahap Pascabencana",
          "juklak-nomor-3-tahun-2025": "Juklak BNPB No. 3/2025 Reviu Permohonan Penyaluran Dana Bersama PB",
          "juklak-nomor-6-tahun-2025": "Juklak BNPB No. 6/2025 Pemberian Pertimbangan untuk Penyaluran (Dana Bersama PB)",
          "juklak-nomor-2-tahun-2026": "Juklak BNPB No. 2/2026 Standar Komponen Biaya Usulan Kegiatan Penyaluran Dana Bersama PB Tahap Prabencana"}
# judul resmi (huruf kapital di halaman judul) tiap peraturan yang disebut kolom `dasar`: dicek mesin ke halaman 1-2
JUDUL_DASAR = {"perka-nomor-4-tahun-2012": "PEDOMAN PENERAPAN SEKOLAH/MADRASAH AMAN DARI BENCANA",
               "perban-nomor-2-tahun-2024": "TENTANG SISTEM PERINGATAN DINI BENCANA",
               "perban-nomor-4-tahun-2022": "PELAKSANAAN PERINGATAN DINI BENCANA PADA BADAN NASIONAL PENANGGULANGAN BENCANA DAN BADAN PENANGGULANGAN BENCANA DAERAH",
               "perban-nomor-6-tahun-2017": "PENYELENGGARAAN REHABILITASI DAN REKONSTRUKSI PASCABENCANA",
               "perban-nomor-9-tahun-2025": "PENYUSUNAN DAN UJI COBA RENCANA PENANGGULANGAN KEDARURATAN BENCANA DAERAH",
               "perban-nomor-2-tahun-2023": "PENYUSUNAN RENCANA KONTINGENSI BENCANA",
               "perban-nomor-1-tahun-2026": "PELAKSANAAN PENELAAHAN, VERIFIKASI, DAN EVALUASI TERHADAP PENYALURAN DANA BERSAMA PENANGGULANGAN BENCANA"}
# instrumen Dana Bersama yang wajib bebas syarat manfaat-biaya agar status "baru" P24 tetap benar
DANA_BERSAMA = ["perban-nomor-1-tahun-2026", "juklak-nomor-1-tahun-2025", "juklak-nomor-3-tahun-2025", "juklak-nomor-4-tahun-2025",
                "juklak-nomor-6-tahun-2025", "juklak-nomor-2-tahun-2026"]
RE_MANFAAT_BIAYA = re.compile(r"manfaat[- ]biaya|biaya[- ]manfaat|benefit[- ]cost|cost[- ]benefit|rasio manfaat|\bBCR\b|kelayakan ekonomi", re.I)
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
     "Kementerian Dalam Negeri", ["1)546", "1)1.495", "2)8.412", "2)8.642"], ""),
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
     "Kementerian Pendidikan Dasar dan Menengah; Kementerian Agama", "BNPB", ["38.946.64", "4.433.2", "249.168", "286.734", "2) 10.280", "3) 449", "2) 4.110", "3) 29"],
     "angka peserta didik terbelah baris di teks OCR (4.433.2|62 dan 38.946.64|5); kolom bertumpuk di OCR sehingga urutan baseline/target baris ini tidak dapat dicek mesin (token dicek dalam urutan teks); target tenaga pendidik lebih kecil dari baseline, sesuai tertulis"),
    ("2.3.3.a", "Fasilitasi, Pembinaan, dan Rehabilitasi DAS, Hutan, dan Lahan", "1) area rehabilitasi hutan dan lahan secara vegetatif", "hektar",
     "N/A", "1) 200.000", "Kementerian Kehutanan", "", ["1) 200.000"], "indikator 2)-5) tidak disalin"),
    ("2.3.3.b", "Fasilitasi, Pembinaan, dan Rehabilitasi DTA dan Daerah Imbuhan Mata Air", "1) luas DTA danau yang dipulihkan", "hektar",
     "N/A", "1) 10000", "Kementerian Kehutanan", "", ["1) 10000", "Imbuhan"], ""),
    ("2.3.4.a", "Peningkatan Pengawasan Penerapan Standar Bangunan Tahan Bencana", "rekomendasi tindak lanjut penerapan standar bangunan tahan bencana",
     "dokumen/rekomendasi kebijakan", "-", "50", "Kementerian Pekerjaan Umum; BNPB", "Kementerian Perumahan dan Kawasan Permukiman", ["- 50", "Bangunan"], ""),
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

# kunci -> (judul, penerbit, url atau berkas, terbit, akses). akses: "korpus" (teks JDIH lokal), "repo" (berkas riset di repo),
# "langsung" (dibuka dari URL-nya), atau "arsip <URL web.archive.org>" (URL asli menolak dibuka; salinan arsip yang dibaca).
SUMBER = {
    # korpus lokal
    "RENSTRA": ("Peraturan BNPB No. 5/2025 tentang Renstra BNPB 2025-2029", "BNPB", "data/raw/hukum/teks/perban-nomor-5-tahun-2025.json", "2025-10-03", "korpus"),
    "RENAS": ("Peraturan BNPB No. 1/2025 tentang Renas PB 2025-2029", "BNPB", "data/raw/hukum/teks/perban-nomor-1-tahun-2025.json", "2025-01-06", "korpus"),
    "PERBAN7": ("Peraturan BNPB No. 7/2025 tentang Desa dan Kelurahan Tangguh Bencana", "BNPB", "data/raw/hukum/teks/perban-nomor-7-tahun-2025.json", "2025-10-24", "korpus"),
    "PERBAN1_26": ("Peraturan BNPB No. 1/2026 tentang Pelaksanaan Penelaahan, Verifikasi, dan Evaluasi terhadap Penyaluran Dana Bersama PB", "BNPB",
                   "data/raw/hukum/teks/perban-nomor-1-tahun-2026.json", "2026-03-10", "korpus"),
    "JUKLAK4": ("Juklak BNPB No. 4/2025 Penyaluran Dana Bersama PB Tahap Prabencana", "BNPB", "data/raw/hukum/teks/juklak-nomor-4-tahun-2025.json", "2025-08-21", "korpus"),
    # riset repo
    "RISET_B": ("Riset B: Desk research pengelolaan air Pulau Jawa (bagian 2.3, 9)", "kajian-bnpb", "data/kajian-bnpb/riset/B-air-jawa.md", "2026-10-23", "repo"),
    # web
    "BMKG_SLI19": ("BMKG Dukung Peningkatan Produktivitas Pertanian melalui Sekolah Lapang Iklim (siaran pers)", "BMKG",
                   "https://www.bmkg.go.id/siaran-pers/bmkg-dukung-peningkatan-produktivitas-pertanian-melalui-sekolah-lapang-iklim", "2019-07-09", "langsung"),
    "BMKG_SLI16": ("Panen Raya SLI Tahap III Provinsi Jambi", "BMKG", "https://www.bmkg.go.id/berita/utama/panen-raya-sli-tahap-iii-provinsi-jambi", "2016-09-22", "langsung"),
    "KONTAN_PALU": ("Inilah deretan fakta tentang tsunami Palu", "Kontan (mengutip Kepala BMKG)", "https://nasional.kontan.co.id/news/inilah-deretan-fakta-yang-tentang-tsunami-palu",
                    "2018-09-29", "langsung"),
    "CGTN_PALU": ("Laporan pencabutan peringatan tsunami Palu (pernyataan Kapus Gempa dan Tsunami BMKG)", "CGTN (mengutip BMKG)",
                  "https://news.cgtn.com/news/3d3d774e3359544e7a457a6333566d54/share_amp.html", "2018-09", "langsung"),
    "APRIL16": ("APRIL Group builds on successful Fire Free Village Programme (siaran pers)", "APRIL Group",
                "https://www.rgei.com/attachments/article/565/20160102-april-group-builds-on-successful-fire-free-village-programme.pdf", "2016-02-01", "langsung"),
    "RAPP18": ("PT RAPP successfully suppresses fire through Fire Free Village Program over past four years (media release)", "PT RAPP",
               "https://www.rgei.com/attachments/article/1113/ffvp-anniversary-26-07-2018.pdf", "2018-07-26", "langsung"),
    "URZAINKI23": ("Urzainki dkk. (2023), Biogeosciences 20:2099-2116, doi:10.5194/bg-20-2099-2023", "Copernicus", "https://bg.copernicus.org/articles/20/2099/2023/", "2023",
                   "langsung"),
    "DPR_BRGM": ("Info Singkat Komisi IV Vol. XVII No. 11/I/Pusaka/Juni/2025 (dampak kelembagaan berakhirnya BRGM)", "Pusat Analisis Keparlemenan, Setjen DPR RI",
                 "https://berkas.dpr.go.id/pusaka/files/info_singkat/Info%20Singkat-XVII-11-I-P3DI-Juni-2025-189.pdf", "2025-06",
                 "arsip http://web.archive.org/web/20250719140944/https://berkas.dpr.go.id/pusaka/files/info_singkat/Info%20Singkat-XVII-11-I-P3DI-Juni-2025-189.pdf"),
    "REKOMPAK12": ("Rekompak: Rebuilding Indonesia's Communities After Disasters", "Sekretariat MDF dan JRF, Bank Dunia",
                   "https://documents1.worldbank.org/curated/en/128361468267347740/pdf/665520WP0Box380UBLIC00rekompak0book.pdf", "2012-10", "langsung"),
    "BRR09": ("BRR Book Series: Case Study - The Scattered Beads", "BRR Aceh-Nias", "https://aset-sejarah.dibi.bnpb.go.id/media/assets/arsip/6748628c6962c.pdf", "2009", "langsung"),
    "PMK_NTB_MAR20": ("Pemerintah Upayakan Percepatan Penanganan Pascabencana Gempa Bumi NTB", "Kemenko PMK",
                      "https://www.kemenkopmk.go.id/pemerintah-upayakan-percepatan-penanganan-pascabencana-gempa-bumi-ntb", "2020-03-13", "langsung"),
    "PMK_NTB_AGT20": ("Menko PMK Serah Terima 65 Ribu Huntap Pasca Gempa NTB", "Kemenko PMK", "https://kemenkopmk.go.id/menko-pmk-serah-terima-65-ribu-huntap-pasca-gempa-ntb",
                      "2020-08-28", "langsung"),
    "DETIK_SUMUR": ("Apakah Sumur Resapan Efektif Atasi Banjir Jakarta? Ini Kata Pakar IPB", "detikEdu (mengutip S.D. Tarigan, IPB)",
                    "https://www.detik.com/edu/edutainment/d-5850237/apakah-sumur-resapan-efektif-atasi-banjir-jakarta-ini-kata-pakar-ipb", "2021-12-11", "langsung"),
    "DETIK_CITARUM": ("Sungai Citarum yang Belum Harum", "detikJabar (angka IKA dalam narasi wartawan tanpa sumber data; target 60 dari Pj Gubernur Jawa Barat)",
                      "https://www.detik.com/jabar/berita/d-7387076/sungai-citarum-yang-belum-harum", "2024-06-12", "langsung"),
    "RWSN_PAMSIMAS": ("PAMSIMAS III (ringkasan ICR Bank Dunia 2023)", "Rural Water Supply Network", "https://rural-water-supply.net/en/resources/1221-pamsimas3", "2023", "langsung"),
    "DFAT_PAMSIMAS": ("PAMSIMAS Final Independent Evaluation, Volume 1 (Final V.2), commissioned by DFAT", "Murray dkk., untuk DFAT Australia",
                      "https://www.dfat.gov.au/sites/default/files/pamsimas-independent-evaluation.pdf", "2023-01-09",
                      "arsip http://web.archive.org/web/20251023113557/https://www.dfat.gov.au/sites/default/files/pamsimas-independent-evaluation.pdf"),
    "UNESCO_TOKYO": ("Yamamoto, S., Case History 9.4 Tokyo, dalam Guidebook to Studies of Land Subsidence due to Ground-Water Withdrawal", "UNESCO",
                     "https://wwwrcamnl.wr.usgs.gov/rgws/Unesco/PDF-Chapters/Chapter9-4.pdf", "1984", "langsung"),
    "MOE_JP": ("Water/Soil/Ground Environment: Ground Subsidence", "Ministry of the Environment, Japan", "https://www.env.go.jp/en/water/wq/wemj/ground.html", "t.t.", "langsung"),
    "AIST_BKK": ("Tanaka, A. & Mio, A. (2013), Ground deformation signals detected by SAR interferometry along the Chao Praya River (abstrak JpGU STT57-01; mengutip Phien-wej dkk. 2006)",
                 "Geological Survey of Japan, AIST", "https://www2.jpgu.org/meeting/2013/session/PDF/S-TT57/STT57-01.pdf", "2013", "langsung"),
    "DP2026": ("Delta Programme 2026 (situs ringkasan berbahasa Inggris)", "Pemerintah Belanda (Delta Commissioner)", "https://dp2026.deltaprogramma.nl/en", "2025-09", "langsung"),
    "EEA_RFTR": ("Room for the River Waal: protecting the city of Nijmegen (studi kasus)", "Climate-ADAPT, European Environment Agency",
                 "https://climate-adapt.eea.europa.eu/en/metadata/case-studies/room-for-the-river-waal-2013-protecting-the-city-of-nijmegen", "t.t.", "langsung"),
    "ENW21": ("Hoogwater 2021: Feiten en Duiding", "Expertisenetwerk Waterveiligheid (ENW)", "https://www.enwinfo.nl/publish/pages/183541/211102_enw_hoogwater_2021-dv-def.pdf", "2021",
              "langsung"),
    "HAQUE12": ("Haque dkk. (2012), Reduced death rates from cyclones in Bangladesh: what more needs to be done? Bull. WHO 90(2):150-156",
                "Bulletin of the World Health Organization", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3302549/", "2012-02", "langsung"),
    "PW_BHOLA": ("What's changed since the 1970 Great Bhola Cyclone (blog, Denis Mc Clean, UNDRR)", "PreventionWeb (UNDRR); angka 1970 dikutip dari kajian WMO dan kepala CPP",
                 "https://www.preventionweb.net/blog/whats-changed-1970-great-bhola-cyclone", "2020-11-12", "langsung"),
    "ODISHA_RDNA": ("India: Cyclone Phailin in Odisha, October 2013, Rapid Damage and Needs Assessment Report", "Pemerintah Odisha, ADB, Bank Dunia",
                    "https://documents1.worldbank.org/curated/en/168471468257979992/pdf/838860WP0P14880Box0382116B00PUBLIC0.pdf", "2013-12", "langsung"),
    "WB_PHAILIN": ("Cyclone Phailin in India: Early warning and timely actions saved lives (feature)", "Bank Dunia",
                   "https://www.worldbank.org/en/news/feature/2013/10/17/india-cyclone-phailin-destruction-preparation", "2013-10-17",
                   "arsip http://web.archive.org/web/20140831154132/http://www.worldbank.org/en/news/feature/2013/10/17/india-cyclone-phailin-destruction-preparation"),
    "JST_KATADA": ("For achieving zero victims in a natural disaster: dynamic hazard map and disaster prevention education (Katada)", "Japan Science and Technology Agency",
                   "https://www.jst.go.jp/EN/achievements/research/pdf/toshitaka_katada2016.pdf", "2016", "langsung"),
    "CHILE_WCEE": ("Guendelman, Saragoni, Verdugo (2012), Chilean Emergency Seismic Design Code for Building after El Maule 2010 Earthquake, 15WCEE",
                   "15th World Conference on Earthquake Engineering", "https://www.iitk.ac.in/nicee/wcee/article/WCEE2012_4480.pdf", "2012", "langsung"),
    "ECHO_CHILE": ("Factsheet Chile earthquake (08/03/2010), MEMO/10/71", "ECHO, Komisi Eropa (dimuat ReliefWeb/OCHA)", "https://reliefweb.int/report/chile/factsheet-chile-earthquake-08032010",
                   "2010-03-09", "langsung"),
    "WB_CCRIF": ("Risk insurance builds climate and disaster resilience in Central America and the Caribbean (results brief)", "Bank Dunia",
                 "https://www.worldbank.org/en/results/2022/04/21/risk-insurance-builds-climate-and-disaster-resilience-in-central-america-and-the-caribbean", "2022-04-21", "langsung"),
    "ARTEMIS_CCRIF": ("CCRIF parametric payouts reach $266.8m after $4.9m for 2023 Atlantic storms", "Artemis",
                      "https://www.artemis.bm/news/ccrif-parametric-payouts-reach-266-8m-after-4-9m-for-2023-atlantic-storms/", "2023-12-27", "langsung"),
    "OPM_ARC": ("Value for money in sovereign drought insurance: findings from a VfM analysis of the African Risk Capacity (briefing note 3)", "Oxford Policy Management (didanai FCDO)",
                "https://www.opml.co.uk/sites/default/files/migrated_bolt_files/arc-policy-brief-3-vfm.pdf", "2022", "langsung"),
    "DJKN_ABMN": ("Asuransi BMN Terima Klaim Kerugian Negara Akibat Bencana di Tahun 2020", "DJKN Kemenkeu",
                  "https://www.djkn.kemenkeu.go.id/berita/baca/22986/Asuransi-BMN-Terima-Klaim-Kerugian-Negara-Rp114-Milyar-Akibat-Bencana-di-Tahun-2020.html", "2021-01-23", "langsung"),
    "BISNIS_ABMN": ("Konsorsium Asuransi Gedung 'Pelat Merah' Raup Premi Rp132,1 Miliar per Oktober 2024 dari Kemenkeu", "Bisnis.com (mengutip Kasubdit Humas DJKN)",
                    "https://finansial.bisnis.com/read/20241112/215/1815454/konsorsium-asuransi-barang-negara-raup-premi-rp1321-miliar-per-oktober-2024-dari-kemenkeu", "2024-11-12",
                    "langsung"),
    "FEMA18": ("Natural Hazard Mitigation Saves Interim Report (fact sheet)", "FEMA Federal Insurance and Mitigation Administration (analisis NIBS)",
               "https://www.fema.gov/sites/default/files/2020-07/fema_mitsaves-factsheet_2018.pdf", "2018-06",
               "arsip http://web.archive.org/web/20261010001614/https://www.fema.gov/sites/default/files/2020-07/fema_mitsaves-factsheet_2018.pdf"),
    "NCDOJ26": ("FEMA Concedes in BRIC Funding Case; Files Plan to Reinstate Water, Sewer, and Flood Protection Program (siaran pers)", "North Carolina Department of Justice",
                "https://ncdoj.gov/fema-concedes-in-bric-funding-case-files-plan-to-reinstate-water-sewer-and-flood-protection-program-make-1-billion-in-new-grants-available/",
                "2026-03-24", "langsung"),
    "WFP23": ("Prep ka na ba? Are you ready? 30 initiatives that enabled emergency preparedness and response", "World Food Programme",
              "https://wfp.org/publications/prep-ka-na-ba-are-you-ready-30-initiatives-enabled-emergency-preparedness-and-response", "2023-12-18", "langsung"),
    "INQ_NONA": ("No death in Albay during 'Nona' - Salceda", "Philippine Daily Inquirer",
                 "https://newsinfo.inquirer.net/747715/no-death-in-albay-during-nona-due-to-preemptive-evacuation-prayers-salceda", "2015-12", "langsung"),
    "INQ_NINA": ("Albay typhoon deaths blamed on 'evacuation failure'", "Philippine Daily Inquirer",
                 "https://newsinfo.inquirer.net/857036/albay-official-blames-typhoon-deaths-to-evacuation-failure", "2016-12-27", "langsung"),
}
# Penerbit instansi pemerintah: hanya baris dari sumber ini yang boleh berlabel `resmi` (PEDOMAN §C6.2 "diterbitkan lembaga pemerintah
# berwenang"). Media, blog, jurnal, donor, dan evaluator yang mengutip instansi paling tinggi `terverifikasi`.
PEMERINTAH = {"RENSTRA", "RENAS", "PERBAN7", "PERBAN1_26", "JUKLAK4", "BMKG_SLI19", "BMKG_SLI16", "DPR_BRGM", "BRR09", "PMK_NTB_MAR20",
              "PMK_NTB_AGT20", "MOE_JP", "DP2026", "ODISHA_RDNA", "DJKN_ABMN", "FEMA18", "NCDOJ26"}
# Angka atau klaim yang dibuang setelah sumbernya dibuka 23 Okt 2026 (dicatat agar tidak masuk lagi lewat ringkasan mesin pencari).
DIBUANG = [
    ("P07", "280.000 rumah dalam dua tahun", "siaran pers Bank Dunia 25 Okt 2011 (salinan arsip web.archive.org 2020-12-05) dibuka: angka itu tidak ada; "
     "buku Rekompak sendiri menulis 300.000 rumah selesai dua tahun setelah gempa (hlm. 104 cetak)"),
    ("P20", "23 korban jiwa Phailin (laporan awal World Vision)", "dokumen World Vision tidak teridentifikasi; tidak ada URL yang bisa dibuka"),
    ("P25", "6.300 meninggal dan 1.061 hilang Topan Haiyan (NDRRMC via Inquirer)", "artikel Inquirer yang memuatnya tidak ditemukan; artikel Inquirer Nov-Des 2013 yang "
     "terbuka hanya memuat deret 3.633 sampai 5.936 meninggal dan 1.779 hilang; laporan akhir NDRRMC tidak dibuka"),
]
# Nomenklatur K/L yang sudah tidak berlaku per Oktober 2026 (KERANGKA prinsip 11). Kolom kl/lembaga kompendium tidak boleh memakainya;
# baris Renas yang disalin verbatim diberi catatan.
NAMA_KL_LAMA = {
    "BRGM": dict(pengganti="Kementerian Kehutanan; Kementerian Lingkungan Hidup; Kementerian Kelautan dan Perikanan", sejak="BRGM berakhir 31 Des 2024", sumber="DPR_BRGM",
                 kutipan="Per 31 Desember 2024, BRGM resmi mengakhiri masa tugasnya dan dibubarkan berdasarkan Surat Menteri Sekretariat Negara Nomor "
                         "B.175/M/D-1/HK.03.00/04/2025 tertanggal 17 April 2025", lokasi="hlm. 1; pembagian tugas hlm. 3"),
    "Kementerian BUMN": dict(pengganti="Badan Pengaturan BUMN (BP BUMN)", sejak="sejak Okt 2025", sumber="BISNIS_BPBUMN",
                             kutipan="Nomenklatur resmi berubah Badan Pengaturan BUMN (BP BUMN)", lokasi="paragraf 1 (RUU perubahan keempat UU BUMN disahkan 2 Okt 2025)"),
}
SUMBER["BISNIS_BPBUMN"] = ("Kementerian BUMN Resmi jadi BP BUMN, Setelah DPR Setujui Revisi UU BUMN", "Bisnis.com (Kabar24)",
                           "https://kabar24.bisnis.com/read/20251002/15/1916859/kementerian-bumn-resmi-jadi-bp-bumn-setelah-dpr-setujui-revisi-uu-bumn", "2025-10-02", "langsung")

# ============================================================================ bukti per angka

# (program, indikator, nilai, satuan, periode, peran, sumber, lokasi, label, verifikasi, kutipan, catatan, konflik_dengan)
# kutipan = teks verbatim dari sumber yang memuat nilainya (dicek mesin: nilai dalam format id/en/spasi/kata ada di kutipan);
# catatan = keterangan penyusun. Korpus lokal: kutipan dicek ke teks JDIH; "(a|b)" di catatan = angka terbelah baris di OCR.
B = [
    # P01 Destana
    ("P01", "desa/kelurahan mendapat pembinaan menghadapi bencana (baseline)", "2.234", "desa/kelurahan", "2024", "status-resmi", "RENAS", "Tabel 3.1 kode 4.5.1.a", "resmi", "korpus-lokal", "", "", ""),
    ("P01", "desa/kelurahan mendapat pembinaan menghadapi bencana (target)", "7.234", "desa/kelurahan", "2029", "target-resmi", "RENAS", "Tabel 3.1 kode 4.5.1.a", "resmi", "korpus-lokal", "", "", ""),
    ("P01", "desa di daerah rawan bencana (isu strategis RPJMN)", "53.000", "desa", "2025", "pembanding", "RENSTRA", "isu kebencanaan RPJMN",
     "resmi", "korpus-lokal", "Sebanyak 53.000 Desa terletak di daerah rawan bencana", "", ""),
    ("P01", "persentase daerah yang memiliki Desa tangguh Bencana (IKK)", "2,58", "%", "2025", "target-resmi", "RENSTRA", "Tabel 4.7", "resmi", "korpus-lokal", "", "deret 2,58% 2,61% 2,77% 2,99% 3,26%", ""),
    ("P01", "persentase daerah yang memiliki Desa tangguh Bencana (IKK)", "3,26", "%", "2029", "target-resmi", "RENSTRA", "Tabel 4.7", "resmi", "korpus-lokal", "", "deret 2,58% 2,61% 2,77% 2,99% 3,26%", ""),
    ("P01", "masalah pokok Renas: dana desa", "", "", "2025-2029", "temuan-kualitatif", "RENAS", "permasalahan ketangguhan masyarakat", "resmi", "korpus-lokal",
     "dana desa untuk program ketangguhan bencana masyarakat desa", "", ""),
    ("P01", "tingkat ketangguhan desa/kelurahan (dasar garis awal evaluasi)", "", "", "2025", "temuan-kualitatif", "PERBAN7", "pasal tingkatan Desa/Kelurahan Tangguh",
     "resmi", "korpus-lokal", "a. Desa dan Kelurahan tangguh utama; b. Desa dan Kelurahan tangguh madya; dan c. Desa dan Kelurahan tangguh pratama.", "", ""),
    # P02 SPAB
    ("P02", "pelaksana SPAB berpindah dari BNPB", "", "", "2023", "temuan-kualitatif", "RENSTRA", "evaluasi Renstra 2020-2024", "resmi", "korpus-lokal",
     "Sejak tahun 2023 kegiatan SPAB dialihkan pada Kementerian Pendidikan dan Kebudayaan", "", ""),
    ("P02", "peserta didik dibina satuan pendidikan aman bencana (baseline)", "4.433.262", "peserta didik", "2024", "status-resmi", "RENAS", "Tabel 3.1 kode 2.1.2.a",
     "resmi", "korpus-lokal", "", "angka terbelah baris di OCR (4.433.2|62)", ""),
    ("P02", "peserta didik dibina satuan pendidikan aman bencana (target)", "38.946.645", "peserta didik", "2029", "target-resmi", "RENAS", "Tabel 3.1 kode 2.1.2.a",
     "resmi", "korpus-lokal", "", "angka terbelah baris di OCR (38.946.64|5)", ""),
    ("P02", "fasilitator SPAB dibina (baseline)", "4.110", "orang", "2024", "status-resmi", "RENAS", "Tabel 3.1 kode 2.1.2.a", "resmi", "korpus-lokal", "", "", ""),
    ("P02", "fasilitator SPAB dibina (target)", "10.280", "orang", "2029", "target-resmi", "RENAS", "Tabel 3.1 kode 2.1.2.a", "resmi", "korpus-lokal", "", "", ""),
    # P03 InaTEWS
    ("P03", "waktu terbit peringatan tsunami setelah gempa Palu", "5", "menit", "2018", "hasil", "KONTAN_PALU", "paragraf kronologi", "terverifikasi", "dibuka-langsung",
     "Peringatan tsunami telah kami keluarkan sekitar lima menit setelah kejadian gempa", "kutipan Kepala BMKG di media", ""),
    ("P03", "jam gempa Palu-Donggala", "17.02", "WIB", "2018", "hasil", "KONTAN_PALU", "paragraf kronologi", "terverifikasi", "dibuka-langsung",
     "waktu terjadinya gempa pada pukul 17.02 WIB", "", ""),
    ("P03", "jam peringatan tsunami dicabut", "17.37", "WIB", "2018", "hasil", "KONTAN_PALU", "paragraf kronologi", "terverifikasi", "dibuka-langsung",
     "Pada pukul 17.37 WIB, BMKG mencabut peringatan dini tsunami", "", ""),
    ("P03", "jarak sensor pasang surut terdekat dari Palu", "200", "km", "2018", "hasil", "CGTN_PALU", "pernyataan Rahmat Triyono", "terverifikasi", "dibuka-langsung",
     "the closest tidal sensor, around 200 km from Palu", "BMKG: \"We have no observation data at Palu\"", ""),
    ("P03", "keterpenuhan sistem peringatan dini bagi masyarakat terpapar di kawasan risiko tinggi", "6", "%", "2024", "status-resmi", "RENSTRA", "isu kebencanaan RPJMN",
     "resmi", "korpus-lokal", "tingkat keterpenuhan sistem peringatan dini bencana baru mencapai 6 persen",
     "penyebut: masyarakat terpapar di kawasan risiko tinggi; berbeda dengan IKP cakupan layanan di daerah berisiko", ""),
    ("P03", "IKP cakupan layanan peringatan dini di daerah berisiko", "6,10", "%", "2025", "target-resmi", "RENSTRA", "Tabel 4.6", "resmi", "korpus-lokal", "",
     "deret 6,10 6,17 6,21 6,26 6,32; penyebut berbeda dengan angka 6% isu RPJMN", ""),
    ("P03", "IKP cakupan layanan peringatan dini di daerah berisiko", "6,32", "%", "2029", "target-resmi", "RENSTRA", "Tabel 4.6", "resmi", "korpus-lokal", "",
     "deret 6,10 6,17 6,21 6,26 6,32", ""),
    # P04 SLI
    ("P04", "produksi peserta SLI Temanggung di atas rata-rata kabupaten", "9,7", "%", "2019", "hasil", "BMKG_SLI19", "paragraf hasil ubinan", "resmi", "dibuka-langsung",
     "rata-rata Kabupaten sebesar 6.2 Ton/Ha dengan kenaikan produksi 9.7%", "tanpa kelompok pembanding", ""),
    ("P04", "produksi peserta SLI Temanggung di atas rata-rata kecamatan", "11,5", "%", "2019", "hasil", "BMKG_SLI19", "paragraf hasil ubinan", "resmi", "dibuka-langsung",
     "rata-rata Kecamatan sebesar 6.1 Ton/Ha dengan kenaikan produksi 11.5%", "", ""),
    ("P04", "klaim kenaikan produktivitas SLI tahap 3 nasional", "30", "% (paling tinggi)", "2019", "klaim", "BMKG_SLI19", "paragraf penutup", "resmi", "dibuka-langsung",
     "peningkatan produktivitas pertanian hingga 30% dibandingkan rata-ratanya", "metode tidak dijelaskan", ""),
    ("P04", "produktivitas lahan peserta SLI (Ciherang), Batanghari", "6,949", "ton/ha", "2016", "sesudah", "BMKG_SLI16", "paragraf hasil", "resmi", "dibuka-langsung",
     "produktivitas rata-rata Padi Ciherang 6,949 ton/hektar", "survei ubinan BPS Kab. Batanghari", ""),
    ("P04", "produktivitas padi lokal pembanding, Batanghari", "5,64", "ton/ha", "2016", "pembanding", "BMKG_SLI16", "paragraf hasil", "resmi", "dibuka-langsung",
     "peningkatan sebesar 23%daripada produktivitas padi lokal (5,64 ton/hektar)", "pembanding beda varietas: efek SLI bercampur efek varietas", ""),
    ("P04", "kenaikan produktivitas peserta SLI, Batanghari", "23", "%", "2016", "hasil", "BMKG_SLI16", "paragraf hasil", "resmi", "dibuka-langsung",
     "mengalami peningkatan sebesar 23%daripada produktivitas padi lokal", "", ""),
    # P05 MPA / Desa Bebas Api
    ("P05", "desa peserta Fire Free Village (versi APRIL)", "9", "desa", "2014-2015", "hasil", "APRIL16", "paragraf 1", "terverifikasi", "dibuka-langsung",
     "the area burnt by fire among nine participating villages", "", "B_P05_RAPP_DESA"),
    ("P05", "penurunan luas terbakar di desa peserta", "90", "%", "2014-2015", "hasil", "APRIL16", "paragraf 1", "terverifikasi", "dibuka-langsung",
     "reduced the area burnt by fire among nine participating villages by 90 per cent from 2014 to 2015", "", ""),
    ("P05", "luas terbakar sebagai porsi area program", "0,18", "%", "2014", "sebelum", "RAPP18", "paragraf capaian", "terverifikasi", "dibuka-langsung",
     "By 2014, burned areas reached up to 0.18% of the total area covered", "", ""),
    ("P05", "luas terbakar sebagai porsi area program", "0,01", "%", "2015", "sesudah", "RAPP18", "paragraf capaian", "terverifikasi", "dibuka-langsung",
     "in 2015, 2016, and 2017, the numbers fell to 0.01%, 0.07%, and 0.03% respectively", "", ""),
    ("P05", "luas terbakar sebagai porsi area program", "0,07", "%", "2016", "sesudah", "RAPP18", "paragraf capaian", "terverifikasi", "dibuka-langsung",
     "in 2015, 2016, and 2017, the numbers fell to 0.01%, 0.07%, and 0.03% respectively", "naik dari 2015", ""),
    ("P05", "luas terbakar sebagai porsi area program", "0,03", "%", "2017", "sesudah", "RAPP18", "paragraf capaian", "terverifikasi", "dibuka-langsung",
     "in 2015, 2016, and 2017, the numbers fell to 0.01%, 0.07%, and 0.03% respectively", "", ""),
    ("P05", "desa peserta FFVP (versi RAPP)", "4", "desa", "2014", "hasil", "RAPP18", "paragraf jumlah desa", "terverifikasi", "dibuka-langsung",
     "In 2014, four villages are listed as participants", "", "B_P05_RAPP_DESA"),
    ("P05", "desa peserta FFVP (versi RAPP)", "18", "desa", "2015", "hasil", "RAPP18", "paragraf jumlah desa", "terverifikasi", "dibuka-langsung",
     "By 2015, the number of rural villages participating jumped to 18 villages", "", "B_P05_RAPP_DESA"),
    # P06 gambut / sekat kanal
    ("P06", "sekat kanal yang dimodelkan", "168", "sekat", "2023", "masukan-model", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung",
     "peatland restoration performance of 168 canal blocks in a 22 000 ha peatland area in Sumatra", "", ""),
    ("P06", "luas gambut yang dimodelkan (Sumatra)", "22.000", "ha", "2023", "masukan-model", "URZAINKI23", "abstrak", "terverifikasi", "dibuka-langsung",
     "168 canal blocks in a 22 000 ha peatland area in Sumatra", "", ""),
    ("P06", "kenaikan rata-rata tahunan muka air tanah akibat sekat", "1,5", "cm", "2023", "hasil", "URZAINKI23", "abstrak", "estimasi-model", "dibuka-langsung",
     "blocks raised the annual mean WTD by only 1.5 cm", "keluaran simulasi hidrologi (simulated daily WTD); galat model lihat makalah", ""),
    ("P06", "kenaikan muka air tanah, tahun kering", "1,44", "cm", "2023", "hasil", "URZAINKI23", "abstrak", "estimasi-model", "dibuka-langsung",
     "This value was similar in the dry (1.44 cm) and wet (1.57 cm) years", "keluaran simulasi", ""),
    ("P06", "kenaikan muka air tanah, tahun basah", "1,57", "cm", "2023", "hasil", "URZAINKI23", "abstrak", "estimasi-model", "dibuka-langsung",
     "This value was similar in the dry (1.44 cm) and wet (1.57 cm) years", "keluaran simulasi", ""),
    ("P06", "emisi karbon dioksida terhindar, tahun kering", "1,07", "Mg/ha", "2023", "hasil", "URZAINKI23", "abstrak", "estimasi-model", "dibuka-langsung",
     "canal blocks prevented the emission of 1.07 Mg ha−1 CO2 in the dry year", "dihitung dari relasi linear muka air tanah-emisi atas keluaran simulasi", ""),
    ("P06", "emisi karbon dioksida terhindar, tahun basah", "1,17", "Mg/ha", "2023", "hasil", "URZAINKI23", "abstrak", "estimasi-model", "dibuka-langsung",
     "1.17 Mg ha−1 CO2 in the wet year", "dihitung dari relasi linear atas keluaran simulasi", ""),
    ("P06", "BRGM berakhir; restorasi gambut beralih ke tiga kementerian", "", "", "2024-2025", "temuan-kualitatif", "DPR_BRGM", "hlm. 1 dan 3", "resmi", "dibuka-langsung",
     "pelaksanaan restorasi gambut kini menjadi tanggung jawab bersama beberapa kementerian, seperti Kementerian Kehutanan (Kemenhut), Kementerian Lingkungan Hidup (KLH), "
     "dan Kementerian Kelautan dan Perikanan (KKP)", "masa tugas BRGM berakhir 31 Des 2024 (hlm. 1)", ""),
    # P07 Rekompak
    ("P07", "rumah tahan gempa dibangun JRF/Rekompak di Jawa", "15.000", "rumah (lebih dari)", "2006-2012", "hasil", "REKOMPAK12", "hlm. 65 cetak (PDF 69)",
     "terverifikasi", "dibuka-langsung", "The JRF built more than 15,000 earthquake resistant houses in Java", "", ""),
    ("P07", "rumah dibangun pemerintah dengan pendekatan Rekompak di Jawa", "300.000", "rumah (lebih dari)", "2006-2008", "hasil", "REKOMPAK12", "hlm. 125 cetak (PDF 129), catatan 2",
     "terverifikasi", "dibuka-langsung", "more than 300,000 houses were built using this approach", "", ""),
    ("P07", "rumah selesai dua tahun setelah gempa (rekonstruksi Jawa)", "300.000", "rumah", "2006-2008", "hasil", "REKOMPAK12", "hlm. 104 cetak (PDF 108)",
     "terverifikasi", "dibuka-langsung", "Two years after the disaster, the number of completed houses reached 300,000", "", ""),
    ("P07", "selisih biaya Rekompak terhadap pendekatan non-komunitas", "40", "% lebih rendah (paling besar)", "2007-2008", "hasil", "REKOMPAK12", "hlm. 121 cetak (PDF 125)",
     "terverifikasi", "dibuka-langsung", "Rekompak delivered quality housing at up to 40 percent lower cost than projects that did not use a community-based approach",
     "dasar: studi 2007 dan survei kepuasan 2008 yang dibiayai proyek (project-commissioned)", ""),
    ("P07", "selisih biaya untuk spesifikasi identik", "30", "% lebih murah", "2007-2008", "hasil", "REKOMPAK12", "hlm. 121 cetak (PDF 125)", "terverifikasi", "dibuka-langsung",
     "For houses with identical specifications, Rekompak house costs were 30 percent less expensive", "dasar sama dengan baris 40%", ""),
    # P08 BRR
    ("P08", "masa kerja BRR", "4", "tahun", "2005-2009", "hasil", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "4-Year Achievement", "", ""),
    ("P08", "rumah permanen dibangun", "140.304", "rumah", "2005-2009", "sesudah", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "140,304 permanent houses built", "", ""),
    ("P08", "rumah hancur atau rusak berat (juga target Perpres 47/2008)", "139.195", "rumah", "2004-2005", "sebelum", "BRR09", "hlm. x (PDF 12); target: PDF 21", "resmi",
     "dibuka-langsung", "up to 139,195 homes were destroyed or severely damaged",
     "buku yang sama memakai angka ini sebagai target: 'Out of the target of 139,195 houses in accordance to the Presidential Regulation 47/2008'", ""),
    ("P08", "sekolah dibangun", "1.759", "sekolah", "2005-2009", "sesudah", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "1,759 schools built", "", ""),
    ("P08", "sekolah rusak", "3.415", "sekolah", "2004-2005", "sebelum", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "3,415 schools destroyed", "", ""),
    ("P08", "fasilitas kesehatan dibangun", "1.115", "unit", "2005-2009", "sesudah", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "1,115 health facilities constructed", "", ""),
    ("P08", "fasilitas kesehatan rusak", "517", "unit", "2004-2005", "sebelum", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "517 health facilities destroyed", "", ""),
    ("P08", "jalan dibangun", "3.696", "km", "2005-2009", "sesudah", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "3,696 kilometers of road constructed", "", ""),
    ("P08", "jalan rusak", "2.618", "km", "2004-2005", "sebelum", "BRR09", "hlm. xiii (PDF 15)", "resmi", "dibuka-langsung", "2,618 kilometers of road destroyed", "", ""),
    # P09 Lombok
    ("P09", "rumah sasaran rehab-rekon (RB+RS+RR)", "226.204", "rumah", "2020", "status-resmi", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung",
     "target sesuai review IRTAMA BNPB 226.204 unit rumah", "", ""),
    ("P09", "rumah selesai", "170.559", "rumah", "Mar 2020", "hasil", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung", "total rumah sudah jadi 170.559 unit (75,40%)", "", ""),
    ("P09", "porsi rumah selesai", "75,40", "%", "Mar 2020", "hasil", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung", "total rumah sudah jadi 170.559 unit (75,40%)", "", ""),
    ("P09", "rumah tertangani", "209.634", "rumah", "Mar 2020", "hasil", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung",
     "jumlah total progres yang sudah tertangani : 209.634 unit (92.67%)", "", ""),
    ("P09", "porsi rumah tertangani", "92,67", "%", "Mar 2020", "hasil", "PMK_NTB_MAR20", "paragraf progres", "resmi", "dibuka-langsung",
     "jumlah total progres yang sudah tertangani : 209.634 unit (92.67%)", "", ""),
    ("P09", "porsi rumah rusak berat selesai", "89", "%", "Agt 2020", "hasil", "PMK_NTB_AGT20", "paragraf 1", "resmi", "dibuka-langsung",
     "saat ini sudah sekitar 68 ribu atau 89% hunian tetap (huntap) yang selesai dibangun", "", ""),
    ("P09", "rumah rusak berat selesai (versi Danrem)", "65.000", "rumah (sekitar)", "Agt 2020", "hasil", "PMK_NTB_AGT20", "laporan Danrem 162/WB", "resmi", "dibuka-langsung",
     "Berdasarkan laporan Danrem 162/WB selaku Dansatgas Rehab Rekon sebanyak 65 ribu unit sudah selesai dibangun", "", "B_P09_SELESAI"),
    ("P09", "rumah rusak berat selesai (versi pembuka rilis)", "68.000", "rumah (sekitar)", "Agt 2020", "hasil", "PMK_NTB_AGT20", "paragraf 1", "resmi", "dibuka-langsung",
     "saat ini sudah sekitar 68 ribu atau 89% hunian tetap (huntap) yang selesai dibangun", "", "B_P09_SELESAI"),
    ("P09", "rumah rusak berat (versi pembuka rilis)", "74.774", "rumah", "2018", "sebelum", "PMK_NTB_AGT20", "paragraf 1", "resmi", "dibuka-langsung",
     "Dari total 74.774 rumah yang mengalami rusak berat", "", "B_P09_RB"),
    ("P09", "rumah rusak berat (versi Kalaksa BPBD NTB)", "74.707", "rumah", "2018", "sebelum", "PMK_NTB_AGT20", "pernyataan Ahmadi", "resmi", "dibuka-langsung",
     "melakukan rekonstruksi rumah rusak berat sebanyak 74.707 unit", "", "B_P09_RB"),
    # P10 embung
    ("P10", "evaluasi dampak embung berpembanding", "", "", "2026", "temuan-kualitatif", "RISET_B", "bagian 9 (Embung)", "terverifikasi", "via-riset",
     "PUPR: 949 embung 2015–2018", "riset B menandai baris embung [SEKUNDER] tanpa evaluasi terukur; penelusuran 23 Okt 2026 hanya menemukan klaim dinas/pedoman", ""),
    # P11 sumur resapan
    ("P11", "periode ulang hujan di atas mana kontribusi sumur resapan Jakarta kecil", "2", "tahun", "2021", "pendapat-ahli", "DETIK_SUMUR", "kutipan pakar", "terverifikasi",
     "dibuka-langsung", "cukup kecil khususnya pada intensitas curah hujan dengan periode ulang lebih besar dua tahun", "", ""),
    ("P11", "syarat muka air tanah minimum", "2,5", "m", "2021", "pendapat-ahli", "DETIK_SUMUR", "kutipan pakar", "terverifikasi", "dibuka-langsung",
     "apabila muka air tanah lebih dari 2,5 meter dan permeabilitas tanah lebih dari 2,0 centimeter per jam", "", ""),
    ("P11", "syarat permeabilitas tanah minimum", "2,0", "cm/jam", "2021", "pendapat-ahli", "DETIK_SUMUR", "kutipan pakar", "terverifikasi", "dibuka-langsung",
     "apabila muka air tanah lebih dari 2,5 meter dan permeabilitas tanah lebih dari 2,0 centimeter per jam", "", ""),
    ("P11", "tutupan vegetasi skenario model DAS Kamoning", "40", "%", "2021", "masukan-model", "RISET_B", "bagian 9 (Muqaddas dkk. 2021)", "terverifikasi", "via-riset",
     "vegetasi 40% + sumur resapan + sumur injeksi → limpasan turun 78,14% (model)", "riset B: [TERVERIFIKASI] Muqaddas et al. (2021)", ""),
    ("P11", "penurunan limpasan skenario model DAS Kamoning", "78,14", "%", "2021", "hasil", "RISET_B", "bagian 9 (Muqaddas dkk. 2021)", "estimasi-model", "via-riset",
     "vegetasi 40% + sumur resapan + sumur injeksi → limpasan turun 78,14% (model)", "hasil simulasi, bukan pengukuran", ""),
    # P12 Citarum
    ("P12", "IKA Sungai Citarum", "33,43", "indeks", "2018", "sebelum", "DETIK_CITARUM", "paragraf IKA", "terverifikasi", "dibuka-langsung",
     "Indeks Kualitas Air (IKA) meningkat dari 33,43 di tahun 2018 menjadi 50,78 di tahun 2023", "narasi wartawan, sumber data tidak disebut", "B_P12_2018"),
    ("P12", "IKA Sungai Citarum", "50,78", "indeks", "2023", "sesudah", "DETIK_CITARUM", "paragraf IKA", "terverifikasi", "dibuka-langsung",
     "Indeks Kualitas Air (IKA) meningkat dari 33,43 di tahun 2018 menjadi 50,78 di tahun 2023", "narasi wartawan, sumber data tidak disebut", "B_P12_5078"),
    ("P12", "IKA Sungai Citarum (versi Republika)", "33,34", "indeks", "2018", "sebelum", "RISET_B", "bagian 2.3", "terverifikasi", "via-riset",
     "| 2018 | 33,34 | cemar berat | [SEKUNDER] Republika (2023) |", "[SEKUNDER] di riset B", "B_P12_2018"),
    ("P12", "IKA Sungai Citarum (versi Republika)", "51,01", "indeks", "2022", "sesudah", "RISET_B", "bagian 2.3", "terverifikasi", "via-riset",
     "| 2022 | 51,01 | cemar ringan | [SEKUNDER] idem |", "[SEKUNDER] di riset B", ""),
    ("P12", "IKA Sungai Citarum (versi Metro TV, Juni 2024)", "50,78", "indeks", "2024-06", "sesudah", "RISET_B", "bagian 2.3", "terverifikasi", "via-riset",
     "| Jun 2024 | 50,78 | — | [SEKUNDER] Metro TV |", "[SEKUNDER]; detikJabar menyebut nilai yang sama untuk 2023", "B_P12_5078"),
    ("P12", "target IKA akhir masa Perpres 15/2018", "60", "indeks", "2025", "target", "DETIK_CITARUM", "paragraf target", "terverifikasi", "dibuka-langsung",
     "Bey yakin, target IKA 60 Sungai Citarum di tahun 2025 bisa tercapai", "Pj Gubernur Jawa Barat dikutip media", ""),
    # P13 PAMSIMAS
    ("P13", "jiwa terlayani air minum berkelanjutan", "24,8", "juta jiwa", "s.d. 2023", "hasil", "RWSN_PAMSIMAS", "ringkasan ICR", "terverifikasi", "dibuka-langsung",
     "sustainable water supply services to approximately 24.8 million people", "ICR = evaluasi diri Bank Dunia", ""),
    ("P13", "target awal jiwa terlayani", "22,1", "juta jiwa", "s.d. 2023", "target", "RWSN_PAMSIMAS", "ringkasan ICR", "terverifikasi", "dibuka-langsung",
     "surpassing the initial target of 22.1 million", "", ""),
    ("P13", "desa yang didukung", "35.553", "desa (lebih dari)", "s.d. 2023", "hasil", "RWSN_PAMSIMAS", "ringkasan ICR", "terverifikasi", "dibuka-langsung",
     "with over 35,553 villages receiving support", "", ""),
    ("P13", "sistem dibangun/direhabilitasi yang berfungsi baik", "91", "% (sekitar)", "s.d. 2023", "hasil", "RWSN_PAMSIMAS", "ringkasan ICR", "terverifikasi", "dibuka-langsung",
     "About 91% of the constructed or rehabilitated water supply systems", "angka laporan (MIS), bukan uji lapangan", ""),
    ("P13", "data MIS terlalu optimistis soal fungsi sistem", "", "", "2023", "temuan-kualitatif", "DFAT_PAMSIMAS", "PDF hlm. 40", "terverifikasi", "dibuka-langsung",
     "Many of the reported “fully functioning” systems have issues either with water shortages during peak periods or in the dry season", "", ""),
    ("P13", "desa sampel evaluasi independen", "42", "desa", "2022", "masukan-model", "DFAT_PAMSIMAS", "PDF hlm. 32", "terverifikasi", "dibuka-langsung",
     "update the EIRR to reflect the IET’s 42 village sample, gives an EIRR of 30.8%", "", ""),
    ("P13", "EIRR terkoreksi evaluasi independen", "30,8", "%", "2022", "hasil", "DFAT_PAMSIMAS", "PDF hlm. 32", "estimasi-model", "dibuka-langsung",
     "update the EIRR to reflect the IET’s 42 village sample, gives an EIRR of 30.8%", "taksiran ekonomi, bukan pengukuran", ""),
    ("P13", "EIRR taksiran Bank Dunia (PAMSIMAS I dan II)", "36,1", "%", "2022", "pembanding", "DFAT_PAMSIMAS", "PDF hlm. 11", "estimasi-model", "dibuka-langsung",
     "The Economic Internal Rate of Return for the programme was estimated by the WB to be 36.1%", "taksiran ekonomi", ""),
    # P14 sodetan / bendungan kering
    ("P14", "reduksi debit puncak Bendungan Ciawi, banjir Maret 2025", "20,87", "%", "2025-03", "hasil", "RISET_B", "bagian 9", "terverifikasi", "via-riset",
     "reduksi 20,87% (Ciawi, 267,17→211,41 m³/s)", "[SEKUNDER] BBWS via detik", ""),
    ("P14", "debit Ciliwung masuk Ciawi", "267,17", "m³/detik", "2025-03", "sebelum", "RISET_B", "bagian 9", "terverifikasi", "via-riset",
     "reduksi 20,87% (Ciawi, 267,17→211,41 m³/s)", "[SEKUNDER]", ""),
    ("P14", "debit Ciliwung keluar Ciawi", "211,41", "m³/detik", "2025-03", "sesudah", "RISET_B", "bagian 9", "terverifikasi", "via-riset",
     "reduksi 20,87% (Ciawi, 267,17→211,41 m³/s)", "[SEKUNDER]", ""),
    ("P14", "reduksi debit puncak Bendungan Sukamahi", "7", "%", "2025-03", "hasil", "RISET_B", "bagian 9", "terverifikasi", "via-riset",
     "dan 7% (Sukamahi)", "[SEKUNDER]", ""),
    ("P14", "kapasitas sodetan Ciliwung-KBT", "60", "m³/detik", "2023", "hasil", "RISET_B", "bagian 9", "terverifikasi", "via-riset", "60 m³/s dari Q25 508 m³/s", "[SEKUNDER]", ""),
    ("P14", "debit rencana Ciliwung (periode ulang 25 tahun)", "508", "m³/detik", "2023", "pembanding", "RISET_B", "bagian 9", "terverifikasi", "via-riset",
     "60 m³/s dari Q25 508 m³/s", "[SEKUNDER]", ""),
    ("P14", "klaim pengurangan potensi banjir sodetan", "62", "%", "2023", "klaim", "RISET_B", "bagian 9", "terverifikasi", "via-riset",
     "klaim \"kurangi potensi banjir 62%, 6 kelurahan\"", "[SEKUNDER]; kinerja terukur pascaoperasi tidak ditemukan", ""),
    ("P14", "kelurahan yang diklaim terbantu sodetan", "6", "kelurahan", "2023", "klaim", "RISET_B", "bagian 9", "terverifikasi", "via-riset",
     "klaim \"kurangi potensi banjir 62%, 6 kelurahan\"", "[SEKUNDER]", ""),
    # P15 polder
    ("P15", "kinerja polder Jati Pinggir dan tanggul Pekalongan", "", "", "2017-2022", "temuan-kualitatif", "RISET_B", "bagian 7 dan 9", "terverifikasi", "via-riset",
     "kajian Polder Jati Pinggir: saluran & pompa kurang kapasitas", "abstrak terverifikasi di riset B; tanggul Pekalongan 2019 tenggelam 2022 [SEKUNDER]", ""),
    # P16 air tanah Tokyo / Bangkok
    ("P16", "pengambilan air tanah wilayah ku (ward) Tokyo", "1.160.000", "m³/hari", "1964", "sebelum", "UNESCO_TOKYO", "9.4.2 Hydrology", "terverifikasi", "dibuka-langsung",
     "1,160,000 m3/day of ground water was withdrawn in 1964", "", ""),
    ("P16", "pengambilan air tanah wilayah ku (ward) Tokyo", "128.000", "m³/hari", "1975", "sesudah", "UNESCO_TOKYO", "9.4.2 Hydrology", "terverifikasi", "dibuka-langsung",
     "it fell to 128,000 m3/day, or about a tenth, in 1975", "", ""),
    ("P16", "batas kedalaman sumur yang dilarang (Desember 1971; >160 m dilarang Mei 1974)", "160", "m", "1971-1974", "hasil", "UNESCO_TOKYO", "9.4.2 Hydrology",
     "terverifikasi", "dibuka-langsung", "the drilling of wells to a depth of up to 160 m had been banned by December, 1971", "", ""),
    ("P16", "laju penurunan tanah maksimum Tokyo", "27", "cm/tahun", "sebelum 1972", "sebelum", "UNESCO_TOKYO", "9.4.3 Land subsidence", "terverifikasi", "dibuka-langsung",
     "The maximum subsidence in Tokyo is about 4.6 m and the maximum rate is 27 cm/yr", "laju turun tiap tahun sejak 1972 (teks yang sama)", ""),
    ("P16", "penurunan tanah kumulatif maksimum Tokyo", "4,6", "m", "s.d. 1970-an", "sebelum", "UNESCO_TOKYO", "9.4.3 Land subsidence", "terverifikasi", "dibuka-langsung",
     "The maximum subsidence in Tokyo is about 4.6 m", "", ""),
    ("P16", "laju penurunan tanah puncak Bangkok timur", "120", "mm/tahun", "1981", "sebelum", "AIST_BKK", "abstrak", "terverifikasi", "dibuka-langsung",
     "in 1981 the highest subsidence rate up to 120 mm/year had been recorded in the eastern area", "", ""),
    ("P16", "laju penurunan tanah Bangkok setelah pembatasan pompa (akhir 1980-an)", "20", "mm/tahun", "2007-2010", "sesudah", "AIST_BKK", "abstrak", "terverifikasi",
     "dibuka-langsung", "subsiding with a rate of 20 mm/year in recent years, due to the law limiting groundwater pumping", "", ""),
    ("P16", "undang-undang pembatasan air tanah Jepang (1956, 1962)", "", "", "1956-1962", "temuan-kualitatif", "MOE_JP", "Ground subsidence", "resmi", "dibuka-langsung",
     "The \"Industrial Water Law\" and the \"Law Concerning the Regulation of Pumping-up of Underground Water for Use in Buildings\" were enacted in 1956 and 1962", "", ""),
    # P17 Delta Programme
    ("P17", "kemajuan agenda pengelolaan risiko banjir menuju 2050", "82", "%", "2025", "hasil", "DP2026", "Agenda 1, alt teks grafik kemajuan", "resmi", "dibuka-langsung",
     "A gauge shows that the counter is now at 82%.", "indikator kemajuan pelaksanaan yang dilaporkan program sendiri", ""),
    ("P17", "kemajuan agenda air tawar dan adaptasi ruang (masing-masing)", "10", "% (sekitar)", "2025", "hasil", "DP2026", "Agenda 2 dan 3, alt teks grafik kemajuan", "resmi",
     "dibuka-langsung", "A gauge shows that the counter is now at about 10%, with a large margin of uncertainty.", "", ""),
    # P18 Room for the River
    ("P18", "penurunan muka air rencana Waal di Nijmegen", "35", "cm", "2016", "hasil", "EEA_RFTR", "ringkasan studi kasus", "estimasi-model", "dibuka-langsung",
     "the project succeeded in achieving a 35 cm river water height reduction", "nilai desain/model hidraulik, bukan muka air kejadian", ""),
    ("P18", "target awal penurunan muka air", "27", "cm", "2016", "target", "EEA_RFTR", "ringkasan studi kasus", "terverifikasi", "dibuka-langsung",
     "(a greater target of the 27 cm initial one)", "", ""),
    ("P18", "muka air Maas banjir Juli 2021", "", "", "2021", "temuan-kualitatif", "ENW21", "PDF hlm. 7 dan 38", "terverifikasi", "dibuka-langsung",
     "Waterstanden op de Maas zijn benedenstrooms van Roermond lager dan tijdens eerdere hoogwaters",
     "sebagian karena Maaswerken dan perataan puncak gelombang ('Dit komt onder meer door de uitvoering van Maaswerken')", ""),
    # P19 CPP Bangladesh
    ("P19", "kematian siklon 1970", "500.300", "jiwa", "1970", "sebelum", "HAQUE12", "Tabel 1", "terverifikasi", "dibuka-langsung", "1970 500 300 223 6",
     "baris Tabel 1: tahun, kematian, kecepatan angin, indeks keparahan", "B_P19_1970"),
    ("P19", "kematian siklon 1991", "138.958", "jiwa", "1991", "sebelum", "HAQUE12", "Tabel 1", "terverifikasi", "dibuka-langsung", "1991 138 958 225 6", "", ""),
    ("P19", "kematian siklon 1997", "410", "jiwa", "1997", "sesudah", "HAQUE12", "Tabel 1", "terverifikasi", "dibuka-langsung", "1997 410 225 6", "", ""),
    ("P19", "kematian siklon Sidr", "4.234", "jiwa", "2007", "sesudah", "HAQUE12", "Tabel 1 dan abstrak", "terverifikasi", "dibuka-langsung",
     "the most recent severe cyclone of 2007 caused 4234 deaths, a 100-fold reduction compared with the devastating 1970 cyclone", "", ""),
    ("P19", "kematian siklon 2009", "197", "jiwa", "2009", "sesudah", "HAQUE12", "Tabel 1", "terverifikasi", "dibuka-langsung", "2009 197 95 4", "", ""),
    ("P19", "faktor penurunan kematian 1970 ke 2007", "100", "kali", "1970-2007", "hasil", "HAQUE12", "abstrak", "terverifikasi", "dibuka-langsung",
     "cyclone-related mortality in Bangladesh has declined by more than 100-fold over the past 40 years", "", ""),
    ("P19", "relawan penyiar peringatan saat siaga siklon", "20.000", "orang (lebih dari)", "2012", "hasil", "HAQUE12", "pembahasan", "terverifikasi", "dibuka-langsung",
     "the use of megaphones by volunteers (more than 20 000 during cyclone alerts)", "", ""),
    ("P19", "shelter siklon sebelum 2007", "1.500", "shelter", "2007", "hasil", "HAQUE12", "pembahasan", "terverifikasi", "dibuka-langsung",
     "Prior to 2007, the country had 1500 shelters", "", ""),
    ("P19", "shelter tambahan yang mulai dibangun pasca-Sidr", "2.000", "shelter", "2008-2012", "hasil", "HAQUE12", "pembahasan", "terverifikasi", "dibuka-langsung",
     "the Bangladesh government initiated the construction of 2000 new cyclone shelters", "penulis: jumlah dan lokasi shelter masih kurang", ""),
    ("P19", "efek terpisah shelter, tanggul, dan penyadaran belum terbukti", "", "", "2012", "temuan-kualitatif", "HAQUE12", "pembahasan", "terverifikasi", "dibuka-langsung",
     "there is currently no scientific evidence regarding the precise impact of shelters, coastal embankments or awareness programmes", "", ""),
    ("P19", "kematian siklon 1970 (versi kajian WMO)", "300.000", "jiwa", "1970", "sebelum", "PW_BHOLA", "paragraf korban 1970", "terverifikasi", "dibuka-langsung",
     "A formal review by the World Meteorological Organization has put the death toll at 300,000", "dikutip blog UNDRR", "B_P19_1970"),
    ("P19", "kematian siklon 1970 (angka resmi pemerintah menurut kepala CPP)", "1", "juta jiwa", "1970", "sebelum", "PW_BHOLA", "paragraf korban 1970", "terverifikasi",
     "dibuka-langsung", "the official government figure is one million", "angka pemerintah dikutip blog UNDRR dari kepala CPP, bukan dokumen pemerintah", "B_P19_1970"),
    # P20 Odisha
    ("P20", "korban jiwa Siklon Phailin", "44", "jiwa", "2013", "sesudah", "ODISHA_RDNA", "Foreword (PDF hlm. 7)", "resmi", "dibuka-langsung",
     "resulting in 44 human casualties", "", "B_P20_PHAILIN"),
    ("P20", "penduduk terdampak Phailin", "13,2", "juta jiwa", "2013", "sesudah", "ODISHA_RDNA", "Foreword (PDF hlm. 7)", "resmi", "dibuka-langsung",
     "affecting about 13.2 million people in 171 blocks", "", ""),
    ("P20", "penduduk dievakuasi sebelum pendaratan", "1", "juta jiwa (lebih dari)", "2013", "hasil", "ODISHA_RDNA", "Foreword (PDF hlm. 7)", "resmi", "dibuka-langsung",
     "Over 1 million people were evacuated within 36 hours preceding the landfall", "", ""),
    ("P20", "jendela evakuasi sebelum pendaratan", "36", "jam", "2013", "hasil", "ODISHA_RDNA", "Foreword (PDF hlm. 7)", "resmi", "dibuka-langsung",
     "Over 1 million people were evacuated within 36 hours preceding the landfall", "", ""),
    ("P20", "korban jiwa Siklon Super 1999", "10.000", "jiwa (sekitar)", "1999", "sebelum", "ODISHA_RDNA", "Background (PDF hlm. 17)", "resmi", "dibuka-langsung",
     "left about 10,000 people dead", "", ""),
    ("P20", "penduduk terdampak Siklon Super 1999", "18", "juta jiwa", "1999", "sebelum", "ODISHA_RDNA", "Background (PDF hlm. 17)", "resmi", "dibuka-langsung",
     "The cyclone severely affected around 18 million people in 14 districts", "", ""),
    ("P20", "korban jiwa Phailin 72 jam setelah pendaratan (feature Bank Dunia)", "38", "jiwa", "2013", "sesudah", "WB_PHAILIN", "paragraf 2", "terverifikasi", "dibuka-langsung",
     "72 hours later, the official death toll is 38 people", "angka awal; RDNA Desember 2013 menulis 44", "B_P20_PHAILIN"),
    # P21 Kamaishi
    ("P21", "siswa SD dan SMP Kamaishi yang selamat", "99,8", "%", "2011", "hasil", "JST_KATADA", "paragraf pembuka", "terverifikasi", "dibuka-langsung",
     "99.8% of about 3,000 elementary and junior high school students of 14 schools in the city survived", "JST adalah lembaga pendana riset, bukan otoritas data korban", ""),
    ("P21", "jumlah siswa", "3.000", "siswa (sekitar)", "2011", "hasil", "JST_KATADA", "paragraf pembuka", "terverifikasi", "dibuka-langsung",
     "99.8% of about 3,000 elementary and junior high school students", "", ""),
    ("P21", "jumlah sekolah", "14", "sekolah", "2011", "hasil", "JST_KATADA", "paragraf pembuka", "terverifikasi", "dibuka-langsung",
     "students of 14 schools in the city survived", "", ""),
    # P22 Chile
    ("P22", "magnitudo gempa Maule", "8,8", "Mw", "2010", "hasil", "CHILE_WCEE", "Pendahuluan", "terverifikasi", "dibuka-langsung", "The El Maule, Chile 2010 MW = 8.8 earthquake", "", ""),
    ("P22", "kegagalan pada bangunan hunian tiga lantai atau lebih (izin 1985-2009)", "0,5", "%", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung",
     "Failures in 3 + story buildings 0.5%", "", ""),
    ("P22", "bangunan hunian tiga lantai atau lebih", "9.974", "bangunan", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung",
     "No of building 3 + stories : 9,974", "", ""),
    ("P22", "kegagalan pada bangunan sembilan lantai atau lebih", "2,8", "%", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung",
     "Failures in 9 + story buildings 2.8%", "", ""),
    ("P22", "bangunan hunian sembilan lantai atau lebih", "1.939", "bangunan", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung",
     "No of building 9 + stories : 1,939", "", ""),
    ("P22", "bangunan runtuh", "4", "bangunan (sekitar)", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung", "Building that collapsed : 4 (approximate)", "", ""),
    ("P22", "bangunan harus dibongkar", "50", "bangunan (taksiran)", "2010", "hasil", "CHILE_WCEE", "Tabel 1", "terverifikasi", "dibuka-langsung",
     "Building to be demolished : 50 (estimate)", "", ""),
    ("P22", "korban jiwa resmi sementara (8 Maret 2010)", "528", "jiwa", "2010-03", "hasil", "ECHO_CHILE", "factsheet", "terverifikasi", "dibuka-langsung",
     "The official death toll, on 8 March, was reported to be 528 persons", "angka pemerintah Chile dikutip ECHO; masih direvisi saat itu", ""),
    # P23 asuransi
    ("P23", "pembayaran CCRIF sejak 2007", "54", "pembayaran", "s.d. Apr 2022", "hasil", "WB_CCRIF", "Results", "terverifikasi", "dibuka-langsung",
     "Since 2007, CCRIF has provided 54 payouts to 16 of its members for approximately $245 million paid within 14 days of the disaster", "deret kumulatif, titik 2022", ""),
    ("P23", "nilai pembayaran CCRIF", "245", "juta US$ (sekitar)", "s.d. Apr 2022", "hasil", "WB_CCRIF", "Results", "terverifikasi", "dibuka-langsung",
     "Since 2007, CCRIF has provided 54 payouts to 16 of its members for approximately $245 million paid within 14 days of the disaster", "", ""),
    ("P23", "anggota CCRIF penerima pembayaran", "16", "negara", "s.d. Apr 2022", "hasil", "WB_CCRIF", "Results", "terverifikasi", "dibuka-langsung",
     "Since 2007, CCRIF has provided 54 payouts to 16 of its members", "", ""),
    ("P23", "batas waktu pembayaran CCRIF setelah bencana", "14", "hari", "s.d. Apr 2022", "hasil", "WB_CCRIF", "Results", "terverifikasi", "dibuka-langsung",
     "paid within 14 days of the disaster", "", ""),
    ("P23", "pembayaran CCRIF sejak 2007", "63", "pembayaran", "s.d. Des 2023", "hasil", "ARTEMIS_CCRIF", "paragraf 3", "terverifikasi", "dibuka-langsung",
     "the Facility has now made 63 payouts to 17 member governments", "deret kumulatif, titik 27 Des 2023", ""),
    ("P23", "nilai pembayaran CCRIF", "266,8", "juta US$", "s.d. Des 2023", "hasil", "ARTEMIS_CCRIF", "judul dan paragraf 3", "terverifikasi", "dibuka-langsung",
     "CCRIF parametric payouts reach $266.8m", "rinci: US $266,775,251", ""),
    ("P23", "anggota CCRIF penerima pembayaran", "17", "negara", "s.d. Des 2023", "hasil", "ARTEMIS_CCRIF", "paragraf 3", "terverifikasi", "dibuka-langsung",
     "63 payouts to 17 member governments in the Caribbean and Central America", "", ""),
    ("P23", "pembayaran ARC yang tepat waktu", "3", "pembayaran", "2020-2022", "hasil", "OPM_ARC", "Efficiency: reliability and timeliness", "terverifikasi", "dibuka-langsung",
     "This target was achieved for three of the four payouts in the reporting period", "target KPI di bawah 30 hari", ""),
    ("P23", "pembayaran ARC dalam periode analisis", "4", "pembayaran", "2020-2022", "hasil", "OPM_ARC", "Efficiency: reliability and timeliness", "terverifikasi", "dibuka-langsung",
     "This target was achieved for three of the four payouts in the reporting period", "", ""),
    ("P23", "target waktu pembayaran ARC setelah pemicu", "30", "hari", "2020-2022", "target", "OPM_ARC", "Efficiency: reliability and timeliness", "terverifikasi", "dibuka-langsung",
     "target to make payouts in less than 30 days from when a payout is triggered", "", ""),
    ("P23", "negara anggota ARC yang membeli polis kekeringan", "16", "negara", "2022", "hasil", "OPM_ARC", "Economy: relevant, well-priced products", "terverifikasi", "dibuka-langsung",
     "there are 36 member states, of which 16 have bought at least one drought policy", "", ""),
    ("P23", "negara anggota ARC", "36", "negara", "2022", "hasil", "OPM_ARC", "Economy: relevant, well-priced products", "terverifikasi", "dibuka-langsung",
     "there are 36 member states, of which 16 have bought at least one drought policy", "", ""),
    ("P23", "premi reasuransi terhadap harapan pembayaran ARC", "81", "%", "2021", "hasil", "OPM_ARC", "Economy: capital, reinsurance, running costs", "terverifikasi", "dibuka-langsung",
     "reinsurance premiums (US$ 17.8 million) were estimated to be 81% of total expected insurance payouts", "spesifikasi awal mengasumsikan paling banyak 15%", ""),
    ("P23", "klaim Asuransi BMN dibayar", "1,14", "miliar Rp", "2020", "hasil", "DJKN_ABMN", "paragraf 1", "resmi", "dibuka-langsung",
     "menutupi kerugian pemerintah sebesar Rp1,14 milyar dari nilai klaim 18 BMN", "judul URL menulis Rp114 Milyar", "B_P23_ABMN"),
    ("P23", "klaim Asuransi BMN dibayar (versi judul URL berita)", "114", "miliar Rp", "2020", "hasil", "DJKN_ABMN", "slug URL", "resmi", "dibuka-langsung",
     "Asuransi-BMN-Terima-Klaim-Kerugian-Negara-Rp114-Milyar", "isi berita Rp1,14 milyar; kemungkinan koma hilang di slug", "B_P23_ABMN"),
    ("P23", "BMN terdampak bencana yang diklaim", "18", "BMN", "2020", "hasil", "DJKN_ABMN", "paragraf 1", "resmi", "dibuka-langsung",
     "dari nilai klaim 18 BMN yang terdampak bencana", "", ""),
    ("P23", "K/L peserta Asuransi BMN", "13", "K/L", "2020", "hasil", "DJKN_ABMN", "paragraf 2", "resmi", "dibuka-langsung",
     "pada tahun 2020, sebanyak 13 K/L telah terdaftar sebagai peserta asuransi BMN", "", ""),
    ("P23", "premi Asuransi BMN Jan-Okt 2024", "132,1", "miliar Rp", "2024", "hasil", "BISNIS_ABMN", "paragraf 2", "terverifikasi", "dibuka-langsung",
     "total nilai premi asuransi BMN pada periode tersebut mencapai Rp132,1 miliar", "premi asuransi aset negara, bukan belanja program; dikutip dari Kasubdit Humas DJKN", ""),
    ("P23", "klaim Asuransi BMN Jan-Okt 2024", "2,45", "miliar Rp", "2024", "hasil", "BISNIS_ABMN", "paragraf 4", "terverifikasi", "dibuka-langsung",
     "total klaim yang diterima dari asuransi BMN pada periode tersebut mencapai Rp2,45 miliar", "", ""),
    # P24 FEMA
    ("P24", "manfaat rata-rata hibah mitigasi federal per US$1", "6", "US$", "1993-2016", "hasil", "FEMA18", "Overall Findings", "estimasi-model", "dibuka-langsung",
     "Natural hazard mitigation saves $6 on average for every $1 spent on federal mitigation grants", "analisis NIBS: rasio hasil pemodelan, bukan pengukuran pascakejadian", ""),
    ("P24", "investasi pembanding", "1", "US$", "1993-2016", "pembanding", "FEMA18", "Overall Findings", "estimasi-model", "dibuka-langsung",
     "saves $6 on average for every $1 spent", "penyebut rasio model", ""),
    ("P24", "rasio manfaat-biaya studi NIBS 2005", "4", "rasio (x:1)", "2005", "pembanding", "FEMA18", "Overall Findings", "estimasi-model", "dibuka-langsung",
     "An earlier (2005) study by NIBS found a benefit-cost ratio (BCR) of 4:1", "", ""),
    ("P24", "rasio hibah mitigasi banjir sungai", "7", "kali", "1993-2016", "hasil", "FEMA18", "Flood Mitigation Results", "estimasi-model", "dibuka-langsung",
     "far exceeds the money spent (with a 7x return on investment)", "studi menyebut dampak proyek dimodelkan (modeled)", ""),
    ("P24", "rasio mitigasi angin", "5", "rasio (x:1)", "1993-2016", "hasil", "FEMA18", "Wind Mitigation Results", "estimasi-model", "dibuka-langsung",
     "and other methods analyzed in this study—offers a 5:1 BCR", "", ""),
    ("P24", "rasio mitigasi gempa investasi publik", "3", "kali", "1993-2016", "hasil", "FEMA18", "Earthquake Mitigation Results", "estimasi-model", "dibuka-langsung",
     "by a factor of 4x for exceeding code requirements and 3x for public-sector investments", "", ""),
    ("P24", "rasio mitigasi gempa desain di atas kode", "4", "kali", "1993-2016", "hasil", "FEMA18", "Earthquake Mitigation Results", "estimasi-model", "dibuka-langsung",
     "by a factor of 4x for exceeding code requirements", "", ""),
    ("P24", "status BRIC", "", "", "2025-2026", "temuan-kualitatif", "NCDOJ26", "paragraf 1", "resmi", "dibuka-langsung",
     "won the case in December when the court ruled that FEMA broke the law by canceling the BRIC program",
     "rilis 24 Mar 2026 tidak menulis tahun putusan; FEMA lalu mengajukan rencana memulai lagi BRIC (Jumat sebelum rilis)", ""),
    ("P24", "kriteria penyaluran Dana Bersama prabencana", "", "", "2026", "temuan-kualitatif", "PERBAN1_26", "Pasal 14 ayat (4)", "resmi", "korpus-lokal",
     "b. bagi pemohon dari Pemerintah Daerah, kegiatan yang diajukan sesuai arah kebijakan terkait penanggulangan bencana dalam Rencana Kerja Pemerintah "
     "Daerah serta merujuk pada Rencana Penanggulangan Bencana Daerah dan/atau standar pelayanan minimal sub-urusan bencana",
     "huruf a (K/L): sesuai arah kebijakan dalam Renas PB dan RKP; kriteria hanya kesesuaian rencana, tanpa analisis manfaat-biaya", ""),
    ("P24", "dokumen persyaratan verifikasi Dana Bersama", "", "", "2026", "temuan-kualitatif", "PERBAN1_26", "Pasal 16 ayat (3)", "resmi", "korpus-lokal",
     "a. kerangka acuan kerja; b. rencana anggaran biaya; c. reviu aparat pengawasan intern pemerintah pemohon; d. spesifikasi barang dan/atau jasa; "
     "e. dokumen standar sistem pengelolaan lingkungan dan sosial;", "tidak ada analisis manfaat-biaya", ""),
    ("P24", "Perban 1/2024 (induk Juklak 4/2025) dicabut", "", "", "2026", "temuan-kualitatif", "PERBAN1_26", "Pasal 34", "resmi", "korpus-lokal",
     "Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2024 tentang Penelaahan, Verifikasi, dan Evaluasi Penyaluran Dana Bersama Penanggulangan Bencana "
     "(Berita Negara Republik Indonesia Tahun 2024 Nomor 4), dicabut dan dinyatakan tidak berlaku", "tanpa pasal peralihan; status Juklak 4/2025 perlu dicek", ""),
    ("P24", "Juklak 4/2025 menginduk Perban 1/2024", "", "", "2025", "temuan-kualitatif", "JUKLAK4", "Bab metodologi", "resmi", "korpus-lokal",
     "Pasal 5 ayat (1) Peraturan BNPB Nomor 1 Tahun 2024", "indeks JDIH 23 Okt 2026 masih mencatat Juklak 4/2025 BERLAKU", ""),
    # P25 Filipina
    ("P25", "korban jiwa Topan Haiyan/Yolanda", "6.000", "jiwa (lebih dari)", "2013", "sebelum", "WFP23", "ringkasan publikasi", "terverifikasi", "dibuka-langsung",
     "Responsible for more than 6,000 deaths", "", ""),
    ("P25", "korban jiwa Topan Rai/Odette", "400", "jiwa (lebih dari)", "2021", "sesudah", "WFP23", "ringkasan publikasi", "terverifikasi", "dibuka-langsung",
     "More than 400 people died in the aftermath of Typhoon Odette", "WFP mengkreditkan langkah preemptif tanpa angka pembanding", ""),
    ("P25", "klaim zero casualty Albay saat Topan Nona", "", "", "2015", "temuan-kualitatif", "INQ_NONA", "paragraf 1-2", "terverifikasi", "dibuka-langsung",
     "the province has achieved its “zero casualty goal” during Typhoon Nona", "klaim gubernur Salceda", ""),
    ("P25", "kematian di Albay saat Topan Nina", "4", "jiwa", "2016", "hasil", "INQ_NINA", "paragraf 1", "terverifikasi", "dibuka-langsung",
     "said after four people were killed during the onslaught of Typhoon “Nina”", "kepala APSEMO menyebutnya evacuation failure", ""),
]
# Kutipan korpus-lokal yang wajib ketemu (selain angka): sumber -> slug
SLUG = {"RENSTRA": RS, "RENAS": RN, "PERBAN7": "perban-nomor-7-tahun-2025", "JUKLAK4": "juklak-nomor-4-tahun-2025",
        "PERBAN1_26": "perban-nomor-1-tahun-2026"}

# ============================================================================ kompendium

# Setiap angka di kolom dampak, apa, syarat, dasar, celah, catatan WAJIB muncul sebagai `nilai` bukti terbaca program itu
# (tahun, tanggal, nomor peraturan, kode Renas/RIPB, dan rujukan pasal/tabel dikecualikan; lihat RE_RUJUKAN).
K = [
    dict(id="P01", nama="Desa dan Kelurahan Tangguh Bencana (Destana)", kelompok="Dalam negeri", lokasi="Indonesia, nasional", periode="2012-sekarang",
         lembaga="BNPB, BPBD, pemerintah desa", fase="prabencana", bencana="banjir;longsor;gempa;tsunami;gunungapi;kekeringan;karhutla", aksi="kapasitas",
         kajian="keduanya",
         apa="Desa/kelurahan menyusun kajian risiko dan rencana PB desa, membentuk Forum PRB dan Tim Relawan, menyiapkan peringatan dini dan jalur evakuasi; tingkat ketangguhan dinilai (pratama, madya, utama).",
         dampak="Belum ada evaluasi dampak kuantitatif (pra-pasca atau desa pembanding). Data resmi hanya cakupan: 2.234 desa/kelurahan dibina (baseline Renas) dengan target 7.234, dibanding 53.000 desa di daerah rawan; IKK Renstra daerah yang memiliki Destana 2,58% menjadi 3,26%.",
         jenis_eval="tidak-ada-evaluasi-dampak", kekuatan="belum-terbukti",
         syarat="Masuk RPJMDes dan dana desa; relawan aktif dan gladi berkala; tersambung ke peringatan dini kab/kota (Pusdalops siaga terus-menerus); pendampingan multi-tahun.",
         status="dikembangkan", dasar="Perban BNPB 7/2025 tentang Desa dan Kelurahan Tangguh Bencana (mengganti Perka 1/2012); Renas 4.5.1.a; IKK Direktorat Kesiapsiagaan (Renstra Tabel 4.7)",
         celah="Tidak ada evaluasi dampak; Penilaian Ketangguhan (Perban 7/2025) belum dipakai sebagai garis dasar; cakupan kecil terhadap desa rawan; Renas mencatat dana desa belum optimal untuk ketangguhan.",
         posisi="Program berjalan, wajib evaluasi dampak",
         unit="Direktorat Kesiapsiagaan;Direktorat Peringatan Dini;Direktorat Pemetaan dan Evaluasi Risiko Bencana", kl="Kementerian Desa PDT;Kementerian Sosial;Kementerian Dalam Negeri;BPBD",
         renas="4.5.1;1.1.2", renstra="2", ripb_strategi="4e", catatan=""),
    dict(id="P02", nama="Satuan Pendidikan Aman Bencana (SPAB)", kelompok="Dalam negeri", lokasi="Indonesia, nasional", periode="2012-sekarang",
         lembaga="Kementerian Pendidikan Dasar dan Menengah, Kementerian Agama (sejak 2023); sebelumnya BNPB", fase="prabencana", bencana="gempa;tsunami;banjir;gunungapi",
         aksi="kapasitas", kajian="mitigasi",
         apa="Pendidikan kebencanaan, gladi evakuasi rutin, penilaian keamanan gedung, dan rencana kesiapsiagaan di satuan pendidikan.",
         dampak="Tidak ditemukan evaluasi dampak nasional berpembanding pada penelusuran 23 Okt 2026. Pelaksana pindah dari BNPB ke kementerian pendidikan sejak 2023 (Renstra). Renas menargetkan 38.946.645 peserta didik dan 10.280 fasilitator dibina (baseline ±4.433.262 dan 4.110). Bukti terkuat pendekatan ini berasal dari luar negeri (program Kamaishi di kompendium ini).",
         jenis_eval="tidak-ada-evaluasi-dampak", kekuatan="belum-terbukti",
         syarat="Gladi berkala dengan skenario tak terduga; indikator hasil terukur (waktu evakuasi, porsi siswa ikut gladi); gedung sekolah dinilai dan diperkuat.",
         status="dikembangkan", dasar="Perka BNPB 4/2012 Pedoman Penerapan Sekolah/Madrasah Aman dari Bencana; Permendikbud 33/2019 tentang Penyelenggaraan Program SPAB (rujukan sekunder, teks tidak dibuka); Renas 2.1.2.a (PJ Kemendikdasmen dan Kemenag)",
         celah="Indikator Renas berupa jumlah peserta dibina, bukan hasil; BNPB kini kontributor; Renas mencatat belum semua satuan pendidikan menerapkan SPAB.",
         posisi="Program berjalan, wajib evaluasi dampak",
         unit="Direktorat Kesiapsiagaan;Direktorat Mitigasi Bencana", kl="Kementerian Pendidikan Dasar dan Menengah;Kementerian Agama",
         renas="2.1.2;4.5.2", renstra="2", ripb_strategi="4f;4g", catatan=""),
    dict(id="P03", nama="Sistem Peringatan Dini Tsunami Indonesia (InaTEWS)", kelompok="Dalam negeri", lokasi="Indonesia, pesisir rawan tsunami", periode="2008-sekarang",
         lembaga="BMKG (hulu); BNPB dan BPBD (hilir)", fase="prabencana;tanggap-darurat", bencana="tsunami;gempa", aksi="infrastruktur", kajian="mitigasi",
         apa="Jaringan seismik, pasang surut, dan diseminasi (WRS, sirene) BMKG; peringatan diteruskan BNPB, BPBD, media, dan operator ke masyarakat.",
         dampak="Kecepatan hulu terbukti: pada gempa Palu (September 2018) peringatan terbit sekitar 5 menit setelah gempa pukul 17.02 WIB, tetapi dicabut pukul 17.37 WIB karena tidak ada sensor muka laut di Teluk Palu (sensor terdekat sekitar 200 km); tsunami tetap datang. Hilir lemah: keterpenuhan sistem peringatan dini baru 6% dari masyarakat terpapar di kawasan risiko tinggi; IKP cakupan layanan peringatan dini di daerah berisiko 6,10% menjadi 6,32% (penyebut kedua angka berbeda, jadi tidak dapat dibandingkan langsung).",
         jenis_eval="kejadian-tunggal", kekuatan="sedang",
         syarat="Sensor muka laut di teluk dan dekat sumber; Pusdalops dan BPBD siaga terus-menerus; sirene dan pesan seluler sampai rumah tangga; warga terlatih evakuasi mandiri saat guncangan kuat tanpa menunggu peringatan.",
         status="dikembangkan", dasar="Perban BNPB 2/2024 Sistem Peringatan Dini Bencana; Perban BNPB 4/2022 Pelaksanaan Peringatan Dini Bencana pada BNPB dan BPBD; Renas 1.1.1, 1.1.2, 1.2.1.c; Perpres 93/2019 (kutipan sekunder, teks tidak dibuka)",
         celah="Mata rantai terakhir (sirene, Pusdalops siaga terus-menerus), tsunami nontektonik (Selat Sunda 2018), cakupan peringatan dini 6%; evaluasi UNDRR/UNESCO 2019 atas Palu ditolak server saat dibuka.",
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
         posisi="Program berjalan, wajib evaluasi dampak", unit="Direktorat Mitigasi Bencana;Direktorat Pengembangan Strategi Penanggulangan Bencana", kl="BMKG;Kementerian Pertanian",
         renas="2.5.1;4.5.2", renstra="2", ripb_strategi="4g", catatan=""),
    dict(id="P05", nama="Masyarakat Peduli Api dan Desa Bebas Api (Fire Free Village Programme)", kelompok="Dalam negeri", lokasi="Riau (konsesi APRIL/RAPP)", periode="2014-sekarang",
         lembaga="APRIL/PT RAPP bersama pemerintah desa; MPA di bawah Kementerian Kehutanan", fase="prabencana", bencana="karhutla", aksi="kapasitas", kajian="mitigasi",
         apa="Hibah infrastruktur bagi desa yang bebas kebakaran, pelatihan regu api desa, patroli, pertanian tanpa bakar, edukasi dan pemantauan udara.",
         dampak="Laporan perusahaan: luas terbakar di 9 desa peserta turun 90% dari 2014 ke 2015 (tahun El Nino kuat); rilis RAPP 2018 menyebut porsi area terbakar 0,18% (2014) menjadi 0,01% (2015), lalu 0,07% (2016) dan 0,03% (2017), tetapi mencatat 4 desa peserta pada 2014 dan 18 desa pada 2015, berbeda dengan versi 9 desa. Tidak ada kelompok pembanding dan tidak ditemukan evaluasi independen.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Insentif bersyarat yang benar-benar dibayar; regu api desa terlatih dan berperalatan; alternatif pembukaan lahan tanpa bakar yang layak ekonomi; pemantauan titik panas independen.",
         status="dikembangkan", dasar="MPA dan Brigdal karhutla di bawah Kementerian Kehutanan (Renas 1.2.3.d); Inpres 3/2020 (kutipan riset A, sekunder)",
         celah="Tidak ada evaluasi independen; skema insentif belum diadopsi pemerintah; perbandingan dengan desa nonpeserta belum dilakukan.",
         posisi="Uji coba terukur", unit="Direktorat Mitigasi Bencana;Direktorat Kesiapsiagaan", kl="Kementerian Kehutanan;Kementerian Lingkungan Hidup;Kementerian Kelautan dan Perikanan;pemerintah daerah",
         renas="1.2.3", renstra="2", ripb_strategi="4e", catatan="Biaya per desa yang disebut rilis APRIL sengaja tidak disalin (aturan tanpa biaya proyek)."),
    dict(id="P06", nama="Restorasi gambut melalui sekat kanal (pembasahan)", kelompok="Dalam negeri", lokasi="Sumatra dan Kalimantan, lahan gambut", periode="2016-sekarang",
         lembaga="Kementerian Kehutanan, Kementerian Lingkungan Hidup, dan Kementerian Kelautan dan Perikanan (sejak tugas badan restorasi berakhir 2024), pemegang konsesi", fase="prabencana", bencana="karhutla", aksi="infrastruktur", kajian="mitigasi",
         apa="Pembasahan gambut dengan sekat dan timbun kanal, sumur bor, revegetasi, dan revitalisasi ekonomi masyarakat.",
         dampak="Model hidrologi untuk 168 sekat kanal di 22.000 ha gambut Sumatra: rata-rata tahunan muka air tanah hanya naik 1,5 cm (1,44 cm tahun kering, 1,57 cm tahun basah); emisi karbon dioksida terhindar 1,07 dan 1,17 Mg/ha. Belum ditemukan bukti sekat kanal menurunkan kejadian kebakaran di skala lanskap.",
         jenis_eval="model", kekuatan="lemah",
         syarat="Lokasi sekat dioptimasi (bukan sebanyak-banyaknya); pemantauan muka air tanah rapat di luar tepi kanal; pemeliharaan sekat; disertai pencegahan pembakaran.",
         status="dikembangkan", dasar="BRGM (Perpres 120/2020) berakhir 31 Des 2024; restorasi gambut kini dipegang Kemenhut, KLH, dan KKP (Info Singkat DPR Juni 2025); Renas 2.3.3 dan 1.2.3.d (Renas masih mencantumkan BRGM sebagai kontributor)",
         celah="Sebaran pemantauan muka air tanah sempit dan dekat kanal; efek pada kebakaran belum diukur.",
         posisi="Program berjalan, wajib evaluasi dampak", unit="Direktorat Mitigasi Bencana;Direktorat Pemetaan dan Evaluasi Risiko Bencana", kl="Kementerian Kehutanan;Kementerian Lingkungan Hidup;Kementerian Kelautan dan Perikanan",
         renas="2.3.3", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P07", nama="Rekompak: rekonstruksi rumah berbasis komunitas, gempa Yogyakarta-Jawa Tengah 2006", kelompok="Dalam negeri", lokasi="DIY, Jawa Tengah, Jawa Barat",
         periode="2006-2012", lembaga="Kementerian PU dengan Java Reconstruction Fund (JRF, Bank Dunia sebagai wali amanat)", fase="pascabencana", bencana="gempa", aksi="kapasitas",
         kajian="mitigasi",
         apa="Dana langsung ke kelompok warga, rencana permukiman desa, fasilitator teknis, standar tahan gempa, dan pencairan bertahap yang dikunci mutu.",
         dampak="JRF membangun lebih dari 15.000 rumah tahan gempa; pemerintah menerapkan pendekatan yang sama untuk lebih dari 300.000 rumah, yang menurut buku yang sama selesai dua tahun setelah gempa. Studi 2007 dan survei kepuasan 2008 yang dibiayai proyek: biaya hingga 40% lebih rendah dari pendekatan non-komunitas, dan 30% lebih murah untuk spesifikasi identik. Semuanya laporan pelaksana dan donor sendiri, tanpa evaluasi mutu independen.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Fasilitator teknis memadai; uji mutu struktur oleh pihak luar; data penerima transparan dan pengaduan berjalan; dana tersedia cepat.",
         status="dikembangkan", dasar="Perban BNPB 6/2017 Penyelenggaraan RR Pascabencana; Juklak BNPB 5/2024 DSP stimulan rumah (teks tidak ada di korpus); Renas 3.1.2.c",
         celah="Pola pokmas dipakai lagi (Lombok, Palu, Cianjur) tanpa evaluasi mutu independen yang dipublikasikan.",
         posisi="Rujukan tata kelola", unit="Direktorat Rehabilitasi dan Rekonstruksi Perumahan;Direktorat Rehabilitasi dan Rekonstruksi Sosial, Ekonomi, dan Lingkungan Hidup",
         kl="Kementerian Perumahan dan Kawasan Permukiman;Kementerian Pekerjaan Umum;pemerintah daerah", renas="3.1.2;3.2.1", renstra="4", ripb_strategi="6c", catatan=""),
    dict(id="P08", nama="BRR Aceh-Nias: badan rekonstruksi berbatas waktu", kelompok="Dalam negeri", lokasi="Aceh dan Nias", periode="2005-2009",
         lembaga="Badan Rehabilitasi dan Rekonstruksi (BRR) Aceh-Nias", fase="pascabencana", bencana="tsunami;gempa", aksi="regulasi", kajian="mitigasi",
         apa="Satu badan berbatas waktu mengoordinasikan dana APBN, donor, dan LSM serta proyek rekonstruksi perumahan, infrastruktur, dan penghidupan.",
         dampak="Dalam 4 tahun: 140.304 rumah permanen dibangun terhadap 139.195 rumah hancur atau rusak berat (angka yang juga dipakai sebagai target); 1.759 sekolah dibangun (3.415 rusak); 1.115 fasilitas kesehatan (517 rusak); 3.696 km jalan (2.618 km rusak). Ini angka keluaran yang dilaporkan BRR sendiri, bukan uji mutu atau hunian.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Mandat hukum tegas dan berbatas waktu; satu pintu dana; serah terima aset ke pemda direncanakan sejak awal.",
         status="dikembangkan", dasar="Sudah ada: Perban BNPB 6/2017 Penyelenggaraan Rehabilitasi dan Rekonstruksi Pascabencana dan Deputi Bidang Rehabilitasi dan Rekonstruksi (Perban 6/2025 jo. 11/2025); preseden BRR 2005-2009. Yang dikembangkan: templat badan/satgas RR berbatas waktu yang siap pakai (mandat, satu pintu dana, serah terima aset)",
         celah="Tiap bencana besar membentuk pengaturan ad hoc baru; pelajaran manajemen BRR belum dibakukan.",
         posisi="Rujukan tata kelola", unit="Deputi Bidang Rehabilitasi dan Rekonstruksi;Biro Hukum, Organisasi, dan Kerja Sama",
         kl="Bappenas;Kementerian Keuangan;Kementerian Perumahan dan Kawasan Permukiman;pemerintah daerah", renas="3.2.1", renstra="4", ripb_strategi="6a", catatan=""),
    dict(id="P09", nama="Rehabilitasi-rekonstruksi rumah pascagempa Lombok 2018 (stimulan, pokmas, RISHA)", kelompok="Dalam negeri", lokasi="NTB", periode="2018-2020",
         lembaga="BNPB, Kementerian PU, BPBD NTB, pemda", fase="pascabencana", bencana="gempa", aksi="kapasitas", kajian="mitigasi",
         apa="Dana stimulan per kelas kerusakan lewat kelompok masyarakat, pilihan tipe rumah tahan gempa (RISHA, RIKO, RIKA, konvensional), dan fasilitator.",
         dampak="Per Maret 2020: 170.559 dari 226.204 rumah sasaran selesai (75,40%) dan 209.634 tertangani (92,67%). Per akhir Agustus 2020: sekitar 89% rumah rusak berat selesai, disebut ±65.000 atau ±68.000 dari 74.774 atau 74.707 unit (dua versi dalam satu rilis); pandemi dan realokasi anggaran disebut penghambat. Mutu RISHA terhadap guncangan belum diuji dan tidak ditemukan evaluasi independen.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Pendanaan cair tepat waktu; fasilitator cukup per desa; pilihan tipe rumah yang dapat dibangun dengan bahan dan tenaga lokal.",
         status="dikembangkan", dasar="Juklak BNPB 5/2024 DSP stimulan rumah (teks tidak ada di korpus); Renas 3.1.2.c",
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
         posisi="Program berjalan, wajib evaluasi dampak", unit="Direktorat Mitigasi Bencana;Direktorat Pengembangan Strategi Penanggulangan Bencana",
         kl="Kementerian Pertanian;Kementerian Pekerjaan Umum;Kementerian Desa PDT", renas="", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P11", nama="Sumur resapan dan lubang resapan biopori", kelompok="Dalam negeri", lokasi="DKI Jakarta dan kota lain", periode="2010-sekarang",
         lembaga="Pemerintah daerah", fase="prabencana", bencana="banjir", aksi="infrastruktur", kajian="air-jawa",
         apa="Sumur dan lubang resapan di persil dan ruang publik untuk menahan limpasan dan mengisi air tanah dangkal.",
         dampak="Untuk Jakarta, pakar IPB menilai kontribusinya terhadap pengurangan banjir kecil pada hujan periode ulang di atas 2 tahun; efektif hanya bila muka air tanah lebih dari 2,5 m dan permeabilitas lebih dari 2,0 cm/jam. Model DAS Kamoning (Sampang) dengan vegetasi 40% ditambah sumur resapan dan injeksi menurunkan limpasan 78,14% (simulasi, bukan pengukuran). Tidak ditemukan pengukuran skala kota.",
         jenis_eval="pendapat-ahli", kekuatan="lemah",
         syarat="Muka air tanah dalam dan tanah permeabel; perawatan rutin; diposisikan sebagai pelengkap, bukan pengendali banjir.",
         status="dikembangkan", dasar="Program pemda; jumlah titik di Jakarta hanya dari berita (riset B, sekunder), tidak dikutip",
         celah="Dibangun tanpa peta kelayakan hidrogeologi; tidak ada pengukuran kinerja.", posisi="Program berjalan, wajib evaluasi dampak",
         unit="Direktorat Mitigasi Bencana", kl="Kementerian Pekerjaan Umum;pemerintah daerah", renas="2.3.3", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P12", nama="Citarum Harum (pemulihan DAS Citarum)", kelompok="Dalam negeri", lokasi="DAS Citarum, Jawa Barat", periode="2018-2025",
         lembaga="Satgas PPK DAS Citarum (Perpres 15/2018), Pemprov Jawa Barat, TNI, K/L", fase="prabencana", bencana="banjir", aksi="regulasi", kajian="air-jawa",
         apa="Pengendalian pencemaran industri dan domestik, pengelolaan sampah, penertiban, rehabilitasi hulu, dan pemantauan kualitas air.",
         dampak="Menurut narasi detikJabar tanpa sumber data, IKA Sungai Citarum naik dari 33,43 (2018) menjadi 50,78 (2023); berita lain (dikutip riset B, sekunder) menulis 33,34 untuk 2018, 51,01 untuk 2022, dan 50,78 untuk Juni 2024. Pj Gubernur Jawa Barat menargetkan 60 pada akhir 2025. Deret IKA resmi KLH atau DLH Jawa Barat tidak ditemukan, metode dan titik pantau tidak dijelaskan, dan atribusi ke program belum diuji.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Komando lintas sektor dengan penegakan; pemantauan kualitas air terbuka dan konsisten; sanitasi domestik (sumber terbesar menurut DLH).",
         status="dikembangkan", dasar="Perpres 15/2018 (berakhir 2025; kutipan riset B, sekunder); pengelolaan diserahkan ke kab/kota mulai 2026 (sekunder)",
         celah="Data IKA tidak konsisten antarsumber; kelanjutan pasca-2025 belum jelas; relevansi bencana tidak langsung (air baku).",
         posisi="Program berjalan, wajib evaluasi dampak", unit="Direktorat Mitigasi Bencana;Direktorat Pemetaan dan Evaluasi Risiko Bencana",
         kl="Kementerian Lingkungan Hidup;Kementerian Pekerjaan Umum;Pemprov Jawa Barat", renas="2.3.3", renstra="2", ripb_strategi="3a", catatan=""),
    dict(id="P13", nama="PAMSIMAS (penyediaan air minum dan sanitasi berbasis masyarakat)", kelompok="Dalam negeri", lokasi="Indonesia, perdesaan", periode="2008-2023",
         lembaga="Kementerian PU dengan Bank Dunia dan DFAT", fase="prabencana", bencana="kekeringan", aksi="infrastruktur", kajian="air-jawa",
         apa="Sistem air minum perdesaan dibangun dan dikelola kelompok warga (BP-SPAMS) dengan iuran, ditambah perubahan perilaku sanitasi.",
         dampak="Laporan penyelesaian Bank Dunia 2023 (ringkasan RWSN): layanan air berkelanjutan untuk ±24,8 juta jiwa (target awal 22,1 juta) di lebih dari 35.553 desa; ±91% sistem berfungsi baik. Evaluasi independen untuk DFAT (laporan akhir Januari 2023) menilai data MIS terlalu optimistis: banyak sistem yang tercatat berfungsi penuh kekurangan air saat pemakaian puncak atau kemarau; dengan sampel 42 desanya, taksiran EIRR Bank Dunia 36,1% dikoreksi menjadi 30,8%.",
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
         syarat="Pasokan air pengganti tersedia sebelum larangan; zona kritis berbasis pengukuran; tarif air tanah lebih mahal dari air perpipaan; penegakan izin; hasil butuh lebih dari satu dekade (Tokyo: 1964-1975).",
         status="dikembangkan", dasar="Pergub DKI 93/2021 zona bebas air tanah dan Kepmen ESDM 291.K/2023 (kutipan riset B, sekunder); Renas 2.4.4.a NSPK mitigasi subsiden (PJ KLH)",
         celah="Cakupan air perpipaan rendah di Pantura; data subsiden dan zona konservasi CAT tidak terbuka; kewenangan izin tersebar.",
         posisi="Program (bukti kuat)", unit="Direktorat Mitigasi Bencana;Direktorat Pemetaan dan Evaluasi Risiko Bencana;Direktorat Pengembangan Strategi Penanggulangan Bencana",
         kl="Kementerian ESDM;Kementerian Pekerjaan Umum;Kementerian Lingkungan Hidup;Kementerian ATR/BPN;pemerintah daerah", renas="2.4.4", renstra="2", ripb_strategi="3a",
         catatan="Osaka: Kementerian Lingkungan Jepang mencatat laju melambat setelah pengendalian 1960-an; angka Osaka tidak dikutip."),
    dict(id="P17", nama="Delta Programme Belanda (UU, dana, komisaris, laporan tahunan)", kelompok="Luar negeri", lokasi="Belanda", periode="2010-2050",
         lembaga="Delta Commissioner; Rijkswaterstaat; waterschappen", fase="prabencana", bencana="banjir;kekeringan", aksi="regulasi", kajian="air-jawa",
         apa="Delta Act 2012 membentuk program, dana jangka panjang, dan komisaris independen yang melapor tahunan ke kabinet dan parlemen dengan target 2050 per agenda.",
         dampak="Laporan kemajuan publik tahunan: agenda keamanan banjir 82% menuju target 2050, sementara air tawar dan adaptasi ruang masing-masing sekitar 10% (Delta Programme 2026). Ini indikator kemajuan pelaksanaan, bukan ukuran dampak kejadian.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Payung hukum, dana khusus multi-tahun, pemegang mandat independen, laporan kemajuan berangka.",
         status="baru", dasar="Yang dirujuk hanya laporan kemajuan berangka; dana air khusus dan komisaris tidak diusulkan (KERANGKA M05). Wadah yang dirujuk UU 17/2019: Dewan SDA Nasional (Pasal 65) dan wadah koordinasi pengelolaan SDA wilayah sungai (Pasal 11 huruf h), dipimpin Kementerian PU dan Bappenas; keberadaannya saat ini belum diverifikasi",
         celah="Kewenangan air terbagi BBWS, pemda, PDAM, ESDM; tidak ada pelapor kemajuan tunggal; keberadaan Dewan SDA Nasional dan wadah koordinasi wilayah sungai per Oktober 2026 belum dapat dipastikan.",
         posisi="Rujukan tata kelola", unit="Deputi Bidang Sistem dan Strategi;Direktorat Pengembangan Strategi Penanggulangan Bencana",
         kl="Kementerian Pekerjaan Umum;Bappenas", renas="4.7.1", renstra="1", ripb_strategi="4c",
         catatan="Status padanan belum dapat dipastikan, bukan Sudah ada, perlu dikembangkan, sampai keberadaan wadah diverifikasi (KERANGKA M05)."),
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
    dict(id="P19", nama="Kesiapsiagaan siklon Bangladesh: Cyclone Preparedness Programme (CPP), shelter, dan tanggul pesisir", kelompok="Luar negeri", lokasi="Pesisir Bangladesh", periode="1972-sekarang",
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
         dampak="Siklon Phailin 2013: 44 korban jiwa, 13,2 juta jiwa terdampak, lebih dari 1 juta jiwa dievakuasi dalam 36 jam sebelum pendaratan. Siklon Super 1999: sekitar 10.000 meninggal, 18 juta jiwa terdampak. Angka awal korban Phailin dalam feature Bank Dunia: 38. Ini perbandingan dua badai yang berbeda, bukan pembanding terkontrol.",
         jenis_eval="data-resmi-pra-pasca", kekuatan="sedang",
         syarat="Prakiraan jalur dan intensitas yang tepat; keputusan evakuasi dini oleh pemerintah daerah; shelter dan logistik siap; latihan berkala.",
         status="dikembangkan", dasar="Perban BNPB 9/2025 Penyusunan dan Uji Coba Rencana Penanggulangan Kedaruratan Bencana Daerah; Perban BNPB 2/2023 Penyusunan Rencana Kontingensi Bencana; Renas 1.2.1",
         celah="Pemicu evakuasi berbasis prakiraan (cuaca ekstrem, banjir) belum dibakukan.",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Peringatan Dini;Direktorat Koordinasi Pengendalian Operasi Darurat;Direktorat Kesiapsiagaan",
         kl="BMKG;pemerintah daerah;BPBD", renas="1.2.1", renstra="3", ripb_strategi="5a", catatan=""),
    dict(id="P21", nama="Pendidikan kebencanaan Kamaishi (Jepang)", kelompok="Luar negeri", lokasi="Kota Kamaishi, Iwate, Jepang", periode="2004-2011",
         lembaga="Dinas Pendidikan Kamaishi dengan Prof. T. Katada", fase="prabencana", bencana="tsunami;gempa", aksi="kapasitas", kajian="mitigasi",
         apa="Pendidikan tiga prinsip (jangan percaya peta bahaya, lakukan yang terbaik, pelopori evakuasi) dan latihan evakuasi mandiri di sekolah.",
         dampak="Saat tsunami Maret 2011, 99,8% dari sekitar 3.000 siswa SD dan SMP di 14 sekolah Kota Kamaishi selamat.",
         jenis_eval="kejadian-tunggal", kekuatan="sedang",
         syarat="Latihan rutin yang menuntut keputusan sendiri; guru dilatih; jalur ke tempat tinggi; skenario melampaui peta bahaya.",
         status="dikembangkan", dasar="Padanan Indonesia: SPAB (P02)", celah="Satu kejadian tanpa kelompok pembanding terkontrol; SPAB belum mengukur hasil gladi.",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Kesiapsiagaan", kl="Kementerian Pendidikan Dasar dan Menengah;Kementerian Agama",
         renas="2.1.2;4.5.2", renstra="2", ripb_strategi="4g", catatan="Tahun mulai 2004 dari laman kedutaan Jepang (tidak dibuka); angka korban hanya dari JST."),
    dict(id="P22", nama="Kode bangunan tahan gempa Chile (NCh433) dan penegakannya", kelompok="Luar negeri", lokasi="Chile", periode="1972-sekarang",
         lembaga="Pemerintah Chile (komite kode seismik)", fase="prabencana", bencana="gempa", aksi="regulasi", kajian="mitigasi",
         apa="Kode seismik nasional dengan geser dasar minimum, ditegakkan lewat izin bangunan, dan diperbarui setelah tiap gempa besar.",
         dampak="Gempa Maule 2010 (Mw 8,8): dari bangunan hunian berizin 1985-2009, kegagalan 0,5% pada 9.974 bangunan tiga lantai atau lebih dan 2,8% pada 1.939 bangunan sembilan lantai atau lebih; sekitar 4 runtuh dan sekitar 50 harus dibongkar. Korban jiwa resmi sementara 528 (angka pemerintah per 8 Maret 2010, dikutip ECHO). Satu kejadian, tanpa data kinerja gempa sebelumnya dan tanpa pembanding bangunan nonkode.",
         jenis_eval="kejadian-tunggal", kekuatan="sedang",
         syarat="Kode diperbarui dari pelajaran gempa; izin dan pengawasan konstruksi ditegakkan; insinyur tersertifikasi.",
         status="dikembangkan", dasar="Renas 2.3.4.a pengawasan penerapan standar bangunan tahan bencana (PJ Kementerian PU dan BNPB); SNI ketahanan gempa dan persetujuan bangunan gedung (rujukan umum, teks tidak diperiksa di sesi ini)",
         celah="Rumah nonteknis tidak tersentuh izin; pengawasan lemah (kerusakan Cianjur 2022).",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Mitigasi Bencana;Direktorat Rehabilitasi dan Rekonstruksi Perumahan",
         kl="Kementerian Pekerjaan Umum;Kementerian Perumahan dan Kawasan Permukiman;pemerintah daerah", renas="2.3.4", renstra="2", ripb_strategi="4f;6c", catatan=""),
    dict(id="P23", nama="Asuransi risiko bencana dan pooling regional (CCRIF, ARC; Asuransi BMN dan Dana Bersama PB)", kelompok="Luar negeri", lokasi="Karibia, Afrika; Indonesia",
         periode="2007-sekarang", lembaga="CCRIF SPC; African Risk Capacity; Kemenkeu (DJKN, BKF), BPDLH", fase="pascabencana", bencana="gempa;cuaca-ekstrem;kekeringan;banjir",
         aksi="pembiayaan", kajian="mitigasi",
         apa="Asuransi parametrik bagi pemerintah (pembayaran otomatis bila pemicu terpenuhi) dan asuransi aset negara; dana bersama untuk prabencana, darurat, pascabencana, dan transfer risiko.",
         dampak="CCRIF: 54 pembayaran ±US$245 juta ke 16 anggota sejak 2007, dibayar dalam 14 hari setelah bencana (per April 2022); per Desember 2023 deret kumulatif itu menjadi 63 pembayaran, US$266,8 juta, ke 17 anggota. ARC (evaluasi independen OPM): ketepatan waktu pembayaran dinilai baik (3 dari 4 pembayaran di bawah target 30 hari), tetapi efektivitas rencana kontinjensi dan pemerataan dinilai buruk; hanya 16 dari 36 anggota membeli polis; premi reasuransi 81% dari harapan pembayaran. Indonesia: Asuransi BMN menutup klaim Rp1,14 miliar untuk 18 BMN pada 2020 (13 K/L peserta).",
         jenis_eval="evaluasi-independen", kekuatan="sedang",
         syarat="Pemicu parametrik yang cocok dengan kerugian nyata (risiko basis kecil); rencana penggunaan dana disiapkan sebelum bencana; premi terjangkau.",
         status="dikembangkan", dasar="Perpres 75/2021 Dana Bersama PB; PMK 97/2019 Asuransi BMN; Perban BNPB 1/2026 Pelaksanaan Penelaahan, Verifikasi, dan Evaluasi terhadap Penyaluran Dana Bersama PB; Renas 4.6.2, 4.6.3, 2.5.1.c",
         celah="Klaim ABMN kecil dibanding premi (2024, sekunder); dampak pembayaran pada kecepatan pemulihan belum diukur; SEADRIF (ASEAN) tidak ditelusuri di sesi ini.",
         posisi="Program dengan syarat (bukti sedang)", unit="Direktorat Pengembangan Strategi Penanggulangan Bencana;Biro Keuangan;Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur",
         kl="Kementerian Keuangan;BPDLH;Otoritas Jasa Keuangan", renas="4.6.2;4.6.3;2.5.1", renstra="6", ripb_strategi="3b", catatan=""),
    dict(id="P24", nama="Hibah mitigasi FEMA (HMGP, BRIC) dengan syarat analisis manfaat-biaya", kelompok="Luar negeri", lokasi="Amerika Serikat", periode="1993-sekarang",
         lembaga="FEMA; negara bagian", fase="prabencana", bencana="banjir;cuaca-ekstrem;gempa", aksi="pembiayaan", kajian="keduanya",
         apa="Hibah federal untuk proyek mitigasi (pembelian rumah di dataran banjir, ruang aman, perkuatan) yang wajib lolos analisis manfaat-biaya.",
         dampak="Analisis NIBS (lembar fakta FEMA, Juni 2018): hibah mitigasi federal menghemat rata-rata US$6 untuk tiap US$1 (studi 2005: 4:1); banjir sungai 7 kali, angin 5:1, gempa 3 kali untuk investasi publik dan 4 kali untuk desain di atas kode. Rasio ini hasil pemodelan, bukan pengukuran pascakejadian. Program BRIC dihentikan FEMA; pengadilan memutus pada Desember (rilis NC DOJ 24 Mar 2026 tidak menulis tahunnya) bahwa penghentian itu melanggar hukum, lalu FEMA mengajukan rencana memulai lagi (Maret 2026).",
         jenis_eval="model", kekuatan="sedang",
         syarat="Data kerugian dan bahaya untuk menghitung manfaat; standar analisis manfaat-biaya yang seragam; pendanaan stabil lintas tahun.",
         status="baru", dasar="Perban BNPB 1/2026 Pasal 14 ayat (4) hanya mensyaratkan kesesuaian dengan Renas PB dan RKP (K/L) atau RKPD, RPBD, dan/atau SPM (pemda), dan Pasal 16 ayat (3) hanya meminta KAK, RAB, reviu APIP, spesifikasi, dan dokumen lingkungan-sosial; tidak ada analisis manfaat-biaya, begitu pula di Juklak 1/2025, 3/2025, 4/2025, 6/2025, dan 2/2026 (dicek mesin). Juklak 4/2025 menginduk Perban 1/2024 yang dicabut Perban 1/2026 Pasal 34; statusnya perlu dicek",
         celah="Usulan prabencana Dana Bersama dinilai tanpa rasio manfaat-biaya; data kerugian rupiah per kejadian (DIBI) belum konsisten.",
         posisi="Rujukan tata kelola", unit="Direktorat Pengembangan Strategi Penanggulangan Bencana;Direktorat Mitigasi Bencana;Biro Perencanaan",
         kl="Kementerian Keuangan;Bappenas;BPDLH", renas="4.6.2", renstra="2", ripb_strategi="3b;3c", catatan=""),
    dict(id="P25", nama="Evakuasi preemptif topan di Filipina (Albay, NDRRMC)", kelompok="Luar negeri", lokasi="Filipina", periode="2010-sekarang",
         lembaga="NDRRMC/OCD; pemerintah provinsi (APSEMO Albay)", fase="prabencana;tanggap-darurat", bencana="cuaca-ekstrem", aksi="kapasitas", kajian="mitigasi",
         apa="Evakuasi paksa sebelum topan berdasarkan prakiraan; target 'zero casualty' provinsi.",
         dampak="Topan Haiyan 2013 menewaskan lebih dari 6.000 orang; Topan Rai/Odette 2021 lebih dari 400 orang, dan WFP mengkreditkan langkah preemptif tanpa angka pembanding. Klaim zero casualty Albay (Topan Nona 2015) berasal dari gubernur; pada Topan Nina 2016 terjadi 4 kematian yang oleh kepala APSEMO disebut kegagalan evakuasi.",
         jenis_eval="laporan-sendiri", kekuatan="lemah",
         syarat="Prakiraan tepat; kewenangan evakuasi paksa; tempat evakuasi layak.",
         status="dikembangkan", dasar="Perban BNPB 9/2025 Penyusunan dan Uji Coba Rencana Penanggulangan Kedaruratan Bencana Daerah; Renas 1.2.1", celah="Perbandingan Haiyan dan Rai tidak mengendalikan kekuatan topan dan keterpaparan.",
         posisi="Pelajaran, bukan teladan", unit="Direktorat Kesiapsiagaan;Direktorat Koordinasi Pengendalian Operasi Darurat", kl="BMKG;pemerintah daerah;BPBD",
         renas="1.2.1", renstra="3", ripb_strategi="5a", catatan=""),
]

# ============================================================================ peran, pemimpin, padanan (KERANGKA §10, prinsip 12 dan 14)

# nama di kolom kl, lembaga, dan PJ Renas -> kode data/lembaga/lembaga.csv (Perpres 90/2025). Nama di LUAR_LEMBAGA belum punya baris
# lembaga.csv karena mandat tertulisnya belum dibaca paket lembaga; dicatat apa adanya, tidak ditebak.
NAMA_KODE = {"BNPB": "BNPB", "BPBD": "BPBD", "BMKG": "BMKG", "Bappenas": "KEMEN_PPN", "Kementerian ATR/BPN": "ATR_BPN", "Kementerian Agama": "KEMENAG",
             "Kementerian Dalam Negeri": "KEMENDAGRI", "Kementerian Desa PDT": "KEMENDES", "Kementerian ESDM": "KEMEN_ESDM",
             "Kementerian Kehutanan": "KEMENHUT", "Kementerian Kelautan dan Perikanan": "KKP", "Kementerian Kesehatan": "KEMENKES",
             "Kementerian Keuangan": "KEMENKEU", "Kementerian Komunikasi dan Digital": "KOMDIGI", "Kementerian Lingkungan Hidup": "KLH_BPLH",
             "Kementerian Pekerjaan Umum": "KEMEN_PU", "Kementerian Pendidikan Dasar dan Menengah": "KEMENDIKDASMEN", "Kementerian Pertanian": "KEMENTAN",
             "Kementerian Perumahan dan Kawasan Permukiman": "KEMEN_PKP", "Kementerian Sosial": "KEMENSOS", "Pemprov DKI Jakarta": "PEMDA",
             "Pemprov Jawa Barat": "PEMDA", "pemerintah daerah": "PEMDA"}
LUAR_LEMBAGA = {"BPDLH", "Otoritas Jasa Keuangan"}
# pid -> (kode lembaga pemimpin dipisah ";", asal, peran BNPB (tema kosakata.peran_bnpb), kode peran BNPB K/P/R/I, catatan peran).
# asal "renas:<kode aksi>" = penanggung jawab baris Rencana Aksi Renas PB itu (dicek ke renas_aksi_terkait); "penyusun: ..." = penilaian penyusun.
# Program luar negeri: pemimpin dan peran untuk padanannya di Indonesia.
PERAN_PROGRAM = {
    "P01": ("KEMENDES;BNPB;KEMENSOS", "renas:4.5.1.a", "nspk", "K", ""),
    "P02": ("KEMENDIKDASMEN;KEMENAG", "renas:2.1.2.a", "nspk", "P", "BNPB kontributor Renas 2.1.2.a; penanggung jawab Kemendikdasmen dan Kemenag"),
    "P03": ("BMKG", "renas:1.1.2.d", "koordinasi", "I", "BMKG penanggung jawab hulu; BNPB dan BPBD menyebarkan peringatan sampai warga (Perban 2/2024)"),
    "P04": ("BMKG", "penyusun: program BMKG, tanpa baris Rencana Aksi Renas", "koordinasi", "P", "program BMKG; BNPB hanya penghubung ke BPBD"),
    "P05": ("KEMENHUT", "renas:1.2.3.d", "koordinasi", "P", "BNPB kontributor Renas 1.2.3.d; penanggung jawab Kementerian Kehutanan"),
    "P06": ("KEMENHUT", "renas:2.3.3.b", "koordinasi", "P", "restorasi gambut dipimpin Kementerian Kehutanan; BNPB pada siaga darurat karhutla"),
    "P07": ("KEMEN_PKP", "renas:3.1.2.c", "koordinasi", "P", "BNPB kontributor Renas 3.1.2.c; penanggung jawab Kementerian PKP"),
    "P08": ("BNPB", "penyusun: koordinasi rehabilitasi dan rekonstruksi oleh BNPB (UU 24/2007; Perban 5/2017 R3P)", "koordinasi", "K", ""),
    "P09": ("KEMEN_PKP", "renas:3.1.2.c", "koordinasi", "P", "BNPB kontributor Renas 3.1.2.c; penanggung jawab Kementerian PKP"),
    "P10": ("KEMENTAN;KEMEN_PU", "penyusun: pelaksana embung di kolom lembaga, tanpa baris Rencana Aksi Renas", "koordinasi", "P", "program Kementan dan Kementerian PU; BNPB hanya data rawan kekeringan"),
    "P11": ("PEMDA", "penyusun: pelaksana di kolom lembaga, tanpa baris Rencana Aksi Renas", "koordinasi", "P", "program pemerintah daerah; BNPB tanpa peran pelaksana"),
    "P12": ("PEMDA", "penyusun: Satgas PPK DAS Citarum dan Pemprov Jawa Barat di kolom lembaga", "data-krb", "P", "program Satgas Citarum; BNPB pada data risiko banjir"),
    "P13": ("KEMEN_PU", "penyusun: pelaksana di kolom lembaga, tanpa baris Rencana Aksi Renas", "data-krb", "P", "program Kementerian PU; BNPB pada data desa rawan kekeringan"),
    "P14": ("KEMEN_PU", "penyusun: BBWS Ciliwung-Cisadane di kolom lembaga", "data-krb", "P", "infrastruktur Kementerian PU; BNPB pada KRB banjir"),
    "P15": ("KEMEN_PU", "renas:2.4.2.a", "data-krb", "P", "BNPB pada KRB banjir dan rob serta rencana kontingensi (KERANGKA prinsip 2)"),
    "P16": ("KLH_BPLH", "renas:2.4.4.a", "data-krb", "P", "PJ Renas 2.4.4.a KLH; BNPB diusulkan menjadi kontributor pada peninjauan Renas (KERANGKA prinsip 2)"),
    "P17": ("KEMEN_PU;KEMEN_PPN", "penyusun: Dewan SDA Nasional dan wadah koordinasi wilayah sungai dipimpin Kementerian PU dan Bappenas (KERANGKA M05)", "koordinasi", "P",
            "BNPB menyampaikan catatan risiko lewat wadah koordinasi; bukan pemimpin rezim air (UU 17/2019 Pasal 35)"),
    "P18": ("KEMEN_PU", "penyusun: pengendalian banjir sungai kewenangan Kementerian PU", "data-krb", "P", "uji coba dipimpin Kementerian PU; BNPB pada data risiko"),
    "P19": ("KEMENDES;BNPB;KEMENSOS", "renas:4.5.1.a", "koordinasi", "K", ""),
    "P20": ("BNPB", "renas:1.2.1.c", "nspk", "K", ""),
    "P21": ("KEMENDIKDASMEN;KEMENAG", "renas:2.1.2.a", "nspk", "P", "BNPB kontributor Renas 2.1.2.a; penanggung jawab Kemendikdasmen dan Kemenag"),
    "P22": ("KEMEN_PU;BNPB", "renas:2.3.4.a", "monev", "K", ""),
    "P23": ("KEMENKEU;BNPB;KEMENDAGRI", "renas:4.6.3.a", "dana-bersama", "K", ""),
    "P24": ("BNPB;KEMENKEU", "penyusun: penelaahan Dana Bersama oleh BNPB (Perban 1/2026) atas dana Perpres 75/2021", "dana-bersama", "K", ""),
    "P25": ("BNPB", "renas:1.2.1.c", "nspk", "K", ""),
}
# program luar negeri tidak diberi status Indonesia (KERANGKA prinsip 12): padanan di Indonesia dan status padanannya. Status padanan dari
# kolom status program (yang dulu ditulis sebagai status program luar negeri itu), kecuali yang diubah keputusan KERANGKA.
PADANAN = {
    "P16": "zona bebas air tanah DKI dan pengendalian izin air tanah, dengan NSPK mitigasi penurunan muka tanah Renas 2.4.4.a",
    "P17": "Dewan SDA Nasional dan wadah koordinasi pengelolaan SDA wilayah sungai (UU 17/2019 Pasal 65 dan Pasal 11 huruf h)",
    "P18": "belum ada; pengendalian banjir sungai di Jawa didominasi normalisasi dan tanggul",
    "P19": "relawan PB, Destana (P01), dan sistem peringatan dini tsunami (P03)",
    "P20": "rencana kontingensi BPBD (Perban 2/2023) dan rencana penanggulangan kedaruratan daerah (Perban 9/2025)",
    "P21": "SPAB (P02)",
    "P22": "pengawasan penerapan standar bangunan tahan bencana Renas 2.3.4.a",
    "P23": "Dana Bersama PB (Perpres 75/2021) dan asuransi BMN (Renas 4.6.3.a)",
    "P24": "Dana Bersama PB tanpa syarat analisis manfaat-biaya (Perban 1/2026)",
    "P25": "rencana penanggulangan kedaruratan daerah (Perban 9/2025)",
}
STATUS_PADANAN_UBAH = {"P17": ("belum-dipastikan", "KERANGKA M05: Sudah ada, perlu dikembangkan ditolak sampai keberadaan wadah diverifikasi")}
STATUS_PADANAN_LAIN = {"belum-dipastikan": "belum dapat dipastikan"}


def kode_dari_nama(teks):
    """'Kementerian X;BPBD' -> ('KODE;KODE', [nama di luar lembaga.csv]). Nama tak dikenal (bukan LUAR_LEMBAGA) menghentikan build."""
    kode, luar = [], []
    for n in (x.strip() for x in teks.split(";") if x.strip()):
        if n in LUAR_LEMBAGA:
            luar.append(n)
            continue
        assert n in NAMA_KODE, f"nama lembaga {n!r} tidak dipetakan ke lembaga.csv (NAMA_KODE) dan bukan LUAR_LEMBAGA"
        kode.append(NAMA_KODE[n])
    return ";".join(dict.fromkeys(kode)), luar


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
    berlaku_set = {o["unit"] for o in org if o["status"] == "berlaku"}
    rs = []
    for ss, nama, ind, base, tg in RENSTRA_SS:
        hal = hlm_urut(RS, ind, 132, 132)
        deret_terikat(RS, 132, 132, ind, [" ".join(tg)])  # Tabel 4.5 tidak memuat kolom baseline
        rs.append(dict(tingkat="sasaran strategis", kode=ss, program="", sasaran=nama, indikator=ind, baseline=base,
                       t2025=tg[0], t2026=tg[1], t2027=tg[2], t2028=tg[3], t2029=tg[4], unit_renstra="Kepala BNPB", unit_otk_berlaku="Kepala BNPB",
                       pemetaan_penyusun="", label_pemetaan="", halaman=hal, label="resmi"))
    for kode, prog, sas, inds, unit in RENSTRA_PROGRAM:
        hlm(RS, f"{kode}. {prog}")  # daftar tujuh program, hlm. 103
        for ind, base, tg in inds:
            hal = hlm_urut(RS, ind, 130, 131, celah=6)
            deret_terikat(RS, 132, 133, ind, [" ".join(([base] if base != "N/A" else []) + tg)], jendela=10)  # baseline lalu target, di baris indikatornya
            assert unit in berlaku_set, unit
            rs.append(dict(tingkat="program", kode=f"P{kode}", program=prog, sasaran=sas, indikator=ind, baseline=base,
                           t2025=tg[0], t2026=tg[1], t2027=tg[2], t2028=tg[3], t2029=tg[4], unit_renstra=unit, unit_otk_berlaku=unit,
                           pemetaan_penyusun="", label_pemetaan="", halaman=f"{hal}; target hlm. 132-133", label="resmi"))
    for kode, unit, sas, ind, tg, ocr in RENSTRA_SK:
        hlm_urut(RS, sas, 134, 140, celah=20)
        hal = hlm_urut(RS, ind, 134, 140, celah=20)
        deret_terikat(RS, 134, 140, ind, ocr or [" ".join(tg)])  # deret lima tahun (atau potongan OCR bila kolom bertukar) di baris indikatornya
        prog = next(p for k, p, *_ in RENSTRA_PROGRAM if k == kode)
        # unit_otk_berlaku hanya bila unit itu ada di OTK berlaku (dasar pasal); pemetaan unit lama = penilaian penyusun, kolom terpisah
        assert (unit in berlaku_set) != (unit in PETA_UNIT_LAMA), unit
        rs.append(dict(tingkat="sasaran kegiatan", kode=f"P{kode}", program=prog, sasaran=sas, indikator=ind, baseline="",
                       t2025=tg[0], t2026=tg[1], t2027=tg[2], t2028=tg[3], t2029=tg[4], unit_renstra=unit,
                       unit_otk_berlaku=unit if unit in berlaku_set else "", pemetaan_penyusun=PETA_UNIT_LAMA.get(unit, ""),
                       label_pemetaan="penilaian-pakar" if unit in PETA_UNIT_LAMA else "", halaman=hal, label="resmi"))
    tabel["renstra_bnpb_2025_2029"] = tulis_csv("renstra_bnpb_2025_2029.csv",
        ["tingkat", "kode", "program", "sasaran", "indikator", "baseline", "t2025", "t2026", "t2027", "t2028", "t2029",
         "unit_renstra", "unit_otk_berlaku", "pemetaan_penyusun", "label_pemetaan", "halaman", "label"], rs)

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
    assert set(fk31) == set(RENAS_PROGRAM), f"Tabel 3.1 Renas memuat program {sorted(set(fk31) ^ set(RENAS_PROGRAM))} di luar/kurang dari RENAS_PROGRAM"
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
        urut_baris(RN, kode, tok, h)  # token berurutan di baris kode itu: nama kegiatan, baseline, lalu target
        lama = [f"{k}: kini {v['pengganti']} ({v['sejak']})" for k, v in NAMA_KL_LAMA.items() if re.search(rf"(^|; ){re.escape(k)}(;|$)", f"{pj}; {kon}")]
        cat = "; ".join(x for x in [cat, *(f"nomenklatur Renas disalin verbatim, {x}" for x in lama)] if x)
        sa.append(dict(kode=kode, program_renas=kode.rsplit(".", 1)[0], kegiatan=keg, indikator=ind, satuan=sat, baseline_2024=base, target_2029=tgt,
                       penanggung_jawab=pj, kontributor=kon, halaman=h, label="resmi", catatan=cat))
    tabel["renas_aksi_terkait"] = tulis_csv("renas_aksi_terkait.csv",
        ["kode", "program_renas", "kegiatan", "indikator", "satuan", "baseline_2024", "target_2029", "penanggung_jawab", "kontributor", "halaman", "label", "catatan"], sa)

    # --- bukti
    bk = []
    for i, (pid, ind, nil, sat, per, peran, src, lok, lab, ver, kut, cat, konf) in enumerate(B, 1):
        judul, penerbit, url, terbit, akses = SUMBER[src]
        if ver == "korpus-lokal":
            if kut:
                h = hlm(SLUG[src], kut)
            else:  # angka resmi tanpa kalimat utuh: halaman yang memuat kode kegiatan / rentang tabel DAN nilainya
                m = re.search(r"kode (\S+)", lok)
                rentang = {"Tabel 4.6": (132, 133), "Tabel 4.7": (134, 140)}.get(lok, (0, 9999))
                pot = re.search(r"\((\S+?)\|", cat)  # angka terbelah baris di OCR: cari bagian sebelum '|'
                cari = pot.group(1) if pot else nil
                h = next((n for n, t, _ in dok(SLUG[src]) if rentang[0] <= n <= rentang[1] and cari in t and (not m or m.group(1) in t)), None)
                assert h, f"{pid}: nilai resmi {nil} ({lok}) tidak ditemukan di korpus {src}"
            lok = f"{lok}, hlm. {h}"
        bk.append(dict(id=f"B{i:03d}", program=pid, indikator=ind, nilai=nil, nilai_angka=(round(angka(nil, sat), 6) if nil else ""),
                       satuan=sat, periode=per, peran=peran, sumber=judul, penerbit=penerbit, url_atau_berkas=url, akses=akses, terbit=terbit, lokasi=lok,
                       tanggal_akses=f"gagal-dibuka:{akses}" if ver == "ringkasan-mesin-cari" else TGL, label=lab, verifikasi=ver,
                       kutipan=kut, catatan=cat, grup_konflik=konf, _src=src))
    tabel["bukti_dampak"] = tulis_csv("bukti_dampak.csv",
        ["id", "program", "indikator", "nilai", "nilai_angka", "satuan", "periode", "peran", "sumber", "penerbit", "url_atau_berkas", "akses", "terbit",
         "lokasi", "tanggal_akses", "label", "verifikasi", "kutipan", "catatan", "grup_konflik"], bk)

    # --- kompendium
    unit_berlaku = {o["unit"] for o in org if o["status"] == "berlaku"}
    lem = {x["kode"]: x["nama_resmi_okt2026"] for x in csv.DictReader(open(P("data/kajian-bnpb/data/lembaga/lembaga.csv"), encoding="utf-8"))}
    kp = []
    for p in K:
        r = dict(p)
        kode, asal, peran, kperan, cperan = PERAN_PROGRAM[p["id"]]
        r.update(kode_pemimpin=kode, pemimpin="; ".join(lem[k] for k in kode.split(";")), asal_pemimpin=asal, peran_bnpb=peran,
                 kode_peran_bnpb=kperan, catatan_peran=cperan)
        r["kode_lembaga"], luar = kode_dari_nama(p["kl"])
        r["lembaga_luar"] = ";".join(luar)
        if p["kelompok"] == "Luar negeri":  # tanpa status Indonesia; status yang ditulis di K adalah status padanannya
            st, alasan = STATUS_PADANAN_UBAH.get(p["id"], (p["status"], ""))
            r.update(status="", status_label="", padanan=PADANAN[p["id"]], status_padanan=st,
                     status_padanan_label=STATUS_PADANAN_LAIN.get(st) or tema["status_usulan"][st]["label"])
            if alasan:
                r["catatan"] = "; ".join(x for x in (r["catatan"], alasan) if x)
        else:
            r.update(status_label=tema["status_usulan"][p["status"]]["label"], padanan="", status_padanan="", status_padanan_label="")
        bp = [b for b in bk if b["program"] == p["id"] and b["label"] != LABEL_BELUM]
        lab = [b["label"] for b in bp if b["nilai"]] or [b["label"] for b in bp]
        r["keyakinan"] = ";".join(dict.fromkeys(lab))  # label angka; program tanpa angka memakai label temuan kualitatifnya
        r["kekuatan_catatan"] = KEKUATAN_CATATAN.get(p["id"], "")
        r["renstra_program"] = next(pr for k, pr, *_ in RENSTRA_PROGRAM if k == p["renstra"])
        r["fokus_ripb"] = ";".join(dict.fromkeys(str(RENAS_PROGRAM[c][1]) for c in p["renas"].split(";") if c))
        r["jumlah_bukti"] = sum(b["program"] == p["id"] for b in bk)
        kp.append(r)
    kol = ["id", "nama", "kelompok", "lokasi", "periode", "lembaga", "fase", "bencana", "aksi", "kajian", "apa", "dampak", "jenis_eval", "kekuatan",
           "kekuatan_catatan", "keyakinan", "jumlah_bukti", "syarat", "status", "status_label", "padanan", "status_padanan", "status_padanan_label",
           "dasar", "celah", "posisi", "pemimpin", "kode_pemimpin", "asal_pemimpin", "peran_bnpb", "kode_peran_bnpb", "catatan_peran",
           "unit", "kl", "kode_lembaga", "lembaga_luar", "renas", "fokus_ripb", "ripb_strategi", "renstra", "renstra_program", "catatan"]
    tabel["kompendium_program"] = tulis_csv("kompendium_program.csv", kol, kp)

    cek(tabel, tema, unit_berlaku, prov_semua)
    for b in bk:
        b.pop("_src")
    indeks = json.load(open(P("data/raw/hukum/indeks.json"), encoding="utf-8"))
    ix = {v["slug"]: v for v in indeks.values() if isinstance(v, dict) and "slug" in v}
    meta = dict(paket="program-terbukti", dibangun=TGL, skrip="data/kajian-bnpb/bangun/program-terbukti.py",
                korpus={s: dict(judul=j, judul_jdih=ix[s]["Judul"], tanggal_penetapan=ix[s]["Tanggal Penetapan"], status_jdih=ix[s]["Status"],
                                url_jdih=ix[s]["url"], sha1=sha1(os.path.join(HUKUM, s + ".json")), tanggal_tarik=tanggal_berkas(os.path.join(HUKUM, s + ".json")))
                        for s, j in KORPUS.items()},
                label={k: v for k, v in LABEL_ARTI.items() if k in {b["label"] for b in bk}},
                verifikasi=VERIF, kekuatan=KEKUATAN, kekuatan_boleh={k: sorted(v) for k, v in KEKUATAN_BOLEH.items()}, posisi=POSISI, peran=PERAN,
                penerbit_pemerintah=sorted(PEMERINTAH), nama_kl_lama=NAMA_KL_LAMA,
                dibuang=[dict(program=a, angka=b, alasan=c) for a, b, c in DIBUANG],
                kontributor_renas="kolom kontributor renas_aksi_terkait hanya memuat K/L dan lembaga pusat; kolom pihak non-K/L Tabel 3.1 (pemerintah daerah, "
                                  "organisasi nonpemerintah, lembaga usaha, perguruan tinggi, media, organisasi masyarakat/komunitas) tidak disalin",
                sumber={k: dict(judul=v[0], penerbit=v[1], url_atau_berkas=v[2], terbit=v[3], akses=v[4]) for k, v in SUMBER.items()})
    json.dump(dict(meta=meta, tabel=tabel), open(os.path.join(OUT, "program-terbukti.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    tulis_md(kp, bk, org, rs, rn, rp, sa, tema)
    return tabel


# ============================================================================ self-check

KATA_ANGKA = {"satu": 1, "one": 1, "dua": 2, "two": 2, "tiga": 3, "three": 3, "empat": 4, "four": 4, "lima": 5, "five": 5, "enam": 6, "six": 6,
              "tujuh": 7, "seven": 7, "delapan": 8, "eight": 8, "sembilan": 9, "nine": 9, "sepuluh": 10, "ten": 10}


def nilai_di_kutipan(nil, kut):
    """Nilai (format id-ID) tertulis di kutipan sumber: format id, en, ribuan-spasi, tanpa pemisah, 'N ribu/thousand', atau kata (1-10)."""
    k = " ".join(kut.split())
    v = {nil}
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", nil):
        x = int(nil.replace(".", ""))
        v |= {nil.replace(".", ","), nil.replace(".", " "), str(x)} | ({f"{x // 1000} ribu", f"{x // 1000} thousand"} if x % 1000 == 0 else set())
    if re.fullmatch(r"\d+,\d+", nil):
        v.add(nil.replace(",", "."))
    if any(re.search(r"(?<![\d.,])" + re.escape(x) + r"(?![\d]|[.,]\d)", k) for x in v):
        return True
    return nil.isdigit() and any(re.search(rf"(?i)\b{w}\b", k) for w, n in KATA_ANGKA.items() if n == int(nil))


RE_RUJUKAN = re.compile(  # nomor rujukan, kode, dan tanggal yang bukan angka klaim
    r"\b\d+(?:\.K)?/\d{4}\b|\b\d\.\d\.\d(?:\.[a-z])?\b|\b\d\.\d\b|\b[PMDRKB]\d{2}\b"
    r"|\b(?:Pasal|ayat|Tabel|Bab|hlm\.|Fokus Capaian)\s*\(?\d+(?:\.\d+)?\)?"
    r"|\b\d{1,2} (?:Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des)\w* \d{4}\b")


def angka_naratif(s):
    return angka_teks(RE_RUJUKAN.sub(" ", s))


def teks_riset(berkas, _c={}):
    if berkas not in _c:
        _c[berkas] = " ".join(open(P(berkas), encoding="utf-8").read().split())
    return _c[berkas]


def cek_peran(p, tema, rn_aksi):
    """KERANGKA prinsip 14 dan §10: pemimpin (PJ Renas bila ada) berkode lembaga.csv, peran BNPB dari kosakata tertutup, dan baris yang unit
    BNPB-nya berbeda peran dengan PJ Renas wajib bercatatan (bukan K)."""
    pid, kode = p["id"], p["kode_pemimpin"].split(";")
    assert p["peran_bnpb"] in tema["peran_bnpb"] and not p["peran_bnpb"].startswith("_"), f"{pid}: peran_bnpb {p['peran_bnpb']!r} di luar kosakata tema.json peran_bnpb"
    assert p["kode_peran_bnpb"] in tema["kode_peran"] and not p["kode_peran_bnpb"].startswith("_"), f"{pid}: kode peran BNPB {p['kode_peran_bnpb']!r} bukan K/P/R/I"
    if p["asal_pemimpin"].startswith("renas:"):
        a = p["asal_pemimpin"][len("renas:"):]
        assert a in rn_aksi, f"{pid}: pemimpin dari Renas {a}, tetapi baris itu tidak ada di renas_aksi_terkait"
        pj = {NAMA_KODE[n.strip()] for n in rn_aksi[a]["penanggung_jawab"].split(";") if n.strip() in NAMA_KODE}
        assert set(kode) == pj, f"{pid}: pemimpin {sorted(kode)} != PJ Renas {a} {sorted(pj)}"
        assert a.rsplit(".", 1)[0] in p["renas"].split(";"), f"{pid}: Renas {a} bukan program Renas baris ini ({p['renas']})"
    else:
        assert p["asal_pemimpin"].startswith("penyusun: "), f"{pid}: asal pemimpin wajib renas:<kode> atau 'penyusun: alasan'"
    if "BNPB" not in kode and p["unit"]:
        assert p["kode_peran_bnpb"] != "K" and p["catatan_peran"], \
            f"{pid}: unit BNPB berbeda peran dengan pemimpin {p['pemimpin']} ({p['asal_pemimpin']}) tanpa catatan peran, atau berkode K"


def cek(t, tema, unit_berlaku, prov):
    org, rs, rn, rp = (t[k]["baris"] for k in ("organisasi_bnpb", "renstra_bnpb_2025_2029", "renas_pb_2025_2029", "ripb_2020_2044"))
    kp, bk, sa = t["kompendium_program"]["baris"], t["bukti_dampak"]["baris"], t["renas_aksi_terkait"]["baris"]
    # --- organisasi: 38 unit berlaku dengan susunan pasti (Perban 6/2025 jo. 11/2025)
    berlaku = Counter(o["jenis"] for o in org if o["status"] == "berlaku")
    susunan = {"Kepala": 1, "Unsur pengarah": 1, "Sekretariat Utama": 1, "Biro": 4, "Bagian": 4, "Deputi": 5, "Direktorat": 15,
               "Inspektorat Utama": 1, "Inspektorat": 3, "Pusat": 3}
    assert dict(berlaku) == susunan and sum(susunan.values()) == 38, f"susunan unit berlaku {dict(berlaku)} != {susunan}"
    p38 = [p for p in prov if p != "Ibu Kota Nusantara"]
    assert len(p38) == len(set(p38)) == 38, f"wilayah Direktorat PD: {len(p38)} provinsi ({len(set(p38))} unik), harus 38"
    jw = {p: u for o in org for u, p in [(o["unit"], q) for q in o["wilayah_provinsi"].split("; ") if q]}
    assert JAWA <= set(jw), f"provinsi Jawa tanpa direktorat: {JAWA - set(jw)}"
    # pasal Inspektorat II yang masih menyebut Pusat Pengendalian Operasi tidak diubah Perban 11/2025
    assert "Pusat Pengendalian Operasi" in " ".join(t for n, t, _ in dok(O6) if n in (22, 23)) and "Pasal 106" not in " ".join(t for _, t, _ in dok(O11))
    assert Counter(r["tingkat"] for r in rs)["program"] == 12 and len({r["program"] for r in rs if r["tingkat"] == "program"}) == 7  # 7 program, 12 IKP
    assert all(r["unit_otk_berlaku"] in unit_berlaku or (not r["unit_otk_berlaku"] and r["pemetaan_penyusun"]) for r in rs if r["tingkat"] != "sasaran strategis"), \
        "unit_otk_berlaku wajib unit OTK berlaku; pemetaan unit lama hanya di kolom pemetaan_penyusun"
    c = Counter(r["tingkat"] for r in rn)
    assert (c["kebijakan"], c["sasaran"], c["strategi"], c["program"]) == (6, 4, 19, 44), c
    c = Counter(r["tipe"] for r in rp)
    assert (c["sasaran"], c["kebijakan"], c["strategi"], c["fokus capaian 2025-2029"]) == (5, 6, 23, 12), c
    kode_renas = set(RENAS_PROGRAM)
    assert all(r["program_renas"] in kode_renas for r in sa)
    rn_aksi = {r["kode"]: r for r in sa}
    for r in sa:
        for lama in NAMA_KL_LAMA:
            if re.search(rf"(^|; ){re.escape(lama)}(;|$)", f"{r['penanggung_jawab']}; {r['kontributor']}"):
                assert lama in r["catatan"], f"Renas {r['kode']}: nomenklatur lama {lama} tanpa catatan pengganti"
    assert not re.search(r"pagu|anggaran proyek|biaya proyek", json.dumps([sa, bk], ensure_ascii=False), re.I), "angka pagu/biaya proyek bocor ke keluaran"

    # --- bukti per baris
    ids = {p["id"] for p in kp}
    assert len(ids) == len(kp) == 25
    jenis = {p["id"]: p["jenis_eval"] for p in kp}
    per = defaultdict(list)
    for b in bk:
        i, nil, kut, ver, lab = b["id"], b["nilai"], b["kutipan"], b["verifikasi"], b["label"]
        assert b["program"] in ids, b
        assert lab in LABEL | {LABEL_BELUM} and ver in VERIF and b["peran"] in PERAN, f"{i}: label/verifikasi/peran di luar kosakata"
        assert (lab == LABEL_BELUM) == (ver == "ringkasan-mesin-cari"), f"{i}: angka ringkasan mesin pencari wajib berlabel {LABEL_BELUM}, bukan {lab}"
        assert b["tanggal_akses"] == TGL or (ver == "ringkasan-mesin-cari" and b["tanggal_akses"].startswith("gagal-dibuka:")), i
        assert b["url_atau_berkas"], i
        assert lab != "resmi" or b["_src"] in PEMERINTAH, f"{i}: label resmi tetapi penerbit {b['penerbit']!r} bukan instansi pemerintah"
        assert not (lab == "resmi" and "[SEKUNDER]" in kut + b["catatan"]), f"{i}: angka [SEKUNDER] tidak boleh berlabel resmi"
        if nil:
            assert re.fullmatch(r"\d+(?:[.,]\d+)*", nil), f"{i}: nilai {nil!r} bukan format angka id-ID"
            assert isinstance(b["nilai_angka"], float) and math.isfinite(b["nilai_angka"]), b
            if re.search(r"(?i)model|simulas|desain|taksir", kut + " " + b["catatan"]) and b["peran"] != "masukan-model":
                assert lab == "estimasi-model", f"{i}: keluaran model/simulasi/desain/taksiran wajib berlabel estimasi-model, bukan {lab}"
            if jenis[b["program"]] == "model" and b["peran"] not in ("masukan-model", "target"):
                assert lab == "estimasi-model", f"{i}: program berjenis evaluasi model, angka {b['peran']} wajib estimasi-model"
        else:
            assert b["peran"] == "temuan-kualitatif" and kut, f"{i}: baris tanpa angka wajib temuan kualitatif berkutipan"
        if ver == "korpus-lokal" and kut:
            hlm(SLUG[b["_src"]], kut)
        if ver in ("dibuka-langsung", "korpus-lokal", "via-riset") and nil and (kut or ver == "dibuka-langsung"):
            assert nilai_di_kutipan(nil, kut), f"{i}: nilai {nil} tidak tertulis di kutipan sumbernya: {kut[:90]!r}"
        if ver == "via-riset":
            assert kut and " ".join(kut.split()) in teks_riset(b["url_atau_berkas"]), f"{i}: kutipan via-riset tidak ada di {b['url_atau_berkas']}"
        per[b["program"]].append(b)
    for g, n in Counter(b["grup_konflik"] for b in bk if b["grup_konflik"]).items():
        assert n >= 2, f"grup konflik {g} hanya {n} baris (versi pembanding hilang)"
    dipakai = {b["_src"] for b in bk} | {v["sumber"] for v in NAMA_KL_LAMA.values()}
    assert dipakai == set(SUMBER), f"sumber tak terpakai di SUMBER: {sorted(set(SUMBER) - dipakai)}"

    # --- program
    vocab = {"fase": set(tema["fase"]) - {"_aturan"}, "bencana": set(tema["jenis_bencana"]), "aksi": set(tema["jenis_aksi"])}
    ripb = {f"{k}{h}" for k, d in RIPB_STRATEGI.items() for h, _ in d}
    for p in kp:
        pid = p["id"]
        for f in ("nama", "lokasi", "periode", "lembaga", "apa", "dampak", "syarat", "dasar", "celah", "unit", "kl"):
            assert p[f], f"{pid}: kolom {f} kosong"
        for f, v in vocab.items():
            assert set(p[f].split(";")) <= v, f"{pid}: {f} di luar kosakata tema.json: {set(p[f].split(';')) - v}"
        assert p["keyakinan"] and set(p["keyakinan"].split(";")) <= LABEL, pid
        assert p["kekuatan"] in KEKUATAN and p["posisi"] in POSISI and p["jenis_eval"] in JENIS_EVAL, pid
        if p["kelompok"] == "Luar negeri":  # KERANGKA prinsip 12: tanpa status Indonesia, wajib padanan berstatus
            assert not p["status"] and p["padanan"] and (p["status_padanan"] in tema["status_usulan"] or p["status_padanan"] in STATUS_PADANAN_LAIN), \
                f"{pid}: program luar negeri wajib tanpa status Indonesia, dengan padanan dan status padanan"
        else:
            assert p["status"] in tema["status_usulan"] and not p["padanan"], f"{pid}: program dalam negeri wajib status usulan dan tanpa padanan"
        cek_peran(p, tema, rn_aksi)
        assert p["kekuatan"] in KEKUATAN_BOLEH[p["jenis_eval"]], f"{pid}: jenis evaluasi {p['jenis_eval']} hanya membolehkan kekuatan {sorted(KEKUATAN_BOLEH[p['jenis_eval']])}, bukan {p['kekuatan']}"
        assert p["kekuatan"] in POSISI_BOLEH[p["posisi"]], f"{pid}: posisi {p['posisi']!r} tidak boleh untuk kekuatan {p['kekuatan']}"
        assert not (p["kelompok"] == "Dalam negeri" and p["status"] == "baru"), f"{pid}: program dalam negeri tidak boleh berstatus Usulan baru (KERANGKA prinsip 8)"
        assert set(p["unit"].split(";")) <= unit_berlaku, f"{pid}: unit bukan unit OTK berlaku: {set(p['unit'].split(';')) - unit_berlaku}"
        for lama in NAMA_KL_LAMA:
            for f in ("kl", "lembaga"):
                assert not re.search(rf"(^|[;,(] ?){re.escape(lama)}\b", p[f]), f"{pid}: kolom {f} memakai nomenklatur lama {lama!r} (kini {NAMA_KL_LAMA[lama]['pengganti']})"
        assert all(c in kode_renas for c in p["renas"].split(";") if c), pid
        assert set(p["ripb_strategi"].split(";")) <= ripb, pid
        bp = per[pid]
        assert bp, f"{pid}: tanpa baris bukti"
        nilai = {b["nilai"] for b in bp if b["nilai"] and b["label"] != LABEL_BELUM}
        hilang = [x for x in angka_naratif(p["dampak"]) if x not in nilai]
        assert not hilang, f"{pid}: angka di teks dampak tanpa baris bukti terbaca (bukan {LABEL_BELUM}): {hilang}"
        for f in ("apa", "syarat", "dasar", "celah", "catatan", "kekuatan_catatan"):
            hilang = [x for x in angka_naratif(p[f]) if x not in nilai]
            assert not hilang, f"{pid}: angka di kolom {f} tanpa baris bukti: {hilang}"
        dibuka = [b for b in bp if b["verifikasi"] in ("korpus-lokal", "dibuka-langsung") and b["nilai"]]
        if p["kekuatan"] == "kuat":
            assert len(dibuka) >= 2, f"{pid}: 'kuat' bertumpu pada < 2 angka yang dibuka langsung"
        if p["jenis_eval"] == "data-resmi-pra-pasca":
            assert {"sebelum", "sesudah"} <= {b["peran"] for b in dibuka}, f"{pid}: data pra-pasca wajib punya angka sebelum DAN sesudah yang dibuka"
        if p["jenis_eval"] == "model":
            assert any(b["label"] == "estimasi-model" for b in bp), f"{pid}: evaluasi model tanpa angka estimasi-model"
        if p["jenis_eval"] == "evaluasi-independen":
            assert any(re.search(r"(?i)independent|evaluat|value for money", b["sumber"]) and b["verifikasi"] == "dibuka-langsung" for b in bp), \
                f"{pid}: evaluasi independen tidak ada di antara sumber yang dibuka"
        # dasar hukum BNPB yang disebut: wajib ada di KORPUS (judulnya dicek), atau ditandai teks tidak dibuka/tidak di korpus
        for m in re.finditer(r"\b(Perban|Perka|Juklak)(?: BNPB)? (\d+)/(\d{4})", p["dasar"]):
            slug = f"{m.group(1).lower()}-nomor-{m.group(2)}-tahun-{m.group(3)}"
            assert slug in KORPUS or "(teks tidak" in p["dasar"][m.end():m.end() + 80], f"{pid}: {m.group(0)} di kolom dasar tidak ada di KORPUS dan tidak ditandai teks tidak dibuka"
    # dasar hukum dalam negeri yang disebut kolom `dasar` dan ada di korpus: judul/isi wajib ketemu
    for slug, judul in JUDUL_DASAR.items():
        assert hlm(slug, judul) <= 2, f"{slug}: judul tidak di halaman judul"
    for slug, kut in [("perban-nomor-7-tahun-2025", "Pedoman Umum Desa/Kelurahan Tangguh Bencana sudah tidak sesuai dengan perkembangan kebutuhan hukum, sehingga perlu diganti"),
                      (O6, "Ditetapkan di Jakarta pada tanggal 6 Oktober 2025"), (O11, "Ditetapkan di Jakarta pada tanggal 30 Desember 2025"),
                      (RN, "belum semua menerapkan satuan pendidikan aman bencana")]:
        hlm(slug, kut)
    # perlindungan jebakan: bila kelak instrumen Dana Bersama memuat syarat manfaat-biaya, status "baru" P24 harus ditinjau
    for slug in DANA_BERSAMA:
        teks = " ".join(t for _, t, _ in dok(slug))
        m = RE_MANFAAT_BIAYA.search(teks)
        assert not m, f"{slug} kini memuat {m.group(0)!r}: tinjau status P24"


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
    w("| ID | Program | Lokasi | Kekuatan bukti | Posisi | Status di Indonesia | Pemimpin |")
    w("| --- | --- | --- | --- | --- | --- | --- |")
    for p in kp:
        st = p["status_label"] or f"Padanan: {p['padanan']} ({p['status_padanan_label']})"
        w(f"| {p['id']} | {p['nama']} | {p['lokasi']} | {p['kekuatan']} | {p['posisi']} | {st} | {p['pemimpin']} |")
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
        w(f"- **Kekuatan bukti:** {p['kekuatan']} ({KEKUATAN[p['kekuatan']]}); jenis evaluasi: {p['jenis_eval']}; label angka: {p['keyakinan'] or '-'}."
          + (f" {p['kekuatan_catatan']}" if p["kekuatan_catatan"] else ""))
        w(f"- **Syarat keberhasilan:** {p['syarat']}")
        if p["status_label"]:
            w(f"- **Status di Indonesia:** {p['status_label']}. {p['dasar']}.")
        else:
            w(f"- **Padanan di Indonesia:** {p['padanan']} ({p['status_padanan_label']}). {p['dasar']}.")
        w(f"- **Pemimpin:** {p['pemimpin']} ({p['asal_pemimpin']}). **Peran BNPB:** {tema['peran_bnpb'][p['peran_bnpb']]}, kode {p['kode_peran_bnpb']}"
          + (f"; {p['catatan_peran']}" if p["catatan_peran"] else "") + ".")
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
      "; ".join(f"{o['unit']}" for o in org if o["status"] != "berlaku") + ". Tidak ada pasal peralihan; dugaan padanannya di unit baru ada di "
      "`renstra_bnpb_2025_2029.csv` kolom `pemetaan_penyusun` (penilaian penyusun, bukan dasar pasal).")
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
    nb_belum = sum(b["label"] == LABEL_BELUM for b in bk)
    w(f"- Semua sumber web dibuka pada {TGL} (sebagian lewat salinan web.archive.org; lihat kolom `akses`); baris `belum-dibaca`: {nb_belum}. "
      "Angka yang tidak ditemukan di sumbernya dibuang dan dicatat di `program-terbukti.json` → `meta.dibuang`.")
    w("- Program dalam negeri hampir semuanya tanpa evaluasi dampak berpembanding; kekuatan bukti mencerminkan ketiadaan itu, bukan penilaian manfaat.")
    w("- Nomenklatur K/L: BRGM (berakhir 31 Des 2024) dan Kementerian BUMN (kini BP BUMN) sudah diganti di kolom K/L dan diberi catatan di baris Renas "
      "yang disalin verbatim; nama K/L lain mengikuti Renas PB 2025-2029 dan belum dicek satu per satu ke susunan kabinet Oktober 2026.")
    open(os.path.join(OUT, "kompendium.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")


def uji_tolak():
    """Gerbang peran menolak yang salah (TEST.md): unit BNPB tanpa catatan, peran di luar kosakata, PJ Renas yang tidak cocok."""
    tema = json.load(open(TEMA, encoding="utf-8"))["kosakata"]
    rn_aksi = {r["kode"]: r for r in csv.DictReader(open(os.path.join(OUT, "renas_aksi_terkait.csv"), encoding="utf-8"))}
    baik = next(r for r in csv.DictReader(open(os.path.join(OUT, "kompendium_program.csv"), encoding="utf-8")) if r["id"] == "P05")
    cek_peran(baik, tema, rn_aksi)
    for ubah in ({"catatan_peran": ""}, {"kode_peran_bnpb": "K"}, {"peran_bnpb": "pendanaan"}, {"kode_pemimpin": "BNPB"},
                 {"asal_pemimpin": "renas:9.9.9.z"}, {"asal_pemimpin": "tebakan"}):
        try:
            cek_peran({**baik, **ubah}, tema, rn_aksi)
        except AssertionError:
            continue
        raise SystemExit(f"gerbang peran meloloskan baris salah: {ubah}")


if __name__ == "__main__":
    t = bangun()
    uji_tolak()
    print(" ".join(f"{k}={len(v['baris'])}" for k, v in t.items()))
    print("self-check hijau")
