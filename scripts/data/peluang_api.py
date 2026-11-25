"""Peluang api per kab/kota +1, +2, +3 hari (KI-72) -> public/data/peluang_api_uji.json. Python stdlib saja (tanpa numpy).

PROTOKOL (ditulis SEBELUM menghitung apa pun di 2026; angka ada di peluang_api.kriteria.json dan ikut disidik):
 1. Unit = kab-hari. Dua label, DILAPORKAN TERPISAH, tak pernah dirata-rata:
    "firespot": ada kluster berpola firespot "ya" dengan deteksi terakhir tepat di hari d+k (definisi ujibalik_status.py, hasil panen
                data/raw/ujibalik_status/<tahun>.json indeks 1; 2026 dipanen ulang di sini memakai rekam_hari yang sama);
    "titik_nh": ada >= 1 titik VIIRS keyakinan n/h (type 0, tanpa gunung api, S-NPP + NOAA-20) di kab itu pada hari WIB d+k.
 2. Model per (label, k): regresi logistik L2 (Newton, gbdt.latih_lr; negatif disub-sampel 1:5 dengan bobot 5), lalu kalibrasi isotonik
    (PAV) pada 2022. Fitur dari data sampai akhir hari d: log1p titik hari d, d-1, d-2, jumlah 7 hari; hari sejak titik terakhir;
    firespot hari d, d-1, d-2..d-6; DC; defisit hujan 30 hari terhadap klimatologi sel 2012-2021; fraksi gambut dan gambut x DC;
    sin/cos hari-tahun target; logit klimatologi kab x bulan label itu (tahun latih, leave-one-year-out di baris latih).
    Tidak masuk: kanal OSM (public/data/kanal.json hanya 9 provinsi, kab lain tak teramati dan bukan 0; ditinggalkan agar fitur
    tidak mengukur "provinsi mana yang dipetakan"); hujan prakiraan (arsip prakiraan H-1 tak ada).
 3. Pemisahan menurut waktu: latih tanggal-target 2019-01-15..2021-12-31, kalibrasi + pemilihan ambang 2022. 2023-2025 SUDAH DIBUKA
    (ujibalik_status.buka): dilaporkan hanya "deskriptif, sudah dibuka", bukan vonis. Uji bersih = tanggal TARGET 2026-01-01..2026-10-12 (batas FIRMS);
    seluruh pemisahan menurut tanggal target.
 4. Pembanding: persistensi asli (alarm = label hari d), persistensi disamakan jumlah alarm (peringkat: label d lalu jitter berbenih),
    klimatologi kab x bulan (tahun latih) disamakan jumlah alarm. Dua jumlah alarm: A = jumlah alarm persistensi asli di himpunan uji;
    B = jumlah alarm model pada ambang kalibrasi yang memaksimalkan ETS di 2022.
 5. Vonis per (label, k), CI95 bootstrap blok minggu ISO tanggal terbit (B 300, benih 7):
      (1) ETS(model@A) - maks(ETS persistensi asli, ETS klimatologi@A): batas bawah > 0;
      (2) ETS(model@B) - maks(ETS persistensi disamakan@B, ETS klimatologi@B): batas bawah > 0;
      (3) BSS lawan persistensi (ramalan 0/1): batas bawah > 0.
    LULUS bila ketiganya; TIDAK LULUS bila titik taksir (1) <= 0; TAK TERUKUR bila positif < 20 atau alarm < 20; selain itu TIDAK MEYAKINKAN.
    Dua lapisan dilaporkan terpisah: "awal" (label hari d = 0) dan "lanjutan" (= 1): alarm gabungan A dipotong ke lapisan,
    pembanding klimatologi saja (ETS persistensi di dalam lapisan konstan, jadi 0).
 6. Label kedua (keputusan pemilik K8): laporan harian Dirdalops karhutla (scripts/umum/label_dalops.py), hanya kab-bulan teramati,
    tak teramati dibuang dan dihitung bukan 0; tanpa toleransi dan toleransi +-1 hari berdampingan; tanpa vonis, tak dirata-rata dengan 1.
 7. Kunci: `kunci` menulis peluang_api.sidik SEBELUM uji dibuka; `jalan` membuka sekali (peluang_api.buka, O_EXCL), menolak bila kode
    atau masukan berubah (kode keluar 3).

Pakai (akar repo):
  python3 -I scripts/data/peluang_api.py uji        self-check tanpa berkas besar
  python3 scripts/data/peluang_api.py panen         cache data/raw/peluang_api (peta kab, titik per kab-hari, label 2026, cuaca ERA5 2026)
  python3 scripts/data/peluang_api.py coba          jalan percobaan: latih 2019-2020, kalibrasi 2021, uji 2022 (tidak ditulis)
  python3 scripts/data/peluang_api.py kunci         tulis sidik
  python3 scripts/data/peluang_api.py jalan         buka sekali, tulis keluaran
"""
import array
import bisect
import csv
import datetime as dt
import hashlib
import json
import math
import multiprocessing as mp
import os
import random
import struct
import sys
import tempfile
import time
import urllib.request
import zipfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
for _p in ("scripts/data", "scripts/umum", "scripts/sebaran"):
    sys.path.insert(0, os.path.join(AKAR, _p))
import aturan as A  # noqa: E402
import fwi as FW  # noqa: E402
import gbdt as G  # noqa: E402
import harian as H  # noqa: E402
import label_dalops as LD  # noqa: E402
import pembanding as PB  # noqa: E402
import sidik as SD  # noqa: E402
import ujibalik_status as UJ  # noqa: E402

UTC = dt.timezone.utc
CACHE = os.path.join(AKAR, "data/raw/peluang_api")
SIDIK = "scripts/data/peluang_api.sidik"
BUKA = "scripts/data/peluang_api.buka"
JEJAK = "scripts/data/peluang_api.jejak.jsonl"
KRITERIA = "scripts/data/peluang_api.kriteria.json"
KELUAR = "public/data/peluang_api_uji.json"
KODE = ["scripts/data/peluang_api.py", "scripts/data/ujibalik_status.py", "scripts/data/aturan.py", "scripts/data/harian.py",
        "scripts/data/titik_unik.py", "scripts/data/wilayah.py", "scripts/data/fwi.py", "scripts/sebaran/gbdt.py",
        "scripts/umum/pembanding.py", "scripts/umum/sidik.py", "scripts/umum/label_dalops.py"]
NPZ = "data/raw/risiko/cuaca_harian.npz"
GAMBUT = "public/data/lahan/gambut.geojson"
LOGBOOK = "data/pusdalops/logbook_kejadian.csv"
D0 = dt.date(2018, 12, 20)
AKHIR = dt.date(2026, 10, 12)               # batas FIRMS
ND = (AKHIR - D0).days + 1
NPZ0 = dt.date(2012, 1, 1)
OFF = (D0 - NPZ0).days
NPZ_AKHIR = dt.date(2025, 12, 31)
ERA0 = dt.date(2024, 12, 1)
K_LIST = (1, 2, 3)
LABEL = ("firespot", "titik_nh")
FITUR = ["log_n0", "log_n1", "log_n2", "log_n7", "log_sejak", "fs0", "fs1", "fs2_6", "dc", "defisit30", "gambut", "gambut_dc",
         "sin_doy", "cos_doy", "logit_klim"]


def hari(i):
    return D0 + dt.timedelta(days=i)


def idx(d):
    return (d - D0).days


