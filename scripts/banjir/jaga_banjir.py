"""Penjaga sebelum menerbitkan/commit data banjir: tolak yang basi. Memakai ulang scripts/terbit/jaga_segar.py (waktu, BATAS_JAM, PAKSA_TERBIT).

Sumber eksternal boleh gagal tanpa menjatuhkan run (data lama bertahan), tetapi data lama TIDAK boleh lolos diam-diam:
- public/banjir/data/meta.json `dibuat` tidak lebih tua dari BATAS_JAM (dari jaga_segar);
- public/banjir/data/hujan.json `hari_ini` = hari ini WIB (hujan.py gagal dua kali = data kemarin, ditolak).
Darurat: env PAKSA_TERBIT=1.
Pakai:  python3 scripts/banjir/jaga_banjir.py   (keluar 1 bila basi)  |  python3 scripts/banjir/jaga_banjir.py uji
"""
import datetime as dt, json, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../terbit"))
from jaga_segar import BATAS_JAM, waktu

AKAR = os.path.join(os.path.dirname(__file__), "../..")
WIB = dt.timezone(dt.timedelta(hours=7))


def periksa(akar=AKAR, kini=None):
    kini = kini or dt.datetime.now(dt.timezone.utc)
    m = []
    d = os.path.join(akar, "public/banjir/data")
    try:
        t = waktu(json.load(open(os.path.join(d, "meta.json")))["dibuat"])
        umur = (kini - t).total_seconds() / 3600
        if umur > BATAS_JAM:
            m.append(f"banjir/meta.json `dibuat` {t.isoformat()} ({umur:.0f} jam lalu, batas {BATAS_JAM} jam)")
    except (OSError, ValueError, KeyError, TypeError) as e:
        m.append(f"banjir/meta.json tidak terbaca ({type(e).__name__})")
    try:
        hi, ini = json.load(open(os.path.join(d, "hujan.json")))["hari_ini"], kini.astimezone(WIB).date().isoformat()
        if hi != ini:
            m.append(f"banjir/hujan.json hari_ini {hi} bukan hari ini WIB {ini}: prakiraan hujan gagal diperbarui")
    except (OSError, ValueError, KeyError, TypeError) as e:
        m.append(f"banjir/hujan.json tidak terbaca ({type(e).__name__})")
    return m


def uji():
    import tempfile
    a = tempfile.mkdtemp()
    os.makedirs(a + "/public/banjir/data")
    tulis = lambda dibuat, hi: (json.dump({"dibuat": dibuat}, open(a + "/public/banjir/data/meta.json", "w")),
                                json.dump({"hari_ini": hi}, open(a + "/public/banjir/data/hujan.json", "w")))
    kini = dt.datetime(2026, 10, 27, 1, tzinfo=dt.timezone.utc)   # 08.00 WIB
    tulis("2026-10-27T07:30+07:00", "2026-10-27")
    assert periksa(a, kini) == []
    tulis("2026-10-27T07:30+07:00", "2026-10-26")   # hujan.py gagal: kemarin
    assert any("hujan.json" in x for x in periksa(a, kini))
    tulis("2026-10-20T07:30+07:00", "2026-10-27")
    assert any("meta.json" in x for x in periksa(a, kini))
    os.remove(a + "/public/banjir/data/meta.json")
    assert any("tidak terbaca" in x for x in periksa(a, kini))
    print("ok jaga_banjir")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
        sys.exit(0)
    if os.environ.get("PAKSA_TERBIT") == "1":
        print("::warning title=PAKSA_TERBIT::pemeriksaan kesegaran banjir dilewati")
        sys.exit(0)
    masalah = periksa()
    for x in masalah:
        print(f"::error title=Data banjir basi::{x}")
    sys.exit(1 if masalah else 0)
