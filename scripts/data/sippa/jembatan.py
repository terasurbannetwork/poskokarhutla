#!/usr/bin/env python3
"""SIPPA SP-090: jembatan rusak DIBI 2018-2025 dan program jembatan per pemilik (keputusan 56, DT 3.1.9, 3.1.10, 7.2).

Masukan : data/kajian-bnpb/data/dibi/rekap_{provinsi,nasional}_tahunan.csv, kunci rehab.jembatan.* dan rehab.dibi.jembatan_rusak.*
          di data/kajian-bnpb/data/angka.json (nilai tidak disalin ke sini; dibaca dari sana)
Keluaran: data/sippa/keluaran/{jembatan_dibi,program_jembatan}.json  ($SIPPA_KELUAR menimpa folder)
Pakai   : python3 scripts/data/sippa/jembatan.py   |   python3 scripts/data/sippa/jembatan.py uji
Python 3.12 stdlib. Hanya bencana alam, cakupan `bencana`; tahun 2018-2025 (kolom jembatan_rusak kosong sebelum 2018).
Program: hanya keyakinan resmi atau terverifikasi dan wajib `rujukan`; angka berlabel asumsi-kebijakan atau media tidak dimuat (rehab Q16).
"""
import csv
import json
import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))  # append, bukan insert: `python3 -I` tidak memuat folder skrip
import bersama as bs  # noqa: E402

AKAR = Path(__file__).resolve().parents[3]
DIBI = AKAR / "data" / "kajian-bnpb" / "data" / "dibi"
ANGKA = AKAR / "data" / "kajian-bnpb" / "data" / "angka.json"
KELUAR = Path(os.environ.get("SIPPA_KELUAR") or AKAR / "data" / "sippa" / "keluaran")
TAHUN_AWAL, TAHUN_AKHIR = 2018, 2025
JENIS = {"101": "banjir", "102": "longsor", "103": "gelombang", "104": "cuaca_ekstrem", "107": "gempa", "108": "tsunami", "109": "erupsi"}
TANPA_JEMBATAN = {"105", "106"}  # kekeringan dan karhutla: bukan jenis keluaran; wajib nol
JENIS_ANGKA = {j: f"rehab.dibi.jembatan_rusak.{j}.2018_2025" for j in ("banjir", "longsor", "gempa", "erupsi", "cuaca_ekstrem", "gelombang", "tsunami")}
KEYAKINAN_PROGRAM = ("resmi", "terverifikasi")
PEMILIK = ("tniad", "polri", "pu", "bnpb_dsp")
TERLARANG = ("media", "sekunder", "asumsi")  # kata penanda sumber yang tidak boleh ada di `rujukan`

# Program: nilai dibaca dari angka.json lewat kunci; keyakinan dan rujukan ikut entri angka.
# (pemilik, program, tanggal, kunci titik, kunci selesai, kunci wilayah_bencana, catatan)
P = "rehab.jembatan."
PROGRAM = [
    ("tniad", "Satgas Pembangunan Jembatan TNI AD", "2026-08-13", P + "garuda.titik_2026_08", P + "garuda.selesai_2026_08",
     P + "garuda.titik_wilayah_bencana_2026_08", "Rilis tidak menjelaskan hubungan 798 titik wilayah bencana dengan 3.008 titik."),
    ("tniad", "Program Jembatan TNI AD, peresmian 218 unit", "2026-03-09", P + "tniad.dikerjakan_2026_03", P + "tniad.diresmikan_2026_03",
     P + "tniad.wilayah_bencana_survei_2026_03", "Wilayah bencana: 480 unit hasil survei, 145 selesai (rilis tidak menyatakan 145 bagian dari 218)."),
    ("polri", "Jembatan Merah Putih Presisi", "2026-08-13", P + "polri_mpp.jumlah_total_2026_08", P + "polri_mpp.selesai_2026_08", None,
     "874 selesai, 17 dibangun, 4 perencanaan; 30 Polda."),
    ("polri", "Jembatan Merah Putih Presisi", "2026-01-14", P + "polri_mpp.jumlah_2026_01", P + "polri_mpp.selesai_2026_01",
     P + "polri_mpp.wilayah_bencana_2026_01", "Per 14 Januari 2026; 17 dari 34 unit wilayah bencana selesai."),
    ("pu", "Jembatan gantung Kementerian PU, paket 2025", "2025-10-16", P + "pu.gantung_2025_unit", None, None,
     "43 paket; progres fisik 81% awal Oktober 2025; tidak dikaitkan dengan bencana."),
    ("pu", "Jembatan gantung Kementerian PU, rencana 2026", "2025-10-16", P + "pu.gantung_2026_unit_rencana", None, None,
     "Rencana, bukan realisasi."),
    ("pu", "Jembatan gantung Ditjen Bina Marga, target 2026", "2026-09-01", P + "pu.gantung_2026_unit_target_balai", None, None,
     "105 jembatan di 25 provinsi (BBPJN Jateng-DIY); berbeda dengan rencana 122 unit, ditulis berdampingan."),
    ("bnpb_dsp", "Penggantian jembatan bailey tanggap darurat BNPB 2024", "2025-12-31", P + "bnpb.bailey_penggantian_2024", None, None,
     "Di luar Aceh, Sumut, Sumbar."),
    ("bnpb_dsp", "Penggantian jembatan bailey tanggap darurat BNPB 2025", "2025-12-31", P + "bnpb.bailey_penggantian_2025", None, None,
     "Di luar Aceh, Sumut, Sumbar."),
]


