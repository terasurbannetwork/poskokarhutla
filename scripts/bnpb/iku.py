"""Panel kinerja BNPB (IKU 1.1 IRB, IKU 1.2 kapasitas daerah, kerugian/PDB, peringatan dini) -> public/data/bnpb/iku.json

SUMBER   Angka resmi hanya dari catatan di data/kajian-bnpb/pustaka (LAKIP 2025, Renstra 2025-2029, NDPBA), tiap angka membawa
         dokumen + halaman. Angka sistem kita: public/data/bnpb/ikd.json (raster kapasitas InaRISK, BUKAN IKD resmi) dan
         public/data/bnpb/terpapar.json (penduduk terpapar bahaya InaRISK sedang+). Tanpa jaringan.
KEPUTUSAN ANGKA  IRB 2025 krb2021: 170,17 (teks LAKIP hal. 19), rumus hal. 19 memakai 170,19 -> dicatat. Target turun IRB 1,2 persen/tahun
         dari 147,95 (LAKIP hal. 19, Renstra hal. 133): v(n) = 147,95 x 0,988^n, n = tahun - 2025.
Pakai:   python3 scripts/bnpb/iku.py   |   python3 scripts/bnpb/iku.py --uji
"""
import json, os, re, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KELUAR = os.path.join(AKAR, "public/data/bnpb/iku.json")
IKD = os.path.join(AKAR, "public/data/bnpb/ikd.json")
TERPAPAR = os.path.join(AKAR, "public/data/bnpb/terpapar.json")
KOTA = os.path.join(AKAR, "scripts/udara/kota.json")
INSTANSI = os.path.join(AKAR, "src/instansi.js")

BASELINE, DASAR, TURUN = 147.95, 2025, 1.2
LAK, REN, NDP, BD = "LAKIP BNPB 2025", "Renstra BNPB 2025-2029", "NDPBA Indonesia", "Buku Data 2024"


def lintasan(baseline=BASELINE, dasar=DASAR, turun=TURUN, tahun=range(2026, 2030)):
    return [{"tahun": t, "v": round(baseline * (1 - turun / 100) ** (t - dasar), 2)} for t in tahun]


def nama_prov():
    """kode prov -> nama, dibaca dari tabel PROV di src/instansi.js (hanya dibaca, bukan disunting)."""
    s = open(INSTANSI, encoding="utf-8").read()
    return {k: n for k, n in re.findall(r'"(\d\d)":\s*\["[a-z]+",\s*"([^"]+)"\]', s)}


def kapasitas_raster():
    d = json.load(open(IKD, encoding="utf-8"))
    kota = json.load(open(KOTA, encoding="utf-8")); i = {k: n for n, k in enumerate(kota["kolom"])}
    info = {r[i["kode"]]: (r[i["nama"]], r[i["prov"]]) for r in kota["baris"]}
    pv = nama_prov()
    kab = d["kab"]
    rendah = sorted(({"kode": k, "nama": info[k][0], "prov": pv.get(info[k][1], info[k][1]), "c": v["c"]}
                     for k, v in kab.items() if v.get("kelas") == "rendah" and k in info), key=lambda r: (r["c"], r["kode"]))
    kelas = {x: sum(1 for v in kab.values() if v.get("kelas") == x) for x in ("rendah", "sedang", "tinggi")}
    tanpa = sorted(k for k in info if k not in kab or kab[k].get("c") is None)
    total = len(kab)
    return {"label": "Raster kapasitas InaRISK, bukan IKD resmi",
            "dibuat_dari": d.get("dibuat"), "kab": {**kelas, "total": total},
            "persen_min_sedang": round((kelas["sedang"] + kelas["tinggi"]) / total * 100, 1),
            "ambang": d.get("kelas_ambang"),
            "catatan": "Raster memberi 310 kabupaten kelas rendah, IKD resmi 225 (LAKIP hal. 22). Padanan raster dengan IKD tidak terbukti; angka resmi menang. Persentase ini dihitung atas kabupaten/kota, sedangkan angka IKU 50 persen dihitung atas provinsi.",
            "kab_rendah": rendah, "kab_tanpa_nilai": tanpa}


def paparan():
    d = json.load(open(TERPAPAR, encoding="utf-8"))
    n = sum(k["n"] for k in d["kab"].values())
    j = {}
    for k in d["kab"].values():
        for b, v in k["h"].items():
            j[b] = j.get(b, 0) + v[0]
    return n, j, d.get("dibuat")


