"""RRP-1 Neraca rumah rusak per kab: lapor, verifikasi, tersalur (DESAIN-TEKNIS sec 6.21; ALGORITMA sec 9; riset/5 P1; tiket RU-065).

Langkah jalan.py (harian). Hanya agregat per kab; tidak ada titik per rumah, tidak ada Survey123, tidak ada geometri.
Masukan: layer verifikasi ArcGIS BNPB per kejadian (kamus_layer.json: folder, layanan, lapis, pemetaan kolom ke L = lapor dan V = verifikasi),
dibaca lewat panen.ambil_json dengan outFields daftar putih dan returnGeometry=false (aturan DILARANG panen.py). Per kab:
  kemajuan = rumah memenuhi kriteria (rusak berat + sedang + ringan terverifikasi) / total lapor; diperiksa = (memenuhi + tidak memenuhi kriteria) / total lapor,
    dipisah karena rumah tidak memenuhi kriteria bukan kemajuan dan rasionya bisa di atas 1; pembilang dan penyebut memakai himpunan kab yang sama
  rasio susut jenis t = V_t / L_t (RB, RS, RR) hanya untuk kab yang punya verifikasi dan L_t > 0
  kab tanpa verifikasi: perkiraan V_t = L_t x median rasio susut kab pembanding sekejadian yang pemeriksaannya mendekati selesai (80%);
  kurang dari 3 pembanding = tanpa perkiraan; berlabel hipotesis dan diuji leave-one-out (loo_rb)
  beban stimulan = RB x 60 + RS x 30 + RR x 15 juta (tarif Jam Aturan, asumsi), dua kolom: lapor dan verifikasi (estimasi kita)
Tersalur (RRP-2) dan uji masuk akal lawan jumlah bangunan kecamatan (R2 bangunan/kec.json) belum ada: ditulis belum ada data, bukan nol.
Kab dihitung dari id_kab BPS lewat padanan_kab_dibi.petakan ke kode Kemendagri; tidak terpetakan: dicatat, tidak dibagi rata.
Folder ArcGIS berpola 20xx_ yang belum ada di kamus dicatat sebagai folder_baru, tidak diterka.

  python3 -I scripts/bnpb/unit/rrp1.py --cek
"""
import json
import os
import re
import statistics
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import rapor  # noqa: E402

AKAR = rapor.AKAR
sys.path.insert(0, os.path.join(AKAR, "scripts", "data"))
import padanan_kab_dibi as PAD  # noqa: E402

KAMUS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kamus_layer.json")
FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "ntt_2026.json")
MIN_PEMBANDING = 3
MENDEKATI_SELESAI = 0.8   # asumsi: kab pembanding sudah memeriksa paling sedikit 80% dari yang dilaporkan (diperiksa = memenuhi kriteria + tidak memenuhi)
T = ("RB", "RS", "RR")
POLA_FOLDER = re.compile(r"^20\d\d_")
BATAS_BARIS = 2000   # maxRecordCount layanan; lebih dari itu = terpotong, ditolak


def kolom_daftar(peta):
    k = peta["kolom"]
    return [k["kab"], k["nama_kab"], k["provinsi"], k["tanggal"], *k["lapor"].values(), *k["verif"].values(), k["tmk"], k["verif_total"]]


def url_layer(kamus, e):
    """URL query agregat: outFields daftar putih (tanpa *), returnGeometry=false."""
    q = urllib.parse.urlencode({"where": "1=1", "outFields": ",".join(kolom_daftar(e)), "returnGeometry": "false", "f": "json",
                                "resultRecordCount": BATAS_BARIS}, safe=",")
    return f"{kamus['base']}/{e['folder']}/{e['layanan']}/{e['tipe']}/{e['lapis']}/query?{q}"


def _int(v, nama):
    if v is None:
        return None
    if isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0 or v != int(v):
        raise ValueError(f"{nama}: {v!r} bukan bilangan bulat 0 atau lebih")
    return int(v)


