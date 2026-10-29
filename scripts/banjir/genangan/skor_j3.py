"""Penilai J3 (PRAREG-J3.md, bagian Metrik): fungsi murni atas raster kedalaman maks (mesin.mjs --raster) dan laporan (mesin.mjs label).
Raster: gz json {nx, ny, dx_m, lon0, lat0, dlon, dlat, nama[kec], kec(int16 b64, -1 = luar DKI/laut), hm(float32 b64, m)}.
Laporan: [{t, lon, lat, kedalaman_cm, kab, kec}] sudah di dalam DKI, tanpa duplikat. Laporan di luar kisi DEM (mis. Kepulauan Seribu) TIDAK dihitung (penyebut ikut berkurang).
Pakai:  python3 scripts/banjir/genangan/skor_j3.py uji
"""
import array, base64, gzip, json, math, random, sys

AMBANG, RADIUS, KEC_MIN = 0.10, 300.0, 0.05   # cermin blok BEKU PRAREG-J3.md (ambang_basah_m, radius_laporan_m, kec_basah_min_frac)


def baca_raster(jalur):
    R = json.load(gzip.open(jalur, "rt"))
    for k, kode in (("kec", "h"), ("hm", "f")):
        a = array.array(kode); a.frombytes(base64.b64decode(R[k])); R[k] = a
    return R


def maks_sekitar(R, lon, lat, radius=RADIUS):
    """Kedalaman maks (m) sel dalam radius meter dari titik; None bila titik di luar kisi."""
    ci, cj = (lon - R["lon0"]) / R["dlon"], (R["lat0"] - lat) / R["dlat"]
    if not (-.5 <= ci < R["nx"] - .5 and -.5 <= cj < R["ny"] - .5):
        return None
    r, m = math.ceil(radius / R["dx_m"]), 0.0
    for j in range(max(0, round(cj) - r), min(R["ny"], round(cj) + r + 1)):
        for i in range(max(0, round(ci) - r), min(R["nx"], round(ci) + r + 1)):
            if math.hypot(i - ci, j - cj) * R["dx_m"] <= radius:
                m = max(m, R["hm"][j * R["nx"] + i])
    return m


def nilai_laporan(R, lap):
    """-> [(laporan, kedalaman_model_m)] hanya laporan di dalam kisi."""
    out = []
    for r in lap:
        m = maks_sekitar(R, r["lon"], r["lat"])
        if m is not None:
            out.append((r, m))
    return out


def per_kec(R):
    """{nama: (sel_darat, sel_basah)}"""
    n = [0] * len(R["nama"]); b = [0] * len(R["nama"])
    for c, h in zip(R["kec"], R["hm"]):
        if c >= 0:
            n[c] += 1; b[c] += h >= AMBANG
    return {R["nama"][i]: (n[i], b[i]) for i in range(len(n)) if n[i]}


def luas_basah(R):
    d = per_kec(R); tot = sum(n for n, _ in d.values())
    return sum(b for _, b in d.values()) / tot if tot else 0.0


def pod(nl, ambang=AMBANG):
    return sum(m >= ambang for _, m in nl) / len(nl) if nl else None


def ambang_untuk_luas(R, frac):
    """Ambang kedalaman (m) yang membuat fraksi sel darat basah ~ frac (pembanding pada luas basah SAMA). frac <= 0 -> tak ada yang basah."""
    h = sorted((v for c, v in zip(R["kec"], R["hm"]) if c >= 0), reverse=True); k = round(frac * len(h))
    return float("inf") if k <= 0 else max(h[min(k, len(h)) - 1], 1e-9)


def raster_acak(R, frac, benih=7):
    """Pembanding bodoh: sel darat acak sebanyak luas basah model (hm 1 m di sel terpilih)."""
    idx = [i for i, c in enumerate(R["kec"]) if c >= 0]; ya = set(random.Random(benih).sample(idx, round(frac * len(idx))))
    return {**R, "hm": array.array("f", [1.0 if i in ya else 0.0 for i in range(len(R["hm"]))])}


