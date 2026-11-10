"""InaRISK lawan kejadian nyata DIBI -> public/data/bnpb/inarisk_vs_kejadian.json

Pertanyaan: kabupaten berkelas bahaya InaRISK RENDAH yang justru sering kena, dan kelas TINGGI yang jarang kena, per jenis bahaya.
Ini bukan uji balik indeks risiko kami (itu ujibalik_risiko.py / risiko_hvc.py): ini membaca peta bahaya resmi terhadap catatan kejadian.

Masukan (semuanya sudah di repo, publik): public/data/bnpb/risiko_hvc.json (H = indeks bahaya InaRISK 0-1 per jenis, rata-rata kecamatan di kabupaten),
dibi_kab_tahun.json (kejadian DIBI per kabupaten x tahun x jenis), kerentanan.json (penduduk Dukcapil, luas km2 per kabupaten).
Hanya DIBI yang dipakai di sini: logbook Dalops tidak turun ke tingkat kabupaten pada keluaran publik.

Kelas bahaya: H < 1/3 rendah, H >= 2/3 tinggi (sepertiga skala 0-1 InaRISK; H adalah rata-rata kecamatan, jadi batas kelas resmi InaRISK per piksel
tidak persis sama).
Laju kejadian = kejadian DIBI per tahun, dinormalisasi DUA cara supaya satu cara tidak menentukan hasil:
  per_penduduk  kejadian per tahun per 100 ribu penduduk
  per_luas      kejadian per tahun per 1.000 km2
Sering = laju >= persentil ke-75 seluruh kabupaten DAN minimal 3 kejadian dalam periode; jarang = laju <= persentil ke-25.
Bila tidak ada hubungan, 25% kabupaten tiap kelas jatuh di tiap ekor (`harapan_persen`); lebih dari itu = bahaya dan kejadian tidak sejalan.
Jenis yang kelas rendah atau tingginya kurang dari 10 kabupaten ditandai `tak_bermakna`.

Hipotesis (belum diuji): kejadian DIBI ikut jumlah penduduk dan kapasitas melapor (kabupaten padat tampak sering kena), H adalah rata-rata kecamatan
sehingga menyembunyikan kecamatan berbahaya, periode pendek (2018-2025) menangkap kejadian besar yang jarang.

Pakai:  python3 scripts/bnpb/inarisk_vs_kejadian.py   |   python3 scripts/bnpb/inarisk_vs_kejadian.py --cek
"""
import datetime as dt, importlib.util, json, math, os, statistics, sys
from collections import defaultdict

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
BD = os.path.join(AKAR, "public/data/bnpb")
KELUAR = os.path.join(BD, "inarisk_vs_kejadian.json")
WIB = dt.timezone(dt.timedelta(hours=7))
TAHUN = list(range(2018, 2026))
JENIS = ["banjir", "longsor", "cuaca", "kekeringan", "gempa", "karhutla", "abrasi"]
RENDAH, TINGGI = 1 / 3, 2 / 3
MIN_KEJ, MIN_KAB, TOP = 3, 10, 8
NORMA = {"per_penduduk": ("penduduk", 1e5, "kejadian per tahun per 100 ribu penduduk"), "per_luas": ("luas", 1e3, "kejadian per tahun per 1.000 km²")}
MIN_BANDING = 10        # kelas dengan kurang dari ini kabupaten tidak dibandingkan (layar menulis tanda strip dan n)
PITA = 5.0              # titik persen: selisih dari dasar yang masih dianggap "sekitar dasar"


def persentil(xs, p):
    s = sorted(xs)
    if not s:
        return None
    k = (len(s) - 1) * p
    a, b = math.floor(k), math.ceil(k)
    return s[a] + (s[b] - s[a]) * (k - a)


def rank(xs):
    """Peringkat rata-rata untuk seri."""
    o = sorted(range(len(xs)), key=lambda i: xs[i])
    r, i = [0.0] * len(xs), 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and xs[o[j + 1]] == xs[o[i]]:
            j += 1
        for k in range(i, j + 1):
            r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(a, b):
    if len(a) < 3:
        return None
    ra, rb = rank(a), rank(b)
    ma, mb = statistics.fmean(ra), statistics.fmean(rb)
    sa = math.sqrt(sum((x - ma) ** 2 for x in ra))
    sb = math.sqrt(sum((y - mb) ** 2 for y in rb))
    return None if not sa or not sb else round(sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / (sa * sb), 3)


