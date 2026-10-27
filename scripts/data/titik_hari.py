"""Arsip titik panas per hari WIB untuk pemilih tanggal peta (pemilik, 27 Okt 2026: "tanggal dengan jumlah titik api banyak, full 2026").

Keluaran:
  public/data/titik_hari/indeks.json      jumlah lokasi unik per hari 1 Jan s.d. sd (semua hari) + daftar hari berarsip (>= AMBANG)
  public/data/titik_hari/<YYYY-MM-DD>.json titik hari itu, baris berformat SAMA dengan hotspot.json (harian.py titik_json) kecuali
                                           kolom jam = jam sejak 00.00 WIB hari itu (peramban mengubahnya ke jam relatif acuan)
Definisi titik = titik_tahun.py: MODIS + VIIRS S-NPP + NOAA-20 + NOAA-21, keyakinan sedang/tinggi, tanpa sumber panas tetap,
hari kalender WIB, dalam poligon provinsi. Kolom hitung menandai lokasi unik ~375 m (titik_unik.py), jadi jumlah di indeks
= jumlah baris hitung=1 = angka peta untuk hari itu.

Pakai (CSV dari firms.py, satu per sensor; urutan sensor harus M, N, N20, N21):
  SENSOR=MODIS python3 scripts/data/firms.py 2025-12-31 <sd> > modis.csv   (juga VIIRS_SNPP, VIIRS_NOAA20, VIIRS_NOAA21)
  python3 scripts/data/titik_hari.py <tahun> <sd> modis.csv snpp.csv noaa20.csv noaa21.csv
  python3 scripts/data/titik_hari.py dari-hotspot   (data.yml tiap hari: hari utuh di hotspot.json, selain hari ini, ikut diarsip)
  python3 scripts/data/titik_hari.py uji
"""
import csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from firms_sumber import kelas_yakin
import titik_palsu
from wilayah import AKAR, Wilayah
import titik_unik as TU

WIB = dt.timedelta(hours=7)
AMBANG = 1000   # hari berarsip: >= 1.000 lokasi unik nasional (pemilik: hanya hari dengan titik banyak)
KELUAR = os.path.join(AKAR, "public/data/titik_hari")
KOLOM = ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib", "hitung"]


def baca(berkas_sensor, tahun, sd, cari, industri):
    """-> {hari ISO: [titik]}; titik = dict lat, lon, jam (sejak 00.00 WIB), s, frp, c, adm"""
    hari = {}
    for s, b in zip(TU.SENSOR, berkas_sensor):
        for r in csv.DictReader(open(b)):
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB
            d = t.date().isoformat()
            if str(t.year) != tahun or d > sd:
                continue
            c = r["confidence"].strip(); k = kelas_yakin(c, c.isdigit())
            if k < 1 or (industri and titik_palsu.palsu(r["latitude"], r["longitude"], industri)):
                continue
            lat, lon = round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)
            adm = cari(lon, lat)
            if not adm:
                continue
            hari.setdefault(d, []).append({"lat": lat, "lon": lon, "jam": round(t.hour + t.minute / 60, 2), "s": s,
                                           "frp": round(float(r.get("frp") or 0), 1), "c": k, "adm": "|".join(adm)})
    return hari


def tandai_unik(titik):
    """hitung=1 untuk titik pertama tiap sel ~375 m (urut jam, lalu urutan sensor M, N, N20, N21)"""
    lihat = set()
    for p in sorted(titik, key=lambda p: (p["jam"], TU.SENSOR.index(p["s"]))):
        k = TU.sel(p["lat"], p["lon"])
        p["hitung"] = int(k not in lihat); lihat.add(k)
    return sum(p["hitung"] for p in titik)


def berkas_hari(d, titik):
    tabel = sorted({p["adm"] for p in titik}); idx = {k: i for i, k in enumerate(tabel)}
    return {"kolom": KOLOM, "hari": d, "jam_dari": "00.00 WIB hari itu", "wilayah": tabel, "sensor_utama": list(TU.SENSOR),
            "keyakinan_min": TU.KEYAKINAN_MIN, "satuan": "lokasi unik ~375 m per hari WIB (titik_unik.py)",
            "baris": [[p["lat"], p["lon"], p["jam"], p["s"], p["frp"], p["c"], idx[p["adm"]], d[5:], p["hitung"]]
                      for p in sorted(titik, key=lambda p: p["jam"])]}


