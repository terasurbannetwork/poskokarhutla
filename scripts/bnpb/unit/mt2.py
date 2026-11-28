"""MT-2 Urutan daerah mitigasi dan paket kegiatan (DESAIN-TEKNIS sec 6.11; ALGORITMA sec 5.5, sec 10.15; tiket RU-061).

Langkah jalan.py (bulanan). Skor satu rumus MB-4 (skor.py), komponen bawaan ALGORITMA sec 5.4, bobot sama rata:
  risiko          persentil +1  maks_b terpapar.json kab[k].h[b][2] (jiwa terpapar kelas tinggi)          proksi
  celah_kapasitas persentil +1  1 - ikd.json kab[k].c (raster, bukan IKD resmi)                         proksi
  kejadian        persentil +1  jumlah kejadian DIBI 5 tahun kalender lengkap terakhir, semua jenis       resmi, dijumlah kita
Kab yang tidak pernah muncul di DIBI 2015-2025: kejadian None, bukan nol. Kode BPS DIBI sudah dipadankan ke Kemendagri di
dibi_kab_tahun.json (risiko_hvc.py, padanan_kab_dibi.py); sisa 26 Nov 2026: 9106, 9208, 9506.
Kuartil atas = S >= persentil 75 (inklusif, ALGORITMA sec 0.6) dari S yang tidak None.
Kegiatan 1 sampai 3 per kab dari mitigasi_peta.json, urut persentil H bahaya terkait (risiko_hvc.json H per jenis, H > 0);
02.01.11 hanya bila longsor DIBI tercatat di >= tahun_min dari jendela tahun. Kegiatan tanpa kode 02.01.xx ditolak saat muat.

HIPOTESIS: uji balik MB-4 (ALGORITMA sec 5.7, lab_kriteria/mb4.json) belum dijalankan, jadi judul netral "urutan skor"
dan kata "prioritas" tidak dipakai. Label wajib: "usulan analis, bukan rekomendasi resmi".

  python3 -I scripts/bnpb/unit/mt2.py --cek
"""
import hashlib
import json
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402
import skor  # noqa: E402

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA = os.path.join(AKAR, "public", "data", "bnpb")
PETA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mitigasi_peta.json")
KRITERIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lab_kriteria", "mb4.json")  # dikunci, uji belum jalan
ASUMSI = ["Asumsi: belum lulus uji balik", "Asumsi: bobot sementara"]  # ALGORITMA 5.4, 5.7
KODE_WILAYAH = "kejadian tidak tercatat DIBI 2015-2025"
KODE = re.compile(r"^02\.01\.\d{2}$")
LABEL_WAJIB = "usulan analis, bukan rekomendasi resmi"
STATUS_UJI = "belum diuji balik (ALGORITMA 5.7); hipotesis"
MAKS_KEGIATAN = 3
BOBOT = {"risiko": 1, "celah_kapasitas": 1, "kejadian": 1}  # Asumsi: bobot sementara (ALGORITMA 5.4)


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def muat_peta(p=None):
    """Tolak kegiatan tanpa kode 02.01.xx, kode tanpa nama, bahaya tanpa kegiatan."""
    d = p if isinstance(p, dict) else _muat(p or PETA)
    keg = d.get("kegiatan") or {}
    for kode, nama in keg.items():
        if not KODE.match(str(kode)) or not isinstance(nama, str) or not nama.strip():
            raise ValueError(f"kegiatan {kode!r}: {nama!r} harus berkode 02.01.xx dan bernama")
    for bahaya, daftar in (d.get("peta") or {}).items():
        if not daftar:
            raise ValueError(f"bahaya {bahaya} tanpa kegiatan")
        for kode in daftar:
            if kode not in keg:
                raise ValueError(f"bahaya {bahaya}: kegiatan {kode!r} tanpa kode di daftar kegiatan")
    for s in d.get("bersyarat") or []:
        if s.get("kode") not in keg or not isinstance(s.get("tahun_min"), int) or not isinstance(s.get("jendela"), int):
            raise ValueError(f"kegiatan bersyarat {s!r} tidak sah")
    if not d.get("peta"):
        raise ValueError("peta bahaya kosong")
    return d


def tahun_akhir_data(dibi):
    """Tahun terakhir di dibi_kab_tahun.json (bukan tahun WIB - 1: data bisa tertinggal)."""
    return max(b[1] for b in dibi)


