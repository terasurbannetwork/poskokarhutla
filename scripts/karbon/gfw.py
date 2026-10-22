"""Klien GFW Data API untuk modul karbon (docs/karbon/RANCANGAN.md §2).

SQL dan versi dibaca dari public/karbon/gfw_kueri.json (kontrak bersama dengan src/karbon.js);
tidak ada string SQL di sini.

Pakai:  from gfw import kueri; kueri("tutupan", geom)
        python3 scripts/karbon/gfw.py --uji      # self-check offline
"""
import datetime, hashlib, http.client, json, os, socket, sys, time

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
from lahan import dp, luas  # noqa: E402  Douglas-Peucker + luas cincin (derajat²)

KONTRAK = json.load(open(os.path.join(AKAR, "public/karbon/gfw_kueri.json")))
CACHE = os.path.join(AKAR, "data/raw/karbon/gfw")
MAKS_GEOM = 400_000  # byte JSON geometri; GFW menolak/lambat untuk muatan besar
HEADER_KUNCI = "x-api-key"  # PEKA HURUF: 'X-api-key' -> 403 (ranjau 22 Okt 2026)
COBA = 4


class GalatGFW(Exception):
    pass


def _cincin_bersih(c, min_luas=1e-9):
    c = [[float(x), float(y)] for x, y, *_ in c]
    if c and c[0] != c[-1]:
        c.append(c[0])
    return c if len(c) >= 4 and luas(c) > min_luas else None


def bersih(geom, maks=MAKS_GEOM):
    """Tutup cincin, buang cincin rusak/kecil, sederhanakan sampai JSON < maks byte."""
    polis = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    asli = []
    for p in polis:
        luar = _cincin_bersih(p[0]) if p else None
        if luar:
            asli.append([luar] + [r for r in map(_cincin_bersih, p[1:]) if r])
    if not asli:
        raise GalatGFW("geometri kosong setelah dibersihkan")
    tol, hasil = 0.0, asli
    while len(json.dumps({"type": "MultiPolygon", "coordinates": hasil})) > maks:
        tol = tol * 2 if tol else 0.0002
        hasil = []
        for p in asli:
            rs = [_cincin_bersih(dp([tuple(x) for x in r], tol)) for r in p]
            if rs[0]:
                hasil.append([rs[0]] + [r for r in rs[1:] if r])
        if tol > 0.1:
            raise GalatGFW("geometri tak bisa disederhanakan di bawah batas")
    return {"type": "MultiPolygon", "coordinates": hasil}


def _post(jalur, body, kunci, timeout=180):
    """POST mentah. Header ditulis lewat putheader supaya huruf kecilnya tidak diubah."""
    c = http.client.HTTPSConnection(KONTRAK["host"], timeout=timeout)
    try:
        c.putrequest("POST", jalur)
        c.putheader("content-type", "application/json")
        c.putheader(HEADER_KUNCI, kunci)
        c.putheader("content-length", str(len(body)))
        c.endheaders(body)
        r = c.getresponse()
        return r.status, r.read()
    finally:
        c.close()


def _versi(q, hari_mundur=0):
    if q["versi"] != "harian":
        return q["versi"]
    d = datetime.datetime.now(datetime.timezone.utc).date() - datetime.timedelta(days=hari_mundur)
    return d.strftime("v%Y%m%d")


