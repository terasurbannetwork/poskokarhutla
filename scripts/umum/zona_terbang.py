#!/usr/bin/env python3
"""Zona terbang Misi Udara (paket data/kajian-bnpb/misi-udara/, tiket MU-15; MU-05 dan MU-07 belum dibangun di berkas ini).

Isi sekarang hanya catatan InaRISK: indeks bahaya letusan gunung api dan tsunami (raster ImageServer BNPB) per titik lewat `identify`.
Keputusan pemilik K8 (24 Nov 2026, "Sebagai catatan"): hanya tingkat `perhatian`; tidak pernah larangan, tidak pernah membelokkan rute.
Legenda layanan bertipe "Stretched" (ramp 0..1 tanpa batas kelas), jadi nilai mentah dicatat dan kelas ditulis "belum ada dari legenda";
ambang tidak dikarang. Gagal atau timeout = catatan "InaRISK tidak menjawab", bukan nol. Tidak pernah menulis "aman". Stdlib saja.

  python3 -I scripts/umum/zona_terbang.py uji
  python3 -I scripts/umum/zona_terbang.py cek LAT LON      # butuh jaringan
"""
import json
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
TEMBOLOK = AKAR / "data/raw/misi_udara/inarisk_identify.json"  # data/raw digitignore; tidak pernah ke public/ (D7)
DASAR = "https://gis.bnpb.go.id/server/rest/services/inarisk"
LAYANAN = {"gunung api": "INDEKS_BAHAYA_GUNUNGAPI", "tsunami": "INDEKS_BAHAYA_TSUNAMI"}
KELAS_KET = "kelas belum ada dari legenda"
GAGAL = "InaRISK tidak menjawab"


def url_layanan(bencana):
    return f"{DASAR}/{LAYANAN[bencana]}/ImageServer"


def _identify(bencana, lat, lon, batas=15):
    q = urllib.parse.urlencode({"geometry": json.dumps({"x": lon, "y": lat, "spatialReference": {"wkid": 4326}}),
                                "geometryType": "esriGeometryPoint", "returnGeometry": "false", "f": "json"})
    req = urllib.request.Request(f"{url_layanan(bencana)}/identify?{q}", headers={"User-Agent": "pantau-bencana/1.0"})
    with urllib.request.urlopen(req, timeout=batas) as r:
        return json.loads(r.read())


def sah_baris(b):
    """Baris tanpa sumber atau tanggal ambil ditolak; tingkat selain perhatian ditolak (K8)."""
    return (b.get("tingkat") == "perhatian" and str(b.get("sumber", "")).startswith("https://")
            and len(str(b.get("tanggal_ambil", ""))) == 10 and b.get("bencana") in LAYANAN)


def catatan_titik(lat, lon, nama="", ambil=_identify, hari=None, tembolok=None):
    """-> daftar baris perhatian (satu per bencana). `tembolok` dict kunci 'bencana|lat|lon|tanggal' -> baris; bebas jaringan bila ada."""
    hari = hari or date.today().isoformat()
    keluar = []
    for bencana in LAYANAN:
        kunci = f"{bencana}|{lat:.4f}|{lon:.4f}|{hari}"
        if tembolok is not None and kunci in tembolok:
            keluar.append(tembolok[kunci])
            continue
        b = {"bencana": bencana, "tingkat": "perhatian", "titik": nama, "lat": round(lat, 4), "lon": round(lon, 4),
             "sumber": url_layanan(bencana), "tanggal_ambil": hari, "nilai": None, "kelas": None}
        try:
            v = ambil(bencana, lat, lon).get("value")
            n = float(v)  # 'NoData' -> ValueError
            b["nilai"] = round(n, 3)
            b["catatan"] = f"indeks bahaya InaRISK {bencana} {b['nilai']} (skala 0 sampai 1); {KELAS_KET}"
        except (ValueError, TypeError):
            b["catatan"] = f"InaRISK {bencana}: tidak ada nilai di titik ini (di luar cakupan raster); bukan berarti nol"
        except Exception:  # jaringan, timeout, JSON rusak, token: semuanya bukan galat fatal
            b["catatan"] = f"{GAGAL} untuk {bencana}"
            keluar.append(b)  # kegagalan tidak ditembolok
            continue
        if tembolok is not None:
            tembolok[kunci] = b
        keluar.append(b)
    return keluar


