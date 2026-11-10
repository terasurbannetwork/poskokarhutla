"""Lapis saji Siklus: bangun manifest.json, laporan_bersih.json, registri.json, anggaran.json (selubung bersama), tolak berkas
melewati batas DT 5.2 dan kunci total/jumlah_gabungan/rata (angka antarsumber tidak dijumlah). --public: atribusi.json dan
masa_depan_ringkas.json untuk public/siklus/data.

Laporan bersih dirakit dari siklus/bersih/<jenis>/laporan.json bila ada: {masuk, tersisa, dibuang_total, ...}; masuk = tersisa + dibuang_total.
Pakai: python3 -I scripts/siklus/saji.py bangun SRC [--public [DIR]] | uji
"""
import importlib.util, json, os, re, statistics, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KB, MB = 1000, 1000 * 1000
BATAS = [(re.compile(p), b) for p, b in (
    (r"^siklus/saji/kejadian/arsip/", 4 * MB), (r"^siklus/saji/paparan/rinci/", 1 * MB), (r"^siklus/saji/paparan/kab/", 1 * MB),
    (r"^siklus/saji/paparan/[^/]+\.json$", 6 * MB), (r"^siklus/saji/fasilitas/", 500 * KB), (r"^siklus/saji/kaji/", 100 * KB),
    (r"^siklus/saji/masa_depan/", 2 * MB))]
TERLARANG = {"total", "jumlah_gabungan", "rata"}


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


G, R = _muat("gudang"), _muat("registri")


def kunci_terlarang(x, jalur=""):
    if isinstance(x, dict):
        for k, v in x.items():
            if k in TERLARANG:
                yield f"{jalur}/{k}"
            yield from kunci_terlarang(v, f"{jalur}/{k}")
    elif isinstance(x, list):
        for i, v in enumerate(x):
            yield from kunci_terlarang(v, f"{jalur}[{i}]")


def periksa_berkas(kunci, isi):
    """-> daftar masalah untuk satu berkas saji (kunci siklus/saji/..., isi bytes)."""
    m = []
    for pola, batas in BATAS:
        if pola.match(kunci):
            if len(isi) > batas:
                m.append(f"{kunci}: {len(isi)} B melewati batas {batas} B")
            break
    if kunci.endswith(".json"):
        try:
            m += [f"{kunci}: kunci terlarang {j}" for j in kunci_terlarang(json.loads(isi))]
        except ValueError:
            m.append(f"{kunci}: bukan JSON sah")
    return m


def _semua(src):
    for dasar, _, nama in sorted(os.walk(os.path.join(src, "siklus"))):
        for n in sorted(nama):
            j = os.path.join(dasar, n)
            yield os.path.relpath(j, src).replace(os.sep, "/"), j


def laporan_bersih(src):
    bag, m = {}, []
    for k, j in _semua(src):
        p = k.split("/")
        if len(p) == 4 and p[1] == "bersih" and p[3] == "laporan.json":
            l = json.load(open(j, encoding="utf-8"))
            if l.get("masuk") != l.get("tersisa", 0) + l.get("dibuang_total", 0):
                m.append(f"{k}: masuk bukan tersisa + dibuang_total")
            bag[p[2]] = l
    return {"sumber": bag}, m


def registri_json(entri, d):
    baris = []
    for x in d["sumber"]:
        ada = [e for k, e in entri.items() if k.startswith(f"siklus/mentah/{x['id']}/")]
        tgl = sorted(re.search(r"(\d{4}-\d{2}-\d{2})", e["kunci"]).group(1) for e in ada if re.search(r"\d{4}-\d{2}-\d{2}", e["kunci"]))
        baris.append({"id": x["id"], "status_uji": x["status"], "diambil": tgl[-1] if tgl else None,
                      "byte": sum(e["byte"] for e in ada) if ada else None, "lisensi": x["lisensi"]})
    return {"sumber": baris}


