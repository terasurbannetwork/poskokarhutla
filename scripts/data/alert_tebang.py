"""Alert tebang/pembukaan lahan (GFW integrated alerts: RADD + GLAD-S2 + GLAD-L) per kab/prov.

Pakai:  python3 scripts/data/alert_tebang.py            # tarik GFW -> public/data/alert_tebang.json
        python3 scripts/data/alert_tebang.py --uji      # self-check tanpa jaringan

Sumber: GFW Data API, dataset gfw_integrated_alerts (versi terbaru, dicari lewat /dataset/<id>/latest),
/query/json dengan geometri. Kunci publik yang sama dengan scrape/lahan.py (GFW sendiri menempelnya di
katalog; query hanya menerimanya lewat query string). User-Agent jujur; TIDAK pernah memalsu Origin/UA.

Mengapa tiap hal begini (jangan diubah tanpa membaca):
- BUKAN gadm__integrated_alerts__adm2_daily_alerts: 10-200x meleset dari hitung piksel.
- Tanggal TIDAK ikut GROUP BY bersama adm1+adm2+confidence (kunci hasil rusak/pecahan). Jendela 90 hari
  (confidence != nominal) dan 30 hari (semua keyakinan) ditarik sebagai dua kueri terpisah; kunci pecahan ditolak.
- GADM hanya memberi nomor adm1/adm2 tanpa nama: nomor dipetakan ke kabupaten kita lewat suara titik-pusat
  alert per ubin terhadap poligon public/geo/kabupaten.
- Gambut = PRIMS (public/data/lahan/gambut.geojson), konsesi = public/data/lahan/konsesi.geojson per jenis;
  keduanya dipakai sebagai geometri kueri (alert di dalamnya). Tanpa nama perusahaan.
"""
import collections, datetime as dt, json, math, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
KELUAR = os.path.join(AKAR, "public/data/alert_tebang.json")
API = "https://data-api.globalforestwatch.org"
DATASET = "gfw_integrated_alerts"
# Kunci publik GFW (lihat scrape/lahan.py); bukan kunci akun kita.
KUNCI = "2d60cd88-8348-4c0f-a6d5-bd9adb585a8c"
UA = "poskokarhutla-pipa-data/1.0 (+https://github.com/terasurbannetwork/poskokarhutla)"
UBIN = 1.0  # derajat
JENIS = ("sawit", "hti", "hph", "tambang")
N_SEL = 400
HARI90, HARI30 = 90, 30


def minta(url, badan=None, coba=5):
    for i in range(coba):
        try:
            r = urllib.request.Request(url, None if badan is None else json.dumps(badan).encode(),
                                       headers={"User-Agent": UA, "Content-Type": "application/json"})
            with urllib.request.urlopen(r, timeout=300) as f:
                j = json.load(f)
            if j.get("status") not in (None, "success"):
                raise RuntimeError(str(j)[:200])
            return j
        except Exception as e:  # 5xx / batas laju / putus: mundur berlipat
            if i == coba - 1:
                raise RuntimeError(f"{type(e).__name__}: {e}") from None
            time.sleep(3 * 2 ** i)


def versi():
    return minta(f"{API}/dataset/{DATASET}/latest?x-api-key={KUNCI}")["data"]["version"]


def kueri(ver, sql, geom):
    return minta(f"{API}/dataset/{DATASET}/{ver}/query/json?x-api-key={KUNCI}", {"sql": sql, "geometry": geom})["data"]


def kotak(x0, y0, x1, y1):
    return {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}


def bagian(g):
    return g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]


def di_dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
            c = not c
        j = i
    return c


def kunci_int(v):
    """adm1/adm2 harus bilangan bulat; pecahan = kunci rusak, tolak keras."""
    if isinstance(v, float) and not v.is_integer():
        raise ValueError(f"kunci pecahan dari GFW: {v!r}")
    return int(v)


def sql_adm(batas_tgl, tambah=""):
    """Satu baris per (adm1, adm2): luas. Tanggal hanya di WHERE. (AVG/SUM latitude/longitude TIDAK didukung: 500.)"""
    return ("SELECT gadm_administrative_boundaries__adm1, gadm_administrative_boundaries__adm2, "
            "SUM(area__ha) FROM data "
            f"WHERE gfw_integrated_alerts__date >= '{batas_tgl}'{tambah} "
            "GROUP BY gadm_administrative_boundaries__adm1, gadm_administrative_boundaries__adm2")


