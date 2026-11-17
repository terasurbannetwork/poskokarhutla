"""Hitungan tindakan lapangan per bencana dari logbook Pusdalops (agregat saja, tanpa teks asli).

Masukan : data/raw/logbook/arsip/<tahun>/baris.jsonl (tidak di-git; berkas gabungan baris_2011_2023.jsonl sengaja tidak dibaca)
Keluaran: public/data/bnpb/logbook_tindakan.json
Spesifikasi: data/kajian-bnpb/tindakan-operasi/ALGORITMA.md
Satuan = id_kejadian unik; kata kunci, jadi bisa kurang atau lebih dari kenyataan.
Pakai: python3 scripts/data/logbook_tindakan.py      python3 -I scripts/data/logbook_tindakan.py uji
"""
import glob, json, os, re, sys
from datetime import datetime, timezone

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
from bencana import JENIS_LOGBOOK_KE_BENCANA  # noqa: E402

KELUAR = os.path.join(AKAR, "public/data/bnpb/logbook_tindakan.json")
ARSIP = os.path.join(AKAR, "data/raw/logbook/arsip/*/baris.jsonl")
AMBANG = 2
_P = {
    "kaji_cepat": r"assess?ment|kaji cepat|\btrc\b|pendataan|survei",
    "evakuasi": r"evakuasi",
    "sar": r"pencarian|pencaharian|operasi sar|basarnas|korban hilang",
    "pembersihan": r"pembersihan|membersihkan|kerja bakti|penyingkiran",
    "alat_berat": r"alat berat|excavator|ekskavator|beko|loader|backhoe",
    "buka_akses": r"(buka|pembukaan|membuka) akses|akses jalan",
    "pohon_tumbang": r"pohon tumbang|(memotong|pemotongan) pohon|chainsaw|gergaji",
    "logistik": r"logistik|sembako|bantuan|permakanan",
    "dapur_umum": r"dapur umum",
    "pengungsian": r"pengungsian|posko pengungsi|tenda|huntara",
    "air_bersih": r"air bersih|drop(p)?ing air|distribusi air|tangki air|mobil tangki",
    "kesehatan": r"kesehatan|puskesmas|medis|pengobatan|rumah sakit",
    "perbaikan_darurat": r"perbaikan|terpal|atap|genteng",
    "tanggul": r"tanggul|karung pasir|sand ?bag|bronjong",
    "pompa": r"pompa|penyedotan|menyedot",
    "masker": r"masker",
    "pantau": r"pemantauan|memantau|monitoring",
    "posko": r"posko|rapat koordinasi|rakor",
    "imbauan": r"sosialisasi|imbauan|himbauan|mengimbau|menghimbau",
    "rambu": r"rambu|garis polisi|police line|penutupan (jalur|jalan)",
    "status_darurat": r"status (tanggap|siaga) darurat|penetapan status|sk status",
    "omc": r"\bomc\b|\btmc\b|modifikasi cuaca",
    "patroli": r"patroli",
}
POLA = {k: re.compile(v, re.I) for k, v in _P.items()}
PEMADAMAN = re.compile(r"pemadaman(?! listrik)(?! aliran)|memadamkan|damkar", re.I)  # hanya untuk dibuang
PENGECUALIAN = {
    ("banjir", "omc"): "public/data/bnpb/logbook_omc.json: 24 dari 120 kejadian OMC bertujuan hujan dan banjir",
    ("udara", "masker"): "Q2 bawaan sementara",
    ("udara", "imbauan"): "Q2 bawaan sementara",
}
KUNCI = {"dibuat", "sumber", "catatan", "ambang_persen", "jenis"}


def teks(e):
    return " ".join(str(e.get(k) or "") for k in ("upaya", "kondisi", "peralatan"))


def hitung(baris):
    berisi, kena = {}, {}
    for e in baris:
        b = JENIS_LOGBOOK_KE_BENCANA.get(e.get("jenis"))
        t = teks(e)
        if not b or b == "karhutla" or len(re.findall(r"[^\W\d_]", t)) < 5:
            continue
        i = e["id_kejadian"]
        berisi.setdefault(b, set()).add(i)
        for k, p in POLA.items():
            if p.search(t):
                kena.setdefault(b, {}).setdefault(k, set()).add(i)
    return {b: {"n": len(s), "tindakan": {k: len(v) for k, v in kena.get(b, {}).items() if v}} for b, s in sorted(berisi.items())}


def baca_arsip():
    for f in sorted(glob.glob(ARSIP)):
        with open(f, encoding="utf-8") as h:
            for ln in h:
                if ln.strip():
                    yield json.loads(ln)


