"""TS-13: pustaka skenario tsunami, pemilih terdekat, dan uji kepekaan tingkat B.

BUKAN peringatan, BUKAN prakiraan: skenario sintetis berlabel hipotesis, tingkat B (skenario terdekat, bukan hitungan gempa itu);
status tsunami resmi hanya BMKG/PTWC. Stdlib saat diimpor; hitung dan rakit dijalankan di venv lab (numpy, GeoClaw).
Tidak mengubah tsunami_hitung/tsunami_sumber/tsunami_keluaran (disidik kriteria uji balik); hanya memakainya.

Kisi sumber (KISI) dan toleransi kepekaan (TOLERANSI, KEPEKAAN) DITETAPKAN DI SINI SEBELUM hitungan apa pun (RISET 4.4) dan tidak
meniru kejadian uji (Flores 1992, Banyuwangi 1994, Pangandaran 2006, Mentawai 2010, Palu 2018, Selat Sunda 2018) maupun data NCEI:
letak sumber hanya dari palung (ETOPO 3') + setengah lebar bidang M 8,5, M dari K6 (8,0 / 8,5 / 8,8).

Pakai: python3 -I scripts/gempa/tsunami_pustaka.py kisi | uji | antre <kotak> | rakit | pilih <lat> <lon> <m>
"""
import heapq, json, math, os, sys, time

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tsunami_sumber as S
import tsunami_medan as MED
import tsunami_keluaran as K

PUBLIK = K.PUBLIK
VENV_PY = K.VENV_PY
RAD = math.pi / 180
KM = 111.19

# ---------- kisi sumber (ditetapkan sebelum hitung) ----------
# Megathrust antarmuka selatan Jawa, slip seragam, strike 265 (bidang miring ke UTARA, ke bawah Jawa; konvensi Aki-Richards kanan strike
# = strike 265 miring ke utara; strike 85 miring ke selatan dan menaruh angkatan di sisi darat, itu salah untuk Jawa).
# pusat bidang (proyeksi horizontal) = lintang palung + 0,55 derajat utara (setengah Wh M 8,5 = 0,55): tepi atas M 8,5 jatuh di palung.
# Lintang palung dari profil kedalaman ETOPO 3' pada bujur yang sama (terdalam ke arah selatan pantai): 105,4 BT -10,5 (perkiraan, profil datar),
# 108,8 BT -10,2, 114,1 BT -11,05. Bukan tiruan hiposenter kejadian mana pun.
KISI = {
    "ujung_kulon": {"kode": "uk", "palung_lat": -10.5, "lon": 105.4, "strike": 265, "dalam": 20, "jenis": "subduksi", "M": [8.0, 8.5, 8.8]},
    "pangandaran_cilacap": {"kode": "pc", "palung_lat": -10.2, "lon": 108.8, "strike": 265, "dalam": 20, "jenis": "subduksi", "M": [8.0, 8.5, 8.8]},
    "banyuwangi_rajegwesi": {"kode": "bw", "palung_lat": -11.05, "lon": 114.1, "strike": 265, "dalam": 20, "jenis": "subduksi", "M": [8.0, 8.5, 8.8]},
}
OFFSET_PUSAT = 0.55  # derajat utara palung
for _k in KISI.values():
    _k["lat"] = round(_k["palung_lat"] + OFFSET_PUSAT, 2)

# Gempa buatan untuk kepekaan (dua per kotak, kecil lalu besar), digeser sepanjang strike dari pusat kisi kotaknya (km, + = searah azimut strike).
KEPEKAAN = [
    {"id": "k1", "m": 8.1, "geser_strike_km": 25.0},   # terdekat: M 8,0 (selisih 0,1; jarak 25 km)
    {"id": "k2", "m": 8.3, "geser_strike_km": -75.0},  # terdekat: M 8,5 (selisih 0,2; jarak 75 km)
]
# Toleransi ditetapkan sebelum hitung, pilihan agent (bukan hasil data; bisa dibatalkan pemilik): faktor 1,5 pada d_maks dan luas, 10 menit pada tiba.
# Skenario pengganti dianggap cukup bila SEMUA terpenuhi; salah satu tak dapat dinilai = tidak lolos.
TOLERANSI = {"ln_d_maks": round(math.log(1.5), 4), "ln_luas": round(math.log(1.5), 4), "tiba_menit": 10.0}
MARGIN_DOMAIN = 0.6    # derajat di sekeliling jejak M 8,8
MARGIN_TIBA_S = 300    # lapis halus mulai ini sebelum perkiraan tiba paling awal
SESUDAH_TIBA_S = 1200  # tfinal = perkiraan tiba + ini (hanya awal gelombang; maksimum belum tentu final)
RES_DETIK = 3          # 1 detik tidak layak (RISET 4.3)
AMBANG_JARAK_KOSONG = None


