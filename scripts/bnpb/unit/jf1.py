"""JF-1 Kamus kompetensi teknis PB.01-PB.58 terstruktur (DESAIN-TEKNIS sec 5.15; tiket RU-050).

Langkah jalan.py (harian; murah, berubah hanya bila seed berubah). Masukan: segmen dokumen perban-5-2024 di
data/hukum/seed.sql (di git). Lampiran BAB III memuat per kompetensi: Nama, Kode PB.NN, Definisi, lalu tabel
Level | Deskripsi | Indikator (N.M). Teks segmen hasil ekstraksi PDF dua kolom: kolom deskripsi bisa menyela kalimat
indikator, jadi indikator tampil apa adanya (berlabel) dan deskripsi level tidak dipisahkan.
Jenjang minimum per level: bawaan DT 5.15, berlabel "bawaan, menunggu standar kompetensi PermenPANRB".
Invarian (RENCANA-UJI 5.1 catatan JF-1): jumlah kode terurai = jumlah kode PB.NN unik di teks; tiap kode 5 level.
58 dicetak sebagai pembanding, bukan asersi.

  python3 -I scripts/bnpb/unit/jf1.py --cek
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import rapor  # noqa: E402

SEED = os.path.join(rapor.AKAR, "data", "hukum", "seed.sql")
DOK = "perban-5-2024"
SEGMEN = re.compile(r"INSERT INTO hukum_segmen \([^)]*\) VALUES \(\d+, '([^']*(?:''[^']*)*)', \d+, '[^']*(?:''[^']*)*', "
                    r"'([^']*(?:''[^']*)*)', (?:NULL|'[^']*(?:''[^']*)*'), (\d+|NULL), '([^']*(?:''[^']*)*)'\);")
KODE = re.compile(r"PB\.\d\d")
BLOK = re.compile(r"Nama Kompetensi\s*:\s*(?P<nama>.+?)\s*Kode Kompetensi\s*:\s*(?P<kode>PB\.\d\d)\s*Definisi\s*:\s*(?P<isi>.*?)"
                  r"(?=Nama Kompetensi\s*:|BAB IV\b|\Z)", re.S)
BARIS_LEVEL = re.compile(r"(?<=\n)([1-5]) (?=[^\d\s])|(?<=\s)([1-5]) (?=Mampu\b|Memahami\b|Mengembangkan\b)")
JUDUL_BERIKUT = re.compile(r"\n\d{1,2}\.\s+[A-Z][^\n]*\s*$")  # judul bernomor kompetensi berikut di ujung blok
INDIKATOR = re.compile(r"(?<![\d.])([1-5])\.(\d{1,2})\.?\s")
JENJANG = [("Ahli Pertama", 2), ("Ahli Muda", 3), ("Ahli Madya", 4), ("Ahli Utama", 5),
           ("Pemula", 1), ("Terampil", 2), ("Mahir", 3), ("Penyelia", 4)]
LABEL_JENJANG = "Asumsi: jenjang bawaan, menunggu standar PermenPANRB"


def _rapat(s):
    return " ".join(s.split())


def teks_dok(sql, dok=DOK):
    seg = [m[4].replace("''", "'") for m in SEGMEN.finditer(sql) if m[1] == dok]
    if not seg:
        raise ValueError(f"segmen {dok} tidak ada di seed")
    return "\n".join(seg)


def urai(teks):
    out = []
    for m in BLOK.finditer(teks):
        isi = m["isi"]
        # baris level = nomor 1-5 di awal baris kolom kiri; indikator ikut baris levelnya walau nomornya salah cetak
        # (PB.35 level 4 tercetak 5.1-5.3 di sumber); "no" disimpan apa adanya
        potong = []
        for x in BARIS_LEVEL.finditer(isi):   # hanya urutan naik 1, 2, 3, ...: angka lepas di kalimat tidak memotong
            lv = int(x.group(1) or x.group(2))
            if lv == len(potong) + 1:
                potong.append((lv, x.start(), x.end()))
        if not potong:
            raise ValueError(f"{m['kode']}: tanpa baris level")
        definisi = _rapat(isi[:potong[0][1]])
        level = {}
        for i, (lv, a, b) in enumerate(potong):
            bag = isi[b:potong[i + 1][1] if i + 1 < len(potong) else len(isi)]
            bag = JUDUL_BERIKUT.sub("", bag)
            ind = list(INDIKATOR.finditer(bag))
            if not ind:
                raise ValueError(f"{m['kode']} level {lv}: tanpa indikator N.M")
            for j, x in enumerate(ind):
                t = bag[x.end():ind[j + 1].start() if j + 1 < len(ind) else len(bag)]
                level.setdefault(lv, []).append({"no": f"{x.group(1)}.{x.group(2)}", "teks": _rapat(t)})
        out.append({"kode": m["kode"], "kompetensi": _rapat(m["nama"]), "definisi": definisi,
                    "level": [{"level": lv, "indikator": level[lv]} for lv in sorted(level)]})
    return out


def bangun(teks):
    komp = urai(teks)
    unik = sorted(set(KODE.findall(teks)))
    jp = jam.standar("jf_jp_tahun")
    k1 = rapor.kartu(
        id="jf1-kamus", sistem="JF-1", pil="Kamus kompetensi", ikon="toga", judul="Kamus kompetensi teknis PB",
        angka=[{"k": "kode", "label": "Kompetensi terurai", "nilai": len(komp)},
               {"k": "lengkap", "label": "Kompetensi dengan 5 level", "nilai": sum(len(k["level"]) == 5 for k in komp)},
               {"k": "jp", "label": "Kewajiban pengembangan (jam pelajaran per tahun)", "nilai": jp["nilai"]}],
        kolom=[{"k": "jenjang", "label": "Jenjang jabatan"},
               {"k": "level", "label": "Level minimum", "title": "bawaan DESAIN-TEKNIS 5.15, menunggu standar kompetensi PermenPANRB", "angka": True}],
        baris=[{"jenjang": j, "level": lv} for j, lv in JENJANG],
        rumus=None, sumber=["perban_5_2024", "jam_aturan"], label=["resmi"], aturan=["jf_jp_tahun"], asumsi=[LABEL_JENJANG])
    sumber = [{"nama": "Perban BNPB 5/2024 Lampiran BAB III (segmen pustaka hukum Centurisk97)", "url": "repo:data/hukum/seed.sql",
               "diambil": "2026-11-10", "lisensi": "dokumen publik JDIH BNPB"}]
    b = rapor.berkas([k1], sumber)
    b["data"] = {"kompetensi": komp, "kode_di_teks": len(unik), "jenjang_bawaan": [{"jenjang": j, "level": lv} for j, lv in JENJANG],
                 "catatan_teks": "indikator dari ekstraksi PDF dua kolom; potongan kolom deskripsi level bisa terselip di kalimat"}
    return b


def _teks():
    with open(SEED, encoding="utf-8") as f:
        return teks_dok(f.read())


def jalan():
    return {"kompetensi": bangun(_teks())}


def cek():
    teks = _teks()
    b = bangun(teks)
    komp = b["data"]["kompetensi"]
    unik = sorted(set(KODE.findall(teks)))
    assert [k["kode"] for k in komp] == unik, (len(komp), len(unik), sorted(set(unik) - {k["kode"] for k in komp}))
    kurang = [(k["kode"], [lv["level"] for lv in k["level"]]) for k in komp if [lv["level"] for lv in k["level"]] != [1, 2, 3, 4, 5]]
    assert not kurang, f"kode tanpa tepat 5 level: {kurang}"
    k1 = komp[0]
    assert k1["kode"] == "PB.01" and k1["kompetensi"] == "Penyusunan Kebijakan Bidang Penanggulangan Bencana", k1["kompetensi"]
    assert k1["definisi"].startswith("Kemampuan mengidentifikasi") and k1["definisi"].endswith("Bidang Penanggulangan Bencana."), k1["definisi"]
    assert [i["no"] for i in k1["level"][0]["indikator"]] == ["1.1", "1.2", "1.3"], k1["level"][0]
    assert all(i["teks"] for k in komp for lv in k["level"] for i in lv["indikator"])
    assert b["kartu"][0]["angka"][2]["nilai"] == 20 and b["kartu"][0]["aturan"][0]["acuan"] == "perban-4-2025"
    # fixture kecil: blok tanpa indikator ditolak
    try:
        urai("Nama Kompetensi : X Kode Kompetensi : PB.99 Definisi : tanpa tabel.\n1 Memahami tanpa nomor")
        raise AssertionError("blok tanpa indikator tidak ditolak")
    except ValueError:
        pass
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    s = json.dumps(b, ensure_ascii=False)
    kita = json.dumps(b["kartu"], ensure_ascii=False)   # teks kita; data = kutipan Perban apa adanya (PB.25 memuat "lokasi yang aman")
    assert "\u00b7" not in s and not re.search(r"\baman\b", kita, re.I)
    print(f"jf1.py --cek: lulus ({len(komp)} kode terurai = {len(unik)} kode unik di teks, pembanding riset 58; "
          f"{sum(len(i['indikator']) for k in komp for i in k['level'])} indikator; {len(s) // 1024} KB)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
