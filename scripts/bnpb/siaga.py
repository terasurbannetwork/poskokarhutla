#!/usr/bin/env python3
"""Siaga pra-musim per kab/kota -> public/data/bnpb/siaga.json (dibaca public/bnpb/siaga.js).

Sumber: kalender_risiko.json (peluang bulan x jenis dari 7 TAHUN PENUH 2014-2020 logbook Pusdalops),
desa_cari.json (nama kab), data/pusdalops/desa_terisolir.csv (opsional; dibuat pipa-data, tanpa berkas = daftar kosong).
Musim = bulan dengan peluang >= 0,5 (minimal 4 dari 7 tahun ada kejadian), runtun melingkar; mulai = bulan pertama runtun.
Saran stok memakai kode kebutuhan kontrak L1 (makanan, tenda, ...), TANPA jumlah: logbook arsip tidak memuat kebutuhan,
jadi jumlah per orang bukan ditebak di sini. Dasar tiap saran = kejadian per tahun di musim itu.
Jalankan: python3 scripts/bnpb/siaga.py          (tulis JSON)
          python3 scripts/bnpb/siaga.py --cek    (self-check)
"""
import csv, json, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KALENDER = "public/prediksi/data/kalender_risiko.json"
DESA = "public/data/desa_cari.json"
TERISOLIR = "data/pusdalops/desa_terisolir.csv"
KELUAR = "public/data/bnpb/siaga.json"
JENIS = ["banjir", "longsor", "cuaca", "karhutla"]
JENIS_SOP = ["banjir", "longsor", "karhutla"]   # cuaca ekstrem: terlalu umum untuk SOP khusus
AMBANG_MUSIM = 0.5

# kode = kode kebutuhan kontrak L1 (docs/superpowers/specs/2026-11-01-logbook-pusdalops-design.md)
STOK = {
    "banjir": [("makanan", "Makanan siap saji dan beras"), ("tenda", "Tenda dan terpal"), ("sandang", "Sandang, selimut, kasur lipat"),
               ("air_bersih", "Air bersih dan tablet penjernih"), ("perahu", "Perahu karet dan pelampung")],
    "longsor": [("material", "Karung pasir dan material penahan"), ("tenda", "Tenda dan terpal"), ("alat_berat", "Kontrak siaga alat berat"),
                ("makanan", "Makanan siap saji"), ("obat", "Obat dan kantong jenazah")],
    "karhutla": [("pompa", "Pompa dan alat pemadam"), ("air_bersih", "Sumber air pemadaman dan tandon"), ("obat", "Masker dan obat ISPA"),
                 ("makanan", "Logistik regu dan BBM")],
}
# (hari sebelum musim, tugas, penanggung jawab); urut dari yang paling awal
SOP = {
    "banjir": [(-60, "Perbarui daftar desa langganan banjir dan jalur evakuasi", "Pusdalops BPBD"),
               (-45, "Periksa dan siapkan perahu karet, mesin tempel, pelampung", "Bidang Logistik"),
               (-30, "Pastikan stok penyangga sesuai daftar saran stok di kabupaten/kota", "Bidang Logistik"),
               (-21, "Uji pos pengungsian: air bersih, MCK, listrik, daftar penghuni", "Bidang Kedaruratan"),
               (-14, "Latih ulang pelapor desa dan pastikan nomor WA tersambung", "Pusdalops BPBD"),
               (-7, "Rapat koordinasi lintas sektor dan cek peringatan dini sungai", "Kepala Pelaksana")],
    "longsor": [(-60, "Petakan desa langganan terisolir saat longsor dan jalur alternatif", "Pusdalops BPBD"),
                (-45, "Kontrak siaga alat berat dan operator dengan dinas PU", "Bidang Kedaruratan"),
                (-30, "Pastikan stok penyangga sesuai daftar saran stok di kabupaten/kota", "Bidang Logistik"),
                (-21, "Periksa sirene dan alat peringatan dini di lereng rawan", "Pusdalops BPBD"),
                (-14, "Latih ulang relawan desa dan tim evakuasi", "Bidang Kedaruratan"),
                (-7, "Rapat koordinasi lintas sektor dan sosialisasi tanda lereng bergerak", "Kepala Pelaksana")],
    "karhutla": [(-60, "Petakan desa langganan kebakaran lahan dan kanal sekat bakar", "Pusdalops BPBD"),
                 (-45, "Siapkan SIPPA (pipa portabel) dan periksa pompa", "Bidang Kedaruratan"),
                 (-30, "Pastikan stok penyangga sesuai daftar saran stok di kabupaten/kota", "Bidang Logistik"),
                 (-21, "Aktifkan regu desa dan Masyarakat Peduli Api", "Bidang Kedaruratan"),
                 (-14, "Cek status siaga darurat dan kesiapan sumber air pemadaman", "Kepala Pelaksana"),
                 (-7, "Rapat koordinasi lintas sektor dan patroli titik panas", "Pusdalops BPBD")],
}


