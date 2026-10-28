"""Verifikasi klaim hujan (kolom hujan_hasil omc_rekap.csv) terhadap CHIRPS prelim per kab dan METAR bandara.

Pakai (butuh numpy via efek.py; setelah `efek.py tarik`):
  python3 scripts/omc/verifikasi.py        tulis riset/VERIFIKASI-KLAIM-HUJAN.csv dan .md
  python3 scripts/omc/verifikasi.py uji    self-check luring
Vonis: cocok (CHIRPS rata-rata kab >= 1 mm atau METAR bandara di kab mencatat hujan), lemah (0,1-1 mm), tidak cocok (< 0,1 mm dan
METAR kering atau tak ada METAR), tidak bisa dicek (bukan kab/kota, di luar domain, atau tanggal > hari CHIRPS terakhir tanpa METAR hujan).
Hari METAR dan CHIRPS = hari UTC. Maksimum sel dari sel CHIRPS 0,05 derajat dalam poligon (diambil ulang di sini).
"""
import csv, json, os, re, statistics, sys
import efek
from efek import AKAR, MENTAH, RISET, norm

ALIAS_TOK = {"kobar": "Kotawaringin Barat", "kotim": "Kotawaringin Timur", "mura": "Murung Raya", "gumas": "Gunung Mas", "barsel": "Barito Selatan",
             "hsu": "Hulu Sungai Utara", "oki": "Ogan Komering Ilir", "oku timur": "Ogan Komering Ulu Timur", "palangka raya": "Palangkaraya",
             "palangkaraya": "Palangkaraya"}
NEGATIF = re.compile(r"tidak terpantau|tidak ada hujan", re.I)


def token_kab(teks, kabs_prov):
    """nama kab (dari daftar provinsi) yang disebut dalam teks; terpanjang dulu, ditandai habis agar 'Banyuasin' tak ikut 'Musi Banyuasin'."""
    t = " " + re.sub(r"\([^)]*\)", " ", teks.lower()) + " "
    for a, b in ALIAS_TOK.items():
        t = re.sub(r"\b%s\b" % re.escape(a), b.lower(), t)
    hit = []
    nm = sorted(kabs_prov, key=lambda i: -len(efek_nama(i)))
    for i in nm:
        nama = efek_nama(i)
        polos = re.sub(r"^kota ", "", nama.lower())
        pola = r"(?<![a-z])(kota |kab\.? |kabupaten )?%s(?![a-z])" % re.escape(polos).replace("\\ ", r"\s*")
        if re.search(pola, t):
            t = re.sub(pola, " # ", t, count=1)
            hit.append(i)
    return hit


KABS = None


def efek_nama(i):
    return KABS[i]["nama"]


def kelas(mm):
    return "cocok" if mm >= 1 else "lemah" if mm >= 0.1 else "tidak cocok"


def metar_hujan(st, hari):
    """True/False hujan (RA|SH|TS|DZ atau p01i>0) di bandara pada hari UTC; None bila tak ada laporan."""
    ada, hujan = 0, False
    p = f"{MENTAH}/iem_{st}.csv"
    if not os.path.exists(p):
        return None
    for r in csv.DictReader(open(p)):
        if r["valid"][:10] != "2026-10-%02d" % hari:
            continue
        ada += 1
        hujan = hujan or bool(re.search(r"(?<![A-Z])(RA|SH|TS|DZ)", r["wxcodes"])) or (r["p01i"] not in ("M", "") and float(r["p01i"] or 0) > 0)
    return hujan if ada else None