def baca_csv(nama):
    with open(DIBI / nama, newline="", encoding="utf-8") as h:
        return list(csv.DictReader(h))


def _int(x, ket):
    if not isinstance(x, str) or not x.strip().lstrip("-").isdigit() or int(x) < 0:
        raise ValueError(f"{ket}: jembatan_rusak '{x}' bukan bilangan bulat 0 atau lebih")
    return int(x)


def _alam(rows):
    return [r for r in rows if r["klasifikasi"] == "alam" and r["cakupan"] == "bencana"]


def _jenis(r):
    k = r["kode_jenis_juklak"]
    if k in TANPA_JEMBATAN:
        if _int(r["jembatan_rusak"], k) != 0:
            raise ValueError(f"jenis {k} ({r['kategori_dibi']}) tidak boleh punya jembatan_rusak > 0: {r['jembatan_rusak']}")
        return None
    if k not in JENIS:
        raise ValueError(f"kode jenis tak dikenal '{k}' ({r['kategori_dibi']})")
    return JENIS[k]


def cek_baris_dibi(b):
    if not isinstance(b["tahun"], int) or not TAHUN_AWAL <= b["tahun"] <= TAHUN_AKHIR:
        raise ValueError(f"tahun {b['tahun']} di luar {TAHUN_AWAL}-{TAHUN_AKHIR} (kolom kosong sebelum 2018)")
    if b["jenis"] not in JENIS.values():
        raise ValueError(f"jenis '{b['jenis']}' tak dikenal")
    if not isinstance(b["jembatan_rusak"], int) or isinstance(b["jembatan_rusak"], bool) or b["jembatan_rusak"] < 0:
        raise ValueError(f"jembatan_rusak {b['jembatan_rusak']!r} bukan bilangan bulat 0 atau lebih")
    if not b["prov"] or not str(b["prov"]).isdigit():
        raise ValueError(f"kode provinsi '{b['prov']}' bukan angka")
    return b


def _jumlah(rows, ket):
    """{(tahun, jenis): jumlah} dari baris alam/bencana tahun 2018-2025; baris sebelum 2018 wajib nol."""
    j = {}
    for r in _alam(rows):
        t, n = int(r["tahun"]), _int(r["jembatan_rusak"], ket)
        jn = _jenis(r)
        if t < TAHUN_AWAL:
            if n:
                raise ValueError(f"{ket}: tahun {t} berisi {n} jembatan, kolom wajib kosong sebelum {TAHUN_AWAL}")
        elif t <= TAHUN_AKHIR and jn:
            j[(t, jn)] = j.get((t, jn), 0) + n
    return j


