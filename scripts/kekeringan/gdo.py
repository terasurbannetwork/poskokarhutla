"""Copernicus Global Drought Observatory (GDO) -> public/kekeringan/data/gdo.json

Panen #25. Dua penanda GDO untuk Indonesia, lewat WMS GetMap (peta berpalet; WCS GetCoverage hanya mengembalikan kode kelas 8-bit tanpa
legenda yang jelas, jadi tidak dipakai):
  spaST  SPI-3 ERA5 (kelas: <= -1 sedang, <= -1,5 parah, <= -2 ekstrem kering), 0,25 derajat
  smang  anomali kelembapan tanah GloFAS global (kelas kering sama), 0,25 derajat
CDI (cdiad) hanya mencakup Eropa (BBOX -25,10,45,80), tidak ada untuk Indonesia: dibuang, bukan ditampilkan kosong.
Syarat pakai (drought.emergency.copernicus.eu/terms&conditions): akses gratis dan terbuka; Capabilities: "no fees, no constraints". Atribusi dicantumkan.

Rumus (semua stdlib):
  piksel kec   = piksel 0,25 derajat di titik tengah kecamatan (pusat_kec.json)
  tingkat kab  = tingkat tertinggi L yang dialami >= 30% penduduk (status.lv_wilayah, aturan SAMA dengan status kita)
  kappa Cohen  = (po - pe) / (1 - pe); pe dari marginal matriks kebingungan
  uji kejadian = label DIBI kering per kabupaten-bulan (ujibalik.kejadian_per_kab), pembagian waktu: PILIH aturan di Okt 2023-Des 2024,
                 UJI sekali di Jan 2025-akhir; pembanding naif: alarm acak berlaju sama dan persistensi (ada kejadian bulan lalu);
                 selang: bootstrap blok-bulan atas selisih CSI terhadap aturan kita sendiri.
Konvensi stempel TIME (bulan M = SPI-3 berakhir M) dipilih dari 2 kandidat (tanggal 1 bulan M atau bulan M+1) lewat kappa dengan SPI kita di
periode LATIH saja; itu metadata sumber, bukan penyetelan terhadap label DIBI.

Keluaran bergulir tetap: public/kekeringan/data/gdo.json (1 berkas). Cache mentah data/raw/gdo/cache.json (gitignore). Jeda 1,2 detik per permintaan.
Rantai yang diusulkan: akhir `python3 scripts/kekeringan/status.py` di data.yml harian (bagian kini murah: 2 peta; uji balik 70 peta hanya bila berkas >30 hari).

Pakai:  python3 scripts/kekeringan/gdo.py   |   python3 scripts/kekeringan/gdo.py uji
"""
import datetime as dt, json, os, random, struct, sys, time, urllib.request, zlib

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan
import hth as H
import spi as SPI
import ujibalik as UB

AKAR = H.AKAR
KELUAR = os.path.join(AKAR, "public/kekeringan/data/gdo.json")
CACHE = os.path.join(AKAR, "data/raw/gdo/cache.json")
URL = ("https://drought.emergency.copernicus.eu/api/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS={l}&SRS=EPSG:4326"
       "&BBOX=94,-11.5,142,6.5&WIDTH=192&HEIGHT=72&STYLE=&FORMAT=image/png&TIME={t}{ts}")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
W, HT, SEL = 192, 72, .25
WARNA = {"spaST": {(255, 255, 0): 1, (255, 170, 0): 2, (255, 0, 0): 3},       # legenda GDO SPI: kuning/jingga/merah
         "smang": {(254, 224, 182): 1, (241, 163, 64): 2, (179, 88, 6): 3}}   # legenda GDO anomali tanah: krem/jingga/cokelat
TS = {"spaST": "&SELECTED_TIMESCALE=03", "smang": ""}
LATIH = ("2023-10", "2024-12")
UJI = ("2025-01", "2099-12")
ATRIBUSI = "Copernicus Emergency Management Service, Global Drought Observatory (JRC): SPI ERA5 dan anomali kelembapan tanah GloFAS. Akses gratis dan terbuka."
LISENSI = "Syarat pakai GDO: drought.emergency.copernicus.eu/terms&conditions (gratis, terbuka; Capabilities: no fees, no constraints)"


# ---------- PNG berpalet -> tingkat 0..3 ----------

