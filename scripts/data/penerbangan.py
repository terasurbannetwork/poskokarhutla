"""Gangguan penerbangan akibat asap karhutla: Google News RSS -> kejadian terstruktur -> public/data/penerbangan.json.

Pakai:  python3 scripts/data/penerbangan.py       ambil RSS, gabung ke arsip data/raw/penerbangan/arsip.json, ambil METAR, tulis json
        python3 scripts/data/penerbangan.py ulang olah ulang arsip tanpa RSS (METAR tetap diambil bila bisa)
        python3 scripts/data/penerbangan.py uji   uji aturan (tanpa jaringan)

Hanya judul + cuplikan RSS yang dibaca. Satu berita = satu laporan; laporan yang menyebut bandara + jenis gangguan
yang sama dalam selisih <= 1 hari, atau nomor penerbangan yang sama, digabung jadi satu kejadian. Angka yang keluar
adalah BATAS BAWAH: tidak ada data delay/pembatalan terbuka dari bandara atau maskapai.
Jarak pandang: arsip METAR Iowa Environmental Mesonet (mesonet.agron.iastate.edu, publik, tanpa kunci).
"""
import csv, datetime as dt, io, json, os, re, sys, time, urllib.parse, urllib.request
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from berita import ambil, rss, urai  # pengambil RSS & pengurai item yang sama dengan bot berita

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
RAW = os.path.join(AKAR, "data/raw/penerbangan")
KELUAR = os.path.join(AKAR, "public/data/penerbangan.json")
WIB = dt.timezone(dt.timedelta(hours=7))
SIMPAN_HARI = 400

KUERI = ["penerbangan asap", "pesawat divert asap", "pengalihan pendaratan kabut asap", "delay penerbangan kabut asap",
         "bandara ditutup asap", "jarak pandang bandara asap", "penerbangan dibatalkan kabut asap", "pesawat gagal mendarat asap",
         "pesawat return to base asap", "bandara kabut asap karhutla", "penerbangan terganggu karhutla",
         "Garuda dialihkan kabut asap", "pesawat gagal mendarat kabut asap", "Lion Air divert asap"]
KUERI_EN = [("en-US", "haze flight diverted Indonesia"), ("en-US", "haze flights cancelled Indonesia"),
            ("en-SG", "haze airport Indonesia visibility"), ("en-US", "Indonesia haze flights delayed")]