# ---------------------------------------------------------------- 1. peta kab: pusat, fraksi gambut
_P = {}


def _baris_peta(lat):
    out, W, GP = {}, _P["w"], _P["g"]
    lo = 94.5
    while lo < 141.6:
        a = W.cari(lo, lat)
        if a:
            c = out.setdefault(f"{a[0]}|{a[1]}", [0, 0.0, 0.0, 0])
            c[0] += 1
            c[1] += lo
            c[2] += lat
            c[3] += GP.cari(lo, lat) is not None
        lo += 0.05
    return out


def peta_kab():
    from wilayah import Wilayah, Poligon
    _P["w"], _P["g"] = Wilayah(), Poligon(os.path.join(AKAR, GAMBUT))
    assert _P["g"].indeks, "peta gambut kosong"
    lats = [6.5 - i * 0.05 for i in range(int(18 / 0.05) + 1)]
    with mp.get_context("fork").Pool(6) as pool:
        hasil = pool.map(_baris_peta, lats, chunksize=4)
    tot = {}
    for h in hasil:
        for k, v in h.items():
            c = tot.setdefault(k, [0, 0.0, 0.0, 0])
            for j in range(4):
                c[j] += v[j]
    return {k: {"n": v[0], "lon": round(v[1] / v[0], 4), "lat": round(v[2] / v[0], 4), "gambut": round(v[3] / v[0], 4)}
            for k, v in sorted(tot.items())}


# ---------------------------------------------------------------- 2. titik per kab-hari
def muat_titik(sampai=AKHIR + dt.timedelta(days=1)):
    """-> (ts[], titik[(t, lat, lon, px, c)]) terurut; S-NPP + NOAA-20, n/h, type 0 (baris NRT tanpa kolom type dianggap 0), tanpa gunung api."""
    hasil, s = [], sampai.isoformat()
    for _, jalur in UJ.CSV:
        with open(os.path.join(AKAR, jalur)) as f:
            r = csv.reader(f)
            h = {k: i for i, k in enumerate(next(r))}
            for x in r:
                d = x[h["acq_date"]]
                if not ("2018-12-20" <= d <= s) or x[h["confidence"]] not in ("n", "h"):
                    continue
                if len(x) > h["type"] and x[h["type"]] != "0":
                    continue
                la, lo = float(x[h["latitude"]]), float(x[h["longitude"]])
                if A.gunung_api(la, lo):
                    continue
                j = x[h["acq_time"]].zfill(4)
                t = dt.datetime.fromisoformat(f"{d}T{j[:2]}:{j[2:]}:00+00:00").timestamp()
                hasil.append((t, la, lo, max(float(x[h["scan"]]), float(x[h["track"]])), 2 if x[h["confidence"]] == "h" else 1))
    hasil.sort()
    return [x[0] for x in hasil], hasil


def hari_wib(t):
    return (dt.datetime.fromtimestamp(t, UTC) + dt.timedelta(hours=7)).date()


def _hitung_potong(a_b):
    a, b = a_b
    W, out = _P["w"], {}
    for t, la, lo, _, _ in _P["pts"][a:b]:
        ad = W.cari(lo, la)
        if not ad:
            continue
        di = idx(hari_wib(t))
        if 0 <= di < ND:
            c = out.setdefault(f"{ad[0]}|{ad[1]}", {})
            c[di] = c.get(di, 0) + 1
    return out


def hitung_kab(pts):
    from wilayah import Wilayah
    _P["w"], _P["pts"] = Wilayah(), pts
    n = len(pts)
    potong = [(a, min(a + 20000, n)) for a in range(0, n, 20000)]
    tot = {}
    with mp.get_context("fork").Pool(6) as pool:
        for h in pool.imap_unordered(_hitung_potong, potong):
            for k, v in h.items():
                c = tot.setdefault(k, {})
                for di, m in v.items():
                    c[di] = c.get(di, 0) + m
    return {k: sorted(v.items()) for k, v in sorted(tot.items())}


# ---------------------------------------------------------------- 3. label firespot 2026 (rekam_hari yang sama dengan 2019-2025)
class _FNol:
    shape = (0, 0)


def label_2026(ts, pts, mulai, sampai):
    from wilayah import Wilayah
    UJ._G["w"] = Wilayah()
    UJ._G["fwi"] = ({}, _FNol)      # tanpa FWI: label firespot tak bergantung cuaca (tingkat tidak dipakai di sini)
    UJ._G["ts"], UJ._G["pts"] = ts, pts
    hr = [(mulai + dt.timedelta(days=i)).isoformat() for i in range((sampai - mulai).days + 1)]
    with mp.get_context("fork").Pool(6) as pool:
        res = dict(pool.imap_unordered(UJ.rekam_hari, hr, chunksize=1))
    return {k: res[k] for k in sorted(res)}


# ---------------------------------------------------------------- 4. cuaca ERA5 (Open-Meteo archive) 2024-12-01..2026-10-12
def sel_koordinat(iy, ix):
    return 6.5 - (iy + 0.5) * 0.5, 94.5 + (ix + 0.5) * 0.5


def unduh_era5(sel):
    """sel = [(iy, ix)] -> {'iy_ix': {'p': [...], 't': [...]}} hujan harian (mm) dan suhu maks (C), hari WIB, 2024-12-01..2026-10-12."""
    out = {}
    for a in range(0, len(sel), 40):
        grup = sel[a:a + 40]
        co = [sel_koordinat(*s) for s in grup]
        url = ("https://archive-api.open-meteo.com/v1/archive?latitude=" + ",".join(f"{c[0]:.3f}" for c in co) +
               "&longitude=" + ",".join(f"{c[1]:.3f}" for c in co) + f"&start_date={ERA0.isoformat()}&end_date={AKHIR.isoformat()}"
               "&daily=precipitation_sum,temperature_2m_max&timezone=Asia%2FJakarta")
        for coba in range(8):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "pipa-data/1"}), timeout=120) as r:
                    js = json.load(r)
                break
            except Exception as e:  # noqa: BLE001
                print("ulang", a, e, file=sys.stderr, flush=True)
                time.sleep(20 * (coba + 1))
        else:
            sys.exit(f"ERA5 gagal di kelompok {a}")
        js = js if isinstance(js, list) else [js]
        assert len(js) == len(grup), (len(js), len(grup))
        for s, x in zip(grup, js):
            n = (AKHIR - ERA0).days + 1
            assert len(x["daily"]["time"]) == n, (s, len(x["daily"]["time"]), n)
            out[f"{s[0]}_{s[1]}"] = {"p": x["daily"]["precipitation_sum"], "t": x["daily"]["temperature_2m_max"]}
        print(f"era5 {a + len(grup)}/{len(sel)}", file=sys.stderr, flush=True)
        time.sleep(3)
    return out


