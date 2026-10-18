"""Hari Tanpa Hujan (HTH) "Deteksi Pantau Bencana" -> public/data/kekeringan_hth.json + cache data/raw/kekeringan/harian.json

Sumber: Open-Meteo forecast API (model gabungan, ET0 FAO-56 Penman-Monteith), per sel 0,5 derajat (kunci sel = kunci tanah.json),
`daily=precipitation_sum,et0_fao_evapotranspiration&past_days=92&forecast_days=16`, zona waktu Asia/Jakarta.
BMKG hanya menerbitkan peta HTH sebagai gambar, jadi HTH dihitung sendiri (lihat spi.py).

Definisi untuk halaman Metode:
  Hari tanpa hujan  = hari dengan hujan harian < 1 mm (AMBANG_MM), sama dengan ambang BMKG untuk hari hujan.
  HTH sebuah sel    = jumlah hari berturut-turut terakhir tanpa hujan, dihitung mundur dari hari acuan (kemarin WIB, hari yang sudah lengkap).
                      Data hanya 92 hari ke belakang, jadi HTH terbaca paling besar 93 (">= 93" untuk sel yang kering sepanjang jendela).
  Kelas BMKG        = 1-5 sangat pendek, 6-10 pendek, 11-20 menengah, 21-30 panjang, 31-60 sangat panjang, > 60 ekstrem.
  Wilayah           = kecamatan memakai sel terdekat (sama dengan status.py, penduduk.json + pusat_kec.json). Kabupaten/provinsi:
                      HTH maks (sel tertinggi di wilayah), HTH berbobot penduduk, jiwa di HTH >= 31 dan >= 61.

Kuota Open-Meteo: bobot per panggilan = lokasi x max(1, variabel/10 x hari/14) = lokasi x 1,54 (2 variabel, 108 hari).
611 sel dalam batch 50 = 13 panggilan, bobot ~941 dari 10.000/hari. Cache dipakai ulang bila < 6 jam.

Pakai:  python3 scripts/kekeringan/hth.py      |  python3 scripts/kekeringan/hth.py uji
"""
import datetime as dt, json, math, os, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import KuotaHabis, ambil, baca, simpan
import importlib.util as _iu   # "status" bentrok dengan scripts/banjir/status.py di sys.path: muat milik kekeringan dengan nama unik
_sp = _iu.spec_from_file_location("kekeringan_status", os.path.join(AB, "status.py"))
_st = _iu.module_from_spec(_sp)
_sp.loader.exec_module(_st)
sel_terdekat = _st.sel_terdekat

AKAR = os.path.normpath(os.path.join(AB, "../.."))
DIR_DATA = os.path.join(AKAR, "public/data")        # keluaran publik (uji_rantai menggantinya dengan direktori sementara)
DIR_MENTAH = os.path.join(AKAR, "data/raw/kekeringan")
WIB = dt.timezone(dt.timedelta(hours=7))
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
URL = ("https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum,et0_fao_evapotranspiration"
       "&past_days=92&forecast_days=16&timezone=Asia%2FJakarta")
AMBANG_MM = 1.0
BATAS_KELAS = (5, 10, 20, 30, 60)
NAMA_KELAS = ("Sangat pendek", "Pendek", "Menengah", "Panjang", "Sangat panjang", "Ekstrem")
BATCH = 50
UMUR_CACHE_JAM = 6
LAMA_SERI = 30
BATAS_WIL = .30   # sama dengan status.py: wilayah "terdampak" bila >= 30% penduduknya


def hth(p, t):
    """HTH pada indeks hari t dari seri hujan p (mm/hari). None bila p[t] kosong; berhenti di hari berhujan atau data kosong."""
    if not 0 <= t < len(p):
        raise ValueError(f"indeks hari {t} di luar seri sepanjang {len(p)}")
    if p[t] is None:
        return None
    n = 0
    i = t
    while i >= 0 and p[i] is not None and p[i] < AMBANG_MM:
        n += 1
        i -= 1
    return n