def baris_dibi(prov_rows, nas_rows):
    """Baris prov x tahun x jenis (> 0) dan ringkas nasional; jumlah per provinsi wajib sama dengan nasional per tahun dan jenis."""
    per = {}
    for r in _alam(prov_rows):
        t = int(r["tahun"])
        jn = _jenis(r)
        n = _int(r["jembatan_rusak"], "provinsi")
        if t < TAHUN_AWAL:
            if n:
                raise ValueError(f"provinsi {r['kode_prov']}: tahun {t} berisi {n} jembatan, kolom wajib kosong sebelum {TAHUN_AWAL}")
        elif t <= TAHUN_AKHIR and jn and n:
            kunci = (str(r["kode_prov"]).zfill(2), t, jn)
            per[kunci] = per.get(kunci, 0) + n
    baris = [cek_baris_dibi({"prov": p, "kab": None, "tahun": t, "jenis": jn, "jembatan_rusak": n})
             for (p, t, jn), n in sorted(per.items())]
    dari_prov = {}
    for b in baris:
        k = (b["tahun"], b["jenis"])
        dari_prov[k] = dari_prov.get(k, 0) + b["jembatan_rusak"]
    nas = _jumlah(nas_rows, "nasional")
    beda = {k: (dari_prov.get(k, 0), nas.get(k, 0)) for k in set(dari_prov) | set(nas) if dari_prov.get(k, 0) != nas.get(k, 0)}
    if beda:
        raise ValueError(f"jumlah provinsi != nasional (tahun, jenis): (provinsi, nasional) {sorted(beda.items())[:5]}")
    total = sum(nas.values())
    banjir = sum(n for (t, j), n in nas.items() if j == "banjir")
    return baris, {"total_2018_2025": total, "total_2025": sum(n for (t, j), n in nas.items() if t == TAHUN_AKHIR),
                   "porsi_banjir_persen": round(banjir / total * 100, 1) if total else None,
                   "per_jenis_2018_2025": {j: sum(n for (t, jn), n in nas.items() if jn == j) for j in JENIS.values()},
                   "per_tahun": {str(t): sum(n for (tt, j), n in nas.items() if tt == t) for t in range(TAHUN_AWAL, TAHUN_AKHIR + 1)}}


def baca_angka():
    return json.loads(ANGKA.read_text(encoding="utf-8"))["angka"]


def samakan_angka(ringkas, angka):
    """Ringkasan wajib sama dengan kunci rehab.dibi.jembatan_rusak.* (RU §4.1)."""
    ak = "rehab.dibi.jembatan_rusak."
    cocok = {"total_2018_2025": ak + "2018_2025", "total_2025": ak + "2025", "porsi_banjir_persen": ak + "porsi_banjir_persen"}
    for f, k in cocok.items():
        assert ringkas[f] == angka[k]["nilai"], f"{f} = {ringkas[f]} != {k} = {angka[k]['nilai']}"
    for j, k in JENIS_ANGKA.items():
        assert ringkas["per_jenis_2018_2025"][j] == angka[k]["nilai"], f"{j} = {ringkas['per_jenis_2018_2025'][j]} != {k} = {angka[k]['nilai']}"


def _label(e):
    return str(e.get("keyakinan", "")).split(";")[0].strip()


def cek_program(b):
    if b["pemilik"] not in PEMILIK:
        raise ValueError(f"pemilik '{b['pemilik']}' bukan salah satu {PEMILIK}")
    if b["keyakinan"] not in KEYAKINAN_PROGRAM:
        raise ValueError(f"{b['program']}: keyakinan '{b['keyakinan']}' ditolak, hanya {KEYAKINAN_PROGRAM}")
    if not b.get("rujukan") or not str(b["rujukan"]).strip():
        raise ValueError(f"{b['program']}: baris tanpa rujukan ditolak")
    if any(t in b["rujukan"].lower() for t in TERLARANG):
        raise ValueError(f"{b['program']}: rujukan bersumber media atau sekunder ditolak")
    if not b.get("program") or not b.get("tanggal"):
        raise ValueError("program dan tanggal wajib")
    return b


def program(angka):
    baris = []
    for pemilik, nama, tanggal, kt, ks, kw, cat in PROGRAM:
        kunci = [k for k in (kt, ks, kw) if k]
        e = [angka[k] for k in kunci]
        if any(_label(x) not in KEYAKINAN_PROGRAM for x in e):
            raise ValueError(f"{nama}: keyakinan {[_label(x) for x in e]} ditolak, hanya {KEYAKINAN_PROGRAM}")
        nilai = lambda k: None if k is None else angka[k]["nilai"]  # noqa: E731
        sumber = "; ".join(dict.fromkeys(f"{x['pustaka']}: {x['sumber']}" for x in e))
        baris.append(cek_program({"pemilik": pemilik, "program": nama, "tanggal": tanggal, "titik": nilai(kt), "selesai": nilai(ks),
                                  "wilayah_bencana": nilai(kw), "biaya_satuan_rp": None,
                                  "keyakinan": "resmi" if all(_label(x) == "resmi" for x in e) else "terverifikasi",
                                  "rujukan": f"{sumber} (angka.json {', '.join(kunci)})", "catatan": cat}))
    return baris