def sistem_kita():
    n, j, dibuat = paparan()
    sp = "Hitungan Centurisk97: penduduk Dukcapil x bahaya InaRISK sedang ke atas, titik pusat desa"
    def r(jenis, pemicu, kunci=None, alt=None, alasan=None):
        return {"jenis": jenis, "pemicu_otomatis": True, "pemicu": pemicu,
                "penduduk_terpapar": j[kunci] if kunci else alt, "sumber_paparan": sp if kunci else (alasan or ""), "persen_penduduk": round(j[kunci] / n * 100, 1) if kunci else None}
    return {"diukur": dibuat, "penduduk_total": n,
            "per_bahaya": [
                r("gempa", "M 5 atau lebih di darat atau 100 km dari pusat kecamatan, atau dirasakan MMI IV (Waspada); M 6 atau lebih dan dangkal (Siaga)", "gempa"),
                r("tsunami", "Pernyataan potensi tsunami BMKG kode 1 sampai 3 (Awas); tanpa pernyataan tidak ada alarm", None, 5341282,
                  "LAKIP 2025 hal. 35-37 (Tabel 3.4): penduduk terpapar tsunami menurut BNPB; bukan hitungan raster kita"),
                r("cuaca", "Nowcast BMKG tingkat Severe (Siaga) atau Extreme (Awas)", None, None, "tidak ada data paparan penduduk untuk cuaca ekstrem di repo"),
                r("karhutla", "Tugas api level 3 baru, dibuat dalam 6 jam (Siaga)", "karhutla"),
                r("banjir", "Kejadian aktif level 2 (Siaga) atau level 3 (Awas)", "banjir")],
            "jangkauan_penerima": "Jangkauan penerima (siapa yang benar-benar menerima peringatan) belum terukur.",
            "sumber_aturan": "peringatan dini sistem Centurisk97"}


def bangun():
    return {
        "dibuat": time.strftime("%Y-%m-%dT%H:%M", time.localtime()) + "+07:00",
        "tahun_data": "LAKIP BNPB 2025 (capaian 2019-2025), Renstra BNPB 2025-2029 (target 2025-2029); raster InaRISK: tahun sumber tidak tertulis",
        "sumber": [
            {"id": "lakip", "dokumen": LAK, "hal": "xi, 18-22, 35-37, 112-113"},
            {"id": "renstra", "dokumen": REN, "hal": "53, 71, 85, 133-134"},
            {"id": "ndpba", "dokumen": NDP, "hal": "108-110"},
            {"id": "ikd_raster", "dokumen": "InaRISK BNPB, raster kapasitas per kabupaten (hitungan Centurisk97)", "hal": "-"},
            {"id": "terpapar", "dokumen": "Dukcapil Kemendagri x InaRISK BNPB (hitungan Centurisk97)", "hal": "-"}],
        "irb": {
            "deret": [
                {"id": "lama", "label": "Metode lama, 2019 sampai 2024",
                 "nilai": [{"tahun": t, "v": v} for t, v in ((2019, 144.02), (2020, 141.65), (2021, 138.81), (2022, 135.56), (2023, 132.25), (2024, 128.52))],
                 "target": [{"tahun": t, "v": v} for t, v in ((2020, 141.14), (2021, 138.26), (2022, 135.38), (2023, 132.50), (2024, 129.62))],
                 "turun_persen": 10.76, "sumber": f"{REN} hal. 53 (Tabel 1.6)"},
                {"id": "krb2021", "label": "Bahaya dan kerentanan KRB 2021, 2024 ke 2025",
                 "nilai": [{"tahun": 2024, "v": 171.95}, {"tahun": 2025, "v": 170.17}], "turun_persen": 1.03,
                 "catatan": "Teks LAKIP 170,17; rumus penurunan di LAKIP hal. 19 memakai 170,19. Dipakai angka teks.",
                 "sumber": f"{LAK} hal. 18-19"},
                {"id": "seb", "label": "Kerentanan proyeksi SEB Kemendagri dan Bappenas, baseline 2026 sampai 2029",
                 "nilai": [{"tahun": 2025, "v": 147.95}], "sumber": f"{LAK} hal. 18-19"}],
            "target": {"baseline": BASELINE, "tahun_dasar": DASAR, "turun_persen_per_tahun": TURUN, "lintasan": lintasan(),
                       "rumus": "147,95 x 0,988 pangkat (tahun - 2025): hitungan kita, bukan angka dokumen; dokumen tidak mencetak nilai mutlak target",
                       "sumber": f"{LAK} hal. 19; {REN} hal. 133"},
            "capaian_turun_persen": [
                {"tahun": 2021, "target": None, "capaian": 2.01}, {"tahun": 2022, "target": None, "capaian": 2.34},
                {"tahun": 2023, "target": None, "capaian": 2.44}, {"tahun": 2024, "target": None, "capaian": 2.81},
                {"tahun": 2025, "target": 1.2, "capaian": 1.03}],
            "catatan_capaian": f"Capaian 2021-2025 dari Gambar 3.1 {LAK} hal. 19 (dibaca dari gambar). Target persen hanya ada untuk 2025 (1,2 persen, {LAK} hal. 19). Target tahunan Renstra lama berupa nilai IRB mutlak (141,14 sampai 129,62), ada di grafik deret metode lama ({REN} hal. 53, Tabel 1.6).",
            "catatan": "Tiga deret tidak boleh dibandingkan antarderet: LAKIP hal. 18-19 menyatakan pemutakhiran data bahaya dan kerentanan membuat IRB 2013-2024 berbeda signifikan dari IRB 2025, dan target Renstra dihitung atas baseline baru 147,95, bukan 128,52."},
        "kapasitas": {
            "resmi": {"tahun": 2025, "persen_min_sedang": 50, "target": 67,
                      "target_lintasan": [{"tahun": t, "v": v} for t, v in zip(range(2025, 2030), (67, 73, 79, 85, 90))],
                      "prov": {"2024": {"rendah": 14, "sedang": 24, "tinggi": 0}, "2025": {"rendah": 19, "sedang": 19, "tinggi": 0}},
                      "prov_riwayat": {"2021": [26, 12, 0], "2022": [21, 17, 0], "2023": [19, 19, 0], "2024": [14, 24, 0], "2025": [19, 19, 0]},
                      "kab": {"rendah": 225, "sedang": 274, "tinggi": 15, "menilai": 469, "total": 514},
                      "sumber": f"{LAK} hal. 20 (Tabel 3.2, 3.3), hal. 22; target {REN} hal. 133"},
            "raster": kapasitas_raster()},
        "kerugian_pdb": {
            "satuan": "persen PDB",
            "realisasi": [{"tahun": 2025, "v": 0.217, "kerugian_rp_t": 51.3, "pdb_rp_t": 23656.2, "catatan": "dampak Siklon Senyar belum dihitung"}],
            "target": [{"tahun": t, "v": v} for t, v in zip(range(2025, 2030), (0.137, 0.1365, 0.136, 0.1355, 0.135))],
            "sumber": f"{LAK} hal. 18; target {REN} hal. 85 (Tabel 2.1)"},
        "peringatan": {
            "renstra_cakupan_persen": [{"tahun": t, "v": v} for t, v in zip(range(2025, 2030), (6.10, 6.17, 6.21, 6.26, 6.32))],
            "renstra_sumber": f"{REN} hal. 133-134 (Tabel 4.6); realisasi 2025 6,10 persen {LAK} hal. 35",
            "lakip_cakupan": [{"jenis": "tsunami", "terpapar": 5341282, "tercakup": 651000, "persen": 12.19},
                              {"jenis": "banjir", "terpapar": 113829496, "tercakup": 10800, "persen": 0.01}],
            "lakip_sumber": f"{LAK} hal. 35-37 (Tabel 3.4)",
            "rpjmn_keterpenuhan_persen": 6, "rpjmn_sumber": f"{REN} hal. 71",
            "ndpba": "Cakupan pemantauan ancaman hanya 25-75 persen penduduk; target minimal 75 persen penduduk terlayani peringatan",
            "ndpba_sumber": f"{NDP} hal. 108-110",
            "sistem_kita": sistem_kita()}}


