"""Turunan INTERNAL logbook Pusdalops (staf saja, tidak terbit di repo): rapor_bpbd.json dan rekomendasi.json.

Kontrak : docs/superpowers/specs/2026-11-01-logbook-turunan.md (produk 2 dan 6)
Masukan : data/raw/logbook/arsip/20??{,-*}/{kejadian,baris}.jsonl (tidak di-git); kode kab = logbook_bersih.kode_kab
Keluaran: data/raw/logbook/turunan/{rapor_bpbd,rekomendasi,penanganan}.json dan serupa_<kodeprov2>.json (tidak di-git; sesi induk yang mengunggah ke R2)
Pakai   : python3 scripts/data/logbook_internal.py        (jalan penuh)
          python3 scripts/data/logbook_internal.py uji    (self-check fixture kecil)
rapor_bpbd dan rekomendasi: tanpa nama orang dan tanpa teks bebas. serupa_*.json memuat teks pendek (kronologi/upaya/kondisi) yang
sudah disamarkan (nama orang, nomor telepon) dan HANYA untuk staf. Angka korban dan rumah rusak tidak dipakai di mana pun.
"""
import collections
import datetime as dt
import glob
import importlib
import importlib.util
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARSIP = os.path.join(AKAR, "data/raw/logbook/arsip")
KELUAR = os.path.join(AKAR, "data/raw/logbook/turunan")
RIWAYAT = os.path.join(AKAR, "public/data/logbook_riwayat.json")
PERIODE_TERPISAH = ("2024", "2025", "2026")
MIN_N = 10          # anjuran layar: sembunyikan sel dengan n < MIN_N
MAKS_JEDA = 300     # hari; lebih dari ini = salah ketik tahun (sama dengan logbook_bersih.rekap)
BERULANG_TAHUN = 3
ISIAN = ("kecamatan", "desa", "kondisi", "upaya", "kebutuhan", "kendala")


def kuantil(xs, p):
    xs = sorted(xs)
    if not xs:
        return None
    i = (len(xs) - 1) * p
    a = int(i)
    b = min(a + 1, len(xs) - 1)
    return round(xs[a] + (xs[b] - xs[a]) * (i - a), 2)


def hari_antara(a, b):
    """b - a dalam hari; None bila salah satunya kosong atau bukan tanggal sah."""
    try:
        return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days
    except (TypeError, ValueError):
        return None


def tahun_kejadian(k):
    """tahun kejadian; bila tgl_kejadian kosong atau selisih ke catatan pertama > MAKS_JEDA (salah ketik), tahun catatan pertama."""
    sel = hari_antara(k.get("tgl_kejadian"), k.get("pertama_dicatat"))
    t = k.get("tgl_kejadian")
    if sel is None or abs(sel) > MAKS_JEDA:
        t = k.get("pertama_dicatat")
    return (t or "")[:4]


def isi(v):
    if isinstance(v, list):
        return any(str(x).strip() for x in v)
    return bool(str(v or "").strip())


# ---- rekomendasi: topik kata kunci (huruf kecil) ----
TOPIK = {
    "normalisasi_sungai": r"normalisasi|pengerukan|kerukan|pendalaman sungai|keruk",
    "tanggul": r"tanggul|turap|talud|tembok penahan|bronjong|krib|sheet pile",
    "relokasi": r"relokasi|direlokasi|pemindahan (warga|penduduk|permukiman)|hunian tetap|huntap|hunian sementara|huntara",
    "jalur_evakuasi": r"jalur evakuasi|titik kumpul|tempat evakuasi|shelter|rute evakuasi|lokasi pengungsian",
    "peringatan_dini": r"peringatan dini|\bews\b|early warning|sirine|sirene|alat deteksi|sensor",
    "sosialisasi": r"sosialisasi|edukasi|penyuluhan|simulasi|pelatihan|literasi|pembinaan",
    "alat_berat": r"alat berat|ekskavator|excavator|backhoe|bulldozer|\bbeko\b|dump truck",
    "logistik": r"logistik|sembako|bahan makanan|makanan siap saji|selimut|terpal|tenda|family kit|kebutuhan dasar|bantuan",
    "status_darurat": r"status darurat|tanggap darurat|siaga darurat|penetapan status|status siaga",
    "drainase": r"drainase|gorong|saluran air|parit|selokan|box culvert",
    "reboisasi_konservasi": r"reboisasi|penghijauan|penanaman|konservasi|rehabilitasi lahan|vegetasi|tanam pohon|revegetasi",
    "patroli_karhutla": r"patroli|pemadaman|water bombing|pembasahan|pembukaan lahan|larangan membakar|tidak membakar|dilarang membakar|\bmpa\b|\bdaops\b|karhutla",
    "sekat_kanal_embung": r"sekat kanal|embung|kanal|sumur bor|pembasahan gambut|canal blocking",
    "perbaikan_jalan_jembatan": r"perbaikan (jalan|jembatan)|jembatan|akses jalan|jalan (rusak|putus)|perbaiki jalan|penanganan jalan",
    "imbauan_kewaspadaan": r"waspada|kewaspadaan|mewaspadai|himbau|imbau|menjauhi|tidak beraktivitas|hindari",
}
TOPIK_RE = {k: re.compile(v) for k, v in TOPIK.items()}
KALIMAT_REKOM = re.compile(r"\b(perlu|agar|diharapkan)\b")


def kalimat(teks):
    return [s.strip().lower() for s in re.split(r"[\n;]|\.\s", teks or "") if s.strip()]


def topik_teks(teks):
    """himpunan topik pada satu teks (kalimat demi kalimat tidak perlu: kejadian dihitung sekali per topik)."""
    t = (teks or "").lower()
    return {k for k, r in TOPIK_RE.items() if r.search(t)}


def teks_rekom(b):
    """(teks, jalur): kolom rekomendasi; bila kosong, kalimat 'perlu/agar/diharapkan' di upaya + kondisi."""
    if isi(b.get("rekomendasi")):
        return b["rekomendasi"], "rekomendasi"
    kal = [s for f in ("upaya", "kondisi") for s in kalimat(b.get(f)) if KALIMAT_REKOM.search(s)]
    return ("\n".join(kal), "kalimat") if kal else ("", "")


# ---- pembaca arsip ----
def berkas(nama):
    return sorted(glob.glob(os.path.join(ARSIP, f"20??/{nama}.jsonl")) + glob.glob(os.path.join(ARSIP, f"20??-*/{nama}.jsonl")))


def baca(nama):
    for f in berkas(nama):
        with open(f, encoding="utf-8") as h:
            for l in h:
                yield json.loads(l)


