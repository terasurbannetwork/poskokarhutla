#!/usr/bin/env python3
"""SIPPA: kembar Python hidraulika.js (DESAIN-TEKNIS §5.3, SP-019). Stdlib saja.
Nama fungsi = JS dalam snake_case. Kasus acuan bersama: tests/sippa/fixtures/acuan.json.
Pakai: python3 scripts/data/sippa/hidraulika.py uji"""
import math
import sys
from pathlib import Path

KONST = {
    "rho": 1000, "g": 9.81, "m_per_bar": 10.197, "kw_per_hp": 0.7457,
    "hisap_m": 3.5, "batas_kerja": 0.88,
    "derating": {"a": 0.014, "t0": 20, "min": 0.58, "max": 1},
    "pn_sdr": {11: 16, 17: 10},
    "layflat_id_rasio": 0.96,
    "id_datasheet": {"min": 40, "maks": 260},
    "v_peringatan": 3, "sisa_keras": 1, "sisa_syarat": 2,
    "serap_lance_lpm": 40, "daya_rating_rasio": 0.85,
    "dalam_maks_m": 5, "dalam_uji_m": 3,
    "bsfc": {"solar": 0.25, "bensin": 0.38},
    "rho_bbm": {"solar": 0.84, "bensin": 0.74},
    "co2": {"bensin": 2.31, "solar": 2.68},
    "joukowsky_a": {"hdpe": 300, "layflat": 150},
    "ambang_zona": {"air": 2.5, "jalan": 5},
    "liku_trase": 1.2, "profil_langkah_m": 50, "g1_rasio": 1.5,
}

KELAS_POMPA = {
    "ve1500": {"titik": [[1500, 10], [2050, 6]], "kw": 44, "bbm": "bensin", "bbm_lpj": 22},
    "portabel_besar": {"titik": [[1000, 8], [1300, 6]], "kw": 30, "bbm": "bensin", "bbm_lpj": None},
    "tekanan_tinggi": {"titik": [[151, 17.2], [265, 10.3], [303, 6.9]], "kw": 8, "bbm": "bensin", "bbm_lpj": None},
}

BAWAAN = {"bahan": "layflat", "dn_mm": 100, "od_mm": None, "sdr": 11, "id_datasheet_mm": None, "pk_layflat_bar": 12,
          "L_m": 1000, "q_lpm": 300, "C": 130, "dz_m": 2, "dz_sumber": "masukan", "K": 5, "sisa_bar": 3, "eta": 0.65,
          "suhu_c": 35, "pompa": "ve1500", "n_pompa": 1, "jenis_bbm": None, "n_lance": 8, "serap_lain_lpm": 0,
          "dalam_m": 1.5, "jam": 24, "hisap": True, "perimeter_aktif": False, "sumber": None}


def ada_angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def batasi(x, a, b):
    return min(b, max(a, x))


def id_hdpe(od, sdr):
    if sdr not in KONST["pn_sdr"]:
        raise ValueError(f"SDR {sdr} tidak dikenal; pilih {' atau '.join(map(str, KONST['pn_sdr']))}")
    if not ada_angka(od) or od <= 0:
        raise ValueError("OD HDPE wajib angka positif")
    return od * (1 - 2 / sdr)


def id_layflat(dn, id_datasheet):
    k = KONST["id_datasheet"]
    if ada_angka(id_datasheet) and k["min"] <= id_datasheet <= k["maks"]:
        return {"id": id_datasheet, "asumsi": False}
    return {"id": KONST["layflat_id_rasio"] * dn, "asumsi": True}


def hf_hw(L, Q, C, D):
    return 10.67 * L * Q ** 1.852 / (C ** 1.852 * D ** 4.871)


def f_suhu(T):
    d = KONST["derating"]
    return batasi(1 - d["a"] * (T - d["t0"]), d["min"], d["max"])


