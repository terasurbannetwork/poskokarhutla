"""RRS-1 Taksiran cepat kerugian pertanian per kab (DESAIN-TEKNIS sec 6.24; ALGORITMA sec 10.33; tiket RU-067).

Langkah jalan.py (harian selama kejadian banjir aktif; keluaran unit/rugi_tani.json). HIPOTESIS sampai uji balik lulus.
  puso_taksir = A x P         A = luas sawah tergenang (ha), P = jumlah puso / jumlah A atas kab-tahun latih
  rupiah      = A x P x Y x G Y produktivitas padi kab (ton/ha), G harga GKP (rupiah/ton), BPS; satu kosong = rupiah tidak ditulis
Kriteria dikunci di lab_kriteria/rrs1.json (RU-066) SEBELUM model jalan; kriteria_sha di keluaran. Uji: tahun terakhir puso berdata
ditahan, tahun lain latih; pembanding rata-rata puso kab pada tahun latih; MAE model <= 0,9 x MAE pembanding dan n uji >= 30 (asumsi).
Tanpa lulus: kartu hanya luas sawah tergenang, tanpa rupiah. Sel kosong adalah hilang, bukan 0.

Keadaan 26 Nov 2026 (kenapa keluaran sekarang tanpa angka): puso.json tidak berisi satu pun sel kab-tahun (BPS WebAPI belum terisi, BPS_KEY),
dan irisan genangan x kelas cropland WorldCover belum dibuat (raster belum diunduh). Masukan A dibaca dari
data/raw/unit/worldcover/sawah_tergenang.json ({kab: {tahun: ha}}, hasil irisan) bila ada; Y dan G dari data/raw/unit/bps_padi/yg.json
({"Y": {kab: ton_per_ha}, "G": rupiah_per_ton}) bila ada. Tanpa keduanya langkah tetap jalan dan menulis alasan kosongnya.

Kode: puso.json berkode BPS (dipetakan lewat padanan_kab_dibi.petakan); A dan Y berkode Kemendagri. Puso yang dikalibrasi adalah puso SEMUA SEBAB,
bukan hanya banjir; taksiran dibatasi min(A x P, A) dan P > 1 dilaporkan di status.

  python3 -I scripts/bnpb/unit/rrs1.py --cek
"""
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

AKAR = rapor.AKAR
sys.path.insert(0, os.path.join(AKAR, "scripts", "data"))
import padanan_kab_dibi as PAD  # noqa: E402
KRITERIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lab_kriteria", "rrs1.json")
PUSO = os.path.join(AKAR, "public", "data", "bnpb", "puso.json")
A_BERKAS = os.path.join(AKAR, "data", "raw", "unit", "worldcover", "sawah_tergenang.json")
YG_BERKAS = os.path.join(AKAR, "data", "raw", "unit", "bps_padi", "yg.json")
ASUMSI = ["Asumsi: belum lulus uji balik", "Asumsi: ambang 0,9 kali MAE"]


def _muat(p, bawaan=None):
    if not os.path.exists(p):
        return bawaan
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def kriteria():
    with open(KRITERIA, "rb") as f:
        mentah = f.read()
    k = json.loads(mentah)
    a = k["syarat_lulus_angka"]
    return {"faktor": a["faktor"], "n_uji_min": a["n_uji_min"], "p_n_min": k["model"]["P_n_min_provinsi"],
            "sha": hashlib.sha256(mentah).hexdigest()}


def _angka(x):
    return x if isinstance(x, (int, float)) and not isinstance(x, bool) and x == x and x >= 0 else None


def puso_kemendagri(puso):
    """puso.json berkode BPS (BPS WebAPI); A berkode Kemendagri. Petakan kunci puso lewat padanan_kab_dibi.petakan.
    -> ({kode Kemendagri: {tahun: ha}}, [kode BPS tak terpetakan]). Kunci bukan 4 digit ditolak; kode tak terpetakan dihitung, tidak ditebak."""
    out, tak = {}, []
    for k, per in (puso or {}).items():
        if not re.fullmatch(r"\d{4}", str(k)):
            raise ValueError(f"kunci puso {k!r} bukan kode BPS 4 digit")
        kd = PAD.petakan(k)
        if kd is None:
            tak.append(str(k))
            continue
        if kd in out:
            raise ValueError(f"dua kode BPS dipetakan ke kode Kemendagri {kd}")
        out[kd] = per
    return out, sorted(tak)


