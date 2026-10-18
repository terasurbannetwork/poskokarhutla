"""Bukti/akuntabilitas kekeringan -> public/data/kekeringan_bukti.json (jalankan SESUDAH status.py; tanpa jaringan).

  gambut    kompleks konsesi berlahan gambut (>= 50% titik di gambut, public/data/kompleks_konsesi.json; id anonim K0001, tanpa nama perusahaan)
            yang sel kekeringan terdekatnya (kekeringan_grid.json, <= ~0,7 derajat) berstatus Siaga/Awas hari ini. TMAT stasiun BRGM SiPALAGA
            tidak bisa diakses (Cloudflare 403, dicek 18 Okt 2026), jadi indikatornya KASAR: status sel 0,5 derajat (SPI + persentil tanah),
            DC dari fwi. Ambang muka air tanah gambut -40 cm (PP 57/2016) tidak bisa diperiksa dari sini. `seri` = hitungan harian, menumpuk antar-lari.
  berulang  kabupaten dengan SPI-3 Agu-Okt <= -1,5 paling sering 1991-2025 (hujan bulanan NASA POWER, cache data/raw/kekeringan_hujan.json milik spi.py;
            SPI kabupaten = rerata sel terdekat kecamatannya tertimbang penduduk) dan tampungan OSM (public/kekeringan/data/embung.json, kasar)
            per 100.000 jiwa. Tanpa cache hujan bagian ini dibuang.
Pakai:  python3 scripts/kekeringan/bukti.py   |   python3 scripts/kekeringan/bukti.py uji
"""
import datetime as dt, json, math, os, statistics, sys

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
import spi as SPI
from umum import baca, simpan

AKAR = os.path.normpath(os.path.join(AB, "../.."))
KELUAR = os.path.join(AKAR, "public/data/kekeringan_bukti.json")
WIB = dt.timezone(dt.timedelta(hours=7))
MIN_TAMPUNGAN = 5.0   # PILIHAN SENDIRI (bukan standar): objek OSM per 100.000 jiwa di bawah ini = "perlu cek lapangan"; embung=0 bukan bukti kekurangan (OSM tak lengkap)
MIN_TITIK = 30       # kompleks dengan titik panas lebih sedikit: porsi gambutnya tak terpercaya (n=2 bisa 100%)
MIN_GAMBUT = .5      # porsi titik konsesi di gambut agar kompleks disebut gambut
MIN_TAHUN = 4        # kandidat saja (P(>=4) acak = 20%); "berulang" hanya bila binomial p < ALFA
ALFA = .05
N_TAHUN = 35
AMBANG_SPI = -1.5
BATAS_SEL = .7       # derajat, kompleks -> sel terdekat
MAKS_DAFTAR, MAKS_RIWAYAT = 40, 120


def sel_dekat(sel, lat, lon, batas=BATAS_SEL):
    """sel = {(lat, lon): isi} -> kunci terdekat dalam `batas` derajat atau None."""
    d, k = min((((a - lat) ** 2 + (o - lon) ** 2), (a, o)) for a, o in sel) if sel else (9e9, None)
    return k if d <= batas ** 2 else None


def gambut(kompleks, sel, hari):
    """kompleks = {'K0001': {lat, lon, n, gambut}}, sel = {(lat, lon): {prov, lv, dc, spi3, pct}} -> dict keluaran atau None bila tak ada kompleks gambut."""
    daftar, n_gambut, per_prov = [], 0, {}
    for kid, v in kompleks.items():
        if not 0 <= v["gambut"] <= 1:
            raise ValueError(f"{kid}: porsi gambut {v['gambut']} di luar 0-1")
        if v["gambut"] < MIN_GAMBUT or v["n"] < MIN_TITIK:
            continue
        n_gambut += 1
        k = sel_dekat(sel, v["lat"], v["lon"])
        s = sel.get(k) if k else None
        if not s or s["lv"] is None:
            continue
        if s["lv"] not in (0, 1, 2, 3):
            raise ValueError(f"{kid}: tingkat {s['lv']} tak dikenal")
        if s["lv"] >= 2:
            per_prov[s["prov"]] = per_prov.get(s["prov"], 0) + 1
            daftar.append({"id": kid, "lat": v["lat"], "lon": v["lon"], "prov": s["prov"], "gambut": round(v["gambut"], 2), "lv": s["lv"],
                           "dc": s["dc"], "spi3": s["spi3"], "pct": s["pct"], "titik": v["n"]})
    if not n_gambut:
        return None
    daftar.sort(key=lambda r: (-r["lv"], -(r["dc"] or 0), r["id"]))
    return {"tgl": hari, "n_gambut": n_gambut, "n_kering": sum(per_prov.values()), "prov": dict(sorted(per_prov.items())), "daftar": daftar[:MAKS_DAFTAR]}


