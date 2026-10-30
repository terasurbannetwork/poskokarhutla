"""Logbook Laporan Harian Dit. Koordalops/Pusdalops BNPB (DOCX harian di Google Drive publik) -> public/data/logbook_kejadian.json

Sumber: folder Drive publik milik Pusdalops BNPB (satu subfolder per bulan, satu DOCX per hari, laporan 07.00-07.00 WIB).
Daftar berkas dibaca lewat drive.google.com/embeddedfolderview (tanpa API, tanpa kunci); DOCX diunduh sekali, diubah ke
teks data/raw/logbook/<id>.txt (tak dilacak git, cache CI), lalu DOCX dibuang; jalan ulang cuma mengunduh hari baru.

Tiap laporan memuat blok per kejadian dengan kepala "<Jenis> di Kab./Kota X, Provinsi Y" lalu Kronologis, Lokasi
(Kec./Ds.), Korban Jiwa, Kerugian Materiil, Upaya, Kondisi Mutakhir. Satu kejadian ditulis ulang tiap hari selama masih
ditangani, jadi entri harian digabung jadi satu kejadian per (kelompok jenis, kab, tanggal mulai), dengan:
  mulai       tanggal pertama di Kronologis (bila tak ada: hari laporan pertama)
  terlihat    hari laporan pertama .. terakhir
  surut       hari laporan pertama yang Kondisi Mutakhir-nya menyebut surut/padam/selesai/tertangani 100%
  durasi_hari surut - mulai (None bila belum pernah surut di logbook)
  tma_cm      [min, maks] ketinggian air yang disebut (TMA/ketinggian air/setinggi ... cm|meter), maks lintas hari
  dampak      maks lintas hari: meninggal, hilang, luka, mengungsi (jiwa), kk, jiwa (terdampak), rumah, ha
  kec         nama kecamatan yang disebut di Lokasi
Nama pelapor (baris "Sumber:"), nomor telepon, dan tautan TIDAK disimpan: repo publik.

Pakai:  python3 scripts/umum/logbook_bnpb.py          ambil hari baru + urai semua
        python3 scripts/umum/logbook_bnpb.py urai     urai cache saja (luring)
        python3 scripts/umum/logbook_bnpb.py uji      swauji luring dengan teks mainan
"""
import datetime as dt, html, json, os, re, sys, unicodedata, urllib.request, zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/logbook_kejadian.json")
MENTAH = os.path.join(AKAR, "data/raw/logbook")
FOLDER = "1Pk4w59mgTrh20TAeCr-20aZEaiM5YJ1v"   # "Laporan Harian" Pusdalops BNPB, dibagikan publik lewat tautan
WIB = dt.timezone(dt.timedelta(hours=7))
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
BULAN = {b: i + 1 for i, b in enumerate("januari februari maret april mei juni juli agustus september oktober november desember".split())}

# kelompok jenis (urutan penting: yang lebih khusus dulu)
JENIS = [("banjir_longsor", r"banjir (?:bandang )?dan (?:tanah )?longsor"), ("banjir_bandang", r"banjir bandang"),
         ("rob", r"banjir rob|rob\b"), ("banjir", r"banjir"), ("longsor", r"tanah longsor|longsor|gerakan tanah|pergerakan tanah"),
         ("karhutla", r"kebakaran hutan|kebakaran lahan|karhutla"), ("kekeringan", r"kekeringan"),
         ("cuaca", r"cuaca ekstr|angin|puting beliung"), ("gempa", r"gempa"), ("erupsi", r"erupsi"),
         ("gelombang", r"gelombang|abrasi")]
