"""Logbook harian Pusdalops BNPB (.docx) -> dataset terstruktur.

Sumber: folder "LOGBOOK 2026" (satu .docx per hari, periode 07.00-07.00 WIB), tiap berkas
satu tabel 6 kolom: No | Waktu & Jenis | Lokasi | Dampak | Keterangan | Sumber.

Keluaran (default data/raw/logbook/, ikut .gitignore karena isi logbook internal dan repo publik):
  baris.jsonl / baris.csv       satu baris = satu entri logbook pada satu hari (kejadian baru ATAU update)
  kejadian.jsonl / kejadian.csv satu baris = satu kejadian, digabung dari semua entrinya; medan dampak
                                diambil dari entri TERAKHIR
  logbook.jsonl                 satu baris = satu berkas harian (jumlah entri, petugas piket)
  ringkasan.json                hitungan per bulan/jenis/provinsi + catatan mutu penguraian

Privasi (berlaku ke SEMUA medan teks): nomor telepon, email, nama korban ("a.n. ...",
"Nama (45 th)"), dan nama orang bersapaan (Bpk./Ibu/Sdr. ...) diganti penanda. Kolom Sumber hanya
disimpan sebagai daftar instansi. Yang DIPERTAHANKAN: nama penginput & petugas piket (staf Pusdalops),
jadi jangan terbitkan keluaran ini apa adanya.

Angka dampak (md, hilang, luka, mengungsi, kk, jiwa, rumah, ha) dibaca dari teks bebas dan bersifat
taksiran: bila ada angka berlabel total/jumlah dipakai itu, selain itu dijumlah. Teks aslinya
tetap ada di medan `dampak_teks`.

Pakai:
  python scripts/data/logbook_pusdalops.py --sumber "D:/.../LOGBOOK 2026" [--keluaran data/raw/logbook]
Python 3.11+ stdlib.
"""
from __future__ import annotations

import argparse
import collections
import csv
import glob
import json
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BULAN = {b: i + 1 for i, b in enumerate(
    "januari februari maret april mei juni juli agustus september oktober november desember".split())}
BULAN.update({"jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "agu": 8, "agt": 8, "ags": 8,
              "sep": 9, "sept": 9, "okt": 10, "nov": 11, "des": 12, "pebruari": 2, "nopember": 11})
RE_TGL = re.compile(r"(\d{1,2})\s*[-,]?\s*(" + "|".join(sorted(BULAN, key=len, reverse=True)) + r")\b\.?\s*(\d{4})?", re.I)
RE_JAM = re.compile(r"(?<![\d/])(\d{1,2})[.:](\d{2})(?![\d/])\s*(WIB|WITA|WIT)?", re.I)

# Kode DIBI dan nama resmi dibaca dari scripts/wa/panduan_resmi.json (ringkasan Draft Panduan Pusdalops 2025; satu sumber
# dengan pengurai laporan WA, jangan disalin). Kunci internal `jenis` dipertahankan supaya layar lama tetap terbaca;
# panduan memisahkan 103 gelombang pasang/abrasi dan 108 tsunami, jadi kunci internalnya kini terpisah juga
# (gelombang_pasang, tsunami; dulu masuk cuaca dan gempabumi) dan 201 wabah punya kunci `wabah` (dulu lainnya).
PANDUAN = json.load(open(os.path.join(AKAR, "scripts/wa/panduan_resmi.json"), encoding="utf-8"))
KODE_JENIS = {"banjir": "101", "longsor": "102", "gelombang_pasang": "103", "cuaca": "104", "kekeringan": "105", "karhutla": "106",
              "gempabumi": "107", "tsunami": "108", "gunungapi": "109", "wabah": "201", "kebakaran_permukiman": "202",
              "kegagalan_teknologi": "203", "konflik_sosial": "301"}
KODE_KUNCI = {v: k for k, v in KODE_JENIS.items()}
NAMA_RESMI = {j["kode"]: j["nama"] for j in PANDUAN["jenis"]}
assert set(KODE_KUNCI) == set(NAMA_RESMI), "kode DIBI di panduan_resmi.json berubah: sesuaikan KODE_JENIS"

# Cadangan bila nama kejadian resmi tak cocok. Urutan penting: lahar/awan panas SEBELUM banjir (banjir lahar = 109),
# tsunami SEBELUM gempa, gelombang/abrasi SEBELUM cuaca, kegagalan industri SEBELUM kecelakaan.
POLA_JENIS = [
    (r"modifikasi cuaca|\bOMC\b", "omc"),
    (r"\bTPA\b|\bTPS|tempat pembuangan", "lainnya"),
    (r"kebakaran (permukiman|pemukiman|rumah|gedung)", "kebakaran_permukiman"),
    (r"karhutla|karlahut|hutan dan lahan|hutan\s*/\s*lahan|kebakaran hutan|kebakaran lahan", "karhutla"),
    (r"kekeringan", "kekeringan"),
    (r"tsunami", "tsunami"),
    (r"gempa|runtuhan", "gempabumi"),
    (r"lahar|awan panas|erupsi|hujan abu|gas vulkanik", "gunungapi"),
    (r"banjir|tanggul jebol", "banjir"),
    (r"longsor|gerakan tanah|pergerakan tanah|pergeseran tanah|tanah bergerak|tanah (amblas|ambles|retak)|retakan tanah", "longsor"),
    (r"gunung ?api|vulkan|\bG\.\s", "gunungapi"),
    (r"gelombang pasang|gelombang tinggi|abrasi", "gelombang_pasang"),
    (r"cuaca ekstr|angin|put+ing beliung|gelombang|hujan es|siklon|suhu (udara )?ekstr|gelombang panas|pohon tumbang", "cuaca"),
    (r"wabah|epidemi|pandemi|kejadian luar biasa", "wabah"),
    (r"konflik", "konflik_sosial"),
    (r"kegagalan (teknologi|industri)|kecelakaan industri", "kegagalan_teknologi"),
    # kosakata arsip 2011-2020: "Kebakaran" polos = rumah/bangunan (karhutla sudah tertangkap di atas)
    (r"^\s*kebakaran\b", "kebakaran_permukiman"),
    (r"kecelakaan|\blaka\b|tenggelam|hanyut", "kecelakaan"),
]
POLA_JENIS = [(re.compile(p, re.I), k) for p, k in POLA_JENIS]
# nama kejadian resmi (panduan) sebagai cadangan terakhir; "banjir lahar" (109) ditangani pola lahar sebelum banjir
POLA_RESMI = sorted(((re.compile(r"(?<![a-z])" + r"\s+".join(map(re.escape, n.split())) + r"(?![a-z])", re.I), KODE_KUNCI[j["kode"]])
                     for j in PANDUAN["jenis"] for n in j.get("nama_kejadian", [])),
                    key=lambda x: -len(x[0].pattern))


def jenis_dari(teks: str) -> str:
    for re_, k in POLA_JENIS[:3]:          # omc, TPA, kebakaran permukiman: sebelum nama resmi
        if re_.search(teks):
            return k
    for re_, k in POLA_JENIS[3:]:
        if re_.search(teks):
            return k
    for re_, k in POLA_RESMI:              # nama resmi hanya cadangan: "Banjir, angin kencang" tetap banjir seperti aturan lama
        if re_.search(teks):
            return k
    return "lainnya"


def jenis_resmi(jenis: str):
    """-> (kode_dibi, nama resmi) menurut panduan; None bila jenis internal tak punya kode (omc, kecelakaan, lainnya)."""
    k = KODE_JENIS.get(jenis)
    return (k, NAMA_RESMI[k]) if k else (None, None)


# ---------------------------------------------------------------- privasi
# Telepon: pemisah spasi/strip saja (titik = desimal/koordinat/rupiah), dan tidak menempel ke angka,
# titik, koma, minus, atau "Rp" di depan maupun desimal di belakang.
RE_TELP = re.compile(r"(?<![\d.,\-])(?<!Rp)(?<!Rp )(?:\+\s?62|\b0)[\s-]?\(?\d{2,4}\)?(?:[\s-]?\d{2,5}){2,4}\b(?![.,]\d)")
RE_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
# nama orang: kata pertama kapital, kata lanjutan boleh huruf kecil ("Ginasa lintang sari"), maks 4 kata, satu baris
NAMA_BEBAS = r"[A-Z][A-Za-z'`]+(?:[ \t]+[A-Za-z'`][a-z'`]*){0,3}"
UMUR = r"\d{1,3}\s*(?i:th|thn|tahun|thun|tn)\b\.?"
KELAMIN = r"(?i:L|P|Lk|Pr|Laki[- ]?laki|Perempuan|Wanita|Pria)"
# Kata yang bentuknya mirip nama tetapi bukan: jangan pernah disamarkan.
BUKAN = (r"(?!(?i:nihil|tidak|belum|masih|dalam|pendataan|sedang|aman|kondusif|data|total|jumlah|ket|keterangan|selesai|"
         r"manggala|agni|tni|polri|polsek|polres|koramil|kodim|bpbd|bnpb|bpk|tagana|damkar|satpol|relawan|masyarakat|warga|"
         r"kategori|baik|sangat|berbahaya|personil|personel|unsur|sebagian|para|semua|seluruh|korban|laki|perempuan|"
         r"anak|balita|lansia|dewasa|bayi|siswa|pelajar|karyawan|pekerja|petani|nelayan|pengungsi|penduduk|jiwa|orang|"
         r"kab|kota|kec|desa|dusun|kel|prov|provinsi|kecamatan|kabupaten|kelurahan|tn|sm|gn|g|taman|suaka|hutan|kawasan|"
         r"stasiun|pos|pengamatan|tim|trc|regu|satgas|posko|rt|rw)\b)")
