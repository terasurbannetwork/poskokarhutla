"""#39: menara seluler OpenCelliD x zona bahaya x label padam internet (#38) -> public/data/menara.json

Akses: OpenCelliD butuh token (env OPENCELLID_KEY; unduh https://opencellid.org/ocid/downloads?token=...&type=mcc&file=510.csv.gz, MCC 510 = Indonesia).
       Tanpa kunci: bagian menara = MENUNGGU KUNCI (dicek 29 Okt 2026: respons INVALID_TOKEN). Model tetap jalan TANPA fitur menara (hanya bahaya)
       sebagai pembanding, dan memasukkan log(menara) otomatis begitu cache data/raw/menara/prov.json ada.
Syarat OpenCelliD: CC-BY-SA 4.0, atribusi wajib; kuota unduh terbatas per hari -> cache, unduh paling sering sekali sehari (jalan harian).
Rumus: menara per provinsi/kabupaten (titik-dalam-poligon, scripts/data/wilayah.Wilayah); bagian_zona_bahaya = menara di kabupaten dengan >=1 kejadian
       DIBI banjir/longsor/gempa/cuaca dalam 365 hari / total menara.
Model: P(padam provinsi-hari | bahaya hari ini atau kemarin, log menara), regresi logistik (L2 lemah, Newton/IRLS stdlib), baris = provinsi x hari.
       Label: peristiwa padam internet_padam.json. Latih 60% hari awal, uji 40% akhir. Metrik: AUC uji vs pembanding klimatologi
       (laju padam provinsi di bagian latih). LOLOS bila AUC model > AUC pembanding DAN > 0,5.
Pakai: python3 scripts/umum/menara.py  |  python3 scripts/umum/menara.py uji
"""
import csv, datetime as dt, gzip, importlib.util, io, json, math, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(AKAR, "data/raw/menara")
BAHAYA = ("Banjir", "Banjir Bandang", "Banjir dan Tanah Longsor", "Tanah Longsor", "Gempabumi", "Cuaca Ekstrem", "Angin Kencang", "Gerakan Tanah")


def _mod(nama, rel=None):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(AKAR, rel) if rel else os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# ---------- logistik & AUC (murni) ----------
def logistik(X, y, l2=1.0, iterasi=25):
    """Newton-Raphson; X list baris fitur (tanpa intersep). Fitur dibakukan di dalam; -> (w, mu, sd)."""
    n, p = len(X), len(X[0]) if X else 0
    mu = [sum(r[j] for r in X) / n for j in range(p)]
    sd = [max(1e-9, (sum((r[j] - mu[j]) ** 2 for r in X) / n) ** .5) for j in range(p)]
    Z = [[1.0] + [(r[j] - mu[j]) / sd[j] for j in range(p)] for r in X]
    w = [0.0] * (p + 1)
    for _ in range(iterasi):
        pr = [1 / (1 + math.exp(-max(-30, min(30, sum(a * b for a, b in zip(w, z)))))) for z in Z]
        g = [sum((pr[i] - y[i]) * Z[i][j] for i in range(n)) + (l2 * w[j] if j else 0) for j in range(p + 1)]
        H = [[sum(pr[i] * (1 - pr[i]) * Z[i][a] * Z[i][b] for i in range(n)) + (l2 if a == b and a else 0) for b in range(p + 1)] for a in range(p + 1)]
        d = selesai(H, g)
        w = [a - b for a, b in zip(w, d)]
        if max(abs(x) for x in d) < 1e-7:
            break
    return w, mu, sd


def selesai(A, b):
    """Gauss-Jordan Ax=b."""
    n = len(b)
    M = [r[:] + [b[i]] for i, r in enumerate(A)]
    for i in range(n):
        k = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[k] = M[k], M[i]
        if abs(M[i][i]) < 1e-12:
            M[i][i] = 1e-12
        M[i] = [v / M[i][i] for v in M[i]]
        for r in range(n):
            if r != i:
                f = M[r][i]
                M[r] = [a - f * c for a, c in zip(M[r], M[i])]
    return [M[i][n] for i in range(n)]


def prediksi(model, x):
    w, mu, sd = model
    s = w[0] + sum(w[j + 1] * (x[j] - mu[j]) / sd[j] for j in range(len(x)))
    return 1 / (1 + math.exp(-max(-30, min(30, s))))


