"""METAR bandara Indonesia, 3 jam terakhir -> public/banjir/data/cuaca_metar.json (D2): lapisan observasi embusan, badai guntur, hujan, jarak pandang.

Sumber: aviationweather.gov/api/data/metar (NOAA, tanpa kunci), satu panggilan untuk semua ICAO. Daftar bandara = stasiun karhutla di
scripts/scrape/metar.py (public/data/metar.json) ditambah bandara besar yang terbukti melapor (probe 1 Nov 2026); yang tak melapor 3 jam terakhir tidak ditulis.
Per stasiun, laporan terbaru: angin dan embusan knot -> km/jam (x 1,852), jarak pandang m, kode cuaca (TS, RA, +RA, ...).
Penanda: embusan >= 54 km/jam (ambang Waspada angin cuaca.py) atau TS (badai guntur di bandara; VCTS = di sekitar, ts_dekat). Hanya hasil amatan bandara,
bukan alat ukur kabupaten: titik jarang dan pelaporan angin (bukan embusan) tidak selalu menyebut embusan.

JARAK PANDANG PER JAM (OP-8, 2 Nov 2026) -> public/udara/data/jarak_pandang.json: sumber utama BMKG Aviation (web-aviation.bmkg.go.id/web/metar_speci.php, halaman
publik tanpa login: GET untuk token CSRF lalu POST formulir "WA% WI%"; ~136 stasiun, 6 jam, tersegar 10 menit). NOAA hanya mengetahui ~6 bandara besar di Indonesia
(WIOK, WIOS, WIOP, WIOD, WAGG, WAGF, WIJJ tidak ada di NOAA), jadi NOAA dipakai cuma bila BMKG gagal. Koordinat/nama/provinsi: scripts/cuaca/data/bandara.json.
Stasiun yang tak melapor 6 jam terakhir tidak ditulis; yang laporan terbarunya lebih tua dari BASI_JAM ditandai basi=true.
Pakai: python3 scripts/cuaca/metar.py   |   python3 scripts/cuaca/metar.py uji
"""
from fractions import Fraction
import datetime as dt, http.cookiejar, importlib.util, json, os, re, sys, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, ANGIN, KELUAR, sekarang, simpan

URL = "https://aviationweather.gov/api/data/metar?format=json&hours=3&ids="
TAMBAHAN = ["WIII", "WIHH", "WARR", "WAHI", "WAHS", "WABB", "WADL", "WAPP", "WAQQ", "WILL", "WADD", "WAMH", "WAMG", "WAWW", "WAJW", "WAKK", "WIPT", "WIAO", "WIGG", "WIKB"]
KT = 1.852
BMKG = "https://web-aviation.bmkg.go.id/web/metar_speci.php"
JAM = 6
BASI_JAM = 3
TABEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/bandara.json")
KELUAR_UDARA = os.path.join(AKAR, "public/udara/data")
CUACA = re.compile(r"^(-|\+|VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)*$")
AWAN = re.compile(r"^(FEW|SCT|BKN|OVC|VV|NSC|SKC|NCD|///|\d\d/|M?\d\d/)")


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


def urai_vis(raw):
    """Teks METAR -> (vis_m, wx). vis_m None bila tak terbaca ('////' = sensor tak melapor). CAVOK = 9999; SM (AS) -> meter, dibatasi 9999. Satu fungsi untuk BMKG dan NOAA."""
    t = raw.replace("=", " ").split()
    i = next((k for k, x in enumerate(t) if re.fullmatch(r"(\d{3}|VRB)\d{2,3}(G\d{2,3})?(KT|MPS|KMH)", x)), None)
    if i is None:
        return None, None
    t = t[i + 1:]
    if t and re.fullmatch(r"\d{3}V\d{3}", t[0]):
        t = t[1:]
    vis, k = None, 0
    if t and t[0] == "CAVOK":
        return 9999, None
    if t and re.fullmatch(r"\d{4}(NDV)?", t[0]):
        vis, k = min(int(t[0][:4]), 9999), 1
    elif t and (re.fullmatch(r"M?\d+(/\d+)?SM", t[0]) or len(t) > 1 and t[0].isdigit() and re.fullmatch(r"\d+/\d+SM", t[1])):
        j = 2 if t[0].isdigit() else 1                                  # "1 1/2SM" = dua token
        mil = sum(Fraction(x.rstrip("SM").lstrip("M")) for x in t[:j])
        vis, k = min(round(float(mil) * 1609.34 / 100) * 100, 9999), j
    elif t and t[0] == "////":
        k = 1
    wx = []
    for x in t[k:]:
        if AWAN.match(x) or x in ("RMK", "TEMPO", "BECMG", "NOSIG"):
            break
        if x not in ("AUTO", "COR") and CUACA.match(x) and len(x) > 1 and not x.startswith("//"):
            wx.append(x)
    return vis, " ".join(wx) or None


