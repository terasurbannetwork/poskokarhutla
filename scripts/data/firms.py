"""Ambil titik panas VIIRS S-NPP seluruh Indonesia dari FIRMS area API.

Pakai:  python3 scripts/data/firms.py 2015-01-01 2026-10-12  > data/raw/firms/viirs.csv
Kunci dibaca dari env FIRMS_MAP_KEY atau dari .env.
Arsip standar (SP) dipakai sampai tanggal akhirnya, sisanya NRT.
"""
import csv, datetime as dt, io, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from firms_sumber import sensor_url
from concurrent.futures import ThreadPoolExecutor

# Kotak luar Indonesia; titik di luar poligon provinsi dibuang di langkah berikutnya
BBOX = ["94,-11.5,141.5,6.5"]
API = "https://firms.modaps.eosdis.nasa.gov/api"


def kunci():
    if os.environ.get("FIRMS_MAP_KEY"):
        return os.environ["FIRMS_MAP_KEY"]
    for baris in open(os.path.join(os.path.dirname(__file__), "../../.env")):
        if baris.startswith("FIRMS_MAP_KEY="):
            return baris.split("=", 1)[1].strip()
    sys.exit("FIRMS_MAP_KEY tidak ada")


def ambil(url, coba=5):
    for i in range(coba):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                teks = r.read().decode()
            if teks.startswith("Invalid") or "Exceeding" in teks:
                raise RuntimeError(teks[:120])
            return teks
        except Exception as e:  # jaringan putus / limit transaksi: tunggu lalu ulang
            if i == coba - 1:
                raise RuntimeError(sensor_url(f"{url}: {type(e).__name__}: {e}")) from None
            time.sleep(30 * (i + 1))


def main(mulai, akhir):
    k = kunci()
    batas = {}
    for b in csv.DictReader(io.StringIO(ambil(f"{API}/data_availability/csv/{k}/all"))):
        batas[b["data_id"]] = (dt.date.fromisoformat(b["min_date"]), dt.date.fromisoformat(b["max_date"]))
    sensor = os.environ.get("SENSOR", "VIIRS_SNPP")  # VIIRS_SNPP (2012-) atau MODIS (2000-)
    sp_akhir = batas[f"{sensor}_SP"][1]

    tugas, d, akhir = [], dt.date.fromisoformat(mulai), dt.date.fromisoformat(akhir)
    while d <= akhir:
        n = min(5, (akhir - d).days + 1)
        if d <= sp_akhir:
            n = min(n, (sp_akhir - d).days + 1)  # jendela tidak boleh melewati batas SP/NRT
            sumber = f"{sensor}_SP"
        else:
            sumber = f"{sensor}_NRT"
        for kotak in BBOX:
            tugas.append(f"{API}/area/csv/{k}/{sumber}/{kotak}/{n}/{d.isoformat()}")
        d += dt.timedelta(days=n)

    # batas FIRMS 5000 transaksi / 10 menit dipakai bersama pembaruan harian: 2 thread + jeda, maks ~3 permintaan/detik
    def pelan(u):
        time.sleep(0.6)
        return ambil(u)

    with ThreadPoolExecutor(2) as ex:
        hasil = list(ex.map(pelan, tugas))

    tulis, kepala = csv.writer(sys.stdout), None
    jumlah = 0
    for teks in hasil:
        baris = list(csv.reader(io.StringIO(teks)))
        if not baris:
            continue
        if kepala is None:
            kepala = baris[0]
            tulis.writerow(kepala)
        for r in baris[1:]:
            tulis.writerow(r)
            jumlah += 1
    print(f"{len(tugas)} permintaan, {jumlah} titik", file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:3])
