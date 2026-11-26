"""PUS-1 Rapor walidata Satu Data Bencana (DESAIN-TEKNIS sec 5.2; ALGORITMA sec 7.1; tiket RU-044).

Langkah jalan.py (harian). Masukan hanya lewat MB-8 panen.py (ckan_organisasi, ckan_paket: kolom daftar putih, tanpa email
dan nama orang). Per organisasi CKAN (Perban 1/2023 Pasal 8 huruf b):
  n_dataset          jumlah paket organisasi; 0 tampil 0 (itu data)                                  resmi
  umur_median_hari   median (hari ini WIB - tanggal WIB metadata_modified); 0 paket: None              hitungan
  persen_metadata    100 x paket dengan notes, license_id, maintainer, frequency terisi / n; 0 paket: None  hitungan, kolom wajib asumsi
  basi               paket dengan umur > 2 x periode(frequency), batas eksklusif                      hitungan
  tanpa_periode      paket dengan frequency kosong atau tak dikenali: tidak dinilai basi
  persen_prioritas   100 x data prioritas LAKIP Lampiran 9 yang cocok judul / 37; daftar belum diketik: None
Periode dari frequency: tabel PERIODE di bawah (asumsi ALGORITMA sec 13, sampai walidata menetapkan).

  python3 -I scripts/bnpb/unit/pus1.py --cek
"""
import json
import os
import re
import statistics
import sys
import unicodedata
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import panen  # noqa: E402
import rapor  # noqa: E402

PRIORITAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_prioritas.json")
# Asumsi (ALGORITMA 7.1): hari per periode pembaruan, padanan Inggris sama
PERIODE = {"harian": 1, "daily": 1, "mingguan": 7, "weekly": 7, "bulanan": 30, "monthly": 30,
           "triwulan": 91, "triwulanan": 91, "quarterly": 91, "semester": 182, "semesteran": 182,
           "tahunan": 365, "annual": 365, "annually": 365, "yearly": 365}
WAJIB = ("notes_ada", "license_id", "maintainer_ada", "frequency")
LABEL_WAJIB = "Asumsi: kolom metadata wajib bawaan (notes, license_id, maintainer, frequency) sampai walidata menetapkan"


def periode(f):
    return PERIODE.get(str(f).strip().lower()) if f else None


def _tgl_wib(cap):
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})", str(cap))
    if not m:
        raise panen.BentukBerubah(f"metadata_modified {cap!r} bukan cap waktu ISO")
    t = datetime(*map(int, m.groups()), tzinfo=timezone.utc)  # CKAN menyimpan UTC tanpa zona
    return (t + timedelta(hours=7)).date()


def basi(umur, per):
    """True/False; None bila periode tidak dinyatakan (tidak dinilai basi)."""
    return None if per is None else umur > 2 * per


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).lower()
    return " ".join(re.findall(r"[a-z0-9]+", s))


def organisasi(orgs, paket, hari):
    per_org = {o["name"]: [] for o in orgs}
    for p in paket:
        per_org.setdefault(p.get("organisasi") or "(tanpa organisasi)", []).append(p)
    judul = {o["name"]: o.get("title") or o["name"] for o in orgs}
    out = []
    for nama in sorted(per_org):
        ps = per_org[nama]
        umur = [(hari - _tgl_wib(p["metadata_modified"])).days for p in ps]
        nilai = [basi(u, periode(p.get("frequency"))) for u, p in zip(umur, ps)]
        lengkap = sum(all(p.get(k) for k in WAJIB) for p in ps)
        out.append({"kode": nama, "judul": judul.get(nama, nama), "n_dataset": len(ps),
                    "umur_median_hari": statistics.median(umur) if umur else None,
                    "persen_metadata": 100 * lengkap / len(ps) if ps else None,
                    "basi": sum(x is True for x in nilai), "tanpa_periode": sum(x is None for x in nilai)})
    return out


def prioritas(daftar, paket, n=37):
    if not daftar:
        return {"n": n, "terbit": None, "persen": None, "rinci": [], "alasan": "daftar 37 data prioritas LAKIP Lampiran 9 belum diketik"}
    judul = [(p["name"], norm(p.get("title") or "")) for p in paket]
    rinci = []
    for e in daftar:
        kunci = [norm(k) for k in e["kata_kunci"] if norm(k)]
        if not kunci:
            raise ValueError(f"data prioritas {e.get('judul')!r} tanpa kata kunci")
        cocok = next((nm for nm, j in judul if all(re.search(rf"\b{re.escape(k)}\b", j) for k in kunci)), None)
        rinci.append({"judul": e["judul"], "paket": cocok})
    terbit = sum(r["paket"] is not None for r in rinci)
    return {"n": n, "terbit": terbit, "persen": 100 * terbit / n, "rinci": rinci, "alasan": None}


