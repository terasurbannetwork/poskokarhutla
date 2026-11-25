"""Pencegahan (preventif) per jenis bencana (F-22, PB-56): public/data/pencegahan/<id>.json.

Hanya butir yang sumbernya bisa diperiksa mesin, tanpa karangan (DESAIN-TEKNIS 6.5):
  [korpus] peraturan yang disebut docs/multi-bencana/PRAKTIK-PENANGANAN.md pada baris berlabel [korpus], dicocokkan ke
           data/hukum/peta_peraturan.json: wajib berlaku, teks dibaca penuh (sumber_teks "penuh"), tema kesiapsiagaan atau
           pencegahan_mitigasi, dan punya rujukan pasal atau halaman. Kalimat tindakan = kolom kewajiban korpus, bukan tulisan baru.
           Baris di bagian 1 berlaku untuk semua bencana; baris di bagian 2 sampai 10 hanya untuk bencananya.
  [repo]   tugas pra-musim scripts/bnpb/siaga.py (SOP, lewat public/data/bnpb/siaga.json) dan musim rawan per kab/kota dari
           logbook Pusdalops di berkas yang sama (ambang peluang di siaga.py, tidak diubah di sini).
Dikecualikan dan dicatat per baris (nomor baris saja, isi tidak disalin): baris berlabel [perlu cek] atau [ingatan] (Q9: ambang
hujan, angin, gelombang, HTH, ISPU tidak dipakai sampai naskah penerbit dibaca), baris tanpa label, dan peraturan korpus yang
teksnya belum dibaca. Bencana tanpa data wilayah: "tidak ada data", tidak pernah 0. Tanpa jaringan.

Pakai:  python3 scripts/umum/pencegahan.py buat   |   python3 -I scripts/umum/pencegahan.py uji
"""
import datetime as dt, json, os, re, sys, tempfile

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(SINI, "..", ".."))
PRAKTIK = "docs/multi-bencana/PRAKTIK-PENANGANAN.md"
KORPUS = "data/hukum/peta_peraturan.json"
SIAGA = "public/data/bnpb/siaga.json"
REGISTRI = "public/bencana.json"
KELUAR = os.path.join(AKAR, "public", "data", "pencegahan")
WIB = dt.timezone(dt.timedelta(hours=7))
TIDAK = "tidak ada data"
TEMA = {"kesiapsiagaan", "pencegahan_mitigasi"}
# nomor bagian PRAKTIK-PENANGANAN -> id registri; bagian 1 = lintas semua bencana
BAGIAN = {2: "karhutla", 3: "banjir", 4: "longsor", 5: "gempa", 6: "gunungapi", 7: "cuaca", 8: "kekeringan", 9: "udara", 10: "pesisir"}
REF = re.compile(r"\b(Perka|Perban|Juklak|Pedoman)(?: BNPB)? (\d+)/(\d{4})\b")


def baris_tabel(teks):
    """-> [(nomor baris, bagian, isi)] untuk tiap baris tabel isi (bukan kepala atau pemisah) di bagian 1 sampai 10."""
    out, bag, kepala = [], None, False
    for n, b in enumerate(teks.split("\n"), 1):
        m = re.match(r"^## (\d+)\.", b)
        if m:
            bag = int(m.group(1))
        if not b.startswith("|"):
            kepala = True
            continue
        if kepala or re.match(r"^\|\s*-", b):   # baris pertama tabel = kepala kolom
            kepala = False
            continue
        if bag and 1 <= bag <= 10:
            out.append((n, bag, b))
    return out


def pilah(teks, korpus):
    """-> {bagian: {"korpus": [(slug, baris)], "kecuali": [{baris, alasan}]}} dari PRAKTIK-PENANGANAN."""
    hasil = {}
    for n, bag, b in baris_tabel(teks):
        h = hasil.setdefault(bag, {"korpus": [], "kecuali": []})
        prabencana = b.startswith("| Prabencana")
        if "[perlu cek]" in b:
            h["kecuali"].append({"baris": n, "alasan": "perlu cek"})
        elif "[ingatan]" in b:
            h["kecuali"].append({"baris": n, "alasan": "ingatan"})
        elif "[korpus]" in b and "tidak berlaku" not in b:
            for jenis, no, th in REF.findall(b):
                slug = f"{jenis.lower()}-nomor-{no}-tahun-{th}"
                p = korpus.get(slug)
                if not p or p["tema"] not in TEMA:
                    continue
                if not p["berlaku"] or p["sumber_teks"] != "penuh" or p.get("rujukan", "-") in ("", "-"):
                    h["kecuali"].append({"baris": n, "alasan": "teks peraturan belum dibaca", "slug": slug})
                else:
                    h["korpus"].append((slug, n))
        elif prabencana:
            h["kecuali"].append({"baris": n, "alasan": "tanpa label sumber"})
    return hasil


