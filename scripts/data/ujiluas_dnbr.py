"""Uji kewajaran luas berbasis TITIK (piksel firespot x 20% ala Kemenhut; faktor per provinsi insiden.faktor_luas) terhadap luas bekas bakar dari CITRA
(dNBR Sentinel-2), pembanding yang tidak bergantung pada SiPongi -> public/data/ujiluas_dnbr.json

Latar: faktor nasional kita (~18%) nyaris sama dengan 20% Kemenhut; diduga melingkar karena SiPongi sendiri kemungkinan dihitung dari titik. Citra memutus lingkaran itu.

Bahan: data/raw/firms/viirs_2023.csv (VIIRS S-NPP, keyakinan n/h, type 0 = vegetasi), musim 1 Agu - 31 Okt 2023, dikelompokkan dengan harian.dbscan (parameter harian).
Sampel berstrata (seed tetap): ukuran (piksel unik 1-3 kecil, 4-12 sedang, >=13 besar) x gambut (>= separuh deteksi di gambut.geojson) dengan sebaran provinsi bergilir.
Syarat cluster: rentang hari <= 12 dan rentang ruang <= 8 km (kotak dNBR dibatasi 16 km oleh luas_citra.KOTAK_MAKS; cluster lebih besar terpotong dan bias rendah).
Mesin dNBR = luas_citra.nilai (adegan PRA bersih sebelum deteksi pertama, PASCA sesudah terakhir, topeng garis luar + 1,2 km, kontrol latar cincin 2-4 km, cakupan >= 60%,
dNBR > 0,27 dan NBR pasca < 0,2). Hasil per cluster di-cache di data/raw/ujiluas/ (tidak di-commit) supaya jalan terpotong bisa dilanjutkan; hasil terpotong waktu/jaringan tak disimpan.
Pembanding per cluster: (a) piksel unik x 14,0625 ha, (b) (a) x 20%, (c) jumlah deteksi x faktor provinsi kita (insiden.pilih_faktor). Rasio = luas_dnbr / (a).
Cluster dengan luas_dnbr null (tak ada adegan bersih, cakupan rendah, sinyal tak melewati 2 x latar) DIBUANG dari statistik dan dihitung per alasan. Pembuangan ini bias: cluster kecil
paling sering gagal melewati latar, jadi rasio cluster kecil condong ke atas (hanya yang tampak jelas yang lolos).

BATASAN (jujur): dNBR 0,27 mengukur bekas bakar PERMUKAAN; bara gambut bawah tanah dan api sangat kecil (< 1 piksel 20 m) bisa tak terlihat, jadi luas citra gambut cenderung rendah.
Piksel dibaca 50-200 m (80 x 80 per kotak), bukan 20 m asli. Satu adegan pasca bisa terlalu dini/terlambat untuk bekas bakar. Topeng 1,2 km bisa memuat bekas bakar lain yang tak berkait titik.
Tiga batasan ukur: (1) topeng 1,2 km membuat galat cluster kecil tak simetris ke atas (bekas bakar lain dalam topeng ikut terhitung, tak ada yang bisa mengurangi); (2) celah pra/pasca sampai
41/24 hari (CARI_PRA_HARI 45, CARI_PASCA_HARI 25) memasukkan bakar lain dan perubahan non-api (panen, gugur daun, banjir); (3) "awal" hanya dari S-NPP (jam lewat tunggal), api bisa mulai lebih dulu.
Ini PERKIRAAN CITRA, bukan ukur lapangan dan bukan kebenaran dasar. n per strata kecil: baca rentang, bukan titik.

Pakai:  python3 scripts/data/ujiluas_dnbr.py          # sampel + nilai (jaringan, lanjut dari cache) + tulis JSON
        UJILUAS_DETIK=0 python3 ...                    # tanpa jaringan: hanya ringkas dari cache
        python3 scripts/data/ujiluas_dnbr.py uji       # self-check tanpa jaringan
"""
import csv, datetime as dt, itertools, json, math, os, random, statistics, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR, PROVINSI, Poligon, Wilayah  # noqa: E402