def auc(skor, y):
    """Mann-Whitney, ikatan dihitung setengah."""
    pos = [s for s, v in zip(skor, y) if v]
    neg = [s for s, v in zip(skor, y) if not v]
    if not pos or not neg:
        return None
    return sum((a > b) + .5 * (a == b) for a in pos for b in neg) / (len(pos) * len(neg))


# ---------- menara ----------
def hitung_menara(isi_gz):
    """CSV OpenCelliD (gz) -> {prov: n}, {(prov, kab): n}. Kolom: radio,mcc,net,area,cell,unit,lon,lat,..."""
    W = _mod("wilayah_data", "scripts/data/wilayah.py").Wilayah()
    prov, kab = {}, {}
    for r in csv.reader(io.TextIOWrapper(gzip.GzipFile(fileobj=io.BytesIO(isi_gz)), encoding="utf-8", errors="replace")):
        try:
            lon, lat = float(r[6]), float(r[7])
        except (ValueError, IndexError):
            continue
        h = W.cari(lon, lat)
        if h:
            prov[h[0]] = prov.get(h[0], 0) + 1
            kab[(h[0], h[1])] = kab.get((h[0], h[1]), 0) + 1
    return prov, kab


def muat_menara():
    p = os.path.join(RAW, "prov.json")
    if os.path.exists(p):
        return json.load(open(p))
    key = os.environ.get("OPENCELLID_KEY")
    if not key:
        return None
    J = _mod("jaring")
    isi = J.ambil(f"https://opencellid.org/ocid/downloads?token={key}&type=mcc&file=510.csv.gz", mentah=True, batas=600, jeda_host=1)
    if isi[:1] == b"{":
        raise RuntimeError("OpenCelliD: " + isi[:120].decode())
    prov, kab = hitung_menara(isi)
    os.makedirs(RAW, exist_ok=True)
    d = {"unduh": dt.date.today().isoformat(), "prov": prov, "kab": {f"{a}|{b}": n for (a, b), n in kab.items()}}
    json.dump(d, open(p, "w"), separators=(",", ":"))
    return d


# ---------- baris model ----------
def susun_baris(padam_peristiwa, kejadian, dari, hari):
    """-> dict prov -> (bahaya[hari], padam[hari]); bahaya = kejadian bahaya di provinsi hari itu atau kemarin."""
    tg = [(dt.date.fromisoformat(dari) + dt.timedelta(days=i)).isoformat() for i in range(hari)]
    idx = {t: i for i, t in enumerate(tg)}
    provs = sorted({e["prov"] for e in padam_peristiwa})
    B = {p: [0] * hari for p in provs}
    P = {p: [0] * hari for p in provs}
    for e in padam_peristiwa:
        if e["tanggal"] in idx:
            P[e["prov"]][idx[e["tanggal"]]] = 1
    for k in kejadian:
        i = idx.get(k["tanggal"])
        if i is not None and k["prov_kode"] in B and k["jenis"] in BAHAYA:
            B[k["prov_kode"]][i] = 1
            if i + 1 < hari:
                B[k["prov_kode"]][i + 1] = 1
    return B, P, tg


def evaluasi(B, P, menara, bagi=0.6):
    """Latih 60% awal, uji sisanya. Dua model: bahaya saja, dan bahaya + log menara (bila ada). Pembanding: laju padam provinsi (latih)."""
    provs = sorted(B)
    n = len(B[provs[0]])
    c = int(n * bagi)

    def baris(a, b, dengan):
        X, y, p = [], [], []
        for pv in provs:
            for i in range(a, b):
                x = [B[pv][i]] + ([math.log(1 + menara[pv])] if dengan else [])
                X.append(x); y.append(P[pv][i]); p.append(pv)
        return X, y, p
    laju = {pv: sum(P[pv][:c]) / c for pv in provs}
    out = {"hari_latih": c, "hari_uji": n - c, "provinsi": len(provs)}
    Xt, yt, pt = baris(c, n, False)
    out["padam_uji"] = sum(yt)
    out["auc_pembanding_klimatologi"] = auc([laju[q] for q in pt], yt)
    for nama, dengan in (("bahaya", False), ("bahaya_menara", True)):
        if dengan and not menara:
            out[nama] = "MENUNGGU KUNCI (OPENCELLID_KEY)"; continue
        X, y, _ = baris(0, c, dengan)
        if sum(y) < 5:
            out[nama] = "TAK TERUJI (padam latih < 5)"; continue
        m = logistik(X, y)
        Xu, yu, pu = baris(c, n, dengan)
        a = auc([prediksi(m, x) + 1e-6 * laju[q] for x, q in zip(Xu, pu)], yu)
        out[nama] = {"auc_uji": a, "koef": [round(v, 3) for v in m[0]],
                     "vonis": "LOLOS" if a and a > 0.5 and a > (out["auc_pembanding_klimatologi"] or 0.5) else "GAGAL"}
    return out


