"""Lift empiris peringatan berantai baru (KI-51; ALGORITMA §6). Python stdlib saja.

Metode DITIRU dari scripts/data/logbook_turunan.py (susun_susulan, yang menghasilkan POLA src/berantai.js: banjir>longsor lift 2,12 ci 1,97-2,27):
  unit = (pemicu, kab); k = ada kejadian sasaran di kab itu dalam jendela; laju = k/n;
  pembanding (dasar) = peluang jendela yang sama dimulai di hari acak, kab dan BULAN-dalam-tahun yang sama (tahun dasar), supaya musim tidak menaikkan lift;
  lift = k / sum(pembanding); ci95 = bootstrap blok TAHUN (500 ulangan, benih tetap), pembanding tiap unit dianggap tetap.
  Pasangan dibuka (`buka`) hanya bila batas bawah ci95 > 1 (KEPUTUSAN Q5: tampil hanya di layar Pusdalops, tidak dikirim keluar).

Pasangan:
  gempa>longsor     gempa M >= 5,5 (USGS riwayat_m5.json) -> longsor tercatat di kab berpusat <= 50 km dari episentrum, 0-7 hari sesudahnya.
                    Longsor = logbook Pusdalops (data/pusdalops/logbook_kejadian.csv) UNION DIBI (public/longsor/data/kejadian.json), tanggal sama per kab digabung.
                    KETERBATASAN: kab diwakili titik pusatnya (kode.json), bukan batas; episentrum jauh dari pusat tapi masih di kab tidak terhitung.
  hujan>banjir_lahar  TIDAK TERSEDIA: tak ada arsip hujan harian per kab bertahun-tahun di repo, dan logbook tanpa subjenis lahar (DIBI hanya 1 baris lahar).

Keluaran: public/data/berantai_lift.json ("dibuat" paling pertama).
  python3 -I scripts/umum/berantai_lift.py uji
  python3 -I scripts/umum/berantai_lift.py jalan
"""
import bisect
import csv
import datetime as dt
import json
import math
import os
import random
import re
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
TAHUN_DASAR = {2014, 2015, 2016, 2017, 2018, 2019, 2020, 2024, 2025}  # sama dengan logbook_susulan.json (tahun logbook rapat)
JENDELA, M_MIN, R_KM = 7, 5.5, 50
BOOT_REP, BOOT_SEED = 500, 20261125


