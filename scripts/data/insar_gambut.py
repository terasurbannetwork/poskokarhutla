"""LAB (PKH-34, IG-03/IG-04): kedalaman gambut hilang dari InSAR lawan kedalaman bakar literatur. BUKAN produk.

Satu mesin InSAR: laju LOS dihitung di luar repo oleh LiCSBAS (~/licsbas, paket penurunan-tanah). Skrip ini (stdlib)
TIDAK menghitung interferogram; ia membaca keluaran float32 yang sama dengan `scripts/banjir/subsiden.py` (diimpor, tidak
diubah: baca_par, baca_raw, vertikal, kuantil, Kisi) dan hanya membandingkan area terbakar lawan kontrol.
Ambang dNBR diambil dari `luas_citra.py` (DNBR, NBR_PASCA_MAKS); luas_citra tidak mengekspos piksel, jadi raster kelas
dibuat di luar repo (lihat DESAIN-TEKNIS) dengan ambang yang sama.
Kriteria vonis dikunci di data/kajian-bnpb/insar-gambut/RENCANA-UJI.md §2 sebelum lab; jangan disetel sesudah melihat hasil.
Tak terukur BUKAN nol (None). Hasil lab = HIPOTESIS; tidak ada angka InSAR masuk gambut_bara.py atau layar.

Pakai: python3 -I scripts/data/insar_gambut.py --uji
       python3 -I scripts/data/insar_gambut.py lab <konfig.json> <hasil_lab.json> [hasil_lab.md]
konfig.json: {"wilayah","musim","kelas":"<raw float32 grid acuan: 1 terbakar, 2 gambut tak terbakar, lain/NaN dibuang>",
              "geometri":[{"nama","dir":"<berisi EQA.dem_par,E.geo,U.geo>"}...],      # geometri pertama = grid acuan
              "jendela":[{"nama","hari","vel":{"<nama geometri>":"<vel.filt.mskd>"},"dt_hari":12}]}
"""
import json, math, os, random, statistics, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../banjir"))
import subsiden as S  # noqa: E402  (mesin milik `banjir`, hanya diimpor)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import luas_citra as LC  # noqa: E402  (hanya konstanta ambang)

ALPHA = 1.0            # [SEMENTARA, Q3 -> K2: 1,0]
CINCIN_BUANG_KM = 2.0
CINCIN_KONTROL_KM = 20.0
MIN_PIKSEL = 50        # per kelompok; terkunci RENCANA-UJI §2
MIN_KOHEREN_PCT = 30   # porsi piksel terbakar yang bernilai; terkunci RENCANA-UJI §2
D_LIT = (15.0, 33.0, 51.0)   # cm: batas bawah, rata-rata Ballhorn dkk. 2009, batas atas gambut_bara.py
SD_LIT = 18.0
LAMBDA_CM = 5.55       # Sentinel-1 C-band (panjang gelombang ~5,55 cm)
BOOT_N = 1000
BENIH = "insar_gambut"


# ---- A. vertikal per piksel (cm selama jendela) ----
def vertikal_cm(a, t, hari):
    """a, t = (vlos mm/thn, E, U) atau None -> (cm selama `hari`, metode) atau None. Negatif = turun."""
    r = S.vertikal(a, t)
    return None if r is None else (r[0] / 10 * hari / 365.0, r[1])


# ---- B. selisih area ----
def selisih(vb, vk, n=BOOT_N, benih=BENIH):
    """(dh median cm, p10, p90). Bootstrap piksel (selang terlalu sempit karena korelasi spasial: ditulis di laporan)."""
    if not vb or not vk:
        return None
    rng = random.Random(benih)
    dh = statistics.median(vb) - statistics.median(vk)
    bs = sorted(statistics.median(rng.choices(vb, k=len(vb))) - statistics.median(rng.choices(vk, k=len(vk))) for _ in range(n))
    return dh, S.kuantil(bs, .10), S.kuantil(bs, .90)