def bmkg_ambil():
    """[(raw, waktu UTC)] dari web-aviation.bmkg.go.id: dua permintaan (GET token, POST formulir). Halaman publik; tidak login, tidak melewati kontrol akses."""
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    op.addheaders = [("User-Agent", "poskokarhutla/1.0 (riset karhutla BNPB)")]
    h = op.open(BMKG, timeout=30).read().decode("utf-8", "replace")
    tok = re.search(r'name="_token"[^>]*value="([^"]+)"', h)
    if not tok:
        raise RuntimeError("BMKG: token formulir tidak ditemukan (halaman berubah?)")
    n = dt.datetime.now(dt.timezone.utc)
    f = lambda d: d.strftime("%Y-%m-%dT%H:%M")
    isi = urllib.parse.urlencode({"_token": tok.group(1), "stasiun": "WA% WI%", "from": f(n - dt.timedelta(hours=JAM)), "to": f(n + dt.timedelta(hours=1)), "metar": "SA", "speci": "SP"}).encode()
    for coba in (1, 2):   # BMKG sesekali lambat sekali (jalan 2 Nov: satu timeout, sisanya < 2 dtk)
        try:
            return bmkg_baris(op.open(urllib.request.Request(BMKG, data=isi), timeout=60).read().decode("utf-8", "replace"))
        except OSError:
            if coba == 2:
                raise


def bmkg_baris(h):
    return [(r, dt.datetime.strptime(w, "%Y-%m-%d %H:%M:%S")) for r, w in re.findall(r"<td>((?:METAR|SPECI)[^<]*)</td>.*?<td>[A-Z]{4}</td>\s*<td>(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)</td>", h, re.S)]