KEPALA = re.compile(r"^(?:bencana alam |kejadian |terjadi )?(?P<jenis>[a-z][a-z ,/&\-]{2,60}?) di (?:(?P<kab>(?:kab\.?|kabupaten|kota) [^,]{2,50}),\s*)?(?:provinsi|prov\.?)\s*(?P<prov>.+?)\s*$", re.I)
TANGGAL = re.compile(r"(\d{1,2})\s+(" + "|".join(BULAN) + r")\s+(20\d\d)", re.I)
TMA = re.compile(r"(?:tma|tinggi muka air|ketinggian(?: air| genangan)?|setinggi|kedalaman)[^0-9\n]{0,30}?(\d{1,3}(?:[.,]\d+)?)\s*(?:(?:-|–|s\.?/?d\.?|sampai|hingga)\s*(\d{1,3}(?:[.,]\d+)?))?\s*(cm|centimeter|sentimeter|meter|m)\b", re.I)
SURUT = re.compile(r"\bsurut\b(?! ?sebagian)|sudah padam|telah padam|berhasil dipadamkan|padam total|tertangani 100|selesai\)|\(selesai|telah selesai", re.I)
BELUM = re.compile(r"belum surut|berangsur surut|mulai surut|surut sebagian|sebagian surut|belum padam", re.I)
ANGKA = r"(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?"
DAMPAK = {"meninggal": rf"{ANGKA}\s*(?:jiwa|orang)?\s*(?:meninggal|md\b)", "hilang": rf"{ANGKA}\s*(?:jiwa|orang)?\s*hilang",
          "luka": rf"{ANGKA}\s*(?:jiwa|orang)?\s*(?:luka|lb\b|lr\b)", "mengungsi": rf"{ANGKA}\s*(?:kk\s*/\s*{ANGKA}\s*)?jiwa\s*mengungsi|{ANGKA}\s*(?:jiwa|orang)\s*(?:mengungsi|pengungsi)",
          "kk": rf"{ANGKA}\s*kk\b", "jiwa": rf"{ANGKA}\s*jiwa\s*terdampak", "rumah": rf"{ANGKA}\s*unit\s*rumah",
          "ha": rf"({ANGKA}(?:,\d+)?)\s*(?:ha|hektar|hektare)\b"}
DAMPAK = {k: re.compile(v, re.I) for k, v in DAMPAK.items()}
BAGIAN = ("kronologis", "lokasi", "korban jiwa", "kerugian materiil", "upaya", "kondisi mutakhir", "giat bnpb", "sarpras",
          "kendala", "unsur terlibat", "dokumentasi", "sumber", "kebutuhan", "update")


def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s)).strip()


PROV_ALIAS = {"Kep. Bangka Belitung": "Kepulauan Bangka Belitung", "Bangka Belitung": "Kepulauan Bangka Belitung",
              "Kep Bangka Belitung": "Kepulauan Bangka Belitung", "Kep. Banka Belitung": "Kepulauan Bangka Belitung",
              "Kep. Riau": "Kepulauan Riau", "D.I Yogyakarta": "DI Yogyakarta", "Di. Yogyakarta": "DI Yogyakarta",
              "Di Yogyakarta": "DI Yogyakarta", "Diy": "DI Yogyakarta", "Daerah Istimewa Yogyakarta": "DI Yogyakarta",
              "Dk Jakarta": "DKI Jakarta", "Dk. Jakarta": "DKI Jakarta", "Dki Jakarta": "DKI Jakarta", "Jakarta": "DKI Jakarta",
              "Jawa Timut": "Jawa Timur", "Jawa Twngah": "Jawa Tengah", "Papua Bart": "Papua Barat", "Barat Daya": "Papua Barat Daya"}


def prov_baku(s):
    """'. jawa TImur' -> 'Jawa Timur'; ejaan BPBD yang beragam -> satu nama."""
    s = re.sub(r"^[\s.,;:]+|[\s.,;:]+$", "", norm(s))
    s = " ".join(w if w.isupper() and len(w) <= 3 and w not in ("JAWA",) else w.capitalize() for w in s.split())
    return next((v for k, v in PROV_ALIAS.items() if k.lower() == s.lower()), s)


def jenis_dari(s):
    s = s.lower()
    return next((k for k, p in JENIS if re.search(p, s)), None)


