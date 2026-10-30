"""Uji model: apakah alert tebang menambah kemampuan menebak titik api?

  P(titik VIIRS di sel atau 8 tetangganya <= 90 hari setelah alert pertama | gambut, musim kering,
    api 30 hari sebelumnya, api 365 hari sebelumnya)

Regresi logistik ditulis tangan (Newton + ridge kecil), latih alert 2021-2023, uji 2024-2025.
Pembanding = HANYA riwayat api 365 hari. Metrik: AUC; selisih AUC (penuh - pembanding) diberi selang
dengan bootstrap BLOK per kotak percontohan (kotak, bukan baris, yang diambil ulang; >= 1000 ulangan),
dan dilaporkan juga tanpa kotak Ketapang. Vonis LOLOS hanya bila selang 95% selisih AUC tidak memuat 0.

Pakai:  python3 scripts/data/alert_tebang_model.py tarik   # alert per sel dari GFW -> data/raw/alert_tebang/
        python3 scripts/data/alert_tebang_model.py uji     # latih+uji, tulis blok "model" ke alert_tebang.json
        python3 scripts/data/alert_tebang_model.py --uji   # self-check tanpa jaringan/berkas

Arsip VIIRS: env ALERT_FIRMS_CSV (bawaan data/raw/firms/viirs.csv; format firms.py).
"""
import bisect, collections, datetime as dt, json, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alert_tebang as at

AKAR = at.AKAR
FIRMS = os.environ.get("ALERT_FIRMS_CSV") or os.path.join(AKAR, "data/raw/firms/viirs.csv")
CACHE = os.path.join(AKAR, "data/raw/alert_tebang")
SEL = 0.05  # derajat (~5,5 km); tetangga 3x3 = ~16 km
KOTAK = 0.5  # derajat per kotak percontohan
# (nama, lon barat, lat selatan): gambut dan bukaan Sumatra-Kalimantan, musim kering Jun-Okt
KOTAK_PERCONTOHAN = [
    ("Ketapang", 110.0, -2.0), ("Ketapang", 110.5, -2.0), ("Ketapang", 110.0, -1.5), ("Ketapang", 110.5, -1.5), ("Kubu Raya", 109.5, -1.0), ("Sintang", 111.5, 0.0), ("Seruyan", 112.0, -3.0),
    ("Kapuas", 114.0, -3.0), ("Pulang Pisau", 113.5, -2.5), ("Kotawaringin Barat", 111.5, -2.5),
    ("Kukar", 116.5, -1.0), ("OKI", 105.5, -3.5), ("Musi Banyuasin", 103.5, -2.5), ("Tanjab Timur", 103.5, -1.5),
    ("Rokan Hilir", 100.5, 1.5), ("Siak", 101.5, 0.5), ("Bengkalis", 102.0, 1.0), ("Kep. Meranti", 102.5, 0.75),
    ("Pelalawan", 102.0, 0.0),
]
TARIK_DARI, TARIK_SAMPAI = "2020-01-01", "2025-12-31"
LATIH, UJI = (2021, 2023), (2024, 2025)
HORIZON = 90
ULANG = 2000


def hari(s):
    return dt.date.fromisoformat(s).toordinal()


def sel_dari(lon, lat):
    return (math.floor(lon / SEL + 1e-9), math.floor(lat / SEL + 1e-9))


# ------------------------------------------------------------------ tarik alert per sel
def sel_kotak(lon0, lat0):
    n = round(KOTAK / SEL)
    i0, j0 = sel_dari(lon0, lat0)
    return [(i0 + a, j0 + b) for a in range(n) for b in range(n)]


