"""Prioritas wilayah per bencana (F-23, PB-57): public/data/prioritas/<id>.json. HIPOTESIS, bobot sementara.

skor = 0,4 bahaya + 0,3 paparan + 0,2 kerentanan + 0,1 tren_peringatan (ALGORITMA 4, Q21; bobot di prioritas_bobot.json).
Tiap komponen dinormalkan jadi persentil peringkat tengah (bawah + setengah seri) / n di antara kab yang punya komponen itu.
  bahaya       porsi kecamatan berindeks bahaya InaRISK >= 0,666 (public/banjir/data/bahaya.json, lapisan per bencana)
  paparan      jiwa terpapar, satu mesin dengan scripts/prediksi/terbit.py paparan() (banjir: zona tinggi paparan_kab.json;
               lainnya: seluruh penduduk kecamatan berindeks >= 0,666, batas atas). Kab berdata bahaya tanpa kecamatan tinggi = 0 terhitung.
  kerentanan   (balita 0-5 + lansia 60+) / penduduk dari profil wilayah (public/data/wilayah/NN.json, scripts/umum/profil_wilayah.py)
  tren         hari berperingkat Waspada ke atas dari pernyataan resmi di arsip Tangga (public/prediksi/data/tangga_arsip), 30 hari / 30;
               arsip tidak menyimpan jenis, jadi tren lintas jenis. Arsip basi (> 3 hari) atau kosong = tidak ada data (bukan 0).
Aturan kosong: komponen tanpa data = null ("tidak ada data"), tidak pernah 0. Bahaya 0: tanpa skor, belum_cukup ("bahaya tinggi
tidak tercatat"); persentil hanya di antara kab bahaya > 0. Bahaya kosong atau dua komponen lebih kosong (tren tidak dihitung): tanpa
skor, belum_cukup ("belum cukup data"). Komponen kosong lain: bobotnya dibagi ulang proporsional ke yang ada (Q21).
validasi-model 25 Nov 2026: tren DIMATIKAN (prioritas_bobot.json tren_peringatan.pakai=false, "arsip tanpa jenis bencana"), null untuk
semua kab, 0,1 dibagi ulang; pesisir DITAHAN (lapisan gelombang 0 di darat, perlu masker garis pantai), berkasnya dibuang saat buat.
Skor model longsor (PB-49) dan hujan 50 mm (PB-50) gagal uji balik dan TIDAK dipakai. Peringkat adalah urutan tinjauan, bukan dasar anggaran.
cek_kejadian: Spearman skor lawan jumlah kejadian DIBI per kab di jendela 12 bulan public/data/dibi_kejadian.json; deskriptif, bukan setelan.
Tanpa jaringan.

Pakai:  python3 scripts/umum/prioritas.py buat   |   python3 -I scripts/umum/prioritas.py uji
"""
import bisect, datetime as dt, glob, importlib.util, json, os, re, sys, tempfile

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(SINI, "..", ".."))
BOBOT = os.path.join(SINI, "prioritas_bobot.json")
KELUAR = os.path.join(AKAR, "public", "data", "prioritas")
WIB = dt.timezone(dt.timedelta(hours=7))
KOMP = ["bahaya", "paparan", "kerentanan", "tren_peringatan"]
KOLOM = ["kab", "nama", "prov", "peringkat", "skor", "p_bahaya", "p_paparan", "p_kerentanan", "p_tren",
         "bahaya", "jiwa", "rentan", "hari_waspada", "kosong", "alasan"]
LABEL = "bobot sementara, hipotesis"
TIDAK = "tidak ada data"
BELUM = "belum cukup data"
BASI_HARI = 3
NOL_BAHAYA = "bahaya tinggi tidak tercatat"


