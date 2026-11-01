"""Google Runoff Reanalysis & Reforecast (GRRR), CC BY 4.0: panen Indonesia + banding ambang dengan ambang sungai kita.

LOKAL SAJA, BUKAN di workflow Actions: butuh zarr>=3, numcodecs, numpy, fsspec, gcsfs, pyarrow (stdlib tidak bisa baca zarr/blosc/zstd).
Tanpa uv: python3 -m venv ~/.venvs/grrr && ~/.venvs/grrr/bin/pip install "zarr>=3" numcodecs numpy fsspec gcsfs pyarrow aiohttp
Contoh:
  uv run --with "zarr>=3" --with numcodecs --with numpy --with fsspec --with gcsfs --with pyarrow --with aiohttp \\
      python scripts/banjir/grrr.py tarik
  (model lama model_id_8583a5c2_v0 berformat zarr v2: zarr 3 juga membacanya; flag --model lama)
Subperintah:
  tarik   [--model baru|lama] [--tanpa-reforecast] [--kerja 6]  unduh lalu lanjut bila putus (berkas yang sudah ada dilewati)
          -> data/raw/banjir/grrr/{outlet.npz, reanalisis/ck*.npz, reforecast/ck*.npz, indeks_*.json, unduhan.json}
          -> public/banjir/data/grrr_ambang.json (id, lat, lon, Q2, Q5, Q20, Q100, prov, kab). Unggah R2 arsip/grrr/ hanya bila
             CLOUDFLARE_API_TOKEN dan CLOUDFLARE_ACCOUNT_ID ada (lewat arsip_pos.r2; tanpa itu dilewati).
  ringkas ukuran berkas, cakupan, kualitas deret, Gumbel-momen reanalisis vs periode ulang resmi -> grrr/ringkas.json
  bandingmodel  model lama vs baru (outlet sama) + metrik panen -> ringkas.json[model_lama_vs_baru]
  banding Q2/Q5/Q20 GRRR vs ambang sungai kita (data/raw/banjir/sungai_ambang.json, Gumbel GloFAS) -> grrr/banding.json
  uji     luring, data mainan, tanpa zarr/numpy
Sumber (wajib disebut): Google Runoff Reanalysis & Reforecast, CC BY 4.0.
Lokasi outlet berlabel UNOFFICIAL oleh Google; ini REANALISIS (model hidrologi dipaksa cuaca historis), bukan prakiraan langsung.
Keputusan model: lihat RISET-GRRR.md. Reforecast disimpan float16 (galat relatif <0,1%; ditolak bila ada nilai >60000 m3/s).
"""
import datetime as dt, json, math, os, statistics, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import arsip_pos as A
from sungai import gumbel
from umum import KELUAR, MENTAH, simpan

SUMBER = "Google Runoff Reanalysis & Reforecast, CC BY 4.0"
GS = "gs://flood-forecasting/hydrologic_predictions/"
MODEL = {"baru": "distributed_model_2026_11/", "lama": "model_id_8583a5c2_v0/"}
BBOX = (-11.5, 6.5, 94.5, 141.5)  # lat_min, lat_max, lon_min, lon_max
RP = (2, 5, 20, 100)
DIR = os.path.join(MENTAH, "grrr")
J_AMBANG = os.path.join(KELUAR, "grrr_ambang.json")
J_SUNGAI = os.path.join(MENTAH, "sungai_ambang.json")
BARIS = 128  # tinggi chunk zarr (gauge) di kedua jalur
EPOCH = {"baru": dt.date(1980, 12, 31), "lama": dt.date(1980, 1, 1)}
MAKS_F16 = 60000.0


