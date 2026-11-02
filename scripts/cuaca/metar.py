"""METAR bandara Indonesia, 3 jam terakhir -> public/banjir/data/cuaca_metar.json (D2): lapisan observasi embusan, badai guntur, hujan, jarak pandang.

Sumber: aviationweather.gov/api/data/metar (NOAA, tanpa kunci), satu panggilan untuk semua ICAO. Daftar bandara = stasiun karhutla di
scripts/scrape/metar.py (public/data/metar.json) ditambah bandara besar yang terbukti melapor (probe 1 Nov 2026); yang tak melapor 3 jam terakhir tidak ditulis.
Per stasiun, laporan terbaru: angin dan embusan knot -> km/jam (x 1,852), jarak pandang m, kode cuaca (TS, RA, +RA, ...).
Penanda: embusan >= 54 km/jam (ambang Waspada angin cuaca.py) atau TS (badai guntur di bandara; VCTS = di sekitar, ts_dekat). Hanya hasil amatan bandara,
bukan alat ukur kabupaten: titik jarang dan pelaporan angin (bukan embusan) tidak selalu menyebut embusan.
Pakai: python3 scripts/cuaca/metar.py   |   python3 scripts/cuaca/metar.py uji
"""
import datetime as dt, importlib.util, json, os, re, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, ANGIN, KELUAR, sekarang, simpan

URL = "https://aviationweather.gov/api/data/metar?format=json&hours=3&ids="
TAMBAHAN = ["WIII", "WIHH", "WARR", "WAHI", "WAHS", "WABB", "WADL", "WAPP", "WAQQ", "WILL", "WADD", "WAMH", "WAMG", "WAWW", "WAJW", "WAKK", "WIPT", "WIAO", "WIGG", "WIKB"]
KT = 1.852


def daftar_icao():
    """ICAO dari scrape/metar.py (dibaca sebagai berkas, tanpa menjalankannya) + TAMBAHAN."""
    try:
        sp = importlib.util.spec_from_file_location("scrape_metar", os.path.join(AKAR, "scripts/scrape/metar.py"))
        m = importlib.util.module_from_spec(sp)
        sp.loader.exec_module(m)
        dasar = list(m.P)
    except Exception:
        dasar = []
    return sorted(set(dasar) | set(TAMBAHAN))


def jarak_m(v):
    """visib METAR (statute mile; '6+' / '10+' = lebih dari itu) -> meter, 9999 bila >= 6 SM."""
    if v is None:
        return None
    if isinstance(v, str):
        return 9999
    return min(round(v * 1609.34 / 100) * 100, 9999)


def nama_bandara(n):
    """'Makassar/Hasanuddin Intl' -> 'Hasanuddin, Makassar'; akhiran Intl/Arpt/Airport dibuang."""
    n = re.sub(r"\s+(Intl|International|Arpt|Airport)$", "", (n or "").split(",")[0].strip())
    kota, _, nm = n.partition("/")
    return f"{nm.strip()}, {kota.strip()}" if nm.strip() else kota.strip()


def stasiun(m):
    wx = [t for t in (m.get("wxString") or "").split() if re.fullmatch(r"[-+A-Z]{2,8}", t)]
    inti = [re.sub(r"^[-+]|^VC", "", t) for t in wx]
    kmj = lambda v: None if v is None else round(v * KT)
    angin, gust = kmj(m.get("wspd")), kmj(m.get("wgst"))
    ts = any("TS" in t for t, i in zip(wx, inti) if not t.startswith("VC"))
    return {"icao": m["icaoId"], "nama": nama_bandara(m.get("name")), "lat": m["lat"], "lon": m["lon"],
            "waktu": dt.datetime.fromtimestamp(m["obsTime"], dt.timezone.utc).isoformat(timespec="minutes").replace("+00:00", "Z"),
            "arah": m.get("wdir"), "angin_kmj": angin, "embusan_kmj": gust, "jarak_pandang_m": jarak_m(m.get("visib")), "cuaca": wx,
            "ts": ts, "ts_dekat": any(t.startswith("VC") and "TS" in t for t in wx), "embusan_kencang": (gust or 0) >= ANGIN[0],
            "tanda": ts or (gust or 0) >= ANGIN[0], "raw": m.get("rawOb")}


