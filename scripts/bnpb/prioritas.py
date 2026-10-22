"""Prioritas dampak per kecamatan (F2) -> public/banjir/data/risiko_prioritas.json

Dipilih dari risiko_kecamatan.json (keluaran risiko.py):
  (a) kelas NAIK dibanding data risiko sebelumnya DAN sekarang Tinggi atau lebih, atau
  (b) skor yang dihitung HANYA dari bahaya HARIAN (karhutla, banjir, gunung api, cuaca, udara, kekeringan; gempa hanya di provinsi
      yang punya gempa terdampak 7 hari terakhir, lihat bawah) sudah kelas Sangat tinggi. Bahaya harian dipisah dari statis supaya
      kecamatan yang bahaya statisnya besar tetapi harian aktifnya juga parah tak terlewat. Ambang bahaya harian terpisah (dulu HARIAN_AKTIF = 0,5) DIHAPUS: redundan, sebab skor <= 100 x bahaya, jadi
      skor >= 60 berarti bahaya >= 0,6 > 0,5; ambangnya tak pernah mengikat.
  Kapasitas yang dipakai di sini SELALU kap_statis (jarak BPBD), bukan kapasitas dinamis relawan: daftar waspada tak boleh bisa ditekan
  dengan pendaftaran relawan (palsu). Skor kecamatan di layar boleh memakai dinamis; daftar ini tidak.
  Label: prioritas ini belum diuji balik (hanya komponen statis banjir/longsor dan gempa yang pernah diuji; lihat risiko_ujibalik.json).
Kekeringan (ambang hipotesis, POD 0,23 / FAR 0,93) DIKELUARKAN dari penentuan (a) (kelas naik, skor semua bahaya), supaya tak ada
"naik" semu dari ambang yang meragukan; skor (a) dihitung ulang dengan rumus risiko() yang sama tanpa kekeringan. Kekeringan MASUK pemicu
(b) (bahaya harian) karena F2 harus mencakup semua bencana, tetapi baris yang bahaya utamanya kekeringan diberi `hipotesis: true`
(layar menampilkan pil hipotesis) dan jumlahnya dicatat di ringkas.hipotesis. Udara masuk (b) sebagai bahaya harian (prakiraan PM2,5, belum diuji balik).
Gempa: bahaya gempa di risiko.py adalah InaRISK STATIS (tidak berubah harian), jadi gempa memicu (b) hanya untuk kecamatan di provinsi
yang punya sorot "gempa terdampak" 7 hari terakhir di public/gempa/data/laporan.json (tsunami BMKG, gempa M >= 6 USGS, atau dirasakan
MMI >= V BMKG; kunci prov dari sorot). Bobot statis tetap InaRISK; kejadian terbaru hanya membuka pemicu, bukan menaikkan angka.
Sorot tanpa prov (tak terpetakan ke provinsi) tidak memicu. Gempa tetap bisa memicu (a) lewat skor semua bahaya.
Urut = dampak = penduduk x bahaya utama (jiwa tertimbang), turun; paling banyak 200 kecamatan. Tiap baris: bahaya utama, kelas,
penduduk terpapar, kabupaten, BPBD terdekat (nama, nomor Pusdalops, jarak), perubahan.

"Sebelumnya" = kelas pada data risiko dengan `dibuat` yang BERBEDA dari yang terakhir dilihat. Jalan 6 jam atas data risiko yang sama
tidak menggeser pembanding, jadi "naik" bertahan sampai risiko_kecamatan.json diganti. Kelas disimpan sebagai string digit
selaras urutan kecamatan (+ sidik kunci); urutan kunci berubah = tanpa pembanding (perubahan null), bukan tebakan.

Pakai:  python3 scripts/bnpb/prioritas.py [--keluar BERKAS]   |   python3 scripts/bnpb/prioritas.py --cek
Workflow: tiap 6 jam, sesudah risiko.py (kalau risiko.py hanya harian, "naik" tetap benar karena pembanding dikunci ke `dibuat`).
"""
import argparse, datetime as dt, hashlib, json, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
sys.path.insert(0, AB)
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import risiko as R
import kejadian as _kej