def p_binom(k, n=N_TAHUN, p=None):
    """P(X >= k) bila tiap tahun kering dengan peluang p (bawaan: laju definisi, Phi(AMBANG_SPI) = 6,7%). Mengandaikan tahun saling bebas; El Nino mengelompokkan
    tahun kering antar-kabupaten, jadi ini batas bawah p (terlalu optimis), bukan bukti."""
    p = statistics.NormalDist().cdf(AMBANG_SPI) if p is None else p
    if not (0 <= k <= n and 0 < p < 1):
        raise ValueError(f"binomial tak sah: k={k} n={n} p={p}")
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))


def tahun_kering(sel_seri, bobot, tahun):
    """sel_seri = {sel: {tahun: spi}}, bobot = {sel: jiwa} -> jumlah tahun dengan SPI tertimbang <= AMBANG_SPI; None bila tak ada data."""
    n = ada = 0
    for y in tahun:
        w = s = 0.0
        for c, j in bobot.items():
            v = sel_seri.get(c, {}).get(y)
            if v is not None:
                w += j
                s += v * j
        if w:
            ada += 1
            n += (s / w) <= AMBANG_SPI
    return n if ada >= .8 * len(tahun) else None


def berulang(th_kab, embung, jiwa, irbi=None):
    """th_kab = {kab: tahun_kering}, embung = {kab: n}, jiwa = {kab: jiwa} -> daftar urut: paling sering kering, lalu paling sedikit tampungan per 100.000 jiwa."""
    out = []
    for kab, th in th_kab.items():
        j = jiwa.get(kab, 0)
        if j < 0 or th is None or th > 35:
            raise ValueError(f"{kab}: jiwa {j} atau tahun {th} tak masuk akal")
        if th < MIN_TAHUN or j == 0:
            continue
        e = embung.get(kab, 0)
        pv = p_binom(th)
        r = {"kab": kab, "tahun": th, "p": round(pv, 3), "berulang": pv < ALFA, "embung": e, "per100rb": round(e / j * 1e5, 1), "jiwa": j,
             "cek_lapangan": e / j * 1e5 < MIN_TAMPUNGAN}
        i = (irbi or {}).get(kab)
        if i:
            r.update({"irbi": i["v25"], "irbi_tinggi": i["tinggi"], "irbi_arah": i["arah"]})
        out.append(r)
    out.sort(key=lambda r: (-r["tahun"], r["per100rb"], r["kab"]))
    return out


def bangun_berulang(hujan, pusat, penduduk, embung, sel_kunci, irbi=None):
    """hujan = cache POWER {'lat,lon': {'YYYYMM': mm/hari}}; sel_kunci = daftar (lat, lon) sel kisi. Tidak ada jaringan."""
    sel_seri = {}
    for c in sel_kunci:
        h = hujan.get(f"{c[0]},{c[1]}")
        if h:
            sel_seri[c] = {y: SPI.spi_seri(h, y, 10, 3) for y in range(1991, 2026)}
    peta = {c: 1 for c in sel_seri}
    bobot = {}
    for kk, j in penduduk.items():
        p, kb, _ = kk.split("|")
        a = pusat.get(kk)
        c = sel_dekat(peta, a[0], a[1], .75) if a else None
        if c:
            b = bobot.setdefault(f"{p}|{kb}", {})
            b[c] = b.get(c, 0) + j
    th = {kab: tahun_kering(sel_seri, b, range(1991, 2026)) for kab, b in bobot.items()}
    jiwa = {}
    for kk, j in penduduk.items():
        p, kb, _ = kk.split("|")
        jiwa[f"{p}|{kb}"] = jiwa.get(f"{p}|{kb}", 0) + j
    return berulang({k: v for k, v in th.items() if v is not None}, embung, jiwa, irbi)


