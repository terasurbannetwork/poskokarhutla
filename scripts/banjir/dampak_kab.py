"""Penduduk di zona bahaya banjir pada kabupaten dengan peluang hujan lebat -> terpapar_hujan_kab.json (BUKAN perkiraan korban)

Tanpa jaringan. Dua keluaran di public/banjir/data/:
  paparan_kab.json  STATIS (dihitung sekali; --paparan memaksa ulang). Per kab "prov|nama": penduduk zona bahaya (porsi luas kecamatan,
      anggapan merata). zona(kec) = penduduk kec (public/data/penduduk.json, WorldPop 2026) x porsi luas kec yang berkelas bahaya banjir
      (public/banjir/data/bahaya_kelas.json, % luas rendah/sedang/tinggi InaRISK). Dua angka: tinggi, dan sedang+tinggi.
      Rumah setara = jiwa / 3,5 (jiwa per KK, asumsi PRAREG-DAMPAK; satu KK dianggap satu rumah); rumah tidak tercatat di sumber mana pun.
      Angka ini BERBEDA dari "jiwa terpapar" /prediksi (scripts/prediksi/terbit.py: seluruh penduduk kecamatan berbahaya tinggi >= 0,666);
      penyatuan keduanya = tindak lanjut.
  terpapar_hujan_kab.json  HARIAN. Label: "Penduduk di zona bahaya banjir pada kabupaten dengan peluang hujan lebat (bukan perkiraan korban)".
      Peluang dari public/banjir/data/peluang.json (ECMWF 51 anggota; p[0] = P(hujan harian >= 50 mm), p[1] = P(>= 100 mm)): peluang HUJAN,
      bukan peluang banjir, belum terkalibrasi. Hari masuk bila p50 >= AMBANG_P = minimal 10 dari 51 anggota ansambel (10/51 = 0,196).
      jiwa_zona_x_peluang_hujan = [bawah, atas]: bawah = p100 x zona tinggi (null bila p100 < 0,05: tampilkan "sampai X"),
      atas = p50 x zona sedang+tinggi; 2 angka bermakna. rumah_setara = jiwa / 3,5. Tiap baris memuat p50 dan p100.
      Kab dengan kecamatan tanpa nilai bahaya > 30% ditandai paparan_terlalu_rendah. `tanpa_sinyal` = jumlah kab tanpa sinyal hujan:
      tidak ada baris BUKAN berarti aman. Tanpa klaim akurasi (penilaian lewat PRAREG-DAMPAK).
      --abaikan-basi (hanya uji lokal) menulis basi: true; JANGAN di-commit.
Gagal (masukan tak ada/basi/kosong) = keluar kode 1, berkas lama tidak ditimpa.
Pakai:  python3 scripts/banjir/dampak_kab.py [--paparan] [--abaikan-basi]   |   python3 scripts/banjir/dampak_kab.py uji
"""
import argparse, datetime as dt, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, AKAR, WIB, baca, simpan

AMBANG_P = 0.195   # minimal 10 dari 51 anggota ansambel (10/51 = 0,196) memberi hujan >= 50 mm/hari
P100_MIN = 0.05    # di bawah ini batas bawah null ("sampai X")
TANPA_BAHAYA_MAKS = 0.3
JIWA_KK = 3.5      # jiwa per KK = rumah (PRAREG-DAMPAK, RISET-FITUR-BANJIR)
SUMBER = ("Penduduk WorldPop Global2 R2025A 2026 (public/data/penduduk.json); zona bahaya banjir InaRISK BNPB raster 100 m "
          "(bahaya_kelas.json); peluang hujan lebat ECMWF IFS ansambel 51 anggota lewat Open-Meteo (peluang.json)")
BATASAN = ["Penduduk di zona bahaya pada kabupaten berpeluang hujan lebat; bukan perkiraan korban, tanpa klaim akurasi.",
           "Peluang adalah peluang HUJAN lebat (50 dan 100 mm per hari), bukan peluang banjir, dan belum terkalibrasi.",
           "Batas bawah = peluang hujan 100 mm x penduduk zona bahaya tinggi (null bila peluang < 0,05: baca \"sampai X\"); atas = peluang hujan 50 mm x penduduk zona sedang+tinggi.",
           "Penduduk zona = penduduk kecamatan x porsi luas zona (anggapan merata); rumah = jiwa / 3,5 (anggapan).",
           "Bukan jumlah yang pasti terkena banjir, bukan jumlah yang mengungsi.",
           "Tidak ada baris bukan berarti aman: kabupaten tanpa sinyal hujan di ansambel tidak ditulis (lihat tanpa_sinyal).",
           "paparan_terlalu_rendah: lebih dari 30% kecamatan kabupaten itu tanpa nilai bahaya, jadi zona kurang terhitung."]


def bulat2(x):
    """Bulatkan ke 2 angka bermakna (0 tetap 0): rentang kasar, bukan angka presisi palsu."""
    if x <= 0:
        return 0
    e = 10 ** (math.floor(math.log10(x)) - 1)
    return int(round(x / e) * e) if e >= 1 else int(round(x))