def main(tahun, sd, *berkas):
    w = Wilayah(); industri = titik_palsu.sel_industri()[0]
    hari = baca(berkas, tahun, sd, lambda lon, lat: w.cari(lon, lat), industri)
    os.makedirs(KELUAR, exist_ok=True)
    jumlah, arsip = {}, []
    for d in sorted(hari):
        jumlah[d] = tandai_unik(hari[d])
        if jumlah[d] >= AMBANG:
            arsip.append(d)
            with open(os.path.join(KELUAR, d + ".json"), "w") as f:
                json.dump(berkas_hari(d, hari[d]), f, ensure_ascii=False, separators=(",", ":"))
    for f in os.listdir(KELUAR):   # hari yang turun di bawah ambang (koreksi SP) tidak meninggalkan berkas yatim
        if f[:4] == tahun and f.endswith(".json") and f[:-5] not in arsip:
            os.remove(os.path.join(KELUAR, f))
    with open(os.path.join(KELUAR, "indeks.json"), "w") as f:
        json.dump({"sumber": "NASA FIRMS MODIS C6.1, VIIRS S-NPP, NOAA-20, NOAA-21 (SP + NRT), lokasi unik ~375 m per hari WIB, keyakinan sedang/tinggi, tanpa sumber panas tetap",
                   "tahun": tahun, "sd": sd, "ambang": AMBANG, "dibuat": dt.date.today().isoformat(),
                   "jumlah": jumlah, "arsip": arsip}, f, separators=(",", ":"))
    print(len(arsip), "hari berarsip dari", len(jumlah), file=sys.stderr)


def dari_hotspot():
    """hari utuh di public/data/hotspot.json (7 hari) -> berkas hari >= AMBANG yang belum ada + jumlah di indeks; hari ini dilewati (belum utuh)"""
    hs = json.load(open(os.path.join(AKAR, "public/data/hotspot.json")))
    meta = json.load(open(os.path.join(AKAR, "public/data/meta.json")))
    c = {k: i for i, k in enumerate(hs["kolom"])}
    acuan = dt.datetime.fromisoformat(hs["acuan"].replace("Z", "+00:00")) + WIB
    tahun, hari_ini = meta["hari_wib"][:4], meta["hari_wib"]
    per = {}
    for b in hs["baris"]:
        d = f"{tahun}-{b[c['tgl_wib']]}"
        if d >= hari_ini or d[:4] != tahun:
            continue
        t = acuan + dt.timedelta(hours=b[c["jam"]])
        per.setdefault(d, []).append({"lat": b[c["lat"]], "lon": b[c["lon"]], "jam": round(t.hour + t.minute / 60, 2), "s": b[c["sensor"]],
                                      "frp": b[c["frp"]], "c": b[c["keyakinan"]], "adm": hs["wilayah"][b[c["wilayah"]]], "hitung": b[c["hitung"]]})
    os.makedirs(KELUAR, exist_ok=True)
    fi = os.path.join(KELUAR, "indeks.json")
    ix = json.load(open(fi)) if os.path.exists(fi) else {"tahun": tahun, "ambang": AMBANG, "jumlah": {}, "arsip": []}
    if ix.get("tahun") != tahun:
        ix = {"tahun": tahun, "ambang": AMBANG, "jumlah": {}, "arsip": []}
    baru = 0
    for d, titik in sorted(per.items()):
        n = sum(p["hitung"] for p in titik)
        ix["jumlah"][d] = n
        f = os.path.join(KELUAR, d + ".json")
        if n >= AMBANG and not os.path.exists(f):   # berkas dari CSV arsip SP (main) tidak ditimpa NRT
            with open(f, "w") as o:
                json.dump(berkas_hari(d, titik), o, ensure_ascii=False, separators=(",", ":"))
            baru += 1
        if n >= AMBANG and d not in ix["arsip"]:
            ix["arsip"].append(d)
    ix["arsip"].sort(); ix["sd"] = max(ix["jumlah"]) if ix["jumlah"] else ix.get("sd"); ix["dibuat"] = dt.date.today().isoformat()
    ix["jumlah"] = dict(sorted(ix["jumlah"].items()))
    with open(fi, "w") as o:
        json.dump(ix, o, separators=(",", ":"))
    print(f"titik_hari: {baru} hari baru diarsip, {len(per)} hari di hotspot.json", file=sys.stderr)


def uji():
    t = [{"lat": -2.0, "lon": 113.0, "jam": 13.5, "s": "N20", "frp": 2, "c": 1, "adm": "62|A|B"},
         {"lat": -2.0, "lon": 113.0, "jam": 1.5, "s": "N", "frp": 3, "c": 2, "adm": "62|A|B"},
         {"lat": -2.5, "lon": 113.0, "jam": 13.5, "s": "M", "frp": 9, "c": 1, "adm": "62|A|C"}]
    assert tandai_unik(t) == 2, "dua sel berbeda"
    assert [p["hitung"] for p in t] == [0, 1, 1], "yang lebih dulu di sel sama yang dihitung"
    b = berkas_hari("2026-08-05", t)
    assert b["kolom"] == KOLOM and b["wilayah"] == ["62|A|B", "62|A|C"]
    assert b["baris"][0] == [-2.0, 113.0, 1.5, "N", 3, 2, 0, "08-05", 1], b["baris"][0]
    assert all(r[7] == "08-05" for r in b["baris"])
    print("titik_hari: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else dari_hotspot() if sys.argv[1:] == ["dari-hotspot"] else main(*sys.argv[1:])
