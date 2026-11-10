"""Prakiraan maritim resmi BMKG per perairan dan pelabuhan -> public/banjir/data/cuaca_maritim.json

Sumber maritim.bmkg.go.id/marine2026-data (tanpa kunci): meta/area_province.json, meta/pelabuhan.json, meta/wilmetos.min.geojson (poligon perairan, FeatureCollection, ID_MAR = id perairan),
perairan/{id}.json dan pelabuhan/{kode}.json. Angin, embusan, arus dalam KNOT (tidak dikonversi di sini; layar yang mengalikan 1,852), gelombang meter, pasang meter.
Nama prakirawan, telepon, dan email di respons perairan TIDAK disalin.
Keluaran {dibuat, terbit, sumber, hari:[3 tanggal WIB], n:{perairan,pelabuhan,gagal,basi,prov_asing}, perairan:[...], pelabuhan:[...]}; tiap baris
  [kode, nama, kode_prov|null, lat|null, lon|null, hs[3] (dm), kelas[3] (teks BMKG pada jam puncak), embusan[3] (knot), arus[3] (knot), mod[3] (dm, Open-Meteo)]
  pelabuhan menambah  pasang_maks[3] (cm), pasang_min[3] (cm), jarak_pandang_min[3] (km).
Tiap larik per tanggal WIB di `hari`; null = tanggal itu tak tercakup. mod = gelombang model tertinggi dari titik cuaca_gelombang.json terdekat (<= 30 km, tercakup >= 12 jam), null bila tak ada.
Lokasi yang valid_to-nya lewat dibuang (n.basi). Kurang dari 80% lokasi berhasil = raise, berkas lama tetap.
Pakai: python3 scripts/cuaca/maritim.py   |   python3 scripts/cuaca/maritim.py uji
"""
import concurrent.futures as cf, datetime as dt, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, PROVINSI, ambil, baca, jarak_km, simpan, sekarang, titik_terdekat

B = "https://maritim.bmkg.go.id/marine2026-data/"
UTAS, JEDA, ANGGARAN, MIN_BERHASIL, MODEL_KM, MIN_JAM = 3, 0.05, 480, 0.8, 30, 12
WIB = dt.timezone(dt.timedelta(hours=7))
# nama provinsi BMKG yang beda dari wilayah.PROVINSI; None = bukan provinsi (grup 'Indonesia')
ALIAS = {"Sumatra Barat": "13", "Sumatra Selatan": "16", "Sumatra Utara": "12", "DK Jakarta": "31", "Bangka Belitung": "19", "Kep. Riau": "21", "Indonesia": None}
NAMA = {v: k for k, v in PROVINSI.items()}


def kode_prov(nama):
    """Nama provinsi BMKG -> kode BPS; KeyError bila tak dikenal (jangan menebak)."""
    if nama in ALIAS:
        return ALIAS[nama]
    return NAMA[nama]


def waktu(s):
    """'2026-11-09 12:00 UTC' -> datetime UTC."""
    return dt.datetime.strptime(s, "%Y-%m-%d %H:%M UTC").replace(tzinfo=dt.timezone.utc)


def baris_jam(r):
    return (r.get("forecast_day1") or []) + (r.get("forecast_day2-4") or [])


def per_hari(r, hari, pelabuhan):
    """Respons satu lokasi -> dict larik per tanggal WIB di `hari`."""
    out = {k: [None] * len(hari) for k in ("hs", "kelas", "gust", "arus", "pasang_maks", "pasang_min", "jp")}
    grup = {h: [] for h in hari}
    for b in baris_jam(r):
        h = (waktu(b["time"]) + dt.timedelta(hours=7)).date().isoformat()
        if h in grup:
            grup[h].append(b)
    for i, h in enumerate(hari):
        g = grup[h]
        v = [b for b in g if b.get("wave_height") is not None]
        if v:
            p = max(v, key=lambda b: b["wave_height"])
            out["hs"][i], out["kelas"][i] = int(round(p["wave_height"] * 10)), p.get("wave_cat")
        for k, f, fn, tulis in (("gust", "wind_gust", max, round), ("arus", "current_speed", max, lambda x: round(x, 1))):
            a = [b[f] for b in g if b.get(f) is not None]
            out[k][i] = tulis(fn(a)) if a else None
        if pelabuhan:
            t = [b["tides"] for b in g if b.get("tides") is not None]
            out["pasang_maks"][i], out["pasang_min"][i] = (int(round(max(t) * 100)), int(round(min(t) * 100))) if t else (None, None)
            vs = [b["visibility"] for b in g if b.get("visibility") is not None]
            out["jp"][i] = min(vs) if vs else None
    return out