def png_tingkat(data, warna):
    """PNG berpalet (bit 1/2/4/8, tanpa interlace) -> [W*H] tingkat 0..3 lewat peta warna palet; warna lain (normal, basah, tanpa data) = 0."""
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "bukan PNG"
    i, idat, plte = 8, b"", []
    while i < len(data):
        n, t = struct.unpack(">I4s", data[i:i + 8])
        b = data[i + 8:i + 8 + n]
        i += 12 + n
        if t == b"IHDR":
            w, h, bd, ct, _, _, il = struct.unpack(">IIBBBBB", b[:13])
            if ct != 3 or il:
                raise ValueError("PNG bukan palet tanpa interlace")
        elif t == b"PLTE":
            plte = [tuple(b[k:k + 3]) for k in range(0, len(b), 3)]
        elif t == b"IDAT":
            idat += b
    raw = zlib.decompress(idat)
    st = (w * bd + 7) // 8
    peta = [warna.get(c, 0) for c in plte]
    out, prev = [], bytearray(st)
    for r in range(h):
        f, line = raw[r * (st + 1)], bytearray(raw[r * (st + 1) + 1:(r + 1) * (st + 1)])
        for k in range(st):
            a, b, c = (line[k - 1] if k else 0), prev[k], (prev[k - 1] if k else 0)
            if f == 1:
                line[k] = (line[k] + a) & 255
            elif f == 2:
                line[k] = (line[k] + b) & 255
            elif f == 3:
                line[k] = (line[k] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[k] = (line[k] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        prev = line
        for x in range(w):
            idx = (line[x * bd // 8] >> (8 - bd - (x * bd) % 8)) & ((1 << bd) - 1)
            out.append(peta[idx] if idx < len(peta) else 0)
    return w, h, out


def ambil_peta(layer, tgl, cache):
    """Tingkat 0..3 (string W*H digit) untuk layer di tanggal TIME tgl; cache mentah per (layer, tgl). Jeda sopan 1,2 detik."""
    k = f"{layer}|{tgl}"
    if k in cache:
        return cache[k]
    req = urllib.request.Request(URL.format(l=layer, t=tgl, ts=TS[layer]), headers={"User-Agent": UA})
    for coba in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                d = r.read()
            w, h, lv = png_tingkat(d, WARNA[layer])
            if (w, h) != (W, HT):
                raise ValueError(f"ukuran {w}x{h}")
            cache[k] = "".join(map(str, lv))
            time.sleep(1.2)
            return cache[k]
        except Exception as e:
            print(f"  GDO {k} coba {coba + 1}: {e}", file=sys.stderr)
            time.sleep(3 * (coba + 1))
    cache[k] = None
    return None


# ---------- agregasi ----------

def kec_daftar(penduduk, pusat):
    """[(kab, jiwa, baris, kolom)] kecamatan yang titik tengahnya jatuh di jendela GDO."""
    out = []
    for kk, jiwa in penduduk["kec"].items():
        a = pusat.get(kk)
        if not a:
            continue
        r, c = int((6.5 - a[0]) / SEL), int((a[1] - 94) / SEL)
        if 0 <= r < HT and 0 <= c < W:
            p, kb, _ = kk.split("|")
            out.append((f"{p}|{kb}", jiwa, r, c))
    return out


def tingkat_kab_gdo(peta, kecs):
    per = {}
    for kab, jiwa, r, c in kecs:
        w = per.setdefault(kab, [[0, 0, 0, 0], 0])
        w[0][int(peta[r * W + c])] += jiwa
        w[1] += jiwa
    return {kab: H._st.lv_wilayah(w[0], w[1]) for kab, w in per.items()}


def matriks(a, b, n=4):
    m = [[0] * n for _ in range(n)]
    for x, y in zip(a, b):
        m[x][y] += 1
    return m


def kappa(m):
    """Cohen. None bila tidak terdefinisi (pe = 1 atau kosong)."""
    n = sum(map(sum, m))
    if not n:
        return None
    po = sum(m[i][i] for i in range(len(m))) / n
    pe = sum(sum(m[i]) * sum(r[i] for r in m) for i in range(len(m))) / n ** 2
    return None if pe >= 1 else round((po - pe) / (1 - pe), 3)


def biner(m):
    """Matriks 4x4 -> 2x2 (Waspada+ = tingkat >= 1)."""
    b = [[0, 0], [0, 0]]
    for i in range(len(m)):
        for j in range(len(m)):
            b[i > 0][j > 0] += m[i][j]
    return b


# ---------- uji kejadian ----------

def bulan_daftar(awal, akhir):
    y, m = int(awal[:4]), int(awal[5:])
    out = []
    while f"{y}-{m:02d}" <= akhir:
        out.append(f"{y}-{m:02d}")
        y, m = (y, m + 1) if m < 12 else (y + 1, 1)
    return out


def bulan_depan(ym):
    y, m = int(ym[:4]), int(ym[5:])
    return f"{y}-{m + 1:02d}-01" if m < 12 else f"{y + 1}-01-01"


def csi_set(bulan, aturan, obs, kabs, lv_min=1):
    """Kontingensi gabungan atas bulan yang diberikan; aturan(ym, kab) -> bool alarm."""
    h = m = f = n = 0
    for ym in bulan:
        for kab in kabs[ym]:
            o, al = (kab, ym) in obs, aturan(ym, kab)
            h, m, f, n = h + (o and al), m + (o and not al), f + (al and not o), n + (not o and not al)
    return UB.skor_kontingensi(h, m, f, n)


def selisih_bootstrap(bulan, a, b, obs, kabs, ulang=2000, benih=20261029):
    """Selisih CSI (a - b) dengan bootstrap blok-bulan; (rerata, 5%, 95%). a, b = aturan alarm."""
    per = []
    for ym in bulan:
        t = {}
        for nm, ar in (("a", a), ("b", b)):
            h = m = f = 0
            for kab in kabs[ym]:
                o, al = (kab, ym) in obs, ar(ym, kab)
                h, m, f = h + (o and al), m + (o and not al), f + (al and not o)
            t[nm] = (h, m, f)
        per.append(t)
    rnd = random.Random(benih)
    d = []
    for _ in range(ulang):
        s = [per[rnd.randrange(len(per))] for _ in per]
        c = {}
        for nm in "ab":
            h, m, f = (sum(x[nm][i] for x in s) for i in range(3))
            c[nm] = h / (h + m + f) if h + m + f else 0.0
        d.append(c["a"] - c["b"])
    d.sort()
    return round(sum(d) / len(d), 4), round(d[int(.05 * ulang)], 4), round(d[int(.95 * ulang) - 1], 4)


def uji_gdo(tk_kita, tk_g, tk_sm, obs):
    """tk_* = {ym: {kab: tingkat}}. Pilih aturan di LATIH, uji sekali di UJI. Mengembalikan blok `uji` dengan angka apa adanya."""
    bulan = sorted(tk_kita)
    kabs = {ym: [k for k in tk_kita[ym] if k in tk_g.get(ym, {}) and k in tk_sm.get(ym, {})] for ym in bulan}
    A = lambda ym, k: tk_kita[ym][k] >= 1
    G = lambda ym, k: tk_g[ym][k] >= 1
    S = lambda ym, k: tk_sm[ym][k] >= 1
    kand = {"kita": A, "gdo_spi": G, "gdo_tanah": S, "kita_DAN_gdo_spi": lambda y, k: A(y, k) and G(y, k),
            "kita_ATAU_gdo_spi": lambda y, k: A(y, k) or G(y, k), "kita_ATAU_gdo_tanah": lambda y, k: A(y, k) or S(y, k)}
    lat = [b for b in bulan if LATIH[0] <= b <= LATIH[1]]
    uji = [b for b in bulan if UJI[0] <= b <= UJI[1]]
    sk = {n: {"latih": csi_set(lat, a, obs, kabs), "uji": csi_set(uji, a, obs, kabs)} for n, a in kand.items()}
    ens = [n for n in kand if n not in ("kita", "gdo_spi", "gdo_tanah")]
    pilih = max(ens, key=lambda n: sk[n]["latih"]["csi"] or 0)    # pilih anggota ensambel dengan CSI latih terbaik
    prev = {}
    for ym in uji:
        y, m = int(ym[:4]), int(ym[5:])
        prev[ym] = f"{y}-{m - 1:02d}" if m > 1 else f"{y - 1}-12"
    persis = csi_set(uji, lambda ym, k: (k, prev[ym]) in obs, obs, kabs)
    d = selisih_bootstrap(uji, kand[pilih], kand["kita"], obs, kabs)
    a, b = sk[pilih]["uji"], sk["kita"]["uji"]
    naik = (a["csi"] or 0) > (b["csi"] or 0) and d[1] > 0
    layak = UB.vonis({"semua": {}, "uji": a})["layak"]
    return {"periode_latih": list(LATIH), "periode_uji": [uji[0], uji[-1]] if uji else None, "kabupaten": len(set(k for v in kabs.values() for k in v)),
            "skor": sk, "persistensi_uji": persis, "ensambel_terpilih_di_latih": pilih, "selisih_csi_uji_vs_kita": {"rerata": d[0], "p5": d[1], "p95": d[2], "bootstrap": "blok-bulan 2000x, benih 20261029"},
            "vonis": {"menaikkan_skill": bool(naik), "layak_mandiri": layak,
                      "kalimat": ("LOLOS: ensambel " if naik else "GAGAL: ensambel ") + f"{pilih} CSI uji {a['csi']} vs aturan kita {b['csi']} (selisih {d[0]}, selang 90% {d[1]} sampai {d[2]}); "
                                 f"POD {a['pod']}, FAR {a['far']}; alarm acak CSI {a['csi_acak']}, persistensi CSI {persis['csi']}. "
                                 + ("Selang selisih di atas nol." if naik else "Selang selisih tidak seluruhnya di atas nol atau CSI tidak naik: tidak dipasang sebagai anggota.")}}


# ---------- utama ----------

def stempel_terbaik(kec_ym, kita, kecs, cache, layer):
    """Pilih konvensi TIME (tanggal 1 bulan M, atau bulan M+1) dengan kappa biner tertinggi terhadap SPI kita di bulan LATIH; mengembalikan (nama, kappa per kandidat)."""
    lat = [b for b in kita if LATIH[0] <= b <= LATIH[1]]
    hasil = {}
    for nama, f in (("bulan_M", lambda ym: ym + "-01"), ("bulan_M+1", bulan_depan)):
        a, b = [], []
        for ym in lat:
            p = ambil_peta(layer, f(ym), cache)
            if not p:
                continue
            g = tingkat_kab_gdo(p, kecs)
            for k, v in kita[ym].items():
                if k in g:
                    a.append(v)
                    b.append(g[k])
        hasil[nama] = kappa(biner(matriks(a, b)))
    pil = max(hasil, key=lambda n: hasil[n] if hasil[n] is not None else -9)
    return pil, hasil


def jalan():
    t0 = time.time()
    sekarang = dt.datetime.now(H.WIB)
    ada = baca(KELUAR)
    r = lambda f: json.load(open(os.path.join(H.DIR_DATA, f)))
    penduduk, tanah = r("penduduk.json"), r("tanah.json")
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    kecs = kec_daftar(penduduk, pusat)
    cache = baca(CACHE, {}) or {}
    pow_sel = SPI.hujan_bulanan([(g["lat"], g["lon"]) for g in tanah["grid"]], sekarang.date())
    ym = SPI.bulan_terakhir(pow_sel)
    akhir = f"{ym[0]}-{ym[1]:02d}"
    peta = H.peta_kec(penduduk, pusat, pow_sel)
    spi_k = UB.spi3_sel(pow_sel, range(1, 13), range(2023, ym[0] + 1))
    bulan = bulan_daftar("2023-10", akhir)
    kita = {b: UB.tingkat_kab(spi_k, int(b[:4]), int(b[5:]), peta) for b in bulan}
    pil, kappas = stempel_terbaik(None, kita, kecs, cache, "spaST")
    stp = (lambda b: b + "-01") if pil == "bulan_M" else bulan_depan
    tk = {"spaST": {}, "smang": {}}
    for layer in tk:
        for b in bulan:
            p = ambil_peta(layer, stp(b), cache)
            if p:
                tk[layer][b] = tingkat_kab_gdo(p, kecs)
    simpan(CACHE, cache)
    bln = [b for b in bulan if b in tk["spaST"] and b in tk["smang"]]
    kejadian = baca(os.path.join(AKAR, "public/banjir/data/kejadian.json"))
    obs, _, _ = UB.kejadian_per_kab(kejadian, {kab for _, kab, _, _ in peta})
    uji = uji_gdo({b: kita[b] for b in bln}, tk["spaST"], tk["smang"], obs)
    # kesepakatan: semua kab-bulan (4 kelas dan biner) dan bulan terakhir
    a = [v for b in bln for k, v in kita[b].items() if k in tk["spaST"][b]]
    g = [tk["spaST"][b][k] for b in bln for k in kita[b] if k in tk["spaST"][b]]
    m_all = matriks(a, g)
    last = bln[-1]
    ks = [k for k in kita[last] if k in tk["spaST"][last]]
    m_last = matriks([kita[last][k] for k in ks], [tk["spaST"][last][k] for k in ks])
    sm_last = matriks([kita[last][k] for k in ks if k in tk["smang"][last]], [tk["smang"][last][k] for k in ks if k in tk["smang"][last]])
    kab_now = {k: [kita[last][k], tk["spaST"][last][k], tk["smang"][last].get(k)] for k in ks}
    isi = {"dibuat": sekarang.isoformat(timespec="minutes"), "label": "Deteksi Pantau Bencana vs Copernicus GDO", "atribusi": ATRIBUSI, "lisensi": LISENSI,
           "sumber": {"spaST": "SPI-3 ERA5 GDO, 0,25 derajat", "smang": "anomali kelembapan tanah GloFAS GDO, 0,25 derajat", "cdi": "CDI hanya Eropa; tidak tersedia untuk Indonesia, dibuang"},
           "konvensi_waktu": {"dipilih": pil, "kappa_biner_latih": kappas, "bulan_terakhir": last},
           "kesepakatan": {"semua_bulan": {"n": sum(map(sum, m_all)), "matriks": m_all, "kappa_4kelas": kappa(m_all), "kappa_waspada": kappa(biner(m_all)), "baris": "kita", "kolom": "GDO"},
                           "bulan_terakhir": {"bulan": last, "n": len(ks), "matriks": m_last, "kappa_4kelas": kappa(m_last), "kappa_waspada": kappa(biner(m_last))},
                           "tanah_bulan_terakhir": {"matriks": sm_last, "kappa_4kelas": kappa(sm_last), "kappa_waspada": kappa(biner(sm_last))}},
           "uji": uji, "kolom_kab": ["kita_spi3", "gdo_spi3", "gdo_tanah"], "kab": kab_now}
    simpan(KELUAR, isi)
    print(f"gdo: kappa semua {isi['kesepakatan']['semua_bulan']['kappa_waspada']}; {uji['vonis']['kalimat']}; {time.time() - t0:.0f} dtk", file=sys.stderr)


def uji_diri():
    # PNG sintetis 4 bit, 3x2: palet [putih, kuning, merah], baris 1 filter 0 (0,1,2), baris 2 filter 2 (naik) 0,0,0 -> sama dengan baris 1
    pal = bytes([255, 255, 255, 255, 255, 0, 255, 0, 0])
    r1 = bytes([0x01, 0x20])
    raw = b"\x00" + r1 + b"\x02" + bytes([0, 0])

    def chunk(t, b):
        return struct.pack(">I", len(b)) + t + b + b"\0\0\0\0"          # CRC tidak diperiksa pengurai
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 3, 2, 4, 3, 0, 0, 0)) + chunk(b"PLTE", pal) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
    w, h, lv = png_tingkat(png, WARNA["spaST"])
    assert (w, h) == (3, 2) and lv == [0, 1, 3, 0, 1, 3], lv
    try:
        png_tingkat(b"bukan png", {})
        raise SystemExit("harus menolak")
    except AssertionError:
        pass
    # kappa: sepakat sempurna = 1, acak independen ~ 0, tidak terdefinisi bila hanya satu kelas
    assert kappa([[5, 0], [0, 5]]) == 1.0 and kappa([[25, 25], [25, 25]]) == 0.0 and kappa([[10, 0], [0, 0]]) is None and kappa([[0]]) is None
    assert kappa([[40, 10], [10, 40]]) == 0.6
    assert biner(matriks([0, 1, 2, 3, 0], [0, 0, 2, 3, 1])) == [[1, 1], [1, 2]]
    assert bulan_depan("2025-12") == "2026-01-01" and bulan_daftar("2025-11", "2026-02") == ["2025-11", "2025-12", "2026-01", "2026-02"]
    # tingkat kab: 2 kec; kec A (60% jiwa) tingkat 2 -> kab tingkat 2
    peta = "0" * (W * HT)
    peta = peta[:0] + "2" + peta[1:]
    assert tingkat_kab_gdo(peta, [("k", 60, 0, 0), ("k", 40, 1, 1)]) == {"k": 2}
    # uji ensambel: GDO sempurna, kita buta -> ensambel menaikkan; kita sempurna -> tidak naik
    bulan = bulan_daftar("2023-10", "2026-02")
    kabs = [f"p|kab{i}" for i in range(40)]
    obs = {(k, b): 1 for b in bulan for k in kabs[:3]}
    nol = {b: {k: 0 for k in kabs} for b in bulan}
    ada = {b: {k: (1 if i < 3 else 0) for i, k in enumerate(kabs)} for b in bulan}
    u = uji_gdo(nol, ada, nol, obs)
    assert u["vonis"]["menaikkan_skill"] is True and u["skor"]["kita"]["uji"]["pod"] == 0 and u["skor"]["gdo_spi"]["uji"]["csi"] == 1.0, u["vonis"]
    u2 = uji_gdo(ada, nol, nol, obs)
    assert u2["vonis"]["menaikkan_skill"] is False and u2["vonis"]["kalimat"].startswith("GAGAL")
    print("ok gdo")


if __name__ == "__main__":
    uji_diri() if sys.argv[1:] == ["uji"] else jalan()