DATA = os.path.join(AKAR, "public/banjir/data")
WIB = dt.timezone(dt.timedelta(hours=7))
MAKS = 200
KELAS_MIN = 2                      # Tinggi
HARIAN = tuple(b for b in R.BENCANA if b in {"karhutla", "banjir", "gunungapi", "cuaca", "udara", "kekeringan"})   # bahaya yang berubah harian (banjir = statis x peluang hujan hari ini)
HIPOTESIS = set(R.HIPOTESIS)   # dikeluarkan dari (a) dan diberi tanda hipotesis bila menjadi bahaya utama pemicu (b)
USANG_HARI = 2


def baca(jalur):
    return _kej.baca(jalur)


def tanpa_hipotesis(row, ix):
    """-> (skor, bahaya, utama) memakai risiko() tanpa bahaya hipotesis."""
    h = {b: row[ix["h_" + b]] for b in R.BENCANA if b not in HIPOTESIS}
    return R.risiko(h, row[ix["pangkat"]], row[ix["kap_statis"]])


def gempa_area(lap, sekarang):
    """laporan.json gempa -> {prov: None | {kab ternormal}} dari sorot 7 hari terakhir (tsunami, M >= 6, atau MMI >= V).
    Sorot yang punya `kab` (teks atau larik) membatasi pemicu ke kabupaten itu; tanpa `kab` = seluruh provinsi. Berkas lebih tua dari
    USANG_HARI menurut `dibuat` (atau tanpa tanggal) = kosong: gempa lama tidak boleh memicu. Gagal baca = kosong."""
    try:
        if (sekarang.date() - dt.date.fromisoformat(str((lap or {}).get("dibuat"))[:10])).days > USANG_HARI:
            return {}
    except ValueError:
        return {}
    out = {}
    for x in (lap or {}).get("sorot") or []:
        if not x.get("prov"):
            continue
        kab = x.get("kab")
        kab = {R.norm_kab(k) for k in ([kab] if isinstance(kab, str) else kab or [])}
        if x["prov"] in out and out[x["prov"]] is None:
            continue                                   # provinsi sudah seluruhnya
        out[x["prov"]] = None if not kab else (out.get(x["prov"]) or set()) | kab
    return out


def gempa_kena(gp, row, ix):
    k = gp.get(row[ix["prov"]], False)
    return k is None or (k is not False and R.norm_kab(row[ix["kab"]]) in k)


def hanya_harian(row, ix, gempa=False):
    """-> (skor, bahaya, utama) dari bahaya HARIAN saja (kapasitas statis); pemicu (b). Gempa ikut hanya bila gempa=True (kecamatan kena sorot)."""
    ada = HARIAN + (("gempa",) if gempa else ())
    return R.risiko({b: row[ix["h_" + b]] for b in ada}, row[ix["pangkat"]], row[ix["kap_statis"]])


def kelas_semua(r):
    ix = {k: i for i, k in enumerate(r["kolom"])}
    return "".join("x" if (s := tanpa_hipotesis(row, ix)[0]) is None else str(R.kelas_dari(s)) for row in r["kec"])


def sidik(r):
    return hashlib.sha1("\n".join(f"{x[0]}|{x[1]}|{x[2]}" for x in r["kec"]).encode()).hexdigest()[:12]


def pembanding(lama, r):
    """lama = berkas prioritas sebelumnya (atau None) -> (snapshot kini, snapshot sebelum atau None) menurut aturan `dibuat`."""
    kini = {"risiko_dibuat": r.get("dibuat"), "hari": r["hari"], "sidik": sidik(r), "kelas": kelas_semua(r)}
    s = (lama or {}).get("snapshot") or {}
    ada = s.get("kini")
    if ada and ada.get("risiko_dibuat") == kini["risiko_dibuat"] and ada.get("sidik") == kini["sidik"]:
        return ada, s.get("sebelum")                    # data risiko sama: pembanding lama tetap
    if ada and ada.get("sidik") == kini["sidik"]:
        return kini, ada
    return kini, None                                   # kecamatan berubah atau jalan pertama: tanpa pembanding