def _terbit():
    s = importlib.util.spec_from_file_location("prioritas_terbit", os.path.join(AKAR, "scripts", "prediksi", "terbit.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def persentil(nilai):
    """{kab: angka atau None} -> {kab: persentil 0..1}; None tidak ikut dan tidak muncul."""
    v = sorted(x for x in nilai.values() if x is not None)
    n = len(v)
    return {k: (bisect.bisect_left(v, x) + 0.5 * (bisect.bisect_right(v, x) - bisect.bisect_left(v, x))) / n
            for k, x in nilai.items() if x is not None}


def skor(p, bobot):
    """p = {komponen: persentil atau None} -> (skor atau None, kosong). Bahaya kosong / >= 2 kosong -> None.
    Tren kosong tidak ikut dihitung untuk ambang dua kosong (arsip tanpa jenis: kosong untuk semua kab); bobotnya tetap dibagi ulang."""
    kosong = [c for c in KOMP if p.get(c) is None]
    if "bahaya" in kosong or len([c for c in kosong if c != "tren_peringatan"]) >= 2:
        return None, kosong
    w = {c: bobot[c] for c in KOMP if c not in kosong}
    t = sum(w.values())
    return round(sum(w[c] / t * p[c] for c in w), 4), kosong


def _peringkat(x):
    urut = sorted(range(len(x)), key=lambda i: x[i])
    r = [0.0] * len(x)
    i = 0
    while i < len(x):
        j = i
        while j + 1 < len(x) and x[urut[j + 1]] == x[urut[i]]:
            j += 1
        for t in range(i, j + 1):
            r[urut[t]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(a, b):
    """Rho Spearman (peringkat rata-rata untuk seri) atau None bila n < 3 atau salah satu konstan."""
    if len(a) < 3:
        return None
    ra, rb = _peringkat(a), _peringkat(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    sab = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    sa, sb = sum((x - ma) ** 2 for x in ra), sum((y - mb) ** 2 for y in rb)
    return round(sab / (sa * sb) ** 0.5, 3) if sa and sb else None


def tren(akar, cari_id, kini, hari=30):
    """-> ({kab: hari waspada+} atau None bila arsip basi/kosong, keterangan). Kab tanpa baris di hari tercatat = 0 hari."""
    awal = (kini - dt.timedelta(days=hari)).isoformat()
    baris = []
    for f in sorted(glob.glob(os.path.join(akar, "public", "prediksi", "data", "tangga_arsip", "*.jsonl"))):
        if " 2." in os.path.basename(f):
            continue
        baris += [json.loads(l) for l in open(f, encoding="utf-8") if l.strip()]
    baris = [b for b in baris if awal < b["t"] <= kini.isoformat()]
    tgl = sorted({b["t"] for b in baris})
    ket = {"sumber": "arsip Tangga, pernyataan resmi berperingkat (Waspada=1 ke atas), semua jenis dan skala",
           "jendela_hari": hari, "hari_tercatat": len(tgl), "terakhir": tgl[-1] if tgl else None}
    if not tgl or (kini - dt.date.fromisoformat(tgl[-1])).days > BASI_HARI:
        return None, {**ket, "status": "basi", "teks": TIDAK}
    n = {k: 0 for k in cari_id}
    for t in tgl:
        kab = set()
        for b in baris:
            if b["t"] == t:
                kab |= {k for k, rr in b["kab"].items() if any((x or 0) >= 1 for r in rr for x in r)}
        for k in kab & set(n):
            n[k] += 1
    return n, {**ket, "status": "segar"}


def rentan(akar, cari):
    out = {}
    for f in glob.glob(os.path.join(akar, "public", "data", "wilayah", "[0-9][0-9].json")):
        nn = os.path.basename(f)[:2]
        for v in json.load(open(f, encoding="utf-8")).values():
            pp = v.get("pp") or {}
            k = cari(nn, v.get("n"))
            if k and pp.get("t") and pp.get("b") is not None and pp.get("l") is not None:
                out[k] = round((pp["b"] + pp["l"]) / pp["t"], 4)
    return out


def kejadian(akar, cari, jenis):
    d = json.load(open(os.path.join(akar, "public", "data", "dibi_kejadian.json"), encoding="utf-8"))
    n = {}
    for x in d["kejadian"]:
        if x.get("bencana", 1) != 0 and x["jenis"] in jenis and (k := cari(x["prov_kode"], x["kab"])):
            n[k] = n.get(k, 0) + (x.get("kejadian") or 1)
    return n, d.get("dari"), d.get("sampai")


def gerbang(akar, bid):
    p = os.path.join(akar, "public", "data", "gerbang", bid + ".json")
    d = json.load(open(p)) if os.path.exists(p) else {}
    return [{"keluaran": n, "boleh_tampil": bool(v.get("boleh_tampil"))} for n, v in (d.get("keluaran") or {}).items()]


def hitung(akar=AKAR, kini=None, bobot_jalur=BOBOT):
    cfg = json.load(open(bobot_jalur, encoding="utf-8"))
    bobot, amb = cfg["bobot"], cfg["ambang_bahaya"]
    if abs(sum(bobot.values()) - 1) > 1e-9 or set(bobot) != set(KOMP):
        raise ValueError("bobot harus 4 komponen berjumlah 1")
    T = _terbit()
    D = T.D
    kini_dt = (kini or dt.datetime.now(WIB)).replace(microsecond=0)
    daftar = D.kab(akar)
    cari = D.pencari(daftar)
    ids = {k["id"] for k in daftar}
    bah = D.baca(os.path.join(akar, "public", "banjir", "data", "bahaya.json"), {}).get("kec", {})
    kec_kab = {kec: cari(*kec.split("|")[:2]) for kec in bah}
    hari, ket_tren = tren(akar, ids, kini_dt.date())
    ren = rentan(akar, cari)
    tren_pakai = (cfg.get("tren_peringatan") or {}).get("pakai", True)
    tren_alasan = (cfg.get("tren_peringatan") or {}).get("alasan")
    if not tren_pakai:
        ket_tren = {**ket_tren, "dipakai": False, "alasan": tren_alasan, "teks": TIDAK}
    out = {}
    for bid, b in cfg["bencana"].items():
        lap = b["lapisan"]
        p_at = {"jenis": "kec_bahaya", "bahaya": lap, "ambang": amb, **({"jiwa_dari": b["jiwa_dari"]} if b.get("jiwa_dari") else {})}
        pap = T.paparan(akar, daftar, cari, [{"paparan": p_at}])
        kec = {}
        for kc, v in bah.items():
            if (k := kec_kab.get(kc)) and v.get(lap) is not None:
                kec.setdefault(k, []).append(v[lap])
        mentah = {
            "bahaya": {k: (round(sum(x >= amb for x in kec[k]) / len(kec[k]), 4) if k in kec else None) for k in ids},
            "paparan": {k: ((pap[k].get(lap) or {}).get("jiwa") if lap in pap[k] else (None if b.get("jiwa_dari") or k not in kec else 0)) for k in ids},
            "kerentanan": {k: ren.get(k) for k in ids},
            "tren_peringatan": {k: (round(hari[k] / 30, 4) if hari is not None and tren_pakai else None) for k in ids},
        }
        # bahaya 0 = tidak ada kecamatan berindeks tinggi: keluar dari peringkat; persentil hanya di antara kab bahaya > 0
        nol = {k for k in ids if mentah["bahaya"][k] == 0}
        pc = {c: persentil({k: v for k, v in mentah[c].items() if k not in nol}) for c in KOMP}
        rows, belum = [], []
        for k in daftar:
            i = k["id"]
            s, kosong = skor({c: pc[c].get(i) for c in KOMP}, bobot)
            alasan = NOL_BAHAYA if i in nol else (BELUM if s is None else None)
            if i in nol:
                s, kosong = None, [c for c in KOMP if mentah[c][i] is None]
            r = [i, k["nama"], k["prov"], None, s] + [None if pc[c].get(i) is None else round(pc[c][i], 3) for c in KOMP] + \
                [mentah["bahaya"][i], mentah["paparan"][i], mentah["kerentanan"][i],
                 hari[i] if hari is not None and tren_pakai else None, kosong, alasan]
            (rows if s is not None else belum).append(r)
        rows.sort(key=lambda r: (-r[4], r[0]))
        for n, r in enumerate(rows, 1):
            r[3] = n
        belum.sort(key=lambda r: r[0])
        kj, dari, sampai = kejadian(akar, cari, set(b["jenis_dibi"]))
        y = [kj.get(r[0], 0) for r in rows]
        rho = spearman([r[4] for r in rows], y)
        jiwa_kab = {k["id"]: k["jiwa"] for k in daftar}
        ix_jiwa = KOLOM.index("jiwa")
        pemb = {"paparan_saja": spearman([r[ix_jiwa] or 0 for r in rows], y) if all(r[ix_jiwa] is not None for r in rows) else None,
                "penduduk": spearman([jiwa_kab.get(r[0]) or 0 for r in rows], y)}
        out[bid] = {
            "dibuat": kini_dt.isoformat(), "versi": 1, "bencana": bid, "hipotesis": True, "label": LABEL,
            "hipotesis_alasan": "Bobot Q21 belum diuji terhadap kejadian; komponen bahaya, paparan, kerentanan statis.",
            "bobot": bobot, "bobot_sumber": cfg["sumber"],
            "komponen": {
                "bahaya": f"porsi kecamatan berindeks bahaya InaRISK lapisan '{lap}' >= {amb} (public/banjir/data/bahaya.json)",
                "paparan": "jiwa terpapar: " + ("penduduk zona bahaya tinggi, porsi luas kecamatan (paparan_kab.json)" if b.get("jiwa_dari")
                                                else f"seluruh penduduk kecamatan berindeks >= {amb}, batas atas") + " (scripts/prediksi/terbit.py paparan)",
                "kerentanan": "(balita 0-5 + lansia 60+) / penduduk, profil wilayah (public/data/wilayah)",
                "tren_peringatan": "tidak dipakai: " + tren_alasan if not tren_pakai else "hari Waspada ke atas 30 hari / 30, lintas jenis",
                "normalisasi": "persentil peringkat tengah (bawah + setengah seri) / n di antara kab berbahaya > 0 yang punya komponen itu; bukan min-max",
            },
            "aturan_kosong": f"komponen tanpa data = null ('{TIDAK}'), tidak pernah 0; bahaya 0 = tanpa skor, masuk belum_cukup ('{NOL_BAHAYA}'); "
                             f"bahaya kosong atau dua komponen lebih kosong = tanpa skor, masuk belum_cukup ('{BELUM}'); tren kosong tidak dihitung untuk ambang "
                             f"dua kosong; tiap komponen kosong bobotnya dibagi ulang proporsional ke yang ada (Q21), dicatat di kolom kosong",
            "ditahan": cfg.get("ditahan", {}),
            "tren": ket_tren,
            "skor_model": {"dipakai": False, "alasan": "skor model longsor (PB-49) dan hujan 50 mm (PB-50) gagal uji balik; tidak dipakai", "gerbang": gerbang(akar, bid)},
            "catatan": "Urutan tinjauan, bukan dasar anggaran. Angka antarsumber tidak dijumlah; skor adalah jumlah berbobot persentil.",
            "cek_kejadian": {"spearman": rho, "n": len(rows), "pembanding": pemb, "jenis_dibi": b["jenis_dibi"], "dari": dari, "sampai": sampai,
                             "kab_berkejadian": sum(1 for r in rows if kj.get(r[0])),
                             "catatan": "deskriptif saja, bukan uji balik dan bukan dasar setel bobot; kab tanpa baris DIBI dihitung 0 kejadian. "
                                         "Jumlah kejadian tidak dibagi penduduk: skor gabungan yang tidak mengungguli paparan_saja sebagian besar mengukur besar kab"},
            "kolom": KOLOM, "baris": rows, "belum_cukup": belum,
        }
    return out


def tulis(isi, folder=KELUAR, ditahan=()):
    os.makedirs(folder, exist_ok=True)
    for bid in ditahan:   # bencana ditahan: berkas lama dibuang, tidak ditimpa
        if os.path.exists(os.path.join(folder, bid + ".json")):
            os.remove(os.path.join(folder, bid + ".json"))
    for bid, d in isi.items():
        p = os.path.join(folder, bid + ".json")
        with open(p + ".tmp", "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, separators=(",", ":"))
        os.replace(p + ".tmp", p)


def uji():
    B = {"bahaya": 0.4, "paparan": 0.3, "kerentanan": 0.2, "tren_peringatan": 0.1}
    assert persentil({"a": 1, "b": 2, "c": 2, "d": None}) == {"a": 1 / 6, "b": 2 / 3, "c": 2 / 3}
    assert skor({"bahaya": 1, "paparan": 1, "kerentanan": 1, "tren_peringatan": 1}, B) == (1.0, [])
    # satu kosong (bukan bahaya): bobot dibagi ulang, bukan diisi 0
    s, k = skor({"bahaya": 1, "paparan": 1, "kerentanan": None, "tren_peringatan": 1}, B)
    assert s == 1.0 and k == ["kerentanan"], (s, k)
    s, _ = skor({"bahaya": 0.5, "paparan": 0.0, "kerentanan": None, "tren_peringatan": 0.0}, B)
    assert s == round(0.4 / 0.8 * 0.5, 4)
    # dua kosong, atau bahaya kosong: tanpa skor
    assert skor({"bahaya": 1, "paparan": None, "kerentanan": None, "tren_peringatan": 1}, B)[0] is None
    assert skor({"bahaya": None, "paparan": 1, "kerentanan": 1, "tren_peringatan": 1}, B)[0] is None
    # tren kosong + satu kosong lain: tetap berperingkat (tren tidak ikut ambang dua kosong), bobot dibagi ulang ke dua sisanya
    s, k = skor({"bahaya": 1.0, "paparan": 0.5, "kerentanan": None, "tren_peringatan": None}, B)
    assert s == round((0.4 * 1.0 + 0.3 * 0.5) / 0.7, 4) and k == ["kerentanan", "tren_peringatan"], (s, k)
    assert skor({"bahaya": 1, "paparan": None, "kerentanan": None, "tren_peringatan": None}, B)[0] is None
    assert spearman([1, 2, 3, 4], [10, 20, 30, 40]) == 1.0 and spearman([1, 2, 3, 4], [4, 3, 2, 1]) == -1.0
    assert spearman([1, 2, 3], [5, 5, 5]) is None and spearman([1, 2], [1, 2]) is None
    # bobot ditolak bila tidak berjumlah 1
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "b.json")
        c = json.load(open(BOBOT, encoding="utf-8"))
        json.dump({**c, "bobot": {**c["bobot"], "bahaya": 0.5}}, open(p, "w"))
        try:
            hitung(bobot_jalur=p)
            raise AssertionError("bobot tak berjumlah 1 lolos")
        except ValueError as e:
            assert "berjumlah 1" in str(e), e
    assert json.load(open(BOBOT, encoding="utf-8"))["bobot"] == B, "bobot berubah dari Q21 tanpa uji"
    # data repo nyata: arsip basi -> tren null untuk semua (tidak ada data, bukan 0)
    cfg = json.load(open(BOBOT, encoding="utf-8"))
    assert "pesisir" not in cfg["bencana"] and "masker garis pantai" in cfg["ditahan"]["pesisir"], "pesisir dinilai tanpa masker garis pantai"
    assert cfg["tren_peringatan"] == {"pakai": False, "alasan": "arsip tanpa jenis bencana"}
    ix = {c: i for i, c in enumerate(KOLOM)}
    # arsip basi tetap tercatat basi; tren null untuk semua kab
    basi = hitung(kini=dt.datetime(2027, 6, 1, 8, tzinfo=WIB))
    assert all(d["tren"]["status"] == "basi" for d in basi.values())
    isi = hitung(kini=dt.datetime(2026, 11, 25, 8, tzinfo=WIB))
    assert set(isi) == {"banjir", "longsor", "kekeringan"}, set(isi)
    with tempfile.TemporaryDirectory() as t:
        open(os.path.join(t, "pesisir.json"), "w").write("{}")
        tulis(isi, t, ditahan=cfg["ditahan"])
        assert not os.path.exists(os.path.join(t, "pesisir.json")), "berkas bencana ditahan tidak dibuang"
        for bid in isi:
            raw = open(os.path.join(t, bid + ".json"), encoding="utf-8").read()
            assert len(raw.encode()) <= 1024 * 1024, (bid, len(raw))
            d = json.loads(raw)
            assert next(iter(d)) == "dibuat" and d["hipotesis"] is True and d["label"] == LABEL and d["skor_model"]["dipakai"] is False
            assert not re.search(r"\baman\b|bukan wilayah berbahaya", raw, re.I), bid
            assert d["tren"]["dipakai"] is False and d["tren"]["alasan"] == "arsip tanpa jenis bencana" and d["tren"]["hari_tercatat"] >= 1
            ck = d["cek_kejadian"]
            assert d["baris"] and ck["n"] == len(d["baris"]) and set(ck["pembanding"]) == {"paparan_saja", "penduduk"} and "dibagi penduduk" in ck["catatan"]
            for r in d["baris"]:
                assert 0 <= r[ix["skor"]] <= 1 and r[ix["bahaya"]] > 0 and r[ix["alasan"]] is None
                assert r[ix["p_tren"]] is None and r[ix["hari_waspada"]] is None and "tren_peringatan" in r[ix["kosong"]]
                assert len([c for c in r[ix["kosong"]] if c != "tren_peringatan"]) <= 1
                for c, m in (("p_paparan", "paparan"), ("p_kerentanan", "kerentanan")):
                    assert (r[ix[c]] is None) == (m in r[ix["kosong"]]), r
            assert any(r[ix["rentan"]] is None for r in d["baris"]), "kab tanpa kerentanan (Papua) mestinya tetap berperingkat"
            assert [r[ix["peringkat"]] for r in d["baris"]] == list(range(1, len(d["baris"]) + 1))
            for r in d["belum_cukup"]:
                assert r[ix["skor"]] is None and r[ix["alasan"]] in (NOL_BAHAYA, BELUM)
                assert (r[ix["alasan"]] == NOL_BAHAYA) == (r[ix["bahaya"]] == 0), r
                if r[ix["alasan"]] == NOL_BAHAYA:   # persentil tidak dihitung untuk kab bahaya 0
                    assert all(r[ix[c]] is None for c in ("p_bahaya", "p_paparan", "p_kerentanan", "p_tren")), r
            s = [r[ix["skor"]] for r in d["baris"]]
            assert s == sorted(s, reverse=True)
    print("prioritas uji: lulus (" + ", ".join(f"{b} {len(d['baris'])} kab, belum cukup {len(d['belum_cukup'])}, rho {d['cek_kejadian']['spearman']} {d['cek_kejadian']['pembanding']}"
                                                for b, d in isi.items()) + ")")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else ""
    if a == "uji":
        uji()
    elif a == "buat":
        isi = hitung()
        tulis(isi, ditahan=json.load(open(BOBOT, encoding="utf-8")).get("ditahan", {}))
        for bid, d in isi.items():
            print(f"prioritas {bid}: {len(d['baris'])} kab berperingkat, {len(d['belum_cukup'])} belum cukup data, "
                  f"spearman {d['cek_kejadian']['spearman']} (n {d['cek_kejadian']['n']}), tren {d['tren']['status']}")
    else:
        sys.exit(__doc__)
