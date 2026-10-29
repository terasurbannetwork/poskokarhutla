"""Citra sebelum-sesudah untuk bukti DAS hulu: Sentinel-2 (tutupan hulu) dan Sentinel-1 (genangan banjir besar).

Pakai:  python3 scripts/banjir/citra_banjir.py                 # semua daerah di public/banjir/data/bukti/index.json
        python3 scripts/banjir/citra_banjir.py "32|Bogor" "11|Aceh Selatan"   # daerah tertentu (boleh beberapa proses paralel)
        python3 scripts/banjir/citra_banjir.py uji             # uji fungsi murni (luring)
Jalankan sesudah bukti_das.py, manual dan jarang (banjir.yml: workflow_dispatch input `bukti`). Hasil: PNG di public/banjir/data/bukti/citra/ dan blok "citra" di <slug>.json.

- Sentinel-2 L2A (Earth Search / Element84, COG terbuka, pola scripts/data/citra.py): kotak 12 km di sel 5 km tempat hutan hilang terbanyak
  sejak 2021 di dalam DAS (titik_hilang). "Sebelum" = adegan paling bersih (awan terendah, kotak tertutup penuh) Jun 2019 - Okt 2020;
  "sesudah" = yang paling bersih 14 bulan terakhir. Warna asli (TCI).
- Sentinel-1 RTC (Microsoft Planetary Computer, token SAS anonim dari API-nya, COG float32): untuk kejadian banjir DIBI terbesar
  (terdampak + pengungsi) sejak 2017 di kabupaten itu. "Sesudah" = pengamatan pertama 0-12 hari setelah tanggal kejadian,
  "sebelum" = pengamatan terakhir 8-45 hari sebelumnya pada orbit relatif yang sama bila ada. VV dalam dB, gelap = air / permukaan licin.
  Persen "gelap baru" = piksel yang < -17 dB sesudah tapi >= -17 dB sebelum; ini indikasi radar, BUKAN luas banjir resmi (sawah berair,
  bayangan lereng, angin ikut terhitung).
Sumber tak tersedia atau tak ada adegan yang memenuhi syarat: bagian itu dilewati, skrip tetap keluar 0 dan berkas lama dipertahankan.
Tiap PNG <= 120 KB.
"""
import array, datetime as dt, json, math, os, struct, sys, time, urllib.request, zlib
from itertools import accumulate

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../data"))
from umum import simpan  # noqa: E402
import bukti_das as B  # noqa: E402
import citra as C  # noqa: E402
import konsesi_citra as K  # noqa: E402

PX_S2, KM_S2 = 320, 12
PX_S1, KM_S1 = 320, 16
AMBANG_DB = -17.0
PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
PC_SAS = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel1euwestrtc/sentinel1-grd-rtc"
MAKS_PNG = 115_000
DIR = os.path.join(B.KELUAR, "citra")


def stac(url, q):
    return json.loads(C.ambil(url, data=json.dumps(q).encode()))["features"]


# ---------------------------------------------------------------- Sentinel-2
def awan_kotak(item, lat, lon, km):
    """(% awan di kotak, % tanpa data) dari SCL 60 x 60; None bila gagal"""
    c = C.COG(item["assets"]["scl"]["href"])
    x0, y0, r0, kiri, atas = K.jendela(item, "scl", lat, lon, km)
    v = c.contoh(0, x0, y0, r0, kiri, atas, km * 1000, 60)[0]
    kosong = sum(1 for x in v if x == 0)
    sah = len(v) - kosong
    return (100 * sum(1 for x in v if x in (3, 8, 9, 10)) / sah if sah else 100), 100 * kosong / len(v)


def terbaik_s2(lat, lon, dari, sampai):
    bb = C.kotak(lat, lon, KM_S2)
    cand = stac(C.STAC, {"collections": ["sentinel-2-l2a"], "bbox": [lon - .001, lat - .001, lon + .001, lat + .001], "limit": 60,
                         "datetime": f"{dari}T00:00:00Z/{sampai}T23:59:59Z", "query": {"eo:cloud_cover": {"lt": 40}},
                         "sortby": [{"field": "properties.eo:cloud_cover", "direction": "asc"}]})
    for it in cand[:8]:
        if not C.menutup(it["geometry"], bb):
            continue
        try:
            aw, ko = awan_kotak(it, lat, lon, KM_S2)
        except Exception as e:
            print("   skor gagal", it["id"], e, file=sys.stderr)
            continue
        if ko < 5 and aw < 12:
            return it, round(aw)
    return None, None


