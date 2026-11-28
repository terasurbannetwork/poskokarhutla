"""OJL-2 Penempatan stok musiman dan menjelang kejadian (DESAIN-TEKNIS sec 6.19; ALGORITMA sec 10.26; tiket RU-063).

Langkah jalan.py (harian, sesudah langkah prediksi). Saran, bukan perintah; tiap saran membawa pemicunya. Tanpa graf jalan (OJL-1, F3):
gudang = ibu kota provinsi (public/data/logpal/provinsi.csv; gudang meja D1 tidak terbaca pipeline), jarak garis lurus.

Musiman, per gudang g dan bulan m: target(g, m) = jumlah beras_pr1(k) x [m di musim(k)] atas kab yang dilayani g (gudang
terdekat garis lurus dari titik kab scripts/udara/kota.json). beras_pr1 = PLP-1 skenario PR 1%, 3 hari (stok_penyangga).
musim(k) = bulan musim provinsi kab di kalender_operasi.json, semua jenis yang tidak tidak_musiman. Stok gudang belum
dilaporkan (RU-036): saran pindah tidak dibuat, ditulis "stok belum dilaporkan".

Jelang kejadian: kab dengan prakiraan /prediksi BNJ atau LSR tingkat >= 2 (Siaga ke atas, asumsi "tingkat tinggi") di +1..+3
DAN jarak ke gudang > 400 km (asumsi setara 24 jam) -> "kirim paket 72 jam untuk N jiwa", N = min(1% x JP, maks_b terpapar
h[b][2]). Gerbang ALGORITMA sec 12: hanya untuk kode yang di rapor skor.json mengalahkan persistensi DAN klimatologi
(bss > 0) di ketiga tenggang; selain itu bagian jelang tidak tampil, musiman tetap. Urutan bila banyak: MB-4 (N, jarak).

  python3 -I scripts/bnpb/unit/ojl2.py --cek
"""
import csv
import json
from datetime import datetime, timedelta, timezone
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402
import skor  # noqa: E402

AKAR = rapor.AKAR
DATA = os.path.join(AKAR, "public", "data", "bnpb")
PRED = os.path.join(AKAR, "public", "prediksi", "data")
AMBANG_KM = 400        # asumsi ALGORITMA sec 10.26: setara 24 jam pada 17 km/jam efektif, tidak berpasal
TINGKAT_TINGGI = 2     # asumsi: lv 0 Normal .. 3 Awas (scripts/prediksi/catat.py); tinggi = Siaga ke atas
PR_UMUM = 0.01         # Perka 23/2014 PR 1% (stok_pr_umum)
KODE_PRED = {"BNJ": "banjir", "LSR": "longsor"}
BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
ASUMSI = ["Asumsi: tanpa graf jalan, garis lurus", "Asumsi: gudang = ibu kota provinsi"]
ASUMSI_JELANG = ["Asumsi: 400 km setara 24 jam", "Asumsi: tingkat tinggi = Siaga ke atas", "Asumsi: tanpa graf jalan, garis lurus"]


def jarak_km(a, b):
    (la1, lo1), (la2, lo2) = a, b
    p1, p2 = math.radians(la1), math.radians(la2)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def terdekat(titik, gudang):
    """titik (lat, lon) -> (kode gudang, km); gudang = {kode: (lat, lon)}; seri: kode terkecil."""
    return min(((g, jarak_km(titik, p)) for g, p in gudang.items()), key=lambda x: (round(x[1], 6), x[0]))


def musim_prov(kal):
    """{prov: {bulan: [jenis]}} dari kalender_operasi.json; jenis tidak_musiman dilewati."""
    out = {}
    for p, v in (kal.get("provinsi") or {}).items():
        for j, x in (v.get("jenis") or {}).items():
            if x.get("tidak_musiman"):
                continue
            for m in x.get("musim") or []:
                for b in m.get("bulan") or []:
                    out.setdefault(p, {}).setdefault(int(b), set()).add(j)
    return {p: {b: sorted(j) for b, j in v.items()} for p, v in out.items()}


