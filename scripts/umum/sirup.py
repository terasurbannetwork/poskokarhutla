"""SiRUP (LKPP): paket pengadaan kebencanaan per pemda dari Rencana Umum Pengadaan 2026 -> pelengkap DJPK.
-> public/data/sirup_bencana.json   per KLDI (kab/kota/provinsi): jumlah paket dan total pagu per tema + 3 paket terbesar.
Akses (diperiksa 10 Nov 2026, tanpa login/token): GET https://sirup.inaproc.id/sirup/caripaketctr/search?tahunAnggaran=&jenisPengadaan=&metodePengadaan=&minPagu=&maxPagu=&bulan=&lokasi=&kldi=&pdn=&ukm=
  &draw=1&start=&length=100&search[value]=<kata>&order[0][column]=5&order[0][dir]=desc  (panggilan DataTables halaman publik /sirup/caripaketctr/index; tebakan tanpa tahunAnggaran dkk membalas kosong).
  Jeda 2 dtk antar permintaan; satu halaman = 100 paket. Pencarian mencocokkan banyak kolom, jadi hasil disaring lagi di sini (kata ada di nama paket, atau satker BPBD).
RUP = RENCANA pengadaan (pagu), bukan realisasi belanja. Data berisi nama instansi/satker saja, tanpa data pribadi.
Pakai: python3 scripts/umum/sirup.py   |   python3 scripts/umum/sirup.py uji
"""
import datetime as dt, importlib.util, os, re, sys, urllib.parse

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AKAR, "public/data/sirup_bencana.json")
TAHUN, HALAMAN_MAKS = 2026, 25
# tema -> (kueri SiRUP, regex penyaring pada nama paket; None = pakai satker)
TEMA = {"karhutla": ("karhutla", r"karhutla|kebakaran (hutan|lahan)"), "kebakaran hutan dan lahan": ('"kebakaran hutan"', r"kebakaran (hutan|lahan)"),
        "banjir": ("banjir", r"banjir"), "longsor": ("longsor", r"longsor"), "gempa": ("gempa", r"gempa"), "tsunami": ("tsunami", r"tsunami"),
        "tanggap darurat": ('"tanggap darurat"', r"tanggap darurat"), "logistik bencana": ('"logistik bencana"', r"logistik bencana"),
        "cadangan pangan": ('"cadangan pangan"', r"cadangan pangan"), "BPBD": ("BPBD", None)}


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def url(kata, start):
    p = {"tahunAnggaran": TAHUN, "jenisPengadaan": "", "metodePengadaan": "", "minPagu": "", "maxPagu": "", "bulan": "", "lokasi": "", "kldi": "", "pdn": "", "ukm": "",
         "draw": 1, "start": start, "length": 100, "search[value]": kata, "order[0][column]": 5, "order[0][dir]": "desc"}
    return "https://sirup.inaproc.id/sirup/caripaketctr/search?" + urllib.parse.urlencode(p)


def cocok(r, pola):
    return bool(re.search(pola, r["paket"], re.I)) if pola else "PENANGGULANGAN BENCANA" in (r.get("satuanKerja") or "").upper()


def kelompok(per_tema):
    """{tema: [paket mentah]} -> {kldi: {...}}; satu paket dihitung sekali per tema, dan sekali di 'total_unik' (id)."""
    kldi, lihat = {}, {}
    for tema, daftar in per_tema.items():
        for r in daftar:
            k = kldi.setdefault(r.get("kldi") or "(tanpa KLDI)", {"provinsi": (r.get("lokasi") or "").split(",")[0] or None, "tema": {}, "_id": set(), "pagu_unik": 0, "contoh": {}})
            t = k["tema"].setdefault(tema, {"paket": 0, "pagu": 0})
            t["paket"] += 1
            t["pagu"] += r["pagu"] or 0
            if r["id"] not in k["_id"]:
                k["_id"].add(r["id"])
                k["pagu_unik"] += r["pagu"] or 0
                k["contoh"][r["id"]] = {"paket": r["paket"][:140], "pagu": r["pagu"], "tema": tema, "metode": r.get("metode"), "bulan": r.get("pemilihan"), "satker": r.get("satuanKerja"), "sumber_dana": r.get("sumberDana")}
    for k in kldi.values():
        k["paket_unik"] = len(k.pop("_id"))
        k["contoh"] = sorted(k["contoh"].values(), key=lambda c: -(c["pagu"] or 0))[:3]
    return dict(sorted(kldi.items()))


