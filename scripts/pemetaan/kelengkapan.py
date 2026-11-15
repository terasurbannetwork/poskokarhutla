#!/usr/bin/env python3
"""HR-04: kelengkapan bangunan OSM per kab (ALGORITMA pemetaan-relawan §2-3, RISET C).
N_osm = ohsome elements/count (building=* poligon) di zona kab pada tanggal data terbaru (toTimestamp metadata);
N_pembanding dari pembanding.py (Open Buildings, zona yang sama); rasio + kelas dari pembanding.py/konst.py.
Aturan: jeda 1 dtk antar kueri, ulang dengan jeda naik (429/5xx/galat jaringan), User-Agent generik, tanpa kunci.
Jawaban bentuk tak dikenal = n_osm None (tidak tersedia), bukan 0. Kab tanpa grid pembanding = terliput False, bukan 0.
Keluaran agregat per kab, tanpa nama pengguna. Pakai:
  python3 -I scripts/pemetaan/kelengkapan.py --cek
  python3 -I scripts/pemetaan/kelengkapan.py --kab 6301,6302 [--keluar berkas.json]   # zona = seluruh kab (aproksimasi)"""
import importlib.util, json, os, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
OHSOME = "https://api.ohsome.org/v1"
FILTER = "building=* and geometry:polygon"
JEDA = 1.0
ULANG = (2, 4, 8)
KELUAR = os.path.join(AKAR, "public/data/kemitraan/pemetaan_kelengkapan.json")


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


PB = _muat("pm_pembanding", "scripts/pemetaan/pembanding.py")
KONST = PB.KONST