def bangun():
    angka = baca_angka()
    baris, ringkas = baris_dibi(baca_csv("rekap_provinsi_tahunan.csv"), baca_csv("rekap_nasional_tahunan.csv"))
    samakan_angka(ringkas, angka)
    sumber_dibi = [{"nama": "DIBI BNPB, bencana alam (kode 101-109), cakupan bencana, rekap provinsi dan nasional tahunan", "lisensi": "data publik pemerintah", "tarik": "2026-10-23"}]
    dibi = {**bs.kepala("2018-2025", {"tahun_awal": TAHUN_AWAL, "tahun_akhir": TAHUN_AKHIR}, sumber_dibi,
                        "DIBI per kabupaten belum ditarik: kab null. Kolom jembatan_rusak kosong sebelum 2018. Patahan seri 2024 (penyaringan ambang) menurunkan angka sesudah 2024.",
                        "sippa_jembatan_dibi/1"),
            "keyakinan": "resmi", "ringkas": ringkas, "baris": baris}
    sumber_prog = [{"nama": "Setneg, Setkab, Tribratanews Polri, Kementerian PU (ePPID), Ditjen Bina Marga, BNPB (angka.json rehab.jembatan.*)", "lisensi": "rilis resmi", "tarik": "2026-10-23"}]
    prog = {**bs.kepala("2026-08-13", None, sumber_prog,
                        "Hanya baris resmi atau terverifikasi dengan rujukan; angka media dan biaya satuan berlabel asumsi-kebijakan tidak dimuat (biaya_satuan_rp null). "
                        "Daftar per titik, bila diterima dari TNI AD, Polri, Kementerian PU, diimpor staf sebagai aset jembatan_permanen, bukan ke berkas ini.",
                        "sippa_program_jembatan/1"),
            "baris": program(angka)}
    return dibi, prog


def tulis():
    dibi, prog = bangun()
    for nama, doc in (("jembatan_dibi", dibi), ("program_jembatan", prog)):
        print(nama + ".json", bs.tulis_json(str(KELUAR / (nama + ".json")), doc), "byte")


# ---------- self-check ----------
def _ditolak(f, *a, kata=""):
    try:
        f(*a)
    except (ValueError, AssertionError) as e:
        assert kata in str(e), f"pesan '{e}' tanpa '{kata}'"
        return
    raise AssertionError(f"{f.__name__}{a} harus ditolak")


