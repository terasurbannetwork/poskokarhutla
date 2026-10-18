"""Siklon tropis aktif di sekitar Indonesia -> public/banjir/data/cuaca_siklon.json

Sumber: peringatan resmi JTWC (RSS https://www.metoc.navy.mil/jtwc/rss/jtwc.rss, teks "TC Warning" tiap sistem): posisi amatan dan
prakiraan 12-120 jam, angin maksimum 1 menit (knot). Hanya sistem yang salah satu titik lintasannya di kotak lat -25..20, lon 80..160.
Sumber kedua GDACS (gdacs.org/gdacsapi, gabungan JTWC/NOAA): hanya menambah sistem yang tidak ada di JTWC (nama sama = JTWC menang) dan menjadi cadangan
bila JTWC tak terjangkau. Lintasan GDACS berupa ruas garis + lingkaran per titik waktu; sudut angin per titik tidak diterbitkan, jadi angin_kt hanya
terisi di posisi terakhir (dari severity GDACS, km/jam -> knot) dan kategori per titik ada di "kategori_titik". BMKG TCWC Jakarta: tak ada umpan data
terbuka (halaman bmkg.go.id/cuaca/siklon-tropis berupa HTML tanpa format stabil), tidak dipakai.
Tidak ada siklon aktif = "aktif": [] (sah). Kerucut ketidakpastian tidak diterbitkan JTWC dalam teks: kerucut_km = null (bila diisi,
satu radius km per titik lintasan, urutan sama). BoM tidak dipakai: teks peringatannya tak punya format stabil; JTWC mencakup belahan selatan.
Pakai: python3 scripts/cuaca/siklon.py   |   python3 scripts/cuaca/siklon.py uji
"""
import datetime as dt, json, os, re, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, sekarang, simpan

RSS = "https://www.metoc.navy.mil/jtwc/rss/jtwc.rss"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
KOTAK = (-25, 20, 80, 160)   # lat_min, lat_maks, lon_min, lon_maks
BASIN = {"W": "Pasifik Barat Laut", "P": "Pasifik Selatan", "S": "Samudra Hindia Selatan", "B": "Teluk Benggala", "A": "Laut Arab"}


def kategori(kt):
    return "Depresi tropis" if kt < 34 else "Badai tropis" if kt < 64 else "Siklon tropis" if kt < 130 else "Siklon tropis super"


def waktu(ddhhmm, acuan):
    """'180600Z' (hari-jam-menit UTC) -> datetime UTC terdekat dengan `acuan` (menangani pergantian bulan)."""
    d, h, m = int(ddhhmm[:2]), int(ddhhmm[2:4]), int(ddhhmm[4:6])
    c = []
    for g in (-1, 0, 1):
        y, b = divmod(acuan.year * 12 + acuan.month - 1 + g, 12)
        try:
            c.append(dt.datetime(y, b + 1, d, h, m, tzinfo=dt.timezone.utc))
        except ValueError:
            pass
    return min(c, key=lambda x: abs(x - acuan))


def lintasan_dari(teks, acuan):
    """Teks peringatan JTWC -> [[ISO WIB, lat, lon, kt, 'amatan'|'prakiraan']]."""
    out = []
    pola = re.compile(r"(?:WARNING POSITION:|\d+ HRS, VALID AT:)\s*\n\s*(\d{6})Z --- (?:NEAR )?([\d.]+)([NS]) ([\d.]+)([EW])\s*\n"
                      r"(?:[^\n]*\n){0,6}?\s*MAX SUSTAINED WINDS - (\d+) KT", re.M)
    for m in pola.finditer(teks):
        la = float(m[2]) * (1 if m[3] == "N" else -1)
        lo = float(m[4]) * (1 if m[5] == "E" else -1)
        t = waktu(m[1], acuan).astimezone(dt.timezone(dt.timedelta(hours=7)))
        out.append([t.isoformat(timespec="minutes"), la, lo, int(m[6]), "amatan" if not out else "prakiraan"])
    return out


