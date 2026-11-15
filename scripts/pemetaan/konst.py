#!/usr/bin/env python3
"""Konstanta Pemetaan bangunan oleh relawan (HR): SATU sumber ambang (ALGORITMA.md pemetaan-relawan).
Isi identik dengan public/pemetaan/konst.js (dijaga tests/kemitraan/pemetaan_konst.test.mjs).
Semua ambang = HIPOTESIS (Q6, Q7) sampai uji kejujuran HR-05 lulus, bukan hasil kalibrasi data.
Pakai: python3 -I scripts/pemetaan/konst.py --cek | --json"""
import json, re, os, sys

KONST = {
    "AMBANG_KEYAKINAN": 0.70,            # = scripts/umum/bangunan.py AMBANG_KEYAKINAN (dicek di --cek)
    "N_PEMBANDING_MIN": 100,             # ALG §2: kurang dari ini rasio = null
    "KELAS": {"TIPIS_MAKS": 0.6, "MEMADAI_MIN": 0.85},   # ALG §3, Q6 HIPOTESIS: <0,6 tipis; 0,6-0,85 sedang; >0,85 memadai
    "SEGAR_HARI": 180,                   # ALG §6: ujung rentang ohsome lebih tua dari ini = basi
    "MINIMUM": {"KAMPUS": 1, "PEMETA": 10, "HARI": 30},  # Q7 HIPOTESIS
    "UJI": {"KAB": 10, "PERKOTAAN_MIN": 3, "PERDESAAN_MIN": 3, "COCOK_MIN": 7},  # ALG §4 uji kejujuran, T10
    "ASUMSI_KEBIJAKAN": ["KELAS", "SEGAR_HARI", "MINIMUM", "UJI", "N_PEMBANDING_MIN"],
}


def cek():
    k = KONST["KELAS"]
    assert 0 < k["TIPIS_MAKS"] < k["MEMADAI_MIN"] <= 1, k
    assert KONST["N_PEMBANDING_MIN"] == 100 and KONST["SEGAR_HARI"] == 180
    u = KONST["UJI"]
    assert u["PERKOTAAN_MIN"] + u["PERDESAAN_MIN"] <= u["KAB"] and u["COCOK_MIN"] <= u["KAB"], u
    assert set(KONST["ASUMSI_KEBIJAKAN"]) <= set(KONST)
    d = os.path.dirname(os.path.abspath(__file__))
    # ambang keyakinan harus satu nilai dengan pembanding yang sudah ada (tanpa mengimpor bangunan.py: baca barisnya)
    b = open(os.path.join(d, "..", "umum", "bangunan.py"), encoding="utf-8").read()
    m = re.search(r"^AMBANG_KEYAKINAN\s*=\s*([\d.]+)", b, re.M)
    assert m and float(m.group(1)) == KONST["AMBANG_KEYAKINAN"], "ambang keyakinan beda dari bangunan.py"
    js = open(os.path.join(d, "..", "..", "public", "pemetaan", "konst.js"), encoding="utf-8").read()
    m = re.search(r"const PM_KONST = (\{.*?\n\});\n", js, re.S)
    assert m and json.loads(m.group(1)) == KONST, "konst.js tidak identik dengan konst.py"
    print("OK konst.py (pemetaan): ambang urut, selaras bangunan.py, identik konst.js")


if __name__ == "__main__":
    if "--json" in sys.argv:
        print(json.dumps(KONST, ensure_ascii=False, indent=2))
    elif "--cek" in sys.argv:
        cek()
    else:
        sys.exit(__doc__)