def musiman(kab, gudang, musim):
    """kab = {kode: {titik, beras_pr1, prov}} -> per gudang {kab:[..], target:{bulan: kg}, pemicu:{bulan:[jenis]}}."""
    per = {g: {"kab": [], "target": {}, "pemicu": {}} for g in gudang}
    tanpa = []
    for k, x in sorted(kab.items()):
        if x.get("titik") is None:
            tanpa.append(k)
            continue
        g, km = terdekat(x["titik"], gudang)
        per[g]["kab"].append(k)
        for b, jenis in (musim.get(x["prov"]) or {}).items():
            if x.get("beras_pr1") is not None:
                per[g]["target"][b] = per[g]["target"].get(b, 0) + x["beras_pr1"]
                per[g]["pemicu"].setdefault(b, set()).update(f"{j} {x['prov']}" for j in jenis)
    for v in per.values():
        v["pemicu"] = {b: sorted(s) for b, s in v["pemicu"].items()}
    return per, tanpa


BASI_JAM = 48   # rapor atau prakiraan lebih tua dari ini: gerbang tutup


def _umur_jam(dibuat, kini):
    try:
        t = datetime.fromisoformat(str(dibuat).replace("Z", "+00:00"))
    except ValueError:
        return None
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone(timedelta(hours=7)))
    return (kini - t).total_seconds() / 3600


def lolos_gerbang(skor_pred, pred, kode, kini):
    """Rapor prospektif /prediksi -> (lolos, alasan). Wajib: skor.json dan prakiraan kode itu segar (<= 48 jam); per tenggang 1, 2, 3
    ada baris ambang == TINGKAT_TINGGI; tiap baris itu bss persistensi dan klimatologi > 0 DAN (vonis lulus atau batas bawah
    selang90_beda > 0)."""
    for nama, dib in (("skor.json", skor_pred.get("dibuat")), ("prediksi.json", ((pred.get("kode") or {}).get(kode) or {}).get("dibuat") or pred.get("dibuat"))):
        u = _umur_jam(dib, kini)
        if u is None or u > BASI_JAM:
            return False, f"{nama} {kode} basi atau tanpa tanggal dibuat"
    g = [x for x in ((skor_pred.get("kode") or {}).get(kode) or {}).get("grup") or [] if x.get("ambang") == TINGKAT_TINGGI]
    for t in (1, 2, 3):
        bt = [x for x in g if x.get("tenggang") == t]
        if not bt:
            return False, f"{kode} tanpa rapor ambang tingkat {TINGKAT_TINGGI} tenggang {t}"
        for x in bt:
            sel = x.get("selang90_beda")
            pasti = x.get("vonis") == "lulus" or (isinstance(sel, (list, tuple)) and sel and isinstance(sel[0], (int, float)) and sel[0] > 0)
            if not ((x.get("bss_persistensi") or 0) > 0 and (x.get("bss_klimatologi") or 0) > 0 and pasti):
                return False, f"{kode} tenggang {t} belum mengalahkan persistensi dan klimatologi dengan selang yang pasti"
    return True, None


def jelang(pred, kab, gudang, terpapar, kode_lolos):
    """Saran kirim paket 72 jam; tiap saran membawa pemicu (tanggal, jenis, tingkat, jarak)."""
    saran = []
    for r in pred.get("kab") or []:
        k = r.get("id")
        x = kab.get(k)
        if not x or x.get("titik") is None or not x.get("jp"):
            continue
        g, km = terdekat(x["titik"], gudang)
        if km <= AMBANG_KM:
            continue
        pemicu = []
        for kd in kode_lolos:
            hari = (pred.get("kode") or {}).get(kd, {}).get("hari") or []
            for i, v in enumerate(r.get(kd) or []):
                if v and isinstance(v[0], int) and v[0] >= TINGKAT_TINGGI and i < len(hari):
                    pemicu.append({"tanggal": hari[i], "jenis": KODE_PRED[kd], "tingkat": v[0]})
        if not pemicu:
            continue
        h = [t[2] for t in ((terpapar.get(k) or {}).get("h") or {}).values() if t and t[2] is not None]
        n = min([PR_UMUM * x["jp"]] + ([max(h)] if h else []))
        saran.append({"kab": k, "gudang": g, "jarak_km": round(km), "jiwa": round(n), "pemicu": pemicu})
    if len(saran) > 1:   # urutan MB-4 sec 5.5: jiwa sasaran dan jarak, persentil, bobot sama
        s = skor.skor({"jiwa": {"tipe": "persentil", "nilai": {x["kab"]: x["jiwa"] for x in saran}},
                       "jarak": {"tipe": "persentil", "nilai": {x["kab"]: x["jarak_km"] for x in saran}}}, {"jiwa": 1, "jarak": 1})
        o = {k: i for i, k in enumerate(skor.urut(s))}
        saran.sort(key=lambda x: o[x["kab"]])
    return saran


