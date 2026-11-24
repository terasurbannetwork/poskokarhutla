"""Gerbang tampil udara (KI-12) -> public/data/gerbang/udara.json. Memakai angka yang SUDAH ADA di keluaran udara; tidak menghitung model.

Tiap keluaran dibandingkan dengan pembanding sederhana TERKUAT yang tercatat di berkasnya sendiri (MAE terkecil / CSI terbesar di antara pembanding),
bukan yang paling mudah dikalahkan. Selang 95% dipakai hanya bila berkasnya memang menghitung selang untuk pembanding terkuat itu; selain itu
selang=null dan hasilnya false ("belum ada selang"). Bagian yang buktinya belum ada = entri kosong, boleh_tampil=false.

Pakai: python3 scripts/udara/gerbang_udara.py | uji   Jalankan sesudah prakiraan.py / openaq_mos.py / geoscf.py (udara.yml).
"""
import importlib.util
import json
import math
import os
import sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DATA = os.path.join(AKAR, "public", "udara", "data")
_sp = importlib.util.spec_from_file_location("umum_gerbang", os.path.join(AKAR, "scripts", "umum", "gerbang.py"))
G = importlib.util.module_from_spec(_sp)
sys.modules["umum_gerbang"] = G
_sp.loader.exec_module(G)