def model_hari(gel, lat, lon, hari):
    """Gelombang model tertinggi (dm) per tanggal WIB dari titik cuaca_gelombang terdekat; None bila tak ada titik atau tanggal tercakup < MIN_JAM jam."""
    n = [None] * len(hari)
    if not gel or lat is None:
        return n
    t = titik_terdekat(gel["titik"], lat, lon, MODEL_KM)
    if t is None:
        return n
    d, t0 = gel["titik"][t[0]][4], dt.datetime.fromisoformat(gel["t0"].replace("Z", "+00:00"))
    for i, h in enumerate(hari):
        v = [x for k, x in enumerate(d) if x is not None and (t0 + dt.timedelta(hours=k + 7)).date().isoformat() == h]
        n[i] = max(v) if len(v) >= MIN_JAM else None
    return n


def pusat(geom):
    """Titik tengah (lat, lon) cincin luar terbesar poligon; centroid luas. ponytail: cekung bisa jatuh di luar poligon, cukup untuk titik peta."""
    bag = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    best = None
    for p in bag:
        c, a2, cx, cy = p[0], 0, 0, 0
        for (x0, y0), (x1, y1) in zip(c, c[1:] + c[:1]):
            w = x0 * y1 - x1 * y0
            a2, cx, cy = a2 + w, cx + (x0 + x1) * w, cy + (y0 + y1) * w
        if a2 and (best is None or abs(a2) > abs(best[0])):
            best = (a2, cy / (3 * a2), cx / (3 * a2))
    return (round(best[1], 3), round(best[2], 3)) if best else (None, None)


def olah(kode, nama, prov, lat, lon, r, hari, gel, pelabuhan):
    x = per_hari(r, hari, pelabuhan)
    b = [kode, nama, prov, lat, lon, x["hs"], x["kelas"], x["gust"], x["arus"], model_hari(gel, lat, lon, hari)]
    return b + [x["pasang_maks"], x["pasang_min"], x["jp"]] if pelabuhan else b


def daftar(area, pel, wil):
    """-> [(jenis, kode, nama, kode_prov, lat, lon)] dan himpunan nama provinsi asing."""
    poli = {f["properties"]["ID_MAR"]: pusat(f["geometry"]) for f in wil["features"]}
    out, asing, lihat = [], set(), set()
    for g in area["data"]:
        for a in g["areas"]:
            if a["id"] in lihat:
                continue
            lihat.add(a["id"])
            try:
                p = kode_prov(g["province"])
            except KeyError:
                p = None
                asing.add(g["province"])
            out.append(("perairan", a["id"], a["name"], p, *poli.get(a["id"], (None, None))))
    for f in pel["features"]:
        q = f["properties"]
        try:
            p = kode_prov(q["province"])
        except KeyError:
            p = None
            asing.add(q["province"])
        lon, lat = f["geometry"]["coordinates"][:2]
        out.append(("pelabuhan", q["code"], q["name"], p, round(lat, 3), round(lon, 3)))
    return out, asing


def tarik(jenis, kode, mulai):
    if time.time() - mulai > ANGGARAN:
        raise TimeoutError("anggaran waktu habis")
    time.sleep(JEDA)
    return ambil(f"{B}{jenis}/{kode}.json", coba=2, batas_waktu=30)


