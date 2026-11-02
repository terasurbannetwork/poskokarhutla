"""Riwayat penetapan status darurat (SK) dari Drive Pusdalops "File Status SK Darurat Bencana" + FILE SK 2022/2026.
LOKAL saja (Drive ter-mount, mode stream), keluaran TIDAK terbit: data/raw/pusdalops_unik/ (gitignored).

Tiga tahap, hemat unduhan:
  1. rekap  : "REKAP SK DAERAH 2020.xlsx" dan "1. Rangkuman SK Daerah 2019.xlsx" (xlsx dibaca zipfile+xml, stdlib; tanpa openpyxl).
  2. nama   : nama berkas + nama folder provinsi (tanpa unduh): wilayah, tingkat, perpanjangan, jenis, tanggal.
  3. teks   : hanya PDF yang namanya tak memberi tingkat/jenis/tanggal: salin SATU berkas ke scratch, pdftotext 2 halaman, HAPUS salinan.
              Hasil tahap ini di-cache (sk_teks.jsonl) supaya ulang jalan tidak mengunduh lagi. Pindaian tanpa teks: teks=false, tanpa OCR.

Keluaran: sk_status.jsonl (satu baris = satu SK) + sk_ringkasan.json (tahun x tingkat x jenis, gagal + alasan).
Istilah tingkat disamakan dengan scripts/umum/status_darurat.py: Siaga Darurat | Tanggap Darurat | Transisi Darurat ke Pemulihan.
Jenis = daftar JENIS di src/logbook.js.

Pakai:  python3 -I scripts/data/pusdalops_sk.py uji
        python3 -I scripts/data/pusdalops_sk.py jelajah      (os.walk Drive -> sk_daftar.txt; lambat, Drive streaming)
        python3 -I scripts/data/pusdalops_sk.py jalan [--tanpa-teks] [--maks N]
"""
import csv, datetime as dt, importlib.util, json, os, re, shutil, subprocess, sys, tempfile, zipfile
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DRIVE = os.path.expanduser("~/Library/CloudStorage/GoogleDrive-timitbnpb@gmail.com/Drive Saya/00. PIKET PUSDALOPS")
KELUAR = os.path.join(AKAR, "data/raw/pusdalops_unik")
DAFTAR = os.path.join(KELUAR, "sk_daftar.txt")
CACHE = os.path.join(KELUAR, "sk_teks.jsonl")
AKAR_SK = ["File Status SK Darurat Bencana", "2022 LAPORAN PUSDALOPS/FILE SK 2022", "2026 LAPORAN PUSDALOPS/FILE SK 2026"]
REKAP = {2019: "File Status SK Darurat Bencana/SK BPBD 2019/1. Rangkuman SK Daerah 2019.xlsx",
         2020: "File Status SK Darurat Bencana/REKAP SK DAERAH 2020.xlsx"}
REKAP_LEMBAR = {2019: "Rangkuman SK", 2020: "SK Tanggap Darurat"}
# Rekap Google Sheet (diekspor lewat konektor Drive ke KELUAR/gsheet/, gitignored). (tahun, berkas, lembar, bentuk)
#   xlsx   : pola REKAP (kolom dicari dari baris judul)            csv : rekap 2022, sel masa berisi teks bebas
#   bulanan: satu lembar per bulan, kolom tetap, TANPA masa (hanya tanggal berlaku SK)
# Formulir "PENDATAAN SK TANGGAP DARURAT 2023/2024 (Responses)" TIDAK dibaca: isinya hanya wilayah, YA/TIDAK, dan tautan berkas SK
# (tanpa tanggal, tingkat, nomor), ditambah email/nama/HP pengisi yang tak boleh disimpan.
BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
GSHEET = [(2021, "rekap_2021.xlsx", ["SK BENCANA ALAM", "KARHUTLA", "SK COVID"], "xlsx"), (2022, "rekap_2022.csv", None, "csv"),
          (2024, "rekap_2024.xlsx", BULAN, "bulanan")]
PDFTOTEXT = shutil.which("pdftotext") or "/opt/homebrew/bin/pdftotext"
SCRATCH = os.environ.get("PUSDALOPS_TMP") or os.path.join(tempfile.gettempdir(), "pusdalops_sk")   # salinan PDF sementara, dihapus per berkas

SIAGA, TANGGAP, TRANSISI = "Siaga Darurat", "Tanggap Darurat", "Transisi Darurat ke Pemulihan"
BLN = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "mei": 5, "jun": 6, "jul": 7, "agu": 8, "ags": 8, "agt": 8, "sep": 9, "okt": 10, "oct": 10,
       "nov": 11, "des": 12, "dec": 12}


def _muat(rel):
    s = importlib.util.spec_from_file_location("status_darurat", os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


SD = _muat("scripts/umum/status_darurat.py")           # PROV, PROV_NAMA, peta_wilayah: satu sumber istilah
KODE = json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json"), encoding="utf-8"))
ALIAS_PROV = {"diy": "34", "d.i yogyakarta": "34", "d.i. yogyakarta": "34", "di yogyakarta": "34", "ntb": "52", "ntt": "53", "kep riau": "21",
              "kep. riau": "21", "kepri": "21", "kalbar": "61", "kalteng": "62", "kalsel": "63", "kaltim": "64", "kaltara": "65", "sumut": "12",
              "sumbar": "13", "sumsel": "16", "sulut": "71", "sulteng": "72", "sulsel": "73", "sultra": "74", "sulbar": "76", "malut": "82",
              "jabar": "32", "jateng": "33", "jatim": "35", "dki jakarta": "31", "jakarta": "31", "babel": "19", "kep. bangka belitung": "19",
              "kalimanten tengah": "62", "kalimanan barat": "61"}   # salah ketik di Sheet 2021
SINGKAT_KAB = {"tangsel": "tangerang selatan", "hss": "hulu sungai selatan", "hst": "hulu sungai tengah", "hsu": "hulu sungai utara",
               "ttu": "timor tengah utara", "tts": "timor tengah selatan", "kotim": "kotawaringin timur", "kobar": "kotawaringin barat",
               "kukar": "kutai kartanegara", "tanjabtim": "tanjung jabung timur", "tanjabbar": "tanjung jabung barat",
               "tanjab timur": "tanjung jabung timur", "tanjab barat": "tanjung jabung barat", "sitaro": "kepulauan siau tagulandang biaro",
               "asel": "aceh selatan", "oku": "ogan komering ulu", "muba": "musi banyuasin", "inhil": "indragiri hilir", "inhu": "indragiri hulu"}


def norm(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(t or "").lower())).strip()