def bpbd_terdekat(bpbd, lat, lon, kab):
    """Kantor bernama kabupaten itu (bila terpetakan), selain itu kantor terdekat (sekab False: bisa kantor kabupaten tetangga)."""
    b = bk = None
    for x in bpbd:
        if x.get("lat") is None:
            continue
        d = _kej.km((lat, lon), (x["lat"], x["lon"]))
        if b is None or d < b[0]:
            b = (d, x)
        if R.norm_kab(x["nama"]) == R.norm_kab(kab) and (bk is None or d < bk[0]):
            bk = (d, x)
    pilih_ = bk or b
    return None if pilih_ is None else {"nama": pilih_[1]["nama"], "pusdalops": pilih_[1].get("pusdalops") or None, "km": round(pilih_[0], 1), "sekab": bk is not None}


def pilih(r, kini, sebelum, pusat, bpbd, gp={}):
    ix = {k: i for i, k in enumerate(r["kolom"])}
    out = []
    for i, row in enumerate(r["kec"]):
        s, b, u = tanpa_hipotesis(row, ix)
        if s is None:
            continue
        kelas = R.kelas_dari(s)
        dari = None if sebelum is None or sebelum["kelas"][i] == "x" else int(sebelum["kelas"][i])
        naik = dari is not None and kelas > dari
        sh, bh, uh = hanya_harian(row, ix)
        aktif = sh is not None and R.kelas_dari(sh) == 3
        sg, bg, ug = hanya_harian(row, ix, True) if gempa_kena(gp, row, ix) else (None, None, None)
        gempa = sg is not None and R.kelas_dari(sg) == 3 and ug == "gempa"      # gempa terbaru yang memicu, terpisah dari bahaya harian
        if gempa:
            sh, bh, uh = sg, bg, ug
        if aktif or gempa:
            if sh > s:                          # pemicu harian termasuk bahaya yang tak ikut skor (a) (kekeringan hipotesis): skor dan kelas yang tampil = skor harian
                s, kelas = sh, R.kelas_dari(sh)
            b, u = bh, uh                       # bahaya yang dilaporkan = bahaya harian yang memicu (sama dengan utama bila utama sudah harian)
        if not ((naik and kelas >= KELAS_MIN) or aktif or gempa):
            continue
        pend = row[ix["pend"]]
        if not pend:
            continue
        p = pusat.get(f"{row[0]}|{row[1]}|{row[2]}")
        out.append({
            "prov": row[0], "prov_nama": r["provinsi"].get(row[0]), "kab": row[1], "kec": row[2],
            "kelas": kelas, "kelas_nama": R.KELAS[kelas], "skor": round(s), "utama": u, "utama_nama": R.NAMA[u], "bahaya": round(b, 2),
            "pend": pend, "dampak": round(pend * b),
            "alasan": ["naik"] * naik + ["harian_aktif"] * aktif + ["gempa_terbaru"] * gempa, "hipotesis": u in HIPOTESIS,
            "perubahan": None if sebelum is None else ("naik" if naik else ("turun" if dari is not None and kelas < dari else "tetap")),
            "dari_kelas": None if dari is None else R.KELAS[dari],
            "bpbd": bpbd_terdekat(bpbd, p[0], p[1], row[1]) if p else None})
    out.sort(key=lambda x: (-x["dampak"], x["prov"], x["kab"], x["kec"]))
    return out


