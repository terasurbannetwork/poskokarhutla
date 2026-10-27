"""Telusur hulu banjir per DAS: dari mana hujan yang mengalir ke daerah langganan/Siaga, dalam persen per sub-DAS hulu.

Dipanggil banjir.yml harian, SESUDAH status.py.
Pakai:  python3 scripts/banjir/hulu.py        bangun public/banjir/data/hulu.json (sesudah hujan.py dan status.py)
        python3 scripts/banjir/hulu.py uji    self-check luring (contoh sintetis + berkas hasil bila ada)

Masukan (semua sudah di repo/pipeline, tanpa jaringan):
- public/banjir/data/bukti/<slug>.json: DAS hulu + `subdas` (bukti_das.py subdas): luas irisan tiap sub-DAS dengan sel hujan 0,25 derajat,
  konsesi per sub-DAS, kecamatan terdekat, penanda sel hutan hilang terbanyak sejak 2021.
- public/banjir/data/hujan.json: hujan harian per sel (Open-Meteo, hari `hari`, `hari_ini` = indeks hari ini).
- public/banjir/data/status.json: status banjir per kecamatan (b) per hari.

Hitungan: volume hujan sub-DAS = jumlah (mm sel x km2 irisan); persen = volume sub-DAS / volume seluruh DAS. Dua jendela: 3 hari terakhir
s.d. hari ini (sama dengan h3 status) dan 3 hari ke depan (prakiraan). Sel tanpa data hujan tidak diisi; cakupannya ditulis.
Kontrak keluaran `hulu/1`, diperiksa `periksa()` sebelum ditulis.
"""
import datetime as dt
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import AKAR, KELUAR, WIB, baca, simpan  # noqa: E402

BUKTI = os.path.join(KELUAR, "bukti")
JALUR = os.path.join(KELUAR, "hulu.json")
N_JENDELA = 3
LEVEL = {0: "Normal", 1: "Waspada", 2: "Siaga", 3: "Awas"}
BATASAN = [
    "Persen adalah bagian volume hujan (mm x luas) yang jatuh di tiap sub-DAS, bukan debit sungai: penyerapan tanah, waktu tempuh aliran, bendungan, dan pasang tidak dihitung.",
    "Hujan dari kisi 0,25 derajat (sekitar 28 km) Open-Meteo, jadi sub-DAS kecil di satu sel mendapat nilai sel itu apa adanya.",
    "Batas DAS adalah sub-DAS HydroBASINS yang mengalir ke titik keluaran di kabupaten itu, bukan titik genangan persisnya.",
    "Hutan hilang dan konsesi adalah keadaan hulu (Hansen 2001 s.d. 2025, daftar konsesi repo yang belum lengkap), bukan penyebab banjir hari ini yang terbukti.",
]
SUMBER = {"hujan": "Open-Meteo (ECMWF IFS dan model global lain), hujan harian per sel 0,25 derajat",
          "das": "HydroBASINS v1c level 9 (HydroSHEDS)", "status": "status banjir Centurisk97 per kecamatan",
          "hutan": "Hansen/UMD/Google/USGS/NASA Global Forest Change v1.13", "konsesi": "GFW/Kemenhut 2014, Trase 2026, PPKH Jan 2026"}


def _angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def jendela(hari, hari_ini, n=N_JENDELA):
    """indeks hari (lalu, depan): lalu = n hari s.d. hari ini, depan = n hari sesudahnya; dipotong ke panjang seri"""
    i = hari.index(hari_ini) if hari_ini in hari else len(hari) - 1
    return list(range(max(0, i - n + 1), i + 1)), list(range(i + 1, min(len(hari), i + 1 + n)))


def hujan_subdas(sd, sel_mm, idx):
    """-> (mm rata-rata berbobot luas, volume mm*km2, km2 bercakupan) satu sub-DAS untuk indeks hari `idx`"""
    vol = cak = 0.0
    for la, lo, km2 in sd["sel"]:
        h = sel_mm.get((round(la, 3), round(lo, 3)))
        if h is None or not idx or any(not _angka(h[j]) for j in idx):
            continue
        vol += sum(h[j] for j in idx) * km2
        cak += km2
    return (vol / cak if cak else None), vol, cak