def bangun(src, maks=None, d=None, public=None):
    """Tulis empat berkas pengelola ke src/siklus/saji dan kembalikan daftar masalah (kosong = sah). Tidak menulis bila ada masalah."""
    maks = maks or G.anggaran_sumber()
    d = d or R.muat()
    masalah, entri = [], {}
    for k, j in _semua(src):
        if k in G.PENGELOLA or k.startswith("siklus/saji/_dummy/") or k in ("siklus/saji/registri.json", "siklus/saji/laporan_bersih.json"):
            continue
        isi = open(j, "rb").read()
        if k.startswith("siklus/saji/"):
            m1 = periksa_berkas(k, isi)
            masalah += m1
            if m1:
                continue
        entri[k] = {"kunci": k, "byte": len(isi), "sha256": G.sidik(j)}
    lap, m2 = laporan_bersih(src)
    masalah += m2
    if masalah:
        return masalah
    tulis = {"laporan_bersih": G.selubung("laporan_bersih", lap), "registri": G.selubung("registri", registri_json(entri, d))}
    for nama, isi in tulis.items():
        k = f"siklus/saji/{nama}.json"
        j = os.path.join(src, *k.split("/"))
        json.dump(isi, open(j, "w", encoding="utf-8"), ensure_ascii=False, sort_keys=True)
        entri[k] = {"kunci": k, "byte": os.path.getsize(j), "sha256": G.sidik(j)}
    man = G.bangun_manifest(entri, maks)
    for k, isi in ((G.MANIFEST, man), (G.ANGGARAN, G.bangun_anggaran(man, maks, public))):
        json.dump(isi, open(os.path.join(src, *k.split("/")), "w", encoding="utf-8"), ensure_ascii=False, sort_keys=True)
    return []


def atribusi(d):
    return {"v": 1, "sumber": [{"id": x["id"], "nama": x["nama"], "lisensi": x["lisensi"], "url_lisensi": x.get("url_lisensi", "menunggu"),
                                "atribusi": x["atribusi"], "dipakai_di": x["fitur"]} for x in R.diambil(d)]}


def masa_depan_ringkas(src):
    """Selisih median antar kabupaten terhadap dasar, per provinsi, horizon, skenario, indeks; semua hipotesis."""
    prov = {}
    for k, j in _semua(src):
        p = k.split("/")
        if len(p) == 4 and p[2] == "masa_depan" and not p[3].startswith("tumbuh_"):
            b = json.load(open(j, encoding="utf-8"))
            h = {}
            for kab in b["kab"].values():
                for hor, sk in kab.items():
                    for s, idx in sk.items():
                        for i, v in idx.items():
                            if v.get("selisih_dasar") is not None:
                                h.setdefault(hor, {}).setdefault(s, {}).setdefault(i, []).append(v["selisih_dasar"])
            prov[b["prov"]] = {hor: {s: {i: statistics.median(v) for i, v in idx.items()} for s, idx in sk.items()} for hor, sk in h.items()}
    return {"v": 1, "yakin": "hipotesis", "prov": prov or None, "status": None if prov else "menunggu"}


