"""Unggah riwayat DIBI harian penuh (SK-013) ke siklus/mentah/dibi_harian/<tahun>/<tanggal ditarik>.json dari mesin pemilik.

Tanpa --lokal/--wrangler hanya mencetak hash dan jumlah baris (uji kering); tidak ada yang diunggah. Unggah lewat gudang.sinkron
(hanya tambah, anggaran dijaga, manifest paling akhir). Masukan salah (bukan JSON, tanpa `baris`, tahun tak cocok, kosong) ditolak.
Pakai: python3 -I scripts/siklus/unggah_riwayat.py [SUMBER_DIR] [--lokal DIR | --wrangler BIN [--bucket B]] | uji
"""
import hashlib, importlib.util, json, os, re, shutil, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
SUMBER_BAWAAN = os.path.join(AKAR, "data/raw/bnpb/dibi_harian")
ROLLBACK = os.path.join(AB, "rollback.sql")
DT = os.path.join(AKAR, "data/kajian-bnpb/siklus/DESAIN-TEKNIS.md")
BARIS_HARAP = 57161


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def periksa(sumber):
    """-> daftar (tahun, jalur, ditarik, n_baris, sha256). ValueError bila masukan tidak sah."""
    hasil = []
    for n in sorted(os.listdir(sumber)) if os.path.isdir(sumber) else []:
        m = re.fullmatch(r"(\d{4})\.json", n)
        if not m:
            continue
        j = os.path.join(sumber, n)
        isi = open(j, "rb").read()
        try:
            d = json.loads(isi)
        except ValueError:
            raise ValueError(f"{n}: bukan JSON")
        if not isinstance(d, dict) or not isinstance(d.get("baris"), list) or not d["baris"]:
            raise ValueError(f"{n}: tanpa daftar `baris` atau kosong")
        if d.get("tahun") != int(m.group(1)):
            raise ValueError(f"{n}: tahun di isi {d.get('tahun')!r} tidak cocok dengan nama")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(d.get("ditarik"))):
            raise ValueError(f"{n}: `ditarik` bukan tanggal")
        hasil.append((m.group(1), j, d["ditarik"], len(d["baris"]), hashlib.sha256(isi).hexdigest()))
    if not hasil:
        raise ValueError(f"{sumber}: tidak ada berkas <tahun>.json")
    return hasil


def siapkan(daftar, stage):
    for th, j, ditarik, _, _ in daftar:
        k = os.path.join(stage, "siklus", "mentah", "dibi_harian", th, f"{ditarik}.json")
        os.makedirs(os.path.dirname(k), exist_ok=True)
        shutil.copyfile(j, k)


def tabel_dt():
    return re.findall(r"CREATE TABLE IF NOT EXISTS (sk_[a-z_0-9]+)", open(DT, encoding="utf-8").read())


def periksa_rollback(teks, tabel):
    """-> daftar masalah: tiap tabel DT 3 harus DROP TABLE IF EXISTS, urut terbalik dari pembuatan."""
    m = []
    jatuh = re.findall(r"^DROP TABLE IF EXISTS (sk_[a-z_0-9]+);", teks, re.M)
    for t in tabel:
        if t not in jatuh:
            m.append(f"{t}: tidak ada di rollback.sql")
    if [t for t in jatuh if t in tabel] != list(reversed(tabel)):
        m.append("urutan DROP bukan terbalik dari pembuatan")
    if len(set(jatuh)) != len(jatuh) or set(jatuh) - set(tabel):
        m.append("DROP ganda atau tabel di luar DT 3")
    return m


def _uji():
    tabel = tabel_dt()
    assert len(tabel) == 13 and tabel[0] == "sk_kejadian" and "sk_gladi" in tabel, tabel
    teks = open(ROLLBACK, encoding="utf-8").read()
    assert periksa_rollback(teks, tabel) == []
    assert periksa_rollback(teks.replace("DROP TABLE IF EXISTS sk_gladi;", ""), tabel), "tabel hilang harus ketahuan"
    assert periksa_rollback("\n".join(reversed(teks.splitlines())), tabel), "urutan salah harus ketahuan"
    assert periksa_rollback(teks + "DROP TABLE IF EXISTS sk_lain;\n", tabel)

    with tempfile.TemporaryDirectory() as d:
        s = os.path.join(d, "s")
        os.makedirs(s)

        def tulis(n, o):
            open(os.path.join(s, n), "w").write(o if isinstance(o, str) else json.dumps(o))
        ok = lambda th, n: {"tahun": th, "ditarik": "2026-11-10", "baris": [{"dt": i} for i in range(n)]}
        try:
            periksa(s)
            raise AssertionError("folder kosong harus ditolak")
        except ValueError:
            pass
        tulis("2011.json", ok(2011, 3))
        tulis("2012.json", ok(2012, 2))
        tulis("catatan.txt", "diabaikan")
        r = periksa(s)
        assert [(x[0], x[3]) for x in r] == [("2011", 3), ("2012", 2)] and len(r[0][4]) == 64
        for nama, isi in (("2013.json", "bukan json"), ("2013.json", {"tahun": 2013, "ditarik": "2026-11-10", "baris": []}),
                          ("2013.json", {"tahun": 2012, "ditarik": "2026-11-10", "baris": [{}]}),
                          ("2013.json", {"tahun": 2013, "ditarik": "kemarin", "baris": [{}]}), ("2013.json", [1])):
            tulis(nama, isi)
            try:
                periksa(s)
                raise AssertionError(f"harus ditolak: {isi!r}")
            except ValueError:
                pass
        os.remove(os.path.join(s, "2013.json"))
        G = _muat("gudang")
        stage, gud = os.path.join(d, "stage"), os.path.join(d, "gud")
        siapkan(r, stage)
        maks = {"plafon_byte": 10**6, "lapis": {"mentah": 10**6, "bersih": 1, "saji": 1}, "fitur": {}, "berkas_public_maks": 200}
        hasil = G.sinkron(stage, G.Lokal(gud), maks)
        assert sorted(hasil["diunggah"]) == ["siklus/mentah/dibi_harian/2011/2026-11-10.json", "siklus/mentah/dibi_harian/2012/2026-11-10.json"]
        assert G.sinkron(stage, G.Lokal(gud), maks)["diunggah"] == [], "unggah ulang tidak mengubah apa pun"
    print("unggah_riwayat: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    else:
        sumber = a[0] if a and not a[0].startswith("--") else SUMBER_BAWAAN
        r = periksa(sumber)
        n = sum(x[3] for x in r)
        for th, _, ditarik, c, h in r:
            print(f"{th} ditarik {ditarik} baris {c} sha256 {h}")
        print(f"jumlah baris {n}" + ("" if n == BARIS_HARAP else f" (harapan {BARIS_HARAP}: periksa)"))
        if "--lokal" in a or "--wrangler" in a:
            G = _muat("gudang")
            be = G.Lokal(a[a.index("--lokal") + 1]) if "--lokal" in a else G.Wrangler(a[a.index("--wrangler") + 1], a[a.index("--bucket") + 1] if "--bucket" in a else G.BUCKET)
            with tempfile.TemporaryDirectory() as stage:
                siapkan(r, stage)
                out = G.sinkron(stage, be)
            print(json.dumps({"diunggah": len(out["diunggah"]), "ditolak": out["ditolak"]}, ensure_ascii=False))
            sys.exit(1 if out["ditolak"] else 0)
        else:
            print("uji kering: tidak ada yang diunggah (tambah --lokal DIR atau --wrangler BIN)")