def panen():
    os.makedirs(CACHE, exist_ok=True)
    j_peta, j_hit, j_fs, j_era = (os.path.join(CACHE, n) for n in ("kab.json", "hitung.json", "fs2026.json", "era5.json"))
    if not os.path.exists(j_peta):
        json.dump(peta_kab(), open(j_peta, "w"), separators=(",", ":"))
        print("peta kab selesai", file=sys.stderr, flush=True)
    ts = pts = None
    if not os.path.exists(j_hit) or not os.path.exists(j_fs):
        ts, pts = muat_titik()
        print(len(pts), "titik", file=sys.stderr, flush=True)
    if not os.path.exists(j_hit):
        json.dump(hitung_kab(pts), open(j_hit, "w"), separators=(",", ":"))
        print("hitung kab selesai", file=sys.stderr, flush=True)
    if not os.path.exists(j_fs):
        # pemeriksaan loader: 3 hari 2025 harus sama dengan panen asli (indeks 1 = firespot ya)
        cek = label_2026(ts, pts, dt.date(2025, 9, 1), dt.date(2025, 9, 3))
        asli = json.load(open(os.path.join(AKAR, "data/raw/ujibalik_status/2025.json")))
        for k, v in cek.items():
            a = {kb: x[1] for kb, x in v["k"].items() if x[1]}
            b = {kb: x[1] for kb, x in asli[k]["k"].items() if x[1]}
            assert a == b, f"loader titik beda dari panen asli di {k}: {len(a)} vs {len(b)}"
        json.dump(label_2026(ts, pts, dt.date(2026, 1, 1), AKHIR), open(j_fs, "w"), separators=(",", ":"))
        print("label 2026 selesai", file=sys.stderr, flush=True)
    if not os.path.exists(j_era):
        kab = json.load(open(j_peta))
        sel = sorted({s for s in (sel_untuk(v["lat"], v["lon"], kunci_npz()[0]) for v in kab.values()) if s})
        json.dump({"mulai": ERA0.isoformat(), "sel": unduh_era5(sel)}, open(j_era, "w"), separators=(",", ":"))


# ---------------------------------------------------------------- 5. pembaca npz tanpa numpy
def _hdr_npy(b):
    assert b[:6] == b"\x93NUMPY"
    mayor = b[6]
    n, o = (struct.unpack("<H", b[8:10])[0], 10) if mayor == 1 else (struct.unpack("<I", b[8:12])[0], 12)
    import ast
    h = ast.literal_eval(b[o:o + n].decode("latin1"))
    return h, o + n


def kunci_npz():
    """-> (sel {(iy, ix): baris}, jumlah baris W)."""
    z = zipfile.ZipFile(os.path.join(AKAR, NPZ))
    b = z.read("kunci.npy")
    h, o = _hdr_npy(b)
    v = struct.unpack("<%dq" % (h["shape"][0] * 2), b[o:])
    return {(v[2 * i], v[2 * i + 1]): i for i in range(h["shape"][0])}, h["shape"][0]


def sel_untuk(lat, lon, sel):
    iy, ix = int((6.5 - lat) / .5), int((lon - 94.5) / .5)
    best, bd = None, 1e9
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if (iy + dy, ix + dx) in sel:
                d2 = (6.5 - (iy + dy + .5) * .5 - lat) ** 2 + (94.5 + (ix + dx + .5) * .5 - lon) ** 2
                if d2 < bd:
                    best, bd = (iy + dy, ix + dx), d2
    return best


def baca_W(baris_perlu, vars_=(1, 4)):
    """-> {baris: {var: [float...]}} untuk hari npz 0..HARI-1 (NaN tetap NaN)."""
    z = zipfile.ZipFile(os.path.join(AKAR, NPZ))
    b = z.read("W.npy")
    h, o = _hdr_npy(b)
    assert h["descr"] == "<f4" and not h["fortran_order"]
    nc, nh, nv = h["shape"]
    mv = memoryview(b)[o:].cast("f")
    return {c: {v: list(mv[c * nh * nv + v: (c + 1) * nh * nv: nv]) for v in vars_} for c in baris_perlu}, nh


# ---------------------------------------------------------------- 6. data ter-rakit (satu objek global D)
class Data:
    pass


def _isi_maju(a):
    last = None
    for i, v in enumerate(a):
        if v != v:
            a[i] = last if last is not None else 0.0
        else:
            last = v
    return a


def rakit_cuaca(kab, sel_kab):
    """-> dc[c], h30[c] (list panjang ND dari D0), klim30[c][doy], laporan. 2026 dari ERA5 dengan skala hujan bulanan dari 2025."""
    era = json.load(open(os.path.join(CACHE, "era5.json")))
    sel, _ = kunci_npz()
    sel_pakai = sorted({s for s in sel_kab.values() if s})
    baris = {s: sel[s] for s in sel_pakai}
    W, nh = baca_W(sorted(baris.values()))
    assert (NPZ_AKHIR - NPZ0).days + 1 == nh, nh
    n_npz = nh - OFF
    d_npz_akhir = n_npz - 1                      # indeks D0 untuk 2025-12-31
    i2026 = idx(dt.date(2026, 1, 1))
    assert d_npz_akhir == i2026 - 1
    doy = [min(hari(i).timetuple().tm_yday, 365) - 1 for i in range(ND)]
    npz_doy = [min((NPZ0 + dt.timedelta(days=j)).timetuple().tm_yday, 365) - 1 for j in range(nh)]
    lap = {"sel": len(sel_pakai)}
    # skala hujan bulanan: rasio rata-rata h30 MERRA-2 / jumlah 30 hari ERA5 mentah, hari 2025
    e0 = (ERA0 - D0).days
    sm, se = [0.0] * 12, [0.0] * 12
    ERA = {}
    for s in sel_pakai:
        p = [0.0 if v is None else v for v in era["sel"][f"{s[0]}_{s[1]}"]["p"]]
        ERA[s] = p
        cs = [0.0]
        for v in p:
            cs.append(cs[-1] + v)
        w = W[baris[s]][1]
        for d in range(idx(dt.date(2025, 1, 1)), i2026):
            je = d - e0
            m = hari(d).month - 1
            if w[d + OFF] == w[d + OFF]:
                sm[m] += w[d + OFF]
                se[m] += cs[je + 1] - cs[je - 29]
    ratio = [min(max(sm[m] / se[m], 0.5), 2.0) if se[m] > 0 else 1.0 for m in range(12)]
    lap["skala_hujan_bulan_MERRA2_per_ERA5"] = [round(r, 3) for r in ratio]
    dc, h30, klim = {}, {}, {}
    gal_dc, gal_h = [], []
    for s in sel_pakai:
        c = baris[s]
        a_dc = _isi_maju(list(W[c][4]))[OFF:]
        a_h = _isi_maju(list(W[c][1]))[OFF:]
        # klimatologi h30 per hari-tahun, 2012-2021, jendela +-7 hari melingkar
        jml, ban = [0.0] * 365, [0] * 365
        for j in range(0, (dt.date(2021, 12, 31) - NPZ0).days + 1):
            v = W[c][1][j]
            if v == v:
                jml[npz_doy[j]] += v
                ban[npz_doy[j]] += 1
        kl = []
        for dd in range(365):
            sj = sum(jml[(dd + o) % 365] for o in range(-7, 8))
            nn = sum(ban[(dd + o) % 365] for o in range(-7, 8))
            kl.append(sj / nn if nn else 0.0)
        # ERA5: hujan terskala, suhu maks; DC dijalankan dari DC MERRA-2 sebelum jendela
        p = ERA[s]
        t = [20.0 if v is None else v for v in era["sel"][f"{s[0]}_{s[1]}"]["t"]]
        pb = [p[j] * ratio[hari(e0 + j).month - 1] for j in range(len(p))]
        cs = [0.0]
        for v in pb:
            cs.append(cs[-1] + v)

        def jalan_dc(d_awal, d_akhir, c0):
            out, x = {}, c0
            for d in range(d_awal, d_akhir + 1):
                x = FW.dc(x, t[d - e0], pb[d - e0])
                out[d] = x
            return out
        uji_dc = jalan_dc(idx(dt.date(2025, 7, 1)), i2026 - 1, a_dc[idx(dt.date(2025, 6, 30)) + 0])
        for d in range(idx(dt.date(2025, 10, 1)), i2026):
            gal_dc.append(uji_dc[d] - a_dc[d])
            gal_h.append(cs[d - e0 + 1] - cs[d - e0 - 29] - a_h[d])
        d26 = jalan_dc(i2026, ND - 1, a_dc[i2026 - 1])
        full_dc = a_dc[:i2026] + [d26[d] for d in range(i2026, ND)]
        full_h = a_h[:i2026] + [cs[d - e0 + 1] - cs[d - e0 - 29] for d in range(i2026, ND)]
        dc[s], h30[s], klim[s] = full_dc, full_h, kl
    lap["galat_ERA5_Okt_Des_2025"] = {
        "dc_rata_selisih": round(sum(gal_dc) / len(gal_dc), 2), "dc_mutlak_rata": round(sum(abs(x) for x in gal_dc) / len(gal_dc), 2),
        "h30_rata_selisih_mm": round(sum(gal_h) / len(gal_h), 2), "h30_mutlak_rata_mm": round(sum(abs(x) for x in gal_h) / len(gal_h), 2),
        "catatan": "DC dijalankan dari DC MERRA-2 30 Jun 2025 dengan hujan ERA5 terskala; selisih terhadap DC MERRA-2 itu = ukuran pergeseran sumber yang dipakai untuk 2026"}
    return dc, h30, klim, doy, lap


