"""Kerentanan genangan per kabupaten dari HAND MERIT Hydro -> public/banjir/data/hand_kab.json  (STATUS: MENUNGGU KUNCI)

MERIT Hydro (Yamazaki dkk. 2019, 3 detik busur ~90 m) memuat lapisan `hnd` (Height Above Nearest Drainage, m) dan `upa`
(luas hulu, km2). Pengunduhan memerlukan pendaftaran formulir (https://goo.gl/forms/6VwfnasNjkYm0Wqu2, halaman
https://global-hydrodynamics.github.io/MERIT_Hydro/) dan kata sandi dari pemilik data; MERIT_USER/MERIT_PASS BELUM ada di .env
(diperiksa 29 Okt 2026), jadi unduhan TIDAK dijalankan. Situs lama hydro.iis.u-tokyo.ac.jp/~yamadai sudah dipindah (302 ke situs baru).
Berkas bila akun ada: distribute/v1.0.1/hnd_<n|s>NNe<EEE>.tar dan upa_*.tar (kotak 30x30 derajat; Indonesia: n30e090, n00e090, s30e090,
n00e120, s30e120 sesuai penamaan tar). Ekstrak GeoTIFF ke folder MERIT_DIR.

Rumus (RENCANA-PANEN-DATA.md baris 17):
  rendah(p)   = HAND_p < AMBANG_HAND (5 m)
  bobot(p)    = log10(1 + UPA_p)                 luas hulu km2 (sungai besar membawa debit lebih besar)
  S_kab       = sum_p rendah(p) * bobot(p) / N_darat      N_darat = piksel darat kabupaten (HAND terdefinisi)
  F_rendah    = sum_p rendah(p) / N_darat                 pembanding tanpa bobot hulu
Ini INDEKS kerentanan statis, bukan model prediksi. Diuji sebagai FITUR:
  uji_fitur   korelasi peringkat Spearman S_kab (dan F_rendah) dengan frekuensi deteksi banjir MODIS per kabupaten (mcdwd.py arsip,
              hari berawan dibuang) + CI 95% bootstrap kabupaten; fitur dianggap berguna bila batas bawah CI S_kab > batas atas CI
              F_rendah ATAU rho(S) > 0,3 dengan CI > 0 (ditulis sebelum data). Hasil ditulis apa adanya.
Pakai:  MERIT_DIR=/jalur/geotiff python3 scripts/banjir/hand_kab.py hitung    (lab; butuh numpy+rasterio; stdlib tidak cukup untuk 235 juta piksel)
        python3 scripts/banjir/hand_kab.py uji
"""
import json, math, os, random, sys

sys.path.insert(0, os.path.dirname(__file__))
AMBANG_HAND = 5.0
LANGKAH = 4          # ambil tiap 4 piksel (~360 m) saat menentukan kabupaten per piksel (poligon kecamatan sudah disederhanakan)


def kerentanan(hand, upa, kab, n_kab, ambang=AMBANG_HAND):
    """hand, upa, kab: deret sejajar (None/NaN = tak ada data). -> (S, F_rendah, N_darat) per kab; kab bernilai None/negatif diabaikan."""
    s, f, n = [0.0] * n_kab, [0] * n_kab, [0] * n_kab
    for h, u, k in zip(hand, upa, kab):
        if k is None or k < 0 or h is None or h != h:
            continue
        n[k] += 1
        if h < ambang:
            f[k] += 1
            s[k] += math.log10(1 + (u if u is not None and u == u and u > 0 else 0))
    return ([a / b if b else None for a, b in zip(s, n)], [a / b if b else None for a, b in zip(f, n)], n)


