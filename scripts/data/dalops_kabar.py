"""Cek Kabar Luar (data/kajian-bnpb/cek-kabar/): untuk tiap kejadian Pantau Dalops yang belum dilaporkan selesai, cari kabar dari luar
laporan resmi (berita yang sudah dipanen situs, data alam yang sudah ada) dan beri label masih / mungkin_selesai / belum_ada.

Label tidak pernah menutup kejadian (KEPUTUSAN D1); ia hanya ditulis ke kolom 'luar' baris yang belum selesai.
Dipanggil dari scripts/data/dalops_banjir.py sebelum tulis(). Aturan "selesai" per jenis dipakai ulang dari modul itu (POLA, surut()).

Uji : python3 scripts/data/dalops_kabar.py --uji      (tanpa jaringan)
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.request

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DASAR = os.environ.get("CEK_KABAR_DASAR", "https://centurisk97.id")
ARSIP = os.path.join(AKAR, "data/raw/dalops")
SIMPAN_HARI = 60      # [BAWAAN SEMENTARA] umur arsip berita lokal
LONGGAR = 1           # [BAWAAN SEMENTARA] hari kelonggaran sebelum laporan resmi terakhir (tanggal laphar = H-1)
MAKS_BUKTI = 5
# [BAWAAN SEMENTARA] Q1: hari senyap minimal untuk "mungkin_selesai" berdasar alam; hanya jenis bersinyal alam
AMBANG = {"banjir": 3, "longsor": 7, "karhutla": 3, "kekeringan": 14}

# jenis -> (berkas berita tayang, berkas alam atau None)
BERKAS = {
    "banjir": ("/banjir/data/berita.json", "/banjir/data/status.json"),
    "longsor": ("/banjir/data/berita.json", "/banjir/data/status.json"),
    "cuaca": ("/banjir/data/berita_cuaca.json", None),
    "gempa": ("/banjir/data/berita_gempa.json", None),
    "kekeringan": ("/banjir/data/berita_kekeringan.json", "/kekeringan/data/gdo.json"),
    "karhutla": ("/data/berita.json", "/data/peta_karhutla_kab.json"),
    "gelombang": ("/banjir/data/berita_pesisir.json", None),
    "permukiman": ("/data/berita.json", None),   # [BAWAAN SEMENTARA] Q2: belum ada umpan sendiri
}
# beberapa jenis berbagi berkas: artikel wajib menyebut jenisnya (ALGORITMA 1.3)
KATA_JENIS = {
    "banjir": re.compile(r"banjir|genang|terendam|meluap|bandang"),
    "longsor": re.compile(r"longsor|tanah bergerak|pergerakan tanah|tertimbun"),
    "gelombang": re.compile(r"\brob\b|gelombang|abrasi|pasang"),
    "karhutla": re.compile(r"kebakaran hutan|kebakaran lahan|karhutla|lahan terbakar|hutan terbakar"),
    "permukiman": re.compile(r"kebakaran (?:rumah|permukiman|pemukiman|pasar|ruko|gedung|bangunan)"),
}
PULIH_UMUM = re.compile(r"kembali normal|warga (?:sudah |telah )?kembali ke rumah|status (?:tanggap )?darurat (?:\w+ )?(?:sudah |telah )?(?:dicabut|berakhir)")
# [BAWAAN SEMENTARA] kata yang menandai kejadian masih berjalan; topik 'kejadian' saja tidak cukup (hampir semua artikel bertopik itu)
AKTIF = re.compile(r"\bmasih\b|terendam|tergenang|mengungsi|pengungsi|evakuasi|terisolir|terisolasi|belum surut|belum padam|terbakar|dalam penanganan|tanggap darurat")
TOPIK_MASIH = {"korban", "penanganan"}
BELUM_PULIH = re.compile(r"belum\s+(?:sepenuhnya\s+)?(?:kembali|normal|dicabut|berakhir|surut|padam)")


def _tgl(s):
    return (s or "")[:10]


def _geser(h, n):
    return (dt.date.fromisoformat(h) + dt.timedelta(days=n)).isoformat()


def _selisih(a, b):
    return (dt.date.fromisoformat(a) - dt.date.fromisoformat(b)).days


# --------------------------------------------------------------- 1. cocok (murni)
def cocok(k, a, jenis, h):
    """artikel a menyebut kejadian k? kab sama (prov saja tidak cukup), tanggal dalam jendela, teks menyebut jenisnya."""
    kab = set(a.get("kab") or [])
    kode = k.get("kab_kode") or []
    if isinstance(kode, str):
        kode = [kode]
    if not any(c in kab for c in kode):
        prov = [c for c in kode if c.endswith("|(provinsi)")]
        if not prov or str(k.get("prov_kode")) not in (a.get("prov") or []):
            return False
    t = _tgl(a.get("tgl"))
    if not t or t < _geser(k["terakhir"], -LONGGAR) or t > h:
        return False
    pola = KATA_JENIS.get(jenis)
    return not pola or bool(pola.search(_teks(a)))


def _teks(a):
    return f"{a.get('judul') or ''} {a.get('ringkas') or ''}".lower()


# --------------------------------------------------------------- 2. arah bukti (murni)
def selesai_jenis(DB, jenis, t):
    """aturan selesai dari teks milik dalops_banjir.py, untuk jenis mana pun tanpa mengubah JENIS globalnya."""
    if jenis == "banjir":
        return DB.surut(t)
    s, b = DB.POLA[jenis]
    return not b.search(t) and bool(s.search(t))


def arah(a, jenis, DB):
    """'pulih', 'masih', atau None (diabaikan)."""
    t = _teks(a)
    if (selesai_jenis(DB, jenis, t) or PULIH_UMUM.search(t)) and not BELUM_PULIH.search(t):
        return "pulih"
    if TOPIK_MASIH & set(a.get("topik") or []) or AKTIF.search(t):
        return "masih"
    return None


# --------------------------------------------------------------- 3. alam (murni)
def _kab_kode_kec(kunci):
    return "|".join(kunci.split("|")[:2])


def alam(jenis, k, data, h):
    """'normal', 'aktif', atau None (tidak ada sinyal / data)."""
    if not data:
        return None
    kode = k.get("kab_kode") or []
    if jenis in ("banjir", "longsor"):
        f = "b" if jenis == "banjir" else "l"
        hari = data.get("hari") or []
        if h not in hari:   # berkas tidak memuat hari ini: tidak ada sinyal, bukan hari yang salah
            return None
        i = hari.index(h)
        lv = [max([x or 0 for x in (v.get(f) or [])[i:i + 2]] or [0]) for kk, v in (data.get("kec") or {}).items() if _kab_kode_kec(kk) in kode]
        if not lv:
            return None
        return "aktif" if max(lv) >= 2 else "normal"   # [BAWAAN SEMENTARA] <= 1 (normal/waspada) dianggap normal
    if jenis == "karhutla":
        hari = [x for x in (data.get("hari") or []) if x <= h]
        if not hari or hari[-1] < _geser(h, -1):   # berkas basi lebih dari sehari: tidak ada sinyal
            return None
        n = len(hari) - 1
        hit = {}
        for c in kode:   # kejadian lintas kab: jumlahkan per hari, jangan saling timpa
            for x in ((data.get("kab") or {}).get(c) or {}).get("d", []):
                if len(x) > 1:
                    hit[x[0]] = hit.get(x[0], 0) + (x[1] or 0)
        if hit.get(n, 0) > 0:
            return "aktif"
        return "normal" if hit.get(n, 0) == 0 and hit.get(n - 1, 0) == 0 else None
    if jenis == "kekeringan":
        kol = data.get("kolom_kab") or []
        if "gdo_spi3" not in kol or "gdo_tanah" not in kol:
            return None
        v = [(data.get("kab") or {}).get(c) for c in kode]
        v = [x for x in v if x]
        if not v:
            return None
        kelas = [x[kol.index(n)] for x in v for n in ("gdo_spi3", "gdo_tanah")]
        if any(c is not None and c >= 1 for c in kelas):
            return "aktif"
        return "normal" if all(c == 0 for c in kelas) else None
    return None


# --------------------------------------------------------------- 4. label (murni)
def label(k, artikel, jenis, h, DB, data_alam=None, gagal=False, kini=None):
    """kolom 'luar' satu kejadian belum selesai."""
    bukti, tgl_cocok = [], []
    for a in artikel:
        if cocok(k, a, jenis, h):
            tgl_cocok.append(_tgl(a.get("tgl")))
            ar = arah(a, jenis, DB)
            if ar:
                bukti.append({"judul": a.get("judul") or "", "media": a.get("sumber") or a.get("domain") or "", "tgl": _tgl(a.get("tgl")),
                              "url": a.get("url") or "", "arah": ar})
    bukti.sort(key=lambda b: b["tgl"], reverse=True)
    m = next((b for b in bukti if b["arah"] == "masih"), None)
    p = next((b for b in bukti if b["arah"] == "pulih"), None)
    senyap = _selisih(h, max([k["terakhir"]] + tgl_cocok))   # artikel cocok mana pun mengakhiri senyap (ALGORITMA 4)
    sinyal = alam(jenis, k, data_alam, h)
    if p and (not m or p["tgl"] > m["tgl"]):
        lb, dasar = "mungkin_selesai", "berita"
    elif m:
        lb, dasar = "masih", "berita"
    elif jenis in AMBANG and senyap >= AMBANG[jenis] and sinyal == "normal":
        lb, dasar = "mungkin_selesai", "alam"
    else:
        lb, dasar = "belum_ada", None
    return {"label": lb, "dasar": dasar, "senyap": max(senyap, 0), "alam": sinyal, "bukti": bukti[:MAKS_BUKTI],
            "catatan": "sumber tidak terjangkau" if gagal else None, "dicek": kini}


def periksa(rows, h, jenis, bahan, DB, kini=None):
    """isi/hapus kolom 'luar' semua baris. bahan = {'artikel': [...], 'alam': {...}|None, 'gagal': bool}."""
    bahan = bahan or {"artikel": [], "alam": None, "gagal": True}
    for r in rows:
        if r.get("surut"):
            r.pop("luar", None)
            continue
        r["luar"] = label(r, bahan["artikel"], jenis, h, DB, bahan.get("alam"), bahan.get("gagal"), kini)
    return rows


def arsipkan(rows, h, jenis, path=None):
    """label hari ini -> cek_arsip.jsonl, append-only, satu baris per (hari, jenis, id)."""
    path = path or os.path.join(ARSIP, "cek_arsip.jsonl")
    ada = set()
    if os.path.exists(path):
        for l in open(path, encoding="utf-8"):
            try:
                x = json.loads(l)
                ada.add((x["hari"], x["jenis"], x["id"]))
            except (ValueError, KeyError):
                pass
    baru = [{"hari": h, "jenis": jenis, "id": r["id"], "kab_kode": r.get("kab_kode"), "label": r["luar"]["label"],
             "dasar": r["luar"]["dasar"], "senyap": r["luar"]["senyap"]} for r in rows if r.get("luar") and not r["luar"].get("catatan") and (h, jenis, r["id"]) not in ada]   # sumber gagal: jangan bekukan label setengah
    if baru:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            for x in baru:
                f.write(json.dumps(x, ensure_ascii=False) + "\n")
    return len(baru)


# --------------------------------------------------------------- 5. bahan (jaringan, arsip lokal)
_CACHE = {}


def _unduh(rel):
    if rel not in _CACHE:
        _CACHE[rel] = None
        for coba in (1, 2):   # berkas berita 1,5 MB: satu kali coba ulang
            try:
                req = urllib.request.Request(DASAR + rel, headers={"user-agent": "centurisk97-dalops-cek"})
                with urllib.request.urlopen(req, timeout=90) as r:
                    _CACHE[rel] = json.load(r)
                break
            except Exception as x:   # satu sumber gagal tidak menghentikan jalan (ALUR 3)
                print(f"cek kabar: {rel} tidak terjangkau, percobaan {coba} ({x})")
    return _CACHE[rel]


def gabung_arsip(lama, baru, h, simpan=SIMPAN_HARI):
    """gabung artikel per id, buang yang lebih tua dari 'simpan' hari sebelum h (murni)."""
    batas = _geser(h, -simpan)
    per = {a["id"]: a for a in lama if a.get("id")}
    per.update({a["id"]: a for a in baru if a.get("id")})
    return sorted([a for a in per.values() if _tgl(a.get("tgl")) >= batas], key=lambda a: a.get("tgl") or "", reverse=True)


def muat_bahan(jenis, h, arsip_dir=None):
    """berita tayang (digabung ke arsip lokal) + data alam untuk satu jenis."""
    berita, f_alam = BERKAS[jenis]
    arsip_dir = arsip_dir or os.path.join(ARSIP, "berita_arsip")
    p = os.path.join(arsip_dir, os.path.basename(berita))
    try:
        with open(p, encoding="utf-8") as f:
            lama = json.load(f).get("artikel", [])
    except (OSError, ValueError):   # belum ada atau rusak: mulai dari berkas tayang saja
        lama = []
    tayang = _unduh(berita)
    artikel = gabung_arsip(lama, (tayang or {}).get("artikel") or [], h)
    if tayang:
        os.makedirs(arsip_dir, exist_ok=True)
        sementara = p + ".tmp"
        with open(sementara, "w", encoding="utf-8") as f:
            json.dump({"diperbarui": h, "artikel": artikel}, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(sementara, p)   # atomik: berkas setengah tertulis tidak pernah dibaca
    data_alam = _unduh(f_alam) if f_alam else None
    return {"artikel": artikel, "alam": data_alam, "gagal": tayang is None or (f_alam is not None and data_alam is None)}


# --------------------------------------------------------------- uji (tanpa jaringan)
def uji():
    import importlib.util
    s = importlib.util.spec_from_file_location("dalops_banjir", os.path.join(AKAR, "scripts/data/dalops_banjir.py"))
    DB = importlib.util.module_from_spec(s)
    s.loader.exec_module(DB)
    H = "2026-11-10"
    K = lambda kode=("33|Kudus",), terakhir="2026-11-05", prov="33", **x: {"id": "k1", "kab_kode": list(kode), "prov_kode": prov, "terakhir": terakhir, "surut": False, **x}
    A = lambda judul, tgl="2026-11-08", kab=("33|Kudus",), prov=("33",), topik=("kejadian",), i=None: {
        "id": i or judul[:12], "judul": judul, "ringkas": "", "sumber": "Media", "tgl": tgl + "T10:00+07:00", "kab": list(kab), "prov": list(prov), "topik": list(topik), "url": "https://x.id/" + (i or "a")}
    L = lambda k, art, jenis="banjir", alam_=None, gagal=False: label(k, art, jenis, H, DB, alam_, gagal)
    # P1 masih
    r = L(K(), [A("Ratusan warga Kudus masih mengungsi akibat banjir")])
    assert (r["label"], r["dasar"]) == ("masih", "berita") and len(r["bukti"]) == 1, r
    # P1b pencegahan saja diabaikan
    assert L(K(), [A("Antisipasi banjir, BPBD bersihkan saluran", topik=("kejadian", "pencegahan"))])["label"] == "belum_ada"
    # P1c longsor tidak cocok artikel banjir saja
    assert L(K(), [A("Warga Kudus masih mengungsi akibat banjir")], "longsor")["label"] == "belum_ada"
    # P1d dua kab
    assert L(K(kode=("33|Pati", "33|Kudus")), [A("Banjir Kudus, warga masih mengungsi")])["label"] == "masih"
    # P2 prov saja tidak cocok
    assert L(K(), [A("Banjir Jawa Tengah, warga masih mengungsi", kab=())])["label"] == "belum_ada"
    # P3 pulih
    r = L(K(), [A("Banjir di Kudus sudah surut, warga kembali ke rumah")])
    assert (r["label"], r["dasar"], r["bukti"][0]["arah"]) == ("mungkin_selesai", "berita", "pulih"), r
    # P4 mulai surut bukan pulih, tanpa kata aktif: diabaikan
    assert arah(A("Banjir Demak, air mulai surut"), "banjir", DB) is None
    # P5 yang lebih baru menang; P6 seri = masih
    assert L(K(), [A("Banjir Kudus sudah surut", "2026-11-09", i="p"), A("Banjir Kudus, warga masih mengungsi", "2026-11-10", i="m")])["label"] == "masih"
    assert L(K(), [A("Banjir Kudus sudah surut", "2026-11-09", i="p2"), A("Banjir Kudus, warga masih mengungsi", "2026-11-08", i="m2")])["label"] == "mungkin_selesai"
    assert L(K(), [A("Banjir Kudus sudah surut", "2026-11-09", i="p3"), A("Banjir Kudus, warga masih mengungsi", "2026-11-09", i="m3")])["label"] == "masih"
    # jendela tanggal: artikel jauh sebelum laporan terakhir tidak dihitung, H-1 masih dihitung
    assert L(K(), [A("Banjir Kudus, warga masih mengungsi", "2026-11-01")])["label"] == "belum_ada"
    assert L(K(), [A("Banjir Kudus, warga masih mengungsi", "2026-11-04")])["label"] == "masih"
    # P7 / P8 alam banjir
    st = lambda b: {"hari": ["2026-11-10", "2026-11-11"], "kec": {"33|Kudus|Jati": {"b": b, "l": [0, 0]}, "33|Pati|Juwana": {"b": [3, 3], "l": [0, 0]}}}
    r = L(K(), [], alam_=st([1, 0]))
    assert (r["label"], r["dasar"], r["alam"], r["senyap"]) == ("mungkin_selesai", "alam", "normal", 5), r
    assert L(K(), [], alam_=st([2, 0]))["label"] == "belum_ada"
    assert L(K(terakhir="2026-11-09"), [], alam_=st([0, 0]))["label"] == "belum_ada"   # senyap 1 < ambang 3
    # P8b cuaca tanpa sinyal alam
    assert L(K(terakhir="2026-10-31"), [], "cuaca")["label"] == "belum_ada"
    # P9 gempa tingkat provinsi
    assert L(K(kode=("53|(provinsi)",), prov="53"), [A("Gempa NTT, pengungsi masih bertahan di tenda", kab=(), prov=("53",))], "gempa")["label"] == "masih"
    # P10 gagal unduh
    r = L(K(), [], gagal=True)
    assert (r["label"], r["catatan"]) == ("belum_ada", "sumber tidak terjangkau"), r
    # P13 bukti maksimal 5, terbaru dulu
    r = L(K(), [A(f"Banjir Kudus, warga masih mengungsi {i}", f"2026-11-0{i}", i=str(i)) for i in range(5, 10)] + [A("Banjir Kudus masih tergenang", "2026-11-10", i="z")])
    assert len(r["bukti"]) == 5 and r["bukti"][0]["tgl"] == "2026-11-10", r["bukti"]
    # alam karhutla dan kekeringan
    pk = {"hari": ["2026-11-08", "2026-11-09", "2026-11-10"], "kab": {"14|Pelalawan": {"d": [[0, 5, 0], [2, 3, 0]]}, "14|Siak": {"d": [[0, 4, 0]]}}}
    assert alam("karhutla", {"kab_kode": ["14|Pelalawan"]}, pk, H) == "aktif" and alam("karhutla", {"kab_kode": ["14|Siak"]}, pk, H) == "normal"
    gd = {"kolom_kab": ["kita_spi3", "gdo_spi3", "gdo_tanah"], "kab": {"35|Tuban": [3, 0, 0], "35|Gresik": [0, 1, 0]}}
    assert alam("kekeringan", {"kab_kode": ["35|Tuban"]}, gd, H) == "normal" and alam("kekeringan", {"kab_kode": ["35|Gresik"]}, gd, H) == "aktif"
    # KATA_JENIS gelombang dan permukiman
    assert L(K(kode=("33|Rembang",)), [A("Banjir rob Rembang, warga masih mengungsi", kab=("33|Rembang",))], "gelombang")["label"] == "masih"
    assert L(K(kode=("12|Deli Serdang",)), [A("Kebakaran rumah di Deli Serdang, api berhasil dipadamkan", kab=("12|Deli Serdang",))], "permukiman")["label"] == "mungkin_selesai"
    assert L(K(kode=("12|Deli Serdang",)), [A("Kebakaran lahan di Deli Serdang masih terbakar", kab=("12|Deli Serdang",))], "permukiman")["label"] == "belum_ada"
    # karhutla lintas kab: dijumlah, bukan saling timpa; berkas basi = tanpa sinyal
    pk2 = {"hari": ["2026-11-09", "2026-11-10"], "kab": {"14|A": {"d": [[1, 5, 0]]}, "14|B": {"d": [[1, 0, 0]]}}}
    assert alam("karhutla", {"kab_kode": ["14|A", "14|B"]}, pk2, H) == "aktif"
    assert alam("karhutla", {"kab_kode": ["14|A"]}, {"hari": ["2026-11-07", "2026-11-08"], "kab": {}}, H) is None
    # status.json tanpa hari ini = tanpa sinyal; None di level tidak meledak
    assert alam("banjir", {"kab_kode": ["33|Kudus"]}, {"hari": ["2026-11-01"], "kec": {"33|Kudus|Jati": {"b": [3]}}}, H) is None
    assert alam("banjir", {"kab_kode": ["33|Kudus"]}, {"hari": [H], "kec": {"33|Kudus|Jati": {"b": [None, 1]}}}, H) == "normal"
    # "belum kembali normal" bukan pulih
    assert arah(A("Banjir Kudus, kondisi belum sepenuhnya kembali normal"), "banjir", DB) != "pulih"
    # senyap diakhiri artikel cocok walau diabaikan (pencegahan)
    assert L(K(terakhir="2026-11-01"), [A("Banjir Kudus, BPBD bersihkan saluran", "2026-11-09", topik=("pencegahan",))], alam_=st([0, 0]))["senyap"] == 1
    # P10 bahan None / gagal lewat periksa
    rw = [K()]
    periksa(rw, H, "banjir", None, DB)
    assert rw[0]["luar"]["catatan"] == "sumber tidak terjangkau"
    # baris belum selesai dari R2 dengan 'luar' basi ditimpa
    rw = [{**K(), "luar": {"label": "mungkin_selesai", "bukti": []}}]
    periksa(rw, H, "banjir", {"artikel": [A("Banjir Kudus masih tergenang")], "alam": None, "gagal": False}, DB)
    assert rw[0]["luar"]["label"] == "masih"
    # P12 periksa: baris selesai kehilangan 'luar' lama
    rows = [K(), {**K(), "id": "k2", "surut": True, "luar": {"label": "masih"}}]
    periksa(rows, H, "banjir", {"artikel": [A("Banjir Kudus masih tergenang")], "alam": None, "gagal": False}, DB, "2026-11-10T07:00+07:00")
    assert rows[0]["luar"]["label"] == "masih" and "luar" not in rows[1], rows
    # P11 arsip append-only
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "a.jsonl")
        assert arsipkan(rows, H, "banjir", p) == 1 and arsipkan(rows, H, "banjir", p) == 0
        assert arsipkan([{**K(), "id": "k9", "luar": L(K(), [], gagal=True)}], H, "banjir", p) == 0   # label saat sumber gagal tidak dibekukan
        assert len(open(p).read().splitlines()) == 1
    # arsip berita: gabung per id, buang yang lebih tua dari 60 hari
    g = gabung_arsip([{"id": "a", "tgl": "2026-08-01"}, {"id": "b", "tgl": "2026-11-01", "judul": "lama"}], [{"id": "b", "tgl": "2026-11-01", "judul": "baru"}, {"id": "c", "tgl": "2026-11-09"}], H)
    assert [a["id"] for a in g] == ["c", "b"] and g[1]["judul"] == "baru", g
    print("uji dalops_kabar: lulus")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    else:
        print(__doc__)
