"""Uji balik klasifikasi firespot (harian.firespot) atas arsip VIIRS S-NPP 2019 dan 2023 -> public/data/ujibalik_firespot.json

Pakai:  python3 scripts/data/ujibalik_firespot.py
Butuh data/raw/firms/viirs_2019.csv dan viirs_2023.csv (python3 scripts/data/firms.py). Hanya stdlib.
Api besar = cluster ST-DBSCAN dengan >= 100 piksel unik, Agu-Okt, S-NPP saja, keyakinan n/h, type 0, tanpa gunung api.
Per hari: jendela 7 hari, sev dari aturan.keparahan TANPA cuaca (FWI tidak ikut), pola dari firespot().
Ukuran: hari pertama kandidat (sev >= 2, sev 3, px24 >= 15) yang berstatus "mungkin", dan tunda sampai pertama "ya".
"""
import collections, csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
import aturan as A
import harian as H

BESAR_PX = 100
KRITERIA = {"sev>=2 (kandidat level 2)": lambda r: r[1] >= 2, "sev3 (px24>=10)": lambda r: r[1] >= 3,
            "px24>=15 (level 3 tanpa FWI)": lambda r: r[2] >= 15}


def baca(tahun):
    jalur = os.path.join(H.AKAR, f"data/raw/firms/viirs_{tahun}.csv")
    if not os.path.exists(jalur):
        sys.exit(f"{jalur} tidak ada: jalankan python3 scripts/data/firms.py dulu")
    pts = []
    for r in csv.DictReader(open(jalur)):
        if r["confidence"] not in ("n", "h") or r["type"] != "0" or not ("08-01" <= r["acq_date"][5:] <= "10-31"):
            continue
        la, lo = float(r["latitude"]), float(r["longitude"])
        if A.gunung_api(la, lo):
            continue
        j = r["acq_time"].zfill(4)
        pts.append({"lat": la, "lon": lo, "t": dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}:00+00:00"),
                    "c": 2 if r["confidence"] == "h" else 1, "px": max(float(r["scan"]), float(r["track"])), "dn": r["daynight"]})
    return sorted(pts, key=lambda p: p["t"])


def tahun(th):
    pts = baca(th)
    lab, _ = H.dbscan(pts)
    K = collections.defaultdict(list)
    for p, l in zip(pts, lab):
        K[l].append(p)
    besar = []
    for ps in K.values():
        if len({H.pix(p) for p in ps}) < BESAR_PX:
            continue
        rows = []
        for d in sorted({H.tgl(p["t"]) for p in ps}):
            win = [p for p in ps if d - dt.timedelta(days=6) <= H.tgl(p["t"]) <= d]
            px24 = len({H.pix(p) for p in win if H.tgl(p["t"]) == d})
            sev = A.keparahan(len(win), len({H.tgl(p["t"]) for p in win}), 0, 0, px24)
            pola, fs = H.firespot(win)
            rows.append((d, sev, px24, pola, fs))
        besar.append((rows, ps))
    out = {"titik": len(pts), "api_besar": len(besar), "kriteria": {}}
    for nama, cond in KRITERIA.items():
        hasil = []
        for rows, _ in besar:
            a = next((r for r in rows if cond(r)), None)
            if a:
                b = next((r for r in rows if cond(r) and r[4] == "ya"), None)
                hasil.append((a[3], (b[0] - a[0]).days if b else None))
        mg = [h for h in hasil if h[1] != 0]
        out["kriteria"][nama] = {"terukur": len(hasil), "hari_pertama_mungkin": len(mg),
                                 "persen_mungkin": round(100 * len(mg) / max(len(hasil), 1), 1),
                                 "tak_pernah_ya": sum(h[1] is None for h in hasil),
                                 "tunda_hari": {str(k): v for k, v in sorted(collections.Counter(h[1] for h in hasil).items(), key=lambda x: (x[0] is None, x[0]))},
                                 "pola_hari_pertama": dict(collections.Counter(h[0] for h in hasil))}
    dn = collections.Counter((p["dn"], p["c"]) for _, ps in besar for p in ps)
    out["porsi_titik_h_persen"] = {s: round(100 * dn[(k, 2)] / max(dn[(k, 1)] + dn[(k, 2)], 1), 1) for s, k in (("siang", "D"), ("malam", "N"))}
    return out


if __name__ == "__main__":
    hasil = {"sumber": "VIIRS S-NPP arsip standar (data/raw/firms), Agu-Okt, satu snapshot per hari, sev tanpa cuaca",
             "ambang_medium_px": H.AMBANG_MEDIUM_PX, "api_besar_min_px": BESAR_PX, "tahun": {str(t): tahun(t) for t in (2019, 2023)}}
    with open(os.path.join(H.KELUAR, "ujibalik_firespot.json"), "w") as f:
        json.dump(hasil, f, ensure_ascii=False, indent=1)
    for t, v in hasil["tahun"].items():
        print(t, "api besar", v["api_besar"], "siang/malam h%", v["porsi_titik_h_persen"])
        for n, k in v["kriteria"].items():
            print("  ", n, k["terukur"], "mungkin", k["hari_pertama_mungkin"], f"({k['persen_mungkin']}%)", "tunda", k["tunda_hari"], "tak pernah ya", k["tak_pernah_ya"])
