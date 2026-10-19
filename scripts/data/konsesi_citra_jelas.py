"""Citra Sentinel-2 yang PALING JELAS memperlihatkan api aktif atau bekas bakar di tiap konsesi (laporan konsesi 2026).

Pakai:  KONSESI_PROV=16 python3 scripts/data/konsesi_citra_jelas.py   # -> public/data/konsesi2026/citra/*_jelas_*.png + citra_jelas.json

Semua adegan Sentinel-2 L2A Jul s.d. hari ini yang menutup konsesi diperiksa kasar (80 x 80 piksel per kotak):
- awan+bayangan (SCL 3, 8, 9, 10) dan tanpa data dibuang bila > 50% / > 40%;
- bekas bakar: dNBR, NBR turun > 0,27 dibanding NBR tertinggi adegan bersih sebelumnya di piksel yang sama
  (acuan dikumpulkan sejak Juni; gambut terbakar tetap ber-NBR positif, jadi NBR mutlak tidak dipakai);
- api aktif: B12 > 0,30 dan B12 > 1,2 x B8A.
Adegan dengan api aktif (maks 2, terbanyak api) dipilih dulu. Skor = (% bekas bakar baru + 8 x % api) x (1 - awan)^2 di piksel jauh dari awan; bekas bakar juga wajib NBR < 0,2.\n4 adegan terbaik (awan <= 45%, skor >= 0,5) digambar
penuh 500 px dengan kanal SWIR yang sama seperti konsesi_citra.py. Mesin baca COG dari citra.py.
"""
import datetime as dt, json, math, os, sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import citra as C  # noqa: E402
import konsesi_citra as K  # noqa: E402

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DIR = os.path.join(AKAR, "public/data/konsesi2026")
KELUAR = os.path.join(DIR, "citra")
PROV = os.environ.get("KONSESI_PROV", "16").split(",")
TOP = int(os.environ.get("KONSESI_TOP", 60))
DARI = os.environ.get("KONSESI_DARI", "2026-06-01")
N = 80


def kotak_konsesi(r):
    xs = [c[0] for g in r["geom"] for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]) for c in poly[0]]
    ys = [c[1] for g in r["geom"] for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]) for c in poly[0]]
    lat0 = (min(ys) + max(ys)) / 2
    km = max((max(xs) - min(xs)) * 111.32 * math.cos(math.radians(lat0)), (max(ys) - min(ys)) * 110.574) * 1.1 + 2
    if km > K.MAKS_KM:  # konsesi besar: kotak 40 km di sekitar titik panas terbanyak
        km = K.MAKS_KM
        lat, lon = K.pusat_padat(r["pt"])
    else:
        lat, lon = lat0, (min(xs) + max(xs)) / 2
    return lat, lon, max(km, 6)


def pita(item, k, lat, lon, km):
    A = item["assets"][k]
    c = C.COG(A["href"])
    x0, y0, r0, kiri, atas = K.jendela(item, k, lat, lon, km)
    rb = (A.get("raster:bands") or [{}])[0]
    sk, of = rb.get("scale", 1e-4), rb.get("offset", 0)
    v = c.contoh(C.level_untuk(c, r0, km * 1000 / N), x0, y0, r0, kiri, atas, km * 1000, N)[0]
    return [None if d == 0 else d * sk + of for d in v]


def sampel(item, lat, lon, km, rinci=False):
    """rinci=True menambah elemen ke-6: penanda gosong per piksel (list bool).
    NBR per piksel (None = awan/bayangan/kosong) + api aktif per piksel; None bila adegan tak terpakai"""
    scl = C.COG(item["assets"]["scl"]["href"])
    x0, y0, r0, kiri, atas = K.jendela(item, "scl", lat, lon, km)
    s = scl.contoh(0, x0, y0, r0, kiri, atas, km * 1000, N)[0]
    kosong = sum(1 for x in s if x == 0) / len(s)
    awan = sum(1 for x in s if x in (3, 8, 9, 10)) / max(1, len(s) - sum(1 for x in s if x == 0))
    if kosong > .40 or awan > .60:
        return None
    b12, b8 = pita(item, "swir22", lat, lon, km), pita(item, "nir08", lat, lon, km)
    # awan diperlebar 1 piksel (± 500 m): tepi awan dan bayangan tipis tidak tertangkap SCL
    buruk = {i for i, x in enumerate(s) if x in (0, 3, 6, 8, 9, 10)}   # 6 = air: laut/sungai bukan lahan hangus
    jauh = set()
    for i in buruk:
        y, x = divmod(i, N)
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                if 0 <= y + dy < N and 0 <= x + dx < N:
                    jauh.add((y + dy) * N + x + dx)
    nbr, api, gosong = [], [], []
    for i, (x, a, b) in enumerate(zip(s, b12, b8)):
        ok = i not in jauh and a is not None and b is not None and a + b > 0
        nbr.append((b - a) / (b + a) if ok else None)
        api.append(ok and a > .30 and a > 1.2 * b)
        gosong.append(ok and a >= .85 * b and b < .2 and a > .06)   # SWIR >= NIR, NIR rendah: lahan hangus (tanpa acuan)
    n = sum(1 for v in nbr if v is not None)
    r = (nbr, api, round(100 * awan), round(100 * kosong), (100 * sum(gosong) / n if n else 0))
    return r + (gosong,) if rinci else r