def bangun(org, pkt, dp, hari):
    rows = organisasi(org["organisasi"], pkt["paket"], hari)
    pr = prioritas(dp["daftar"], pkt["paket"], dp["n"])
    isi = [{"produsen": r["judul"], "n_dataset": r["n_dataset"], "umur_median_hari": r["umur_median_hari"],
            "persen_metadata": r["persen_metadata"], "basi": r["basi"], "tanpa_periode": r["tanpa_periode"]} for r in rows]
    k1 = rapor.kartu(
        id="pus1-produsen", sistem="PUS-1", pil="Rapor walidata", ikon="data", judul="Per produsen data",
        angka=[{"k": "produsen", "label": "Produsen data", "nilai": len(rows)},
               {"k": "kosong", "label": "Belum menyetor dataset", "nilai": sum(r["n_dataset"] == 0 for r in rows)},
               {"k": "dataset", "label": "Dataset di portal", "nilai": pkt["jumlah"]},
               {"k": "basi", "label": "Dataset lewat 2 kali periode", "nilai": sum(r["basi"] for r in rows)}],
        kolom=[{"k": "produsen", "label": "Produsen"},
               {"k": "n_dataset", "label": "Dataset", "title": "Jumlah paket CKAN milik organisasi", "angka": True},
               {"k": "umur_median_hari", "label": "Umur median (hari)", "title": "Median (hari ini WIB - metadata_modified)", "angka": True},
               {"k": "persen_metadata", "label": "Metadata lengkap (%)", "title": "100 x paket dengan notes, license_id, maintainer, frequency terisi / n_dataset; " + LABEL_WAJIB, "angka": True},
               {"k": "basi", "label": "Basi", "title": "Umur lebih dari 2 x periode frequency (tabel periode asumsi)", "angka": True},
               {"k": "tanpa_periode", "label": "Periode tidak dinyatakan", "title": "frequency kosong atau tak dikenali: tidak dinilai basi", "angka": True}],
        baris=isi, rumus="persen_metadata = 100 x paket bermetadata lengkap / n_dataset; basi = umur > 2 x periode",
        sumber=["ckan_package_search", "ckan_organization_list"], label=["resmi", "hitungan_kita"])
    k2 = rapor.kartu(
        id="pus1-prioritas", sistem="PUS-1", pil="Rapor walidata", ikon="kalender", judul="Data prioritas LAKIP",
        angka=[{"k": "n", "label": "Data prioritas LAKIP Lampiran 9", "nilai": pr["n"]},
               {"k": "terbit", "label": "Sudah terbit di portal", "nilai": pr["terbit"], **({"title": pr["alasan"]} if pr["alasan"] else {})},
               {"k": "persen", "label": "Persen terbit", "nilai": pr["persen"]}],
        kolom=[{"k": "judul", "label": "Data prioritas"}, {"k": "paket", "label": "Paket CKAN yang cocok", "title": "semua kata kunci muncul di judul paket ternormal"}],
        baris=[{"judul": r["judul"], "paket": r["paket"] or "belum terbit"} for r in pr["rinci"]],
        rumus="persen = 100 x data prioritas yang cocok judul / 37", sumber=["data_prioritas", "ckan_package_search"],
        label=["resmi", "hitungan_kita"])
    sumber = list({s["url"]: s for s in org["sumber"] + pkt["sumber"]}.values())
    sumber.append({"nama": "LAKIP BNPB 2025 Lampiran 9", "url": "repo:scripts/bnpb/unit/data_prioritas.json", "diambil": "2026-11-26", "lisensi": "dokumen publik BNPB"})
    b = rapor.berkas([k1, k2], sumber)
    b["data"] = {"organisasi": rows, "prioritas": pr, "total": {"organisasi": len(rows), "dataset": pkt["jumlah"]},
                 "hari": hari.isoformat(), "periode": PERIODE}
    return b


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _hari_wib():
    return (datetime.now(timezone.utc) + timedelta(hours=7)).date()


def jalan():
    return {"satu_data": bangun(panen.ckan_organisasi(), panen.ckan_paket(), _muat(PRIORITAS), _hari_wib())}


