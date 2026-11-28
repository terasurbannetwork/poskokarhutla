"""OJL-3 Rapor Klaster Logistik dari antarmuka data publik INALOGPAL (DESAIN-TEKNIS sec 6.20; ALGORITMA sec 7.8; Juklak 16/2025; tiket RU-064).

Langkah jalan.py (harian). Masukan (lewat panen.ambil_json, MB-8: host izin, robots, jeda, cache): INALOGPAL Api/get_progress,
get_count_cluster_all, get_count_cluster_sk_all; beban kejadian = jumlah kejadian DIBI 5 tahun lengkap terakhir per provinsi
(dibi_kab_tahun.json). get_instansi_survey TIDAK pernah dibaca (memuat nama dan nomor PIC; ditolak panen.DILARANG).

Per provinsi: capaian pra, darurat, pasca (persen dari API, angka resmi), ber-SK, beban. MERAH bila beban di sepertiga teratas nasional
(persentil >= 2/3, skor.persentil) DAN (capaian maksimum < 25% ATAU tanpa SK); batas 25% asumsi (riset/4 O3).
Ber-SK: API tidak memberi bendera SK per wilayah. get_progress memuat tepat wilayah yang punya klaster ber-SK (16 provinsi dan 12
kab/kota 26 Nov 2026 = get_count_cluster_sk_all); kesimpulan "ber-SK = ada di get_progress" dipakai HANYA selama jumlahnya sama
dengan get_count_cluster_sk_all, kalau tidak ber-SK ditulis belum diketahui dan tidak ikut aturan merah. Hari sejak pemutakhiran:
API tidak memberi tanggal, jadi kosong, bukan nol. Nama provinsi INALOGPAL dicocokkan ke daftar kita menurut nama, bukan kode
(Papua: kode INALOGPAL 91 dan 94 = Papua Barat dan Papua lama, bukan 91 dan 94 kita).
Bentuk API berubah: panen.BentukBerubah, jalan.py mempertahankan berkas kemarin (keluar bukan 0).

  python3 -I scripts/bnpb/unit/ojl3.py --cek
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402
import skor  # noqa: E402

AKAR = rapor.AKAR
BASE = "https://inalogpal.bnpb.go.id/Api/"
SUMBER = {"progress": "get_progress", "semua": "get_count_cluster_all", "sk": "get_count_cluster_sk_all"}
FIXTURE = os.path.join(AKAR, "tests", "bnpb", "fixtures", "unit", "inalogpal")
SITUS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jdih_situs.json")
AMBANG_CAPAIAN = 25.0   # asumsi riset/4 O3
TAHUN_BEBAN = 5
ASUMSI = ["Asumsi: batas capaian 25 persen", "Asumsi: ber-SK bila tercatat di sumber", "Asumsi: merah masih hipotesis"]
KUNCI_BARIS = ("wilayah_id", "wilayah", "pra_bencana", "darurat_bencana", "pasca_bencana", "total_capaian", "tahapan")


def _angka(v, nama):
    try:
        x = float(v)
    except (TypeError, ValueError):
        raise ValueError(f"get_progress: {nama} {v!r} bukan angka") from None
    if not 0 <= x <= 100:
        raise ValueError(f"get_progress: {nama} {x} di luar 0 sampai 100")
    return x


def urai_progress(j):
    """-> [{id, wilayah, pra, darurat, pasca, tahapan}]; bentuk lain dari yang diharapkan = ValueError (bukan 0)."""
    if not isinstance(j, dict) or j.get("response") != "success" or not isinstance(j.get("data"), dict) or not isinstance(j["data"].get("files"), list):
        raise ValueError("get_progress: bentuk berubah (response, data.files)")
    out = []
    for f in j["data"]["files"]:
        if not isinstance(f, dict) or any(k not in f for k in KUNCI_BARIS):
            raise ValueError("get_progress: baris tanpa kolom yang diharapkan")
        out.append({"id": str(f["wilayah_id"]), "wilayah": str(f["wilayah"]).strip(), "pra": _angka(f["pra_bencana"], "pra_bencana"),
                    "darurat": _angka(f["darurat_bencana"], "darurat_bencana"), "pasca": _angka(f["pasca_bencana"], "pasca_bencana"),
                    "tahapan": str(f["tahapan"]).strip()})
    if not out:
        raise ValueError("get_progress: tanpa baris")
    return out


def urai_hitungan(j, nama):
    """[{wilayah_jenis, jumlah}] -> {'Provinsi': n, 'Kabupaten': n}."""
    if not isinstance(j, list):
        raise ValueError(f"{nama}: bentuk berubah (daftar)")
    out = {}
    for x in j:
        if not isinstance(x, dict) or x.get("wilayah_jenis") not in ("Provinsi", "Kabupaten"):
            raise ValueError(f"{nama}: baris tak dikenal")
        try:
            out[x["wilayah_jenis"]] = int(x["jumlah"])
        except (TypeError, ValueError):
            raise ValueError(f"{nama}: jumlah {x.get('jumlah')!r} bukan bilangan bulat") from None
    return out


def _kunci(n):
    return re.sub(r"[^a-z]", "", n.lower())


def beban(dibi, tahun_n=TAHUN_BEBAN):
    """{prov: jumlah kejadian} 5 tahun lengkap terakhir; provinsi tanpa satu pun baris DIBI tidak ada di hasil (bukan 0)."""
    kol = {k: i for i, k in enumerate(dibi["kolom"])}
    akhir = max(b[kol["tahun"]] for b in dibi["baris"])
    out = {}
    for b in dibi["baris"]:
        if akhir - tahun_n < b[kol["tahun"]] <= akhir:
            out[b[kol["kab"]][:2]] = out.get(b[kol["kab"]][:2], 0) + (b[kol["kejadian"]] or 0)
    return out, f"{akhir - tahun_n + 1}-{akhir}"


def rapor_prov(progress, hitung_sk, situs, bebans):
    """-> (baris per provinsi urut beban menurun, kab_ber_sk, tak_terpetakan, sk_dikenal)."""
    prov_api = {_kunci(p["wilayah"]): p for p in progress if len(p["id"]) == 2}
    kab_api = [p for p in progress if len(p["id"]) == 4]
    sk_dikenal = hitung_sk.get("Provinsi") == len(prov_api) and hitung_sk.get("Kabupaten") == len(kab_api)
    nama_situs = {_kunci(s["nama"]): s for s in situs}
    tak = sorted(p["wilayah"] for k, p in prov_api.items() if k not in nama_situs)
    pers = skor.persentil({s["kode"]: bebans.get(s["kode"]) for s in situs})
    baris = []
    for s in situs:
        p = prov_api.get(_kunci(s["nama"]))
        cap = max(p["pra"], p["darurat"], p["pasca"]) if p else None
        sk = None if not sk_dikenal else p is not None
        top = pers.get(s["kode"], 0) >= 2 / 3 if s["kode"] in pers else False
        rendah = cap is not None and cap < AMBANG_CAPAIAN
        merah = bool(top and (rendah or sk is False))
        baris.append({"kode": s["kode"], "provinsi": s["nama"], "sk": sk, "pra": p and p["pra"], "darurat": p and p["darurat"], "pasca": p and p["pasca"],
                      "tahapan": p and p["tahapan"], "beban": bebans.get(s["kode"]), "persentil": pers.get(s["kode"]), "merah": merah})
    baris.sort(key=lambda b: (b["beban"] is None, -(b["beban"] or 0), b["kode"]))
    return baris, len(kab_api), tak, sk_dikenal


def bangun(progress, hit_semua, hit_sk, dibi, situs, sumber_atribusi):
    bebans, tahun = beban(dibi)
    baris, kab_sk, tak, sk_dikenal = rapor_prov(progress, hit_sk, situs, bebans)
    ber_sk = [b for b in baris if b["sk"]]
    merah = [b for b in baris if b["merah"]]
    capaian = [max(b["pra"], b["darurat"], b["pasca"]) for b in ber_sk]
    top = [b for b in baris if b["persentil"] is not None and b["persentil"] >= 2 / 3]
    merah_title = (f"Hipotesis. Beban kejadian {tahun} di sepertiga teratas dan (capaian maksimum di bawah 25% atau tanpa surat keputusan tercatat). "
                   f"Ambang 25% asumsi riset; saat ini {len(merah)} dari {len(top)} provinsi di sepertiga beban tertinggi berstatus merah" +
                   (", jadi merah setara peringkat beban dan belum menyaring apa pun" if len(merah) == len(top) else "") + ".")
    ya = lambda v: "belum diketahui" if v is None else "ya" if v else "tidak tercatat"   # noqa: E731
    k1 = rapor.kartu(
        id="ojl3-klaster", sistem="OJL-3", pil="Klaster Logistik", ikon="gudang", judul="Klaster Logistik per provinsi",
        angka=[{"k": "ber_sk", "label": "Provinsi ber-surat keputusan (SK) klaster, dari 38", "nilai": len(ber_sk) if sk_dikenal else None,
                "title": "ber-SK = tercatat di daftar progres INALOGPAL (get_progress) selama jumlahnya sama dengan hitungan SK klaster (get_count_cluster_sk_all)"},
               {"k": "tertinggi", "label": "Capaian provinsi tertinggi (%)", "nilai": max(capaian) if capaian else None, "desimal": 2,
                "title": "capaian pra, darurat, pasca terbesar di antara provinsi ber-SK, angka INALOGPAL"},
               {"k": "merah", "label": "Provinsi merah", "nilai": len(merah),
                "title": merah_title},
               {"k": "kab_sk", "label": "Kab/kota ber-SK klaster", "nilai": kab_sk if sk_dikenal else None},
               {"k": "klaster_prov", "label": "Hitungan klaster provinsi (sumber INALOGPAL)", "nilai": hit_semua.get("Provinsi"),
                "title": "angka mentah dari get_count_cluster_all; satuannya tidak dijelaskan sumber"},
               {"k": "tak", "label": "Nama provinsi INALOGPAL tak cocok dengan daftar kita", "nilai": len(tak),
                "title": "dicocokkan menurut nama, tidak ditebak: " + (", ".join(tak) if tak else "semua cocok")},
               {"k": "mutakhir", "label": "Hari sejak pemutakhiran terakhir", "nilai": None,
                "title": "sumber data tidak menyertakan tanggal pemutakhiran; batas basi 3 bulan (Juklak 16/2025) belum bisa diperiksa"}],
        kolom=[{"k": "provinsi", "label": "Provinsi", "title": "nama INALOGPAL dicocokkan menurut nama; cakupan Papua sebelum dan sesudah pemekaran 2022 tidak dibagi"},
               {"k": "sk", "label": "Ber-SK klaster", "title": "tidak tercatat = tidak ada di daftar progres INALOGPAL; bukan bukti klaster tidak ada"},
               {"k": "pra", "label": "Pra bencana (%)", "angka": True, "desimal": 2, "title": "capaian pemantauan dan evaluasi elektronik INALOGPAL"},
               {"k": "darurat", "label": "Darurat (%)", "angka": True, "desimal": 2}, {"k": "pasca", "label": "Pasca bencana (%)", "angka": True, "desimal": 2},
               {"k": "tahapan", "label": "Tahapan"},
               {"k": "beban", "label": f"Kejadian DIBI {tahun}", "angka": True, "title": "jumlah kejadian semua jenis, kab di provinsi itu"},
               {"k": "status", "label": "Status", "title": merah_title}],
        baris=[{"provinsi": b["provinsi"], "sk": ya(b["sk"]), "pra": b["pra"], "darurat": b["darurat"], "pasca": b["pasca"], "tahapan": b["tahapan"],
                "beban": b["beban"], "status": "merah" if b["merah"] else "tidak merah"} for b in baris],
        rumus="merah = beban kejadian DIBI di persentil >= 2/3 DAN (capaian maksimum < 25% ATAU tanpa SK tercatat)",
        sumber=["inalogpal_progress", "inalogpal_hitungan", "dibi_kab_tahun"], label=["resmi", "hitungan_kita"], asumsi=ASUMSI, unduh="klaster_logistik_provinsi.csv")
    b = rapor.berkas([k1], sumber_atribusi)
    b["data"] = {"label_wajib": "capaian dari INALOGPAL; merah = hitungan kita", "tahun_beban": tahun, "sk_dikenal": sk_dikenal, "ambang_capaian": AMBANG_CAPAIAN,
                 "klaster": hit_semua, "sk": hit_sk, "tak_terpetakan": tak, "provinsi": baris}
    return b


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan():
    import panen
    ambil = {}
    atribusi = []
    for k, ep in SUMBER.items():
        j, a = panen.ambil_json(BASE + ep, "inalogpal_" + ep, umur_jam=20, nama="INALOGPAL BNPB, Api/" + ep, lisensi="syarat pakai tidak tertulis; layar staf saja (U4)")
        ambil[k] = j
        atribusi.append(a)
    return {"klaster_logistik": bangun(urai_progress(ambil["progress"]), urai_hitungan(ambil["semua"], "get_count_cluster_all"),
                                       urai_hitungan(ambil["sk"], "get_count_cluster_sk_all"), _muat(os.path.join(AKAR, "public", "data", "bnpb", "dibi_kab_tahun.json")),
                                       _muat(SITUS), atribusi)}


def cek():
    # bentuk berubah: keluar bukan 0
    for rusak in ({}, {"response": "error"}, {"response": "success", "data": {}}, {"response": "success", "data": {"files": []}},
                  {"response": "success", "data": {"files": [{"wilayah_id": 11}]}}):
        try:
            urai_progress(rusak)
            raise AssertionError(f"bentuk rusak lolos: {rusak}")
        except ValueError:
            pass
    baris = {"wilayah_id": 11, "wilayah": "Aceh", "pra_bencana": "11.87", "darurat_bencana": "0.00", "pasca_bencana": "0.00", "total_capaian": "11.87", "tahapan": "Aktif"}
    for k, v in (("pra_bencana", "abc"), ("pra_bencana", "150")):
        try:
            urai_progress({"response": "success", "data": {"files": [{**baris, k: v}]}})
            raise AssertionError(f"{k}={v} lolos")
        except ValueError:
            pass
    for rusak in ({}, [{"wilayah_jenis": "Desa", "jumlah": "1"}], [{"wilayah_jenis": "Provinsi", "jumlah": "x"}]):
        try:
            urai_hitungan(rusak, "t")
            raise AssertionError("hitungan rusak lolos")
        except ValueError:
            pass
    # kasus RU 2.7: Aceh 11,87% ber-SK, beban teratas = merah; Banten 0% ber-SK, beban tidak teratas = tidak merah; provinsi tanpa SK, teratas = merah
    situs = [{"kode": "11", "nama": "Aceh"}, {"kode": "36", "nama": "Banten"}, {"kode": "32", "nama": "Jawa Barat"}, {"kode": "12", "nama": "Sumatera Utara"}, {"kode": "13", "nama": "Sumatera Barat"}, {"kode": "14", "nama": "Riau"}]
    kol = ["kab", "tahun", "jenis", "kejadian", "meninggal_hilang", "luka", "terdampak", "mengungsi", "rumah_rusak_berat"]
    dibi = {"kolom": kol, "baris": [["1101", 2025, "banjir", 100, 0, 0, 0, 0, 0], ["1201", 2025, "banjir", 90, 0, 0, 0, 0, 0], ["1101", 2019, "banjir", 999, 0, 0, 0, 0, 0],
                                    ["3601", 2025, "banjir", 1, 0, 0, 0, 0, 0], ["3201", 2024, "banjir", 2, 0, 0, 0, 0, 0], ["1301", 2021, "banjir", 50, 0, 0, 0, 0, 0],
                                    ["1401", 2025, "banjir", 10, 0, 0, 0, 0, 0]]}
    prog = urai_progress({"response": "success", "data": {"files": [
        baris, {**baris, "wilayah_id": 36, "wilayah": "Banten", "pra_bencana": "0.00", "total_capaian": "0.00"},
        {**baris, "wilayah_id": 13, "wilayah": "Sumatera Barat", "pra_bencana": "60.00", "darurat_bencana": "30.00"},
        {**baris, "wilayah_id": 3304, "wilayah": "Kab. Banjarnegara"}]}})
    bb, tahun = beban(dibi)
    assert tahun == "2021-2025" and bb == {"11": 100, "12": 90, "36": 1, "32": 2, "13": 50, "14": 10}, (tahun, bb)   # 2019 di luar jendela
    rows, kab_sk, tak, dikenal = rapor_prov(prog, {"Provinsi": 3, "Kabupaten": 1}, situs, bb)
    r = {x["kode"]: x for x in rows}
    assert dikenal and kab_sk == 1 and tak == [] and r["11"]["merah"], r["11"]   # Aceh ber-SK, 11,87% < 25, beban teratas
    assert not r["36"]["merah"] and r["36"]["sk"] is True, "Banten 0% tetapi bebannya bukan sepertiga teratas"
    assert not r["13"]["merah"], "Sumbar capaian 60% bukan merah walau beban menengah"
    assert r["12"]["sk"] is False and r["12"]["pra"] is None and r["12"]["merah"], "Sumut tanpa SK dan beban tinggi = merah"
    assert not r["14"]["merah"] and not r["32"]["merah"] and [x["kode"] for x in rows][:2] == ["11", "12"], "urut beban menurun"
    # jumlah SK tak cocok dengan get_count_cluster_sk_all: ber-SK tidak diketahui, aturan merah hanya lewat capaian
    rows2, _, _, dikenal2 = rapor_prov(prog, {"Provinsi": 9, "Kabupaten": 1}, situs, bb)
    r2 = {x["kode"]: x for x in rows2}
    assert not dikenal2 and r2["12"]["sk"] is None and not r2["12"]["merah"] and r2["11"]["merah"]
    # nama tak cocok dicatat, tidak ditebak (Papua lama vs baru)
    _, _, tak2, _ = rapor_prov(urai_progress({"response": "success", "data": {"files": [{**baris, "wilayah_id": 94, "wilayah": "Papua Lama"}]}}), {"Provinsi": 1, "Kabupaten": 0}, situs, bb)
    assert tak2 == ["Papua Lama"]
    # fixture nyata (tangkapan Api/get_progress 26 Nov 2026, tanpa koordinat)
    nyata = _muat(os.path.join(FIXTURE, "get_progress.json"))
    atr = [{"nama": "INALOGPAL BNPB, Api/get_progress", "url": BASE + "get_progress", "diambil": "2026-11-26T00:00:00Z", "lisensi": "syarat pakai tidak tertulis; layar staf saja (U4)"}]
    b = bangun(urai_progress(nyata), {"Provinsi": 322, "Kabupaten": 77}, {"Provinsi": 16, "Kabupaten": 12}, _muat(os.path.join(AKAR, "public", "data", "bnpb", "dibi_kab_tahun.json")), _muat(SITUS), atr)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    s = json.dumps(b, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    assert not re.search(r"get_instansi_survey|nama_pic|no_hp|telepon", s, re.I), "data PIC bocor"
    a = {x["k"]: x["nilai"] for x in b["kartu"][0]["angka"]}
    d = b["data"]
    assert d["sk_dikenal"] and a["ber_sk"] == 16 and a["kab_sk"] == 12 and a["mutakhir"] is None, a
    assert abs(a["tertinggi"] - 11.87) < 1e-9, a   # Aceh
    assert "setara peringkat beban" in b["kartu"][0]["angka"][2]["title"] and "Asumsi: merah masih hipotesis" in b["kartu"][0]["asumsi"], "merah tanpa saringan wajib diakui"
    aceh = next(x for x in d["provinsi"] if x["provinsi"] == "Aceh")
    assert aceh["sk"] and aceh["pra"] == 11.87 and aceh["beban"] is not None, aceh
    assert len(d["provinsi"]) == 38 and all((x["beban"] is None) == (x["persentil"] is None) for x in d["provinsi"])
    print(f"ojl3.py --cek: lulus (38 provinsi, {a['ber_sk']} ber-SK, capaian tertinggi {a['tertinggi']:.2f}%, {a['merah']} merah, {a['tak']} nama tak cocok: "
          f"{', '.join(d['tak_terpetakan']) or 'tidak ada'}; tanpa jaringan, fixture 26 Nov 2026)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
