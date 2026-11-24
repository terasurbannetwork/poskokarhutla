"""Pembanding generik untuk uji balik (KI-10). Python stdlib saja, fungsi murni.

Konvensi: baris = dict; y = 0/1; hari = int. Tidak ada jaringan, tidak ada berkas.
Pemakai: udara METAR (KI-05), rob (KI-06), dan seterusnya. Tidak memigrasikan
implementasi bersidik yang lama (banjir, gempa).

  python3 -I scripts/umum/pembanding.py uji
"""
import math
import random
import sys


def persistensi(seri, k=1):
    """seri = {unit: {hari: nilai}} (nilai pada tanggal PERTAMA dicatat, bukan
    revisi susulan, supaya tidak bocor). Prakiraan hari h+k = nilai hari h.
    Keluaran {(unit, hari_target): nilai}. Hari tanpa catatan tidak diisi."""
    if k < 1:
        raise ValueError(f"lead k={k} < 1: persistensi k<=0 membocorkan masa depan")
    return {(u, h + k): v for u, s in seri.items() for h, v in s.items()}


def klimatologi(latih, uji, kunci=("unit", "bulan")):
    """Laju per kunci dari baris LATIH saja, disusutkan (k+0,5)/(n+1), lalu
    dipasang ke baris UJI. Kunci tak pernah terlihat di latih -> laju gabungan
    latih (k_total+0,5)/(n_total+1). Keluaran list prob sejajar `uji`."""
    kn = {}
    for r in latih:
        c = kn.setdefault(tuple(r[f] for f in kunci), [0, 0])
        c[0] += int(r["y"])
        c[1] += 1
    kt = sum(c[0] for c in kn.values())
    nt = sum(c[1] for c in kn.values())
    umum = (kt + 0.5) / (nt + 1)
    out = []
    for r in uji:
        c = kn.get(tuple(r[f] for f in kunci))
        out.append((c[0] + 0.5) / (c[1] + 1) if c else umum)
    return out


def samakan_alarm(alarm_model, skor_pembanding, y, pecah=None):
    """Cari ambang pada skor pembanding (alarm = skor >= ambang) yang memberi
    jumlah alarm SAMA dengan model (alarm_model = list bool).
    Tanpa `pecah`: skor imbang tak bisa dipisah, jadi hanya jumlah kumulatif di
    nilai skor berbeda yang tercapai; selain itu kembalikan None dan pemanggil
    WAJIB melaporkannya.
    Dengan `pecah` (list kunci stabil sejajar skor, mis. (hari, unit)): imbang di
    ambang dipecah deterministik menurut kunci itu, jadi jumlah alarm selalu
    tepat sama; `imbang_dipecah` True menandai bahwa itu terjadi (wajib dilaporkan).
    Keluaran {"ambang","alarm","n_alarm","imbang_dipecah"} atau None.
    Model tanpa alarm: ambang None (bukan inf, supaya JSON sah)."""
    n = len(y)
    if not (len(alarm_model) == len(skor_pembanding) == n):
        raise ValueError(f"panjang beda: model={len(alarm_model)} pembanding={len(skor_pembanding)} y={n}")
    if pecah is not None and len(pecah) != n:
        raise ValueError(f"panjang pecah {len(pecah)} beda dengan y={n}")
    na = sum(1 for a in alarm_model if a)
    if na == 0:
        return {"ambang": None, "alarm": [False] * n, "n_alarm": 0, "imbang_dipecah": False}
    if pecah is not None:
        urut = sorted(range(n), key=lambda i: (-skor_pembanding[i], pecah[i]))
        pilih = set(urut[:na]); amb = skor_pembanding[urut[na - 1]]
        dipecah = na < n and skor_pembanding[urut[na]] == amb
        return {"ambang": amb, "alarm": [i in pilih for i in range(n)], "n_alarm": na, "imbang_dipecah": dipecah}
    uniq = sorted(set(skor_pembanding), reverse=True)
    for u in uniq:
        c = sum(1 for s in skor_pembanding if s >= u)
        if c == na:
            return {"ambang": u, "alarm": [s >= u for s in skor_pembanding], "n_alarm": c, "imbang_dipecah": False}
        if c > na:
            return None
    return None


