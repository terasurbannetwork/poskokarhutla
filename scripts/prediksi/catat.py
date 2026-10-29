"""Bekukan prakiraan hari ini per kab/kota untuk tenggang +1..+3 -> public/prediksi/data/arsip/YYYY-MM.jsonl (append-only).

Kode dan kolomnya (satu baris arsip per kode per hari terbit, lihat dasar.py):
  HJN  p1 p20 p50 tot mulai lama puncak sm m
       Hujan per jam Open-Meteo (best_match, zona Asia/Jakarta) di titik pusat kab, 100 lokasi per panggilan (6 panggilan).
       mulai = jam pertama >= 0,5 mm, lama = jumlah jam >= 0,5 mm, puncak = jam hujan terbesar (None bila tak ada jam basah),
       tot = jumlah 24 jam (mm), sm = kelembapan tanah 3-27 cm rata-rata harian (m3/m3).
       Peluang: m=1 ansambel ECMWF 51 anggota (public/banjir/data/hujan_ansambel.json, titik kotak 1 derajat terdekat
       <= 1 derajat): p50 = pecahan anggota >= 50 mm; p1/p20 diinterpolasi dari persentil 10/50/90 anggota.
       m=0 tanpa ansambel untuk tanggal itu: skor mentah dari jumlah deterministik (lihat DET). Keduanya MENTAH, belum
       teruji; kalibrasi.py yang memetakannya ke frekuensi teramati setelah 30 pasangan matang.
  API  p d pt ps   peluang >= 1 titik panas (lokasi unik, keyakinan sedang/tinggi) di kab. d = hari bertitik panas dari 3 hari
       terakhir (public/data/titik_hari), pt/ps = P(FWI >= 7 / >= 14) sel ansambel terdekat (public/data/fwi_ansambel.json,
       hanya provinsi prioritas). Skor mentah p = 0,03 + 0,94 x rata-rata(d/3, pt) (pt tak ada: d/3 saja).
  BNJ  lv ps       level banjir tertinggi kecamatan di kab (0 Normal..3 Awas, public/banjir/data/status.json) dan peluang
  LSR  lv ps       jalur hujan mencapai Siaga (prakiraan72.json, None bila ensemble tak jalan). LSR = kolom longsor.
  ASP  pm kat      PM2,5 rata-rata 24 jam CAMS (public/udara/data/prakiraan.json r24) dan kategori 0 Baik/Sedang,
                   1 Tidak sehat, 2 Sangat tidak sehat, 3 Berbahaya (batas P.14/2020 sama dengan pipeline udara).
  ROB  lewat sel   muka laut harian maksimum di titik rob kab >= p95 titik itu (public/banjir/data/rob.json); sel = selisih
                   maksimum terhadap p95 (m). Hanya kab yang punya titik rob.
Masukan yang tidak ada atau tidak mencakup ketiga tanggal sasaran = kode itu dilewati dan dicatat di log, bukan dikarang.
Jalan ulang di hari yang sama tidak menimpa (prakiraan pertama hari itu yang dinilai).

Pakai:  python3 scripts/prediksi/catat.py          (butuh jaringan untuk HJN)
        python3 scripts/prediksi/catat.py uji      (tanpa jaringan)
"""
import datetime as dt, json, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D

URL = "https://api.open-meteo.com/v1/forecast"
PER_PANGGIL = 100
BASAH = 0.5                     # mm/jam: jam dihitung hujan (RANCANGAN "mulai = jam pertama >= 0,5 mm")
AMBANG = [1, 20, 50]            # mm/24 jam
# ponytail: skor mentah deterministik (rasio jumlah/ambang -> peluang), sengaja kasar; kalibrasi isotonik yang menggantinya
DET = [(1.0, 0.8), (0.5, 0.4), (0.0, 0.05)]
ISPU = [55.4, 150.4, 250.4]     # P.14/2020 PM2,5 24 jam: batas atas Sedang, Tidak sehat, Sangat tidak sehat (udara/alat.py BATAS)


def log(*a):
    print("catat:", *a, file=sys.stderr)


def ringkas_hujan(jam):
    """24 nilai mm/jam (indeks = jam WIB) -> (tot, mulai, lama, puncak). None di tengah dianggap tak ada data."""
    v = [x for x in jam if x is not None]
    if len(v) < 20:
        return None
    basah = [i for i, x in enumerate(jam) if x is not None and x >= BASAH]
    puncak = max(range(len(jam)), key=lambda i: jam[i] or 0) if basah else None
    return round(sum(v), 1), (basah[0] if basah else None), len(basah), puncak