def satu(r):
    lat, lon, km = kotak_konsesi(r)
    q = {"collections": ["sentinel-2-l2a"], "bbox": C.kotak(lat, lon, 2), "limit": 100,
         "datetime": f"{DARI}T00:00:00Z/{dt.date.today().isoformat()}T23:59:59Z",
         "query": {"eo:cloud_cover": {"lt": 85}}, "sortby": [{"field": "properties.datetime", "direction": "asc"}]}
    data, lihat = [], set()
    for it in json.loads(C.ambil(C.STAC, data=json.dumps(q).encode()))["features"]:
        tgl = it["properties"]["datetime"][:10]
        if tgl in lihat:
            continue
        try:
            v = sampel(it, lat, lon, km)
        except Exception as e:
            print("  gagal", it["id"], e, file=sys.stderr)
            continue
        if v:
            lihat.add(tgl)
            data.append((tgl, it, *v))
    # dNBR: acuan = NBR tertinggi per piksel dari adegan bersih sebelumnya; turun > 0,27 = terbakar (ambang baku Key & Benson)
    acuan = [None] * (N * N)
    hasil = []
    awal = min((p[2] for p in r["pt"]), default="01-01")
    for tgl, it, nbr, api, aw, ks, pg in data:
        bersih = sum(1 for v in nbr if v is not None)
        sah = [i for i, v in enumerate(nbr) if v is not None and acuan[i] is not None]
        if bersih > N * N * .10 and tgl[5:] >= awal[:5]:   # sesudah titik panas pertama perusahaan ini
            pb = 100 * sum(1 for i in sah if acuan[i] - nbr[i] > .27 and nbr[i] < .2) / len(sah) if len(sah) > N * N * .10 else 0
            pa = 100 * sum(1 for v in api if v) / bersih
            pb = max(pb, pg * .6)
            hasil.append(((round((pb + 8 * pa) * (1 - aw / 100) ** 2, 1), round(pb, 1), round(pa, 2), aw, ks), it, tgl))
        for i, v in enumerate(nbr):
            if v is not None and (acuan[i] is None or v > acuan[i]):
                acuan[i] = v
    urut = sorted(hasil, key=lambda h: -h[0][0])
    # api aktif (merah di SWIR) didahulukan: 2 adegan dengan api terbanyak, baru sisanya menurut skor (pemilik, 19 Okt 2026)
    pilih = sorted([h for h in urut if h[0][2] > 0 and h[0][3] <= 60], key=lambda h: -h[0][2])[:2]
    pilih += [h for h in urut if h not in pilih and h[0][0] >= .5 and h[0][3] <= 45][:4 - len(pilih)]   # jelas: awan <= 45%
    pilih += [h for h in urut if h not in pilih and h[0][0] >= .3][:4 - len(pilih)]   # sisanya terbaik yang ada
    out = []
    for (skor, pb, pa, aw, ks), it, tgl in sorted(pilih, key=lambda h: h[2]):
        f = f"{r['id']}_jelas_{tgl.replace('-', '')}.png"
        if not os.path.exists(os.path.join(KELUAR, f)):
            K.swir(it, lat, lon, km, os.path.join(KELUAR, f))
        out.append({"f": f"konsesi2026/citra/{f}", "bbox": C.kotak(lat, lon, km), "tgl": tgl, "awan": aw, "skor": skor,
                    "bakar_pct": pb, "api_pct": pa, "satelit": "Sentinel-" + it["properties"].get("platform", "sentinel-2?").split("-")[-1].upper(),
                    "adegan": it["id"]})
    print(f"  {r['nama']}: {len(data)} adegan, {len(hasil)} dinilai, {len(out)} jelas " + " ".join(f"{h[2]}:{h[0][0]}" for h in sorted(hasil, key=lambda h: -h[0][0])[:4]), file=sys.stderr)
    return out


def main():
    os.makedirs(KELUAR, exist_ok=True)
    jalur = os.path.join(DIR, "citra_jelas.json")
    hasil = json.load(open(jalur)) if os.path.exists(jalur) else {}
    rs = [r for k in PROV if os.path.exists(os.path.join(DIR, f"{k}.json"))
          for r in json.load(open(os.path.join(DIR, f"{k}.json")))["perusahaan"][:TOP] if os.environ.get("KONSESI_ULANG") or not hasil.get(r["id"])]
    print(f"{len(rs)} konsesi", file=sys.stderr)

    def jalan(r):
        try:
            return r["id"], satu(r)
        except Exception as e:
            print("  gagal", r["nama"], e, file=sys.stderr)
            return r["id"], None
    with ThreadPoolExecutor(int(os.environ.get("KONSESI_UTAS", 4))) as ex:
        for i, (rid, h) in enumerate(ex.map(jalan, rs)):
            if h is not None:
                hasil[rid] = h
            json.dump(hasil, open(jalur, "w"), separators=(",", ":"))
    print(f"citra_jelas.json: {sum(len(v) for v in hasil.values())} citra jelas untuk {sum(1 for v in hasil.values() if v)} konsesi", file=sys.stderr)


if __name__ == "__main__":
    main()
