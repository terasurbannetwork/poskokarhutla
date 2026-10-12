"""Debit sungai besar GloFAS (Open-Meteo Flood API) dan ambang periode ulang -> public/banjir/data/sungai.json

Langkah A (sekali, cache data/raw/banjir/sungai_titik.json): kisi darat 0,25 derajat (sama dengan hujan.py) dikirim ke Flood API;
  API memakai sel GloFAS 0,05 derajat terdekat. Sel dipertahankan bila median debit harian 14 hari terakhir > 30 m3/s
  (sungai besar; 14 hari, bukan 30, supaya bobot kuota Open-Meteo = 1 panggilan per lokasi). Sel GloFAS kembar dibuang.
  Batas: titik kisi yang jatuh di samping alur sungai tidak terpilih, jadi ini sampel sungai besar, bukan semua.
Langkah B (cache data/raw/banjir/sungai_ambang.json, dilanjut tiap jalan; berhenti rapi bila kuota jam/harian habis):
  MAHAL: Open-Meteo menghitung 1 lokasi x 29 tahun sebagai ~760 panggilan (kuota gratis 600/menit, 5.000/jam,
  10.000/hari), jadi 1 titik per permintaan dan SUNGAI_B_TITIK titik per jalan. 192 titik ~ 146 rb panggilan:
  dengan 6 titik/hari di CI butuh ~5 minggu; lebih cepat dengan kunci API berbayar atau jalan lokal beberapa hari.
  debit harian 1997-01-01..2025-12-31 per titik (1984-1996 kosong di Open-Meteo, 29 tahun) -> maksimum tahunan (tahun dengan >= 300 hari data) ->
  Gumbel metode momen:
      alpha = s * sqrt(6) / pi          (s = simpangan baku sampel maksimum tahunan, n-1)
      u     = rata2 - 0,5772 * alpha    (0,5772 = konstanta Euler-Mascheroni)
      Q_T   = u - alpha * ln(-ln(1 - 1/T))     -> Q2 = u + 0,3665 alpha, Q5 = u + 1,5000 alpha, Q20 = u + 2,9702 alpha
Langkah C (harian): river_discharge (anggota kendali) dan river_discharge_max (maks ansambel), 3 hari lalu + 7 hari.
  puncak = debit kendali tertinggi hari ini..+6; kelas 0 normal (< Q2), 1 waspada (>= Q2), 2 siaga (>= Q5), 3 awas (>= Q20);
  None bila ambang belum ada. Ambang dan prakiraan dari model yang sama (GloFAS), jadi bias model saling meniadakan.

Pakai:  python3 scripts/data/sungai.py           A/B bila cache belum lengkap, lalu C
        python3 scripts/data/sungai.py harian    C saja (titik tanpa ambang -> kelas None)
        python3 scripts/data/sungai.py uji
Urutan: A (bila belum ada) -> C (selalu, pakai ambang yang sudah ada) -> B (sisa kuota; ambang baru terpakai jalan berikutnya).
Env SUNGAI_B_TITIK: maksimum titik langkah B per jalan (bawaan 6).
"""
import math, os, statistics, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, KuotaHabis, ambil, baca, grid_darat, per_lokasi, simpan
from wilayah import Wilayah

API = "https://flood-api.open-meteo.com/v1/flood"
J_TITIK = os.path.join(MENTAH, "sungai_titik.json")
J_AMBANG = os.path.join(MENTAH, "sungai_ambang.json")
MIN_MEDIAN = 30.0
AWAL, AKHIR = "1997-01-01", "2025-12-31"  # GloFAS di Open-Meteo kosong sebelum 1997 (diuji Okt 2026)
EULER = 0.5772156649


def koord(daftar):
    return "latitude=" + ",".join(str(x[0]) for x in daftar) + "&longitude=" + ",".join(str(x[1]) for x in daftar)


# ------------------------------------------------------------------ rumus murni
def maks_tahunan(waktu, debit, min_hari=300):
    per = {}
    for t, q in zip(waktu, debit):
        if q is not None:
            per.setdefault(t[:4], []).append(q)
    return [max(v) for _, v in sorted(per.items()) if len(v) >= min_hari]


def gumbel(maks, periode=(2, 5, 20)):
    """Maksimum tahunan -> {T: Q_T} (metode momen). Kurang dari 10 tahun -> None."""
    if len(maks) < 10:
        return None
    a = statistics.stdev(maks) * math.sqrt(6) / math.pi
    u = statistics.mean(maks) - EULER * a
    return {t: u - a * math.log(-math.log(1 - 1 / t)) for t in periode}


def kelas(puncak, q2, q5, q20):
    if puncak is None or q2 is None:
        return None
    return 3 if puncak >= q20 else 2 if puncak >= q5 else 1 if puncak >= q2 else 0


