"""Tutupan lahan per sel 0,5 derajat untuk simulasi kekeringan -> public/kekeringan/data/tutupan.json.

Dari lapisan yang sudah ada di repo (dirasterkan ke piksel 0,05 derajat, sekitar 5,6 km; titik tengah piksel di dalam poligon):
  daratan  public/geo/provinsi.json (poligon provinsi)
  hutan    public/data/lahan/kawasan.geojson, fungsi HL/HK/THR/HP/HPT (HPK = hutan produksi yang dapat dikonversi, dihitung lahan budidaya) + konsesi HPH
  kebun    public/data/lahan/konsesi.geojson, jenis sawit dan hti
  tambang  konsesi tambang
Sisa daratan = lahan budidaya. SAWAH TIDAK ADA di lapisan terbuka mana pun di repo (lihat dampak.py), jadi luas sawah per sel BUKAN pengamatan:
  sawah = lahan budidaya x (1 - porsi gambut) x f, dengan f tunggal supaya jumlah se-Indonesia = LBS_HA (acuan nasional; sebaran
  merata di lahan budidaya). Gunakan sebagai urutan besaran dan untuk membandingkan perlakuan, bukan sebagai luas sawah sel itu.

Pakai:  python3 scripts/kekeringan/tutupan.py        (tulis berkas)
        python3 scripts/kekeringan/tutupan.py uji    (self-check)
"""
import datetime as dt
import json
import math
import os
import sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KELUAR = os.path.join(AKAR, "public/kekeringan/data/tutupan.json")
PX = 0.05                 # derajat per piksel
SEL = 0.5
# Acuan nasional lahan baku sawah ATR/BPN ~7,4 juta ha (verifikasi LBS 2019: 7,46 juta ha). Dicatat dari ingatan penulis, BELUM dicek ke dokumennya.
LBS_HA = 7_400_000
HUTAN_KAWASAN = {"HL", "HK", "THR", "HP", "HPT"}
KODE = {"hutan": 1, "sawit": 2, "hti": 3, "tambang": 4}


def pixel_ha(lat):
    """Luas satu piksel (ha): (0,05 derajat x 111,32 km)^2 x cos(lat)."""
    return (PX * 111.32) ** 2 * 100 * math.cos(math.radians(lat))


def cincin(geom):
    """Semua cincin (luar dan lubang) dari Polygon/MultiPolygon; isi dengan aturan genap-ganjil."""
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return list(c)
    if t == "MultiPolygon":
        return [r for p in c for r in p]
    return []


def isi(rings, boleh, tulis):
    """Garis sapu: untuk tiap baris piksel, titik potong tepi, lalu isi piksel yang titik tengahnya di dalam. tulis(ix, iy)."""
    ys = [q[1] for r in rings for q in r]
    if not ys:
        return
    for iy in range(math.floor(min(ys) / PX), math.floor(max(ys) / PX) + 1):
        y = (iy + .5) * PX
        xs = []
        for r in rings:
            for (x0, y0), (x1, y1) in zip(r, r[1:]):
                if (y0 <= y < y1) or (y1 <= y < y0):
                    xs.append(x0 + (y - y0) / (y1 - y0) * (x1 - x0))
        xs.sort()
        for a, b in zip(xs[0::2], xs[1::2]):
            for ix in range(math.ceil(a / PX - .5), math.ceil(b / PX - .5)):
                if boleh(ix, iy):
                    tulis(ix, iy)