# IATA: (ICAO, alias di judul). Koordinat diambil dari public/data/udara.json lewat ICAO.
BANDARA = {
    "BPN": ("WALL", ["balikpapan", "sepinggan", "aji muhammad sulaiman"]),
    "AAP": ("WALS", ["samarinda", "apt pranoto", "aji pangeran tumenggung pranoto"]),
    "PKY": ("WAGG", ["palangka raya", "palangkaraya", "tjilik riwut"]),
    "PNK": ("WIOO", ["pontianak", "supadio"]),
    "PLM": ("WIPP", ["palembang", "badaruddin", "smb ii"]),
    "PKU": ("WIBB", ["pekanbaru", "syarif kasim", "ssk ii"]),
    "DJB": ("WIJJ", ["jambi", "sultan thaha"]),
    "BDJ": ("WAOO", ["banjarmasin", "banjarbaru", "syamsudin noor", "syamsuddin noor"]),
    "TRK": ("WAQQ", ["tarakan", "juwata"]),
    "SMQ": ("WAGS", ["sampit", "h. asan", "haji asan"]),
    "PKN": ("WAGI", ["pangkalan bun", "iskandar", "kobar", "kotawaringin barat"]),
    "KTG": ("WIOK", ["ketapang", "rahadi o"]),
    "SQG": ("WIOS", ["sintang", "tebelian"]),
    "PSU": ("WIOP", ["putussibau", "pangsuma"]),
    "DUM": ("WIBD", ["dumai", "pinang kampai"]),
    "BTH": ("WIDD", ["batam", "hang nadim"]),
    "TNJ": ("WIDN", ["tanjungpinang", "tanjung pinang", "raja haji fisabilillah"]),
    "PGK": ("WIKK", ["pangkalpinang", "pangkal pinang", "depati amir"]),
    "TJQ": ("WIKT", ["belitung", "tanjung pandan", "hanandjoeddin"]),
    "BKS": ("WIGG", ["bengkulu", "fatmawati"]),
    "TKG": ("WILL", ["radin inten", "bandar lampung"]),
    "KNO": ("WIMM", ["kualanamu", "medan"]),
    "PDG": ("WIEE", ["minangkabau", "padang"]),
    "BTJ": ("WITT", ["banda aceh", "iskandar muda"]),
    "CGK": ("WIII", ["soekarno-hatta", "soekarno hatta", "soetta", "cengkareng"]),
    "BEJ": ("WAQT", ["berau", "kalimarau"]),
    "BTW": ("WAOC", ["batulicin", "bersujud"]),
    "MKQ": ("WAKK", ["merauke", "mopah"]),
    "DJJ": ("WAJJ", ["sentani", "jayapura"]),
    "MKW": ("WAUU", ["manokwari", "rendani"]),
    "SOQ": ("WASS", ["sorong", "domine eduard"]),
    "KDI": ("WAWW", ["kendari", "haluoleo", "halu oleo"]),
    "UPG": ("WAAA", ["makassar", "hasanuddin"]),
    "MDC": ("WAMM", ["manado", "sam ratulangi"]),
    "AMQ": ("WAPP", ["ambon", "pattimura"]),
    "KOE": ("WATT", ["kupang", "el tari"]),
    "TTE": ("WAEE", ["ternate", "babullah"]),
    "NBX": ("WABI", ["nabire"]),
    "SKJ": ("WIOD", ["singkawang"]),
    "GHS": ("WALE", ["melalan", "kutai barat"]),
    "GXM": ("WAGA", ["kuala kurun"]),
    "KLP": ("WAGF", ["kuala pembuang"]),
    "KBU": ("WAOK", ["kotabaru", "gusti syamsir"]),
    "TJG": ("WAON", ["warukin", "tabalong"]),
    "RGT": ("WIBJ", ["rengat", "japura"]),
    "BUU": ("WIJB", ["muara bungo"]),
    "LLJ": ("WIPB", ["lubuklinggau", "lubuk linggau", "silampari"]),
    "WMX": ("WAVV", ["wamena"]),
    "TIM": ("WAYY", ["timika", "mozes kilangin"]),
    "FKQ": ("WASF", ["fakfak"]),
    "DPS": ("WADD", ["denpasar", "ngurah rai"]),
    "KNG": ("WASK", ["kaimana"]),
    "MJU": ("WAFJ", ["mamuju", "tampa padang"]),
    "KXB": ("WAWP", ["kolaka", "sangia nibandera"]),
    "PLW": ("WAFF", ["palu", "mutiara sis al"]),
    "SUB": ("WARR", ["juanda", "surabaya"]),
    "TMH": ("WAKT", ["tanah merah", "boven digoel"]),
    "LMU": ("WIDL", ["letung", "anambas"]),
    "JHB": ("WMKJ", ["senai", "johor"]),
}
# METAR selalu diambil untuk bandara inti (sama dengan scripts/scrape/metar.py) + bandara yang muncul di kejadian
INTI = ["WIBB", "WIJJ", "WIPP", "WIOO", "WAGG", "WAOO", "WALL", "WALS", "WIDD", "WIDN", "WIKK", "WAGS", "WIOK", "WAKK"]

MASKAPAI = [("GA", "Garuda Indonesia", r"garuda"), ("QG", "Citilink", r"citilink"), ("JT", "Lion Air", r"lion ?air"),
            ("ID", "Batik Air", r"batik ?air"), ("IW", "Wings Air", r"wings ?air"), ("IU", "Super Air Jet", r"super ?air ?jet"),
            ("SJ", "Sriwijaya Air", r"sriwijaya"), ("IN", "NAM Air", r"nam ?air"), ("8B", "TransNusa", r"transnusa"),
            ("QZ", "Indonesia AirAsia", r"air ?asia"), ("IL", "Trigana Air", r"trigana"), ("6D", "Pelita Air", r"pelita ?air"),
            ("TR", "Scoot", r"\bscoot\b"), ("SQ", "Singapore Airlines", r"singapore airlines"), ("MH", "Malaysia Airlines", r"malaysia airlines"),
            (None, "Susi Air", r"susi ?air")]
