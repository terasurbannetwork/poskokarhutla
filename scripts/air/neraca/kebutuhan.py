"""NA-04 Kebutuhan air per kab/kota Jawa: domestik, irigasi, ternak, industri; 2025 dan proyeksi 2030 -> kebutuhan.json.

Bagian yang tidak bergantung iklim dihitung di sini dan ditulis ke kebutuhan.json; irigasi bulanan bergantung hujan dan
ET0 kab, jadi neraca.py memanggil `bulanan()` dengan iklim tiap bulan.

Koefisien (label di meta.koef):
- Domestik SNI 19-6728.1-2002 bag. 5: perkotaan 120, pedesaan 60 L/kapita/hari (resmi). Kota (kode xx7x) = 100%
  perkotaan; kab: pangsa perkotaan dipaskan supaya jumlah provinsi = persen perkotaan BPS 2025/2030 (olah(resmi)).
- Penduduk: WorldPop R2025A 2026 per kab (kab_jawa.csv, estimasi-model) diskala ke total provinsi BPS Proyeksi
  Penduduk 2010-2035 tahun 2025 dan 2030 (resmi; proyeksi berbasis SP2010, bukan SUPAS 2025).
- Irigasi: luas `irigasi_permukaan_ha` (kab_jawa.csv, olah(resmi) Permen PUPR 14/2015). Kebutuhan bulanan gaya KP-01:
  padi Kc x ET0 + perkolasi + penyiapan lahan - 0,7 x hujan; palawija Kc x ET0 - 0,7 x hujan; dibagi efisiensi.
  Pola padi (Nov-Feb), padi (Mar-Jun), palawija (Jul-Okt). Kc padi FAO-56 Tabel 12 (scripts/kekeringan/fao.py);
  sisanya ASUMSI_* (asumsi-kebijakan). Aliran balik 30% (keputusan pemilik 3): konsumtif = 70% pengambilan.
  Pembanding SNI 2002: 1 L/det/ha.
- Ternak SNI 19-6728.1-2002 Tabel 4: sapi/kerbau 40, kambing/domba 5, babi 6, unggas 0,6 L/ekor/hari (resmi).
  Masukan masukan/ternak_kab.csv (BPS per kab). Kab tanpa baris = null, bukan nol.
- Industri (keputusan pemilik 2): tenaga kerja industri besar-sedang BPS per kab x 500 L/hari/karyawan
  (PU 2005, dikutip sekunder; label estimasi-model). Masukan masukan/industri_kab.csv. Kab tanpa baris = null.
- Domestik, ternak, industri dianggap habis terpakai (tanpa aliran balik; konservatif, RANCANGAN §1.4).

Pakai:  python3 scripts/air/neraca/kebutuhan.py      |  python3 scripts/air/neraca/kebutuhan.py uji
"""
import calendar, csv, json, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/kekeringan"))
import fao  # noqa: E402

KAB = os.path.join(AKAR, "data/kajian-bnpb/data/air-jawa/kab_jawa.csv")
PAKET = os.path.join(AKAR, "data/kajian-bnpb/neraca-air")
BPS_KOTA = os.path.join(PAKET, "mentah/bps/perkotaan_prov_2015_2035.txt")
BPS_PROY = os.path.join(PAKET, "mentah/bps/proyeksi_prov_2010_2035.txt")
TERNAK = os.path.join(PAKET, "masukan/ternak_kab.csv")
INDUSTRI = os.path.join(PAKET, "masukan/industri_kab.csv")
KELUAR = os.path.join(DIR, "kebutuhan.json")

