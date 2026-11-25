"""PB-49 / F-24: uji balik longsor kronologis dengan pembanding bersama scripts/umum/pembanding.py. Stdlib saja.

  python3 -I scripts/longsor/uji_inti.py uji   -> public/longsor/data/uji_inti.json {auc, klimatologi, lolos, ...}
  python3 -I scripts/longsor/uji_inti.py diri  -> self-check tanpa data

Pembagian: LATIH 2017-2021 (dipakai memilih ambang alarm dan laju klimatologi), UJI 2022, 2023, 2025 (2024 dibuang, DIBI tak lengkap).
Ambang model = skor yang memaksimalkan ETS di LATIH saja (skor model dari rumus.py, bobot tetap, tak dilatih pada label), lalu dibekukan.
Pembanding pada JUMLAH ALARM SAMA di UJI: persistensi (ada longsor kemarin di kab), klimatologi kab x bulan (LATIH), hujan-saja.
LOLOS (KEPUTUSAN-PARITAS 5.3): AUC model > AUC klimatologi pada UJI dan POD model >= POD persistensi pada alarm sama. Selain itu tetap hipotesis.
"""
import datetime as dt, importlib.util, json, os, sys

AKAR_L = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AKAR_L)
import model, rumus
from dasar import KELUAR, WIB, daftar_kec, kunci_sel, sel_hujan, simpan

_s = importlib.util.spec_from_file_location("pembanding_umum", os.path.join(AKAR_L, "..", "umum", "pembanding.py"))
PB = importlib.util.module_from_spec(_s); _s.loader.exec_module(PB)

TAHUN_LATIH = range(2017, 2022)
TAHUN_UJI = (2022, 2023, 2025)


def pilih_ambang(skor, y):
    """Ambang (alarm = skor >= ambang) dengan ETS terbesar di data latih; kandidat = kuantil atas skor positif."""
    pos = sorted(s for s, o in zip(skor, y) if o)
    if not pos:
        return None
    best = (None, -9)
    for q in range(0, 100, 5):
        amb = pos[int(len(pos) * q / 100)]
        k = PB.kontingensi([s >= amb for s in skor], y)
        if k["ets"] is not None and k["ets"] > best[1]:
            best = (amb, k["ets"])
    return best[0]


def nilai(rows_latih, rows_uji):
    """Murni: baris dict {unit, hari(int ordinal), bulan, y, sk, rs}. -> hasil uji. Dipakai self-check juga."""
    amb = pilih_ambang([r["sk"] for r in rows_latih], [r["y"] for r in rows_latih])
    y = [r["y"] for r in rows_uji]
    alarm = [r["sk"] >= amb for r in rows_uji] if amb is not None else [False] * len(y)
    pecah = [(r["hari"], r["unit"]) for r in rows_uji]
    klim = PB.klimatologi(rows_latih, rows_uji, ("unit", "bulan"))
    seri = {}
    for r in rows_latih + rows_uji:
        seri.setdefault(r["unit"], {})[r["hari"]] = r["y"]
    per = PB.persistensi(seri, 1)
    pers = [per.get((r["unit"], r["hari"]), 0) for r in rows_uji]
    skor = {"model": [r["sk"] for r in rows_uji], "klimatologi": klim, "hujan": [r["rs"] for r in rows_uji], "persistensi": pers}
    out = {"ambang_model": amb, "n_alarm": sum(alarm), "auc": {}, "pembanding_alarm_sama": {}}
    for nama, s in skor.items():
        out["auc"][nama] = None if not any(y) or all(y) else round(rumus.auc([a for a, o in zip(s, y) if o], [a for a, o in zip(s, y) if not o]), 4)
        if nama == "model":
            k = PB.kontingensi(alarm, y)
            out["model"] = {"pod": k["pod"] and round(k["pod"], 4), "far": k["far"] and round(k["far"], 4), "ets": k["ets"] and round(k["ets"], 4)}
        else:
            m = PB.samakan_alarm(alarm, s, y, pecah)
            k = PB.kontingensi(m["alarm"], y) if m else None
            out["pembanding_alarm_sama"][nama] = None if not k else {"pod": k["pod"] and round(k["pod"], 4), "far": k["far"] and round(k["far"], 4),
                                                                    "imbang_dipecah": m["imbang_dipecah"]}
    p, c = out["pembanding_alarm_sama"].get("persistensi"), out["auc"]["klimatologi"]
    pod_m = out["model"]["pod"] or 0
    out["lolos"] = bool(out["auc"]["model"] is not None and c is not None and out["auc"]["model"] > c and p and pod_m >= (p["pod"] or 0))
    out["klimatologi"] = c
    return out


