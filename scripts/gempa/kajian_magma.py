"""Kajian gempa MAGMA (PVMBG) -> kolom terurai + pembanding MMI laporan lawan guncangan.py. PEMBANDING, bukan kalibrasi: koefisien model tidak disetel.

Masukan : data/raw/gempa/kajian_magma.json (gitignored, hasil panen; tidak dipanen ulang di sini).
Keluaran: public/gempa/data/kajian_magma.json = kolom terurai + ringkasan. Tanpa salinan teks penuh, tanpa nama pembuat kajian.
Pakai   : python3 scripts/gempa/kajian_magma.py        urai + banding + tulis
          python3 scripts/gempa/kajian_magma.py uji    self-check
Bias seleksi: MMI laporan hanya ada untuk tempat yang MERASAKAN gempa, jadi model dibanding hanya di tempat yang pasti tergoyang: bias model mendekati nol bisa menutupi
overestimasi di tempat yang tidak merasakan (tidak tercatat).
"""
import importlib.util, json, math, os, re, statistics as st, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(DIR, "../.."))
MASUK = os.path.join(AKAR, "data/raw/gempa/kajian_magma.json")
KELUAR = os.path.join(AKAR, "public/gempa/data/kajian_magma.json")
PUSAT = os.path.join(AKAR, "public/banjir/data/pusat_kec.json")
BULAN = {b: i + 1 for i, b in enumerate("januari februari maret april mei juni juli agustus september oktober november desember".split())}
ROM = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10}
LEMBAGA = ("BMKG", "USGS", "GFZ")
_R = r"(?:VIII|VII|VI|IV|IX|III|II|V|X|I)"
RE_ROM = re.compile(r"(?<![A-Za-z])(%s)(?:\s*[-–]\s*(%s))?(?![A-Za-z])(?:\s*MMI)?" % (_R, _R))
RE_LAT = [re.compile(r"(\d+(?:[.,]\d+)?)\s*[°o]?\s*(LS|LU)\b"), re.compile(r"\b(LS|LU)\s*(\d+(?:[.,]\d+)?)")]
RE_LON = [re.compile(r"(\d+(?:[.,]\d+)?)\s*[°o]?\s*(BT|BB)\b"), re.compile(r"\b(BT|BB)\s*(\d+(?:[.,]\d+)?)")]
RE_MAG = [re.compile(r"magnitud[aeo]\s*\(?\s*(?:M[wbsl]?\)?\s*)?\*?\s*(\d+(?:[.,]\s?\d+)?)", re.I), re.compile(r"\bM[wbsl]?\s?\*?(\d+(?:[.,]\s?\d+)?)"), re.compile(r"(\d+[.,]\d+)\s*(?:SR|Mw|Mb|Ms)\b")]
RE_DLM = [re.compile(r"kedalaman\s*(?:hiposenter\s*)?(?:sekitar\s*)?(\d+(?:[.,]\d+)?)\s*km", re.I), re.compile(r"(\d+(?:[.,]\d+)?)\s*km\b")]


def _f(s):
    return float(s.replace(",", ".").replace(" ", ""))


def tanggal(s):
    h, b, t = s.split()
    return "%s-%02d-%02d" % (t, BULAN[b.lower()], int(h))


def _koor(seg, pola, neg):
    p, tanda = pola
    for m in p.finditer(seg):
        a, b = m.groups()
        angka, huruf = (a, b) if a[0].isdigit() else (b, a)
        v = _f(angka)
        return -v if huruf == neg else v
    return None


def _cari(seg, pola):
    for p in pola:
        m = p.search(seg)
        if m:
            return _f(m.group(1))
    return None


