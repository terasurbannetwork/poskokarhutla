"""Uji balik status taktis karhutla 4 tingkat (aturan.py) -> public/data/ujibalik_status.json (KI-27).

PROTOKOL (ditulis SEBELUM menghitung skor apa pun; angka ada di ujibalik_status.kriteria.json dan ikut disidik):
 1. Unit = kab-hari (semua kab/kota di public/geo/kecamatan). Ramalan = level status pada hari d: maksimum level kluster
    aktif (<= 72 jam) di kab itu, dihitung seperti produksi dari data sampai 23.59 WIB hari d: keparahan() x kelas FWI ->
    status(), naik ke 3 lewat prioritas() bila teramati, lalu gerbang_firespot() ("mungkin" dibatasi level 1). Fungsi
    dipakai ulang dari aturan.py dan harian.py (dbscan, firespot, pix, gerbang_firespot), tidak ditulis ulang.
    Tingkat yang diuji: >= Waspada (level 1), >= Siaga (level 2), Awas (level 3).
 2. Label y(d+1) = ada >= 1 kluster berpola firespot "ya" (harian.firespot) di kab itu dengan deteksi terakhir tepat di hari
    d+1. Dari FIRMS saja, tak bergantung pelaporan. Catatan jujur: status memakai firespot hari d sebagai gerbang, label
    memakai firespot hari d+1, jadi persistensi condong kuat; itu sebabnya ia ditetapkan sebagai pembanding.
 3. Pembanding (scripts/umum/pembanding.py): persistensi (y hari d), klimatologi kab x bulan dari tahun latih. Jumlah alarm
    pembanding disamakan dengan model (samakan_alarm; imbang skor dipecah jitter berbenih tetap, penyamaan memakai
    peringkat teratas yang diverifikasi setara samakan_alarm di `uji`, karena samakan_alarm O(n x alarm) terlalu lambat
    untuk ratusan ribu kab-hari). Persistensi asli (tanpa disamakan) juga dihitung. Pembanding terbaik = ETS tertinggi di
    himpunan uji dari ketiganya.
 4. Pemisahan: latih (hanya klimatologi) 2019-01-01..2022-12-31, uji 2023-01-01..2025-12-31 (hari target sampai 2026-01-01).
    Sensor = S-NPP + NOAA-20 untuk SEMUA tahun (NOAA-21 baru ada 2023: dibuang agar laju label latih dan uji sebanding;
    produksi memakai tiga satelit). Titik: keyakinan n/h, type 0, tanpa gunung api (sama dengan ujibalik_firespot.py).
 5. Cuaca: arsip tidak punya FWI Open-Meteo operasional. Dipakai FWI harian MERRA-2 (risiko_mingguan.deret_cuaca, array
    data/raw/risiko/cuaca_harian.npz, sel 0,5 derajat terdekat, maks ring 1). Tanpa sel/tanggal -> cuaca None seperti
    produksi. Penyimpangan lain yang diakui: gambut kering 168 jam tidak dimodelkan (butuh peta gambut dan DC),
    jam cuaca = harian bukan siang jam 12.
 6. Vonis per tingkat, ETS(status) - ETS(pembanding terbaik), CI95 bootstrap blok berpasangan (blok = provinsi x minggu ISO
    hari target, B 300, benih 7): LULUS bila batas bawah > 0; TIDAK LULUS bila selisih <= 0; selain itu TIDAK MEYAKINKAN;
    TAK TERUKUR bila alarm model < 20 atau positif < 20.
 7. Kunci: `kunci` menulis ujibalik_status.sidik (kode + kriteria + hash masukan) SEBELUM evaluasi dibuka; `jalan` membuka
    sekali (penanda ujibalik_status.buka, O_EXCL) dan menolak bila kode berubah (kode keluar 3). `panen` menghitung level
    dan label harian dari FIRMS+cuaca ke data/raw/ujibalik_status/<tahun>.json tanpa skor apa pun.

Pakai (dari akar repo):
  python3 -I scripts/data/ujibalik_status.py uji       self-check tanpa berkas besar
  python3 scripts/data/ujibalik_status.py panen        butuh data/raw/firms/viirs*.csv dan cuaca_harian.npz (numpy, hanya di sini)
  python3 scripts/data/ujibalik_status.py coba         jalan percobaan pada tahun LATIH saja (2019-2020 latih, 2021-2022 uji), tidak ditulis
  python3 scripts/data/ujibalik_status.py kunci        tulis sidik
  python3 scripts/data/ujibalik_status.py jalan        buka sekali, tulis public/data/ujibalik_status.json
"""
import bisect
import csv
import datetime as dt
import hashlib
import json
import math
import multiprocessing as mp
import os
import random
import sys
import tempfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import aturan as A  # noqa: E402
import harian as H  # noqa: E402
import pembanding as PB  # noqa: E402
import sidik as SD  # noqa: E402