def p_det(tot, a):
    return next(p for r, p in DET if tot >= r * a)


def p_persentil(q, a):
    """P(X >= a) dari persentil (p10, p50, p90): CDF linier antar-persentil; ekor di luar p10/p90 tak diketahui,
    jadi dibatasi 0,95 / 0,05 (ponytail: interpolasi tiga titik, ganti dengan pecahan anggota bila ansambel penuh disimpan)."""
    p10, p50, p90 = q
    if a <= p10:
        return 0.95
    if a > p90:
        return 0.05
    if a <= p50:
        return round(0.9 - 0.4 * (a - p10) / (p50 - p10), 2) if p50 > p10 else 0.5
    return round(0.5 - 0.4 * (a - p50) / (p90 - p50), 2) if p90 > p50 else 0.1


def peluang_hujan(tot, ens):
    """-> ([p1, p20, p50], m). ens = (p50, (q10, q50, q90)) dari ansambel atau None."""
    if ens and ens[0] is not None and all(x is not None for x in ens[1]):
        ps = [p_persentil(ens[1], AMBANG[0]), p_persentil(ens[1], AMBANG[1]), ens[0]]
        m = 1
    else:
        ps = [p_det(tot, a) for a in AMBANG]
        m = 0
    for i in (1, 0):                       # ambang lebih ringan tidak boleh kurang mungkin
        ps[i] = max(ps[i], ps[i + 1])
    return [round(p, 2) for p in ps], m


def per_hari(waktu, nilai):
    """Deret per jam ('YYYY-MM-DDTHH:MM' WIB) -> {tanggal: [24 nilai]}."""
    out = {}
    for w, x in zip(waktu, nilai):
        out.setdefault(w[:10], [None] * 24)[int(w[11:13])] = x
    return out


def ambil_hujan(daftar):
    """-> {id: {tanggal: (jam[24], sm)}} dari Open-Meteo, PER_PANGGIL lokasi per panggilan."""
    out = {}
    for i in range(0, len(daftar), PER_PANGGIL):
        b = daftar[i:i + PER_PANGGIL]
        q = {"latitude": ",".join(str(k["lat"]) for k in b), "longitude": ",".join(str(k["lon"]) for k in b),
             "hourly": "precipitation,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm", "timezone": "Asia/Jakarta", "forecast_days": 4}
        r = D.per_lokasi(D.ambil(URL + "?" + "&".join(f"{k}={v}" for k, v in q.items())))
        for k, j in zip(b, r):
            h = j["hourly"]
            pr = per_hari(h["time"], h["precipitation"])
            sm = per_hari(h["time"], [None if a is None or c is None else (6 * a + 18 * c) / 24
                                      for a, c in zip(h["soil_moisture_3_to_9cm"], h["soil_moisture_9_to_27cm"])])
            out[k["id"]] = {t: (pr[t], _rata(sm.get(t, []))) for t in pr}
    return out


def _rata(xs):
    v = [x for x in xs if x is not None]
    return round(sum(v) / len(v), 3) if v else None


def entri_hjn(t, daftar, hujan, ens):
    """hujan = {id: {tanggal: (jam24, sm)}}, ens = hujan_ansambel.json atau None."""
    hari = [D.geser(t, i) for i in (1, 2, 3)]
    grid = []
    if ens and set(hari) <= set(ens.get("hari", [])):
        ix = [ens["hari"].index(h) for h in hari]
        grid = [(g["lat"], g["lon"], g) for g in ens["grid"]]
    else:
        log("HJN: hujan_ansambel.json tidak mencakup", hari, "-> peluang mentah deterministik (m=0)")
    kab = {}
    for k in daftar:
        h = hujan.get(k["id"])
        if not h:
            continue
        g = D.terdekat(k["lat"], k["lon"], grid, 1.0) if grid else None
        baris = []
        for n, tgl in enumerate(hari):
            if tgl not in h or not (r := ringkas_hujan(h[tgl][0])):
                baris.append(None)
                continue
            tot, mulai, lama, puncak = r
            e = (g["p50"][ix[n]], tuple(g["q"][j][ix[n]] for j in range(3))) if g else None
            ps, m = peluang_hujan(tot, e)
            baris.append(ps + [tot, mulai, lama, puncak, h[tgl][1], m])
        if any(baris):
            kab[k["id"]] = baris
    return {"sumber": "Open-Meteo per jam (best_match); peluang ansambel ECMWF IFS bila ada",
            "kol": ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "sm", "m"], "hari": hari, "kab": kab}