def urai_layer(j, peta):
    """-> {id_kab BPS: {nama, provinsi, ms, L:{RB,RS,RR}, V:{...}, tmk, vtotal}}; bentuk lain = ValueError (bukan 0)."""
    if not isinstance(j, dict) or not isinstance(j.get("features"), list) or not j["features"]:
        raise ValueError("layer: bentuk berubah (features)")
    if j.get("exceededTransferLimit"):
        raise ValueError("layer: hasil terpotong batas layanan")
    k, out = peta["kolom"], {}
    for f in j["features"]:
        a = f.get("attributes") if isinstance(f, dict) else None
        if not isinstance(a, dict) or any(c not in a for c in kolom_daftar(peta)):
            raise ValueError("layer: baris tanpa kolom yang dipetakan di kamus")
        kab = str(a[k["kab"]] or "").strip()
        if not re.fullmatch(r"\d{2}\.\d{2}", kab):
            raise ValueError(f"layer: id_kab {kab!r} bukan bentuk 00.00")
        if kab in out:
            raise ValueError(f"layer: kab {kab} muncul dua kali (agregat harus satu baris per kab)")
        out[kab] = {"nama": str(a[k["nama_kab"]] or "").strip(), "provinsi": str(a[k["provinsi"]] or "").strip(), "ms": a[k["tanggal"]],
                    "L": {t: _int(a[k["lapor"][t]], k["lapor"][t]) for t in T}, "V": {t: _int(a[k["verif"][t]], k["verif"][t]) for t in T},
                    "tmk": _int(a[k["tmk"]], k["tmk"]), "vtotal": _int(a[k["verif_total"]], k["verif_total"])}
    return out


def beban(x, tarif):
    """juta rupiah; None bila satu jenis tak ada."""
    return None if any(x[t] is None for t in T) else sum(x[t] * tarif[t] for t in T)


def hitung(rows, tarif, petakan=PAD.petakan):
    """rows dari urai_layer -> {kab: {...}, ringkas: {...}}. Kemajuan memakai semua L (termasuk kab tanpa V)."""
    kab = {}
    for bps, r in rows.items():
        L = r["L"]
        lt = None if any(L[t] is None for t in T) else sum(L[t] for t in T)
        punya_v = bool(r["vtotal"])   # 0 atau kosong = belum diverifikasi, bukan "verifikasi nol rumah"
        v3 = None if not punya_v or any(r["V"][t] is None for t in T) else sum(r["V"][t] for t in T)   # memenuhi kriteria saja, tanpa TMK
        susut = {t: (r["V"][t] / L[t] if punya_v and r["V"][t] is not None and L[t] else None) for t in T}
        kab[bps] = {"kode": petakan(bps.replace(".", "")), "nama": r["nama"], "provinsi": r["provinsi"], "ms": r["ms"], "L": L, "V": r["V"] if punya_v else {t: None for t in T},
                    "tmk": r["tmk"] if punya_v else None, "vtotal": r["vtotal"] if punya_v else None, "ltotal": lt, "punya_v": punya_v, "susut": susut,
                    "v3": v3, "kemajuan": v3 / lt if v3 is not None and lt else None,
                    "diperiksa_rasio": r["vtotal"] / lt if punya_v and lt else None, "beban_lapor": beban(L, tarif), "beban_verif": beban(r["V"], tarif) if punya_v else None}
    mendekati = lambda x: x["diperiksa_rasio"] is not None and x["diperiksa_rasio"] >= MENDEKATI_SELESAI   # noqa: E731
    med = lambda v: statistics.median(v) if len(v) >= MIN_PEMBANDING else None   # noqa: E731
    pembanding = {t: [x["susut"][t] for x in kab.values() if x["susut"][t] is not None and mendekati(x)] for t in T}
    median = {t: med(v) for t, v in pembanding.items()}
    for x in kab.values():
        x["perkiraan"] = None
        if not x["punya_v"]:
            x["perkiraan"] = {t: (round(x["L"][t] * median[t]) if x["L"][t] is not None and median[t] is not None else None) for t in T}
    # uji leave-one-out rusak berat: tiap kab pembanding diperkirakan dari median kab pembanding LAINNYA (paling sedikit 3), dibanding verifikasinya sendiri
    loo = []
    for k, x in kab.items():
        if x["susut"]["RB"] is None or not mendekati(x) or not x["L"]["RB"]:
            continue
        m = med([y["susut"]["RB"] for j, y in kab.items() if j != k and y["susut"]["RB"] is not None and mendekati(y)])
        if m is not None:
            loo.append({"kab": k, "perkiraan": round(x["L"]["RB"] * m), "aktual": x["V"]["RB"]})
    jml = lambda f: sum(f(x) for x in kab.values() if f(x) is not None)   # noqa: E731
    ls, vs = [x for x in kab.values() if x["ltotal"] is not None], [x for x in kab.values() if x["punya_v"]]
    ringkas = {"kab": len(kab), "kab_diverifikasi": len(vs), "kab_tanpa_verifikasi": len(kab) - len(vs),
               "L": {t: jml(lambda x, t=t: x["L"][t]) for t in T}, "V": {t: (sum(x["V"][t] or 0 for x in vs) if vs else None) for t in T},
               "ltotal": sum(x["ltotal"] for x in ls) if ls else None, "vtotal": sum(x["vtotal"] for x in vs) if vs else None,
               "beban_lapor": jml(lambda x: x["beban_lapor"]) if any(x["beban_lapor"] is not None for x in kab.values()) else None,
               "beban_verif": jml(lambda x: x["beban_verif"]) if any(x["beban_verif"] is not None for x in kab.values()) else None,
               "pembanding": {t: len(pembanding[t]) for t in T}, "median_susut": median,
               "tak_terpetakan": sum(1 for x in kab.values() if x["kode"] is None), "loo_rb": loo,
               "v3total": sum(x["v3"] for x in vs if x["v3"] is not None) if any(x["v3"] is not None for x in vs) else None,
               "tmk_total": sum(x["tmk"] for x in vs if x["tmk"] is not None) if any(x["tmk"] is not None for x in vs) else None}
    lv = [x["ltotal"] for x in vs if x["ltotal"] is not None]   # penyebut: hanya kab yang punya verifikasi DAN data lapor lengkap, himpunan yang sama dengan pembilang
    vl = [x for x in vs if x["ltotal"] is not None]
    ringkas["ltotal_berdata"] = sum(lv) if lv else None
    ringkas["kab_rasio"] = len(vl)
    ringkas["kemajuan"] = sum(x["v3"] for x in vl if x["v3"] is not None) / sum(lv) if lv and sum(lv) and all(x["v3"] is not None for x in vl) else None
    ringkas["diperiksa_rasio"] = sum(x["vtotal"] for x in vl) / sum(lv) if lv and sum(lv) else None
    return {"kab": kab, "ringkas": ringkas}