def gambar_tci(item, lat, lon, berkas):
    c = C.COG(item["assets"]["visual"]["href"])
    x0, y0, r0, kiri, atas = K.jendela(item, "visual", lat, lon, KM_S2)
    tc = c.contoh(C.level_untuk(c, r0, KM_S2 * 1000 / PX_S2), x0, y0, r0, kiri, atas, KM_S2 * 1000, PX_S2)
    tc = [array.array("B", (min(255, int(v * 1.15)) for v in b)) for b in tc]
    open(berkas, "wb").write(C.png(tc, PX_S2, MAKS_PNG))


def s2(d):
    ll = d.get("titik_hilang")
    if not ll:
        return None
    lat, lon = ll
    hari = dt.date.today()
    keluar = {"lat": lat, "lon": lon, "km": KM_S2}
    for nama, (a, b) in (("sebelum", ("2019-06-01", "2020-10-31")), ("sesudah", ((hari - dt.timedelta(days=425)).isoformat(), hari.isoformat()))):
        it, aw = terbaik_s2(lat, lon, a, b)
        if not it:
            print(f"   S2 {nama}: tak ada adegan bersih {a}..{b}", file=sys.stderr)
            return None
        tgl = it["properties"]["datetime"][:10]
        f = f"{d['slug']}_s2_{nama}_{tgl.replace('-', '')}.png"
        gambar_tci(it, lat, lon, os.path.join(DIR, f))
        keluar[nama] = {"tgl": tgl, "awan": aw, "berkas": "citra/" + f, "adegan": it["id"]}
    keluar["bbox"] = C.kotak(lat, lon, KM_S2)
    return keluar


# ---------------------------------------------------------------- Sentinel-1
def token_sas():
    return json.loads(C.ambil(PC_SAS))["token"]


def buka_float_pred3(raw, w, h):
    """ubin float32 deflate + prediktor 3 (titik-mengambang): urungkan selisih byte per baris lalu susun ulang bidang byte -> array('f')"""
    a = bytearray(zlib.decompress(raw))
    assert sys.byteorder == "little"
    rl = w * 4
    keluar = bytearray(len(a))
    for y in range(h):
        baris = bytes(accumulate(a[y * rl:(y + 1) * rl], lambda p, q: (p + q) & 255))
        o = keluar[y * rl:(y + 1) * rl]
        o[3::4], o[2::4], o[1::4], o[0::4] = baris[0:w], baris[w:2 * w], baris[2 * w:3 * w], baris[3 * w:4 * w]
        keluar[y * rl:(y + 1) * rl] = o
    f = array.array("f")
    f.frombytes(bytes(keluar))
    return f