RE_AN = re.compile(r"\b(a\s?\.\s?n\s?\.?|a/n|an\.|atas nama)\s*[:.]?\s*[A-Za-z][^\n,;()|]*", re.I)
TEMPAT_DEPAN = (r"(?<!Kec\. )(?<!Kab\. )(?<!Kota )(?<!Ds\. )(?<!Desa )(?<!Kel\. )(?<!Dusun )(?<!Dsn\. )(?<!Kp\. )(?<!Prov\. )"
                r"(?<!TN\. )(?<!SM\. )(?<!Gn\. )(?<!G\. )(?<!Stasiun )")
# "Nurhayati (Perempuan, 30 Tahun)", "Hera Cipta Diara (L/38)", "Jajang (Laki-laki)", "Ai Sumarni (P) 36 Tahun",
# "Ginasa lintang sari (18th)", "Hamim (68)" -- angka polos hanya bila ada konteks korban di dekatnya
RE_UMUR = re.compile(r"\b" + TEMPAT_DEPAN + BUKAN + NAMA_BEBAS
                     + r"\s*\(\s*((?:" + KELAMIN + r")(?:\s*[,/][^)\n]{0,60})?|(?:" + UMUR + r")[^)\n]{0,40}|\d{1,3})\s*\)")
KONTEKS_KORBAN = re.compile(r"MD|meninggal|korban|luka|hilang|tewas|wafat|tenggelam|tertimbun|terseret|usia|umur|tahun|\bth\b", re.I)
# "Dafi Arahman/21 th", "Agusra/59th/L"
RE_GARIS = re.compile(r"\b" + BUKAN + NAMA_BEBAS + r"[ \t]*/[ \t]*(" + UMUR + r"(?:[ \t]*/[ \t]*" + KELAMIN + r")?)")
# arsip lama: "Ratna Wati/P/13 thn", "Suryati 60 th/P/MD"
RE_GARIS_KELAMIN = re.compile(r"\b" + BUKAN + NAMA_BEBAS + r"[ \t]*/[ \t]*(" + KELAMIN + r"[ \t]*/[ \t]*" + UMUR + r")")
RE_UMUR_GARIS = re.compile(r"\b" + BUKAN + NAMA_BEBAS + r"[ \t]+(" + UMUR + r"[ \t]*/[ \t]*" + KELAMIN + r"\b)")
# "Suryana usia 43 Tahun", "Eva umur 18 tahun", "Zubaidah, 60 tahun"
RE_USIA = re.compile(r"\b(?!" + KELAMIN + r"\b)" + BUKAN + NAMA_BEBAS + r"(\s*,\s*(?:usia\s+|umur\s+)?" + UMUR + r"|\s+(?i:usia|umur|u-mur)\s+\d{1,3})")
# "bin Marwi", "binti Siti"
RE_BIN = re.compile(r"\b(bin|binti)[ \t]+[A-Z][A-Za-z'`]+(?:[ \t]+[A-Z][A-Za-z'`]*){0,2}")
# "dilaporkan oleh Febri Yolanda" (tapi "dilaporkan oleh BPBD ..." tetap)
RE_OLEH = re.compile(r"\b((?i:dilaporkan oleh|dilaporkan|pelapor|informan|saksi))\s*:?[ \t]+" + BUKAN
                     + r"(?!(?i:Nias|Pusdalops|Petugas|Kepala|Camat|Kades|Lurah|pihak|aparat|Kapolsek|Babinsa|Bhabinkamtibmas)\b)"
                     + r"[A-Z][a-z'`]+(?:[ \t]+[A-Z][a-z'`]+){0,3}")
# "Nama : Irfan", "1). Nama : Irfan", "Nama Sopir : Pasaribu"
RE_NAMA_LABEL = re.compile(r"\b((?i:nama)(?:[ \t]+[A-Za-z]+){0,2})\s*:\s*[^\n|;,]+")
RE_BERNAMA = re.compile(r"\b((?i:bernama|nama korban))[ \t]*:?[ \t]*(?:(?i:bapak|pak|ibu|bu|sdr|sdri|saudara|saudari)\.?[ \t]+)?"
                        + BUKAN + r"[A-Za-z'`]+(?:[ \t]+[A-Z][A-Za-z'`]*){0,3}")
# Sapaan + nama. Peka huruf besar: "BPK." = Barisan Pemadam Kebakaran, "TN." = Taman Nasional, "Mas." = nama tempat.
SAPA = r"(?:(?:Bpk|bpk|Sdr|sdr|Sdri|sdri|Ny|ny)\.?|Bapak|bapak|Pak|pak|Ibu|ibu|Bu|bu|Saudara|saudara|Saudari|saudari)"
BUKAN_NAMA = (r"(?!(?i:hamil|menyusui|kota|rumah|camat|bupati|walikota|wali|gubernur|lurah|kades|kepala|kapolsek|kapolres|"
              r"danramil|dandim|babinsa|bhabinkamtibmas|rt|rw|dusun|desa|kadus|ketua|sekda|kalak|kalaksa|kabid|kasi|presiden|"
              r"menteri|wakil|dan|yang|ibu|bapak|balita|lansia|warga|sebagian|para|semua|untuk|dari|di|ke|pejabat|plt|"
              r"danrem|kapolda|pangdam|direktur|deputi|kepada|selaku|sebagai|beserta|bersama)\b)")
GELAR = r"(?:(?:H|Hj|Drs|Dra|Ir|Dr|dr|Prof|KH|Ust|Ustadz)\.?[ \t]+)*"
RE_SAPA = re.compile(r"(?<!G\. )(?<!Gn\. )(?<!Gunung )\b(" + SAPA + r")[ \t]+" + GELAR + BUKAN_NAMA + r"[A-Za-z'`]+(?:[ \t]+[A-Z][A-Za-z'`]*){0,3}")
RE_SISA_DEPAN = re.compile(r"\b" + BUKAN + r"(?!(?:Bapak|Ibu|Pak|Bu|Saudara|Saudari|Saksi|Kepada|Milik|Oleh|Dan|Atas|Nama|Bin|Binti|Korban)\b)"
                           r"[A-Z][a-z'`]+(?:[ \t]+[A-Z][a-z'`]+){0,3}[ \t]+(?=\[nama\][ \t]*\()")
RE_LABEL_PRIBADI = re.compile(r"\b(TTL|NIK|No\.?\s*KTP|Tempat[,/ ]+Tgl\.?\s*Lahir|Alamat)\s*:?[ \t]*[^\n|;]*", re.I)

RE_BARIS_NAMA = re.compile(r"^\s*(?:\d+[.)]+\s*)?" + BUKAN + NAMA_BEBAS + r"\s*(?:\([^)\n]{0,60}\))?\s*[,;.]?\s*$")
# Pemicu daftar nama: HANYA "atas nama"/"a.n."/"korban MD:" dsb. "Korban Jiwa:" (kepala kolom) bukan pemicu.
RE_PEMICU_DAFTAR = re.compile(r"(a\s?\.\s?n\s?\.?|a/n|atas nama|korban\s*(?:MD|meninggal(?:\s+dunia)?|hilang|luka[- a-z]*|tewas)[^\n]{0,20}:|"
                              r"nama[- ]nama(?: korban)?[^\n]{0,20}:?)\s*[^\n]*$", re.I)


def daftar_nama(t: str) -> str:
    """Baris-baris nama di bawah 'atas nama'/'korban MD:' (tanpa umur) ikut disamarkan sampai baris bukan nama."""
    out, aktif = [], False
    for l in t.split("\n"):
        if aktif and RE_BARIS_NAMA.match(l) and not re.search(r"\b(Kec|Kab|Kota|Desa|Ds|Dusun|BPBD|Prov|Upaya|Status|Kondisi|Kerugian|Korban|Jiwa|KK|Unit|Rumah)\b", l, re.I):
            out.append("[nama]" + (re.search(r"\s*\([^)]*\)", l).group(0) if "(" in l else ""))
            continue
        aktif = bool(RE_PEMICU_DAFTAR.search(l))
        out.append(l)
    return "\n".join(out)


def _umur(m):
    isi = m.group(1)
    if re.fullmatch(r"\d{1,3}", isi.strip()):
        awal = m.string[max(0, m.start() - 120): m.start()]
        if not KONTEKS_KORBAN.search(awal):
            return m.group(0)  # "Stasiun X (71)" (indeks kualitas udara), bukan umur
    return "[nama] (" + isi + ")"