UTC = dt.timezone.utc
WIB = H.WIB
CACHE = os.path.join(AKAR, "data/raw/ujibalik_status")
SIDIK = "scripts/data/ujibalik_status.sidik"
BUKA = "scripts/data/ujibalik_status.buka"
JEJAK = "scripts/data/ujibalik_status.jejak.jsonl"
KRITERIA = "scripts/data/ujibalik_status.kriteria.json"
KELUAR = "public/data/ujibalik_status.json"
KODE = ["scripts/data/ujibalik_status.py", "scripts/data/aturan.py", "scripts/data/harian.py", "scripts/data/titik_unik.py",
        "scripts/data/wilayah.py", "scripts/umum/pembanding.py", "scripts/umum/sidik.py"]
CSV = [("N", "data/raw/firms/viirs.csv"), ("N20", "data/raw/firms/viirs_noaa20.csv")]
NPZ = "data/raw/risiko/cuaca_harian.npz"
TINGKAT = {"Waspada": 1, "Siaga": 2, "Awas": 3}
PANEN = (dt.date(2019, 1, 1), dt.date(2026, 1, 1))
LATIH = (dt.date(2019, 1, 1), dt.date(2022, 12, 31))
UJI = (dt.date(2023, 1, 1), dt.date(2025, 12, 31))
HARI0_CUACA = dt.date(2012, 1, 1)


# ---------------------------------------------------------------- inti per kluster (dipakai panen dan self-check)
def tingkat_kluster(pts, kini, fwi):
    """pts = titik satu kluster (dict lat, lon, t, c, px); kini = jam beku (aware); fwi float|None.
    -> (level akhir 0-3, teramati, firespot 'ya'|'mungkin', deteksi terakhir jatuh di hari kini) atau None bila tak aktif."""
    hari_akhir = H.tgl(kini)
    terakhir = max(p["t"] for p in pts)
    if terakhir < kini - dt.timedelta(hours=H.AKTIF_JAM):
        return None
    teramati = (kini - terakhir).total_seconds() / 3600 <= 24
    hari = {H.tgl(p["t"]) for p in pts}
    n_ini = sum(1 for p in pts if H.tgl(p["t"]) == hari_akhir)
    n_kmrn = sum(1 for p in pts if H.tgl(p["t"]) == hari_akhir - dt.timedelta(days=1))
    t24 = kini - dt.timedelta(hours=24)
    px24 = len({H.pix(p) for p in pts if p["t"] >= t24})
    sev = A.keparahan(len(pts), len(hari), n_ini, n_kmrn, px24)
    fdrs = A.kelas_fwi(fwi) if fwi is not None else None
    _, fs = H.firespot(pts)
    q = {"level": A.status(fdrs, sev), "status": "", "teramati": teramati, "firespot": fs}
    if q["level"] == 2 and teramati and A.prioritas(px24, fwi):
        q["level"] = 3
    H.gerbang_firespot(q)
    return q["level"], teramati, fs, max(hari) == hari_akhir


# ---------------------------------------------------------------- panen: FIRMS + cuaca -> level/label harian
_G = {}


