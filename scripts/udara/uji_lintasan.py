"""Uji balik garis asap (lintasan.py) terhadap angin reanalisis ERA5 -> public/udara/data/uji_lintasan.json

Apa yang diuji : garis asap 24 jam dari kompleks api, lapis 10 m, persis mesin lintasan.jalur (Heun 1 jam, interpolasi kisi 1 derajat/3 jam).
Prakiraan      : angin.json yang BENAR-BENAR terbit, diambil dari riwayat git (satu per jalan udara.yml, 2x sehari), dengan titik awal dari
                 lintasan.json commit yang sama (kompleks teratas menurut FRP). Tanpa API prakiraan masa lalu (kuotanya terpisah dan terbatas).
Kebenaran      : ERA5 10 m (Open-Meteo archive API, models=era5, tanpa kunci), dimasukkan ke kisi dan sumbu waktu yang SAMA dengan angin.json,
                 lalu dijalankan lewat lintasan.jalur yang sama; selisihnya murni galat angin prakiraan, bukan beda integrator.
Pembanding     : angin tetap = ERA5 di kisi pada jam jalan, dibekukan 24 jam (garis lurus). Prakiraan harus lebih baik dari ini.
Skor           : jarak ujung (km) pada jam 6, 12, 24 (median, p75), arah 8 mata angin tepat / meleset <= 1 (hanya bila garis ERA5 bergerak >= 20 km),
                 porsi sampel tempat prakiraan lebih dekat daripada angin tetap, dan selang bootstrap 95% per hari jalan (sampel sehari saling bergantung).
Batas          : hanya lapis 10 m; ERA5 archive Open-Meteo tidak mengirim angin 925/850 hPa (null), jadi dua lapis itu TIDAK teruji dan tidak boleh
                 diberi galat. Titik awal dari kompleks yang sama berurutan antar jalan: n sampel bukan n independen. ERA5T tertinggal ~5 hari.
Kuota          : sel yang dibutuhkan saja (jalur prakiraan +- MARGIN sel), 100 titik per panggilan, jeda 5 dtk, cache data/raw/udara/era5_angin10.json.
Pola           : backtest_smoke_path.py HazeWatch (MIT; galat ujung 6/12/24 jam, arah 8 mata angin, pembanding angin tetap).
Pakai          : python3 scripts/udara/uji_lintasan.py [--maks-jalan 40] [--per-jalan 5] [--tanpa-jaringan]  |  uji
"""
import argparse
import datetime as dt
import json
import math
import os
import random
import statistics
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat
import angin
import lintasan

URL = "https://archive-api.open-meteo.com/v1/archive"
CACHE = os.path.join(alat.RAW, "era5_angin10.json")
HASIL = "uji_lintasan.json"
MARGIN = 3
TICKS = (6, 12, 24)
GERAK_MIN_KM = 20
LAG_ERA5_HARI = 6
BOOT, BENIH = 1000, 20261124
N_MIN = 30
ARAH = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"]


# ---------- geometri ----------
def km(a, b):
    return alat.jarak_km(a[1], a[0], b[1], b[0])


def arah8(a, b):
    """Mata angin 0..7 (U, TL, T, TG, S, BD, B, BL) dari a=(lon, lat) ke b."""
    la1, la2, dlo = math.radians(a[1]), math.radians(b[1]), math.radians(b[0] - a[0])
    y = math.sin(dlo) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(dlo)
    return round(((math.degrees(math.atan2(y, x)) + 360) % 360) / 45) % 8


def beda_arah(p, q):
    d = abs(p - q) % 8
    return min(d, 8 - d)


# ---------- kisi ERA5 ----------
def kunci(la, lo):
    return f"{la},{lo}"


def sel_butuh(jalur_titik, margin=MARGIN):
    """[[lon, lat, jam]] -> set (lat, lon) sel kisi 1 derajat dalam `margin` sel dari titik jalur."""
    out = set()
    for lon, lat, _ in jalur_titik:
        for dla in range(-margin, margin + 1):
            for dlo in range(-margin, margin + 1):
                la, lo = math.floor(lat) + dla, math.floor(lon) + dlo
                if angin.LAT[0] <= la <= angin.LAT[-1] and angin.LON[0] <= lo <= angin.LON[-1]:
                    out.add((la, lo))
    return out