def tanggal(s):
    m = TANGGAL.search(s)
    if not m:
        return None
    try:
        return dt.date(int(m.group(3)), BULAN[m.group(2).lower()], int(m.group(1))).isoformat()
    except ValueError:
        return None


def angka(s):
    """'1.200' -> 1200, '34,1' -> 34.1; tulisan rusak ('1.169.80') -> None."""
    try:
        return float(s.replace(".", "").replace(",", ".")) if re.fullmatch(r"\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?", s) else None
    except ValueError:
        return None


def cm(a, satuan):
    return round(angka(a) * (100 if satuan.lower() in ("meter", "m") else 1))


# ------------------------------------------------------------------ urai satu laporan
def blok(baris):
    """[(kepala_match, [baris isi])] untuk tiap kejadian di satu laporan."""
    out, cur = [], None
    for b in baris:
        m = KEPALA.match(b) if len(b) < 160 and " di " in b else None
        if m and jenis_dari(m.group("jenis")):
            cur = (m, [])
            out.append(cur)
        elif cur:
            cur[1].append(b)
    return out


def urai_blok(m, isi, hari):
    bag, cur = defaultdict(list), "kronologis"
    for b in isi:
        kepala = b.split(":")[0].strip().lower()
        if kepala in BAGIAN:
            cur = kepala
            sisa = b.split(":", 1)[1].strip() if ":" in b else ""
            if sisa:
                bag[cur].append(sisa)
        else:
            bag[cur].append(b)
    # kepala tingkat provinsi ("... di Provinsi X") membuka blok sendiri (kab kosong), jadi tidak tertelan kejadian sebelumnya
    kab = norm(m.group("kab") or "")
    kab = re.sub(r"^(?:kab\.?|kabupaten)\s*", "Kab. ", kab, flags=re.I)
    kab = re.sub(r"^kota\s*", "Kota ", kab, flags=re.I)
    kron = " ".join(bag["kronologis"])
    kondisi = " ".join(bag["kondisi mutakhir"])
    semua = " ".join(kron.split()) + " " + " ".join(" ".join(v) for k, v in bag.items() if k in ("kerugian materiil", "kondisi mutakhir", "lokasi"))
    e = {"hari": hari, "jenis": jenis_dari(m.group("jenis")), "label": norm(m.group("jenis")), "kab": kab, "prov": prov_baku(m.group("prov")),
         "mulai": tanggal(kron), "kec": sorted({norm(re.sub(r"^kec(?:amatan|\.)\s*", "", b, flags=re.I)).split(":")[0].strip()
                                                for b in bag["lokasi"] if re.match(r"^kec(?:amatan|\.)\s*\S", b, re.I)})}
    t = [(cm(a, s), cm(b or a, s)) for a, b, s in TMA.findall(semua) if angka(a) is not None and angka(b or a) is not None]
    t = [x for x in t if 0 < x[1] <= 1500]   # > 15 m = salah baca (mis. ketinggian tebing)
    if t:
        e["tma_cm"] = [min(x[0] for x in t), max(x[1] for x in t)]
    korban = " ".join(bag["korban jiwa"]).lower()
    rugi = " ".join(bag["kerugian materiil"]).lower()
    for k, r in DAMPAK.items():
        teks = rugi if k in ("rumah", "ha") else korban
        nilai = []
        for g in r.findall(teks):
            g = [x for x in (g if isinstance(g, tuple) else (g,)) if x]
            n = angka(g[-1] if k == "mengungsi" else g[0]) if g else None
            if n is not None:
                nilai.append(n)
        if nilai:
            e[k] = max(nilai) if k in ("ha",) else int(max(nilai))   # maks, bukan jumlah: rincian per desa mengulang total
    if SURUT.search(kondisi) and not BELUM.search(kondisi):
        e["surut"] = tanggal(kondisi) or hari
    return e


def urai_teks(teks, hari):
    baris = [norm(b) for b in teks.splitlines() if norm(b)]
    return [urai_blok(m, isi, hari) for m, isi in blok(baris)]


