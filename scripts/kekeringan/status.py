"""Status kekeringan "Deteksi Centurisk97" -> public/data/kekeringan_{meta,grid,wilayah,tren}.json

Bahan (semuanya sudah ada di repo, tanpa kuota Open-Meteo tambahan):
  tanah.json      persentil kelembapan tanah 7-28 cm (pct1; pct0 bila pct1 kosong) terhadap ERA5-Land 2015-2025 dasarian sama
  fwi.json        Drought Code (DC) hari terakhir, kelas CFFDRS (Kanada): <80 rendah, <190 sedang, <300 tinggi, <425 sangat tinggi
  spi.py          SPI-3 dari hujan bulanan NASA POWER 1991-2020 (BMKG hanya menerbitkan gambar; lihat spi.py)
  penduduk.json   penduduk per kecamatan; banjir/data/pusat_kec.json titik tengah kecamatan; iklim.json ENSO/IOD

Tingkat sel (hipotesis, belum diuji balik; docs/multi-bencana/bencana/kekeringan.md §2):
  SPI-3  <= -1 Waspada, <= -1,5 Siaga, <= -2 Awas.   Tanah  persentil <= 20 Waspada, <= 10 Siaga, <= 5 Awas.
  Keduanya ada: tingkat SPI, boleh dinaikkan SATU tingkat oleh tanah. Hanya satu ada: tingkat itu, tanah sendirian maksimal Siaga.
  AWAS butuh SPI-3 <= -2 DAN (tanah persentil <= 10 ATAU SPI-6 <= -1,5); tanpa penguat itu tingkat dipotong ke Siaga
  (persentil tanah baru ada di segelintir sel, jadi SPI-3 sendirian tidak cukup untuk Awas).
  DC TIDAK masuk tingkat: DC tinggi di NTT musim kemarau itu wajar; DC dipakai sebagai lapisan peta saja.
Tingkat kecamatan = tingkat sel terdekat (<= ~0,5 derajat). Tingkat kabupaten/provinsi = tingkat tertinggi L yang dialami
>= 30% penduduknya. Status resmi lembaga tidak dibuat di sini; semua keluaran berlabel "Deteksi Centurisk97".

Pakai:  python3 scripts/kekeringan/status.py      |  python3 scripts/kekeringan/status.py uji
"""
import datetime as dt, json, math, os, re, statistics, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "data"))
sys.path.insert(2, os.path.join(AB, "..", "banjir"))
import spi as SPI
from umum import baca, simpan
from tanah import dasarian
from wilayah import PROVINSI

AKAR = os.path.join(AB, "../..")
DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
BATAS_WIL = .30
BLN_ID = {"January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr", "May": "Mei", "June": "Jun", "July": "Jul",
          "August": "Agu", "September": "Sep", "October": "Okt", "November": "Nov", "December": "Des"}


def lv_spi(s):
    return None if s is None else 3 if s <= -2 else 2 if s <= -1.5 else 1 if s <= -1 else 0


def lv_tanah(p):
    return None if p is None else 3 if p <= 5 else 2 if p <= 10 else 1 if p <= 20 else 0


def gabung(a, b, s6=None):
    """a = tingkat SPI-3, b = tingkat tanah (None = tak ada), s6 = nilai SPI-6. Awas hanya bila tanah <= persentil 10 atau SPI-6 <= -1,5."""
    if a is None and b is None:
        return None
    if a is None:
        return min(b, 2)
    r = a if b is None else max(a, min(b, a + 1))
    if r == 3 and not ((b is not None and b >= 2) or (s6 is not None and s6 <= -1.5)):
        r = 2
    return r


def lv_wilayah(jiwa_per_lv, total):
    """Tingkat tertinggi L yang dialami >= 30% penduduk (jiwa_per_lv[L] = penduduk di kecamatan bertingkat tepat L)."""
    for L in (3, 2, 1):
        if total and sum(jiwa_per_lv[L:]) / total >= BATAS_WIL:
            return L
    return 0


def pusat_sel(v):
    return math.floor(v / .5) * .5 + .25


