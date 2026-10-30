"""Validasi prediksi pasang surut BMKG (dasar pasut_30h.json) terhadap pengamatan UHSLC, 9 stasiun aktif, 1 Des 2025 - 31 Agu 2026.
Pakai: python3 scripts/banjir/pasut_validasi.py     (sekitar 9 panggilan BMKG)    |    python3 scripts/banjir/pasut_validasi.py uji

Data pembanding: UHSLC Fast Delivery data PER JAM, diubah ke maksimum per hari WIB (scripts/banjir/uhslc_validasi.json). Percobaan awal
dengan rerata harian UHSLC gagal secara metodologis (rerata harian meredam pasang; Spearman sekitar 0,06 = kebetulan), jadi jangan dipakai.
Keterbatasan:
- BMKG hanya melayani prediksi 1 Des 2025 - 1 Jan 2027, jadi maksimum tahunan 2016-2025 tidak bisa diuji; yang diuji 9 bulan (1 Des 2025 - 31 Agu 2026).
- 8 dari 9 stasiun UHSLC aktif punya stasiun BMKG dalam 40 km (Prigi tidak: terdekat Sadeng 103 km, dilewati).
- Prediksi BMKG murni astronomis: tanpa surja, tanpa musim. Pengamatan memuatnya. Karena itu ada metrik "bandpass" (dikurangi rerata
  bergulir 31 hari pada kedua deret) yang membuang musim; metrik mentah lebih rendah.
- Metrik: Spearman maksimum harian prediksi vs teramati; hit10 = porsi 10% hari teramati tertinggi yang jatuh di 10% hari prediksi tertinggi
  (kebetulan = 0,10); persentil prediksi pada hari maksimum teramati.
HASIL (29 Okt 2026, 8 stasiun, 247 sampai 274 hari tiap stasiun):
  Spearman mentah rata-rata 0,76 (0,56 Ambon sampai 0,87 Sabang); bandpass 0,91 (0,88 sampai 0,94).
  hit10 mentah 0,58 (0,44 sampai 0,78), bandpass 0,79; kebetulan 0,10.
  Hari maksimum teramati jatuh di persentil prediksi 92 sampai 100 di semua 8 stasiun.
  Arti: urutan hari pasang tinggi bisa dipakai; ini bukan klaim tinggi muka air atau banjir rob (surja, penurunan tanah, gelombang di luar prediksi).
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import ambil
from pasut import U, parse_hltide, maks_harian_jam

MAKS_KM = 40


def km(a, b, c, d):
    p = math.pi / 180
    x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def peringkat(xs):
    o = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and xs[o[j + 1]] == xs[o[i]]:
            j += 1
        for k in range(i, j + 1):
            r[o[k]] = (i + j) / 2
        i = j + 1
    return r


def spearman(a, b):
    ra, rb = peringkat(a), peringkat(b); n = len(a); ma, mb = sum(ra) / n, sum(rb) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in ra)); sb = math.sqrt(sum((x - mb) ** 2 for x in rb))
    return sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / (sa * sb) if sa and sb else None


def bandpass(xs, lebar=31):
    h = lebar // 2
    return [x - sum(xs[max(0, i - h):i + h + 1]) / len(xs[max(0, i - h):i + h + 1]) for i, x in enumerate(xs)]


def hit(obs, pre, p=0.1):
    k = max(1, round(len(obs) * p)); atas = lambda xs: set(sorted(range(len(xs)), key=lambda i: -xs[i])[:k])
    return len(atas(obs) & atas(pre)) / k


def bandingkan(obs, pre):
    """obs, pre: {tanggal: nilai} -> metrik pada tanggal bersama."""
    t = sorted(set(obs) & set(pre))
    if len(t) < 60:
        return None
    o, p = [obs[x] for x in t], [pre[x] for x in t]; ob, pb = bandpass(o), bandpass(p)
    return {"n": len(t), "spearman": spearman(o, p), "spearman_bandpass": spearman(ob, pb), "hit10": hit(o, p), "hit10_bandpass": hit(ob, pb),
            "hari_maks_obs_di_persentil_pred": round(100 * sum(1 for v in p if v <= p[o.index(max(o))]) / len(p))}


def main():
    ref = json.load(open(os.path.join(os.path.dirname(__file__), "uhslc_validasi.json")))
    meta = ambil(f"{U}/metadata", coba=3, batas_waktu=60); hasil = []
    for s in ref["stasiun"]:
        b = min(meta, key=lambda m: km(s["lat"], s["lon"], m["Lat"], m["Lon"])); jarak = km(s["lat"], s["lon"], b["Lat"], b["Lon"])
        if jarak > MAKS_KM:
            print(f"{s['nama']}: stasiun BMKG terdekat {b['Lokasi']} {jarak:.0f} km, dilewati"); continue
        import time; time.sleep(1.0)
        pre = {d: v[0] for d, v in maks_harian_jam(parse_hltide(ambil(f"{U}/hltide/MSL/WIB/{b['ID']}/20251201/20260831", coba=2, batas_waktu=40))).items()}
        m = bandingkan(ref["harian"][s["id"]], pre)
        print(s["nama"], b["Lokasi"], f"{jarak:.0f} km", m); m and hasil.append(m)
    if hasil:
        rata = lambda k: round(sum(x[k] for x in hasil if x[k] is not None) / len(hasil), 2)
        print("rata-rata", len(hasil), "stasiun:", {k: rata(k) for k in ("spearman", "spearman_bandpass", "hit10", "hit10_bandpass")})


def uji():
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-9 and abs(spearman([1, 2, 3], [3, 2, 1]) + 1) < 1e-9
    assert hit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) == 1.0
    assert hit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) == 0.0
    t = [(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat() for i in range(120)]
    o = {d: math.sin(i / 3) for i, d in enumerate(t)}
    assert bandingkan(o, dict(o))["spearman"] > 0.999 and bandingkan(o, {})is None
    print("pasut_validasi uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