def kelas(n):
    """Indeks kelas BMKG 0..5 (NAMA_KELAS); None bila n kosong; 0 hari (hujan) juga kelas 0."""
    if n is None:
        return None
    return sum(1 for b in BATAS_KELAS if n > b)


def seri_hth(p, t_akhir, lama=LAMA_SERI):
    return [hth(p, t) if t >= 0 else None for t in range(t_akhir - lama + 1, t_akhir + 1)]


def kode_kab(penduduk):
    """{'prov|Nama kab': kode 4 digit}. Repo tidak punya tabel kode Kemendagri per kabupaten, jadi kode = kode prov + nomor urut
    nama kabupaten (urut abjad, dari penduduk.json). Kode ini INTERNAL dan stabil selama daftar kabupaten tidak berubah; bukan kode BPS."""
    per = {}
    for kk in penduduk["kec"]:
        p, kb, _ = kk.split("|")
        per.setdefault(p, set()).add(kb)
    out = {}
    for p, s in per.items():
        if len(s) > 99:
            raise ValueError(f"provinsi {p} punya {len(s)} kabupaten, kode 2 digit tidak cukup")
        for i, kb in enumerate(sorted(s), 1):
            out[f"{p}|{kb}"] = f"{p}{i:02d}"
    return out


def peta_kec(penduduk, pusat, sel_kunci):
    """[(prov, 'prov|kab', jiwa, kunci_sel)] per kecamatan yang punya titik tengah dan sel terdekat; sel_kunci = iterable 'lat,lon'."""
    pk = {(round(float(k.split(",")[0]), 2), round(float(k.split(",")[1]), 2)): k for k in sel_kunci}
    hasil = []
    for kk, jiwa in penduduk["kec"].items():
        p, kb, _ = kk.split("|")
        a = pusat.get(kk)
        c = sel_terdekat(pk, a[0], a[1]) if a else None
        if c:
            hasil.append((p, f"{p}|{kb}", jiwa, pk[c]))
    return hasil


# ---------- penjaga keluaran publik ----------

def umur_hari(d, sekarang, kunci="dibuat"):
    """Umur (hari, pecahan) medan ISO `kunci` dari dict keluaran; None bila tak ada atau tak terbaca."""
    try:
        return (sekarang - dt.datetime.fromisoformat(d[kunci])).total_seconds() / 86400
    except (TypeError, KeyError, ValueError):
        return None


def lewati(ada, sekarang, maks_hari, lebih_baru=None):
    """True bila keluaran publik `ada` masih segar (< maks_hari), LENGKAP, dan tidak kalah baru dari cache lokal `lebih_baru` (ISO)."""
    u = umur_hari(ada or {}, sekarang)
    if u is None or u >= maks_hari or not ada.get("lengkap"):
        return False
    if lebih_baru:
        try:
            if dt.datetime.fromisoformat(lebih_baru) > dt.datetime.fromisoformat(ada["dibuat"]):
                return False
        except (TypeError, ValueError):
            return False
    return True


def boleh_timpa(ada, baru_lengkap):
    """Keluaran separuh (baru_lengkap False) tidak boleh menimpa keluaran publik yang lengkap."""
    return bool(baru_lengkap) or not (ada and ada.get("lengkap"))


# ---------- unduh ----------

def _parse(resp, n, kunci):
    """Respons Open-Meteo (list bila >1 lokasi) -> ({kunci: {p, et0}}, tgl). Tolak bentuk yang tidak sesuai."""
    resp = resp if isinstance(resp, list) else [resp]
    if len(resp) != n:
        raise ValueError(f"Open-Meteo mengembalikan {len(resp)} lokasi, diminta {n}")
    out, tgl = {}, None
    for k, r in zip(kunci, resp):
        d = r.get("daily") or {}
        t, p, e = d.get("time"), d.get("precipitation_sum"), d.get("et0_fao_evapotranspiration")
        if not t or not isinstance(p, list) or not isinstance(e, list) or not (len(t) == len(p) == len(e)):
            raise ValueError(f"{k}: respons daily tidak lengkap")
        if tgl is not None and t != tgl:
            raise ValueError(f"{k}: tanggal beda dari sel lain")
        tgl = t
        out[k] = {"p": [None if v is None else round(v, 1) for v in p], "et0": [None if v is None else round(v, 2) for v in e]}
    return out, tgl