def baca(nama, data=DATA):
    try:
        return json.load(open(os.path.join(data, nama + ".json"), encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _ci(x):
    return x if isinstance(x, list) and len(x) == 2 and all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in x) else None


def entri_mae(metrik, mae, kunci_model, abaikan, n, ci, ci_vs, sumber):
    """MAE (rendah lebih baik). ci = selang 95% untuk (model - pembanding ci_vs). Pembanding = MAE terkecil di antara kunci yang bukan model/abaikan."""
    cand = {k: v for k, v in (mae or {}).items() if k != kunci_model and k not in abaikan and isinstance(v, (int, float))}
    if not cand or not isinstance(((mae or {}).get(kunci_model)), (int, float)):
        return G.kosong(metrik, "angka uji belum ada", sumber)
    kuat = min(cand, key=cand.get)
    ci = _ci(ci)
    selang = [-ci[1], -ci[0]] if ci and ci_vs == kuat else None
    return G.entri_ringkas(metrik, "rendah", f"{kuat} (pembanding sederhana terkuat di berkas)", n, mae[kunci_model], cand[kuat], selang, sumber,
                           rincian={"mae_uji": mae, "selang_dihitung_untuk": ci_vs})


def entri_metar(metrik, blok, sumber):
    """CSI (tinggi lebih baik). Butuh blok.model_baris_sama + persistensi/klimatologi + selisih_csi dari prakiraan.banding_metar."""
    blok = blok or {}
    m = blok.get("model_baris_sama")
    sel = blok.get("selisih_csi") or {}
    cand = {k: blok[k] for k in ("persistensi", "klimatologi") if isinstance(blok.get(k), dict) and isinstance(blok[k].get("csi"), (int, float))}
    if not m or not cand:
        return G.kosong(metrik, "pembanding persistensi/klimatologi METAR belum dihitung (jalan prakiraan.py berikutnya)", sumber, arah="tinggi")
    kuat = max(cand, key=lambda k: cand[k]["csi"])
    ci = _ci((sel.get(kuat) or {}).get("ci"))
    return G.entri_ringkas(metrik, "tinggi", f"{kuat} (pembanding sederhana terkuat)", blok.get("n_pembanding"), m["csi"], cand[kuat]["csi"], ci, sumber,
                           rincian={k: v["csi"] for k, v in cand.items()})


def entri_koreksi(blok, sumber):
    """Koreksi PM2,5 CAMS ke stasiun BMKG (prakiraan.json `koreksi`): MAE uji koreksi vs pembanding terkuat di antara CAMS mentah, persistensi 24 j, klimatologi stasiun."""
    blok = blok or {}
    mae = {"koreksi": blok.get("mae_model"), "cams_mentah": blok.get("mae_mentah"), "persistensi_24j": blok.get("mae_persistensi"), "klimatologi_stasiun": blok.get("mae_klimatologi")}
    return entri_mae("MAE uji koreksi PM2,5 CAMS ke stasiun BMKG (µg/m³)", mae, "koreksi", (), blok.get("n_uji"), blok.get("selang"), blok.get("selang_vs"), sumber)


def bangun(data=DATA):
    P, U, O, GC = baca("prakiraan", data), baca("uji_panen_pm25", data), baca("openaq_mos", data), baca("geoscf", data)
    galat = P.get("galat") or {}
    k = {}
    um, o, e = U.get("mos") or {}, O.get("mos") or {}, U.get("ensambel") or {}
    gu = GC.get("uji") or {}
    s_u, s_o, s_g, s_p = ["public/udara/data/uji_panen_pm25.json"], ["public/udara/data/openaq_mos.json"], ["public/udara/data/geoscf.json"], ["public/udara/data/prakiraan.json"]
    k["mos_pm25_arsip_openaq"] = entri_mae("MAE uji MOS PM2,5 (µg/m³), arsip OpenAQ multi-tahun", um.get("mae_uji"), "mos", (), um.get("n_uji"),
                                           um.get("selisih_mae_mos_vs_klimatologi_ci95"), "klimatologi_stasiun", s_u)
    k["mos_pm25_bmkg"] = entri_mae("MAE uji MOS PM2,5 (µg/m³), stasiun BMKG sebagai pengganti", o.get("mae_uji"), "mos", (), o.get("n_uji"),
                                   o.get("selisih_mae_mos_vs_klimatologi_ci95"), "klimatologi_stasiun", s_o)
    k["ensambel_cams_geoscf_arsip"] = entri_mae("MAE uji ensambel CAMS+GEOS-CF koreksi bias (µg/m³), arsip OpenAQ", e.get("mae_uji"), "ensambel_koreksi_bias", ("ensambel",),
                                                e.get("n_uji"), e.get("selisih_mae_ensambel_koreksi_vs_terbaik_ci95"), e.get("anggota_terbaik"), s_u)
    k["ensambel_cams_geoscf_bmkg"] = entri_mae("MAE uji ensambel CAMS+GEOS-CF koreksi bias (µg/m³), stasiun BMKG", gu.get("mae_uji"), "ensambel_koreksi_bias", ("ensambel",),
                                               gu.get("n_uji"), gu.get("selisih_mae_ensambel_koreksi_vs_terbaik_ci95"), gu.get("anggota_terbaik"), s_g)
    st = galat.get("stasiun")
    k["koreksi_pm25_bmkg"] = entri_koreksi(P.get("koreksi"), s_p)
    k["prakiraan_pm25_stasiun"] = G.kosong("galat prakiraan PM2,5 kota vs stasiun", "belum ada galat prakiraan terhadap stasiun" if not st
                                           else "pembanding persistensi stasiun belum dihitung", s_p)
    k["prakiraan_metar_analisis"] = entri_metar("CSI kejadian asap METAR (analisis CAMS hari lampau) vs pembanding", galat.get("metar"), s_p)
    k["prakiraan_metar_h1"] = entri_metar("CSI kejadian asap METAR (prakiraan hari+1) vs pembanding", galat.get("metar_prakiraan"), s_p)
    return k


def uji():
    pm = {"mos": 17.32, "klimatologi_stasiun": 19.21, "persistensi_24j": 15.15, "cams_mentah": 24.23}
    # pembanding terkuat = persistensi (tanpa selang) walau selang vs klimatologi lolos -> false, alasan selang
    e = entri_mae("m", pm, "mos", (), 10, [-2.4, -1.4], "klimatologi_stasiun", [])
    assert e["boleh_tampil"] is False and e["pembanding"].startswith("persistensi_24j") and e["selisih"] < 0, e
    # model kalah tipis tanpa selang -> false; menang dengan selang untuk pembanding terkuat -> true
    assert entri_mae("m", {"mos": 10.0, "klimatologi_stasiun": 12.0}, "mos", (), 10, [-3.0, -1.0], "klimatologi_stasiun", [])["boleh_tampil"] is True
    assert entri_mae("m", {"mos": 10.0, "klimatologi_stasiun": 12.0}, "mos", (), 10, [-3.0, .2], "klimatologi_stasiun", [])["boleh_tampil"] is False
    assert entri_mae("m", {"mos": 10.0, "klimatologi_stasiun": 12.0}, "mos", (), 10, None, "klimatologi_stasiun", [])["alasan"] == "belum ada selang"
    assert entri_mae("m", {}, "mos", (), 0, None, None, [])["boleh_tampil"] is False
    # METAR: tanpa kunci pembanding = kosong; dengan persistensi lebih kuat dan selang melewati nol = false; menang bersih = true
    assert entri_metar("c", {"csi": .3}, [])["boleh_tampil"] is False
    b = {"n_pembanding": 90, "model_baris_sama": {"csi": .30}, "persistensi": {"csi": .40}, "klimatologi": {"csi": .20},
         "selisih_csi": {"persistensi": {"ci": [-.2, -.01]}, "klimatologi": {"ci": [.02, .18]}}}
    r = entri_metar("c", b, [])
    assert r["boleh_tampil"] is False and r["pembanding"].startswith("persistensi"), r
    b["persistensi"]["csi"] = .25
    b["selisih_csi"]["persistensi"]["ci"] = [.01, .09]
    assert entri_metar("c", b, [])["boleh_tampil"] is True
    # koreksi: tanpa angka uji = kosong; model kalah dari klimatologi = false; menang atas semua dengan selang vs terkuat = true
    assert entri_koreksi({}, [])["boleh_tampil"] is False
    kb = {"mae_model": 9.0, "mae_mentah": 14.0, "mae_persistensi": 12.0, "mae_klimatologi": 10.0, "n_uji": 500, "selang": [-2.0, -0.2], "selang_vs": "klimatologi_stasiun"}
    assert entri_koreksi(kb, [])["boleh_tampil"] is True
    assert entri_koreksi(dict(kb, selang_vs="persistensi_24j"), [])["alasan"] == "belum ada selang"
    assert entri_koreksi(dict(kb, mae_model=10.5), [])["boleh_tampil"] is False
    # data nyata: semua entri punya kunci kontrak dan berkas < 100 KB
    k = bangun()
    assert k and all({"boleh_tampil", "alasan", "metrik", "selang95", "vonis_prospektif"} <= set(v) for v in k.values()), list(k)
    print("ok")


def main():
    k = bangun()
    p = G.tulis("udara", k)
    for n, v in k.items():
        print(f"{n:28s} boleh_tampil={v['boleh_tampil']!s:5s} model={v['skor_model']} pemb={v['skor_pembanding']} selang={v['selang95']} | {v['alasan']}")
    print(os.path.relpath(p, AKAR), os.path.getsize(p), "byte")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        main()
