"""Panen #23: tsunameter DART (NOAA NDBC) -> residu tinggi kolom air sesudah pasut dibuang, ambang deteksi, banding dengan tsunami.js.

Sumber : https://www.ndbc.noaa.gov/data/realtime2/<id>.dart  (~45 hari terakhir, 15 menit)
         https://www.ndbc.noaa.gov/data/historical/dart/<id>t<tahun>.txt.gz  (arsip tahunan; 2026 belum ada, ada celah sampai realtime)
         Data NOAA/NDBC domain publik; atribusi NOAA National Data Buoy Center.
Pelampung: 56001 (14,05 LS 110,03 BT, selatan Jawa), 23401 / 23218 / 23227 (Teluk Benggala, 88,5 BT), 52405 (13 LU 132,2 BT, Laut Filipina).
Pengolahan (per balok 30 hari): tinggi = polinomial kuadrat + 7 konstituen pasut (M2 S2 N2 K2 K1 O1 P1) dengan kuadrat terkecil;
  sinyal s = residu - median bergulir +-3 jam (menghilangkan sisa pasut/cuaca yang lambat; tsunami 5-60 menit lolos, tapi sampel 15 menit
  hanya mengikat gelombang periode >= 30 menit: tsunameter DART mengirim 15 detik hanya dalam mode kejadian, tidak ada di arsip 15 menit).
  QC: lonjakan satu-sampel (|x - median 5 sampel| > 6 MAD, tetangga tenang) dibuang; nilai 9999 dan sampel di luar menit 15 dibuang.
Ambang : per pelampung, kuantil sehingga <= 1% jendela 8 jam (tak tumpang tindih) di seluruh arsip melampaui max|s|. Seluruh jendela dipakai
  (termasuk gelombang jauh dan gempa), jadi "alarm palsu" di sini = apa pun yang melampaui ambang, sengaja konservatif.
Banding: tsunami.js (node, TIDAK diubah) pada grid ETOPO 2022 yang diperlebar (80-142 BT, 16 LS-16 LU, 0,1 derajat; grid layar tidak memuat satu pun
  pelampung) -> menit tiba mentah ke sel pelampung untuk gempa USGS M>=6,5 sejak 2006 + dua gempa Samudra Hindia 11 Apr 2012 (M8,6 dan M8,2; di luar
  kotak katalog riwayat). Amatan: max|s| pada [tiba-60, tiba+240] menit dibanding ambang. Jumlah deteksi sedikit: kesimpulan statistik tak mungkin.
BUKAN peringatan. Status tsunami resmi hanya BMKG / PTWC.

Pakai  : python3 scripts/gempa/dart.py realtime   # harian, ringan: ~45 hari terakhir -> bagian "realtime" di dart.json
         python3 scripts/gempa/dart.py hitung     # berat, hanya di lab: arsip penuh + ambang + banding tsunami.js (~10-20 menit)
         python3 scripts/gempa/dart.py uji
"""
import array, bisect, datetime as dt, gzip, json, math, os, statistics, subprocess, sys, tempfile
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import umum
from gnss import selesaikan

NDBC = "https://www.ndbc.noaa.gov/data/"
CACHE = os.path.join(umum.AKAR, "data/raw/gempa/dart")
KELUAR = os.path.join(umum.KELUAR, "dart.json")
PELAMPUNG = {"56001": (-14.046, 110.028, "Selatan Jawa"), "23401": (8.860, 88.550, "Teluk Benggala"),
             "23218": (10.165, 88.500, "Teluk Benggala"), "23227": (6.265, 88.653, "Teluk Benggala"),
             "52405": (12.992, 132.232, "Laut Filipina")}
KONSTITUEN = {"M2": 12.4206012, "S2": 12.0, "N2": 12.65834751, "K2": 11.96723606, "K1": 23.93447213, "O1": 25.81933871, "P1": 24.06588766}
BALOK_HARI, MEDIAN_JAM, JENDELA_JAM, FA = 30, 3.0, 8, 0.01
GEMPA_TAMBAHAN = [  # di luar kotak katalog riwayat (lon < 94); USGS ComCat
    ("2012-04-11T08:38", 2.311, 93.063, 20.0, 8.6), ("2012-04-11T10:43", 0.773, 92.452, 25.0, 8.2)]