def nama_pustaka(kotak, m):
    return "mt_%s_m%02d" % (KISI[kotak]["kode"], round(m * 10))


def nama_kepekaan(kotak, kid):
    return "ks_%s_%s" % (KISI[kotak]["kode"], kid)


def sumber_kisi(kotak, m, geser_strike_km=0.0):
    k = KISI[kotak]
    s = k["strike"] * RAD
    lat = k["lat"] + geser_strike_km * math.cos(s) / KM
    lon = k["lon"] + geser_strike_km * math.sin(s) / (KM * math.cos(k["lat"] * RAD))
    return {"lat": round(lat, 4), "lon": round(lon, 4), "m": m, "jenis": k["jenis"], "strike": k["strike"], "dalam": k["dalam"]}


def jarak_km(a, b):
    """Jarak lingkaran besar (km) antara (lat, lon) a dan b."""
    p1, p2 = a[0] * RAD, b[0] * RAD
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin((b[1] - a[1]) * RAD / 2) ** 2
    return 2 * S.RB / 1000 * math.asin(min(1, math.sqrt(h)))


# ---------- domain, perkiraan tiba ----------
def _jejak(r):
    """Sudut jejak horizontal rupture (lat, lon)."""
    s = r["strike"] * RAD
    out = []
    for u in (-r["L"] / 2, r["L"] / 2):
        for v in (-r["Wh"] / 2, r["Wh"] / 2):
            x, y = u * math.sin(s) + v * math.cos(s), u * math.cos(s) - v * math.sin(s)
            out.append((r["lat"] + y / KM, r["lon"] + x / (KM * math.cos(r["lat"] * RAD))))
    return out


def domain(kotak):
    """[xl, xr, yb, yt] kelipatan 0,05 derajat: jejak M terbesar + margin, gabung kotak halus + 0,3. Selatan dibatasi grid ETOPO (-11,9)."""
    k = KISI[kotak]
    r = S.rupture(sumber_kisi(kotak, max(k["M"])))
    pts = _jejak(r)
    bx = MED.KOTAK[kotak]["kotak"]
    xl = min(min(p[1] for p in pts) - MARGIN_DOMAIN, bx[0] - 0.3)
    xr = max(max(p[1] for p in pts) + MARGIN_DOMAIN, bx[2] + 0.3)
    yb = max(min(min(p[0] for p in pts) - MARGIN_DOMAIN, bx[1] - 0.3), -11.9)
    yt = max(max(p[0] for p in pts) + MARGIN_DOMAIN, bx[3] + 0.3)
    f = lambda v, up: (math.ceil(round(v / 0.05, 6)) if up else math.floor(round(v / 0.05, 6))) * 0.05
    return [round(f(xl, 0), 2), round(f(xr, 1), 2), round(f(yb, 0), 2), round(f(yt, 1), 2)]


def tiba_perkiraan(kotak, G=None):
    """Perkiraan tiba paling awal (detik) dari pusat segmen M 8,8 ke sel laut mana pun di kotak halus: Dijkstra c = sqrt(g h) di ETOPO 3'.
    Hanya untuk memilih awal lapis halus dan tfinal; BUKAN hasil model. Edge antar sel memakai rata-rata c."""
    G = G or S.muat_grid(os.path.join(AKAR, "public/gempa/data/"))
    k = KISI[kotak]
    dom = domain(kotak)
    d, nx, ny, lon0, lat0, z = G["d"], G["nx"], G["ny"], G["lon0"], G["lat0"], G["z"]
    i0, i1 = max(0, math.floor((dom[0] - lon0) / d)), min(nx - 1, math.ceil((dom[1] - lon0) / d))
    j0, j1 = max(0, math.floor((dom[2] - lat0) / d)), min(ny - 1, math.ceil((dom[3] - lat0) / d))
    r = S.rupture(sumber_kisi(kotak, max(k["M"])))
    bx = MED.KOTAK[kotak]["kotak"]

    def c(i, j):
        h = -z[j * nx + i]
        return math.sqrt(9.81 * h) if h > 0 else 0.0

    dist = {}
    pq = []
    for sg in S.segmentasi(r):
        i, j = round((sg["lon"] - lon0) / d), round((sg["lat"] - lat0) / d)
        if c(i, j) > 0:
            dist[(i, j)] = 0.0
            heapq.heappush(pq, (0.0, i, j))
    if not pq:
        raise ValueError("sumber tidak jatuh di laut ETOPO")
    while pq:
        t, i, j = heapq.heappop(pq)
        if t > dist.get((i, j), 1e99):
            continue
        lat = lat0 + j * d
        if bx[0] <= lon0 + i * d <= bx[2] and bx[1] <= lat <= bx[3]:
            return t  # sel laut pertama dalam kotak yang tersentuh = tiba paling awal (Dijkstra)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if not (di or dj):
                    continue
                a, b = i + di, j + dj
                if not (i0 <= a <= i1 and j0 <= b <= j1):
                    continue
                cb = c(a, b)
                if cb <= 0:
                    continue
                panjang = KM * 1000 * d * math.hypot(di * math.cos(lat * RAD), dj)
                nt = t + panjang / ((c(i, j) + cb) / 2)
                if nt < dist.get((a, b), 1e99):
                    dist[(a, b)] = nt
                    heapq.heappush(pq, (nt, a, b))
    raise ValueError("tak ada jalur laut ke kotak")


