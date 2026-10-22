"""Uji balik klasifikasi firespot (harian.firespot) atas arsip VIIRS 2019 dan 2023 -> public/data/ujibalik_firespot.json

Pakai:  python3 scripts/data/ujibalik_firespot.py        (butuh data/raw/firms/viirs_<tahun>.csv = S-NPP, viirs_n20_<tahun>.csv, viirs_n21_2023.csv)
        python3 scripts/data/ujibalik_firespot.py uji     (self-check tanpa jaringan/berkas)
Unduh arsip: SENSOR=VIIRS_NOAA20 python3 scripts/data/firms.py 2019-08-01 2019-10-31 > data/raw/firms/viirs_n20_2019.csv (dst; NOAA-21 SP mulai 2023-03,
jadi 2019 "3 satelit" = S-NPP + NOAA-20 saja). Hanya stdlib.
Dua himpunan sensor per tahun: "snpp" (S-NPP saja) dan "gabungan" (semua VIIRS yang ada; titik diberi p["s"] N/N20/N21 seperti produksi, piksel unik lintas satelit).
Api besar = cluster ST-DBSCAN (dbscan() produksi) dengan >= 100 piksel unik, Agu-Okt, keyakinan n/h, type 0, tanpa gunung api. Dengan 3 satelit jumlah api besar
bisa berubah (piksel unik lebih banyak), jadi dilaporkan per himpunan sensor.
Per hari: jendela 7 hari, sev dari aturan.keparahan TANPA cuaca (FWI tidak ikut), pola dari aturan firespot (salinan setara firespot() produksi, dicek di `uji`).
Opsi ambang piksel Medium (tidak mengubah harian.py): "c_tetap4" (produksi), "a_3_semua", "b_3_hari_tanpa_siang" (3 bila cluster tidak punya titik daynight=D pada hari itu).
Ukuran api besar: hari pertama kandidat (sev >= 2, sev 3, px24 >= 15) berstatus "mungkin", tunda sampai pertama "ya".
Biaya (semua cluster): cluster yang pernah "ya", tambahan terhadap ambang 4, cluster-hari "ya", dan proksi alarm palsu (tambahan dengan umur <= 1 hari dan <= 2 / <= 4 piksel).
"""
import collections, csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
import aturan as A
import harian as H

BESAR_PX = 100
KRITERIA = {"sev>=2 (kandidat level 2)": lambda r: r[1] >= 2, "sev3 (px24>=10)": lambda r: r[1] >= 3,
            "px24>=15 (level 3 tanpa FWI)": lambda r: r[2] >= 15}


OPSI = {  # nama -> ambang piksel Medium menurut ada/tidaknya titik siang (D) pada cluster di hari itu
    "c_tetap4": lambda ada_siang: 4,
    "a_3_semua": lambda ada_siang: 3,
    "b_3_hari_tanpa_siang": lambda ada_siang: 4 if ada_siang else 3,
}
BERKAS = {"snpp": {2019: [("N", "viirs_2019.csv")], 2023: [("N", "viirs_2023.csv")]},
          "gabungan": {2019: [("N", "viirs_2019.csv"), ("N20", "viirs_n20_2019.csv")],
                       2023: [("N", "viirs_2023.csv"), ("N20", "viirs_n20_2023.csv"), ("N21", "viirs_n21_2023.csv")]}}


def baca(tahun, berkas):
    pts = []
    for sen, nama in berkas:
        jalur = os.path.join(H.AKAR, "data/raw/firms", nama)
        if not os.path.exists(jalur):
            sys.exit(f"{jalur} tidak ada: unduh dulu (lihat docstring)")
        for r in csv.DictReader(open(jalur)):
            if r["confidence"] not in ("n", "h") or r["type"] != "0" or not ("08-01" <= r["acq_date"][5:] <= "10-31"):
                continue
            la, lo = float(r["latitude"]), float(r["longitude"])
            if A.gunung_api(la, lo):
                continue
            j = r["acq_time"].zfill(4)
            pts.append({"lat": la, "lon": lo, "t": dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}:00+00:00"), "s": sen,
                        "c": 2 if r["confidence"] == "h" else 1, "px": max(float(r["scan"]), float(r["track"])), "dn": r["daynight"]})
    return sorted(pts, key=lambda p: p["t"])


