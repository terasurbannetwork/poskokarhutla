"""Titik panas semua satelit (MODIS + VIIRS S-NPP + NOAA-20 + NOAA-21) per bulan per provinsi sejak 1 Januari -> public/data/titik_tahun.json

Definisinya sama dengan baris harian laporan (laporan.py, titik_unik.py: LOKASI UNIK ~375 m per hari dari M, N, N20, N21, semua keyakinan (titik_unik.KEYAKINAN_MIN, sejak 28 Okt 2026),
tanpa sumber panas tetap, hari kalender WIB).
laporan.py memakai 'harian' hanya untuk hari sebelum arsip hariannya; hari di arsip diambil dari baris harian, jadi
Grand total = (titik sebelum arsip) + jumlah baris harian. Arsip SP vs NRT beda ~0,1% (1-16 Okt 2026: 293.584 vs 293.263).

Pakai (CSV dari firms.py, satu per sensor):
  SENSOR=MODIS python3 scripts/data/firms.py 2025-12-31 <kemarin> > modis.csv   (begitu juga VIIRS_SNPP, VIIRS_NOAA20, VIIRS_NOAA21)
  python3 scripts/data/titik_tahun.py <tahun> <sd> modis.csv snpp.csv noaa20.csv noaa21.csv

PKH-28..29 (petak per tahun, S-NPP saja) -> public/data/petak_tahun.json:
  python3 scripts/data/titik_tahun.py petak <snpp_tahun_berjalan.csv> [sd_maks YYYY-MM-DD] [keluar.json]   (CSV dari firms.py SENSOR=VIIRS_SNPP, 1 Jan s.d. kemarin)
  python3 scripts/data/titik_tahun.py uji
Petak = sel unik 0,0034 derajat (~375 m) dengan deteksi S-NPP, keyakinan n/h, api vegetasi; BUKAN luas terbakar. 2012-2025 dibaca dari
data/raw riwayat_petak.bin (riwayat_petak.py: arsip standar FIRMS, type 0); tahun berjalan dari CSV (SP type 0; NRT tanpa type disaring
sel sumber statis titik_palsu.sel_industri). Provinsi dari centroid sel (wilayah.Wilayah); sel di luar poligon dihitung di "tak_terpetakan".
Rujukan pembanding (MIT, Pantau Karhutla 2026): pipeline/src/haze/fire_history.py, pipeline/src/haze/area.py.
"""
import csv, datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from firms_sumber import kelas_yakin
import titik_palsu
from wilayah import AKAR, Wilayah
import titik_unik as TU

WIB = dt.timedelta(hours=7)