def titik_kab(jalur, cari, kmin=1):
    """titik_hari/<tgl>.json -> {id: jumlah lokasi unik keyakinan >= kmin}."""
    d = D.baca(jalur)
    if not d:
        return None
    c = {n: i for i, n in enumerate(d["kolom"])}
    ids = [cari(*w.split("|")[:2]) for w in d["wilayah"]]
    out = {}
    for r in d["baris"]:
        if r[c["keyakinan"]] >= kmin and (i := ids[r[c["wilayah"]]]):
            out[i] = out.get(i, 0) + 1
    return out


def entri_api(t, daftar, akar, cari):
    folder = os.path.join(akar, "public", "data", "titik_hari")
    ada = sorted(f[:10] for f in os.listdir(folder) if f[:4].isdigit() and f[:10] <= t) if os.path.isdir(folder) else []
    if not ada or ada[-1] < D.geser(t, -2):
        log("API: titik_hari tidak ada / basi (> 2 hari)", ada[-1:] or "kosong")
        return None
    tiga = [titik_kab(os.path.join(folder, f + ".json"), cari) for f in ada[-3:]]
    fwi = D.baca(os.path.join(akar, "public", "data", "fwi_ansambel.json"), {})
    hari = [D.geser(t, i) for i in (1, 2, 3)]
    ix = [fwi["hari"].index(h) if h in fwi.get("hari", []) else None for h in hari]
    if all(i is None for i in ix):
        log("API: fwi_ansambel.json tidak mencakup", hari, "-> pt kosong, skor dari titik panas saja")
    grid = [(g["lat"], g["lon"], g) for g in fwi.get("grid", [])]
    kab = {}
    for k in daftar:
        d = sum(1 for x in tiga if (x or {}).get(k["id"]))
        g = D.terdekat(k["lat"], k["lon"], grid, 0.5) if grid else None
        baris = []
        for i in ix:
            pt = g["pt"][i] if g and i is not None else None
            ps = g["ps"][i] if g and i is not None else None
            skor = d / 3 if pt is None else (d / 3 + pt) / 2
            baris.append([round(0.03 + 0.94 * skor, 2), d, pt, ps])
        kab[k["id"]] = baris
    return {"sumber": f"FIRMS lokasi unik {ada[-3]}..{ada[-1]} + ansambel FWI ECMWF", "kol": ["p", "d", "pt", "ps"],
            "hari": hari, "kab": kab}


def entri_bnj(t, daftar, akar, cari, kolom):
    """kolom 'b' (banjir) atau 'l' (longsor) dari status.json; peluang Siaga dari prakiraan72.json."""
    st = D.baca(os.path.join(akar, "public", "banjir", "data", "status.json"))
    hari = [D.geser(t, i) for i in (1, 2, 3)]
    if not st or not set(hari) <= set(st.get("hari", [])):
        log(f"{'BNJ' if kolom == 'b' else 'LSR'}: status.json tidak mencakup", hari, "(hari:", (st or {}).get("hari"), ")")
        return None
    ix = [st["hari"].index(h) for h in hari]
    pra = D.baca(os.path.join(akar, "public", "banjir", "data", "prakiraan72.json"), {})
    ada_p = pra.get("anggota") is not None and pra.get("hari") == st["hari"]
    kab = {}
    for kec, v in st["kec"].items():
        i = cari(*kec.split("|")[:2])
        if not i:
            continue
        b = kab.setdefault(i, [[0, 0.0 if ada_p else None] for _ in hari])
        for n, j in enumerate(ix):
            b[n][0] = max(b[n][0], v[kolom][j] or 0)
    if ada_p:
        for kec, v in pra.get("kec", {}).items():
            i = cari(*kec.split("|")[:2])
            q = v.get("p" + kolom)
            if i in kab and q:
                for n, j in enumerate(ix):
                    kab[i][n][1] = max(kab[i][n][1], round(q[j][1] / 100, 2))
    for k in daftar:                      # kab tanpa kecamatan berstatus = Normal, tetap dicatat (kebenaran negatif ikut dinilai)
        kab.setdefault(k["id"], [[0, 0.0 if ada_p else None] for _ in hari])
    return {"sumber": "status banjir/longsor per kecamatan (Pantau Bencana), maks per kab", "kol": ["lv", "ps"], "hari": hari, "kab": kab}


