"""Memilih sumber FIRMS (arsip standar SP atau NRT) per sensor per hari dari /api/data_availability, dipakai harian30.py dan khg_prioritas.py.

Arsip SP tertinggal ~3 bulan dari NRT dan jangkauannya beda per sensor (19 Okt 2026: VIIRS SP berakhir 30 Jun, MODIS SP 31 Jul, NRT VIIRS mulai 1 Jul,
MODIS NRT 1 Agu). Menebak dari umur hari membuat SP kosong (balasan 200 berisi header saja) diterima sebagai "nol titik" (bug 2-27 Agu).
Balasan yang bukan CSV (galat kunci/kuota juga datang berstatus 200) dianggap gagal. Hari WIB D = UTC D-1 17:00 .. D 17:00, jadi hari selesai bila
hari UTC D-1 dan D sukses untuk SEMUA famili sensor.

Uji:  python3 scripts/data/firms_sumber.py
"""
import csv, datetime as dt, io, json, os, sys

FAMILI = ("VIIRS_SNPP", "VIIRS_NOAA20", "MODIS")
SENSOR = {"VIIRS_SNPP": "N", "VIIRS_NOAA20": "N20", "MODIS": "M"}


def muat_ketersediaan(kunci, ambil, famili=FAMILI):
    """{data_id: (tgl_min, tgl_maks)}; RuntimeError bila NRT satu famili (bawaan FAMILI) tak tercantum."""
    ket = {}
    for b in ambil(f"https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/{kunci}/ALL").splitlines()[1:]:
        p = b.split(",")
        if len(p) == 3:
            ket[p[0]] = (dt.date.fromisoformat(p[1]), dt.date.fromisoformat(p[2]))
    if not all(f + "_NRT" in ket for f in famili):
        raise RuntimeError(f"data_availability tak lengkap: {sorted(ket)}")
    return ket


def sumber_hari(fam, d, ket):
    """SP bila d dalam jangkauannya, selain itu NRT bila d dalam jangkauannya, selain itu None."""
    for sfx in ("_SP", "_NRT"):
        r = ket.get(fam + sfx)
        if r and r[0] <= d <= r[1]:
            return fam + sfx
    return None


def csv_sah(teks):
    if not teks.lstrip().startswith("latitude"):
        raise ValueError("balasan FIRMS bukan CSV: " + teks.strip()[:80])
    return csv.DictReader(io.StringIO(teks))


def unduh(u0, u1, kunci, ambil, bbox, ket, log=sys.stderr, famili=FAMILI):
    """Unduh hari UTC u0..u1 (date) semua famili (bawaan FAMILI; peta_karhutla.py menambah VIIRS_NOAA21). -> ([(sumber, baris_csv)], ok)
    dengan ok[hari UTC] = set famili yang sukses. Blok gagal/kosong-salah-sumber dilewati (hari UTC-nya tak masuk ok)."""
    baris, ok = [], {}
    for fam in famili:
        d = u0
        while d <= u1:
            src = sumber_hari(fam, d, ket)
            n = 1
            while n < 5 and d + dt.timedelta(days=n) <= u1 and sumber_hari(fam, d + dt.timedelta(days=n), ket) == src:
                n += 1
            if src is not None:
                try:
                    isi = list(csv_sah(ambil(f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{kunci}/{src}/{bbox}/{n}/{d}")))
                    baris += [(src, r) for r in isi]
                    for i in range(n):
                        ok.setdefault(d + dt.timedelta(days=i), set()).add(fam)
                except Exception as e:
                    print("firms_sumber: gagal", src, d, e, file=log)
            d += dt.timedelta(days=n)
    return baris, ok


def penuh(ok, d, famili=FAMILI):
    """Tanggal WIB d selesai bila hari UTC d-1 dan d sukses untuk semua famili."""
    return all(ok.get(x, set()) == set(famili) for x in (d - dt.timedelta(days=1), d))


def nasional_harian(jalur):
    """{tgl: titik nasional} semua tahun dari musim_harian.json (pembanding kewarasan: hari kosong padahal nasional besar = unduhan gagal)."""
    if not os.path.exists(jalur):
        return {}
    out = {}
    for th, v in json.load(open(jalur)).get("nasional", {}).items():
        d0 = dt.date(int(th), 1, 1)
        out.update({(d0 + dt.timedelta(days=i)).isoformat(): n for i, n in enumerate(v)})
    return out


def uji():
    D = dt.date.fromisoformat
    HDR = "latitude,longitude,acq_date,acq_time\n"
    avail = "data_id,min_date,max_date\n" + "".join(f"{f}_SP,2012-01-01,2026-01-02\n{f}_NRT,2026-01-03,2026-12-31\n" for f in FAMILI)
    ket = muat_ketersediaan("K", lambda u: avail)
    assert sumber_hari("MODIS", D("2026-01-02"), ket) == "MODIS_SP" and sumber_hari("MODIS", D("2026-01-03"), ket) == "MODIS_NRT"
    assert sumber_hari("MODIS", D("2027-01-01"), ket) is None
    urls = []
    def ambil(u):
        urls.append(u)
        return HDR + "-2.5,100.5,2026-01-02,0100\n"
    baris, ok = unduh(D("2026-01-01"), D("2026-01-03"), "K", ambil, "b", ket)
    assert sorted(u.split("/")[-4] for u in urls) == sorted([f + "_SP" for f in FAMILI] + [f + "_NRT" for f in FAMILI]), urls   # dipecah di batas SP/NRT
    assert len(baris) == 6 and penuh(ok, D("2026-01-02")) and penuh(ok, D("2026-01-03")) and not penuh(ok, D("2026-01-04"))
    b4, ok4 = unduh(D("2026-01-01"), D("2026-01-02"), "K", ambil, "b", ket, famili=FAMILI + ("VIIRS_NOAA21",))   # famili di luar bawaan: tak ada sumber -> tak masuk ok
    assert all(ok4[x] == set(FAMILI) for x in ok4) and not penuh(ok4, D("2026-01-02"), FAMILI + ("VIIRS_NOAA21",)) and penuh(ok4, D("2026-01-02"))
    assert "VIIRS_NOAA20_NRT" in muat_ketersediaan("K", lambda u: avail.replace("VIIRS_SNPP_NRT", "X"), famili=("VIIRS_NOAA20", "MODIS"))   # S-NPP boleh hilang bila tak diminta
    try:
        muat_ketersediaan("K", lambda u: avail.replace("VIIRS_SNPP_NRT", "X")); raise SystemExit("S-NPP hilang harus RuntimeError bila diminta")
    except RuntimeError:
        pass
    for galat in (lambda u: "Invalid MAP_KEY.", lambda u: (_ for _ in ()).throw(RuntimeError("mati"))):
        b, ok = unduh(D("2026-01-01"), D("2026-01-02"), "K", galat, "b", ket, log=io.StringIO())
        assert not b and not ok
    print("firms_sumber: uji lolos")


if __name__ == "__main__":
    uji()