def hitung(sel, daratan_geo, kawasan, konsesi, gb):
    """sel = [(lat, lon)] pusat sel; gb = persen gambut tiap sel. Kembalikan dict kolom (ha) dan f."""
    ada = {(math.floor(la / SEL), math.floor(lo / SEL)): i for i, (la, lo) in enumerate(sel)}
    idx = lambda ix, iy: ada.get((math.floor(iy * PX / SEL + 1e-9), math.floor(ix * PX / SEL + 1e-9)))
    boleh = lambda ix, iy: idx(ix, iy) is not None
    darat, kelas = set(), {}
    for f in daratan_geo:
        isi(cincin(f["geometry"]), boleh, lambda ix, iy: darat.add((ix, iy)))
    dar = lambda ix, iy: (ix, iy) in darat
    for f in kawasan:
        if f["properties"].get("fungsi") in HUTAN_KAWASAN:
            isi(cincin(f["geometry"]), dar, lambda ix, iy: kelas.__setitem__((ix, iy), KODE["hutan"]))
    for f in konsesi:
        j = f["properties"].get("jenis"); k = {"hph": "hutan"}.get(j, j)
        if k in KODE:
            isi(cincin(f["geometry"]), dar, lambda ix, iy, k=k: kelas.__setitem__((ix, iy), KODE[k]))
    n = len(sel)
    kol = {k: [0.0] * n for k in ("darat", "hutan", "sawit", "hti", "tambang")}
    nama = {v: k for k, v in KODE.items()}
    for ix, iy in darat:
        i = idx(ix, iy); ha = pixel_ha((iy + .5) * PX)
        kol["darat"][i] += ha
        c = nama.get(kelas.get((ix, iy)))
        if c:
            kol[c][i] += ha
    budi = [max(0.0, kol["darat"][i] - kol["hutan"][i] - kol["sawit"][i] - kol["hti"][i] - kol["tambang"][i]) * (1 - gb[i] / 100) for i in range(n)]
    tot = sum(budi)
    f = LBS_HA / tot if tot else 0.0
    kol["sawah"] = [b * f for b in budi]
    return kol, f


def main():
    baca = lambda p: json.load(open(os.path.join(AKAR, p)))
    ner = baca("public/data/kekeringan_neraca.json")["sel_data"]
    sel = list(zip(ner["lat"], ner["lon"]))
    kol, f = hitung(sel, baca("public/geo/provinsi.json")["features"], baca("public/data/lahan/kawasan.geojson")["features"],
                    baca("public/data/lahan/konsesi.geojson")["features"], ner["gb"])
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M+07:00"), "label": "Deteksi Pantau Bencana", "piksel_derajat": PX,
           "lbs_ha": LBS_HA, "f_sawah": round(f, 4),
           "sumber": {"darat": "public/geo/provinsi.json", "hutan": "kawasan hutan KLHK (HL, HK, THR, HP, HPT) dan konsesi HPH, public/data/lahan", "kebun": "konsesi sawit dan HTI, public/data/lahan/konsesi.geojson",
                      "sawah": f"BUKAN pengamatan. Lahan budidaya (daratan dikurangi hutan, konsesi, gambut) dikali f={f:.3f} supaya jumlah nasional = {LBS_HA:,} ha (acuan lahan baku sawah ATR/BPN, belum diverifikasi); sebaran merata."},
           "lat": ner["lat"], "lon": ner["lon"], **{k: [round(v) for v in a] for k, a in kol.items()}}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"tutupan: {os.path.getsize(KELUAR) / 1000:.0f} KB; f={f:.3f}; sawah {sum(out['sawah']):,} ha; kebun {sum(out['sawit']) + sum(out['hti']):,} ha; hutan {sum(out['hutan']):,} ha")


def uji():
    kotak = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
    geo = lambda *r: {"type": "Polygon", "coordinates": list(r)}
    # sel 0,5 derajat berpusat (0,25; 0,25): darat penuh; hutan = setengah barat; sawit = pojok 0,1 x 0,1 (di atas hutan); lubang darat tak dihitung
    dar = [{"geometry": geo(kotak(0, 0, .5, .5), kotak(.4, .4, .5, .5))}]       # lubang 0,1 x 0,1 (laut)
    kaw = [{"properties": {"fungsi": "HL"}, "geometry": geo(kotak(0, 0, .25, .5))}, {"properties": {"fungsi": "HPK"}, "geometry": geo(kotak(.25, 0, .5, .5))}]
    kon = [{"properties": {"jenis": "sawit"}, "geometry": geo(kotak(0, 0, .1, .1))}]
    kol, f = hitung([(.25, .25)], dar, kaw, kon, [0])
    pix = pixel_ha(.25)
    cocok = lambda v, px: abs(v - px * pix) < .03 * px * pix
    assert cocok(kol["darat"][0], 96) and cocok(kol["sawit"][0], 4) and cocok(kol["hutan"][0], 46), kol   # 100 piksel - lubang 4; HL 50 - sawit 4; HPK bukan hutan
    assert abs(kol["sawah"][0] - LBS_HA) < 1, kol["sawah"]                                              # satu sel: seluruh acuan nasional jatuh ke sel itu
    kol2, _ = hitung([(.25, .25)], dar, kaw, kon, [100])
    assert kol2["sawah"][0] == 0                                                                       # seluruhnya gambut: tak ada sawah
    print("tutupan uji: ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        main()
