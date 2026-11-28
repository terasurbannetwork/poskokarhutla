"""Dampak peringatan dini (DP-02): bagian pembaca. Python 3.12 stdlib.

Umpan CAP dari Worker kita (GET /api/cuaca/nowcast, bukan scripts/banjir/peringatan.py, D2) -> peringatan aktif, bahaya
(ALGORITMA 2), kab tersentuh (poligon berpotongan dengan batas kab public/geo/kabupaten/, D35), sidik himpunan poligon.
Tidak menghitung penduduk/fasilitas: kaitkan di hook hitung_paparan (DP-03) dan hitung_fasilitas (DP-04).
Kosong = "tidak ada peringatan aktif" (bukan 0); sumber basi/mati = "belum terukur" (R null).

Pakai: python3 -I scripts/siklus/dampak_peringatan.py --cek
       python3 -I scripts/siklus/dampak_peringatan.py [--base URL] [--kini ISO] [--lama sidik.json] [--keluar hasil.json]
"""
import argparse, datetime as dt, glob, hashlib, importlib.util, json, os, re, sys, threading, time, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
BASE_BAWAAN = os.environ.get("DAMPAK_BASE", "https://centurisk97.id")
SEGAR_JAM = 3  # ALGORITMA 1: umpan CAP paling lama 3 jam
# D32: kata yang tidak boleh ada di teks buatan kita; JS kembarannya di tests/dampak-peringatan/kata_dilarang.mjs (gerbang DP-22).
KATA_DILARANG = ("aman", "dijamin", "terdampak", "korban", "bebas", "padam")
TIDAK_ADA = "tidak ada peringatan aktif"
BELUM = "belum terukur"
# (kata kunci, bahaya, kode prakiraan); urutan penting: hujan lebat dulu. Hanya "hujan lebat" terbukti ada di umpan (DP-01).
PEMETAAN = (("hujan sangat lebat", "banjir_longsor", ("BNJ", "LSR")), ("hujan lebat", "banjir_longsor", ("BNJ", "LSR")),
            ("angin kencang", "cuaca_ekstrem", ("CEX",)), ("puting beliung", "cuaca_ekstrem", ("CEX",)))
# R dari severitas CAP: tabel terkunci bersama kriteria lain (dampak_peringatan_kriteria.json), bukan angka di kode
_KRIT = json.load(open(os.path.join(AB, "dampak_peringatan_kriteria.json"), encoding="utf-8"))
SEVERITAS = _KRIT["severitas"]
RADIUS_KHT = _KRIT["karhutla"]["radius_km"]   # K17, DP-25: zona karhutla = kluster api aktif + radius ini (tertulis di kriteria, bukan di kode)
MAKS_KAB_KHT = _KRIT["karhutla"]["maks_kab_per_putaran"]
# nama di public/geo/kabupaten/ yang salah eja terhadap scripts/udara/kota.json
ALIAS_KAB = {"75|Pahuwato": "7504"}


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


def _waktu(s):
    d = dt.datetime.fromisoformat(re.sub(r"\.\d+(?=Z|[+-]\d\d:|$)", "", s).replace("Z", "+00:00"))  # 3.9 tak paham "Z" dan pecahan
    return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)


# ---------- umpan ----------
def _unduh(base, batas):
    rq = urllib.request.Request(base.rstrip("/") + "/api/cuaca/nowcast", headers={"User-Agent": "centurisk97-dampak/1"})
    with urllib.request.urlopen(rq, timeout=batas) as r:
        d = json.load(r)
    return d if isinstance(d, dict) and isinstance(d.get("nowcast"), list) else None


def baca_umpan(base=BASE_BAWAAN, batas=20, unduh=None):
    """Batas keras `batas` detik per percobaan (utas daemon, jadi aliran yang menetes pun tak menggantung), satu ulang.
    Gagal dua kali -> None (R null = belum terukur, bukan 0 dan bukan galat)."""
    unduh = unduh or _unduh
    for _ in range(2):
        h = []
        t = threading.Thread(target=lambda: h.append(_aman(unduh, base, batas)), daemon=True)
        t.start()
        t.join(batas + 2)
        if h and h[0] is not None:
            return h[0]
    return None


def _aman(unduh, base, batas):
    try:
        return unduh(base, batas)
    except Exception:
        return None


def status_umpan(doc, kini):
    """-> ("segar"|"basi"|"mati", umur_jam|None)."""
    if not doc or not doc.get("dibuat"):
        return "mati", None
    try:
        umur = (kini - _waktu(doc["dibuat"])).total_seconds() / 3600
    except ValueError:
        return "mati", None
    return ("segar" if umur <= SEGAR_JAM else "basi"), round(umur, 2)


def bahaya_dari_event(event):
    """Nama peristiwa CAP -> (bahaya, kode) atau None (jatuh ke tak_dipetakan)."""
    e = re.sub(r"[^\w\s]", " ", (event or "").lower())
    e = " ".join(e.split())
    return next(((b, k) for kata, b, k in PEMETAAN if kata in e), None)


def cincin_sah(r):
    """Cincin >= 4 titik dan tertutup (ALGORITMA 3.0)."""
    return isinstance(r, list) and len(r) >= 4 and r[0] == r[-1] and all(isinstance(p, list) and len(p) >= 2 for p in r)


def peringatan_aktif(doc, kini):
    """-> (aktif[{id,bahaya,kode,tingkat_bmkg,selesai,wilayah,poligon:[cincin]}], tak_dipetakan{n,nama}, catatan[])"""
    aktif, tak, catatan = [], {}, []
    for p in doc.get("nowcast") or []:
        try:
            if _waktu(p["selesai"]) <= kini:
                continue
        except (KeyError, ValueError):
            catatan.append(f"{p.get('id')}: waktu selesai tak terbaca")
            continue
        b = bahaya_dari_event(p.get("event"))
        if not b:
            tak[p.get("event") or "(tanpa nama)"] = 1
            continue
        sah = [c for c in (p.get("polygon") or []) if cincin_sah(c)]
        if len(sah) < len(p.get("polygon") or []):
            catatan.append(f"{p.get('id')}: {len(p['polygon']) - len(sah)} cincin dibuang (kurang dari 4 titik atau tak tertutup)")
        aktif.append({"id": p.get("id"), "event": p.get("event"), "severity": p.get("severity"), "mulai": p.get("mulai"), "sumber_url": p.get("url") or p.get("web"), "bahaya": b[0], "kode": list(b[1]), "tingkat_bmkg": SEVERITAS.get((p.get("severity") or "").lower(), 1),
                      "selesai": p.get("selesai"), "wilayah": p.get("wilayah"), "poligon": sah})
    return aktif, {"n": len(tak), "nama": sorted(tak)}, catatan


# ---------- geometri kab ----------
_KAB = None


def muat_kab():
    """{kab4: {nama, bagian (cincin PB), kotak}} dari public/geo/kabupaten/<prov>.json."""
    global _KAB
    if _KAB is None:
        PB = _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
        kk = _muat("sk_hvc", "scripts/bnpb/hvc_dasar.py").kab_kode()
        _KAB = {}
        for f in sorted(glob.glob(os.path.join(AKAR, "public/geo/kabupaten/*.json"))):
            prov = os.path.basename(f)[:2]
            for ft in json.load(open(f, encoding="utf-8"))["features"]:
                k = f"{prov}|{ft['properties']['kab']}"
                kab4 = kk.get(k) or ALIAS_KAB.get(k)
                if kab4:
                    bg = PB.cincin(ft["geometry"])
                    _KAB[kab4] = {"nama": ft["properties"]["kab"], "bagian": bg, "kotak": PB.kotak_cincin(bg)}
    return _KAB