def hitung(kab, n_tahun):
    """kab = {kode: {"nama", "prov", "H": {jenis: 0-1}, "penduduk", "luas", "kej": {jenis: total kejadian periode}}} -> dict per jenis."""
    out = {}
    for j in JENIS:
        ada = [(k, v) for k, v in kab.items() if v["H"].get(j) is not None and v["penduduk"] and v["luas"]]
        r = {"n_kab": len(ada), "kejadian_total": sum(v["kej"].get(j, 0) for _, v in ada),
             "n_rendah": sum(1 for _, v in ada if v["H"][j] < RENDAH), "n_sedang": sum(1 for _, v in ada if RENDAH <= v["H"][j] < TINGGI),
             "n_tinggi": sum(1 for _, v in ada if v["H"][j] >= TINGGI)}
        r["tak_bermakna"] = None if min(r["n_rendah"], r["n_tinggi"]) >= MIN_KAB else (
            f"kelas {'rendah' if r['n_rendah'] < MIN_KAB else 'tinggi'} hanya {min(r['n_rendah'], r['n_tinggi'])} kabupaten (minimal {MIN_KAB})")
        for nm, (kunci, per, ket) in (NORMA.items() if ada else ()):
            laju = {k: v["kej"].get(j, 0) / n_tahun / (v[kunci] / per) for k, v in ada}
            p75, p25 = persentil(list(laju.values()), 0.75), persentil(list(laju.values()), 0.25)
            sering = {k for k, _ in ada if laju[k] >= p75 and kab[k]["kej"].get(j, 0) >= MIN_KEJ}
            jarang = {k for k, _ in ada if laju[k] <= p25}
            rend = [k for k, v in ada if v["H"][j] < RENDAH]
            ting = [k for k, v in ada if v["H"][j] >= TINGGI]
            baris = lambda k: {"kab": kab[k]["nama"], "prov": kab[k]["prov"], "H": round(kab[k]["H"][j], 2), "kejadian": kab[k]["kej"].get(j, 0), "laju": round(laju[k], 2)}
            base_sering = round(100 * len(sering) / len(ada), 1)
            base_jarang = round(100 * len(jarang) / len(ada), 1)
            r[nm] = {
                "base_sering": base_sering, "base_jarang": base_jarang,
                "jarang_tak_bermakna": f"persentil 25 laju = 0 dan {base_jarang:.1f}% kabupaten tanpa kejadian (batas 50%)" if p25 == 0 and base_jarang > 50 else None,
                "satuan": ket, "ambang_sering": round(p75, 2), "ambang_jarang": round(p25, 2),
                "rho_spearman": spearman([kab[k]["H"][j] for k, _ in ada], [laju[k] for k, _ in ada]),
                "rendah_sering": {"n": sum(k in sering for k in rend), "dari": len(rend), "persen": round(100 * sum(k in sering for k in rend) / len(rend), 1) if rend else None,
                                  "contoh": [baris(k) for k in sorted((k for k in rend if k in sering), key=lambda k: -laju[k])[:TOP]]},
                "tinggi_jarang": {"n": sum(k in jarang for k in ting), "dari": len(ting), "persen": round(100 * sum(k in jarang for k in ting) / len(ting), 1) if ting else None,
                                  "contoh": [baris(k) for k in sorted((k for k in ting if k in jarang), key=lambda k: -kab[k]["H"][j])[:TOP]]},
                "tinggi_sering_persen": round(100 * sum(k in sering for k in ting) / len(ting), 1) if ting else None,
                "median_penduduk_ribu_rendah_sering": round(statistics.median([kab[k]["penduduk"] for k in rend if k in sering]) / 1000) if any(k in sering for k in rend) else None,
                "median_penduduk_ribu_semua": round(statistics.median([v["penduduk"] for _, v in ada]) / 1000),
            }
        r["sejalan"] = sejalan(r)
        out[j] = r
    return out


def kesimpulan(persen, dasar, dari):
    """lebih / kurang / sekitar dasar; None bila kelas terlalu kecil untuk dibandingkan."""
    if persen is None or dari < MIN_BANDING:
        return None
    return "lebih" if persen > dasar + PITA else "kurang" if persen < dasar - PITA else "sekitar"