def muat_titik():
    """-> (ts[], titik[(lat, lon, ts, px, c)]) terurut waktu, S-NPP + NOAA-20, 2018-12-20..2026-01-02."""
    hasil = []
    for sen, jalur in CSV:
        with open(os.path.join(AKAR, jalur)) as f:
            r = csv.reader(f)
            h = {k: i for i, k in enumerate(next(r))}
            for x in r:
                d = x[h["acq_date"]]
                if not ("2018-12-20" <= d <= "2026-01-02") or x[h["confidence"]] not in ("n", "h") or x[h["type"]] != "0":
                    continue
                la, lo = float(x[h["latitude"]]), float(x[h["longitude"]])
                if A.gunung_api(la, lo):
                    continue
                j = x[h["acq_time"]].zfill(4)
                t = dt.datetime.fromisoformat(f"{d}T{j[:2]}:{j[2:]}:00+00:00").timestamp()
                hasil.append((t, la, lo, max(float(x[h["scan"]]), float(x[h["track"]])), 2 if x[h["confidence"]] == "h" else 1))
    hasil.sort()
    return [x[0] for x in hasil], hasil


def muat_fwi():
    import numpy as np  # hanya untuk membaca npz arsip (bukan jalur Actions)
    z = np.load(os.path.join(AKAR, NPZ))
    sel = {tuple(int(v) for v in k): i for i, k in enumerate(z["kunci"])}
    return sel, np.ascontiguousarray(z["W"][:, :, 7])  # CUACA_F[7] = "fwi"


def fwi_di(lat, lon, hari):
    sel, F = _G["fwi"]
    di = (hari - HARI0_CUACA).days
    if di < 0 or di >= F.shape[1]:
        return None
    iy, ix = int((6.5 - lat) / .5), int((lon - 94.5) / .5)
    best, bd = None, 1e9
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            i = sel.get((iy + dy, ix + dx))
            if i is not None:
                d2 = (6.5 - (iy + dy + .5) * .5 - lat) ** 2 + (94.5 + (ix + dx + .5) * .5 - lon) ** 2
                if d2 < bd:
                    best, bd = i, d2
    if best is None:
        return None
    v = float(F[best, di])
    return None if v != v else v


def rekam_hari(iso):
    """Satu hari d (ISO) -> {"k": {"prov|kab": [level maks, ada firespot ya hari d]}, "c": [kluster aktif, tanpa cuaca]}."""
    d = dt.date.fromisoformat(iso)
    kini = dt.datetime(d.year, d.month, d.day, 23, 59, tzinfo=WIB)
    TS, P = _G["ts"], _G["pts"]
    t1 = kini.timestamp()
    if bisect.bisect_right(TS, t1) <= bisect.bisect_left(TS, (kini - dt.timedelta(hours=H.AKTIF_JAM)).timestamp()):
        return iso, {"k": {}, "c": [0, 0]}
    i0, i1 = bisect.bisect_left(TS, (kini - dt.timedelta(days=H.JENDELA_HARI)).timestamp()), bisect.bisect_right(TS, t1)
    pts = [{"lat": la, "lon": lo, "t": dt.datetime.fromtimestamp(t, UTC), "px": px, "c": c} for t, la, lo, px, c in P[i0:i1]]
    label, _ = H.dbscan(pts)
    kl = {}
    for p, l in zip(pts, label):
        kl.setdefault(l, []).append(p)
    out, n, tanpa = {}, 0, 0
    for ps in kl.values():
        if max(p["t"] for p in ps) < kini - dt.timedelta(hours=H.AKTIF_JAM):
            continue
        la = sum(p["lat"] for p in ps) / len(ps)
        lo = sum(p["lon"] for p in ps) / len(ps)
        adm = _G["w"].cari(lo, la)
        if not adm:
            continue
        fw = fwi_di(la, lo, d)
        r = tingkat_kluster(ps, kini, fw)
        n += 1
        tanpa += fw is None
        k = f"{adm[0]}|{adm[1]}"
        o = out.setdefault(k, [0, 0])
        o[0] = max(o[0], r[0])
        o[1] = o[1] or int(r[2] == "ya" and r[3])
    return iso, {"k": out, "c": [n, tanpa]}