def main(tahun, sd, *berkas):
    w, prov, hari, lihat = Wilayah(), {}, {}, set()
    industri = titik_palsu.sel_industri()[0]
    for b in berkas:
        for r in csv.DictReader(open(b)):
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB
            if str(t.year) != tahun or t.date().isoformat() > sd:
                continue
            c = r["confidence"].strip()
            if kelas_yakin(c, c.isdigit()) < TU.KEYAKINAN_MIN:
                continue   # di bawah ambang titik_unik.py (sejak 28 Okt 2026 = 0: semua keyakinan dihitung)
            if industri and titik_palsu.palsu(r["latitude"], r["longitude"], industri):
                continue   # sumber panas tetap tidak dihitung
            k = (t.date(), TU.sel(float(r["latitude"]), float(r["longitude"])))
            if k in lihat:
                continue   # lokasi yang sama hari itu sudah dihitung (satelit atau lintasan lain)
            lihat.add(k)
            adm = w.cari(float(r["longitude"]), float(r["latitude"]))
            if adm:
                prov.setdefault(adm[0], [0] * 12)[t.month - 1] += 1
                d = t.date().isoformat()
                hari[d] = hari.get(d, 0) + 1
    out = {"sumber": "NASA FIRMS MODIS C6.1, VIIRS S-NPP, NOAA-20, NOAA-21; arsip standar (SP) + NRT, lokasi unik ~375 m per hari, semua keyakinan, tanpa sumber panas tetap, hari WIB",
           "tahun": tahun, "sd": sd, "dibuat": dt.date.today().isoformat(), "prov": prov,
           # nasional per hari WIB 1 Jan s.d. sd: laporan.py memakai hari sebelum arsip hariannya, sisanya dari baris harian
           "harian": [hari.get((dt.date(int(tahun), 1, 1) + dt.timedelta(days=i)).isoformat(), 0)
                      for i in range((dt.date.fromisoformat(sd) - dt.date(int(tahun), 1, 1)).days + 1)]}
    with open(os.path.join(AKAR, "public/data/titik_tahun.json"), "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(sum(map(sum, prov.values())), "titik", file=sys.stderr)


# ---------------------------------------------------------------- PKH-29: petak 375 m unik per tahun per wilayah
GUGUS = {"Sumatera": ("11", "12", "13", "14", "15", "16", "17", "18", "19"),   # Bangka Belitung ikut; Kepulauan Riau (21) tidak
         "Kalimantan": ("61", "62", "63", "64", "65"), "Papua": ("91", "92", "93", "94", "95", "96")}
TH0, TH1 = 2012, 2025


def petak_tahun(csv_berjalan, tahun=None, keluar=None, riwayat=True, sd_maks=None):
    import riwayat_petak as RP
    from wilayah import PROVINSI
    w, nas, prov = Wilayah(), {}, {}
    def tambah(y, kode):
        if kode:
            nas[y] = nas.get(y, 0) + 1   # nasional = jumlah provinsi; sel di luar poligon (laut, negara tetangga di kotak FIRMS) -> tak_terpetakan
        prov.setdefault(kode or "", {}).setdefault(y, 0)
        prov[kode or ""][y] += 1
    P = RP.Petak() if riwayat else None
    for k, m in zip(P.k, P.v) if P else ():
        ix, iy = k // 10000 - 1000, k % 10000 - 4000
        a = w.cari((ix + .5) * RP.DERAJAT, (iy + .5) * RP.DERAJAT)
        for b in range(TH1 - TH0 + 1):
            if m >> b & 1:
                tambah(TH0 + b, a[0] if a else None)
    # tahun berjalan
    industri = titik_palsu.sel_industri()[0]
    sel_b, sd, maks = {}, "", ""
    for r in csv.DictReader(open(csv_berjalan)):
        if not r.get("confidence") or r["confidence"].strip().lower() not in ("n", "h"):
            continue
        t = r.get("type")
        if t and t != "0":
            continue
        if not t and industri and titik_palsu.palsu(r["latitude"], r["longitude"], industri):
            continue   # NRT tanpa kolom type: saring sumber panas tetap
        if sd_maks and r["acq_date"] > sd_maks:
            continue
        sel_b[RP.kunci(float(r["latitude"]), float(r["longitude"]))] = 1
        maks = max(maks, r["acq_date"])
    y = int(tahun or maks[:4])
    for k in sel_b:
        ix, iy = k // 10000 - 1000, k % 10000 - 4000
        a = w.cari((ix + .5) * RP.DERAJAT, (iy + .5) * RP.DERAJAT)
        tambah(y, a[0] if a else None)
    tahunl = list(range(TH0, y + 1))
    tak = prov.pop("", {})
    def seri(kodes):
        return {str(t): sum(prov.get(c, {}).get(t, 0) for c in kodes) for t in tahunl}
    total = {str(t): nas.get(t, 0) for t in tahunl}
    def bagian(ser):
        return {t: (round(100 * ser[t] / total[t], 2) if total[t] else None) for t in ser}
    out = {"sumber": "NASA FIRMS VIIRS S-NPP (satu satelit sepanjang seri): arsip standar 2012-2025 (type 0) + tahun berjalan dari CSV firms.py; keyakinan n/h; sel unik ~375 m",
           "definisi": "Petak = sel 0,0034 derajat yang punya deteksi api vegetasi dalam tahun itu. Bukan luas terbakar: satu petak = piksel 375 m (~14 ha) sekali pun api di dalamnya lebih kecil atau lebih besar.",
           "tahun": tahunl, "tahun_berjalan": y, "sd": maks, "dibuat": dt.date.today().isoformat(),
           "nasional": total, "tak_terpetakan": {str(t): tak.get(t, 0) for t in tahunl},
           "prov": {c: {"nama": PROVINSI[c], "tahun": seri([c]), "bagian_persen": bagian(seri([c]))} for c in sorted(PROVINSI)},
           "gugus": {g: {"prov": list(ks), "tahun": seri(ks), "bagian_persen": bagian(seri(ks))} for g, ks in GUGUS.items()}}
    # titik panas per bulan tahun berjalan, semua satelit: dari titik_tahun.json (hitungan lokasi unik harian laporan)
    try:
        tt = json.load(open(os.path.join(AKAR, "public/data/titik_tahun.json")))
        if tt.get("tahun") == str(y):
            out["bulanan_semua_satelit"] = {"tahun": y, "sd": tt["sd"], "nasional": [sum(v[i] for v in tt["prov"].values()) if i < int(tt["sd"][5:7]) else None for i in range(12)],   # bulan sesudah sd = null, bukan 0
                                            "sumber": "titik_tahun.json: MODIS + S-NPP + NOAA-20 + NOAA-21, lokasi unik ~375 m per hari, semua keyakinan"}
    except (OSError, ValueError):
        out["bulanan_semua_satelit"] = None   # gagal baca = null, bukan 0
    with open(keluar or os.path.join(AKAR, "public/data/petak_tahun.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    pap = out["gugus"]["Papua"]["tahun"]
    print("petak_tahun:", {t: total[t] for t in ("2015", str(y))}, "Papua 2015", pap.get("2015"), f"Papua {y}", pap[str(y)], "sd", maks, file=sys.stderr)
    return out


def uji():
    import tempfile, riwayat_petak as RP
    assert RP.kunci(-3.001, 112.001) // 10000 - 1000 == math.floor(112.001 / RP.DERAJAT)
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
        f.write("latitude,longitude,acq_date,confidence,type\n-3.001,112.001,2026-01-02,n,0\n-3.0011,112.0011,2026-01-03,h,0\n-3.2,112.2,2026-01-03,l,0\n-3.3,112.3,2026-01-03,n,2\n")
    o = petak_tahun(f.name, 2026, keluar=f.name + ".json", riwayat=False)
    os.unlink(f.name), os.unlink(f.name + ".json")
    assert o["nasional"]["2026"] == 1 and o["tak_terpetakan"]["2026"] == 0 and o["tahun_berjalan"] == 2026 and o["sd"] == "2026-01-03", o["nasional"]
    print("titik_tahun uji: OK")


if __name__ == "__main__":
    if sys.argv[1:2] == ["petak"]:
        petak_tahun(sys.argv[2], keluar=sys.argv[4] if len(sys.argv) > 4 else None, sd_maks=sys.argv[3] if len(sys.argv) > 3 else None)
    elif sys.argv[1:2] == ["uji"]:
        uji()
    else:
        main(*sys.argv[1:])