def irbi_kab(irbi):
    """irbi resmi.py {pcode: {nama, ...}} -> {'prov|nama kab': isi}; kunci cocok dengan penduduk.json (nama saja, tanpa huruf besar kecil)."""
    return {f"{p[:2]}|{v['nama']}": v for p, v in irbi.items()}


def tulis():
    d = lambda p: json.load(open(os.path.join(AKAR, p)))
    meta, grid = d("public/data/kekeringan_meta.json"), d("public/data/kekeringan_grid.json")
    kol = grid["kolom"]
    sel = {}
    for r in grid["grid"]:
        x = dict(zip(kol, r))
        p = x["pct1"] if x["pct1"] is not None else x["pct0"]
        sel[(x["lat"], x["lon"])] = {"prov": x["prov"], "lv": x["lv"], "dc": x["dc"], "spi3": x["spi3"], "pct": p}
    lama = baca(KELUAR, {}) or {}
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "status_dibuat": meta["dibuat"], "label": "Deteksi Pantau Bencana"}
    g = gambut(d("public/data/kompleks_konsesi.json")["kompleks"], sel, meta["hari_ini"])
    if g:
        seri = [s for s in (lama.get("gambut") or {}).get("seri", []) if s["tgl"] != g["tgl"]] + [{"tgl": g["tgl"], "n_kering": g["n_kering"], "n_gambut": g["n_gambut"]}]
        g["seri"] = seri[-MAKS_RIWAYAT:]
        g["catatan"] = "TMAT SiPALAGA tak bisa diakses; indikator kasar sel 0,5 derajat (SPI + persentil tanah), DC dari fwi. Ambang TMAT -40 cm (PP 57/2016) tidak dapat diperiksa."
        out["gambut"] = g
    hujan = baca(SPI.MENTAH, {})
    ep = os.path.join(AKAR, "public/kekeringan/data/embung.json")
    if hujan.get("sel") and os.path.exists(ep):
        em = json.load(open(ep))
        pend = d("public/data/penduduk.json")["kec"]
        pusat = d("public/banjir/data/pusat_kec.json")
        bp = os.path.join(AKAR, "public/data/kekeringan_bnpb.json")
        ir = irbi_kab(json.load(open(bp)).get("irbi") or {}) if os.path.exists(bp) else {}
        r = bangun_berulang(hujan["sel"], pusat, pend, em["kab"], list(sel), ir)
        if r:
            out["berulang"] = {"ambang_spi3": AMBANG_SPI, "jendela": "Agu-Okt", "tahun": "1991-2025", "min_tahun": MIN_TAHUN, "n_kab": len(r), "daftar": r[:MAKS_DAFTAR],
                               "embung_sumber": em["sumber"], "embung_tanggal": em["tanggal"], "n_berulang": sum(1 for x in r if x["berulang"]), "n_cek_lapangan": sum(1 for x in r if x["cek_lapangan"]),
                               "irbi_sumber": "InaRISK BNPB (IRBI 2025, metode baru)", "alfa": ALFA, "laju_acak": round(statistics.NormalDist().cdf(AMBANG_SPI), 4),
                               "catatan": "Daftar = kandidat (>= 4 tahun kering). berulang = jumlah tahun kering melebihi acak (binomial, p < 0,05, laju 6,7% per tahun, tahun dianggap bebas; tahun El Nino mengelompok sehingga uji ini masih optimis). cek_lapangan = tampungan OSM < 5 per 100.000 jiwa (ambang pilihan sendiri); embung 0 bukan bukti kekurangan karena peta OSM tak lengkap; kabupaten = kecamatan terdekat."}
    simpan(KELUAR, out)
    print(f"bukti kekeringan: gambut kering {out.get('gambut', {}).get('n_kering', 'n/a')}/{out.get('gambut', {}).get('n_gambut', 'n/a')}; berulang {out.get('berulang', {}).get('n_kab', 'dibuang')} kab")