def olah(data):
    """Respons -> daftar stasiun, laporan terbaru tiap ICAO Indonesia (WA*/WI*)."""
    terbaru = {}
    for m in data:
        if m["icaoId"][:2] in ("WA", "WI") and (m["icaoId"] not in terbaru or m["obsTime"] > terbaru[m["icaoId"]]["obsTime"]):
            terbaru[m["icaoId"]] = m
    return [stasiun(m) for _, m in sorted(terbaru.items())]


def main():
    ids = daftar_icao()
    req = urllib.request.Request(URL + ",".join(ids), headers={"User-Agent": "poskokarhutla/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        isi = r.read().decode() or "[]"
    st = olah(json.loads(isi))
    if not st:
        raise RuntimeError("METAR kosong (0 stasiun melapor): berkas lama dibiarkan")
    simpan(os.path.join(KELUAR, "cuaca_metar.json"), {"dibuat": sekarang(), "jam": 3, "sumber": "aviationweather.gov (NOAA), METAR/SPECI bandara", "n_diminta": len(ids),
                                                      "ambang_embusan_kmj": ANGIN[0], "stasiun": st})
    print(f"cuaca metar: {len(st)}/{len(ids)} stasiun melapor; embusan >= {ANGIN[0]} km/jam {sum(s['embusan_kencang'] for s in st)}, TS {sum(s['ts'] for s in st)}", file=sys.stderr)


def uji():
    a = {"icaoId": "WIEE", "obsTime": 1793529000, "lat": -.9, "lon": 100.3, "name": "Padang/Minangkabau, ID", "wdir": 270, "wspd": 15, "wgst": 32, "visib": 3.1,
         "wxString": "+TSRA BR", "rawOb": "x"}
    s = stasiun(a)
    assert s["angin_kmj"] == 28 and s["embusan_kmj"] == 59 and s["embusan_kencang"] and s["ts"] and s["tanda"] and s["jarak_pandang_m"] == 5000 and s["cuaca"] == ["+TSRA", "BR"]
    assert s["waktu"] == "2026-11-01T10:30Z", s["waktu"]
    b = stasiun({**a, "wgst": None, "wspd": 5, "wxString": "VCTS", "visib": "6+"})
    assert not b["ts"] and b["ts_dekat"] and not b["tanda"] and b["jarak_pandang_m"] == 9999 and b["embusan_kmj"] is None
    assert not stasiun({**a, "wxString": None, "wgst": 28})["tanda"] and stasiun({**a, "wxString": None, "wgst": 29})["embusan_kmj"] == 54   # 28 kt = 52 km/jam tidak, 29 kt = 54 ya
    assert nama_bandara("Makassar/Hasanuddin Intl") == "Hasanuddin, Makassar" and nama_bandara("Biak/Kaisiepo Arpt") == "Kaisiepo, Biak" and nama_bandara("Lombok Intl") == "Lombok" and s["nama"] == "Minangkabau, Padang"
    assert stasiun({**a, "wxString": "TS <b> -RA"})["cuaca"] == ["TS", "-RA"]
    lama = {**a, "obsTime": 1793520000, "wspd": 1}
    asing = {**a, "icaoId": "WMKK"}
    o = olah([lama, a, asing])
    assert [x["icao"] for x in o] == ["WIEE"] and o[0]["angin_kmj"] == 28           # laporan terbaru menang; ICAO asing dibuang
    assert "WIII" in daftar_icao() and len(daftar_icao()) >= 30
    print("ok metar")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
