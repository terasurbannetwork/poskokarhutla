"""Debit sungai GloFAS per kab dari Open-Meteo Flood API (KI-77). Python stdlib saja. Tanpa kunci.

  python3 -I scripts/banjir/debit_glofas.py uji                  swauji tanpa jaringan
  python3 -I scripts/banjir/debit_glofas.py ambil [--maks-bobot N] [--jeda S] [--prioritas kode,kode]
                                                                  reanalisis harian MULAI..kemarin, satu titik sungai per kab, cache
  python3 -I scripts/banjir/debit_glofas.py ringkas              berapa kab layak / tanpa_sungai_besar / belum diambil
  python3 -I scripts/banjir/debit_glofas.py snapshot             ansambel 50 anggota + kontrol hari ini (prospektif; reanalisis tak punya ansambel)

Titik: scripts/banjir/data/titik_glofas_kab.json ({kode kab: [lat, lon]}, dipakai ulang, bukan titik baru). API menempelkan titik ke sungai
terbesar dalam ~5 km; kab yang debit mediannya < MIN_MEDIAN atau mayoritas kosong = `tanpa_sungai_besar` dan TIDAK dipakai.
Reanalisis dimulai MULAI (bukan 1984): di titik uji, nilai sebelum ~1995 kosong dan bobot kuota = hari/14 per titik; MULAI bisa diubah, cache menolak
dicampur rentang beda. Kuota: ~337 bobot per titik, 600/menit, 5.000/jam, 10.000/hari: satu titik per panggilan, jeda 40 dtk, berhenti rapi di 429 jam/hari.
Cache: data/raw/banjir/glofas/<kode>.json (gitignored; pulihkan dari cadangan_beku, jangan unduh buta).

Fitur (semua memakai nilai sampai hari d saja):
  rasio    debit_d / P90 titik itu; P90 dihitung HANYA dari hari <= AKHIR_LATIH (tidak bocor ke uji).
  fase     +1 naik (q_d >= 1,10 q_(d-2)), -1 turun (<= 0,90), 0 datar/puncak.
  frak_ens bagian anggota ansambel (hanya prakiraan, tak ada arsip) yang > P90.
  api_k    API_t = k API_(t-1) + P_t, k = 0,88.   hujan_pers  hujan / persentil lokal kab (dari hari latih).
"""
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(DIR, "../.."))
API = "https://flood-api.open-meteo.com/v1/flood"
TITIK_F = os.path.join(DIR, "data/titik_glofas_kab.json")
CACHE = os.path.join(AKAR, "data/raw/banjir/glofas")
MULAI = dt.date(2014, 1, 1)
AKHIR_LATIH = dt.date(2023, 12, 31)
MIN_MEDIAN, MAKS_KOSONG, MAKS_JARAK_KM = 5.0, 0.5, 5.0
K_API = 0.88
FASE_AMBANG = 0.10
BOBOT_HARI = 14.0       # bobot Open-Meteo ~ hari/14 per titik
UA = "centurisk97-debit-glofas/1"


# ------------------------------------------------------------------ fitur (murni)
def persentil(v, p):
    """Interpolasi linear, nilai None dibuang. Kosong -> None."""
    s = sorted(x for x in v if x is not None)
    if not s:
        return None
    r = (len(s) - 1) * p / 100.0
    a = int(math.floor(r))
    b = min(a + 1, len(s) - 1)
    return s[a] + (s[b] - s[a]) * (r - a)


def p90_latih(q, t0, akhir=AKHIR_LATIH):
    """P90 dari hari <= akhir saja (q = deret harian mulai t0)."""
    n = (akhir - t0).days + 1
    return persentil(q[:max(n, 0)], 90)


def rasio(q, i, p90):
    if i < 0 or i >= len(q) or q[i] is None or not p90:
        return None
    return q[i] / p90


def fase(q, i):
    """+1 naik, -1 turun, 0 datar/puncak; hanya q[i] dan q[i-2] (tanpa masa depan). None bila kosong."""
    if i < 2 or i >= len(q) or q[i] is None or q[i - 2] is None or q[i - 2] <= 0:
        return None
    r = q[i] / q[i - 2]
    return 1 if r >= 1 + FASE_AMBANG else -1 if r <= 1 - FASE_AMBANG else 0