def tulis_public(src, d, tujuan):
    os.makedirs(tujuan, exist_ok=True)
    for nama, isi in (("atribusi.json", atribusi(d)), ("masa_depan_ringkas.json", masa_depan_ringkas(src))):
        json.dump(isi, open(os.path.join(tujuan, nama), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def _uji():
    def tulis(root, k, isi):
        j = os.path.join(root, *k.split("/"))
        os.makedirs(os.path.dirname(j), exist_ok=True)
        open(j, "w", encoding="utf-8").write(isi if isinstance(isi, str) else json.dumps(isi))
        return j

    maks = {"plafon_byte": 10 * MB, "lapis": {"mentah": 3 * MB, "bersih": 3 * MB, "saji": 3 * MB}, "fitur": {"F1": "menunggu"}, "berkas_public_maks": 200}
    d = R.muat()
    with tempfile.TemporaryDirectory() as t:
        tulis(t, "siklus/saji/kaji/KJ-2026-9A2WGN3G.json", {"v": 1, "jenis": "kaji", "korban": {"rentang": [1, 9]}})
        tulis(t, "siklus/mentah/gdacs/2026/2026-11-09.json", {"a": 1})
        tulis(t, "siklus/bersih/dibi/laporan.json", {"masuk": 10, "tersisa": 7, "dibuang_total": 3})
        tulis(t, "siklus/saji/_dummy/paparan/33.json", {"total": 1})
        assert bangun(t, maks, d, public=5) == []
        m = json.load(open(os.path.join(t, "siklus/saji/manifest.json")))
        assert m["jenis"] == "manifest" and m["v"] == 1 and m["yakin"] == "terverifikasi" and m["sumber"] and m["dibuat"]
        ks = [x["kunci"] for x in m["berkas"]]
        assert "siklus/saji/registri.json" in ks and not any("_dummy" in k or "manifest" in k for k in ks)
        assert m["total_byte"] == sum(x["byte"] for x in m["berkas"]) and m["maks_byte"] == 10 * MB
        reg = {x["id"]: x for x in json.load(open(os.path.join(t, "siklus/saji/registri.json")))["sumber"]}
        assert reg["gdacs"]["diambil"] == "2026-11-09" and reg["petabencana"]["diambil"] is None and reg["petabencana"]["byte"] is None
        lb = json.load(open(os.path.join(t, "siklus/saji/laporan_bersih.json")))
        assert lb["sumber"]["dibi"]["masuk"] == 10
        an = json.load(open(os.path.join(t, "siklus/saji/anggaran.json")))
        assert an["berkas_public"] == {"n": 5, "maks": 200} and an["jenis"] == "anggaran"

    def salah(k, isi, kata, bersih=None):
        with tempfile.TemporaryDirectory() as t:
            tulis(t, k, isi)
            if bersih:
                tulis(t, "siklus/bersih/dibi/laporan.json", bersih)
            m = bangun(t, maks, d)
            assert m and kata in " ".join(m), (kata, m)
            assert not os.path.exists(os.path.join(t, "siklus/saji/manifest.json")), "ada masalah: manifest tidak ditulis"

    salah("siklus/saji/kaji/KJ-x.json", "x" * 100_001, "melewati batas")
    salah("siklus/saji/paparan/rinci/3201.json", "x" * 1_000_001, "melewati batas")
    salah("siklus/saji/fasilitas/3201.json", "x" * 500_001, "melewati batas")
    salah("siklus/saji/paparan/33.json", "x" * 6_000_001, "melewati batas")
    salah("siklus/saji/kejadian/arsip/2019/33.json", "x" * 4_000_001, "melewati batas")
    salah("siklus/saji/masa_depan/33.json", "x" * 2_000_001, "melewati batas")
    salah("siklus/saji/x.json", {"kab": {"a": {"total": 5}}}, "kunci terlarang /kab/a/total")
    salah("siklus/saji/x.json", {"kab": [{"jumlah_gabungan": 5}]}, "jumlah_gabungan")
    salah("siklus/saji/x.json", {"rata": 5}, "kunci terlarang /rata")
    salah("siklus/saji/x.json", "{rusak", "bukan JSON sah")
    salah("siklus/saji/x.json", {}, "masuk bukan", bersih={"masuk": 10, "tersisa": 5, "dibuang_total": 3})
    assert not list(kunci_terlarang({"dua_sumber": {"dibi": 1, "logbook": 2, "selisih": 1}}))

    with tempfile.TemporaryDirectory() as t:
        tulis(t, "siklus/saji/masa_depan/33.json", {"v": 1, "prov": "33", "kab": {
            "3301": {"2050": {"ssp245": {"rx1day": {"selisih_dasar": 4.0}}}},
            "3302": {"2050": {"ssp245": {"rx1day": {"selisih_dasar": 10.0}}}},
            "3303": {"2050": {"ssp245": {"rx1day": {"selisih_dasar": None}}}}}})
        r = masa_depan_ringkas(t)
        assert r["yakin"] == "hipotesis" and r["prov"]["33"]["2050"]["ssp245"]["rx1day"] == 7.0
        assert masa_depan_ringkas(tempfile.gettempdir() + "/_tak_ada_siklus")["status"] == "menunggu"
        tulis_public(t, d, os.path.join(t, "pub"))
        a = json.load(open(os.path.join(t, "pub/atribusi.json")))
        assert len(a["sumber"]) == 38 and all(x["dipakai_di"] for x in a["sumber"])
    print("saji: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["bangun"] and len(a) > 1:
        m = bangun(a[1], public=G.n_public())
        if "--public" in a:
            i = a.index("--public") + 1
            tulis_public(a[1], R.muat(), a[i] if i < len(a) else os.path.join(AKAR, "public/siklus/data"))
        print("\n".join(m) or "saji: manifest, laporan_bersih, registri, anggaran ditulis")
        sys.exit(1 if m else 0)
    else:
        sys.exit("pakai: saji.py bangun SRC [--public [DIR]] | uji")