def bersih(t: str) -> str:
    if not t:
        return ""
    t = t.replace(" ", " ").replace("�", "±").replace("​", "").replace("‎", "").replace("‏", "")
    t = RE_EMAIL.sub("[email]", t)
    t = RE_TELP.sub("[telp]", t)
    t = RE_LABEL_PRIBADI.sub(lambda m: m.group(1) + ": [disamarkan]", t)
    t = RE_NAMA_LABEL.sub(lambda m: m.group(1) + ": [nama]", t)
    t = RE_AN.sub(lambda m: m.group(1) + " [nama]", t)
    t = daftar_nama(t)
    t = RE_UMUR.sub(_umur, t)
    t = RE_GARIS.sub(lambda m: "[nama]/" + m.group(1), t)
    t = RE_GARIS_KELAMIN.sub(lambda m: "[nama]/" + m.group(1), t)
    t = RE_UMUR_GARIS.sub(lambda m: "[nama] " + m.group(1), t)
    t = RE_USIA.sub(lambda m: "[nama]" + m.group(1), t)
    t = RE_BIN.sub(lambda m: m.group(1) + " [nama]", t)
    t = RE_OLEH.sub(lambda m: m.group(1) + " [nama]", t)
    t = RE_BERNAMA.sub(lambda m: m.group(1) + " [nama]", t)
    t = RE_SAPA.sub(lambda m: m.group(1) + " [nama]", t)
    t = RE_SISA_DEPAN.sub("", t)
    t = re.sub(r"[ \t]+", " ", t)
    t = "\n".join(l.strip() for l in t.split("\n") if l.strip())
    return t


# ---------------------------------------------------------------- docx
def teks_sel(tc) -> str:
    ps = []
    for p in tc.iter(W + "p"):
        s = "".join(x.text or "" for x in p.iter(W + "t"))
        if s.strip():
            ps.append(s)
    return "\n".join(ps)


def baca_docx(path):
    """-> (paragraf kepala, [baris sel], [petugas piket])"""
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    kepala = []
    for el in body:
        if el.tag == W + "p":
            s = "".join(x.text or "" for x in el.iter(W + "t")).strip()
            if s:
                kepala.append(s)
        if el.tag == W + "tbl" or len(kepala) >= 8:
            break
    baris, piket = [], []
    for ti, tbl in enumerate(body.iter(W + "tbl")):
        trs = tbl.findall(W + "tr")
        rows = [[teks_sel(tc) for tc in tr.findall(W + "tc")] for tr in trs]
        if rows and any("PETUGAS PIKET" in c.upper() for c in rows[0]):
            for r in rows[1:]:
                piket += [c.strip() for c in r[1:] if c.strip() and not re.fullmatch(r"\d+\.?", c.strip())]
            continue
        for tr, cells in zip(trs, rows):
            # kolom No berupa angka, atau penomoran otomatis Word (teks kosong, ada w:numPr; sebagian 2024)
            no_otomatis = not cells[0].strip() and tr.find("./" + W + "tc").find(".//" + W + "numPr") is not None \
                if cells else False
            if len(cells) >= 6 and (re.fullmatch(r"\d+\.?", cells[0].strip()) or no_otomatis):
                baris.append([ti] + cells)
    return kepala, baris, piket


# ---------------------------------------------------------------- tanggal
def iso(d, m, y):
    try:
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}" if 1 <= int(d) <= 31 else None
    except (TypeError, ValueError):
        return None


# arsip 2011-2013 menulis tanggal kejadian sebagai angka: "Kamis, 19/03/11", "27/12/11"
RE_TGL_GARIS = re.compile(r"(?<![\d/])(\d{1,2})/(\d{1,2})/(\d{4}|\d{2})(?![\d/])")


def semua_tgl(t: str, tahun_default=None):
    out = []
    for m in RE_TGL.finditer(t):
        y = m.group(3) or tahun_default
        if y:
            v = iso(m.group(1), BULAN[m.group(2).lower()], y)
            if v:
                out.append((m.start(), v))
    for m in RE_TGL_GARIS.finditer(t):
        y = m.group(3)
        if 1 <= int(m.group(2)) <= 12:
            v = iso(m.group(1), m.group(2), y if len(y) == 4 else "20" + y)
            if v:
                out.append((m.start(), v))
    return [v for _, v in sorted(out)]


RE_TGL_ANGKA = re.compile(r"(?<![\d.-])(\d{2})([.-]?)(\d{2})\2(\d{4}|\d{2})(?![\d])")


def tgl_berkas(nama: str):
    m = RE_TGL.search(nama)
    if m and m.group(3):
        return iso(m.group(1), BULAN[m.group(2).lower()], m.group(3))
    # arsip 2011-2020: "15012018 laporan LOG BOOK", "TRC BNPB 050411", "LOGBOOK PUSDALOPS 21052013"
    # salah ketik 2021: "140202021" = 14 02 2021 dengan 0 berlebih sebelum tahun
    m = re.search(r"(?<!\d)(\d{2})(\d{2})0(20\d{2})(?!\d)", nama)
    if m and 1 <= int(m.group(2)) <= 12:
        return iso(m.group(1), m.group(2), m.group(3))
    m = RE_TGL_ANGKA.search(nama)
    if m and 1 <= int(m.group(3)) <= 12:
        y = m.group(4)
        return iso(m.group(1), m.group(3), y if len(y) == 4 else "20" + y)
    return None


# ---------------------------------------------------------------- kolom 2: waktu & jenis
RE_REKAP = re.compile(r"\(?\s*Rekap\s+([A-Za-z]+)\s*(\d{4})?\s*No\.?\s*(\d+)\s*\)?", re.I)
RE_HARI = re.compile(r"^(senin|selasa|rabu|kamis|jum['’`´]?[aá]t|sabtu|minggu)\b,?", re.I)


def urai_waktu(t: str, tahun):
    t = t.replace("\u00a0", " ")
    m = re.search(r"\bupdate\b|\bpengkinian\b|\bperkembangan\b", t, re.I)
    awal, akhir = (t[: m.start()], t[m.end():]) if m else (t, "")
    rek = RE_REKAP.search(awal)
    awal_tanpa = RE_REKAP.sub("", awal)
    tgl = semua_tgl(awal_tanpa, tahun)
    # "Rabu, 15 Januari \n2026": tahun di baris berikutnya
    if not tgl:
        tgl = semua_tgl(re.sub(r"\s+", " ", awal_tanpa), tahun)
    jam = RE_JAM.search(awal_tanpa)
    jenis_baris = []
    for l in awal_tanpa.split("\n"):
        l = l.strip()
        l = RE_HARI.sub("", l).strip()
        l = RE_TGL_GARIS.sub("", RE_TGL.sub("", l))
        l = re.sub(r"^(" + "|".join(k for k in BULAN if len(k) > 3) + r")\b\.?\s*\d{0,4}$", "", l, flags=re.I)
        l = RE_JAM.sub("", l)
        l = re.sub(r"\b(pukul|pkl)\b\.?|\b(WIB|WITA|WIT)\b|^\d{4}$", "", l, flags=re.I).strip(" ,.:-–—()/")
        # jam/hari rentang 2013: "Pkl. 07.44 – 09.00 WIB", "13.18 s/d 13.30", "Sabtu – Minggu" -> sisa penghubung dibuang
        l = RE_HARI.sub("", re.sub(r"^(s\s*[./]?\s*d\.?|sampai)\s+", "", l, flags=re.I)).strip(" ,.:-–—()/")
        if l and not re.fullmatch(r"\d{1,4}|s\s*[./]?\s*d\.?|sd|[-–—/]", l, re.I):
            jenis_baris.append(l)
    upd_tgl = semua_tgl(akhir, tahun)
    upd_jam = RE_JAM.findall(akhir)
    return {
        "tgl_kejadian": tgl[0] if tgl else None,
        "jam_kejadian": f"{int(jam.group(1)):02d}:{jam.group(2)}" if jam else None,
        "zona": (jam.group(3) or "").upper() or None if jam else None,
        "jenis_teks": jenis_baris[0] if jenis_baris else "",
        "waktu_catatan": "; ".join(jenis_baris[1:]),
        "update": bool(m),
        "tgl_update": upd_tgl[-1] if upd_tgl else None,
        "jam_update": (lambda j: f"{int(j[0]):02d}:{j[1]}")(upd_jam[-1]) if upd_jam else None,
        "rekap": f"{rek.group(1).title()} {rek.group(2) or tahun} No. {rek.group(3)}" if rek else None,
    }


