"""PLP-2 Daftar pendek penerima hibah logistik dan peralatan (DESAIN-TEKNIS sec 6.17; ALGORITMA sec 5.5, sec 10.24; tiket RU-062).

Langkah jalan.py (bulanan). Satu rumus MB-4 (skor.py), bobot sama rata (asumsi). Tujuh kriteria Juklak 3/2024 dikelompokkan ke
komponen terukur (pemetaan penilaian analis, asumsi ALGORITMA sec 10.24):
  risiko           persentil +1  jumlah risiko kecamatan ke kab, public/banjir/data/risiko_kecamatan.json   proksi, belum diuji balik
  kejadian         persentil +1  kejadian DIBI 5 tahun kalender lengkap terakhir (mt2.komponen)            resmi, dijumlah kita
  celah_stok       persentil +1  celah beras kg PLP-1 (stok_penyangga); belum_dilaporkan = tanpa nilai     hitungan kita
  celah_peralatan  persentil +1  1 - min(ada/standar, 1) rata-rata jenis, standar Perka 17/2009 per provinsi;
                                 tanpa inventaris per provinsi: komponen tidak ada (bukan 0)
  celah_kapasitas  persentil +1  1 - ikd.json c (mt2.komponen)                                             proksi
  belum_menerima   mutlak        1 belum, 0,5 sudah menerima 3 tahun terakhir; tanpa daftar penerima (U10 bawaan) komponen
                                 tidak ada untuk semua kab dan bobotnya dinormalkan ulang (dikeluarkan dari BOBOT)
"Program prioritas nasional" dan "analisis strategis" TIDAK diskor: kolom kosong untuk rapat (RU P2).
Label wajib: "daftar pendek, keputusan tetap di rapat". Uji balik MB-4 belum jalan: urutan skor, hipotesis.

  python3 -I scripts/bnpb/unit/plp2.py --cek
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import mt2  # noqa: E402
import rapor  # noqa: E402
import skor  # noqa: E402

AKAR = rapor.AKAR
DATA = os.path.join(AKAR, "public", "data", "bnpb")
RISIKO_KEC = os.path.join(AKAR, "public", "banjir", "data", "risiko_kecamatan.json")
STANDAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "standar_peralatan_2009.json")
LABEL_WAJIB = "daftar pendek, keputusan tetap di rapat"
STATUS_UJI = "belum diuji balik (ALGORITMA 5.7); hipotesis"
ASUMSI = ["Asumsi: bobot sementara", "Asumsi: belum lulus uji balik", "Asumsi: kriteria Juklak ke komponen"]
NILAI_SUDAH = 0.5   # asumsi ALGORITMA sec 5.5: penerima tidak dicoret, hanya diturunkan
BOBOT = {"risiko": 1, "kejadian": 1, "celah_stok": 1, "celah_peralatan": 1, "celah_kapasitas": 1, "belum_menerima": 1}
RAPAT = ("program_prioritas_nasional", "analisis_strategis")   # kriteria rapat, tidak pernah diskor
ALIAS_KAB = {"75|Pahuwato": "75|Pohuwato"}   # ejaan di risiko_kecamatan.json


def risiko_kab(d, kode):
    """Jumlah risiko kecamatan per kab (None bila semua kecamatan kab itu tanpa skor). kode = {'prov|kab': kab4}."""
    i = {k: n for n, k in enumerate(d["kolom"])}
    out, tak = {}, set()
    for r in d["kec"]:
        kunci = f"{r[i['prov']]}|{r[i['kab']]}"
        k = kode.get(ALIAS_KAB.get(kunci, kunci))
        if k is None:
            tak.add(kunci)
            continue
        v = r[i["risiko"]]
        out.setdefault(k, None)
        if v is not None:
            out[k] = (out[k] or 0) + v
    return out, sorted(tak)


def celah_peralatan(standar, ada):
    """{prov: 1 - min(ada/standar, 1) rata-rata jenis bertstandar} hanya untuk provinsi yang inventarisnya ada (dict jenis: jumlah)."""
    out = {}
    for p, inv in (ada or {}).items():
        st = (standar.get(p) or {}).get("alat") or {}
        r = [1 - min((inv.get(a) or 0) / n, 1) for a, n in st.items() if n > 0]
        out[p] = sum(r) / len(r) if r else None
    return out


def hitung(nilai, penerima=None, bobot=None):
    """nilai = {komponen: {kab: nilai_asli}}; penerima = {kab: True/False} atau None (U10: tidak ada daftar)."""
    bobot = dict(bobot or BOBOT)
    komp = {j: {"tipe": "persentil", "nilai": v, "arah": 1} for j, v in nilai.items() if j != "belum_menerima"}
    if penerima is None:
        bobot.pop("belum_menerima")
    else:
        komp["belum_menerima"] = {"tipe": "mutlak", "v": {k: (NILAI_SUDAH if s else 1.0) for k, s in penerima.items()}}
    for j in RAPAT:
        assert j not in komp and j not in bobot, "kriteria rapat tidak boleh diskor"
    return skor.skor(komp, bobot), bobot


def bangun(risiko_kec, terpapar, ikd, dibi, stok, standar, nama, kode, inventaris=None, penerima=None):
    th = mt2.tahun_akhir_data(dibi["baris"])
    m, _ = mt2.komponen(terpapar["kab"], ikd["kab"], dibi["baris"], th)
    rk, tak = risiko_kab(risiko_kec, kode)
    cp = celah_peralatan(standar["provinsi"], inventaris)
    kab_semua = sorted(set(m["kejadian"]) | set(rk))
    nilai = {"risiko": rk, "kejadian": m["kejadian"], "celah_kapasitas": m["celah_kapasitas"],
             "celah_stok": {k: stok.get(k) for k in kab_semua}, "celah_peralatan": {k: cp.get(k[:2]) for k in kab_semua}}
    s, bobot = hitung(nilai, penerima)
    urut = skor.urut(s)
    baris = []
    for i, k in enumerate(urut):
        x = s[k]
        baris.append({"kab": k, "nama_kab": nama.get(k, k), "skor": x["skor"], "catatan": x["catatan"], "hilang": x["hilang"],
                      "rinci": {j: r.get("p", r.get("v")) for j, r in x["rinci"].items()},
                      **{j: None for j in RAPAT}})
    ada_skor = [b for b in baris if b["skor"] is not None]
    hilang_semua = [j for j in bobot if all(j in b["hilang"] for b in baris)]
    NAMA_K = {"risiko": "risiko", "kejadian": "kejadian 5 tahun", "celah_stok": "celah stok PLP-1", "celah_peralatan": "celah peralatan Perka 17/2009",
              "celah_kapasitas": "celah kapasitas kelembagaan", "belum_menerima": "belum menerima hibah 3 tahun"}
    k1 = rapor.kartu(
        id="plp2-hibah", sistem="PLP-2", pil="Hibah logpal", ikon="gudang", judul="Daftar pendek hibah logpal",
        angka=[{"k": "berskor", "label": "Kab/kota berskor, keputusan tetap di rapat", "nilai": len(ada_skor), "title": STATUS_UJI},
               {"k": "data_kurang", "label": "Kab/kota data kurang", "nilai": sum(b["skor"] is None for b in baris)},
               {"k": "komponen", "label": f"Komponen terukur yang terisi, dari {len(bobot)}", "nilai": len(bobot) - len(hilang_semua),
                "title": "belum terisi untuk semua kab: " + (", ".join(NAMA_K[j] for j in hilang_semua) or "tidak ada")}],
        kolom=[{"k": "no", "label": "No", "angka": True}, {"k": "kab", "label": "Kab/kota"},
               {"k": "skor", "label": "Skor MB-4", "angka": True, "desimal": 3,
                "title": "rata-rata geometrik persentil komponen yang terisi, bobot sama rata (asumsi); " + LABEL_WAJIB + "; " + STATUS_UJI},
               {"k": "hilang", "label": "Komponen belum ada data", "title": "komponen tanpa nilai untuk kab ini; bobotnya dinormalkan ulang, bukan 0"},
               {"k": "ppn", "label": "Program prioritas nasional", "title": "kriteria Juklak 3/2024 untuk rapat; tidak diskor mesin"},
               {"k": "strategis", "label": "Analisis strategis", "title": "kriteria Juklak 3/2024 untuk rapat; tidak diskor mesin"}],
        baris=[{"no": i + 1, "kab": b["nama_kab"], "skor": b["skor"], "hilang": ", ".join(NAMA_K[j] for j in b["hilang"]) or None,
                "ppn": None, "strategis": None} for i, b in enumerate(baris)],
        rumus="S = prod q_j^(w_j / W), q = maks(persentil, 0,01); komponen tanpa nilai dinormalkan ulang",
        sumber=["risiko_kecamatan", "dibi_kab_tahun", "ikd", "stok_penyangga", "standar_peralatan_2009"],
        label=["proksi", "hitungan_kita"], asumsi=ASUMSI, unduh="daftar_pendek_hibah.csv")
    sumber = [{"nama": "Indeks risiko kecamatan (risiko.py)", "url": "repo:public/banjir/data/risiko_kecamatan.json", "diambil": str(risiko_kec["dibuat"])[:10], "lisensi": "hitungan kita, indeks komposit belum diuji balik"},
              {"nama": "DIBI BNPB per kab-tahun", "url": "repo:public/data/bnpb/dibi_kab_tahun.json", "diambil": dibi["dibuat"][:10], "lisensi": dibi.get("lisensi") or "data publik DIBI"},
              {"nama": "IKD raster InaRISK (ikd.json)", "url": "repo:public/data/bnpb/ikd.json", "diambil": ikd["dibuat"][:10], "lisensi": (ikd.get("lisensi") or "BNPB")[:200]},
              {"nama": "Perka BNPB 17/2009 standar peralatan", "url": "repo:scripts/bnpb/unit/standar_peralatan_2009.json", "diambil": "2026-11-26", "lisensi": "peraturan, domain publik"}]
    b = rapor.berkas([k1], sumber)
    b["data"] = {"label_wajib": LABEL_WAJIB, "hipotesis": True, "status_uji": STATUS_UJI, "bobot": bobot, "komponen_kosong": hilang_semua,
                 "penerima": "tidak ada daftar (U10 bawaan): komponen belum_menerima dikeluarkan" if penerima is None else "ada",
                 "jendela_kejadian": [th - 4, th], "kab_risiko_tak_terpetakan": tak, "kab": baris}
    return b


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan():
    import plp1
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import hvc_dasar as D
    stok = {r["kode"]: r["celah_beras_kg"] for r in plp1.jalan()["stok_penyangga"]["data"]["kab"]}
    d = {n: _muat(os.path.join(DATA, n + ".json")) for n in ("terpapar", "ikd", "dibi_kab_tahun")}
    return {"hibah_prioritas": bangun(_muat(RISIKO_KEC), d["terpapar"], d["ikd"], d["dibi_kab_tahun"], stok, _muat(STANDAR),
                                      mt2._nama(), D.kab_kode())}


def cek():
    # RU 2.2 A10: p 0,9; 0,5; 0,7 dan sudah menerima v = 0,5 -> 0,62997; belum -> 0,74917
    p = {"risiko": {"a": 0.9}, "kejadian": {"a": 0.5}, "celah_kapasitas": {"a": 0.7}}
    komp = lambda v: {**{j: {"tipe": "persentil", "p": x} for j, x in p.items()}, "belum_menerima": {"tipe": "mutlak", "v": {"a": v}}}
    w = {"risiko": 1, "kejadian": 1, "celah_kapasitas": 1, "belum_menerima": 1}
    assert abs(skor.skor(komp(0.5), w)["a"]["skor"] - 0.62997) < 5e-6 and abs(skor.skor(komp(1.0), w)["a"]["skor"] - 0.74917) < 5e-6
    # hitung(): penerima True -> 0,5; tanpa daftar -> komponen dikeluarkan dari bobot (dinormalkan ulang)
    nilai = {"risiko": {"a": 30, "b": 10, "c": 20}, "kejadian": {"a": 5, "b": 9, "c": 1}, "celah_kapasitas": {"a": 0.4, "b": 0.6, "c": 0.5},
             "celah_stok": {"a": None, "b": None, "c": None}, "celah_peralatan": {"a": None, "b": None, "c": None}}
    s0, b0 = hitung(nilai)
    assert "belum_menerima" not in b0 and set(s0["a"]["hilang"]) == {"celah_stok", "celah_peralatan"} and s0["a"]["skor"] is not None
    s1, _ = hitung(nilai, {"a": True, "b": False, "c": False})
    assert s1["a"]["rinci"]["belum_menerima"]["v"] == NILAI_SUDAH and s1["b"]["rinci"]["belum_menerima"]["v"] == 1.0
    s2, _ = hitung(nilai, {"a": False, "b": False, "c": False})
    assert s1["a"]["skor"] < s2["a"]["skor"], (s1["a"], s2["a"])   # sudah menerima diturunkan, tidak dicoret
    # P2: kriteria rapat tidak diskor
    for j in RAPAT:
        try:
            hitung({**nilai, j: {"a": 1, "b": 2, "c": 3}})
            raise AssertionError("kriteria rapat diskor")
        except AssertionError as e:
            assert "tidak boleh diskor" in str(e), e
    # celah peralatan: ada/standar dipangkas 1; tanpa inventaris -> {}
    st = {"11": {"alat": {"Perahu Karet": 42, "Mobil Rescue": 5}}}
    assert celah_peralatan(st, None) == {} and abs(celah_peralatan(st, {"11": {"Perahu Karet": 21, "Mobil Rescue": 9}})["11"] - 0.25) < 1e-12
    S = _muat(STANDAR)["provinsi"]
    assert len(S) == 33 and S["11"]["alat"]["Perahu Karet"] == 42 and S["11"]["alat"]["Perahu Karet Bermesin"] == 21 and S["11"]["alat"]["Mobil Rescue"] == 5
    # risiko kab: jumlah kecamatan, kecamatan tanpa skor dilewati, kab semua kosong None
    rk, tak = risiko_kab({"kolom": ["prov", "kab", "risiko"], "kec": [["11", "A", 10.0], ["11", "A", 2.5], ["11", "B", None], ["11", "X", 1]]},
                         {"11|A": "1101", "11|B": "1102"})
    assert rk == {"1101": 12.5, "1102": None} and tak == ["11|X"], (rk, tak)
    nyata = jalan()["hibah_prioritas"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **nyata})
    k = nyata["kartu"][0]
    assert all(r["ppn"] is None and r["strategis"] is None for r in k["baris"]), "kolom rapat harus kosong"
    assert nyata["data"]["label_wajib"] == LABEL_WAJIB and not nyata["data"]["kab_risiko_tak_terpetakan"], nyata["data"]["kab_risiko_tak_terpetakan"]
    sk = [r["skor"] for r in k["baris"] if r["skor"] is not None]
    assert sk == sorted(sk, reverse=True) and all(0 <= x <= 1 for x in sk)
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I) and "prioritas" not in k["judul"].lower()
    a = {x["k"]: x["nilai"] for x in k["angka"]}
    print(f"plp2.py --cek: lulus ({a['berskor']} kab berskor, {a['data_kurang']} data kurang, {a['komponen']} dari {len(nyata['data']['bobot'])} komponen terisi; "
          f"teratas {k['baris'][0]['kab']} {k['baris'][0]['skor']:.3f})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