def jalan():
    global KABS
    KABS = efek.baca_kab()
    ch = json.load(open(f"{MENTAH}/chirps_kab.json"))
    hari_ada = set(ch["hari"])
    rain = {int(i): {int(h): v for h, v in d.items()} for i, d in ch["chirps"].items()}
    D, kontam, tak = efek.baca_perlakuan(KABS)
    nb = efek.tetangga(KABS)
    sel = {}
    maks = {}
    # maksimum sel: ambil ulang dari CHIRPS bila perlu
    import glob
    files = {int(f.split(".")[-3]): f for f in glob.glob(f"{MENTAH}/chirps/chirps-v2.0.2026.10.*.tif.gz")}
    sels = [efek.sel_kab(k) for k in KABS]
    j0 = min(r for s in sels for r, _ in s); j1 = max(r for s in sels for r, _ in s) + 1
    import numpy as np
    for h, f in files.items():
        try:
            a = efek.baca_chirps(f, j0, j1)
        except EOFError:
            continue
        for i, s in enumerate(sels):
            v = np.array([a[r - j0, c] for r, c in s], dtype="f8"); v = v[v > -9000]
            maks[(i, h)] = float(v.max()) if len(v) else None
    air_kab = {}
    for st, (lon, lat) in efek.BANDARA.items():
        for i, k in enumerate(KABS):
            if efek.titik_kab(k, lon, lat):
                air_kab.setdefault(i, []).append(st)
    baris, seen = [], set()
    for r in csv.DictReader(open(efek.REKAP, encoding="utf-8")):
        tg = r["tanggal"].strip(); txt = r["hujan_hasil"].strip()
        if not txt:
            continue
        if ".." in tg or not tg:
            baris.append(dict(tanggal=tg, provinsi=r["provinsi"], kab="", klaim=txt, vonis="tidak bisa dicek", alasan="klaim agregat rentang tanggal"))
            continue
        h = int(tg[-2:])
        kp = [i for i, k in enumerate(KABS) if k["prov"] == r["provinsi"]]
        hit = token_kab(txt, kp)
        negatif = bool(NEGATIF.search(txt)) and not hit
        if negatif:
            sas = [i for (i, hh) in D["any"] if hh == h and KABS[i]["prov"] == r["provinsi"]]
            hit = sas
        if not hit:
            key = (tg, r["provinsi"], txt[:60])
            if key not in seen:
                seen.add(key)
                baris.append(dict(tanggal=tg, provinsi=r["provinsi"], kab="", klaim=txt, vonis="tidak bisa dicek", alasan="bukan kab/kota di domain data"))
            continue
        for i in hit:
            key = (tg, i, "n" if negatif else "p")
            if key in seen:
                continue
            seen.add(key)
            baris.append(hitung(i, h, tg, txt, negatif, rain, maks, hari_ada, air_kab, nb, D))
    # konteks sudah ada di hitung; tulis
    os.makedirs(RISET, exist_ok=True)
    kol = ["tanggal", "provinsi", "kab", "klaim", "vonis", "rata_mm", "maks_sel_mm", "metar", "median_1_15okt_mm", "tetangga_kontrol_mm", "alasan"]
    w = csv.DictWriter(open(f"{RISET}/VERIFIKASI-KLAIM-HUJAN.csv", "w", newline=""), fieldnames=kol, extrasaction="ignore")
    w.writeheader(); w.writerows(baris)
    tulis_md(baris)
    return baris


