"""Feed Atom peringatan otomatis: nasional + per provinsi -> public/data/feeds/<slug>.xml + feeds/index.json (PKH-17).

Pola dari pantaukarhutla `alerts.py` (MIT), disesuaikan ke data kita. TANPA state: tiap jalan dibangun ulang dari berkas yang ada;
ID entri stabil = jenis + subjek + hari (pembaca feed menampilkan tiap entri sekali).

Jenis (semua teks Indonesia, tanpa kata "aman"):
- baru   : kompleks kebakaran yang berumur <= 48 jam dengan >= 10 titik (gambut) / >= 20 (non-gambut); nasional 20 / 50 (`kluster.json`, `n`).
- meluas : (judul "Banyak lokasi terdeteksi dalam 24 jam", bukan klaim penjalaran) kompleks berumur >= 2 hari dengan >= 50 lokasi 375 m terdeteksi dalam 24 jam (`px24`).
           PERBEDAAN dari pantaukarhutla: kita tak punya pelacak "piksel BARU per hari" per kejadian (id kluster tak stabil antarputaran),
           jadi `px24` = lokasi unik 24 jam, bukan hanya yang baru. Selisihnya belum diukur.
- ekstrem: provinsi dengan >= 25% sel berpeluang FWI >= 14 (Sangat Tinggi, kelas tertinggi model kita) pada hari BESOK (`peluang.json`);
           nasional = satu ringkasan harian.
- udara  : kab/kota dengan prakiraan PM2,5 rata-rata 24 jam besok yang DIBULATKAN >= 56 µg/m³ (Tidak sehat, P.14/2020; kategori dan angka tampil dari bilangan bulat yang sama) (`udara/data/prakiraan.json`, `r24`);
           nasional = satu ringkasan + entri tersendiri untuk Sangat tidak sehat ke atas.
Jendela efektif: "baru" 48 jam, "meluas" 24 jam, "ekstrem"/"udara" besok. Jendela 7 hari pantaukarhutla butuh riwayat (state) dan tidak
dipakai; berkas basi (> 2 hari dari `meta.json.dibuat`, ansambel, prakiraan) dilewati per jenis, bukan ditulis sebagai kabar baru.

Pakai:  python3 scripts/data/feed.py            tulis public/data/feeds/
        python3 scripts/data/feed.py uji        self-check luring (validasi XML dengan xml.etree)
Workflow: langkah `python3 scripts/data/feed.py` sesudah ringkasan/peluang/udara di data.yml dan titik.yml (milik mekanik-mesin).
"""
import datetime as dt, json, os, re, sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI

DASAR = "https://centurisk97.id"
KELUAR = os.path.join(AKAR, "public/data/feeds")
PENAFIAN = "Otomatis dari satelit dan model, bukan peringatan resmi."
NS = "http://www.w3.org/2005/Atom"
WIB = dt.timezone(dt.timedelta(hours=7))
BARU_MIN = {"gambut": 10, "lain": 20}
BARU_NAS = {"gambut": 20, "lain": 50}
BARU_JAM = 48
MELUAS_PX = 50
EKSTREM_BAGIAN = 0.25
UDARA_BATAS = [(250, "Berbahaya"), (150, "Sangat tidak sehat"), (55, "Tidak sehat")]  # P.14/2020 pada bilangan bulat: di atas batas atas = kategori berikut
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
UMUR_MAKS = 2   # hari
MAKS_ENTRI = 200
TAK_SAH = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f]")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-") or "x"


def bersih(s):
    return TAK_SAH.sub("", str(s))


def iso(t):
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def baca(nama):
    jalur = os.path.join(AKAR, nama)
    return json.load(open(jalur)) if os.path.exists(jalur) else None


def tgl_id(d):
    """'2026-11-25' / date / datetime -> '25 Nov 2026'."""
    d = d if isinstance(d, (dt.date, dt.datetime)) else dt.date.fromisoformat(str(d)[:10])
    return f"{d.day} {BULAN[d.month - 1]} {d.year}"


def kategori_udara(v):
    """PM2,5 24 jam -> kategori ISPU dari nilai DIBULATKAN (angka yang tampil); None bila <= 55 (Sedang atau lebih baik)."""
    if v is None:
        return None
    v = round(v)
    for batas, nama in UDARA_BATAS:
        if v > batas:
            return nama
    return None


