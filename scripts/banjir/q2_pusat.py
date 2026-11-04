"""Debit GloFAS harian 2016-2025 di PUSAT SEL (104 sel arsip_debit) untuk Q2 latih CAMPUR (PRAREG-CAMPUR §4.3 aturan 2, amandemen A-11).
Titik latih = titik arsip (pusat sel; titik.json asli model_kab_debit tidak ada). Idempoten (sel yang sudah utuh dilewati), satu proses, berhenti rapi
saat kuota habis. Keluaran data/raw/banjir/q2_pusat/<lat>_<lon>.json.gz = {lat, lon, awal, akhir, q, unduh}; manifest.json = sha256 per berkas.
Pakai:  python3 scripts/banjir/q2_pusat.py panen   |   status   |   uji
Kuota: ~ (3.653 hari / 14) = ~261 bobot per sel, ~27 rb untuk 104 sel (kuota harian 10.000: >= 3 hari). Jangan jalan bersamaan dengan jam_era5.py.
"""
import datetime as dt, hashlib, json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import KuotaHabis, MENTAH, per_lokasi  # noqa: E402

DIR = os.path.join(MENTAH, "q2_pusat")
AWAL, AKHIR = dt.date(2016, 1, 1), dt.date(2025, 12, 31)
API = "https://flood-api.open-meteo.com/v1/flood"
JEDA = 35


def jalur(s):
    return os.path.join(DIR, f"{s[0]:.3f}_{s[1]:.3f}.json.gz")


def utuh(c):
    return bool(c) and c.get("awal") == str(AWAL) and c.get("akhir") == str(AKHIR) and len(c["q"]) == (AKHIR - AWAL).days + 1


def baca(s):
    import gzip
    p = jalur(s)
    return json.load(gzip.open(p, "rt")) if os.path.exists(p) else None


def tulis(s, isi):
    import gzip
    os.makedirs(DIR, exist_ok=True)
    tmp = jalur(s) + ".tmp"
    with gzip.open(tmp, "wt") as f:
        json.dump(isi, f, separators=(",", ":"))
    os.replace(tmp, jalur(s))


def daftar():
    import arsip_debit
    return [s for s, _ in arsip_debit.daftar_sel()]


def panen(fetch=None):
    import model_kab_debit as MKD
    fetch = fetch or MKD.panggil
    sel = daftar()
    perlu = [s for s in sel if not utuh(baca(s))]
    print(f"q2_pusat: {len(perlu)}/{len(sel)} sel perlu diunduh", file=sys.stderr)
    for n, s in enumerate(perlu):
        url = f"{API}?latitude={s[0]}&longitude={s[1]}&daily=river_discharge&start_date={AWAL}&end_date={AKHIR}"
        try:
            d = per_lokasi(fetch(url, 300))[0]["daily"]
        except KuotaHabis as e:
            print(f"berhenti, kuota habis ({e}); jalankan lagi, cache dipakai ulang", file=sys.stderr)
            return 1
        if d["time"][0] != str(AWAL) or len(d["time"]) != (AKHIR - AWAL).days + 1:
            sys.exit(f"respons tidak utuh untuk {s}: {d['time'][:1]} {len(d['time'])} hari")
        tulis(s, {"lat": s[0], "lon": s[1], "awal": str(AWAL), "akhir": str(AKHIR), "q": d["river_discharge"], "unduh": str(dt.date.today())})
        print(f"  {n + 1}/{len(perlu)}", file=sys.stderr)
        time.sleep(JEDA)
    ada = [s for s in sel if utuh(baca(s))]
    json.dump({"n": len(ada), "sha256": {os.path.basename(jalur(s)): hashlib.sha256(open(jalur(s), "rb").read()).hexdigest() for s in ada}},
              open(os.path.join(DIR, "manifest.json"), "w"), separators=(",", ":"))
    return 0


def status():
    sel = daftar()
    print(f"{sum(1 for s in sel if utuh(baca(s)))}/{len(sel)} sel utuh")


def uji():
    import tempfile
    global DIR
    asli = DIR
    with tempfile.TemporaryDirectory() as t:
        DIR = t
        s = (1.0, 2.0)
        assert not utuh(baca(s))
        n = (AKHIR - AWAL).days + 1
        tulis(s, {"lat": 1.0, "lon": 2.0, "awal": str(AWAL), "akhir": str(AKHIR), "q": [1.0] * n, "unduh": "x"})
        assert utuh(baca(s)) and not utuh({**baca(s), "q": [1.0] * (n - 1)}) and os.path.basename(jalur(s)) == "1.000_2.000.json.gz"
    DIR = asli
    print("ok q2_pusat")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    sys.exit({"panen": panen, "status": status, "uji": uji}.get(m, lambda: sys.exit(__doc__))() or 0)