def baris():
    kej, kecs = json.load(open(os.path.join(KELUAR, "kejadian.json"))), daftar_kec()
    kerent = json.load(open(os.path.join(KELUAR, "kerentanan.json")))
    awal, sel = model.harian_sel()
    akhir = awal + dt.timedelta(days=len(next(iter(sel.values()))) - 1)
    p95 = model.p95_sel(sel, awal, *model.LATIH)       # dari hujan saja, tanpa label
    r7 = {k: rumus.jumlah7(h) for k, h in sel.items() if k in p95}
    S2 = dict(zip(kerent["kec"], ((r[7] if len(r) > 7 else r[5]) for r in kerent["k"])))
    PV = dict(zip(kerent["kec"], ((r[6] if len(r) > 6 else None) for r in kerent["k"])))
    kab_kec = {}
    for k in kecs:
        c = kunci_sel(*sel_hujan(k["lat"], k["lon"]))
        if c in r7 and k["id"] in S2:
            kab_kec.setdefault(f'{k["prov"]}|{k["kab"]}', []).append((S2[k["id"]], c, PV[k["id"]]))
    kab_kec = {kb: v for kb, v in kab_kec.items() if any(x[2] is not None for x in v)}   # subset sama dengan uji utama
    kab_i = {n: i for i, n in enumerate(kej["kab"])}
    pos, buang = model.label_dibi(kej["dibi"])
    latih, uji = [], []
    for kab, daftar in kab_kec.items():
        ki = kab_i.get(kab)
        if ki is None:
            continue
        for th in (*TAHUN_LATIH, *TAHUN_UJI):
            d = max(dt.date(th, 1, 1), awal + dt.timedelta(days=7))
            while d.year == th and d <= akhir:
                i, iso = (d - awal).days, d.isoformat()
                tt = [(s, r7[c][i] / 10 / p95[c]) for s, c, _ in daftar if r7[c][i] is not None and p95[c] > 0]
                if tt and (ki, iso) not in buang:
                    r = {"unit": ki, "hari": d.toordinal(), "bulan": d.month, "y": int((ki, iso) in pos),
                         "sk": max(rumus.skor(s, t) for s, t in tt), "rs": max(t for _, t in tt)}
                    (latih if th in TAHUN_LATIH else uji).append(r)
                d += dt.timedelta(days=1)
    return latih, uji


def jalan_uji():
    latih, uji = baris()
    o = nilai(latih, uji)
    o = {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%d"), "vonis": "LOLOS" if o["lolos"] else "GAGAL",
         "aturan": "AUC model > AUC klimatologi (UJI) dan POD model >= POD persistensi pada jumlah alarm sama; ambang dipilih (ETS) hanya di LATIH.",
         "pembagian_waktu": f"latih {TAHUN_LATIH[0]}-{TAHUN_LATIH[-1]}, uji {list(TAHUN_UJI)} (2024 dibuang)",
         "cakupan": {"latih_kab_hari": len(latih), "latih_positif": sum(r["y"] for r in latih),
                     "uji_kab_hari": len(uji), "uji_positif": sum(r["y"] for r in uji)}, **o}
    simpan(os.path.join(KELUAR, "uji_inti.json"), o)
    print(o["vonis"], o["auc"], o["n_alarm"], o["model"], o["pembanding_alarm_sama"])


def diri():
    # sintetis: model sempurna di uji, klimatologi buta, persistensi tak ada kejadian berulang
    lat = [{"unit": u, "hari": h, "bulan": 1, "y": int(h % 10 == 0 and u == 0), "sk": 0.0, "rs": 0.0} for u in range(2) for h in range(100)]
    uji = [{"unit": u, "hari": 200 + h, "bulan": 2, "y": int(h in (3, 40) and u == 0), "sk": 1.0 if (h in (3, 40) and u == 0) else 0.0, "rs": 0.1} for u in range(2) for h in range(100)]
    lat[10]["sk"] = 1.0   # satu positif latih berskor tinggi -> ambang terpilih 1.0
    o = nilai(lat, uji)
    assert o["auc"]["model"] == 1.0 and o["lolos"] and o["n_alarm"] == 2, o
    uji2 = [dict(r, sk=0.5) for r in uji]   # model buta -> tak lolos
    assert not nilai(lat, uji2)["lolos"]
    print("uji lolos")


if __name__ == "__main__":
    {"uji": jalan_uji, "diri": diri}[sys.argv[1] if sys.argv[1:] else "diri"]()