def musim(p):
    """p: 12 peluang -> (bulan 1..12 yang >= ambang, bulan mulai) atau None. Runtun melingkar: mulai = bulan yang didahului bulan di bawah ambang."""
    on = [(x or 0) >= AMBANG_MUSIM for x in p]
    if not any(on):
        return None
    if all(on):
        return [m + 1 for m in range(12)], 1
    mulai = next(m for m in range(12) if on[m] and not on[m - 1])
    return [m + 1 for m in range(12) if on[m]], mulai + 1


def baca_terisolir(jalur):
    """CSV pipa-data -> {'35|Bojonegoro' atau '3509': [ {desa, kec, n, ket} ]}. Ramah nama kolom; tanpa berkas -> {}."""
    if not os.path.exists(jalur):
        return {}
    pilih = lambda r, *ks: next((r[k].strip() for k in ks if r.get(k) and r[k].strip()), "")
    out = {}
    with open(jalur, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            kab = pilih(r, "kab_kode", "kab_kode_bps", "kode_kab", "kab")
            desa = pilih(r, "desa", "nama_desa")
            if not kab or not desa:
                continue
            n = pilih(r, "n_kejadian", "n_tahun", "n", "kejadian")
            bln = sorted({int(x) for x in pilih(r, "bulan").replace(",", ";").split(";") if x.strip().isdigit() and 1 <= int(x) <= 12})
            out.setdefault(kab, []).append({"desa": desa, "kec": pilih(r, "kecamatan", "kec"), "n": int(float(n)) if n.replace(".", "", 1).isdigit() else None,
                                            "jenis": [x.strip() for x in pilih(r, "jenis").split(";") if x.strip()], "bulan": bln,
                                            "terakhir": int(pilih(r, "tahun_terakhir") or 0) or None})
    return out


def bangun(kal, nama_kab, terisolir):
    kab = {}
    for kode, v in kal["kab"].items():
        isi = {"nama": nama_kab.get(kode[:2] + "." + kode[2:], kode), "p": {}, "ada": {}, "musim": {}}
        for j in JENIS:
            if j not in v:
                continue
            isi["p"][j] = [round(x, 2) for x in v[j]["p"]]
            isi["ada"][j] = v[j]["ada"]
            m = musim(v[j]["p"])
            if m and j in JENIS_SOP:
                bulan, mulai = m
                per_th = sum(v[j]["n"][b - 1] for b in bulan) / kal["n_tahun"]
                isi["musim"][j] = {"bulan": bulan, "mulai": mulai, "kejadian_th": round(per_th, 1)}
        t = terisolir.get(kode) or []
        isi["desa"] = t
        if isi["musim"] or t:
            kab[kode] = isi
    return kab


def main():
    kal = json.load(open(os.path.join(AKAR, KALENDER)))
    nama = json.load(open(os.path.join(AKAR, DESA)))["kab"]
    # CSV memakai kode '35|Bojonegoro' (kunci logbook) atau 4 digit; samakan ke 4 digit lewat nama
    t = baca_terisolir(os.path.join(AKAR, TERISOLIR))
    kode_dari = {"%s|%s" % (k[:2], n): k.replace(".", "") for k, n in nama.items()}
    t4 = {}
    for k, v in t.items():
        t4.setdefault(kode_dari.get(k, k), []).extend(v)
    kab = bangun(kal, nama, t4)
    out = {"sumber": "Logbook harian Pusdalops BNPB, tahun penuh " + "-".join([kal["tahun_penuh"][0], kal["tahun_penuh"][-1]]) + " (kalender_risiko.json); desa terisolir: pipa-data",
           "dibuat": kal["dibuat"], "n_tahun": kal["n_tahun"], "ambang_musim": AMBANG_MUSIM, "ada_terisolir": bool(t),
           "stok": {j: [{"kode": k, "nama": n} for k, n in v] for j, v in STOK.items()},
           "sop": {j: [{"h": h, "tugas": a, "pj": b} for h, a, b in v] for j, v in SOP.items()}, "kab": kab}
    os.makedirs(os.path.dirname(os.path.join(AKAR, KELUAR)), exist_ok=True)
    with open(os.path.join(AKAR, KELUAR), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("siaga.json: %d kab, %d dengan desa terisolir" % (len(kab), sum(1 for v in kab.values() if v["desa"])))


def cek():
    assert musim([0] * 12) is None
    assert musim([1] * 12) == (list(range(1, 13)), 1)
    assert musim([0.6, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.9]) == ([1, 2, 11, 12], 11), "runtun melingkar Nov-Feb mulai Nov"
    assert musim([0.49] * 12) is None
    kodekebutuhan = {"makanan", "tenda", "sandang", "air_bersih", "obat", "perahu", "material", "alat_berat", "pompa", "dana"}
    for j in JENIS_SOP:
        assert j in STOK and j in SOP
        assert {k for k, _ in STOK[j]} <= kodekebutuhan, j
        assert [h for h, _, _ in SOP[j]] == sorted(h for h, _, _ in SOP[j]) and SOP[j][-1][0] < 0
    kal = {"n_tahun": 7, "kab": {"3301": {"banjir": {"p": [0.9, 0.7] + [0] * 8 + [0.5, 0.8], "ada": [6, 5] + [0] * 8 + [4, 6], "n": [10, 5] + [0] * 8 + [4, 7]}}}}
    k = bangun(kal, {"33.01": "Cilacap"}, {"3301": [{"desa": "X", "kec": "Y", "n": 3, "jenis": ["longsor"], "bulan": [2], "terakhir": 2022}]})["3301"]
    assert k["nama"] == "Cilacap" and k["musim"]["banjir"]["mulai"] == 11 and k["musim"]["banjir"]["bulan"] == [1, 2, 11, 12]
    assert k["musim"]["banjir"]["kejadian_th"] == round(26 / 7, 1) and k["desa"][0]["desa"] == "X"
    assert baca_terisolir("/tidak/ada.csv") == {}
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
        f.write("kab_kode,kabkota,kecamatan,desa,n_kejadian,jenis,bulan,tahun_terakhir\n35|Lumajang,Kab. Lumajang,C,D,5,cuaca; longsor,\"2; 11\",2022\n")
    r = baca_terisolir(f.name)["35|Lumajang"][0]; os.unlink(f.name)
    assert r == {"desa": "D", "kec": "C", "n": 5, "jenis": ["cuaca", "longsor"], "bulan": [2, 11], "terakhir": 2022}, r
    print("siaga.py --cek hijau")


if __name__ == "__main__":
    cek() if "--cek" in sys.argv else main()