# ---------------------------------------------------------------- kolom 3: lokasi
ALIAS = {"ntt": "nusa tenggara timur", "ntb": "nusa tenggara barat", "diy": "daerah istimewa yogyakarta",
         "di yogyakarta": "daerah istimewa yogyakarta", "yogyakarta": "daerah istimewa yogyakarta",
         "d.i. yogyakarta": "daerah istimewa yogyakarta", "dki": "dki jakarta", "jakarta": "dki jakarta",
         "babel": "kepulauan bangka belitung", "bangka belitung": "kepulauan bangka belitung",
         "kepri": "kepulauan riau", "sulsel": "sulawesi selatan", "sulut": "sulawesi utara",
         "sulteng": "sulawesi tengah", "sultra": "sulawesi tenggara", "sulbar": "sulawesi barat",
         "kalteng": "kalimantan tengah", "kalsel": "kalimantan selatan", "kalbar": "kalimantan barat",
         "kaltim": "kalimantan timur", "kaltara": "kalimantan utara", "sumsel": "sumatera selatan",
         "sumut": "sumatera utara", "sumbar": "sumatera barat", "jabar": "jawa barat", "jateng": "jawa tengah",
         "jatim": "jawa timur", "nad": "aceh", "nanggroe aceh darussalam": "aceh"}


def muat_prov():
    p = os.path.join(AKAR, "public", "data", "laporan.json")
    try:
        d = json.load(open(p, encoding="utf8"))["prov"]
        return {k: v["nama"] for k, v in d.items()}
    except Exception:
        return {}


PROV = muat_prov()
PROV_BAKU = {}
for _k, _v in PROV.items():
    _n = _v.lower().replace("kep. ", "kepulauan ").replace("di ", "daerah istimewa ", 1) if _v.lower().startswith("di ") else _v.lower().replace("kep. ", "kepulauan ")
    PROV_BAKU[_n] = _k


def ringkas(n: str) -> str:
    """'Kep. Bangka  Belitung', 'D.I Yogyakarta', 'DK JAKARTA' -> bentuk huruf saja yang seragam."""
    n = re.sub(r"\s+", " ", n).strip(" .,;:()").lower()
    n = ALIAS.get(n, n)
    n = re.sub(r"^kep(?:\.\s*|\s+)", "kepulauan ", n)
    n = re.sub(r"^d\s*\.?\s*i\s*\.?\s+(?=yogya)", "daerah istimewa ", n)
    n = re.sub(r"^dk\s+", "dki ", n)
    return re.sub(r"[^a-z]", "", n)


PROV_RINGKAS = {ringkas(v): k for v, k in PROV_BAKU.items()}


def kode_prov(nama: str) -> str:
    n = ringkas(nama)
    if not n:
        return ""
    if n in PROV_RINGKAS:
        return PROV_RINGKAS[n]
    best, pj = "", 0
    for t, k in PROV_RINGKAS.items():
        if t in n and len(t) > pj:
            best, pj = k, len(t)
    return best


def prov_dalam_teks(t: str):
    """Cadangan bila tak ada 'Prov. X': cari nama provinsi baku di mana saja (OMC '... di wilayah Jawa Tengah')."""
    rk = re.sub(r"[^a-z]", "", t.lower())
    temu = []
    for v, k in sorted(PROV_RINGKAS.items(), key=lambda x: -len(x[0])):
        if len(v) > 4 and v in rk and not any(v in u for u, _ in temu):
            temu.append((v, k))
    return [k for _, k in temu]


RE_PROV = re.compile(r"\bProv(?:insi)?\.?[ \t]+([A-Za-z][A-Za-z. \t]*?)(?=[ \t]*(?:\bKab\b|\bKabupaten\b|\bKota\b|\(|$|\n|,))", re.I | re.M)
RE_KAB = re.compile(r"\b(Kab\.|Kabupaten|Kota(?!\s*Kec)|Kab)[ \t]+([A-Z][A-Za-z'-]*(?:[ \t]+(?!Kec\b|Kab\b|Kota\b|Ds\b|Desa\b|Prov\b|Provinsi\b|Kecamatan\b|Kondisi\b|Kel\b)[A-Z][A-Za-z'-]*){0,3})")
RE_REKAP_LOK = re.compile(r"\(\s*(\d+)\s*Kec[a-z]*\.?\s*/\s*([^)]*)\)", re.I)


def urai_lokasi(t: str):
    t = t.replace("\u00a0", " ")
    t = re.sub(r"\b(Prov|Kab|Kec|Kel|Ds|Dsn)\.(?=[A-Za-z])", r"\1. ", t)  # arsip lama: "Prov.NTB/Kab.Sumbawa"
    t = re.sub(r"\bKep\.\s*", "Kepulauan ", t)  # "Kab. Kep. Seribu", "Kab. Banggai Kep." (titik memutus nama)
    prov = []
    for m in RE_PROV.finditer(t):
        nm = m.group(1).strip(" .")
        if nm and nm not in prov:
            prov.append(nm)
    kab = []
    for m in RE_KAB.finditer(t):
        jenis = "Kota" if m.group(1).lower().startswith("kota") else "Kab."
        nm = f"{jenis} {m.group(2).strip(' .')}"
        if len(nm) > 5 and nm not in kab:
            kab.append(nm)
    kec = [re.sub(r"^Kec(?:amatan)?\.?\s*", "", l.strip(), flags=re.I).strip(" .:")
           for l in t.split("\n") if re.match(r"^\s*Kec(?:amatan)?\.?\s+\S", l, re.I)]
    desa = [re.sub(r"^(Ds|Desa|Kel|Kelurahan|Dsn|Dusun|Nagari|Gampong|Kp|Kampung)\.?\s*", "", l.strip(), flags=re.I).strip(" .:")
            for l in t.split("\n") if re.match(r"^\s*(Ds|Desa|Kel|Kelurahan|Nagari|Gampong)\.?\s+\S", l, re.I)]
    n_kec = n_desa = None
    m = RE_REKAP_LOK.search(t)
    if m:
        n_kec = int(m.group(1))
        n_desa = sum(int(x) for x in re.findall(r"(\d+)", m.group(2))) or None
    kode = []
    for p in prov:
        k = kode_prov(p)
        if k and k not in kode:
            kode.append(k)
    if not kode:
        kode = prov_dalam_teks(t)
    return {"prov": [PROV.get(k, "") for k in kode] or prov, "prov_kode": kode, "kabkota": kab,
            "kecamatan": kec, "desa": desa, "n_kec": n_kec, "n_desa": n_desa}


# ---------------------------------------------------------------- kolom 4: dampak
def angka(s: str):
    s = s.strip().lstrip("±").strip()
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", s):
        s = s.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"\d+,\d+", s):
        s = s.replace(",", ".")
    elif re.fullmatch(r"\d+\.\d{1,2}", s):
        pass
    else:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


N = r"(±\s*)?(\d[\d.,]*)"
TERBILANG = r"(?:\s*\([A-Za-z ]+\))?"
POLA_DAMPAK = {
    "md": r"(?:MD|meninggal(?:\s+dunia)?|tewas|wafat)",
    "hilang": r"(?:hilang|dalam pencarian|(?:masih\s+)?belum\s+di\s?temukan)",
    "luka": r"(?:luka(?:[- ]luka)?(?:\s+(?:berat|ringan))?|LL|LB|LR)",
    "mengungsi": r"(?:mengungsi|pengungsi)",
    "kk": r"KK",
    "jiwa": r"(?:jiwa|orang)\s+(?:terdampak|terpapar)",
    "rumah": r"(?:unit\s+)?rumah",
    "ha": r"(?:ha|hektar|hektare)\b",
}
KUAT = re.compile(r"total|jumlah|keseluruhan|seluas|sampai dengan|s\.?d", re.I)


def hitung(teks: str, kunci: str):
    kata = POLA_DAMPAK[kunci]
    temu = []  # (nilai, kuat)
    pola = [re.compile(N + TERBILANG + r"\s*(?:jiwa|orang|org|unit|buah)?\s*\(?" + kata + r"\b", re.I)]
    if kunci in ("md", "hilang", "luka", "mengungsi"):
        pola.append(re.compile(r"\b" + kata + r"\s*[:=]\s*" + N, re.I))
        # arsip lama: "meninggal dunia sebanyak 56 orang", "Pengungsi 1.285 jiwa"
        pola.append(re.compile(r"\b" + kata + r"\s+(?:sebanyak|sejumlah|berjumlah)\s+" + N, re.I))
        pola.append(re.compile(r"\b" + kata + r"\s+" + N + r"\s*(?:jiwa|orang|org)\b", re.I))
    pos = set()
    for p in pola:
        for m in p.finditer(teks):
            if m.start() in pos:
                continue
            pos.add(m.start())
            v = angka(m.group(2))
            if re.match(r"[^\n]{0,25}?\b(terancam|berpotensi|potensi|rawan)\b", teks[m.end():], re.I):
                continue
            if v is None or v > 5e7:
                continue
            awal_baris = teks.rfind("\n", 0, m.start()) + 1
            temu.append((v, bool(KUAT.search(teks[max(awal_baris, m.start() - 60): m.start()]))))
    if kunci == "jiwa":
        # "4 jiwa mengungsi" bukan "jiwa terdampak"; hanya pola eksplisit
        pass
    if not temu:
        return None
    kuat = [v for v, k in temu if k]
    v = max(kuat) if kuat else (max(v for v, _ in temu) if kunci == "ha" else sum(v for v, _ in temu))
    return round(v, 2) if kunci == "ha" else int(v)