def sel_terdekat(peta, lat, lon):
    la, lo = pusat_sel(lat), pusat_sel(lon)
    c = [(((a - lat) ** 2 + (o - lon) ** 2), (a, o)) for a in (la - .5, la, la + .5) for o in (lo - .5, lo, lo + .5) if (round(a, 2), round(o, 2)) in peta]
    if not c:
        return None
    d, k = min(c)
    return k if d <= .5 ** 2 * 2 else None


def teks_enso(ik):
    """Ringkas iklim.json -> medan meta; peluang/hingga diambil dari sinopsis CPC bila polanya ada."""
    o = ik.get("oni_terakhir") or {}
    sin = ik.get("cpc_sinopsis") or ""
    m = re.search(r"through ([A-Za-z]+)(?:-([A-Za-z]+))? (\d{4})", sin)
    p = re.search(r"(\d+)% chance", sin)
    hingga = None
    if m:
        a, b, th = m.groups()
        hingga = f"{BLN_ID.get(a, a)}–{BLN_ID.get(b, b)} {th}" if b else f"{BLN_ID.get(a, a)} {th}"
    return {"status": ik.get("status"), "cpc": ik.get("cpc_status"), "oni": o.get("nilai"), "musim": o.get("musim"), "tahun": o.get("tahun"),
            "roni": (ik.get("roni_terakhir") or {}).get("nilai"), "iod": ik.get("iod_status"), "dmi": ik.get("dmi_8_minggu"),
            "peluang": int(p.group(1)) if p else None, "hingga": hingga}


def tampil(v):
    """SPI untuk tampilan dibatasi +-3 (di luar itu fit gamma pada sel kering tak bermakna); status memakai nilai penuh. q3 > 0,5 = massa nol tinggi, tandai."""
    return None if v is None else max(-3.0, min(3.0, v))