def komponen(terpapar, ikd, dibi, tahun_akhir):
    """Nilai asli tiga komponen per kab, plus tahun longsor per kab."""
    jendela = range(tahun_akhir - 4, tahun_akhir + 1)
    pernah, kej, longsor = set(), {}, {}
    for b in dibi:
        k, th, jenis, n = b[0], b[1], b[2], b[3]
        pernah.add(k)
        if th in jendela:
            kej[k] = kej.get(k, 0) + (n or 0)
            if jenis == "longsor" and n:
                longsor.setdefault(k, set()).add(th)
    risiko = {}
    for k, v in terpapar.items():
        t = [h[2] for h in (v.get("h") or {}).values() if h and h[2] is not None]
        risiko[k] = max(t) if t else None
    celah = {k: (None if v.get("c") is None else 1 - v["c"]) for k, v in ikd.items()}
    kejadian = {k: (kej.get(k, 0) if k in pernah else None) for k in set(terpapar) | set(ikd)}
    return {"risiko": risiko, "celah_kapasitas": celah, "kejadian": kejadian}, longsor


def kegiatan(k, H, p_bahaya, longsor_tahun, peta):
    """1 sampai 3 kode kegiatan urut persentil bahaya; [] bila tidak ada bahaya terpetakan dengan H > 0."""
    calon = {}
    for bahaya, daftar in peta["peta"].items():
        if (H.get(bahaya) or 0) <= 0 or k not in p_bahaya.get(bahaya, {}):
            continue
        for kode in daftar:
            calon[kode] = max(calon.get(kode, -1), p_bahaya[bahaya][k])
    for s in peta.get("bersyarat") or []:
        b = s["bahaya"]
        if (H.get(b) or 0) > 0 and k in p_bahaya.get(b, {}) and len(longsor_tahun) >= s["tahun_min"]:
            calon[s["kode"]] = max(calon.get(s["kode"], -1), p_bahaya[b][k])
    return [kode for kode, _ in sorted(calon.items(), key=lambda x: (-x[1], x[0]))][:MAKS_KEGIATAN]


def hitung(terpapar, ikd, hvc, dibi, tahun_akhir, peta):
    nilai, longsor = komponen(terpapar, ikd, dibi, tahun_akhir)
    s = skor.skor({j: {"tipe": "persentil", "nilai": v, "arah": 1} for j, v in nilai.items()}, BOBOT)
    ada = sorted(x["skor"] for x in s.values() if x["skor"] is not None)
    p75 = statistics.quantiles(ada, n=4, method="inclusive")[2] if len(ada) >= 2 else None
    bahaya = sorted(peta["peta"])
    p_bahaya = {b: skor.persentil({k: ((hvc.get(k) or {}).get("H") or {}).get(b) for k in hvc
                                   if (((hvc.get(k) or {}).get("H") or {}).get(b) or 0) > 0}) for b in bahaya}
    baris = []
    for k in skor.urut(s):
        x = s[k]
        atas = x["skor"] is not None and p75 is not None and x["skor"] >= p75
        H = (hvc.get(k) or {}).get("H") or {}
        keg = kegiatan(k, H, p_bahaya, longsor.get(k, set()), peta) if atas else []
        baris.append({"kab": k, "skor": x["skor"], "catatan": x["catatan"], "kuartil_atas": atas,
                      "rinci": {j: r.get("p") for j, r in x["rinci"].items()}, "hilang": x["hilang"],
                      "bahaya_utama": max((b for b in bahaya if (H.get(b) or 0) > 0), key=lambda b: H[b], default=None),
                      "kegiatan": keg, "longsor_tahun": len(longsor.get(k, set())),
                      "kejadian_kode_wilayah": nilai["kejadian"].get(k) is None})
    return baris, p75