# ---- D + C + E. koherensi, kedalaman, vonis ----
def nilai(vb, vk, n_bakar_total, alpha=ALPHA, n=BOOT_N):
    """-> dict. None = tak terukur (bukan nol)."""
    koh = 100.0 * len(vb) / n_bakar_total if n_bakar_total else 0.0
    h = dict(piksel_terbakar=len(vb), piksel_kontrol=len(vk), koheren_pct=round(koh, 1),
             dh_cm=None, dh_p10=None, dh_p90=None, d_insar_cm=None, d_insar_p10=None, d_insar_p90=None)
    if koh < MIN_KOHEREN_PCT or len(vb) < MIN_PIKSEL or len(vk) < MIN_PIKSEL:
        h["vonis"] = "tak_terukur"
        return h
    dh, p10, p90 = selisih(vb, vk, n)
    h.update(dh_cm=round(dh, 3), dh_p10=round(p10, 3), dh_p90=round(p90, 3))
    # selang kedalaman: -p90 .. -p10 (dh negatif = turun lebih banyak); D=0 hanya sah karena cukup piksel (ALGORITMA C)
    d, lo, hi = (max(0.0, -x * alpha) for x in (dh, p90, p10))
    h.update(d_insar_cm=round(d, 3), d_insar_p10=round(lo, 3), d_insar_p90=round(hi, 3))
    h["vonis"] = vonis(lo, hi)
    return h


def vonis(lo, hi):
    """Dikunci RENCANA-UJI §2. lo/hi = selang D_insar (cm). Di atas 51 cm tidak diatur kriteria -> 'di_luar_kriteria'."""
    if hi < D_LIT[0]:
        return "meremehkan"
    if lo <= D_LIT[2]:
        return "selaras"
    return "di_luar_kriteria"


# ---- jarak ke piksel terbakar (cincin kontrol) ----
def jarak_km(kelas, w, h, px_km, py_km):
    """Jarak chamfer (km) tiap piksel ke piksel terbakar (kelas == 1). kelas: baris-baris list."""
    INF = 1e18
    d = [[0.0 if kelas[j][i] == 1 else INF for i in range(w)] for j in range(h)]
    dg = math.hypot(px_km, py_km)
    for j in range(h):
        for i in range(w):
            m = d[j][i]
            if i:
                m = min(m, d[j][i - 1] + px_km)
            if j:
                m = min(m, d[j - 1][i] + py_km)
                if i:
                    m = min(m, d[j - 1][i - 1] + dg)
                if i < w - 1:
                    m = min(m, d[j - 1][i + 1] + dg)
            d[j][i] = m
    for j in range(h - 1, -1, -1):
        for i in range(w - 1, -1, -1):
            m = d[j][i]
            if i < w - 1:
                m = min(m, d[j][i + 1] + px_km)
            if j < h - 1:
                m = min(m, d[j + 1][i] + py_km)
                if i < w - 1:
                    m = min(m, d[j + 1][i + 1] + dg)
                if i:
                    m = min(m, d[j + 1][i - 1] + dg)
            d[j][i] = m
    return d


def pilih(kelas, v, w, h, jr, lo_km=CINCIN_BUANG_KM, hi_km=CINCIN_KONTROL_KM):
    """Piksel terbakar (kelas 1) dan kontrol (kelas 2 di cincin lo..hi km). v: baris nilai cm (NaN = tak koheren).
    -> (vb, vk, n_bakar_total, n_kontrol_total)."""
    vb, vk, nb, nk = [], [], 0, 0
    for j in range(h):
        for i in range(w):
            k = kelas[j][i]
            if k == 1:
                nb += 1
                if v[j][i] == v[j][i]:
                    vb.append(v[j][i])
            elif k == 2 and lo_km <= jr[j][i] <= hi_km:
                nk += 1
                if v[j][i] == v[j][i]:
                    vk.append(v[j][i])
    return vb, vk, nb, nk