KODE_MASKAPAI = {k: n for k, n, _ in MASKAPAI if k}

UDARA = r"garuda|citilink|lion ?air|batik ?air|wings ?air|super ?air ?jet|sriwijaya|air ?asia|trigana|penerbangan|pesawat|bandara|bandar udara|maskapai|flight|airport|airline|landing|mendarat|lepas landas|take ?off|runway|landasan"
ASAP = r"asap|karhutla|kebakaran hutan|kebakaran lahan|\bhaze\b|smoke|smog|jerebu"
GANGGU = (r"divert|dialihkan|pengalihan|dialihkan|alihkan|delay|tertunda|ditunda|tunda|terlambat|keterlambatan|batal|cancel|ditutup|"
          r"tutup|closed|lumpuh|suspend|berhenti beroperasi|tidak beroperasi|gagal mendarat|tak bisa mendarat|tidak bisa mendarat|"
          r"return to base|\brtb\b|kembali ke bandara|putar balik|berputar|holding|terganggu|gangguan|terdampak|terkena dampak|kena dampak|disrupt|jarak pandang|visibility|"
          r"tak bisa terbang|tidak bisa terbang|grounded|lumpuhkan")
# berita pesawat pemadam / hujan buatan, bukan gangguan penerbangan komersial
PEMADAM = r"water ?bombing|bom air|helikopter|heli\b|modifikasi cuaca|\btmc\b|\bomc\b|semai|hujan buatan|pemadaman udara|patroli udara"
BUKAN_ASAP = r"cuaca buruk|hujan deras|hujan lebat|badai|angin kencang|erupsi|abu vulkanik|gunung"

JENIS = [("divert", r"divert|dialihkan|pengalihan|alihkan|mendarat di bandara lain|landed in|diverted|gagal mendarat|tak bisa mendarat|tidak bisa mendarat"),
         ("batal", r"dibatalkan|batal|cancel"),
         ("rtb", r"return to base|\brtb\b|kembali ke bandara asal|putar balik|kembali ke"),
         ("tutup", r"ditutup|\btutup\b|closed|lumpuh|suspend|berhenti beroperasi|tidak beroperasi|grounded"),
         ("tunda", r"delay|tertunda|ditunda|\btunda|terlambat|keterlambatan|holding|berputar"),
         ("jarak_pandang", r"jarak pandang|visibility|pandangan")]
NAMA_JENIS = {"divert": "Dialihkan ke bandara lain", "batal": "Dibatalkan", "rtb": "Kembali ke bandara asal", "tutup": "Bandara ditutup/lumpuh",
              "tunda": "Tertunda", "jarak_pandang": "Jarak pandang turun", "lain": "Terganggu"}


def mulai_musim(hari):
    return dt.date(hari.year, 6, 1)


def relevan(judul):
    t = judul.lower()
    if not (re.search(UDARA, t) and re.search(ASAP, t) and re.search(GANGGU, t)):
        return False
    if re.search(PEMADAM, t) and not re.search(r"divert|dialihkan|batal|cancel|delay|tertunda|ditutup|penerbangan komersial", t):
        return False
    if re.search(r"tidak terganggu|tak terganggu|belum terdampak|tidak terdampak|tetap beroperasi|tetap normal|berjalan normal|kembali normal", t):
        return False  # berita bahwa penerbangan TIDAK terganggu
    if re.search(BUKAN_ASAP, t) and not re.search(r"asap|haze|smoke", t):
        return False
    return True


def jenis(judul):
    t = judul.lower()
    j = [k for k, p in JENIS if re.search(p, t)]
    return j or ["lain"]