def unduh_harian(kunci, ambil_fn=ambil, jeda=1.0):
    """Banyak koordinat per panggilan (BATCH), coba ulang di dalam `ambil`. Mengembalikan (sel, tgl, bobot)."""
    sel, tgl, bobot = {}, None, 0.0
    for i in range(0, len(kunci), BATCH):
        ch = kunci[i:i + BATCH]
        lat = ",".join(k.split(",")[0] for k in ch)
        lon = ",".join(k.split(",")[1] for k in ch)
        r = ambil_fn(URL.format(lat=lat, lon=lon), coba=4, batas_waktu=120, kepala=UA)
        s, t = _parse(r, len(ch), ch)
        if tgl is not None and t != tgl:
            raise ValueError("tanggal antar-batch tidak sama")
        tgl = t
        sel.update(s)
        bobot += len(ch) * max(1.0, 2 / 10 * len(t) / 14)
        print(f"  harian {min(i + BATCH, len(kunci))}/{len(kunci)} bobot {bobot:.0f}", file=sys.stderr)
        if jeda:
            time.sleep(jeda)
    return sel, tgl, round(bobot)


def validasi_harian(h):
    if not isinstance(h, dict) or not h.get("tgl") or not h.get("sel"):
        raise ValueError("harian.json kosong atau bentuknya salah")
    n = len(h["tgl"])
    for k, s in h["sel"].items():
        if len(s["p"]) != n or len(s["et0"]) != n:
            raise ValueError(f"sel {k}: panjang seri {len(s['p'])}/{len(s['et0'])} != {n} tanggal")
    if h["hari_ini"] not in h["tgl"]:
        raise ValueError("hari_ini tidak ada di tgl")
    return h


def muat_harian(kunci, sekarang=None, paksa=False):
    """Cache data/raw/kekeringan/harian.json bila < UMUR_CACHE_JAM dan memuat semua sel; selain itu unduh."""
    sekarang = sekarang or dt.datetime.now(WIB)
    jalur = os.path.join(DIR_MENTAH, "harian.json")
    c = baca(jalur)
    if c and not paksa:
        umur = (sekarang - dt.datetime.fromisoformat(c["dibuat"])).total_seconds() / 3600
        if umur < UMUR_CACHE_JAM and all(k in c["sel"] for k in kunci):
            return validasi_harian(c)
    try:
        sel, tgl, bobot = unduh_harian(list(kunci))
    except KuotaHabis:
        if c and all(k in c["sel"] for k in kunci):
            print("::warning title=hth::kuota Open-Meteo habis; memakai cache lama", file=sys.stderr)
            return validasi_harian(c)
        raise
    hari = sekarang.date().isoformat()
    if hari not in tgl:
        raise ValueError(f"Open-Meteo tidak memuat hari ini {hari}: {tgl[0]}..{tgl[-1]}")
    h = {"dibuat": sekarang.isoformat(timespec="minutes"), "tgl": tgl, "hari_ini": hari, "bobot": bobot, "sel": sel}
    simpan(jalur, h)
    return validasi_harian(h)


# ---------- agregat ----------