def sejalan(r):
    """Apakah dua normalisasi sampai pada kesimpulan yang sama terhadap dasar (persen kelas dibanding persen seluruh kabupaten)?
    -> {rendah_sering, tinggi_jarang: True/False/None(tak bisa dinilai)}."""
    out = {}
    for kel, g, dasar in (("rendah_sering", "rendah_sering", "base_sering"), ("tinggi_jarang", "tinggi_jarang", "base_jarang")):
        ks = []
        for nm in NORMA:
            d = r.get(nm)
            ks.append(None if not d or r["tak_bermakna"] or (kel == "tinggi_jarang" and d["jarang_tak_bermakna"]) else kesimpulan(d[g]["persen"], d[dasar], d[g]["dari"]))
        out[kel] = None if None in ks else ks[0] == ks[1]
    return out


def _wilayah():
    s = importlib.util.spec_from_file_location("wilayah_data", os.path.join(AKAR, "scripts/data/wilayah.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m.PROVINSI


def muat():
    hvc = json.load(open(os.path.join(BD, "risiko_hvc.json")))
    ker = json.load(open(os.path.join(BD, "kerentanan.json")))["kab"]
    dibi = json.load(open(os.path.join(BD, "dibi_kab_tahun.json")))
    prov = _wilayah()
    kab = {}
    for kode, v in hvc["kab"].items():
        kk = ker.get(kode) or {}
        kab[kode] = {"nama": v.get("nama") or kode, "prov": prov.get(kode[:2], kode[:2]), "H": v["H"], "penduduk": kk.get("n"), "luas": kk.get("luas"), "kej": defaultdict(int)}
    ix = {c: i for i, c in enumerate(dibi["kolom"])}
    for r in dibi["baris"]:
        if r[ix["tahun"]] in TAHUN and r[ix["kab"]] in kab:
            kab[r[ix["kab"]]]["kej"][r[ix["jenis"]]] += r[ix["kejadian"]]
    return kab, dibi


def main():
    kab, dibi = muat()
    o = {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"), "judul": "InaRISK lawan kejadian nyata DIBI",
         "label": "hipotesis: temuan ketidaksejalanan, belum diuji sebab; bukan penilaian peta InaRISK salah atau catatan DIBI salah",
         "tahun": [TAHUN[0], TAHUN[-1]], "tahun_dibi_tersedia": dibi.get("tahun_data"), "n_kabupaten": len(kab),
         "kelas": {"rendah": "H < 0,33", "sedang": "0,33 sampai < 0,67", "tinggi": "H >= 0,67"},
         "aturan": {"sering": f"laju >= persentil ke-75 dan minimal {MIN_KEJ} kejadian", "jarang": "laju <= persentil ke-25", "harapan_persen": 25},
         "jenis": hitung(kab, len(TAHUN)),
         "hipotesis": ["Kejadian DIBI ikut jumlah penduduk dan kapasitas melapor, jadi kabupaten padat tampak sering kena walau bahayanya rendah (hipotesis, belum diuji).",
                       "H adalah rata-rata kecamatan; kabupaten dengan satu kecamatan berbahaya tampak rendah (hipotesis, belum diuji).",
                       "Delapan tahun pendek untuk bahaya yang jarang tetapi besar, seperti gempa; kabupaten tinggi-jarang bisa menunggu kejadian (hipotesis, belum diuji)."],
         "catatan": ["Hanya DIBI (publik) dipakai di tingkat kabupaten.", "Dua normalisasi ditampilkan berdampingan; kesimpulan hanya dipegang bila keduanya sejalan.",
                     "Bahaya InaRISK sebagian dibangun dari data historis yang tidak kami periksa, jadi independensinya dari DIBI tidak terjamin."]}
    json.dump(o, open(KELUAR, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    for j, r in o["jenis"].items():
        print(j, r["n_kab"], r["tak_bermakna"] or "", {n: (r[n]["rendah_sering"]["n"], r[n]["rendah_sering"]["dari"], r[n]["tinggi_jarang"]["n"], r[n]["tinggi_jarang"]["dari"], r[n]["rho_spearman"]) for n in NORMA})


def cek():
    assert persentil([1, 2, 3, 4, 5], 0.75) == 4 and persentil([], .5) is None
    assert rank([10, 20, 20, 30]) == [1.0, 2.5, 2.5, 4.0]
    assert spearman([1, 2, 3, 4], [10, 20, 30, 40]) == 1.0 and spearman([1, 2, 3, 4], [4, 3, 2, 1]) == -1.0 and spearman([1, 1, 1], [1, 2, 3]) is None
    # 40 kabupaten: H naik dengan nomor, kejadian naik dengan nomor (sejalan) kecuali dua pengecualian yang sengaja dipasang
    kab = {}
    for i in range(40):
        kab[f"{i:04d}"] = {"nama": f"K{i}", "prov": "P", "H": {"banjir": i / 39}, "penduduk": 100000, "luas": 1000, "kej": {"banjir": i}}
    kab["0000"]["kej"]["banjir"] = 90        # H terendah tetapi paling sering: harus ke rendah_sering
    kab["0039"]["kej"]["banjir"] = 0         # H tertinggi tetapi tanpa kejadian: harus ke tinggi_jarang
    kab["0001"]["penduduk"] = None           # tanpa penduduk: keluar dari hitungan
    r = hitung(kab, 8)["banjir"]
    assert r["n_kab"] == 39 and r["n_rendah"] + r["n_sedang"] + r["n_tinggi"] == 39, r
    p = r["per_penduduk"]
    assert p["rendah_sering"]["n"] == 1 and p["rendah_sering"]["contoh"][0]["kab"] == "K0" and p["rendah_sering"]["contoh"][0]["kejadian"] == 90, p["rendah_sering"]
    assert p["tinggi_jarang"]["contoh"][0]["kab"] == "K39", p["tinggi_jarang"]
    assert r["per_luas"]["rendah_sering"]["n"] == 1 and r["tak_bermakna"] is None
    assert p["rho_spearman"] > 0.5
    # jenis tanpa kabupaten tinggi -> tak bermakna; jenis tanpa data tidak membuat galat
    kab2 = {f"{i:04d}": {"nama": f"K{i}", "prov": "P", "H": {"abrasi": 0.0}, "penduduk": 1e5, "luas": 1000, "kej": {}} for i in range(20)}
    r2 = hitung(kab2, 8)["abrasi"]
    assert r2["tak_bermakna"] and r2["per_penduduk"]["tinggi_jarang"]["persen"] is None and r2["per_penduduk"]["rendah_sering"]["n"] == 0
    assert hitung({}, 8)["gempa"]["n_kab"] == 0 and "per_penduduk" not in hitung({}, 8)["gempa"]
    # sering butuh minimal MIN_KEJ kejadian: laju tinggi karena penduduk kecil dengan 1 kejadian tidak masuk
    kab3 = {f"{i:04d}": {"nama": f"K{i}", "prov": "P", "H": {"banjir": 0.1}, "penduduk": 1e5, "luas": 1000, "kej": {"banjir": 0}} for i in range(30)}
    kab3["0000"]["penduduk"], kab3["0000"]["kej"]["banjir"] = 1000, 1
    assert hitung(kab3, 8)["banjir"]["per_penduduk"]["rendah_sering"]["n"] == 0
    # dasar: kabupaten tanpa kejadian lebih dari separuh -> persentil 25 = 0, jarang tak bermakna; dasar sering dihitung dari seluruh kabupaten
    kab4 = {f"{i:04d}": {"nama": f"K{i}", "prov": "P", "H": {"gempa": i / 59}, "penduduk": 1e5, "luas": 1000, "kej": {"gempa": 0 if i < 45 else 6}} for i in range(60)}
    g = hitung(kab4, 8)["gempa"]["per_penduduk"]
    assert g["jarang_tak_bermakna"] and g["base_jarang"] == 75.0 and g["base_sering"] == 25.0, g
    assert hitung(kab4, 8)["gempa"]["sejalan"]["tinggi_jarang"] is None          # tak bisa dinilai
    # sejalan: normalisasi sama (penduduk dan luas seragam) -> True
    assert hitung(kab, 8)["banjir"]["sejalan"]["rendah_sering"] is True, hitung(kab, 8)["banjir"]["sejalan"]
    assert kesimpulan(30, 25, 40) == "sekitar" and kesimpulan(40, 25, 40) == "lebih" and kesimpulan(10, 25, 40) == "kurang" and kesimpulan(90, 25, 9) is None
    print("inarisk_vs_kejadian.py --cek hijau")


if __name__ == "__main__":
    cek() if "--cek" in sys.argv else main()