def uji():
    sel = {(0.25, 100.25): {"prov": "14", "lv": 3, "dc": 500, "spi3": -2.2, "pct": 4}, (5.25, 100.25): {"prov": "11", "lv": 1, "dc": 100, "spi3": -1.0, "pct": None}}
    kp = {"K1": {"lat": 0.3, "lon": 100.3, "n": 100, "gambut": .9}, "K2": {"lat": 0.3, "lon": 100.3, "n": 5, "gambut": .2},
          "K3": {"lat": 5.3, "lon": 100.3, "n": 70, "gambut": .8}, "K4": {"lat": 40, "lon": 10, "n": 70, "gambut": .8}}
    g = gambut(kp, sel, "2026-10-18")
    assert gambut({"T": {"lat": 0.3, "lon": 100.3, "n": 2, "gambut": 1.0}}, sel, "x") is None
    assert g["n_gambut"] == 3 and g["n_kering"] == 1 and g["prov"] == {"14": 1} and g["daftar"][0]["id"] == "K1", g
    assert gambut({"K2": kp["K2"]}, sel, "x") is None
    for salah in ({"K": {"lat": 0, "lon": 0, "n": 1, "gambut": 1.5}},):
        try:
            gambut(salah, sel, "x")
            raise SystemExit("gambut 1,5 harus ditolak")
        except ValueError:
            pass
    try:
        gambut(kp, {(0.25, 100.25): {"prov": "14", "lv": 7, "dc": 1, "spi3": 0, "pct": 1}}, "x")
        raise SystemExit("tingkat 7 harus ditolak")
    except ValueError:
        pass
    ss = {"a": {y: (-2.0 if y < 1996 else 0.1) for y in range(1991, 2026)}, "b": {y: -2.0 for y in range(1991, 2026)}}
    assert tahun_kering(ss, {"a": 100}, range(1991, 2026)) == 5 and tahun_kering(ss, {"a": 100, "b": 100}, range(1991, 2026)) == 5   # (-2+0,1)/2 > -1,5 sesudah 1995
    assert tahun_kering(ss, {"z": 1}, range(1991, 2026)) is None
    r = berulang({"A": 6, "B": 6, "C": 2, "D": 8}, {"A": 10, "B": 0, "D": 1}, {"A": 100000, "B": 200000, "C": 5, "D": 0})
    assert [x["kab"] for x in r] == ["B", "A"] and r[0]["per100rb"] == 0 and r[1]["per100rb"] == 10, r   # D tanpa penduduk dibuang, C terlalu jarang
    ri = berulang({"A": 4, "B": 4}, {"A": 0, "B": 0}, {"A": 100000, "B": 100000}, {"A": {"v25": 20, "tinggi": True, "arah": "naik"}, "B": {"v25": 3, "tinggi": False, "arah": "turun"}})
    assert ri[0]["kab"] == "A" and ri[0]["cek_lapangan"] and not ri[0]["berulang"] and ri[1]["irbi_arah"] == "turun", ri
    assert abs(p_binom(0) - 1) < 1e-12 and 0.19 < p_binom(4) < 0.22 and p_binom(5) > .05 > p_binom(6), (p_binom(4), p_binom(5), p_binom(6))
    assert berulang({"A": 8}, {"A": 9}, {"A": 100000})[0]["berulang"] and berulang({"A": 8}, {"A": 9}, {"A": 100000})[0]["cek_lapangan"] is False
    for k, n, pp in ((-1, 35, .1), (36, 35, .1), (3, 35, 0), (3, 35, 1.2)):
        try:
            p_binom(k, n, pp)
            raise SystemExit(f"binomial salah harus ditolak: {k},{n},{pp}")
        except ValueError:
            pass
    assert irbi_kab({"1101": {"nama": "Aceh Selatan", "v25": 1}}) == {"11|Aceh Selatan": {"nama": "Aceh Selatan", "v25": 1}}
    try:
        berulang({"A": 99}, {}, {"A": 5})
        raise SystemExit("tahun 99 harus ditolak")
    except ValueError:
        pass
    print("bukti kekeringan: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