def batas_tekanan(p):
    if p["bahan"] == "hdpe":
        return KONST["batas_kerja"] * KONST["pn_sdr"][p["sdr"]] * f_suhu(p["suhu_c"])
    return KONST["batas_kerja"] * p["pk_layflat_bar"]


def p_rating(kelas, q_lpm):
    # ponytail: dua sampai tiga titik datasheet, bukan kurva Q-H terukur; diganti kurva FAT sesudah G2
    t = kelas["titik"]
    if q_lpm <= t[0][0]:
        return t[0][1]
    for i in range(1, len(t)):
        if q_lpm <= t[i][0]:
            q0, p0 = t[i - 1]
            q1, p1 = t[i]
            return p0 + (p1 - p0) * (q_lpm - q0) / (q1 - q0)
    return None


def bbm_jam(kw, kelas, jenis, n_pompa):
    if kelas and kelas.get("bbm_lpj") and jenis == "bensin":
        return n_pompa * kelas["bbm_lpj"]
    return kw * KONST["bsfc"][jenis] / KONST["rho_bbm"][jenis]


def co2(liter, jenis):
    return liter * KONST["co2"][jenis]


def joukowsky(dv, a):
    """Lonjakan tekanan, bar: rho x a x dv / 1e5 (dv m/s, a m/s)."""
    if not ada_angka(dv) or not ada_angka(a) or a <= 0:
        raise ValueError("dv dan a wajib angka (a positif)")
    return KONST["rho"] * a * dv / 1e5


def neraca_air(s):
    """stok(t+1) = stok(t) + max(0, Q95 - Q_eko) x 86,4 - Q_api x 86,4 - evap (L/s dan m3); hari ke-1 = pertama."""
    for k in ("stok_m3", "q95_ls", "qeko_ls", "q_api_ls", "evap_m3_hari"):
        if not ada_angka(s.get(k)) or s[k] < 0:
            raise ValueError(f"{k} wajib angka 0 atau lebih")
    if not ada_angka(s.get("hari")) or int(s["hari"]) != s["hari"] or s["hari"] < 1:
        raise ValueError("hari wajib bilangan bulat 1 atau lebih")
    delta = (max(0, s["q95_ls"] - s["qeko_ls"]) - s["q_api_ls"]) * 86.4 - s["evap_m3_hari"]
    stok, hari, habis = s["stok_m3"], [], None
    for d in range(1, int(s["hari"]) + 1):
        stok += delta
        hari.append(stok)
        if habis is None and stok < 0:
            habis = d
    return {"hari": hari, "habis_hari": habis, "g1_ok": s["q95_ls"] >= KONST["g1_rasio"] * s["q_api_ls"],
            "q95_ls": s["q95_ls"], "q_api_ls": s["q_api_ls"]}


def periksa_masukan(p):
    if p["bahan"] not in ("layflat", "hdpe"):
        raise ValueError(f"bahan {p['bahan']} tidak ditawarkan untuk kit")
    for k in ("L_m", "q_lpm", "C", "eta", "n_pompa"):
        if not ada_angka(p[k]) or p[k] <= 0:
            raise ValueError(f"{k} wajib angka positif")
    if not ada_angka(p["dalam_m"]) or p["dalam_m"] < 0:
        raise ValueError("kedalaman lance wajib angka 0 atau lebih")
    if p["dalam_m"] > KONST["dalam_maks_m"]:
        raise ValueError(f"Injeksi lebih dari {KONST['dalam_maks_m']} m tidak termasuk SIPPA (keputusan 50)")
    if p["pompa"] is not None and p["pompa"] not in KELAS_POMPA:
        raise ValueError(f"kelas pompa {p['pompa']} tidak dikenal")