def http(url, data=None):
    """GET, atau POST form bila data. Kembalikan dict; lempar HTTPError/URLError/ValueError."""
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data else None,
                                 headers={"User-Agent": "pemetaan-kelengkapan/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


class Ohsome:
    def __init__(self, ambil=http, tidur=time.sleep):
        self.ambil, self.tidur, self.baru = ambil, tidur, False

    def _panggil(self, url, data=None):
        if self.baru:
            self.tidur(JEDA)
        self.baru = True
        for i in range(len(ULANG) + 1):
            try:
                return self.ambil(url, data)
            except urllib.error.HTTPError as e:
                if e.code != 429 and e.code < 500:
                    return None   # 4xx lain: bentuk kueri salah, mengulang tak membantu
            except (urllib.error.URLError, TimeoutError, ValueError, OSError):
                pass
            if i < len(ULANG):
                self.tidur(ULANG[i])
        return None

    def tanggal_data(self):
        """toTimestamp metadata (ISO) atau None."""
        j = self._panggil(OHSOME + "/metadata")
        try:
            t = j["extractRegion"]["temporalExtent"]["toTimestamp"]
            datetime.fromisoformat(t.replace("Z", "+00:00"))
            return t
        except (TypeError, KeyError, ValueError, AttributeError):
            return None

    def hitung(self, geoms, waktu):
        """N_osm di zona geoms pada tanggal `waktu`; bentuk jawaban tak dikenal = None."""
        fc = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": g} for g in geoms]}
        j = self._panggil(OHSOME + "/elements/count", {"bpolys": json.dumps(fc, separators=(",", ":")), "filter": FILTER, "time": waktu})
        try:
            v = j["result"][-1]["value"]
        except (TypeError, KeyError, IndexError):
            return None
        return v if isinstance(v, (int, float)) and not isinstance(v, bool) and v >= 0 else None


def baris(kab4, n_osm, pemb):
    """Satu baris agregat. pemb = keluaran pembanding.kab (terliput False => rasio None, bukan 0)."""
    r = PB.rasio(n_osm, pemb["n_pembanding"]) if pemb["terliput"] else None
    return {"kab4": kab4, "terliput": pemb["terliput"], "n_osm": n_osm, "n_pembanding": pemb["n_pembanding"],
            "rasio": None if r is None else round(r, 4), "kelas": PB.kelas(r),
            "catatan": "rasio di atas 1 apa adanya (OSM lebih lengkap atau pembanding kurang); skor memakai min(rasio, 1)" if r and r > 1 else None}


def bangun(kabs, oh, tanggal=None):
    """kabs [(prov, kab4, geoms)] -> dokumen agregat. Tanggal data tidak tersedia = tanpa hitungan N_osm."""
    t = oh.tanggal_data()
    if not t:
        return {"tanggal_data": None, "kab": [baris(k, None, PB.kab(p, k, g)) for p, k, g in kabs], "catatan": "ohsome tidak tersedia"}
    waktu = t[:10]
    hari = (datetime.now(timezone.utc) - datetime.fromisoformat(t.replace("Z", "+00:00"))).days
    out = [baris(k, oh.hitung(g, waktu), PB.kab(p, k, g)) for p, k, g in kabs]
    return {"tanggal_data": t, "umur_hari": hari, "basi": hari > KONST["SEGAR_HARI"], "sumber": "OpenStreetMap contributors (ODbL) via ohsome; pembanding Google Open Buildings (CC BY 4.0), keyakinan >= %s" % KONST["AMBANG_KEYAKINAN"],
            "ambang": "HIPOTESIS (Q6)", "kab": out}


def zona_kab(kab4, akar=AKAR):
    """Aproksimasi proof run: zona = poligon kab dari public/geo/kabupaten (bukan zona bahaya). -> (prov, geoms)"""
    kode = json.load(open(os.path.join(akar, "public/data/kemitraan/kode.json"), encoding="utf-8"))
    nama = kode[kab4]["kunci_nama"].split("|", 1)[1]
    prov = kode[kab4]["prov"]
    geo = json.load(open(os.path.join(akar, f"public/geo/kabupaten/{prov}.json"), encoding="utf-8"))["features"]
    g = [f["geometry"] for f in geo if f["properties"].get("kab") == nama]
    return prov, g


def cek():
    kotak = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}
    tidur = []
    def palsu(isi):
        def f(url, data=None):
            if url.endswith("/metadata"):
                return {"extractRegion": {"temporalExtent": {"toTimestamp": "2026-07-27T00:00:00Z"}}}
            return isi(data) if callable(isi) else isi
        return f
    # jawaban normal + jeda 1 dtk antar kueri
    oh = Ohsome(palsu({"result": [{"timestamp": "x", "value": 120.0}]}), tidur.append)
    assert oh.tanggal_data() == "2026-07-27T00:00:00Z" and oh.hitung([kotak], "2026-07-27") == 120.0
    assert tidur == [JEDA], tidur
    # bentuk tak dikenal = None, bukan 0
    for jelek in ({}, {"result": []}, {"result": [{"value": "9"}]}, {"result": [{"value": -3}]}, {"result": [{"value": True}]}, None):
        assert Ohsome(palsu(jelek), lambda s: None).hitung([kotak], "2026-07-27") is None, jelek
    # ulang jeda naik pada 429, lalu sukses; menyerah = None
    n = {"i": 0}
    def goyang(data):
        n["i"] += 1
        if n["i"] < 3:
            raise urllib.error.HTTPError("u", 429, "lambat", {}, None)
        return {"result": [{"value": 7}]}
    tidur.clear()
    assert Ohsome(palsu(goyang), tidur.append).hitung([kotak], "t") == 7 and tidur == [2, 4], tidur
    def mati(data): raise urllib.error.HTTPError("u", 503, "x", {}, None)
    tidur.clear()
    assert Ohsome(palsu(mati), tidur.append).hitung([kotak], "t") is None and tidur == [2, 4, 8], tidur
    def salah(data): raise urllib.error.HTTPError("u", 400, "x", {}, None)
    tidur.clear()
    assert Ohsome(palsu(salah), tidur.append).hitung([kotak], "t") is None and tidur == [], "4xx tidak diulang"
    # baris: T1 pembanding < 100 -> rasio None; T2 di atas 1 apa adanya + catatan; tanpa grid = terliput False
    b = baris("6301", 50, {"terliput": True, "n_pembanding": 99}); assert b["rasio"] is None and b["kelas"] is None, b
    b = baris("6301", 150, {"terliput": True, "n_pembanding": 100}); assert b["rasio"] == 1.5 and b["kelas"] == "memadai" and b["catatan"], b
    b = baris("6301", 40, {"terliput": True, "n_pembanding": 100}); assert b["rasio"] == 0.4 and b["kelas"] == "tipis", b
    b = baris("1101", 5000, {"terliput": False, "n_pembanding": None}); assert b["rasio"] is None and b["n_pembanding"] is None, b
    b = baris("6301", None, {"terliput": True, "n_pembanding": 500}); assert b["rasio"] is None and b["n_osm"] is None, b
    # T8: dokumen tanpa nama/email/pengguna; tanggal data tercatat
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        d = bangun([("11", "1101", [kotak])], Ohsome(palsu({"result": [{"value": 5}]}), lambda s: None))
        assert d["tanggal_data"] == "2026-07-27T00:00:00Z" and d["kab"][0]["terliput"] in (True, False)
        s = json.dumps(d).lower()
        assert not any(k in s for k in ("user", "email", "nama", "@")), s
    print("OK kelengkapan.py: ohsome tiruan, jeda+ulang, bentuk tak dikenal None, T1/T2/T8")


if __name__ == "__main__":
    a = sys.argv
    if "--cek" in a:
        cek()
    elif "--kab" in a:
        kabs = []
        for k in a[a.index("--kab") + 1].split(","):
            p, g = zona_kab(k)
            kabs.append((p, k, g))
        d = bangun(kabs, Ohsome())
        o = a[a.index("--keluar") + 1] if "--keluar" in a else KELUAR
        json.dump(d, open(o, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(json.dumps(d, ensure_ascii=False, indent=1))
    else:
        sys.exit(__doc__)
