"""Sidik pra-registrasi dan penanda buka-sekali (KI-11). Python stdlib saja.

  sidik = sha256(hash tiap berkas kode + hash berkas kriteria + hash masukan)[:16]
  python3 -I scripts/umum/sidik.py uji
  python3 -I scripts/umum/sidik.py cek <nama>.sidik     (kode keluar 3 bila berubah)

Jalur berkas di .sidik relatif terhadap direktori kerja saat `tulis`; jalankan
`cek` dari direktori yang sama (akar repo).
Sidik banjir dan gempa yang sudah ada tidak dipindah ke sini.
"""
import hashlib
import json
import os
import sys
import tempfile
import time


def _hash_berkas(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def kunci(berkas_kode, berkas_kriteria, hash_masukan):
    """16 heksa. Urutan berkas diurutkan menurut jalur, jadi stabil; hash
    masukan dipakai sesuai urutan yang diberikan (urutan itu bagian dari uji)."""
    h = hashlib.sha256()
    for p in sorted(list(berkas_kode) + [berkas_kriteria]):
        h.update(p.encode() + b"\0" + _hash_berkas(p).encode() + b"\n")
    for m in hash_masukan:
        h.update(b"masukan\0" + str(m).encode() + b"\n")
    return h.hexdigest()[:16]


def tulis(path_sidik, berkas_kode, berkas_kriteria, hash_masukan):
    """Tulis <nama>.sidik: {sidik, berkas:{jalur:sha256}, masukan, dibuat}.
    Menolak menimpa sidik yang sudah ada (pra-registrasi tidak diganti diam-diam)."""
    if os.path.exists(path_sidik):
        raise RuntimeError(f"{path_sidik} sudah ada: sidik lama tidak ditimpa; amandemen = berkas sidik baru")
    ber = {p: _hash_berkas(p) for p in sorted(list(berkas_kode) + [berkas_kriteria])}
    d = {"sidik": kunci(berkas_kode, berkas_kriteria, hash_masukan), "berkas": ber,
         "masukan": list(hash_masukan), "dibuat": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    with open(path_sidik, "w") as f:
        json.dump(d, f, indent=1, ensure_ascii=False)
        f.write("\n")
    return d


def cek(path_sidik):
    """Hitung ulang hash tiap berkas tercatat. Berubah/hilang -> SystemExit(3)
    dengan jalur, hash lama, hash baru. Lolos -> kembalikan isi sidik."""
    with open(path_sidik) as f:
        d = json.load(f)
    beda = []
    for p, lama in d["berkas"].items():
        try:
            baru = _hash_berkas(p)
        except OSError as e:
            baru = f"HILANG ({e.__class__.__name__})"
        if baru != lama:
            beda.append(f"{p}: tercatat {lama[:12]}, kini {baru[:12]}")
    jalur = sorted(d["berkas"])
    if not beda and jalur and kunci(jalur[:-1], jalur[-1], d.get("masukan", [])) != d.get("sidik"):
        beda.append(f"sidik tercatat {d.get('sidik')} tidak cocok dengan hash berkas dan masukan tercatat (isi .sidik disunting)")
    if beda:
        print(f"SIDIK BERUBAH {d['sidik']}: {len(beda)} dari {len(d['berkas'])} berkas beda; "
              "pra-registrasi tak berlaku lagi\n  " + "\n  ".join(beda), file=sys.stderr)
        raise SystemExit(3)
    return d


def buka(path_buka, jejak=None, sidik=None, hasil=None):
    """Penanda buka-sekali: O_CREAT|O_EXCL. Panggilan kedua RuntimeError.
    Jejak (.jsonl) hanya ditambah di akhir: {waktu, sidik, hasil}."""
    waktu = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    try:
        fd = os.open(path_buka, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    except FileExistsError:
        raise RuntimeError(f"{path_buka} sudah ada: uji sudah dibuka sekali, tidak boleh diulang") from None
    with os.fdopen(fd, "w") as f:
        f.write(json.dumps({"waktu": waktu, "sidik": sidik}) + "\n")
    if jejak:
        with open(jejak, "a") as f:
            f.write(json.dumps({"waktu": waktu, "sidik": sidik, "hasil": hasil}, ensure_ascii=False) + "\n")


def uji():
    asal = os.getcwd()
    with tempfile.TemporaryDirectory() as t:
      try:
        os.chdir(t)
        for n, s in (("k.py", "a=1\n"), ("l.py", "b=2\n"), ("kr.md", "ambang 0,5\n")):
            open(n, "w").write(s)
        a = kunci(["k.py", "l.py"], "kr.md", ["h1", "h2"])
        assert len(a) == 16 and int(a, 16) >= 0
        assert a == kunci(["l.py", "k.py"], "kr.md", ["h1", "h2"]), "urutan berkas kode tak boleh mengubah sidik"
        assert a != kunci(["k.py", "l.py"], "kr.md", ["h1", "h3"]), "masukan beda harus sidik beda"
        d = tulis("x.sidik", ["k.py", "l.py"], "kr.md", ["h1", "h2"])
        assert d["sidik"] == a and list(d)[0] == "sidik" and set(d["berkas"]) == {"k.py", "l.py", "kr.md"}
        assert cek("x.sidik")["sidik"] == a
        # ubah satu bait kode -> keluar 3
        open("k.py", "w").write("a=2\n")
        try:
            cek("x.sidik")
        except SystemExit as e:
            assert e.code == 3, e.code
        else:
            raise AssertionError("kode berubah tetapi cek lolos")
        open("k.py", "w").write("a=1\n")
        cek("x.sidik")  # dipulihkan -> lolos lagi
        os.remove("kr.md")  # berkas kriteria hilang juga ditolak
        try:
            cek("x.sidik")
        except SystemExit as e:
            assert e.code == 3
        else:
            raise AssertionError("berkas hilang tetapi cek lolos")
        # buka sekali
        buka("b.mulai", "j.jsonl", a, "uji-1")
        try:
            buka("b.mulai", "j.jsonl", a, "uji-2")
        except RuntimeError as e:
            assert "sudah ada" in str(e)
        else:
            raise AssertionError("buka kedua lolos")
        baris = open("j.jsonl").read().splitlines()
        assert len(baris) == 1 and json.loads(baris[0])["hasil"] == "uji-1", baris  # penolakan tak menulis jejak
        buka("b2.mulai", "j.jsonl", a, "uji-3")
        assert len(open("j.jsonl").read().splitlines()) == 2  # append-only
        # isi .sidik disunting (masukan diubah, satu berkas dibuang) -> ditolak; tulis ulang -> ditolak
        open("kr.md", "w").write("ambang 0,5\n")
        for ubah in (lambda d: d.update(masukan=["h9"]), lambda d: d["berkas"].pop("l.py")):
            d = json.load(open("x.sidik")); ubah(d); json.dump(d, open("y.sidik", "w"))
            try:
                cek("y.sidik")
            except SystemExit as e:
                assert e.code == 3
            else:
                raise AssertionError("isi .sidik disunting tetapi cek lolos")
        try:
            tulis("x.sidik", ["k.py"], "kr.md", [])
        except RuntimeError as e:
            assert "sudah ada" in str(e)
        else:
            raise AssertionError("tulis menimpa sidik lama")
      finally:
        os.chdir(asal)
    assert os.getcwd() == asal
    print("sidik uji: OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif len(a) == 2 and a[0] == "cek":
        print(cek(a[1])["sidik"])
    else:
        sys.exit("pakai: sidik.py uji | sidik.py cek <berkas.sidik>")