def jalan():
    ip = os.path.join(AKAR, "public/data/internet_padam.json")
    if not os.path.exists(ip):
        sys.exit("internet_padam.json belum ada: jalankan internet_padam.py dulu")
    I = json.load(open(ip))
    kej = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json")))
    hari = (dt.date.fromisoformat(I["sampai"]) - dt.date.fromisoformat(I["dari"])).days + 1
    B, P, tg = susun_baris(I["peristiwa"], kej["kejadian"], I["dari"], hari)
    ada = [i for i, t in enumerate(tg) if t >= kej["dari"]]  # label bahaya hanya ada selama DIBI 365 hari
    B = {p: [B[p][i] for i in ada] for p in B}; P = {p: [P[p][i] for i in ada] for p in P}
    m = muat_menara()
    menara = {p: m["prov"].get(p, 0) for p in B} if m else None
    ev = evaluasi(B, P, menara)
    bag = None
    if m:
        kabz = {(k["prov_kode"], k["kab"]) for k in kej["kejadian"] if k["jenis"] in BAHAYA}
        tot = sum(m["kab"].values())
        bag = round(sum(n for k, n in m["kab"].items() if tuple(k.split("|")) in kabz) / tot, 3) if tot else None
    ev = json.loads(json.dumps(ev, default=lambda v: round(v, 4)))
    _mod("kejadian").simpan(os.path.join(AKAR, "public/data/menara.json"), {
        "sumber": "OpenCelliD (CC-BY-SA 4.0) x IODA padam internet x DIBI", "atribusi": "OpenCelliD https://opencellid.org (CC-BY-SA 4.0); IODA Georgia Tech; DIBI BNPB",
        "akses_menara": ("tersedia, unduhan " + m["unduh"]) if m else "MENUNGGU KUNCI (OPENCELLID_KEY)",
        "catatan": "Kepadatan menara = log(jumlah menara provinsi), bukan per km2/penduduk (tak ada penyebut seragam): mengacaukan ukuran provinsi. "
                   "Label padam = blok /24 ping turun (bukan pasti listrik/seluler mati). Provinsi pemekaran Papua digabung ke kode lama oleh IODA.",
        "menara_per_provinsi": m["prov"] if m else None, "bagian_menara_di_kab_bahaya": bag, "model": ev})
    print("menara:", json.dumps(ev))


def uji():
    import random
    r = random.Random(5)
    X = [[r.random() < .5, r.gauss(0, 1)] for _ in range(600)]
    y = [int(r.random() < 1 / (1 + math.exp(-(2 * x[0] + 0.0 * x[1] - 1)))) for x in X]
    m = logistik([[float(a), b] for a, b in X], y)
    assert m[0][1] > 0.3 and abs(m[0][2]) < 0.4, m  # koef bakuan fitur benar > 0; fitur derau ~ 0
    assert auc([1, 2, 3, 4], [0, 0, 1, 1]) == 1.0 and auc([1, 1], [0, 1]) == .5 and auc([1], [1]) is None
    assert selesai([[2, 0], [0, 4]], [2, 8]) == [1, 2]
    e = [{"prov": "32", "tanggal": "2026-01-03"}]
    k = [{"prov_kode": "32", "tanggal": "2026-01-02", "jenis": "Banjir"}, {"prov_kode": "32", "tanggal": "2026-01-02", "jenis": "Kekeringan"}]
    B, P, _ = susun_baris(e, k, "2026-01-01", 5)
    assert B["32"] == [0, 1, 1, 0, 0] and P["32"] == [0, 0, 1, 0, 0]
    print("uji menara: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
