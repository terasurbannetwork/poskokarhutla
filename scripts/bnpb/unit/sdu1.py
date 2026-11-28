"""SDU-1 Rapor tata kelola pengadaan dari SIRUP (DESAIN-TEKNIS sec 6.26; ALGORITMA sec 7.6; tiket RU-071).

Langkah jalan.py (bulanan; keluaran unit/pengadaan.json, kelas T: hanya staf lewat sesi, bukan akun gerbang). Masukan RUP BNPB jalur penyedia per tahun
(sirup.py; cache docs/pendanaan/cache). Per tahun anggaran:
  porsi_triwulan1    paket dengan bulan pemilihan Januari sampai Maret / jumlah paket penyedia
  porsi_epurchasing  pagu metode E-Purchasing / pagu penyedia
  porsi_pdn, porsi_umk  pagu paket isPDN (isUMK) benar / pagu penyedia
  porsi_penl         pagu Penunjukan Langsung / pagu penyedia
  kandidat konsolidasi  kelompok nama paket ternormal (huruf kecil; tanpa angka, nama bulan, nama wilayah, tanda baca) dengan >= 3 paket Pengadaan Langsung
                     atau Penunjukan Langsung dalam setahun DAN jumlah pagu kelompok > ambang PL
Ambang PL Rp200 juta adalah ASUMSI: belum dicek ke Perpres Pengadaan Barang/Jasa yang berlaku (DT 6.26); tidak ada kunci Jam Aturan untuknya
(public/inti/jam_aturan.json milik inti-layar; usulan kunci `ambang_penunjukan_langsung`, jenis standar, asumsi: true). Bahasa: "kandidat konsolidasi",
bukan tuduhan; kata tuduhan KEAMANAN-PRIVASI 9.3 tidak dipakai (dijaga gerbang-ruang-unit butir d). Tanpa nama penyedia (sumber memang tidak memuatnya). RUP adalah rencana, bukan realisasi.
Probe SPSE BNPB (https://spse.inaproc.id/bnpb, 26 Nov 2026): beranda terbaca (200) tetapi daftar paket tender dimuat lewat DataTables AJAX (dt/lelang),
bukan HTML statis; tidak diurai. Lanjut dengan SIRUP saja; `data.spse` mencatat itu. Hitung ulang riset/6 S1: e-Purchasing 2025 = 43,2% pagu penyedia.

  python3 -I scripts/bnpb/unit/sdu1.py --cek
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402
import sirup  # noqa: E402

AKAR = sirup.AKAR
AMBANG_PL = 200_000_000     # rupiah, asumsi (lihat kepala berkas)
MIN_PAKET = 3
METODE_PL = ("penunjukan langsung", "pengadaan langsung")
BULAN = "januari februari maret april mei juni juli agustus september oktober november desember januari februari maret april juni juli agustus september oktober november desember jan feb mar apr jun jul agu agt sep okt nov des dec aug".split()
SPSE = {"terbaca": False, "tanggal": "2026-11-26", "alasan": "beranda terbaca, daftar paket tender dimuat lewat AJAX (dt/lelang) dan tidak diurai; hanya SIRUP dipakai"}
ASUMSI = ["Asumsi: ambang PL Rp200 juta belum dicek", "Asumsi: bulan pemilihan = bulan RUP"]
KATA_TERLARANG = re.compile(r"pemecahan|memecah|dipecah", re.I)


def _wilayah(kode_json, situs):
    n = {re.sub(r"^(Kab\.|Kota)\s+(Administrasi\s+)?", "", v["nama"]).lower() for v in kode_json.values()} | {s["nama"].lower() for s in situs}
    n = sorted((x for x in n if len(x) >= 4), key=len, reverse=True)
    return re.compile(r"\b(?:" + "|".join(re.escape(x) for x in n) + r")\b") if n else None


def normal(nama, wilayah=None):
    t = (nama or "").lower()
    if wilayah:
        t = wilayah.sub(" ", t)
    t = re.sub(r"\d+", " ", t)
    t = re.sub(r"[^a-z ]", " ", t)
    return " ".join(w for w in t.split() if w not in BULAN)


def _porsi(bagian, total):
    return None if not total else bagian / total


def tahunan(daftar, wilayah=None, ambang=AMBANG_PL):
    """Hitung satu tahun dari daftar paket penyedia. Pagu kosong dilewati dan dihitung; pembagi nol -> None, bukan 0."""
    sah = [x for x in daftar if isinstance(x.get("pagu"), (int, float)) and not isinstance(x["pagu"], bool) and x["pagu"] >= 0]
    pagu = sum(x["pagu"] for x in sah)
    metode = lambda x: (x.get("metode") or "").strip().lower()
    jan_mar = sum(1 for x in sah if x.get("idBulan") in (1, 2, 3))
    kel = {}
    for x in sah:
        if metode(x) in METODE_PL:
            k = normal(x.get("paket"), wilayah)
            if k:
                g = kel.setdefault(k, [0, 0.0]); g[0] += 1; g[1] += x["pagu"]
    kandidat = sorted(((k, n, p) for k, (n, p) in kel.items() if n >= MIN_PAKET and p > ambang), key=lambda t: (-t[2], t[0]))
    return {"paket": len(sah), "paket_tanpa_pagu": len(daftar) - len(sah), "pagu": pagu,
            "porsi_triwulan1": _porsi(jan_mar, len(sah)),
            "porsi_epurchasing": _porsi(sum(x["pagu"] for x in sah if metode(x) == "e-purchasing"), pagu),
            "porsi_pdn": _porsi(sum(x["pagu"] for x in sah if x.get("isPDN") is True), pagu),
            "porsi_umk": _porsi(sum(x["pagu"] for x in sah if x.get("isUMK") is True), pagu),
            "porsi_penl": _porsi(sum(x["pagu"] for x in sah if metode(x) == "penunjukan langsung"), pagu),
            "kandidat": [{"kelompok": k, "paket": n, "pagu": p} for k, n, p in kandidat]}


def bangun(per_tahun, hari):
    """per_tahun = {tahun: hasil tahunan()}."""
    th = sorted(per_tahun)
    pct = lambda x: None if x is None else x * 100
    baris = [{"tahun": str(t), "paket": per_tahun[t]["paket"], "pagu": per_tahun[t]["pagu"] / 1e6, "tw1": pct(per_tahun[t]["porsi_triwulan1"]),
              "epur": pct(per_tahun[t]["porsi_epurchasing"]), "pdn": pct(per_tahun[t]["porsi_pdn"]), "umk": pct(per_tahun[t]["porsi_umk"]),
              "penl": pct(per_tahun[t]["porsi_penl"]), "kandidat": len(per_tahun[t]["kandidat"])} for t in th]
    kini = per_tahun[th[-1]]
    kartu = rapor.kartu(
        id="sdu1-pengadaan", sistem="SDU-1", pil="Tata kelola pengadaan", ikon="timbang", judul="Rapor tata kelola pengadaan BNPB",
        angka=[{"k": "tahun", "label": "Tahun anggaran terbaru", "nilai": th[-1], "desimal": 0, "title": "RUP adalah rencana, bukan realisasi; tahun berjalan masih berubah"},
               {"k": "paket", "label": "Paket penyedia pada tahun itu", "nilai": kini["paket"], "desimal": 0},
               {"k": "epur", "label": "Porsi pagu e-Purchasing, persen", "nilai": pct(kini["porsi_epurchasing"]), "desimal": 1},
               {"k": "kandidat", "label": "Kandidat konsolidasi pada tahun itu", "nilai": len(kini["kandidat"]), "desimal": 0,
                "title": "kelompok nama paket dengan sedikitnya 3 paket Pengadaan atau Penunjukan Langsung dan jumlah pagu di atas ambang Rp200 juta (asumsi); bahan telaah, bukan temuan"}],
        kolom=[{"k": "tahun", "label": "Tahun anggaran"}, {"k": "paket", "label": "Paket penyedia", "angka": True, "desimal": 0},
               {"k": "pagu", "label": "Pagu, juta rupiah", "angka": True, "desimal": 0},
               {"k": "tw1", "label": "Bulan pemilihan Januari sampai Maret, persen paket", "angka": True, "desimal": 1, "title": "paket dengan bulan pemilihan Januari sampai Maret dibagi jumlah paket penyedia"},
               {"k": "epur", "label": "e-Purchasing, persen pagu", "angka": True, "desimal": 1}, {"k": "pdn", "label": "Produk dalam negeri, persen pagu", "angka": True, "desimal": 1},
               {"k": "umk", "label": "Usaha mikro dan kecil, persen pagu", "angka": True, "desimal": 1},
               {"k": "penl", "label": "Penunjukan Langsung, persen pagu", "angka": True, "desimal": 1},
               {"k": "kandidat", "label": "Kandidat konsolidasi", "angka": True, "desimal": 0, "title": "kelompok nama paket; bahan telaah, bukan temuan"}],
        baris=baris,
        rumus="porsi = pagu (atau jumlah paket untuk triwulan 1) kelompok dibagi total jalur penyedia; kandidat konsolidasi = nama paket ternormal dengan sedikitnya 3 paket Pengadaan atau Penunjukan Langsung dan pagu di atas ambang",
        sumber=["sirup_bnpb"], label=["resmi", "hitungan_kita"], asumsi=ASUMSI)
    sumber = [{"nama": f"RUP SiRUP BNPB jalur penyedia {t}", "url": "repo:docs/pendanaan/cache", "diambil": hari, "lisensi": "informasi publik SiRUP LKPP"} for t in th]
    b = rapor.berkas([kartu], sumber)
    b["data"] = {"rup_rencana_bukan_realisasi": True, "ambang_pl": {"rupiah": AMBANG_PL, "asumsi": True}, "spse": SPSE,
                 "tahun": {str(t): {**{k: v for k, v in per_tahun[t].items() if k != "kandidat"},
                                    "kandidat": [{"kelompok": g["kelompok"], "paket": g["paket"], "pagu_juta": g["pagu"] / 1e6} for g in per_tahun[t]["kandidat"][:10]],
                                    "kandidat_jumlah": len(per_tahun[t]["kandidat"])} for t in th}}
    return b


def jalan():
    kode = json.load(open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8"))
    situs = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "jdih_situs.json"), encoding="utf-8"))
    wil = _wilayah(kode, situs)
    ada = sorted(int(m.group(1)) for f in os.listdir(sirup.CACHE) if (m := re.fullmatch(r"penyedia-BNPB-(\d{4})\.json", f)))
    hari = (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()
    return {"pengadaan": bangun({t: tahunan(sirup.paket(t, "penyedia"), wil) for t in ada}, hari)}


def cek():
    P = lambda pagu, metode, bulan=1, paket="Belanja Bahan", pdn=False, umk=False: {"pagu": pagu, "metode": metode, "idBulan": bulan, "paket": paket, "isPDN": pdn, "isUMK": umk}
    wil = _wilayah({"1": {"nama": "Kab. Bogor"}, "2": {"nama": "Kota Administrasi Jakarta Timur"}}, [{"nama": "Jawa Barat"}])
    # normal: huruf kecil, tanpa angka, bulan, wilayah, tanda baca
    assert normal("Belanja BAHAN 2025 Januari (Jawa Barat) Bogor", wil) == "belanja bahan" and normal("Paket-Meeting #3, Jakarta Timur", wil) == "paket meeting" and normal(None) == ""
    # satu tahun, angka tangan: pagu 1000, e-Purchasing 400 (40%), PenL 100, PDN 250, UMK 500; 4 paket, 3 di Jan-Mar
    d = [P(400, "E-Purchasing", 2), P(100, "Penunjukan Langsung", 1, "Penginapan 1"), P(300, "Tender", 5, "Jasa X", pdn=True), P(200, "Pengadaan Langsung", 3, "Penginapan 2", pdn=True, umk=True)]
    d.append(P(0, "Pengadaan Langsung", 3, "Penginapan 3", umk=True))
    r = tahunan(d, None, ambang=250)
    assert (r["paket"], r["pagu"]) == (5, 1000) and r["porsi_epurchasing"] == 0.4 and r["porsi_penl"] == 0.1 and r["porsi_pdn"] == 0.5 and r["porsi_umk"] == 0.2
    assert r["porsi_triwulan1"] == 0.8, "4 dari 5 paket diumumkan Januari sampai Maret"
    assert r["kandidat"] == [{"kelompok": "penginapan", "paket": 3, "pagu": 300.0}], "tiga paket PL dan PenL satu kelompok, pagu 300 > ambang 250"
    assert tahunan(d, None, ambang=300)["kandidat"] == [], "pagu tepat di ambang bukan di atas"
    assert tahunan(d[:3] + [d[3]], None, ambang=0)["kandidat"] == [], "dua paket kurang dari 3"
    assert tahunan([P(10, "Tender", paket="Penginapan 1"), P(10, "Tender", paket="Penginapan 2"), P(10, "Tender", paket="Penginapan 3")], None, 0)["kandidat"] == [], "hanya PL atau PenL"
    # pagu kosong dilewati dan dihitung; semua kosong: porsi None bukan 0
    r = tahunan([P(None, "E-Purchasing"), {"metode": "Tender"}])
    assert r["paket"] == 0 and r["paket_tanpa_pagu"] == 2 and r["porsi_epurchasing"] is None and r["porsi_triwulan1"] is None and tahunan([])["porsi_penl"] is None
    # data nyata: 2025 e-Purchasing 43,2% (riset/6 S1), PenL Rp30,7 M, 1.439 paket
    kode = json.load(open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8"))
    situs = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "jdih_situs.json"), encoding="utf-8"))
    n25 = tahunan(sirup.paket(2025, "penyedia"), _wilayah(kode, situs))
    assert n25["paket"] == 1439 and round(n25["porsi_epurchasing"] * 100, 1) == 43.2, n25["porsi_epurchasing"]
    assert round(n25["porsi_penl"] * n25["pagu"] / 1e9, 1) == 30.7 and n25["kandidat"]
    b = jalan()["pengadaan"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    s = json.dumps(b, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I) and not KATA_TERLARANG.search(s), "kata pemecahan paket atau titik tengah muncul"
    assert "kandidat konsolidasi" in s.lower() and b["data"]["spse"]["terbaca"] is False and b["data"]["ambang_pl"]["asumsi"] is True
    assert {"2024", "2025", "2026"} <= set(b["data"]["tahun"]) and any(x["tahun"] == "2025" and round(x["epur"], 1) == 43.2 for x in b["kartu"][0]["baris"])
    assert b["kartu"][0]["asumsi"] == ASUMSI
    for t in b["data"]["tahun"].values():
        assert all(set(g) == {"kelompok", "paket", "pagu_juta"} for g in t["kandidat"]), "kelompok hanya nama paket ternormal, tanpa kolom lain (tanpa penyedia)"
    print(f"sdu1.py --cek: lulus (2025: {n25['paket']} paket, e-Purchasing {n25['porsi_epurchasing'] * 100:.1f}%, {len(n25['kandidat'])} kandidat konsolidasi; SPSE tidak diurai)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