def contoh_s1(item, token, lat, lon, km, n):
    """n x n nilai VV (linear, None = tanpa data) di kotak km x km"""
    a = item["assets"]["vv"]
    url = a["href"] + "?" + token
    c = C.COG(url)
    epsg = item["properties"]["proj:epsg"]
    tr = item["properties"]["proj:transform"]
    E, N = C.ke_utm(lat, lon, epsg % 100)
    kiri, atas = E - km * 500, N + km * 500
    lv = C.level_untuk(c, tr[0], km * 1000 / n)
    t = c.ifd[lv]
    W, H, T = t[256], t[257], t[322]
    r = tr[0] * c.ifd[0][256] / W
    langkah = km * 1000 / n
    kol = [int((kiri + (j + .5) * langkah - tr[2]) / r) for j in range(n)]
    bar = [int((tr[5] - (atas - (i + .5) * langkah)) / r) for i in range(n)]
    tx = math.ceil(W / T)
    off, cnt = t[324], t[325]
    perlu = {(y // T, x // T) for y in bar for x in kol if 0 <= y < H and 0 <= x < W}
    from concurrent.futures import ThreadPoolExecutor

    def satu(yx):
        k = yx[0] * tx + yx[1]
        return yx, (buka_float_pred3(C.ambil(url, (off[k], off[k] + cnt[k])), T, T) if cnt[k] else None)
    with ThreadPoolExecutor(8) as ex:
        ubin = dict(ex.map(satu, perlu))
    out = []
    for y in bar:
        for x in kol:
            u = ubin.get((y // T, x // T)) if 0 <= y < H and 0 <= x < W else None
            v = u[(y % T) * T + x % T] if u else None
            out.append(v if v is not None and v > 0 and v == v else None)
    return out


def ke_db(v):
    return None if v is None else 10 * math.log10(v)


def abu(db):
    """dB -> 0..255 (-25..0 dB)"""
    return array.array("B", (0 if v is None else max(1, min(255, int((v + 25) / 25 * 255))) for v in db))


def gelap_baru(sebelum, sesudah):
    """% piksel sah yang < AMBANG_DB sesudah tetapi >= AMBANG_DB sebelum, dan % sah"""
    sah = [(a, b) for a, b in zip(sebelum, sesudah) if a is not None and b is not None]
    if not sah:
        return None, 0
    return 100 * sum(1 for a, b in sah if b < AMBANG_DB <= a) / len(sah), 100 * len(sah) / len(sebelum)


def kejadian_terbesar(kab_kunci, minimal="2017-01-01"):
    p, nama = kab_kunci.split("|")
    ev = [e for e in B.baca_json("public/banjir/data/kejadian.json")["kejadian_dibi"]
          if e["prov"] == p and e["kab"] == nama and e["jenis"].startswith("banjir") and minimal <= e["tanggal"]
          and e["tanggal"] <= (dt.date.today() - dt.timedelta(days=7)).isoformat()]
    return max(ev, key=lambda e: (e["terdampak"] or 0) + 3 * (e["mengungsi"] or 0), default=None)


def s1(d):
    ev = kejadian_terbesar(d["kunci"])
    if not ev or (ev["terdampak"] or 0) + (ev["mengungsi"] or 0) == 0:
        print("   S1: tak ada kejadian berdampak", file=sys.stderr)
        return None
    lat, lon = d["keluaran"]["lat"], d["keluaran"]["lon"]
    t0 = dt.date.fromisoformat(ev["tanggal"])
    bb = [lon - .002, lat - .002, lon + .002, lat + .002]
    sesudah = stac(PC_STAC, {"collections": ["sentinel-1-rtc"], "bbox": bb, "limit": 20, "datetime": f"{t0}T00:00:00Z/{t0 + dt.timedelta(days=12)}T23:59:59Z",
                             "sortby": [{"field": "properties.datetime", "direction": "asc"}]})
    sebelum = stac(PC_STAC, {"collections": ["sentinel-1-rtc"], "bbox": bb, "limit": 30, "datetime": f"{t0 - dt.timedelta(days=45)}T00:00:00Z/{t0 - dt.timedelta(days=8)}T23:59:59Z",
                             "sortby": [{"field": "properties.datetime", "direction": "desc"}]})
    sesudah = [i for i in sesudah if i["properties"]["datetime"][:10] >= ev["tanggal"]]   # tidak pernah lebih awal dari kejadian
    sebelum = [i for i in sebelum if i["properties"]["datetime"][:10] < ev["tanggal"]]
    if not sesudah or not sebelum:
        print(f"   S1: adegan {len(sebelum)} sebelum / {len(sesudah)} sesudah {ev['tanggal']}", file=sys.stderr)
        return None
    orb = lambda i: i["properties"].get("sat:relative_orbit")
    pasangan = next(((a, b) for b in sesudah for a in sebelum if orb(a) == orb(b)), None)
    if not pasangan:
        print("   S1: tak ada pasangan orbit sama", file=sys.stderr)
        return None
    a, b = pasangan
    tok = token_sas()
    va, vb = [contoh_s1(i, tok, lat, lon, KM_S1, PX_S1) for i in (a, b)]
    da, db = [ke_db(v) for v in va], [ke_db(v) for v in vb]
    pg, sah = gelap_baru(da, db)
    if pg is None or sah < 50:
        print(f"   S1: piksel sah {sah:.0f}% < 50%", file=sys.stderr)
        return None
    keluar = {"lat": lat, "lon": lon, "km": KM_S1, "bbox": C.kotak(lat, lon, KM_S1), "ambang_db": AMBANG_DB,
              "kejadian": {"tanggal": ev["tanggal"], "terdampak": ev["terdampak"], "mengungsi": ev["mengungsi"], "meninggal": ev.get("meninggal", 0)},
              "gelap_baru_persen": round(pg, 1), "sah_persen": round(sah)}
    for nama, it, dbv in (("sebelum", a, da), ("sesudah", b, db)):
        tgl = it["properties"]["datetime"][:10]
        f = f"{d['slug']}_s1_{nama}_{tgl.replace('-', '')}.png"
        g = abu(dbv)
        open(os.path.join(DIR, f), "wb").write(C.png([g, g, g], PX_S1, MAKS_PNG))
        keluar[nama] = {"tgl": tgl, "berkas": "citra/" + f, "adegan": it["id"], "orbit": orb(it)}
    return keluar


# ---------------------------------------------------------------- jalan
def s1_sah(c):
    return c["sesudah"]["tgl"] >= c["kejadian"]["tanggal"] and c["sebelum"]["tgl"] < c["kejadian"]["tanggal"]


def kerjakan(d):
    """S2 yang sudah ada dipakai ulang (CITRA_ULANG=1 memaksa ulang); S1 dihitung ulang bila belum ada atau melanggar urutan tanggal"""
    os.makedirs(DIR, exist_ok=True)
    citra = dict(d.get("citra") or {})
    ulang = os.environ.get("CITRA_ULANG") == "1"
    for kunci, fn in (("s2", s2), ("s1", s1)):
        if not ulang and citra.get(kunci) and (kunci == "s2" or s1_sah(citra[kunci])):
            continue
        for n in ("sebelum", "sesudah"):   # berkas lama yang diganti dibuang supaya tidak yatim
            f = os.path.join(B.KELUAR, ((citra.get(kunci) or {}).get(n) or {}).get("berkas", "x"))
            if citra.get(kunci) and os.path.isfile(f):
                os.remove(f)
        citra.pop(kunci, None)
        try:
            r = fn(d)
        except Exception as e:
            print(f"   {kunci} gagal: {e}", file=sys.stderr)
            r = None
        if r:
            citra[kunci] = r
    citra["gambar"] = [c[n]["berkas"] for c in (citra.get("s2"), citra.get("s1")) if c for n in ("sebelum", "sesudah")]
    citra["dibuat"] = dt.date.today().isoformat()
    return citra


def uji():
    w = 3
    # prediktor 3: bangun ubin 3 x 3 float32 lalu enkode manual (susun bidang byte + selisih) dan harapkan nilai kembali
    nilai = [0.1, 0.05, 0.2, 0.0123, 0.5, 0.9, 1.5, 0.0008, 0.3]
    mentah = b"".join(struct.pack("<f", v) for v in nilai)
    baris = []
    for y in range(w):
        bs = mentah[y * 12:(y + 1) * 12]
        bidang = bytes(bs[i * 4 + k] for k in (3, 2, 1, 0) for i in range(w))
        baris.append(bytes([bidang[0]] + [(bidang[i] - bidang[i - 1]) & 255 for i in range(1, len(bidang))]))
    keluar = buka_float_pred3(zlib.compress(b"".join(baris)), w, w)
    assert all(abs(a - b) < 1e-7 for a, b in zip(keluar, nilai)), f"prediktor 3 salah: {list(keluar)} != {nilai}"
    p, s = gelap_baru([-10, -10, -20, None], [-25, -10, -25, -25])
    assert (round(p, 1), round(s)) == (33.3, 75), f"gelap_baru {p} {s}"
    assert gelap_baru([None], [-20]) == (None, 0), "tanpa piksel sah harus None"
    ok = {"kejadian": {"tanggal": "2025-02-27"}, "sebelum": {"tgl": "2025-02-10"}, "sesudah": {"tgl": "2025-02-27"}}
    assert s1_sah(ok) and not s1_sah({**ok, "sesudah": {"tgl": "2025-02-26"}}), "sesudah harus >= tanggal kejadian"
    g = abu([-30, -25, 0, None])
    assert list(g) == [1, 1, 255, 0], f"abu {list(g)}"
    print("uji citra_banjir: lolos", file=sys.stderr)


def main(a):
    if a[:1] == ["uji"]:
        return uji()
    idx = json.load(open(os.path.join(B.KELUAR, "index.json")))
    for e in idx["daerah"]:
        if a and e["kunci"] not in a:
            continue
        p = os.path.join(B.KELUAR, e["slug"] + ".json")
        d = json.load(open(p))
        print("==", e["kunci"], file=sys.stderr)
        d["citra"] = kerjakan(d)
        B.validasi(d)
        simpan(p, d)
        # baca ulang indeks tiap kali: beberapa proses boleh jalan paralel dengan daftar daerah berbeda
        baru = json.load(open(os.path.join(B.KELUAR, "index.json")))
        for x in baru["daerah"]:
            if x["kunci"] == e["kunci"]:
                x["citra"] = bool(d["citra"].get("s1") or d["citra"].get("s2"))
        simpan(os.path.join(B.KELUAR, "index.json"), baru)
    B.uji()


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
        sys.exit(0)
    try:
        main(sys.argv[1:])
    except Exception as e:  # tidak pernah menggagalkan pemanggil (pola citra.py)
        print("citra_banjir: dilewati:", e, file=sys.stderr)