# ---- F. uji sebab ----
def risiko_bungkus(vlos_cm, w, h, dt_hari, kelas, pilih_kelas=1):
    """Gradien antar piksel tetangga dalam kelas: selisih laju LOS (cm selama jendela) diubah ke selisih per interferogram
    (x dt_hari/jendela_hari tak diketahui di sini): dipanggil dengan `vlos_cm` sudah dalam cm per `dt_hari` (laju cm/hari x dt).
    Fase membungkus bila selisih LOS tetangga per interferogram > lambda/4 (fase > pi). -> (porsi piksel berisiko, set indeks)."""
    batas = LAMBDA_CM / 4
    ris, n = set(), 0
    for j in range(h):
        for i in range(w):
            if kelas[j][i] != pilih_kelas or vlos_cm[j][i] != vlos_cm[j][i]:
                continue
            n += 1
            for dj, di in ((0, 1), (1, 0)):
                jj, ii = j + dj, i + di
                if jj < h and ii < w and kelas[jj][ii] == pilih_kelas and vlos_cm[jj][ii] == vlos_cm[jj][ii]:
                    if abs(vlos_cm[j][i] - vlos_cm[jj][ii]) > batas:
                        ris.add((j, i)); ris.add((jj, ii))
    return (len(ris) / n if n else None), ris


# ---- uji murni (raster buatan di sini, bukan data produk) ----
def _kisi(w, h, f):
    return [[f(i, j) for i in range(w)] for j in range(h)]


def uji():
    nan = float("nan")
    w = h = 40
    px = 0.33
    # T1: kiri (i<10) terbakar turun 3 cm lebih; sisanya kontrol 0; terbakar 10x40=400 piksel
    kelas = _kisi(w, h, lambda i, j: 1 if i < 10 else 2)
    v = _kisi(w, h, lambda i, j: -3.0 if i < 10 else 0.0)
    jr = jarak_km(kelas, w, h, px, px)
    # T4: kontrol di cincin 0-2 km (i 10..15) berisi pencilan; cincin >2 km: i >= 10 + 2/0.33 ~ 16
    for j in range(h):
        for i in range(10, 16):
            v[j][i] = 50.0
    vb, vk, nb, nk = pilih(kelas, v, w, h, jr)
    assert all(x == 0.0 for x in vk) and len(vk) > 0 and len(vb) == nb == 400, "T4: cincin dekat tidak boleh ikut kontrol"
    r = nilai(vb, vk, nb)
    assert abs(r["dh_cm"] + 3.0) < 1e-9 and abs(r["d_insar_cm"] - 3.0) < 1e-9, r   # T1
    assert r["vonis"] == "meremehkan"                                                # T8 (selisih 3 < 15)
    r2 = nilai(vb, vk, nb, alpha=2.0)
    assert abs(r2["d_insar_cm"] - 6.0) < 1e-9, r2                                    # T6
    # T2: piksel valid kurang dari MIN_PIKSEL -> tak terukur, bukan 0
    r = nilai(vb[:MIN_PIKSEL - 1], vk, nb)
    assert r["vonis"] == "tak_terukur" and r["d_insar_cm"] is None
    # T3: koherensi 10% -> tak terukur
    r = nilai(vb[:40], vk, 400)
    assert r["koheren_pct"] == 10.0 and r["vonis"] == "tak_terukur" and r["d_insar_cm"] is None
    # T5: |LOS| > 400 mm/thn dibuang
    assert vertikal_cm((500.0, 0.0, 0.8), None, 365) is None
    c, m = vertikal_cm((-80.0, 0.0, 0.8), None, 365)
    assert m == "satu" and abs(c + 10.0) < 1e-9, (c, m)
    # T7: selisih tepat 15 cm -> selaras; selisih 40 cm -> selaras; 10 cm dengan hi < 15 -> meremehkan
    vk0 = [0.0] * 100
    assert nilai([-15.0] * 100, vk0, 100)["vonis"] == "selaras"
    assert nilai([-40.0] * 100, vk0, 100)["vonis"] == "selaras"
    assert nilai([-10.0] * 100, vk0, 100)["vonis"] == "meremehkan"
    assert nilai([-60.0] * 100, vk0, 100)["vonis"] == "di_luar_kriteria"
    # dh >= 0 dengan piksel cukup -> D = 0 yang sah; vonis meremehkan
    r = nilai([1.0] * 100, vk0, 100)
    assert r["d_insar_cm"] == 0.0 and r["vonis"] == "meremehkan"
    # F: salah bungkus. Lereng tajam 2 cm per piksel > lambda/4 (1,39) -> semua berisiko; datar -> tidak
    k1 = _kisi(5, 5, lambda i, j: 1)
    p, s = risiko_bungkus(_kisi(5, 5, lambda i, j: 2.0 * i), 5, 5, 12, k1)
    assert p == 1.0 and len(s) == 25
    p, s = risiko_bungkus(_kisi(5, 5, lambda i, j: 0.5 * i), 5, 5, 12, k1)
    assert p == 0.0
    # vonis tidak berubah saat ALPHA dibalik tanda (D negatif tak ada)
    assert vonis(0.0, 14.99) == "meremehkan" and vonis(14.0, 16.0) == "selaras"
    print("insar_gambut --uji: hijau (T1-T8, F)")