def sistem(teks, url, acuan):
    """Satu teks peringatan -> entri aktif, atau None (tak terbaca / di luar kotak)."""
    m = re.search(r"SUBJ/(.*?)\s+(\d{2})([A-Z])\s+(?:\((\w+)\)\s+)?WARNING NR", teks)
    lin = lintasan_dari(teks, acuan)
    if not m or not lin:
        return None
    if not any(KOTAK[0] <= p[1] <= KOTAK[1] and KOTAK[2] <= p[2] <= KOTAK[3] for p in lin):
        return None
    nomor = m[2] + m[3]
    return {"id": "jtwc-" + nomor, "nama": (m[4] or nomor).title(), "sumber": "JTWC", "basin": BASIN.get(m[3], m[3]),
            "angin_kt": lin[0][3], "tekanan_hpa": None, "kategori": kategori(lin[0][3]), "lintasan": lin, "kerucut_km": None, "tautan": url}


HOST_BOLEH = ("https://www.gdacs.org/", "https://www.metoc.navy.mil/")


def unduh(url):
    if not url.startswith(HOST_BOLEH):   # URL berasal dari isi respons (RSS/GDACS): hanya dua host tepercaya
        raise ValueError(f"URL ditolak (bukan {HOST_BOLEH}): {url[:80]}")
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
        return r.read().decode("utf-8", "replace")


GDACS = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC&fromDate={a}&toDate={b}&alertlevel=Green;Orange;Red"
KAT_GDACS = {"TD": "Depresi tropis", "TS": "Badai tropis", "HU": "Siklon tropis", "TY": "Siklon tropis", "STY": "Siklon tropis super", "CAT5": "Siklon tropis super"}


def rantai(segmen):
    """Ruas garis [(a, b, label, prakiraan)] -> titik berurutan dari paling lama ke paling baru [(lon, lat, label)]; ruas tersambung ujung ke ujung.
    Ujung paling baru = ujung yang bersambung ke ruas prakiraan (tanpa prakiraan: ujung ke-2 dari ruas pertama berdaftar)."""
    tetangga = {}
    for sg in segmen:
        for u, v in ((sg[0], sg[1]), (sg[1], sg[0])):
            tetangga.setdefault(tuple(u), []).append((tuple(v), sg))
    ujung = [k for k, v in tetangga.items() if len(v) == 1]
    if len(ujung) != 2:
        raise ValueError(f"ruas lintasan tidak membentuk satu rantai ({len(ujung)} ujung)")
    baru = next((k for k in ujung if tetangga[k][0][1][3]), None)
    lama = next(k for k in ujung if k != baru) if baru else ujung[0]
    if baru is None:
        baru = next(k for k in ujung if k != lama)
    rute, kini, pakai = [(lama, None)], lama, set()
    while True:
        lanjut = [(v, sg) for v, sg in tetangga[kini] if id(sg) not in pakai]
        if not lanjut:
            break
        v, sg = lanjut[0]
        pakai.add(id(sg))
        rute.append((v, sg[2]))
        kini = v
    if kini != baru:
        raise ValueError("rantai lintasan berakhir bukan di ujung prakiraan")
    return rute


