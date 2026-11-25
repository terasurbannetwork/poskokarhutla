"""Pemindai bersama Himawari-9 L1b (awal ST-03A): ukur beban satu hari riwayat dan gerbang anggaran arsip.

Hanya stdlib. Pembaca HSD DIIMPOR dari scripts/udara/awan_himawari.py (tidak ada pembaca kedua).
Mode:
  ukur [--tanggal YYYYMMDD] [--tiap JAM] [--maks-gb 2]   unduh cuplikan per jam dari bucket noaa-himawari9, catat
                                                         MB, detik, KB keluaran per jenis -> himawari_pindai.ukur.json
  anggaran                                               hitung ulang DESAIN-TEKNIS 4.1 dari ukur.json; exit 1 bila batas
                                                         di himawari_pindai.batas.json terlewati
  uji                                                    self-check
Detektor di sini hanyalah PROKSI UKURAN (batas atas jumlah titik api tanpa uji latar, ringkasan awan per kab, ringkasan BTD
per gunung); detektor sungguhan ada di ST-04/08/09. Waktu terukur di mesin ini, bukan runner GitHub.
"""
import bz2, datetime as dt, gzip, importlib.util, json, math, os, re, sys, time
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.dirname(os.path.abspath(__file__))
BATAS = os.path.join(DIR, "himawari_pindai.batas.json")
UKUR = os.path.join(DIR, "himawari_pindai.ukur.json")
PITA = (7, 13, 14, 15)
KOTAK_LAT, KOTAK_BUJ = (-11.0, 6.0), (94.0, 142.0)  # ALGORITMA 0: kotak Indonesia
P0 = dict(sub=140.7, cfac=20466275, lfac=20466275, coff=2750.5, loff=2750.5, rs=42164.0, req=6378.137, rpol=6356.7523)
SEG_GARIS = 550


def _muat(nama, jalur):
    s = importlib.util.spec_from_file_location(nama, jalur)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


AH = _muat("udara_awan_himawari", os.path.join(AKAR, "scripts/udara/awan_himawari.py"))