def _wib(ms):
    return (datetime.fromtimestamp(ms / 1000, timezone.utc) + timedelta(hours=7)).date().isoformat() if isinstance(ms, (int, float)) else None


def _id(v, d=0):
    """Angka gaya Indonesia: titik ribuan, koma desimal."""
    return f"{v:,.{d}f}".replace(",", "x").replace(".", ",").replace("x", ".")


def _teks_perkiraan(x, ringkas):
    if x["punya_v"]:
        return "diverifikasi"
    p = x["perkiraan"]
    if p is None or p["RB"] is None:
        return f"belum diverifikasi; tanpa perkiraan (kurang dari {MIN_PEMBANDING} kab pembanding yang verifikasinya mendekati selesai)"
    return (f"belum diverifikasi; hipotesis perkiraan rusak berat terverifikasi {_id(p['RB'])} dari median susut {_id(ringkas['median_susut']['RB'], 2)} "
            f"({ringkas['pembanding']['RB']} kab pembanding)")


def kartu_kejadian(e, h, tarif):
    r = h["ringkas"]
    nama = {k: (x["nama"] or k) for k, x in h["kab"].items()}
    urut = sorted(h["kab"].items(), key=lambda kv: (-(kv[1]["L"]["RB"] or 0), kv[0]))
    baris = [{"kab": f"{nama[k]}, {x['provinsi']}" if x["provinsi"] else nama[k], "rb_l": x["L"]["RB"], "rb_v": x["V"]["RB"],
              "susut": None if x["susut"]["RB"] is None else round(x["susut"]["RB"], 3), "l_total": x["ltotal"], "v3": x["v3"], "tmk": x["tmk"],
              "kemajuan": None if x["kemajuan"] is None else round(x["kemajuan"], 3), "beban_l": x["beban_lapor"], "beban_v": x["beban_verif"],
              "status": _teks_perkiraan(x, r)} for k, x in urut]
    dari = f", dari {r['kab_diverifikasi']} kab berdata" if r["kab_tanpa_verifikasi"] else ""
    tanpa = f"; {r['kab'] - r['kab_rasio']} kab tanpa data verifikasi atau lapor tidak dihitung di pembilang maupun penyebut" if r["kab"] != r["kab_rasio"] else ""
    rd = lambda v, d=3: None if v is None else round(v, d)   # noqa: E731
    return rapor.kartu(
        id="rrp1-" + e["id"], sistem="RRP-1", pil=e["nama"], ikon="rumah", judul="Neraca rumah rusak per kab/kota",
        angka=[{"k": "rb_l", "label": "Rumah rusak berat dilaporkan", "nilai": r["L"]["RB"]},
               {"k": "rb_v", "label": "Rumah rusak berat terverifikasi" + dari, "nilai": r["V"]["RB"], "title": f"jumlah {r['kab_diverifikasi']} kab yang punya verifikasi; kab tanpa verifikasi tidak diisi 0"},
               {"k": "kemajuan", "label": "Kemajuan: memenuhi kriteria lawan dilaporkan" + dari, "nilai": rd(r["kemajuan"]), "desimal": 2,
                "title": "(rumah rusak berat + sedang + ringan yang memenuhi kriteria verifikasi) / (rumah rusak berat + sedang + ringan dilaporkan); rumah tidak memenuhi kriteria tidak dihitung" + tanpa},
               {"k": "diperiksa", "label": "Sudah diperiksa lawan dilaporkan" + dari, "nilai": rd(r["diperiksa_rasio"]), "desimal": 2,
                "title": "total rumah diperiksa (memenuhi + tidak memenuhi kriteria) / dilaporkan; bukan kemajuan dan boleh di atas 1 karena rumah yang diperiksa tidak harus ada di daftar lapor" + tanpa},
               {"k": "tmk", "label": "Tidak memenuhi kriteria" + dari, "nilai": r["tmk_total"], "title": "kolom rumah tidak memenuhi kriteria di layer; dipisah dari angka kemajuan"},
               {"k": "beban_l", "label": "Beban stimulan menurut lapor, juta Rp", "nilai": r["beban_lapor"], "desimal": 0, "title": "rumah rusak berat x 60 + rumah rusak sedang x 30 + rumah rusak ringan x 15 juta rupiah, estimasi kita"},
               {"k": "beban_v", "label": "Beban stimulan menurut verifikasi, juta Rp" + dari, "nilai": r["beban_verif"], "desimal": 0,
                "title": f"estimasi kita, hanya {r['kab_diverifikasi']} kab yang punya verifikasi; kab tanpa verifikasi tidak diperkirakan di angka ini"},
               {"k": "tersalur", "label": "Rumah tersalur stimulan", "nilai": None, "title": "menunggu RRP-2 (panen angka pemulihan) dan catatan meja rehab; belum ada data"},
               {"k": "tanpa_v", "label": "Kab/kota belum diverifikasi", "nilai": r["kab_tanpa_verifikasi"], "title": "total verifikasi 0 atau kosong di layer; bukan berarti tidak ada rumah rusak"}],
        kolom=[{"k": "kab", "label": "Kab/kota"},
               {"k": "rb_l", "label": "Rusak berat, lapor", "angka": True, "title": "kolom rumah rusak berat dilaporkan di layer"},
               {"k": "rb_v", "label": "Rusak berat, verifikasi", "angka": True, "title": "kolom rumah rusak berat terverifikasi di layer"},
               {"k": "susut", "label": "Susut rusak berat", "angka": True, "desimal": 2, "title": "rusak berat terverifikasi / dilaporkan; hanya kab yang punya verifikasi"},
               {"k": "l_total", "label": "Total lapor", "angka": True, "title": "rusak berat + sedang + ringan menurut lapor"},
               {"k": "v3", "label": "Memenuhi kriteria", "angka": True, "title": "rumah rusak berat + sedang + ringan terverifikasi di layer"},
               {"k": "tmk", "label": "Tidak memenuhi kriteria", "angka": True, "title": "kolom rumah tidak memenuhi kriteria di layer; rumah yang sudah diperiksa tetapi tidak masuk rusak berat, sedang, atau ringan"},
               {"k": "kemajuan", "label": "Kemajuan", "angka": True, "desimal": 2, "title": "memenuhi kriteria / total lapor"},
               {"k": "beban_l", "label": "Beban lapor, juta Rp", "angka": True, "desimal": 0, "title": "estimasi kita, tarif stimulan asumsi"},
               {"k": "beban_v", "label": "Beban verifikasi, juta Rp", "angka": True, "desimal": 0, "title": "estimasi kita, tarif stimulan asumsi"},
               {"k": "status", "label": "Status verifikasi"}],
        baris=baris,
        rumus="kemajuan = memenuhi kriteria / total lapor; diperiksa = (memenuhi + tidak memenuhi) / total lapor; susut = verifikasi / lapor per jenis; hipotesis perkiraan kab tanpa verifikasi = lapor x median susut kab pembanding yang diperiksanya mendekati selesai (paling sedikit 3); beban = rumah rusak berat x 60 + rumah rusak sedang x 30 + rumah rusak ringan x 15 juta rupiah",
        sumber=["arcgis_" + e["folder"], "jam_aturan"], label=["resmi", "hitungan_kita"], aturan=["tarif_stimulan_juta"], asumsi=["Asumsi: susut sama antar kab", "Asumsi: tarif stimulan"], unduh="neraca_rumah_" + e["id"].replace("-", "_") + ".csv")