# ------------------------------------------------------------------ gabung lintas hari
def gabung(entri, kode_kab):
    kej = {}
    for e in sorted(entri, key=lambda x: x["hari"]):
        jenis = e["jenis"]
        mulai = e["mulai"] if e["mulai"] and e["mulai"] <= e["hari"] and (dt.date.fromisoformat(e["hari"]) - dt.date.fromisoformat(e["mulai"])).days <= 120 else None
        kunci = None
        # sambung ke kejadian kab+jenis yang masih terbuka (terlihat <= 3 hari lalu), apa pun tanggal mulainya
        for k, v in kej.items():
            if k[0] == jenis and k[1] == e["kab"] and k[2] == e["prov"] and (dt.date.fromisoformat(e["hari"]) - dt.date.fromisoformat(v["terlihat"][1])).days <= 3 \
                    and (mulai is None or v["mulai"] is None or abs((dt.date.fromisoformat(mulai) - dt.date.fromisoformat(v["mulai"])).days) <= 7):
                kunci = k
        if kunci is None:
            kunci = (jenis, e["kab"], e["prov"], mulai or e["hari"])
            kej[kunci] = {"jenis": jenis, "label": e["label"], "kab": e["kab"], "prov": e["prov"], "mulai": mulai, "terlihat": [e["hari"], e["hari"]], "kec": set()}
        v = kej[kunci]
        v["terlihat"][1] = e["hari"]
        v["mulai"] = v["mulai"] or mulai
        v["kec"] |= set(e["kec"])
        if "tma_cm" in e:
            a = v.setdefault("tma_cm", list(e["tma_cm"]))
            v["tma_cm"] = [min(a[0], e["tma_cm"][0]), max(a[1], e["tma_cm"][1])]
        for k in DAMPAK:
            if k in e:
                v[k] = max(v.get(k, 0), e[k])
        if "surut" in e and "surut" not in v:
            v["surut"] = e["surut"]
    out = []
    for v in kej.values():
        awal = v["mulai"] or v["terlihat"][0]
        if "surut" in v and v["surut"] < awal:
            v["surut"] = v["terlihat"][1]
        v["durasi_hari"] = (dt.date.fromisoformat(v["surut"]) - dt.date.fromisoformat(awal)).days if "surut" in v else None
        v["kab_kode"] = kode_kab(v["prov"], v["kab"]) if v["kab"] else None
        if not v["kab"]:
            v["tingkat"] = "provinsi"
        kk = getattr(kode_kab, "kec", lambda k: None)(v["kab_kode"])
        # nama kec yang bukan milik kab itu = teks bagian lain laporan yang ikut terbaca; buang
        v["kec"] = sorted(c for c in v["kec"] if kk is None or re.sub(r"[^a-z0-9]", "", c.lower()) in kk)
        if "ha" in v:
            v["ha"] = round(v["ha"], 1)
        out.append(v)
    return sorted(out, key=lambda x: (x["mulai"] or x["terlihat"][0], x["prov"], x["kab"]), reverse=True)