CSV = os.path.join(AKAR, "data/raw/firms/viirs_2023.csv")
CACHE = os.path.join(AKAR, "data/raw/ujiluas")
KELUAR = os.path.join(AKAR, "public/data/ujiluas_dnbr.json")
SEED = 20231
TGL = (dt.date(2023, 8, 1), dt.date(2023, 10, 31))
HARI_MAKS, RUANG_MAKS_KM = 12, 8.0
UKURAN = (("kecil", 1, 3), ("sedang", 4, 12), ("besar", 13, 10 ** 9))
PER_SEL = int(os.environ.get("UJILUAS_PER_SEL", 20))     # percobaan per sel (ukuran x gambut); 10 -> 60 cluster, 20 -> 120 (yang lolos hanya ~1/3)
PIKSEL_HA, FAKTOR_KEMENHUT = 14.0625, 0.20
DETIK = int(os.environ.get("UJILUAS_DETIK", 3300))      # anggaran satu jalan
DETIK_CLUSTER = 300
CATATAN = ("Pada %d dari %d cluster S-NPP Agu-Okt 2023 yang citranya cukup bersih, luas bekas bakar permukaan dari citra Sentinel-2 (dNBR) berada pada median sekitar 0,5-0,6 dari luas piksel titik panas "
           "(rentang median 0,3-0,8), atau sekitar 1,5 sampai 4 kali asumsi 20%%, dengan sebaran antarcluster sangat lebar (0,09-2,2) dan tanpa verifikasi lapangan, sehingga ini indikasi bahwa 20%% cenderung "
           "rendah secara agregat, bukan koreksi faktor. PERKIRAAN CITRA (dNBR > 0,27, NBR pasca < 0,2, kontrol latar cincin 2-4 km), bukan ukur lapangan; bara gambut bawah tanah dan api < 1 piksel bisa tak terlihat. "
           "Cluster tanpa luas citra dibuang (bias seleksi: lihat blok sensitivitas_seleksi).")


# ---- murni (diuji) ----
def ukuran(px):
    return next(n for n, a, b in UKURAN if a <= px <= b)


def kuantil(v, q):
    v = sorted(v)
    if not v:
        return None
    k = (len(v) - 1) * q
    a = math.floor(k)
    return v[a] + (v[min(a + 1, len(v) - 1)] - v[a]) * (k - a)


def ringkas(r, seed=SEED):
    """rasio list -> {n, median, p10, p90, median_ci90 (bootstrap)}."""
    if not r:
        return {"n": 0}
    rng = random.Random(seed)
    bs = sorted(statistics.median([rng.choice(r) for _ in r]) for _ in range(500))
    f = lambda x: round(x, 3)
    return {"n": len(r), "median": f(statistics.median(r)), "p10": f(kuantil(r, .1)), "p90": f(kuantil(r, .9)), "median_ci90": [f(bs[25]), f(bs[474])]}


def strata(baris):
    """baris (dict dengan rasio) -> {nama strata: ringkas}. Provinsi dengan < 3 cluster dilewati."""
    out = {"semua": ringkas([b["rasio"] for b in baris])}
    for k, fn in (("ukuran", lambda b: b["ukuran"]), ("gambut", lambda b: "gambut" if b["gambut"] else "bukan_gambut"), ("prov", lambda b: b["prov_nama"])):
        g = {}
        for b in baris:
            g.setdefault(fn(b), []).append(b["rasio"])
        out[k] = {n: ringkas(r) for n, r in sorted(g.items()) if k != "prov" or len(r) >= 3}
    g = {}
    for b in baris:
        g.setdefault(ukuran(b["piksel_unik"]) + "/" + ("gambut" if b["gambut"] else "bukan_gambut"), []).append(b["rasio"])
    out["ukuran_x_gambut"] = {n: ringkas(r) for n, r in sorted(g.items())}
    return out