def panen():
    from wilayah import Wilayah
    os.makedirs(CACHE, exist_ok=True)
    _G["w"] = Wilayah()
    _G["fwi"] = muat_fwi()
    _G["ts"], _G["pts"] = muat_titik()
    print(f"{len(_G['pts'])} titik", file=sys.stderr, flush=True)
    ctx = mp.get_context("fork")
    for th in range(PANEN[0].year, PANEN[1].year + 1):
        jalur = os.path.join(CACHE, f"{th}.json")
        if os.path.exists(jalur):
            continue
        a, b = max(PANEN[0], dt.date(th, 1, 1)), min(PANEN[1], dt.date(th, 12, 31))
        hari = [(a + dt.timedelta(days=i)).isoformat() for i in range((b - a).days + 1)]
        with ctx.Pool(5) as pool:
            res = dict(pool.imap_unordered(rekam_hari, hari, chunksize=1))
        tmp = jalur + ".tmp"
        json.dump({k: res[k] for k in sorted(res)}, open(tmp, "w"), separators=(",", ":"))
        os.replace(tmp, jalur)
        print(f"{th} selesai ({len(hari)} hari)", file=sys.stderr, flush=True)


def muat_rekam(tahun):
    rek = {}
    for th in tahun:
        jalur = os.path.join(CACHE, f"{th}.json")
        if not os.path.exists(jalur):
            sys.exit(f"{jalur} tidak ada: jalankan `panen` dulu")
        for k, v in json.load(open(jalur)).items():
            rek[k] = v
    return rek


# ---------------------------------------------------------------- skor
def ets_hitung(tp, fp, fn, tn):
    n = tp + fp + fn + tn
    if n == 0:
        return None
    hr = (tp + fn) * (tp + fp) / n
    d = tp + fp + fn - hr
    return None if d == 0 else (tp - hr) / d


def samakan_cepat(na, skor):
    """Alarm = `na` skor teratas (skor sudah tak imbang). Setara PB.samakan_alarm saat skor berbeda semua."""
    idx = sorted(range(len(skor)), key=skor.__getitem__, reverse=True)[:na]
    a = [False] * len(skor)
    for i in idx:
        a[i] = True
    return a


def vonis(est, lo, n_alarm, n_pos, kr):
    if n_alarm < kr["min_alarm"] or n_pos < kr["min_positif"] or est is None or lo is None:
        return "TAK TERUKUR"
    return "TIDAK LULUS" if est <= 0 else "LULUS" if lo > 0 else "TIDAK MEYAKINKAN"


def hitung_blok(alarm, y, blok):
    out = {}
    for a, o, b in zip(alarm, y, blok):
        c = out.setdefault(b, [0, 0, 0, 0])
        c[(0 if o else 1) if a else (2 if o else 3)] += 1
    return out