def umur_hari(waktu, sekarang):
    return (sekarang - dt.datetime.fromisoformat(waktu.replace("Z", "+00:00"))).total_seconds() / 86400


def peringatan_kluster(kluster, sekarang):
    """-> daftar entri 'baru' dan 'meluas'. kluster = FeatureCollection dari kluster.json."""
    hari = sekarang.astimezone(WIB).date().isoformat()
    baru, meluas = {}, {}
    for f in kluster["features"]:
        p = f["properties"]
        pr = p.get("prov")
        if pr not in PROVINSI or not p.get("akhir"):
            continue
        awal = dt.datetime.fromisoformat(p["awal"])
        akhir = dt.datetime.fromisoformat(p["akhir"])
        jenis = "gambut" if p.get("gambut") else "lain"
        lokasi = f"{p.get('kab') or 'wilayah ini'}, {PROVINSI[pr]}"
        sub = f"{pr}-{slug(p.get('kab'))}-{slug(p.get('kec'))}"
        umur = (sekarang - awal).total_seconds() / 3600
        if umur <= BARU_JAM and p["n"] >= BARU_MIN[jenis]:
            tgl = awal.astimezone(WIB).date().isoformat()
            e = {"id": f"baru-{sub}-{tgl}", "jenis": "baru", "prov": pr, "waktu": akhir, "n": p["n"],
                 "nasional": p["n"] >= BARU_NAS[jenis], "lat": p["lat"], "lon": p["lon"],
                 "judul": f"Kebakaran baru{' di lahan gambut' if jenis == 'gambut' else ''}: {lokasi}",
                 "teks": f"{p['n']} titik panas dalam {BARU_JAM} jam pertama sejak {tgl_id(awal.astimezone(WIB))} pukul {awal.astimezone(WIB):%H.%M} WIB di {lokasi}. Ambang belum diuji pada data kita."}
            if e["id"] not in baru or baru[e["id"]]["n"] < e["n"]:
                baru[e["id"]] = e   # dua kompleks sekecamatan sehari: simpan yang lebih besar
        if p["hari"] >= 2 and p["px24"] >= MELUAS_PX and (sekarang - akhir).total_seconds() <= 24 * 3600:
            e = {"id": f"meluas-{sub}-{hari}", "jenis": "meluas", "prov": pr, "waktu": akhir, "n": p["px24"], "nasional": True,
                 "lat": p["lat"], "lon": p["lon"], "judul": f"Banyak lokasi terdeteksi dalam 24 jam: {lokasi}",
                 "teks": f"{p['px24']} lokasi 375 m terdeteksi api (titik panas) dalam 24 jam terakhir di {lokasi}; kompleks sudah berumur {p['hari']} hari. Ambang belum diuji pada data kita."}
            if e["id"] not in meluas or meluas[e["id"]]["n"] < e["n"]:
                meluas[e["id"]] = e
    return list(baru.values()) + list(meluas.values())


def peringatan_ekstrem(pel, sekarang):
    """Provinsi dengan >= 25% sel di FWI >= 14 pada hari besok (WIB) -> entri per provinsi + satu ringkasan nasional."""
    besok = (sekarang.astimezone(WIB).date() + dt.timedelta(days=1)).isoformat()
    out, daftar = [], []
    for kode, w in pel["wilayah"].items():
        if kode not in PROVINSI:
            continue
        h = next((x for x in w["hari"] if x["t"] == besok), None)
        if not h or h["p"][1] is None or h["p"][1] < EKSTREM_BAGIAN:
            continue
        pct = round(h["p"][1] * 100)
        daftar.append((h["p"][1], PROVINSI[kode]))
        out.append({"id": f"ekstrem-{kode}-{besok}", "jenis": "ekstrem", "prov": kode, "nasional": False,
                    "waktu": dt.datetime.fromisoformat(pel["dibuat"]), "judul": f"Risiko api ekstrem besok: {PROVINSI[kode]}",
                    "teks": f"Sekitar {pct}% wilayah {PROVINSI[kode]} masuk kelas api sangat tinggi (FWI 14 atau lebih) pada {tgl_id(besok)}."})
    if daftar:
        top = ", ".join(n for _, n in sorted(daftar, reverse=True)[:5])
        out.append({"id": f"ekstrem-ID-{besok}", "jenis": "ekstrem", "prov": None, "nasional": True,
                    "waktu": dt.datetime.fromisoformat(pel["dibuat"]),
                    "judul": f"Risiko api ekstrem besok di {len(daftar)} provinsi",
                    "teks": f"{len(daftar)} provinsi memiliki sedikitnya {round(EKSTREM_BAGIAN * 100)}% wilayah masuk kelas api sangat tinggi (FWI 14 atau lebih) pada {tgl_id(besok)}; terparah: {top}."})
    return out


