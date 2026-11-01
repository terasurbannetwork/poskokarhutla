"""Subjenis kejadian 'cuaca' logbook Pusdalops dari teks laporan (jenis_teks, kronologi, lalu kondisi_terakhir).

Aturan: label dicari per bidang berurutan; bidang berikutnya hanya dibaca bila bidang sebelumnya tak menemukan apa pun
(dampak_teks_terakhir tak dipakai: memuat 'pohon tumbang' dst. sebagai akibat, bukan sebab). Dalam satu bidang label
diurut menurut posisi di teks; pertama = utama. Tak ada yang cocok -> ["lainnya"].
Pakai: python3 scripts/data/subjenis_cuaca.py   (self-check)
"""
import re

# salah ketik nyata di arsip: putting, belung/beling, kecang, angina, anginkencang
POLA = [  # urutan = prioritas bahaya; hujan lebat paling akhir (pembawa, bukan bahaya)
    ("puting_beliung", r"put+i?ng\s*be[l]?i?[nl]?[gu]|puting\s*beliung|angin\s+puting\b|\bpuyuh\b|\btornado\b|\bwater\s*spout"),
    ("petir", r"petir|sambaran\s*(petir|geledek)|geledek|tersambar"),
    ("hujan_es", r"hujan\s*es\b|\bhail"),
    ("angin_kencang", r"angin\s*k[ea]n?cang|angina\s*kencang|angin\s*(ribut|topan|badai|besar|kuat)|badai|\bangin\b(?!\s*put+i?ng)"),
    ("gelombang_tinggi", r"gelombang\s*(pasang|tinggi)|ombak|\brob\b|pasang\s*(air\s*laut|naik)|air\s*(laut\s*)?pasang|pasang\s*nya\s*air"),
    ("abrasi", r"abrasi|erosi\s*pantai"),
    ("hujan_lebat", r"hujan\s*(sedang\s*)?(\W\s*|hingga\s*|sampai\s*)?(lebat|deras|ekstre[mi]|dengan\s*\w*\s*(tinggi|lebat))|hujan\s+(dengan\s+)?i\w{5,}\s*(tinggi|lebat)|(curah|intensitas)\s*hujan\s*(yang\s*)?(terlalu\s*)?(tinggi|lebat|deras)|ekstrim\s*hujan"),
    ("pohon_tumbang", r"pohon\s*(yang\s*)?(tumbang|roboh)"),  # cadangan terakhir: biasanya akibat, bukan sebab
]


def _cari(teks):
    t = teks.lower()
    return [n for n, p in POLA if re.search(p, t)]


def subjenis(k):
    """k = baris kejadian.jsonl (dict). Daftar label: jenis_teks dulu, lalu kronologi, lalu kondisi_terakhir hanya bila
    keduanya kosong; dalam satu bidang menurut prioritas POLA. Pohon tumbang hanya jika tak ada label lain."""
    h = []
    for bidang in ("jenis_teks", "kronologi"):
        h += [n for n in _cari(k.get(bidang) or "") if n not in h]
    if not [n for n in h if n != "pohon_tumbang"]:
        h += [n for n in _cari(k.get("kondisi_terakhir") or "") if n not in h]
    hit = [n for n in h if n != "pohon_tumbang"]
    return hit or h or ["lainnya"]


def utama(k):
    return subjenis(k)[0]


def uji():
    kasus = [
        ({"jenis_teks": "Angin Puting Beliung"}, ["puting_beliung"]),
        ({"jenis_teks": "Angin Putting Beliung"}, ["puting_beliung"]),
        ({"jenis_teks": "angin puting belung"}, ["puting_beliung"]),
        ({"jenis_teks": "Angin Kencang"}, ["angin_kencang"]),
        ({"jenis_teks": "anginkencang"}, ["angin_kencang"]),
        ({"jenis_teks": "Angina kencang"}, ["angin_kencang"]),
        ({"jenis_teks": "Abrasi Pantai"}, ["abrasi"]),
        ({"jenis_teks": "gelombang pasang dan abrasi"}, ["gelombang_tinggi", "abrasi"]),
        ({"jenis_teks": "", "kronologi": "Hujan es disertai angin kencang"}, ["hujan_es", "angin_kencang"]),
        ({"jenis_teks": "Cuaca Ekstrem", "kronologi": "tersambar petir"}, ["petir"]),
        ({"jenis_teks": "Angin Puting Beliung", "kronologi": "hujan deras disertai angin kencang"}, ["puting_beliung", "angin_kencang", "hujan_lebat"]),
        ({"jenis_teks": "Cuaca Ekstrem", "kronologi": "hujan lebat"}, ["hujan_lebat"]),
        ({"jenis_teks": "Cuaca Ekstrem", "kronologi": ""}, ["lainnya"]),
        ({"jenis_teks": "Pohon Tumbang", "kronologi": "pohon tumbang menimpa jalan"}, ["pohon_tumbang"]),
        ({"jenis_teks": "Angin Kencang", "kronologi": "pohon tumbang"}, ["angin_kencang"]),
        ({"jenis_teks": "jam", "kronologi": "", "kondisi_terakhir": ""}, ["lainnya"]),
    ]
    for k, w in kasus:
        assert subjenis(k) == w, (k, subjenis(k), w)
    print("subjenis_cuaca uji ok", len(kasus))


if __name__ == "__main__":
    uji()
