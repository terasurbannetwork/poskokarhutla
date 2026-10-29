"""#35 + #36: sinyal sosial (Wikipedia pageviews, Google Trends per provinsi, GDELT DOC 2.0) -> z-score lonjakan,
diuji sebagai deteksi dini terhadap kejadian DIBI (public/data/dibi_kejadian.json).

Akses:  Wikimedia REST pageviews (resmi, bebas kunci, UA wajib);  GDELT DOC 2.0 (1 permintaan/5 dtk, kita 8 dtk; harian, bukan 15 menit);
        Google Trends (TIDAK resmi: explore -> widgetdata/multiline; best-effort, berhenti di 429, cache bertahap).
Rumus:  z_t = (x_t - median(28 hari sebelumnya)) / max(1,4826*MAD, sqrt(median))   [sinyal.z_kokoh]
        skor gabungan = rata-rata z{Wikipedia, volume GDELT, -nada GDELT}.
Uji:    label = hari dengan jumlah kejadian DIBI nasional per kelompok jenis >= P85 setahun (dan >= 2; definisi 'hari besar', bukan parameter model); latih 60% awal (pilih ambang),
        uji 40% akhir; alarm = skor >= ambang; kena bila alarm di [d-3,d]; pembanding = alarm acak jumlah sama (1000x). Lihat sinyal.uji_deteksi.
Keluaran: public/data/sinyal_sosial.json (Wikipedia+Trends+uji), public/data/gdelt.json (GDELT+uji gabungan). Cache mentah data/raw/sinyal/.
Pakai:  python3 scripts/umum/sinyal_sosial.py [wiki|gdelt|trends|semua] [--waktu DETIK]   |   ... uji
"""
import datetime as dt, http.cookiejar, importlib.util, json, os, sys, time, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(AKAR, "data/raw/sinyal")
DIBI = os.path.join(AKAR, "public/data/dibi_kejadian.json")


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


J, S = _mod("jaring"), _mod("sinyal")
simpan = _mod("kejadian").simpan  # tulis atomik, kunci "dibuat" pertama (syarat /api/status)

# istilah -> (artikel id.wikipedia, kueri GDELT, kueri Trends, jenis DIBI)
ISTILAH = {
    "banjir": ("Banjir", "banjir", "banjir", ("Banjir", "Banjir Bandang", "Banjir dan Tanah Longsor")),
    "longsor": ("Tanah_longsor", "longsor", "longsor", ("Tanah Longsor", "Gerakan Tanah", "Banjir dan Tanah Longsor")),
    "asap": ("Kebakaran_hutan", "(karhutla OR \"kabut asap\")", "kabut asap", ("Kebakaran Hutan dan Lahan", "Kebakaran Lahan")),
    "gempa": ("Gempa_bumi", "gempa", "gempa", ("Gempabumi",)),
    "kekeringan": ("Kekeringan", "kekeringan", "kekeringan", ("Kekeringan",)),
}
ATRIBUSI = {"wikipedia": "Wikimedia REST pageviews, CC0", "gdelt": "GDELT Project (gdeltproject.org), bebas dipakai dengan atribusi",
            "trends": "Google Trends, tidak resmi, minat relatif 0-100 per permintaan"}
PROV_ISO = {"11": "AC", "12": "SU", "13": "SB", "14": "RI", "15": "JA", "16": "SS", "17": "BE", "18": "LA", "19": "BB", "21": "KR", "31": "JK",
            "32": "JB", "33": "JT", "34": "YO", "35": "JI", "36": "BT", "51": "BA", "52": "NB", "53": "NT", "61": "KB", "62": "KT", "63": "KS",
            "64": "KI", "65": "KU", "71": "SA", "72": "ST", "73": "SN", "74": "SG", "75": "GO", "76": "SR", "81": "MA", "82": "MU", "91": "PA", "92": "PB"}


def tgl(d):
    return d.isoformat()


def rentang(n=365, hingga=None):
    """Hari uji = n hari berakhir di `hingga` (default = sampai DIBI); + 28 hari pemanasan z di depannya."""
    e = hingga or dt.date.fromisoformat(json.load(open(DIBI))["sampai"])
    return [e - dt.timedelta(days=i) for i in range(n + 28 - 1, -1, -1)]