def pemeta_kab():
    """(prov teks, 'Kab. X'|'Kota X') -> kode BPS 'pp.kk' dari public/data/desa_cari.json + provinsi DIBI."""
    bersih = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    try:
        dc = json.load(open(os.path.join(AKAR, "public/data/desa_cari.json")))
        kab = dc["kab"]
        dibi = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json")))["kejadian"]
    except (OSError, KeyError, ValueError):
        return lambda p, k: None
    prov = {bersih(x["prov"]): x["prov_kode"] for x in dibi if x.get("prov_kode")}
    prov |= {"diy": "34", "daerahistimewayogyakarta": "34", "dkijakarta": "31", "jakarta": "31", "babel": "19", "kepulauanbangkabelitung": "19", "ntt": "53", "ntb": "52"}
    idx = defaultdict(dict)
    for kode, nama in kab.items():
        kota = kode[3:5] >= "71"
        idx[kode[:2]][("kota" if kota else "kab") + bersih(re.sub(r"^kota\s+", "", nama, flags=re.I))] = kode

    kec = defaultdict(set)
    for kode, _desa, nama_kec in dc.get("baris", []):
        kec[kode[:5]].add(bersih(nama_kec))

    def f(p, k):
        pk = prov.get(bersih(p))
        jenis = "kota" if k.lower().startswith("kota") else "kab"
        nama = bersih(re.sub(r"\bkep\.\s*", "kepulauan ", re.sub(r"^(?:(?:kab\.|kota\b|adm\.)\s*)+", "", k, flags=re.I), flags=re.I))
        # provinsi dulu, lalu seluruh negeri (pemekaran Papua 2022: kode lama di tabel; prov salah tulis di laporan)
        pools = ([idx[pk]] if pk else []) + [v for kk, v in idx.items() if kk != pk]
        for pool in pools:
            if jenis + nama in pool:
                return pool[jenis + nama]
        for pool in pools:   # Kab./Kota tertukar di laporan
            for kk, kode in pool.items():
                if kk[len("kota" if kk.startswith("kota") else "kab"):] == nama:
                    return kode
        return None
    f.kec = lambda kode: kec.get(kode) if kode and kec.get(kode) else None
    return f


# ------------------------------------------------------------------ ambil dari Drive publik
def daftar(folder, jejak=0):
    """[(id, judul)] DOCX di folder dan subfolder (embeddedfolderview, tanpa API)."""
    with urllib.request.urlopen(f"https://drive.google.com/embeddedfolderview?id={folder}", timeout=60) as r:
        h = r.read().decode("utf-8", "replace")
    out = []
    for jenis, i, judul in re.findall(r'href="https://drive\.google\.com/(file/d|drive/folders)/([A-Za-z0-9_-]+)[^"]*".*?flip-entry-title">([^<]+)', h, re.S):
        judul = html.unescape(judul)
        if jenis == "drive/folders" and jejak < 3:
            out += daftar(i, jejak + 1)
        elif judul.lower().endswith(".docx") and "laporan harian" in judul.lower():
            out.append((i, judul))
    return out


def unduh(i, jalur):
    u = f"https://drive.usercontent.google.com/download?id={i}&export=download&confirm=t"
    with urllib.request.urlopen(u, timeout=120) as r, open(jalur + ".tmp", "wb") as f:
        f.write(r.read())
    if not zipfile.is_zipfile(jalur + ".tmp"):
        os.remove(jalur + ".tmp")
        raise RuntimeError(f"bukan DOCX: {i}")
    os.replace(jalur + ".tmp", jalur)


def teks_docx(jalur):
    root = ET.fromstring(zipfile.ZipFile(jalur).read("word/document.xml"))
    tx = lambda el: "".join(t.text or "" for t in el.iter(W + "t")).strip()
    out = []
    for el in root.find(W + "body"):
        if el.tag == W + "p":
            out.append(tx(el))
        elif el.tag == W + "tbl":
            out += [" | ".join(tx(tc) for tc in tr.findall(W + "tc")) for tr in el.iter(W + "tr")]
    return "\n".join(out)


def hari_laporan(judul, teks):
    m = re.search(r"(\d{2})(\d{2})(20\d\d)", judul)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return tanggal(teks[:2000])