def entri_asp(t, daftar, akar):
    u = D.baca(os.path.join(akar, "public", "udara", "data", "prakiraan.json"))
    hari = [D.geser(t, i) for i in (1, 2, 3)]
    if not u or u.get("dibuat", "")[:10] < D.geser(t, -1):
        log("ASP: prakiraan.json udara tidak ada / basi")
        return None
    ix = [u["hari"].index(h) if h in u["hari"] else None for h in hari]
    if all(i is None for i in ix):
        log("ASP: prakiraan.json tidak mencakup", hari)
        return None
    ids = {k["id"] for k in daftar}
    kab = {}
    for k in u["kota"]:
        if k["kode"] not in ids:
            continue
        baris = []
        for i in ix:
            pm = k["r24"][i] if i is not None and i < len(k.get("r24", [])) else None
            baris.append(None if pm is None else [pm, sum(pm > b for b in ISPU)])
        if any(baris):
            kab[k["kode"]] = baris
    return {"sumber": "CAMS (Copernicus) via Open-Meteo, PM2,5 rata-rata 24 jam", "kol": ["pm", "kat"], "hari": hari, "kab": kab}


def entri_rob(t, akar, cari):
    r = D.baca(os.path.join(akar, "public", "banjir", "data", "rob.json"))
    hari = [D.geser(t, i) for i in (1, 2, 3)]
    if not r or not set(hari) <= set(r.get("hari", [])):
        log("ROB: rob.json tidak mencakup", hari)
        return None
    ix = [r["hari"].index(h) for h in hari]
    kab = {}
    for p in r["titik"]:
        i = cari(p["prov"], p["kab"])
        if not i or p.get("p95") is None:
            continue
        b = kab.setdefault(i, [None, None, None])
        for n, j in enumerate(ix):
            h = p["h"][j] if j < len(p["h"]) else None
            if h is None:
                continue
            sel = round(h - p["p95"], 2)
            b[n] = [max(int(sel >= 0), (b[n] or [0])[0]), max(sel, (b[n] or [0, -99])[1])]
    kab = {k: v for k, v in kab.items() if any(v)}
    return {"sumber": "Open-Meteo Marine (SMOC) muka laut + ambang p95 titik rob", "kol": ["lewat", "sel"], "hari": hari, "kab": kab} if kab else None


def catat(t, akar=D.AKAR, folder=None, hujan=None, daftar=None):
    """Bekukan semua kode yang belum tercatat untuk tanggal terbit t. hujan: {id: ...} (uji) atau None = unduh."""
    daftar = daftar or D.kab(akar)
    cari = D.pencari(daftar)
    sudah = {e["k"] for e in D.semua_arsip(folder) if e["t"] == t}
    dibuat = dt.datetime.now(D.WIB).replace(microsecond=0).isoformat()
    tulis = []
    for k in D.KODE:
        if k in sudah:
            log(k, "sudah tercatat untuk", t, "-> tidak ditimpa")
            continue
        try:
            if k == "HJN":
                h = hujan if hujan is not None else ambil_hujan(daftar)
                e = entri_hjn(t, daftar, h, D.baca(os.path.join(akar, "public", "banjir", "data", "hujan_ansambel.json")))
            elif k == "API":
                e = entri_api(t, daftar, akar, cari)
            elif k in ("BNJ", "LSR"):
                e = entri_bnj(t, daftar, akar, cari, "b" if k == "BNJ" else "l")
            elif k == "ASP":
                e = entri_asp(t, daftar, akar)
            else:
                e = entri_rob(t, akar, cari)
        except (RuntimeError, D.KuotaHabis, KeyError, ValueError, OSError) as x:
            log(k, "gagal:", x)
            e = None
        if not e or not e["kab"]:
            continue
        e = {"t": t, "k": k, "dibuat": dibuat, **e}
        if D.tambah_arsip(e, folder):
            tulis.append(k)
            log(k, "dibekukan:", len(e["kab"]), "kab")
    return tulis


