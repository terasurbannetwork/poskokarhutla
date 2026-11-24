"""Pembanding luas terbakar: regresi keputusan.py (log-log dari titik panas) lawan MapBiomas Fire Indonesia
-> public/data/luas_pembanding.json  (PKH-41; kartu PKH-40 membaca berkas ini)

Sumber MapBiomas: data/mapbiomas_fire_rujukan.json (kutipan terbit, bukan unduhan primer). Bucket publik mapbiomas-public
menolak akses anonim (403) per 24 Nov 2026, jadi bekas bakar bulanan per provinsi/kab 2024-2026 dan tahun tumpang tindih
2013-2023 TIDAK bisa dihitung sendiri; hasilnya berstatus "belum terbit/tidak terjangkau", bukan nol.
Lisensi: MapBiomas CC BY-SA 4.0 (tercatat di lab_mapbiomas.py; belum dicek ulang di situs, platform JS) -> cantumkan atribusi.
Rumus regresi dibaca dari keputusan.kalibrasi (tidak diubah). Luas regresi untuk periode sebagian (Jan-Sep) = regresi
tahunan diterapkan pada titik Jan-Sep: PERKIRAAN KASAR, bukan luas tahunan. Tanda bias bila |ln(rasio)| > sigma_log provinsi.
Pakai: python3 bias_luas.py   |   python3 bias_luas.py uji
"""
import datetime as dt, json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI
from keputusan import kalibrasi

D = os.path.join(AKAR, "public/data")
KALIMANTAN = ["61", "62", "63", "64", "65"]
PAPUA = ["91", "92", "93", "94", "95", "96"]


def titik_periode(S, kode, tahun, bulan_akhir):
    return sum(S["prov"].get(kode, {}).get(tahun, [0] * 12)[:bulan_akhir])


def bandingkan(est, ref, sigma):
    """rasio regresi/MapBiomas + tanda; None bila tak ada rujukan (bukan nol)."""
    if not ref or ref <= 0 or est is None:
        return {"rasio": None, "tanda": "tanpa rujukan"}
    r = est / ref
    if sigma > 1:  # kalibrasi provinsi longgar: ambang sigma tak bermakna, lihat rasio langsung
        t = "tak dapat dinilai (sigma lebar)"
    else:
        t = "dalam kisaran" if abs(math.log(r)) <= sigma else ("regresi lebih kecil dari kutipan" if r < 1 else "regresi lebih besar dari kutipan")
    return {"rasio": round(r, 2), "tanda": t}


def pangsa(S, kodes, tahun, bln):
    tot = sum(titik_periode(S, k, tahun, bln) for k in S["prov"])
    return round(sum(titik_periode(S, k, tahun, bln) for k in kodes) / tot, 3) if tot else None