def peringatan_udara(prak, sekarang):
    besok = (sekarang.astimezone(WIB).date() + dt.timedelta(days=1)).isoformat()
    if besok not in prak["hari"]:
        return []
    i = prak["hari"].index(besok)
    waktu = dt.datetime.fromisoformat(prak["dibuat"].replace("Z", "+00:00"))
    out, n = [], 0
    for k in prak["kota"]:
        v = k["r24"][i] if i < len(k["r24"]) else None
        kat = kategori_udara(v)
        if kat is None or k["prov"] not in PROVINSI:
            continue
        n += 1
        out.append({"id": f"udara-{k['kode']}-{besok}", "jenis": "udara", "prov": k["prov"], "waktu": waktu,
                    "nasional": kat != "Tidak sehat", "lat": k["lat"], "lon": k["lon"],
                    "judul": f"Udara {kat.lower()} diprakirakan besok: {k['nama']}",
                    "teks": f"Prakiraan PM2,5 rata-rata 24 jam {round(v)} µg/m³ ({kat}) pada {tgl_id(besok)} di {k['nama']}, {PROVINSI[k['prov']]}."})
    if n:
        out.append({"id": f"udara-ID-{besok}", "jenis": "udara", "prov": None, "nasional": True, "waktu": waktu,
                    "judul": f"Udara tidak sehat diprakirakan besok di {n} kabupaten/kota",
                    "teks": f"{n} kabupaten/kota diprakirakan berkategori Tidak sehat atau lebih buruk (PM2,5 24 jam lebih dari 55 µg/m³) pada {tgl_id(besok)}."})
    return out


def kumpulkan(sekarang, kluster, pel, prak):
    """Gabungkan semua jenis; sumber None atau basi dilewati. -> (entri, catatan)."""
    entri, cat = [], []
    meta = baca("public/data/meta.json")
    for nama, f, waktu in (
            ("kluster", lambda: peringatan_kluster(kluster, sekarang), meta and meta.get("dibuat")),
            ("peluang", lambda: peringatan_ekstrem(pel, sekarang), pel and pel.get("ansambel_dibuat")),
            ("udara", lambda: peringatan_udara(prak, sekarang), prak and prak.get("dibuat"))):
        if not waktu:
            cat.append(f"{nama}: sumber tak ada, dilewati")
        elif umur_hari(waktu, sekarang) > UMUR_MAKS:
            cat.append(f"{nama}: sumber berumur {umur_hari(waktu, sekarang):.1f} hari (> {UMUR_MAKS}), dilewati")
        else:
            e = f()
            entri += e
            cat.append(f"{nama}: {len(e)} entri")
    return entri, cat


def atom(judul, ident, entri, diperbarui, tautan):
    """Satu dokumen Atom (str). Semua teks lewat ElementTree, jadi ter-escape."""
    ET.register_namespace("", NS)
    f = ET.Element(f"{{{NS}}}feed")

    def tambah(induk, tag, teks=None, **atr):
        e = ET.SubElement(induk, f"{{{NS}}}{tag}", {k: bersih(v) for k, v in atr.items()})
        if teks is not None:
            e.text = bersih(teks)
        return e
    tambah(f, "title", judul)
    tambah(f, "subtitle", PENAFIAN)
    tambah(f, "id", ident)
    tambah(f, "updated", iso(diperbarui))
    tambah(f, "link", rel="self", href=tautan)
    tambah(f, "link", rel="alternate", href=DASAR + "/")
    tambah(tambah(f, "author"), "name", "Centurisk97")
    for e in entri:
        x = tambah(f, "entry")
        tambah(x, "title", e["judul"])
        tambah(x, "id", f"tag:centurisk97.id,{e['hari']}:{e['id']}")
        tambah(x, "updated", iso(e["waktu"]))
        tambah(x, "link", rel="alternate", href=DASAR + "/")
        tambah(x, "category", term=e["jenis"])
        tambah(x, "summary", f"{e['teks']} {PENAFIAN}", type="text")
    ET.indent(f)
    return '<?xml version="1.0" encoding="utf-8"?>\n' + ET.tostring(f, encoding="unicode") + "\n"