def rakit():
    kab_j = json.load(open(os.path.join(CACHE, "kab.json")))
    hit_j = json.load(open(os.path.join(CACHE, "hitung.json")))
    sel, _ = kunci_npz()
    sel_kab = {k: sel_untuk(v["lat"], v["lon"], sel) for k, v in kab_j.items()}
    semua = UJ.semua_kab()
    kabs = [k for k in semua if k in kab_j and sel_kab.get(k)]
    D = Data()
    D.kabs, D.kab_i = kabs, {k: i for i, k in enumerate(kabs)}
    D.dibuang = {"tanpa_pusat_atau_sel_cuaca": len([k for k in semua if k not in set(kabs)]), "dari": len(semua)}
    D.gambut = [kab_j[k]["gambut"] for k in kabs]
    D.sel = [sel_kab[k] for k in kabs]
    dc, h30, klim, doy, lap = rakit_cuaca(kab_j, {k: sel_kab[k] for k in kabs})
    D.dc, D.h30, D.klim, D.doy, D.lap_cuaca = dc, h30, klim, doy, lap
    n = len(kabs)
    D.cnt = [[0] * ND for _ in range(n)]
    for k, lst in hit_j.items():
        if k in D.kab_i:
            a = D.cnt[D.kab_i[k]]
            for di, m in lst:
                a[di] = m
    D.cum = []
    D.sejak = []
    for a in D.cnt:
        c = [0]
        s, last = [], -10 ** 6
        for d, v in enumerate(a):
            c.append(c[-1] + v)
            if v:
                last = d
            s.append(min(d - last, 60))
        D.cum.append(c)
        D.sejak.append(s)
    D.fs = [bytearray(ND) for _ in range(n)]
    rec = {}
    for th in range(2019, 2026):
        rec.update(json.load(open(os.path.join(AKAR, f"data/raw/ujibalik_status/{th}.json"))))
    rec.update(json.load(open(os.path.join(CACHE, "fs2026.json"))))
    for iso, v in rec.items():
        d = idx(dt.date.fromisoformat(iso))
        for k, x in v["k"].items():
            if k in D.kab_i and x[1]:
                D.fs[D.kab_i[k]][d] = 1
    D.lab = {"firespot": D.fs, "titik_nh": [bytearray(1 if v else 0 for v in a) for a in D.cnt]}
    D.hari_rec = (idx(dt.date(2019, 1, 1)), ND - 1)
    return D


# ---------------------------------------------------------------- 7. fitur
def klim_tabel(D, label, tahun):
    """-> {kab: [ (y, n) per bulan 1..12 per tahun ] } = ctab[i][th][m] = [y, n] untuk tahun-tahun `tahun`."""
    L = D.lab[label]
    tab = []
    for i in range(len(D.kabs)):
        t = {th: [[0, 0] for _ in range(12)] for th in tahun}
        a = L[i]
        for th in tahun:
            for d in range(idx(dt.date(th, 1, 1)), idx(dt.date(th, 12, 31)) + 1):
                c = t[th][hari(d).month - 1]
                c[0] += a[d]
                c[1] += 1
        tab.append(t)
    return tab


def klim_rate(tab_i, tahun, bulan, kecuali=None):
    y = n = 0
    for th in tahun:
        if th == kecuali:
            continue
        c = tab_i[th][bulan - 1]
        y += c[0]
        n += c[1]
    return (y + 0.5) / (n + 1)


def logit(p):
    return math.log(p / (1 - p))


def basis(D, i, d):
    """Fitur yang hanya memakai data sampai akhir hari d (indeks D0). Tanpa sin/cos/klim (bergantung tanggal target)."""
    cn, cm, fs = D.cnt[i], D.cum[i], D.fs[i]
    s = D.sel[i]
    dc = min(D.dc[s][d], 1500.0) / 1000.0
    df = max(min(D.klim[s][D.doy[d]] - D.h30[s][d], 300.0), -300.0) / 100.0
    g = D.gambut[i]
    return [math.log1p(cn[d]), math.log1p(cn[d - 1]), math.log1p(cn[d - 2]), math.log1p(cm[d + 1] - cm[d - 6]),
            math.log1p(D.sejak[i][d]), fs[d], fs[d - 1], sum(fs[d - 6:d - 1]) / 5.0, dc, df, g, g * dc]


def tambah_tanggal(b, dtarget, klimlogit):
    doy = min(dtarget.timetuple().tm_yday, 365)
    a = 2 * math.pi * doy / 365.0
    return b + [math.sin(a), math.cos(a), klimlogit]


# ---------------------------------------------------------------- 8. isotonik, ambang, metrik
def pav(s, y):
    """Isotonik non-menurun. -> (batas[], nilai[]): nilai blok j berlaku untuk skor <= batas[j] (dan > batas[j-1])."""
    urut = sorted(range(len(s)), key=s.__getitem__)
    blok = []   # [jumlah y, n, skor maks]
    for i in urut:
        blok.append([y[i], 1, s[i]])
        while len(blok) > 1 and blok[-2][0] * blok[-1][1] >= blok[-1][0] * blok[-2][1]:
            b = blok.pop()
            blok[-1][0] += b[0]
            blok[-1][1] += b[1]
            blok[-1][2] = b[2]
    return [b[2] for b in blok], [b[0] / b[1] for b in blok]


def terap_pav(kal, s):
    batas, nilai = kal
    j = bisect.bisect_left(batas, s)
    return nilai[min(j, len(nilai) - 1)]