def bangun(stok, kota, prov, kal, pred, skor_pred, terpapar, nama, bulan_ini, kini=None):
    gudang = {p["kode"]: (float(p["lat"]), float(p["lon"])) for p in prov if p.get("lat") and p.get("lon")}
    nama_g = {p["kode"]: p["ibu_kota"] for p in prov}
    titik = {r[0]: (r[1], r[2]) for r in kota}
    kab = {r["kode"]: {"titik": titik.get(r["kode"]), "prov": r["kode"][:2], "jp": r.get("jp"),
                       "beras_pr1": ((r.get("skenario") or {}).get("pr1") or {}).get("beras_kg")} for r in stok}
    musim = musim_prov(kal)
    per, tanpa_titik = musiman(kab, gudang, musim)
    tak_musim = sum(1 for k in kab if not musim.get(kab[k]["prov"]))
    baris = []
    for g in sorted(per, key=lambda g: (-(per[g]["target"].get(bulan_ini) or 0), g)):
        v = per[g]
        if not v["kab"]:
            continue
        puncak = max(v["target"], key=lambda b: (v["target"][b], -b)) if v["target"] else None
        baris.append({"gudang": nama_g.get(g, g), "kab": len(v["kab"]),
                      "ini": v["target"].get(bulan_ini), "puncak": BLN[puncak - 1] if puncak else None,
                      "target_puncak": v["target"].get(puncak) if puncak else None,
                      "pemicu": ", ".join(v["pemicu"].get(bulan_ini, [])) or None,
                      "saran": "stok belum dilaporkan, tidak disarankan pindah"})
    kini = kini or datetime.now(timezone.utc)
    gerbang = {kd: lolos_gerbang(skor_pred, pred, kd, kini) for kd in KODE_PRED}
    lolos = [kd for kd, (ok, _) in gerbang.items() if ok]
    sar = jelang(pred, kab, gudang, terpapar, lolos) if lolos else []
    alasan_jelang = None if lolos else "bagian jelang tidak tampil: " + "; ".join(a for _, a in gerbang.values())
    n_target = sum(1 for b in baris if b["ini"] is not None)
    k1 = rapor.kartu(
        id="ojl2-musim", sistem="OJL-2", pil="Penempatan stok", ikon="gudang", judul="Target stok musiman per gudang, saran",
        angka=[{"k": "gudang", "label": "Gudang ibu kota provinsi melayani kab", "nilai": len(baris)},
               {"k": "ini", "label": f"Target beras bulan {BLN[bulan_ini - 1]}, kg, dari {n_target} gudang yang punya target", "desimal": 0,
                "nilai": sum(b["ini"] for b in baris if b["ini"] is not None) if n_target else None,
                "title": "jumlah beras PR 1% 3 hari kab yang provinsinya bermusim bulan ini; gudang tanpa target tidak dijumlah"},
               {"k": "tanpa_musim", "label": "Kab/kota di provinsi tanpa musim tercatat", "nilai": tak_musim},
               {"k": "jelang", "label": "Saran kirim paket 72 jam", "nilai": len(sar) if lolos else None,
                "title": alasan_jelang or "prakiraan tingkat Siaga ke atas, jarak ke gudang lebih dari 400 km"}],
        kolom=[{"k": "gudang", "label": "Gudang", "title": "ibu kota provinsi (tanpa graf jalan; gudang meja belum terbaca pipeline)"},
               {"k": "kab", "label": "Kab/kota dilayani", "angka": True, "title": "kab yang gudang terdekatnya garis lurus adalah ini"},
               {"k": "ini", "label": "Target bulan ini, kg beras", "angka": True, "desimal": 0, "title": "beras PR 1% 3 hari (PLP-1) x [bulan ini di musim provinsi kab]"},
               {"k": "puncak", "label": "Bulan target tertinggi"},
               {"k": "target_puncak", "label": "Target tertinggi, kg beras", "angka": True, "desimal": 0},
               {"k": "pemicu", "label": "Pemicu bulan ini", "title": "jenis dan kode provinsi yang musimnya mencakup bulan ini (kalender_operasi.json)"},
               {"k": "saran", "label": "Saran pindah", "title": "selisih target lawan stok gudang; stok menunggu INALOGPAL (RU-036)"}],
        baris=baris, rumus="target(g, m) = jumlah beras_pr1(k) x [m di musim(k)] atas kab yang dilayani g; saran = target - stok",
        sumber=["stok_penyangga", "kalender_operasi", "logpal/provinsi", "kota"], label=["hitungan_kita"], asumsi=ASUMSI, unduh="target_stok_musiman.csv")
    kartu = [k1]
    if lolos:
        kartu.append(rapor.kartu(
            id="ojl2-jelang", sistem="OJL-2", pil="Penempatan stok", ikon="kalender", judul="Saran kirim paket 72 jam",
            angka=[{"k": "saran", "label": "Kab/kota dengan saran", "nilai": len(sar)}],
            kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "jiwa", "label": "Jiwa sasaran", "angka": True, "title": "min(1% penduduk, jiwa terpapar kelas tinggi)"},
                   {"k": "jarak", "label": "Jarak ke gudang, km", "angka": True, "title": "garis lurus ke ibu kota provinsi terdekat"},
                   {"k": "pemicu", "label": "Pemicu", "title": "tanggal, jenis, tingkat prakiraan /prediksi; prediksi dinilai prospektif"}],
            baris=[{"kab": nama.get(x["kab"], x["kab"]), "jiwa": x["jiwa"], "jarak": x["jarak_km"],
                    "pemicu": "; ".join(f"{p['tanggal']} {p['jenis']} tingkat {p['tingkat']}" for p in x["pemicu"])} for x in sar],
            rumus="saran bila tingkat >= 2 di +1..+3 dan jarak > 400 km; N = min(1% x JP, maks terpapar tinggi)",
            sumber=["prediksi", "skor", "stok_penyangga", "terpapar"], label=["hitungan_kita", "proksi"], asumsi=ASUMSI_JELANG))
    src = [{"nama": "PLP-1 neraca stok penyangga (plp1.py)", "url": "repo:scripts/bnpb/unit/plp1.py", "diambil": "2026-11-26", "lisensi": "hitungan kita"},
           {"nama": "Kalender operasi Pusdalops (perencanaan.py)", "url": "repo:public/data/bnpb/kalender_operasi.json", "diambil": str(kal.get("dibuat"))[:10], "lisensi": "data internal BNPB, agregat"},
           {"nama": "Ibu kota provinsi (logpal/provinsi.csv)", "url": "repo:public/data/logpal/provinsi.csv", "diambil": "2026-11-26", "lisensi": "data publik"},
           {"nama": "Prakiraan dan rapor /prediksi", "url": "repo:public/prediksi/data/skor.json", "diambil": str(skor_pred.get("dibuat"))[:10], "lisensi": "hitungan kita, prospektif"}]
    b = rapor.berkas(kartu, src)
    b["data"] = {"label_wajib": "saran, bukan perintah", "ambang_km": AMBANG_KM, "tingkat_tinggi": TINGKAT_TINGGI, "bulan": bulan_ini,
                 "gudang": {g: {"nama": nama_g.get(g, g), "kab": v["kab"], "target_kg": {str(b_): t for b_, t in sorted(v["target"].items())},
                                "pemicu": {str(b_): p for b_, p in sorted(v["pemicu"].items())}, "stok": None, "saran_pindah": None} for g, v in per.items() if v["kab"]},
                 "kab_tanpa_titik": tanpa_titik,
                 "jelang": {"tampil": bool(lolos), "kode_lolos": lolos, "alasan": alasan_jelang, "gerbang": {k: a for k, (_, a) in gerbang.items()}, "saran": sar}}
    return b