def haversine(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def ordinal(s):
    return dt.date.fromisoformat(s[:10]).toordinal()


def persentil(xs, p):
    xs = sorted(xs)
    i = (len(xs) - 1) * p
    lo = int(i)
    return xs[lo] + (xs[min(lo + 1, len(xs) - 1)] - xs[lo]) * (i - lo)


def lift_dari_unit(unit, ulangan=BOOT_REP, benih=BOOT_SEED):
    """unit = [(tahun, k, ex)] satu per pemicu-kab (k 0/1, ex = peluang pembanding). -> dict n,k,laju,dasar,lift,ci95,buka. Blok bootstrap = tahun."""
    n, k, ex = len(unit), sum(u[1] for u in unit), sum(u[2] for u in unit)
    out = {"n": n, "k": k, "laju": round(k / n, 3) if n else None, "dasar": round(ex / n, 3) if n else None,
           "lift": round(k / ex, 2) if ex > 0 else None, "ci95": None, "buka": False}
    blok = {}
    for y, kk, e in unit:
        b = blok.setdefault(y, [0, 0.0])
        b[0] += kk
        b[1] += e
    B = list(blok.values())
    if ex > 0 and len(B) > 1:
        rng, ls = random.Random(benih), []
        for _ in range(ulangan):
            s = [B[rng.randrange(len(B))] for _ in B]
            e = sum(x[1] for x in s)
            if e > 0:
                ls.append(sum(x[0] for x in s) / e)
        if len(ls) >= ulangan // 2:
            out["ci95"] = [round(persentil(ls, .025), 2), round(persentil(ls, .975), 2)]
    out["buka"] = bool(out["ci95"] and out["ci95"][0] > 1)
    return out


def peluang_dasar(hari, tahun_dasar=TAHUN_DASAR, jendela=JENDELA):
    """hari = set ordinal kejadian sasaran satu kab. -> {bulan: peluang jendela [s, s+jendela] berisi kejadian, s acak di bulan itu pada tahun dasar}."""
    urut = sorted(hari)
    tot, ada = {}, {}
    for y in tahun_dasar:
        for o in range(dt.date(y, 1, 1).toordinal(), dt.date(y, 12, 31).toordinal() + 1):
            m = dt.date.fromordinal(o).month
            i = bisect.bisect_left(urut, o)
            tot[m] = tot.get(m, 0) + 1
            if i < len(urut) and urut[i] <= o + jendela:
                ada[m] = ada.get(m, 0) + 1
    return {m: ada.get(m, 0) / tot[m] for m in tot}


def hitung(pemicu, kab_hari, tahun_dasar=TAHUN_DASAR, jendela=JENDELA):
    """pemicu = [(tanggal ISO, [kab terdampak])]; kab_hari = {kab: set ordinal}. Unit di luar tahun dasar dibuang."""
    dasar, unit = {}, []
    for tgl, kabs in pemicu:
        y, o = int(tgl[:4]), ordinal(tgl)
        if y not in tahun_dasar:
            continue
        m = dt.date.fromordinal(o).month
        for kb in kabs:
            hari = kab_hari.get(kb)
            if not hari:
                unit.append((y, 0, 0.0))
                continue
            if kb not in dasar:
                dasar[kb] = peluang_dasar(hari, tahun_dasar, jendela)
            k = 1 if any(o <= h <= o + jendela for h in hari) else 0
            unit.append((y, k, dasar[kb][m]))
    return unit


def pusat_kab():
    k = json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json"), encoding="utf-8"))
    return {v["kunci_nama"]: v["pusat"] for v in k.values() if v.get("kunci_nama") and v.get("pusat")}


RE_KAB = re.compile(r"^(kabupaten|kab\.)\s*", re.I)


def kunci(prov, nama):
    return prov + "|" + RE_KAB.sub("", (nama or "").strip())


def longsor_hari():
    """{kab: set ordinal} dari logbook (jenis longsor) UNION DIBI longsor; set menggabungkan tanggal kembar."""
    out = {}
    with open(os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            t = r["tgl_kejadian"]
            if r["jenis"] != "longsor" or not re.match(r"^20[12]\d-\d\d-\d\d$", t):
                continue
            for kb in r["kab_kode"].split(";"):
                if "|" in kb:
                    p, n = kb.strip().split("|", 1)
                    out.setdefault(kunci(p, n), set()).add(ordinal(t))
    d = json.load(open(os.path.join(AKAR, "public/longsor/data/kejadian.json"), encoding="utf-8"))
    for t, i, _n, _g in d["dibi"]:
        out.setdefault(d["kab"][i], set()).add(ordinal(t))
    return out


def gempa_pemicu(pusat, m_min=M_MIN, r_km=R_KM):
    d = json.load(open(os.path.join(AKAR, "public/gempa/data/riwayat_m5.json"), encoding="utf-8"))
    ix = {c: i for i, c in enumerate(d["kolom"])}
    out = []
    for b in d["baris"]:
        if b[ix["m"]] < m_min:
            continue
        la, lo = b[ix["lat"]], b[ix["lon"]]
        kabs = [kb for kb, (a, c) in pusat.items() if abs(a - la) <= r_km / 100 and haversine(la, lo, a, c) <= r_km]
        out.append((b[ix["waktu_utc"]][:10], kabs))
    return out


def jalan():
    lh = longsor_hari()
    pem = gempa_pemicu(pusat_kab())
    g = lift_dari_unit(hitung(pem, lh))
    g.update({"pemicu": "gempa M>=%s" % M_MIN, "susulan": "longsor", "radius_km": R_KM, "jendela_hari": JENDELA,
              "n_gempa_tahun_dasar": sum(1 for t, _ in pem if int(t[:4]) in TAHUN_DASAR),
              "n_gempa_tanpa_kab_50km": sum(1 for t, kb in pem if int(t[:4]) in TAHUN_DASAR and not kb)})
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
           "label": "Pola deskriptif dari arsip, bukan ramalan. Hanya tampil di layar Pusdalops (KEPUTUSAN Q5), tidak dikirim keluar.",
           "metode": "Lift = laju susulan / peluang jendela sama di hari acak (kab dan bulan sama, tahun dasar). ci95 bootstrap blok tahun, %d ulangan, benih %d, pembanding dianggap tetap (selang sedikit terlalu sempit). Gempa susulan satu rentetan dihitung terpisah (tidak independen). Kab diwakili titik pusat." % (BOOT_REP, BOOT_SEED),
           "tahun_dasar": sorted(TAHUN_DASAR),
           "pasangan": {"gempa>longsor": g,
                        "hujan>banjir_lahar": {"tersedia": False, "buka": False, "alasan": "tak ada arsip hujan harian per kab multi-tahun di repo; logbook tanpa subjenis lahar, DIBI hanya 1 baris lahar"}}}
    # konstanta siap tempel ke POLA di src/berantai.js (diwiring warga-api), hanya pasangan yang dibuka
    out["konstanta_pola"] = {k: {x: v[x] for x in ("n", "k", "laju", "dasar", "lift", "ci95")} for k, v in out["pasangan"].items() if v.get("buka")}
    jalur = os.path.join(AKAR, "public/data/berantai_lift.json")
    with open(jalur + ".tmp", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)
    print("berantai_lift:", json.dumps(g, ensure_ascii=False))


def uji():
    d = dt.date
    o = lambda s: d.fromisoformat(s).toordinal()
    # peluang dasar: satu kejadian 1 Jan 2014 saja; jendela 7 hari -> start 25 Des..1 Jan terjangkau; Januari = 8/(31*9 tahun)... bulan 1 tepat 1 Jan 2014 mulai 25-31 Des (bulan 12)
    pd_ = peluang_dasar({o("2014-01-10")}, {2014}, 7)
    assert abs(pd_[1] - 8 / 31) < 1e-9 and pd_[2] == 0 and pd_[12] == 0, pd_  # start 3..10 Jan = 8 hari dari 31
    # unit: gempa 2014-01-05 di kab A (longsor 2014-01-10: kena) dan kab B (tak ada: miss), gempa 2013 dibuang
    unit = hitung([("2014-01-05", ["A", "B"]), ("2013-01-05", ["A"])], {"A": {o("2014-01-10")}}, {2014}, 7)
    assert unit == [(2014, 1, 8 / 31), (2014, 0, 0.0)], unit
    # lift tepat: k=2, ex=0,5+0,5=1 -> 2,0
    r = lift_dari_unit([(2014, 1, .5), (2015, 1, .5)], ulangan=50)
    assert r["lift"] == 2.0 and r["n"] == 2 and r["k"] == 2
    # DITOLAK: lift tinggi tapi sedikit blok (2 tahun saja) tidak pernah membuka karena selang lebar mencakup <= 1 atau nol-pembanding
    assert not lift_dari_unit([(2014, 1, .9), (2015, 0, .9)], 200)["buka"]
    assert lift_dari_unit([(2014, 0, 0.0)])["lift"] is None and not lift_dari_unit([(2014, 0, 0.0)])["buka"]
    # acak: k ~ ex (lift ~1) di banyak tahun -> tidak dibuka; sinyal kuat (k = 4 x ex) -> dibuka
    rng = random.Random(1)
    nol = [(2000 + i % 10, 1 if rng.random() < .2 else 0, .2) for i in range(2000)]
    kuat = [(2000 + i % 10, 1 if rng.random() < .8 else 0, .2) for i in range(2000)]
    a, b = lift_dari_unit(nol), lift_dari_unit(kuat)
    assert not a["buka"] and a["ci95"][0] < 1.0 < a["ci95"][1], a
    assert b["buka"] and b["ci95"][0] > 1 and abs(b["lift"] - 4) < .5, b
    assert lift_dari_unit(kuat) == b                      # benih tetap
    assert abs(haversine(0, 0, 0, 1) - 111.19) < .1
    print("berantai_lift uji OK:", a["lift"], a["ci95"], b["lift"], b["ci95"])


if __name__ == "__main__":
    {"uji": uji, "jalan": jalan}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