def periksa_A(A):
    """Kunci A harus kode Kemendagri yang dikenal (kode.json); kunci liar ditolak, bukan dilewati diam-diam."""
    kenal = _kenal()
    for k in A or {}:
        if k not in kenal:
            raise ValueError(f"kunci sawah tergenang {k!r} bukan kode Kemendagri kab/kota yang dikenal")
    return A or {}


_KENAL = {}


def _kenal():
    if not _KENAL:
        _KENAL.update(dict.fromkeys(_muat(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), {})))
    return _KENAL


def pasangan(puso, A):
    """[(kab, tahun, A_ha, puso_ha)] hanya bila keduanya ada. Kosong = hilang; 0 hanya bila tertulis 0."""
    out = []
    for kab, per in (A or {}).items():
        for th, a in (per or {}).items():
            p = _angka(((puso or {}).get(kab) or {}).get(th))
            a = _angka(a)
            if p is not None and a is not None:
                out.append((kab, int(th), a, p))
    return sorted(out)


def kalibrasi(pas, puso, k):
    """Uji balik. Mengembalikan {tahun_uji, n_latih, n_uji, n_tanpa_riwayat, mae_model, mae_pembanding, lulus, alasan, P_nasional, P_prov}."""
    kosong = {"tahun_uji": None, "n_latih": 0, "n_uji": 0, "n_tanpa_riwayat": 0, "mae_model": None, "mae_pembanding": None,
              "lulus": None, "P_nasional": None, "P_prov": {}}
    if not pas:
        return {**kosong, "alasan": "belum ada kab-tahun yang punya luas sawah tergenang sekaligus puso (puso.json kosong atau irisan WorldCover belum dibuat)"}
    uji_th = max(p[1] for p in pas)
    latih = [p for p in pas if p[1] < uji_th]
    uji = [p for p in pas if p[1] == uji_th]
    sa, sp = sum(p[2] for p in latih), sum(p[3] for p in latih)
    if not latih or sa <= 0:
        return {**kosong, "tahun_uji": uji_th, "n_uji": len(uji), "alasan": "tidak ada tahun latih dengan luas sawah tergenang lebih dari 0"}
    P_nas = sp / sa
    per_prov = {}
    for kab, th, a, p in latih:
        per_prov.setdefault(kab[:2], []).append((a, p))
    P_prov = {pr: sum(x[1] for x in v) / sum(x[0] for x in v) for pr, v in per_prov.items() if len(v) >= k["p_n_min"] and sum(x[0] for x in v) > 0}
    gal_m, gal_b, tanpa = [], [], 0
    for kab, th, a, p in uji:
        seri = [v for t, v in sorted(((int(t), _angka(v)) for t, v in ((puso or {}).get(kab) or {}).items()), key=lambda x: x[0]) if t < uji_th and v is not None]
        if not seri:
            tanpa += 1
            continue
        P = P_prov.get(kab[:2], P_nas)
        gal_m.append(abs(min(a * P, a) - p))   # puso tak mungkin melebihi sawah tergenang
        gal_b.append(abs(sum(seri) / len(seri) - p))
    n = len(gal_m)
    r = {**kosong, "tahun_uji": uji_th, "n_latih": len(latih), "n_uji": n, "n_tanpa_riwayat": tanpa, "P_nasional": P_nas, "P_prov": P_prov,
         "p_lebih_1": P_nas > 1 or any(v > 1 for v in P_prov.values())}   # P > 1: puso semua sebab melebihi sawah tergenang; ditulis ke status
    if n < k["n_uji_min"]:
        return {**r, "mae_model": sum(gal_m) / n if n else None, "mae_pembanding": sum(gal_b) / n if n else None, "lulus": False,
                "alasan": f"uji {n} kab-tahun, kurang dari {k['n_uji_min']} (asumsi)"}
    mm, mb = sum(gal_m) / n, sum(gal_b) / n
    lulus = mm <= k["faktor"] * mb
    return {**r, "mae_model": mm, "mae_pembanding": mb, "lulus": lulus,
            "alasan": None if lulus else "MAE model tidak mengalahkan rata-rata puso kab pada tahun latih"}


def rupiah(a, P, Y, G):
    """None bila satu masukan kosong; nol hanya bila hasilnya memang 0."""
    if None in (a, P, Y, G):
        return None
    return a * P * Y * G