def uji():
    assert ringkas_hujan([0] * 24) == (0, None, 0, None)
    j = [0] * 24
    j[14], j[15], j[16] = 2.0, 6.5, 0.5
    assert ringkas_hujan(j) == (9.0, 14, 3, 15), ringkas_hujan(j)
    assert ringkas_hujan([None] * 10 + [0] * 14) is None, "jam kosong > 4 = tidak dikarang"
    assert peluang_hujan(60, None) == ([0.8, 0.8, 0.8], 0) and peluang_hujan(12, None)[0] == [0.8, 0.4, 0.05]
    ps, m = peluang_hujan(5, (0.1, (0, 8, 40)))
    assert m == 1 and ps[2] == 0.1 and ps[0] >= ps[1] >= ps[2] and 0 <= ps[1] <= 1, ps
    assert p_persentil((2, 10, 30), 1) == 0.95 and p_persentil((2, 10, 30), 31) == 0.05 and p_persentil((2, 10, 30), 10) == 0.5
    assert per_hari(["2026-10-30T00:00", "2026-10-30T23:00"], [1, 2])["2026-10-30"][23] == 2
    # kab & pencari
    daftar = D.kab()
    assert len(daftar) == 514 and len({k["id"] for k in daftar}) == 514
    assert all(-11.5 < k["lat"] < 6.5 and 94.5 < k["lon"] < 141.5 for k in daftar)
    cari = D.pencari(daftar)
    assert cari("75", "Pahuwato") == cari("75", "Pohuwato") is not None
    assert cari("Sulawesi Tengah", "Toli Toli") == cari("72", "Toli-Toli") is not None
    assert cari("94", "Kota Jayapura") is not None, "provinsi DIBI lama: cocok nasional bila nama unik"
    assert cari("31", "Kota Adm. Jakarta Timur") is not None
    assert cari("11", "Tidak Ada") is None
    # catat ke folder sementara: hanya HJN yang punya masukan sintetis; kode lain dilewati, tidak dikarang
    with tempfile.TemporaryDirectory() as tmp:
        t = "2026-10-29"
        jam = {D.geser(t, i): ([0.0] * 14 + [3.0] * 3 + [0.0] * 7, 0.4) for i in (1, 2, 3)}
        hujan = {daftar[0]["id"]: jam, daftar[1]["id"]: jam}
        os.makedirs(os.path.join(tmp, "scripts", "udara"))
        import shutil
        shutil.copy(os.path.join(D.AKAR, "scripts", "udara", "kota.json"), os.path.join(tmp, "scripts", "udara"))
        f = os.path.join(tmp, "arsip")
        assert catat(t, tmp, f, hujan, daftar) == ["HJN"]
        assert catat(t, tmp, f, hujan, daftar) == [], "jalan ulang hari yang sama tidak menimpa"
        e = D.semua_arsip(f)
        assert len(e) == 1 and e[0]["hari"] == ["2026-10-30", "2026-10-31", "2026-11-01"]
        assert e[0]["kab"][daftar[0]["id"]][0] == [0.8, 0.05, 0.05, 9.0, 14, 3, 14, 0.4, 0]
        # masukan salah ditolak
        rusak = dict(e[0], t="2026-10-30", kab={"1101": [[1.5, 0, 0, 0, 0, 0, 0, 0, 0], None, None]})
        try:
            D.tambah_arsip(rusak, f)
            raise AssertionError("peluang > 1 harus ditolak")
        except ValueError:
            pass
        mundur = dict(e[0], t="2026-11-02")      # hari sasaran tidak sesudah t
        assert D.periksa_entri(mundur) is not None
        # arsip menyusut / berubah terdeteksi
        lama = D.baris_arsip(D.berkas_arsip(t, f))
        assert D.periksa_arsip(lama, []) and D.periksa_arsip(lama, [lama[0].replace("0.8", "0.9")]) and D.periksa_arsip(lama, lama + ["{}"]) is None
        D.cek_arsip(f, git=lambda rel: None)     # tidak dilacak git: lewat
    # ASP & API dari berkas nyata bila ada (tanpa jaringan): bentuk sah
    for e in (entri_asp(D.hari_ini(), daftar, D.AKAR), entri_api(D.hari_ini(), daftar, D.AKAR, cari)):
        if e:
            assert D.periksa_entri({"t": D.hari_ini(), "k": "ASP" if "pm" in e["kol"] else "API", **e}) is None
    print("catat.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif len(sys.argv) == 1:
        D.cek_arsip()
        t = D.hari_ini()
        k = catat(t)
        print(f"catat {t}: {', '.join(k) or 'tidak ada kode baru'}")
    else:
        print(__doc__)