def _kartu(baris, p75, peta, nama):
    atas = [b for b in baris if b["kuartil_atas"]]
    keg = peta["kegiatan"]
    isi = [{"no": i + 1, "kab": nama.get(b["kab"], b["kab"]), "skor": b["skor"], "bahaya": b["bahaya_utama"] or "belum ada data",
            "kegiatan": "; ".join(f"{c} {keg[c]}" for c in b["kegiatan"]) or "tidak ada kegiatan terpetakan",
            "catatan": KODE_WILAYAH if b["kejadian_kode_wilayah"] else None}
           for i, b in enumerate(atas)]
    return rapor.kartu(
        id="mt2-mitigasi", sistem="MT-2", pil="Mitigasi", ikon="peta", judul="Urutan skor mitigasi, usulan analis",
        angka=[{"k": "kuartil_atas", "label": "Kab/kota kuartil atas skor (hipotesis)", "nilai": len(atas), "title": STATUS_UJI},
               {"k": "p75", "label": "Batas kuartil atas skor", "nilai": p75, "desimal": 3},
               {"k": "data_kurang", "label": "Kab/kota data kurang", "nilai": sum(b["skor"] is None for b in baris)},
               {"k": "tanpa_kegiatan", "label": "Kuartil atas tanpa kegiatan terpetakan", "nilai": sum(not b["kegiatan"] for b in atas)},
               {"k": "kode_wilayah", "label": "Kab/kota tanpa catatan kejadian DIBI", "nilai": sum(b["kejadian_kode_wilayah"] for b in baris),
                "title": "kab tanpa satu pun baris DIBI 2015-2025 (bukan nol kejadian); skor dihitung dari risiko dan celah kapasitas saja"},
               {"k": "kode_wilayah_atas", "label": "Di antaranya di kuartil atas", "nilai": sum(b["kejadian_kode_wilayah"] for b in atas)}],
        kolom=[{"k": "no", "label": "No", "angka": True}, {"k": "kab", "label": "Kab/kota"},
               {"k": "skor", "label": "Skor MB-4", "title": "Rata-rata geometrik persentil risiko, celah kapasitas, kejadian; bobot sama rata (asumsi); " + STATUS_UJI, "angka": True, "desimal": 3},
               {"k": "bahaya", "label": "Bahaya utama", "title": "H terbesar di antara bahaya yang terpetakan ke kegiatan (risiko_hvc.json)"},
               {"k": "kegiatan", "label": "Kegiatan 02.01.xx", "title": "1 sampai 3 kegiatan Dana Bersama prabencana, urut persentil bahaya; " + LABEL_WAJIB},
               {"k": "catatan", "label": "Catatan", "title": "Komponen yang tidak ada untuk kab ini"}],
        baris=isi, rumus="S = prod q_j^(w_j / W), q = maks(persentil, 0,01); kuartil atas S >= persentil 75",
        sumber=["terpapar", "ikd", "dibi_kab_tahun", "risiko_hvc", "mitigasi_peta"], label=["proksi", "hitungan_kita"], asumsi=ASUMSI)