def pola_ya(k0, k1, k2):  # salinan logika H.firespot
    pola = "HH" if k0 == "H" and k1 == "H" else "H" if k0 == "H" else "MH" if k1 == "H" else "MMM" if k1 == k2 == "M" else "MM" if k1 == "M" else "M"
    return pola, "ya" if pola in H.POLA_YA else "mungkin"


def per_hari(ps):  # hari WIB -> (ada titik c=2, himpunan piksel c=1, ada titik siang)
    d = {}
    for p in ps:
        a = d.setdefault(H.tgl(p["t"]), [False, set(), False])
        if p["c"] == 2:
            a[0] = True
        else:
            a[1].add(H.pix(p))
        if p["dn"] == "D":
            a[2] = True
    return d


def pola_hari(per, amb):  # hari -> (pola, firespot) untuk tiap hari deteksi
    def kelas(h):
        if h not in per:
            return None
        t, px, sg = per[h]
        return "H" if t or len(px) >= amb(sg) else "M"
    return {d: pola_ya(*(kelas(d - dt.timedelta(days=i)) for i in range(3))) for d in per}


def tahun(th, himpunan):
    pts = baca(th, BERKAS[himpunan][th])
    lab, _ = H.dbscan(pts)
    K = collections.defaultdict(list)
    for p, l in zip(pts, lab):
        K[l].append(p)
    out = {"titik": len(pts), "cluster": len(K), "satelit": [s for s, _ in BERKAS[himpunan][th]], "opsi": {}}
    # semua cluster: pola per hari tiap opsi + umur/piksel (biaya)
    info = []
    for ps in K.values():
        per = per_hari(ps)
        info.append((ps, per, {o: pola_hari(per, f) for o, f in OPSI.items()}, len({H.pix(p) for p in ps}), len(per)))
    besar = [(ps, pol) for ps, per, pol, npx, _ in info if npx >= BESAR_PX]
    out["api_besar"] = len(besar)
    base = {id(ps): any(v[1] == "ya" for v in pol["c_tetap4"].values()) for ps, per, pol, _, _ in info}
    for o in OPSI:
        rows_b = []
        for ps, pol in besar:
            rows = []
            for d in sorted(pol[o]):
                win = [p for p in ps if d - dt.timedelta(days=6) <= H.tgl(p["t"]) <= d]
                px24 = len({H.pix(p) for p in win if H.tgl(p["t"]) == d})
                sev = A.keparahan(len(win), len({H.tgl(p["t"]) for p in win}), 0, 0, px24)
                rows.append((d, sev, px24, *pol[o][d]))
            rows_b.append(rows)
        kr = {}
        for nama, cond in KRITERIA.items():
            hasil = []
            for rows in rows_b:
                a = next((r for r in rows if cond(r)), None)
                if a:
                    b = next((r for r in rows if cond(r) and r[4] == "ya"), None)
                    hasil.append((a[3], (b[0] - a[0]).days if b else None))
            mg = [h for h in hasil if h[1] != 0]
            kr[nama] = {"terukur": len(hasil), "hari_pertama_mungkin": len(mg), "persen_mungkin": round(100 * len(mg) / max(len(hasil), 1), 1),
                        "tak_pernah_ya": sum(h[1] is None for h in hasil),
                        "tunda_hari": {str(k): v for k, v in sorted(collections.Counter(h[1] for h in hasil).items(), key=lambda x: (x[0] is None, x[0]))},
                        "pola_hari_pertama": dict(collections.Counter(h[0] for h in hasil))}
        ya = [(ps, per, pol, npx, umur) for ps, per, pol, npx, umur in info if any(v[1] == "ya" for v in pol[o].values())]
        tambah = [x for x in ya if not base[id(x[0])]]
        out["opsi"][o] = {"api_besar_kriteria": kr,
            "biaya_semua_cluster": {"cluster_pernah_ya": len(ya), "cluster_tambahan_vs_tetap4": len(tambah),
                "cluster_hari_ya": sum(v[1] == "ya" for _, _, pol, _, _ in info for v in pol[o].values()),
                "cluster_hari_ya_tambahan": sum(pol[o][d][1] == "ya" and pol["c_tetap4"][d][1] != "ya" for _, _, pol, _, _ in info for d in pol[o]),
                "proksi_palsu_umur<=1hari_px<=2": sum(x[4] <= 1 and x[3] <= 2 for x in tambah),
                "proksi_palsu_umur<=1hari_px<=4": sum(x[4] <= 1 and x[3] <= 4 for x in tambah),
                "tambahan_umur_hari": dict(sorted(collections.Counter(min(x[4], 5) for x in tambah).items())),
                "catatan": "proksi, bukan alarm palsu terverifikasi; ya/tidak cluster dari pola firespot tanpa batas level"}}
    dn = collections.Counter((p["dn"], p["c"]) for ps, _ in besar for p in ps)
    out["porsi_titik_h_persen"] = {s: round(100 * dn[(k, 2)] / max(dn[(k, 1)] + dn[(k, 2)], 1), 1) for s, k in (("siang", "D"), ("malam", "N"))}
    return out