WAKTU_MENIT = 15
LOMPAT_M, SIGMA_MAKS_M = 1.5, 0.15  # lompatan antar-sampel / simpangan residu-pasut balok yang dipercaya (normal ~0,03 m; sensor rusak puluhan cm-meter)


# --- baca data --------------------------------------------------------------------------------------------------------------------
def parse(teks):
    """Baris NDBC -> daftar (epoch_detik, tinggi_m) pada menit kelipatan 15 detik 0; 9999 dibuang; urut naik; duplikat dibuang."""
    out = {}
    for b in teks.splitlines():
        if not b or b[0] == "#":
            continue
        p = b.split()
        if len(p) < 8:
            continue
        try:
            y, mo, d, h, mi, s = (int(x) for x in p[:6])
            v = float(p[7])
        except ValueError:
            continue
        if s != 0 or mi % WAKTU_MENIT or v > 9000 or v < 0:
            continue
        out[int(dt.datetime(y, mo, d, h, mi, tzinfo=timezone.utc).timestamp())] = v
    return sorted(out.items())


def unduh(url, jalur, segar_jam=None):
    if os.path.exists(jalur) and (segar_jam is None or (datetime.now().timestamp() - os.path.getmtime(jalur)) < segar_jam * 3600):
        return open(jalur, "rb").read()
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    b = umum.ambil(url, mentah=True)
    open(jalur, "wb").write(b)
    return b


def tahun_tersedia():
    import re
    h = umum.ambil(NDBC + "historical/dart/", mentah=True).decode()
    d = {}
    for sid, th in re.findall(r'href="(\d{5})t(\d{4})\.txt\.gz"', h):
        d.setdefault(sid, []).append(int(th))
    return d


def muat_historis(sid, tahun):
    return parse(gzip.decompress(unduh(f"{NDBC}historical/dart/{sid}t{tahun}.txt.gz", os.path.join(CACHE, f"{sid}t{tahun}.txt.gz"))).decode())


def muat_realtime(sid):
    try:
        return parse(unduh(f"{NDBC}realtime2/{sid}.dart", os.path.join(CACHE, f"{sid}.dart"), segar_jam=1).decode())
    except RuntimeError as e:
        if "HTTP 404" in str(e):  # pelampung sudah tak mengirim (mis. 23227)
            return []
        raise


# --- pasut & sinyal -----------------------------------------------------------------------------------------------------------------
def kolom(t_jam, t0_jam):
    tau = (t_jam - t0_jam) / (24 * BALOK_HARI / 2)  # skala ~[-1,1]
    r = [1.0, tau, tau * tau]
    for per in KONSTITUEN.values():
        w = 2 * math.pi * t_jam / per
        r += [math.sin(w), math.cos(w)]
    return r


def detide_balok(t_jam, y):
    """-> residu per sampel setelah pasut+kuadrat dibuang (kuadrat terkecil, persamaan normal)."""
    t0 = (t_jam[0] + t_jam[-1]) / 2
    X = [kolom(t, t0) for t in t_jam]
    k = len(X[0])
    A = [[0.0] * k for _ in range(k)]
    b = [0.0] * k
    for r, v in zip(X, y):
        for i in range(k):
            ri = r[i]
            b[i] += ri * v
            Ai = A[i]
            for j in range(i, k):
                Ai[j] += ri * r[j]
    for i in range(k):
        for j in range(i):
            A[i][j] = A[j][i]
        A[i][i] += 1e-9
    x = selesaikan(A, b)[0]
    return [v - sum(a * c for a, c in zip(r, x)) for r, v in zip(X, y)]


def buang_lonjakan(res):
    """Ganti lonjakan satu-sampel dengan None. res = daftar float berurutan (sampel berdampingan)."""
    n = len(res)
    med = [statistics.median(res[max(0, i - 2):i + 3]) for i in range(n)]
    dev = [abs(r - m) for r, m in zip(res, med)]
    mad = 1.4826 * statistics.median(dev) or 1e-6
    out = list(res)
    for i in range(n):
        if dev[i] > 6 * mad:
            tetangga = [dev[j] for j in (i - 1, i + 1) if 0 <= j < n]
            if all(d < 0.4 * dev[i] for d in tetangga):
                out[i] = None
    return out


