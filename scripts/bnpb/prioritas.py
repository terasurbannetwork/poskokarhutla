"""Prioritas dampak per kecamatan (F2) -> public/banjir/data/risiko_prioritas.json

Dipilih dari risiko_kecamatan.json (keluaran risiko.py):
  (a) kelas NAIK dibanding data risiko sebelumnya DAN sekarang Tinggi atau lebih, atau
  (b) skor yang dihitung HANYA dari bahaya HARIAN (karhutla, banjir, gunung api, cuaca; tanpa gempa statis dan tanpa kekeringan) sudah
      kelas Sangat tinggi. Bahaya harian dipisah dari statis supaya kecamatan yang bahaya statisnya besar tetapi harian aktifnya juga
      parah tak terlewat. Ambang bahaya harian terpisah (dulu HARIAN_AKTIF = 0,5) DIHAPUS: redundan, sebab skor <= 100 x bahaya, jadi
      skor >= 60 berarti bahaya >= 0,6 > 0,5; ambangnya tak pernah mengikat.
  Kapasitas yang dipakai di sini SELALU kap_statis (jarak BPBD), bukan kapasitas dinamis relawan: daftar waspada tak boleh bisa ditekan
  dengan pendaftaran relawan (palsu). Skor kecamatan di layar boleh memakai dinamis; daftar ini tidak.
  Label: prioritas ini belum diuji balik (hanya komponen statis banjir/longsor dan gempa yang pernah diuji; lihat risiko_ujibalik.json).
Kekeringan (ambang hipotesis, POD 0,23 / FAR 0,93) DIKELUARKAN dari penentuan kelas di sini; skor dihitung ulang dengan rumus
risiko() yang sama tanpa kekeringan. Gempa statis tidak pernah memicu (b) (tidak berubah harian) tetapi bisa memicu (a).
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
HARIAN = {"karhutla", "banjir", "gunungapi", "cuaca"}   # bahaya yang berubah harian (banjir = statis x peluang hujan hari ini)
HIPOTESIS = {"kekeringan"}
USANG_HARI = 2


def baca(jalur):
    return _kej.baca(jalur)


def tanpa_hipotesis(row, ix):
    """-> (skor, bahaya, utama) memakai risiko() tanpa bahaya hipotesis."""
    h = {b: row[ix["h_" + b]] for b in R.BENCANA if b not in HIPOTESIS}
    return R.risiko(h, row[ix["pangkat"]], row[ix["kap_statis"]])


def hanya_harian(row, ix):
    """-> (skor, bahaya, utama) dari bahaya HARIAN saja (kapasitas statis); pemicu (b)."""
    return R.risiko({b: row[ix["h_" + b]] for b in HARIAN}, row[ix["pangkat"]], row[ix["kap_statis"]])


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


def pilih(r, kini, sebelum, pusat, bpbd):
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
        if aktif:
            b, u = bh, uh                       # bahaya yang dilaporkan = bahaya harian yang memicu (sama dengan utama bila utama sudah harian)
        if not ((naik and kelas >= KELAS_MIN) or aktif):
            continue
        pend = row[ix["pend"]]
        if not pend:
            continue
        p = pusat.get(f"{row[0]}|{row[1]}|{row[2]}")
        out.append({
            "prov": row[0], "prov_nama": r["provinsi"].get(row[0]), "kab": row[1], "kec": row[2],
            "kelas": kelas, "kelas_nama": R.KELAS[kelas], "skor": round(s), "utama": u, "utama_nama": R.NAMA[u], "bahaya": round(b, 2),
            "pend": pend, "dampak": round(pend * b),
            "alasan": ["naik"] * naik + ["harian_aktif"] * aktif,
            "perubahan": None if sebelum is None else ("naik" if naik else ("turun" if dari is not None and kelas < dari else "tetap")),
            "dari_kelas": None if dari is None else R.KELAS[dari],
            "bpbd": bpbd_terdekat(bpbd, p[0], p[1], row[1]) if p else None})
    out.sort(key=lambda x: (-x["dampak"], x["prov"], x["kab"], x["kec"]))
    return out


def bangun(r, pusat, bpbd, lama, sekarang):
    kini, sebelum = pembanding(lama, r)
    semua = pilih(r, kini, sebelum, pusat, bpbd)
    pilihan = semua[:MAKS]
    umur = (sekarang.date() - dt.date.fromisoformat(r["hari"])).days
    return {
        "versi": 1, "hari": r["hari"], "risiko_dibuat": r.get("dibuat"), "label": r["label"], "usang": umur > USANG_HARI,
        "aturan": f"kelas naik dibanding data risiko sebelumnya dan sekarang Tinggi atau lebih; ATAU skor dari bahaya harian saja ({', '.join(sorted(HARIAN))}) sudah Sangat tinggi. Kapasitas = statis (jarak BPBD), bukan dinamis relawan. Kekeringan (hipotesis) dikeluarkan dari penentuan. Urut: penduduk × bahaya utama.",
        "label_prioritas": "prioritas: belum diuji balik",
        "pembanding": None if sebelum is None else {"hari": sebelum["hari"], "risiko_dibuat": sebelum["risiko_dibuat"]},
        "ringkas": {"kecamatan": len(pilihan), "memenuhi_syarat": len(semua), "jiwa": sum(x["pend"] for x in pilihan), "naik": sum("naik" in x["alasan"] for x in pilihan),
                    "harian_aktif": sum("harian_aktif" in x["alasan"] for x in pilihan), "kabupaten": len({(x["prov"], x["kab"]) for x in pilihan})},
        "kec": pilihan,
        "snapshot": {"kini": kini, "sebelum": sebelum},
    }


def muat():
    return (baca(os.path.join(DATA, "risiko_kecamatan.json")), baca(os.path.join(DATA, "pusat_kec.json")),
            (baca(os.path.join(AKAR, "public/data/bpbd.json")) or {}).get("kantor"))


def cek():
    r, pusat, bpbd = muat()
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
        assert x["kelas"] >= KELAS_MIN and x["utama"] != "kekeringan" and x["pend"] > 0 and x["alasan"]
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
    r, pusat, bpbd = muat()
    if not (r and pusat and bpbd):
        sys.exit("prioritas: masukan hilang; tidak menulis apa pun")
    isi = bangun(r, pusat, bpbd, baca(a.keluar), dt.datetime.now(WIB))
    _kej.simpan(a.keluar, isi)
    print(f"prioritas: {isi['ringkas']}; pembanding {isi['pembanding']}; {os.path.getsize(a.keluar) // 1024} KB", file=sys.stderr)


if __name__ == "__main__":
    main()