def bandara(judul):
    """-> (terdampak, alternatif) kode IATA. Alternatif = bandara yang disebut setelah kata 'dialihkan ke/mendarat di/diverted to'."""
    t = judul.lower()
    temu = []
    for kode, (_, alias) in BANDARA.items():
        pos = [(m.start(), m.end()) for a in alias for m in re.finditer(r"\b" + re.escape(a), t)]
        pos += [(m.start(), m.end()) for m in re.finditer(r"\b" + kode + r"\b", judul)]
        if pos:
            temu.append((*min(pos), kode))
    temu.sort()
    if not temu:
        return None, None
    alt, asal = None, set()
    for a, b in zip(temu, temu[1:]):  # rute "Batam-Pekanbaru" / "Jakarta – Pekanbaru": yang pertama bandara asal
        if re.fullmatch(r"\s*[-–/]\s*", t[a[1]:b[0]]):
            asal.add(a[2])
    for p, _, k in temu:
        sebelum = t[max(0, p - 60):p]
        if re.search(r"(gagal|tak bisa|tidak bisa|batal)\s+mendarat[^,.;]{0,25}$", sebelum):
            continue  # "gagal mendarat di X": X bandara yang terganggu
        if re.search(r"(dialihkan|alihkan|divert(ed)?|mendarat|landed|pengalihan|kembali( terbang)?)[^,.;]{0,25}(ke|di|to|in)\s+[^,.;]{0,25}$", sebelum):
            alt = k
    utama = next((k for _, _, k in temu if k != alt and k not in asal), None) or next((k for _, _, k in temu if k != alt), None)
    return utama, alt  # utama None + alt ada: hanya bandara penerima pengalihan yang disebut


def nomor_penerbangan(judul):
    out = []
    for m in re.finditer(r"\b(GA|QG|JT|ID|IW|IU|SJ|IN|8B|QZ|IL|6D|TR|SQ|MH)[ -]?(\d{2,4})\b", judul):
        if m.group(1) in ("ID", "IN") and len(m.group(2)) < 4:  # "ID 12", "IN 30" terlalu rawan salah
            continue
        out.append(m.group(1) + " " + m.group(2))
    return sorted(set(out))


def maskapai(judul, nomor):
    t = judul.lower()
    n = {nama for _, nama, p in MASKAPAI if re.search(p, t)} | {KODE_MASKAPAI[x.split()[0]] for x in nomor}
    return sorted(n)


def jumlah(judul):
    """Jumlah penerbangan/pesawat yang disebut, mis. '1.673 Penerbangan', '12 penerbangan', '5 flights'. None bila tidak ada."""
    m = re.findall(r"(\d{1,3}(?:[.,]\d{3})+|\d+)\s+(?:jadwal\s+)?(?:penerbangan|pesawat|flights?|rute)", judul, re.I)
    v = [int(re.sub(r"[.,]", "", x)) for x in m]
    v = [x for x in v if 0 < x < 100000]
    return max(v) if v else None


def ekstrak(a):
    j = a["judul"]
    utama, alt = bandara(j)
    nomor = nomor_penerbangan(j)
    return {"tgl": a["tgl"][:10], "bandara": utama, "alternatif": alt, "jenis": jenis(j), "nomor": nomor, "maskapai": maskapai(j, nomor),
            "jumlah": jumlah(j), "sumber": [{"judul": j, "media": a.get("sumber", ""), "url": a["url"], "tgl": a["tgl"]}]}


def gabung(kej):
    """Satukan laporan kejadian yang sama: bandara + jenis utama sama dalam <= 1 hari, atau nomor penerbangan sama."""
    kej = sorted(kej, key=lambda e: e["tgl"])
    out = []
    for e in kej:
        d = dt.date.fromisoformat(e["tgl"])
        for o in out:
            dekat = abs((dt.date.fromisoformat(o["tgl"]) - d).days) <= 1
            rekap = not e["bandara"] and not o["bandara"] and e["jumlah"] and e["jumlah"] == o["jumlah"]
            if rekap or (set(e["nomor"]) & set(o["nomor"])) or (dekat and e["bandara"] and e["bandara"] == o["bandara"] and e["jenis"][0] == o["jenis"][0]):
                o["sumber"] += [s for s in e["sumber"] if s["url"] not in {x["url"] for x in o["sumber"]}]
                o["nomor"] = sorted(set(o["nomor"]) | set(e["nomor"]))
                o["maskapai"] = sorted(set(o["maskapai"]) | set(e["maskapai"]))
                o["jenis"] = o["jenis"] + [x for x in e["jenis"] if x not in o["jenis"]]
                o["alternatif"] = o["alternatif"] or e["alternatif"]
                o["jumlah"] = max(filter(None, [o["jumlah"], e["jumlah"]]), default=None)
                break
        else:
            out.append({**e, "sumber": list(e["sumber"])})
    return out


