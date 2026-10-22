"""Kalender musim asap dan ENSO -> public/udara/data/musim_asap.json (kartu Kalender musim asap dan ENSO di Tren udara).

Hanya menghitung ulang yang sudah tercatat, tanpa angka karangan dan tanpa klaim sebab:
  bulan : titik panas nasional per bulan (public/data/musim_harian.json, semua satelit) - median dan kisaran tahun penuh sebelum tahun berjalan.
          Titik panas adalah penanda musim bakar, BUKAN ukuran asap: PM2,5 CAMS di repo hanya ~4 bulan sehingga kalender PM2,5 multi-tahun belum mungkin.
  tahun : jumlah titik panas dari 1 Jan sampai tanggal data terakhir tiap tahun (jendela sama supaya tahun berjalan sebanding) + fase ENSO tahun itu
          (rata-rata ONI musim 3-bulanan yang ada, NOAA CPC public/data/iklim.json: >= +0,5 El Nino, <= -0,5 La Nina). `sementara` bila ONI tahun itu < 12 musim.
  cams  : PM2,5 nasional berbobot jiwa per bulan dari analisis CAMS (public/udara/data/riwayat.json), hanya bulan dengan >= 10 hari.
Tanpa musim_harian.json atau iklim.json: tidak menulis apa pun.

  python3 scripts/udara/musim_asap.py        # tulis berkas
  python3 scripts/udara/musim_asap.py uji    # self-check tanpa jaringan
"""
import datetime as dt
import os
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

AMBANG_ONI = 0.5
MIN_HARI_CAMS = 10


def fase(oni):
    return "El Niño" if oni >= AMBANG_ONI else "La Niña" if oni <= -AMBANG_ONI else "Netral"


def per_bulan(deret, tahun):
    """deret harian (indeks = hari dalam tahun) -> 12 jumlah bulanan."""
    out = [0] * 12
    for i, v in enumerate(deret):
        out[(dt.date(tahun, 1, 1) + dt.timedelta(days=i)).month - 1] += v or 0
    return out


def susun(mh, ik, riwayat=None):
    nas, sd = mh.get("nasional") or {}, mh.get("sd")
    if not nas or not sd:
        return None
    tmaks = int(sd[:4])
    penuh = sorted(int(t) for t, a in nas.items() if int(t) < tmaks and len(a) >= 365)
    if len(penuh) < 3:
        return None
    per = {t: per_bulan(nas[str(t)], t) for t in penuh}
    bulan = {"median": [round(statistics.median(per[t][m] for t in penuh)) for m in range(12)],
             "min": [min(per[t][m] for t in penuh) for m in range(12)], "maks": [max(per[t][m] for t in penuh) for m in range(12)], "tahun": penuh}
    doy = (dt.date.fromisoformat(sd) - dt.date(tmaks, 1, 1)).days + 1
    oni = {}
    for o in ik.get("oni") or []:
        oni.setdefault(o["tahun"], []).append(o["nilai"])
    tahun = {}
    for t in penuh + [tmaks]:
        a = nas.get(str(t))
        if not a or t not in oni:
            continue
        r = round(sum(oni[t]) / len(oni[t]), 2)
        tahun[str(t)] = {"n": sum(v or 0 for v in a[:doy]), "oni": r, "fase": fase(r), "sementara": len(oni[t]) < 12}
    if len(tahun) < 4:
        return None
    cams = []
    tg = (riwayat or {}).get("tgl") or {}
    for b in sorted({t[:7] for t in tg}):
        v = [x[2] for t, x in tg.items() if t[:7] == b]
        if len(v) >= MIN_HARI_CAMS:
            cams.append([b, len(v), round(sum(v) / len(v), 1)])
    return {"sd": sd, "doy": doy, "bulan": bulan, "tahun": tahun, "cams": cams,
            "kini": {k: ik.get(k) for k in ("status", "iod_status") if ik.get(k)} | ({"oni": ik["oni_terakhir"]} if ik.get("oni_terakhir") else {}),
            "sumber": "NASA FIRMS, MODIS C6.1 + VIIRS S-NPP + VIIRS NOAA-20; arsip standar sampai batas SP, NRT sesudahnya; hanya titik di daratan Indonesia; ONI NOAA CPC; PM2,5 analisis Copernicus CAMS lewat Open-Meteo"}


def main():
    mh, ik = alat.data("musim_harian.json", None), alat.data("iklim.json", None)
    o = susun(mh, ik, alat.muat(os.path.join(alat.OUT, "riwayat.json"), None)) if mh and ik else None
    if o:
        alat.simpan("musim_asap.json", o)
        alat.log(f"musim_asap.json: {len(o['tahun'])} tahun, {len(o['cams'])} bulan CAMS")
    else:
        alat.log("musim_asap: masukan kurang, tidak menulis")


def uji():
    assert [fase(v) for v in (0.5, 0.49, -0.5, -0.4)] == ["El Niño", "Netral", "La Niña", "Netral"]
    assert per_bulan([1] * 366, 2020)[1] == 29 and sum(per_bulan([1] * 365, 2021)) == 365
    mh = {"sd": "2026-03-01", "nasional": {str(t): [1] * 365 for t in range(2020, 2024)} | {"2026": [2] * 60}}
    mh["nasional"]["2022"] = [2] * 365
    ik = {"oni": [{"tahun": t, "musim": str(i), "nilai": v} for t, v in ((2020, 1.0), (2021, -1.0), (2022, 0.0), (2023, 0.2)) for i in range(12)] + [{"tahun": 2026, "musim": "DJF", "nilai": 0.8}]}
    rw = {"tgl": {f"2026-02-{d:02d}": [0, 0, 10.0, 0] for d in range(1, 15)} | {"2026-03-01": [0, 0, 99.0, 0]}}
    o = susun(mh, ik, rw)
    assert o["bulan"]["median"][0] == 31 and o["bulan"]["maks"][0] == 62 and o["bulan"]["tahun"] == [2020, 2021, 2022, 2023], o["bulan"]
    assert o["doy"] == 60 and o["tahun"]["2020"] == {"n": 60, "oni": 1.0, "fase": "El Niño", "sementara": False}
    assert o["tahun"]["2022"]["n"] == 120 and o["tahun"]["2026"]["n"] == 120 and o["tahun"]["2026"]["sementara"] is True and o["tahun"]["2026"]["fase"] == "El Niño"
    assert o["cams"] == [["2026-02", 14, 10.0]], o["cams"]            # Maret hanya 1 hari: dibuang
    assert susun({"sd": "2026-03-01", "nasional": {}}, ik) is None and susun(mh, {"oni": []}) is None
    print("musim_asap uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