def urai_dampak(t: str):
    t = t.replace("\ufffd", "±").replace("\u00a0", " ")
    out = {k: hitung(t, k) for k in POLA_DAMPAK}
    # rumah per tingkat kerusakan
    for k, kata in (("rumah_rb", r"(?:RB|rusak berat)"), ("rumah_rs", r"(?:RS|rusak sedang)"), ("rumah_rr", r"(?:RR|rusak ringan)"),
                    ("rumah_terendam", r"(?:terendam|tergenang)")):
        tot = 0
        ada = False
        for m in re.finditer(N + r"[ \t]*(?:unit[ \t]+)?(?:rumah[ \t]+)?(?:[A-Za-z]+[ \t]+){0,2}\(?" + kata + r"\b", t, re.I):
            v = angka(m.group(2))
            if v is not None:
                tot += v
                ada = True
        if not ada:
            for m in re.finditer(r"\b" + kata + r"[ \t]*:[ \t]*" + N + r"\s*(?:unit|rumah|buah)?", t, re.I):
                v = angka(m.group(2))
                if v is not None:
                    tot += v
                    ada = True
        out[k] = int(tot) if ada else None
    return out


# ---------------------------------------------------------------- medan tambahan menurut panduan resmi (2025)
RE_RINCIAN = re.compile(r"^[ \t]*(?:dengan[ \t]+)?rincian\b|^[ \t]*(?:Kec(?:amatan)?|Kel(?:urahan)?|Ds|Desa|Dsn|Dusun)\.?[ \t]+\S", re.I | re.M)
RE_MATERIIL = re.compile(r"kerugian\s+mater", re.I)
_STATUS_KK = {"mengungsi": "mengungsi", "pengungsi": "mengungsi", "terdampak": "terdampak", "menderita": "terdampak", "terdampaknya": "terdampak"}
RE_KK = re.compile(r"(?:±\s*)?(\d[\d.,]*)[ \t]*KK\b(?:[ \t]*[/,]?[ \t]*(?:±\s*)?(\d[\d.,]*)[ \t]*(?:jiwa|orang|org)\b)?", re.I)
RE_STATUS_DEKAT = re.compile(r"(mengungsi|pengungsi|terdampak|menderita)", re.I)


def kepala(teks: str):
    """bagian sebelum rincian per kecamatan/desa: angka total ada di sini; rincian menjumlah ulang yang sama (double count)."""
    m = RE_RINCIAN.search(teks)
    return teks[: m.start()] if m else teks


def kk_pasangan(t: str):
    """'5 KK / 23 jiwa mengungsi' dan '65 KK / 257 jiwa terdampak' dipisah. -> dict kk_mengungsi, kk_terdampak, orang_mengungsi,
    orang_terdampak, dampak_dari_rincian (True bila kepala tak memuat pasangan dan angka dijumlah dari rincian)."""
    sek = RE_MATERIIL.split(t, 1)[0]
    def cari(teks):
        hasil = collections.defaultdict(lambda: [0, 0, False])
        for l in teks.split("\n"):
            for m in RE_KK.finditer(l):
                kk = angka(m.group(1))
                if kk is None or kk > 5e6:
                    continue
                belakang = RE_STATUS_DEKAT.match(l[m.end():].lstrip(" :,;-/()") ) or RE_STATUS_DEKAT.search(l[m.end(): m.end() + 40])
                depan = re.search(r"(mengungsi|pengungsi|terdampak|menderita)[ \t]*:?[ \t(]*$", l[: m.start()], re.I)
                st = (belakang or depan)
                if not st:
                    continue
                c = _STATUS_KK[st.group(1).lower()]
                jw = angka(m.group(2)) if m.group(2) else None
                hasil[c][0] += int(kk)
                hasil[c][1] += int(jw) if jw is not None else 0
                hasil[c][2] = True
        return hasil
    h = cari(kepala(sek))
    dari_rincian = False
    if not h:
        h, dari_rincian = cari(sek), True
    out = {"kk_mengungsi": None, "kk_terdampak": None, "orang_mengungsi": None, "orang_terdampak": None, "dampak_dari_rincian": dari_rincian and bool(h)}
    for c in ("mengungsi", "terdampak"):
        if c in h:
            out["kk_" + c] = h[c][0]
            out["orang_" + c] = h[c][1] or None
    return out


def rumah_terdampak(t: str, jenis: str):
    """rumah terdampak (kepala bagian Kerugian Materiil); banjir: terdampak + terendam (Logbook h3 G.3.d)."""
    parts = RE_MATERIIL.split(t, 1)
    mat = kepala(parts[1]) if len(parts) > 1 else kepala(t)
    def jumlah(kata):
        tot, ada = 0, False
        for m in re.finditer(N + r"[ \t]*(?:unit[ \t]+)?rumah[^\n\d]{0,25}?\b" + kata + r"\b", mat, re.I):
            v = angka(m.group(2))
            if v is not None:
                tot, ada = tot + v, True
        if not ada:
            for m in re.finditer(r"\brumah[^\n]{0,30}?\b" + kata + r"[ \t]*[:=][ \t]*" + N, mat, re.I):
                v = angka(m.group(2))
                if v is not None:
                    tot, ada = tot + v, True
        return int(tot) if ada else None
    td, rd = jumlah(r"(?:terdampak|TD)"), jumlah(r"(?:terendam|tergenang)")
    resmi = td if jenis != "banjir" or rd is None else (td or 0) + rd
    return {"rumah_terdampak": td, "rumah_terdampak_resmi": resmi}


def status_resmi(status_sk: str, catatan: str):
    """nilai resmi (panduan): Siaga Darurat | Tanggap Darurat | Transisi Darurat ke Pemulihan; + bendera perpanjangan."""
    st = f"{status_sk}\n{catatan}"
    nilai = PANDUAN["status_darurat"]["nilai"]
    ada = []
    for n, p in zip(("Siaga Darurat", "Tanggap Darurat", "Transisi Darurat ke Pemulihan"), (r"siaga darurat", r"tanggap darurat|keadaan darurat", r"transisi darurat")):
        assert n in nilai
        if re.search(p, st, re.I):
            ada.append(n)
    return {"status_resmi": ada, "status_perpanjangan": bool(ada) and bool(re.search(r"perpanjangan", st, re.I))}


def medan_tambahan(r: dict) -> dict:
    """medan baru dari panduan resmi, diturunkan hanya dari medan baris yang sudah ada (dipakai proses() dan turunkan_ulang())."""
    kode, nama = jenis_resmi(r["jenis"])
    t = (r.get("dampak_teks") or "").replace("\ufffd", "±").replace("\u00a0", " ")
    return {"jenis_lama": None, "kode_dibi": kode, "jenis_resmi": nama, **kk_pasangan(t), **rumah_terdampak(t, r["jenis"]),
            **status_resmi(r.get("status_sk") or "", r.get("catatan") or ""),
            "n_kec_total": max(r.get("n_kec") or 0, len(r.get("kecamatan") or [])) or None,
            "n_desa_total": max(r.get("n_desa") or 0, len(r.get("desa") or [])) or None}


# ---------------------------------------------------------------- kolom 5: keterangan
LABEL_KET = [
    (r"kronologis?|kronologi", "kronologi"),
    (r"upaya(?: penanganan)?|giat bnpb|penanganan", "upaya"),
    (r"status(?: penetapan)?(?: darurat)?", "status_sk"),
    (r"kondisi mutakhir|kondisi terkini|kondisi akhir", "kondisi"),
    (r"(?:unsur|pihak|personil|personel|instansi)\s+(?:yang|yg)\s+terlibat|unsur terlibat", "terlibat"),
    (r"kebutuhan(?: mendesak| darurat| peralatan)?", "kebutuhan"),
    (r"kendala|hambatan", "kendala"),
    (r"peralatan(?: yang (?:digunakan|dimiliki))?|kekuatan satgas darat", "peralatan"),
    (r"rekomendasi|saran|kesimpulan", "rekomendasi"),
    (r"dokumentasi(?: informasi)?|foto dokumentasi", "dokumentasi"),
]
RE_LABEL = re.compile(r"^\s*(" + "|".join(p for p, _ in LABEL_KET) + r")\s*:?\s*(.*)$", re.I)
KUNCI_KET = ["kronologi", "upaya", "status_sk", "kondisi", "terlibat", "kebutuhan", "kendala", "peralatan", "rekomendasi"]


def urai_ket(t: str):
    sek = collections.OrderedDict((k, []) for k in ["catatan"] + KUNCI_KET + ["dokumentasi"])
    cur = "catatan"
    for l in t.split("\n"):
        m = RE_LABEL.match(l)
        # label hanya dianggap label bila pendek di depan baris (bukan kalimat "upaya pemadaman ...")
        if m and (l.strip().endswith(":") or ":" in l[: len(m.group(1)) + 3] or len(l.strip()) <= len(m.group(1)) + 2):
            for p, k in LABEL_KET:
                if re.fullmatch(p, m.group(1).strip(), re.I):
                    cur = k
                    break
            if m.group(2).strip():
                sek[cur].append(m.group(2).strip())
            continue
        sek[cur].append(l)
    out = {k: "\n".join(v).strip() for k, v in sek.items() if k != "dokumentasi"}
    st = out.get("status_sk", "") + "\n" + out.get("catatan", "")
    macam = []
    for k, p in (("tanggap", r"tanggap darurat|keadaan darurat"), ("transisi", r"transisi darurat"), ("siaga", r"siaga darurat")):
        if re.search(p, st, re.I):
            macam.append(k)
    out["status"] = macam
    return out