def ambang_ets(skor, y, n_min=20):
    """Jumlah alarm N (peringkat skor tertinggi) yang memaksimalkan ETS; -> (N, ets). Peringkat imbang dipecah menurut urutan stabil."""
    urut = sorted(range(len(y)), key=lambda i: -skor[i])
    P = sum(y)
    n = len(y)
    tp = fp = 0
    best, bn = None, 0
    for r, i in enumerate(urut, 1):
        if y[i]:
            tp += 1
        else:
            fp += 1
        if r < n_min:
            continue
        if r < n and skor[urut[r]] == skor[i]:
            continue            # jangan berhenti di tengah blok imbang
        hr = (tp + (P - tp)) * (tp + fp) / n
        e = (tp - hr) / (tp + fp + (P - tp) - hr) if (tp + fp + (P - tp) - hr) else None
        if e is not None and (best is None or e > best):
            best, bn = e, r
    return bn, best


def top_n(kunci, N):
    """kunci = list tuple/float; alarm = N teratas (urutan menurun), bytearray."""
    urut = sorted(range(len(kunci)), key=lambda i: kunci[i], reverse=True)[:N]
    a = bytearray(len(kunci))
    for i in urut:
        a[i] = 1
    return a


def kont_blok(alarm, Y, BL, pilih=None):
    out = {}
    for i in range(len(Y)):
        if pilih is not None and not pilih[i]:
            continue
        c = out.setdefault(BL[i], [0, 0, 0, 0])
        c[(0 if Y[i] else 1) if alarm[i] else (2 if Y[i] else 3)] += 1
    return out


def jml(rs, nama):
    c = [0, 0, 0, 0]
    for r in rs:
        for j in range(4):
            c[j] += r[nama][j]
    return c


def ets4(c):
    return UJ.ets_hitung(*c)


def selisih_maks(rs, m, pembanding):
    e = ets4(jml(rs, m))
    ps = [ets4(jml(rs, p)) for p in pembanding]
    if e is None or any(x is None for x in ps):
        return None
    return e - max(ps)


def bss_blok(rs, a, b):
    sa, sb = sum(r["sse"][a] for r in rs), sum(r["sse"][b] for r in rs)
    return None if sb == 0 else 1 - sa / sb


def ci(fn, rows, kr):
    try:
        return PB.bootstrap_blok(fn, rows, "b", B=kr["bootstrap"]["B"], seed=kr["bootstrap"]["seed"])
    except ValueError as ex:
        return {"est": fn(rows), "lo": None, "hi": None, "galat": str(ex)}


def vonis_api(d1, d2, d3, n_alarm, n_pos, kr):
    if n_alarm < kr["min_alarm"] or n_pos < kr["min_positif"] or d1.get("est") is None:
        return "TAK TERUKUR"
    if d1["est"] <= 0:
        return "TIDAK LULUS"
    ok = all(d.get("lo") is not None and d["lo"] > 0 for d in (d1, d2, d3))
    return "LULUS" if ok else "TIDAK MEYAKINKAN"


def bulat(x, n=4):
    return None if x is None else round(x, n)


def evaluasi(M, N_B, kr, jitter_seed=11):
    """M = dict array sejajar baris: P (kalibrasi), S (logit), Y, YT, CL (klimatologi), BL (blok), ST (1 bila lanjutan).
    -> hasil per (label, k): metrik, vonis, lapisan."""
    n = len(M["Y"])
    Y, YT, BL = M["Y"], M["YT"], M["BL"]
    rnd = random.Random(jitter_seed)
    J = [rnd.random() for _ in range(n)]
    N_A = sum(YT)
    n_pos = sum(Y)
    am_A = top_n([(M["P"][i], M["S"][i]) for i in range(n)], N_A)
    cl_A = top_n([(M["CL"][i], J[i]) for i in range(n)], N_A)
    am_B = bytearray(1 if M["P"][i] >= M["thr"] else 0 for i in range(n))
    N_B = sum(am_B)
    pe_B = top_n([(YT[i], J[i]) for i in range(n)], N_B)
    cl_B = top_n([(M["CL"][i], J[i]) for i in range(n)], N_B)
    alarm = {"model_A": am_A, "pers_asli": YT, "klim_A": cl_A, "model_B": am_B, "pers_B": pe_B, "klim_B": cl_B}
    kb = {nm: kont_blok(a, Y, BL) for nm, a in alarm.items()}
    sse = {}
    for nm, f in (("model", lambda i: M["P"][i]), ("pers", lambda i: YT[i]), ("klim", lambda i: M["CL"][i])):
        sb = {}
        for i in range(n):
            sb[BL[i]] = sb.get(BL[i], 0.0) + (f(i) - Y[i]) ** 2
        sse[nm] = sb
    nb = {}
    for b in BL:
        nb[b] = nb.get(b, 0) + 1
    rows = [dict({"b": b, "n": nb[b]}, **{nm: kb[nm].get(b, [0, 0, 0, 0]) for nm in alarm},
                 sse={nm: sse[nm][b] for nm in sse}) for b in sorted(nb)]
    tot = {nm: jml(rows, nm) for nm in alarm}
    d1 = ci(lambda rs: selisih_maks(rs, "model_A", ("pers_asli", "klim_A")), rows, kr)
    d2 = ci(lambda rs: selisih_maks(rs, "model_B", ("pers_B", "klim_B")), rows, kr)
    d3 = ci(lambda rs: bss_blok(rs, "model", "pers"), rows, kr)
    d4 = ci(lambda rs: bss_blok(rs, "model", "klim"), rows, kr)
    out = {"n_baris": n, "positif": n_pos, "laju_label": bulat(n_pos / n, 5), "alarm_A": N_A, "alarm_B": N_B, "ambang_B": bulat(M["thr"], 5),
           "ets": {nm: bulat(ets4(tot[nm])) for nm in alarm},
           "pod": {nm: bulat(tot[nm][0] / (tot[nm][0] + tot[nm][2]) if tot[nm][0] + tot[nm][2] else None) for nm in alarm},
           "far": {nm: bulat(tot[nm][1] / (tot[nm][0] + tot[nm][1]) if tot[nm][0] + tot[nm][1] else None) for nm in alarm},
           "brier": {nm: bulat(sum(sse[nm].values()) / n, 6) for nm in sse},
           "selisih_ets_A": {k: bulat(d1.get(k)) for k in ("est", "lo", "hi")},
           "selisih_ets_B": {k: bulat(d2.get(k)) for k in ("est", "lo", "hi")},
           "bss_lawan_persistensi": {k: bulat(d3.get(k)) for k in ("est", "lo", "hi")},
           "bss_lawan_klimatologi": {k: bulat(d4.get(k)) for k in ("est", "lo", "hi")},
           "vonis": vonis_api(d1, d2, d3, N_A, n_pos, kr)}
    # lapisan: alarm gabungan A dipotong; pembanding klimatologi@A; persistensi di dalam lapisan konstan (ETS 0) tidak dipakai
    lap = {}
    for nama, v in (("awal", 0), ("lanjutan", 1)):
        pil = bytearray(1 if YT[i] == v else 0 for i in range(n))
        km, kc = kont_blok(am_A, Y, BL, pil), kont_blok(cl_A, Y, BL, pil)
        rs = [{"b": b, "m": km.get(b, [0, 0, 0, 0]), "c": kc.get(b, [0, 0, 0, 0])} for b in sorted({BL[i] for i in range(n) if pil[i]})]
        cm, cc = jml(rs, "m"), jml(rs, "c")
        n_l, p_l = sum(pil), sum(Y[i] for i in range(n) if pil[i])
        dd = ci(lambda r2: selisih_maks(r2, "m", ("c",)), rs, kr) if len(rs) >= 2 else {"est": None}
        lap[nama] = {"n_baris": n_l, "positif": p_l, "laju_label": bulat(p_l / n_l, 5) if n_l else None,
                     "alarm_model": cm[0] + cm[1], "tp": cm[0], "ets_model": bulat(ets4(cm)), "ets_klim": bulat(ets4(cc)),
                     "pod_model": bulat(cm[0] / (cm[0] + cm[2]) if cm[0] + cm[2] else None),
                     "selisih_ets_vs_klim": {k: bulat(dd.get(k)) for k in ("est", "lo", "hi")},
                     "vonis_vs_klim": vonis(dd, cm[0] + cm[1], p_l, kr)}
    out["lapisan"] = lap
    return out, {"model_A": am_A, "pers_asli": YT, "klim_A": cl_A, "model_B": am_B}


