"""Koreksi bias prakiraan hujan IFS -> ERA5: quantile mapping empiris per WILAYAH x tenggang x musim.

Model banjir dilatih dengan hujan ERA5 (prakiraan sempurna) tetapi operasi memakai ECMWF IFS (hujan.py).
Skrip ini memasangkan IFS historis (Open-Meteo Previous Runs, tenggang +1..+3, hari WIB) dengan ERA5 hari yang sama
(Archive API), lalu mempelajari pemetaan kuantil IFS -> ERA5.

  python3 scripts/banjir/koreksi_bias.py panen   # tarik+cache ke data/raw/banjir/koreksi_bias/ (bisa dilanjut)
  python3 scripts/banjir/koreksi_bias.py latih   # -> public/banjir/data/koreksi_bias.json
  python3 scripts/banjir/koreksi_bias.py nilai   # validasi silang leave-one-year-out + dampak ke ambang status
  python3 scripts/banjir/koreksi_bias.py uji     # swauji tanpa jaringan

Hanya HUJAN yang dipakai, TIDAK ADA label banjir, jadi 2024-2025 (yang sudah 'terbakar' untuk label uji balik) tetap
sah dipakai di sini: tidak ada keputusan model yang disetel pada label tahun itu.
Impor: koreksi(nilai_mm, wilayah, tenggang, bulan) -> mm ERA5-setara (fungsi murni; tabel dibaca sekali).
"""
import bisect, datetime as dt, hashlib, json, random, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from umum import ambil, simpan, baca, KuotaHabis, KELUAR, MENTAH, WIB

CACHE = os.path.join(MENTAH, "koreksi_bias")
SAMPEL = os.path.join(os.path.dirname(__file__), "../../data/banjir/kab2_ops/sampel.json")
KELUARAN = os.path.join(KELUAR, "koreksi_bias.json")
MULAI = dt.date(2024, 1, 1)        # Previous Runs IFS mulai 2024 (diperiksa 3 Nov 2026: 2020-2023 semuanya null)
AKHIR_TETAP = dt.date(2026, 10, 18)   # batas panen (koordinator 4 Nov): jangan lewat
JEDA_ERA5 = 6                      # hari: ERA5 arsip tertinggal ~5 hari
PER_PANGGIL = 3                    # 10 sel/panggilan menggantung berjam-jam di Open-Meteo (3 Nov 2026); 3 sel selesai ~2 dtk
TENGGANG = (1, 2, 3)
WILAYAH = ("Sumatera", "Jawa", "Kalimantan", "Lainnya")   # Lainnya = Sulawesi + Bali-NT + Maluku + Papua (PRAREG-CAMPUR 3.2b)
MUSIM = ("DJF", "MAM", "JJA", "SON")
N_POOL = 20                        # SEL-TAHUN independen minimum agar (wilayah,tenggang,musim) berdiri sendiri; bobot = min(1, sel_tahun/N_POOL).
                                   # Hari-sel tetangga berkorelasi kuat, jadi n hari-sel (dulu 300) terlalu longgar
KUANTIL = list(range(1, 100))
RASIO_EKOR = (0.5, 2.0)            # pengali di atas p99 dijepit
BASAH = 1.0                        # mm: ambang hari basah


def wilayah_dari_prov(p):
    p = int(p)
    return "Sumatera" if 11 <= p <= 21 else "Jawa" if 31 <= p <= 36 else "Kalimantan" if 61 <= p <= 65 else "Lainnya"