def baris_adm(rows):
    """-> {(a1,a2): ha}; kunci/nilai tak sah ditolak."""
    out = {}
    for r in rows:
        a1, a2 = kunci_int(r["gadm_administrative_boundaries__adm1"]), kunci_int(r["gadm_administrative_boundaries__adm2"])
        ha = float(r["area__ha"])
        if not (ha >= 0 and math.isfinite(ha)):
            raise ValueError(f"luas tak sah {ha!r}")
        out[(a1, a2)] = ha
    return out


# ------------------------------------------------------------------ lapisan lokal
def muat_geo(jalur):
    with open(os.path.join(AKAR, jalur)) as f:
        return json.load(f)


def ubin_dari(x, y):
    return (math.floor(x / UBIN), math.floor(y / UBIN))


def poligon_per_ubin(fitur_geo):
    """{ubin: [poligon]}; tiap poligon masuk SATU ubin (titik pertamanya) agar tak dihitung ganda."""
    out = collections.defaultdict(list)
    for f in fitur_geo:
        for p in bagian(f["geometry"]):
            x, y = p[0][0]
            out[ubin_dari(x, y)].append(p)
    return out


def geom_multi(polys):
    return {"type": "MultiPolygon", "coordinates": polys}


def ubin_indonesia(prov):
    """Ubin 1 derajat yang menyentuh provinsi: ubin yang memuat simpul poligon + titik pusat di dalam poligon."""
    u = set()
    for f in prov["features"]:
        for p in bagian(f["geometry"]):
            for x, y in p[0]:
                u.add(ubin_dari(x, y))
            xs, ys = [c[0] for c in p[0]], [c[1] for c in p[0]]
            for i in range(math.floor(min(xs)), math.floor(max(xs)) + 1):
                for j in range(math.floor(min(ys)), math.floor(max(ys)) + 1):
                    if di_dalam(i + .5, j + .5, p[0]):
                        u.add((i, j))
    return sorted(u)


class Kab:
    def __init__(self):
        self.k = []  # (prov, kab, [(x0,y0,x1,y1,poligon)])
        d = os.path.join(AKAR, "public/geo/kabupaten")
        for n in sorted(os.listdir(d)):
            if not n.endswith(".json"):
                continue
            for f in muat_geo(f"public/geo/kabupaten/{n}")["features"]:
                ps = [(min(c[0] for c in p[0]), min(c[1] for c in p[0]), max(c[0] for c in p[0]), max(c[1] for c in p[0]), p)
                      for p in bagian(f["geometry"])]
                self.k.append((n[:-5], f["properties"]["kab"], ps))

    def cari(self, x, y):
        for i, (_, _, ps) in enumerate(self.k):
            for x0, y0, x1, y1, p in ps:
                if x0 <= x <= x1 and y0 <= y <= y1 and di_dalam(x, y, p[0]) and not any(di_dalam(x, y, h) for h in p[1:]):
                    return i
        # titik rata-rata bisa jatuh di laut/lubang: kab terdekat (jarak ke kotak)
        def jarak(ps):
            return min(max(x0 - x, 0, x - x1) ** 2 + max(y0 - y, 0, y - y1) ** 2 for x0, y0, x1, y1, _ in ps)
        j = min(range(len(self.k)), key=lambda i: jarak(self.k[i][2]))
        return j if jarak(self.k[j][2]) < 0.05 ** 2 else None


# ------------------------------------------------------------------ tarik
def tarik(ver, tgl90, tgl30, ubin, gambut, konsesi, kerja=4):
    """Per ubin: kueri 90h-tinggi, 30h-semua, gambut, tiap jenis konsesi. Ubin gagal diulang 2 putaran lagi."""
    def satu(u):
        x, y = u
        kot = kotak(x * UBIN, y * UBIN, (x + 1) * UBIN, (y + 1) * UBIN)
        h = {"u": u}
        h["a90"] = baris_adm(kueri(ver, sql_adm(tgl90, " AND gfw_integrated_alerts__confidence != 'nominal'"), kot))
        h["a30"] = baris_adm(kueri(ver, sql_adm(tgl30), kot))
        h["gam"] = {}
        if h["a90"] and gambut.get(u):
            h["gam"] = baris_adm(kueri(ver, sql_adm(tgl90, " AND gfw_integrated_alerts__confidence != 'nominal'"),
                                       geom_multi(gambut[u])))
        h["kon"] = {}
        if h["a90"]:
            for j in JENIS:
                if konsesi[j].get(u):
                    h["kon"][j] = baris_adm(kueri(ver, sql_adm(tgl90, " AND gfw_integrated_alerts__confidence != 'nominal'"),
                                                  geom_multi(konsesi[j][u])))
        return h

    hasil, sisa = {}, list(ubin)
    for putaran in range(3):
        gagal = []
        with ThreadPoolExecutor(kerja) as ex:
            for n, (u, r) in enumerate(zip(sisa, ex.map(lambda u: _aman(satu, u), sisa))):
                (hasil.__setitem__(u, r) if not isinstance(r, Exception) else gagal.append(u))
                if n % 50 == 49:
                    print(f"  {n + 1}/{len(sisa)} ubin", file=sys.stderr, flush=True)
        print(f"putaran {putaran + 1}: {len(sisa) - len(gagal)}/{len(sisa)} ubin ok", file=sys.stderr, flush=True)
        sisa = gagal
        if not sisa:
            break
    if sisa:
        raise RuntimeError(f"{len(sisa)} ubin gagal setelah 3 putaran: {sisa[:5]}")
    return hasil