def vonis(d, n_alarm, n_pos, kr):
    if n_alarm < kr["min_alarm"] or n_pos < kr["min_positif"] or d.get("est") is None:
        return "TAK TERUKUR"
    return "TIDAK LULUS" if d["est"] <= 0 else "LULUS" if d.get("lo") is not None and d["lo"] > 0 else "TIDAK MEYAKINKAN"


# ---------------------------------------------------------------- 9. satu tugas (label, k)
SPLIT_FINAL = {"latih": (dt.date(2019, 1, 15), dt.date(2021, 12, 31)), "kal": (dt.date(2022, 1, 1), dt.date(2022, 12, 31)),
               "th_latih": (2019, 2020, 2021),
               "uji": {"deskriptif_2023_2025": (dt.date(2023, 1, 1), dt.date(2025, 12, 31)),
                       "uji_bersih_2026": (dt.date(2026, 1, 1), AKHIR)}}
SPLIT_COBA = {"latih": (dt.date(2019, 1, 15), dt.date(2020, 12, 31)), "kal": (dt.date(2021, 1, 1), dt.date(2021, 12, 31)),
              "th_latih": (2019, 2020), "uji": {"coba_2022": (dt.date(2022, 1, 1), dt.date(2022, 12, 31))}}
Q_NEG = 0.2


def baris_hari(D, d_awal, d_akhir, k):
    """Tanggal TERBIT d_awal..d_akhir (tanggal target d+k <= AKHIR)."""
    for d in range(idx(d_awal), idx(d_akhir) + 1):
        if d + k < ND:
            yield d


def latih(D, label, k, sp, kr):
    L = D.lab[label]
    tab = klim_tabel(D, label, sp["th_latih"])
    rnd = random.Random(kr["seed_sub"])
    X, y, w = [], [], []
    for d in baris_hari(D, sp["latih"][0] - dt.timedelta(days=k), sp["latih"][1] - dt.timedelta(days=k), k):
        dtg = hari(d + k)
        for i in range(len(D.kabs)):
            yy = L[i][d + k]
            if not yy and rnd.random() > Q_NEG:
                continue
            kl = logit(klim_rate(tab[i], sp["th_latih"], dtg.month, kecuali=dtg.year))
            X.append(tambah_tanggal(basis(D, i, d), dtg, kl))
            y.append(yy)
            w.append(1.0 if yy else 1.0 / Q_NEG)
    m = G.latih_lr(X, y, w, l2=kr["l2"], iterasi=kr["iterasi"])
    return m, tab, len(y), sum(y)


def skor_baris(m, x):
    s = m["b"][0]
    for j, v in enumerate(x):
        s += m["b"][j + 1] * (v - m["mu"][j]) / m["sd"][j]
    return s


def bangun_M(D, label, k, rentang, m, tab, th_latih, kal=None):
    L = D.lab[label]
    M = {nm: array.array("f") for nm in ("P", "S", "CL")}
    for nm in ("Y", "YT"):
        M[nm] = array.array("b")
    M["BL"], M["KI"], M["DI"] = array.array("i"), array.array("h"), array.array("i")
    for d in baris_hari(D, rentang[0], rentang[1], k):
        dtg = hari(d + k)
        iso = hari(d).isocalendar()
        bl = iso[0] * 100 + iso[1]
        for i in range(len(D.kabs)):
            cl = klim_rate(tab[i], th_latih, dtg.month)
            s = skor_baris(m, tambah_tanggal(basis(D, i, d), dtg, logit(cl)))
            M["S"].append(s)
            M["P"].append(terap_pav(kal, s) if kal else 0.0)
            M["CL"].append(cl)
            M["Y"].append(L[i][d + k])
            M["YT"].append(L[i][d])
            M["BL"].append(bl)
            M["KI"].append(i)
            M["DI"].append(d)
    return M


def dalops_skor(D, M, alarms, k, kr):
    """Skor terhadap label Dalops karhutla pada baris M; tak teramati dibuang. -> {metode: skor_dua}."""
    n2k, _ = LD.peta_kode()
    baris, st = LD.baca_dalops(nama_ke_kode=n2k)
    kej = LD.rekaman(baris, "karhutla")
    cov = LD.cakupan_label(baris, "karhutla")
    kode = [LD.cocok_kab(kb, n2k) for kb in D.kabs]
    tgl = {}
    out = {"kab_tanpa_kode": sum(1 for c in kode if c is None), "kejadian_dalops": len(kej), "label": "dalops_karhutla"}
    for nm, a in alarms.items():
        kasus = []
        for r in range(len(M["Y"])):
            c = kode[M["KI"][r]]
            if c is None:
                continue
            d = M["DI"][r] + k
            t = tgl.get(d) or tgl.setdefault(d, hari(d).isoformat())
            kasus.append((c, t, bool(a[r])))
        sd = LD.skor_dua(kasus, kej, cov)
        out[nm] = {tol: {x: bulat(v) if isinstance(v, float) else v for x, v in s.items() if x in ("tp", "fp", "fn", "tn", "ets", "pod", "far", "n_kasus", "n_tak_teramati")}
                   for tol, s in sd.items()}
    return out


def tugas(arg):
    label, k, final = arg
    D = _P["D"]
    kr = kriteria()
    sp = SPLIT_FINAL if final else SPLIT_COBA
    t0 = time.time()
    m, tab, n_lat, pos_lat = latih(D, label, k, sp, kr)
    t1 = time.time()
    # kalibrasi pada tahun kal (tanpa sub-sampling)
    Mk = bangun_M(D, label, k, (sp["kal"][0] - dt.timedelta(days=k), sp["kal"][1] - dt.timedelta(days=k)), m, tab, sp["th_latih"])
    kal = pav(list(Mk["S"]), list(Mk["Y"]))
    Pk = [terap_pav(kal, s) for s in Mk["S"]]
    nA, e_val = ambang_ets(Pk, list(Mk["Y"]))
    thr = sorted(Pk, reverse=True)[nA - 1] if nA else 1.1
    brier_val = sum((p - y) ** 2 for p, y in zip(Pk, Mk["Y"])) / len(Pk)
    brier_pers = sum((p - y) ** 2 for p, y in zip(Mk["YT"], Mk["Y"])) / len(Pk)
    hasil = {"n_latih": n_lat, "positif_latih": pos_lat, "kalibrasi": {"n": len(Pk), "positif": sum(Mk["Y"]), "brier_model": bulat(brier_val, 6),
             "brier_persistensi": bulat(brier_pers, 6), "ets_terbaik": bulat(e_val), "alarm_terbaik": nA, "ambang_p": bulat(thr, 5)},
             "koef": {n: bulat(b) for n, b in zip(["const"] + FITUR, m["b"])}}
    del Mk, Pk
    for nm, rg in sp["uji"].items():
        M = bangun_M(D, label, k, (rg[0] - dt.timedelta(days=k), rg[1] - dt.timedelta(days=k)), m, tab, sp["th_latih"], kal)
        M["thr"] = thr
        ev, alarms = evaluasi(M, None, kr)
        if True:   # Dalops juga di jalan percobaan, supaya jalur akhir teruji sebelum sidik
            ev["label_dalops"] = dalops_skor(D, M, {"model_A": alarms["model_A"], "model_B": alarms["model_B"], "persistensi": alarms["pers_asli"], "klimatologi_A": alarms["klim_A"]}, k, kr)
        hasil[nm] = ev
    hasil["detik"] = {"latih": round(t1 - t0), "total": round(time.time() - t0)}
    return label, k, hasil