def median_bergulir(t, v, jam=MEDIAN_JAM):
    """median v dalam +-jam jam di sekitar tiap t (t detik, urut); v boleh None."""
    out = []
    lebar = jam * 3600
    a = b = 0
    n = len(t)
    for i in range(n):
        while t[a] < t[i] - lebar:
            a += 1
        while b < n and t[b] <= t[i] + lebar:
            b += 1
        w = [x for x in v[a:b] if x is not None]
        out.append(statistics.median(w) if len(w) >= 8 else None)
    return out


def sinyal(seri):
    """seri = [(epoch, tinggi)] -> [(epoch, s)] dengan s = residu pasut - median +-3 jam; lonjakan dan balok tak cukup data dibuang."""
    hasil = []
    if not seri:
        return hasil
    # 1. potong di celah > 6 jam dan lompatan > 1,5 m antar-sampel (penggantian pelampung / penurunan ke dasar); tiap lari dipecah balok 30 hari
    lari, cur = [], [seri[0]]
    for a, b in zip(seri, seri[1:]):
        if b[0] - a[0] > 6 * 3600 or abs(b[1] - a[1]) > LOMPAT_M:
            lari.append(cur)
            cur = []
        cur.append(b)
    lari.append(cur)
    n_blok = BALOK_HARI * 96
    for r in lari:
        k = max(1, len(r) // n_blok)
        for i in range(k):  # k balok sama panjang, sisa ikut balok terakhir
            s = r[i * n_blok:(i + 1) * n_blok] if i < k - 1 else r[i * n_blok:]
            if len(s) < 2 * 96:
                continue
            tj = [t / 3600 for t, _ in s]
            res = detide_balok(tj, [v for _, v in s])
            if 1.4826 * statistics.median(abs(x - statistics.median(res)) for x in res) > SIGMA_MAKS_M:  # sensor rusak / berisik
                continue
            hasil += list(zip([t for t, _ in s], res))
    if not hasil:
        return []
    t = [a for a, _ in hasil]
    res = buang_lonjakan([r for _, r in hasil])
    m = median_bergulir(t, res)
    return [(ti, r - mm) for ti, r, mm in zip(t, res, m) if r is not None and mm is not None]


def ambang(sig, fa=FA, jam=JENDELA_JAM):
    """Kuantil (1-fa) dari max|s| jendela `jam` jam tak tumpang tindih; tak lebih dari fa jendela yang melampauinya."""
    if not sig:
        return None
    w = {}
    for t, s in sig:
        k = t // (jam * 3600)
        w[k] = max(w.get(k, 0.0), abs(s))
    mx = sorted(w.values())
    idx = min(len(mx) - 1, max(0, math.ceil(len(mx) * (1 - fa)) - 1))
    return {"ambang_m": mx[idx], "jendela": len(mx), "melampaui": sum(1 for v in mx if v > mx[idx]),
            "median_m": statistics.median(mx), "sigma_s_m": 1.4826 * statistics.median(abs(s) for _, s in sig)}


# --- banding dengan tsunami.js --------------------------------------------------------------------------------------------------------
LAT0W, LON0W, DW = -16.0, 80.0, 0.1
NYW, NXW = 321, 621
JS = r"""
const fs = require("fs"), vm = require("vm");
vm.runInThisContext(fs.readFileSync(process.argv[1], "utf8"));
const T = globalThis.Tsunami, j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const b = fs.readFileSync(j.grid), G = T.dariBuffer(j.meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
const out = j.kejadian.map(e => {
  const o = {id: e.id, layak: false, tiba: {}};
  try {
    const q = {lat: e.lat, lon: e.lon, m: e.m, dalam: e.dalam, jenis: e.jenis};
    o.layak = T.layak(q, G);
    if (o.layak) { const w = T.waktuTiba(G, e.lat, e.lon, e.m, {dalam: e.dalam, jenis: e.jenis, maksMenit: 900, kalibrasi: false});
      if (w) for (const [id, p] of Object.entries(j.pelampung)) { const k = T.sel(G, p[0], p[1]); const v = k < 0 ? null : w.menit[k];
        o.tiba[id] = v != null && isFinite(v) && v > 0 && v < 900 ? Math.round(v * 10) / 10 : null; } }
  } catch (x) { o.galat = String(x); }
  return o; });
process.stdout.write(JSON.stringify(out));
"""


def grid_lebar():
    """Grid ETOPO 2022 lebar (0,1 derajat) di cache; kembalikan jalur .bin dan meta."""
    bin_, meta = os.path.join(CACHE, "grid_lebar.bin"), os.path.join(CACHE, "grid_lebar.json")
    if not os.path.exists(bin_):
        os.makedirs(CACHE, exist_ok=True)
        z = array.array("h", [0]) * (NXW * NYW)
        erd = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.csv"
        sel_ = 1 / 240
        la0 = -90 + (round((LAT0W + 90) / sel_ - 0.5) + 0.5) * sel_
        lo0 = -180 + (round((LON0W + 180) / sel_ - 0.5) + 0.5) * sel_
        for j0 in range(0, NYW, 40):
            j1 = min(NYW, j0 + 40) - 1
            url = (f"{erd}?z%5B({la0 + j0 * DW:.9f}):24:({la0 + j1 * DW:.9f})%5D%5B({lo0:.9f}):24:({lo0 + (NXW - 1) * DW:.9f})%5D")
            for s in umum.ambil(url, batas_waktu=300, mentah=True).decode().splitlines()[2:]:
                la, lo, v = s.split(",")
                jj, ii = round((float(la) - la0) / DW), round((float(lo) - lo0) / DW)
                z[jj * NXW + ii] = max(-32768, min(32767, round(float(v)))) if v != "NaN" else 0
        if sys.byteorder != "little":
            z.byteswap()
        z.tofile(open(bin_ + ".tmp", "wb"))
        os.replace(bin_ + ".tmp", bin_)
        json.dump({"lon0": lo0, "lat0": la0, "d": DW, "nx": NXW, "ny": NYW}, open(meta, "w"))
    return bin_, json.load(open(meta))


def tiba_js(kejadian, grid=None, meta=None):
    """kejadian = [{id,lat,lon,m,dalam,jenis}] -> [{id,layak,tiba{pelampung:menit mentah}}] lewat node + public/gempa/tsunami.js."""
    if grid is None:
        grid, meta = grid_lebar()
    with tempfile.TemporaryDirectory() as d:
        masuk = os.path.join(d, "in.json")
        json.dump({"grid": grid, "meta": meta, "pelampung": {k: v[:2] for k, v in PELAMPUNG.items()}, "kejadian": kejadian}, open(masuk, "w"))
        r = subprocess.run(["node", "-e", JS, os.path.join(umum.AKAR, "public/gempa/tsunami.js"), masuk], capture_output=True, text=True, timeout=1800)
    if r.returncode:
        raise RuntimeError("node: " + r.stderr[:500])
    return json.loads(r.stdout)


def daftar_gempa():
    import guncangan
    b = json.load(open(os.path.join(umum.KELUAR, "riwayat_m5.json")))["baris"]
    out = []
    for w, la, lo, d, m, _ in b:
        if w >= "2006-01-01" and m >= 6.5 and d < 100:
            jn = "kerak" if d < 20 and m < 7 else "subduksi"  # tebakan kasar; waktu tiba nyaris tak peka jenis, tinggi tak dipakai
            out.append({"id": w, "lat": la, "lon": lo, "m": m, "dalam": d, "jenis": jn})
    for w, la, lo, d, m in GEMPA_TAMBAHAN:
        out.append({"id": w, "lat": la, "lon": lo, "m": m, "dalam": d, "jenis": "subduksi"})
    return out


def amat(sig_t, sig_s, t0, tiba_menit, thr):
    """Maksimum |s| pada [tiba-60, tiba+240] menit sesudah t0 dan kelengkapannya; deteksi bila > thr."""
    a, b = t0 + (tiba_menit - 60) * 60, t0 + (tiba_menit + 240) * 60
    i, j = bisect.bisect_left(sig_t, a), bisect.bisect_right(sig_t, b)
    n = j - i
    lengkap = n / (300 / WAKTU_MENIT)
    if lengkap < 0.6:
        return {"ada_data": False, "kelengkapan": round(lengkap, 2)}
    k = max(range(i, j), key=lambda x: abs(sig_s[x]))
    return {"ada_data": True, "kelengkapan": round(min(1, lengkap), 2), "maks_m": round(abs(sig_s[k]), 4),
            "menit_maks": round((sig_t[k] - t0) / 60, 1), "terdeteksi": abs(sig_s[k]) > thr}


# --- perintah -------------------------------------------------------------------------------------------------------------------------
def sinyal_penuh(sid, tahun_ada):
    seri = []
    for th in sorted(tahun_ada.get(sid, [])):
        seri += muat_historis(sid, th)
    seri += [x for x in muat_realtime(sid) if not seri or x[0] > seri[-1][0]]
    seri.sort()
    sig, tmp = [], []
    # tahun per tahun supaya balok tidak melintasi celah panjang; sinyal() sendiri membagi balok 30 hari
    awal, akhir = seri[0][0], seri[-1][0]
    ts = [t for t, _ in seri]
    batas = awal
    while batas <= akhir:
        i, j = bisect.bisect_left(ts, batas), bisect.bisect_left(ts, batas + 365 * 86400)
        sig += sinyal(seri[i:j])
        batas += 365 * 86400
    return seri, sig


def hitung():
    ada = tahun_tersedia()
    sinyal_p, hasil = {}, {"pelampung": {}}
    for sid in PELAMPUNG:
        cj = os.path.join(CACHE, f"sinyal_{sid}.json")  # hasil berat disimpan; hapus berkasnya untuk menghitung ulang
        if os.path.exists(cj):
            c = json.load(open(cj))
            seri, sig = [tuple(x) for x in c["seri_ujung"]], [tuple(x) for x in c["sig"]]
            seri_n = c["n"]
        else:
            seri, sig = sinyal_penuh(sid, ada)
            seri_n = len(seri)
            json.dump({"seri_ujung": [seri[0], seri[-1]], "n": seri_n, "sig": sig}, open(cj, "w"))
        sinyal_p[sid] = ([t for t, _ in sig], [s for _, s in sig])
        a = ambang(sig)
        print(sid, seri_n, "sampel", len(sig), "sinyal", a, flush=True)
        hasil["pelampung"][sid] = {"lat": PELAMPUNG[sid][0], "lon": PELAMPUNG[sid][1], "nama": PELAMPUNG[sid][2],
                                   "rentang": [datetime.fromtimestamp(seri[0][0], timezone.utc).strftime("%Y-%m-%d"),
                                               datetime.fromtimestamp(seri[-1][0], timezone.utc).strftime("%Y-%m-%d")],
                                   "sampel": seri_n, "tahun_arsip": sorted(ada.get(sid, [])), **{k: round(v, 5) if isinstance(v, float) else v for k, v in a.items()}}
    gempa = daftar_gempa()
    js = tiba_js(gempa)
    banding = []
    for e, r in zip(gempa, js):
        if not r["layak"]:
            continue
        t0 = datetime.fromisoformat(e["id"]).replace(tzinfo=timezone.utc).timestamp()
        for sid, menit in r["tiba"].items():
            if menit is None or menit > 720:
                continue
            thr = hasil["pelampung"][sid]["ambang_m"]
            o = amat(*sinyal_p[sid], t0, menit, thr)
            if not o["ada_data"] and o["kelengkapan"] == 0:
                continue
            banding.append({"gempa": e["id"], "m": e["m"], "lat": e["lat"], "lon": e["lon"], "pelampung": sid, "tiba_js_menit": menit, **o})
    det = [b for b in banding if b.get("terdeteksi")]
    for b in det:  # selisih waktu: menit maks teramati vs prediksi js
        b["selisih_menit"] = round(b["menit_maks"] - b["tiba_js_menit"], 1)
    sekarang = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    lama = {}
    if os.path.exists(KELUAR):
        lama = json.load(open(KELUAR))
    hasil.update({"versi": 1, "dibuat": sekarang, "jenis": "dart_residu_ambang", "sumber": "NOAA NDBC DART (domain publik)",
                  "metode": "pasut 7 konstituen + kuadrat per balok 30 hari; s = residu - median +-3 jam; ambang = kuantil 99% max|s| jendela 8 jam",
                  "banding_tsunami_js": {"grid": "ETOPO 2022 0,1 derajat 80-142 BT, 16 LS-16 LU (diperlebar; grid layar tak memuat pelampung)",
                                         "menit_mentah": "tsunami.js waktuTiba kalibrasi:false (tanpa faktor tampilan 0,85)",
                                         "pasangan_dengan_data": len([b for b in banding if b["ada_data"]]), "terdeteksi": len(det),
                                         "gempa_layak": len([1 for r in js if r["layak"]]), "tabel": banding},
                  "catatan": "Deteksi sangat sedikit (gempa tsunamigenik besar dengan pelampung dalam jangkauan jarang sejak 2006): TIDAK cukup untuk menilai "
                             "akurasi waktu tiba atau menyetel ambang peringatan. Arsip 15 menit membatasi gelombang periode < 30 menit. Ambang menghitung "
                             "semua kejadian (gelombang jauh, badai) sebagai 'alarm palsu', jadi konservatif. Bukan peringatan dini; status resmi BMKG/PTWC.",
                  "realtime": lama.get("realtime")})
    umum.simpan(KELUAR, hasil)
    print(json.dumps({"deteksi": len(det), "pasangan": hasil["banding_tsunami_js"]["pasangan_dengan_data"], "det": det}, ensure_ascii=False, indent=1))


def realtime():
    if not os.path.exists(KELUAR):
        sys.exit("dart.json belum ada: jalankan `hitung` sekali di lab (ambang diperlukan)")
    d = json.load(open(KELUAR))
    out = {}
    for sid in PELAMPUNG:
        try:
            seri = muat_realtime(sid)
            sig = sinyal(seri)
        except Exception as e:
            out[sid] = {"status": "galat", "pesan": str(e)[:120]}
            continue
        if not sig:
            out[sid] = {"status": "tanpa_data"}
            continue
        thr = d["pelampung"][sid]["ambang_m"]
        t_akhir = seri[-1][0]
        def mx(jam):
            w = [abs(s) for t, s in sig if t >= t_akhir - jam * 3600]
            return round(max(w), 4) if w else None
        umur = (datetime.now(timezone.utc).timestamp() - t_akhir) / 3600
        m8 = mx(8)
        out[sid] = {"data_terakhir": datetime.fromtimestamp(t_akhir, timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "umur_jam": round(umur, 1),
                    "maks_8jam_m": m8, "maks_24jam_m": mx(24), "ambang_m": thr,
                    "status": "basi" if umur > 6 else ("melampaui_ambang" if m8 is not None and m8 > thr else "tenang"),
                    "sampel_8jam": sum(1 for t, _ in sig if t >= t_akhir - 8 * 3600)}
    d["realtime"] = {"diperbarui": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "pelampung": out,
                     "catatan": "Penanda statistik, BUKAN peringatan tsunami. Status resmi: BMKG / PTWC. 'basi' = data terakhir > 6 jam."}
    umum.simpan(KELUAR, d)
    print(json.dumps(d["realtime"], ensure_ascii=False))


def uji():
    import random
    rnd = random.Random(5)
    # 1. parse: menit non-15, detik, 9999 dibuang; duplikat; urut
    t = "#h\n#u\n2026 10 29 12 15 00 1 5082.5\n2026 10 29 12 00 00 1 5082.0\n2026 10 29 12 07 00 1 1.0\n2026 10 29 12 30 00 1 9999.000\n2026 10 29 12 00 00 1 5082.0\n"
    p = parse(t)
    assert [round(v, 1) for _, v in p] == [5082.0, 5082.5], p
    # 2. pasut + kuadrat terbuang; tsunami buatan 0,05 m periode 40 menit selama 3 jam tersisa
    n = 31 * 96
    ts = [1_700_000_000 + i * 900 for i in range(n)]
    def pasut(tt):
        return sum(a * math.sin(2 * math.pi * tt / 3600 / per + ph) for (per, a, ph) in
                   ((12.4206012, .5, .3), (12.0, .2, 1.0), (23.93447213, .15, .2), (25.81933871, .1, 2.0)))
    base = [5000 + pasut(tt) + 1e-6 * (tt - ts[0]) / 900 + rnd.gauss(0, .002) for tt in ts]
    k0 = 20 * 96
    tsu = [0.05 * math.sin(2 * math.pi * (tt - ts[k0]) / 2400) * math.exp(-(tt - ts[k0]) / 5400) if 0 <= tt - ts[k0] < 10800 else 0 for tt in ts]
    sig = dict(sinyal([(tt, b + w) for tt, b, w in zip(ts, base, tsu)]))
    tenang = [abs(s) for tt, s in sig.items() if not (ts[k0] - 7200 <= tt <= ts[k0] + 20000)]
    assert max(tenang) < 0.02, max(tenang)  # pasut 0,5 m terbuang jadi < 2 cm
    puncak = max(abs(sig[tt]) for tt in ts[k0:k0 + 12] if tt in sig)
    assert puncak > 0.02, puncak  # tsunami 5 cm tersisa (median menyerap sebagian)
    # 3. lonjakan satu-sampel dibuang, gelombang berdurasi panjang tidak
    r = [rnd.gauss(0, .002) for _ in range(200)]
    r[50] += 1.0
    for i in range(100, 108):
        r[i] += .05
    q = buang_lonjakan(r)
    assert q[50] is None and all(q[i] is not None for i in range(100, 108)), (q[50], q[100:108])
    # 4. ambang: <= 1% jendela melampauinya
    sg = [(i * 900, rnd.gauss(0, .01)) for i in range(96 * 400)]
    a = ambang(sg)
    assert a["melampaui"] / a["jendela"] <= FA + 1e-9, a
    # 5. amat: deteksi saat > ambang; data tak cukup -> ada_data False
    tt = list(range(0, 5 * 3600, 900))
    ss = [0.0] * len(tt)
    ss[8] = 0.3
    assert amat(tt, ss, 0, 60, 0.1)["terdeteksi"] and not amat(tt, ss, 0, 60, 0.5)["terdeteksi"]
    assert not amat(tt, ss, 0, 600, 0.1)["ada_data"]
    # 6. tsunami.js (node, tak diubah) pada laut datar 4000 m: waktu tiba ~ jarak / sqrt(g h)
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
        with tempfile.TemporaryDirectory() as d:
            nx = ny = 400
            z = array.array("h", [-4000]) * (nx * ny)
            g = os.path.join(d, "g.bin")
            z.tofile(open(g, "wb"))
            meta = {"lon0": 100.0, "lat0": -5.0, "d": 0.05, "nx": nx, "ny": ny}
            lat_p, lon_p = -5 + 0.05 * 200, 100 + 0.05 * 340
            global PELAMPUNG
            simpan = PELAMPUNG
            PELAMPUNG = {"X": (lat_p, lon_p, "uji")}
            try:
                js = tiba_js([{"id": "u", "lat": -5 + 0.05 * 200, "lon": 100 + 0.05 * 200, "m": 7.5, "dalam": 15, "jenis": "subduksi"}], g, meta)
            finally:
                PELAMPUNG = simpan
        km = umum.jarak_km(-5 + 0.05 * 200, 100 + 0.05 * 200, lat_p, lon_p)
        harap = km * 1000 / math.sqrt(9.81 * 4000) / 60
        got = js[0]["tiba"]["X"]
        assert js[0]["layak"] and got and abs(got - harap) / harap < 0.12, (got, harap)
    except FileNotFoundError:
        print("node tidak ada: butir 6 dilewati")
    print("dart uji: OK")


if __name__ == "__main__":
    {"realtime": realtime, "hitung": hitung, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "uji", uji)()