def unduh_era5(sel, mulai, akhir, cache, ambil=alat.ambil, jeda=5):
    """Isi cache {kunci: {jam ISO 'YYYY-MM-DDTHH:00': [u, v] dm/s}} untuk sel yang belum punya seluruh rentang. Mengembalikan jumlah sel diunduh."""
    perlu = sorted(s for s in sel if kunci(*s) not in cache or cache[kunci(*s)].get("_akhir", "") < akhir)
    for a in range(0, len(perlu), 100):
        b = perlu[a:a + 100]
        d = ambil(f"{URL}?latitude={','.join(str(x[0]) for x in b)}&longitude={','.join(str(x[1]) for x in b)}&start_date={mulai}&end_date={akhir}"
                  f"&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=GMT&models=era5")
        for (la, lo), x in zip(b, d if isinstance(d, list) else [d]):
            h = x["hourly"]
            c = cache.setdefault(kunci(la, lo), {})
            for t, sp, dr in zip(h["time"], h["wind_speed_10m"], h["wind_direction_10m"]):
                u, v = angin.uv(sp, dr)
                if u is not None:
                    c[t] = [u, v]
            c["_akhir"] = akhir
        time.sleep(jeda)
    return len(perlu)


def era5_ke_kisi(A, cache, tetap=False):
    """Kisi angin.json satu lapis (10m) berisi ERA5 pada sumbu waktu A; tetap=True membekukan bingkai pertama."""
    jam = [alat.dari_iso(j).strftime("%Y-%m-%dT%H:00") for j in A["jam"]]
    u = [[[None] * len(A["lon"]) for _ in A["lat"]] for _ in jam]
    v = [[[None] * len(A["lon"]) for _ in A["lat"]] for _ in jam]
    for j, la in enumerate(A["lat"]):
        for i, lo in enumerate(A["lon"]):
            c = cache.get(kunci(la, lo))
            if not c:
                continue
            for t, kt in enumerate(jam):
                x = c.get(jam[0] if tetap else kt)
                if x:
                    u[t][j][i], v[t][j][i] = x
    return {"jam": A["jam"], "lapis": ["10m"], "lat": A["lat"], "lon": A["lon"], "u": [u], "v": [v]}