def kriteria():
    return json.load(open(os.path.join(AKAR, KRITERIA)))


def jalankan(final):
    os.chdir(AKAR)
    D = rakit()
    _P["D"] = D
    ctx = mp.get_context("fork")
    with ctx.Pool(6) as pool:
        res = pool.map(tugas, [(lb, k, final) for lb in LABEL for k in K_LIST], chunksize=1)
    return D, res


def hash_masukan():
    def sha(p):
        h = hashlib.sha256()
        with open(os.path.join(AKAR, p), "rb") as f:
            for b in iter(lambda: f.read(1 << 22), b""):
                h.update(b)
        return h.hexdigest()
    ber = [os.path.relpath(os.path.join(CACHE, n), AKAR) for n in ("kab.json", "hitung.json", "fs2026.json", "era5.json")]
    return [sha(p) for p in ber + [NPZ, LOGBOOK, GAMBUT, "public/data/kemitraan/kode.json"]] + \
           [sha(f"data/raw/ujibalik_status/{th}.json") for th in range(2019, 2026)] + [sha(p) for _, p in UJ.CSV]


def kunci():
    os.chdir(AKAR)
    if os.path.exists(BUKA):
        sys.exit(f"{BUKA} sudah ada: uji sudah dibuka, sidik tak boleh ditulis ulang")
    d = SD.tulis(SIDIK, KODE, KRITERIA, hash_masukan())
    print("sidik", d["sidik"])


def susun(D, res, sidik, kr, k_uji, k_desk):
    out = {"sidik": sidik, "kriteria": kr, "dibuat": dt.datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "data": {"kab_dipakai": len(D.kabs), "kab_dibuang": D.dibuang, "cuaca_2026": D.lap_cuaca, "fitur": FITUR,
                    "kanal": "tidak dipakai: public/data/kanal.json hanya 9 provinsi"},
           "uji_bersih_2026": {}, "deskriptif_2023_2025": {}, "kalibrasi_dan_latih": {}, "label_dalops": {}}
    for label, k, h in res:
        key = f"{label}_k{k}"
        out["uji_bersih_2026"][key] = {x: v for x, v in h[k_uji].items() if x != "label_dalops"}
        out["deskriptif_2023_2025"][key] = dict({x: v for x, v in h[k_desk].items() if x not in ("label_dalops", "vonis")},
                                                status="deskriptif, sudah dibuka (ujibalik_status.buka); bukan vonis")
        out["label_dalops"][key] = {"uji_bersih_2026": h[k_uji]["label_dalops"], "deskriptif_2023_2025": h[k_desk]["label_dalops"],
                                    "catatan": "tanpa vonis; alarm sama dengan model/persistensi/klimatologi label sendiri; tak teramati dibuang"}
        out["kalibrasi_dan_latih"][key] = {x: h[x] for x in ("n_latih", "positif_latih", "kalibrasi", "koef", "detik")}
    out["vonis"] = {k: v["vonis"] for k, v in out["uji_bersih_2026"].items()}
    return out