def bangun():
    L = json.load(open(os.path.join(D, "luas_resmi.json")))
    S = json.load(open(os.path.join(D, "sejarah.json")))
    R = json.load(open(os.path.join(AKAR, "data/mapbiomas_fire_rujukan.json")))
    kal, b = kalibrasi(L, S)
    thn, bln = R["periode"]["akhir"][:4], int(R["periode"]["akhir"][5:7])
    baris = []
    for kode, ref in R["prov_ha"].items():
        if kode not in kal:
            baris.append({"prov": kode, "nama": PROVINSI[kode], "mapbiomas_ha": ref, "regresi_ha": None, "tanda": "regresi tidak terkalibrasi"}); continue
        a, sd, smear, n = kal[kode]
        x = titik_periode(S, kode, thn, bln)
        est = round(math.exp(a + b * math.log(max(x, 1))) * smear) if x > 0 else None
        baris.append({"prov": kode, "nama": PROVINSI[kode], "titik_viirs": x, "mapbiomas_ha": ref, "regresi_ha": est,
                      "sigma_log": round(sd, 2), **bandingkan(est, ref, sd)})
    est_nas = sum(round(math.exp(a + b * math.log(max(titik_periode(S, k, thn, bln), 1))) * sm)
                  for k, (a, sd, sm, n) in kal.items() if titik_periode(S, k, thn, bln) > 0)
    sd_nas = 0.5  # ponytail: sigma nasional belum dihitung; ambang kasar, ganti sigma gabungan bila kartu butuh
    nasional = {"mapbiomas_ha": R["nasional_ha"], "regresi_ha": est_nas, "jumlah_prov_terkalibrasi": len(kal), **bandingkan(est_nas, R["nasional_ha"], sd_nas),
                "catatan": "jumlah regresi seluruh provinsi terkalibrasi; ambang tanda memakai sigma 0,5 (kasar)"}
    titik = {"kalimantan": pangsa(S, KALIMANTAN, thn, bln), "papua": pangsa(S, PAPUA, thn, bln)}
    return {
        "dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "sumber": "MapBiomas Fire Indonesia (kutipan terbit, lihat catatan) lawan regresi keputusan.py (log-log titik VIIRS; a per provinsi dari SiPongi 2018-2023)",
        "satelit": {"mapbiomas": R["satelit"], "regresi": "titik panas VIIRS S-NPP (375 m), keyakinan sedang/tinggi"},
        "periode": R["periode"],
        "metode": "rasio = luas regresi pada titik periode yang sama / luas MapBiomas; tanda bila |ln rasio| > sigma_log provinsi",
        "definisi": {"mapbiomas_ha": "luas bekas bakar terklasifikasi dari citra 30 m, bulanan, dijumlah",
                     "regresi_ha": "perkiraan dari jumlah titik VIIRS periode itu; rumus tahunan dipakai pada periode sebagian, jadi kasar",
                     "rasio": "regresi dibagi MapBiomas; < 1 berarti regresi melapor lebih kecil",
                     "pangsa": "porsi wilayah terhadap total nasional pada periode yang sama",
                     "tanda": "hipotesis: selisih lawan kutipan MapBiomas, bukan bias terbukti; regresi tahunan dipakai pada periode sebagian (Jan-Sep) dan kutipan Papua mungkin sudah memuat Papua Selatan"},
        "bias_provinsi": baris, "bias_nasional": nasional,
        "tahun_tumpang_tindih": {"status": "belum terhitung",
                                 "alasan": "MapBiomas Fire per provinsi 2013-2023 hanya raster di bucket yang kini 403; belum ada tabel provinsi terbit yang terverifikasi"},
        "mapbiomas_2024_2026_bulanan": {"status": "belum terbit/tidak terjangkau",
                                         "alasan": "tidak ada rilis bulanan per provinsi/kab yang bisa diunduh anonim; hanya angka Jan-Sep 2026 dari pemberitaan"},
        "pangsa_wilayah": {
            "titik_panas_viirs": {"nilai_kita": titik, "kutipan_mapbiomas": {k: v["titik_panas"] for k, v in R["pangsa_kutipan"].items()}},
            "tapak_sel_375m": {"nilai_kita": None, "status": "belum tersedia per provinsi (arsip kita tidak menyimpan tapak sel tahunan)",
                               "kutipan_mapbiomas": {k: v["tapak_sel_375m"] for k, v in R["pangsa_kutipan"].items()}},
            "bekas_bakar": {"nilai_kita": None, "status": "bukan hasil kita", "kutipan_mapbiomas": {k: v["bekas_bakar"] for k, v in R["pangsa_kutipan"].items()}},
        },
        "atribusi": "MapBiomas Indonesia (mapbiomas.org), Auriga Nusantara dkk.; CC BY-SA 4.0",
        "catatan": R["catatan"],
    }


def uji():
    assert bandingkan(50, 100, 0.3)["tanda"] == "regresi lebih kecil dari kutipan"
    assert bandingkan(100, 100, 0.3)["tanda"] == "dalam kisaran"
    assert bandingkan(300, 100, 0.3)["tanda"] == "regresi lebih besar dari kutipan"
    assert bandingkan(10, 100, 2.3)["tanda"] == "tak dapat dinilai (sigma lebar)"
    assert bandingkan(5, None, 0.3)["rasio"] is None and bandingkan(5, 0, 0.3)["rasio"] is None
    S = {"prov": {"61": {"2026": [1] * 12}, "93": {"2026": [3] * 12}}}
    assert pangsa(S, ["61"], "2026", 9) == 0.25 and titik_periode(S, "93", "2026", 9) == 27
    o = bangun()
    assert o["pangsa_wilayah"]["tapak_sel_375m"]["nilai_kita"] is None
    assert all(r["mapbiomas_ha"] > 0 for r in o["bias_provinsi"])
    print("bias_luas uji OK")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        o = bangun()
        json.dump(o, open(os.path.join(D, "luas_pembanding.json"), "w"), ensure_ascii=False, indent=1)
        print(json.dumps({k: o[k] for k in ("bias_provinsi", "bias_nasional")}, ensure_ascii=False, indent=1))
        print(json.dumps(o["pangsa_wilayah"]["titik_panas_viirs"]))