def agregat_harian(seri_p, seri_h, peta, n):
    """Agregat per hari (n hari) per kabupaten/provinsi/nasional.

    seri_p[sel] = hujan n hari, seri_h[sel] = HTH n hari. Keluaran: {'kab': {kab: lima deret}, 'prov': {...}, 'nas': lima deret}
    deret: maks (HTH maks), pop (HTH berbobot penduduk), j31, j61 (jiwa), hujan (mm/hari berbobot penduduk); total = penduduk wilayah.
    """
    def baru():
        return {"total": 0, "maks": [None] * n, "_sp": [0.0] * n, "_np": [0] * n, "j31": [0] * n, "j61": [0] * n, "_sh": [0.0] * n, "_nh": [0] * n}

    tab = {"kab": {}, "prov": {}, "nas": baru()}
    for prov, kab, jiwa, k in peta:
        if k not in seri_h:
            continue
        for g, kunci in (("kab", kab), ("prov", prov), ("nas", None)):
            w = tab["nas"] if g == "nas" else tab[g].setdefault(kunci, baru())
            w["total"] += jiwa
            for d in range(n):
                h, p = seri_h[k][d], seri_p[k][d]
                if h is not None:
                    w["maks"][d] = h if w["maks"][d] is None else max(w["maks"][d], h)
                    w["_sp"][d] += h * jiwa
                    w["_np"][d] += jiwa
                    if h >= 31:
                        w["j31"][d] += jiwa
                    if h >= 61:
                        w["j61"][d] += jiwa
                if p is not None:
                    w["_sh"][d] += p * jiwa
                    w["_nh"][d] += jiwa

    def rapi(w):
        return {"total": w["total"], "maks": w["maks"], "j31": w["j31"], "j61": w["j61"],
                "pop": [round(a / b, 1) if b else None for a, b in zip(w["_sp"], w["_np"])],
                "hujan": [round(a / b, 2) if b else None for a, b in zip(w["_sh"], w["_nh"])]}
    return {"kab": {k: rapi(w) for k, w in tab["kab"].items()}, "prov": {k: rapi(w) for k, w in tab["prov"].items()}, "nas": rapi(tab["nas"])}


def urut_terpanjang(daftar):
    """Aturan bersama HTH terpanjang (laporan dan layar): HTH terbesar, seri -> penduduk (total) terbanyak, lalu nama.
    daftar = [('prov|Nama kab', hth, total_penduduk)] -> daftar terurut."""
    return sorted(daftar, key=lambda x: (-x[1], -x[2], x[0].split("|", 1)[1]))


def hitung(harian, penduduk, pusat, lama=LAMA_SERI):
    """Murni (tanpa jaringan): harian.json + penduduk -> (isi kekeringan_hth.json, agregat_harian lengkap untuk laporan)."""
    validasi_harian(harian)
    tgl = harian["tgl"]
    t_ref = tgl.index(harian["hari_ini"]) - 1          # kemarin: hari terakhir yang sudah lengkap
    if t_ref < lama:
        raise ValueError(f"seri hanya {t_ref + 1} hari sampai kemarin, butuh >= {lama}")
    seri_p = {k: s["p"][t_ref - lama + 1:t_ref + 1] for k, s in harian["sel"].items()}
    seri_h = {k: seri_hth(s["p"], t_ref, lama) for k, s in harian["sel"].items()}
    peta = peta_kec(penduduk, pusat, harian["sel"])
    ag = agregat_harian(seri_p, seri_h, peta, lama)
    kode = kode_kab(penduduk)
    ult = lambda w: {"kode": None, "total": w["total"], "maks": w["maks"][-1], "pop": w["pop"][-1], "j31": w["j31"][-1], "j61": w["j61"][-1]}
    kab = {}
    for k, w in ag["kab"].items():
        if w["maks"][-1] is None:
            continue
        kab[k] = {**ult(w), "kode": kode.get(k)}
    prov = {k: ult(w) for k, w in ag["prov"].items() if w["maks"][-1] is not None}
    sel = []
    for k in sorted(harian["sel"]):
        a, o = k.split(",")
        h = seri_h[k][-1]
        if h is not None:
            sel.append([float(a), float(o), h, kelas(h), seri_h[k]])
    urut = urut_terpanjang([(k, v["maks"], v["total"]) for k, v in kab.items()])
    terpanjang = {"kab": urut[0][0], "kode": kab[urut[0][0]]["kode"], "nama": urut[0][0].split("|", 1)[1], "hari": urut[0][1],
                  "n_seri": sum(1 for u in urut if u[1] == urut[0][1])} if urut else None
    nas = ag["nas"]
    kab_terdampak = [sum(1 for w in ag["kab"].values() if w["total"] and w["j31"][d] / w["total"] >= BATAS_WIL) for d in range(lama)]
    ag["kab31"] = kab_terdampak
    isi = {"dibuat": harian["dibuat"], "hari": tgl[t_ref], "tgl30": tgl[t_ref - lama + 1:t_ref + 1], "ambang_mm": AMBANG_MM,
           "batas_kelas": list(BATAS_KELAS), "kelas": list(NAMA_KELAS), "label": "Deteksi Pantau Bencana",
           "catatan": f"HTH = hari berturut-turut terakhir dengan hujan < {AMBANG_MM:g} mm sampai kemarin; data 92 hari ke belakang, jadi nilai terbesar 93. "
                      "Hujan: Open-Meteo (model gabungan), bukan pos BMKG; hasilnya bisa beda dari peta HTH BMKG.",
           "terpanjang": terpanjang, "nasional": {"total": nas["total"], "maks": nas["maks"][-1], "pop": nas["pop"][-1], "j31": nas["j31"][-1], "j61": nas["j61"][-1], "kab31": kab_terdampak[-1],
                        "seri": {"maks": nas["maks"], "j31": nas["j31"], "j61": nas["j61"], "kab31": kab_terdampak, "hujan": nas["hujan"]}},
           "prov": prov, "kab": kab, "kolom": ["lat", "lon", "hth", "kelas", "seri30"], "sel": sel}
    return isi, ag