def bangun(hasil, folder_baru, atribusi, tarif):
    """hasil = [(entri kamus, urai_layer(...))]."""
    kartu, data = [], {}
    for e, rows in hasil:
        h = hitung(rows, tarif)
        kartu.append(kartu_kejadian(e, h, tarif))
        ms = [x["ms"] for x in h["kab"].values() if isinstance(x["ms"], (int, float))]
        data[e["id"]] = {"nama": e["nama"], "diperbarui": _wib(max(ms)) if ms else None, "ringkas": h["ringkas"],
                         "kab": {k: {x: v for x, v in d.items() if x not in ("ms", "punya_v")} for k, d in h["kab"].items()}}
    b = rapor.berkas(kartu, atribusi)
    b["data"] = {"label_wajib": "estimasi kita; tersalur menunggu RRP-2", "tarif_juta": tarif, "kejadian": data, "folder_baru": folder_baru}
    return b


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan():
    import panen
    kamus = _muat(KAMUS)
    hasil, atribusi = [], []
    for e in kamus["kejadian"]:
        j, a = panen.ambil_json(url_layer(kamus, e), "arcgis_" + e["folder"], umur_jam=20, nama=f"Layanan GIS BNPB, gis.bnpb.go.id/{e['folder']}", lisensi="lisensi tidak tertulis; layar staf saja (U4)")
        hasil.append((e, urai_layer(j, e)))
        atribusi.append(a)
    daftar, a = panen.ambil_json(kamus["base"] + "?f=json", "arcgis_daftar", umur_jam=20, nama="Layanan GIS BNPB, daftar folder", lisensi="lisensi tidak tertulis; layar staf saja (U4)")
    ada = {e["folder"] for e in kamus["kejadian"]}
    baru = sorted(f for f in (daftar.get("folders") or []) if POLA_FOLDER.match(f) and f not in ada)
    atribusi.append(a)
    return {"neraca_rumah": bangun(hasil, baru, atribusi, jam.nilai("tarif_stimulan_juta"))}