def muat_kode_kab():
    s = importlib.util.spec_from_file_location("logbook_bersih", os.path.join(AKAR, "scripts/data/logbook_bersih.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    cache = {}

    def kode(k):
        kunci = (tuple(k.get("kabkota") or ()), tuple(k.get("prov_kode") or ()))
        if kunci not in cache:
            cache[kunci] = m.kode_kab(k)
        return cache[kunci]
    return kode


# ---- inti ----
def bangun(kejadian, baris_iter, kode_kab, tahun_dasar):
    """-> (rapor, rekomendasi) dari iterator kejadian dan baris. Bebas berkas: dipakai juga oleh uji."""
    kej = {}      # id -> (tahun, [kab], [prov], k)
    namaprov = collections.defaultdict(collections.Counter)
    for k in kejadian:
        kabs = kode_kab(k)
        if not kabs:
            continue
        pn = k.get("prov") or []
        pk = k.get("prov_kode") or []
        if len(pn) == len(pk):
            for c, n in zip(pk, pn):
                namaprov[c][n] += 1
        kej[k["id_kejadian"]] = (tahun_kejadian(k), kabs, k)

    def periode_dari(y):
        return [p for p in ("dasar",) if y in tahun_dasar] + ([y] if y in PERIODE_TERPISAH else [])

    # sel[(tingkat, kunci, periode)] -> penampung
    def baru():
        return {"n": 0, "jeda": [], "jeda_dibuang": 0, "pantau": [], "sekali": 0, "entri": 0, "isian": collections.Counter()}
    sel = collections.defaultdict(baru)

    def kunci_sel(kabs):
        out = [("kab", kb) for kb in kabs] + [("prov", p) for p in sorted({kb.split("|")[0] for kb in kabs})] + [("nasional", "ID")]
        return out

    for _id, (y, kabs, k) in kej.items():
        j = hari_antara(k.get("tgl_kejadian"), k.get("pertama_dicatat"))
        ok_j = j is not None and 0 <= j <= MAKS_JEDA
        lp = hari_antara(k.get("pertama_dicatat"), k.get("terakhir_dicatat"))
        for per in periode_dari(y):
            for t, kk in kunci_sel(kabs):
                s = sel[(t, kk, per)]
                s["n"] += 1
                if ok_j:
                    s["jeda"].append(j)
                else:
                    s["jeda_dibuang"] += 1
                if lp is not None and lp >= 0:
                    s["pantau"].append(lp)
                s["sekali"] += (k.get("n_laporan") or 0) == 1

    # rekomendasi[(kab, topik)] -> tahun->set(id) dan jenis
    ev_topik = {}   # id -> (set topik, jalur)
    for b in baris_iter:
        e = kej.get(b.get("id_kejadian"))
        if not e:
            continue
        y, kabs, _k = e
        pers = periode_dari(y)
        pen = [isi(b.get(f)) for f in ISIAN]
        for per in pers:
            for t, kk in kunci_sel(kabs):
                s = sel[(t, kk, per)]
                s["entri"] += 1
                for f, a in zip(ISIAN, pen):
                    s["isian"][f] += a
        teks, jalur = teks_rekom(b)
        if teks:
            tp = topik_teks(teks)
            if tp:
                lama = ev_topik.get(b["id_kejadian"])
                # jalur kolom 'rekomendasi' menang atas kalimat; topik antar-baris digabung dalam jalur yang sama
                if lama is None or (jalur == "rekomendasi" and lama[1] == "kalimat"):
                    ev_topik[b["id_kejadian"]] = (tp, jalur)
                elif lama[1] == jalur:
                    lama[0].update(tp)

    def rapor_sel(s):
        n = s["n"]
        e = s["entri"]
        return {"n": n,
                "jeda_hari": {"n": len(s["jeda"]), "median": kuantil(s["jeda"], .5), "p75": kuantil(s["jeda"], .75)},
                "lama_pantau_hari": {"n": len(s["pantau"]), "median": kuantil(s["pantau"], .5)},
                "sekali_pct": round(100 * s["sekali"] / n, 1) if n else None,
                "entri": e,
                "lengkap_pct": {f: (round(100 * s["isian"][f] / e, 1) if e else None) for f in ISIAN}}

    rapor = {"kab": {}, "prov": {}, "nasional": {}}
    for (t, kk, per), s in sel.items():
        if t == "nasional":
            rapor["nasional"][per] = rapor_sel(s)
        else:
            rapor[t].setdefault(kk, {})[per] = rapor_sel(s)
    rapor["nama_prov"] = {c: n.most_common(1)[0][0] for c, n in namaprov.items()}

    rek = collections.defaultdict(lambda: collections.defaultdict(lambda: {"tahun": collections.Counter(), "jenis": collections.Counter()}))
    nas = collections.defaultdict(lambda: {"tahun": collections.Counter(), "jenis": collections.Counter()})
    jalur_n = collections.Counter()
    for _id, (tp, jalur) in ev_topik.items():
        y, kabs, k = kej[_id]
        jalur_n[jalur] += 1
        for tpk in tp:
            nas[tpk]["tahun"][y] += 1
            nas[tpk]["jenis"][k["jenis"]] += 1
            for kb in kabs:
                r = rek[kb][tpk]
                r["tahun"][y] += 1
                r["jenis"][k["jenis"]] += 1

    def sel_rek(r):
        th = sorted(r["tahun"])
        return {"tahun": th, "n_kejadian": sum(r["tahun"].values()), "n_per_tahun": dict(sorted(r["tahun"].items())),
                "jenis": dict(r["jenis"].most_common()), "berulang": len(th) >= BERULANG_TAHUN}

    rekom = {"kab": {kb: {tpk: sel_rek(v) for tpk, v in sorted(d.items())} for kb, d in sorted(rek.items())},
             "nasional": {tpk: sel_rek(v) for tpk, v in sorted(nas.items())},
             "jalur_n_kejadian": dict(jalur_n)}
    return rapor, rekom


# ---- serupa_<prov> dan penanganan: satu catatan per kejadian ----
SELESAI = re.compile(r"\b(padam|dipadamkan|surut|selesai|tertangani|teratasi|tuntas)\b", re.I)
SELESAI_NEG = re.compile(r"belum|tidak|masih|berangsur|sebagian|hampir|akan|proses", re.I)
MIN_N_TANGANI = 5
MAKS_SERUPA = 40       # kejadian terbaru per kab x jenis
def selesai_ya(kondisi):
    """kondisi menyebut padam/surut/selesai/tertangani tanpa penyangkal ('belum', 'masih', 'berangsur'...) tepat sebelumnya."""
    t = " ".join(str(kondisi or "").split())
    return any(not SELESAI_NEG.search(t[max(0, m.start() - 14):m.start()]) for m in SELESAI.finditer(t))


HONOR_PANJANG = r"Bpk|Bapak|Ibu|Sdr|Sdri|Sdra|Saudara|Saudari|Kakek|Nenek|Mbah|Almarhum|Almarhumah"   # juga huruf kecil ('bapak Sahat')
HONOR_PENDEK = r"Tn|Ny|Nn|Pak|Bu|Alm|Almh|An|H|Hj"                                                      # hanya berhuruf besar
HONOR = HONOR_PANJANG + "|" + HONOR_PENDEK
# jabatan/instansi: 'Bpk. Kalaksa BPBD' tetap utuh (bukan nama orang)
JABATAN = {"sekda", "kalaksa", "kalak", "bupati", "wakil", "wabup", "gubernur", "wagub", "camat", "kades", "lurah", "walikota", "wali", "kapolres", "kapolsek", "kapolda",
           "dandim", "danramil", "danrem", "kodim", "kabid", "kasi", "kasat", "kabag", "kepala", "kapus", "danki", "dan", "kasubag", "sekcam", "sekdes", "babinsa",
           "babinkamtibmas", "pj", "plt", "ketua", "direktur", "sekretaris", "kapolsubsektor", "kasie", "kasubid", "danlanud", "dandenma", "komandan", "asisten", "staf", "menteri"}
BUKAN_NAMA = {"desa", "dusun", "dsn", "kel", "kec", "kecamatan", "kabupaten", "kab", "kota", "jl", "jalan", "ds", "rt", "rw", "kelurahan", "yang", "dan", "di", "pada", "bpbd", "sebagai",
              "dari", "ke", "untuk", "dengan", "kampung", "kp", "lingkungan", "provinsi", "prov", "pkl", "wib", "wita", "wit", "tgl", "hari", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"}
# kata (huruf kecil) yang BUKAN nama setelah milik/oleh/korban/saksi/anak dari...: instansi, jabatan, judul bagian, kata umum yang berhuruf besar di log
STOP3 = BUKAN_NAMA | JABATAN | {
    "pt", "cv", "dinas", "pertamina", "tim", "polsek", "koramil", "tni", "polri", "warga", "pemda", "gereja", "masjid", "sekolah", "sd", "smp", "sma", "pln", "puskesmas",
    "pemerintah", "trc", "damkar", "personil", "masyarakat", "pmk", "satgas", "bmkg", "pusdalops", "petugas", "terdampak", "pihak", "curah", "intensitas", "satpol", "dinsos", "uptd",
    "perhutani", "pemkab", "pemadam", "banjir", "skpd", "gempa", "basarnas", "luka", "pmi", "relawan", "bbws", "tingginya", "aparat", "destana", "jiwa", "unit", "melakukan", "heli",
    "tagana", "dsda", "upes", "meninggal", "muspika", "pos", "koordinasi", "kebakaran", "demonstran", "bencana", "anggota", "sar", "pu", "polres", "bp", "dpu", "pdam", "kendaraan", "ppsu",
    "korban", "rescue", "balai", "laka", "instansi", "kasrem", "pemdes", "roda", "team", "kondisi", "mpa", "suhu", "dampak", "posko", "rumah", "oknum", "regu", "hilang", "manggala",
    "memberikan", "bpjn", "polisi", "kelurahan", "dishub", "helikopter", "debit", "badan", "perum", "pimpinan", "untuk", "pertamina", "luapan", "pembukaan", "musim", "bandara", "upt",
    "konsleting", "masih", "dinkes", "tngm", "kepolisian", "tanah", "pemilik", "aliran", "opd", "kelompok", "rs", "sudah", "cuaca", "perusahaan", "kasilog", "distaman", "korsleting",
    "suku", "bpba", "derasnya", "sesar", "pemkot", "pupr", "koordinator", "hujan", "angin", "air", "api", "longsor", "sungai", "oleh", "satuan", "lanud", "kodim", "bnpb", "kemensos",
    "kementerian", "pemprov", "polhut", "dishut", "linmas", "perangkat", "pusat", "kekeringan", "update", "satu", "bidang", "gabungan", "kedua", "kejadian", "musibah", "total",
    "kegiatan", "paket", "sampah", "terbakar", "unsur", "verifikasi", "crew", "armada", "lahan", "bambu", "mobil", "penanganan", "bantuan", "logistik", "saluran", "abrasi", "atas",
    "komunitas", "pengembang", "lazisnu", "pesantren", "toko", "selamat", "kemarau", "aktivasi", "mengingatkan", "menyiapkan", "membantu", "pencarian", "distribusi", "dari", "hingga",
    "sapol", "satker", "ksop", "kadistrik", "dpkp", "kemen", "sekda", "gubernur", "wna", "odgj", "ptp", "ptpn", "hti", "bkssda", "bksda", "agni", "pvmbg", "masy", "dilarikan",
}
NAMA_BILANGAN = {"nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "belas", "puluh", "seratus", "ratus", "ribu", "se"}
SATUAN = {"jiwa", "orang", "unit", "rumah", "buah", "lembar", "paket", "box", "kk", "warga", "meter", "hektar", "ha", "rb", "rs", "rr", "km", "kg", "liter", "titik", "lokasi", "org",
          "personil", "anggota", "kepala", "keluarga", "kali", "jam", "hari", "menit", "lantai", "kamar", "sapi", "ekor", "pcs", "karung", "dus", "btl", "botol", "set", "sak"}
PREDIKAT = {"meninggal", "luka", "hilang", "selamat", "tewas", "roboh", "rusak", "terluka", "mengungsi", "terdampak", "tenggelam", "terbakar", "hanyut", "sembuh", "sehat", "ambruk",
            "rumah", "warga", "lahan", "kebun", "anak", "istri", "suami", "tetangga", "api", "longsor", "banjir", "mobil", "motor", "kontrakan", "toko", "ruko", "tanah", "pohon", "atap", "dapur",
            "selatan", "utara", "barat", "timur", "tengah", "daya", "laut", "kota", "baru", "lama", "raya", "indah"}
FUNGSI = {"yang", "dan", "di", "dengan", "dari", "ke", "telah", "sedang", "melalui", "serta", "untuk", "akibat", "pada", "saat", "karena", "bahwa", "sudah", "hingga", "sehingga", "yg",
          "dalam", "oleh", "atau", "juga", "ini", "itu", "adalah", "namun", "tetapi", "sampai", "setelah", "sebelum", "selaku", "bersama", "tanpa", "agar", "lalu", "kemudian", "dll"}
AWALAN_KERJA = ("di", "ter", "me", "mem", "men", "meng", "meny", "ber", "se", "ke", "pe", "per", "pem", "pen", "peng")


def kata_umum(w):
    """kata berhuruf besar yang hampir pasti bukan nama: instansi/judul (STOP3), akronim, bergaris, atau berimbuhan kerja panjang (Melakukan, Mengevakuasi)."""
    l = w.lower()
    return l in STOP3 or (w.isupper() and len(w) > 1) or "-" in w or (len(l) > 6 and l.startswith(AWALAN_KERJA))


HONOR_KECIL = {h.lower() for h in HONOR.split("|")}
TOK = re.compile(r"[A-Z][\w'’-]*")
P_HONOR = re.compile(r"\b(?:(?i:%s)|%s)\b\.?\s*(?=[A-Z])" % (HONOR_PANJANG, HONOR_PENDEK))
P_PENANDA = re.compile(r"\b(?:a\.\s?n\.?|a/n|atas nama|aas nama|bernama|berinisial|(?:korban|saksi|siswa|siswi|pelaku)\s+bernama)\s*(?=[A-Z])", re.I)
P_PEMILIK = re.compile(r"\b(?i:milik|oleh|tungku|jenazah|pemilik(?:\s+(?:rumah|lahan|kebun))?|anak dari|istri dari|suami dari|korban|saksi)\s+(?=[A-Z])")
P_UMUR = re.compile(r"\(\s*[LP]?\s*[,/]?\s*\d{1,3}\s*(?:th|thn|tahun)\s*(?:[,/]\s*[LP]\w*)?\s*\)|\b\d{1,3}\s*(?:th|thn)\b|\b(?:berumur|umur(?:nya)?)\s*:?\s*\d{1,3}(?:\s*(?:th|thn|tahun))?", re.I)
P_NAMA_UMUR = re.compile(r"((?:[A-Z][\w'’-]*\s+){1,3})(?=\[umur\])")
P_RTRW = re.compile(r"\bRT\s*[./]?\s*RW\s*[.:]?\s*\d+\s*/\s*\d+|\bRT\s*[./]?\s*\d+\s*[/,]?\s*(?:RW\s*[./]?\s*\d+)?|\bRW\s*[./]?\s*\d+", re.I)
_DS = "(?!(?:Desa|Ds|Kel|Kelurahan|Kec|Kecamatan|Kab|Kabupaten|Kota|RT|RW|Dusun|Dsn)\\b)[A-Z][\\w'’-]*"
P_DUSUN = re.compile(r"\b(?:Dusun|Dsn\.?|Dukuh|Dk\.?|Kampung|Kp\.?|Lingkungan|Lingk\.?)\s+" + _DS + r"(?:\s+" + _DS + r"){0,2}")
P_TELP = re.compile(r"(\+?\d[\d\s().-]{7,}\d)|[\w.+-]+@[\w-]+\.[\w.]+")
TOPONIM = re.compile(r"\b(?:G|Gn)\.\s*Ibu\b|\bGunung\s+Ibu\b|\bPak\s?Pak\s+Bharat\b|\bNias(?:\s+(?:Selatan|Utara|Barat))?\b", re.I)
UMUR_DALAM_KURUNG = re.compile(r"^[±~\sLP/,()-]*(?:\d{1,3}|\[umur\])")
P_NAMA_KURUNG = re.compile(r"\[nama\]\s*,?\s*\(([^()]{0,40})\)")
P_NAMA_UMUR_BARE = re.compile(r"(\[nama\])\s*,?\s*(?:\([LP]\)\s*)?±?\s*\d{1,3}\s*(?:tahun|th|thn)\b", re.I)
P_USIA = re.compile(r"\b(?:berusia|usia(?:nya)?)\s*:?\s*±?\s*\d{1,3}(?:\s*(?:tahun|th|thn))?", re.I)
ORANG = re.compile(r"\b(?:anak|balita|bayi|korban|warga|pria|wanita|laki|perempuan|ibu|bapak|nenek|kakek|siswa|pelaku|saksi|remaja|dewasa|lansia|orang)\b", re.I)
P_PANGGIL = re.compile(r"(?<=\[nama\])[\s,.]*\(\s*(?!(?:korban|pemilik|terdampak|md|lr|lb|l|p|alm|almarhum|selamat)\s*\))[A-Za-z][\w'’-]*(?:\s+[A-Za-z][\w'’-]*)?\s*\)", re.I)
P_NAMA_PAREN = re.compile(r"((?:[A-Z][\w'’-]+\s+){0,2}[A-Z][\w'’-]+)\s*\((\d{2,3})\)")
GELAR = r"(?:SE|ST|SH|SKM|SP|SPd|SSos|SKom|SAg|SIP|STP|SHut|SPt|MM|MT|MH|MPd|MSi|MKes|MAP|S\.[A-Za-z]{1,5}\.?(?:[A-Z]\.?)*|M\.\s?[A-Za-z]{1,5}\.?|Dr|Drs|Dra|Ir|Hj|H)"
# gelar di belakang nama tanpa honorifik: 'Anwar Sahdi S.TP', 'Supandi, S.IP', 'Gurning, SH'
GELAR_BELAKANG = re.compile(r"(?<![\w.\[])((?:[A-Z][\w'’-]*\.?\s+){0,2}[A-Z][\w'’-]*)\s*,?\s*(?:S\.?\s?(?:Pd|TP|IP|Sos|T|H|Kom|E|Ag|P|Hut|Si|Sy|Farm|Kep)|SH|SKM|SE|ST|SP|MM|MT|MH|M\.?\s?(?:Si|Pd|M|T|H|Kes|AP))(?![A-Za-z])\.?")
P_TERSANGKA = re.compile(r"\b(tersangka|pelaku)\s*\((?![^()]*\[nama\])[^()]{1,60}\)", re.I)
P_BAPAK_SISA = re.compile(r"\b((?i:ibu|bapak|bpk))\.?\s+(\[nama\])\s+([A-Z][\w'’-]*)")
PERBAIKI_TOPONIM = ((re.compile(r"\b(G\.|Gn\.|Gunung) Ibu \[nama\]"), r"\1 Ibu"), (re.compile(r"\bdilaporkan \[nama\] Selatan\b"), "dilaporkan Nias Selatan"))
P_GELAR = re.compile(r"(?<=\[nama\])(?:\s*[,.]?\s*" + GELAR + r"(?![a-z]))+\.?")
P_SISA = re.compile(r"(?<=\[nama\])(\.?)\s+([A-Za-z][\w'’-]*)(?=\s*(?:[,.;:)|(]|$))")


def _nama_setelah(t, m, stop):
    """(awal, akhir, n): 1-3 kata berhuruf besar sesudah m.end(); kata pertama yang lolos stop(w) bukan nama dan menghentikan; kata lokasi menghentikan."""
    i = j = m.end()
    n = 0
    while n < 3:
        w = TOK.match(t, j)
        if not w or w.group(0).lower() in BUKAN_NAMA or (n == 0 and stop(w.group(0))) or (n > 0 and len(w.group(0)) == 1 and t[w.end():w.end() + 1] == "."):   # 'Budi S.Sos': S. = gelar
            break
        i2, n = w.end(), n + 1
        if len(w.group(0)) == 1 and t[i2:i2 + 1] == ".":     # inisial 'M. Ali'
            i2 += 1
        j = i2 + 1 if t[i2:i2 + 1] == " " else i2
        if j == i2:
            break
    return m.end(), (i2 if n else m.end()), n


def _ganti_nama(t, pola, stop):
    out, pos = [], 0
    for m in pola.finditer(t):
        if m.start() < pos:
            continue
        i, j, n = _nama_setelah(t, m, stop)
        if n:
            out.append(t[pos:i] + "[nama]")
            pos = j
    return "".join(out) + t[pos:]


def _usia(t):
    """usia/berusia NN -> [umur] hanya bila ada [nama] dalam 40 karakter atau kata orang tepat sebelumnya ('usia pohon/bangunan' tetap)."""
    def f(m):
        dekat = "[nama]" in t[max(0, m.start() - 40):m.start()] or "[nama]" in t[m.end():m.end() + 40]
        return "[umur]" if dekat or ORANG.search(t[max(0, m.start() - 25):m.start()]) else m.group(0)
    return P_USIA.sub(f, t)


def _gelar_belakang(m):
    toks = m.group(1).split()
    nama = []
    for w in reversed(toks):                       # ambil kata nama dari kanan selama bukan jabatan/instansi/kata umum
        w0 = w.rstrip(".")
        nama_besar = w0.isupper() and len(w0) >= 6 and w0.lower() not in STOP3     # 'ERWIANDI,S.Sos': nama huruf besar
        if (kata_umum(w0) and not nama_besar) or w0.lower() in BUKAN_NAMA | FUNGSI:
            break
        nama.insert(0, w)
    if not nama:
        return m.group(0)
    return " ".join(toks[: len(toks) - len(nama)] + ["[nama]"]).strip()


def _bapak_sisa(m):
    w = m.group(3)
    l = w.lower()
    if l in FUNGSI | BUKAN_NAMA | JABATAN or kata_umum(w) or (len(l) > 4 and l.startswith(AWALAN_KERJA)):
        return m.group(0)
    return f"{m.group(1)} [nama]"


def _paren_nama(m):
    toks = m.group(1).split()
    if any(w.lower() in SATUAN | NAMA_BILANGAN or kata_umum(w) for w in toks):
        return m.group(0)
    return "[nama]"


MARGA = {"tambunan", "tendean", "toruan", "simanjuntak", "siregar", "nasution", "harahap", "hutabarat", "hutagalung", "hutapea", "hutasoit", "lubis", "pohan", "pane", "panggabean",
         "sihombing", "sitompul", "situmorang", "silalahi", "sinaga", "saragih", "purba", "damanik", "manurung", "napitupulu", "simatupang", "marpaung", "siahaan", "sembiring", "ginting",
         "tarigan", "perangin-angin", "sebayang", "pardede", "aritonang", "gultom", "matondang", "rambe", "lumbantobing", "tobing", "tampubolon", "nainggolan", "sirait", "manalu", "sagala",
         "sitorus", "butar-butar", "wowor", "mamahit", "mandagi", "rumengan", "tulung", "lumentut", "pangemanan", "mokodongan", "tumbel", "kawulur", "lasut", "pesik", "polii", "sumual",
         "tangkudung", "wenas", "worang", "rondonuwu", "pangkey", "lengkong", "lolong", "kaunang", "kalalo", "sondakh", "mamuaya", "tumewu", "marbun", "lumbangaol", "simbolon", "sidabutar"}


def _sisa(m):
    """satu kata sisa tepat sesudah [nama] dan sebelum tanda baca/akhir: marga berhuruf kecil ('tambunan', daftar MARGA) atau kata berhuruf besar yang bukan fungsi/kata umum."""
    w = m.group(2)
    l = w.lower()
    if l in MARGA or (w[0].isupper() and l not in FUNGSI | PREDIKAT and not kata_umum(w)):
        return m.group(1)
    return m.group(0)


def samar(teks, maks):
    """satu baris; nama orang (honorifik, penanda, milik/oleh, nama sebelum umur/(NN)), umur, RT/RW, telepon/surel disamarkan; dusun ikut dibuang bila ada nama/umur; dipotong di maks."""
    t = " ".join(str(teks or "").split())
    for pola, ganti in PERBAIKI_TOPONIM:             # [nama] palsu dari penyamaran lama di arsip ('G. Ibu [nama]', 'dilaporkan [nama] Selatan')
        t = pola.sub(ganti, t)
    tp = []
    t = TOPONIM.sub(lambda m: tp.append(m.group(0)) or "\x01%s\x01" % chr(96 + len(tp)), t)   # nama gunung/kabupaten yang mirip honorifik
    t = P_RTRW.sub("[rt/rw]", P_TELP.sub("[no]", t))
    t = _ganti_nama(t, P_HONOR, lambda w: w.lower() in JABATAN)
    t = _ganti_nama(t, P_PENANDA, lambda w: False)
    t = _ganti_nama(t, P_PEMILIK, lambda w: kata_umum(w) or w.lower() in HONOR_KECIL)
    t = GELAR_BELAKANG.sub(_gelar_belakang, t)
    t = P_TERSANGKA.sub(lambda m: f"{m.group(1)} ([nama])", t)
    t = P_UMUR.sub("[umur]", t)
    t = P_NAMA_UMUR.sub("[nama] ", t)
    # sisa umur/nama sesudah [nama]
    t = P_NAMA_KURUNG.sub(lambda m: "[nama]" if UMUR_DALAM_KURUNG.match(m.group(1)) else m.group(0), t)
    t = P_NAMA_UMUR_BARE.sub(r"\1", t)
    t = _usia(t)
    t = P_NAMA_PAREN.sub(_paren_nama, t)
    t = P_GELAR.sub("", t)
    t = P_SISA.sub(_sisa, t)
    t = P_PANGGIL.sub("", t)
    t = re.sub(r"(\[nama\][\s,.]*){2,}", lambda m: "[nama]" + ("." if "." in m.group(0) else "") + " ", t)
    t = " ".join(t.split())
    for _ in range(2):                               # 'Bapak [nama] Cobek Beti': sisa nama dibuang satu kata per putaran
        t = P_BAPAK_SISA.sub(_bapak_sisa, t)
    if "[nama]" in t or "[umur]" in t:
        t = P_DUSUN.sub("[dusun]", t)
    t = re.sub("\x01(.)\x01", lambda m: tp[ord(m.group(1)) - 97], t)
    if len(t) <= maks:
        return t
    cut = t[:maks - 1]
    if t[maks - 1] != " " and " " in cut:    # jangan memotong di tengah kata ('Pak Cam' dari 'Pak Camat')
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip() + "…"


# pemeriksa kebocoran, terpisah dari penyamar (dipakai uji dan main atas keluaran jadi)
BOCOR = {
    "umur": re.compile(r"\(\s*\d{1,3}\s*(?:th|thn|tahun)\s*\)|\b\d{1,3}\s*(?:th|thn)\b|\b(?:berumur|umur(?:nya)?)\s*:?\s*\d", re.I),
    "umur_dekat_nama": re.compile(r"\[nama\][^|.]{0,15}\d{1,2}\s*(?:tahun|th)", re.I),
    "rt_rw": re.compile(r"\bR[TW]\s*[./]?\s*\d", re.I),
    "telp": re.compile(r"\+?\d[\d\s().-]{7,}\d|[\w.+-]+@[\w-]+\.[\w.]+"),
    "penanda": re.compile(r"\b(?:a\.\s?n\.?|a/n|atas nama|aas nama|bernama|berinisial)\s*(?!\[)[A-Z]", re.I),
}
BOCOR_HONOR = re.compile(r"\b(?:(?i:%s)|%s)\b\.?\s*(?!\[)([A-Z][\w'’-]*)" % (HONOR_PANJANG, HONOR_PENDEK))
BOCOR_NAMA_PAREN = re.compile(r"\b((?:[A-Z][a-z]{3,}\s+)?[A-Z][a-z]{3,})\s*\(\d{2}\)")
BOCOR_PEMILIK = re.compile(r"\b(?i:milik|oleh|tungku|jenazah)\s+([A-Z][a-z]{3,})")
BOCOR_GELAR = re.compile(r"\b[A-Z][a-z]{3,}\s*,?\s*(?:S\.\s?(?:Pd|TP|IP|Sos|T|H|Kom|E|Ag|Si)|SH|SKM|M\.\s?(?:Si|Pd)|MM)\b")
BOCOR_TERSANGKA = re.compile(r"\b(?i:tersangka|pelaku)\s*\((?!\[nama\])")
BOCOR_TOPONIM = re.compile(r"(?:G\.|Gn\.|Gunung) Ibu \[nama\]|dilaporkan \[nama\] Selatan")


def cek_bocor(teks):
    """-> daftar (jenis, cuplikan) pola nama/umur/RT-RW/telepon yang lolos; jabatan dan kata umum (STOP3) dibolehkan."""
    hit = [("toponim_rusak", m.group(0)) for m in BOCOR_TOPONIM.finditer(teks)]
    teks = TOPONIM.sub("[toponim]", teks)
    hit += [(k, m.group(0)) for k, r in BOCOR.items() for m in r.finditer(teks)]
    hit += [("honorifik", m.group(0)) for m in BOCOR_HONOR.finditer(teks) if m.group(1).lower() not in JABATAN | BUKAN_NAMA]
    hit += [("nama_kurung_umur", m.group(0)) for m in BOCOR_NAMA_PAREN.finditer(teks)
            if not any(w.lower() in SATUAN | NAMA_BILANGAN or kata_umum(w) for w in m.group(1).split())]
    hit += [("gelar", m.group(0)) for m in BOCOR_GELAR.finditer(teks) if not kata_umum(m.group(0).split()[0].rstrip(","))]
    hit += [("tersangka", m.group(0)) for m in BOCOR_TERSANGKA.finditer(teks)]
    hit += [("bapak_sisa", m.group(0)) for m in P_BAPAK_SISA.finditer(teks) if _bapak_sisa(m) != m.group(0)]
    hit += [("milik_oleh_nama", m.group(0)) for m in BOCOR_PEMILIK.finditer(teks) if not (kata_umum(m.group(1)) or m.group(1).lower() in HONOR_KECIL)]
    return hit


def mulai_tgl(k):
    """tanggal mulai kejadian: tgl_kejadian bila sah dan <= MAKS_JEDA hari dari catatan pertama, selain itu pertama_dicatat; None bila tak ada."""
    sel = hari_antara(k.get("tgl_kejadian"), k.get("pertama_dicatat"))
    t = k.get("tgl_kejadian") if sel is not None and abs(sel) <= MAKS_JEDA else k.get("pertama_dicatat")
    return t if hari_antara(t, t) == 0 else None


def acara(kejadian, kode_kab):
    """-> {id: {id, jenis, mulai, kabs, prov, k}} untuk kejadian bertanggal dan ber-kab."""
    out = {}
    for k in kejadian:
        kabs, m = kode_kab(k), mulai_tgl(k)
        if kabs and m:
            out[k["id_kejadian"]] = {"id": k["id_kejadian"], "jenis": k["jenis"], "mulai": m, "kabs": kabs,
                                     "prov": sorted({kb.split("|")[0] for kb in kabs}), "k": k}
    return out


def lengkapi_acara(ev, baris_iter, T):
    """isi ev[id] dari baris harian: tgl_selesai, hari_selesai, kategori kebutuhan/bantuan/alat/pihak, teks upaya. T = modul logbook_turunan."""
    ac = {i: {"selesai": None, "keb": set(), "bantu": set(), "alat": set(), "pihak": set(), "upaya": []} for i in ev}
    for b in baris_iter:
        a = ac.get(b.get("id_kejadian"))
        if a is None:
            continue
        tgl = b.get("tgl_logbook")
        if hari_antara(tgl, tgl) == 0 and selesai_ya(b.get("kondisi")) and (a["selesai"] is None or tgl < a["selesai"]):
            a["selesai"] = tgl
        a["keb"] |= T.kategori(b.get("kebutuhan"), T.RE_KEB)
        a["bantu"] |= T.kategori(b.get("upaya"), T.RE_KEB)
        a["alat"] |= T.kategori(T.potong_alat(b.get("peralatan")), T.RE_ALAT) | T.kategori(b.get("upaya"), T.RE_ALAT)
        a["pihak"] |= T.kategori(b.get("terlibat"), T.RE_PIHAK)
        u = " ".join(str(b.get("upaya") or "").split())
        if u and u not in a["upaya"]:
            a["upaya"].append(u)
    for i, e in ev.items():
        a = ac[i]
        d = hari_antara(e["mulai"], a["selesai"])
        e["hari_selesai"] = None if d is None or d > MAKS_JEDA else max(d, 0)
        e["a"] = a
    return ev


LAYAK_N_SELESAI, LAYAK_TAK_SELESAI = 30, 90


def stat_tangani(hari):
    """hari = daftar hari_selesai (None = tak pernah dilaporkan selesai). median/p75 hanya dari yang dilaporkan selesai: batas bawah yang bias."""
    ok = [h for h in hari if h is not None]
    n = len(hari)
    tak = round(100 * (n - len(ok)) / n, 1)
    return {"n": n, "n_selesai": len(ok), "n_tak_selesai": n - len(ok), "median_dilaporkan": kuantil(ok, .5), "p75_dilaporkan": kuantil(ok, .75),
            "tak_selesai_pct": tak, "layak_median": len(ok) >= LAYAK_N_SELESAI and tak <= LAYAK_TAK_SELESAI}


def susun_serupa(ev, tahun_dasar):
    """-> {kode_prov2: {kab: {jenis: {n_total, kejadian[...]}}}}; terbaru dulu, paling banyak MAKS_SERUPA per kab x jenis."""
    per = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))
    for e in ev.values():
        k, a = e["k"], e["a"]
        kron = k.get("kronologi")
        rec = {"id": e["id"], "mulai": e["mulai"], "dasar": e["mulai"][:4] in tahun_dasar,
               "hari_dilaporkan": k.get("hari_dilaporkan"), "hari_selesai": e["hari_selesai"],
               "kebutuhan": sorted(a["keb"]), "bantuan": sorted(a["bantu"]), "alat": sorted(a["alat"]), "pihak": sorted(a["pihak"]),
               "kronologi": samar(kron, 240), "upaya": samar(" | ".join(a["upaya"][:3]), 240), "kondisi_terakhir": samar(k.get("kondisi_terakhir"), 160)}
        for kb in e["kabs"]:
            per[kb.split("|")[0]][kb][e["jenis"]].append(rec)
    out = {}
    for p, kabs in per.items():
        out[p] = {kb: {j: {"n_total": len(r), "kejadian": sorted(r, key=lambda x: (x["mulai"], x["id"]), reverse=True)[:MAKS_SERUPA]}
                       for j, r in sorted(js.items())} for kb, js in sorted(kabs.items())}
    return out


def susun_penanganan(ev, tahun_dasar):
    """lama penanganan (mulai -> entri kondisi pertama yang menyebut selesai), tahun dasar saja; sel n < MIN_N_TANGANI dibuang."""
    nas, prov, kab = (collections.defaultdict(list) for _ in range(3))
    for e in ev.values():
        if e["mulai"][:4] not in tahun_dasar:
            continue
        h = e["hari_selesai"]
        nas[e["jenis"]].append(h)
        for p in e["prov"]:
            prov[(p, e["jenis"])].append(h)
        for kb in e["kabs"]:
            kab[(kb, e["jenis"])].append(h)
    res = {"nasional": {}, "prov": {}, "kab": {}}
    for tk, d in (("nasional", {(None, j): v for j, v in nas.items()}), ("prov", prov), ("kab", kab)):
        for (kk, j), v in sorted(d.items(), key=lambda x: (str(x[0][0]), x[0][1])):
            if len(v) >= MIN_N_TANGANI:
                (res[tk].setdefault(j, stat_tangani(v)) if tk == "nasional" else res[tk].setdefault(kk, {}).__setitem__(j, stat_tangani(v)))
    return res


def uji():
    kode = lambda k: [f"{p}|{n}" for p, n in zip(k["prov_kode"], k["kabkota"])]
    kj = [
        {"id_kejadian": "A", "jenis": "banjir", "tgl_kejadian": "2024-01-01", "pertama_dicatat": "2024-01-03", "terakhir_dicatat": "2024-01-07",
         "n_laporan": 3, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"]},
        {"id_kejadian": "B", "jenis": "banjir", "tgl_kejadian": "2024-02-01", "pertama_dicatat": "2024-02-01", "terakhir_dicatat": "2024-02-01",
         "n_laporan": 1, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"]},
        {"id_kejadian": "C", "jenis": "longsor", "tgl_kejadian": "", "pertama_dicatat": "2025-03-01", "terakhir_dicatat": "2025-03-01",
         "n_laporan": 1, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"]},
        {"id_kejadian": "D", "jenis": "banjir", "tgl_kejadian": "2023-01-01", "pertama_dicatat": "2025-01-05", "terakhir_dicatat": "2025-01-05",
         "n_laporan": 1, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"]},
    ]
    br = [
        {"id_kejadian": "A", "kecamatan": ["K"], "desa": [], "kondisi": "ok", "upaya": "Perlu normalisasi sungai dan tanggul.", "kebutuhan": "", "kendala": "", "rekomendasi": ""},
        {"id_kejadian": "B", "kecamatan": [], "desa": ["D"], "kondisi": "", "upaya": "x", "kebutuhan": "tenda", "kendala": "", "rekomendasi": "Agar dibangun tanggul"},
        {"id_kejadian": "C", "kecamatan": ["K"], "desa": [], "kondisi": "", "upaya": "", "kebutuhan": "", "kendala": "", "rekomendasi": "sosialisasi dan EWS"},
    ]
    rp, rk = bangun(iter(kj), iter(br), kode, {"2024"})
    c = rp["kab"]["11|Kab. X"]
    assert c["dasar"]["n"] == 2 and c["2024"]["n"] == 2 and c["2025"]["n"] == 2 and "2026" not in c
    assert c["2024"]["jeda_hari"] == {"n": 2, "median": 1.0, "p75": 1.5}, c["2024"]["jeda_hari"]
    assert c["2025"]["jeda_hari"]["n"] == 0 and c["2025"]["jeda_hari"]["median"] is None   # C kosong, D 734 hari dibuang
    assert c["2024"]["lama_pantau_hari"]["median"] == 2.0 and c["2024"]["sekali_pct"] == 50.0
    assert c["2024"]["entri"] == 2 and c["2024"]["lengkap_pct"]["kecamatan"] == 50.0 and c["2024"]["lengkap_pct"]["kebutuhan"] == 50.0
    t = rk["kab"]["11|Kab. X"]
    assert t["normalisasi_sungai"]["n_kejadian"] == 1 and t["tanggul"]["n_kejadian"] == 2   # A lewat kalimat, B lewat kolom
    assert set(t["sosialisasi"]["jenis"]) == {"longsor"} and t["peringatan_dini"]["tahun"] == ["2025"]
    assert not t["tanggul"]["berulang"]
    assert tahun_kejadian(kj[3]) == "2025" and tahun_kejadian(kj[2]) == "2025"
    assert kuantil([1, 2, 3, 4], .75) == 3.25
    # serupa + penanganan
    assert selesai_ya("Api sudah padam") and selesai_ya("Banjir telah surut") and not selesai_ya("Api belum padam") and not selesai_ya("banjir berangsur surut")
    assert not selesai_ya("") and not selesai_ya(None) and selesai_ya("masih hujan. Genangan sudah surut")
    assert samar("Menurut Bapak Slamet Riyadi, hubungi 0812-3456-7890", 240) == "Menurut Bapak [nama], hubungi [no]"
    # samar: tiap pola
    S = lambda x: samar(x, 400)
    assert S("Bpk. Sekda dan Bpk. Kalaksa BPBD hadir") == "Bpk. Sekda dan Bpk. Kalaksa BPBD hadir"                       # jabatan utuh
    assert S("Ibu. Suci roboh, Nenek Karyatun dan Asmanah") == "Ibu. [nama] roboh, Nenek [nama] dan Asmanah"
    assert S("Hj. Amelia Rika anggota DPRD") == "Hj. [nama] anggota DPRD" and S("Tn. Budi, Ny. Sari, Nn. Ani") == "Tn. [nama], Ny. [nama], Nn. [nama]"
    assert S("a.n. Joko Susilo dibawa; atas nama Dewi; aas nama Rina; bernama Agus Salim Putra Wijaya") == "a.n. [nama] dibawa; atas nama [nama]; aas nama [nama]; bernama [nama]", S("a.n. Joko Susilo dibawa; atas nama Dewi; aas nama Rina; bernama Agus Salim Putra Wijaya")
    assert S("korban bernama Rahmat Hidayat meninggal") == "korban bernama [nama] meninggal" and S("korban Luka-Luka dievakuasi") == "korban Luka-Luka dievakuasi"
    assert S("Sdr. Budi Santoso (45th) di Desa Maju") == "Sdr. [nama] [umur] di Desa Maju"
    assert S("Agus Setiawan (45 tahun) dan anak 5 thn, berumur 30 tahun, umurnya 12") == "[nama] [umur] dan anak [umur], [umur], [umur]"
    assert S("selama 3 tahun terakhir dan 25 tahun lalu") == "selama 3 tahun terakhir dan 25 tahun lalu"                # durasi bukan umur
    assert S("Pak Joko (Cak Jok) hadir") == "Pak [nama] hadir"
    assert S("RT.002/RW.004, RT 02 RW 05, RT/02 RW/09, RT/RW 01/02") == "[rt/rw], [rt/rw], [rt/rw], [rt/rw]", S("RT.002/RW.004, RT 02 RW 05, RT/02 RW/09, RT/RW 01/02")
    assert S("Dusun Kaulon, Desa Maju") == "Dusun Kaulon, Desa Maju" and S("Bapak Slamet di Dusun Kaulon Desa Maju") == "Bapak [nama] di [dusun] Desa Maju"
    # putaran 2: umur dekat nama, Nama (NN), milik/oleh, sisa marga/gelar, toponim
    assert S("atas nama Sutrisno (±70 Tahun) dan korban Sdr. Budi, (P) 36 tahun, meninggal") == "atas nama [nama] dan korban Sdr. [nama], meninggal"
    assert S("yang bernama Joko usia 48 tahun adanya api") == "yang bernama [nama] [umur] adanya api"
    assert S("korban an. Wati(19) mengalami luka; Seorang ibu Rina (35) dan anaknya Ani (10) ditemukan") == "korban an. [nama] mengalami luka; Seorang ibu [nama] dan anaknya [nama] ditemukan", S("korban an. Wati(19) mengalami luka; Seorang ibu Rina (35) dan anaknya Ani (10) ditemukan")
    assert S("pohon berusia 100 tahun tumbang; usia bangunan sudah tua") == "pohon berusia 100 tahun tumbang; usia bangunan sudah tua"
    assert S("milik Juliansyah (25). di Kp. Tebuk") == "milik [nama]. di [dusun]" and S("oleh Sanudin (40), seorang petani") == "oleh [nama], seorang petani"
    assert S("Baddu Koi (70) dan Delapan Belas (18) personil, Lima Belas (15) anggota") == "[nama] dan Delapan Belas (18) personil, Lima Belas (15) anggota"
    assert S("rumah milik Hendra Gunawan dibantu oleh BPBD, Tim TRC, Damkar, PT Astra, Polsek, warga") == "rumah milik [nama] dibantu oleh BPBD, Tim TRC, Damkar, PT Astra, Polsek, warga"
    assert S("anak dari Pak Anwar, istri dari Sutarmi, saksi Rahmat melihat api") == "anak dari Pak [nama], istri dari [nama], saksi [nama] melihat api", S("anak dari Pak Anwar, istri dari Sutarmi, saksi Rahmat melihat api")
    assert "Anwar" not in S("anak dari Pak Anwar, istri dari Sutarmi, saksi Rahmat melihat api") and "Rahmat" not in S("saksi Rahmat melihat api") and "Sutarmi" not in S("istri dari Sutarmi")
    assert S("bapak Sahat tambunan, ibu Bela tendean. Sdr. Rudi toruan; Alm. Budi. Yakob (Didik)") == "bapak [nama], ibu [nama]. Sdr. [nama]; Alm. [nama]", S("bapak Sahat tambunan, ibu Bela tendean. Sdr. Rudi toruan; Alm. Budi. Yakob (Didik)")
    assert S("Sdr. Budi S.Sos,M.Si dan Bpk. Ali, S.T. hadir") == "Sdr. [nama] dan Bpk. [nama] hadir"
    assert S("Bpk. Hasan melapor dan Ibu Sari roboh") == "Bpk. [nama] melapor dan Ibu [nama] roboh"
    assert S("erupsi G. Ibu status Level II dan Gunung Ibu; Kab. Pakpak Bharat") == "erupsi G. Ibu status Level II dan Gunung Ibu; Kab. Pakpak Bharat"
    assert S("dilaporkan oleh Nias Selatan bahwa") == "dilaporkan oleh Nias Selatan bahwa"
    assert S("Kab. Nias Selatan, Bpk. Camat hadir") == "Kab. Nias Selatan, Bpk. Camat hadir"
    assert S("api padam oleh Damkar, bantuan dari Pemkab; korban Luka-Luka dan korban Meninggal Dunia") == "api padam oleh Damkar, bantuan dari Pemkab; korban Luka-Luka dan korban Meninggal Dunia"
    for bocor in ("atas nama [nama] 70 tahun", "Juliansyah (25)", "milik Sanudin ya", "Bapak Slamet"):
        assert cek_bocor(bocor), bocor
    assert not cek_bocor("Delapan Belas (18) milik BPBD oleh Damkar Bpk. Camat")
    assert cek_bocor("[nama] dan 70 tahun lalu")                     # pemeriksa sengaja ketat: sisa seperti ini harus dilihat manusia
    # putaran 3: gelar di belakang nama, tungku/jenazah, tersangka, sisa sesudah 'ibu [nama]', toponim rusak
    assert S("dipimpin Anwar Sahdi S.TP dan Supandi, S.IP; Wahyu Bestari, SH; Picaulima, S.Sos; Edijaswin SKM; Bpk. Ali, M.Si") == "dipimpin [nama] dan [nama]; [nama]; [nama]; [nama]; Bpk. [nama]", S("dipimpin Anwar Sahdi S.TP dan Supandi, S.IP; Wahyu Bestari, SH; Picaulima, S.Sos; Edijaswin SKM; Bpk. Ali, M.Si")
    assert S("Kepala BPBD Agus Salim, S.Sos hadir") == "Kepala BPBD [nama] hadir"
    assert S("rumah milik M. Ali, tungku Suratmi, Jenazah Hilman dievakuasi; Jenazah dibawa; oleh BPBD") == "rumah milik [nama], tungku [nama], Jenazah [nama] dievakuasi; Jenazah dibawa; oleh BPBD"
    assert S("tersangka (Budi Santoso) dan pelaku (anak 15 th)") == "tersangka ([nama]) dan pelaku ([nama])"
    assert S("ibu Siti Raya melakukan; Bapak Wati Cobek Beti") == "ibu [nama] melakukan; Bapak [nama]"
    assert S("Erupsi Gunung Ibu [nama] tinggi; G. Ibu [nama] berada; dilaporkan [nama] Selatan bahwa") == "Erupsi Gunung Ibu tinggi; G. Ibu berada; dilaporkan Nias Selatan bahwa"
    assert S("dipimpin ERWIANDI,S.Sos,M.Si telah") == "dipimpin [nama] telah", S("dipimpin ERWIANDI,S.Sos,M.Si telah")
    for bocor in ("Supandi, S.IP", "tersangka (Budi)", "Gunung Ibu [nama]", "tungku Suratmi", "dilaporkan [nama] Selatan"):
        assert cek_bocor(bocor), bocor
    assert not cek_bocor(S("Ibu Siti (60 th) RT 03 RW 02 Dusun Aman, hubungi 081234567890 a.n. Joko")) and cek_bocor("Bapak Slamet (45 th)")
    assert not cek_bocor("Bpk. Kalaksa BPBD, Bpk Danramil") and any(k == "rt_rw" for k, _ in cek_bocor("RT 02"))
    assert len(samar("x" * 300, 240)) == 240 and samar("a\n b", 9) == "a b"
    T = importlib.import_module("logbook_turunan")
    kj2 = [{"id_kejadian": f"E{i}", "jenis": "banjir", "tgl_kejadian": f"2024-0{i}-01", "pertama_dicatat": f"2024-0{i}-01", "terakhir_dicatat": f"2024-0{i}-05",
            "n_laporan": 2, "hari_dilaporkan": 2, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"],
            "kronologi": "Banjir di desa.", "kondisi_terakhir": "ok"} for i in range(1, 7)]
    br2 = []
    for i in range(1, 7):                       # E1..E5 selesai pada hari ke-i-1 .. ; E6 tidak pernah
        br2.append({"id_kejadian": f"E{i}", "tgl_logbook": f"2024-0{i}-01", "kondisi": "masih tergenang", "upaya": "Bagi makanan siap saji", "kebutuhan": "tenda", "peralatan": "perahu karet", "terlibat": "BPBD"})
        if i < 6:
            br2.append({"id_kejadian": f"E{i}", "tgl_logbook": f"2024-0{i}-0{i + 1}", "kondisi": "banjir sudah surut", "upaya": "", "kebutuhan": "", "peralatan": "", "terlibat": ""})
    ev = lengkapi_acara(acara(iter(kj2), kode), iter(br2), T)
    assert [ev[f"E{i}"]["hari_selesai"] for i in range(1, 7)] == [1, 2, 3, 4, 5, None], ev["E1"]["hari_selesai"]
    sp = susun_serupa(ev, {"2024"})["11"]["11|Kab. X"]["banjir"]
    assert sp["n_total"] == 6 and sp["kejadian"][0]["id"] == "E6" and sp["kejadian"][0]["dasar"] and sp["kejadian"][5]["kebutuhan"] == ["tenda_terpal"]
    assert sp["kejadian"][0]["alat"] == ["perahu"] and sp["kejadian"][0]["bantuan"] == ["makanan"] and sp["kejadian"][0]["pihak"] == ["BPBD"]
    pn = susun_penanganan(ev, {"2024"})
    assert pn["nasional"]["banjir"] == {"n": 6, "n_selesai": 5, "n_tak_selesai": 1, "median_dilaporkan": 3.0, "p75_dilaporkan": 4.0, "tak_selesai_pct": 16.7, "layak_median": False}, pn["nasional"]
    assert pn["kab"]["11|Kab. X"]["banjir"]["n"] == 6 and pn["prov"]["11"]["banjir"]["n"] == 6
    assert susun_penanganan(ev, {"2030"}) == {"nasional": {}, "prov": {}, "kab": {}}   # di luar tahun dasar
    print("uji logbook_internal: OK")


def main():
    kode = muat_kode_kab()
    dasar = set(json.load(open(RIWAYAT, encoding="utf-8"))["tahun_penuh"])
    rapor, rekom = bangun(baca("kejadian"), baca("baris"), kode, dasar)
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    os.makedirs(KELUAR, exist_ok=True)
    rapor_out = {
        "dibuat": now, "min_n": MIN_N,
        "periode": {"dasar": sorted(dasar), "terpisah": list(PERIODE_TERPISAH)},
        "catatan": [
            "Logbook mencatat waktu MASUK ke Pusdalops, bukan waktu BPBD tahu. Jeda bisa karena jalur pelaporan, bukan kinerja BPBD.",
            "Jangan dibaca sebagai peringkat tanpa konteks. Sembunyikan sel dengan n < min_n.",
            "Staf saja. Tahun 2011-2013 dan 2022-2023 tidak lengkap; 2026 berjalan (kejadian terbaru belum sempat dilaporkan ulang, sekali_pct condong tinggi).",
            "Isian kebutuhan, kendala, dan kondisi baru lazim terisi pada format logbook terbaru; angka tahun dasar lama rendah karena formatnya, bukan kelalaian.",
        ],
        "definisi": {
            "jeda_hari": f"tgl_logbook pertama kejadian dikurangi tgl_kejadian, dalam HARI penuh (0 = dicatat hari yang sama). Dibuang: tgl_kejadian kosong/bukan tanggal, negatif, atau > {MAKS_JEDA} hari (salah ketik tahun). n = yang tersisa.",
            "jeda_jam": "tidak tersedia: entri pertama logbook tidak membawa jam laporan (jam_update hanya ada pada entri update), jadi jeda jam tidak dihitung.",
            "lama_pantau_hari": "terakhir_dicatat dikurangi pertama_dicatat, hari; 0 bila hanya satu hari.",
            "sekali_pct": "persen kejadian dengan n_laporan = 1 (muncul di satu entri logbook saja).",
            "lengkap_pct": "persen ENTRI (baris logbook, termasuk update) yang kolomnya terisi; penyebut = entri.",
            "periode": "dasar = tahun_penuh logbook_riwayat.json; 2024/2025/2026 = per tahun kejadian (tahun catatan pertama bila tgl_kejadian salah). Satu kejadian lintas kab dihitung di tiap kab; di prov, sekali per prov.",
        },
        **rapor,
    }
    rekom_out = {
        "dibuat": now, "berulang_bila_tahun_ge": BERULANG_TAHUN,
        "catatan": [
            "Tanpa teks asli: hanya topik kata kunci. Satu kejadian dihitung sekali per topik, satu kejadian bisa bertopik banyak.",
            "Kolom rekomendasi terisi jarang sebelum 2024 (di bawah 3% entri); bila kosong dipakai kalimat berawalan perlu/agar/diharapkan di kolom upaya dan kondisi (lihat jalur_n_kejadian). Jalur kalimat lebih berisik.",
            "Topik kata kunci kasar (regex), bukan klasifikasi makna; 'berulang' = muncul di >= 3 tahun berbeda.",
            "Tahun 2011-2013 dan 2022-2023 tidak lengkap, jadi 'berulang' bisa terpotong.",
        ],
        "topik": {k: v for k, v in TOPIK.items()}, **rekom,
    }
    T = importlib.import_module("logbook_turunan")
    ev = lengkapi_acara(acara(baca("kejadian"), kode), baca("baris"), T)
    ser = susun_serupa(ev, dasar)
    pn = susun_penanganan(ev, dasar)
    pn_out = {
        "dibuat": now, "min_n": MIN_N_TANGANI, "tahun_dasar": sorted(dasar),
        "catatan": [
            "Rapor lama penanganan, staf saja. Lama = hari dari mulai kejadian sampai entri logbook PERTAMA yang kolom kondisinya menyebut padam/surut/selesai/tertangani/teratasi/tuntas tanpa penyangkal (belum, masih, berangsur, sebagian...).",
            "Yang terukur adalah kapan Pusdalops MENCATAT selesai, bukan kapan benar-benar selesai. Kejadian yang berhenti dilaporkan sebelum kata itu muncul masuk tak_selesai_pct, jadi persen itu campuran 'belum selesai' dan 'tak dilaporkan lagi'.",
            "median_dilaporkan dan p75_dilaporkan hanya menghitung kejadian yang dilaporkan surut/padam (n_selesai): batas bawah yang bias, BUKAN lama penanganan sebenarnya; kejadian yang tak pernah dilaporkan selesai tidak ikut dan pasti lebih lama atau tak diketahui.",
            "layak_median = n_selesai >= %d dan tak_selesai_pct <= %d. Bila false, layar jangan menampilkan median (hanya n, n_tak_selesai, tak_selesai_pct). Kebanyakan jenis dan kab false karena kolom kondisi jarang menyebut selesai." % (LAYAK_N_SELESAI, LAYAK_TAK_SELESAI),
            "Sel dengan n < min_n tidak dimuat. Tahun dasar saja. Tidak ada angka korban atau rumah rusak.",
        ],
        **pn,
    }
    ser_catatan = ["Kejadian lampau di kab dan jenis yang sama, terbaru dulu (paling banyak %d per kab x jenis; n_total = semua). dasar=true bila tahun mulai termasuk tahun dasar." % MAKS_SERUPA,
                   "Teks pendek dipotong dan disamarkan (nama setelah Bapak/Ibu/Sdr, nomor telepon). Hanya untuk staf; jangan diterbitkan.",
                   "hari_selesai: lihat penanganan.json. kebutuhan/bantuan/alat/pihak = kategori kata kunci logbook_turunan (bantuan = kategori kebutuhan yang disebut di kolom upaya).",
                   "Tanpa angka korban dan rumah rusak."]
    os.makedirs(KELUAR, exist_ok=True)
    for f in glob.glob(os.path.join(KELUAR, "serupa_*.json")):
        os.remove(f)
    tulis = [(n, d) for n, d in (("rapor_bpbd", rapor_out), ("rekomendasi", rekom_out), ("penanganan", pn_out))]
    tulis += [(f"serupa_{p}", {"dibuat": now, "prov": p, "tahun_dasar": sorted(dasar), "catatan": ser_catatan, "kab": kabs}) for p, kabs in sorted(ser.items())]
    bocor = collections.Counter()
    for nama, d in tulis:
        p = os.path.join(KELUAR, nama + ".json")
        with open(p, "w", encoding="utf-8") as h:
            json.dump(d, h, ensure_ascii=False, separators=(",", ":"))
        if nama.startswith("serupa_"):
            for kabd in d["kab"].values():
                for jd in kabd.values():
                    for r in jd["kejadian"]:
                        for k, c in cek_bocor(" | ".join((r["kronologi"], r["upaya"], r["kondisi_terakhir"]))):
                            bocor[k] += 1
                            print("  bocor", k, repr(c))
        print(f"{os.path.relpath(p, AKAR)}: {os.path.getsize(p) / 1024:.0f} KB")
    print("kebocoran di serupa_*.json (nama/umur/RT-RW/telepon):", dict(bocor) or 0)
    assert not bocor, f"penyamaran bocor: {dict(bocor)}"


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