PROV = {"31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten"}
TAHUN = (2025, 2030)
L_KOTA, L_DESA = 120, 60                       # SNI 19-6728.1-2002 bag. 5
L_TERNAK = {"sapi_kerbau": 40, "kambing_domba": 5, "babi": 6, "unggas": 0.6}   # SNI 2002 Tabel 4
L_KARYAWAN = 500                               # PU 2005 (sekunder, via jurnal); estimasi-model
LDH_SNI = 1.0                                  # L/det/ha, SNI 2002 (pembanding)
BALIK_IRIGASI = 0.30                           # keputusan pemilik 3
# ---- ASUMSI kami (asumsi-kebijakan), bukan dari SNI/KP-01 tertulis --------------------------------------------------
ASUMSI_EFISIENSI = 0.65        # efisiensi irigasi total (saluran x petak)
ASUMSI_PERKOLASI = 2.0         # mm/hari padi
ASUMSI_PENYIAPAN = 250.0       # mm, bulan pertama tiap musim padi
ASUMSI_HUJAN_EFEKTIF = 0.7     # pecahan hujan bulanan
ASUMSI_KC_PALAWIJA = 0.7
ASUMSI_INTENSITAS = {"mt1": 1.0, "mt2": 1.0, "mt3": 0.5}   # pecahan luas DI yang ditanami per musim
# bulan -> (musim, Kc, penyiapan lahan?)
POLA = {11: ("mt1", fao.KC_PADI[0], True), 12: ("mt1", fao.KC_PADI[1], False), 1: ("mt1", fao.KC_PADI[1], False),
        2: ("mt1", fao.KC_PADI[2], False), 3: ("mt2", fao.KC_PADI[0], True), 4: ("mt2", fao.KC_PADI[1], False),
        5: ("mt2", fao.KC_PADI[1], False), 6: ("mt2", fao.KC_PADI[2], False),
        7: ("mt3", ASUMSI_KC_PALAWIJA, False), 8: ("mt3", ASUMSI_KC_PALAWIJA, False),
        9: ("mt3", ASUMSI_KC_PALAWIJA, False), 10: ("mt3", ASUMSI_KC_PALAWIJA, False)}


def baca_bps(jalur):
    """teks tabel BPS (render Playwright) -> {kode_prov: {tahun: nilai}}; angka '52785.70' atau '83,1'."""
    teks = open(jalur).read().splitlines()
    i = next(n for n, b in enumerate(teks) if b.startswith("2010\t2015\t2020\t2025\t2030\t2035"))
    th = [int(x) for x in teks[i].split("\t")]
    out = {}
    for b in teks[i + 1:]:
        c = b.split("\t")
        for kode, nama in PROV.items():
            if c[0].strip() == nama:
                out[kode] = {t: float(v.replace(",", ".")) for t, v in zip(th, c[1:])}
    assert set(out) == set(PROV), f"{jalur}: provinsi hilang {set(PROV) - set(out)}"
    return out


def kota(kode):
    return int(kode[2:]) >= 71


def baca_opsional(jalur, kolom):
    if not os.path.exists(jalur):
        return {}
    out = {}
    for r in csv.DictReader(open(jalur)):
        v = {k: (float(r[k]) if r[k].strip() else None) for k in kolom}   # kosong = null (komponen tak tersedia)
        if any(x is not None and x < 0 for x in v.values()):
            raise ValueError(f"{jalur} {r['kode']}: nilai negatif {v}")
        out[r["kode"]] = v
    return out


def statis(kab, kota_bps, proy_bps, ternak, industri):
    """-> {kode: {...}} juta m3/tahun (365 hari) untuk sektor non-iklim, per tahun kebutuhan"""
    wp = {}
    for r in kab:
        wp.setdefault(r["prov_kode"], 0)
        wp[r["prov_kode"]] += int(r["penduduk_worldpop_2026"])
    out = {}
    for t in TAHUN:
        pend = {r["kode"]: int(r["penduduk_worldpop_2026"]) * proy_bps[r["prov_kode"]][t] * 1000 / wp[r["prov_kode"]] for r in kab}
        for p in PROV:
            anggota = [r["kode"] for r in kab if r["prov_kode"] == p]
            p_tot = sum(pend[k] for k in anggota)
            p_kota = sum(pend[k] for k in anggota if kota(k))
            p_kab = p_tot - p_kota
            s_kab = min(1.0, max(0.0, (kota_bps[p][t] / 100 * p_tot - p_kota) / p_kab)) if p_kab else 1.0
            for k in anggota:
                s = 1.0 if kota(k) else s_kab
                d = out.setdefault(k, {})
                d[f"pend_{t}"] = round(pend[k])
                d[f"kota_persen_{t}"] = round(100 * s, 1)
                d[f"domestik_{t}"] = pend[k] * (s * L_KOTA + (1 - s) * L_DESA) * 365 / 1e9
    for r in kab:
        k = r["kode"]
        d = out[k]
        d["nama"], d["prov"] = r["nama"], r["prov_kode"]
        d["irigasi_ha"] = float(r["irigasi_permukaan_ha"] or 0)
        d["ternak"] = sum((ternak[k][j] or 0) * L_TERNAK[j] for j in L_TERNAK) * 365 / 1e9 if k in ternak else None
        d["industri"] = industri[k]["tenaga_kerja"] * L_KARYAWAN * 365 / 1e9 if k in industri else None
        for j in ("domestik_2025", "domestik_2030", "ternak", "industri"):
            if d[j] is not None:
                d[j] = round(d[j], 4)
    return out