def lembaga(desk):
    """{BMKG|USGS|GFZ: {lat, lon, m, dalam}} dari bagian Deskripsi; segmen = dari penanda lembaga sampai penanda lembaga lain."""
    desk = re.sub(r"(?<=\d)[^\x00-\x7f]+", "", desk)  # mojibake dari panen: tanda derajat jadi rangkaian "Ã‚"
    pen = sorted([(m.start(), m.group(1)) for m in re.finditer(r"(?<![A-Za-z])(BMKG|USGS|GFZ)(?![A-Za-z])", desk)] + [(0, "BMKG")])  # tanpa penanda, uraian awal = BMKG
    out = {}
    for i, (a, nm) in enumerate(pen):
        seg = desk[a:pen[i + 1][0] if i + 1 < len(pen) else len(desk)]
        if nm in out:
            continue
        lat = _koor(seg, (RE_LAT[0], 0), "LS") if RE_LAT[0].search(seg) else _koor(seg, (RE_LAT[1], 0), "LS")
        lon = _koor(seg, (RE_LON[0], 0), "BB") if RE_LON[0].search(seg) else _koor(seg, (RE_LON[1], 0), "BB")
        if lat is None or lon is None:
            continue
        if not (-13 <= lat <= 9 and 90 <= lon <= 146):  # salah tulis/terpotong di sumber (belahan atau angka lain): bukan koordinat Indonesia
            continue
        out[nm] = {"lat": lat, "lon": lon, "m": _cari(seg, RE_MAG), "dalam": _cari(seg, RE_DLM)}
    return out


def tempat_mmi(s):
    """'II-III Liwa, II Bengkunat' / 'Pulau Mayau IV MMI, Bitung, Manado II MMI' -> [(tempat, mmi tengah)]. Tempat tanpa kelas ikut kelas terdekat (gaya roman-dulu: sebelumnya; tempat-dulu: sesudahnya)."""
    if not s:
        return []
    items = [x.strip() for x in re.split(r"[,;]|\bdan\b", s) if x.strip()]
    awal = bool(RE_ROM.match(items[0]))
    baris = []  # [tempat, kelas|None]
    for it in items:
        ms = list(RE_ROM.finditer(it))
        if not ms:
            baris.append([it, None])
            continue
        m = ms[0] if awal else ms[-1]
        k = (ROM[m.group(1)] + ROM[m.group(2) or m.group(1)]) / 2
        t = (it[:m.start()] + " " + it[m.end():]).strip()
        baris.append([re.sub(r"\s+", " ", re.sub(r"^(sebagian|MMI)\s+", "", t.strip(" .-"), flags=re.I)), k])
    seq = baris if awal else baris[::-1]
    prev = None
    for b in seq:
        if b[1] is None:
            b[1] = prev
        else:
            prev = b[1]
    return [(t, k) for t, k in baris if t and k is not None]


def urai(r):
    desk = r["isi"].split("Rekomendasi")[0]
    lem = lembaga(desk)
    jam, _, zona = (r.get("jam") or "").partition(" ")
    w = (r.get("judul") or "").strip(" *\n\t")
    w = re.sub(r"^(?:(?:pemutakhiran|update)\s+)?(?:analisis geologi\s+)?(?:kejadian\s+)?gempa ?bumi\s+(?:merusak\s+)?(?:di\s+)?", "", w, flags=re.I)
    w = re.sub(r",? ?(TANGGAL )?\d{1,2} [A-Za-z]+ \d{4}\W*$", "", re.sub(r",? ?TANGGAL .*$", "", w, flags=re.I)).strip(" ,-*")
    w = "" if len(w) > 120 or "masyarakat" in w.lower() else w
    return {"id": r["id"], "tanggal": tanggal(r["tanggal"]), "jam": jam, "zona": zona, "wilayah": w.title() if w.isupper() else w or None, "lembaga": lem,
            "ada_mmi": bool(r.get("mmi")), "mmi": [{"tempat": t, "mmi": k} for t, k in tempat_mmi(r.get("mmi"))], "susulan": bool(re.search(r"susulan", desk, re.I))}


