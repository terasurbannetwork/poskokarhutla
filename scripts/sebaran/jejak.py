"""Jejak api: ramalan jejak sebaran api (+24/+48/+72 jam) untuk tiap kompleks karhutla aktif -> public/data/jejak_api.json.

Mesin = model data yang sama dengan peramban (model_sebaran.json, GBDT sel 375 m; Python setara SebaranModel.ramal: jalan Monte Carlo,
fitur dari fitur.baris_sel). Keadaan awal tiap kompleks = deteksi VIIRS S-NPP (nominal/tinggi, 7 hari, hotspot.json) di kotak poligon
kompleks (kluster.json, id K#### sama dengan /sim/K####); sel aktif = terdeteksi <= 24 jam sebelum acuan data. Cuaca = Open-Meteo
prakiraan: public/data/cuaca/<sel 0,5>.json bila ada (cuaca_jam.py), selain itu diambil sendiri (cache per hari, anggaran MAKS_BOBOT).
Peluang sel = frekuensi kumulatif Monte Carlo (JEJAK_MC putaran, biji tetap per kompleks) -> resolusi 1/JEJAK_MC; hanya sel dengan
peluang >= AMBANG_P ditulis. Ini PRAKIRAAN MODEL, bukan pengamatan: kinerjanya di model_sebaran.json (kinerja_uji) & prospektif.json.

Setara SebaranModel.ramal (public/sebaran_model.js) KECUALI umur_jam: di sini umur sejak deteksi pertama kompleks (cocok dengan data latih),
di peramban JS umur mulai 0 pada titik awal. Perbedaan lain: batas sel aktif sumber calon (JEJAK_AKTIF, bawaan tanpa batas; kompleks yang kena batas diberi
"terpangkas": true dan tidak boleh dipakai untuk peringatan tertinggi). Tanpa p_lepas (model membesar untuk titik baru, bukan kompleks).
Urutan kompleks: level, lalu penduduk sekitar (WorldPop 0,25 derajat, 3x3 sel di sekitar pusat kompleks), lalu skor: untuk peringatan dini
yang diramal lebih dulu adalah api yang dekat orang. "cakupan" di JSON mencatat berapa kompleks aktif, berapa diramal, dan alasan dilewati.

Pakai:  python3 scripts/sebaran/jejak.py  |  ... uji        Stdlib saja. Boleh gagal di CI (titik.yml).
Env: JEJAK_MAKS (kompleks, 300) JEJAK_MC (20) JEJAK_DETIK (anggaran total, 900) JEJAK_BASI_JAM (12) JEJAK_AKTIF (0 = tanpa batas) JEJAK_KELUAR (berkas keluaran)
"""
import datetime as dt, json, math, os, random, sys, time, urllib.parse, zlib

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import cuaca  # noqa: E402
import gbdt as G  # noqa: E402
import prospektif as P  # noqa: E402  (gabung: hotspot.json -> baris; cuaca/ambil dipakai lagi)
from fitur import Seri, baris_sel, calon, fitur_peristiwa, terakhir  # noqa: E402
from umum import HA_SEL, MENTAH, PUBLIK, T0, pusat, sel  # noqa: E402

AMBANG_P = 0.05
HARI = 3
MAKS_KOMPLEKS = int(os.environ.get("JEJAK_MAKS", "300"))
N_MC = int(os.environ.get("JEJAK_MC", "20"))
ANGGARAN_DETIK = float(os.environ.get("JEJAK_DETIK", "900"))
BASI_JAM = float(os.environ.get("JEJAK_BASI_JAM", "12"))
KELUAR = os.environ.get("JEJAK_KELUAR", os.path.join(PUBLIK, "jejak_api.json"))
CAP_SEL = 3000  # sel per horizon per kompleks
MAKS_BYTE = 1_900_000
MAKS_AKTIF = int(os.environ.get("JEJAK_AKTIF", "0")) or 10 ** 9  # 0 = tanpa batas (diukur: batas 250 mengubah p sel sampai 0,45 di K0003 dan tidak lebih cepat)
MIN_MC = 8
DET_KOMPLEKS = 90.0  # detik maks satu kompleks (putaran MC dihentikan, minimal MIN_MC)
CACHE = os.path.join(MENTAH, "prospektif", "jejak_cuaca")  # ikut cache Actions 'prospektif-'
CUACA_JAM = os.path.join(PUBLIK, "cuaca")


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


