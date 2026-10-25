"""Uji BANDING aturan hotspot -> firespot terhadap kebenaran acuan -> public/data/ujibanding_firespot.json

Tujuan: pemilik memilih aturan yang paling mendekati kenyataan. Aturan produksi (R0 = harian.firespot) diadu dengan R1..R9 memakai fungsi
produksi apa adanya (harian.dbscan / firespot / pix / tgl, aturan.*, titik_palsu.*); tidak ada logika produksi yang diubah atau disalin
(pola H/M -> ya dihitung dengan memanggil harian.firespot pada titik sintetis berkelas H/M). Hanya evaluasi luring ini boleh memakai
numpy/rasterio/pyshp/fiona (import terlindungi); produksi tetap stdlib.

PAKAI
  python3 scripts/data/ujibanding_firespot.py uji                      self-check sintetis, tanpa jaringan (butuh numpy)
  python3 scripts/data/ujibanding_firespot.py citra [--tahun 2019] [--maks-menit 40] [--maks-petak 30000]
        acuan CITRA (Gaveau dkk. 2021 ESSD 13:5353, Zenodo doi:10.5281/zenodo.4551243). Menarik berkas lewat https://zenodo.org/api/records/4551243
        (GeoTIFF -> rasterio; shapefile -> pyshp; GeoJSON -> stdlib; gpkg -> fiona) ke data/raw/ujibanding/gaveau/, lalu FIRMS SP S-NPP + NOAA-20
        Agu-Nov lewat scripts/data/firms.py (butuh FIRMS_MAP_KEY) ke data/raw/ujibanding/ (cache, tidak di-commit; ulang aman, unduhan dilewati).
        Piksel terbakar > 0 dianggap terbakar. Menulis bagian "citra" JSON.
  python3 scripts/data/ujibanding_firespot.py lapangan <berkas.json>   acuan LAPANGAN (konfirmasi Ruang Instansi), menulis bagian "lapangan"
  python3 scripts/data/ujibanding_firespot.py ringkas [--tulis]        cetak ringkasan + hitung ulang `keputusan` dari JSON yang ada

BERKAS LAPANGAN (read-only, TANPA pic_nama/pic_wa/akun/foto; dummy dibuang):
  npx wrangler d1 execute poskowarga --remote --json --command "SELECT t.id, t.prov, t.lat, t.lon, t.level, t.dibuat, t.terdeteksi_awal, i.hasil, i.dibuat AS konf_dibuat, i.waktu_gps, i.luas_ha FROM tugas_api t JOIN tugas_isian i ON i.tugas_id = t.id AND i.langkah = 'konfirmasi' WHERE t.dummy = 0 AND i.dummy = 0" > data/raw/ujibanding/lapangan.json
  (database_name poskowarga di wrangler.jsonc; butuh CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.) Mode `lapangan` memakai FIRMS NRT/SP
  (FIRMS_MAP_KEY) 8 hari sebelum `dibuat` dalam kotak +-0,1 derajat tiap tugas. Cache per tugas (memuat lokasi) ada di env LAB_CACHE_LAPANGAN
  (bukan di data/raw; kosong = direktori sementara yang hilang bersama job). Angka dengan n_tugas < 5 atau n_ya < 5 per sel disembunyikan (null).

SATUAN
  firespot-lokasi : kelompok titik kecil yang dinilai sendiri (R1: radius 375 m antarhari; R9: sel kisi 0,5/0,75/1,0 km; aturan lain: seluruh cluster = 1 lokasi).
  kejadian        : cluster harian.dbscan (eps 1,5 km, 48 jam). Kejadian "ya" bila >= 1 lokasi ya. Populasi kejadian SAMA untuk semua aturan
                    (cluster dibentuk dari semua titik; penyaring F hanya membuang titik dari penilaian), jadi selisih berpasangan sah.
  Presisi dilaporkan di KEDUA satuan; recall per petak terbakar (komponen terhubung; vektor: satu poligon = satu petak).
HIMPUNAN SENSOR: n_snpp_n20 (S-NPP + NOAA-20, ambang 4) dan n20_n21 (NOAA-20 saja di 2019; kondisi sesudah S-NPP berhenti) dengan ambang piksel
  disetel ulang supaya laju cluster "ya" R0 sama dengan versi 3 satelit (ambang keluar di JSON: himpunan.n20_n21.ambang_piksel_dasar).
DEFINISI ATURAN: lihat ATURAN_KET di bawah (ikut ditulis ke JSON). Penyaring F (on/off, semuanya sekaligus): type != 0 bila kolom ada, sel sumber panas
  tetap (titik_palsu.json), titik di area permukiman padat (proksi: >= 3 titik desa osm/desa.json dalam 2 km; data desa hanya 9 provinsi).
KEPUTUSAN: aturan pengganti R0 hanya bila presisi (kejadian) naik dengan batas bawah selisih > 0, recall turun <= 5 poin, keterlambatan median tidak naik.
"""
import collections, csv, datetime as dt, glob, json, math, os, random, subprocess, sys, tempfile, time, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import aturan as A
import harian as H

try:
    import numpy as np
except ImportError:
    np = None

AKAR = H.AKAR
KELUAR = os.path.join(H.KELUAR, "ujibanding_firespot.json")
CACHE = os.path.join(AKAR, "data/raw/ujibanding")
BENIH, B_BOOT, B_AP = 20261023, 1000, 300
KM = 111.195
R_NYATA, R_NYATA_KETAT, R_TINGKAT = 1.5, 0.75, 2.0
KELAS_UKURAN = (("<14", 0, 14), ("14-100", 14, 100), (">100", 100, 1e18))
SEL = 0.001  # derajat sel peta bekas terbakar (~111 m)
ATURAN_KET = {
    "R0": "produksi: harian.firespot (AMBANG_MEDIUM_PX=4 piksel unik, pola H/M 3 hari, cluster)",
    "R0t": "R0 dengan piksel bertoleransi (sel 375 m bertetangga 8 arah digabung): piksel produksi hanya pembulatan sel, satu api dilihat 3 satelit bisa jatuh di sel berbeda",
    "R0a": "R0 dengan ambang piksel hasil setel ulang (hanya himpunan n20_n21: laju ya cluster disamakan dengan R0 3 satelit)",
    "R1": "Kemenhut harfiah: dinilai PER LOKASI (titik dikelompokkan radius 375 m antarhari = harian.dbscan eps 0,375), kelas H bila >=1 keyakinan tinggi ATAU >=4 TITIK (bukan piksel unik); kejadian = cluster yang memuat >=1 lokasi ya",
    "R2": "semua cluster = api (pembanding bawah)",
    "R3": "hanya cluster dengan >=1 titik keyakinan tinggi",
    "R4": "terlihat >=2 lintasan berbeda (lintasan = sensor + tanggal UTC + siang/malam) dalam 24 jam; tanpa syarat keyakinan; kumulatif",
    "R5": "jumlah FRP cluster pada hari terakhir >= ambang (5/10/20 MW)",
    "R6": "R0 dengan ambang piksel nominal khusus titik MALAM lebih rendah (2/3): high = saturasi, hampir tak ada malam",
    "R7": "R0 tanpa pola MMM beruntun (MMM diganti R4): aturan beruntun tak pernah diuji, menunda",
    "R8": "regresi logistik (piksel unik, lintasan, ada high, log FRP, porsi malam, gambut, jarak ke sumber panas tetap), CV 5-lipat berkelompok per provinsi, ambang = laju ya R0; eksploratif, tanpa keterlambatan, tak ikut keputusan",
    "R9": "hibrida: pola R0 dinilai per SEL kisi k km (0,5/0,75/1,0; toleransi geolokasi VIIRS), sel ya = firespot-lokasi; digabung ke kejadian; kejadian_gabung = jumlah gugus bila sel ya digabung ulang harian.dbscan",
}
BATASAN = [
    "Gaveau dkk. 2021 adalah PROKSI kebenaran: peta bekas terbakar tahunan 2019 tanpa tanggal, jadi cluster nyata = ada bekas terbakar tahun itu di dekatnya, bukan 'terbakar pada hari itu'.",
    "Gambut: api bawah permukaan sering tak meninggalkan bekas terlihat Sentinel-2; presisi di gambut cenderung terhitung terlalu rendah dan recall tak lengkap.",
    "2019 adalah tahun El Nino kuat (kebakaran luar biasa besar); belum tentu mewakili tahun biasa. Hanya Agu-Nov, S-NPP + NOAA-20 (NOAA-21 belum ada).",
    "Bekas terbakar di luar Agu-Nov ikut menjadi petak (recall bisa terlalu rendah) dan awan menutup sebagian pemetaan Gaveau.",
    "Lapangan: tugas hanya dibuat untuk cluster yang lolos R0, jadi bias seleksi: dari lapangan hanya presisi R0 dan ketahanan positif aturan yang lebih ketat yang bisa dinilai, bukan recall sebenarnya.",
    "Lapangan: n kecil dan konfirmasi dilakukan setelah tugas dibuat; 'sudah_padam' dihitung positif hanya bila luas_ha terlapor > 0, selain itu dikeluarkan.",
    "Dugaan satuan Kemenhut = per LOKASI (firespot-lokasi); BELUM terkonfirmasi dari dokumen resmi. Karena itu presisi dilaporkan per lokasi dan per kejadian.",
    "R9 'kejadian_gabung' hanya jumlah gugus setelah sel ya digabung ulang; pasangan statistik tetap memakai cluster asal (populasi sama).",
    "Penyaring permukiman memakai titik desa OSM (9 provinsi), bukan poligon permukiman.",
    "Gunung api (aturan.gunung_api) dibuang di semua arm, setara produksi. Keyakinan rendah ('l') dibuang, setara produksi.",
    "Tingkat (px24/frp24/produksi) dinilai tanpa FWI (cuaca tak ada di uji): produksi level >= 2 tanpa cuaca hanya lewat keparahan S3.",
    "Penyetelan ulang ambang n20_n21 menyamakan laju ya cluster, bukan presisi; presisi/recall hasilnya yang dinilai.",
]


def perlu_numpy():
    if np is None:
        sys.exit("ujibanding_firespot.py butuh numpy (evaluasi luring saja): pip install numpy")


# ---------------------------------------------------------------- statistik
def wilson(k, n, z=1.96):
    if not n:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0.0, c - h), 4), round(min(1.0, c + h), 4)]


def kuantil(xs, q):
    xs = sorted(xs)
    if not xs:
        return None
    r = (len(xs) - 1) * q
    a = math.floor(r)
    b = min(a + 1, len(xs) - 1)
    return xs[a] + (xs[b] - xs[a]) * (r - a)


def rasio(k, n):
    return round(k / n, 4) if n else None


def f1(p, r):
    if p is None or r is None:
        return None
    return round(2 * p * r / (p + r), 4) if p + r else 0.0


def ap(skor, label):
    """average precision (PR-AUC bertangga); skor sama dikelompokkan."""
    skor, label = np.asarray(skor, float), np.asarray(label, bool)
    P = label.sum()
    if not P:
        return float("nan")
    o = np.argsort(-skor, kind="stable")
    s, y = skor[o], label[o]
    tp, fp = np.cumsum(y), np.cumsum(~y)
    akhir = np.r_[s[1:] != s[:-1], True]
    prec, rec = tp[akhir] / (tp[akhir] + fp[akhir]), tp[akhir] / P
    return float(np.sum(np.diff(np.r_[0.0, rec]) * prec))