def cek():
    hari = date(2026, 11, 5)
    # RU sec 2.7: bulanan umur 75 basi, 60 tidak (batas eksklusif); periode tak dinyatakan bukan basi
    assert basi(75, periode("bulanan")) is True and basi(60, periode("Monthly ")) is False and basi(61, 30) is True
    assert basi(999, periode(None)) is None and basi(999, periode("sewaktu-waktu")) is None
    assert _tgl_wib("2026-11-04T17:30:00.000000") == date(2026, 11, 5)  # 17.30 UTC = 00.30 WIB hari berikut
    # fixture CKAN lewat pintu daftar putih panen.py (tanpa jaringan)
    org = _muat(os.path.join(panen.FIXTURE, "organization_list.json"))["result"]
    org = {"organisasi": [{k: o.get(k) for k in panen.ORG_KOLOM} for o in org], "sumber": [
        {"nama": panen.CKAN_NAMA, "url": panen.CKAN + "organization_list", "diambil": "2026-11-05T01:00:00Z", "lisensi": "per paket (license_id)"}]}
    ps = [panen._paket(p) for p in _muat(os.path.join(panen.FIXTURE, "package_search.json"))["result"]["results"]]
    tua = dict(ps[0], name="dataset-tua", metadata_modified="2026-08-22T02:00:00", frequency="bulanan")      # umur 75: basi
    pas = dict(ps[0], name="dataset-pas", metadata_modified="2026-09-06T02:00:00", frequency="bulanan")      # umur 60: tidak
    lepas = dict(ps[0], name="dataset-lepas", metadata_modified="2020-01-01T02:00:00", frequency=None)       # tanpa periode
    paket = ps + [tua, pas, lepas]
    pkt = {"paket": paket, "jumlah": len(paket), "sumber": [
        {"nama": panen.CKAN_NAMA, "url": panen.CKAN + "package_search", "diambil": "2026-11-05T01:00:00Z", "lisensi": "per paket (license_id)"}]}
    b = bangun(org, pkt, _muat(PRIORITAS), hari)
    o = {r["kode"]: r for r in b["data"]["organisasi"]}
    a = o["direktorat-a"]
    assert a["n_dataset"] == 0 and a["umur_median_hari"] is None and a["persen_metadata"] is None and a["basi"] == 0, a
    bb = o["direktorat-b"]  # dataset-1, -2, -tua, -pas, -lepas
    assert bb["n_dataset"] == 5 and bb["basi"] == 1 and bb["tanpa_periode"] == 1, bb
    assert bb["persen_metadata"] == 100 * 3 / 5, bb  # dataset-2 tanpa notes dan maintainer; -lepas tanpa frequency
    assert bb["umur_median_hari"] == 75, bb
    c = o["pusat-c"]
    assert c["n_dataset"] == 1 and c["tanpa_periode"] == 1 and c["basi"] == 0 and c["persen_metadata"] == 0, c
    k = b["kartu"][0]
    sel = {x["produsen"]: x for x in k["baris"]}
    assert sel["Direktorat A"]["n_dataset"] == 0 and sel["Direktorat A"]["persen_metadata"] is None
    # data prioritas: daftar belum diketik -> None, bukan 0; daftar terisi dicocokkan per kata kunci
    pr = b["data"]["prioritas"]
    assert pr["terbit"] is None and pr["persen"] is None and pr["n"] == 37, pr
    pr2 = prioritas([{"judul": "Contoh 1", "kata_kunci": ["dataset", "1"]}, {"judul": "Lain", "kata_kunci": ["peta", "risiko"]}], paket)
    assert pr2["terbit"] == 1 and pr2["rinci"][0]["paket"] == "dataset-1" and pr2["rinci"][1]["paket"] is None, pr2
    assert abs(pr2["persen"] - 100 / 37) < 1e-12
    try:
        prioritas([{"judul": "x", "kata_kunci": [" "]}], paket)
        raise AssertionError("kata kunci kosong tidak ditolak")
    except ValueError:
        pass
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    teks = json.dumps(b, ensure_ascii=False)
    assert "@" not in teks and "Penulis A" not in teks and "Pengelola" not in teks, "nama atau email bocor"
    assert not re.search(r"\baman\b", teks, re.I) and "·" not in teks
    dp = _muat(PRIORITAS)
    assert dp["n"] == 37 and isinstance(dp["daftar"], list) and (not dp["daftar"] or len(dp["daftar"]) == 37), "daftar harus kosong atau tepat 37"
    print(f"pus1.py --cek: lulus (fixture {len(paket)} paket; data prioritas {len(dp['daftar'])} dari 37 diketik)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