# ---- tanggal ----
def _bln(s):
    return BLN.get(str(s).lower()[:3])


def _thn(y, bawaan=None):
    if y is None or y == "":
        return bawaan
    y = int(y)
    return 2000 + y if y < 100 else y


def tanggal(d, b, y):
    try:
        return dt.date(int(y), int(b), int(d)).isoformat()
    except (TypeError, ValueError):
        return None


RE_RENTANG = re.compile(r"(\d{1,2})\s*([A-Za-z]{3,9})\.?\s*(?:'?(\d{2,4}))?\s*(?:-|–|s\.?\s?d\.?|sampai(?:\s+dengan)?|hingga)\s*(\d{1,2})\s*([A-Za-z]{3,9})\.?\s*'?(\d{2,4})?", re.I)


def rentang(s, tahun_bawaan=None):
    """'1 Jan - 30 Maret 2020' / '8 Juni s.d 14 Juni 2019' / "19 Sep '18 - 26 Feb 2019" -> (mulai, selesai) atau (None, None)."""
    for m in RE_RENTANG.finditer(str(s or "")):
        b1, b2 = _bln(m.group(2)), _bln(m.group(5))
        if not b1 or not b2:
            continue
        y2 = _thn(m.group(6), tahun_bawaan)
        if y2 is None:
            continue
        y1 = _thn(m.group(3), None)
        if y1 is None:
            y1 = y2 if (b1, int(m.group(1))) <= (b2, int(m.group(4))) else y2 - 1
        a, z = tanggal(m.group(1), b1, y1), tanggal(m.group(4), b2, y2)
        if a and z:
            return a, z
    # '08 s.d 15 November 2022' / '14 - 31 Desember 2022': bulan dan tahun hanya di ujung
    m = re.search(r"(\d{1,2})\s*(?:s\.?\s?d\.?|-|–)\s*(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(20\d{2})", str(s or ""), re.I)
    if m and _bln(m.group(3)):
        a, z = tanggal(m.group(1), _bln(m.group(3)), m.group(4)), tanggal(m.group(2), _bln(m.group(3)), m.group(4))
        if a and z:
            return a, z
    return None, None


def tgl_satu(s, tahun_bawaan=None):
    """Satu tanggal dalam teks: ddmmyyyy | dd-mm-yyyy | 'dd Bulan yyyy' | 'dd Bulan' (tahun_bawaan). Cap waktu pemindai (yyyy-mm-dd, 14 digit) diabaikan."""
    s = re.sub(r"\d{4}-\d{2}-\d{2}[ _]?[\d.:]*|\d{12,}", " ", str(s or ""))
    m = re.search(r"(?<!\d)(\d{2})(\d{2})(20\d{2})(?!\d)", s)
    if m and tanggal(m.group(1), m.group(2), m.group(3)):
        return tanggal(m.group(1), m.group(2), m.group(3))
    m = re.search(r"(?<!\d)(\d{1,2})[-./](\d{1,2})[-./](20\d{2}|\d{2})(?!\d)", s)
    if m and tanggal(m.group(1), m.group(2), _thn(m.group(3))):
        return tanggal(m.group(1), m.group(2), _thn(m.group(3)))
    m = re.search(r"(?<!\d)(\d{1,2})[ -]+([A-Za-z]{3,9})\.?[ -]*(20\d{2}|\d{2}(?!\d))?", s)
    while m:
        b = _bln(m.group(2))
        y = _thn(m.group(3), tahun_bawaan)
        if b and y and tanggal(m.group(1), b, y):
            return tanggal(m.group(1), b, y)
        m = re.compile(r"(?<!\d)(\d{1,2})[ -]+([A-Za-z]{3,9})\.?[ -]*(20\d{2}|\d{2}(?!\d))?").search(s, m.end())
    return None


# ---- jenis, tingkat ----
def jenis_dari(t):
    """Teks bebas -> salah satu JENIS src/logbook.js, atau None. Urutan mengikuti POLA_JENIS laphar_arsip.py (banjir/bansor lebih dulu)."""
    t = str(t or "").lower()
    for p, j in ((r"karhutla|karlahut|kebakaran (hutan|dan lahan|lahan)|hutan dan lahan", "karhutla"), (r"kekeringan|kemarau", "kekeringan"),
                 (r"covid|corona|\bpmk\b|penyakit mulut|wabah|\bklb\b|rabies|antraks|demam berdarah|\bdbd\b|keracunan", "wabah"),
                 (r"gempa", "gempabumi"), (r"tsunami", "tsunami"), (r"erupsi|gunung ?api|vulkan|merapi|lewotolok|semeru|karangasem|sinabung|krakatau", "gunungapi"),
                 (r"banjir|bansor|banjir bandang", "banjir"), (r"longsor", "longsor"), (r"gelombang|abrasi|\brob\b|pasang", "gelombang_pasang"),
                 (r"hidromet|cuaca|angin|puting beliung|siklon|seroja", "cuaca"), (r"kebakaran (permukiman|pemukiman|rumah)", "kebakaran_permukiman")):
        if re.search(p, t):
            return j
    return None


def tingkat_dari(t):
    t = str(t or "").replace("_", " ")
    if re.search(r"transisi|pemulihan|\bTDRP\b|\bTDP\b", t, re.I):
        return TRANSISI
    if re.search(r"tanggap|\bT\.?D\b", t, re.I):
        return TANGGAP
    if re.search(r"siaga|\bS\.?D\b", t, re.I):
        return SIAGA
    return None


# ---- wilayah ----
def prov_dari_folder(f):
    """'12. KALIMANTAN BARAT' / 'Prov. NTT' / 'DIY' -> kode 2 angka atau None."""
    n = re.sub(r"^\s*\d+\.\s*", "", f)
    n = re.sub(r"^prov(insi|\.)?\s*", "", n, flags=re.I)
    n = re.sub(r"\s+", " ", n).strip().lower().rstrip(".")
    return ALIAS_PROV.get(n) or ALIAS_PROV.get(n + ".") or SD.PROV.get(n) or SD.PROV.get(norm(n))


def _index_kab():
    idx = {}
    for kode, v in KODE.items():
        inti = re.sub(r"^(Kab\.|Kota)\s+", "", v["nama"])
        idx.setdefault(v["prov"], []).append((norm(inti), v["nama"].startswith("Kota"), v["kunci_nama"], v["prov"]))
    return idx