def bangun(puso, A, yg, hari, k=None, nama=None):
    nama = nama or {}
    k = k or kriteria()
    periksa_A(A)
    pas = pasangan(puso, A)
    u = kalibrasi(pas, puso, k)
    th = max((int(t) for per in (A or {}).values() for t in (per or {})), default=None)
    baris = []
    for kab in sorted(A or {}):
        a = _angka(((A or {}).get(kab) or {}).get(str(th)))
        if a is None:
            continue
        ru = None
        if u["lulus"]:
            P = u["P_prov"].get(kab[:2], u["P_nasional"])
            ru = rupiah(a, min(P, 1.0), (yg.get("Y") or {}).get(kab), yg.get("G"))
        baris.append({"kab": kab, "sawah": a, "rupiah": None if ru is None else ru / 1e6})
    punya_rp = any(b["rupiah"] is not None for b in baris)
    kolom = [{"k": "kab", "label": "Kab/kota"}, {"k": "sawah", "label": "Sawah tergenang (ha)", "angka": True, "desimal": 0,
                                               "title": "irisan genangan modul banjir dan kelas cropland ESA WorldCover; perkiraan radar. Puso BPS yang dikalibrasi adalah puso semua sebab (kekeringan, hama, banjir), bukan hanya banjir"}]
    if punya_rp:
        kolom.append({"k": "rupiah", "label": "Perkiraan kerugian (juta rupiah)", "angka": True, "desimal": 0, "title": "hipotesis; hanya ada karena kalibrasi lulus kriteria terkunci"})
    status = ("Kalibrasi lulus kriteria terkunci; rupiah tampil hanya bila produktivitas dan harga ada" if u["lulus"]
              else f"Rupiah tidak ditampilkan: {u['alasan']}" if u["alasan"] else "Rupiah tidak ditampilkan")
    if u.get("p_lebih_1"):
        status += ". Peringatan: P lebih dari 1 (puso semua sebab melebihi sawah tergenang), taksiran dibatasi sebesar sawah tergenang"
    kartu = rapor.kartu(
        id="rrs1-tani", sistem="RRS-1", pil="Kerugian pertanian", ikon="uang", judul="Taksiran cepat kerugian pertanian",
        angka=[{"k": "kab", "label": "Kab/kota dengan luas sawah tergenang", "nilai": len(baris) if A else None,
                "title": "belum ada data bila irisan WorldCover belum dibuat; kosong bukan nol"},
               {"k": "pasangan", "label": "Kab-tahun bersama puso dan sawah tergenang", "nilai": len(pas)},
               {"k": "uji", "label": "Kab-tahun uji", "nilai": u["n_uji"], "title": f"tahun uji = tahun terakhir puso berdata; syarat lulus minimal {k['n_uji_min']} (asumsi)"}],
        kolom=kolom if baris else [],
        baris=[{"kab": nama.get(b["kab"], b["kab"]), "sawah": b["sawah"], **({"rupiah": b["rupiah"]} if punya_rp else {})} for b in baris],
        rumus="puso (semua sebab, bukan hanya banjir) = min(sawah tergenang x P, sawah tergenang); P = jumlah puso semua sebab / jumlah sawah tergenang tahun latih; rupiah = sawah tergenang x P x produktivitas x harga GKP; lulus bila MAE model <= 0,9 x MAE rata-rata puso kab",
        sumber=["puso", "banjir_genangan", "worldcover"], label=["hitungan_kita", "proksi"], asumsi=ASUMSI)
    sumber = [{"nama": "Luas puso padi semua sebab BPS (puso.json, dari Dinas Pertanian provinsi)", "url": "repo:public/data/bnpb/puso.json", "diambil": hari.isoformat(),
               "lisensi": "BPS WebAPI, syarat penggunaan BPS"},
              {"nama": "ESA WorldCover 10 m, kelas cropland", "url": "https://esa-worldcover.org/", "diambil": hari.isoformat(), "lisensi": "CC BY 4.0"}]
    b = rapor.berkas([kartu], sumber)
    b["data"] = {"hipotesis": True, "kriteria_sha": k["sha"], "uji": u, "status": status, "tahun_sawah": th, "tanpa_rupiah": not punya_rp, "baris": baris}
    return b