def main():
    t0 = time.time()
    r = lambda f: json.load(open(os.path.join(DIR_DATA, f)))
    tanah, penduduk = r("tanah.json"), r("penduduk.json")
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    kunci = [f"{g['lat']},{g['lon']}" for g in tanah["grid"]]
    h = muat_harian(kunci)
    isi, _ = hitung(h, penduduk, pusat)
    simpan(os.path.join(DIR_DATA, "kekeringan_hth.json"), isi)
    n = isi["nasional"]
    print(f"hth: {len(isi['sel'])} sel, HTH maks {n['maks']}, {n['j31']} jiwa di HTH>=31, {n['kab31']} kab terdampak; bobot unduh {h.get('bobot', 'cache')}; {time.time() - t0:.0f} dtk", file=sys.stderr)


def fixture(hari_ini="2026-10-18"):
    """Harian sintetis: 108 hari, sel A kering 40 hari terakhir sebelum hari ini, sel B hujan tiap hari."""
    h0 = dt.date.fromisoformat(hari_ini)
    tgl = [(h0 + dt.timedelta(days=i)).isoformat() for i in range(-92, 16)]
    a = [5.0 if i < 52 else 0.0 for i in range(108)]
    a[92 - 1] = 0.5   # kemarin tetap kering
    b = [3.0] * 108
    return {"dibuat": f"{hari_ini}T06:00+07:00", "tgl": tgl, "hari_ini": hari_ini,
            "sel": {"0.25,0.25": {"p": a, "et0": [4.0] * 108}, "0.25,1.25": {"p": b, "et0": [4.0] * 108}}}