def _bagi(a, b):
    return a / b if b else None


def kontingensi(pred, y):
    tp = sum(1 for p, o in zip(pred, y) if p and o)
    fp = sum(1 for p, o in zip(pred, y) if p and not o)
    fn = sum(1 for p, o in zip(pred, y) if not p and o)
    tn = len(y) - tp - fp - fn
    n = len(y)
    pod = _bagi(tp, tp + fn)
    hr = _bagi((tp + fn) * (tp + fp), n)
    ets = _bagi(tp - hr, tp + fp + fn - hr) if hr is not None else None
    pofd = _bagi(fp, fp + tn)
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn, "pod": pod,
            "far": _bagi(fp, tp + fp), "csi": _bagi(tp, tp + fp + fn), "ets": ets,
            "pss": None if pod is None or pofd is None else pod - pofd}


def brier(p, y):
    if len(p) != len(y) or not y:
        raise ValueError(f"brier butuh panjang sama dan tak kosong: p={len(p)} y={len(y)}")
    return sum((a - b) ** 2 for a, b in zip(p, y)) / len(y)


def bss(p, y, p_ref):
    """1 - Brier(model)/Brier(acuan); None bila acuan sempurna (Brier 0)."""
    b0 = brier(p_ref, y)
    return None if b0 == 0 else 1 - brier(p, y) / b0


def auc(skor, y):
    """Mann-Whitney, imbang 0,5. None bila satu kelas kosong."""
    pos = [s for s, o in zip(skor, y) if o]
    neg = [s for s, o in zip(skor, y) if not o]
    if not pos or not neg:
        return None
    w = sum(1.0 if a > b else 0.5 if a == b else 0.0 for a in pos for b in neg)
    return w / (len(pos) * len(neg))


def bootstrap_blok(fn, data, blok_key, B=300, seed=7):
    """CI95 berpasangan atas selisih. data = list baris yang memuat KEDUA skor
    (model dan pembanding); fn(baris)->selisih. Blok diundi dengan pengembalian
    dan satu indeks ulang dipakai untuk keduanya, jadi berpasangan dengan
    konstruksi. Keluaran {"est","lo","hi","B","n_blok","tak_terdefinisi"}."""
    blok = {}
    for r in data:
        blok.setdefault(r[blok_key], []).append(r)
    kunci = sorted(blok, key=repr)
    if len(kunci) < 2:
        raise ValueError(f"bootstrap blok butuh >= 2 blok, dapat {len(kunci)} (kunci '{blok_key}')")
    rng = random.Random(seed)
    nilai, gagal = [], 0
    for _ in range(B):
        sampel = [r for k in (rng.choice(kunci) for _ in kunci) for r in blok[k]]
        v = fn(sampel)
        if v is None or v != v:
            gagal += 1
        else:
            nilai.append(v)
    if gagal > 0.05 * B:   # membuang ulangan tak terdefinisi diam-diam membiaskan persentil
        return {"est": fn(data), "lo": None, "hi": None, "B": B, "n_blok": len(kunci), "tak_terdefinisi": gagal,
                "alasan": f"{gagal} dari {B} ulangan tak terdefinisi (> 5%): selang tidak dilaporkan"}
    nilai.sort()
    m = len(nilai)
    return {"est": fn(data), "lo": nilai[int(0.025 * (m - 1))], "hi": nilai[math.ceil(0.975 * (m - 1))],
            "B": B, "n_blok": len(kunci), "tak_terdefinisi": gagal}