def tarik(kerja=6):
    os.makedirs(CACHE, exist_ok=True)
    ver = at.versi()
    tugas = [(nama, c) for nama, lon, lat in KOTAK_PERCONTOHAN for c in sel_kotak(lon, lat)
             if not os.path.exists(os.path.join(CACHE, f"{nama}_{c[0]}_{c[1]}.json"))]
    print(f"versi {ver}, {len(tugas)} sel", file=sys.stderr, flush=True)

    def satu(t):
        nama, (i, j) = t
        sql = ("SELECT gfw_integrated_alerts__date, SUM(area__ha) FROM data "
               f"WHERE gfw_integrated_alerts__date >= '{TARIK_DARI}' AND gfw_integrated_alerts__date <= '{TARIK_SAMPAI}' "
               "AND gfw_integrated_alerts__confidence != 'nominal' GROUP BY gfw_integrated_alerts__date")
        rows = at.kueri(ver, sql, at.kotak(i * SEL, j * SEL, (i + 1) * SEL, (j + 1) * SEL))
        seri = {r["gfw_integrated_alerts__date"]: float(r["area__ha"]) for r in rows}
        with open(os.path.join(CACHE, f"{nama}_{i}_{j}.json"), "w") as f:
            json.dump({"versi": ver, "alert": seri}, f)

    sisa = tugas
    for putaran in range(3):
        gagal = []
        with at.ThreadPoolExecutor(kerja) as ex:
            for t, r in zip(sisa, ex.map(lambda t: at._aman(satu, t), sisa)):
                if isinstance(r, Exception):
                    gagal.append(t)
        print(f"putaran {putaran + 1}: {len(sisa) - len(gagal)}/{len(sisa)} ok", file=sys.stderr, flush=True)
        sisa = gagal
        if not sisa:
            return
    raise RuntimeError(f"{len(sisa)} sel gagal: {sisa[:3]}")


# ------------------------------------------------------------------ data
def muat_firms():
    """{sel: [hari terurut]} di sekitar semua kotak (+ tetangga). Keyakinan rendah 'l' dibuang."""
    pad = 2 * SEL
    kot = [(lon - pad, lat - pad, lon + KOTAK + pad, lat + KOTAK + pad) for _, lon, lat in KOTAK_PERCONTOHAN]
    out, akhir = collections.defaultdict(list), 0
    with open(FIRMS) as f:
        kep = f.readline().strip().split(",")
        iy, ix, it, ic = kep.index("latitude"), kep.index("longitude"), kep.index("acq_date"), kep.index("confidence")
        for b in f:
            p = b.split(",")
            if p[ic] == "l":
                continue
            x, y = float(p[ix]), float(p[iy])
            if any(a <= x <= c and bb <= y <= d for a, bb, c, d in kot):
                d = hari(p[it])
                out[sel_dari(x, y)].append(d)
                akhir = max(akhir, d)
    for v in out.values():
        v.sort()
    return out, akhir


