"""Pemuat arsip titik panas VIIRS untuk simulasi kejadian karhutla (sim_karhutla.py).

Sumber (semua di repo, hanya dibaca):
  S1 data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-22/firms-raw-15-22okt.tar.gz  (FIRMS NRT per sensor per hari, 15-22 Okt 2026)
  S2 data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-25/firms-7hari-publik-25okt-0721.tar.gz (FIRMS 7 hari Asia Tenggara, 17-24 Okt 2026)
  S3 data/laporan-bnpb/generator/cache/raw/VIIRS_*_NRT-<tgl>.csv (cache generator laporan, 24 Okt-11 Nov 2026)
Digabung dan dibuang kembarannya (sensor, lat, lon, tanggal, jam). Hanya VIIRS (S-NPP, NOAA-20, NOAA-21) dan titik yang jatuh di
daratan Indonesia (poligon kecamatan public/geo/kecamatan). Hasil di-cache ke .npz di folder sementara.
"""
import csv, datetime as dt, glob, io, math, os, sys, tarfile
import numpy as np

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
EPOCH = dt.datetime(2026, 10, 1, tzinfo=dt.timezone.utc)
SENS = {"VIIRS_SNPP_NRT": 0, "VIIRS_NOAA20_NRT": 1, "VIIRS_NOAA21_NRT": 2, "SUOMI_VIIRS_C2": 0, "J1_VIIRS_C2": 1, "J2_VIIRS_C2": 2}
KEY = {"l": 0, "n": 1, "h": 2}


def _baca(teks, sensor_default):
    for r in csv.DictReader(io.StringIO(teks)):
        if r.get("instrument", "VIIRS") != "VIIRS":
            continue
        s = {"N": 0, "N20": 1, "N21": 2}.get(r["satellite"], None)
        if s is None:
            s = sensor_default
        if s is None:
            continue
        k = KEY.get(r["confidence"].strip().lower()[:1])
        if k is None:
            continue
        hh = int(r["acq_time"])
        t = dt.datetime.fromisoformat(r["acq_date"]).replace(tzinfo=dt.timezone.utc) + dt.timedelta(hours=hh // 100, minutes=hh % 100)
        yield (s, float(r["latitude"]), float(r["longitude"]), (t - EPOCH).total_seconds() / 3600.0, k, float(r["frp"] or 0), max(float(r.get("scan") or .4), float(r.get("track") or .4)))


def muat():
    baris, sumber = {}, {}
    def tambah(it, nama):
        n = 0
        for s, la, lo, t, k, frp, px in it:
            kk = (s, round(la, 5), round(lo, 5), round(t, 3))
            if kk not in baris:
                baris[kk] = (k, frp, px); sumber[nama] = sumber.get(nama, 0) + 1
            n += 1
    for nama, rel in (("S1", "data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-22/firms-raw-15-22okt.tar.gz"), ("S2", "data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-25/firms-7hari-publik-25okt-0721.tar.gz")):
        with tarfile.open(os.path.join(AKAR, rel)) as tf:
            for m in tf.getmembers():
                b = os.path.basename(m.name)
                if not m.isfile() or b.startswith("._") or not b.endswith(".csv") or "MODIS" in b:
                    continue
                teks = tf.extractfile(m).read().decode("utf-8", "replace")
                d = None
                for pre, v in SENS.items():
                    if b.startswith(pre):
                        d = v
                if d is None:
                    continue
                tambah(_baca(teks, d), nama)
    for f in sorted(glob.glob(os.path.join(AKAR, "data/laporan-bnpb/generator/cache/raw/VIIRS_*_NRT-*.csv"))):
        b = os.path.basename(f)
        d = [v for pre, v in SENS.items() if b.startswith(pre)][0]
        tambah(_baca(open(f, encoding="utf-8").read(), d), "S3")
    return baris, sumber


def wilayahkan(baris):
    """Tempel (kode_prov, kabupaten) tiap sel ~375 m yang jatuh di daratan; titik laut/luar negeri dibuang."""
    from wilayah import Wilayah
    import titik_unik as TU
    w = Wilayah()
    cache, keluar = {}, []
    for (s, la, lo, t), (k, frp, px) in baris.items():
        sl = TU.sel(la, lo)
        if sl not in cache:
            a = w.cari(lo, la)
            cache[sl] = (a[0], a[1]) if a else None
        if cache[sl] is None:
            continue
        keluar.append((s, la, lo, t, k, frp, cache[sl][0], cache[sl][1], px))
    return keluar


def siap(jalur_cache=None):
    if jalur_cache and os.path.exists(jalur_cache):
        z = np.load(jalur_cache, allow_pickle=True)
        return {k: z[k] for k in z.files}
    baris, sumber = muat()
    n_mentah = len(baris)
    k = wilayahkan(baris)
    k.sort(key=lambda r: r[3])
    kab = {}
    kode = []
    for r in k:
        i = (r[6], r[7])
        kode.append(kab.setdefault(i, len(kab)))
    d = {
        "sensor": np.array([r[0] for r in k], dtype=np.int8), "lat": np.array([r[1] for r in k]), "lon": np.array([r[2] for r in k]),
        "t": np.array([r[3] for r in k]), "yakin": np.array([r[4] for r in k], dtype=np.int8), "frp": np.array([r[5] for r in k]), "px": np.array([r[8] for r in k]),
        "kab": np.array(kode, dtype=np.int32), "kab_nama": np.array([f"{p}|{n}" for (p, n) in kab], dtype=object),
        "n_mentah": np.array([n_mentah]), "sumber": np.array([str(sumber)], dtype=object),
    }
    if jalur_cache:
        np.savez(jalur_cache, **d)
    return d


if __name__ == "__main__":
    S = sys.argv[1]
    d = siap(S)
    t = d["t"]
    print(len(t), d["n_mentah"], d["sumber"], t.min() / 24, t.max() / 24, np.bincount(d["sensor"]), np.bincount(d["yakin"]))
