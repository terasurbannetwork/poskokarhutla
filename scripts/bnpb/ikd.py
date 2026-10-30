"""#32 Kapasitas daerah (C) per kabupaten/kota -> public/data/bnpb/ikd.json

SUMBER   Indeks Ketahanan Daerah (IKD) BNPB: 7 prioritas, 71 indikator, 284 pertanyaan (Renstra BNPB 2025-2029 hlm. 85). Nilai IKD
         per kabupaten TIDAK terbit sebagai data terbuka yang bisa ditarik (tidak ada di data.bnpb.go.id, InaRISK apiv4, maupun JDIH;
         diperiksa 29 Okt 2026). Yang terbuka dan resmi adalah RASTER KAPASITAS InaRISK (`layer_peta_kapasitas`, 0-0,79) yang dipakai
         BNPB sendiri sebagai penyebut risiko. Nilainya konstan per kabupaten (diperiksa: Cilacap 0,6583 di 24 kecamatan,
         Jayawijaya 0,19 di 40 kecamatan), jadi cukup dicuplik di titik pusat kecamatan lalu diambil MEDIANNYA per kabupaten.
         PADANAN raster ini dengan IKD tidak terbukti (kajian bab-02: "kesetaraan kelas kapasitas KRB dengan alat ukur IKD belum
         terbukti"); karena itu berkas ini menyebutnya `kapasitas_inarisk`, bukan IKD, sampai nilai IKD resmi diperoleh.
RUMUS    C_kab = median_{kec di kab} raster_kapasitas(pusat kec);  kelas InaRISK: rendah < 0,33; sedang 0,33-0,66; tinggi > 0,66
         c_z   = z-skor C_kab lintas kabupaten (dipakai model risiko_hvc);  C01 = max(C_kab, 0,05) sebagai penyebut R = H x V / C
UJI      Hitungan kelas dibandingkan dengan ringkasan resmi InaRISK (kajian-summary/multi-bahaya, 29 Okt 2026):
         315 rendah, 190 sedang, 3 tinggi dari 508 kabupaten. Selisih dicatat di `uji_ringkasan`, tidak ditutupi.
KELUARAN {"dibuat","sumber","atribusi","lisensi","kelas_ambang","uji_ringkasan","kab":{kode:{"c","min","maks","n","kelas","z"}}}
Pakai:  python3 scripts/bnpb/ikd.py   |   python3 scripts/bnpb/ikd.py --cek
"""
import json, os, statistics, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hvc_dasar as D
import hvc_stat as S
import terpapar as T

LAYAR = "layer_peta_kapasitas"
AMBANG = (0.33, 0.66)
RINGKASAN_RESMI = {"rendah": 315, "sedang": 190, "tinggi": 3, "total": 508}   # inarisk.bnpb.go.id/apiv4/kajian-summary/multi-bahaya/ALL, 29 Okt 2026
C_MIN = 0.05


def kelas(c):
    return "rendah" if c < AMBANG[0] else "sedang" if c <= AMBANG[1] else "tinggi"


def per_kab(nilai_kec, peta_kode):
    """nilai_kec {"prov|kab|kec": c} + peta_kode {"prov|kab": kode} -> ({kode: {c,min,maks,n,kelas}}, kunci kab tak dikenal)."""
    grup, tak = {}, set()
    for k, v in nilai_kec.items():
        if v is None or v <= 0:   # nol = kecamatan tak tertutup raster (laut / tak ada data), bukan kapasitas nol
            continue
        pk = "|".join(k.split("|")[:2])
        kode = peta_kode.get(pk)
        if not kode:
            tak.add(pk)
            continue
        grup.setdefault(kode, []).append(v)
    out = {kode: {"c": round(statistics.median(v), 4), "min": round(min(v), 4), "maks": round(max(v), 4), "n": len(v), "kelas": kelas(statistics.median(v))}
           for kode, v in grup.items()}
    return out, sorted(tak)


def hitung_kelas(kab):
    h = {"rendah": 0, "sedang": 0, "tinggi": 0}
    for v in kab.values():
        h[v["kelas"]] += 1
    h["total"] = sum(h.values())
    return h


def jalan():
    mulai = time.time()
    pusat = json.load(open(os.path.join(D.AKAR, "public/banjir/data/pusat_kec.json")))
    kunci = list(pusat)
    titik = [(pusat[k][1], pusat[k][0]) for k in kunci]    # (lon, lat)
    nilai = T.sampel(LAYAR, titik)
    kab, tak = per_kab(dict(zip(kunci, nilai)), D.kab_kode())
    z = S.zskor([v["c"] for v in kab.values()])
    for v, zi in zip(kab.values(), z):
        v["z"] = round(zi, 3)
    h = hitung_kelas(kab)
    D.simpan_plafon("ikd.json", {
        "sumber": "InaRISK BNPB, raster indeks kapasitas daerah (gis.bnpb.go.id/server/rest/services/inarisk/layer_peta_kapasitas/ImageServer), median per kabupaten",
        "atribusi": "Badan Nasional Penanggulangan Bencana (InaRISK)", "lisensi": "lisensi InaRISK tidak tertulis; bukan klaim data terbuka",
        "catatan": "Bukan angka IKD resmi: nilai IKD per kabupaten tidak terbit terbuka. Padanan raster ini dengan IKD tidak terbukti.",
        "kelas_ambang": {"rendah_di_bawah": AMBANG[0], "tinggi_di_atas": AMBANG[1]}, "c_min_penyebut": C_MIN,
        "uji_ringkasan": {"hitung_kita": h, "resmi_inarisk": RINGKASAN_RESMI,
                          "selisih": {k: h[k] - RINGKASAN_RESMI[k] for k in RINGKASAN_RESMI}},
        "kunci_tak_dikenal": tak, "kab": kab})
    print(f"ikd.json: {len(kab)} kabupaten, kelas {h}, resmi {RINGKASAN_RESMI}, tak dikenal {len(tak)}, {time.time() - mulai:.0f} dtk", file=sys.stderr)


def _cek():
    assert kelas(0.2) == "rendah" and kelas(0.33) == "sedang" and kelas(0.66) == "sedang" and kelas(0.6583) == "sedang" and kelas(0.67) == "tinggi"
    kab, tak = per_kab({"33|Cilacap|A": 0.6583, "33|Cilacap|B": 0.6583, "33|Cilacap|C": 0.7, "33|Cilacap|Laut": 0.0,
                        "11|Aceh Selatan|A": 0.2033, "11|Aceh Selatan|B": 0.2183, "11|Aceh Selatan|C": None, "99|Siluman|A": 0.4},
                       {"33|Cilacap": "3301", "11|Aceh Selatan": "1101"})
    assert kab["3301"] == {"c": 0.6583, "min": 0.6583, "maks": 0.7, "n": 3, "kelas": "sedang"}, kab["3301"]   # median menolak pencilan
    assert kab["1101"]["n"] == 2 and kab["1101"]["kelas"] == "rendah" and tak == ["99|Siluman"]
    assert hitung_kelas(kab) == {"rendah": 1, "sedang": 1, "tinggi": 0, "total": 2}
    assert sum(RINGKASAN_RESMI[k] for k in ("rendah", "sedang", "tinggi")) == RINGKASAN_RESMI["total"] - 0   # 315+190+3 = 508
    print("ikd: --cek hijau")


if __name__ == "__main__":
    _cek() if "--cek" in sys.argv else jalan()
