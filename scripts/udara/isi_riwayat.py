"""Isi awal riwayat udara (tab Tren): PM2,5 CAMS hari-hari lampau -> public/data/udara_kualitas_riwayat.json

Dijalankan SEKALI dengan tangan (bukan di workflow): kualitas.py hanya mencatat hari ke-0 tiap jalan, jadi riwayat baru tumbuh
satu hari per hari. Skrip ini mengunduh analisis CAMS (Open-Meteo Air Quality, past_days) untuk kisi 1 derajat yang sama dengan
scripts/data/asap.py, menghitung jiwa per kategori dengan kualitas.hitung() (penduduk WorldPop sama), dan menulis hari lampau
(kemarin ke belakang). Hari ini dan sesudahnya tidak disentuh: itu milik jalan harian. Hari yang sudah ada ditimpa analisis (lebih
baik daripada prakiraan pagi harinya). Nilainya tetap PERKIRAAN MODEL, bukan alat ukur.

Pakai:  python3 scripts/udara/isi_riwayat.py [hari_ke_belakang=45]   |   python3 scripts/udara/isi_riwayat.py uji
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kualitas  # noqa: E402

URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
WIB = dt.timezone(dt.timedelta(hours=7))


def ambil(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0"}), timeout=180) as r:
                return json.loads(r.read())
        except Exception as e:
            if i == 3:
                raise
            time.sleep(60 if "429" in str(e) else 10)


def harian(waktu, pm):
    """Deret jam -> {tanggal: (rata 24 jam, maks)}; rata-rata hanya bila >= 18 jam terisi (aturan sama dengan asap.py)."""
    per = {}
    for t, v in zip(waktu, pm):
        if v is not None:
            per.setdefault(t[:10], []).append(v)
    return {d: (round(sum(x) / len(x)) if len(x) >= 18 else None, round(max(x))) for d, x in per.items()}


def main(n=45):
    hari_ini = dt.datetime.now(WIB).date().isoformat()
    titik = [(la + .5, lo + .5) for la in range(-11, 6) for lo in range(94, 141)]
    baris = []
    for a in range(0, len(titik), 100):
        b = titik[a:a + 100]
        d = ambil(f"{URL}?latitude={','.join(str(x[0]) for x in b)}&longitude={','.join(str(x[1]) for x in b)}&hourly=pm2_5&past_days={n}&forecast_days=1&timezone=Asia%2FJakarta")
        for (la, lo), x in zip(b, d if isinstance(d, list) else [d]):
            baris.append((la, lo, harian(x["hourly"]["time"], x["hourly"]["pm2_5"])))
        print(f"  {a + len(b)}/{len(titik)}", file=sys.stderr)
        time.sleep(1)
    hari = sorted({t for _, _, h in baris for t in h if t < hari_ini})
    asap = {"hari": hari, "kolom": ["lat", "lon", "pm25_maks", "pm25_rata"],
            "grid": [[la, lo, [h.get(t, (None, None))[1] for t in hari], [h.get(t, (None, None))[0] for t in hari]] for la, lo, h in baris]}
    muat = lambda p: json.load(open(os.path.join(AKAR, p), encoding="utf-8"))
    h = kualitas.hitung(asap, muat("public/data/penduduk.json"), muat("public/banjir/data/pusat_kec.json"))
    rw_p = os.path.join(AKAR, "public/data/udara_kualitas_riwayat.json")
    rw = json.load(open(rw_p)) if os.path.exists(rw_p) else None
    for i, t in enumerate(hari):
        if not h["nasional"][i]["rata"]:   # hari tanpa data jiwa (seluruh sel kosong) dilewati, bukan nol
            continue
        rw = kualitas.riwayat(rw, t, h["nasional"][i], {k: v[i] for k, v in h["prov"].items()})
    with open(rw_p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(rw, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(rw_p + ".tmp", rw_p)
    print(f"riwayat udara: {len(rw['tgl'])} hari ({min(rw['tgl'])} .. {max(rw['tgl'])}), {len(rw['prov'])} provinsi", file=sys.stderr)


def uji():
    jam = [f"2026-10-0{d}T{j:02d}:00" for d in (1, 2) for j in range(24)]
    h = harian(jam, [10] * 23 + [40] + [None] * 23 + [5])
    assert h["2026-10-01"] == (11, 40) and h["2026-10-02"] == (None, 5), h   # <18 jam: rata-rata None, maks tetap ada
    print("ok isi_riwayat")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(int(sys.argv[1]) if sys.argv[1:] else 45)