def paparan(pend, kelas):
    """pend {kec: jiwa}, kelas {kec: {"banjir": [rendah, sedang, tinggi] % luas}} -> {"prov|kab": [tinggi, sedang+tinggi, total, n_kec, n_tanpa_bahaya]}.
    Kecamatan tanpa nilai bahaya tidak ikut zona (dihitung di n_tanpa_bahaya), tetap ikut total."""
    out = {}
    for kec, j in pend.items():
        kab = "|".join(kec.split("|")[:2])
        a = out.setdefault(kab, [0.0, 0.0, 0, 0, 0])
        a[2] += j
        a[3] += 1
        b = (kelas.get(kec) or {}).get("banjir")
        if not b:
            a[4] += 1
            continue
        a[0] += j * b[2] / 100
        a[1] += j * (b[1] + b[2]) / 100
    return {k: [round(a[0]), round(a[1]), a[2], a[3], a[4]] for k, a in out.items()}


def harian(pel, pap, ambang=AMBANG_P):
    """pel = wilayah peluang.json, pap = paparan() -> {kab: {"nama", "zona": [tinggi, sedang+tinggi], "hari": [{t, p, jiwa, rumah}]}}.
    Hanya kab bertingkat kabupaten, punya paparan, dan punya hari dengan p[0] >= ambang."""
    out = {}
    for k, w in pel.items():
        if w.get("tingkat") != "kabupaten" or k not in pap:
            continue
        zt, zs = pap[k][0], pap[k][1]
        rendah = pap[k][3] > 0 and pap[k][4] / pap[k][3] > TANPA_BAHAYA_MAKS
        hari = []
        for h in w["hari"]:
            p50, p100 = h["p"][0], h["p"][1]
            if p50 < ambang:
                continue
            lo, hi = (bulat2(p100 * zt) if p100 >= P100_MIN else None), bulat2(p50 * zs)
            hari.append({"t": h["t"], "p50": p50, "p100": p100, "jiwa_zona_x_peluang_hujan": [lo, hi],
                         "rumah_setara": [None if lo is None else bulat2(lo / JIWA_KK), bulat2(hi / JIWA_KK)]})
        if hari:
            out[k] = {"nama": w["nama"], "zona": [zt, zs], "hari": hari}
            if rendah:
                out[k]["paparan_terlalu_rendah"] = True
    return out


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--paparan", action="store_true")
    a.add_argument("--abaikan-basi", action="store_true")
    a = a.parse_args()
    jp = os.path.join(KELUAR, "paparan_kab.json")
    if a.paparan or not os.path.exists(jp):
        pend = (baca(os.path.join(AKAR, "public/data/penduduk.json")) or {}).get("kec")
        kelas = (baca(os.path.join(KELUAR, "bahaya_kelas.json")) or {}).get("kec")
        if not pend or not kelas:
            sys.exit("dampak_kab: penduduk.json/bahaya_kelas.json tak ada atau kosong; berkas lama dibiarkan")
        pap = paparan(pend, kelas)
        simpan(jp, {"dibuat": dt.datetime.now(WIB).date().isoformat(), "sumber": SUMBER, "jiwa_kk": JIWA_KK,
                    "kolom": ["jiwa_zona_tinggi", "jiwa_zona_sedang_tinggi", "jiwa_total", "kec", "kec_tanpa_bahaya"],
                    "label": "penduduk zona bahaya (porsi luas kecamatan, anggapan merata)", "kab": pap})
        print(f"dampak_kab: paparan {len(pap)} kab", file=sys.stderr)
    pap = (baca(jp) or {}).get("kab")
    pj = baca(os.path.join(KELUAR, "peluang.json"))
    if not pap or not pj or not pj.get("wilayah"):
        sys.exit("dampak_kab: paparan_kab.json/peluang.json tak ada atau kosong; berkas lama dibiarkan")
    tmin = min((h["t"] for w in pj["wilayah"].values() for h in w.get("hari", [])), default="")
    basi = tmin < dt.datetime.now(WIB).date().isoformat()   # hari pertama peluang harus hari ini: berkas run lalu tidak lolos
    if basi and not a.abaikan_basi:
        sys.exit(f"dampak_kab: peluang.json basi (hari pertama {tmin}); berkas lama dibiarkan")
    kab = harian(pj["wilayah"], pap)
    out = {
        "versi": 2, "label": "Penduduk di zona bahaya banjir pada kabupaten dengan peluang hujan lebat (bukan perkiraan korban)", "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
        "peluang_dibuat": pj.get("dibuat"), "ambang_p": AMBANG_P, "jiwa_kk": JIWA_KK, "sumber": SUMBER, "batasan": BATASAN,
        "tanpa_sinyal": len(pj.get("tanpa_sinyal") or []), "kab": kab}
    if basi:
        out["basi"] = True
    simpan(os.path.join(KELUAR, "terpapar_hujan_kab.json"), out)
    print(f"dampak_kab: {len(kab)} kab di atas ambang p>={AMBANG_P}", file=sys.stderr)


