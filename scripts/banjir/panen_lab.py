"""Panen data lab banjir di GitHub Actions (stdlib). Subperintah:
  imerg --bulan YYYY-MM --keluar DIR   IMERG 30 menit -> DIR/imerg_kab_YYYY-MM.json.gz (per kab, per hari WIB)
  glofas --kab K[,K] --keluar DIR      debit GloFAS harian 2008-01-01..kemarin -> DIR/glofas_<KODE>.json
  daftar_kab                           kode kab urut kejadian banjir terbanyak (DIBI)
  bangun_sel                           bangun sekali data/sel_imerg_kab.json dari public/geo/kabupaten
  uji                                  self-check tanpa jaringan
IMERG: GPM_3IMERGHH (Final) bila folder harinya ada, selain itu HHL (Late), HHE (Early); via OPeNDAP GES DISC,
Authorization: Bearer $EARTHDATA_TOKEN hanya ke host NASA (pengalih dari scripts/cuaca/imerg.py). Tanpa token: keluar 0.
Keluaran imerg: {"meta":{...},"kab":{kode:{"t":bool terdekat,"d":{"YYYY-MM-DD":[n_slot,jumlah_rerata,jumlah_maks_sel,
h1_rerata,h1_maks,h3_rerata,h3_maks,h6_rerata,h6_maks]}}}}; mm; hari = hari WIB (slot dihitung menurut waktu mulainya);
h* = jendela bergulir 1/3/6 jam yang berakhir pada hari itu (melewati tengah malam, perlu semua slot ada); n_slot < 48 = ada slot hilang.
Kode keluar: 0 selesai, 1 ada kegagalan, 75 GloFAS 429 (berhenti bersih), 77 NASA 401/403 (berhenti).
"""
import argparse, collections, concurrent.futures as cf, datetime as dt, gzip, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DATA = os.path.join(AKAR, "scripts/banjir/data")
SEL_F, TITIK_F = os.path.join(DATA, "sel_imerg_kab.json"), os.path.join(DATA, "titik_glofas_kab.json")
sys.path.insert(0, os.path.join(AKAR, "scripts/cuaca"))
LON0, LAT0, RES = -179.95, -89.95, 0.1
BOX_LON, BOX_LAT = (2740, 3219), (780, 1590)       # indeks mutlak kotak Indonesia (sama dengan scripts/cuaca/imerg.py)
BASE = "https://gpm1.gesdisc.eosdis.nasa.gov"
KOLEKSI = (("GPM_3IMERGHH.07", "F"), ("GPM_3IMERGHHL.07", "L"), ("GPM_3IMERGHHE.07", "E"))
WIB = dt.timezone(dt.timedelta(hours=7))
ALIAS = {"Kota Padang Sidempuan": "Kota Padangsidimpuan", "Kepulauan Siau Tagulandang Biaro": "Kep. Siau Tagulandang Biaro", "Pangkajene Kepulauan": "Pangkajene dan Kepulauan"}
UA = "centurisk97-panen-lab/1"


def norm(s):
    """huruf kecil tanpa tanda baca/spasi; 'kota' SENGAJA dipertahankan (Kota Sukabumi != Sukabumi)."""
    return re.sub(r"[^a-z0-9]", "", ALIAS.get(s, s).lower())


# ---------------------------------------------------------------- peta sel -> kab
def pip(x, y, cincin):
    """genap-ganjil atas semua cincin (lubang ikut benar)."""
    d = False
    for r in cincin:
        j = len(r) - 1
        for i in range(len(r)):
            xi, yi, xj, yj = r[i][0], r[i][1], r[j][0], r[j][1]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                d = not d
            j = i
    return d


def cincin_fitur(g):
    return g["coordinates"] if g["type"] == "Polygon" else [r for p in g["coordinates"] for r in p]


def idx_lon(x): return round((x - LON0) / RES)
def idx_lat(y): return round((y - LAT0) / RES)