REKAP_MIN = 300  # ponytail: angka >= 300 dalam satu judul dianggap rekap wilayah/nasional; ganti bila ada bandara yang memang sebesar itu


def pisah_rekap(kej):
    """Laporan berangka yang sama dengan rekap tanpa bandara ('1.673 penerbangan ... termasuk di Jambi'), atau >= REKAP_MIN,
    adalah rekap wilayah/nasional, bukan kejadian di bandara itu: bandaranya dilepas supaya tidak dijumlah dua kali."""
    rekap = {e["jumlah"] for e in kej if not e["bandara"] and e["jumlah"]}
    for e in kej:
        if e["bandara"] and e["jumlah"] and (e["jumlah"] in rekap or e["jumlah"] >= REKAP_MIN):
            e["disebut"], e["bandara"] = e["bandara"], None
    return kej


def terdampak(e):
    """Penerbangan terdampak minimal per kejadian: angka yang disebut, atau jumlah nomor penerbangan, atau 1."""
    return max(e["jumlah"] or 0, len(e["nomor"]), 1)


# ------------------------------------------------------------------ METAR (IEM)
def metar_harian(icao, mulai, akhir):
    """{tanggal WIB: [jarak pandang min km, jam < 5 km, jam < 1,5 km]} dari arsip METAR IEM."""
    q = {"station": icao, "data": "vsby", "year1": mulai.year, "month1": mulai.month, "day1": mulai.day,
         "year2": akhir.year, "month2": akhir.month, "day2": akhir.day, "tz": "Asia/Jakarta", "format": "onlycomma",
         "latlon": "no", "missing": "M", "trace": "T", "direct": "no", "report_type": [3, 4]}
    b = ambil("https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?" + urllib.parse.urlencode(q, doseq=True), coba=2).decode()
    return olah_metar(b)


def olah_metar(teks):
    mn, j5, j15 = {}, defaultdict(set), defaultdict(set)
    for r in csv.DictReader(io.StringIO(teks)):
        try:
            km = float(r["vsby"]) * 1.609344
        except (KeyError, ValueError):
            continue
        tgl, jam = r["valid"][:10], r["valid"][11:13]
        mn[tgl] = min(mn.get(tgl, 99), km)
        if km < 5:
            j5[tgl].add(jam)
        if km < 1.5:
            j15[tgl].add(jam)
    return {t: [round(v, 1), len(j5[t]), len(j15[t])] for t, v in sorted(mn.items())}


# ------------------------------------------------------------------ jalan
def baca_arsip():
    try:
        return json.load(open(os.path.join(RAW, "arsip.json")))
    except FileNotFoundError:
        return {}
    except Exception as e:  # ada tapi rusak: jangan menimpa arsip musim dengan RSS terkini saja
        sys.exit(f"arsip.json ada tapi tak terbaca ({e}); keluar tanpa menulis")