def baca_raw(nama):
    p = os.path.join(RAW, nama)
    return json.load(open(p)) if os.path.exists(p) else {}


def tulis_raw(nama, isi):
    os.makedirs(RAW, exist_ok=True)
    with open(os.path.join(RAW, nama) + ".tmp", "w") as f:
        json.dump(isi, f, separators=(",", ":"))
    os.replace(os.path.join(RAW, nama) + ".tmp", os.path.join(RAW, nama))


# ---------- label ----------
def label_harian(kejadian, hari, jenis):
    """Jumlah kejadian DIBI nasional per hari untuk kelompok `jenis` -> (hitung, label bool). Ambang P85 seluruh tahun."""
    h = {}
    for k in kejadian:
        if k["jenis"] in jenis:
            h[k["tanggal"]] = h.get(k["tanggal"], 0) + k.get("kejadian", 1)
    c = [h.get(tgl(d), 0) for d in hari]
    lat = sorted(c)  # ambang label = P85 SELURUH tahun: definisi 'hari besar', bukan parameter model (musim basah/kering beda; P90 latih saja jadi tak ada di uji)
    amb = max(2, lat[int(0.85 * (len(lat) - 1))])
    return c, [x >= amb for x in c], amb


# ---------- Wikipedia ----------
def wiki(hari):
    out = {}
    for t, (art, *_r) in ISTILAH.items():
        u = (f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/id.wikipedia/all-access/user/{art}/daily/"
             f"{hari[0]:%Y%m%d}/{hari[-1]:%Y%m%d}")
        try:
            r = J.ambil(u, jeda_host=0.3)["items"]
        except RuntimeError as e:  # 404 = tak ada data di rentang
            print(f"  wiki {t}: {e}", file=sys.stderr); continue
        m = {x["timestamp"][:8]: x["views"] for x in r}
        out[t] = [m.get(f"{d:%Y%m%d}") for d in hari]
    return out


# ---------- GDELT ----------
def gdelt(hari, bataswaktu=600):
    """Volume (% liputan) dan nada harian per istilah, sourcecountry:indonesia. Cache: istilah yang sudah ada tak diambil ulang
    (dihapus setelah 20 jam). Berhenti pada penolakan beruntun; sisa dilanjutkan di jalan berikutnya."""
    cache = baca_raw("gdelt.json")
    t0, hasil = time.time(), {}
    for t, (_a, q, *_r) in ISTILAH.items():
        c = cache.get(t)
        if c and time.time() - c["ts"] < 20 * 3600 and c["dari"] == tgl(hari[0]):
            hasil[t] = c; continue
        if time.time() - t0 > bataswaktu:
            print("  gdelt: waktu habis, lanjut di jalan berikut", file=sys.stderr); break
        rec = {"ts": time.time(), "dari": tgl(hari[0])}
        try:
            for mode in ("timelinevol", "timelinetone"):
                u = ("https://api.gdeltproject.org/api/v2/doc/doc?" + urllib.parse.urlencode(
                    {"query": f"{q} sourcecountry:indonesia", "mode": mode, "format": "json",
                     "startdatetime": f"{hari[0]:%Y%m%d}000000", "enddatetime": f"{hari[-1]:%Y%m%d}235959"}))
                d = J.ambil(u, jeda_host=8, batas=90, coba=3)
                rec[mode] = {x["date"][:8]: x["value"] for x in d["timeline"][0]["data"]}
        except Exception as e:
            print(f"  gdelt {t}: {e}", file=sys.stderr)
            if isinstance(e, J.Ditolak):
                break
            continue
        cache[t] = rec; hasil[t] = rec
        tulis_raw("gdelt.json", cache)
    for t, c in cache.items():  # cache basi lebih baik daripada tak ada
        hasil.setdefault(t, c)
    return {t: {"vol": [c["timelinevol"].get(f"{d:%Y%m%d}") for d in hari],
                "nada": [c["timelinetone"].get(f"{d:%Y%m%d}") for d in hari], "ts": c["ts"]} for t, c in hasil.items()
            if "timelinevol" in c and "timelinetone" in c}


