"""Profil paparan statis per kab/kota (514) -> public/prediksi/data/dampak.json. SKENARIO/PAPARAN, BUKAN PRAKIRAAN.

Hanya merakit keluaran modul lain (tidak menghitung ulang model); tiap bidang membawa sumbernya dan null bila sumber tidak
memuat kab itu:
  gempa    : public/gempa/data/risiko.json (skor/kelas bahaya USGS M>=5 radius 100 km) + inarisk_gempa.json (indeks InaRISK per kecamatan)
  genangan : public/banjir/data/genangan_nasional.json (luas genangan radar Copernicus GFM, kejadian terbesar yang terekam)
  terisolir: data/pusdalops/desa_terisolir.csv (desa langganan terisolir di logbook; batas atas, "layak dicek")
Tidak dibangun (data tidak terbuka per kab): kerusakan/korban gempa per kab (kerusakan.js butuh skenario guncangan, bukan keluaran statis),
waktu tiba tsunami per kab (tsunami.js menghitung dari batimetri per skenario; tak ada tabel statis), bangunan terendam (ditahan
genangan_nasional.boleh_tampil.bangunan = false), jembatan per kab (DIBI jembatan hanya tingkat provinsi).
Pakai: python3 scripts/prediksi/dampak.py   |   python3 scripts/prediksi/dampak.py uji
"""
import csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D  # noqa: E402

P = os.path.join(D.AKAR, "public")
KELUAR = os.path.join(D.DATA, "dampak.json")
LABEL = "Skenario dan paparan statis, bukan prakiraan. Tidak berubah per hari dan bukan peluang kejadian."


def gempa(kabs, cari):
    r = D.baca(os.path.join(P, "gempa/data/risiko.json"), {})
    g = D.baca(os.path.join(P, "gempa/data/inarisk_gempa.json"), {})
    out = {}
    for k, v in (r.get("kab") or {}).items():
        i = cari(*k.split("|", 1))
        if i:
            out[i] = {"skor": v[0], "kelas": r["kelas"][v[6]] if len(v) > 6 and v[6] is not None else None, "m_maks": v[4], "n_m5": v[5]}
    ina = {}
    for k, x in (g.get("nilai") or {}).items():
        p, kb, _ = k.split("|", 2)
        i = cari(p, kb)
        if i and x is not None:
            ina.setdefault(i, []).append(x)
    for i, xs in ina.items():
        o = out.setdefault(i, {})
        o.update({"inarisk_maks": round(max(xs), 2), "inarisk_rerata": round(sum(xs) / len(xs), 2), "kec_inarisk": len(xs), "kec_tinggi": sum(x >= 0.667 for x in xs)})
    return out, f"{r.get('sumber', 'USGS')}; {g.get('sumber', 'InaRISK BNPB')}"


def genangan(cari):
    d = D.baca(os.path.join(P, "banjir/data/genangan_nasional.json"), {})
    semua = [e for l in (d.get("aktif") or {}).values() for e in l] + list(d.get("riwayat") or [])
    out = {}
    for e in semua:
        i = cari(e.get("prov"), e.get("kab"))
        if not i or e.get("luas_ha") is None or e.get("sinyal_lemah"):
            continue
        if i not in out or e["tergenang_ha"] > out[i]["tergenang_ha"]:
            out[i] = {"tergenang_ha": e["tergenang_ha"], "acuan": e["acuan"], "cakupan_pct": e["cakupan_pct"], "bangunan": None}
    return out, (d.get("sumber") or "Copernicus GFM") + "; luas radar, bukan ukur lapangan; bangunan ditahan sampai koreksi permukiman FwDET"


def terisolir(cari):
    out, jalur = {}, os.path.join(D.AKAR, "data/pusdalops/desa_terisolir.csv")
    if not os.path.exists(jalur):
        return out, None
    for r in csv.DictReader(open(jalur, encoding="utf-8")):
        i = cari(*r["kab_kode"].split("|", 1)) if "|" in r["kab_kode"] else None
        if i:
            o = out.setdefault(i, {"desa": 0, "kejadian": 0})
            o["desa"] += 1
            o["kejadian"] += int(r["n_kejadian"] or 0)
    return out, "logbook Pusdalops BNPB, pola teks longgar: batas atas, bukan daftar pasti"


def bangun(kabs=None, cari=None):
    kabs = kabs or D.kab()
    cari = cari or D.pencari(kabs)
    bag = {"gempa": gempa(kabs, cari), "genangan": genangan(cari), "terisolir": terisolir(cari)}
    kab = {}
    for k in kabs:
        kab[k["id"]] = {n: bag[n][0].get(k["id"]) for n in bag}
    return {"dibuat": dt.datetime.now(D.WIB).isoformat(timespec="minutes"), "label": LABEL,
            "sumber": {n: bag[n][1] for n in bag},
            "tidak_dibangun": ["kerusakan dan korban gempa per kab (butuh skenario guncangan; kerusakan.js tidak punya keluaran statis per kab)",
                               "waktu tiba tsunami per kab (tsunami.js menghitung per skenario dari batimetri; tak ada tabel statis)",
                               "bangunan terendam banjir (genangan_nasional.boleh_tampil.bangunan = false)",
                               "jembatan per kab (DIBI jembatan hanya tingkat provinsi)"],
            "kab": kab}


def uji():
    kabs = [{"id": "0001", "nama": "A", "prov": "11", "geo": "11|A"}, {"id": "0002", "nama": "B", "prov": "11", "geo": "11|B"}]
    cari = lambda p, n: {"A": "0001", "B": "0002"}.get(n)
    assert cari("11", "A") == "0001" and cari("11", "Z") is None
    d = bangun(kabs, cari)
    assert set(d["kab"]) == {"0001", "0002"} and "bukan prakiraan" in d["label"]
    for v in d["kab"].values():
        assert set(v) == {"gempa", "genangan", "terisolir"}
    d = bangun()
    assert len(d["kab"]) == 514, len(d["kab"])
    ada = {n: sum(v[n] is not None for v in d["kab"].values()) for n in ("gempa", "genangan", "terisolir")}
    assert ada["gempa"] > 400, ada
    assert all(0 <= v["gempa"]["skor"] <= 100 for v in d["kab"].values() if v["gempa"] and "skor" in v["gempa"])
    print("dampak: uji lulus", ada)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        d = bangun()
        D.simpan(KELUAR, d)
        print(f"dampak: {len(d['kab'])} kab -> {KELUAR}")