# ------------------------------------------------------------------ langkah A, B, C
def langkah_a():
    w = Wilayah()
    grid = grid_darat(w, 0.25)
    titik, lihat = [], set()
    for a in range(0, len(grid), 100):
        bagian = grid[a:a + 100]
        data = ambil(f"{API}?{koord(bagian)}&daily=river_discharge&past_days=13&forecast_days=1")
        for g, d in zip(bagian, per_lokasi(data)):
            qs = [q for q in d["daily"]["river_discharge"] if q is not None]
            la, lo = round(d["latitude"], 3), round(d["longitude"], 3)
            if not qs or statistics.median(qs) <= MIN_MEDIAN or (la, lo) in lihat:
                continue
            lihat.add((la, lo))
            adm = w.cari(lo, la) or w.cari(g[1], g[0]) or (g[2], None, None)
            titik.append({"lat": la, "lon": lo, "prov": adm[0], "kab": adm[1], "kec": adm[2], "median": round(statistics.median(qs), 1)})
        print(f"  A {min(a + 100, len(grid))}/{len(grid)}: {len(titik)} titik sungai", file=sys.stderr)
        time.sleep(11)
    simpan(J_TITIK, titik)
    return titik


def langkah_b(titik, maks_titik):
    ambang = baca(J_AMBANG, {})
    sisa = [t for t in titik if f"{t['lat']},{t['lon']}" not in ambang]
    for a in range(min(len(sisa), maks_titik)):
        bagian = sisa[a:a + 1]
        try:
            data = ambil(f"{API}?{koord([(t['lat'], t['lon']) for t in bagian])}&daily=river_discharge&start_date={AWAL}&end_date={AKHIR}", batas_waktu=300)
        except KuotaHabis as e:
            print(f"  B berhenti, kuota Open-Meteo habis: {e}", file=sys.stderr)
            break
        for t, d in zip(bagian, per_lokasi(data)):
            mx = maks_tahunan(d["daily"]["time"], d["daily"]["river_discharge"])
            g = gumbel(mx)
            ambang[f"{t['lat']},{t['lon']}"] = {"n": len(mx), **({f"q{k}": round(v, 1) for k, v in g.items()} if g else {})}
        simpan(J_AMBANG, ambang)
        print(f"  B {len(ambang)}/{len(titik)}", file=sys.stderr)
        time.sleep(120)  # ~760 panggilan berbobot per titik; batas 600/menit
    return ambang


def langkah_c(titik, ambang):
    out, hari = [], None
    for a in range(0, len(titik), 100):
        bagian = titik[a:a + 100]
        data = ambil(f"{API}?{koord([(t['lat'], t['lon']) for t in bagian])}&daily=river_discharge,river_discharge_max&past_days=3&forecast_days=7")
        for t, d in zip(bagian, per_lokasi(data)):
            hari = d["daily"]["time"]
            q, qmax = d["daily"]["river_discharge"], d["daily"]["river_discharge_max"]
            ke_depan = [x for x in q[3:] if x is not None]
            puncak = max(ke_depan) if ke_depan else None
            am = ambang.get(f"{t['lat']},{t['lon']}", {})
            q2, q5, q20 = am.get("q2"), am.get("q5"), am.get("q20")
            out.append({"lat": t["lat"], "lon": t["lon"], "prov": t["prov"], "kab": t["kab"], "kec": t["kec"],
                        "q": [None if x is None else round(x, 1) for x in q], "qmax": [None if x is None else round(x, 1) for x in qmax],
                        "q2": q2, "q5": q5, "q20": q20, "puncak": puncak,
                        "r2": round(puncak / q2, 2) if puncak and q2 else None, "r5": round(puncak / q5, 2) if puncak and q5 else None,
                        "kelas": kelas(puncak, q2, q5, q20)})
        if a + 100 < len(titik):
            time.sleep(11)
    simpan(os.path.join(KELUAR, "sungai.json"), {"hari": hari, "titik": out})
    return out


def main(harian=False):
    mulai = time.time()
    titik = baca(J_TITIK)
    if titik is None:
        if harian:
            sys.exit("data/raw/banjir/sungai_titik.json belum ada: jalankan sekali tanpa 'harian'")
        titik = langkah_a()
    out = langkah_c(titik, baca(J_AMBANG, {}))
    if not harian:
        langkah_b(titik, int(os.environ.get("SUNGAI_B_TITIK", "6")))
    from collections import Counter
    print(f"sungai.json: {len(out)} titik, {sum(1 for t in out if t['q2'])} berambang, kelas {dict(Counter(t['kelas'] for t in out))}, "
          f"{time.time() - mulai:.0f} dtk", file=sys.stderr)


def uji():
    mx = [80, 90, 100, 110, 120, 95, 105, 85, 115, 100]
    g = gumbel(mx)
    a = statistics.stdev(mx) * math.sqrt(6) / math.pi
    u = 100 - EULER * a
    assert abs(g[2] - (u + 0.36651 * a)) < 1e-3 and abs(g[5] - (u + 1.49994 * a)) < 1e-3 and abs(g[20] - (u + 2.97020 * a)) < 1e-3, g
    assert g[2] < statistics.mean(mx) < g[5] < g[20]  # median Gumbel di bawah rata-rata
    assert gumbel([1, 2, 3]) is None
    waktu = [f"{y}-01-{d:02d}" for y in (2000, 2001) for d in range(1, 32)]
    assert maks_tahunan(waktu, list(range(62)), min_hari=31) == [30, 61]
    assert maks_tahunan(waktu, [None] * 31 + [5] * 31, min_hari=31) == [5]
    assert [kelas(p, 100, 150, 200) for p in (50, 100, 160, 250)] == [0, 1, 2, 3]
    assert kelas(500, None, None, None) is None and kelas(None, 1, 2, 3) is None
    print("ok sungai")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(harian=sys.argv[1:] == ["harian"])