def hitung(akar=AKAR, kini=None):
    kini = kini or dt.datetime.now(WIB)
    baca = lambda p: open(os.path.join(akar, p), encoding="utf-8").read()
    korpus = {p["slug"]: p for p in json.loads(baca(KORPUS))}
    siaga = json.loads(baca(SIAGA))
    ids = [b["id"] for b in json.loads(baca(REGISTRI))["bencana"]]
    pil = pilah(baca(PRAKTIK), korpus)
    out = {}
    for bid in ids:
        bag = [1] + [k for k, v in BAGIAN.items() if v == bid]
        butir, lihat, kecuali = [], set(), []
        for k in bag:
            for slug, n in pil.get(k, {}).get("korpus", []):
                if slug in lihat:
                    continue
                lihat.add(slug)
                p = korpus[slug]
                butir.append({"tag": "korpus", "tindakan": p["kewajiban"],
                              "dasar": {"peraturan": p["judul"], "rujukan": p["rujukan"], "slug": slug, "berkas": KORPUS},
                              "disebut_di": f"{PRAKTIK}:{n}"})
            kecuali += pil.get(k, {}).get("kecuali", [])
        for s in (siaga.get("sop") or {}).get(bid, []):
            butir.append({"tag": "repo", "tindakan": s["tugas"], "pj": s["pj"], "hari_sebelum_musim": -s["h"],
                          "dasar": {"berkas": "scripts/bnpb/siaga.py", "data": SIAGA, "sumber": siaga["sumber"]}})
        musim = {kab: [v["nama"], m["mulai"], m["bulan"], m["kejadian_th"]]
                 for kab, v in sorted(siaga["kab"].items()) if (m := (v.get("musim") or {}).get(bid))}
        out[bid] = {
            "dibuat": kini.strftime("%Y-%m-%d"),
            "bencana": bid,
            "sumber": [PRAKTIK, KORPUS, SIAGA],
            "butir": butir or TIDAK,
            "wilayah": {"kolom": ["kab", "nama", "musim_mulai", "musim_bulan", "kejadian_per_tahun"],
                        "dasar": {"berkas": "scripts/bnpb/siaga.py", "data": SIAGA, "sumber": siaga["sumber"],
                                  "ambang_musim": siaga["ambang_musim"]},
                        "baris": [[k, *v] for k, v in musim.items()]} if musim else TIDAK,
            "dikecualikan": kecuali,
        }
    return out


