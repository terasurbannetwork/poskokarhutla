"""Faktor A4 (H20): angin 850 hPa menabrak lereng -> fluks orografi per kabupaten-hari.

Pakai:
  python3 scripts/banjir/faktor_orografi.py                    harian: Open-Meteo ECMWF IFS -> public/banjir/data/faktor_orografi.json
                                                               + arsip append-only data/raw/banjir/orografi/arsip_YYYY-MM.jsonl
  python3 scripts/banjir/faktor_orografi.py uji                swauji luring (fixture respons Open-Meteo ASLI di data/)
  python3 scripts/banjir/faktor_orografi.py medan              SEKALI: tabel medan -> scripts/banjir/data/medan_orografi.json
  python3 scripts/banjir/faktor_orografi.py fixture            SEKALI: ambil ulang fixture uji (jaringan, 3 kabupaten)
  python3 scripts/banjir/faktor_orografi.py kasus 2026-11-13 2026-11-17   studi kasus dari historical-forecast API (BUKAN validasi)

Rumus (docs/hidromet-jam/ALGORITMA.md A4), per kabupaten dan per jam:
  u = -ws sin(wd), v = -ws cos(wd)           (wd = arah ASAL angin; ws m/s)
  dorong_naik = rerata_sel maks(0, u*dh/dx + v*dh/dy) = ws * G(arah tuju)      m/s
  q850 = 622 e / (850 - 0,378 e)  g/kg, e = RH/100 * es(T850)  (Bolton); Open-Meteo tidak punya kelembapan spesifik 850 hPa
  fluks_orografi = dorong_naik * q850                                          g/kg*m/s
  fluks_maks_24j(D) = maks 24 jam hari D (00-23 WIB); fluks_jumlah_72j(D) = jumlah per jam D 00.00 .. D+2 23.00 WIB
G(arah) = rerata atas sel medan maks(0, e_arah . grad h), tabel 24 sektor 15 derajat di medan_orografi.json. Rerata POSITIF-per-sel,
bukan positif dari rerata vektor: rerata vektor lereng menghilang di punggungan (dua sisi saling meniadakan), padahal angin yang
menabrak sisi menghadap angin tetap memaksa udara naik. Penyimpangan dari kalimat A4 ini dicatat di PRAREG-OROGRAFI.md.

Medan: DEM SRTM 90 m yang SUDAH ada di repo (titik kisi faktor_kec, cache elevasi_topo.json, Open Topo Data), bukan unduhan baru;
bidang miring lokal dari <= 8 titik terdekat dalam 0,12 derajat (skala ~5-13 km, mendekati "dihaluskan ke 5 km" A4).
Python stdlib saja (3.12 di CI)."""
import datetime as dt, hashlib, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, WIB, ambil, baca, per_lokasi, simpan

AYAH = os.path.dirname(os.path.abspath(__file__))
MEDAN = os.path.join(AYAH, "data", "medan_orografi.json")
FIXTURE = os.path.join(AYAH, "data", "uji_orografi_open-meteo.json")
ARSIP = os.path.join(MENTAH, "orografi")
MODEL = "ecmwf_ifs025"
VAR = "wind_speed_850hPa,wind_direction_850hPa,relative_humidity_850hPa,temperature_850hPa"
API = "https://api.open-meteo.com/v1/forecast"
API_LALU = "https://historical-forecast-api.open-meteo.com/v1/forecast"
SEKTOR, LEBAR = 24, 15.0
PER_PANGGIL, JEDA = 100, 11   # 4 variabel x 7 hari per jam = bobot 1 per lokasi (rumus kuota hujan.py); 600/menit
HARI = 7
NEI, RMAKS = 8, 0.12


# ---------- fisika ----------
def q850(rh, t):
    """Kelembapan spesifik g/kg dari RH % dan T C pada 850 hPa."""
    e = rh / 100 * 6.112 * math.exp(17.67 * t / (t + 243.5))
    return 622 * e / (850 - 0.378 * e)


