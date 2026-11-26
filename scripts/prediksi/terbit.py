"""Gabung arsip + kalibrasi + skor + aturan dampak -> public/prediksi/data/prediksi.json (yang tampil di /prediksi).

Per kode diambil baris arsip TERAKHIR (tanggal terbitnya ikut tertulis; kode yang hari ini gagal dibekukan tampil dengan
tanggal lamanya, bukan disamarkan). Peluang diganti versi kalibrasi HANYA untuk grup berstatus "dipakai" di kalibrasi.json;
jumlah & lama hujan dikali rasio provinsi yang "dipakai". Tiap angka membawa vonis grupnya dari skor.json
("belum teruji" bila belum ada atau kurang dari 30 hari sasaran, aturan K17 di nilai.py).

Dampak (aturan.json): jiwa terpapar banjir = paparan_kab.json (scripts/banjir/dampak_kab.py: penduduk x porsi luas zona
bahaya tinggi), longsor = penduduk kecamatan berbahaya tinggi (public/data/penduduk.json x public/banjir/data/bahaya.json); sekolah & murid dari public/data/sekolah.json; faskes/RS dari public/data/fasilitas.json
(ke pusat kecamatan terdekat di provinsi yang sama). Mengungsi = jiwa terpapar x laju DIBI sum(mengungsi)/sum(terdampak)
(hanya baris sah terdampak >= mengungsi dan bencana != 0, kembar dibuang, nasional tanpa provinsi > 50% Σmengungsi, disusutkan ke nasional dengan K_SUSUT, dijepit ke rasio
kejadian tertinggi kab; kab bila >= 5 baris sah, selain itu nasional; DIBI 12 bulan). Kebutuhan harian Sphere 2018. Semua berlabel perkiraan.

Pakai:  python3 scripts/prediksi/terbit.py   |   python3 scripts/prediksi/terbit.py uji
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D
from kalibrasi import terapkan

SINI = os.path.dirname(os.path.abspath(__file__))
TAMPIL = {"HJN": ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "m"], "API": ["p", "d"], "BNJ": ["lv", "ps"],
          "LSR": ["lv", "ps"], "ASP": ["pm", "kat"], "ROB": ["lewat", "sel"], "GEL": ["hs", "lv"], "CEX": ["emb", "lv"]}
LABEL = {"HJN": "Hujan", "API": "Titik panas", "BNJ": "Banjir", "LSR": "Longsor", "ASP": "Asap (PM2,5)", "ROB": "Rob", "GEL": "Gelombang", "CEX": "Angin kencang"}
AMBANG_KOL = {("HJN", "p1"): 1, ("HJN", "p20"): 20, ("HJN", "p50"): 50, ("API", "p"): 1, ("BNJ", "ps"): 1, ("LSR", "ps"): 1}
OP = {">=": lambda a, b: a >= b, "<": lambda a, b: a < b, ">": lambda a, b: a > b, "<=": lambda a, b: a <= b}
BATASAN = ["Semua peluang di halaman ini mentah sampai rapornya cukup (>= 30 pasangan) dan kalibrasinya lolos uji tahan 14 hari.",
           "Peluang hujan tanpa ansambel (m=0) adalah skor kasar dari jumlah hujan deterministik, bukan peluang terkalibrasi.",
           "Hujan sementara dinilai terhadap analisis model, bukan pengukuran; nilai final memakai ERA5.",
           "Perkiraan mengungsi (jiwa terpapar di zona prakiraan x laju DIBI 12 bulan) ditahan sampai uji balik lawan DIBI lulus; yang tampil hanya jiwa terpapar."]


def terakhir(entri):
    out = {}
    for e in entri:
        if e["k"] not in out or e["t"] >= out[e["k"]]["t"]:
            out[e["k"]] = e
    return out


def vonis(skor, kode, ambang, n):
    """Vonis grup (final dipilih atas sementara). -> (teks, n, bss_klim)"""
    g = [x for x in (skor.get("kode", {}).get(kode, {}).get("grup") or []) if x["ambang"] == ambang and x["tenggang"] == n]
    g.sort(key=lambda x: x["tahap"] != "final")
    if not g:
        return ["belum teruji", 0, None]
    return [g[0]["vonis"], g[0]["n_banding"], g[0].get("bss_klimatologi")]


def hari_vonis(skor, kode, ambang, n):
    """Hari sasaran yang dinilai grup vonis (unsur ke-5 vonis di prediksi.json; aturan K17 dihitung per hari, bukan per kab-hari)."""
    g = [x for x in (skor.get("kode", {}).get(kode, {}).get("grup") or []) if x["ambang"] == ambang and x["tenggang"] == n]
    g.sort(key=lambda x: x["tahap"] != "final")
    return g[0].get("hari_banding", 0) if g else 0


def peta_kal(kal, aktif=None):
    """aktif = kalibrasi_aktif.json (koreksi.py, BNJ): menambah peta, tak menimpa kalibrasi.json."""
    p = {(x["kode"], x["ambang"], x["tenggang"]): x["peta"] for x in kal.get("peluang", []) if x["status"] == "dipakai" and x.get("peta")}
    p.update({(g.split("|")[0], int(g.split("|")[1]), int(g.split("|")[2])): v["peta"] for g, v in ((aktif or {}).get("grup") or {}).items() if v.get("peta")})
    r = {(x["besaran"], x["tenggang"], x["prov"]): x["rasio"] for x in kal.get("jumlah", []) if x["status"] == "dipakai"}
    return p, r


def baris_tampil(e, kab_id, prov, pk, rk):
    """Baris arsip satu kab -> 3 baris tampil (kolom TAMPIL), terkalibrasi bila grupnya dipakai."""
    kol = e["kol"]
    out = []
    for n, r in enumerate(e["kab"].get(kab_id) or [None] * 3, 1):
        if r is None:
            out.append(None)
            continue
        v = dict(zip(kol, r))
        for c in TAMPIL[e["k"]]:
            a = AMBANG_KOL.get((e["k"], c))
            if a is not None and v[c] is not None and (peta := pk.get((e["k"], a, n))):
                v[c] = round(terapkan(peta, v[c]), 2)
        if e["k"] == "HJN":
            for c in ("tot", "lama"):
                if (ra := rk.get((c, n, prov))) and v[c] is not None:
                    v[c] = round(v[c] * ra, 1) if c == "tot" else round(v[c] * ra)
            # p1 >= p20 >= p50 dijaga sesudah kalibrasi per ambang
            v["p20"] = max(v["p20"], v["p50"])
            v["p1"] = max(v["p1"], v["p20"])
        out.append([v.get(c) for c in TAMPIL[e["k"]]])
    return out


# ---------- paparan ----------
def paparan(akar, daftar, cari, aturan):
    """-> {kab: {bahaya: {jiwa, kec, sekolah, murid, faskes}}, "_kab": {jiwa, murid}}"""
    pend = D.baca(os.path.join(akar, "public", "data", "penduduk.json"), {}).get("kec", {})
    bah = D.baca(os.path.join(akar, "public", "banjir", "data", "bahaya.json"), {}).get("kec", {})
    pusat = D.baca(os.path.join(akar, "public", "banjir", "data", "pusat_kec.json"), {})
    kec_kab = {k: cari(*k.split("|")[:2]) for k in set(pend) | set(bah) | set(pusat)}
    kunci_kec = {(k.split("|")[0], D.kunci(k.split("|")[1]), D.kunci(k.split("|")[2])): k for k in kec_kab if k.count("|") == 2}
    sekolah, murid_kab = {}, {}
    s = D.baca(os.path.join(akar, "public", "data", "sekolah.json"), {"kolom": [], "baris": []})
    c = {n: i for i, n in enumerate(s["kolom"])}
    for r in s["baris"]:
        kec = kunci_kec.get((r[c["prov"]], D.kunci(r[c["kab"]] or ""), D.kunci(r[c["kec"]] or "")))
        if kec:
            x = sekolah.setdefault(kec, [0, 0])
            x[0] += 1
            x[1] += r[c["siswa"]] or 0
            if kec_kab.get(kec):
                murid_kab[kec_kab[kec]] = murid_kab.get(kec_kab[kec], 0) + (r[c["siswa"]] or 0)
    faskes = {}
    per_prov = {}
    for k, ll in pusat.items():
        per_prov.setdefault(k.split("|")[0], []).append((ll[0], ll[1], k))
    for f in D.baca(os.path.join(akar, "public", "data", "fasilitas.json"), []):
        if f.get("t") in ("faskes", "rs") and (kec := D.terdekat(f["lat"], f["lon"], per_prov.get(f.get("prov"), []), 0.5)):
            faskes[kec] = faskes.get(kec, 0) + 1
    out = {k["id"]: {"_kab": {"jiwa": k["jiwa"], "murid": murid_kab.get(k["id"], 0)}} for k in daftar}
    for a in aturan:
        p = a.get("paparan") or {}
        if p.get("jenis") != "kec_bahaya":
            continue
        for kec, b in bah.items():
            if (b.get(p["bahaya"]) or 0) >= p["ambang"] and (kab := kec_kab.get(kec)):
                x = out[kab].setdefault(p["bahaya"], {"jiwa": 0, "kec": 0, "sekolah": 0, "murid": 0, "faskes": 0})
                x["jiwa"] += pend.get(kec, 0)
                x["kec"] += 1
                x["sekolah"] += sekolah.get(kec, [0, 0])[0]
                x["murid"] += sekolah.get(kec, [0, 0])[1]
                x["faskes"] += faskes.get(kec, 0)
        if p.get("jiwa_dari"):  # satu sumber jiwa: penduduk zona bahaya tinggi porsi luas (dampak_kab.py), bukan seluruh kecamatan
            zona = D.baca(os.path.join(akar, "public", "banjir", "data", p["jiwa_dari"]), {}).get("kab", {})
            if not zona:
                raise SystemExit(f"{p['jiwa_dari']} kosong/hilang: jiwa terpapar {p['bahaya']} tidak boleh jatuh ke metode lama")
            for k in daftar:
                if k["geo"] in zona:   # tanpa kecamatan berbahaya tinggi: hanya jiwa (sekolah/faskes tak dihitung, bukan nol)
                    out[k["id"]].setdefault(p["bahaya"], {})["jiwa"] = zona[k["geo"]][0]
                else:                  # kab tak ada di paparan: jangan tampilkan angka metode lama berlabel zona
                    out[k["id"]].pop(p["bahaya"], None)
    # KI-65: porsi banjir (zona tinggi, bahaya_kelas.json) dan longsor (kec >= ambang) per kecamatan, untuk gabungan tanpa hitung ganda
    pb = {a["paparan"]["bahaya"]: a["paparan"] for a in aturan if (a.get("paparan") or {}).get("jenis") == "kec_bahaya"}
    if "banjir" in pb and "longsor" in pb:
        kelas = D.baca(os.path.join(akar, "public", "banjir", "data", "bahaya_kelas.json"), {}).get("kec", {})
        per = {}
        for kec, j in pend.items():
            if kec_kab.get(kec):
                bj = (kelas.get(kec) or {}).get("banjir")
                per.setdefault(kec_kab[kec], []).append((j, bj[2] / 100 if bj else 0.0, 1.0 if (bah.get(kec, {}).get("longsor") or 0) >= pb["longsor"]["ambang"] else 0.0))
        for kab, o in out.items():
            if "banjir" in o and "longsor" in o:
                v, jp = _gabung(per.get(kab, []), o["banjir"].get("jiwa", 0), o["longsor"].get("jiwa", 0))
                o["gabungan"] = {"jiwa": v, "dijepit": jp}
    return out


def gabung_jiwa(per_kec, b, l):
    return _gabung(per_kec, b, l)[0]


def _gabung(per_kec, b, l):
    """KI-65. per_kec = [(jiwa kec, porsi banjir 0..1, porsi longsor 0..1)]; b, l = jiwa per bahaya yang SUDAH tampil (tak diubah).
    Satu orang dihitung sekali: gabungan per kec = jiwa x (1 - (1-pb)(1-pl)) (porsi luas bebas satu sama lain, pola sim_tanggap.js);
    longsor berporsi 1 (seluruh kec = batas atas) menelan banjir. Dijepit ke [max(b, l), b + l].
    Independensi porsi hanya ASUMSI (label GABUNGAN_CATATAN). -> (jiwa, apakah jepitan mengubah nilai)."""
    u = sum(j * (1 - (1 - pb) * (1 - pl)) for j, pb, pl in per_kec)
    v = round(min(max(u, b, l), b + l))
    return v, v != round(u)


GABUNGAN_CATATAN = "perkiraan; independensi diasumsikan"


K_SUSUT = 10000   # jiwa terdampak semu dari laju nasional: kab dengan Σterdampak << 10.000 hampir ikut nasional (susut empiris-Bayes kasar)
MIN_SAH = 5       # baris DIBI sah minimum per kab; kurang dari ini = laju nasional
DOMINAN = 0.5     # provinsi yang memegang > 50% Σmengungsi nasional dikeluarkan dari laju NASIONAL (Aceh akhir Nov 2025: 90% banjir)


def laju_ungsi(akar, cari, jenis, baris=None):
    """-> (fungsi kab -> (laju, n_kejadian, asal), laju nasional, info nasional). Hanya baris sah: terdampak > 0, terdampak >= mengungsi
    (kunci tak ada = 0 menurut catatan dibi_kejadian.json; baris mengungsi tanpa terdampak dibuang, bukan dibaca 100%), dan
    bencana != 0 (baris di bawah ambang DIBI tidak masuk angka resmi, jadi tidak dihitung). Baris kembar persis (kab, tanggal,
    jenis, angka) dihitung sekali. Laju nasional = Σm/Σt tanpa provinsi dominan (> DOMINAN Σm), dibuang sekali; info membawa
    metode, provinsi dibuang, median rasio per kejadian, dan n. Laju kab = (Σm + K·nas)/(Σt + K) dari semua baris sah kab itu,
    dijepit ke rasio per kejadian tertinggi kab; < MIN_SAH baris sah = nasional. Sumber hanya DIBI 12 bulan (dari..sampai)."""
    if baris is None:
        baris = D.baca(os.path.join(akar, "public", "data", "dibi_kejadian.json"), {"kejadian": []})["kejadian"]
    per, lihat, prov, rasio = {}, set(), {}, []
    for r in baris:
        t, m = r.get("terdampak") or 0, r.get("mengungsi") or 0
        if r["jenis"] not in jenis or t <= 0 or t < m or r.get("bencana") == 0:
            continue
        k = cari(r["prov_kode"], r["kab"])
        sid = (k, r.get("tanggal"), r["jenis"], t, m)
        if sid in lihat:
            continue
        lihat.add(sid)
        x = per.setdefault(k, [0, 0, 0, 0.0])
        x[0] += m; x[1] += t; x[2] += 1; x[3] = max(x[3], m / t)
        y = prov.setdefault(r["prov_kode"], [0, 0])
        y[0] += m; y[1] += t
        rasio.append(m / t)
    sm, st = sum(y[0] for y in prov.values()), sum(y[1] for y in prov.values())
    dom = max(prov, key=lambda p: prov[p][0]) if sm else None
    buang = dom if dom and prov[dom][0] > DOMINAN * sm and st > prov[dom][1] else None
    if buang:
        sm, st = sm - prov[buang][0], st - prov[buang][1]
    n = sm / st if st else 0
    rasio.sort()
    med = (rasio[(len(rasio) - 1) // 2] + rasio[len(rasio) // 2]) / 2 if rasio else None
    info = {"laju": round(n, 4), "metode": "Σmengungsi/Σterdampak baris DIBI sah, tanpa provinsi > 50% Σmengungsi" if buang
            else "Σmengungsi/Σterdampak baris DIBI sah (tidak ada provinsi > 50% Σmengungsi)",
            "prov_dibuang": buang, "median_kejadian": round(med, 4) if med is not None else None, "n_kejadian": len(rasio)}

    def f(k):
        x = per.get(k)
        if not x or x[2] < MIN_SAH:
            return n, x[2] if x else 0, "nasional"
        return min((x[0] + K_SUSUT * n) / (x[1] + K_SUSUT), x[3]), x[2], "kab"
    return f, n, info


def kebutuhan(ungsi, sp):
    return {"mengungsi": ungsi, "air_l": ungsi * sp["air_l"], "hunian_m2": round(ungsi * sp["hunian_m2"]),
            "jamban": math.ceil(ungsi / sp["jamban_per"]), "kkal": ungsi * sp["kkal"]}


def nilai_var(kab, n, var):
    """var 'KODE.kol' atau 'HJN.tot3' -> nilai untuk tenggang n (1..3) dari baris tampil kab."""
    kode, kol = var.split(".")
    rows = kab.get(kode)
    if not rows:
        return None
    if var == "HJN.tot3":
        v = [r[TAMPIL_X["HJN"].index("tot")] if r else None for r in rows]
        return None if None in v else round(sum(v), 1)
    r = rows[n - 1]
    return r[TAMPIL_X[kode].index(kol)] if r and kol in TAMPIL_X[kode] else None


TAMPIL_X = {**TAMPIL, "HJN": TAMPIL["HJN"] + ["sm"], "API": TAMPIL["API"] + ["ps"]}


def evaluasi(a, kab, n):
    """-> True / False / None (masukan kurang)."""
    hasil = []
    for s in a.get("semua", []):
        v = nilai_var(kab, n, s["v"])
        hasil.append(None if v is None else OP[s["op"]](v, s["nilai"]))
    if a.get("salah_satu"):
        x = [None if (v := nilai_var(kab, n, s["v"])) is None else OP[s["op"]](v, s["nilai"]) for s in a["salah_satu"]]
        hasil.append(True if True in x else (None if None in x else False))
    if False in hasil:
        return False
    return None if None in hasil or not hasil else True


def terbit(akar=D.AKAR, folder=None, data=None, entri=None, kini=None):
    data = data or D.DATA
    daftar = D.kab(akar)
    cari = D.pencari(daftar)
    semua = [e for e in (entri if entri is not None else D.semua_arsip(folder)) if e["k"] in D.KODE]   # model bayangan tak ikut kartu
    akhir = terakhir(semua)
    if not akhir:
        sys.exit("terbit: arsip kosong; jalankan catat.py dulu")
    skor = D.baca(os.path.join(data, "skor.json"), {})
    kal = D.baca(os.path.join(data, "kalibrasi.json"), {})
    pk, rk = peta_kal(kal, D.baca(os.path.join(data, "kalibrasi_aktif.json"), {}))
    at = json.load(open(os.path.join(SINI, "aturan.json")))
    aturan = [a for a in at["aturan"] if a.get("aktif", True)]
    pap = paparan(akar, daftar, cari, aturan)
    laju = {a["id"]: laju_ungsi(akar, cari, set(a["mengungsi"]["jenis_dibi"])) for a in aturan if a.get("mengungsi")}
    kabs, waspada = [], []
    for k in daftar:
        x = {"id": k["id"], "nama": k["nama"], "prov": k["prov"], "pn": k["pn"], "jiwa": k["jiwa"], "geo": k["geo"]}
        for kode, e in akhir.items():
            rows = baris_tampil(e, k["id"], k["prov"], pk, rk)
            if any(rows):
                x[kode] = rows
        # kolom bantu aturan (sm, ps) tidak ditampilkan, dibaca langsung dari arsip
        bantu = {}
        for kode, kol in (("HJN", "sm"), ("API", "ps")):
            e = akhir.get(kode)
            if e and x.get(kode):
                bantu[kode] = [r + [dict(zip(e["kol"], a or [])).get(kol)] if r else None for r, a in zip(x[kode], e["kab"].get(k["id"]) or [None] * 3)]
        xv = {**x, **bantu}
        awal = len(waspada)
        for a in aturan:
            for n in (1, 2, 3):
                if evaluasi(a, xv, n):
                    p = a.get("paparan", {})
                    if p.get("jenis") == "kec_bahaya":
                        d = dict(pap[k["id"]].get(p.get("bahaya"), {}))
                    else:                  # "tanpa" = tak ada data penduduk terpapar (mis. nelayan): dampak kosong, bukan dikarang
                        d = {} if p.get("jenis") == "tanpa" else {"jiwa": k["jiwa"]}
                    if p.get("murid"):
                        d["murid"] = pap[k["id"]]["_kab"]["murid"]
                    if a["id"] in laju and d.get("jiwa"):
                        f = laju[a["id"]][0]
                        lj, nk, asal = f(k["id"])
                        d["laju_ungsi"], d["n_kejadian"], d["laju_asal"] = round(lj, 4), nk, asal
                        d["kebutuhan"] = kebutuhan(round(d["jiwa"] * d["laju_ungsi"]), at["sphere"])
                    waspada.append({"kab": k["id"], "tenggang": n, "aturan": a["id"], "maka": a["maka"], "dampak": d})
        for n in (1, 2, 3):   # KI-65: banjir dan longsor menyala bersama di kab+tenggang yang sama -> jiwa gabungan di kedua dampak
            dua = [w for w in waspada[awal:] if w["kab"] == k["id"] and w["tenggang"] == n and w["aturan"] in ("banjir", "longsor")]
            g = pap[k["id"]].get("gabungan")
            if len(dua) == 2 and g:
                for w in dua:
                    w["dampak"]["gabungan_jiwa"] = g["jiwa"]
                    w["dampak"]["gabungan_catatan"] = GABUNGAN_CATATAN
        kabs.append(x)
    kode = {}
    for kd, e in akhir.items():
        vn = {}
        for c in TAMPIL[kd]:
            a = AMBANG_KOL.get((kd, c))
            if a is not None:
                for n in (1, 2, 3):
                    vn[f"{c}|{n}"] = vonis(skor, kd, a, n) + [bool(pk.get((kd, a, n))), hari_vonis(skor, kd, a, n)]
        kode[kd] = {"label": LABEL[kd], "terbit": e["t"], "hari": e["hari"], "sumber": e["sumber"], "dibuat": e["dibuat"],
                    "kol": TAMPIL[kd], "vonis": vn, "status": (skor.get("kode", {}).get(kd) or {}).get("status", "menunggu")}
    out = {"versi": 1, "dibuat": dt.datetime.now(D.WIB).replace(microsecond=0).isoformat(), "kode": kode, "kab": kabs,
           "waspada": waspada, "aturan": [{k: a[k] for k in ("id", "maka", "semua", "salah_satu", "paparan", "catatan", "aktif", "alasan") if k in a} for a in at["aturan"]],
           "sphere": at["sphere"], "kalibrasi": kal.get("ringkas", {}), "batasan": BATASAN,
           "laju_ungsi_nasional": {i: v[2] for i, v in laju.items()},
           "gabungan_dijepit": sum(1 for v in pap.values() if (v.get("gabungan") or {}).get("dijepit"))}
    galat = periksa(out)
    if galat:
        raise ValueError("prediksi.json tidak sah: " + "; ".join(galat[:5]))
    D.simpan(os.path.join(data, "prediksi.json"), out)
    D.simpan(os.path.join(data, "lalu.json"), lalu(semua, kini or D.hari_ini(), pk, rk))
    lg = lengas(akhir)
    if lg:
        D.simpan(os.path.join(data, "lengas.json"), lg)
    return out


def lalu(semua, kini, pk, rk, hari=3):
    """Prakiraan tenggang +1 yang sasarannya hari ini dan 3 hari lalu, untuk tab Konfirmasi:
    {"hari": {sasaran: {kode: {"kol": [...], "kab": {id: baris}}}}}"""
    awal = D.geser(kini, -hari)
    out = {}
    for e in semua:
        s = e["hari"][0]
        if awal <= s <= kini:
            kab = {k: r for k in e["kab"] if (r := baris_tampil(e, k, k[:2], pk, rk)[0])}
            out.setdefault(s, {})[e["k"]] = {"terbit": e["t"], "kol": TAMPIL[e["k"]], "kab": kab}
    # hari0: per kode, terbitan terakhir yang salah satu hari sasarannya = hari ini (tenggang berapa pun), untuk status_prakiraan.py
    # (DP-06b). "hari" di atas hanya tenggang +1; bila terbitan kemarin tak ada di arsip, hari ini tak punya baris di sana.
    h0 = {}
    for e in sorted(semua, key=lambda e: e["t"]):
        if kini in e["hari"]:
            n = e["hari"].index(kini)
            h0[e["k"]] = {"terbit": e["t"], "tenggang": n + 1, "kol": TAMPIL[e["k"]],
                          "kab": {k: r for k in e["kab"] if (r := baris_tampil(e, k, k[:2], pk, rk)[n])}}
    return {"dibuat": kini, "hari": out, "hari0": h0}


def lengas(akhir):
    """Lengas tanah per kab untuk tab Laporan provinsi: kolom sm (Open-Meteo soil_moisture 3-9 dan 9-27 cm, dihitung catat.py)
    tenggang +1 dari entri HJN terakhir. -> {"dibuat", "hari", "sumber", "kab": {id: sm}} atau None bila HJN tidak ada.
    Nilai di luar 0..1 = masukan rusak, ditolak (ValueError), tidak dipotong."""
    e = akhir.get("HJN")
    if not e or "sm" not in e["kol"]:
        return None
    i = e["kol"].index("sm")
    kab = {}
    for k, rows in e["kab"].items():
        r = rows[0] if rows else None
        if r is None or r[i] is None or r[i] == 0:   # 0 tepat = sel laut (kab kepulauan), bukan tanah kering
            continue
        if not 0 <= r[i] <= 1:
            raise ValueError(f"lengas {k} = {r[i]} di luar 0..1")
        kab[k] = round(r[i], 2)
    return {"dibuat": dt.datetime.now(D.WIB).replace(microsecond=0).isoformat(), "hari": e["hari"][0],
            "sumber": "Open-Meteo, lengas tanah 3 sampai 27 cm (fraksi volume), prakiraan hari pertama", "kab": kab}


def periksa(d):
    g = []
    if len(d["kab"]) != 514:
        g.append(f"kab {len(d['kab'])} != 514")
    for k in d["kab"]:
        if not k.get("geo") or "|" not in k["geo"]:
            g.append(f"{k['id']} tanpa kunci geo")
        for kode, rows in k.items():
            if kode not in TAMPIL:
                continue
            kol = TAMPIL[kode]
            for r in rows:
                if r is None:
                    continue
                v = dict(zip(kol, r))
                for c in ("p1", "p20", "p50", "p", "ps"):
                    if v.get(c) is not None and not 0 <= v[c] <= 1:
                        g.append(f"{k['id']} {kode}.{c}={v[c]} di luar 0..1")
                if kode == "HJN" and not v["p1"] >= v["p20"] >= v["p50"]:
                    g.append(f"{k['id']} HJN peluang tidak menurun dengan ambang")
                if kode == "HJN" and not 0 <= v["tot"] <= 1000:
                    g.append(f"{k['id']} HJN tot {v['tot']} mustahil")
                if kode in ("BNJ", "LSR", "GEL", "CEX") and v["lv"] not in (0, 1, 2, 3):
                    g.append(f"{k['id']} {kode} level {v['lv']}")
    sb = {}
    for w in d["waspada"]:
        if w["aturan"] in ("banjir", "longsor") and "gabungan_jiwa" in w["dampak"]:
            sb.setdefault((w["kab"], w["tenggang"]), {})[w["aturan"]] = w["dampak"]
    for (kb_, n_), x in sb.items():
        if len(x) == 2:
            a_, b_, g_ = x["banjir"].get("jiwa", 0), x["longsor"].get("jiwa", 0), x["banjir"]["gabungan_jiwa"]
            if not max(a_, b_) <= g_ <= a_ + b_ or g_ != x["longsor"]["gabungan_jiwa"]:
                g.append(f"{kb_} +{n_}: gabungan {g_} di luar [max({a_}, {b_}), {a_ + b_}]")
    for w in d["waspada"]:
        kb = w["dampak"].get("kebutuhan")
        if kb and (kb["mengungsi"] < 0 or kb["jamban"] < 0):
            g.append(f"{w['kab']} kebutuhan negatif")
    return g


def uji():
    import tempfile
    daftar = D.kab()
    a_banjir = {"id": "banjir", "semua": [{"v": "HJN.tot", "op": ">=", "nilai": 50}, {"v": "HJN.sm", "op": ">=", "nilai": 0.45}]}
    a_lsr = {"id": "longsor", "salah_satu": [{"v": "HJN.tot", "op": ">=", "nilai": 100}, {"v": "HJN.tot3", "op": ">=", "nilai": 150}]}
    row = lambda tot, sm: [0.9, 0.9, 0.8, tot, 10, 5, 12, 1, sm]
    kab = {"HJN": [row(60, 0.5), row(60, 0.3), row(60, None)]}
    assert evaluasi(a_banjir, kab, 1) is True and evaluasi(a_banjir, kab, 2) is False and evaluasi(a_banjir, kab, 3) is None
    assert evaluasi(a_lsr, kab, 1) is True, "3 hari 180 mm >= 150"
    assert evaluasi(a_lsr, {"HJN": [row(10, 0), None, row(10, 0)]}, 1) is None, "tot3 tak lengkap = masukan kurang, bukan False"
    assert evaluasi({"semua": [{"v": "ASP.kat", "op": ">=", "nilai": 1}]}, {}, 1) is None
    sp = {"air_l": 15, "hunian_m2": 3.5, "jamban_per": 20, "kkal": 2100}
    # laju mengungsi: baris mengungsi tanpa terdampak dibuang (kasus Kota Bekasi), kembar dihitung sekali, < 5 sah = nasional
    cari0 = lambda p, n: n
    bks = [{"jenis": "Banjir", "prov_kode": "32", "kab": "B", "tanggal": f"2026-01-{i:02d}", "mengungsi": m} for i, m in ((1, 80), (2, 21), (3, 985))]
    sah = [{"jenis": "Banjir", "prov_kode": "32", "kab": "B", "tanggal": f"2026-02-{i:02d}", "terdampak": 1000, "mengungsi": 300} for i in range(1, 6)]
    lain = [{"jenis": "Banjir", "prov_kode": p, "kab": "N" + p, "tanggal": "2026-03-01", "terdampak": 45000, "mengungsi": 800} for p in ("31", "33")]
    f0, n0, _ = laju_ungsi(None, cari0, {"Banjir"}, bks + sah + lain)
    l0, nk0, a0 = f0("B")
    assert abs(n0 - 3100 / 95000) < 1e-9 and nk0 == 5 and a0 == "kab", (n0, nk0, a0)
    assert n0 < l0 < 0.3, f"laju kab disusutkan ke nasional, bukan 1,0 atau 0,3: {l0}"
    f1, _, _ = laju_ungsi(None, cari0, {"Banjir"}, bks + sah[:4] + sah[:4] + lain)
    assert f1("B") == (laju_ungsi(None, cari0, {"Banjir"}, sah[:4] + lain)[1], 4, "nasional"), "kembar dibuang, 4 sah = nasional"
    f2, n2, _ = laju_ungsi(None, cari0, {"Banjir"}, bks)
    assert f2("B") == (0, 0, "nasional") and n2 == 0, "hanya mengungsi tanpa terdampak = tidak ada baris sah"
    hi = [{"jenis": "Banjir", "prov_kode": "32", "kab": "R", "tanggal": f"2026-04-{i:02d}", "terdampak": 1000, "mengungsi": 10} for i in range(1, 6)]
    f3, n3, _ = laju_ungsi(None, cari0, {"Banjir"}, hi + [{"jenis": "Banjir", "prov_kode": p, "kab": "N" + p, "tanggal": "x", "terdampak": 1000, "mengungsi": 450} for p in ("31", "33")])
    assert f3("R")[0] == 0.01 < n3, "dijepit ke rasio kejadian tertinggi kab"
    # satu provinsi dominan (> 50% Σmengungsi) tidak menyetir laju nasional; baris bencana 0 tidak dihitung
    dm = [{"jenis": "Banjir", "prov_kode": "11", "kab": f"A{i}", "tanggal": "2025-11-27", "terdampak": 100000, "mengungsi": 90000} for i in range(3)]
    kecil = [{"jenis": "Banjir", "prov_kode": p, "kab": f"K{p}", "tanggal": "2026-01-01", "terdampak": 10000, "mengungsi": 200} for p in ("31", "32", "33")]
    b0 = [{"jenis": "Banjir", "prov_kode": "34", "kab": "Z", "tanggal": "2026-01-01", "terdampak": 100, "mengungsi": 100, "bencana": 0}]
    f4, n4, i4 = laju_ungsi(None, cari0, {"Banjir"}, dm + kecil + b0)
    assert abs(n4 - 0.02) < 1e-9 and i4["prov_dibuang"] == "11" and i4["n_kejadian"] == 6, (n4, i4)
    assert i4["median_kejadian"] == round((0.02 + 0.9) / 2, 4), i4
    assert laju_ungsi(None, cari0, {"Banjir"}, kecil)[2]["prov_dibuang"] is None, "tanpa dominan tidak ada yang dibuang"
    assert kebutuhan(41, sp) == {"mengungsi": 41, "air_l": 615, "hunian_m2": 144, "jamban": 3, "kkal": 86100}
    # kalibrasi hanya bila dipakai; urutan peluang dijaga sesudahnya
    e = {"k": "HJN", "kol": ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "sm", "m"], "kab": {"1101": [[0.8, 0.4, 0.05, 10.0, 3, 4, 5, 0.4, 0], None, None]}}
    pk = {("HJN", 20, 1): [(0.05, 0.1), (0.4, 0.9)]}
    r = baris_tampil(e, "1101", "11", pk, {("tot", 1, "11"): 1.5})
    assert r[0][:4] == [0.9, 0.9, 0.05, 15.0] and r[1] is None, r
    pb, _ = peta_kal({}, {"grup": {"BNJ|1|2": {"peta": [(0.0, 0.1), (1.0, 0.9)]}, "BNJ|1|3": {"peta": None}}})
    assert list(pb) == [("BNJ", 1, 2)], "kalibrasi aktif BNJ ikut, peta kosong tidak"
    eb = {"k": "BNJ", "kol": ["lv", "ps"], "kab": {"1101": [[1, None], [1, 0.25], None]}}
    rb = baris_tampil(eb, "1101", "11", pb, {})
    assert rb[0] == [1, None] and rb[1] == [1, 0.3], rb  # ps kosong tidak dikalibrasi (tidak dikarang); 0,25 -> 0,3
    assert vonis({}, "HJN", 1, 1) == ["belum teruji", 0, None]
    # lengas.json: sm tenggang +1 dari entri HJN terakhir; None dibuang, di luar 0..1 ditolak
    eh = {"k": "HJN", "t": "2026-10-29", "hari": ["2026-10-30", "2026-10-31", "2026-11-01"], "sumber": "uji",
          "kol": e["kol"], "kab": {"1101": [[0.8, 0.4, 0.05, 10.0, 3, 4, 5, 0.4123, 0], None, None], "1102": [None, None, None],
                                   "1103": [[0.8, 0.4, 0.05, 10.0, 3, 4, 5, None, 0], None, None],
                                   "3101": [[0.8, 0.4, 0.05, 10.0, 3, 4, 5, 0.0, 0], None, None]}}
    lg = lengas({"HJN": eh})
    assert lg["hari"] == "2026-10-30" and lg["kab"] == {"1101": 0.41}, lg
    assert lengas({}) is None, "tanpa HJN tidak ada lengas.json"
    eh["kab"]["1101"][0][7] = 1.7
    try:
        lengas({"HJN": eh})
        raise AssertionError("sm 1,7 harus ditolak")
    except ValueError:
        pass
    # terbit utuh dari entri sintetis, berkas nyata repo untuk paparan; keluaran sah
    t = "2026-10-29"
    ent = [{"t": t, "k": "HJN", "dibuat": "x", "sumber": "uji", "hari": [D.geser(t, i) for i in (1, 2, 3)], "kol": e["kol"],
            "kab": {k["id"]: [[0.9, 0.8, 0.6, 70.0, 13, 6, 15, 0.5, 0]] * 3 for k in daftar}}]
    with tempfile.TemporaryDirectory() as tmp:
        o = terbit(data=tmp, entri=ent)
        assert periksa(o) == [] and len(o["kab"]) == 514
        lj = json.load(open(os.path.join(tmp, "lengas.json")))
        assert len(lj["kab"]) == 514 and set(lj["kab"].values()) == {0.5}, "lengas.json ikut terbit"
        assert {w["aturan"] for w in o["waspada"]} >= {"banjir", "longsor"}
        w = next(w for w in o["waspada"] if w["aturan"] == "banjir" and w["dampak"].get("jiwa"))
        assert w["dampak"]["jiwa"] > 0 and "kebutuhan" in w["dampak"], w
        assert o["kode"]["HJN"]["vonis"]["p50|1"][0] == "belum teruji"
        assert all("|" in k["geo"] for k in o["kab"]) and o["kab"][0]["geo"] == daftar[0]["geo"]
        bad = json.loads(json.dumps(o))
        del bad["kab"][0]["geo"]
        assert periksa(bad), "geo wajib"
        bad = json.loads(json.dumps(o))
        bad["kab"][0]["HJN"][0][0] = 1.4
        assert periksa(bad), "peluang > 1 ditolak"
    # DP-06b: hari0 = terbitan terakhir yang salah satu sasarannya hari ini, meski terbitan kemarin hilang dari arsip
    lu = lalu(ent, "2026-10-31", {}, {})          # terbitan 10-29 menyasar 10-30, 10-31, 11-01; tak ada terbitan 10-30
    assert lu["hari"] == {"2026-10-30": lu["hari"]["2026-10-30"]} and "2026-10-31" not in lu["hari"], "tenggang +1 saja: hari ini kosong"
    z = lu["hari0"]["HJN"]
    assert z["tenggang"] == 2 and z["terbit"] == t and len(z["kab"]) == 514, z["tenggang"]
    assert lalu(ent, "2026-11-10", {}, {})["hari0"] == {}, "tak ada terbitan menyasar hari itu"
    # KI-65: gabungan tanpa hitung ganda
    assert gabung_jiwa([(1000, 0.2, 1.0)], 200, 1000) == 1000, "longsor seluruh kec menelan banjir"
    assert gabung_jiwa([(1000, 0.2, 0.0), (500, 0.0, 1.0)], 200, 500) == 700, "tanpa irisan = jumlah"
    assert gabung_jiwa([(1000, 0.5, 0.5)], 500, 500) == 750, "irisan bebas 0,5 x 0,5"
    assert gabung_jiwa([(1000, 0.0, 0.0)], 300, 400) == 400, "dijepit ke atas oleh yang terbesar"
    assert gabung_jiwa([(1000, 1.0, 1.0), (1000, 1.0, 0.0)], 100, 100) == 200, "dijepit ke jumlah"
    assert _gabung([(1000, 0.0, 0.0)], 300, 400) == (400, True) and _gabung([(1000, 0.5, 0.5)], 500, 500) == (750, False), "hitungan jepitan"
    with tempfile.TemporaryDirectory() as tmp:
        o = terbit(data=tmp, entri=ent)
        assert isinstance(o["gabungan_dijepit"], int) and o["gabungan_dijepit"] >= 0, "gabungan_dijepit int"
        assert all(w["dampak"].get("gabungan_catatan") == GABUNGAN_CATATAN for w in o["waspada"] if "gabungan_jiwa" in w["dampak"]), "label independensi"
        ba = {(w["kab"], w["tenggang"]): w["dampak"] for w in o["waspada"] if w["aturan"] == "banjir"}
        ls = {(w["kab"], w["tenggang"]): w["dampak"] for w in o["waspada"] if w["aturan"] == "longsor"}
        dua = [k for k in ba if k in ls and "gabungan_jiwa" in ba[k]]
        assert dua, "kab yang kena banjir dan longsor punya gabungan"
        for k in dua:
            a, b, g = ba[k].get("jiwa", 0), ls[k].get("jiwa", 0), ba[k]["gabungan_jiwa"]
            assert max(a, b) <= g <= a + b and ls[k]["gabungan_jiwa"] == g, (k, a, b, g)
        assert any(max(ba[k]["jiwa"], ls[k]["jiwa"]) < ba[k]["gabungan_jiwa"] < ba[k]["jiwa"] + ls[k]["jiwa"] for k in dua if ba[k].get("jiwa") and ls[k].get("jiwa"))
        bad = json.loads(json.dumps(o))
        k0 = dua[0]
        for w in bad["waspada"]:
            if (w["kab"], w["tenggang"]) == k0 and w["aturan"] in ("banjir", "longsor"):
                w["dampak"]["gabungan_jiwa"] = 10 ** 12
        assert periksa(bad), "gabungan di atas jumlah ditolak"
    # aturan melaut dan angin: GEL/CEX sintetis; melaut tanpa jiwa, angin seluruh penduduk kab
    kolg, kolc = ["hs", "lv"], ["emb", "lv"]
    ent2 = ent + [{"t": t, "k": "GEL", "dibuat": "x", "sumber": "uji", "hari": ent[0]["hari"], "kol": kolg,
                   "kab": {daftar[0]["id"]: [[1.3, 1], [1.0, 0], None], daftar[1]["id"]: [[0.5, 0]] * 3}},
                  {"t": t, "k": "CEX", "dibuat": "x", "sumber": "uji", "hari": ent[0]["hari"], "kol": kolc,
                   "kab": {daftar[0]["id"]: [[50, 1], [45, 0], None]}}]
    with tempfile.TemporaryDirectory() as tmp:
        o = terbit(data=tmp, entri=ent2)
        assert periksa(o) == [] and o["kode"]["GEL"]["label"] == "Gelombang" and o["kode"]["CEX"]["kol"] == kolc
        m = [w for w in o["waspada"] if w["aturan"] == "melaut"]
        assert [(w["kab"], w["tenggang"], w["dampak"]) for w in m] == [(daftar[0]["id"], 1, {})], m
        an = [w for w in o["waspada"] if w["aturan"] == "angin"]
        assert [(w["kab"], w["tenggang"], w["dampak"]) for w in an] == [(daftar[0]["id"], 1, {"jiwa": daftar[0]["jiwa"]})], an
        assert not o["kab"][2].get("GEL"), "kab tanpa titik: tidak ada kunci GEL (tampil -)"
        bad = json.loads(json.dumps(o))
        bad["kab"][0]["CEX"][0][1] = 7
        assert periksa(bad), "lv CEX di luar 0..3 ditolak"
    print("terbit.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif len(sys.argv) == 1:
        o = terbit()
        print("terbit:", len(o["kab"]), "kab;", {k: v["terbit"] for k, v in o["kode"].items()}, ";", len(o["waspada"]), "waspada")
    else:
        print(__doc__)