def uji():
    import tempfile
    assert bulat2(1234) == 1200 and bulat2(98765) == 99000 and bulat2(0) == 0 and bulat2(12.4) == 12 and bulat2(7) == 7
    # irisan: kec A 1000 jiwa, bahaya [50,30,20] -> tinggi 200, sedang+tinggi 500; kec B tanpa bahaya: total saja
    pap = paparan({"1|X|A": 1000, "1|X|B": 400, "1|Y|C": 100}, {"1|X|A": {"banjir": [50, 30, 20]}, "1|Y|C": {"banjir": [0, 0, 100]}})
    assert pap["1|X"] == [200, 500, 1400, 2, 1], pap
    assert pap["1|Y"] == [100, 100, 100, 1, 0], pap
    pel = {"1|X": {"tingkat": "kabupaten", "nama": "X", "hari": [{"t": "2000-01-01", "p": [0.5, 0.1]}, {"t": "2000-01-02", "p": [0.19, 0.0]}]},
           "1|Y": {"tingkat": "kabupaten", "nama": "Y", "hari": [{"t": "2000-01-01", "p": [0.1, 0.0]}]},   # di bawah ambang: dibuang
           "1|Z": {"tingkat": "kabupaten", "nama": "Z", "hari": [{"t": "2000-01-01", "p": [0.9, 0.9]}]},   # tanpa paparan: dibuang
           "1": {"tingkat": "provinsi", "nama": "P", "hari": [{"t": "2000-01-01", "p": [0.9, 0.9]}]}}
    h = harian(pel, pap)
    assert list(h) == ["1|X"] and len(h["1|X"]["hari"]) == 1, h                 # ambang: 0,19 keluar, 0,5 masuk
    d = h["1|X"]["hari"][0]
    assert d["jiwa_zona_x_peluang_hujan"] == [20, 250] and d["rumah_setara"] == [6, 71] and d["p50"] == 0.5 and d["p100"] == 0.1, d
    # ambang 10/51 anggota: 0,196 masuk, 0,194 keluar
    pel["1|Y"]["hari"] = [{"t": "2000-01-01", "p": [0.196, 0.04]}, {"t": "2000-01-02", "p": [0.194, 0.04]}]
    y = harian(pel, pap)["1|Y"]["hari"]
    assert len(y) == 1 and y[0]["jiwa_zona_x_peluang_hujan"] == [None, 20], y   # p100 0,04 < 0,05 -> bawah null, bukan 4
    pel["1|Y"]["hari"] = [{"t": "2000-01-01", "p": [0.3, 0.05]}]
    assert harian(pel, pap)["1|Y"]["hari"][0]["jiwa_zona_x_peluang_hujan"][0] == 5   # tepat 0,05 -> terhitung
    # pembeda: p50 0,5 -> 0,8 menaikkan batas atas
    pel["1|X"]["hari"][0]["p"] = [0.8, 0.1]
    assert harian(pel, pap)["1|X"]["hari"][0]["jiwa_zona_x_peluang_hujan"][1] == 400
    # paparan_terlalu_rendah: 1 dari 2 kec tanpa bahaya (0,5 > 0,3) -> tandai; 1 dari 4 (0,25) -> tidak
    pa2 = {"1|X": [200, 500, 1400, 2, 1], "1|Y": [100, 100, 100, 4, 1]}
    hh = harian({k: pel[k] for k in ("1|X", "1|Y")}, pa2)
    assert hh["1|X"]["paparan_terlalu_rendah"] is True and "paparan_terlalu_rendah" not in hh["1|Y"], hh
    # berkas lama tidak ditimpa bila peluang kosong: jalankan main() di folder sementara
    global KELUAR
    simpan_lama = KELUAR
    with tempfile.TemporaryDirectory() as t:
        KELUAR = t
        simpan(os.path.join(t, "paparan_kab.json"), {"kab": pap})
        simpan(os.path.join(t, "terpapar_hujan_kab.json"), {"lama": 1})
        simpan(os.path.join(t, "peluang.json"), {"wilayah": {}})
        sys.argv = ["x"]
        try:
            main()
            assert False, "harus gagal"
        except SystemExit as e:
            assert e.code != 0
        assert baca(os.path.join(t, "terpapar_hujan_kab.json")) == {"lama": 1}
        simpan(os.path.join(t, "peluang.json"), {"wilayah": pel, "tanpa_sinyal": ["a", "b"], "dibuat": "x"})   # tanggal 2000: terbaca basi
        try:
            main()
            assert False, "basi harus gagal"
        except SystemExit:
            pass
        assert baca(os.path.join(t, "terpapar_hujan_kab.json")) == {"lama": 1}
        sys.argv = ["x", "--abaikan-basi"]
        main()
        o = baca(os.path.join(t, "terpapar_hujan_kab.json"))
        assert list(o["kab"]) == ["1|X", "1|Y"] and o["basi"] is True and o["peluang_dibuat"] == "x" and o["tanpa_sinyal"] == 2, o
    KELUAR = simpan_lama
    print("ok dampak_kab")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