def presisi(R, lap):
    """Bagian sel basah (darat) yang punya laporan dalam radius; None bila tak ada sel basah. Pelengkap luas basah (laporan bukan bukti kering)."""
    r = math.ceil(RADIUS / R["dx_m"]); dekat = set()
    for x in lap:
        ci, cj = (x["lon"] - R["lon0"]) / R["dlon"], (R["lat0"] - x["lat"]) / R["dlat"]
        for j in range(max(0, round(cj) - r), min(R["ny"], round(cj) + r + 1)):
            for i in range(max(0, round(ci) - r), min(R["nx"], round(ci) + r + 1)):
                if math.hypot(i - ci, j - cj) * R["dx_m"] <= RADIUS:
                    dekat.add(j * R["nx"] + i)
    basah = [i for i, (c, v) in enumerate(zip(R["kec"], R["hm"])) if c >= 0 and v >= AMBANG]
    return sum(i in dekat for i in basah) / len(basah) if basah else None


def galat_median(nl):
    g = sorted(abs(m * 100 - r["kedalaman_cm"]) for r, m in nl if (r["kedalaman_cm"] or 0) > 0)
    return None if not g else (g[len(g) // 2] if len(g) % 2 else (g[len(g) // 2 - 1] + g[len(g) // 2]) / 2)


def kec_basah(R):
    return {k for k, (n, b) in per_kec(R).items() if b / n >= KEC_MIN}


def tanpa_laporan_basah(R, nl):
    """Bagian kecamatan tanpa satu pun laporan yang basah; None bila kejadian < 100 laporan (kriteria tak berlaku)."""
    if len(nl) < 100:
        return None
    ada = {f"{r['kab']}|{r['kec']}" for r, _ in nl}
    kosong = [k for k in per_kec(R) if k not in ada]
    return None if not kosong else sum(k in kec_basah(R) for k in kosong) / len(kosong)


def _rank(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]:
            j += 1
        for k in range(i, j + 1):
            r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(x, y):
    a, b = _rank(x), _rank(y); ma, mb = sum(a) / len(a), sum(b) / len(b)
    sa = math.sqrt(sum((p - ma) ** 2 for p in a)); sb = math.sqrt(sum((q - mb) ** 2 for q in b))
    return None if not sa or not sb else sum((p - ma) * (q - mb) for p, q in zip(a, b)) / (sa * sb)


def p90_kec(R):
    """{nama: kedalaman p90 sel darat (m)} peringkat model untuk Spearman."""
    v = {}
    for c, h in zip(R["kec"], R["hm"]):
        if c >= 0:
            v.setdefault(R["nama"][c], []).append(h)
    return {k: sorted(x)[min(len(x) - 1, int(.9 * len(x)))] for k, x in v.items()}


def inarisk_ya(R, bahaya, target_frac):
    """Pembanding (a): kecamatan diurut skor InaRISK banjir (turun, lalu nama) dan ditandai sampai luas darat >= target_frac luas DKI di raster."""
    d = per_kec(R); tot = sum(n for n, _ in d.values()); out, luas = set(), 0
    for k in sorted(d, key=lambda k: (-bahaya.get("31|" + k, {}).get("banjir", 0), k)):
        if luas >= target_frac * tot:
            break
        out.add(k); luas += d[k][0]
    return out


def pod_kec(nl, kec_ya):
    return sum(f"{r['kab']}|{r['kec']}" in kec_ya for r, _ in nl) / len(nl) if nl else None


def bootstrap_pod(per_hari, ulangan=1000, benih=7):
    """per_hari: {hari: (kena, jumlah)} -> (POD, bawah95, atas95); resampling hari WIB. Untuk selisih dua metode kirim hits berpasangan lewat bootstrap_selisih."""
    h = list(per_hari.values()); rng = random.Random(benih); s = []
    for _ in range(ulangan):
        x = [h[rng.randrange(len(h))] for _ in h]; n = sum(b for _, b in x)
        s.append(sum(a for a, _ in x) / n if n else 0)
    s.sort(); t = sum(a for a, _ in h) / sum(b for _, b in h)
    return t, s[int(.025 * ulangan)], s[int(.975 * ulangan) - 1]


def bootstrap_selisih(per_hari_a, per_hari_b, ulangan=1000, benih=7):
    """POD(a) - POD(b), hari yang sama dipilih untuk keduanya -> (titik, bawah95, atas95)."""
    hr = sorted(per_hari_a); rng = random.Random(benih); s = []
    f = lambda H, d: sum(H[x][0] for x in d) / max(1, sum(H[x][1] for x in d))
    for _ in range(ulangan):
        d = [hr[rng.randrange(len(hr))] for _ in hr]; s.append(f(per_hari_a, d) - f(per_hari_b, d))
    s.sort(); return f(per_hari_a, hr) - f(per_hari_b, hr), s[int(.025 * ulangan)], s[int(.975 * ulangan) - 1]


def per_hari(nl, ya):
    """ya(m, r) -> bool; {hari WIB: (kena, jumlah)}"""
    o = {}
    for r, m in nl:
        a, b = o.get(r["t"][:10], (0, 0)); o[r["t"][:10]] = (a + bool(ya(m, r)), b + 1)
    return o


def uji():
    nx = ny = 6; hm = array.array("f", [0.0] * 36); kec = array.array("h", [0] * 18 + [1] * 18)
    hm[7] = 0.5; hm[8] = 0.05                      # sel (1,1) basah 50 cm; (2,1) 5 cm
    R = {"nx": nx, "ny": ny, "dx_m": 100.0, "lon0": 0.0, "lat0": 0.0, "dlon": 1e-3, "dlat": 1e-3, "nama": ["A|a", "B|b"], "kec": kec, "hm": hm}
    assert abs(maks_sekitar(R, 1e-3, -1e-3) - 0.5) < 1e-9 and maks_sekitar(R, 5e-3, -5e-3) == 0 and maks_sekitar(R, .1, .1) is None
    lap = [{"t": "2024-08-17T10:00:00+07:00", "lon": 1e-3, "lat": -1e-3, "kedalaman_cm": 30, "kab": "A", "kec": "a"},
           {"t": "2024-08-18T10:00:00+07:00", "lon": 5e-3, "lat": -5e-3, "kedalaman_cm": 20, "kab": "B", "kec": "b"}]
    nl = nilai_laporan(R, lap)
    assert pod(nl) == 0.5 and galat_median(nl) == 20 and luas_basah(R) == 1 / 36
    assert kec_basah(R) == {"A|a"} and tanpa_laporan_basah(R, nl) is None   # 1/18 = 5,6% >= 5%; < 100 laporan = tak berlaku
    assert abs(spearman([1, 2, 3, 4], [1, 2, 3, 4]) - 1) < 1e-9 and abs(spearman([1, 2, 3], [3, 2, 1]) + 1) < 1e-9 and abs(spearman([1, 1, 2], [1, 2, 3]) - .866) < 1e-2
    b = {"31|A|a": {"banjir": .1}, "31|B|b": {"banjir": .9}}
    assert inarisk_ya(R, b, .5) == {"B|b"} and pod_kec(nl, {"B|b"}) == 0.5
    ph = per_hari(nl, lambda m, r: m >= AMBANG)
    assert ph == {"2024-08-17": (1, 1), "2024-08-18": (0, 1)}
    t, lo, hi = bootstrap_pod({str(i): (1, 1) for i in range(20)}); assert t == 1 and lo == 1
    s = bootstrap_selisih({"a": (1, 1), "b": (1, 1), "c": (1, 1)}, {"a": (0, 1), "b": (0, 1), "c": (0, 1)}); assert s[0] == 1 and s[1] == 1
    import kunci_j3
    B = kunci_j3.beku(); assert (AMBANG, RADIUS, KEC_MIN) == (B["ambang_basah_m"], B["radius_laporan_m"], B["kec_basah_min_frac"]), "konstanta cermin beda dari blok BEKU"
    assert ambang_untuk_luas(R, 1 / 36) == 0.5 and ambang_untuk_luas(R, 0) == float("inf") and pod(nl, 0.6) == 0.0
    assert sum(1 for c, v in zip(R["kec"], raster_acak(R, 1 / 3)["hm"]) if v) == 12
    assert presisi(R, lap[:1]) == 1.0 and presisi(R, lap[1:]) == 0.0
    print("ok")


if __name__ == "__main__":
    sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
    uji() if sys.argv[1:] == ["uji"] else sys.exit(__doc__)