def sah(xml):
    """Validasi: terurai, akar Atom, id entri unik. -> jumlah entri (galat = AssertionError)."""
    r = ET.fromstring(xml.split("?>", 1)[1])
    assert r.tag == f"{{{NS}}}feed", r.tag
    ids = [e.find(f"{{{NS}}}id").text for e in r.findall(f"{{{NS}}}entry")]
    assert len(ids) == len(set(ids)), "id entri ganda"
    for t in ("title", "id", "updated", "author"):
        assert r.find(f"{{{NS}}}{t}") is not None, t
    return len(ids)


def tulis(entri, sekarang, keluar):
    os.makedirs(keluar, exist_ok=True)
    for e in entri:
        e["hari"] = e["id"][-10:]   # semua id berakhir tanggal: tag stabil walau `waktu` (deteksi terakhir) bergeser
    urut = sorted(entri, key=lambda e: e["waktu"], reverse=True)
    daftar = [("nasional", "Karhutla Indonesia: peringatan otomatis", [e for e in urut if e["nasional"]])]
    for kode, nama in sorted(PROVINSI.items(), key=lambda x: x[1]):
        daftar.append((slug(nama), f"Karhutla {nama}: peringatan otomatis", [e for e in urut if e["prov"] == kode]))
    idx = []
    for s, judul, es in daftar:
        es = es[:MAKS_ENTRI]
        upd = max((e["waktu"] for e in es), default=sekarang)
        xml = atom(judul, f"tag:centurisk97.id,2026:feeds/{s}", es, upd, f"{DASAR}/data/feeds/{s}.xml")
        n = sah(xml)
        with open(os.path.join(keluar, f"{s}.xml"), "w", encoding="utf-8") as f:
            f.write(xml)
        idx.append({"slug": s, "judul": judul, "entri": n, "url": f"/data/feeds/{s}.xml"})
    meta = {"dibuat": iso(sekarang), "penafian": PENAFIAN, "feed": idx,
            "ambang": {"baru_titik_48j": BARU_MIN, "baru_nasional": BARU_NAS, "meluas_lokasi_24j": MELUAS_PX,
                       "ekstrem_bagian_wilayah": EKSTREM_BAGIAN, "udara_pm25_24j_dibulatkan_di_atas": 55}}
    json.dump(meta, open(os.path.join(keluar, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    return idx


def main(keluar=KELUAR, sekarang=None):
    sekarang = sekarang or dt.datetime.now(dt.timezone.utc)
    entri, cat = kumpulkan(sekarang, baca("public/data/kluster.json"), baca("public/data/peluang.json"), baca("public/udara/data/prakiraan.json"))
    idx = tulis(entri, sekarang, keluar)
    print("feed:", "; ".join(cat), f"| {len(idx)} berkas, {sum(i['entri'] for i in idx)} entri")


def uji():
    skrg = dt.datetime(2026, 11, 24, 3, 0, tzinfo=dt.timezone.utc)   # 10.00 WIB
    def kl(n, hari, px, gambut, kab="Siak & <Sekitarnya>", jam=10):
        awal = skrg - dt.timedelta(hours=jam if hari < 2 else 24 * hari)
        return {"properties": {"prov": "14", "kab": kab, "kec": "A", "n": n, "hari": hari, "px24": px, "gambut": gambut, "lat": 1, "lon": 100,
                               "awal": awal.isoformat(), "akhir": (skrg - dt.timedelta(hours=1)).isoformat()}}
    fc = {"features": [kl(10, 1, 3, True), kl(19, 1, 3, False), kl(20, 1, 3, False, kab="Pelalawan"), kl(60, 1, 3, False, kab="Kampar"),
                       kl(80, 4, 51, False, kab="Bengkalis"), kl(80, 4, 49, False, kab="Rohil")]}
    e = {x["id"]: x for x in peringatan_kluster(fc, skrg)}
    baru = [x for x in e.values() if x["jenis"] == "baru"]
    assert len(baru) == 3, [x["id"] for x in baru]                      # 10 gambut ya; 19 lain tidak; 20 dan 60 ya
    assert sorted(x["nasional"] for x in baru) == [False, False, True] and any("gambut" in x["judul"] for x in baru)
    ml = [x for x in e.values() if x["jenis"] == "meluas"]
    assert len(ml) == 1 and "Bengkalis" in ml[0]["judul"]                # 51 px ya, 49 tidak
    pel = {"dibuat": "2026-11-24T05:00:00+07:00", "ansambel_dibuat": "2026-11-24T05:00:00+07:00", "wilayah": {
        "ID": {"hari": [{"t": "2026-11-25", "p": [1, 1]}]},
        "14": {"hari": [{"t": "2026-11-25", "p": [0.9, 0.25]}]}, "62": {"hari": [{"t": "2026-11-25", "p": [0.9, 0.2499]}]},
        "16": {"hari": [{"t": "2026-11-25", "p": [0.9, None]}]}}}
    x = peringatan_ekstrem(pel, skrg)
    assert [i["id"] for i in x] == ["ekstrem-14-2026-11-25", "ekstrem-ID-2026-11-25"], x
    pr = {"dibuat": "2026-11-23T18:45Z", "hari": ["2026-11-24", "2026-11-25"], "kota": [
        {"kode": "1471", "nama": "Kota Pekanbaru", "prov": "14", "lat": 0.5, "lon": 101.4, "r24": [10, 60]},
        {"kode": "1472", "nama": "Kota Dumai", "prov": "14", "lat": 1.6, "lon": 101.4, "r24": [10, 200]},
        {"kode": "1473", "nama": "Kab. Aman", "prov": "14", "lat": 1, "lon": 101, "r24": [10, 55.4]}]}
    u = peringatan_udara(pr, skrg)
    assert [i["id"] for i in u] == ["udara-1471-2026-11-25", "udara-1472-2026-11-25", "udara-ID-2026-11-25"]
    assert [i["nasional"] for i in u] == [False, True, True] and "sangat tidak sehat" in u[1]["judul"]
    assert kategori_udara(55.4) is None and kategori_udara(55.6) == "Tidak sehat" and kategori_udara(250.6) == "Berbahaya" and kategori_udara(None) is None
    assert tgl_id("2026-11-25") == "25 Nov 2026" and tgl_id("2026-08-01") == "1 Agu 2026"
    assert any("25 Nov 2026" in i["teks"] for i in u) and not any("2026-11-25" in i["teks"] for i in u + x), "tanggal tampil bukan ISO"
    # tulis: XML sah, ter-escape, id stabil antarpanggilan, nasional vs provinsi, penafian
    import tempfile
    semua = list(e.values()) + x + u
    with tempfile.TemporaryDirectory() as d:
        a = tulis([dict(i) for i in semua], skrg, d)
        txt = open(os.path.join(d, "nasional.xml"), encoding="utf-8").read()
        riau = open(os.path.join(d, "riau.xml"), encoding="utf-8").read()
        assert PENAFIAN in txt and "Siak &amp; &lt;Sekitarnya&gt;" in riau and "<Sekitarnya>" not in riau
        assert "Kampar" in txt and "Pelalawan" not in txt and "Siak" not in txt, "nasional hanya yang lolos ambang nasional"
        n_riau = sah(riau)
        assert n_riau == sum(1 for i in semua if i["prov"] == "14"), n_riau
        ids1 = re.findall(r"<id>(tag:[^<]+)</id>", riau)
        tulis([dict(i) for i in semua], skrg + dt.timedelta(hours=3), d)   # jalan berikutnya: id sama
        assert re.findall(r"<id>(tag:[^<]+)</id>", open(os.path.join(d, "riau.xml"), encoding="utf-8").read()) == ids1
        assert len(a) == 39 and sah(open(os.path.join(d, "aceh.xml"), encoding="utf-8").read()) == 0
        assert json.load(open(os.path.join(d, "index.json")))["feed"][0]["slug"] == "nasional"
    # sumber basi dilewati
    assert umur_hari("2026-11-20T00:00Z", skrg) > UMUR_MAKS
    assert bersih("a\x00b\x0bc") == "abc"
    print("feed.py: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