def tabel_g(G, wd):
    """G (24 sektor, arah tuju) diinterpolasi linear di arah tuju = wd + 180."""
    f = ((wd + 180) % 360) / LEBAR
    i = int(f) % SEKTOR
    w = f - int(f)
    return G[i] * (1 - w) + G[(i + 1) % SEKTOR] * w


def fluks(ws, wd, rh, t, G):
    """-> (dorong_naik m/s, q850 g/kg, fluks) atau None bila ada nilai kosong."""
    if None in (ws, wd, rh, t):
        return None
    d = ws * tabel_g(G, wd)
    return d * q850(rh, t)


def olah(d, G):
    """Satu lokasi Open-Meteo (hourly) -> (hari, maks_24j, jumlah_72j); hari tak lengkap atau ada jam kosong = None."""
    j = d["hourly"]
    f = [fluks(a, b, c, e, G) for a, b, c, e in zip(j["wind_speed_850hPa"], j["wind_direction_850hPa"],
                                                    j["relative_humidity_850hPa"], j["temperature_850hPa"])]
    hari = list(dict.fromkeys(t[:10] for t in j["time"]))
    per = {h: [x for t, x in zip(j["time"], f) if t[:10] == h] for h in hari}
    ok = lambda xs, n: len(xs) == n and None not in xs
    maks = [round(max(per[h]), 3) if ok(per[h], 24) else None for h in hari]
    j72 = []
    for i in range(len(hari)):
        w = [x for h in hari[i:i + 3] for x in per[h]]
        j72.append(round(sum(w), 2) if ok(w, 72) else None)
    return hari, maks, j72


# ---------- medan (sekali) ----------
def bidang(pt):
    """pt = [(lat, lon, z)] -> (gx, gy) m/m (timur, utara) dari kuadrat terkecil z = a + gx x + gy y, atau None bila kurang/lurus."""
    if len(pt) < 5:
        return None
    la0 = sum(p[0] for p in pt) / len(pt); lo0 = sum(p[1] for p in pt) / len(pt); z0 = sum(p[2] for p in pt) / len(pt)
    c = math.cos(math.radians(la0))
    xs = [(p[1] - lo0) * 111320 * c for p in pt]; ys = [(p[0] - la0) * 110570 for p in pt]; zs = [p[2] - z0 for p in pt]
    sxx = sum(x * x for x in xs); syy = sum(y * y for y in ys); sxy = sum(x * y for x, y in zip(xs, ys))
    sxz = sum(x * z for x, z in zip(xs, zs)); syz = sum(y * z for y, z in zip(ys, zs))
    det = sxx * syy - sxy * sxy
    if det <= 0.05 * ((sxx + syy) / 2) ** 2:   # titik nyaris segaris: arah lereng tegak lurusnya tak terukur
        return None
    return (sxz * syy - syz * sxy) / det, (syz * sxx - sxz * sxy) / det