def waktu_hitung(kotak, t_tiba):
    """(t_halus, tfinal) detik, sama untuk semua hitungan satu kotak supaya pasangan sebanding."""
    t_halus = max(0, math.floor((t_tiba - MARGIN_TIBA_S) / 60) * 60)
    tfinal = math.ceil((t_tiba + SESUDAH_TIBA_S) / 100) * 100
    return float(t_halus), float(tfinal)


def rencana(kotak, G=None):
    t = tiba_perkiraan(kotak, G)
    t_h, t_f = waktu_hitung(kotak, t)
    return {"kotak": kotak, "domain": domain(kotak), "tiba_perkiraan_s": round(t), "t_halus_s": t_h, "tfinal_s": t_f}


# ---------- hitung (venv) ----------
def _venv():
    if os.path.realpath(sys.executable) != os.path.realpath(VENV_PY) and "TS_PUSTAKA_VENV" not in os.environ:
        if not os.path.exists(VENV_PY):
            raise SystemExit("venv GeoClaw tidak ada: " + VENV_PY)
        os.environ["TS_PUSTAKA_VENV"] = "1"
        os.execv(VENV_PY, [VENV_PY, "-I", os.path.abspath(__file__)] + sys.argv[1:])


def siapkan(nama, kotak, e, rc):
    """Padanan umum siapkan_skenario TS-11 (di sana domain dan batas dtopo -9,0 tertanam untuk kotak Banyuwangi): topo kasar ETOPO + halus GLO-30/GEBCO
    (keluaran TS-06), dtopo Okada per segmen 100 km di seluruh domain, AMR 3' -> 30\" -> 3\", fgmax di kotak. tanpa gesekan (K12)."""
    import numpy as np
    import tsunami_hitung as H
    sys.path.insert(0, H.CLAW)
    from clawpack.geoclaw.topotools import Topography
    from clawpack.geoclaw import dtopotools
    dom, t_halus, tfinal = rc["domain"], rc["t_halus_s"], rc["tfinal_s"]
    d0 = os.path.join(H.RUN, nama + "_masukan")
    os.makedirs(d0, exist_ok=True)
    G = S.muat_grid(H.ETOPO + "/")
    z = np.array(G["z"], dtype=float).reshape(G["ny"], G["nx"])
    x = G["lon0"] + G["d"] * np.arange(G["nx"])
    y = G["lat0"] + G["d"] * np.arange(G["ny"])
    ix, iy = (x >= dom[0] - 0.2) & (x <= dom[1] + 0.2), (y >= dom[2] - 0.2) & (y <= dom[3] + 0.2)
    tk = Topography(); tk.set_xyZ(x[ix], y[iy], z[np.ix_(iy, ix)])
    tk.write(os.path.join(d0, "kasar.tt3"), topo_type=3, Z_format="%.1f")
    m = json.load(open(os.path.join(H.MEDAN, kotak + ".json")))
    Z = np.fromfile(os.path.join(H.MEDAN, kotak + ".bin"), dtype="<f4").reshape(m["ny"], m["nx"])[::-1].astype(float)
    xf = m["lon_barat"] + m["dlon"] * np.arange(m["nx"])
    yf = m["lat_utara"] - m["dlat"] * (m["ny"] - 1) + m["dlat"] * np.arange(m["ny"])
    tf = Topography(); tf.set_xyZ(xf, yf, Z)
    tf.write(os.path.join(d0, "halus.tt3"), topo_type=3, Z_format="%.2f")
    r = S.rupture(e)
    segs = S.segmentasi(r)
    xs = np.arange(dom[0] + 0.1, dom[1] - 0.1 + 1e-9, 0.02)
    ys = np.arange(dom[2] + 0.1, dom[3] - 0.1 + 1e-9, 0.02)
    dZ = np.array([[S.deformasi_segmen(segs, yy, xx) for xx in xs] for yy in ys])
    dt = dtopotools.DTopography()
    dt.X, dt.Y = np.meshgrid(xs, ys)
    dt.times = np.array([0.0, 1.0])
    dt.dZ = np.array([0 * dZ, dZ])
    dt.write(os.path.join(d0, "dtopo.tt3"), dtopo_type=3)
    rasio = [6, 10]
    L = 3
    xl, xr, yb, yt = dom
    bx1, by1 = m["lon_barat"], m["lat_utara"] - m["dlat"] * (m["ny"] - 1)
    bx2, by2 = m["lon_barat"] + m["dlon"] * (m["nx"] - 1), m["lat_utara"]
    dxl = RES_DETIK / 3600.0
    spec = {"koordinat": 2, "kotak": [xl, xr, yb, yt], "sel": [round((xr - xl) * 20), round((yt - yb) * 20)], "tfinal": tfinal,
            "topo": [[3, os.path.join(d0, "kasar.tt3")], [3, os.path.join(d0, "halus.tt3")]],
            "dtopo": [[3, os.path.join(d0, "dtopo.tt3")]], "qinit_eta": [],
            "amr": {"tingkat": L, "rasio": rasio, "gelombang_tol": 0.1}, "manning": 0.0, "muka_laut": 0.0, "dry_tol": 0.001,
            "regioes": [[1, L - 1, 0.0, 1e10, xl, xr, yb, yt], [L, L, t_halus, 1e10, bx1, bx2, by1, by2]], "ringkas": True,
            "fgmax": {"x1": bx1 + dxl / 2, "x2": bx1 + dxl / 2 + dxl * ((m["nx"] - 1) // RES_DETIK - 1), "y1": by1 + dxl / 2,
                      "y2": by1 + dxl / 2 + dxl * ((m["ny"] - 1) // RES_DETIK - 1), "dx": dxl, "tstart": t_halus, "dt_check": 10.0, "min_level": L},
            "gauges": [], "sumber": e, "sumber_rupture": {q: r[q] for q in ("L", "W", "slip", "dip", "strike", "M0")},
            "kotak_kunci": kotak, "res_detik": RES_DETIK, "label": "hipotesis; bukan peringatan"}
    return spec, dZ


def jalankan(nama, kotak, e, rc):
    import tsunami_hitung as H
    spec, dZ = siapkan(nama, kotak, e, rc)
    print("%s: dtopo uz %.2f .. %.2f m, sel dasar %s, t_halus %g, tfinal %g" % (nama, dZ.min(), dZ.max(), spec["sel"], rc["t_halus_s"], rc["tfinal_s"]), flush=True)
    return H.hitung(spec, nama)


def daftar_hitungan(kotak):
    """Urutan hitung satu kotak: tiga pustaka (K6) lalu dua kepekaan."""
    out = [(nama_pustaka(kotak, m), sumber_kisi(kotak, m), "pustaka") for m in KISI[kotak]["M"]]
    out += [(nama_kepekaan(kotak, c["id"]), sumber_kisi(kotak, c["m"], c["geser_strike_km"]), "kepekaan") for c in KEPEKAAN]
    return out


def _berjalan(nama):
    import subprocess
    return subprocess.run(["pgrep", "-f", "run/%s/xgeoclaw" % nama], capture_output=True).returncode == 0


def shutil_bebas():
    import shutil
    return shutil.disk_usage(AKAR).free


def bersihkan(nama):
    """Hapus keluaran mentah GeoClaw dan masukan topo besar (disk); sisa: spek, keluaran.json, fgmax.npz, log. Masukan dapat dibangun ulang oleh siapkan()."""
    import shutil
    import tsunami_hitung as H
    d = os.path.join(H.RUN, nama)
    if os.path.exists(os.path.join(d, "keluaran.json")) and os.path.exists(os.path.join(d, "fgmax.npz")):
        shutil.rmtree(os.path.join(d, "_output"), ignore_errors=True)
        shutil.rmtree(d + "_masukan", ignore_errors=True)


def panen(nama):
    """Run yatim (proses induk mati, xgeoclaw selesai): baca _output dan tulis keluaran.json. Waktu dari tabel Total time di run.log (dinding, cpu)."""
    import re
    import tsunami_hitung as H
    d = os.path.join(H.RUN, nama)
    log = open(os.path.join(d, "run.log")).read() if os.path.exists(os.path.join(d, "run.log")) else ""
    m = re.search(r"Total time:\s+([\d.]+)\s+([\d.]+)", log)
    if not m or os.path.exists(os.path.join(d, "keluaran.json")) or not os.path.isdir(os.path.join(d, "_output")):
        return False
    spec = json.load(open(os.path.join(d, "spec.json")))
    out = H._baca(spec, d)
    out.update(cpu_detik=float(m.group(2)), skema=H.SKEMA, mesin=H.VERSI_MESIN, hash_masukan=H.hash_masukan(spec), nama=nama,
               waktu_detik=float(m.group(1)), memori_mb_puncak=None, dipanen_dari_run_yatim=True)
    json.dump(out, open(os.path.join(d, "keluaran.json"), "w"))
    print("dipanen:", nama, json.dumps(out["ringkasan"]), flush=True)
    return True


def antre(kotak, hanya=None):
    _venv()
    import tsunami_hitung as H
    rc = rencana(kotak)
    for nama, e, jenis in daftar_hitungan(kotak):
        if hanya and nama not in hanya:
            continue
        if not os.path.exists(os.path.join(H.RUN, nama, "keluaran.json")) and os.path.exists(os.path.join(H.RUN, nama, "run.log")) and not _berjalan(nama):
            panen(nama)
            bersihkan(nama)
        if _berjalan(nama):
            print("sedang jalan di proses lain:", nama, flush=True)
            continue
        if os.path.exists(os.path.join(H.RUN, nama, "keluaran.json")):
            print("lewati (sudah ada):", nama, flush=True)
            continue
        sisa = shutil_bebas()
        if sisa < 5 * 2 ** 30:
            print("BERHENTI: sisa disk %.1f GiB < 5 GiB" % (sisa / 2 ** 30), flush=True)
            return
        t0 = time.time()
        o = jalankan(nama, kotak, e, rc)
        bersihkan(nama)
        print("selesai %s %s: dinding %.0f s, cpu %.0f s, mem %.0f MB, ringkasan %s" % (nama, jenis, time.time() - t0, o["cpu_detik"], o["memori_mb_puncak"],
                                                                                 json.dumps(o["ringkasan"])), flush=True)


# ---------- rakit: keluaran publik dan kepekaan ----------
def _raster_run(nama):
    import numpy as np
    import tsunami_hitung as H
    d = os.path.join(H.RUN, nama)
    kel, spec = json.load(open(d + "/keluaran.json")), json.load(open(d + "/spec.json"))
    z = np.load(d + "/fgmax.npz")
    F = spec["fgmax"]
    r = K.bangun_raster(z["X"].tolist(), z["Y"].tolist(), z["B"].tolist(), z["h_maks"].tolist(), z["tiba_s"].tolist(), F["dx"], spec["muka_laut"], spec["dry_tol"])
    return r, kel, spec


def _meta_pustaka(kotak, nama, r, kel, spec, rc):
    src = spec["sumber"]
    tstart = spec["fgmax"]["tstart"]
    tiba = r["angka"]["tiba_pertama_s"]
    artefak = tiba is not None and tiba <= tstart + 60
    batas = ("skenario pustaka: megathrust sintetis M %.1f di selatan kotak, slip seragam, BUKAN hitungan gempa yang sedang dilihat; tanpa gesekan; "
             "hanya %d detik pertama (maksimum belum tentu final); tingkat B tetap hipotesis, tidak ada kata teruji" % (src["m"], spec["tfinal"]))
    return {
        "nama": "Megathrust sintetis M %.1f selatan %s" % (src["m"], MED.KOTAK[kotak]["nama"]), "kotak": kotak, "uji_ongkos": False,
        "m": src["m"], "jenis": src["jenis"], "pusat": [src["lat"], src["lon"]], "strike": src["strike"], "dalam_km": src["dalam"],
        "tingkat": "B", "label": {"tingkat": "B", "status": "hipotesis", "catatan_batas": batas},
        "dem": "glo30", "dem_atribusi": MED.LISENSI["glo30"]["atribusi"], "dem_cadangan_dsm": "GLO-30 adalah DSM (atap dan kanopi ikut)",
        "gebco_atribusi": MED.LISENSI["gebco"]["atribusi"],
        "mesin": kel["mesin"], "hash_masukan": kel["hash_masukan"], "manning": spec["manning"],
        "batas_mesin": K.BATAS_MESIN, "tfinal_s": spec["tfinal"], "res_detik": spec.get("res_detik"),
        "ambang_tiba_m": spec["fgmax"].get("arrival_tol", 1e-2), "tstart_fgmax_s": tstart, "tiba_perkiraan_dijkstra_s": rc["tiba_perkiraan_s"],
        "tiba_catatan": ("tiba %.0f s hanya sekitar awal pencatatan (%g s): batas bawah, bukan waktu tiba" % (tiba, tstart)) if artefak else None,
        "sumber": {"rupture": spec.get("sumber_rupture"), "kisi": "ditetapkan sebelum hitung (tsunami_pustaka.KISI), tidak disetel ke kejadian atau data NCEI"},
        "waktu_hitung_s": kel.get("waktu_detik"), "cpu_detik": kel.get("cpu_detik"),
        "runup_hitung": r["runup_hitung"], **r["angka"],
        "animasi": None, "animasi_catatan": "belum dibuat (tanpa fgout); anggaran tertulis di indeks",
    }


def rakit():
    _venv()
    import tsunami_hitung as H
    ada = {}
    for kotak in KISI:
        for nama, e, jenis in daftar_hitungan(kotak):
            if os.path.exists(os.path.join(H.RUN, nama, "fgmax.npz")):
                ada[nama] = (kotak, jenis)
    rcs = {k: rencana(k) for k in KISI}
    ukur = {}
    for nama, (kotak, jenis) in sorted(ada.items()):
        r, kel, spec = _raster_run(nama)
        if jenis == "pustaka":
            ukur[nama] = K.tulis_skenario(PUBLIK, kotak, nama, r, _meta_pustaka(kotak, nama, r, kel, spec, rcs[kotak]), pustaka=True)
    # kepekaan
    kasus, ambang = [], {}
    for kotak in KISI:
        hasil = []
        for c in KEPEKAAN:
            nk = nama_kepekaan(kotak, c["id"])
            if nk not in ada:
                continue
            ek = sumber_kisi(kotak, c["m"], c["geser_strike_km"])
            cand = [(nama_pustaka(kotak, m), m) for m in KISI[kotak]["M"] if nama_pustaka(kotak, m) in ada]
            if not cand:
                continue
            pk = (ek["lat"], ek["lon"])
            terdekat = min(cand, key=lambda a: (round(abs(a[1] - c["m"]), 2), jarak_km(pk, (sumber_kisi(kotak, a[1])["lat"], sumber_kisi(kotak, a[1])["lon"])), -a[1]))
            rk, kk, sk = _raster_run(nk)
            rl, kl, sl = _raster_run(terdekat[0])
            hasil.append(banding(kotak, c, nk, terdekat, rk, rl, sk, sl, pk))
        kasus += hasil
        ambang[kotak] = turunkan(hasil)
    kep = {"dibuat": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "skema": 1, "status": "hipotesis",
           "catatan": "kepekaan tingkat B: skenario terdekat lawan hitungan langsung gempa buatan; bukan uji balik; ambang hanya berlaku pada kasus yang diuji",
           "toleransi": TOLERANSI, "kasus": kasus, "ambang": ambang,
           "aturan_ambang": "per kotak, urut kasus dari yang terkecil; ambang = kasus terbesar yang lolos bersama semua kasus lebih kecil; kasus terkecil gagal atau tak dapat dinilai = tanpa ambang (hanya skenario sama persis); tidak diekstrapolasi di luar yang diuji"}
    b = json.dumps(kep, ensure_ascii=False, indent=1).encode()
    open(os.path.join(PUBLIK, "kepekaan.json"), "wb").write(b)
    n = K.tulis_indeks(PUBLIK)
    print(json.dumps({"skenario": ukur, "kepekaan_b": len(b), "indeks_b": n, "total_pustaka_b": K.ukuran_pustaka(PUBLIK), "ambang": ambang}, indent=1))


def _mask(r):
    return {i for i, v in enumerate(r["d"]) if 1 <= v <= K.K_LEBIH}


def banding(kotak, c, nk, terdekat, rk, rl, sk, sl, pk):
    ak, al = rk["angka"], rl["angka"]
    pl = sumber_kisi(kotak, terdekat[1])
    t_ok = lambda a, s: a["tiba_pertama_s"] is not None and a["tiba_pertama_s"] > s["fgmax"]["tstart"] + 60
    out = {"kotak": kotak, "kasus": nk, "pustaka": terdekat[0], "m_buatan": c["m"], "m_pustaka": terdekat[1],
           "selisih_m": round(abs(c["m"] - terdekat[1]), 2), "jarak_km": round(jarak_km(pk, (pl["lat"], pl["lon"])), 1),
           "langsung": {q: ak[q] for q in ("luas_tergenang_km2", "d_maks_m", "tiba_pertama_s")},
           "skenario_terdekat": {q: al[q] for q in ("luas_tergenang_km2", "d_maks_m", "tiba_pertama_s")}}
    ln = lambda a, b: round(math.log(a / b), 3) if a and b and a > 0 and b > 0 else None
    sel = {"ln_luas": ln(ak["luas_tergenang_km2"], al["luas_tergenang_km2"]), "ln_d_maks": ln(ak["d_maks_m"], al["d_maks_m"]),
           "tiba_menit": round((ak["tiba_pertama_s"] - al["tiba_pertama_s"]) / 60, 1) if t_ok(ak, sk) and t_ok(al, sl) else None}
    mk, ml = _mask(rk), _mask(rl)
    sel["jaccard_tergenang"] = round(len(mk & ml) / len(mk | ml), 3) if (mk | ml) else None  # keterangan saja, bukan kriteria
    out["selisih"] = sel
    cek = [sel["ln_luas"] is not None and abs(sel["ln_luas"]) <= TOLERANSI["ln_luas"], sel["ln_d_maks"] is not None and abs(sel["ln_d_maks"]) <= TOLERANSI["ln_d_maks"],
           sel["tiba_menit"] is not None and abs(sel["tiba_menit"]) <= TOLERANSI["tiba_menit"]]
    out["lolos"] = all(cek)
    out["lolos_tanpa_tiba"] = all(cek[:2])  # keterangan saja (bukan kriteria): tiba sering tak dapat dinilai karena awal pencatatan fgmax
    out["tak_dinilai"] = [q for q in ("ln_luas", "ln_d_maks", "tiba_menit") if sel[q] is None]
    return out


def turunkan(hasil):
    """Ambang per kotak dari kasus terurut (selisih_m, jarak_km) menaik: kasus terbesar yang lolos bersama semua yang lebih kecil."""
    am = None
    for k in sorted(hasil, key=lambda h: (h["selisih_m"], h["jarak_km"])):
        if not k["lolos"]:
            break
        am = {"selisih_m": k["selisih_m"], "jarak_km": k["jarak_km"], "dasar": k["kasus"]}
    return am


# ---------- pemilih ----------
def pilih(e, ind, kep):
    """e = {lat, lon, m, jenis?, dalam?}; ind = indeks.json; kep = kepekaan.json. Mengembalikan daftar (satu per kotak) skenario terdekat dalam ambang
    kotaknya (mekanisme sama, selisih M dan jarak <= ambang), atau [] = 'genangan belum dihitung'. Tidak pernah memaksakan."""
    if not S.layak(e):
        return []
    jenis = S.jenis_dasar(e.get("jenis"))
    hasil = []
    for kotak, p in ind["pantai"].items():
        am = (kep.get("ambang") or {}).get(kotak)
        if not am:
            continue
        cand = []
        for n in p["skenario"]:
            s = ind["skenario"][n]
            if s.get("jenis") != jenis:
                continue
            dm, jr = abs(e["m"] - s["m"]), jarak_km((e["lat"], e["lon"]), tuple(s["pusat"]))
            if dm <= am["selisih_m"] + 1e-9 and jr <= am["jarak_km"] + 1e-9:
                cand.append((round(dm, 2), jr, -s["m"], n))
        if cand:
            dm, jr, _, n = min(cand)
            hasil.append({"kotak": kotak, "skenario": n, "selisih_m": dm, "jarak_km": round(jr, 1)})
    return sorted(hasil, key=lambda h: (h["selisih_m"], h["jarak_km"]))


def uji():
    # kisi sesuai K6 dan rumus letak
    for kotak, k in KISI.items():
        assert k["M"] == [8.0, 8.5, 8.8] and k["lat"] == round(k["palung_lat"] + 0.55, 2) and k["strike"] == 265 and kotak in MED.KOTAK
    assert nama_pustaka("ujung_kulon", 8.8) == "mt_uk_m88" and nama_kepekaan("banyuwangi_rajegwesi", "k1") == "ks_bw_k1"
    # geser sepanjang strike 265 ke barat; jarak mengembalikan angka yang diminta
    e0, e1 = sumber_kisi("pangandaran_cilacap", 8.0), sumber_kisi("pangandaran_cilacap", 8.0, 25.0)
    assert abs(jarak_km((e0["lat"], e0["lon"]), (e1["lat"], e1["lon"])) - 25.0) < 0.2 and e1["lon"] < e0["lon"]
    assert jarak_km((0, 0), (0, 1)) > 111 and jarak_km((5, 5), (5, 5)) == 0
    # domain: kelipatan 0,05, memuat jejak dan kotak, selatan tidak melewati grid ETOPO
    for kotak in KISI:
        d = domain(kotak)
        assert all(abs(round(v / 0.05) * 0.05 - v) < 1e-6 for v in d) and d[2] >= -11.9 and d[0] < MED.KOTAK[kotak]["kotak"][0] and d[3] > MED.KOTAK[kotak]["kotak"][3]
        assert d[2] < KISI[kotak]["lat"] < d[3]
    # waktu: lapis halus mulai sebelum tiba
    assert waktu_hitung("x", 1000) == (660.0, 2200.0) and waktu_hitung("x", 200) == (0.0, 1400.0)
    # tiba perkiraan: masuk akal dan jauh lebih kecil dari tfinal (200 sampai 3000 s untuk tiga kotak)
    G = S.muat_grid(os.path.join(AKAR, "public/gempa/data/"))
    for kotak in KISI:
        t = tiba_perkiraan(kotak, G)
        assert 200 < t < 3000, (kotak, t)
    # ambang diturunkan
    h = [{"kasus": "a", "selisih_m": 0.1, "jarak_km": 25, "lolos": True}, {"kasus": "b", "selisih_m": 0.2, "jarak_km": 75, "lolos": True}]
    assert turunkan(h)["kasus" if False else "dasar"] == "b"
    h[0]["lolos"] = False
    assert turunkan(h) is None  # kasus terkecil gagal: tanpa ambang walau yang lebih besar lolos
    h[0]["lolos"], h[1]["lolos"] = True, False
    assert turunkan(h)["dasar"] == "a" and turunkan([]) is None
    # pemilih pada indeks tulisan tangan
    ind = {"pantai": {"ujung_kulon": {"skenario": ["s80", "s85"]}, "pangandaran_cilacap": {"skenario": []}},
           "skenario": {"s80": {"m": 8.0, "jenis": "subduksi", "pusat": [-9.95, 105.4]}, "s85": {"m": 8.5, "jenis": "subduksi", "pusat": [-9.95, 105.4]}}}
    kep = {"ambang": {"ujung_kulon": {"selisih_m": 0.2, "jarak_km": 75}, "pangandaran_cilacap": {"selisih_m": 0.2, "jarak_km": 75}}}
    g = lambda **kw: dict({"lat": -9.95, "lon": 105.4, "m": 8.1, "jenis": "subduksi", "dalam": 20}, **kw)
    r = pilih(g(), ind, kep)
    assert len(r) == 1 and r[0]["skenario"] == "s80" and r[0]["selisih_m"] == 0.1 and r[0]["jarak_km"] == 0
    assert pilih(g(m=8.35), ind, kep)[0]["skenario"] == "s85"                  # selisih 0,15 lawan 0,35
    kep3 = {"ambang": {"ujung_kulon": {"selisih_m": 0.3, "jarak_km": 75}}}
    assert pilih(g(m=8.25), ind, kep3)[0]["skenario"] == "s85"                 # seri selisih dan jarak: M lebih besar
    assert pilih(g(m=8.25), ind, kep) == []                                    # 0,25 > ambang 0,2
    assert pilih(g(m=8.9), ind, kep) == []                                     # selisih 0,4 > ambang: belum dihitung
    assert pilih(g(lat=-8.0), ind, kep) == []                                  # jarak > 75 km
    assert pilih(g(jenis="geser"), ind, kep) == [] and pilih(g(m=6.0), ind, kep) == []   # mekanisme beda, tidak layak
    assert pilih(g(), ind, {"ambang": {"ujung_kulon": None}}) == [] and pilih(g(), ind, {}) == []   # tanpa ambang: tidak memaksakan
    # banding: lolos, gagal, tak dinilai
    def R(luas, dm, tiba):
        return {"angka": {"luas_tergenang_km2": luas, "d_maks_m": dm, "tiba_pertama_s": tiba}, "d": bytes([1, 0, 255, 3])}
    sp = {"fgmax": {"tstart": 600.0}}
    c = {"id": "k1", "m": 8.1}
    b = banding("ujung_kulon", c, "ks_uk_k1", ("mt_uk_m80", 8.0), R(10.0, 4.0, 1500.0), R(12.0, 3.5, 1400.0), sp, sp, (-9.95, 105.4))
    assert b["lolos"] and b["lolos_tanpa_tiba"] and b["tak_dinilai"] == [] and b["selisih_m"] == 0.1 and b["jarak_km"] == 0
    b = banding("ujung_kulon", c, "ks_uk_k1", ("mt_uk_m80", 8.0), R(30.0, 4.0, 1500.0), R(12.0, 3.5, 1400.0), sp, sp, (-9.95, 105.4))
    assert not b["lolos"] and b["selisih"]["ln_luas"] > TOLERANSI["ln_luas"]
    b = banding("ujung_kulon", c, "ks_uk_k1", ("mt_uk_m80", 8.0), R(10.0, 4.0, 620.0), R(12.0, 3.5, 1400.0), sp, sp, (-9.95, 105.4))
    assert not b["lolos"] and b["tak_dinilai"] == ["tiba_menit"]              # tiba sekitar tstart = artefak, tak dinilai bukan lolos
    b = banding("ujung_kulon", c, "ks_uk_k1", ("mt_uk_m80", 8.0), R(None, None, None), R(12.0, 3.5, 1400.0), sp, sp, (-9.95, 105.4))
    assert not b["lolos"] and len(b["tak_dinilai"]) == 3                       # tak ada genangan: tak dapat dinilai, bukan nol
    print("uji tsunami_pustaka: kisi, domain, tiba perkiraan, ambang, pemilih, banding hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "uji":
        uji()
    elif a[0] == "kisi":
        G = S.muat_grid(os.path.join(AKAR, "public/gempa/data/"))
        for kotak in KISI:
            print(json.dumps({**rencana(kotak, G), "pusat": [KISI[kotak]["lat"], KISI[kotak]["lon"]], "strike": KISI[kotak]["strike"],
                              "hitungan": [h[0] for h in daftar_hitungan(kotak)]}))
    elif a[0] == "antre":
        antre(a[1], set(a[2:]) or None)
    elif a[0] == "rakit":
        rakit()
    elif a[0] == "pilih":
        ind = json.load(open(os.path.join(PUBLIK, "indeks.json")))
        kep = json.load(open(os.path.join(PUBLIK, "kepekaan.json")))
        print(json.dumps(pilih({"lat": float(a[1]), "lon": float(a[2]), "m": float(a[3]), "jenis": "subduksi", "dalam": 20}, ind, kep), indent=1))
    else:
        print(__doc__)