def bangun(tanah, fwi, penduduk, pusat, iklim, hujan, hari_ini, lama_tren=None):
    """Murni (tanpa jaringan): hitung seluruh keluaran dari berkas masukan dan `hujan` = {'lat,lon': {'YYYYMM': mm/hari}}."""
    dc = {(round(g["lat"], 2), round(g["lon"], 2)): g["hari"] for g in fwi["grid"] if g.get("hari")}
    ym = SPI.bulan_terakhir(hujan) if hujan else None
    sel = {}
    for g in tanah["grid"]:
        k = (round(g["lat"], 2), round(g["lon"], 2))
        h = hujan.get(f"{g['lat']},{g['lon']}") if hujan else None
        s3 = SPI.spi_seri(h, ym[0], ym[1], 3) if h and ym else None
        s6 = SPI.spi_seri(h, ym[0], ym[1], 6) if h and ym else None
        x3 = SPI.jumlah(h, ym[0], ym[1], 3) if h and ym else None
        q3 = SPI.spi_q(h, ym[0], ym[1], 3) if h and ym and s3 is not None else None
        p = g.get("pct1") if g.get("pct1") is not None else g.get("pct0")
        d = dc[k][-1]["dc"] if k in dc else None
        sel[k] = {"prov": g["prov"], "p0": g.get("pct0"), "p1": g.get("pct1"), "dc": d, "spi3": s3, "spi6": s6, "q3": q3, "mm3": None if x3 is None else round(x3), "lv": gabung(lv_spi(s3), lv_tanah(p), s6)}
    # kecamatan -> sel terdekat
    kab, prov = {}, {}
    for kk, jiwa in penduduk["kec"].items():
        p, kb, _ = kk.split("|")
        a = pusat.get(kk)
        c = sel_terdekat(sel, a[0], a[1]) if a else None
        s = sel[c] if c else None
        for tabel, key in ((kab, f"{p}|{kb}"), (prov, p)):
            w = tabel.setdefault(key, {"total": 0, "lv": [0, 0, 0, 0], "ada": 0, "s": 0.0, "ns": 0, "m": 0.0, "nm": 0, "d": 0.0, "nd": 0, "t": 0.0, "nt": 0})
            w["total"] += jiwa
            if s and s["lv"] is not None:
                w["lv"][s["lv"]] += jiwa
                w["ada"] += jiwa
            if s and s["spi3"] is not None:
                w["s"] += s["spi3"] * jiwa
                w["ns"] += jiwa
            if s and s["mm3"] is not None:
                w["m"] += s["mm3"] * jiwa
                w["nm"] += jiwa
            if s and s["dc"] is not None:
                w["d"] += s["dc"] * jiwa
                w["nd"] += jiwa
            pp = s and (s["p1"] if s["p1"] is not None else s["p0"])
            if pp is not None:
                w["t"] += pp * jiwa
                w["nt"] += jiwa

    def rapi(w):
        L = lv_wilayah(w["lv"], w["total"])
        return {"lv": L, "total": w["total"], "jiwa": [sum(w["lv"][i:]) for i in (1, 2, 3)],
                "spi3": round(w["s"] / w["ns"], 2) if w["ns"] else None, "mm3": round(w["m"] / w["nm"]) if w["nm"] else None, "dc": round(w["d"] / w["nd"]) if w["nd"] else None,
                "pct": round(w["t"] / w["nt"]) if w["nt"] else None}
    P = {k: rapi(w) for k, w in prov.items()}
    K = {k: rapi(w) for k, w in kab.items()}
    for k in P:
        P[k]["kab_n"] = [sum(1 for kk, v in K.items() if kk.startswith(k + "|") and v["lv"] >= i) for i in (1, 2, 3)]
    K = {k: v for k, v in K.items() if v["lv"] >= 1 or v["jiwa"][0] > 0}
    nas = {"total": sum(v["total"] for v in P.values()), "jiwa": [sum(v["jiwa"][i] for v in P.values()) for i in range(3)],
           "kab_n": [sum(1 for v in K.values() if v["lv"] >= i) for i in (1, 2, 3)],
           "prov_n": [sum(1 for v in P.values() if v["lv"] >= i) for i in (1, 2, 3)],
           "sel_n": [sum(1 for s in sel.values() if s["lv"] is not None and s["lv"] >= i) for i in (1, 2, 3)], "sel": sum(1 for s in sel.values() if s["lv"] is not None)}
    # tren: SPI-3 24 bulan terakhir (porsi sel kering) dan DC harian
    spi_bln = []
    if hujan and ym:
        y, m = ym
        for _ in range(24):
            v = [SPI.spi_seri(h, y, m, 3) for h in hujan.values()]
            v = [x for x in v if x is not None]
            if len(v) >= min(50, len(hujan)):
                spi_bln.append({"bln": f"{y}-{m:02d}", "n": len(v), "kering": round(100 * sum(1 for x in v if x <= -1) / len(v), 1),
                                "ekstrem": round(100 * sum(1 for x in v if x <= -2) / len(v), 1), "basah": round(100 * sum(1 for x in v if x >= 1) / len(v), 1)})
            m -= 1
            if m == 0:
                y, m = y - 1, 12
        spi_bln.reverse()
    per_hari = {}
    for hs in dc.values():
        for h in hs:
            if h.get("dc") is not None:
                per_hari.setdefault(h["tgl"], []).append(h["dc"])
    dc_harian = [{"tgl": t, "med": round(statistics.median(v)), "p90": round(sorted(v)[int(.9 * (len(v) - 1))]), "n": len(v)} for t, v in sorted(per_hari.items())]
    # riwayat dasarian bertambah satu titik tiap dasarian (cache public/data); ganti titik dasarian yang sama
    das_id = f"{hari_ini.year}-{dasarian(hari_ini.isoformat()):02d}"
    riw = [r for r in (lama_tren or {}).get("dasarian", []) if r.get("id") != das_id]
    riw.append({"id": das_id, "tgl": hari_ini.isoformat(), "das": dasarian(hari_ini.isoformat()), "jiwa": nas["jiwa"], "kab_n": nas["kab_n"], "sel_n": nas["sel_n"], "sel": nas["sel"]})
    riw = sorted(riw, key=lambda r: r["id"])[-108:]  # 3 tahun
    tren = {"spi_bulanan": spi_bln, "dc_harian": dc_harian, "dasarian": riw}
    grid = [[k[0], k[1], s["prov"], s["p0"], s["p1"], s["dc"], tampil(s["spi3"]), s["lv"], tampil(s["spi6"]), s["mm3"], s["q3"]] for k, s in sorted(sel.items())]
    meta = {"hari_ini": hari_ini.isoformat(), "dasarian": dasarian(hari_ini.isoformat()), "label": "Deteksi Centurisk97",
            "spi": {"bulan": f"{ym[0]}-{ym[1]:02d}", "k": 3, "sel": sum(1 for s in sel.values() if s["spi3"] is not None)} if ym else None,
            "tanah": {"tgl": tanah.get("hari_ini"), "sel": sum(1 for s in sel.values() if s["p1"] is not None or s["p0"] is not None)},
            "dc": {"tgl": fwi.get("hari_ini")}, "enso": teks_enso(iklim), "nasional": nas,
            "kolom": ["lat", "lon", "prov", "pct0", "pct1", "dc", "spi3", "lv", "spi6", "mm3", "q3"],
            "provinsi": {k: n for k, n in PROVINSI.items() if k in P}}
    return meta, grid, {"prov": P, "kab": K}, tren