def peringkat(xs):
    ur = sorted(range(len(xs)), key=lambda i: xs[i])
    r, i = [0.0] * len(xs), 0
    while i < len(ur):
        j = i
        while j + 1 < len(ur) and xs[ur[j + 1]] == xs[ur[i]]:
            j += 1
        for k in range(i, j + 1):
            r[ur[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(x, y):
    if len(x) < 3:
        return None
    rx, ry = peringkat(x), peringkat(y)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    sx = math.sqrt(sum((a - mx) ** 2 for a in rx))
    sy = math.sqrt(sum((b - my) ** 2 for b in ry))
    return sum((a - mx) * (b - my) for a, b in zip(rx, ry)) / (sx * sy) if sx and sy else None


def ci_spearman(x, y, ulang=1000, seed=3):
    r, n, xs = random.Random(seed), len(x), []
    for _ in range(ulang):
        ix = [r.randrange(n) for _ in range(n)]
        v = spearman([x[i] for i in ix], [y[i] for i in ix])
        if v is not None:
            xs.append(v)
    xs.sort()
    return [round(xs[int(.025 * (len(xs) - 1))], 3), round(xs[int(.975 * (len(xs) - 1))], 3)] if xs else None


def frekuensi_mcdwd(min_px=2, min_tutupan=0.5):
    """Arsip lab mcdwd.py -> ({kab: hari terdeteksi / hari berawan-dibuang}, jumlah_hari)."""
    import mcdwd
    peta, arsip = mcdwd.muat_peta(), mcdwd.baca_arsip()
    ya, tot = [0] * len(peta["kab"]), [0] * len(peta["kab"])
    for tabel in arsip.values():
        for i, t in enumerate(tabel):
            f, tut = mcdwd.banjir_valid(t)
            if f >= min_px:
                ya[i] += 1
                tot[i] += 1
            elif tut is not None and tut >= min_tutupan:
                tot[i] += 1
    return {k: (ya[i] / tot[i]) for i, k in enumerate(peta["kab"]) if tot[i] >= 100 and peta["n"][i] >= 30}, len(arsip)


def uji_fitur(hand_kab, freq):
    """hand_kab = {kab: {"S":..,"F":..}} ; freq = {kab: frekuensi banjir MODIS}. -> dict hasil."""
    ks = sorted(k for k in hand_kab if k in freq and hand_kab[k]["S"] is not None)
    y = [freq[k] for k in ks]
    out = {"n_kab": len(ks)}
    for nama in ("S", "F"):
        x = [hand_kab[k][nama] for k in ks]
        out[nama] = {"rho": round(spearman(x, y), 3), "ci95": ci_spearman(x, y)}
    s, f = out["S"], out["F"]
    out["berguna"] = bool(s["ci95"][0] > f["ci95"][1] or (s["rho"] > 0.3 and s["ci95"][0] > 0))
    return out


def hitung():
    d = os.environ.get("MERIT_DIR", "")
    if not d or not os.path.isdir(d):
        print("MENUNGGU KUNCI: MERIT_USER/MERIT_PASS belum ada di .env dan MERIT_DIR tidak menunjuk GeoTIFF hnd/upa MERIT Hydro. Tidak ada yang dihitung.")
        return 2
    raise SystemExit("jalur rasterio belum dilengkapi: tunggu berkas MERIT Hydro (lihat docstring), lalu isi pembaca ubin di sini")


def uji():
    # kerentanan: 6 piksel di 2 kab
    hand = [1, 6, 4, 10, 0.5, None]
    upa = [1000, 5, 99, 1, 0, 3]
    kab = [0, 0, 0, 1, 1, 1]
    s, f, n = kerentanan(hand, upa, kab, 2)
    assert n == [3, 2] and f == [2 / 3, 1 / 2]
    assert abs(s[0] - (math.log10(1001) + math.log10(100)) / 3) < 1e-12 and abs(s[1] - 0.0) < 1e-12 and s[1] == 0.0
    # Spearman: monoton, antimonoton, ties
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-12 and abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12
    assert abs(spearman([1, 1, 2, 2], [1, 2, 1, 2])) < 1e-12 and spearman([1, 1, 1], [1, 2, 3]) is None
    # uji_fitur pada data sintetis: S berkorelasi dengan frekuensi, F dibuat derau
    r = random.Random(5)
    hk, fr = {}, {}
    for i in range(80):
        s_ = r.random()
        hk[str(i)] = {"S": s_, "F": r.random()}
        fr[str(i)] = s_ * 0.2 + r.random() * 0.03
    o = uji_fitur(hk, fr)
    assert o["S"]["rho"] > 0.8 and abs(o["F"]["rho"]) < 0.4 and o["berguna"], o
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if not a or a[0] == "uji" else sys.exit(hitung())
