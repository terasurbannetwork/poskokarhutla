"""HUK-1 Pemeriksa status peraturan (DESAIN-TEKNIS sec 4.1, 5.14; tiket RU-037).

Langkah jalan.py (harian). Masukan satu: public/data/bnpb/hukum/katalog.json (MB-1, dibangun hukum.py urai;
kunci `konflik` dan medan dok `status_teks`, `dicabut_oleh`). Tanpa jaringan, tanpa menghitung ulang status:
skrip ini hanya meringkas `konflik` untuk kartu Biro Hukum dan unduhan CSV (U7).

  konflik        = panjang katalog.konflik (JDIH BERLAKU, teks DICABUT)
  tanpa_teks     = dok dengan status_teks TIDAK_BISA_DICEK: tidak bisa diperiksa, dihitung terpisah (bukan "berlaku")
  berlaku_jdih   = dok dengan status JDIH BERLAKU

  python3 -I scripts/bnpb/unit/huk1.py --cek
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

AKAR = rapor.AKAR
KATALOG = os.path.join(AKAR, "public", "data", "bnpb", "hukum", "katalog.json")
TANPA_TEKS = "TIDAK_BISA_DICEK"


def singkat(d):
    """perka-1-2012 -> Perka 1/2012 (singkatan JDIH huruf awal besar)."""
    s = (d.get("singkatan") or d["id"].split("-")[0]).strip()
    return f"{s[:1].upper()}{s[1:].lower()} {d.get('nomor')}/{d.get('tahun')}"


def tentang(d):
    j = d.get("judul") or ""
    m = re.search(r"\btentang\s+(.+)$", j, re.I)
    return (m.group(1) if m else j).strip()[:300]


def tautan(id_dok):
    return "/bnpb/hukum#d=" + id_dok


def bangun(kat):
    dok = {d["id"]: d for d in kat["dok"]}
    rows = []
    for k in kat["konflik"]:
        d = dok.get(k["dok"])
        if d is None:
            raise ValueError(f"konflik {k['dok']} tidak ada di dok katalog")
        oleh = [dok[x] for x in k.get("dicabut_oleh") or [] if x in dok]
        rows.append({"dok": d["id"], "peraturan": singkat(d), "judul": tentang(d), "status_jdih": k["status_jdih"],
                     "status_teks": k["status_teks"], "dicabut_oleh": [{"dok": o["id"], "peraturan": singkat(o)} for o in oleh]})
    rows.sort(key=lambda r: r["dok"])
    tanpa = sum(d.get("status_teks") == TANPA_TEKS for d in kat["dok"])
    berlaku = sum(d.get("status") == "BERLAKU" for d in kat["dok"])
    k1 = rapor.kartu(
        id="huk1-konflik", sistem="HUK-1", pil="Status peraturan", ikon="resmi", judul="Daftar konflik status",
        angka=[{"k": "konflik", "label": "Berlaku di JDIH, tetapi dicabut menurut teks", "nilai": len(rows)},
               {"k": "berlaku_jdih", "label": "Peraturan berstatus berlaku di JDIH", "nilai": berlaku},
               {"k": "tanpa_teks", "label": "Tanpa teks terbaca, tidak bisa diperiksa", "nilai": tanpa,
                "title": "status_teks TIDAK_BISA_DICEK: dokumen tanpa isi terbaca, dihitung terpisah"},
               {"k": "dok", "label": "Dokumen di katalog", "nilai": len(kat["dok"])}],
        kolom=[{"k": "peraturan", "label": "Peraturan", "tautan": "peraturan_url"},
               {"k": "judul", "label": "Tentang"},
               {"k": "status_jdih", "label": "Menurut JDIH", "title": "status di jdih.bnpb.go.id"},
               {"k": "status_teks", "label": "Menurut teks", "title": "dibaca hukum.py dari pasal pencabutan di teks peraturan lain"},
               {"k": "oleh", "label": "Dicabut oleh (menurut teks)", "tautan": "oleh_url"}],
        baris=[{"peraturan": r["peraturan"], "peraturan_url": tautan(r["dok"]), "judul": r["judul"], "status_jdih": "Berlaku",
                "status_teks": "Dicabut", "oleh": ", ".join(o["peraturan"] for o in r["dicabut_oleh"]) or None,
                **({"oleh_url": tautan(r["dicabut_oleh"][0]["dok"])} if r["dicabut_oleh"] else {})} for r in rows],
        rumus="konflik = dokumen berstatus JDIH BERLAKU yang dicabut menurut pasal pencabutan di teks peraturan lain (hukum.py)",
        sumber=["katalog_hukum"], label=["resmi", "hitungan_kita"],
        tautan=[["/bnpb/hukum", "Buka pustaka hukum"]], unduh="status_peraturan.csv")
    sumber = [{"nama": "Katalog JDIH BNPB (dibangun Centurisk97 dari jdih.bnpb.go.id)", "url": "repo:public/data/bnpb/hukum/katalog.json",
               "diambil": kat["dibangun"], "lisensi": "dokumen publik JDIH BNPB"}]
    b = rapor.berkas([k1], sumber)
    b["data"] = {"ringkas": {"dok": len(kat["dok"]), "berlaku_jdih": berlaku, "konflik": len(rows), "tanpa_teks": tanpa},
                 "konflik": rows, "katalog_dibangun": kat["dibangun"]}
    return b


def _muat(p=KATALOG):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan():
    return {"status_peraturan": bangun(_muat())}


def cek():
    fx = {"dibangun": "2026-11-06T03:24:56Z", "dok": [
        {"id": "perka-1-2012", "singkatan": "PERKA", "nomor": "1", "tahun": 2012, "status": "BERLAKU", "status_teks": "DICABUT",
         "judul": "Peraturan Kepala BNPB Nomor 1 Tahun 2012 tentang Pedoman Umum Desa Tangguh Bencana", "dicabut_oleh": ["perban-7-2025"]},
        {"id": "perban-7-2025", "singkatan": "PERBAN", "nomor": "7", "tahun": 2025, "status": "BERLAKU", "status_teks": "BERLAKU",
         "judul": "Peraturan BNPB Nomor 7 Tahun 2025 tentang Destana", "dicabut_oleh": []},
        {"id": "sk-1-2010", "singkatan": "SK", "nomor": "1", "tahun": 2010, "status": "BERLAKU", "status_teks": TANPA_TEKS,
         "judul": "Keputusan tanpa teks", "dicabut_oleh": []},
        {"id": "perka-9-2009", "singkatan": "PERKA", "nomor": "9", "tahun": 2009, "status": "TIDAK BERLAKU", "status_teks": TANPA_TEKS,
         "judul": "Lama", "dicabut_oleh": []}],
        "konflik": [{"dok": "perka-1-2012", "status_jdih": "BERLAKU", "status_teks": "DICABUT", "dicabut_oleh": ["perban-7-2025"]}]}
    b = bangun(fx)
    r = b["data"]["ringkas"]
    assert r == {"dok": 4, "berlaku_jdih": 3, "konflik": 1, "tanpa_teks": 2}, r  # jumlah konflik = panjang konflik; tanpa teks terpisah
    k = b["kartu"][0]
    assert k["baris"][0]["peraturan"] == "Perka 1/2012" and k["baris"][0]["oleh"] == "Perban 7/2025", k["baris"]
    assert k["baris"][0]["peraturan_url"] == "/bnpb/hukum#d=perka-1-2012" and k["unduh"] == "status_peraturan.csv"
    assert k["baris"][0]["judul"] == "Pedoman Umum Desa Tangguh Bencana"
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    try:
        bangun({**fx, "konflik": fx["konflik"] + [{"dok": "tidak-ada", "status_jdih": "BERLAKU", "status_teks": "DICABUT"}]})
        raise AssertionError("konflik yatim tidak ditolak")
    except ValueError:
        pass
    # katalog nyata
    kat = _muat()
    nyata = bangun(kat)
    assert nyata["data"]["ringkas"]["konflik"] == len(kat["konflik"]), nyata["data"]["ringkas"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **nyata})
    teks = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in teks and not re.search(r"\baman\b", teks, re.I)
    print("huk1.py --cek: lulus ({konflik} konflik dari {dok} dokumen, {tanpa_teks} tanpa teks)".format(**nyata["data"]["ringkas"]))


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