def _aman(f, u):
    try:
        return f(u)
    except ValueError:
        raise  # kunci rusak: bukan gangguan jaringan, jangan diulang diam-diam
    except Exception as e:
        return e


def peta_gadm(ver, kab, tgl90, kerja=6):
    """Nomor GADM (adm1, adm2) -> indeks kab kita: tiap poligon kab dikueri sendiri (GROUP BY adm1, adm2),
    nomor dengan luas terbesar di kab itu mengklaim kab tsb; satu nomor -> kab yang paling banyak luasnya."""
    sql = sql_adm(tgl90, " AND gfw_integrated_alerts__confidence != 'nominal'")

    def satu(i):
        ps = [p for *_, p in kab.k[i][2]]
        return baris_adm(kueri(ver, sql, geom_multi(ps)))

    hasil, sisa = {}, list(range(len(kab.k)))
    for putaran in range(3):
        gagal = []
        with ThreadPoolExecutor(kerja) as ex:
            for i, r in zip(sisa, ex.map(lambda i: _aman(satu, i), sisa)):
                (hasil.__setitem__(i, r) if not isinstance(r, Exception) else gagal.append(i))
        print(f"peta kab putaran {putaran + 1}: {len(sisa) - len(gagal)}/{len(sisa)} ok", file=sys.stderr, flush=True)
        sisa = gagal
        if not sisa:
            break
    if sisa:
        raise RuntimeError(f"{len(sisa)} kab gagal dipetakan")
    suara = collections.defaultdict(collections.Counter)
    for i, r in hasil.items():
        for key, ha in r.items():
            suara[key][i] += ha
    return {key: c.most_common(1)[0][0] for key, c in suara.items()}