def evaluasi(rek, kabs, latih, uji, kr):
    """rek = {iso: {"k": {kab: [level, y]}}}. Hari prediksi d, label hari d+1. -> dict hasil per tingkat."""
    sehari = dt.timedelta(days=1)

    def hari(r):
        return [r[0] + dt.timedelta(days=i) for i in range((r[1] - r[0]).days + 1)]

    def lv_y(d, kab):
        return rek.get(d.isoformat(), {"k": {}})["k"].get(kab, (0, 0))

    def gen(rentang):
        for d in hari(rentang):
            for kab in kabs:
                yield {"unit": kab, "bulan": (d + sehari).month, "y": lv_y(d + sehari, kab)[1]}
    hu = hari(uji)
    lv, yd, y, blok, seri = [], [], [], [], {}
    for d in hu:
        iy = (d + sehari).isocalendar()
        for kab in kabs:
            a = lv_y(d, kab)
            lv.append(a[0])
            yd.append(a[1])
            y.append(lv_y(d + sehari, kab)[1])
            blok.append((kab.split("|")[0], iy[0], iy[1]))
            seri.setdefault(kab, {})[(d - dt.date(2000, 1, 1)).days] = a[1]
    n = len(y)
    pers = PB.persistensi(seri, 1)
    pp = [pers[(kab, (d - dt.date(2000, 1, 1)).days + 1)] for d in hu for kab in kabs]
    assert pp == yd, "persistensi tidak sejajar dengan label hari d"
    klim = PB.klimatologi(gen(latih), gen(uji))
    rnd = random.Random(kr["bootstrap"]["seed"])
    jit = [rnd.random() * 1e-9 for _ in range(n)]
    sp = [a + j for a, j in zip(pp, jit)]
    sk = [a + j for a, j in zip(klim, jit)]
    n_pos = sum(y)
    out = {"n_kab": len(kabs), "n_hari_uji": len(hu), "n_unit_hari": n, "positif": n_pos,
           "laju_label": round(n_pos / n, 5) if n else None, "tingkat": {}}
    for nama, ambang in TINGKAT.items():
        am = [v >= ambang for v in lv]
        na = sum(am)
        cand = {"persistensi_asli": [bool(v) for v in pp], "persistensi_disamakan": samakan_cepat(na, sp),
                "klimatologi_disamakan": samakan_cepat(na, sk)}
        km = PB.kontingensi(am, y)
        ets_b = {k: PB.kontingensi(a, y)["ets"] for k, a in cand.items()}
        terbaik = max(ets_b, key=lambda k: -1e9 if ets_b[k] is None else ets_b[k])
        bm, bb = hitung_blok(am, y, blok), hitung_blok(cand[terbaik], y, blok)
        rows = [{"b": b, "m": bm[b], "p": bb[b]} for b in bm]
        e = ets_hitung(km["tp"], km["fp"], km["fn"], km["tn"])
        assert (e is None and km["ets"] is None) or abs(e - km["ets"]) < 1e-9, (e, km["ets"])

        def fn(rs):
            m = [sum(r["m"][i] for r in rs) for i in range(4)]
            p = [sum(r["p"][i] for r in rs) for i in range(4)]
            a, b = ets_hitung(*m), ets_hitung(*p)
            return None if a is None or b is None else a - b
        try:
            ci = PB.bootstrap_blok(fn, rows, "b", B=kr["bootstrap"]["B"], seed=kr["bootstrap"]["seed"])
        except ValueError as ex:
            ci = {"est": fn(rows), "lo": None, "hi": None, "B": kr["bootstrap"]["B"], "n_blok": len(rows), "galat": str(ex)}
        out["tingkat"][nama] = {
            "ambang_level": ambang, "n_alarm": na, "tp": km["tp"], "fp": km["fp"], "fn": km["fn"], "tn": km["tn"],
            "pod": km["pod"], "far": km["far"], "csi": km["csi"], "ets": km["ets"], "pss": km["pss"],
            "pembanding_ets": ets_b, "pembanding_terbaik": terbaik,
            "selisih_ets": {k: ci.get(k) for k in ("est", "lo", "hi", "B", "n_blok", "galat") if k in ci},
            "vonis": vonis(ci.get("est"), ci.get("lo"), na, n_pos, kr)}
    return out


def semua_kab():
    from wilayah import Wilayah
    return sorted({f"{i[0]}|{i[1]}" for v in Wilayah().indeks.values() for _, _, i in v})


def kriteria():
    return json.load(open(os.path.join(AKAR, KRITERIA)))


# ---------------------------------------------------------------- sidik dan buka sekali
def hash_masukan():
    def sha(p):
        h = hashlib.sha256()
        with open(os.path.join(AKAR, p), "rb") as f:
            for b in iter(lambda: f.read(1 << 22), b""):
                h.update(b)
        return h.hexdigest()
    return [sha(p) for _, p in CSV] + [sha(NPZ)] + [sha(os.path.relpath(os.path.join(CACHE, f"{th}.json"), AKAR))
                                                    for th in range(PANEN[0].year, PANEN[1].year + 1)]


def kunci():
    os.chdir(AKAR)
    if os.path.exists(BUKA):
        sys.exit(f"{BUKA} sudah ada: uji sudah dibuka, sidik tak boleh ditulis ulang")
    d = SD.tulis(SIDIK, KODE, KRITERIA, hash_masukan())
    print("sidik", d["sidik"])