def hidraulika(masukan=None):
    p = {**BAWAAN, **(masukan or {})}
    periksa_masukan(p)
    idr = {"id": id_hdpe(p["od_mm"], p["sdr"]), "asumsi": False} if p["bahan"] == "hdpe" else id_layflat(p["dn_mm"], p["id_datasheet_mm"])
    D = idr["id"] / 1000
    Q = p["q_lpm"] / 60000
    A = math.pi * D * D / 4
    v = Q / A
    hf = hf_hw(p["L_m"], Q, p["C"], D)
    hm = p["K"] * v * v / (2 * KONST["g"])
    hisap = KONST["hisap_m"] if p["hisap"] else 0
    tdh = p["dz_m"] + hf + hm + p["sisa_bar"] * KONST["m_per_bar"] + hisap
    p_pompa = tdh / KONST["m_per_bar"]
    kw = KONST["rho"] * KONST["g"] * Q * tdh / p["eta"] / 1000
    kelas = KELAS_POMPA[p["pompa"]] if p["pompa"] else None
    rating = p_rating(kelas, p["q_lpm"]) if kelas else None
    p_tersedia = None if rating is None else p["n_pompa"] * rating
    p_ujung = p["sisa_bar"] if p_tersedia is None else p["sisa_bar"] + p_tersedia - p_pompa
    v_isi = A * p["L_m"]
    serap = p["n_lance"] * KONST["serap_lance_lpm"] + p["serap_lain_lpm"]
    jenis = p["jenis_bbm"] or (kelas["bbm"] if kelas else None) or "solar"
    bbm_l_jam = bbm_jam(kw, kelas, jenis, p["n_pompa"])
    bbm_l = bbm_l_jam * p["jam"]

    def titik(x):
        return {"x_m": x, "p_bar": p_pompa - (hf * x / p["L_m"] + p["dz_m"] * x / p["L_m"] + hisap) / KONST["m_per_bar"]}
    profil, x = [], 0
    while x < p["L_m"]:
        profil.append(titik(x))
        x += KONST["profil_langkah_m"]
    profil.append(titik(p["L_m"]))
    sumber = p["sumber"]
    h = {"id_mm": idr["id"], "id_asumsi": idr["asumsi"], "v_ms": v, "hf_m": hf, "hm_m": hm, "tdh_m": tdh,
         "p_pompa_bar": p_pompa, "p_batas_bar": batas_tekanan(p), "f_suhu": f_suhu(p["suhu_c"]),
         "p_tersedia_bar": p_tersedia, "p_ujung_bar": p_ujung, "kw": kw, "hp": kw / KONST["kw_per_hp"],
         "kw_per_pompa": kw / p["n_pompa"], "bbm_l_jam": bbm_l_jam, "bbm_l": bbm_l, "co2_kg": co2(bbm_l, jenis),
         "v_isi_m3": v_isi, "t_tiba_menit": v_isi / Q / 60, "serap_lpm": serap, "profil": profil,
         "neraca": neraca_air({**sumber, "q_api_ls": p["q_lpm"] / 60}) if sumber else None,
         "rating_ada": rating is not None}
    h["gerbang"] = gerbang_hidraulika(p, h)
    h["vonis"] = vonis(h["gerbang"])
    return h


