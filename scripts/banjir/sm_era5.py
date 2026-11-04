"""Lengas tanah ERA5 harian (soil_moisture_7_to_28cm_mean, variabel SAMA dengan uji_balik) hanya untuk sel/tahun yang tidak ada di cache uji_balik, untuk CAMPUR.
Hujan harian (p) dan imax diturunkan dari hujan JAM-an jam_era5.py (identik: selisih 0 pada sel yang ada di kedua cache), jadi hanya sm yang diunduh.
Per sel: sel yang tidak ada di cache uji_balik -> ub.AWAL..2026-10-18; sel yang ada -> 2026-01-04..2026-10-18 (cache uji_balik berakhir ub.AKHIR).
Keluaran data/raw/banjir/sm_era5/<lat>_<lon>.json.gz = {awal, akhir, sm}. Idempoten, 1 proses, berhenti rapi saat kuota habis; MENUNGGU jam_era5.py selesai (kuota bersama).
Kuota: bobot = 1 variabel/10 x hari/14 per lokasi: sel penuh (3.953 hari) ~28; sel 2026 saja (288 hari) ~2,1. Pakai:  python3 scripts/banjir/sm_era5.py panen | status | uji
"""
import datetime as dt, gzip, json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import KuotaHabis, MENTAH, ambil  # noqa: E402
import uji_balik as ub  # noqa: E402

DIR = os.path.join(MENTAH, "sm_era5")
AKHIR = dt.date(2026, 10, 18)
API = "https://archive-api.open-meteo.com/v1/archive"
JEDA = 20


def jalur(s):
    return os.path.join(DIR, f"{s[0]:.3f}_{s[1]:.3f}.json.gz")


def rentang(s):
    return (ub.AKHIR + dt.timedelta(1), AKHIR) if os.path.exists(ub.jalur(*s)) else (ub.AWAL, AKHIR)


def bobot(s):
    a, b = rentang(s)
    return (b - a).days / 14 * 0.1


def utuh(s):
    p = jalur(s)
    if not os.path.exists(p):
        return False
    c = json.load(gzip.open(p, "rt"))
    a, b = rentang(s)
    return c["awal"] == str(a) and c["akhir"] == str(b) and len(c["sm"]) == (b - a).days + 1


def daftar():
    import arsip_debit
    return [s for s, _ in arsip_debit.daftar_sel()]


def jam_selesai():
    import subprocess
    return subprocess.run(["pgrep", "-f", "[j]am_era5.py panen"], capture_output=True).returncode != 0


def panen():
    sel = [s for s in daftar() if not utuh(s)]
    print(f"sm_era5: {len(sel)} sel, bobot kuota ~{sum(bobot(s) for s in sel):.0f}", file=sys.stderr)
    os.makedirs(DIR, exist_ok=True)
    for n, s in enumerate(sel):
        a, b = rentang(s)
        url = f"{API}?latitude={s[0]}&longitude={s[1]}&start_date={a}&end_date={b}&daily=soil_moisture_7_to_28cm_mean&models=era5&timezone=Asia%2FJakarta"
        try:
            d = ambil(url, batas_waktu=300)
        except KuotaHabis as e:
            print(f"berhenti, kuota habis ({e}); jalankan lagi", file=sys.stderr)
            return 1
        d = d[0] if isinstance(d, list) else d
        t, v = d["daily"]["time"], d["daily"]["soil_moisture_7_to_28cm_mean"]
        if t[0] != str(a) or len(t) != (b - a).days + 1:
            sys.exit(f"respons sm tidak utuh {s}: {t[:1]} {len(t)} hari")
        with gzip.open(jalur(s) + ".tmp", "wt") as f:
            json.dump({"awal": str(a), "akhir": str(b), "sm": v}, f, separators=(",", ":"))
        os.replace(jalur(s) + ".tmp", jalur(s))
        print(f"  {n + 1}/{len(sel)}", file=sys.stderr)
        time.sleep(JEDA)
    return 0


def status():
    sel = daftar()
    print(f"{sum(1 for s in sel if utuh(s))}/{len(sel)} sel utuh; bobot sisa ~{sum(bobot(s) for s in sel if not utuh(s)):.0f}")


def uji():
    assert 20 < bobot((99.0, 99.0)) < 40
    assert rentang((99.0, 99.0)) == (ub.AWAL, AKHIR)
    print("ok sm_era5")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    sys.exit({"panen": panen, "status": status, "uji": uji}.get(m, lambda: sys.exit(__doc__))() or 0)
