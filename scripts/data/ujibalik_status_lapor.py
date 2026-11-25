"""KI-27 pelengkap DESKRIPTIF uji balik status (bukan vonis).

Vonis terkunci (ujibalik_status.py, sidik d494819f) membandingkan tiap tingkat dengan `persistensi_asli` (jumlah alarm
bebas ~17 ribu), padahal Awas hanya ~600 alarm: ETS tidak sebanding antar jumlah alarm yang jauh berbeda. Skrip ini
HANYA MEMBACA cache panen dan menambah kunci `deskriptif` ke public/data/ujibalik_status.json: selisih ETS terhadap
pembanding berjumlah alarm SAMA (persistensi_disamakan, klimatologi_disamakan) + CI95 bootstrap blok berpasangan
(blok provinsi x minggu ISO, B=300, seed 7, sama dengan kriteria). Kunci vonis tidak disentuh.

  python3 -I scripts/data/ujibalik_status_lapor.py uji
  python3 -I scripts/data/ujibalik_status_lapor.py jalan
"""
import datetime as dt
import json
import os
import random
import sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import ujibalik_status as U  # noqa: E402
import pembanding as PB  # noqa: E402

CATATAN = ("Vonis terkunci membandingkan tiap tingkat dengan persistensi asli (jumlah alarm bebas, ~17 ribu) sehingga "
           "Awas (~600 alarm) tidak sebanding; angka di sini membandingkan dengan pembanding berjumlah alarm sama, "
           "deskriptif, bukan vonis.")
LABEL = "deskriptif, bukan vonis (vonis terkunci membandingkan dengan persistensi asli)"


def deskriptif(rek, kabs, latih, uji, kr):
    sehari = dt.timedelta(days=1)
    hu = [uji[0] + dt.timedelta(days=i) for i in range((uji[1] - uji[0]).days + 1)]

    def lv_y(d, kab):
        return rek.get(d.isoformat(), {"k": {}})["k"].get(kab, (0, 0))

    def gen(r):
        for i in range((r[1] - r[0]).days + 1):
            d = r[0] + dt.timedelta(days=i)
            for kab in kabs:
                yield {"unit": kab, "bulan": (d + sehari).month, "y": lv_y(d + sehari, kab)[1]}
    lv, y, yd, blok = [], [], [], []
    for d in hu:
        iy = (d + sehari).isocalendar()
        for kab in kabs:
            a = lv_y(d, kab)
            lv.append(a[0]); yd.append(a[1]); y.append(lv_y(d + sehari, kab)[1])
            blok.append((kab.split("|")[0], iy[0], iy[1]))
    klim = PB.klimatologi(gen(latih), gen(uji))
    # persistensi = y hari d (evaluasi terkunci memeriksa kesejajaran ini dengan assert)
    rnd = random.Random(kr["bootstrap"]["seed"])
    jit = [rnd.random() * 1e-9 for _ in yd]
    sp = [a + j for a, j in zip(yd, jit)]
    sk = [a + j for a, j in zip(klim, jit)]
    out = {"label": LABEL, "catatan_vonis": CATATAN, "tingkat": {}}
    for nama, amb in U.TINGKAT.items():
        am = [v >= amb for v in lv]
        na = sum(am)
        t = {"n_alarm": na}
        for kunci, skor in (("persistensi_disamakan", sp), ("klimatologi_disamakan", sk)):
            pb = U.samakan_cepat(na, skor)
            bm, bb = U.hitung_blok(am, y, blok), U.hitung_blok(pb, y, blok)
            rows = [{"b": b, "m": bm[b], "p": bb[b]} for b in bm]

            def fn(rs):
                m = [sum(r["m"][i] for r in rs) for i in range(4)]
                p = [sum(r["p"][i] for r in rs) for i in range(4)]
                a, b = U.ets_hitung(*m), U.ets_hitung(*p)
                return None if a is None or b is None else a - b
            ci = PB.bootstrap_blok(fn, rows, "b", B=kr["bootstrap"]["B"], seed=kr["bootstrap"]["seed"])
            t[kunci] = {"ets_pembanding": PB.kontingensi(pb, y)["ets"],
                        "selisih_ets": {k: ci.get(k) for k in ("est", "lo", "hi", "B", "n_blok")}}
        out["tingkat"][nama] = t
    return out


def jalan():
    os.chdir(AKAR)
    jalur = os.path.join(AKAR, U.KELUAR)
    d = json.load(open(jalur))
    rek = U.muat_rekam(range(U.PANEN[0].year, U.PANEN[1].year + 1))
    d["deskriptif"] = deskriptif(rek, U.semua_kab(), U.LATIH, U.UJI, U.kriteria())
    with open(jalur, "w") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write("\n")
    for n, t in d["deskriptif"]["tingkat"].items():
        for k in ("persistensi_disamakan", "klimatologi_disamakan"):
            print(n, t["n_alarm"], k, t[k]["ets_pembanding"], t[k]["selisih_ets"])


def uji():
    # imbang biner: alarm himpunan samakan_cepat (jitter) == PB.samakan_alarm(pecah=-jitter), bukan cuma jumlahnya
    rnd = random.Random(3)
    n = 500
    pers = [int(rnd.random() < 0.3) for _ in range(n)]
    jit = [rnd.random() * 1e-9 for _ in range(n)]
    sp = [a + j for a, j in zip(pers, jit)]
    y = [0] * n
    for na in (1, 50, 149, 150, 151, 200, 499):
        am = [i < na for i in range(n)]
        ref = PB.samakan_alarm(am, sp, y, pecah=[-j for j in jit])
        cep = U.samakan_cepat(na, sp)
        assert ref["alarm"] == cep, f"himpunan alarm beda pada na={na}"
        assert sum(cep) == na
    # persistensi biner dengan imbang: yang dipilih adalah semua y=1 dahulu (skor 1+jitter), baru y=0
    cep = U.samakan_cepat(10, sp)
    assert all(pers[i] for i in range(n) if cep[i]), "alarm kecil harus dari skor biner 1"
    # deskriptif pada data sintetis kecil: model = persistensi -> selisih ETS ke persistensi_disamakan = 0
    rek, kabs = {}, ["11|A", "12|B"]
    r2 = random.Random(5)
    for i in range(400):
        d = dt.date(2021, 1, 1) + dt.timedelta(days=i)
        rek[d.isoformat()] = {"k": {k: [0, int(r2.random() < 0.3)] for k in kabs}, "c": [0, 0]}
    for iso, v in rek.items():
        for k in kabs:
            v["k"][k][0] = v["k"][k][1]  # level = y hari itu
    kr = {"bootstrap": {"B": 50, "seed": 7}}
    h = deskriptif(rek, kabs, (dt.date(2021, 1, 1), dt.date(2021, 6, 30)), (dt.date(2021, 7, 1), dt.date(2021, 12, 1)), kr)
    assert h["tingkat"]["Waspada"]["persistensi_disamakan"]["selisih_ets"]["est"] == 0.0, h["tingkat"]["Waspada"]
    assert "deskriptif" in h["label"] and "vonis" in h["catatan_vonis"]
    print("ujibalik_status_lapor uji OK")


if __name__ == "__main__":
    {"uji": uji, "jalan": jalan}[sys.argv[1]]()