def susun(lokasi, ambil_satu, hari, gel, sekarang_utc):
    """lokasi -> (perairan, pelabuhan, n_gagal, n_basi, terbit_terbanyak)."""
    P, L, gagal, basi, terbit = [], [], 0, 0, {}
    with cf.ThreadPoolExecutor(UTAS) as ex:
        hasil = list(ex.map(lambda l: _satu(ambil_satu, l), lokasi))
    for (jenis, kode, nama, prov, lat, lon), r in zip(lokasi, hasil):
        if r is None:
            gagal += 1
        elif waktu(r["valid_to"]) < sekarang_utc:
            basi += 1
        else:
            terbit[r["issued"]] = terbit.get(r["issued"], 0) + 1
            (P if jenis == "perairan" else L).append(olah(kode, nama, prov, lat, lon, r, hari, gel, jenis == "pelabuhan"))
    t = max(terbit, key=terbit.get) if terbit else None
    return P, L, gagal, basi, t


def _satu(ambil_satu, l):
    try:
        return ambil_satu(l[0], l[1])
    except Exception as e:
        print(f"maritim {l[0]} {l[1]}: {str(e)[:100]}", file=sys.stderr)
        return None


def main():
    area, pel, wil = (ambil(B + "meta/" + f, coba=3, batas_waktu=60) for f in ("area_province.json", "pelabuhan.json", "wilmetos.min.geojson"))
    lokasi, asing = daftar(area, pel, wil)
    if asing:
        print(f"::warning title=cuaca maritim::provinsi BMKG tak dikenal (kode null): {sorted(asing)}", file=sys.stderr)
    now = dt.datetime.now(dt.timezone.utc)
    hari = [(now.astimezone(WIB).date() + dt.timedelta(days=i)).isoformat() for i in range(3)]
    mulai = time.time()
    P, L, gagal, basi, t = susun(lokasi, lambda j, k: tarik(j, k, mulai), hari, baca(os.path.join(KELUAR, "cuaca_gelombang.json")), now)
    if len(P) + len(L) < MIN_BERHASIL * len(lokasi):
        raise RuntimeError(f"maritim: hanya {len(P) + len(L)}/{len(lokasi)} lokasi berhasil (gagal {gagal}, basi {basi}); berkas lama dipertahankan")
    simpan(os.path.join(KELUAR, "cuaca_maritim.json"), {"dibuat": sekarang(), "terbit": waktu(t).isoformat().replace("+00:00", "Z"), "sumber": "BMKG Maritim (maritim.bmkg.go.id)", "hari": hari,
           "n": {"perairan": len(P), "pelabuhan": len(L), "gagal": gagal, "basi": basi, "prov_asing": sorted(asing)}, "perairan": P, "pelabuhan": L})
    print(f"cuaca maritim: {len(P)} perairan, {len(L)} pelabuhan, gagal {gagal}, basi {basi}, {time.time() - mulai:.0f} dtk", file=sys.stderr)


def jam(t0, n, tides=None, **k):
    return [{"time": (t0 + dt.timedelta(hours=i)).strftime("%Y-%m-%d %H:00 UTC"), "wave_cat": "Rendah", "wave_height": 0.5 + i * .1, "wind_gust": 10 + i, "current_speed": 0.55 + i * .01,
             **({"tides": tides(i), "visibility": 10 - i % 3} if tides else {}), **k} for i in range(n)]