def hitung(i, h, tg, txt, negatif, rain, maks, hari_ada, air_kab, nb, D):
    k = KABS[i]
    b = dict(tanggal=tg, provinsi=k["prov"], kab=k["nama"], klaim=("(klaim nihil) " if negatif else "") + txt[:90])
    mt = None
    for st in air_kab.get(i, []):
        m = metar_hujan(st, h)
        if m is not None:
            mt = (st, m); break
    b["metar"] = "" if mt is None else f"{mt[0]} {'hujan' if mt[1] else 'kering'}"
    base = [rain[i][d] for d in range(1, 16) if rain[i].get(d) is not None]
    b["median_1_15okt_mm"] = round(statistics.median(base), 1) if base else ""
    tet = [rain[j][h] for j in nb[i] if (j, h) not in D["any"] and rain[j].get(h) is not None]
    b["tetangga_kontrol_mm"] = round(sum(tet) / len(tet), 1) if tet else ""
    if h in hari_ada and rain[i].get(h) is not None:
        mm = rain[i][h]
        b["rata_mm"], b["maks_sel_mm"] = round(mm, 1), round(maks.get((i, h)) or 0, 1)
        v = kelas(mm)
        if mt and mt[1]:
            v = "cocok"
        if negatif:
            v = "klaim nihil sesuai" if mm < 1 and not (mt and mt[1]) else "klaim nihil tidak sesuai"
        b["vonis"], b["alasan"] = v, "CHIRPS" + (" + METAR" if mt else "")
    elif mt and mt[1]:
        b["vonis"], b["alasan"] = ("klaim nihil tidak sesuai" if negatif else "cocok"), "tanggal di luar CHIRPS; METAR bandara di kab mencatat hujan"
    else:
        b["vonis"], b["alasan"] = "tidak bisa dicek", "tanggal di luar CHIRPS (terakhir 24 Okt)" + ("; METAR kering di satu titik tak cukup" if mt else "")
    return b


def tulis_md(baris):
    from collections import Counter
    c = Counter(b["vonis"] for b in baris)
    m = ["# Verifikasi klaim hujan OMC terhadap CHIRPS dan METAR", "",
         "Sumber hujan: CHIRPS-2.0 prelim harian 0,05 derajat (rata-rata sel dalam poligon kab/kota; hari UTC), tersedia sampai 24 Okt 2026. "
         "METAR: bandara IEM yang titiknya jatuh dalam kab (WAOO, WIPP, WIOO, WIBB, dll). GSMaP dan IMERG tidak tersedia (tanpa kredensial). "
         "Klaim di luar kab/kota (kecamatan, taman nasional, jalan tol) dan klaim tanggal 25 sampai 27 Okt tanpa METAR hujan tidak bisa dicek.", "",
         "Ringkasan: " + ", ".join(f"{k} {v}" for k, v in sorted(c.items())), "",
         "Aturan: cocok bila rata-rata kab >= 1 mm atau METAR hujan; lemah 0,1 sampai 1 mm; tidak cocok < 0,1 mm dan METAR kering atau tanpa METAR. "
         "CHIRPS memiliki resolusi 5 km dan hari UTC, hujan sore di sebagian kecil kab dapat luput dari rata-rata. Satu kab = satu klaim.", "",
         "| Tanggal | Provinsi | Kab/kota | Rata (mm) | Maks sel | METAR | Median 1-15 Okt | Tetangga kontrol | Vonis |", "|---|---|---|---:|---:|---|---:|---:|---|"]
    for b in baris:
        m.append(f"| {b['tanggal'][-5:]} | {b['provinsi']} | {b['kab'] or b['klaim'][:50]} | {b.get('rata_mm', '')} | {b.get('maks_sel_mm', '')} | {b.get('metar', '')} | "
                 f"{b.get('median_1_15okt_mm', '')} | {b.get('tetangga_kontrol_mm', '')} | {b['vonis']} |")
    open(f"{RISET}/VERIFIKASI-KLAIM-HUJAN.md", "w").write("\n".join(m) + "\n")
    print(dict(c))


def uji():
    global KABS
    KABS = [{"nama": n} for n in ("Banyuasin", "Musi Banyuasin", "Kota Palembang", "Ogan Komering Ilir")]
    assert token_kab("Musi Banyuasin;Palembang;Banyuasin;OKI (bervariasi)", range(4)) == [1, 2, 0, 3] or sorted(token_kab("Musi Banyuasin;Palembang;Banyuasin;OKI (bervariasi)", range(4))) == [0, 1, 2, 3]
    assert token_kab("Musi Banyuasin", range(4)) == [1]
    assert kelas(1) == "cocok" and kelas(.5) == "lemah" and kelas(0) == "tidak cocok"
    print("uji verifikasi ok")


if __name__ == "__main__":
    uji() if len(sys.argv) > 1 and sys.argv[1] == "uji" else jalan()