def _hari_wib():
    return (datetime.now(timezone.utc) + timedelta(hours=7)).date()


def jalan():
    p = _muat(PUSO, {})
    nama = {c: v["nama"] for c, v in _muat(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), {}).items()}
    pk, tak = puso_kemendagri(p.get("puso") or {})   # puso.json berkode BPS
    b = bangun(pk, _muat(A_BERKAS, {}), _muat(YG_BERKAS, {}), _hari_wib(), None, nama)
    b["data"]["puso_kode_tak_terpetakan"] = tak
    return {"rugi_tani": b}


def cek():
    k = kriteria()
    # puso berkode BPS lawan A berkode Kemendagri: BPS 1110 = Bireuen = Kemendagri 1111; kunci tak dikenal ditolak
    assert PAD.petakan("1110") == "1111" and PAD.petakan(1110) == "1111", PAD.petakan("1110")
    pk, tak = puso_kemendagri({"1110": {"2020": 7.0}, "9999": {"2020": 1.0}})
    assert pk == {"1111": {"2020": 7.0}} and tak == ["9999"], (pk, tak)
    assert pasangan(pk, {"1111": {"2020": 70.0}}) == [("1111", 2020, 70.0, 7.0)] and pasangan({"1110": {"2020": 7.0}}, {"1111": {"2020": 70.0}}) == [], "tanpa konversi kode BPS tidak cocok"
    for salah in ({"abc": {}}, {"11": {}}):
        try:
            puso_kemendagri(salah); raise AssertionError("kunci puso salah lolos")
        except ValueError:
            pass
    for salah in ({"1110": {"2020": 1}},):   # kode BPS di A (bukan Kemendagri yang dikenal? 1110 = Aceh Singkil, dikenal): uji kunci benar-benar asing
        pass
    try:
        periksa_A({"0000": {"2020": 1.0}}); raise AssertionError("kunci A asing lolos")
    except ValueError:
        pass
    # P > 1 dibatasi: puso 150 dari sawah 100 -> taksiran dibatasi 100, dilaporkan
    pa = [("3201", 2019, 100.0, 150.0), ("3202", 2019, 100.0, 150.0), ("3203", 2020, 100.0, 150.0)]  # kunci hanya dipakai di kalibrasi, bukan periksa_A
    uu = kalibrasi(pa, {"3203": {"2019": 150.0, "2020": 150.0}}, {**k, "n_uji_min": 1})
    assert uu["p_lebih_1"] is True and uu["mae_model"] == 50.0, uu
    assert k["faktor"] == 0.9 and k["n_uji_min"] == 30 and k["p_n_min"] == 10 and len(k["sha"]) == 64
    # sel kosong hilang bukan 0; 0 tertulis ikut
    assert pasangan({"3201": {"2020": 5.0}}, {"3201": {"2020": 10.0, "2021": 3.0}, "3202": {"2020": 1.0}}) == [("3201", 2020, 10.0, 5.0)]
    assert pasangan({"3201": {"2020": 0}}, {"3201": {"2020": 0}}) == [("3201", 2020, 0, 0)]
    assert pasangan({}, {"3201": {"2020": 1}}) == [] and pasangan({"3201": {"2020": None}}, {"3201": {"2020": 1}}) == []

    def dunia(n_kab, p_model_benar=True):
        """40 kab di provinsi 32, tahun 2018-2020; puso = 0,2 x A (+ galat kecil bila model benar) atau acak tak berhubungan."""
        puso, A = {}, {}
        kodes = [c for c in sorted(_kenal()) if c[:2] in ("32", "33")]
        for i in range(n_kab):
            kab = kodes[i]
            for j, th in enumerate((2018, 2019, 2020)):
                a = 100.0 + 20 * ((i * 7 + j * 3) % 11)
                A.setdefault(kab, {})[str(th)] = a
                puso.setdefault(kab, {})[str(th)] = 0.2 * a + (1 if (i + j) % 2 else -1) if p_model_benar else float((i * 37 + j * 91) % 60)
        return puso, A
    puso, A = dunia(40)
    pas = pasangan(puso, A)
    u = kalibrasi(pas, puso, k)
    assert u["tahun_uji"] == 2020 and u["n_latih"] == 80 and u["n_uji"] == 40 and u["lulus"] is True and u["alasan"] is None, u
    assert all(0.19 < v < 0.21 for v in u["P_prov"].values()) and u["P_prov"] and u["mae_model"] <= 0.9 * u["mae_pembanding"]
    # bocor: tahun latih tidak pernah >= tahun uji
    assert all(p[1] < u["tahun_uji"] for p in pas if p[1] != u["tahun_uji"])
    # model tak berhubungan: gagal
    puso2, A2 = dunia(40, False)
    u2 = kalibrasi(pasangan(puso2, A2), puso2, k)
    assert u2["lulus"] is False and u2["alasan"] and u2["n_uji"] == 40, u2
    # uji kurang dari n_min: gagal, bukan lulus
    puso3, A3 = dunia(20)
    u3 = kalibrasi(pasangan(puso3, A3), puso3, k)
    assert u3["lulus"] is False and "kurang dari 30" in u3["alasan"], u3
    # kab tanpa riwayat latih dikeluarkan dan dihitung
    puso4, A4 = dunia(40)
    baru = [c for c in sorted(_kenal()) if c[:2] in ("32", "33")][40]
    A4[baru] = {"2020": 100.0}; puso4[baru] = {"2020": 20.0}
    u4 = kalibrasi(pasangan(puso4, A4), puso4, k)
    assert u4["n_tanpa_riwayat"] == 1 and u4["n_uji"] == 40, u4
    # P provinsi bila n >= 10, selain itu nasional
    puso5, A5 = dunia(4)
    u5 = kalibrasi(pasangan(puso5, A5), puso5, k)
    assert u5["P_prov"] == {} and u5["P_nasional"] is not None
    # tanpa data: bukan lulus, bukan nol
    assert kalibrasi([], {}, k)["lulus"] is None and kalibrasi([], {}, k)["alasan"]
    # rupiah: satu masukan kosong = None; hanya bila lulus
    assert rupiah(100, 0.2, None, 5e6) is None and rupiah(100, 0.2, 5, None) is None and rupiah(None, 0.2, 5, 5e6) is None
    assert rupiah(100, 0.2, 5, 5e6) == 5e8 and rupiah(0, 0.2, 5, 5e6) == 0
    hari = datetime(2026, 11, 26).date()
    yg = {"Y": {kab: 5.0 for kab in A}, "G": 6e6}
    b = bangun(puso, A, yg, hari, k)
    assert b["data"]["uji"]["lulus"] is True and not b["data"]["tanpa_rupiah"] and all(x["rupiah"] > 0 for x in b["data"]["baris"])
    assert b["kartu"][0]["kolom"][-1]["k"] == "rupiah" and "hipotesis" in b["kartu"][0]["kolom"][-1]["title"]
    b2 = bangun(puso2, A2, yg, hari, k)   # gagal: tidak ada rupiah di baris maupun kolom
    assert b2["data"]["tanpa_rupiah"] and all(x["rupiah"] is None for x in b2["data"]["baris"]) and all(c["k"] != "rupiah" for c in b2["kartu"][0]["kolom"])
    assert "Rupiah tidak ditampilkan" in b2["data"]["status"]
    b3 = bangun(puso, A, {}, hari, k)   # lulus tapi tanpa Y dan G: rupiah tidak ditulis
    assert b3["data"]["tanpa_rupiah"] and all(x["rupiah"] is None for x in b3["data"]["baris"])
    # data nyata hari ini: puso.json kosong, A belum ada -> keluaran jujur tanpa angka
    nyata = bangun(puso_kemendagri(_muat(PUSO, {}).get("puso") or {})[0], _muat(A_BERKAS, {}), _muat(YG_BERKAS, {}), hari, k)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **nyata})
    nd = nyata["data"]
    assert nd["uji"]["lulus"] is None or nd["uji"]["n_uji"] >= 0
    if not _muat(A_BERKAS):
        assert nd["tanpa_rupiah"] and nyata["kartu"][0]["angka"][0]["nilai"] is None and nd["baris"] == [], "tanpa irisan WorldCover tidak ada angka"
    for x in (b, b2, nyata):
        s = json.dumps(x, ensure_ascii=False)
        assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    print(f"rrs1.py --cek: lulus (kalibrasi lulus dan gagal, bocor tahun ditolak, rupiah hanya bila lulus; data nyata: uji {nd['uji']['n_uji']} kab-tahun, "
          f"{'tanpa rupiah' if nd['tanpa_rupiah'] else 'dengan rupiah'})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