def daerah(d, sel_mm, lalu, depan, lv_kab):
    sds, tot = [], {"lalu": 0.0, "depan": 0.0}
    cak = {"lalu": 0.0, "depan": 0.0}
    for s in d["subdas"]:
        o = {"id": s["id"], "kec": s["kec"], "kab": s["kab"], "prov": s.get("prov", d["prov"]), "km2": s["km2"], "keluaran": s["keluaran"],
             "konsesi_ha": s["konsesi_ha"].get("semua", 0), "titik_hilang": s["titik_hilang"]}
        for nama, idx in (("lalu", lalu), ("depan", depan)):
            mm, vol, c = hujan_subdas(s, sel_mm, idx)
            o[nama + "_mm"] = None if mm is None else round(mm, 1)
            o["_" + nama] = vol
            tot[nama] += vol
            cak[nama] += c
        sds.append(o)
    for o in sds:
        for nama in ("lalu", "depan"):
            v = o.pop("_" + nama)
            o[nama + "_persen"] = round(100 * v / tot[nama], 1) if tot[nama] > 0 else None
    sds.sort(key=lambda o: -(o["lalu_persen"] or 0) - (o["depan_persen"] or 0) / 1000)
    # nama = kecamatan terdekat; beberapa sub-DAS bisa berbagi kecamatan, diberi nomor menurut luas (terbesar tanpa nomor)
    sama = {}
    for o in sorted(sds, key=lambda o: -o["km2"]):
        n = sama[(o["kec"], o["kab"])] = sama.get((o["kec"], o["kab"]), 0) + 1
        o["label"] = f"Kec. {o['kec']}" + ("" if o["kab"] == d["kab"] else f", {o['kab']}") + (f" ({n})" if n > 1 else "")
    ir = sum(c[2] for s in d["subdas"] for c in s["sel"])
    k = d["konsesi"]["semua"]
    return {"slug": d["slug"], "kunci": d["kunci"], "kab": d["kab"], "prov": d["prov"], "prov_nama": d["prov_nama"],
            "keluaran_kec": d["keluaran"]["kec"], "das_km2": d["das"]["luas_km2"], "n_subdas": len(sds),
            # cakupan = jendela terburuk; mm rata-rata DAS dibagi luas yang bercakupan (sel tanpa data tidak dianggap 0 mm)
            "cakupan_persen": round(100 * min(cak.values()) / ir, 1) if ir else 0.0,
            "status": lv_kab, "lalu_mm": round(tot["lalu"] / cak["lalu"], 1) if cak["lalu"] else None,
            "depan_mm": round(tot["depan"] / cak["depan"], 1) if cak["depan"] else None,
            "hutan": {"awal_ha": d["hutan"]["awal_ha"], "hilang_ha": d["hutan"]["hilang_ha"]},
            "konsesi": {"luas_ha": k["luas_ha"], "hilang_ha": k["hilang_ha"], "lengkap": d["konsesi"].get("lengkap")},
            "subdas": sds, "vonis": vonis(d["kab"], sds)}


def vonis(kab, sds):
    a = [o for o in sds if o["lalu_persen"]]
    if not a:
        return f"Belum ada hujan tercatat di hulu {kab} dalam 3 hari terakhir."
    t = max(a, key=lambda o: o["lalu_persen"])
    return (f"{str(t['lalu_persen']).replace('.', ',')}% hujan 3 hari terakhir di hulu {kab} jatuh di sub-DAS sekitar {t['label']}"
            + (" (sub-DAS keluaran)" if t["keluaran"] else "") + ".")


def level_kab(status, kunci, hari_ini):
    """status banjir kab = kecamatan tertinggi pada hari_ini hujan.json dan maks sesudahnya; status.json yang tidak memuat
    hari itu (basi atau beda jalan) -> 0, supaya kartu tidak menulis "hari ini" untuk status hari lain"""
    h = status.get("hari", [])
    if hari_ini not in h:
        return {"hari_ini": 0, "maks": 0}
    i = h.index(hari_ini)
    v = [x["b"][i:] for k, x in status.get("kec", {}).items() if k.startswith(kunci + "|") and len(x.get("b") or []) > i]
    return {"hari_ini": max((b[0] for b in v), default=0), "maks": max((max(b) for b in v), default=0)}