# ---------------- cuaca ----------------
def _seri_dari(d):
    """berkas cuaca_jam.py {m0 ms, tc, rh, hujan, ws, wd} -> masukan Seri"""
    mulai = dt.datetime.fromtimestamp(d["m0"] / 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M")
    return {"lat": d["lat"], "lon": d["lon"], "mulai": mulai, **{k: d[k] for k in cuaca.KOLOM}}


def cuaca_sels(daftar, hari):
    """daftar sel 0,5 -> {sel: masukan Seri}. public/data/cuaca dulu; sisanya Open-Meteo (33 hari lalu + 4 ke depan), cache per hari."""
    out, perlu = {}, []
    os.makedirs(CACHE, exist_ok=True)
    for la, lo in daftar:
        for j in (os.path.join(CUACA_JAM, f"{la:.2f}_{lo:.2f}.json"), os.path.join(CACHE, f"{hari}_{la:.2f}_{lo:.2f}.json")):
            if os.path.exists(j):
                d = json.load(open(j))
                out[(la, lo)] = _seri_dari(d) if "m0" in d else d
                break
        else:
            perlu.append((la, lo))
    perlu = perlu[:int(P.MAKS_BOBOT // cuaca.bobot(33 + 4))]
    for a in range(0, len(perlu), 20):
        g = perlu[a:a + 20]
        q = {"latitude": ",".join(str(x[0]) for x in g), "longitude": ",".join(str(x[1]) for x in g), "hourly": ",".join(cuaca.VAR),
             "past_days": 33, "forecast_days": 4, "timezone": "GMT", "wind_speed_unit": "kmh"}
        try:
            d = cuaca.ambil(P.URL + "?" + urllib.parse.urlencode(q), coba=2, batas_waktu=120)
        except Exception as e:
            log("cuaca gagal:", e)
            break
        for (la, lo), r in zip(g, d if isinstance(d, list) else [d]):
            h = r["hourly"]
            c = {"lat": la, "lon": lo, "mulai": h["time"][0], **{k: h[v] for k, v in zip(cuaca.KOLOM, cuaca.VAR)}}
            json.dump(c, open(os.path.join(CACHE, f"{hari}_{la:.2f}_{lo:.2f}.json"), "w"))
            out[(la, lo)] = c
    batas = (dt.date.fromisoformat(hari) - dt.timedelta(days=3)).isoformat()
    for f in os.listdir(CACHE):
        if f[:10] < batas:
            os.remove(os.path.join(CACHE, f))
    return out


# ---------------- kompleks aktif & keadaan awal ----------------
def kotak(f, m=0.02):
    """kotak poligon kompleks (+ margin ~2 km) -> (x0, y0, x1, y1)"""
    g, p = f.get("geometry"), f["properties"]
    if g and g["type"] == "Polygon":
        xs = [c[0] for c in g["coordinates"][0]]
        ys = [c[1] for c in g["coordinates"][0]]
        return min(xs) - m, min(ys) - m, max(xs) + m, max(ys) + m
    return p["lon"] - 0.03, p["lat"] - 0.03, p["lon"] + 0.03, p["lat"] + 0.03


def penduduk_sekitar(grid, lat, lon, ps=.25):
    """jumlah penduduk di 3x3 sel 0,25 derajat di sekitar titik (grid: {(floor(lat/ps), floor(lon/ps)): n})"""
    gy, gx = math.floor(lat / ps), math.floor(lon / ps)
    return sum(grid.get((gy + dy, gx + dx), 0) for dy in (-1, 0, 1) for dx in (-1, 0, 1))


def kompleks_aktif(fitur_kluster, pend=None):
    """Aktif = punya deteksi 24 jam terakhir (n24 > 0, jam_sejak <= 24, level >= 2). SEMUA kompleks aktif dikembalikan, urut:
    level, lalu penduduk sekitar (lebih banyak dulu; pend={} = abaikan), lalu skor. Pemotongan ke JEJAK_MAKS dilakukan pemanggil."""
    pend = pend or {}
    a = [f for f in fitur_kluster if f["properties"].get("n24", 0) > 0 and f["properties"].get("jam_sejak", 99) <= 24
         and f["properties"].get("level", 0) >= 2]
    a.sort(key=lambda f: (-f["properties"]["level"], -penduduk_sekitar(pend, f["properties"]["lat"], f["properties"]["lon"]),
                          -(f["properties"].get("skor") or 0)))
    return a


def keadaan_awal(snpp, grid, f, t0):
    """deteksi S-NPP di kotak kompleks -> (terbakar, aktif{sel: menit terakhir}, pertama_menit, baru24, frp24, centroid aktif) atau None"""
    x0, y0, x1, y1 = kotak(f)
    rs = []
    for gx in range(math.floor(x0 / .05), math.floor(x1 / .05) + 1):
        for gy in range(math.floor(y0 / .05), math.floor(y1 / .05) + 1):
            for i in grid.get((gx, gy), ()):
                r = snpp[i]
                if x0 <= r[2] <= x1 and y0 <= r[1] <= y1 and r[0] <= t0:
                    rs.append(r)
    rs.sort(key=lambda r: r[0])
    ak, pertama, tb = {}, {}, set()
    for m, la, lo, _, _, _ in rs:
        k = sel(lo, la)
        tb.add(k)
        ak[k] = m
        pertama.setdefault(k, m)
    ak = {k: m for k, m in ak.items() if t0 - m <= 1440}
    if not ak:
        return None
    r24 = [r for r in rs if t0 - r[0] <= 1440]
    return {"tb": tb, "ak": ak, "t_awal": rs[0][0], "baru24": sum(1 for m in pertama.values() if t0 - m <= 1440),
            "frp": max(r[4] for r in r24), "lat": sum(r[1] for r in r24) / len(r24), "lon": sum(r[2] for r in r24) / len(r24)}


# ---------------- simulasi ----------------
def strata(prov, gambut):
    return "sabana" if prov in ("53", "93") and not gambut else "gambut" if gambut else "mineral"


def simulasi(M, K, S, A, prov, t0, n_mc, seed, batas_detik=1e9):
    """Monte Carlo kumulatif (setara SebaranModel.ramal tanpa deterministik). -> ({sel: [p24, p48, p72]}, [luas sel baru p50 per horizon], n_mc_efektif, terpangkas)"""
    fitur, bias, pohon, R = M["fitur"], M["bias"], M["pohon"], M.get("R", 5)
    tahun = (T0 + dt.timedelta(minutes=t0)).year
    tgl = T0 + dt.timedelta(minutes=t0)
    oni, dmi = terakhir(M["iklim"]["oni"], tgl.year, tgl.month), terakhir(M["iklim"]["dmi"], tgl.year, tgl.month)
    lon = A["lon"]
    geser = (M.get("geser_logit") or {}).get(strata(prov, K.sel(next(iter(A["tb"])), prov)["gambut"]), 0.0)
    W = [S.jendela(t0 + d * 1440) for d in range(HARI)]
    nilai = G.nilai_pohon

    pangkas = [False]

    def jalan(rnd):
        tb, ak, baru, b24, hasil = A["tb"], dict(A["ak"]), set(), A["baru24"], []
        for d in range(HARI):
            t = t0 + d * 1440
            semua = tb | baru
            jl = ((t + lon * 4) / 60) % 24
            ev = fitur_peristiwa(semua, ak, (t - A["t_awal"]) / 60, b24, oni, dmi, 0 if 6 <= jl < 18 else 1, A["frp"])
            sumber = ak
            if len(ak) > MAKS_AKTIF:  # hanya sel aktif dengan calon terbanyak jadi sumber calon; fitur tetap memakai semua sel aktif
                pangkas[0] = True
                def terbuka(a):
                    i, j = a % 14300, a // 14300
                    return sum(1 for dj in range(-2, 3) for di in range(-2, 3) if (j + dj) * 14300 + i + di not in semua)
                sumber = dict(sorted(ak.items(), key=lambda kv: -terbuka(kv[0]))[:MAKS_AKTIF])
            nb = set()
            for k, info in calon(semua, sumber, R).items():
                d_ = baris_sel(k, info, semua, ak, W[d], ev, K, prov, tahun)
                x = [d_[f] for f in fitur]
                if rnd.random() < G.sigmoid(bias + geser + sum(nilai(s, x) for s in pohon)):
                    nb.add(k)
            baru |= nb
            if nb:
                ak = {k: t + 1440 for k in nb}
            b24 = len(nb)
            hasil.append(set(baru))
        return hasil

    rnd, frek, luas, mulai = random.Random(seed), {}, [[] for _ in range(HARI)], time.time()
    n = 0
    while n < n_mc and (n < MIN_MC or time.time() - mulai < batas_detik):
        h = jalan(rnd)
        n += 1
        for d, x in enumerate(h):
            luas[d].append(len(x))
            for k in x:
                frek.setdefault(k, [0] * HARI)[d] += 1
    return {k: [v / n for v in f] for k, f in frek.items()}, [sorted(x)[len(x) // 2] for x in luas], n, pangkas[0]


# ---------------- keluaran ----------------
def susun(hasil, cap):
    """hasil: [{"id",..., "p": {sel: [p24,p48,p72]}, "luas": [...]}] -> daftar kompleks kontrak. Sel dipilih menurut p72 tertinggi (<= cap),
    jadi himpunan 24 jam subset 48 jam subset 72 jam (peluang kumulatif tidak turun)."""
    out = []
    for h in hasil:
        top = sorted(h["p"].items(), key=lambda kv: (-kv[1][-1], kv[0]))[:cap]
        hari = []
        for d in range(HARI):
            sl = [(k, v[d]) for k, v in top if v[d] >= AMBANG_P - 1e-9]
            sl.sort(key=lambda kv: -kv[1])
            hari.append({"jam": 24 * (d + 1), "p_maks": round(max([p for _, p in sl] or [0]), 2), "luas_p50_ha": round(h["luas"][d] * HA_SEL),
                         "sel": [[round(pusat(k)[1], 4), round(pusat(k)[0], 4), round(p, 2)] for k, p in sl]})
        out.append({k: v for k, v in h.items() if k not in ("p", "luas")} | {"hari": hari})
    return out


def periksa(doc):
    """Kontrak jejak_api.json; lempar AssertionError bila rusak (dipakai sebelum menulis dan di uji)."""
    for k in ("dibuat", "model", "sumber", "ambang_p", "kompleks", "cakupan", "acuan"):
        assert k in doc, f"kunci {k} hilang"
    assert doc["dibuat"].endswith("+07:00") and 0 < doc["ambang_p"] < 1 and isinstance(doc["kompleks"], list)
    cv = doc["cakupan"]
    assert cv["n_aktif"] >= 0 and cv["n_diramal"] == len(doc["kompleks"]), f"cakupan: n_diramal {cv['n_diramal']} != {len(doc['kompleks'])} kompleks"
    assert cv["n_diramal"] + sum(cv["dilewati"].values()) == cv["n_aktif"], f"cakupan: diramal + dilewati != aktif: {cv}"
    for c in doc["kompleks"]:
        for k in ("id", "nama", "prov", "lat", "lon", "titik_24j", "p_lepas", "hari"):
            assert k in c, f"{c.get('id')}: kunci {k} hilang"
        assert -12 < c["lat"] < 7 and 94 < c["lon"] < 142, f"{c['id']}: koordinat di luar Indonesia"
        assert c["p_lepas"] is None or 0 <= c["p_lepas"] <= 1
        assert isinstance(c.get("terpangkas"), bool), f"{c['id']}: terpangkas harus bool"
        assert [h["jam"] for h in c["hari"]] == [24, 48, 72], f"{c['id']}: horizon harus 24/48/72"
        lalu = {}
        for h in c["hari"]:
            assert 0 <= h["p_maks"] <= 1 and h["luas_p50_ha"] >= 0
            cur = {}
            for la, lo, p in h["sel"]:
                assert 0 <= p <= 1 and p >= doc["ambang_p"] - 1e-9, f"{c['id']}: p {p} di bawah ambang"
                cur[(la, lo)] = p
            assert len(cur) == len(h["sel"]), f"{c['id']}: sel ganda"
            assert max(cur.values(), default=0) == h["p_maks"], f"{c['id']}: p_maks tidak cocok"
            for s, p in lalu.items():
                assert s in cur and cur[s] >= p, f"{c['id']}: sel {s} {h['jam']} jam hilang/turun (kumulatif harus naik)"
            lalu = cur


def tulis(doc, jalur=KELUAR):
    """Pangkas bila > MAKS_BYTE (cap sel per horizon diturunkan bertahap), periksa kontrak, tulis atomik."""
    hasil, cap = doc.pop("_hasil", []), CAP_SEL
    while True:
        doc["kompleks"] = susun(hasil, cap)
        isi = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
        if len(isi) <= MAKS_BYTE or cap <= 50:
            break
        log(f"{len(isi)} B > {MAKS_BYTE}: cap sel per horizon {cap} -> {int(cap * .7)}")
        cap = int(cap * .7)
    periksa(doc)
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        f.write(isi)
    os.replace(jalur + ".tmp", jalur)
    return len(isi), cap


# ---------------- utama ----------------
def main():
    mulai = time.time()
    M = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))
    hs = json.load(open(os.path.join(PUBLIK, "hotspot.json")))
    D, a0 = P.gabung([], hs)
    t0 = int(max([r[0] for r in D if r[3] == "N"] or [a0]))  # acuan = deteksi VIIRS S-NPP terbaru yang dipakai; horizon dihitung dari sini
    umur_jam = (dt.datetime.now(dt.timezone.utc) - (T0 + dt.timedelta(minutes=t0))).total_seconds() / 3600
    wib = dt.timezone(dt.timedelta(hours=7))
    doc = {"dibuat": dt.datetime.now(wib).isoformat(timespec="seconds"), "model": f"model_sebaran v{M.get('versi')} ({M.get('dibuat')})",
           "sumber": "PRAKIRAAN model data (GBDT sel 375 m + cuaca prakiraan Open-Meteo, Monte Carlo), bukan pengamatan; kinerja di model_sebaran.json/prospektif.json",
           "ambang_p": AMBANG_P, "acuan": (T0 + dt.timedelta(minutes=t0)).isoformat(timespec="minutes"), "n_mc": N_MC, "status": "tanpa_kompleks",
           "kompleks": [], "cakupan": {}, "_hasil": []}
    pend = {}
    try:
        for la, lo, n, _ in json.load(open(os.path.join(PUBLIK, "penduduk.json")))["grid"]:
            k = (math.floor(la / .25), math.floor(lo / .25))
            pend[k] = pend.get(k, 0) + n
    except (OSError, ValueError, KeyError):
        log("penduduk.json tidak terbaca: urutan hanya level & skor")
    aktif = kompleks_aktif(json.load(open(os.path.join(PUBLIK, "kluster.json")))["features"], pend)
    dilewati = {}
    if umur_jam > BASI_JAM:
        doc["status"] = "data_basi"
        dilewati["data_basi"] = len(aktif)
        log(f"hotspot.json berumur {umur_jam:.1f} jam > {BASI_JAM}: tidak meramal")
    else:
        snpp = [r for r in D if r[3] == "N"]
        grid = {}
        for i, r in enumerate(snpp):
            grid.setdefault((math.floor(r[2] / .05), math.floor(r[1] / .05)), []).append(i)
        daftar = aktif[:MAKS_KOMPLEKS]
        dilewati["anggaran"] = len(aktif) - len(daftar)  # dipotong JEJAK_MAKS; yang kehabisan waktu ditambah di bawah
        from fitur import Konteks
        K = Konteks(bekas=False)
        C = cuaca_sels(sorted({cuaca.sel05(f["properties"]["lat"], f["properties"]["lon"]) for f in daftar}), (T0 + dt.timedelta(minutes=t0)).date().isoformat())
        for f in daftar:
            p = f["properties"]
            if time.time() - mulai > ANGGARAN_DETIK:
                dilewati["anggaran"] += 1
                continue
            c = C.get(cuaca.sel05(p["lat"], p["lon"]))
            A = keadaan_awal(snpp, grid, f, t0)
            if not c or not A:
                log(p["id"], "dilewati:", "cuaca tidak ada" if not c else "tanpa deteksi S-NPP 24 jam")
                alasan = "tanpa_cuaca" if not c else "tanpa_deteksi_24j"
                dilewati[alasan] = dilewati.get(alasan, 0) + 1
                continue
            S = Seri(c)
            if not S.cukup(t0, 72):
                log(p["id"], "dilewati: cuaca tidak mencakup 31 hari lalu + 72 jam ke depan")
                dilewati["tanpa_cuaca"] = dilewati.get("tanpa_cuaca", 0) + 1
                continue
            t1 = time.time()
            pc, luas, n, tp = simulasi(M, K, S, A, p["prov"], t0, N_MC, zlib.crc32(p["id"].encode()), DET_KOMPLEKS)
            log(f"{p['id']} aktif {len(A['ak'])} terbakar {len(A['tb'])} -> {len(pc)} sel, MC {n}, {time.time() - t1:.1f} dtk")
            doc["_hasil"].append({"id": p["id"], "nama": f"Kec. {p.get('kec', '?')}, Kab. {p.get('kab', '?')}", "prov": p["prov"], "lat": round(A["lat"], 4),
                                  "lon": round(A["lon"], 4), "titik_24j": p["n24"], "p_lepas": None, "terpangkas": tp, "n_mc": n, "p": pc, "luas": luas})
        if doc["_hasil"]:
            doc["status"] = "ok"
    doc["cakupan"] = {"n_aktif": len(aktif), "n_diramal": len(doc["_hasil"]), "dilewati": {k: v for k, v in dilewati.items() if v}}
    log("cakupan", json.dumps(doc["cakupan"]))
    n_byte, cap = tulis(doc)
    log(f"{KELUAR}: {len(doc['kompleks'])} kompleks, {n_byte} B, cap {cap}, {time.time() - mulai:.0f} dtk, status {doc['status']}")


def uji():
    """Pemeriksaan mandiri tanpa jaringan/data besar: kontrak, kumulatif, penolakan masukan buruk, hari kosong, simulasi kecil."""
    import copy, tempfile
    wib = dt.timezone(dt.timedelta(hours=7))
    dasar = {"dibuat": dt.datetime.now(wib).isoformat(timespec="seconds"), "model": "m", "sumber": "s", "ambang_p": AMBANG_P, "kompleks": [], "acuan": "2026-10-16T00:00+00:00",
             "cakupan": {"n_aktif": 0, "n_diramal": 0, "dilewati": {}}}
    periksa(dasar)  # hari kosong sah
    for kosong in (dict(dasar, _hasil=[]), ):  # tulis() menerima dokumen tanpa kompleks
        with tempfile.TemporaryDirectory() as d:
            n, _ = tulis(copy.deepcopy(kosong), os.path.join(d, "j.json"))
            assert json.load(open(os.path.join(d, "j.json")))["kompleks"] == [] and n > 0
    def buruk_cak(d, cv):
        d = dict(d, cakupan=cv)
        try:
            periksa(d)
        except AssertionError:
            return True
        return False
    # susun: sel top-p72 subset kumulatif, ambang, cap
    k1, k2, k3 = sel(110.0, -2.0), sel(110.004, -2.0), sel(110.008, -2.0)
    h = [{"id": "K0001", "nama": "Kec. X, Kab. Y", "prov": "62", "lat": -2.0, "lon": 110.0, "titik_24j": 3, "p_lepas": None,
          "terpangkas": False, "p": {k1: [.5, .6, .7], k2: [.0, .3, .4], k3: [.0, .0, .04]}, "luas": [1, 2, 3]}]
    ks = susun(h, 100)[0]
    assert [len(x["sel"]) for x in ks["hari"]] == [1, 2, 2] and ks["hari"][2]["p_maks"] == .7 and ks["hari"][0]["luas_p50_ha"] == round(HA_SEL)
    assert len(susun(h, 1)[0]["hari"][2]["sel"]) == 1
    doc = dict(dasar, kompleks=[ks], cakupan={"n_aktif": 3, "n_diramal": 1, "dilewati": {"anggaran": 1, "tanpa_cuaca": 1}})
    periksa(doc)
    assert buruk_cak(doc, {"n_aktif": 3, "n_diramal": 1, "dilewati": {"anggaran": 1}}), "diramal + dilewati harus = aktif"
    assert buruk_cak(doc, {"n_aktif": 1, "n_diramal": 0, "dilewati": {"anggaran": 1}}), "n_diramal harus = jumlah kompleks"
    # kontrak menolak: p di bawah ambang, p > 1, sel hilang di horizon lebih panjang, p turun, horizon salah, kunci hilang, luar Indonesia
    def buruk(f):
        d = copy.deepcopy(doc)
        f(d)
        try:
            periksa(d)
        except AssertionError:
            return True
        return False
    assert buruk(lambda d: d["kompleks"][0]["hari"][0]["sel"][0].__setitem__(2, .01))
    assert buruk(lambda d: d["kompleks"][0]["hari"][0]["sel"][0].__setitem__(2, 1.5))
    assert buruk(lambda d: d["kompleks"][0]["hari"][1]["sel"].pop(0))
    assert buruk(lambda d: d["kompleks"][0]["hari"][1]["sel"][0].__setitem__(2, .5) or d["kompleks"][0]["hari"][1].__setitem__("p_maks", .6))
    assert buruk(lambda d: d["kompleks"][0]["hari"].pop())
    assert buruk(lambda d: d["kompleks"][0].pop("id"))
    assert buruk(lambda d: d["kompleks"][0].__setitem__("lat", 40))
    assert buruk(lambda d: d.pop("sumber"))
    assert buruk(lambda d: d["kompleks"][0].pop("terpangkas")) and buruk(lambda d: d["kompleks"][0].__setitem__("terpangkas", "ya"))
    assert buruk(lambda d: d.pop("cakupan"))
    assert buruk(lambda d: d.__setitem__("dibuat", "2026-10-16T10:00:00Z"))
    # kompleks_aktif: n24 > 0, level >= 2, urut level lalu skor, batas jumlah
    fs = [{"properties": {"id": i, "n24": n, "jam_sejak": j, "level": lv, "skor": s, "lat": -2.0, "lon": 110.0 + dx}} for i, n, j, lv, s, dx in
          (("a", 5, 1, 2, 10, 0), ("b", 0, 1, 3, 99, 0), ("c", 5, 30, 3, 99, 0), ("d", 5, 1, 3, 1, 0), ("e", 5, 1, 1, 50, 0), ("f", 5, 2, 3, 7, 0),
           ("g", 5, 1, 3, 0, 5))]
    assert [f["properties"]["id"] for f in kompleks_aktif(fs)] == ["f", "d", "g", "a"], "tanpa data penduduk: level lalu skor"
    pend = {(math.floor(-2.0 / .25), math.floor(115.0 / .25)): 5000}  # hanya "g" (110 + 5) dekat penduduk
    assert [f["properties"]["id"] for f in kompleks_aktif(fs, pend)] == ["g", "f", "d", "a"], "dalam level yang sama: penduduk dulu, bukan skor"
    # simulasi kecil: lahan palsu, model satu pohon (dekat sel aktif -> peluang tinggi), cuaca datar 40 hari
    class K:
        def sel(self, k, prov):
            return {"gambut": 0, "hutan": 1, "produksi": 0, "apl": 0, "kebun": 0, "hti": 0, "hph": 0, "tambang": 0, "sanksi_th": 9999, "kanal_km": 0,
                    "jalan_km": 9, "desa_km": 9, "penduduk_km2": 0, "riwayat_f": 0}
    from fitur import FITUR_SEL
    M = {"fitur": FITUR_SEL, "bias": -1.0, "R": 5, "iklim": {"oni": {}, "dmi": {}}, "geser_logit": {"mineral": 0.0},
         "pohon": [[[0, 700.0, 1, 2], [2.0], [-3.0]]]}  # sel <= 700 m dari yang aktif: logit 1 (p .73); jauh: logit -4 (p .02)
    n = 40 * 24 + 96
    d = {"lat": -2.25, "lon": 110.25, "mulai": "2026-09-01T00:00", "tc": [30.0] * n, "rh": [60.0] * n, "hujan": [0.0] * n, "ws": [10.0] * n, "wd": [90.0] * n}
    S = Seri(d)
    t0 = S.m0 + 35 * 1440
    assert S.cukup(t0, 72)
    k0 = sel(110.0, -2.0)
    A = {"tb": {k0}, "ak": {k0: t0 - 60}, "t_awal": t0 - 600, "baru24": 1, "frp": 5.0, "lat": -2.0, "lon": 110.0}
    pc, luas, n_mc, tp = simulasi(M, K(), S, A, "62", t0, 12, 1)
    assert tp is False and simulasi(M, K(), S, A, "62", t0, 3, 1)[3] is False
    globals()["MAKS_AKTIF"] = 1  # batas aktif memang harus menandai terpangkas bila kena
    A2 = dict(A, ak={k0: t0 - 60, k0 + 1: t0 - 60}, tb={k0, k0 + 1})
    assert simulasi(M, K(), S, A2, "62", t0, 3, 1)[3] is True
    globals()["MAKS_AKTIF"] = 10 ** 9
    assert n_mc == 12 and pc and all(len(v) == 3 and v[0] <= v[1] <= v[2] <= 1 for v in pc.values()), "peluang kumulatif harus naik"
    assert k0 not in pc and luas == sorted(luas) and luas[0] >= 1
    assert pc == simulasi(M, K(), S, A, "62", t0, 12, 1)[0], "biji sama harus menghasilkan peta sama"
    # penuh: simulasi -> susun -> kontrak
    hh = [{"id": "K0002", "nama": "n", "prov": "62", "lat": -2.0, "lon": 110.0, "titik_24j": 1, "p_lepas": None, "terpangkas": tp, "p": pc, "luas": luas}]
    periksa(dict(dasar, kompleks=susun(hh, CAP_SEL), cakupan={"n_aktif": 1, "n_diramal": 1, "dilewati": {}}))
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        main()