# ---------------------------------------------------------------- kolom 6: sumber
RE_INSTANSI = re.compile(r"\b(BPBD|BNPB|Pusdalops|BMKG|PVMBG|Basarnas|SAR|TNI|Polri|Polres|Polda|Kodim|Korem|Manggala|KLHK|Kemen\w*|"
                         r"Dinas|Damkar|Tagana|Dinsos|PMI|Pemda|Pemkab|Pemkot|Pemprov|Pos Pengamatan|Satgas|Posko|Tim|Camat|Kecamatan|"
                         r"Kades|Desa|Kelurahan|Lurah|BWS|BBWS|PUPR|Media|Berita|magma)\b", re.I)


RE_JABATAN = re.compile(r"\b(Kalak|Kabid|Kasi|Kasie|Kasubag|Kasubbag|Kabag|Kepala|Kadis|Operator|Staf|Staff|Ketua|Sekretaris|Sekda|"
                        r"Koordinator|Korlap|Petugas|Plt|Danramil|Dandim|Kapolsek|Kapolres|Camat|Lurah|Kades|Relawan|Anggota)\b", re.I)


RE_WIL = re.compile(r"\b(Prov(?:insi)?\.?|Kab(?:upaten)?\.?|Kota)[ \t]+([A-Z][A-Za-z'-]*(?:[ \t]+[A-Z][A-Za-z'-]*){0,3})")


def instansi_ringkas(bag: str, lok: dict) -> str:
    """Satu potongan kolom Sumber -> 'INSTANSI WILAYAH' saja ('BPBD Kab. Klaten'). Nama orang tidak pernah
    lolos karena keluaran hanya disusun dari kata kunci instansi + wilayah yang dicek ke daftar provinsi
    atau ke kab/kota di kolom Lokasi baris yang sama."""
    kw = []
    for m in RE_INSTANSI.finditer(bag):
        k = m.group(0)
        k = k.upper() if k.upper() in ("BPBD", "BNPB", "BMKG", "PVMBG", "TNI", "PMI", "BWS", "BBWS", "PUPR", "KLHK", "SAR") else k.title()
        if k not in kw:
            kw.append(k)
    if not kw:
        return ""
    wil = ""
    kab_lok = {re.sub(r"^(Kab\.|Kota)\s*", "", x).lower(): x for x in lok.get("kabkota", [])}
    for m in RE_WIL.finditer(bag):
        jenis, nama = m.group(1), m.group(2)
        kata = nama.split()
        if jenis.lower().startswith("prov"):
            for n in range(len(kata), 0, -1):
                k = kode_prov(" ".join(kata[:n]))
                if k:
                    wil = "Prov. " + PROV.get(k, " ".join(kata[:n]))
                    break
        else:
            for n in range(len(kata), 0, -1):
                cand = " ".join(kata[:n]).lower()
                if cand in kab_lok:
                    wil = kab_lok[cand]
                    break
        if wil:
            break
    if not wil and "Prov" not in bag:
        pk = prov_dalam_teks(bag)
        if len(pk) == 1:
            wil = "Prov. " + PROV.get(pk[0], "")
    return " ".join(kw[:3]) + (" " + wil if wil else "")


def urai_sumber(t: str, lok: dict):
    t = t.replace("\u00a0", " ")
    dinput = ""
    m = re.search(r"Dinput oleh\s*:?(.*?)(?:Simampu|$)", t, re.I | re.S)
    if m:
        dinput = m.group(1)
    simampu = None
    m2 = re.search(r"Simampu\s*:?\s*(\S*)", t, re.I)
    if m2:
        simampu = m2.group(1).strip().lower() == "ok" or None
    head = re.split(r"Dokumentasi Informasi|Dinput oleh", t, flags=re.I)[0]
    inst = []
    for bag in re.split(r"\n\s*&\s*\n|\n&\n|\n", head):
        r_ = instansi_ringkas(RE_TELP.sub(" ", RE_EMAIL.sub(" ", bag)), lok)
        if r_ and r_ not in inst:
            inst.append(r_)
    penginput = []
    for n in re.split(r"[\n,]", dinput):
        n = n.strip(" .,")
        n = {"Iala Setiawan": "Yala Setiawan", "Iala": "Yala Setiawan"}.get(n, n)
        if n and n not in penginput and len(n) < 40:
            penginput.append(n)
    return {"sumber_instansi": inst, "penginput": penginput, "simampu_ok": simampu}


# ---------------------------------------------------------------- utama
def entri_kosong(c):
    """Baris templat yang tak pernah diisi: lokasi hanya label ('Prov.\\nKab.\\n( Kecamatan / Desa)')
    dan kolom waktu tanpa tanggal lengkap. Dampak tidak ikut ditimbang: templatnya sering berisi '±' / 'Nihil'."""
    if "OMC" in c[1] or "Modifikasi" in c[1]:
        return False
    lok = re.sub(r"\b(Prov(insi)?|Kab(upaten)?|Kota|Kec(amatan)?|Ds|Desa|Kel(urahan)?)\b|[^A-Za-z]", "", c[2])
    isi = re.sub(r"Korban Jiwa|Kerugian Mater\w+|Kronologis?|Upaya|Status|Kondisi Mutakhir|Dokumentasi|Nihil|Link|[^A-Za-z]", "",
                 c[3] + c[4], flags=re.I)
    return len(lok) < 3 and not semua_tgl(c[1]) and len(isi) < 40


BARU_BARIS = ["kode_dibi", "jenis_resmi", "kk_mengungsi", "kk_terdampak", "orang_mengungsi", "orang_terdampak", "dampak_dari_rincian",
              "rumah_terdampak", "rumah_terdampak_resmi", "status_resmi", "status_perpanjangan", "n_kec_total", "n_desa_total"]


def kejadian_tambahan(rs):
    """medan baru tingkat kejadian: dampak dari entri terakhir; kecamatan/desa = gabungan semua entri; status = gabungan."""
    akhir = rs[-1]
    kec = {x for r in rs for x in r["kecamatan"]}
    desa = {x for r in rs for x in r["desa"]}
    out = {k: akhir[k] for k in ("jenis_lama", "kode_dibi", "jenis_resmi", "kk_mengungsi", "kk_terdampak", "orang_mengungsi", "orang_terdampak",
                                 "dampak_dari_rincian", "rumah_terdampak", "rumah_terdampak_resmi")}
    out["status_resmi"] = [n for n in PANDUAN["status_darurat"]["nilai"] if any(n in r["status_resmi"] for r in rs)]
    out["status_perpanjangan"] = any(r["status_perpanjangan"] for r in rs)
    out["n_kec_total"] = max([r["n_kec_total"] or 0 for r in rs] + [len(kec)]) or None
    out["n_desa_total"] = max([r["n_desa_total"] or 0 for r in rs] + [len(desa)]) or None
    return out