# ------------------------------------------------------------------ murni (diuji luring)
def jarak_km(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def rencana(pos, tinggi=BARIS):
    """posisi baris global (urut bebas) -> {nomor chunk: [(baris dalam chunk, indeks asal)]} urut chunk."""
    out = {}
    for k, p in enumerate(pos):
        out.setdefault(p // tinggi, []).append((p % tinggi, k))
    return dict(sorted(out.items()))


KOLOM = ["id", "lat", "lon", "q2", "q5", "q20", "q100", "prov", "kab"]


def tuple_outlet(baris):
    """baris grrr_ambang -> (id, lat, lon, q2, q5, q20, kab) lewat NAMA kolom; q2 kosong dibuang."""
    ix = {k: KOLOM.index(k) for k in ("id", "lat", "lon", "q2", "q5", "q20", "kab")}
    return [tuple(r[ix[k]] for k in ("id", "lat", "lon", "q2", "q5", "q20", "kab")) for r in baris if r[ix["q2"]]]


def terbaik(cs, q2):
    """calon [(km, outlet)] -> calon dengan |log(Q2 outlet / Q2 kita)| terkecil. BIAS ke rasio 1 (melingkar bila dibaca sebagai temuan)."""
    return min(cs, key=lambda x: abs(math.log(x[1][3] / q2)))


def dalam_bbox(la, lo):
    return BBOX[0] <= la <= BBOX[1] and BBOX[2] <= lo <= BBOX[3]


def maks_per_tahun(deret, epoch, min_hari=300):
    """deret harian (list/array) mulai epoch -> maksimum tahunan (tahun dengan >= min_hari nilai valid)."""
    per = {}
    for i, q in enumerate(deret):
        if q == q:  # bukan NaN
            per.setdefault((epoch + dt.timedelta(days=i)).year, []).append(float(q))
    return {y: max(v) for y, v in sorted(per.items()) if len(v) >= min_hari}


def gumbel_dari(deret, epoch, tahun0=None):
    mx = [v for y, v in maks_per_tahun(deret, epoch).items() if tahun0 is None or y >= tahun0]
    g = gumbel(mx)
    return None if g is None else {t: g[t] for t in (2, 5, 20)}


def irisan_tahun(n, epoch, min_hari=300):
    """{tahun: (a, b)} irisan indeks hari per tahun penuh (>= min_hari hari) untuk jalur numpy."""
    out = {}
    for i in range(n):
        y = (epoch + dt.timedelta(days=i)).year
        a, b = out.get(y, (i, i))
        out[y] = (a, i + 1)
    return {y: v for y, v in out.items() if v[1] - v[0] >= min_hari}


def sebaran(rasio):
    r = sorted(x for x in rasio if x is not None and x > 0)
    if not r:
        return None
    q = lambda f: r[min(len(r) - 1, int(f * (len(r) - 1) + 0.5))]
    return {"n": len(r), "median": round(statistics.median(r), 3), "p25": round(q(0.25), 3), "p75": round(q(0.75), 3),
            "min": round(r[0], 3), "maks": round(r[-1], 3)}


def calon(titik, outlet, radius_km):
    """outlet: [(id, lat, lon, ...)] -> [(jarak km, outlet)] dalam radius, terdekat dulu."""
    h = [(jarak_km(titik[0], titik[1], o[1], o[2]), o) for o in outlet]
    return sorted(x for x in h if x[0] <= radius_km)


# ------------------------------------------------------------------ jaringan (lokal, butuh zarr)
def _impor():
    try:
        import numpy, zarr  # noqa: F401
        import pyarrow.parquet  # noqa: F401
    except ImportError as e:
        sys.exit(f"grrr.py butuh zarr>=3, numcodecs, numpy, fsspec, gcsfs, pyarrow, aiohttp ({e}). Lihat docstring.")
    import numpy, zarr
    return numpy, zarr


def _grup(zarr, model, jalur):
    return zarr.open_group(GS + MODEL[model] + jalur, mode="r", storage_options={"token": "anon"})


def _outlet(np, zarr, model):
    """Semua outlet bbox Indonesia -> (ids, lat, lon) ndarray, di-cache outlet.npz."""
    p = os.path.join(DIR, f"outlet_{model}.npz")
    if os.path.exists(p):
        z = np.load(p, allow_pickle=False)
        return z["id"], z["lat"], z["lon"]
    nama = "subhybas_outlet_locations_UNOFFICIAL.zarr" if model == "baru" else "hybas_outlet_locations_UNOFFICIAL.zarr"
    g = zarr.open_group(GS + MODEL[model] + nama, mode="r", storage_options={"token": "anon"})
    ids, la, lo = g["gauge_id"][:], g["latitude"][:], g["longitude"][:]
    m = (la >= BBOX[0]) & (la <= BBOX[1]) & (lo >= BBOX[2]) & (lo <= BBOX[3])
    ids, la, lo = np.array([str(x) for x in ids[m]]), la[m], lo[m]
    os.makedirs(DIR, exist_ok=True)
    np.savez_compressed(p + ".tmp.npz", id=ids, lat=la, lon=lo)
    os.replace(p + ".tmp.npz", p)
    return ids, la, lo


def _tulis_npz(np, p, **kw):
    np.savez_compressed(p + ".tmp.npz", **kw)
    os.replace(p + ".tmp.npz", p)


def _unduh_chunk(np, arr, nomor, rows, idl, jenis, p):
    """Baca satu chunk (128 gauge) dengan 3 kali coba, simpan hanya baris Indonesia."""
    err = ""
    for k in range(3):
        try:
            x = np.asarray(arr[nomor * BARIS:(nomor + 1) * BARIS])[rows]
            if jenis == "reforecast":
                if np.nanmax(x) > MAKS_F16:
                    raise ValueError(f"nilai > {MAKS_F16} di chunk {nomor}: float16 tidak cukup")
                x = x.astype("float16")
            _tulis_npz(np, p, id=np.array(idl), x=x)
            return None
        except ValueError:
            raise
        except Exception as e:  # jaringan: coba ulang
            err = f"{type(e).__name__}: {str(e)[:120]}"
            time.sleep(5 * (k + 1))
    return f"chunk {jenis} {nomor}: {err}"


def _susun(grup, ids):
    """gauge Indonesia yang ada di array -> {chunk: (baris dalam chunk, id)}."""
    pos = {str(g): i for i, g in enumerate(grup["gauge_id"][:])}
    sel = [g for g in ids if g in pos]
    return len(sel), {ch: ([b for b, _ in l], [sel[j] for _, j in l]) for ch, l in rencana([pos[g] for g in sel]).items()}


def tarik(model="baru", reforecast=True, kerja=6):
    np, zarr = _impor()
    import concurrent.futures as cf
    ids, la, lo = _outlet(np, zarr, model)
    ids_l = ids.tolist()
    print(f"outlet bbox: {len(ids)}")
    ra = _grup(zarr, model, "reanalysis/streamflow.zarr")
    n_ra, rc_ra = _susun(ra, ids_l)  # urutan gauge TIDAK terurut menurut id
    print(f"reanalisis: {n_ra} outlet Indonesia ada, {len(ids) - n_ra} tidak ada")
    jenis = [("reanalisis", ra["streamflow"], rc_ra)]
    if reforecast:
        rf = _grup(zarr, model, "reforecast/streamflow.zarr")
        jenis.append(("reforecast", rf["streamflow"], _susun(rf, ids_l)[1]))
    gagal = []
    for nm, arr, rc in jenis:
        os.makedirs(os.path.join(DIR, nm), exist_ok=True)
        todo = [(ch, v) for ch, v in rc.items() if not os.path.exists(os.path.join(DIR, nm, f"ck{ch:05d}.npz"))]
        print(f"{nm}: {len(rc)} chunk, {len(rc) - len(todo)} sudah ada, {len(todo)} diunduh", flush=True)
        t0 = time.time()
        with cf.ThreadPoolExecutor(kerja) as ex:
            fs = [ex.submit(_unduh_chunk, np, arr, ch, rows, idl, nm, os.path.join(DIR, nm, f"ck{ch:05d}.npz")) for ch, (rows, idl) in todo]
            for i, f in enumerate(cf.as_completed(fs), 1):
                e = f.result()
                if e:
                    gagal.append(e)
                    print("GAGAL", e)
                if i % 20 == 0 or i == len(fs):
                    print(f"  {nm} {i}/{len(fs)} {time.time() - t0:.0f} dtk", flush=True)
    for nm in ("reanalisis", "reforecast"):  # indeks id -> berkas
        d = os.path.join(DIR, nm)
        if os.path.isdir(d):
            ix = {}
            for f in sorted(os.listdir(d)):
                if f.endswith(".npz") and not f.endswith(".tmp.npz"):
                    for g in np.load(os.path.join(d, f))["id"]:
                        ix[str(g)] = f
            simpan(os.path.join(DIR, f"indeks_{nm}.json"), ix)
    ambang(np, model, ids, la, lo)
    simpan(os.path.join(DIR, "unduhan.json"), {"model": MODEL[model].rstrip("/"), "sumber": SUMBER, "selesai": dt.date.today().isoformat(),
                                               "gauge_bbox": len(ids), "tanpa_reanalisis": len(ids) - n_ra, "gagal": gagal})
    unggah_r2()
    if gagal:
        sys.exit(f"{len(gagal)} chunk gagal; jalankan lagi untuk melanjutkan")


def ambang(np, model, ids, la, lo):
    """Periode ulang resmi (parquet baru / zarr lama) untuk outlet bbox -> public/banjir/data/grrr_ambang.json."""
    if model == "baru":
        import gcsfs, pyarrow.compute as pc, pyarrow.parquet as pq
        fs = gcsfs.GCSFileSystem(token="anon")
        with fs.open((GS + MODEL[model] + "return_periods.parquet")[5:]) as f:
            t = pq.read_table(f, columns=["gauge_id"] + [f"{r}.0" for r in RP]).filter(pc.is_in(pc.field("gauge_id"), pa_str(ids)))
        d = {g: [t[f"{r}.0"][i].as_py() for r in RP] for i, g in enumerate(t["gauge_id"].to_pylist())}
    else:
        z = _grup(_impor()[1], model, "return_periods.zarr")
        gg = [str(x) for x in z["gauge_id"][:]]
        want = set(ids.tolist())
        sel = [i for i, g in enumerate(gg) if g in want]
        cols = {r: z[f"return_period_{r}"][:] for r in RP}
        d = {gg[i]: [float(cols[r][i]) for r in RP] for i in sel}
    import floodhub as F
    kab = F.Kab.repo()
    baris, n_kab = [], 0
    for g, a, o in zip(ids.tolist(), la.tolist(), lo.tolist()):
        if g not in d:
            continue
        k = kab.cari(o, a)
        n_kab += k is not None
        baris.append([g, round(a, 4), round(o, 4)] + [None if v is None or v != v else round(v, 1) for v in d[g]] + [k.split("|")[0] if k else None, k.split("|", 1)[1] if k else None])
    out = {"sumber": SUMBER, "model": MODEL[model].rstrip("/"), "diunduh": dt.date.today().isoformat(), "satuan": "m3/s",
           "catatan": "reanalisis, bukan prakiraan; lokasi outlet UNOFFICIAL; kab null = di luar poligon kabupaten (laut/negara tetangga/pesisir)",
           "kolom": ["id", "lat", "lon", "q2", "q5", "q20", "q100", "prov", "kab"], "n": len(baris), "n_kab": n_kab, "baris": baris}
    simpan(J_AMBANG, out)
    print(f"{J_AMBANG}: {len(baris)} outlet, {n_kab} di dalam kabupaten, {os.path.getsize(J_AMBANG) / 1e6:.2f} MB")


def pa_str(ids):
    import pyarrow as pa
    return pa.array(ids.tolist(), pa.string())


def unggah_r2():
    if not (os.environ.get("CLOUDFLARE_API_TOKEN") and os.environ.get("CLOUDFLARE_ACCOUNT_ID")):
        print("R2 arsip/grrr: kredensial Cloudflare tidak ada, unggah dilewati")
        return
    n = 0
    for dp, _, fs in sorted(os.walk(DIR)):
        for f in sorted(fs):
            p = os.path.join(dp, f)
            if f.endswith((".ok", ".tmp.npz")) or os.path.exists(p + ".ok"):
                continue
            k = "arsip/grrr/" + os.path.relpath(p, DIR).replace(os.sep, "/")
            r = A.r2("put", f"{A.BUCKET}/{k}", "--file", p, "--content-type", "application/octet-stream")
            if r.returncode:
                print(f"R2 gagal {k}: {r.stderr[-200:]}")
                return
            open(p + ".ok", "w").close()
            n += 1
    print(f"R2 arsip/grrr: {n} berkas terunggah")


# ------------------------------------------------------------------ ringkas & banding
def _muat(np, nm, model_ep, id_):
    ix = json.load(open(os.path.join(DIR, f"indeks_{nm}.json")))
    z = np.load(os.path.join(DIR, nm, ix[id_]))
    return z["x"][[str(g) for g in z["id"]].index(id_)]


def ringkas(model="baru"):
    np, _ = _impor()
    a = json.load(open(J_AMBANG))
    ep = EPOCH[model]
    d = os.path.join(DIR, "reanalisis")
    out = {"model": a["model"], "gauge": a["n"], "di_kabupaten": a["n_kab"], "ukuran_mb": {}}
    for nm in ("reanalisis", "reforecast"):
        p = os.path.join(DIR, nm)
        if os.path.isdir(p):
            out["ukuran_mb"][nm] = round(sum(os.path.getsize(os.path.join(p, f)) for f in os.listdir(p)) / 1e6, 1)
    out["ukuran_mb"]["grrr_ambang.json"] = round(os.path.getsize(J_AMBANG) / 1e6, 2)
    ref = {r[0]: r for r in a["baris"]}
    rasio = {2: [], 5: [], 20: []}
    nan, tot, tmax, med, yr = 0, 0, 0.0, [], None
    for f in sorted(os.listdir(d)):
        if not f.endswith(".npz") or f.endswith(".tmp.npz"):
            continue
        z = np.load(os.path.join(d, f))
        x = z["x"]
        nan += int(np.isnan(x).sum())
        tot += x.size
        tmax = max(tmax, float(np.nanmax(x)))
        med += np.median(x, axis=1).tolist()
        yr = yr or irisan_tahun(x.shape[1], ep)
        mx = np.stack([x[:, a:b].max(axis=1) for a, b in yr.values()], axis=1)  # [gauge, tahun]
        for g, m in zip(z["id"], mx):
            r = ref.get(str(g))
            gm = gumbel([float(v) for v in m if v == v]) if r and r[3] else None
            if gm:
                for t, c in ((2, 3), (5, 4), (20, 5)):
                    if r[c] and r[c] > 0:
                        rasio[t].append(gm[t] / r[c])
    out["reanalisis"] = {"hari": int(x.shape[1]), "mulai": ep.isoformat(), "akhir": (ep + dt.timedelta(days=int(x.shape[1]) - 1)).isoformat(),
                         "persen_nan": round(100 * nan / max(tot, 1), 4), "maks_m3s": round(tmax, 1), "median_harian_median_gauge": round(statistics.median(med), 3)}
    out["gumbel_reanalisis_vs_periode_ulang_resmi"] = {f"Q{t}": sebaran(v) for t, v in rasio.items()}
    out["q2_gauge"] = sebaran([r[3] for r in a["baris"] if r[3]])
    simpan(os.path.join(DIR, "ringkas.json"), out)
    print(json.dumps(out, indent=1, ensure_ascii=False))


def banding(radius=30.0, model="baru"):
    np, _ = _impor()
    a = json.load(open(J_AMBANG))
    ep = EPOCH[model]
    sg = json.load(open(J_SUNGAI))
    titik = {f"{t['lat']},{t['lon']}": t for t in json.load(open(os.path.join(MENTAH, "sungai_titik.json")))}
    outlet = tuple_outlet(a["baris"])  # id lat lon q2 q5 q20 kab
    hasil, per = [], {"terdekat": {2: [], 5: [], 20: []}, "terbaik": {2: [], 5: [], 20: []}, "median_calon": {2: [], 5: [], 20: []},
                      "gumbel_terdekat": {2: [], 5: [], 20: []}}
    for k, q in sg.items():
        la, lo = map(float, k.split(","))
        cs = calon((la, lo), outlet, radius)
        row = {"titik": k, "kab": titik.get(k, {}).get("kab"), "kita": {"q2": q["q2"], "q5": q["q5"], "q20": q["q20"]}, "n_calon": len(cs)}
        if cs:
            dkm, o = cs[0]
            row["terdekat"] = {"id": o[0], "km": round(dkm, 1), "q2": o[3], "q5": o[4], "q20": o[5], "kab": o[6]}
            for t, c in ((2, 3), (5, 4), (20, 5)):
                per["terdekat"][t].append(o[c] / q[f"q{t}"])
            best = terbaik(cs, q["q2"])
            row["terbaik"] = {"id": best[1][0], "km": round(best[0], 1), "q2": best[1][3], "q5": best[1][4], "q20": best[1][5]}
            for t, c in ((2, 3), (5, 4), (20, 5)):
                per["terbaik"][t].append(best[1][c] / q[f"q{t}"])
                per["median_calon"][t].append(statistics.median(x[1][c] for x in cs) / q[f"q{t}"])
            try:  # Gumbel-momen yang SAMA pada reanalisis GRRR 1997-2025 (tahun yang sama dengan ambang kita): memisahkan model dari metode
                gm = gumbel_dari(_muat(np, "reanalisis", ep, o[0]), ep, tahun0=1997)
                if gm:
                    row["gumbel_terdekat"] = {f"q{t}": round(gm[t], 1) for t in gm}
                    for t in gm:
                        per["gumbel_terdekat"][t].append(gm[t] / q[f"q{t}"])
            except (KeyError, FileNotFoundError):
                pass
        hasil.append(row)
    ring = {j: {f"Q{t}": sebaran(v) for t, v in d.items()} for j, d in per.items()}
    # berpasangan: Q20/Q2 GRRR vs Q20/Q2 kita pada pasangan yang sama (terdekat dan terbaik)
    bentuk = {j: sebaran([(r[j]["q20"] / r[j]["q2"]) / (r["kita"]["q20"] / r["kita"]["q2"]) for r in hasil if j in r]) for j in ("terdekat", "terbaik")}
    uniq = {j: len({r[j]["id"] for r in hasil if j in r}) for j in ("terdekat", "terbaik")}
    out = {"radius_km": radius, "n_titik_kita": len(sg), "n_outlet_unik": uniq, "bentuk_q20_per_q2_grrr_per_kita": bentuk,
           "ringkas_rasio_grrr_per_kita": ring, "titik": hasil, "sumber": SUMBER}
    simpan(os.path.join(DIR, "banding.json"), out)
    print(json.dumps(ring, indent=1))
    print("outlet unik:", uniq, "bentuk Q20/Q2 berpasangan:", json.dumps(bentuk))
    for r in hasil:
        print(r["titik"], r["kab"], r["kita"], r.get("terdekat"), r.get("gumbel_terdekat"), r["n_calon"])


def bandingmodel():
    """Model lama vs baru pada outlet yang sama + metrik panen -> ringkas.json["model_lama_vs_baru"] (agar angka RISET bisa direproduksi)."""
    np, zarr = _impor()
    a = json.load(open(J_AMBANG))
    so = {"token": "anon"}
    g = zarr.open_group(GS + MODEL["lama"] + "hybas_outlet_locations_UNOFFICIAL.zarr", mode="r", storage_options=so)
    gi, la, lo = g["gauge_id"][:], g["latitude"][:], g["longitude"][:]
    m = (la >= BBOX[0]) & (la <= BBOX[1]) & (lo >= BBOX[2]) & (lo <= BBOX[3])
    lama = {(round(float(x), 4), round(float(y), 4)): str(i) for i, x, y in zip(gi[m], la[m], lo[m])}
    baru = {(r[1], r[2]): r for r in a["baris"]}
    sama = [k for k in baru if k in lama]
    rp = zarr.open_group(GS + MODEL["lama"] + "return_periods.zarr", mode="r", storage_options=so)
    pos = {str(x): i for i, x in enumerate(rp["gauge_id"][:])}
    sel = [(k, pos[lama[k]]) for k in sama if lama[k] in pos]
    lo_i, hi_i = min(p for _, p in sel), max(p for _, p in sel)
    q2, q20 = rp["return_period_2"][lo_i:hi_i + 1], rp["return_period_20"][lo_i:hi_i + 1]
    r2, r20 = [], []
    for k, p in sel:
        n = baru[k]
        if n[3] and q2[p - lo_i] > 0:
            r2.append(n[3] / float(q2[p - lo_i]))
            r20.append(n[5] / float(q20[p - lo_i]))
    pr = lambda v: {q: round(float(np.percentile(v, q)), 3) for q in (5, 25, 50, 75, 95)}
    f16 = max(float(np.nanmax(np.load(os.path.join(DIR, "reforecast", f))["x"])) for f in os.listdir(os.path.join(DIR, "reforecast")) if f.endswith(".npz") and ".tmp" not in f)
    n_ck = len([f for f in os.listdir(os.path.join(DIR, "reanalisis")) if f.endswith(".npz") and ".tmp" not in f])
    total = -(-_grup(zarr, "baru", "reanalysis/streamflow.zarr")["gauge_id"].shape[0] // BARIS)
    out = {"koordinat_identik": len(sama), "outlet_baru": len(baru), "dicocokkan_id_lama": len(sel), "Q2_baru_per_lama": pr(r2), "Q20_baru_per_lama": pr(r20),
           "reforecast_maks_float16_m3s": round(f16, 1), "chunk_indonesia": n_ck, "chunk_total": total}
    pj = os.path.join(DIR, "ringkas.json")
    r = json.load(open(pj)) if os.path.exists(pj) else {}
    r["model_lama_vs_baru"] = out
    simpan(pj, r)
    print(json.dumps(out, indent=1))


# ------------------------------------------------------------------ uji
def uji():
    assert abs(jarak_km(0, 0, 0, 1) - 111.19) < 0.2
    assert rencana([5, 130, 3, 260]) == {0: [(5, 0), (3, 2)], 1: [(2, 1)], 2: [(4, 3)]}
    assert dalam_bbox(-6.2, 106.8) and not dalam_bbox(1.35, 150.0) and not dalam_bbox(-20, 120)
    ep = dt.date(1980, 12, 31)
    nan = float("nan")
    d = [1.0] * (1 + 365 * 12)  # hari 0 = 1980-12-31 (satu hari saja -> tahun 1980 dibuang)
    assert sorted(maks_per_tahun(d, ep)) == list(range(1981, 1981 + 12)), sorted(maks_per_tahun(d, ep))
    d2 = list(d)
    d2[100] = 50.0
    assert maks_per_tahun(d2, ep)[1981] == 50.0
    d3 = [nan if i < 200 else v for i, v in enumerate(d)]  # 1981 tinggal <300 hari valid -> dibuang
    assert 1981 not in maks_per_tahun(d3, ep)
    # Gumbel: deret dengan maks tahunan 10..21 -> Q2 < rata-rata < Q5 < Q20
    dd = []
    for y in range(12):
        dd += [1.0] * 364 + [10.0 + y]
    dd = [1.0] + dd
    g = gumbel_dari(dd, ep)
    assert g and g[2] < g[5] < g[20] and 14 < g[2] < 17, g
    assert list(irisan_tahun(len(d), ep)) == list(range(1981, 1993)) and irisan_tahun(len(d), ep)[1981] == (1, 366)
    assert gumbel_dari([1.0] * 400, ep) is None  # < 10 tahun
    assert sebaran([1, 2, 3, 4, None, -1])["median"] == 2.5 and sebaran([]) is None
    o = [("a", -6.20, 106.80, 100, 200, 300, "x"), ("b", -6.21, 106.81, 90, 190, 290, "y"), ("c", -2.0, 110.0, 1, 2, 3, "z")]
    c = calon((-6.2, 106.8), o, 30)
    assert [x[1][0] for x in c] == ["a", "b"] and c[0][0] < 0.01
    t = tuple_outlet([["i1", -1.0, 100.0, 50.0, 60.0, 80.0, 90.0, "93", "Merauke"], ["i0", 0, 0, None, 1, 1, 1, "x", "y"]])
    assert t == [("i1", -1.0, 100.0, 50.0, 60.0, 80.0, "Merauke")], t  # kab = nama, bukan prov
    cs = [(1.0, ("a", 0, 0, 10.0, 0, 0, "k")), (2.0, ("b", 0, 0, 90.0, 0, 0, "k")), (3.0, ("c", 0, 0, 400.0, 0, 0, "k"))]
    assert terbaik(cs, 100.0)[1][0] == "b" and terbaik(cs, 1000.0)[1][0] == "c" and terbaik(cs, 5.0)[1][0] == "a"
    print("grrr uji ok")


def main(argv):
    ap = __import__("argparse").ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("perintah", choices=["tarik", "ringkas", "banding", "bandingmodel", "uji"])
    ap.add_argument("--model", choices=list(MODEL), default="baru")
    ap.add_argument("--tanpa-reforecast", action="store_true")
    ap.add_argument("--kerja", type=int, default=6)
    ap.add_argument("--radius", type=float, default=30.0)
    a = ap.parse_args(argv)
    if a.perintah == "uji":
        return uji()
    if a.perintah == "tarik":
        return tarik(a.model, not a.tanpa_reforecast, a.kerja)
    if a.perintah == "ringkas":
        return ringkas(a.model)
    if a.perintah == "bandingmodel":
        return bandingmodel()
    return banding(a.radius, a.model)


if __name__ == "__main__":
    main(sys.argv[1:])