# ---------- sampel dari riwayat git ----------
def git_json(h, jalur):
    r = subprocess.run(["git", "-C", alat.AKAR, "show", f"{h}:{jalur}"], capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout else None


def daftar_jalan(maks, per_jalan, lag=LAG_ERA5_HARI, sekarang=None):
    """[(commit, A, mulai ISO, [(lon, lat, frp)])] dari riwayat git, hanya jalan yang 24 jam-nya sudah lewat lag ERA5; dibatasi merata ke `maks`."""
    sekarang = sekarang or dt.datetime.now(dt.timezone.utc)
    log = subprocess.run(["git", "-C", alat.AKAR, "log", "--format=%H", "--", "public/udara/data/angin.json"], capture_output=True, text=True).stdout.split()
    out = []
    for h in log:
        L = git_json(h, "public/udara/data/lintasan.json")
        if not L or not L.get("kompleks") or not L.get("mulai"):
            continue
        t = alat.dari_iso(L["mulai"])
        if t + dt.timedelta(hours=24 + 24 * lag) > sekarang:
            continue
        A = git_json(h, "public/udara/data/angin.json")
        if not A or A.get("lat") != angin.LAT or A.get("lon") != angin.LON:
            continue
        top = sorted(L["kompleks"], key=lambda k: -k["frp"])[:per_jalan]
        out.append((h, A, L["mulai"], [(k["lon"], k["lat"], k["frp"]) for k in top]))
    out.sort(key=lambda x: x[2])
    if len(out) > maks:
        langkah = (len(out) - 1) / (maks - 1) if maks > 1 else 0
        out = [out[round(i * langkah)] for i in range(maks)]
    return out


# ---------- skor ----------
def jalur24(A, t, lon, lat):
    jam0 = (t - alat.dari_iso(A["jam"][0])).total_seconds() / 3600
    p, _ = lintasan.jalur(A, 0, lon, lat, jam0)
    return p[:25] if len(p) >= 25 else None


def satu_sampel(A_fc, A_era, A_tetap, mulai, lon, lat):
    """-> dict galat, atau alasan string bila ada garis yang terputus."""
    t = alat.dari_iso(mulai)
    kebenaran, fc, tp = jalur24(A_era, t, lon, lat), jalur24(A_fc, t, lon, lat), jalur24(A_tetap, t, lon, lat)
    if kebenaran is None:
        return "era5_putus"
    if fc is None or tp is None:
        return "prakiraan_putus"
    P = lambda p, h: (p[h][0], p[h][1])
    r = {"gerak": km(P(kebenaran, 0), P(kebenaran, 24))}
    for h in TICKS:
        r[f"fc{h}"], r[f"tp{h}"] = km(P(fc, h), P(kebenaran, h)), km(P(tp, h), P(kebenaran, h))
    r["a_kebenaran"] = arah8(P(kebenaran, 0), P(kebenaran, 24))
    r["a_fc"], r["a_tp"] = arah8(P(fc, 0), P(fc, 24)), arah8(P(tp, 0), P(tp, 24))
    return r


def ringkas(sampel):
    """sampel [{hari, ...}] -> ringkasan per metode."""
    n = len(sampel)
    med = lambda k, ss=sampel: round(statistics.median(s[k] for s in ss), 1)
    p75 = lambda k: round(sorted(s[k] for s in sampel)[int(.75 * (n - 1))], 1)
    out = {"n": n, "n_hari_jalan": len({s["hari"] for s in sampel}),
           "gerak_ERA5_24j_km_median": med("gerak")}
    for nm, p in (("prakiraan", "fc"), ("angin_tetap", "tp")):
        out[nm] = {f"galat_{h}j_km": {"median": med(f"{p}{h}"), "p75": p75(f"{p}{h}")} for h in TICKS}
    gerak = [s for s in sampel if s["gerak"] >= GERAK_MIN_KM]
    for nm, p in (("prakiraan", "a_fc"), ("angin_tetap", "a_tp")):
        d = [beda_arah(s[p], s["a_kebenaran"]) for s in gerak]
        out[nm]["arah_n"] = len(d)
        out[nm]["arah_tepat"] = round(sum(x == 0 for x in d) / len(d), 3) if d else None
        out[nm]["arah_meleset_paling_banyak_1"] = round(sum(x <= 1 for x in d) / len(d), 3) if d else None
    out["porsi_prakiraan_lebih_dekat_24j"] = round(sum(s["fc24"] < s["tp24"] for s in sampel) / n, 3)
    # selang bootstrap per hari jalan untuk selisih median galat 24 jam (prakiraan - angin tetap); negatif = prakiraan lebih baik
    per = {}
    for s in sampel:
        per.setdefault(s["hari"], []).append(s)
    hari, rng, diff = sorted(per), random.Random(BENIH), []
    for _ in range(BOOT):
        ss = [s for h in (rng.choice(hari) for _ in hari) for s in per[h]]
        diff.append(statistics.median(s["fc24"] for s in ss) - statistics.median(s["tp24"] for s in ss))
    diff.sort()
    d0 = out["prakiraan"]["galat_24j_km"]["median"] - out["angin_tetap"]["galat_24j_km"]["median"]
    out["selisih_median_24j_km"] = {"nilai": round(d0, 1), "ci95": [round(diff[int(.025 * (BOOT - 1))], 1), round(diff[int(.975 * (BOOT - 1))], 1)],
                                    "metode": f"bootstrap per hari jalan, {BOOT} ulangan, benih {BENIH}"}
    ci_hi = out["selisih_median_24j_km"]["ci95"][1]
    out["vonis"] = ("prakiraan_lebih_baik_dari_angin_tetap" if ci_hi < 0
                    else "prakiraan_KALAH_dari_angin_tetap" if out["selisih_median_24j_km"]["ci95"][0] > 0
                    else "belum_dapat_dibedakan")
    if n < N_MIN:
        out["peringatan"] = f"n {n} < {N_MIN}: angka belum boleh tampil"
    return out


def jalankan(maks, per_jalan, jaringan=True):
    jl = daftar_jalan(maks, per_jalan)
    if not jl:
        raise SystemExit("tidak ada jalan dari riwayat git yang sudah melewati lag ERA5")
    # sel yang dibutuhkan: jalur prakiraan masing-masing sampel
    sel = set()
    for _, A, mulai, kompleks in jl:
        t = alat.dari_iso(mulai)
        for lon, lat, _ in kompleks:
            p = jalur24(A, t, lon, lat)
            if p:
                sel |= sel_butuh(p)
    mulai_d = min(alat.dari_iso(x[2]) for x in jl).date().isoformat()
    akhir_d = (max(alat.dari_iso(x[2]) for x in jl) + dt.timedelta(days=2)).date().isoformat()
    cache = alat.muat(CACHE, {})
    baru = unduh_era5(sel, mulai_d, akhir_d, cache) if jaringan else 0
    if baru:
        alat.simpan(CACHE, cache)
    sampel, buang = [], {}
    for h, A, mulai, kompleks in jl:
        A_era, A_tp = era5_ke_kisi(A, cache), era5_ke_kisi(A, cache, tetap=True)
        A_fc = dict(A, lapis=["10m"], u=[A["u"][0]], v=[A["v"][0]])
        for lon, lat, frp in kompleks:
            r = satu_sampel(A_fc, A_era, A_tp, mulai, lon, lat)
            if isinstance(r, str):
                buang[r] = buang.get(r, 0) + 1
            else:
                sampel.append(dict(r, hari=mulai[:10]))
    if not sampel:
        raise SystemExit(f"tidak ada sampel yang bisa dinilai; dibuang {buang}")
    out = {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "lapis": "10m",
           "lapis_tak_teruji": ["925hPa", "850hPa"], "alasan_tak_teruji": "ERA5 archive Open-Meteo tidak mengirim angin tekanan (null)",
           "kebenaran": "ERA5 10 m (Open-Meteo archive, models=era5)", "prakiraan": "angin.json terbit, dari riwayat git",
           "periode_jalan": [min(s["hari"] for s in sampel), max(s["hari"] for s in sampel)], "n_jalan": len(jl),
           "dibuang": buang, "sel_era5": len(sel), "hasil": ringkas(sampel),
           "catatan": "sampel berurutan dari kompleks yang sama bukan independen; selang dihitung per hari jalan"}
    alat.simpan(HASIL, out)
    h = out["hasil"]
    alat.log(f"uji_lintasan: n={h['n']} ({h['n_hari_jalan']} hari), galat 24 j median prakiraan {h['prakiraan']['galat_24j_km']['median']} km "
             f"vs angin tetap {h['angin_tetap']['galat_24j_km']['median']} km, vonis {h['vonis']}; dibuang {buang}")
    return out


# ---------- self-check ----------
def kisi_seragam(u, v, jam0="2026-11-01T00:00Z", n=25):
    lat, lon = angin.LAT, angin.LON
    g = lambda c: [[[[c] * len(lon) for _ in lat] for _ in range(n)]]
    jam = [alat.iso(alat.dari_iso(jam0) + dt.timedelta(hours=3 * k)) for k in range(n)]
    return {"jam": jam, "lapis": ["10m"], "lat": lat, "lon": lon, "u": g(u), "v": g(v)}


def uji():
    assert arah8((100, 0), (101, 0)) == 2 and arah8((100, 0), (100, 1)) == 0 and arah8((100, 0), (99, -1)) == 5
    assert [beda_arah(a, b) for a, b in ((0, 7), (0, 4), (2, 3), (1, 1))] == [1, 4, 1, 0]
    assert abs(km((100, 0), (101, 0)) - 111.2) < .3
    sel = sel_butuh([[100.4, -2.6, 0]], margin=1)
    assert sel == {(la, lo) for la in (-4, -3, -2) for lo in (99, 100, 101)}, sel
    assert sel_butuh([[200, 0, 0]]) == set()   # di luar kisi
    t = "2026-11-01T00:00Z"
    fc, era, tp = kisi_seragam(50, 0), kisi_seragam(50, 0), kisi_seragam(50, 0)   # 5 m/s ke timur, semuanya sama
    r = satu_sampel(fc, era, tp, t, 100.0, 0.0)
    assert r["fc24"] < .5 and r["tp24"] < .5 and abs(r["gerak"] - 5 * 86.4) < 5 and r["a_kebenaran"] == 2, r
    # prakiraan angin 7 m/s, ERA5 5 m/s -> ujung 24 jam meleset 2 m/s x 86400 s = 172,8 km; angin tetap = ERA5 -> 0
    r = satu_sampel(kisi_seragam(70, 0), era, tp, t, 100.0, 0.0)
    assert abs(r["fc24"] - 172.8) < 3 and abs(r["fc12"] - 86.4) < 2 and r["tp24"] < .5, r
    # arah: prakiraan ke utara-timur laut, ERA5 ke timur -> meleset 2 mata angin
    r = satu_sampel(kisi_seragam(50, 50), era, tp, t, 100.0, 0.0)
    assert r["a_fc"] == 1 and beda_arah(r["a_fc"], r["a_kebenaran"]) == 1
    # ERA5 hilang di sebagian kisi -> garis kebenaran terputus, bukan galat nol
    putus = kisi_seragam(50, 0)
    for k in range(25):
        putus["u"][0][k][11][8] = None   # lat 0, lon 103: dilewati garis ke timur
    assert satu_sampel(fc, putus, tp, t, 100.0, 0.0) == "era5_putus"
    # ERA5 -> kisi: sumbu waktu ikut A, bingkai tetap membekukan jam pertama
    A = kisi_seragam(0, 0)
    cache = {kunci(la, lo): {(alat.dari_iso(A["jam"][0]) + dt.timedelta(hours=k)).strftime("%Y-%m-%dT%H:00"): [k, -k] for k in range(80)}
             for la in angin.LAT for lo in angin.LON}
    E = era5_ke_kisi(A, cache)
    assert E["u"][0][0][0][0] == 0 and E["u"][0][8][0][0] == 24 and E["v"][0][8][0][0] == -24
    assert all(E2 == 0 for E2 in [era5_ke_kisi(A, cache, tetap=True)["u"][0][t][3][3] for t in range(25)])
    # unduhan: sel yang sudah punya rentang tidak diunduh lagi; respons tunggal dan daftar sama-sama diurai; angin 0/None aman
    panggilan = []

    def palsu(url, **kw):
        panggilan.append(url)
        h = {"time": ["2026-11-01T00:00", "2026-11-01T01:00"], "wind_speed_10m": [5.0, None], "wind_direction_10m": [270, None]}
        return [{"hourly": h}, {"hourly": h}]
    c = {}
    assert unduh_era5({(0, 100), (1, 100)}, "2026-11-01", "2026-11-02", c, ambil=palsu, jeda=0) == 2 and len(panggilan) == 1
    assert c["0,100"]["2026-11-01T00:00"] == [50, 0] and "2026-11-01T01:00" not in c["0,100"]
    assert unduh_era5({(0, 100)}, "2026-11-01", "2026-11-02", c, ambil=palsu, jeda=0) == 0 and len(panggilan) == 1
    # ringkasan: prakiraan selalu lebih baik -> vonis lebih baik; sama persis -> belum dapat dibedakan; dan n kecil diberi peringatan
    def s(h, fc, tp):
        return {"hari": h, "gerak": 100, "a_kebenaran": 2, "a_fc": 2, "a_tp": 3, "fc6": fc / 4, "fc12": fc / 2, "fc24": fc, "tp6": tp / 4, "tp12": tp / 2, "tp24": tp}
    bagus = ringkas([s(f"2026-11-{d:02d}", 50 + d, 150 + d) for d in range(1, 21) for _ in range(2)])
    assert bagus["vonis"] == "prakiraan_lebih_baik_dari_angin_tetap" and bagus["porsi_prakiraan_lebih_dekat_24j"] == 1.0
    assert bagus["prakiraan"]["arah_tepat"] == 1.0 and bagus["angin_tetap"]["arah_tepat"] == 0.0 and bagus["angin_tetap"]["arah_meleset_paling_banyak_1"] == 1.0
    kalah = ringkas([s(f"2026-11-{d:02d}", 150 + d, 50 + d) for d in range(1, 21) for _ in range(2)])
    assert kalah["vonis"] == "prakiraan_KALAH_dari_angin_tetap" and "peringatan" not in kalah
    sama = ringkas([s("2026-11-01", 100, 100)])
    assert sama["vonis"] == "belum_dapat_dibedakan" and "peringatan" in sama
    print("uji_lintasan uji: lulus")


if __name__ == "__main__":
    uji()
    ap = argparse.ArgumentParser()
    ap.add_argument("perintah", nargs="?")
    ap.add_argument("--maks-jalan", type=int, default=40)
    ap.add_argument("--per-jalan", type=int, default=5)
    ap.add_argument("--tanpa-jaringan", action="store_true", help="pakai cache ERA5 apa adanya")
    a = ap.parse_args()
    if a.perintah != "uji":
        jalankan(a.maks_jalan, a.per_jalan, jaringan=not a.tanpa_jaringan)
