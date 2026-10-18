"""Status cuaca ekstrem per kecamatan, 3 hari -> public/banjir/data/cuaca_kec.json (<= 400 KB)

Tanpa unduhan baru. Tiap kecamatan (pusat_kec.json) memakai sel hujan 0,25 derajat terdekat (hujan.json: mm/hari, embusan km/jam), titik ansambel
terdekat <= 80 km (hujan_ansambel.json: peluang >= 50 dan >= 100 mm, %), dan titik gelombang terdekat <= 50 km (cuaca_gelombang.json: hs maks per
hari WIB, dm). Tingkat t = terbesar dari semua saluran (dasar.tingkat_kec); label resmi BMKG tidak dipetakan ke t.
Catatan: rentang gelombang mulai 00 UTC = 07 WIB, jadi Hs hari ke-0 hanya mencakup 07.00-23.59 WIB (dini hari hari ini tidak ada).
Ansambel: ambang peluang hipotesis (dasar.AMBANG_ANSAMBEL); tak ada p150, Awas dari p100; titik <= 80 km.
Hanya kecamatan dengan t >= 1 yang ditulis; bila melewati batas ukuran, yang t terendah dibuang dan jumlahnya dicatat di "terpotong".
{dibuat, hari[3], ambang, kunci, kolom, kec: [[i,[t],[p50],[p100],[mm],[g],[hs]|null]], prov: {kode: {t:[maks], n:[[w,s,a]]}}, sumber}
Pakai: python3 scripts/cuaca/prakiraan_kec.py   |   python3 scripts/cuaca/prakiraan_kec.py uji
"""
import datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import (ANGIN, HS, HUJAN, KELUAR, MASUKAN, AMBANG_ANSAMBEL, JARAK_ANSAMBEL_KM, P_AWAS, P_SIAGA, P_WASPADA, WIB, Kisi, baca, hari_wib, indeks_hari_wib, jarak_km, sekarang, simpan,
                   tingkat_kec, titik_terdekat)

BATAS = 400 * 1024
KOLOM = ["i", "t", "p50", "p100", "mm", "g", "hs"]


def hs_harian(gel, hari):
    """cuaca_gelombang.json -> [(lat, lon, [hs dm maks per hari | None])]"""
    if not gel:
        return []
    t0 = dt.datetime.fromisoformat(gel["t0"].replace("Z", "+00:00"))
    tgl = indeks_hari_wib(t0, gel["n"])
    out = []
    for r in gel["titik"]:
        per = []
        for d in hari:
            v = [x for x, t in zip(r[4], tgl) if t == d and x is not None]
            per.append(max(v) if v else None)
        if None not in per:   # kontrak: hs = 3 bilangan bulat atau null
            out.append((r[0], r[1], per))
    return out


def olah(hujan, ans, gel, pusat, hari):
    """-> (baris kec, prov). pusat = {kunci: [lat, lon]} berurutan; baris diurut menurun menurut (maks t, jumlah t)."""
    hh = hujan["hari"]
    idx = [hh.index(d) if d in hh else None for d in hari]
    kisi = Kisi([(g["lat"], g["lon"], g["prov"], g["h"], g["g"]) for g in hujan["grid"]])
    ea = {d: i for i, d in enumerate(ans["hari"])} if ans else {}
    et = [(g["lat"], g["lon"], g["p50"], g["p100"]) for g in ans["grid"]] if ans else []
    gt = hs_harian(gel, hari)
    baris, prov = [], {}
    for i, (k, (la, lo)) in enumerate(pusat.items()):
        c = kisi.dekat(la, lo)
        if not c:
            continue
        mm = [None if j is None else c[3][j] for j in idx]
        g = [None if j is None else c[4][j] for j in idx]
        e = titik_terdekat(et, la, lo, JARAK_ANSAMBEL_KM)
        p50 = [None] * 3
        p100 = [None] * 3
        if e:
            for n, d in enumerate(hari):
                if d in ea:
                    p50[n] = int(round(et[e[0]][2][ea[d]] * 100))
                    p100[n] = int(round(et[e[0]][3][ea[d]] * 100))
        w = titik_terdekat(gt, la, lo, 50)
        hs = gt[w[0]][2] if w else None
        t = [tingkat_kec(mm[n], g[n], None if not hs or hs[n] is None else hs[n] / 10, p50[n], p100[n]) for n in range(3)]
        pk = prov.setdefault(k.split("|")[0], {"t": [0, 0, 0], "n": [[0, 0, 0] for _ in range(3)]})
        for n in range(3):
            pk["t"][n] = max(pk["t"][n], t[n])
            if t[n]:
                pk["n"][n][t[n] - 1] += 1
        if max(t):
            baris.append([i, t, p50, p100, [None if x is None else int(round(x)) for x in mm], [None if x is None else int(round(x)) for x in g],
                          hs])
    baris.sort(key=lambda r: (-max(r[1]), -sum(r[1]), r[0]))
    return baris, prov


def potong(baris, bangun, batas=BATAS):
    """Buang baris terbawah (t terendah) sampai berkas <= batas. -> (baris, jumlah dibuang)."""
    n = len(baris)
    while n and len(json.dumps(bangun(baris[:n]), ensure_ascii=False, separators=(",", ":")).encode()) > batas:
        n = int(n * min(.95, batas / len(json.dumps(bangun(baris[:n]), separators=(",", ":")).encode())))
    return baris[:n], len(baris) - n