def cincin_ringan(geom, maks=60):
    """GeoJSON Polygon/MultiPolygon -> cincin luar [[lon,lat]...] masing-masing diringkas ke <= maks simpul (untuk topeng luas_citra)."""
    if not geom:
        return []
    bag = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    out = []
    for p in bag:
        r = p[0][:-1]
        s = max(1, math.ceil(len(r) / maks))
        out.append([[x[0], x[1]] for x in r[::s]])
    return out[:2]


def jarak_km(a, b):
    return math.hypot((a[0] - b[0]) * 111.32 * math.cos(math.radians((a[1] + b[1]) / 2)), (a[1] - b[1]) * 110.574)


def piksel_tetangga(pts, own, tgl_dari, tgl_sampai, sel, km=1.2):
    """Piksel unik SEMUA deteksi (juga cluster lain) dalam km dari deteksi cluster ini pada tgl_dari..tgl_sampai (ISO). Topeng dNBR melebar 1,2 km, jadi bekas bakar tetangga
    ikut terhitung di luas citra; penyebut ini menunjukkan seberapa besar kontaminasi itu (rasio_masker)."""
    a, b = dt.date.fromisoformat(tgl_dari), dt.date.fromisoformat(tgl_sampai)
    dl = km / 110.0
    la0, la1 = min(p["lat"] for p in own) - dl, max(p["lat"] for p in own) + dl
    lo0, lo1 = min(p["lon"] for p in own) - dl * 1.1, max(p["lon"] for p in own) + dl * 1.1
    ada = set()
    for q in pts:
        if a <= q["d"] <= b and la0 <= q["lat"] <= la1 and lo0 <= q["lon"] <= lo1 and any(jarak_km((q["lon"], q["lat"]), (p["lon"], p["lat"])) <= km for p in own[:: max(1, len(own) // 60)]):
            ada.add((round(q["lat"] / sel), round(q["lon"] / sel)))
    return len(ada)


def tambahan(baris, lemah, populasi):
    """Pelengkap ringkasan: median bersih latar, tanpa tanpa_kontrol, bobot populasi per ukuran, sensitivitas seleksi. lemah = [rasio mentah] cluster sinyal<2 x latar; populasi = {ukuran: n}."""
    med = lambda v: round(statistics.median(v), 3) if v else None
    bersih = [max(0, b["luas_dnbr_ha"] - (b["latar_ha"] or 0)) / b["a_piksel_ha"] for b in baris]
    per = {}
    for b in baris:
        per.setdefault(b["ukuran"], []).append(b["rasio"])
    tot = sum(populasi.values()) or 1
    w = sum(populasi.get(k, 0) for k in per) or 1      # hanya strata yang punya sampel
    bobot = sum(populasi.get(k, 0) / w * statistics.median(v) for k, v in per.items())
    return {"median_bersih_latar": med(bersih), "median_tanpa_tanpa_kontrol": med([b["rasio"] for b in baris if not b["tanpa_kontrol"]]),
            "n_tanpa_kontrol": sum(1 for b in baris if b["tanpa_kontrol"]),
            "populasi_memenuhi_syarat": {"per_ukuran": populasi, "total": tot, "pct_kecil": round(100 * populasi.get("kecil", 0) / tot), "catatan": "sampel diseimbangkan per strata, bukan sebanding populasi"},
            "median_ukuran_berbobot_populasi": round(bobot, 3) if per else None,
            "sensitivitas_seleksi": {"n_sinyal_lemah": len(lemah), "median_dinilai": med([b["rasio"] for b in baris]), "median_bila_lemah_pakai_luas_mentah": med([b["rasio"] for b in baris] + lemah),
                                     "median_bila_lemah_diisi_nol": med([b["rasio"] for b in baris] + [0] * len(lemah)),
                                     "catatan": "besar+gambut hanya sebagian kecil lolos (asap menutup citra); arah bias awan/asap tak pasti. Dibuang karena tak ada adegan bersih: tidak dapat disimulasikan."}}


# ---- bahan ----
def muat_titik():
    pts = []
    with open(CSV) as f:
        for r in csv.DictReader(f):
            if r["satellite"] != "N" or r["confidence"] not in ("n", "h") or r["type"] != "0":
                continue
            d = dt.date.fromisoformat(r["acq_date"])
            if not TGL[0] <= d <= TGL[1]:
                continue
            hm = int(r["acq_time"])
            pts.append({"lat": float(r["latitude"]), "lon": float(r["longitude"]), "scan": float(r["scan"]), "track": float(r["track"]),
                        "px": max(float(r["scan"] or .4), float(r["track"] or .4)), "d": d,
                        "t": dt.datetime(d.year, d.month, d.day, hm // 100, hm % 100, tzinfo=dt.timezone.utc)})
    return pts


def kelompok(pts):
    import harian as H
    label, _ = H.dbscan(pts)
    g = {}
    for p, k in zip(pts, label):
        if k is not None and k >= 0:
            g.setdefault(k, []).append(p)
    return list(g.values())


def profil(c, wil, gambut, sel):
    """cluster -> dict ciri, atau None bila di luar syarat (rentang hari/ruang, di laut)."""
    ds = [p["d"] for p in c]
    hari = (max(ds) - min(ds)).days
    lat, lon = sum(p["lat"] for p in c) / len(c), sum(p["lon"] for p in c) / len(c)
    ruang = max(jarak_km((p["lon"], p["lat"]), (lon, lat)) for p in c) * 2
    if hari > HARI_MAKS or ruang > RUANG_MAKS_KM:
        return None
    w = wil.cari(lon, lat)
    if not w:
        return None
    px = {(round(p["lat"] / sel), round(p["lon"] / sel)) for p in c}
    g = sum(1 for p in c if gambut.cari(p["lon"], p["lat"])) / len(c) >= .5
    return {"id": "c%.3f_%.3f_%s" % (lat, lon, min(ds).isoformat()), "prov": w[0], "prov_nama": PROVINSI[w[0]], "gambut": g, "n_deteksi": len(c), "piksel_unik": len(px),
            "ukuran": ukuran(len(px)), "awal": min(ds), "akhir": max(ds), "hari": hari, "pusat": (round(lat, 4), round(lon, 4)), "ruang_km": round(ruang, 1)}


def sampel(profils):
    """Berstrata ukuran x gambut; dalam sel provinsi bergilir (acak berseed) supaya tak didominasi satu provinsi."""
    rng = random.Random(SEED)
    sel = {}
    for p in profils:
        sel.setdefault((p["ukuran"], p["gambut"]), {}).setdefault(p["prov"], []).append(p)
    out = []
    for k in sorted(sel):
        antre = {pr: rng.sample(v, len(v)) for pr, v in sorted(sel[k].items())}
        provs = rng.sample(sorted(antre), len(antre))
        pilih = []
        while len(pilih) < PER_SEL and any(antre.values()):
            for pr in provs:
                if antre[pr] and len(pilih) < PER_SEL:
                    pilih.append(antre[pr].pop())
        out += pilih
    return out


def rekaman(p):
    return {"pusat": list(p["pusat"]), "awal": p["awal"].isoformat() + "T00:00:00Z", "terakhir": p["akhir"].isoformat() + "T23:00:00Z", "garis": p["garis"], "api": p["api"]}


def baris_dari(p, h, faktor, px_masker=None):
    """profil + hasil nilai() + faktor provinsi -> baris keluaran, atau (None, alasan) bila dibuang."""
    if not h or h.get("luas_ha") is None:
        return None, (h or {}).get("alasan", "tanpa hasil")
    a = p["piksel_unik"] * PIKSEL_HA
    c = p["n_deteksi"] * faktor
    return {"id": p["id"], "prov": p["prov"], "prov_nama": p["prov_nama"], "gambut": p["gambut"], "ukuran": p["ukuran"], "n_deteksi": p["n_deteksi"], "piksel_unik": p["piksel_unik"],
            "awal": p["awal"].isoformat(), "akhir": p["akhir"].isoformat(), "lat": round(p["pusat"][0], 2), "lon": round(p["pusat"][1], 2),
            "luas_dnbr_ha": h["luas_ha"], "rentang_ha": h.get("rentang_ha"), "latar_ha": h.get("latar_ha"), "tanpa_kontrol": bool(h.get("tanpa_kontrol")), "cakupan_pct": h.get("cakupan_pct"),
            "tgl_pra": h.get("tgl_pra"), "tgl_pasca": h.get("tgl_pasca"),
            "a_piksel_ha": round(a, 1), "b_20pct_ha": round(a * FAKTOR_KEMENHUT, 1), "faktor_prov_ha": round(faktor, 2), "c_faktor_prov_ha": round(c, 1),
            "rasio": round(h["luas_ha"] / a, 4), "rasio_b": round(h["luas_ha"] / (a * FAKTOR_KEMENHUT), 3), "rasio_c": round(h["luas_ha"] / c, 3) if c else None,
            "px_masker": px_masker, "rasio_masker": round(h["luas_ha"] / (px_masker * PIKSEL_HA), 3) if px_masker else None,
            "b_dalam_rentang": bool(h.get("rentang_ha")) and h["rentang_ha"][0] <= a * FAKTOR_KEMENHUT <= h["rentang_ha"][1]}, None


def rangkum(baris, dibuang, tertunda, n_sampel):
    r = [b["rasio"] for b in baris]
    med = statistics.median(r) if r else None
    alasan = {}
    for _, a in dibuang:
        k = "tak ada adegan pra bersih" if "pra bersih" in a else "tak ada adegan pasca bersih" if "pasca bersih" in a else "cakupan piksel rendah" if "cakupan" in a else "sinyal tak melewati latar" if "latar" in a else a[:60]
        alasan[k] = alasan.get(k, 0) + 1
    return {"n_sampel": n_sampel, "n_dinilai": len(baris), "n_dibuang": len(dibuang), "n_tertunda": tertunda, "dibuang_per_alasan": alasan,
            "rasio_dnbr_per_piksel": strata(baris) if baris else None,
            "dua_puluh_persen": {"dalam_p10_p90": bool(r) and kuantil(r, .1) <= FAKTOR_KEMENHUT <= kuantil(r, .9), "median_rasio": med and round(med, 3),
                                 "rasio_median_terhadap_20pct": med and round(med / FAKTOR_KEMENHUT, 2),
                                 "cluster_dengan_20pct_dalam_rentang_dnbr": sum(1 for b in baris if b["b_dalam_rentang"]),
                                 "cluster_dnbr_lebih_kecil_dari_20pct": sum(1 for b in baris if b["rasio"] < FAKTOR_KEMENHUT),
                                 "cluster_dnbr_lebih_besar_dari_20pct": sum(1 for b in baris if b["rasio"] > FAKTOR_KEMENHUT)},
            "rasio_dnbr_per_piksel_masker": ringkas([b["rasio_masker"] for b in baris if b["rasio_masker"]]),
            "terhadap_faktor_provinsi": ringkas([b["rasio_c"] for b in baris if b["rasio_c"]]),
            "luas_ha_total": {"dnbr": round(sum(b["luas_dnbr_ha"] for b in baris)), "piksel": round(sum(b["a_piksel_ha"] for b in baris)),
                              "b_20pct": round(sum(b["b_20pct_ha"] for b in baris)), "c_faktor_prov": round(sum(b["c_faktor_prov_ha"] for b in baris))}}


# ---- jaringan ----
def main():
    import insiden as I
    t0 = time.time()
    os.makedirs(CACHE, exist_ok=True)
    wil, gambut = Wilayah(), Poligon(os.path.join(AKAR, "public/data/lahan/gambut.geojson"))
    pts = muat_titik()
    cl = kelompok(pts)
    profils = [p for p in (profil(c, wil, gambut, I.SEL_PIKSEL["N"]) for c in cl) if p]
    print("titik %d, cluster %d, memenuhi syarat %d" % (len(pts), len(cl), len(profils)), file=sys.stderr)
    sm = sampel(profils)
    print("sampel %d" % len(sm), file=sys.stderr)
    ju = {}
    for c in cl:
        ds = [p["d"] for p in c]
        lat, lon = sum(p["lat"] for p in c) / len(c), sum(p["lon"] for p in c) / len(c)
        ju["c%.3f_%.3f_%s" % (lat, lon, min(ds).isoformat())] = c
    sj = lambda n: json.load(open(os.path.join(AKAR, "public/data", n)))
    fk = I.faktor_luas(sj("sejarah.json")["prov"], sj("luas_resmi.json"), sj("luas_satelit.json"))
    import garis_api as GA
    sudah, tertunda, baris, dibuang, lemah = 0, 0, [], [], []
    # urutan bergilir antar sel supaya anggaran yang habis tidak menguras satu strata saja
    per = {}
    for p in sm:
        per.setdefault((p["ukuran"], p["gambut"]), []).append(p)
    urut = [x for grup in itertools.zip_longest(*[per[k] for k in sorted(per)]) for x in grup if x]
    C = J = None
    for p in urut:
        jb = os.path.join(CACHE, p["id"] + ".json")
        h = None
        if os.path.exists(jb):
            h = json.load(open(jb))
        elif time.time() - t0 < DETIK:
            if C is None:
                import citra as C, konsesi_citra_jelas as J, luas_citra as L  # noqa: E401  (jaringan, impor lambat)
            c = ju[p["id"]]
            geom, _ = GA.garis(c)
            p["garis"] = cincin_ringan(geom)
            p["api"] = [[round(q["lon"], 4), round(q["lat"], 4)] for q in c[:: max(1, len(c) // 40)]]
            kini = dt.datetime.combine(p["akhir"] + dt.timedelta(days=L.CARI_PASCA_HARI + 1), dt.time(), tzinfo=dt.timezone.utc)
            t1 = time.time()
            h = L.nilai(J, C, rekaman(p), kini, lambda: time.time() - t1 > DETIK_CLUSTER or time.time() - t0 > DETIK)
            print("%s %s px=%d gambut=%s -> %s (%ds)" % (p["id"], p["prov_nama"], p["piksel_unik"], p["gambut"], h and (h.get("luas_ha"), h.get("alasan", "")[:50]), time.time() - t1), file=sys.stderr)
            if h is not None:
                json.dump(h, open(jb, "w"), ensure_ascii=False)
        if h is None:
            tertunda += 1
            continue
        f = (I.pilih_faktor(fk, p["prov"]) or {}).get("faktor") or 0
        pm = piksel_tetangga(pts, ju[p["id"]], h.get("tgl_pra") or p["awal"].isoformat(), h.get("tgl_pasca") or p["akhir"].isoformat(), I.SEL_PIKSEL["N"]) if h.get("luas_ha") is not None else None
        b, a = baris_dari(p, h, f, pm)
        if b:
            baris.append(b)
        else:
            dibuang.append((p["id"], a))
            if h.get("luas_mentah_ha") is not None:
                lemah.append(h["luas_mentah_ha"] / (p["piksel_unik"] * PIKSEL_HA))
    ring = rangkum(baris, dibuang, tertunda, len(sm))
    pop = {}
    for q in profils:
        pop[q["ukuran"]] = pop.get(q["ukuran"], 0) + 1
    ring.update(tambahan(baris, lemah, pop))
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "_catatan": CATATAN % (len(baris), len(sm)),
           "metode": {"sumber_titik": "FIRMS VIIRS S-NPP 2023-08-01..10-31, keyakinan n/h, type 0, harian.dbscan", "seed": SEED, "syarat_cluster": "rentang <= %d hari, <= %.0f km" % (HARI_MAKS, RUANG_MAKS_KM),
                      "ukuran_piksel_unik": {n: [a, b if b < 10 ** 9 else None] for n, a, b in UKURAN}, "piksel_ha": PIKSEL_HA, "dnbr": 0.27, "nbr_pasca_maks": 0.2,
                      "faktor_nasional_ha_per_deteksi": fk and round(fk["nasional"]["faktor"], 2)},
           "ringkasan": ring, "dibuang": [{"id": i, "alasan": a} for i, a in dibuang], "cluster": baris}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(ring, ensure_ascii=False, indent=1))


def uji():
    assert ukuran(1) == "kecil" and ukuran(3) == "kecil" and ukuran(4) == "sedang" and ukuran(13) == "besar"
    assert kuantil([1, 2, 3, 4, 5], .5) == 3 and kuantil([], .5) is None
    r = ringkas([.1, .2, .3, .4, .5])
    assert r["n"] == 5 and r["median"] == .3 and r["p10"] == .14 and r["median_ci90"][0] <= .3 <= r["median_ci90"][1]
    sq = {"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]}
    assert cincin_ringan(sq) == [[[0, 0], [0, 1], [1, 1], [1, 0]]] and cincin_ringan(None) == []
    big = {"type": "Polygon", "coordinates": [[[i, i] for i in range(200)] + [[0, 0]]]}
    assert len(cincin_ringan(big)[0]) <= 60
    p = {"id": "x", "prov": "62", "prov_nama": "Kalimantan Tengah", "gambut": True, "ukuran": "sedang", "n_deteksi": 10, "piksel_unik": 8, "awal": dt.date(2023, 9, 1), "akhir": dt.date(2023, 9, 3), "pusat": (-2.1, 113.9)}
    b, a = baris_dari(p, {"luas_ha": 45.0, "rentang_ha": [30, 60]}, 2.6)
    assert a is None and b["a_piksel_ha"] == 112.5 and b["b_20pct_ha"] == 22.5 and b["rasio"] == .4 and b["c_faktor_prov_ha"] == 26.0 and not b["b_dalam_rentang"]
    b2, _ = baris_dari(p, {"luas_ha": 45.0, "rentang_ha": [10, 60]}, 2.6)
    assert b2["b_dalam_rentang"]
    assert baris_dari(p, {"luas_ha": None, "alasan": "luas 3 ha < 2 x latar 2 ha"}, 2.6) == (None, "luas 3 ha < 2 x latar 2 ha")
    assert baris_dari(p, None, 1)[0] is None
    rg = rangkum([b, b2], [("y", "tidak ada adegan pasca bersih"), ("z", "cakupan piksel bersih 10%")], 1, 4)
    assert rg["n_dinilai"] == 2 and rg["n_tertunda"] == 1 and rg["dibuang_per_alasan"]["cakupan piksel rendah"] == 1 and rg["rasio_dnbr_per_piksel"]["gambut"]["gambut"]["n"] == 2
    assert rg["dua_puluh_persen"]["cluster_dnbr_lebih_besar_dari_20pct"] == 2 and not rg["dua_puluh_persen"]["dalam_p10_p90"]
    # sampel: seed tetap, berstrata, tidak melebihi PER_SEL per sel
    pr = [dict(p, id="p%d" % i, prov=str(11 + i % 5), ukuran=("kecil", "besar")[i % 2], gambut=i % 3 == 0) for i in range(300)]
    s1, s2 = sampel(pr), sampel(pr)
    assert [x["id"] for x in s1] == [x["id"] for x in s2] and len(s1) == 4 * PER_SEL
    assert len({x["prov"] for x in s1 if x["ukuran"] == "kecil" and not x["gambut"]}) == 5
    t = tambahan([b, b2], [.1, .1], {"kecil": 90, "sedang": 10})
    assert t["median_bersih_latar"] == .4 and t["median_ukuran_berbobot_populasi"] == .4 and t["populasi_memenuhi_syarat"]["pct_kecil"] == 90
    assert t["sensitivitas_seleksi"]["median_bila_lemah_diisi_nol"] == .2 and t["sensitivitas_seleksi"]["median_bila_lemah_pakai_luas_mentah"] == .25
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
