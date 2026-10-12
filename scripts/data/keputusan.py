"""Data dasar modul keputusan per provinsi prioritas -> public/data/keputusan.json

Luas terbakar dari titik panas lewat regresi log-log: log(luas) = a_prov + b log(titik), b nasional (termasuk 2015),
a per provinsi dari luas resmi SiPongi 2018-2023 (lihat kalibrasi()). Luas tahun normal = median tahun non-El Nino,
tahun El Nino = rata-rata 2015, 2019, 2023, 2026 = proyeksi tahun berjalan; sigma_log = sebaran sisa regresi.
Porsi gambut = bobot piksel aktif kompleks di gambut hari ini. Luas gambut provinsi TIDAK dipakai: peta gambut global
(CIFOR/Gumbricht) melebihkan luas ~2,5x dari angka BBSDLP, jadi hanya dipakai untuk tanda "di gambut atau tidak".
Parameter ekonomi & efektivitas (dengan sumber, rendah/tengah/tinggi) ikut disimpan; perhitungan skenario di peramban.
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PRIORITAS, PROVINSI

D = os.path.join(AKAR, "public/data")
EL_NINO = ["2015", "2019", "2023"]
# Paparan asap relatif terhadap rata-rata nasional (Hein dkk. 2022: beban kesehatan terbesar di Sumatra yang padat).
# ASUMSI kasar per pulau; diganti hitungan penduduk terpapar searah angin bila data penduduk dipasang.
PAPARAN = {"14": 1.5, "15": 1.3, "16": 1.5, "61": 0.9, "62": 0.8, "63": 1.0, "64": 0.7, "53": 0.3, "93": 0.2}

# [tengah, rendah, tinggi, satuan, sumber, catatan]; "lemah" = bukti lemah / asumsi
PARAM = {
    "rugi_ekonomi_ha": [76e6, 54e6, 90e6, "Rp/ha", "Bank Dunia 2016 (tanpa karbon & kesehatan) & 2019", "kurs Rp16.500/USD"],
    "rugi_kesehatan_ha": [36e6, 1e6, 66e6, "Rp/ha", "Hein dkk. 2022 (DALY US$4.710)", "tanpa nilai nyawa statistik resmi Indonesia"],
    "ispa_ha": [0.57, 0.19, 0.98, "kasus/ha", "BNPB 2019: 919.516 kasus", ""],
    "emisi_gambut_ha": [824, 350, 923, "tCO2e/ha", "Rodriguez Vasquez dkk. 2021", ""],
    "emisi_mineral_ha": [20, 3, 82, "tCO2e/ha", "turunan KLHK 2019", "lemah"],
    "harga_karbon": [50000, 30000, 825000, "Rp/tCO2e", "IDX Carbon / pajak karbon UU HPP / US$50", "tengah = pasar domestik"],
    "ef_mpa": [0.30, 0.0, 0.90, "porsi luas dicegah di desa program", "APRIL FFVP (klaim sendiri)", "lemah"],
    "ef_sekat": [0.10, 0.028, 0.37, "porsi luas dicegah di area dibasahi", "Castro dkk. 2026; Salmayenti dkk. 2026", ""],
    "ha_per_sekat": [9.8, 4.5, 14, "ha/sekat", "Castro dkk. 2026", ""],
    "umur_sekat": [3, 1, 10, "tahun", "Salmayenti dkk. 2026: 70% rusak 2015-2024", ""],
    "faktor_marginal": [0.75, 0.5, 1.0, "manfaat per ha dicegah / rata-rata kerugian per ha", "peer review: api kecil yang dicegah < rata-rata", "lemah"],
    "ukuran_api": [30, 10, 80, "ha per kejadian api (rata-rata akhir)", "ASUMSI dari luas resmi / jumlah kompleks VIIRS", "lemah"],
    "api_per_regu_hari": [0.5, 0.25, 1.0, "kejadian api diserang per regu per hari", "ASUMSI", "lemah"],
    "p_padam_awal": [0.6, 0.3, 0.85, "peluang api tertahan bila diserang dini", "ASUMSI (boreal ~0,9; gambut lebih rendah)", "lemah"],
    "porsi_tumbuh_dicegah": [0.8, 0.6, 0.95, "porsi ukuran akhir yang tidak sempat terbakar", "ASUMSI: diserang saat masih kecil", "lemah"],
    "regu_per_posko": [2, 1, 3, "regu per posko permanen", "ASUMSI perencanaan", ""],
    "jam_heli_per_api": [3, 1.5, 6, "jam terbang per kejadian api", "ASUMSI", "lemah"],
    "p_padam_heli": [0.2, 0.0, 0.4, "peluang api tertahan oleh water bombing", "BNPB: tidak efektif bila api sudah besar", "lemah"],
    "ef_omc": [0.05, 0.0, 0.20, "porsi luas dicegah", "BRIN 2022: hujan +57-81% bila ada awan", "lemah: asumsi konversi hujan ke luas"],
    "biaya_sekat": [23e6, 8e6, 194e6, "Rp/unit", "BRG 2019 (kayu); beton US$11.750", ""],
    "p_bakar_dibasahi": [0.10, 0.03, 0.30, "porsi lahan dibasahi yang terbakar, tahun El Nino", "ASUMSI: sekat ditaruh di gambut langganan api; diskalakan dengan luas tahun", "lemah"],
    "om_sekat": [0.10, 0.05, 0.20, "biaya perawatan per tahun / biaya sekat", "peer review M6", ""],
    "bunga": [0.10, 0.06, 0.12, "tingkat diskonto untuk anuitas modal", "ADB 2017 (6-9%); peer review M6", ""],
    "umur_alat": [5, 3, 8, "tahun", "ASUMSI umur ekonomis alat posko", ""],
    "biaya_mpa_desa": [100e6, 50e6, 200e6, "Rp/desa/tahun", "ASUMSI", "lemah: belum ada data resmi"],
    "desa_per_kecamatan": [11.5, 11.5, 11.5, "desa", "BPS: 83.763 desa / 7.277 kecamatan", ""],
    "biaya_heli_jam": [150e6, 100e6, 200e6, "Rp/jam", "BNPB", ""],
    "biaya_omc_hari": [220e6, 190e6, 250e6, "Rp/hari", "Kemenhut 2026", ""],
}


def luas_gambut():
    """Luas gambut per provinsi (ha) dari poligon sel peta gambut."""
    p = os.path.join(D, "lahan/gambut.geojson")
    if not os.path.exists(p):
        return {}
    out = {}
    for f in json.load(open(p))["features"]:
        g = f["geometry"]
        for ring in ([g["coordinates"][0]] if g["type"] == "Polygon" else [pp[0] for pp in g["coordinates"]]):
            la0 = ring[0][1]
            kx, ky = 111.32 * math.cos(math.radians(la0)), 110.57
            a = abs(sum(ring[i][0] * kx * ring[i + 1][1] * ky - ring[i + 1][0] * kx * ring[i][1] * ky for i in range(len(ring) - 1))) / 2
            out[f["properties"].get("prov")] = out.get(f["properties"].get("prov"), 0) + a * 100
    return out


def kalibrasi(L, S):
    """ln(ha) = a_prov + b ln(titik). Kemiringan b dari data NASIONAL 2015 + 2018-2023 (2015 = 2,61 juta ha, Bank Dunia/KLHK),
    karena tahun ekstrem harus ikut mengunci kemiringan: tanpa 2015, b = 1,27 dan tahun seperti 2015 dilebihkan 2x.
    Titik potong a_prov = rata-rata (ln ha - b ln titik) per provinsi. Papua Selatan (93) memakai luas KLHK 'Papua' (91)
    2018-2022 (sebelum pemekaran sebagian besar Merauke). Kembalikan {prov: (a, sigma, smear, n)} dan b."""
    th = L["tahun"]
    nas = lambda t: sum(sum(p.get(t, [0] * 12)) for p in S["prov"].values())
    titik_nas = [(nas("2015"), 2611411.0)] + [(nas(t), sum(v[i] for v in L["ha"].values())) for i, t in enumerate(th)]
    xs, ys = [math.log(a) for a, _ in titik_nas], [math.log(c) for _, c in titik_nas]
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    out = {}
    for kode, ha in L["ha"].items():
        hs = S["prov"].get(kode, {})
        pas = []
        for i, t in enumerate(th):
            luas = L["ha"]["91"][i] if kode == "93" and t < "2023" else ha[i]
            x = sum(hs.get(t, [0] * 12))
            if luas > 0 and x > 0:
                pas.append((math.log(x), math.log(luas)))
        if len(pas) < 4:
            continue
        a = sum(y - b * x for x, y in pas) / len(pas)
        res = [y - (a + b * x) for x, y in pas]
        sd = max(0.3, math.sqrt(sum(r * r for r in res) / max(1, len(res) - 1)))
        out[kode] = (a, sd, sum(math.exp(r) for r in res) / len(res), len(pas))
    return out, b


def main():
    L = json.load(open(os.path.join(D, "luas_resmi.json")))
    S = json.load(open(os.path.join(D, "sejarah.json")))
    K = json.load(open(os.path.join(D, "kluster.json")))["features"]
    pk = json.load(open(os.path.join(D, "posko.json")))
    kal, b = kalibrasi(L, S)
    th = S["tahun"]
    ini, hari_ini = th[-1], dt.date.today()
    bln = hari_ini.month - 1
    hasil = {}
    for kode in PRIORITAS:
        P = S["prov"].get(kode, {})
        a, sd, smear, n = kal[kode]
        est = lambda h: math.exp(a + b * math.log(max(h, 1))) * smear
        titik = {t: sum(P.get(t, [0] * 12)) for t in th}
        lalu = th[:-1]
        iklim = [sum(P.get(t, [0] * 12)[m] for t in lalu) / len(lalu) for m in range(12)]
        # bulan berjalan dihitung sebagian (peer review minor 1)
        hari_bln = (dt.date(hari_ini.year + (bln == 11), bln % 12 + 1 + 0, 1) - dt.timedelta(days=1)).day if False else 30
        sisa = (sum(iklim[bln + 1:]) + (1 - hari_ini.day / hari_bln) * iklim[bln]) / max(1, sum(iklim))
        en = [t for t in EL_NINO if t in lalu]
        biasa = [t for t in lalu if t not in EL_NINO]
        L_en = sum(est(titik[t]) for t in en) / len(en)
        L_bi = sorted(est(titik[t]) for t in biasa)[len(biasa) // 2]
        q = [f["properties"] for f in K if f["properties"]["prov"] == kode and f["properties"]["level"] >= 1]
        bobot = sum(max(1, p.get("px24", 0)) for p in q) or 1
        gambut = sum(max(1, p.get("px24", 0)) for p in q if p.get("gambut")) / bobot
        tahun_lalu = [i for i, t in enumerate(th) if t != ini]
        total_kec = langganan = 0
        for kk, v in S["kec"].items():
            if not kk.startswith(kode + "|"):
                continue
            jml = sum(v[i] for i in tahun_lalu)
            total_kec += jml
            if sum(1 for i in tahun_lalu if v[i] >= 10) >= 3:
                langganan += jml
        perm = [x for x in pk.get("posko", []) if x["prov"] == kode and x.get("jenis_posko") == "permanen"]
        from posko import km as jarak, tengah_kecamatan
        tk = {(c["kab"], c["nama"][5:]): c for c in tengah_kecamatan(kode)}
        tot_h = dekat_h = 0
        for kk, v in S["kec"].items():
            if not kk.startswith(kode + "|"):
                continue
            _, kb, kc = kk.split("|")
            c = tk.get((kb, kc))
            if not c:
                continue
            jml = sum(v[i] for i in tahun_lalu)
            tot_h += jml
            if any(jarak(c["lat"], c["lon"], x["lat"], x["lon"]) <= 30 for x in perm):
                dekat_h += jml
        hasil[kode] = {
            "nama": PROVINSI[kode], "tahun_kalibrasi": n, "sigma_log": round(sd, 2),
            "luas_normal": round(L_bi), "luas_el_nino": round(L_en),
            "luas_2026": round(est(titik[ini] / max(0.05, 1 - sisa))), "titik_ini": titik[ini], "sisa_musim": round(sisa, 2),
            "porsi_gambut": round(gambut, 2), "porsi_langganan": round(langganan / max(1, total_kec), 2),
            "posko_permanen": len(perm), "posko_kab": len([m for m in pk.get("menengah", []) if m["prov"] == kode]),
            "cakupan_posko": round(dekat_h / tot_h, 2) if tot_h else 0,
            "kecamatan_langganan": sum(1 for kk, v in S["kec"].items() if kk.startswith(kode + "|") and sum(1 for x in v if x >= 10) >= 3),
            "paparan_asap": PAPARAN.get(kode, 1.0),
        }
    json.dump({"dibuat": hari_ini.isoformat(), "param": PARAM, "prov": hasil, "el_nino": EL_NINO, "b_loglog": round(b, 3)},
              open(os.path.join(D, "keputusan.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print("kemiringan log-log bersama b =", round(b, 3), file=sys.stderr)
    for kode, h in hasil.items():
        print(h["nama"], {k: h[k] for k in ("tahun_kalibrasi", "sigma_log", "luas_normal", "luas_el_nino", "luas_2026")}, file=sys.stderr)


if __name__ == "__main__":
    main()