def main(ambil_rss=True):
    os.makedirs(RAW, exist_ok=True)
    kini = dt.datetime.now(WIB)
    arsip = baca_arsip()
    if ambil_rss:
        for i, q in enumerate([("id", q) for q in KUERI] + KUERI_EN):
            try:
                for a in urai(ambil(rss(q[1], q[0]), coba=2)):
                    arsip.setdefault(a["id"], a)
            except Exception as e:
                print("lewati", q, e)
            time.sleep(1.5)  # sopan ke Google News
    try:  # judul yang sudah dipanen bot berita ikut disaring (tanpa permintaan tambahan)
        for a in json.load(open(os.path.join(AKAR, "public/data/berita.json")))["artikel"]:
            arsip.setdefault(a["id"], {k: a.get(k) for k in ("id", "judul", "sumber", "url", "tgl")})
    except Exception:
        pass
    batas = (kini - dt.timedelta(days=SIMPAN_HARI)).isoformat()
    arsip = {k: v for k, v in arsip.items() if v["tgl"] >= batas}
    json.dump(arsip, open(os.path.join(RAW, "arsip.json"), "w"), ensure_ascii=False)

    m0 = mulai_musim(kini.date())
    laporan = [a for a in arsip.values() if a["tgl"][:10] >= m0.isoformat() and relevan(a["judul"])]
    kej = gabung(pisah_rekap([ekstrak(a) for a in laporan]))

    udara = {x["icao"]: x for x in json.load(open(os.path.join(AKAR, "public/data/udara.json"))) if x.get("icao")}
    lama = {}
    try:
        lama = json.load(open(KELUAR)).get("metar", {})
    except Exception:
        pass
    icao = sorted(set(INTI) | {BANDARA[e["bandara"]][0] for e in kej if e["bandara"]} | {BANDARA[e["alternatif"]][0] for e in kej if e["alternatif"]})
    metar = {}
    for c in icao:
        try:
            v = metar_harian(c, m0, kini.date())
            if v:
                metar[c] = v
            time.sleep(1)
        except Exception as e:
            print("METAR gagal", c, e)
            if c in lama:
                metar[c] = lama[c]
    ban = {}
    for k, (c, _) in BANDARA.items():
        u = udara.get(c)
        if any(k in (e["bandara"], e["alternatif"], e.get("disebut")) for e in kej) or c in metar:
            ban[k] = {"icao": c, "nama": u["nama"] if u else k, "lat": u and u["lat"], "lon": u and u["lon"], "prov": u and u["prov"]}
    for e in kej:
        e["terdampak"] = terdampak(e)
        c = BANDARA[e["bandara"]][0] if e["bandara"] else None
        if c and c in metar:
            d = dt.date.fromisoformat(e["tgl"])
            v = [metar[c][t][0] for t in ((d + dt.timedelta(days=i)).isoformat() for i in (-1, 0)) if t in metar[c]]
            e["vis_min_km"] = min(v) if v else None
    kej.sort(key=lambda e: e["tgl"], reverse=True)
    out = {"dibuat": kini.isoformat(timespec="minutes"), "mulai_musim": m0.isoformat(), "kejadian": kej, "bandara": ban, "metar": metar,
           "nama_jenis": NAMA_JENIS, "laporan": len(laporan),
           "catatan": "Kejadian disusun dari judul berita Google News (bukan data resmi bandara/maskapai), jadi angkanya batas bawah. "
                      "Tanggal = tanggal terbit berita. METAR: arsip Iowa Environmental Mesonet; jarak pandang minimum harian (WIB)."}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(len(laporan), "laporan ->", len(kej), "kejadian;", sum(e["terdampak"] for e in kej), "penerbangan (min.);", len(metar), "bandara METAR")