KAB_PROV = _index_kab()


def kab_dari_nama(nama, prov):
    """Nama berkas -> (prov, kunci_kab|None, tingkat_prov:bool). Cari inti nama kab terpanjang di provinsi folder; bila tak ada dan nama
    berawalan Kab./Kota, cari di semua provinsi (unik saja)."""
    n = " " + norm(nama) + " "
    for k, v in SINGKAT_KAB.items():
        n = re.sub(r"(?<![a-z])" + re.escape(k) + r"(?![a-z])", " " + v + " ", n)
    punya_kota = bool(re.search(r"\bkota\b", n))
    punya_kab = bool(re.search(r"\bkab(upaten)?\b", n))
    pakai_prov = bool(re.search(r"\bprov(insi)?\b", n)) and not punya_kab and not punya_kota

    def cari(daftar):
        calon = [(len(i), i, kota, kn, p) for i, kota, kn, p in daftar if re.search(r"(?<![a-z0-9])" + re.escape(i) + r"(?![a-z0-9])", n)]
        if not calon:
            return None
        panjang = max(c[0] for c in calon)
        calon = [c for c in calon if c[0] == panjang]
        if len(calon) > 1:
            calon = [c for c in calon if c[2] == punya_kota and not (punya_kab and c[2])] or calon
        return calon[0][3], calon[0][4]
    if pakai_prov:
        return prov, None, True
    if prov:
        h = cari(KAB_PROV.get(prov, []))
        if h:
            return h[1], h[0], False
    if punya_kab or punya_kota:
        semua = [x for v in KAB_PROV.values() for x in v]
        h = cari(semua)
        if h:
            return h[1], h[0], False
    return prov, None, False


# ---- tahap 2: nama berkas ----
LEWAT = re.compile(r"komando|posko|pos komando|personil|personel|\bsatgas\b|gugus|rumah rusak|kerusakan|bantuan|inmendagri|ppkm|\bse\b|surat edaran|sekretariat|"
                   r"kepmen|persyaratan teknis|lampiran|salinan|laporan khusus|aktivitas|dth|huntara|data korban", re.I)
EKSTENSI_TEKS = {".pdf"}


def urai_nama(berkas):
    """berkas = jalur relatif dari akar Drive. Mengembalikan baris SK (dict) atau (None, alasan)."""
    bagian = berkas.split("/")
    nama = os.path.splitext(bagian[-1])[0].replace("_", " ")
    ext = os.path.splitext(bagian[-1])[1].lower()
    if ext in (".db", ".gsheet", ".xlsx", ".zip", ".txt"):
        return None, "bukan_sk"
    # tahun folder + provinsi folder
    tahun_f = None
    for b in bagian:
        m = re.search(r"SK BPBD (20\d{2})|FILE SK (20\d{2})", b)
        if m:
            tahun_f = int(m.group(1) or m.group(2))
    prov = None
    for b in bagian[1:-1]:
        prov = prov_dari_folder(b) or prov
    covid = "COVID19" in berkas.upper().replace(" ", "")
    if LEWAT.search(nama):
        return None, "bukan_status"
    p, kab, tkt_prov = kab_dari_nama(nama, prov)
    perp = bool(re.search(r"\bperp(anjangan|\.)?(?![a-z])|ke ?-? ?[2-9]\b|\bI{2,3}\b", nama, re.I))
    dok = "pernyataan" if re.search(r"pernyataan|pernytaan|pnyt|\bSP\b", nama, re.I) else "sk"
    a, z = rentang(nama, tahun_f)
    tgl = None if a else tgl_satu(nama, tahun_f)
    return {"prov": p, "kab": kab, "tingkat": tingkat_dari(nama), "perpanjangan": perp, "jenis": jenis_dari(nama), "tgl_sk": tgl if not a else None,
            "mulai": a, "selesai": z, "sumber": "nama", "berkas": berkas, "dokumen": dok, "tahun_folder": tahun_f, "tingkat_prov": tkt_prov,
            "covid_folder": covid, "ext": ext}, None


# ---- tahap 1: rekap xlsx ----
def baca_xlsx(jalur, lembar):
    z = zipfile.ZipFile(jalur)
    N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    ss = [("".join(t.text or "" for t in si.iter(N + "t"))) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(N + "si")]
    wb = z.read("xl/workbook.xml").decode()
    rid = re.search(r'<sheet [^>]*name="' + re.escape(lembar) + r'"[^>]*r:id="(rId\d+)"', wb).group(1)
    rel = z.read("xl/_rels/workbook.xml.rels").decode()
    tujuan = re.search(r'<Relationship [^>]*Id="' + rid + r'"[^>]*Target="([^"]+)"', rel) or re.search(r'<Relationship [^>]*Target="([^"]+)"[^>]*Id="' + rid + '"', rel)
    t = tujuan.group(1).lstrip("/")
    t = t if t.startswith("xl/") else "xl/" + t
    baris = []
    for r in ET.fromstring(z.read(t)).iter(N + "row"):
        d = {}
        for c in r.iter(N + "c"):
            v = c.find(N + "v")
            if v is None:
                continue
            d[re.match("[A-Z]+", c.get("r")).group()] = ss[int(v.text)] if c.get("t") == "s" else v.text
        if d:
            baris.append(d)
    return baris


def ambil_rekap(rel):
    """xlsx rekap disalin sekali ke KELUAR (kecil, gitignored); cp berbatas waktu karena Drive streaming bisa menggantung."""
    lokal = os.path.join(KELUAR, os.path.basename(rel).replace(" ", "_"))
    if not os.path.exists(lokal) or os.path.getsize(lokal) == 0:
        subprocess.run(["cp", os.path.join(DRIVE, rel), lokal], check=True, timeout=120)
    return lokal


def serial_tgl(v):
    try:
        return (dt.date(1899, 12, 30) + dt.timedelta(days=int(float(v)))).isoformat()
    except (TypeError, ValueError):
        return None