def uji():
    # nama provinsi nyata dari area_province.json dan pelabuhan.json
    nyata = ["Aceh", "Sumatra Barat", "Sumatra Selatan", "Sumatra Utara", "DK Jakarta", "Bangka Belitung", "Kep. Bangka Belitung", "Kep. Riau", "DI Yogyakarta", "Papua Barat Daya", "Papua Pegunungan", "Nusa Tenggara Timur", "Indonesia"]
    assert [kode_prov(n) for n in nyata] == ["11", "13", "16", "12", "31", "19", "19", "21", "34", "96", "95", "53", None]
    try:
        kode_prov("Negeri Antah")
        raise SystemExit("provinsi tak dikenal harus KeyError")
    except KeyError:
        pass
    # pengelompokan WIB: 17:00 UTC sudah tanggal berikutnya di WIB
    t0 = dt.datetime(2026, 11, 10, 12, tzinfo=dt.timezone.utc)
    r = {"issued": "2026-11-10 06:00 UTC", "valid_to": "2026-11-12 00:00 UTC", "forecast_day1": jam(t0, 24), "forecast_day2-4": [], "nama_prakirawan": "RAHASIA", "email": "x@y"}
    hari = ["2026-11-10", "2026-11-11", "2026-11-12"]
    x = per_hari(r, hari, False)
    assert x["hs"] == [int(round((0.5 + 4 * .1) * 10)), int(round((0.5 + 23 * .1) * 10)), None], x["hs"]   # 12-16 UTC = 10 Nov WIB (5 jam), 17-11 UTC = 11 Nov
    assert x["gust"] == [14, 33, None] and isinstance(x["gust"][0], int), "embusan tetap knot, tidak dikonversi"
    assert x["arus"][0] == 0.6 and x["kelas"][2] is None
    # pelabuhan: pasang cm, visibilitas terendah
    rp = {**r, "forecast_day1": jam(t0, 24, tides=lambda i: -0.5 + i * .1)}
    xp = per_hari(rp, hari, True)
    assert xp["pasang_min"][0] == -50 and xp["pasang_maks"][0] == -10 and xp["jp"][0] == 8, xp
    # model: titik 20 km tercakup >=12 jam; tanggal lain tak tercakup; jauh = null
    gel = {"t0": "2026-11-10T00:00:00Z", "titik": [[1.0, 100.0, "14", "X", [5] * 24 + [None] * 48, [], 5]]}
    assert model_hari(gel, 1.1, 100.0, hari) == [5, None, None], model_hari(gel, 1.1, 100.0, hari)   # 0-23 UTC => 10 Nov WIB 17 jam, 11 Nov WIB 7 jam
    assert model_hari(gel, 5.0, 100.0, hari) == [None] * 3 and model_hari(None, 1, 1, hari) == [None] * 3
    # poligon
    assert pusat({"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]}) == (1.0, 1.0)
    # daftar + susun: 10 perairan, 1 provinsi asing, 1 pelabuhan; ambang 80%, basi, gagal
    area = {"data": [{"province": "Sumatra Barat", "areas": [{"id": f"M.{i}", "name": f"P{i}"} for i in range(8)]}, {"province": "Negeri Antah", "areas": [{"id": "M.9", "name": "Asing"}]},
                     {"province": "Indonesia", "areas": [{"id": "M.0", "name": "dobel"}, {"id": "M.10", "name": "I"}]}]}
    wil = {"features": [{"properties": {"ID_MAR": "M.1"}, "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]}}]}
    pel = {"features": [{"properties": {"code": "XA1", "name": "Pel", "province": "DK Jakarta"}, "geometry": {"type": "Point", "coordinates": [106.8, -6.1]}}]}
    lok, asing = daftar(area, pel, wil)
    assert len(lok) == 11 and asing == {"Negeri Antah"} and lok[1][4:] == (1.0, 1.0) and lok[0][4] is None and lok[-1][3] == "31" and lok[8][3] is None
    now = dt.datetime(2026, 11, 10, 20, tzinfo=dt.timezone.utc)

    def palsu(j, k):
        if k == "M.2":
            raise RuntimeError("500")
        if k == "M.3":
            return {**r, "valid_to": "2026-11-09 00:00 UTC"}
        return rp if j == "pelabuhan" else r
    P, L, gagal, basi, t = susun(lok, palsu, hari, gel, now)
    assert (len(P), len(L), gagal, basi, t) == (8, 1, 1, 1, "2026-11-10 06:00 UTC"), (len(P), len(L), gagal, basi)
    assert all("RAHASIA" not in str(b) for b in P) and len(L[0]) == 13 and len(P[0]) == 10
    # ambang 80%
    assert (len(P) + len(L)) >= MIN_BERHASIL * len(lok) and (len(P) + len(L)) < MIN_BERHASIL * 12
    print("ok maritim")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