def bangun_sel(geo_dir=None, wilayah=None):
    geo_dir = geo_dir or os.path.join(AKAR, "public/geo/kabupaten")
    wil = wilayah or json.load(open(os.path.join(AKAR, "public/data/bnpb/wilayah.json")))["kab"]
    kode = {(w["prov"], norm(w["nama"])): w for w in wil}
    sel, pos, kab = [], {}, {}

    def id_sel(a, b):
        if (a, b) not in pos:
            pos[(a, b)] = len(sel); sel.append([a, b])
        return pos[(a, b)]
    for f in sorted(os.listdir(geo_dir)):
        if not f.endswith(".json"):
            continue
        prov = f[:-5]
        for ft in json.load(open(os.path.join(geo_dir, f)))["features"]:
            w = kode.get((prov, norm(ft["properties"]["kab"])))
            if not w:
                continue                                         # mis. poligon "Pahuwato" kedua (bukan kode BPS)
            cin = cincin_fitur(ft["geometry"])
            xs = [p[0] for r in cin for p in r]; ys = [p[1] for r in cin for p in r]
            ids = []
            for a in range(idx_lon(min(xs)), idx_lon(max(xs)) + 1):
                for b in range(idx_lat(min(ys)), idx_lat(max(ys)) + 1):
                    if BOX_LON[0] <= a <= BOX_LON[1] and BOX_LAT[0] <= b <= BOX_LAT[1] and pip(LON0 + RES * a, LAT0 + RES * b, cin):
                        ids.append(id_sel(a, b))
            terdekat = not ids
            if terdekat:                                         # tanpa pusat sel di dalam: sel terdekat ke titik tengah kotak
                ids = [id_sel(min(max(idx_lon((min(xs) + max(xs)) / 2), BOX_LON[0]), BOX_LON[1]),
                              min(max(idx_lat((min(ys) + max(ys)) / 2), BOX_LAT[0]), BOX_LAT[1]))]
            kab[w["kode"]] = {"n": w["nama"], "t": terdekat, "s": ids}
    return {"lon0": LON0, "lat0": LAT0, "res": RES, "sel": sel, "kab": kab}


def muat_sel():
    return json.load(open(SEL_F))


# ---------------------------------------------------------------- IMERG
def bulan_rentang(bulan):
    a = dt.date.fromisoformat(bulan + "-01")
    b = (a.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
    return a, b


def daftar_folder(tgl, kol):
    """-> [(mulai_utc datetime, nama)] dari daftar folder publik (kosong bila folder tak ada)."""
    u = f"{BASE}/data/GPM_L3/{kol}/{tgl:%Y}/{tgl.timetuple().tm_yday:03d}/"
    try:
        h = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=60).read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return []
        raise
    out = {}
    for m in re.finditer(r'(3B-HHR(?:-[EL])?\.MS\.MRG\.3IMERG\.(\d{8})-S(\d{6})-E\d{6}\.\d{4}\.(V07[A-Z])\.HDF5)</a>', h):
        out[m.group(1)] = dt.datetime.strptime(m.group(2) + m.group(3), "%Y%m%d%H%M%S").replace(tzinfo=dt.timezone.utc)
    return sorted((t, n) for n, t in out.items())


def pilih_koleksi(tgl, daftar=daftar_folder):
    """Final bila ada, selain itu Late lalu Early. -> (kode F/L/E, koleksi, [(mulai, nama)]) atau None."""
    for kol, k in KOLEKSI:
        d = daftar(tgl, kol)
        if d:
            return k, kol, d
    return None


class Henti(Exception):
    pass