def gerbang_hidraulika(masukan, h):
    p = {**BAWAAN, **masukan}
    kelas = KELAS_POMPA[p["pompa"]] if p["pompa"] else None
    g = []

    def tambah(kode, tingkat, nilai, batas, **ctx):
        g.append({"kode": kode, "tingkat": tingkat, "nilai": nilai, "batas": batas, **ctx})
    if h["p_pompa_bar"] > h["p_batas_bar"]:
        tambah("H-TEKANAN", "keras", h["p_pompa_bar"], h["p_batas_bar"], bahan=p["bahan"], sdr=p["sdr"], suhu_c=p["suhu_c"], f_suhu=h["f_suhu"])
    if h["p_ujung_bar"] < KONST["sisa_keras"]:
        tambah("H-SISA", "keras", h["p_ujung_bar"], KONST["sisa_keras"])
    elif h["p_ujung_bar"] < KONST["sisa_syarat"]:
        tambah("H-SISA2", "syarat", h["p_ujung_bar"], KONST["sisa_syarat"])
    if p["q_lpm"] > h["serap_lpm"]:
        tambah("H-SERAP", "keras", p["q_lpm"], h["serap_lpm"], n_lance=p["n_lance"])
    if kelas and not h["rating_ada"]:
        tambah("H-RATING", "keras", p["q_lpm"], kelas["titik"][-1][0])
    if kelas and h["kw_per_pompa"] > kelas["kw"] * KONST["daya_rating_rasio"]:
        tambah("H-DAYA", "keras", h["kw_per_pompa"], kelas["kw"], rasio=KONST["daya_rating_rasio"])
    if h["v_ms"] > KONST["v_peringatan"]:
        tambah("H-KECEPATAN", "syarat", h["v_ms"], KONST["v_peringatan"])
    if p["bahan"] == "hdpe" and p["perimeter_aktif"]:
        tambah("H-PANAS", "keras", None, None)
    n = h.get("neraca")
    if n and n["habis_hari"] is not None:
        tambah("H-AIR", "keras", n["habis_hari"], None, q_api_ls=n["q_api_ls"])
    elif n and not n["g1_ok"]:
        tambah("H-AIR", "syarat", n["q95_ls"], KONST["g1_rasio"] * n["q_api_ls"], q_api_ls=n["q_api_ls"])
    if p["dz_sumber"] == "dsm":
        tambah("H-DSM", "catatan", None, None)
    if p["dalam_m"] >= KONST["dalam_uji_m"]:
        tambah("H-UJI", "catatan", p["dalam_m"], KONST["dalam_uji_m"])
    urut = {"keras": 0, "syarat": 1, "catatan": 2}
    return sorted(g, key=lambda x: urut[x["tingkat"]])  # stabil, sama dengan Array.sort JS


def vonis(gerbang):
    if any(g["tingkat"] == "keras" for g in gerbang):
        return "NO-GO"
    return "HOLD" if any(g["tingkat"] == "syarat" for g in gerbang) else "KONDISIONAL"  # tidak ada GO


def uji():
    sys.path.append(str(Path(__file__).resolve().parent))
    import kembar_cli
    n = kembar_cli.uji_fixture({"hidraulika", "fSuhu", "neracaAir"})

    def galat(masukan):
        try:
            hidraulika(masukan)
        except ValueError:
            return True
        return False
    assert galat({"dalam_m": 5.1}), "dalam_m 5,1 harus ditolak"
    assert galat({"bahan": "hdpe", "od_mm": 160, "sdr": 13}), "SDR 13 harus ditolak"
    assert galat({"q_lpm": 0}), "q 0 harus ditolak"
    # A1: neraca air (DT §5.8)
    r = neraca_air({"stok_m3": 500, "q95_ls": 12, "qeko_ls": 2, "q_api_ls": 10, "evap_m3_hari": 5, "hari": 3})
    assert r["hari"] == [495, 490, 485] and r["habis_hari"] is None and r["g1_ok"] is False, r
    r2 = neraca_air({"stok_m3": 8, "q95_ls": 12, "qeko_ls": 2, "q_api_ls": 10, "evap_m3_hari": 5, "hari": 3})
    assert r2["habis_hari"] == 2, r2
    h = hidraulika({"q_lpm": 600, "sumber": {"stok_m3": 500, "q95_ls": 12, "qeko_ls": 2, "hari": 3, "evap_m3_hari": 5}})
    assert ("H-AIR", "syarat") in [(g["kode"], g["tingkat"]) for g in h["gerbang"]], h["gerbang"]
    assert abs(joukowsky(1, 300) - 3.0) < 1e-9
    assert vonis([]) == "KONDISIONAL" and vonis([{"tingkat": "syarat"}]) == "HOLD"
    print(f"hidraulika.py uji: OK ({n} kasus acuan + A1 + penolakan)")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit("pakai: hidraulika.py uji")