def frak_ens(anggota, p90):
    v = [x for x in anggota if x is not None]
    if not v or not p90:
        return None
    return sum(1 for x in v if x > p90) / len(v)


def api_k(p, k=K_API):
    """Indeks hujan anteseden API_t = k API_(t-1) + P_t, API_-1 = 0 (butuh ~30 hari pemanasan). Hujan None dihitung 0."""
    out, a = [], 0.0
    for x in p:
        a = k * a + (x or 0.0)
        out.append(a)
    return out


def hujan_pers(x, ref):
    """Hujan dibagi persentil lokal kab; ref <= 0 atau None -> None (bukan 0)."""
    return None if x is None or not ref or ref <= 0 else x / ref


def jarak_km(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def layak(rec):
    """-> (bool, alasan). `tanpa_sungai_besar` bila median < MIN_MEDIAN, mayoritas kosong, atau titik tertempel > MAKS_JARAK_KM dari titik tanya."""
    q = rec["q"]
    ada = [x for x in q if x is not None]
    if len(ada) < (1 - MAKS_KOSONG) * len(q):
        return False, "tanpa_sungai_besar"
    if persentil(ada, 50) < MIN_MEDIAN:
        return False, "tanpa_sungai_besar"
    if jarak_km(rec["lat_q"], rec["lon_q"], rec["lat"], rec["lon"]) > MAKS_JARAK_KM:
        return False, "tanpa_sungai_besar"
    return True, "ok"


# ------------------------------------------------------------------ cache
def titik_kab():
    return {k: tuple(v) for k, v in json.load(open(TITIK_F)).items()}


def jalur(kode, cache=None):
    return os.path.join(cache or CACHE, f"{kode}.json")


def baca_rec(kode, cache=None):
    try:
        return json.load(open(jalur(kode, cache)))
    except (OSError, ValueError):
        return None


def tulis_rec(rec, cache=None):
    os.makedirs(cache or CACHE, exist_ok=True)
    p = jalur(rec["kode"], cache)
    with open(p + ".tmp", "w") as f:
        json.dump(rec, f, separators=(",", ":"))
    os.replace(p + ".tmp", p)


def bobot(awal, akhir):
    return max(1, math.ceil(((akhir - awal).days + 1) / BOBOT_HARI))


def deret_dari_respons(d, awal, akhir):
    """Respons satu lokasi -> rec sebagian. Menolak deret yang tak mulai di `awal` atau bolong hari."""
    t = d["daily"]["time"]
    n = (akhir - awal).days + 1
    if len(t) != n or t[0] != awal.isoformat() or t[-1] != akhir.isoformat():
        raise ValueError(f"deret tak utuh: {len(t)} hari {t[:1]}..{t[-1:]}, diminta {n} {awal}..{akhir}")
    return {"lat": d["latitude"], "lon": d["longitude"], "t0": awal.isoformat(), "q": d["daily"]["river_discharge"]}


class Kuota(Exception):
    pass


def panggil(url, jeda_menit=70):
    for coba in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=170) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            b = e.read()[:300]
            if e.code == 429:
                if b"inutely" in b and coba < 3:
                    print(f"429 per menit, tunggu {jeda_menit} dtk", file=sys.stderr)
                    time.sleep(jeda_menit)
                    continue
                raise Kuota(b.decode("utf-8", "replace")) from None
            if e.code >= 500 and coba < 3:
                time.sleep(20 * (coba + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if coba == 3:
                raise
            time.sleep(20 * (coba + 1))


def urutan(titik, prioritas=()):
    """Prioritas dulu (mis. kab bersampel hujan ERA5), sisanya menurut kode. Deterministik."""
    p = [k for k in prioritas if k in titik]
    return p + sorted(k for k in titik if k not in set(p))


def ambil(maks_bobot=4000, jeda=40, prioritas=(), cache=None):
    T = titik_kab()
    akhir = dt.date.today() - dt.timedelta(days=1)
    pakai = n = 0
    for k in urutan(T, prioritas):
        if baca_rec(k, cache):
            continue
        w = bobot(MULAI, akhir)
        if pakai + w > maks_bobot:
            print(f"berhenti: anggaran {maks_bobot} bobot habis ({n} titik)", file=sys.stderr)
            break
        la, lo = T[k]
        try:
            d = panggil(f"{API}?latitude={la}&longitude={lo}&daily=river_discharge&start_date={MULAI}&end_date={akhir}")
            rec = {"kode": k, "lat_q": la, "lon_q": lo, **deret_dari_respons(d, MULAI, akhir), "diambil": str(dt.date.today())}
        except Kuota as e:
            print("429 jam/hari, berhenti bersih:", str(e)[:120], file=sys.stderr)
            return 75
        except (ValueError, KeyError, urllib.error.URLError, urllib.error.HTTPError) as e:
            print("gagal", k, str(e)[:100], file=sys.stderr)
            continue
        tulis_rec(rec, cache)
        pakai += w
        n += 1
        print(n, k, layak(rec)[1], flush=True)
        time.sleep(jeda)
    return 0


def ringkas(cache=None):
    T = titik_kab()
    ok, tanpa, sisa = [], [], []
    for k in T:
        r = baca_rec(k, cache)
        (sisa if r is None else ok if layak(r)[0] else tanpa).append(k)
    return {"titik": len(T), "layak": sorted(ok), "tanpa_sungai_besar": sorted(tanpa), "belum_diambil": len(sisa)}


def snapshot(cache=None, per_panggil=10):
    """Ansambel prakiraan 3 hari (+1 hari lalu) untuk kab layak; simpan data/raw/banjir/glofas/ensemble/<hari>.json (hanya-tambah per hari)."""
    kode = ringkas(cache)["layak"]
    T = titik_kab()
    out = {}
    for a in range(0, len(kode), per_panggil):
        b = kode[a:a + per_panggil]
        url = (f"{API}?latitude={','.join(str(T[k][0]) for k in b)}&longitude={','.join(str(T[k][1]) for k in b)}"
               f"&daily=river_discharge&ensemble=true&past_days=2&forecast_days=3")
        d = panggil(url)
        for k, x in zip(b, d if isinstance(d, list) else [d]):
            m = [v for n, v in sorted(x["daily"].items()) if n.startswith("river_discharge_member")]
            out[k] = {"t": x["daily"]["time"], "kontrol": x["daily"].get("river_discharge"), "anggota": m}
        time.sleep(5)
    p = os.path.join(cache or CACHE, "ensemble", f"{dt.date.today()}.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    if os.path.exists(p):
        sys.exit(f"{p} sudah ada: snapshot hari ini tidak ditimpa")
    json.dump({"diambil": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "kab": out}, open(p, "w"), separators=(",", ":"))
    return len(out)


# ------------------------------------------------------------------ swauji
def uji():
    import tempfile
    # API_k: rekursi tepat, hujan None = 0, k=0 -> hujan hari itu saja, k=1 -> kumulatif
    a = api_k([10, 0, 5, None], 0.5)
    assert a == [10.0, 5.0, 7.5, 3.75], a
    assert api_k([3, 4], 0) == [3.0, 4.0] and api_k([1, 1, 1], 1) == [1.0, 2.0, 3.0]
    # hujan tak bocor ke masa depan: mengubah hujan hari 3 tak mengubah API hari 0..2
    assert api_k([1, 2, 3, 4])[:3] == api_k([1, 2, 3, 400])[:3]
    # persentil: interpolasi, None dibuang, kosong None
    assert persentil([None, 1, 2, 3, 4, 5], 50) == 3 and abs(persentil(list(range(11)), 90) - 9) < 1e-9
    assert persentil([None], 90) is None
    # skala persentil lokal: 2x persentil -> 2.0; ref 0/None -> None (bukan 0)
    assert hujan_pers(50, 25) == 2.0 and hujan_pers(5, 0) is None and hujan_pers(None, 3) is None and hujan_pers(0, 3) == 0.0
    # P90 hanya dari latih: lonjakan sesudah AKHIR_LATIH tak mengubahnya
    t0 = dt.date(2023, 12, 1)
    q = [float(i % 10) for i in range(31)] + [1000.0] * 10          # 1-31 Des 2023 latih, lalu uji
    q2 = q[:31] + [5000.0] * 10
    assert p90_latih(q, t0) == p90_latih(q2, t0) and p90_latih(q, t0) < 10
    assert rasio(q, 40, 9.0) == 1000 / 9 and rasio(q, 99, 9.0) is None and rasio([None], 0, 9.0) is None
    # fase: naik / turun / datar, tak membaca masa depan, kosong None
    s = [10, 10, 12, 10, 8, 8]
    assert fase(s, 2) == 1 and fase(s, 4) == -1 and fase(s, 3) == 0 and fase(s, 1) is None and fase([None, 1, 1], 2) is None
    assert fase(s[:3] + [999], 2) == fase(s, 2), "fase hari d tak boleh melihat hari d+1"
    # fraksi ansambel
    assert frak_ens([1, 2, 3, 4, None], 2.5) == 0.5 and frak_ens([None], 1) is None and frak_ens([1], None) is None
    # bendera tanpa sungai besar: median kecil, mayoritas kosong, titik tertempel jauh
    base = {"lat_q": -6.0, "lon_q": 106.0, "lat": -6.0, "lon": 106.0}
    assert layak({**base, "q": [50.0] * 20}) == (True, "ok")
    assert layak({**base, "q": [1.0] * 20}) == (False, "tanpa_sungai_besar")
    assert layak({**base, "q": [None] * 15 + [90.0] * 5}) == (False, "tanpa_sungai_besar")
    assert layak({**base, "q": [50.0] * 20, "lat": -6.1}) == (False, "tanpa_sungai_besar")      # ~11 km
    # deret respons: utuh diterima, bolong ditolak
    d = {"latitude": 1.0, "longitude": 2.0, "daily": {"time": ["2020-01-01", "2020-01-02"], "river_discharge": [1.0, None]}}
    assert deret_dari_respons(d, dt.date(2020, 1, 1), dt.date(2020, 1, 2))["q"] == [1.0, None]
    try:
        deret_dari_respons(d, dt.date(2019, 12, 31), dt.date(2020, 1, 2))
        raise AssertionError("deret tak utuh harus ditolak")
    except ValueError:
        pass
    # bobot ~ hari/14, prioritas didahulukan, cache bolak-balik
    assert bobot(dt.date(2020, 1, 1), dt.date(2020, 1, 14)) == 1 and bobot(dt.date(2020, 1, 1), dt.date(2020, 1, 15)) == 2
    assert urutan({"b": 1, "a": 1, "c": 1}, ["c", "zz"]) == ["c", "a", "b"]
    with tempfile.TemporaryDirectory() as t:
        r = {"kode": "9999", **base, "t0": "2020-01-01", "q": [1.0]}
        tulis_rec(r, t)
        assert baca_rec("9999", t) == r and baca_rec("0000", t) is None
    # titik nyata dipakai ulang: 514 kab
    assert len(titik_kab()) >= 500
    print("debit_glofas.py uji: ok")


if __name__ == "__main__":
    a = sys.argv[1:]

    def opsi(n, d, tipe=str):
        return tipe(a[a.index(n) + 1]) if n in a else d

    c = a[0] if a else ""
    if c == "uji":
        uji()
    elif c == "ambil":
        sys.exit(ambil(opsi("--maks-bobot", 4000, int), opsi("--jeda", 40, float), tuple(opsi("--prioritas", "").split(",")) if "--prioritas" in a else ()))
    elif c == "ringkas":
        r = ringkas()
        print(json.dumps({**r, "layak": len(r["layak"]), "tanpa_sungai_besar": len(r["tanpa_sungai_besar"])}))
    elif c == "snapshot":
        print("snapshot", snapshot(), "kab")
    else:
        sys.exit(__doc__)