def _guncangan():
    s = importlib.util.spec_from_file_location("guncangan_kajian", os.path.join(DIR, "guncangan.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# ibu kota/kota yang disebut laporan -> kabupatennya (hanya yang sering muncul; sisanya dibuang sebagai "tak dikenali", tambah bila perlu)
ALIAS = {"liwa": "Lampung Barat", "krui": "Pesisir Barat", "bengkunat": "Pesisir Barat", "painan": "Pesisir Selatan", "pelabuhan ratu": "Sukabumi", "palabuhan ratu": "Sukabumi",
         "saumlaki": "Kepulauan Tanimbar", "siau": "Kepulauan Siau Tagulandang Biaro", "dobo": "Kepulauan Aru", "mentawai": "Kepulauan Mentawai", "siberut": "Kepulauan Mentawai",
         "tua pejat": "Kepulauan Mentawai", "talaud": "Kepulauan Talaud", "kulonprogo": "Kulon Progo", "sinabang": "Simeulue", "labuan bajo": "Manggarai Barat", "maumere": "Sikka",
         "rote": "Rote Ndao", "piru": "Seram Bagian Barat", "labuha": "Halmahera Selatan", "tiakur": "Maluku Barat Daya", "meulaboh": "Aceh Barat", "blangpidie": "Aceh Barat Daya",
         "timika": "Mimika", "tondano": "Minahasa", "waingapu": "Sumba Timur", "jogjakarta": "Kota Yogyakarta", "bukit tinggi": "Kota Bukittinggi"}


def _norm(t):
    t = re.sub(r"^\s*di\s+", "", t.lower())
    t = re.sub(r"\b(kabupaten|kab|kota|kec|kecamatan|pulau|pesisir|pos pga)\b\.?", " ", t)
    return re.sub(r"[^a-z0-9]+", "", t)


def indeks_tempat(pusat):
    """nama ternormalisasi -> [(lat, lon, jenis, kota)]. jenis "kabupaten" (rerata pusat kecamatannya; kota & kab senama sama-sama masuk) atau "kecamatan" (hanya bila namanya bukan nama kabupaten).
    Lebih dari satu entri = nama ganda; pemanggil memutuskan (cari)."""
    kab = {}
    for k, (la, lo) in pusat.items():
        kab.setdefault(k.split("|")[1], []).append((la, lo))
    raw = {bk: (sum(a for a, _ in v) / len(v), sum(b for _, b in v) / len(v), "kabupaten", bk.lower().startswith("kota")) for bk, v in kab.items()}
    idx = {}
    for bk, e in raw.items():
        idx.setdefault(_norm(bk), []).append(e)
    jk = [e for bk, e in raw.items() if "jakarta" in bk.lower()]
    if jk:
        idx.setdefault("jakarta", [(sum(e[0] for e in jk) / len(jk), sum(e[1] for e in jk) / len(jk), "kabupaten", False)])  # DKI = rerata lima kota administrasi
    kec = {}
    for k, (la, lo) in pusat.items():
        kec.setdefault(_norm(k.split("|")[2]), []).append((la, lo, "kecamatan", False))
    for n, v in kec.items():
        if n not in idx:
            idx[n] = v
    for a, b in ALIAS.items():
        if b in raw:
            idx.setdefault(_norm(a), [raw[b]])
    return idx


def cari(idx, tempat):
    """-> ("ok", entri) | ("ambigu", [entri]) | ("tak dikenali", None). Nama ganda tidak dipilih terdekat: kata "Kota"/"Kab." di teks boleh menyaring, selebihnya ambigu."""
    c = idx.get(_norm(tempat))
    if not c:
        return "tak dikenali", None
    if len(c) > 1:
        t = tempat.lower()
        f = [e for e in c if e[3]] if re.search(r"\bkota\b", t) else [e for e in c if not e[3]] if re.search(r"\bkab(upaten)?\b", t) else c
        c = f if f else c
    return ("ok", c[0]) if len(c) == 1 else ("ambigu", c)


def kelas_dalam(d):
    return "dangkal (kurang dari 60 km)" if d < 60 else "menengah (60 sampai 300 km)" if d <= 300 else "dalam (lebih dari 300 km)"


JARAK = ((25, "kurang dari 25 km"), (50, "25 sampai 50 km"), (100, "50 sampai 100 km"), (200, "100 sampai 200 km"), (1e9, "lebih dari 200 km"))


def kelas_jarak(d):
    return next(n for b, n in JARAK if d < b)


def kelas_lapor(v):
    return "kurang dari III" if v < 3 else "III" if v < 4 else "IV" if v < 5 else "V atau lebih"


def banding(kajian, G, idx):
    """Pasangan (MMI laporan, MMI model) memakai masukan BMKG; model di jarak episenter ke pusat kabupaten/kecamatan yang disebut. Nama ganda dikeluarkan, bukan dipilih terdekat."""
    ps, jarak_ambigu = [], {n: 0 for _, n in JARAK}
    buang = {"kajian tanpa MMI": 0, "kajian MMI tanpa nama tempat": 0, "kajian tanpa magnitudo/kedalaman BMKG": 0, "tempat pada kajian tanpa magnitudo/kedalaman BMKG": 0,
             "tempat tak dikenali sebagai kabupaten/kecamatan": 0, "tempat bernama ganda (ambigu)": 0}
    for k in kajian:
        if not k["mmi"]:
            buang["kajian tanpa MMI" if not k["ada_mmi"] else "kajian MMI tanpa nama tempat"] += 1
            continue
        b = k["lembaga"].get("BMKG")
        if not b or b["m"] is None or b["dalam"] is None:
            buang["kajian tanpa magnitudo/kedalaman BMKG"] += 1
            buang["tempat pada kajian tanpa magnitudo/kedalaman BMKG"] += len(k["mmi"])
            continue
        jenis = G.tebak_jenis(b["dalam"], b["m"], b["lat"], b["lon"])
        for t in k["mmi"]:
            st_, c = cari(idx, t["tempat"])
            if st_ == "tak dikenali":
                buang["tempat tak dikenali sebagai kabupaten/kecamatan"] += 1
                continue
            if st_ == "ambigu":
                buang["tempat bernama ganda (ambigu)"] += 1
                jarak_ambigu[kelas_jarak(min(G.jarak_km(b["lat"], b["lon"], e[0], e[1]) for e in c))] += 1  # jarak ke kandidat terdekat, hanya untuk sebaran
                continue
            d = G.jarak_km(b["lat"], b["lon"], c[0], c[1])
            mod = G.mmi_perkiraan(b["m"], d, b["dalam"], jenis)
            ps.append({"id": k["id"], "tempat": t["tempat"], "lapor": t["mmi"], "model": round(mod, 2), "jarak": round(d), "dalam": b["dalam"], "m": b["m"], "cocok": c[2]})
    buang["sebaran jarak tempat bernama ganda ke kandidat terdekat"] = jarak_ambigu
    buang["catatan jarak"] = "Tempat tak dikenali tidak punya koordinat, jadi jaraknya tidak bisa disebar."
    return ps, buang


def kelompok(ps, fn, urut):
    g = {}
    for p in ps:
        g.setdefault(fn(p), []).append(p)
    return {n: ukuran(g[n]) for n in urut if n in g}


def blok(ps):
    return {"semua": ukuran(ps),
            "per_kelas_dalam": kelompok(ps, lambda p: kelas_dalam(p["dalam"]), map(kelas_dalam, (0, 100, 400))),
            "per_jarak": kelompok(ps, lambda p: kelas_jarak(p["jarak"]), [n for _, n in JARAK]),
            "per_kelas_lapor": kelompok(ps, lambda p: kelas_lapor(p["lapor"]), ["kurang dari III", "III", "IV", "V atau lebih"])}


def ukuran(ps):
    if not ps:
        return {"n": 0}
    e = [p["model"] - p["lapor"] for p in ps]
    return {"n": len(ps), "kajian": len({p["id"] for p in ps}), "bias": round(st.mean(e), 2), "mae": round(st.mean(abs(x) for x in e), 2),
            "benar_1": round(sum(abs(x) <= 1 for x in e) / len(e), 3)}


def selisih(kajian, a, b, kunci):
    d = [k["lembaga"][a][kunci] - k["lembaga"][b][kunci] for k in kajian if a in k["lembaga"] and b in k["lembaga"] and k["lembaga"][a][kunci] is not None and k["lembaga"][b][kunci] is not None]
    if not d:
        return {"n": 0}
    return {"n": len(d), "bias": round(st.mean(d), 2), "mae": round(st.mean(abs(x) for x in d), 2), "median_abs": round(st.median(abs(x) for x in d), 2)}


def bangun():
    raw = json.load(open(MASUK))
    kajian = [urai(r) for r in raw["kajian"]]
    G = _guncangan()
    idx = indeks_tempat(json.load(open(PUSAT)))
    ps, buang = banding(kajian, G, idx)
    pasang = [("BMKG", "USGS"), ("BMKG", "GFZ"), ("USGS", "GFZ")]
    n = len(kajian)
    ringkas = {
        "dibuat": raw["diambil"], "rentang": [min(k["tanggal"] for k in kajian), max(k["tanggal"] for k in kajian)],
        "cakupan": {"kajian": n, "punya_bmkg": sum("BMKG" in k["lembaga"] for k in kajian), "punya_usgs": sum("USGS" in k["lembaga"] for k in kajian),
                    "punya_gfz": sum("GFZ" in k["lembaga"] for k in kajian), "ketiganya": sum(len(k["lembaga"]) == 3 for k in kajian),
                    "punya_mmi": sum(bool(k["mmi"]) for k in kajian), "ada_susulan": sum(k["susulan"] for k in kajian)},
        "banding_mmi": {**blok(ps), "per_pencocokan": {j: blok([p for p in ps if p["cocok"] == j]) for j in ("kecamatan", "kabupaten")}, "dibuang": buang,
                        "catatan": "Pembanding, bukan kalibrasi: koefisien guncangan.py tidak disetel. Masukan BMKG. Tempat yang disebut sebagai kabupaten diwakili pusat kabupaten (rerata pusat kecamatannya), "
                                   "bukan titik tempat itu; yang cocok langsung ke kecamatan dihitung terpisah. Pasangan dibatasi pada tempat yang merasakan gempa (MMI II ke atas); tempat yang tidak merasakan tidak tercatat. "
                                   "Bias per jarak berbalik arah, jadi bias gabungan bukan ciri model dan tidak berarti model lebih baik atau buruk dari data ini."},
        "selisih_lembaga": {"%s-%s" % p: {"magnitudo": selisih(kajian, *p, "m"), "kedalaman_km": selisih(kajian, *p, "dalam")} for p in pasang},
    }
    return {"sumber": "MAGMA Indonesia, PVMBG (kolom terurai; teks asli tidak disalin)", "ringkas": ringkas, "kajian": kajian}, ps


def tulis():
    out, ps = bangun()
    with open(KELUAR, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    return out, ps


def uji():
    d = ("Gempa bumi terjadi. Berdasarkan data dari BMKG, episenter terletak pada koordinat 8,43 LS – 123,12 BT. Magnitudo M 4,7 dengan kedalaman hiposenter 4 km. "
         "Berdasarkan data dari USGS, episenter 8,5344 LS – 123,1638 BT dengan magnitudo M 4,9 pada kedalaman hiposenter 10,401 km. GFZ: 120,46°BT dan 7,22°LS, magnitudo 5,3 dan kedalaman 599 km.")
    L = lembaga(d)
    assert L["BMKG"] == {"lat": -8.43, "lon": 123.12, "m": 4.7, "dalam": 4.0}, L
    assert L["USGS"]["dalam"] == 10.401 and L["USGS"]["m"] == 4.9 and L["GFZ"]["lat"] == -7.22 and L["GFZ"]["dalam"] == 599.0, L
    assert lembaga("BMKG koordinat 1,43° LU dan 126,42° BT magnitudo (M5,3) kedalaman 10 km")["BMKG"] == {"lat": 1.43, "lon": 126.42, "m": 5.3, "dalam": 10.0}
    assert "BMKG" not in lembaga("BMKG koordinat 33,9 LU dan 117,8 BT magnitudo 4,8 kedalaman 10 km")  # di luar Indonesia = salah tulis, dibuang
    assert lembaga("BMKG 7.42 LS dan 117.55 BT magnituda 5 SR kedalaman 587 km")["BMKG"]["m"] == 5.0 and lembaga("BMKG 1,2\u00c3\u201a LS dan 120\u00c3\u201a BT M *5,3* kedalaman 10 km")["BMKG"]["m"] == 5.3
    assert tempat_mmi("Poso III MMI; Palu II MMI") == [("Poso", 3), ("Palu", 2)]
    assert tempat_mmi("II-III Liwa, II Bengkunat") == [("Liwa", 2.5), ("Bengkunat", 2)]
    assert tempat_mmi("Pulau Mayau IV MMI, Ternate II-III MMI, Pos PGA Gamalama, Bitung, Manado II MMI") == [("Pulau Mayau", 4), ("Ternate", 2.5), ("Pos PGA Gamalama", 2), ("Bitung", 2), ("Manado", 2)]
    assert tempat_mmi("III Lembata") == [("Lembata", 3)] and tempat_mmi(None) == []
    assert tanggal("08 April 2026") == "2026-04-08"
    p = [{"id": 1, "model": 4.0, "lapor": 3.0, "dalam": 10}, {"id": 1, "model": 2.0, "lapor": 3.0, "dalam": 10}, {"id": 2, "model": 5.0, "lapor": 3.0, "dalam": 10}]
    u = ukuran(p)
    assert u["n"] == 3 and u["kajian"] == 2 and u["bias"] == 0.67 and u["mae"] == 1.33 and u["benar_1"] == 0.667, u
    assert selisih([{"lembaga": {"A": {"m": 5.0}, "B": {"m": 4.0}}}, {"lembaga": {"A": {"m": 5.0}}}], "A", "B", "m") == {"n": 1, "bias": 1.0, "mae": 1.0, "median_abs": 1.0}
    assert kelas_dalam(59) != kelas_dalam(60) and kelas_dalam(300) != kelas_dalam(301)
    # indeks & banding dengan pusat palsu: dikenali (kecamatan, kabupaten, alias), tak dikenali, homonim
    pusat = {"1|Kab A|Kec X": [-1.0, 100.0], "1|Kab A|Kec Y": [-1.2, 100.2], "1|Kota B|Kec Z": [-2.0, 101.0], "1|B|Kec Q": [-2.2, 101.2], "1|Kab C|Kec Z2": [-3.0, 102.0], "1|Kab D|Kec Z2": [-4.0, 103.0], "1|Kab Lampung Barat|Kec W": [-5.0, 104.0]}
    ix = indeks_tempat(pusat)
    assert cari(ix, "Kec X")[0] == "ok" and cari(ix, "Kec X")[1][2] == "kecamatan" and cari(ix, "Kab A")[1][2] == "kabupaten" and abs(cari(ix, "Kab A")[1][0] + 1.1) < 1e-9
    assert cari(ix, "Nowhere") == ("tak dikenali", None) and cari(ix, "Kec Z2")[0] == "ambigu" and len(cari(ix, "Kec Z2")[1]) == 2
    assert cari(ix, "Kota B")[0] == "ok" and cari(ix, "Kota B")[1][3] is True and cari(ix, "Kab. B")[1][3] is False and cari(ix, "B")[0] == "ambigu"
    G = _guncangan()
    kj = [{"id": 1, "ada_mmi": True, "lembaga": {"BMKG": {"lat": -1.0, "lon": 100.0, "m": 5.5, "dalam": 10.0}}, "mmi": [{"tempat": "Kec X", "mmi": 4.0}, {"tempat": "Kab A", "mmi": 3.0}, {"tempat": "Nowhere", "mmi": 2.0}, {"tempat": "Kec Z2", "mmi": 2.0}]},
          {"id": 2, "ada_mmi": True, "lembaga": {}, "mmi": [{"tempat": "Kec X", "mmi": 3.0}]}, {"id": 3, "ada_mmi": False, "lembaga": {}, "mmi": []}]
    ps, bu = banding(kj, G, ix)
    assert [p["cocok"] for p in ps] == ["kecamatan", "kabupaten"] and ps[0]["jarak"] == 0 and bu["tempat tak dikenali sebagai kabupaten/kecamatan"] == 1 and bu["tempat bernama ganda (ambigu)"] == 1
    assert bu["kajian tanpa magnitudo/kedalaman BMKG"] == 1 and bu["kajian tanpa MMI"] == 1 and sum(bu["sebaran jarak tempat bernama ganda ke kandidat terdekat"].values()) == 1
    assert [kelas_jarak(x) for x in (0, 24, 25, 99, 100, 199, 200)] == [JARAK[i][1] for i in (0, 0, 1, 2, 3, 3, 4)] and kelas_lapor(2.5) == "kurang dari III" and kelas_lapor(5.5) == "V atau lebih"
    bl = blok(ps)
    assert bl["semua"]["n"] == len(ps) == sum(v["n"] for v in bl["per_jarak"].values()) == sum(v["n"] for v in bl["per_kelas_lapor"].values())
    if os.path.exists(MASUK):
        out, ps = bangun()
        bm = out["ringkas"]["banding_mmi"]
        assert bm["semua"]["n"] == len(ps) == sum(v["n"] for v in bm["per_jarak"].values()) == bm["per_pencocokan"]["kecamatan"]["semua"]["n"] + bm["per_pencocokan"]["kabupaten"]["semua"]["n"]
        assert out["ringkas"]["cakupan"]["kajian"] == 1063 and "isi" not in json.dumps(out["kajian"][0])
    print("kajian_magma uji OK")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        o, ps = tulis()
        print(json.dumps(o["ringkas"], ensure_ascii=False, indent=1))