def tulis(isi, folder=KELUAR):
    os.makedirs(folder, exist_ok=True)
    for bid, d in isi.items():
        p = os.path.join(folder, bid + ".json")
        with open(p + ".tmp", "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, separators=(",", ":"))
        os.replace(p + ".tmp", p)


def uji():
    korpus = {"perban-nomor-2-tahun-2023": {"tema": "kesiapsiagaan", "berlaku": True, "sumber_teks": "penuh", "rujukan": "Pasal 17"},
              "juklak-nomor-6-tahun-2024": {"tema": "kesiapsiagaan", "berlaku": True, "sumber_teks": "tidak ada", "rujukan": "-"},
              "perban-nomor-3-tahun-2018": {"tema": "pengungsi_bantuan", "berlaku": True, "sumber_teks": "penuh", "rujukan": "x"}}
    md = ("## 1. Umum\n\n| Rujukan | Label |\n| --- | --- |\n| Perban BNPB 2/2023 Renkon; Juklak 6/2024 Rambu | [korpus] berlaku |\n"
          "| Perban 3/2018 pengungsi | [korpus] |\n| UU 24/2007 | [ingatan] pasal [perlu cek] |\n\n## 3. Banjir\n\n"
          "| Fase | Tindakan |\n| --- | --- |\n| Prabencana | Normalisasi sungai |\n| Hujan lebat 50 mm | [ingatan] [perlu cek] angka |\n")
    p = pilah(md, korpus)
    assert p[1]["korpus"] == [("perban-nomor-2-tahun-2023", 5)], p
    assert {"baris": 5, "alasan": "teks peraturan belum dibaca", "slug": "juklak-nomor-6-tahun-2024"} in p[1]["kecuali"]
    assert {"baris": 7, "alasan": "perlu cek"} in p[1]["kecuali"]           # perlu cek menang atas ingatan
    assert not any(s == "perban-nomor-3-tahun-2018" for s, _ in p[1]["korpus"])   # bukan tema pencegahan
    assert p[3]["korpus"] == [] and {x["alasan"] for x in p[3]["kecuali"]} == {"tanpa label sumber", "perlu cek"}
    # data repo nyata
    isi = hitung(kini=dt.datetime(2026, 11, 25, 8, tzinfo=WIB))
    reg = [b["id"] for b in json.load(open(os.path.join(AKAR, REGISTRI)))["bencana"]]
    assert set(isi) == set(reg), set(isi) ^ set(reg)
    korpus = {x["slug"]: x for x in json.load(open(os.path.join(AKAR, KORPUS), encoding="utf-8"))}
    teks = open(os.path.join(AKAR, PRAKTIK), encoding="utf-8").read().split("\n")
    with tempfile.TemporaryDirectory() as t:
        tulis(isi, t)
        for bid in isi:
            raw = open(os.path.join(t, bid + ".json"), encoding="utf-8").read()
            assert len(raw.encode()) <= 1024 * 1024, (bid, len(raw))
            d = json.loads(raw)
            assert next(iter(d)) == "dibuat"
            assert not re.search(r"\baman\b", raw, re.I), bid
            assert isinstance(d["butir"], list) and d["butir"], bid
            for b in d["butir"]:
                assert b["tag"] in ("korpus", "repo") and b["tindakan"].strip() and b["dasar"], b
                if b["tag"] == "korpus":
                    k = korpus[b["dasar"]["slug"]]
                    assert k["berlaku"] and k["sumber_teks"] == "penuh" and k["tema"] in TEMA and b["tindakan"] == k["kewajiban"]
                    n = int(b["disebut_di"].rsplit(":", 1)[1])
                    assert "[korpus]" in teks[n - 1] and "[perlu cek]" not in teks[n - 1] and "[ingatan]" not in teks[n - 1]
                else:
                    assert b["dasar"]["berkas"] == "scripts/bnpb/siaga.py"
            # baris [perlu cek] tidak pernah jadi butir, dan selalu tercatat sebagai pengecualian
            dipakai = {int(b["disebut_di"].rsplit(":", 1)[1]) for b in d["butir"] if b["tag"] == "korpus"}
            assert not any("[perlu cek]" in teks[n - 1] for n in dipakai)
            assert any(x["alasan"] == "perlu cek" for x in d["dikecualikan"]), bid
            w = d["wilayah"]
            assert w == TIDAK or (w["baris"] and all(r[1] and r[4] is not None for r in w["baris"])), bid
    assert isi["gempa"]["wilayah"] == TIDAK and isi["banjir"]["wilayah"] != TIDAK
    print("pencegahan uji: lulus (" + ", ".join(f"{b} {len(d['butir'])} butir" for b, d in isi.items()) + ")")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else ""
    if a == "uji":
        uji()
    elif a == "buat":
        isi = hitung()
        tulis(isi)
        for bid, d in isi.items():
            n = {t: sum(b["tag"] == t for b in d["butir"]) for t in ("korpus", "repo")}
            w = TIDAK if d["wilayah"] == TIDAK else f"{len(d['wilayah']['baris'])} kab"
            print(f"pencegahan {bid}: korpus {n['korpus']}, repo {n['repo']}, wilayah {w}, dikecualikan {len(d['dikecualikan'])}")
    else:
        sys.exit("pakai: pencegahan.py buat | uji")