def proses(sumber: str, keluaran: str, awalan: str | None = None):
    os.makedirs(keluaran, exist_ok=True)
    berkas = sorted(glob.glob(os.path.join(sumber, "**", "*.docx"), recursive=True))
    per_tgl = {}
    lewati = []
    for p in berkas:
        nm = os.path.basename(p)
        if nm.startswith("~$") or re.search(r"salinan|contoh|copy", nm, re.I):
            lewati.append({"berkas": nm, "alasan": "salinan/contoh"})
            continue
        t = tgl_berkas(nm)
        if not t:
            lewati.append({"berkas": nm, "alasan": "nama tanpa tanggal"})
            continue
        if t in per_tgl:
            # dua berkas satu tanggal (mis. " 17 Agustus" dan "17 Agustus"): ambil yang terakhir diubah
            lama = per_tgl[t]
            pilih, buang = (p, lama) if os.path.getmtime(p) >= os.path.getmtime(lama) else (lama, p)
            per_tgl[t] = pilih
            lewati.append({"berkas": os.path.basename(buang), "alasan": f"duplikat tanggal {t}, dipakai {os.path.basename(pilih)!r}"})
            continue
        per_tgl[t] = p

    semua, logbook, mutu = [], [], collections.Counter()
    for tgl in sorted(per_tgl):
        p = per_tgl[tgl]
        nm = os.path.basename(p)
        try:
            kepala, baris, piket = baca_docx(p)
        except Exception as e:  # berkas rusak tidak menggagalkan semuanya
            lewati.append({"berkas": nm, "alasan": f"gagal dibaca: {e}"})
            continue
        kep_tgl = semua_tgl(" ".join(kepala))
        if kep_tgl and kep_tgl[0] != tgl:
            mutu["kepala_tanggal_beda"] += 1
        tahun = tgl[:4]
        n = 0
        for baris_sel in baris:
            ti, c = baris_sel[0], baris_sel[1:]
            if entri_kosong(c):
                mutu["entri_kosong_dibuang"] += 1
                continue
            n += 1
            w = urai_waktu(c[1], tahun)
            jt = w["jenis_teks"] or ""
            # label jenis dulu; sel waktu utuh hanya bila labelnya tak terbaca
            jenis = jenis_dari(jt) if jt else "lainnya"
            if jenis == "lainnya" and not re.search(r"\bTPA\b|\bTPS", jt):
                jenis = jenis_dari(c[1])
            lok = urai_lokasi(c[2])
            if not lok["prov_kode"]:
                pk = prov_dalam_teks(c[3] + "\n" + c[4][:600])
                if len(pk) == 1:
                    lok["prov_kode"], lok["prov"] = pk, [PROV.get(pk[0], "")]
            if jenis == "lainnya" and not jt:
                jenis = jenis_dari(c[4][:400])
            dam = urai_dampak(c[3])
            ket = urai_ket(bersih(c[4]))
            sb = urai_sumber(c[5], lok)
            if (not lok["prov_kode"] and not w["tgl_kejadian"] and not jt and jenis != "omc"
                    and not re.search(r"\d", re.sub(r"Korban Jiwa|Kerugian Mater\w+", "", c[3]))):
                mutu["entri_kosong_dibuang"] += 1
                n -= 1
                continue
            r = {
                "tgl_logbook": tgl, "berkas": nm, "tabel": ti, "no": int(re.sub(r"\D", "", c[0]) or 0),
                "jenis": jenis, "jenis_teks": bersih(jt),
                **{k: w[k] for k in ("tgl_kejadian", "jam_kejadian", "zona", "update", "tgl_update", "jam_update", "rekap")},
                "waktu_catatan": bersih(w["waktu_catatan"]),
                **lok, **dam,
                "dampak_teks": bersih(c[3]),
                **{k: ket[k] for k in ["catatan"] + KUNCI_KET}, "status": ket["status"],
                **sb,
            }
            r.update(medan_tambahan(r))
            semua.append(r)
        logbook.append({"tgl_logbook": tgl, "berkas": nm, "n_entri": n, "petugas_piket": piket,
                        "periode": next((k for k in kepala if k.lower().startswith("tanggal")), "")})
        print(f"{tgl}  {n:4d} entri  {nm}", file=sys.stderr)

    # mutu dihitung dari baris akhir (sesudah baris templat dibuang)
    mutu["provinsi_tak_terbaca"] = sum(1 for r in semua if not r["prov_kode"])
    mutu["jenis_tak_terbaca"] = sum(1 for r in semua if r["jenis"] == "lainnya" and not r["jenis_teks"])
    mutu["tgl_kejadian_kosong"] = sum(1 for r in semua if not r["tgl_kejadian"] and r["jenis"] != "omc")
    # ---- gabung jadi kejadian
    # Rantai: entri update menempel ke kejadian terbuka dengan jenis+provinsi(+kab) sama yang terakhir
    # dicatat <= JEDA hari lalu (tgl_kejadian boleh bergeser/kosong); entri baru menempel bila
    # tgl_kejadian+jenis+provinsi+kab sama persis. Rekap memakai nomor rekapnya. OMC: kampanye putus
    # bila jeda > JEDA hari.
    import datetime as _dt
    JEDA = 7
    hari = lambda s: _dt.date.fromisoformat(s)
    grup = []        # [rs]
    buka = collections.defaultdict(list)   # (jenis, prov) -> [idx grup]
    rekap_idx = {}
    for r in semua:
        prov = ",".join(r["prov_kode"])
        kab = (r["kabkota"][0] if r["kabkota"] else "").lower()
        if r["rekap"]:
            k = (r["rekap"].lower(), r["jenis"], prov)
            if k in rekap_idx:
                grup[rekap_idx[k]].append(r)
                continue
            rekap_idx[k] = len(grup)
            grup.append([r])
            buka[(r["jenis"], prov)].append(len(grup) - 1)
            continue
        calon = []
        for gi in buka[(r["jenis"], prov)]:
            rs = grup[gi]
            akhir = rs[-1]
            jeda = (hari(r["tgl_logbook"]) - hari(akhir["tgl_logbook"])).days
            if akhir["rekap"] or jeda > 120:
                continue
            kab_g = {(x["kabkota"][0] if x["kabkota"] else "").lower() for x in rs}
            cocok_kab = kab in kab_g or not kab or kab_g == {""}
            if not cocok_kab:
                continue
            sama_tgl = r["tgl_kejadian"] and r["tgl_kejadian"] in {x["tgl_kejadian"] for x in rs}
            kab_sama = bool(kab) and kab in kab_g
            if r["jenis"] == "omc":
                ok = jeda <= JEDA
            elif sama_tgl:
                ok = kab_sama or jeda <= JEDA          # kejadian sama, dilaporkan lagi
            elif r["update"]:
                ok = jeda <= 60 and (kab_sama or jeda <= JEDA)
            else:
                ok = False
            if ok:
                # skor: tanggal kejadian sama > kab sama > paling baru
                calon.append((bool(sama_tgl), kab_sama, akhir["tgl_logbook"], gi))
        if calon:
            grup[max(calon)[3]].append(r)
        else:
            grup.append([r])
            buka[(r["jenis"], prov)].append(len(grup) - 1)
    kejadian = []
    # awalan = tahun logbook paling awal dalam satu kali jalan, supaya arsip 2011-2026 per tahun tidak bentrok
    # --awalan: tambahan bulan untuk tahun yang sudah diurai (mis. "13b"), supaya id tidak bentrok dengan arsip tahun itu
    th = awalan or min((r["tgl_logbook"] for g in grup for r in g), default="2026")[2:4]
    for i, rs in enumerate(grup, 1):
        akhir = rs[-1]
        kid = f"LB{th}-{i:05d}"
        for r in rs:
            r["id_kejadian"] = kid
        ke = {
            "id_kejadian": kid, "jenis": akhir["jenis"], "jenis_teks": rs[0]["jenis_teks"],
            "tgl_kejadian": rs[0]["tgl_kejadian"], "jam_kejadian": rs[0]["jam_kejadian"], "zona": rs[0]["zona"],
            "rekap": rs[0]["rekap"],
            "prov": akhir["prov"], "prov_kode": akhir["prov_kode"],
            "kabkota": list(dict.fromkeys(x for r in rs for x in r["kabkota"])),
            "n_kec": akhir["n_kec"], "n_desa": akhir["n_desa"],
            "pertama_dicatat": rs[0]["tgl_logbook"], "terakhir_dicatat": akhir["tgl_logbook"],
            "n_laporan": len(rs), "hari_dilaporkan": len({r["tgl_logbook"] for r in rs}),
            **{d: akhir[d] for d in list(POLA_DAMPAK) + ["rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam"]},
            "status": sorted({s for r in rs for s in r["status"]}),
            "kronologi": rs[0]["kronologi"], "kondisi_terakhir": akhir["kondisi"],
            "dampak_teks_terakhir": akhir["dampak_teks"],
            **kejadian_tambahan(rs),
        }
        kejadian.append(ke)

    # ---- tulis
    def jsonl(nama, data):
        with open(os.path.join(keluaran, nama), "w", encoding="utf8", newline="\n") as f:
            for d in data:
                f.write(json.dumps(d, ensure_ascii=False) + "\n")

    def tulis_csv(nama, data):
        if not data:
            return
        kol = list(data[0].keys())
        with open(os.path.join(keluaran, nama), "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=kol)
            w.writeheader()
            for d in data:
                w.writerow({k: ("; ".join(map(str, v)) if isinstance(v, list) else ("" if v is None else v)) for k, v in d.items()})

    jsonl("baris.jsonl", semua)
    jsonl("kejadian.jsonl", kejadian)
    jsonl("logbook.jsonl", logbook)
    tulis_csv("baris.csv", semua)
    tulis_csv("kejadian.csv", kejadian)

    per_bulan = collections.defaultdict(collections.Counter)
    for k in kejadian:
        per_bulan[k["pertama_dicatat"][:7]][k["jenis"]] += 1
    ring = {
        "sumber": os.path.abspath(sumber),
        "rentang": [min(per_tgl), max(per_tgl)] if per_tgl else None,
        "n_berkas": len(logbook), "n_baris": len(semua), "n_kejadian": len(kejadian),
        "n_baris_update": sum(r["update"] for r in semua),
        "berkas_dilewati": lewati,
        "mutu": dict(mutu),
        "kejadian_per_jenis": dict(collections.Counter(k["jenis"] for k in kejadian).most_common()),
        "kejadian_per_bulan_jenis": {m: dict(c.most_common()) for m, c in sorted(per_bulan.items())},
        "kejadian_per_provinsi": dict(collections.Counter(p for k in kejadian for p in (k["prov"] or ["?"])).most_common()),
        "catatan": "Angka dampak ditaksir dari teks bebas; medan dampak kejadian = entri terakhir. Keluaran memuat nama staf penginput, jangan diterbitkan apa adanya.",
    }
    json.dump(ring, open(os.path.join(keluaran, "ringkasan.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    return ring


def jenis_ulang(r: dict) -> str:
    """jenis menurut aturan sekarang dari jenis_teks yang tersimpan. Bila jenis_teks kosong, jenis lama datang dari sel waktu utuh
    (c[1]) atau kronologi yang dulu dibaca dan sebagian tak tersimpan: jenis lama dipertahankan (tak bisa dibagi ulang tanpa docx)."""
    jt, lama = r.get("jenis_teks") or "", r["jenis"]
    j = jenis_dari(jt) if jt else "lainnya"
    return lama if j == "lainnya" else j


def turunkan_ulang(dirs):
    """Terapkan aturan jenis/kode DIBI/dampak/status panduan resmi ke arsip yang sudah ada (docx asli tak ada di repo): baris.jsonl,
    kejadian.jsonl, csv, ringkasan.json ditulis ulang di tempat. Jenis kejadian = jenis baris terakhirnya (aturan lama). Pengelompokan
    baris ke kejadian TIDAK dihitung ulang. -> {tahun: {"baris": {lama>baru: n}, "kejadian": {lama>baru: n}}}."""
    laporan = {}
    for d in dirs:
        bp, kp = os.path.join(d, "baris.jsonl"), os.path.join(d, "kejadian.jsonl")
        baris = [json.loads(l) for l in open(bp, encoding="utf8")]
        ubah_b = collections.Counter()
        for r in baris:
            lama = r.get("jenis_lama") or r["jenis"]          # idempoten: jalankan ulang tetap dari jenis lama
            r["jenis"] = lama
            baru = jenis_ulang(r)
            if baru != lama:
                ubah_b[f"{lama}>{baru}"] += 1
            r["jenis"] = baru
            r.update(medan_tambahan(r))
            r["jenis_lama"] = lama if baru != lama else None
        per_id = collections.defaultdict(list)
        for r in baris:
            per_id[r["id_kejadian"]].append(r)
        kejadian, ubah_k = [], collections.Counter()
        for l in open(kp, encoding="utf8"):
            k = json.loads(l)
            rs = per_id[k["id_kejadian"]]
            lama = k.get("jenis_lama") or k["jenis"]
            k["jenis"] = rs[-1]["jenis"]
            if k["jenis"] != lama:
                ubah_k[f"{lama}>{k['jenis']}"] += 1
            k.update(kejadian_tambahan(rs))
            k["jenis_lama"] = lama if k["jenis"] != lama else None
            kejadian.append(k)
        for nama, data in (("baris", baris), ("kejadian", kejadian)):
            with open(os.path.join(d, nama + ".jsonl"), "w", encoding="utf8", newline="\n") as f:
                for x in data:
                    f.write(json.dumps(x, ensure_ascii=False) + "\n")
            kol = list(data[0].keys())
            with open(os.path.join(d, nama + ".csv"), "w", encoding="utf-8-sig", newline="") as f:
                w = csv.DictWriter(f, fieldnames=kol)
                w.writeheader()
                for x in data:
                    w.writerow({c: ("; ".join(map(str, v)) if isinstance(v, list) else ("" if v is None else v)) for c, v in x.items()})
        rp = os.path.join(d, "ringkasan.json")
        ring = json.load(open(rp, encoding="utf8"))
        per_bulan = collections.defaultdict(collections.Counter)
        for k in kejadian:
            per_bulan[k["pertama_dicatat"][:7]][k["jenis"]] += 1
        ring["kejadian_per_jenis"] = dict(collections.Counter(k["jenis"] for k in kejadian).most_common())
        ring["kejadian_per_bulan_jenis"] = {m: dict(c.most_common()) for m, c in sorted(per_bulan.items())}
        ring["turunan_ulang"] = {"aturan": "panduan_resmi.json (kode DIBI 101-301), 1 Nov 2026", "jenis_berubah_baris": dict(ubah_b), "jenis_berubah_kejadian": dict(ubah_k)}
        json.dump(ring, open(rp, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        laporan[os.path.basename(d)] = {"baris": dict(ubah_b), "kejadian": dict(ubah_k)}
        print(os.path.basename(d), "baris berubah", sum(ubah_b.values()), "kejadian berubah", sum(ubah_k.values()), file=sys.stderr)
    return laporan


def uji():
    j = jenis_dari
    assert [j(x) for x in ("Gelombang Pasang", "Abrasi Pantai", "Tsunami", "Gempa Bumi", "Gempa Vulkanik", "Banjir Lahar", "Banjir Bandang",
                           "Hujan Es", "Siklon Tropis", "Suhu Udara Ekstrem", "Runtuhan", "Awan Panas", "Wabah Penyakit", "Epidemi",
                           "Kegagalan Industri", "Kecelakaan Industri", "Kecelakaan Lalu Lintas", "Puting Beliung", "Banjir dan Tanah Longsor")] == \
        ["gelombang_pasang", "gelombang_pasang", "tsunami", "gempabumi", "gempabumi", "gunungapi", "banjir", "cuaca", "cuaca", "cuaca",
         "gempabumi", "gunungapi", "wabah", "wabah", "kegagalan_teknologi", "kegagalan_teknologi", "kecelakaan", "cuaca", "banjir"]
    assert jenis_resmi("tsunami") == ("108", "Tsunami") and jenis_resmi("gelombang_pasang")[0] == "103" and jenis_resmi("omc") == (None, None)
    t = "Korban Jiwa :\n5 KK / 23 orang mengungsi\n65 KK / 257 orang terdampak\nrincian sbb:\nKec. A:\nDesa X 70 KK / 300 jiwa terdampak\nKerugian Materiil :\n3 unit rumah terdampak\n10 unit rumah terendam\nrincian:\nKel. B 3 unit rumah terdampak"
    k = kk_pasangan(t)
    assert (k["kk_mengungsi"], k["orang_mengungsi"], k["kk_terdampak"], k["orang_terdampak"], k["dampak_dari_rincian"]) == (5, 23, 65, 257, False), k
    assert kk_pasangan("Kec. A:\nDesa X 70 KK / 300 jiwa terdampak\nDesa Y 30 KK terdampak")["kk_terdampak"] == 100   # tanpa kepala: jumlah rincian, bertanda
    assert kk_pasangan("Korban Jiwa :\nNihil")["kk_terdampak"] is None
    assert rumah_terdampak(t, "banjir")["rumah_terdampak_resmi"] == 13 and rumah_terdampak(t, "longsor")["rumah_terdampak_resmi"] == 3
    st = status_resmi("Perpanjangan kesatu siaga darurat TMT 6/7/2025", "")
    assert st == {"status_resmi": ["Siaga Darurat"], "status_perpanjangan": True} and status_resmi("", "-")["status_resmi"] == []
    assert status_resmi("Transisi Darurat ke Pemulihan", "")["status_resmi"] == ["Transisi Darurat ke Pemulihan"]
    r = {"jenis": "banjir", "jenis_teks": "Banjir Lahar", "dampak_teks": t, "kecamatan": ["A", "B", "C"], "desa": [], "n_kec": 2, "n_desa": 9, "status_sk": "", "catatan": ""}
    assert jenis_ulang(r) == "gunungapi" and medan_tambahan(dict(r, jenis="gunungapi"))["n_kec_total"] == 3 and medan_tambahan(r)["n_desa_total"] == 9
    assert jenis_ulang({"jenis": "cuaca", "jenis_teks": "", "kronologi": "gelombang pasang", "dampak_teks": ""}) == "cuaca"   # jenis_teks kosong: lama dipertahankan
    print("uji logbook_pusdalops: OK")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--sumber", help="folder LOGBOOK 2026")
    ap.add_argument("--keluaran", default=os.path.join(AKAR, "data", "raw", "logbook"))
    ap.add_argument("--awalan", help="awalan id kejadian, mis. 13b untuk tambahan 2013 (default: 2 angka tahun)")
    ap.add_argument("--turunkan-ulang", action="store_true", help="terapkan aturan panduan resmi ke arsip yang ada (tanpa docx), tulis di tempat")
    ap.add_argument("--uji", action="store_true")
    a = ap.parse_args(argv)
    if a.uji:
        return uji()
    if a.turunkan_ulang:
        dirs = sorted(glob.glob(os.path.join(a.keluaran, "arsip", "20??")) + glob.glob(os.path.join(a.keluaran, "arsip", "20??-*")))
        print(json.dumps(turunkan_ulang(dirs), ensure_ascii=False, indent=1))
        return
    if not a.sumber:
        ap.error("--sumber wajib")
    r = proses(a.sumber, a.keluaran, a.awalan)
    print(json.dumps({k: r[k] for k in ("rentang", "n_berkas", "n_baris", "n_kejadian", "n_baris_update", "mutu")}, ensure_ascii=False))
    print("dilewati:", [x["berkas"] for x in r["berkas_dilewati"]])


if __name__ == "__main__":
    main()