def cek():
    tarif = {"RB": 60, "RS": 30, "RR": 15}
    kamus = _muat(KAMUS)
    e = kamus["kejadian"][0]
    # G-5: kueri daftar putih, tanpa outFields=*, selalu returnGeometry=false, diizinkan panen
    import panen
    u = url_layer(kamus, e)
    assert "returnGeometry=false" in u and "outFields=*" not in u and "*" not in urllib.parse.unquote(u) and not any(x in u.lower() for x in ("survey123", "perangkat_penilaian"))
    panen.diizinkan(u)
    for jahat in (u.replace("returnGeometry=false", "returnGeometry=true"), re.sub(r"outFields=[^&]*", "outFields=*", u)):
        try:
            panen.diizinkan(jahat)
            raise AssertionError("kueri ArcGIS bergeometri atau outFields=* lolos")
        except panen.Dilarang:
            pass
    # kasus RU 2.3 pada fixture NTT (tangkapan 26 Nov 2026): lapor sama dengan riset 5, verifikasi bergeser sedikit
    rows = urai_layer(_muat(FIXTURE), e)
    h = hitung(rows, tarif)
    r, k = h["ringkas"], h["kab"]
    assert r["L"] == {"RB": 25833, "RS": 22110, "RR": 47807} and r["ltotal"] == 95750, r                        # R2 pembilang: lapor total 95.750
    assert r["V"] == {"RB": 6353, "RS": 15812, "RR": 32074} and r["vtotal"] == 120773, r                       # riset 5: 6.348, 15.815, 32.062, 120.574 (layer bergeser)
    # pembilang dan penyebut himpunan yang sama (7 kab berverifikasi); TMK dipisah dari kemajuan, tidak ada kemajuan di atas 1
    l7 = sum(x["ltotal"] for x in k.values() if x["punya_v"])
    assert r["ltotal_berdata"] == l7 and r["kab_rasio"] == 7 and r["tmk_total"] == 66534 and r["v3total"] == 6353 + 15812 + 32074, r
    assert abs(r["kemajuan"] - r["v3total"] / l7) < 1e-12 and abs(r["diperiksa_rasio"] - 120773 / l7) < 1e-12 and r["v3total"] + r["tmk_total"] == r["vtotal"]
    assert r["kemajuan"] <= 1 and all(x["kemajuan"] is None or x["kemajuan"] <= 1 for x in k.values()), "kemajuan di atas 1: TMK ikut terhitung"
    assert r["diperiksa_rasio"] > r["kemajuan"], "diperiksa memuat TMK"
    assert r["beban_lapor"] == 2_930_385 and r["beban_verif"] == 6353 * 60 + 15812 * 30 + 32074 * 15, r       # R3: Rp2.930.385 juta
    nage = k["53.16"]
    assert nage["L"]["RB"] == 4079 and nage["V"]["RB"] == 319 and abs(nage["susut"]["RB"] - 319 / 4079) < 1e-12, nage   # R1: riset 314 / 4.079 = 0,077; kini 0,078
    assert r["kab"] == 10 and r["kab_diverifikasi"] == 7 and r["kab_tanpa_verifikasi"] == 3 and r["pembanding"]["RB"] == 7
    bima = k["52.06"]   # tanpa verifikasi: V kosong (bukan 0), perkiraan dari median 7 kab
    assert bima["V"] == {"RB": None, "RS": None, "RR": None} and bima["kemajuan"] is None and bima["beban_verif"] is None and bima["perkiraan"]["RB"] is not None
    assert bima["kode"] == PAD.petakan("5206") and nage["kode"] == PAD.petakan("5316") and r["tak_terpetakan"] == 0
    # R4: hanya 2 kab pembanding -> belum ada pembanding, perkiraan None
    dua = {kk: v for kk, v in rows.items() if kk in ("53.16", "53.09", "52.06")}
    h2 = hitung(dua, tarif)
    assert h2["ringkas"]["pembanding"]["RB"] == 2 and h2["kab"]["52.06"]["perkiraan"] == {"RB": None, "RS": None, "RR": None}
    assert "tanpa perkiraan" in _teks_perkiraan(h2["kab"]["52.06"], h2["ringkas"])
    # pembanding hanya kab yang pemeriksaannya mendekati selesai: kab diperiksa 10% dibuang, tinggal 2 -> tanpa perkiraan
    asli_f = _muat(FIXTURE)
    for f in asli_f["features"]:
        if f["attributes"]["id_kab"] in ("53.16", "53.09", "53.10", "53.08", "53.07"):
            for c in ("verif_rb", "verif_rs", "verif_rr", "verif_tmk"):
                f["attributes"][c] = 1
            f["attributes"]["total_rumah_verif"] = 4
    hk = hitung(urai_layer(asli_f, e), tarif)
    assert hk["ringkas"]["pembanding"]["RB"] == 2 and hk["kab"]["52.06"]["perkiraan"]["RB"] is None, hk["ringkas"]["pembanding"]
    # leave-one-out rusak berat: tiap pembanding diperkirakan dari median yang LAIN dan dibandingkan dengan verifikasinya sendiri
    loo = r["loo_rb"]
    assert len(loo) == 7 and all(x["perkiraan"] >= 0 and x["aktual"] is not None for x in loo), loo
    susut = {kk: x["susut"]["RB"] for kk, x in k.items() if x["susut"]["RB"] is not None}
    for x in loo:
        lain = statistics.median([v for kk, v in susut.items() if kk != x["kab"]])
        assert x["perkiraan"] == round(k[x["kab"]]["L"]["RB"] * lain), x
    galat = [abs(x["perkiraan"] - x["aktual"]) / x["aktual"] for x in loo]
    # tanpa satu pun kab diverifikasi: V total None (bukan 0), kemajuan None
    h3 = hitung({kk: v for kk, v in rows.items() if kk in ("52.06", "73.01")}, tarif)["ringkas"]
    assert h3["vtotal"] is None and h3["V"]["RB"] is None and h3["kemajuan"] is None and h3["beban_verif"] is None, h3
    # bentuk layer berubah, terpotong, kab ganda, nilai pecahan: ditolak, bukan 0
    asli = _muat(FIXTURE)
    for rusak in ({}, {"features": []}, {**asli, "exceededTransferLimit": True}, {"features": [{"attributes": {"id_kab": "53.16"}}]},
                  {"features": asli["features"] + [asli["features"][0]]}):
        try:
            urai_layer(rusak, e)
            raise AssertionError("layer rusak lolos")
        except ValueError:
            pass
    pecah = json.loads(json.dumps(asli))
    pecah["features"][0]["attributes"]["verif_rb"] = 1.5
    try:
        urai_layer(pecah, e)
        raise AssertionError("pecahan lolos")
    except ValueError:
        pass
    # kartu: valid skema, tersalur kosong, tanpa kolom pribadi
    atr = [{"nama": "Layanan GIS BNPB", "url": "https://gis.bnpb.go.id/server/rest/services", "diambil": "2026-11-26T00:00:00Z", "lisensi": "x"}]
    b = bangun([(e, rows)], ["2026_karhutla"], atr, tarif)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    s = json.dumps(b, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I) and not re.search(r"survey123|geometry\"|koordinat|nik|no_hp|telepon", s, re.I)
    a = {x["k"]: x for x in b["kartu"][0]["angka"]}
    assert a["tersalur"]["nilai"] is None and a["rb_l"]["nilai"] == 25833 and a["kemajuan"]["nilai"] <= 1 and a["tanpa_v"]["nilai"] == 3, a
    assert a["diperiksa"]["nilai"] > a["kemajuan"]["nilai"] and a["tmk"]["nilai"] == 66534 and "dari 7 kab berdata" in a["rb_v"]["label"], a
    assert "hipotesis" in b["kartu"][0]["baris"][-1]["status"] or "hipotesis" in " ".join(x["status"] for x in b["kartu"][0]["baris"])
    assert "Asumsi: susut sama antar kab" in b["kartu"][0]["asumsi"] and "Asumsi: tarif stimulan" in b["kartu"][0]["asumsi"]
    assert _id(1234567.5, 0) == "1.234.568" and _id(0.08, 2) == "0,08"
    assert b["data"]["kejadian"][e["id"]]["diperbarui"] == "2026-11-26" or b["data"]["kejadian"][e["id"]]["diperbarui"] is not None
    assert len(b["kartu"][0]["baris"]) == 10 and b["data"]["folder_baru"] == ["2026_karhutla"]
    n = lambda v: f"{v:,}".replace(",", ".")   # noqa: E731
    print(f"rrp1.py --cek: lulus (NTT 2026 fixture 26 Nov: lapor {n(r['ltotal'])}, diperiksa {n(r['vtotal'])} (memenuhi kriteria {n(r['v3total'])}, tidak memenuhi {n(r['tmk_total'])}), kemajuan {r['kemajuan']:.3f}, {r['kab_diverifikasi']} dari {r['kab']} kab diverifikasi, "
          f"beban lapor Rp{n(r['beban_lapor'])} juta; tersalur menunggu RRP-2; leave-one-out rusak berat galat relatif median {statistics.median(galat):.2f})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
