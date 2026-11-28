"""JF-2 Hitung kebutuhan formasi JF per instansi (DESAIN-TEKNIS sec 6.31; ALGORITMA sec 10.45; tiket RU-107).

Langkah jalan.py (bulanan; keluaran unit/formasi_jf.json). Rumus (pola Analisis Beban Kerja KemenPANRB, riset/6 J2):
  kebutuhan = Sigma (volume_tahunan x norma_waktu_jam) / jam kerja efektif per tahun (bawaan 1.250)   [orang]
Volume tahunan (proksi per kab, tidak dikarang; tanpa sumber = belum ada data, bukan 0):
  kaji_cepat          jumlah kejadian DIBI 2021-2025 dibagi 5            (public/data/bnpb/dibi_kab_tahun.json; kab tanpa satu pun baris DIBI di jendela itu = belum ada data)
  renkon              jumlah bahaya berjiwa terpapar tinggi > 0, dibagi 3 (public/data/bnpb/terpapar.json; renkon berlaku 3 tahun)
  pendampingan_posko  SK Tanggap Darurat tingkat kab per tahun 2021-2025 dibagi 5 (public/data/status_darurat.json)
  penyuluhan          butuh data per desa (ALGORITMA 10.9): belum ada data
Norma waktu hanya dari norma_waktu.json, tiap norma berlabel "bawaan"; kegiatan tanpa norma (jam null) dilewati, tidak dikarang.
Jumlah kab hanya dari kab yang bervolume: agregat provinsi dan nasional menyebut n dari m kab (kosong tidak diisi 0).
Label "usulan metode": tata cara Pasal 53 ayat (3) Perban 4/2025 belum terbit. Tampilan interaktif (norma bisa diubah di peramban): public/bnpb/unit/jf2.js.
Rumus yang sama dipakai jf2.js; angka di berkas ini hanya hitungan awal dari norma bawaan.

  python3 -I scripts/bnpb/unit/jf2.py --cek
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

D = os.path.join(rapor.AKAR, "public", "data")
NORMA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "norma_waktu.json")
JENDELA = (2021, 2025)
TAHUN = JENDELA[1] - JENDELA[0] + 1
RENKON_TAHUN = 3
KEGIATAN = ("kaji_cepat", "renkon", "pendampingan_posko", "penyuluhan")
ASUMSI = ["Asumsi: norma waktu bawaan", "Asumsi: 1.250 jam kerja efektif", "Asumsi: usulan metode, tata cara belum terbit"]


def periksa_norma(d):
    """Norma tanpa label 'bawaan' ditolak (ALGORITMA 10.45); jam null boleh (dilewati), jam <= 0 tidak."""
    je = d.get("jam_efektif") or {}
    if je.get("label") != "bawaan" or isinstance(je.get("nilai"), bool) or not isinstance(je.get("nilai"), (int, float)) or je["nilai"] <= 0:
        raise ValueError("jam_efektif harus {nilai > 0, label: bawaan}")
    ada = set()
    for n in d.get("norma") or []:
        if n.get("label") != "bawaan":
            raise ValueError(f"norma {n.get('kegiatan')}/{n.get('jenjang')} tanpa label 'bawaan'")
        if n.get("kegiatan") not in KEGIATAN:
            raise ValueError(f"kegiatan {n.get('kegiatan')!r} di luar {KEGIATAN}")
        if not isinstance(n.get("jenjang"), str) or not n["jenjang"].strip() or not isinstance(n.get("nama"), str):
            raise ValueError(f"norma {n.get('kegiatan')}: jenjang dan nama harus teks")
        j = n.get("jam")
        if j is not None and (isinstance(j, bool) or not isinstance(j, (int, float)) or j <= 0):
            raise ValueError(f"norma {n['kegiatan']}: jam {j!r} harus angka > 0 atau null")
        if (n["kegiatan"], n["jenjang"]) in ada:
            raise ValueError(f"norma kembar {n['kegiatan']}/{n['jenjang']}")
        ada.add((n["kegiatan"], n["jenjang"]))
    return d


def kebutuhan(volume, norma, jam_efektif):
    """volume {kegiatan: angka atau None}. -> {jam, orang, per_jenjang {jenjang: orang}, dilewati [kegiatan]} atau None bila tak satu pun terhitung.
    Kegiatan tanpa volume atau tanpa norma dilewati; tidak ada yang diisi 0."""
    jam, per, lewat, dipakai = 0.0, {}, set(), False
    for n in norma:
        v = volume.get(n["kegiatan"])
        if n["jam"] is None or v is None:
            lewat.add(n["kegiatan"])
            continue
        dipakai = True
        h = v * n["jam"]
        jam += h
        per[n["jenjang"]] = per.get(n["jenjang"], 0.0) + h / jam_efektif
    if not dipakai:
        return None
    return {"jam": jam, "orang": jam / jam_efektif, "per_jenjang": per, "dilewati": sorted(lewat)}


def kode_kab(k):
    return str(k).replace(".", "")


def volume_kab(dibi, terpapar, darurat):
    """-> {kode kab Kemendagri: {kaji_cepat, renkon, pendampingan_posko, penyuluhan}} (None = belum ada data)."""
    if dibi.get("kode") != "kemendagri":
        raise ValueError("dibi_kab_tahun.json tanpa penanda kode=kemendagri")
    kol = {k: i for i, k in enumerate(dibi["kolom"])}
    ada, kej = set(), {}   # ada = kab bervolume DIBI di jendela (bukan sembarang tahun)
    for b in dibi["baris"]:
        kab = b[kol["kab"]]
        if JENDELA[0] <= b[kol["tahun"]] <= JENDELA[1] and b[kol["kejadian"]] is not None:
            ada.add(kab)
            kej[kab] = kej.get(kab, 0) + b[kol["kejadian"]]
    tgd = {}
    for s in darurat["sk"]:
        if s["skala"] == "kabupaten" and s["status"] == "Tanggap Darurat" and s.get("kab_kode") and s.get("mulai") \
                and JENDELA[0] <= int(s["mulai"][:4]) <= JENDELA[1]:
            tgd[kode_kab(s["kab_kode"])] = tgd.get(kode_kab(s["kab_kode"]), 0) + 1
    out = {}
    for kab in sorted(set(b[kol["kab"]] for b in dibi["baris"]) | set(terpapar["kab"])):
        t = terpapar["kab"].get(kab)
        out[kab] = {
            "kaji_cepat": kej.get(kab, 0) / TAHUN if kab in ada else None,
            "renkon": sum(1 for h in t["h"].values() if h[2] > 0) / RENKON_TAHUN if t else None,
            "pendampingan_posko": tgd.get(kab, 0) / TAHUN,
            "penyuluhan": None}
    return out


def bangun(norma_d, vol, nama_kab, nama_prov):
    periksa_norma(norma_d)
    norma, je = norma_d["norma"], norma_d["jam_efektif"]["nilai"]
    prov = {}
    for kab, v in vol.items():
        h = kebutuhan(v, norma, je)
        p = prov.setdefault(kab[:2], {"orang": 0.0, "jam": 0.0, "n": 0, "m": 0})
        p["m"] += 1
        if h:
            p["orang"] += h["orang"]; p["jam"] += h["jam"]; p["n"] += 1
    nas = {"orang": sum(p["orang"] for p in prov.values()), "jam": sum(p["jam"] for p in prov.values()),
           "n": sum(p["n"] for p in prov.values()), "m": sum(p["m"] for p in prov.values())}
    baris = [{"provinsi": nama_prov.get(k, k), "kab_terhitung": f"{p['n']} dari {p['m']}", "jam": round(p["jam"]) if p["n"] else None,
              "orang": p["orang"] if p["n"] else None, "usulan": math.ceil(p["orang"] - 1e-9) if p["n"] else None} for k, p in sorted(prov.items())]
    dilewati = [n["nama"] for n in norma if n["jam"] is None]
    k = rapor.kartu(
        id="jf2-formasi", sistem="JF-2", pil="Usulan metode", ikon="hitung", judul="Kebutuhan formasi JF",
        angka=[{"k": "orang", "label": "Kebutuhan nasional (orang)", "nilai": nas["orang"] if nas["n"] else None, "desimal": 1},
               {"k": "jam", "label": "Beban kerja (jam per tahun)", "nilai": round(nas["jam"]) if nas["n"] else None},
               {"k": "kab", "label": "Kab/kota terhitung", "nilai": nas["n"] if nas["n"] else None}],
        kolom=[{"k": "provinsi", "label": "Provinsi"}, {"k": "kab_terhitung", "label": "Kab/kota terhitung", "title": "Kab/kota yang punya volume; sisanya belum ada data"},
               {"k": "jam", "label": "Jam per tahun", "angka": True}, {"k": "orang", "label": "Kebutuhan (orang)", "angka": True, "desimal": 1, "title": "Tampil 1 desimal; nilai hitung penuh"},
               {"k": "usulan", "label": "Usulan formasi (orang)", "angka": True, "title": "Kebutuhan dibulatkan ke atas ke orang bulat; hanya kolom ini yang dibulatkan"}],
        baris=baris, rumus=f"kebutuhan = jumlah (volume tahunan x norma waktu jam) / {id_(je)} jam kerja efektif per tahun; volume = proksi DIBI, jiwa terpapar tinggi, SK Tanggap Darurat"
        + (f"; dilewati tanpa norma: {', '.join(dilewati)}" if dilewati else ""),
        sumber=["dibi_kab_tahun", "terpapar", "status_darurat", "norma_waktu"], label=["hitungan_kita", "proksi"], asumsi=ASUMSI, unduh="formasi_jf.csv")
    sumber = [{"nama": "DIBI BNPB, InaRISK x Dukcapil, SK status darurat, norma waktu bawaan", "url": "repo:scripts/bnpb/unit/norma_waktu.json",
               "diambil": "2026-11-26", "lisensi": "data publik; norma bawaan Centurisk97"}]
    b = rapor.berkas([k], sumber)
    b["data"] = {"jam_efektif": norma_d["jam_efektif"], "norma": norma, "jendela": list(JENDELA), "tahun_renkon": RENKON_TAHUN,
                 "provinsi": nama_prov, "kab": [[kab, nama_kab.get(kab), v["kaji_cepat"], v["renkon"], v["pendampingan_posko"], v["penyuluhan"]] for kab, v in vol.items()],
                 "kolom_volume": list(KEGIATAN), "penyuluhan": "belum ada data: butuh data per desa"}
    return b


def id_(x):
    """Angka format Indonesia: titik ribuan, koma desimal."""
    t = f"{x:,.1f}" if x != int(x) else f"{int(x):,}"
    return t.replace(",", "_").replace(".", ",").replace("_", ".")


def _j(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan():
    wil = _j(os.path.join(D, "bnpb", "wilayah.json"))["kab"]
    vol = volume_kab(_j(os.path.join(D, "bnpb", "dibi_kab_tahun.json")), _j(os.path.join(D, "bnpb", "terpapar.json")), _j(os.path.join(D, "status_darurat.json")))
    return {"formasi_jf": bangun(_j(NORMA), vol, {k["kode"]: k["nama"] for k in wil}, _j(os.path.join(D, "meta.json"))["provinsi"])}


def cek():
    n0 = periksa_norma(_j(NORMA))
    assert all(n["label"] == "bawaan" for n in n0["norma"]), "norma bawaan wajib berlabel"
    # contoh RU 5.2: 40 kaji cepat x 25 jam + 12 renkon x 60 jam = 1.720 jam -> 1,376 orang
    norma = [n for n in n0["norma"] if n["jam"] is not None]
    h = kebutuhan({"kaji_cepat": 40, "renkon": 12, "pendampingan_posko": None, "penyuluhan": None}, n0["norma"], n0["jam_efektif"]["nilai"])
    assert h["jam"] == 1720 and abs(h["orang"] - 1.376) < 1e-9 and h["per_jenjang"] == {"Semua jenjang": h["orang"]}, h
    assert h["dilewati"] == ["pendampingan_posko", "penyuluhan"], h   # tanpa norma atau tanpa volume: dilewati, bukan 0
    assert kebutuhan({"kaji_cepat": None, "renkon": None}, n0["norma"], 1250) is None, "tanpa volume sama sekali = belum ada data"
    assert len(norma) == 2
    # norma di luar label bawaan, kegiatan asing, jam nol, norma kembar ditolak
    je = {"nilai": 1250, "label": "bawaan"}
    for jelek in ({"jam_efektif": je, "norma": [{"kegiatan": "renkon", "nama": "x", "jenjang": "A", "jam": 60}]},
                  {"jam_efektif": je, "norma": [{"kegiatan": "renkon", "nama": "x", "jenjang": "A", "jam": 60, "label": "resmi"}]},
                  {"jam_efektif": je, "norma": [{"kegiatan": "lain", "nama": "x", "jenjang": "A", "jam": 60, "label": "bawaan"}]},
                  {"jam_efektif": je, "norma": [{"kegiatan": "renkon", "nama": "x", "jenjang": "A", "jam": 0, "label": "bawaan"}]},
                  {"jam_efektif": {"nilai": 1250}, "norma": []},
                  {"jam_efektif": je, "norma": [{"kegiatan": "renkon", "nama": "x", "jenjang": "A", "jam": 6, "label": "bawaan"}] * 2}):
        try:
            periksa_norma(jelek)
            raise AssertionError(f"norma palsu lolos: {jelek}")
        except ValueError:
            pass
    # volume atas fixture kecil: kab tanpa baris DIBI = None (bukan 0), jendela 2021-2025, SK hanya Tanggap Darurat kab
    dibi = {"kode": "kemendagri", "kolom": ["kab", "tahun", "kejadian"], "baris": [["1101", 2021, 10], ["1101", 2025, 5], ["1101", 2020, 99], ["1102", 2019, 3]]}
    terpapar = {"kab": {"1101": {"h": {"banjir": [0, 0, 5, 0], "longsor": [0, 0, 0, 0], "gempa": [0, 0, 1, 0], "karhutla": [0, 0, 9, 0]}}, "1103": {"h": {"banjir": [0, 0, 0, 0]}}}}
    darurat = {"sk": [{"skala": "kabupaten", "status": "Tanggap Darurat", "kab_kode": "11.01", "mulai": "2024-03-01"},
                      {"skala": "kabupaten", "status": "Siaga Darurat", "kab_kode": "11.01", "mulai": "2024-03-01"},
                      {"skala": "provinsi", "status": "Tanggap Darurat", "kab_kode": None, "mulai": "2024-03-01"},
                      {"skala": "kabupaten", "status": "Tanggap Darurat", "kab_kode": "11.01", "mulai": "2026-01-01"}]}
    v = volume_kab(dibi, terpapar, darurat)
    assert v["1101"] == {"kaji_cepat": 3.0, "renkon": 1.0, "pendampingan_posko": 0.2, "penyuluhan": None}, v["1101"]   # 15/5, 3 bahaya tinggi/3, 1 SK/5
    assert v["1102"]["kaji_cepat"] is None and v["1102"]["renkon"] is None, v["1102"]   # DIBI hanya di luar jendela, dan terpapar tak ada: belum ada data, bukan 0
    assert v["1103"]["kaji_cepat"] is None and v["1103"]["renkon"] == 0.0, v["1103"]
    b = bangun(n0, v, {"1101": "Aceh Selatan"}, {"11": "Aceh"})
    k = b["kartu"][0]
    assert k["pil"] == "Usulan metode" and "Asumsi: norma waktu bawaan" in k["asumsi"] and k["baris"][0]["kab_terhitung"] == "2 dari 3", k["baris"]
    assert abs(k["angka"][0]["nilai"] - (3 * 25 + 1 * 60) / 1250) < 1e-9 and k["angka"][0]["desimal"] == 1, k["angka"]   # nilai penuh, tampil 1 desimal
    assert k["baris"][0]["usulan"] == 1 and "1.250 jam" in k["rumus"] and "1250" not in k["rumus"], k["baris"][0]
    assert id_(1250) == "1.250" and id_(1.376) == "1,4" and id_(129956.4) == "129.956,4"   # tanpa SK norma: dilewati
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    assert "dilewati tanpa norma: Pendampingan posko" in k["rumus"] and "Penyuluhan" in k["rumus"], k["rumus"]
    # data nyata repo (tanpa D1/R2): jalan, angka masuk akal, penyuluhan tertulis belum ada data
    nyata = jalan()["formasi_jf"]
    kn = nyata["kartu"][0]
    assert kn["angka"][0]["nilai"] > 0 and kn["angka"][2]["nilai"] > 400, kn["angka"]
    assert nyata["data"]["penyuluhan"].startswith("belum ada data") and all(r[5] is None for r in nyata["data"]["kab"])
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and "1.250 jam" in kn["rumus"], kn["rumus"]
    assert kn["baris"] and all(b["usulan"] is None or b["usulan"] >= b["orang"] for b in kn["baris"]), "usulan = pembulatan ke atas"
    print(f"jf2.py --cek: lulus (contoh 1.720 jam = 1,376 orang; norma tanpa label ditolak; nyata {kn['angka'][0]['nilai']} orang dari {kn['angka'][2]['nilai']} kab/kota; {len(s) // 1024} KB)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