def catatan_rute(titik, **kw):
    """titik: [(nama, lat, lon)] (titik darat dan simpul rute). -> baris sah saja; rute tidak disentuh."""
    tb = kw.pop("tembolok", None)
    if tb is None and kw.get("ambil") is None:
        try:
            tb = json.loads(TEMBOLOK.read_text())
        except Exception:
            tb = {}
    baris = [b for n, la, lo in titik for b in catatan_titik(la, lo, n, tembolok=tb, **kw)]
    if kw.get("ambil") is None and tb:
        try:
            TEMBOLOK.parent.mkdir(parents=True, exist_ok=True)
            TEMBOLOK.write_text(json.dumps(tb, ensure_ascii=False))
        except OSError:
            pass
    return [b for b in baris if sah_baris(b)]


def uji():
    # fixture dalam berkas: tanpa jaringan
    def palsu(bencana, lat, lon):
        if bencana == "tsunami":
            return {"value": "NoData"}
        return {"value": "0.85"}
    r = catatan_titik(-7.54, 110.44, "Merapi", ambil=palsu, hari="2026-11-24")
    g = {b["bencana"]: b for b in r}
    assert g["gunung api"]["nilai"] == 0.85 and g["gunung api"]["kelas"] is None and KELAS_KET in g["gunung api"]["catatan"]
    assert g["tsunami"]["nilai"] is None and g["tsunami"]["nilai"] != 0 and "bukan berarti nol" in g["tsunami"]["catatan"]
    assert all(sah_baris(b) and b["tingkat"] == "perhatian" for b in r)

    def mati(*a):
        raise TimeoutError("x")
    r = catatan_titik(0, 100, ambil=mati, hari="2026-11-24")
    assert len(r) == 2 and all(GAGAL in b["catatan"] and b["nilai"] is None for b in r) and all(sah_baris(b) for b in r)

    # tembolok: panggilan kedua tanpa jaringan; kegagalan tidak ditembolok
    tb, n = {}, []
    def hitung(*a):
        n.append(1); return {"value": "0.3"}
    catatan_titik(1, 2, ambil=hitung, hari="2026-11-24", tembolok=tb)
    catatan_titik(1, 2, ambil=hitung, hari="2026-11-24", tembolok=tb)
    assert len(n) == 2  # dua bencana, satu putaran
    tb2 = {}
    catatan_titik(1, 2, ambil=mati, hari="2026-11-24", tembolok=tb2)
    assert not tb2

    # baris tanpa sumber, tanpa tanggal, atau bertingkat larangan ditolak
    ok = dict(g["gunung api"])
    assert sah_baris(ok)
    for k, v in (("sumber", ""), ("tanggal_ambil", ""), ("tingkat", "larangan")):
        assert not sah_baris({**ok, k: v}), k

    # hasil tidak mengubah rute: masukan titik tak berubah, keluaran hanya catatan perhatian
    titik = [("A", -7.54, 110.44), ("B", 1.0, 100.0)]
    salinan = list(titik)
    out = catatan_rute(titik, ambil=palsu, hari="2026-11-24", tembolok={})
    assert titik == salinan and len(out) == 4 and {b["tingkat"] for b in out} == {"perhatian"}
    assert not any("aman" in b["catatan"].lower() for b in out)
    print("zona_terbang uji: hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["cek"] and len(a) == 3:
        for b in catatan_titik(float(a[1]), float(a[2])):
            print(json.dumps(b, ensure_ascii=False))
    else:
        sys.exit(__doc__)