def irigasi_mm(bulan, et0, p, hari):
    """kebutuhan pengambilan irigasi (mm di atas luas DI, sudah x intensitas / efisiensi) satu bulan"""
    if et0 < 0 or p < 0:
        raise ValueError(f"iklim negatif et0={et0} p={p}")
    musim, kc, siap = POLA[bulan]
    nfr = kc * et0 - ASUMSI_HUJAN_EFEKTIF * p
    if musim != "mt3":
        nfr += ASUMSI_PERKOLASI * hari + (ASUMSI_PENYIAPAN if siap else 0)
    return max(0.0, nfr) * ASUMSI_INTENSITAS[musim] / ASUMSI_EFISIENSI


def bulanan(d, tahun_keb, bulan, et0, p, hari=None, tahun=2001):
    """-> pengambilan per sektor satu bulan (juta m3) + 'konsumtif' (irigasi dikurangi aliran balik)"""
    hari = hari or calendar.monthrange(tahun, bulan)[1]
    f = hari / 365
    u = {"domestik": d[f"domestik_{tahun_keb}"] * f, "irigasi": irigasi_mm(bulan, et0, p, hari) * d["irigasi_ha"] * 1e-5,
         "ternak": (d["ternak"] or 0) * f, "industri": (d["industri"] or 0) * f}
    u["total"] = sum(u.values())
    u["konsumtif"] = u["total"] - BALIK_IRIGASI * u["irigasi"]
    u["irigasi_sni"] = d["irigasi_ha"] * LDH_SNI * 1e-3 * 86400 * hari / 1e6
    return u


def main():
    kab = list(csv.DictReader(open(KAB)))
    assert len(kab) == 119, f"kab_jawa.csv {len(kab)} baris, harus 119"
    ternak = baca_opsional(TERNAK, list(L_TERNAK))
    industri = baca_opsional(INDUSTRI, ["tenaga_kerja"])
    s = statis(kab, baca_bps(BPS_KOTA), baca_bps(BPS_PROY), ternak, industri)
    out = {"meta": {"satuan": "juta m3/tahun (365 hari); irigasi bulanan dihitung neraca.py dari iklim",
                    "label": "estimasi-model",
                    "koef": {"domestik_L_kapita_hari": {"kota": L_KOTA, "desa": L_DESA, "sumber": "SNI 19-6728.1-2002 bag. 5", "label": "resmi"},
                             "ternak_L_ekor_hari": {**L_TERNAK, "sumber": "SNI 19-6728.1-2002 Tabel 4", "label": "resmi"},
                             "industri_L_karyawan_hari": {"nilai": L_KARYAWAN, "sumber": "PU 2005, dikutip sekunder", "label": "sekunder"},
                             "irigasi": {"kc_padi": list(fao.KC_PADI), "kc_sumber": "FAO-56 Tabel 12", "efisiensi": ASUMSI_EFISIENSI,
                                         "perkolasi_mm_hari": ASUMSI_PERKOLASI, "penyiapan_mm": ASUMSI_PENYIAPAN,
                                         "hujan_efektif": ASUMSI_HUJAN_EFEKTIF, "kc_palawija": ASUMSI_KC_PALAWIJA,
                                         "intensitas": ASUMSI_INTENSITAS, "label": "asumsi-kebijakan",
                                         "aliran_balik": BALIK_IRIGASI, "pembanding_sni_L_det_ha": LDH_SNI}},
                    "sumber": {"penduduk": "WorldPop R2025A 2026 (kab_jawa.csv) diskala ke BPS Proyeksi Penduduk menurut Provinsi 2010-2035",
                               "perkotaan": "BPS Persentase Penduduk Daerah Perkotaan menurut Provinsi 2010-2035",
                               "irigasi_ha": "kab_jawa.csv irigasi_permukaan_ha (Permen PUPR 14/2015, olah(resmi))",
                               "ternak": os.path.relpath(TERNAK, AKAR) if ternak else None,
                               "industri": os.path.relpath(INDUSTRI, AKAR) if industri else None},
                    "kosong": {"ternak": len(kab) - len(ternak), "industri": len(kab) - len(industri)}},
           "kab": s}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    tot = {k: round(sum(v[k] for v in s.values() if v[k] is not None)) for k in ("domestik_2025", "domestik_2030", "ternak", "industri")}
    print(f"kebutuhan.json: 119 kab; juta m3/th {tot}; ternak kosong {out['meta']['kosong']['ternak']}, "
          f"industri kosong {out['meta']['kosong']['industri']} kab", file=sys.stderr)