def jalan(luring=False):
    os.makedirs(MENTAH, exist_ok=True)
    indeks_p = os.path.join(MENTAH, "indeks.json")
    indeks = json.load(open(indeks_p)) if os.path.exists(indeks_p) else {}
    if not luring:
        for i, judul in daftar(FOLDER):
            d = os.path.join(MENTAH, i + ".docx")
            if not os.path.exists(os.path.join(MENTAH, i + ".txt")) and not (os.path.exists(d) and zipfile.is_zipfile(d)):
                unduh(i, d)
            indeks[i] = judul
        json.dump(indeks, open(indeks_p, "w"), ensure_ascii=False)
    # DOCX (2-5 MB, foto) diubah ke teks sekali lalu dibuang: cache CI ~40 MB, bukan ~1 GB
    for i in list(indeks):
        d, t = os.path.join(MENTAH, i + ".docx"), os.path.join(MENTAH, i + ".txt")
        if os.path.exists(d) and not os.path.exists(t):
            with open(t + ".tmp", "w", encoding="utf-8") as f:
                f.write(teks_docx(d))
            os.replace(t + ".tmp", t)
        if os.path.exists(d) and os.path.exists(t):
            os.remove(d)
    entri, per_hari = [], defaultdict(int)
    for i, judul in sorted(indeks.items(), key=lambda x: x[1]):
        p = os.path.join(MENTAH, i + ".txt")
        if not os.path.exists(p):
            continue
        t = open(p, encoding="utf-8").read()
        h = hari_laporan(judul, t)
        if not h or per_hari[h]:   # salinan/edisi kedua hari yang sama: satu saja (yang pertama urut judul)
            continue
        per_hari[h] += 1
        entri += urai_teks(t, h)
    kej = gabung(entri, pemeta_kab())
    hari = sorted(per_hari)
    simpan = __import__("importlib").import_module
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    simpan("kejadian").simpan(KELUAR, {
        "sumber": "Laporan Harian Dit. Koordalops / Pusdalops BNPB (DOCX harian, folder Google Drive publik)",
        "dari": hari[0] if hari else None, "sampai": hari[-1] if hari else None, "n_laporan": len(hari),
        "catatan": "Satu baris = satu kejadian (entri harian yang sama kab+jenis digabung). mulai = tanggal pertama di Kronologis; "
                   "surut = hari laporan pertama yang menyebut surut/padam/selesai; durasi_hari = surut - mulai (null = belum pernah "
                   "dilaporkan surut). tma_cm = [min, maks] ketinggian air yang disebut. Angka dampak = maks lintas hari, bukan jumlah. "
                   "Hanya kejadian yang dilaporkan BPBD ke Pusdalops; bukan sensus. Nama pelapor tidak disimpan.",
        "kejadian": kej})
    print(f"logbook: {len(hari)} laporan, {len(entri)} entri, {len(kej)} kejadian -> {os.path.relpath(KELUAR, AKAR)}")
    return kej