def jalan():
    os.chdir(AKAR)
    d = SD.cek(SIDIK)
    if hash_masukan() != d["masukan"]:
        sys.exit("masukan berubah dari yang disidik: pra-registrasi tak berlaku")
    kr = kriteria()
    SD.buka(BUKA, JEJAK, d["sidik"], "dibuka")
    D, res = jalankan(True)
    out = susun(D, res, d["sidik"], kr, "uji_bersih_2026", "deskriptif_2023_2025")
    with open(os.path.join(AKAR, KELUAR), "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    with open(JEJAK, "a") as f:
        f.write(json.dumps({"sidik": d["sidik"], "vonis": out["vonis"]}) + "\n")
    print(json.dumps(out["vonis"], indent=1))


def coba():
    """Latih 2019-2020, kalibrasi 2021, uji 2022: bukan evaluasi sungguhan, tidak menulis berkas."""
    D, res = jalankan(False)
    json.dumps(susun(D, res, "coba", kriteria(), "coba_2022", "coba_2022"))      # jalur susun akhir teruji
    print(json.dumps({"kab": len(D.kabs), "cuaca": D.lap_cuaca}, indent=1))
    for label, k, h in res:
        e = h["coba_2022"]
        print(label, k, json.dumps({"latih": [h["n_latih"], h["positif_latih"]], "kal": h["kalibrasi"], "ets": e["ets"], "pod": e["pod"], "far": e["far"],
                                    "brier": e["brier"], "dA": e["selisih_ets_A"], "dB": e["selisih_ets_B"], "bss_p": e["bss_lawan_persistensi"],
                                    "bss_k": e["bss_lawan_klimatologi"], "vonis": e["vonis"], "alarm": [e["alarm_A"], e["alarm_B"]],
                                    "lapisan": e["lapisan"], "detik": h["detik"]}))


# ---------------------------------------------------------------- self-check (sintetis, tanpa berkas besar)
def uji():
    def tolak(f, exc):
        try:
            f()
        except exc:
            return
        raise AssertionError("seharusnya ditolak")

    # IRLS: koefisien sintetis dipulihkan
    r = random.Random(5)
    X = [[r.gauss(0, 1), r.gauss(0, 1)] for _ in range(4000)]
    ben = [-1.0, 1.5, -0.8]
    y = [1 if r.random() < G.sigmoid(ben[0] + ben[1] * a + ben[2] * b) else 0 for a, b in X]
    m = G.latih_lr(X, y, [1.0] * len(y), l2=1e-6, iterasi=15)
    # koefisien dalam ruang terstandar: b_j/sd_j = koefisien asli
    est = [m["b"][0] - sum(m["b"][j + 1] * m["mu"][j] / m["sd"][j] for j in range(2))] + [m["b"][j + 1] / m["sd"][j] for j in range(2)]
    assert all(abs(a - b) < 0.2 for a, b in zip(est, ben)), (est, ben)
    # bobot negatif 1:5 menjaga kemiringan (hanya intersep bergeser dan kalibrasi memperbaikinya)
    Xs, ys, ws = [], [], []
    for a, b in zip(X, y):
        if b or r.random() < Q_NEG:
            Xs.append(a)
            ys.append(b)
            ws.append(1.0 if b else 1 / Q_NEG)
    m2 = G.latih_lr(Xs, ys, ws, l2=1e-6, iterasi=15)
    e2 = [m2["b"][j + 1] / m2["sd"][j] for j in range(2)]
    assert all(abs(a - b) < 0.35 for a, b in zip(e2, ben[1:])), (e2, ben)
    # PAV: monoton, mempertahankan rata-rata, skor monoton -> peluang monoton
    s = [r.gauss(0, 1) for _ in range(3000)]
    yy = [1 if r.random() < G.sigmoid(2 * v - 1) else 0 for v in s]
    kal = pav(s, yy)
    assert all(a <= b + 1e-12 for a, b in zip(kal[1], kal[1][1:])) and all(a < b for a, b in zip(kal[0], kal[0][1:]))
    ph = [terap_pav(kal, v) for v in s]
    assert abs(sum(ph) / len(ph) - sum(yy) / len(yy)) < 1e-9
    urut = sorted(s)
    assert all(terap_pav(kal, a) <= terap_pav(kal, b) + 1e-12 for a, b in zip(urut, urut[1:]))
    # tanpa kebocoran: fitur di hari d tak berubah bila data setelah d diganti
    D = Data()
    n = 120
    rr = random.Random(2)
    D.kabs = ["1|A"]
    D.cnt = [[rr.choice((0, 0, 1, 3)) for _ in range(n)]]
    D.fs = [bytearray(rr.choice((0, 1)) for _ in range(n))]
    D.gambut = [0.4]
    D.sel = [(0, 0)]
    D.doy = [i % 365 for i in range(n)]
    D.dc = {(0, 0): [rr.random() * 500 for _ in range(n)]}
    D.h30 = {(0, 0): [rr.random() * 300 for _ in range(n)]}
    D.klim = {(0, 0): [150.0] * 365}

    def siap(D):
        c, s2 = [0], []
        last = -10 ** 6
        for d, v in enumerate(D.cnt[0]):
            c.append(c[-1] + v)
            if v:
                last = d
            s2.append(min(d - last, 60))
        D.cum, D.sejak = [c], [s2]
    siap(D)
    f0 = basis(D, 0, 60)
    cnt0, fs0, dc0, h0 = D.cnt[0][:], D.fs[0][:], D.dc[(0, 0)][:], D.h30[(0, 0)][:]
    for d in range(61, n):
        D.cnt[0][d] = 99
        D.fs[0][d] = 1 - D.fs[0][d]
        D.dc[(0, 0)][d] = -5.0
        D.h30[(0, 0)][d] = 1e6
    siap(D)
    assert basis(D, 0, 60) == f0, "fitur hari d memakai data setelah d"
    D.cnt[0][60] += 7                       # hari d sendiri memang boleh dipakai
    siap(D)
    assert basis(D, 0, 60) != f0
    D.cnt[0], D.fs[0], D.dc[(0, 0)], D.h30[(0, 0)] = cnt0, fs0, dc0, h0
    # klimatologi leave-one-year-out tidak memakai tahun target
    tab = [{2019: [[5, 31]] * 12, 2020: [[0, 31]] * 12}]
    assert klim_rate(tab[0], (2019, 2020), 3, kecuali=2019) == 0.5 / 32
    assert klim_rate(tab[0], (2019, 2020), 3) == 5.5 / 63
    # penyamaan jumlah alarm: tepat N meski skor imbang; persistensi disamakan memilih persistensi dulu
    sk = [(1.0, 0.0)] * 50 + [(0.5, 0.0)] * 50
    assert sum(top_n(sk, 30)) == 30 and sum(top_n(sk, 70)) == 70
    yt = [1] * 10 + [0] * 90
    jt = [random.Random(1).random() for _ in range(100)]
    a = top_n([(yt[i], jt[i]) for i in range(100)], 5)
    assert sum(a) == 5 and all(yt[i] for i in range(100) if a[i])
    a = top_n([(yt[i], jt[i]) for i in range(100)], 25)
    assert sum(a) == 25 and all(a[i] for i in range(10))
    # evaluasi + lapisan pada dunia mainan: model sempurna di lapisan awal mengalahkan persistensi; model = persistensi tak lulus
    kr = {"min_alarm": 20, "min_positif": 20, "bootstrap": {"B": 100, "seed": 7}}
    nn = 6000
    rg = random.Random(4)
    lengket = [0]
    for _ in range(nn - 1):
        lengket.append(int(rg.random() < (0.85 if lengket[-1] else 0.03)))
    YT = array.array("b", lengket[:-1] + [0])
    Yv = array.array("b", lengket[1:] + [0])
    BL = array.array("i", [202600 + (i // 100) for i in range(nn)])

    def paket(P, S):
        return {"P": array.array("f", P), "S": array.array("f", S), "Y": Yv, "YT": YT, "CL": array.array("f", [0.05] * nn), "BL": BL, "thr": 0.5}
    ev, _ = evaluasi(paket([float(v) * 0.9 for v in Yv], [float(v) for v in Yv]), None, kr)      # bocor sengaja: model = label
    assert ev["vonis"] == "LULUS", ev["vonis"]
    assert ev["lapisan"]["awal"]["n_baris"] + ev["lapisan"]["lanjutan"]["n_baris"] == nn
    assert ev["lapisan"]["awal"]["positif"] + ev["lapisan"]["lanjutan"]["positif"] == sum(Yv)
    ev, _ = evaluasi(paket([0.5 * v + 0.01 for v in YT], [float(v) for v in YT]), None, kr)      # model = persistensi
    assert ev["vonis"] != "LULUS", ev["vonis"]
    assert ev["alarm_A"] == sum(YT) and abs(ev["ets"]["model_A"] - ev["ets"]["pers_asli"]) < 1e-9
    ev, _ = evaluasi(paket([0.5 * rg.random() for _ in range(nn)], [rg.random() for _ in range(nn)]), None, kr)  # acak
    assert ev["vonis"] != "LULUS", ev["vonis"]
    assert vonis_api({"est": 0.1, "lo": 0.01}, {"est": 0.1, "lo": 0.01}, {"est": .1, "lo": .01}, 5, 50, kr) == "TAK TERUKUR"
    assert vonis_api({"est": -0.1, "lo": -0.2}, {"est": 0.1, "lo": 0.01}, {"est": .1, "lo": .01}, 50, 50, kr) == "TIDAK LULUS"
    assert vonis_api({"est": 0.1, "lo": 0.01}, {"est": 0.1, "lo": -0.01}, {"est": .1, "lo": .01}, 50, 50, kr) == "TIDAK MEYAKINKAN"
    # pembaca npy: tanpa numpy, header dan irisan per kolom
    hd = "{'descr': '<f4', 'fortran_order': False, 'shape': (2, 3, 2), }"
    hd = hd + " " * (62 - len(hd) - 1) + "\n"
    b = b"\x93NUMPY\x01\x00" + struct.pack("<H", len(hd)) + hd.encode() + struct.pack("<12f", *range(12))
    h, o = _hdr_npy(b)
    assert h["shape"] == (2, 3, 2) and o == len(b) - 48
    mv = memoryview(b)[o:].cast("f")
    assert list(mv[1 * 6 + 1: 2 * 6: 2]) == [7.0, 9.0, 11.0]
    # penanggalan: D0 sejajar npz dan 2026-01-01 jatuh tepat sesudah 2025-12-31
    assert hari(OFF * 0).isoformat() == "2018-12-20" and idx(dt.date(2026, 1, 1)) - 1 == (NPZ_AKHIR - NPZ0).days - OFF
    print("peluang_api uji: OK")


if __name__ == "__main__":
    perintah = {"uji": uji, "panen": panen, "coba": coba, "kunci": kunci, "jalan": jalan}
    if len(sys.argv) == 2 and sys.argv[1] in perintah:
        perintah[sys.argv[1]]()
    else:
        sys.exit("pakai: peluang_api.py " + "|".join(perintah))