def urai_rekap(baris, tahun):
    """Baris lembar rekap -> daftar SK. Kolom dicari dari baris judul (ada 'Siaga' dan 'Tanggap'). Tiap sel masa (Siaga/Tanggap/Transisi) bisa
    berisi beberapa rentang (dipisah baris baru atau >=2 spasi): rentang ke-2 dan seterusnya = perpanjangan."""
    kol = None
    keluar = []
    for r in baris:
        nilai = {k: str(v).strip() for k, v in r.items()}
        if kol is None:
            h = {v.lower(): k for k, v in nilai.items()}
            if ("siaga" in h or "tanggap" in h) and "provinsi" in h:
                kol = {"prov": h["provinsi"], "kab": h.get("kota/kabupaten"), "jenis": h.get("jenis kejadian"), "no": h.get("no. sk"),
                       "tgl_surat": h.get("tanggal surat"), "status": h.get("status terkini") or h.get("status"),
                       SIAGA: h.get("siaga"), TANGGAP: h.get("tanggap"), TRANSISI: h.get("transisi")}
            continue
        if not nilai.get(kol["prov"]) or nilai.get(kol["jenis"], "").lower() in ("", "jenis kejadian"):
            continue
        pn = nilai[kol["prov"]]
        pk = prov_dari_folder(pn) or SD.PROV.get(norm(pn))
        kabteks = nilai.get(kol["kab"], "") if kol["kab"] else ""
        _, kab, tp = kab_dari_nama(kabteks, pk) if kabteks not in ("", "-") and pk else (pk, None, False)
        surat = [x for x in re.split(r"\n|\s{2,}", nilai.get(kol["tgl_surat"], "") if kol["tgl_surat"] else "") if x.strip()]
        nomor = [x for x in re.split(r"\n|\s{3,}", nilai.get(kol["no"], "") if kol["no"] else "") if x.strip()]
        for tkt in (SIAGA, TANGGAP, TRANSISI):
            sel = nilai.get(kol[tkt] or "", "") if kol[tkt] else ""
            if sel in ("", "-"):
                continue
            baris_m = [x for x in re.split(r"\n|\s{2,}", sel) if re.search(r"\d", x)]
            for i, x in enumerate(baris_m):
                a, z = rentang(x, tahun)
                if not a:
                    continue
                tg = None
                if len(surat) == len(baris_m):
                    s = surat[i]
                    tg = serial_tgl(s) if re.fullmatch(r"\d+(\.0)?", s) else tgl_satu(s, tahun)
                elif len(surat) == 1:
                    s = surat[0]
                    tg = (serial_tgl(s) if re.fullmatch(r"\d+(\.0)?", s) else tgl_satu(s, tahun)) if i == 0 else None
                perp = i > 0 or "perpanjangan" in nilai.get(kol["status"] or "", "").lower()
                keluar.append({"prov": pk, "kab": kab, "tingkat": tkt, "perpanjangan": perp, "jenis": jenis_dari(nilai.get(kol["jenis"], "")),
                               "tgl_sk": tg, "mulai": a, "selesai": z, "sumber": "rekap", "berkas": None, "tempat": kabteks or pn,
                               "nomor": nomor[i] if len(nomor) == len(baris_m) else (nomor[0] if len(nomor) == 1 else None), "tahun_folder": tahun})
    return keluar


RE_BUKAN_STATUS = re.compile(r"satgas|satuan tugas|gugus|pembentukan|komando|posko|tertentu", re.I)


def _kosong_tkt(x):
    """Pemisah 's.d' bukan 'S.D' (Siaga Darurat)."""
    return tingkat_dari(re.sub(r"\bs\.\s?d\.?", " ", x, flags=re.I))


def urai_rekap_csv(baris, tahun):
    """Rekap 2022 (CSV hasil ekspor Sheet): kolom Siaga/Tanggap/Transisi dari baris judul, provinsi/kab di sampingnya. Sel berupa teks bebas
    ('SK TD Bupati 01 s.d 14 September 2022', 'Siaga Darurat 12 Juli 2022 - 31 Des 2022'): tingkat di teks menang atas kolom, baris ke-2 sel
    = perpanjangan, masa tanpa ujung ('25 Juli 2022 s.d . . .') = mulai saja. Satgas/gugus tugas/posko/status tertentu dilewati."""
    kol, ip, keluar = None, None, []
    for r in baris:
        r = [c.strip() for c in r]
        if "Provinsi" in r:
            ip = r.index("Provinsi")
        if kol is None:
            if "Siaga" in r and "Tanggap" in r:
                kol = {i: {"Siaga": SIAGA, "Tanggap": TANGGAP, "Transisi": TRANSISI}[c] for i, c in enumerate(r) if c in ("Siaga", "Tanggap", "Transisi")}
            continue
        if ip is None or len(r) <= ip + 1 or not r[ip]:
            continue
        pk = prov_dari_folder(r[ip])
        kabteks = r[ip + 1]
        _, kab, _tp = kab_dari_nama(kabteks, pk) if kabteks and pk else (pk, None, False)
        for i, tkt0 in kol.items():
            sel = r[i] if i < len(r) else ""
            masa = [x for x in sel.split("\n") if re.search(r"\d", x)]
            for j, x in enumerate(masa):
                if RE_BUKAN_STATUS.search(x):
                    continue
                a, z = rentang(x, tahun)
                if not a and re.search(r"s\.?\s?d", x, re.I):
                    a = tgl_satu(x, tahun)
                if not a:
                    continue
                keluar.append({"prov": pk, "kab": kab, "tingkat": _kosong_tkt(x) or tkt0, "perpanjangan": j > 0 or bool(re.search(r"perpanjangan", x, re.I)),
                               "jenis": jenis_dari(r[ip - 1]), "tgl_sk": None, "mulai": a, "selesai": z, "sumber": "rekap", "berkas": None,
                               "tempat": kabteks or r[ip], "nomor": None, "tahun_folder": tahun})
    return keluar


def _tgl_sel(v):
    """Sel tanggal Sheet: serial angka atau 'dd/mm/yyyy' (bisa beberapa baris) -> daftar ISO; yang tak terbaca dilewati."""
    out = []
    for x in str(v or "").split("\n"):
        x = x.strip()
        if re.fullmatch(r"\d+(\.0)?", x):
            out.append(serial_tgl(x))
        else:
            m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", x)
            out.append(tanggal(m.group(1), m.group(2), m.group(3)) if m else None)
    return [d for d in out if d]