def musim_dari_bulan(b):
    return MUSIM[(b % 12) // 3]   # 12,1,2 -> DJF


def sel_sampel():
    """-> {(lat, lon): wilayah} dari sampel kab model kab (PRAREG-KAB2)."""
    out = {}
    for k, v in baca(SAMPEL)["sk"].items():
        for c in v:
            out[(c[0], c[1])] = wilayah_dari_prov(k.split("|")[0])
    return out


# ---------- panen ----------
def _harian(jam, n_hari):
    """Deret per jam (24 x n_hari) -> jumlah per hari WIB; None bila ada jam kosong."""
    out = []
    for i in range(n_hari):
        x = jam[24 * i:24 * i + 24]
        out.append(None if len(x) < 24 or any(v is None for v in x) else round(sum(x), 2))
    return out


def _rentang():
    akhir = min(dt.datetime.now(WIB).date() - dt.timedelta(days=JEDA_ERA5), AKHIR_TETAP)
    for y in range(MULAI.year, akhir.year + 1):
        yield y, max(MULAI, dt.date(y, 1, 1)), min(akhir, dt.date(y, 12, 31))


def _tercakup(y, akhir):
    """Kunci sel yang sudah ada di cache tahun y sampai tanggal `akhir`."""
    ada = set()
    for f in os.listdir(CACHE) if os.path.isdir(CACHE) else []:
        if f.startswith(f"{y}_{akhir}_"):
            ada |= set(json.load(open(os.path.join(CACHE, f)))["sel"])
    return ada


def panen():
    sel = sorted(sel_sampel())
    os.makedirs(CACHE, exist_ok=True)
    baru = 0
    for y, a, b in _rentang():
        n = (b - a).days + 1
        ada = _tercakup(y, b.isoformat())
        sisa = [s for s in sel if f"{s[0]}|{s[1]}" not in ada]
        for i in range(0, len(sisa), PER_PANGGIL):
            bag = sisa[i:i + PER_PANGGIL]
            jalur = os.path.join(CACHE, f"{y}_{b.isoformat()}_{bag[0][0]}_{bag[0][1]}.json")
            lat, lon = ",".join(str(s[0]) for s in bag), ",".join(str(s[1]) for s in bag)
            q = f"latitude={lat}&longitude={lon}&start_date={a}&end_date={b}&timezone=Asia%2FBangkok"
            try:
                ifs = ambil("https://previous-runs-api.open-meteo.com/v1/forecast?" + q + "&models=ecmwf_ifs025&hourly="
                            + ",".join(f"precipitation_previous_day{k}" for k in TENGGANG), coba=4, batas_waktu=90)
                era = ambil("https://archive-api.open-meteo.com/v1/archive?" + q + "&models=era5&daily=precipitation_sum", coba=4, batas_waktu=90)
            except KuotaHabis as e:
                print(f"kuota habis, berhenti rapi ({baru} berkas baru): {e}", file=sys.stderr)
                return
            ifs = ifs if isinstance(ifs, list) else [ifs]
            era = era if isinstance(era, list) else [era]
            isi = {"mulai": a.isoformat(), "n": n, "sel": {}}
            for s, i_, e in zip(bag, ifs, era):
                isi["sel"][f"{s[0]}|{s[1]}"] = {
                    "e": [None if v is None else round(v, 2) for v in e["daily"]["precipitation_sum"]],
                    **{f"p{k}": _harian(i_["hourly"][f"precipitation_previous_day{k}"], n) for k in TENGGANG}}
            simpan(jalur, isi)
            baru += 1
            print(f"  {os.path.basename(jalur)} ({baru})", file=sys.stderr)
            time.sleep(1)
    print(f"panen selesai, {baru} berkas baru", file=sys.stderr)


def muat():
    """-> baris (tahun, wilayah, tenggang, bulan, ifs, era5, kunci_sel, ordinal_hari) dari cache; hanya bila KEDUANYA ada.
    Per (tahun, sel) dipakai berkas dengan tanggal akhir terbesar."""
    w = sel_sampel()
    pilih = {}
    for f in sorted(os.listdir(CACHE)) if os.path.isdir(CACHE) else []:
        y, akhir = f.split("_")[:2]
        d = json.load(open(os.path.join(CACHE, f)))
        for k, v in d["sel"].items():
            if (y, k) not in pilih or akhir > pilih[(y, k)][0]:
                pilih[(y, k)] = (akhir, d["mulai"], v)
    baris = []
    for (y, k), (_, mulai, v) in sorted(pilih.items()):
        t0 = dt.date.fromisoformat(mulai)
        lat, lon = (float(x) for x in k.split("|"))
        wl = w.get((lat, lon))
        if wl is None:
            continue
        for kk in TENGGANG:
            for i, (p, e) in enumerate(zip(v[f"p{kk}"], v["e"])):
                if p is not None and e is not None:
                    tg = t0 + dt.timedelta(days=i)
                    baris.append((tg.year, wl, kk, tg.month, p, e, k, tg.toordinal()))
    return baris


# ---------- latih ----------
def _kuantil(xs):
    """Kuantil empiris 1..99 (interpolasi linear), xs terurut."""
    n = len(xs)
    out = []
    for q in KUANTIL:
        r = q / 100 * (n - 1)
        i = int(r)
        out.append(xs[i] + (xs[min(i + 1, n - 1)] - xs[i]) * (r - i))
    return out


def _tabel(pasang):
    """pasang = [(ifs, era5)] -> {n, f, e, r}. Menjaga monoton: f dan e tidak turun."""
    f = _kuantil(sorted(p for p, _ in pasang))
    e = _kuantil(sorted(x for _, x in pasang))
    f = [max(f[:i + 1]) for i in range(len(f))]
    e = [max(e[:i + 1]) for i in range(len(e))]
    r = e[-1] / f[-1] if f[-1] > 0 else 1.0
    return {"n": len(pasang), "f": [round(x, 3) for x in f], "e": [round(x, 3) for x in e], "r": round(min(max(r, RASIO_EKOR[0]), RASIO_EKOR[1]), 3)}


def latih_tabel(baris, tahun=None):
    """Latih dari baris (opsional hanya tahun dalam `tahun`). -> {"w|t|s": tabel}; wilayah '*' = nasional."""
    grup, st = {}, {}
    for y, w, t, b, p, e, kunci, *_ in baris:
        if tahun is not None and y not in tahun:
            continue
        for ww in (w, "*"):
            g = (ww, t, musim_dari_bulan(b))
            grup.setdefault(g, []).append((p, e))
            st.setdefault(g, set()).add((kunci, y))
    nas = {k: _tabel(v) for k, v in grup.items() if k[0] == "*"}
    out = {f"*|{t}|{s}": v for (_, t, s), v in nas.items()}
    for (w, t, s), v in grup.items():
        if w == "*":
            continue
        tb = _tabel(v)
        tb["st"] = len(st[(w, t, s)])
        lam = min(1.0, tb["st"] / N_POOL)
        nt = nas[("*", t, s)]
        if lam < 1.0:   # partial pooling: tabel wilayah dicampur ke nasional sebanding sel_tahun / N_POOL
            tb["f"] = [round(lam * a + (1 - lam) * b, 3) for a, b in zip(tb["f"], nt["f"])]
            tb["e"] = [round(lam * a + (1 - lam) * b, 3) for a, b in zip(tb["e"], nt["e"])]
            tb["r"] = round(lam * tb["r"] + (1 - lam) * nt["r"], 3)
        tb["pool"] = round(lam, 2)
        out[f"{w}|{t}|{s}"] = tb
    return out


def terapkan(x, tb):
    """Nilai mm -> nilai terkoreksi dengan tabel tb. Monoton, 0 tetap 0, ekor = pengali konstan di atas p99."""
    if x is None or x <= 0:
        return x
    f, e = tb["f"], tb["e"]
    if x >= f[-1]:
        return e[-1] + (x - f[-1]) * tb["r"]   # ponytail: ekor lurus kemiringan r; ganti bila ekor p99 terbukti tipis
    # simpul (0,0) lalu hanya f positif; f bertie dilewati
    xs, ys = [0.0], [0.0]
    for a, b in zip(f, e):
        if a > xs[-1]:
            xs.append(a)
            ys.append(b)
        elif a == xs[-1] and len(xs) > 1:
            ys[-1] = b
    j = bisect.bisect_right(xs, x)
    x0, x1, y0, y1 = xs[j - 1], xs[j], ys[j - 1], ys[j]
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)