def _silang(a, b, c, d):
    """Ruas ab dan cd berpotongan, TERMASUK bersentuhan di ujung atau tepi (poligon yang hanya menyentuh tepi kab tak boleh terlewat)."""
    def o(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    if max(a[0], b[0]) < min(c[0], d[0]) or max(c[0], d[0]) < min(a[0], b[0]) or max(a[1], b[1]) < min(c[1], d[1]) or max(c[1], d[1]) < min(a[1], b[1]):
        return False
    return o(a, b, c) * o(a, b, d) <= 0 and o(c, d, a) * o(c, d, b) <= 0


def berpotongan(cincin, bagian, kotak, PB=None):
    """Cincin poligon peringatan vs geometri kab: kotak dulu, lalu titik-dalam kedua arah dan perpotongan ruas (D35: poligon kecil tak terlewat)."""
    PB = PB or _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
    xs, ys = [p[0] for p in cincin], [p[1] for p in cincin]
    if max(xs) < kotak[0] or min(xs) > kotak[2] or max(ys) < kotak[1] or min(ys) > kotak[3]:
        return False
    if any(PB.di_geom(p[0], p[1], bagian) for p in cincin):
        return True
    if any(_dalam_ring(luar[0], cincin) for luar, _ in bagian):
        return True
    for luar, _ in bagian:
        for a, b in zip(luar, luar[1:]):
            if max(a[0], b[0]) < min(xs) or min(a[0], b[0]) > max(xs) or max(a[1], b[1]) < min(ys) or min(a[1], b[1]) > max(ys):
                continue
            if any(_silang(a, b, c, d) for c, d in zip(cincin, cincin[1:])):
                return True
    return False


def _dalam_ring(p, r):
    x, y, d = p[0], p[1], False
    for a, b in zip(r, r[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            d = not d
    return d


def kab_tersentuh(aktif, kab=None):
    """-> ({kode_bahaya: {kab4: R}}, di_luar_wilayah[id]); R = maksimum tingkat_bmkg peringatan yang menyentuhnya."""
    kab = kab if kab is not None else muat_kab()
    PB = _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
    hasil, luar = {}, []
    for p in aktif:
        kena = {k4 for k4, v in kab.items() if any(berpotongan(c, v["bagian"], v["kotak"], PB) for c in p["poligon"])}
        p["kab"] = sorted(kena)
        if not kena:
            luar.append(p["id"])
        for kode in p["kode"]:
            h = hasil.setdefault(kode, {})
            for k4 in kena:
                h[k4] = max(h.get(k4, 0), p["tingkat_bmkg"])
    return hasil, luar


def sidik_poligon(aktif):
    """16 heksa dari himpunan poligon per bahaya (urutan & id tak berpengaruh)."""
    baris = sorted(json.dumps([p["bahaya"], c], separators=(",", ":")) for p in aktif for c in p["poligon"])
    return hashlib.sha256("\n".join(baris).encode()).hexdigest()[:16]


# ---------- pembulatan, daftar izin publik (ALGORITMA 4, D5) ----------
def bulat(n):
    """Satu fungsi pembulatan di keluaran: None tetap None; 0 dihitung tetap 0; 1..9 'kurang dari 10'; 10..99 puluhan (setengah naik); >= 100 dua angka penting."""
    if n is None or isinstance(n, str):
        return n
    n = int(n + 0.5)
    if n == 0:
        return 0
    if n < 10:
        return "kurang dari 10"
    p = 10 if n < 100 else 10 ** (len(str(n)) - 2)
    return int(n / p + 0.5) * p


MAKS_TITIK_KELAS = 1000   # sel per kab dan bahaya yang dibaca dari raster InaRISK (5 panggilan, jeda 2 dtk)
KUNCI_IZIN_KAB = ("terliput", "nama", "penduduk_area_peringatan", "jiwa_kelas", "kelas_sampel", "alasan", "label", "dasar")  # daftar izin entri kab di berkas publik
KUNCI_TERLARANG = ("desa", "kd", "jiwa_jk", "rentan", "balita", "lansia", "titik", "nama_fasilitas", "fasilitas_nama")


def saring_publik(entri):
    return {k: entri[k] for k in KUNCI_IZIN_KAB if k in entri}


def kunci_terlarang(o, jalur=""):
    """Jalur kunci terlarang di mana pun, termasuk bersarang (P5, P16)."""
    if isinstance(o, dict):
        return [f"{jalur}/{k}" for k in o if k in KUNCI_TERLARANG] + [x for k, v in o.items() for x in kunci_terlarang(v, f"{jalur}/{k}")]
    return [x for i, v in enumerate(o) for x in kunci_terlarang(v, f"{jalur}/{i}")] if isinstance(o, list) else []


# ---------- hook tiket lanjutan ----------
BAHAYA_KODE = {"BNJ": "banjir", "LSR": "longsor", "CEX": "cuaca_ekstrem", "KHT": "karhutla"}   # kunci zona; hanya banjir dan longsor punya raster kelas (Q6)
_DESA_NAMA = {}


def _nama_desa(kab4, x, y, PB, desa_cari):
    """(kd, nama) desa yang poligonnya memuat titik pusat Dukcapil; poligon public/geo/desa/NN.NN.json + nama desa_cari.json (D35). Tak ketemu: (None, None)."""
    k = f"{kab4[:2]}.{kab4[2:]}"
    if k not in _DESA_NAMA:
        f = os.path.join(AKAR, "public/geo/desa", k + ".json")
        _DESA_NAMA[k] = [(ft["properties"]["kd"], PB.cincin(ft["geometry"])) for ft in json.load(open(f, encoding="utf-8"))["features"]] if os.path.exists(f) else []
    for kd, bg in _DESA_NAMA[k]:
        if PB.di_geom(x, y, bg):
            return kd, desa_cari.get(kd)
    return None, None


MAKS_BARU_PER_PUTARAN = 3000   # sel yang boleh dibaca ke InaRISK dalam satu putaran (15 panggilan, ~30 dtk); sisanya menunggu putaran berikut


def kelas_bercache(bhy, k4, ada, kelas_fn, anggaran, dir_cache):
    """H per sel dari cache disk data/raw/siklus/kelas_sel/<kab4>_<bahaya>.json (indeks bahaya statis, kunci 'i,j'); hanya sel belum ada yang ke InaRISK,
    paling banyak `anggaran[0]` per putaran. Nodata disimpan -1; kumpulan yang semuanya None (diduga gagal) tidak di-cache. -> ({(i, j): H}, penuh): sel yang belum terbaca tidak ada di hasil."""
    f = os.path.join(dir_cache, f"{k4}_{bhy}.json")
    ada_c = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {}
    baru = [c for c in ada if f"{c[0]},{c[1]}" not in ada_c][:max(anggaran[0], 0)]
    if baru:
        anggaran[0] -= len(baru)
        hs = kelas_fn(bhy, [(c[5], c[6]) for c in baru])
        if any(h is not None for h in hs):   # seluruh kumpulan None dianggap gagal ambil: tidak di-cache; selain itu None = nodata, disimpan -1 (kelas tak terliput)
            ada_c.update({f"{c[0]},{c[1]}": (-1 if h is None else h) for c, h in zip(baru, hs)})
        os.makedirs(dir_cache, exist_ok=True)
        json.dump(ada_c, open(f, "w", encoding="utf-8"), separators=(",", ":"))
    kh = {(c[0], c[1]): ada_c[f"{c[0]},{c[1]}"] for c in ada if f"{c[0]},{c[1]}" in ada_c}
    return kh, len(kh) == len(ada)


_LAZY = {}


def _lazy(k, f):
    if k not in _LAZY:
        _LAZY[k] = f()
    return _LAZY[k]


def hitung_paparan(aktif, tersentuh, sel_fn=None, desa_fn=None, kelas_fn=None, wp_semua=None, nama_fn=None, dir_kelas=None):
    """DP-03: penduduk dan kelas bahaya per kab tersentuh lewat paparan.py (satu mesin: zona_dari_bagian + hitung_kab + hitung_desa).
    -> {"kab": {kode: {kab4: entri publik, sudah bulat}}, "desa": {kode: {kab4: {kd: {...}}}} (STAF, tidak ke public/)}.
    Kab tanpa grid bangunan: terliput False, jiwa None (bukan 0), kab lain tetap dihitung. Tiga sumber jiwa berdampingan, tidak dijumlah.
    sel_fn(prov, kab4) -> (sel, lat0, lon0, step, nama, w); desa_fn(prov, kab4, w); kelas_fn(bahaya, titik) -> [H|None]; semuanya bisa diganti untuk uji."""
    P = _muat("sk_paparan", "scripts/siklus/paparan.py")
    sel_fn = sel_fn or P.sel_kab
    cache = os.path.join(AKAR, "data/raw/siklus")
    desa_fn = desa_fn or (lambda prov, k4, w: P.desa_dukcapil(prov, k4, w, cache))
    kelas_fn = kelas_fn or P.HK.sampel
    if wp_semua is None:
        wp_semua = _lazy("wp", lambda: json.load(open(os.path.join(AKAR, "public/data/penduduk.json"), encoding="utf-8"))["kec"])
    if nama_fn is None:
        dc = _lazy("desa_cari", lambda: {r[0]: r[1] for r in json.load(open(os.path.join(AKAR, "public/data/desa_cari.json"), encoding="utf-8"))["baris"]})
        nama_fn = lambda k4, x, y: _nama_desa(k4, x, y, P.PB, dc)
    muat_kab_, anggaran = {}, [MAKS_BARU_PER_PUTARAN]
    cache_kelas = dir_kelas or os.path.join(cache, "kelas_sel")
    kab_out, desa_out = {}, {}
    for kode, per_kab in sorted(tersentuh.items()):
        bhy = BAHAYA_KODE[kode]
        geoms = [g for p in aktif if kode in p["kode"] for g in (p["geoms"] if "geoms" in p else [{"type": "Polygon", "coordinates": [c]} for c in p["poligon"]])]
        zona = P.zona_dari_bagian(geoms, bhy, "peringatan", RADIUS_KHT if kode == "KHT" else 0.0)
        for k4 in sorted(per_kab):
            try:
                if k4 not in muat_kab_:
                    sel, _, _, _, nama, w = sel_fn(k4[:2], k4)
                    if not sel:
                        raise OSError("tidak ada sel halus (kab tidak terliput)")
                    muat_kab_[k4] = (sel, nama, desa_fn(k4[:2], k4, w))
                sel, nama, desa = muat_kab_[k4]
                wp = {k.split("|", 2)[2]: v for k, v in wp_semua.items() if k.startswith(f"{k4[:2]}|{nama}|")}
                j = P.hitung_kab(sel, [zona], desa, wp)["zona"][bhy]["per_zona"]["peringatan"]["jiwa"]
                kh, sampel_kelas = None, False
                if bhy in P.HK._T.LAPISAN and kode != "KHT":   # karhutla: kelas InaRISK tidak diminta K17
                    ada = [c for c in sel if zona["fn"](c[5], c[6])]
                    langkah = -(-len(ada) // MAKS_TITIK_KELAS) if ada else 1   # zona besar disampel; pilihan sel menurut id sel (stabil antar putaran, cache terpakai)
                    ada = [c for c in ada if (c[0] * 31 + c[1]) % langkah == 0] if langkah > 1 else ada
                    kh, penuh = kelas_bercache(bhy, k4, ada, kelas_fn, anggaran, cache_kelas)
                    sampel_kelas = langkah > 1 or not penuh
                hd = P.hitung_desa(sel, zona, desa, kh)
            except (Exception, SystemExit) as e:
                kab_out.setdefault(kode, {})[k4] = {"terliput": False, "nama": None,
                                                    "penduduk_area_peringatan": None, "jiwa_kelas": None, "alasan": f"{BELUM}: {str(e)[:120]}"}
                continue
            jk = {c: (sum(r["jiwa_kelas"][c] for r in hd.values()) if kh is not None and hd else None) for c in ("tinggi", "sedang", "rendah", "tak_terliput")}
            kab_out.setdefault(kode, {})[k4] = {"terliput": True, "nama": nama,
                                                "penduduk_area_peringatan": {s: bulat(v) for s, v in j.items()},
                                                "jiwa_kelas": {c: bulat(v) for c, v in jk.items()} if kh is not None else None, "kelas_sampel": sampel_kelas, "alasan": None,
                                                **({"label": "perkiraan", "dasar": f"kluster api aktif dan radius {RADIUS_KHT} km"} if kode == "KHT" else {})}
            dd = desa_out.setdefault(kode, {}).setdefault(k4, {})
            xy = {d[0]: (d[2], d[3]) for d in desa}
            for did, r in hd.items():
                kd, nm = nama_fn(k4, *xy[did])
                dd[kd or f"oid-{did}"] = {"nama": nm, "jiwa_dukcapil": bulat(r["jiwa"]), "balita": bulat(r["balita"]), "lansia": bulat(r["lansia"]),
                                          "jiwa_kelas": None if r["jiwa_kelas"] is None else {c: bulat(v) for c, v in r["jiwa_kelas"].items()},
                                          "jiwa_jk": {"laki": bulat(r["jiwa_jk"][0]), "perempuan": bulat(r["jiwa_jk"][1]), "label": "perkiraan"}}
    return {"kab": kab_out, "desa": desa_out}


def paparan_publik(paparan):
    """Bagian paparan yang boleh masuk berkas publik: entri kab lewat daftar izin, tanpa desa. Gagal keras bila masih ada kunci terlarang."""
    if not paparan:
        return None
    o = {kode: {k4: saring_publik(e) for k4, e in d.items()} for kode, d in paparan["kab"].items()}
    assert not kunci_terlarang(o), kunci_terlarang(o)
    return o


SUMBER_FAS = {("sekolah", "dapodik"): "sekolah_dapodik", ("madrasah", "dapodik"): "madrasah_dapodik", ("kesehatan", "fasilitas-repo"): "faskes_osm"}
MAKS_STAF_FAS = 3000   # ponytail: daftar bernama per kab dan bahaya dipotong di sini; naikkan bila staf perlu lebih


def _titik_prov(prov):
    """Titik fasilitas berkoordinat satu provinsi per sumber: sekolah.json (Dapodik/EMIS) dan fasilitas.json (rs, faskes; OSM). {sumber: [{kat, lon, lat, nama}]}."""
    def muat():
        F = _muat("sk_fasilitas", "scripts/siklus/fasilitas.py")
        o = {}
        sk = json.load(open(os.path.join(AKAR, "public/data/sekolah.json"), encoding="utf-8"))
        i = {k: n for n, k in enumerate(sk["kolom"])}
        for r in sk["baris"]:
            if r[i["lat"]] is not None and r[i["lon"]] is not None:
                o.setdefault(r[i["prov"]], {}).setdefault("dapodik", []).append({"kat": "madrasah" if r[i["jenjang"]] in F.MADRASAH else "sekolah", "lon": r[i["lon"]], "lat": r[i["lat"]], "nama": r[i["nama"]]})
        for f in json.load(open(os.path.join(AKAR, "public/data/fasilitas.json"), encoding="utf-8")):
            if f.get("t") in ("rs", "faskes"):
                o.setdefault(f["prov"], {}).setdefault("fasilitas-repo", []).append({"kat": "kesehatan", "lon": f["lon"], "lat": f["lat"], "nama": f.get("nama")})
        return o
    return _lazy("titik_fas", muat).get(prov, {})


def hitung_fasilitas(aktif, tersentuh, kab=None, titik_fn=None, nama_fn=None):
    """DP-04: fasilitas dalam zona yang sama dengan paparan, lewat fasilitas.py (F2.4). Per sumber, tidak dijumlah, tanpa de-duplikasi.
    -> {"kab": {kode: {kab4: {sekolah_dapodik, madrasah_dapodik, faskes_osm}}}, "staf": {kode: {kab4: [{kat, sumber, nama, lon, lat, kd, desa}]}}}.
    Angka hanya cacahan (bukan estimasi): dibulatkan hanya bila 100 ke atas. Sumber tanpa satu titik pun di kab itu: null (bukan 0). Daftar bernama hanya `staf`."""
    P = _muat("sk_paparan", "scripts/siklus/paparan.py")
    F = _muat("sk_fasilitas", "scripts/siklus/fasilitas.py")
    kab = kab if kab is not None else muat_kab()
    if nama_fn is None:
        dc = _lazy("desa_cari", lambda: {r[0]: r[1] for r in json.load(open(os.path.join(AKAR, "public/data/desa_cari.json"), encoding="utf-8"))["baris"]})
        nama_fn = lambda k4, x, y: _nama_desa(k4, x, y, P.PB, dc)
    titik_fn = titik_fn or (lambda k4: {} if k4 not in kab else {sm: [t for t in ts if P.PB.di_geom(t["lon"], t["lat"], kab[k4]["bagian"])
                                           and kab[k4]["kotak"][0] <= t["lon"] <= kab[k4]["kotak"][2] and kab[k4]["kotak"][1] <= t["lat"] <= kab[k4]["kotak"][3]]
                                        for sm, ts in _titik_prov(k4[:2]).items()})
    kab_out, staf = {}, {}
    for kode, per_kab in sorted(tersentuh.items()):
        bhy = BAHAYA_KODE[kode]
        geoms = [g for p in aktif if kode in p["kode"] for g in (p["geoms"] if "geoms" in p else [{"type": "Polygon", "coordinates": [c]} for c in p["poligon"]])]
        zona = P.zona_dari_bagian(geoms, bhy, "peringatan", RADIUS_KHT if kode == "KHT" else 0.0)
        for k4 in sorted(per_kab):
            try:
                titik = titik_fn(k4)
                dlm = {sm: [t for t in ts if zona["fn"](t["lon"], t["lat"])] for sm, ts in titik.items()}
                hasil = F.hitung(dlm, [zona])["berkoordinat"]
                ent = {}
                for (kat, sm), nama in SUMBER_FAS.items():
                    ada = any(t["kat"] == kat for t in titik.get(sm, []))   # sumber punya data untuk kab ini?
                    n = hasil.get(kat, {}).get("sumber", {}).get(sm, {}).get("n", 0)
                    ent[nama] = (n if n < 100 else bulat(n)) if ada else None
                lst = []
                for kat, e in hasil.items():
                    for t in e["titik"][:MAKS_STAF_FAS]:
                        kd, nm = nama_fn(k4, t["lon"], t["lat"])
                        lst.append({"kat": kat, "sumber": SUMBER_FAS[(kat, t["sumber"])], "nama": t["nama"], "lon": t["lon"], "lat": t["lat"], "kd": kd, "desa": nm})
                kab_out.setdefault(kode, {})[k4] = ent
                staf.setdefault(kode, {})[k4] = lst
            except (Exception, SystemExit):
                kab_out.setdefault(kode, {})[k4] = {nm: None for nm in SUMBER_FAS.values()}   # gagal = belum terukur
    return {"kab": kab_out, "staf": staf}


def hitung_karhutla(akar=AKAR, **kw):
    """DP-25 (K17): penduduk dan fasilitas di zona karhutla = kompleks api aktif (kluster.json, definisi di paparan.kluster_aktif) + radius RADIUS_KHT,
    mesin paparan yang sama. Kab dipilih dari kab kluster itu sendiri (ponytail: kab tetangga yang hanya kena radius belum ikut) dan dibatasi
    MAKS_KAB_KHT per putaran menurut skor kluster; sisanya di `menunggu`. Berlabel perkiraan."""
    P = _muat("sk_paparan", "scripts/siklus/paparan.py")
    fit = P.kluster_aktif(akar)
    kk = _muat("sk_hvc", "scripts/bnpb/hvc_dasar.py").kab_kode()
    skor, geo = {}, {}
    for f in fit:
        pr = f["properties"]
        k4 = kk.get(f"{pr.get('prov')}|{pr.get('kab')}")
        if k4:
            skor[k4] = max(skor.get(k4, 0), pr.get("skor", 0))
            geo.setdefault(k4, []).append(f["geometry"])
    urut = sorted(skor, key=lambda k: -skor[k])
    dihitung, menunggu = sorted(urut[:MAKS_KAB_KHT]), sorted(urut[MAKS_KAB_KHT:])
    out = {"radius_km": RADIUS_KHT, "label": "perkiraan", "aktif": bool(fit), "kab": dihitung, "menunggu": menunggu,
           "paparan": {"kab": {}, "desa": {}}, "fasilitas": {"kab": {}, "staf": {}}}
    for k4 in dihitung:
        ak = [{"kode": ["KHT"], "geoms": geo[k4], "poligon": []}]
        pp = hitung_paparan(ak, {"KHT": {k4: None}}, **kw.get("paparan", {}))
        ff = hitung_fasilitas(ak, {"KHT": {k4: None}}, **kw.get("fasilitas", {}))
        for a, b in ((out["paparan"]["kab"], pp["kab"]), (out["paparan"]["desa"], pp["desa"]), (out["fasilitas"]["kab"], ff["kab"]), (out["fasilitas"]["staf"], ff["staf"])):
            for kode, d in b.items():
                a.setdefault(kode, {}).update(d)
    return out


# ---------- jalan ----------
def jalankan(doc, kini, sidik_lama=None, kab=None, karhutla_fn=None):
    """Satu putaran. Status prakiraan selalu dihitung ulang oleh pemanggil; hanya keterpaparan yang dilewati bila sidik sama (D3).
    karhutla_fn (DP-25) bebas dari umpan CAP: dihitung tiap putaran bila diberikan (kluster.json punya kesegarannya sendiri)."""
    h = _jalankan_bmkg(doc, kini, sidik_lama, kab)
    h["karhutla"] = karhutla_fn() if karhutla_fn else None
    return h


def _jalankan_bmkg(doc, kini, sidik_lama=None, kab=None):
    st, umur = status_umpan(doc, kini)
    out = {"versi": 1, "dibuat": kini.isoformat(), "umpan": {"status": st, "umur_jam": umur, "dibuat": (doc or {}).get("dibuat")}}
    if st != "segar":  # R null; tidak ada angka 0
        return {**out, "teks": BELUM, "peringatan": None, "tak_dipetakan": None, "kab_tersentuh": None, "sidik": None, "hitung_paparan": False,
                "paparan": None, "fasilitas": None, "catatan": []}
    aktif, tak, catatan = peringatan_aktif(doc, kini)
    sd = sidik_poligon(aktif)
    out.update(teks=None if aktif else TIDAK_ADA, tak_dipetakan=tak, sidik=sd, catatan=catatan,
               peringatan=None)
    if not aktif:  # umpan segar dan kosong: R = 0 bermakna, jiwa tetap null
        return {**out, "peringatan": [], "kab_tersentuh": {}, "di_luar_wilayah": [], "hitung_paparan": False, "paparan": None, "fasilitas": None}
    ters, luar = kab_tersentuh(aktif, kab)
    out["peringatan"] = [{**{k: v for k, v in p.items() if k != "poligon"}, "poligon": [[[round(x, 4), round(y, 4)] for x, y in c[:]] for c in p["poligon"]]} for p in aktif]
    hitung = sd != sidik_lama
    out.update(kab_tersentuh=ters, di_luar_wilayah=luar, hitung_paparan=hitung,
               paparan=hitung_paparan(aktif, ters) if hitung else None, fasilitas=hitung_fasilitas(aktif, ters) if hitung else None)
    return out


def _rakit(kab, staf, pap, fas, r_fn, nama_fn):
    """Gabung paparan (kab publik, desa staf) dan fasilitas (hitungan publik, daftar bernama staf) satu sumber zona ke kab dan staf."""
    for kode, d in ((pap or {}).get("kab") or {}).items():
        for k4, e in d.items():
            k = kab.setdefault(k4, {"nama": e["nama"], "terliput": e["terliput"], "bahaya": {}})
            k["terliput"] = k["terliput"] and e["terliput"]
            k["nama"] = k["nama"] or e["nama"]
            k["bahaya"][kode] = {"r_bmkg": r_fn(kode, k4), **{x: v for x, v in saring_publik(e).items() if x not in ("terliput", "nama")}}
    for kode, d in ((pap or {}).get("desa") or {}).items():
        for k4, rows in d.items():
            staf.setdefault(k4, {}).setdefault("bahaya", {})[kode] = rows
    for kode, d in ((fas or {}).get("kab") or {}).items():
        for k4, ent in d.items():
            k = kab.setdefault(k4, {"nama": nama_fn(k4), "terliput": False, "bahaya": {}})
            k["bahaya"].setdefault(kode, {"r_bmkg": r_fn(kode, k4)})["fasilitas"] = ent
    for kode, d in ((fas or {}).get("staf") or {}).items():
        for k4, lst in d.items():
            staf.setdefault(k4, {}).setdefault("fasilitas", {})[kode] = lst


def tulis_keluaran(h, keluar):
    """Kontrak DP-08/DP-09 di folder `keluar`: hasil.json (untuk --lama; tanpa desa dan tanpa nama fasilitas), ringkas.json (publik: tanpa desa, bulat),
    desa/<kab4>.json (STAF: desa, fasilitas bernama). Sidik sama (BMKG tidak dihitung) -> bagian kab BMKG ringkas.json lama dipertahankan; karhutla selalu baru.
    -> daftar berkas yang ditulis."""
    os.makedirs(os.path.join(keluar, "desa"), exist_ok=True)
    pap, fas, kh, tulis = h.get("paparan"), h.get("fasilitas"), h.get("karhutla"), []

    def simpan(nama, o):
        json.dump(o, open(os.path.join(keluar, nama), "w", encoding="utf-8"), ensure_ascii=False, sort_keys=True)
        tulis.append(nama)

    def nama_kab(k4):
        try:
            return muat_kab()[k4]["nama"]
        except Exception:
            return None
    lama = os.path.join(keluar, "ringkas.json")
    kab, staf = {}, {}
    if pap or fas:
        _rakit(kab, staf, pap, fas, lambda kode, k4: (h.get("kab_tersentuh") or {}).get(kode, {}).get(k4), nama_kab)
    elif h.get("hitung_paparan") is False and h.get("peringatan") and os.path.exists(lama):
        kab = json.load(open(lama, encoding="utf-8")).get("kab", {})   # sidik sama: angka BMKG lama masih benar
        for v in kab.values():
            v["bahaya"].pop("KHT", None)
    if kh:
        _rakit(kab, staf, kh["paparan"], kh["fasilitas"], lambda kode, k4: None, nama_kab)
    for k4, d in sorted(staf.items()):
        simpan(f"desa/{k4}.json", {"versi": 1, "dibuat": h["dibuat"], "kab4": k4, "bahaya": dict(sorted(d.get("bahaya", {}).items())), "fasilitas": dict(sorted(d.get("fasilitas", {}).items()))})
    pub_kh = None if not kh else {"radius_km": kh["radius_km"], "label": kh["label"], "aktif": kh["aktif"], "kab": kh["kab"], "menunggu": kh["menunggu"]}
    ring = {"versi": 1, "dibuat": h["dibuat"], "umpan_cap": h["umpan"]["dibuat"], "umpan": h["umpan"]["status"], "teks": h.get("teks"),
            "peringatan": None if h["peringatan"] is None else [{"id": p["id"], "event": p["event"], "severity": p["severity"], "bahaya": p["kode"], "tingkat_bmkg": p["tingkat_bmkg"],
                                                                 "mulai": p["mulai"], "sampai": p["selesai"], "berlaku_sampai": p["selesai"], "wilayah": p["wilayah"],
                                                                 "sumber_url": p["sumber_url"], "poligon": p["poligon"], "kab": p["kab"]} for p in h["peringatan"]],
            "tak_dipetakan": h["tak_dipetakan"], "kab": kab, "karhutla": pub_kh,
            "catatan": "penduduk di area peringatan BMKG; perkiraan, tidak dijumlah dengan jiwa total kab dan jiwa terpapar aturan dampak"}
    assert not kunci_terlarang(ring), kunci_terlarang(ring)
    simpan("ringkas.json", ring)
    simpan("hasil.json", {**h, "paparan": paparan_publik(pap), "fasilitas": (fas or {}).get("kab") if fas else None,
                          "karhutla": pub_kh and {**pub_kh, "paparan": paparan_publik(kh["paparan"]), "fasilitas": kh["fasilitas"]["kab"]}})
    return tulis


def ringkas(h):
    u = h["umpan"]
    s = [f"umpan {u['status']}" + (f" (umur {u['umur_jam']} jam)" if u["umur_jam"] is not None else "")]
    if h["peringatan"] is None:
        s.append(BELUM)
    elif not h["peringatan"]:
        s.append(TIDAK_ADA)
    else:
        s.append(f"{len(h['peringatan'])} peringatan aktif, tak dipetakan {h['tak_dipetakan']['n']}, sidik {h['sidik']}, hitung_paparan={h['hitung_paparan']}")
        for kode, d in sorted((h["kab_tersentuh"] or {}).items()):
            s.append(f"  {kode}: {len(d)} kab tersentuh, R maks {max(d.values(), default=0)}")
        if h["di_luar_wilayah"]:
            s.append(f"  di luar wilayah: {len(h['di_luar_wilayah'])}")
    return "\n".join(s)


# ---------- --cek (tanpa jaringan) ----------
def _cek():
    def per(i, ev, ring, selesai="2026-11-26T12:00:00+00:00", sev="Moderate"):
        return {"id": i, "event": ev, "severity": sev, "mulai": "2026-11-26T07:00:00+07:00", "selesai": selesai, "wilayah": "x", "polygon": [ring]}

    def umpan(dibuat, *p):
        return {"dibuat": dibuat, "terbit": dibuat, "nowcast": list(p)}

    # tiga kab fiktif: A kotak 0..2, B kotak 2..4 (bersebelahan), C jauh
    def kotak(x0, y0, x1, y1):
        return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
    PB = _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
    kab = {k: {"nama": k, "bagian": [(r, [])], "kotak": (r[0][0], r[0][1], r[2][0], r[2][1])}
           for k, r in (("A", kotak(0, 0, 2, 2)), ("B", kotak(2, 0, 4, 2)), ("C", kotak(10, 10, 12, 12)))}
    segar = "2026-11-26T07:30:00+00:00"  # umur 0,5 jam
    kini = _waktu("2026-11-26T08:00:00+00:00")
    HL = "Hujan Lebat dan Petir"

    # P1: segar, kosong
    h = jalankan(umpan(segar), kini, kab=kab)
    assert h["teks"] == TIDAK_ADA and h["peringatan"] == [] and h["paparan"] is None and h["kab_tersentuh"] == {}, h
    assert ringkas(h).endswith(TIDAK_ADA)
    # P2: basi dan mati -> belum terukur, R null
    for d, st in ((umpan("2026-11-26T03:00:00+00:00", per("1", HL, kotak(0.5, 0.5, 1, 1))), "basi"), (None, "mati")):
        h = jalankan(d, kini, kab=kab)
        assert h["umpan"]["status"] == st and h["teks"] == BELUM and h["peringatan"] is None and h["kab_tersentuh"] is None, h
    # P7: poligon di laut -> tidak membuat kab, tercatat di_luar_wilayah
    h = jalankan(umpan(segar, per("L", HL, kotak(50, 50, 51, 51))), kini, kab=kab)
    assert h["di_luar_wilayah"] == ["L"] and all(not v for v in h["kab_tersentuh"].values()), h
    # P13: peristiwa tak dikenal dihitung, tanpa paparan, tanpa galat
    h = jalankan(umpan(segar, per("P", "Petir", kotak(0.5, 0.5, 1, 1)), per("Q", "Gelombang Tinggi", kotak(0.5, 0.5, 1, 1))), kini, kab=kab)
    assert h["tak_dipetakan"] == {"n": 2, "nama": ["Gelombang Tinggi", "Petir"]} and h["peringatan"] == [] and h["kab_tersentuh"] == {}, h
    # pemetaan: hujan lebat -> BNJ+LSR, angin -> CEX; kedaluwarsa dibuang; cincin rusak dibuang dan dicatat
    d = umpan(segar, per("H", HL, kotak(0.5, 0.5, 1, 1)), per("W", "Angin Kencang", kotak(3, 0.5, 3.5, 1), sev="Severe"),
              per("X", HL, kotak(0.5, 0.5, 1, 1), selesai="2026-11-26T07:00:00+00:00"), per("Y", HL, [[0, 0], [1, 1], [0, 0]]))
    h = jalankan(d, kini, kab=kab)
    assert [p["id"] for p in h["peringatan"]] == ["H", "W", "Y"] and h["kab_tersentuh"]["BNJ"] == {"A": 2} and h["kab_tersentuh"]["CEX"] == {"B": 3}, h
    assert len(h["catatan"]) == 1
    # P23: poligon kecil di dalam kab (tanpa titik pusat desa), dan poligon yang hanya melintasi tepi dua kab
    h = jalankan(umpan(segar, per("K", HL, kotak(1.01, 1.01, 1.02, 1.02)), per("M", HL, kotak(1.9, 0.5, 2.1, 0.6))), kini, kab=kab)
    assert set(h["kab_tersentuh"]["BNJ"]) == {"A", "B"}, h
    # melintang di atas kab B tanpa satu titik pun di dalamnya
    assert berpotongan([[-1, 0.5], [5, 0.5], [5, 0.6], [-1, 0.6], [-1, 0.5]], kab["B"]["bagian"], kab["B"]["kotak"], PB)
    assert not berpotongan(kotak(5, 5, 6, 6), kab["A"]["bagian"], kab["A"]["kotak"], PB)
    # tepi: poligon yang hanya menyentuh sisi kab A (x=2 dari luar) dan yang hanya menyentuh sudutnya tetap tersentuh; segaris tapi terpisah tidak
    assert berpotongan([[2, 0.5], [3, 0.5], [3, 0.6], [2, 0.6], [2, 0.5]], kab["A"]["bagian"], kab["A"]["kotak"], PB)
    assert _silang([0, 0], [2, 0], [2, 0], [3, 1]) and _silang([0, 0], [2, 0], [1, 0], [3, 0]) and not _silang([0, 0], [1, 0], [2, 0], [3, 0])
    assert SEVERITAS == {"minor": 1, "moderate": 2, "severe": 3, "extreme": 3}
    # ringkas: poligon 4 desimal, kab per peringatan, tautan sumber dan nama peristiwa
    d4 = umpan(segar, per("Z", HL, [[0.123456, 0.5], [1.0, 0.5], [1.0, 1.0], [0.123456, 0.5]]))
    d4["nowcast"][0]["url"] = "https://x/y.xml"
    z4 = jalankan(d4, kini, kab=kab)["peringatan"][0]
    assert z4["poligon"] == [[[0.1235, 0.5], [1.0, 0.5], [1.0, 1.0], [0.1235, 0.5]]] and z4["kab"] == ["A"] and z4["sumber_url"] == "https://x/y.xml" and z4["event"] == HL, z4
    # P9: sidik sama -> hitung dilewati, keluaran byte sama; poligon beda -> hitung lagi
    d = umpan(segar, per("H", HL, kotak(0.5, 0.5, 1, 1)))
    h1 = jalankan(d, kini, kab=kab)
    assert h1["hitung_paparan"] is True
    h2 = jalankan(d, kini, sidik_lama=h1["sidik"], kab=kab)
    assert h2["hitung_paparan"] is False
    assert h1["kab_tersentuh"] == h2["kab_tersentuh"]  # kab tersentuh tetap dihitung ulang
    assert json.dumps(jalankan(d, kini, h1["sidik"], kab), sort_keys=True) == json.dumps(h2, sort_keys=True)
    h3 = jalankan(umpan(segar, per("H", HL, kotak(0.6, 0.5, 1, 1))), kini, sidik_lama=h1["sidik"], kab=kab)
    assert h3["hitung_paparan"] is True and h3["sidik"] != h1["sidik"]
    # DP-03: P3 pembulatan, P21 murni
    for n, e in ((7, "kurang dari 10"), (10, 10), (54, 50), (55, 60), (99, 100), (100, 100), (995, 1000), (54308, 54000), (1083781, 1100000), (None, None), (0, 0)):
        assert bulat(n) == e and bulat(bulat(n)) == e, (n, bulat(n))
    # P5, P6, P8, P14, P16, P18, P22: dua kab (9901 ber-grid, 9902 tanpa), satu poligon banjir_longsor, desa Dukcapil d1 (pria 480 wanita 520)
    ring = [[99.9995, -1.0005], [100.0015, -1.0005], [100.0015, -0.9995], [99.9995, -0.9995], [99.9995, -1.0005]]
    ak = [{"id": "H", "bahaya": "banjir_longsor", "kode": ["BNJ", "LSR"], "tingkat_bmkg": 2, "poligon": [ring]}]
    sel9 = [(0, 0, 100, 5000, "A", 100.000, -1.0), (0, 1, 100, 5000, "A", 100.001, -1.0), (0, 9, 100, 5000, "A", 100.009, -1.0)]
    d9 = [("d1", "A", 100.0, -1.0, 600, 10, 20, 480, 520), ("d2", "A", 100.009, -1.0, 400, 5, 5, None, None)]

    def sel_fn(prov, k4):
        if k4 == "9902":
            raise OSError("halus_99 tidak ada")
        return sel9, 0, 0, .001, "Kab X", None
    kls = lambda b, pts: [.2 if i == 0 else (.9 if b == "longsor" else None) for i, _ in enumerate(pts)]
    import tempfile as _t0
    with _t0.TemporaryDirectory() as tk:
        pp = hitung_paparan(ak, {"BNJ": {"9901": 2, "9902": 2}, "LSR": {"9901": 2}}, sel_fn, lambda *a: d9, kls, {"99|Kab X|A": 1000}, lambda k4, x, y: ("99.01.01.2001", "Desa Satu"), tk)
    b1, b2, l1 = pp["kab"]["BNJ"]["9901"], pp["kab"]["BNJ"]["9902"], pp["kab"]["LSR"]["9901"]
    assert b2["terliput"] is False and b2["penduduk_area_peringatan"] is None and b2["jiwa_kelas"] is None and "belum terukur" in b2["alasan"]   # P8
    assert b1["terliput"] and b1["penduduk_area_peringatan"] == {"worldpop": 670, "dukcapil": 600, "ghsl": None}, b1                    # P6: tiga angka terpisah
    assert b1["jiwa_kelas"] == {"tinggi": 0, "sedang": 0, "rendah": 300, "tak_terliput": 300} and l1["jiwa_kelas"]["tinggi"] == 300, (b1, l1)   # P14, P18
    dd = pp["desa"]["BNJ"]["9901"]["99.01.01.2001"]
    assert dd["jiwa_jk"] == {"laki": 290, "perempuan": 310, "label": "perkiraan"} and dd["balita"] == 10 and dd["lansia"] == 20 and dd["nama"] == "Desa Satu", dd   # P22
    pub = paparan_publik(pp)
    assert "desa" not in json.dumps(pub) and not kunci_terlarang(pub) and set(pub["BNJ"]["9901"]) <= set(KUNCI_IZIN_KAB), pub              # P5, P16
    assert kunci_terlarang({"kab": {"x": [{"desa": {}}]}}) == ["/kab/x/0/desa"] and kunci_terlarang({"kab": {"1101": {"jiwa_jk": 1}}})
    assert paparan_publik(None) is None
    # umpan: macet -> batas keras lalu satu ulang lalu None -> belum terukur; gagal sekali lalu berhasil -> terbaca
    mulai = time.time()
    assert baca_umpan("x", 0.3, lambda b, t: time.sleep(30)) is None and time.time() - mulai < 6
    assert baca_umpan("x", 1, lambda b, t: 1 / 0) is None
    cobaan = []
    assert baca_umpan("x", 1, lambda b, t: cobaan.append(1) or (None if len(cobaan) == 1 else umpan(segar)))["nowcast"] == [] and len(cobaan) == 2
    assert jalankan(baca_umpan("x", 0.3, lambda b, t: time.sleep(30)), kini, kab=kab)["teks"] == BELUM
    # kontrak berkas: ringkas.json tanpa desa, desa/<kab4>.json berisi desa, sidik sama mempertahankan kab lama
    import tempfile
    hh = {"versi": 1, "dibuat": "2026-11-26T08:00:00+00:00", "umpan": {"status": "segar", "umur_jam": .5, "dibuat": segar}, "teks": None,
          "peringatan": [{"id": "H", "event": HL, "severity": "Moderate", "mulai": "m", "sumber_url": "u", "bahaya": "banjir_longsor", "kode": ["BNJ", "LSR"], "tingkat_bmkg": 2, "selesai": "x", "wilayah": "w", "kab": ["9901"], "poligon": [[[100.00012, -1.00009], [101, -1], [101, 0], [100.00012, -1.00009]]]}],
          "tak_dipetakan": {"n": 0, "nama": []}, "kab_tersentuh": {"BNJ": {"9901": 2, "9902": 2}, "LSR": {"9901": 2}}, "hitung_paparan": True, "paparan": pp}
    with tempfile.TemporaryDirectory() as t:
        assert sorted(tulis_keluaran(hh, t)) == ["desa/9901.json", "hasil.json", "ringkas.json"]
        rg = json.load(open(os.path.join(t, "ringkas.json")))
        assert not kunci_terlarang(rg) and "Desa Satu" not in json.dumps(rg) and rg["kab"]["9902"]["terliput"] is False and rg["kab"]["9901"]["bahaya"]["LSR"]["r_bmkg"] == 2, rg
        assert "Desa Satu" not in open(os.path.join(t, "hasil.json")).read()
        pr = rg["peringatan"][0]
        assert pr["bahaya"] == ["BNJ", "LSR"] and pr["sampai"] == "x" and pr["sumber_url"] == "u" and pr["kab"] == ["9901"] and pr["event"] == HL and pr["poligon"][0][0] == [100.00012, -1.00009], pr
        assert rg["kab"]["9901"]["nama"] == "Kab X"
        assert json.load(open(os.path.join(t, "desa/9901.json")))["bahaya"]["BNJ"]["99.01.01.2001"]["nama"] == "Desa Satu"
        tulis_keluaran({**hh, "hitung_paparan": False, "paparan": None}, t)
        assert json.load(open(os.path.join(t, "ringkas.json")))["kab"] == rg["kab"]
    # cache kelas: putaran kedua tidak memanggil InaRISK; anggaran membatasi; None tidak di-cache
    import tempfile as _tf
    with _tf.TemporaryDirectory() as t:
        pan = []
        kf = lambda b, pts: pan.append(len(pts)) or [.2] * len(pts)
        cs = sel9[:3]
        kh1, p1 = kelas_bercache("banjir", "9901", cs, kf, [2], t)
        assert len(kh1) == 2 and p1 is False and pan == [2]
        kh2, p2 = kelas_bercache("banjir", "9901", cs, kf, [5], t)
        assert len(kh2) == 3 and p2 is True and pan == [2, 1]
        kelas_bercache("banjir", "9901", cs, kf, [5], t)
        assert pan == [2, 1]
        assert kelas_bercache("longsor", "9901", cs, lambda b, p: [None] * len(p), [5], t) == ({}, False)
    # P15, P27 fasilitas: dua sumber terpisah, tanpa kunci jumlah; sumber tanpa data null; nama dan titik hanya di staf
    titik = {"dapodik": [{"kat": "sekolah", "lon": 100.0, "lat": -1.0, "nama": "SD Satu"}, {"kat": "sekolah", "lon": 100.5, "lat": -1.5, "nama": "SD Jauh"},
                         {"kat": "madrasah", "lon": 100.001, "lat": -1.0, "nama": "MI Dua"}],
             "fasilitas-repo": []}
    ff = hitung_fasilitas(ak, {"BNJ": {"9901": 2}}, {"9901": {}}, lambda k4: titik, lambda k4, x, y: ("99.01.01.2001", "Desa Satu"))
    assert ff["kab"]["BNJ"]["9901"] == {"sekolah_dapodik": 1, "madrasah_dapodik": 1, "faskes_osm": None}, ff   # 1 dari 2 sekolah di zona; OSM tanpa data = null, bukan 0
    assert sorted(t["nama"] for t in ff["staf"]["BNJ"]["9901"]) == ["MI Dua", "SD Satu"] and "SD Satu" not in json.dumps(ff["kab"])
    assert not [k for k in ff["kab"]["BNJ"]["9901"] if k in ("jumlah", "total", "n")]
    gagal = hitung_fasilitas(ak, {"BNJ": {"9901": 2}}, {}, None)["kab"]["BNJ"]["9901"]
    assert gagal == {"sekolah_dapodik": None, "madrasah_dapodik": None, "faskes_osm": None}   # kab tak dikenal: belum terukur
    ff2 = hitung_fasilitas(ak, {"BNJ": {"9901": 2}}, {"9901": {}}, lambda k4: {"dapodik": [dict(titik["dapodik"][0])] * 150}, lambda *a: (None, None))
    assert ff2["kab"]["BNJ"]["9901"]["sekolah_dapodik"] == 150 and ff2["kab"]["BNJ"]["9901"]["madrasah_dapodik"] is None   # cacahan; 150 -> bulat dua angka penting = 150
    # P28 karhutla (K17): zona = kluster aktif + radius dari kriteria, mesin paparan yang sama; label perkiraan; di luar radius tidak ikut; kluster basi diabaikan
    assert RADIUS_KHT == 3 and _KRIT["karhutla"]["label"].startswith("asumsi-kebijakan")
    sq = lambda x0, y0, x1, y1: {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}
    fk = lambda jam, geom: {"type": "Feature", "geometry": geom, "properties": {"prov": "33", "kab": "Cilacap", "n24": 5, "jam_sejak": jam, "level": 3, "skor": 9}}
    sel_k = sel9 + [(0, 50, 100, 5000, "A", 100.05, -1.0)]
    with _t0.TemporaryDirectory() as tk, _t0.TemporaryDirectory() as dk:
        os.makedirs(os.path.join(tk, "public/data"))
        json.dump({"features": [fk(5, sq(99.9995, -1.0005, 100.0015, -0.9995)), fk(99, sq(0, 0, 1, 1))]}, open(os.path.join(tk, "public/data/kluster.json"), "w"))
        d9k = d9 + [("d3", "A", 100.05, -1.0, 100, 0, 0, None, None)]
        kw = {"paparan": dict(sel_fn=lambda prov, k4: (sel_k, 0, 0, .001, "Kab X", None), desa_fn=lambda *a: d9k, wp_semua={"33|Kab X|A": 1000}, nama_fn=lambda k4, x, y: ("33.01.01.2001", "Desa Satu"), dir_kelas=dk),
              "fasilitas": dict(kab={"3301": {}}, titik_fn=lambda k4: titik, nama_fn=lambda *a: (None, None))}
        kh = hitung_karhutla(tk, **kw)
        assert kh["kab"] == ["3301"] and kh["menunggu"] == [] and kh["aktif"] and kh["label"] == "perkiraan" and kh["radius_km"] == 3, kh
        ek = kh["paparan"]["kab"]["KHT"]["3301"]
        # d1 (600) di dalam kluster, d2 (400) lewat radius (sel 0,8 km dari tepi; tanpa radius hanya 600), d3 (100) sel 5,5 km di luar radius -> 0: 1000; WorldPop 1000 x 300 dari 400 bangunan = 750
        assert ek["penduduk_area_peringatan"]["dukcapil"] == 1000 and ek["penduduk_area_peringatan"]["worldpop"] == 750 and ek["label"] == "perkiraan" and "radius 3 km" in ek["dasar"] and ek["jiwa_kelas"] is None, ek
        assert set(kh["paparan"]["desa"]["KHT"]["3301"]) == {"33.01.01.2001"} or len(kh["paparan"]["desa"]["KHT"]["3301"]) >= 1
        assert kh["fasilitas"]["kab"]["KHT"]["3301"]["sekolah_dapodik"] == 1
        # tanpa kluster aktif: tidak aktif, tanpa angka
        json.dump({"features": [fk(99, sq(0, 0, 1, 1))]}, open(os.path.join(tk, "public/data/kluster.json"), "w"))
        k0 = hitung_karhutla(tk, **kw)
        assert k0["aktif"] is False and k0["kab"] == [] and k0["paparan"]["kab"] == {}
        # keluaran: KHT masuk ringkas.json tanpa desa; desa dan nama fasilitas hanya di desa/<kab4>.json
        json.dump({"features": [fk(5, sq(99.9995, -1.0005, 100.0015, -0.9995))]}, open(os.path.join(tk, "public/data/kluster.json"), "w"))
        kh = hitung_karhutla(tk, **kw)
        with _t0.TemporaryDirectory() as t2:
            tulis_keluaran({**hh, "paparan": None, "fasilitas": None, "hitung_paparan": True, "karhutla": kh}, t2)
            rg2 = json.load(open(os.path.join(t2, "ringkas.json")))
            assert rg2["kab"]["3301"]["bahaya"]["KHT"]["r_bmkg"] is None and rg2["kab"]["3301"]["bahaya"]["KHT"]["fasilitas"]["sekolah_dapodik"] == 1 and rg2["karhutla"]["radius_km"] == 3
            assert not kunci_terlarang(rg2) and "SD Satu" not in json.dumps(rg2) and "Desa Satu" not in json.dumps(rg2)
            dsa = json.load(open(os.path.join(t2, "desa/3301.json")))
            assert {t["nama"] for t in dsa["fasilitas"]["KHT"]} == {"SD Satu", "MI Dua"} and "KHT" in dsa["bahaya"]
            assert "SD Satu" not in open(os.path.join(t2, "hasil.json")).read()
    # kata dilarang tidak muncul di teks buatan kita
    assert not [k for k in KATA_DILARANG if k in (TIDAK_ADA + BELUM)]
    # geometri nyata: kab dari public/geo terbaca 514 kode dan alias Pahuwato
    kb = muat_kab()
    assert len(kb) == 514 and "7504" in kb, len(kb)
    print("dampak_peringatan --cek: P1 P2 P3 P5 P6 P7 P8 P9 P13 P14 P15 P16 P18 P21 P22 P23 P27 P28 hijau")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--base", default=BASE_BAWAAN)
    ap.add_argument("--kini")
    ap.add_argument("--lama", help="berkas hasil sebelumnya (untuk sidik)")
    ap.add_argument("--keluar")
    a = ap.parse_args()
    if a.cek:
        _cek()
        sys.exit(0)
    kini = _waktu(a.kini) if a.kini else dt.datetime.now(dt.timezone.utc)
    lama = json.load(open(a.lama))["sidik"] if a.lama and os.path.exists(a.lama) else None
    hasil = jalankan(baca_umpan(a.base), kini, lama, karhutla_fn=hitung_karhutla)
    if a.keluar:   # a.keluar = .../hasil.json; ringkas.json dan desa/ ditulis di folder yang sama
        print("ditulis:", ", ".join(tulis_keluaran(hasil, os.path.dirname(os.path.abspath(a.keluar)))))
    print(ringkas(hasil))