def sistem_gdacs(daftar_f, geom, tahun):
    """Fitur daftar GDACS + geometri -> entri aktif atau None. tahun = tahun UTC sekarang untuk label 'dd/mm hh:mm UTC'."""
    p = daftar_f["properties"]
    ft = geom["features"]
    ruas = [(f["geometry"]["coordinates"][0], f["geometry"]["coordinates"][1], f["properties"].get("polygonlabel"), bool(f["properties"].get("forecast")))
            for f in ft if f["geometry"]["type"] == "LineString"]
    waktu_titik = [f["properties"]["polygonlabel"] for f in sorted((f for f in ft if f["properties"].get("featuretype") == "PointRadii"),
                                                                    key=lambda f: int(f["properties"]["Class"].rsplit("_", 1)[1]))]
    ref = dt.datetime.fromisoformat(next(f["properties"]["polygondate"] for f in ft if f["properties"].get("polygondate"))).replace(tzinfo=dt.timezone.utc)
    if not ruas or len(waktu_titik) != len(ruas) + 1:
        raise ValueError(f"{p['eventname']}: {len(ruas)} ruas dan {len(waktu_titik)} waktu tidak cocok")
    rute = rantai(ruas)
    lin, kat = [], []
    for (xy, label), w in zip(rute, waktu_titik):
        t = dt.datetime.strptime(f"{tahun} {w[:-4]}", "%Y %d/%m %H:%M").replace(tzinfo=dt.timezone.utc)
        lin.append([t.astimezone(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"), xy[1], xy[0], None, "amatan" if t <= ref else "prakiraan"])
        kat.append(label)
    if not any(KOTAK[0] <= q[1] <= KOTAK[1] and KOTAK[2] <= q[2] <= KOTAK[3] for q in lin):
        return None
    kt = round(p["severitydata"]["severity"] / 1.852) if p.get("severitydata", {}).get("severityunit") == "km/h" else None
    kini = max((i for i, q in enumerate(lin) if q[4] == "amatan"), default=0)
    lin[kini][3] = kt
    nama = p["eventname"].rsplit("-", 1)[0].title()
    return {"id": f"gdacs-{p['eventid']}", "nama": nama, "sumber": "GDACS/" + p.get("source", "?"), "basin": "GDACS", "angin_kt": kt, "tekanan_hpa": None,
            "kategori": kategori(kt) if kt is not None else None, "lintasan": lin, "kategori_titik": kat, "kerucut_km": None,
            "tautan": (p.get("url") or {}).get("report") or "https://www.gdacs.org/"}


def dari_gdacs(daftar, unduh_json, acuan):
    """-> (sistem aktif di kotak yang belum ada, galat). daftar = respons geteventlist."""
    out, galat = [], []
    for f in daftar.get("features", []):
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"]
        if str(p.get("iscurrent")).lower() != "true" or not (KOTAK[0] <= lat <= KOTAK[1] and KOTAK[2] <= lon <= KOTAK[3]):
            continue
        try:
            s = sistem_gdacs(f, unduh_json((p.get("url") or {}).get("geometry") or ""), acuan.year)
            if s:
                out.append(s)
        except Exception as e:
            galat.append(f"GDACS {p.get('eventname')}: {e}")
    return out, galat


def unduh_json(url):
    return json.loads(unduh(url))


def main():
    acuan, gagal, aktif, dilihat, sumber = dt.datetime.now(dt.timezone.utc), [], [], 0, []
    try:
        rss = unduh(RSS)
        sumber.append("JTWC (metoc.navy.mil)")
        for u in dict.fromkeys(re.findall(r"href='(https://[^']*?web\.txt)'", rss)):
            dilihat += 1
            try:
                s = sistem(unduh(u), u, acuan)
                if s:
                    aktif.append(s)
            except Exception as e:
                gagal.append(f"{u}: {e}")
    except Exception as e:
        gagal.append(f"JTWC RSS: {e}")
    try:
        dft = unduh_json(GDACS.format(a=(acuan - dt.timedelta(days=14)).date(), b=acuan.date()))
        sumber.append("GDACS (gdacs.org, JTWC/NOAA)")
        ada = {s["nama"].lower() for s in aktif}
        g, gl = dari_gdacs(dft, unduh_json, acuan)
        aktif += [s for s in g if s["nama"].lower() not in ada]
        gagal += gl
    except Exception as e:
        gagal.append(f"GDACS: {e}")
    if not sumber:
        # semua sumber tak terjangkau: berkas lama dibiarkan (bukan "tidak ada siklon")
        raise RuntimeError("; ".join(gagal))
    simpan(os.path.join(KELUAR, "cuaca_siklon.json"), {"dibuat": sekarang(), "sumber": sumber, "gagal": gagal, "aktif": aktif})
    print(f"cuaca siklon: {dilihat} peringatan JTWC, {len(aktif)} aktif di kotak; gagal {len(gagal)}", file=sys.stderr)


CONTOH = """WTPN32 PGTW 180900
SUBJ/SUPER TYPHOON 29W (CHAMPI) WARNING NR 016//
RMKS/
   WARNING POSITION:
   180600Z --- NEAR 13.1N 142.3E
     MOVEMENT PAST SIX HOURS - 270 DEGREES AT 12 KTS
     POSITION ACCURATE TO WITHIN 040 NM
     POSITION BASED ON CENTER LOCATED BY SATELLITE
     POSITION ACCURATE TO WITHIN 040 NM
     POSITION BASED ON CENTER LOCATED BY SATELLITE
   PRESENT WIND DISTRIBUTION:
   MAX SUSTAINED WINDS - 130 KT, GUSTS 160 KT
   FORECASTS:
   12 HRS, VALID AT:
   181800Z --- 13.8N 140.2E
   MAX SUSTAINED WINDS - 120 KT, GUSTS 145 KT
   24 HRS, VALID AT:
   190600Z --- 4.7S 138.3E
   MAX SUSTAINED WINDS - 90 KT, GUSTS 150 KT
"""


def uji():
    a = dt.datetime(2026, 10, 18, 10, tzinfo=dt.timezone.utc)
    assert [kategori(v) for v in (20, 34, 64, 130)] == ["Depresi tropis", "Badai tropis", "Siklon tropis", "Siklon tropis super"]
    b = dt.datetime(2026, 10, 30, 10, tzinfo=dt.timezone.utc)
    assert waktu("010600", b) == dt.datetime(2026, 11, 1, 6, tzinfo=dt.timezone.utc) and waktu("301200", dt.datetime(2026, 10, 2, tzinfo=dt.timezone.utc)).month == 9   # pergantian bulan
    s = sistem(CONTOH, "u", a)
    assert s["id"] == "jtwc-29W" and s["nama"] == "Champi" and s["angin_kt"] == 130 and s["basin"] == "Pasifik Barat Laut", s
    assert [p[4] for p in s["lintasan"]] == ["amatan", "prakiraan", "prakiraan"] and s["lintasan"][2][1:3] == [-4.7, 138.3]
    assert s["lintasan"][0][0] == "2026-10-18T13:00+07:00" and s["kerucut_km"] is None
    assert sistem(CONTOH.replace("13.1N 142.3E", "40.0N 170.0E").replace("13.8N 140.2E", "40.0N 170.0E").replace("4.7S 138.3E", "40.0N 170.0E"), "u", a) is None  # di luar kotak
    assert sistem("tidak ada peringatan", "u", a) is None
    # respons nyata 18 Okt 2026 (fixture/): RSS JTWC, teks peringatan 29W, daftar + geometri GDACS
    F = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture")
    rss = open(os.path.join(F, "jtwc.rss")).read()
    assert re.findall(r"href='(https://[^']*?web\.txt)'", rss)[::2] == ["https://www.metoc.navy.mil/jtwc/products/wp2926web.txt", "https://www.metoc.navy.mil/jtwc/products/sh0127web.txt"]   # ep2126 di tengah; ABPW/ABIO (tanda kutip ganda) bukan peringatan
    nyata = sistem(open(os.path.join(F, "jtwc_wp2926web.txt")).read(), "u", a)
    assert nyata["id"] == "jtwc-29W" and nyata["angin_kt"] == 130 and nyata["lintasan"][0][1:3] == [13.1, 142.3] and len(nyata["lintasan"]) >= 8, nyata["lintasan"]
    daftar = json.load(open(os.path.join(F, "gdacs_daftar.json")))
    geom = json.load(open(os.path.join(F, "gdacs_geometry_champi.json")))
    g, gl = dari_gdacs(daftar, lambda url: geom, a)
    assert gl == [] and [x["nama"] for x in g] == ["Champi"], (gl, [x["nama"] for x in g])   # TWENTYEIGHT (22,5 LU) dan TRUDY (Pasifik timur) di luar kotak
    c = g[0]
    assert len(c["lintasan"]) == 24 and c["lintasan"][0][1:3] == [9.6, 161.2] and c["lintasan"][-1][1:3] == [22.2, 123.5], c["lintasan"][::23]
    assert [q[4] for q in c["lintasan"]].count("amatan") == 16 and c["angin_kt"] == 140 and len(c["kategori_titik"]) == 24
    assert sum(1 for q in c["lintasan"] if q[3] is not None) == 1                     # angin hanya di posisi terakhir; tidak dikarang per titik
    try:
        sistem_gdacs(daftar["features"][0], {"features": [{"geometry": {"type": "Point", "coordinates": [1, 2]}, "properties": {"polygondate": "2026-10-18T06:00:00"}}]}, 2026)
        raise SystemExit("geometri tanpa ruas harus ditolak")
    except ValueError:
        pass
    try:
        rantai([([0, 0], [1, 1], "a", False), ([5, 5], [6, 6], "b", True)])           # dua rantai terputus
        raise SystemExit("rantai terputus harus ditolak")
    except ValueError:
        pass
    for jelek in ("http://www.gdacs.org/x", "https://evil.example/https://www.gdacs.org/", "file:///etc/passwd", "https://www.gdacs.org.evil.com/x", ""):
        try:
            unduh(jelek)
            raise SystemExit(f"URL {jelek!r} harus ditolak")
        except ValueError:
            pass
    print("ok siklon")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