_TABEL = None


def koreksi(nilai_mm, wilayah, tenggang, bulan, tabel=None):
    """Fungsi murni untuk pipeline lain. wilayah: Sumatera|Jawa|Kalimantan|Lainnya (atau kode provinsi 2 digit);
    tenggang 1..3 (>3 memakai 3, <1 memakai 1); bulan 1..12. Kunci tak ada -> nilai tidak diubah."""
    global _TABEL
    if tabel is None:
        if _TABEL is None:
            _TABEL = (baca(KELUARAN) or {}).get("tabel", {})
        tabel = _TABEL
    if wilayah not in WILAYAH:
        wilayah = wilayah_dari_prov(wilayah)
    tb = tabel.get(f"{wilayah}|{min(max(int(tenggang), 1), 3)}|{musim_dari_bulan(bulan)}")
    return nilai_mm if tb is None else terapkan(nilai_mm, tb)


def latih():
    baris = muat()
    if not baris:
        sys.exit("cache kosong, jalankan panen dulu")
    tahun = sorted({r[0] for r in baris})
    tabel = latih_tabel(baris)
    cache = sorted(f for f in os.listdir(CACHE) if f.endswith(".json"))
    isi = {
        "versi": 2, "dibuat": dt.datetime.now(WIB).date().isoformat(),
        "metode": "quantile mapping empiris IFS(+1..+3 hari) -> ERA5, per wilayah x tenggang x musim; kuantil 1..99; ekor >p99 = pengali r",
        "rentang": [min(dt.date(r[0], r[3], 1) for r in baris).isoformat(), dt.date.fromordinal(max(r[7] for r in baris)).isoformat()],
        "catatan": "Menyamakan sebaran IFS ke ERA5, BUKAN ke kebenaran: ERA5 meremehkan ekor jam-an dibanding pos. MAE harian naik itu wajar untuk quantile mapping (sebaran, bukan akurasi titik).",
        "tahun": tahun, "n_pool_sel_tahun": N_POOL, "basah_mm": BASAH, "n_baris": len(baris),
        "cache": {"berkas": len(cache), "tahun": {str(y): len({r[6] for r in baris if r[0] == y}) for y in tahun}, "sel_per_tahun": "jumlah sel berdata"},
        "tabel": tabel}
    isi["sha256_tabel"] = hashlib.sha256(json.dumps(tabel, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    simpan(KELUARAN, isi)
    print(f"koreksi_bias.json: {len(tabel)} tabel, {len(baris)} hari-sel-tenggang", file=sys.stderr)


# ---------- nilai ----------
AMBANG_H3 = (40, 80, 120)


def _loyo(baris):
    """Koreksi leave-one-year-out -> daftar nilai terkoreksi sejajar dengan baris."""
    tahun = sorted({r[0] for r in baris})
    kor = [None] * len(baris)
    for y in tahun:
        tb = latih_tabel(baris, set(tahun) - {y})
        for i, r in enumerate(baris):
            if r[0] == y:
                t = tb.get(f"{r[1]}|{r[2]}|{musim_dari_bulan(r[3])}")
                kor[i] = terapkan(r[4], t) if t else r[4]
    return kor


def _hitung_blok(baris, kor, mode):
    """-> {(wilayah, sel, tahun): [hitung >= ambang untuk (asli, kor, era5)]} (3 x 3 angka).
    mode 'lead': jumlah 3 hari beruntun dalam SATU tenggang. mode 'op': meniru hujan.py:84 sejauh data ada: satu run terbit T,
    hari T+1,T+2,T+3 dengan tenggang 1,2,3 bercampur (lead 0 dan 4..6 tidak ada di Previous Runs, jadi hanya satu jendela,
    bukan maksimum 7 hari; koreksi() sendiri menjepit lead>3 ke 3 dan lead<1 ke 1)."""
    d = {(r[6], r[2], r[7]): (r[4], kor[i], r[5]) for i, r in enumerate(baris)}
    wl = {r[6]: r[1] for r in baris}
    out = {}
    for (sel, k, o), v in d.items():
        if mode == "lead":
            if k != 1:
                pass
            ks = [(sel, k, o), (sel, k, o + 1), (sel, k, o + 2)]
            ok = all(x in d for x in ks)
            y = dt.date.fromordinal(o).year
        else:
            if k != 1:
                continue
            ks = [(sel, 1, o), (sel, 2, o + 1), (sel, 3, o + 2)]
            ok = all(x in d for x in ks)
            y = dt.date.fromordinal(o).year
        if not ok:
            continue
        tot = [sum(d[x][j] for x in ks) for j in range(3)]
        c = out.setdefault((wl[sel], sel, y), [[0] * 3 for _ in range(3)])
        for j in range(3):
            for m, a in enumerate(AMBANG_H3):
                c[j][m] += tot[j] >= a
    return out


def _rasio(blok, kunci, rng=None):
    """Rasio frekuensi (asli/era, kor/era) per ambang; rng -> bootstrap blok (sel-tahun)."""
    bl = [v for k, v in blok.items() if k[0] == kunci or kunci == "SEMUA"]
    if rng:
        bl = [rng.choice(bl) for _ in bl]
    jml = [[sum(b[j][m] for b in bl) for m in range(3)] for j in range(3)]
    return [[jml[j][m] / jml[2][m] if jml[2][m] else float("nan") for m in range(3)] for j in range(2)], jml[2]


def _selang(blok, kunci, B=300):
    rng = random.Random(7)
    hs = [_rasio(blok, kunci, rng)[0] for _ in range(B)]
    out = []
    for j in range(2):
        r = []
        for m in range(3):
            x = sorted(h[j][m] for h in hs if h[j][m] == h[j][m])
            r.append((x[int(.025 * len(x))], x[int(.975 * len(x))]) if len(x) > 20 else (float("nan"),) * 2)
        out.append(r)
    return out


def nilai():
    """Leave-one-year-out (latih tahun lain, nilai tahun ini). Hanya hujan, tanpa label banjir.
    Bias, MAE (= CRPS deterministik), frekuensi hari basah, rasio frekuensi h3 >= 40/80/120 terhadap ERA5 dengan selang
    bootstrap blok sel-tahun 95%, jalur 'lead' (satu tenggang) dan 'op' (tenggang bercampur seperti hujan.py).
    MAE naik itu wajar untuk quantile mapping: ia menyamakan SEBARAN, bukan akurasi titik. Menyamakan ke ERA5 != benar
    (ERA5 meremehkan ekor jam-an dibanding pos)."""
    baris = muat()
    tahun = sorted({r[0] for r in baris})
    nt = {}
    for r in baris:   # hanya sel yang ada di >= 2 tahun (panen sebagian), kalau tidak lipatan menilai sel yang tak pernah dilatih
        nt.setdefault(r[6], set()).add(r[0])
    baris = [r for r in baris if len(nt[r[6]]) >= 2]
    print(f"tahun {tahun}, {len({r[6] for r in baris})} sel, {len(baris)} baris hari-sel-tenggang")
    kor = _loyo(baris)
    blk = {m: _hitung_blok(baris, kor, m) for m in ("lead", "op")}
    f = lambda x: "nan" if x != x else f"{x:.2f}"
    for w in WILAYAH + ("SEMUA",):
        ix = [i for i, r in enumerate(baris) if w == "SEMUA" or r[1] == w]
        p, e, k = [baris[i][4] for i in ix], [baris[i][5] for i in ix], [kor[i] for i in ix]
        n = len(ix)
        bias = lambda z: sum(z) / n - sum(e) / n
        mae = lambda z: sum(abs(a - b) for a, b in zip(z, e)) / n
        fr = lambda z: sum(v >= BASAH for v in z)
        nsy = len({(baris[i][6], baris[i][0]) for i in ix})
        print(f"{w:10} n={n} sel-tahun={nsy} | bias {bias(p):+.2f}->{bias(k):+.2f} | MAE {mae(p):.2f}->{mae(k):.2f} | frek>=1mm {fr(p) / fr(e):.2f}->{fr(k) / fr(e):.2f}")
        for m in ("lead", "op"):
            (ra, rk), nera = _rasio(blk[m], w)
            sa, sk = _selang(blk[m], w)
            print(f"    h3 {m:4} kejadian ERA5 {nera}: asli " + " ".join(f"{f(ra[i])}[{f(sa[i][0])}-{f(sa[i][1])}]" for i in range(3))
                  + " | kor " + " ".join(f"{f(rk[i])}[{f(sk[i][0])}-{f(sk[i][1])}]" for i in range(3)) + "   (ambang 40/80/120)")


# ---------- uji ----------
def uji():
    # kuantil & monoton
    assert abs(_kuantil([0, 10])[49] - 5.0) < 1e-9
    # IFS dua kali lebih basah dari ERA5: x -> x/2, kering tetap kering, ekor dipertahankan
    pasang = [(2.0 * i / 10, i / 10) for i in range(0, 1000)]
    tb = _tabel(pasang)
    assert terapkan(0, tb) == 0 and terapkan(None, tb) is None
    assert abs(terapkan(50, tb) - 25) < 0.5, terapkan(50, tb)
    prev = -1
    for x in [i / 4 for i in range(0, 2000)]:
        y = terapkan(x, tb)
        assert y >= prev - 1e-9, ("tidak monoton", x, y, prev)
        prev = y
    assert terapkan(500, tb) < 500 and abs(terapkan(1000, tb) - terapkan(900, tb) - 100 * tb["r"]) < 1e-6   # ekor lurus
    assert RASIO_EKOR[0] <= tb["r"] <= RASIO_EKOR[1]
    # frekuensi hari basah disamakan: IFS drizzle (0,3 mm) di hari ERA5 kering tidak melewati 1 mm
    p2 = [(1.5 if i % 2 else 0.0, 0.0 if i % 2 else 0.0) for i in range(600)] + [(20.0, 20.0)] * 200
    t2 = _tabel(p2)
    assert terapkan(1.5, t2) < BASAH, terapkan(1.5, t2)
    # round-trip: ERA5 sintetik == IFS sintetik berskala, koreksi memulihkan sebaran
    ifs = [(i * 7919 % 1000) / 10 * 1.4 for i in range(5000)]
    era = [v / 1.4 for v in ifs]
    tb3 = _tabel(list(zip(ifs, era)))
    sisa = max(abs(terapkan(a, tb3) - b) for a, b in zip(ifs, era))
    assert sisa < 0.2, sisa
    # pooling: wilayah dengan n kecil condong ke nasional
    baris = [(2024, "Jawa", 1, 1, 10.0 + i % 50, 5.0 + i % 50, f"j{i % 3}", i) for i in range(100)] + \
            [(2024, "Sumatera", 1, 1, 10.0 + i % 50, 10.0 + i % 50, f"s{i % 25}", i) for i in range(2000)]
    tab = latih_tabel(baris)
    assert tab["Sumatera|1|DJF"]["pool"] == 1.0 and tab["Jawa|1|DJF"]["pool"] < 0.4
    assert tab["Jawa|1|DJF"]["e"][49] > tab["Sumatera|1|DJF"]["e"][49] - 5   # Jawa ditarik ke atas oleh nasional (Sumatera lebih tinggi)
    assert koreksi(10.0, "Jawa", 1, 1, tabel=tab) != 10.0 and koreksi(10.0, "Jawa", 1, 6, tabel=tab) == 10.0   # JJA tak ada -> tak diubah
    assert koreksi(10.0, "32", 1, 1, tabel=tab) == koreksi(10.0, "Jawa", 1, 1, tabel=tab) and koreksi(10.0, "Jawa", 9, 1, tabel=tab) == koreksi(10.0, "Jawa", 3, 1, tabel=tab)
    assert wilayah_dari_prov("32") == "Jawa" and wilayah_dari_prov("73") == "Lainnya" and musim_dari_bulan(12) == "DJF"
    print("uji koreksi_bias: ok")


if __name__ == "__main__":
    {"panen": panen, "latih": latih, "nilai": nilai, "uji": uji}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