def bangun(r, pusat, bpbd, lama, sekarang, gp={}):
    kini, sebelum = pembanding(lama, r)
    semua = pilih(r, kini, sebelum, pusat, bpbd, gp)
    pilihan = semua[:MAKS]
    umur = (sekarang.date() - dt.date.fromisoformat(r["hari"])).days
    return {
        "versi": 1, "hari": r["hari"], "risiko_dibuat": r.get("dibuat"), "label": r["label"], "usang": umur > USANG_HARI,
        "aturan": f"kelas naik dibanding data risiko sebelumnya dan sekarang Tinggi atau lebih; ATAU skor dari bahaya harian saja ({', '.join(sorted(HARIAN))}, dan gempa di provinsi yang punya gempa terdampak 7 hari terakhir) sudah Sangat tinggi. Kapasitas = statis (jarak BPBD), bukan dinamis relawan. Kekeringan (hipotesis) dikeluarkan dari kelas naik; baris berbahaya utama kekeringan diberi tanda hipotesis. Urut: penduduk × bahaya utama.",
        "label_prioritas": "prioritas: belum diuji balik", "gempa_prov": {k: (None if v is None else sorted(v)) for k, v in sorted(gp.items())},
        "pembanding": None if sebelum is None else {"hari": sebelum["hari"], "risiko_dibuat": sebelum["risiko_dibuat"]},
        "ringkas": {"kecamatan": len(pilihan), "memenuhi_syarat": len(semua), "jiwa": sum(x["pend"] for x in pilihan), "naik": sum("naik" in x["alasan"] for x in pilihan),
                    "harian_aktif": sum("harian_aktif" in x["alasan"] for x in pilihan), "gempa_terbaru": sum("gempa_terbaru" in x["alasan"] for x in pilihan), "hipotesis": sum(x["hipotesis"] for x in pilihan),
                    "utama": {b: sum(x["utama"] == b for x in pilihan) for b in sorted({x["utama"] for x in pilihan})}, "kabupaten": len({(x["prov"], x["kab"]) for x in pilihan})},
        "kec": pilihan,
        "snapshot": {"kini": kini, "sebelum": sebelum},
    }


def lengkapi(r):
    """Berkas risiko lama (sebelum bencana baru masuk R.BENCANA) tak punya kolom h_<bencana>: tambahkan sebagai null (belum diukur, bukan 0)."""
    for b in R.BENCANA:
        if r and "h_" + b not in r["kolom"]:
            r["kolom"].append("h_" + b)
            for row in r["kec"]:
                row.append(None)
    return r


def muat():
    return (lengkapi(baca(os.path.join(DATA, "risiko_kecamatan.json"))), baca(os.path.join(DATA, "pusat_kec.json")),
            (baca(os.path.join(AKAR, "public/data/bpbd.json")) or {}).get("kantor"), gempa_area(baca(os.path.join(AKAR, "public/gempa/data/laporan.json")), dt.datetime.now(WIB)))