def urai_rekap_bulanan(baris, tahun, lembar):
    """Rekap 2024 per bulan: Provinsi, Kab/Kota ('-' = tingkat provinsi), Jenis Bencana, Tanggal Berlaku SK, Ada SK Posko?, Jenis SK Posko.
    Sheet tak mencatat tingkat SK status; satu-satunya petunjuk tingkatnya jenis SK Posko (Siaga/Tanggap/Transisi), jadi hanya baris ber-SK Posko
    yang masuk. SK Posko sendiri BUKAN baris (bukan penetapan status, sama dengan nama berkas 'posko' yang dilewati). Mengembalikan (SK, gagal)."""
    kol = None
    keluar, gagal = [], []
    for r in baris:
        n = {k: str(v).strip() for k, v in r.items()}
        if kol is None:
            if n.get("B") == "Provinsi" and n.get("F", "").startswith("Tanggal Berlaku SK"):
                kol = True
            continue
        if not n.get("B") or n["B"].lower() == "provinsi":
            continue
        ref = f"rekap_{tahun}:{lembar}:{n.get('A', '?')}"
        tkt = tingkat_dari(n.get("I", "")) if n.get("G", "").lower() == "ya" else None
        if not tkt:
            gagal.append({"berkas": ref, "alasan": "rekap_bulanan_tanpa_tingkat"})
            continue
        pk = prov_dari_folder(n["B"])
        kabteks = n.get("C", "")
        _, kab, _tp = kab_dari_nama(kabteks, pk) if kabteks not in ("", "-") and pk else (pk, None, False)
        for j, d in enumerate(_tgl_sel(n.get("F")) or [None]):
            keluar.append({"prov": pk, "kab": kab, "tingkat": tkt, "perpanjangan": j > 0, "jenis": jenis_dari(n.get("D", "")), "tgl_sk": d, "mulai": None,
                           "selesai": None, "sumber": "rekap", "berkas": None, "tempat": kabteks if kabteks not in ("", "-") else n["B"], "nomor": None,
                           "tahun_folder": tahun, "dokumen": "sk"})
    return keluar, gagal


def kunci_sk(r):
    """SK yang sama: wilayah, tingkat, perpanjangan, masa (atau tanggal SK bila tak ada masa). None bila provinsi tak diketahui (tak aman digabung)."""
    if not r.get("prov") or not (r.get("mulai") or r.get("tgl_sk")):
        return None
    return (r["prov"], r.get("kab"), r["tingkat"], r["perpanjangan"], r.get("mulai"), r.get("selesai"), None if r.get("mulai") else r["tgl_sk"])


def tanpa_ganda(rows, ada=()):
    """Buang baris yang kuncinya sudah ada (baris ganda di Sheet, atau SK yang sudah masuk lewat nama berkas)."""
    seen, out = {kunci_sk(r): r for r in ada if kunci_sk(r)}, []
    for r in rows:
        k = kunci_sk(r)
        if k is not None:
            if k in seen:
                for f in ("nomor", "jenis", "tgl_sk", "tempat"):   # yang tercatat hanya di salinan ini, ikut ke baris yang bertahan
                    if not seen[k].get(f) and r.get(f):
                        seen[k][f] = r[f]
                continue
            seen[k] = r
        out.append(r)
    return out


def muat_gsheet():
    """Semua rekap Google Sheet yang ada di KELUAR/gsheet. Berkas/lembar yang hilang atau berubah bentuk dicatat di gagal, tak menghentikan jalan."""
    hasil, gagal = [], []
    for th, nama, lembar, bentuk in GSHEET:
        jalur = os.path.join(KELUAR, "gsheet", nama)
        try:
            if bentuk == "csv":
                hasil += urai_rekap_csv(list(csv.reader(open(jalur, encoding="utf-8", newline=""))), th)
            elif bentuk == "xlsx":
                for l in lembar:
                    hasil += urai_rekap(baca_xlsx(jalur, l), th)
            else:
                for l in lembar:
                    h, g = urai_rekap_bulanan(baca_xlsx(jalur, l), th, l)
                    hasil += h
                    gagal += g
        except Exception as e:  # noqa: BLE001
            gagal.append({"berkas": "gsheet/" + nama, "alasan": "rekap_gagal:" + type(e).__name__})
    return tanpa_ganda(hasil), gagal


# ---- tahap 3: teks PDF ----
def teks_pdf(berkas):
    """Salin SATU berkas ke scratch, pdftotext 2 halaman, HAPUS salinan. Mengembalikan (teks, galat)."""
    os.makedirs(SCRATCH, exist_ok=True)
    tmp = tempfile.mkdtemp(dir=SCRATCH, prefix="p")
    salin = os.path.join(tmp, "x.pdf")
    try:
        subprocess.run(["cp", os.path.join(DRIVE, berkas), salin], check=True, timeout=75)   # Drive streaming kadang menggantung: batas waktu
        if os.path.getsize(salin) == 0:
            return "", "salinan_kosong"
        p = subprocess.run([PDFTOTEXT, "-layout", "-f", "1", "-l", "2", salin, "-"], capture_output=True, timeout=60)
        return p.stdout.decode("utf-8", "replace"), None
    except Exception as e:  # noqa: BLE001 : unduhan/pdftotext gagal tak boleh menghentikan 900 berkas
        return "", f"{type(e).__name__}"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def urai_teks(teks):
    """Teks SK -> {tingkat, jenis, tgl_sk, mulai, selesai, perpanjangan, nomor} (None bila tak ketemu). Kosong (<80 karakter) = pindaian."""
    t = re.sub(r"[ \t]+", " ", teks)
    plat = re.sub(r"\s+", " ", t)
    if len(plat) < 80:
        return None
    kepala = plat[:2500]
    m = re.search(r"status\s+(?:keadaan\s+)?(?:darurat\s+)?(?:bencana\s+)?(siaga|tanggap|transisi)", kepala, re.I) or re.search(r"(siaga|tanggap|transisi)\s+darurat", kepala, re.I)
    tkt = tingkat_dari(m.group(1)) if m else None
    a, z = rentang(plat[:6000])
    if not a:
        mm = re.search(r"(?:terhitung\s+mulai|mulai|TMT)\s*(?:tanggal)?\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})", plat, re.I)
        a = tgl_satu(mm.group(1)) if mm else None
        h = re.search(r"selama\s+(\d{1,3})\s*(?:\([^)]*\)\s*)?hari", plat, re.I)
        if a and h:
            z = (dt.date.fromisoformat(a) + dt.timedelta(days=int(h.group(1)) - 1)).isoformat()
    ts = re.search(r"[Dd]itetapkan\s+di\s+[A-Za-z .]+?\s+pada\s+tanggal\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})", plat)
    n = re.search(r"(?:nomor|no\.)\s*:?\s*([0-9A-Za-z./\-]+(?:\s+tahun\s+\d{4})?)", kepala, re.I)
    return {"tingkat": tkt, "jenis": jenis_dari(kepala), "tgl_sk": tgl_satu(ts.group(1)) if ts else None, "mulai": a, "selesai": z,
            "perpanjangan": bool(re.search(r"perpanjangan", kepala, re.I)), "nomor": n.group(1).strip() if n else None, "kepala": kepala[:0]}