def segmen_kotak(p=P0, lat=KOTAK_LAT, buj=KOTAK_BUJ):
    """Nomor segmen (1-10) yang menutup kotak: proyeksi kisi 0,5 derajat."""
    s = set()
    for iy in range(int((lat[1] - lat[0]) * 2) + 1):
        for ix in range(int((buj[1] - buj[0]) * 2) + 1):
            kl = AH.proyeksi(lat[0] + iy / 2, buj[0] + ix / 2, p)
            if kl:
                s.add((kl[1] - 1) // SEG_GARIS + 1)
    return sorted(s)


def invers(c, l, p):
    """CGMS balik: (kolom, garis) 1-based -> (lintang, bujur) derajat; None di luar bumi."""
    x, y = math.radians((c - p["coff"]) / (2 ** -16 * p["cfac"])), math.radians((l - p["loff"]) / (2 ** -16 * p["lfac"]))
    r = p["req"] ** 2 / p["rpol"] ** 2
    a = math.cos(y) ** 2 + r * math.sin(y) ** 2
    dd = (p["rs"] * math.cos(x) * math.cos(y)) ** 2 - a * (p["rs"] ** 2 - p["req"] ** 2)
    if dd < 0:
        return None
    sn = (p["rs"] * math.cos(x) * math.cos(y) - math.sqrt(dd)) / a
    s1, s2, s3 = p["rs"] - sn * math.cos(x) * math.cos(y), sn * math.sin(x) * math.cos(y), -sn * math.sin(y)
    return math.degrees(math.atan(r * s3 / math.hypot(s1, s2))), math.degrees(math.atan(s2 / s1)) + p["sub"]


def kunci(w, pita, s):
    return f"AHI-L1b-FLDK/{w:%Y/%m/%d/%H%M}/HS_H09_{w:%Y%m%d_%H%M}_B{pita:02d}_FLDK_R20_S{s:02d}10.DAT.bz2"


def unduh(w, segs):
    """{(pita, s): hasil baca_segmen} dan jumlah byte terkompresi, paralel 8 utas."""
    tugas = [(b, s) for b in PITA for s in segs]
    def satu(t):
        m = AH.ambil(AH.BUCKET + kunci(w, *t))
        return t, len(m), AH.baca_segmen(bz2.decompress(m), t[0])
    with ThreadPoolExecutor(12) as ex:
        hasil = list(ex.map(satu, tugas))
    return {t: r for t, _, r in hasil}, sum(n for _, n, _ in hasil)


def lut(kal):
    return [AH.tb(c, kal) or 0.0 for c in range(65536)]


def sampel(seg, pita, pts, p):
    """Tb di titik (lat, lon): daftar, melewati titik di luar segmen yang diunduh atau tanpa data."""
    out = []
    for la, lo in pts:
        kl = AH.proyeksi(la, lo, p)
        if not kl:
            continue
        s = (kl[1] - 1) // SEG_GARIS + 1
        if (pita, s) not in seg:
            continue
        _, kal, g1, ncol, nlin, d = seg[(pita, s)]
        r = kl[1] - g1
        if 0 <= r < nlin and 1 <= kl[0] <= ncol and d[r * ncol + kl[0] - 1] < 65534:
            out.append(AH.tb(d[r * ncol + kl[0] - 1], kal))
    return out


def proksi_api(seg, w, p, segs):
    """Batas atas titik api: calon ALGORITMA 1 tanpa uji latar. Mengembalikan dokumen keluaran."""
    titik = []
    jam = w.hour + w.minute / 60
    for s in segs:
        _, k7, g1, ncol, nlin, d7 = seg[(7, s)]
        _, k14, _, _, _, d14 = seg[(14, s)]
        l7, l14 = lut(k7), lut(k14)
        ok = bytearray(1 if t > 300.0 else 0 for t in l7)
        for i, v in enumerate(d7):
            if not ok[v]:
                continue
            ll = invers(i % ncol + 1, g1 + i // ncol, p)
            if not ll or not (KOTAK_LAT[0] <= ll[0] <= KOTAK_LAT[1] and KOTAK_BUJ[0] <= ll[1] <= KOTAK_BUJ[1]):
                continue
            t7, t14 = l7[v], l14[d14[i]]
            siang = 6 <= (jam + ll[1] / 15) % 24 < 18
            if t14 >= 265 and (t7 > 310 and t7 - t14 > 10 if siang else t7 - t14 > 6):
                titik.append({"lon": round(ll[1], 2), "lat": round(ll[0], 2), "kelas": "sedang", "frp_mw": 0, "tb07": round(t7, 1), "dt": round(t7 - t14, 1)})
    return {"acuan": f"{w:%Y-%m-%dT%H:%MZ}", "status_sumber": "hidup", "sejak": None, "versi_kriteria": 1, "vonis": "menunggu",
            "sumber": "Himawari-9 L1b (JMA) lewat NOAA ODD", "awan_persen": 0.0, "titik": titik}


def proksi_awan(seg, w, p, kab):
    isi = {}
    for kode, (nama, pts) in kab.items():
        ts = sampel(seg, 13, pts, p)
        if ts:
            isi[kode] = {"kab": nama, **AH.ringkas(ts)}
    return {"acuan": f"{w:%Y-%m-%dT%H:%MZ}", "versi_kriteria": 1, "vonis": "menunggu", "kab": isi}


def proksi_abu(seg, w, p, gunung):
    isi = {}
    for g in gunung:
        pts = [(g["lat"] + i * 0.05, g["lon"] + j * 0.05) for i in range(-18, 19) for j in range(-18, 19) if (i * i + j * j) * 0.0025 <= 0.81]
        a, b = sampel(seg, 13, pts, p), sampel(seg, 15, pts, p)
        n = min(len(a), len(b))
        btd = [a[i] - b[i] for i in range(n)]
        if btd:
            isi[g["kode"]] = {"n": n, "btd_min": round(min(btd), 1), "n_btd_negatif": sum(x < -0.5 for x in btd)}
    return {"acuan": f"{w:%Y-%m-%dT%H:%MZ}", "versi_kriteria": 1, "vonis": "menunggu", "gunung": isi}


def ukuran(dok):
    j = json.dumps(dok, ensure_ascii=False, separators=(",", ":")).encode()
    return len(j), len(gzip.compress(j))


def ukur(tanggal, tiap, maks_gb):
    kab = AH.titik_kab()
    gunung = [g for g in json.load(open(os.path.join(AKAR, "public/banjir/data/gunungapi_status.json")))["gunung"] if g["level"] >= 2]
    segs = segmen_kotak()
    d0 = dt.datetime.strptime(tanggal, "%Y%m%d").replace(tzinfo=dt.timezone.utc)
    jam = list(range(0, 24, tiap))
    # taksiran dari daftar S3 (gratis) sebelum satu byte data diunduh
    taksir = 0
    for h in jam:
        w = d0.replace(hour=h)
        ukr = {k: int(z) for k, z in re.findall(r"<Key>([^<]*)</Key>.*?<Size>(\d+)</Size>", AH.ambil(f"{AH.BUCKET}?list-type=2&prefix=AHI-L1b-FLDK/{w:%Y/%m/%d/%H%M}/").decode().replace("\n", ""))}
        taksir += sum(ukr.get(kunci(w, b, s), 0) for b in PITA for s in segs)
    print(f"segmen {segs}; taksiran {taksir / 1e9:.2f} GB untuk {len(jam)} pindaian (tiap {tiap} jam)", file=sys.stderr)
    if taksir > maks_gb * 1e9:
        sys.exit(f"taksiran {taksir / 1e9:.2f} GB > batas sopan {maks_gb} GB; naikkan --tiap")
    baris = []
    for h in jam:
        w = d0.replace(hour=h)
        t0 = time.time()
        seg, byte = unduh(w, segs)
        t1 = time.time()
        p = seg[(13, segs[0])][0]
        dok = {"api": proksi_api(seg, w, p, segs), "awan": proksi_awan(seg, w, p, kab), "abu": proksi_abu(seg, w, p, gunung)}
        t2 = time.time()
        uk = {j: ukuran(v) for j, v in dok.items()}
        baris.append({"pindai": f"{w:%Y%m%d%H%M}", "mb": round(byte / 1e6, 1), "detik_unduh": round(t1 - t0, 1), "detik_hitung": round(t2 - t1, 1),
                      "json_kb": {j: round(u[0] / 1e3, 1) for j, u in uk.items()}, "gz_kb": {j: round(u[1] / 1e3, 1) for j, u in uk.items()},
                      "n_titik_api": len(dok["api"]["titik"])})
        print(baris[-1], file=sys.stderr)
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "tanggal": tanggal, "tiap_jam": tiap, "segmen": segs, "pita": list(PITA),
           "catatan": "waktu di mesin pengukur, bukan runner; detektor = proksi ukuran (api: batas atas tanpa uji latar)", "pindaian": baris}
    json.dump(out, open(UKUR, "w"), indent=1)
    print(f"tulis {UKUR}", file=sys.stderr)


def hitung(ur, b):
    """Anggaran bulan dari ukuran + batas -> (tabel, daftar pelanggaran). Murni, dipakai uji."""
    n = b["run_per_hari"] * b["hari_bulan"]
    r = ur["pindaian"]
    jenis = r[0]["gz_kb"].keys()
    rerata = {j: sum(x["gz_kb"][j] for x in r) / len(r) for j in jenis}
    maks = max(x["gz_kb"][j] for x in r for j in jenis)
    terbaru = max(x["json_kb"][j] for x in r for j in jenis)
    kj = len(rerata)
    a = kj * n + kj * n + n + b["kelas_a_tetap"]["pemadatan"] + b["kelas_a_tetap"]["picu_tulis"]
    bb = n + kj * n + sum(b["kelas_b_tetap"].values())
    gb = sum(rerata.values()) * n / 1e6
    detik = sum(x["detik_unduh"] + x["detik_hitung"] for x in r) / len(r) + b["overhead_run_detik"]
    tabel = {"pindaian_bulan": n, "kelas_a": a, "kelas_b": bb, "gb_bulan": round(gb, 3), "gb_simpan": round(gb * b["simpan_bulan"], 2),
             "potongan_rerata_kb": round(sum(rerata.values()) / kj, 1), "potongan_maks_kb": maks, "terbaru_maks_kb": terbaru,
             "unduh_runner_gb_bulan": round(sum(x["mb"] for x in r) / len(r) * n / 1e3, 0), "unggah_r2_gb_bulan": round(gb, 3),
             "detik_per_run": round(detik, 0), "menit_runner_bulan": round(detik * n / 60), "per_jenis_gz_kb": {j: round(v, 1) for j, v in rerata.items()}}
    s = []
    for nama, nilai, lim in (("kelas_a", a, b["kelas_a_bulan"]), ("kelas_b", bb, b["kelas_b_bulan"]), ("gb_bulan", gb, b["gb_bulan"]),
                             ("potongan_rerata_kb", tabel["potongan_rerata_kb"], b["potongan_rerata_kb"]), ("potongan_maks_kb", maks, b["potongan_maks_kb"]),
                             ("terbaru_maks_kb", terbaru, b["terbaru_maks_kb"]), ("detik_per_run", detik, b["detik_run_maks"]), ("detik_per_run(kadens)", detik, b["detik_kadens"])):
        if nilai > lim:
            s.append(f"{nama} {nilai:.1f} > batas {lim}")
    return tabel, s


def anggaran():
    t, s = hitung(json.load(open(UKUR)), json.load(open(BATAS)))
    print(json.dumps(t, indent=1))
    if s:
        print("DITOLAK: " + "; ".join(s) + " -> arsip tidak dinyalakan", file=sys.stderr)
        sys.exit(1)
    print("anggaran lolos")


def uji():
    b = json.load(open(BATAS))
    # segmen kotak Indonesia: himpunan bagian 3..8 dari 10, tanpa segmen kutub
    sg = segmen_kotak()
    assert sg and set(sg) <= set(range(2, 9)) and sg == list(range(sg[0], sg[-1] + 1)), sg
    # proyeksi-invers bolak-balik
    for la, lo in ((-6.2, 106.8), (3.5, 98.7), (-2.0, 140.0)):
        c, l = AH.proyeksi(la, lo, P0)
        la2, lo2 = invers(c, l, P0)
        assert abs(la - la2) < 0.03 and abs(lo - lo2) < 0.03, (la, lo, la2, lo2)
    # anggaran: rumus DESAIN-TEKNIS 4.1 pada ukuran kecil -> A ~35.000, B ~210.000
    r = {"pindaian": [{"mb": 50, "detik_unduh": 20, "detik_hitung": 10, "json_kb": {"api": 5, "abu": 5, "awan": 5}, "gz_kb": {"api": 5, "abu": 5, "awan": 5}}]}
    t, s = hitung(r, b)
    assert not s and 34000 < t["kelas_a"] < 38000 and 209000 < t["kelas_b"] < 215000, (t, s)
    assert abs(t["gb_bulan"] - 15 * 4320 / 1e6) < 1e-3, t
    # jalur tolak: potongan 300 KB, 3 jenis x 4320 x 300 KB = 3,9 GB, melewati batas
    r["pindaian"][0]["gz_kb"] = {"api": 300, "abu": 300, "awan": 300}
    t, s = hitung(r, b)
    assert any(x.startswith("potongan_maks_kb") for x in s) and any(x.startswith("gb_bulan") for x in s), s
    # waktu run melewati batas job 8 menit
    r["pindaian"][0].update(gz_kb={"api": 5, "abu": 5, "awan": 5}, detik_unduh=500)
    assert any(x.startswith("detik_per_run") for x in hitung(r, b)[1])
    assert kunci(dt.datetime(2026, 11, 24, 3, 0), 7, 4) == "AHI-L1b-FLDK/2026/11/24/0300/HS_H09_20261124_0300_B07_FLDK_R20_S0410.DAT.bz2"
    print("uji himawari_pindai ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["anggaran"]:
        anggaran()
    elif a[:1] == ["ukur"]:
        def opsi(k, d):
            return a[a.index(k) + 1] if k in a else d
        ukur(opsi("--tanggal", (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=2)).strftime("%Y%m%d")), int(opsi("--tiap", 1)), float(opsi("--maks-gb", 2)))
    else:
        sys.exit(__doc__)