def pilih_wilayah(validasi, param_nasional, param_wilayah):
    """validasi = list baris dengan "y"; param_* = fungsi baris -> prob.
    Parameter wilayah dipakai HANYA bila Brier DAN log-likelihood validasi
    keduanya lebih baik daripada nasional; selain itu nasional."""
    if not validasi:
        return {"pilih": "nasional", "n": 0, "alasan": "validasi kosong"}
    eps = 1e-9

    def ll(f):
        s = 0.0
        for r in validasi:
            p = min(max(f(r), eps), 1 - eps)
            s += math.log(p) if r["y"] else math.log(1 - p)
        return s
    y = [r["y"] for r in validasi]
    bn = brier([param_nasional(r) for r in validasi], y)
    bw = brier([param_wilayah(r) for r in validasi], y)
    ln, lw = ll(param_nasional), ll(param_wilayah)
    ok = bw < bn and lw > ln
    return {"pilih": "wilayah" if ok else "nasional", "n": len(validasi),
            "brier_nasional": bn, "brier_wilayah": bw, "ll_nasional": ln, "ll_wilayah": lw,
            "alasan": "Brier dan LL wilayah lebih baik" if ok else
            f"wilayah tak lebih baik di keduanya (Brier {bw:.4f} vs {bn:.4f}, LL {lw:.3f} vs {ln:.3f})"}