# ---------- Trends (tidak resmi) ----------
def _trends_satu(geo, kata, tz=-420):
    req = json.dumps({"comparisonItem": [{"keyword": kata, "geo": f"ID-{geo}", "time": "today 3-m"}], "category": 0, "property": ""})
    q = urllib.parse.urlencode({"hl": "id", "tz": tz, "req": req})
    raw = J.ambil("https://trends.google.com/trends/api/explore?" + q, mentah=True, jeda_host=3, coba=2).decode()
    w = next(x for x in json.loads(raw[raw.index("{"):])["widgets"] if x["id"] == "TIMESERIES")
    q2 = urllib.parse.urlencode({"hl": "id", "tz": tz, "req": json.dumps(w["request"]), "token": w["token"]})
    raw = J.ambil("https://trends.google.com/trends/api/widgetdata/multiline?" + q2, mentah=True, jeda_host=3, coba=2).decode()
    return {time.strftime("%Y-%m-%d", time.gmtime(int(p["time"]) + 43200)): p["value"][0]
            for p in json.loads(raw[raw.index("{"):])["default"]["timelineData"]}


def trends(bataswaktu=900):
    """Per provinsi x istilah; cache 20 jam; berhenti pada Ditolak (429) -> sisa menunggu jalan berikut."""
    urllib.request.install_opener(urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())))
    cache = baca_raw("trends.json")
    t0, ditolak = time.time(), False
    for prov, iso in PROV_ISO.items():
        for t, (_a, _g, kata, _j) in ISTILAH.items():
            if t == "kekeringan":
                continue
            k = f"{prov}|{t}"
            if k in cache and time.time() - cache[k]["ts"] < 20 * 3600:
                continue
            if ditolak or time.time() - t0 > bataswaktu:
                continue
            try:
                cache[k] = {"ts": time.time(), "seri": _trends_satu(iso, kata)}
                tulis_raw("trends.json", cache)
            except J.Ditolak as e:
                print(f"  trends dihentikan: {e}", file=sys.stderr); ditolak = True
            except Exception as e:
                print(f"  trends {k}: {e}", file=sys.stderr)
    return cache


def z_trends(cache):
    out = {}
    for k, c in cache.items():
        prov, t = k.split("|")
        tg = sorted(c["seri"])
        v = [c["seri"][d] for d in tg]
        z = S.z_kokoh(v, len(v) - 1, lantai=3.0)  # lantai 3 poin skala 0-100: seri sepi tak meledak
        if z is not None:
            out.setdefault(prov, {})[t] = {"z": round(z, 2), "tanggal": tg[-1], "nilai": v[-1], "usia_jam": round((time.time() - c["ts"]) / 3600, 1)}
    return out


# ---------- gabung & uji ----------
def ringkas_uji(hasil):
    r = dict(hasil)
    for k in ("uji", "acak"):
        if k in r:
            r[k] = {a: (round(b, 3) if isinstance(b, float) else b) for a, b in r[k].items()}
    if "p_acak" in r:
        r["p_acak"] = round(r["p_acak"], 3)
    return r


def uji_semua(hari, kejadian, W, G):
    """Per istilah: uji wiki, gdelt-volume, gabungan; z dihitung pada seri lengkap lalu dipotong ke 365 hari uji."""
    out = {}
    for t, (_a, _g, _k, jenis) in ISTILAH.items():
        cnt, lab, amb = label_harian(kejadian, hari[28:], jenis)
        o = {"label_ambang_kejadian_per_hari": amb, "hari_label": sum(lab), "hari": len(lab)}
        zw = S.deret_z(W[t])[28:] if t in W else None
        zv = zn = None
        if t in G:
            zv = S.deret_z(G[t]["vol"], lantai=0.002)[28:]  # volume dalam % liputan: skala kecil -> lantai kecil
            zn = [(-x if x is not None else None) for x in S.deret_z(G[t]["nada"], lantai=0.5)[28:]]  # nada lebih negatif = alarm
        for nama, s in (("wikipedia", zw), ("gdelt_volume", zv), ("gdelt_nada_negatif", zn),
                        ("gabungan", S.gabung(*[x for x in (zw, zv, zn) if x]) if any((zw, zv, zn)) else None)):
            if s:
                o[nama] = ringkas_uji(S.uji_deteksi(s, lab))
                o[nama]["tahun_penuh_z2"] = ringkas_uji(S.uji_tetap(s, lab))
        o["_z"] = {"wikipedia": zw, "gdelt_volume": zv, "gdelt_nada_negatif": zn}
        out[t] = o
    return out