def buat_ambil(token):
    from imerg import Teruskan
    import http.cookiejar
    op = urllib.request.build_opener(Teruskan, urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    op.addheaders = [("User-Agent", UA)]

    def ambil(url):
        for n in range(5):
            try:
                return op.open(urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"}), timeout=180).read().decode("utf-8", "replace")
            except urllib.error.HTTPError as e:
                if e.code in (401, 403):
                    raise Henti(f"NASA {e.code}")
                if e.code != 429 and e.code < 500 or n == 4:
                    raise
            except Exception:
                if n == 4:
                    raise
            time.sleep(15 * (n + 1))
    return ambil


def agregat(slots, pos_kab, n_sel, bulan):
    """slots: [(epoch_mulai_utc, [mm/jam tiap sel] atau None)] urut waktu, berjarak 1800 dtk. -> {kode: {hari: [...]}}.
    Jendela bergulir via jumlah berjalan; slot hilang membatalkan jendela yang memuatnya."""
    W = (2, 6, 12)
    run = [[0.0] * n_sel for _ in W]; hist = []; hilang = -10**9; out = {k: {} for k in pos_kab}
    for i, (e, v) in enumerate(slots):
        hari = dt.datetime.fromtimestamp(e, WIB).date().isoformat()
        if v is None:
            v = [0.0] * n_sel; hilang = i
        x = [a * 0.5 for a in v]
        hist.append(x)
        for r, w in zip(run, W):
            if len(hist) > w:
                lama = hist[-w - 1]
                for c in range(n_sel):
                    r[c] += x[c] - lama[c]
            else:
                for c in range(n_sel):
                    r[c] += x[c]
        if len(hist) > 12:
            hist.pop(0)
        if not hari.startswith(bulan):
            continue
        for k, ids in pos_kab.items():
            d = out[k].setdefault(hari, [0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
            vv = [x[c] for c in ids]
            d[0] += 0 if i == hilang else 1
            d[1] += sum(vv) / len(vv); d[2] += max(vv)
            for j, (r, w) in enumerate(zip(run, W)):
                if i - hilang >= w:
                    rr = [r[c] for c in ids]
                    d[3 + 2 * j] = max(d[3 + 2 * j], sum(rr) / len(rr)); d[4 + 2 * j] = max(d[4 + 2 * j], max(rr))
    return {k: {h: [d[0]] + [round(z, 2) for z in d[1:]] for h, d in sorted(v.items())} for k, v in out.items()}


def cmd_imerg(a):
    tok = os.environ.get("EARTHDATA_TOKEN")
    if not tok:
        print("imerg: EARTHDATA_TOKEN tidak ada, dilewati (jalankan di Actions)", file=sys.stderr); return 0
    from imerg import parse
    S = muat_sel(); os.makedirs(a.keluar, exist_ok=True)
    akhir = os.path.join(a.keluar, f"imerg_kab_{a.bulan}.json.gz")
    if os.path.exists(akhir):
        print("imerg: sudah ada", akhir); return 0
    ids = sorted({i for v in S["kab"].values() for i in v["s"]})
    lok = {i: n for n, i in enumerate(ids)}
    cel = [S["sel"][i] for i in ids]
    lo0, lo1 = min(c[0] for c in cel), max(c[0] for c in cel); la0, la1 = min(c[1] for c in cel), max(c[1] for c in cel)
    nj = la1 - la0 + 1
    pos_kab = {k: [lok[i] for i in v["s"]] for k, v in S["kab"].items()}
    ambil = buat_ambil(tok)
    mulai, sampai = bulan_rentang(a.bulan)
    # hari UTC yang perlu: sehari sebelum bulan (slot 17.00-23.30 UTC = pagi WIB tgl 1) s.d. akhir bulan
    hari = [mulai - dt.timedelta(days=1) + dt.timedelta(days=n) for n in range((sampai - mulai).days + 1)]
    cache = os.path.join(a.keluar, f"_slot_{a.bulan}.jsonl.gz")                  # resumable: satu baris per slot selesai
    ada = {}
    if os.path.exists(cache):
        try:
            for l in gzip.open(cache, "rt"):
                r = json.loads(l); ada[r["e"]] = r
        except (EOFError, OSError, ValueError):
            pass                                                                  # ekor terpotong: baris utuh dipakai
    versi, jobs = {}, []
    for h in hari:
        p = pilih_koleksi(h)
        if not p:
            print(f"imerg: {h} tak ada di koleksi mana pun", file=sys.stderr); continue
        k, kol, d = p
        for t, nama in d:
            e = int(t.timestamp())
            wb = dt.datetime.fromtimestamp(e, WIB).date()
            if mulai - dt.timedelta(days=1) <= wb < sampai and e not in ada:
                jobs.append((e, kol, nama, h))
            versi[h.isoformat()] = k + ":" + nama.split(".")[-2]
    print(f"imerg {a.bulan}: {len(ada)} slot di cache, {len(jobs)} diunduh, {len(cel)} sel")
    q = f"precipitation[0:0][{lo0}:{lo1}][{la0}:{la1}]"
    gagal = 0

    def satu(j):
        e, kol, nama, h = j
        u = f"{BASE}/opendap/GPM_L3/{kol}/{h:%Y}/{h.timetuple().tm_yday:03d}/{nama}.ascii?" + urllib.parse.quote(q, safe=":")
        n = parse(ambil(u))
        return e, [round(n.get((c[0] - lo0, c[1] - la0), 0.0), 2) if (c[0] - lo0, c[1] - la0) in n else None for c in cel]
    stop = None
    with gzip.open(cache, "at") as out, cf.ThreadPoolExecutor(3) as ex:
        for f in cf.as_completed([ex.submit(satu, j) for j in jobs]):
            try:
                e, v = f.result()
            except Henti as x:
                stop = x
                ex.shutdown(wait=False, cancel_futures=True); break
            except Exception as x:
                gagal += 1; print("  gagal:", str(x)[:120], file=sys.stderr); continue
            out.write(json.dumps({"e": e, "v": v}, separators=(",", ":")) + "\n"); out.flush(); ada[e] = {"e": e, "v": v}
    if stop:
        print("imerg: berhenti,", stop, "(cache dipertahankan)", file=sys.stderr); return 77
    if gagal:
        print(f"imerg: {gagal} slot gagal, jalankan ulang untuk melengkapi", file=sys.stderr); return 1
    awal = int(dt.datetime.combine(mulai - dt.timedelta(days=1), dt.time(17), dt.timezone.utc).timestamp())
    slots = [(e, [None if x is None else x for x in ada[e]["v"]] if e in ada else None) for e in range(awal, int(dt.datetime.combine(sampai, dt.time(16, 30), dt.timezone.utc).timestamp()) + 1, 1800)]
    # sel None (di luar kisi/dilewati) -> 0 agar tak membatalkan jendela; slot utuh hilang = None
    slots = [(e, None if v is None else [0.0 if x is None else x for x in v]) for e, v in slots]
    hasil = agregat(slots, pos_kab, len(cel), a.bulan)
    isi = {"meta": {"bulan": a.bulan, "dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "versi_hari": versi,
                    "kolom": ["n_slot", "jumlah_rerata", "jumlah_maks_sel", "h1_rerata", "h1_maks", "h3_rerata", "h3_maks", "h6_rerata", "h6_maks"], "satuan": "mm, hari WIB"},
           "kab": {k: {"t": S["kab"][k]["t"], "d": hasil[k]} for k in sorted(hasil)}}
    with gzip.open(akhir + ".tmp", "wt") as g:
        json.dump(isi, g, separators=(",", ":"))
    os.replace(akhir + ".tmp", akhir)
    os.remove(cache)
    print("imerg: tertulis", akhir, os.path.getsize(akhir), "byte"); return 0


# ---------------------------------------------------------------- GloFAS
FLOOD = "https://flood-api.open-meteo.com/v1/flood?latitude=%s&longitude=%s&daily=river_discharge&start_date=2008-01-01&end_date=%s"


def cmd_glofas(a):
    T = json.load(open(TITIK_F)); os.makedirs(a.keluar, exist_ok=True)
    akhir = (dt.date.today() - dt.timedelta(days=1)).isoformat(); n = gagal = 0
    for k in [x for x in a.kab.split(",") if x]:
        f = os.path.join(a.keluar, f"glofas_{k}.json")
        if k not in T or os.path.exists(f):
            print("lewati", k, "(tanpa titik)" if k not in T else "(sudah ada)"); continue
        for coba in range(4):
            try:
                with urllib.request.urlopen(urllib.request.Request(FLOOD % (T[k][0], T[k][1], akhir), headers={"User-Agent": UA}), timeout=170) as r:
                    d = json.load(r)
                break
            except urllib.error.HTTPError as e:
                b = e.read()[:300]
                if e.code == 429:
                    if b"Minutely" in b and coba < 3:
                        print("429 per menit, tunggu 70 dtk", file=sys.stderr); time.sleep(70); continue
                    print("glofas: 429, berhenti bersih", b[:120], file=sys.stderr); return 75
                if e.code >= 500 and coba < 3:
                    time.sleep(20 * (coba + 1)); continue
                print("glofas: HTTP", e.code, k, file=sys.stderr); d = None; break
            except Exception as e:
                if coba < 3:
                    time.sleep(20 * (coba + 1)); continue
                print("glofas: gagal", k, str(e)[:80], file=sys.stderr); d = None; break
        if not d or "daily" not in d:
            gagal += 1; continue
        json.dump({"kode": k, "lat": d["latitude"], "lon": d["longitude"], "t0": d["daily"]["time"][0], "q": d["daily"]["river_discharge"]}, open(f + ".tmp", "w"), separators=(",", ":"))
        os.replace(f + ".tmp", f); n += 1; print(n, k, flush=True); time.sleep(5)
    print("glofas selesai", n, "gagal", gagal); return 1 if gagal else 0


# ---------------------------------------------------------------- daftar kab
def urut_kab(baris, kode_semua):
    c = collections.Counter()
    for r in baris:
        if r[2] == "banjir":
            c[r[0]] += r[3]
    return sorted(kode_semua, key=lambda k: (-c[k], k))


def cmd_daftar(_):
    d = json.load(open(os.path.join(AKAR, "public/data/bnpb/dibi_kab_tahun.json")))
    print("\n".join(urut_kab(d["baris"], json.load(open(TITIK_F))))); return 0


def cmd_bangun(_):
    S = bangun_sel(); json.dump(S, open(SEL_F, "w"), separators=(",", ":"))
    print("tertulis", SEL_F, os.path.getsize(SEL_F), "byte;", len(S["kab"]), "kab,", len(S["sel"]), "sel,", sum(v["t"] for v in S["kab"].values()), "kab terdekat"); return 0


# ---------------------------------------------------------------- uji
def uji():
    # nama: 'kota' tak boleh terbuang; alias
    assert norm("Kota Sukabumi") != norm("Sukabumi") and norm("Toli Toli") == norm("Toli-Toli") and norm("Pangkajene Kepulauan") == norm("Pangkajene dan Kepulauan")
    # pip: persegi berlubang
    kot = [[(0, 0), (4, 0), (4, 4), (0, 4)], [(1, 1), (3, 1), (3, 3), (1, 3)]]
    assert pip(0.5, 0.5, kot) and not pip(2, 2, kot) and not pip(5, 5, kot)
    # peta sel nyata: enam pasang senama tidak tertukar
    S = muat_sel(); wil = {w["kode"]: w["nama"] for w in json.load(open(os.path.join(AKAR, "public/data/bnpb/wilayah.json")))["kab"]}
    assert set(S["kab"]) <= set(wil) and len(S["kab"]) == len(wil), len(S["kab"])
    assert all(wil[k] == v["n"] and v["s"] for k, v in S["kab"].items())
    ps = 0
    for nm in ("Sukabumi", "Tasikmalaya", "Magelang", "Pekalongan", "Mojokerto", "Kupang"):
        ka = [k for k, n in wil.items() if n == nm]; ko = [k for k, n in wil.items() if n == "Kota " + nm]
        assert len(ka) == len(ko) == 1, nm
        a, b = S["kab"][ka[0]], S["kab"][ko[0]]
        assert set(a["s"]).isdisjoint(b["s"]) or a["t"] or b["t"], nm            # sel sah tak dipakai dua kab senama
        assert len(a["s"]) > len(b["s"]), nm                                     # kabupaten lebih luas daripada kotanya
        ps += 1
    assert ps == 6
    # agregat: hujan 10 mm/jam di satu sel selama 2 jam di hari WIB 2026-01-02
    e0 = int(dt.datetime(2026, 1, 1, 17, tzinfo=dt.timezone.utc).timestamp())                      # = 2026-01-02 00:00 WIB
    sl = [(e0 + 1800 * i, [10.0, 0.0] if 4 <= i < 8 else [0.0, 0.0]) for i in range(48 + 12)]
    r = agregat(sl, {"a": [0], "b": [0, 1]}, 2, "2026-01")
    d = r["a"]["2026-01-02"]
    assert d[0] == 48 and d[1] == 20.0 and d[3] == 10.0 and d[5] == 20.0 and d[7] == 20.0, d  # 4 slot x 5 mm; 1 jam = 10 mm
    assert r["b"]["2026-01-02"][1] == 10.0 and r["b"]["2026-01-02"][2] == 20.0 and r["b"]["2026-01-02"][4] == 10.0, r["b"]["2026-01-02"]
    sl[5] = (sl[5][0], None)                                                       # slot hilang membatalkan jendela yang memuatnya
    assert agregat(sl, {"a": [0]}, 2, "2026-01")["a"]["2026-01-02"][0] == 47
    # urutan daftar
    assert urut_kab([["1", 2020, "banjir", 5], ["2", 2020, "banjir", 9], ["2", 2020, "longsor", 99]], ["1", "2", "3"]) == ["2", "1", "3"]
    # pilih koleksi: Final dulu, jatuh ke Late lalu Early
    f = lambda t, kol: [(dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc), "x")] if kol in ("GPM_3IMERGHHL.07",) else []
    assert pilih_koleksi(dt.date(2026, 1, 1), f)[0] == "L" and pilih_koleksi(dt.date(2026, 1, 1), lambda t, k: []) is None
    # titik glofas
    T = json.load(open(TITIK_F)); assert len(T) >= 500 and all(len(v) == 2 for v in T.values())
    print("panen_lab uji OK")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(); s = p.add_subparsers(dest="c", required=True)
    q = s.add_parser("imerg"); q.add_argument("--bulan", required=True); q.add_argument("--keluar", required=True); q.set_defaults(f=cmd_imerg)
    q = s.add_parser("glofas"); q.add_argument("--kab", required=True); q.add_argument("--keluar", required=True); q.set_defaults(f=cmd_glofas)
    s.add_parser("daftar_kab").set_defaults(f=cmd_daftar)
    s.add_parser("bangun_sel").set_defaults(f=cmd_bangun)
    s.add_parser("uji").set_defaults(f=lambda _: uji())
    a = p.parse_args(); sys.exit(a.f(a))