def bangun(hujan, status, bukti, dibuat):
    hari, hi = hujan["hari"], hujan["hari_ini"]
    lalu, depan = jendela(hari, hi)
    sel_mm = {(round(g["lat"], 3), round(g["lon"], 3)): g["h"] for g in hujan["grid"]}
    out = [daerah(d, sel_mm, lalu, depan, level_kab(status, d["kunci"], hi)) for d in bukti if d.get("subdas")]
    out.sort(key=lambda o: (-o["status"]["maks"], -(o["lalu_mm"] or 0)))
    return {"versi": "hulu/1", "dibuat": dibuat, "hari_ini": hi,
            "jendela": {"lalu": [hari[lalu[0]], hari[lalu[-1]]] if lalu else None, "depan": [hari[depan[0]], hari[depan[-1]]] if depan else None},
            "status_hari": status.get("hari", [])[:1] + status.get("hari", [])[-1:], "status_cocok": hi in status.get("hari", []),
            "n_siaga": sum(1 for o in out if o["status"]["maks"] >= 2), "daerah": out, "sumber": SUMBER, "batasan": BATASAN}


def periksa(H):
    g = []
    if H.get("versi") != "hulu/1":
        g.append(f"versi {H.get('versi')!r} bukan hulu/1")
    if not isinstance(H.get("batasan"), list) or not H["batasan"]:
        g.append("batasan wajib")
    for d in H.get("daerah", []):
        k = d.get("kunci")
        if d.get("status", {}).get("maks") not in LEVEL:
            g.append(f"{k}: level status {d.get('status')} di luar 0..3")
        if not 0 <= d.get("cakupan_persen", -1) <= 100.5:
            g.append(f"{k}: cakupan {d.get('cakupan_persen')} di luar 0..100")
        for nama in ("lalu", "depan"):
            p = [o[nama + "_persen"] for o in d["subdas"] if o[nama + "_persen"] is not None]
            if p and abs(sum(p) - 100) > 0.1 * len(p) + 0.2:
                g.append(f"{k}: persen {nama} berjumlah {sum(p):.1f}, harus 100")
            for o in d["subdas"]:
                mm = o[nama + "_mm"]
                if mm is not None and (not _angka(mm) or mm < 0 or mm > 3000):
                    g.append(f"{k}: sub-DAS {o['id']} {nama}_mm {mm} tak masuk akal")
        if sum(o["km2"] for o in d["subdas"]) > d["das_km2"] * 1.03 + 2:
            g.append(f"{k}: jumlah luas sub-DAS melebihi DAS {d['das_km2']} km2")
    return g


def _sintetis():
    sd = lambda i, kec, sel, kel=False: {"id": i, "km2": sum(c[2] for c in sel), "hulu_km2": 0, "keluaran": kel, "lat": 0, "lon": 0, "kec": kec, "kab": "A",
                                         "konsesi_ha": {"sawit": 50, "semua": 50}, "titik_hilang": False, "sel": sel}
    bukti = [{"slug": "11-a", "kunci": "11|A", "kab": "A", "prov": "11", "prov_nama": "Aceh", "keluaran": {"kec": "X"},
              "das": {"luas_km2": 300}, "hutan": {"awal_ha": 100, "hilang_ha": 10}, "konsesi": {"semua": {"luas_ha": 50, "hilang_ha": 5}, "lengkap": False},
              "subdas": [sd(1, "Hulu", [[0.125, 100.125, 100], [0.125, 100.375, 100]]), sd(2, "Hilir", [[0.375, 100.125, 100]], True)]}]
    hujan = {"hari": ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"], "hari_ini": "2026-10-12",
             "grid": [{"lat": 0.125, "lon": 100.125, "h": [10, 10, 10, 1, 1]}, {"lat": 0.125, "lon": 100.375, "h": [20, 20, 20, 0, 0]},
                      {"lat": 0.375, "lon": 100.125, "h": [0, 0, 0, 9, 9]}]}
    status = {"hari": ["2026-10-12", "2026-10-13"], "kec": {"11|A|X": {"b": [2, 1]}, "11|A|Y": {"b": [0, 3]}, "11|B|Z": {"b": [3, 3]}}}
    return hujan, status, bukti