def uji():
    """Tanpa jaringan: salinan pola setara H.firespot produksi pada data sintetis, ambang bisa dibedakan."""
    import random
    random.seed(1)
    t0 = dt.datetime(2023, 9, 1, 3, tzinfo=dt.timezone.utc)
    for _ in range(300):
        ps = [{"lat": -2 + random.randint(0, 6) * 0.004, "lon": 110 + random.randint(0, 6) * 0.004, "c": random.choice((1, 1, 1, 2)),
               "t": t0 + dt.timedelta(days=random.randint(0, 3), hours=random.choice((0, 8, 14))), "dn": random.choice("DN")} for _ in range(random.randint(1, 14))]
        pol = pola_hari(per_hari(ps), OPSI["c_tetap4"])
        assert pol[max(pol)] == H.firespot(ps), (pol, H.firespot(ps))
    tg = lambda n, dn: [{"lat": -2, "lon": 110 + i * 0.004, "c": 1, "t": t0, "dn": dn} for i in range(n)]
    for dn, a, b, c in (("N", "mungkin", "ya", "ya"), ("D", "mungkin", "ya", "mungkin")):
        r = [pola_hari(per_hari(tg(3, dn)), OPSI[o])[t0.astimezone(H.WIB).date()][1] for o in ("c_tetap4", "a_3_semua", "b_3_hari_tanpa_siang")]
        assert r == [a, b, c], (dn, r)
    print("uji ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
        sys.exit()
    hasil = {"sumber": "VIIRS arsip standar SP (data/raw/firms), Agu-Okt, satu snapshot per hari, sev tanpa cuaca; snpp = S-NPP saja, gabungan = semua VIIRS yang ada (2019: S-NPP+NOAA-20; 2023: +NOAA-21)",
             "ambang_medium_px_produksi": H.AMBANG_MEDIUM_PX, "api_besar_min_px": BESAR_PX,
             "tahun": {str(t): {h: tahun(t, h) for h in BERKAS} for t in (2019, 2023)}}
    with open(os.path.join(H.KELUAR, "ujibalik_firespot.json"), "w") as f:
        json.dump(hasil, f, ensure_ascii=False, indent=1)
    for t, hs in hasil["tahun"].items():
        for h, v in hs.items():
            print(t, h, "titik", v["titik"], "cluster", v["cluster"], "api besar", v["api_besar"], "h% siang/malam", v["porsi_titik_h_persen"])
            for o, ov in v["opsi"].items():
                k = ov["api_besar_kriteria"]["sev>=2 (kandidat level 2)"]
                l3 = ov["api_besar_kriteria"]["px24>=15 (level 3 tanpa FWI)"]
                print("  ", o, "sev>=2", k["terukur"], f"mungkin {k['hari_pertama_mungkin']} ({k['persen_mungkin']}%)", "tunda", k["tunda_hari"], "takpernah", k["tak_pernah_ya"],
                      "| L3 tunda", l3["tunda_hari"], "| biaya", ov["biaya_semua_cluster"])