def uji():
    kab = [{"kode": "9971", "nama": "Kota A", "prov_kode": "34", "penduduk_worldpop_2026": "100000", "irigasi_permukaan_ha": "0"},
           {"kode": "9901", "nama": "Kab B", "prov_kode": "34", "penduduk_worldpop_2026": "300000", "irigasi_permukaan_ha": "1000"}]
    kab += [{"kode": f"{p}01", "nama": "x", "prov_kode": p, "penduduk_worldpop_2026": "1", "irigasi_permukaan_ha": ""} for p in PROV if p != "34"]
    kb = {p: {2025: 50.0, 2030: 60.0} for p in PROV}
    pr = {p: {2025: 0.001, 2030: 0.001} for p in PROV}
    pr["34"] = {2025: 800.0, 2030: 880.0}   # ribu jiwa: skala 2x dan 2,2x
    s = statis(kab, kb, pr, {"9901": {"sapi_kerbau": 1000, "kambing_domba": 0, "babi": 0, "unggas": 0}}, {})
    a, b = s["9971"], s["9901"]
    assert a["pend_2025"] + b["pend_2025"] == 800000 and abs(b["pend_2030"] - 660000) < 1, "total provinsi = BPS"
    assert a["kota_persen_2025"] == 100 and abs(b["kota_persen_2025"] - 100 * (0.5 * 800000 - 200000) / 600000) < 0.1, "pangsa kota dipaskan"
    assert abs(a["domestik_2025"] - 200000 * 120 * 365 / 1e9) < 1e-3
    assert b["industri"] is None and abs(b["ternak"] - 1000 * 40 * 365 / 1e9) < 1e-6, "data kosong harus null, bukan 0"
    # irigasi: hujan besar -> nol, tidak negatif; penyiapan lahan hanya bulan pertama musim padi
    assert irigasi_mm(1, 120, 500, 31) == 0
    assert irigasi_mm(11, 120, 0, 30) - irigasi_mm(12, 120, 0, 31) > 200
    u = bulanan(b, 2025, 8, 150, 0)
    assert abs(u["konsumtif"] - (u["total"] - 0.3 * u["irigasi"])) < 1e-12 and u["irigasi"] > 0
    assert abs(u["irigasi_sni"] - 1000 * 0.001 * 86400 * 31 / 1e6) < 1e-9
    for salah in (lambda: irigasi_mm(1, -1, 0, 31), lambda: baca_opsional_uji()):
        try:
            salah()
        except (ValueError, AssertionError):
            pass
        else:
            raise AssertionError("masukan salah lolos")
    print("ok kebutuhan")


def baca_opsional_uji():
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
        f.write("kode,tenaga_kerja\n3401,-5\n")
    try:
        baca_opsional(f.name, ["tenaga_kerja"])
    finally:
        os.unlink(f.name)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