def jalan(mode="semua", waktu=900):
    hari = rentang()
    kej = json.load(open(DIBI))["kejadian"]
    W = wiki(hari)
    G = gdelt(hari, waktu) if mode in ("gdelt", "semua") else {}
    cache = trends(waktu) if mode in ("trends", "semua") else baca_raw("trends.json")
    hasil = uji_semua(hari, kej, W, G)
    skor_kini = {}
    for t, o in hasil.items():
        z = o.pop("_z")
        skor_kini[t] = {n: (round(s[-1], 2) if s and s[-1] is not None else None) for n, s in z.items()}
        g = S.gabung(*[x for x in z.values() if x]) if any(z.values()) else [None]
        skor_kini[t]["gabungan"] = round(g[-1], 2) if g[-1] is not None else None
    uji = {t: {n: o[n] for n in o if n not in ("gdelt_volume", "gdelt_nada_negatif", "gabungan")} for t, o in hasil.items()}
    simpan(os.path.join(AKAR, "public/data/sinyal_sosial.json"), {
        "sumber": "Wikimedia pageviews id.wikipedia + Google Trends per provinsi (tidak resmi)", "atribusi": [ATRIBUSI["wikipedia"], ATRIBUSI["trends"]],
        "dari": tgl(hari[28]), "sampai": tgl(hari[-1]),
        "catatan": "z = lonjakan terhadap median/MAD 28 hari sebelumnya. Wikipedia nasional (artikel id.wikipedia, tak ada pecahan provinsi); "
                   "Trends per provinsi hanya z hari terakhir (jendela 3 bulan, tanpa riwayat label => INDEKS, bukan prediksi). "
                   "uji = deteksi dini terhadap kejadian DIBI nasional, lihat sinyal.py.",
        "z_wikipedia_terakhir": {t: skor_kini[t]["wikipedia"] for t in hasil},
        "trends_provinsi": z_trends(cache), "uji_wikipedia": {t: u.get("wikipedia") for t, u in uji.items()},
        "label": {t: {k: hasil[t][k] for k in ("label_ambang_kejadian_per_hari", "hari_label", "hari")} for t in hasil}})
    simpan(os.path.join(AKAR, "public/data/gdelt.json"), {
        "sumber": "GDELT DOC 2.0, sourcecountry:indonesia, harian", "atribusi": [ATRIBUSI["gdelt"]],
        "dari": tgl(hari[28]), "sampai": tgl(hari[-1]), "istilah_tercakup": sorted(G),
        "catatan": "Volume = persen liputan; nada = rata-rata tone (negatif = buruk). Skor gabungan = rata-rata z{Wikipedia, volume, -nada}. "
                   "Geokode per provinsi tidak dipakai (1 permintaan/5 dtk = 38x5 kueri terlalu berat); tingkat nasional.",
        "skor_terakhir": skor_kini,
        "uji": {t: {n: o[n] for n in ("gdelt_volume", "gdelt_nada_negatif", "gabungan") if n in o} for t, o in hasil.items()}})
    for t, o in hasil.items():
        print(t, o["hari_label"], "hari-label;", {n: (o[n]["vonis"], o[n]["tahun_penuh_z2"]["vonis"], (o[n]["tahun_penuh_z2"].get("uji") or {}).get("pod"), (o[n]["tahun_penuh_z2"].get("uji") or {}).get("far")) for n in o if isinstance(o[n], dict) and "vonis" in o[n]})


def uji():
    hari = rentang(60, dt.date(2026, 10, 28))
    assert len(hari) == 88 and tgl(hari[-1]) == "2026-10-28"
    kej = [{"tanggal": "2026-10-20", "jenis": "Banjir", "kejadian": 5}, {"tanggal": "2026-10-20", "jenis": "Gempabumi", "kejadian": 9}]
    c, lab, amb = label_harian(kej, hari[28:], ("Banjir",))
    assert sum(c) == 5 and amb == 2 and sum(lab) == 1
    print("uji sinyal_sosial: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    else:
        w = int(a[a.index("--waktu") + 1]) if "--waktu" in a else 900
        jalan(a[0] if a and not a[0].startswith("--") else "semua", w)