def noaa_baris():
    """Cadangan bila BMKG gagal: rawOb NOAA 6 jam, bentuk sama dengan bmkg_ambil."""
    req = urllib.request.Request(URL.replace("hours=3", f"hours={JAM}") + ",".join(daftar_icao()), headers={"User-Agent": "poskokarhutla/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return [(m["rawOb"], dt.datetime.fromtimestamp(m["obsTime"], dt.timezone.utc).replace(tzinfo=None)) for m in json.loads(r.read().decode() or "[]") if m.get("rawOb")]


def olah_jam(baris, tabel, sekarang_utc):
    """[(raw, waktu)] -> (stasiun, tanpa_koordinat). Per ICAO: riwayat jam (t, vis_m, wx) menaik, satu entri per waktu; tanpa laporan = tidak ditulis; basi = laporan terbaru > BASI_JAM."""
    per, tanpa = {}, set()
    for raw, w in baris:
        m = re.match(r"(?:METAR|SPECI)(?: COR)? ([A-Z]{4}) ", raw)
        if not m or m.group(1)[:2] not in ("WA", "WI"):
            continue
        ic = m.group(1)
        if ic not in tabel:
            tanpa.add(ic)
            continue
        vis, wx = urai_vis(raw)
        per.setdefault(ic, {})[w.strftime("%Y-%m-%dT%H:%MZ")] = {"t": w.strftime("%Y-%m-%dT%H:%MZ"), "vis_m": vis, "wx": wx}
    out = []
    for ic in sorted(per):
        jam = [per[ic][k] for k in sorted(per[ic])]
        umur = (sekarang_utc - dt.datetime.strptime(jam[-1]["t"], "%Y-%m-%dT%H:%MZ")).total_seconds() / 3600
        nama, lat, lon, prov = tabel[ic]
        out.append({"icao": ic, "nama": nama, "lat": lat, "lon": lon, "prov": prov, "basi": umur > BASI_JAM, "jam": jam})
    return out, sorted(tanpa)


def main_jarak():
    tabel = json.load(open(TABEL))["bandara"]
    try:
        baris, sumber = bmkg_ambil(), "BMKG Aviation (web-aviation.bmkg.go.id), METAR/SPECI"
        if not baris:
            raise RuntimeError("BMKG: 0 laporan")
    except Exception as e:
        print(f"jarak pandang: BMKG gagal ({e}); cadangan NOAA", file=sys.stderr)
        baris, sumber = noaa_baris(), "aviationweather.gov (NOAA), METAR/SPECI (cadangan; BMKG gagal)"
    n = dt.datetime.now(dt.timezone.utc)
    st, tanpa = olah_jam(baris, tabel, n.replace(tzinfo=None))
    if not st:
        raise RuntimeError("jarak pandang: 0 stasiun melapor: berkas lama dibiarkan")
    simpan(os.path.join(KELUAR_UDARA, "jarak_pandang.json"), {"dibuat": sekarang(), "sumber": sumber, "jam": JAM, "basi_jam": BASI_JAM, "stasiun": st})
    print(f"jarak pandang: {len(st)} stasiun melapor, {sum(s['basi'] for s in st)} basi; tanpa koordinat {tanpa or '-'}", file=sys.stderr)


def main_noaa():
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


def main():
    gagal = []
    for f in (main_jarak, main_noaa):   # saling tak bergantung: satu gagal tidak menahan yang lain
        try:
            f()
        except Exception as e:
            gagal.append(f"{f.__name__}: {e}")
            print(f"galat {f.__name__}: {e}", file=sys.stderr)
    if len(gagal) == 2:
        sys.exit(1)


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
    # jarak pandang (OP-8)
    v = urai_vis
    assert v("METAR WIOO 021030Z 27004KT 9999 SCT013 29/25 Q1011 NOSIG=") == (9999, None)
    assert v("METAR WIOK 021030Z VRB02KT 6000 FEW010CB SCT012 29/25 Q1011=") == (6000, None)
    assert v("METAR WIOK 020900Z 25007KT 230V290 4000 TS FEW010CB 29/25 Q1010=") == (4000, "TS")     # variasi arah dilompati
    assert v("METAR WIBB 021030Z 07006KT 3000 -RA BR SCT010 30/26 Q1009 RERA=") == (3000, "-RA BR")
    assert v("METAR WIOK 020730Z 27009KT 240V310 //// ////// 32/25 Q1010=") == (None, None)            # sensor tak melapor: None, bukan 0
    assert v("METAR WXXX 021030Z 00000KT CAVOK 29/25 Q1010=") == (9999, None)
    assert v("METAR WXXX 021030Z 18005KT 0800 FG VV001 24/24 Q1010=") == (800, "FG")
    assert v("METAR WXXX 021030Z 18005KT 3/4SM BR 24/24 A2992=") == (1200, "BR") and v("METAR WXXX 021030Z 18005KT 1 1/2SM HZ 24/24=") == (2400, "HZ") and v("METAR WXXX 021030Z 18005KT 10SM 24/24=")[0] == 9999
    assert v("METAR WXXX 021030Z 18005KT 9999NDV VCTS SCT020CB 24/24=") == (9999, "VCTS") and v("METAR WXXX 021030Z 18005KT 7000 NSC 24/24=") == (7000, None) and v("tak jelas") == (None, None)
    tb = {"WIOK": ["Ketapang", -1.8, 109.9, "61"], "WIOS": ["Sintang", 0.1, 111.5, "61"]}
    h = ('<tr><td>METAR WIOK 021030Z VRB02KT 6000 SCT012 29/25 Q1011=</td><td><span>SAID40 x</span></td><td>WIOK</td><td>2026-11-02 10:30:00</td></tr>'
         '<tr><td>METAR WIOK 021000Z 23004KT 9999 SCT012 29/25 Q1011=</td><td></td><td>WIOK</td><td>2026-11-02 10:00:00</td></tr>'
         '<tr><td>METAR WIOK 021000Z 23004KT 9999 SCT012 29/25 Q1011=</td><td></td><td>WIOK</td><td>2026-11-02 10:00:00</td></tr>'
         '<tr><td>SPECI WIOS 020500Z 00000KT 2000 TSRA BKN012 29/25 Q1011=</td><td></td><td>WIOS</td><td>2026-11-02 05:00:00</td></tr>'
         '<tr><td>METAR WIOP 021000Z 23004KT 9999 SCT012 29/25 Q1011=</td><td></td><td>WIOP</td><td>2026-11-02 10:00:00</td></tr>')
    st, tanpa = olah_jam(bmkg_baris(h), tb, dt.datetime(2026, 11, 2, 10, 40))
    assert [s["icao"] for s in st] == ["WIOK", "WIOS"] and tanpa == ["WIOP"]                         # stasiun di luar tabel dilaporkan, bukan ditebak
    assert [j["t"] for j in st[0]["jam"]] == ["2026-11-02T10:00Z", "2026-11-02T10:30Z"] and st[0]["jam"][1]["vis_m"] == 6000   # duplikat BMKG disatukan, menaik
    assert not st[0]["basi"] and st[1]["basi"] and st[1]["jam"][0] == {"t": "2026-11-02T05:00Z", "vis_m": 2000, "wx": "TSRA"}   # laporan 5,5 jam lalu ditandai basi
    ta = json.load(open(TABEL))["bandara"]
    assert all(k in ta for k in ("WIOO", "WIOK", "WIOS", "WIOP", "WIOD", "WIOG", "WAGG", "WAGS", "WAGF", "WAOO", "WIJJ", "WIBB", "WALL", "WIPP")) and len(ta) >= 130
    print("ok metar")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