def uji():
    def hampir(a, b):
        return abs(a - b) < 1e-9

    def tolak(f, *a):
        try:
            f(*a)
        except ValueError:
            return
        raise AssertionError(f"{f.__name__} seharusnya ValueError")
    # persistensi: nilai hari 3 jadi prakiraan hari 4; k=0 ditolak (bocor)
    assert persistensi({"A": {3: 1, 4: 0}}, 1) == {("A", 4): 1, ("A", 5): 0}
    tolak(persistensi, {"A": {1: 1}}, 0)
    # klimatologi: A-1: 1 dari 3 -> 1,5/4=0,375; unit tak dikenal -> gabungan (1+0,5)/(3+1)
    lat = [{"unit": "A", "bulan": 1, "y": 1}, {"unit": "A", "bulan": 1, "y": 0}, {"unit": "A", "bulan": 1, "y": 0}]
    r = klimatologi(lat, [{"unit": "A", "bulan": 1}, {"unit": "B", "bulan": 1}])
    assert hampir(r[0], 0.375) and hampir(r[1], 0.375), r
    r = klimatologi(lat + [{"unit": "C", "bulan": 2, "y": 1}], [{"unit": "A", "bulan": 1}, {"unit": "Z", "bulan": 9}])
    assert hampir(r[0], 0.375) and hampir(r[1], 2.5 / 5), r
    # alarm sama: model 2 alarm; skor 9,8,8,1 -> ambang 8 memberi 3 alarm (imbang) -> None
    y = [1, 0, 1, 0]
    assert samakan_alarm([1, 0, 1, 0], [9, 8, 8, 1], y) is None
    s = samakan_alarm([1, 0, 1, 0], [9, 8, 7, 1], y)
    assert s["ambang"] == 8 and s["alarm"] == [True, True, False, False], s
    n0 = samakan_alarm([0, 0, 0, 0], [9, 8, 7, 1], y)
    assert n0["n_alarm"] == 0 and not any(n0["alarm"]) and n0["ambang"] is None  # bukan inf: JSON sah
    import json as _j; _j.dumps(n0, allow_nan=False)
    # imbang dipecah deterministik menurut kunci: jumlah alarm tepat sama dan ditandai
    p = samakan_alarm([1, 0, 1, 0], [9, 8, 8, 1], y, pecah=[3, 2, 1, 0])
    assert p["n_alarm"] == 2 and p["alarm"] == [True, False, True, False] and p["imbang_dipecah"], p
    assert samakan_alarm([1, 0, 1, 0], [9, 8, 7, 1], y, pecah=[0, 1, 2, 3])["imbang_dipecah"] is False
    tolak(samakan_alarm, [1, 0], [1, 2], [1, 0], [0])
    tolak(samakan_alarm, [1], [1, 2], [1])
    # kontingensi tangan: tp2 fp1 fn1 tn4 (N=8): pod 2/3, far 1/3, csi 2/4,
    # hr=3*3/8=1,125, ets=(2-1,125)/(4-1,125), pss=2/3-1/5
    k = kontingensi([1, 1, 1, 0, 0, 0, 0, 0], [1, 1, 0, 1, 0, 0, 0, 0])
    assert (k["tp"], k["fp"], k["fn"], k["tn"]) == (2, 1, 1, 4), k
    assert hampir(k["pod"], 2 / 3) and hampir(k["far"], 1 / 3) and hampir(k["csi"], 0.5)
    assert hampir(k["ets"], 0.875 / 2.875) and hampir(k["pss"], 2 / 3 - 0.2)
    # nol alarm: far, csi tak terdefinisi tidak meledak; semua positif: pss None
    k0 = kontingensi([0, 0], [1, 0])
    assert k0["far"] is None and k0["pod"] == 0
    assert kontingensi([1, 1], [1, 1])["pss"] is None
    # brier / bss / auc: p=[.8,.2] y=[1,0] -> .04 ; acuan [.5,.5] -> .25 ; bss=.84
    assert hampir(brier([0.8, 0.2], [1, 0]), 0.04)
    assert hampir(bss([0.8, 0.2], [1, 0], [0.5, 0.5]), 0.84)
    assert bss([0.8], [1], [1.0]) is None
    tolak(brier, [], [])
    assert auc([0.9, 0.8, 0.8, 0.1], [1, 1, 0, 0]) == 0.875  # (1+1+.5+1)/4... pos{.9,.8} neg{.8,.1}: 1+1+.5+1=3,5/4
    assert auc([1, 2], [1, 1]) is None
    # bootstrap blok: model selalu lebih baik 0,1 -> CI tepat 0,1; blok tunggal ditolak
    d = [{"b": i // 2, "m": 0.9, "p": 0.8} for i in range(10)]
    fn = lambda rs: sum(r["m"] - r["p"] for r in rs) / len(rs)
    c = bootstrap_blok(fn, d, "b", B=50)
    assert hampir(c["lo"], 0.1) and hampir(c["hi"], 0.1) and c["n_blok"] == 5, c
    assert bootstrap_blok(fn, d, "b", B=50) == c  # benih tetap
    tolak(bootstrap_blok, fn, [{"b": 1, "m": 1, "p": 0}], "b")
    # selisih berubah tanda antar blok -> CI melebar melewati 0
    d2 = [{"b": i, "m": 1.0 if i % 2 else 0.0, "p": 0.5} for i in range(12)]
    c2 = bootstrap_blok(fn, d2, "b", B=300)
    assert c2["lo"] < 0 < c2["hi"], c2
    # > 5% ulangan tak terdefinisi: selang tidak dilaporkan (tidak dibuang diam-diam)
    d3 = [{"b": i, "m": 1.0, "p": 0.0} for i in range(20)]
    c3 = bootstrap_blok(lambda rs: None if any(r["b"] == 0 for r in rs) else 1.0, d3, "b", B=200)
    assert c3["lo"] is None and c3["hi"] is None and c3["tak_terdefinisi"] > 10, c3
    # pilih_wilayah: wilayah lebih baik di keduanya -> wilayah; hanya Brier -> nasional
    v = [{"y": 1}, {"y": 1}, {"y": 0}, {"y": 0}]
    assert pilih_wilayah(v, lambda r: 0.5, lambda r: 0.8 if r["y"] else 0.2)["pilih"] == "wilayah"
    assert pilih_wilayah(v, lambda r: 0.5, lambda r: 0.5)["pilih"] == "nasional"  # sama persis
    # Brier lebih baik tetapi LL lebih buruk: satu tebakan 0 yang yakin dan salah
    v3 = [{"i": i, "y": 1 if i < 4 else 0} for i in range(8)]
    pj = [0.99, 0.99, 0.99, 0.0, 0, 0, 0, 0]
    pw = pilih_wilayah(v3, lambda r: 0.5, lambda r: pj[r["i"]])
    assert pw["pilih"] == "nasional" and pw["brier_wilayah"] < pw["brier_nasional"] and pw["ll_wilayah"] < pw["ll_nasional"], pw
    assert pilih_wilayah([], None, None)["pilih"] == "nasional"
    print("pembanding uji: OK")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit("pakai: pembanding.py uji")