def main():
    hujan = baca(os.path.join(MASUKAN, "hujan.json"))
    if not hujan:
        raise RuntimeError("hujan.json tidak ada")
    h0 = hujan["hari_ini"]
    if h0 < (dt.datetime.now(WIB).date() - dt.timedelta(days=1)).isoformat():
        raise RuntimeError(f"hujan.json basi (hari_ini {h0}): cuaca_kec lama dibiarkan")
    ans = baca(os.path.join(MASUKAN, "hujan_ansambel.json"))
    if ans and ans["hari"][0] < h0:
        ans = None
    hari = hari_wib(3, dt.date.fromisoformat(h0))
    pusat = baca(os.path.join(KELUAR, "pusat_kec.json"))
    baris, prov = olah(hujan, ans, baca(os.path.join(KELUAR, "cuaca_gelombang.json")), pusat, hari)
    pk = (baca(os.path.join(MASUKAN, "meta.json")) or {}).get("dibuat")
    sumber = {"hujan": "Open-Meteo, kisi 0,25 derajat", "ansambel": ans.get("model") if ans else None, "embusan": "deterministik (maks harian embusan 10 m, Open-Meteo, sel 0,25 derajat); tanpa ansambel embusan karena kuota Open-Meteo dibagi dengan banjir", "gelombang": "Open-Meteo Marine", "aturan": "t = maks(hujan mm 50/100/150; embusan km/jam 54/72/90; Hs m 2,5/4/6; ansambel: p50 >= p_waspada -> 1, p100 >= p_siaga -> 2, p100 >= p_awas -> 3)", "ansambel_jarak": f"titik ansambel terdekat <= {JARAK_ANSAMBEL_KM} km (satu titik per kotak 1 derajat); ansambel tak punya p150, Awas dari p100", "hs_hari0": "Hs hari ke-0 hanya jam 07.00-23.59 WIB (rentang gelombang mulai 00 UTC = 07 WIB)", "status": "ambang hipotesis docs/multi-bencana/bencana/cuaca.md par. 4 dan peluang belum dikunci uji balik", "diterbitkan_model": pk}

    def bangun(b, terpotong=0):
        return {"dibuat": sekarang(), "hari": hari, "ambang": {"hujan_mm": list(HUJAN), "angin_kmj": list(ANGIN), "hs_m": list(HS), "p_waspada": P_WASPADA, "p_siaga": P_SIAGA, "p_awas": P_AWAS, "ansambel_hipotesis": AMBANG_ANSAMBEL},
                "kunci": "pusat_kec", "kolom": KOLOM, "kec": b, "prov": prov, "terpotong": terpotong, "sumber": sumber}
    b, dibuang = potong(baris, bangun)
    simpan(os.path.join(KELUAR, "cuaca_kec.json"), bangun(b, dibuang))
    nt = [sum(1 for r in baris if r[1][n] >= 2) for n in range(3)]
    print(f"cuaca kec: {len(baris)} kecamatan t>=1 dari {len(pusat)}; dibuang {dibuang}; t>=2 per hari {nt}", file=sys.stderr)


def uji():
    D = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]
    hujan = {"hari": D, "grid": [{"lat": 1.125, "lon": 2.125, "prov": "11", "h": [0, 120, 0, 0], "g": [10, 20, 60, 5]},
                                 {"lat": 1.125, "lon": 2.375, "prov": "11", "h": [0, 0, 0, 0], "g": [10, 20, 30, 5]}]}
    ans = {"hari": D[1:3], "grid": [{"lat": 1.0, "lon": 2.0, "p50": [.5, 0], "p100": [.8, 0]}]}
    gel = {"t0": "2026-01-01T00:00Z", "n": 72, "titik": [[1.2, 2.2, "11", None, [30] * 72, [], 30]]}   # 3 m sepanjang jalan
    pusat = {"11|K|Satu": [1.2, 2.2], "11|K|Dua": [1.2, 2.4], "99|Z|Jauh": [-9, 120]}
    b, pv = olah(hujan, ans, gel, pusat, D[1:])
    assert [r[0] for r in b] == [0, 1] and set(pv) == {"11"}, b                  # kecamatan tanpa sel dibuang, tak masuk prov
    assert b[0] == [0, [3, 1, 1], [50, 0, None], [80, 0, None], [120, 0, 0], [20, 60, 5], [30, 30, 30]], b[0]   # p100 80% -> Awas; sisanya embusan 60 / gelombang 3 m = Waspada
    assert pv["11"]["t"] == [3, 1, 1] and pv["11"]["n"][0] == [0, 0, 2] and pv["11"]["n"][1] == [2, 0, 0]
    b2, _ = olah(hujan, None, None, pusat, D[1:])                                # tanpa ansambel dan gelombang: hanya mm dan embusan
    assert b2[0][1] == [2, 1, 0] and b2[0][6] is None and b2[0][2] == [None] * 3 and [r[0] for r in b2] == [0], b2
    ramai = [[i, [1, 0, 0], [None] * 3, [None] * 3, [1, 1, 1], [1, 1, 1], None] for i in range(500)]
    kecil, dibuang = potong(ramai, lambda x: {"kec": x}, 5000)
    assert 0 < len(kecil) < 500 and dibuang == 500 - len(kecil) and len(json.dumps({"kec": kecil}, separators=(",", ":"))) <= 5000
    assert potong(ramai, lambda x: {"kec": x})[1] == 0
    print("ok kec")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