def uji():
    p = [5, 0, 0.5, 0.9, 1.0, 0, 0]
    assert hth(p, 3) == 3 and hth(p, 4) == 0 and hth(p, 6) == 2 and hth([None, 0, 0], 2) == 2 and hth([0, None], 1) is None   # 1,0 mm = hari hujan
    for jelek in (-1, 7):
        try:
            hth(p, jelek)
            raise SystemExit("hth harus menolak indeks luar seri")
        except ValueError:
            pass
    assert [kelas(n) for n in (None, 0, 5, 6, 10, 11, 20, 21, 30, 31, 60, 61, 93)] == [None, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
    assert seri_hth([0] * 10, 9, 3) == [8, 9, 10]
    # unduh: bentuk respons tunggal vs daftar, dan penolakan respons cacat
    r1 = {"daily": {"time": ["2026-10-01", "2026-10-02"], "precipitation_sum": [0, None], "et0_fao_evapotranspiration": [3.456, 4]}}
    s, t = _parse(r1, 1, ["1,1"])
    assert s["1,1"] == {"p": [0, None], "et0": [3.46, 4]} and t == ["2026-10-01", "2026-10-02"]
    for jelek, n in (([r1, r1], 1), ({"daily": {"time": ["a"], "precipitation_sum": [1, 2], "et0_fao_evapotranspiration": [1]}}, 1)):
        try:
            _parse(jelek, n, ["1,1"])
            raise SystemExit("_parse harus menolak respons cacat")
        except ValueError:
            pass
    sel, tgl, bobot = unduh_harian(["1,1", "2,2", "3,3"], lambda u, **kw: [r1, r1, r1], jeda=0)
    assert len(sel) == 3 and bobot == 3
    bad = fixture()
    bad["sel"]["0.25,0.25"]["p"].pop()
    try:
        validasi_harian(bad)
        raise SystemExit("validasi_harian harus menolak panjang tak sama")
    except ValueError:
        pass
    # kode kabupaten stabil dan berawalan kode prov
    pend = {"kec": {"11|Zeta|a": 1000, "11|Alfa|b": 3000, "72|Beta|c": 10}}
    kk = kode_kab(pend)
    assert kk == {"11|Alfa": "1101", "11|Zeta": "1102", "72|Beta": "7201"}, kk
    # hitung: A kering 40 hari -> kelas sangat panjang; B hujan -> 0
    pusat = {"11|Alfa|b": [.3, .3], "11|Zeta|a": [.3, 1.2], "72|Beta|c": [.3, .3]}
    isi, ag = hitung(fixture(), pend, pusat)
    sel = {(s[0], s[1]): s for s in isi["sel"]}
    assert sel[(.25, .25)][2] == 40 and sel[(.25, .25)][3] == 4 and sel[(.25, 1.25)][2] == 0       # 39 hari 0 mm + kemarin 0,5 mm
    assert isi["kab"]["11|Alfa"]["maks"] == 40 and isi["kab"]["11|Zeta"]["maks"] == 0 and isi["kab"]["11|Alfa"]["kode"] == "1101"
    assert isi["nasional"]["j31"] == 3010 and isi["nasional"]["j61"] == 0 and isi["nasional"]["kab31"] == 2   # Alfa dan Beta (sel A) >= 30% penduduk
    assert isi["prov"]["11"]["j31"] == 3000 and len(isi["tgl30"]) == 30 and isi["tgl30"][-1] == "2026-10-17"
    assert len(ag["nas"]["j31"]) == 30 and ag["nas"]["maks"][-1] == 40 and abs(ag["nas"]["pop"][-1] - 40 * 3010 / 4010) < .06
    assert len(json.dumps(isi)) < 300_000
    assert isi["terpanjang"] == {"kab": "11|Alfa", "kode": "1101", "nama": "Alfa", "hari": 40, "n_seri": 2}, isi["terpanjang"]      # Alfa dan Beta (72) seri 40; Alfa penduduk lebih banyak
    assert urut_terpanjang([("a|Zed", 62, 100), ("a|Abu", 62, 100), ("b|Besar", 62, 900), ("c|Kecil", 61, 9999)]) == [("b|Besar", 62, 900), ("a|Abu", 62, 100), ("a|Zed", 62, 100), ("c|Kecil", 61, 9999)]
    short = fixture()
    short["hari_ini"] = short["tgl"][10]
    try:
        hitung(short, pend, pusat)
        raise SystemExit("hitung harus menolak seri terlalu pendek")
    except ValueError:
        pass
    print("ok hth")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