def uji():
    angka = baca_angka()
    prov, nas = baca_csv("rekap_provinsi_tahunan.csv"), baca_csv("rekap_nasional_tahunan.csv")
    baris, r = baris_dibi(prov, nas)
    # reproduksi masukan nyata
    assert r["total_2018_2025"] == 3833 and r["total_2025"] == 1088 and r["porsi_banjir_persen"] == 89.2, r
    samakan_angka(r, angka)
    assert sum(r["per_tahun"].values()) == 3833 and r["per_tahun"]["2025"] == 1088 and r["per_tahun"]["2018"] == 275, r["per_tahun"]
    # invarian: tahun hanya 2018-2025, jumlah per provinsi = nasional per tahun, nol sebelum 2018, tanpa duplikat kunci
    assert {b["tahun"] for b in baris} <= set(range(2018, 2026)) and all(cek_baris_dibi(b) for b in baris)
    assert len({(b["prov"], b["tahun"], b["jenis"]) for b in baris}) == len(baris)
    assert sum(b["jembatan_rusak"] for b in baris) == 3833
    assert not any(int(x["jembatan_rusak"]) for x in _alam(nas) if int(x["tahun"]) < 2018)
    # penolakan
    _ditolak(cek_baris_dibi, {"prov": "11", "kab": None, "tahun": 2017, "jenis": "banjir", "jembatan_rusak": 1}, kata="2017")
    _ditolak(cek_baris_dibi, {"prov": "11", "kab": None, "tahun": 2026, "jenis": "banjir", "jembatan_rusak": 1}, kata="2026")
    _ditolak(cek_baris_dibi, {"prov": "11", "kab": None, "tahun": 2020, "jenis": "banjir", "jembatan_rusak": -1}, kata="bilangan bulat")
    _ditolak(cek_baris_dibi, {"prov": "11", "kab": None, "tahun": 2020, "jenis": "kekeringan", "jembatan_rusak": 1}, kata="tak dikenal")
    awal = [dict(x) for x in prov]
    for x in awal:
        if x["klasifikasi"] == "alam" and x["cakupan"] == "bencana" and x["tahun"] == "2012":
            x["jembatan_rusak"] = "3"
            break
    _ditolak(baris_dibi, awal, nas, kata="wajib kosong sebelum 2018")
    ubah = [dict(x) for x in prov]
    for x in ubah:
        if x["klasifikasi"] == "alam" and x["cakupan"] == "bencana" and x["tahun"] == "2025" and x["kode_jenis_juklak"] == "101" and int(x["jembatan_rusak"]) > 0:
            x["jembatan_rusak"] = str(int(x["jembatan_rusak"]) + 1)
            break
    _ditolak(baris_dibi, ubah, nas, kata="provinsi != nasional")
    kering = [dict(x) for x in prov]
    for x in kering:
        if x["klasifikasi"] == "alam" and x["cakupan"] == "bencana" and x["kode_jenis_juklak"] == "105":
            x["jembatan_rusak"] = "1"
            break
    _ditolak(baris_dibi, kering, nas, kata="tidak boleh punya jembatan_rusak")
    _ditolak(baris_dibi, [{**prov[0], "jembatan_rusak": "x"}], nas, kata="bilangan bulat")
    _ditolak(samakan_angka, {**r, "total_2025": 1087}, angka, kata="total_2025")
    # program: hanya resmi/terverifikasi, wajib rujukan
    pr = program(angka)
    assert len(pr) == len(PROGRAM) and all(cek_program(b) for b in pr)
    assert all(b["keyakinan"] in KEYAKINAN_PROGRAM and b["rujukan"] and b["biaya_satuan_rp"] is None for b in pr)
    assert {b["pemilik"] for b in pr} == set(PEMILIK), "tiap pemilik wajib punya program"
    g = pr[0]
    assert (g["titik"], g["selesai"], g["wilayah_bencana"]) == (3008, 2500, 798), g
    basis = {"pemilik": "pu", "program": "x", "tanggal": "2026-01-01", "keyakinan": "resmi", "rujukan": "angka.json k"}
    assert cek_program(basis)
    _ditolak(cek_program, {**basis, "rujukan": ""}, kata="tanpa rujukan")
    _ditolak(cek_program, {k: v for k, v in basis.items() if k != "rujukan"}, kata="tanpa rujukan")
    _ditolak(cek_program, {**basis, "keyakinan": "asumsi-kebijakan"}, kata="ditolak")
    _ditolak(cek_program, {**basis, "keyakinan": "estimasi-model"}, kata="ditolak")
    _ditolak(cek_program, {**basis, "rujukan": "iNews, sekunder"}, kata="media atau sekunder")
    _ditolak(cek_program, {**basis, "pemilik": "swasta"}, kata="pemilik")
    asumsi = {**angka, P + "pu.gantung_2025_unit": {**angka[P + "pu.gantung_2025_unit"], "keyakinan": "asumsi-kebijakan"}}
    _ditolak(program, asumsi, kata="ditolak")
    # keluaran utuh: kepala berurutan, tanpa NaN, bukan salinan di public/
    dibi, prog = bangun()
    for n, d in (("jembatan_dibi", dibi), ("program_jembatan", prog)):
        assert bs.cek_keluaran(d, n) and list(d)[0] == "dibuat" and len(bs.cek_keluaran(d).encode()) <= 8 * 1024 * 1024
        assert not list((AKAR / "public").rglob(n + "*.json")), f"{n}: salinan di public/ dilarang"
    _ditolak(bs.cek_keluaran, {**dibi, "ringkas": {"x": float("nan")}}, kata="")
    print(f"jembatan.py uji: OK (3.833 = 2018-2025, 1.088 = 2025, 89,2% banjir; {len(baris)} baris DIBI; {len(pr)} program)")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif not sys.argv[1:]:
        tulis()
    else:
        sys.exit("pakai: jembatan.py [uji]")