# ------------------------------------------------------------------ rakit
def rakit(hasil, kab, peta, tgl_akhir, ver, ubin_ok):
    tot = collections.defaultdict(lambda: collections.defaultdict(float))
    for h in hasil.values():
        for nama, kunci_h in (("t90", h["a90"]), ("t30", h["a30"]), ("gam", h["gam"])):
            for key, v in kunci_h.items():
                if key in peta:
                    tot[peta[key]][nama] += v
        for j, d in h["kon"].items():
            for key, v in d.items():
                if key in peta:
                    tot[peta[key]]["k_" + j] += v
    # unit GADM tanpa kab terpetakan: luasnya tak hilang diam-diam, dilaporkan
    hilang = sum(v for h in hasil.values() for key, v in h["a90"].items() if key not in peta)

    def baris(t):
        t90 = t.get("t90", 0.0)
        g = {j: round(t.get("k_" + j, 0.0)) for j in JENIS}
        return {"ha90": round(t90), "ha30": round(t.get("t30", 0.0)),
                "gambut": round(t.get("gam", 0.0) / t90, 3) if t90 else None,
                "konsesi": {j: round(min(v, t90) / t90, 3) if t90 else None for j, v in ((j, t.get("k_" + j, 0.0)) for j in JENIS)},
                "konsesi_ada": round(min(sum(g.values()), t90) / t90, 3) if t90 else None}

    kabs, prov = [], collections.defaultdict(lambda: collections.defaultdict(float))
    for i, t in tot.items():
        p, nama, _ = kab.k[i]
        if t.get("t90", 0) < 1 and t.get("t30", 0) < 1:
            continue
        kabs.append({"prov": p, "kab": nama, **baris(t)})
        for a, v in t.items():
            prov[p][a] += v
    kabs.sort(key=lambda r: -r["ha90"])
    provs = {p: baris(t) for p, t in sorted(prov.items(), key=lambda kv: -kv[1]["t90"])}
    nas = collections.defaultdict(float)
    for t in prov.values():
        for a, v in t.items():
            nas[a] += v

    sel = []
    for (x, y), h in hasil.items():
        ha = sum(h["a90"].values())
        if ha >= 1:
            sel.append([round((y + .5) * UBIN, 2), round((x + .5) * UBIN, 2), round(ha)])
    sel.sort(key=lambda s: -s[2])
    return {
        "versi": 1,
        "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "gfw": {"dataset": DATASET, "versi": ver, "sampai": tgl_akhir},
        "jendela": {"tinggi_hari": HARI90, "semua_hari": HARI30},
        "nasional": {**baris(nas), "ha_tak_terpetakan": round(hilang), "ubin": ubin_ok, "kab": len(kabs)},
        "provinsi": provs, "kabupaten": kabs, "sel": sel[:N_SEL],
        "catatan": ("ha90 = alert keyakinan tinggi/tertinggi 90 hari; ha30 = semua keyakinan 30 hari. "
                    "gambut = pangsa ha90 di gambut PRIMS (1:250.000; Kaltim tak lengkap); konsesi = pangsa ha90 di "
                    "poligon sawit/hti/hph/tambang (data 2014-2026, jenis saja, bisa tumpang tindih sehingga konsesi_ada "
                    "tak sama dengan jumlah). sel = ubin 1 derajat (lat, lon tengah, ha90). Alert = pembukaan tajuk, "
                    "bukan api; kab dipetakan dari nomor GADM lewat suara titik-pusat."),
        "sumber": "GFW integrated alerts (UMD GLAD-L/S2, WUR RADD) lewat GFW Data API; gambut PRIMS/BBSDLP; konsesi lihat lahan.py",
    }


def utama():
    ver = versi()
    hari_ini = dt.datetime.now(dt.timezone.utc).date()
    tgl90, tgl30 = (hari_ini - dt.timedelta(days=HARI90)).isoformat(), (hari_ini - dt.timedelta(days=HARI30)).isoformat()
    prov = muat_geo("public/geo/provinsi.json")
    ubin = ubin_indonesia(prov)
    gambut = poligon_per_ubin(muat_geo("public/data/lahan/gambut.geojson")["features"])
    kons = muat_geo("public/data/lahan/konsesi.geojson")["features"]
    konsesi = {j: poligon_per_ubin([f for f in kons if f["properties"]["jenis"] == j]) for j in JENIS}
    print(f"versi {ver}, {len(ubin)} ubin", file=sys.stderr, flush=True)
    hasil = tarik(ver, tgl90, tgl30, ubin, gambut, konsesi)
    kab = Kab()
    out = rakit(hasil, kab, peta_gadm(ver, kab, tgl90), hari_ini.isoformat(), ver, len(hasil))
    if os.path.exists(KELUAR):  # blok "model" ditulis alert_tebang_model.py (lab); jangan hilang saat data diperbarui
        lama = json.load(open(KELUAR)).get("model")
        if lama:
            out["model"] = lama
    with open(KELUAR, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    n = out["nasional"]
    print(f"ha90 {n['ha90']:,}  ha30 {n['ha30']:,}  gambut {n['gambut']}  konsesi {n['konsesi_ada']}  "
          f"tak terpetakan {n['ha_tak_terpetakan']:,}  -> {KELUAR} ({os.path.getsize(KELUAR) // 1024} KB)")


def uji():
    assert kunci_int(12.0) == 12
    try:
        kunci_int(12.5)
        raise SystemExit("kunci pecahan lolos")
    except ValueError:
        pass
    try:
        baris_adm([{"gadm_administrative_boundaries__adm1": 1.5, "gadm_administrative_boundaries__adm2": 2, "area__ha": 1}])
        raise SystemExit("baris pecahan lolos")
    except ValueError:
        pass
    assert "date, " not in sql_adm("2026-01-01").split("GROUP BY")[1]  # tanggal tak ikut GROUP BY
    sq = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]
    assert di_dalam(1, 1, sq) and not di_dalam(3, 1, sq)
    assert ubin_dari(114.5, -2.5) == (114, -3)
    print("self-check alert_tebang ok")


if __name__ == "__main__":
    uji() if "--uji" in sys.argv else utama()