# ------------------------------------------------------------------ swauji
def uji():
    t1 = """LAPORAN HARIAN
Banjir di Kab. Luwu, Provinsi Sulawesi Selatan
Kronologis: Hujan deras pada hari Sabtu, 13 Juni 2026 pukul 09.00 WITA membuat sungai meluap dengan TMA bervariasi 30-50 cm.
Lokasi: (1 Kecamatan / 1 Desa)
Kec. Walenrang Timur
Ds. Tabah
Korban Jiwa:
± 200 KK terdampak
2 jiwa meninggal dunia
Kerugian Materiil:
± 1.200 unit rumah terdampak
± 15 Ha lahan persawahan
Kondisi Mutakhir:
Senin, 15 Juni 2026
Banjir belum surut
Sumber: Bpk. Asep Pusdalops BPBD Kab. Luwu
Bencana Alam Kebakaran Hutan dan Lahan di Kab. Aceh Barat, Prov. Aceh
Kronologis: Telah terjadi kebakaran lahan pada hari Sabtu, 30 Mei 2026.
Kerugian Materiil:
± 34,1 ha lahan terbakar dengan rincian :
Kec. Bubon : ± 25 ha
Kondisi Mutakhir:
Kec. BUBON: Tertangani 100% ( Selesai )"""
    t2 = """Banjir di Kab. Luwu, Provinsi Sulawesi Selatan
Kronologis: Hujan deras pada hari Sabtu, 13 Juni 2026, ketinggian air ± 0,8 meter.
Kondisi Mutakhir:
Selasa, 16 Juni 2026
Banjir telah surut"""
    e = urai_teks(t1, "2026-06-15") + urai_teks(t2, "2026-06-16")
    assert [x["jenis"] for x in e] == ["banjir", "karhutla", "banjir"], [x["jenis"] for x in e]
    b = e[0]
    assert b["mulai"] == "2026-06-13" and b["tma_cm"] == [30, 50] and b["kk"] == 200 and b["meninggal"] == 2, b
    assert b["rumah"] == 1200 and b["ha"] == 15 and b["kec"] == ["Walenrang Timur"] and "surut" not in b, b
    assert "Asep" not in json.dumps(e), "nama pelapor bocor"
    assert prov_baku(". jawa TImur") == "Jawa Timur" and prov_baku("Kep. Bangka Belitung") == prov_baku("Kepulauan Bangka Belitung")
    assert prov_baku("DIY") == "DI Yogyakarta" and prov_baku("Sulawesi Utara .") == "Sulawesi Utara" and prov_baku("NTT") == "NTT"
    assert e[1]["ha"] == 34.1 and e[1]["surut"] == "2026-06-15" and e[1]["prov"] == "Aceh", e[1]
    assert angka("1.169.80") is None and angka("1.200") == 1200
    assert e[2]["tma_cm"] == [80, 80] and e[2]["surut"] == "2026-06-16", e[2]
    k = gabung(e, lambda p, k: "73.17" if k == "Kab. Luwu" else None)
    bj = next(x for x in k if x["jenis"] == "banjir")
    f = pemeta_kab()
    if f("Jawa Barat", "Kota Bogor"):   # butuh public/data/desa_cari.json
        assert f("Papua Barat Daya", "Kota Sorong") and f("Sulawesi Utara", "Kab. Kep. Sangihe") and f("Kalimantan Tengah", "Kab. Kotawaringin Barat") and f("Jawa Timur", "Kab. Sragen") == f("Jawa Tengah", "Kab. Sragen")
        assert f("Jawa Barat", "Kota Bogor") != f("Jawa Barat", "Kab. Bogor")
    assert len(k) == 2 and bj["terlihat"] == ["2026-06-15", "2026-06-16"] and bj["tma_cm"] == [30, 80], k
    assert bj["durasi_hari"] == 3 and bj["kab_kode"] == "73.17" and bj["rumah"] == 1200, bj
    # kepala tingkat provinsi memutus blok sebelumnya: luas provinsi tak boleh masuk kejadian kab
    e3 = urai_teks("Banjir di Kab. Luwu, Provinsi Sulawesi Selatan\nKerugian Materiil:\n5 ha sawah\n"
                   "Bencana Alam Kebakaran Hutan dan Lahan di Provinsi Kalimantan Barat\nKerugian Materiil:\n± 50.831,71 Ha terbakar", "2026-10-07")
    assert [x["kab"] for x in e3] == ["Kab. Luwu", ""] and e3[0]["ha"] == 5 and e3[1]["ha"] == 50831.71, e3
    kp = gabung(e3, f)
    assert next(x for x in kp if not x["kab"])["tingkat"] == "provinsi" and all(x["kab_kode"] is None for x in kp if not x["kab"]), kp
    if f("Jawa Barat", "Kota Bogor"):
        g = gabung([{**e[0], "kec": ["Walenrang Timur", "Ibu Selatan"]}], f)[0]
        assert g["kec"] == ["Walenrang Timur"], g["kec"]
    # kepala bukan kejadian tidak membuka blok; "berangsur surut" bukan surut
    assert urai_teks("Perkembangan jaringan telekomunikasi di Kab. Agam, Provinsi Sumatera Barat", "2026-01-01") == []
    x = urai_teks("Banjir di Kota Bogor, Provinsi Jawa Barat\nKondisi Mutakhir:\nBanjir berangsur surut", "2026-01-02")[0]
    assert "surut" not in x and x["kab"] == "Kota Bogor", x
    print("swauji logbook_bnpb: lolos")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else ""
    uji() if a == "uji" else jalan(luring=(a == "urai"))