class Boot:
    """Resampel bootstrap berpasangan atas satuan (cluster/petak/tugas); benih tetap. `hitung(V)` memberi jumlah-terbobot tiap kolom V (N x M)
    untuk B resampel: (B x M). Kolom disusun pasangan (pembilang, penyebut) oleh pemanggil, jadi semua aturan memakai resampel yang SAMA."""
    def __init__(self, N, B=B_BOOT, benih=BENIH):
        self.N, self.B, self.benih = N, B, benih

    def hitung(self, V):
        perlu_numpy()
        rng = np.random.default_rng(self.benih)
        N, B = self.N, self.B
        V = np.asarray(V, float)
        out = np.empty((B, V.shape[1]))
        c = max(1, int(4e6 // max(N, 1)))
        for a in range(0, B, c):
            m = min(c, B - a)
            idx = rng.integers(0, N, (m, N))
            cnt = np.bincount((idx + np.arange(m)[:, None] * N).ravel(), minlength=m * N).reshape(m, N)
            out[a:a + m] = cnt @ V
        return out


def ci_selisih(S, i_na, i_da, i_nb, i_db, V):
    """selisih rasio a - b: taksiran dari data penuh (V), selang persentil 2,5-97,5 dari resampel S."""
    with np.errstate(all="ignore"):
        d = S[:, i_na] / S[:, i_da] - S[:, i_nb] / S[:, i_db]
    d = d[np.isfinite(d)]
    sa, sb = V[:, i_da].sum(), V[:, i_db].sum()
    est = (V[:, i_na].sum() / sa if sa else float("nan")) - (V[:, i_nb].sum() / sb if sb else float("nan"))
    if not len(d) or est != est:
        return {"selisih": None, "ci95": None, "n_boot": int(len(d))}
    return {"selisih": round(float(est), 4), "ci95": [round(float(np.percentile(d, 2.5)), 4), round(float(np.percentile(d, 97.5)), 4)], "n_boot": int(len(d))}


def ci_median_selisih(xa, xb, benih=BENIH, B=B_BOOT):
    """selisih median keterlambatan berpasangan (cluster ya di kedua aturan dan nyata)."""
    xa, xb = np.asarray(xa, float), np.asarray(xb, float)
    if not len(xa):
        return {"selisih": None, "ci95": None, "n_pasang": 0}
    rng = np.random.default_rng(benih + 2)
    n = len(xa)
    d = np.empty(B)
    for a in range(0, B, 100):
        m = min(100, B - a)
        idx = rng.integers(0, n, (m, n))
        d[a:a + m] = np.median(xa[idx], axis=1) - np.median(xb[idx], axis=1)
    return {"selisih": round(float(np.median(xa) - np.median(xb)), 3), "ci95": [round(float(np.percentile(d, 2.5)), 3), round(float(np.percentile(d, 97.5)), 3)], "n_pasang": int(n)}


# ---------------------------------------------------------------- aturan
def sintetis(hd, kelas):
    """titik sintetis berkelas H (c=2) / M (c=1) / None pada hari hd, hd-1, hd-2 -> masuk harian.firespot (tanpa menyalin pola produksi)."""
    pts = []
    for i, k in enumerate(kelas):
        if k:
            d = hd - dt.timedelta(days=i)
            pts.append({"lat": 0.0, "lon": 0.0, "c": 2 if k == "H" else 1, "t": dt.datetime(d.year, d.month, d.day, 5, tzinfo=dt.timezone.utc)})
    return pts


def per_hari(ps):
    d = {}
    for p in ps:
        d.setdefault(p["d"] if "d" in p else H.tgl(p["t"]), []).append(p)
    return d


def pola_kelas(per, kelas_fn):
    """per: {hari WIB: titik}; -> (pola, 'ya'|'mungkin') pada hari terakhir lewat H.firespot."""
    hd = max(per)
    ks = [kelas_fn(per[hd - dt.timedelta(days=i)]) if (hd - dt.timedelta(days=i)) in per else None for i in range(3)]
    return H.firespot(sintetis(hd, ks))


def n_piksel(ps, toleran=False):
    sel = {H.pix(p) for p in ps}
    if not toleran:
        return len(sel)
    sisa, n = set(sel), 0
    while sisa:
        n += 1
        st = [sisa.pop()]
        while st:
            a, b = st.pop()
            for da in (-1, 0, 1):
                for db in (-1, 0, 1):
                    q = (a + da, b + db)
                    if q in sisa:
                        sisa.discard(q)
                        st.append(q)
    return n


def kelas_std(amb=None, toleran=False, amb_malam=None):
    amb = H.AMBANG_MEDIUM_PX if amb is None else amb

    def kf(ps):
        if any(p["c"] == 2 for p in ps):
            return "H"
        nom = [p for p in ps if p["c"] == 1]
        if n_piksel(nom, toleran) >= amb:
            return "H"
        if amb_malam is not None and n_piksel([p for p in nom if p["dn"] == "N"], toleran) >= amb_malam:
            return "H"
        return "M"
    return kf


def kelas_titik(amb=4):
    def kf(ps):
        return "H" if any(p["c"] == 2 for p in ps) or sum(1 for p in ps if p["c"] == 1) >= amb else "M"
    return kf


def ya_kelas(kf):
    return lambda ps: pola_kelas(per_hari(ps), kf)[1] == "ya"


def lintasan(p):
    return (p["s"], p["t"].date(), p["dn"])


def ya_r4(ps):
    q = sorted(ps, key=lambda p: p["t"])
    for i, a in enumerate(q):
        for b in q[i + 1:]:
            if b["t"] - a["t"] > dt.timedelta(hours=24):
                break
            if lintasan(a) != lintasan(b):
                return True
    return False


def ya_r5(ambang):
    def f(ps):
        hari = max(H.tgl(p["t"]) for p in ps)
        return sum(p.get("frp", 0) for p in ps if H.tgl(p["t"]) == hari) >= ambang
    return f


def ya_r7(amb):
    kf = kelas_std(amb)
    return lambda ps: pola_kelas(per_hari(ps), kf)[0] in ("HH", "H", "MH") or ya_r4(ps)


def lokasi_375(ps):
    if len(ps) == 1:
        return [ps]
    lab, _ = H.dbscan(ps, eps=0.375, min_pts=1, jam=240)
    g = {}
    for p, l in zip(ps, lab):
        g.setdefault(l, []).append(p)
    return list(g.values())


def lokasi_kisi(k):
    def f(ps):
        g = {}
        for p in ps:
            c = math.cos(math.radians(p["lat"]))
            g.setdefault((math.floor(p["lat"] * KM / k), math.floor(p["lon"] * KM * c / k)), []).append(p)
        return list(g.values())
    return f


class Aturan:
    """nama, ya(titik_lokasi)->bool, lokasi(titik_cluster)->[kelompok titik]. Tambah aturan = satu entri di daftar_aturan."""
    def __init__(self, nama, ya, lokasi=None):
        self.nama, self.ya, self.lokasi = nama, ya, lokasi or (lambda ps: [ps])


def daftar_aturan(amb=4):
    R = [Aturan("R0", lambda ps: H.firespot(ps)[1] == "ya"), Aturan("R0t", ya_kelas(kelas_std(4, True)))]
    if amb != 4:
        R.append(Aturan("R0a", ya_kelas(kelas_std(amb))))
    R += [Aturan("R1", ya_kelas(kelas_titik(4)), lokasi_375), Aturan("R2", lambda ps: True), Aturan("R3", lambda ps: any(p["c"] == 2 for p in ps)), Aturan("R4", ya_r4)]
    R += [Aturan(f"R5_{m}", ya_r5(m)) for m in (5, 10, 20)]
    R += [Aturan(f"R6_{m}", ya_kelas(kelas_std(amb, False, m))) for m in (2, 3)]
    R += [Aturan("R7", ya_r7(amb))]
    R += [Aturan(f"R9_{k}", ya_kelas(kelas_std(amb)), lokasi_kisi(k)) for k in (0.5, 0.75, 1.0)]
    return R


def nilai_lokasi(aturan, lok):
    """hari pertama (WIB) lokasi berstatus ya, atau None."""
    for d in sorted({p["d"] for p in lok}):
        if aturan.ya([p for p in lok if p["d"] <= d]):
            return d
    return None


# ---------------------------------------------------------------- penyaring wilayah (hanya daratan Indonesia)
def kotak_kasar(lat, lon):
    """label kasar untuk titik di luar poligon provinsi (hanya untuk pelaporan)."""
    if lat < -10.5 and lon >= 125:
        return "Australia utara"
    if lon >= 141 and lat > -10:
        return "Papua Nugini"
    if 124.8 <= lon <= 127.5 and -10 <= lat <= -8.0:
        return "Timor-Leste"
    if lat >= 3.5 and lon >= 118:
        return "Filipina selatan"
    if lat >= 1.3 and lon <= 104.5:
        return "Malaysia/Singapura (semenanjung)"
    if lat >= 0.8 and 109 <= lon <= 119.5:
        return "Malaysia/Brunei (Sabah, Sarawak)"
    return "laut/lain-lain"


def saring_wilayah(pts, wilayah):
    """Buang titik di luar poligon provinsi Indonesia (mekanisme produksi: wilayah.Wilayah.cari, seperti harian.hotspot). -> (titik, info)."""
    dalam, luar = [], collections.Counter()
    for p in pts:
        if wilayah.cari(p["lon"], p["lat"]):
            dalam.append(p)
        else:
            luar[kotak_kasar(p["lat"], p["lon"])] += 1
    return dalam, {"titik_masuk": len(pts), "titik_dipakai": len(dalam), "titik_dibuang": sum(luar.values()), "dibuang_per_kotak_kasar": dict(luar.most_common()),
                   "mekanisme": "wilayah.Wilayah.cari (poligon kecamatan 38 provinsi), sebelum clustering"}


def saring_citra(citra, wilayah):
    """Buang petak Gaveau yang pusat kotaknya di luar poligon provinsi (Gaveau memetakan Indonesia saja; petak tepi pantai bisa terbuang bila batas poligon kasar)."""
    ada = np.array([bool(wilayah.cari(float(lo), float(la))) for la, lo in citra.pusat])
    info = {"petak_masuk": int(len(ada)), "petak_dibuang_luar_wilayah": int((~ada).sum()), "ha_dibuang": round(float(citra.ha[~ada].sum()), 1)}
    if ada.all():
        return citra, info
    baru = np.cumsum(ada) - 1
    m = ada[citra.sel_pid]
    return Citra(citra.ha[ada], citra.kotak[ada], citra.sel_lat[m], citra.sel_lon[m], baru[citra.sel_pid[m]]), info


# ---------------------------------------------------------------- penyaring F
class Penyaring:
    def __init__(self, padat=(3, 2.0)):
        import titik_palsu as TP
        self.TP, self.padat = TP, padat
        self.sel, _ = TP.sel_industri()
        self.desa = {}
        j = os.path.join(AKAR, "public/data/osm/desa.json")
        if os.path.exists(j):
            for prov in json.load(open(j)).values():
                for d in prov:
                    self.desa.setdefault((math.floor(d[0] / 0.02), math.floor(d[1] / 0.02)), []).append((d[0], d[1]))

    def permukiman(self, lat, lon):
        n, gy, gx = 0, math.floor(lat / 0.02), math.floor(lon / 0.02)
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                for (la, lo) in self.desa.get((gy + a, gx + b), ()):
                    if math.hypot((la - lat) * KM, (lo - lon) * KM * math.cos(math.radians(lat))) <= self.padat[1]:
                        n += 1
        return n >= self.padat[0]

    def buang(self, p):
        if p.get("type") not in (None, "", "0"):
            return True
        return self.TP.palsu(p["lat"], p["lon"], self.sel) or self.permukiman(p["lat"], p["lon"])


# ---------------------------------------------------------------- baca FIRMS
def baris_ke_titik(r, sen):
    conf = r.get("confidence", "")
    if conf not in ("n", "h"):
        return None
    la, lo = float(r["latitude"]), float(r["longitude"])
    if A.gunung_api(la, lo):
        return None
    j = r["acq_time"].zfill(4)
    return {"lat": la, "lon": lo, "t": dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}:00+00:00"), "s": sen, "c": 2 if conf == "h" else 1,
            "px": max(float(r.get("scan") or .4), float(r.get("track") or .4)), "dn": r.get("daynight") or "D", "frp": float(r.get("frp") or 0), "type": r.get("type")}


def baca_csv(jalur, sen, mulai=None, akhir=None):
    pts = []
    for r in csv.DictReader(open(jalur)):
        if (mulai and r["acq_date"] < mulai) or (akhir and r["acq_date"] > akhir):
            continue
        p = baris_ke_titik(r, sen)
        if p:
            pts.append(p)
    return pts


def tandai(pts, penyaring=None):
    pts.sort(key=lambda p: p["t"])
    for i, p in enumerate(pts):
        p["i"], p["d"], p["f"] = i, H.tgl(p["t"]), bool(penyaring.buang(p)) if penyaring else False
    return pts


# ---------------------------------------------------------------- citra bekas terbakar
def kunci_sel(lat, lon):
    return (np.floor(np.asarray(lat, float) / SEL).astype(np.int64) + 20000) * 1_000_000 + np.floor(np.asarray(lon, float) / SEL).astype(np.int64)


def pusat_sel(key):
    key = np.asarray(key, np.int64)
    return (key // 1_000_000 - 20000 + 0.5) * SEL, (key % 1_000_000 + 0.5) * SEL


class Citra:
    """petak terbakar: ha[pid], kotak (latmin lonmin latmaks lonmaks), sel (lat, lon, pid) pada kisi 0,001 derajat."""
    def __init__(self, ha, kotak, sel_lat, sel_lon, sel_pid):
        self.ha, self.kotak = np.asarray(ha, float), np.asarray(kotak, float).reshape(-1, 4)
        self.sel_lat, self.sel_lon, self.sel_pid = np.asarray(sel_lat, float), np.asarray(sel_lon, float), np.asarray(sel_pid, np.int64)
        self.pusat = np.c_[(self.kotak[:, 0] + self.kotak[:, 2]) / 2, (self.kotak[:, 1] + self.kotak[:, 3]) / 2]

    def kelas(self):
        return np.select([self.ha < 14, self.ha < 100], [0, 1], 2)


def komponen(keys, ha_sel):
    """komponen terhubung 8-arah pada sel; -> (ha per komponen, kotak, pid per sel)."""
    keys = np.asarray(keys, np.int64)
    daftar = keys.tolist()
    idx = {k: i for i, k in enumerate(daftar)}
    pid = [-1] * len(daftar)
    arah = [dy * 1_000_000 + dx for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
    n = 0
    for i0, k0 in enumerate(daftar):
        if pid[i0] >= 0:
            continue
        pid[i0] = n
        st = [k0]
        while st:
            k = st.pop()
            for a in arah:
                j = idx.get(k + a)
                if j is not None and pid[j] < 0:
                    pid[j] = n
                    st.append(k + a)
        n += 1
    pid = np.asarray(pid, np.int64)
    ha = np.bincount(pid, weights=np.asarray(ha_sel, float), minlength=n)
    lat, lon = pusat_sel(keys)
    kotak = np.empty((n, 4))
    kotak[:, :2], kotak[:, 2:] = np.inf, -np.inf
    np.minimum.at(kotak[:, 0], pid, lat)
    np.minimum.at(kotak[:, 1], pid, lon)
    np.maximum.at(kotak[:, 2], pid, lat)
    np.maximum.at(kotak[:, 3], pid, lon)
    return ha, kotak, pid


def citra_dari_sel(keys, ha_sel):
    keys = np.asarray(keys, np.int64)
    ha, kotak, pid = komponen(keys, ha_sel)
    la, lo = pusat_sel(keys)
    return Citra(ha, kotak, la, lo, pid)


def muat_raster(jalur, log=sys.stderr):
    try:
        import rasterio
        from rasterio.warp import transform
    except ImportError:
        sys.exit("GeoTIFF butuh rasterio: pip install rasterio numpy")
    kk, hh = [], []
    with rasterio.open(jalur) as src:
        geo = src.crs is None or src.crs.is_geographic
        for n, (_, win) in enumerate(src.block_windows(1)):
            a = src.read(1, window=win)
            m = a > 0
            if src.nodata is not None:
                m &= a != src.nodata
            if not m.any():
                continue
            r, c = np.nonzero(m)
            xs, ys = rasterio.transform.xy(src.window_transform(win), r, c, offset="center")
            xs, ys = np.asarray(xs), np.asarray(ys)
            if not geo:
                xs, ys = transform(src.crs, "EPSG:4326", xs.tolist(), ys.tolist())
                xs, ys = np.asarray(xs), np.asarray(ys)
            u, cnt = np.unique(kunci_sel(ys, xs), return_counts=True)
            ha = abs(src.res[0] * src.res[1]) / 1e4 if not geo else abs(src.res[0] * src.res[1]) * (KM * 1000) ** 2 * math.cos(math.radians(float(ys.mean()))) / 1e4
            kk.append(u)
            hh.append(cnt * ha)
            if n % 500 == 0:
                print(f"  raster blok {n}", file=log)
    if not kk:
        sys.exit("raster tanpa piksel terbakar (>0)")
    u, inv = np.unique(np.concatenate(kk), return_inverse=True)
    return citra_dari_sel(u, np.bincount(inv, weights=np.concatenate(hh)))


def sel_poligon(cincin):
    """cincin: list ndarray (n,2) lon,lat -> (kunci sel, ha, kotak). Genap-ganjil (lubang ikut benar) ditambah sel simpul dan pusat."""
    P = np.concatenate(cincin)
    lat0 = float(P[:, 1].mean())
    ha = 0.0
    for r in cincin:
        x, y = r[:, 0] * KM * 1000 * math.cos(math.radians(lat0)), r[:, 1] * KM * 1000
        ha += float(np.sum(x[:-1] * y[1:] - x[1:] * y[:-1])) / 2
    ha = abs(ha) / 1e4
    kotak = (P[:, 1].min(), P[:, 0].min(), P[:, 1].max(), P[:, 0].max())
    ks = [kunci_sel(P[:, 1], P[:, 0]), kunci_sel([P[:, 1].mean()], [P[:, 0].mean()])]
    iy0, iy1 = math.floor(kotak[0] / SEL), math.floor(kotak[2] / SEL)
    if iy1 > iy0 or math.floor(kotak[3] / SEL) > math.floor(kotak[1] / SEL):
        for iy in range(iy0, iy1 + 1):
            yc = (iy + 0.5) * SEL
            xs = []
            for r in cincin:
                x1, y1, x2, y2 = r[:-1, 0], r[:-1, 1], r[1:, 0], r[1:, 1]
                m = (y1 <= yc) != (y2 <= yc)
                if m.any():
                    xs.append(x1[m] + (yc - y1[m]) * (x2[m] - x1[m]) / (y2[m] - y1[m]))
            if not xs:
                continue
            xs = np.sort(np.concatenate(xs))
            for a in range(0, len(xs) - 1, 2):
                i0, i1 = math.ceil(xs[a] / SEL - 0.5), math.floor(xs[a + 1] / SEL - 0.5)
                if i1 >= i0:
                    ks.append((iy + 20000) * 1_000_000 + np.arange(i0, i1 + 1))
    return np.unique(np.concatenate(ks)), ha, kotak


def muat_vektor(poligon_iter, log=sys.stderr, tenggat=None):
    """poligon_iter menghasilkan list cincin (ndarray lon,lat) per petak."""
    ha, kotak, sl, so, sp = [], [], [], [], []
    for n, cincin in enumerate(poligon_iter):
        if tenggat and n % 20000 == 0:
            tenggat()
        k, h, kt = sel_poligon(cincin)
        if not (90 < kt[1] < 145 and -15 < kt[0] < 10):
            sys.exit("koordinat vektor bukan EPSG:4326 (lon 90-145, lat -15..10); reproyeksi dulu (ogr2ogr -t_srs EPSG:4326)")
        la, lo = pusat_sel(k)
        sl.append(la), so.append(lo), sp.append(np.full(len(k), len(ha), np.int64))
        ha.append(h), kotak.append(kt)
    if not ha:
        sys.exit("vektor tanpa poligon")
    print(f"  vektor {len(ha)} poligon", file=log)
    return Citra(ha, kotak, np.concatenate(sl), np.concatenate(so), np.concatenate(sp))


def iter_shp(jalur):
    try:
        import shapefile
    except ImportError:
        sys.exit("shapefile butuh pyshp: pip install pyshp")
    for s in shapefile.Reader(jalur).iterShapes():
        if not s.points:
            continue
        pts = np.asarray(s.points, float)
        parts = list(s.parts) + [len(pts)]
        c = [pts[parts[i]:parts[i + 1]] for i in range(len(parts) - 1) if parts[i + 1] - parts[i] >= 3]
        if c:
            yield c


def iter_geojson(fitur):
    for f in fitur:
        g = f.get("geometry", f)
        if not g or g.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        bag = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        c = [np.asarray(r, float)[:, :2] for b in bag for r in b if len(r) >= 3]
        if c:
            yield c


def muat_citra(dir_, tenggat=None):
    """Pilih berkas peta bekas terbakar di dir_: GeoTIFF > shapefile > GeoJSON > gpkg."""
    perlu_numpy()
    def cari(*pola):
        return sorted(g for p in pola for g in glob.glob(os.path.join(dir_, "**", p), recursive=True))
    tif, shp, gj, gpkg = cari("*.tif", "*.tiff"), cari("*.shp"), cari("*.geojson"), cari("*.gpkg")
    if tif:
        print("citra: raster", tif[0], file=sys.stderr)
        if len(tif) > 1:
            print("  peringatan: lebih dari satu GeoTIFF; hanya yang pertama dipakai:", tif, file=sys.stderr)
        return muat_raster(tif[0])
    if shp:
        print("citra: shapefile", len(shp), "berkas", file=sys.stderr)
        return muat_vektor((c for j in shp for c in iter_shp(j)), tenggat=tenggat)
    if gj:
        print("citra: geojson", gj[0], file=sys.stderr)
        return muat_vektor(iter_geojson(json.load(open(gj[0]))["features"]), tenggat=tenggat)
    if gpkg:
        try:
            import fiona
        except ImportError:
            sys.exit("gpkg butuh fiona (pip install fiona) atau konversi ke shapefile/GeoJSON")
        with fiona.open(gpkg[0]) as f:
            return muat_vektor(iter_geojson(dict(x) for x in f), tenggat=tenggat)
    sys.exit(f"tidak ada GeoTIFF/shp/geojson/gpkg di {dir_} (lihat API Zenodo; zip diekstrak otomatis)")


def unduh_zenodo(dir_, rec="4551243"):
    os.makedirs(dir_, exist_ok=True)
    ada = [g for p in ("*.tif*", "*.shp", "*.geojson", "*.gpkg") for g in glob.glob(os.path.join(dir_, "**", p), recursive=True)]
    if ada:
        return
    import zipfile
    meta = json.load(urllib.request.urlopen(f"https://zenodo.org/api/records/{rec}", timeout=60))
    berkas = meta.get("files", [])
    print("zenodo berkas:", [(f.get("key") or f.get("filename"), f.get("size")) for f in berkas], file=sys.stderr)
    for f in berkas:
        nama = f.get("key") or f.get("filename")
        url = (f.get("links") or {}).get("self") or (f.get("links") or {}).get("download")
        if not nama.lower().endswith((".tif", ".tiff", ".shp", ".shx", ".dbf", ".prj", ".cpg", ".geojson", ".gpkg", ".zip")):
            continue
        tujuan = os.path.join(dir_, os.path.basename(nama))
        # URL dan ukuran dari respons luar: hanya https host Zenodo, <= 4 GiB, disalin bertahap dengan batas
        if not (url or "").startswith("https://zenodo.org/") or (f.get("size") or 0) > 4 * 2 ** 30:
            sys.exit("berkas Zenodo ditolak (host/ukuran): " + nama)
        if not os.path.exists(tujuan):
            print("  unduh", nama, file=sys.stderr)
            with urllib.request.urlopen(url, timeout=120) as r, open(tujuan + ".bagian", "wb") as o:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    o.write(b)
                    if o.tell() > 4 * 2 ** 30:
                        o.close(); os.remove(tujuan + ".bagian"); sys.exit("unduhan Zenodo lewat 4 GiB: " + nama)
            os.replace(tujuan + ".bagian", tujuan)
        if nama.lower().endswith(".zip"):
            sub = os.path.join(dir_, os.path.splitext(os.path.basename(nama))[0])
            if not os.path.isdir(sub):
                with zipfile.ZipFile(tujuan) as z:
                    for m in z.namelist():  # tolak jalur keluar
                        if m.startswith("/") or ".." in m.split("/"):
                            sys.exit("zip berisi jalur mencurigakan: " + m)
                    if sum(i.file_size for i in z.infolist()) > 12 * 2 ** 30:  # bom zip
                        sys.exit("zip mengembang > 12 GiB: " + nama)
                    z.extractall(sub)


class Indeks:
    """indeks sel terbakar per ubin 0,02 derajat; dekat() = jarak terdekat dan pasangan (deteksi, petak) <= r_pair."""
    B = 0.02

    def __init__(self, lat, lon, pid):
        k = self._k(lat, lon)
        o = np.argsort(k, kind="stable")
        self.lat, self.lon, self.pid, k = np.asarray(lat, float)[o], np.asarray(lon, float)[o], np.asarray(pid)[o], k[o]
        uk, st = np.unique(k, return_index=True)
        self.pos = {int(a): (int(s), int(e)) for a, s, e in zip(uk, st, np.append(st[1:], len(k)))}

    @classmethod
    def _k(cls, lat, lon):
        return np.floor((np.asarray(lat, float) + 12) / cls.B).astype(np.int64) * 100000 + np.floor(np.asarray(lon, float) / cls.B).astype(np.int64)

    def dekat(self, dlat, dlon, rmax=R_NYATA, r_pair=None, pid_ok=None):
        assert rmax <= self.B * KM - 1e-9
        dlat, dlon = np.asarray(dlat, float), np.asarray(dlon, float)
        dmin = np.full(len(dlat), np.inf)
        pd, pp = [], []
        kd = self._k(dlat, dlon)
        o = np.argsort(kd, kind="stable")
        uk, st = np.unique(kd[o], return_index=True)
        for key, s, e in zip(uk.tolist(), st, np.append(st[1:], len(o))):
            rs = [self.pos[key + a * 100000 + b] for a in (-1, 0, 1) for b in (-1, 0, 1) if key + a * 100000 + b in self.pos]
            if not rs:
                continue
            cl = np.concatenate([np.arange(a, b) for a, b in rs])
            gi = o[s:e]
            la, lo, pi = self.lat[cl], self.lon[cl], self.pid[cl]
            ch = max(1, int(3e6 // len(cl)))
            for a in range(0, len(gi), ch):
                c = gi[a:a + ch]
                D = np.hypot((dlat[c][:, None] - la[None, :]) * KM, (dlon[c][:, None] - lo[None, :]) * KM * np.cos(np.radians(dlat[c]))[:, None])
                dmin[c] = D.min(axis=1)
                if r_pair is not None:
                    m = D <= r_pair
                    if pid_ok is not None:
                        m &= pid_ok[pi][None, :]
                    ii, jj = np.nonzero(m)
                    pd.append(c[ii]), pp.append(pi[jj])
        if r_pair is None:
            return dmin, None
        if not pd:
            return dmin, np.empty((0, 2), np.int64)
        npid = int(self.pid.max()) + 1
        u = np.unique(np.concatenate(pd).astype(np.int64) * npid + np.concatenate(pp))
        return dmin, np.c_[u // npid, u % npid]


class Habis(Exception):
    pass


def pembatas(menit):
    t0 = time.time()
    def cek():
        if menit and time.time() - t0 > menit * 60:
            raise Habis(f"batas {menit} menit terlampaui")
    return cek


def sampel_petak(citra, maks, benih=BENIH):
    """strata ukuran; benih tetap; acak sederhana dalam kelas (recall per kelas tak bias). -> bool per petak."""
    rng = random.Random(benih)
    ok = np.zeros(len(citra.ha), bool)
    kl = citra.kelas()
    for c in range(3):
        idx = np.nonzero(kl == c)[0].tolist()
        if len(idx) > maks:
            idx = rng.sample(idx, maks)
        ok[idx] = True
    return ok


# ---------------------------------------------------------------- evaluasi inti
def kluster_titik(pts):
    lab, _ = H.dbscan(pts)
    g = collections.defaultdict(list)
    for p, l in zip(pts, lab):
        g[l].append(p)
    return list(g.values())


def atribut_kluster(ps, gambut):
    sen = {p["s"] for p in ps}
    la, lo = sum(p["lat"] for p in ps) / len(ps), sum(p["lon"] for p in ps) / len(ps)
    return {"gambut": bool(gambut.cari(lo, la)) if gambut else False, "malam": sum(p["dn"] == "N" for p in ps) * 2 > len(ps), "sensor": "campuran" if len(sen) > 1 else next(iter(sen)),
            "umur": len({p["d"] for p in ps}), "px": len({H.pix(p) for p in ps}), "lat": la, "lon": lo}


def jalankan_aturan(aturan, klusters, arm):
    """-> per cluster (hari_pertama_ya|None, [(titik lokasi ya, hari)], n_lokasi); arm 'on' membuang titik tersaring dari penilaian."""
    out = []
    for ps in klusters:
        q = [p for p in ps if not p["f"]] if arm == "on" else ps
        if not q:
            out.append((None, [], 0))
            continue
        lokasi = aturan.lokasi(q)
        ya = []
        for lok in lokasi:
            d = nilai_lokasi(aturan, lok)
            if d is not None:
                ya.append((lok, d))
        out.append((min((d for _, d in ya), default=None), ya, len(lokasi)))
    return out


def evaluasi(pts, citra, indeks, indeks_besar, gambut, cek=lambda: None, amb=4, log=sys.stderr, benih=BENIH, B=B_BOOT, maks_petak=30000, r8=True):
    """Satu himpunan sensor: semua aturan x penyaring. -> dict hasil + objek dalam (untuk keputusan/tingkat/gabung-pecah)."""
    perlu_numpy()
    kl = kluster_titik(pts)
    cek()
    attr = [atribut_kluster(ps, gambut) for ps in kl]
    dlat, dlon = np.array([p["lat"] for p in pts]), np.array([p["lon"] for p in pts])
    ok = sampel_petak(citra, maks_petak, benih)
    dmin, pairs = indeks.dekat(dlat, dlon, R_NYATA, R_NYATA, ok)
    cek()
    dmin25 = indeks_besar.dekat(dlat, dlon, R_TINGKAT)[0] if indeks_besar else np.full(len(pts), np.inf)
    cek()
    N = len(kl)
    nyata = np.array([min(dmin[p["i"]] for p in ps) <= R_NYATA for ps in kl])
    nyata_k = np.array([min(dmin[p["i"]] for p in ps) <= R_NYATA_KETAT for ps in kl])
    t25 = np.array([min(dmin25[p["i"]] for p in ps) <= R_TINGKAT for ps in kl])
    idx_petak = np.nonzero(ok)[0]
    kelas_p = citra.kelas()[idx_petak]
    pmap = {int(p): i for i, p in enumerate(idx_petak)}
    pr_pet = np.array([pmap[int(p)] for p in pairs[:, 1]], np.int64) if len(pairs) else np.empty(0, np.int64)
    pr_det = pairs[:, 0] if len(pairs) else np.empty(0, np.int64)
    n_petak = len(idx_petak)
    print(f"  cluster {N}, nyata {int(nyata.sum())}, petak (sampel) {n_petak}", file=log)
    vek, cols, ccol, pcols, pcol = {}, [], {}, [], {}

    def tambah(nm, num, den):
        ccol[nm] = len(cols)
        cols.extend([np.asarray(num, float), np.asarray(den, float)])

    def catat(key, ya_k, nlok, nlok_ya, nlok_nyata, delay, ya_det):
        cap = (np.bincount(pr_pet, weights=ya_det[pr_det], minlength=n_petak) > 0) if n_petak else np.zeros(0, bool)
        vek[key] = dict(ya=ya_k, nlok=nlok, nlok_ya=nlok_ya, nlok_nyata=nlok_nyata, delay=delay, cap=cap)
        tambah(key + ("pk",), ya_k & nyata, ya_k)
        tambah(key + ("pl",), nlok_nyata, nlok_ya)
        tambah(key + ("pk075",), ya_k & nyata_k, ya_k)
        pcol[key] = len(pcols)
        pcols.append(cap.astype(float))

    for arm in ("off", "on"):
        for a in daftar_aturan(amb):
            cek()
            r = jalankan_aturan(a, kl, arm)
            ya_det = np.zeros(len(pts), bool)
            for x in r:
                for lok, _ in x[1]:
                    for p in lok:
                        ya_det[p["i"]] = True
            catat((a.nama, arm), np.array([x[0] is not None for x in r]), np.array([x[2] for x in r]), np.array([len(x[1]) for x in r]),
                  np.array([sum(min(dmin[p["i"]] for p in lok) <= R_NYATA for lok, _ in x[1]) for x in r]),
                  np.array([(x[0] - min(p["d"] for p in ps)).days if x[0] is not None else np.nan for x, ps in zip(r, kl)]), ya_det)
            if a.nama.startswith("R9"):
                vek[(a.nama, arm)]["gabung"] = r
    r8_info = r8_logit(kl, attr, vek[("R0", "off")]["ya"], nyata) if r8 and N >= 300 else None
    if r8_info:
        ya_k = r8_info["ya"]
        ya_det = np.zeros(len(pts), bool)
        for ps, y in zip(kl, ya_k):
            if y:
                for p in ps:
                    ya_det[p["i"]] = True
        catat(("R8", "off"), ya_k, np.ones(N, int), ya_k.astype(int), (ya_k & nyata).astype(int), np.full(N, np.nan), ya_det)
    V = np.stack(cols, axis=1)
    S = Boot(N, B, benih).hitung(V)
    cek()
    P = np.stack(pcols, axis=1) if pcols and n_petak else np.zeros((n_petak, 0))
    PV = np.concatenate([P, np.ones((n_petak, 1))], axis=1)
    SP = Boot(n_petak, B, benih + 7).hitung(PV) if n_petak else None
    cek()
    attr_g = np.array([a["gambut"] for a in attr])
    attr_m = np.array([a["malam"] for a in attr])
    hasil = {}
    for key, v in vek.items():
        ya, cap = v["ya"], v["cap"]
        k_ya, k_ok, k_ok075 = int(ya.sum()), int((ya & nyata).sum()), int((ya & nyata_k).sum())
        d = {"kejadian": {"n_ya": k_ya, "n_ya_nyata": k_ok, "presisi": rasio(k_ok, k_ya), "wilson": wilson(k_ok, k_ya),
                          "presisi_075km": rasio(k_ok075, k_ya), "wilson_075km": wilson(k_ok075, k_ya)}}
        l_ya, l_ok = int(v["nlok_ya"].sum()), int(v["nlok_nyata"].sum())
        d["lokasi"] = {"n_ya": l_ya, "n_ya_nyata": l_ok, "presisi": rasio(l_ok, l_ya), "wilson": wilson(l_ok, l_ya), "n_lokasi_total": int(v["nlok"].sum()),
                       "n_firespot_lokasi_per_kejadian_ya_median": kuantil(v["nlok_ya"][ya].tolist(), 0.5) if k_ya else None}
        rec = {}
        for c, (nm, _, _) in enumerate(KELAS_UKURAN):
            m = kelas_p == c
            kk, nn = int(cap[m].sum()), int(m.sum())
            rec[nm] = {"n": nn, "k": kk, "recall": rasio(kk, nn), "wilson": wilson(kk, nn)}
        kk = int(cap.sum())
        rec["semua"] = {"n": n_petak, "k": kk, "recall": rasio(kk, n_petak), "wilson": wilson(kk, n_petak)}
        d["recall"] = rec
        d["f1"] = f1(d["kejadian"]["presisi"], rec["semua"]["recall"])
        dl = v["delay"][nyata & ya]
        d["keterlambatan_hari"] = {"n": int(len(dl)), "median": kuantil(dl.tolist(), 0.5), "p90": kuantil(dl.tolist(), 0.9), "tak_pernah_ya_nyata": int((nyata & ~ya).sum())}
        seg = {}
        masks = [("gambut", attr_g), ("mineral", ~attr_g), ("malam", attr_m), ("siang", ~attr_m)] + [(f"sensor_{s}", np.array([a["sensor"] == s for a in attr])) for s in sorted({a["sensor"] for a in attr})]
        for nm, mask in masks:
            k, kn = int((ya & mask).sum()), int((ya & mask & nyata).sum())
            seg[nm] = {"n_ya": k, "presisi": rasio(kn, k), "wilson": wilson(kn, k)}
        d["segmen_presisi_kejadian"] = seg
        hasil[key] = d
    for key, d in hasil.items():
        nama, arm = key
        if nama == "R0":
            continue
        b = ("R0", arm)
        sel = {}
        for lab, sfx in (("presisi_kejadian", "pk"), ("presisi_lokasi", "pl"), ("presisi_kejadian_075km", "pk075")):
            ia, ib = ccol[key + (sfx,)], ccol[b + (sfx,)]
            sel[lab] = ci_selisih(S, ia, ia + 1, ib, ib + 1, V)
        if n_petak:
            ia, ib, ik = pcol[key], pcol[b], P.shape[1]
            sel["recall_semua"] = ci_selisih(SP, ia, ik, ib, ik, PV)
        both = vek[key]["ya"] & vek[b]["ya"] & nyata
        sel["keterlambatan_median_hari"] = ci_median_selisih(vek[key]["delay"][both], vek[b]["delay"][both], benih, B) if both.any() else {"selisih": None, "ci95": None, "n_pasang": 0}
        d["selisih_vs_R0"] = sel
    for (nama, arm), v in vek.items():
        if "gabung" in v and arm == "off":
            titik = [{"lat": sum(p["lat"] for p in lok) / len(lok), "lon": sum(p["lon"] for p in lok) / len(lok), "t": min(p["t"] for p in lok), "px": 0.4} for x in v["gabung"] for lok, _ in x[1]]
            hasil[(nama, arm)]["kejadian_gabung"] = {"n_lokasi_ya": len(titik), "n_kejadian_setelah_gabung_dbscan": len(set(H.dbscan(titik)[0])) if titik else 0}
    return {"hasil": hasil, "kl": kl, "attr": attr, "nyata": nyata, "t25": t25, "dmin": dmin, "pairs": pairs, "vek": vek, "citra": citra, "ok": ok, "r8": r8_info, "n_cluster": N,
            "n_nyata": int(nyata.sum()), "n_petak": n_petak}


# ---------------------------------------------------------------- R8 regresi logistik
def fitur_kluster(ps, atr, jarak_panas_km):
    return [len({H.pix(p) for p in ps}), len({lintasan(p) for p in ps}), 1.0 if any(p["c"] == 2 for p in ps) else 0.0, math.log1p(sum(p.get("frp", 0) for p in ps)),
            sum(p["dn"] == "N" for p in ps) / len(ps), 1.0 if atr["gambut"] else 0.0, min(jarak_panas_km, 50.0)]


FITUR_R8 = ["piksel_unik", "lintasan", "ada_high", "log1p_frp", "porsi_malam", "gambut", "jarak_sumber_panas_km"]


def logit_fit(X, y, iters=25, l2=1e-3):
    n, d = X.shape
    w = np.zeros(d + 1)
    Xb = np.c_[np.ones(n), X]
    for _ in range(iters):
        p = 1 / (1 + np.exp(-np.clip(Xb @ w, -30, 30)))
        g = Xb.T @ (p - y) + l2 * np.r_[0, w[1:]]
        Hs = (Xb * (p * (1 - p))[:, None]).T @ Xb + l2 * np.eye(d + 1)
        w = w - np.linalg.solve(Hs, g)
    return w


def logit_prob(w, X):
    return 1 / (1 + np.exp(-np.clip(np.c_[np.ones(len(X)), X] @ w, -30, 30)))


def cv_logit(X, y, grup, laju, lipat=5):
    """CV berkelompok: kelompok (provinsi) dibagi ke `lipat` lipatan seimbang ukuran; ambang tiap lipatan = kuantil probabilitas latih
    sehingga laju ya = `laju`. -> flag ya (bool) out-of-fold."""
    X, y = np.asarray(X, float), np.asarray(y, float)
    Z = (X - X.mean(0)) / (X.std(0) + 1e-9)
    lip, muat = {}, [0] * lipat
    for g, c in sorted(collections.Counter(grup).items(), key=lambda x: (-x[1], str(x[0]))):
        j = muat.index(min(muat))
        lip[g] = j
        muat[j] += c
    f = np.array([lip[g] for g in grup])
    ya = np.zeros(len(y), bool)
    for j in range(lipat):
        tr, te = f != j, f == j
        if not te.any() or tr.sum() < 10:
            continue
        w = logit_fit(Z[tr], y[tr])
        ya[te] = logit_prob(w, Z[te]) >= np.quantile(logit_prob(w, Z[tr]), 1 - laju)
    return ya


def jarak_panas(lat, lon):
    import titik_palsu as TP
    if not os.path.exists(TP.JALUR):
        return np.full(len(lat), 50.0)
    s = json.load(open(TP.JALUR))["sumber_statis"]
    sl, so = np.array([x["lat"] for x in s]), np.array([x["lon"] for x in s])
    out = np.empty(len(lat))
    for a in range(0, len(lat), 2000):
        la, lo = np.asarray(lat[a:a + 2000])[:, None], np.asarray(lon[a:a + 2000])[:, None]
        out[a:a + 2000] = np.hypot((la - sl) * KM, (lo - so) * KM * np.cos(np.radians(la))).min(axis=1)
    return out


def r8_logit(kl, attr, ya_r0, nyata):
    laju = float(ya_r0.mean())
    if not 0 < laju < 1:
        return None
    W = H.Wilayah()
    jp = jarak_panas(np.array([a["lat"] for a in attr]), np.array([a["lon"] for a in attr]))
    X = [fitur_kluster(ps, a, j) for ps, a, j in zip(kl, attr, jp)]
    grup = [(W.cari(a["lon"], a["lat"]) or ("luar",))[0] for a in attr]
    return {"ya": cv_logit(X, nyata.astype(float), grup, laju), "fitur": FITUR_R8, "kelompok": "provinsi", "n_kelompok": len(set(grup)), "laju_ya_target": round(laju, 4)}


# ---------------------------------------------------------------- tingkat (px24 / frp24 / produksi) vs petak >= 25 ha dalam 2 km
def tingkat(E, B=B_AP):
    kl, t25 = E["kl"], E["t25"]
    N = len(kl)
    px, frp, l2, l3 = np.zeros(N), np.zeros(N), np.zeros(N, bool), np.zeros(N, bool)
    for i, ps in enumerate(kl):
        for d, q in per_hari(ps).items():
            p24 = len({H.pix(p) for p in q})
            win = [p for p in ps if d - dt.timedelta(days=6) <= p["d"] <= d]
            sev = A.keparahan(len(win), len({p["d"] for p in win}), 0, 0, p24)
            px[i] = max(px[i], p24)
            frp[i] = max(frp[i], sum(p.get("frp", 0) for p in q))
            l2[i] |= A.status(None, sev) >= 2
            l3[i] |= A.prioritas(p24, None)
    ref = "produksi_level>=2 (aturan.status, tanpa FWI)"
    kand = {ref: l2, "produksi_level3 (aturan.prioritas, tanpa FWI)": l3}
    for n in (5, 10, 15, 20, 25, 30):
        kand[f"px24>={n}"] = px >= n
    for m in (10, 25, 50, 100, 200, 400):
        kand[f"frp24>={m}"] = frp >= m
    cols, idx = [], {}
    for k, f in kand.items():
        idx[k] = len(cols)
        cols += [f & t25, t25, f & ~t25, f, f & t25, f | t25]
    V = np.stack(cols, axis=1).astype(float)
    S = Boot(N, B_BOOT, BENIH + 11).hitung(V)
    out = {}
    for k, f in kand.items():
        i = idx[k]
        hit, fa, nf, nt = int((f & t25).sum()), int((f & ~t25).sum()), int(f.sum()), int(t25.sum())
        d = {"n_tanda": nf, "POD": rasio(hit, nt), "POD_wilson": wilson(hit, nt), "FAR": rasio(fa, nf), "FAR_wilson": wilson(fa, nf), "CSI": rasio(hit, int((f | t25).sum()))}
        if k != ref:
            j = idx[ref]
            d["selisih_vs_produksi"] = {"CSI": ci_selisih(S, i + 4, i + 5, j + 4, j + 5, V), "POD": ci_selisih(S, i, i + 1, j, j + 1, V)}
        out[k] = d
    skors = {"px24_maks": px, "frp24_maks": frp, "produksi_level>=2": l2.astype(float)}
    pr = {nm: {"PR_AUC": round(ap(s, t25), 4)} for nm, s in skors.items()}
    ix = np.random.default_rng(BENIH + 13).integers(0, N, (B, N))
    for nm in ("px24_maks", "frp24_maks"):
        dd = np.array([ap(skors[nm][r], t25[r]) - ap(skors["produksi_level>=2"][r], t25[r]) for r in ix])
        dd = dd[np.isfinite(dd)]
        pr[nm]["selisih_vs_produksi_level>=2"] = {"selisih": round(pr[nm]["PR_AUC"] - pr["produksi_level>=2"]["PR_AUC"], 4),
                                                  "ci95": [round(float(np.percentile(dd, 2.5)), 4), round(float(np.percentile(dd, 97.5)), 4)] if len(dd) else None, "n_boot": int(len(dd)), "B": B}
    return {"target": f"petak terbakar >= 25 ha dalam {R_TINGKAT} km dari salah satu deteksi cluster", "n_cluster": N, "n_target": int(t25.sum()), "aturan": out, "pr_auc": pr,
            "catatan": "tingkat per cluster (maks lintas hari); produksi tanpa FWI (fdrs=None); PR-AUC produksi biner = satu titik"}


# ---------------------------------------------------------------- gabung/pecah
def n_objek(citra, pid):
    """jumlah gugus petak (kotak batas berjarak <= 2 km tergabung)."""
    if not pid:
        return 0
    k = citra.kotak[pid]
    par = list(range(len(pid)))
    def cari(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a
    for i in range(len(pid)):
        for j in range(i + 1, len(pid)):
            dy = max(k[i, 0] - k[j, 2], k[j, 0] - k[i, 2], 0) * KM
            dx = max(k[i, 1] - k[j, 3], k[j, 1] - k[i, 3], 0) * KM
            if math.hypot(dy, dx) <= 2.0:
                par[cari(i)] = cari(j)
    return len({cari(i) for i in range(len(pid))})


def gabung_pecah(E):
    kl, citra = E["kl"], E["citra"]
    det2p = collections.defaultdict(set)
    for d, p in E["pairs"].tolist():
        det2p[d].add(p)
    xs = []
    for ps in kl:
        if len(ps) >= 100:
            pid = set()
            for p in ps:
                pid |= det2p.get(p["i"], set())
            xs.append(n_objek(citra, sorted(pid)))
    out = {"n_cluster_ge100": len(xs), "definisi": "objek = petak Gaveau (sampel) dalam 1,5 km dari deteksi, digabung bila celah kotak batas <= 2 km; porsi >=3 objek = cluster menggabung terlalu banyak"}
    if xs:
        out.update({"objek_median": kuantil(xs, 0.5), "objek_p90": kuantil(xs, 0.9), "porsi_ge3_objek": rasio(sum(o >= 3 for o in xs), len(xs))})
    besar = [ps for ps in kl if len(ps) > 300]
    out["n_cluster_gt300"] = len(besar)
    if besar:
        pecah = [len(set(H.dbscan(ps, eps=0.75)[0])) for ps in besar]
        out["eps_075"] = {"pecah_per_cluster_median": kuantil(pecah, 0.5), "porsi_terpecah": rasio(sum(n > 1 for n in pecah), len(pecah)),
                          "catatan": "eps adaptif harian.dbscan: eps hanya batas atas (lantai 0,6 km), jadi 0,75 hanya berlaku untuk piksel >= 0,5 km"}
    return out


def setel_ambang(kl, target, rentang=range(1, 9)):
    """ambang piksel (R0 tanpa toleransi) yang laju ya cluster-nya paling dekat `target`; -> (ambang, {ambang: laju})."""
    laju = {a: sum(ya_kelas(kelas_std(a))(ps) for ps in kl) / max(len(kl), 1) for a in rentang}
    return min(laju, key=lambda a: (abs(laju[a] - target), a)), {a: round(v, 4) for a, v in laju.items()}


# ---------------------------------------------------------------- keputusan
def keputusan(blok):
    """blok = himpunan[...]['aturan'] : {nama: {arm: d}}. Pengganti R0 hanya bila presisi naik (batas bawah selisih > 0), recall turun <= 5 poin, keterlambatan median tidak naik."""
    ok, n_diuji = [], 0
    for nama, per in blok.items():
        if nama in ("R0", "R8"):
            continue
        for arm, d in per.items():
            n_diuji += 1
            s = d.get("selisih_vs_R0")
            if not s:
                continue
            pk, rc, tl = s.get("presisi_kejadian"), s.get("recall_semua"), s.get("keterlambatan_median_hari")
            if not (pk and pk.get("ci95") and rc and rc.get("selisih") is not None and tl and tl.get("selisih") is not None):
                continue
            if pk["ci95"][0] > 0 and rc["selisih"] >= -0.05 and tl["selisih"] <= 0:
                ok.append((pk["selisih"] or 0, f"{nama} penyaring={arm}", pk, rc, tl))
    if ok:
        ok.sort(key=lambda x: -x[0])
        return {"putusan": f"ganti R0 dengan {ok[0][1]}", "n_diuji": n_diuji, "perbandingan_ganda": "banyak aturan diuji sekaligus tanpa koreksi; ulangi pada tahun lain (mis. 2023) sebelum mengganti", "calon": [{"aturan": x[1], "dpresisi": x[2], "drecall": x[3], "dtunda": x[4]} for x in ok]}
    return {"putusan": "pertahankan R0", "calon": [], "n_diuji": n_diuji, "syarat": "presisi naik (batas bawah selisih > 0), recall turun <= 5 poin, keterlambatan median tidak naik"}


def titik_lemah_r0(E, maks=15):
    kl, attr, nyata, v = E["kl"], E["attr"], E["nyata"], E["vek"][("R0", "off")]
    ya = v["ya"]
    palsu = [i for i in range(len(kl)) if ya[i] and not nyata[i]]

    def tabel(f):
        n, s = collections.Counter(), collections.Counter()
        for i in range(len(kl)):
            if ya[i]:
                k = f(i)
                n[k] += 1
                s[k] += not nyata[i]
        return {str(k): {"n_ya": n[k], "tak_didukung_citra": s[k], "laju": rasio(s[k], n[k])} for k in sorted(n, key=str)}
    out = {"n_ya": int(ya.sum()), "n_ya_tak_didukung_citra": len(palsu), "per_umur_hari": tabel(lambda i: min(attr[i]["umur"], 4)),
           "per_piksel_unik": tabel(lambda i: "1-4" if attr[i]["px"] <= 4 else "5-9" if attr[i]["px"] < 10 else ">=10"), "per_gambut": tabel(lambda i: "gambut" if attr[i]["gambut"] else "mineral"),
           "per_siang_malam": tabel(lambda i: "malam" if attr[i]["malam"] else "siang"), "per_sensor": tabel(lambda i: attr[i]["sensor"]),
           "contoh_alarm_tak_didukung": [{"lat": round(attr[i]["lat"], 4), "lon": round(attr[i]["lon"], 4), "tanggal": str(min(p["d"] for p in kl[i])), "piksel_unik": attr[i]["px"], "n_titik": len(kl[i])} for i in palsu[:maks]]}
    cit, cap = E["citra"], v["cap"]
    idx = np.nonzero(E["ok"])[0]
    luput = [int(idx[j]) for j in range(len(idx)) if not cap[j] and cit.ha[idx[j]] >= 100]
    out["petak_ge100ha_luput"] = {"n": len(luput), "dari": int((cit.ha[idx] >= 100).sum()),
                                  "contoh": [{"lat": round(float(cit.pusat[p, 0]), 4), "lon": round(float(cit.pusat[p, 1]), 4), "ha": round(float(cit.ha[p]), 1)} for p in sorted(luput, key=lambda p: -cit.ha[p])[:10]]}
    return out


# ---------------------------------------------------------------- mode citra
def tarik_firms(sumber, sen, mulai, akhir, cache=CACHE):
    os.makedirs(cache, exist_ok=True)
    jalur = os.path.join(cache, f"firms_{sen}_{mulai[:4]}.csv")
    if not os.path.exists(jalur) or os.path.getsize(jalur) < 1000:
        with open(jalur + ".tmp", "w") as f:
            subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "firms.py"), mulai, akhir], stdout=f, env=dict(os.environ, SENSOR=sumber), check=True)
        os.replace(jalur + ".tmp", jalur)
    return jalur


def mode_citra(tahun=2019, maks_menit=40, maks_petak=30000):
    perlu_numpy()
    cek = pembatas(maks_menit)
    mulai, akhir = f"{tahun}-08-01", f"{tahun}-11-30"
    pts_semua = []
    for sumber, sen in (("VIIRS_SNPP", "N"), ("VIIRS_NOAA20", "N20")):
        pts_semua += baca_csv(tarik_firms(sumber, sen, mulai, akhir), sen, mulai, akhir)
    cek()
    from wilayah import Wilayah
    wil = Wilayah()
    pts_semua, info_titik = saring_wilayah(pts_semua, wil)
    print("penyaring wilayah:", info_titik, file=sys.stderr)
    unduh_zenodo(os.path.join(CACHE, "gaveau"))
    citra = muat_citra(os.path.join(CACHE, "gaveau"), cek)
    citra, info_petak = saring_citra(citra, wil)
    cek()
    indeks = Indeks(citra.sel_lat, citra.sel_lon, citra.sel_pid)
    m = (citra.ha >= 25)[citra.sel_pid]
    indeks_besar = Indeks(citra.sel_lat[m], citra.sel_lon[m], citra.sel_pid[m]) if m.any() else None
    from wilayah import Poligon
    gambut = Poligon(os.path.join(AKAR, "public/data/lahan/gambut.geojson"))
    pny = Penyaring()
    out = {"tahun": tahun, "rentang": [mulai, akhir], "petak_total": int(len(citra.ha)), "petak_ha_total": round(float(citra.ha.sum()), 1),
           "petak_per_kelas": {nm: int(((citra.ha >= lo) & (citra.ha < hi)).sum()) for nm, lo, hi in KELAS_UKURAN}, "himpunan": {}, "belum_dikerjakan": [],
           "penyaring_wilayah": {"titik": info_titik, "petak": info_petak}}
    for nama, sens in (("n_snpp_n20", {"N", "N20"}), ("n20_n21", {"N20"})):
        pts = tandai([dict(p) for p in pts_semua if p["s"] in sens], pny)
        print(f"himpunan {nama}: {len(pts)} titik", file=sys.stderr)
        amb, tab = 4, None
        try:
            if nama == "n20_n21" and "n_snpp_n20" in out["himpunan"]:
                target = out["himpunan"]["n_snpp_n20"]["laju_ya_R0"]
                amb, laju = setel_ambang(kluster_titik(pts), target)
                tab = {"laju_ya_per_ambang": laju, "target_laju_3satelit": target, "ambang_terpilih": amb}
            E = evaluasi(pts, citra, indeks, indeks_besar, gambut, cek, amb, maks_petak=maks_petak)
        except Habis as e:
            out["belum_dikerjakan"].append(f"{nama}: {e}")
            continue
        h = {"titik": len(pts), "cluster": E["n_cluster"], "cluster_nyata_1.5km": E["n_nyata"], "petak_sampel": E["n_petak"], "ambang_piksel_dasar": amb,
             "laju_ya_R0": round(float(E["vek"][("R0", "off")]["ya"].mean()), 4), "setel_ulang_ambang": tab, "aturan": {}}
        for (a, arm), d in E["hasil"].items():
            h["aturan"].setdefault(a, {})[arm] = d
        if E["r8"]:
            h["R8"] = {k: v for k, v in E["r8"].items() if k != "ya"}
        h["titik_lemah_R0"] = titik_lemah_r0(E)
        h["keputusan"] = keputusan(h["aturan"])
        out["himpunan"][nama] = h
        try:
            cek()
            h["gabung_pecah"] = gabung_pecah(E)
            cek()
            h["tingkat"] = tingkat(E)
        except Habis as e:
            out["belum_dikerjakan"].append(f"{nama}: gabung/pecah atau tingkat -- {e}")
    return out


# ---------------------------------------------------------------- mode lapangan
def baca_wrangler(jalur):
    j = json.load(open(jalur))
    baris = []
    for blok in (j if isinstance(j, list) else [j]):
        baris += blok.get("results", []) if isinstance(blok, dict) else []
    return baris


def tugas_dari_baris(baris):
    """-> (tugas berlabel, pengecualian). Hanya kolom non-sensitif yang dibaca."""
    t, dikeluar = [], collections.Counter()
    for r in baris:
        h = r.get("hasil")
        if h == "api_ada":
            y = True
        elif h == "bukan_api":
            y = False
        elif h == "sudah_padam":
            if (r.get("luas_ha") or 0) > 0:
                y = True
            else:
                dikeluar["sudah_padam_tanpa_bekas_diketahui"] += 1
                continue
        else:
            dikeluar["hasil_lain"] += 1
            continue
        t.append({"id": r["id"], "lat": r["lat"], "lon": r["lon"], "prov": str(r.get("prov") or ""), "dibuat": r["dibuat"], "y": y, "hasil": h})
    return t, dict(dikeluar)


def cache_lapangan():
    """Cache per tugas memuat lokasi tugas lapangan: JANGAN di bawah data/raw (ikut cache Actions). Env LAB_CACHE_LAPANGAN, selain itu direktori sementara."""
    return os.environ.get("LAB_CACHE_LAPANGAN") or tempfile.mkdtemp(prefix="ujibanding_lap_")


def titik_sekitar(tugas, ambil_firms, cache=None):
    """FIRMS VIIRS sebelum `dibuat`, di-cache per tugas. ambil_firms(tugas)->list titik (diinjeksi agar bisa diuji)."""
    jalur = os.path.join(cache or cache_lapangan(), f"{tugas['id']}.json")
    if os.path.exists(jalur):
        return [dict(p, t=dt.datetime.fromisoformat(p["t"])) for p in json.load(open(jalur))]
    pts = ambil_firms(tugas)
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    json.dump([dict(p, t=p["t"].isoformat()) for p in pts], open(jalur, "w"))
    return pts


def ambil_firms_nyata(tugas):
    import firms_sumber as FS
    k = H.kunci()
    ambil = lambda u: H.ambil(u)
    ket = famili = None
    for fam in (("VIIRS_SNPP", "VIIRS_NOAA20", "VIIRS_NOAA21"), ("VIIRS_NOAA20", "VIIRS_NOAA21")):
        try:
            ket, famili = FS.muat_ketersediaan(k, ambil, fam), fam
            break
        except RuntimeError:
            continue
    if ket is None:
        raise RuntimeError("data_availability tak lengkap")
    tb = dt.datetime.fromtimestamp(tugas["dibuat"] / 1000, dt.timezone.utc)
    r = 0.1
    baris, _ = FS.unduh((tb - dt.timedelta(days=8)).date(), tb.date(), k, ambil, f"{tugas['lon'] - r},{tugas['lat'] - r},{tugas['lon'] + r},{tugas['lat'] + r}", ket, famili=famili)
    sen = {"VIIRS_SNPP": "N", "VIIRS_NOAA20": "N20", "VIIRS_NOAA21": "N21"}
    pts = []
    for src, row in baris:
        p = baris_ke_titik(row, sen[src.rsplit("_", 1)[0]])
        if p and p["t"] <= tb:
            pts.append(p)
    return pts


def evaluasi_lapangan(tugas, ambil_firms, penyaring=None, B=B_BOOT, benih=BENIH, amb=4, cache=None, minimal=5, wilayah=None):
    perlu_numpy()
    R = daftar_aturan(amb)
    rows, tanpa, gagal = [], 0, 0
    luar_total, masuk_total = collections.Counter(), 0
    cache = cache or cache_lapangan()
    for i, t in enumerate(tugas):
        try:
            pts = titik_sekitar(t, ambil_firms, cache)
            if wilayah is not None:
                pts, info = saring_wilayah(pts, wilayah)
                masuk_total += info["titik_masuk"]
                luar_total.update(info["dibuang_per_kotak_kasar"])
            pts = tandai(pts, penyaring)
        except Exception as e:  # pesan galat bisa memuat URL berkunci/bbox: hanya kelas galat yang dicetak
            print(f"gagal tugas ke-{i}: {type(e).__name__}", file=sys.stderr)
            pts, gagal = [], gagal + 1
        best, bd = None, 1e9
        for ps in (kluster_titik(pts) if pts else []):
            d = min(math.hypot((p["lat"] - t["lat"]) * KM, (p["lon"] - t["lon"]) * KM * math.cos(math.radians(t["lat"]))) for p in ps)
            if d < bd:
                best, bd = ps, d
        if best is None or bd > 3.0:
            tanpa += 1
            best = None
        rows.append((t, best))
    out = {"n_tugas": len(tugas), "n_positif": sum(t["y"] for t in tugas), "n_negatif": sum(not t["y"] for t in tugas), "n_tanpa_cluster_firms": tanpa, "n_gagal_tarik_firms": gagal,
           "penyaring_wilayah": {"titik_masuk": masuk_total, "titik_dibuang": sum(luar_total.values()), "dibuang_per_kotak_kasar": dict(luar_total)} if wilayah is not None else None,
           "catatan": "bias seleksi: tugas hanya untuk cluster yang lolos R0 saat itu; presisi = dari yang dinyatakan ya aturan itu; ketahanan_positif = porsi positif lapangan yang tetap ya", "aturan": {}}
    y = np.array([t["y"] for t, _ in rows], bool)
    ya_all = {}
    for arm in ("off", "on"):
        for a in R:
            ya_all[(a.nama, arm)] = np.array([bool(ps) and bool([p for p in ps if arm == "off" or not p["f"]]) and
                                              any(a.ya(lok) for lok in a.lokasi([p for p in ps if arm == "off" or not p["f"]])) for _, ps in rows])
    if len(rows) >= 300 and all(ps for _, ps in rows):
        att = [atribut_kluster(ps, None) for _, ps in rows]
        jp = jarak_panas(np.array([a["lat"] for a in att]), np.array([a["lon"] for a in att]))
        X = [fitur_kluster(ps, a, j) for (_, ps), a, j in zip(rows, att, jp)]
        ya_all[("R8", "off")] = cv_logit(X, y.astype(float), [t["prov"] or "?" for t, _ in rows], float(ya_all[("R0", "off")].mean()))
    cols, ci = [], {}
    for k, ya in ya_all.items():
        ci[k] = len(cols)
        cols += [ya & y, ya, ya & y, y]
    V = np.stack(cols, axis=1).astype(float)
    S = Boot(len(rows), B, benih + 3).hitung(V)
    for (nama, arm), ya in ya_all.items():
        i = ci[(nama, arm)]
        tp, n_ya, npos = int((ya & y).sum()), int(ya.sum()), int(y.sum())
        d = {"n_ya": n_ya, "presisi": rasio(tp, n_ya), "wilson": wilson(tp, n_ya), "ketahanan_positif": rasio(tp, npos), "ketahanan_wilson": wilson(tp, npos)}
        if nama != "R0":
            j = ci[("R0", arm)]
            d["selisih_vs_R0"] = {"presisi": ci_selisih(S, i, i + 1, j, j + 1, V), "ketahanan_positif": ci_selisih(S, i + 2, i + 3, j + 2, j + 3, V)}
        out["aturan"].setdefault(nama, {})[arm] = d
    return sembunyikan_kecil(out, minimal)


def sembunyikan_kecil(out, minimal=5):
    """Privasi: n_tugas < minimal -> semua angka aturan dibuang; n_ya < minimal -> presisi/Wilson/selisih presisi null; positif < minimal -> ketahanan null."""
    if out["n_tugas"] < minimal:
        out["aturan"] = {}
        out["n_positif"] = out["n_negatif"] = out["n_tanpa_cluster_firms"] = None
        out["disembunyikan"] = f"n terlalu kecil (n_tugas < {minimal})"
        return out
    kecil = False
    for per in out["aturan"].values():
        for d in per.values():
            sel = d.get("selisih_vs_R0")
            if d["n_ya"] < minimal:
                d["presisi"] = d["wilson"] = None
                if sel:
                    sel["presisi"] = None
                d["catatan"] = "n terlalu kecil"
                kecil = True
            if out["n_positif"] < minimal:
                d["ketahanan_positif"] = d["ketahanan_wilson"] = None
                if sel:
                    sel["ketahanan_positif"] = None
    if out["n_positif"] < minimal:
        kecil = True
    if kecil:
        out["disembunyikan"] = f"sel dengan n < {minimal} ditulis null (n terlalu kecil)"
    return out


def mode_lapangan(jalur, ambil_firms=None):
    tugas, dikeluar = tugas_dari_baris(baca_wrangler(jalur))
    from wilayah import Wilayah
    out = evaluasi_lapangan(tugas, ambil_firms or ambil_firms_nyata, Penyaring(), wilayah=Wilayah())
    out["dikeluarkan"] = dikeluar
    out["definisi_label"] = "api_ada=positif; bukan_api=negatif; sudah_padam=positif bila luas_ha terlapor > 0, selain itu dikeluarkan dan dihitung terpisah"
    return out


# ---------------------------------------------------------------- tulis / ringkas
def muat_hasil():
    return json.load(open(KELUAR)) if os.path.exists(KELUAR) else {}


def ringkas_keputusan(h):
    out = {}
    lap = h.get("lapangan", {}).get("aturan", {})
    for nama, blok in h.get("citra", {}).get("himpunan", {}).items():
        k = keputusan(blok["aturan"])
        if k["putusan"] == "pertahankan R0":
            k["titik_lemah_R0"] = blok.get("titik_lemah_R0")
        elif nama == "n_snpp_n20":
            for c in k["calon"]:
                c["lapangan_presisi_selisih"] = (lap.get(c["aturan"].split(" ")[0], {}).get("off", {}) or {}).get("selisih_vs_R0", {}).get("presisi")
        out[nama] = k
    if not out:
        return {"putusan": "belum ada hasil citra", "catatan": "jalankan mode citra"}
    return {"putusan": (out.get("n_snpp_n20") or next(iter(out.values())))["putusan"], "per_himpunan": out}


def tulis(h):
    h.setdefault("meta", {}).update({"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "benih": BENIH, "bootstrap_B": B_BOOT, "bootstrap_B_pr_auc": B_AP,
                                    "aturan": ATURAN_KET, "batasan": BATASAN, "dugaan_satuan_kemenhut": "per lokasi (BELUM terkonfirmasi dari dokumen resmi)",
                                    "sumber_citra": "Gaveau dkk. 2021 ESSD 13:5353, Zenodo doi:10.5281/zenodo.4551243", "ambang_nyata_km": {"utama": R_NYATA, "ketat": R_NYATA_KETAT}})
    h["meta"]["penyaring_wilayah"] = {"citra": h.get("citra", {}).get("penyaring_wilayah"), "lapangan": h.get("lapangan", {}).get("penyaring_wilayah")}
    h["keputusan"] = ringkas_keputusan(h)
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w") as f:
        json.dump(h, f, ensure_ascii=False, indent=1)


def cetak(h):
    print("keputusan:", h.get("keputusan", {}).get("putusan"))
    for nama, blok in h.get("citra", {}).get("himpunan", {}).items():
        print(f"== {nama}: cluster {blok['cluster']} nyata {blok['cluster_nyata_1.5km']} petak {blok['petak_sampel']} ambang {blok['ambang_piksel_dasar']}")
        for a, per in blok["aturan"].items():
            for arm, d in per.items():
                s = d.get("selisih_vs_R0", {}).get("presisi_kejadian", {})
                print(f"  {a:8s} F={arm:3s} presisi {d['kejadian']['presisi']} (n {d['kejadian']['n_ya']}) lokasi {d['lokasi']['presisi']} recall {d['recall']['semua']['recall']} "
                      f"tunda med {d['keterlambatan_hari']['median']} dpresisi {s.get('selisih')} {s.get('ci95')}")
    if "lapangan" in h:
        print("lapangan:", {k: h["lapangan"][k] for k in ("n_tugas", "n_positif", "n_negatif", "n_tanpa_cluster_firms")})
    if h.get("citra", {}).get("belum_dikerjakan"):
        print("belum dikerjakan:", h["citra"]["belum_dikerjakan"])


# ---------------------------------------------------------------- uji
def _p(lat=0.0, lon=110.0, jam=3, hari=0, c=1, s="N", dn="D", frp=1.0, t0=None, **kw):
    t0 = t0 or dt.datetime(2019, 9, 1, 0, tzinfo=dt.timezone.utc)
    return dict({"lat": lat, "lon": lon, "t": t0 + dt.timedelta(days=hari, hours=jam), "s": s, "c": c, "px": 0.4, "dn": dn, "frp": frp}, **kw)


def _pk(km_x, **kw):  # titik km_x kilometer di timur lon 110 pada khatulistiwa
    return _p(lon=110.0 + km_x / KM, **kw)


def uji():
    perlu_numpy()
    # statistik, dihitung tangan
    w = wilson(8, 10)
    assert abs(w[0] - 0.4901) < 2e-4 and abs(w[1] - 0.9433) < 2e-4, w
    assert wilson(0, 0) is None and wilson(0, 5)[0] == 0.0 and wilson(5, 5)[1] == 1.0
    assert kuantil([1, 2, 3, 4], 0.5) == 2.5 and kuantil([5], 0.9) == 5 and kuantil([], 0.5) is None
    assert abs(ap([0.9, 0.8, 0.7, 0.6], [1, 0, 1, 0]) - (1 + 2 / 3) / 2) < 1e-9
    assert abs(ap([1, 1, 0], [1, 0, 1]) - (0.5 * 0.5 + 0.5 * 2 / 3)) < 1e-9          # skor sama dikelompokkan
    assert f1(0.5, 0.5) == 0.5 and f1(0.0, 0.0) == 0.0 and f1(None, 0.5) is None
    na, da, nb = np.array([1, 1, 0, 0]), np.ones(4), np.array([1, 0, 0, 0])
    Vv = np.stack([na, da, nb, da], axis=1).astype(float)
    S = Boot(4, 200, 1).hitung(Vv)
    assert S.shape == (200, 4) and (S[:, 1] == 4).all()               # tiap resampel berukuran N
    assert (S == Boot(4, 200, 1).hitung(Vv)).all()                    # benih tetap
    assert ci_selisih(S, 0, 1, 2, 3, Vv)["selisih"] == 0.25           # 2/4 - 1/4
    c0 = ci_selisih(S, 0, 1, 0, 1, Vv)
    assert c0["selisih"] == 0.0 and c0["ci95"] == [0.0, 0.0]
    V2 = np.stack([np.ones(60), np.ones(60), np.r_[np.ones(30), np.zeros(30)], np.ones(60)], axis=1)
    c2 = ci_selisih(Boot(60, 300, 2).hitung(V2), 0, 1, 2, 3, V2)
    assert c2["selisih"] == 0.5 and c2["ci95"][0] > 0.3, c2
    m = ci_median_selisih([3, 3, 3, 3], [1, 1, 1, 1])
    assert m["selisih"] == 2 and m["ci95"] == [2.0, 2.0]
    # R0 (kelas generik lewat H.firespot sintetis) setara H.firespot produksi
    assert H.AMBANG_MEDIUM_PX >= 2
    rng = random.Random(1)
    t0 = dt.datetime(2019, 9, 1, 3, tzinfo=dt.timezone.utc)
    R0 = daftar_aturan()[0]
    for _ in range(400):
        ps = [{"lat": -2 + rng.randint(0, 6) * 0.004, "lon": 110 + rng.randint(0, 6) * 0.004, "c": rng.choice((1, 1, 1, 2)), "dn": rng.choice("DN"), "s": "N", "frp": 1.0,
               "t": t0 + dt.timedelta(days=rng.randint(0, 3), hours=rng.choice((0, 8, 14)))} for _ in range(rng.randint(1, 14))]
        tandai(ps)
        assert ya_kelas(kelas_std())(ps) == (H.firespot(ps)[1] == "ya") == R0.ya(ps), ps
    # aturan pada contoh buatan
    R = {a.nama: a for a in daftar_aturan(2)}

    def ya(nama, ps):
        tandai(ps)
        return any(R[nama].ya(lok) for lok in R[nama].lokasi(ps))
    satu = [_p()]
    assert not ya("R0", satu) and ya("R2", satu) and not ya("R3", satu) and not ya("R1", satu)
    assert ya("R0", [_p(c=2)]) and ya("R3", [_p(c=2)]) and ya("R1", [_p(c=2)])
    empat = [_pk(0.9 * i) for i in range(4)]            # 4 piksel unik tak bersebelahan
    rapat = [_pk(0.4 * i) for i in range(4)]            # 4 piksel unik bersebelahan: R0 ya, R0t (toleran) hanya 1 piksel
    assert ya("R0", rapat) and not ya("R0t", rapat)
    assert ya("R0", empat) and ya("R0t", empat) and not ya("R1", empat)   # R1: tiap lokasi 375 m hanya 1 titik
    tiga_malam, tiga_siang = [_pk(0.4 * i, dn="N") for i in range(3)], [_pk(0.4 * i, dn="D") for i in range(3)]
    R6 = {a.nama: a for a in daftar_aturan(4)}
    assert not R6["R0"].ya(tandai(list(tiga_malam))) and R6["R6_3"].ya(tandai(list(tiga_malam))) and not R6["R6_3"].ya(tandai(list(tiga_siang)))
    assert R6["R6_2"].ya(tandai([_pk(0, dn="N"), _pk(0.4, dn="N")])) and not R6["R6_2"].ya(tandai([_pk(0, dn="D"), _pk(0.4, dn="D")]))
    sama = [_p(jam=3, s="N"), _p(jam=3.1, s="N20"), _p(jam=15, s="N"), _p(jam=15.1, s="N20")]    # 4 titik, 1 piksel: R1 ya (hitung titik), R0 tidak
    assert not ya("R0", sama) and ya("R1", sama)
    assert ya("R4", [_p(jam=3, s="N"), _p(jam=4, s="N20")]) and not ya("R4", [_p(jam=3, s="N"), _p(jam=3.2, s="N")])
    assert not ya("R4", [_p(jam=3, s="N"), _p(jam=4, s="N", dn="N")]) is False                     # lintasan beda (siang/malam) dalam 24 jam
    assert not ya("R4", [_p(jam=3, s="N"), _p(hari=2, jam=3, s="N20")])
    f12 = [_p(frp=7.0), _p(lon=110.01, frp=5.0)]
    assert ya("R5_5", f12) and ya("R5_10", f12) and not ya("R5_20", f12)
    mmm = [dict(_p(s="N"), t=dt.datetime(2019, 9, 1, 3, tzinfo=dt.timezone.utc) + dt.timedelta(hours=25 * i)) for i in range(3)]  # 3 hari berturut, >24 jam
    assert H.firespot(tandai(list(mmm)))[0] == "MMM" and ya("R0", mmm) and not ya("R7", mmm)
    assert ya("R7", mmm + [dict(mmm[-1], s="N20", t=mmm[-1]["t"] + dt.timedelta(hours=1))])
    kisi = tandai([_p(lon=(12232.0 + x) / KM) for x in (0.1, 0.5, 0.9, 1.3)])   # 12232 km: batas sel untuk k=1 dan k=2
    a9, a1 = Aturan("R9_2", ya_kelas(kelas_std(4)), lokasi_kisi(2.0)), Aturan("R9_1", ya_kelas(kelas_std(4)), lokasi_kisi(1.0))
    assert len(a9.lokasi(kisi)) == 1 and any(a9.ya(l) for l in a9.lokasi(kisi)) and len(a1.lokasi(kisi)) == 2 and not any(a1.ya(l) for l in a1.lokasi(kisi))
    assert len(lokasi_375(tandai([_pk(0), _pk(0.1, hari=1), _pk(3.0), _pk(3.1, hari=1)]))) == 2
    nb2 = tandai([_pk(0), _pk(0.4)])
    assert n_piksel(nb2) == 2 and n_piksel(nb2, True) == 1 and n_piksel(tandai([_pk(0), _pk(5)]), True) == 2
    # citra sintetis: petak 3x3 sel (10,8 ha) + 1 sel jauh (1,2 ha)
    kk = np.array([int(kunci_sel([0.0 + i * SEL], [110.5 + j * SEL])[0]) for i in range(3) for j in range(3)] + [int(kunci_sel([3.0], [112.0])[0])])
    ct = citra_dari_sel(kk, np.full(len(kk), 1.2))
    assert len(ct.ha) == 2 and sorted(np.round(ct.ha, 1).tolist()) == [1.2, 10.8], ct.ha
    ix = Indeks(ct.sel_lat, ct.sel_lon, ct.sel_pid)
    dm, pr = ix.dekat([0.0015] * 3, [110.5025 + 1.0 / KM, 110.5025 + 2.1 / KM, 110.5025 + 0.5 / KM], 1.5, 1.5)   # dari pusat sel timur
    assert 0.9 < dm[0] < 1.1 and dm[1] > 1.5 and dm[2] < 0.55 and sorted(set(pr[:, 0].tolist())) == [0, 2], (dm, pr)
    kp, hp, kt = sel_poligon([np.array([[110.0, 0.0], [110.01, 0.0], [110.01, 0.01], [110.0, 0.01], [110.0, 0.0]])])
    assert 90 <= len(kp) <= 130 and 120 < hp < 126, (len(kp), hp)
    # uji ujung ke ujung: A nyata (5 piksel dekat petak), B palsu (1 titik jauh); petak ke-2 tak terdeteksi
    pts = tandai([_p(lat=0.001, lon=110.5 + 0.0034 * i) for i in range(5)] + [_p(lat=-5.0, lon=115.0)])

    class _G:
        def cari(self, lo, la):
            return None
    E = evaluasi(pts, ct, ix, ix, _G(), amb=4, B=60, r8=False, log=open(os.devnull, "w"))
    h = E["hasil"]
    assert E["n_cluster"] == 2 and E["n_nyata"] == 1 and E["n_petak"] == 2
    r0, r2 = h[("R0", "off")], h[("R2", "off")]
    assert (r0["kejadian"]["n_ya"], r0["kejadian"]["presisi"]) == (1, 1.0) and r0["lokasi"]["presisi"] == 1.0
    assert (r2["kejadian"]["n_ya"], r2["kejadian"]["presisi"]) == (2, 0.5)
    assert r0["recall"]["semua"]["recall"] == 0.5 and r0["recall"]["<14"]["n"] == 2 and r2["recall"]["semua"]["k"] == 1
    assert r0["keterlambatan_hari"]["median"] == 0.0 and r2["selisih_vs_R0"]["presisi_kejadian"]["selisih"] == -0.5
    assert h[("R1", "off")]["lokasi"]["n_ya"] == 0 and h[("R1", "off")]["lokasi"]["n_lokasi_total"] >= 6   # titik berjarak 378 m: tiap lokasi 1 titik
    assert h[("R9_1.0", "off")]["kejadian_gabung"]["n_lokasi_ya"] >= 0 and h[("R9_2" if False else "R9_0.5", "off")]["lokasi"]["n_lokasi_total"] >= 3
    assert "R0a" not in {k[0] for k in h}
    ti = tingkat(E, B=30)
    assert ti["n_target"] == 1 and ti["aturan"]["px24>=5"]["POD"] == 1.0 and ti["aturan"]["px24>=5"]["FAR"] == 0.0 and ti["aturan"]["px24>=30"]["POD"] == 0.0
    assert gabung_pecah(E)["n_cluster_ge100"] == 0
    # keputusan: calon memenuhi syarat vs tidak
    def dd(dp, lo, dr, dtd):
        return {"selisih_vs_R0": {"presisi_kejadian": {"selisih": dp, "ci95": [lo, dp + 0.1]}, "recall_semua": {"selisih": dr}, "keterlambatan_median_hari": {"selisih": dtd}}}
    assert keputusan({"R3": {"off": dd(0.1, 0.02, -0.03, 0)}})["putusan"] == "ganti R0 dengan R3 penyaring=off"
    for x in (dd(0.1, -0.01, -0.03, 0), dd(0.1, 0.02, -0.08, 0), dd(0.1, 0.02, -0.03, 1)):
        assert keputusan({"R3": {"off": x}})["putusan"] == "pertahankan R0"
    # setel ulang ambang
    kl = [tandai([_pk(0.4 * i) for i in range(n)]) for n in (1, 2, 3, 4, 5, 6)]
    a, tab = setel_ambang(kl, 0.5)
    assert tab[1] == 1.0 and tab[4] == 0.5 and a == 4, tab
    # R8: CV berkelompok memulihkan sinyal sederhana
    r = np.random.default_rng(3)
    X = r.normal(size=(300, 3))
    y = (X[:, 0] + 0.3 * r.normal(size=300) > 0).astype(float)
    yy = cv_logit(X, y, [str(i % 7) for i in range(300)], 0.5)
    assert abs(yy.mean() - 0.5) < 0.1 and (yy == (y == 1)).mean() > 0.75
    # lapangan: wrangler sintetis + FIRMS injeksi
    dibuat = int(dt.datetime(2026, 9, 3, 6, tzinfo=dt.timezone.utc).timestamp() * 1000)
    baris = [{"id": "t1", "prov": "62", "lat": 0.0, "lon": 110.0, "dibuat": dibuat, "hasil": "api_ada"}, {"id": "t2", "prov": "62", "lat": -5.0, "lon": 115.0, "dibuat": dibuat, "hasil": "bukan_api"},
             {"id": "t3", "prov": "16", "lat": 1.0, "lon": 111.0, "dibuat": 1, "hasil": "sudah_padam", "luas_ha": 0}, {"id": "t4", "prov": "16", "lat": 1.0, "lon": 111.0, "dibuat": 1, "hasil": "sudah_padam", "luas_ha": 5}]
    tg, dk = tugas_dari_baris(baris)
    assert len(tg) == 3 and dk == {"sudah_padam_tanpa_bekas_diketahui": 1} and [t["y"] for t in tg] == [True, False, True]
    awal = dt.datetime(2026, 9, 3, 0, tzinfo=dt.timezone.utc)

    def palsu_firms(t):
        return {"t1": lambda: [_p(lat=0.0, lon=110.0 + 0.0034 * i, jam=3, t0=awal) for i in range(5)], "t2": lambda: [_p(lat=-5.0, lon=115.0, t0=awal)]}.get(t["id"], lambda: [])()
    import tempfile
    ol = evaluasi_lapangan(tg, palsu_firms, None, B=50, cache=tempfile.mkdtemp(), minimal=1)
    assert ol["n_tugas"] == 3 and ol["n_tanpa_cluster_firms"] == 1
    assert ol["aturan"]["R0"]["off"]["presisi"] == 1.0 and ol["aturan"]["R0"]["off"]["n_ya"] == 1
    assert ol["aturan"]["R2"]["off"]["presisi"] == 0.5 and ol["aturan"]["R2"]["off"]["ketahanan_positif"] == 0.5
    assert ol["n_gagal_tarik_firms"] == 0
    ol3 = evaluasi_lapangan(tg, palsu_firms, None, B=50, cache=tempfile.mkdtemp())      # n_tugas 3 < 5: semua disembunyikan
    assert ol3["aturan"] == {} and "n terlalu kecil" in ol3["disembunyikan"]
    # S2: n kecil disembunyikan
    ol2 = evaluasi_lapangan(tg[:2], palsu_firms, None, B=50, cache=tempfile.mkdtemp())
    assert ol2["aturan"] == {} and ol2["n_positif"] is None
    ol4 = sembunyikan_kecil(json.loads(json.dumps(ol)), 2)                               # n_ya R0 = 1 < 2
    assert ol4["aturan"]["R0"]["off"]["presisi"] is None and ol4["aturan"]["R0"]["off"]["catatan"] == "n terlalu kecil" and ol4["aturan"]["R2"]["off"]["presisi"] == 0.5
    # B1: kegagalan tarik FIRMS tidak membocorkan kunci/URL/bbox ke stderr, hanya kelas galat
    import contextlib, io as _io
    def meledak(t):
        raise RuntimeError("HTTP 500 https://firms.modaps.eosdis.nasa.gov/api/area/csv/RAHASIA123/X/1,2,3,4/1/2026-01-01")
    err = _io.StringIO()
    with contextlib.redirect_stderr(err):
        og = evaluasi_lapangan(tg, meledak, None, B=20, cache=tempfile.mkdtemp())
    assert og["n_gagal_tarik_firms"] == 3 and "RAHASIA123" not in err.getvalue() and "1,2,3,4" not in err.getvalue() and "RuntimeError" in err.getvalue()
    # H2: cache lapangan bukan di bawah data/raw
    assert "data/raw" not in cache_lapangan()
    # penyaring wilayah: titik Australia/Malaysia/PNG/Timor-Leste/laut dibuang, titik Indonesia dipertahankan
    class _W:
        def cari(self, lo, la):
            return ("62",) if (-8 < la < 5 and 95 < lo < 141 and (la, lo) != (2.0, 113.0)) else None
    asing = [(-11.49, 130.25, "Australia utara"), (2.0, 113.0, "Malaysia/Brunei (Sabah, Sarawak)"), (-5.0, 142.0, "Papua Nugini"), (-8.8, 126.0, "Timor-Leste"), (5.0, 120.0, "Filipina selatan")]
    for la, lo, nm in asing:
        assert kotak_kasar(la, lo) == nm, (la, lo, kotak_kasar(la, lo))
    ps = [_p(lat=la, lon=lo) for la, lo, _ in asing] + [_p(lat=-2.2, lon=113.9), _p(lat=0.5, lon=110.0)]
    dalam, inf = saring_wilayah(ps, _W())
    assert inf["titik_dibuang"] == 5, inf
    assert all(-8 < p["lat"] < 5 for p in dalam) and len(dalam) == inf["titik_dipakai"] and inf["titik_masuk"] == 7 and inf["dibuang_per_kotak_kasar"]
    try:
        from wilayah import Wilayah
        W = Wilayah()
    except Exception:
        W = None
    if W:   # poligon provinsi nyata: Australia utara, Sabah, Timor-Leste, PNG dibuang; Palangka Raya dan Palembang dipertahankan
        pp = [_p(lat=-11.49, lon=130.25), _p(lat=5.9, lon=116.1), _p(lat=-8.55, lon=125.57), _p(lat=-6.0, lon=143.0), _p(lat=-2.21, lon=113.92), _p(lat=-2.98, lon=104.75)]
        d2, i2 = saring_wilayah(pp, W)
        assert [round(p["lat"], 2) for p in d2] == [-2.21, -2.98] and i2["titik_dibuang"] == 4, i2
        ct2 = citra_dari_sel(np.array([int(kunci_sel([-2.21], [113.92])[0]), int(kunci_sel([-11.49], [130.25])[0])]), np.full(2, 1.2))
        c3, i3 = saring_citra(ct2, W)
        assert len(c3.ha) == 1 and i3["petak_dibuang_luar_wilayah"] == 1 and c3.sel_pid.max() == 0
    # lapangan memakai penyaring wilayah yang sama
    ol5 = evaluasi_lapangan(tg, lambda t: [_p(lat=-11.49, lon=130.25, t0=awal)], None, B=20, cache=tempfile.mkdtemp(), minimal=1, wilayah=_W())
    assert ol5["penyaring_wilayah"]["titik_dibuang"] == 3 and ol5["n_tanpa_cluster_firms"] == 3
    # tulis/ringkas tanpa menyentuh berkas produksi
    h = {"citra": {"himpunan": {"n_snpp_n20": {"aturan": {"R2": {"off": dd(-0.5, -0.6, 0, 0)}}, "titik_lemah_R0": {"x": 1}}}}}
    assert ringkas_keputusan(h)["putusan"] == "pertahankan R0"
    print("ujibanding_firespot: uji lolos")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["citra"]:
        kw = {}
        for i, x in enumerate(a):
            if x == "--tahun":
                kw["tahun"] = int(a[i + 1])
            elif x == "--maks-menit":
                kw["maks_menit"] = float(a[i + 1])
            elif x == "--maks-petak":
                kw["maks_petak"] = int(a[i + 1])
        h = muat_hasil()
        h["citra"] = mode_citra(**kw)
        tulis(h)
        cetak(h)
    elif a[:1] == ["lapangan"] and len(a) > 1:
        h = muat_hasil()
        h["lapangan"] = mode_lapangan(a[1])
        tulis(h)
        cetak(h)
    elif a[:1] == ["ringkas"]:
        h = muat_hasil()
        if not h:
            sys.exit("belum ada " + KELUAR)
        h["keputusan"] = ringkas_keputusan(h)
        cetak(h)
        if "--tulis" in a:
            tulis(h)
    else:
        sys.exit(__doc__)