def uji():
    ya = ["12 Penerbangan dari Bandara Sentani Dibatalkan Imbas Kabut Asap Karhutla",
          "Asap Karhutla Pangkas Jarak Pandang hingga 500 Meter, Penerbangan Ikut Tertunda",
          "Garuda GA 580 tujuan Samarinda dialihkan ke Balikpapan akibat kabut asap",
          "Haze forces flights diverted from Pontianak airport",
          "Prabowo Gelar Ratas Penanganan Karhutla, 1.673 Penerbangan Dalam Negeri Terkena Dampak"]
    tidak = ["Helikopter water bombing dikerahkan padamkan karhutla, pesawat TMC semai garam",   # pesawat pemadam
             "Penerbangan di Bandara Sepinggan tertunda akibat cuaca buruk dan hujan deras",      # bukan asap
             "Bandara Supadio tambah rute penerbangan baru ke Kuching",                         # bukan gangguan & bukan asap
             "Kabut asap selimuti Palembang, warga diminta pakai masker",                       # bukan penerbangan
             "Erupsi gunung, bandara ditutup karena abu vulkanik"]                               # abu vulkanik
    a = lambda j, t, u: {"judul": j, "tgl": t + "T10:00+07:00", "url": u, "sumber": "x"}
    for j in ya:
        assert relevan(j), f"harus lolos: {j}"
    for j in tidak:
        assert not relevan(j), f"harus ditolak: {j}"
    assert bandara(ya[2]) == ("AAP", "BPN"), bandara(ya[2])
    assert bandara(ya[0]) == ("DJJ", None), bandara(ya[0])
    assert bandara("Kabut Asap Tebal, Dua Pesawat Gagal Mendarat di Pekanbaru") == ("PKU", None), "gagal mendarat di X = X terganggu"
    assert bandara("Pesawat Gagal Mendarat di Bandara SSK II karena Asap Karhutla Kembali ke Soetta") == ("PKU", "CGK")
    assert bandara("Lion Air Batam-Pekanbaru Sempat Divert ke Padang") == ("PKU", "PDG"), "rute A-B: B tujuan yang terganggu"
    assert bandara("Pesawat Lion Air dialihkan ke Balikpapan karena asap") == (None, "BPN")
    assert not relevan("Bandara Mutiara Palu pastikan penerbangan tidak terganggu kabut asap karhutla"), "berita 'tidak terganggu' harus ditolak"
    p = pisah_rekap([ekstrak(a("Rincian 1.673 Penerbangan Terdampak Kabut Asap Termasuk di Jambi", "2026-10-12", "r1")),
                     ekstrak(a(ya[4], "2026-10-12", "r2")), ekstrak(a(ya[0], "2026-10-12", "r3"))])
    assert p[0]["bandara"] is None and p[0]["disebut"] == "DJB" and p[2]["bandara"] == "DJJ", "rekap nasional tidak boleh jadi kejadian bandara"
    assert nomor_penerbangan(ya[2]) == ["GA 580"]
    assert nomor_penerbangan("ID 12 penerbangan") == [], "ID dua digit harus ditolak"
    assert nomor_penerbangan("Batik ID 6871 dan JT-123 tertunda") == ["ID 6871", "JT 123"]
    assert maskapai(ya[2], ["GA 580"]) == ["Garuda Indonesia"]
    assert jumlah(ya[4]) == 1673 and jumlah(ya[0]) == 12 and jumlah(ya[1]) is None
    assert jenis(ya[2])[0] == "divert" and jenis(ya[0])[0] == "batal" and "tunda" in jenis(ya[1])
    # penggabungan: dua media melaporkan GA 580 -> satu kejadian; bandara sama jenis sama selisih 1 hari -> satu
    k = gabung([ekstrak(a(ya[2], "2026-09-18", "u1")), ekstrak(a("GA 580 Samarinda divert Balikpapan imbas asap", "2026-09-19", "u2")),
                ekstrak(a(ya[0], "2026-10-12", "u3")), ekstrak(a("Kabut asap, penerbangan di Sentani dibatalkan", "2026-10-13", "u4")),
                ekstrak(a("Kabut asap, penerbangan di Sentani dibatalkan lagi", "2026-10-20", "u5"))])
    assert len(k) == 3, [x["tgl"] for x in k]
    assert all(len({s["url"] for s in e["sumber"]}) == len(e["sumber"]) for e in k), "sumber ganda"
    assert sum(terdampak(e) for e in k) >= len(k), "tiap kejadian minimal 1 penerbangan"
    assert next(e for e in k if e["bandara"] == "DJJ" and e["tgl"] == "2026-10-12")["jumlah"] == 12
    r = gabung([ekstrak(a(ya[4], "2026-10-12", "n1")), ekstrak(a("Kemenhub: 1.673 Penerbangan Terdampak Asap Karhutla", "2026-10-14", "n2"))])
    assert len(r) == 1 and r[0]["bandara"] is None and r[0]["jumlah"] == 1673, "rekap nasional berangka sama harus jadi satu"
    m = olah_metar("station,valid,vsby\nWIPP,2026-10-01 07:00,0.62\nWIPP,2026-10-01 07:30,2.5\nWIPP,2026-10-01 08:00,M\nWIPP,2026-10-02 07:00,6.21\n")
    assert m["2026-10-01"] == [1.0, 1, 1] and m["2026-10-02"][1] == 0, m
    assert all(len(v[0]) == 4 and v[0] == v[0].upper() for v in BANDARA.values()), "ICAO 4 huruf"
    import tempfile
    global RAW
    r0, RAW = RAW, tempfile.mkdtemp()
    try:
        assert baca_arsip() == {}, "tak ada berkas -> {}"
        open(os.path.join(RAW, "arsip.json"), "w").write("{rusak")
        try:
            baca_arsip()
            raise AssertionError("arsip rusak harus keluar")
        except SystemExit:
            pass
    finally:
        RAW = r0
    print("uji penerbangan: lolos")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else ""
    uji() if a == "uji" else main(ambil_rss=a != "ulang")