def kueri(nama, geom, sejak=None, kunci=None, post=_post, cache=CACHE):
    q = KONTRAK["kueri"][nama]
    kunci = kunci or os.environ.get("GFW_API_KEY") or KONTRAK["kunci_publik"]
    sql = q["sql"].replace("{sejak}", sejak or "")
    g = bersih(geom)
    gjson = json.dumps(g, separators=(",", ":"))
    harian = q["versi"] == "harian"
    berkas = None
    if not harian and cache:
        h = hashlib.sha1((nama + q["versi"] + sql + gjson).encode()).hexdigest()  # SQL ikut: kontrak berubah = cache basi
        berkas = os.path.join(cache, h + ".json")
        if os.path.exists(berkas):
            return json.load(open(berkas))
    body = json.dumps({"sql": sql, "geometry": g}, separators=(",", ":")).encode()
    for mundur in range(4 if harian else 1):
        jalur = f"/dataset/{q['dataset']}/{_versi(q, mundur)}/query/json"
        for i in range(COBA):
            try:
                status, isi = post(jalur, body, kunci)
            except (socket.timeout, TimeoutError, ConnectionError, http.client.HTTPException, OSError) as e:
                status, isi = 0, str(e).encode()
            if status == 200 or status == 404 or (400 <= status < 500 and status != 429):
                break
            time.sleep(min(60, 5 * 2 ** i))
        if status == 404 and harian:
            continue
        break
    if status != 200:
        raise GalatGFW(f"{nama} HTTP {status}: {isi[:300].decode(errors='replace')}")
    baris = json.loads(isi)["data"]
    if berkas:
        os.makedirs(cache, exist_ok=True)
        with open(berkas + ".part", "w") as f:
            json.dump(baris, f)
        os.replace(berkas + ".part", berkas)
    return baris


def uji():
    import tempfile
    # header huruf kecil persis, lewat putheader (bukan dict headers yang bisa dikapitalkan)
    import inspect
    assert HEADER_KUNCI == "x-api-key"
    assert 'c.putheader(HEADER_KUNCI, kunci)' in inspect.getsource(_post)
    # bersih: cincin terbuka ditutup, cincin 3 titik dibuang
    g = bersih({"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1]], [[0.1, 0.1], [0.2, 0.1], [0.1, 0.1]]]})
    assert g["coordinates"] == [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]], g
    # penyederhanaan di bawah batas
    import math
    besar = [[math.cos(t / 20000 * 2 * math.pi) + 1e-5 * (t % 7), math.sin(t / 20000 * 2 * math.pi)] for t in range(20000)]
    s = bersih({"type": "Polygon", "coordinates": [besar]}, maks=50_000)
    assert len(json.dumps(s)) < 50_000 and abs(luas(s["coordinates"][0][0]) - math.pi) < 0.01
    # retry 5xx, 404 harian mundur, cache dipakai ulang, 4xx tidak di-retry
    panggil = []
    def palsu(jalur, body, kunci):
        panggil.append(jalur)
        if len(panggil) == 1:
            return 503, b"sibuk"
        return 200, json.dumps({"data": [{"ha": 1}]}).encode()
    global time
    tidur, time.sleep = time.sleep, lambda s: None
    try:
        with tempfile.TemporaryDirectory() as d:
            sq = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}
            assert kueri("serapan", sq, post=palsu, cache=d) == [{"ha": 1}]
            assert kueri("serapan", sq, post=palsu, cache=d) == [{"ha": 1}] and len(panggil) == 2, panggil
            panggil.clear()
            def v404(jalur, body, kunci):
                panggil.append(jalur)
                return (404, b"") if len(panggil) < 3 else (200, b'{"data":[]}')
            assert kueri("peringatan", sq, sejak="2026-10-01", post=v404, cache=d) == []
            assert len(panggil) == 3 and len({p.split("/")[3] for p in panggil}) == 3, panggil
            assert not os.listdir(d) or len(os.listdir(d)) == 1  # peringatan tidak di-cache
            assert json.loads(b'{"sql":"x"}')
            n = []
            try:
                kueri("tutupan", sq, post=lambda *a: (n.append(1), (403, b"no key"))[1], cache=d)
                raise AssertionError("403 mestinya galat")
            except GalatGFW:
                assert len(n) == 1
    finally:
        time.sleep = tidur
    print("gfw ok")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    else:
        print(json.dumps(kueri(sys.argv[1], json.load(open(sys.argv[2]))), indent=1))
