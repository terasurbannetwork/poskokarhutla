"""TS-14: penjaga kriteria uji balik genangan tsunami (stdlib saja).

Kriteria dibekukan di data/kajian-bnpb/tsunami-genangan/kriteria_ujibalik.json + .sidik SEBELUM hitungan kejadian uji.
Hitungan uji (TS-15) memanggil muat_kriteria() dulu; berkas kriteria hilang atau sidik berubah -> SystemExit(3).
Sidik mengunci: kriteria, tsunami_sumber.py (Okada), tsunami_hitung.py (mesin), hash berkas run-up NCEI.
Kode hitungan uji (TS-15) di berkas ini sengaja TIDAK ikut disidik; kriterianya yang beku.

Pakai (dari akar repo, `python3 -I`):  uji | kunci (tulis .sidik, sekali) | cek
"""
import hashlib, importlib.util, json, os, sys, tempfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
_sp = importlib.util.spec_from_file_location("umum_sidik", os.path.join(AKAR, "scripts", "umum", "sidik.py"))
SD = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(SD)

KRITERIA = "data/kajian-bnpb/tsunami-genangan/kriteria_ujibalik.json"  # relatif akar repo: jalur di .sidik sama di mesin mana pun
SIDIK = KRITERIA.replace(".json", ".sidik")
KODE = ["scripts/gempa/tsunami_sumber.py", "scripts/gempa/tsunami_hitung.py", "public/gempa/tsunami.js"]  # tsunami.js = pembanding Abe (hi = 2 Hr)
RUNUP = "public/gempa/data/tsunami_runup.json"
os.chdir(AKAR)  # jalur relatif di atas dan di .sidik dihitung dari akar repo


def _sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def kunci(kriteria=KRITERIA, sidik=SIDIK, kode=KODE, runup=RUNUP):
    """Tulis .sidik sekali (menolak menimpa). Dipanggil manusia, bukan hitungan uji."""
    return SD.tulis(sidik, kode, kriteria, [_sha(runup)])


def muat_kriteria(kriteria=KRITERIA, sidik=SIDIK, runup=RUNUP):
    """Kembalikan isi kriteria beku; tolak jalan bila berkas/sidik hilang atau berubah (kode keluar 3)."""
    for p in (kriteria, sidik):
        if not os.path.exists(p):
            print(f"KRITERIA UJI BALIK TIDAK ADA: {p}; hitungan uji menolak jalan", file=sys.stderr)
            raise SystemExit(3)
    d = SD.cek(sidik)  # berkas kode/kriteria berubah atau .sidik disunting -> keluar 3
    if d["masukan"] != [_sha(runup)]:
        print("SIDIK BERUBAH: berkas run-up NCEI beda dari yang dibekukan; hitungan uji menolak jalan", file=sys.stderr)
        raise SystemExit(3)
    return json.load(open(kriteria)), d["sidik"]


def uji():
    with tempfile.TemporaryDirectory() as t:
        k, s, c, r = (os.path.join(t, n) for n in ("k.json", "k.sidik", "c.py", "r.json"))
        for p, isi in ((k, '{"a":1}\n'), (c, "x=1\n"), (r, "[1]\n")):
            open(p, "w").write(isi)

        def tolak(**kw):
            try:
                muat_kriteria(k, s, r)
            except SystemExit as e:
                assert e.code == 3
            else:
                raise AssertionError("harus ditolak: " + str(kw))
        tolak(sebab="sidik belum ada")
        d = SD.tulis(s, [c], k, [_sha(r)])
        assert muat_kriteria(k, s, r) == ({"a": 1}, d["sidik"])
        open(k, "w").write('{"a":2}\n'); tolak(sebab="kriteria diubah")
        open(k, "w").write('{"a":1}\n'); muat_kriteria(k, s, r)
        open(c, "w").write("x=2\n"); tolak(sebab="kode mesin diubah")
        open(c, "w").write("x=1\n"); open(r, "w").write("[2]\n"); tolak(sebab="data run-up diubah")
        open(r, "w").write("[1]\n"); os.remove(k); tolak(sebab="kriteria hilang")
    # kriteria nyata: bila sudah disidik harus utuh; belum disidik = belum boleh dihitung
    assert os.path.exists(KRITERIA), "kriteria_ujibalik.json belum ada"
    c = json.load(open(KRITERIA))
    assert c["aturan_terbit"]["pilihan"] in ("a", "b") and c["n_min"]["n_min_kejadian"] == 8
    assert set(c["pembagian"]["pengembangan"]) | set(c["pembagian"]["uji_kelas_A"]) | set(c["pembagian"]["uji_kelas_B"]) == {e["kunci"] for e in c["kelas"]["kejadian"]}
    if os.path.exists(SIDIK):
        muat_kriteria()
    print("uji ok")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if a == "kunci":
        print(kunci()["sidik"])
    elif a == "cek":
        print(muat_kriteria()[1])
    else:
        uji()