def _json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan():
    import plp1
    kota = _json(os.path.join(AKAR, "scripts", "udara", "kota.json"))
    i = {k: n for n, k in enumerate(kota["kolom"])}
    titik = [(r[i["kode"]], r[i["lat"]], r[i["lon"]]) for r in kota["baris"]]
    with open(os.path.join(AKAR, "public", "data", "logpal", "provinsi.csv"), encoding="utf-8") as f:
        prov = list(csv.DictReader(f))
    st = plp1.jalan()["stok_penyangga"]["data"]["kab"]
    nama = {r["kode"]: r.get("nama_kab") or r["kode"] for r in st}
    bln = (datetime.now(timezone.utc) + timedelta(hours=7)).month
    return {"prepositioning": bangun(st, titik, prov, _json(os.path.join(DATA, "kalender_operasi.json")), _json(os.path.join(PRED, "prediksi.json")),
                                     _json(os.path.join(PRED, "skor.json")), _json(os.path.join(DATA, "terpapar.json"))["kab"], nama, bln)}


def cek():
    assert abs(jarak_km((0, 0), (0, 1)) - 111.19) < 0.1
    gudang = {"11": (5.55, 95.32), "12": (3.59, 98.67)}
    stok = [{"kode": "1101", "jp": 200000, "skenario": {"pr1": {"beras_kg": 2400.0}}},
            {"kode": "1201", "jp": 100000, "skenario": {"pr1": {"beras_kg": 1200.0}}},
            {"kode": "1202", "jp": 50000, "skenario": {"pr1": {"beras_kg": None}}},
            {"kode": "9101", "jp": 80000, "skenario": {"pr1": {"beras_kg": 960.0}}}]
    kota = [("1101", 5.4, 95.5), ("1201", 3.0, 98.5), ("1202", 3.2, 98.6), ("9101", -2.5, 140.7)]   # 9101 jauh dari dua gudang
    prov = [{"kode": "11", "ibu_kota": "Banda Aceh", "lat": "5.55", "lon": "95.32"}, {"kode": "12", "ibu_kota": "Medan", "lat": "3.59", "lon": "98.67"}]
    kal = {"dibuat": "2026-11-01", "provinsi": {"11": {"jenis": {"banjir": {"tidak_musiman": False, "musim": [{"bulan": [10, 11, 12, 1]}]},
                                                                 "kekeringan": {"tidak_musiman": True, "musim": [{"bulan": [7, 8]}]}}},
                                                 "12": {"jenis": {"longsor": {"tidak_musiman": False, "musim": [{"bulan": [11, 12]}]}}}}}
    pred = {"kode": {"BNJ": {"hari": ["2026-11-27", "2026-11-28", "2026-11-29"]}, "LSR": {"hari": ["2026-11-27", "2026-11-28", "2026-11-29"]}},
            "kab": [{"id": "9101", "BNJ": [[1, 0.2], [2, 0.5], [3, 0.6]], "LSR": [[0, 0], [1, 0.1], None]},
                    {"id": "1101", "BNJ": [[3, 0.9], [3, 0.9], [3, 0.9]]}]}   # 1101 dekat gudang: tanpa saran
    kini = datetime(2026, 11, 26, 12, tzinfo=timezone.utc)
    pred["dibuat"] = "2026-11-26T04:41:29+07:00"
    lulus = {"grup": [{"ambang": 2, "tenggang": t, "bss_persistensi": 0.2, "bss_klimatologi": 0.1, "selang90_beda": [0.01, 0.2], "vonis": "belum teruji"} for t in (1, 2, 3)]}
    gagal = {"grup": [{"ambang": 2, "tenggang": t, "bss_persistensi": 0.3, "bss_klimatologi": -0.2, "selang90_beda": [0.01, 0.2]} for t in (1, 2, 3)]}
    sp = lambda bnj, dib="2026-11-26T04:46:13+07:00": {"dibuat": dib, "kode": {"BNJ": bnj, "LSR": gagal}}  # noqa: E731
    # gerbang: ambang 2 hilang di satu tenggang, selang menyentuh 0, berkas basi -> tutup
    tanpa2 = {"grup": [dict(x, ambang=1) if x["tenggang"] == 3 else x for x in lulus["grup"]]}
    assert lolos_gerbang(sp(tanpa2), pred, "BNJ", kini) == (False, "BNJ tanpa rapor ambang tingkat 2 tenggang 3")
    ragu = {"grup": [dict(x, selang90_beda=[-0.01, 0.2]) for x in lulus["grup"]]}
    assert not lolos_gerbang(sp(ragu), pred, "BNJ", kini)[0]
    assert lolos_gerbang(sp({"grup": [dict(x, selang90_beda=None, vonis="lulus") for x in lulus["grup"]]}), pred, "BNJ", kini)[0]
    assert not lolos_gerbang(sp(lulus, "2026-11-23T00:00:00+07:00"), pred, "BNJ", kini)[0], "skor.json basi lolos"
    assert not lolos_gerbang(sp(lulus), {**pred, "dibuat": "2026-11-20T00:00:00+07:00"}, "BNJ", kini)[0], "prediksi.json basi lolos"
    assert lolos_gerbang(sp(lulus), pred, "BNJ", kini) == (True, None)
    terp = {"9101": {"h": {"banjir": [0, 0, 500], "longsor": [0, 0, None]}}}
    nama = {"1101": "Kab. A", "1201": "Kab. B", "1202": "Kab. C", "9101": "Kab. D"}
    b = bangun(stok, kota, prov, kal, pred, sp(lulus), terp, nama, 11, kini)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    g = b["data"]["gudang"]
    assert g["11"]["target_kg"] == {"1": 2400.0, "10": 2400.0, "11": 2400.0, "12": 2400.0}, g["11"]   # kekeringan tidak_musiman dilewati
    assert g["12"]["kab"] == ["1201", "1202", "9101"] and g["12"]["target_kg"] == {"11": 1200.0, "12": 1200.0}, g["12"]   # beras None tidak ikut; 9101 tanpa musim
    assert g["11"]["pemicu"]["11"] == ["banjir 11"] and all(v["saran_pindah"] is None for v in g.values())
    j = b["data"]["jelang"]
    assert j["tampil"] and j["kode_lolos"] == ["BNJ"] and [s["kab"] for s in j["saran"]] == ["9101"], j
    s = j["saran"][0]
    assert s["jiwa"] == 500 and s["jarak_km"] > AMBANG_KM and [p["tanggal"] for p in s["pemicu"]] == ["2026-11-28", "2026-11-29"], s   # tiap saran membawa pemicu
    assert all(x["pemicu"] for x in j["saran"]), "saran tanpa pemicu"
    # gerbang gagal: jelang tidak tampil, musiman tetap
    b2 = bangun(stok, kota, prov, kal, pred, sp(gagal), terp, nama, 11, kini)
    assert not b2["data"]["jelang"]["tampil"] and b2["data"]["jelang"]["saran"] == [] and len(b2["kartu"]) == 1
    assert b2["kartu"][0]["angka"][3]["nilai"] is None and "tidak tampil" in b2["kartu"][0]["angka"][3]["title"]
    a1 = b2["kartu"][0]["angka"][1]
    assert a1["nilai"] == 3600.0 and "dari 2 gudang yang punya target" in a1["label"] and a1["desimal"] == 0, a1
    assert any("tanpa graf jalan" in a for a in b2["kartu"][0]["asumsi"]) and any("400 km" in a for a in b["kartu"][1]["asumsi"])
    nyata = jalan()["prepositioning"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **nyata})
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    assert all(x["pemicu"] for x in nyata["data"]["jelang"]["saran"])
    a = {x["k"]: x["nilai"] for x in nyata["kartu"][0]["angka"]}
    print(f"ojl2.py --cek: lulus ({a['gudang']} gudang, target bulan ini {a['ini']} kg beras, {a['tanpa_musim']} kab tanpa musim; "
          f"jelang {'tampil ' + str(a['jelang']) + ' saran' if nyata['data']['jelang']['tampil'] else 'tidak tampil (gerbang /prediksi)'})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