def keluaran(jenis):
    return {"dibuat": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sumber": "logbook Pusdalops BNPB 2011-2026, entri upaya, kondisi, peralatan",
            "catatan": "Satuan kejadian (id_kejadian), pencocokan kata kunci: bisa kurang atau lebih dari kenyataan. Tanpa teks asli.",
            "ambang_persen": AMBANG, "jenis": jenis}


def persen(j, k):
    return 100 * j["tindakan"].get(k, 0) / j["n"]


def daftar_dari(kel):
    return {b: [k for k in sorted(j["tindakan"], key=lambda k: -j["tindakan"][k]) if persen(j, k) >= kel["ambang_persen"]]
            for b, j in kel["jenis"].items()}


def uji():
    ctoh = {"kaji_cepat": "dilakukan kaji cepat", "evakuasi": "evakuasi warga", "sar": "operasi SAR gabungan",
            "pembersihan": "pembersihan lumpur", "alat_berat": "excavator dikerahkan", "buka_akses": "membuka akses jalan",
            "pohon_tumbang": "pohon tumbang dipotong", "logistik": "distribusi logistik", "dapur_umum": "dapur umum didirikan",
            "pengungsian": "tenda pengungsian", "air_bersih": "dropping air", "kesehatan": "layanan kesehatan",
            "perbaikan_darurat": "pasang terpal", "tanggul": "karung pasir", "pompa": "pompa air", "masker": "bagi masker",
            "pantau": "pemantauan", "posko": "rapat koordinasi", "imbauan": "sosialisasi warga", "rambu": "pasang rambu",
            "status_darurat": "penetapan status darurat", "omc": "OMC dilaksanakan", "patroli": "patroli rutin"}
    assert list(POLA) == list(ctoh) and len(POLA) == 23
    for k, c in ctoh.items():
        assert POLA[k].search(c), k
    assert not PEMADAMAN.search("pemadaman listrik") and PEMADAMAN.search("pemadaman api")
    fx = [{"id_kejadian": "a", "jenis": "banjir", "upaya": "Evakuasi warga", "kondisi": "air naik", "peralatan": ""},
          {"id_kejadian": "a", "jenis": "banjir", "upaya": "pompa air", "kondisi": "", "peralatan": ""},
          {"id_kejadian": "b", "jenis": "banjir", "upaya": "monitoring tinggi air", "kondisi": "", "peralatan": None},
          {"id_kejadian": "c", "jenis": "banjir", "upaya": "", "kondisi": "ab", "peralatan": ""},
          {"id_kejadian": "d", "jenis": "karhutla", "upaya": "evakuasi warga", "kondisi": "", "peralatan": ""}]
    h = hitung(fx)
    assert h == {"banjir": {"n": 2, "tindakan": {"evakuasi": 1, "pompa": 1, "pantau": 1}}}, h
    assert daftar_dari(keluaran(h))["banjir"][0] in ("evakuasi", "pompa", "pantau")
    if not os.path.exists(KELUAR):
        print("uji: keluaran belum ada, lewati (c) dan (d)")
        return 0
    kel = json.load(open(KELUAR, encoding="utf-8"))
    assert set(kel) == KUNCI, set(kel)
    for b, j in kel["jenis"].items():
        assert set(j) == {"n", "tindakan"} and j["n"] > 0 and set(j["tindakan"]) <= set(POLA), b
        assert all(0 < v <= j["n"] for v in j["tindakan"].values()), b
    reg = json.load(open(os.path.join(AKAR, "public/bencana.json"), encoding="utf-8"))
    if "tindakan" not in reg or not all("tindakan" in x.get("kemampuan", {}) for x in reg["bencana"]):
        print("uji: registri belum punya kunci tindakan, lewati (d)")
    else:
        dari = daftar_dari(kel)
        for x in reg["bencana"]:
            harap = set(dari.get(x["id"], [])) | {k for (b, k) in PENGECUALIAN if b == x["id"]}
            assert set(x["kemampuan"]["tindakan"]) == harap, (x["id"], set(x["kemampuan"]["tindakan"]) ^ harap)
    print("uji lulus")
    return 0


def main():
    jenis = hitung(baca_arsip())
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w", encoding="utf-8") as f:
        json.dump(keluaran(jenis), f, ensure_ascii=False, separators=(",", ":"))
    print(f"tulis {os.path.relpath(KELUAR, AKAR)}: {sum(j['n'] for j in jenis.values())} kejadian, {len(jenis)} jenis")
    return 0


if __name__ == "__main__":
    sys.exit(uji() if sys.argv[1:] == ["uji"] else main())