def bangun(docs, peta, nama, tahun_akhir):
    t, i, h, d = docs["terpapar"], docs["ikd"], docs["risiko_hvc"], docs["dibi_kab_tahun"]
    baris, p75 = hitung(t["kab"], i["kab"], h["kab"], d["baris"], tahun_akhir, peta)
    sumber = [{"nama": f"{n}.json", "url": f"repo:public/data/bnpb/{n}.json", "diambil": docs[n]["dibuat"][:10],
               "lisensi": docs[n].get("lisensi", "tidak tertulis")[:200]} for n in ("terpapar", "ikd", "risiko_hvc", "dibi_kab_tahun")]
    b = rapor.berkas([_kartu(baris, p75, peta, nama)], sumber)
    with open(KRITERIA, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    b["data"] = {"label_wajib": LABEL_WAJIB, "hipotesis": True,
                 "uji_balik": {"kriteria_sha": sha, "metrik": None, "pembanding": None, "lulus": None, "status": STATUS_UJI},
                 "bobot": BOBOT, "komponen": sorted(BOBOT), "jendela_kejadian": [tahun_akhir - 4, tahun_akhir],
                 "p75": p75, "kegiatan": peta["kegiatan"], "kab": baris}
    return b


def _docs():
    return {n: _muat(os.path.join(DATA, n + ".json")) for n in ("terpapar", "ikd", "risiko_hvc", "dibi_kab_tahun")}


def _nama():
    return {k: v["nama"] for k, v in _muat(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json")).items()}


def jalan():
    return {"mitigasi_prioritas": bangun(d := _docs(), muat_peta(), _nama(), tahun_akhir_data(d["dibi_kab_tahun"]["baris"]))}


def _tolak(p):
    try:
        muat_peta(p)
    except ValueError:
        return
    raise AssertionError(f"peta salah tidak ditolak: {p}")


def cek():
    peta = muat_peta()
    # kegiatan tanpa kode ditolak
    _tolak({"kegiatan": {"Relokasi": "Relokasi"}, "peta": {"longsor": ["Relokasi"]}})
    _tolak({"kegiatan": {"02.01.10": "Penataan bangunan"}, "peta": {"longsor": ["02.01.99"]}})
    _tolak({"kegiatan": {"02.01.10": ""}, "peta": {"longsor": ["02.01.10"]}})
    _tolak({"kegiatan": {"02.01.10": "x"}, "peta": {"longsor": []}})
    _tolak({"kegiatan": {"02.01.10": "x"}, "peta": {}})
    # tiruan: 4 kab, kuartil atas, kegiatan bersyarat, None bukan 0
    hvc = {"1101": {"H": {"banjir": 0.9, "longsor": 0.2, "abrasi": 0}}, "1102": {"H": {"banjir": 0.1, "longsor": 0.9, "abrasi": 0.5}},
           "1103": {"H": {"banjir": 0.5, "longsor": 0.5, "abrasi": 0}}, "1104": {"H": {"banjir": 0, "longsor": 0, "abrasi": 0}}}
    pb = {b: skor.persentil({k: v["H"][b] for k, v in hvc.items() if v["H"][b] > 0}) for b in ("banjir", "longsor", "abrasi")}
    assert kegiatan("1101", hvc["1101"]["H"], pb, set(), peta) == ["02.01.07", "02.01.09", "02.01.10"]
    assert kegiatan("1102", hvc["1102"]["H"], pb, {2022, 2024}, peta)[0] in ("02.01.10", "02.01.11")
    assert "02.01.11" in kegiatan("1102", hvc["1102"]["H"], pb, {2022, 2024}, peta)
    assert "02.01.11" not in kegiatan("1102", hvc["1102"]["H"], pb, {2022}, peta)
    assert kegiatan("1104", hvc["1104"]["H"], pb, set(), peta) == []
    for k in hvc:
        assert 0 <= len(kegiatan(k, hvc[k]["H"], pb, {2021, 2022, 2023}, peta)) <= MAKS_KEGIATAN
    tp = {k: {"h": {"banjir": [0, 0, x, 0]}} for k, x in zip(hvc, (10, 400, 300, 5))}
    ik = {k: {"c": c} for k, c in zip(hvc, (0.2, 0.3, 0.6, 0.7))}
    dibi = [["1101", 2023, "banjir", 3, 0, 0, 0, 0, 0], ["1102", 2022, "longsor", 1, 0, 0, 0, 0, 0],
            ["1102", 2024, "longsor", 2, 0, 0, 0, 0, 0], ["1103", 2016, "banjir", 9, 0, 0, 0, 0, 0]]
    nilai, ls = komponen(tp, ik, dibi, 2025)
    assert nilai["kejadian"] == {"1101": 3, "1102": 3, "1103": 0, "1104": None}, nilai["kejadian"]  # 1103 pernah: 0; 1104 tak pernah: None
    assert ls == {"1102": {2022, 2024}}
    baris, p75 = hitung(tp, ik, hvc, dibi, 2025, peta)
    atas = [b["kab"] for b in baris if b["kuartil_atas"]]
    assert atas and all(b["skor"] >= p75 for b in baris if b["kuartil_atas"]), (atas, p75)
    assert all(not b["kegiatan"] for b in baris if not b["kuartil_atas"])
    # data nyata
    nama = _nama()
    docs = _docs()
    b = bangun(docs, peta, nama, tahun_akhir_data(docs["dibi_kab_tahun"]["baris"]))
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    d = b["data"]
    assert len(d["kab"]) == 514 and len({x["kab"] for x in d["kab"]}) == 514
    atas = [x for x in d["kab"] if x["kuartil_atas"]]
    assert all(1 <= len(x["kegiatan"]) <= 3 or not x["bahaya_utama"] for x in atas)
    assert all(KODE.match(c) for x in atas for c in x["kegiatan"])
    k = b["kartu"][0]
    assert "usulan analis" in k["judul"] and "prioritas" not in json.dumps(k, ensure_ascii=False).lower()
    teks = json.dumps(b, ensure_ascii=False)
    assert not re.search(r"\baman\b", teks, re.I) and "·" not in teks
    assert k["asumsi"] == ASUMSI and d["uji_balik"]["kriteria_sha"] and d["uji_balik"]["lulus"] is None
    kw = [x for x in d["kab"] if x["kejadian_kode_wilayah"]]
    assert kw and all("kejadian" in x["hilang"] for x in kw)
    assert docs["dibi_kab_tahun"].get("kode") == "kemendagri" and len(kw) <= 3, [x["kab"] for x in kw]   # kode BPS mentah = 35 kab
    sel = {x["kab"]: x["catatan"] for x in k["baris"]}
    assert all(sel[nama.get(x["kab"], x["kab"])] == KODE_WILAYAH for x in kw if x["kuartil_atas"])
    assert tahun_akhir_data(dibi) == 2024 and d["jendela_kejadian"][1] == tahun_akhir_data(docs["dibi_kab_tahun"]["baris"])
    kr = _muat(KRITERIA)
    assert kr["bobot"] == BOBOT, "bobot skrip berubah tanpa mengunci kriteria baru"
    print(f"mt2.py --cek: lulus ({len(atas)} kab kuartil atas dari {sum(x['skor'] is not None for x in d['kab'])} berskor, hipotesis)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