def jalan():
    J, simp = _mod("jaring"), _mod("kejadian").simpan
    per_tema, gagal, total = {}, [], {}
    for tema, (kueri, pola) in TEMA.items():
        daftar, start = [], 0
        while start // 100 < HALAMAN_MAKS:
            try:
                d = J.ambil(url(kueri, start), kepala={"X-Requested-With": "XMLHttpRequest"}, jeda_host=2)
            except Exception as e:
                gagal.append(f"{tema} start={start}: {e}")
                break
            daftar += d["data"]
            total[tema] = d["recordsFiltered"]
            start += 100
            if start >= d["recordsFiltered"] or not d["data"]:
                break
        per_tema[tema] = [r for r in {r["id"]: r for r in daftar}.values() if cocok(r, pola)]
    kldi = kelompok(per_tema)
    simp(OUT, {"sumber": "SiRUP LKPP, Rencana Umum Pengadaan (paket penyedia)", "atribusi": "LKPP, SiRUP, https://sirup.inaproc.id",
               "lisensi": "Situs sumber tidak mencantumkan lisensi; data publik RUP (UU KIP), atribusi ke LKPP", "jenis_keluaran": "INDEKS (rencana pagu pengadaan per tema, bukan realisasi; bukan model)",
               "tahun_anggaran": TAHUN, "diambil": dt.date.today().isoformat(), "gagal": gagal,
               "catatan": "Tema = kata di nama paket (BPBD = satker Badan Penanggulangan Bencana). Satu paket bisa masuk beberapa tema; paket_unik/pagu_unik tanpa dobel. "
                          "Pencarian SiRUP dibatasi 25 halaman (2.500 paket) per tema; tema yang lebih besar terpotong di paket pagu terkecil/terbaru sesuai urutan SiRUP (lihat total_sirup).",
               "total_sirup": total, "ringkasan": {t: {"paket": len(v), "pagu": sum(r["pagu"] or 0 for r in v)} for t, v in per_tema.items()}, "kldi": kldi})
    print(f"sirup: {sum(len(v) for v in per_tema.values())} paket cocok, {len(kldi)} kldi, gagal {len(gagal)}")


def uji():
    mk = lambda i, kl, nama, pagu, sat="DINAS X": {"id": i, "kldi": kl, "paket": nama, "pagu": pagu, "lokasi": "Kalimantan Utara, Nunukan (Kab.)", "metode": "Pengadaan Langsung",
                                                 "pemilihan": "January 2026", "satuanKerja": sat, "sumberDana": "APBD"}
    a, b, c = mk(1, "Kab. Nunukan", "Pengawasan Pengendalian Banjir", 100), mk(2, "Kab. Nunukan", "Talud banjir dan longsor", 300), mk(3, "Kab. Nunukan", "Kertas", 5, "BADAN PENANGGULANGAN BENCANA DAERAH")
    assert cocok(a, r"banjir") and not cocok(c, r"banjir") and cocok(c, None) and not cocok(a, None)
    k = kelompok({"banjir": [a, b], "longsor": [b], "BPBD": [c]})["Kab. Nunukan"]
    assert k["paket_unik"] == 3 and k["pagu_unik"] == 405 and k["tema"]["banjir"] == {"paket": 2, "pagu": 400} and k["contoh"][0]["pagu"] == 300 and k["provinsi"] == "Kalimantan Utara", k
    assert "search%5Bvalue%5D=%22tanggap+darurat%22" in url('"tanggap darurat"', 0)
    print("uji sirup: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
