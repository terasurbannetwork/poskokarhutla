"""SPB-1 Peta NSPK per fase dan jenis bencana, dengan target Renstra (DESAIN-TEKNIS sec 6.4; tiket RU-075).

Langkah jalan.py (harian). Masukan: public/data/bnpb/hukum/katalog.json (MB-1, hukum.py; tidak diubah di sini) dan
scripts/bnpb/unit/renstra_nspk.json (Renstra BNPB 2025-2029 Lampiran III, 75 butir, diketik sekali).
  berlaku efektif = status JDIH BERLAKU dan TIDAK ada di konflik (dicabut menurut teks peraturan lain)
  fase dan jenis bencana per dokumen = kamus kata kunci judul dan subjek di bawah (satu dokumen boleh lintas fase);
  koreksi lewat unit_ketuk berkas usulan_nspk menunggu RU-034
  target Renstra terbit = ada dokumen berlaku efektif yang judulnya memuat kata butir, tahunnya >= target - 1, dan bukan
  dokumen lama yang direvisi; belum terbit dan tahun ini > target = lewat target
Kamus fase adalah penilaian analis (asumsi), bukan klasifikasi resmi.

  python3 -I scripts/bnpb/unit/spb1.py --cek
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import huk1  # noqa: E402
import rapor  # noqa: E402

AKAR = rapor.AKAR
RENSTRA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "renstra_nspk.json")
FASE = {   # urutan = urutan baris matriks
    "pra": r"risiko|pencegahan|mitigasi|kesiapsiagaan|peringatan dini|kontinjensi|kontingensi|tangguh|pengurangan|prabencana|pra bencana|"
           r"rencana penanggulangan bencana|rencana nasional|rencana induk|madrasah|rambu|edukasi|gladi|simulasi|kajian",
    "darurat": r"darurat|tanggap|pengungsi|siap pakai|reaksi cepat|posko|komando|evakuasi|pencarian|kaji cepat|logistik|pusdalops|"
               r"pengendalian operasi",
    "pasca": r"rehabilitasi|rekonstruksi|pasca ?bencana|pemulihan|kebutuhan pascabencana|stimulan|hibah|jitupasna|hunian",
}
NAMA_FASE = {"pra": "Prabencana", "darurat": "Tanggap darurat", "pasca": "Pascabencana", "umum": "Umum dan tata kelola"}
BENCANA = [("banjir", r"banjir"), ("longsor", r"longsor|gerakan tanah"), ("gempa", r"gempa"), ("tsunami", r"tsunami"),
           ("gunungapi", r"gunung ?api|erupsi|letusan"), ("karhutla", r"kebakaran hutan|karhutla|kebakaran lahan"),
           ("kekeringan", r"kekeringan"), ("cuaca", r"cuaca|angin|siklon")]
SEMUA = "semua bahaya"


def fase(teks):
    t = (teks or "").lower()
    f = [k for k, pola in FASE.items() if re.search(pola, t)]
    return f or ["umum"]


def bencana(teks):
    t = (teks or "").lower()
    return [k for k, pola in BENCANA if re.search(pola, t)] or [SEMUA]


def berlaku(kat):
    konflik = {k["dok"] for k in kat.get("konflik") or []}
    return [d for d in kat["dok"] if d.get("status") == "BERLAKU" and d["id"] not in konflik]


def target(butir, dok_berlaku, tahun_ini):
    out = []
    for b in butir:
        cocok = [d for d in dok_berlaku if b["kata"] in (d.get("judul") or "").lower() and (d.get("tahun") or 0) >= b["target"] - 1
                 and d["id"] != b.get("ganti")]
        cocok.sort(key=lambda d: (-(d.get("tahun") or 0), d["id"]))
        st = "terbit" if cocok else ("lewat_target" if tahun_ini > b["target"] else "belum_jatuh_tempo")
        out.append({**b, "status": st, "dokumen": cocok[0]["id"] if cocok else None})
    return out


def bangun(kat, renstra, tahun_ini):
    dok = berlaku(kat)
    konflik = len({k["dok"] for k in kat.get("konflik") or []})
    sel = {}
    for d in dok:
        teks = f"{d.get('judul') or ''} {d.get('subjek') or ''}"
        for f in fase(teks):
            for bn in bencana(teks):
                sel.setdefault((f, d.get("jenis") or "lain"), {}).setdefault(bn, set()).add(d["id"])
    kol_b = [k for k, _ in BENCANA] + [SEMUA]
    baris = []
    for f in NAMA_FASE:
        for j in sorted({j for (ff, j) in sel if ff == f}):
            isi = sel[(f, j)]
            baris.append({"fase": NAMA_FASE[f], "jenis": j, **{b.replace(" ", "_"): len(isi.get(b, ())) for b in kol_b},
                          "total": len(set().union(*isi.values()))})
    tg = target(renstra["butir"], dok, tahun_ini)
    n = lambda st: sum(t["status"] == st for t in tg)  # noqa: E731
    k1 = rapor.kartu(
        id="spb1-matriks", sistem="SPB-1", pil="Peta NSPK", ikon="resmi", judul="Matriks NSPK berlaku per fase dan bahaya",
        angka=[{"k": "berlaku", "label": "Dokumen berlaku efektif di katalog", "nilai": len(dok),
                "title": "status JDIH berlaku dan tidak dicabut menurut teks peraturan lain"},
               {"k": "konflik", "label": "Berlaku di JDIH tetapi dicabut menurut teks, tidak dihitung", "nilai": konflik}],
        kolom=[{"k": "fase", "label": "Fase", "title": "kamus kata kunci judul dan subjek (asumsi analis); satu dokumen boleh lintas fase"},
               {"k": "jenis", "label": "Jenis NSPK"},
               *[{"k": b.replace(" ", "_"), "label": b.capitalize() if b != SEMUA else "Semua bahaya", "angka": True,
                  "title": "jumlah dokumen berlaku efektif" + ("; tanpa jenis bahaya di judul" if b == SEMUA else "")} for b in kol_b],
               {"k": "total", "label": "Dokumen", "angka": True, "title": "dokumen unik di sel baris ini"}],
        baris=baris, rumus="isi sel = jumlah dokumen berlaku efektif yang judul atau subjeknya memuat kata fase dan kata bahaya",
        sumber=["katalog_hukum"], label=["resmi", "hitungan_kita"], asumsi=["Asumsi: kamus fase dan bahaya"],
        tautan=[["/bnpb/hukum", "Buka pustaka hukum"]], unduh="matriks_nspk.csv")
    NAMA_ST = {"terbit": "terbit", "lewat_target": "lewat tahun target", "belum_jatuh_tempo": "belum jatuh tempo"}
    k2 = rapor.kartu(
        id="spb1-renstra", sistem="SPB-1", pil="Peta NSPK", ikon="kalender", judul="Target regulasi Renstra 2025-2029",
        angka=[{"k": "butir", "label": "Butir Lampiran III", "nilai": len(tg)},
               {"k": "terbit", "label": "Terbit menurut katalog", "nilai": n("terbit")},
               {"k": "lewat", "label": "Belum terbit, lewat tahun target", "nilai": n("lewat_target")},
               {"k": "belum", "label": "Belum jatuh tempo", "nilai": n("belum_jatuh_tempo")}],
        kolom=[{"k": "no", "label": "No", "angka": True}, {"k": "judul", "label": "Kebutuhan regulasi"},
               {"k": "target", "label": "Target", "title": "tahun akhir kolom Target Penyelesaian Lampiran III"},
               {"k": "status", "label": "Status", "title": "terbit = dokumen berlaku efektif berjudul cocok dan bertahun >= target - 1"},
               {"k": "dok", "label": "Dokumen pengganti", "tautan": "dok_url"}],
        baris=[{"no": t["no"], "judul": t["judul"], "target": str(t["target"]), "status": NAMA_ST[t["status"]],
                "dok": huk1.singkat(next(d for d in dok if d["id"] == t["dokumen"])) if t["dokumen"] else None,
                **({"dok_url": huk1.tautan(t["dokumen"])} if t["dokumen"] else {})} for t in tg],
        rumus="terbit bila ada dokumen berlaku efektif yang judulnya memuat frasa butir dan tahunnya >= target - 1",
        sumber=["katalog_hukum", "renstra_nspk"], label=["resmi", "hitungan_kita"], asumsi=["Asumsi: frasa pencocok judul"], unduh="target_renstra_nspk.csv")
    src = [{"nama": "Katalog JDIH BNPB (hukum.py)", "url": "repo:public/data/bnpb/hukum/katalog.json", "diambil": kat["dibangun"][:10], "lisensi": "dokumen publik JDIH BNPB"},
           {"nama": "Renstra BNPB 2025-2029 Lampiran III (Perban 5/2025)", "url": "repo:scripts/bnpb/unit/renstra_nspk.json", "diambil": "2026-11-26", "lisensi": "peraturan, domain publik"}]
    b = rapor.berkas([k1, k2], src)
    b["data"] = {"berlaku": [d["id"] for d in dok], "matriks": baris, "target": tg, "tahun": tahun_ini,
                 "koreksi": "menunggu RU-034 (unit_ketuk berkas usulan_nspk)"}
    return b


def _json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan():
    return {"peta_nspk": bangun(_json(huk1.KATALOG), _json(RENSTRA), (datetime.now(timezone.utc) + timedelta(hours=7)).year)}


def cek():
    assert fase("Rencana Kontingensi Bencana") == ["pra"] and fase("Penanganan Pengungsi pada Keadaan Darurat") == ["darurat"]
    assert fase("Tata Naskah Dinas") == ["umum"] and sorted(fase("Rehabilitasi dan Rekonstruksi Pascabencana Banjir")) == ["pasca"]
    assert bencana("Pedoman Gladi Tsunami dan Gempa") == ["gempa", "tsunami"] and bencana("Pedoman Umum") == [SEMUA]
    D = lambda i, judul, tahun, st="BERLAKU", jenis="Peraturan Badan": {"id": i, "judul": judul, "tahun": tahun, "status": st, "jenis": jenis, "subjek": "", "singkatan": "PERBAN", "nomor": i.split("-")[1]}  # noqa: E731
    kat = {"dibangun": "2026-11-26", "dok": [D("perban-1-2026", "Peraturan tentang Penyusunan Rencana Kontingensi Banjir", 2026),
                                             D("perka-4-2008", "Pedoman Penyusunan Rencana Penanggulangan Bencana", 2008),
                                             D("perban-3-2026", "Peraturan tentang Penyusunan Rencana Penanggulangan Bencana", 2026),
                                             D("perban-9-2020", "Penanganan Pengungsi Banjir", 2020, "TIDAK BERLAKU")],
           "konflik": [{"dok": "perka-4-2008", "status_jdih": "BERLAKU", "status_teks": "DICABUT", "dicabut_oleh": ["perban-3-2026"]}]}
    renstra = {"butir": [{"no": 6, "judul": "Revisi Perka 4/2008", "kata": "penyusunan rencana penanggulangan bencana", "target": 2025, "ganti": "perka-4-2008"},
                         {"no": 11, "judul": "Revisi Perban 2/2023", "kata": "rencana kontingensi", "target": 2027, "ganti": "perban-2-2023"},
                         {"no": 3, "judul": "Indeks Risiko", "kata": "indeks risiko bencana", "target": 2025, "ganti": None},
                         {"no": 58, "judul": "Manajemen talenta", "kata": "manajemen talenta", "target": 2028, "ganti": None}]}
    b = bangun(kat, renstra, 2026)
    assert b["data"]["berlaku"] == ["perban-1-2026", "perban-3-2026"], b["data"]["berlaku"]   # konflik dan TIDAK BERLAKU tidak dihitung
    m = {(r["fase"], r["jenis"]): r for r in b["data"]["matriks"]}
    assert m[("Prabencana", "Peraturan Badan")]["banjir"] == 1 and m[("Prabencana", "Peraturan Badan")]["total"] == 2, m
    assert "perka-4-2008" not in json.dumps(b["data"]["matriks"]), "dokumen konflik terhitung berlaku"
    st = {t["no"]: (t["status"], t["dokumen"]) for t in b["data"]["target"]}
    assert st == {6: ("terbit", "perban-3-2026"), 11: ("terbit", "perban-1-2026"), 3: ("lewat_target", None), 58: ("belum_jatuh_tempo", None)}, st
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    R = _json(RENSTRA)["butir"]
    assert [x["no"] for x in R] == list(range(1, 76)) and all(2024 <= x["target"] <= 2030 and x["kata"] == x["kata"].lower() for x in R)
    nyata = jalan()["peta_nspk"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **nyata})
    kat_n = _json(huk1.KATALOG)
    kon = {k["dok"] for k in kat_n["konflik"]}
    assert not kon & set(nyata["data"]["berlaku"]), "dokumen di konflik dihitung berlaku"
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    a = {x["k"]: x["nilai"] for x in nyata["kartu"][0]["angka"] + nyata["kartu"][1]["angka"]}
    print(f"spb1.py --cek: lulus ({a['berlaku']} dokumen berlaku efektif, {a['konflik']} konflik tidak dihitung; Renstra 75 butir: "
          f"{a['terbit']} terbit, {a['lewat']} lewat target, {a['belum']} belum jatuh tempo)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