def main():
    t0 = time.time()
    r = lambda f: json.load(open(os.path.join(DATA, f)))
    tanah, fwi, penduduk, iklim = r("tanah.json"), r("fwi.json"), r("penduduk.json"), r("iklim.json")
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    hari_ini = dt.datetime.now(WIB).date()
    titik = [(g["lat"], g["lon"]) for g in tanah["grid"]]
    try:
        hujan = SPI.hujan_bulanan(titik, hari_ini)
    except Exception as e:
        print(f"::warning title=spi::hujan POWER gagal ({e}); SPI dilewati, tanah saja", file=sys.stderr)
        hujan = {}
    meta, grid, wil, tren = bangun(tanah, fwi, penduduk, pusat, iklim, hujan, hari_ini, baca(os.path.join(DATA, "kekeringan_tren.json")))
    meta["dibuat"] = dt.datetime.now(WIB).isoformat(timespec="minutes")
    for nama, isi in (("meta", meta), ("grid", {"sel": .5, "kolom": meta["kolom"], "grid": grid}), ("wilayah", wil), ("tren", tren)):
        simpan(os.path.join(DATA, f"kekeringan_{nama}.json"), isi)
    n = meta["nasional"]
    print(f"kekeringan: {n['sel']} sel bertingkat (SPI {meta['spi'] and meta['spi']['sel']}, tanah {meta['tanah']['sel']}); {n['kab_n']} kab >= waspada/siaga/awas; "
          f"{n['jiwa']} jiwa; {time.time() - t0:.0f} dtk", file=sys.stderr)
    sys.exit(0 if not rantai() else 1)


# Turunan kekeringan, urut ketergantungan (workflow tidak bisa disunting dari mesin agent, jadi dirantai di sini).
# Tiap langkah proses terpisah dengan batas waktu; langkah yang bahannya gagal dilewati (bukan dijalankan di atas berkas lama).
RANTAI = ("hth", "prakiraan", "padi", "ujibalik", "laporan", "neraca", "resmi", "bukti", "dampak", "posko", "riwayat")
BUTUH = {"padi": ("prakiraan",), "laporan": ("hth",), "neraca": ("hth",), "bukti": ("resmi",)}
BATAS_DTK = 1800


def rantai(jalan=None):
    """Kembalikan daftar langkah yang gagal atau dilewati. `jalan(nama) -> bool` bisa diganti untuk uji."""
    import subprocess
    if jalan is None:
        def jalan(nama):
            f = os.path.join(AB, f"{nama}.py")
            if not os.path.exists(f):
                return True
            try:
                return subprocess.call([sys.executable, f], timeout=BATAS_DTK) == 0
            except subprocess.TimeoutExpired:
                return False
    gagal = []
    for nama in RANTAI:
        if any(b in gagal for b in BUTUH.get(nama, ())):
            print(f"::warning title=kekeringan {nama}::dilewati karena bahannya gagal; berkas lamanya dibiarkan", file=sys.stderr)
            gagal.append(nama)
        elif not jalan(nama):
            print(f"::warning title=kekeringan {nama}::{nama}.py gagal; berkas lamanya dibiarkan", file=sys.stderr)
            gagal.append(nama)
    return gagal