def uji():
    import copy
    hujan, status, bukti = _sintetis()
    H = bangun(hujan, status, bukti, "2026-10-12T07:00+07:00")
    assert periksa(H) == [], periksa(H)
    d = H["daerah"][0]
    assert d["status"] == {"hari_ini": 2, "maks": 3}, d["status"]   # kab B tidak ikut
    hu = next(o for o in d["subdas"] if o["kec"] == "Hulu")
    # lalu: hulu (30+60)*100 = 9000, hilir 0 -> 100%; mm hulu = 9000/200 = 45
    assert hu["lalu_persen"] == 100.0 and hu["lalu_mm"] == 45.0, hu
    # depan (2 hari tersisa): hulu (2+0)*100 = 200, hilir 18*100 = 1800 -> 10% / 90%
    assert hu["depan_persen"] == 10.0, hu
    assert d["depan_mm"] == round(2000 / 300, 1) and d["cakupan_persen"] == 100.0, d
    st2 = dict(status, hari=["2026-10-20", "2026-10-21"])                        # status basi/beda hari: tidak dipakai
    H2 = bangun(hujan, st2, bukti, "x")
    assert H2["daerah"][0]["status"] == {"hari_ini": 0, "maks": 0} and H2["status_cocok"] is False and H["status_cocok"] is True
    assert [o["label"] for o in d["subdas"]] == ["Kec. Hulu", "Kec. Hilir"], [o["label"] for o in d["subdas"]]
    assert d["vonis"].startswith("100,0% hujan 3 hari terakhir di hulu A jatuh di sub-DAS sekitar Kec. Hulu"), d["vonis"]
    assert jendela(["a", "b", "c", "d", "e"], "a") == ([0], [1, 2, 3])
    # sel tanpa data hujan: cakupan turun, persen tetap berjumlah 100
    h2 = copy.deepcopy(hujan)
    h2["grid"].pop(1)
    d2 = bangun(h2, status, bukti, "x")["daerah"][0]
    assert d2["lalu_mm"] == 15.0, d2["lalu_mm"]   # 3000 / 200 km2 bercakupan, bukan / 300
    assert abs(d2["cakupan_persen"] - 66.7) < 0.1 and periksa(bangun(h2, status, bukti, "x")) == [], d2["cakupan_persen"]

    def tolak(ubah, potong):
        x = copy.deepcopy(H)
        ubah(x)
        assert any(potong in e for e in periksa(x)), (potong, periksa(x))

    tolak(lambda x: x["daerah"][0]["subdas"][0].update(lalu_persen=70), "harus 100")
    tolak(lambda x: x["daerah"][0]["subdas"][0].update(lalu_mm=-1), "tak masuk akal")
    tolak(lambda x: x["daerah"][0]["status"].update(maks=5), "level status")
    tolak(lambda x: x.update(batasan=[]), "batasan wajib")
    tolak(lambda x: x["daerah"][0].update(das_km2=10), "melebihi DAS")
    if os.path.exists(JALUR):
        g = periksa(json.load(open(JALUR)))
        assert not g, f"{JALUR}: {g}"
    print("hulu.py uji: lulus")


def muat_bukti(slug):
    """bukti/<slug>.json; bila salinan kerja tak punya `subdas` (CI memulihkan public/banjir/data dari cache lama yang menimpa
    berkas ter-commit), pakai versi di git HEAD: bukti dibuat tangan dan di-commit, jadi HEAD-lah sumber kebenarannya"""
    p = os.path.join(BUKTI, slug + ".json")
    d = json.load(open(p))
    if d.get("subdas"):
        return d
    import subprocess
    r = subprocess.run(["git", "show", f"HEAD:public/banjir/data/bukti/{slug}.json"], cwd=AKAR, capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout else d


def main():
    idx = baca(os.path.join(BUKTI, "index.json"))
    hujan, status = baca(os.path.join(KELUAR, "hujan.json")), baca(os.path.join(KELUAR, "status.json"), {})
    if not idx or not hujan:
        sys.exit("hulu: bukti/index.json atau hujan.json tidak ada")
    bukti = [muat_bukti(e["slug"]) for e in idx["daerah"]]
    H = bangun(hujan, status, bukti, dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"))
    g = periksa(H)
    if g:
        sys.exit("hulu.json ditolak:\n- " + "\n- ".join(g))
    if not H["status_cocok"]:
        print(f"::warning title=hulu status basi::status.json ({H['status_hari']}) tidak memuat hari_ini hujan {H['hari_ini']}; status kab ditulis 0", file=sys.stderr)
    telat = (dt.datetime.now(WIB).date() - dt.date.fromisoformat(H["hari_ini"])).days
    if telat > 1:
        print(f"::warning title=hulu hujan basi::hari_ini hujan.json {H['hari_ini']} tertinggal {telat} hari", file=sys.stderr)
    if not H["daerah"]:
        sys.exit("hulu: tidak ada daerah ber-subdas (jalankan bukti_das.py subdas)")
    simpan(JALUR, H)
    print(f"hulu: {len(H['daerah'])} daerah, {H['n_siaga']} Siaga/Awas", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:2] == ["uji"] else main()