def uji():
    L = lintasan()
    assert [x["v"] for x in L] == [round(147.95 * 0.988 ** n, 2) for n in (1, 2, 3, 4)] and L[0]["v"] == 146.17 and L[-1]["v"] == 140.98, L
    d = bangun()
    for k in ("dibuat", "sumber", "irb", "kapasitas", "kerugian_pdb", "peringatan"):
        assert k in d, k
    assert [s["id"] for s in d["irb"]["deret"]] == ["lama", "krb2021", "seb"]
    assert d["irb"]["target"]["lintasan"] == L
    r = d["kapasitas"]["raster"]
    ik = json.load(open(IKD, encoding="utf-8"))["kab"]
    sed = sum(1 for v in ik.values() if v["c"] >= 0.33)
    assert r["persen_min_sedang"] == round(sed / len(ik) * 100, 1), (r["persen_min_sedang"], sed)
    assert len(r["kab_rendah"]) == r["kab"]["rendah"] == sum(1 for v in ik.values() if v["c"] < 0.33)
    c = [x["c"] for x in r["kab_rendah"]]; assert c == sorted(c) and all(x["prov"] and not x["prov"].isdigit() for x in r["kab_rendah"])
    assert r["kab"]["total"] == 514 and r["kab_tanpa_nilai"] == []
    k = d["kapasitas"]["resmi"]["kab"]; assert k["rendah"] + k["sedang"] + k["tinggi"] == k["total"] == 514
    assert d["kapasitas"]["resmi"]["prov"]["2025"]["rendah"] + d["kapasitas"]["resmi"]["prov"]["2025"]["sedang"] == 38
    assert round(51.3 / 23656.2 * 100, 3) == 0.217 and d["kerugian_pdb"]["realisasi"][0]["v"] == 0.217
    assert [x["v"] for x in d["kerugian_pdb"]["target"]][0] == 0.137
    p = d["peringatan"]["sistem_kita"]; assert len(p["per_bahaya"]) == 5 and "belum terukur" in p["jangkauan_penerima"]
    assert all(x["penduduk_terpapar"] is None or x["penduduk_terpapar"] <= p["penduduk_total"] for x in p["per_bahaya"])
    assert len(nama_prov()) >= 34
    print("iku.py --uji hijau")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    else:
        uji()
        d = bangun()
        s = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
        assert len(s) < 2_000_000
        open(KELUAR, "w", encoding="utf-8").write(s)
        print(f"{KELUAR}: {len(s)} B")