def gradien_titik(titik):
    """titik = [(lat, lon, z, kab)] -> [(kab, gx, gy)] tiap titik dari NEI tetangga terdekat dalam RMAKS derajat (termasuk dirinya)."""
    sel = {}
    for p in titik:
        sel.setdefault((int(p[0] // RMAKS), int(p[1] // RMAKS)), []).append(p)
    out = []
    for p in titik:
        a, b = int(p[0] // RMAKS), int(p[1] // RMAKS)
        t = [q for i in (a - 1, a, a + 1) for j in (b - 1, b, b + 1) for q in sel.get((i, j), [])
             if abs(q[0] - p[0]) <= RMAKS and abs(q[1] - p[1]) <= RMAKS]
        t.sort(key=lambda q: (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2)
        g = bidang([q[:3] for q in t[:NEI]])
        if g:
            out.append((p[3], *g))
    return out


def bangun_medan():
    from bahaya import poligon_kec
    from faktor_kec import CACHE, kunci_titik, titik_semua
    jalur = os.path.join(CACHE, "elevasi_topo.json")
    elev = baca(jalur, {})
    titik = []
    for k, ts in titik_semua(poligon_kec()).items():
        for t in ts:
            z = elev.get(kunci_titik(t))
            if z is not None:   # SRTM null di atas air: dilewati, bukan 0
                titik.append((t[0], t[1], z, k.rsplit("|", 1)[0]))
    print(f"{len(titik)} titik bertinggi dari {len(elev)} di cache", file=sys.stderr)
    per = {}
    for kab, gx, gy in gradien_titik(titik):
        per.setdefault(kab, []).append((gx, gy))
    pusat = {}
    for p in titik:
        pusat.setdefault(p[3], []).append(p)
    kab = {}
    for k, ps in sorted(pusat.items()):
        g = per.get(k)
        if not g:
            continue
        la = sum(p[0] for p in ps) / len(ps); lo = sum(p[1] for p in ps) / len(ps)
        q = min(ps, key=lambda p: (p[0] - la) ** 2 + (p[1] - lo) ** 2)   # titik darat terdekat ke pusat (pusat bisa jatuh di laut)
        G = [round(sum(max(0, math.sin(math.radians(i * LEBAR)) * gx + math.cos(math.radians(i * LEBAR)) * gy)
                       for gx, gy in g) / len(g), 5) for i in range(SEKTOR)]
        kab[k] = {"lat": q[0], "lon": q[1], "n": len(g), "gx": round(sum(x for x, _ in g) / len(g), 5),
                  "gy": round(sum(y for _, y in g) / len(g), 5), "G": G}
    hilang = sorted({p[3] for p in titik} - set(kab))
    simpan(MEDAN, {"sumber": "SRTM 90 m, titik kisi faktor_kec (Open Topo Data), bidang lokal <=8 tetangga <=0,12 derajat",
                   "sha256_elevasi": hashlib.sha256(open(jalur, "rb").read()).hexdigest(), "sektor": SEKTOR,
                   "arti_G": "rerata sel maks(0, e . grad h), e = arah tuju angin (derajat searah jarum jam dari utara), m/m",
                   "tanpa_medan": hilang, "kab": kab})
    print(f"medan_orografi.json: {len(kab)} kabupaten, tanpa medan {len(hilang)}", file=sys.stderr)


# ---------- pengambilan ----------
def url(bagian, mulai=None, akhir=None):
    q = (f"latitude={','.join(str(b[0]) for b in bagian)}&longitude={','.join(str(b[1]) for b in bagian)}"
         f"&hourly={VAR}&models={MODEL}&wind_speed_unit=ms&timezone=Asia%2FJakarta")
    return f"{API_LALU}?{q}&start_date={mulai}&end_date={akhir}" if mulai else f"{API}?{q}&forecast_days={HARI}"


def semua(kab, mulai=None, akhir=None):
    """kab = {kunci: tabel} -> {kunci: (hari, maks, j72)}."""
    ks = sorted(kab)
    hasil = {}
    for a in range(0, len(ks), PER_PANGGIL):
        b = ks[a:a + PER_PANGGIL]
        for k, d in zip(b, per_lokasi(ambil(url([(kab[k]["lat"], kab[k]["lon"]) for k in b], mulai, akhir)))):
            hasil[k] = olah(d, kab[k]["G"])
        print(f"  {len(hasil)}/{len(ks)}", file=sys.stderr)
        if a + PER_PANGGIL < len(ks):
            time.sleep(JEDA)
    return hasil


def tulis_arsip(baris, hari_terbit):
    """Append-only: satu baris per (terbit_hari, kab); yang sudah ada TIDAK ditimpa dan berkas tidak ditulis ulang."""
    os.makedirs(ARSIP, exist_ok=True)
    jalur = os.path.join(ARSIP, f"arsip_{hari_terbit[:7]}.jsonl")
    ada = set()
    if os.path.exists(jalur):
        for s in open(jalur):
            r = json.loads(s)
            ada.add((r["terbit_hari"], r["kab"]))
    baru = [b for b in baris if (b["terbit_hari"], b["kab"]) not in ada]
    with open(jalur, "a") as f:
        for b in baru:
            f.write(json.dumps(b, ensure_ascii=False, separators=(",", ":")) + "\n")
    return len(baru)


def main():
    tab = baca(MEDAN)
    if not tab:
        sys.exit("medan_orografi.json belum ada: jalankan 'faktor_orografi.py medan' sekali")
    kab = tab["kab"]
    sekarang = dt.datetime.now(dt.timezone.utc)
    hasil = semua(kab)
    hari = next(iter(hasil.values()))[0]
    hari_terbit = sekarang.astimezone(WIB).date().isoformat()
    baris = [{"terbit": sekarang.strftime("%Y-%m-%dT%H:%MZ"), "terbit_hari": hari_terbit, "kab": k, "model": MODEL,
              "hari0": h[0][0], "maks_24j": h[1], "jumlah_72j": h[2]} for k, h in hasil.items()]
    n = tulis_arsip(baris, hari_terbit)
    simpan(os.path.join(KELUAR, "faktor_orografi.json"),
           {"terbit": baris[0]["terbit"], "terbit_hari": hari_terbit, "model": MODEL, "hari": hari,
            "satuan": "g/kg*m/s (maks 24 jam); g/kg*m/s*jam (jumlah 72 jam ke depan dari hari itu)",
            "kab": {k: {"m": h[1], "j": h[2]} for k, h in hasil.items()}})
    print(f"faktor_orografi.json: {len(hasil)} kabupaten; arsip +{n} baris", file=sys.stderr)


def ambil_fixture():
    tab = baca(MEDAN)["kab"]
    pilih = [k for w in ("Padang Pariaman", "Aceh Barat", "Badung") for k in sorted(tab) if k.split("|")[1] == w][:3]
    u = url([(tab[k]["lat"], tab[k]["lon"]) for k in pilih])
    simpan(FIXTURE, {"diambil": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "url": u, "kab": pilih, "respons": ambil(u)})
    print("fixture:", pilih, file=sys.stderr)


def kasus(mulai, akhir):
    tab = baca(MEDAN)["kab"]
    hasil = semua(tab, mulai, akhir)
    jalur = os.path.join(ARSIP, f"kasus_{mulai}_{akhir}.json")
    simpan(jalur, {"api": API_LALU, "model": MODEL, "catatan": "historical-forecast = rangkaian prakiraan terbaru tiap jam, BUKAN prakiraan sebelum hari target; studi kasus saja",
                   "kab": {k: {"hari": h[0], "maks_24j": h[1], "jumlah_72j": h[2]} for k, h in hasil.items()}})
    for i, tgl in enumerate(next(iter(hasil.values()))[0]):
        urut = sorted(((h[1][i], k) for k, h in hasil.items() if h[1][i] is not None), reverse=True)[:10]
        print(f"\n{tgl} 10 kabupaten fluks_maks_24j tertinggi")
        for r, (v, k) in enumerate(urut, 1):
            j = hasil[k][2][i]
            print(f"{r:2d}. {v:8.2f}  j72={'-' if j is None else f'{j:.0f}':>6}  {k}")


# ---------- uji ----------
def uji():
    # fisika
    assert abs(q850(100, 20) - 17.3) < 0.2, q850(100, 20)
    assert q850(0, 20) == 0
    G = [0.0] * SEKTOR
    G[6] = 0.1                                   # tuju 90 derajat (timur): lereng naik ke timur 0,1 m/m
    assert abs(tabel_g(G, 270) - 0.1) < 1e-12    # angin DARI barat bertiup ke timur
    assert tabel_g(G, 90) == 0 and abs(tabel_g(G, 277.5) - 0.05) < 1e-12 and abs(tabel_g(G, 262.5) - 0.05) < 1e-12
    f = fluks(10, 270, 100, 20, G)
    assert abs(f - 10 * 0.1 * q850(100, 20)) < 1e-9 and fluks(None, 270, 1, 1, G) is None
    # bidang miring murni: z naik 10 m/km ke timur dan 5 m/km ke utara
    pt = [(-1 + i * 0.02, 100 + j * 0.02, 0.0) for i in range(3) for j in range(3)]
    c = math.cos(math.radians(-1))
    pt = [(la, lo, 10 * (lo - 100) * 111.32 * c + 5 * (la + 1) * 110.57) for la, lo, _ in pt]
    gx, gy = bidang(pt)
    assert abs(gx - 0.010) < 1e-5 and abs(gy - 0.005) < 1e-5 and bidang(pt[:4]) is None
    assert bidang([(0, 100 + i * 0.01, i) for i in range(8)]) is None   # segaris
    # jendela: 3 hari sintetis, fluks konstan 1 -> maks 1, j72 = 72 hanya bila 3 hari penuh
    jam = [f"2026-01-0{d}T{h:02d}:00" for d in (1, 2, 3, 4) for h in range(24)]
    sint = {"hourly": {"time": jam, "wind_speed_850hPa": [10] * 96, "wind_direction_850hPa": [270] * 96,
                       "relative_humidity_850hPa": [100] * 96, "temperature_850hPa": [20] * 96}}
    hari, mk, j72 = olah(sint, G)
    f1 = 1.0 * q850(100, 20)
    assert hari[0] == "2026-01-01" and abs(mk[0] - f1) < 1e-2 and abs(j72[0] - 72 * f1) < 0.1 and j72[2:] == [None, None], (mk, j72)
    # arsip append-only
    import tempfile
    global ARSIP
    ARSIP, tmp = tempfile.mkdtemp(), ARSIP
    try:
        b = [{"terbit": "x", "terbit_hari": "2026-11-20", "kab": "k1"}, {"terbit": "x", "terbit_hari": "2026-11-20", "kab": "k2"}]
        assert tulis_arsip(b, "2026-11-20") == 2 and tulis_arsip(b + [{"terbit": "y", "terbit_hari": "2026-11-21", "kab": "k1"}], "2026-11-20") == 1
        assert len(open(os.path.join(ARSIP, "arsip_2026-11.jsonl")).readlines()) == 3
    finally:
        ARSIP = tmp
    # respons Open-Meteo ASLI tersimpan
    fx = json.load(open(FIXTURE))
    tab = json.load(open(MEDAN))["kab"]
    resp = per_lokasi(fx["respons"])
    assert len(resp) == len(fx["kab"]) == 3
    u = resp[0]["hourly_units"]
    assert u["wind_speed_850hPa"] == "m/s" and u["relative_humidity_850hPa"] == "%" and u["temperature_850hPa"] == "°C", u
    for k, d in zip(fx["kab"], resp):
        hari, mk, j72 = olah(d, tab[k]["G"])
        assert len(hari) == HARI and None not in mk and None not in j72[:HARI - 2] and j72[-2:] == [None, None], (k, mk, j72)
        assert all(x >= 0 for x in mk), mk
        j = d["hourly"]
        assert all(0 <= x < 80 for x in j["wind_speed_850hPa"]) and all(0 <= x <= 100 for x in j["relative_humidity_850hPa"])
        assert all(5 < x < 30 for x in j["temperature_850hPa"]), "T850 di Indonesia 10-22 C"
        assert max(mk) >= 0 and sum(1 for x in j72 if x) >= 5
    assert len(tab) >= 500 and all(len(v["G"]) == SEKTOR for v in tab.values())
    print("ok faktor_orografi", {k.split("|")[1]: round(max(olah(d, tab[k]["G"])[1]), 2) for k, d in zip(fx["kab"], resp)})


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["medan"]:
        bangun_medan()
    elif a == ["fixture"]:
        ambil_fixture()
    elif a[:1] == ["kasus"] and len(a) == 3:
        kasus(a[1], a[2])
    else:
        main()