def jalan():
    os.chdir(AKAR)
    d = SD.cek(SIDIK)  # kode keluar 3 bila kode/kriteria berubah
    if hash_masukan() != d["masukan"]:
        sys.exit("masukan berubah dari yang disidik: pra-registrasi tak berlaku")
    kr = kriteria()
    SD.buka(BUKA, JEJAK, d["sidik"], "dibuka")
    rek = muat_rekam(range(PANEN[0].year, PANEN[1].year + 1))
    hasil = evaluasi(rek, semua_kab(), LATIH, UJI, kr)
    c = [sum(rek[k]["c"][i] for k in rek if UJI[0].isoformat() <= k <= UJI[1].isoformat()) for i in (0, 1)]
    hasil.update({"sidik": d["sidik"], "kriteria": kr, "kluster_hari_uji": c[0],
                  "kluster_hari_uji_tanpa_cuaca": c[1], "dibuat": dt.datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")})
    with open(os.path.join(AKAR, KELUAR), "w") as f:
        json.dump(hasil, f, ensure_ascii=False, indent=1)
        f.write("\n")
    with open(JEJAK, "a") as f:
        f.write(json.dumps({"sidik": d["sidik"], "hasil": {k: v["vonis"] for k, v in hasil["tingkat"].items()}}) + "\n")
    print({k: v["vonis"] for k, v in hasil["tingkat"].items()})


def coba():
    """Jalan percobaan pada tahun latih saja; bukan evaluasi, tidak menulis berkas."""
    kr = kriteria()
    rek = muat_rekam([2019, 2020, 2021, 2022, 2023])
    h = evaluasi(rek, semua_kab(), (dt.date(2019, 1, 1), dt.date(2020, 12, 31)), (dt.date(2021, 1, 1), dt.date(2022, 12, 30)), kr)
    print(json.dumps({k: (v if k != "tingkat" else {n: {x: t[x] for x in ("n_alarm", "ets", "pembanding_ets", "selisih_ets", "vonis")}
                                                   for n, t in v.items()}) for k, v in h.items()}, indent=1, default=str))


# ---------------------------------------------------------------- self-check
def uji():
    def tolak(f, exc):
        try:
            f()
        except exc:
            return
        raise AssertionError("seharusnya ditolak")

    # kluster: 20 piksel keyakinan tinggi hari ini
    kini = dt.datetime(2023, 9, 10, 23, 59, tzinfo=WIB)
    t = dt.datetime(2023, 9, 10, 5, tzinfo=UTC)  # 12.00 WIB hari itu

    def kl(n, c, hari_lalu=0):
        return [{"lat": -2 + i * .01, "lon": 110, "t": t - dt.timedelta(days=hari_lalu), "c": c, "px": .4} for i in range(n)]
    assert tingkat_kluster(kl(20, 2), kini, 10.0) == (3, True, "ya", True)      # px24 >= 15 dan FWI >= 7 -> Prioritas
    assert tingkat_kluster(kl(20, 2), kini, 5.0)[0] == 2                          # FWI < 7 -> tidak naik ke 3
    assert tingkat_kluster(kl(3, 1), kini, 10.0) == (1, True, "mungkin", True)    # "mungkin" dibatasi level 1
    assert tingkat_kluster(kl(20, 2), kini, None)[0] == 3                         # tanpa cuaca: prioritas bila px24 >= 15
    assert tingkat_kluster(kl(5, 2, 4), kini, 10.0) is None                       # > 72 jam tak aktif
    assert tingkat_kluster(kl(5, 2, 1), kini, 10.0)[3] is False                   # deteksi terakhir kemarin
    # ets dari hitungan = kontingensi; penyamaan cepat = samakan_alarm
    r = random.Random(3)
    y = [r.random() < .2 for _ in range(300)]
    al = [r.random() < .3 for _ in range(300)]
    k = PB.kontingensi(al, y)
    assert abs(ets_hitung(k["tp"], k["fp"], k["fn"], k["tn"]) - k["ets"]) < 1e-12
    sk = [r.random() for _ in range(300)]
    ref = PB.samakan_alarm(al, sk, y)
    assert ref and ref["alarm"] == samakan_cepat(sum(al), sk)
    # vonis
    kr = {"min_alarm": 20, "min_positif": 20}
    assert vonis(.1, .02, 50, 50, kr) == "LULUS" and vonis(.1, -.02, 50, 50, kr) == "TIDAK MEYAKINKAN"
    assert vonis(0, -.1, 50, 50, kr) == "TIDAK LULUS" and vonis(-.1, -.2, 50, 50, kr) == "TIDAK LULUS"
    assert vonis(.1, .02, 5, 50, kr) == "TAK TERUKUR" and vonis(.1, .02, 50, 5, kr) == "TAK TERUKUR" and vonis(None, None, 50, 50, kr) == "TAK TERUKUR"
    # evaluasi pada dunia mainan: 48 kab di 4 provinsi, latih 2019, uji 2020
    kabs = [f"{p}|K{i}" for p in "1234" for i in range(12)]
    krit = {"min_alarm": 20, "min_positif": 20, "bootstrap": {"B": 100, "seed": 7}}
    hari = [dt.date(2019, 1, 1) + dt.timedelta(days=i) for i in range(366 + 366 + 1)]

    def dunia(buat):
        rk, rr = {}, random.Random(11)
        yy = {(d, k): buat(d, k, rr) for d in hari for k in kabs}  # (y hari itu, level)
        for d in hari:
            rk[d.isoformat()] = {"k": {k: [yy[(d, k)][1], yy[(d, k)][0]] for k in kabs}}
        return rk
    L, U = (dt.date(2019, 1, 1), dt.date(2019, 12, 31)), (dt.date(2020, 1, 1), dt.date(2020, 12, 30))
    # A: level = ramalan sempurna y(d+1) (bocor sengaja) pada label acak jarang -> status mengalahkan semua pembanding
    yb = {}

    def acak(d, k, rr):
        yb[(d, k)] = int(rr.random() < .05)
        return yb[(d, k)], 0
    rk = dunia(acak)
    for d in hari[:-1]:
        for k in kabs:
            rk[d.isoformat()]["k"][k][0] = 3 * yb[(d + dt.timedelta(days=1), k)]
    h = evaluasi(rk, kabs, L, U, krit)
    assert all(h["tingkat"][n]["vonis"] == "LULUS" for n in TINGKAT), {n: h["tingkat"][n]["vonis"] for n in TINGKAT}
    # B: label lengket (persisten) dan level = y hari ini -> sama dengan persistensi, tak boleh LULUS
    kb = {}

    def lengket(d, k, rr):
        v = kb.get(k, 0)
        kb[k] = int(rr.random() < (.9 if v else .02))
        return kb[k], 3 * kb[k]
    h = evaluasi(dunia(lengket), kabs, L, U, krit)
    for n in ("Siaga", "Awas"):
        assert h["tingkat"][n]["vonis"] in ("TIDAK LULUS", "TIDAK MEYAKINKAN"), (n, h["tingkat"][n])
        assert h["tingkat"][n]["pembanding_ets"]["persistensi_asli"] >= h["tingkat"][n]["ets"] - 1e-9
    # C: level acak -> tak pernah LULUS; tingkat tanpa alarm -> TAK TERUKUR
    h = evaluasi(dunia(lambda d, k, rr: (int(rr.random() < .1), rr.choice((0, 1, 2)))), kabs, L, U, krit)
    assert all(h["tingkat"][n]["vonis"] != "LULUS" for n in TINGKAT)
    assert h["tingkat"]["Awas"]["n_alarm"] == 0 and h["tingkat"]["Awas"]["vonis"] == "TAK TERUKUR"
    # sidik: buka kedua ditolak, kode berubah ditolak
    awal = os.getcwd()
    with tempfile.TemporaryDirectory() as td:
        os.chdir(td)
        try:
            open("k.py", "w").write("a=1\n")
            open("kr.json", "w").write("{}\n")
            s = SD.tulis("x.sidik", ["k.py"], "kr.json", ["m1"])
            SD.cek("x.sidik")
            SD.buka("x.buka", "x.jsonl", s["sidik"], "dibuka")
            tolak(lambda: SD.buka("x.buka", "x.jsonl", s["sidik"], "dibuka"), RuntimeError)
            open("k.py", "w").write("a=2\n")
            try:
                SD.cek("x.sidik")
            except SystemExit as e:
                assert e.code == 3
            else:
                raise AssertionError("kode berubah tetapi cek lolos")
        finally:
            os.chdir(awal)
    print("ujibalik_status uji: OK")


if __name__ == "__main__":
    perintah = {"uji": uji, "panen": panen, "coba": coba, "kunci": kunci, "jalan": jalan}
    if len(sys.argv) == 2 and sys.argv[1] in perintah:
        perintah[sys.argv[1]]()
    else:
        sys.exit("pakai: ujibalik_status.py " + "|".join(perintah))