def muat_cache():
    c = {}
    if os.path.exists(CACHE):
        for b in open(CACHE, encoding="utf-8"):
            if b.strip():
                o = json.loads(b)
                c[o["berkas"]] = o
    return c


def daftar_berkas():
    if os.path.exists(DAFTAR):
        return [b.strip() for b in open(DAFTAR, encoding="utf-8") if b.strip()]
    sys.exit("sk_daftar.txt tidak ada: jalankan 'jelajah' dulu")


def jelajah():
    os.makedirs(KELUAR, exist_ok=True)
    hasil = []
    for a in AKAR_SK:
        for d, _, fs in os.walk(os.path.join(DRIVE, a)):
            hasil += [os.path.relpath(os.path.join(d, f), DRIVE) for f in fs]
    open(DAFTAR, "w", encoding="utf-8").write("\n".join(sorted(hasil)) + "\n")
    print(len(hasil), "berkas")


def tahun_baris(r):
    for k in ("tgl_sk", "mulai"):
        if r.get(k):
            return int(r[k][:4])
    return r.get("tahun_folder")


def jalan(teks=True, maks=None):
    os.makedirs(KELUAR, exist_ok=True)
    berkas = daftar_berkas()
    baris, gagal = [], []
    for b in berkas:
        r, alasan = urai_nama(b)
        if r is None:
            gagal.append({"berkas": b, "alasan": alasan})
        else:
            baris.append(r)
    # tahap 1: rekap (ditempel ke baris nama bila prov+kab+tingkat sama dan baris nama belum punya mulai)
    rekap = []
    for th, rel in REKAP.items():
        try:
            rekap += urai_rekap(baca_xlsx(ambil_rekap(rel), REKAP_LEMBAR[th]), th)
        except Exception as e:  # noqa: BLE001
            gagal.append({"berkas": rel, "alasan": "rekap_gagal:" + type(e).__name__})
    gs, gg = muat_gsheet()
    rekap += gs
    gagal += gg
    # tahap 3: teks, hanya baris tanpa tingkat / tanpa jenis / tanpa tanggal sama sekali (setelah rekap)
    def tempel_rekap():
        pakai = set()
        for r in baris:
            if r["mulai"] or not r["tingkat"]:
                continue
            c = [(i, k) for i, k in enumerate(rekap) if i not in pakai and k["mulai"] and k["prov"] == r["prov"] and k["kab"] == r["kab"]
                 and k["tingkat"] == r["tingkat"] and k["perpanjangan"] == r["perpanjangan"]]
            if c and r["tgl_sk"]:
                c.sort(key=lambda ik: abs((dt.date.fromisoformat(ik[1]["mulai"]) - dt.date.fromisoformat(r["tgl_sk"])).days))
            if c:
                i, k = c[0]
                pakai.add(i)
                r.update({"mulai": k["mulai"], "selesai": k["selesai"], "sumber": "rekap", "nomor": k.get("nomor")})
                r["jenis"] = r["jenis"] or k["jenis"]
                r["tgl_sk"] = r["tgl_sk"] or k["tgl_sk"]
        for i, k in enumerate(rekap):   # rekap tanpa masa (2024): sudah ada baris nama dengan wilayah, tingkat, tanggal SK yang sama = SK yang sama
            if i not in pakai and not k["mulai"] and k["tgl_sk"] and any(
                    r["prov"] == k["prov"] and r["kab"] == k["kab"] and r["tingkat"] == k["tingkat"] and r["tgl_sk"] == k["tgl_sk"] for r in baris):
                pakai.add(i)
                for r in baris:
                    if r["prov"] == k["prov"] and r["kab"] == k["kab"] and r["tingkat"] == k["tingkat"] and r["tgl_sk"] == k["tgl_sk"]:
                        r["jenis"] = r["jenis"] or k["jenis"]
        return pakai
    pakai = tempel_rekap()
    perlu = [r for r in baris if r["ext"] in EKSTENSI_TEKS and not (r["covid_folder"] and not r["tingkat"])
             and (not r["tingkat"] or not r["jenis"] or not (r["mulai"] or r["tgl_sk"]))]
    if maks:
        perlu = perlu[:maks]
    cache = muat_cache()
    if teks:
        todo = [r for r in perlu if r["berkas"] not in cache or cache[r["berkas"]].get("galat")]
        print(f"teks: {len(perlu)} perlu, {len(todo)} belum di-cache", file=sys.stderr)
        def kerja(r):
            tk, galat = teks_pdf(r["berkas"])
            o = {"berkas": r["berkas"], "galat": galat}
            if not galat:
                u = urai_teks(tk)
                o["teks"] = u is not None
                if u and (not r["kab"] and not r["tingkat_prov"]):
                    w = SD.peta_wilayah(re.sub(r"\s+", " ", tk)[:2500], KODE)
                    if w and w[2]:
                        o["kab"] = KODE[next(k for k, v in KODE.items() if v["kemendagri"] == w[2])]["kunci_nama"]
                        o["prov"] = w[0]
                o.update(u or {})
            return o
        with ThreadPoolExecutor(max_workers=8) as ex, open(CACHE, "a", encoding="utf-8") as f:
            for o in ex.map(kerja, todo):   # ponytail: ex.map berurutan; satu berkas macet = 75 dtk menahan antrean, cukup
                cache[o["berkas"]] = o
                f.write(json.dumps(o, ensure_ascii=False) + "\n")
                f.flush()
    for r in baris:
        o = cache.get(r["berkas"])
        if not o:
            continue
        if o.get("galat"):
            r["teks"] = None
            continue
        r["teks"] = bool(o.get("teks"))
        if not o.get("teks"):
            continue
        isi = False
        for k in ("tingkat", "jenis", "tgl_sk", "mulai", "selesai", "nomor", "kab", "prov"):
            if not r.get(k) and o.get(k):
                r[k] = o[k]
                isi = True
        r["perpanjangan"] = r["perpanjangan"] or bool(o.get("perpanjangan"))
        if isi:
            r["sumber"] = "teks" if r["sumber"] == "nama" else r["sumber"]
    pakai = tempel_rekap()
    # susun keluaran
    sk = []
    for r in baris:
        if not r["tingkat"]:
            gagal.append({"berkas": r["berkas"], "alasan": "tanpa_tingkat" + ("" if r.get("teks") is not False else "_pindaian" if r.get("teks") is False else "")})
            continue
        sk.append(r)
    sk += tanpa_ganda([k for i, k in enumerate(rekap) if i not in pakai], sk)
    for r in sk:
        r["tahun"] = tahun_baris(r)
        for k in ("ext", "covid_folder", "tingkat_prov", "tahun_folder"):
            r.pop(k, None)
        r["prov_nama"] = SD.PROV_NAMA.get(r["prov"]) if r.get("prov") else None
    sk.sort(key=lambda r: (r.get("tahun") or 0, r.get("prov") or "", r.get("kab") or "", r.get("mulai") or r.get("tgl_sk") or ""))
    with open(os.path.join(KELUAR, "sk_status.jsonl"), "w", encoding="utf-8") as f:
        for r in sk:
            f.write(json.dumps({k: r.get(k) for k in ("prov", "kab", "tingkat", "perpanjangan", "jenis", "tgl_sk", "mulai", "selesai", "sumber", "berkas",
                                                        "tahun", "dokumen", "nomor", "tempat", "prov_nama")}, ensure_ascii=False) + "\n")
    ring = ringkas(sk, gagal, baris)
    json.dump(ring, open(os.path.join(KELUAR, "sk_ringkasan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({k: ring[k] for k in ("total", "per_tahun", "per_sumber", "tanpa_tanggal", "tanpa_jenis", "tanpa_prov", "gagal_alasan")}, ensure_ascii=False))


def ringkas(sk, gagal, baris):
    from collections import Counter
    c = Counter((r.get("tahun"), r["tingkat"], r.get("jenis") or "?") for r in sk)
    return {"dibuat": dt.datetime.now().isoformat(timespec="seconds"), "total": len(sk), "per_tahun": dict(Counter(str(r.get("tahun")) for r in sk)),
            "per_sumber": dict(Counter(r["sumber"] for r in sk)),
            "tanpa_tanggal": sum(1 for r in sk if not (r.get("mulai") or r.get("tgl_sk"))), "tanpa_mulai": sum(1 for r in sk if not r.get("mulai")),
            "tanpa_jenis": sum(1 for r in sk if not r.get("jenis")), "tanpa_prov": sum(1 for r in sk if not r.get("prov")),
            "pindaian_tanpa_teks": sum(1 for r in baris if r.get("teks") is False),
            "gagal_alasan": dict(Counter(g["alasan"] for g in gagal)), "gagal": gagal,
            "tahun_x_tingkat_x_jenis": [{"tahun": t, "tingkat": k, "jenis": j, "n": n} for (t, k, j), n in sorted(c.items(), key=lambda x: (x[0][0] or 0, x[0][1], x[0][2]))]}


def uji():
    P = "File Status SK Darurat Bencana/SK BPBD 2020/"
    def u(b):
        r, _ = urai_nama(b)
        return r
    r = u(P + "12. KALIMANTAN BARAT/Kab. Sintang_SK_SD_Bansor Angin 12072020.pdf")
    assert (r["prov"], r["kab"], r["tingkat"], r["jenis"], r["tgl_sk"], r["perpanjangan"]) == ("61", "61|Sintang", SIAGA, "banjir", "2020-07-12", False), r
    r = u(P + "10. JAWA TENGAH/Kota Pekalongan_SK TD_Perp Banjir Rob - 31052020.pdf")
    assert (r["prov"], r["kab"], r["tingkat"], r["perpanjangan"], r["tgl_sk"]) == ("33", "33|Kota Pekalongan", TANGGAP, True, "2020-05-31"), r
    r = u("File Status SK Darurat Bencana/SK BPBD 2019/Kalimantan Tengah/SK Karhutla KAB. GUNUNG MAS (Kalteng).pdf")
    assert (r["prov"], r["kab"], r["jenis"], r["tingkat"], r["tgl_sk"]) == ("62", "62|Gunung Mas", "karhutla", None, None), r
    r = u("File Status SK Darurat Bencana/SK BPBD 2019/Sulawesi Selatan/Sulsel_Kab. Wajo - SK Penetapan Tanggap Darurat 8 Juni s.d 14 Juni 2019.pdf")
    assert (r["kab"], r["tingkat"], r["mulai"], r["selesai"]) == ("73|Wajo", TANGGAP, "2019-06-08", "2019-06-14"), r
    r = u("2022 LAPORAN PUSDALOPS/FILE SK 2022/Prov. Gorontalo/SK TRANSISI PERPANJANGAN KAB. GORONTALO UTARA.pdf")
    assert (r["prov"], r["kab"], r["tingkat"], r["perpanjangan"]) == ("75", "75|Gorontalo Utara", TRANSISI, True), r
    r = u("2022 LAPORAN PUSDALOPS/FILE SK 2022/Prov. Jawa Timur/SK TD KAB. TRENGGALEK_PMK.pdf")
    assert (r["kab"], r["tingkat"], r["jenis"]) == ("35|Trenggalek", TANGGAP, "wabah"), r
    r = u(P + "34. SUMATERA UTARA/Prov NTT_SK Siaga Banjir Angin Prov NTT.pdf") if False else u(P + "23. NUSA TENGGARA TIMUR/SK Siaga Banjir Angin Prov NTT.pdf")
    assert (r["prov"], r["kab"], r["tingkat"]) == ("53", None, SIAGA), r
    r, alasan = urai_nama(P + "21. MALUKU UTARA/Kab. Pulau Morotai_SK_Posko_Abrasi_16102020_Maluku Utara.pdf")
    assert r is None and alasan == "bukan_status"
    r = u(P + "22. NUSA TENGGARA BARAT/Kab. Bima_SK_TD_Kekeringan 08062020.pdf")
    assert (r["kab"], r["tingkat"], r["jenis"], r["tgl_sk"]) == ("52|Bima", TANGGAP, "kekeringan", "2020-06-08"), r
    assert rentang("19 Sep '18 - 26 Feb 2019") == ("2018-09-19", "2019-02-26") and rentang("1 Jan - 30 Maret 2020") == ("2020-01-01", "2020-03-30")
    assert rentang("14 Okt - 30 Apr 2020") == ("2019-10-14", "2020-04-30")
    assert tgl_satu("Dok baru 2019-07-24 09.56.47") is None and tgl_satu("SK TD Bansor Asel 28 JANUARI 2020") == "2020-01-28"
    assert tgl_satu("SP Banjir Asel 23 April 2020 (DONE)") == "2020-04-23" and tgl_satu("SP Banjir 4 Desember (DONE)", 2020) == "2020-12-04"
    t = urai_teks("KEPUTUSAN BUPATI SINTANG NOMOR 188.45/12/2020 TENTANG PENETAPAN STATUS SIAGA DARURAT BENCANA BANJIR. Menetapkan status siaga darurat "
                  "terhitung mulai tanggal 12 Juli 2020 s.d. 31 Juli 2020. Ditetapkan di Sintang pada tanggal 11 Juli 2020 BUPATI")
    assert (t["tingkat"], t["mulai"], t["selesai"], t["tgl_sk"], t["jenis"]) == (SIAGA, "2020-07-12", "2020-07-31", "2020-07-11", "banjir"), t
    assert urai_teks("x  y") is None
    rk = urai_rekap([{"B": "No", "C": "Jenis Kejadian", "D": "Provinsi", "E": "Kota/Kabupaten", "G": "Tanggal Surat", "H": "Status Terkini", "I": "No. SK", "J": "Siaga",
                      "K": "Tanggap", "L": "Transisi"},
                     {"C": "Banjir", "D": "Kalimantan Barat", "E": "Kab. Mempawah", "G": "44082.0", "H": "Tanggap Darurat", "I": "263 Tahun 2020", "J": "-",
                      "K": "8 Sep - 21 Sep 2020\n22 Sep - 30 Sep 2020", "L": "-"}], 2020)
    assert len(rk) == 2 and rk[0]["kab"] == "61|Mempawah" and rk[0]["mulai"] == "2020-09-08" and rk[1]["perpanjangan"] and not rk[0]["perpanjangan"], rk
    # rekap Google Sheet: 2021 (karhutla hanya kolom Siaga), 2022 (CSV teks bebas), 2024 (bulanan, tanpa masa)
    assert rentang("08 s.d 15 November 2022") == ("2022-11-08", "2022-11-15") and rentang("SK TD Bupati Natuna tmt 14 - 31 Desember 2022") == ("2022-12-14", "2022-12-31")
    rk = urai_rekap([{"A": "No", "B": "Jenis Kejadian", "C": "Provinsi", "D": "Kota/Kabupaten", "E": "Tanggal Surat", "F": "Status Terkini", "G": "No. SK", "H": "Siaga"},
                     {"B": "Kebakaran Hutan dan Lahan", "C": "Riau", "E": "44242.0", "F": "siaga", "G": "kpts. 212/11/2021", "H": "15 Feb s.d 31 Okt 2021"}], 2021)
    assert len(rk) == 1 and (rk[0]["prov"], rk[0]["kab"], rk[0]["tingkat"], rk[0]["jenis"], rk[0]["mulai"], rk[0]["tgl_sk"]) == ("14", None, SIAGA, "karhutla", "2021-02-15", "2021-02-15"), rk
    rows = [["", "", "Provinsi", "Kota/Kabupaten", "", "", "", "", "", "", "", ""], ["", "", "", "", "Waktu", "Siaga", "Tanggap", "POS Komando", "Transisi", "Rehab", "Keadaan", "Tgl"],
            ["7", "Wabah PMK", "D.I. Yogyakarta", "", "", "SK Siaga 01 Juli s.d 31 Juli 2022\n&\nSK Perpanjangan 01 Agustus 2022 - 31 Agustus 2022", "", "SK POSKO", "", "", "", ""],
            ["9", "Wabah PMK", "Bali", "", "", "Pembentukan SATGAS 05 Juli 2022", "", "", "", "", "", ""],
            ["13", "Banjir", "Bengkulu", "Seluma", "", "", "SK TD Bupati 01 s.d 14 September 2022", "", "02 Agustus 2022 s.d 02 Februari 2023", "", "", ""],
            ["5", "Wabah PMK", "Aceh", "Bener Meriah", "", "06 Juni 2022 s.d . . . . .", "", "", "", "", "", ""]]
    rc = urai_rekap_csv(rows, 2022)
    assert [(x["prov"], x["tingkat"], x["perpanjangan"], x["mulai"], x["selesai"]) for x in rc] == [
        ("34", SIAGA, False, "2022-07-01", "2022-07-31"), ("34", SIAGA, True, "2022-08-01", "2022-08-31"), ("17", TANGGAP, False, "2022-09-01", "2022-09-14"),
        ("17", TRANSISI, False, "2022-08-02", "2023-02-02"), ("11", SIAGA, False, "2022-06-06", None)] and rc[2]["kab"] == "17|Seluma", rc
    hdr = {"A": "No", "B": "Provinsi", "C": "Kab/Kota", "D": "Jenis Bencana", "E": "Link", "F": "Tanggal Berlaku SK", "G": "Ada SK Posko?", "I": "Jenis SK Posko (Siaga/Tanggap/Transisi)"}
    rb, gb = urai_rekap_bulanan([hdr,
                                 {"A": "1", "B": "JAMBI", "C": "TEBO", "D": "BANJIR", "F": "45293.0", "G": "Ya", "I": "Tanggap"},
                                 {"A": "2", "B": "KALIMANTAN BARAT", "C": "-", "D": "BANJIR, CUACA EKSTREM", "F": "07/07/2024\n14/07/2024", "G": "Ya", "I": "Siaga"},
                                 {"A": "3", "B": "ACEH", "C": "PIDIE", "D": "BANJIR", "F": "45300.0", "G": "Tidak"}], 2024, "Januari")
    assert [(x["prov"], x["kab"], x["tingkat"], x["tgl_sk"], x["perpanjangan"]) for x in rb] == [
        ("15", "15|Tebo", TANGGAP, "2024-01-02", False), ("61", None, SIAGA, "2024-07-07", False), ("61", None, SIAGA, "2024-07-14", True)] and len(gb) == 1, (rb, gb)
    print("uji OK")


if __name__ == "__main__":
    a = sys.argv[1:] or ["uji"]
    if a[0] == "uji":
        uji()
    elif a[0] == "jelajah":
        jelajah()
    elif a[0] == "jalan":
        jalan(teks="--tanpa-teks" not in a, maks=int(a[a.index("--maks") + 1]) if "--maks" in a else None)