# ---- lab ----
def lab(konfig, keluar_json, keluar_md=None):
    k = json.load(open(konfig))
    geo = []
    for g in k["geometri"]:
        p = S.baca_par(os.path.join(g["dir"], "EQA.dem_par"))
        rd = lambda n, p=p, d=g["dir"]: S.Kisi(p, S.baca_raw(os.path.join(d, n), p["w"], p["h"]))
        geo.append(dict(nama=g["nama"], p=p, E=rd("E.geo"), U=rd("U.geo")))
    P = geo[0]["p"]
    w, h = P["w"], P["h"]
    kelas = S.baca_raw(k["kelas"], w, h)
    lat_t = P["lat0"] + P["dlat"] * h / 2
    px = abs(P["dlon"]) * 111.32 * math.cos(math.radians(lat_t))
    py = abs(P["dlat"]) * 110.574
    jr = jarak_km(kelas, w, h, px, py)
    out = dict(dibuat=k.get("dibuat"), wilayah=k["wilayah"], musim=k["musim"], versi_kriteria="RENCANA-UJI §2",
               piksel_km=[round(px, 3), round(py, 3)], jendela=[], uji_sebab={}, kepekaan={},
               pembanding=dict(d_lit=list(D_LIT), sd_lit=SD_LIT), catatan=k.get("catatan", []))
    for jd in k["jendela"]:
        vel = {nm: S.Kisi(g["p"], S.baca_raw(jd["vel"][nm], g["p"]["w"], g["p"]["h"]))
               for g in geo for nm in [g["nama"]] if nm in jd["vel"]}
        V, LOS, met = [], [], {}
        for j in range(h):
            rv, rl = [], []
            for i in range(w):
                lon, lat = geo[0]["E"].pusat(i, j)
                pr = {}
                for g in geo:
                    if g["nama"] in vel:
                        pr[g["nama"]] = (vel[g["nama"]].di(lon, lat), g["E"].di(lon, lat), g["U"].di(lon, lat))
                a = pr.get(geo[0]["nama"])
                t = pr.get(geo[1]["nama"]) if len(geo) > 1 else None
                r = vertikal_cm(a, t, jd["hari"])
                rv.append(r[0] if r else float("nan"))
                if r:
                    met[r[1]] = met.get(r[1], 0) + 1
                los = a[0] / 10 * jd["dt_hari"] / 365.0 if a and a[0] == a[0] and abs(a[0]) < S.SAH_MM else float("nan")
                rl.append(los)
            V.append(rv); LOS.append(rl)
        vb, vk, nb, nk = pilih(kelas, V, w, h, jr)
        hsl = nilai(vb, vk, nb)
        if jd.get("eksploratif"):   # tanpa topeng mutu LiCSBAS: bukan vonis (kriteria terkunci memakai keluaran bermasker mutu)
            hsl["vonis_eksploratif"] = hsl.pop("vonis")
        hsl.update(nama=jd["nama"], hari=jd["hari"], metode_piksel=met, n_kontrol_total=nk,
                   koheren_kontrol_pct=round(100.0 * len(vk) / nk, 1) if nk else None)
        # uji sebab (hanya bila terukur)
        if vb and vk:
            pb, ris = risiko_bungkus(LOS, w, h, jd["dt_hari"], kelas, 1)
            vb2 = [V[j][i] for j in range(h) for i in range(w) if kelas[j][i] == 1 and V[j][i] == V[j][i] and (j, i) not in ris]
            pk, risk = risiko_bungkus(LOS, w, h, jd["dt_hari"], kelas, 2)
            vk2 = [V[j][i] for j in range(h) for i in range(w) if kelas[j][i] == 2 and V[j][i] == V[j][i] and (j, i) not in risk
                   and CINCIN_BUANG_KM <= jr[j][i] <= CINCIN_KONTROL_KM]
            hsl["sebab"] = dict(
                porsi_berisiko_bungkus_terbakar=None if pb is None else round(pb, 4),
                porsi_berisiko_bungkus_kontrol=None if pk is None else round(pk, 4),
                dh_tanpa_berisiko_cm=None if len(vb2) < MIN_PIKSEL or len(vk2) < MIN_PIKSEL else round(selisih(vb2, vk2, 200)[0], 3),
                piksel_terbakar_tanpa_berisiko=len(vb2),
                sebaran_terbakar_p10_p50_p90=[round(S.kuantil(vb, q), 2) for q in (.1, .5, .9)],
                sebaran_kontrol_p10_p50_p90=[round(S.kuantil(vk, q), 2) for q in (.1, .5, .9)])
        out["jendela"].append(hsl)
        if jd.get("utama"):
            for a_ in (0.5, 1.0, 2.0):
                out["kepekaan"]["alpha_%s" % a_] = nilai(vb, vk, nb, alpha=a_, n=300).get("d_insar_cm")
            for hi_km in (10.0, 20.0):
                b2, k2, nb2, _ = pilih(kelas, V, w, h, jr, hi_km=hi_km)
                out["kepekaan"]["kontrol_2_%d_km" % hi_km] = nilai(b2, k2, nb2, n=300).get("d_insar_cm")
    for nm, jl in (k.get("diagnostik") or {}).items():   # raster mutu LiCSBAS (coh_avg, n_unw, ...) di grid acuan
        r = S.baca_raw(jl, w, h)
        grup = {"terbakar": lambda j, i: kelas[j][i] == 1,
                "kontrol_cincin": lambda j, i: kelas[j][i] == 2 and CINCIN_BUANG_KM <= jr[j][i] <= CINCIN_KONTROL_KM,
                "gambut_tak_terbakar_semua": lambda j, i: kelas[j][i] == 2,
                "lain": lambda j, i: kelas[j][i] not in (1, 2)}
        d = {}
        for gn, f in grup.items():
            x = [r[j][i] for j in range(h) for i in range(w) if r[j][i] == r[j][i] and f(j, i)]
            d[gn] = dict(n=len(x), p10_p50_p90=[round(S.kuantil(x, q), 3) for q in (.1, .5, .9)] if x else None,
                         pct_positif=round(100.0 * sum(1 for v in x if v > 0) / len(x), 2) if x else None)
        out["uji_sebab"]["dekorelasi_" + nm] = d
    json.dump(out, open(keluar_json, "w"), indent=1, ensure_ascii=False)
    if keluar_md:
        open(keluar_md, "w").write("\n".join(laporan_md(out)) + "\n")
    return out


def laporan_md(o):
    f = lambda x: "tak terukur" if x is None else ("%.2f" % x)
    L = ["# Hasil lab InSAR gambut (%s, %s)" % (o["wilayah"], o["musim"]), "",
         "| Jendela | piksel terbakar | piksel kontrol | koheren % | dh cm (p10 .. p90) | D_insar cm | vonis |", "| --- | --- | --- | --- | --- | --- | --- |"]
    for j in o["jendela"]:
        L.append("| %s | %d | %d | %s | %s (%s .. %s) | %s | %s |" % (j["nama"], j["piksel_terbakar"], j["piksel_kontrol"], j["koheren_pct"],
                 f(j["dh_cm"]), f(j["dh_p10"]), f(j["dh_p90"]), f(j["d_insar_cm"]), j.get("vonis") or ("eksploratif: " + j["vonis_eksploratif"])))
    return L


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["--uji"]:
        uji()
    elif a[:1] == ["lab"] and len(a) >= 3:
        lab(a[1], a[2], a[3] if len(a) > 3 else None)
    else:
        sys.exit(__doc__)