def cek():
    r, pusat, bpbd, gp0 = muat()
    assert r and pusat and bpbd, "masukan hilang"
    now = dt.datetime.fromisoformat(r["hari"] + "T12:00:00+07:00")
    a = bangun(r, pusat, bpbd, None, now)
    assert a == bangun(r, pusat, bpbd, None, now), "tidak deterministik"
    assert a["pembanding"] is None and all(x["perubahan"] is None and x["alasan"] == ["harian_aktif"] for x in a["kec"]), "jalan pertama: tanpa pembanding, hanya pemicu harian"
    ix = {k: i for i, k in enumerate(r["kolom"])}
    # ubah satu kecamatan jadi naik: pembanding sintetis dengan kelas lebih rendah
    kunci = [i for i, row in enumerate(r["kec"]) if (s := tanpa_hipotesis(row, ix)[0]) is not None and R.kelas_dari(s) >= KELAS_MIN and row[ix["pend"]]]
    assert kunci, "tidak ada kecamatan Tinggi+ untuk diuji"
    i0 = kunci[0]
    kini = a["snapshot"]["kini"]
    rendah = kini["kelas"][:i0] + "0" + kini["kelas"][i0 + 1:]
    lama = {"snapshot": {"kini": {**kini, "risiko_dibuat": "lama", "kelas": rendah}, "sebelum": None}}
    b = bangun(r, pusat, bpbd, lama, now)
    assert b["snapshot"]["sebelum"]["kelas"] == rendah and b["snapshot"]["kini"]["risiko_dibuat"] == r.get("dibuat")
    ada = [x for x in b["kec"] if "naik" in x["alasan"]]
    nama0 = r["kec"][i0][:3]
    assert len(ada) >= 1 and any([x["prov"], x["kab"], x["kec"]] == nama0 or (x["prov"], x["kab"], x["kec"]) == tuple(nama0) for x in ada), "kecamatan yang naik harus terpilih"
    # kapasitas dinamis tidak boleh menekan daftar: kap_dinamis penuh memakai kap_statis, hasil sama
    r5 = json.loads(json.dumps(r))
    for row in r5["kec"]:
        row[ix["kapasitas"]] = 1.0
        row[ix["kap_dinamis"]] = 1.0
    assert bangun(r5, pusat, bpbd, None, now)["kec"] == a["kec"], "daftar prioritas harus memakai kap_statis, bukan kapasitas dinamis"
    for row in r["kec"][:2000]:
        assert tanpa_hipotesis(row, ix)[0] == R.risiko({k: row[ix["h_" + k]] for k in R.BENCANA if k != "kekeringan"}, row[ix["pangkat"]], row[ix["kap_statis"]])[0]
    # pemicu (b) = skor dari bahaya harian saja; gempa statis tinggi tidak ikut dan tidak menghalangi
    baris_t = [None] * len(r["kolom"])
    for k in ("prov", "kab", "kec"):
        baris_t[ix[k]] = "x"
    for k in R.BENCANA:
        baris_t[ix["h_" + k]] = 0.0
    baris_t[ix["pangkat"]], baris_t[ix["kap_statis"]], baris_t[ix["h_gempa"]], baris_t[ix["h_cuaca"]] = 1.0, 0.0, 1.0, 0.7
    sh, bh, uh = hanya_harian(baris_t, ix)
    assert uh == "cuaca" and R.kelas_dari(sh) == 3 and tanpa_hipotesis(baris_t, ix)[2] == "gempa", "bahaya harian dipisah dari statis"
    baris_t[ix["h_cuaca"]] = 0.5
    assert R.kelas_dari(hanya_harian(baris_t, ix)[0]) == 2
    # semua bencana harian bisa memicu (b); kekeringan bertanda hipotesis; gempa hanya di provinsi bersorot
    assert {"udara", "kekeringan", "cuaca"} <= set(HARIAN) and "gempa" not in HARIAN and "udara" in R.BENCANA
    for h_, jika in (("udara", "udara"), ("kekeringan", "kekeringan")):
        t = list(baris_t); t[ix["h_" + h_]] = 1.0; t[ix["h_cuaca"]] = 0.0
        sh, _, uh = hanya_harian(t, ix)
        assert uh == h_ and R.kelas_dari(sh) == 3, h_
    t = list(baris_t); t[ix["h_cuaca"]] = 0.0; t[ix["h_gempa"]] = 1.0; t[ix["prov"]] = "53"
    assert R.kelas_dari(hanya_harian(t, ix)[0]) == 0, "gempa statis tanpa kejadian terbaru tidak memicu"
    t[ix["kab"]] = "Manggarai"
    kini_ = dt.datetime(2026, 10, 22, 12, tzinfo=WIB)
    seg = {"dibuat": "2026-10-21T08:47+07:00", "sorot": [{"prov": "53"}, {"prov": None}, {}]}
    assert gempa_area(seg, kini_) == {"53": None} and gempa_area(None, kini_) == {} and gempa_area({}, kini_) == {}
    assert gempa_area({**seg, "dibuat": "2026-10-10T00:00+07:00"}, kini_) == {}, "laporan gempa usang tidak memicu"
    assert gempa_area({"sorot": seg["sorot"]}, kini_) == {}, "tanpa tanggal tidak dipercaya"
    sk = {"dibuat": seg["dibuat"], "sorot": [{"prov": "53", "kab": "Kab. Manggarai"}, {"prov": "53", "kab": ["Bima"]}]}
    ga = gempa_area(sk, kini_)
    assert ga == {"53": {R.norm_kab("Manggarai"), R.norm_kab("Bima")}}, ga
    assert gempa_kena(ga, t, ix) and gempa_kena({"53": None}, t, ix) and not gempa_kena({"11": None}, t, ix) and not gempa_kena({}, t, ix)
    t2 = list(t); t2[ix["kab"]] = "Sumba"
    assert not gempa_kena(ga, t2, ix), "sorot ber-kab hanya memicu kabupatennya"
    assert hanya_harian(t, ix, True)[2] == "gempa" and R.kelas_dari(hanya_harian(t, ix, True)[0]) == 3 and R.kelas_dari(hanya_harian(t, ix)[0]) == 0
    # seri nilai: bahaya teruji menang atas hipotesis, tak peduli urutan masukan atau PYTHONHASHSEED
    seri = {"kekeringan": 0.67, "cuaca": 0.67, "udara": 0.67}
    import itertools
    assert {R.utama_dari(dict((k, seri[k]) for k in o)) for o in itertools.permutations(seri)} == {"cuaca"}, "seri harus deterministik dan teruji menang"
    assert R.utama_dari({"kekeringan": 0.67, "karhutla": 0.67}) == "karhutla" and R.utama_dari({"kekeringan": 0.7, "cuaca": 0.67}) == "kekeringan"
    for o in itertools.permutations(HARIAN):
        tt = list(baris_t); tt[ix["h_kekeringan"]] = tt[ix["h_cuaca"]] = 0.67
        assert R.risiko({k: tt[ix["h_" + k]] for k in o}, 1.0, 0.0)[2] == "cuaca"
    # data risiko yang sama dijalankan lagi: pembanding tidak bergeser, hasil sama
    c = bangun(r, pusat, bpbd, b, now)
    assert c["kec"] == b["kec"] and c["snapshot"] == b["snapshot"], "pembanding bergeser pada data risiko yang sama"
    # urutan kecamatan berubah = tanpa pembanding, bukan tebakan
    r2 = json.loads(json.dumps(r)); r2["kec"] = r2["kec"][::-1]; r2["dibuat"] = "baru"
    assert bangun(r2, pusat, bpbd, b, now)["pembanding"] is None
    # invarian keluaran
    assert 0 < len(b["kec"]) <= MAKS and b["ringkas"]["jiwa"] == sum(x["pend"] for x in b["kec"])
    d = [x["dampak"] for x in b["kec"]]
    assert d == sorted(d, reverse=True)
    for x in b["kec"]:
        assert x["kelas"] >= KELAS_MIN and x["hipotesis"] == (x["utama"] == "kekeringan") and x["pend"] > 0 and x["alasan"]
        assert x["bpbd"] is None or (x["bpbd"]["nama"] and x["bpbd"]["km"] >= 0)
    assert any(x["bpbd"] and x["bpbd"]["pusdalops"] for x in b["kec"]), "tak ada nomor Pusdalops"
    ks = [{"nama": "MAROS", "lat": 0.0, "lon": 0.0, "pusdalops": "1"}, {"nama": "KOTA MAKASSAR", "lat": 0.0, "lon": 0.5, "pusdalops": "2"}]
    assert bpbd_terdekat(ks, 0.0, 0.1, "Kota Makassar")["pusdalops"] == "2" and bpbd_terdekat(ks, 0.0, 0.1, "Kota Makassar")["sekab"] is True
    assert bpbd_terdekat(ks, 0.0, 0.1, "Gowa") == {"nama": "MAROS", "pusdalops": "1", "km": round(_kej.km((0, 0.1), (0, 0)), 1), "sekab": False}
    # null bukan 0: skor hilang -> tidak dipilih
    r3 = json.loads(json.dumps(r))
    for row in r3["kec"]:
        row[ix["pangkat"]] = None
    assert bangun(r3, pusat, bpbd, None, now)["kec"] == []
    # usang
    assert bangun(r, pusat, bpbd, None, now + dt.timedelta(days=5))["usang"] is True and a["usang"] is False
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "p.json")
        _kej.simpan(p, b)
        assert next(iter(json.load(open(p)))) == "dibuat" and os.path.getsize(p) < 300_000, os.path.getsize(p)
    assert b["label_prioritas"] == "prioritas: belum diuji balik" and "HARIAN_AKTIF" not in globals()
    print(f"cek ok: jalan pertama {a['ringkas']}; dengan pembanding sintetis {b['ringkas']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--keluar", default=os.path.join(DATA, "risiko_prioritas.json"))
    a = ap.parse_args()
    if a.cek:
        return cek()
    r, pusat, bpbd, gp = muat()
    if not (r and pusat and bpbd):
        sys.exit("prioritas: masukan hilang; tidak menulis apa pun")
    isi = bangun(r, pusat, bpbd, baca(a.keluar), dt.datetime.now(WIB), gp)
    _kej.simpan(a.keluar, isi)
    print(f"prioritas: {isi['ringkas']}; pembanding {isi['pembanding']}; {os.path.getsize(a.keluar) // 1024} KB", file=sys.stderr)


if __name__ == "__main__":
    main()