def uji():
    assert [lv_spi(x) for x in (None, 0, -1, -1.5, -2.3)] == [None, 0, 1, 2, 3] and [lv_tanah(x) for x in (None, 50, 20, 10, 0)] == [None, 0, 1, 2, 3]
    assert gabung(None, None) is None and gabung(None, 3) == 2 and gabung(2, None) == 2 and gabung(0, 3) == 1 and gabung(1, 3) == 2 and gabung(3, 0) == 2
    assert gabung(3, None) == 2 and gabung(3, None, -1.4) == 2 and gabung(3, None, -1.5) == 3 and gabung(3, 2) == 3 and gabung(3, 1) == 2 and gabung(2, 3) == 3 and gabung(None, None, -3) is None
    assert lv_wilayah([70, 0, 0, 30], 100) == 3 and lv_wilayah([71, 0, 0, 29], 100) == 0 and lv_wilayah([0, 0, 20, 20], 100) == 2 and lv_wilayah([0, 0, 0, 0], 0) == 0
    assert pusat_sel(-10.3) == -10.25 and pusat_sel(123.7) == 123.75 and sel_terdekat({(0.25, 0.25): 1}, 0.1, 0.4) == (0.25, 0.25) and sel_terdekat({}, 0, 0) is None
    e = teks_enso({"status": "El Niño", "cpc_sinopsis": "likely through January-March 2027 (remaining greater than an 83% chance).", "oni_terakhir": {"nilai": 2.16, "musim": "JAS", "tahun": 2026}})
    assert e["peluang"] == 83 and e["hingga"] == "Jan–Mar 2027" and e["oni"] == 2.16
    # dua kabupaten, satu kecamatan sangat kering (SPI sintetis), satu normal
    tanah = {"hari_ini": "2026-10-13", "grid": [{"lat": .25, "lon": .25, "prov": "11", "pct0": None, "pct1": 3, "sm0": 0, "sm1": 0}, {"lat": .25, "lon": 1.25, "prov": "11", "pct0": None, "pct1": 60, "sm0": 0, "sm1": 0}]}
    fwi = {"hari_ini": "2026-10-12", "grid": [{"lat": .25, "lon": .25, "prov": "11", "hari": [{"tgl": "2026-10-12", "dc": 500.0}]}]}
    kering = {f"{y}{m:02d}": 5.0 + (y % 7) * .3 for y in range(1991, 2027) for m in range(1, 13) if (y, m) <= (2026, 8)}
    kering.update({f"2026{m:02d}": 0.1 for m in (6, 7, 8)})
    normal = {f"{y}{m:02d}": 5.0 + (y % 7) * .3 for y in range(1991, 2027) for m in range(1, 13) if (y, m) <= (2026, 8)}
    meta, grid, wil, tren = bangun(tanah, fwi, {"kec": {"11|Satu|A": 1000, "11|Dua|B": 3000}}, {"11|Satu|A": [.3, .3], "11|Dua|B": [.3, 1.2]}, {"status": "El Niño"},
                                   {"0.25,0.25": kering, "0.25,1.25": normal}, dt.date(2026, 10, 16))
    assert meta["spi"]["bulan"] == "2026-08" and wil["kab"]["11|Satu"]["lv"] == 3 and "11|Dua" not in wil["kab"] and meta["nasional"]["kab_n"] == [1, 1, 1]
    assert meta["nasional"]["jiwa"] == [1000, 1000, 1000] and wil["prov"]["11"]["lv"] == 0 and wil["prov"]["11"]["kab_n"] == [1, 1, 1]   # 25% < 30%: provinsi belum naik
    assert tren["dasarian"][-1]["id"] == "2026-28" and tren["dc_harian"][0]["med"] == 500 and tren["spi_bulanan"][-1]["bln"] == "2026-08"
    _, _, _, t2 = bangun(tanah, fwi, {"kec": {}}, {}, {}, {}, dt.date(2026, 10, 17), tren)
    assert len(t2["dasarian"]) == 1                                                                                              # dasarian sama: diganti, bukan ditambah
    assert all(RANTAI.index(b) < RANTAI.index(n) for n, bs in BUTUH.items() for b in bs) and RANTAI.index("bukti") < RANTAI.index("dampak") < RANTAI.index("posko")
    dicoba = []
    assert rantai(lambda n: dicoba.append(n) or n != "prakiraan") == ["prakiraan", "padi"] and "padi" not in dicoba   # padi tak dijalankan di atas prakiraan lama
    assert rantai(lambda n: True) == []
    print("ok status")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