def peta_gambut():
    """{sel: pangsa luas sel yang gambut PRIMS}; kotak gambut ~0,011 derajat dipetakan lewat titik pusatnya."""
    out = collections.defaultdict(float)
    for f in at.muat_geo("public/data/lahan/gambut.geojson")["features"]:
        for p in at.bagian(f["geometry"]):
            r = p[0]
            xs, ys = [c[0] for c in r], [c[1] for c in r]
            out[sel_dari((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)] += (max(xs) - min(xs)) * (max(ys) - min(ys))
    return {k: min(1.0, v / (SEL * SEL)) for k, v in out.items()}


def jumlah(daftar, a, b):
    """banyak hari di (a, b]"""
    return bisect.bisect_right(daftar, b) - bisect.bisect_right(daftar, a)


def tetangga(c):
    return [(c[0] + a, c[1] + b) for a in (-1, 0, 1) for b in (-1, 0, 1)]


def baris_data(firms, akhir_firms, gambut):
    """Satu baris per episode: alert pertama sebuah sel setelah >= 365 hari tanpa alert. -> list dict."""
    rows = []
    for nama in dict.fromkeys(n for n, _, _ in KOTAK_PERCONTOHAN):
        for fn in sorted(os.listdir(CACHE)):
            if not fn.startswith(nama + "_") or not fn.endswith(".json"):
                continue
            nm, i, j = fn[:-5].rsplit("_", 2)
            if nm != nama:
                continue
            c = (int(i), int(j))
            seri = sorted(hari(d) for d in json.load(open(os.path.join(CACHE, fn)))["alert"])
            nb = [firms.get(t, []) for t in tetangga(c)]
            prev = None
            for d in seri:
                if prev is None or d - prev >= 365:  # episode baru (arsip mulai 2020: tahun 2020 hanya pembuka)
                    th = dt.date.fromordinal(d).year  # 2020 hanya menjadi sejarah; episode dihitung dari 2021
                    if LATIH[0] <= th <= UJI[1] and d + HORIZON <= akhir_firms:
                        f30 = sum(jumlah(x, d - 30, d) for x in nb)
                        f365 = sum(jumlah(x, d - 365, d) for x in nb)
                        y = int(any(jumlah(x, d, d + HORIZON) > 0 for x in nb))
                        bln = dt.date.fromordinal(d).month
                        rows.append({"kotak": nama, "th": th, "y": y, "x": [gambut.get(c, 0.0), float(6 <= bln <= 10),
                                     math.log1p(f30), math.log1p(f365)]})
                prev = d
    return rows


# ------------------------------------------------------------------ model
def standar(X):
    m = [sum(c) / len(c) for c in zip(*X)]
    s = [(sum((v - mm) ** 2 for v in c) / len(c)) ** .5 or 1.0 for c, mm in zip(zip(*X), m)]
    return m, s


def pasang(X, y, lam=1e-2, iter=50):
    """Regresi logistik Newton-Raphson + ridge lam (tanpa penalti pada intersep). X sudah distandarkan."""
    n, k = len(X), len(X[0]) + 1
    w = [0.0] * k
    for _ in range(iter):
        g, H = [0.0] * k, [[0.0] * k for _ in range(k)]
        for xi, yi in zip(X, y):
            z = [1.0] + xi
            p = 1 / (1 + math.exp(-max(-30, min(30, sum(a * b for a, b in zip(w, z))))))
            for a in range(k):
                g[a] += (p - yi) * z[a]
                for b in range(k):
                    H[a][b] += p * (1 - p) * z[a] * z[b]
        for a in range(1, k):
            g[a] += lam * w[a]
            H[a][a] += lam
        d = selesai(H, g)
        w = [a - b for a, b in zip(w, d)]
        if max(abs(v) for v in d) < 1e-8:
            break
    return w


def selesai(A, b):
    """Gauss-Jordan dengan pivot sebagian."""
    n = len(b)
    M = [r[:] + [b[i]] for i, r in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                M[r] = [a - f * bb for a, bb in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]


def prediksi(w, m, s, X):
    return [1 / (1 + math.exp(-(w[0] + sum(a * (v - mm) / ss for a, v, mm, ss in zip(w[1:], x, m, s))))) for x in X]


def auc(skor, y):
    """AUC peringkat (Mann-Whitney, seri = 1/2). None bila satu kelas kosong."""
    pos = sum(y)
    neg = len(y) - pos
    if not pos or not neg:
        return None
    urut = sorted(range(len(y)), key=lambda i: skor[i])
    jum, i = 0.0, 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and skor[urut[j + 1]] == skor[urut[i]]:
            j += 1
        rata = (i + j) / 2 + 1
        jum += rata * sum(y[urut[t]] for t in range(i, j + 1))
        i = j + 1
    return (jum - pos * (pos + 1) / 2) / (pos * neg)


def lift_desil(skor, y):
    n = max(1, len(y) // 10)
    top = sorted(range(len(y)), key=lambda i: -skor[i])[:n]
    dasar = sum(y) / len(y)
    return (sum(y[i] for i in top) / n) / dasar if dasar else None


def bootstrap_blok(blok, ulang=ULANG, seed=20261030):
    """blok: {kotak: (skor_penuh, skor_dasar, y)}. Ambil ulang KOTAK dengan pengembalian; selisih AUC.
    -> (median, lo, hi, n_sah)"""
    rng = random.Random(seed)
    nama = sorted(blok)
    d = []
    for _ in range(ulang):
        pilih = [rng.choice(nama) for _ in nama]
        sf = [v for k in pilih for v in blok[k][0]]
        sb = [v for k in pilih for v in blok[k][1]]
        y = [v for k in pilih for v in blok[k][2]]
        a, b = auc(sf, y), auc(sb, y)
        if a is not None and b is not None:
            d.append(a - b)
    d.sort()
    return d[len(d) // 2], d[int(.025 * len(d))], d[int(.975 * len(d)) - 1], len(d)


def uji():
    firms, akhir = muat_firms()
    rows = baris_data(firms, akhir, peta_gambut())
    latih = [r for r in rows if r["th"] <= LATIH[1]]
    tes = [r for r in rows if r["th"] >= UJI[0]]
    assert latih and tes, "tidak ada baris latih/uji; jalankan 'tarik' dulu"

    def hitung(subset_tes, nama_cakupan):
        out = {}
        for nm, kol in (("penuh", [0, 1, 2, 3]), ("dasar", [3])):
            Xl = [[r["x"][k] for k in kol] for r in latih]
            m, s = standar(Xl)
            w = pasang([[(v - a) / b for v, a, b in zip(x, m, s)] for x in Xl], [r["y"] for r in latih])
            out[nm] = (w, m, s, kol)
        return out

    mod = hitung(tes, "semua")

    def skor_ba(model, rs):
        w, m, s, kol = model
        return prediksi(w, m, s, [[r["x"][k] for k in kol] for r in rs])

    def laporan(rs):
        y = [r["y"] for r in rs]
        sf, sb = skor_ba(mod["penuh"], rs), skor_ba(mod["dasar"], rs)
        blok = collections.defaultdict(lambda: ([], [], []))
        for r, a, b in zip(rs, sf, sb):
            blok[r["kotak"]][0].append(a)
            blok[r["kotak"]][1].append(b)
            blok[r["kotak"]][2].append(r["y"])
        med, lo, hi, nsah = bootstrap_blok(dict(blok))
        return {"n_uji": len(rs), "positif": sum(y), "kotak": len(blok),
                "auc_penuh": round(auc(sf, y), 3), "auc_dasar": round(auc(sb, y), 3),
                "selisih": round(auc(sf, y) - auc(sb, y), 3),
                "selisih_ci95": [round(lo, 3), round(hi, 3)], "ulangan_sah": nsah,
                "lift_desil_penuh": round(lift_desil(sf, y), 2), "lift_desil_dasar": round(lift_desil(sb, y), 2)}

    semua = laporan(tes)
    tanpa = laporan([r for r in tes if r["kotak"] != "Ketapang"])
    pos_ket = sum(r["y"] for r in tes if r["kotak"] == "Ketapang")
    lolos = semua["selisih_ci95"][0] > 0
    w, m, s, _ = mod["penuh"]
    hasil = {
        "tujuan": "P(titik VIIRS di sel 0,05 derajat atau 8 tetangganya <= 90 hari setelah alert pertama sel)",
        "fitur": ["gambut_pangsa_sel", "musim_kering_jun_okt", "ln1p_api_30h", "ln1p_api_365h"],
        "latih": f"{LATIH[0]}-{LATIH[1]}", "uji": f"{UJI[0]}-{UJI[1]}", "n_latih": len(latih),
        "positif_latih": sum(r["y"] for r in latih),
        "bobot_standar": [round(v, 3) for v in w], "semua_kotak": semua, "tanpa_ketapang": tanpa,
        "porsi_ketapang_di_positif_uji": round(pos_ket / semua["positif"], 3) if semua["positif"] else None,
        "bootstrap": f"blok per kotak percontohan ({semua['kotak']} kotak), {ULANG} ulangan",
        "vonis": "LOLOS" if lolos else "TIDAK LOLOS",
        "aturan_vonis": "LOLOS hanya bila selang 95% selisih AUC (semua kotak) tidak memuat 0",
        "arsip_api_sampai": dt.date.fromordinal(akhir).isoformat(),
        "batas": "kotak percontohan Sumatra-Kalimantan bukan nasional; sel 5 km; alert baru = >=365 hari tanpa alert; "
                 "model tidak dilatih ulang per ulangan bootstrap; api non-karhutla (pembakaran lahan, tungku) tak dipisah",
    }
    jalur = at.KELUAR
    d = json.load(open(jalur)) if os.path.exists(jalur) else {}
    d["model"] = hasil
    json.dump(d, open(jalur, "w"), ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(hasil, ensure_ascii=False, indent=1))


def self_check():
    assert auc([1, 2, 3, 4], [0, 0, 1, 1]) == 1.0
    assert auc([1, 1, 1, 1], [0, 1, 0, 1]) == 0.5
    assert auc([1, 2], [1, 1]) is None
    rng = random.Random(1)
    X = [[rng.gauss(0, 1)] for _ in range(4000)]
    y = [int(rng.random() < 1 / (1 + math.exp(-(0.5 + 2 * x[0])))) for x in X]
    w = pasang(X, y, lam=1e-6)
    assert abs(w[0] - 0.5) < 0.2 and abs(w[1] - 2) < 0.3, w  # pulihkan parameter sebenarnya
    # bootstrap blok: tanpa sinyal tambahan selang harus memuat 0
    blok = {}
    for b in range(10):
        yy = [int(rng.random() < .3) for _ in range(60)]
        s = [rng.random() + .5 * v for v in yy]
        blok[str(b)] = (s, s[:], yy)  # penuh == dasar -> selisih tepat 0
    med, lo, hi, n = bootstrap_blok(blok, ulang=1000)
    assert lo <= 0 <= hi and n >= 900, (lo, hi, n)
    assert at.kunci_int(3.0) == 3
    print("self-check alert_tebang_model ok")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "--uji"
    {"tarik": tarik, "uji": uji, "--uji": self_check}[a]()
